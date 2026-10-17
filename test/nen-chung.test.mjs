// Bài canh BẢNG "NỀN CHUNG" của docs/LOI-NEN-CHUNG.md.
//
// Chạy bằng:  npm run test:nen-chung
//
// VÌ SAO CÓ BÀI NÀY
//
// App 1 và app 2 tách đôi tại `bc9dfa3`. Mọi tệp có mặt tại điểm tách nghĩa là
// app 1 đang chạy một bản của chính nó — nên một lỗ hổng vá ở app 2 rất có thể
// là lỗ hổng đang mở ở app 1, nơi có ~300 gia đình thật.
//
// `docs/LOI-NEN-CHUNG.md` là chỗ ghi danh sách đó, và người sang kho app 1 sau
// này sẽ đọc đúng bảng ấy để biết phải đối chiếu những tệp nào.
//
// HAI THỨ TỪNG SAI Ở ĐÓ, VÀ CẢ HAI ĐỀU SAI VỀ PHÍA BỎ SÓT
//
//   1. Mẹo nhận diện ghi ngược: *"commit gần nhất nằm trước điểm tách thì tệp
//      đó vẫn còn là nền chung"* — tức hễ app 2 đụng vào một tệp thì tệp ấy
//      thôi là nền chung. Ai tin mẹo đó sẽ bỏ qua ĐÚNG NHỮNG TỆP VỪA SỬA, tức
//      đúng những tệp có bản vá cần mang sang.
//   2. Bảng chỉ liệt kê 13 tệp trong khi có 28. Mười bốn tệp bị bỏ sót, trong
//      đó có `server.js`, `lib/password.js` và `lib/importer.js`.
//
// Bài này suy danh sách THẲNG TỪ GIT chứ không tin bảng, rồi đòi bảng phải
// nhắc tới từng tệp một.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIEM_TACH = 'bc9dfa3';
const TAI_LIEU = path.join(GOC, 'docs', 'LOI-NEN-CHUNG.md');
// Đọc tài liệu với xuống dòng đã quy về '\n'. Máy Windows tải mã về có thể
// mang CRLF, và khi đó mục [2] tìm '\n\n' không thấy: bảng bị cắt tới tận cuối
// tệp, nuốt cả Sổ nợ, nên gỡ một tệp khỏi bảng mà bài VẪN XANH — lỏng đi mà
// không ai hay. Quy về '\n' ở một chỗ thì mọi mục đọc giống hệt trên mọi máy.
const docTaiLieu = () => fs.readFileSync(TAI_LIEU, 'utf8').replace(/\r\n/g, '\n');

const git = (...a) => execFileSync('git', a, { cwd: GOC, encoding: 'utf8' });

// Vùng "nền": mã chạy mà cả hai app cùng dựa vào. CỐ Ý không gồm `routes/`,
// `public/js/views/`, `modules/`, `data/`, `docs/`, `test/` — bảng đã xếp cả
// bốn nhóm đầu vào ô "Không", và hai nhóm sau không phải mã chạy.
const LA_NEN = [
  /^server\.js$/,
  /^lib\/[^/]+\.(js|sql)$/,
  /^scripts\/[^/]+\.js$/,
  /^public\/(sw\.js|manifest\.json)$/,
  /^public\/css\/[^/]+\.css$/,
  /^public\/js\/[^/]+\.js$/,     // ui.js, app.js, api.js — KHÔNG gồm views/
];

// ===========================================================================
console.log('\n[1] Đọc được điểm tách và danh sách tệp nền từ chính git');
let nenTaiDiemTach = [];
{
  let coDiemTach = false;
  try { git('cat-file', '-e', `${DIEM_TACH}^{commit}`); coDiemTach = true; } catch (_) { coDiemTach = false; }
  check(`điểm tách ${DIEM_TACH} có thật trong lịch sử`, coDiemTach);
  // KHO CLONE NÔNG thì dừng ở đây với một câu nói rõ, thay vì để `git ls-tree`
  // ném lỗi và cả bộ đổ ra một chồng stack trace không ai đọc. Đã xảy ra thật
  // trên GitHub Actions (02/09): job npm test dùng actions/checkout mặc định
  // (depth 1), mọi bài trước xanh, tới đây sập — và người đọc log không biết
  // đó là cấu hình CI chứ không phải mã.
  if (!coDiemTach) {
    console.log(`\n  Kho mã không có commit ${DIEM_TACH} — thường là do clone NÔNG (git clone --depth,`
      + ' hoặc actions/checkout không đặt fetch-depth: 0).\n'
      + '  Sửa: `git fetch --unshallow` trên máy, hoặc thêm `with: { fetch-depth: 0 }` cho bước checkout của CI.');
    tongKet('Nền chung — cần đủ lịch sử git để đối chiếu');
  }

  const taiDiemTach = git('ls-tree', '-r', '--name-only', DIEM_TACH)
    .split('\n').map(s => s.trim()).filter(Boolean);
  check('đọc được cây tệp tại điểm tách', taiDiemTach.length > 50, taiDiemTach.length);

  nenTaiDiemTach = taiDiemTach
    .filter(f => LA_NEN.some(re => re.test(f)))
    // Tệp đã bị xoá khỏi app 2 thì không còn gì để đối chiếu ở phía này.
    .filter(f => fs.existsSync(path.join(GOC, f)))
    .sort();
  check('lọc ra được danh sách tệp nền còn sống', nenTaiDiemTach.length >= 20,
    nenTaiDiemTach.length);
}

