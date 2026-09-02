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
  const vb = fs.readFileSync(TAI_LIEU, 'utf8');

  // CHỈ ĐỌC PHẦN BẢNG, KHÔNG ĐỌC CẢ TỆP.
  //
  // Bản đầu của mục này tìm tên tệp trong toàn văn, và phép thử ngược cho thấy
  // nó vô dụng: gỡ `server.js` khỏi bảng thì bài vẫn xanh, vì cái tên đó còn
  // xuất hiện trong một câu văn xuôi ở chỗ khác. Nhắc tên trong một câu chuyện
  // không phải là XẾP LOẠI nó.
  const dauBang = vb.indexOf('| Nhóm | Tệp | Có coi là nền chung không |');
  const bang = dauBang < 0 ? '' : vb.slice(dauBang, vb.indexOf('\n\n', dauBang));
  check('cắt ra được đúng phần bảng phân loại', bang.split('\n').length > 10,
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
  const vb = fs.readFileSync(TAI_LIEU, 'utf8');
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
  const vb = fs.readFileSync(TAI_LIEU, 'utf8');
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

tongKet();
