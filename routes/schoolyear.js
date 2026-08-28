// Chuyển năm học: lên lớp toàn trường, tiếp nhận khối mới, xử lý học sinh ra trường.
//
// Đây là việc làm mỗi năm một lần vào cuối tháng 6, ảnh hưởng tới toàn bộ dữ
// liệu nên luôn chạy hai bước: xem trước rồi mới thực hiện, và mọi thay đổi nằm
// trong một giao dịch — hoặc xong trọn vẹn, hoặc không đổi gì cả.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const lsl = require('../lib/lich-su-lop');
const { requireRole } = require('../lib/auth');

const onlyAdmin = requireRole('admin');

// "2026-2027" → "2027-2028"
function namKeTiep(nam) {
  const m = String(nam || '').match(/^(\d{4})-(\d{4})$/);
  if (!m) {
    const y = Number(ngay.homNay().slice(0, 4));
    return `${y}-${y + 1}`;
  }
  return `${Number(m[1]) + 1}-${Number(m[2]) + 1}`;
}

// Lớp năm sau của một lớp: giữ nguyên chữ cái, tăng khối lên một.
// "Lớp 3A" → "Lớp 4A". Khối cuối cấp thì không có lớp kế tiếp.
// Bậc mầm non đi theo LỚP TUỔI, không theo số: Nhà trẻ → Mầm → Chồi → Lá, hết
// bậc Lá là bé vào lớp 1.
//
// Con số phía sau tên nhóm ("Chồi 2") là nhóm SONG SONG thứ mấy trong cùng một
// bậc, KHÔNG phải khối lớp. Quy tắc tăng số của tiểu học vì thế sai hoàn toàn ở
// đây: nó biến "Chồi 2" thành "Chồi 3" — một bậc không tồn tại — và cho "Lá 1"
// lên "Lá 2" trong khi thực tế bé rời trường vào lớp 1.
const BAC_MAM_NON = ['Nhà trẻ', 'Mầm', 'Chồi', 'Lá'];

// Trả về ba thứ khác nhau, cố ý:
//   chuỗi     → tên nhóm của năm sau
//   null      → hết bậc, bé vào lớp 1 (ra trường)
//   undefined → KHÔNG phải tên nhóm mầm non, để quy tắc theo số xử lý tiếp
function nhomKeTiepMamNon(ten) {
  const t = String(ten || '').trim();
  for (let i = 0; i < BAC_MAM_NON.length; i++) {
    // Khớp trọn tên: "Lá 1" tách thành bậc "Lá" và phần đuôi "1". Không dùng \b
    // vì tên bậc kết thúc bằng chữ có dấu, mà \b của JS chỉ hiểu chữ ASCII.
    const m = t.match(new RegExp(`^${BAC_MAM_NON[i]}(?:\\s+(.*))?$`, 'i'));
    if (!m) continue;
    if (i === BAC_MAM_NON.length - 1) return null;   // hết Lá → vào lớp 1
    return `${BAC_MAM_NON[i + 1]}${m[1] ? ` ${m[1]}` : ''}`;
  }
  return undefined;
}

// Tên lớp/nhóm của năm sau. `null` nghĩa là cuối cấp, học sinh ra trường.
//
// Hai quy tắc, thử bậc mầm non TRƯỚC: nhóm mầm non đi theo bậc, còn lại thì
// tăng số cuối tên như app 1 vẫn làm ("Lớp 3A" → "Lớp 4A"). Quy tắc cũ được giữ
// nguyên vẹn chứ không thay, vì một trường có thể còn lớp đặt tên theo kiểu cũ,
// và `khoiToiDa` chỉ có nghĩa với quy tắc đó.
function tenLopKeTiep(ten, khoiToiDa) {
  const mamNon = nhomKeTiepMamNon(ten);
  if (mamNon !== undefined) return mamNon;

  const m = String(ten || '').match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return null;
  const khoi = Number(m[2]);
  if (khoi >= khoiToiDa) return null;   // ra trường
  return `${m[1]}${khoi + 1}${m[3]}`;
}

