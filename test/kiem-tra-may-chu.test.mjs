// Kiểm thử bộ kiểm tra máy chủ: nó có thật sự bắt được từng thứ nó hứa bắt không.
//
// Chạy bằng:  npm run test:may-chu
//
// Bộ canh mà không ai canh thì cũng chỉ là lời hứa. Mỗi mục kiểm trong
// scripts/kiem-tra-may-chu.js đều được thử theo CẢ HAI chiều: dựng ra tình huống
// hỏng để xem nó có báo không, rồi sửa tình huống đó để xem nó có thôi báo không.
// Chỉ thử một chiều thì không phân biệt được "bắt đúng" với "lúc nào cũng kêu".
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem } from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const SCRIPT = path.join(GOC, 'scripts', 'kiem-tra-may-chu.js');

// Chạy bộ kiểm tra, trả về toàn bộ chữ nó in ra và mã thoát.
function chay(dir, { TZ = 'Asia/Ho_Chi_Minh', args = [] } = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, DATA_DIR: dir, TZ },
  });
  return { out: `${r.stdout || ''}${r.stderr || ''}`, ma: r.status };
}

// Đọc trạng thái của đúng một mục kiểm trong bản báo cáo.
function trangThai(out, ten) {
  const dong = out.split('\n').find(l => /[✓✗–]/.test(l) && l.includes(ten));
  if (!dong) return null;
  if (dong.includes('✓ ĐẠT')) return 'ĐẠT';
  if (dong.includes('✗ CẦN SỬA')) return 'CẦN SỬA';
  if (dong.includes('– BỎ QUA')) return 'BỎ QUA';
  return null;
}

const DIR = thuMucTam('may-chu');
fs.mkdirSync(DIR, { recursive: true });
sinhDuLieu(DIR);

// ---------------------------------------------------------------------------
console.log('\n[1] Múi giờ — bắt đúng lỗi đã gặp khi triển khai thật');
{
  const utc = chay(DIR, { TZ: 'UTC' });
  check('máy chủ chạy giờ UTC → CẦN SỬA', trangThai(utc.out, 'Múi giờ máy chủ') === 'CẦN SỬA', trangThai(utc.out, 'Múi giờ máy chủ'));
  check('nói rõ lệch mấy tiếng', /lệch giờ Việt Nam 7 tiếng/.test(utc.out));
  check('chỉ luôn câu lệnh sửa', /timedatectl set-timezone Asia\/Ho_Chi_Minh/.test(utc.out));
  check('nêu đúng hậu quả: lịch sao lưu chạy sai giờ', /Lịch sao lưu .* sẽ chạy sai giờ/.test(utc.out));

  const tokyo = chay(DIR, { TZ: 'Asia/Tokyo' });
  check('múi giờ khác UTC+7 cũng bị bắt (Tokyo)', trangThai(tokyo.out, 'Múi giờ máy chủ') === 'CẦN SỬA');

  const vn = chay(DIR, { TZ: 'Asia/Ho_Chi_Minh' });
  check('đặt đúng giờ Việt Nam → ĐẠT', trangThai(vn.out, 'Múi giờ máy chủ') === 'ĐẠT', trangThai(vn.out, 'Múi giờ máy chủ'));
}

// ---------------------------------------------------------------------------
console.log('\n[2] Vị trí dữ liệu — chặn nguy cơ đẩy hồ sơ trẻ em lên GitHub');
{
  const ngoai = chay(DIR);
  check('dữ liệu ngoài kho mã → ĐẠT', trangThai(ngoai.out, 'Vị trí dữ liệu') === 'ĐẠT', trangThai(ngoai.out, 'Vị trí dữ liệu'));

  const trong = chay(path.join(GOC, 'data'));
  check('dữ liệu nằm trong kho mã → CẦN SỬA', trangThai(trong.out, 'Vị trí dữ liệu') === 'CẦN SỬA', trangThai(trong.out, 'Vị trí dữ liệu'));
  check('cảnh báo nêu đúng rủi ro git add', /git add -A/.test(trong.out));
}

