// Phân hệ Học sinh: hồ sơ học sinh, danh sách lớp (giáo viên).
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { publicUser } = require('./auth');
const dongYMacDinh = require('../lib/dong-y-mac-dinh');
const tbnv = require('../lib/thong-bao-nv');
const tbb = require('../lib/thong-bao-be');

// ĐỀ XUẤT LIÊN HỆ KHẨN CẤP CỦA GIA ĐÌNH (Đ260j).
//
// Nhà trường 18/11: *"Cho phụ huynh quyền bổ sung liên hệ khẩn cấp, nhưng khi
// phụ huynh thêm vào thì cần nhà trường xác nhận để add thêm vào."*
//
// Người XÁC NHẬN là người sửa được phần nhân thân của bé (`db.suaHoSoBeDuoc`,
// Đ168: quản lý cơ sở, ban giám hiệu, quản trị chưa khai chức vụ). Văn phòng
// cơ sở và cô của nhóm XEM được đề xuất nhưng không thêm được: thêm ở đây là
// ghi vào đúng danh sách mà màn Sửa hồ sơ đã chặn họ sửa — mở một cửa thứ hai
// là bỏ luật Đ168 bằng đường vòng.
const TOI_DA_CHO = 5;
const DX_TEN = 80;
const DX_QUAN_HE = 40;
const DX_GHI_CHU = 200;
const DX_LY_DO = 300;
// Bị từ chối thì gia đình còn thấy lý do trong 30 ngày, rồi thôi hiện.
const DX_HIEN_TU_CHOI_MS = 30 * 24 * 3600 * 1000;

// Số Việt Nam: bỏ cách, chấm, gạch; "+84"/"84" đầu thành "0"; còn 9–11 chữ số
// bắt đầu bằng 0. Không khớp thì trả rỗng.
function chuanSdt(x) {
  let s = String(x || '').replace(/[\s.\-()]/g, '');
  if (/^\+84/.test(s)) s = `0${s.slice(3)}`;
  else if (/^84\d{8,10}$/.test(s)) s = `0${s.slice(2)}`;
  return /^0\d{8,10}$/.test(s) ? s : '';
}
const chiSo = (x) => String(x || '').replace(/\D/g, '').replace(/^84/, '0');

const deXuatCua = (id) => db.first('lien_he_khan_de_xuat', 'SELECT * FROM lien_he_khan_de_xuat WHERE id = ?', [String(id || '')]);

function boDeXuat(r) {
  const ph = r.parentId ? db.findUser(r.parentId) : null;
  return {
    id: r.id, studentId: r.studentId, ten: r.ten, quanHe: r.quanHe, sdt: r.sdt, ghiChu: r.ghiChu,
    trangThai: r.trangThai, lyDo: r.lyDo, taoLuc: r.taoLuc, xetLuc: r.xetLuc,
    nguoiDeXuat: ph ? `${ph.title ? `${ph.title} ` : ''}${ph.name}` : '',
  };
}

// Chốt chung của hai nút "Thêm vào hồ sơ" / "Không thêm". Trả về dòng đề xuất,
// hoặc đã trả lời lỗi rồi (null).
function deXuatDeXet(req, res) {
  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Liên hệ khẩn cấp do nhà trường xác nhận. Cô vẫn xem được đề xuất của gia đình trong hồ sơ của bé.',
    });
    return null;
  }
  const r = deXuatCua(req.params.id);
  if (!r) { res.status(404).json({ error: 'Không tìm thấy đề xuất này' }); return null; }
  if (!db.canAccessStudent(req.user, r.studentId)) {
    res.status(403).json({ error: 'Đề xuất này không phải của bé nào thuộc cơ sở mình' });
    return null;
  }
  if (!db.suaHoSoBeDuoc(req.user)) {
    res.status(403).json({
      error: 'Thêm người liên hệ khẩn cấp vào hồ sơ là việc của quản lý cơ sở hoặc ban giám hiệu. '
        + 'Tài khoản này vẫn xem được đề xuất để nhắc người phụ trách.',
    });
    return null;
  }
  if (r.trangThai !== 'cho') {
    res.status(400).json({ error: 'Đề xuất này đã được xử lý trước đó' });
    return null;
  }
  return r;
}

