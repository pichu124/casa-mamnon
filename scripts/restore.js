#!/usr/bin/env node
// Khôi phục cơ sở dữ liệu từ một bản sao lưu.
//
//     node scripts/restore.js                        khôi phục bản mới nhất
//     node scripts/restore.js school-20260812-0200.db.gz
//     node scripts/restore.js --kiem-tra             chỉ kiểm tra bản sao còn tốt không
//
// LƯU Ý: dừng máy chủ trước khi khôi phục. Dữ liệu hiện tại sẽ được đổi tên giữ
// lại chứ không bị xóa, nên nếu khôi phục nhầm vẫn quay lại được.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'school.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const args = process.argv.slice(2);
const chiKiemTra = args.includes('--kiem-tra');
const chiDinh = args.find(a => !a.startsWith('--'));

function banMoiNhat() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const list = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^school-\d{8}-\d{4}\.db\.gz$/.test(f))
    .sort();
  return list.length ? list[list.length - 1] : null;
}

const ten = chiDinh || banMoiNhat();
if (!ten) {
  console.error(`Không tìm thấy bản sao lưu nào trong ${BACKUP_DIR}`);
  console.error('Chạy "npm run backup" để tạo bản sao lưu đầu tiên.');
  process.exit(1);
}

const nguon = path.isAbsolute(ten) ? ten : path.join(BACKUP_DIR, ten);
if (!fs.existsSync(nguon)) {
  console.error(`Không tìm thấy tệp: ${nguon}`);
  process.exit(1);
}

console.log(`Bản sao lưu: ${path.basename(nguon)}`);

// Giải nén ra tệp tạm rồi kiểm tra tính toàn vẹn trước khi dùng.
const tmp = path.join(DATA_DIR, `.khoi-phuc-${Date.now()}.db`);
fs.writeFileSync(tmp, zlib.gunzipSync(fs.readFileSync(nguon)));

let thongKe;
try {
  const db = new Database(tmp, { readonly: true });
  const kq = db.pragma('integrity_check');
  const ok = kq.length === 1 && kq[0].integrity_check === 'ok';
  if (!ok) throw new Error('Cơ sở dữ liệu trong bản sao lưu bị hỏng');
  thongKe = {
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    students: db.prepare('SELECT COUNT(*) c FROM students').get().c,
    attendance: db.prepare('SELECT COUNT(*) c FROM attendance').get().c,
    messages: db.prepare('SELECT COUNT(*) c FROM messages').get().c,
  };
  db.close();
} catch (err) {
  fs.unlinkSync(tmp);
  console.error(`Bản sao lưu KHÔNG dùng được: ${err.message}`);
  process.exit(1);
}

console.log('Kiểm tra toàn vẹn: đạt');
console.log(`  ${thongKe.users} người dùng · ${thongKe.students} bé · ` +
  `${thongKe.attendance} lượt điểm danh · ${thongKe.messages} tin nhắn`);

if (chiKiemTra) {
  fs.unlinkSync(tmp);
  console.log('\nChỉ kiểm tra, không thay đổi dữ liệu hiện tại.');
  console.log('Nên chạy lệnh kiểm tra này mỗi quý để chắc chắn bản sao lưu dùng được.');
  process.exit(0);
}

// Giữ lại dữ liệu hiện tại phòng khi khôi phục nhầm.
if (fs.existsSync(DB_FILE)) {
  const luu = `${DB_FILE}.truoc-khi-khoi-phuc-${Date.now()}`;
  fs.renameSync(DB_FILE, luu);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(DB_FILE + ext)) fs.unlinkSync(DB_FILE + ext);
  }
  console.log(`\nDữ liệu cũ được giữ lại tại: ${path.basename(luu)}`);
}

fs.renameSync(tmp, DB_FILE);

// Khôi phục ảnh album nếu bản sao lưu có kèm.
const anhBackup = path.join(BACKUP_DIR, 'uploads');
const anhDich = path.join(DATA_DIR, 'uploads');
if (fs.existsSync(anhBackup)) {
  fs.mkdirSync(anhDich, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(anhBackup)) {
    const dst = path.join(anhDich, f);
    if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(anhBackup, f), dst); n++; }
  }
  if (n) console.log(`Khôi phục thêm ${n} ảnh album`);
}

console.log('\nĐã khôi phục xong. Khởi động lại máy chủ và kiểm tra dữ liệu.');
