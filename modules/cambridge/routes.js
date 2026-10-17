// CAMBRIDGE & KẾT NỐI Ở NHÀ — văn phòng đăng, gia đình đọc.
//
// PHÂN HỆ NÀY CHỦ YẾU LÀ MỘT BÀI TOÁN PHẠM VI
//
// Nội dung thì đơn giản: một tiêu đề, một khối chữ, vài tấm ảnh. Chỗ khó là
// AI ĐỌC ĐƯỢC BÀI NÀO — và sai ở đó có hai kiểu, cả hai đều tệ:
//
//   GỬI THIẾU: gia đình nhóm Lá 1 không thấy tờ Home Connection của chính
//   nhóm mình. Họ không biết mình đang thiếu, nên không ai báo, và văn phòng
//   tưởng đã gửi rồi.
//
//   GỬI THỪA: tờ của nhóm Lá 1 hiện cho gia đình nhóm nhà trẻ. Nhìn thì vô
//   hại, nhưng đó là thư rác — và thư rác làm gia đình ngừng đọc MỌI THỨ
//   khác, kể cả thông báo thật sự quan trọng.
//
// Nên phạm vi lọc ở TẦNG DỮ LIỆU, có một hàm duy nhất quyết định, và có bài
// test đi đủ ba mức phạm vi nhân ba loại người đọc.
const { requireRole } = require('../../lib/auth');
// Lứa tuổi của nhóm lớp — nhóm nhà trẻ thì không có Cambridge (Đ193, việc 12).
const luaNhom = require('../../lib/lua-tuoi-nhom');
const ngay = require('../../lib/ngay');
const uploads = require('../../lib/uploads');
const tbb = require('../../lib/thong-bao-be');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// BA TAB, TÊN TIẾNG ANH — nhà trường chốt 10/09/2026 (A25).
//
// *"Đây là chương trình quốc tế nên mình muốn để tên tiếng Anh. Trong mục
// Cambridge và kết nối ở nhà thì tôi đang muốn để 3 tab: Letter for Parent /
// Cambridge Weekly Plan / Home Connection."*
//
// ĐÂY LÀ NGOẠI LỆ CÓ CHỦ Ý so với quy định "giao diện tiếng Việt" của
// CLAUDE.md, và phạm vi ngoại lệ đúng bằng BA NHÃN TAB NÀY — không lan ra chỗ
// khác. Mọi câu hướng dẫn và mọi câu báo lỗi của phân hệ vẫn phải là tiếng
// Việt, vì người đọc chúng là cô và gia đình. Ghi lại ở đây để lần rà sau
// không ai "sửa lại cho đúng CLAUDE.md" rồi làm hỏng ý nhà trường.
//
// MÃ GIỮ NGUYÊN, CHỈ NHÃN ĐỔI. `cambridge` và `ket-noi` là hai mã đã nằm trong
// cơ sở dữ liệu của mọi bài đã đăng; đổi mã là làm mọi bài cũ rơi ra ngoài mọi
// bộ lọc. Chỉ thêm MỘT mã mới cho tab thứ ba.
// Thứ tự trong mảng này LÀ thứ tự dải tab trên màn hình, đúng như nhà trường
// liệt kê. Mọi chỗ khác chỉ dùng nó để hỏi `includes` nên xếp lại không đổi
// nghĩa; và mặc định khi không gửi loại vẫn ghi thẳng 'cambridge', không lấy
// phần tử đầu mảng — đổi thứ tự không được kéo theo đổi mặc định.
const LOAI = ['thu-phu-huynh', 'cambridge', 'ket-noi'];
const TEN_LOAI = {
  'thu-phu-huynh': 'Letter for Parent',
  cambridge: 'Cambridge Weekly Plan',
  'ket-noi': 'Home Connection',
};
const PHAM_VI = ['truong', 'coso', 'nhom'];

const TOI_DA_TIEU_DE = 200;
const TOI_DA_NOI_DUNG = 8000;
const TOI_DA_ANH = 6;
const GIOI_HAN = 60;
// Trần cho lượt hỏi tự đặt số — không để một lượt gọi kéo cả kho về.
const TRANG_TOI_DA = 200;

// KHUNG THEO MẪU TRƯỜNG GỬI 07/09 (Đ143): Block / Week / lứa tuổi, năm ô nội
// dung, tệp PDF / Word kèm bài.
const LUA_TUOI = ['', '3-4', '4-5', '5-6'];
const TEN_LUA_TUOI = { '': 'Mọi lứa', '3-4': '3–4 tuổi', '4-5': '4–5 tuổi', '5-6': '5–6 tuổi' };

// CHUỖI RỖNG MANG HAI NGHĨA KHÁC HẲN NHAU, TUỲ NÓ GẮN VÀO ĐÂU.
//
// Gắn vào một BÀI thì '' nghĩa là "bài này dùng cho mọi lứa". Gắn vào một BÉ
// thì '' nghĩa là "bé chưa vào chương trình" — bé dưới 36 tháng. Hai nghĩa
// ngược nhau: một bên là rộng nhất, một bên là chưa có gì.
//
// Chỗ trả lứa của con đang viết `TEN_LUA_TUOI[c.luaTuoi] || 'Chưa vào chương
// trình Cambridge'`, mà `TEN_LUA_TUOI['']` là một chuỗi KHÔNG RỖNG nên nhánh
// `||` không bao giờ chạy. Kết quả: màn hình của nhà có bé 14 tháng nói con
// mình thuộc "Cả hai lứa" Cambridge. Bài canh chỉ đo bé ấy không nhận block
// nào, không đo chữ hiện ra, nên chuyện này nằm im.
//
// Tách hẳn thành một hàm riêng thay vì sửa chuỗi trong bảng: bảng còn phải
// dùng cho ô chọn lúc soạn bài, nơi '' đúng là "mọi lứa".
function tenLuaCuaBe(ma) {
  return ma ? (TEN_LUA_TUOI[ma] || ma) : 'Chưa vào chương trình Cambridge';
}
const TOI_DA_O_KHUNG = 2000;
const TOI_DA_TEN_BLOCK = 80;
const TOI_DA_MUC_TIEU = 4000;
const TOI_DA_TEP = 4;
// Weekly Plan có 2 hoặc 3 hoạt động (góp ý 16/10, mục 8).
const TOI_DA_HOAT_DONG = 3;
const TOI_DA_TEN_TEP = 120;
const TUAN_TOI_DA = 52;

// LỨA CAMBRIDGE CỦA MỘT BÉ, tính từ ngày sinh ở thời điểm đang xem.
//
// BA LỨA, KHÔNG PHẢI HAI (Đ187). Nhà trường trả lời ngày 15/09 rằng Cambridge
// *"có tài liệu riêng"* cho 5–6 tuổi. Trước đó mã gộp mọi bé từ 48 tháng trở
// lên vào lứa 4–5 vì đó là lứa lớn nhất chương trình có — đúng theo lời trường
// hôm 07/09, nay lời ấy đã được sửa lại.
//
// Bé dưới 36 tháng chưa vào chương trình (về '' — chỉ thấy bài dành cho mọi
// lứa). Đây là chỗ XẾP LỚP của chương trình, không phải một nhận định về bé —
// không so bé với "chuẩn" nào (QUY TẮC 4).
//
// ĐIỀU CẦN BIẾT TRƯỚC KHI TRƯỜNG SOẠN XONG BỘ 5–6: từ hôm nay bé từ 60 tháng
// trở lên không còn nhận bài lứa 4–5 nữa. Không mất dữ liệu gì — bài cũ vẫn
// còn nguyên, cô và văn phòng vẫn thấy đủ — nhưng màn hình của những nhà ấy
// sẽ trống cho tới khi có bài 5–6 đầu tiên. Nên màn hình phải NÓI RA điều đó
// thay vì để một khoảng trắng (xem `view.js`).
function luaTuoiCuaBe(dob, moc) {
  if (!dob || !NGAY_RE.test(String(dob))) return '';
  const sinh = new Date(`${dob}T00:00:00Z`);
  const nay = new Date(`${moc}T00:00:00Z`);
  if (Number.isNaN(sinh.getTime()) || Number.isNaN(nay.getTime())) return '';
  let thang = (nay.getUTCFullYear() - sinh.getUTCFullYear()) * 12 + (nay.getUTCMonth() - sinh.getUTCMonth());
  if (nay.getUTCDate() < sinh.getUTCDate()) thang -= 1;
  if (thang < 36) return '';
  if (thang < 48) return '3-4';
  return thang < 60 ? '4-5' : '5-6';
}