// Chặn một việc ảnh hưởng TOÀN TRƯỜNG khi người bấm chỉ phụ trách một cơ sở.
// Trả về true nghĩa là ĐÃ gửi lỗi. Cùng luật với routes/admin.js: `phamViCoSo`
// trả null nghĩa là không hạn chế (Cấp 1, hoặc trường chưa khai cơ sở nào).
function chiCap1(req, res, viec) {
  if (db.phamViCoSo(req.user) === null) return false;
  res.status(403).json({
    error: `${viec} ảnh hưởng tới MỌI cơ sở, nên chỉ tài khoản quản trị `
      + 'toàn hệ thống mới làm được. Xin liên hệ ban giám hiệu.',
  });
  return true;
}

// Danh sách nhóm trong tầm của người này, null nghĩa là không hạn chế.
function phamViNhomLop(user) {
  const coSo = db.phamViCoSo(user);
  return coSo === null ? null : db.classIdsOfCampus(coSo);
}

// =============================================================================
// NHÓM CỦA NĂM MỚI PHẢI TÁCH THEO CƠ SỞ
// =============================================================================
//
// Bản đầu của quy trình chuyển năm gom nhóm mới vào một `Map` khoá theo TÊN, và
// tra nhóm đã có bằng `WHERE name = ? AND year = ?` — không một chữ nào về cơ
// sở. Trường có ba cơ sở và cả ba đều có nhóm tên "Chồi 2".
//
// Hậu quả: sau một lần bấm "Chuyển năm học", ba nhóm Chồi 2 của ba cơ sở nhập
// làm MỘT. Trẻ của cả ba cơ sở nằm chung một nhóm, cô của cơ sở này mở được hồ
// sơ bé của cơ sở kia, và toàn bộ tầng cơ sở dựng ở N15 bay sạch trong đúng một
// giao dịch. Không có nút hoàn tác, và quy trình này chạy mỗi năm một lần nên
// không ai kịp nhận ra trước khi nó đã xảy ra.
//
// Khoá gom nhóm nay là CƠ SỞ + TÊN. Nhóm chưa gắn cơ sở dùng chuỗi rỗng, nên
// trường một cơ sở chạy y như cũ — đúng Nguyên tắc số 1.
function khoaNhom(campusId, ten) {
  return `${campusId || ''}\n${String(ten).toLowerCase()}`;
}

// Tìm nhóm CÙNG TÊN, CÙNG NĂM, VÀ CÙNG CƠ SỞ. Không lọc cơ sở thì lần chuyển
// năm thứ hai lại nối nhóm của cơ sở này vào nhóm của cơ sở kia.
function timNhomCuaNam(ten, nam, campusId) {
  const ungVien = db.all('classes',
    'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND year = ?', [ten, nam]);
  return ungVien.find(c => (db.campusOfClass(c.id) || '') === (campusId || '')) || null;
}

