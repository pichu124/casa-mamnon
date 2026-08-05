// Phân hệ Album ảnh: giáo viên đăng album cho lớp, phụ huynh xem album lớp của con.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Bảng cặp màu gradient pastel, gán xoay vòng cho ảnh của album mới.
const GRADIENTS = [
  ['#ff9a9e', '#fad0c4'],
  ['#a18cd1', '#fbc2eb'],
  ['#84fab0', '#8fd3f4'],
  ['#ffecd2', '#fcb69f'],
  ['#89f7fe', '#66a6ff'],
  ['#d4fc79', '#96e6a1'],
  ['#a1c4fd', '#c2e9fb'],
  ['#fccb90', '#d57eeb'],
];

// Các lớp mà người dùng được xem album.
function myClassIds(user) {
  if (user.role === 'teacher') return [user.classId];
  return [...new Set(db.studentsOf(user).map(s => s.classId))];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Danh sách album các lớp liên quan, mới nhất trước (không kèm toàn bộ ảnh).
  app.get('/api/albums', (req, res) => {
    const classIds = myClassIds(req.user);
    const list = db.get().albums
      .filter(a => classIds.includes(a.classId))
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map(a => {
        const { photos, ...rest } = a;
        const cls = db.findClass(a.classId);
        return {
          ...rest,
          className: cls ? cls.name : '',
          photoCount: photos.length,
          cover: photos[0] || null,
        };
      });
    res.json(list);
  });

  // Chi tiết đầy đủ một album.
  app.get('/api/albums/:id', (req, res) => {
    const album = db.get().albums.find(a => a.id === req.params.id);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!myClassIds(req.user).includes(album.classId)) {
      return res.status(403).json({ error: 'Không có quyền xem album này' });
    }
    const cls = db.findClass(album.classId);
    const author = db.findUser(album.createdBy);
    res.json({
      ...album,
      className: cls ? cls.name : '',
      authorName: author ? `${author.title} ${author.name}` : '',
    });
  });

  // Giáo viên tạo album mới cho lớp chủ nhiệm.
  app.post('/api/albums', requireRole('teacher'), (req, res) => {
    const { title, description, photos } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên album' });
    }
    if (!Array.isArray(photos) || photos.length < 1) {
      return res.status(400).json({ error: 'Album cần có ít nhất 1 ảnh' });
    }
    if (!req.user.classId) {
      return res.status(400).json({ error: 'Tài khoản chưa gắn với lớp chủ nhiệm' });
    }
    const rec = {
      id: db.nextId('al'),
      classId: req.user.classId,
      title: String(title).trim(),
      date: todayStr(),
      description: String(description || '').trim(),
      createdBy: req.user.id,
      photos: photos.map((p, i) => ({
        id: db.nextId('ph'),
        emoji: String((p && p.emoji) || '').trim() || '📷',
        g: GRADIENTS[i % GRADIENTS.length],
        caption: String((p && p.caption) || '').trim(),
      })),
    };
    db.get().albums.push(rec);
    db.save();
    res.status(201).json(rec);
  });
};
