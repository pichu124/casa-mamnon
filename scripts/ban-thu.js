#!/usr/bin/env node
// DỰNG BÀN THỬ CHO BUỔI THỬ TRÊN ĐIỆN THOẠI THẬT CỦA CÔ — một lệnh.
//
//     npm run ban-thu                  dựng rồi chạy luôn
//     npm run ban-thu -- --lam-lai     xoá bàn thử cũ, dựng lại từ đầu
//     npm run ban-thu -- --cong 8080   đổi cổng
//     npm run ban-thu -- --khong-chay  chỉ dựng, không khởi động máy chủ
//     npm run ban-thu -- --thu-muc <đường dẫn>
//
// VÌ SAO CÓ TỆP NÀY
//
// `docs/PHEP-THU-DIEN-THOAI.md` mục 2 liệt kê SÁU bước chuẩn bị, và buổi thử
// chỉ diễn ra khi ai đó chịu làm đủ sáu. Ba trong sáu bước là chỗ dễ bỏ sót
// nhất, và mỗi chỗ bỏ sót đều làm hỏng buổi thử theo một kiểu riêng:
//
//   • Quên đổi mật khẩu mẫu → 13 tài khoản dùng chung "123456". Buổi thử thường
//     chạy qua một đường hầm công khai để có HTTPS, nên đó là mở cửa thật.
//   • Chỉ bật MỘT phân hệ (phiếu ghi "Quản trị → Tính năng → Ghi nhanh") → cô
//     mở app ra và không thấy Nhật ký ngày, Báo ăn, Hành trình… tức KHÔNG
//     nhìn thấy app ở đúng trạng thái trường sẽ dùng.
//   • Quên `DATA_DIR` → dữ liệu thử nằm trong kho mã.
//
// Tệp này làm cả sáu bước trong một lệnh, và in ra đúng thứ người tổ chức cần
// đọc to cho cô. Nó KHÔNG thay phiếu thử — phiếu vẫn là nơi ghi kết quả.
//
// AN TOÀN: bàn thử luôn nằm NGOÀI kho mã, và tệp này KHÔNG BAO GIỜ đụng tới
// `DATA_DIR` mà người dùng đang đặt cho máy chủ thật.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const GOC = path.join(__dirname, '..');
const args = process.argv.slice(2);

function co(ten) { return args.includes(ten); }
function giaTri(ten, macDinh) {
  const i = args.indexOf(ten);
  if (i >= 0 && args[i + 1] !== undefined) return args[i + 1];
  const g = args.find(a => a.startsWith(`${ten}=`));
  return g ? g.slice(ten.length + 1) : macDinh;
}

// ---------------------------------------------------------------------------
// CHỐT CHẶN 1: không bao giờ chạy ở chế độ thật.
if (process.env.NODE_ENV === 'production') {
  console.error('\n⛔ Đây là bàn THỬ, không chạy được ở chế độ thật (NODE_ENV=production).');
  console.error('   Bàn thử sinh dữ liệu mẫu và đặt lại mật khẩu — chạy nó trên máy chủ');
  console.error('   thật là ghi đè lên dữ liệu của trường.\n');
  process.exit(1);
}

const THU_MUC = path.resolve(giaTri('--thu-muc', path.join(os.tmpdir(), 'casa-ban-thu')));

// CHỐT CHẶN 2: bàn thử không được nằm trong kho mã.
//
// `scripts/kiem-tra-du-lieu.js` chặn mọi tệp `.db` lọt vào commit, nhưng chặn ở
// cửa commit thì đã là muộn một nhịp — và bàn thử có ảnh trẻ trong `uploads/`.
// Rẻ hơn nhiều là không bao giờ để nó rơi vào đây.
const trongKhoMa = !path.relative(GOC, THU_MUC).startsWith('..')
  && !path.isAbsolute(path.relative(GOC, THU_MUC));
if (trongKhoMa) {
  console.error(`\n⛔ Thư mục bàn thử nằm TRONG kho mã: ${THU_MUC}`);
  console.error('   Bàn thử có ảnh của trẻ. Chọn một chỗ ngoài kho mã, ví dụ:');
  console.error(`   npm run ban-thu -- --thu-muc ${path.join(os.tmpdir(), 'casa-ban-thu')}\n`);
  process.exit(1);
}

