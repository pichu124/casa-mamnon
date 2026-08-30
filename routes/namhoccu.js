// Phân hệ Năm học trước: phụ huynh xem lại nội dung của lớp con TỪNG học.
//
// Vì sao là một phân hệ riêng chứ không sửa vào năm tệp route đang chạy:
//
//   • Thông báo, Khảo sát, Kế hoạch, Thời khóa biểu đều khóa theo lớp ĐANG MỞ
//     (`db.classIdsOf`). Nới hàm đó ra là đổi hành vi cả 8 chỗ đang gọi nó —
//     kể cả điểm danh và huy hiệu trang chủ — trong một lần đẩy.
//   • Sửa từng đường đọc của năm phân hệ nghĩa là chạm vào năm tệp mà giáo viên
//     và phụ huynh đang dùng hằng ngày, chỉ để phục vụ một việc tra cứu hiếm.
//
// Gói vào một phân hệ mới thì: các phân hệ đang chạy không bị đụng một dòng nào,
// cơ chế cô lập lỗi của kho mã bao luôn phần này, và nhà trường tắt được nó
// trong Quản trị → Tính năng nếu thấy không cần.
//
// Đây là đường CHỈ ĐỌC. Không có bất kỳ đường ghi nào.
const db = require('../lib/db');
const lsl = require('../lib/lich-su-lop');
// HỎI CÔNG TẮC TRƯỚC KHI ĐỌC BẢNG CỦA PHÂN HỆ KHÁC — bước mà `modules/README.md`
// dạy. Màn này BẬT SẴN cho mọi gia đình và đọc bảng của BỐN phân hệ khác, nên
// nhà trường tắt Thông báo / Khảo sát / Kế hoạch / Lịch sinh hoạt mà dữ liệu
// của chúng vẫn hiện ra ở đây thì công tắc kia coi như không có tác dụng.
const modules = require('../lib/modules');

// Mỗi mục nội dung chỉ được trả về nếu nó thuộc lớp con từng học VÀ rơi vào đúng
// khoảng con còn ở lớp đó. Album có mặt nhiều trẻ khác, thông báo lớp nhắc tên
// các bạn khác — mở cả lớp cũ là gia đình đã rời lớp vẫn đọc được chuyện của lớp
// sau khi con mình đi rồi.
function trongKhoang(khoang, ngay) {
  if (!ngay) return true;
  const d = String(ngay).slice(0, 10);
  return d >= khoang.tu && d <= khoang.den;
}

module.exports = (app) => {
  // Danh sách các lớp cũ của các con, để phụ huynh chọn xem năm nào.
  app.get('/api/namhoccu', (req, res) => {
    if (req.user.role !== 'parent') {
      return res.json({ khoang: [] });
    }
    const khoang = lsl.lopCuCuaPhuHuynh(req.user).map(k => {
      const hs = db.findStudent(k.studentId);
      return {
        id: k.id,
        studentId: k.studentId,
        studentName: hs ? hs.name : '',
        classId: k.classId,
        className: k.className,
        year: k.year,
        tu: k.tu,
        den: k.den,
      };
    });
    res.json({ khoang });
  });

  // Toàn bộ nội dung của MỘT khoảng lớp cũ, gom vào một lượt gọi.
  app.get('/api/namhoccu/:id', (req, res) => {
    const k = lsl.lopCuCuaPhuHuynh(req.user).find(x => x.id === req.params.id);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy nhóm cũ này của con' });

    const lop = db.findClass(k.classId);
    const hs = db.findStudent(k.studentId);

    const thongBao = !modules.dangBat('thongbao') ? [] : db.all('notifications',
      `SELECT * FROM notifications WHERE audience = ? ORDER BY createdAt DESC`, [k.classId])
      .filter(n => trongKhoang(k, n.createdAt))
      .map(n => {
        const a = n.createdBy ? db.findUser(n.createdBy) : null;
        return {
          id: n.id, title: n.title, body: n.body, category: n.category,
          createdAt: n.createdAt,
          authorName: a ? `${a.title} ${a.name}` : '',
        };
      });

    const khaoSat = !modules.dangBat('khaosat') ? [] : db.all('surveys',
      `SELECT * FROM surveys WHERE audience = ? ORDER BY createdAt DESC`, [k.classId])
      .filter(s => trongKhoang(k, s.createdAt))
      .map(s => ({ id: s.id, title: s.title, createdAt: s.createdAt, deadline: s.deadline }));

    // Kế hoạch giáo dục ghi theo tháng: dựng ngày mùng 1 của tháng đó để so.
    const keHoach = !modules.dangBat('kehoach') ? [] : db.all('edu_plans',
      'SELECT * FROM edu_plans WHERE classId = ? ORDER BY year DESC, month DESC', [k.classId])
      .filter(p => trongKhoang(k, `${p.year}-${String(p.month).padStart(2, '0')}-01`));

    // Thời khóa biểu không có ngày — nó là ảnh chụp hiện trạng của lớp. Trả về
    // nguyên bản của lớp cũ, kèm lời nhắc rõ để gia đình không hiểu nhầm là
    // thời khóa biểu đúng của từng tuần trong năm đó.
    const tkb = !modules.dangBat('tkb') ? null
      : (db.first('timetable', 'SELECT * FROM timetable WHERE classId = ?', [k.classId]) || null);

    res.json({
      khoang: {
        id: k.id, classId: k.classId, className: k.className, year: k.year,
        tu: k.tu, den: k.den,
        studentId: k.studentId,
        studentName: hs ? hs.name : '',
        lopDaDong: !!(lop && !lop.active),
      },
      thongBao,
      khaoSat,
      keHoach,
      tkb,
      // Album không gói ở đây: phụ huynh xem thẳng trong màn Album ảnh, ở mục
      // "Album của các năm học trước". Nhắc lại đường đó cho khỏi phải đi tìm.
      xemAlbumTai: '#/albums',
    });
  });
};