function homNay() {
  return ngay.homNay();
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

function thuHaiCua(ngay) {
  const t = Date.parse(`${ngay}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  const lui = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - lui * 86400000).toISOString().slice(0, 10);
}

// Danh sách ảnh lưu phẳng: mỗi dòng một tên tệp.
function tachAnh(s) {
  return String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
}

module.exports = (app, { db }) => {
  // =========================================================================
  // MỘT HÀM DUY NHẤT QUYẾT ĐỊNH AI ĐỌC ĐƯỢC BÀI NÀO
  // =========================================================================
  //
  // Quản trị đi theo tầng cơ sở như mọi chỗ khác. Cô và gia đình đi theo NHÓM
  // của mình — và với gia đình, "nhóm của mình" nghĩa là nhóm của bất kỳ đứa
  // con nào, vì một nhà có thể có hai bé ở hai nhóm.
  function xemDuoc(bai, user) {
    if (!bai || !user) return false;
    // Nháp chỉ người đăng và quản trị thấy.
    if (!bai.congBoLuc && user.role !== 'admin') return false;

    if (user.role === 'admin') {
      const pham = db.phamViCoSo(user);
      if (pham === null) return true;                     // Cấp 1 — toàn hệ thống
      if (bai.phamVi === 'truong') return true;
      if (bai.phamVi === 'coso') return bai.campusId === pham;
      return db.classIdsOfCampus(pham).includes(bai.classId);
    }

    if (bai.phamVi === 'truong') return true;
    // Phạm vi NHÓM đi qua `db.canAccessClass` — chính là "nhóm của mình có
    // nhóm đó không", và là tên mà bộ canh `test/anh-qua-canh-quyen.test.mjs`
    // nhận ra ở mọi đường trả tệp (ảnh, và từ Đ143 cả tệp PDF / Word).
    if (bai.phamVi === 'nhom') return db.canAccessClass(user, bai.classId);
    // Phạm vi CƠ SỞ: đúng khi một trong những nhóm của mình thuộc cơ sở đó.
    const nhomCuaToi = db.classIdsOf(user);
    return nhomCuaToi.some(cid => db.campusOfClass(cid) === bai.campusId);
  }

  // BẢN TÍNH SẴN của `xemDuoc` cho ĐƯỜNG LIỆT KÊ — cùng luật từng chữ.
  //
  // `xemDuoc` hỏi cơ sở dữ liệu vài câu cho MỖI bài (phamViCoSo, classIdsOf,
  // campusOfClass từng nhóm), mà đường liệt kê chạy nó trên TOÀN BỘ bảng
  // trước khi cắt trang — đúng hình dạng vụ 8.218 truy vấn của Album, chỉ
  // khác bảng. Hàm này hỏi MỘT lượt lúc tạo bộ lọc rồi trả lời từ bộ nhớ;
  // các đường một-bài vẫn dùng `xemDuoc` cũ.
  function taoBoLocXemDuoc(user) {
    if (!user) return () => false;
    if (user.role === 'admin') {
      const pham = db.phamViCoSo(user);
      const nhomCoSo = pham ? new Set(db.classIdsOfCampus(pham)) : null;
      return (bai) => {
        if (!bai) return false;
        if (pham === null) return true;
        if (bai.phamVi === 'truong') return true;
        if (bai.phamVi === 'coso') return bai.campusId === pham;
        return nhomCoSo.has(bai.classId);
      };
    }
    const nhomCuaToi = db.classIdsOf(user);
    const nhomSet = new Set(nhomCuaToi);
    const coSoCuaToi = new Set(nhomCuaToi.map(cid => db.campusOfClass(cid)).filter(Boolean));
    return (bai) => {
      if (!bai || !bai.congBoLuc) return false;   // nháp: chỉ quản trị
      if (bai.phamVi === 'truong') return true;
      if (bai.phamVi === 'nhom') return nhomSet.has(bai.classId);
      return coSoCuaToi.has(bai.campusId);
    };
  }

  // =========================================================================
  // ẢNH CỦA BÀI CŨNG PHẢI ĐI QUA LUẬT ẢNH NHÓM
  // =========================================================================
  //
  // BẢN ĐẦU CỦA PHÂN HỆ NÀY QUÊN HẲN LUẬT ẢNH NHÓM, VÀ ĐÓ LÀ MỘT LỖ THẬT.
  //
  // `xemDuoc` trả lời câu "người này có đọc được BÀI này không" — theo phạm vi
  // trường / cơ sở / nhóm. Nó không nói gì về ẢNH. Nhưng CLAUDE.md có một dòng
  // riêng cho ảnh: "một ảnh chỉ hiện cho gia đình khác khi MỌI bé trong ảnh
  // đều có đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện."
  //
  // Một tờ Home Connection của nhóm Chồi 2 gần như chắc chắn có ảnh các bé
  // Chồi 2 đang làm việc. Nếu chỉ hỏi phạm vi thì tấm ảnh đó tới mọi gia đình
  // trong nhóm — kể cả gia đình mà một nhà khác đã nói KHÔNG.
  //
  // VÌ SAO KHÔNG GẮN THẺ BÉ NHƯ ALBUM
  //
  // Album có bảng `photo_students` và có màn cho cô gắn thẻ. Ảnh Cambridge thì
  // không, và thêm cả cơ chế gắn thẻ vào đây là một hạng mục riêng. Nên ảnh
  // Cambridge rơi đúng vào NHÁNH 3 của `db.locAnhChoNguoiXem`: ảnh CHƯA GẮN
  // THẺ — app không biết trong đó có ai.
  //
  // Luật của nhánh đó, chép nguyên sang đây: chưa ai trong phạm vi từ chối thì
  // ảnh hiện như thường (đây là chỗ Nguyên tắc số 1 được giữ — trường chưa thu
  // giấy đồng ý thì không mất tấm ảnh nào); chỉ cần MỘT gia đình nói không là
  // ảnh của bài tạm ẩn với TẤT CẢ gia đình trong phạm vi ấy.
  //
  // ĐƯỜNG RA PHẢI CÓ THẬT, NẾU KHÔNG LUẬT NÀY GIẾT CHÍNH TÍNH NĂNG
  //
  // Bản đầu của bản vá này dừng ở đó: trong phạm vi có nhà nói không thì ẩn
  // ảnh. Chạy thử trên dữ liệu mẫu — một trường bình thường, một nhà trong hai
  // mươi nhà nói không — thì MỌI ảnh Cambridge biến mất vĩnh viễn, và không có
  // cách nào lấy lại. Đó không phải "tạm ẩn", đó là gỡ bỏ tính năng.
  //
  // Album không rơi vào cái bẫy đó vì nó có ĐƯỜNG RA: cô gắn thẻ bé, ảnh hiện
  // lại. Ở đây đường ra là một câu hỏi cho cả bài — ẢNH NÀY CÓ MẶT BÉ KHÔNG.
  // Người vừa tải ảnh lên chính là người biết câu trả lời, và giáo cụ, sách,
  // tranh chủ điểm thì chiếm phần lớn ảnh của một tờ Home Connection.
  //
  // MẶC ĐỊNH LÀ "CÓ MẶT BÉ", tức phía đóng. Quên tích ô thì quên theo hướng
  // giữ ảnh lại, không phải hướng thả ảnh ra — cùng một luật với danh sách cho
  // phép của tầng chức vụ.
  //
  // Cô và văn phòng vẫn thấy hết — họ là người đăng, người chịu trách nhiệm,
  // và giấu ảnh khỏi họ thì không ai sửa được bài. Màn của họ nhận thêm một
  // dòng nói rõ ảnh đang tạm ẩn và vì sao.
  // =========================================================================
  // BỘ NHỚ CHO MỘT LƯỢT ĐỌC (Đ158 — món 1 của Đ120)
  // =========================================================================
  //
  // `keml` dựng gói dữ liệu cho MỘT bài, và nó hỏi cơ sở dữ liệu rất nhiều
  // lần: ô tích ảnh (hai lần), danh sách nhóm trong phạm vi, câu hỏi "nhóm này
  // có nhà nào từ chối chia sẻ ảnh không" cho TỪNG nhóm (hai truy vấn mỗi
  // nhóm), khung bài, tệp đính kèm, tên người đăng, tên nhóm, tên cơ sở.
  //
  // Với một bài phạm vi TRƯỜNG ở một trường ba cơ sở hai chục nhóm, riêng vế
  // "nhà nào từ chối" đã là bốn chục truy vấn — và đường liệt kê gọi `keml`
  // cho cả một trang. Đó là con số ~65 truy vấn mỗi bài mà vòng rà Đ120 ghi
  // lại, và là lý do món này có mốc "làm TRƯỚC khi trường bật Cambridge".
  //
  // Cách chữa giống hệt `taoBoLocXemDuoc` ngay bên trên: hỏi MỘT lượt rồi trả
  // lời từ bộ nhớ. Bộ nhớ sống đúng một lượt yêu cầu HTTP, nên không có
  // chuyện đọc phải dữ liệu cũ của lượt trước.
  //
  // KHÔNG BẮT BUỘC: `keml(bai, user)` không kèm bộ nhớ thì chạy y như trước.
  // Các đường một-bài (tạo, sửa, công bố) giữ nguyên đường cũ — một bài thì
  // bộ nhớ không tiết kiệm được gì mà lại thêm một chỗ để sai.
  function taoBoNho() {
    return {
      coMatBe: null,
      tuChoi: new Map(),
      nhomCuaCoSo: new Map(),
      moiNhom: null,
      khung: null,
      hoatDong: null,
      story: null,
      tep: null,
      nguoi: new Map(),
      lop: new Map(),
      coSo: new Map(),
    };
  }

  // Nạp sẵn những thứ hỏi được theo LÔ cho đúng các bài sắp vẽ.
  function napTruoc(nho, ids) {
    if (!nho || !ids.length) return nho;
    const marks = ids.map(() => '?').join(',');
    nho.coMatBe = new Map(db.all('cambridge_anh_be',
      `SELECT baiId, coMatBe FROM cambridge_anh_be WHERE baiId IN (${marks})`, ids)
      .map(r => [r.baiId, !!r.coMatBe]));
    nho.khung = new Map(db.all('cambridge_bai_khung',
      `SELECT * FROM cambridge_bai_khung WHERE baiId IN (${marks})`, ids)
      .map(r => [r.baiId, r]));
    nho.hoatDong = new Map();
    for (const h of db.all('cambridge_bai_hoat_dong',
      `SELECT * FROM cambridge_bai_hoat_dong WHERE baiId IN (${marks}) ORDER BY baiId, thuTu`, ids)) {
      if (!nho.hoatDong.has(h.baiId)) nho.hoatDong.set(h.baiId, []);
      nho.hoatDong.get(h.baiId).push(h);
    }
    nho.story = new Map(db.all('cambridge_bai_them',
      `SELECT baiId, story FROM cambridge_bai_them WHERE baiId IN (${marks})`, ids)
      .map(r => [r.baiId, r.story]));
    nho.tep = new Map();
    for (const t of db.all('cambridge_tep',
      `SELECT id, baiId, tenGoc, bytes, file, taoLuc FROM cambridge_tep
        WHERE baiId IN (${marks}) ORDER BY taoLuc, rowid`, ids)) {
      if (!nho.tep.has(t.baiId)) nho.tep.set(t.baiId, []);
      nho.tep.get(t.baiId).push(t);
    }
    return nho;
  }

  function anhCoMatBe(baiId, nho) {
    if (nho && nho.coMatBe) {
      return nho.coMatBe.has(baiId) ? nho.coMatBe.get(baiId) : true;
    }
    const r = baiId
      ? db.first('cambridge_anh_be', 'SELECT coMatBe FROM cambridge_anh_be WHERE baiId = ?', [baiId])
      : null;
    return r ? !!r.coMatBe : true;   // không có dòng nào = coi như CÓ mặt bé
  }

  function ghiAnhCoMatBe(baiId, coMatBe) {
    db.run(`INSERT INTO cambridge_anh_be (baiId, coMatBe, ghiLuc) VALUES (?, ?, ?)
            ON CONFLICT(baiId) DO UPDATE SET coMatBe = excluded.coMatBe, ghiLuc = excluded.ghiLuc`,
    [baiId, coMatBe ? 1 : 0, new Date().toISOString()]);
  }

  function nhomTrongPhamVi(bai, nho) {
    if (!bai) return [];
    if (bai.phamVi === 'nhom') return bai.classId ? [bai.classId] : [];
    if (bai.phamVi === 'coso') {
      if (!bai.campusId) return [];
      if (!nho) return db.classIdsOfCampus(bai.campusId);
      if (!nho.nhomCuaCoSo.has(bai.campusId)) {
        nho.nhomCuaCoSo.set(bai.campusId, db.classIdsOfCampus(bai.campusId));
      }
      return nho.nhomCuaCoSo.get(bai.campusId);
    }
    if (!nho) return db.classes().map(c => c.id);
    if (!nho.moiNhom) nho.moiNhom = db.classes().map(c => c.id);
    return nho.moiNhom;
  }

  // "Nhóm này có nhà nào từ chối chia sẻ ảnh không" — hai truy vấn mỗi lần
  // hỏi, và một bài phạm vi trường hỏi nó cho MỌI nhóm. Nhớ theo nhóm.
  function nhomCoBeTuChoi(classId, nho) {
    if (!nho) return db.coBeTuChoiChiaSeTungHoc(classId);
    if (!nho.tuChoi.has(classId)) nho.tuChoi.set(classId, db.coBeTuChoiChiaSeTungHoc(classId));
    return nho.tuChoi.get(classId);
  }

  function anhHienVoiGiaDinh(bai, nho) {
    if (!anhCoMatBe(bai.id, nho)) return true; // văn phòng đã nói: trong ảnh không có bé nào
    // Bản TỪNG HỌC, không phải bản chỉ nhìn nhóm hiện tại. Tờ Home Connection
    // của năm ngoái vẫn còn trên màn hình gia đình, nên lời từ chối cũng phải
    // còn hiệu lực ở đó — xem chú thích dài ở `coBeTuChoiChiaSeTungHoc`.
    return !nhomTrongPhamVi(bai, nho).some(cid => nhomCoBeTuChoi(cid, nho));
  }

  // MARKETING MANG ẢNH RA NGOÀI TRƯỜNG, NÊN LUẬT CỦA HỌ CHẶT HƠN LUẬT ẢNH NHÓM.
  //
  // Mô tả chức vụ Marketing hứa thẳng với nhà trường: "Chỉ thấy ảnh mà MỌI bé
  // trong ảnh đều có đồng ý truyền thông." `routes/albums.js` giữ đúng lời hứa
  // đó bằng `db.locAnhChoTruyenThong`. Phân hệ này thì KHÔNG: chốt duy nhất ở
  // đây hỏi `role === 'parent'`, mà Marketing là `role === 'admin'` nên đi
  // thẳng qua — cả đường liệt kê lẫn đường trả byte của ảnh.
  //
  // Ảnh Cambridge KHÔNG có bảng gắn thẻ từng bé, nên không bao giờ đối chiếu
  // được "mọi bé trong ảnh đã tích ô ③ chưa". Không biết thì KHÔNG cho — đúng
  // tinh thần "không gắn ai thì không dùng được" của `locAnhChoTruyenThong`.
  // Và ô ③ MẶC ĐỊNH KHÔNG TÍCH, nên mọi bé chưa thu giấy đều thuộc diện chưa
  // cho phép.
  //
  // Đường ra đã có sẵn, không phải dựng thêm gì: ô "Ảnh không có mặt bé nào".
  // Văn phòng tích thì trong ảnh không có bé nào, đồng ý truyền thông không còn
  // là câu hỏi, Marketing dùng được ngay. Tính năng không chết.
  function anhHienVoiTruyenThong(bai, nho) {
    return !anhCoMatBe(bai.id, nho);
  }

  function laTruyenThong(user) {
    return !!user && user.role === 'admin' && db.chucVu(user) === 'marketing';
  }

  const LOI_TRUYEN_THONG = 'Ảnh của bài này chưa dùng cho truyền thông được: bài đang '
    + 'được đánh dấu là ảnh CÓ mặt bé, mà ảnh Cambridge không ghi được từng bé nên không '
    + 'đối chiếu được đồng ý truyền thông của từng nhà. Nếu ảnh chỉ là giáo cụ, sách hay '
    + 'tranh chủ điểm thì nhờ văn phòng tích ô "Ảnh không có mặt bé nào".';

  function tenNguoi(userId, nho) {
    if (!userId) return '';
    if (nho) {
      if (!nho.nguoi.has(userId)) {
        const c = db.findUser(userId);
        nho.nguoi.set(userId, c ? `${c.title} ${c.name}` : '');
      }
      return nho.nguoi.get(userId);
    }
    const u = db.findUser(userId);
    return u ? `${u.title} ${u.name}` : '';
  }

  function tenLop(classId, nho) {
    if (!classId) return '';
    if (!nho) return (db.findClass(classId) || {}).name || '';
    if (!nho.lop.has(classId)) nho.lop.set(classId, (db.findClass(classId) || {}).name || '');
    return nho.lop.get(classId);
  }
  function tenCoSo(campusId, nho) {
    if (!campusId) return '';
    if (!nho) return (db.findCampus(campusId) || {}).name || '';
    if (!nho.coSo.has(campusId)) nho.coSo.set(campusId, (db.findCampus(campusId) || {}).name || '');
    return nho.coSo.get(campusId);
  }

  // ---- Khung, block, tệp của một bài (Đ143) ----
  function khungCua(baiId, nho) {
    if (nho && nho.khung) return nho.khung.get(baiId) || null;
    return db.first('cambridge_bai_khung', 'SELECT * FROM cambridge_bai_khung WHERE baiId = ?', [baiId]) || null;
  }
  function blockCua(id, nho) {
    if (!id) return null;
    if (!nho) return db.first('cambridge_block', 'SELECT * FROM cambridge_block WHERE id = ?', [id]) || null;
    if (!nho.block) nho.block = new Map();
    if (!nho.block.has(id)) {
      nho.block.set(id, db.first('cambridge_block', 'SELECT * FROM cambridge_block WHERE id = ?', [id]) || null);
    }
    return nho.block.get(id);
  }
  function tepCua(baiId, nho) {
    const rows = (nho && nho.tep)
      ? (nho.tep.get(baiId) || [])
      : db.all('cambridge_tep', 'SELECT id, tenGoc, bytes, file, taoLuc FROM cambridge_tep WHERE baiId = ? ORDER BY taoLuc, rowid', [baiId]);
    return rows.map(t => ({ id: t.id, tenGoc: t.tenGoc, bytes: t.bytes, loai: String(t.file).split('.').pop(), taoLuc: t.taoLuc }));
  }
  function vePhiaKhung(k, nho) {
    if (!k) return null;
    const b = blockCua(k.blockId, nho);
    return {
      blockId: k.blockId || '', blockTen: b ? b.ten : '',
      tuanSo: Number(k.tuanSo) || 0, luaTuoi: k.luaTuoi || '',
      tenLuaTuoi: TEN_LUA_TUOI[k.luaTuoi || ''] || '',
      monHoc: k.monHoc || '', chuDe: k.chuDe || '', tuVung: k.tuVung || '',
      songChant: k.songChant || '', ketNoiONha: k.ketNoiONha || '',
    };
  }
  // CÁC HOẠT ĐỘNG CỦA MỘT BÀI (Đ239f), theo đúng thứ tự văn phòng điền.
  //
  // Weekly Plan CŨ chưa có dòng nào thì suy MỘT hoạt động từ khung (Hoạt
  // động / Chủ đề / Từ vựng, mục tiêu rỗng) để thẻ bài cũ và bài mới hiện cùng
  // một kiểu. Chỉ suy cho Weekly Plan: ở Letter và Home Connection các ô ấy là
  // chữ cũ của khung, thẻ vẽ chúng như trước. Suy là chỉ đọc, không ghi gì.
  function hoatDongCua(bai, k, nho) {
    const rows = (nho && nho.hoatDong)
      ? (nho.hoatDong.get(bai.id) || [])
      : db.all('cambridge_bai_hoat_dong', 'SELECT * FROM cambridge_bai_hoat_dong WHERE baiId = ? ORDER BY thuTu', [bai.id]);
    if (rows.length) {
      return rows.map(h => ({ hoatDong: h.hoatDong || '', chuDe: h.chuDe || '', tuVung: h.tuVung || '', mucTieu: h.mucTieu || '' }));
    }
    if (bai.loai === 'cambridge' && k && (k.monHoc || k.chuDe || k.tuVung)) {
      return [{ hoatDong: k.monHoc || '', chuDe: k.chuDe || '', tuVung: k.tuVung || '', mucTieu: '' }];
    }
    return [];
  }
  function storyCua(baiId, nho) {
    if (nho && nho.story) return nho.story.get(baiId) || '';
    const r = db.first('cambridge_bai_them', 'SELECT story FROM cambridge_bai_them WHERE baiId = ?', [baiId]);
    return (r && r.story) || '';
  }
  // Lứa Cambridge của các con một gia đình — tập rỗng với cô và văn phòng
  // (họ xem đủ cả hai lứa, vì họ cần biết cả hai).
  function luaTuoiCuaCon(user) {
    if (!user || user.role !== 'parent') return null;
    const ra = [];
    for (const id of db.studentIdsCuaPhuHuynh(user.id)) {
      const be = db.findStudent(id);
      if (!be || !be.active) continue;
      ra.push({ studentId: be.id, ten: be.name, luaTuoi: luaTuoiCuaBe(be.dob, homNay()) });
    }
    return ra;
  }
  // Bài này có dành cho nhà này không, xét theo lứa của các con.
  function hopLua(khung, cacCon) {
    if (!cacCon) return true;                       // cô, văn phòng
    if (!khung || !khung.luaTuoi) return true;      // bài cho cả hai lứa
    return cacCon.some(c => c.luaTuoi === khung.luaTuoi);
  }
  function blockHopLua(b, cacCon) {
    if (!cacCon) return true;
    if (!b.luaTuoi) return true;
    return cacCon.some(c => c.luaTuoi === b.luaTuoi);
  }
  function danhSachBlock() {
    return db.all('cambridge_block', 'SELECT * FROM cambridge_block ORDER BY thuTu, tuNgay, rowid');
  }

  function keml(bai, user, nho) {
    const anh = tachAnh(bai.anh);
    const an = !!anh.length && !anhHienVoiGiaDinh(bai, nho);
    const laGiaDinh = !!user && user.role === 'parent';
    const laMkt = laTruyenThong(user);
    const anMkt = !!anh.length && laMkt && !anhHienVoiTruyenThong(bai, nho);
    const coBe = anhCoMatBe(bai.id, nho);
    const k = khungCua(bai.id, nho);
    return {
      ...bai,
      // LỌC Ở TẦNG DỮ LIỆU. Gia đình không nhận về tên tệp của ảnh bị ẩn —
      // không phải nhận rồi giao diện che bớt, vì tên tệp là thứ tải được.
      anh: ((an && laGiaDinh) || anMkt) ? [] : anh,
      daCongBo: !!bai.congBoLuc,
      khung: vePhiaKhung(k, nho),
      hoatDong: hoatDongCua(bai, k, nho),
      story: storyCua(bai.id, nho),
      tep: tepCua(bai.id, nho),
      nguoiDangTen: tenNguoi(bai.nguoiDang, nho),
      tenNhom: tenLop(bai.classId, nho),
      tenCoSo: tenCoSo(bai.campusId, nho),
      // Trạng thái ô tích, chỉ gửi cho người đăng được — gia đình không cần và
      // không nên biết bài nào đang được đánh dấu là có mặt bé.
      ...(laGiaDinh ? {} : { anhCoMatBe: coBe }),
      // Nói cho người đăng biết ảnh đang tạm ẩn, và nói cách làm nó hiện lại.
      // Ẩn mà không giải thích là chỗ cô mất lòng tin vào app nhanh nhất.
      // Marketing được nói lý do RIÊNG của họ. Đưa họ câu dành cho cô thì họ đi
      // hỏi gia đình một chuyện không liên quan tới việc họ đang làm.
      ...(anMkt ? { nhacAnhTamAn: LOI_TRUYEN_THONG } : {}),
      ...(an && !laGiaDinh && !laMkt ? {
        nhacAnhTamAn: `${anh.length} ảnh của bài này đang tạm ẩn với gia đình. `
          + 'Trong phạm vi bài có gia đình chưa đồng ý cho ảnh của con hiện với các nhà khác, '
          + 'mà bài này đang được đánh dấu là ảnh CÓ mặt bé. '
          + 'Nếu ảnh chỉ là giáo cụ, sách hay tranh chủ điểm thì sửa bài và tích ô '
          + '"Ảnh không có mặt bé nào" — ảnh sẽ hiện lại ngay.',
      } : {}),
    };
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================
  app.get('/api/cambridge', (req, res) => {
    const loai = LOAI.includes(String(req.query.loai || '')) ? req.query.loai : '';

    // CẮT CỬA SỔ SAU KHI LỌC QUYỀN, KHÔNG PHẢI TRONG CÂU TRUY VẤN.
    //
    // Câu cũ lấy `GIOI_HAN * 2` dòng MỚI NHẤT CỦA CẢ TRƯỜNG rồi mới lọc còn
    // phần người này được xem. Bộ lọc ấy (`xemDuoc`) chạy trong JavaScript và
    // nó rất chặt: gia đình chỉ thấy bài phạm vi trường, bài của nhóm con
    // mình, hoặc bài của cơ sở con mình. Nên cửa sổ THẬT của một gia đình là
    // 120 chia cho số nhóm đang mở — thêm một cơ sở là cửa sổ của MỌI gia đình
    // ngắn lại, mà nháp chưa công bố cũng chiếm chỗ trong 120 dòng đó.
    //
    // Hỏng theo lịch chứ không hỏng ngay: năm đầu ít nhóm thì không ai nhận
    // ra, và tới lúc nhận ra thì nhà trường đã tin vào tính năng. Gia đình kéo
    // xuống thấy vài tờ rồi hết, không lỗi, không dòng nhắc.
    //
    // Cùng cách chữa với Album (Đ98b): câu SQL là MỘT câu trên một bảng có chỉ
    // mục, phần đắt nằm ở lọc và ở ảnh phía sau. Cắt SAU khi lọc thì số dòng
    // trả về đúng bằng số dòng người này xem được, nên màn hình suy ra "còn
    // nữa hay hết" chỉ bằng cách đếm.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || GIOI_HAN)));

    // CHỈ ĐỌC CỘT DÙNG ĐỂ LỌC VÀ XẾP, KHÔNG ĐỌC CẢ BÀI (Đ158 — món 3 của Đ120).
    //
    // Vẫn phải quét cả bảng: cửa sổ trang được cắt SAU khi lọc quyền, và lý do
    // đó ghi ngay bên trên — đổi lại thành cắt trong SQL là làm hỏng đúng thứ
    // Đ98b vừa chữa. Nhưng bản cũ `SELECT *` kéo theo cả cột `anh` (danh sách
    // tên tệp, có bài mười dòng) và mọi cột chữ dài của MỌI bài trong lịch sử,
    // chỉ để vứt đi gần hết. Sáu cột dưới đây là đủ cho `taoBoLocXemDuoc` và
    // cho phép lọc lứa tuổi; nguyên bài chỉ đọc cho đúng một trang.
    const rows = db.all('cambridge_bai',
      `SELECT id, congBoLuc, phamVi, classId, campusId FROM cambridge_bai ${loai ? 'WHERE loai = ?' : ''}
       ORDER BY COALESCE(NULLIF(tuan, ''), substr(taoLuc, 1, 10)) DESC, taoLuc DESC`,
      loai ? [loai] : []);

    const xemNhanh = taoBoLocXemDuoc(req.user);
    // LỨA TUỔI LỌC Ở TẦNG DỮ LIỆU (Đ143): gia đình bé 3–4 không nhận bài của
    // lứa 4–5 — đó cũng là thư rác. Khung của cả bảng tra MỘT lượt, không tra
    // từng bài trước khi cắt trang.
    const cacCon = luaTuoiCuaCon(req.user);
    const khungTheoBai = new Map();
    if (cacCon) {
      for (const k of db.all('cambridge_bai_khung', 'SELECT baiId, luaTuoi FROM cambridge_bai_khung')) {
        khungTheoBai.set(k.baiId, k);
      }
    }
    const trang = rows.filter(xemNhanh)
      .filter(b => hopLua(khungTheoBai.get(b.id) || null, cacCon))
      .slice(bo, bo + soLuong);
    // Nguyên bài chỉ đọc cho đúng một trang, và giữ NGUYÊN THỨ TỰ đã xếp ở
    // trên — `WHERE id IN (...)` không hứa thứ tự nào cả.
    const idTrang = trang.map(b => b.id);
    const daySo = new Map(idTrang.map((id, i) => [id, i]));
    const dayDu = [];
    for (let i = 0; i < idTrang.length; i += 400) {
      const lo = idTrang.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      dayDu.push(...db.all('cambridge_bai', `SELECT * FROM cambridge_bai WHERE id IN (${m})`, lo));
    }
    dayDu.sort((a, b) => daySo.get(a.id) - daySo.get(b.id));
    const nho = napTruoc(taoBoNho(), idTrang);
    const bai = dayDu.map(b => keml(b, req.user, nho));
    res.json({
      bai,
      // Thứ tự đúng như nhà trường liệt kê: thư gửi phụ huynh trước, rồi kế
      // hoạch tuần, rồi phần làm cùng con ở nhà.
      loai: LOAI.map(ma => ({ ma, ten: TEN_LOAI[ma] })),
      // Các block của chương trình (Đ143): gia đình chỉ nhận block đúng lứa
      // của con; cô và văn phòng nhận đủ.
      blocks: danhSachBlock().filter(b => blockHopLua(b, cacCon)),
      luaTuoi: LUA_TUOI.map(ma => ({ ma, ten: TEN_LUA_TUOI[ma] })),
      ...(cacCon ? { luaTuoiCuaCon: cacCon.map(c => ({ ...c, tenLuaTuoi: tenLuaCuaBe(c.luaTuoi) })) } : {}),
      duocDang: req.user.role === 'admin',
      // Danh mục để văn phòng dựng ô chọn phạm vi. Chỉ gửi cho người đăng
      // được — danh sách nhóm và cơ sở của cả trường không việc gì phải đi ra
      // màn hình của gia đình.
      ...(req.user.role === 'admin' ? {
        nhom: db.classIdsOf(req.user).map(id => db.findClass(id)).filter(Boolean)
          .map(c => ({ id: c.id, name: c.name })),
        coSo: db.campuses().map(c => ({ id: c.id, name: c.name })),
      } : {}),
    });
  });

  // Ảnh của một bài. ĐI QUA CANH QUYỀN, không phục vụ tĩnh: một tờ Home
  // Connection của nhóm có thể có ảnh các bé đang làm việc.
  app.get('/api/cambridge/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    // TRA BẰNG CHỈ MỤC (Đ158). Bản cũ quét cả bảng bài bằng `LIKE '%…%'` cho
    // MỖI tấm ảnh — một trang Home Connection mười ảnh là mười lượt quét.
    let chu = null;
    const dong = db.first('cambridge_anh', 'SELECT baiId FROM cambridge_anh WHERE file = ?', [file]);
    if (dong) chu = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [dong.baiId]);
    if (!chu) {
      // ĐƯỜNG LÙI, GIỮ CÓ CHỦ Ý. Chỉ mục dựng lại được nhưng vẫn có thể lệch
      // (một bản sao lưu khôi phục nửa chừng, một lần ghi hỏng). Rơi về cách
      // cũ thì chậm, nhưng ảnh vẫn ra đúng — thà chậm còn hơn báo "không tìm
      // thấy" cho một tấm ảnh vẫn nằm nguyên trên đĩa.
      //
      // Nối chuỗi thay vì nhúng biến vào chuỗi mẫu: ký tự đại diện của SQL
      // đứng ngay sau một biến nhúng sẽ trùng với dấu hiệu mà bộ canh QUY TẮC
      // 4 đi tìm.
      const mau = '%' + file + '%';
      chu = db.all('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE anh LIKE ?', [mau])
        .find(b => tachAnh(b.anh).includes(file)) || null;
      if (chu) dongBoAnh(chu.id, chu.anh);   // vá lại chỉ mục ngay tại chỗ
    }
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!xemDuoc(chu, req.user)) return res.status(403).json({ error: 'Không có quyền xem ảnh này' });

    // ĐÂY MỚI LÀ CHỐT CHẶN THẬT CỦA LUẬT ẢNH NHÓM Ở PHÂN HỆ NÀY.
    //
    // Đường này trả về đúng các byte của tấm ảnh. Lọc ở đường liệt kê chỉ làm
    // ảnh không hiện trên màn hình; ai biết tên tệp vẫn tải được thẳng qua đây,
    // mà tên tệp thì không bí mật — nó nằm trong gói JSON gia đình đó đã nhận ở
    // lần xem trước, TRƯỚC khi nhà kia rút đồng ý. Kiểm đồng ý phải đứng TRƯỚC
    // phép kiểm tệp có tồn tại: hỏi ngược thứ tự thì câu "không tìm thấy ảnh"
    // vô tình xác nhận rằng người hỏi đáng lẽ được xem, chỉ là tệp đã mất.
    if (req.user.role === 'parent' && !anhHienVoiGiaDinh(chu)) {
      return res.status(403).json({
        error: 'Ảnh này chưa hiện với gia đình: trong nhóm có bé mà gia đình chưa đồng ý chia sẻ ảnh',
      });
    }
    // Và chốt tương ứng cho Marketing. Cắt ở đường liệt kê là chưa đủ: tên tệp
    // nằm trong gói JSON họ đã nhận ở lần xem trước.
    if (laTruyenThong(req.user) && !anhHienVoiTruyenThong(chu)) {
      return res.status(403).json({ error: LOI_TRUYEN_THONG });
    }
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // =========================================================================
  // ĐĂNG — VIỆC CỦA VĂN PHÒNG
  // =========================================================================
  //
  // Nhà trường nói rõ "văn phòng đăng lên, phụ huynh đọc". Cô không đăng: nội
  // dung Cambridge là chương trình của cả trường, và một tờ gửi nhầm nhóm thì
  // không rút lại được khỏi điện thoại đã đọc.
  //
  // `requireRole` để rộng tới 'teacher' một cách CÓ CHỦ Ý: nếu chặn ngay ở đó
  // thì cô nhận câu "Không có quyền thực hiện" cụt lủn. Hàm này chặn thật, và
  // nói được một câu có ích — kèm chỉ đường sang phần thuộc về cô.
  function chanNeuKhongPhaiVanPhong(req, res) {
    if (req.user.role === 'admin') return false;
    res.status(403).json({
      error: 'Nội dung Cambridge và Kết nối ở nhà do văn phòng đăng. '
        + 'Cô có mục "Cùng con ở nhà" theo tuần ở phân hệ Hành trình học tập.',
    });
    return true;
  }

  function lamSach(req, b, cu) {
    const tieuDe = chuoi(b.tieuDe !== undefined ? b.tieuDe : (cu || {}).tieuDe, TOI_DA_TIEU_DE);
    if (!tieuDe) return { loi: 'Cần một tiêu đề cho bài đăng' };

    const loai = chuoi(b.loai !== undefined ? b.loai : (cu || {}).loai, 20) || 'cambridge';
    if (!LOAI.includes(loai)) return { loi: 'Loại bài đăng không hợp lệ' };

    const phamVi = chuoi(b.phamVi !== undefined ? b.phamVi : (cu || {}).phamVi, 20) || 'truong';
    if (!PHAM_VI.includes(phamVi)) return { loi: 'Phạm vi gửi không hợp lệ' };

    let campusId = '';
    let classId = '';
    if (phamVi === 'coso') {
      campusId = chuoi(b.campusId !== undefined ? b.campusId : (cu || {}).campusId, 40);
      if (!db.findCampus(campusId)) return { loi: 'Chưa chọn cơ sở, hoặc cơ sở không tồn tại' };
      if (!db.canAccessCampus(req.user, campusId)) return { loi: 'Không có quyền đăng cho cơ sở này' };
    }
    if (phamVi === 'nhom') {
      classId = chuoi(b.classId !== undefined ? b.classId : (cu || {}).classId, 40);
      if (!db.findClass(classId)) return { loi: 'Chưa chọn nhóm, hoặc nhóm không tồn tại' };
      if (!db.canAccessClass(req.user, classId)) return { loi: 'Không có quyền đăng cho nhóm này' };
    }
    // GỬI CẢ TRƯỜNG THÌ PHẢI LÀ NGƯỜI CỦA CẢ TRƯỜNG.
    //
    // Quản lý một cơ sở gửi được cho cơ sở mình và các nhóm của mình, nhưng
    // không gửi được cho hai cơ sở kia — cùng luật với thực đơn ở N15.
    if (phamVi === 'truong' && db.phamViCoSo(req.user) !== null) {
      return {
        loi: 'Gửi cho cả trường thì cần tài khoản quản trị toàn hệ thống. '
          + 'Quản lý cơ sở gửi được cho cơ sở mình hoặc cho một nhóm.',
      };
    }

    const tuanRaw = chuoi(b.tuan !== undefined ? b.tuan : (cu || {}).tuan, 10);
    const tuan = tuanRaw ? (NGAY_RE.test(tuanRaw) ? thuHaiCua(tuanRaw) : null) : '';
    if (tuan === null) return { loi: 'Tuần chưa đúng dạng, ví dụ đúng: 2026-09-07' };

    return {
      loai, tieuDe, phamVi, campusId, classId, tuan,
      noiDung: chuoi(b.noiDung !== undefined ? b.noiDung : (cu || {}).noiDung, TOI_DA_NOI_DUNG),
    };
  }

  // KHUNG của bài (Đ143). KHÔNG GỬI = KHÔNG ĐỤNG TỚI, cùng luật với ô tích ảnh:
  // màn hình cũ không gửi trường này thì khung đã có vẫn còn nguyên.
  // Trả { khung } (có thể null = không đổi) hoặc { loi }.
  function lamSachKhung(b) {
    if (!b || b.khung === undefined) return { khung: null };
    const k = b.khung || {};
    const blockId = chuoi(k.blockId, 40);
    if (blockId && !blockCua(blockId)) return { loi: 'Block đã chọn không còn — cô chọn lại block nhé' };
    const luaTuoi = chuoi(k.luaTuoi, 5);
    if (!LUA_TUOI.includes(luaTuoi)) return { loi: 'Lứa tuổi chỉ có 3–4, 4–5, 5–6 hoặc mọi lứa' };
    const tuanSo = Math.floor(Number(k.tuanSo) || 0);
    if (tuanSo < 0 || tuanSo > TUAN_TOI_DA) return { loi: `Số tuần trong block từ 1 tới ${TUAN_TOI_DA}` };
    return {
      khung: {
        blockId, tuanSo, luaTuoi,
        monHoc: chuoi(k.monHoc, 200),
        chuDe: chuoi(k.chuDe, 300),
        tuVung: chuoi(k.tuVung, TOI_DA_O_KHUNG),
        songChant: chuoi(k.songChant, TOI_DA_O_KHUNG),
        ketNoiONha: chuoi(k.ketNoiONha, TOI_DA_O_KHUNG),
      },
    };
  }
  function ghiKhung(baiId, khung) {
    if (!khung) return;
    const co = khungCua(baiId);
    const luc = new Date().toISOString();
    if (co) db.update('cambridge_bai_khung', baiId, { ...khung, ghiLuc: luc }, 'baiId');
    else db.insert('cambridge_bai_khung', { baiId, ...khung, ghiLuc: luc });
  }

  // HOẠT ĐỘNG CỦA WEEKLY PLAN (Đ239f). Cùng luật với khung: KHÔNG GỬI = KHÔNG
  // ĐỤNG TỚI. Gửi danh sách thì nó THAY toàn bộ — kể cả danh sách rỗng.
  // Phần tử rỗng hẳn bị bỏ (mẫu soạn luôn gửi đủ các khối, kể cả khối chưa
  // điền). Quá ba thì từ chối chứ không cắt: cắt là hoạt động văn phòng đã gõ
  // biến mất mà không ai được báo.
  // Trả { hoatDong } (null = không đổi) hoặc { loi }.
  function lamSachHoatDong(b) {
    if (!b || b.hoatDong === undefined) return { hoatDong: null };
    if (!Array.isArray(b.hoatDong)) {
      return { loi: 'Phần hoạt động gửi lên chưa đúng dạng — cô tải lại màn rồi thử lại nhé' };
    }
    const ds = b.hoatDong.map((h) => {
      const o = h && typeof h === 'object' ? h : {};
      return {
        hoatDong: chuoi(o.hoatDong, 200),
        chuDe: chuoi(o.chuDe, 300),
        tuVung: chuoi(o.tuVung, TOI_DA_O_KHUNG),
        mucTieu: chuoi(o.mucTieu, TOI_DA_O_KHUNG),
      };
    }).filter(h => h.hoatDong || h.chuDe || h.tuVung || h.mucTieu);
    if (ds.length > TOI_DA_HOAT_DONG) return { loi: `Mỗi Weekly Plan tối đa ${TOI_DA_HOAT_DONG} hoạt động` };
    return { hoatDong: ds };
  }
  function ghiHoatDong(baiId, ds) {
    if (!ds) return;
    const luc = new Date().toISOString();
    db.tx(() => {
      db.run('DELETE FROM cambridge_bai_hoat_dong WHERE baiId = ?', [baiId]);
      ds.forEach((h, i) => db.insert('cambridge_bai_hoat_dong', { baiId, thuTu: i + 1, ...h, ghiLuc: luc }));
    });
  }

  // HOẠT ĐỘNG THỨ NHẤT CHÉP VÀO KHUNG CŨ, chỉ với Weekly Plan. Màn hình đời
  // cũ còn trong bộ nhớ đệm điện thoại chỉ biết đọc khung — nó vẫn thấy hoạt
  // động đầu tiên thay vì một tờ trống. Các ô khác của khung (block, tuần,
  // lứa, Song / Chant) giữ đúng như vừa gửi, hoặc như đang có nếu không gửi.
  const O_KHUNG = ['blockId', 'tuanSo', 'luaTuoi', 'monHoc', 'chuDe', 'tuVung', 'songChant', 'ketNoiONha'];
  function khungKemHoatDong(baiId, loai, khung, ds) {
    if (loai !== 'cambridge' || !ds) return khung;
    const goc = khung || khungCua(baiId);
    if (!goc && !ds.length) return null;
    const ra = { blockId: '', tuanSo: 0, luaTuoi: '', songChant: '', ketNoiONha: '' };
    for (const t of O_KHUNG) if (goc && goc[t] != null) ra[t] = goc[t];
    const dau = ds[0] || {};
    return { ...ra, monHoc: dau.hoatDong || '', chuDe: dau.chuDe || '', tuVung: dau.tuVung || '' };
  }

  // STORY — mục chung của Weekly Plan, cạnh Song / Chant. Không gửi = không đổi.
  function lamSachStory(b) {
    if (!b || b.story === undefined) return null;
    return chuoi(b.story, TOI_DA_O_KHUNG);
  }
  function ghiStory(baiId, story) {
    if (story === null) return;
    if (!story && !db.first('cambridge_bai_them', 'SELECT baiId FROM cambridge_bai_them WHERE baiId = ?', [baiId])) return;
    db.run(`INSERT INTO cambridge_bai_them (baiId, story, ghiLuc) VALUES (?, ?, ?)
            ON CONFLICT(baiId) DO UPDATE SET story = excluded.story, ghiLuc = excluded.ghiLuc`,
    [baiId, story, new Date().toISOString()]);
  }

  // =========================================================================
  // CHỈ MỤC ẢNH THEO TÊN TỆP (Đ158 — món 2 của Đ120)
  // =========================================================================
  //
  // `cambridge_bai.anh` vẫn là NGUỒN SỰ THẬT. Bảng `cambridge_anh` chỉ là
  // "tên tệp → bài nào", dựng lại được bất cứ lúc nào từ cột ấy. Nên chỗ nào
  // ghi cột `anh` thì gọi `dongBoAnh` ngay sau đó, và nếu quên thì lượt khởi
  // động sau tự dựng bù (xem `dungLaiChiMucAnh`).
  function dongBoAnh(baiId, anh) {
    try {
      const ten = tachAnh(anh);
      db.tx(() => {
        db.run('DELETE FROM cambridge_anh WHERE baiId = ?', [baiId]);
        const luc = new Date().toISOString();
        for (const f of ten) {
          db.run(`INSERT INTO cambridge_anh (file, baiId, ghiLuc) VALUES (?, ?, ?)
                  ON CONFLICT(file) DO UPDATE SET baiId = excluded.baiId, ghiLuc = excluded.ghiLuc`,
          [f, baiId, luc]);
        }
      });
    } catch (err) {
      // Chỉ mục hỏng thì đường tra ảnh tự rơi về cách cũ (quét bảng) — chậm,
      // nhưng vẫn ra đúng ảnh. Không được để việc đăng bài của cô hỏng theo.
      console.error(`[cambridge] không ghi được chỉ mục ảnh: ${err.message}`);
    }
  }

  // Dựng bù cho những bài có ảnh mà chưa có dòng nào trong chỉ mục.
  //
  // Chạy MỘT LẦN lúc nạp phân hệ. Bài đã có dòng thì bỏ qua, nên khởi động lại
  // mười lần cũng không làm gì thêm; và trường chưa bật Cambridge thì bảng bài
  // rỗng, câu này gần như miễn phí.
  function dungLaiChiMucAnh() {
    try {
      const thieu = db.all('cambridge_bai',
        `SELECT b.id AS id, b.anh AS anh FROM cambridge_bai b
          WHERE b.anh <> '' AND NOT EXISTS (SELECT 1 FROM cambridge_anh a WHERE a.baiId = b.id)`);
      for (const b of thieu) dongBoAnh(b.id, b.anh);
      if (thieu.length) console.log(`[cambridge] dựng lại chỉ mục ảnh cho ${thieu.length} bài.`);
    } catch (err) {
      console.error(`[cambridge] không dựng lại được chỉ mục ảnh: ${err.message}`);
    }
  }
  dungLaiChiMucAnh();

  // Nhận danh sách ảnh dạng data URL, trả { anh } hoặc { loi }.
  function nhanAnh(ds) {
    if (!Array.isArray(ds)) return { anh: null };
    if (ds.length > TOI_DA_ANH) return { loi: `Mỗi bài tối đa ${TOI_DA_ANH} ảnh` };
    const ten = [];
    for (const a of ds) {
      if (!a) continue;
      try { ten.push(uploads.saveDataUrl(a).file); }
      catch (err) { return { loi: err.message || 'Ảnh không hợp lệ' }; }
    }
    return { anh: ten.join('\n') };
  }

  // Đọc ô tích từ thân yêu cầu. KHÔNG GỬI = KHÔNG ĐỤNG TỚI, cùng luật với
  // `luuHoSoBe`: màn hình cũ còn trong bộ nhớ đệm điện thoại không gửi trường
  // này, và nó không được vô tình biến một bài đã đánh dấu thành chưa đánh dấu.
  function ghiCoTich(baiId, b) {
    if (!b || b.anhCoMatBe === undefined) return;
    ghiAnhCoMatBe(baiId, !!b.anhCoMatBe);
  }

  app.post('/api/cambridge', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const s = lamSach(req, req.body || {}, null);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const kh = lamSachKhung(req.body || {});
    if (kh.loi) return res.status(400).json({ error: kh.loi });
    const hd = lamSachHoatDong(req.body || {});
    if (hd.loi) return res.status(400).json({ error: hd.loi });
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('cam'), ...s, anh: a.anh || '',
      congBoLuc: null, nguoiDang: req.user.id, taoLuc: luc, capNhatLuc: luc,
    };
    db.insert('cambridge_bai', rec);
    dongBoAnh(rec.id, rec.anh);
    ghiCoTich(rec.id, req.body || {});
    ghiKhung(rec.id, khungKemHoatDong(rec.id, rec.loai, kh.khung, hd.hoatDong));
    ghiHoatDong(rec.id, hd.hoatDong);
    ghiStory(rec.id, lamSachStory(req.body || {}));
    db.audit(req.user.id, 'cambridge-tao', rec.id, { loai: rec.loai, phamVi: rec.phamVi });
    res.status(201).json(keml(rec, req.user));
  });

  app.put('/api/cambridge/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const cu = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(cu, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });

    const s = lamSach(req, req.body || {}, cu);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const kh = lamSachKhung(req.body || {});
    if (kh.loi) return res.status(400).json({ error: kh.loi });
    const hd = lamSachHoatDong(req.body || {});
    if (hd.loi) return res.status(400).json({ error: hd.loi });
    const patch = { ...s, capNhatLuc: new Date().toISOString() };
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });
    if (a.anh !== null) {
      // Ảnh cũ không còn ai trỏ tới thì bỏ tệp đi.
      const giu = new Set(tachAnh(a.anh));
      for (const f of tachAnh(cu.anh)) {
        if (!giu.has(f)) { try { uploads.remove(f); } catch (_) { /* tệp đã mất thì thôi */ } }
      }
      patch.anh = a.anh;
    }

    db.update('cambridge_bai', cu.id, patch);
    if (patch.anh !== undefined) dongBoAnh(cu.id, patch.anh);
    db.audit(req.user.id, 'cambridge-sua', cu.id, { phamVi: patch.phamVi });
    ghiCoTich(cu.id, req.body || {});
    ghiKhung(cu.id, khungKemHoatDong(cu.id, s.loai, kh.khung, hd.hoatDong));
    ghiHoatDong(cu.id, hd.hoatDong);
    ghiStory(cu.id, lamSachStory(req.body || {}));
    res.json(keml(db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [cu.id]), req.user));
  });

  // Công bố là một BƯỚC RIÊNG, không phải hệ quả của việc bấm Lưu.
  app.post('/api/cambridge/:id/cong-bo', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (b.congBoLuc) return res.status(400).json({ error: 'Bài này đã công bố rồi' });
    // MẪU SOẠN WEEKLY PLAN KHÔNG CÒN Ô NỘI DUNG (góp ý 06/10, mục 5). Nội dung
    // của nó nằm ở khung (Hoạt động, Chủ đề, Từ vựng, Song/Chant) và tệp kèm —
    // nên một tờ chỉ có những thứ ấy vẫn gửi được. Tờ TRỐNG HẲN vẫn bị chặn y
    // như trước, cùng câu báo.
    if (!chuoi(b.noiDung, 10) && !tachAnh(b.anh).length && !coNoiDungKhac(b.id)) {
      return res.status(400).json({ error: 'Bài chưa có nội dung hay ảnh nào để gửi tới gia đình' });
    }
    const luc = new Date().toISOString();
    db.update('cambridge_bai', b.id, { congBoLuc: luc, capNhatLuc: luc });
    db.audit(req.user.id, 'cambridge-cong-bo', b.id, { phamVi: b.phamVi });
    // BÁO GIA ĐÌNH TỪNG BÉ ĐÚNG LỨA (Đ143). Đi đường thông báo riêng của bé
    // chứ không đường thông báo nhóm: tờ lứa 3–4 không rung điện thoại của nhà
    // có bé 4–5. Việc phụ — hỏng cũng không làm hỏng công bố.
    const soBao = baoGiaDinh(b);
    res.json({ ok: true, id: b.id, daCongBo: true, congBoLuc: luc, soGiaDinhDuocBao: soBao });
  });

  // Thu hồi: gỡ khỏi màn hình gia đình, KHÔNG xoá chữ đã viết.
  app.post('/api/cambridge/:id/thu-hoi', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (!b.congBoLuc) return res.status(400).json({ error: 'Bài này chưa công bố' });
    db.update('cambridge_bai', b.id, { congBoLuc: null, capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'cambridge-thu-hoi', b.id, {});
    res.json({ ok: true, id: b.id, daCongBo: false });
  });

  // Tờ không có chữ ở ô Nội dung vẫn có gì để gửi không: khung có chữ, có
  // hoạt động hay Story (Đ239f), hoặc có tệp kèm. Dùng cho Weekly Plan, mẫu
  // soạn không còn ô Nội dung.
  function coNoiDungKhac(baiId) {
    const k = khungCua(baiId);
    if (k && ['monHoc', 'chuDe', 'tuVung', 'songChant', 'ketNoiONha'].some(t => chuoi(k[t], 10))) return true;
    // Dòng hoạt động không bao giờ rỗng hẳn (`lamSachHoatDong` đã bỏ).
    if (db.first('cambridge_bai_hoat_dong', 'SELECT baiId FROM cambridge_bai_hoat_dong WHERE baiId = ? LIMIT 1', [baiId])) return true;
    if (storyCua(baiId)) return true;
    return !!db.first('cambridge_tep', 'SELECT id FROM cambridge_tep WHERE baiId = ? LIMIT 1', [baiId]);
  }

  // Bé này có thuộc chương trình Cambridge không: nhóm KHÔNG khai là nhà trẻ,
  // và bé đã vào một lứa (từ 36 tháng). Cùng luật với ô trên trang chủ
  // (`/pham-vi`) — một câu, hai chỗ dùng, để tin báo không trỏ tới một mục mà
  // màn hình của gia đình ấy không có.
  function beTrongChuongTrinh(be) {
    if (luaNhom.khaiCua(db, be.classId) === 'nha-tre') return false;
    return !!luaTuoiCuaBe(be.dob, homNay());
  }

  // Báo gia đình từng bé trong phạm vi bài, lọc theo lứa. Trả số bé được báo.
  //
  // KHÔNG BÁO NHÀ NHÀ TRẺ (góp ý 06/10, mục 5: *"mục này sẽ không xuất hiện
  // trong ứng dụng của PH và giáo viên lứa tuổi nhà trẻ"*). Trước đây tờ "mọi
  // lứa" rung cả điện thoại nhà bé 14 tháng, mà bấm vào thì trang chủ của họ
  // không có ô Cambridge. Đường ĐỌC thì vẫn mở như cũ — chỉ thôi đẩy tin.
  function baoGiaDinh(bai) {
    let so = 0;
    try {
      const khung = khungCua(bai.id);
      const nhom = nhomTrongPhamVi(bai);
      if (!nhom.length) return 0;
      const marks = nhom.map(() => '?').join(',');
      const ds = db.all('students',
        `SELECT id, name, dob, classId FROM students WHERE active = 1 AND classId IN (${marks})`, nhom);
      const tenLoai = TEN_LOAI[bai.loai] || TEN_LOAI.cambridge;
      for (const be of ds) {
        if (!beTrongChuongTrinh(be)) continue;
        if (khung && khung.luaTuoi && luaTuoiCuaBe(be.dob, homNay()) !== khung.luaTuoi) continue;
        tbb.gui({
          studentId: be.id,
          loai: 'cambridge',
          tieuDe: `${tenLoai}: ${bai.tieuDe}`,
          noiDung: chuoi(bai.noiDung, 160) || 'Mở Cambridge & Kết nối ở nhà để đọc.',
          // Mở thẳng đúng tab của loại bài — màn không còn tab "Tất cả".
          hash: `#/cambridge/${LOAI.includes(bai.loai) ? bai.loai : 'cambridge'}`,
          nguoiTao: bai.nguoiDang,
        });
        so += 1;
      }
    } catch (_) { /* việc phụ */ }
    return so;
  }

  // =========================================================================
  // BLOCK CỦA CHƯƠNG TRÌNH — văn phòng soạn, mọi người đọc (Đ143)
  // =========================================================================
  function lamSachBlock(b, cu) {
    const ten = chuoi(b.ten !== undefined ? b.ten : (cu || {}).ten, TOI_DA_TEN_BLOCK);
    if (!ten) return { loi: 'Cần tên block, ví dụ: Block 1' };
    const luaTuoi = chuoi(b.luaTuoi !== undefined ? b.luaTuoi : (cu || {}).luaTuoi, 5);
    if (!LUA_TUOI.includes(luaTuoi)) return { loi: 'Lứa tuổi chỉ có 3–4, 4–5, 5–6 hoặc mọi lứa' };
    const tuNgay = chuoi(b.tuNgay !== undefined ? b.tuNgay : (cu || {}).tuNgay, 10);
    const denNgay = chuoi(b.denNgay !== undefined ? b.denNgay : (cu || {}).denNgay, 10);
    if (tuNgay && !NGAY_RE.test(tuNgay)) return { loi: 'Ngày bắt đầu chưa đúng dạng, ví dụ đúng: 2026-09-08' };
    if (denNgay && !NGAY_RE.test(denNgay)) return { loi: 'Ngày kết thúc chưa đúng dạng, ví dụ đúng: 2026-10-17' };
    if (tuNgay && denNgay && denNgay < tuNgay) return { loi: 'Ngày kết thúc phải sau ngày bắt đầu' };
    const thuTu = Math.floor(Number(b.thuTu !== undefined ? b.thuTu : (cu || {}).thuTu) || 0);
    return {
      ten, luaTuoi, tuNgay, denNgay, thuTu,
      mucTieu: chuoi(b.mucTieu !== undefined ? b.mucTieu : (cu || {}).mucTieu, TOI_DA_MUC_TIEU),
    };
  }

  // Ô Cambridge có hiện với người này không (Đ193, việc 12).
  //
  // Nhà trường chốt (A8): bỏ mục Cambridge khỏi app phụ huynh nhóm nhà trẻ.
  //
  // Dùng đúng cơ chế `dieuKienHien` đã có sẵn cho Nhật ký ngày — một đường API
  // trả `{ hien }`, trang chủ tự ẩn ô. Không dựng cơ chế thứ hai cho cùng một
  // việc.
  //
  // CHỈ ẨN Ô, KHÔNG CHẶN API. Bài đã đăng vẫn đọc được với ai có quyền, để dữ
  // liệu đã có không bao giờ thành "không đọc được" — cùng luật đã ghi ở
  // `/api/nhatky/pham-vi`.
  //
  // Văn phòng LUÔN thấy — văn phòng nhìn cả trường.
  //
  // CÔ NHÀ TRẺ THÌ KHÔNG (góp ý 06/10, mục 5): *"mục này sẽ không xuất hiện
  // trong ứng dụng của PH và GIÁO VIÊN lứa tuổi nhà trẻ"*. Trước đợt này cô
  // nào cũng thấy. Nay cô thấy khi ít nhất MỘT bé trong các nhóm của cô thuộc
  // chương trình — cùng một câu hỏi với gia đình (`beTrongChuongTrinh`). Cô
  // dạy cả nhóm nhà trẻ lẫn nhóm mẫu giáo thì vẫn thấy. Cô chưa phụ trách
  // nhóm nào thì giữ như cũ (thấy) — ẩn đi là cô không biết mục này có tồn tại.
  app.get('/api/cambridge/pham-vi', (req, res) => {
    if (req.user.role === 'admin') return res.json({ hien: true });
    const ds = db.studentsOf(req.user) || [];
    if (req.user.role === 'teacher' && !ds.length) return res.json({ hien: true });
    // Hiện khi có ÍT NHẤT MỘT con đã vào chương trình. Nhà có bé nhà trẻ và bé
    // mẫu giáo thì vẫn thấy — ẩn đi là bé lớn mất mục của mình.
    res.json({ hien: ds.some(beTrongChuongTrinh) });
  });

  // =========================================================================
  // MÀN CỦA VĂN PHÒNG: NHÌN CHƯƠNG TRÌNH THEO TỪNG LỨA (Đ206, việc 13)
  // =========================================================================
  //
  // Mã đã tách đủ ba lứa từ Đ187, nhưng văn phòng chưa có chỗ nào nhìn theo
  // lứa. Câu họ cần trả lời rất cụ thể: *"lứa 5–6 năm nay có mấy bé, và đã có
  // bài nào cho lứa ấy chưa"* — hôm nay phải mở từng bài ra đếm bằng mắt.
  //
  // ĐÂY LÀ BẢN KIỂM KÊ CHƯƠNG TRÌNH, KHÔNG PHẢI BẢN ĐÁNH GIÁ TRẺ. Ranh giới
  // ấy quyết định mọi thứ màn này được phép trả về:
  //
  //   • ĐẾM BÉ THEO LỨA thì được — đó là nhóm theo tuổi, cùng loại với danh
  //     sách nhóm lớp. Không phải một cách đặt bé trên dưới nhau.
  //   • ĐẾM BÀI THEO LỨA thì được — đó là kiểm kê tài liệu CỦA TRƯỜNG.
  //   • TUYỆT ĐỐI KHÔNG đếm "bé này đã học mấy bài", không phần trăm, không
  //     thanh tiến độ, không xếp bé nào trước bé nào. QUY TẮC 4, và ở màn này
  //     nó đặc biệt dễ trượt vì đã có sẵn cả danh sách bé lẫn danh sách bài —
  //     ghép hai thứ lại là ra đúng cái bảng bị cấm.
  //   • Và lứa CHƯA CÓ BÀI NÀO không được trình bày như một khoảng trống cần
  //     lấp: máy chỉ nói con số, màn hình nói "chưa có bài nào cho lứa này".
  app.get('/api/cambridge/theo-lua', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;

    // Chỉ nhóm trong phạm vi của người hỏi — quản lý cơ sở 1 không đếm bé của
    // cơ sở 2. `db.classIdsOf` đã lo tầng cơ sở (bài học Đ202).
    const nhom = db.classIdsOf(req.user)
      .map(id => db.findClass(id))
      .filter(c => c && c.active !== false && c.active !== 0);

    const theoLua = new Map(LUA_TUOI.filter(Boolean).map(ma => [ma, []]));
    const ngoaiChuongTrinh = [];
    for (const lop of nhom) {
      // NHÓM ĐÃ KHAI LÀ NHÀ TRẺ THÌ ĐỨNG NGOÀI, kể cả khi có bé đủ 36 tháng
      // (Đ193): lời khai của trường thắng ngày sinh của từng bé.
      const laNhaTre = luaNhom.khaiCua(db, lop.id) === 'nha-tre';
      for (const be of db.all('students',
        'SELECT id, name, dob FROM students WHERE classId = ? AND active = 1 ORDER BY name COLLATE NOCASE',
        [lop.id])) {
        const lua = laNhaTre ? '' : luaTuoiCuaBe(be.dob, homNay());
        const dong = { studentId: be.id, hoTen: be.name, tenNhom: lop.name };
        if (lua && theoLua.has(lua)) theoLua.get(lua).push(dong);
        else ngoaiChuongTrinh.push({ ...dong, viSao: laNhaTre ? 'nhóm nhà trẻ' : 'chưa tới tuổi' });
      }
    }

    // Kiểm kê BÀI theo lứa. Bài khai "mọi lứa" đếm riêng chứ không cộng vào
    // từng lứa — cộng vào là con số của mỗi lứa trông đầy hơn thực tế, và văn
    // phòng tưởng lứa ấy đã đủ tài liệu.
    //
    // LỨA NẰM Ở BẢNG KHUNG, KHÔNG Ở BẢNG BÀI. `cambridge_bai` giữ tiêu đề và
    // nội dung; `cambridge_bai_khung` giữ phần Block/Week/lứa của khuôn trường
    // gửi (Đ143). Bản đầu của đường này hỏi `cambridge_bai.luaTuoi` và nhận
    // "no such column" — bài canh bắt ngay ở lượt chạy đầu tiên.
    //
    // Bài KHÔNG có dòng khung thì coi như "mọi lứa": đó đúng là cách
    // `blockHopLua` đang đọc nó ở đường liệt kê, nên hai chỗ nói cùng một
    // chuyện.
    const demBai = new Map(LUA_TUOI.filter(Boolean).map(ma => [ma, 0]));
    let baiMoiLua = 0;
    {
      const khung = new Map(db.all('cambridge_bai_khung', 'SELECT baiId, luaTuoi FROM cambridge_bai_khung')
        .map(k => [k.baiId, k.luaTuoi || '']));
      for (const x of db.all('cambridge_bai', 'SELECT id FROM cambridge_bai')) {
        const l = khung.get(x.id) || '';
        if (!l) baiMoiLua += 1;
        else if (demBai.has(l)) demBai.set(l, demBai.get(l) + 1);
      }
    }

    res.json({
      baiMoiLua,
      lua: LUA_TUOI.filter(Boolean).map(ma => ({
        ma,
        ten: TEN_LUA_TUOI[ma],
        soBe: theoLua.get(ma).length,
        danhSachBe: theoLua.get(ma),
        soBai: demBai.get(ma),
      })),
      // Bé ngoài chương trình: nói ra để văn phòng không tưởng app bỏ quên
      // bé, và nói kèm LÝ DO. Đây là trạng thái ĐÚNG của các bé ấy — bé 20
      // tháng không ở trong chương trình tiếng Anh là chuyện bình thường, và
      // màn hình không được trình bày nó như một việc còn dở.
      ngoaiChuongTrinh,
      soNhom: nhom.length,
    });
  });

  app.get('/api/cambridge/block', (req, res) => {
    const cacCon = luaTuoiCuaCon(req.user);
    res.json({ blocks: danhSachBlock().filter(b => blockHopLua(b, cacCon)), luaTuoi: LUA_TUOI.map(ma => ({ ma, ten: TEN_LUA_TUOI[ma] })) });
  });

  app.post('/api/cambridge/block', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const s = lamSachBlock(req.body || {}, null);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const luc = new Date().toISOString();
    const rec = { id: db.nextId('cbl'), ...s, nguoiTao: req.user.id, taoLuc: luc, capNhatLuc: luc };
    db.insert('cambridge_block', rec);
    db.audit(req.user.id, 'cambridge-block-tao', rec.id, { ten: rec.ten, luaTuoi: rec.luaTuoi });
    res.status(201).json(rec);
  });

  app.put('/api/cambridge/block/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const cu = blockCua(chuoi(req.params.id, 40));
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy block này' });
    const s = lamSachBlock(req.body || {}, cu);
    if (s.loi) return res.status(400).json({ error: s.loi });
    db.update('cambridge_block', cu.id, { ...s, capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'cambridge-block-sua', cu.id, { ten: s.ten });
    res.json(blockCua(cu.id));
  });

  // =========================================================================
  // TỆP PDF / WORD KÈM BÀI (Đ143) — đi qua canh quyền như ảnh
  // =========================================================================
  function tenTepSach(ten, ext) {
    // Tên hiển thị khi tải về: bỏ ký tự điều khiển và dấu ngoặc kép, giữ tiếng Việt.
    const goc = chuoi(ten, TOI_DA_TEN_TEP).replace(/[\x00-\x1f"\\/]/g, '').trim();
    const co = goc || `tai-lieu.${ext}`;
    return co.toLowerCase().endsWith(`.${ext}`) ? co : `${co}.${ext}`;
  }

  app.post('/api/cambridge/:id/tep', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    const ds = (req.body || {}).tep;
    if (!Array.isArray(ds) || !ds.length) return res.status(400).json({ error: 'Chưa chọn tệp nào' });
    const dangCo = tepCua(b.id).length;
    if (dangCo + ds.length > TOI_DA_TEP) {
      return res.status(400).json({ error: `Mỗi bài kèm tối đa ${TOI_DA_TEP} tệp` });
    }
    const daLuu = [];
    try {
      for (const t of ds) {
        const r = uploads.saveTaiLieuDataUrl((t || {}).dataUrl);
        daLuu.push({ id: db.nextId('ctp'), baiId: b.id, file: r.file, tenGoc: tenTepSach((t || {}).ten, r.ext), bytes: r.bytes, taoLuc: new Date().toISOString() });
      }
      db.tx(() => { for (const t of daLuu) db.insert('cambridge_tep', t); });
    } catch (err) {
      for (const t of daLuu) uploads.removeTaiLieu(t.file);
      return res.status(400).json({ error: err.message || 'Tệp không hợp lệ' });
    }
    db.update('cambridge_bai', b.id, { capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'cambridge-tep-them', b.id, { so: daLuu.length });
    res.status(201).json({ ok: true, tep: tepCua(b.id) });
  });

  app.delete('/api/cambridge/:id/tep/:tepId', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    const t = db.first('cambridge_tep', 'SELECT * FROM cambridge_tep WHERE id = ? AND baiId = ?', [chuoi(req.params.tepId, 40), b.id]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    db.remove('cambridge_tep', t.id);
    uploads.removeTaiLieu(t.file);
    db.audit(req.user.id, 'cambridge-tep-xoa', b.id, { tenGoc: t.tenGoc });
    res.json({ ok: true, tep: tepCua(b.id) });
  });

  // Tải một tệp. Kiểm quyền TRƯỚC khi kiểm tệp có tồn tại, cùng lý do với ảnh.
  app.get('/api/cambridge/tep/:tepId', (req, res) => {
    const t = db.first('cambridge_tep', 'SELECT * FROM cambridge_tep WHERE id = ?', [chuoi(req.params.tepId, 40)]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    const chu = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [t.baiId]);
    if (!chu || !xemDuoc(chu, req.user)) return res.status(403).json({ error: 'Không có quyền tải tệp này' });
    const cacCon = luaTuoiCuaCon(req.user);
    if (!hopLua(khungCua(chu.id), cacCon)) return res.status(403).json({ error: 'Tệp này thuộc bài dành cho lứa tuổi khác' });
    const duong = uploads.pathOfTaiLieu(t.file);
    if (!duong || !uploads.existsTaiLieu(t.file)) return res.status(404).json({ error: 'Tệp không còn trên máy chủ' });
    res.setHeader('Content-Type', uploads.mimeOfTaiLieu(t.file));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(t.tenGoc)}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  void homNay;
};
