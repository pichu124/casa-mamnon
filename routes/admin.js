// Phân hệ Quản trị: quản lý nhóm lớp, cô, hồ sơ bé và nhập danh sách đầu năm.
//
// Đây là phần cho phép nhà trường tự đưa dữ liệu thật vào hệ thống — không có
// nó thì không thể tạo hàng trăm tài khoản phụ huynh.
const crypto = require('crypto');
const db = require('../lib/db');
const ngayVN = require('../lib/ngay');
const lsl = require('../lib/lich-su-lop');
const nl = require('../lib/nhom-lop');
const csv = require('../lib/csv');
const password = require('../lib/password');
const { requireRole, destroyUserSessions } = require('../lib/auth');
const modules = require('../lib/modules');
// Lịch nghỉ của trường (Đ147) — màn tổng quan một ngày phải nói được "hôm nay
// trường nghỉ", chứ không im lặng rồi để hiệu trưởng tưởng cả trường vắng.
const nghiHoc = require('../lib/nghi-hoc');
// Bộ chữ đánh giá nhà trường tự sửa được (Đ185, Câu 6).
const ndg = require('../lib/nhan-danh-gia');
// Ba nhóm cô: chủ nhiệm / nước ngoài / thể chất (Đ188, Câu 11).
const nhomCo = require('../lib/nhom-co');
// Lứa tuổi của nhóm lớp: nhà trẻ hay mẫu giáo (Đ193, việc 5).
const luaNhom = require('../lib/lua-tuoi-nhom');

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

