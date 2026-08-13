// Phân hệ Dặn thuốc: phụ huynh gửi lời dặn, giáo viên nhận thuốc, ghi nhật ký và hoàn tất.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = (app) => {
  // Danh sách đơn dặn thuốc người dùng được xem.
  // Phụ huynh: đơn của các con mình. Giáo viên: đơn của học sinh lớp chủ nhiệm.
  // Sắp xếp: đơn chờ xác nhận lên trước, rồi mới nhất trước.
  app.get('/api/medicine', (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const rows = db.all('medicine_requests',
      `SELECT * FROM medicine_requests WHERE studentId IN (${ids.map(() => '?').join(',')})
       ORDER BY (status = 'pending') DESC, createdAt DESC`, ids);
    res.json(rows.map(decorate));
  });

  // Phụ huynh gửi lời dặn thuốc cho con.
  app.post('/api/medicine', requireRole('parent'), (req, res) => {
    const { studentId, fromDate, toDate, medicines, note } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền dặn thuốc cho học sinh này' });
    }
    if (!DATE_RE.test(String(fromDate || '')) || !DATE_RE.test(String(toDate || ''))) {
      return res.status(400).json({ error: 'Ngày dùng thuốc không hợp lệ' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc' });
    }
    if (!Array.isArray(medicines) || medicines.length < 1) {
      return res.status(400).json({ error: 'Vui lòng thêm ít nhất một loại thuốc' });
    }
    const meds = medicines.map(m => ({
      name: String((m && m.name) || '').trim(),
      dose: String((m && m.dose) || '').trim(),
      timing: String((m && m.timing) || '').trim(),
    }));
    if (meds.some(m => !m.name)) {
      return res.status(400).json({ error: 'Vui lòng nhập tên cho từng loại thuốc' });
    }
    const rec = {
      id: db.nextId('md'),
      studentId,
      parentId: req.user.id,
      fromDate,
      toDate,
      medicines: meds,
      note: String(note || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      confirmedBy: null,
      confirmedAt: null,
      log: [],
    };
    db.insert('medicine_requests', rec);
    res.status(201).json(decorate(rec));
  });

  // Giáo viên xác nhận đã nhận thuốc của một đơn đang chờ.
  app.post('/api/medicine/:id/confirm', requireRole('teacher', 'admin'), (req, res) => {
    const rec = findOwn(req, res);
    if (!rec) return;
    if (rec.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn này đã được xác nhận trước đó' });
    }
    rec.status = 'received';
    rec.confirmedBy = req.user.id;
    rec.confirmedAt = new Date().toISOString();
    db.update('medicine_requests', rec.id, {
      status: rec.status, confirmedBy: rec.confirmedBy, confirmedAt: rec.confirmedAt,
    });
    res.json(decorate(rec));
  });

  // Giáo viên ghi nhật ký cho thuốc của một đơn đang theo dõi.
  app.post('/api/medicine/:id/log', requireRole('teacher', 'admin'), (req, res) => {
    const rec = findOwn(req, res);
    if (!rec) return;
    if (rec.status !== 'received') {
      return res.status(400).json({ error: 'Chỉ ghi nhật ký cho đơn đang theo dõi' });
    }
    const text = String((req.body || {}).text || '').trim();
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung nhật ký' });
    rec.log = [...(rec.log || []), { time: new Date().toISOString(), text }];
    db.update('medicine_requests', rec.id, { log: rec.log });
    res.json(decorate(rec));
  });

  // Giáo viên đánh dấu hoàn tất đợt dùng thuốc.
  app.post('/api/medicine/:id/done', requireRole('teacher', 'admin'), (req, res) => {
    const rec = findOwn(req, res);
    if (!rec) return;
    if (rec.status !== 'received') {
      return res.status(400).json({ error: 'Chỉ hoàn tất đơn đang theo dõi' });
    }
    rec.status = 'done';
    rec.log = [...(rec.log || []),
      { time: new Date().toISOString(), text: 'Hoàn tất đợt dùng thuốc theo dặn của gia đình' }];
    db.update('medicine_requests', rec.id, { status: rec.status, log: rec.log });
    res.json(decorate(rec));
  });
};

// Tìm đơn theo id và kiểm tra quyền của giáo viên với học sinh của đơn.
// Trả về đơn, hoặc null sau khi đã gửi lỗi tương ứng.
function findOwn(req, res) {
  const rec = db.first('medicine_requests', 'SELECT * FROM medicine_requests WHERE id = ?', [req.params.id]);
  if (!rec) {
    res.status(404).json({ error: 'Không tìm thấy đơn dặn thuốc' });
    return null;
  }
  if (!db.canAccessStudent(req.user, rec.studentId)) {
    res.status(403).json({ error: 'Đơn này không thuộc học sinh lớp của bạn' });
    return null;
  }
  return rec;
}

// Ghép thêm tên học sinh, lớp, phụ huynh, người nhận thuốc cho một đơn.
function decorate(m) {
  const s = db.findStudent(m.studentId);
  const cls = s && s.classId ? db.findClass(s.classId) : null;
  const parent = m.parentId ? db.findUser(m.parentId) : null;
  const confirmer = m.confirmedBy ? db.findUser(m.confirmedBy) : null;
  return {
    ...m,
    studentName: s ? s.name : '',
    studentAvatar: s ? s.avatar : null,
    className: cls ? cls.name : '',
    parentName: parent ? `${parent.title} ${parent.name}` : '',
    confirmedByName: confirmer ? `${confirmer.title} ${confirmer.name}` : '',
  };
}
