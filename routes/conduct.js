// Phân hệ Nề nếp: tuyên dương / nhắc nhở và điểm thi đua.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Ngày hôm nay theo giờ địa phương, định dạng YYYY-MM-DD (khớp seed).
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Bản ghi nề nếp của một học sinh (mới nhất trước) + tổng điểm.
  app.get('/api/conduct', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học sinh này' });
    }
    const records = db.get().conduct
      .filter(c => c.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const totalPoints = records.reduce((sum, c) => sum + (c.points || 0), 0);
    res.json({ records, totalPoints });
  });

  // Toàn cảnh lớp (giáo viên): ghi nhận gần đây + bảng xếp hạng thi đua.
  app.get('/api/conduct/class', requireRole('teacher'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    const records = db.get().conduct.filter(c => ids.includes(c.studentId));

    const recent = [...records]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(c => {
        const s = db.findStudent(c.studentId);
        return { ...c, studentName: s ? s.name : '' };
      });

    const ranking = students
      .map(s => ({
        studentId: s.id,
        studentName: s.name,
        avatar: s.avatar,
        points: records
          .filter(c => c.studentId === s.id)
          .reduce((sum, c) => sum + (c.points || 0), 0),
      }))
      .sort((a, b) => b.points - a.points);

    res.json({ recent, ranking });
  });

  // Giáo viên ghi nhận tuyên dương / nhắc nhở cho học sinh lớp mình.
  app.post('/api/conduct', requireRole('teacher'), (req, res) => {
    const { studentId, type, title, content, points } = req.body || {};
    if (!studentId || !db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Học sinh không thuộc lớp của bạn' });
    }
    if (!['praise', 'reminder'].includes(type)) {
      return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
    }
    if (!String(title || '').trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề' });
    }
    const pts = Number(points);
    if (!Number.isFinite(pts)) {
      return res.status(400).json({ error: 'Điểm phải là một số' });
    }

    const record = {
      id: db.nextId('cd'),
      studentId,
      date: todayStr(),
      type,
      title: String(title).trim(),
      content: String(content || '').trim(),
      points: pts,
      byTeacherId: req.user.id,
    };
    db.get().conduct.push(record);
    db.save();
    res.json(record);
  });
};
