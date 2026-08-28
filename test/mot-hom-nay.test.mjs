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
const VUNG_QUET = ['routes', 'modules', 'lib', 'scripts'];

// `modules/<mã>/view.js` là mã CHẠY TRÊN TRÌNH DUYỆT, y hệt public/js/views —
// chỉ khác chỗ đứng trong cây thư mục. Nó không nạp được lib/ngay, và cũng
// không cần: điện thoại của cô đang ở Việt Nam nên giờ máy ở đó chính là giờ
// cần dùng. Bỏ qua theo QUY TẮC chứ không theo tên từng tệp, để phân hệ thêm
// sau này không phải nhớ xin miễn.
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
    else if (/\.js$/.test(ten)) ra.push(path.join(muc, ten));
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
];

const tatCaTep = VUNG_QUET.flatMap(cacTep);

// ===========================================================================
console.log('\n[1] Bộ canh có thật sự nhìn tới nơi cần nhìn');
{
  check('quét cả bốn vùng mã máy chủ', VUNG_QUET.length === 4, VUNG_QUET);
  check('tìm được kha khá tệp để soi', tatCaTep.length >= 40, tatCaTep.length);
  check('có nhìn vào thư mục con của phân hệ',
    tatCaTep.some(t => /^modules\/[^/]+\/routes\.js$/.test(t)),
    tatCaTep.filter(t => t.startsWith('modules/')).slice(0, 4));
  check('có nhìn vào routes lõi', tatCaTep.includes('routes/attendance.js'));
  check('danh sách miễn vẫn đúng 1 mục — thêm mục mới phải có lý do',
    Object.keys(MIEN).length === 1, Object.keys(MIEN));
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
}

tongKet();
