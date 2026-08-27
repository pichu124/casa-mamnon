// Phân hệ Điểm danh: phụ huynh xem theo tháng, giáo viên điểm danh lớp theo ngày.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');

const STATUSES = ['present', 'late', 'absent_excused', 'absent_unexcused'];

function pad(n) { return String(n).padStart(2, '0'); }
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      for (const d of db.all('leave_requests',
        `SELECT * FROM leave_requests WHERE status = 'approved' AND fromDate <= ? AND toDate >= ?
           AND studentId IN (${marks})`, [date, date, ...ids])) {
        donNghi.set(d.studentId, { id: d.id, fromDate: d.fromDate, toDate: d.toDate, reason: d.reason });
      }
    }
    res.json({
      date,
      // Các nhóm cô đang phụ trách, để màn hình dựng được ô chọn nhóm. Cô chỉ
      // có một nhóm thì mảng này một phần tử và giao diện không hiện ô chọn.
      nhom: nl.nhomCuaCo(req.user.id),
      dangXemNhom: locNhom || null,
      students: students.map(s => ({
        student: { id: s.id, name: s.name, code: s.code, avatar: s.avatar },
        record: byStudent.get(s.id) || null,
        donNghiDaDuyet: donNghi.get(s.id) || null,
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
};
