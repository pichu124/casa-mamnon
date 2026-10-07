// Bài canh MỘT ĐỊNH NGHĨA DUY NHẤT CHO CHỮ "HÔM NAY".
//
// Chạy bằng:  npm run test:mot-hom-nay
//
// VÌ SAO CẦN CANH BẰNG MÁY
//
// Lỗi này không nhìn thấy được. Cả hai cách viết đều chạy, đều trả về một chuỗi
// YYYY-MM-DD trông giống hệt nhau, và trong 17 tiếng mỗi ngày chúng cho cùng
// một kết quả. Chỉ từ 0 giờ tới 7 giờ sáng giờ Việt Nam chúng mới nói hai ngày
// khác nhau — mà 7 giờ sáng là lúc cô điểm danh và chốt báo ăn.
//
// Hậu quả không phải hiển thị lệch. `tienan_chot` có UNIQUE (ngay, classId):
// một lần chốt lúc 6 giờ 50 rơi vào ngày hôm trước và ĐÈ LÊN con số hôm trước.
// Mất dữ liệu, âm thầm, mỗi sáng, và cuối tháng bảng tiền ăn không khớp mà
// không ai biết vì sao.
//
// Nên bộ canh này quét THẲNG MÃ NGUỒN, giống cách bộ canh 5 QUY TẮC làm. Bài
// kiểm thử theo tình huống chỉ bắt được thứ ta nghĩ ra để thử; bài quét mã bắt
// được cả dòng ai đó viết ngày mai.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Vùng quét: mã chạy trên MÁY CHỦ. Cố ý KHÔNG quét public/ — trình duyệt chạy
// trên điện thoại của cô, đang ở Việt Nam, nên giờ máy ở đó chính là giờ Việt
// Nam. Ép public/ đi qua lib/ngay là ép nó nạp thêm mã máy chủ mà không được gì.
// `data/seed.js` cũng nằm trong vùng quét. Bỏ sót nó là bỏ sót đúng chỗ đã sập:
// dữ liệu mẫu tính ngày bằng giờ máy trong khi máy chủ hỏi giờ Việt Nam, nên
// "đơn xin nghỉ cho NGÀY MAI" rơi vào hôm nay của máy chủ — và người mở app lần
// đầu vào buổi tối sẽ thấy dữ liệu lệch một ngày so với mọi màn hình.
// SIẾT CHẶT 31/08: QUÉT CẢ `test/`.
//
// Bản trước bỏ sót thư mục bài test, mà `test/_chung.mjs` viết hẳn ra rằng bài
// test tự tính ngày bằng `new Date().toISOString()` sẽ "đỏ vào buổi tối, xanh
// vào buổi sáng — kiểu đỏ ngẫu nhiên tệ nhất". Đợt Đ92 đã phải đi vá bốn bài
// đúng loại đó, và bộ canh này lẽ ra phải là thứ chặn chúng ngay từ đầu.
const VUNG_QUET = ['routes', 'modules', 'lib', 'scripts', 'data', 'test'];

// `modules/<mã>/view.js` là mã CHẠY TRÊN TRÌNH DUYỆT, y hệt public/js/views —
// chỉ khác chỗ đứng trong cây thư mục. Nó không nạp được `lib/ngay`, nên vùng
// quét MÁY CHỦ bỏ qua nó theo QUY TẮC chứ không theo tên từng tệp.
//
// NHƯNG BỎ QUA Ở ĐÂY KHÔNG CÒN NGHĨA LÀ ĐƯỢC TỰ DO (Đ127). Lý do cũ ghi ở dòng
// này — "điện thoại của cô đang ở Việt Nam nên giờ máy ở đó chính là giờ cần
// dùng" — là một giả định, và nó sai thường xuyên hơn ta tưởng: máy xách tay
// còn để múi giờ nước ngoài, máy văn phòng cài lại hệ điều hành xong quên đổi,
// máy tính bảng dùng chung ở lớp đặt sai từ đầu. Từ Đ127, sổ điểm danh chỉ ghi
// được trong chính ngày hôm đó, nên một chiếc máy lệch múi giờ là cô bị máy
// chủ từ chối trong khi màn hình rõ ràng đang là hôm nay.
//
// Nên trình duyệt có định nghĩa riêng của nó — `UI.todayStr()` / `UI.gioVN()`
// trong `public/js/ui.js`, cộng đúng 7 tiếng vào đồng hồ tuyệt đối — và mục
// [4] bên dưới canh cho không màn nào quay về hỏi giờ máy.
const LA_MAN_HINH = (t) => /^modules\/[^/]+\/view\.js$/.test(t);

