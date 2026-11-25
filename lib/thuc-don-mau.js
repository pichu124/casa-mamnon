// KHO THỰC ĐƠN MẪU VÀ LỊCH XOAY VÒNG (Đ260d).
//
// Góp ý 18/11: *"Thực đơn sẽ có 4 thực đơn mẫu lặp đi lặp lại, đôi khi điều
// chỉnh chút theo nhà cung cấp… văn phòng setup từ thời gian này tới thời gian
// này dùng thực đơn 1, sau đó tự động tới 2, 3, 4 rồi quay vòng về 1. Cho quyền
// sửa lại thực đơn cụ thể theo từng tuần sau khi chọn từ thực đơn mẫu."*
//
// MỘT MẪU = MỘT TUẦN T2–T6. Một đoạn lịch là "từ Thứ Hai A tới ngày B, xoay
// vòng [M1, M2, M3, M4]": tuần thứ k của đoạn dùng thuTu[k % n]. Mẫu dài hai
// tuần thì ghi lặp ([M1, M1, M2…]).
//
// THỨ TỰ ƯU TIÊN KHI GIẢI THỰC ĐƠN MỘT NGÀY CỦA CƠ SỞ X — chỉ ở đúng tệp này:
//
//   1. dòng riêng của X trong `menu_campus`
//   2. mẫu theo lịch của X
//   3. dòng dùng chung trong `menus`
//   4. mẫu theo lịch dùng chung
//
// Đây là luật "riêng cơ sở thắng chung" có sẵn từ Đ91, nối dài thêm một lớp mẫu
// ở mỗi phạm vi. Dòng thật luôn thắng mẫu của cùng phạm vi, nên "sửa riêng một
// tuần" chỉ là ghi dòng thật như văn phòng vẫn làm.
//
// AI SỬA LUẬT ƯU TIÊN CHỈ SỬA Ở `giai` DƯỚI ĐÂY. Màn thực đơn, thẻ "Hôm nay",
// tệp Excel và Nhật ký đều hỏi về đây; chép thêm một bản luật ở chỗ khác là
// đúng lỗi Nhật ký từng mắc (đọc `menus` mà quên `menu_campus`).
//
// QUÁ KHỨ KHÔNG BỊ VIẾT LẠI (Nguyên tắc số 1, điều 3). Mẫu giải lúc đọc, nên
// sửa mẫu là mọi tuần dùng nó đổi theo — kể cả tuần đã ăn xong. Vì vậy trước
// mỗi lần sửa mẫu hay sửa/huỷ lịch, `chotQuaKhu` chép thực đơn đang giải của
// các ngày tới hôm nay thành dòng thật. Nhật ký tháng trước giữ đúng món đã ăn.
//
// Chiều ngược lại cũng vậy: đặt hay sửa một đoạn lịch phủ lên ngày đã qua thì
// mẫu KHÔNG áp cho ngày đó. Mốc là `capNhatLuc` của đoạn lịch (theo giờ Việt
// Nam): mẫu chỉ áp cho ngày SAU mốc. Mọi đường đổi `capNhatLuc` (sửa, huỷ)
// đều `chotQuaKhu` trước, nên ngày đã ăn theo mẫu trước lần sửa đã thành dòng
// thật; ngày chưa từng có món thì vẫn trống — bếp không đăng gì hôm đó.
const db = require('./db');
const ngay = require('./ngay');

const TOI_DA_MAU = 12;          // số mẫu mỗi phạm vi
const TOI_DA_THU_TU = 12;       // số tuần một vòng xoay
const TOI_DA_NGAY_LICH = 731;   // một đoạn lịch dài tối đa hai năm
const TOI_DA_NGAY_GIAI = 800;   // khoảng ngày một lần giải

function congNgay(ngayStr, n) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

// Thứ Hai = 0 … Chủ nhật = 6.
function lechThuHai(ngayStr) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  return (new Date(t).getUTCDay() + 6) % 7;
}

const thuHaiCua = (d) => congNgay(d, -lechThuHai(d));
const soNgayGiua = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const phamVi = (campusId) => (campusId ? String(campusId) : '');

