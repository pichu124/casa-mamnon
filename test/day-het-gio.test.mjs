// Bài canh: MỖI LƯỢT ĐẨY THÔNG BÁO PHẢI CÓ HẠN CHỜ.
//
// Chạy bằng:  node test/day-het-gio.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ251, đợt soát toàn kho 12/11)
//
// `lib/day.js` gửi thông báo đẩy qua hàng đợi có trần 8 lượt cùng lúc. Bản cũ
// gọi dịch vụ đẩy mà KHÔNG đặt hạn chờ: gói `web-push` chỉ ngắt kết nối khi
// được truyền `timeout`. Dịch vụ đẩy nhận kết nối rồi im (chuyện có thật khi
// mạng máy chủ chập chờn) thì lượt ấy treo mãi và giữ luôn một chỗ trong hàng.
// Đủ tám lượt treo là KHÔNG thông báo nào đi được nữa cho tới lần khởi động
// lại — và không có gì báo: trong app chuông vẫn hiện, chỉ điện thoại là im.
//
// Bài này chạy đúng đường gửi thật (`guiChoNguoi`) với gói `web-push` bị thay
// bằng một bản ghi lại tham số, rồi đọc xem có hạn chờ hay không.
import path from 'path';
import { execFileSync } from 'child_process';
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('day-het-gio');
sinhDuLieu(DIR);

// Chạy ngoài tiến trình này: `lib/db.js` mở cơ sở dữ liệu theo DATA_DIR ngay
// lúc được nạp và giữ kết nối suốt đời tiến trình.
const ra = execFileSync('node', ['-e', `
  const webpush = require('web-push');
  const thay = [];
  webpush.sendNotification = (sub, than, tuyChon) => { thay.push({ sub, tuyChon }); return Promise.resolve({ statusCode: 201 }); };
  const db = require('./lib/db');
  const day = require('./lib/day');
  const u = db.first('users', "SELECT id FROM users WHERE role = 'parent' ORDER BY id LIMIT 1");
  // Người nhận đang đăng nhập: từ Đ255, không còn phiên nào thì máy thôi nhận tin thật.
  require('./lib/auth').createSession(u.id);
  const dk = day.dangKy(u.id, { endpoint: 'https://day.example.invalid/may-1', keys: { p256dh: 'khoa-thu', auth: 'khoa-thu' } });
  day.guiChoNguoi(u.id, { tieuDe: 'Thử', noiDung: 'Thử hạn chờ', hash: '#/' }).then((kq) => {
    process.stdout.write(JSON.stringify({ dk, kq, thay }));
    db.close();
  });
`], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
const { dk, kq, thay } = JSON.parse(ra);

// ===========================================================================
console.log('\n[1] Đường gửi thật có chạy tới dịch vụ đẩy');
{
  check('đăng ký máy thử thành công', dk && dk.ok === true, dk);
  check('gửi đúng MỘT lượt cho một máy', thay.length === 1 && kq.guiDuoc === 1, { soLuot: thay.length, kq });
  check('gửi tới đúng máy đã đăng ký',
    thay[0] && thay[0].sub.endpoint === 'https://day.example.invalid/may-1');
}

// ===========================================================================
console.log('\n[2] Lượt gửi có hạn chờ, và các tham số cũ còn nguyên');
{
  const t = (thay[0] || {}).tuyChon || {};
  check('có đặt hạn chờ cho kết nối tới dịch vụ đẩy', typeof t.timeout === 'number', t.timeout);
  // Ngắn quá thì mạng chậm bị tính là hỏng; dài quá thì tám chỗ kẹt cả phút.
  check('hạn chờ nằm trong khoảng 5–60 giây', t.timeout >= 5000 && t.timeout <= 60000, t.timeout);
  check('thời gian sống của tin (TTL) vẫn 6 giờ', t.TTL === 6 * 3600, t.TTL);
  check('vẫn ký bằng khoá VAPID của trường',
    !!t.vapidDetails && !!t.vapidDetails.publicKey && !!t.vapidDetails.privateKey && /^mailto:/.test(t.vapidDetails.subject || ''));
}

donThuMucTam(DIR);
tongKet();
