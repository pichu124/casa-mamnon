// Số huy hiệu (badge) hiển thị trên lưới icon và thanh điều hướng.
const db = require('../lib/db');

function unreadNotifications(user) {
  const data = db.get();
  const myClassIds = user.role === 'teacher'
    ? [user.classId]
    : db.studentsOf(user).map(s => s.classId);
  return data.notifications.filter(n =>
    (n.audience === 'all' || myClassIds.includes(n.audience)) &&
    !n.readBy.includes(user.id) &&
    n.createdBy !== user.id
  ).length;
}

function unreadMessages(user) {
  const data = db.get();
  let count = 0;
  for (const cv of data.conversations) {
    if (!cv.participantIds.includes(user.id)) continue;
    const last = cv.lastRead && cv.lastRead[user.id] ? new Date(cv.lastRead[user.id]).getTime() : 0;
    count += cv.messages.filter(m => m.senderId !== user.id && new Date(m.createdAt).getTime() > last).length;
  }
  return count;
}

module.exports = (app) => {
  app.get('/api/dashboard/badges', (req, res) => {
    const user = req.user;
    const data = db.get();
    const students = db.studentsOf(user);
    const studentIds = students.map(s => s.id);
    const today = new Date().toISOString().slice(0, 10);
    const badges = {
      thongbao: unreadNotifications(user),
      nhantin: unreadMessages(user),
    };

    if (user.role === 'parent') {
      // Điểm danh: số lượt điểm danh hôm nay của các con
      badges.diemdanh = data.attendance.filter(a => studentIds.includes(a.studentId) && a.date === today).length;
      // Nhận xét mới chưa xem
      badges.nhanxet = data.remarks.filter(r => studentIds.includes(r.studentId) && !r.parentSeen).length;
      // Khảo sát đang mở chưa trả lời
      badges.khaosat = data.surveys.filter(sv =>
        sv.status === 'open' && !sv.responses.some(r => r.userId === user.id)
      ).length;
    }

    if (user.role === 'teacher') {
      // Xin phép chờ duyệt của học sinh lớp mình
      badges.xinphep = data.leaveRequests.filter(l => studentIds.includes(l.studentId) && l.status === 'pending').length;
      // Dặn thuốc chưa xác nhận
      badges.danthuoc = data.medicineRequests.filter(m => studentIds.includes(m.studentId) && m.status === 'pending').length;
      // Điểm danh: số học sinh chưa được điểm danh hôm nay
      const marked = data.attendance.filter(a => a.date === today && studentIds.includes(a.studentId)).map(a => a.studentId);
      badges.diemdanh = studentIds.filter(id => !marked.includes(id)).length;
    }

    res.json(badges);
  });
};
