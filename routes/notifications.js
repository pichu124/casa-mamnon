// Phân hệ Thông báo: giáo viên gửi thông báo cho lớp mình hoặc toàn trường,
// người dùng xem và đánh dấu đã đọc.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

const BANG = 'notifications';

// Đổi 'Lớp học' → 'Nhóm lớp' ở G0.5/N9. Đây là GIÁ TRỊ lưu trong cột
// `notifications.category`, nên phải đổi đồng thời với data/seed.js và bảng
// màu trong public/js/views/notifications.js — lệch một chỗ là thông báo cũ
// mất màu, mất biểu tượng mà không báo lỗi gì.
const CATEGORIES = ['Nhóm lớp', 'Nhà trường', 'Y tế', 'Học phí', 'Khác'];

// Điều kiện SQL lọc theo phạm vi gửi mà người dùng được thấy.
// Luật "ai thấy thông báo nào" nằm ở MỘT chỗ — lib/thong-bao.js — thay cho hai
// bản chép tay từng trôi lệch giữa tệp này và routes/dashboard.js.
const tb = require('../lib/thong-bao');
const tbb = require('../lib/thong-bao-be');
const audienceFilter = (user) => tb.audienceFilter(user);
const canSee = tb.canSee;

// Mỗi lượt trả về bao nhiêu thông báo, và trần cho lượt hỏi tự đặt số.
const MOI_TRANG = 100;
const TRANG_TOI_DA = 300;

// Trần độ dài. Không có trần thì một lần dán nhầm cả một văn bản dài vào ô
// nội dung là MỌI máy trong trường tải khối chữ đó về mãi — thông báo không
// ai dọn, và danh sách thì tải cả trang một lượt.
const TOI_DA_TIEU_DE = 200;
const TOI_DA_NOI_DUNG = 5000;

function loiQuaDai(title, body) {
  if (title !== undefined && String(title).trim().length > TOI_DA_TIEU_DE) {
    return `Tiêu đề dài quá ${TOI_DA_TIEU_DE} ký tự — rút gọn giúp trường nhé`;
  }
  if (body !== undefined && String(body).trim().length > TOI_DA_NOI_DUNG) {
    return `Nội dung dài quá ${TOI_DA_NOI_DUNG} ký tự — nội dung dài nên gửi kèm trong buổi họp hoặc chia làm nhiều thông báo`;
  }
  return null;
}

