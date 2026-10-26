// KẾ HOẠCH CỦA BÉ — kế hoạch tháng cho từng bé, có phê duyệt.
//
// ĐỌC TRƯỚC KHI XOÁ BẤT CỨ THỨ GÌ Ở ĐÂY (Câu 2, trường trả lời 15/09/2026).
//
// Trong đợt phản hồi 35 câu, nhà trường viết: *"Class Progress bỏ đi vì đã
// lồng ghép trong lịch sinh hoạt rồi"*. Đọc theo nghĩa đen là xoá phân hệ này,
// và làm thế thì trường mất chỗ DUY NHẤT trong app để lập kế hoạch riêng cho
// từng bé, cộng quy trình duyệt, cộng phần tự điền của Báo cáo học tập.
//
// Thứ đã lồng ghép vào Lịch sinh hoạt là KẾ HOẠCH GIÁO DỤC — kế hoạch tháng
// của cả NHÓM, khoá `kehoach` trong `lib/modules.js`, gộp từ Đ148. Còn thứ
// mang tên "Class Progress" trong sổ lại chính là phân hệ này: kế hoạch tháng
// cho TỪNG BÉ. Hai thứ khác hẳn nhau, trùng tên là do sổ cũ đặt tên tiếng Anh.
//
// Đã hỏi thẳng và trường trả lời một chữ: **"Đúng"** — bỏ mục của cả nhóm,
// KHÔNG bỏ phần riêng từng bé. Nên phân hệ này ở nguyên, và câu trên không
// phải là căn cứ để gỡ nó.
//
// HAI RỦI RO ĐÃ ĐƯỢC NÊU TRƯỚC KHI VIẾT DÒNG ĐẦU TIÊN
//
//   1. KHỐI LƯỢNG NHẬP LIỆU CHO CÔ RẤT LỚN. Một nhóm 20 bé nhân 5 góc lĩnh
//      vực là 100 ô mỗi tháng. Bắt cô gõ 100 ô là bảo đảm phân hệ này bị bỏ
//      xó sau tháng thứ hai. Nên ở đây có ba đường tắt, và cả ba đều là
//      đường CHÍNH chứ không phải tiện ích thêm:
//
//        • "Đặt cả nhóm": gõ 5 dòng, cả 20 bé có kế hoạch, rồi sửa lẻ bé nào
//          khác. Cùng họ với "đặt nhanh cho cả nhóm" của Nhật ký ngày.
//        • "Chép tháng trước": một lần bấm, và những mục cô đã đánh dấu
//          "tiếp tục ở tháng sau" được mang sang trước tiên.
//        • Lưu CẢ NHÓM trong một giao dịch, không phải 20 lần bấm Lưu.
//
//   2. VẾ CUỐI THÁNG CỦA NHÀ TRƯỜNG CHẠM QUY TẮC 2. Nhà trường mô tả bước
//      cuối tháng bằng một cặp từ đúng/sai rồi ôn tiếp. Giữ nguyên tinh
//      thần — nhìn lại, và làm tiếp thứ chưa xong — nhưng đổi cách nói và đổi
//      cả cấu trúc dữ liệu: `ketQua` dùng đúng năm trạng thái của phân hệ Hành
//      trình học tập, không có giá trị nào là một trong cặp từ đó. Phần "ôn
//      tiếp" thành ô tích `tiepTucThangSau` — trung tính, và cũng chính là
//      việc-làm-tiếp mà QUY TẮC 5 đòi hỏi.
//
//      Chú thích này CỐ Ý không chép lại nguyên văn cặp từ kia. Bài test quét
//      cả chú thích, và một bộ canh có ngoại lệ "trong ngoặc kép thì không
//      tính" là một bộ canh có lỗ.
//
// ĐỢT 2 — PHẢN HỒI NHÀ TRƯỜNG 07/09, ba việc thêm vào tệp này:
//
//   • DANH MỤC BÀI HỌC theo góc lĩnh vực, cô TÍCH CHỌN thay vì gõ. Nhà trường:
//     "Từ những tên bài học có sẵn, cô sẽ tích chọn trong tháng đó bé sẽ được
//     học những bài nào, cần ôn tập thêm hay mở rộng thêm." Ô chữ tự do giữ
//     nguyên làm tuỳ chọn — hai cách lập cùng tồn tại, không cách nào bắt buộc.
//   • ĐỀ XUẤT SỬA kế hoạch ĐÃ DUYỆT: "Khi có điều chỉnh khác lộ trình ban đầu
//     thì có quyền đề xuất sửa, ghi rõ lý do rồi quản lý mới phê duyệt."
//   • NHÌN LẠI TỪNG BÀI ở HAI MỨC, chữ trung tính: "Đã thấy con làm được" và
//     "Tiếp tục cùng con". Bài "tiếp tục" tự được gợi ý khi lập tháng sau.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const huyHieu = require('../../lib/huy-hieu');
const baoNT = require('../../lib/bao-nha-truong');

const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// SÁU GÓC LĨNH VỰC của lớp học CASA — do nhà trường liệt kê.
//
// Bản đầu có năm; "Văn hoá" thêm ở đợt 2 cho khớp mẫu báo cáo tháng lứa 3–6
// của chính nhà trường (mẫu ấy có sáu lĩnh vực nhận thức). Mã 'cambridge' giữ
// nguyên vì kế hoạch đã lưu và mẫu báo cáo đang trỏ vào mã đó; chỉ đổi nhãn.
const GOC_LINH_VUC = [
  ['toan', 'Toán'],
  ['tieng-viet', 'Tiếng Việt'],
  ['cambridge', 'Tiếng Anh (Cambridge)'],
  ['thuc-hanh-cuoc-song', 'Thực hành cuộc sống'],
  ['giac-quan', 'Giác quan'],
  ['van-hoa', 'Văn hoá'],
  // GÓC THỨ BẢY, THÊM Ở Đ195 (việc 22) — và đây là chỗ cần đọc kỹ.
  //
  // Sáu góc trên là danh sách của chính nhà trường. Góc này KHÔNG có trong
  // danh sách ấy, nhưng trường lại nói rõ (Câu 11) rằng một trong ba nhóm cô
  // là "GV P.E – phụ trách chương trình thể chất chuyên sâu", và cả ba nhóm
  // "sẽ giúp lên kế hoạch và đánh giá -> báo cáo học tập cho từng trẻ".
  //
  // Không có góc này thì cô thể chất mở màn Kế hoạch ra và KHÔNG CÓ CHỖ NÀO
  // để soạn — tab thứ ba rỗng vĩnh viễn, và phần việc trường vừa giao cho cô
  // ấy không tồn tại trong app. Thêm một góc là cách rẻ nhất để lời trường
  // nói và thứ trên màn hình khớp nhau.
  //
  // Thêm là AN TOÀN: `MA_GOC` chỉ nới rộng ra, không hẹp lại, nên mọi kế
  // hoạch đã lưu vẫn hợp lệ y như cũ.
  //
  // Đã ghi để hỏi nhà trường: sáu góc kia có tên trong tài liệu của trường,
  // góc này do tôi đặt theo chữ trường dùng cho nhóm cô. Trường muốn gọi khác
  // thì đổi nhãn ở đây, mã giữ nguyên.
  ['the-chat', 'Thể chất'],
];
const MA_GOC = GOC_LINH_VUC.map(x => x[0]);

// ===========================================================================
// MỖI GÓC THUỘC CHƯƠNG TRÌNH NÀO (Đ195, việc 22)
// ===========================================================================
//
// Nhà trường muốn màn Kế hoạch chia theo BA CHƯƠNG TRÌNH chứ không theo bảy
// góc. Nhưng hai cách chia ấy KHÔNG thay thế nhau, và đó là điều quan trọng
// nhất ở khối này:
//
//   • GÓC là thứ cô soạn và tích bài — mịn, và kế hoạch đã lưu đang trỏ vào
//     mã góc. Đổi nó là làm hỏng dữ liệu đã có, thứ Nguyên tắc số 1 cấm.
//   • CHƯƠNG TRÌNH là cách NHÌN, gộp mấy góc lại thành một tab cho đúng ba
//     nhóm cô của trường.
//
// Nên đây là một BẢN ĐỒ GỘP, không phải một cột mới: góc giữ nguyên, thêm một
// tầng nhìn ở trên. Không một dòng dữ liệu nào phải sửa.
//
// Mã chương trình dùng ĐÚNG mã nhóm cô của `lib/nhom-co.js` — không đặt bộ mã
// thứ hai cho cùng một khái niệm, vì hai bộ mã là hai bộ sẽ trôi khỏi nhau.
const nhomCo = require('../../lib/nhom-co');
const CHUONG_TRINH_CUA_GOC = {
  'toan': 'chu-nhiem',
  'tieng-viet': 'chu-nhiem',
  'thuc-hanh-cuoc-song': 'chu-nhiem',
  'giac-quan': 'chu-nhiem',
  'van-hoa': 'chu-nhiem',
  'cambridge': 'nuoc-ngoai',
  'the-chat': 'the-chat',
};
// Góc lạ (dữ liệu cũ, hoặc trường tự thêm sau) thì về chương trình của cô phụ
// trách nhóm — nơi nào cũng thấy còn hơn biến mất khỏi mọi tab.
function chuongTrinhCuaGoc(ma) {
  return CHUONG_TRINH_CUA_GOC[String(ma || '')] || nhomCo.MAC_DINH;
}
// Ba tab, kèm danh sách góc của từng tab, để màn hình không phải tự gộp lại.
function tabChuongTrinh() {
  return nhomCo.NHOM.map(([ma, ten, ct]) => ({
    ma, ten, chuongTrinh: ct,
    goc: GOC_LINH_VUC.filter(([g]) => chuongTrinhCuaGoc(g) === ma).map(([g, t]) => ({ ma: g, ten: t })),
  }));
}

// BA NHÃN cho một bài đã tích — đúng ba chữ của nhà trường.
// Góp ý 06/10 (mục 6): trường gọi là "Dạy mới" — chữ của người dạy. Mã giữ
// nguyên 'hoc-moi' vì kế hoạch đã lưu và báo cáo học tập đang trỏ vào mã đó.
const NHAN_BAI = [
  ['hoc-moi', 'Dạy mới'],
  ['on-tap', 'Ôn tập'],
  ['mo-rong', 'Mở rộng'],
];
const MA_NHAN = NHAN_BAI.map(x => x[0]);

// HAI MỨC NHÌN LẠI CHO TỪNG BÀI — CHỮ TRUNG TÍNH, ĐÚNG QUY TẮC 2.
//
// Nhà trường tả bước cuối tháng bằng một cặp từ đúng/sai. Ở đây giữ đúng hai
// mức như nhà trường cần, nhưng mức thứ hai là một VIỆC-LÀM-TIẾP ("tiếp tục
// cùng con"), không phải một dấu trừ. Và cũng chính nó là thứ được gợi ý sẵn
// khi lập kế hoạch tháng sau — QUY TẮC 5.
const KET_LUAN_BAI = [
  ['da-thay', 'Đã thấy con làm được'],
  ['tiep-tuc', 'Tiếp tục cùng con'],
];
const MA_KET_LUAN = KET_LUAN_BAI.map(x => x[0]);

// DANH MỤC MẶC ĐỊNH theo tinh thần Montessori, nạp LƯỜI khi bảng còn trống.
//
// Đây là điểm xuất phát để cô có thứ mà tích ngay ngày đầu, không phải bản
// chốt: văn phòng thêm / sửa / ẩn từng bài ở màn Quản trị. Không INSERT trong
// schema.sql vì tệp đó chạy mỗi lần khởi động và bộ kiểm tra lược đồ chỉ nhận
// CREATE.
const BAI_MAC_DINH = {
  'toan': [
    'Gậy số', 'Số nhám', 'Hộp con quay', 'Thẻ số và hạt', 'Hạt cườm vàng',
    'Bảng Seguin 1 (11–19)', 'Bảng Seguin 2 (10–99)', 'Chuỗi hạt 100', 'Bảng cộng', 'Bảng trừ',
  ],
  'tieng-viet': [
    'Trò chơi âm thanh', 'Chữ nhám', 'Bảng chữ rời', 'Hộp đồ vật – chữ cái',
    'Ghép từ ba âm', 'Thẻ từ – tranh', 'Đọc sách cùng cô', 'Kể chuyện theo tranh', 'Tô hình – cầm bút',
  ],
  'cambridge': [
    'Colours', 'Numbers 1–10', 'Animals', 'My family', 'Body parts',
    'Food', 'Shapes', 'Greetings & songs', 'Classroom objects', 'Weather',
  ],
  'thuc-hanh-cuoc-song': [
    'Rót nước', 'Xúc hạt', 'Cài khuy', 'Gấp khăn', 'Lau bàn', 'Rửa tay',
    'Mang khay', 'Đi trên vạch', 'Mặc áo khoác', 'Cắm hoa', 'Tưới cây',
  ],
  'giac-quan': [
    'Tháp hồng', 'Cầu thang nâu', 'Gậy đỏ', 'Trụ có núm', 'Hộp màu 1', 'Hộp màu 2',
    'Hộp màu 3', 'Túi bí mật', 'Hộp âm thanh', 'Bảng nhám', 'Tam giác dựng hình',
  ],
  'van-hoa': [
    'Quả địa cầu cát – nước', 'Bản đồ ghép châu lục', 'Thẻ động vật – nơi sống',
    'Vòng đời của bướm', 'Chìm – nổi', 'Nam châm hút gì', 'Bộ phận của cây', 'Bốn mùa trong năm', 'Cờ các nước',
  ],
  // Bài mở màn cho góc Thể chất (Đ195, việc 22). Danh mục này cô sửa được
  // ngay trong app, nên đây chỉ là chỗ để cô thể chất không phải mở màn ra
  // trước một danh sách rỗng — một danh sách rỗng là chỗ người ta đóng app lại.
  'the-chat': [
    'Đi theo vạch', 'Bật xa tại chỗ', 'Ném bóng trúng đích', 'Bò chui qua cổng',
    'Đi thăng bằng trên ghế', 'Chuyền bóng qua đầu', 'Chạy đổi hướng theo hiệu lệnh',
    'Nhảy lò cò', 'Leo thang gióng', 'Khởi động cùng nhạc',
  ],
};