// `crypto.randomInt`, KHÔNG phải `Math.random` (Đ212).
//
// CHỖ NÀY NGUY HƠN HAI CHỖ ĐÃ VÁ Ở Đ117, và lý do nằm ở chữ HÀNG LOẠT.
//
// `Math.random` không phải bộ sinh dùng cho việc bảo mật: nó có trạng thái nội
// bộ và các giá trị nối nhau theo một quy luật, nên biết một dãy giá trị liên
// tiếp là suy ngược ra trạng thái rồi tính được những giá trị TRƯỚC và SAU.
//
// Hàm này được gọi ở ba chỗ, và chỗ cuối phạm đúng điều kiện ấy:
//
//   • tạo tài khoản cho MỘT cô — một lần một mật khẩu;
//   • tạo MỘT tài khoản quản trị trên màn hình (Đ239d1) — cũng một lần một;
//   • nhập danh sách đầu năm từ CSV — HÀNG TRĂM mật khẩu phụ huynh sinh liên
//     tiếp từ cùng một dòng chảy, rồi in ra một lượt cho người nhập.
//
// Ai có trong tay vài mật khẩu liên tiếp của mẻ ấy — một phụ huynh hai con,
// một cô nhận danh sách lớp mình, một tờ in bỏ quên — về nguyên tắc suy ra
// được mật khẩu của CÁC NHÀ KHÁC. `mustChangePassword` có làm hẹp cửa lại,
// nhưng ở trường mầm non nhiều gia đình hàng tuần không mở app, nên mật khẩu
// ấy còn hiệu lực suốt thời gian đó.
//
// Bộ chữ và độ dài giữ NGUYÊN — vẫn là chuỗi dễ đọc qua điện thoại, đã bỏ sẵn
// các ký tự dễ nhầm (0/O, 1/l/I). Đổi đúng nguồn ngẫu nhiên, không đổi gì khác.
function sinhMatKhau() {
  const pick = (s) => s[crypto.randomInt(s.length)];
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
    // Cấp 3 chỉ thấy CƠ SỞ CỦA MÌNH — kèm sĩ số và số nhóm. Trả cả ba cơ sở
    // cho quản lý một cơ sở là đưa đúng thứ mà màn Tổng quan đã cố ý che
    // (quy mô của cơ sở khác) ra qua một đường khác.
    const pham = db.phamViCoSo(req.user);
    res.json(db.campuses()
      .filter(cs => pham === null || cs.id === pham)
      .map(cs => ({
        ...cs,
        classCount: db.classIdsOfCampus(cs.id).length,
        studentCount: db.classIdsOfCampus(cs.id)
          .reduce((n, id) => n + db.count('SELECT COUNT(*) FROM students WHERE classId = ? AND active = 1', [id]), 0),
      })));
  });

  // ------------------------------------------------------------------------
  // THÔNG TIN LIÊN HỆ CỦA TRƯỜNG (Đ161)
  // ------------------------------------------------------------------------
  //
  // Nhà trường 07/09: khối "Thông tin trường lớp" ở màn phụ huynh cần tên lớp,
  // cô phụ trách, hotline văn phòng, email trường **và email kế toán**. Bốn thứ
  // đầu đã có (lấy từ cơ sở của nhóm bé, lùi về thông tin chung của trường);
  // email kế toán thì chưa có chỗ nào cất.
  //
  // MỘT GIÁ TRỊ CHO CẢ TRƯỜNG, không phải mỗi cơ sở một cái: trường ba cơ sở
  // nhưng một bộ sổ kế toán, và trường nói "email kế toán" ở số ít. Ngày nào
  // tách bếp tách sổ thì thêm cột ở `campuses` — chứ không phải hôm nay đoán
  // trước rồi bắt văn phòng nhập ba lần cùng một địa chỉ.
  //
  // Cất trong `settings.school` chứ không dựng bảng mới: đó đã là chỗ giữ tên
  // trường, địa chỉ, điện thoại, email và năm học hiện tại.
  app.get('/api/admin/lien-he', onlyAdmin, (req, res) => {
    const t = db.school() || {};
    res.json({
      tenTruong: t.name || '',
      diaChi: t.address || '',
      dienThoai: t.phone || '',
      email: t.email || '',
      emailKeToan: t.emailKeToan || '',
      suaDuoc: db.phamViCoSo(req.user) === null,
    });
  });

  app.put('/api/admin/lien-he', onlyAdmin, (req, res) => {
    if (chanNeuChiMotCoSo(req, res, 'Sửa thông tin liên hệ của trường')) return;
    const b = req.body || {};
    const e = String(b.emailKeToan || '').trim().slice(0, 120);
    // Dạng email kiểm rất nhẹ, có chủ ý: chặn chặt hơn là chặn cả những địa
    // chỉ có thật mà biểu thức của mình chưa biết tới. Để trống = gỡ đi.
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: 'Email kế toán chưa đúng dạng, ví dụ đúng: ketoan@truong.edu.vn' });
    }
    const t = db.school() || {};
    db.setSchool({ ...t, emailKeToan: e });
    db.audit(req.user.id, 'truong-lien-he', null, { emailKeToan: e ? 'có' : 'gỡ' });
    res.json({ ok: true, emailKeToan: e });
  });

  // ---- BỘ CHỮ ĐÁNH GIÁ (Đ185, Câu 6) ----
  //
  // Nhà trường: *"Bộ chữ này sẽ giống nhau giữa 3 cơ sở… Nên muốn mở quyền để
  // chỉnh sửa phần này cho hợp lý theo thời gian"*.
  //
  // MỘT BỘ CHO CẢ TRƯỜNG, nên dùng đúng chốt đã có cho những giá trị cả trường
  // dùng chung: quản lý bị khoá vào MỘT cơ sở thì xem được, không sửa được.
  // Không có chốt ấy thì quản lý cơ sở 2 gõ một chữ là ba cơ sở đổi theo, mà
  // hai cơ sở kia không hề biết ai đổi và đổi lúc nào.
  app.get('/api/admin/nhan-danh-gia', onlyAdmin, (req, res) => {
    const dang = ndg.nhanDangDung(db);
    res.json({
      nhan: dang.map(([ma, nhan], i) => ({
        ma,
        nhan,
        macDinh: ndg.MAC_DINH[i][1],
        daSua: nhan !== ndg.MAC_DINH[i][1],
      })),
      toiDa: ndg.TOI_DA_NHAN,
      suaDuoc: db.phamViCoSo(req.user) === null,
    });
  });

  app.put('/api/admin/nhan-danh-gia', onlyAdmin, (req, res) => {
    if (chanNeuChiMotCoSo(req, res, 'Sửa bộ chữ đánh giá dùng chung cả trường')) return;
    const kq = ndg.ghiBo(db, (req.body || {}).nhan || {}, req.user.id);
    if (kq.loi) return res.status(400).json({ error: kq.loi, ma: kq.ma });
    const dang = ndg.nhanDangDung(db);
    res.json({ ok: true, nhan: dang.map(([ma, nhan]) => ({ ma, nhan })) });
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

  // TẠO TÀI KHOẢN QUẢN TRỊ TRÊN MÀN HÌNH (Đ239d1 — góp ý 16/10, mục 5).
  //
  // Trường: "Giám đốc sẽ tạo tài khoản cho cấp 2 và quản lý cơ sở." Trước đợt
  // này chỉ có lệnh `scripts/create-admin.js` trên máy chủ.
  //
  // BA ĐIỀU KHÔNG ĐƯỢC SAI:
  //
  //   1. CHỈ BAN GIÁM HIỆU — đúng hai chốt của đường đổi chức vụ bên dưới: không
  //      khoá vào cơ sở nào VÀ không mang chức vụ Cấp 2/Cấp 3.
  //   2. KHÔNG BAO GIỜ ĐỂ LẠI TÀI KHOẢN QUẢN TRỊ KHÔNG CHỨC VỤ. Thiếu chức vụ là
  //      toàn quyền ban giám hiệu, thiếu cơ sở (với chức vụ Cấp 3) là thấy cả
  //      ba cơ sở. Nên chức vụ bắt buộc, và tài khoản, chức vụ, cơ sở ghi trong
  //      MỘT giao dịch: hỏng giữa chừng là không có gì được ghi.
  //   3. KHÔNG TẠO ĐƯỢC BAN GIÁM HIỆU Ở ĐÂY. Tài khoản ban giám hiệu tạo được
  //      tài khoản quản trị khác; cho nó tự nhân bản trên màn hình thì một phiên
  //      đăng nhập bị lộ là đủ để cài thêm một tài khoản toàn quyền lâu dài.
  //      Tài khoản Cấp 1 mới vẫn chỉ tạo bằng lệnh trên máy chủ.
  app.post('/api/admin/managers', onlyAdmin, (req, res) => {
    if (chanNeuChiMotCoSo(req, res, 'Tạo tài khoản quản trị')) return;
    const capMinh = db.capChucVu(req.user);
    if (capMinh !== null && capMinh !== 1) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu mới tạo được tài khoản quản trị. Xin liên hệ ban giám hiệu.',
      });
    }

    const b = req.body || {};
    const hoTen = String(b.name || '').trim();
    if (!hoTen) return res.status(400).json({ error: 'Vui lòng nhập họ tên' });

    // Cùng luật với `scripts/create-admin.js`.
    const username = String(b.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới (3–30 ký tự).',
      });
    }
    if (db.findUserByUsername(username)) {
      return res.status(409).json({ error: `Tên đăng nhập "${username}" đã được dùng. Chọn tên khác.` });
    }

    const ma = String(b.chucVu || '').trim();
    if (!ma) {
      return res.status(400).json({
        error: 'Chọn chức vụ cho tài khoản. Tài khoản quản trị không có chức vụ làm được mọi việc của ban giám hiệu.',
      });
    }
    const mo = db.moTaChucVu(ma);
    if (!mo) return res.status(400).json({ error: 'Không có chức vụ này' });
    if (mo.cap === 1) {
      return res.status(400).json({
        error: 'Tài khoản Ban giám hiệu chỉ tạo bằng lệnh trên máy chủ, do người giữ máy chủ làm. '
          + 'Tài khoản này làm được mọi việc, kể cả tạo thêm tài khoản quản trị, nên không mở việc tạo nó trên màn hình.',
      });
    }

    const campusId = String(b.campusId || '').trim();
    if (mo.cap === 3) {
      const cs = campusId ? db.findCampus(campusId) : null;
      if (!cs || cs.active === false) {
        return res.status(400).json({
          error: `Chức vụ "${mo.ten}" làm việc trong một cơ sở: chọn cơ sở cho tài khoản này.`,
        });
      }
    } else if (campusId) {
      return res.status(400).json({
        error: `Chức vụ "${mo.ten}" làm việc cho cả trường, không gắn vào một cơ sở.`,
      });
    }

    const matKhau = sinhMatKhau();
    const rec = {
      id: db.nextId('ad'),
      username,
      passwordHash: password.hash(matKhau),
      role: 'admin',
      name: hoTen,
      title: '',
      phone: '',
      email: '',
      classId: null,
      avatar: { emoji: '🏫', bg: '#1f5e8c' },
      mustChangePassword: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.tx(() => {
      db.insert('users', rec);
      db.datChucVu(rec.id, ma);
      if (mo.cap === 3) db.setUserCampus(rec.id, campusId);
    });
    db.audit(req.user.id, 'admin-create', rec.id, {
      name: rec.name, username, chucVu: ma, campusId: mo.cap === 3 ? campusId : null,
    });
    res.status(201).json({
      id: rec.id, name: rec.name, username,
      chucVu: ma, chucVuTen: mo.ten, campusId: mo.cap === 3 ? campusId : null,
      temporaryPassword: matKhau,
    });
  });

  // GIA ĐÌNH QUAN TÂM ĐIỀU GÌ — bảng đếm GỘP (Đ149).
  //
  // Đọc `luot_quan_tam`, bảng cố ý không có cột nào chỉ ra một người (xem chú
  // thích của bảng ở lib/schema.sql và của đường ghi ở routes/dashboard.js).
  //
  // Con số trả về là LƯỢT MỞ, không phải SỐ GIA ĐÌNH — và tên trường trả về nói
  // đúng chữ đó (`soLuot`), để màn hình không có đường nào viết ra một câu mà
  // dữ liệu không đỡ nổi. Muốn biết "bao nhiêu NHÀ quan tâm" thì phải nhớ từng
  // nhà đã mở gì, đúng thứ nhà trường và tôi đã cùng gạt đi.
  //
  // Cấp 3 chỉ thấy cơ sở mình, cùng luật với mọi đường quản trị khác.
  app.get('/api/admin/quan-tam', onlyAdmin, (req, res) => {
    const DATE_RE2 = /^\d{4}-\d{2}-\d{2}$/;
    const den = DATE_RE2.test(String(req.query.den || '')) ? String(req.query.den) : ngayVN.homNay();
    const tuMacDinh = new Date(Date.parse(`${den}T00:00:00Z`) - 29 * 86400000)
      .toISOString().slice(0, 10);
    const tu = DATE_RE2.test(String(req.query.tu || '')) ? String(req.query.tu) : tuMacDinh;
    if (tu > den) return res.status(400).json({ error: 'Ngày kết thúc phải sau hoặc trùng ngày bắt đầu' });

    const pham = db.phamViCoSo(req.user);
    const dieu = pham ? 'AND campusId = ?' : '';
    const thamSo = pham ? [tu, den, pham] : [tu, den];
    const dong = db.all('luot_quan_tam',
      `SELECT muc, SUM(soLuot) AS soLuot FROM luot_quan_tam
        WHERE ngay BETWEEN ? AND ? ${dieu}
        GROUP BY muc ORDER BY SUM(soLuot) DESC`, thamSo);

    // Tên mục bằng tiếng của trường, lấy từ chính danh mục phân hệ — không chép
    // tay, để mai kia đổi tên một phân hệ thì bảng này đổi theo.
    const ten = new Map(modules.tatCa().map(m => [m.view, m.name]));
    // TRẢ VỀ CON SỐ THÔ, KHÔNG TRẢ TỈ LỆ.
    //
    // Bản đầu có thêm một trường tỉ lệ của mỗi mục trong tổng. Bộ canh QUY TẮC 4
    // báo đỏ ngay khi màn hình in nó ra, và bộ canh đúng: kho mã này đã chọn
    // chặn mọi tỉ lệ hiện lên màn, kể cả tỉ lệ nói về màn hình chứ không nói về
    // đứa trẻ nào — vì một ngoại lệ mở ra hôm nay thì lần sau rất có thể đúng là
    // con số về một đứa trẻ. Bỏ hẳn trường ấy đi, thay vì để nó nằm đó chờ ai
    // đó in ra. Tổng lượt vẫn trả về, đủ để văn phòng tự đối chiếu.
    res.json({
      tuNgay: tu, denNgay: den,
      coSo: pham || '',
      tongLuot: dong.reduce((s2, r) => s2 + Number(r.soLuot || 0), 0),
      muc: dong.map(r => ({
        muc: r.muc,
        ten: ten.get(r.muc) || r.muc,
        soLuot: Number(r.soLuot || 0),
      })),
    });
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
      // Thêm ở Đ239d1, chỉ thêm: tab "Tài khoản" đọc để biết vẽ nút nào.
      quyenTaiKhoan: quyenTaiKhoan(req.user),
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
      classes: (() => {
        // Lứa tuổi đã khai của CẢ danh sách, đọc một lượt (Đ193) — hỏi từng
        // nhóm một là mỗi lần mở màn Quản trị thêm một lượt truy vấn cho mỗi
        // nhóm, và trường ba cơ sở thì danh sách này không ngắn.
        const lua = luaNhom.khaiTheoNhom(db, nhom.map(c => c.id));
        return nhom.map(c => ({
          ...c,
          ...nl.tomTat(c.id),
          campusId: db.campusOfClass(c.id),
          studentCount: beTrongPhamVi.filter(s => s.classId === c.id).length,
          // null = trường CHƯA khai, và chưa khai thì nhật ký vẫn chạy theo
          // ngày sinh như cũ. Ba trạng thái, không phải hai.
          luaTuoi: lua[c.id] || null,
        }));
      })(),
    });
  });

  // ------------------------------------------------------------------------
  // MÀN TỔNG QUAN MỘT NGÀY — cho ban giám hiệu (Đ162)
  // ------------------------------------------------------------------------
  //
  // Nhà trường 07/09 xin một màn cho hiệu trưởng: tổng số bé; hôm nay đi học /
  // ra về; số nghỉ phân theo lý do; số cô và số cô đi làm hôm nay; chọn từng
  // cơ sở, xem theo ngày. `/api/admin/overview` trước đợt này chỉ trả năm con
  // số đếm đầu người — đúng cho màn Quản trị, nhưng không trả lời được câu
  // hiệu trưởng hỏi mỗi sáng: *"hôm nay ba cơ sở thế nào"*.
  //
  // BA ĐIỀU CỐ Ý Ở MÀN NÀY
  //
  // 1. **KHÔNG MỘT PHẦN TRĂM NÀO, KHÔNG SO CƠ SỞ NÀO HƠN CƠ SỞ NÀO.** Mọi con
  //    số ở đây là số ĐẾM ĐẦU NGƯỜI trong một ngày. Cơ sở xếp theo TÊN, không
  //    xếp theo sĩ số — xếp theo con số là biến màn này thành bảng đua nhau
  //    giữa ba cơ sở, mà đằng sau mỗi con số ấy là trẻ con đi học hay ở nhà
  //    (QUY TẮC 4).
  // 2. **HỎI CÔNG TẮC TRƯỚC KHI ĐỌC BẢNG CỦA PHÂN HỆ KHÁC.** Điểm danh, Xin
  //    phép, Nhân sự, Học phí đều tắt được; tắt rồi mà màn này vẫn hiện số của
  //    chúng thì công tắc kia coi như không có tác dụng (test:doc-cheo).
  //    Phân hệ tắt thì trường tương ứng trả `null` — KHÔNG trả 0, vì 0 nghĩa là
  //    "đếm được, và bằng không", còn đây là "không đếm".
  // 3. **CẤP 3 CHỈ THẤY CƠ SỞ MÌNH**, y như `/api/admin/overview`. Bảng chia
  //    theo cơ sở chỉ gửi cho người nhìn được nhiều cơ sở.
  app.get('/api/admin/mot-ngay', onlyAdmin, (req, res) => {
    const ngayXem = String(req.query.ngay || '').trim() || ngayVN.homNay();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayXem)) {
      return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-11' });
    }
    const pham = phamViNhom(req.user);
    const phamCoSo = db.phamViCoSo(req.user);
    const nhom = db.classes().filter(c => pham === null || pham.includes(c.id));
    const be = db.all('students', 'SELECT * FROM students WHERE active = 1')
      .filter(s => pham === null || pham.includes(s.classId));
    const ids = be.map(s => s.id);

    // Cơ sở của từng nhóm — hỏi MỘT lần mỗi nhóm, không phải mỗi bé.
    const coSoCuaNhom = new Map(nhom.map(c => [c.id, db.campusOfClass(c.id) || '']));

    // ---- Sổ điểm danh của đúng ngày ấy ----
    const dem = { coMat: 0, nghiCoPhep: 0, nghiKhongPhep: 0, daRaVe: 0 };
    const theoBe = new Map();
    if (ids.length && modules.dangBat('diemdanh')) {
      for (let i = 0; i < ids.length; i += 400) {
        const lo = ids.slice(i, i + 400);
        const m = lo.map(() => '?').join(',');
        for (const r of db.all('attendance',
          `SELECT studentId, status, checkOut FROM attendance
            WHERE date = ? AND studentId IN (${m})`, [ngayXem, ...lo])) {
          theoBe.set(r.studentId, r);
        }
      }
      for (const r of theoBe.values()) {
        if (r.status === 'present' || r.status === 'late') dem.coMat += 1;
        else if (r.status === 'absent_excused') dem.nghiCoPhep += 1;
        else if (r.status === 'absent_unexcused') dem.nghiKhongPhep += 1;
        if (r.checkOut) dem.daRaVe += 1;
      }
    }
    const coSoDiemDanh = modules.dangBat('diemdanh');

    // Bé chưa có dòng mà cơ sở của nhóm nghỉ theo lịch của trường thì KHÔNG
    // phải "chưa chấm" — không ai phải chấm ngày ấy (góp ý 20/10, cùng luật
    // với bảng rà soát ở routes/attendance.js). Cơ sở không nghỉ vẫn đếm.
    const dotCuaNhom = nghiHoc.dotNghiTheoNhom(ngayXem);
    const chuaChamBe = (s) => !theoBe.has(s.id) && !dotCuaNhom(s.classId);

    // ---- Cô đi làm hôm nay ----
    //
    // Đọc bảng của phân hệ Nhân sự nên phải hỏi công tắc trước. Bọc thêm một
    // lớp bắt lỗi: phân hệ vừa bật mà lược đồ chưa kịp chạy thì màn này vẫn
    // phải hiện, chỉ thiếu một con số.
    const coTrongPhamVi = db.all('users', "SELECT * FROM users WHERE role = 'teacher' AND active = 1")
      .filter(u => pham === null || db.classIdsOfTeacher(u.id).some(id => pham.includes(id)));
    let nhanSu = null;
    if (modules.dangBat('nhansu')) {
      try {
        const idCo = coTrongPhamVi.map(u => u.id);
        const cham = new Map();
        for (let i = 0; i < idCo.length; i += 400) {
          const lo = idCo.slice(i, i + 400);
          const m = lo.map(() => '?').join(',');
          for (const r of db.all('nhansu_cham_cong',
            `SELECT userId, loai FROM nhansu_cham_cong WHERE ngay = ? AND userId IN (${m})`,
            [ngayXem, ...lo])) cham.set(r.userId, r.loai);
        }
        const diLam = [...cham.values()].filter(x => x === 'di-lam' || x === 'nua-ngay').length;
        nhanSu = {
          tong: coTrongPhamVi.length,
          diLam,
          nghi: [...cham.values()].filter(x => String(x).startsWith('nghi')).length,
          chuaCham: coTrongPhamVi.length - cham.size,
        };
      } catch (err) {
        console.error(`[admin] không đọc được chấm công: ${err.message}`);
        nhanSu = null;
      }
    }

    // ---- Học phí kỳ của tháng đang xem ----
    //
    // ĐẾM KHOẢN THU, KHÔNG NÊU TÊN NHÀ NÀO. Hai con số: đã nộp và chưa nộp
    // trong phạm vi đang xem. Không tên bé, không số tiền của một nhà — màn
    // này là của hiệu trưởng nhìn cả trường, còn chuyện từng nhà thì phân hệ
    // Học phí đã có màn riêng và có luật riêng.
    let hocPhi = null;
    if (ids.length && modules.dangBat('hocphi')) {
      try {
        let daNop = 0;
        let chuaNop = 0;
        for (let i = 0; i < ids.length; i += 400) {
          const lo = ids.slice(i, i + 400);
          const m = lo.map(() => '?').join(',');
          for (const r of db.all('hocphi_khoan',
            `SELECT k.daNop AS daNop FROM hocphi_khoan k
              WHERE k.studentId IN (${m})
                AND NOT EXISTS (SELECT 1 FROM hocphi_thuhoi t WHERE t.khoanId = k.id)`, lo)) {
            if (r.daNop) daNop += 1; else chuaNop += 1;
          }
        }
        hocPhi = { daNop, chuaNop };
      } catch (err) {
        console.error(`[admin] không đọc được học phí: ${err.message}`);
        hocPhi = null;
      }
    }

    // ---- Chia theo cơ sở, chỉ cho người nhìn được nhiều cơ sở ----
    const theoCoSo = [];
    if (phamCoSo === null && db.coTangCoSo()) {
      const gom = new Map();
      for (const cs of db.campuses()) {
        gom.set(cs.id, { campusId: cs.id, ten: cs.name, dangHoc: 0, coMat: 0, daRaVe: 0, chuaCham: 0 });
      }
      for (const s of be) {
        const cs = coSoCuaNhom.get(s.classId) || '';
        const o = gom.get(cs);
        if (!o) continue;
        o.dangHoc += 1;
        const r = theoBe.get(s.id);
        if (!r) { if (chuaChamBe(s)) o.chuaCham += 1; continue; }
        if (r.status === 'present' || r.status === 'late') o.coMat += 1;
        if (r.checkOut) o.daRaVe += 1;
      }
      // XẾP THEO TÊN, KHÔNG XẾP THEO SĨ SỐ. Xem chú thích [1] ở đầu đường này.
      theoCoSo.push(...[...gom.values()].sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')));
    }

    const dotNghi = nghiHoc.ngayTruongNghi(ngayXem, phamCoSo);
    res.json({
      ngay: ngayXem,
      laHomNay: ngayXem === ngayVN.homNay(),
      coSo: phamCoSo || null,
      truongNghi: dotNghi ? { ten: dotNghi.ten, loai: dotNghi.loai } : null,
      be: {
        dangHoc: be.length,
        soNhom: nhom.length,
        // `null` = phân hệ Điểm danh đang tắt, KHÔNG phải "bằng không".
        coMat: coSoDiemDanh ? dem.coMat : null,
        daRaVe: coSoDiemDanh ? dem.daRaVe : null,
        nghiCoPhep: coSoDiemDanh ? dem.nghiCoPhep : null,
        nghiKhongPhep: coSoDiemDanh ? dem.nghiKhongPhep : null,
        chuaCham: coSoDiemDanh ? be.filter(chuaChamBe).length : null,
      },
      co: nhanSu,
      hocPhi,
      theoCoSo,
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
      // CÙNG HAI CHỐT VỚI NHÁNH `teacherId` CỦA ĐƯỜNG SỬA NGAY DƯỚI — đường
      // TẠO từng thiếu cả hai, thành lối đi vòng: văn phòng cơ sở không phân
      // công được cô qua đường sửa nhưng TẠO nhóm kèm teacherId thì được; và
      // quản lý cơ sở A tạo nhóm kèm một cô đang dạy ở cơ sở B là
      // `setHomeroomTeacher` lặng lẽ gỡ cô khỏi các nhóm bên B.
      if (chanNeuVanPhong(req, res, 'Phân công cô phụ trách nhóm')) return;
      const t = db.findUser(teacherId);
      if (!t || t.role !== 'teacher') return res.status(400).json({ error: 'Giáo viên không hợp lệ' });
      if (chanCoDayCoSoKhac(req, res, t)) return;
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
      if (t && chanCoDayCoSoKhac(req, res, t)) return;
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

  // ---- LỨA TUỔI CỦA NHÓM LỚP (Đ193, việc 5 và 6) ----
  //
  // Nhà trường chốt (A4): nhật ký ngày cắt theo NHÓM LỚP, và nhóm không phải
  // nhà trẻ thì bỏ hẳn mục Nhật ký ở màn gia đình.
  //
  // CHƯA KHAI = QUAY VỀ LUẬT CŨ (tính theo ngày sinh từng bé). Nên đường này
  // có ba giá trị chứ không phải hai: 'nha-tre', 'mau-giao', và rỗng để GỠ lời
  // khai. Thiếu giá trị thứ ba thì một lần bấm nhầm là không có đường lùi.
  app.put('/api/admin/classes/:id/lua-tuoi', onlyAdmin, (req, res) => {
    if (chanNeuVanPhong(req, res, 'Khai lứa tuổi của nhóm lớp')) return;
    const cls = db.findClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!duocChamNhom(req.user, cls.id)) return khongThuocCoSo(res, 'nhóm lớp');

    const xin = String((req.body || {}).lua || '').trim();
    if (!xin) {
      luaNhom.go(db, cls.id);
      db.audit(req.user.id, 'nhom-lua-tuoi-go', cls.id, {});
      return res.json({ ok: true, classId: cls.id, lua: null });
    }
    if (!luaNhom.hopLe(xin)) {
      return res.status(400).json({ error: 'Lứa tuổi của nhóm chỉ có: nhà trẻ hoặc mẫu giáo' });
    }
    luaNhom.dat(db, cls.id, xin, req.user.id);
    db.audit(req.user.id, 'nhom-lua-tuoi-khai', cls.id, { lua: xin });
    res.json({ ok: true, classId: cls.id, lua: xin });
  });

  // MỌI CHỐT CỦA MỘT LƯỢT ĐẶT DANH SÁCH CÔ CHO MỘT NHÓM.
  //
  // Tách khỏi thân `PUT /api/admin/classes/:id/teachers` (Đ239d1) để đường
  // chuyển cô đi qua ĐÚNG những chốt này cho cả nhóm đi lẫn nhóm đến, thay vì
  // chép luật sang chỗ thứ hai rồi để hai chỗ trôi khỏi nhau. Ba chốt KHÔNG
  // nằm ở đây vì chúng cần `req`/`res` hoặc đã chạy trước khi biết danh sách:
  // văn phòng cơ sở, nhóm có tồn tại không, nhóm có trong cơ sở của người bấm
  // không — mỗi đường tự hỏi ba chốt ấy, ngay trong thân của nó.
  //
  // Trả `{ loi: [mã HTTP, câu báo] }`, hoặc một lượt đã soát cho `ghiPhanCong`.
  function soatPhanCong(user, cls, body) {
    const xin = body.teacherIds;
    if (!Array.isArray(xin)) return { loi: [400, 'Thiếu danh sách cô phụ trách nhóm'] };
    // Cô có tài khoản đang KHOÁ (nghỉ thai sản, nghỉ dài ngày) nhưng ĐANG có
    // sẵn trong nhóm thì được phép GIỮ trong danh sách — giữ không phải là
    // thêm. Không nới chỗ này thì mọi lần lưu danh sách đều buộc phải gạt cô
    // đang nghỉ ra, tức xoá dấu phân công của cô như một tác dụng phụ.
    // THÊM MỚI một tài khoản khoá vào nhóm thì vẫn bị từ chối như cũ.
    const dangCoSan = new Set(db.teacherIdsOfClass(cls.id));
    for (const id of xin) {
      const t = db.findUser(id);
      const laCoDangLam = t && t.role === 'teacher' && t.active !== false;
      const laCoDangNghiCoSan = t && t.role === 'teacher' && dangCoSan.has(id);
      if (!laCoDangLam && !laCoDangNghiCoSan) {
        return { loi: [400, 'Danh sách có người không phải giáo viên đang làm việc'] };
      }
      // THÊM MỚI CHỈ ĐƯỢC CÔ NẰM TRONG TẦM CỦA NGƯỜI BẤM (Đ239d1).
      //
      // Đúng luật của danh sách cô (`coTrongTamNhin`). Không có chốt này thì
      // quản lý cơ sở 1 biết mã của một cô cơ sở 2 là kéo được cô vào nhóm
      // mình — rồi cấp lại mật khẩu cho cô (nay cô "thuộc" cơ sở 1) và đăng
      // nhập bằng tài khoản của cô, đọc hồ sơ bé của cơ sở 2. Cô ĐANG CÓ SẴN
      // trong nhóm thì giữ như cũ, kể cả cô dạy hai cơ sở.
      if (!dangCoSan.has(id) && !coTrongTamNhin(user, id)) {
        return { loi: [404, 'Không tìm thấy cô trong danh sách'] };
      }
    }
    const chinhId = body.chinhId || null;
    if (chinhId && !xin.includes(chinhId)) {
      return { loi: [400, 'Cô phụ trách chính phải nằm trong danh sách cô của nhóm'] };
    }

    // MÀN SỬA NHÓM KHÔNG BAO GIỜ GỬI MÃ CÔ ĐANG KHOÁ: ô tích dựng từ GET
    // /api/admin/teachers (chỉ cô đang làm việc), nên vế "giữ cô đang nghỉ"
    // ở trên chỉ có tác dụng với ai gọi API bằng tay. Tự thêm những cô đang
    // khoá mà ĐANG CÓ SẴN trong nhóm vào danh sách — giữ, không phải thêm mới;
    // muốn gỡ hẳn thì mở khoá tài khoản trước, đó là một hành động có chủ ý.
    const giuCoDangNghi = [...dangCoSan].filter(id => {
      if (xin.includes(id)) return false;
      const t = db.findUser(id);
      return t && t.role === 'teacher' && t.active === false;
    });
    const xinDu = [...xin, ...giuCoDangNghi];

    // NHÓM CÔ ĐI CÙNG LƯỢT PHÂN CÔNG (Đ188, Câu 11).
    //
    // `nhom` là một bản đồ { teacherId: 'chu-nhiem' | 'nuoc-ngoai' | 'the-chat' }.
    // KHÔNG GỬI = KHÔNG ĐỤNG TỚI: màn hình cũ và mọi chỗ gọi API bằng tay đều
    // chưa biết trường này, và một lượt lưu danh sách cô không được lặng lẽ
    // xoá vai trường đã khai.
    const xinNhom = body.nhom;
    if (xinNhom !== undefined && (typeof xinNhom !== 'object' || xinNhom === null || Array.isArray(xinNhom))) {
      return { loi: [400, 'Phần nhóm của cô gửi lên không đúng dạng'] };
    }
    if (xinNhom) {
      for (const [tid, ma] of Object.entries(xinNhom)) {
        if (!xinDu.includes(tid)) {
          return { loi: [400, 'Chỉ khai được nhóm cho cô có trong danh sách của nhóm lớp'] };
        }
        if (!nhomCo.hopLe(ma)) {
          return { loi: [400, 'Nhóm của cô chỉ có: cô phụ trách nhóm, cô nước ngoài, cô thể chất'] };
        }
      }
    }
    return { cls, xinDu, chinhId, xinNhom };
  }

  // Ghi một lượt đã qua `soatPhanCong`, trong MỘT giao dịch. Gọi lồng trong
  // giao dịch của chỗ gọi thì gộp luôn vào giao dịch ấy (đường chuyển cô ghi
  // hai nhóm một lượt). Trả về danh sách mã cô đã ghi.
  function ghiPhanCong({ cls, xinDu, chinhId, xinNhom }) {
    return db.tx(() => {
      const daGhi = db.setClassTeachers(cls.id, xinDu, chinhId);
      if (xinNhom) {
        for (const [tid, ma] of Object.entries(xinNhom)) nhomCo.dat(db, cls.id, tid, ma);
      }
      // Cô đã rời nhóm thì dòng khai nhóm của cô cũng đi theo — không dọn thì
      // cô quay lại sẽ mang theo vai cũ mà không ai bấm gì.
      nhomCo.donTheoDanhSachCo(db, cls.id, daGhi);
      return daGhi;
    });
  }

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

    const p = soatPhanCong(req.user, cls, req.body || {});
    if (p.loi) return res.status(p.loi[0]).json({ error: p.loi[1] });
    const daGhi = ghiPhanCong(p);
    db.audit(req.user.id, 'class-teachers-set', cls.id, { teacherIds: daGhi, chinhId: p.chinhId, nhom: p.xinNhom || null });
    res.json({ ok: true, classId: cls.id, ...nl.tomTat(cls.id), nhom: nhomCo.nhomTheoLop(db, cls.id) });
  });

  // ---------- Giáo viên ----------
  app.get('/api/admin/teachers', onlyAdmin, (req, res) => {
    const pham = phamViNhom(req.user);
    res.json(db.all('users', `SELECT * FROM users WHERE role = 'teacher' AND active = 1 ORDER BY name`)
      // Cấp 3 thấy cô có nhóm ở cơ sở mình, cộng cô CHƯA TỪNG có nhóm nào mà do
      // chính cơ sở mình tạo ra (Đ239d1) — trước đó cô vừa tạo xong là biến
      // khỏi danh sách của người tạo. Cô chưa có nhóm do ban giám hiệu tạo thì
      // vẫn chỉ Cấp 1 thấy, như cũ.
      .filter(u => coTrongTamNhin(req.user, u.id, pham))
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
      // CÔ DO CẤP 3 TẠO THUỘC CƠ SỞ CỦA NGƯỜI TẠO (Đ239d1) — cùng lý do với
      // nhóm mới do Cấp 3 tạo ở đường `POST /api/admin/classes`: không ghi thì
      // cô chưa gán nhóm biến khỏi danh sách của chính người vừa tạo.
      const coSoNguoiTao = db.phamViCoSo(req.user);
      if (coSoNguoiTao) {
        db.insert('giao_vien_co_so', { userId: rec.id, campusId: coSoNguoiTao, taoLuc: rec.createdAt });
      }
    });
    db.audit(req.user.id, 'teacher-create', rec.id, { name: rec.name, classId: classId || null });
    res.status(201).json({ id: rec.id, name: rec.name, username, temporaryPassword: matKhau });
  });

  // CHUYỂN CÔ TỪ NHÓM NÀY SANG NHÓM KHÁC, MỘT BƯỚC (Đ239d1 — góp ý 16/10, mục 5).
  //
  // Trường: quản lý cơ sở "điều chuyển giáo viên từ lớp này qua lớp khác".
  // Trước đây phải mở nhóm đi bỏ tích cô, rồi mở nhóm đến tích cô và chọn lại
  // vai — hai lượt lưu, giữa hai lượt cô không thuộc nhóm nào, và vai của cô
  // (cô nước ngoài, cô thể chất) mất theo lượt thứ nhất.
  //
  // Hai nhóm đi qua ĐÚNG bộ soát của `PUT /api/admin/classes/:id/teachers`
  // (`soatPhanCong`) và ghi trong MỘT giao dịch: hỏng ở nhóm đến thì cô vẫn
  // nguyên ở nhóm đi. Vai của cô đi theo sang nhóm đến nếu nhóm đến chưa khai
  // vai nào cho cô. Cô chính ở nhóm đến giữ nguyên; nhóm đến chưa có cô nào
  // thì cô vừa chuyển sang là cô chính, như khi tạo cô mới vào nhóm trống.
  app.post('/api/admin/teachers/:id/chuyen-nhom', onlyAdmin, (req, res) => {
    if (chanNeuVanPhong(req, res, 'Chuyển cô sang nhóm khác')) return;
    // Chức vụ có danh sách đường riêng (Nhân sự) tới được đây qua tiền tố
    // `/api/admin/teachers`, nhưng việc của đường này là việc của đường phân
    // công cô — nên hỏi danh sách cho phép của chức vụ cho chính đường ấy.
    if (chanNeuKhongGoiDuoc(req, res, '/api/admin/classes/:id/teachers', 'Phân công cô vào nhóm')) return;
    const t = db.findUser(req.params.id);
    if (!t || t.role !== 'teacher' || !coTrongTamNhin(req.user, t.id)) return khongThuocCoSo(res, 'cô này');

    const tuNhom = String((req.body || {}).tuNhom || '').trim();
    const denNhom = String((req.body || {}).denNhom || '').trim();
    if (!tuNhom || !denNhom) {
      return res.status(400).json({ error: 'Chọn nhóm cô đang dạy và nhóm chuyển sang' });
    }
    if (tuNhom === denNhom) {
      return res.status(400).json({ error: 'Nhóm chuyển sang phải khác nhóm cô đang dạy' });
    }
    const lopTu = db.findClass(tuNhom);
    const lopDen = db.findClass(denNhom);
    if (!lopTu || !lopDen) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!duocChamNhom(req.user, lopTu.id) || !duocChamNhom(req.user, lopDen.id)) {
      return khongThuocCoSo(res, 'nhóm lớp');
    }
    if (!db.classIdsOfTeacher(t.id).includes(lopTu.id)) {
      return res.status(400).json({ error: `Cô ${t.name} hiện không phụ trách nhóm ${lopTu.name}` });
    }
    if (lopDen.active === false) {
      return res.status(400).json({ error: `Nhóm ${lopDen.name} đã đóng, không chuyển cô sang được` });
    }
    // Cùng chốt với đường cũ `PUT /api/admin/classes/:id`: cô đang dạy ở cơ sở
    // khác thì Cấp 3 không đổi phân công của cô — nhận vai chính ở nhóm đến là
    // hạ vai chính của cô ở nhóm bên kia mà bên đó không hay biết.
    if (chanCoDayCoSoKhac(req, res, t)) return;

    const dangChinh = (classId) => (db.teachersOfClass(classId).find(c => c.vaiTro === 'chinh') || {}).id || null;
    const conLai = db.teacherIdsOfClass(lopTu.id).filter(id => id !== t.id);
    const chinhTu = dangChinh(lopTu.id);
    const pTu = soatPhanCong(req.user, lopTu, {
      teacherIds: conLai, chinhId: chinhTu === t.id ? null : chinhTu,
    });
    if (pTu.loi) return res.status(pTu.loi[0]).json({ error: pTu.loi[1] });

    const daODen = db.teacherIdsOfClass(lopDen.id).includes(t.id);
    const vai = nhomCo.nhomCua(db, lopTu.id, t.id);
    const chuaKhaiVaiODen = !(t.id in nhomCo.nhomTheoLop(db, lopDen.id));
    const pDen = soatPhanCong(req.user, lopDen, {
      teacherIds: daODen ? db.teacherIdsOfClass(lopDen.id) : [...db.teacherIdsOfClass(lopDen.id), t.id],
      chinhId: dangChinh(lopDen.id),
      nhom: !daODen && chuaKhaiVaiODen ? { [t.id]: vai } : undefined,
    });
    if (pDen.loi) return res.status(pDen.loi[0]).json({ error: pDen.loi[1] });

    db.tx(() => {
      ghiPhanCong(pTu);
      ghiPhanCong(pDen);
    });
    db.audit(req.user.id, 'co-chuyen-nhom', t.id, {
      name: t.name, tuNhom: lopTu.id, denNhom: lopDen.id, vai: nhomCo.nhomCua(db, lopDen.id, t.id),
    });
    res.json({
      ok: true,
      teacherId: t.id,
      tuNhom: { classId: lopTu.id, ...nl.tomTat(lopTu.id) },
      denNhom: { classId: lopDen.id, ...nl.tomTat(lopDen.id) },
    });
  });

  // ---------- Học sinh ----------
  // ------------------------------------------------------------------------
  // HỒ SƠ BÉ ĐÃ ĐỦ CHƯA (Đ161)
  // ------------------------------------------------------------------------
  //
  // Nhà trường 07/09 nói **bắt buộc** mỗi bé phải có đủ bố, mẹ và một người
  // liên hệ khẩn cấp ngoài bố mẹ. Lý do rõ ràng và đúng: có lúc gọi bố không
  // được, gọi mẹ cũng không được, và bé đang sốt.
  //
  // TÔI LÀM KHÁC CHỮ "BẮT BUỘC", VÀ ĐÂY LÀ LÝ DO.
  //
  // "Bắt buộc" hiểu theo nghĩa CHẶN thì chặn ở đâu cũng làm hỏng một việc
  // đang chạy:
  //
  //   • Chặn ở đường nhập danh sách đầu năm — ba trăm bé trong một tệp Excel
  //     mà trường chưa kịp thu giấy của nhà nào, thì cả lượt nhập trượt và
  //     trường không có gì để bắt đầu năm học.
  //   • Chặn ở đường SỬA hồ sơ — văn phòng mở hồ sơ ra chỉ để đổi một số điện
  //     thoại, và không lưu được vì thiếu tên bà ngoại. Lần sau họ thôi sửa.
  //
  // Cái nhà trường thật sự cần không phải một cái nút bấm không được, mà là
  // **biết hồ sơ nào còn thiếu gì để đi đòi cho đủ**. Nên: máy đếm, máy liệt
  // kê, và nói thẳng thiếu món nào — không chặn một đường ghi nào cả.
  //
  // KHÔNG PHẢI MỘT CON SỐ VỀ ĐỨA TRẺ. Dòng này nói về giấy tờ người lớn chưa
  // nộp; chữ trên màn hình phải giữ đúng nghĩa đó (QUY TẮC 2).
  const MON_HO_SO = [
    ['bo-me', 'đủ bố và mẹ'],
    ['khan-cap', 'một người liên hệ khẩn cấp ngoài bố mẹ'],
  ];

  function thieuGiHoSo(studentId, parentIds) {
    const thieu = [];
    // Hai phụ huynh trở lên là đủ theo cách app biết: app không hỏi ai là bố,
    // ai là mẹ — `students.parentIds` chỉ là "những người nhà của bé này".
    // Đếm là thứ app trả lời được thật; đoán vai thì không.
    if ((parentIds || []).length < 2) thieu.push('bo-me');
    if (!db.lienHeKhanCap(studentId).length) thieu.push('khan-cap');
    return thieu;
  }

  // Danh sách hồ sơ còn thiếu, để văn phòng đi đòi cho đủ.
  //
  // Chức vụ Nhân sự / Kế toán / Marketing KHÔNG tới được đường này, và không
  // cần chốt thêm ở đây: danh sách cho phép của ba chức vụ ấy không có tiền tố
  // `/api/admin`, nên tầng chức vụ chặn từ trước khi vào hàm (lib/db.js).
  app.get('/api/admin/ho-so-chua-du', onlyAdmin, (req, res) => {
    const trongPhamVi = phamViNhom(req.user);
    const rows = db.all('students', 'SELECT * FROM students WHERE active = 1 ORDER BY name')
      .filter(s => trongPhamVi === null || trongPhamVi.includes(s.classId));
    const tenNhom = nhoTenNhom();
    const ds = [];
    for (const s of db.withParents(rows)) {
      const thieu = thieuGiHoSo(s.id, s.parentIds);
      if (!thieu.length) continue;
      ds.push({
        studentId: s.id,
        hoTen: s.name,
        maBe: s.code || '',
        classId: s.classId || '',
        tenNhom: tenNhom(s.classId),
        thieu,
        thieuChu: thieu.map(m => (MON_HO_SO.find(x => x[0] === m) || [, m])[1]),
      });
    }
    res.json({
      soBe: rows.length,
      soChuaDu: ds.length,
      mon: MON_HO_SO.map(([ma, ten]) => ({ ma, ten })),
      danhSach: ds,
    });
  });

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
    // Bảo lưu và quan hệ phụ huynh (Đ239d2): một lượt hỏi cho cả danh sách.
    const ids = rows.map(s => s.id);
    const dau = ids.map(() => '?').join(',');
    const baoLuu = new Map(ids.length ? db.all('hoc_sinh_bao_luu',
      `SELECT * FROM hoc_sinh_bao_luu WHERE studentId IN (${dau})`, ids).map(r => [r.studentId, r]) : []);
    const quanHe = new Map(ids.length ? db.all('quan_he_phu_huynh',
      `SELECT * FROM quan_he_phu_huynh WHERE studentId IN (${dau})`, ids)
      .map(r => [`${r.studentId}|${r.parentId}`, r.quanHe]) : []);
    res.json(db.withParents(rows).map(s => ({
      ...s,
      ...db.hoSoBe(s.id),
      dongY: db.dongYCuaBe(s.id),
      // Hồ sơ còn thiếu món nào (Đ161) — để màn danh sách chỉ ngay chỗ phải
      // đòi, không bắt văn phòng mở từng hồ sơ ra dò.
      thieuHoSo: thieuGiHoSo(s.id, s.parentIds),
      className: tenNhom(s.classId),
      // Chỉ bé ĐANG NGHỈ mới mang nhãn bảo lưu: dòng sót lại của một bé đã đi
      // học lại bằng đường khác không được làm màn hình nói sai.
      baoLuu: (!s.active && baoLuu.get(s.id)) || null,
      parents: s.parentIds.map(id => {
        const p = db.findUser(id);
        // Đường này đã là onlyAdmin nên số CCCD đi kèm được. Vẫn liệt kê từng
        // trường một chứ không trải cả hàng `users` ra: hàng đó có passwordHash.
        return p ? {
          id: p.id, name: `${p.title} ${p.name}`, username: p.username, phone: p.phone,
          soCccd: db.hoSoNguoiDung(p.id).soCccd,
          quanHe: quanHe.get(`${s.id}|${p.id}`) || '',
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
      'Số định danh cá nhân', 'Dân tộc', 'Tiền sử bệnh / lưu ý đặc biệt',
      'Địa chỉ', 'Bố / mẹ', 'Số CCCD của bố / mẹ', 'Người liên hệ khẩn cấp',
      'Đồng ý hồ sơ học tập', 'Đồng ý chia sẻ ảnh', 'Đồng ý truyền thông',
      'Người ký giấy', 'Ngày ký', 'Tình trạng'];

    // MỘT LƯỢT TRA CHO CẢ TRƯỜNG, KHÔNG PHẢI MƯỜI CÂU CHO MỖI BÉ.
    //
    // Thân vòng lặp cũ hỏi lẻ từng thứ (lớp, cơ sở, hồ sơ mở rộng, liên hệ
    // khẩn cấp, từng phụ huynh HAI lần, CCCD từng người, giấy đồng ý) — với
    // 300 bé là vài nghìn truy vấn đồng bộ chặn cả máy chủ cho một cú bấm
    // "Xuất danh sách". Tra mỗi bảng MỘT lần rồi ghép trong bộ nhớ; nội dung
    // từng ô giữ nguyên từng chữ so với bản cũ.
    const beIds = rows.map(s => s.id);
    const chiaLo = (arr) => {
      const ra = [];
      for (let i = 0; i < arr.length; i += 400) ra.push(arr.slice(i, i + 400));
      return ra;
    };
    const goms = (bang, sql, ids, khoa) => {
      const ra = new Map();
      for (const lo of chiaLo([...new Set(ids.filter(Boolean))])) {
        const m = lo.map(() => '?').join(',');
        for (const r of db.all(bang, sql.replace('__IN__', m), lo)) {
          if (khoa === undefined) ra.set(r.studentId || r.userId, r);
          else {
            if (!ra.has(r[khoa])) ra.set(r[khoa], []);
            ra.get(r[khoa]).push(r);
          }
        }
      }
      return ra;
    };
    const lopTheoId = new Map(db.all('classes', 'SELECT * FROM classes').map(c => [c.id, c]));
    const coSoCuaLop = new Map(db.all('class_campus', 'SELECT classId, campusId FROM class_campus')
      .map(r => [r.classId, r.campusId]));
    const coSoTheoId = new Map(db.all('campuses', 'SELECT * FROM campuses').map(c => [c.id, c]));
    const hoSoTheoBe = goms('student_profile',
      'SELECT * FROM student_profile WHERE studentId IN (__IN__)', beIds);
    const lienHeTheoBe = goms('student_emergency_contacts',
      'SELECT * FROM student_emergency_contacts WHERE studentId IN (__IN__) ORDER BY taoLuc, rowid',
      beIds, 'studentId');
    const dongYTheoBe = db.dongYCuaCacBe(beIds);
    const phuHuynhTheoId = new Map(db.all('users',
      "SELECT id, title, name, phone FROM users WHERE role = 'parent'").map(u => [u.id, u]));
    const cccdTheoNguoi = new Map(db.all('user_profile',
      'SELECT userId, soCccd FROM user_profile').map(r => [r.userId, r.soCccd || '']));

    const duLieu = db.withParents(rows).map(s => {
      const lop = s.classId ? lopTheoId.get(s.classId) : null;
      const cs = s.classId ? coSoTheoId.get(coSoCuaLop.get(s.classId)) : null;
      const mr = hoSoTheoBe.get(s.id) || {};
      const hs = {
        soDinhDanh: mr.soDinhDanh || '',
        // Cùng luật lùi về ô "Dị ứng" đời cũ như db.hoSoBe.
        tienSuBenh: mr.tienSuBenh || s.allergies || '',
        lienHeKhanCap: lienHeTheoBe.get(s.id) || [],
      };
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
        'Tiền sử bệnh / lưu ý đặc biệt': hs.tienSuBenh || '',
        'Địa chỉ': s.address || '',
        'Bố / mẹ': (s.parentIds || []).map(id => {
          const p = phuHuynhTheoId.get(id);
          return p ? `${p.title} ${p.name}${p.phone ? ` (${p.phone})` : ''}` : '';
        }).filter(Boolean).join(' · '),
        'Số CCCD của bố / mẹ': (s.parentIds || []).map(id => {
          const p = phuHuynhTheoId.get(id);
          const so = p ? (cccdTheoNguoi.get(p.id) || '') : '';
          return so ? `${p.title} ${p.name}: ${so}` : '';
        }).filter(Boolean).join(' · '),
        'Người liên hệ khẩn cấp': (hs.lienHeKhanCap || [])
          .map(l => `${l.hoTen}${l.quanHe ? ` — ${l.quanHe}` : ''}${l.dienThoai ? ` (${l.dienThoai})` : ''}`)
          .join(' · '),
        ...(() => {
          // Ba giá trị, nên viết ra chữ chứ không viết x / trống: người đọc
          // bảng phải phân biệt được "gia đình nói không" với "chưa thu giấy".
          const d = dongYTheoBe.get(s.id) || db.dongYCuaBe(s.id);
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
  // Những trường thuộc phần NHÂN THÂN của hồ sơ bé (Đ168). Mọi trường KHÔNG có
  // tên ở đây — `classId`, `active` — là phần vận hành hằng ngày của văn phòng.
  //
  // Danh sách này phải đi cùng vòng lặp ghi bên dưới: thêm một trường nhân thân
  // mới mà quên khai ở đây là mở lại đúng cánh cửa vừa đóng. `test:ho-so-sua`
  // mục [4] đối chiếu hai chỗ với nhau để chuyện đó không lặng lẽ xảy ra.
  const TRUONG_NHAN_THAN = [
    'name', 'code', 'dob', 'gender', 'address', 'ethnicity', 'bloodType',
    'soDinhDanh', 'tienSuBenh', 'lienHeKhanCap',
  ];

  app.put('/api/admin/students/:id', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');

    // AI SỬA ĐƯỢC PHẦN NHÂN THÂN (Đ168) — SIẾT THEO TRƯỜNG, KHÔNG SIẾT CẢ ĐƯỜNG.
    //
    // Bảng 07/09 của trường: *"Admin cơ sở NHẬP, Quản lý cơ sở và Hiệu trưởng
    // CHỈNH SỬA"*. Nhưng cùng một đường này mang hai loại việc khác hẳn nhau:
    // phần NHÂN THÂN của bé, và phần VẬN HÀNH HẰNG NGÀY (chuyển nhóm, đánh dấu
    // bé đã nghỉ). Chặn cả đường là văn phòng thôi chuyển nhóm được cho bé —
    // việc xảy ra giữa năm, và chờ duyệt từng lượt thì sổ điểm danh hôm ấy sai.
    //
    // Nên chốt chặn chỉ đứng trước những trường nhân thân, và câu từ chối NÓI
    // RA những gì họ vẫn làm được — một lời từ chối cụt lủn là chỗ người dùng
    // quay về sổ giấy.
    if (!db.suaHoSoBeDuoc(req.user)) {
      // CHỈ NỔ KHI GIÁ TRỊ THẬT SỰ ĐỔI, không nổ vì trường ấy CÓ MẶT trong gói.
      //
      // Bản đầu của chốt chặn này hỏng đúng cái nó hứa không hỏng. Màn "Sửa hồ
      // sơ" gửi TRỌN biểu mẫu mỗi lần lưu — mười trường nhân thân cộng `classId`
      // trong cùng một gói PUT — nên văn phòng chỉ đổi ô Nhóm rồi bấm Lưu cũng
      // nhận 403, tức mất luôn việc CHUYỂN NHÓM và việc GHI GIẤY ĐỒNG Ý (đường
      // đồng ý nằm sau nó trong cùng khối). Đúng hai việc mà câu từ chối ngay
      // bên dưới hứa họ vẫn làm được.
      //
      // Bài canh của Đ168 không thấy vì nó gửi từng trường một — đúng như API
      // cho phép, nhưng KHÔNG PHẢI cách màn hình thật gửi. Bài canh nay có thêm
      // mục gửi trọn biểu mẫu y như trình duyệt.
      const hienTai = { ...s, ...db.hoSoBe(s.id), lienHeKhanCap: db.lienHeKhanCap(s.id) };
      const doiThat = (k) => {
        const moi = req.body[k];
        if (moi === undefined) return false;
        if (k === 'lienHeKhanCap') {
          const gon = (ds) => JSON.stringify((ds || []).map(x => [
            String(x.hoTen || '').trim(), String(x.quanHe || '').trim(), String(x.dienThoai || '').trim(),
          ]).filter(x => x.some(Boolean)));
          return gon(moi) !== gon(hienTai.lienHeKhanCap);
        }
        return String(moi ?? '').trim() !== String(hienTai[k] ?? '').trim();
      };
      const dungToi = TRUONG_NHAN_THAN.filter(doiThat);
      if (dungToi.length) {
        return res.status(403).json({
          error: 'Sửa thông tin nhân thân của bé là việc của quản lý cơ sở hoặc ban giám hiệu. '
            + 'Tài khoản này vẫn chuyển được bé sang nhóm khác, đánh dấu bé đã nghỉ, '
            + 'và ghi giấy đồng ý của gia đình.',
        });
      }
    }

    const patch = {};
    // `ethnicity` (dân tộc) và `bloodType` (nhóm máu) vào danh sách này từ đợt
    // soát 31/08. Hai cột ấy có trong bảng `students` từ lúc nhân bản nền, HIỆN
    // trên màn hồ sơ của gia đình và có trong tệp xuất Excel của văn phòng —
    // nhưng trước bản vá này KHÔNG màn hình nào nhập được. Nghĩa là chúng chỉ
    // có thể mang giá trị do dữ liệu cũ để lại: văn phòng nhìn thấy hai ô trống
    // vĩnh viễn và không có cách nào điền, còn tệp gửi Phòng giáo dục thì thiếu
    // đúng hai cột mẫu sổ đòi.
    //
    // MỞ ĐƯỜNG GHI chứ không gỡ hai ô đi: gỡ là bỏ một thứ nhà trường có thật
    // trong sổ giấy, và là đổi hình dạng câu trả lời mà app cũ đang đọc.
    //
    // Vẫn nằm nguyên sau `onlyAdmin` + `duocChamBe`: đây là dữ liệu nhân thân
    // và sức khoẻ của trẻ dưới 6 tuổi (Nghị định 13/2023), cô không cần nó để
    // làm việc nên cô cũng không sửa được.
    for (const k of ['name', 'code', 'dob', 'gender', 'address', 'ethnicity', 'bloodType']) {
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
    // Nhận lại cũng là ĐI HỌC LẠI sau bảo lưu (Đ239d2), còn đánh dấu nghỉ ở đây
    // là nghỉ HẲN: đằng nào cũng hết bảo lưu thì hết nhãn.
    if (patch.active !== undefined) db.run('DELETE FROM hoc_sinh_bao_luu WHERE studentId = ?', [s.id]);

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
    // "Cho nghỉ" là nghỉ HẲN: bé đang bảo lưu mà bị cho nghỉ thì hết nhãn bảo lưu.
    db.tx(() => {
      choBeNghiHoc(s);
      db.run('DELETE FROM hoc_sinh_bao_luu WHERE studentId = ?', [s.id]);
    });
    db.audit(req.user.id, 'student-deactivate', s.id, { name: s.name });
    res.json({ ok: true });
  });

  // MỘT chỗ cho bé nghỉ học — "Cho nghỉ" và "Nghỉ học bảo lưu" đều đi qua đây,
  // để hai kiểu nghỉ không bao giờ lệch nhau về chuyện bé rời danh sách nào,
  // gia đình còn xem được gì, và mốc 12 tháng tính từ đâu.
  function choBeNghiHoc(s) {
    lsl.ghiRoiLop(s.id, lsl.homNay());
    db.update('students', s.id, { active: false, leftAt: ngayVN.homNay() });
  }

  // NGHỈ HỌC BẢO LƯU (Đ239d2 — góp ý 16/10, mục 5).
  //
  // Trường: văn phòng cơ sở "nghỉ học bảo lưu". Bé tạm nghỉ (về quê, ốm dài
  // ngày) rồi sẽ quay lại. HIỆU ỨNG Y HỆT "Cho nghỉ": bé rời danh sách điểm
  // danh, nhật ký, thông báo của nhóm; dữ liệu cũ giữ nguyên; gia đình đi theo
  // đúng luật của bé đã nghỉ (mục "Hồ sơ con đã ra trường", hạn 12 tháng). KHÔNG
  // thêm luật quyền nào — chỉ ghi thêm rằng lần nghỉ này là TẠM, để văn phòng
  // phân biệt được với bé nghỉ hẳn và biết tháng nào bé hẹn quay lại.
  //
  // Đi học lại là đường "Nhận lại" đang có (PUT … {active:true}).
  app.post('/api/admin/students/:id/bao-luu', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, s.id) || !duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');
    if (!s.active) {
      return res.status(400).json({ error: 'Bé đang nghỉ học rồi. Muốn ghi bảo lưu thì bấm "Nhận lại" trước.' });
    }
    const b = req.body || {};
    const homNay = ngayVN.homNay();
    const tuNgay = String(b.tuNgay || '').trim() || homNay;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tuNgay) || Number.isNaN(Date.parse(`${tuNgay}T00:00:00Z`))) {
      return res.status(400).json({ error: 'Ngày bắt đầu bảo lưu chưa đúng dạng, ví dụ đúng: 2026-10-01' });
    }
    // Bảo lưu có hiệu lực NGAY lúc lưu (bé rời danh sách điểm danh từ hôm nay),
    // nên một ngày bắt đầu ở tương lai là hứa một điều máy không làm.
    if (tuNgay > homNay) {
      return res.status(400).json({ error: 'Bảo lưu có hiệu lực ngay khi lưu, nên ngày bắt đầu không được sau hôm nay.' });
    }
    // Ghi lùi có trần. Gõ nhầm năm (2025 thay vì 2026) mà máy nhận thì lúc thôi
    // bảo lưu ngày nghỉ lùi về hơn một năm trước, và gia đình mất quyền xem hồ
    // sơ con (hạn 12 tháng) ngay lập tức.
    const somNhat = new Date(Date.parse(`${homNay}T00:00:00Z`) - 60 * 86400000).toISOString().slice(0, 10);
    if (tuNgay < somNhat) {
      const dmy = `${somNhat.slice(8, 10)}/${somNhat.slice(5, 7)}/${somNhat.slice(0, 4)}`;
      return res.status(400).json({
        error: `Ngày bắt đầu bảo lưu chỉ ghi lùi được tối đa 60 ngày, tức sớm nhất là ngày ${dmy}. Xin xem lại ngày, có thể bị gõ nhầm năm.`,
      });
    }
    const duKienQuayLai = String(b.duKienQuayLai || '').trim();
    if (duKienQuayLai && !/^\d{4}-(0[1-9]|1[0-2])$/.test(duKienQuayLai)) {
      return res.status(400).json({ error: 'Tháng dự kiến quay lại chưa đúng dạng, ví dụ đúng: 2027-01' });
    }
    if (duKienQuayLai && duKienQuayLai < tuNgay.slice(0, 7)) {
      return res.status(400).json({ error: 'Tháng dự kiến quay lại phải từ tháng bắt đầu bảo lưu trở đi.' });
    }
    const rec = {
      studentId: s.id,
      tuNgay,
      duKienQuayLai,
      lyDo: String(b.lyDo || '').trim().slice(0, 500),
      nguoiGhi: req.user.id,
      ghiLuc: new Date().toISOString(),
    };
    db.tx(() => {
      choBeNghiHoc(s);
      db.run(`INSERT OR REPLACE INTO hoc_sinh_bao_luu (studentId, tuNgay, duKienQuayLai, lyDo, nguoiGhi, ghiLuc)
              VALUES (@studentId, @tuNgay, @duKienQuayLai, @lyDo, @nguoiGhi, @ghiLuc)`, rec);
    });
    // Lý do KHÔNG vào nhật ký: nó hay là chuyện sức khoẻ, chuyện nhà của bé.
    db.audit(req.user.id, 'student-bao-luu', s.id, { name: s.name, tuNgay, duKienQuayLai });
    res.json({ ok: true, baoLuu: rec });
  });

  // THÔI BẢO LƯU, NGHỈ HẲN (Đ239-vá3). Bé bảo lưu rồi gia đình báo không quay
  // lại: bỏ nhãn bảo lưu, bé vẫn nghỉ — mốc 12 tháng gia đình còn xem hồ sơ con
  // tính từ hôm bé thôi đi học, không phải hôm văn phòng bấm nút này. Cùng
  // quyền với ghi bảo lưu.
  //
  // Bảo lưu GHI LÙI ngày (Đ239-vá4) thì ngày nghỉ đang là hôm bấm Bảo lưu, muộn
  // hơn ngày bắt đầu bảo lưu: ngày nghỉ lùi về ngày bắt đầu, không thì Xuất báo
  // cáo đếm mấy ngày ở giữa là "Chưa điểm danh". Không bao giờ dời về sau.
  //
  // Và không lùi tới mức gia đình hết hạn xem hồ sơ con (Đ239-vá5): dòng bảo lưu
  // ghi từ trước khi có trần 60 ngày, hay bảo lưu đã kéo dài gần một năm, mang
  // ngày bắt đầu quá 12 tháng — lùi về đó là gia đình đang xem được bỗng bị chặn
  // ở mọi đường của bé. Khi ấy giữ ngày nghỉ cũ: Xuất báo cáo đếm thừa vài ngày
  // "Chưa điểm danh" vẫn nhẹ hơn gia đình mất hồ sơ con.
  app.post('/api/admin/students/:id/thoi-bao-luu', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, s.id) || !duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');
    const bl = db.first('hoc_sinh_bao_luu', 'SELECT * FROM hoc_sinh_bao_luu WHERE studentId = ?', [s.id]);
    if (s.active || !bl) return res.status(400).json({ error: 'Bé không đang nghỉ học bảo lưu.' });
    const ngayNghi = String(s.leftAt || '').slice(0, 10);
    const lui = (!/^\d{4}-\d{2}-\d{2}$/.test(ngayNghi) || bl.tuNgay < ngayNghi) && db.conHanXemHoSo(bl.tuNgay);
    db.tx(() => {
      if (lui) db.update('students', s.id, { leftAt: bl.tuNgay });
      db.run('DELETE FROM hoc_sinh_bao_luu WHERE studentId = ?', [s.id]);
    });
    db.audit(req.user.id, 'student-thoi-bao-luu', s.id,
      { name: s.name, tuNgay: bl.tuNgay, leftAt: lui ? bl.tuNgay : s.leftAt });
    res.json({ ok: true });
  });

  // Mỗi bé tối đa bấy nhiêu tài khoản phụ huynh: bố, mẹ và hai người nữa (ông
  // bà, người giám hộ). Mỗi tài khoản là một người nữa xem được ảnh và hồ sơ
  // sức khoẻ của bé, nên có trần thay vì để danh sách dài ra không ai soát.
  const SO_PHU_HUYNH_TOI_DA = 4;

  // THÊM PHỤ HUYNH CHO BÉ ĐÃ CÓ (Đ239d2 — góp ý 16/10, mục 5).
  //
  // Trường: văn phòng cơ sở "tạo tài khoản cho phụ huynh". Trước đây mỗi bé chỉ
  // có đúng phụ huynh được nhập lúc nhận bé — bố có rồi thì mẹ không có đường
  // nào để có tài khoản, trong khi thẻ "hồ sơ chưa đủ" lại đòi đủ bố và mẹ.
  //
  // LUÔN TẠO TÀI KHOẢN MỚI, KHÔNG GẮN VÀO TÀI KHOẢN CÓ SẴN THEO SỐ ĐIỆN THOẠI.
  // Đường nhận bé gộp theo số vì nhà hai con dùng chung một tài khoản — ở đó
  // phiếu in ra tên nhà được nối để người ngồi bàn soát lại. Ở đây người ta
  // đang thêm MỘT NGƯỜI MỚI cho một bé; gõ nhầm một chữ số mà máy tự gắn vào
  // tài khoản trùng số là một người lạ mở app ra thấy ảnh và hồ sơ sức khoẻ của
  // một đứa trẻ không phải con mình.
  app.post('/api/admin/students/:id/phu-huynh', onlyAdmin, (req, res) => {
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, s.id) || !duocChamBe(req.user, s.id)) return khongThuocCoSo(res, 'bé');
    const b = req.body || {};
    const loi = soatPhuHuynhMoi(b);
    if (loi) return res.status(400).json({ error: loi });
    if ((s.parentIds || []).length >= SO_PHU_HUYNH_TOI_DA) {
      return res.status(400).json({
        error: `Bé đã có đủ ${SO_PHU_HUYNH_TOI_DA} tài khoản phụ huynh. Người nhà khác cần đón bé `
          + 'thì ghi ở mục Liên hệ khẩn cấp trong hồ sơ của bé.',
      });
    }
    let ra = null;
    db.tx(() => { ra = taoPhuHuynhChoBe(s.id, b); });
    db.audit(req.user.id, 'phu-huynh-them', s.id,
      { name: s.name, parentId: ra.parent.id, phuHuynh: ra.parent.name, quanHe: ra.quanHe });
    res.status(201).json({
      id: ra.parent.id,
      studentId: s.id,
      name: ra.parent.name,
      phone: ra.parent.phone,
      quanHe: ra.quanHe,
      username: ra.parent.username,
      temporaryPassword: ra.matKhau,
    });
  });

  // Soát một phụ huynh sắp được tạo tài khoản. Trả câu lỗi, hoặc '' khi hợp lệ.
  function soatPhuHuynhMoi(p) {
    if (!String((p || {}).name || '').trim()) return 'Vui lòng nhập họ tên phụ huynh';
    if (!String((p || {}).phone || '').trim()) return 'Vui lòng nhập số điện thoại phụ huynh';
    return '';
  }

  function ghiQuanHe(studentId, parentId, quanHe) {
    const qh = String(quanHe || '').trim().slice(0, 40);
    if (!qh) return '';
    db.run(`INSERT INTO quan_he_phu_huynh (studentId, parentId, quanHe, ghiLuc) VALUES (?, ?, ?, ?)
            ON CONFLICT(studentId, parentId) DO UPDATE SET quanHe = excluded.quanHe, ghiLuc = excluded.ghiLuc`,
    [studentId, parentId, qh, new Date().toISOString()]);
    return qh;
  }

  // Tạo một tài khoản phụ huynh MỚI và nối vào đúng một bé. Gọi trong db.tx.
  function taoPhuHuynhChoBe(studentId, p) {
    const ten = String(p.name).trim();
    const sdt = String(p.phone).trim();
    const { parent, matKhau } = taoTaiKhoanPhuHuynh({
      username: sinhTenDangNhap(ten, sdt, new Set()),
      name: ten, phone: sdt, email: String(p.email || '').trim(),
    });
    db.run('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)', [studentId, parent.id]);
    return { parent, matKhau, quanHe: ghiQuanHe(studentId, parent.id, p.quanHe) };
  }

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

  // ĐỌC CSV và ĐỌC MỘT DÒNG là hai việc khác nhau (Đ170).
  //
  // Đường thêm MỘT bé nhập học giữa năm cần y hệt bộ kiểm tra này — thiếu họ
  // tên, thiếu nhóm, mã trùng, bé trùng, nhóm cùng tên ở nhiều cơ sở, nhóm
  // không thuộc cơ sở của mình — nhưng nó không có tệp CSV nào cả.
  //
  // Nên phần ĐỌC TỆP tách khỏi phần SOÁT DÒNG. Đường một bé dựng thẳng một
  // hàng dữ liệu rồi gọi `phanTichRows`, không phải ghép chuỗi CSV giả rồi
  // nhờ máy đọc lại — ghép chuỗi là thêm một chỗ để dấu phẩy trong địa chỉ
  // hay dấu nháy trong tên làm hỏng đúng một hồ sơ.
  //
  // `phanTich` giữ nguyên tên và nguyên cách gọi: đường nhập tệp không đổi
  // một chữ nào.
  function phanTich(text, phamNhap) {
    const { rows } = csv.parse(text);
    return phanTichRows(rows, phamNhap);
  }

  function phanTichRows(rows, phamNhap) {
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
        // Hai cột KHÔNG bắt buộc và KHÔNG bao giờ làm dòng thành lỗi: mẫu sổ
        // của Phòng có chúng, nhưng tệp đầu năm của trường thì thường chưa
        // có. Thiếu cột thì `lay` trả chuỗi rỗng, y như trước đợt này.
        danToc: lay(row, 'Dân tộc', 'Dan toc', 'ethnicity'),
        nhomMau: lay(row, 'Nhóm máu', 'Nhom mau', 'bloodType'),
        classId: lop ? lop.id : null,
        taoLopMoi: !!tenLop && !lop,
        username: phHoTen ? sinhTenDangNhap(phHoTen, phSdt, daDungTen) : '',
        loi,
        trung,
      });
    }
    return ketQua;
  }

  // THÊM MỘT BÉ NHẬP HỌC GIỮA NĂM (Đ170).
  //
  // Bảng phân quyền 07/09 cho *"Admin cơ sở NHẬP hồ sơ bé"*, nhưng cả kho mã
  // chỉ có MỘT đường tạo bé: nhập hàng loạt từ tệp CSV. Nghĩa là một bé nhập
  // học giữa tháng 10 thì văn phòng phải mở Excel, gõ đúng tên cột, lưu đúng
  // bảng mã UTF-8, rồi tải lên — để tạo đúng một hồ sơ. Thực tế là họ sẽ nhờ
  // người khác, hoặc để đó, và bé đi học mấy hôm rồi mới có trong app.
  //
  // DÙNG LẠI ĐÚNG ĐƯỜNG CỦA TỆP CSV, KHÔNG VIẾT ĐƯỜNG THỨ HAI. Cùng bộ soát
  // (`phanTichRows`) và cùng thân nhận bé (`nhanMotBe`). Đây là quyết định
  // quan trọng nhất của đường này: nhận một đứa trẻ vào trường là bốn việc
  // phải làm đúng thứ tự, trong đó việc MỞ KHOẢNG LỊCH SỬ NHÓM hỏng lặng lẽ
  // nhất. Hai bản chép tay sẽ trôi khỏi nhau, và cái trôi ra sẽ là cái ít
  // người dùng hơn — tức đúng đường này.
  //
  // VĂN PHÒNG CƠ SỞ VẪN NHẬP ĐƯỢC, dù Đ168 vừa chặn họ SỬA phần nhân thân.
  // Không mâu thuẫn: bảng của trường tách đúng hai chữ ấy — *nhập* là của
  // admin cơ sở, *chỉnh sửa* là của quản lý cơ sở và hiệu trưởng. Người ngồi
  // bàn tiếp đón nhận hồ sơ giấy từ gia đình là người gõ nó vào.
  //
  // TRẢ VỀ TÊN ĐĂNG NHẬP VÀ MẬT KHẨU MỘT LẦN, y như phiếu của đường nhập tệp:
  // tạo hồ sơ bé mà gia đình không vào được app thì mới xong một nửa việc.
  app.post('/api/admin/students', onlyAdmin, (req, res) => {
    const b = req.body || {};
    // Dựng thẳng MỘT HÀNG dữ liệu đúng hình dạng `csv.parse` trả ra, rồi đưa
    // qua chính bộ soát của đường nhập tệp. Không ghép chuỗi CSV giả: dấu phẩy
    // trong địa chỉ hay dấu nháy trong tên là đủ làm hỏng đúng một hồ sơ.
    const hang = {
      __line: 1,
      'Họ tên': String(b.hoTen || '').trim(),
      Nhóm: String(b.tenLop || '').trim(),
      'Cơ sở': String(b.tenCoSo || '').trim(),
      'Họ tên phụ huynh': String(b.phHoTen || '').trim(),
      'Điện thoại': String(b.phSdt || '').trim(),
      Email: String(b.phEmail || '').trim(),
      'Mã của bé': String(b.ma || '').trim(),
      'Ngày sinh': String(b.ngaySinh || '').trim(),
      'Giới tính': String(b.gioiTinh || '').trim(),
      'Địa chỉ': String(b.diaChi || '').trim(),
      'Dân tộc': String(b.danToc || '').trim(),
      'Nhóm máu': String(b.nhomMau || '').trim(),
    };
    const [r] = phanTichRows([hang], phamViNhom(req.user));
    // MÀN HÌNH BIẾT MÃ NHÓM THÌ DÙNG MÃ, đừng bắt máy chủ đoán lại theo tên.
    //
    // Bộ soát tra nhóm theo TÊN vì tệp CSV chỉ có tên. Nhưng ba cơ sở đặt trùng
    // tên nhóm là chuyện thường, và khi ấy nó từ chối — đúng cho tệp, sai cho
    // đường này, nơi người dùng đang đứng TRONG nhóm và đã chọn xong rồi.
    const maNhom = String(b.classId || '').trim();
    if (maNhom) {
      const lop = db.findClass(maNhom);
      if (!lop) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
      if (!duocChamNhom(req.user, lop.id)) return khongThuocCoSo(res, 'nhóm lớp');
      r.classId = lop.id;
      r.tenLop = lop.name;
      r.taoLopMoi = false;
      // Lỗi "nhóm có ở nhiều cơ sở" và "nhóm không thuộc cơ sở của bạn" do bộ
      // soát sinh ra từ việc tra theo TÊN — mã nhóm đã trả lời xong cả hai câu
      // ấy, nên bỏ đúng hai lỗi đó đi. Mọi lỗi khác giữ nguyên.
      r.loi = r.loi.filter(x => !/nhiều cơ sở|không thuộc cơ sở/.test(x));
    }
    if (r.loi.length) {
      // Câu báo lỗi y hệt đường nhập tệp, chỉ bỏ chữ "dòng 1" đi cho đỡ lạ.
      return res.status(400).json({ error: r.loi.join('; ') });
    }
    // PHỤ HUYNH THỨ HAI (Đ239d2) — không bắt buộc; có thì soát TRƯỚC khi ghi
    // bất cứ thứ gì, để một ô thiếu không để lại bé nửa vời. Luôn là tài khoản
    // mới, cùng lý do với đường thêm phụ huynh cho bé đã có.
    const ph2 = b.phuHuynh2 && typeof b.phuHuynh2 === 'object' ? b.phuHuynh2 : {};
    const coPh2 = ['name', 'phone', 'quanHe', 'email'].some(k => String(ph2[k] || '').trim());
    if (coPh2) {
      const loi2 = soatPhuHuynhMoi(ph2);
      if (loi2) return res.status(400).json({ error: `Phụ huynh thứ hai: ${loi2.charAt(0).toLowerCase()}${loi2.slice(1)}` });
      if (chuanHoaSdt(ph2.phone) === chuanHoaSdt(r.phSdt)) {
        return res.status(400).json({ error: 'Số điện thoại của phụ huynh thứ hai trùng với phụ huynh thứ nhất' });
      }
    }
    // TRÙNG LÀ CẢNH BÁO, KHÔNG PHẢI LỖI — y như đường nhập tệp. Có thật chuyện
    // hai bé trùng cả họ tên, ngày sinh lẫn nhóm; văn phòng phải nói được
    // "đúng, cứ nhận" thay vì bị chặn cứng rồi đi nhờ người khác.
    if (r.trung && b.xacNhanTrung !== true) {
      return res.status(409).json({
        error: `Có vẻ bé này ${r.trung}. Nếu đúng là một bé khác trùng tên thì xác nhận để nhận vào.`,
        trung: r.trung,
      });
    }
    if (r.taoLopMoi) {
      return res.status(400).json({
        error: `Chưa có nhóm lớp nào tên "${r.tenLop}". Xin tạo nhóm ở mục Nhóm lớp trước, `
          + 'rồi nhận bé vào nhóm đó.',
      });
    }
    if (r.classId && !duocChamNhom(req.user, r.classId)) return khongThuocCoSo(res, 'nhóm lớp');

    const taiKhoan = [];
    let ra = null;
    let ra2 = null;
    // NHẬP ĐỦ THÔNG TIN NGAY LÚC NHẬN (Đ239d2). Số định danh, tiền sử bệnh và
    // liên hệ khẩn cấp ghi qua đúng hai hàm mà màn Sửa hồ sơ dùng, nên cùng
    // một cách làm sạch. Văn phòng NHẬP được — luật 07/09 chỉ cấm họ SỬA nhân
    // thân sau đó, và đường PUT vẫn giữ nguyên chốt ấy.
    const soDinhDanh = String(b.soDinhDanh || '').trim();
    const tienSuBenh = String(b.tienSuBenh || '').trim();
    db.tx(() => {
      ra = nhanMotBe(r, new Map(), taiKhoan);
      ghiQuanHe(ra.student.id, ra.parent.id, b.phQuanHe);
      if (soDinhDanh || tienSuBenh) db.luuHoSoBe(ra.student.id, { soDinhDanh, tienSuBenh });
      if (Array.isArray(b.lienHeKhanCap) && b.lienHeKhanCap.length) {
        db.datLienHeKhanCap(ra.student.id, b.lienHeKhanCap);
      }
      if (coPh2) ra2 = taoPhuHuynhChoBe(ra.student.id, ph2);
    });
    db.audit(req.user.id, 'student-create', ra.student.id,
      { name: ra.student.name, classId: ra.student.classId, phuHuynhThuHai: !!ra2 });
    res.status(201).json({
      ...ra.student,
      taiKhoan: taiKhoan[0] || null,
      taiKhoanPhuHuynh2: ra2 ? {
        phuHuynh: ra2.parent.name,
        phuHuynhSdt: ra2.parent.phone,
        quanHe: ra2.quanHe,
        username: ra2.parent.username,
        matKhau: ra2.matKhau,
      } : null,
    });
  });

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

  // NHẬN MỘT BÉ VÀO TRƯỜNG — một chỗ duy nhất (Đ170).
  //
  // Thân hàm này là thân vòng lặp cũ của đường nhập tệp, tách ra nguyên vẹn
  // chứ không viết lại. Lý do tách: đường thêm MỘT bé nhập học giữa năm phải
  // làm đúng bốn việc này theo đúng thứ tự ấy —
  //
  //   ① gộp phụ huynh trùng số điện thoại (nhà hai con dùng chung một tài khoản)
  //   ② tạo hồ sơ bé
  //   ③ MỞ KHOẢNG LỊCH SỬ NHÓM ngay từ hôm nay
  //   ④ nối bé với phụ huynh
  //
  // Bước ③ là bước dễ quên nhất và hỏng lặng lẽ nhất: thiếu nó thì bé không
  // có đoạn đầu trong lịch sử nhóm, và mọi thứ đọc theo "bé học nhóm nào hồi
  // tháng ấy" — album năm cũ, báo cáo, sổ điểm danh của nhóm cũ — đều hụt
  // đúng một bé mà không ai báo.
  //
  // Chép tay lần thứ hai thì hai đường sẽ trôi khỏi nhau ở lần sửa thứ ba.
  // SO SỐ ĐIỆN THOẠI THÌ BỎ DẤU CÁCH, NHƯNG GHI XUỐNG THÌ GIỮ NGUYÊN CHỮ ĐÃ GÕ.
  //
  // Biểu mẫu hứa thẳng với người dùng: *"Nhà đã có con học ở trường thì dùng lại
  // đúng số này — máy nối bé mới vào đúng tài khoản cũ"*. Bản đầu so khớp chuỗi
  // NGUYÊN VĂN, nên `0912 345 678` và `0912345678` là hai nhà khác nhau: gia
  // đình nhận thêm một tài khoản thứ hai, hai con nằm ở hai chỗ, và lời hứa in
  // ngay trên ô nhập thành sai. Dán số từ Excel hay từ danh bạ điện thoại là ra
  // đúng các dạng có dấu cách ấy.
  //
  // CHỈ BỎ THỨ CHẮC CHẮN LÀ CÁCH TRÌNH BÀY: dấu cách, chấm, gạch, ngoặc. KHÔNG
  // quy đổi `+84` về `0` — đó là một phép đoán về mã vùng, và đoán sai ở đây là
  // gộp hồ sơ hai đứa trẻ vào một nhà.
  function chuanHoaSdt(x) {
    return String(x || '').replace(/[\s.\-()]/g, '');
  }

  function nhanMotBe(r, lopTheoTen, taiKhoan) {
    const classId = r.classId || lopTheoTen.get(r.tenLop) || null;

    // Gộp phụ huynh trùng số điện thoại — nhà có hai con thì dùng chung một tài khoản.
    const sdtChuan = chuanHoaSdt(r.phSdt);
    let parent = sdtChuan
      ? db.first('users',
        `SELECT * FROM users WHERE role = 'parent' AND active = 1
           AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', ''), '(', ''), ')', '') = ?`,
        [sdtChuan])
      : null;
    let matKhau = null;
    if (!parent) {
      ({ parent, matKhau } = taoTaiKhoanPhuHuynh({
        username: r.username, name: r.phHoTen, phone: r.phSdt, email: r.phEmail,
      }));
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
      ethnicity: r.danToc || '', bloodType: r.nhomMau || '', allergies: '',
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
      // SỐ ĐIỆN THOẠI CỦA TÀI KHOẢN ĐƯỢC NỐI VÀO, để phiếu nói ra được nhà nào.
      // Gõ nhầm một chữ số là nối bé vào tài khoản của nhà người khác — và
      // trước đợt này phiếu không in thứ duy nhất lộ ra điều đó.
      phuHuynhSdt: parent.phone || '',
      daCoTaiKhoan: !matKhau,
      username: parent.username,
      matKhau: matKhau || '(đã có tài khoản từ trước)',
    });
    return { student, parent };
  }

  // MỘT khuôn tài khoản phụ huynh cho mọi đường tạo: nhận bé, nhập tệp, thêm
  // phụ huynh cho bé đã có (Đ239d2). Mật khẩu tạm, buộc đổi ở lần đăng nhập đầu.
  function taoTaiKhoanPhuHuynh({ username, name, phone, email }) {
    const matKhau = sinhMatKhau();
    const parent = {
      id: db.nextId('p'),
      username,
      passwordHash: password.hash(matKhau),
      role: 'parent',
      name,
      title: '',
      phone,
      email,
      classId: null,
      avatar: { emoji: '👤', bg: '#5b6ceb' },
      mustChangePassword: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.insert('users', parent);
    return { parent, matKhau };
  }

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

      for (const r of hopLe) nhanMotBe(r, lopTheoTen, taiKhoan);
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
    //
    // 'Dân tộc' đứng CUỐI, sau các cột bắt buộc: người điền đọc từ trái sang,
    // và cột này để trống được nên không nên chen vào giữa những cột không được
    // để trống. Cột 'Nhóm máu' đã bỏ khỏi mẫu (góp ý 20/10, C1); tệp cũ còn cột
    // ấy vẫn nhập được và giá trị vẫn lưu — xem `lay(row, 'Nhóm máu', ...)`.
    const headers = ['Mã của bé', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Nhóm', 'Cơ sở', 'Địa chỉ',
      'Họ tên phụ huynh', 'Điện thoại', 'Email', 'Dân tộc'];
    const namSinhMau = Number(ngayVN.homNay().slice(0, 4)) - 4;   // bé nhóm Chồi, 4 tuổi
    const mau = [{
      'Mã của bé': 'MN2026001', 'Họ tên': 'Nguyễn Bảo An', 'Ngày sinh': `${namSinhMau}-04-12`,
      'Giới tính': 'Nữ', 'Nhóm': 'Chồi 2',
      'Cơ sở': (db.campuses()[0] || {}).name || '',
      'Địa chỉ': '12 Hoa Phượng, Q. Phú Nhuận',
      'Họ tên phụ huynh': 'Lê Thị Thu Hà', 'Điện thoại': '0912345678', 'Email': 'thuha@gmail.com',
      'Dân tộc': 'Kinh',
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

// Một cô có nằm trong tầm của người này không — luật của danh sách cô.
//
// Cô đã phụ trách nhóm đang mở: thuộc cơ sở của nhóm, như từ trước tới nay.
// Cô CHƯA TỪNG được phân vào nhóm nào: thuộc cơ sở của quản lý đã tạo ra cô,
// nếu có (bảng `giao_vien_co_so`, Đ239d1). Dòng ghi nhận ấy KHÔNG được hỏi khi
// cô đã từng có nhóm, kể cả nhóm đã đóng — phân công sau này mới là sự thật.
// Hỏi theo nhóm ĐANG MỞ là sai: ban giám hiệu chuyển cô sang cơ sở 2, chuyển
// năm học đóng nhóm ấy, thế là quản lý cơ sở 1 lại thấy cô, cấp lại mật khẩu
// và kéo cô về nhóm mình. Cô chỉ có nhóm đã đóng thì chỉ Cấp 1 thấy.
//
// `pham` truyền vào được để đường liệt kê không tính lại cho từng cô.
function coTrongTamNhin(user, teacherId, pham = phamViNhom(user)) {
  if (pham === null) return true;
  const nhom = db.classIdsOfTeacher(teacherId);
  if (nhom.length) return nhom.some(id => pham.includes(id));
  if (db.classIdsEverOfTeacher(teacherId).length) return false;
  const coSo = db.phamViCoSo(user);
  const r = db.first('giao_vien_co_so', 'SELECT campusId FROM giao_vien_co_so WHERE userId = ?', [teacherId]);
  return !!coSo && !!r && r.campusId === coSo;
}

// Cô đang dạy nhóm ở cơ sở NGOÀI tầm của người bấm thì người bấm không đổi
// phân công của cô: đổi là cô mất quyền (hoặc mất vai chính) ở cơ sở kia mà
// bên đó không hay biết. Trả về true nghĩa là ĐÃ gửi lỗi.
function chanCoDayCoSoKhac(req, res, t) {
  const ngoai = db.classIdsOfTeacher(t.id).filter(cid => !duocChamNhom(req.user, cid));
  if (!ngoai.length) return false;
  res.status(403).json({
    error: `Cô ${t.name} đang phụ trách nhóm ở cơ sở khác. `
      + 'Phân công lại cô này cần tài khoản quản trị toàn hệ thống, '
      + 'nếu không cô sẽ mất quyền ở cơ sở kia mà bên đó không hay biết.',
  });
  return true;
}

// Danh sách đường cho phép của chức vụ có gồm `duong` không — khớp tiền tố
// đúng như `chanApiNgoaiChucVu` ở lib/modules.js. Chưa khai chức vụ, hoặc
// chức vụ không có danh sách riêng, là không hạn chế gì thêm.
function duocGoiDuong(user, duong) {
  const cho = db.apiChoPhep(user);
  const p = duong.toLowerCase();
  return !cho || cho.some(x => p === x || p.startsWith(`${x}/`));
}

// Chặn khi chức vụ không được gọi `duong`. Dùng cho đường nằm dưới một tiền tố
// chức vụ ấy được mở, nhưng làm việc của một đường khác mà chức vụ ấy KHÔNG
// được gọi. Trả về true nghĩa là ĐÃ gửi lỗi.
function chanNeuKhongGoiDuoc(req, res, duong, viec) {
  if (duocGoiDuong(req.user, duong)) return false;
  const mo = db.moTaChucVu(db.chucVu(req.user)) || {};
  res.status(403).json({
    error: `${viec} không thuộc phần việc của tài khoản "${mo.ten || 'chức vụ này'}". `
      + 'Xin nhờ quản lý cơ sở hoặc ban giám hiệu làm giúp.',
  });
  return true;
}

// Việc về tài khoản mà người này làm được — để tab "Tài khoản" chỉ vẽ nút
// máy chủ sẽ nhận (Đ239d1). Mỗi ô hỏi đúng chốt của đường tương ứng, để màn
// hình không phải tự kể mã chức vụ ra rồi trôi khỏi máy chủ ở lần sửa sau.
// Đây chỉ là chỉ đường; chốt thật vẫn là từng đường.
function quyenTaiKhoan(user) {
  const vanPhong = db.chucVu(user) === 'vanphong-coso';
  const cap = db.capChucVu(user);
  return {
    // Đúng hai chốt của `POST /api/admin/managers`.
    taoQuanTri: db.phamViCoSo(user) === null && (cap === null || cap === 1),
    // `POST /api/admin/teachers` — văn phòng bị `chanNeuVanPhong`.
    taoCo: !vanPhong && duocGoiDuong(user, '/api/admin/teachers'),
    // `PUT /api/admin/classes/:id/teachers` và đường chuyển cô.
    phanCongCo: !vanPhong && duocGoiDuong(user, '/api/admin/classes/:id/teachers'),
    // `POST /api/accounts/:id/reset-password`. Quản lý một cơ sở thì máy chủ
    // chỉ nhận cho cô trong tầm cơ sở mình — đúng những cô danh sách cô của
    // họ liệt kê (`coTrongTamNhin`), kể cả cô chưa nhóm do cơ sở mình tạo.
    capLaiMatKhau: duocGoiDuong(user, '/api/accounts/:id/reset-password'),
    motCoSo: db.phamViCoSo(user) !== null,
    // Nhận một bé vào nhóm (= tạo tài khoản gia đình) — `POST /api/admin/students`;
    // cùng tiền tố với thêm phụ huynh, bảo lưu, chuyển nhóm cho bé (Đ239d2).
    nhanBe: duocGoiDuong(user, '/api/admin/students'),
  };
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
