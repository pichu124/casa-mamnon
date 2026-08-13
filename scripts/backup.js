#!/usr/bin/env node
// Sao lưu cơ sở dữ liệu và ảnh album.
//
//     node scripts/backup.js                 sao lưu vào DATA_DIR/backups
//     node scripts/backup.js --out /mnt/usb  sao lưu vào nơi khác
//     node scripts/backup.js --list          xem các bản đã có
//
// Dùng lệnh .backup của SQLite nên an toàn tuyệt đối ngay cả khi máy chủ đang
// chạy và có người đang ghi dữ liệu — khác hẳn việc chép tệp trực tiếp, vốn có
// thể tạo ra bản sao hỏng không khôi phục được.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'school.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const BACKUP_DIR = outIdx >= 0 && args[outIdx + 1]
  ? path.resolve(args[outIdx + 1])
  : path.join(DATA_DIR, 'backups');

// Vòng đời bản sao: giữ 7 bản gần nhất theo ngày, 4 bản theo tuần, 12 theo tháng.
const GIU_NGAY = 7, GIU_TUAN = 4, GIU_THANG = 12;

function stamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function mb(bytes) { return (bytes / 1024 / 1024).toFixed(1) + ' MB'; }

function danhSach() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => /^school-\d{8}-\d{4}\.db\.gz$/.test(f))
    .sort()
    .reverse()
    .map(f => {
      const st = fs.statSync(path.join(BACKUP_DIR, f));
      return { file: f, size: st.size, at: st.mtime };
    });
}

if (args.includes('--list')) {
  const list = danhSach();
  if (!list.length) {
    console.log(`Chưa có bản sao lưu nào trong ${BACKUP_DIR}`);
  } else {
    console.log(`Các bản sao lưu trong ${BACKUP_DIR}:\n`);
    for (const b of list) {
      console.log(`  ${b.file}   ${mb(b.size).padStart(9)}   ${b.at.toLocaleString('vi-VN')}`);
    }
    console.log(`\nTổng cộng ${list.length} bản.`);
  }
  process.exit(0);
}

if (!fs.existsSync(DB_FILE)) {
  console.error(`Không tìm thấy cơ sở dữ liệu: ${DB_FILE}`);
  process.exit(1);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ---- 1. Sao lưu cơ sở dữ liệu ----
const ten = `school-${stamp()}.db`;
const tmp = path.join(BACKUP_DIR, ten);
const dich = `${tmp}.gz`;

console.log('Đang sao lưu cơ sở dữ liệu...');
// Mở chỉ đọc để tuyệt đối không đụng vào dữ liệu đang chạy. Lệnh backup của
// SQLite tự đọc cả phần dữ liệu còn nằm trong nhật ký WAL, nên bản sao luôn
// đầy đủ và nhất quán mà không cần gộp WAL trước.
const db = new Database(DB_FILE, { readonly: true });
db.backup(tmp).then(() => {
  db.close();

  // Nén lại cho gọn: dữ liệu chữ nghĩa nén rất tốt, thường còn 1/5.
  const raw = fs.readFileSync(tmp);
  fs.writeFileSync(dich, zlib.gzipSync(raw, { level: 9 }));
  fs.unlinkSync(tmp);

  console.log(`  ${path.basename(dich)}  ${mb(fs.statSync(dich).size)} (gốc ${mb(raw.length)})`);

  // ---- 2. Sao lưu ảnh album ----
  // Ảnh không bao giờ đổi nội dung nên chỉ cần chép tệp mới, không chép lại từ đầu.
  if (fs.existsSync(UPLOAD_DIR)) {
    const anhDir = path.join(BACKUP_DIR, 'uploads');
    fs.mkdirSync(anhDir, { recursive: true });
    let moi = 0, tongCu = 0;
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      const src = path.join(UPLOAD_DIR, f);
      const dst = path.join(anhDir, f);
      if (fs.existsSync(dst)) { tongCu++; continue; }
      fs.copyFileSync(src, dst);
      moi++;
    }
    console.log(`  Ảnh album: thêm ${moi} tệp mới, đã có sẵn ${tongCu} tệp`);
  }

  // ---- 3. Dọn bản cũ theo vòng đời ----
  const list = danhSach();
  const giu = new Set();
  const theoNgay = new Map(), theoTuan = new Map(), theoThang = new Map();

  for (const b of list) {
    const d = b.at;
    const khoaNgay = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const khoaThang = `${d.getFullYear()}-${d.getMonth()}`;
    const tuan = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / (7 * 86400000));
    const khoaTuan = `${d.getFullYear()}-${tuan}`;
    if (!theoNgay.has(khoaNgay)) theoNgay.set(khoaNgay, b.file);
    if (!theoTuan.has(khoaTuan)) theoTuan.set(khoaTuan, b.file);
    if (!theoThang.has(khoaThang)) theoThang.set(khoaThang, b.file);
  }
  [...theoNgay.values()].slice(0, GIU_NGAY).forEach(f => giu.add(f));
  [...theoTuan.values()].slice(0, GIU_TUAN).forEach(f => giu.add(f));
  [...theoThang.values()].slice(0, GIU_THANG).forEach(f => giu.add(f));

  const xoa = list.filter(b => !giu.has(b.file));
  for (const b of xoa) fs.unlinkSync(path.join(BACKUP_DIR, b.file));
  if (xoa.length) console.log(`  Đã dọn ${xoa.length} bản sao lưu cũ`);

  console.log(`\nHoàn tất. Giữ lại ${giu.size} bản trong ${BACKUP_DIR}`);
  console.log('Nhớ đồng bộ thư mục này ra một nơi lưu trữ khác — bản sao nằm cùng');
  console.log('máy với dữ liệu gốc sẽ mất cùng nhau khi ổ cứng hỏng.');
}).catch(err => {
  console.error(`Sao lưu thất bại: ${err.message}`);
  try { fs.unlinkSync(tmp); } catch (_) {}
  process.exit(1);
});