// NĂM TRẠNG THÁI — PHẢI TRÙNG KHỚP với phân hệ Hành trình học tập.
//
// Cố ý chép lại thay vì gọi sang phân hệ kia: hai phân hệ cắm thêm không được
// phụ thuộc nhau, tắt cái này thì cái kia phải chạy y nguyên. Đổi lại, bài
// test đối chiếu hai danh sách với nhau và báo đỏ nếu chúng trôi khỏi nhau —
// một bản chép có người canh thì an toàn hơn một mối phụ thuộc chéo.
const KET_QUA = [
  ['chua-day', 'Chưa dạy'],
  ['chua-quan-sat-thay', 'Chưa quan sát thấy'],
  ['dang-hinh-thanh', 'Đang hình thành'],
  ['da-vung', 'Đã vững'],
  ['vuot-troi', 'Vượt trội'],
];
const MA_KET_QUA = KET_QUA.map(x => x[0]);

// NHÃN NHÀ TRƯỜNG ĐÃ SỬA, NẾU CÓ (Đ185, Câu 6). Xem chú thích cùng tên ở
// `modules/hanhtrinh/routes.js` — hai phân hệ phủ nhãn theo đúng một cách, và
// cả hai đều giữ nguyên MÃ.
const ndg = require('../../lib/nhan-danh-gia');
function ketQuaDangDung(db) {
  return ndg.nhanDangDung(db, KET_QUA);
}

// CHỮ QUY ƯỚC của năm trạng thái — đúng bộ chữ nhà trường in trên tờ giấy và
// phân hệ Báo cáo học tập đang hiện (M/S/W/N/NA). Chỉ là NHÃN đọc kèm, không
// nơi nào so sánh hay sắp xếp theo nó (QUY TẮC 4).
const CHU_QUY_UOC = { 'chua-day': 'NA', 'chua-quan-sat-thay': 'N', 'dang-hinh-thanh': 'W', 'da-vung': 'S', 'vuot-troi': 'M' };
// "Tiếp tục ở tháng sau" (góp ý 06/10, mục 7): các cách mang bài sang tháng
// sau. Mã trùng mã nhãn bài (NHAN_BAI) — bài mang sang được tích đúng nhãn ấy.
// Góp ý 20/10 (N6): thêm "Mở rộng ở tháng sau". Cột `tiepTuc` là TEXT, chỉ thêm
// một giá trị, không đổi bảng.
const TIEP_TUC = [
  ['hoc-moi', 'Dạy mới ở tháng sau'],
  ['on-tap', 'Ôn tập ở tháng sau'],
  ['mo-rong', 'Mở rộng ở tháng sau'],
];
const MA_TIEP_TUC = TIEP_TUC.map(x => x[0]);
// Nhãn bài mang sang tháng sau của một dòng bài đã nhìn lại.
function nhanTiepTuc(m) {
  return MA_TIEP_TUC.includes(m.tiepTuc) ? m.tiepTuc : 'on-tap';
}

const TRANG_THAI_DUYET = ['nhap', 'cho-duyet', 'da-duyet', 'tra-lai'];

const TOI_DA_NOI_DUNG = 500;
const TOI_DA_NHAN_XET = 500;
const TOI_DA_MUC_MOI_BE = 12;
// Trần cho một lần lưu cả nhóm — nhóm đông nhất của trường vẫn dưới xa con số
// này, còn số lớn hơn thì gần như chắc chắn là lỗi ở phía gửi.
const TOI_DA_BE_MOT_LAN = 60;
// Trần cho số bài tích một bé một tháng, và cho tên / mô tả / lý do — đều là
// TRẦN chặn dữ liệu lỗi, không phải sàn nào về đứa trẻ.
const TOI_DA_BAI_MOI_BE = 40;
const TOI_DA_TEN_BAI = 120;
const TOI_DA_MO_TA = 300;
const TOI_DA_LY_DO = 500;
const TOI_DA_DE_XUAT_NOI_DUNG = 1500;

function thangNay() {
  return ngay.thangNay();
}

// ===========================================================================
// GÓP Ý 06/10 (mục 6) — BA CHƯƠNG TRÌNH, MỖI CÔ TỰ LƯU NHÁP VÀ GỬI DUYỆT
// ===========================================================================
//
// Mã chương trình là mã nhóm cô của `lib/nhom-co.js` (chu-nhiem = Montessori &
// Kỹ năng sống, nuoc-ngoai = Cambridge, the-chat = Thể chất chuyên sâu).
const MA_CT = nhomCo.NHOM.map(x => x[0]);
function gocCuaCt(ct) {
  return MA_GOC.filter(g => chuongTrinhCuaGoc(g) === ct);
}

// LỨA TUỔI CỦA KHO BÀI: 3–4, 4–5, 5–6 — đúng ba lứa nhà trường đặt. Tính ở
// GIỮA tháng lập kế hoạch. Bé dưới 48 tháng (kể cả bé nhà trẻ) dùng kho 3–4:
// trường chưa có kho riêng cho dưới 3 tuổi, và một danh sách gần nhất có ích
// hơn một danh sách trống. Đây là chỗ XẾP KHO BÀI, không phải nhận định về bé
// — không so bé với "chuẩn" nào (QUY TẮC 4).
const LUA_KHO = [['3-4', '3–4 tuổi'], ['4-5', '4–5 tuổi'], ['5-6', '5–6 tuổi']];
const MA_LUA_KHO = LUA_KHO.map(x => x[0]);
function luaKhoCuaBe(dob, thang) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob)) || !THANG_RE.test(String(thang || ''))) return '';
  const [ns, ts, ds] = String(dob).split('-').map(Number);
  const [nm, tm] = String(thang).split('-').map(Number);
  let soThang = (nm - ns) * 12 + (tm - ts);
  if (15 < ds) soThang -= 1;
  if (soThang < 48) return '3-4';
  return soThang < 60 ? '4-5' : '5-6';
}

