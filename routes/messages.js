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

// DANH SÁCH HỘI THOẠI CŨNG PHẢI CÓ TRẦN.
//
// Hội thoại riêng cô ↔ gia đình chỉ SINH RA chứ không bao giờ đóng: mỗi năm
// học trường nhận một lứa mới là thêm 20–25 hội thoại nằm lại vĩnh viễn, và
// app không có đường nào xoá chúng. Sau vài năm, mở màn Nhắn tin là kéo cả sổ
// liên lạc của mọi lứa cũ về điện thoại chỉ để nhắn cho nhóm năm nay.
//
// 40 đủ rộng để KHÔNG ai ở trường hôm nay nhìn thấy nút "xem cũ hơn": cô đông
// việc nhất cũng chỉ chừng 25 hội thoại. Nút chỉ hiện khi trường thật sự vượt
// qua con số đó — tức đúng lúc cần.
const MOI_TRANG = 40;
const TRANG_TOI_DA = 200;

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
// MỌI HỘI THOẠI RIÊNG CỦA TÔI TRONG MỘT CÂU, tra theo "người kia".
//
// `directConvId` ở trên đúng nhưng đắt: nó hỏi MỘT câu cho MỖI liên hệ, mà cô
// mầm non có 30–40 liên hệ (mỗi bé 1–2 gia đình) — chỉ để trả lời đúng một câu
// hỏi: "đã có phòng chat với người này chưa".
//
// Cùng đúng điều kiện với `directConvId`: hội thoại loại 'direct', có ĐÚNG hai
// thành viên, và tôi là một trong hai. `ORDER BY c.id` để nếu lỡ có hai phòng
// trùng nhau thì lần nào cũng chọn cùng một phòng — `LIMIT 1` của bản cũ không
// kèm thứ tự nên chọn phòng nào là tuỳ cơ sở dữ liệu.
function hoiThoaiRiengCua(userId) {
  const ra = new Map();
  for (const r of db.all('conversations',
    `SELECT m2.userId AS nguoiKia, c.id AS maHT
       FROM conversations c
       JOIN conversation_members m1 ON m1.conversationId = c.id AND m1.userId = ?
       JOIN conversation_members m2 ON m2.conversationId = c.id AND m2.userId <> ?
      WHERE c.type = 'direct'
        AND (SELECT COUNT(*) FROM conversation_members m WHERE m.conversationId = c.id) = 2
      ORDER BY c.id`, [userId, userId])) {
    if (!ra.has(r.nguoiKia)) ra.set(r.nguoiKia, r.maHT);
  }
  return ra;
}

function contactsFor(user) {
  const out = [];
  const seen = new Set();
  // Một câu, thay cho một câu mỗi liên hệ.
  const daCoPhong = hoiThoaiRiengCua(user.id);
  if (user.role === 'parent') {
    // Một nhà có 1–3 con, nên chỉ cần nhớ lại theo mã nhóm là hết trùng.
    const dsBe = db.studentsOf(user);
    const nhoNhom = new Map();
    for (const s of dsBe) {
      if (!s.classId || nhoNhom.has(s.classId)) continue;
      nhoNhom.set(s.classId, { cls: db.findClass(s.classId), co: db.teachersOfClass(s.classId) });
    }
    for (const s of dsBe) {
      const nhom = s.classId ? nhoNhom.get(s.classId) : null;
      const cls = nhom ? nhom.cls : null;
      if (!cls) continue;
      for (const teacher of nhom.co) {
        if (seen.has(teacher.id)) continue;
        seen.add(teacher.id);
        out.push({
          userId: teacher.id,
          name: displayName(teacher),
          subtitle: `${teacher.vaiTro === 'chinh' ? 'Cô phụ trách chính' : 'Cô phụ trách'} ${cls.name}`,
          avatar: teacher.avatar,
          existingConversationId: daCoPhong.get(teacher.id) || null,
        });
      }
    }
  } else if (user.role === 'teacher') {
    const dsBe = db.studentsOf(user);
    // Tên các gia đình: MỘT câu cho cả nhóm, thay vì một câu cho mỗi gia đình.
    const maPh = [...new Set(dsBe.flatMap(s => s.parentIds || []).filter(Boolean))];
    const nguoi = new Map();
    if (maPh.length) {
      for (const u of db.all('users',
        `SELECT * FROM users WHERE id IN (${maPh.map(() => '?').join(',')})`, maPh)) {
        // Bỏ băm mật khẩu ngay tại chỗ tra, đúng nếp `db.teachersOfClass`:
        // bảng này sinh ra để đổ lên màn hình, đừng bắt chỗ gọi phải nhớ gỡ.
        const { passwordHash: _bo, ...sach } = u;
        nguoi.set(u.id, sach);
      }
    }
    for (const s of dsBe) {
      for (const pid of s.parentIds) {
        const parent = nguoi.get(pid);
        if (!parent || seen.has(parent.id)) continue;
        seen.add(parent.id);
        out.push({
          userId: parent.id,
          name: displayName(parent),
          subtitle: `Phụ huynh bé ${s.name}`,
          avatar: parent.avatar,
          existingConversationId: daCoPhong.get(parent.id) || null,
        });
      }
    }
  }
  return out;
}