const CONG = String(giaTri('--cong', process.env.PORT || '3000'));
const DB = path.join(THU_MUC, 'school.db');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  BÀN THỬ CASA MẦM NON');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`Thư mục dữ liệu thử:  ${THU_MUC}`);

if (co('--lam-lai') && fs.existsSync(THU_MUC)) {
  fs.rmSync(THU_MUC, { recursive: true, force: true });
  console.log('Đã xoá bàn thử cũ (--lam-lai).');
}
fs.mkdirSync(THU_MUC, { recursive: true });

const moi = !fs.existsSync(DB);
const moiTruong = { ...process.env, DATA_DIR: THU_MUC, NODE_ENV: 'development' };

// ---------------------------------------------------------------------------
// 1. Dữ liệu mẫu.
if (moi) {
  console.log('\n[1/4] Sinh dữ liệu mẫu…');
  execFileSync('node', [path.join(GOC, 'data', 'seed.js'), '--force'],
    { cwd: GOC, env: moiTruong, stdio: 'ignore' });
  console.log('      xong — 11 bé, 4 nhóm, 3 cơ sở.');
} else {
  console.log('\n[1/4] Bàn thử đã có sẵn, giữ nguyên dữ liệu.');
  console.log('      Muốn dựng lại từ đầu:  npm run ban-thu -- --lam-lai');
}

// Nạp `lib/db.js` SAU khi đã đặt DATA_DIR, nếu không nó mở nhầm cơ sở dữ liệu.
process.env.DATA_DIR = THU_MUC;
const db = require('../lib/db');
const password = require('../lib/password');
const modules = require('../lib/modules');

// ---------------------------------------------------------------------------
// 2. Bật đủ các phân hệ mầm non.
//
// Đây là bước mà phiếu thử ghi thiếu: nó chỉ bảo bật "Ghi nhanh". Nhưng một
// ngày của cô đi qua Nhật ký ngày, Báo ăn, Hành trình… — bật một
// cái là cô nhìn thấy một app khác hẳn app trường sẽ dùng.
console.log('\n[2/4] Bật các phân hệ mầm non…');

// PHẢI NẠP PHÂN HỆ CẮM THÊM TRƯỚC KHI HỎI `tatCa()`.
//
// `tatCa()` trả về `[...CORE, ...MO_RONG]`, mà `MO_RONG` chỉ được đổ đầy khi
// `napMoRong()` chạy — `server.js` gọi nó lúc khởi động. Không gọi ở đây thì
// mười phân hệ cắm thêm KHÔNG có mặt trong danh sách, vòng lặp bên dưới không
// bật gì cả, và bàn thử im lặng dựng ra đúng cái app mà nó sinh ra để tránh.
modules.napMoRong();

// Và trạng thái bật/tắt KHÔNG nằm trên đối tượng phân hệ: `tatCa()` trả về
// ĐỊNH NGHĨA (key, name, roles…), còn bật hay tắt thì hỏi `trangThai()`. Bản
// đầu của tệp này đọc `m.enabled` — một trường không tồn tại — nên mọi phân hệ
// đều "tắt", kể cả những cái đang bật.
//
// CHỈ BẬT PHÂN HỆ CẮM THÊM, tức `modules.moRong()`. Bản đầu lọc bằng
// `!m.core` — nhưng phân hệ lõi KHÔNG có trường `core`, nên điều kiện đó đúng
// với cả 26 và bàn thử bật luôn Nhận xét, Báo cáo, Xe buýt, Nề nếp: bốn thứ
// nhà trường đã quyết TẮT, trong đó hai cái là món nợ N3 mà QUY TẮC 4 đang
// canh. Bật chúng lên trong buổi thử là đưa cho cô xem đúng thứ app này tồn
// tại để không làm.
//
// VÀ CHỈ NHỮNG PHÂN HỆ CẮM THÊM MẶC ĐỊNH BẬT (Đ239i). Phân hệ cắm thêm mà nhà
// trường đã quyết tắt mang `defaultEnabled: false` trong `module.json` — Đón
// trả bé từ Đ227, vì đã lồng vào Điểm danh. Bản trước bật hết `moRong()`, nên
// ghi đè quyết định ấy bằng một dòng "bật" và máy thử vẫn hiện Đón trả bé.
// Máy thử dựng bằng bản cũ đã mang sẵn dòng đó, nên ở đây TẮT lại cho đúng
// quyết định của trường; dữ liệu của phân hệ không bị đụng tới.
const camThem = modules.moRong();
const canBat = camThem.filter(m => m.defaultEnabled !== false);
const truongTat = camThem.filter(m => m.defaultEnabled === false);
for (const m of canBat) {
  if (!modules.dangBat(m.key)) modules.datTrangThai(m.key, true);
}
for (const m of truongTat) {
  if (modules.dangBat(m.key)) modules.datTrangThai(m.key, false);
}

