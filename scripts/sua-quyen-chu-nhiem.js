#!/usr/bin/env node
// Rà và dọn quan hệ "giáo viên chủ nhiệm ↔ lớp" bị ghi lệch.
//
//   DATA_DIR=/var/lib/schoolconnect npm run sua-quyen-chu-nhiem          # chỉ xem, không sửa
//   DATA_DIR=/var/lib/schoolconnect npm run sua-quyen-chu-nhiem -- --sua # sửa thật
//
// VÌ SAO CÓ SCRIPT NÀY
//
// Quan hệ chủ nhiệm được lưu ở hai chỗ: `classes.teacherId` và `users.classId`.
// Quyền đọc hồ sơ học sinh đi theo `users.classId`. Trước bản vá, các đường đổi
// chủ nhiệm chỉ ghi một chiều, nên có thể còn tồn đọng hai kiểu lệch:
//
//   1. Giáo viên còn gắn với một lớp mà lớp đó đã có chủ nhiệm khác — cô cũ vẫn
//      đọc và ghi được hồ sơ cả lớp cũ. Đây là kiểu nguy hiểm.
//   2. Lớp ghi tên một cô, nhưng cô không hề gắn với lớp — cô đăng nhập vào thấy
//      "Sĩ số 0" dù màn hình quản trị hiện đúng tên.
//
// Bản vá đã chặn không cho sinh thêm lệch mới. Script này dọn phần đã lỡ sinh ra.
// Mặc định CHỈ XEM; phải thêm --sua mới ghi. Nên chạy `npm run backup` trước khi
// thêm --sua.
'use strict';

const db = require('../lib/db');

const SUA = process.argv.includes('--sua');

const giaoVien = db.all('users', `SELECT id, name, title, classId FROM users WHERE role = 'teacher'`);
const lopHoc = db.all('classes', 'SELECT id, name, teacherId FROM classes');
const lopTheoId = new Map(lopHoc.map(c => [c.id, c]));
const tenGv = (id) => {
  const t = giaoVien.find(g => g.id === id);
  return t ? `${t.title} ${t.name}` : id;
};

// Kiểu 1: giáo viên gắn với lớp mà lớp đó không nhận cô làm chủ nhiệm.
const thuaQuyen = giaoVien.filter(t => {
  if (!t.classId) return false;
  const c = lopTheoId.get(t.classId);
  return !c || c.teacherId !== t.id;
});

// Kiểu 2: lớp ghi tên một cô nhưng cô không gắn với lớp đó.
const thieuGan = lopHoc.filter(c => {
  if (!c.teacherId) return false;
  const t = giaoVien.find(g => g.id === c.teacherId);
  return !t || t.classId !== c.id;
});

console.log(`\nRÀ QUAN HỆ GIÁO VIÊN CHỦ NHIỆM — ${db.DATA_DIR}`);
console.log(`${giaoVien.length} giáo viên, ${lopHoc.length} lớp\n`);

if (!thuaQuyen.length && !thieuGan.length) {
  console.log('  ✓ Không có chỗ nào lệch. Không cần làm gì.\n');
  db.close();
  process.exit(0);
}

if (thuaQuyen.length) {
  console.log(`  ✗ ${thuaQuyen.length} giáo viên đang GIỮ THỪA QUYỀN với lớp không còn chủ nhiệm:`);
  for (const t of thuaQuyen) {
    const c = lopTheoId.get(t.classId);
    const chuMoi = c && c.teacherId ? tenGv(c.teacherId) : '(lớp chưa có chủ nhiệm)';
    console.log(`      ${t.title} ${t.name} — còn gắn với ${c ? c.name : t.classId}, `
      + `mà lớp đó nay là của ${chuMoi}`);
  }
  console.log('      → Sẽ gỡ gắn kết của các cô này (không đụng tới tài khoản hay dữ liệu lớp).\n');
}

if (thieuGan.length) {
  console.log(`  ✗ ${thieuGan.length} lớp ghi tên chủ nhiệm nhưng cô KHÔNG nhận được lớp:`);
  for (const c of thieuGan) {
    console.log(`      ${c.name} — ghi là của ${tenGv(c.teacherId)}, nhưng cô đăng nhập vào thấy "Sĩ số 0"`);
  }
  console.log('      → Sẽ gắn cô vào đúng lớp mà màn hình quản trị đang hiện.\n');
}

if (!SUA) {
  console.log('Đang ở chế độ CHỈ XEM, chưa ghi gì.');
  console.log('Muốn sửa thật: chạy `npm run backup` trước, rồi thêm -- --sua vào cuối lệnh.\n');
  db.close();
  process.exit(1);
}

db.tx(() => {
  for (const t of thuaQuyen) db.update('users', t.id, { classId: null });
  for (const c of thieuGan) {
    // Gỡ những cô khác đang gắn nhầm vào lớp này trước, rồi mới gắn đúng cô.
    for (const t of giaoVien) {
      if (t.classId === c.id && t.id !== c.teacherId) db.update('users', t.id, { classId: null });
    }
    if (giaoVien.some(g => g.id === c.teacherId)) db.update('users', c.teacherId, { classId: c.id });
  }
});

db.audit(null, 'sua-quyen-chu-nhiem', null, {
  goQuyen: thuaQuyen.length, ganLai: thieuGan.length,
});
console.log(`Đã sửa: gỡ ${thuaQuyen.length} gắn kết thừa, gắn lại ${thieuGan.length} lớp.`);
console.log('Các cô bị gỡ nay không còn lớp — hãy vào Quản trị phân công lại nếu cần.\n');
db.close();
