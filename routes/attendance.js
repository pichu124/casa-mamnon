// Phân hệ Điểm danh: phụ huynh xem theo tháng, giáo viên điểm danh lớp theo ngày.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
// Hỏi công tắc trước khi đọc bảng của phân hệ khác (modules/README.md).
const modules = require('../lib/modules');
const uploads = require('../lib/uploads');
// Một chỗ duy nhất trả lời "hôm nay bé nào đang nghỉ có phép" (Đ84).
const nghiHoc = require('../lib/nghi-hoc');

const STATUSES = ['present', 'late', 'absent_excused', 'absent_unexcused'];

// GIỜ NHÀ TRƯỜNG CHỐT ĐỂ RÀ SOÁT (điểm 4, 30/08): "sau 9h bé nào chưa được
// điểm danh mà không xin nghỉ trước đó thì báo đỏ để văn phòng kiểm tra".
//
// Con số này nói về VIỆC CỦA NGƯỜI LỚN chưa làm xong — cô chưa kịp chấm, hoặc
// gia đình chưa kịp báo — chứ không nói gì về đứa trẻ. Chữ trên màn hình phải
// giữ đúng nghĩa đó, và bài canh QUY TẮC 2 giữ nó.
const GIO_RA_SOAT = 9;

// Ảnh điểm danh: nhỏ hơn ảnh album nhiều. Đây là một khung hình "con đã tới
// lớp", không phải ảnh để phóng to xem.
const TOI_DA_ANH_BYTE = 900 * 1024;

function pad(n) { return String(n).padStart(2, '0'); }
function currentMonth() {
  return ngay.thangNay();
}
function todayStr() {
  return ngay.homNay();
}
function nowTime() {
  return ngay.bayGio();
}