module.exports = (app) => {
  // Xem trước việc chuyển năm học: lớp nào lên lớp nào, bao nhiêu em ra trường.
  app.get('/api/schoolyear/preview', onlyAdmin, (req, res) => {
    // Xem trước cho một việc mà người xem không được làm thì chỉ gây hiểu nhầm
    // — họ thấy một bản kế hoạch cho cả trường rồi bấm nút và bị từ chối.
    if (chiCap1(req, res, 'Chuyển năm học')) return;
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
      // Cùng cơ sở, cùng tên — nếu không thì màn XEM TRƯỚC nói bé cơ sở 2 sẽ
      // sang nhóm của cơ sở 1, tức là báo trước một việc sẽ không xảy ra.
      const lopDich = tenMoi ? timNhomCuaNam(tenMoi, namMoi, db.campusOfClass(c.id)) : null;
      return {
        classId: c.id,
        tenHienTai: c.name,
        khoi: c.grade,
        siSo,
        tenLopMoi: tenMoi,
        raTruong: !tenMoi,
        // Nhóm này đi theo BẬC mầm non hay theo số cuối tên lớp. Màn hình cần
        // biết để không hiện ô "Khối cuối cấp" — với nhóm mầm non ô đó không có
        // tác dụng gì, mà một ô điều khiển đã chết vẫn hiện thì hiệu trưởng gõ
        // số vào rồi tưởng nó quyết định ai ra trường.
        theoBac: nhomKeTiepMamNon(c.name) !== undefined,
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
    // CHỈ CẤP 1. Chuyển năm học đụng vào TOÀN BỘ nhóm lớp và hồ sơ bé của cả ba
    // cơ sở trong một lần bấm: lên nhóm, đóng nhóm cũ, cho ra trường. Một quản
    // lý cơ sở bấm nhầm là cả trường đổi năm học, và không có nút hoàn tác.
    if (chiCap1(req, res, 'Chuyển năm học')) return;
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
    const ngayChuyen = ngay.homNay();

    db.tx(() => {
      const lopCu = db.classes();
      const lopMoiTheoTen = new Map();

      // Tạo trước các nhóm của năm mới.
      for (const c of lopCu) {
        const tenMoi = tenLopKeTiep(c.name, khoiToiDa);
        if (!tenMoi) continue;
        const coSoCu = db.campusOfClass(c.id);
        const khoa = khoaNhom(coSoCu, tenMoi);
        if (lopMoiTheoTen.has(khoa)) continue;

        const daCo = timNhomCuaNam(tenMoi, namMoi, coSoCu);
        if (daCo) { lopMoiTheoTen.set(khoa, daCo.id); continue; }
        const id = db.nextId('c');
        db.insert('classes', {
          id, name: tenMoi, room: c.room, grade: (Number(c.grade) || 0) + 1,
          teacherId: null,      // phân công lại cô phụ trách cho năm mới
          year: namMoi, active: true,
        });
        // GẮN NHÓM MỚI VÀO ĐÚNG CƠ SỞ CỦA NHÓM CŨ.
        //
        // Bỏ dòng này thì nhóm của năm mới không thuộc cơ sở nào, mà quản lý cơ
        // sở nhìn thấy gì đều đi qua `classIdsOfCampus`. Sáng đầu năm học mới
        // họ mở app ra thấy trống trơn, và không ai đoán được vì sao.
        if (coSoCu) db.setClassCampus(id, coSoCu);
        lopMoiTheoTen.set(khoa, id);
        ketQua.lopTao++;
      }

      // Chuyển bé sang nhóm mới.
      for (const c of lopCu) {
        const tenMoi = tenLopKeTiep(c.name, khoiToiDa);
        const khoa = tenMoi ? khoaNhom(db.campusOfClass(c.id), tenMoi) : '';
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
          const dichId = lopMoiTheoTen.get(khoa);
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
      message: `Đã chuyển sang năm học ${namMoi}: ${ketQua.lenLop} bé lên nhóm, ` +
        `${ketQua.raTruong} bé ra trường, tạo ${ketQua.lopTao} nhóm mới. ` +
        'Hãy phân công lại cô phụ trách cho các nhóm.',
    });
  });

  // Tra cứu học sinh đã ra trường hoặc chuyển đi.
  app.get('/api/schoolyear/alumni', onlyAdmin, (req, res) => {
    // Bé đã ra trường vẫn giữ `classId` của nhóm cuối cùng, nên vẫn tra được
    // cơ sở. Bé nào không còn nhóm thì chỉ Cấp 1 thấy — cùng luật "đóng chứ
    // không mở" đã dùng ở routes/admin.js.
    const pham = phamViNhomLop(req.user);
    const rows = db.all('students',
      'SELECT * FROM students WHERE active = 0 ORDER BY leftAt DESC, name LIMIT 500')
      .filter(s => pham === null || pham.includes(s.classId));
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
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
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
