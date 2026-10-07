// THÔNG BÁO ĐẨY — đăng ký máy, khoá công khai, gửi thử (Đ137).
//
// Việc gửi thật nằm ở lib/day.js và được gọi từ lib/thong-bao-be.js mỗi khi
// có thông báo riêng cho một bé. Ở đây chỉ là phần trình duyệt nói chuyện với
// máy chủ: "đây là địa chỉ đẩy của máy tôi", "xoá địa chỉ này đi", "gửi thử
// một cái xem máy có nhận không".
const day = require('../lib/day');
const db = require('../lib/db');
const baoNT = require('../lib/bao-nha-truong');
const { requireRole } = require('../lib/auth');

// LOẠI TIN ĐẨY MÀ TÀI KHOẢN NÀY THẬT SỰ SẼ NHẬN (Đ157).
//
// MỘT CHỖ QUYẾT, MÀN HÌNH NGHE THEO.
//
// Trước đợt này màn Cài đặt tự kể tên chức vụ ra ở phía trình duyệt để quyết
// ẩn hay hiện thẻ "Thông báo trên điện thoại" — tức là hai chỗ cùng nói một
// chuyện, và hai chỗ thì sẽ trôi khỏi nhau. Đ145 đã phải gỡ một lời hứa suông
// sinh ra đúng theo kiểu ấy: thẻ mời cô bật, mà không đường nào gửi tin cho cô.
//
// Nay chỉ máy chủ trả lời, và nó trả lời bằng cách LIỆT KÊ những gì sẽ tới —
// danh sách rỗng thì thẻ biến mất. Thêm một loại tin cho ai đó mà quên sửa
// đây thì thẻ vẫn im, chứ không hứa nhầm; quên theo hướng đóng lại.
function loaiTinCua(user) {
  if (!user) return [];
  if (user.role === 'parent') {
    return [
      'ảnh con tới lớp',
      'nhật ký ngày của con',
      'cân đo, sức khoẻ',
      'album mới có ảnh con',
      'tin nhắn từ cô và văn phòng',
      'báo cáo học tập của con',
    ];
  }
  // CÔ: chưa có loại tin nào — `lib/day.js` chỉ đẩy tới bố mẹ của một bé
  // (guiChoGiaDinhCuaBe) và tới quản lý (lib/bao-nha-truong.js). Ngày ai đó
  // thêm đường đẩy cho cô thì thêm dòng vào đây, và thẻ tự hiện lại.
  if (user.role !== 'admin') return [];
  const cv = db.chucVu(user);
  if (cv !== null && !baoNT.CHUC_VU_NHAN.includes(cv)) return [];
  return [
    'báo cáo học tập cô gửi chờ duyệt',
    'đề xuất sửa kế hoạch cô gửi chờ duyệt',
  ];
}

// AI ĐƯỢC XEM VÀ DỌN ĐƯỜNG ĐẨY CỦA CẢ TRƯỜNG.
//
// HẸP HƠN "đặt nếp làm việc" của Đ156, và cố ý: mốc giờ rà soát là việc hằng
// ngày của văn phòng, còn khoá VAPID là một BÍ MẬT CHUNG của cả trường — đổi
// nó là bắt mấy trăm gia đình bật lại thông báo. Chú thích chức vụ Văn phòng
// cơ sở ở `lib/db.js` nói thẳng "KHÔNG đụng tài khoản"; khoá đẩy nằm cùng
// nhóm ấy, không nằm cùng nhóm với sổ điểm danh.
//
// Ba nhóm đi qua được — quản trị chưa khai chức vụ, ban giám hiệu, quản lý cơ
// sở — và cả ba đều có `api: null`, nên tầng chức vụ không chặn họ ở đường
// `/api/push/...`. Danh sách này TRÙNG với `baoNT.CHUC_VU_NHAN`, tức trùng
// với đúng nhóm thật sự nhận được tin đẩy.
function chiNguoiGiuKhoa(req, res) {
  const cv = db.chucVu(req.user);
  if (req.user.role !== 'admin' || (cv !== null && !baoNT.CHUC_VU_NHAN.includes(cv))) {
    res.status(403).json({
      error: 'Phần thông báo đẩy của cả trường do ban giám hiệu hoặc quản lý cơ sở giữ.',
    });
    return true;
  }
  return false;
}