// Tệp được miễn, kèm lý do. Danh sách này là chỗ để giải trình, không phải chỗ
// để giấu một dòng mới cho khỏi phiền.
const MIEN = {
  'lib/ngay.js': 'chính là nơi định nghĩa "hôm nay" — nó phải được viết bằng tay',
};

function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  const ra = [];
  for (const ten of fs.readdirSync(p)) {
    const con = path.join(p, ten);
    const st = fs.statSync(con);
    if (st.isDirectory()) ra.push(...cacTep(path.join(muc, ten)));
    // .mjs CŨNG PHẢI ĐƯỢC QUÉT. Bài test của kho mã này là `.mjs`, nên thêm
    // `test` vào vùng quét mà vẫn chỉ khớp `.js` là quét đúng 0 tệp — bộ canh
    // xanh vì không nhìn gì cả, đúng loại bài canh rỗng mà `test:bai-canh-that`
    // sinh ra để bắt.
    else if (/\.(js|mjs)$/.test(ten)) ra.push(path.join(muc, ten));
  }
  return ra;
}

// Bỏ chú thích trước khi soi, để một dòng GIẢI THÍCH về cách viết cũ không bị
// tính là vi phạm. Đây đúng là cái bẫy đã sập hai lần khi viết bộ canh QUY TẮC
// 4 — mà ở đó lời giải là viết lại chú thích, vì một ngoại lệ cho chú thích là
// một lỗ hổng thật.
function boChuThich(ma) {
  return ma.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

// Ba cách hỏi "bây giờ là ngày nào" mà app KHÔNG được dùng nữa.
const DAU_HIEU = [
  {
    ten: 'ngày theo giờ UTC',
    re: /new Date\(\)\s*\.toISOString\(\)\s*\.slice\(\s*0\s*,\s*(?:10|7)\s*\)/,
    vi_sao: 'Lệch 7 tiếng với giờ Việt Nam suốt buổi sáng. Dùng ngay.homNay().',
  },
  {
    ten: 'ngày theo giờ máy chủ',
    re: /new Date\(\)\s*\.getFullYear\(\)|\bd\.getFullYear\(\)/,
    vi_sao: 'Đổi âm thầm khi app dọn nhà sang máy chủ múi giờ khác. Dùng ngay.homNay().',
  },
  {
    ten: 'giờ phút theo giờ máy chủ',
    re: /\bd\.getHours\(\)/,
    vi_sao: 'Cùng lý do trên. Dùng ngay.bayGio().',
  },
  // ĐỊNH NGHĨA THỨ BA, GIẤU TRONG CÂU SQL.
  //
  // `substr(taoLuc, 1, 10) = ?` cắt ngày ra khỏi một mốc ISO — tức là ngày theo
  // giờ UTC — rồi đem so với một ngày theo giờ Việt Nam. Nó gọn, nó chạy, và ba
  // dấu hiệu trên KHÔNG bắt được vì nó nằm trong chuỗi SQL chứ không phải một
  // lời gọi JavaScript. Sáng sớm thì bản ghi vừa tạo rơi vào ngày hôm trước.
  //
  // Cách đúng: `ngay.khoangUtcCuaNgay(ngay)` rồi lọc theo khoảng.
  {
    ten: 'cắt ngày ra khỏi mốc thời gian trong SQL',
    re: /substr\s*\(\s*\w*(taoLuc|createdAt|nhanLuc|capNhatLuc|luc)\w*\s*,\s*1\s*,\s*(10|7)\s*\)\s*(=|>=|<=|<|>|IN)/i,
    vi_sao: 'So ngày UTC với ngày Việt Nam. Dùng ngay.khoangUtcCuaNgay() rồi lọc theo khoảng.',
  },
];

const tatCaTep = VUNG_QUET.flatMap(cacTep);

// ---------------------------------------------------------------------------
// VÙNG QUÉT THỨ HAI: MÃ CHẠY TRÊN TRÌNH DUYỆT (Đ127)
// ---------------------------------------------------------------------------
const VUNG_TRINH_DUYET = ['public/js', 'modules'];
// Chỉ mã màn hình; `modules/<mã>/routes.js` đã thuộc vùng máy chủ ở trên.
const LA_MA_TRINH_DUYET = (t) => t.startsWith('public/js/') || /^modules\/[^/]+\/view\.js$/.test(t);
const MIEN_TRINH_DUYET = {
  'public/js/ui.js': 'chính là nơi định nghĩa "hôm nay" và "mấy giờ" của trình duyệt',
};
// Đọc NGÀY hay GIỜ ra khỏi đồng hồ máy. `new Date(x)` có tham số thì không
// tính: đó là đọc một mốc đã biết, không phải hỏi "bây giờ là mấy giờ".
const DAU_HIEU_TRINH_DUYET = [
  {
    ten: 'đọc ngày giờ từ múi giờ của máy',
    re: /new Date\(\s*\)\s*\.(getFullYear|getMonth|getDate|getDay|getHours|getMinutes|toDateString|toTimeString|toLocaleDateString|toLocaleTimeString)\b/,
    vi_sao: 'Máy đặt sai múi giờ là lệch ngày. Dùng UI.todayStr() / UI.gioVN() / UI.thuVN().',
  },
  {
    ten: 'giữ "bây giờ" của máy vào một biến rồi đọc dần',
    re: /=\s*new Date\(\s*\)\s*;/,
    vi_sao: 'Cùng lý do trên, chỉ khác chỗ xuống dòng. Dùng UI.parseDate(UI.todayStr()).',
  },
];
const tepTrinhDuyet = VUNG_TRINH_DUYET.flatMap(cacTep).filter(LA_MA_TRINH_DUYET);

// ===========================================================================
console.log('\n[1] Bộ canh có thật sự nhìn tới nơi cần nhìn');
{
  check('quét cả sáu vùng — kể cả thư mục bài test', VUNG_QUET.length === 6, VUNG_QUET);
  check('tìm được kha khá tệp để soi', tatCaTep.length >= 40, tatCaTep.length);
  check('có nhìn vào thư mục con của phân hệ',
    tatCaTep.some(t => /^modules\/[^/]+\/routes\.js$/.test(t)),
    tatCaTep.filter(t => t.startsWith('modules/')).slice(0, 4));
  check('có nhìn vào routes lõi', tatCaTep.includes('routes/attendance.js'));
  check('có nhìn vào dữ liệu mẫu', tatCaTep.includes('data/seed.js'));
  // ĐỐI CHỨNG CHO CHÍNH VÙNG VỪA THÊM: `test` nằm trong VUNG_QUET mà không tệp
  // `.mjs` nào lọt vào danh sách thì cả vùng đó là hư danh.
  check('có nhìn vào bài test (.mjs), không chỉ .js',
    tatCaTep.filter(t => t.startsWith('test/') && t.endsWith('.mjs')).length >= 20,
    tatCaTep.filter(t => t.startsWith('test/')).length);
  check('danh sách miễn vẫn đúng 1 mục — thêm mục mới phải có lý do',
    Object.keys(MIEN).length === 1, Object.keys(MIEN));
  check('vùng trình duyệt cũng tìm được kha khá tệp để soi', tepTrinhDuyet.length >= 20, tepTrinhDuyet.length);
  check('vùng trình duyệt có nhìn vào màn hình của phân hệ cắm thêm',
    tepTrinhDuyet.some(t => /^modules\/[^/]+\/view\.js$/.test(t)));
  check('vùng trình duyệt KHÔNG ôm nhầm routes.js của phân hệ (đã thuộc vùng máy chủ)',
    !tepTrinhDuyet.some(t => /routes\.js$/.test(t)));
  check('tệp được miễn còn tồn tại thật',
    Object.keys(MIEN).every(t => fs.existsSync(path.join(GOC, t))));
  // Quy tắc bỏ qua màn hình phân hệ phải khớp đúng thứ nó định khớp — không
  // rộng hơn. Bỏ qua nhầm cả routes.js là bộ canh này thành tờ giấy.
  check('quy tắc bỏ qua chỉ chạm màn hình, không chạm máy chủ',
    LA_MAN_HINH('modules/hocphi/view.js') && !LA_MAN_HINH('modules/hocphi/routes.js'));
}

// ===========================================================================
console.log('\n[2] KHÔNG CHỖ NÀO CÒN TỰ HỎI "HÔM NAY" THEO CÁCH CŨ');
{
  const viPham = [];
  for (const t of tatCaTep) {
    if (MIEN[t] || LA_MAN_HINH(t)) continue;
    const ma = boChuThich(fs.readFileSync(path.join(GOC, t), 'utf8'));
    for (const d of DAU_HIEU) {
      if (d.re.test(ma)) viPham.push(`${t} — ${d.ten}: ${d.vi_sao}`);
    }
  }
  check('KHÔNG TỆP NÀO CÒN HỎI NGÀY THEO CÁCH CŨ', viPham.length === 0, viPham);
}

// ===========================================================================
console.log('\n[3] Nơi cần dùng thì có dùng thật');
{
  // Bốn phân hệ ghi bản ghi THEO NGÀY — đây là nhóm mà lệch ngày thành mất dữ
  // liệu, không chỉ là hiển thị sai.
  for (const t of ['modules/tienan/routes.js', 'modules/nhatky/routes.js',
    'modules/dontra/routes.js', 'modules/hanhtrinh/routes.js']) {
    const ma = fs.readFileSync(path.join(GOC, t), 'utf8');
    check(`${t} hỏi ngày qua lib/ngay`, /require\('\.\.\/\.\.\/lib\/ngay'\)/.test(ma));
  }
  for (const t of ['routes/attendance.js', 'routes/dashboard.js', 'routes/albums.js',
    'routes/health.js', 'routes/schoolyear.js']) {
    const ma = fs.readFileSync(path.join(GOC, t), 'utf8');
    check(`${t} hỏi ngày qua lib/ngay`, /require\('\.\.\/lib\/ngay'\)/.test(ma));
  }
}

// ===========================================================================
console.log('\n[4] Hàm tính ngày trả đúng số');
{
  const ngay = (await import(`file://${path.join(GOC, 'lib/ngay.js')}`)).default
    || (await import(`file://${path.join(GOC, 'lib/ngay.js')}`));

  check('Việt Nam là UTC+7', ngay.LECH_PHUT === 420, ngay.LECH_PHUT);

  // Mốc CỐ ĐỊNH, không phụ thuộc lúc chạy bài test. Đây đúng là khoảnh khắc
  // nguy hiểm: 6 giờ 50 sáng giờ Việt Nam ngày 12/09, tức 23:50 UTC ngày 11/09.
  const sangSom = Date.parse('2026-09-11T23:50:00Z');
  check('6h50 sáng ở Việt Nam là ngày 12, không phải ngày 11',
    ngay.ngayCua(sangSom) === '2026-09-12', ngay.ngayCua(sangSom));
  check('và cách viết cũ thì nói ngày 11 — đúng chỗ lệch',
    new Date(sangSom).toISOString().slice(0, 10) === '2026-09-11');
  check('giờ phút cũng theo giờ Việt Nam', ngay.gioCua(sangSom) === '06:50', ngay.gioCua(sangSom));

  // Nửa đêm là ranh giới, phải rơi đúng bên.
  const nuaDem = Date.parse('2026-09-11T17:00:00Z');       // 00:00 ngày 12 ở VN
  check('đúng nửa đêm giờ Việt Nam đã sang ngày mới',
    ngay.ngayCua(nuaDem) === '2026-09-12', ngay.ngayCua(nuaDem));
  check('trước nửa đêm một phút thì vẫn là hôm trước',
    ngay.ngayCua(nuaDem - 60000) === '2026-09-11', ngay.ngayCua(nuaDem - 60000));

  // Ngày cuối tháng và cuối năm — chỗ phép cộng dễ sai nhất.
  check('cuối tháng sang đầu tháng đúng',
    ngay.ngayCua(Date.parse('2026-08-31T17:00:00Z')) === '2026-09-01');
  check('giao thừa dương lịch đúng',
    ngay.ngayCua(Date.parse('2026-12-31T17:00:00Z')) === '2027-01-01');

  check('tháng lấy từ chính ngày, không tính lại',
    ngay.thangNay() === ngay.homNay().slice(0, 7), [ngay.thangNay(), ngay.homNay()]);
  check('hôm nay đúng dạng YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(ngay.homNay()), ngay.homNay());
  check('mốc không đọc được thì trả chuỗi rỗng chứ không trả NaN',
    ngay.ngayCua('không phải số') === '', ngay.ngayCua('không phải số'));

  // Khoảng UTC của một ngày Việt Nam — dùng để lọc bản ghi lưu mốc thời gian.
  const [tu, den] = ngay.khoangUtcCuaNgay('2026-09-12');
  check('ngày 12 ở Việt Nam bắt đầu từ 17 giờ UTC ngày 11',
    tu === '2026-09-11T17:00:00.000Z', tu);
  check('và kết thúc lúc 17 giờ UTC ngày 12', den === '2026-09-12T17:00:00.000Z', den);
  check('khoảng dài đúng một ngày', Date.parse(den) - Date.parse(tu) === 86400000);
  // Mốc 6h50 sáng ngày 12 giờ Việt Nam phải nằm TRONG khoảng của ngày 12.
  const sang = '2026-09-11T23:50:00.000Z';
  check('bản ghi lúc 6h50 sáng nằm trong ngày 12, không phải ngày 11',
    sang >= tu && sang < den, { sang, tu, den });
  check('ngày không đọc được thì trả khoảng rỗng',
    ngay.khoangUtcCuaNgay('bậy bạ')[0] === '', ngay.khoangUtcCuaNgay('bậy bạ'));
}

// ===========================================================================
console.log('\n[4] MÀN HÌNH KHÔNG ĐƯỢC HỎI GIỜ CỦA MÁY (Đ127)');
{
  const pham = [];
  for (const tep of tepTrinhDuyet) {
    if (MIEN_TRINH_DUYET[tep]) continue;
    const ma = boChuThich(fs.readFileSync(path.join(GOC, tep), 'utf8'));
    for (const dh of DAU_HIEU_TRINH_DUYET) {
      const m = ma.match(dh.re);
      if (m) pham.push(`${tep}: ${dh.ten} — ${m[0].slice(0, 40)} → ${dh.vi_sao}`);
    }
  }
  check('không màn nào đọc ngày giờ từ múi giờ của máy', pham.length === 0, pham.slice(0, 6));

  // ĐỐI CHỨNG: bộ canh này phải bắt được cách viết cũ, nếu không nó là tờ giấy.
  // Đối chứng CỐ Ý đặt tên biến khác `d`: vùng quét MÁY CHỦ ở trên soi cả thư
  // mục test và bắt mẫu `d.getFullYear()`, nên một ví dụ dùng tên `d` sẽ làm
  // chính bộ canh này báo đỏ về chính nó.
  const cachCu = ['const bayGioMay = new Date();', 'return bayGioMay.getMonth();'];
  const cachCu2 = 'const h = new Date().getHours();';
  check('đối chứng — bắt được cách giữ "bây giờ" của máy vào biến',
    DAU_HIEU_TRINH_DUYET.some(dh => dh.re.test(cachCu.join('\n'))), cachCu);
  check('đối chứng — bắt được cách đọc thẳng giờ của máy',
    DAU_HIEU_TRINH_DUYET.some(dh => dh.re.test(cachCu2)), cachCu2);
  const cachDung = "const d = UI.parseDate(UI.todayStr());\nconst t = new Date(l.time).getTime();";
  check('đối chứng ngược — KHÔNG bắt nhầm cách viết đúng',
    !DAU_HIEU_TRINH_DUYET.some(dh => dh.re.test(cachDung)), cachDung);

  // Tệp được miễn phải thật sự là nơi định nghĩa, và phải định nghĩa theo UTC+7.
  const ui = fs.readFileSync(path.join(GOC, 'public/js/ui.js'), 'utf8');
  check('ui.js đóng cứng UTC+7 như lib/ngay.js', /LECH_PHUT_VN\s*=\s*7\s*\*\s*60/.test(ui));
  check('ui.js có đủ bộ hàm giờ Việt Nam cho màn hình dùng',
    ['ngayVN', 'thangVN', 'gioVN', 'soGioVN', 'thuVN'].every(t => new RegExp(`function ${t}\\(`).test(ui)));
  check('todayStr của trình duyệt đi qua đúng định nghĩa đó', /function todayStr\(\)\s*\{\s*return ngayVN\(\);/.test(ui));
}

tongKet();
