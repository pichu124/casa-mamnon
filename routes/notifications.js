// Phân hệ Thông báo: giáo viên gửi thông báo cho lớp mình hoặc toàn trường,
// người dùng xem và đánh dấu đã đọc.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

const BANG = 'notifications';

// Đổi 'Lớp học' → 'Nhóm lớp' ở G0.5/N9. Đây là GIÁ TRỊ lưu trong cột
// `notifications.category`, nên phải đổi đồng thời với data/seed.js và bảng
// màu trong public/js/views/notifications.js — lệch một chỗ là thông báo cũ
// mất màu, mất biểu tượng mà không báo lỗi gì.
const CATEGORIES = ['Nhóm lớp', 'Nhà trường', 'Y tế', 'Học phí', 'Khác'];

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
       WHERE ${f.sql} AND ${st.dieuKienConHien(BANG, 'n.id')}
       ORDER BY n.pinned DESC, n.createdAt DESC`,
      [req.user.id, ...f.params])
      .map(n => {
        const author = n.createdBy ? db.findUser(n.createdBy) : null;
        return {
          ...n,
          read: !!n.read,
          authorName: author ? `${author.title} ${author.name}` : '',
          coTheSua: st.laChuBanGhi(req.user, n.createdBy),
        };
      });
    res.json(st.ganDauDaSua(BANG, list));
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
    // Cô mầm non có thể phụ trách nhiều nhóm, nên "gửi cho nhóm" phải hỏi cho
    // rõ nhóm nào. Cô chỉ có một nhóm thì vẫn không phải chọn gì — giữ nguyên
    // đúng số thao tác như trước.
    let nhomNhan = '';
    if (audience === 'class') {
      const nhomCuaCo = nl.nhomCuaCo(req.user.id);
      nhomNhan = nl.nhomDangThaoTac(req.user, (req.body || {}).classId);
      if (!nhomNhan) {
        return res.status(400).json({
          error: nhomCuaCo.length > 1
            ? 'Cô đang phụ trách nhiều nhóm — vui lòng chọn nhóm nhận thông báo'
            : 'Tài khoản chưa gắn với nhóm lớp nào',
        });
      }
    }
    const rec = {
      id: db.nextId('nt'),
      title: String(title).trim(),
      body: String(body).trim(),
      category: CATEGORIES.includes(category) ? category : 'Khác',
      audience: audience === 'class' ? nhomNhan : 'all',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    db.insert('notifications', rec);
    db.audit(req.user.id, 'notification-create', rec.id, { audience: rec.audience });
    res.status(201).json({ ...rec, readBy: [] });
  });

  // Sửa lại một thông báo đã gửi. Chỉ người gửi hoặc quản trị.
  app.put('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n || st.daThuHoi(BANG, n.id)) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới sửa được thông báo này' });
    }
    const patch = {};
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
      patch.title = String(req.body.title).trim();
    }
    if (req.body.body !== undefined) {
      if (!String(req.body.body).trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
      patch.body = String(req.body.body).trim();
    }
    if (req.body.category !== undefined) {
      patch.category = CATEGORIES.includes(req.body.category) ? req.body.category : 'Khác';
    }
    // CỐ Ý không cho đổi `audience`: đổi phạm vi gửi sau khi đã gửi nghĩa là một
    // nhóm phụ huynh mất thông báo họ đã đọc, một nhóm khác bỗng thấy thông báo
    // không dành cho mình.
    db.update('notifications', n.id, patch);
    st.ghiDaSua(BANG, n.id, req.user.id);
    db.audit(req.user.id, 'notification-update', n.id, patch);
    res.json({ ...db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [n.id]), daSua: true });
  });

  // Thu hồi một thông báo: ẩn khỏi mọi danh sách, KHÔNG xóa dữ liệu.
  app.delete('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới thu hồi được thông báo này' });
    }
    st.ghiThuHoi(BANG, n.id, req.user.id);
    db.audit(req.user.id, 'notification-withdraw', n.id, { title: n.title });
    res.json({ ok: true });
  });
};
