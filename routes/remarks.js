// Phân hệ Nhận xét hằng ngày: giáo viên gửi nhận xét, phụ huynh theo dõi.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const RATINGS = ['great', 'good', 'needs_effort'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Nhận xét của một học sinh, mới nhất trước.
  // Phụ huynh xem xong sẽ được đánh dấu đã xem (parentSeen=true) nhưng
  // response giữ giá trị CŨ để giao diện biết nhận xét nào là mới.
  app.get('/api/remarks', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học sinh này' });
    }
    const list = db.all('remarks',
      'SELECT * FROM remarks WHERE studentId = ? ORDER BY date DESC, id DESC', [studentId]);

    // Giữ giá trị parentSeen CŨ trong dữ liệu trả về để giao diện biết nhận xét
    // nào là mới, rồi mới đánh dấu đã xem.
    const out = list.map(r => {
      const t = r.teacherId ? db.findUser(r.teacherId) : null;
      return { ...r, teacherName: t ? `${t.title} ${t.name}` : '' };
    });

    if (req.user.role === 'parent') {
      db.run('UPDATE remarks SET parentSeen = 1 WHERE studentId = ? AND parentSeen = 0', [studentId]);
    }
    res.json(out);
  });

  // Giáo viên: nhận xét gần đây của cả lớp chủ nhiệm.
  app.get('/api/remarks/class', requireRole('teacher', 'admin'), (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const list = db.all('remarks',
      `SELECT * FROM remarks WHERE studentId IN (${ids.map(() => '?').join(',')})
       ORDER BY date DESC, id DESC LIMIT 30`, ids)
      .map(r => {
        const s = db.findStudent(r.studentId);
        return { ...r, studentName: s ? s.name : '', studentAvatar: s ? s.avatar : null };
      });
    res.json(list);
  });

  // Giáo viên viết nhận xét mới cho học sinh trong lớp.
  app.post('/api/remarks', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, content, rating, skills } = req.body || {};
    if (!studentId) return res.status(400).json({ error: 'Vui lòng chọn học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Học sinh không thuộc lớp của bạn' });
    }
    const text = String(content || '').trim();
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung nhận xét' });
    if (!RATINGS.includes(rating)) return res.status(400).json({ error: 'Mức đánh giá không hợp lệ' });

    let skillList = [];
    if (Array.isArray(skills)) skillList = skills;
    else if (typeof skills === 'string') skillList = skills.split(',');
    skillList = skillList.map(s => String(s).trim()).filter(Boolean);

    const rec = {
      id: db.nextId('rm'),
      studentId,
      teacherId: req.user.id,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? date : todayStr(),
      content: text,
      rating,
      skills: skillList,
      parentSeen: false,
    };
    db.insert('remarks', rec);
    res.json(rec);
  });
};
