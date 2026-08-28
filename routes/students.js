// Phân hệ Học sinh: hồ sơ học sinh, danh sách lớp (giáo viên).
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { publicUser } = require('./auth');

function decorate(s) {
  const cls = s.classId ? db.findClass(s.classId) : null;
  return {
    ...s,
    className: cls ? cls.name : '',
    room: cls ? cls.room : '',
    // Nhóm mầm non có 2–3 cô cùng phụ trách. `teacherName` giữ nguyên hình dạng
    // cũ (một cô — cô phụ trách chính) cho màn hình chưa đổi; `teachers` và
    // `teacherNames` là chỗ các cô còn lại hiện ra.
    ...nl.tomTat(s.classId),
  };
}

module.exports = (app) => {
  // Danh sách học sinh mà người dùng được xem, kèm thông tin lớp + GVCN.
  app.get('/api/students', (req, res) => {
    res.json(db.studentsOf(req.user).map(decorate));
  });

  // Hồ sơ chi tiết một học sinh.
  app.get('/api/students/:id', (req, res) => {
    if (!db.canAccessStudent(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const hoSo = db.hoSoBe(s.id);

    // SỐ CCCD CỦA PHỤ HUYNH có ranh giới KHÁC số định danh của bé.
    //
    // Nhà trường cần nó để đối chiếu khi ký hợp đồng và khi giao bé cho người
    // tới đón. Nhưng nó là giấy tờ của NGƯỜI LỚN, nên:
    //
    //   • quản trị đọc được — đó là việc của văn phòng;
    //   • CHÍNH NGƯỜI ĐÓ đọc được số của mình, để biết trường đang giữ gì;
    //   • cô KHÔNG đọc được — cô không cần số giấy tờ của bố mẹ để dạy bé;
    //   • PHỤ HUYNH CÒN LẠI của cùng một bé cũng KHÔNG đọc được. Bố mẹ ly hôn
    //     là chuyện có thật ở trường mầm non, và app không được là nơi một bên
    //     lấy được số giấy tờ của bên kia.
    //
    // Vì `publicUser` chỉ gạt `passwordHash`, mọi thứ khác trong hàng `users`
    // đi thẳng ra ngoài. Nên soCccd phải được GHÉP TAY vào đúng người, chứ
    // không phải lọc bớt sau khi đã lấy cả hàng ra.
    const chiQuanTri = req.user.role === 'admin';
    const parents = s.parentIds.map(pid => {
      const p = publicUser(db.findUser(pid));
      if (!p) return null;
      const duocXem = chiQuanTri || req.user.id === pid;
      return duocXem ? { ...p, soCccd: db.hoSoNguoiDung(pid).soCccd } : p;
    }).filter(Boolean);

    // SỐ ĐỊNH DANH CÁ NHÂN chỉ về tay quản trị và văn phòng.
    //
    // Đây là dữ liệu cá nhân theo Nghị định 13/2023. Cô cần biết tiền sử bệnh
    // và số gọi khẩn cấp của bé — cô KHÔNG cần số định danh để làm việc, nên
    // không gửi. Cắt ở máy chủ chứ không giấu ở giao diện: giấu ở giao diện thì
    // người biết đường dẫn vẫn lấy được. `chiQuanTri` đã tính ở trên.

    // Thông tin liên hệ của trường: cơ sở của nhóm bé trước, không có thì lùi
    // về thông tin chung của trường. Nhà trường yêu cầu phụ huynh gọi HOTLINE
    // VĂN PHÒNG chứ không gọi số riêng của cô.
    const truong = db.school() || {};
    const cs = db.findCampus(db.campusOfClass(s.classId)) || {};
    const lienHeTruong = {
      tenCoSo: cs.name || '',
      diaChi: cs.address || truong.address || '',
      hotline: cs.phone || truong.phone || '',
      email: cs.email || truong.email || '',
    };

    res.json({
      ...decorate(s),
      parents,
      lienHeTruong,
      tienSuBenh: hoSo.tienSuBenh,
      lienHeKhanCap: hoSo.lienHeKhanCap,
      ...(chiQuanTri ? { soDinhDanh: hoSo.soDinhDanh } : {}),
    });
  });
};
