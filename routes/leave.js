// Phân hệ Xin phép nghỉ học: phụ huynh tạo đơn, giáo viên duyệt / từ chối.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = (app) => {
  // Danh sách đơn xin phép người dùng được xem.
  // Phụ huynh: đơn của các con mình. Giáo viên: đơn của học sinh lớp chủ nhiệm.
  app.get('/api/leave', (req, res) => {
    const studentIds = db.studentsOf(req.user).map(s => s.id);
    const list = db.get().leaveRequests
      .filter(l => studentIds.includes(l.studentId))
      .map(decorate)
      .sort((a, b) => {
        const pa = a.status === 'pending' ? 0 : 1;
        const pb = b.status === 'pending' ? 0 : 1;
        if (pa !== pb) return pa - pb;               // đơn chờ duyệt lên trước
        return String(b.createdAt).localeCompare(String(a.createdAt)); // rồi mới nhất
      });
    res.json(list);
  });

  // Phụ huynh tạo đơn xin phép cho con.
  app.post('/api/leave', requireRole('parent'), (req, res) => {
    const { studentId, fromDate, toDate, reason } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền tạo đơn cho học sinh này' });
    }
    if (!DATE_RE.test(String(fromDate || '')) || !DATE_RE.test(String(toDate || ''))) {
      return res.status(400).json({ error: 'Ngày nghỉ không hợp lệ' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do xin nghỉ cho con' });
    }
    const rec = {
      id: db.nextId('lv'),
      studentId,
      parentId: req.user.id,
      fromDate,
      toDate,
      reason: String(reason).trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewNote: '',
    };
    db.get().leaveRequests.push(rec);
    db.save();
    res.status(201).json(decorate(rec));
  });

  // Giáo viên duyệt / từ chối một đơn đang chờ của học sinh lớp mình.
  app.post('/api/leave/:id/review', requireRole('teacher'), (req, res) => {
    const rec = db.get().leaveRequests.find(l => l.id === req.params.id);
    if (!rec) return res.status(404).json({ error: 'Không tìm thấy đơn xin phép' });
    if (!db.canAccessStudent(req.user, rec.studentId)) {
      return res.status(403).json({ error: 'Đơn này không thuộc học sinh lớp của bạn' });
    }
    if (rec.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn này đã được xử lý trước đó' });
    }
    const { status, reviewNote } = req.body || {};
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Trạng thái duyệt không hợp lệ' });
    }
    rec.status = status;
    rec.reviewedBy = req.user.id;
    rec.reviewNote = String(reviewNote || '').trim();
    db.save();
    res.json(decorate(rec));
  });
};

// Ghép thêm tên học sinh, lớp, phụ huynh, người duyệt cho một đơn.
function decorate(l) {
  const s = db.findStudent(l.studentId);
  const cls = s ? db.findClass(s.classId) : null;
  const parent = db.findUser(l.parentId);
  const reviewer = l.reviewedBy ? db.findUser(l.reviewedBy) : null;
  return {
    ...l,
    studentName: s ? s.name : '',
    studentAvatar: s ? s.avatar : null,
    className: cls ? cls.name : '',
    parentName: parent ? `${parent.title} ${parent.name}` : '',
    reviewerName: reviewer ? `${reviewer.title} ${reviewer.name}` : '',
  };
}
