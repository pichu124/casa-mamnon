// NHẬT KÝ NGÀY — ăn, ngủ, vệ sinh, thay bỉm, bú bình.
//
// Đây là trang sổ giấy mà gia đình đọc mỗi chiều. Mục tiêu số một của cả app
// là thay được quyển sổ đó, nên phân hệ này là phân hệ quyết định.
//
// HAI ĐIỀU QUYẾT ĐỊNH CÔ CÓ DÙNG HAY KHÔNG
//
// 1. GHI CẢ NHÓM MỘT LƯỢT. Cô có 20 bé và khoảng 10 phút cuối giờ. Bắt cô mở
//    20 màn hình rồi bấm lưu 20 lần là bảo đảm cô quay lại quyển sổ giấy —
//    ở đó cô viết một dòng "cả lớp ngủ 11h30–14h" là xong. Nên đường ghi nhận
//    MỘT MẢNG bản ghi và lưu trong một giao dịch.
//
// 2. KHÔNG BẮT ĐIỀN ĐỦ. Ô nào cô không kịp ghi thì để trống, và trống nghĩa là
//    "cô chưa ghi", không phải "bé không ăn". Máy chủ không bao giờ tự điền
//    thay, và màn hình gia đình phải nói đúng chữ "chưa ghi".
//
// TỪ ĐỢT 2 THEO PHẢN HỒI 07/09: GHI THEO TỪNG BỮA, NGAY LÚC ĂN
//
// Nhà trường: "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm
// một loạt — tách riêng từng bữa theo thực đơn của nhà trường. Hiện tại đang
// chỉ có bữa trưa." Nên có thêm đường `PUT /api/nhatky/bua`: ghi MỘT bữa cho
// cả nhóm, món lấy theo thực đơn NGÀY ĐÓ của bếp cơ sở bé (năm bữa), lưu ở
// bảng phụ `nhatky_bua`. Đường `PUT /api/nhatky` cũ vẫn nguyên — app cũ còn
// trong bộ nhớ điện thoại vẫn dùng — và hai bảng được đồng bộ hai chiều.
//
// QUY TẮC 4 CỦA CLAUDE.md Ở PHÂN HỆ NÀY
//
// Mức ăn ghi theo SUẤT ĂN chứ không theo đứa trẻ: "ăn hết", "khoảng nửa suất",
// "ăn ít". Không quy ra con số nào, không cộng dồn, và không màn hình nào đặt
// các bé cạnh nhau theo mức ăn. Một bé ăn ít ba hôm liền là thông tin cho cô
// và cho gia đình, không phải một chỗ đứng cao thấp so với bạn.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
// Bé nào đang nghỉ có phép hôm nay — xem `lib/nghi-hoc.js` để biết vì sao
// màn này BẮT BUỘC phải hỏi câu đó.
const nghiHoc = require('../../lib/nghi-hoc');
// Báo cho gia đình một bé ngay khi cô ghi xong (Đ137). Không bao giờ ném lỗi.
const tbb = require('../../lib/thong-bao-be');

// Mức ăn hợp lệ. Cố ý là NHÃN CHỮ, không phải số — để là số thì sớm muộn có
// người cộng lại rồi sắp các bé trên dưới nhau.
const MUC_AN = ['het', 'gan-het', 'nua-suat', 'it', 'khong-an'];
const TINH_CHAT = ['binh-thuong', 'hoi-long', 'long', 'tao'];
// Mức ăn viết thành nửa câu cho gia đình đọc (góp ý 16/10, mục 7): "Bữa sáng:
// Bánh bao xá xíu — con ăn hết". Trùng với `CAU_MUC_AN` ở view.js.
const CAU_MUC_AN = {
  het: 'con ăn hết', 'gan-het': 'con ăn gần hết', 'nua-suat': 'con ăn khoảng nửa suất',
  it: 'con ăn ít', 'khong-an': 'con không ăn',
};

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BUA_RE = /^[a-z0-9_-]{1,20}$/;
const TOI_DA_GHI_CHU = 500;
const TOI_DA_SO_LAN = 20;      // trần cho mọi ô đếm — chặn số vô lý gõ nhầm
const TOI_DA_ML = 2000;

function homNay() {
  return ngay.homNay();
}

// Ba bữa của nhật ký ĐỜI CŨ khớp với ba `type` mà màn Thực đơn đang dùng.
// Giữ nguyên: đây là ba cột của `nhatky_ngay`.
const BUA = [['anSang', 'breakfast'], ['anTrua', 'lunch'], ['anXe', 'snack']];
const COT_CUA_BUA = { breakfast: 'anSang', lunch: 'anTrua', snack: 'anXe' };

// NĂM BỮA CỦA TRƯỜNG, đúng thứ tự trong ngày — cùng tên và cùng `type` với
// `BUA_MAU` ở routes/menu.js. Góp ý 16/10, mục 7: nhật ký LUÔN có đủ năm bữa
// này, gọi đúng năm tên này — thực đơn cũ ghi "Bữa xế" hay "Sữa Vinamilk"
// thì vẫn là "Bữa phụ chiều", "Bữa sữa chiều". Thực đơn chỉ quyết định MÓN.
const TEN_BUA = {
  breakfast: 'Bữa sáng',
  snack_sang: 'Bữa phụ sáng',
  lunch: 'Bữa trưa',
  snack: 'Bữa phụ chiều',
  milk: 'Bữa sữa chiều',
};
// Giờ chuẩn của năm bữa, cùng giờ với `BUA_MAU` ở routes/menu.js (chép, không
// gọi sang: gỡ Thực đơn thì Nhật ký vẫn phải chạy). Bữa thực đơn hôm đó không
// có thì mang giờ này, để màn cô tự mở đúng bữa theo giờ. `test/nhat-ky-bua`
// [11] so hai danh sách.
const GIO_BUA = {
  breakfast: '08:00',
  snack_sang: '09:30',
  lunch: '11:20',
  snack: '14:00',
  milk: '15:30',
};

// Các cột của `nhatky_ngay` mà màn hình được ghi. Đường PUT cũ nhận thêm
// `truong: [...]` để chỉ ghi MỘT NHÓM cột (một bước của màn cô) — tên ngoài
// danh sách này thì từ chối.
const TRUONG_NGAY = ['anSang', 'anTrua', 'anXe', 'anGhiChu', 'nguTuLuc', 'nguDenLuc', 'nguGhiChu',
  'veSinhSoLan', 'veSinhTinhChat', 'bimSoLan', 'buBinhSoLan', 'buBinhMl', 'ghiChu'];

// Ba ô CHỈ nhóm nhà trẻ mới có. Tách thành hằng riêng vì đường ghi phải biết
// đích danh ba cột này để KHÔNG ĐỤNG TỚI chúng khi bé không thuộc diện — xem
// chú thích dài ở chỗ dùng.
const O_NHA_TRE = ['bimSoLan', 'buBinhSoLan', 'buBinhMl'];

// KHUNG GIỜ NGỦ TRƯA — cô CHỌN, không gõ.
//
// Nhà trường nói rõ: "thời gian ngủ từ 12h đến 2h chiều, lựa trong khung đó sao
// cho giáo viên chọn tiện nhất". Hai ô nhập giờ tự do bắt cô gõ bốn chữ số hai
// lần cho mỗi bé — với nhóm 20 bé là 160 lần gõ mỗi ngày.
//
// Khung rộng hơn 12h–14h một chút ở hai đầu: bé ngủ sớm hay dậy muộn là chuyện
// thường, và ô chọn thiếu mất giờ cô cần là cô lại quay về gõ tay.
const GIO_NGU = [];
for (let phut = 10 * 60 + 30; phut <= 15 * 60 + 30; phut += 15) {
  GIO_NGU.push(`${String(Math.floor(phut / 60)).padStart(2, '0')}:${String(phut % 60).padStart(2, '0')}`);
}

