// Phân hệ Quản trị: quản lý nhóm lớp, cô, hồ sơ bé và nhập danh sách đầu năm.
//
// Đây là phần cho phép nhà trường tự đưa dữ liệu thật vào hệ thống — không có
// nó thì không thể tạo hàng trăm tài khoản phụ huynh.
const db = require('../lib/db');
const lsl = require('../lib/lich-su-lop');
const nl = require('../lib/nhom-lop');
const csv = require('../lib/csv');
const password = require('../lib/password');
const { requireRole, destroyUserSessions } = require('../lib/auth');

const onlyAdmin = requireRole('admin');

const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
function sinhMatKhau() {
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let out = '';
  for (let i = 0; i < 5; i++) out += pick(CHU);
  for (let i = 0; i < 3; i++) out += pick(SO);
  return out;
}

// Sinh tên đăng nhập chưa bị trùng. Ưu tiên số điện thoại vì phụ huynh dễ nhớ nhất.
function sinhTenDangNhap(hoTen, dienThoai, daDung) {
  const sdt = String(dienThoai || '').replace(/\D/g, '');
  const ungVien = [];
  if (sdt.length >= 9) ungVien.push(sdt);
  const theoTen = csv.boDau(hoTen).slice(0, 20);
  if (theoTen) ungVien.push(theoTen);

  for (const goc of ungVien) {
    if (!goc) continue;
    if (!daDung.has(goc) && !db.findUserByUsername(goc)) { daDung.add(goc); return goc; }
    for (let i = 2; i < 100; i++) {
      const thu = `${goc}${i}`;
      if (!daDung.has(thu) && !db.findUserByUsername(thu)) { daDung.add(thu); return thu; }
    }
  }
  const ngauNhien = `ph${Date.now().toString(36).slice(-5)}${Math.floor(Math.random() * 999)}`;
  daDung.add(ngauNhien);
  return ngauNhien;
}

// Đọc cột theo nhiều cách viết tiêu đề khác nhau — nhà trường mỗi nơi đặt tên một kiểu.
function lay(row, ...ten) {
  for (const t of ten) {
    for (const k of Object.keys(row)) {
      if (csv.boDau(k) === csv.boDau(t)) return String(row[k] || '').trim();
    }
  }
  return '';
}

