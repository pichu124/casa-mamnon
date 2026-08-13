// Phân hệ Album ảnh: giáo viên đăng album cho lớp, phụ huynh xem album lớp của con.
//
// Ảnh có hai dạng cùng tồn tại:
//   - Ảnh thật do giáo viên tải lên  → { id, file, caption }
//   - Ảnh minh họa bằng emoji (dữ liệu cũ) → { id, emoji, g: [màu1, màu2], caption }
const fs = require('fs');
const db = require('../lib/db');
const uploads = require('../lib/uploads');
const { requireRole } = require('../lib/auth');

// Bảng cặp màu gradient pastel cho ảnh minh họa bằng emoji.
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

const MAX_PHOTOS_PER_ALBUM = 60;

// Các lớp mà người dùng được xem album.
function myClassIds(user) {
  if (user.role === 'teacher') return [user.classId];
  return [...new Set(db.studentsOf(user).map(s => s.classId))];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Dựng bản ghi ảnh từ dữ liệu trình duyệt gửi lên.
// Ưu tiên ảnh thật; không có ảnh thì quay về emoji minh họa như trước.
function buildPhoto(input, index) {
  const p = input || {};
  const caption = String(p.caption || '').trim().slice(0, 200);
  if (p.dataUrl) {
    const { file } = uploads.saveDataUrl(p.dataUrl); // ném lỗi nếu ảnh không hợp lệ
    return { id: db.nextId('ph'), file, caption };
  }
  return {
    id: db.nextId('ph'),
    emoji: String(p.emoji || '').trim() || '📷',
    g: GRADIENTS[index % GRADIENTS.length],
    caption,
  };
}

// Xóa tệp ảnh khỏi đĩa (ảnh emoji thì không có tệp nào để xóa).
function removeFiles(photos) {
  for (const p of photos || []) {
    if (p && p.file) uploads.remove(p.file);
  }
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
      canEdit: req.user.role === 'teacher' && req.user.classId === album.classId,
    });
  });

  // Trả về tệp ảnh. Đi qua đây thay vì để lộ thư mục ảnh ra ngoài, để mỗi lượt
  // xem đều được kiểm tra người dùng có thuộc lớp của album hay không.
  app.get('/api/albums/:id/photo/:photoId', (req, res) => {
    const album = db.get().albums.find(a => a.id === req.params.id);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!myClassIds(req.user).includes(album.classId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    const photo = album.photos.find(p => p.id === req.params.photoId);
    if (!photo || !photo.file) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    const filePath = uploads.pathOf(photo.file);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tệp ảnh không còn trên máy chủ' });
    }

    // Ảnh không bao giờ đổi nội dung nên cho trình duyệt giữ lại lâu; đặt private
    // để proxy dùng chung không lưu ảnh của lớp.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', uploads.mimeOf(photo.file));
    res.sendFile(filePath);
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
    if (photos.length > MAX_PHOTOS_PER_ALBUM) {
      return res.status(400).json({ error: `Mỗi album tối đa ${MAX_PHOTOS_PER_ALBUM} ảnh` });
    }
    if (!req.user.classId) {
      return res.status(400).json({ error: 'Tài khoản chưa gắn với lớp chủ nhiệm' });
    }

    let built;
    try {
      built = photos.map(buildPhoto);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const rec = {
      id: db.nextId('al'),
      classId: req.user.classId,
      title: String(title).trim(),
      date: todayStr(),
      description: String(description || '').trim(),
      createdBy: req.user.id,
      photos: built,
    };
    db.get().albums.push(rec);
    db.save();
    res.status(201).json(rec);
  });

  // Thêm ảnh vào album đã có.
  app.post('/api/albums/:id/photos', requireRole('teacher'), (req, res) => {
    const album = db.get().albums.find(a => a.id === req.params.id);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (album.classId !== req.user.classId) {
      return res.status(403).json({ error: 'Chỉ giáo viên chủ nhiệm lớp mới thêm được ảnh' });
    }
    const { photos } = req.body || {};
    if (!Array.isArray(photos) || !photos.length) {
      return res.status(400).json({ error: 'Chưa chọn ảnh nào' });
    }
    if (album.photos.length + photos.length > MAX_PHOTOS_PER_ALBUM) {
      return res.status(400).json({ error: `Mỗi album tối đa ${MAX_PHOTOS_PER_ALBUM} ảnh` });
    }

    let built;
    try {
      built = photos.map((p, i) => buildPhoto(p, album.photos.length + i));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    album.photos.push(...built);
    db.save();
    res.status(201).json({ added: built.length, photos: built });
  });

  // Xóa một ảnh khỏi album.
  app.delete('/api/albums/:id/photos/:photoId', requireRole('teacher'), (req, res) => {
    const album = db.get().albums.find(a => a.id === req.params.id);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (album.classId !== req.user.classId) {
      return res.status(403).json({ error: 'Chỉ giáo viên chủ nhiệm lớp mới xóa được ảnh' });
    }
    const idx = album.photos.findIndex(p => p.id === req.params.photoId);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    const [removed] = album.photos.splice(idx, 1);
    removeFiles([removed]);
    db.save();
    res.json({ ok: true, remaining: album.photos.length });
  });

  // Xóa cả album kèm toàn bộ ảnh của nó.
  app.delete('/api/albums/:id', requireRole('teacher'), (req, res) => {
    const albums = db.get().albums;
    const idx = albums.findIndex(a => a.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (albums[idx].classId !== req.user.classId) {
      return res.status(403).json({ error: 'Chỉ giáo viên chủ nhiệm lớp mới xóa được album' });
    }
    const [removed] = albums.splice(idx, 1);
    removeFiles(removed.photos);
    db.save();
    res.json({ ok: true });
  });
};