module.exports = (app) => {
  app.get('/api/push/trang-thai', (req, res) => {
    const loaiTin = loaiTinCua(req.user);
    res.json({
      coGoiDay: day.coGoiDay(),
      soMay: day.soMayCua(req.user.id),
      // `batDuoc` là câu trả lời DUY NHẤT mà màn Cài đặt cần: có loại tin nào
      // thật sự sẽ tới máy này không. Rỗng thì thẻ không hiện.
      batDuoc: loaiTin.length > 0,
      loaiTin,
    });
  });

  app.get('/api/push/khoa-cong-khai', (req, res) => {
    const khoa = day.khoaCongKhai();
    if (!khoa) {
      return res.status(503).json({ error: 'Máy chủ chưa có phần gửi thông báo đẩy — nhờ nhà trường kiểm tra cài đặt.' });
    }
    res.json({ khoa });
  });

  app.post('/api/push/dang-ky', (req, res) => {
    const r = day.dangKy(req.user.id, (req.body || {}).subscription);
    if (!r.ok) return res.status(400).json({ error: r.loi });
    res.json({ ok: true, soMay: day.soMayCua(req.user.id) });
  });

  app.delete('/api/push/dang-ky', (req, res) => {
    const r = day.huyDangKy(req.user.id, (req.body || {}).endpoint || req.query.endpoint);
    if (!r.ok) return res.status(400).json({ error: r.loi });
    res.json({ ok: true, soMay: day.soMayCua(req.user.id) });
  });

  // ------------------------------------------------------------------------
  // QUẢN TRỊ ĐƯỜNG ĐẨY (Đ157)
  // ------------------------------------------------------------------------

  // Các máy đã đăng ký — ai bật, từ bao giờ, dịch vụ nào, lần gửi cuối có lỗi
  // gì. Trước đợt này bảng `push_dang_ky` không có màn nào để xem hay dọn; nó
  // chỉ tự xoá khi dịch vụ đẩy trả 404/410.
  app.get('/api/push/quan-tri', requireRole('admin'), (req, res) => {
    if (chiNguoiGiuKhoa(req, res)) return;
    res.json({
      coGoiDay: day.coGoiDay(),
      danhSach: day.danhSachDangKy({ soLuong: 200 }),
    });
  });

  // ĐỔI KHOÁ VAPID — việc hiếm, và tốn.
  //
  // Bắt gõ lại đúng chữ "DOI KHOA" chứ không chỉ một nút bấm: đổi khoá là MỌI
  // máy đang bật thông báo phải tự bật lại, kể cả điện thoại của mấy trăm gia
  // đình. Một cú bấm nhầm ở đây thì cả trường im lặng cho tới khi từng nhà mở
  // Cài đặt ra bật lại — mà chẳng ai báo cho họ biết là phải làm thế.
  app.post('/api/push/doi-khoa', requireRole('admin'), (req, res) => {
    if (chiNguoiGiuKhoa(req, res)) return;
    if (String((req.body || {}).xacNhan || '').trim() !== 'DOI KHOA') {
      return res.status(400).json({
        error: 'Đổi khoá là mọi máy đang bật thông báo phải bật lại từ đầu, kể cả '
          + 'điện thoại của gia đình. Gõ đúng chữ DOI KHOA để xác nhận.',
      });
    }
    const r = day.doiKhoa();
    if (!r.ok) return res.status(503).json({ error: r.loi });
    db.audit(req.user.id, 'push-doi-khoa', null, { soMayPhaiDangKyLai: r.soMayPhaiDangKyLai });
    res.json({ ok: true, soMayPhaiDangKyLai: r.soMayPhaiDangKyLai });
  });

  // Gỡ mọi máy của một người — nghỉ việc, hoặc mất điện thoại.
  app.post('/api/push/quan-tri/go', requireRole('admin'), (req, res) => {
    if (chiNguoiGiuKhoa(req, res)) return;
    const userId = String((req.body || {}).userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'Thiếu mã tài khoản' });
    const u = db.findUser(userId);
    if (!u) return res.status(404).json({ error: 'Không tìm thấy tài khoản này' });
    const r = day.xoaDangKyCua(userId);
    if (!r.ok) return res.status(400).json({ error: r.loi });
    db.audit(req.user.id, 'push-go-may', userId, { daXoa: r.daXoa });
    res.json({ ok: true, daXoa: r.daXoa });
  });

  // Gửi thử tới chính máy của người bấm — để biết đường đẩy có thông không.
  app.post('/api/push/thu', async (req, res) => {
    if (!day.coGoiDay()) {
      return res.status(503).json({ error: 'Máy chủ chưa có phần gửi thông báo đẩy' });
    }
    const r = await day.guiChoNguoi(req.user.id, {
      tieuDe: 'CASA Mầm non',
      noiDung: 'Thông báo thử — máy này đã nhận được. Từ giờ có tin về con là máy sẽ báo.',
      hash: '#/settings',
    });
    res.json({ ok: true, ...r });
  });
};
