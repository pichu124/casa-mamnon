// Phân hệ Dặn thuốc: phụ huynh gửi lời dặn, cô xác nhận đã nhận thuốc, cất đơn
// khi hết đợt.
//
// Nhà trường đã bỏ bước "cô ghi đã cho uống" khỏi màn hình — lý do ghi ở đầu
// public/js/views/medicine.js. Đường /api/medicine/:id/log bên dưới CỐ Ý còn
// sống, xem chú thích ngay tại chỗ.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOI_DA_SO_THUOC = 10;
const TOI_DA_O_THUOC = 100;
const TOI_DA_GHI_CHU = 500;

module.exports = (app) => {
  // Danh sách đơn dặn thuốc người dùng được xem.
  // Phụ huynh: đơn của các con mình. Giáo viên: đơn của học sinh lớp chủ nhiệm.
  // Sắp xếp: đơn chờ xác nhận lên trước, rồi mới nhất trước.
  app.get('/api/medicine', (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const marks = ids.map(() => '?').join(',');

    // Đơn CHƯA XONG (chờ xác nhận + đang theo dõi): lấy hết, không bao giờ cắt.
    // Đây là thuốc cô phải cho các con uống hôm nay, và màn hình đếm "Chờ xác
    // nhận (N)" / "Cô đã nhận thuốc (N)" ngay trên danh sách này.
    const dangLam = db.all('medicine_requests',
      `SELECT * FROM medicine_requests WHERE studentId IN (${marks}) AND status != 'done'
       ORDER BY (status = 'pending') DESC, createdAt DESC`, ids);

    // Đơn ĐÃ HOÀN TẤT chỉ là lịch sử và dày lên mãi theo năm.
    const TOI_DA_LICH_SU = 60;
    const gioiHan = Math.min(Math.max(Number(req.query.gioiHan) || TOI_DA_LICH_SU, 1), 500);
    const xong = db.all('medicine_requests',
      `SELECT * FROM medicine_requests WHERE studentId IN (${marks}) AND status = 'done'
       ORDER BY createdAt DESC LIMIT ?`, [...ids, gioiHan]);

    res.json([...dangLam, ...xong].map(decorate));
  });

  // Phụ huynh gửi lời dặn thuốc cho con.
  app.post('/api/medicine', requireRole('parent'), (req, res) => {
    const { studentId, fromDate, toDate, medicines, note } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền dặn thuốc cho bé này' });
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
    // Trần số đơn đang chờ — cùng lý do và cùng con số với đơn xin nghỉ:
    // trần chống bơm rác, không phải trần nghiệp vụ.
    const dangCho = db.count(
      `SELECT COUNT(*) FROM medicine_requests WHERE studentId = ? AND status = 'pending'`, [studentId]);
    if (dangCho >= 30) {
      return res.status(400).json({
        error: 'Bé đang có quá nhiều đơn dặn thuốc chờ xác nhận — chờ cô xác nhận xong rồi gửi thêm giúp trường nhé',
      });
    }
    // Chặn số dòng và cắt độ dài: đây là đường mà PHỤ HUYNH gọi được. Không chặn
    // thì một đơn vài trăm nghìn dòng thuốc đủ làm màn hình Dặn thuốc của cả lớp
    // đông cứng, mà app lại chưa có đường nào để xóa một đơn đã gửi.
    if (medicines.length > TOI_DA_SO_THUOC) {
      return res.status(400).json({ error: `Mỗi đơn chỉ dặn tối đa ${TOI_DA_SO_THUOC} loại thuốc` });
    }
    const meds = medicines.map(m => ({
      name: String((m && m.name) || '').trim().slice(0, TOI_DA_O_THUOC),
      dose: String((m && m.dose) || '').trim().slice(0, TOI_DA_O_THUOC),
      timing: String((m && m.timing) || '').trim().slice(0, TOI_DA_O_THUOC),
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
      note: String(note || '').trim().slice(0, TOI_DA_GHI_CHU),
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

  // Ghi nhật ký cho một đơn đang nhận.
  //
  // KHÔNG MÀN HÌNH NÀO CÒN GỌI ĐƯỜNG NÀY. Nhà trường đã bỏ bước "đã cho uống".
  // Vẫn giữ nguyên vì hai lẽ, giống hệt cách xử lý Nề nếp và Báo cáo ở N3:
  //
  //   • Điện thoại nào còn giữ bản app cũ trong bộ nhớ đệm vẫn gọi đường này
  //     cho tới khi service worker cập nhật. Trả 404 lúc đó là bắt cô nhìn
  //     một lỗi đỏ vì việc cô làm đúng theo màn hình cô đang thấy.
  //   • Dòng nhật ký đã ghi trước đây vẫn phải đọc được. Bỏ một bước là ngưng
  //     ghi thêm, không phải xóa thứ phụ huynh đã đọc thấy.
  //
  // Xóa hẳn được, nhưng để sau — khi app đã sống vài tuần mà không điện thoại
  // nào còn gọi tới. Ghi ở docs/TIEN-DO.md, mục A5.
  app.post('/api/medicine/:id/log', requireRole('teacher', 'admin'), (req, res) => {
    const rec = findOwn(req, res);
    if (!rec) return;
    if (rec.status !== 'received') {
      return res.status(400).json({ error: 'Chỉ ghi nhật ký cho đơn đang theo dõi' });
    }
    const text = String((req.body || {}).text || '').trim().slice(0, TOI_DA_GHI_CHU);
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung nhật ký' });
    rec.log = [...(rec.log || []), { time: new Date().toISOString(), text }];
    db.update('medicine_requests', rec.id, { log: rec.log });
    res.json(decorate(rec));
  });

  // Cô cất đơn khỏi danh sách đang nhận, khi đợt thuốc đã hết.
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
    res.status(403).json({ error: 'Đơn này không phải của bé nào trong nhóm cô phụ trách' });
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
