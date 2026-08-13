// Phân hệ Kế hoạch giáo dục tháng của lớp.
const db = require('../lib/db');

// Ghép thêm tên lớp + tên GVCN cho một kế hoạch.
function decorate(p) {
  const cls = db.findClass(p.classId);
  const teacher = cls && cls.teacherId ? db.findUser(cls.teacherId) : null;
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
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của lớp này' });
    }
    const now = new Date();
    const plans = db.all('edu_plans',
      'SELECT * FROM edu_plans WHERE classId = ? ORDER BY year DESC, month DESC', [classId])
      .map(decorate);
    const plan = plans.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear()) || null;
    res.json({ plan, plans });
  });
};
