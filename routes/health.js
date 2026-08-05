// Phân hệ Y tế học đường: hồ sơ sức khỏe của học sinh, giáo viên thêm ghi nhận mới.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const TYPES = ['checkup', 'vaccination', 'incident'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Hồ sơ y tế của một học sinh: danh sách ghi nhận (mới nhất trước)
  // + lần khám định kỳ gần nhất để hiển thị chỉ số.
  app.get('/api/health', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem hồ sơ y tế của học sinh này' });
    }
    const records = db.get().health
      .filter(h => h.studentId === studentId)
      .slice().reverse() // cùng ngày thì bản ghi thêm sau lên trước
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const latestCheckup = records.find(r => r.type === 'checkup') || null;
    res.json({ records, latestCheckup });
  });

  // Giáo viên thêm ghi nhận y tế cho học sinh lớp mình.
  app.post('/api/health', requireRole('teacher'), (req, res) => {
    const { studentId, type, title, detail, height, weight } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền thêm ghi nhận cho học sinh này' });
    }
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề ghi nhận' });
    }
    const rec = {
      id: db.nextId('ht'),
      studentId,
      date: todayStr(),
      type,
      title: String(title).trim(),
      detail: String(detail || '').trim(),
    };
    if (type === 'checkup') {
      const h = Number(height), w = Number(weight);
      if (Number.isFinite(h) && h > 0) rec.height = h;
      if (Number.isFinite(w) && w > 0) rec.weight = w;
    }
    db.get().health.push(rec);
    db.save();
    res.status(201).json(rec);
  });
};
