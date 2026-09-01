#!/usr/bin/env node
// Tạo tài khoản quản trị đầu tiên cho nhà trường.
//
//     node scripts/create-admin.js "Nguyễn Văn Hiệu" hieutruong
//
// Mật khẩu được sinh ngẫu nhiên và in ra một lần duy nhất. Người dùng buộc phải
// đổi ngay khi đăng nhập lần đầu.
const crypto = require('crypto');
const db = require('../lib/db');
const password = require('../lib/password');

const [hoTen, tenDangNhap] = process.argv.slice(2);

if (!hoTen || !tenDangNhap) {
  console.error(`
Thiếu tham số.

  node scripts/create-admin.js "<họ tên>" <tên đăng nhập>

Ví dụ:
  node scripts/create-admin.js "Nguyễn Văn Hiệu" hieutruong
`);
  process.exit(1);
}

const username = String(tenDangNhap).trim().toLowerCase();
if (!/^[a-z0-9._]{3,30}$/.test(username)) {
  console.error('Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới (3-30 ký tự).');
  process.exit(1);
}
if (db.findUserByUsername(username)) {
  console.error(`Tên đăng nhập "${username}" đã được dùng.`);
  process.exit(1);
}

const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
// `crypto.randomInt`, KHÔNG phải `Math.random`: đây là mật khẩu của tài khoản
// quản trị THẬT, mà Math.random đoán trước được khi biết vài giá trị nó sinh.
const pick = (s) => s[crypto.randomInt(s.length)];
let matKhau = '';
for (let i = 0; i < 6; i++) matKhau += pick(CHU);
for (let i = 0; i < 4; i++) matKhau += pick(SO);

const rec = {
  id: db.nextId('ad'),
  username,
  passwordHash: password.hash(matKhau),
  role: 'admin',
  name: String(hoTen).trim(),
  title: '',
  phone: '',
  email: '',
  classId: null,
  avatar: { emoji: '🏫', bg: '#1f5e8c' },
  mustChangePassword: true,
  active: true,
  createdAt: new Date().toISOString(),
};
db.insert('users', rec);
db.audit(rec.id, 'admin-create', rec.id, { name: rec.name, byScript: true });

console.log(`
Đã tạo tài khoản quản trị:

  Họ tên:         ${rec.name}
  Tên đăng nhập:  ${username}
  Mật khẩu:       ${matKhau}

Mật khẩu này chỉ hiện MỘT LẦN. Hãy ghi lại ngay và đổi sau khi đăng nhập
(hệ thống sẽ tự yêu cầu đổi).
`);

db.close();