// Bé này có cần ghi thay bỉm và bú bình không.
//
// Quyết định theo NGÀY SINH, không theo tên nhóm: trường nhận bé từ 12 tháng,
// và một bé 20 tháng có thể đang học nhóm mà phần lớn các bạn đã 3 tuổi. Đi
// theo tên nhóm là bỏ sót đúng bé cần nhất.
//
// Mốc 36 tháng là mốc trường dùng để tách nhà trẻ với mẫu giáo. Bé quanh mốc
// đó thì cô vẫn ghi được — ô hiện ra, cô để trống nếu không cần.
// Bé có thuộc lứa nhà trẻ (dưới 36 tháng) VÀO MỘT NGÀY CỤ THỂ không.
//
// `tinhDenNgay` mặc định là hôm nay — đúng cho màn hình đang ghi hôm nay.
// Nhưng đường SỬA nhật ký của một NGÀY CŨ phải hỏi theo đúng ngày đó: bé vừa
// qua mốc 36 tháng tuần này mà cô mở lại nhật ký tháng trước để sửa một chữ,
// hỏi theo hôm nay là số thay bỉm / bú bình đã ghi của ngày cũ bị xoá âm thầm.
function laNhaTre(dob, tinhDenNgay) {
  if (!NGAY_RE.test(String(dob || ''))) return false;
  const sinh = new Date(`${dob}T00:00:00Z`);
  const moc = NGAY_RE.test(String(tinhDenNgay || ''))
    ? new Date(`${tinhDenNgay}T00:00:00Z`)
    : new Date();
  if (Number.isNaN(sinh.getTime()) || Number.isNaN(moc.getTime()) || sinh > moc) return false;
  let thang = (moc.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (moc.getUTCMonth() - sinh.getUTCMonth());
  if (moc.getUTCDate() < sinh.getUTCDate()) thang -= 1;
  return thang < 36;
}

// LỜI KHAI CỦA NHÓM THẮNG NGÀY SINH (Đ193, việc 7).
//
// Nhà trường chốt (A4) nhật ký cắt theo NHÓM LỚP. `laNhaTre` ở trên vẫn giữ
// nguyên và vẫn là luật chạy khi trường CHƯA khai nhóm — xem `lib/lua-tuoi-nhom.js`
// để biết vì sao hai câu hỏi ấy khác nhau và vì sao phải giữ cả hai.
const luaNhom = require('../../lib/lua-tuoi-nhom');

module.exports = (app, { db, modules }) => {
  // Bé này có sổ nhà trẻ không — hỏi nhóm trước, ngày sinh sau.
  //
  // Mọi chỗ trong tệp này hỏi câu ấy đều đi qua đây, không chỗ nào gọi thẳng
  // `laNhaTre` nữa. Một câu hỏi một chỗ trả lời, nếu không thì đổi luật xong
  // sẽ còn đúng một chỗ nói theo luật cũ, và chỗ ấy là chỗ không ai soi.
  function coSoNhaTre(be, tinhDenNgay) {
    return luaNhom.coSoNhaTre(db, be && be.classId, laNhaTre(be && be.dob, tinhDenNgay));
  }

  // ===========================================================================
  // LƯU LÀ NHÁP, GỬI MỚI THẤY (góp ý 06/10, mục 9 — chủ dự án chốt 06/10)
  // ===========================================================================
  //
  // Trường: *"sau mỗi hành động cập nhật thông tin về ăn, ngủ, vệ sinh, thay
  // bỉm…, giáo viên đều bấm nút gửi tới phụ huynh"* và *"yêu cầu phải check kỹ
  // làm theo nhóm trước khi gửi cho PH"*. Trước đợt này lưu là gia đình thấy
  // ngay và điện thoại rung ngay — cú "áp cả nhóm" chạm nhầm là hai mươi nhà
  // đọc sai trước khi cô kịp sửa.
  //
  // Nay: LƯU = NHÁP CỦA CÔ (không báo ai). GỬI = chụp lại ĐÚNG PHẦN ấy (ăn
  // uống / nghỉ trưa / vệ sinh) của từng bé đã chọn vào `nhatky_gui`, rồi mới
  // báo gia đình. Gia đình đọc ẢNH CHỤP, không đọc bản nháp — cô sửa sau khi
  // gửi thì gia đình vẫn thấy bản đã gửi cho tới lần gửi sau.
  //
  // NGÀY ĐÃ CÓ TRƯỚC MỐC ĐỔI LUẬT vẫn hiện như cũ với gia đình (Nguyên tắc số 1,
  // vế 3): lúc khởi động, mọi ngày có dòng ghi trước mốc được đánh dấu `cu`.
  const PHAN_GUI = ['an', 'ngu', 'vesinh'];
  const TEN_PHAN = { an: 'Ăn uống', ngu: 'Nghỉ trưa', vesinh: 'Vệ sinh' };
  let MOC_GUI = '';
  try {
    const r = db.first('settings', 'SELECT value FROM settings WHERE key = ?', ['nhatky']);
    const v = (r && r.value && typeof r.value === 'object') ? r.value : {};
    const lanDau = !v.guiTuLuc;
    MOC_GUI = v.guiTuLuc || new Date().toISOString();
    // Lần khởi động ĐẦU TIÊN sau khi đổi luật: MỌI ngày đang có đều là ngày
    // cũ, kể cả dòng mang giờ ghi muộn hơn lúc này (dữ liệu mẫu ghi sẵn
    // 16:10 hôm nay). Những lần sau chỉ đánh dấu dòng ghi trước mốc.
    db.run(`INSERT OR IGNORE INTO nhatky_gui (studentId, ngay, phan, banGui, guiLuc)
            SELECT studentId, ngay, 'cu', '', ? FROM nhatky_ngay
             WHERE ? OR capNhatLuc IS NULL OR capNhatLuc = '' OR capNhatLuc < ?`, [MOC_GUI, lanDau ? 1 : 0, MOC_GUI]);
    if (lanDau) db.upsert('settings', { key: 'nhatky', value: { ...v, guiTuLuc: MOC_GUI } }, ['key']);
  } catch (_) { MOC_GUI = ''; /* chưa đặt được mốc: gia đình đọc như cũ — mặc định mở */ }

  function suKienCua(studentId, ngayXem) {
    try {
      return db.all('nhatky_vesinh',
        'SELECT * FROM nhatky_vesinh WHERE studentId = ? AND ngay = ? ORDER BY luc, taoLuc', [studentId, ngayXem])
        .map(e => ({ id: e.id, luc: e.luc, loai: e.loai, coPoo: !!e.coPoo, tinhChat: e.tinhChat || '', ghiChu: e.ghiChu || '' }));
    } catch (_) { return []; }
  }

  // Ảnh chụp MỘT phần của một bé một ngày — đúng hình dạng màn gia đình đọc.
  // Không mang dấu thời gian hay người ghi, để so "đã đổi từ lần gửi trước
  // chưa" bằng chuỗi JSON là đủ.
  function chupPhan(phan, hang, theoBua, dsBua, suKien) {
    const h = hang || {};
    const so = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    if (phan === 'an') {
      // Bú bình đi cùng phần ĂN UỐNG. Màn cô đã bỏ bước Bú bình (góp ý 16/10,
      // mục 7) nhưng cột và đường ghi cũ vẫn còn, nên số đã ghi vẫn được chụp
      // — gia đình chỉ thấy dòng Bú bình ở ngày có số.
      return {
        buaAn: ghepBua(dsBua, hang, theoBua)
          .map(b => ({ bua: b.bua, ten: b.ten, gio: b.gio, mon: b.mon, muc: b.muc, ghiChu: b.ghiChu })),
        anGhiChu: h.anGhiChu || '', ghiChu: h.ghiChu || '',
        buBinhSoLan: so(h.buBinhSoLan), buBinhMl: so(h.buBinhMl),
      };
    }
    if (phan === 'ngu') return { nguTuLuc: h.nguTuLuc || '', nguDenLuc: h.nguDenLuc || '', nguGhiChu: h.nguGhiChu || '' };
    return {
      veSinhSoLan: so(h.veSinhSoLan), veSinhTinhChat: h.veSinhTinhChat || '', bimSoLan: so(h.bimSoLan),
      suKien: (suKien || []).map(({ luc, loai, coPoo, tinhChat, ghiChu }) => ({ luc, loai, coPoo, tinhChat, ghiChu })),
    };
  }
  function coNoiDung(phan, s) {
    if (!s) return false;
    const coSo = (v) => v !== null && v !== undefined;
    if (phan === 'an') {
      return s.buaAn.some(b => b.muc || b.ghiChu) || !!s.anGhiChu || !!s.ghiChu
        || coSo(s.buBinhSoLan) || coSo(s.buBinhMl);
    }
    if (phan === 'ngu') return !!(s.nguTuLuc || s.nguDenLuc || s.nguGhiChu);
    return coSo(s.veSinhSoLan) || coSo(s.bimSoLan) || !!s.veSinhTinhChat || s.suKien.length > 0;
  }
  // Một dòng tóm tắt cho tin báo — gia đình đọc được ngay trên màn khoá.
  function tomTat(phan, s) {
    if (phan === 'an') {
      // "Bữa sáng — con ăn hết · Bữa trưa — con ăn ít", KHÔNG kèm món: tin bị
      // cắt ở 160 ký tự, và một ngày đủ năm bữa với bữa trưa sáu món thì kèm
      // món là cắt giữa chữ, mất bữa cuối. Món gia đình đọc ở màn Nhật ký.
      const ds = s.buaAn.filter(b => b.muc).map(b => `${b.ten} — ${CAU_MUC_AN[b.muc] || ''}`);
      if (s.buBinhSoLan !== null && s.buBinhSoLan !== undefined) {
        ds.push(`Bú bình ${s.buBinhSoLan} lần${s.buBinhMl ? ` (${s.buBinhMl} ml)` : ''}`);
      }
      if (!ds.length) return (s.ghiChu || s.anGhiChu || 'Mở Nhật ký ngày để xem.').slice(0, 160);
      const du = ds.join(' · ');
      if (du.length <= 160) return du;
      // Vẫn quá dài (năm bữa "khoảng nửa suất") thì dừng ở ranh giới một bữa.
      const giu = [];
      for (const x of ds) {
        if ([...giu, x, '…'].join(' · ').length > 160) break;
        giu.push(x);
      }
      return [...giu, '…'].join(' · ');
    }
    if (phan === 'ngu') {
      return (s.nguTuLuc && s.nguDenLuc ? `Ngủ ${s.nguTuLuc} – ${s.nguDenLuc}` : (s.nguGhiChu || 'Mở Nhật ký ngày để xem.')).slice(0, 160);
    }
    const bim = s.suKien.filter(e => e.loai === 'thay-bim').map(e => e.luc);
    const vs = s.suKien.filter(e => e.loai === 'di-ve-sinh').map(e => e.luc);
    const ra = [];
    if (bim.length) ra.push(`Thay bỉm ${bim.length} lần (${bim.join(', ')})`);
    else if (s.bimSoLan !== null) ra.push(`Thay bỉm ${s.bimSoLan} lần`);
    if (vs.length) ra.push(`Đi vệ sinh ${vs.length} lần (${vs.join(', ')})`);
    else if (s.veSinhSoLan !== null) ra.push(`Đi vệ sinh ${s.veSinhSoLan} lần`);
    return (ra.join(' · ') || 'Mở Nhật ký ngày để xem.').slice(0, 160);
  }
  // Làm sạch một bản ghi người dùng gửi lên.
  //
  // Trả về { loi } nếu có gì không hợp lệ. Từ chối chứ không tự sửa: một ô số
  // lần vệ sinh gõ nhầm thành 200 mà máy tự cắt về 20 thì gia đình đọc được
  // một con số không ai từng gõ.
  function lamSach(x) {
    const ra = {};
    for (const k of ['anSang', 'anTrua', 'anXe']) {
      const v = String(x[k] || '').trim();
      if (v && !MUC_AN.includes(v)) return { loi: `Mức ăn "${v}" không hợp lệ` };
      ra[k] = v;
    }
    // Vẫn nhận MỌI giờ hợp lệ, không chỉ giờ trong khung chọn sẵn.
    //
    // Khung GIO_NGU là thứ giúp cô bấm nhanh, không phải hàng rào. Bé ngủ 09:50
    // vì sáng đó mệt là chuyện có thật, và app từ chối ghi điều đã xảy ra thì
    // cô quay lại quyển sổ giấy — ở đó cô viết được mọi thứ.
    for (const k of ['nguTuLuc', 'nguDenLuc']) {
      const v = String(x[k] || '').trim();
      if (v && !GIO_RE.test(v)) return { loi: 'Giờ ngủ phải có dạng 11:30' };
      ra[k] = v;
    }
    if (ra.nguTuLuc && ra.nguDenLuc && ra.nguDenLuc <= ra.nguTuLuc) {
      return { loi: 'Giờ dậy phải sau giờ ngủ' };
    }
    const tc = String(x.veSinhTinhChat || '').trim();
    if (tc && !TINH_CHAT.includes(tc)) return { loi: 'Tình trạng vệ sinh không hợp lệ' };
    ra.veSinhTinhChat = tc;

    for (const [k, tran] of [['veSinhSoLan', TOI_DA_SO_LAN], ['bimSoLan', TOI_DA_SO_LAN],
      ['buBinhSoLan', TOI_DA_SO_LAN], ['buBinhMl', TOI_DA_ML]]) {
      // Trống khác 0. "Cô chưa ghi" khác "không lần nào".
      if (x[k] === undefined || x[k] === null || x[k] === '') { ra[k] = null; continue; }
      const n = Number(x[k]);
      if (!Number.isInteger(n) || n < 0 || n > tran) {
        return { loi: `Con số ở ô "${k}" chưa hợp lệ (0 đến ${tran})` };
      }
      ra[k] = n;
    }
    for (const k of ['anGhiChu', 'nguGhiChu', 'ghiChu']) {
      ra[k] = String(x[k] || '').trim().slice(0, TOI_DA_GHI_CHU);
    }
    return ra;
  }

  function keml(be, hang, nghi, ngayXem) {
    return {
      studentId: be.id,
      hoTen: be.name,
      avatar: be.avatar,
      // Tính theo NGÀY ĐANG XEM: PUT đã giữ số thay bỉm của ngày cũ (Đ118g),
      // nhưng màn cô chỉ VẼ ba ô nhà trẻ khi cờ này bật — cờ tính theo hôm
      // nay thì bé vừa qua 36 tháng mở nhật ký tuần trước ra không thấy ô,
      // sửa một chữ ghi chú rồi bấm Lưu là số cũ bay theo đường khác.
      laNhaTre: coSoNhaTre(be, ngayXem),
      // HÔM NAY BÉ CÓ Ở LỚP KHÔNG.
      //
      // Trước đợt này màn hình không hề biết, nên bé nghỉ có phép nằm lẫn giữa
      // các bạn còn lại và ăn trọn một cú "áp cả nhóm": gia đình đọc được
      // "ăn hết bát cơm, ngủ 11h30–14h" về đúng ngày con nằm nhà. Xem chú
      // thích dài ở `lib/nghi-hoc.js`.
      //
      // `null` = bé đi học bình thường. Màn hình phân biệt được "bé nghỉ" với
      // "cô chưa ghi", hai chuyện khác hẳn nhau.
      nghiPhep: nghi || null,
      ...(hang || {}),
      // `daGhi` để màn hình phân biệt "cô chưa mở tới bé này" với "cô đã ghi
      // và hôm nay bé không ăn gì". Hai chuyện khác hẳn nhau.
      daGhi: !!hang,
    };
  }

  // Ghép TỪNG BỮA của một bé trong một ngày: danh sách bữa của ngày đó (theo
  // thực đơn) × dòng đã ghi ở `nhatky_bua`.
  //
  // Bữa nào chưa có dòng riêng thì nhìn sang cột cũ của `nhatky_ngay` (ba bữa
  // sáng / trưa / xế) — dữ liệu ghi bằng app đời cũ, hay dữ liệu mẫu, vẫn hiện
  // đúng chỗ. Không có gì cả thì `muc` rỗng = "cô chưa ghi".
  function ghepBua(dsBua, hang, theoBua) {
    return dsBua.map(b => {
      const r = theoBua && theoBua.get(b.bua);
      const cot = COT_CUA_BUA[b.bua];
      return {
        ...b,
        muc: r ? r.muc : ((cot && hang && hang[cot]) || ''),
        ghiChu: r ? r.ghiChu : '',
        capNhatLuc: r ? (r.capNhatLuc || '') : '',
        nguoiGhi: r ? r.nguoiGhi : null,
      };
    });
  }

  // Đọc nhật ký.
  //
  //   ?classId=&ngay=      cô xem cả nhóm một ngày
  //   ?studentId=&tu=&den= gia đình xem con mình một khoảng ngày
  app.get('/api/nhatky', (req, res) => {
    const { classId, studentId } = req.query;
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();

    if (studentId) {
      if (!db.canAccessStudent(req.user, studentId)) {
        return res.status(403).json({ error: 'Không có quyền xem nhật ký của bé này' });
      }
      const be = db.findStudent(studentId);
      if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
      const tu = NGAY_RE.test(String(req.query.tu || '')) ? req.query.tu : ngay;
      const den = NGAY_RE.test(String(req.query.den || '')) ? req.query.den : ngay;
      const rows = db.all('nhatky_ngay',
        'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay BETWEEN ? AND ? ORDER BY ngay DESC',
        [studentId, tu, den]);
      // Gia đình cũng thấy hôm đó trường cho ăn món gì — ngay cạnh dòng bé ăn
      // được bao nhiêu. Không có phần này thì cô phải gõ lại tên món vào ô ghi
      // chú cho từng bé, đúng thứ nhà trường bảo là mất công.
      // Cơ sở suy từ NHÓM BÉ ĐANG HỌC, không hỏi người đang xem: mẹ bé có thể
      // có hai con ở hai cơ sở, nên câu hỏi đúng luôn là "bé này ăn bếp nào".
      const campusId = db.campusOfClass(be.classId);
      const banGhi = thucDonKhoang(tu, den, campusId);
      // Từng bữa đã ghi trong khoảng, gom theo ngày.
      const buaTheoNgay = new Map();
      for (const r of db.all('nhatky_bua',
        'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay BETWEEN ? AND ?', [studentId, tu, den])) {
        if (!buaTheoNgay.has(r.ngay)) buaTheoNgay.set(r.ngay, new Map());
        buaTheoNgay.get(r.ngay).set(r.bua, r);
      }
      const banSong = rows.map(r => ({
        ...r,
        nguoiGhiTen: tenNguoiGhi(r.nguoiGhi),
        thucDon: banGhi.has(r.ngay) ? gomBua(banGhi.get(r.ngay)) : null,
        // NĂM BỮA CỦA TRƯỜNG, kèm món theo thực đơn ngày đó và mức bé ăn — gia
        // đình đọc "Bữa sáng: Bánh bao xá xíu — con ăn hết" thành một dòng.
        buaAn: ghepBua(danhSachBua(banGhi.get(r.ngay) || null), r, buaTheoNgay.get(r.ngay)),
        suKien: suKienCua(studentId, r.ngay),
      }));
      // GIA ĐÌNH CHỈ ĐỌC PHẦN CÔ ĐÃ GỬI (góp ý 06/10, mục 9). Cô và văn phòng
      // xem từng bé thì vẫn thấy bản đang ghi.
      if (req.user.role === 'parent') {
        const gui = new Map();
        try {
          for (const g of db.all('nhatky_gui',
            'SELECT * FROM nhatky_gui WHERE studentId = ? AND ngay BETWEEN ? AND ?', [studentId, tu, den])) {
            if (!gui.has(g.ngay)) gui.set(g.ngay, {});
            gui.get(g.ngay)[g.phan] = g;
          }
        } catch (_) { /* chưa có bảng gửi: đọc như cũ */ }
        const cuTheoNgay = new Map(banSong.map(n => [n.ngay, n]));
        const ngayDoc = new Set([...cuTheoNgay.keys(), ...gui.keys()]);
        const ra = [];
        for (const ng of [...ngayDoc].sort().reverse()) {
          const g = gui.get(ng) || {};
          const song = cuTheoNgay.get(ng);
          // Ngày có từ trước mốc đổi luật (hoặc chưa đặt được mốc): đọc như cũ.
          const laCu = !!g.cu || (!MOC_GUI && song)
            || (song && !PHAN_GUI.some(ph => g[ph]) && (!song.capNhatLuc || song.capNhatLuc < MOC_GUI));
          if (laCu) { if (song) ra.push(song); continue; }
          if (!PHAN_GUI.some(ph => g[ph])) continue;   // cô chưa gửi phần nào của ngày này
          const n = { ngay: ng, nguoiGhiTen: '', thucDon: song ? song.thucDon : null, buaAn: [], suKien: [],
            daGui: Object.fromEntries(PHAN_GUI.filter(ph => g[ph]).map(ph => [ph, g[ph].guiLuc])) };
          for (const ph of PHAN_GUI) {
            if (!g[ph]) continue;
            let snap = null;
            try { snap = JSON.parse(g[ph].banGui || 'null'); } catch (_) { snap = null; }
            if (!snap) continue;
            Object.assign(n, snap);
            if (!n.nguoiGhiTen) n.nguoiGhiTen = tenNguoiGhi(g[ph].nguoiGui);
          }
          ra.push(n);
        }
        return res.json({ be: { id: be.id, hoTen: be.name, laNhaTre: coSoNhaTre(be, tu) }, ngayCo: ra });
      }
      return res.json({
        // Khoảng nhiều ngày: bé là nhà trẻ ở ĐẦU khoảng thì phần thay bỉm /
        // bú bình của những ngày đó vẫn phải hiện với gia đình.
        be: { id: be.id, hoTen: be.name, laNhaTre: coSoNhaTre(be, tu) },
        ngayCo: banSong,
      });
    }

    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm hoặc chọn bé' });

    // MÀN CẢ NHÓM CHỈ DÀNH CHO CÔ VÀ VĂN PHÒNG — KHÔNG CHO PHỤ HUYNH.
    //
    // `db.canAccessClass` trả true cho phụ huynh với nhóm của con họ, và đúng
    // là như vậy cho thông báo hay album — những thứ vốn dành cho cả nhóm.
    // Nhưng nhật ký ngày thì khác hẳn: nó là chuyện đi vệ sinh, thay bỉm, ăn
    // uống của TỪNG ĐỨA TRẺ. Dùng lại canAccessClass ở đây là mở nguyên trang
    // sổ của 20 bé cho bố mẹ của một bé.
    //
    // Phụ huynh có đường riêng: ?studentId= — và đường đó đi qua
    // db.canAccessStudent, tức chỉ con mình.
    if (req.user.role === 'parent') {
      return res.status(403).json({
        error: 'Gia đình xem nhật ký của con mình, không xem được cả nhóm',
      });
    }
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem nhật ký của nhóm này' });
    }
    const dsBe = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    if (!dsBe.length) return res.json({ ngay, danhSach: [] });

    const dangNghi = nghiHoc.nghiCoPhep(dsBe.map(b => b.id), ngay);

    const marks = dsBe.map(() => '?').join(',');
    const daCo = new Map();
    for (const r of db.all('nhatky_ngay',
      `SELECT * FROM nhatky_ngay WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
      daCo.set(r.studentId, r);
    }
    const buaDaCo = new Map();
    for (const r of db.all('nhatky_bua',
      `SELECT * FROM nhatky_bua WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
      if (!buaDaCo.has(r.studentId)) buaDaCo.set(r.studentId, new Map());
      buaDaCo.get(r.studentId).set(r.bua, r);
    }
    const campusId = db.campusOfClass(classId);
    const banGhiTD = banGhiThucDon(ngay, campusId);
    const dsBua = danhSachBua(banGhiTD);
    // Trạng thái GỬI từng phần của từng bé, và giờ thay bỉm / đi vệ sinh.
    const guiTheoBe = new Map();
    try {
      for (const r of db.all('nhatky_gui',
        `SELECT * FROM nhatky_gui WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
        if (!guiTheoBe.has(r.studentId)) guiTheoBe.set(r.studentId, {});
        guiTheoBe.get(r.studentId)[r.phan] = r;
      }
    } catch (_) { /* bảng chưa có: coi như chưa gửi gì */ }
    const trangThaiGui = (b, sk) => {
      const g = guiTheoBe.get(b.id) || {};
      const ra = {};
      for (const ph of PHAN_GUI) {
        const snap = chupPhan(ph, daCo.get(b.id), buaDaCo.get(b.id), dsBua, sk);
        const co = coNoiDung(ph, snap);
        ra[ph] = {
          guiLuc: g[ph] ? g[ph].guiLuc : null,
          coNoiDung: co,
          // Ngày có từ trước mốc đổi luật: gia đình đã đọc thẳng như cũ, không còn gì "chờ gửi".
          chuaGui: !g.cu && (co ? (!g[ph] || g[ph].banGui !== JSON.stringify(snap)) : !!g[ph]),
          // Đã gửi rồi cô bỏ hết phần đó (ghi nhầm bé, bé nghỉ ở nhà): gia đình
          // vẫn đang đọc bản cũ — gửi lần nữa là GỠ bản ấy (vòng rà Đ232).
          canGo: !g.cu && !co && !!g[ph],
        };
      }
      return ra;
    };
    res.json({
      ngay,
      classId,
      // THỰC ĐƠN CỦA ĐÚNG NGÀY ĐÓ, GỬI KÈM LUÔN.
      //
      // Nhà trường yêu cầu thẳng: "link luôn với thực đơn từng ngày, tránh phải
      // gõ tay lại". Không có phần này thì cô phải nhớ hôm nay ăn món gì rồi tự
      // gõ vào ô ghi chú — vừa mất thời gian, vừa là chỗ hai màn hình của cùng
      // một trường nói hai chuyện khác nhau về cùng một bữa ăn.
      //
      // Chỉ ĐỌC thực đơn, không sửa: thực đơn là của cả trường, do văn phòng
      // soạn. Cô ghi bé ăn được bao nhiêu phần của bữa đó, thế thôi.
      // Vẫn hình dạng đời cũ: phần Thực đơn đang bật mà hôm đó chưa soạn thì ba
      // ô null (không phải lỗi); phần Thực đơn tắt thì cả khối null.
      thucDon: thucDonBat() ? gomBua(banGhiTD) : null,
      // Các bữa của NGÀY ĐÓ (năm bữa của trường, món theo thực đơn bếp cơ sở)
      // — màn cô dựng dải bước từ đây, không tự đoán hôm nay có mấy bữa.
      buaAn: dsBua,
      khungGioNgu: GIO_NGU,
      phanGui: PHAN_GUI.map(ma => ({ ma, ten: TEN_PHAN[ma] })),
      danhSach: dsBe.map(b => {
        const sk = suKienCua(b.id, ngay);
        return {
          ...keml(b, daCo.get(b.id), dangNghi.get(b.id), ngay),
          buaAn: ghepBua(dsBua, daCo.get(b.id), buaDaCo.get(b.id)),
          suKien: sk,
          gui: trangThaiGui(b, sk),
        };
      }),
    });
  });

  // NHẬT KÝ NGÀY CÓ DÙNG VỚI NGƯỜI NÀY KHÔNG.
  //
  // Nhà trường 07/09: "Nhật ký ngày sẽ được tự động bỏ đi với các bạn không
  // phải lớp nhà trẻ." Trang chủ hỏi đường này trước khi vẽ ô (module.json
  // khai `dieuKienHien`), nên cô nhóm Lá không thấy một ô mà cô không dùng.
  //
  // Hỏi ĐÚNG MỘT CÂU với chỗ khác: `coSoNhaTre` — lời khai của nhóm trước,
  // ngày sinh sau (Đ193, việc 8). Trước đợt này đường đây đi thẳng vào
  // `laNhaTre`, nên trường khai nhóm là mẫu giáo mà ô vẫn nằm trên trang chủ
  // của gia đình, hoặc ngược lại — cô thấy ô mà mở ra không có bé nào.
  //   • cô: ít nhất một bé có sổ nhà trẻ trong (các) nhóm cô phụ trách;
  //   • gia đình: ít nhất một con có sổ nhà trẻ;
  //   • văn phòng: luôn hiện — văn phòng nhìn cả trường, có nhóm nhà trẻ.
  // Chỉ ẨN Ô, không chặn API: đường /api/nhatky vẫn trả lời cho mọi người có
  // quyền, để dữ liệu đã ghi không bao giờ thành "không đọc được".
  app.get('/api/nhatky/pham-vi', (req, res) => {
    if (req.user.role === 'admin') return res.json({ hien: true });
    const ds = db.studentsOf(req.user) || [];
    res.json({ hien: ds.some(b => coSoNhaTre(b)) });
  });

  // Một bản ghi thực đơn → đúng ba ô ăn của nhật ký (hình dạng đời cũ, màn gia
  // đình đời cũ còn đọc).
  function gomBua(m) {
    const buaAn = (m && Array.isArray(m.meals)) ? m.meals : [];
    const ra = {};
    for (const [o, kieu] of BUA) {
      const b = buaAn.find(x => x && x.type === kieu);
      ra[o] = b ? { ten: b.label || '', gio: b.time || '', mon: b.items || [] } : null;
    }
    return ra;
  }

  // Một bản ghi thực đơn → DANH SÁCH BỮA của ngày đó.
  //
  // LUÔN đủ năm bữa của trường, đúng thứ tự và đúng tên ở `TEN_BUA` (góp ý
  // 16/10, mục 7) — kể cả hôm bếp chưa soạn, thực đơn thiếu bữa, hay phần Thực
  // đơn đang tắt. Thực đơn chỉ góp MÓN và GIỜ; bữa nó không có thì món rỗng,
  // giờ là giờ chuẩn ở `GIO_BUA`.
  // Bữa lạ khác trong thực đơn hôm đó (vd 'other') nối phía sau, giữ nhãn của
  // thực đơn.
  //
  // Bữa trùng `type` thì giữ bữa đầu: bảng `nhatky_bua` khoá (bé, ngày, bữa)
  // nên hai bữa cùng mã là hai dòng đè nhau.
  function danhSachBua(m) {
    const meals = (m && Array.isArray(m.meals)) ? m.meals : [];
    const theoKieu = new Map();
    for (const x of meals) {
      const kieu = String((x && x.type) || '').trim();
      if (BUA_RE.test(kieu) && !theoKieu.has(kieu)) theoKieu.set(kieu, x);
    }
    const mot = (kieu, x) => ({
      bua: kieu,
      ten: TEN_BUA[kieu] || String((x && x.label) || '').trim() || 'Bữa ăn',
      gio: String((x && x.time) || '').trim() || GIO_BUA[kieu] || '',
      mon: x && Array.isArray(x.items) ? x.items.map(String) : [],
    });
    return [
      ...Object.keys(TEN_BUA).map(kieu => mot(kieu, theoKieu.get(kieu))),
      ...[...theoKieu].filter(([kieu]) => !TEN_BUA[kieu]).map(([kieu, x]) => mot(kieu, x)),
    ];
  }

  // TẮT THỰC ĐƠN LÀ TẮT Ở MỌI MÀN HÌNH, KỂ CẢ MÀN HÌNH NÀY.
  //
  // Quy trình "bỏ một tính năng" của CLAUDE.md hứa rằng tắt trong Quản trị →
  // Tính năng thì nó "biến khỏi màn hình". Nhật ký đọc thẳng bảng `menus` nên
  // nếu không hỏi công tắc, trường tắt Thực đơn xong vẫn thấy thực đơn cũ hiện
  // ra ở đây — vừa sai lời hứa, vừa là dữ liệu không còn ai cập nhật.
  //
  // Trả `null` chứ không phải object rỗng: màn hình cần phân biệt "trường không
  // dùng phần thực đơn" với "hôm đó chưa ai soạn thực đơn".
  function thucDonBat() {
    return !!(modules && typeof modules.dangBat === 'function' && modules.dangBat('thucdon'));
  }

  // THỰC ĐƠN PHẢI LÀ BẾP CỦA CHÍNH CƠ SỞ BÉ ĐANG HỌC.
  //
  // Nhà trường chốt ngày 30/08: ba cơ sở nấu riêng bếp. Đợt Đ91 tách dữ liệu ra
  // bảng phụ `menu_campus`, và luật đọc là: dòng RIÊNG của cơ sở thắng, ngày
  // nào cơ sở chưa soạn riêng thì lấy bản dùng chung ở `menus`.
  //
  // Nhật ký ngày bỏ sót luật đó — nó chỉ đọc `menus`. Hậu quả không hiện ra ở
  // đâu cả: bé ở cơ sở 2 có nhật ký ghi kèm món của một cái bếp khác, mỗi ngày,
  // cho cả nhóm, và gia đình đọc thấy con "ăn hết" một món trường không hề nấu.
  // Đúng chỗ nhà trường muốn khỏi phải gõ tay lại thì lại thành chỗ hai màn
  // hình của cùng một trường nói hai chuyện khác nhau về cùng một bữa ăn.
  //
  // CHÉP LUẬT CHỨ KHÔNG GỌI SANG `routes/menu.js`: phân hệ không được phụ thuộc
  // vào việc tệp lõi ấy còn hay mất. Gỡ Thực đơn đi thì Nhật ký vẫn phải khởi
  // động được — đó là Nguyên tắc số 1.
  //
  // `campusId` rỗng (nhóm chưa gắn cơ sở, hoặc trường một bếp) thì đi đúng
  // đường cũ, không đổi một chữ nào so với trước.
  function banGhiThucDon(ngay, campusId) {
    if (!thucDonBat()) return null;
    const rieng = campusId
      ? db.first('menu_campus',
        'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, ngay])
      : null;
    return rieng || db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngay]) || null;
  }

  // Cả khoảng ngày trong MỘT câu truy vấn — gia đình xem hai tuần một lần mở.
  //
  // Hai câu, không phải một: nạp bản dùng chung trước rồi để bản riêng của bếp
  // GHI ĐÈ lên đúng những ngày cơ sở đã soạn. Ngược thứ tự này là cơ sở đã soạn
  // riêng lại thấy món dùng chung.
  //
  // Trả về BẢN GHI thực đơn theo ngày; người gọi tự chọn `gomBua` (ba ô đời
  // cũ) hay `danhSachBua` (năm bữa).
  function thucDonKhoang(tu, den, campusId) {
    const ra = new Map();
    if (!thucDonBat()) return ra;
    for (const m of db.all('menus',
      'SELECT * FROM menus WHERE date BETWEEN ? AND ?', [tu, den])) {
      ra.set(m.date, m);
    }
    if (campusId) {
      for (const m of db.all('menu_campus',
        'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ?',
        [campusId, tu, den])) {
        ra.set(m.date, m);
      }
    }
    return ra;
  }

  function tenNguoiGhi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // Ghi một bữa vào `nhatky_bua` cho một bé. Trả về true nếu có gì THẬT SỰ đổi
  // — người gọi dùng để biết có đáng báo gia đình không.
  function ghiBua(be, ngay, bua, muc, ghiChu, nguoiGhi, luc) {
    const cu = db.first('nhatky_bua',
      'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay = ? AND bua = ?', [be.id, ngay, bua]);
    if (cu) {
      if (cu.muc === muc && cu.ghiChu === ghiChu) return false;
      db.update('nhatky_bua', cu.id, { muc, ghiChu, nguoiGhi, capNhatLuc: luc });
      return true;
    }
    if (!muc && !ghiChu) return false;   // chưa ghi gì thì không sinh dòng trống
    db.insert('nhatky_bua', {
      id: db.nextId('nkb'), studentId: be.id, ngay, bua, muc, ghiChu, nguoiGhi, capNhatLuc: luc,
    });
    return true;
  }

  // ĐỒNG BỘ NGƯỢC một bữa vào cột cũ của `nhatky_ngay`.
  //
  // Màn gia đình đời cũ đọc ba cột anSang/anTrua/anXe; app đời cũ của cô cũng
  // ghi vào đó. Không đồng bộ thì cùng một bữa trưa có hai câu trả lời tuỳ
  // màn — đúng thứ Nguyên tắc số 1 cấm. Bữa không có cột cũ (phụ sáng, sữa)
  // thì chỉ bảo đảm ngày đó CÓ DÒNG, để màn gia đình đời cũ vẫn thấy ngày đó
  // trong danh sách và trang chủ vẫn đếm "đã ghi nhật ký".
  function dongBoCotCu(be, ngay, bua, muc, nguoiGhi, luc) {
    const cot = COT_CUA_BUA[bua];
    const cu = db.first('nhatky_ngay',
      'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
    const rec = { nguoiGhi, capNhatLuc: luc };
    if (cot) rec[cot] = muc;
    if (cu) {
      if (!cot || cu[cot] === muc) return;   // không có gì mới thì đừng đổi dấu thời gian
      db.update('nhatky_ngay', cu.id, rec);
      return;
    }
    db.insert('nhatky_ngay', { id: db.nextId('nk'), studentId: be.id, ngay, ...rec });
  }

  // Tiêu đề tin báo cho gia đình theo bước cô vừa ghi.
  function tieuDeBuoc(truong, tenBe) {
    const ds = Array.isArray(truong) ? truong : [];
    const chi = (nhom) => ds.length && ds.every(k => nhom.includes(k));
    if (chi(['nguTuLuc', 'nguDenLuc', 'nguGhiChu'])) return `Giấc trưa của ${tenBe} đã được cô ghi`;
    if (chi(['veSinhSoLan', 'veSinhTinhChat', 'bimSoLan', 'buBinhSoLan', 'buBinhMl'])) {
      return `Vệ sinh, bỉm, sữa của ${tenBe} đã được cô ghi`;
    }
    if (chi(['ghiChu', 'anGhiChu'])) return `Cô có lời nhắn về ${tenBe} hôm nay`;
    return `Nhật ký ngày của ${tenBe} đã được cô ghi`;
  }

  // Cô ghi nhật ký — CẢ NHÓM MỘT LƯỢT.
  //
  // Nhận một mảng, lưu trong MỘT giao dịch: nửa chừng lỗi thì không để lại một
  // nhóm ghi được nửa số bé, mà gia đình nửa còn lại thì đọc thấy trống trơn
  // và tưởng con mình bị bỏ quên.
  //
  // `truong: [...]` (tuỳ chọn, từ đợt 2): chỉ ghi các cột được kể tên — một
  // BƯỚC của màn cô (ngủ trưa, vệ sinh · bỉm, ghi chú). Không gửi thì ghi đủ
  // mọi cột như trước, để app đời cũ còn trong bộ nhớ điện thoại vẫn lưu được.
  app.put('/api/nhatky', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = NGAY_RE.test(String((req.body || {}).ngay || '')) ? req.body.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    }
    const ban = (req.body || {}).danhSach;
    if (!Array.isArray(ban) || !ban.length) {
      return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    }
    let truong = null;
    if ((req.body || {}).truong !== undefined) {
      truong = Array.isArray(req.body.truong) ? req.body.truong.map(String) : [];
      if (!truong.length || truong.some(k => !TRUONG_NGAY.includes(k))) {
        return res.status(400).json({ error: 'Bước cần ghi chưa hợp lệ' });
      }
    }

    // Kiểm quyền và kiểm dữ liệu cho TOÀN BỘ danh sách trước khi ghi dòng nào.
    const sach = [];
    for (const x of ban) {
      const be = db.findStudent(x && x.studentId);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi nhật ký cho bé ${be.name}` });
      }
      const s = lamSach(x);
      if (s.loi) return res.status(400).json({ error: `${be.name}: ${s.loi}` });
      // Dấu thời gian bản ghi lúc màn hình NẠP VỀ. `undefined` = app cũ không
      // gửi, khi đó ghi như trước.
      const goc = x && Object.prototype.hasOwnProperty.call(x, 'capNhatLucGoc')
        ? x.capNhatLucGoc : undefined;
      // Ô của nhóm nhà trẻ không nhận cho bé lớn — tránh dữ liệu vô nghĩa lọt
      // vào rồi màn hình gia đình hiện "thay bỉm 3 lần" cho một bé 5 tuổi.
      // Tính tuổi theo NGÀY CỦA BẢN GHI, không theo hôm nay: sửa nhật ký ngày
      // cũ sau khi bé qua mốc 36 tháng không được xoá số đã ghi của ngày đó.
      //
      // KHÔNG NHẬN SỐ MỚI, KHÁC HẲN VỚI GHI ĐÈ NULL LÊN SỐ CŨ.
      //
      // Bản trước gán thẳng `s.bimSoLan = null` rồi để nguyên ba khoá ấy chảy
      // xuống `phan`, nên `db.update` ghi NULL đè lên số đã có. Với luật cũ —
      // cắt theo ngày sinh, tính theo ngày của chính bản ghi — chuyện đó gần
      // như không xảy ra, nên lỗ này nằm im.
      //
      // Nhưng nhà trường vừa chốt (A4, 10/09/2026) cắt theo NHÓM LỚP. Cờ nhóm
      // thì lật được bằng MỘT cú bấm ở màn quản trị, cho CẢ NHÓM, cho MỌI NGÀY
      // CŨ. Lúc ấy chỉ cần một nhóm bị khai nhầm là lần sau cô bấm Lưu sẽ xoá
      // sạch số thay bỉm và bú bình đã ghi của cả nhóm — im lặng, và máy chủ
      // vẫn trả về "Đã lưu". Đó đúng là kiểu mất dữ liệu Nguyên tắc số 1 cấm,
      // cùng họ với lỗi "cô A ghi chồng lên cô B" đã vá bên dưới.
      //
      // Cách vá: XOÁ HẲN ba khoá khỏi `s` thay vì gán null. `db.update` chỉ
      // dựng câu SET từ những khoá CÓ MẶT trong patch (lib/db.js:165-173), nên
      // khoá không có mặt = cột không bị đụng, số cũ còn nguyên.
      const cam = coSoNhaTre(be, ngay) ? [] : O_NHA_TRE;
      for (const k of cam) delete s[k];
      sach.push({ be, s, goc, cam });
    }

    // HAI CÔ CÙNG GHI MỘT NHÓM — NGƯỜI LƯU SAU KHÔNG ĐƯỢC XOÁ NGƯỜI LƯU TRƯỚC.
    //
    // Mô hình mầm non là NHIỀU CÔ MỘT NHÓM (G0.4), và cách chia việc tự nhiên
    // nhất cuối giờ là hai cô cùng mở màn rồi chia nhau ("chị điền phần ăn, em
    // điền phần ngủ"). Màn hình gửi lên MỌI ô của MỌI bé đang có trên màn, mà
    // `lamSach` luôn trả về đủ mọi cột — ô cô không gõ thì thành chuỗi rỗng.
    // Nên trước bản vá này, cô bấm Lưu sau ghi đè trọn bản ghi bằng ảnh chụp
    // màn hình CŨ của mình: phần cô kia vừa ghi biến mất, im lặng, và máy chủ
    // vẫn trả về "Đã lưu".
    //
    // `docs/QUYET-DINH-TU-CHOT.md` mục 24 đã gọi đúng tên kiểu mất dữ liệu này
    // — "lấy bản cũ của cô A ghi chồng lên bản mới của cô B... Đây đúng là kiểu
    // mất dữ liệu mà Nguyên tắc số 1 cấm" — nhưng lúc đó chỉ bịt đường NHÁP.
    // Đường thường, màn hình đang mở, thì vẫn hở.
    //
    // CÁCH VÁ: màn hình gửi kèm `capNhatLucGoc` — dấu thời gian của bản ghi lúc
    // nó NẠP VỀ. Bản trên máy chủ đã đổi từ lúc đó thì bỏ qua ĐÚNG BÉ ĐÓ và nói
    // ra, các bé khác vẫn lưu bình thường. Cô đọc được câu "3 bé chưa lưu vì cô
    // khác vừa ghi" rồi mở lại màn là thấy đủ.
    //
    // KHÔNG gửi trường đó thì ghi như cũ: bản app cũ còn trong bộ nhớ điện
    // thoại vẫn phải lưu được, đúng Nguyên tắc số 1.
    const dangNghiKhiGhi = nghiHoc.nghiCoPhep(sach.map(x => x.be.id), ngay);
    const luc = new Date().toISOString();
    const xungDot = [];
    const daDoi = [];     // bé có gì THẬT SỰ mới — chỉ các bé này được báo gia đình
    let daGhi = 0;
    db.tx(() => {
      for (const { be, s, goc, cam } of sach) {
        const cu = db.first('nhatky_ngay',
          'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
        if (goc !== undefined && cu && String(cu.capNhatLuc || '') !== String(goc || '')) {
          xungDot.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        // Chỉ một bước: lấy đúng các cột của bước đó, phần còn lại giữ nguyên.
        //
        // Lọc luôn ba ô nhà trẻ ra khỏi danh sách cột của bước. Nếu không, màn
        // hình gửi `truong: ['bimSoLan']` cho một bé không thuộc diện là
        // `s.bimSoLan` đã bị xoá ở trên thành `undefined`, rồi `undefined` lại
        // chảy xuống `db.update` và xoá số cũ — đúng cái lỗ vừa bịt, chỉ khác
        // đường vào.
        const cot = truong ? truong.filter(k => !cam.includes(k)) : null;
        const phan = cot ? Object.fromEntries(cot.map(k => [k, s[k]])) : s;
        // So theo CHỮ: null của cột số và '' của cột chữ đều là "chưa ghi".
        const chuan = (v) => (v === null || v === undefined ? '' : String(v));
        const coMoi = !cu || Object.keys(phan).some(k => chuan(cu[k]) !== chuan(phan[k]));
        const rec = { ...phan, studentId: be.id, ngay, nguoiGhi: req.user.id, capNhatLuc: luc };
        if (cu) db.update('nhatky_ngay', cu.id, rec);
        else db.insert('nhatky_ngay', { id: db.nextId('nk'), ...rec });
        // Đồng bộ XUÔI sang bảng từng bữa: ba cột sáng / trưa / xế vừa ghi là ba
        // bữa breakfast / lunch / snack — màn cô đời mới đọc từ đó.
        for (const [cot, kieu] of BUA) {
          if (Object.prototype.hasOwnProperty.call(phan, cot)) {
            ghiBua(be, ngay, kieu, phan[cot] || '', '', req.user.id, luc);
          }
        }
        if (coMoi) daDoi.push(be);
        daGhi += 1;
      }
    });
    // GHI CHO BÉ ĐANG NGHỈ CÓ PHÉP: NÓI RA, KHÔNG CHẶN.
    //
    // Chặn là sai: bé có thể vẫn tới lớp dù nhà đã xin nghỉ, và cô có thể đang
    // sửa lại một dòng ghi nhầm. Đây cùng một lý lẽ với khung giờ ngủ — khung
    // là để bấm nhanh, không phải hàng rào.
    //
    // Nhưng im lặng cũng sai, và sai nặng hơn: cú "áp cả nhóm" điền cho MỌI ô
    // đang hiện, nên bé nghỉ ăn trọn cú đó mà không ai để ý. Nói ra là đủ để cô
    // nhìn lại một giây.
    const nhacNghi = [];
    for (const { be } of sach) {
      const n = dangNghiKhiGhi.get(be.id);
      if (n) nhacNghi.push({ studentId: be.id, hoTen: be.name, lyDo: n.reason });
    }

    // KHÔNG BÁO GIA ĐÌNH Ở ĐÂY NỮA (góp ý 06/10, mục 9). Lưu là nháp của cô;
    // gia đình được báo khi cô bấm Gửi (`POST /api/nhatky/gui`). `daBao` giữ
    // trong câu trả lời (luôn 0) để app đời cũ còn trong máy không vỡ.
    void tieuDeBuoc;

    db.audit(req.user.id, 'nhatky-ghi', null, {
      ngay, soBe: daGhi, xungDot: xungDot.length, nghiPhep: nhacNghi.length,
      ...(truong ? { truong } : {}),
    });
    res.json({
      ok: true,
      ngay,
      daGhi,
      daBao: 0,
      daDoi: daDoi.length,
      xungDot,
      nhacNghi,
      ...(nhacNghi.length ? {
        nhacNghiChu: `${nhacNghi.length} bé đã có đơn nghỉ được duyệt cho hôm nay `
          + `(${nhacNghi.map(x => x.hoTen).join(', ')}). Cô xem lại giúp — `
          + 'gia đình sẽ đọc đúng dòng này về ngày con ở nhà.',
      } : {}),
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì cô khác vừa ghi nhật ký cho các bé đó `
          + 'trong lúc màn hình của cô đang mở. Cô mở lại màn này để thấy phần các cô đã ghi, '
          + 'rồi điền tiếp phần của mình nhé — không mất gì cả.',
      } : {}),
    });
  });

  // CÔ GHI MỘT BỮA CHO CẢ NHÓM — ngay sau bữa đó, không đợi cuối ngày.
  //
  // Thân: { classId, ngay, bua, danhSach: [{ studentId, muc, ghiChu, capNhatLucGoc? }] }
  //
  // Cùng luật với PUT /api/nhatky: kiểm hết rồi mới ghi, một giao dịch, hai cô
  // cùng ghi thì người sau không xoá người trước (so `capNhatLucGoc` với dấu
  // thời gian của ĐÚNG DÒNG BỮA ĐÓ), bé nghỉ có phép thì nhắc chứ không chặn.
  //
  // `bua` phải là một trong năm bữa của trường, hoặc một bữa lạ CÓ TRONG thực
  // đơn ngày đó của bếp cơ sở nhóm (`danhSachBua`). Mã bữa ngoài danh sách đó
  // là ghi vào một thứ không tồn tại, và gia đình đọc thấy con "ăn hết" một
  // bữa không có.
  app.put('/api/nhatky/bua', requireRole('teacher', 'admin'), (req, res) => {
    const body = req.body || {};
    const ngay = NGAY_RE.test(String(body.ngay || '')) ? body.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    }
    const classId = String(body.classId || '');
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (req.user.role === 'parent' || !db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền ghi nhật ký cho nhóm này' });
    }
    const bua = String(body.bua || '').trim();
    const dsBua = danhSachBua(banGhiThucDon(ngay, db.campusOfClass(classId)));
    const buaChon = dsBua.find(b => b.bua === bua);
    if (!buaChon) {
      return res.status(400).json({ error: 'Bữa này không có trong thực đơn của ngày đó' });
    }
    const ban = body.danhSach;
    if (!Array.isArray(ban) || !ban.length) {
      return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    }

    const sach = [];
    for (const x of ban) {
      const be = db.findStudent(x && x.studentId);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (be.classId !== classId || !db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi nhật ký cho bé ${be.name}` });
      }
      const muc = String((x && x.muc) || '').trim();
      if (muc && !MUC_AN.includes(muc)) {
        return res.status(400).json({ error: `${be.name}: mức ăn "${muc}" không hợp lệ` });
      }
      const ghiChu = String((x && x.ghiChu) || '').trim().slice(0, TOI_DA_GHI_CHU);
      const goc = x && Object.prototype.hasOwnProperty.call(x, 'capNhatLucGoc')
        ? x.capNhatLucGoc : undefined;
      sach.push({ be, muc, ghiChu, goc });
    }

    const dangNghiKhiGhi = nghiHoc.nghiCoPhep(sach.map(x => x.be.id), ngay);
    const luc = new Date().toISOString();
    const xungDot = [];
    const daDoi = [];
    let daGhi = 0;
    db.tx(() => {
      for (const { be, muc, ghiChu, goc } of sach) {
        const cu = db.first('nhatky_bua',
          'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay = ? AND bua = ?', [be.id, ngay, bua]);
        if (goc !== undefined && cu && String(cu.capNhatLuc || '') !== String(goc || '')) {
          xungDot.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        if (ghiBua(be, ngay, bua, muc, ghiChu, req.user.id, luc)) {
          dongBoCotCu(be, ngay, bua, muc, req.user.id, luc);
          daDoi.push(be);
        }
        daGhi += 1;
      }
    });

    const nhacNghi = [];
    for (const { be } of sach) {
      const n = dangNghiKhiGhi.get(be.id);
      if (n) nhacNghi.push({ studentId: be.id, hoTen: be.name, lyDo: n.reason });
    }

    // KHÔNG BÁO GIA ĐÌNH Ở ĐÂY NỮA (góp ý 06/10, mục 9) — xem PUT /api/nhatky.

    db.audit(req.user.id, 'nhatky-ghi-bua', null, {
      ngay, bua, soBe: daGhi, xungDot: xungDot.length, nghiPhep: nhacNghi.length,
    });
    res.json({
      ok: true,
      ngay,
      bua,
      daGhi,
      daBao: 0,
      daDoi: daDoi.length,
      xungDot,
      nhacNghi,
      ...(nhacNghi.length ? {
        nhacNghiChu: `${nhacNghi.length} bé đã có đơn nghỉ được duyệt cho hôm nay `
          + `(${nhacNghi.map(x => x.hoTen).join(', ')}). Cô xem lại giúp — `
          + 'gia đình sẽ đọc đúng dòng này về ngày con ở nhà.',
      } : {}),
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì cô khác vừa ghi bữa này cho các bé đó `
          + 'trong lúc màn hình của cô đang mở. Cô mở lại màn này để thấy phần các cô đã ghi, '
          + 'rồi điền tiếp phần của mình nhé — không mất gì cả.',
      } : {}),
    });
  });
  // ===========================================================================
  // GỬI CHO GIA ĐÌNH (góp ý 06/10, mục 9)
  // ===========================================================================
  //
  // Cô chọn MỘT PHẦN (ăn uống / nghỉ trưa / vệ sinh) và các bé, soát lại trên
  // màn rồi bấm Gửi. Mỗi bé: chụp phần đó vào `nhatky_gui`, báo gia đình một
  // tin. Bé chưa ghi gì ở phần đó thì bỏ qua và nói ra; bé đã gửi mà chưa đổi
  // gì từ lần trước thì KHÔNG báo lại — tránh gia đình nhận hai tin y hệt khi
  // cô bấm Gửi cả nhóm lần hai cho một bé vừa sửa.
  app.post('/api/nhatky/gui', requireRole('teacher', 'admin'), (req, res) => {
    const body = req.body || {};
    const ngay = NGAY_RE.test(String(body.ngay || '')) ? body.ngay : homNay();
    if (ngay > homNay()) return res.status(400).json({ error: 'Chưa gửi nhật ký cho ngày chưa tới được' });
    const phan = String(body.phan || '');
    if (!PHAN_GUI.includes(phan)) return res.status(400).json({ error: 'Phần cần gửi chưa hợp lệ' });
    const classId = String(body.classId || '');
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền gửi nhật ký cho nhóm này' });
    }
    const ids = Array.isArray(body.studentIds) ? [...new Set(body.studentIds.map(String))] : [];
    if (!ids.length) return res.status(400).json({ error: 'Cô chưa chọn bé nào để gửi' });
    const dsBe = [];
    for (const id of ids) {
      const be = db.findStudent(id);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (be.classId !== classId || !db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền gửi nhật ký của bé ${be.name}` });
      }
      dsBe.push(be);
    }

    const dsBua = danhSachBua(banGhiThucDon(ngay, db.campusOfClass(classId)));
    const luc = new Date().toISOString();
    const daGui = [];
    const khongDoi = [];
    const chuaGhi = [];
    const daGo = [];
    db.tx(() => {
      for (const be of dsBe) {
        const hang = db.first('nhatky_ngay', 'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
        const theoBua = new Map(db.all('nhatky_bua',
          'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay = ?', [be.id, ngay]).map(r => [r.bua, r]));
        const snap = chupPhan(phan, hang, theoBua, dsBua, suKienCua(be.id, ngay));
        const cu = db.first('nhatky_gui',
          'SELECT * FROM nhatky_gui WHERE studentId = ? AND ngay = ? AND phan = ?', [be.id, ngay, phan]);
        if (!coNoiDung(phan, snap)) {
          // Phần này ĐÃ GỬI mà nay cô bỏ hết: gỡ bản gia đình đang đọc — không
          // thì "ngủ 11:30 – 14:00" của một ngày con ở nhà nằm đó mãi (vòng rà
          // Đ232). Không báo tin: một tin "con không ngủ" còn tệ hơn im lặng.
          if (cu) {
            db.run('DELETE FROM nhatky_gui WHERE studentId = ? AND ngay = ? AND phan = ?', [be.id, ngay, phan]);
            daGo.push({ studentId: be.id, hoTen: be.name });
          } else chuaGhi.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        const banGui = JSON.stringify(snap);
        if (cu && cu.banGui === banGui) { khongDoi.push({ studentId: be.id, hoTen: be.name }); continue; }
        db.run(`INSERT INTO nhatky_gui (studentId, ngay, phan, banGui, guiLuc, nguoiGui) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(studentId, ngay, phan) DO UPDATE SET banGui = excluded.banGui,
                  guiLuc = excluded.guiLuc, nguoiGui = excluded.nguoiGui`,
        [be.id, ngay, phan, banGui, luc, req.user.id]);
        daGui.push({ be, snap, laiLan: !!cu });
      }
    });
    // Báo SAU khi ghi xong cả lô — một bé lỗi giữa chừng thì không gia đình
    // nào nhận tin về một bản chưa được lưu.
    for (const { be, snap, laiLan } of daGui) {
      tbb.gui({
        studentId: be.id,
        loai: 'nhatky',
        tieuDe: `${TEN_PHAN[phan]} của ${be.name}${laiLan ? ' — cô vừa cập nhật' : ''}`,
        noiDung: tomTat(phan, snap),
        hash: '#/nhatky',
        nguoiTao: req.user.id,
      });
    }
    db.audit(req.user.id, 'nhatky-gui', null, {
      classId, ngay, phan, soBe: daGui.length, khongDoi: khongDoi.length, chuaGhi: chuaGhi.length, daGo: daGo.length,
    });
    res.json({
      ok: true, ngay, phan,
      daGui: daGui.length,
      khongDoi,
      chuaGhi,
      daGo,
      ...(chuaGhi.length ? {
        nhac: `${chuaGhi.length} bé chưa có gì ở phần ${TEN_PHAN[phan].toLowerCase()} nên chưa gửi: `
          + `${chuaGhi.map(x => x.hoTen).join(', ')}.`,
      } : {}),
    });
  });

  // ===========================================================================
  // GIỜ THAY BỈM / ĐI VỆ SINH (góp ý 06/10, mục 9)
  // ===========================================================================
  //
  // Trường: *"ghi lại nhật ký cụ thể THỜI GIAN các con thay bỉm hoặc đi vệ
  // sinh (Poo)"*. Mỗi lần là một dòng (giờ, loại, có đi ngoài không). Ghi cho
  // nhiều bé một lúc: cô thay bỉm cả nhóm lúc 10:30 là một lần bấm.
  //
  // SỐ LẦN Ở `nhatky_ngay` CỘNG / TRỪ THEO TỪNG DÒNG, KHÔNG ĐẾM LẠI TỪ ĐẦU.
  // Trang chủ, màn gia đình đời cũ và báo cáo đọc con số đó. Đếm lại từ đầu
  // thì ngày cô đã gõ tay "thay bỉm 3 lần" rồi mới ghi thêm một giờ sẽ thành
  // "1 lần" — mất ba lần đã ghi, đúng kiểu mất dữ liệu Nguyên tắc số 1 cấm.
  const LOAI_VS = ['thay-bim', 'di-ve-sinh'];
  const COT_VS = { 'thay-bim': 'bimSoLan', 'di-ve-sinh': 'veSinhSoLan' };
  const TOI_DA_LAN_NGAY = 30;

  function doiSoLan(be, ngayGhi, loai, buoc, nguoiGhi, luc) {
    const cot = COT_VS[loai];
    if (cot === 'bimSoLan' && !coSoNhaTre(be, ngayGhi)) return;
    const cu = db.first('nhatky_ngay', 'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngayGhi]);
    const dangCo = cu && cu[cot] !== null && cu[cot] !== undefined && cu[cot] !== '' ? Number(cu[cot]) : 0;
    const moi = Math.min(TOI_DA_SO_LAN, Math.max(0, (Number.isFinite(dangCo) ? dangCo : 0) + buoc));
    const rec = { [cot]: moi || null, nguoiGhi, capNhatLuc: luc };
    if (cu) db.update('nhatky_ngay', cu.id, rec);
    else if (buoc > 0) db.insert('nhatky_ngay', { id: db.nextId('nk'), studentId: be.id, ngay: ngayGhi, ...rec });
  }

  app.post('/api/nhatky/ve-sinh', requireRole('teacher', 'admin'), (req, res) => {
    const body = req.body || {};
    const ngay = NGAY_RE.test(String(body.ngay || '')) ? body.ngay : homNay();
    if (ngay > homNay()) return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    const loai = String(body.loai || '');
    if (!LOAI_VS.includes(loai)) return res.status(400).json({ error: 'Chọn thay bỉm hay đi vệ sinh' });
    const lucGio = String(body.luc || '').trim();
    if (!GIO_RE.test(lucGio)) return res.status(400).json({ error: 'Giờ chưa đúng dạng, ví dụ 10:30' });
    const tinhChat = String(body.tinhChat || '').trim();
    if (tinhChat && !TINH_CHAT.includes(tinhChat)) return res.status(400).json({ error: 'Tình trạng chưa hợp lệ' });
    const coPoo = !!body.coPoo;
    const ghiChu = String(body.ghiChu || '').trim().slice(0, TOI_DA_GHI_CHU);
    const ids = Array.isArray(body.studentIds) ? [...new Set(body.studentIds.map(String))] : [];
    if (!ids.length) return res.status(400).json({ error: 'Cô chưa chọn bé nào' });
    const dsBe = [];
    for (const id of ids) {
      const be = db.findStudent(id);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi nhật ký cho bé ${be.name}` });
      }
      dsBe.push(be);
    }
    const luc = new Date().toISOString();
    const daGhi = [];
    const boQua = [];
    db.tx(() => {
      for (const be of dsBe) {
        // Thay bỉm chỉ cho bé có sổ nhà trẻ — cùng một luật với ô số lần bỉm.
        if (loai === 'thay-bim' && !coSoNhaTre(be, ngay)) {
          boQua.push({ studentId: be.id, hoTen: be.name, lyDo: 'không thuộc nhóm nhà trẻ' });
          continue;
        }
        const n = db.first('nhatky_vesinh',
          'SELECT COUNT(*) AS n FROM nhatky_vesinh WHERE studentId = ? AND ngay = ?', [be.id, ngay]).n;
        if (n >= TOI_DA_LAN_NGAY) {
          boQua.push({ studentId: be.id, hoTen: be.name, lyDo: 'đã ghi quá nhiều lần trong ngày' });
          continue;
        }
        db.insert('nhatky_vesinh', {
          id: db.nextId('nkv'), studentId: be.id, ngay, luc: lucGio, loai,
          coPoo: coPoo ? 1 : 0, tinhChat: coPoo ? tinhChat : '', ghiChu, nguoiGhi: req.user.id, taoLuc: luc,
        });
        doiSoLan(be, ngay, loai, +1, req.user.id, luc);
        daGhi.push(be.id);
      }
    });
    // Bé có đơn nghỉ được duyệt hôm nay mà vẫn được ghi (cô bấm "Chọn cả
    // nhóm"): NÓI RA, như hai đường ghi kia — không thì gia đình của bé đang ốm
    // ở nhà nhận "thay bỉm 10:00" (vòng rà Đ232). Ghi vẫn giữ: có thể bé đi học
    // lại giữa buổi, cô là người biết.
    const nghiNay = daGhi.length ? nghiHoc.nghiCoPhep(daGhi, ngay) : new Map();
    const nhacNghi = dsBe.filter(be => daGhi.includes(be.id) && nghiNay.get(be.id))
      .map(be => ({ studentId: be.id, hoTen: be.name, lyDo: nghiNay.get(be.id).reason }));
    db.audit(req.user.id, 'nhatky-ve-sinh', null, { ngay, loai, luc: lucGio, soBe: daGhi.length, nghiPhep: nhacNghi.length });
    res.json({
      ok: true, ngay, daGhi: daGhi.length, boQua,
      nhacNghi,
      ...(nhacNghi.length ? {
        nhacNghiChu: `${nhacNghi.length} bé đã có đơn nghỉ được duyệt cho hôm nay `
          + `(${nhacNghi.map(x => x.hoTen).join(', ')}). Cô xem lại giúp — `
          + 'gia đình sẽ đọc đúng dòng này về ngày con ở nhà.',
      } : {}),
      ...(boQua.length ? { nhac: `Chưa ghi cho ${boQua.map(x => `${x.hoTen} (${x.lyDo})`).join(', ')}.` } : {}),
    });
  });

  app.delete('/api/nhatky/ve-sinh/:id', requireRole('teacher', 'admin'), (req, res) => {
    const e = db.first('nhatky_vesinh', 'SELECT * FROM nhatky_vesinh WHERE id = ?', [String(req.params.id)]);
    if (!e) return res.status(404).json({ error: 'Không tìm thấy lần ghi này' });
    if (!db.canAccessStudent(req.user, e.studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa nhật ký của bé này' });
    }
    const be = db.findStudent(e.studentId);
    const luc = new Date().toISOString();
    db.tx(() => {
      db.run('DELETE FROM nhatky_vesinh WHERE id = ?', [e.id]);
      if (be) doiSoLan(be, e.ngay, e.loai, -1, req.user.id, luc);
    });
    db.audit(req.user.id, 'nhatky-ve-sinh-bo', null, { ngay: e.ngay, loai: e.loai, luc: e.luc });
    res.json({ ok: true });
  });
};