module.exports = (app) => {
  // Bản ghi điểm danh của một học sinh trong tháng (mặc định: tháng hiện tại).
  app.get('/api/attendance', (req, res) => {
    const studentId = req.query.studentId;
    const month = req.query.month || currentMonth();
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem điểm danh của bé này' });
    }
    res.json(db.all('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date LIKE ? ORDER BY date',
      [studentId, `${month}-%`]));
  });

  // Giáo viên: toàn bộ học sinh lớp chủ nhiệm kèm bản ghi điểm danh của một ngày.
  app.get('/api/attendance/class', requireRole('teacher', 'admin'), (req, res) => {
    const date = req.query.date || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    // Cô phụ trách nhiều nhóm thì sổ điểm danh phải mở được TỪNG nhóm, chứ
    // không dồn trẻ hai nhóm vào một danh sách. Không truyền `classId` thì giữ
    // nguyên hành vi cũ: toàn bộ trẻ cô được xem.
    const locNhom = String(req.query.classId || '');
    if (locNhom && !db.canAccessClass(req.user, locNhom)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc nhóm cô phụ trách' });
    }
    const students = locNhom
      ? db.studentsOf(req.user).filter(s => s.classId === locNhom)
      : db.studentsOf(req.user);
    // Lấy một lần toàn bộ bản ghi trong ngày rồi ghép, thay vì tra từng em.
    const ids = students.map(s => s.id);
    const byStudent = new Map();
    const donNghi = new Map();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      const rows = db.all('attendance',
        `SELECT * FROM attendance WHERE date = ? AND studentId IN (${marks})`,
        [date, ...ids]);
      for (const r of rows) byStudent.set(r.studentId, r);

      // Cho sổ điểm danh BIẾT em nào đã có đơn nghỉ được duyệt trong ngày.
      //
      // Trước đây cô duyệt đơn xong mà sổ điểm danh không hay biết gì, vẫn cho
      // chấm "Nghỉ không phép" đúng vào ngày đơn đã duyệt — cùng một việc phải
      // nhập hai lần, và chỉ cần quên là phụ huynh thấy chữ đỏ "Nghỉ không phép"
      // cho con mình dù cô đã duyệt đơn.
      //
      // CỐ Ý chỉ THÊM THÔNG TIN, tuyệt đối không tự sinh bản ghi điểm danh khi
      // duyệt đơn: hệ thống không có khái niệm ngày học / ngày lễ / cuối tuần,
      // nên một đơn từ thứ Sáu đến thứ Hai sẽ sinh cả thứ Bảy và Chủ nhật, thổi
      // phồng số buổi nghỉ trong báo cáo học kỳ — đúng con số mà việc này định
      // cứu. Muốn làm phần đó phải có lịch năm học trước.
      // Nhà trường tắt Xin phép thì sổ đơn nghỉ không còn ai cập nhật. Đọc
      // tiếp là gắn nhãn "có đơn nghỉ" cho bé theo một cuốn sổ đã ngưng — cùng
      // hạng lỗi với Đ46, chỉ khác chỗ.
      const donHopLe = modules.dangBat('xinphep') ? db.all('leave_requests',
        `SELECT * FROM leave_requests WHERE status = 'approved' AND fromDate <= ? AND toDate >= ?
           AND studentId IN (${marks})`, [date, date, ...ids]) : [];
      for (const d of donHopLe) {
        donNghi.set(d.studentId, { id: d.id, fromDate: d.fromDate, toDate: d.toDate, reason: d.reason });
      }
    }
    // Ảnh điểm danh của đúng ngày đang xem, lấy một lượt cho cả nhóm.
    const anh = new Map();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const a of db.all('attendance_photo',
        `SELECT studentId, file, taoLuc FROM attendance_photo
          WHERE date = ? AND studentId IN (${marks})`, [date, ...ids])) {
        anh.set(a.studentId, { file: a.file, taoLuc: a.taoLuc });
      }
    }

    res.json({
      date,
      // Các nhóm cô đang phụ trách, để màn hình dựng được ô chọn nhóm. Cô chỉ
      // có một nhóm thì mảng này một phần tử và giao diện không hiện ô chọn.
      nhom: nl.nhomCuaCo(req.user.id),
      dangXemNhom: locNhom || null,
      gioRaSoat: GIO_RA_SOAT,
      students: students.map(s => ({
        student: { id: s.id, name: s.name, code: s.code, avatar: s.avatar },
        record: byStudent.get(s.id) || null,
        donNghiDaDuyet: donNghi.get(s.id) || null,
        anhDenLop: anh.get(s.id) || null,
      })),
    });
  });

  // Giáo viên điểm danh một học sinh: ghi đè bản ghi của đúng ngày đó.
  app.post('/api/attendance/mark', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, status, note } = req.body || {};
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Thiếu thông tin điểm danh' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }

    const existing = db.first('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, date]);

    const rec = existing || {
      id: db.nextId('att'), studentId, date,
      status, checkIn: null, checkOut: null, note: '', markedBy: req.user.id,
    };
    rec.status = status;
    if (typeof note === 'string') rec.note = note;
    if (status === 'present' && !rec.checkIn) rec.checkIn = nowTime();
    if (status === 'absent_excused' || status === 'absent_unexcused') {
      rec.checkIn = null;
      rec.checkOut = null;
    }
    rec.markedBy = req.user.id;

    db.upsert('attendance', rec, ['studentId', 'date']);
    res.json(rec);
  });

  // Điểm danh cả lớp trong một lượt.
  //
  // Đường dẫn RIÊNG, không đụng vào /mark: giao diện cũ còn trong bộ nhớ đệm của
  // điện thoại đã cài app vẫn gọi /mark từng em, và hai bộ kiểm thử cũng gọi
  // đường đó. Thêm bên cạnh thì cả hai bản đều chạy.
  //
  // Mặc định CHỈ ghi cho em CHƯA điểm danh. Cô thường đánh dấu vài em nghỉ trước
  // rồi mới bấm "cả lớp có mặt" cho phần còn lại — ghi đè hết là xóa mất đúng
  // phần cô vừa nhập tay, mà app không có đường hoàn tác.
  app.post('/api/attendance/mark-all', requireRole('teacher', 'admin'), (req, res) => {
    const { date, status, ghiDe } = req.body || {};
    const ngay = String(date || '');
    const trangThai = String(status || 'present');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!STATUSES.includes(trangThai)) {
      return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    }

    // Quản trị phải nói rõ nhóm nào; cô thì lấy nhóm mình phụ trách — và cũng
    // phải nói rõ khi cô đang phụ trách nhiều nhóm.
    const classId = String((req.body || {}).classId || '')
      || nl.nhomDangThaoTac(req.user, null);
    if (!classId) return res.status(400).json({ error: 'Thiếu mã nhóm cần điểm danh' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc nhóm cô phụ trách' });
    }

    const students = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    if (!students.length) return res.status(400).json({ error: 'Nhóm chưa có bé nào' });

    // Soát quyền cho TỪNG em trước khi mở giao dịch: nếu để trong giao dịch mà
    // dừng giữa chừng thì một phần đã ghi, một phần chưa, và cô không biết.
    for (const s of students) {
      if (!db.canAccessStudent(req.user, s.id)) {
        return res.status(403).json({ error: 'Có bé không thuộc nhóm cô phụ trách' });
      }
    }

    const daCo = new Map();
    for (const r of db.all('attendance',
      `SELECT * FROM attendance WHERE date = ? AND studentId IN (${students.map(() => '?').join(',')})`,
      [ngay, ...students.map(s => s.id)])) daCo.set(r.studentId, r);

    let soDaGhi = 0;
    let soGiuNguyen = 0;
    db.tx(() => {
      for (const s of students) {
        const cu = daCo.get(s.id);
        if (cu && !ghiDe) { soGiuNguyen += 1; continue; }
        const rec = cu || {
          id: db.nextId('att'), studentId: s.id, date: ngay,
          status: trangThai, checkIn: null, checkOut: null, note: '', markedBy: req.user.id,
        };
        rec.status = trangThai;
        // Giữ đúng quy tắc giờ vào/ra của đường ghi từng em.
        if (trangThai === 'present' && !rec.checkIn) rec.checkIn = nowTime();
        if (trangThai === 'absent_excused' || trangThai === 'absent_unexcused') {
          rec.checkIn = null;
          rec.checkOut = null;
        }
        rec.markedBy = req.user.id;
        db.upsert('attendance', rec, ['studentId', 'date']);
        soDaGhi += 1;
      }
    });

    res.json({ ok: true, date: ngay, status: trangThai, soDaGhi, soGiuNguyen });
  });

  // =========================================================================
  // ẢNH ĐIỂM DANH — "con đã tới lớp rồi"
  // =========================================================================
  //
  // Nhà trường đặt việc này ở điểm 4: gia đình muốn thấy MẶT con ở lớp chứ
  // không chỉ một dòng chữ "có mặt". Một khung hình lúc 7h40 trả lời được câu
  // hỏi mà cả buổi sáng của một người mẹ đang treo ở đó.

  // Cô gắn ảnh cho một bé trong một ngày.
  app.post('/api/attendance/anh', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, anh } = req.body || {};
    const ngayGhi = String(date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayGhi)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (!anh || typeof anh !== 'string') {
      return res.status(400).json({ error: 'Chưa chọn ảnh' });
    }

    // Trần riêng của ảnh điểm danh, SIẾT trước khi gọi kho ảnh.
    //
    // `uploads.saveDataUrl` có trần chung cho cả app và không nhận tham số —
    // nó là tệp nền dùng chung, thêm tham số vào đó là đổi khế ước của một
    // thứ cả app đang dựa vào. Nên phần siết thêm nằm ở đây, chỗ biết rõ ảnh
    // này để làm gì.
    const phay = anh.indexOf(',');
    if (phay >= 0 && (anh.length - phay - 1) * 0.75 > TOI_DA_ANH_BYTE) {
      return res.status(400).json({
        error: 'Ảnh điểm danh nặng quá, cô chụp lại một khung hình nhỏ hơn nhé',
      });
    }

    let luu;
    try {
      luu = uploads.saveDataUrl(anh);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Ảnh chưa gửi lên được' });
    }

    // Ảnh cũ của đúng ngày đó phải được DỌN, không để lại rác trong kho.
    // Chụp lại vài lần trong một buổi sáng là chuyện thường; mỗi lần bỏ lại
    // một tệp là kho ảnh của trường phình lên vì những khung hình không ai xem.
    const cu = db.first('attendance_photo',
      'SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    db.upsert('attendance_photo', {
      studentId, date: ngayGhi, file: luu.file,
      taoLuc: nowTime(), byUserId: req.user.id,
    }, ['studentId', 'date']);
    if (cu && cu.file && cu.file !== luu.file) uploads.remove(cu.file);

    // TÊN HÀNH ĐỘNG CỐ Ý ĐẶT THEO VIỆC, KHÔNG THEO TÊN MÀN HÌNH.
    //
    // `test:quy-tac-4` bắt theo tên trường dữ liệu, và mẫu của nó có một từ mà
    // tên viết-không-dấu của màn hình này khớp trúng — dấu gạch ngang là ranh
    // giới từ. Bộ canh không sai: chữ đã bỏ dấu thì nó không có cách nào phân
    // biệt hai nghĩa. Đặt tên theo việc thì vừa không phải xin ngoại lệ cho một
    // bộ canh bất khả xâm phạm, vừa nói đúng hơn cái vừa xảy ra.
    //
    // (Chú thích này cũng tránh viết ra từ ấy — bộ canh quét cả chú thích, và
    // đó là chủ ý: một bộ canh có ngoại lệ "trong chú thích thì không tính" là
    // một bộ canh có lỗ. Bản đầu của chính đoạn này đã bị bắt vì lý do đó.)
    db.audit(req.user.id, 'anh-toi-lop', studentId, { date: ngayGhi });
    res.status(201).json({ ok: true, studentId, date: ngayGhi, file: luu.file });
  });

  // Gỡ ảnh — chụp nhầm bé thì phải gỡ được ngay (bài học Đ15).
  app.delete('/api/attendance/anh', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = String(req.query.studentId || '');
    const ngayGhi = String(req.query.date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const cu = db.first('attendance_photo',
      'SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (!cu) return res.json({ ok: true, daGoTruocDo: true });
    db.run('DELETE FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (cu.file) uploads.remove(cu.file);
    db.audit(req.user.id, 'go-anh-toi-lop', studentId, { date: ngayGhi });
    res.json({ ok: true });
  });

  // Gia đình xem ảnh con mình theo tháng.
  //
  // CHỐT CHẶN "CHỈ NHÀ MÌNH" LÀ `canAccessStudent`, VÀ ĐƯỜNG NÀY CHỈ NHẬN MỘT
  // MÃ BÉ. Không có đường dẫn nào trả về ảnh điểm danh của nhiều bé cho một
  // gia đình, nên không có chỗ nào để một ảnh đi lạc sang nhà khác.
  app.get('/api/attendance/anh', (req, res) => {
    const studentId = String(req.query.studentId || '');
    const thang = String(req.query.month || currentMonth());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}$/.test(thang)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh điểm danh của bé này' });
    }
    res.json({
      studentId, month: thang,
      anh: db.all('attendance_photo',
        `SELECT date, file, taoLuc FROM attendance_photo
          WHERE studentId = ? AND date LIKE ? ORDER BY date DESC`, [studentId, `${thang}-%`]),
    });
  });

  // =========================================================================
  // BẢNG RÀ SOÁT SAU 9 GIỜ
  // =========================================================================
  //
  // Nhà trường: "sau 9h bé nào chưa được điểm danh mà không xin nghỉ trước đó
  // thì báo đỏ để văn phòng kiểm tra lại sơ sót, hay con nghỉ, để liên lạc với
  // phụ huynh xác nhận".
  //
  // HAI ĐIỀU PHẢI GIỮ ĐÚNG
  //
  //   1. MÀU ĐỎ Ở ĐÂY LÀ VIỆC CỦA NGƯỜI LỚN CHƯA XONG, không phải một lời nào
  //      về đứa trẻ. Cô chưa kịp chấm, hoặc gia đình chưa kịp báo. QUY TẮC 2
  //      cấm trình bày "chưa" của một đứa trẻ như thất bại — chỗ này không nói
  //      gì về đứa trẻ cả, và chữ trên màn hình phải giữ đúng như vậy.
  //
  //   2. BÉ ĐÃ CÓ ĐƠN NGHỈ ĐƯỢC DUYỆT THÌ KHÔNG NẰM TRONG DANH SÁCH. Nếu không
  //      thì mỗi sáng văn phòng lại gọi điện hỏi một gia đình đã báo nghỉ từ
  //      hôm trước — vài lần như thế là cả bảng rà soát bị bỏ qua. Cùng bài
  //      học với Đ84, và dùng chung đúng `lib/nghi-hoc.js`.
  app.get('/api/attendance/ra-soat', requireRole('teacher', 'admin'), (req, res) => {
    const date = String(req.query.date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    const locNhom = String(req.query.classId || '');
    if (locNhom && !db.canAccessClass(req.user, locNhom)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc phạm vi của tài khoản' });
    }
    const students = locNhom
      ? db.studentsOf(req.user).filter(s => s.classId === locNhom)
      : db.studentsOf(req.user);

    const ids = students.map(s => s.id);
    const daCham = new Set();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const r of db.all('attendance',
        `SELECT studentId FROM attendance WHERE date = ? AND studentId IN (${marks})`,
        [date, ...ids])) daCham.add(r.studentId);
    }
    const dangNghi = nghiHoc.nghiCoPhep(ids, date);

    // ĐÃ QUA GIỜ RÀ SOÁT CHƯA — chỉ có nghĩa với NGÀY HÔM NAY.
    //
    // Xem lại một ngày đã qua thì bảng rà soát luôn có nghĩa: buổi sáng ấy đã
    // trôi qua từ lâu. Còn hôm nay lúc 7h30 mà đã kêu "chưa điểm danh" thì
    // bảng này kêu suốt cả tiếng rưỡi đầu giờ, và người ta tắt nó đi.
    const homNay = todayStr();
    const gioHienTai = Number(String(nowTime()).slice(0, 2));
    const quaGio = date < homNay || (date === homNay && gioHienTai >= GIO_RA_SOAT);

    const canRaSoat = students
      .filter(s => !daCham.has(s.id) && !dangNghi.get(s.id))
      .map(s => ({ studentId: s.id, hoTen: s.name, avatar: s.avatar, classId: s.classId }));

    res.json({
      date, gioRaSoat: GIO_RA_SOAT, quaGio,
      soCanRaSoat: quaGio ? canRaSoat.length : 0,
      danhSach: quaGio ? canRaSoat : [],
      // Trả về cả số bé đã có đơn nghỉ được duyệt, để văn phòng thấy vì sao
      // danh sách ngắn hơn mình tưởng và không đi tìm nhầm.
      soDaCoDonNghi: [...dangNghi.keys()].filter(id => !daCham.has(id)).length,
    });
  });
};
