// Bài canh: KIỂM MẬT KHẨU KHÔNG ĐƯỢC CHẶN CẢ MÁY CHỦ (Đ261b, báo cáo tải S mục 3.2, 3.3).
//
// Chạy bằng:  node test/mat-khau-bat-dong-bo.test.mjs
//
// Một lần băm scrypt mất khoảng 45 mili-giây. `password.verify` dùng
// `scryptSync`, tức trong 45 mili-giây đó máy chủ không trả lời ai: đo ở giờ
// cao điểm, riêng đăng nhập chiếm 41% thời gian xử lý. Phép soát mật khẩu mẫu
// lúc khởi động băm thử từng tài khoản — 610 tài khoản là khoảng 25 giây.
//
// `verifyAsync` dùng `crypto.scrypt` (chạy ở luồng phụ của Node), nên trong lúc
// băm vòng lặp sự kiện vẫn phục vụ người khác. Bài này canh ba điều:
//   [1] verifyAsync cho ĐÚNG kết quả như verify, kể cả chuỗi băm hỏng;
//   [2] nó thật sự nhả vòng lặp (setImmediate chạy được trước khi có kết quả);
//   [3] đường đăng nhập và phép soát lúc khởi động dùng nó, không dùng bản đồng bộ.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require = createRequire(import.meta.url);
const password = require(path.join(GOC, 'lib', 'password.js'));

console.log('\n[1] verifyAsync cho cùng kết quả với verify');
{
  check('lib/password.js có hàm verifyAsync', typeof password.verifyAsync === 'function');
  if (typeof password.verifyAsync === 'function') {
    const bam = password.hash('matkhau-dung-2026');
    check('mật khẩu đúng → true', (await password.verifyAsync('matkhau-dung-2026', bam)) === true);
    check('mật khẩu sai → false', (await password.verifyAsync('matkhau-sai-2026', bam)) === false);
    check('khớp với bản đồng bộ', password.verify('matkhau-dung-2026', bam) === true
      && password.verify('matkhau-sai-2026', bam) === false);
    check('chuỗi băm không phải scrypt → false', (await password.verifyAsync('x', 'abc')) === false);
    check('chuỗi băm thiếu phần → false', (await password.verifyAsync('x', 'scrypt$1$2$3')) === false);
    check('phần khoá rỗng → false (không so hai chuỗi rỗng là "khớp")',
      (await password.verifyAsync('x', 'scrypt$16384$8$1$AAAA$')) === false);
    check('chuỗi băm rỗng/null → false', (await password.verifyAsync('x', null)) === false);
    check('tham số scrypt hỏng → false, không ném lỗi',
      (await password.verifyAsync('x', 'scrypt$abc$8$1$AAAA$AAAA')) === false);
    // Mật khẩu không phải chuỗi (số) vẫn được so như chuỗi, giống verify.
    const bamSo = password.hash('12345678');
    check('mật khẩu kiểu số được so như chuỗi', (await password.verifyAsync(12345678, bamSo)) === true);
  }
}

console.log('\n[2] verifyAsync nhả vòng lặp sự kiện trong lúc băm');
{
  if (typeof password.verifyAsync === 'function') {
    const bam = password.hash('mot-mat-khau-bat-ky-1');
    let soNhip = 0;
    let xong = false;
    const dem = () => { if (!xong) { soNhip++; setImmediate(dem); } };
    setImmediate(dem);
    await password.verifyAsync('mot-mat-khau-bat-ky-1', bam);
    xong = true;
    // Bản đồng bộ bọc trong Promise cho ra 0 nhịp: cả lần băm chạy liền một mạch.
    check('vòng lặp chạy được nhiều nhịp trong lúc băm', soNhip >= 3, soNhip);
  }
}

console.log('\n[3] Đường đăng nhập và phép soát lúc khởi động dùng bản bất đồng bộ');
{
  const ma = fs.readFileSync(path.join(GOC, 'routes', 'auth.js'), 'utf8');
  const dangNhap = ma.slice(ma.indexOf("app.post('/api/auth/login'"), ma.indexOf("app.post('/api/auth/logout'"));
  check('tìm thấy đường đăng nhập', dangNhap.length > 200, dangNhap.length);
  check('đăng nhập gọi password.verifyAsync', /await\s+password\.verifyAsync\(/.test(dangNhap));
  check('đăng nhập KHÔNG còn gọi password.verify đồng bộ', !/password\.verify\(/.test(dangNhap));

  const sv = fs.readFileSync(path.join(GOC, 'server.js'), 'utf8');
  const soat = sv.slice(sv.indexOf('function warnDefaultPasswords'), sv.indexOf('// Cơ sở dữ liệu trống'));
  check('tìm thấy hàm soát mật khẩu mẫu', soat.length > 200, soat.length);
  check('phép soát gọi password.verifyAsync', /password\.verifyAsync\(/.test(soat));
  check('phép soát KHÔNG còn gọi password.verify đồng bộ', !/password\.verify\(/.test(soat));
}

tongKet();
