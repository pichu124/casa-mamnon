// Phân hệ Học phí — ví dụ về một tính năng cắm thêm.
//
// Nhận sẵn `db` qua tham số thứ hai nên không cần biết ứng dụng đặt tệp dữ liệu
// ở đâu. Mọi hàm kiểm tra quyền dùng chung với phần lõi, nhờ vậy phân hệ mới
// không thể vô tình để lộ dữ liệu của học sinh lớp khác.
module.exports = (app, { db }) => {
  const ngay = require('../../lib/ngay');
  const { requireRole } = require('../../lib/auth');

  // Các khoản của một học sinh.
  app.get('/api/hocphi', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học phí của bé này' });
    }
    const khoan = db.all('hocphi_khoan',
      'SELECT * FROM hocphi_khoan WHERE studentId = ? ORDER BY hanNop DESC, rowid DESC', [studentId]);
    const chuaNop = khoan.filter(k => !k.daNop);
    res.json({
      khoan: khoan.map(k => ({ ...k, daNop: !!k.daNop })),
      tongChuaNop: chuaNop.reduce((s, k) => s + Number(k.soTien || 0), 0),
      soKhoanChuaNop: chuaNop.length,
    });
  });

  // TẠO KHOẢN THU LÀ VIỆC CỦA VĂN PHÒNG, KHÔNG PHẢI CỦA CÔ.
  //
  // Phân hệ này mang nguyên từ app 1 sang, và ở đó cả `teacher` lẫn `admin`
  // đều tạo được. Ở trường mầm non thì không: tầng chức vụ đã đặt **Kế toán**
  // là người lo học phí và tiền ăn, và đợt Y3 đã tách rõ *"cô chốt suất, kế
  // toán đối chiếu"*.
  //
  // Để cô tạo rồi tự xác nhận một khoản tiền là để một người KHÔNG chịu trách
  // nhiệm về tiền vừa ghi sổ vừa duyệt sổ. Sai sót ở đó không ai đối chiếu ra,
  // và khi có chuyện thì người đứng lớp là người phải giải trình về tiền.
  //
  // Vai `admin` ở đây không có nghĩa "ai cũng vào được": tầng chức vụ vẫn siết
  // tiếp bên trong — Kế toán và Văn phòng cơ sở có `/api/hocphi` trong phần
  // việc, Nhân sự và Marketing thì không.
  app.post('/api/hocphi', requireRole('admin'), (req, res) => {
    const { studentId, kyThu, noiDung, soTien, hanNop } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (!String(kyThu || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập kỳ thu' });
    if (!String(noiDung || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung khoản thu' });
    const tien = Number(soTien);
    if (!Number.isFinite(tien) || tien <= 0) return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });

    const rec = {
      id: db.nextId('hp'),
      studentId,
      kyThu: String(kyThu).trim(),
      noiDung: String(noiDung).trim(),
      soTien: Math.round(tien),
      hanNop: hanNop || null,
      daNop: 0,
      ngayNop: null,
      ghiChu: '',
      taoBoi: req.user.id,
      taoLuc: new Date().toISOString(),
    };
    db.insert('hocphi_khoan', rec);
    db.audit(req.user.id, 'hocphi-create', rec.id, { studentId, soTien: rec.soTien });
    res.status(201).json({ ...rec, daNop: false });
  });

  // Xác nhận đã nhận tiền — cùng một lý do như trên, và nặng hơn: đây là chỗ
  // biến "nhà này còn nợ" thành "nhà này đã nộp".
  app.post('/api/hocphi/:id/xac-nhan', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (k.daNop) return res.status(400).json({ error: 'Khoản này đã được xác nhận trước đó' });

    db.update('hocphi_khoan', k.id, {
      daNop: 1,
      ngayNop: ngay.homNay(),
      ghiChu: String((req.body || {}).ghiChu || '').trim(),
    });
    db.audit(req.user.id, 'hocphi-confirm', k.id, null);
    res.json({ ok: true });
  });
};
