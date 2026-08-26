// Phân hệ Xin phép nghỉ học: phụ huynh tạo đơn, giáo viên duyệt / từ chối.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOI_DA_LY_DO = 1000;
const TOI_DA_GHI_CHU_DUYET = 500;

module.exports = (app) => {
  // Danh sách đơn xin phép người dùng được xem.
  // Phụ huynh: đơn của các con mình. Giáo viên: đơn của học sinh lớp chủ nhiệm.
  app.get('/api/leave', (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const marks = ids.map(() => '?').join(',');

    // Đơn CHỜ DUYỆT: lấy hết, không bao giờ cắt. Đây là việc cô phải làm, và màn
    // hình đếm "Chờ duyệt (N)" ngay trên danh sách này — cắt bớt là con số đó sai
    // mà không có lỗi nào báo.
    const cho = db.all('leave_requests',
      `SELECT * FROM leave_requests WHERE studentId IN (${marks}) AND status = 'pending'
       ORDER BY createdAt DESC`, ids);

    // Đơn ĐÃ XỬ LÝ chỉ là lịch sử, và nó dày lên mãi theo năm. Giữ 60 đơn gần
    // nhất là đủ cho việc tra cứu thường ngày.
    const TOI_DA_LICH_SU = 60;
    const gioiHan = Math.min(Math.max(Number(req.query.gioiHan) || TOI_DA_LICH_SU, 1), 500);
    const xong = db.all('leave_requests',
      `SELECT * FROM leave_requests WHERE studentId IN (${marks}) AND status != 'pending'
       ORDER BY createdAt DESC LIMIT ?`, [...ids, gioiHan]);

    res.json([...cho, ...xong].map(decorate));
  });

  // Phụ huynh tạo đơn xin phép cho con.
  app.post('/api/leave', requireRole('parent'), (req, res) => {
    const { studentId, fromDate, toDate, reason } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền tạo đơn cho bé này' });
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
    // Cắt độ dài: đây là đường mà PHỤ HUYNH gọi được. Không cắt thì một đơn dài
    // vài MB đủ làm màn hình Xin nghỉ của cả lớp không mở nổi trên điện thoại,
    // mà app lại chưa có đường nào để xóa hay ẩn một đơn đã gửi.
    if (String(reason).trim().length > TOI_DA_LY_DO) {
      return res.status(400).json({ error: `Lý do xin nghỉ quá dài, vui lòng viết ngắn gọn trong ${TOI_DA_LY_DO} ký tự` });
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
    db.insert('leave_requests', rec);
    res.status(201).json(decorate(rec));
  });

  // Giáo viên duyệt / từ chối một đơn đang chờ của học sinh lớp mình.
  app.post('/api/leave/:id/review', requireRole('teacher', 'admin'), (req, res) => {
    const rec = db.first('leave_requests', 'SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!rec) return res.status(404).json({ error: 'Không tìm thấy đơn xin phép' });
    if (!db.canAccessStudent(req.user, rec.studentId)) {
      return res.status(403).json({ error: 'Đơn này không thuộc bé nào của nhóm cô' });
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
    rec.reviewNote = String(reviewNote || '').trim().slice(0, TOI_DA_GHI_CHU_DUYET);
    db.update('leave_requests', rec.id, {
      status: rec.status, reviewedBy: rec.reviewedBy, reviewNote: rec.reviewNote,
    });
    db.audit(req.user.id, 'leave-review', rec.id, { status });
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