// ===========================================================================
console.log('\n[2] BẢNG PHẢI NHẮC TỚI TỪNG TỆP NỀN — không được bỏ sót cái nào');
{
  const vb = docTaiLieu();

  // CHỈ ĐỌC PHẦN BẢNG, KHÔNG ĐỌC CẢ TỆP.
  //
  // Bản đầu của mục này tìm tên tệp trong toàn văn, và phép thử ngược cho thấy
  // nó vô dụng: gỡ `server.js` khỏi bảng thì bài vẫn xanh, vì cái tên đó còn
  // xuất hiện trong một câu văn xuôi ở chỗ khác. Nhắc tên trong một câu chuyện
  // không phải là XẾP LOẠI nó.
  const dauBang = vb.indexOf('| Nhóm | Tệp | Có coi là nền chung không |');
  // Không thấy dòng trống cuối bảng thì coi như KHÔNG cắt được, chứ không cắt
  // tới cuối tệp — cắt tới cuối tệp là đọc cả văn xuôi, đúng cái lỗ ở trên.
  const cuoiBang = dauBang < 0 ? -1 : vb.indexOf('\n\n', dauBang);
  const bang = cuoiBang < 0 ? '' : vb.slice(dauBang, cuoiBang);
  check('cắt ra được đúng phần bảng phân loại',
    bang.split('\n').length > 10 && !bang.includes('## Sổ nợ'),
    bang.split('\n').length);

  const thieu = nenTaiDiemTach.filter(f => !bang.includes(`\`${f}\``));
  check('KHÔNG TỆP NỀN NÀO NẰM NGOÀI BẢNG',
    thieu.length === 0,
    thieu.length
      ? `${thieu.join(', ')}\n\n  Thêm vào bảng ở docs/LOI-NEN-CHUNG.md, mục `
        + '"Phần nào là nền chung". Tệp không có tên trong bảng là tệp người sang '
        + 'kho app 1 sẽ không nghĩ tới — và lỗ hổng nằm đúng ở đó thì không ai vá.'
      : `${nenTaiDiemTach.length} tệp, đủ cả`);

  // Đếm để chắc chắn mục này không chạy trong khoảng không.
  check('có thật danh sách để đối chiếu, không phải bài luôn xanh',
    nenTaiDiemTach.length >= 20 && bang.length > 500,
    { soTep: nenTaiDiemTach.length, coBang: bang.length });
}

// ===========================================================================
console.log('\n[3] MẸO NHẬN DIỆN PHẢI ĐÚNG CHIỀU');
{
  const vb = docTaiLieu();
  check('tài liệu dạy hỏi "CÓ MẶT TẠI điểm tách"',
    /cat-file -e bc9dfa3:/.test(vb) && /có mặt TẠI điểm tách/i.test(vb));
  check('và KHÔNG còn dạy mẹo cũ theo "commit gần nhất"',
    !/nếu commit gần nhất nằm trước điểm tách.{0,40}vẫn còn là nền chung/s.test(vb),
    'mẹo cũ sai ngược — xem đầu tệp bài test này');

  // PHÉP THỬ NGƯỢC trên chính mẹo mới: `lib/db.js` bị sửa rất nhiều lần sau
  // điểm tách, mà vẫn phải là nền chung. Mẹo cũ trả lời sai chỗ này.
  const soLanSua = git('log', '--oneline', `${DIEM_TACH}..HEAD`, '--', 'lib/db.js')
    .split('\n').filter(Boolean).length;
  check('lib/db.js ĐÃ bị sửa nhiều lần sau điểm tách', soLanSua >= 3, soLanSua);
  check('nhưng vẫn có mặt tại điểm tách, tức vẫn là nền chung',
    nenTaiDiemTach.includes('lib/db.js'));
  check('và bảng vẫn xếp nó là nền chung', /`lib\/db\.js`/.test(vb));
}

