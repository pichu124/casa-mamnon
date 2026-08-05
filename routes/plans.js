// Phân hệ Kế hoạch giáo dục tháng của lớp.
const db = require('../lib/db');

// Người dùng có được xem dữ liệu của lớp này không.
// Giáo viên: lớp chủ nhiệm. Phụ huynh: lớp của các con.
function canAccessClass(user, classId) {
  if (user.role === 'teacher') return user.classId === classId;
  if (user.role === 'parent') return db.studentsOf(user).some(s => s.classId === classId);
  return false;
}

// Ghép thêm tên lớp + tên GVCN cho một kế hoạch.
function decorate(p) {
  const cls = db.findClass(p.classId);
  const teacher = cls ? db.findUser(cls.teacherId) : null;
  return {
    ...p,
    className: cls ? cls.name : '',
    teacherName: teacher ? `${teacher.title} ${teacher.name}` : '',
  };
}

module.exports = (app) => {
  // Kế hoạch giáo dục của một lớp: trả về kế hoạch tháng hiện tại (plan)
  // kèm toàn bộ kế hoạch của lớp (plans, mới nhất trước).
  app.get('/api/plans', (req, res) => {
    const classId = String(req.query.classId || '');
    if (!classId) return res.status(400).json({ error: 'Thiếu mã lớp' });
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy lớp' });
    if (!canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của lớp này' });
    }
    const now = new Date();
    const plans = db.get().eduPlans
      .filter(p => p.classId === classId)
      .map(decorate)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const plan = plans.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear()) || null;
    res.json({ plan, plans });
  });
};
