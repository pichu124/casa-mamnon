// Phân hệ Thời khóa biểu: trả TKB của lớp mà người dùng có quyền xem.
// Phụ huynh: lớp của một trong các con. Giáo viên: lớp chủ nhiệm.
const db = require('../lib/db');

module.exports = (app) => {
  app.get('/api/timetable', (req, res) => {
    const classId = String(req.query.classId || '').trim();
    if (!classId) return res.status(400).json({ error: 'Thiếu mã lớp (classId)' });

    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy lớp học' });

    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem thời khóa biểu của lớp này' });
    }

    const tt = db.first('timetable', 'SELECT * FROM timetable WHERE classId = ?', [classId]);
    if (!tt) return res.status(404).json({ error: 'Lớp chưa có thời khóa biểu' });

    const teacher = cls.teacherId ? db.findUser(cls.teacherId) : null;
    res.json({
      ...tt,
      className: cls.name,
      teacherName: teacher ? `${teacher.title} ${teacher.name}` : '',
    });
  });
};
