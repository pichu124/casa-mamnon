// Phân hệ Điểm danh: phụ huynh xem theo tháng, giáo viên điểm danh lớp theo ngày.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const STATUSES = ['present', 'late', 'absent_excused', 'absent_unexcused'];

function pad(n) { return String(n).padStart(2, '0'); }
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = (app) => {
  // Bản ghi điểm danh của một học sinh trong tháng (mặc định: tháng hiện tại).
  app.get('/api/attendance', (req, res) => {
    const studentId = req.query.studentId;
    const month = req.query.month || currentMonth();
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem điểm danh của học sinh này' });
    }
    res.json(db.all('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date LIKE ? ORDER BY date',
      [studentId, `${month}-%`]));
  });

  // Giáo viên: toàn bộ học sinh lớp chủ nhiệm kèm bản ghi điểm danh của một ngày.
  app.get('/api/attendance/class', requireRole('teacher', 'admin'), (req, res) => {
    const date = req.query.date || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    const students = db.studentsOf(req.user);
    // Lấy một lần toàn bộ bản ghi trong ngày rồi ghép, thay vì tra từng em.
    const ids = students.map(s => s.id);
    const byStudent = new Map();
    if (ids.length) {
      const rows = db.all('attendance',
        `SELECT * FROM attendance WHERE date = ? AND studentId IN (${ids.map(() => '?').join(',')})`,
        [date, ...ids]);
      for (const r of rows) byStudent.set(r.studentId, r);
    }
    res.json({
      date,
      students: students.map(s => ({
        student: { id: s.id, name: s.name, code: s.code, avatar: s.avatar },
        record: byStudent.get(s.id) || null,
      })),
    });
  });

  // Giáo viên điểm danh một học sinh: ghi đè bản ghi của đúng ngày đó.
  app.post('/api/attendance/mark', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, status, note } = req.body || {};
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Thiếu thông tin điểm danh' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Học sinh không thuộc lớp chủ nhiệm của bạn' });
    }

    const existing = db.first('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, date]);

    const rec = existing || {
      id: db.nextId('att'), studentId, date,
      status, checkIn: null, checkOut: null, note: '', markedBy: req.user.id,
    };
    rec.status = status;
    if (typeof note === 'string') rec.note = note;
    if (status === 'present' && !rec.checkIn) rec.checkIn = nowTime();
    if (status === 'absent_excused' || status === 'absent_unexcused') {
      rec.checkIn = null;
      rec.checkOut = null;
    }
    rec.markedBy = req.user.id;

    db.upsert('attendance', rec, ['studentId', 'date']);
    res.json(rec);
  });
};
