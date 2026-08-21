// Chuyển năm học: lên lớp toàn trường, tiếp nhận khối mới, xử lý học sinh ra trường.
//
// Đây là việc làm mỗi năm một lần vào cuối tháng 6, ảnh hưởng tới toàn bộ dữ
// liệu nên luôn chạy hai bước: xem trước rồi mới thực hiện, và mọi thay đổi nằm
// trong một giao dịch — hoặc xong trọn vẹn, hoặc không đổi gì cả.
const db = require('../lib/db');
const lsl = require('../lib/lich-su-lop');
const { requireRole } = require('../lib/auth');

const onlyAdmin = requireRole('admin');

// "2026-2027" → "2027-2028"
function namKeTiep(nam) {
  const m = String(nam || '').match(/^(\d{4})-(\d{4})$/);
  if (!m) {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }
  return `${Number(m[1]) + 1}-${Number(m[2]) + 1}`;
}

// Lớp năm sau của một lớp: giữ nguyên chữ cái, tăng khối lên một.
// "Lớp 3A" → "Lớp 4A". Khối cuối cấp thì không có lớp kế tiếp.
function tenLopKeTiep(ten, khoiToiDa) {
  const m = String(ten || '').match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return null;
  const khoi = Number(m[2]);
  if (khoi >= khoiToiDa) return null;   // ra trường
  return `${m[1]}${khoi + 1}${m[3]}`;
}