module.exports = (app) => {
  // Danh sách thông báo: ghim trước, rồi mới nhất trước; kèm trạng thái đã đọc
  // và tên người gửi. Trạng thái đã đọc lấy bằng một phép nối, không phải tra
  // từng thông báo một.
  app.get('/api/notifications', (req, res) => {
    const f = audienceFilter(req.user);

    // CẮT CỬA SỔ NGAY TRONG CÂU TRUY VẤN.
    //
    // Thông báo chỉ thêm vào chứ không ai dọn, nên bảng này dài ra mãi: sau
    // vài năm học, mở màn Thông báo là kéo cả lịch sử của trường về điện
    // thoại, chỉ để xem mấy dòng trên cùng. Ở đây không có bộ lọc nào chạy sau
    // câu truy vấn — `audienceFilter` đã lo phần "ai được thấy gì" ngay trong
    // `WHERE` — nên cắt thẳng bằng LIMIT là con số trả về đúng bằng con số
    // người này xem được, và màn hình suy ra "còn nữa hay hết" bằng cách đếm.
    //
    // Thông báo ghim vẫn đứng đầu nhờ `ORDER BY n.pinned DESC`, nên trang đầu
    // luôn có chúng — cắt cửa sổ không làm rơi mất thứ nhà trường muốn nổi lên.
    //
    // Hình dạng câu trả lời KHÔNG đổi (vẫn là một mảng): điện thoại đang giữ
    // bản app cũ vẫn chạy y như trước, chỉ là danh sách dừng ở trang đầu.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || MOI_TRANG)));

    const list = db.all('notifications',
      `SELECT n.*, (r.userId IS NOT NULL) AS read
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notificationId = n.id AND r.userId = ?
       WHERE ${f.sql} AND ${st.dieuKienConHien(BANG, 'n.id')}
       ORDER BY n.pinned DESC, n.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, ...f.params, soLuong, bo]);

    // TÊN NGƯỜI GỬI: TRA MỘT LƯỢT CHO CẢ DANH SÁCH.
    //
    // Bản trước gọi `db.findUser` trong `.map`, tức MỘT câu truy vấn cho MỖI
    // dòng thông báo — đo được 406 câu cho 405 dòng, chỉ để lấy vài cái tên mà
    // phần lớn là trùng nhau (cả trường thường chỉ vài người đăng thông báo).
    // Việc này không đụng tệp dùng chung: `db.all` đã có sẵn.
    const maNguoi = [...new Set(list.map(n => n.createdBy).filter(Boolean))];
    const nguoi = new Map();
    if (maNguoi.length) {
      const marks = maNguoi.map(() => '?').join(',');
      for (const u of db.all('users', `SELECT * FROM users WHERE id IN (${marks})`, maNguoi)) {
        nguoi.set(u.id, u);
      }
    }

    // Đ124: mỗi dòng nói rõ gửi cho ai — "Toàn trường" hay "Nhóm X · Cơ sở Y".
    const moTaPhamVi = tb.taoMoTaPhamVi();
    const cuaTruong = st.ganDauDaSua(BANG, list.map(n => {
      const author = n.createdBy ? nguoi.get(n.createdBy) : null;
      const pv = moTaPhamVi(n.audience);
      return {
        ...n,
        read: !!n.read,
        authorName: author ? `${author.title} ${author.name}` : '',
        coTheSua: st.laChuBanGhi(req.user, n.createdBy),
        toanTruong: pv.toanTruong,
        tenNhom: pv.tenNhom,
        tenCoSo: pv.tenCoSo,
      };
    }));

    res.json(cuaTruong);
  });

  // THÔNG BÁO RIÊNG VỀ CON (Đ137) — một đường RIÊNG, không gộp vào danh sách
  // trên. Danh sách trên có khế ước `bo`/`soLuong` (xin một dòng nhận đúng một
  // dòng, ghép từng trang ra đúng danh sách) mà app cũ và bài canh đang dựa
  // vào; nhét thêm nguồn thứ hai vào là hai con đếm giẫm lên nhau. Màn Thông
  // báo tự ghép hai nguồn ở trang đầu. Cô, văn phòng: mảng rỗng.
  app.get('/api/notifications/rieng-be', (req, res) => {
    res.json(tbb.danhSachCua(req.user, { soLuong: 50, bo: 0 }));
  });

  // Đánh dấu đã đọc một thông báo.
  app.post('/api/notifications/:id/read', (req, res) => {
    // Thông báo riêng về con (Đ137) có mã 'tbb…' — đánh dấu ở bảng riêng.
    if (tbb.laMaRiengBe(req.params.id)) {
      const r = tbb.danhDaDoc(req.user, req.params.id);
      if (!r.ok) return res.status(r.ma).json({ error: r.ma === 404 ? 'Không tìm thấy thông báo' : 'Không có quyền xem thông báo này' });
      return res.json({ ok: true });
    }
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!canSee(req.user, n)) {
      return res.status(403).json({ error: 'Không có quyền xem thông báo này' });
    }
    db.run('INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt) VALUES (?, ?, ?)',
      [n.id, req.user.id, new Date().toISOString()]);
    res.json({ ok: true });
  });

  // Đánh dấu đã đọc tất cả thông báo người dùng thấy được.
  app.post('/api/notifications/read-all', (req, res) => {
    const f = audienceFilter(req.user);
    const r = db.run(
      `INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
       SELECT id, ?, ? FROM notifications WHERE ${f.sql}`,
      [req.user.id, new Date().toISOString(), ...f.params]);
    const rieng = tbb.docTatCa(req.user);
    res.json({ ok: true, marked: r.changes + rieng });
  });

  // Giáo viên tạo thông báo mới.
  app.post('/api/notifications', requireRole('teacher', 'admin'), (req, res) => {
    const { title, body, category, audience } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
    }
    const daiQua = loiQuaDai(title, body);
    if (daiQua) return res.status(400).json({ error: daiQua });
    if (audience !== 'all' && audience !== 'class') {
      return res.status(400).json({ error: 'Phạm vi gửi không hợp lệ' });
    }
    // Cô mầm non có thể phụ trách nhiều nhóm, nên "gửi cho nhóm" phải hỏi cho
    // rõ nhóm nào. Cô chỉ có một nhóm thì vẫn không phải chọn gì — giữ nguyên
    // đúng số thao tác như trước.
    let nhomNhan = '';
    if (audience === 'class') {
      if (req.user.role === 'admin') {
        // Quản trị (văn phòng cơ sở, ban giám hiệu) cũng gửi được cho MỘT
        // nhóm. Trước vá, nhánh này rơi vào `nhomDangThaoTac` — hàm chỉ trả
        // lời cho vai cô — nên mọi tài khoản quản trị nhận câu 400 "Tài khoản
        // chưa gắn với nhóm lớp nào", một câu sai sự thật và không có lối ra.
        // `canAccessClass` tự siết theo cơ sở: Cấp 3 chỉ gửi được nhóm của
        // cơ sở mình.
        nhomNhan = String((req.body || {}).classId || '');
        if (!nhomNhan || !db.findClass(nhomNhan)) {
          return res.status(400).json({ error: 'Vui lòng chọn nhóm nhận thông báo' });
        }
        if (!db.canAccessClass(req.user, nhomNhan)) {
          return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
        }
      } else {
        const nhomCuaCo = nl.nhomCuaCo(req.user.id);
        nhomNhan = nl.nhomDangThaoTac(req.user, (req.body || {}).classId);
        if (!nhomNhan) {
          return res.status(400).json({
            error: nhomCuaCo.length > 1
              ? 'Cô đang phụ trách nhiều nhóm — vui lòng chọn nhóm nhận thông báo'
              : 'Tài khoản chưa gắn với nhóm lớp nào',
          });
        }
      }
    }
    const rec = {
      id: db.nextId('nt'),
      title: String(title).trim(),
      body: String(body).trim(),
      category: CATEGORIES.includes(category) ? category : 'Khác',
      audience: audience === 'class' ? nhomNhan : 'all',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    db.insert('notifications', rec);
    // VỀ TỚI ĐIỆN THOẠI, KHÔNG CHỈ KÊU CHUÔNG TRONG APP (Đ194, việc 16).
    //
    // Nhà trường (A11): thông báo nhà trường phải đẩy về máy. Đây là loại tin
    // đông người nhận nhất trong cả app — một tin `audience: 'all'` của trường
    // ba cơ sở đi tới MỌI máy đã đăng ký — nên nó chỉ mở được sau khi có trần
    // số tin gửi đồng thời (việc 17) và khoá gộp (việc 18), và ba việc ấy làm
    // cùng một đợt là vì thế.
    //
    // Mở thẳng màn Thông báo: tin này không có màn nào riêng của nó.
    tb.dayTin(rec, '#/notifications');
    db.audit(req.user.id, 'notification-create', rec.id, { audience: rec.audience });
    res.status(201).json({ ...rec, readBy: [] });
  });

  // Quản trị Cấp 3 chỉ sửa/thu hồi được thông báo TRONG CƠ SỞ MÌNH.
  //
  // `laChuBanGhi` trả lời "người gửi hoặc quản trị" — đúng cho vai cô, nhưng
  // với quản trị nó không hỏi cơ sở, nên quản lý cơ sở A sửa và thu hồi được
  // thông báo nhóm của cơ sở B. Thông báo gửi cả trường (audience = 'all')
  // vẫn như cũ: nó gửi cho cả cơ sở mình nên không tính là "của cơ sở khác".
  // `campusOfClass` đọc được cả nhóm đã đóng, nên thông báo của năm cũ không
  // làm chốt này chặn nhầm Cấp 1.
  function trongPhamViCoSo(user, n) {
    if (!user || user.role !== 'admin') return true;   // vai cô: laChuBanGhi đã giữ
    const pham = db.phamViCoSo(user);
    if (pham === null || !n.audience || n.audience === 'all') return true;
    return db.campusOfClass(n.audience) === pham;
  }

  // Sửa lại một thông báo đã gửi. Chỉ người gửi hoặc quản trị.
  app.put('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n || st.daThuHoi(BANG, n.id)) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới sửa được thông báo này' });
    }
    if (!trongPhamViCoSo(req.user, n)) {
      return res.status(403).json({ error: 'Thông báo này thuộc cơ sở khác' });
    }
    const patch = {};
    const daiQuaSua = loiQuaDai(req.body.title, req.body.body);
    if (daiQuaSua) return res.status(400).json({ error: daiQuaSua });
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
      patch.title = String(req.body.title).trim();
    }
    if (req.body.body !== undefined) {
      if (!String(req.body.body).trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
      patch.body = String(req.body.body).trim();
    }
    if (req.body.category !== undefined) {
      patch.category = CATEGORIES.includes(req.body.category) ? req.body.category : 'Khác';
    }
    // CỐ Ý không cho đổi `audience`: đổi phạm vi gửi sau khi đã gửi nghĩa là một
    // nhóm phụ huynh mất thông báo họ đã đọc, một nhóm khác bỗng thấy thông báo
    // không dành cho mình.
    db.update('notifications', n.id, patch);
    st.ghiDaSua(BANG, n.id, req.user.id);
    db.audit(req.user.id, 'notification-update', n.id, patch);
    res.json({ ...db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [n.id]), daSua: true });
  });

  // Thu hồi một thông báo: ẩn khỏi mọi danh sách, KHÔNG xóa dữ liệu.
  app.delete('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới thu hồi được thông báo này' });
    }
    if (!trongPhamViCoSo(req.user, n)) {
      return res.status(403).json({ error: 'Thông báo này thuộc cơ sở khác' });
    }
    st.ghiThuHoi(BANG, n.id, req.user.id);
    db.audit(req.user.id, 'notification-withdraw', n.id, { title: n.title });
    res.json({ ok: true });
  });
};