// `choGiaDinh` = gói này đang đi tới một tài khoản phụ huynh, nên KHÔNG kèm số
// điện thoại riêng của cô (Đ161) — xem chú thích dài ở `lib/nhom-lop.js`.
function decorate(s, nhomCua, choGiaDinh = false) {
  const cls = nhomCua ? nhomCua(s.classId).cls : (s.classId ? db.findClass(s.classId) : null);
  return {
    ...s,
    className: cls ? cls.name : '',
    room: cls ? cls.room : '',
    // Nhóm mầm non có 2–3 cô cùng phụ trách. `teacherName` giữ nguyên hình dạng
    // cũ (một cô — cô phụ trách chính) cho màn hình chưa đổi; `teachers` và
    // `teacherNames` là chỗ các cô còn lại hiện ra.
    ...(nhomCua
      ? nhomCua(s.classId).co
      : nl.tomTat(s.classId, { soDienThoai: !choGiaDinh })),
  };
}

// MỘT NHÓM HỎI MỘT LẦN CHO CẢ DANH SÁCH.
//
// `decorate` hỏi hai câu cho MỖI bé, mà `/api/students` của hiệu trưởng trả về
// toàn bộ bé đang học của trường — cùng hình dạng, cùng lý do và cùng cách vá
// với `mePayload` ở routes/auth.js. Xem khối chú thích ở đó, gồm cả lý do bảng
// nhớ này PHẢI sống đúng một lượt gọi chứ không được nâng ra ngoài.
function taoNhoNhom(choGiaDinh = false) {
  const nho = new Map();
  return (classId) => {
    const khoa = classId || '';
    if (!nho.has(khoa)) {
      nho.set(khoa, {
        cls: classId ? db.findClass(classId) : null,
        // Bảng nhớ sống đúng MỘT lượt gọi, nên vai của người hỏi cố định trong
        // suốt đời nó — không có chuyện một dòng nhớ của cô bị dùng lại cho
        // một lượt hỏi của gia đình.
        co: nl.tomTat(classId, { soDienThoai: !choGiaDinh }),
      });
    }
    return nho.get(khoa);
  };
}