function docJson(s, macDinh) {
  if (s && typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (_) { return macDinh; }
}

// Một ngày của mẫu có món không. Bữa có tên mà chưa có món là "chưa soạn".
function coMon(meals) {
  return Array.isArray(meals) && meals.some(m => m && Array.isArray(m.items) && m.items.length);
}

// ---------------------------------------------------------------------------
// MẪU
// ---------------------------------------------------------------------------

function docMau(r) {
  if (!r) return null;
  const ngayMau = docJson(r.ngay, {});
  return {
    id: r.id, campusId: r.campusId || '', so: Number(r.so) || 0, ten: r.ten || '',
    ngay: ngayMau && typeof ngayMau === 'object' ? ngayMau : {},
    nguoiSua: r.nguoiSua || null, capNhatLuc: r.capNhatLuc || null,
  };
}

const tenMau = (m) => m.ten || `Thực đơn ${m.so}`;
const tomTatMau = (m) => ({ id: m.id, so: m.so, ten: tenMau(m) });

function dsMau(campusId) {
  return db.all('menu_mau', 'SELECT * FROM menu_mau WHERE campusId = ? ORDER BY so', [phamVi(campusId)]).map(docMau);
}

function layMau(id) {
  return docMau(db.first('menu_mau', 'SELECT * FROM menu_mau WHERE id = ?', [String(id || '')]));
}

// `ngayMau` đã được bên gọi làm sạch: {"0": [bữa], …, "4": [bữa]}.
function themMau(campusId, { ten = '', ngay: ngayMau = {} } = {}, nguoiSua = null) {
  const pv = phamVi(campusId);
  const dangCo = db.count('SELECT COUNT(*) FROM menu_mau WHERE campusId = ?', [pv]);
  if (dangCo >= TOI_DA_MAU) return { loi: `Mỗi bếp giữ tối đa ${TOI_DA_MAU} thực đơn mẫu. Sửa một mẫu đang có thay vì thêm mới nhé.` };
  const so = db.count('SELECT COALESCE(MAX(so), 0) FROM menu_mau WHERE campusId = ?', [pv]) + 1;
  const rec = {
    id: db.nextId('mmau'), campusId: pv, so, ten: String(ten || '').trim().slice(0, 60) || `Thực đơn ${so}`,
    ngay: JSON.stringify(ngayMau || {}), nguoiSua, capNhatLuc: new Date().toISOString(),
  };
  db.insert('menu_mau', rec);
  return { mau: docMau(rec) };
}

// Sửa mẫu. Chốt quá khứ TRƯỚC, trong cùng giao dịch: tuần đã ăn xong giữ món cũ.
function suaMau(id, { ten, ngay: ngayMau } = {}, nguoiSua = null) {
  const cu = layMau(id);
  if (!cu) return { loi: 'Không tìm thấy thực đơn mẫu này' };
  const patch = { nguoiSua, capNhatLuc: new Date().toISOString() };
  if (ten !== undefined) patch.ten = String(ten || '').trim().slice(0, 60) || `Thực đơn ${cu.so}`;
  if (ngayMau !== undefined) patch.ngay = JSON.stringify(ngayMau || {});
  db.tx(() => {
    if (ngayMau !== undefined) chotQuaKhu(cu.campusId);
    db.update('menu_mau', cu.id, patch);
  });
  return { mau: layMau(cu.id) };
}

// ---------------------------------------------------------------------------
// LỊCH XOAY VÒNG
// ---------------------------------------------------------------------------

function docLich(r) {
  if (!r) return null;
  const thuTu = docJson(r.thuTu, []);
  return {
    id: r.id, campusId: r.campusId || '', tuNgay: r.tuNgay, denNgay: r.denNgay,
    thuTu: Array.isArray(thuTu) ? thuTu.map(String) : [], huy: !!Number(r.huy),
    nguoiSua: r.nguoiSua || null, capNhatLuc: r.capNhatLuc || null,
  };
}

// Ngày (giờ Việt Nam) đoạn lịch được đặt / sửa lần cuối: mẫu chỉ áp cho ngày sau đó.
const mocCua = (l) => ngay.ngayCua(Date.parse(l.capNhatLuc || ''));

function dsLich(campusId, { caHuy = false } = {}) {
  return db.all('menu_lich_xoay',
    `SELECT * FROM menu_lich_xoay WHERE campusId = ? ${caHuy ? '' : 'AND huy = 0'} ORDER BY tuNgay`,
    [phamVi(campusId)]).map(docLich);
}

function layLich(id) {
  return docLich(db.first('menu_lich_xoay', 'SELECT * FROM menu_lich_xoay WHERE id = ?', [String(id || '')]));
}

function ngayHopLe(s) {
  const t = String(s || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const nam = Number(t.slice(0, 4));
  if (nam < 2020 || nam > 2100) return null;
  return congNgay(t, 0) === t ? t : null;
}

// Kiểm một đoạn lịch trước khi ghi. Trả { loi } hoặc { tuNgay, denNgay, thuTu }.
function kiemLich(campusId, { tuNgay, denNgay, thuTu } = {}, boQuaId = null) {
  const pv = phamVi(campusId);
  const tu0 = ngayHopLe(tuNgay);
  const den = ngayHopLe(denNgay);
  if (!tu0 || !den) return { loi: 'Ngày bắt đầu và ngày kết thúc cần đúng dạng, ví dụ 2026-12-07' };
  const tu = thuHaiCua(tu0);
  if (den < tu) return { loi: 'Ngày kết thúc phải sau ngày bắt đầu' };
  if (soNgayGiua(tu, den) > TOI_DA_NGAY_LICH) return { loi: 'Một đoạn lịch dài tối đa hai năm. Chia thành nhiều đoạn nhé.' };
  if (!Array.isArray(thuTu) || !thuTu.length || thuTu.length > TOI_DA_THU_TU) {
    return { loi: `Chọn từ 1 đến ${TOI_DA_THU_TU} thực đơn mẫu theo thứ tự dùng` };
  }
  const cuaPhamVi = new Set(dsMau(pv).map(m => m.id));
  const ds = thuTu.map(x => String(x || ''));
  if (ds.some(x => !cuaPhamVi.has(x))) return { loi: 'Có thực đơn mẫu không thuộc bếp này. Chọn lại trong kho của bếp đang soạn nhé.' };
  const chong = dsLich(pv).find(l => l.id !== boQuaId && !(den < l.tuNgay || tu > l.denNgay));
  if (chong) {
    return { loi: `Trùng thời gian với đoạn lịch ${ddmmyyyy(chong.tuNgay)} – ${ddmmyyyy(chong.denNgay)}. `
      + 'Rút ngắn hay huỷ đoạn đó trước nhé.' };
  }
  return { tuNgay: tu, denNgay: den, thuTu: ds };
}

const ddmmyyyy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

function themLich(campusId, duLieu, nguoiSua = null) {
  const pv = phamVi(campusId);
  const k = kiemLich(pv, duLieu);
  if (k.loi) return k;
  const rec = {
    id: db.nextId('mlich'), campusId: pv, tuNgay: k.tuNgay, denNgay: k.denNgay,
    thuTu: JSON.stringify(k.thuTu), huy: 0, nguoiSua, capNhatLuc: new Date().toISOString(),
  };
  db.tx(() => {
    chotQuaKhu(pv, [[k.tuNgay, k.denNgay]]);
    db.insert('menu_lich_xoay', rec);
  });
  return { lich: docLich(rec) };
}

function suaLich(id, duLieu, nguoiSua = null) {
  const cu = layLich(id);
  if (!cu || cu.huy) return { loi: 'Không tìm thấy đoạn lịch này' };
  const k = kiemLich(cu.campusId, {
    tuNgay: duLieu.tuNgay ?? cu.tuNgay, denNgay: duLieu.denNgay ?? cu.denNgay, thuTu: duLieu.thuTu ?? cu.thuTu,
  }, cu.id);
  if (k.loi) return k;
  db.tx(() => {
    chotQuaKhu(cu.campusId, [[cu.tuNgay, cu.denNgay], [k.tuNgay, k.denNgay]]);
    db.update('menu_lich_xoay', cu.id, {
      tuNgay: k.tuNgay, denNgay: k.denNgay, thuTu: JSON.stringify(k.thuTu), nguoiSua, capNhatLuc: new Date().toISOString(),
    });
  });
  return { lich: layLich(cu.id) };
}

// Huỷ = đặt cờ, không xoá dòng: còn tra lại được lịch cũ đã chạy thế nào.
function huyLich(id, nguoiSua = null) {
  const cu = layLich(id);
  if (!cu || cu.huy) return { loi: 'Không tìm thấy đoạn lịch này' };
  db.tx(() => {
    chotQuaKhu(cu.campusId, [[cu.tuNgay, cu.denNgay]]);
    db.update('menu_lich_xoay', cu.id, { huy: 1, nguoiSua, capNhatLuc: new Date().toISOString() });
  });
  return { lich: layLich(cu.id) };
}

// ---------------------------------------------------------------------------
// GIẢI THỰC ĐƠN
// ---------------------------------------------------------------------------

// Bộ tra mẫu của MỘT phạm vi: nạp lịch và mẫu một lần, hỏi nhiều ngày.
function boTraMau(campusId) {
  const pv = phamVi(campusId);
  const lich = dsLich(pv).map(l => ({ ...l, moc: mocCua(l) }));
  const mau = lich.length ? new Map(dsMau(pv).map(m => [m.id, m])) : new Map();
  return (date) => {
    const lech = lechThuHai(date);
    if (lech > 4) return null;
    const l = lich.find(x => x.tuNgay <= date && date <= x.denNgay);
    if (!l || !l.thuTu.length || date <= l.moc) return null;
    const k = Math.floor(soNgayGiua(l.tuNgay, thuHaiCua(date)) / 7);
    const m = mau.get(l.thuTu[k % l.thuTu.length]);
    if (!m) return null;
    const meals = m.ngay[String(lech)];
    if (!coMon(meals)) return null;
    return { mau: tomTatMau(m), meals };
  };
}

// Chỉ lớp mẫu của MỘT phạm vi ('' = dùng chung).
function mauTheoNgay(campusId, date) {
  return boTraMau(campusId)(date);
}

// Bốn lớp, có ghi `nguon` để `chotQuaKhu` và đường nạp Excel biết ngày đó
// đang đến từ đâu: 'coso' | 'mau-coso' | 'chung' | 'mau-chung'.
function giai(campusId, tu, den) {
  const ra = new Map();
  if (!ngayHopLe(tu) || !ngayHopLe(den) || den < tu) return ra;
  const cuoi = soNgayGiua(tu, den) > TOI_DA_NGAY_GIAI ? congNgay(tu, TOI_DA_NGAY_GIAI) : den;
  const chung = new Map(db.all('menus',
    'SELECT * FROM menus WHERE date BETWEEN ? AND ?', [tu, cuoi]).map(m => [m.date, m]));
  const rieng = campusId
    ? new Map(db.all('menu_campus',
      'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ?', [campusId, tu, cuoi]).map(m => [m.date, m]))
    : new Map();
  const mauCoSo = campusId ? boTraMau(campusId) : () => null;
  const mauChung = boTraMau('');
  for (let d = tu; d && d <= cuoi; d = congNgay(d, 1)) {
    const r = rieng.get(d);
    if (r) { ra.set(d, { date: d, meals: r.meals, rieng: true, capNhatLuc: r.capNhatLuc, tuMau: null, nguon: 'coso' }); continue; }
    const mc = mauCoSo(d);
    if (mc) { ra.set(d, { date: d, meals: mc.meals, rieng: true, tuMau: mc.mau, nguon: 'mau-coso' }); continue; }
    const c = chung.get(d);
    if (c) { ra.set(d, { date: d, meals: c.meals, rieng: false, tuMau: null, nguon: 'chung' }); continue; }
    const mg = mauChung(d);
    if (mg) ra.set(d, { date: d, meals: mg.meals, rieng: false, tuMau: mg.mau, nguon: 'mau-chung' });
  }
  return ra;
}

// Thực đơn đã gộp của một khoảng ngày: Map date → {date, meals, rieng,
// capNhatLuc?, tuMau: null | {id, so, ten}}. Chưa có lịch nào thì kết quả
// đúng bằng luật cũ "riêng cơ sở thắng chung".
function giaiKhoang(campusId, tu, den) {
  const ra = new Map();
  for (const [d, x] of giai(campusId || null, tu, den)) {
    const { nguon, ...congKhai } = x;
    if (nguon !== 'coso') delete congKhai.capNhatLuc;
    ra.set(d, congKhai);
  }
  return ra;
}

// Món đang lấy từ mẫu của một ngày, khi phạm vi CHƯA có dòng thật ngày đó.
// Dùng để nhận ra "lưu lại đúng như mẫu" (không cần ghi dòng riêng).
function nenMau(campusId, date) {
  const x = giai(campusId || null, date, date).get(date);
  return x && x.tuMau ? x.meals : null;
}

// CHỐT QUÁ KHỨ: chép thực đơn đang giải từ mẫu của các ngày tới `denNgay`
// thành dòng thật của phạm vi. Gọi trong `db.tx` của đường ghi.
//
// • Dùng chung: ngày chưa có dòng `menus` mà đang lấy từ mẫu chung → ghi `menus`.
// • Cơ sở X: ngày chưa có dòng riêng mà đang hiện món (từ mẫu của X, hay từ
//   bản dùng chung mà lịch mới của X sắp che đi) → ghi `menu_campus`.
//
// `cacKhoang` mặc định là mọi đoạn lịch đang chạy của phạm vi.
function chotQuaKhu(campusId, cacKhoang = null, denNgay = ngay.homNay()) {
  const pv = phamVi(campusId);
  const khoang = cacKhoang || dsLich(pv).map(l => [l.tuNgay, l.denNgay]);
  const luc = new Date().toISOString();
  let soDong = 0;
  for (const [tu, den0] of khoang) {
    const den = den0 < denNgay ? den0 : denNgay;
    if (!tu || den < tu) continue;
    for (const [d, x] of giai(pv || null, tu, den)) {
      if (pv) {
        if (x.nguon === 'coso' || !coMon(x.meals)) continue;
        db.insert('menu_campus', { campusId: pv, date: d, meals: x.meals, nguoiDang: null, capNhatLuc: luc });
      } else {
        if (x.nguon !== 'mau-chung') continue;
        db.insert('menus', { id: db.nextId('menu'), date: d, meals: x.meals });
      }
      soDong++;
    }
  }
  return soDong;
}

// Mẫu mà lịch của MỘT phạm vi đặt cho tuần bắt đầu bằng `thuHai`, hoặc null.
function mauCuaTuan(campusId, thuHai) {
  const lich = dsLich(campusId).find(l => l.tuNgay <= congNgay(thuHai, 4) && thuHai <= l.denNgay);
  if (!lich || !lich.thuTu.length) return null;
  const k = Math.floor(soNgayGiua(lich.tuNgay, thuHai) / 7);
  const m = layMau(lich.thuTu[k % lich.thuTu.length]);
  return m ? tomTatMau(m) : null;
}

// Tuần nào trong 12 tuần tới dùng mẫu nào, để văn phòng nhìn trước. Cơ sở chưa
// có lịch riêng thì nói mẫu của lịch dùng chung (`tuLichChung`).
function duKien(campusId, soTuan = 12, homNay = ngay.homNay()) {
  const pv = phamVi(campusId);
  const dau = thuHaiCua(homNay);
  const cuoi = congNgay(dau, soTuan * 7 - 1);
  const dongThat = new Set((pv
    ? db.all('menu_campus', 'SELECT date FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ?', [pv, dau, cuoi])
    : db.all('menus', 'SELECT date FROM menus WHERE date BETWEEN ? AND ?', [dau, cuoi])).map(r => r.date));
  const ra = [];
  for (let i = 0; i < soTuan; i++) {
    const thuHai = congNgay(dau, i * 7);
    let mau = mauCuaTuan(pv, thuHai);
    let tuLichChung = false;
    if (!mau && pv) {
      mau = mauCuaTuan('', thuHai);
      tuLichChung = !!mau;
    }
    const cacNgay = [0, 1, 2, 3, 4].map(n => congNgay(thuHai, n));
    ra.push({ thuHai, mau, tuLichChung, soNgaySuaRieng: cacNgay.filter(d => dongThat.has(d)).length });
  }
  return ra;
}

// ---------------------------------------------------------------------------
// BÁO GIA ĐÌNH VÀO THỨ SÁU (việc hẹn giờ)
// ---------------------------------------------------------------------------
//
// Tuần sau lấy từ mẫu thì không ai bấm Lưu, nên đường báo cũ của PUT /tuan
// không bao giờ chạy. Việc này thay chỗ nó: từ 8 giờ sáng thứ Sáu tới hết Chủ
// nhật, nhóm nào tuần sau có ngày lấy từ mẫu mà chưa được báo thì nhận một tin
// "Thực đơn tuần từ dd/mm đã có". Dấu đã báo ở `menu_mau_bao` theo (cơ sở,
// tuần): đồng hồ gọi lại mỗi 15 phút cũng chỉ một tiếng chuông.
//
// `homNay`, `gio` nhận vào để bài kiểm thử gọi thẳng cho một thứ Sáu bất kỳ.
function baoTuanSau({ homNay = ngay.homNay(), gio = ngay.bayGio() } = {}) {
  const modules = require('./modules');
  if (!modules.dangBat('thucdon')) return [];
  const lech = lechThuHai(homNay);
  if (lech < 4 || (lech === 4 && gio < '08:00')) return [];
  const thuHai = congNgay(homNay, 7 - lech);
  const thuSau = congNgay(thuHai, 4);
  const tb = require('./thong-bao');
  const daBao = [];
  const nhomKhongCoSo = db.classes().map(c => c.id).filter(id => !db.campusOfClass(id));
  const cacPhamVi = [...db.campuses().map(c => ({ campusId: c.id, nhom: db.classIdsOfCampus(c.id) })),
    { campusId: '', nhom: nhomKhongCoSo }];
  for (const { campusId, nhom } of cacPhamVi) {
    try {
      if (!nhom.length) continue;
      if (db.first('menu_mau_bao', 'SELECT thuHai FROM menu_mau_bao WHERE campusId = ? AND thuHai = ?', [campusId, thuHai])) continue;
      const coMau = [...giai(campusId || null, thuHai, thuSau).values()].some(x => x.tuMau);
      if (!coMau) continue;
      tb.guiChoNhom(nhom, {
        title: `Thực đơn tuần từ ${thuHai.slice(8, 10)}/${thuHai.slice(5, 7)} đã có`,
        body: 'Thực đơn tuần tới đã sẵn sàng. Mở Thực đơn để xem từng ngày con ăn gì.',
        category: 'Khác', createdBy: null, hash: '#/menu',
      });
      db.upsert('menu_mau_bao', { campusId, thuHai, baoLuc: new Date().toISOString() }, ['campusId', 'thuHai']);
      daBao.push(campusId);
    } catch (err) {
      console.error(`[thucdon] chưa báo được thực đơn tuần ${thuHai} cho "${campusId || 'cả trường'}": ${err.message}`);
    }
  }
  return daBao;
}

module.exports = {
  TOI_DA_MAU, TOI_DA_THU_TU,
  congNgay, lechThuHai, thuHaiCua, coMon,
  dsMau, layMau, themMau, suaMau,
  dsLich, layLich, kiemLich, themLich, suaLich, huyLich,
  mauTheoNgay, giaiKhoang, nenMau, chotQuaKhu, duKien, baoTuanSau,
};