// ---------------------------------------------------------------------------
console.log('\n[3] Mật khẩu mẫu — chặn trước khi phụ huynh dùng thật');
{
  const truoc = chay(DIR);
  check('dữ liệu mẫu còn mật khẩu "123456" → CẦN SỬA', trangThai(truoc.out, 'Mật khẩu mẫu') === 'CẦN SỬA', trangThai(truoc.out, 'Mật khẩu mẫu'));
  check('đếm đúng 8 tài khoản', /8 tài khoản còn dùng/.test(truoc.out), truoc.out.match(/\d+ tài khoản còn dùng/)?.[0]);
  check('nêu đích danh tài khoản để biết đường mà sửa', /giaovien/.test(truoc.out) && /phuhuynh/.test(truoc.out));

  // Đổi hết mật khẩu rồi kiểm lại — phải thôi báo.
  const Database = require2('better-sqlite3');
  const password = require2(path.join(GOC, 'lib', 'password.js'));
  const db = new Database(path.join(DIR, 'school.db'));
  db.prepare('UPDATE users SET passwordHash = ?').run(password.hash('MatKhauRieng2026!'));
  db.close();

  const sau = chay(DIR);
  check('đổi hết mật khẩu → ĐẠT', trangThai(sau.out, 'Mật khẩu mẫu') === 'ĐẠT', trangThai(sau.out, 'Mật khẩu mẫu'));
}

// ---------------------------------------------------------------------------
console.log('\n[4] Sao lưu — có chạy không, và có MỞ RA ĐƯỢC không');
{
  const chuaCo = chay(DIR);
  check('chưa từng sao lưu → CẦN SỬA', trangThai(chuaCo.out, 'Bản sao lưu gần nhất') === 'CẦN SỬA');
  check('chưa có bản nào thì bỏ qua phép thử mở', trangThai(chuaCo.out, 'Bản sao lưu mở ra được') === 'BỎ QUA');

  spawnSync(process.execPath, [path.join(GOC, 'scripts', 'backup.js')],
    { cwd: GOC, env: { ...process.env, DATA_DIR: DIR }, stdio: 'ignore' });

  const moi = chay(DIR);
  check('sao lưu xong → ĐẠT', trangThai(moi.out, 'Bản sao lưu gần nhất') === 'ĐẠT', trangThai(moi.out, 'Bản sao lưu gần nhất'));
  check('bản sao lưu thật mở ra được → ĐẠT', trangThai(moi.out, 'Bản sao lưu mở ra được') === 'ĐẠT', trangThai(moi.out, 'Bản sao lưu mở ra được'));

  // Bản sao lưu quá cũ nghĩa là lịch hằng đêm đã chết mà không ai hay.
  const tep = fs.readdirSync(path.join(DIR, 'backups')).find(f => f.endsWith('.db.gz'));
  const duongDan = path.join(DIR, 'backups', tep);
  const cuKy = new Date(Date.now() - 72 * 3600 * 1000);
  fs.utimesSync(duongDan, cuKy, cuKy);
  const cu = chay(DIR);
  check('bản sao lưu quá 48 tiếng → CẦN SỬA', trangThai(cu.out, 'Bản sao lưu gần nhất') === 'CẦN SỬA', trangThai(cu.out, 'Bản sao lưu gần nhất'));
  check('nói rõ nghi ngờ lịch hằng đêm đã ngừng', /lịch sao lưu hằng đêm nhiều khả năng đã ngừng chạy/.test(cu.out));

  // Bản sao lưu hỏng còn nguy hiểm hơn không có: người ta tưởng mình đang an toàn.
  fs.writeFileSync(duongDan, 'day khong phai tep gzip');
  const hong = chay(DIR);
  check('bản sao lưu hỏng bị phát hiện → CẦN SỬA', trangThai(hong.out, 'Bản sao lưu mở ra được') === 'CẦN SỬA', trangThai(hong.out, 'Bản sao lưu mở ra được'));
  check('nói thẳng: coi như đang không có bản sao lưu nào', /coi như đang không có bản sao lưu nào/.test(hong.out));
}