// ===========================================================================
console.log('\n[4] SỔ NỢ PHẢI NÓI VỀ NHỮNG TỆP CÓ THẬT');
{
  const vb = docTaiLieu();
  const soNo = vb.slice(vb.indexOf('## Sổ nợ'));
  check('tìm thấy mục Sổ nợ', soNo.length > 500, soNo.length);

  // Mọi đường dẫn tệp nhắc trong sổ nợ phải là tệp có thật — sổ ghi sai tên là
  // người sang kho kia đi tìm một tệp không tồn tại rồi kết luận "không dính".
  const duong = [...new Set([...soNo.matchAll(/`((?:lib|scripts|routes|modules|public|test|data)\/[\w./-]+)`/g)]
    .map(m => m[1]))];
  check('sổ nợ có nhắc tên tệp cụ thể', duong.length >= 3, duong.length);
  const khongCo = duong.filter(f => !fs.existsSync(path.join(GOC, f)));
  check('MỌI TỆP NHẮC TRONG SỔ NỢ ĐỀU CÓ THẬT', khongCo.length === 0, khongCo);
}

// ===========================================================================
console.log('\n[5] CON SỐ "CÒN NỢ" PHẢI KHỚP VỚI CHÍNH BẢNG NGAY TRÊN NÓ');
{
  // VÌ SAO CÓ MỤC NÀY. Con số này đã trượt BA lần: "mười" → "mười sáu" (sửa
  // 10/09) → thực đếm ra "mười tám" (16/09). Lần nào cũng đúng lúc viết và sai
  // ngay khi bảng dài thêm một dòng. Bản 10/09 đã ghi rõ cách đếm ra giấy —
  // vẫn trượt tiếp, vì cách đếm ghi ra giấy chỉ có ích khi có người chạy lại
  // nó. Nên từ 16/09 máy đếm.
  //
  // Sổ nợ sai về phía TỰ TRẤN AN là kiểu sai nguy hiểm nhất của tệp này: người
  // sang kho app 1 đọc "còn 16 món" rồi đối chiếu 16 món và tin là xong.
  const vb = docTaiLieu();
  const soNo = vb.slice(vb.indexOf('## Sổ nợ'));

  // Cột "Còn nợ" là cột áp chót của bảng Sổ nợ. Chỉ lấy dòng bảng thật: bắt
  // đầu bằng "| " và ô đầu là một ngày DD/MM. Mấy bảng nhỏ trong ô trích dẫn
  // đứng sau dấu "> " nên không lọt vào.
  const cotConNo = soNo.split('\n')
    .filter(d => /^\|\s*\d{2}\/\d{2}\s*\|/.test(d))
    .map(d => {
      // Bỏ ô rỗng hai đầu do dấu | mở và đóng dòng, còn lại đúng năm cột:
      // Ngày | Lỗi | Đã vá | Còn nợ | Ghi chú. "Còn nợ" là cột áp chót.
      const o = d.split('|').slice(1, -1);
      return (o[o.length - 2] || '').trim();
    });

  check('đọc được các dòng của bảng Sổ nợ', cotConNo.length >= 15, cotConNo.length);

  const conNo = cotConNo.filter(o => o === '**app 1**').length;
  const m = soNo.match(/\*\*Còn nợ (\d+) món\*\*/);
  check('sổ có ghi con số còn nợ ở dạng máy đọc được', !!m, m && m[1]);
  check('CON SỐ TRONG SỔ KHỚP VỚI SỐ DÒNG ĐẾM ĐƯỢC',
    m && Number(m[1]) === conNo,
    { soTrongSo: m && Number(m[1]), demDuoc: conNo });

  // PHÉP THỬ NGƯỢC 1 — phép đếm phải là SO KHỚP ĐÚNG, không phải "có chứa".
  // Dòng cố ý KHÔNG chép sang app 1 cũng chứa chuỗi "app 1"; đếm kiểu lỏng là
  // tính nhầm nó thành một món nợ.
  const demLong = cotConNo.filter(o => o.includes('app 1')).length;
  check('có ít nhất một dòng "app 1" KHÔNG phải món nợ (dòng cố ý khác nhau)',
    demLong > conNo, { demLong, conNo });

  // PHÉP THỬ NGƯỢC 2 — bảng phải thật sự có dòng để đếm, không phải đang so
  // hai số 0 với nhau.
  check('và phép đếm không rỗng', conNo > 0, conNo);

  // Cái bẫy đã làm sổ ghi sai suốt 30/08–16/09: gạch một món chỉ vì tra ra mã
  // commit. Mã commit vẫn `git show` ra được kể cả khi nhánh chứa nó đã biến
  // mất khỏi mọi kho. Luật thay thế phải còn nằm trong tài liệu.
  check('tài liệu dạy kiểm bằng NỘI DUNG TỆP ở kho app 1, không bằng mã commit',
    /không[\s>]*kiểm bằng mã commit/.test(vb),   // câu này xuống dòng giữa chừng
    'xem mục "viết xong bản vá KHÔNG phải là trả nợ"');
}

tongKet();
