// Phân hệ Thực đơn bán trú: xem thực đơn tuần trước / tuần này / tuần sau
// (cả phụ huynh và giáo viên); quản trị (văn phòng, nhà bếp) soạn và sửa.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');
const tb = require('../lib/thong-bao');
const uploads = require('../lib/uploads');
const xlsx = require('../lib/xlsx');

// Giới hạn để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
const TOI_DA_BUA = 5;        // số bữa mỗi ngày
const TOI_DA_MON_BUA = 20;   // số món mỗi bữa
const TOI_DA_TEN_MON = 100;  // độ dài tên món
const TOI_DA_NGAY_MOT_LAN = 7;  // số ngày gửi lên trong một lần soạn cả tuần

// TỆP THỰC ĐƠN CẢ TUẦN (Đ160 — TD-04).
//
// Ba tệp mỗi tuần mỗi cơ sở là rộng rãi: bếp thường gửi đúng một tệp. Trần có
// mặt để một lần bấm nhầm liên tục không lấp đầy đĩa của trường.
const TOI_DA_TEP_TUAN = 3;
const TOI_DA_TEN_TEP = 120;
// Ba loại, và cố ý không nhiều hơn:
//   pdf/docx — thứ bếp gửi qua Zalo cho văn phòng
//   anh      — ảnh chụp tờ thực đơn dán ở bếp, thứ nhanh nhất với điện thoại
// Excel thì đã có đường riêng và tốt hơn hẳn: tệp Excel mẫu (Đ226) và ô "dán bảng" của Đ132 đưa thẳng
// nội dung vào bảng thực đơn, tức là gia đình đọc được theo từng ngày, phân hệ
// Tiền ăn đối chiếu được. Nhận một tệp .xlsx rồi treo nguyên lên thì app không
// đọc được một chữ nào trong đó.
const LOAI_TEP = ['pdf', 'docx', 'anh'];

// Thứ Hai của tuần cách tuần hiện tại `week` tuần (âm = quá khứ), trả về
// YYYY-MM-DD theo GIỜ VIỆT NAM.
//
// Bản cũ tính bằng giờ máy chủ (`new Date()` rồi getFullYear/getMonth/getDate).
// Sáng sớm ở Việt Nam mà máy chủ đứng ở UTC thì "tuần này" của thực đơn lệch
// một ngày so với "hôm nay" của sổ điểm danh — hai màn cô mở cạnh nhau mỗi
// sáng. Nay cả app chỉ có một định nghĩa, ở lib/ngay.js.
function thuHaiCuaTuan(week) {
  return congNgay(ngay.homNay(), -lechThuHai(ngay.homNay()) + week * 7);
}

// Cộng n ngày vào một chuỗi YYYY-MM-DD. Neo vào T00:00:00Z rồi cộng theo mili
// giây: phép này không đi qua múi giờ nào cả nên không bao giờ lệch một ngày.
function congNgay(ngayStr, n) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

// Hôm đó cách thứ Hai của tuần mấy ngày (thứ Hai = 0, Chủ nhật = 6).
function lechThuHai(ngayStr) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  return (new Date(t).getUTCDay() + 6) % 7;
}

// Chuẩn hóa danh sách bữa ăn của một ngày. Trả về null nếu không hợp lệ.
function lamSachBuaAn(meals) {
  if (!Array.isArray(meals) || !meals.length || meals.length > TOI_DA_BUA) return null;
  const out = [];
  for (const m of meals) {
    const o = m && typeof m === 'object' ? m : {};
    const label = String(o.label || '').trim().slice(0, 40);
    if (!label) return null; // mỗi bữa phải có tên
    if (o.items !== undefined && !Array.isArray(o.items)) return null;
    out.push({
      type: String(o.type || 'other').trim().slice(0, 20) || 'other',
      label,
      time: String(o.time || '').trim().slice(0, 20),
      items: (o.items || [])
        .map(it => String(it ?? '').trim().slice(0, TOI_DA_TEN_MON))
        .filter(Boolean)
        .slice(0, TOI_DA_MON_BUA),
    });
  }
  return out;
}

// BA CƠ SỞ NẤU RIÊNG BẾP — nhà trường chốt ngày 30/08.
//
// Trước đợt này thực đơn là của CẢ TRƯỜNG: một bản ghi mỗi ngày trong `menus`,
// và quản lý cơ sở bị chặn không cho sửa, vì hai người sửa thì người sau âm
// thầm ghi đè người trước.
//
// Nay mỗi cơ sở có bảng riêng `menu_campus`. Luật đọc và ghi gói gọn trong ba
// hàm dưới đây, để không chỗ nào trong tệp này phải tự đoán lại.

// Cơ sở mà một người ĐANG XEM thực đơn của.
//
// • Gia đình  → cơ sở của nhóm con đang học.
// • Cô        → cơ sở của nhóm cô phụ trách.
// • Quản trị Cấp 3 → cơ sở mình bị khoá vào.
// • Quản trị Cấp 1 → không cố định; lấy theo `?campusId=` nếu có, không thì
//                    xem bản dùng chung.
//
// Trả về null nghĩa là "không gắn với cơ sở nào" — khi đó đọc bản dùng chung,
// đúng như app vẫn chạy từ trước tới nay.
function coSoDangXem(user, campusIdMuon) {
  if (!user) return null;
  if (user.role === 'admin') {
    // `phamViCoSo` trả về MỘT MÃ cơ sở (chuỗi) hoặc null, không phải mảng.
    //
    // Bản đầu của hàm này viết `khoa.length === 1` như thể nó là mảng. Chuỗi
    // 'cs2' cũng có `.length`, bằng 3, nên điều kiện không bao giờ đúng và mọi
    // quản lý cơ sở rơi xuống nhánh Cấp 1 — tức ghi thẳng vào bảng dùng chung.
    // Phép thử tay bắt được ngay: món của cơ sở 2 hiện lên màn hình gia đình
    // cơ sở 1. Đúng cái hỏng mà chú thích cũ ở đường PUT đã cảnh báo.
    const khoa = db.phamViCoSo(user);
    if (khoa) return khoa;
    return campusIdMuon && db.canAccessCampus(user, campusIdMuon) ? campusIdMuon : null;
  }
  // Gia đình có con học ở HAI cơ sở (cô dạy hai cơ sở cũng vậy): không được
  // chết cứng ở cơ sở "đầu danh sách". Tôn trọng `?campusId=` khi nó nằm trong
  // các cơ sở CỦA CHÍNH HỌ — để màn hình đổi theo bé đang chọn — còn không
  // gửi gì thì lấy cơ sở đầu tiên, đúng hành vi cũ.
  const nhom = db.classIdsOf(user);
  const cuaMinh = [];
  for (const c of (nhom || [])) {
    const cs = db.campusOfClass(c);
    if (cs && !cuaMinh.includes(cs)) cuaMinh.push(cs);
  }
  if (campusIdMuon && cuaMinh.includes(campusIdMuon)) return campusIdMuon;
  return cuaMinh[0] || null;
}

