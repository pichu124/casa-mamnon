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
    const records = db.all('conduct',
      'SELECT * FROM conduct WHERE studentId = ? ORDER BY date DESC', [studentId]);
    const totalPoints = db.count(
      'SELECT COALESCE(SUM(points), 0) FROM conduct WHERE studentId = ?', [studentId]);
    res.json({ records, totalPoints });
  });

  // Toàn cảnh lớp (giáo viên): ghi nhận gần đây + bảng xếp hạng thi đua.
  app.get('/api/conduct/class', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ recent: [], ranking: [] });
    const marks = ids.map(() => '?').join(',');

    const byId = new Map(students.map(s => [s.id, s]));
    const recent = db.all('conduct',
      `SELECT * FROM conduct WHERE studentId IN (${marks}) ORDER BY date DESC`, ids)
      .map(c => ({ ...c, studentName: byId.get(c.studentId)?.name || '' }));

    // Tổng điểm từng em do cơ sở dữ liệu cộng, không phải duyệt mảng trong bộ nhớ.
    const sums = new Map(db.all('conduct',
      `SELECT studentId, COALESCE(SUM(points), 0) AS points FROM conduct
       WHERE studentId IN (${marks}) GROUP BY studentId`, ids)
      .map(r => [r.studentId, Number(r.points)]));

    const ranking = students
      .map(s => ({
        studentId: s.id,
        studentName: s.name,
        avatar: s.avatar,
        points: sums.get(s.id) || 0,
      }))
      .sort((a, b) => b.points - a.points);

    res.json({ recent, ranking });
  });

  // Giáo viên ghi nhận tuyên dương / nhắc nhở cho học sinh lớp mình.
  app.post('/api/conduct', requireRole('teacher', 'admin'), (req, res) => {
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
    db.insert('conduct', record);
    res.json(record);
  });
};
