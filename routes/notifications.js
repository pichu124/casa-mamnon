// Phân hệ Thông báo: giáo viên gửi thông báo cho lớp mình hoặc toàn trường,
// người dùng xem và đánh dấu đã đọc.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const CATEGORIES = ['Lớp học', 'Nhà trường', 'Y tế', 'Học phí', 'Khác'];

// Các lớp liên quan tới người dùng (giáo viên: lớp mình; phụ huynh: lớp các con).
function myClassIds(user) {
  if (user.role === 'teacher') return [user.classId];
  return [...new Set(db.studentsOf(user).map(s => s.classId))];
}

// Danh sách thông báo người dùng được thấy.
function visibleTo(user) {
  const classIds = myClassIds(user);
  return db.get().notifications.filter(n => n.audience === 'all' || classIds.includes(n.audience));
}

module.exports = (app) => {
  // Danh sách thông báo: ghim trước, rồi mới nhất trước; kèm trạng thái đã đọc + tên người gửi.
  app.get('/api/notifications', (req, res) => {
    const list = visibleTo(req.user)
      .slice()
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      })
      .map(n => {
        const author = db.findUser(n.createdBy);
        return {
          ...n,
          read: n.readBy.includes(req.user.id),
          authorName: author ? `${author.title} ${author.name}` : '',
        };
      });
    res.json(list);
  });

  // Đánh dấu đã đọc một thông báo.
  app.post('/api/notifications/:id/read', (req, res) => {
    const n = db.get().notifications.find(x => x.id === req.params.id);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!(n.audience === 'all' || myClassIds(req.user).includes(n.audience))) {
      return res.status(403).json({ error: 'Không có quyền xem thông báo này' });
    }
    if (!n.readBy.includes(req.user.id)) {
      n.readBy.push(req.user.id);
      db.save();
    }
    res.json({ ok: true });
  });

  // Đánh dấu đã đọc tất cả thông báo người dùng thấy được.
  app.post('/api/notifications/read-all', (req, res) => {
    let marked = 0;
    for (const n of visibleTo(req.user)) {
      if (!n.readBy.includes(req.user.id)) {
        n.readBy.push(req.user.id);
        marked += 1;
      }
    }
    if (marked) db.save();
    res.json({ ok: true, marked });
  });

  // Giáo viên tạo thông báo mới.
  app.post('/api/notifications', requireRole('teacher'), (req, res) => {
    const { title, body, category, audience } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
    }
    if (audience !== 'all' && audience !== 'class') {
      return res.status(400).json({ error: 'Phạm vi gửi không hợp lệ' });
    }
    if (audience === 'class' && !req.user.classId) {
      return res.status(400).json({ error: 'Tài khoản chưa gắn với lớp chủ nhiệm' });
    }
    const rec = {
      id: db.nextId('nt'),
      title: String(title).trim(),
      body: String(body).trim(),
      category: CATEGORIES.includes(category) ? category : 'Khác',
      audience: audience === 'class' ? req.user.classId : 'all',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      pinned: false,
      readBy: [],
    };
    db.get().notifications.push(rec);
    db.save();
    res.status(201).json(rec);
  });
};
