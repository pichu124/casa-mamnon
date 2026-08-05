// Phân hệ Báo cáo học tập: kết quả từng học kỳ của học sinh.
const db = require('../lib/db');

module.exports = (app) => {
  // Danh sách báo cáo học tập của một học sinh, sắp theo học kỳ.
  app.get('/api/reports', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học sinh này' });
    }
    const list = db.get().reports
      .filter(r => r.studentId === studentId)
      .sort((a, b) => a.year.localeCompare(b.year) || a.term.localeCompare(b.term));
    res.json(list);
  });
};
