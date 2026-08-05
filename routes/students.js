// Phân hệ Học sinh: hồ sơ học sinh, danh sách lớp (giáo viên).
const db = require('../lib/db');
const { publicUser } = require('./auth');

module.exports = (app) => {
  // Danh sách học sinh mà người dùng được xem, kèm thông tin lớp + GVCN.
  app.get('/api/students', (req, res) => {
    const list = db.studentsOf(req.user).map(s => decorate(s));
    res.json(list);
  });

  // Hồ sơ chi tiết một học sinh.
  app.get('/api/students/:id', (req, res) => {
    if (!db.canAccessStudent(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Không có quyền xem học sinh này' });
    }
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    const parents = s.parentIds.map(pid => publicUser(db.findUser(pid))).filter(Boolean);
    res.json({ ...decorate(s), parents });
  });
};

function decorate(s) {
  const cls = db.findClass(s.classId);
  const teacher = cls ? db.findUser(cls.teacherId) : null;
  return {
    ...s,
    className: cls ? cls.name : '',
    room: cls ? cls.room : '',
    teacherName: teacher ? `${teacher.title} ${teacher.name}` : '',
    teacherPhone: teacher ? teacher.phone : '',
  };
}