// ---------------------------------------------------------------------------
console.log('\n[5] Lịch sao lưu tự động và dung lượng đĩa');
{
  const r = chay(DIR);
  check('máy không có lịch sao lưu → CẦN SỬA', trangThai(r.out, 'Lịch sao lưu tự động') === 'CẦN SỬA', trangThai(r.out, 'Lịch sao lưu tự động'));
  check('chỉ đúng chỗ tra cứu cách đặt lịch', /QUY-TRINH-TRIEN-KHAI\.docx/.test(r.out));
  check('đọc được dung lượng đĩa', trangThai(r.out, 'Dung lượng đĩa') === 'ĐẠT', trangThai(r.out, 'Dung lượng đĩa'));
}

// ---------------------------------------------------------------------------
console.log('\n[6] Chứng chỉ HTTPS');
{
  const khong = chay(DIR);
  check('không truyền tên miền → BỎ QUA, không tự bịa', trangThai(khong.out, 'Chứng chỉ HTTPS') === 'BỎ QUA');

  // Tên miền không tồn tại: phải báo không kết nối được, KHÔNG được báo "đạt".
  const bay = chay(DIR, { args: ['--ten-mien=khong-ton-tai.casa-school-kiem-thu.invalid'] });
  check('tên miền không kết nối được → CẦN SỬA', trangThai(bay.out, 'Chứng chỉ HTTPS') === 'CẦN SỬA', trangThai(bay.out, 'Chứng chỉ HTTPS'));
}

// ---------------------------------------------------------------------------
console.log('\n[7] Bản thân bộ kiểm không được gây tác dụng phụ');
{
  // Một bộ KIỂM TRA không được phép tạo ra thứ nó đang đi kiểm. Nếu nó tự tạo
  // cơ sở dữ liệu thì lần chạy đầu ở máy chủ sai DATA_DIR sẽ luôn báo "đạt".
  const rong = thuMucTam('may-chu-rong');
  fs.mkdirSync(rong, { recursive: true });
  const r = chay(rong);
  check('thư mục rỗng: KHÔNG tự tạo school.db', !fs.existsSync(path.join(rong, 'school.db')));
  check('thư mục rỗng: báo thiếu cơ sở dữ liệu', trangThai(r.out, 'Cơ sở dữ liệu') === 'CẦN SỬA', trangThai(r.out, 'Cơ sở dữ liệu'));
  check('thiếu CSDL thì bỏ qua phép kiểm mật khẩu, không nổ', trangThai(r.out, 'Mật khẩu mẫu') === 'BỎ QUA');
  check('vẫn in trọn bản báo cáo dù có mục hỏng', /mục đạt, .* mục cần sửa/.test(r.out));
  donThuMucTam(rong);
}

// ---------------------------------------------------------------------------
console.log('\n[8] Mã thoát và bảng tổng kết');
{
  const r = chay(DIR);
  check('có mục cần sửa → thoát mã 1 (để lịch tự động biết mà báo)', r.ma === 1, r.ma);

  const soDat = (r.out.match(/✓ ĐẠT/g) || []).length;
  const soHong = (r.out.match(/✗ CẦN SỬA/g) || []).length;
  const tong = r.out.match(/(\d+) mục đạt, (\d+) mục cần sửa/);
  check('dòng tổng kết đếm đúng số mục đạt', tong && Number(tong[1]) === soDat, tong?.[0]);
  check('dòng tổng kết đếm đúng số mục cần sửa', tong && Number(tong[2]) === soHong, tong?.[0]);
  check('nói rõ app vẫn đang chạy bình thường, không dọa người dùng', /vẫn đang phục vụ bình thường/.test(r.out));
}

donThuMucTam(DIR);
tongKet();
