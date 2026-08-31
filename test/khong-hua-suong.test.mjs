// Bài canh: APP KHÔNG ĐƯỢC HỨA THỨ NÓ KHÔNG LÀM ĐƯỢC.
//
// Chạy bằng:  npm run test:khong-hua-suong
//
// VÌ SAO CÓ BÀI NÀY
//
// Bài học đã trả giá một lần ở A5 (màn dặn thuốc): app có ô "đã cho uống",
// nhưng không ai đứng ra bảo đảm ô đó được tích. Gia đình đọc thấy ô trống rồi
// hiểu là "cô chưa cho con uống", trong khi sự thật chỉ là "cô chưa bấm". Nhà
// trường quyết bỏ hẳn ô đó — thà thiếu tính năng còn hơn nói sai.
//
// LỜI HỨA SAI TỆ HƠN THIẾU TÍNH NĂNG, và đây là lý do:
//
//   Thiếu tính năng thì người ta biết mà tự xoay. Hứa sai thì người ta THÔI
//   xoay. Gia đình bấm "Bật thông báo" xong sẽ không mở app ra xem nữa — họ
//   tưởng có tin thì máy sẽ báo. Đến hôm cô báo con sốt thì không ai đọc.
//
// CHỖ ĐANG CANH: THÔNG BÁO ĐẨY
//
// Trước đợt Đ14, app có HAI nút xin quyền `Notification` và hứa suông: một
// băng-rôn ở `public/js/app.js` và một nút trong màn Cài đặt. Trong khi đó
// `public/sw.js` không có sự kiện `push`, cả kho mã không có `pushManager`,
// không khoá VAPID, không gói gửi, và máy chủ không có chỗ nào lưu đăng ký.
//
// Bài này KHÔNG cấm làm thông báo đẩy. Nó chỉ đòi hai thứ đi cùng nhau: hễ
// còn xin quyền thì phải có đường đẩy thật. Ngày nào dựng xong đường đẩy, bài
// này tự nới ra mà không cần sửa một dòng nào — vì nó ĐỌC `sw.js` để quyết
// định, không ghi cứng câu trả lời.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

function docTep(duong) {
  try { return fs.readFileSync(path.join(GOC, duong), 'utf8'); } catch (_) { return ''; }
}

// Quét mọi tệp .js dưới public/ và modules/ — chỗ nào cũng có thể xin quyền.
function cacTepGiaoDien(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const con = path.join(p, f);
    if (fs.statSync(con).isDirectory()) ra.push(...cacTepGiaoDien(path.relative(GOC, con)));
    else if (/\.js$/.test(f)) ra.push(con);
  }
  return ra;
}

// ===========================================================================
console.log('\n[1] Đường đẩy thông báo có thật hay không — đọc từ mã, không đoán');

