// Phân hệ Nhắn tin: kênh trao đổi trực tiếp giáo viên ↔ phụ huynh và nhóm lớp.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const GROUP_AVATAR = { emoji: '👥', bg: '#5b6ceb' };

// Tên hiển thị kèm danh xưng, ví dụ "Cô Nguyễn Thị Mai Anh".
function displayName(u) {
  return u ? `${u.title} ${u.name}` : '';
}

// Tìm hội thoại direct đúng 2 người (nếu đã có).
function directConvId(a, b) {
  const cv = db.get().conversations.find(c =>
    c.type === 'direct' && c.participantIds.length === 2 &&
    c.participantIds.includes(a) && c.participantIds.includes(b));
  return cv ? cv.id : null;
}

// Danh sách người có thể bắt đầu trò chuyện mới.
// Phụ huynh: GVCN các lớp của con mình. Giáo viên: phụ huynh học sinh lớp mình.
function contactsFor(user) {
  const out = [];
  const seen = new Set();
  if (user.role === 'parent') {
    for (const s of db.studentsOf(user)) {
      const cls = db.findClass(s.classId);
      const teacher = cls ? db.findUser(cls.teacherId) : null;
      if (!teacher || seen.has(teacher.id)) continue;
      seen.add(teacher.id);
      out.push({
        userId: teacher.id,
        name: displayName(teacher),
        subtitle: `Giáo viên chủ nhiệm ${cls.name}`,
        avatar: teacher.avatar,
        existingConversationId: directConvId(user.id, teacher.id),
      });
    }
  } else if (user.role === 'teacher') {
    for (const s of db.studentsOf(user)) {
      for (const pid of s.parentIds) {
        const parent = db.findUser(pid);
        if (!parent || seen.has(parent.id)) continue;
        seen.add(parent.id);
        out.push({
          userId: parent.id,
          name: displayName(parent),
          subtitle: `PH em ${s.name}`,
          avatar: parent.avatar,
          existingConversationId: directConvId(user.id, parent.id),
        });
      }
    }
  }
  return out;
}

// Tiêu đề / phụ đề / ảnh đại diện của hội thoại theo góc nhìn của user.
function convMeta(cv, user) {
  if (cv.type === 'group') {
    return { title: cv.name, subtitle: `${cv.participantIds.length} thành viên`, avatar: GROUP_AVATAR };
  }
  const other = db.findUser(cv.participantIds.find(id => id !== user.id));
  if (!other) return { title: 'Người dùng', subtitle: '', avatar: null };
  let subtitle = '';
  if (other.role === 'teacher') {
    const cls = db.findClass(other.classId);
    subtitle = `Giáo viên chủ nhiệm ${cls ? cls.name : ''}`;
  } else if (other.role === 'parent') {
    const child = db.get().students.find(s =>
      s.parentIds.includes(other.id) && (user.role !== 'teacher' || s.classId === user.classId));
    subtitle = child ? `Phụ huynh em ${child.name}` : 'Phụ huynh';
  }
  return { title: displayName(other), subtitle, avatar: other.avatar };
}

// Mốc đã đọc của user trong hội thoại (thiếu = 0 → mọi tin đều chưa đọc).
function lastReadOf(cv, userId) {
  const iso = cv.lastRead && cv.lastRead[userId];
  return iso ? new Date(iso).getTime() : 0;
}

// Tin nhắn trả về cho client (không kèm thông tin nhạy cảm của người gửi).
function messageDto(m, user) {
  const sender = db.findUser(m.senderId);
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: displayName(sender),
    senderAvatar: sender ? sender.avatar : null,
    text: m.text,
    createdAt: m.createdAt,
    mine: m.senderId === user.id,
  };
}

// Tìm hội thoại + kiểm tra quyền tham gia. Tự trả lỗi 404/403 nếu không hợp lệ.
function findConv(req, res) {
  const cv = db.get().conversations.find(c => c.id === req.params.id);
  if (!cv) { res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' }); return null; }
  if (!cv.participantIds.includes(req.user.id)) {
    res.status(403).json({ error: 'Bạn không tham gia cuộc trò chuyện này' });
    return null;
  }
  if (!cv.lastRead) cv.lastRead = {};
  return cv;
}

module.exports = (app) => {
  const allow = requireRole('teacher', 'parent');

  // Danh sách hội thoại của tôi + liên hệ có thể chat mới.
  app.get('/api/messages', allow, (req, res) => {
    const user = req.user;
    const conversations = db.get().conversations
      .filter(cv => cv.participantIds.includes(user.id))
      .map(cv => {
        const last = cv.messages.length ? cv.messages[cv.messages.length - 1] : null;
        const lastRead = lastReadOf(cv, user.id);
        return {
          id: cv.id,
          type: cv.type,
          ...convMeta(cv, user),
          lastMessage: last
            ? { text: last.text, senderName: displayName(db.findUser(last.senderId)), createdAt: last.createdAt }
            : null,
          unreadCount: cv.messages.filter(m =>
            m.senderId !== user.id && new Date(m.createdAt).getTime() > lastRead).length,
        };
      })
      .sort((a, b) => {
        const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tb - ta;
      });
    res.json({ conversations, contacts: contactsFor(user) });
  });

  // Bắt đầu trò chuyện direct mới (đăng ký TRƯỚC /api/messages/:id để không bị nuốt param).
  app.post('/api/messages/start', allow, (req, res) => {
    const { userId } = req.body || {};
    const contact = contactsFor(req.user).find(c => c.userId === userId);
    if (!contact) return res.status(403).json({ error: 'Bạn không thể trò chuyện với người này' });
    if (contact.existingConversationId) return res.json({ id: contact.existingConversationId });
    const cv = {
      id: db.nextId('cv'),
      type: 'direct',
      participantIds: [req.user.id, userId],
      messages: [],
      lastRead: {},
    };
    db.get().conversations.push(cv);
    db.save();
    res.json({ id: cv.id });
  });

  // Chi tiết hội thoại: toàn bộ tin nhắn + đánh dấu đã đọc.
  app.get('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    cv.lastRead[req.user.id] = new Date().toISOString();
    db.save();
    res.json({
      id: cv.id,
      type: cv.type,
      ...convMeta(cv, req.user),
      messages: cv.messages.map(m => messageDto(m, req.user)),
    });
  });

  // Lấy tin mới hơn mốc ?after=<ISO> (dùng cho polling).
  app.get('/api/messages/:id/poll', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    let after = req.query.after ? new Date(String(req.query.after)).getTime() : 0;
    if (Number.isNaN(after)) after = 0;
    const fresh = cv.messages.filter(m => new Date(m.createdAt).getTime() > after);
    if (fresh.length) {
      cv.lastRead[req.user.id] = new Date().toISOString();
      db.save();
    }
    res.json({ messages: fresh.map(m => messageDto(m, req.user)) });
  });

  // Gửi tin nhắn vào hội thoại.
  app.post('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const text = String((req.body || {}).text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
    const now = new Date().toISOString();
    const msg = { id: db.nextId('ms'), senderId: req.user.id, text, createdAt: now };
    cv.messages.push(msg);
    cv.lastRead[req.user.id] = now;
    db.save();
    res.json(messageDto(msg, req.user));
  });
};