// Cơ sở mà một người quản trị ĐƯỢC GHI vào.
//
// Cấp 3 chỉ ghi được cơ sở mình. Cấp 1 ghi được bất cứ cơ sở nào nếu nói rõ
// `campusId`, và ghi vào bản DÙNG CHUNG nếu không nói gì — giữ nguyên đường cũ
// cho trường một bếp.
//
// Trả về { ok: false, loi } nếu không được phép.
function coSoDuocGhi(user, campusIdMuon) {
  const khoa = db.phamViCoSo(user);
  if (khoa) {
    if (campusIdMuon && campusIdMuon !== khoa) {
      return { ok: false, loi: 'Tài khoản này chỉ soạn được thực đơn của cơ sở mình phụ trách' };
    }
    return { ok: true, campusId: khoa };
  }
  if (campusIdMuon && !db.findCampus(campusIdMuon)) {
    return { ok: false, loi: 'Không tìm thấy cơ sở này' };
  }
  return { ok: true, campusId: campusIdMuon || null };
}

// QUYỀN ĐỌC MỘT TỆP THỰC ĐƠN — hỏi thẳng bằng hai hàm gốc, không mượn
// `coSoDangXem` (Đ160).
//
// `coSoDangXem` trả lời câu "màn hình này nên MỞ SẴN cơ sở nào" — nó có nhánh
// "không gửi gì thì lấy cơ sở đầu tiên của mình", đúng cho việc chọn mặc định
// và sai cho việc canh quyền: một câu hỏi về CHÍNH tệp này thì không được có
// đường lùi nào cả.
//
// Tệp của cả trường (campusId rỗng) thì ai đọc được thực đơn đều đọc được —
// đó là thực đơn của trường, không phải dữ liệu của một đứa trẻ nào.
function xemDuocTepCoSo(user, campusId) {
  if (!user) return false;
  if (!campusId) return true;
  if (user.role === 'admin') return db.canAccessCampus(user, campusId);
  // Cô và gia đình: có nhóm nào CỦA MÌNH thuộc cơ sở ấy không.
  return db.classIdsOfCampus(campusId).some(cid => db.canAccessClass(user, cid));
}

// Tệp thực đơn của một tuần (Đ160). Tệp riêng của cơ sở đứng trước tệp dùng
// chung cả trường — cùng thứ tự ưu tiên với chính bảng thực đơn.
//
// KHÔNG TRẢ VỀ TÊN TỆP TRONG KHO. Màn hình chỉ cần mã dòng để dựng đường
// `/api/menu/tep/<id>`; tên tệp thật là thứ chỉ máy chủ cần biết, và in ra là
// mời người ta thử đoán tên tệp khác trong cùng kho.
function tepCuaTuan(thuHai, campusId) {
  const dk = campusId ? "(campusId = '' OR campusId = ?)" : "campusId = ''";
  const thamSo = campusId ? [thuHai, campusId] : [thuHai];
  return db.all('menu_tep',
    `SELECT id, tuNgay, campusId, tenGoc, bytes, loai, taoLuc FROM menu_tep
      WHERE tuNgay = ? AND ${dk} ORDER BY campusId DESC, taoLuc`, thamSo)
    .map(t => ({
      id: t.id,
      tenGoc: t.tenGoc,
      bytes: Number(t.bytes) || 0,
      loai: t.loai,
      rieng: !!t.campusId,
      taoLuc: t.taoLuc,
    }));
}

