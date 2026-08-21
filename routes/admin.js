// Phân hệ Quản trị: quản lý lớp, giáo viên, học sinh và nhập danh sách đầu năm.
//
// Đây là phần cho phép nhà trường tự đưa dữ liệu thật vào hệ thống — không có
// nó thì không thể tạo hàng trăm tài khoản phụ huynh.
const db = require('../lib/db');
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
  app.get('/api/admin/overview', onlyAdmin, (req, res) => {
    res.json({
      school: db.school(),
      counts: {
        classes: db.count('SELECT COUNT(*) FROM classes WHERE active = 1'),
        students: db.count('SELECT COUNT(*) FROM students WHERE active = 1'),
        teachers: db.count(`SELECT COUNT(*) FROM users WHERE role = 'teacher' AND active = 1`),
        parents: db.count(`SELECT COUNT(*) FROM users WHERE role = 'parent' AND active = 1`),
        mustChange: db.count('SELECT COUNT(*) FROM users WHERE mustChangePassword = 1 AND active = 1'),
      },
      classes: db.classes().map(c => {
        const t = c.teacherId ? db.findUser(c.teacherId) : null;
        return {
          ...c,
          teacherName: t ? `${t.title} ${t.name}` : '',
          studentCount: db.count('SELECT COUNT(*) FROM students WHERE classId = ? AND active = 1', [c.id]),
        };
      }),
    });
  });

  // ---------- Lớp học ----------

  // Quan hệ "giáo viên chủ nhiệm ↔ lớp" được lưu ở HAI chỗ: `classes.teacherId`
  // và `users.classId`. Quyền đọc hồ sơ học sinh đi theo `users.classId`, còn
  // màn hình quản trị đọc `classes.teacherId` — nên ghi lệch hai chỗ này sinh ra
  // hai lỗi thật đã gặp:
  //   - Đổi chủ nhiệm mà chỉ gán cho người mới: giáo viên cũ giữ NGUYÊN quyền
  //     đọc và ghi hồ sơ cả lớp cũ, nhà trường không có cách nào thu hồi.
  //   - Tạo lớp kèm chủ nhiệm mà chỉ ghi `classes.teacherId`: màn hình quản trị
  //     hiện đúng tên cô, nhưng cô đăng nhập vào lại thấy "Sĩ số 0".
  // Mọi chỗ đổi chủ nhiệm đều phải đi qua hàm này, đừng ghi tay từng bảng.
  function datChuNhiem(classId, teacherIdMoi) {
    const dangGan = db.all('users',
      `SELECT id FROM users WHERE role = 'teacher' AND classId = ?`, [classId]);
    for (const t of dangGan) {
      if (t.id !== teacherIdMoi) db.update('users', t.id, { classId: null });
    }
    if (teacherIdMoi) db.update('users', teacherIdMoi, { classId });
    db.update('classes', classId, { teacherId: teacherIdMoi || null });
  }

  app.post('/api/admin/classes', onlyAdmin, (req, res) => {
    const { name, room, grade, teacherId, year } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập tên lớp' });
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
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy lớp' });
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

  // ---------- Giáo viên ----------
  app.get('/api/admin/teachers', onlyAdmin, (req, res) => {
    res.json(db.all('users', `SELECT * FROM users WHERE role = 'teacher' AND active = 1 ORDER BY name`)
      .map(({ passwordHash, ...u }) => ({
        ...u,
        className: u.classId ? (db.findClass(u.classId) || {}).name || '' : '',
      })));
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
    const rows = classId
      ? db.all('students', 'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId])
      : db.all('students', 'SELECT * FROM students WHERE active = 1 ORDER BY name');
    res.json(db.withParents(rows).map(s => ({
      ...s,
      className: s.classId ? (db.findClass(s.classId) || {}).name || '' : '',
      parents: s.parentIds.map(id => {
        const p = db.findUser(id);
        return p ? { id: p.id, name: `${p.title} ${p.name}`, username: p.username, phone: p.phone } : null;
      }).filter(Boolean),
    })));
  });

  // Chuyển học sinh sang lớp khác.
  app.put('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    const patch = {};
    for (const k of ['name', 'code', 'dob', 'gender', 'address']) {
      if (req.body[k] !== undefined) patch[k] = String(req.body[k]).trim();
    }
    if (req.body.classId !== undefined) {
      if (req.body.classId && !db.findClass(req.body.classId)) {
        return res.status(400).json({ error: 'Lớp không tồn tại' });
      }
      patch.classId = req.body.classId || null;
    }
    db.update('students', s.id, patch);
    db.audit(req.user.id, 'student-update', s.id, patch);
    res.json(db.findStudent(s.id));
  });

  // Học sinh chuyển trường / nghỉ học: đánh dấu ngừng hoạt động thay vì xóa,
  // để dữ liệu học tập của năm cũ vẫn tra cứu được.
  app.delete('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    db.update('students', s.id, { active: false, leftAt: new Date().toISOString().slice(0, 10) });
    db.audit(req.user.id, 'student-deactivate', s.id, { name: s.name });
    res.json({ ok: true });
  });

  // ---------- Nhập danh sách từ tệp CSV ----------
  //
  // Luôn chạy hai bước: xem trước để soát lỗi, rồi mới ghi thật. Nhập nhầm 300
  // học sinh rồi sửa tay là cơn ác mộng, nên bắt buộc phải xem trước.
  function phanTich(text) {
    const { rows } = csv.parse(text);
    const daDungTen = new Set();
    const ketQua = [];
    const maDaGap = new Set();

    for (const row of rows) {
      const hoTen = lay(row, 'Họ tên', 'Ho ten', 'Họ và tên', 'Tên học sinh', 'name');
      const tenLop = lay(row, 'Lớp', 'Lop', 'class');
      const phHoTen = lay(row, 'Họ tên phụ huynh', 'Phụ huynh', 'Ho ten phu huynh', 'parent');
      const phSdt = lay(row, 'Điện thoại', 'SĐT', 'SDT', 'Số điện thoại', 'phone');
      const ma = lay(row, 'Mã học sinh', 'Mã HS', 'Ma HS', 'code');

      const loi = [];
      if (!hoTen) loi.push('thiếu họ tên học sinh');
      if (!tenLop) loi.push('thiếu lớp');
      if (!phHoTen) loi.push('thiếu họ tên phụ huynh');
      if (ma && maDaGap.has(ma)) loi.push(`mã học sinh "${ma}" bị lặp trong tệp`);
      if (ma) maDaGap.add(ma);
      if (ma && db.first('students', 'SELECT id FROM students WHERE code = ?', [ma])) {
        loi.push(`mã học sinh "${ma}" đã có trong hệ thống`);
      }

      const lop = tenLop
        ? db.first('classes', 'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND active = 1', [tenLop])
        : null;

      ketQua.push({
        line: row.__line,
        hoTen, tenLop, ma,
        phHoTen, phSdt,
        phEmail: lay(row, 'Email', 'Email phụ huynh', 'email'),
        ngaySinh: lay(row, 'Ngày sinh', 'Ngay sinh', 'dob'),
        gioiTinh: lay(row, 'Giới tính', 'Gioi tinh', 'gender'),
        diaChi: lay(row, 'Địa chỉ', 'Dia chi', 'address'),
        classId: lop ? lop.id : null,
        taoLopMoi: !!tenLop && !lop,
        username: phHoTen ? sinhTenDangNhap(phHoTen, phSdt, daDungTen) : '',
        loi,
      });
    }
    return ketQua;
  }

  app.post('/api/admin/import/preview', onlyAdmin, (req, res) => {
    const text = String((req.body || {}).csv || '');
    if (!text.trim()) return res.status(400).json({ error: 'Chưa có nội dung tệp' });
    const rows = phanTich(text);
    if (!rows.length) return res.status(400).json({ error: 'Tệp không có dòng dữ liệu nào' });
    res.json({
      total: rows.length,
      loi: rows.filter(r => r.loi.length).length,
      lopMoi: [...new Set(rows.filter(r => r.taoLopMoi).map(r => r.tenLop))],
      rows,
    });
  });

  app.post('/api/admin/import/commit', onlyAdmin, (req, res) => {
    const text = String((req.body || {}).csv || '');
    if (!text.trim()) return res.status(400).json({ error: 'Chưa có nội dung tệp' });
    const rows = phanTich(text);
    const hopLe = rows.filter(r => !r.loi.length);
    if (!hopLe.length) return res.status(400).json({ error: 'Không có dòng nào hợp lệ để nhập' });

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

    db.audit(req.user.id, 'import-students', null, { soDong: hopLe.length });
    res.json({
      ok: true,
      imported: hopLe.length,
      boQua: rows.length - hopLe.length,
      taiKhoan,
    });
  });

  // Tệp CSV mẫu để nhà trường điền theo.
  app.get('/api/admin/import/template', onlyAdmin, (req, res) => {
    const headers = ['Mã học sinh', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Lớp', 'Địa chỉ',
      'Họ tên phụ huynh', 'Điện thoại', 'Email'];
    const mau = [{
      'Mã học sinh': 'HS2026001', 'Họ tên': 'Nguyễn Minh Khang', 'Ngày sinh': '2018-04-12',
      'Giới tính': 'Nam', 'Lớp': 'Lớp 3A', 'Địa chỉ': '12 Hoa Phượng, Q. Phú Nhuận',
      'Họ tên phụ huynh': 'Lê Thị Thu Hà', 'Điện thoại': '0912345678', 'Email': 'thuha@gmail.com',
    }];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-danh-sach-hoc-sinh.csv"');
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
