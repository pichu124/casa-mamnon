// Phân hệ Nhắn tin: kênh trao đổi trực tiếp giáo viên ↔ phụ huynh và nhóm lớp.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');

const GROUP_AVATAR = { emoji: '👥', bg: '#5b6ceb' };

// MỞ MỘT PHÒNG CHAT KHÔNG ĐƯỢC KÉO VỀ CẢ NĂM HỌC.
//
// `GET /api/messages/:id` trước đây trả về MỌI tin nhắn của hội thoại, không
// giới hạn. Nhóm lớp mầm non là một hội thoại chung của cô và 20 gia đình, và
// đây là phân hệ nhắn tin hằng ngày — vài chục tin một ngày là bình thường,
// nên sau một năm học hội thoại đó có hàng nghìn tin.
//
// Ba chỗ cùng gánh: máy chủ dựng chừng ấy đối tượng trong bộ nhớ, đường truyền
// chở chừng ấy chữ, và điện thoại của cô dựng chừng ấy bong bóng chat trước khi
// vẽ được khung hình đầu tiên. Máy trường đang dùng là máy Android rẻ tiền; đây
// đúng là kiểu chậm mà người dùng đọc ra là "app hỏng".
//
// Nên mở phòng thì lấy CỬA SỔ TIN MỚI NHẤT, và mở thêm một đường lấy tin cũ
// hơn để không ai mất lịch sử. Con số đủ rộng để phần lớn hội thoại vẫn về đủ
// trong một lần.
const CUA_SO_TIN = 200;

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
//
// Phụ huynh: TẤT CẢ các cô phụ trách nhóm của con mình — nhóm mầm non có 2–3 cô
// cùng phụ trách, chỉ hiện một cô thì gia đình không nhắn được cho cô đang trực
// hôm đó. Giáo viên: phụ huynh của trẻ trong nhóm mình.
function contactsFor(user) {
  const out = [];
  const seen = new Set();
  if (user.role === 'parent') {
    for (const s of db.studentsOf(user)) {
      const cls = s.classId ? db.findClass(s.classId) : null;
      if (!cls) continue;
      for (const teacher of db.teachersOfClass(cls.id)) {
        if (seen.has(teacher.id)) continue;
        seen.add(teacher.id);
        out.push({
          userId: teacher.id,
          name: displayName(teacher),
          subtitle: `${teacher.vaiTro === 'chinh' ? 'Cô phụ trách chính' : 'Cô phụ trách'} ${cls.name}`,
          avatar: teacher.avatar,
          existingConversationId: directConvId(user.id, teacher.id),
        });
      }
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
          subtitle: `Phụ huynh bé ${s.name}`,
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
    subtitle = `Cô phụ trách ${nl.tenCacNhomCuaCo(other.id)}`.trim();
  } else if (other.role === 'parent') {
    // Với cô, chỉ nêu tên con đang học nhóm của cô — nhóm nào trong số các nhóm
    // cô phụ trách cũng được, nên lọc bằng IN chứ không bằng một mã nhóm.
    const nhom = user.role === 'teacher' ? db.classIdsOfTeacher(user.id) : [];
    const marks = nhom.map(() => '?').join(',');
    const child = (user.role === 'teacher' && !nhom.length) ? null : db.first('students',
      user.role === 'teacher'
        ? `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.classId IN (${marks}) AND s.active = 1 LIMIT 1`
        : `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.active = 1 LIMIT 1`,
      user.role === 'teacher' ? [other.id, ...nhom] : [other.id]);
    subtitle = child ? `Phụ huynh bé ${child.name}` : 'Phụ huynh';
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

    // TIN CUỐI CỦA MỌI HỘI THOẠI TRONG MỘT TRUY VẤN.
    //
    // Bản trước hỏi riêng từng hội thoại. Cô mầm non nhắn với 20 gia đình cộng
    // các nhóm chung, nên chỉ riêng màn danh sách đã là hơn hai chục lượt hỏi
    // cơ sở dữ liệu — mỗi lần cô mở màn Nhắn tin, và cô mở nó nhiều lần một
    // ngày. Câu ngay bên trên đã cố ý gộp phần đếm tin chưa đọc vào một truy
    // vấn với đúng lý do đó; phần tin cuối thì bị bỏ sót.
    const maHT = rows.map(r => r.id);
    const tinCuoi = new Map();
    if (maHT.length) {
      for (const m of db.all('messages',
        `SELECT * FROM (
           SELECT m.*, ROW_NUMBER() OVER (
                    PARTITION BY m.conversationId ORDER BY m.createdAt DESC, m.rowid DESC) AS hang
             FROM messages m WHERE m.conversationId IN (${maHT.map(() => '?').join(',')})
         ) WHERE hang = 1`, maHT)) {
        tinCuoi.set(m.conversationId, m);
      }
    }

    const conversations = rows.map(cv => {
      const last = tinCuoi.get(cv.id) || null;
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

  // Chi tiết hội thoại: cửa sổ tin mới nhất + đánh dấu đã đọc.
  //
  // `?truoc=<ISO>` lấy cửa sổ tin CŨ HƠN mốc đó — đường mà nút "Xem tin cũ hơn"
  // của màn hình gọi. Không có tham số thì lấy cửa sổ mới nhất, đúng hành vi cũ
  // với mọi hội thoại ngắn hơn CUA_SO_TIN (tức gần như toàn bộ hôm nay).
  app.get('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const truoc = req.query.truoc ? String(req.query.truoc) : '';
    // Lấy NGƯỢC từ mới về cũ rồi lật lại: `LIMIT` phải cắt ở đầu MỚI, không
    // phải đầu cũ. Lấy xuôi rồi cắt là mở phòng ra thấy tin của tháng Chín.
    const nguoc = db.all('messages',
      `SELECT * FROM messages WHERE conversationId = ?${truoc ? ' AND createdAt < ?' : ''}
       ORDER BY createdAt DESC, rowid DESC LIMIT ?`,
      truoc ? [cv.id, truoc, CUA_SO_TIN + 1] : [cv.id, CUA_SO_TIN + 1]);
    // Lấy dư một tin để biết PHÍA TRƯỚC CÒN NỮA KHÔNG mà không phải đếm cả bảng.
    const conCu = nguoc.length > CUA_SO_TIN;
    const messages = nguoc.slice(0, CUA_SO_TIN).reverse();
    // Chỉ đánh dấu đã đọc khi người dùng đang ở cửa sổ MỚI NHẤT. Cuộn ngược lên
    // đọc tin tháng trước mà bị coi là đã đọc hết là mất dấu tin chưa xem.
    if (!truoc) markRead(cv.id, req.user.id);
    res.json({
      id: cv.id,
      type: cv.type,
      ...convMeta(cv, req.user),
      messages: messages.map(m => messageDto(m, req.user)),
      // Màn hình dùng hai trường này để hiện nút "Xem tin cũ hơn". Thiếu chúng
      // thì cắt bớt tin biến thành GIẤU tin — người dùng không có đường nào
      // biết là còn, và đó mới là mất dữ liệu theo cách nhìn của họ.
      conCu,
      tuLuc: messages.length ? messages[0].createdAt : '',
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
