// Phân hệ Thông báo: giáo viên gửi thông báo cho lớp mình hoặc toàn trường,
// người dùng xem và đánh dấu đã đọc.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const CATEGORIES = ['Lớp học', 'Nhà trường', 'Y tế', 'Học phí', 'Khác'];

// Điều kiện SQL lọc theo phạm vi gửi mà người dùng được thấy.
function audienceFilter(user) {
  const classIds = db.classIdsOf(user);
  const marks = classIds.map(() => '?').join(',');
  return {
    sql: classIds.length ? `(audience = 'all' OR audience IN (${marks}))` : `audience = 'all'`,
    params: classIds,
  };
}

function canSee(user, notification) {
  return notification.audience === 'all' || db.classIdsOf(user).includes(notification.audience);
}

module.exports = (app) => {
  // Danh sách thông báo: ghim trước, rồi mới nhất trước; kèm trạng thái đã đọc
  // và tên người gửi. Trạng thái đã đọc lấy bằng một phép nối, không phải tra
  // từng thông báo một.
  app.get('/api/notifications', (req, res) => {
    const f = audienceFilter(req.user);
    const list = db.all('notifications',
      `SELECT n.*, (r.userId IS NOT NULL) AS read
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notificationId = n.id AND r.userId = ?
       WHERE ${f.sql}
       ORDER BY n.pinned DESC, n.createdAt DESC`,
      [req.user.id, ...f.params])
      .map(n => {
        const author = n.createdBy ? db.findUser(n.createdBy) : null;
        return {
          ...n,
          read: !!n.read,
          authorName: author ? `${author.title} ${author.name}` : '',
        };
      });
    res.json(list);
  });

  // Đánh dấu đã đọc một thông báo.
  app.post('/api/notifications/:id/read', (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!canSee(req.user, n)) {
      return res.status(403).json({ error: 'Không có quyền xem thông báo này' });
    }
    db.run('INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt) VALUES (?, ?, ?)',
      [n.id, req.user.id, new Date().toISOString()]);
    res.json({ ok: true });
  });

  // Đánh dấu đã đọc tất cả thông báo người dùng thấy được.
  app.post('/api/notifications/read-all', (req, res) => {
    const f = audienceFilter(req.user);
    const r = db.run(
      `INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
       SELECT id, ?, ? FROM notifications WHERE ${f.sql}`,
      [req.user.id, new Date().toISOString(), ...f.params]);
    res.json({ ok: true, marked: r.changes });
  });

  // Giáo viên tạo thông báo mới.
  app.post('/api/notifications', requireRole('teacher', 'admin'), (req, res) => {
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
    };
    db.insert('notifications', rec);
    db.audit(req.user.id, 'notification-create', rec.id, { audience: rec.audience });
    res.status(201).json({ ...rec, readBy: [] });
  });
};