module.exports = (app) => {
  // Bé đã có từ trước quyết định 25/11: điền "đồng ý theo giấy nhập học" cho
  // mục chưa trả lời, một lần duy nhất (Đ260i). Tự bắt lỗi — xem tệp lib.
  dongYMacDinh.dienMacDinhMotLan();

  // Danh sách học sinh mà người dùng được xem, kèm thông tin lớp + GVCN.
  app.get('/api/students', (req, res) => {
    // Một bảng nhớ cho ĐÚNG lượt gọi này — xem `taoNhoNhom` ở trên.
    const nhomCua = taoNhoNhom(req.user.role === 'parent');
    res.json(db.studentsOf(req.user).map(s => decorate(s, nhomCua)));
  });

  // Hồ sơ chi tiết một học sinh.
  app.get('/api/students/:id', (req, res) => {
    if (!db.canAccessStudent(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const hoSo = db.hoSoBe(s.id);

    // SỐ CCCD CỦA PHỤ HUYNH có ranh giới KHÁC số định danh của bé.
    //
    // Nhà trường cần nó để đối chiếu khi ký hợp đồng và khi giao bé cho người
    // tới đón. Nhưng nó là giấy tờ của NGƯỜI LỚN, nên:
    //
    //   • quản trị đọc được — đó là việc của văn phòng;
    //   • CHÍNH NGƯỜI ĐÓ đọc được số của mình, để biết trường đang giữ gì;
    //   • cô KHÔNG đọc được — cô không cần số giấy tờ của bố mẹ để dạy bé;
    //   • PHỤ HUYNH CÒN LẠI của cùng một bé cũng KHÔNG đọc được. Bố mẹ ly hôn
    //     là chuyện có thật ở trường mầm non, và app không được là nơi một bên
    //     lấy được số giấy tờ của bên kia.
    //
    // Vì `publicUser` chỉ gạt `passwordHash`, mọi thứ khác trong hàng `users`
    // đi thẳng ra ngoài. Nên soCccd phải được GHÉP TAY vào đúng người, chứ
    // không phải lọc bớt sau khi đã lấy cả hàng ra.
    const chiQuanTri = req.user.role === 'admin';
    const parents = s.parentIds.map(pid => {
      const p = publicUser(db.findUser(pid));
      if (!p) return null;
      const duocXem = chiQuanTri || req.user.id === pid;
      return duocXem ? { ...p, soCccd: db.hoSoNguoiDung(pid).soCccd } : p;
    }).filter(Boolean);

    // SỐ ĐỊNH DANH CÁ NHÂN chỉ về tay quản trị và văn phòng.
    //
    // Đây là dữ liệu cá nhân theo Nghị định 13/2023. Cô cần biết tiền sử bệnh
    // và số gọi khẩn cấp của bé — cô KHÔNG cần số định danh để làm việc, nên
    // không gửi. Cắt ở máy chủ chứ không giấu ở giao diện: giấu ở giao diện thì
    // người biết đường dẫn vẫn lấy được. `chiQuanTri` đã tính ở trên.

    // Thông tin liên hệ của trường: cơ sở của nhóm bé trước, không có thì lùi
    // về thông tin chung của trường. Nhà trường yêu cầu phụ huynh gọi HOTLINE
    // VĂN PHÒNG chứ không gọi số riêng của cô.
    const truong = db.school() || {};
    const cs = db.findCampus(db.campusOfClass(s.classId)) || {};
    const lienHeTruong = {
      tenCoSo: cs.name || '',
      diaChi: cs.address || truong.address || '',
      hotline: cs.phone || truong.phone || '',
      email: cs.email || truong.email || '',
      // Email kế toán là MỘT địa chỉ cho cả trường (Đ161) — không lùi về email
      // của cơ sở, vì hai thứ đó gửi tới hai người khác nhau. Chưa nhập thì để
      // trống và màn hình bỏ hẳn dòng, chứ không hiện một dòng rỗng.
      emailKeToan: truong.emailKeToan || '',
    };

    res.json({
      ...decorate(s, null, req.user.role === 'parent'),
      parents,
      lienHeTruong,
      tienSuBenh: hoSo.tienSuBenh,
      lienHeKhanCap: hoSo.lienHeKhanCap,
      ...(chiQuanTri ? { soDinhDanh: hoSo.soDinhDanh } : {}),
    });
  });

  // =========================================================================
  // GIA ĐÌNH ĐỀ XUẤT LIÊN HỆ KHẨN CẤP — NHÀ TRƯỜNG XÁC NHẬN (Đ260j)
  // =========================================================================

  // Gom mọi đề xuất đang chờ trong phạm vi của quản trị (thẻ ở Quản trị →
  // Nhóm lớp & bé). Khai TRƯỚC các đường `:id` cho dễ đọc.
  app.get('/api/students/lien-he-de-xuat/cho', (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ nhà trường xem được danh sách này' });
    const ds = db.all('lien_he_khan_de_xuat',
      "SELECT * FROM lien_he_khan_de_xuat WHERE trangThai = 'cho' ORDER BY taoLuc")
      .filter(r => db.canAccessStudent(req.user, r.studentId))
      .map((r) => {
        const be = db.findStudent(r.studentId) || {};
        const nhom = be.classId ? db.findClass(be.classId) : null;
        return { ...boDeXuat(r), tenBe: be.name || '', tenNhom: nhom ? nhom.name : '' };
      });
    res.json({ danhSach: ds, duocXet: db.suaHoSoBeDuoc(req.user) });
  });

  // Đề xuất của MỘT bé. Gia đình chỉ thấy đề xuất CHÍNH MÌNH gửi (đang chờ, và
  // bị từ chối gần đây kèm lý do): bé có hai phụ huynh thì mỗi người một ghi
  // chú riêng chưa ai xác nhận, không đi sang người kia. Nhà trường và cô
  // thấy mọi đề xuất đang chờ của bé.
  app.get('/api/students/:id/lien-he-de-xuat', (req, res) => {
    const sid = req.params.id;
    if (!db.canAccessStudent(req.user, sid)) return res.status(403).json({ error: 'Không có quyền xem bé này' });
    let ds;
    if (req.user.role === 'parent') {
      const moc = new Date(Date.now() - DX_HIEN_TU_CHOI_MS).toISOString();
      ds = db.all('lien_he_khan_de_xuat',
        `SELECT * FROM lien_he_khan_de_xuat WHERE studentId = ? AND parentId = ?
           AND (trangThai = 'cho' OR (trangThai = 'tu-choi' AND xetLuc >= ?)) ORDER BY taoLuc`,
        [sid, req.user.id, moc]);
    } else {
      ds = db.all('lien_he_khan_de_xuat',
        "SELECT * FROM lien_he_khan_de_xuat WHERE studentId = ? AND trangThai = 'cho' ORDER BY taoLuc", [sid]);
    }
    res.json({
      danhSach: ds.map(boDeXuat),
      duocXet: req.user.role === 'admin' && db.suaHoSoBeDuoc(req.user),
      toiDa: TOI_DA_CHO,
    });
  });

  app.post('/api/students/:id/lien-he-de-xuat', (req, res) => {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        error: 'Đường này để gia đình đề xuất. Nhà trường thêm người liên hệ ở Quản trị → Sửa hồ sơ bé.',
      });
    }
    const sid = req.params.id;
    if (!db.canAccessStudent(req.user, sid)) return res.status(403).json({ error: 'Không có quyền với hồ sơ của bé này' });
    const be = db.findStudent(sid);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const b = req.body || {};
    const ten = String(b.ten || '').trim();
    const quanHe = String(b.quanHe || '').trim();
    const ghiChu = String(b.ghiChu || '').trim();
    if (!ten) return res.status(400).json({ error: 'Vui lòng nhập họ tên người liên hệ' });
    if (ten.length > DX_TEN) return res.status(400).json({ error: `Họ tên dài quá — tối đa ${DX_TEN} chữ` });
    if (quanHe.length > DX_QUAN_HE) return res.status(400).json({ error: `Quan hệ với bé ghi ngắn thôi — tối đa ${DX_QUAN_HE} chữ` });
    if (ghiChu.length > DX_GHI_CHU) return res.status(400).json({ error: `Ghi chú dài quá — tối đa ${DX_GHI_CHU} chữ` });
    const sdt = chuanSdt(b.sdt);
    if (!sdt) {
      return res.status(400).json({ error: 'Số điện thoại chưa đúng — số Việt Nam bắt đầu bằng 0, gồm 9 đến 11 chữ số' });
    }
    const dangCho = db.all('lien_he_khan_de_xuat',
      "SELECT sdt FROM lien_he_khan_de_xuat WHERE studentId = ? AND trangThai = 'cho'", [sid]);
    if (dangCho.length >= TOI_DA_CHO) {
      return res.status(400).json({
        error: `Bé đang có ${TOI_DA_CHO} người liên hệ chờ nhà trường xác nhận. Xin chờ nhà trường xác nhận bớt rồi thêm tiếp.`,
      });
    }
    if (db.lienHeKhanCap(sid).some(x => chiSo(x.dienThoai) === sdt)) {
      return res.status(400).json({ error: 'Số này đã có trong danh sách liên hệ khẩn cấp của bé' });
    }
    if (dangCho.some(x => x.sdt === sdt)) {
      return res.status(400).json({ error: 'Số này đã được đề xuất và đang chờ nhà trường xác nhận' });
    }
    const rec = {
      id: db.nextId('lhkdx'), studentId: sid, parentId: req.user.id, ten, quanHe, sdt, ghiChu,
      trangThai: 'cho', nguoiXet: null, xetLuc: null, lyDo: '', taoLuc: new Date().toISOString(),
    };
    db.insert('lien_he_khan_de_xuat', rec);
    db.audit(req.user.id, 'lien-he-khan-de-xuat', sid, { deXuatId: rec.id, ten });

    // Chuông chỉ mang TÊN bé — không tên người được đề xuất, không số điện
    // thoại: dòng này hiện cả trên màn khoá điện thoại.
    const gop = `lhk:${sid}`;
    const tieuDe = `Gia đình đề xuất thêm người liên hệ khẩn cấp cho bé ${be.name}`;
    const tieuDeGop = (n) => `Gia đình đề xuất ${n} người liên hệ khẩn cấp cho bé ${be.name}`;
    tbnv.gui({
      toi: { vanPhongCuaBe: sid, quanLyCuaBe: sid }, studentId: sid, loai: 'lien-he-khan',
      tieuDe, tieuDeGop, noiDung: 'Chờ nhà trường xác nhận trước khi thêm vào hồ sơ.',
      hash: '#/admin/thongtin/nhom', gop, nguoiTao: req.user.id,
    });
    tbnv.gui({
      toi: { coCuaBe: sid }, studentId: sid, loai: 'lien-he-khan',
      tieuDe, tieuDeGop, noiDung: 'Nhà trường sẽ xác nhận trước khi thêm vào hồ sơ.',
      hash: '#/student', gop, nguoiTao: req.user.id,
    });
    res.json(boDeXuat(rec));
  });

  // Gia đình rút lại đề xuất của chính mình khi nhà trường chưa xét.
  app.post('/api/students/lien-he-de-xuat/:id/huy', (req, res) => {
    const r = deXuatCua(req.params.id);
    // Không phải của mình thì như không có — không để lộ là có đề xuất ấy.
    if (!r || req.user.role !== 'parent' || r.parentId !== req.user.id || !db.canAccessStudent(req.user, r.studentId)) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất này' });
    }
    if (r.trangThai !== 'cho') return res.status(400).json({ error: 'Đề xuất này nhà trường đã xử lý, không huỷ được nữa' });
    db.update('lien_he_khan_de_xuat', r.id, { trangThai: 'huy', xetLuc: new Date().toISOString() });
    db.audit(req.user.id, 'lien-he-khan-huy', r.studentId, { deXuatId: r.id, ten: r.ten });
    res.json({ ok: true });
  });

  // THÊM VÀO HỒ SƠ — NỐI, KHÔNG THAY.
  //
  // `datLienHeKhanCap` ghi đè cả danh sách, nên đọc danh sách hiện có rồi ghi
  // lại (cũ + mới) trong CÙNG một giao dịch với việc đánh dấu đề xuất: hai
  // người bấm cùng lúc không làm mất người liên hệ của nhau, và không có
  // chuyện đã thêm vào hồ sơ mà đề xuất vẫn "chờ".
  app.post('/api/students/lien-he-de-xuat/:id/them', (req, res) => {
    const r = deXuatDeXet(req, res);
    if (!r) return;
    const luc = new Date().toISOString();
    let daXet = false;
    let lienHe = [];
    db.tx(() => {
      const moi = deXuatCua(r.id);
      if (!moi || moi.trangThai !== 'cho') return;
      lienHe = db.datLienHeKhanCap(r.studentId, [
        ...db.lienHeKhanCap(r.studentId),
        { hoTen: r.ten, quanHe: r.quanHe, dienThoai: r.sdt, ghiChu: r.ghiChu },
      ]);
      db.update('lien_he_khan_de_xuat', r.id, { trangThai: 'da-them', nguoiXet: req.user.id, xetLuc: luc });
      daXet = true;
    });
    if (!daXet) return res.status(400).json({ error: 'Đề xuất này đã được xử lý trước đó' });
    db.audit(req.user.id, 'lien-he-khan-them', r.studentId, { deXuatId: r.id, ten: r.ten });
    const be = db.findStudent(r.studentId) || {};
    tbb.gui({
      studentId: r.studentId, loai: 'lien-he-khan', nguoiTao: req.user.id, hash: '#/student',
      tieuDe: `Nhà trường đã thêm ${r.ten} vào liên hệ khẩn cấp của bé ${be.name || ''}`.trim(),
    });
    res.json({ ok: true, deXuat: boDeXuat(deXuatCua(r.id)), lienHeKhanCap: lienHe });
  });

  app.post('/api/students/lien-he-de-xuat/:id/khong-them', (req, res) => {
    const r = deXuatDeXet(req, res);
    if (!r) return;
    const lyDo = String((req.body || {}).lyDo || '').trim();
    if (lyDo.length > DX_LY_DO) return res.status(400).json({ error: `Lý do dài quá — tối đa ${DX_LY_DO} chữ` });
    const doi = db.run(
      "UPDATE lien_he_khan_de_xuat SET trangThai = 'tu-choi', nguoiXet = ?, xetLuc = ?, lyDo = ? WHERE id = ? AND trangThai = 'cho'",
      [req.user.id, new Date().toISOString(), lyDo, r.id]).changes;
    if (!doi) return res.status(400).json({ error: 'Đề xuất này đã được xử lý trước đó' });
    db.audit(req.user.id, 'lien-he-khan-khong-them', r.studentId, { deXuatId: r.id, ten: r.ten, lyDo });
    const be = db.findStudent(r.studentId) || {};
    tbb.gui({
      studentId: r.studentId, loai: 'lien-he-khan', nguoiTao: req.user.id, hash: '#/student',
      tieuDe: `Nhà trường chưa thêm ${r.ten} vào liên hệ khẩn cấp của bé ${be.name || ''}`.trim(),
      noiDung: lyDo || 'Gia đình có thể liên hệ văn phòng để biết thêm.',
    });
    res.json({ ok: true });
  });

  // =========================================================================
  // GIẤY ĐỒNG Ý — GIA ĐÌNH XEM MÌNH ĐÃ KÝ GÌ, VÀ RÚT LẠI ĐƯỢC
  // =========================================================================
  //
  // VÌ SAO CẦN
  //
  // Ba ô đồng ý (① hồ sơ học tập ② chia sẻ ảnh cho gia đình khác ③ dùng ảnh
  // truyền thông) trước đây chỉ ghi được qua đường quản trị, và KHÔNG một màn
  // hình nào của phụ huynh chạm tới dữ liệu đó. Gia đình muốn rút phải gọi
  // điện cho văn phòng, và cũng không có chỗ nào để tự kiểm mình đã ký gì.
  //
  // `docs/KE-HOACH.md` ghi "rút lại được bất cứ lúc nào", và Nghị định
  // 13/2023 cho chủ thể dữ liệu quyền đó. Một quyền mà chỉ thực hiện được qua
  // điện thoại bàn thì trên thực tế là một quyền khó dùng.
  //
  // TỪ Đ260i (chủ dự án quyết 25/11) màn phụ huynh KHÔNG còn khối này: ba mục
  // nằm trong giấy nhập học, gia đình muốn rút thì báo văn phòng, văn phòng ghi
  // ở Quản trị → Hồ sơ bé. Hai đường dưới GIỮ NGUYÊN cho bản app cũ còn trong
  // máy và cho ngày trường muốn mở lại nút rút trên màn gia đình.
  app.get('/api/dong-y', (req, res) => {
    const studentId = String((req.query || {}).studentId || '');
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem giấy đồng ý của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    res.json({
      be: { id: be.id, hoTen: be.name },
      dongY: db.dongYCuaBe(be.id),
      // Gia đình sửa được hay không — để màn hình khỏi phải đoán theo vai.
      tuRutDuoc: req.user.role === 'parent',
    });
  });

  // GIA ĐÌNH CHỈ RÚT ĐƯỢC, KHÔNG TỰ ĐỒNG Ý ĐƯỢC.
  //
  // Đây là chỗ dễ làm sai nhất của cả tính năng, nên nói rõ:
  //
  // Đồng ý là một tờ giấy CÓ CHỮ KÝ, do văn phòng thu và ghi lại. Nếu bấm một
  // nút trong app cũng ghi được "đã đồng ý" thì nhà trường sẽ có một bản ghi
  // đồng ý mà không có chữ ký nào đứng sau — và lúc có chuyện thì không ai
  // chứng minh được gia đình đã đồng ý thật.
  //
  // Rút lại thì ngược hẳn: nó KHÔNG cần chữ ký. Nghị định 13/2023 nói rút lại
  // là quyền, và một quyền thì không được đặt điều kiện thủ tục lên nó. Nên
  // đường này nhận đúng MỘT chiều: đưa một mục về "không đồng ý".
  app.put('/api/dong-y', (req, res) => {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        error: 'Đường này dành cho gia đình tự rút lại đồng ý. '
          + 'Văn phòng ghi giấy đồng ý ở màn Quản trị → Hồ sơ bé.',
      });
    }
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa giấy đồng ý của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });

    const MUC = ['hoSoHocTap', 'chiaSeGiaDinh', 'truyenThong'];
    const nhan = {};
    for (const k of MUC) {
      if (!(k in b)) continue;
      if (b[k] !== false) {
        return res.status(400).json({
          error: 'Gia đình rút lại được bất cứ lúc nào, nhưng phần ĐỒNG Ý thì phải '
            + 'ký giấy ở văn phòng — app không thay được chữ ký.',
        });
      }
      nhan[k] = false;
    }
    if (!Object.keys(nhan).length) {
      return res.status(400).json({ error: 'Không có mục nào để rút lại' });
    }

    const ket = db.datDongY(be.id, nhan);
    // Ghi rõ CHÍNH GIA ĐÌNH tự rút, không phải văn phòng sửa hộ — khi có khiếu
    // nại thì hai chuyện đó khác hẳn nhau.
    db.audit(req.user.id, 'consent-rut-lai', be.id, { name: be.name, ...nhan });
    res.json({ id: be.id, dongY: ket });
  });
};
