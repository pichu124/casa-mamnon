// Phân hệ Quản trị: quản lý nhóm lớp, cô, hồ sơ bé và nhập danh sách đầu năm.
//
// Đây là phần cho phép nhà trường tự đưa dữ liệu thật vào hệ thống — không có
// nó thì không thể tạo hàng trăm tài khoản phụ huynh.
const db = require('../lib/db');
const ngayVN = require('../lib/ngay');
const lsl = require('../lib/lich-su-lop');
const nl = require('../lib/nhom-lop');
const csv = require('../lib/csv');
const password = require('../lib/password');
const { requireRole, destroyUserSessions } = require('../lib/auth');

const onlyAdmin = requireRole('admin');

const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
// MỘT NHÓM HỎI MỘT LẦN CHO CẢ DANH SÁCH.
//
// Hai màn của quản trị đổ ra toàn bộ bé trong phạm vi rồi hỏi `db.findClass`
// cho TỪNG bé — trường 600 bé chia 23 nhóm là 600 lượt hỏi để nhận về đúng 23
// câu trả lời. better-sqlite3 chạy đồng bộ nên chừng ấy câu chặn thẳng vòng
// lặp sự kiện của cả máy chủ, không riêng người đang bấm.
//
// Trả về một hàm, và hàm ấy giữ bảng nhớ của ĐÚNG lượt gọi tạo ra nó. Nâng
// bảng nhớ ra ngoài thành đệm dùng chung cho cả tiến trình là văn phòng đổi
// tên nhóm xong mà màn hình vẫn nói tên cũ tới lần khởi động lại kế tiếp.
function nhoTenNhom() {
  const nho = new Map();
  return (classId) => {
    if (!classId) return '';
    if (!nho.has(classId)) nho.set(classId, (db.findClass(classId) || {}).name || '');
    return nho.get(classId);
  };
}

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
    if (chanNeuChiMotCoSo(req, res, 'Thêm một cơ sở mới')) return;
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
    db.audit(req.user.id, 'campus-create', rec.id, { name: rec.name });
    res.json(rec);
  });

  app.put('/api/admin/campuses/:id', onlyAdmin, (req, res) => {
    // Sửa tên hay ĐÓNG một cơ sở là việc của ban giám hiệu. Đặc biệt là đóng:
    // đóng cơ sở của chính mình thì `campuses` có thể còn 0 dòng đang hoạt
    // động, và lúc đó `db.coTangCoSo()` trả false — cả tầng cơ sở tắt ngóm,
    // mọi quản trị Cấp 3 lập tức thành Cấp 1. Đó là lối leo thang bằng cách
    // phá sập hàng rào chứ không phải trèo qua nó.
    if (chanNeuChiMotCoSo(req, res, 'Sửa hoặc đóng một cơ sở')) return;
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
    db.audit(req.user.id, 'campus-update', cs.id, thayDoi);
    res.json(db.findCampus(cs.id));
  });

  // Gắn một nhóm lớp vào cơ sở. Truyền campusId rỗng để gỡ ra.
  app.put('/api/admin/classes/:id/campus', onlyAdmin, (req, res) => {
    // CHỈ CẤP 1. Đây là đường VẼ LẠI RANH GIỚI, không phải đường làm việc bên
    // trong một ranh giới. Cho Cấp 3 dùng thì họ vừa có thể kéo nhóm của cơ sở
    // khác về mình, vừa có thể đẩy nhóm của mình đi rồi mất luôn quyền với nó.
    if (chanNeuChiMotCoSo(req, res, 'Chuyển nhóm lớp sang cơ sở khác')) return;
    const lop = db.findClass(req.params.id);
    if (!lop) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    const campusId = String((req.body || {}).campusId || '').trim();
    if (campusId && !db.findCampus(campusId)) {
      return res.status(400).json({ error: 'Không tìm thấy cơ sở' });
    }
    db.setClassCampus(lop.id, campusId || null);
    db.audit(req.user.id, 'class-campus', lop.id, { campusId: campusId || null });
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
      const ma = db.chucVu(u.id);
      const mo = db.moTaChucVu(ma);
      return {
        ...u, campusId,
        // `cap` giữ nguyên nghĩa cũ (có cơ sở = 3) để màn hình cũ còn trong bộ
        // nhớ đệm điện thoại vẫn đọc đúng. Chức vụ là ba trường thêm bên cạnh.
        cap: campusId ? 3 : 1,
        chucVu: ma || '',
        chucVuTen: mo ? mo.ten : '',
        chucVuCap: mo ? mo.cap : null,
      };
    }));
  });

  // Danh mục chức vụ để màn hình dựng ô chọn. Chỉ là bảng chữ, không phải dữ liệu.
  //
  // Vẫn canh tầng cơ sở, dù ở đây không có một chữ nào của bé. Lý do là gán chức
  // vụ vốn chỉ ban giám hiệu làm được, nên cũng chỉ họ cần bảng này — và một
  // đường quản trị KHÔNG canh gì cả là một ngoại lệ phải giải trình, mà ngoại lệ
  // thì nên hiếm. Màn hình của quản lý cơ sở tự ẩn thẻ chức vụ khi không đọc được.
  app.get('/api/admin/chuc-vu', onlyAdmin, (req, res) => {
    if (chanNeuChiMotCoSo(req, res, 'Xem danh mục chức vụ')) return;
    res.json(db.CHUC_VU.map(c => ({ ma: c.ma, ten: c.ten, cap: c.cap, moTa: c.moTa })));
  });

  // Gán hoặc gỡ chức vụ của một tài khoản quản trị.
  //
  // CHỈ BAN GIÁM HIỆU. Chức vụ là thứ quyết định người khác mở được phần nào,
  // nên ai đổi được chức vụ thì đổi được quyền của chính mình. Ba chốt chặn,
  // cùng một họ với ba chốt chặn của đường gán cơ sở ngay bên trên:
  //
  //   1. Người bấm phải là Cấp 1 — không khoá vào cơ sở nào VÀ không mang chức
  //      vụ Cấp 2/Cấp 3. Nếu không thì một tài khoản Nhân sự tự gỡ chức vụ của
  //      mình là thành ban giám hiệu trong đúng một lời gọi.
  //   2. Không tự đổi chức vụ của chính mình.
  //   3. Phải luôn còn ít nhất một tài khoản ban giám hiệu.
  app.put('/api/admin/managers/:id/chuc-vu', onlyAdmin, (req, res) => {
    if (chanNeuChiMotCoSo(req, res, 'Đổi chức vụ của một tài khoản quản trị')) return;
    // Chốt này hôm nay chưa ai chạm tới được: không chức vụ Cấp 2 nào có
    // `/api/admin/managers` trong danh sách cho phép, nên họ dừng ở tầng
    // middleware trước khi tới đây. Giữ lại vì nó canh một thứ có thể đổi —
    // ngày nào đó thêm `/api/admin` vào danh sách của Nhân sự là đường này mở
    // ra ngay. Khác với một chốt không bao giờ chạy được vì lý do lô-gíc.
    const capMinh = db.capChucVu(req.user);
    if (capMinh !== null && capMinh !== 1) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu mới đổi được chức vụ của tài khoản quản trị. '
          + 'Xin liên hệ ban giám hiệu.',
      });
    }

    const u = db.findUser(req.params.id);
    if (!u || u.role !== 'admin') return res.status(404).json({ error: 'Không tìm thấy tài khoản quản trị này' });
    if (u.id === req.user.id) {
      return res.status(400).json({
        error: 'Không thể tự đổi chức vụ của mình. Nhờ một tài khoản ban giám hiệu khác làm việc này.',
      });
    }

    const ma = String((req.body || {}).chucVu || '').trim();
    if (ma && !db.moTaChucVu(ma)) return res.status(400).json({ error: 'Không có chức vụ này' });

    // CỐ Ý KHÔNG có chốt "phải còn ít nhất một ban giám hiệu" ở đây, dù đường
    // gán cơ sở ngay bên trên có một chốt như vậy. Lý do: hai chốt chặn trên
    // cộng lại đã bảo đảm điều đó rồi. Người bấm được tới dòng này chắc chắn
    // đang là ban giám hiệu (không cơ sở, không chức vụ hạn chế), và chắc chắn
    // không phải người sắp bị đổi. Nên sau lệnh ghi, họ vẫn là ban giám hiệu.
    //
    // Viết thêm một chốt nữa thì nó KHÔNG BAO GIỜ chạy — và một chốt không bao
    // giờ chạy là một lời hứa không ai kiểm được, tệ hơn là không có.
    db.datChucVu(u.id, ma);
    db.audit(req.user.id, 'manager-chuc-vu', u.id, { chucVu: ma || null });
    const mo = db.moTaChucVu(ma);
    res.json({ id: u.id, chucVu: ma || '', chucVuTen: mo ? mo.ten : '', chucVuCap: mo ? mo.cap : null });
  });

  // Khoá một tài khoản quản trị vào một cơ sở, hoặc gỡ khoá (campusId rỗng).
  app.put('/api/admin/managers/:id/campus', onlyAdmin, (req, res) => {
    // CHỈ CẤP 1 — nếu không thì Cấp 3 tự gỡ khoá của chính mình và thành Cấp 1
    // trong đúng một lời gọi. Hai chốt chặn viết ở N4 (không tự khoá mình, phải
    // còn ít nhất một Cấp 1) đều canh chiều KHOÁ VÀO, không canh chiều GỠ RA.
    if (chanNeuChiMotCoSo(req, res, 'Gán tài khoản quản trị vào cơ sở')) return;
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
    db.audit(req.user.id, 'manager-campus', u.id, { campusId: campusId || null });
    res.json({ id: u.id, campusId: campusId || null, cap: campusId ? 3 : 1 });
  });

  app.get('/api/admin/overview', onlyAdmin, (req, res) => {
    // Màn Tổng quan là chỗ Cấp 3 hay đứng nhất, nên nó phải nói đúng SỐ CỦA CƠ
    // SỞ MÌNH. Trả số toàn trường ở đây không chỉ là rò rỉ nhỏ — nó còn khiến
    // quản lý cơ sở đọc sai sĩ số và làm sai báo cáo, mà con số thì trông rất
    // đáng tin. Sai thầm lặng tệ hơn con số bị giấu đi.
    const pham = phamViNhom(req.user);
    const nhom = db.classes().filter(c => pham === null || pham.includes(c.id));
    const beTrongPhamVi = db.all('students', 'SELECT * FROM students WHERE active = 1')
      .filter(s => pham === null || pham.includes(s.classId));

    // Tập phụ huynh trong phạm vi: dựng MỘT LẦN từ danh sách bé đã lọc. Hỏi
    // lại cho từng phụ huynh là 300 lượt truy vấn cho một màn hình.
    const phTrongPhamVi = new Set(
      db.withParents(beTrongPhamVi).flatMap(s => s.parentIds || []));

    const nguoiTrongPhamVi = (vaiTro) => db
      .all('users', `SELECT * FROM users WHERE role = ? AND active = 1`, [vaiTro])
      .filter(u => pham === null
        || (vaiTro === 'teacher'
          ? db.classIdsOfTeacher(u.id).some(id => pham.includes(id))
          : phTrongPhamVi.has(u.id)));

    const co = nguoiTrongPhamVi('teacher');
    const ph = nguoiTrongPhamVi('parent');

    res.json({
      school: db.school(),
      // Danh sách cơ sở giữ nguyên cho MỌI quản trị: Cấp 3 vẫn cần biết trường
      // có mấy cơ sở và mình đang ở cơ sở nào. Đây là tên và địa chỉ của một
      // toà nhà, không phải dữ liệu của bé.
      campuses: db.campuses(),
      counts: {
        classes: nhom.length,
        students: beTrongPhamVi.length,
        teachers: co.length,
        parents: ph.length,
        mustChange: [...co, ...ph].filter(u => u.mustChangePassword).length
          + (pham === null
            ? db.count(`SELECT COUNT(*) FROM users WHERE role = 'admin' AND mustChangePassword = 1 AND active = 1`)
            : 0),
      },
      classes: nhom.map(c => ({
        ...c,
        ...nl.tomTat(c.id),
        campusId: db.campusOfClass(c.id),
        studentCount: beTrongPhamVi.filter(s => s.classId === c.id).length,
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
    // NHÓM MỚI DO CẤP 3 TẠO PHẢI VÀO NGAY CƠ SỞ CỦA NGƯỜI TẠO.
    //
    // Để trống là một cái hố sập: nhóm chưa gắn cơ sở thì `duocChamNhom` trả
    // false, nên chính người vừa tạo cũng không thấy lại nhóm mình vừa tạo,
    // không sửa được, không xếp bé vào được — mà app thì báo "tạo thành công".
    // Gắn ngay là cách duy nhất giữ được cả hai vế: cách ly đúng, và người dùng
    // không rơi vào ngõ cụt.
    // CẤP 1 THÌ PHẢI NÓI RÕ, VÌ HỎI AI CŨNG KHÔNG RA.
    //
    // `phamViCoSo` trả null cho ban giám hiệu — họ không thuộc cơ sở nào, nên
    // không có cơ sở nào để gắn theo. Bản cũ dừng ở đó và tạo ra một nhóm không
    // thuộc cơ sở nào: quản lý cơ sở không thấy nó, và sau lần chuyển năm tiếp
    // theo thì nhóm con của nó cũng mồ côi theo.
    //
    // Nay nhận `campusId` từ thân yêu cầu khi người tạo là Cấp 1. KHÔNG bắt
    // buộc: màn hình cũ còn trong bộ nhớ đệm điện thoại không gửi trường này,
    // và bắt buộc là làm hỏng đường tạo nhóm đang chạy. Nhóm chưa gắn cơ sở
    // vẫn hiện rõ ở thẻ "Nhóm lớp thuộc cơ sở nào" của màn Quản trị.
    let coSoNguoiTao = db.phamViCoSo(req.user);
    if (coSoNguoiTao === null) {
      const xin = String((req.body || {}).campusId || '').trim();
      if (xin && !db.findCampus(xin)) {
        return res.status(400).json({ error: 'Không tìm thấy cơ sở' });
      }
      coSoNguoiTao = xin || null;
    }
    db.tx(() => {
      db.insert('classes', rec);
      if (coSoNguoiTao) db.setClassCampus(rec.id, coSoNguoiTao);
      if (rec.teacherId) datChuNhiem(rec.id, rec.teacherId);
    });
    db.audit(req.user.id, 'class-create', rec.id, { name: rec.name, campusId: coSoNguoiTao || null });
    res.status(201).json(rec);
  });

  app.put('/api/admin/classes/:id', onlyAdmin, (req, res) => {
    const cls = db.findClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!duocChamNhom(req.user, cls.id)) return khongThuocCoSo(res, 'nhóm lớp');
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
      // CHỐT NÀY TỪNG CHỈ ĐỨNG Ở ĐƯỜNG MỚI, NÊN ĐƯỜNG CŨ LÀ MỘT LỐI ĐI VÒNG.
      //
      // `PUT /api/admin/classes/:id/teachers` ngay bên dưới có `chanNeuVanPhong`
      // vì mô tả chức vụ Văn phòng cơ sở nói rõ họ "KHÔNG đụng tài khoản và
      // KHÔNG phân công cô". Nhưng đường CŨ này cũng phân công cô được — chỉ
      // cần gửi kèm trường `teacherId` — và trước bản vá thì nó không hỏi chốt
      // đó một lần nào.
      //
      // Gắn vào ĐÚNG NHÁNH này, không gắn cho cả đường: văn phòng vẫn phải sửa
      // được tên nhóm, phòng học, năm học — việc hằng ngày của họ.
      if (chanNeuVanPhong(req, res, 'Phân công cô phụ trách nhóm')) return;

      const t = req.body.teacherId ? db.findUser(req.body.teacherId) : null;
      if (req.body.teacherId && (!t || t.role !== 'teacher')) {
        return res.status(400).json({ error: 'Giáo viên không hợp lệ' });
      }
      // VÀ CANH CƠ SỞ CỦA CHÍNH CÔ ẤY, KHÔNG CHỈ CỦA NHÓM TRONG ĐỊA CHỈ.
      //
      // `datChuNhiem` → `db.setHomeroomTeacher` quét TOÀN BỘ các nhóm cô từng
      // dạy và gỡ cô khỏi tất cả các nhóm khác. `duocChamNhom` ở đầu đường chỉ
      // canh nhóm ghi trong địa chỉ, nên quản lý cơ sở 2 phân công một cô là
      // cô ấy lặng lẽ mất quyền ở cơ sở 1 — mà `class_teachers` là nguồn sự
      // thật duy nhất của quyền đọc hồ sơ trẻ.
      if (t) {
        const ngoai = db.classIdsOfTeacher(t.id).filter(cid => !duocChamNhom(req.user, cid));
        if (ngoai.length) {
          return res.status(403).json({
            error: `Cô ${t.name} đang phụ trách nhóm ở cơ sở khác. `
              + 'Phân công lại cô này cần tài khoản quản trị toàn hệ thống, '
              + 'nếu không cô sẽ mất quyền ở cơ sở kia mà bên đó không hay biết.',
          });
        }
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
    if (chanNeuVanPhong(req, res, 'Phân công cô phụ trách nhóm')) return;
    const cls = db.findClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!duocChamNhom(req.user, cls.id)) return khongThuocCoSo(res, 'nhóm lớp');

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
    const pham = phamViNhom(req.user);
    res.json(db.all('users', `SELECT * FROM users WHERE role = 'teacher' AND active = 1 ORDER BY name`)
      // Cô CHƯA phụ trách nhóm nào thì Cấp 3 không thấy — cô đó chưa thuộc về
      // cơ sở nào. Cấp 1 vẫn thấy, nên không cô nào bị bỏ quên; và đó cũng
      // đúng người cần thấy, vì phân công cô là việc của ban giám hiệu.
      .filter(u => pham === null || db.classIdsOfTeacher(u.id).some(id => pham.includes(id)))
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
    if (chanNeuVanPhong(req, res, 'Tạo tài khoản cho cô')) return;
    const { name, title, phone, email, classId } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên giáo viên' });
    // Tạo cô rồi gắn thẳng vào một nhóm của cơ sở khác là mở một cánh cửa vào
    // cơ sở đó: cô mới đọc được hồ sơ bé của nhóm ấy, và người tạo biết mật
    // khẩu tạm của cô mới.
    if (classId && !duocChamNhom(req.user, classId)) return khongThuocCoSo(res, 'nhóm lớp');
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
      // GẮN CÔ MỚI VÀO NHÓM MÀ KHÔNG GỠ CÁC CÔ ĐANG PHỤ TRÁCH.
      //
      // Trước bản vá, chỗ này gọi `datChuNhiem` → `db.setHomeroomTeacher`, tức
      // ĐẶT LẠI danh sách cô của nhóm thành đúng một người. Văn phòng tạo tài
      // khoản cho cô mới rồi chọn "Chồi 2" ở ô Phụ trách nhóm là cả hai cô đang
      // dạy nhóm đó mất sạch quyền — sáng hôm sau mở app thấy "Nhóm chưa có bé
      // nào", không điểm danh, không ghi nhật ký, không mở hồ sơ bé được. App
      // báo "Đã tạo tài khoản", không một lời cảnh báo.
      //
      // Lý lẽ giữ nếp cũ "một cô một lớp" ở đường `PUT /api/admin/classes/:id`
      // là vì bản giao diện cũ trong điện thoại vẫn gửi `teacherId` với đúng
      // nghĩa đó. Lý lẽ ấy KHÔNG áp được ở đây: một cô vừa được tạo ra thì
      // không thể từng là cô duy nhất của nhóm nào.
      //
      // Nhóm chưa có ai thì cô mới là cô phụ trách chính — giữ đúng hành vi cũ
      // cho luồng "tạo nhóm rồi tạo cô".
      if (classId) {
        db.addClassTeacher(classId, rec.id,
          db.teacherIdsOfClass(classId).length ? 'phu' : 'chinh');
      }
    });
    db.audit(req.user.id, 'teacher-create', rec.id, { name: rec.name, classId: classId || null });
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
    // Quản trị Cấp 3 chỉ thấy bé của cơ sở mình. Lọc SAU khi truy vấn thay vì
    // ghép thêm điều kiện vào câu SQL: danh sách nhóm của một cơ sở là một mảng
    // ngắn (vài chục), còn ghép động vào SQL là chỗ dễ sinh lỗi trích dẫn.
    const trongPhamVi = keCaNghi ? phamViNhomKeCaDaDong(req.user) : phamViNhom(req.user);
    const rows = (classId
      ? db.all('students', `SELECT * FROM students WHERE classId = ?${loc} ORDER BY name`, [classId])
      : db.all('students', `SELECT * FROM students WHERE 1 = 1${loc} ORDER BY name`))
      .filter(s => trongPhamVi === null || trongPhamVi.includes(s.classId));
    // Tên nhóm: hỏi MỘT LẦN cho mỗi nhóm, không phải một lần cho mỗi bé.
    // Cùng cách và cùng lý do với `mePayload` ở routes/auth.js — xem khối chú
    // thích ở đó, gồm cả lý do bảng nhớ này phải sống đúng một lượt gọi.
    const tenNhom = nhoTenNhom();
    res.json(db.withParents(rows).map(s => ({
      ...s,
      ...db.hoSoBe(s.id),
      dongY: db.dongYCuaBe(s.id),
      className: tenNhom(s.classId),
      parents: s.parentIds.map(id => {
        const p = db.findUser(id);
        // Đường này đã là onlyAdmin nên số CCCD đi kèm được. Vẫn liệt kê từng
        // trường một chứ không trải cả hàng `users` ra: hàng đó có passwordHash.
        return p ? {
          id: p.id, name: `${p.title} ${p.name}`, username: p.username, phone: p.phone,
          soCccd: db.hoSoNguoiDung(p.id).soCccd,
        } : null;
      }).filter(Boolean),
    })));
  });

  // Xuất danh sách bé ra tệp mở được bằng Excel.
  //
  // Văn phòng cần cái này để làm báo cáo gửi phòng giáo dục và để đối chiếu sĩ
  // số cuối tháng. Trước đây họ gõ tay lại từ màn hình.
  //
  // BA ĐIỀU PHẢI GIỮ Ở ĐƯỜNG NÀY
  //
  // 1. TỆP NÀY LÀ CẢ TRƯỜNG TRONG MỘT TỆP. Nó đi ra khỏi app: nằm trong thư mục
  //    Tải về, gửi qua Zalo, chép vào USB. Nên nó CHẶT HƠN màn hình mà nó đứng
  //    cạnh — chỉ xuất bé thuộc phạm vi cơ sở của người bấm. Quản trị Cấp 1
  //    không bị hạn chế gì (phamViCoSo trả null), nên hành vi cũ không đổi.
  // 2. MỖI LẦN XUẤT ĐỀU ĐỂ LẠI DẤU trong nhật ký. Dữ liệu trẻ dưới 6 tuổi theo
  //    Nghị định 13/2023 — hỏi "ai đã tải danh sách này ra" phải trả lời được.
  // 3. Ô BẮT ĐẦU BẰNG = + - @ BỊ VÔ HIỆU HÓA. Excel coi ô như vậy là công thức
  //    và chạy nó. Họ tên và địa chỉ do người nhập gõ, nên một cái tên bắt đầu
  //    bằng "=" đủ để biến tệp danh sách thành thứ chạy được trên máy văn phòng.
  app.get('/api/admin/students/xuat.csv', onlyAdmin, (req, res) => {
    const keCaNghi = String(req.query.keCaNghi || '') === '1';
    const nhomTrongPhamVi = keCaNghi ? phamViNhomKeCaDaDong(req.user) : phamViNhom(req.user);
    const rows = db.all('students',
      `SELECT * FROM students WHERE 1 = 1${keCaNghi ? '' : ' AND active = 1'} ORDER BY name`)
      .filter(s => nhomTrongPhamVi === null || nhomTrongPhamVi.includes(s.classId));


    const COT = ['Mã bé', 'Họ và tên', 'Ngày sinh', 'Tuổi', 'Giới tính', 'Nhóm lớp', 'Cơ sở',
      'Số định danh cá nhân', 'Dân tộc', 'Nhóm máu', 'Tiền sử bệnh / lưu ý đặc biệt',
      'Địa chỉ', 'Bố / mẹ', 'Số CCCD của bố / mẹ', 'Người liên hệ khẩn cấp',
      'Đồng ý hồ sơ học tập', 'Đồng ý chia sẻ ảnh', 'Đồng ý truyền thông',
      'Người ký giấy', 'Ngày ký', 'Tình trạng'];

    const duLieu = db.withParents(rows).map(s => {
      const lop = s.classId ? db.findClass(s.classId) : null;
      const cs = s.classId ? db.findCampus(db.campusOfClass(s.classId)) : null;
      const hs = db.hoSoBe(s.id) || {};
      return {
        'Mã bé': s.code || '',
        'Họ và tên': s.name || '',
        'Ngày sinh': s.dob || '',
        'Tuổi': tuoiCuaBe(s.dob),
        'Giới tính': s.gender || '',
        'Nhóm lớp': lop ? lop.name : '',
        'Cơ sở': cs ? cs.name : '',
        'Số định danh cá nhân': hs.soDinhDanh || '',
        'Dân tộc': s.ethnicity || '',
        'Nhóm máu': s.bloodType || '',
        'Tiền sử bệnh / lưu ý đặc biệt': hs.tienSuBenh || '',
        'Địa chỉ': s.address || '',
        'Bố / mẹ': (s.parentIds || []).map(id => {
          const p = db.findUser(id);
          return p ? `${p.title} ${p.name}${p.phone ? ` (${p.phone})` : ''}` : '';
        }).filter(Boolean).join(' · '),
        'Số CCCD của bố / mẹ': (s.parentIds || []).map(id => {
          const p = db.findUser(id);
          const so = p ? db.hoSoNguoiDung(p.id).soCccd : '';
          return so ? `${p.title} ${p.name}: ${so}` : '';
        }).filter(Boolean).join(' · '),
        'Người liên hệ khẩn cấp': (hs.lienHeKhanCap || [])
          .map(l => `${l.hoTen}${l.quanHe ? ` — ${l.quanHe}` : ''}${l.dienThoai ? ` (${l.dienThoai})` : ''}`)
          .join(' · '),
        ...(() => {
          // Ba giá trị, nên viết ra chữ chứ không viết x / trống: người đọc
          // bảng phải phân biệt được "gia đình nói không" với "chưa thu giấy".
          const d = db.dongYCuaBe(s.id);
          const noi = (v) => (v === true ? 'Đồng ý' : v === false ? 'Không đồng ý' : 'Chưa trả lời');
          return {
            'Đồng ý hồ sơ học tập': noi(d.hoSoHocTap),
            'Đồng ý chia sẻ ảnh': noi(d.chiaSeGiaDinh),
            'Đồng ý truyền thông': noi(d.truyenThong),
            'Người ký giấy': d.nguoiKy,
            'Ngày ký': d.ngayKy,
          };
        })(),
        'Tình trạng': s.active === false || s.active === 0 ? 'Đã nghỉ' : 'Đang học',
      };
    }).map(khoaCongThuc);

    db.audit(req.user.id, 'students-export', null, { soBe: duLieu.length, keCaNghi });

    const ngayXuat = ngayVN.homNay();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="danh-sach-be-${ngayXuat}.csv"`);
    res.send(csv.stringify(COT, duLieu));
  });

  // Sửa thông tin học sinh, chuyển lớp, hoặc nhận lại em đã cho nghỉ.
  app.put('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');
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
      // CƠ SỞ CỦA NHÓM ĐÍCH, KHÔNG CHỈ CƠ SỞ CỦA BÉ.
      //
      // `duocChamBe` ở trên tra theo nhóm HIỆN TẠI của bé, nên nó chỉ trả lời
      // được câu "bé này có thuộc cơ sở của mình không". Thiếu chốt dưới đây
      // thì quản trị Cấp 3 chuyển được một bé sang nhóm của cơ sở KHÁC — và
      // chuyển xong là mất luôn, vì lượt kéo về sẽ vướng đúng `duocChamBe`.
      // Một chiều: đẩy đi được, kéo về 404.
      //
      // Đường anh em `POST /api/admin/teachers` đã có đúng chốt này từ đầu.
      if (req.body.classId && !duocChamNhom(req.user, req.body.classId)) {
        return khongThuocCoSo(res, 'nhóm lớp');
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
    if (!duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');
    lsl.ghiRoiLop(s.id, lsl.homNay());
    db.update('students', s.id, { active: false, leftAt: ngayVN.homNay() });
    db.audit(req.user.id, 'student-deactivate', s.id, { name: s.name });
    res.json({ ok: true });
  });

  // Văn phòng ghi lại giấy đồng ý gia đình đã ký.
  //
  // Ba mục tách riêng, đúng như tờ giấy: ① hồ sơ học tập ② chia sẻ ảnh và câu
  // chuyện cho gia đình khác ③ dùng ảnh cho truyền thông. Mỗi mục ba giá trị:
  // true / false / null là chưa trả lời.
  //
  // KHÔNG GỬI MỘT MỤC = KHÔNG ĐỤNG TỚI MỤC ĐÓ. Gửi null mới là chủ ý đưa mục
  // đó về "chưa trả lời" — dùng khi gia đình rút lại đồng ý và trường chưa kịp
  // hỏi lại. Rút lại được bất cứ lúc nào là quyền của họ theo Nghị định
  // 13/2023, nên app phải làm được cả chiều đó chứ không chỉ chiều đồng ý.
  app.put('/api/admin/students/:id/dong-y', onlyAdmin, (req, res) => {
    const be = db.findStudent(req.params.id);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!duocChamBe(req.user, be.id)) return khongThuocCoSo(res, 'bé');

    const body = req.body || {};
    const nhan = {};
    for (const k of ['hoSoHocTap', 'chiaSeGiaDinh', 'truyenThong']) {
      if (k in body) nhan[k] = body[k] === null ? null : !!body[k];
    }
    for (const k of ['nguoiKy', 'ngayKy', 'ghiChu']) {
      if (body[k] !== undefined) nhan[k] = String(body[k]);
    }
    if (!Object.keys(nhan).length) {
      return res.status(400).json({ error: 'Không có mục nào để ghi' });
    }

    const ket = db.datDongY(be.id, nhan);
    db.audit(req.user.id, 'consent-update', be.id, { name: be.name, ...nhan });
    res.json({ id: be.id, dongY: ket });
  });

  // Ghi số CCCD của một phụ huynh.
  //
  // Đường RIÊNG chứ không nhét vào PUT /api/admin/students/:id, vì một phụ
  // huynh có thể có hai con: sửa từ hồ sơ bé nào cũng phải ra CÙNG MỘT bản ghi,
  // và nhét vào đường của bé sẽ dựng lên ảo giác "số CCCD của bố, bản dành cho
  // bé An" và "bản dành cho bé Nam". Hai bản đó rồi sẽ lệch nhau.
  //
  // Chỉ nhận đúng một trường. Sửa họ tên, số điện thoại của phụ huynh là việc
  // khác, chưa có đường nào làm, và không mượn đường này làm ké.
  app.put('/api/admin/parents/:id/cccd', onlyAdmin, (req, res) => {
    const u = db.findUser(req.params.id);
    if (!u || u.role !== 'parent') {
      return res.status(404).json({ error: 'Không tìm thấy phụ huynh này' });
    }
    // Phụ huynh không thuộc cơ sở nào cả — CON của họ mới thuộc. Cấp 3 chạm
    // được người này khi có ÍT NHẤT MỘT con đang học ở cơ sở mình.
    if (!coConTrongPhamVi(req.user, u.id)) return khongThuocCoSo(res, 'phụ huynh này');
    if ((req.body || {}).soCccd === undefined) {
      return res.status(400).json({ error: 'Thiếu số CCCD' });
    }
    const hoSo = db.luuHoSoNguoiDung(u.id, { soCccd: req.body.soCccd });
    db.audit(req.user.id, 'parent-cccd', u.id, { name: u.name, coSo: !!hoSo.soCccd });
    res.json({ id: u.id, soCccd: hoSo.soCccd });
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

  function phanTich(text, phamNhap) {
    const { rows } = csv.parse(text);
    const daDungTen = new Set();
    const ketQua = [];
    const maDaGap = new Set();

    // Chụp một lần danh sách em đang học để đối chiếu, thay vì truy vấn mỗi dòng.
    //
    // CHỈ TRONG PHẠM VI CỦA NGƯỜI ĐANG NHẬP. Câu cảnh báo "đã có trong hệ thống
    // (Lá 1)" nói ra hai điều về một bé mà người nhập có thể không được biết:
    // bé đó tồn tại, và bé đó học nhóm nào. Với cơ sở khác thì cả hai đều
    // không phải việc của họ. Đổi lại, người nhập có thể tạo trùng một bé đã
    // học ở cơ sở khác — đúng: bé chuyển cơ sở là hồ sơ mới ở cơ sở mới, và
    // việc gộp hai hồ sơ là việc của ban giám hiệu.
    const daCo = new Map();
    for (const s of db.all('students', 'SELECT name, dob, classId FROM students WHERE active = 1')) {
      if (phamNhap !== null && !phamNhap.includes(s.classId)) continue;
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

      // TRA NHÓM THEO TÊN — VÀ KHÔNG ĐOÁN KHI TÊN ẤY CÓ Ở NHIỀU CƠ SỞ.
      //
      // Ba cơ sở đều có nhóm "Chồi 2". Bản cũ lấy `db.first(... WHERE name = ?)`
      // tức là lấy nhóm nào ra trước thì lấy — nên một tệp nhập của cơ sở 2 đổ
      // trẻ vào nhóm Chồi 2 của cơ sở 1, im lặng, và không ai phát hiện cho tới
      // khi phụ huynh hỏi vì sao con mình có trong danh sách một cơ sở khác.
      //
      // Cấp 3 thì tầng cơ sở đã trả lời hộ: chỉ nhìn nhóm trong phạm vi mình.
      // Cấp 1 nhìn cả ba cơ sở, nên phải HỎI chứ không được đoán — đó là lý do
      // tệp mẫu có thêm cột "Cơ sở".
      const tenCoSo = lay(row, 'Cơ sở', 'Co so', 'campus');
      let maCoSo = '';
      let lop = null;
      if (tenLop) {
        let ungVien = db.all('classes',
          'SELECT * FROM classes WHERE name = ? COLLATE NOCASE AND active = 1', [tenLop]);
        if (phamNhap !== null) ungVien = ungVien.filter(c => phamNhap.includes(c.id));
        if (tenCoSo) {
          const cs = db.campuses().find(x => csv.boDau(x.name) === csv.boDau(tenCoSo));
          if (!cs) loi.push(`không có cơ sở nào tên "${tenCoSo}"`);
          else { maCoSo = cs.id; ungVien = ungVien.filter(c => db.campusOfClass(c.id) === cs.id); }
        }

        if (ungVien.length === 1) {
          lop = ungVien[0];
        } else if (ungVien.length > 1) {
          const ten = ungVien
            .map(c => (db.findCampus(db.campusOfClass(c.id)) || {}).name || 'chưa gắn cơ sở');
          loi.push(`nhóm "${tenLop}" có ở nhiều cơ sở (${ten.join(', ')}) — `
            + 'xin ghi rõ cơ sở ở cột "Cơ sở"');
        } else if (phamNhap !== null && db.first('classes',
          'SELECT id FROM classes WHERE name = ? COLLATE NOCASE AND active = 1', [tenLop])) {
          // Có nhóm tên đó thật, nhưng của cơ sở khác.
          loi.push(`nhóm "${tenLop}" không thuộc cơ sở của bạn`);
        }
      }

      ketQua.push({
        line: row.__line,
        hoTen, tenLop, ma,
        campusId: maCoSo,
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
    const rows = phanTich(text, phamViNhom(req.user));
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
    const rows = phanTich(text, phamViNhom(req.user));
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
    const coSoNguoiNhap = db.phamViCoSo(req.user);
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
        // Cùng lý do như POST /api/admin/classes: không gắn thì chính người vừa
        // nhập cũng không thấy lại nhóm mình vừa tạo.
        //
        // Cấp 1 không thuộc cơ sở nào, nên lấy theo cột "Cơ sở" của chính dòng
        // đó nếu tệp có ghi. Không ghi thì vẫn tạo như trước — CỐ Ý không chặn:
        // chặn ở đây là làm hỏng đường nhập danh sách đầu năm đang chạy, mà
        // nhóm chưa gắn cơ sở thì màn Quản trị đã có sẵn một dòng đếm và nhắc.
        if (coSoNguoiNhap) db.setClassCampus(id, coSoNguoiNhap);
        else if (r.campusId) db.setClassCampus(id, r.campusId);
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
    // Cột "Cơ sở" chỉ cần khi trường có từ hai cơ sở và hai nơi đặt trùng tên
    // nhóm — nhưng để sẵn trong mẫu thì rẻ hơn nhiều so với để văn phòng nhập
    // xong mới báo lỗi và phải sửa lại cả tệp.
    const headers = ['Mã của bé', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Nhóm', 'Cơ sở', 'Địa chỉ',
      'Họ tên phụ huynh', 'Điện thoại', 'Email'];
    const namSinhMau = Number(ngayVN.homNay().slice(0, 4)) - 4;   // bé nhóm Chồi, 4 tuổi
    const mau = [{
      'Mã của bé': 'MN2026001', 'Họ tên': 'Nguyễn Bảo An', 'Ngày sinh': `${namSinhMau}-04-12`,
      'Giới tính': 'Nữ', 'Nhóm': 'Chồi 2',
      'Cơ sở': (db.campuses()[0] || {}).name || '',
      'Địa chỉ': '12 Hoa Phượng, Q. Phú Nhuận',
      'Họ tên phụ huynh': 'Lê Thị Thu Hà', 'Điện thoại': '0912345678', 'Email': 'thuha@gmail.com',
    }];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-danh-sach-be.csv"');
    res.send(csv.stringify(headers, mau));
  });

  // ---------- Nhật ký thao tác ----------
  app.get('/api/admin/audit', onlyAdmin, (req, res) => {
    // Nhật ký của Cấp 3 chỉ gồm việc CHÍNH HỌ làm.
    //
    // Cách chặt hơn — lọc theo cơ sở của đối tượng bị tác động — nghe hợp lý
    // hơn nhưng không làm được cho ra hồn: `target` chỉ là một mã, và mã của
    // một bé đã chuyển đi hay một nhóm đã xoá thì không tra ngược ra cơ sở nào
    // nữa. Lọc nửa vời sẽ vừa để lọt dòng của cơ sở khác, vừa giấu mất dòng
    // của chính cơ sở mình — tệ hơn cả hai cách dứt khoát.
    //
    // "Việc của chính mình" thì luôn đúng, luôn đủ để quản lý cơ sở tự soát
    // lại thao tác của mình, và không bao giờ lộ tên bé của cơ sở khác. Muốn
    // tra toàn hệ thống thì hỏi ban giám hiệu — đúng thẩm quyền.
    const pham = db.phamViCoSo(req.user);
    const rows = pham === null
      ? db.all('audit_log', 'SELECT * FROM audit_log ORDER BY at DESC LIMIT 200')
      : db.all('audit_log', 'SELECT * FROM audit_log WHERE userId = ? ORDER BY at DESC LIMIT 200',
        [req.user.id]);
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

// ===========================================================================
// TẦNG CƠ SỞ CHO CÁC ĐƯỜNG QUẢN TRỊ (N15)
//
// N4 dựng tầng cơ sở trong `db.studentsOf` / `db.canAccessStudent` /
// `db.classIdsOf`. Nhưng tệp này hỏi THẲNG bảng `students`, `classes`, `users`
// bằng db.all/db.first, nên đi vòng qua cả ba. Kết quả: quản trị Cấp 3 của cơ
// sở 1 đọc, sửa và cho nghỉ học được bé của cơ sở 2.
//
// Bốn hàm dưới đây là chỗ duy nhất tệp này hỏi "người đó có được chạm vào thứ
// này không". Đường nào cũng phải đi qua một trong bốn hàm — thêm một đường mới
// mà quên gọi thì `test:co-so-quan-tri` báo đỏ.
//
// LUẬT CHUNG: `db.phamViCoSo` trả null nghĩa là KHÔNG HẠN CHẾ, và null xảy ra ở
// hai trường hợp — quản trị Cấp 1, hoặc trường chưa khai báo cơ sở nào. Trường
// hợp thứ hai là lý do cả tầng này nằm im với trường một cơ sở, đúng như
// Nguyên tắc số 1 đòi hỏi.
// ===========================================================================

// Danh sách nhóm mà người này được phép nhìn, hoặc null nghĩa là KHÔNG hạn chế.
// null chứ không phải "mọi nhóm": trường chưa khai cơ sở nào thì tầng cơ sở nằm
// im hoàn toàn, và quản trị Cấp 1 giữ nguyên quyền như trước khi có N4.
function phamViNhom(user) {
  const coSo = db.phamViCoSo(user);
  return coSo === null ? null : db.classIdsOfCampus(coSo);
}

// Cùng thứ, nhưng KỂ CẢ NHÓM ĐÃ ĐÓNG — chỉ dùng cho lượt hỏi NHÌN LẠI QUÁ KHỨ.
//
// Bé đã cho nghỉ giữa năm rồi trường chuyển năm học: nhóm cũ của bé đóng lại,
// và `phamViNhom` thôi kể tên nhóm ấy. Quản lý cơ sở mở "kể cả bé đã nghỉ" hay
// xuất Excel liền mất sạch bé cũ của CHÍNH cơ sở mình, trong khi ban giám hiệu
// vẫn thấy đủ — không mất dữ liệu, mất đường tra cứu.
//
// Chỉ đổi nhánh nhìn lại. Nhánh mặc định (bé đang học) giữ nguyên `phamViNhom`:
// quyền của hôm nay phải tính trên nhóm đang mở.
function phamViNhomKeCaDaDong(user) {
  const coSo = db.phamViCoSo(user);
  return coSo === null ? null : db.classIdsEverOfCampus(coSo);
}

// Người này có được chạm vào nhóm lớp này không.
//
// NHÓM CHƯA GẮN CƠ SỞ THÌ CẤP 3 KHÔNG CHẠM ĐƯỢC — cố ý chọn "đóng" chứ không
// "mở". Một nhóm chưa khai cơ sở là nhóm chưa ai nhận, và đoán bừa nó thuộc về
// người đang hỏi là cách rò rỉ êm ái nhất: không ai thấy gì bất thường, dữ liệu
// cứ thế đi sang cơ sở khác. Cấp 1 vẫn thấy hết nên nhóm đó không bị bỏ quên.
function duocChamNhom(user, classId) {
  const pham = db.phamViCoSo(user);
  if (pham === null) return true;
  if (!classId) return false;
  return db.campusOfClass(classId) === pham;
}

// Bé này có nằm trong phạm vi của người này không. Bé CHƯA XẾP NHÓM cũng theo
// luật trên: Cấp 1 thấy, Cấp 3 không.
function duocChamBe(user, studentId) {
  const be = db.findStudent(studentId);
  if (!be) return false;
  return duocChamNhom(user, be.classId);
}

// Một phụ huynh có nằm trong tầm của người này không.
//
// Phụ huynh KHÔNG thuộc cơ sở nào cả — con của họ mới thuộc. Nhà có hai con học
// hai cơ sở là chuyện có thật, nên luật là "có ÍT NHẤT MỘT con trong phạm vi".
// Rộng hơn một chút so với cách chặt nhất, nhưng chặt hơn thì quản lý cơ sở 1
// không sửa nổi hồ sơ một phụ huynh đang gửi con ở chính cơ sở mình.
function coConTrongPhamVi(user, parentId) {
  const pham = phamViNhom(user);
  if (pham === null) return true;
  if (!pham.length) return false;
  const marks = pham.map(() => '?').join(',');
  return db.count(
    `SELECT COUNT(*) FROM student_parents sp
     JOIN students s ON s.id = sp.studentId
     WHERE sp.parentId = ? AND s.classId IN (${marks})`, [parentId, ...pham]) > 0;
}

// Chặn một việc ảnh hưởng TOÀN HỆ THỐNG khi người bấm chỉ phụ trách một cơ sở.
// Trả về true nghĩa là ĐÃ gửi lỗi, chỗ gọi phải return ngay.
function chanNeuChiMotCoSo(req, res, viec) {
  if (db.phamViCoSo(req.user) === null) return false;
  res.status(403).json({
    error: `${viec} ảnh hưởng tới MỌI cơ sở, nên chỉ tài khoản quản trị `
      + 'toàn hệ thống mới làm được. Xin liên hệ ban giám hiệu.',
  });
  return true;
}

// Chặn một việc thuộc về BAN GIÁM HIỆU khi người bấm là "Văn phòng cơ sở".
//
// Cấp 3 của trường mầm non là hai vai, không phải một: quản lý cơ sở chịu trách
// nhiệm về con người, văn phòng cơ sở lo việc hằng ngày. Danh sách API cho phép
// của `vanphong-coso` mở cả `/api/admin` vì họ cần hồ sơ bé, nhóm lớp và danh
// sách để làm việc — nhưng hai việc dưới đây thì không:
//
//   • TẠO TÀI KHOẢN CÔ. Đường này trả thẳng mật khẩu tạm về màn hình. Ai tạo
//     được tài khoản cô là tự tạo cho mình một tài khoản cô và biết mật khẩu
//     của nó.
//   • PHÂN CÔNG CÔ VÀO NHÓM. Gắn một cô vào nhóm là mở hồ sơ của cả nhóm bé
//     cho cô ấy. Đó là quyết định về con người, tức việc của quản lý cơ sở.
//
// Trả về true nghĩa là ĐÃ gửi lỗi, chỗ gọi phải return ngay.
function chanNeuVanPhong(req, res, viec) {
  if (db.chucVu(req.user) !== 'vanphong-coso') return false;
  res.status(403).json({
    error: `${viec} là việc của quản lý cơ sở, không phải của văn phòng. `
      + 'Xin nhờ quản lý cơ sở hoặc ban giám hiệu làm giúp.',
  });
  return true;
}

// Từ chối vì thứ được hỏi không thuộc cơ sở của người hỏi.
//
// Trả 404 chứ không 403, và đây là lựa chọn có cân nhắc: 403 tự nó đã nói "có
// tồn tại một bé mang mã này, chỉ là bạn không được xem". Với cơ sở khác thì
// đến sự tồn tại cũng không nên lộ. Người dùng thật không bao giờ gặp câu này
// — màn hình của họ không hiện thứ ngoài cơ sở mình để mà bấm nhầm.
function khongThuocCoSo(res, thu) {
  res.status(404).json({ error: `Không tìm thấy ${thu}` });
}

// Tuổi để đọc trong báo cáo.
//
// DƯỚI 36 THÁNG THÌ NÓI BẰNG THÁNG. Đây là ví dụ mở đầu của CLAUDE.md: "bé 14
// tháng thì màn hình phải nói *14 tháng* chứ không phải *1 tuổi*". Bản đầu của
// hàm này chỉ đếm tháng cho bé DƯỚI 12 tháng, nên bé 14 tháng ra đúng "1 tuổi"
// — sai đúng chỗ tài liệu lấy làm ví dụ. Không ai phát hiện suốt một thời gian
// dài vì dữ liệu mẫu không có bé nào dưới 4 tuổi (xem N20).
//
// Mốc 36 tháng trùng với mốc tách nhà trẻ / mẫu giáo mà trường đang dùng, nên
// chỉ có một mốc cho cả app thay vì hai mốc gần nhau dễ lẫn.
//
// PHẢI KHỚP TỪNG CHỮ với `tuoiCuaBe` trong public/js/views/student.js. Trình
// duyệt không nạp được tệp trong lib/ nên hai bản này buộc phải ở hai nơi;
// `test:xuat-danh-sach` canh để chúng không trôi ra khỏi nhau.
function tuoiCuaBe(dob) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) return '';
  const sinh = new Date(`${dob}T00:00:00Z`);
  const nay = new Date();
  if (Number.isNaN(sinh.getTime()) || sinh > nay) return '';
  let thang = (nay.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (nay.getUTCMonth() - sinh.getUTCMonth());
  if (nay.getUTCDate() < sinh.getUTCDate()) thang -= 1;
  if (thang < 0) return '';
  if (thang < 36) return `${thang} tháng`;
  const nam = Math.floor(thang / 12);
  const du = thang % 12;
  return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
}

// Vô hiệu hóa ô bị Excel hiểu là công thức. Thêm dấu nháy đơn ở đầu: Excel hiện
// đúng chữ người nhập gõ và không chạy gì cả.
const DAU_CONG_THUC = /^[=+\-@\t\r]/;
function khoaCongThuc(hang) {
  const ra = {};
  for (const [k, v] of Object.entries(hang)) {
    const t = v == null ? '' : String(v);
    ra[k] = DAU_CONG_THUC.test(t) ? `'${t}` : t;
  }
  return ra;
}
