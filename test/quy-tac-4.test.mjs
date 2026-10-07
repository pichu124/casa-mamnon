// Bài canh QUY TẮC 4 — không phần trăm, không điểm số, không xếp hạng TRẺ.
//
// Chạy bằng:  npm run test:quy-tac-4
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` xếp QUY TẮC 4 ngang hàng với Nguyên tắc số 1, và nói thẳng rằng nó
// phải được "canh bằng máy, không bằng trí nhớ". Chưa có bài này thì nó mới chỉ
// là một lời hứa: G0.5 đã dọn sạch dữ liệu mẫu (không một điểm số nào,
// `points: 0` ở mọi bản ghi nề nếp), nhưng không có gì giữ cho nó ở nguyên như
// thế qua lần sửa sau.
//
// CÁCH LÀM: BÁNH CÓC, KHÔNG PHẢI CÔNG TẮC
//
// App vẫn còn hai màn hình tiểu học chưa gỡ (N3 trong docs/TIEN-DO.md): Nề nếp
// có bảng xếp hạng trẻ, và Học bạ có ô nhập điểm thang 10. Bài này KHÔNG bắt
// chúng biến mất ngay — làm vậy thì hoặc phải gỡ tính năng khi chưa được duyệt,
// hoặc phải viết một bài test luôn đỏ, và cả hai đều sai.
//
// Thay vào đó nó ghi lại CHÍNH XÁC món nợ đang có và bắt con số ấy chỉ được
// GIẢM. Thêm một chỗ vi phạm mới ở bất cứ đâu → đỏ ngay. Gỡ xong N3 → hạ số
// trong `NO_DA_BIET` xuống, bài test tự siết chặt thêm.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Quét CẢ THƯ MỤC `modules`, không liệt kê từng phân hệ một.
//
// Bản đầu ghi tay 'modules/hocphi' và 'modules/thuchup'. Nghĩa là mọi phân hệ
// THÊM SAU đó đều lọt khỏi bộ canh này mà không ai được báo gì — bộ canh vẫn
// xanh, chỉ là nó không nhìn vào chỗ mới. Phát hiện khi thêm phân hệ Nhật ký
// ngày: nó không nằm trong danh sách nên không được quét một dòng nào.
//
// Đây đúng là kiểu "bài kiểm thử bao phủ thiếu đúng chỗ nguy hiểm" mà
// CLAUDE.md dặn phải nêu: một danh sách viết tay thì luôn lạc hậu so với thư
// mục thật, và lạc hậu về phía NỚI RA.
const VUNG_QUET = [
  // QUÉT CẢ `public/js`, KHÔNG CHỈ `public/js/views`.
  //
  // Bản trước chỉ quét thư mục `views`, nên `public/js/ui.js`, `public/js/app.js`
  // và `public/js/api.js` nằm NGOÀI tầm nhìn của bộ canh. Đó là ba tệp mà cả
  // ứng dụng đang dựa vào: thêm bao nhiêu dấu hiệu vào `DAU_HIEU` cũng không
  // chạm tới một dòng nào trong đó.
  //
  // Đổi `public/js/views` thành `public/js` chứ KHÔNG thêm vào bên cạnh: hàm
  // `cacTep` đi vào cả thư mục con, nên để cả hai là mỗi tệp trong `views` bị
  // đếm hai lần và món nợ tự nhân đôi.
  // QUÉT CẢ `lib` VÀ `server.js`, KHÔNG CHỈ `lib/modules.js`.
  //
  // Đầu bài này tự nhận nó soi `schema.sql` — và đúng, nó có đọc `.sql`. Nhưng
  // vùng quét chỉ có `lib/modules.js`, nên **`lib/schema.sql` — lược đồ LÕI,
  // nơi khai từng cột của từng bảng cho cả ứng dụng — nằm ngoài tầm nhìn**.
  // Chỉ `schema.sql` của các phân hệ cắm thêm (trong `modules/`) là được soi.
  //
  // Một cột `xep_hang`, `diem_thi_dua` hay `hoc_luc` thêm vào `lib/schema.sql`
  // vì thế đi qua sạch sẽ, trong khi đúng cột ấy đặt trong một phân hệ cắm
  // thêm thì bị bắt ngay. Cửa sau rộng nhất lại nằm ở tệp trung tâm nhất.
  //
  // `server.js` vào cùng lượt: nó cũng dựng chữ ra màn hình (trang lỗi, trang
  // chặn) và cũng là tệp không thuộc phân hệ nào.
  //
  // Là SIẾT, không phải nới. Mở rộng xong bộ canh báo đỏ đúng MỘT chỗ — một
  // dòng chú thích ở `lib/sua-thu-hoi.js` kể lại chuyện app 1 trừ điểm thi
  // đua. Đã sửa chính dòng chú thích ấy chứ KHÔNG thêm ngoại lệ: bộ canh này
  // cố ý không chừa chú thích, vì thứ bị cấm là LỜI VĂN và một câu nằm trong
  // chú thích vẫn có thể bị ai đó chép ra màn hình.
  'public/js', 'public/sw.js', 'routes', 'modules',
  'lib', 'server.js', 'data/seed.js',
];

// Mỗi dấu hiệu là một CÁCH xếp trẻ trên dưới nhau.
// Mọi mẫu đều có cờ `i`.
//
// Bản trước không có, nên "ĐIỂM SỐ" ở một tiêu đề viết hoa, "Thi đua" đầu câu,
// hay "XẾP HẠNG" trong một nhãn nút đều lọt sạch — bộ canh xanh trong khi chữ
// vi phạm nằm ngay trên màn hình. Thêm cờ `i` không làm đỏ chỗ nào đang có,
// nghĩa là nó chỉ bịt lỗ chứ không đổi luật.
const DAU_HIEU = [
  { ten: 'xếp hạng trẻ', re: /xếp hạng|\branking\b|xep_hang|xepHang/i },
  { ten: 'điểm thi đua', re: /thi đua|thi_dua|thiDua/i },
  { ten: 'điểm số của trẻ', re: /điểm thang 10|bảng điểm|điểm số|diem_so|diemSo/i },
  // "78%" hiện ra màn hình. Chỉ bắt dạng `${...}%` — đó là phần trăm ĐƯỢC TÍNH
  // rồi in ra, khác hẳn `width:100%` của bố cục.
  { ten: 'phần trăm hiện ra màn hình', re: /\}%/ },
  // ĐIỂM SỐ KHI NÓ KHÔNG TỰ GỌI TÊN MÌNH.
  //
  // Bốn dấu hiệu trên đều đi tìm CHỮ: "điểm số", "xếp hạng", "thi đua". Nhưng
  // mã nguồn thì hay không nói chữ nào cả. `public/js/views/hocsinhcu.js` in
  // điểm từng môn cho phụ huynh bằng `m.score ?? m.level` — không khớp mẫu nào,
  // nên tệp đó không nằm trong món nợ và bộ canh vẫn xanh trong khi con số về
  // một đứa trẻ đang hiện ngay trên màn hình gia đình.
  //
  // Nên thêm một dấu hiệu bắt theo TÊN TRƯỜNG DỮ LIỆU, không theo lời văn.
  // `\b` của JS chỉ hiểu chữ ASCII, mà `score`/`diem` đều là ASCII nên dùng
  // được ở đây.
  { ten: 'điểm số của trẻ (tên trường dữ liệu)', re: /\b(score|diem|diemTrungBinh|hocLuc)\b|\.score\b/i },
  // XẾP LOẠI THỂ TRẠNG — THÊM CÙNG ĐỢT CHO PHÉP HIỆN CON SỐ BMI (Đ186).
  //
  // Nhà trường xin hiện BMI và trả lời gọn là họ cần *"con số"*. Con số thô thì
  // không xếp trẻ trên dưới nhau: nó là một phép chia từ cân nặng và chiều cao,
  // đứng một mình, không so bé nào với bé nào.
  //
  // Thứ QUY TẮC 4 cấm là BƯỚC TIẾP THEO, và bước đó rất dễ đi: có con số rồi
  // thì đường ngắn nhất luôn là dán thêm một chữ vào cạnh nó — "thừa cân",
  // "suy dinh dưỡng", "dưới chuẩn của độ tuổi". Với trẻ 12 tháng – 6 tuổi,
  // những chữ ấy chỉ ra được khi quy chiếu theo tuổi, tức là đem đứa trẻ đặt
  // cạnh một cái chuẩn — đúng điều quy tắc cấm hiện ra trước mặt cô và gia đình.
  //
  // Nên dấu hiệu này có mặt NGAY TRONG ĐỢT mở đường cho con số, không phải sau.
  // Cùng lý do bộ canh QUY TẮC 3 có mặt trước khi kho mã có một dòng AI nào:
  // bài canh phải đứng sẵn ở cuối con đường trước khi ai đó bắt đầu đi.
  //
  // Hôm thêm vào, dấu hiệu này không bắt được một dòng nào trong cả kho — nó
  // hoàn toàn là một cái chốt cho tương lai, và điều đó được đo ở mục [1c].
  {
    ten: 'xếp loại thể trạng của trẻ',
    re: /percentile|bách phân vị|z-?score|z_score|suy dinh dưỡng|thừa cân|béo phì|nhẹ cân so|so với chuẩn|chuẩn của độ tuổi|chuẩn độ tuổi|đạt chuẩn/i,
  },
];

// Được phép, kèm lý do. Không phải mọi phần trăm đều là xếp hạng trẻ.
//
// NGOẠI LỆ THEO DÒNG, KHÔNG THEO CẢ TỆP.
//
// Bản trước bỏ qua NGUYÊN TỆP khi tên tệp có trong danh sách này. Nhưng lý do
// miễn trừ chỉ đúng cho MỘT dấu hiệu — phần trăm phiếu khảo sát của người lớn —
// còn cách viết thì miễn luôn cả năm. Thêm chữ "xếp hạng" hay "điểm thi đua"
// vào `surveys.js` là bộ canh không hé một tiếng: một cửa sau bỏ ngỏ ngay
// trong bộ canh của QUY TẮC 4.
//
// Bộ canh QUY TẮC 2 đã làm đúng hơn từ đầu (hàm `chiDong`), nên đưa về cùng
// dạng: mỗi ngoại lệ phải nói rõ nó chừa ĐÚNG DÒNG NÀO.
const NGOAI_LE = [
  {
    tep: 'modules/hocphi/view.js',
    vi_sao: 'Mức ƯU ĐÃI HỌC PHÍ ghi được cả bằng số tiền lẫn bằng phần trăm (Đ169). '
      + 'Phần trăm ở đây là tỉ lệ giảm của một khoản TIỀN NGƯỜI LỚN NỘP — không phải '
      + 'một con số về đứa trẻ, không so bé này với bé kia, không sinh ra thứ tự nào '
      + 'giữa các bé (bảng ưu đãi xếp theo TÊN, và bài canh của nó chốt điều đó). '
      + 'QUY TẮC 4 giữ cho trẻ không bị sắp trên dưới nhau, không cấm nói về tiền.\n'
      + 'CHỦ DỰ ÁN ĐÃ DUYỆT 11/09: được hỏi mức ưu đãi nên ghi bằng số tiền hay phần '
      + 'trăm — kèm cảnh báo rằng chọn phần trăm là phải xin đúng dòng ngoại lệ này — '
      + 'và chọn "cả hai, trường chọn từng ưu đãi".',
    // Chừa ĐÚNG MỘT DÒNG: dòng in ra mức giảm theo phần trăm. Mọi dòng khác
    // của tệp này vẫn bị soi như thường — kể cả chú thích.
    chiDong: (dong) => /giảm \$\{Number\(u\.giaTri\)\}%/.test(dong),
    // Và chừa khỏi ĐÚNG MỘT dấu hiệu. Lý do ở trên chỉ nói về phần trăm; nếu
    // ngày nào đó chính dòng ấy mọc thêm chữ "xếp hạng" thì nó phải đỏ.
    chiDauHieu: ['phần trăm hiện ra màn hình'],
  },
  {
    tep: 'public/js/views/surveys.js',
    vi_sao: 'Phần trăm ở đây là tỉ lệ PHỤ HUYNH chọn mỗi phương án trong khảo sát — '
      + 'không phải con số về một đứa trẻ. QUY TẮC 4 cấm xếp hạng TRẺ, không cấm '
      + 'đếm phiếu của người lớn.',
    // Chỉ chừa đúng những dòng in ra tỉ lệ phiếu. Mọi dòng khác của tệp này vẫn
    // bị soi như thường.
    chiDong: (dong) => /\}%|phần trăm|tỉ lệ|ti le/i.test(dong),
    chiDauHieu: ['phần trăm hiện ra màn hình'],
  },
  {
    tep: 'data/seed.js',
    vi_sao: 'Chú thích trong dữ liệu mẫu giải thích vì sao mọi bản ghi nề nếp đều '
      + 'points: 0. Nhắc tới "xếp hạng" để nói rằng đang cố ý KHÔNG xếp hạng.',
    // Chừa hai loại dòng, và chỉ hai:
    //   1. dòng CHÚ THÍCH — nó nói về QUY TẮC 4 chứ không sinh ra dữ liệu nào;
    //   2. dòng đặt trường đó về GIÁ TRỊ TRUNG TÍNH (`null` hoặc `0`) — tức là
    //      chính chỗ đang thực thi QUY TẮC 4.
    // `score: 8.5` thì vẫn bị bắt, và đó là điểm khác nhau giữa ngoại lệ này
    // với việc bỏ qua cả tệp như bản trước.
    chiDong: (dong) => /^\s*(\/\/|\*|\/\*)/.test(dong)
      || /\b(score|diem\w*|points|hocLuc)\s*:\s*(null|0)\s*[,}]/.test(dong),
    chiDauHieu: [
      'xếp hạng trẻ', 'điểm thi đua', 'điểm số của trẻ',
      'điểm số của trẻ (tên trường dữ liệu)',
    ],
  },
];

// MÓN NỢ ĐÃ BIẾT — chỉ được GIẢM, không được tăng.
//
// Hai màn hình dưới đây là phần tiểu học của app 1, sẽ gỡ ở N3 theo đúng quy
// trình "bỏ tính năng" của CLAUDE.md. Con số là số DÒNG có dấu hiệu vi phạm.
//
// CON SỐ TĂNG VÌ CÁI THƯỚC DÀI RA, KHÔNG PHẢI VÌ NỢ PHÌNH RA.
//
// Bốn con số dưới đây vừa được nâng khi thêm dấu hiệu "điểm số của trẻ (tên
// trường dữ liệu)". Không một dòng vi phạm nào mới được viết — bộ canh chỉ
// nhìn thấy thêm những dòng vốn đã nằm đó, ở đúng bốn tệp đã biết.
//
// Đây là ngoại lệ duy nhất được phép của luật bánh cóc, và nó có canh riêng:
// mục [2b] bên dưới khoá cứng DANH SÁCH TỆP. Số dòng có thể tăng khi thước dài
// ra, nhưng DANH SÁCH TỆP thì không bao giờ được dài thêm — một tệp mới xuất
// hiện ở đây nghĩa là có vi phạm mới thật, và mục [1] sẽ bắt nó trước.
const NO_DA_BIET = {
  // Hai tệp Nề nếp KHÔNG đổi số: dấu hiệu mới không tìm thấy gì thêm ở đó, vì
  // chúng vốn đã gọi thẳng tên "điểm thi đua" và "xếp hạng".
  'public/js/views/conduct.js': { so: 5, vi_sao: 'Nề nếp: bảng xếp hạng trẻ theo điểm thi đua. Gỡ ở N3.' },
  'routes/conduct.js': { so: 7, vi_sao: 'Nề nếp: máy chủ tính tổng điểm rồi sắp xếp trẻ. Gỡ ở N3.' },
  // Hai tệp Học bạ tăng 1 → 6 và 4 → 9. Toàn bộ phần tăng là những dòng dùng
  // `score` mà không nói chữ "điểm" nào — đúng lỗ mà dấu hiệu mới sinh ra để bịt.
  'public/js/views/reports.js': { so: 6, vi_sao: 'Học bạ: ô nhập điểm thang 10 cho từng môn. Gỡ ở N3.' },
  'routes/reports.js': { so: 9, vi_sao: 'Học bạ: máy chủ kiểm điểm 0–10. Gỡ ở N3.' },
};

// XẾP TRẺ BA BẬC MÀ KHÔNG DÙNG MỘT CHỮ NÀO TRONG NĂM DẤU HIỆU TRÊN.
//
// `public/js/ui.js` có hằng `UI.RATING`: ba mức "Con làm rất tốt" / "Con làm
// tốt" / "Cần cố gắng thêm", kế thừa từ app 1. Ba mức xếp trên dưới về một
// đứa trẻ là đúng thứ QUY TẮC 4 cấm — nhưng nó không nói "điểm", không nói
// "xếp hạng", không nói "thi đua", và tên trường là `rating` chứ không phải
// `score`. Nên cả năm dấu hiệu trên đều trượt, kể cả sau khi vùng quét đã mở
// rộng tới `public/js/ui.js`.
//
// VÌ SAO LÀ MỘT BÁNH CÓC RIÊNG, KHÔNG PHẢI THÊM VÀO `NO_DA_BIET`
//
// Luật của mục [2b] là "danh sách tệp chỉ được NGẮN ĐI". Ghi bốn tệp này vào
// `NO_DA_BIET` là làm danh sách đó DÀI RA — tức phải nới một bộ canh bất khả
// xâm phạm để bịt một lỗ của chính nó. Đổi lại: một bánh cóc thứ hai, siết
// từ lúc sinh ra, còn bánh cóc cũ không bị chạm một dòng nào.
//
// Hôm nay chưa gia đình nào nhìn thấy ba mức đó: cả Nhận xét hàng ngày (A2)
// lẫn Hồ sơ con đã ra trường (Đ5) đều TẮT SẴN. Nhưng "đang tắt" không phải là
// "đã gỡ" — bật lại một trong hai màn là ba mức hiện lên ngay, và trước bộ
// canh này thì không có gì kêu một tiếng.
const DAU_HIEU_BA_MUC = [
  { ten: 'mã của mức thấp nhất', re: /\bneeds_effort\b|\bneedsEffort\b/ },
  { ten: 'nhãn xếp trẻ trên dưới', re: /Cần cố gắng thêm|Con làm rất tốt|Cần cố gắng</ },
  { ten: 'bảng ba mức đánh giá trẻ', re: /\bUI\.RATING\b|^\s*const RATINGS?\s*[=]/ },
];

// Sổ nợ RIÊNG của mẫu ba mức. Cùng luật bánh cóc: chỉ được giảm.
//
// SIẾT TỪ BỐN TỆP XUỐNG MỘT, ghi ở Đ203 (việc 47). Ba tệp giao diện đã sạch
// hẳn — đó là lý do sổ này sinh ra, và hôm nay nó thu lại đúng như đã hẹn:
//
//   • `public/js/ui.js` — hằng dùng chung, XOÁ HẲN. Đi đủ ba bước của
//     CLAUDE.md cho tệp dùng chung: bước 1 không có gì để làm (QUY TẮC 4 cấm
//     đặt trẻ trên dưới nhau, nên thứ này không có cái thay thế, chỉ có đường
//     đi ra), bước 2 chuyển mọi chỗ gọi, bước 3 là commit này.
//   • `public/js/views/remarks.js` và `public/js/views/hocsinhcu.js` — sạch ở
//     bước 2, cả chỗ HIỆN lẫn hai ô CHỌN bắt cô đặt bậc cho một đứa trẻ.
//
// CÒN ĐÚNG MỘT TỆP, VÀ NÓ Ở LẠI CÓ CHỦ Ý: `routes/remarks.js` giữ danh sách ba
// mã cũ để nhận xét cô đã viết từ trước vẫn đọc được, và để điện thoại còn giữ
// bản app cũ vẫn gửi được. Bỏ một tính năng là ngưng dùng nó, không phải xoá
// dữ liệu của nó (Nguyên tắc số 1). Không màn hình nào dựng nó thành một cái
// bậc nữa — đó mới là thứ QUY TẮC 4 hỏi.
const NO_BA_MUC = {
  'routes/remarks.js': { so: 1, vi_sao: 'Máy chủ giữ danh sách mã cũ cho bản ghi cũ và cho app đời cũ. Ở lại có chủ ý.' },
};
const TEP_NO_BA_MUC = Object.keys(NO_BA_MUC);

// Danh sách tệp còn nợ, KHOÁ CỨNG. Chỉ được ngắn đi.
const TEP_CON_NO = Object.keys(NO_DA_BIET);

// Đi vào cả thư mục con. Không có phần này thì 'modules' quét ra rỗng, vì mọi
// tệp của phân hệ nằm trong thư mục con của nó.
function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const con = path.join(p, f);
    if (fs.statSync(con).isDirectory()) ra.push(...cacTep(path.relative(GOC, con)));
    // Quét cả `.sql` và `.json`, không chỉ `.js`.
    //
    // Một cột tên `diem_so` trong schema.sql, hay một nhãn "Bảng xếp hạng"
    // trong module.json, là vi phạm y hệt — nhưng bản trước chỉ đọc `.js` nên
    // hai chỗ đó là cửa sau bỏ ngỏ.
    else if (/\.(js|sql|json)$/.test(f)) ra.push(con);
  }
  return ra;
}

export function quet(vung = VUNG_QUET, dauHieu = DAU_HIEU) {
  const theoTep = {};
  for (const muc of vung) {
    for (const tep of cacTep(muc)) {
      const tuongDoi = path.relative(GOC, tep).split(path.sep).join('/');
      const nl = NGOAI_LE.filter((n) => n.tep === tuongDoi);
      const dongs = fs.readFileSync(tep, 'utf8').split('\n');
      dongs.forEach((dong, i) => {
        // NGOẠI LỆ CHỪA KHỎI ĐÚNG DẤU HIỆU ĐÃ NÊU LÝ DO, KHÔNG CHỪA CẢ DÒNG.
        //
        // Bản trước là `if (nl.some(n => n.chiDong(dong))) return;` — một dòng
        // khớp ngoại lệ được chừa khỏi CẢ NĂM dấu hiệu. Ngoại lệ của surveys.js
        // khớp mọi dòng có `}%`, nên một dòng vừa in tỉ lệ phiếu vừa mang chữ
        // "xếp hạng" hay `score` sẽ lọt sạch — trong khi lý do viết ra chỉ xin
        // chừa phần trăm. Đó là một bộ canh sẽ xanh đúng vào ngày nó cần đỏ.
        //
        // Nay mỗi ngoại lệ phải khai `chiDauHieu`, và chỉ những dấu hiệu ấy
        // được gỡ khỏi kết quả. Đây là SIẾT CHẶT bộ canh của QUY TẮC 4, không
        // phải nới — mục [5] có phép thử ngược chứng minh điều đó.
        const hit = dauHieu.filter((d) => d.re.test(dong))
          .filter((d) => !nl.some((n) => n.chiDong(dong) && (n.chiDauHieu || []).includes(d.ten)));
        if (!hit.length) return;
        (theoTep[tuongDoi] ||= []).push({ dong: i + 1, dau: hit.map((h) => h.ten).join(', '), trich: dong.trim().slice(0, 100) });
      });
    }
  }
  return theoTep;
}

// ===========================================================================
console.log('\n[1] Không có chỗ vi phạm MỚI nào ngoài món nợ đã ghi');
{
  const theoTep = quet();
  const moi = Object.keys(theoTep).filter((t) => !NO_DA_BIET[t]);
  check('không màn hình nào mới sinh ra cách xếp trẻ trên dưới nhau',
    moi.length === 0,
    moi.map((t) => `${t}: ${theoTep[t].map((v) => v.dong + ' ' + v.trich).join(' | ')}`).slice(0, 5));
}

// ===========================================================================
console.log('\n[2] Món nợ cũ chỉ được GIẢM, không được phình ra');
{
  const theoTep = quet();
  for (const [tep, { so, vi_sao }] of Object.entries(NO_DA_BIET)) {
    const thuc = (theoTep[tep] || []).length;
    check(`${tep} — nợ ≤ ${so} dòng (${vi_sao})`, thuc <= so, `đang là ${thuc}`);
    if (thuc < so) {
      console.log(`      ↓ đã giảm còn ${thuc}/${so} — hạ con số trong NO_DA_BIET xuống để siết chặt thêm.`);
    }
  }
}

// ===========================================================================
console.log('\n[2b] Danh sách tệp còn nợ chỉ được NGẮN ĐI, không bao giờ dài ra');
{
  // Số dòng nợ được phép tăng khi bộ canh siết chặt thêm (thước dài ra thì đo
  // được nhiều hơn). Nhưng DANH SÁCH TỆP thì không: một tệp mới ở đây nghĩa là
  // có chỗ vi phạm mới thật, và cách duy nhất đúng là sửa chỗ đó chứ không
  // phải ghi thêm một dòng nợ.
  check('vẫn đúng bốn tệp của phần tiểu học, không thêm tệp nào',
    TEP_CON_NO.length === 4, TEP_CON_NO);
  check('cả bốn đều thuộc hai phân hệ đã tắt sẵn (Nề nếp, Báo cáo)',
    TEP_CON_NO.every(t => /conduct|reports/.test(t)), TEP_CON_NO);
  check('mọi tệp còn nợ đều tồn tại thật — sổ nợ không có mục ruỗng',
    TEP_CON_NO.every(t => fs.existsSync(path.join(GOC, t))),
    TEP_CON_NO.filter(t => !fs.existsSync(path.join(GOC, t))));
}

// ===========================================================================
console.log('\n[2c] Mẫu XẾP TRẺ BA BẬC — bánh cóc riêng, siết từ lúc sinh ra');
{
  const theoTep = quet(VUNG_QUET, DAU_HIEU_BA_MUC);

  // TRƯỚC HẾT: cái thước phải đo được thật. Không có phép kiểm này thì cả mục
  // vẫn xanh kể cả khi ba mẫu regex trên không khớp một dòng nào — đúng kiểu
  // bài canh luôn đúng mà CLAUDE.md dặn phải nêu.
  check('bộ dò có thật sự nhìn thấy mẫu ba mức đang tồn tại',
    Object.keys(theoTep).length > 0, theoTep);

  const moi = Object.keys(theoTep).filter((t) => !NO_BA_MUC[t]);
  check('KHÔNG chỗ nào mới chép lại mẫu ba mức xếp trẻ trên dưới',
    moi.length === 0,
    moi.map((t) => `${t}: ${theoTep[t].map((v) => v.dong + ' ' + v.trich).join(' | ')}`).slice(0, 5));

  for (const [tep, { so, vi_sao }] of Object.entries(NO_BA_MUC)) {
    const thuc = (theoTep[tep] || []).length;
    check(`${tep} — nợ ≤ ${so} dòng (${vi_sao})`, thuc <= so, `đang là ${thuc}`);
    if (thuc < so) {
      console.log(`      ↓ đã giảm còn ${thuc}/${so} — hạ con số trong NO_BA_MUC xuống để siết chặt thêm.`);
    }
  }

  check('danh sách tệp nợ mẫu ba mức chỉ được NGẮN ĐI',
    TEP_NO_BA_MUC.length === 1, TEP_NO_BA_MUC);
  check('mọi tệp trong sổ nợ này đều tồn tại thật',
    TEP_NO_BA_MUC.every(t => fs.existsSync(path.join(GOC, t))),
    TEP_NO_BA_MUC.filter(t => !fs.existsSync(path.join(GOC, t))));

  // Hai bánh cóc phải TÁCH BẠCH. Trộn vào nhau là mục [2b] ("đúng bốn tệp của
  // phần tiểu học") hỏng ngay, và đó là bộ canh bất khả xâm phạm.
  check('bánh cóc cũ không bị chạm — vẫn đúng bốn tệp Nề nếp/Báo cáo',
    TEP_CON_NO.length === 4 && TEP_CON_NO.every(t => /conduct|reports/.test(t)), TEP_CON_NO);
}

// ===========================================================================
console.log('\n[3] Dữ liệu mẫu tuyệt đối sạch — đây là thứ người ta nhìn đầu tiên');
{
  // G0.5 đã dọn. Bài này giữ cho nó ở nguyên như thế.
  const seed = fs.readFileSync(path.join(GOC, 'data', 'seed.js'), 'utf8');
  check('không bản ghi nề nếp nào có điểm khác 0',
    !/points:\s*-?[1-9]/.test(seed), (seed.match(/points:\s*-?\d+/g) || []).slice(0, 5));
  check('không môn nào trong học bạ có điểm số',
    !/score:\s*[0-9]/.test(seed), (seed.match(/score:\s*[^,\n]+/g) || []).slice(0, 5));
  check('mọi bé cùng một mức hạnh kiểm — không xếp loại bé này trên bé kia',
    new Set(seed.match(/conduct: '[^']*'/g) || []).size <= 1,
    [...new Set(seed.match(/conduct: '[^']*'/g) || [])]);
}

// ===========================================================================
console.log('\n[4] Bộ canh này có thật sự bắt được không');
{
  const tam = path.join(GOC, 'test', '__tam-qt4');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = `Hoàn thành ${pct}%`;\nconst b = 'Bảng xếp hạng của nhóm';\nconst c = 'điểm thi đua';\n");
  const bat = quet(['test/__tam-qt4']);
  const ds = bat['test/__tam-qt4/ban.js'] || [];
  check('bắt được phần trăm in ra màn hình', ds.some((v) => v.dau.includes('phần trăm')), ds);
  check('bắt được bảng xếp hạng', ds.some((v) => v.dau.includes('xếp hạng')), ds);
  check('bắt được điểm thi đua', ds.some((v) => v.dau.includes('thi đua')), ds);

  // Dấu hiệu mới: điểm số viết bằng tên trường dữ liệu, không có chữ nào tố cáo.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const x = mon.score ?? mon.level;\nconst y = { diem: 8.5 };\n");
  const batNgam = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('BẮT ĐƯỢC ĐIỂM SỐ KHI NÓ KHÔNG TỰ GỌI TÊN MÌNH',
    batNgam.length >= 2 && batNgam.every(v => v.dau.includes('tên trường dữ liệu')), batNgam);

  // Và không bắt nhầm những chữ chỉ TRÔNG giống.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = 'diemDanh';\nconst b = scoreboardHidden;\nconst c = 'điểm đón bé';\n");
  const khongBat = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('KHÔNG bắt nhầm "diemDanh", "scoreboard", hay "điểm đón bé"',
    khongBat.length === 0, khongBat);

  // DẤU HIỆU XẾP LOẠI THỂ TRẠNG — thêm cùng đợt cho phép hiện con số BMI.
  //
  // Hôm thêm vào, nó không bắt được một dòng nào trong cả kho mã: nó hoàn toàn
  // là một cái chốt cho tương lai. Một dấu hiệu chưa bao giờ bắt được gì thì
  // cũng chưa ai chứng minh được nó CÓ bắt được — đúng kiểu "bài canh luôn
  // đúng" mà CLAUDE.md dặn phải nêu. Nên chứng minh bằng dòng gài.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = 'Bé thừa cân so với tháng tuổi';\n"
    + "const b = `${ten} suy dinh dưỡng thể nhẹ cân`;\n"
    + "const c = 'BMI percentile: ' + p;\n"
    + "const d = 'z-score cân nặng';\n"
    + "const e = 'Chiều cao đạt chuẩn';\n");
  const batTheTrang = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('BẮT ĐƯỢC mọi cách xếp loại thể trạng của trẻ',
    batTheTrang.length >= 5 && batTheTrang.every(v => v.dau.includes('thể trạng')), batTheTrang);

  // Và KHÔNG bắt chính con số BMI — đó là thứ nhà trường xin và được duyệt.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const v = nang / (cao / 100) ** 2;\n"
    + "const s = `BMI ${v.toFixed(1)}`;\n"
    + "return [cao, nang, 'BMI ' + chiSo].filter(Boolean).join(' · ');\n");
  const batSo = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('nhưng KHÔNG bắt chính con số BMI — con số thô không xếp trẻ trên dưới nhau',
    batSo.length === 0, batSo);

  fs.writeFileSync(path.join(tam, 'ban.js'), "const a = '<div style=\"width:100%\"></div>';\n");
  check('KHÔNG bắt nhầm width:100% của bố cục',
    Object.keys(quet(['test/__tam-qt4'])).length === 0, quet(['test/__tam-qt4']));

  // LƯỢC ĐỒ LÕI PHẢI NẰM TRONG TẦM NHÌN.
  //
  // Vùng quét trước đây chỉ có `lib/modules.js`, nên `lib/schema.sql` — nơi
  // khai từng cột của từng bảng cho cả ứng dụng — không hề được đọc, dù đầu
  // bài này tự nhận nó soi `schema.sql`. Hai phép thử dưới chứng minh cửa sau
  // ấy đã đóng: một tệp `.sql` bẩn NGOÀI `modules/` phải bị bắt.
  fs.writeFileSync(path.join(tam, 'ban.sql'),
    'CREATE TABLE IF NOT EXISTS thu (\n  id TEXT PRIMARY KEY,\n  xep_hang INTEGER,\n  diem_thi_dua REAL\n);\n');
  const batSql = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.sql'] || [];
  check('BẮT ĐƯỢC cột xếp trẻ trong một tệp .sql NGOÀI modules/',
    batSql.length >= 1, batSql);
  check('và `lib/schema.sql` thật sự nằm trong vùng quét',
    VUNG_QUET.includes('lib') && fs.existsSync(path.join(GOC, 'lib', 'schema.sql')), VUNG_QUET);

  fs.rmSync(tam, { recursive: true, force: true });
}

// ===========================================================================
console.log('\n[5] NGOẠI LỆ CHỪA ĐÚNG DÒNG, KHÔNG CHỪA CẢ TỆP');
{
  // Bản trước bỏ qua NGUYÊN TỆP khi tên tệp có trong NGOAI_LE. Lý do miễn trừ
  // chỉ đúng cho MỘT dấu hiệu (phần trăm phiếu khảo sát của người lớn), nhưng
  // cách viết miễn luôn cả năm — thêm chữ "xếp hạng" vào `surveys.js` là bộ
  // canh không hé một tiếng. Một cửa sau bỏ ngỏ ngay trong bộ canh.
  //
  // Mục này canh chính ngoại lệ đó: nó phải chừa đúng dòng đã nêu lý do, và
  // KHÔNG chừa gì thêm.
  check('mọi ngoại lệ đều nói rõ nó chừa dòng nào — không có ngoại lệ cả tệp',
    NGOAI_LE.every(n => typeof n.chiDong === 'function'),
    NGOAI_LE.map(n => `${n.tep}: ${typeof n.chiDong}`));
  check('và mọi ngoại lệ đều có lý do viết thành chữ',
    NGOAI_LE.every(n => typeof n.vi_sao === 'string' && n.vi_sao.trim().length >= 40),
    NGOAI_LE.map(n => (n.vi_sao || '').length));
  check('mọi tệp được nêu ngoại lệ đều còn tồn tại thật',
    NGOAI_LE.every(n => fs.existsSync(path.join(GOC, n.tep))),
    NGOAI_LE.filter(n => !fs.existsSync(path.join(GOC, n.tep))).map(n => n.tep));

  // Phép thử ngược cho chính ngoại lệ: một dòng vi phạm THẬT nằm trong tệp
  // được miễn trừ vẫn phải bị bắt.
  for (const n of NGOAI_LE) {
    check(`${n.tep}: dòng "Bảng xếp hạng của nhóm" KHÔNG được ngoại lệ chừa`,
      !n.chiDong("const t = 'Bảng xếp hạng của nhóm';"), n.tep);
    check(`${n.tep}: dòng "score: 8.5" KHÔNG được ngoại lệ chừa`,
      !n.chiDong('  score: 8.5,'), n.tep);
  }

  // Và chiều còn lại: đúng dòng đã nêu lý do thì phải được chừa thật, nếu không
  // ngoại lệ chỉ là chữ chết và bộ canh sẽ đỏ oan.
  const ls = NGOAI_LE.find(n => n.tep === 'public/js/views/surveys.js');
  check('surveys.js: dòng in tỉ lệ phiếu của người lớn thì ĐƯỢC chừa',
    !!ls && ls.chiDong('return `${Math.round(pct)}%`;'), !!ls);

  // NGOẠI LỆ CHỪA KHỎI ĐÚNG DẤU HIỆU ĐÃ NÊU LÝ DO, KHÔNG CHỪA CẢ DÒNG.
  //
  // Trước đợt này bộ quét viết `if (nl.some(n => n.chiDong(dong))) return;` —
  // một dòng khớp ngoại lệ được chừa khỏi CẢ NĂM dấu hiệu. Ngoại lệ của
  // surveys.js khớp mọi dòng có `}%`, nên một dòng vừa in tỉ lệ phiếu vừa mang
  // chữ "xếp hạng" hay `score` sẽ lọt sạch — trong khi lý do viết ra chỉ xin
  // chừa phần trăm. Một bộ canh như vậy sẽ xanh đúng vào ngày nó cần đỏ, và
  // CLAUDE.md xếp nhóm bài canh 5 QUY TẮC vào loại bất khả xâm phạm.
  //
  // Ba phép kiểm dưới đây SIẾT bộ canh, không nới nó.
  check('mọi ngoại lệ đều khai rõ nó chừa khỏi DẤU HIỆU NÀO',
    NGOAI_LE.every(n => Array.isArray(n.chiDauHieu) && n.chiDauHieu.length > 0),
    NGOAI_LE.map(n => [n.tep, n.chiDauHieu]));
  const tenDauHieu = new Set(DAU_HIEU.map(d => d.ten));
  check('và mọi tên dấu hiệu được nêu đều là dấu hiệu CÓ THẬT',
    NGOAI_LE.every(n => (n.chiDauHieu || []).every(t => tenDauHieu.has(t))),
    NGOAI_LE.flatMap(n => (n.chiDauHieu || []).filter(t => !tenDauHieu.has(t))));

  // PHÉP THỬ NGƯỢC CỦA CHÍNH CƠ CHẾ CHỪA: một dòng KHỚP ngoại lệ nhưng mang
  // thêm một dấu hiệu KHÁC thì vẫn phải bị bắt. Dòng dưới đây khớp `chiDong`
  // của surveys.js (có `}%`) mà cũng mang chữ "xếp hạng" — bản cũ cho lọt sạch.
  {
    const dongGai = 'return `Bảng xếp hạng: ${Math.round(pct)}%`;';
    const nlThu = NGOAI_LE.filter(n => n.tep === 'public/js/views/surveys.js');
    const conLai = DAU_HIEU.filter(d => d.re.test(dongGai))
      .filter(d => !nlThu.some(n => n.chiDong(dongGai) && (n.chiDauHieu || []).includes(d.ten)));
    check('dựng được dòng gài: nó khớp ngoại lệ VÀ mang hai dấu hiệu',
      nlThu.some(n => n.chiDong(dongGai)) && DAU_HIEU.filter(d => d.re.test(dongGai)).length >= 2,
      DAU_HIEU.filter(d => d.re.test(dongGai)).map(d => d.ten));
    check('DÒNG KHỚP NGOẠI LỆ VẪN BỊ BẮT vì dấu hiệu KHÔNG nằm trong lý do chừa',
      conLai.some(d => d.ten === 'xếp hạng trẻ'), conLai.map(d => d.ten));
    check('và đúng dấu hiệu ĐÃ nêu lý do thì vẫn được chừa thật',
      !conLai.some(d => d.ten === 'phần trăm hiện ra màn hình'), conLai.map(d => d.ten));
  }
  const sd = NGOAI_LE.find(n => n.tep === 'data/seed.js');
  check('seed.js: dòng đặt điểm về giá trị trung tính thì ĐƯỢC chừa',
    !!sd && sd.chiDong('          score: null,   // QUY TẮC 4 — không chấm điểm trẻ'), !!sd);
}

tongKet();