const sw = docTep('public/sw.js');
const coBoNghePush = /addEventListener\(\s*['"]push['"]/.test(sw);
const coHienThongBao = /showNotification\s*\(/.test(sw);

const tatCaMa = [
  ...cacTepGiaoDien('public'),
  ...cacTepGiaoDien('modules'),
  ...cacTepGiaoDien('routes'),
  ...cacTepGiaoDien('lib'),
].map(t => ({ ten: path.relative(GOC, t).split(path.sep).join('/'), noiDung: fs.readFileSync(t, 'utf8') }));

const coDangKyDay = tatCaMa.some(t => /pushManager\s*\.\s*subscribe/.test(t.noiDung));
const coDuongDayThat = coBoNghePush && coHienThongBao && coDangKyDay;

// `typeof x === 'boolean'` LÀ MỘT PHÉP KIỂM HẰNG ĐÚNG.
//
// `coDuongDayThat` là kết quả của ba phép `&&` trên ba biểu thức boolean, nên
// nó LUÔN là boolean — kể cả khi `tatCaMa` rỗng vì bộ liệt tệp hỏng, kể cả khi
// `public/sw.js` biến mất. Dòng này tự nhận là "bộ canh tự đọc được trạng
// thái", trong khi thứ duy nhất nó chứng minh là JavaScript có kiểu boolean.
//
// Thứ đáng canh là BỘ QUÉT CÓ ĐỌC ĐƯỢC GÌ KHÔNG. Cả bài này đứng trên
// `tatCaMa`: mọi mục dưới đều hỏi "tệp nào chứa mẫu X". Danh sách rỗng thì mọi
// mục ấy xanh hết, và bài canh trở thành một tờ giấy chứng nhận trắng.
check('bộ quét đọc được mã giao diện và máy chủ để mà soi',
  tatCaMa.length >= 40,
  { soTep: tatCaMa.length, coBoNghePush, coHienThongBao, coDangKyDay });
check('và đọc được public/sw.js — nơi đường đẩy sẽ phải xuất hiện đầu tiên',
  sw.length > 200, sw.length);

// ===========================================================================
console.log('\n[2] CHƯA CÓ ĐƯỜNG ĐẨY THÌ KHÔNG ĐƯỢC XIN QUYỀN THÔNG BÁO');
{
  const xinQuyen = tatCaMa
    .filter(t => /Notification\s*\.\s*requestPermission/.test(t.noiDung))
    .map(t => t.ten);

  if (coDuongDayThat) {
    // Đã dựng xong đường đẩy thật — lúc đó xin quyền là đúng, và bài này phải
    // nới ra chứ không được chặn tiếp.
    check('đã có đường đẩy thật nên xin quyền là hợp lệ', true, xinQuyen);
  } else {
    check('KHÔNG TỆP NÀO XIN QUYỀN THÔNG BÁO KHI CHƯA CÓ ĐƯỜNG ĐẨY',
      xinQuyen.length === 0,
      { xinQuyen, thieu: { coBoNghePush, coHienThongBao, coDangKyDay } });
  }
}

// ===========================================================================
console.log('\n[3] Và màn hình không được NÓI như thể thông báo đang chạy');
{
  // Chỉ soi những câu HIỆN RA MÀN HÌNH. Chú thích trong mã được phép nhắc tới
  // chuyện này — chính tệp app.js đang giải thích dài dòng vì sao đã gỡ.
  const HUA = [
    { tu: 'nhận thông báo kịp thời', re: /nhận thông báo kịp thời/i },
    { tu: 'Đã bật thông báo', re: /Đã bật thông báo/i },
    { tu: 'thông báo đẩy', re: /thông báo đẩy/i },
  ];

  // Bỏ chú thích // và /* */ trước khi soi, để lời giải thích trong mã không bị
  // đọc nhầm thành chữ trên màn hình.
  const boChuThich = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(d => d.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

  const viPham = [];
  for (const t of tatCaMa) {
    if (!t.ten.startsWith('public/') && !t.ten.startsWith('modules/')) continue;
    const sach = boChuThich(t.noiDung);
    for (const h of HUA) {
      if (h.re.test(sach)) viPham.push(`${t.ten}: ${h.tu}`);
    }
  }

  if (coDuongDayThat) {
    check('đã có đường đẩy thật nên nói về thông báo là hợp lệ', true, viPham);
  } else {
    check('KHÔNG MÀN HÌNH NÀO NÓI VỀ THÔNG BÁO ĐẨY NHƯ MỘT THỨ ĐANG CÓ',
      viPham.length === 0, viPham);
  }
}

// ===========================================================================
console.log('\n[4] Bộ canh này có thật sự bắt được không');
{
  // Dựng một tệp giả có đúng câu vi phạm, rồi kiểm rằng biểu thức bắt được.
  // Không có mục này thì mục [2] và [3] xanh cả khi biểu thức viết sai.
  const gia = "const x = await Notification.requestPermission();";
  check('bắt được lời xin quyền thông báo', /Notification\s*\.\s*requestPermission/.test(gia));
  check('bắt được cả khi viết cách ra', /Notification\s*\.\s*requestPermission/.test('Notification . requestPermission()'));

  const chu = 'UI.toast("Đã bật thông báo đẩy")';
  check('bắt được câu hứa trên màn hình', /Đã bật thông báo/i.test(chu) && /thông báo đẩy/i.test(chu));

  // Và chiều ngược lại: một dòng chú thích giải thích vì sao đã gỡ thì KHÔNG
  // được tính là vi phạm.
  const chuThich = '// Trước đây banner này hứa "nhận thông báo kịp thời", nay đã gỡ.';
  const sach = chuThich.split('\n').map(d => d.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  check('nhưng KHÔNG bắt nhầm lời giải thích nằm trong chú thích',
    !/nhận thông báo kịp thời/i.test(sach), sach);
}

// ===========================================================================
console.log('\n[5] Thứ app THẬT SỰ làm được thì vẫn phải còn');
{
  // Gỡ lời hứa sai mà gỡ luôn thứ đúng thì thành mất tính năng. Cài app vào
  // màn hình chính là thứ app làm được thật, và nó là đường để mở app khi mất
  // mạng (Đ12) — nên nó phải còn nguyên.
  const app = docTep('public/js/app.js');
  check('vẫn còn lời mời cài app vào màn hình chính', /moiCaiVaoManHinhChinh/.test(app));
  check('vẫn còn đường gọi lời mời cài của trình duyệt', /promptInstall/.test(app));
  check('và vẫn còn chỗ ghi lại lời mời đó', /beforeinstallprompt/.test(app));

  const st = docTep('public/js/views/settings.js');
  check('màn Cài đặt vẫn có nút cài app', /st-install/.test(st));
}

tongKet();
