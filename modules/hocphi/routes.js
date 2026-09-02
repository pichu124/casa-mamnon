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
    // Khoản ĐÃ THU HỒI không hiện với ai — nó là khoản tạo nhầm, dòng gốc còn
    // nguyên trong bảng làm chứng từ (xem hocphi_thuhoi trong schema.sql).
    const khoan = db.all('hocphi_khoan',
      `SELECT * FROM hocphi_khoan WHERE studentId = ?
         AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)
       ORDER BY hanNop DESC, rowid DESC`, [studentId]);
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
    // Hỏi bé CÓ TỒN TẠI trước: canAccessStudent trả true cho quản trị toàn hệ
    // thống với BẤT KỲ chuỗi nào, nên mã bé sai lọt tới INSERT là vỡ khoá
    // ngoại và người dùng nhận đúng bốn chữ "Lỗi máy chủ".
    if (!db.findStudent(studentId)) return res.status(404).json({ error: 'Không tìm thấy bé' });
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
    if (db.first('hocphi_thuhoi', 'SELECT khoanId FROM hocphi_thuhoi WHERE khoanId = ?', [k.id])) {
      return res.status(400).json({ error: 'Khoản này đã được thu hồi — không xác nhận thu tiền cho nó được nữa' });
    }

    db.update('hocphi_khoan', k.id, {
      daNop: 1,
      ngayNop: ngay.homNay(),
      ghiChu: String((req.body || {}).ghiChu || '').trim(),
    });
    db.audit(req.user.id, 'hocphi-confirm', k.id, null);
    res.json({ ok: true });
  });

  // THU HỒI MỘT KHOẢN TẠO NHẦM — trước đây khoản tạo nhầm là VĨNH VIỄN: phân
  // hệ không có đường sửa hay huỷ nào cho tiền, sai bé / sai số là nằm đó mãi
  // và gia đình nhìn thấy một khoản nợ không có thật.
  //
  // Thu hồi là NGƯNG DÙNG, không phải xoá: dòng gốc giữ nguyên làm chứng từ,
  // bảng hocphi_thuhoi ghi ai thu hồi, lúc nào, vì sao — cùng nếp thu hồi của
  // cả app. Bắt buộc ghi lý do: một khoản tiền biến khỏi danh sách mà không
  // một lời giải thích trong sổ là chỗ mất lòng tin nhanh nhất.
  //
  // Khoản ĐÃ XÁC NHẬN THU TIỀN thì phải huỷ xác nhận trước (đường dưới):
  // thu hồi thẳng một khoản đã nộp là xoá dấu vết của một món tiền đã nhận.
  app.post('/api/hocphi/:id/thu-hoi', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (db.first('hocphi_thuhoi', 'SELECT khoanId FROM hocphi_thuhoi WHERE khoanId = ?', [k.id])) {
      return res.status(400).json({ error: 'Khoản này đã được thu hồi trước đó' });
    }
    if (k.daNop) {
      return res.status(400).json({
        error: 'Khoản này đã xác nhận thu tiền. Muốn thu hồi thì huỷ xác nhận trước, để sổ không mất dấu món tiền đã nhận.',
      });
    }
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 300);
    if (!lyDo) return res.status(400).json({ error: 'Ghi giúp trường một dòng vì sao thu hồi khoản này' });

    db.insert('hocphi_thuhoi', {
      khoanId: k.id, lyDo, boiUserId: req.user.id, luc: new Date().toISOString(),
    });
    db.audit(req.user.id, 'hocphi-thu-hoi', k.id, { studentId: k.studentId, soTien: k.soTien, lyDo });
    res.json({ ok: true, khoanId: k.id });
  });

  // HUỶ XÁC NHẬN "ĐÃ NỘP" BẤM NHẦM — khoản quay về "chưa nộp", có vết đầy đủ.
  app.post('/api/hocphi/:id/huy-xac-nhan', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (!k.daNop) return res.status(400).json({ error: 'Khoản này đang ở trạng thái chưa nộp' });
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 300);
    if (!lyDo) return res.status(400).json({ error: 'Ghi giúp trường một dòng vì sao huỷ xác nhận' });

    db.update('hocphi_khoan', k.id, { daNop: 0, ngayNop: null });
    db.audit(req.user.id, 'hocphi-huy-xac-nhan', k.id,
      { studentId: k.studentId, soTien: k.soTien, ngayNopCu: k.ngayNop, lyDo });
    res.json({ ok: true, khoanId: k.id });
  });
};