function thangTruoc(thang) {
  const [nam, th] = thang.split('-').map(Number);
  const d = new Date(Date.UTC(nam, th - 2, 1));
  return d.toISOString().slice(0, 7);
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

module.exports = (app, { db, modules }) => {
  function nhomCuaToi(user) {
    return db.classIdsOf(user).map(id => db.findClass(id))
      .filter(c => c && c.active !== false && c.active !== 0);
  }

  function beCuaNhom(classId) {
    return db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
  }

  function mucCuaKe(keId) {
    return db.all('kehoachbe_muc',
      'SELECT * FROM kehoachbe_muc WHERE keId = ? ORDER BY rowid', [keId])
      .map(m => ({ ...m, tiepTucThangSau: m.tiepTucThangSau !== 0 }));
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // ---------------------------------------------------------- DANH MỤC BÀI

  // Nạp bộ mặc định đúng MỘT LẦN, khi bảng còn trống. Văn phòng ẩn hết đi
  // rồi thì bảng vẫn có dòng (active = 0) nên không nạp lại — ẩn là quyết
  // định của trường, không phải một lỗi cần máy sửa.
  function napDanhMucNeuTrong() {
    if (db.count('SELECT COUNT(*) AS n FROM kehoachbe_baihoc')) return;
    const luc = new Date().toISOString();
    db.tx(() => {
      for (const [goc, ds] of Object.entries(BAI_MAC_DINH)) {
        ds.forEach((ten, i) => db.insert('kehoachbe_baihoc', {
          id: db.nextId('khbh'), gocLinhVuc: goc, ten, moTa: '', thuTu: i,
          active: 1, nguoiTao: null, taoLuc: luc,
        }));
      }
    });
  }

  function danhMucBai({ tatCa = false } = {}) {
    napDanhMucNeuTrong();
    const lua = new Map();
    try {
      for (const r of db.all('kehoachbe_baihoc_lua', 'SELECT * FROM kehoachbe_baihoc_lua ORDER BY lua')) {
        if (!lua.has(r.baiHocId)) lua.set(r.baiHocId, []);
        lua.get(r.baiHocId).push(r.lua);
      }
    } catch (_) { /* chưa có bảng lứa: mọi bài dùng cho mọi lứa */ }
    return db.all('kehoachbe_baihoc',
      `SELECT * FROM kehoachbe_baihoc ${tatCa ? '' : 'WHERE active = 1'} ORDER BY gocLinhVuc, thuTu, rowid`)
      .map(b => ({ ...b, active: b.active !== 0, lua: lua.get(b.id) || [] }));
  }

  // Bài đã tích của một kế hoạch, kèm tên và góc lấy từ danh mục. Bài đã bị
  // ẨN sau này vẫn hiện đúng tên — kế hoạch tháng cũ không được đổi nghĩa.
  function baiCuaKe(keId) {
    let rows;
    try {
      rows = db.all('kehoachbe_muc_bai',
        `SELECT mb.*, b.ten AS ten, b.gocLinhVuc AS gocLinhVuc, d.mucDo AS mucDo, d.tiepTuc AS tiepTuc
           FROM kehoachbe_muc_bai mb LEFT JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
           LEFT JOIN kehoachbe_bai_muc_do d ON d.mucBaiId = mb.id
          WHERE mb.keId = ? ORDER BY mb.rowid`, [keId]);
    } catch (_) {
      // Chưa có bảng mức độ (lần khởi động đầu lỗi giữa chừng): đọc như cũ.
      rows = db.all('kehoachbe_muc_bai',
        `SELECT mb.*, b.ten AS ten, b.gocLinhVuc AS gocLinhVuc
           FROM kehoachbe_muc_bai mb LEFT JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
          WHERE mb.keId = ? ORDER BY mb.rowid`, [keId]);
    }
    return rows.map(m => ({ ...m, ten: m.ten || '(bài đã gỡ khỏi danh mục)', gocLinhVuc: m.gocLinhVuc || '',
      mucDo: m.mucDo || '', tiepTuc: m.tiepTuc || '',
      tiepTucThangSau: m.tiepTucThangSau !== 0 }));
  }

  function ghiMucDo(mucBaiId, mucDo, tiepTuc, nguoiGhi, luc) {
    if (!mucDo && !tiepTuc) {
      db.run('DELETE FROM kehoachbe_bai_muc_do WHERE mucBaiId = ?', [mucBaiId]);
      return;
    }
    db.run(`INSERT INTO kehoachbe_bai_muc_do (mucBaiId, mucDo, tiepTuc, nguoiGhi, capNhatLuc) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(mucBaiId) DO UPDATE SET mucDo = excluded.mucDo, tiepTuc = excluded.tiepTuc,
              nguoiGhi = excluded.nguoiGhi, capNhatLuc = excluded.capNhatLuc`,
    [mucBaiId, mucDo || '', tiepTuc || '', nguoiGhi || null, luc]);
  }

  // Đề xuất gần nhất của một kế hoạch (đang chờ thì ưu tiên).
  // Báo người của nhà trường (Đ154). Bọc một chỗ để phân hệ đang TẮT thì không
  // gửi gì, và một lỗi ở đường đẩy không làm hỏng lượt gửi của cô.
  function baoNhaTruong(studentId, goi) {
    try {
      if (!modules.dangBat('kehoachbe')) return 0;
      return baoNT.guiChoQuanLyCuaBe(studentId, goi);
    } catch (_) { return 0; }
  }
  function baoNhaTruongTheoNhom(classId, goi) {
    try {
      if (!modules.dangBat('kehoachbe')) return 0;
      return baoNT.guiChoQuanLyCuaNhom(classId, goi);
    } catch (_) { return 0; }
  }

  function deXuatCuaKe(keId) {
    const cho = db.first('kehoachbe_de_xuat',
      "SELECT * FROM kehoachbe_de_xuat WHERE keId = ? AND trangThai = 'cho-duyet' ORDER BY taoLuc DESC LIMIT 1", [keId]);
    const d = cho || db.first('kehoachbe_de_xuat',
      'SELECT * FROM kehoachbe_de_xuat WHERE keId = ? ORDER BY taoLuc DESC LIMIT 1', [keId]);
    return d ? { ...d, coDeXuatTen: tenNguoi(d.coDeXuat), nguoiDuyetTen: tenNguoi(d.nguoiDuyet) } : null;
  }

  // Chương trình của một đề xuất (Đ229 ghi ở bảng phụ); đề xuất đời cũ không có
  // dòng phụ thì là đề xuất cho CẢ BẢN — trả null.
  function ctCuaDeXuat(deXuatId) {
    try {
      const r = db.first('kehoachbe_de_xuat_ct', 'SELECT chuongTrinh FROM kehoachbe_de_xuat_ct WHERE deXuatId = ?', [deXuatId]);
      return r ? r.chuongTrinh : null;
    } catch (_) { return null; }
  }

  // ĐỀ XUẤT THEO TỪNG CHƯƠNG TRÌNH (vòng rà Đ232). Đề xuất của cô Montessori
  // không được hiện — và không được chặn — ở tab Cambridge. Đề xuất đời cũ
  // (cả bản) thì vẫn áp cho mọi phần như trước. Khoá cũ `deXuat` giữ nguyên.
  function deXuatTheoCt(keId) {
    const ds = db.all('kehoachbe_de_xuat',
      'SELECT * FROM kehoachbe_de_xuat WHERE keId = ? ORDER BY taoLuc DESC LIMIT 50', [keId]);
    const ra = {};
    for (const ct of MA_CT) {
      const cua = ds.filter(d => { const c = ctCuaDeXuat(d.id); return c === null || c === ct; });
      const d = cua.find(x => x.trangThai === 'cho-duyet') || cua[0] || null;
      ra[ct] = d ? { ...d, coDeXuatTen: tenNguoi(d.coDeXuat), nguoiDuyetTen: tenNguoi(d.nguoiDuyet) } : null;
    }
    return ra;
  }

  function keCuaBe(studentId, thang) {
    const k = db.first('kehoachbe_ke',
      'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [studentId, thang]);
    if (!k) return null;
    const tt = trangThaiCt(k);
    return {
      ...k,
      coLapTen: tenNguoi(k.coLap),
      nguoiDuyetTen: tenNguoi(k.nguoiDuyet),
      muc: mucCuaKe(k.id),
      baiHoc: baiCuaKe(k.id),
      deXuat: deXuatCuaKe(k.id),
      deXuatTheoCt: deXuatTheoCt(k.id),
      // Trạng thái từng chương trình (góp ý 06/10, mục 6) — thêm khoá mới,
      // không đổi khoá cũ.
      chuongTrinh: Object.fromEntries(MA_CT.map(ct => [ct, {
        ...tt[ct], coLapTen: tenNguoi(tt[ct].coLap), nguoiDuyetTen: tenNguoi(tt[ct].nguoiDuyet),
      }])),
    };
  }

  // "Tháng trước" của một bé = THÁNG GẦN NHẤT bé có kế hoạch, lùi tối đa 12
  // tháng — cùng luật với nút "Chép tháng trước" (xem chú thích ở đó).
  function keGanNhatTruoc(studentId, thang) {
    const lui12 = `${Number(thang.slice(0, 4)) - 1}${thang.slice(4)}`;
    return db.first('kehoachbe_ke',
      `SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang < ? AND thang >= ?
        ORDER BY thang DESC LIMIT 1`, [studentId, thang, lui12]);
  }

  // GỢI Ý CHO THÁNG SAU — QUY TẮC 5 thành một việc máy làm giúp.
  //
  // Bài cô kết luận "Tiếp tục cùng con" (hoặc tích "tiếp tục ở tháng sau") ở
  // tháng gần nhất được đưa lên sẵn khi lập tháng này. Chỉ là GỢI Ý: màn hình
  // tích sẵn, cô bỏ tích được, và không có gì được ghi cho tới khi cô bấm Lưu.
  function goiYChoThang(studentId, thang) {
    const cu = keGanNhatTruoc(studentId, thang);
    if (!cu) return { tuThang: '', baiHoc: [], muc: [] };
    return {
      tuThang: cu.thang,
      baiHoc: baiCuaKe(cu.id)
        .filter(m => m.ketQua === 'tiep-tuc' || m.tiepTucThangSau)
        // "Tiếp tục ở tháng sau": gợi ý đúng nhãn cô chọn (dạy mới · ôn tập ·
        // mở rộng); cô chưa chọn (kết luận hai mức đời cũ) thì ôn tập như trước.
        .map(m => ({ baiHocId: m.baiHocId, ten: m.ten, gocLinhVuc: m.gocLinhVuc, nhanXet: m.nhanXet,
          nhan: nhanTiepTuc(m) })),
      muc: mucCuaKe(cu.id)
        .filter(m => m.tiepTucThangSau)
        .map(m => ({ gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung, nhanXet: m.nhanXet })),
    };
  }

  // Đọc danh sách bài tích từ thân yêu cầu. Trả về null khi màn hình KHÔNG
  // gửi trường này (bản app cũ) — null nghĩa là "không đụng tới", khác với
  // mảng rỗng nghĩa là "bỏ tích hết".
  function docBaiHoc(x, res, ct = null) {
    if (!x || !Array.isArray(x.baiHoc)) return null;
    const ra = [];
    const daCo = new Set();
    for (const b of x.baiHoc) {
      const id = chuoi((b || {}).baiHocId, 40);
      if (!id || daCo.has(id)) continue;
      const bai = db.first('kehoachbe_baihoc', 'SELECT * FROM kehoachbe_baihoc WHERE id = ?', [id]);
      if (!bai) { res.status(400).json({ error: 'Có bài học không còn trong danh mục' }); return undefined; }
      if (ct && chuongTrinhCuaGoc(bai.gocLinhVuc) !== ct) {
        res.status(400).json({ error: `Bài "${bai.ten}" không thuộc chương trình ${nhomCo.CHUONG_TRINH[ct] || ct}` });
        return undefined;
      }
      const nhan = chuoi((b || {}).nhan, 20) || 'hoc-moi';
      if (!MA_NHAN.includes(nhan)) { res.status(400).json({ error: 'Nhãn bài học phải là học mới, ôn tập hoặc mở rộng' }); return undefined; }
      daCo.add(id);
      ra.push({ baiHocId: id, nhan });
    }
    if (ra.length > TOI_DA_BAI_MOI_BE) {
      res.status(400).json({ error: `Mỗi bé tối đa ${TOI_DA_BAI_MOI_BE} bài một tháng` });
      return undefined;
    }
    return ra;
  }

  // GHI ĐÈ danh sách bài của một kế hoạch, GIỮ phần nhìn lại cho bài còn được
  // tích — đổi nhãn (học mới → ôn tập) không đổi bài, nên nhận xét đi theo bài.
  function ghiBaiHoc(keId, ds, luc, ct = null) {
    const cu = baiCuaKe(keId);
    // Theo một chương trình (góp ý 06/10, mục 6): chỉ thay bài CỦA chương
    // trình đó — bài cô khác tích ở tab khác giữ nguyên.
    if (ct) {
      for (const o of cu) if (chuongTrinhCuaGoc(o.gocLinhVuc) === ct) db.run('DELETE FROM kehoachbe_muc_bai WHERE id = ?', [o.id]);
    } else db.run('DELETE FROM kehoachbe_muc_bai WHERE keId = ?', [keId]);
    // Dòng bài được ghi lại với mã MỚI, nên mức độ cuối tháng phải đi theo bài
    // sang dòng mới — không thì đổi một nhãn là mất phần đánh giá đã ghi.
    const xoa = ct ? cu.filter(o => chuongTrinhCuaGoc(o.gocLinhVuc) === ct) : cu;
    for (const o of xoa) { try { db.run('DELETE FROM kehoachbe_bai_muc_do WHERE mucBaiId = ?', [o.id]); } catch (_) { /* chưa có bảng */ } }
    for (const b of ds) {
      const giong = cu.find(o => o.baiHocId === b.baiHocId);
      const id = db.nextId('khmb');
      db.insert('kehoachbe_muc_bai', {
        id, keId, baiHocId: b.baiHocId, nhan: b.nhan,
        ketQua: giong ? giong.ketQua : '',
        nhanXet: giong ? giong.nhanXet : '',
        tiepTucThangSau: giong && giong.tiepTucThangSau ? 1 : 0,
        capNhatLuc: luc,
      });
      if (giong && (giong.mucDo || giong.tiepTuc)) {
        try { ghiMucDo(id, giong.mucDo, giong.tiepTuc, null, luc); } catch (_) { /* chưa có bảng */ }
      }
    }
  }

  // KHOÁ KHI ĐANG CHỜ DUYỆT, VÀ KHOÁ KHI ĐÃ DUYỆT.
  //
  // Sửa sau lưng người duyệt thì chữ ký duyệt không còn nghĩa gì. Cô muốn sửa
  // tiếp thì rút lại (`thu-hoi`) — một hành động có ghi lại, chứ không phải
  // sửa lén.
  //
  // Nhưng phần NHÌN LẠI CUỐI THÁNG thì vẫn ghi được trên bản đã duyệt — đó
  // chính là việc của cuối tháng, và nó không đụng tới nội dung đã duyệt.
  function duocSuaNoiDung(k) {
    return !k || k.trangThai === 'nhap' || k.trangThai === 'tra-lai';
  }

  function chanNeuKhoa(res, k) {
    if (duocSuaNoiDung(k)) return false;
    res.status(400).json({
      error: k.trangThai === 'cho-duyet'
        ? 'Kế hoạch này đã gửi quản lý duyệt nên đang khoá. Cô bấm "Rút lại" nếu muốn sửa tiếp.'
        : 'Kế hoạch này đã được duyệt nên phần nội dung khoá lại. Phần nhìn lại cuối tháng thì cô vẫn ghi được.',
    });
    return true;
  }

  // ---------------------------------------------- TRẠNG THÁI TỪNG CHƯƠNG TRÌNH

  function dongCt(keId) {
    try {
      return new Map(db.all('kehoachbe_ke_ct', 'SELECT * FROM kehoachbe_ke_ct WHERE keId = ?', [keId])
        .map(r => [r.chuongTrinh, r]));
    } catch (_) { return new Map(); }
  }

  // Phần nào của bản kế hoạch có nội dung: bài đã tích hoặc mục chữ, theo góc.
  function ctCoNoiDung(keId) {
    const co = new Set();
    for (const b of baiCuaKe(keId)) if (b.gocLinhVuc) co.add(chuongTrinhCuaGoc(b.gocLinhVuc));
    for (const m of mucCuaKe(keId)) co.add(chuongTrinhCuaGoc(m.gocLinhVuc));
    return co;
  }

  // Trạng thái của ba phần. Bản chưa có dòng ở bảng phụ (lập trước đợt này):
  // phần CÓ nội dung mang trạng thái của cả bản — đúng như nó đang hiện với
  // quản lý hôm nay; phần trống là nháp.
  function trangThaiCt(k) {
    const dong = dongCt(k.id);
    const co = ctCoNoiDung(k.id);
    const ra = {};
    for (const ct of MA_CT) {
      const r = dong.get(ct);
      const goc = r || (co.has(ct)
        ? { trangThai: k.trangThai, coLap: k.coLap, guiLuc: k.guiLuc, nguoiDuyet: k.nguoiDuyet,
          duyetLuc: k.duyetLuc, yKienDuyet: k.yKienDuyet, capNhatLuc: k.capNhatLuc }
        // Phần chưa ai soạn: KHÔNG có mốc. Mốc của cả bản đổi mỗi khi cô
        // khác lưu phần của họ — mượn mốc đó là cô soạn phần trống này bị báo
        // "đụng độ" oan với một phần cô không hề đụng tới.
        : { trangThai: 'nhap', coLap: null, guiLuc: null, nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: null });
      ra[ct] = {
        trangThai: TRANG_THAI_DUYET.includes(goc.trangThai) ? goc.trangThai : 'nhap',
        coLap: goc.coLap || null, guiLuc: goc.guiLuc || null,
        nguoiDuyet: goc.nguoiDuyet || null, duyetLuc: goc.duyetLuc || null,
        yKienDuyet: goc.yKienDuyet || '', capNhatLuc: goc.capNhatLuc || null,
        coNoiDung: co.has(ct), daTach: !!r,
      };
    }
    return ra;
  }

  // Tách bản kế hoạch ra ba phần (ghi ba dòng ở bảng phụ) ngay trước lần ghi
  // đầu tiên theo chương trình. Ghi đúng trạng thái đang hiện — không phần nào
  // đổi trạng thái chỉ vì được tách.
  function damBaoCt(k) {
    const tt = trangThaiCt(k);
    for (const ct of MA_CT) {
      if (tt[ct].daTach) continue;
      const { coNoiDung: _c, daTach: _d, ...r } = tt[ct];
      db.run(`INSERT OR IGNORE INTO kehoachbe_ke_ct
        (keId, chuongTrinh, trangThai, coLap, guiLuc, nguoiDuyet, duyetLuc, yKienDuyet, capNhatLuc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [k.id, ct, r.trangThai, r.coLap, r.guiLuc, r.nguoiDuyet, r.duyetLuc, r.yKienDuyet, r.capNhatLuc]);
    }
  }

  function datCt(keId, ct, vao) {
    const cot = Object.keys(vao);
    db.run(`UPDATE kehoachbe_ke_ct SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE keId = ? AND chuongTrinh = ?`,
      [...cot.map(c => vao[c]), keId, ct]);
  }

  // GIỮ `kehoachbe_ke.trangThai` ĐÚNG cho mọi chỗ đang đọc nó (Hành trình của
  // gia đình chỉ hiện bản 'da-duyet', huy hiệu, app đời cũ): gộp từ các phần
  // CÓ nội dung — còn phần nào chờ duyệt thì cả bản "chờ duyệt"; còn phần nào
  // bị gửi lại thì "gửi lại"; còn phần nào nháp thì "nháp"; tất cả đã duyệt
  // thì mới "đã duyệt".
  function dongBoKe(keId) {
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [keId]);
    if (!k) return;
    const tt = trangThaiCt(k);
    const co = MA_CT.filter(ct => tt[ct].coNoiDung).map(ct => tt[ct]);
    if (!co.length) {
      // Bản đã tách mà không còn phần nào có nội dung: cả bản là một bản nháp
      // trống — không để cột gộp kẹt "gửi lại" (vòng rà Đ232).
      if (MA_CT.some(ct => tt[ct].daTach) && k.trangThai === 'tra-lai') {
        db.update('kehoachbe_ke', k.id, { trangThai: 'nhap', guiLuc: null, yKienDuyet: '' });
      }
      return;
    }
    const gom = co.some(x => x.trangThai === 'cho-duyet') ? 'cho-duyet'
      : co.some(x => x.trangThai === 'tra-lai') ? 'tra-lai'
        : co.some(x => x.trangThai === 'nhap') ? 'nhap' : 'da-duyet';
    const moiNhat = (truong) => co.map(x => x[truong]).filter(Boolean).sort().pop() || null;
    const duyetCuoi = co.filter(x => x.duyetLuc).sort((a, b) => String(a.duyetLuc).localeCompare(String(b.duyetLuc))).pop();
    const traLai = co.find(x => x.trangThai === 'tra-lai');
    db.update('kehoachbe_ke', k.id, {
      trangThai: gom,
      guiLuc: gom === 'nhap' ? null : moiNhat('guiLuc'),
      nguoiDuyet: duyetCuoi ? duyetCuoi.nguoiDuyet : k.nguoiDuyet,
      duyetLuc: duyetCuoi ? duyetCuoi.duyetLuc : k.duyetLuc,
      yKienDuyet: traLai ? traLai.yKienDuyet : (gom === 'da-duyet' ? '' : k.yKienDuyet),
    });
  }

  // QUYỀN SOẠN TỪNG CHƯƠNG TRÌNH. Quản lý soạn được cả ba. Cô soạn phần của
  // vai cô ở nhóm đó (lib/nhom-co.js). Phần mà nhóm CHƯA khai cô nào giữ thì
  // cô phụ trách nhóm soạn thay — trường chưa khai vai thì mọi thứ chạy y như
  // trước đợt này (Nguyên tắc số 1).
  function ctCuaCo(user, classId) {
    if (user.role === 'admin') return MA_CT.slice();
    const cua = nhomCo.nhomCua(db, classId, user.id);
    const ds = [cua];
    if (cua === nhomCo.MAC_DINH) {
      const daKhai = new Set(Object.values(nhomCo.nhomTheoLop(db, classId)));
      for (const ct of MA_CT) if (ct !== cua && !daKhai.has(ct)) ds.push(ct);
    }
    return ds;
  }
  function chanNeuKhongPhanCua(res, user, classId, ct) {
    if (ctCuaCo(user, classId).includes(ct)) return false;
    res.status(403).json({
      error: `Phần ${nhomCo.CHUONG_TRINH[ct] || ct} do ${(nhomCo.TEN_NHOM[ct] || 'cô phụ trách').toLowerCase()} của nhóm soạn. `
        + 'Cô mở đúng tab chương trình của mình nhé.',
    });
    return true;
  }
  function chanNeuCtKhoa(res, tt) {
    if (tt.trangThai === 'nhap' || tt.trangThai === 'tra-lai') return false;
    res.status(400).json({
      error: tt.trangThai === 'cho-duyet'
        ? 'Phần này đã gửi quản lý duyệt nên đang khoá. Cô bấm "Rút lại" nếu muốn sửa tiếp.'
        : 'Phần này đã được duyệt nên nội dung khoá lại. Phần nhìn lại cuối tháng thì cô vẫn ghi được.',
    });
    return true;
  }

  // Báo cô đã gửi duyệt: được duyệt, hay được gửi lại kèm lý do. Tin đẩy là
  // dấu hiệu NGAY; huy hiệu ở cuối tệp là dấu vết BỀN (đếm phần bị gửi lại).
  function baoCo(coId, goi) {
    try {
      if (!coId || !modules.dangBat('kehoachbe')) return;
      require('../../lib/day').guiChoNguoi(coId, goi).catch(() => {});
    } catch (_) { /* đẩy là việc phụ */ }
  }

  function luaCuaBai(baiHocId) {
    try {
      return db.all('kehoachbe_baihoc_lua', 'SELECT lua FROM kehoachbe_baihoc_lua WHERE baiHocId = ? ORDER BY lua', [baiHocId])
        .map(r => r.lua);
    } catch (_) { return []; }
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================

  // Cả nhóm, một tháng — màn chính của cô.
  app.get('/api/kehoachbe', requireRole('teacher', 'admin'), (req, res) => {
    const classId = chuoi(req.query.classId, 40) || (nhomCuaToi(req.user)[0] || {}).id || '';
    if (!classId) return res.json({ thang: thangNay(), classId: '', danhSach: [] });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của nhóm này' });
    }
    const thang = THANG_RE.test(String(req.query.thang || '')) ? req.query.thang : thangNay();

    const danhSach = beCuaNhom(classId).map(b => {
      const ke = keCuaBe(b.id, thang);
      return {
        studentId: b.id, hoTen: b.name, avatar: b.avatar, ke,
        // Lứa của kho bài cho bé này ở tháng đang xem (góp ý 06/10, mục 6).
        lua: luaKhoCuaBe(b.dob, thang),
        // Gợi ý từ tháng gần nhất — chỉ khi bé CHƯA có bản tháng này; đã có
        // bản thì cô đã quyết rồi, gợi ý nữa là nói chen.
        goiY: ke ? null : goiYChoThang(b.id, thang),
        // KHOÁ MỚI (vòng rà Đ232): bé đã có bản nhưng còn PHẦN chương trình
        // chưa ai soạn. Từ Đ229 mỗi cô lưu phần của mình — cô Montessori lưu
        // trước không có nghĩa cô Cambridge "đã quyết rồi". Màn hình dùng khoá
        // này cho đúng phần còn trống; khoá `goiY` giữ nguyên nghĩa cũ.
        goiYPhanTrong: ke && MA_CT.some(ct => ke.chuongTrinh && ke.chuongTrinh[ct]
          && !ke.chuongTrinh[ct].coNoiDung && ke.chuongTrinh[ct].trangThai === 'nhap')
          ? goiYChoThang(b.id, thang) : null,
      };
    });

    res.json({
      thang, classId,
      thangTruoc: thangTruoc(thang),
      gocLinhVuc: GOC_LINH_VUC.map(([ma, ten]) => ({ ma, ten, chuongTrinh: chuongTrinhCuaGoc(ma) })),
      // BA TAB THEO CHƯƠNG TRÌNH (Đ195, việc 22) — THÊM MỘT KHOÁ BÊN CẠNH,
      // KHÔNG ĐỔI KHOÁ CŨ. `gocLinhVuc` giữ nguyên hình dạng cũ cộng đúng một
      // trường, nên điện thoại đang giữ bản app cũ đọc nó y như trước và
      // không hề biết `chuongTrinhTab` có mặt.
      chuongTrinhTab: tabChuongTrinh(),
      ketQua: ketQuaDangDung(db).map(([ma, ten]) => ({ ma, ten })),
      nhanBai: NHAN_BAI.map(([ma, ten]) => ({ ma, ten })),
      ketLuanBai: KET_LUAN_BAI.map(([ma, ten]) => ({ ma, ten })),
      // Nhìn lại cuối tháng từng bài (góp ý 06/10, mục 7): năm trạng thái kèm
      // chữ quy ước, và hai cách "tiếp tục ở tháng sau".
      mucDo: ketQuaDangDung(db).map(([ma, ten]) => ({ ma, ten, chuCai: CHU_QUY_UOC[ma] || '' })),
      tiepTuc: TIEP_TUC.map(([ma, ten]) => ({ ma, ten })),
      baiHoc: danhMucBai(),
      laQuanLy: req.user.role === 'admin',
      nhom: nhomCuaToi(req.user).map(c => ({ id: c.id, name: c.name })),
      // Ba tab và phần cô này soạn được ở nhóm này (góp ý 06/10, mục 6).
      ctDuocSua: ctCuaCo(req.user, classId),
      ctCuaToi: req.user.role === 'admin' ? null : nhomCo.nhomCua(db, classId, req.user.id),
      luaKho: LUA_KHO.map(([ma, ten]) => ({ ma, ten })),
      danhSach,
      // Đếm theo TRẠNG THÁI DUYỆT, không đếm gì về đứa trẻ: đây là con số về
      // việc giấy tờ của cô và của quản lý, không phải con số về các bé.
      tong: {
        soBe: danhSach.length,
        chuaLap: danhSach.filter(x => !x.ke).length,
        choDuyet: danhSach.filter(x => x.ke && x.ke.trangThai === 'cho-duyet').length,
        daDuyet: danhSach.filter(x => x.ke && x.ke.trangThai === 'da-duyet').length,
        traLai: danhSach.filter(x => x.ke && x.ke.trangThai === 'tra-lai').length,
        deXuatCho: danhSach.filter(x => x.ke && x.ke.deXuat && x.ke.deXuat.trangThai === 'cho-duyet').length,
      },
    });
  });

  // DANH MỤC BÀI HỌC — cô đọc, văn phòng / quản lý soạn.
  app.get('/api/kehoachbe/bai-hoc', requireRole('teacher', 'admin'), (req, res) => {
    const tatCa = req.user.role === 'admin' && String(req.query.tatCa || '') === '1';
    res.json({
      gocLinhVuc: GOC_LINH_VUC.map(([ma, ten]) => ({ ma, ten, chuongTrinh: chuongTrinhCuaGoc(ma) })),
      // BA TAB THEO CHƯƠNG TRÌNH (Đ195, việc 22) — THÊM MỘT KHOÁ BÊN CẠNH,
      // KHÔNG ĐỔI KHOÁ CŨ. `gocLinhVuc` giữ nguyên hình dạng cũ cộng đúng một
      // trường, nên điện thoại đang giữ bản app cũ đọc nó y như trước và
      // không hề biết `chuongTrinhTab` có mặt.
      chuongTrinhTab: tabChuongTrinh(),
      nhanBai: NHAN_BAI.map(([ma, ten]) => ({ ma, ten })),
      luaKho: LUA_KHO.map(([ma, ten]) => ({ ma, ten })),
      baiHoc: danhMucBai({ tatCa }),
    });
  });

  function luuBai(req, res, cu) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Danh mục bài học do văn phòng / quản lý soạn. Cô chỉ tích chọn từ danh mục.' });
    }
    const b = req.body || {};
    const goc = b.gocLinhVuc === undefined && cu ? cu.gocLinhVuc : chuoi(b.gocLinhVuc, 40);
    if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
    const ten = b.ten === undefined && cu ? cu.ten : chuoi(b.ten, TOI_DA_TEN_BAI);
    if (!ten) return res.status(400).json({ error: 'Bài học cần có tên' });
    const moTa = b.moTa === undefined && cu ? cu.moTa : chuoi(b.moTa, TOI_DA_MO_TA);
    const thuTu = b.thuTu === undefined
      ? (cu ? cu.thuTu : db.count('SELECT COUNT(*) AS n FROM kehoachbe_baihoc WHERE gocLinhVuc = ?', [goc]))
      : Number(b.thuTu);
    if (!Number.isInteger(thuTu) || thuTu < 0) return res.status(400).json({ error: 'Thứ tự chưa hợp lệ' });
    const active = b.active === undefined ? (cu ? cu.active : 1) : (b.active ? 1 : 0);
    // Lứa tuổi của bài (góp ý 06/10, mục 6). Không gửi = giữ nguyên; mảng rỗng
    // = dùng cho mọi lứa.
    let lua = null;
    if (b.lua !== undefined) {
      if (!Array.isArray(b.lua) || b.lua.some(x => !MA_LUA_KHO.includes(String(x)))) {
        return res.status(400).json({ error: 'Lứa tuổi chỉ có 3–4, 4–5 hoặc 5–6' });
      }
      lua = [...new Set(b.lua.map(String))];
    }

    napDanhMucNeuTrong();
    const id = cu ? cu.id : db.nextId('khbh');
    db.tx(() => {
      if (cu) db.update('kehoachbe_baihoc', id, { gocLinhVuc: goc, ten, moTa, thuTu, active });
      else db.insert('kehoachbe_baihoc', { id, gocLinhVuc: goc, ten, moTa, thuTu, active, nguoiTao: req.user.id, taoLuc: new Date().toISOString() });
      if (lua) {
        db.run('DELETE FROM kehoachbe_baihoc_lua WHERE baiHocId = ?', [id]);
        for (const l of lua) db.run('INSERT OR IGNORE INTO kehoachbe_baihoc_lua (baiHocId, lua) VALUES (?, ?)', [id, l]);
      }
    });
    db.audit(req.user.id, cu ? 'kehoachbe-sua-bai' : 'kehoachbe-them-bai', id, { gocLinhVuc: goc, ten, active, lua: lua || undefined });
    const r = db.first('kehoachbe_baihoc', 'SELECT * FROM kehoachbe_baihoc WHERE id = ?', [id]);
    res.json({ ok: true, baiHoc: { ...r, active: r.active !== 0, lua: luaCuaBai(id) } });
  }

  app.post('/api/kehoachbe/bai-hoc', requireRole('teacher', 'admin'), (req, res) => luuBai(req, res, null));

  // ẨN chứ không xoá (active = 0): bài đã tích trong kế hoạch cũ vẫn phải
  // hiện đúng tên. Không có đường DELETE, cố ý.
  app.put('/api/kehoachbe/bai-hoc/:id', requireRole('teacher', 'admin'), (req, res) => {
    const cu = db.first('kehoachbe_baihoc', 'SELECT * FROM kehoachbe_baihoc WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy bài học này' });
    return luuBai(req, res, cu);
  });

  // GỢI Ý cho một bé một tháng: bài "Tiếp tục cùng con" của tháng gần nhất.
  app.get('/api/kehoachbe/goi-y', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = chuoi(req.query.studentId, 40);
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của bé này' });
    }
    const thang = THANG_RE.test(String(req.query.thang || '')) ? req.query.thang : thangNay();
    res.json({ studentId, thang, ...goiYChoThang(studentId, thang) });
  });

  // ĐƯỜNG "KẾ HOẠCH CỦA MỘT BÉ" ĐÃ GỠ (Đ203, việc 47).
  //
  // `GET /api/kehoachbe/be` được viết cho một màn "kế hoạch tháng của bé này"
  // mở từ Hồ sơ của bé. Màn đó không bao giờ được dựng. Một mặt API đã xác
  // thực, trả dữ liệu của trẻ, mà không màn hình nào mở là thứ đáng lo nhất
  // trong cả tệp này: không ai mở nên cũng không ai phát hiện khi nó hở.
  //
  // Mọi thứ nó trả về đều có trong `GET /api/kehoachbe?classId=&thang=` ngay
  // trên: cùng `keCuaBe`, cùng `gocLinhVuc`, cùng `ketQua`. Nên gỡ đi KHÔNG
  // mất một dữ liệu nào và KHÔNG mất một màn nào — chỉ bớt đúng một cửa không
  // ai canh. Bài canh `test/ke-hoach-be.test.mjs` đã chuyển trọn phép kiểm
  // sang đường cả nhóm và còn đòi đường này phải trả 404.

  // =========================================================================
  // SOẠN — lưu CẢ NHÓM trong một giao dịch
  // =========================================================================
  app.put('/api/kehoachbe', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });
    // SOẠN THEO MỘT CHƯƠNG TRÌNH (góp ý 06/10, mục 6). Không gửi = app đời cũ,
    // soạn cả bản như trước.
    const ct = b.chuongTrinh === undefined || b.chuongTrinh === null ? null : chuoi(b.chuongTrinh, 20);
    if (ct !== null && !MA_CT.includes(ct)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ct && chanNeuKhongPhanCua(res, req.user, classId, ct)) return;
    const gocCt = ct ? gocCuaCt(ct) : null;

    const ds = b.danhSach;
    if (!Array.isArray(ds) || !ds.length || ds.length > TOI_DA_BE_MOT_LAN) {
      return res.status(400).json({ error: `Danh sách bé chưa hợp lệ (1 đến ${TOI_DA_BE_MOT_LAN} bé một lần)` });
    }

    // KIỂM TOÀN BỘ TRƯỚC KHI GHI DÒNG NÀO.
    //
    // Cùng lý do như đường soạn thực đơn cả tuần: lỗi ở bé thứ mười để lại một
    // nhóm lưu dở, mà màn hình vừa báo lỗi nên cô không biết mình đang đứng ở
    // đâu.
    const sach = [];
    const boQua = [];
    const xungDot = [];
    for (const x of ds) {
      const be = db.findStudent(chuoi((x || {}).studentId, 40));
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (be.classId !== classId) {
        return res.status(400).json({ error: `Bé ${be.name} không thuộc nhóm này` });
      }
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền soạn kế hoạch cho bé ${be.name}` });
      }
      const cu = db.first('kehoachbe_ke',
        'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);

      // HAI CÔ CÙNG SOẠN MỘT NHÓM — NGƯỜI LƯU SAU KHÔNG ĐƯỢC XOÁ NGƯỜI LƯU TRƯỚC.
      //
      // Cùng lỗ, cùng bản vá với nhật ký ngày (modules/nhatky/routes.js): màn
      // hình gửi lên NGUYÊN ẢNH CHỤP mọi ô của mọi bé, còn phía dưới thì xoá
      // sạch mục rồi ghi lại — nên cô bấm Lưu sau ghi đè trọn tháng kế hoạch
      // bằng bản màn hình CŨ của mình, phần cô kia vừa soạn biến mất im lặng.
      //
      // Màn hình gửi kèm `capNhatLucGoc` — dấu thời gian của bản kế hoạch lúc
      // nó NẠP VỀ (null khi bé chưa có bản nào). Bản trên máy chủ đã đổi từ
      // lúc đó thì bỏ qua ĐÚNG BÉ ĐÓ và nói ra, các bé khác vẫn lưu bình
      // thường. KHÔNG gửi trường đó thì ghi như cũ — bản app cũ còn trong bộ
      // nhớ điện thoại vẫn phải lưu được, đúng Nguyên tắc số 1.
      const goc = x && Object.prototype.hasOwnProperty.call(x, 'capNhatLucGoc')
        ? x.capNhatLucGoc : undefined;
      // Theo chương trình thì so mốc của ĐÚNG PHẦN ĐÓ: cô nước ngoài vừa lưu
      // phần Cambridge không làm cô Montessori đụng độ ở phần của mình.
      const ttCu = cu ? trangThaiCt(cu) : null;
      const mocCu = ct ? (ttCu ? ttCu[ct].capNhatLuc : null) : (cu && cu.capNhatLuc);
      if (goc !== undefined && String(mocCu || '') !== String(goc || '')) {
        xungDot.push({ studentId: be.id, hoTen: be.name });
        continue;
      }
      if (ct) {
        if (ttCu && chanNeuCtKhoa(res, ttCu[ct])) return;
      } else {
        if (chanNeuKhoa(res, cu)) return;
        // App đời cũ ghi CẢ BẢN; bản đã tách theo chương trình mà có phần đang
        // chờ / đã duyệt thì ghi cả bản là ghi đè sau lưng người duyệt.
        if (ttCu && MA_CT.some(c => ttCu[c].daTach)
          && MA_CT.some(c => ttCu[c].coNoiDung && !['nhap', 'tra-lai'].includes(ttCu[c].trangThai))) {
          return res.status(400).json({
            error: 'Kế hoạch này nay soạn và duyệt theo từng chương trình. Cô tải lại trang (hoặc mở lại app) để soạn trong đúng tab của mình nhé.',
          });
        }
      }

      // GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP: BỎ QUA BÉ ĐÓ, KHÔNG TỪ CHỐI CẢ LÔ.
      //
      // Đây là chỗ CỐ Ý làm khác ba phân hệ kia. Đường này ghi kế hoạch cho CẢ
      // NHÓM một lượt, nên trả 403 vì một bé là làm hỏng kế hoạch tháng của
      // hai mươi tư bé còn lại — và cô sẽ không hiểu vì sao, vì màn hình chỉ
      // báo một câu lỗi chung. Đó là vi phạm Nguyên tắc số 1 ở vế "mọi tính
      // năng khác vẫn chạy y như cũ".
      //
      // Nên: ghi cho những bé còn lại, và TRẢ VỀ TÊN những bé đã bỏ qua để màn
      // hình nói thẳng ra. Im lặng bỏ qua cũng sai — cô sẽ tưởng đã lập kế
      // hoạch cho cả nhóm.
      if (db.beNgungHoSoHocTap(be.id)) { boQua.push(be.name); continue; }

      const muc = [];
      for (const m of ((x || {}).muc || [])) {
        const goc = chuoi((m || {}).gocLinhVuc, 40);
        if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
        if (gocCt && !gocCt.includes(goc)) {
          return res.status(400).json({ error: `Góc "${goc}" không thuộc chương trình ${nhomCo.CHUONG_TRINH[ct] || ct}` });
        }
        const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
        if (!noiDung) continue;   // ô trống là ô cô chưa định làm gì ở góc đó
        muc.push({ gocLinhVuc: goc, noiDung });
      }
      if (muc.length > TOI_DA_MUC_MOI_BE) {
        return res.status(400).json({ error: `Mỗi bé tối đa ${TOI_DA_MUC_MOI_BE} mục một tháng` });
      }
      // Bài tích chọn (đợt 2). `null` = màn hình không gửi trường này = không
      // đụng tới bài đã tích — bản app cũ trong điện thoại vẫn lưu ô chữ được.
      const baiHoc = docBaiHoc(x, res, ct);
      if (baiHoc === undefined) return;
      sach.push({ be, cu, muc, baiHoc });
    }

    const luc = new Date().toISOString();
    let daLuu = 0;
    db.tx(() => {
      for (const { be, cu, muc, baiHoc } of sach) {
        // Bé không có mục nào, không tích bài nào và cũng chưa có bản cũ: bỏ
        // qua. Tạo một bản rỗng là màn hình quản lý hiện ra một kế hoạch trắng
        // trông như cô đã lập.
        if (!muc.length && !(baiHoc && baiHoc.length) && !cu) continue;

        let keId = cu && cu.id;
        if (cu) {
          if (ct) damBaoCt(cu);
          db.update('kehoachbe_ke', cu.id, { capNhatLuc: luc });
        } else {
          keId = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id: keId, studentId: be.id, classId, thang,
            trangThai: 'nhap', coLap: req.user.id, lapLuc: luc,
            guiLuc: null, nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
          if (ct) damBaoCt(db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [keId]));
        }
        if (ct) {
          // CHỈ PHẦN CỦA CHƯƠNG TRÌNH NÀY — mục và bài của tab khác giữ nguyên.
          const cuMucCt = mucCuaKe(keId).filter(o => gocCt.includes(o.gocLinhVuc));
          db.run(`DELETE FROM kehoachbe_muc WHERE keId = ? AND gocLinhVuc IN (${gocCt.map(() => '?').join(', ')})`, [keId, ...gocCt]);
          for (const m of muc) {
            const giong = cuMucCt.find(o => o.gocLinhVuc === m.gocLinhVuc && o.noiDung === m.noiDung);
            db.insert('kehoachbe_muc', {
              id: db.nextId('khm'), keId, gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
              ketQua: giong ? giong.ketQua : '', nhanXet: giong ? giong.nhanXet : '',
              tiepTucThangSau: giong && giong.tiepTucThangSau ? 1 : 0, capNhatLuc: luc,
            });
          }
          if (baiHoc) ghiBaiHoc(keId, baiHoc, luc, ct);
          const dong = dongCt(keId).get(ct);
          datCt(keId, ct, { capNhatLuc: luc, coLap: (dong && dong.coLap) || req.user.id });
          // Phần bị GỬI LẠI mà cô bỏ hết nội dung (quản lý dặn "tháng này bé
          // không học phần này"): về nháp. Không thế thì phần rỗng kẹt "gửi lại"
          // mãi — gửi duyệt bỏ qua phần rỗng, quản lý không có gì để duyệt, và
          // huy hiệu của cô không bao giờ về 0 (vòng rà Đ232).
          if (dong && dong.trangThai === 'tra-lai' && !ctCoNoiDung(keId).has(ct)) {
            datCt(keId, ct, { trangThai: 'nhap', guiLuc: null, yKienDuyet: '' });
          }
          dongBoKe(keId);
          daLuu += 1;
          continue;
        }

        // GHI ĐÈ TOÀN BỘ MỤC, giữ phần nhìn lại cho mục TRÙNG NGUYÊN nội dung.
        //
        // CHỦ Ý, CÓ BÀI CANH (test/ke-hoach-be.test.mjs mục [9]): nội dung ĐÃ
        // ĐỔI là một mục tiêu KHÁC, nên phần nhìn lại của mục cũ được DỌN chứ
        // không gán sang — một nhận xét "bé đã vững" dán nhầm lên mục tiêu
        // vừa viết lại còn tệ hơn một ô trống. Cái giá đi kèm: sửa cả một lỗi
        // chính tả cũng làm mục đó về ô trống — cô sửa chữ trong nội dung thì
        // ghi lại phần nhìn lại giúp trường. Chú thích cũ ở đây từng hứa điều
        // ngược lại ("sửa một chữ không làm bay nhận xét") — lời hứa đó chưa
        // bao giờ đúng với mã, nay sửa lời cho khớp luật đã chọn.
        const cuMuc = mucCuaKe(keId);
        db.run('DELETE FROM kehoachbe_muc WHERE keId = ?', [keId]);
        for (const m of muc) {
          const giong = cuMuc.find(o => o.gocLinhVuc === m.gocLinhVuc && o.noiDung === m.noiDung);
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            ketQua: giong ? giong.ketQua : '',
            nhanXet: giong ? giong.nhanXet : '',
            tiepTucThangSau: giong && giong.tiepTucThangSau ? 1 : 0,
            capNhatLuc: luc,
          });
        }
        if (baiHoc) ghiBaiHoc(keId, baiHoc, luc);
        if (dongCt(keId).size) dongBoKe(keId);
        daLuu += 1;
      }
    });

    db.audit(req.user.id, 'kehoachbe-luu', classId, {
      thang, soBe: daLuu, chuongTrinh: ct || undefined, boQua: boQua.length || undefined, xungDot: xungDot.length || undefined,
    });
    res.json({
      ok: true, thang, classId, chuongTrinh: ct, daLuu, boQuaNgungHoSo: boQua, xungDot,
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì kế hoạch của các bé đó vừa đổi trong lúc màn hình `
          + `của cô đang mở (${xungDot.map(x => x.hoTen).join(', ')}) — cô khác vừa sửa, hoặc quản lý vừa duyệt / gửi lại. `
          + 'Mở lại màn để xem bản mới; còn bấm Lưu lần nữa là giữ phần cô đang gõ cho đúng những bé cô có sửa.',
      } : {}),
    });
  });

  // ĐẶT CẢ NHÓM — đường tắt số một cho khối lượng nhập liệu.
  //
  // Cô gõ 5 dòng, cả nhóm có kế hoạch, rồi sửa lẻ bé nào khác. KHÔNG ghi đè bé
  // đã có mục ở góc đó: cô thường lập riêng vài bé trước rồi mới đặt cho phần
  // còn lại, ghi đè hết là xoá đúng phần cô vừa nhập tay.
  app.post('/api/kehoachbe/dat-ca-nhom', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });
    const ct = b.chuongTrinh === undefined || b.chuongTrinh === null ? null : chuoi(b.chuongTrinh, 20);
    if (ct !== null && !MA_CT.includes(ct)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ct && chanNeuKhongPhanCua(res, req.user, classId, ct)) return;

    const muc = [];
    for (const m of (b.muc || [])) {
      const goc = chuoi((m || {}).gocLinhVuc, 40);
      if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
      if (ct && chuongTrinhCuaGoc(goc) !== ct) {
        return res.status(400).json({ error: `Góc "${goc}" không thuộc chương trình ${nhomCo.CHUONG_TRINH[ct] || ct}` });
      }
      const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
      if (noiDung) muc.push({ gocLinhVuc: goc, noiDung });
    }
    // Đặt cả nhóm cũng tích được bài — cả nhóm cùng học "Tháp hồng" tháng này
    // là chuyện thường ở lớp Montessori.
    const baiHocDoc = docBaiHoc(b, res, ct);
    if (baiHocDoc === undefined) return;   // đã trả lỗi
    const baiHoc = baiHocDoc || [];
    if (!muc.length && !baiHoc.length) {
      return res.status(400).json({ error: 'Cô gõ ít nhất một mục hoặc tích ít nhất một bài để đặt cho cả nhóm nhé' });
    }

    const luc = new Date().toISOString();
    let daDat = 0;
    let boQua = 0;
    const boQuaNgungHoSo = [];
    db.tx(() => {
      // Bé mà gia đình đã dừng phần hồ sơ học tập: bỏ qua, đếm riêng (Đ96).
      const ngung = db.dsBeNgungHoSoHocTap(beCuaNhom(classId).map(x => x.id));
      for (const be of beCuaNhom(classId)) {
        if (ngung.has(be.id)) { boQuaNgungHoSo.push(be.name); continue; }
        let k = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        if (k && ct) {
          const tt = trangThaiCt(k)[ct];
          if (tt.trangThai !== 'nhap' && tt.trangThai !== 'tra-lai') { boQua += 1; continue; }
        } else if (k && !duocSuaNoiDung(k)) { boQua += 1; continue; }
        else if (k) {
          // App đời cũ (không gửi chuongTrinh) gặp bản ĐÃ TÁCH theo chương trình:
          // trạng thái gộp có thể là "nháp" trong khi một phần đã duyệt, và chèn
          // bài vào phần ấy là gia đình thấy ngay thứ chưa ai duyệt (vòng rà
          // Đ232). Cùng luật với PUT ở trên — bỏ qua bé đó, không ghi.
          const tt = trangThaiCt(k);
          if (MA_CT.some(c => tt[c].daTach)
            && MA_CT.some(c => tt[c].coNoiDung && !['nhap', 'tra-lai'].includes(tt[c].trangThai))) {
            boQua += 1; continue;
          }
        }
        if (!k) {
          const id = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id, studentId: be.id, classId, thang, trangThai: 'nhap',
            coLap: req.user.id, lapLuc: luc, guiLuc: null,
            nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
          k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [id]);
        }
        if (ct) damBaoCt(k);
        const dangCo = mucCuaKe(k.id);
        for (const m of muc) {
          if (dangCo.some(o => o.gocLinhVuc === m.gocLinhVuc)) continue;  // không đè phần cô đã nhập riêng
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId: k.id,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        const baiDangCo = baiCuaKe(k.id);
        for (const bh of baiHoc) {
          if (baiDangCo.some(o => o.baiHocId === bh.baiHocId)) continue;  // bài cô đã tích riêng thì giữ nhãn cô chọn
          db.insert('kehoachbe_muc_bai', {
            id: db.nextId('khmb'), keId: k.id, baiHocId: bh.baiHocId, nhan: bh.nhan,
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        if (ct) {
          const dong = dongCt(k.id).get(ct);
          datCt(k.id, ct, { capNhatLuc: luc, coLap: (dong && dong.coLap) || req.user.id });
          db.update('kehoachbe_ke', k.id, { capNhatLuc: luc });
          dongBoKe(k.id);
        }
        daDat += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-dat-ca-nhom', classId, { thang, daDat, soMuc: muc.length, soBai: baiHoc.length });
    res.json({ ok: true, daDat, boQua, boQuaNgungHoSo });
  });

  // CHÉP THÁNG TRƯỚC — đường tắt số hai.
  //
  // Mang sang những mục cô đã đánh dấu "tiếp tục ở tháng sau" TRƯỚC TIÊN, rồi
  // mới tới phần còn lại. Đây chính là vế "ôn tiếp" của nhà trường, làm thành
  // một hành động một lần bấm thay vì một lời dặn cô phải tự nhớ.
  app.post('/api/kehoachbe/chep-thang-truoc', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });
    // "Tháng trước" là THÁNG GẦN NHẤT NHÓM CÓ KẾ HOẠCH, không phải tháng liền
    // kề trên lịch. Nhìn đúng tháng liền kề thì sau nghỉ hè — và ngay tháng
    // đầu năm học mới — nút "Chép tháng trước" thành vô dụng: tháng 8 không có
    // bản nào để chép. Lùi tối đa 12 tháng để không chép nhầm kế hoạch của một
    // năm học quá cũ; không tìm thấy thì lùi về tháng liền kề như cũ (kết quả
    // vẫn là "không có gì để chép", nhưng con số tuThang không nói dối).
    const lui12 = `${Number(thang.slice(0, 4)) - 1}${thang.slice(4)}`;
    const nguon = db.first('kehoachbe_ke',
      `SELECT k.thang AS thang FROM kehoachbe_ke k
        JOIN students s ON s.id = k.studentId
       WHERE s.classId = ? AND k.thang < ? AND k.thang >= ?
       ORDER BY k.thang DESC LIMIT 1`, [classId, thang, lui12]);
    const truoc = nguon ? nguon.thang : thangTruoc(thang);
    const chiTiepTuc = !!b.chiTiepTuc;
    // Chép theo MỘT chương trình (góp ý 06/10, mục 6): chỉ phần của tab đó.
    const ct = b.chuongTrinh === undefined || b.chuongTrinh === null ? null : chuoi(b.chuongTrinh, 20);
    if (ct !== null && !MA_CT.includes(ct)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ct && chanNeuKhongPhanCua(res, req.user, classId, ct)) return;

    const luc = new Date().toISOString();
    let daChep = 0;
    let boQua = 0;
    const boQuaNgungHoSoChep = [];
    db.tx(() => {
      // Bé mà gia đình đã dừng phần hồ sơ học tập: bỏ qua, đếm riêng (Đ96).
      const ngungChep = db.dsBeNgungHoSoHocTap(beCuaNhom(classId).map(x => x.id));
      for (const be of beCuaNhom(classId)) {
        if (ngungChep.has(be.id)) { boQuaNgungHoSoChep.push(be.name); continue; }
        const cu = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, truoc]);
        if (!cu) continue;
        const nay = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        // Tháng đích đã có bản thì GIỮ NGUYÊN — bấm nhầm không được xoá cả
        // buổi soạn của cô. Theo chương trình: phần ĐÓ đã có nội dung hoặc
        // đang khoá thì giữ nguyên; phần trống thì chép vào.
        if (nay && !ct) { boQua += 1; continue; }
        if (nay && ct) {
          const tt = trangThaiCt(nay)[ct];
          if (tt.coNoiDung || (tt.trangThai !== 'nhap' && tt.trangThai !== 'tra-lai')) { boQua += 1; continue; }
        }

        let muc = mucCuaKe(cu.id);
        if (ct) muc = muc.filter(m => chuongTrinhCuaGoc(m.gocLinhVuc) === ct);
        if (chiTiepTuc) muc = muc.filter(m => m.tiepTucThangSau);
        else muc = [...muc.filter(m => m.tiepTucThangSau), ...muc.filter(m => !m.tiepTucThangSau)];
        // Bài đã tích cũng chép sang, cùng luật: bài "Tiếp tục cùng con" lên
        // trước và mang nhãn ÔN TẬP — tháng sau làm lại thì không còn là học
        // mới nữa. Bài đã thấy con làm được thì chép nguyên nhãn cô chọn.
        const laTiep = (m) => m.ketQua === 'tiep-tuc' || m.tiepTucThangSau;
        let bai = baiCuaKe(cu.id).filter(m => m.gocLinhVuc);   // bài đã gỡ khỏi danh mục thì thôi
        if (ct) bai = bai.filter(m => chuongTrinhCuaGoc(m.gocLinhVuc) === ct);
        if (chiTiepTuc) bai = bai.filter(laTiep);
        else bai = [...bai.filter(laTiep), ...bai.filter(m => !laTiep(m))];
        if (!muc.length && !bai.length) continue;

        let id = nay && nay.id;
        if (!nay) {
          id = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id, studentId: be.id, classId, thang, trangThai: 'nhap',
            coLap: req.user.id, lapLuc: luc, guiLuc: null,
            nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
        }
        if (ct) damBaoCt(db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [id]));
        for (const m of muc.slice(0, TOI_DA_MUC_MOI_BE)) {
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId: id,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            // Kết quả và nhận xét KHÔNG chép sang: chúng nói về tháng trước.
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        for (const m of bai.slice(0, TOI_DA_BAI_MOI_BE)) {
          db.insert('kehoachbe_muc_bai', {
            id: db.nextId('khmb'), keId: id, baiHocId: m.baiHocId,
            nhan: laTiep(m) ? nhanTiepTuc(m) : m.nhan,
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        if (ct) {
          datCt(id, ct, { capNhatLuc: luc, coLap: req.user.id });
          db.update('kehoachbe_ke', id, { capNhatLuc: luc });
          dongBoKe(id);
        }
        daChep += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-chep-thang', classId, { thang, tuThang: truoc, daChep });
    res.json({ ok: true, thang, tuThang: truoc, daChep, boQua, boQuaNgungHoSo: boQuaNgungHoSoChep });
  });

  // =========================================================================
  // GỬI DUYỆT · RÚT LẠI · DUYỆT
  // =========================================================================
  // GỬI DUYỆT — theo MỘT chương trình (góp ý 06/10, mục 6), hoặc cả bản như
  // app đời cũ (không gửi `chuongTrinh`): khi đó mọi phần có nội dung đang
  // nháp / bị gửi lại đều được gửi, đúng hành vi trước đợt này.
  app.post('/api/kehoachbe/gui-duyet', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền với nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    const chiBe = chuoi(b.studentId, 40);
    const ct = b.chuongTrinh === undefined || b.chuongTrinh === null ? null : chuoi(b.chuongTrinh, 20);
    if (ct !== null && !MA_CT.includes(ct)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ct && chanNeuKhongPhanCua(res, req.user, classId, ct)) return;
    const dsCt = ct ? [ct] : MA_CT;

    const luc = new Date().toISOString();
    let daGui = 0;
    let trong = 0;
    db.tx(() => {
      for (const be of beCuaNhom(classId)) {
        if (chiBe && be.id !== chiBe) continue;
        const k = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        if (!k) continue;
        const tt = trangThaiCt(k);
        const guiDuoc = dsCt.filter(c => tt[c].trangThai === 'nhap' || tt[c].trangThai === 'tra-lai');
        if (!guiDuoc.length) continue;
        // Phần rỗng thì không gửi — quản lý mở ra thấy trang trắng.
        const coNoiDung = guiDuoc.filter(c => tt[c].coNoiDung);
        if (!coNoiDung.length) { trong += 1; continue; }
        damBaoCt(k);
        for (const c of coNoiDung) {
          datCt(k.id, c, { trangThai: 'cho-duyet', guiLuc: luc, capNhatLuc: luc, coLap: tt[c].coLap || req.user.id });
        }
        db.update('kehoachbe_ke', k.id, { capNhatLuc: luc });
        dongBoKe(k.id);
        daGui += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-gui-duyet', classId, { thang, daGui, chuongTrinh: ct || undefined });
    // BÁO QUẢN LÝ (Đ154). Gửi cả nhóm là một lượt bấm, nên báo MỘT tin cho cả
    // lượt chứ không phải mỗi bé một tin — quản lý không cần biết tên từng bé
    // để mở màn duyệt ra, mà 20 tiếng chuông liền nhau thì đúng là làm phiền.
    if (daGui > 0 && req.user.role !== 'admin') {
      const lop = db.findClass(classId);
      baoNhaTruongTheoNhom(classId, {
        tieuDe: 'Có kế hoạch của bé chờ duyệt',
        noiDung: `${tenNguoi(req.user.id) || 'Cô'} vừa gửi ${daGui} kế hoạch tháng ${thang}`
          + `${ct ? ` (${nhomCo.CHUONG_TRINH[ct]})` : ''}${lop ? ` của nhóm ${lop.name}` : ''}.`,
        hash: '#/kehoachbe/duyet',
        tru: req.user.id,
      });
    }
    res.json({ ok: true, daGui, trong });
  });

  app.post('/api/kehoachbe/rut-lai', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(b.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }
    const ct = b.chuongTrinh === undefined || b.chuongTrinh === null ? null : chuoi(b.chuongTrinh, 20);
    if (ct !== null && !MA_CT.includes(ct)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ct && chanNeuKhongPhanCua(res, req.user, k.classId, ct)) return;
    const tt = trangThaiCt(k);
    const rut = (ct ? [ct] : MA_CT).filter(c => tt[c].trangThai === 'cho-duyet');
    if (!rut.length) {
      return res.status(400).json({ error: 'Chỉ rút lại được kế hoạch đang chờ duyệt' });
    }
    const luc = new Date().toISOString();
    db.tx(() => {
      damBaoCt(k);
      for (const c of rut) datCt(k.id, c, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
      db.update('kehoachbe_ke', k.id, { capNhatLuc: luc });
      dongBoKe(k.id);
    });
    db.audit(req.user.id, 'kehoachbe-rut-lai', k.studentId, { id: k.id, chuongTrinh: ct || undefined });
    res.json({ ok: true, id: k.id, trangThai: 'nhap', chuongTrinh: ct });
  });

  // DUYỆT — VIỆC CỦA QUẢN LÝ, KHÔNG PHẢI CỦA CÔ.
  //
  // Cùng luật với duyệt đơn nghỉ (Y2): người lập không phải người duyệt, nếu
  // không thì bước duyệt chỉ là một cái nút thừa.
  //
  // Nhận hai dạng: `ids` (mã kế hoạch — duyệt MỌI phần đang chờ của bản đó,
  // như trước) và `phan: [{ keId, chuongTrinh }]` (đúng một phần — góp ý
  // 06/10, mục 6). Trả lại BẮT BUỘC có lý do, và cô đã gửi được BÁO NGAY.
  app.post('/api/kehoachbe/duyet', requireRole('teacher', 'admin'), (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Kế hoạch do quản lý duyệt. Cô lập kế hoạch rồi bấm "Gửi duyệt" — '
          + 'người lập không duyệt kế hoạch của chính mình.',
      });
    }
    const b = req.body || {};
    const quyet = chuoi(b.quyetDinh, 20);
    if (quyet !== 'da-duyet' && quyet !== 'tra-lai') {
      return res.status(400).json({ error: 'Quyết định phải là duyệt hoặc trả lại' });
    }
    const yKien = chuoi(b.yKienDuyet, TOI_DA_NHAN_XET);
    // Trả lại mà không nói vì sao thì cô không biết phải sửa gì.
    if (quyet === 'tra-lai' && !yKien) {
      return res.status(400).json({ error: 'Trả lại thì ghi giúp cô một dòng vì sao nhé' });
    }

    const yeuCau = [];
    for (const id of (Array.isArray(b.ids) ? b.ids : [])) {
      const ma = chuoi(id, 40);
      if (ma) yeuCau.push({ keId: ma, ct: null });
    }
    for (const x of (Array.isArray(b.phan) ? b.phan : [])) {
      const ma = chuoi((x || {}).keId, 40);
      const c = chuoi((x || {}).chuongTrinh, 20);
      if (!ma || !MA_CT.includes(c)) return res.status(400).json({ error: 'Danh sách phần cần duyệt chưa hợp lệ' });
      yeuCau.push({ keId: ma, ct: c });
    }
    if (!yeuCau.length || yeuCau.length > TOI_DA_BE_MOT_LAN * MA_CT.length) {
      return res.status(400).json({ error: 'Danh sách kế hoạch cần duyệt chưa hợp lệ' });
    }

    const sach = [];
    for (const { keId, ct } of yeuCau) {
      const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [keId]);
      if (!k) return res.status(404).json({ error: 'Danh sách có kế hoạch không tồn tại' });
      if (!db.canAccessStudent(req.user, k.studentId)) {
        return res.status(403).json({ error: 'Có kế hoạch của bé ngoài phạm vi cơ sở mình' });
      }
      const tt = trangThaiCt(k);
      const phan = (ct ? [ct] : MA_CT).filter(c => tt[c].trangThai === 'cho-duyet');
      if (!phan.length) {
        return res.status(400).json({ error: 'Chỉ duyệt được kế hoạch đang chờ duyệt' });
      }
      // NGƯỜI LẬP KHÔNG DUYỆT KẾ HOẠCH CỦA CHÍNH MÌNH — với CẢ quản lý.
      //
      // Chốt vai ở đầu đường chỉ chặn được cô; một tài khoản quản trị tự lập
      // kế hoạch (đường lưu cho phép admin) rồi tự duyệt thì bước duyệt thành
      // cái nút thừa đúng như chú thích trên đã cảnh báo.
      for (const c of phan) {
        if ((tt[c].coLap || k.coLap) === req.user.id) {
          return res.status(403).json({
            error: 'Kế hoạch này do chính tài khoản của anh/chị lập — nhờ một quản lý khác duyệt giúp',
          });
        }
        sach.push({ k, ct: c, coLap: tt[c].coLap || k.coLap });
      }
    }

    const luc = new Date().toISOString();
    db.tx(() => {
      const daDung = new Set();
      for (const { k, ct } of sach) {
        if (!daDung.has(k.id)) { damBaoCt(k); daDung.add(k.id); }
        datCt(k.id, ct, { trangThai: quyet, nguoiDuyet: req.user.id, duyetLuc: luc, yKienDuyet: yKien, capNhatLuc: luc });
      }
      for (const id of daDung) {
        db.update('kehoachbe_ke', id, { capNhatLuc: luc });
        dongBoKe(id);
      }
    });
    db.audit(req.user.id, 'kehoachbe-duyet', null, { quyetDinh: quyet, so: sach.length });

    // BÁO CÔ ĐÃ GỬI — mỗi cô MỘT tin cho cả lượt, kể tên bé và chương trình.
    const theoCo = new Map();
    for (const x of sach) {
      if (!x.coLap) continue;
      if (!theoCo.has(x.coLap)) theoCo.set(x.coLap, []);
      const be = db.findStudent(x.k.studentId);
      theoCo.get(x.coLap).push(`${be ? be.name : 'một bé'} (${nhomCo.CHUONG_TRINH[x.ct] || x.ct}, tháng ${x.k.thang})`);
    }
    for (const [coId, ds] of theoCo) {
      baoCo(coId, quyet === 'tra-lai'
        ? { tieuDe: 'Kế hoạch của bé được gửi lại để sửa',
          noiDung: `${ds.join(', ')} — lý do: ${yKien}`.slice(0, 300), hash: '#/kehoachbe' }
        : { tieuDe: 'Kế hoạch của bé đã được duyệt', noiDung: ds.join(', ').slice(0, 300), hash: '#/kehoachbe' });
    }
    res.json({ ok: true, quyetDinh: quyet, so: sach.length, daBaoCo: theoCo.size });
  });

  // MÀN DUYỆT THEO NGÀY / THÁNG / NĂM (góp ý 06/10, mục 6): mọi phần kế hoạch
  // gửi trong khoảng đó, trong phạm vi cơ sở của người xem, gom theo nhóm lớp
  // để duyệt từng bé hoặc cả nhóm một lần.
  app.get('/api/kehoachbe/cho-duyet', requireRole('teacher', 'admin'), (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Màn duyệt là của quản lý' });
    const ky = ['ngay', 'thang', 'nam'].includes(String(req.query.ky)) ? String(req.query.ky) : 'thang';
    const homNayVN = ngay.homNay();
    const moc = String(req.query.moc || '');
    const mau = { ngay: /^\d{4}-\d{2}-\d{2}$/, thang: THANG_RE, nam: /^\d{4}$/ }[ky];
    const mocDung = mau.test(moc) ? moc : (ky === 'ngay' ? homNayVN : ky === 'thang' ? homNayVN.slice(0, 7) : homNayVN.slice(0, 4));
    const tatCa = String(req.query.trangThai || '') === 'tat-ca';
    // Mốc gửi lưu bằng giờ quốc tế; so theo NGÀY VIỆT NAM.
    const ngayVN = (iso) => {
      const t = Date.parse(iso || '');
      return Number.isFinite(t) ? new Date(t + 7 * 3600 * 1000).toISOString().slice(0, 10) : '';
    };
    const trongKy = (iso) => { const d = ngayVN(iso); return !!d && d.startsWith(mocDung); };

    // Kế hoạch tháng nào thì thường gửi trong chính tháng đó hoặc sát trước —
    // chỉ quét các tháng kế hoạch quanh khoảng đang xem, không quét cả kho.
    const lechThang = (thang, n) => {
      const [y, m] = thang.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
    };
    const tu = ky === 'nam' ? `${Number(mocDung) - 1}-11` : lechThang(mocDung.slice(0, 7), -2);
    const den = ky === 'nam' ? `${Number(mocDung) + 1}-02` : lechThang(mocDung.slice(0, 7), 2);
    const ra = [];
    const ke = tatCa
      ? db.all('kehoachbe_ke',
        `SELECT * FROM kehoachbe_ke WHERE thang BETWEEN ? AND ?
            AND (guiLuc IS NOT NULL OR id IN (SELECT keId FROM kehoachbe_ke_ct WHERE guiLuc IS NOT NULL))`, [tu, den])
      : db.all('kehoachbe_ke',
        "SELECT * FROM kehoachbe_ke WHERE thang BETWEEN ? AND ? AND trangThai = 'cho-duyet'", [tu, den]);
    for (const k of ke) {
      if (!db.canAccessStudent(req.user, k.studentId)) continue;
      const tt = trangThaiCt(k);
      for (const c of MA_CT) {
        const p = tt[c];
        if (!p.coNoiDung || !p.guiLuc) continue;
        if (!tatCa && p.trangThai !== 'cho-duyet') continue;
        if (tatCa && p.trangThai === 'nhap') continue;
        if (!trongKy(p.guiLuc)) continue;
        ra.push({ k, ct: c, p });
      }
    }
    const be = new Map();
    const nhom = new Map();
    for (const { k, ct, p } of ra) {
      if (!be.has(k.studentId)) be.set(k.studentId, db.findStudent(k.studentId));
      const s = be.get(k.studentId);
      const cid = (s && s.classId) || k.classId;
      if (!nhom.has(cid)) {
        const lop = db.findClass(cid);
        nhom.set(cid, { classId: cid, tenNhom: lop ? lop.name : '', ds: [] });
      }
      const gocCt = gocCuaCt(ct);
      nhom.get(cid).ds.push({
        keId: k.id, studentId: k.studentId, hoTen: s ? s.name : '', thang: k.thang,
        chuongTrinh: ct, tenChuongTrinh: nhomCo.CHUONG_TRINH[ct] || ct,
        trangThai: p.trangThai, guiLuc: p.guiLuc, coLapTen: tenNguoi(p.coLap || k.coLap),
        laCuaToi: (p.coLap || k.coLap) === req.user.id,
        yKienDuyet: p.yKienDuyet, nguoiDuyetTen: tenNguoi(p.nguoiDuyet),
        baiHoc: baiCuaKe(k.id).filter(x => gocCt.includes(x.gocLinhVuc))
          .map(x => ({ ten: x.ten, gocLinhVuc: x.gocLinhVuc, nhan: x.nhan })),
        muc: mucCuaKe(k.id).filter(x => gocCt.includes(x.gocLinhVuc))
          .map(x => ({ gocLinhVuc: x.gocLinhVuc, noiDung: x.noiDung })),
      });
    }
    const dsNhom = [...nhom.values()].sort((a, b) => a.tenNhom.localeCompare(b.tenNhom, 'vi'));
    for (const n of dsNhom) n.ds.sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi') || a.chuongTrinh.localeCompare(b.chuongTrinh));
    res.json({
      ky, moc: mocDung, trangThai: tatCa ? 'tat-ca' : 'cho-duyet',
      gocLinhVuc: GOC_LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      nhanBai: NHAN_BAI.map(([ma, ten]) => ({ ma, ten })),
      tong: ra.length, nhom: dsNhom,
    });
  });

  // =========================================================================
  // CUỐI THÁNG NHÌN LẠI
  // =========================================================================
  //
  // Ghi được cả trên bản ĐÃ DUYỆT — đó chính là việc của cuối tháng, và nó
  // không đụng tới nội dung kế hoạch đã được duyệt.
  app.put('/api/kehoachbe/nhin-lai', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(b.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }

    // ĐƯỜNG GHI THỨ CHÍN CỦA Đ96 — BỊ BỎ SÓT LẦN ĐẦU.
    //
    // Đ96 chốt tám đường ghi, nhưng quên đúng đường này. Mà "nhìn lại cuối
    // tháng" mới là chỗ cô xếp bé vào một trong năm mức phát triển và viết
    // nhận xét — tức là nội dung hồ sơ học tập theo nghĩa đúng nhất của nó.
    //
    // Gia đình gạt ô ①, màn của họ hứa "trường ngưng ghi mới ngay", màn quản
    // trị hứa "ngưng ghi quan sát, kế hoạch và báo cáo mới cho bé". Rồi cuối
    // tháng cô vẫn ghi được. Có nhật ký thao tác chứng minh trường đã nhận lời
    // rút, nên đây là chỗ khó giải thích nhất nếu có khiếu nại theo NĐ 13/2023.
    //
    // Chốt ở ĐÂY chứ không ở `gui-duyet`: gửi duyệt là thao tác trên CẢ NHÓM,
    // chặn nó là một bé làm cô không gửi được kế hoạch của mười chín bé còn
    // lại — đúng cái bẫy mà Đ96 đã tránh ở đường lưu cả nhóm.
    if (db.beNgungHoSoHocTap(k.studentId)) {
      return res.status(403).json({
        error: 'Gia đình bé này đã dừng phần hồ sơ học tập. Phần đã ghi vẫn giữ '
          + 'nguyên và cô xem lại được; chỉ ngưng ghi mới. Cô vẫn ghi nhật ký '
          + 'ngày và vẫn nhắn tin với gia đình như thường.',
      });
    }

    const sach = [];
    for (const m of (b.muc || [])) {
      const cu = db.first('kehoachbe_muc', 'SELECT * FROM kehoachbe_muc WHERE id = ?', [chuoi((m || {}).id, 40)]);
      if (!cu || cu.keId !== k.id) {
        return res.status(400).json({ error: 'Có mục không thuộc kế hoạch này' });
      }
      const kq = chuoi((m || {}).ketQua, 40);
      if (kq && !MA_KET_QUA.includes(kq)) {
        return res.status(400).json({ error: 'Kết quả nhìn lại không hợp lệ' });
      }
      sach.push({
        id: cu.id,
        ketQua: kq,
        nhanXet: chuoi((m || {}).nhanXet, TOI_DA_NHAN_XET),
        tiepTucThangSau: (m || {}).tiepTucThangSau ? 1 : 0,
      });
    }
    // TỪNG BÀI ĐÃ TÍCH — hai mức, và chỉ hai giá trị ấy được nhận.
    // Cô nhìn lại đúng phần chương trình của mình (góp ý 06/10, mục 6–7).
    // Trường chưa khai vai thì cô phụ trách nhóm nhìn lại được cả ba như trước.
    const ctCua = ctCuaCo(req.user, k.classId);
    const ngoaiPhan = (goc) => !ctCua.includes(chuongTrinhCuaGoc(goc));
    for (const m of (b.muc || [])) {
      const cu = db.first('kehoachbe_muc', 'SELECT gocLinhVuc, keId FROM kehoachbe_muc WHERE id = ?', [chuoi((m || {}).id, 40)]);
      if (cu && cu.keId === k.id && ngoaiPhan(cu.gocLinhVuc)) {
        return res.status(403).json({ error: 'Có mục thuộc chương trình của cô khác — cô nhìn lại phần của mình nhé' });
      }
    }
    const sachBai = [];
    for (const m of (b.baiHoc || [])) {
      const cu = db.first('kehoachbe_muc_bai', 'SELECT * FROM kehoachbe_muc_bai WHERE id = ?', [chuoi((m || {}).id, 40)]);
      if (!cu || cu.keId !== k.id) {
        return res.status(400).json({ error: 'Có bài không thuộc kế hoạch này' });
      }
      const baiGoc = db.first('kehoachbe_baihoc', 'SELECT gocLinhVuc FROM kehoachbe_baihoc WHERE id = ?', [cu.baiHocId]);
      if (baiGoc && ngoaiPhan(baiGoc.gocLinhVuc)) {
        return res.status(403).json({ error: 'Có bài thuộc chương trình của cô khác — cô nhìn lại phần của mình nhé' });
      }
      // MỨC ĐỘ BẰNG CHỮ QUY ƯỚC + "TIẾP TỤC Ở THÁNG SAU" (góp ý 06/10, mục 7).
      // Màn đời mới gửi hai trường này; cột `ketQua` hai mức suy ra từ chúng
      // để gợi ý tháng sau và báo cáo học tập đọc đúng như trước: Đã vững /
      // Vượt trội = "đã thấy con làm được"; có chọn tiếp tục = "tiếp tục cùng con".
      const coMucDo = Object.prototype.hasOwnProperty.call(m || {}, 'mucDo')
        || Object.prototype.hasOwnProperty.call(m || {}, 'tiepTuc');
      const mucDo = chuoi((m || {}).mucDo, 40);
      if (mucDo && !MA_KET_QUA.includes(mucDo)) return res.status(400).json({ error: 'Mức độ chưa hợp lệ' });
      const tiepTuc = chuoi((m || {}).tiepTuc, 20);
      if (tiepTuc && !MA_TIEP_TUC.includes(tiepTuc)) {
        return res.status(400).json({ error: 'Tiếp tục ở tháng sau chỉ có dạy mới, ôn tập hoặc mở rộng' });
      }
      let kl = chuoi((m || {}).ketQua, 20);
      if (coMucDo && !kl) kl = tiepTuc ? 'tiep-tuc' : (['da-vung', 'vuot-troi'].includes(mucDo) ? 'da-thay' : '');
      if (kl && !MA_KET_LUAN.includes(kl)) {
        return res.status(400).json({ error: 'Kết luận cho bài chỉ có hai lựa chọn: đã thấy con làm được, hoặc tiếp tục cùng con' });
      }
      // KHÔNG GỬI = KHÔNG ĐỤNG (vòng rà Đ232). Hai màn đời mới gửi MỌI bài của
      // phần, kể cả bài cô không chạm:
      //  • tab Kế hoạch của Hành trình không có ô ghi chú → thiếu `nhanXet` thì
      //    giữ ghi chú cũ, không xoá trắng (Báo cáo tháng đọc chính ghi chú ấy);
      //  • bài nhìn lại bằng kết luận hai mức ĐỜI CŨ (chưa có dòng mức độ) hiện
      //    trống ở ô chữ quy ước → hai ô trống thì giữ kết luận cũ và gợi ý tháng
      //    sau, chỉ suy ra lại khi cô thật sự chọn một mức.
      const coKhoa = (khoa) => Object.prototype.hasOwnProperty.call(m || {}, khoa);
      let giuKetLuanCu = false;
      if (coMucDo && !mucDo && !tiepTuc && !coKhoa('ketQua')) {
        let daCoMucDo = false;
        try {
          daCoMucDo = !!db.first('kehoachbe_bai_muc_do', 'SELECT mucBaiId FROM kehoachbe_bai_muc_do WHERE mucBaiId = ?', [cu.id]);
        } catch (_) { /* chưa có bảng */ }
        giuKetLuanCu = !daCoMucDo;
      }
      sachBai.push({
        id: cu.id,
        ketQua: giuKetLuanCu ? (cu.ketQua || '') : kl,
        nhanXet: coKhoa('nhanXet') ? chuoi((m || {}).nhanXet, TOI_DA_NHAN_XET) : (cu.nhanXet || ''),
        // "Tiếp tục cùng con" TỰ ĐỘNG là việc của tháng sau — cô không phải
        // tích thêm một ô nữa để nói cùng một điều.
        tiepTucThangSau: giuKetLuanCu ? (cu.tiepTucThangSau ? 1 : 0)
          : ((kl === 'tiep-tuc' || (m || {}).tiepTucThangSau || tiepTuc) ? 1 : 0),
        mucDo: coMucDo ? { mucDo, tiepTuc } : null,
      });
    }
    if (!sach.length && !sachBai.length) return res.status(400).json({ error: 'Chưa có mục nào để ghi' });

    const luc = new Date().toISOString();
    db.tx(() => {
      for (const m of sach) {
        db.update('kehoachbe_muc', m.id, {
          ketQua: m.ketQua, nhanXet: m.nhanXet,
          tiepTucThangSau: m.tiepTucThangSau, capNhatLuc: luc,
        });
      }
      for (const m of sachBai) {
        db.update('kehoachbe_muc_bai', m.id, {
          ketQua: m.ketQua, nhanXet: m.nhanXet,
          tiepTucThangSau: m.tiepTucThangSau, capNhatLuc: luc,
        });
        if (m.mucDo) ghiMucDo(m.id, m.mucDo.mucDo, m.mucDo.tiepTuc, req.user.id, luc);
      }
    });
    db.audit(req.user.id, 'kehoachbe-nhin-lai', k.studentId, { id: k.id, soMuc: sach.length, soBai: sachBai.length });
    res.json({ ok: true, ke: keCuaBe(k.studentId, k.thang) });
  });

  // =========================================================================
  // ĐỀ XUẤT SỬA KẾ HOẠCH ĐÃ DUYỆT
  // =========================================================================
  //
  // Nhà trường: "Khi có điều chỉnh khác lộ trình ban đầu thì có quyền đề xuất
  // sửa, ghi rõ lý do rồi quản lý mới phê duyệt."
  //
  // CÁCH ĐƠN GIẢN NHẤT ĐƯỢC CHỌN: quản lý duyệt đề xuất = MỞ LẠI kế hoạch cho
  // cô sửa (về 'nhap'), cô sửa xong gửi duyệt lại như thường. Không "áp nội
  // dung" tự động: đề xuất là văn bản mô tả, máy không đoán được cô muốn đổi ô
  // nào thành gì — và đoán sai ở đây là ghi vào kế hoạch một thứ không ai viết.
  // Dòng đề xuất nằm lại trong bảng làm vết: vì sao bản đã duyệt lại mở ra.
  app.get('/api/kehoachbe/:id/de-xuat', requireRole('teacher', 'admin'), (req, res) => {
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }
    const ds = db.all('kehoachbe_de_xuat',
      'SELECT * FROM kehoachbe_de_xuat WHERE keId = ? ORDER BY taoLuc DESC LIMIT 50', [k.id])
      .map(d => ({ ...d, coDeXuatTen: tenNguoi(d.coDeXuat), nguoiDuyetTen: tenNguoi(d.nguoiDuyet) }));
    res.json({ keId: k.id, trangThai: k.trangThai, deXuat: ds });
  });

  app.post('/api/kehoachbe/:id/de-xuat', requireRole('teacher', 'admin'), (req, res) => {
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }
    // Đề xuất cho MỘT chương trình (góp ý 06/10, mục 6) — chỉ phần đó phải
    // đã duyệt; phần của cô khác đang chờ duyệt không cản cô này xin sửa.
    const ctDx = (req.body || {}).chuongTrinh === undefined || (req.body || {}).chuongTrinh === null
      ? null : chuoi(req.body.chuongTrinh, 20);
    if (ctDx !== null && !MA_CT.includes(ctDx)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    if (ctDx && chanNeuKhongPhanCua(res, req.user, k.classId, ctDx)) return;
    const ttDx = ctDx ? trangThaiCt(k)[ctDx].trangThai : k.trangThai;
    if (ttDx !== 'da-duyet') {
      return res.status(400).json({
        error: ttDx === 'cho-duyet'
          ? 'Kế hoạch này đang chờ duyệt — cô bấm "Rút lại" để sửa, chưa cần đề xuất.'
          : 'Kế hoạch này chưa duyệt nên cô sửa thẳng được, không cần đề xuất.',
      });
    }
    if (db.beNgungHoSoHocTap(k.studentId)) {
      return res.status(403).json({ error: 'Gia đình bé này đã dừng phần hồ sơ học tập nên không ghi mới được.' });
    }
    const b = req.body || {};
    const lyDo = chuoi(b.lyDo, TOI_DA_LY_DO);
    // Lý do là thứ nhà trường đòi hỏi bằng lời: "ghi rõ lý do rồi quản lý mới
    // phê duyệt". Không có lý do thì quản lý không có gì để cân nhắc.
    if (!lyDo) return res.status(400).json({ error: 'Cô ghi rõ lý do muốn sửa nhé — quản lý đọc dòng này để quyết' });
    // Đang chờ thì chặn THEO PHẦN: đề xuất của chương trình khác không cản
    // cô này; đề xuất đời cũ (cả bản) và app đời cũ thì vẫn chặn cả bản.
    const dangCho = db.all('kehoachbe_de_xuat',
      "SELECT id FROM kehoachbe_de_xuat WHERE keId = ? AND trangThai = 'cho-duyet'", [k.id])
      .some(d => { const c = ctCuaDeXuat(d.id); return !ctDx || c === null || c === ctDx; });
    if (dangCho) return res.status(400).json({ error: 'Kế hoạch này đã có một đề xuất đang chờ quản lý xem' });

    const luc = new Date().toISOString();
    const id = db.nextId('khdx');
    db.tx(() => {
      db.insert('kehoachbe_de_xuat', {
        id, keId: k.id, coDeXuat: req.user.id, lyDo,
        noiDung: chuoi(b.noiDung, TOI_DA_DE_XUAT_NOI_DUNG),
        trangThai: 'cho-duyet', nguoiDuyet: null, duyetLuc: null, yKien: '', taoLuc: luc,
      });
      if (ctDx) db.run('INSERT OR IGNORE INTO kehoachbe_de_xuat_ct (deXuatId, chuongTrinh) VALUES (?, ?)', [id, ctDx]);
    });
    db.audit(req.user.id, 'kehoachbe-de-xuat', k.studentId, { id, keId: k.id });
    if (req.user.role !== 'admin') {
      const be = db.findStudent(k.studentId);
      baoNhaTruong(k.studentId, {
        tieuDe: 'Có đề xuất sửa kế hoạch chờ duyệt',
        noiDung: `${tenNguoi(req.user.id) || 'Cô'} xin sửa kế hoạch của ${be ? be.name : 'một bé'}: ${lyDo}`,
        hash: '#/kehoachbe',
        tru: req.user.id,
      });
    }
    res.status(201).json({ ok: true, deXuat: deXuatCuaKe(k.id) });
  });

  app.post('/api/kehoachbe/de-xuat/:id/duyet', requireRole('teacher', 'admin'), (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Đề xuất sửa do quản lý duyệt. Cô gửi đề xuất rồi chờ quản lý xem nhé.' });
    }
    const d = db.first('kehoachbe_de_xuat', 'SELECT * FROM kehoachbe_de_xuat WHERE id = ?', [chuoi(req.params.id, 40)]);
    if (!d) return res.status(404).json({ error: 'Không tìm thấy đề xuất này' });
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [d.keId]);
    if (!k) return res.status(404).json({ error: 'Kế hoạch của đề xuất này không còn' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Kế hoạch của bé ngoài phạm vi cơ sở mình' });
    }
    if (d.trangThai !== 'cho-duyet') return res.status(400).json({ error: 'Đề xuất này đã được xem rồi' });
    // Cùng luật với duyệt kế hoạch: người đề xuất không tự duyệt đề xuất của mình.
    if (d.coDeXuat === req.user.id) {
      return res.status(403).json({ error: 'Đề xuất này do chính tài khoản của anh/chị gửi — nhờ một quản lý khác duyệt giúp' });
    }
    const b = req.body || {};
    const quyet = chuoi(b.quyetDinh, 20);
    if (quyet !== 'da-duyet' && quyet !== 'tu-choi') {
      return res.status(400).json({ error: 'Quyết định phải là duyệt hoặc từ chối' });
    }
    const yKien = chuoi(b.yKien, TOI_DA_NHAN_XET);
    if (quyet === 'tu-choi' && !yKien) {
      return res.status(400).json({ error: 'Từ chối thì ghi giúp cô một dòng vì sao nhé' });
    }
    const luc = new Date().toISOString();
    db.tx(() => {
      db.update('kehoachbe_de_xuat', d.id, { trangThai: quyet, nguoiDuyet: req.user.id, duyetLuc: luc, yKien });
      // DUYỆT = MỞ LẠI. Kế hoạch về tay cô ở trạng thái 'nhap'; chữ ký duyệt cũ
      // không còn hiệu lực với bản sắp sửa, nên xoá mốc gửi để cô gửi lại từ đầu.
      //
      // Đề xuất cho một chương trình thì chỉ mở lại phần đó. Đề xuất cũ (cả
      // bản) trên một bản đã tách theo chương trình: mở lại mọi phần đã duyệt.
      if (quyet === 'da-duyet') {
        let ctMo = null;
        try {
          const r = db.first('kehoachbe_de_xuat_ct', 'SELECT chuongTrinh FROM kehoachbe_de_xuat_ct WHERE deXuatId = ?', [d.id]);
          ctMo = r ? r.chuongTrinh : null;
        } catch (_) { ctMo = null; }
        if (ctMo || dongCt(k.id).size) {
          damBaoCt(k);
          const tt = trangThaiCt(k);
          for (const c of (ctMo ? [ctMo] : MA_CT)) {
            if (tt[c].trangThai === 'da-duyet') datCt(k.id, c, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
          }
          db.update('kehoachbe_ke', k.id, { capNhatLuc: luc });
          dongBoKe(k.id);
        } else if (k.trangThai === 'da-duyet') {
          db.update('kehoachbe_ke', k.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
        }
      }
    });
    {
      const be = db.findStudent(k.studentId);
      baoCo(d.coDeXuat, quyet === 'da-duyet'
        ? { tieuDe: 'Đề xuất sửa kế hoạch đã được đồng ý', noiDung: `Kế hoạch của ${be ? be.name : 'bé'} đã mở lại cho cô sửa.`, hash: '#/kehoachbe' }
        : { tieuDe: 'Đề xuất sửa kế hoạch chưa được đồng ý', noiDung: `${be ? be.name : 'Bé'}: ${yKien}`.slice(0, 300), hash: '#/kehoachbe' });
    }
    db.audit(req.user.id, 'kehoachbe-duyet-de-xuat', k.studentId, { id: d.id, keId: k.id, quyetDinh: quyet });
    res.json({ ok: true, quyetDinh: quyet, deXuat: deXuatCuaKe(k.id), ke: keCuaBe(k.studentId, k.thang) });
  });
  // =========================================================================
  // HUY HIỆU (Đ154) — số việc đang chờ CHÍNH NGƯỜI NÀY duyệt
  // =========================================================================
  //
  // Hai loại cộng lại thành một con số: kế hoạch cô gửi chờ duyệt, và đề xuất
  // sửa kế hoạch đã duyệt. Cả hai đều mở cùng một màn nên tách hai con số chỉ
  // tổ rối. Lọc từng bé bằng `canAccessStudent` — quản lý cơ sở 1 không đếm bé
  // của cơ sở 2.
  huyHieu.dangKy('kehoachbe', (user) => {
    if (!user) return 0;
    // CÔ: số phần kế hoạch quản lý GỬI LẠI cho chính cô sửa (góp ý 06/10,
    // mục 6: "gửi thông báo trả về cho giáo viên"). Tin đẩy có thể lạc; con số
    // này nằm trên ô Kế hoạch cho tới khi cô sửa và gửi lại.
    if (user.role === 'teacher') {
      try {
        const tach = db.all('kehoachbe_ke_ct',
          `SELECT k.studentId AS studentId FROM kehoachbe_ke_ct c JOIN kehoachbe_ke k ON k.id = c.keId
            WHERE c.trangThai = 'tra-lai' AND c.coLap = ? LIMIT 500`, [user.id]);
        const cu = db.all('kehoachbe_ke',
          `SELECT studentId FROM kehoachbe_ke WHERE trangThai = 'tra-lai' AND coLap = ?
              AND id NOT IN (SELECT keId FROM kehoachbe_ke_ct) LIMIT 500`, [user.id]);
        return [...tach, ...cu].filter(k => db.canAccessStudent(user, k.studentId)).length;
      } catch (_) { return 0; }
    }
    if (user.role !== 'admin') return 0;
    const cv = db.chucVu(user);
    if (cv !== null && !baoNT.CHUC_VU_NHAN.includes(cv)) return 0;
    // Đếm theo KẾ HOẠCH (một bé một tháng), không theo từng phần: bản nào còn
    // phần chờ duyệt thì `trangThai` gộp của nó là 'cho-duyet' (dongBoKe).
    const ke = db.all('kehoachbe_ke',
      "SELECT studentId FROM kehoachbe_ke WHERE trangThai = 'cho-duyet' ORDER BY guiLuc DESC LIMIT 500")
      .filter(k => db.canAccessStudent(user, k.studentId)).length;
    const dx = db.all('kehoachbe_de_xuat',
      `SELECT k.studentId AS studentId FROM kehoachbe_de_xuat d
         JOIN kehoachbe_ke k ON k.id = d.keId
        WHERE d.trangThai = 'cho-duyet' ORDER BY d.taoLuc DESC LIMIT 500`)
      .filter(k => db.canAccessStudent(user, k.studentId)).length;
    return ke + dx;
  });
};
