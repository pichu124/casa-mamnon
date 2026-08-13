// Số huy hiệu (badge) hiển thị trên lưới icon và thanh điều hướng.
//
// Mỗi con số là một câu đếm riêng trên cơ sở dữ liệu — nhanh hơn nhiều so với
// việc nạp toàn bộ dữ liệu lên rồi lọc trong bộ nhớ.
const db = require('../lib/db');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Điều kiện SQL cho các thông báo mà người dùng được xem.
function audienceFilter(user) {
  const classIds = db.classIdsOf(user);
  const marks = classIds.map(() => '?').join(',');
  return {
    sql: classIds.length ? `(n.audience = 'all' OR n.audience IN (${marks}))` : `n.audience = 'all'`,
    params: classIds,
  };
}

function unreadNotifications(user) {
  const f = audienceFilter(user);
  return db.count(
    `SELECT COUNT(*) FROM notifications n
     WHERE ${f.sql}
       AND n.createdBy IS NOT ?
       AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notificationId = n.id AND r.userId = ?)`,
    [...f.params, user.id, user.id]);
}

function unreadMessages(user) {
  return db.count(
    `SELECT COUNT(*) FROM messages m
     JOIN conversation_members cm ON cm.conversationId = m.conversationId AND cm.userId = ?
     WHERE m.senderId != ?
       AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)`,
    [user.id, user.id]);
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
      // Nhận xét mới chưa xem
      badges.nhanxet = db.count(
        `SELECT COUNT(*) FROM remarks WHERE parentSeen = 0 AND studentId IN (${marks})`, ids);
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
