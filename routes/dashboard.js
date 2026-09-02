// Số huy hiệu (badge) hiển thị trên lưới icon và thanh điều hướng.
//
// Mỗi con số là một câu đếm riêng trên cơ sở dữ liệu — nhanh hơn nhiều so với
// việc nạp toàn bộ dữ liệu lên rồi lọc trong bộ nhớ.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const st = require('../lib/sua-thu-hoi');
// Luật "ai thấy thông báo nào" nằm ở MỘT chỗ — lib/thong-bao.js — thay cho hai
// bản chép tay từng trôi lệch giữa tệp này và routes/notifications.js.
const tb = require('../lib/thong-bao');

function todayStr() {
  return ngay.homNay();
}

function audienceFilter(user) {
  return tb.audienceFilter(user, 'n.');
}

function unreadNotifications(user) {
  const f = audienceFilter(user);
  // Thông báo ĐÃ THU HỒI phải bị loại khỏi bộ đếm này. Nếu không, phụ huynh sẽ
  // thấy một con số "chưa đọc" không bao giờ về 0: thông báo đã biến khỏi danh
  // sách nên không còn cách nào bấm vào để đánh dấu đã đọc.
  return db.count(
    `SELECT COUNT(*) FROM notifications n
     WHERE ${f.sql}
       AND n.createdBy IS NOT ?
       AND ${st.dieuKienConHien('notifications', 'n.id')}
       AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notificationId = n.id AND r.userId = ?)`,
    [...f.params, user.id, user.id]);
}

function unreadMessages(user) {
  // ĐẾM THEO CÙNG LUẬT VỚI DANH SÁCH HỘI THOẠI (routes/messages.js): phòng
  // chung gắn nhóm mà người này không còn mở được — cô đã rời nhóm, nhóm đã
  // đóng sau chuyển năm — thì không được đếm vào huy hiệu. Bản cũ đếm tuốt,
  // nên tin chưa đọc trong một phòng đã khoá làm con số trên ô Nhắn tin đứng
  // mãi không về 0, mà bấm vào thì không thấy phòng nào để đọc.
  const rows = db.all('messages',
    `SELECT c.id AS convId, c.type AS type, c.classId AS classId, COUNT(*) AS n
       FROM messages m
       JOIN conversation_members cm ON cm.conversationId = m.conversationId AND cm.userId = ?
       JOIN conversations c ON c.id = m.conversationId
      WHERE m.senderId != ?
        AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)
      GROUP BY c.id, c.type, c.classId`,
    [user.id, user.id]);
  if (!rows.length) return 0;
  const nhomMoDuoc = new Set(db.classIdsOf(user));
  return rows
    .filter(r => !(r.type === 'group' && r.classId) || nhomMoDuoc.has(r.classId))
    .reduce((s, r) => s + Number(r.n || 0), 0);
}

module.exports = (app) => {
  app.get('/api/dashboard/badges', (req, res) => {
    const user = req.user;
    const ids = db.studentIdsOf(user);
    const marks = ids.map(() => '?').join(',');
    const today = todayStr();

    const badges = {
      thongbao: unreadNotifications(user),
      nhantin: unreadMessages(user),
    };

    if (!ids.length) return res.json(badges);

    if (user.role === 'parent') {
      // Điểm danh: số lượt điểm danh hôm nay của các con
      badges.diemdanh = db.count(
        `SELECT COUNT(*) FROM attendance WHERE date = ? AND studentId IN (${marks})`, [today, ...ids]);
      // Nhận xét mới chưa xem. Bản ĐÃ THU HỒI phải bị loại, cùng lý do đã ghi
      // ở `unreadNotifications` bên trên: thu hồi rồi thì không còn cách nào
      // bấm vào để đánh dấu đã xem, nên con số ấy sẽ đứng mãi không về 0.
      //
      // Phân hệ Nhận xét hằng ngày đang TẮT (A2) nên hôm nay chưa ai gặp. Vá
      // sẵn vì nó cùng một hình dạng với hai chỗ vừa vá trong đợt này, và vì
      // ngày nhà trường bật lại thì không ai còn nhớ để đi tìm.
      badges.nhanxet = db.count(
        `SELECT COUNT(*) FROM remarks
          WHERE parentSeen = 0 AND studentId IN (${marks})
            AND ${st.dieuKienConHien('remarks', 'id')}`, ids);
      // Khảo sát đang mở mà mình chưa trả lời
      badges.khaosat = db.count(
        `SELECT COUNT(*) FROM surveys s
         WHERE s.status = 'open'
           AND NOT EXISTS (SELECT 1 FROM survey_responses r WHERE r.surveyId = s.id AND r.userId = ?)`,
        [user.id]);
    }

    if (user.role === 'teacher' || user.role === 'admin') {
      badges.xinphep = db.count(
        `SELECT COUNT(*) FROM leave_requests WHERE status = 'pending' AND studentId IN (${marks})`, ids);
      badges.danthuoc = db.count(
        `SELECT COUNT(*) FROM medicine_requests WHERE status = 'pending' AND studentId IN (${marks})`, ids);
      // Số học sinh chưa được điểm danh hôm nay
      const marked = db.count(
        `SELECT COUNT(*) FROM attendance WHERE date = ? AND studentId IN (${marks})`, [today, ...ids]);
      badges.diemdanh = ids.length - marked;
    }

    res.json(badges);
  });
};
