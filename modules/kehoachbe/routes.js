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
const NHAN_BAI = [
  ['hoc-moi', 'Học mới'],
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
    return db.all('kehoachbe_baihoc',
      `SELECT * FROM kehoachbe_baihoc ${tatCa ? '' : 'WHERE active = 1'} ORDER BY gocLinhVuc, thuTu, rowid`)
      .map(b => ({ ...b, active: b.active !== 0 }));
  }

  // Bài đã tích của một kế hoạch, kèm tên và góc lấy từ danh mục. Bài đã bị
  // ẨN sau này vẫn hiện đúng tên — kế hoạch tháng cũ không được đổi nghĩa.
  function baiCuaKe(keId) {
    return db.all('kehoachbe_muc_bai',
      `SELECT mb.*, b.ten AS ten, b.gocLinhVuc AS gocLinhVuc
         FROM kehoachbe_muc_bai mb LEFT JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
        WHERE mb.keId = ? ORDER BY mb.rowid`, [keId])
      .map(m => ({ ...m, ten: m.ten || '(bài đã gỡ khỏi danh mục)', gocLinhVuc: m.gocLinhVuc || '',
        tiepTucThangSau: m.tiepTucThangSau !== 0 }));
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

  function keCuaBe(studentId, thang) {
    const k = db.first('kehoachbe_ke',
      'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [studentId, thang]);
    if (!k) return null;
    return {
      ...k,
      coLapTen: tenNguoi(k.coLap),
      nguoiDuyetTen: tenNguoi(k.nguoiDuyet),
      muc: mucCuaKe(k.id),
      baiHoc: baiCuaKe(k.id),
      deXuat: deXuatCuaKe(k.id),
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
        .map(m => ({ baiHocId: m.baiHocId, ten: m.ten, gocLinhVuc: m.gocLinhVuc, nhanXet: m.nhanXet })),
      muc: mucCuaKe(cu.id)
        .filter(m => m.tiepTucThangSau)
        .map(m => ({ gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung, nhanXet: m.nhanXet })),
    };
  }

  // Đọc danh sách bài tích từ thân yêu cầu. Trả về null khi màn hình KHÔNG
  // gửi trường này (bản app cũ) — null nghĩa là "không đụng tới", khác với
  // mảng rỗng nghĩa là "bỏ tích hết".
  function docBaiHoc(x, res) {
    if (!x || !Array.isArray(x.baiHoc)) return null;
    const ra = [];
    const daCo = new Set();
    for (const b of x.baiHoc) {
      const id = chuoi((b || {}).baiHocId, 40);
      if (!id || daCo.has(id)) continue;
      const bai = db.first('kehoachbe_baihoc', 'SELECT * FROM kehoachbe_baihoc WHERE id = ?', [id]);
      if (!bai) { res.status(400).json({ error: 'Có bài học không còn trong danh mục' }); return undefined; }
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
  function ghiBaiHoc(keId, ds, luc) {
    const cu = baiCuaKe(keId);
    db.run('DELETE FROM kehoachbe_muc_bai WHERE keId = ?', [keId]);
    for (const b of ds) {
      const giong = cu.find(o => o.baiHocId === b.baiHocId);
      db.insert('kehoachbe_muc_bai', {
        id: db.nextId('khmb'), keId, baiHocId: b.baiHocId, nhan: b.nhan,
        ketQua: giong ? giong.ketQua : '',
        nhanXet: giong ? giong.nhanXet : '',
        tiepTucThangSau: giong && giong.tiepTucThangSau ? 1 : 0,
        capNhatLuc: luc,
      });
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
        // Gợi ý từ tháng gần nhất — chỉ khi bé CHƯA có bản tháng này; đã có
        // bản thì cô đã quyết rồi, gợi ý nữa là nói chen.
        goiY: ke ? null : goiYChoThang(b.id, thang),
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
      baiHoc: danhMucBai(),
      laQuanLy: req.user.role === 'admin',
      nhom: nhomCuaToi(req.user).map(c => ({ id: c.id, name: c.name })),
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

    napDanhMucNeuTrong();
    const id = cu ? cu.id : db.nextId('khbh');
    if (cu) db.update('kehoachbe_baihoc', id, { gocLinhVuc: goc, ten, moTa, thuTu, active });
    else db.insert('kehoachbe_baihoc', { id, gocLinhVuc: goc, ten, moTa, thuTu, active, nguoiTao: req.user.id, taoLuc: new Date().toISOString() });
    db.audit(req.user.id, cu ? 'kehoachbe-sua-bai' : 'kehoachbe-them-bai', id, { gocLinhVuc: goc, ten, active });
    const r = db.first('kehoachbe_baihoc', 'SELECT * FROM kehoachbe_baihoc WHERE id = ?', [id]);
    res.json({ ok: true, baiHoc: { ...r, active: r.active !== 0 } });
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
      if (goc !== undefined && String((cu && cu.capNhatLuc) || '') !== String(goc || '')) {
        xungDot.push({ studentId: be.id, hoTen: be.name });
        continue;
      }
      if (chanNeuKhoa(res, cu)) return;

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
        const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
        if (!noiDung) continue;   // ô trống là ô cô chưa định làm gì ở góc đó
        muc.push({ gocLinhVuc: goc, noiDung });
      }
      if (muc.length > TOI_DA_MUC_MOI_BE) {
        return res.status(400).json({ error: `Mỗi bé tối đa ${TOI_DA_MUC_MOI_BE} mục một tháng` });
      }
      // Bài tích chọn (đợt 2). `null` = màn hình không gửi trường này = không
      // đụng tới bài đã tích — bản app cũ trong điện thoại vẫn lưu ô chữ được.
      const baiHoc = docBaiHoc(x, res);
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
          db.update('kehoachbe_ke', cu.id, { capNhatLuc: luc });
        } else {
          keId = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id: keId, studentId: be.id, classId, thang,
            trangThai: 'nhap', coLap: req.user.id, lapLuc: luc,
            guiLuc: null, nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
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
        daLuu += 1;
      }
    });

    db.audit(req.user.id, 'kehoachbe-luu', classId, {
      thang, soBe: daLuu, boQua: boQua.length || undefined, xungDot: xungDot.length || undefined,
    });
    res.json({
      ok: true, thang, classId, daLuu, boQuaNgungHoSo: boQua, xungDot,
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

    const muc = [];
    for (const m of (b.muc || [])) {
      const goc = chuoi((m || {}).gocLinhVuc, 40);
      if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
      const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
      if (noiDung) muc.push({ gocLinhVuc: goc, noiDung });
    }
    // Đặt cả nhóm cũng tích được bài — cả nhóm cùng học "Tháp hồng" tháng này
    // là chuyện thường ở lớp Montessori.
    const baiHocDoc = docBaiHoc(b, res);
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
        if (k && !duocSuaNoiDung(k)) { boQua += 1; continue; }
        if (!k) {
          const id = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id, studentId: be.id, classId, thang, trangThai: 'nhap',
            coLap: req.user.id, lapLuc: luc, guiLuc: null,
            nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
          k = { id };
        }
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
        // buổi soạn của cô.
        if (nay) { boQua += 1; continue; }

        let muc = mucCuaKe(cu.id);
        if (chiTiepTuc) muc = muc.filter(m => m.tiepTucThangSau);
        else muc = [...muc.filter(m => m.tiepTucThangSau), ...muc.filter(m => !m.tiepTucThangSau)];
        // Bài đã tích cũng chép sang, cùng luật: bài "Tiếp tục cùng con" lên
        // trước và mang nhãn ÔN TẬP — tháng sau làm lại thì không còn là học
        // mới nữa. Bài đã thấy con làm được thì chép nguyên nhãn cô chọn.
        const laTiep = (m) => m.ketQua === 'tiep-tuc' || m.tiepTucThangSau;
        let bai = baiCuaKe(cu.id).filter(m => m.gocLinhVuc);   // bài đã gỡ khỏi danh mục thì thôi
        if (chiTiepTuc) bai = bai.filter(laTiep);
        else bai = [...bai.filter(laTiep), ...bai.filter(m => !laTiep(m))];
        if (!muc.length && !bai.length) continue;

        const id = db.nextId('khb');
        db.insert('kehoachbe_ke', {
          id, studentId: be.id, classId, thang, trangThai: 'nhap',
          coLap: req.user.id, lapLuc: luc, guiLuc: null,
          nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
        });
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
            nhan: laTiep(m) ? 'on-tap' : m.nhan,
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
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
  app.post('/api/kehoachbe/gui-duyet', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền với nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    const chiBe = chuoi(b.studentId, 40);

    const luc = new Date().toISOString();
    let daGui = 0;
    let trong = 0;
    db.tx(() => {
      for (const be of beCuaNhom(classId)) {
        if (chiBe && be.id !== chiBe) continue;
        const k = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        if (!k || !duocSuaNoiDung(k)) continue;
        // Kế hoạch rỗng thì không gửi — quản lý mở ra thấy trang trắng.
        if (!mucCuaKe(k.id).length && !baiCuaKe(k.id).length) { trong += 1; continue; }
        db.update('kehoachbe_ke', k.id, { trangThai: 'cho-duyet', guiLuc: luc, capNhatLuc: luc });
        daGui += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-gui-duyet', classId, { thang, daGui });
    // BÁO QUẢN LÝ (Đ154). Gửi cả nhóm là một lượt bấm, nên báo MỘT tin cho cả
    // lượt chứ không phải mỗi bé một tin — quản lý không cần biết tên từng bé
    // để mở màn duyệt ra, mà 20 tiếng chuông liền nhau thì đúng là làm phiền.
    if (daGui > 0 && req.user.role !== 'admin') {
      const lop = db.findClass(classId);
      baoNhaTruongTheoNhom(classId, {
        tieuDe: 'Có kế hoạch của bé chờ duyệt',
        noiDung: `${tenNguoi(req.user.id) || 'Cô'} vừa gửi ${daGui} kế hoạch tháng ${thang}`
          + `${lop ? ` của nhóm ${lop.name}` : ''}.`,
        hash: '#/kehoachbe',
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
    if (k.trangThai !== 'cho-duyet') {
      return res.status(400).json({ error: 'Chỉ rút lại được kế hoạch đang chờ duyệt' });
    }
    const luc = new Date().toISOString();
    db.update('kehoachbe_ke', k.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
    db.audit(req.user.id, 'kehoachbe-rut-lai', k.studentId, { id: k.id });
    res.json({ ok: true, id: k.id, trangThai: 'nhap' });
  });

  // DUYỆT — VIỆC CỦA QUẢN LÝ, KHÔNG PHẢI CỦA CÔ.
  //
  // Cùng luật với duyệt đơn nghỉ (Y2): người lập không phải người duyệt, nếu
  // không thì bước duyệt chỉ là một cái nút thừa.
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

    const ids = Array.isArray(b.ids) ? b.ids.map(x => chuoi(x, 40)).filter(Boolean) : [];
    if (!ids.length || ids.length > TOI_DA_BE_MOT_LAN) {
      return res.status(400).json({ error: 'Danh sách kế hoạch cần duyệt chưa hợp lệ' });
    }

    const sach = [];
    for (const id of ids) {
      const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [id]);
      if (!k) return res.status(404).json({ error: 'Danh sách có kế hoạch không tồn tại' });
      if (!db.canAccessStudent(req.user, k.studentId)) {
        return res.status(403).json({ error: 'Có kế hoạch của bé ngoài phạm vi cơ sở mình' });
      }
      if (k.trangThai !== 'cho-duyet') {
        return res.status(400).json({ error: 'Chỉ duyệt được kế hoạch đang chờ duyệt' });
      }
      // NGƯỜI LẬP KHÔNG DUYỆT KẾ HOẠCH CỦA CHÍNH MÌNH — với CẢ quản lý.
      //
      // Chốt vai ở đầu đường chỉ chặn được cô; một tài khoản quản trị tự lập
      // kế hoạch (đường lưu cho phép admin) rồi tự duyệt thì bước duyệt thành
      // cái nút thừa đúng như chú thích trên đã cảnh báo.
      if (k.coLap === req.user.id) {
        return res.status(403).json({
          error: 'Kế hoạch này do chính tài khoản của anh/chị lập — nhờ một quản lý khác duyệt giúp',
        });
      }
      sach.push(k);
    }

    const luc = new Date().toISOString();
    db.tx(() => {
      for (const k of sach) {
        db.update('kehoachbe_ke', k.id, {
          trangThai: quyet, nguoiDuyet: req.user.id, duyetLuc: luc,
          yKienDuyet: yKien, capNhatLuc: luc,
        });
      }
    });
    db.audit(req.user.id, 'kehoachbe-duyet', null, { quyetDinh: quyet, so: sach.length });
    res.json({ ok: true, quyetDinh: quyet, so: sach.length });
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
    const sachBai = [];
    for (const m of (b.baiHoc || [])) {
      const cu = db.first('kehoachbe_muc_bai', 'SELECT * FROM kehoachbe_muc_bai WHERE id = ?', [chuoi((m || {}).id, 40)]);
      if (!cu || cu.keId !== k.id) {
        return res.status(400).json({ error: 'Có bài không thuộc kế hoạch này' });
      }
      const kl = chuoi((m || {}).ketQua, 20);
      if (kl && !MA_KET_LUAN.includes(kl)) {
        return res.status(400).json({ error: 'Kết luận cho bài chỉ có hai lựa chọn: đã thấy con làm được, hoặc tiếp tục cùng con' });
      }
      sachBai.push({
        id: cu.id,
        ketQua: kl,
        nhanXet: chuoi((m || {}).nhanXet, TOI_DA_NHAN_XET),
        // "Tiếp tục cùng con" TỰ ĐỘNG là việc của tháng sau — cô không phải
        // tích thêm một ô nữa để nói cùng một điều.
        tiepTucThangSau: (kl === 'tiep-tuc' || (m || {}).tiepTucThangSau) ? 1 : 0,
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
    if (k.trangThai !== 'da-duyet') {
      return res.status(400).json({
        error: k.trangThai === 'cho-duyet'
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
    const dangCho = db.first('kehoachbe_de_xuat',
      "SELECT id FROM kehoachbe_de_xuat WHERE keId = ? AND trangThai = 'cho-duyet'", [k.id]);
    if (dangCho) return res.status(400).json({ error: 'Kế hoạch này đã có một đề xuất đang chờ quản lý xem' });

    const luc = new Date().toISOString();
    const id = db.nextId('khdx');
    db.insert('kehoachbe_de_xuat', {
      id, keId: k.id, coDeXuat: req.user.id, lyDo,
      noiDung: chuoi(b.noiDung, TOI_DA_DE_XUAT_NOI_DUNG),
      trangThai: 'cho-duyet', nguoiDuyet: null, duyetLuc: null, yKien: '', taoLuc: luc,
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
      if (quyet === 'da-duyet' && k.trangThai === 'da-duyet') {
        db.update('kehoachbe_ke', k.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
      }
    });
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
    if (!user || user.role !== 'admin') return 0;
    const cv = db.chucVu(user);
    if (cv !== null && !baoNT.CHUC_VU_NHAN.includes(cv)) return 0;
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