module.exports = (app) => {
  // Xem trước việc chuyển năm học: lớp nào lên lớp nào, bao nhiêu em ra trường.
  app.get('/api/schoolyear/preview', onlyAdmin, (req, res) => {
    const school = db.school() || {};
    const khoiToiDa = Number(req.query.khoiToiDa) || 5;   // tiểu học 5 khối
    // Kiểm định năm học nhận từ tham số truy vấn. Đường ghi thật đã kiểm rồi,
    // đường xem trước thì chưa — mà giá trị này được trả về rồi hiện thẳng lên
    // màn hình quản trị, nên chuỗi lạ lọt vào đây là chuỗi lạ hiện trên màn hình.
    const namMoi = /^\d{4}-\d{4}$/.test(String(req.query.namMoi || ''))
      ? String(req.query.namMoi)
      : namKeTiep(school.currentYear);

    const lop = db.classes();
    const buoc = lop.map(c => {
      const tenMoi = tenLopKeTiep(c.name, khoiToiDa);
      const siSo = db.count('SELECT COUNT(*) FROM students WHERE classId = ? AND active = 1', [c.id]);
      const lopDich = tenMoi
        ? db.first('classes', 'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND active = 1', [tenMoi])
        : null;
      return {
        classId: c.id,
        tenHienTai: c.name,
        khoi: c.grade,
        siSo,
        tenLopMoi: tenMoi,
        raTruong: !tenMoi,
        taoLopMoi: !!tenMoi && !lopDich,
        lopDichId: lopDich ? lopDich.id : null,
      };
    });

    res.json({
      namHienTai: school.currentYear || '',
      namMoi,
      khoiToiDa,
      buoc,
      tongLenLop: buoc.filter(b => !b.raTruong).reduce((s, b) => s + b.siSo, 0),
      tongRaTruong: buoc.filter(b => b.raTruong).reduce((s, b) => s + b.siSo, 0),
    });
  });

  // Thực hiện chuyển năm học.
  app.post('/api/schoolyear/promote', onlyAdmin, (req, res) => {
    const school = db.school() || {};
    const khoiToiDa = Number(req.body.khoiToiDa) || 5;
    const namMoi = String(req.body.namMoi || namKeTiep(school.currentYear)).trim();
    if (!/^\d{4}-\d{4}$/.test(namMoi)) {
      return res.status(400).json({ error: 'Năm học phải có dạng 2027-2028' });
    }
    if (namMoi === school.currentYear) {
      return res.status(400).json({ error: 'Năm học mới phải khác năm học hiện tại' });
    }

    const ketQua = { lenLop: 0, raTruong: 0, lopTao: 0, lopDong: 0 };
    const ngayChuyen = new Date().toISOString().slice(0, 10);

    db.tx(() => {
      const lopCu = db.classes();
      const lopMoiTheoTen = new Map();

      // Tạo trước các lớp của năm mới.
      for (const c of lopCu) {
        const tenMoi = tenLopKeTiep(c.name, khoiToiDa);
        if (!tenMoi || lopMoiTheoTen.has(tenMoi)) continue;
        const daCo = db.first('classes',
          'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND year = ?', [tenMoi, namMoi]);
        if (daCo) { lopMoiTheoTen.set(tenMoi, daCo.id); continue; }
        const id = db.nextId('c');
        db.insert('classes', {
          id, name: tenMoi, room: c.room, grade: (Number(c.grade) || 0) + 1,
          teacherId: null,      // phân công lại giáo viên chủ nhiệm cho năm mới
          year: namMoi, active: true,
        });
        lopMoiTheoTen.set(tenMoi, id);
        ketQua.lopTao++;
      }

      // Chuyển học sinh.
      for (const c of lopCu) {
        const tenMoi = tenLopKeTiep(c.name, khoiToiDa);
        const hocSinh = db.all('students',
          'SELECT id FROM students WHERE classId = ? AND active = 1', [c.id]);

        // GHI LỊCH SỬ LỚP TRƯỚC KHI GHI ĐÈ.
        //
        // Học sinh chỉ có một trường classId duy nhất. Vài dòng bên dưới sẽ ghi
        // đè nó bằng lớp của năm mới, và sau đó không còn cách nào biết năm vừa
        // rồi em học lớp nào. Mỗi lần chuyển năm trôi qua mà không ghi lại là
        // mất thêm một năm thông tin KHÔNG lấy lại được.
        for (const s of hocSinh) lsl.baoDamCoKhoang(s.id);

        if (!tenMoi) {
          // Khối cuối cấp: học sinh ra trường, giữ lại dữ liệu để tra cứu.
          for (const s of hocSinh) {
            lsl.ghiRoiLop(s.id, ngayChuyen);
            db.update('students', s.id, { active: false, leftAt: ngayChuyen });
            ketQua.raTruong++;
          }
        } else {
          const dichId = lopMoiTheoTen.get(tenMoi);
          for (const s of hocSinh) {
            lsl.ghiChuyenLop(s.id, dichId, ngayChuyen);
            db.update('students', s.id, { classId: dichId });
            ketQua.lenLop++;
          }
        }

        // Đóng lớp của năm cũ, dữ liệu học tập vẫn tra cứu được qua học sinh.
        db.update('classes', c.id, { active: false });
        ketQua.lopDong++;

        // Giáo viên chủ nhiệm tạm thời chưa gắn lớp nào, chờ phân công lại.
        if (c.teacherId) db.update('users', c.teacherId, { classId: null });
      }

      // Cập nhật năm học hiện hành của trường.
      const years = Array.isArray(school.years) ? [...school.years] : [];
      if (!years.includes(namMoi)) years.push(namMoi);
      db.setSchool({ ...school, currentYear: namMoi, years });
    });

    db.audit(req.user.id, 'schoolyear-promote', null, { namMoi, ...ketQua });
    res.json({
      ok: true,
      namMoi,
      ...ketQua,
      message: `Đã chuyển sang năm học ${namMoi}: ${ketQua.lenLop} học sinh lên lớp, ` +
        `${ketQua.raTruong} học sinh ra trường, tạo ${ketQua.lopTao} lớp mới. ` +
        'Hãy phân công lại giáo viên chủ nhiệm cho các lớp.',
    });
  });

  // Tra cứu học sinh đã ra trường hoặc chuyển đi.
  app.get('/api/schoolyear/alumni', onlyAdmin, (req, res) => {
    const rows = db.all('students',
      'SELECT * FROM students WHERE active = 0 ORDER BY leftAt DESC, name LIMIT 500');
    res.json(db.withParents(rows).map(s => ({
      ...s,
      className: s.classId ? (db.findClass(s.classId) || {}).name || '' : '',
    })));
  });

  // Lịch sử lớp của một học sinh qua các năm.
  //
  // Đường ĐỌC cho phần dữ liệu đang được ghi ở trên. Có đường đọc thì nhà trường
  // kiểm chứng được là dữ liệu thật sự đang được ghi, thay vì tin vào một bảng
  // chỉ ghi mà không ai nhìn thấy bao giờ.
  app.get('/api/schoolyear/lich-su-lop', (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học sinh này' });
    }
    lsl.baoDamCoKhoang(studentId);
    res.json(lsl.khoangCuaHocSinh(studentId).map(k => ({
      year: k.year,
      classId: k.classId,
      className: k.className,
      tu: k.tu,
      den: k.den,
      hienTai: !k.den,
    })));
  });
};

module.exports.tenLopKeTiep = tenLopKeTiep;
module.exports.namKeTiep = namKeTiep;