// Thực đơn của một khoảng ngày cho một cơ sở, ĐÃ GỘP với bản dùng chung.
//
// Dòng riêng của cơ sở thắng; ngày nào cơ sở chưa soạn riêng thì lấy bản dùng
// chung. Nhờ vậy trường có thể chỉ soạn riêng đúng những ngày bếp nấu khác.
function thucDonCua(campusId, from, to) {
  const chung = new Map(db.all('menus',
    'SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date', [from, to])
    .map(m => [m.date, { date: m.date, meals: m.meals, rieng: false }]));
  if (campusId) {
    for (const m of db.all('menu_campus',
      'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ? ORDER BY date',
      [campusId, from, to])) {
      chung.set(m.date, { date: m.date, meals: m.meals, rieng: true, capNhatLuc: m.capNhatLuc });
    }
  }
  return [...chung.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ===========================================================================
// TỆP EXCEL MẪU: TẢI VỀ → ĐIỀN → NẠP LÊN, APP TỰ ĐIỀN TỪNG NGÀY (góp ý 06/10, mục 3)
// ===========================================================================
//
// Trường: *"phần dán thực đơn từ bảng Excel/Word chưa đúng ý định. Hãy tạo 1
// form mẫu bằng Excel theo đúng cấu trúc bạn cần, sau đó mình sẽ up lên và bạn
// sẽ tự điền vào từng ngày"*. Cùng khuôn với tệp cân đo của Đ205 (tải mẫu đã
// điền sẵn tên → điền → nạp lại), nhưng là .xlsx thật — bếp làm việc trên
// Excel, không trên CSV.
//
// MẪU THEO THÁNG: mỗi hàng một ngày học (thứ Hai – thứ Sáu), mỗi cột một bữa;
// ô nhiều món thì xuống dòng (Alt+Enter) hoặc cách nhau bằng dấu chấm phẩy —
// đúng luật tách món của ô "Dán bảng" cũ (Đ132, đã gỡ ở Đ231) — món đã soạn theo
// luật ấy đọc lại vẫn y nguyên.
// Ngày đã có thực đơn thì mẫu điền sẵn món, sửa trên đó là xong.
//
// NẠP LÊN LÀ HAI BƯỚC: xem trước (không ghi gì) rồi mới lưu. Ngày có món trong
// tệp thì THAY cả ngày; ngày để trống trong tệp thì KHÔNG đụng tới — nạp một
// tệp thiếu vài ngày không được xoá thực đơn đang có của những ngày ấy.
//
// Năm bữa PHẢI KHỚP `BUA_MAC_DINH` ở public/js/views/menu.js — Nhật ký ngày
// đọc thực đơn theo đúng mã `type` ấy. `test:thuc-don-excel` canh hai bản.
// Tên và giờ theo ảnh mẫu 16/10; thực đơn đã lưu giữ nguyên tên, giờ của nó.
const BUA_MAU = [
  { type: 'breakfast', label: 'Bữa sáng', time: '08:00' },
  { type: 'snack_sang', label: 'Bữa phụ sáng', time: '09:30' },
  { type: 'lunch', label: 'Bữa trưa', time: '11:20' },
  { type: 'snack', label: 'Bữa phụ chiều', time: '14:00' },
  { type: 'milk', label: 'Bữa sữa chiều', time: '15:30' },
];
const TEN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const TOI_DA_HANG_EXCEL = 70;          // hơn hai tháng ngày học
const TOI_DA_TEP_EXCEL = 3 * 1024 * 1024;

// Tiêu đề cột → bữa. Khớp đúng tên trong mẫu trước, rồi mới tới các cách gọi
// khác (cùng bộ với `nhanBua` của màn soạn).
function buaTheoTieuDe(ten) {
  const t = String(ten || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const dung = BUA_MAU.find(b => b.label.toLowerCase() === t);
  if (dung) return dung;
  const bang = [
    ['breakfast', /^(bữa )?sáng$|breakfast|bua sang/],
    ['snack_sang', /phụ sáng|phu sang|snack.*(am|sáng|morning)|^snacks? ?1$|^(bữa )?phụ 1$/],
    ['lunch', /trưa|lunch|bua trua/],
    ['snack', /phụ chiều|phu chieu|xế|xe$|snack|^(bữa )?phụ 2$/],
    ['milk', /sữa|sua|milk/],
  ];
  for (const [type, re] of bang) if (re.test(t)) return BUA_MAU.find(b => b.type === type);
  return null;
}

// Ô ngày → "YYYY-MM-DD". Nhận số sê-ri của Excel, "05/10/2026", "5/10/2026",
// "05-10-2026", "2026-10-05". Ngày không có thật (30/02) → null.
function ngayTuO(gt) {
  if (typeof gt === 'number') return xlsx.ngayTuSoExcel(gt);
  const s = String(gt || '').trim();
  let y, m, d;
  let k = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (k) { y = +k[1]; m = +k[2]; d = +k[3]; } else {
    k = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
    if (!k) return null;
    d = +k[1]; m = +k[2]; y = +k[3];
  }
  const t = Date.UTC(y, m - 1, d);
  const ra = new Date(t).toISOString().slice(0, 10);
  return new Date(t).getUTCDate() === d && new Date(t).getUTCMonth() === m - 1 ? ra : null;
}
const tachMon = (o) => String(o ?? '').split(/[;\n•]/).map(x => x.trim()).filter(Boolean);
const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

// Đọc tệp đã điền → danh sách ngày có món + lời nhắc. KHÔNG ghi gì.
function docThucDonExcel(buf) {
  const bang = xlsx.doc(buf);
  const canhBao = [];
  // Trang có hàng tiêu đề chứa "Ngày" trong năm hàng đầu.
  let trang = null; let hangTieuDe = -1; let cotNgay = -1;
  for (const b of bang) {
    for (let r = 0; r < Math.min(5, b.hang.length) && !trang; r++) {
      const i = (b.hang[r] || []).findIndex(x => /^ngày$/i.test(String(x ?? '').trim()));
      if (i >= 0) { trang = b; hangTieuDe = r; cotNgay = i; }
    }
    if (trang) break;
  }
  if (!trang) {
    return { loi: 'Không tìm thấy hàng tiêu đề có cột "Ngày". Tải tệp mẫu của app về, điền vào đó rồi nạp lại nhé.' };
  }
  const tieuDe = trang.hang[hangTieuDe] || [];
  const cotBua = [];
  tieuDe.forEach((ten, i) => {
    if (i === cotNgay || /^thứ$/i.test(String(ten ?? '').trim()) || ten === undefined || ten === null || ten === '') return;
    const b = buaTheoTieuDe(ten);
    const trung = b && cotBua.find(x => x.bua.type === b.type);
    if (b && !trung) cotBua.push({ i, bua: b, ten: String(ten).trim() });
    // Cột thêm vào mà trùng loại bữa với một cột đã có ("Sữa chua" cạnh "Sữa
    // Vinamilk") cũng phải được NÓI RA — trước đây bị bỏ không một lời (vòng rà Đ232).
    else if (trung) {
      canhBao.push(`Cột "${String(ten).slice(0, 40)}" trùng bữa với cột "${trung.ten.slice(0, 40)}" — bỏ qua. `
        + `Gộp món vào cột "${trung.ten.slice(0, 40)}" (xuống dòng trong ô) nhé.`);
    } else canhBao.push(`Cột "${String(ten).slice(0, 40)}" không phải tên bữa nào — bỏ qua.`);
  });
  if (!cotBua.length) return { loi: 'Hàng tiêu đề không có cột bữa nào (Bữa sáng, Bữa trưa…). Dùng đúng tệp mẫu của app nhé.' };

  const daThay = new Set();
  const ngay = [];
  const hang = trang.hang.slice(hangTieuDe + 1, hangTieuDe + 1 + TOI_DA_HANG_EXCEL);
  if (trang.hang.length - hangTieuDe - 1 > TOI_DA_HANG_EXCEL) {
    canhBao.push(`Tệp có hơn ${TOI_DA_HANG_EXCEL} hàng — chỉ đọc ${TOI_DA_HANG_EXCEL} hàng đầu. Nạp từng tháng một nhé.`);
  }
  hang.forEach((h, j) => {
    if (!h) return;
    const soHang = hangTieuDe + j + 2;   // số hàng như Excel hiện
    const coMon = cotBua.some(c => tachMon(h[c.i]).length);
    const o = h[cotNgay];
    if (o === undefined || o === null || o === '') {
      if (coMon) canhBao.push(`Hàng ${soHang} có món nhưng thiếu ngày — bỏ qua.`);
      return;
    }
    const date = ngayTuO(o);
    if (!date) { canhBao.push(`Hàng ${soHang}: "${String(o).slice(0, 20)}" không phải ngày — gõ dạng 05/10/2026.`); return; }
    if (!coMon) return;   // ngày để trống: không đụng tới thực đơn đang có
    const thu = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (thu === 0 || thu === 6) { canhBao.push(`${TEN_THU[thu]} ${ddmm(date)} không phải ngày học — bỏ qua.`); return; }
    if (daThay.has(date)) { canhBao.push(`Ngày ${ddmm(date)} có hai hàng — lấy hàng đầu, bỏ hàng ${soHang}.`); return; }
    daThay.add(date);
    ngay.push({
      date, thu: TEN_THU[thu],
      bua: cotBua.map(c => ({ ...c.bua, items: tachMon(h[c.i]).map(x => x.slice(0, TOI_DA_TEN_MON)).slice(0, TOI_DA_MON_BUA) }))
        .filter(b => b.items.length),
    });
  });
  ngay.sort((a, b) => a.date.localeCompare(b.date));
  return { ngay, canhBao, loaiCot: cotBua.map(c => c.bua.type) };
}

// Một ngày đang có, nhìn qua đúng các cột của tệp: mỗi loại bữa lấy BỮA ĐẦU
// của loại ấy — y như tệp mẫu điền sẵn. Dùng để nhận ra ngày người dùng không
// sửa gì (vòng rà Đ232).
function buaNhuMau(meals, loaiCot) {
  const ra = {};
  for (const t of loaiCot) {
    const m = (meals || []).find(x => x.type === t);
    ra[t] = tachMon(((m && m.items) || []).join('\n')).map(x => x.slice(0, TOI_DA_TEN_MON)).slice(0, TOI_DA_MON_BUA).join('\n');
  }
  return ra;
}

module.exports = (app) => {
  // Thực đơn theo tuần: ?week=0 (tuần này, mặc định) | 1 (tuần sau) | -1 (tuần trước).
  app.get('/api/menu', (req, res) => {
    const week = req.query.week === '1' ? 1 : (req.query.week === '-1' ? -1 : 0);
    const from = thuHaiCuaTuan(week);
    const to = congNgay(from, 4);
    const campusId = coSoDangXem(req.user, String(req.query.campusId || ''));
    const cs = campusId ? db.findCampus(campusId) : null;
    res.json({
      week, from, to,
      campusId: campusId || null,
      tenCoSo: cs ? cs.name : '',
      // Danh sách cơ sở CHỈ cho người soạn được nhiều cơ sở (Cấp 1), để màn
      // hình dựng ô chọn. Gia đình và cô không cần — và cũng không nên thấy
      // tên các cơ sở khác trong một màn thực đơn.
      cacCoSo: req.user && req.user.role === 'admin' && db.phamViCoSo(req.user) === null
        ? db.campuses().map(c => ({ id: c.id, name: c.name }))
        : [],
      menus: thucDonCua(campusId, from, to),
      // TỆP CỦA TUẦN ĐANG XEM (Đ160). Ai đọc được thực đơn thì đọc được tệp
      // của nó — không có luật riêng, vì đây là thực đơn của cả trường chứ
      // không phải dữ liệu của một đứa trẻ nào.
      tep: tepCuaTuan(from, campusId),
      taiTepDuoc: !!(req.user && req.user.role === 'admin'),
    });
  });

  // SOẠN CẢ TUẦN TRONG MỘT LẦN LƯU.
  //
  // Nhà trường nói thẳng: "giao diện máy tính hơi khó nhìn", và muốn nhập liệu
  // nhanh nhất có thể. Soạn một tuần bằng đường cũ là mở 5 hộp thoại và bấm
  // Lưu 5 lần — mỗi tuần một lần, mỗi năm gần 40 lần.
  //
  // ĐẶT TRƯỚC `/api/menu/:date`. Express khớp đường dẫn theo thứ tự đăng ký,
  // nên để sau thì "tuan" rơi vào chỗ :date và người soạn nhận được câu
  // "Ngày chưa đúng dạng" khó hiểu.
  //
  // MỘT GIAO DỊCH, KHÔNG PHẢI 5 LỜI GỌI. Gọi 5 lần thì lỗi ở ngày thứ ba để
  // lại một tuần soạn dở — hai ngày đã lưu, ba ngày chưa — mà màn hình vừa
  // báo lỗi nên người soạn không biết mình đang đứng ở đâu.
  // Tệp mẫu của MỘT tháng, điền sẵn ngày học và món đã có.
  app.get('/api/menu/mau-excel', requireRole('admin'), (req, res) => {
    const quyen = coSoDuocGhi(req.user, String(req.query.campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const thang = /^\d{4}-\d{2}$/.test(String(req.query.thang || '')) ? String(req.query.thang) : ngay.homNay().slice(0, 7);
    const [y, m] = thang.split('-').map(Number);
    if (m < 1 || m > 12 || y < 2020 || y > 2100) return res.status(400).json({ error: 'Tháng chưa hợp lệ, ví dụ đúng: 2026-10' });
    const campusId = quyen.campusId;
    const hang = [['Ngày', 'Thứ', ...BUA_MAU.map(b => b.label)]];
    for (let d = 1; d <= 31; d++) {
      const t = Date.UTC(y, m - 1, d);
      if (new Date(t).getUTCMonth() !== m - 1) break;
      const thu = new Date(t).getUTCDay();
      if (thu === 0 || thu === 6) continue;
      const date = new Date(t).toISOString().slice(0, 10);
      const ban = (campusId ? db.first('menu_campus', 'SELECT meals FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, date]) : null)
        || db.first('menus', 'SELECT meals FROM menus WHERE date = ?', [date]);
      const meals = (ban && Array.isArray(ban.meals)) ? ban.meals : [];
      hang.push([`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`, TEN_THU[thu],
        ...BUA_MAU.map(b => ((meals.find(x => x.type === b.type) || {}).items || []).join('\n'))]);
    }
    const huongDan = [
      ['CÁCH ĐIỀN TỆP THỰC ĐƠN'],
      ['1. Mỗi hàng là một ngày học (thứ Hai – thứ Sáu). Đừng sửa cột Ngày và cột Thứ.'],
      ['2. Mỗi cột là một bữa. Ô có nhiều món thì xuống dòng trong ô (Alt + Enter) hoặc cách nhau bằng dấu chấm phẩy ( ; ).'],
      ['3. Ngày nào để trống cả hàng thì app KHÔNG đụng tới thực đơn đang có của ngày đó.'],
      ['4. Ngày nào có món thì app THAY cả ngày đó bằng các món trong tệp.'],
      ['5. Điền xong: lưu tệp (giữ dạng .xlsx), vào app → Thực đơn → "Nạp tệp Excel đã điền". App cho xem trước rồi mới lưu.'],
      [`Tệp này của tháng ${m}/${y}${campusId ? ` — bếp ${(db.findCampus(campusId) || {}).name || ''}` : ' — dùng chung mọi cơ sở'}.`],
    ];
    const buf = xlsx.ghi([
      { ten: 'Thực đơn', dongTieuDe: true, cot: [12, 10, 26, 26, 30, 26, 22], hang },
      { ten: 'Hướng dẫn', cot: [110], hang: huongDan },
    ]);
    db.audit(req.user.id, 'menu-mau-excel', campusId || null, { thang });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Thuc-don-mau-${thang}.xlsx"`);
    res.send(buf);
  });

  // Nạp tệp đã điền. `luu: false` (mặc định) chỉ đọc và trả bản xem trước;
  // `luu: true` mới ghi — cùng bảng, cùng luật cơ sở với "Lưu cả tuần".
  app.post('/api/menu/nap-excel', requireRole('admin'), (req, res) => {
    const body = req.body || {};
    const quyen = coSoDuocGhi(req.user, String(body.campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;
    const m = /^data:[^;,]*;base64,(.+)$/s.exec(String(body.tep || ''));
    if (!m) return res.status(400).json({ error: 'Chưa nhận được tệp Excel' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > TOI_DA_TEP_EXCEL) return res.status(400).json({ error: 'Tệp quá lớn — tệp thực đơn một tháng chỉ vài chục KB' });
    let kq;
    try { kq = docThucDonExcel(buf); } catch (err) {
      return res.status(400).json({ error: `Không đọc được tệp: ${err.message}. Mở bằng Excel rồi lưu lại dạng .xlsx thử nhé.` });
    }
    if (kq.loi) return res.status(400).json({ error: kq.loi });
    const cu = (date) => (campusId
      ? db.first('menu_campus', 'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, date])
      : db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]));
    // MẪU CHỈ CÓ NĂM CỘT, MỘT BỮA MỖI LOẠI (vòng rà Đ232). Ngày đang có bữa
    // "Tráng miệng", hay hai bữa cùng loại sữa (ô dán Đ132 sinh ra những bữa
    // ấy) thì tệp không chứa được chúng. Hai luật:
    //  • ngày giống hệt bản mẫu đã điền sẵn = người dùng KHÔNG sửa → không đụng;
    //  • ngày có sửa thì THAY các bữa có cột trong tệp, còn những bữa tệp không
    //    chứa được thì GIỮ NGUYÊN — và màn xem trước nói ra là giữ bữa nào.
    const loaiCot = kq.loaiCot || [];
    const tinhNgay = (n) => {
      const truoc = cu(n.date);
      const buaCu = (truoc && Array.isArray(truoc.meals)) ? truoc.meals : [];
      const moi = Object.fromEntries(loaiCot.map(t => [t, ((n.bua.find(b => b.type === t) || {}).items || []).join('\n')]));
      const khongDoi = !!truoc && JSON.stringify(buaNhuMau(buaCu, loaiCot)) === JSON.stringify(moi);
      const daGap = new Set();
      const giu = buaCu.filter(x => {
        if (!loaiCot.includes(x.type)) return true;
        if (daGap.has(x.type)) return true;   // bữa thứ hai cùng loại — mẫu không có chỗ cho nó
        daGap.add(x.type);
        return false;
      });
      return { truoc, buaCu, khongDoi, giu };
    };
    const xemTruoc = kq.ngay.map(n => {
      const t = tinhNgay(n);
      return { ...n, daCo: !!t.truoc, khongDoi: t.khongDoi, giuBua: t.khongDoi ? [] : t.giu.map(x => x.label) };
    });
    if (!body.luu) {
      return res.json({ ngay: xemTruoc, canhBao: kq.canhBao, campusId: campusId || null });
    }
    if (!kq.ngay.length) return res.status(400).json({ error: 'Tệp không có ngày nào có món để lưu' });
    const luc = new Date().toISOString();
    const daGhi = [];
    db.tx(() => {
      for (const n of kq.ngay) {
        const { truoc, buaCu, khongDoi, giu } = tinhNgay(n);
        if (khongDoi) continue;
        // Giữ tên bữa và giờ ăn bếp đã đặt riêng cho ngày ấy, nếu có.
        const meals = lamSachBuaAn([...n.bua.map(b => {
          const g = buaCu.find(x => x.type === b.type) || {};
          return { type: b.type, label: g.label || b.label, time: g.time || b.time, items: b.items };
        }), ...giu]);
        if (!meals) continue;
        daGhi.push(n.date);
        if (campusId) {
          db.upsert('menu_campus', { campusId, date: n.date, meals, nguoiDang: req.user.id, capNhatLuc: luc }, ['campusId', 'date']);
        } else if (truoc) db.update('menus', truoc.id, { meals });
        else db.insert('menus', { id: db.nextId('menu'), date: n.date, meals });
      }
    });
    db.audit(req.user.id, 'menu-nap-excel', campusId || null, { soNgay: kq.ngay.length, daGhi: daGhi.length, campusId });
    // Không ngày nào thật sự đổi (nạp lại đúng tệp mẫu) thì không báo gia đình.
    if (daGhi.length) {
      const nhom = campusId
        ? db.all('class_campus', 'SELECT classId FROM class_campus WHERE campusId = ?', [campusId]).map(r => r.classId)
        : db.classes().map(c => c.id);
      const tu = daGhi[0]; const den = daGhi[daGhi.length - 1];
      tb.guiChoNhom(nhom, {
        title: `Thực đơn từ ${ddmm(tu)} đến ${ddmm(den)} đã có`,
        body: 'Nhà bếp vừa đăng thực đơn. Mở Thực đơn để xem từng ngày con ăn gì.',
        category: 'Khác', createdBy: req.user.id, hash: '#/menu',
      });
    }
    res.json({
      daLuu: kq.ngay.length, ngay: kq.ngay.map(n => n.date), canhBao: kq.canhBao, campusId: campusId || null,
      // Thêm khoá, không đổi khoá cũ: số ngày thật sự ghi, và số ngày giống hệt bản đang có.
      daGhi: daGhi.length, khongDoi: kq.ngay.length - daGhi.length,
    });
  });

  app.put('/api/menu/tuan', requireRole('admin'), (req, res) => {
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;
    const ds = (req.body || {}).ngay;
    if (!Array.isArray(ds) || !ds.length || ds.length > TOI_DA_NGAY_MOT_LAN) {
      return res.status(400).json({
        error: `Danh sách ngày chưa hợp lệ (gửi từ 1 đến ${TOI_DA_NGAY_MOT_LAN} ngày một lần)`,
      });
    }

    // Kiểm TOÀN BỘ trước khi ghi dòng nào.
    const sach = [];
    const daThay = new Set();
    for (const x of ds) {
      const date = String((x || {}).date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: `Ngày "${date}" chưa đúng dạng, ví dụ đúng: 2026-09-07` });
      }
      if (daThay.has(date)) {
        return res.status(400).json({ error: `Ngày ${date} bị gửi lên hai lần trong cùng một lần lưu` });
      }
      daThay.add(date);

      const cu = campusId
        ? db.first('menu_campus', 'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, date])
        : db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]);
      // Ngày người soạn để trống hẳn mà trước đó cũng chưa có gì: BỎ QUA. Tạo
      // một bản ghi rỗng là màn hình của gia đình hiện ra một ngày trắng trông
      // như bếp quên soạn.
      const trongHan = Array.isArray((x || {}).meals)
        && (x.meals || []).every(m => !((m && m.items) || []).length);
      if (!cu && trongHan) continue;

      const meals = lamSachBuaAn((x || {}).meals);
      if (!meals) {
        return res.status(400).json({ error: `Thực đơn ngày ${date} chưa hợp lệ. Mỗi bữa cần có tên bữa.` });
      }
      sach.push({ date, meals, cu });
    }

    // Mốc ĐẦY ĐỦ (ISO), không phải giờ-phút trong ngày: `ngay.bayGio()` chỉ trả
    // "HH:MM", lưu vào capNhatLuc là vĩnh viễn không tra được thực đơn cơ sở
    // này được sửa HÔM NÀO — đúng lúc cần đối chiếu "bếp đổi món khi nào" thì
    // sổ chỉ còn giờ mà không còn ngày.
    const luc = new Date().toISOString();
    db.tx(() => {
      for (const { date, meals, cu } of sach) {
        if (campusId) {
          db.upsert('menu_campus',
            { campusId, date, meals, nguoiDang: req.user.id, capNhatLuc: luc },
            ['campusId', 'date']);
        } else if (cu) db.update('menus', cu.id, { meals });
        else db.insert('menus', { id: db.nextId('menu'), date, meals });
      }
    });
    db.audit(req.user.id, 'menu-update-tuan', campusId || null, { soNgay: sach.length, campusId });
    // BÁO GIA ĐÌNH (Đ137): "mọi update của nhà trường như thực đơn… cần có
    // thông báo tới phụ huynh". Gửi cho mọi nhóm ăn bếp này; cùng tuần cùng
    // ngày thì chỉ một lần (chống lặp ở lib/thong-bao.js).
    if (sach.length) {
      const nhom = campusId
        ? db.all('class_campus', 'SELECT classId FROM class_campus WHERE campusId = ?', [campusId]).map(r => r.classId)
        : db.classes().map(c => c.id);
      const tu = sach.map(x => x.date).sort()[0];
      tb.guiChoNhom(nhom, {
        title: `Thực đơn tuần từ ${tu.slice(8, 10)}/${tu.slice(5, 7)} đã có`,
        body: 'Nhà bếp vừa đăng thực đơn tuần. Mở Thực đơn để xem từng ngày con ăn gì.',
        category: 'Khác', createdBy: req.user.id,
        // Bấm vào tiếng chuông trên điện thoại là mở thẳng màn Thực đơn, chứ
        // không đổ gia đình vào danh sách thông báo rồi bắt tìm tiếp (Đ194).
        hash: '#/menu',
      });
    }
    res.json({ daLuu: sach.length, ngay: sach.map(x => x.date), campusId: campusId || null });
  });

  // Quản trị soạn/sửa thực đơn một ngày. Mỗi ngày một bản ghi, ghi đè cả ngày.
  app.put('/api/menu/:date', requireRole('admin'), (req, res) => {
    // ĐƯỜNG NÀY TRƯỚC ĐÂY CHẶN CẤP 3, và chú thích cũ dặn "muốn mở thì thêm
    // cột cơ sở vào `menus`". Không đi đường đó được: `menus.date` là UNIQUE,
    // đổi khoá phải dựng lại bảng, mà lược đồ lõi cấm ALTER TABLE — và dựng
    // lại một bảng đang có dữ liệu thật là đúng thứ Nguyên tắc số 1 cấm.
    //
    // Đường đã đi: bảng phụ `menu_campus`. Quản lý cơ sở ghi vào cơ sở mình,
    // Cấp 1 ghi vào cơ sở nào cũng được hoặc vào bản dùng chung. Không ai ghi
    // đè ai nữa, vì hai người ở hai cơ sở ghi vào hai dòng khác nhau.
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;

    const date = String(req.params.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    }
    const meals = lamSachBuaAn((req.body || {}).meals);
    if (!meals) {
      return res.status(400).json({ error: 'Danh sách bữa ăn chưa hợp lệ. Mỗi bữa cần có tên bữa.' });
    }

    if (campusId) {
      db.upsert('menu_campus',
        // ISO đủ ngày giờ, cùng đường /api/menu/tuan (Đ118f): 'HH:MM' thì
        // không bao giờ tra được thực đơn cơ sở sửa hôm nào.
        { campusId, date, meals, nguoiDang: req.user.id, capNhatLuc: new Date().toISOString() },
        ['campusId', 'date']);
      db.audit(req.user.id, 'menu-update', date, { soBua: meals.length, campusId });
      return res.json({ date, meals, campusId, rieng: true });
    }

    const cu = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]);
    let rec;
    if (cu) {
      rec = { ...cu, meals };
      db.update('menus', cu.id, { meals });
    } else {
      rec = { id: db.nextId('menu'), date, meals };
      db.insert('menus', rec);
    }
    db.audit(req.user.id, 'menu-update', date, { soBua: meals.length });
    res.json({ ...rec, campusId: null, rieng: false });
  });

  // Chép thực đơn của tuần liền trước sang tuần đích (0 = tuần này, 1 = tuần sau).
  // Chỉ chép vào những ngày tuần đích còn trống — không ghi đè thứ đã soạn.
  app.post('/api/menu/copy-week', requireRole('admin'), (req, res) => {
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;

    const week = Number((req.body || {}).week);
    if (week !== 0 && week !== 1) {
      return res.status(400).json({ error: 'Tuần đích chưa hợp lệ (0 = tuần này, 1 = tuần sau)' });
    }
    const nguon = thuHaiCuaTuan(week - 1);
    const dich = thuHaiCuaTuan(week);
    const luc = ngay.bayGio();
    let daChep = 0;

    // CHÉP TRONG PHẠM VI CỦA CHÍNH CƠ SỞ ẤY.
    //
    // Nguồn lấy qua `thucDonCua` nên nếu tuần trước cơ sở chưa soạn riêng, nó
    // chép bản dùng chung sang — đúng ý "tuần này giống tuần trước". Đích thì
    // chỉ nhìn dòng RIÊNG: một ngày mới có bản dùng chung mà cơ sở chưa soạn
    // riêng vẫn là "còn trống" với cơ sở đó.
    db.tx(() => {
      const dsNguon = new Map(thucDonCua(campusId, nguon, congNgay(nguon, 4)).map(m => [m.date, m]));
      for (let d = 0; d < 5; d++) {
        const ngayNguon = congNgay(nguon, d);
        const ngayDich = congNgay(dich, d);
        const mNguon = dsNguon.get(ngayNguon);
        if (!mNguon) continue;
        if (campusId) {
          const co = db.first('menu_campus',
            'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, ngayDich]);
          if (co) continue;
          db.insert('menu_campus', {
            campusId, date: ngayDich, meals: mNguon.meals,
            nguoiDang: req.user.id, capNhatLuc: luc,
          });
        } else {
          const mDich = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngayDich]);
          if (mDich) continue; // ngày đã soạn thì giữ nguyên
          db.insert('menus', { id: db.nextId('menu'), date: ngayDich, meals: mNguon.meals });
        }
        daChep++;
      }
    });
    db.audit(req.user.id, 'menu-copy-week', String(week), { daChep, campusId });
    res.json({ daChep, campusId: campusId || null });
  });
  // =========================================================================
  // TỆP THỰC ĐƠN CẢ TUẦN (Đ160 — TD-04)
  // =========================================================================
  //
  // KÈM THÊM, KHÔNG THAY THẾ bảng thực đơn đã gõ. Xem chú thích dài ở
  // `lib/schema.sql` chỗ khai bảng `menu_tep`.

  app.post('/api/menu/tep', requireRole('admin'), (req, res) => {
    const b = req.body || {};
    const quyen = coSoDuocGhi(req.user, String(b.campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId || '';

    const tuNgay = String(b.tuNgay || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) {
      return res.status(400).json({ error: 'Tuần chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    }
    // ĐƯA VỀ ĐÚNG THỨ HAI. Màn hình gửi mốc đầu tuần, nhưng một bản giao diện
    // cũ (hoặc một lời gọi tay) có thể gửi giữa tuần — và khi ấy tệp sẽ nằm ở
    // một "tuần" không màn nào hỏi tới, tức là tải lên xong rồi biến mất.
    const thuHai = congNgay(tuNgay, -lechThuHai(tuNgay));

    const dangCo = db.count(
      'SELECT COUNT(*) FROM menu_tep WHERE tuNgay = ? AND campusId = ?', [thuHai, campusId]);
    if (dangCo >= TOI_DA_TEP_TUAN) {
      return res.status(400).json({
        error: `Mỗi tuần treo tối đa ${TOI_DA_TEP_TUAN} tệp. Xoá bớt tệp cũ rồi tải lại nhé.`,
      });
    }

    const dataUrl = String(b.dataUrl || '');
    if (!dataUrl.startsWith('data:')) return res.status(400).json({ error: 'Chưa chọn tệp nào' });

    // HAI KHO KHÁC NHAU, CHỌN THEO BYTE ĐẦU TỆP chứ không theo lời khai của
    // trình duyệt: ảnh đi kho ảnh (`saveDataUrl`), PDF/Word đi kho tài liệu
    // (`saveTaiLieuDataUrl`). Thử kho tài liệu trước vì nó kén hơn.
    let luu = null;
    let loai = '';
    try {
      const r = uploads.saveTaiLieuDataUrl(dataUrl);
      luu = r;
      loai = r.ext;
    } catch (_) {
      try {
        const r = uploads.saveDataUrl(dataUrl);
        luu = r;
        loai = 'anh';
      } catch (err) {
        return res.status(400).json({
          // Từ Đ226 (góp ý 06/10, mục 3) Excel có đường riêng: tải tệp mẫu rồi
          // nạp lại. Ô dán bảng đã gỡ ở Đ231 (chủ dự án chốt 07/10).
          error: 'Tệp này app chưa nhận được. Nhận ảnh chụp, PDF hoặc Word; '
            + 'còn tệp Excel thì dùng nút "Nạp tệp Excel đã điền" (tải tệp mẫu ở cùng chỗ) — '
            + 'app đọc từng món để gia đình xem thực đơn theo từng ngày.',
        });
      }
    }
    if (!LOAI_TEP.includes(loai)) {
      try { if (loai === 'anh') uploads.remove(luu.file); else uploads.removeTaiLieu(luu.file); } catch (_) { /* dọn là việc phụ */ }
      return res.status(400).json({ error: 'Loại tệp này app chưa nhận được' });
    }

    const rec = {
      id: db.nextId('mtep'),
      tuNgay: thuHai,
      campusId,
      file: luu.file,
      tenGoc: String(b.ten || '').trim().slice(0, TOI_DA_TEN_TEP) || `Thực đơn tuần ${thuHai}`,
      bytes: Number(luu.bytes) || 0,
      loai,
      nguoiTai: req.user.id,
      taoLuc: new Date().toISOString(),
    };
    db.insert('menu_tep', rec);
    db.audit(req.user.id, 'menu-tep-them', rec.id, { tuNgay: thuHai, campusId, loai });
    res.status(201).json({ ok: true, tep: tepCuaTuan(thuHai, campusId) });
  });

  app.delete('/api/menu/tep/:id', requireRole('admin'), (req, res) => {
    const t = db.first('menu_tep', 'SELECT * FROM menu_tep WHERE id = ?', [String(req.params.id || '')]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp này' });
    const quyen = coSoDuocGhi(req.user, t.campusId || '');
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    // Cấp 3 khoá vào cơ sở thì `coSoDuocGhi` trả đúng cơ sở ấy; tệp của cả
    // trường (campusId rỗng) KHÔNG phải của họ, và họ cũng không treo được.
    if ((quyen.campusId || '') !== (t.campusId || '')) {
      return res.status(403).json({ error: 'Tệp này thuộc phạm vi khác' });
    }
    db.remove('menu_tep', t.id);
    try {
      if (t.loai === 'anh') uploads.remove(t.file);
      else uploads.removeTaiLieu(t.file);
    } catch (_) { /* tệp đã mất thì thôi */ }
    db.audit(req.user.id, 'menu-tep-xoa', t.id, { tuNgay: t.tuNgay, campusId: t.campusId });
    res.json({ ok: true, tep: tepCuaTuan(t.tuNgay, t.campusId || '') });
  });

  // Tải một tệp. ĐI QUA CANH QUYỀN, không phục vụ tĩnh.
  app.get('/api/menu/tep/:id', (req, res) => {
    const t = db.first('menu_tep', 'SELECT * FROM menu_tep WHERE id = ?', [String(req.params.id || '')]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp này' });
    if (!xemDuocTepCoSo(req.user, t.campusId || '')) {
      return res.status(403).json({ error: 'Thực đơn này thuộc cơ sở khác' });
    }
    const duong = t.loai === 'anh' ? uploads.pathOf(t.file) : uploads.pathOfTaiLieu(t.file);
    const con = t.loai === 'anh' ? uploads.exists(t.file) : uploads.existsTaiLieu(t.file);
    if (!duong || !con) return res.status(404).json({ error: 'Tệp không còn trên máy chủ' });
    res.setHeader('Content-Type', t.loai === 'anh' ? uploads.mimeOf(t.file) : uploads.mimeOfTaiLieu(t.file));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(t.tenGoc)}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });
};