module.exports = (app) => {
  // ---------- Tổng quan ----------
  // ---- Cơ sở ----
  //
  // Trường có ba cơ sở, và quy định phân quyền của nhà trường nói rõ dữ liệu
  // giữa các cơ sở phải độc lập. Ba đường dưới đây là chỗ nhà trường khai báo
  // và sửa danh sách đó.
  app.get('/api/admin/campuses', onlyAdmin, (req, res) => {
    res.json(db.campuses().map(cs => ({
      ...cs,
      classCount: db.classIdsOfCampus(cs.id).length,
      studentCount: db.classIdsOfCampus(cs.id)
        .reduce((n, id) => n + db.count('SELECT COUNT(*) FROM students WHERE classId = ? AND active = 1', [id]), 0),
    })));
  });

  app.post('/api/admin/campuses', onlyAdmin, (req, res) => {
    const name = String((req.body || {}).name || '').trim();
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên cơ sở' });
    if (db.campuses().some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Đã có cơ sở trùng tên này' });
    }
    const rec = {
      id: db.nextId('cs'),
      name,
      address: String((req.body || {}).address || '').trim(),
      phone: String((req.body || {}).phone || '').trim(),
      email: String((req.body || {}).email || '').trim(),
      active: true,
      taoLuc: new Date().toISOString(),
    };
    db.insert('campuses', rec);
    db.audit(req.user, 'campus-create', { campusId: rec.id, name: rec.name });
    res.json(rec);
  });

  app.put('/api/admin/campuses/:id', onlyAdmin, (req, res) => {
    const cs = db.findCampus(req.params.id);
    if (!cs) return res.status(404).json({ error: 'Không tìm thấy cơ sở' });
    const body = req.body || {};
    const thayDoi = {};
    for (const k of ['name', 'address', 'phone', 'email']) {
      if (body[k] !== undefined) thayDoi[k] = String(body[k]).trim();
    }
    if (thayDoi.name === '') return res.status(400).json({ error: 'Vui lòng nhập tên cơ sở' });
    // Đóng một cơ sở là NGƯNG DÙNG, không xóa: nhóm lớp, hồ sơ bé và mọi thứ
    // gắn với nó vẫn còn nguyên, tra cứu lại được bất cứ lúc nào.
    if (body.active !== undefined) thayDoi.active = !!body.active;
    db.update('campuses', cs.id, thayDoi);
    db.audit(req.user, 'campus-update', { campusId: cs.id, thayDoi });
    res.json(db.findCampus(cs.id));
  });

  // Gắn một nhóm lớp vào cơ sở. Truyền campusId rỗng để gỡ ra.
  app.put('/api/admin/classes/:id/campus', onlyAdmin, (req, res) => {
    const lop = db.findClass(req.params.id);
    if (!lop) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    const campusId = String((req.body || {}).campusId || '').trim();
    if (campusId && !db.findCampus(campusId)) {
      return res.status(400).json({ error: 'Không tìm thấy cơ sở' });
    }
    db.setClassCampus(lop.id, campusId || null);
    db.audit(req.user, 'class-campus', { classId: lop.id, campusId: campusId || null });
    res.json({ classId: lop.id, campusId: campusId || null });
  });

  // Danh sách tài khoản QUẢN TRỊ, kèm cơ sở mà mỗi tài khoản bị khoá vào.
  //
  // Không có cơ sở = Cấp 1, toàn hệ thống. Có = Cấp 3, chỉ cơ sở đó.
  app.get('/api/admin/managers', onlyAdmin, (req, res) => {
    const ds = db.all('users',
      `SELECT id, username, name, title, active FROM users
       WHERE role = 'admin' AND active = 1 ORDER BY name`);
    res.json(ds.map(u => {
      const campusId = db.campusOfUser(u.id);
      return { ...u, campusId, cap: campusId ? 3 : 1 };
    }));
  });

  // Khoá một tài khoản quản trị vào một cơ sở, hoặc gỡ khoá (campusId rỗng).
  app.put('/api/admin/managers/:id/campus', onlyAdmin, (req, res) => {
    const u = db.findUser(req.params.id);
    if (!u || u.role !== 'admin') return res.status(404).json({ error: 'Không tìm thấy tài khoản quản trị này' });

    const campusId = String((req.body || {}).campusId || '').trim();
    if (campusId && !db.findCampus(campusId)) {
      return res.status(400).json({ error: 'Không tìm thấy cơ sở' });
    }

    // KHÔNG cho tự khoá chính mình vào một cơ sở.
    //
    // Người bấm nút này đang là Cấp 1. Tự khoá mình lại là mất ngay quyền nhìn
    // toàn hệ thống — kể cả quyền mở lại chính màn hình này để tự gỡ ra. Nếu
    // trường chỉ có một tài khoản quản trị, đó là khoá cửa rồi bỏ chìa vào trong.
    if (u.id === req.user.id && campusId) {
      return res.status(400).json({
        error: 'Không thể tự khoá tài khoản của mình vào một cơ sở. '
          + 'Nhờ một tài khoản quản trị toàn hệ thống khác làm việc này.',
      });
    }

    // Phải luôn còn ít nhất MỘT tài khoản Cấp 1.
    //
    // Khoá nốt tài khoản Cấp 1 cuối cùng là không còn ai mở được màn hình này
    // nữa, và cũng không còn ai nhìn thấy toàn hệ thống. Sửa lại phải đụng thẳng
    // vào cơ sở dữ liệu.
    if (campusId) {
      const conCap1 = db.all('users', `SELECT id FROM users WHERE role = 'admin' AND active = 1`)
        .filter(x => x.id !== u.id && !db.campusOfUser(x.id));
      if (!conCap1.length) {
        return res.status(400).json({
          error: 'Đây là tài khoản quản trị toàn hệ thống cuối cùng. '
            + 'Tạo thêm một tài khoản toàn hệ thống khác trước khi khoá tài khoản này vào cơ sở.',
        });
      }
    }

    db.setUserCampus(u.id, campusId || null);
    db.audit(req.user, 'manager-campus', { userId: u.id, campusId: campusId || null });
    res.json({ id: u.id, campusId: campusId || null, cap: campusId ? 3 : 1 });
  });

  app.get('/api/admin/overview', onlyAdmin, (req, res) => {
    res.json({
      school: db.school(),
      campuses: db.campuses(),
      counts: {
        classes: db.count('SELECT COUNT(*) FROM classes WHERE active = 1'),
        students: db.count('SELECT COUNT(*) FROM students WHERE active = 1'),
        teachers: db.count(`SELECT COUNT(*) FROM users WHERE role = 'teacher' AND active = 1`),
        parents: db.count(`SELECT COUNT(*) FROM users WHERE role = 'parent' AND active = 1`),
        mustChange: db.count('SELECT COUNT(*) FROM users WHERE mustChangePassword = 1 AND active = 1'),
      },
      classes: db.classes().map(c => ({
        ...c,
        ...nl.tomTat(c.id),
        campusId: db.campusOfClass(c.id),
        studentCount: db.count('SELECT COUNT(*) FROM students WHERE classId = ? AND active = 1', [c.id]),
      })),
    });
  });

  // ---------- Lớp học ----------

  // Đường CŨ "một cô một lớp": gán cô vào lớp này thì gỡ cô khỏi mọi lớp khác.
  //
  // Ba chiều ghi mà đường này phải làm đúng (gỡ cô cũ khỏi lớp, gỡ lớp cũ khỏi
  // cô mới, ghi khớp cả hai cột) đã dời vào `db.setHomeroomTeacher` — cùng chỗ
  // với bảng `class_teachers`, để không còn hai nơi cùng ghi một quan hệ.
  //
  // Giữ nguyên nghĩa cũ chứ không nới ra, vì bản giao diện cũ nằm trong điện
  // thoại đã cài app vẫn gửi trường `teacherId` với đúng nghĩa đó. Trường mầm
  // non dùng đường mới `PUT /api/admin/classes/:id/teachers` bên dưới.
  function datChuNhiem(classId, teacherIdMoi) {
    db.setHomeroomTeacher(classId, teacherIdMoi || null);
  }

  app.post('/api/admin/classes', onlyAdmin, (req, res) => {
    const { name, room, grade, teacherId, year } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập tên nhóm' });
    if (teacherId) {
      const t = db.findUser(teacherId);
      if (!t || t.role !== 'teacher') return res.status(400).json({ error: 'Giáo viên không hợp lệ' });
    }
    const school = db.school() || {};
    const rec = {
      id: db.nextId('c'),
      name: String(name).trim(),
      room: String(room || '').trim(),
      grade: Number(grade) || null,
      teacherId: teacherId || null,
      year: String(year || school.currentYear || ''),
      active: true,
    };
    db.tx(() => {
      db.insert('classes', rec);
      if (rec.teacherId) datChuNhiem(rec.id, rec.teacherId);
    });
    db.audit(req.user.id, 'class-create', rec.id, { name: rec.name });
    res.status(201).json(rec);
  });

  app.put('/api/admin/classes/:id', onlyAdmin, (req, res) => {
    const cls = db.findClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    // Tên lớp rỗng làm dòng lớp trắng trơn trên mọi màn hình mà không báo lỗi gì.
    // Đường tạo lớp đã chặn từ đầu; đường sửa thì chưa, nên chặn cho khớp.
    if (req.body.name !== undefined && !String(req.body.name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên nhóm' });
    }
    const patch = {};
    for (const k of ['name', 'room', 'year']) {
      if (req.body[k] !== undefined) patch[k] = String(req.body[k]).trim();
    }
    if (req.body.grade !== undefined) patch.grade = Number(req.body.grade) || null;
    let doiChuNhiem = false;
    if (req.body.teacherId !== undefined) {
      const t = req.body.teacherId ? db.findUser(req.body.teacherId) : null;
      if (req.body.teacherId && (!t || t.role !== 'teacher')) {
        return res.status(400).json({ error: 'Giáo viên không hợp lệ' });
      }
      patch.teacherId = req.body.teacherId || null;
      doiChuNhiem = true;
    }
    db.tx(() => {
      db.update('classes', cls.id, patch);
      if (doiChuNhiem) datChuNhiem(cls.id, patch.teacherId);
    });
    db.audit(req.user.id, 'class-update', cls.id, patch);
    res.json(db.findClass(cls.id));
  });

  // Đặt TOÀN BỘ danh sách cô phụ trách một nhóm — mô hình của trường mầm non.
  //
  // Khác đường cũ ở đúng một điểm, và đó là toàn bộ lý do nó tồn tại: gán cô vào
  // nhóm này KHÔNG gỡ cô khỏi các nhóm khác. Một cô dạy cả Chồi 2 lẫn Lá 1 là
  // chuyện bình thường ở mầm non, ở tiểu học thì không.
  app.put('/api/admin/classes/:id/teachers', onlyAdmin, (req, res) => {
    const cls = db.findClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });

    const xin = (req.body || {}).teacherIds;
    if (!Array.isArray(xin)) {
      return res.status(400).json({ error: 'Thiếu danh sách cô phụ trách nhóm' });
    }
    for (const id of xin) {
      const t = db.findUser(id);
      if (!t || t.role !== 'teacher' || t.active === false) {
        return res.status(400).json({ error: 'Danh sách có người không phải giáo viên đang làm việc' });
      }
    }
    const chinhId = (req.body || {}).chinhId || null;
    if (chinhId && !xin.includes(chinhId)) {
      return res.status(400).json({ error: 'Cô phụ trách chính phải nằm trong danh sách cô của nhóm' });
    }

    const daGhi = db.setClassTeachers(cls.id, xin, chinhId);
    db.audit(req.user.id, 'class-teachers-set', cls.id, { teacherIds: daGhi, chinhId });
    res.json({ ok: true, classId: cls.id, ...nl.tomTat(cls.id) });
  });

  // ---------- Giáo viên ----------
  app.get('/api/admin/teachers', onlyAdmin, (req, res) => {
    res.json(db.all('users', `SELECT * FROM users WHERE role = 'teacher' AND active = 1 ORDER BY name`)
      .map(({ passwordHash, ...u }) => {
        // Một cô có thể phụ trách nhiều nhóm, nên `className` (một tên) không đủ
        // nữa. Giữ lại cho màn hình cũ, thêm `classNames` + `classIds` cho mới.
        const nhom = nl.nhomCuaCo(u.id);
        return {
          ...u,
          className: nhom.map(c => c.name).join(', '),
          classNames: nhom.map(c => c.name),
          classIds: nhom.map(c => c.id),
        };
      }));
  });

  app.post('/api/admin/teachers', onlyAdmin, (req, res) => {
    const { name, title, phone, email, classId } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên giáo viên' });
    const daDung = new Set();
    const username = sinhTenDangNhap(name, phone, daDung);
    const matKhau = sinhMatKhau();
    const rec = {
      id: db.nextId('t'),
      username,
      passwordHash: password.hash(matKhau),
      role: 'teacher',
      name: String(name).trim(),
      title: String(title || 'Cô').trim(),
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      classId: classId || null,
      avatar: { emoji: '👩‍🏫', bg: '#7c5cbf' },
      mustChangePassword: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.tx(() => {
      db.insert('users', rec);
      if (classId) datChuNhiem(classId, rec.id);
    });
    db.audit(req.user.id, 'teacher-create', rec.id, { name: rec.name });
    res.status(201).json({ id: rec.id, name: rec.name, username, temporaryPassword: matKhau });
  });

  // ---------- Học sinh ----------
  app.get('/api/admin/students', onlyAdmin, (req, res) => {
    const classId = req.query.classId;
    // Mặc định chỉ trả học sinh đang học — giữ nguyên hành vi cũ cho mọi chỗ gọi.
    // Quản trị cần thấy cả em đã nghỉ thì mới gửi kèm ?keCaNghi=1, để còn nhận lại
    // được em bấm nhầm nút "Cho nghỉ học".
    const keCaNghi = String(req.query.keCaNghi || '') === '1';
    const loc = keCaNghi ? '' : ' AND active = 1';
    const rows = classId
      ? db.all('students', `SELECT * FROM students WHERE classId = ?${loc} ORDER BY name`, [classId])
      : db.all('students', `SELECT * FROM students WHERE 1 = 1${loc} ORDER BY name`);
    res.json(db.withParents(rows).map(s => ({
      ...s,
      ...db.hoSoBe(s.id),
      className: s.classId ? (db.findClass(s.classId) || {}).name || '' : '',
      parents: s.parentIds.map(id => {
        const p = db.findUser(id);
        return p ? { id: p.id, name: `${p.title} ${p.name}`, username: p.username, phone: p.phone } : null;
      }).filter(Boolean),
    })));
  });

  // Sửa thông tin học sinh, chuyển lớp, hoặc nhận lại em đã cho nghỉ.
  app.put('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const patch = {};
    for (const k of ['name', 'code', 'dob', 'gender', 'address']) {
      if (req.body[k] !== undefined) patch[k] = String(req.body[k]).trim();
    }
    // Tên rỗng làm học sinh biến mất khỏi mọi danh sách mà không ai biết em là ai
    // nữa — điểm danh, sổ liên lạc, báo cáo đều hiện một dòng trống.
    if (patch.name !== undefined && !patch.name) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên của bé' });
    }
    // Mã học sinh là thứ trường dùng để đối chiếu với sổ giấy; trùng mã thì hai em
    // khác nhau trông như một.
    if (patch.code) {
      const trung = db.first('students', 'SELECT id, name FROM students WHERE code = ? AND id != ?', [patch.code, s.id]);
      if (trung) return res.status(400).json({ error: `Mã "${patch.code}" đã dùng cho bé ${trung.name}` });
    }
    if (req.body.classId !== undefined) {
      if (req.body.classId && !db.findClass(req.body.classId)) {
        return res.status(400).json({ error: 'Nhóm lớp không tồn tại' });
      }
      patch.classId = req.body.classId || null;
    }
    // Ghi vết chuyển lớp TRƯỚC khi ghi đè, để còn đọc được lớp cũ. Không có bước
    // này thì lịch sử lớp chỉ đúng với em học trọn năm, còn em chuyển lớp giữa
    // năm sẽ mất đoạn đầu.
    if (patch.classId !== undefined && patch.classId !== s.classId) {
      lsl.ghiChuyenLop(s.id, patch.classId, lsl.homNay());
    }
    // Nhận lại em đã cho nghỉ. Xóa luôn ngày nghỉ để hồ sơ không mâu thuẫn:
    // đang học mà vẫn còn ngày rời trường.
    if (req.body.active !== undefined) {
      patch.active = req.body.active ? 1 : 0;
      if (patch.active) patch.leftAt = null;
      if (!patch.active) lsl.ghiRoiLop(s.id, lsl.homNay());
      else if (s.classId) lsl.baoDamCoKhoang(s.id);
    }
    db.update('students', s.id, patch);

    // Hồ sơ mở rộng và người liên hệ khẩn cấp nằm ở bảng riêng, nên ghi riêng.
    // Chỉ ghi khi màn hình có gửi lên: không gửi nghĩa là không đụng tới, chứ
    // KHÔNG phải là xóa trắng — một màn hình cũ chưa biết mấy trường này mà lưu
    // hồ sơ bé thì không được làm mất số định danh và số gọi khẩn cấp.
    if (req.body.soDinhDanh !== undefined || req.body.tienSuBenh !== undefined) {
      db.luuHoSoBe(s.id, { soDinhDanh: req.body.soDinhDanh, tienSuBenh: req.body.tienSuBenh });
    }
    if (req.body.lienHeKhanCap !== undefined) {
      db.datLienHeKhanCap(s.id, req.body.lienHeKhanCap);
    }

    db.audit(req.user.id, 'student-update', s.id, patch);
    res.json({ ...db.findStudent(s.id), ...db.hoSoBe(s.id) });
  });

  // Học sinh chuyển trường / nghỉ học: đánh dấu ngừng hoạt động thay vì xóa,
  // để dữ liệu học tập của năm cũ vẫn tra cứu được.
  app.delete('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    lsl.ghiRoiLop(s.id, lsl.homNay());
    db.update('students', s.id, { active: false, leftAt: new Date().toISOString().slice(0, 10) });
    db.audit(req.user.id, 'student-deactivate', s.id, { name: s.name });
    res.json({ ok: true });
  });

  // ---------- Nhập danh sách từ tệp CSV ----------
  //
  // Luôn chạy hai bước: xem trước để soát lỗi, rồi mới ghi thật. Nhập nhầm 300
  // học sinh rồi sửa tay là cơn ác mộng, nên bắt buộc phải xem trước.
  // Chìa khóa nhận ra "vẫn là em này" khi tệp không có mã học sinh.
  //
  // Trường nhỏ hay nhập lại cả tệp cũ kèm vài em mới, và nhiều tệp không có cột
  // mã. Trước đây mỗi lần nhập lại là mỗi lần sinh thêm một bản sao của cả
  // trường — kèm tài khoản phụ huynh mới — mà không ai được báo gì.
  //
  // Chỉ dùng để SO SÁNH. Ngày sinh vẫn được lưu xuống đúng như người dùng gõ.
  function chuanNgaySinh(s) {
    const t = String(s || '').trim();
    if (!t) return '';
    let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);          // 2018-05-01
    if (!m) {
      const d = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);       // 01/05/2018
      if (d) m = [t, d[3], d[2], d[1]];
    }
    if (!m) return t.toLowerCase();
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  function khoaHocSinh(hoTen, ngaySinh, tenLop) {
    return [
      csv.boDau(String(hoTen || '')).toLowerCase().replace(/\s+/g, ' ').trim(),
      chuanNgaySinh(ngaySinh),
      csv.boDau(String(tenLop || '')).toLowerCase().replace(/\s+/g, ' ').trim(),
    ].join('|');
  }

  function phanTich(text) {
    const { rows } = csv.parse(text);
    const daDungTen = new Set();
    const ketQua = [];
    const maDaGap = new Set();

    // Chụp một lần danh sách em đang học để đối chiếu, thay vì truy vấn mỗi dòng.
    const daCo = new Map();
    for (const s of db.all('students', 'SELECT name, dob, classId FROM students WHERE active = 1')) {
      const ten = s.classId ? (db.findClass(s.classId) || {}).name || '' : '';
      daCo.set(khoaHocSinh(s.name, s.dob, ten), ten);
    }
    const khoaTrongTep = new Map();

    for (const row of rows) {
      // Danh sách tên cột NHẬN VÀO cố ý rộng: trường gửi tệp Excel có sẵn, và
      // tệp đó rất có thể còn ghi "Tên học sinh", "Lớp" theo mẫu cũ của Phòng.
      // Từ chối một tệp thật vì cái tên cột là bắt nhà trường gõ lại 300 dòng.
      // Chỗ XUẤT RA (tệp mẫu, câu báo lỗi) thì nói đúng tiếng mầm non.
      const hoTen = lay(row, 'Họ tên', 'Ho ten', 'Họ và tên', 'Tên bé', 'Tên học sinh', 'name');
      const tenLop = lay(row, 'Nhóm', 'Nhom', 'Nhóm lớp', 'Lớp', 'Lop', 'class');
      const phHoTen = lay(row, 'Họ tên phụ huynh', 'Phụ huynh', 'Ho ten phu huynh', 'parent');
      const phSdt = lay(row, 'Điện thoại', 'SĐT', 'SDT', 'Số điện thoại', 'phone');
      const ma = lay(row, 'Mã của bé', 'Mã bé', 'Mã học sinh', 'Mã HS', 'Ma HS', 'code');
      const ngaySinh = lay(row, 'Ngày sinh', 'Ngay sinh', 'dob');

      const loi = [];
      if (!hoTen) loi.push('thiếu họ tên của bé');
      if (!tenLop) loi.push('thiếu nhóm lớp');
      if (!phHoTen) loi.push('thiếu họ tên phụ huynh');
      if (ma && maDaGap.has(ma)) loi.push(`mã của bé "${ma}" bị lặp trong tệp`);
      if (ma) maDaGap.add(ma);
      if (ma && db.first('students', 'SELECT id FROM students WHERE code = ?', [ma])) {
        loi.push(`mã của bé "${ma}" đã có trong hệ thống`);
      }

      // Trùng là CẢNH BÁO, không phải lỗi — để riêng khỏi `loi`. Có trường hợp
      // thật sự có hai em trùng cả họ tên, ngày sinh lẫn lớp, và quản trị phải
      // được quyền nói "đúng, cứ nhập".
      let trung = null;
      if (hoTen && tenLop && !loi.length) {
        const khoa = khoaHocSinh(hoTen, ngaySinh, tenLop);
        if (khoaTrongTep.has(khoa)) {
          trung = `trùng với dòng ${khoaTrongTep.get(khoa)} ngay trong tệp này`;
        } else if (daCo.has(khoa)) {
          trung = `đã có trong hệ thống (${daCo.get(khoa) || 'chưa xếp nhóm'})`;
        }
        if (!khoaTrongTep.has(khoa)) khoaTrongTep.set(khoa, row.__line);
      }

      const lop = tenLop
        ? db.first('classes', 'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND active = 1', [tenLop])
        : null;

      ketQua.push({
        line: row.__line,
        hoTen, tenLop, ma,
        phHoTen, phSdt,
        phEmail: lay(row, 'Email', 'Email phụ huynh', 'email'),
        ngaySinh,
        gioiTinh: lay(row, 'Giới tính', 'Gioi tinh', 'gender'),
        diaChi: lay(row, 'Địa chỉ', 'Dia chi', 'address'),
        classId: lop ? lop.id : null,
        taoLopMoi: !!tenLop && !lop,
        username: phHoTen ? sinhTenDangNhap(phHoTen, phSdt, daDungTen) : '',
        loi,
        trung,
      });
    }
    return ketQua;
  }

  // Từ chối cả tệp khi chữ có dấu đã hỏng vì lưu sai bảng mã.
  //
  // Phải chặn ở CẢ HAI đường: đường ghi thật đọc lại nội dung tệp độc lập với
  // đường xem trước, nên chỉ chặn ở xem trước là còn lối vòng qua. Chặn ở trình
  // duyệt cũng không thay được chỗ này — đó chỉ là để báo sớm cho đỡ chờ mạng.
  //
  // Từ chối chứ không tự đoán rồi chuyển đổi bảng mã: đoán sai thì tên học sinh
  // lưu xuống vẫn sai mà không ai biết, còn từ chối thì người nhập sửa tệp một
  // phút là xong và chắc chắn đúng.
  function chanBangMaSai(text, res) {
    const kt = csv.kiemTraBangMa(text);
    if (kt.ok) return false;
    res.status(400).json({
      error: 'Tệp bị lỗi phông chữ tiếng Việt: chữ có dấu đã biến thành ký tự lạ '
        + `(dòng ${kt.dongDau}: "${kt.viDu}"). Xin mở lại tệp bằng Excel, chọn `
        + 'Tệp → Lưu dưới dạng → kiểu "CSV UTF-8 (Comma delimited) (*.csv)", rồi tải lên lần nữa.',
    });
    return true;
  }

  app.post('/api/admin/import/preview', onlyAdmin, (req, res) => {
    const text = String((req.body || {}).csv || '');
    if (!text.trim()) return res.status(400).json({ error: 'Chưa có nội dung tệp' });
    if (chanBangMaSai(text, res)) return;
    const rows = phanTich(text);
    if (!rows.length) return res.status(400).json({ error: 'Tệp không có dòng dữ liệu nào' });
    res.json({
      total: rows.length,
      loi: rows.filter(r => r.loi.length).length,
      // Trường riêng, KHÔNG gộp vào `loi`: dòng trùng vẫn là dòng hợp lệ, chỉ là
      // mặc định không nhập. Gộp vào sẽ làm sai mọi chỗ đang tính "số dòng nhập
      // được = total - loi".
      trung: rows.filter(r => r.trung).length,
      lopMoi: [...new Set(rows.filter(r => r.taoLopMoi).map(r => r.tenLop))],
      rows,
    });
  });

  app.post('/api/admin/import/commit', onlyAdmin, (req, res) => {
    const text = String((req.body || {}).csv || '');
    if (!text.trim()) return res.status(400).json({ error: 'Chưa có nội dung tệp' });
    if (chanBangMaSai(text, res)) return;
    const rows = phanTich(text);
    // Mặc định BỎ QUA dòng trùng thay vì chặn cả tệp. Chặn cả tệp thì bản giao
    // diện cũ còn trong bộ nhớ đệm của điện thoại sẽ báo lỗi mà không nói được
    // vì sao; bỏ qua thì phần còn lại vẫn nhập được và số liệu trả về nói rõ.
    const nhapCaTrung = (req.body || {}).nhapCaTrung === true;
    const trungBiBoQua = nhapCaTrung ? [] : rows.filter(r => !r.loi.length && r.trung);
    const hopLe = rows.filter(r => !r.loi.length && (nhapCaTrung || !r.trung));
    if (!hopLe.length) {
      return res.status(400).json({
        error: trungBiBoQua.length
          ? `Tất cả ${trungBiBoQua.length} bé trong tệp đều đã có trong hệ thống nên không có gì để nhập.`
          : 'Không có dòng nào hợp lệ để nhập',
      });
    }

    const school = db.school() || {};
    const taiKhoan = [];   // để xuất phiếu phát cho phụ huynh

    db.tx(() => {
      // Tạo trước các lớp chưa có.
      const lopTheoTen = new Map();
      for (const r of hopLe) {
        if (!r.taoLopMoi || lopTheoTen.has(r.tenLop)) continue;
        const id = db.nextId('c');
        db.insert('classes', {
          id, name: r.tenLop, room: '', grade: Number((r.tenLop.match(/\d+/) || [])[0]) || null,
          teacherId: null, year: school.currentYear || '', active: true,
        });
        lopTheoTen.set(r.tenLop, id);
      }

      for (const r of hopLe) {
        const classId = r.classId || lopTheoTen.get(r.tenLop) || null;

        // Gộp phụ huynh trùng số điện thoại — nhà có hai con thì dùng chung một tài khoản.
        let parent = r.phSdt
          ? db.first('users', `SELECT * FROM users WHERE role = 'parent' AND phone = ? AND active = 1`, [r.phSdt])
          : null;
        let matKhau = null;
        if (!parent) {
          matKhau = sinhMatKhau();
          parent = {
            id: db.nextId('p'),
            username: r.username,
            passwordHash: password.hash(matKhau),
            role: 'parent',
            name: r.phHoTen,
            title: '',
            phone: r.phSdt,
            email: r.phEmail,
            classId: null,
            avatar: { emoji: '👤', bg: '#5b6ceb' },
            mustChangePassword: true,
            active: true,
            createdAt: new Date().toISOString(),
          };
          db.insert('users', parent);
        }

        const student = {
          id: db.nextId('s'),
          code: r.ma || null,
          name: r.hoTen,
          dob: r.ngaySinh || null,
          gender: r.gioiTinh || null,
          classId,
          avatar: { emoji: /nữ|nu/i.test(r.gioiTinh) ? '👧' : '👦', bg: '#3f6ad8' },
          address: r.diaChi,
          ethnicity: '', bloodType: '', allergies: '',
          active: true, leftAt: null,
          createdAt: new Date().toISOString(),
        };
        db.insert('students', student);
        if (classId) lsl.moKhoang(student.id, classId, lsl.homNay());
        db.run('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)',
          [student.id, parent.id]);

        taiKhoan.push({
          hocSinh: student.name,
          lop: r.tenLop,
          phuHuynh: parent.name,
          username: parent.username,
          matKhau: matKhau || '(đã có tài khoản từ trước)',
        });
      }
    });

    db.audit(req.user.id, 'import-students', null, {
      soDong: hopLe.length,
      boQuaTrung: trungBiBoQua.length,
      nhapCaTrung,
    });
    res.json({
      ok: true,
      imported: hopLe.length,
      boQua: rows.length - hopLe.length,
      boQuaTrung: trungBiBoQua.length,
      taiKhoan,
    });
  });

  // Tệp CSV mẫu để nhà trường điền theo.
  app.get('/api/admin/import/template', onlyAdmin, (req, res) => {
    const headers = ['Mã của bé', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Nhóm', 'Địa chỉ',
      'Họ tên phụ huynh', 'Điện thoại', 'Email'];
    const namSinhMau = new Date().getFullYear() - 4;   // bé nhóm Chồi, 4 tuổi
    const mau = [{
      'Mã của bé': 'MN2026001', 'Họ tên': 'Nguyễn Bảo An', 'Ngày sinh': `${namSinhMau}-04-12`,
      'Giới tính': 'Nữ', 'Nhóm': 'Chồi 2', 'Địa chỉ': '12 Hoa Phượng, Q. Phú Nhuận',
      'Họ tên phụ huynh': 'Lê Thị Thu Hà', 'Điện thoại': '0912345678', 'Email': 'thuha@gmail.com',
    }];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-danh-sach-be.csv"');
    res.send(csv.stringify(headers, mau));
  });

  // ---------- Nhật ký thao tác ----------
  app.get('/api/admin/audit', onlyAdmin, (req, res) => {
    const rows = db.all('audit_log', 'SELECT * FROM audit_log ORDER BY at DESC LIMIT 200');
    res.json(rows.map(r => {
      const u = r.userId ? db.findUser(r.userId) : null;
      return {
        at: r.at,
        who: u ? `${u.title} ${u.name}` : '(không rõ)',
        action: r.action,
        target: r.target,
        detail: r.detail,
      };
    }));
  });
};