const tt = modules.trangThai();
const bat = modules.tatCa().filter(m => tt[m.key]);
const tat = modules.tatCa().filter(m => !tt[m.key]);
console.log(`      ${bat.length} phân hệ đang bật:`);
console.log(`      ${bat.map(m => m.name).join(' · ')}`);
if (tat.length) {
  console.log(`\n      ${tat.length} phân hệ vẫn TẮT theo quyết định của nhà trường:`);
  console.log(`      ${tat.map(m => m.name).join(', ')}`);
  console.log('      (Nhận xét và Xe buýt: đợt A2. Báo cáo và Nề nếp: món nợ N3.)');
  if (tat.some(m => m.key === 'dontra')) {
    console.log('      (Đón trả bé: đã lồng vào Điểm danh, góp ý của trường 06/10 và 16/10.');
    console.log('       Cần thì bật lại ở Quản trị → Tính năng; dữ liệu cũ vẫn giữ nguyên.)');
  }
}

// VẾ ĐỐI CHỨNG. Bàn thử tồn tại để cho cô nhìn app ở ĐÚNG trạng thái trường sẽ
// dùng; dựng ra một bàn thử thiếu phân hệ mà vẫn báo "xong" là tệ hơn không
// dựng, vì buổi thử sẽ đo nhầm một app khác.
if (!camThem.length) {
  console.error('\n⛔ Không tìm thấy phân hệ cắm thêm nào trong modules/.');
  console.error('   Bàn thử phải có đủ mười phân hệ cắm thêm thì cô mới nhìn thấy đúng app.');
  process.exit(1);
}
const conTat = canBat.filter(m => !tt[m.key]);
if (conTat.length) {
  console.error(`\n⛔ Bật không thành công: ${conTat.map(m => m.key).join(', ')}`);
  process.exit(1);
}
const conBat = truongTat.filter(m => tt[m.key]);
if (conBat.length) {
  console.error(`\n⛔ Tắt không thành công: ${conBat.map(m => m.key).join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Đổi mật khẩu mẫu.
//
// Dữ liệu mẫu dùng chung "123456". Buổi thử thường chạy qua một đường hầm công
// khai để có HTTPS (xem mục 1 của phiếu), nên để nguyên là mở cửa thật, không
// phải mở cửa trên lý thuyết.
const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
// `crypto.randomInt`, KHÔNG phải `Math.random` (Đ212). Mật khẩu sinh ở đây mở
// được tài khoản cô và phụ huynh của buổi thử, và chính chú thích ngay trên
// đã viết rằng buổi thử chạy qua một đường hầm công khai — tức cửa thật, không
// phải cửa trên lý thuyết. Một mật khẩu đoán trước được ở đó là một cửa mở
// thật. Cùng lý do đã ghi ở `routes/admin.js` và `routes/accounts.js`.
//
// HÀM TỰ CHỨA, GIỐNG KHUÔN CỦA BA BỘ SINH KIA. Bản trước để phép chọn ký tự ở
// một trợ giúp `boc()` bên ngoài thân hàm; mã vẫn đúng, nhưng bài canh
// `test:mat-khau-ngau-nhien` soi ĐÍCH THÂN thân hàm — và nó soi như vậy là cố
// ý, vì `crypto.randomInt` nằm đâu đó trong cùng tệp KHÔNG chứng minh được
// rằng chính hàm sinh mật khẩu dùng nó. Viết gọn vào trong thì bốn bộ sinh của
// cả kho cùng một khuôn, và bài canh không phải chừa ngoại lệ cho ai.
function sinhMatKhau() {
  const pick = (s) => s[crypto.randomInt(s.length)];
  let mk = '';
  for (let i = 0; i < 6; i++) mk += pick(CHU);
  for (let i = 0; i < 4; i++) mk += pick(SO);
  return mk;
}

console.log('\n[3/4] Đổi mật khẩu mẫu…');
const mkChung = sinhMatKhau();
db.run('UPDATE users SET passwordHash = ? WHERE role IN (?, ?)',
  [password.hash(mkChung), 'teacher', 'parent']);
const soDoi = db.count("SELECT COUNT(*) FROM users WHERE role IN ('teacher','parent')");
console.log(`      ${soDoi} tài khoản cô và gia đình nay dùng chung một mật khẩu MỚI.`);

// ---------------------------------------------------------------------------
// 4. Tài khoản quản trị.
let tenQT = 'hieutruong';
let mkQT = null;
if (!db.findUserByUsername(tenQT)) {
  mkQT = sinhMatKhau();
  db.insert('users', {
    id: db.nextId('ad'),
    username: tenQT,
    passwordHash: password.hash(mkQT),
    role: 'admin',
    name: 'Hiệu trưởng (bàn thử)',
    title: '',
    phone: '',
    email: '',
    mustChangePassword: 1,
    active: 1,
    createdAt: new Date().toISOString(),
  });
} else {
  mkQT = sinhMatKhau();
  const u = db.findUserByUsername(tenQT);
  db.update('users', u.id, { passwordHash: password.hash(mkQT), mustChangePassword: 1 });
}
// 5. Tài khoản Cấp 2 và Cấp 3.
//
// VÌ SAO BÀN THỬ PHẢI CÓ ĐỦ BA CẤP
//
// Tầng phân quyền chia người của trường làm ba cấp: ban giám hiệu thấy cả
// trường (Cấp 1), nhân sự / kế toán / marketing thấy đúng phần việc của mình
// trên cả trường (Cấp 2), quản lý và văn phòng thấy trọn một cơ sở (Cấp 3).
// Trước đợt này bàn thử chỉ có MỘT tài khoản Cấp 1, nên suốt các buổi thử
// không ai từng bấm thử hai cấp còn lại — mà đó chính là chỗ dễ sai nhất, vì
// sai kiểu "thấy quá nhiều" thì màn hình vẫn chạy trơn, không có gì báo.
//
// Bốn tài khoản dưới đây dùng chung mật khẩu với cô và gia đình: bàn thử là
// máy trong mạng nội bộ, dựng xong dùng một buổi rồi xoá.
const CAP_KHAC = [
  ['vanphong1', 'Văn phòng Cơ sở 1', 'vanphong-coso', 'cs1'],
  ['nhansu', 'Nhân sự (bàn thử)', 'nhansu', null],
  ['ketoan', 'Kế toán (bàn thử)', 'ketoan', null],
  ['marketing', 'Marketing (bàn thử)', 'marketing', null],
];
for (const [ten, hoTen, maChucVu, coSo] of CAP_KHAC) {
  let u = db.findUserByUsername(ten);
  if (!u) {
    const id = db.nextId('ad');
    db.insert('users', {
      id, username: ten, passwordHash: password.hash(mkChung), role: 'admin',
      name: hoTen, title: '', phone: '', email: '',
      // BUỘC ĐỔI MẬT KHẨU y như tài khoản ban giám hiệu. Đây là tài khoản
      // QUẢN TRỊ dùng chung một mật khẩu vừa in ra màn hình; buổi thử lại hay
      // chạy qua một đường hầm công khai. `test/ban-thu.test.mjs` canh đúng
      // điều này cho MỌI tài khoản quản trị, không trừ tài khoản nào.
      mustChangePassword: 1, active: 1, createdAt: new Date().toISOString(),
    });
    u = db.findUserByUsername(ten);
  } else {
    db.update('users', u.id, { passwordHash: password.hash(mkChung), mustChangePassword: 1 });
  }
  db.datChucVu(u.id, maChucVu);
  db.setUserCampus(u.id, coSo);
}

console.log('\n[4/4] Tài khoản quản trị: sẵn sàng.');
db.close();

// ---------------------------------------------------------------------------
// Địa chỉ trong mạng nội bộ — điện thoại của cô phải với tới được máy này.
function diaChiNoiBo() {
  const ra = [];
  for (const ds of Object.values(os.networkInterfaces())) {
    for (const n of ds || []) {
      if (n.family === 'IPv4' && !n.internal) ra.push(n.address);
    }
  }
  return ra;
}
const diaChi = diaChiNoiBo();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ĐỌC PHẦN NÀY TRƯỚC KHI CÔ TỚI');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('TÀI KHOẢN');
console.log(`  Quản trị    ${tenQT} / ${mkQT}   (bị buộc đổi mật khẩu khi đăng nhập)`);
console.log(`  Cô          giaovien / ${mkChung}      — nhóm Chồi 2`);
console.log(`  Cô          giaovien4 / ${mkChung}     — nhóm Nhà trẻ 1 (có thay bỉm, bú bình)`);
console.log(`  Gia đình    phuhuynh / ${mkChung}      — mẹ của bé An (Chồi 2) và bé Ngọc (Lá 1)`);
console.log('');
console.log('  Bốn tài khoản dưới đây cũng bị buộc đổi mật khẩu khi đăng nhập lần đầu.');
console.log(`  Cấp 3       vanphong1 / ${mkChung}     — Văn phòng Cơ sở 1: chỉ thấy bé của cơ sở 1`);
console.log(`  Cấp 2       nhansu / ${mkChung}        — tài khoản và danh sách cô, KHÔNG mở được hồ sơ bé`);
console.log(`  Cấp 2       ketoan / ${mkChung}        — học phí và tiền ăn`);
console.log(`  Cấp 2       marketing / ${mkChung}     — chỉ thấy ảnh mà MỌI bé trong ảnh đều đồng ý truyền thông`);
console.log('\n  Mật khẩu trên chỉ in MỘT LẦN ở đây. Chép lại trước khi đóng cửa sổ.');

console.log('\nĐỊA CHỈ');
console.log(`  Trên máy này        http://localhost:${CONG}`);
if (diaChi.length) {
  for (const ip of diaChi) console.log(`  Trong mạng nội bộ   http://${ip}:${CONG}`);
} else {
  console.log('  Trong mạng nội bộ   (không tìm thấy — máy này chưa nối mạng LAN?)');
}

console.log('\n⚠  HTTPS — ĐỌC KỸ, ĐÂY LÀ CHỖ BUỔI THỬ HAY HỎNG');
console.log('   Địa chỉ http://192.168… KHÔNG phải "bối cảnh an toàn" của trình duyệt.');
console.log('   Không có nó thì KHÔNG có service worker, nghĩa là:');
console.log('     • không cài được app lên màn hình chính,');
console.log('     • không mở được app khi mất mạng,');
console.log('     • tức KHÔNG đo được Lời hứa 2 của phiếu thử.');
console.log('   Đo bằng đường http rồi ghi "trượt" là ghi sai — phải ghi "không đo được".');
console.log('\n   Cách rẻ nhất để có HTTPS trong buổi thử (mở ở CỬA SỔ KHÁC):');
console.log(`     cloudflared tunnel --url http://localhost:${CONG}`);
console.log('   Nó in ra một địa chỉ https://… — đưa ĐÚNG địa chỉ đó cho cô.');
console.log('   Đóng cửa sổ là đường hầm tắt, không để lại gì.');

console.log('\nPHIẾU THỬ');
console.log('   docs/PHEP-THU-DIEN-THOAI.md — ba lời hứa, cách đo, và chỗ ghi kết quả.');
console.log('   Cần CẢ iPhone thật LẪN Android thật. Giả lập không tái hiện được độ trễ');
console.log('   mở app máy ảnh, mà đó chính là phần tốn giây nhất.');

console.log('\nDỌN SAU BUỔI THỬ');
console.log(`   rm -rf ${THU_MUC}`);
console.log('   Bàn thử có ảnh trong uploads/ — dọn xong là hết.\n');

if (co('--khong-chay')) {
  console.log('Đã dựng xong. Chạy máy chủ bằng:');
  console.log(`   DATA_DIR=${THU_MUC} PORT=${CONG} npm start\n`);
  process.exit(0);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  Đang khởi động máy chủ… (Ctrl+C để dừng)');
console.log('═══════════════════════════════════════════════════════════\n');

// `server.js` đã mặc định nghe 0.0.0.0 để điện thoại cùng Wi-Fi vào được. Đặt
// lại ở đây cho tường minh: nếu ai đó đặt HOST trong môi trường của mình thì
// bàn thử vẫn phải với tới được từ điện thoại, không thì cô mở địa chỉ IP sẽ
// thấy trang trắng mà không hiểu vì sao.
const may = spawn('node', [path.join(GOC, 'server.js')], {
  cwd: GOC,
  stdio: 'inherit',
  env: { ...moiTruong, PORT: CONG, HOST: '0.0.0.0' },
});
may.on('exit', (ma) => process.exit(ma === null ? 1 : ma));
