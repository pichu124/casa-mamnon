// Phân hệ Nhắn tin: kênh trao đổi trực tiếp giáo viên ↔ phụ huynh và nhóm lớp.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const GROUP_AVATAR = { emoji: '👥', bg: '#5b6ceb' };

// Tên hiển thị kèm danh xưng, ví dụ "Cô Nguyễn Thị Mai Anh".
function displayName(u) {
  return u ? `${u.title} ${u.name}` : '';
}

function memberIds(conversationId) {
  return db.all('conversation_members',
    'SELECT userId FROM conversation_members WHERE conversationId = ?', [conversationId])
    .map(r => r.userId);
}

// Tìm hội thoại riêng giữa đúng hai người (nếu đã có).
function directConvId(a, b) {
  const row = db.first('conversations',
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversationId = c.id AND m1.userId = ?
     JOIN conversation_members m2 ON m2.conversationId = c.id AND m2.userId = ?
     WHERE c.type = 'direct'
       AND (SELECT COUNT(*) FROM conversation_members m WHERE m.conversationId = c.id) = 2
     LIMIT 1`, [a, b]);
  return row ? row.id : null;
}

// Danh sách người có thể bắt đầu trò chuyện mới.
// Phụ huynh: GVCN các lớp của con mình. Giáo viên: phụ huynh học sinh lớp mình.
function contactsFor(user) {
  const out = [];
  const seen = new Set();
  if (user.role === 'parent') {
    for (const s of db.studentsOf(user)) {
      const cls = s.classId ? db.findClass(s.classId) : null;
      const teacher = cls && cls.teacherId ? db.findUser(cls.teacherId) : null;
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
function convMeta(cv, user, members) {
  const ids = members || memberIds(cv.id);
  if (cv.type === 'group') {
    return { title: cv.name, subtitle: `${ids.length} thành viên`, avatar: GROUP_AVATAR };
  }
  const other = db.findUser(ids.find(id => id !== user.id));
  if (!other) return { title: 'Người dùng', subtitle: '', avatar: null };
  let subtitle = '';
  if (other.role === 'teacher') {
    const cls = other.classId ? db.findClass(other.classId) : null;
    subtitle = `Giáo viên chủ nhiệm ${cls ? cls.name : ''}`;
  } else if (other.role === 'parent') {
    // Với giáo viên, chỉ nêu tên con đang học lớp mình.
    const child = db.first('students',
      user.role === 'teacher'
        ? `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.classId = ? AND s.active = 1 LIMIT 1`
        : `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.active = 1 LIMIT 1`,
      user.role === 'teacher' ? [other.id, user.classId] : [other.id]);
    subtitle = child ? `Phụ huynh em ${child.name}` : 'Phụ huynh';
  }
  return { title: displayName(other), subtitle, avatar: other.avatar };
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
  const cv = db.first('conversations', 'SELECT * FROM conversations WHERE id = ?', [req.params.id]);
  if (!cv) { res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' }); return null; }
  const isMember = db.count(
    'SELECT COUNT(*) FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [cv.id, req.user.id]);
  if (!isMember) {
    res.status(403).json({ error: 'Bạn không tham gia cuộc trò chuyện này' });
    return null;
  }
  return cv;
}

function markRead(conversationId, userId) {
  db.run('UPDATE conversation_members SET lastRead = ? WHERE conversationId = ? AND userId = ?',
    [new Date().toISOString(), conversationId, userId]);
}

module.exports = (app) => {
  const allow = requireRole('teacher', 'parent', 'admin');

  // Danh sách hội thoại của tôi + liên hệ có thể chat mới.
  app.get('/api/messages', allow, (req, res) => {
    const user = req.user;
    // Lấy hội thoại kèm tin cuối và số tin chưa đọc trong một truy vấn, thay vì
    // nạp toàn bộ tin nhắn lên rồi đếm trong bộ nhớ.
    const rows = db.all('conversations',
      `SELECT c.*, cm.lastRead AS myLastRead,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversationId = c.id AND m.senderId != ?
                   AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)) AS unreadCount
       FROM conversations c
       JOIN conversation_members cm ON cm.conversationId = c.id AND cm.userId = ?
       ORDER BY (SELECT MAX(createdAt) FROM messages m WHERE m.conversationId = c.id) DESC`,
      [user.id, user.id]);

    const conversations = rows.map(cv => {
      const last = db.first('messages',
        'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC, rowid DESC LIMIT 1', [cv.id]);
      return {
        id: cv.id,
        type: cv.type,
        ...convMeta(cv, user),
        lastMessage: last
          ? { text: last.text, senderName: displayName(db.findUser(last.senderId)), createdAt: last.createdAt }
          : null,
        unreadCount: Number(cv.unreadCount) || 0,
      };
    });
    res.json({ conversations, contacts: contactsFor(user) });
  });

  // Bắt đầu trò chuyện riêng mới.
  // Đăng ký TRƯỚC /api/messages/:id để đường dẫn "start" không bị hiểu thành mã hội thoại.
  app.post('/api/messages/start', allow, (req, res) => {
    const { userId } = req.body || {};
    const contact = contactsFor(req.user).find(c => c.userId === userId);
    if (!contact) return res.status(403).json({ error: 'Bạn không thể trò chuyện với người này' });
    if (contact.existingConversationId) return res.json({ id: contact.existingConversationId });

    const id = db.nextId('cv');
    db.tx(() => {
      db.insert('conversations', { id, type: 'direct', name: null, classId: null });
      db.insert('conversation_members', { conversationId: id, userId: req.user.id, lastRead: null });
      db.insert('conversation_members', { conversationId: id, userId, lastRead: null });
    });
    res.json({ id });
  });

  // Chi tiết hội thoại: toàn bộ tin nhắn + đánh dấu đã đọc.
  app.get('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const messages = db.all('messages',
      'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt, rowid', [cv.id]);
    markRead(cv.id, req.user.id);
    res.json({
      id: cv.id,
      type: cv.type,
      ...convMeta(cv, req.user),
      messages: messages.map(m => messageDto(m, req.user)),
    });
  });

  // Lấy tin mới hơn mốc ?after=<ISO> (dùng cho việc tự cập nhật phòng chat).
  app.get('/api/messages/:id/poll', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const after = req.query.after ? String(req.query.after) : '';
    const fresh = db.all('messages',
      'SELECT * FROM messages WHERE conversationId = ? AND createdAt > ? ORDER BY createdAt, rowid',
      [cv.id, after]);
    if (fresh.length) markRead(cv.id, req.user.id);
    res.json({ messages: fresh.map(m => messageDto(m, req.user)) });
  });

  // Gửi tin nhắn vào hội thoại.
  app.post('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const text = String((req.body || {}).text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });

    const msg = {
      id: db.nextId('ms'),
      conversationId: cv.id,
      senderId: req.user.id,
      text,
      createdAt: new Date().toISOString(),
    };
    db.tx(() => {
      db.insert('messages', msg);
      markRead(cv.id, req.user.id);
    });
    res.json(messageDto(msg, req.user));
  });
};
