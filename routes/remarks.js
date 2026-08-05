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
    const list = db.get().remarks
      .filter(r => r.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    // Chụp lại giá trị parentSeen cũ trước khi đánh dấu đã xem.
    const out = list.map(r => {
      const t = db.findUser(r.teacherId);
      return { ...r, teacherName: t ? `${t.title} ${t.name}` : '' };
    });

    if (req.user.role === 'parent') {
      let changed = false;
      for (const r of list) {
        if (!r.parentSeen) { r.parentSeen = true; changed = true; }
      }
      if (changed) db.save();
    }
    res.json(out);
  });

  // Giáo viên: nhận xét gần đây của cả lớp chủ nhiệm.
  app.get('/api/remarks/class', requireRole('teacher'), (req, res) => {
    const studentIds = db.studentsOf(req.user).map(s => s.id);
    const list = db.get().remarks
      .filter(r => studentIds.includes(r.studentId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 30)
      .map(r => {
        const s = db.findStudent(r.studentId);
        return { ...r, studentName: s ? s.name : '', studentAvatar: s ? s.avatar : null };
      });
    res.json(list);
  });

  // Giáo viên viết nhận xét mới cho học sinh trong lớp.
  app.post('/api/remarks', requireRole('teacher'), (req, res) => {
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
    db.get().remarks.push(rec);
    db.save();
    res.json(rec);
  });
};