// Tiêu đề / phụ đề / ảnh đại diện của hội thoại theo góc nhìn của user.
// Tham số `tra` là BẢNG TRA dựng sẵn cho một lượt hỏi danh sách:
// { thanhVien, nguoi, tenNhom, tenCon }. KHÔNG truyền thì hàm hỏi lẻ y hệt như
// cũ — đường mở MỘT phòng chat (`GET /api/messages/:id`) vẫn đi lối cũ, không
// phải sửa một chữ nào và không đổi hành vi.
function convMeta(cv, user, members, tra) {
  const ids = members || (tra && tra.thanhVien.get(cv.id)) || memberIds(cv.id);
  if (cv.type === 'group') {
    return { title: cv.name, subtitle: `${ids.length} thành viên`, avatar: GROUP_AVATAR };
  }
  const maKia = ids.find(id => id !== user.id);
  const other = (tra && tra.nguoi.has(maKia)) ? tra.nguoi.get(maKia) : db.findUser(maKia);
  if (!other) return { title: 'Người dùng', subtitle: '', avatar: null };
  let subtitle = '';
  if (other.role === 'teacher') {
    const tenNhom = (tra && tra.tenNhom.has(other.id))
      ? tra.tenNhom.get(other.id) : nl.tenCacNhomCuaCo(other.id);
    subtitle = `Cô phụ trách ${tenNhom}`.trim();
  } else if (tra && other.role === 'parent' && tra.tenCon.has(other.id)) {
    // Đã tra sẵn cho cả danh sách. Chuỗi rỗng nghĩa là "không tìm thấy bé",
    // đúng nhánh `child ? ... : 'Phụ huynh'` của lối hỏi lẻ ngay bên dưới.
    const ten = tra.tenCon.get(other.id);
    subtitle = ten ? `Phụ huynh bé ${ten}` : 'Phụ huynh';
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

  // LỚP PHÒNG THỦ THỨ HAI CHO PHÒNG CHUNG CỦA NHÓM.
  //
  // `conversation_members` được ghi MỘT LẦN lúc lập phòng và KHÔNG BAO GIỜ
  // được đồng bộ lại. Gỡ một cô khỏi nhóm đóng được mọi đường khác — hồ sơ bé,
  // điểm danh, album, nhật ký — vì tất cả đều hỏi `classIdsOf`/`canAccessClass`.
  // Riêng phòng chung của nhóm thì vẫn mở, vì chỗ này chỉ hỏi bảng thành viên.
  // Cô đã chuyển cơ sở vẫn đọc được mọi trao đổi hằng ngày giữa cô mới và các
  // gia đình, kể cả tin gửi SAU khi cô đã rời nhóm, và vẫn nhắn vào đó được.
  //
  // Nên với phòng gắn nhóm lớp, hỏi thêm câu hỏi THẬT: người này CÒN thuộc
  // nhóm đó không. Phòng riêng (`type='direct'`, không có classId) không đổi gì
  // — trao đổi riêng giữa hai người vốn không đi theo phân công.
  //
  // Đây là LỚP PHÒNG THỦ, không phải bản vá gốc: gốc là bảng thành viên không
  // được đồng bộ theo `class_teachers`, và mặt còn lại của nó — cô MỚI không tự
  // vào được phòng chung — vẫn còn đó, cần một đợt riêng.
  if (cv.type === 'group' && cv.classId && !db.canAccessClass(req.user, cv.classId)) {
    // QUẢN TRỊ vẫn mở được phòng chung của nhóm ĐÃ ĐÓNG, trong phạm vi cơ sở
    // mình — cùng luật với album năm cũ (laNguoiGiuLopCu bên routes/albums.js).
    // `canAccessClass` chỉ nhìn nhóm ĐANG MỞ, nên sau mỗi lần chuyển năm, lịch
    // sử trao đổi của mọi nhóm năm cũ khoá với cả ban giám hiệu — đúng người
    // phải tra lại được khi có khiếu nại. Cô và gia đình giữ nguyên như cũ:
    // lớp chặn này sinh ra để cô đã rời nhóm không đọc tiếp phòng chung.
    const lop = db.findClass(cv.classId);
    const pham = req.user.role === 'admin' ? db.phamViCoSo(req.user) : undefined;
    const laQuanTriGiuLopCu = req.user.role === 'admin' && lop && !lop.active
      && (pham === null || db.campusOfClass(cv.classId) === pham);
    if (!laQuanTriGiuLopCu) {
      res.status(403).json({
        error: 'Bạn không còn trong nhóm này nên không mở được phòng chung của nhóm',
      });
      return null;
    }
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

    // CẮT CỬA SỔ NGAY TRONG CÂU TRUY VẤN.
    //
    // Cắt được THẲNG bằng LIMIT vì quyền tham gia nằm ngay trong phép nối
    // `conversation_members` bên dưới: khác màn Album, ở đây KHÔNG có bộ lọc
    // JavaScript nào chạy sau câu truy vấn, nên số dòng trả về đúng bằng số
    // dòng người này xem được — và màn hình suy ra "còn nữa hay hết" chỉ bằng
    // cách ĐẾM. Cùng một nếp với /api/notifications và /api/albums (Đ98b).
    //
    // Hình dạng câu trả lời KHÔNG đổi, vẫn `{ conversations, contacts }`:
    // điện thoại đang giữ bản app cũ trong bộ nhớ đệm không gửi `bo`/`soLuong`
    // nên vẫn nhận trang đầu và chạy y như trước.
    //
    // HUY HIỆU TIN CHƯA ĐỌC KHÔNG BỊ ẢNH HƯỞNG: `/api/dashboard/badges` đếm
    // thẳng trên bảng `messages`, không đếm trên danh sách này; và hội thoại
    // vừa có tin mới luôn nổi lên đầu nhờ `ORDER BY`, nên không có chuyện tin
    // chưa đọc rơi khỏi trang một rồi mất dấu.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || MOI_TRANG)));

    // Lấy hội thoại kèm số tin chưa đọc trong một truy vấn, thay vì nạp toàn
    // bộ tin nhắn lên rồi đếm trong bộ nhớ.
    //
    // `c.id DESC` là TIÊU CHÍ PHỤ, thêm cùng lúc với LIMIT và bắt buộc phải
    // có: hai hội thoại cùng mốc tin cuối — hoặc cùng CHƯA có tin nào, lúc đó
    // mốc là NULL — thì thứ tự giữa chúng trước nay là tuỳ cơ sở dữ liệu.
    // Không sao khi trả về một mảng duy nhất; nhưng khi cắt thành trang, thứ
    // tự lung lay nghĩa là có hội thoại lặp lại ở trang sau và có hội thoại
    // không bao giờ hiện ra.
    // LUẬT PHÒNG CHUNG NẰM TRONG WHERE, TRƯỚC KHI CẮT TRANG.
    //
    // Luật "cô đã rời nhóm thì không thấy phòng chung của nhóm" (xem findConv)
    // từng đứng SAU câu truy vấn, dưới dạng một bộ lọc JavaScript — tức là
    // đứng SAU cả LIMIT. Trang bị cắt rồi mới lọc thì con số trả về không còn
    // bằng con số người này xem được: màn hình đếm thiếu, tưởng "hết rồi"
    // trong khi trang sau vẫn còn hội thoại. Đưa đúng điều kiện đó vào WHERE
    // thì lời cam kết ở chú thích trên ("không có bộ lọc nào chạy sau câu
    // truy vấn") lại đúng như ngày nó được viết.
    const nhomMoDuoc = db.classIdsOf(user);
    const dauNhom = nhomMoDuoc.map(() => '?').join(',');
    const dieuKienPhongNhom = `(c.type != 'group' OR c.classId IS NULL OR c.classId = ''`
      + (nhomMoDuoc.length ? ` OR c.classId IN (${dauNhom})` : '') + ')';
    const rows = db.all('conversations',
      `SELECT c.*, cm.lastRead AS myLastRead,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversationId = c.id AND m.senderId != ?
                   AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)) AS unreadCount
       FROM conversations c
       JOIN conversation_members cm ON cm.conversationId = c.id AND cm.userId = ?
       WHERE ${dieuKienPhongNhom}
       ORDER BY (SELECT MAX(createdAt) FROM messages m WHERE m.conversationId = c.id) DESC,
                c.id DESC
       LIMIT ? OFFSET ?`,
      [user.id, user.id, ...nhomMoDuoc, soLuong, bo]);

    // TIN CUỐI CỦA MỌI HỘI THOẠI TRONG MỘT TRUY VẤN.
    //
    // Bản trước hỏi riêng từng hội thoại. Cô mầm non nhắn với 20 gia đình cộng
    // các nhóm chung, nên chỉ riêng màn danh sách đã là hơn hai chục lượt hỏi
    // cơ sở dữ liệu — mỗi lần cô mở màn Nhắn tin, và cô mở nó nhiều lần một
    // ngày. Câu ngay bên trên đã cố ý gộp phần đếm tin chưa đọc vào một truy
    // vấn với đúng lý do đó; phần tin cuối thì bị bỏ sót.
    // Luật của `findConv` (cô đã rời nhóm thì không thấy phòng chung) đã nằm
    // ngay trong WHERE của câu truy vấn trên — trước LIMIT, nên trang không
    // bị đếm hụt. `nhinThay` giữ nguyên tên cho phần dưới đọc không đổi.
    const nhinThay = rows;

    const maHT = nhinThay.map(r => r.id);
    const dauHT = maHT.map(() => '?').join(',');
    const tinCuoi = new Map();
    if (maHT.length) {
      for (const m of db.all('messages',
        `SELECT * FROM (
           SELECT m.*, ROW_NUMBER() OVER (
                    PARTITION BY m.conversationId ORDER BY m.createdAt DESC, m.rowid DESC) AS hang
             FROM messages m WHERE m.conversationId IN (${dauHT})
         ) WHERE hang = 1`, maHT)) {
        tinCuoi.set(m.conversationId, m);
      }
    }

    // BẢNG TRA CHO CẢ MÀN HÌNH — thay cho 4–5 câu truy vấn MỖI hội thoại.
    //
    // `convMeta` phải trả lời bốn câu cho từng dòng: ai trong hội thoại này,
    // người kia là ai, cô ấy phụ trách nhóm nào, gia đình này là gia đình của
    // bé nào. Hỏi lẻ thì đúng nhưng đắt — với một cô có gần ba chục hội thoại
    // là hơn hai trăm câu cho MỘT lượt mở màn Nhắn tin. Cô mở màn này nhiều
    // lần mỗi ngày, và better-sqlite3 chạy ĐỒNG BỘ: từng câu chặn thẳng vòng
    // lặp sự kiện của máy chủ, nên đó không phải cái chậm của riêng cô ấy mà
    // là cái chậm của mọi người đang dùng app cùng lúc.
    const tra = { thanhVien: new Map(), nguoi: new Map(), tenNhom: new Map(), tenCon: new Map() };
    for (const id of maHT) tra.thanhVien.set(id, []);
    if (maHT.length) {
      for (const r of db.all('conversation_members',
        `SELECT conversationId, userId FROM conversation_members
          WHERE conversationId IN (${dauHT})
          ORDER BY conversationId, rowid`, maHT)) {
        tra.thanhVien.get(r.conversationId).push(r.userId);
      }
    }

    // Mọi người cần tên: người kia trong hội thoại riêng, và người gửi tin cuối.
    const maNguoi = new Set();
    for (const cv of nhinThay) {
      if (cv.type !== 'group') {
        for (const id of tra.thanhVien.get(cv.id)) if (id !== user.id) maNguoi.add(id);
      }
      const cuoi = tinCuoi.get(cv.id);
      if (cuoi && cuoi.senderId) maNguoi.add(cuoi.senderId);
    }
    if (maNguoi.size) {
      const dsNguoi = [...maNguoi];
      for (const u of db.all('users',
        `SELECT * FROM users WHERE id IN (${dsNguoi.map(() => '?').join(',')})`, dsNguoi)) {
        const { passwordHash: _bo, ...sach } = u;
        tra.nguoi.set(u.id, sach);
      }
    }

    // Với GIA ĐÌNH, người kia là cô → cần tên các nhóm cô phụ trách. Một nhà
    // chỉ nhắn với vài cô nên nhớ lại theo mã cô là đủ. CỐ Ý không viết lại câu
    // truy vấn đó ở đây: `lib/nhom-lop.js` phải còn là chỗ DUY NHẤT định nghĩa
    // "nhóm của cô", chép sang đây là đẻ ra bản thứ hai rồi hai bản trôi khỏi
    // nhau mà không ai báo.
    for (const u of tra.nguoi.values()) {
      if (u.role === 'teacher' && !tra.tenNhom.has(u.id)) {
        tra.tenNhom.set(u.id, nl.tenCacNhomCuaCo(u.id));
      }
    }

    // Với CÔ, người kia là gia đình → cần tên bé nhà đó đang học nhóm của cô.
    // Bản cũ hỏi `db.classIdsOfTeacher(user.id)` lại từ đầu cho TỪNG dòng dù
    // câu trả lời luôn giống hệt nhau, cộng một câu tra tên bé cho mỗi nhà.
    const maPhuHuynh = [...tra.nguoi.values()].filter(u => u.role === 'parent').map(u => u.id);
    if (maPhuHuynh.length) {
      for (const id of maPhuHuynh) tra.tenCon.set(id, '');
      const dauPh = maPhuHuynh.map(() => '?').join(',');
      const nhomCuaToi = user.role === 'teacher' ? db.classIdsOfTeacher(user.id) : [];
      const dong = (user.role === 'teacher' && !nhomCuaToi.length) ? [] : db.all('students',
        user.role === 'teacher'
          ? `SELECT sp.parentId AS maPh, s.name AS ten FROM students s
               JOIN student_parents sp ON sp.studentId = s.id
              WHERE sp.parentId IN (${dauPh})
                AND s.classId IN (${nhomCuaToi.map(() => '?').join(',')})
                AND s.active = 1
              ORDER BY sp.parentId, s.name`
          : `SELECT sp.parentId AS maPh, s.name AS ten FROM students s
               JOIN student_parents sp ON sp.studentId = s.id
              WHERE sp.parentId IN (${dauPh}) AND s.active = 1
              ORDER BY sp.parentId, s.name`,
        user.role === 'teacher' ? [...maPhuHuynh, ...nhomCuaToi] : maPhuHuynh);
      // Nhà có HAI bé cùng nhóm thì lấy bé đứng đầu theo tên. Câu cũ dùng
      // `LIMIT 1` mà KHÔNG kèm `ORDER BY`, tức bé nào hiện ra là tuỳ cơ sở dữ
      // liệu; nay cố định theo thứ tự chữ cái để hai lượt mở màn không nói hai
      // tên khác nhau. Đây là chỗ DUY NHẤT bản vá này đổi chữ trên màn hình.
      for (const r of dong) if (!tra.tenCon.get(r.maPh)) tra.tenCon.set(r.maPh, r.ten);
    }

    const conversations = nhinThay.map(cv => {
      const last = tinCuoi.get(cv.id) || null;
      return {
        id: cv.id,
        type: cv.type,
        ...convMeta(cv, user, tra.thanhVien.get(cv.id), tra),
        lastMessage: last
          ? { text: last.text, senderName: displayName(tra.nguoi.get(last.senderId)), createdAt: last.createdAt }
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
    // CÙNG MỘT TRẦN VỚI ĐƯỜNG MỞ PHÒNG.
    //
    // Đường này lấy tin mới hơn một mốc do MÀN HÌNH gửi lên, nên nó không có
    // trần tự nhiên nào: tab để mở qua đêm rồi máy thức dậy, hay một màn hình
    // gửi lại mốc cũ, là một lượt hỏi kéo về cả quãng ở giữa. Cùng đúng cái
    // hình dạng vừa vá ở đường mở phòng, chỉ khác là nó ít lộ hơn.
    //
    // Lấy `CUA_SO_TIN` tin cũ nhất SAU mốc đó — cắt ở đầu CŨ chứ không phải đầu
    // mới, vì đây là dòng chảy nối tiếp: bỏ khúc giữa là màn hình thủng một
    // khoảng và không bao giờ lấy lại được. Còn dư thì lượt hỏi sau lấy tiếp.
    const fresh = db.all('messages',
      `SELECT * FROM messages WHERE conversationId = ? AND createdAt > ?
       ORDER BY createdAt, rowid LIMIT ?`,
      [cv.id, after, CUA_SO_TIN]);
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
