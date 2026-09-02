#!/usr/bin/env node
// Chuyển dữ liệu từ kho JSON đời cũ (data/db.json) sang cơ sở dữ liệu SQLite.
//
// Chạy một lần khi nâng cấp máy chủ đang vận hành:
//     node scripts/migrate-json-to-sqlite.js
//
// Script này an toàn để chạy lại: nó luôn ghi đè toàn bộ nội dung cơ sở dữ liệu
// bằng dữ liệu trong tệp JSON, và giữ lại bản gốc thay vì xóa đi.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const JSON_PATH = path.join(DATA_DIR, 'db.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');

if (!fs.existsSync(JSON_PATH)) {
  console.error(`Không tìm thấy tệp dữ liệu cũ: ${JSON_PATH}`);
  console.error('Nếu đây là cài đặt mới thì không cần chuyển đổi — chạy "npm run seed".');
  process.exit(1);
}

const db = require('../lib/db');
const { importSnapshot } = require('../lib/importer');

console.log(`Đọc dữ liệu cũ: ${JSON_PATH}`);
let snap;
try {
  snap = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
} catch (err) {
  console.error(`Tệp dữ liệu cũ bị hỏng, không đọc được: ${err.message}`);
  process.exit(1);
}

// CƠ SỞ DỮ LIỆU ĐANG CÓ DỮ LIỆU THÌ DỪNG LẠI HỎI, KHÔNG GHI ĐÈ IM LẶNG.
//
// Script này là đường một chiều của app 1 đời cũ — app 2 không bao giờ chạy
// nó — nhưng nó vẫn nằm trong kho, vẫn gõ được, và bản cũ ghi đè TOÀN BỘ cơ
// sở dữ liệu hiện có không một câu hỏi. Một lệnh gõ nhầm trên máy chủ thật là
// mất sạch, cùng cái hố với `npm run seed --force` đã lấp ở Đ117g.
if (!db.isEmpty() && !process.argv.includes('--force')) {
  console.error('Cơ sở dữ liệu đang CÓ DỮ LIỆU — chuyển đổi sẽ GHI ĐÈ toàn bộ.');
  console.error('Nếu đúng là muốn vậy: chạy `npm run backup` trước, rồi thêm --force:');
  console.error('  node scripts/migrate-json-to-sqlite.js --force');
  process.exit(1);
}

// Mật khẩu đời cũ có thể còn ở dạng đọc được — băm lại trong lúc chuyển.
const password = require('../lib/password');
let rehashed = 0;
for (const u of snap.users || []) {
  if (u.password && !u.passwordHash) {
    u.passwordHash = password.hash(u.password);
    rehashed++;
  }
  delete u.password;
}

const stats = importSnapshot(snap);

// Chuyển luôn phiên đăng nhập để không ai bị đăng xuất khi nâng cấp.
let sessions = 0;
if (fs.existsSync(SESSIONS_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf8'));
    const valid = new Set(db.all('users', 'SELECT id FROM users').map(u => u.id));
    db.tx(() => {
      for (const [token, s] of Object.entries(raw)) {
        if (s && valid.has(s.userId)) {
          db.run('INSERT OR REPLACE INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)',
            [token, s.userId, s.createdAt || Date.now()]);
          sessions++;
        }
      }
    });
  } catch (_) { /* tệp phiên hỏng thì bỏ qua, người dùng chỉ cần đăng nhập lại */ }
}

console.log('\nĐã chuyển sang cơ sở dữ liệu:');
const nhan = {
  classes: 'nhóm lớp', users: 'người dùng', students: 'bé',
  student_parents: 'liên kết bé–phụ huynh', attendance: 'lượt điểm danh',
  leave_requests: 'đơn xin phép', remarks: 'nhận xét', reports: 'báo cáo học tập',
  conduct: 'ghi nhận nề nếp', health: 'hồ sơ y tế', medicine_requests: 'đơn dặn thuốc',
  menus: 'thực đơn', timetable: 'lịch sinh hoạt', edu_plans: 'kế hoạch giáo dục',
  bus_routes: 'tuyến xe', surveys: 'khảo sát', survey_responses: 'lượt trả lời khảo sát',
  albums: 'album', album_photos: 'ảnh', notifications: 'thông báo',
  conversations: 'hội thoại', messages: 'tin nhắn',
};
let tong = 0;
for (const [k, v] of Object.entries(stats)) {
  console.log(`  ${String(v).padStart(7)}  ${nhan[k] || k}`);
  tong += v;
}
console.log(`  ${String(tong).padStart(7)}  TỔNG CỘNG`);
if (rehashed) console.log(`\n  Đã băm lại ${rehashed} mật khẩu còn lưu ở dạng đọc được.`);
if (sessions) console.log(`  Giữ lại ${sessions} phiên đăng nhập — không ai phải đăng nhập lại.`);

// Giữ bản gốc lại phòng khi cần đối chiếu.
const backup = `${JSON_PATH}.truoc-khi-chuyen`;
fs.renameSync(JSON_PATH, backup);
if (fs.existsSync(SESSIONS_PATH)) fs.renameSync(SESSIONS_PATH, `${SESSIONS_PATH}.truoc-khi-chuyen`);

console.log(`\nCơ sở dữ liệu mới: ${db.DB_FILE}`);
console.log(`Tệp cũ được giữ lại tại: ${backup}`);
console.log('\nHãy khởi động máy chủ và kiểm tra dữ liệu trước khi xóa tệp cũ.');

db.close();
