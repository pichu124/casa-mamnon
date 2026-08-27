#!/usr/bin/env node
// Khôi phục cơ sở dữ liệu từ một bản sao lưu.
//
//     node scripts/restore.js                        khôi phục bản mới nhất
//     node scripts/restore.js school-20260812-0200.db.gz
//     node scripts/restore.js --kiem-tra             chỉ kiểm tra bản sao còn tốt không
//
// LƯU Ý: dừng máy chủ trước khi khôi phục. Dữ liệu hiện tại sẽ được đổi tên giữ
// lại chứ không bị xóa, nên nếu khôi phục nhầm vẫn quay lại được.
//
// Script này TỰ KIỂM TRA xem có ai đang mở cơ sở dữ liệu hay không, và từ chối
// nếu có — xem `mayChuDangMoCSDL()` bên dưới để biết vì sao đó là chuyện sống còn.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'school.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// ---------------------------------------------------------------------------
// Có ai đang mở cơ sở dữ liệu không?
//
// VÌ SAO PHẢI HỎI CÂU NÀY TRƯỚC KHI ĐỘNG VÀO TỆP
//
// Khôi phục trong lúc máy chủ đang chạy là kịch bản mất dữ liệu tệ nhất mà
// script này có thể gây ra, và nó KHÔNG báo lỗi lúc xảy ra:
//
//   1. `fs.renameSync(DB_FILE, ...)` chỉ đổi tên trong thư mục. Máy chủ đang
//      chạy vẫn giữ nguyên file descriptor cũ và tiếp tục ghi vào tệp đã đổi
//      tên — mọi thứ cô giáo nhập từ lúc đó trở đi đi vào một tệp mà không ai
//      còn nhìn tới.
//   2. `fs.unlinkSync(DB_FILE + '-wal')` xóa nhật ký ghi NGAY DƯỚI CHÂN một
//      kết nối đang mở. Với WAL đang hoạt động, đây là đường thẳng tới cơ sở
//      dữ liệu hỏng: phần đã ghi vào WAL mà chưa checkpoint thì mất hẳn.
//   3. Máy chủ vẫn trả lời bình thường, vẫn hiện dữ liệu cũ trong bộ nhớ. Người
//      khôi phục thấy "Đã khôi phục xong", mở app lên thấy chạy, và tưởng là ổn.
//
// Hỏng kiểu này chỉ lộ ra sau khi khởi động lại — thường là hôm sau.
//
// CÁCH HỎI
//
// SQLite trả lời hộ. Đặt `locking_mode = EXCLUSIVE` rồi mở một giao dịch ghi:
// nếu còn kết nối nào khác đang mở cơ sở dữ liệu này — kể cả một kết nối đang
// nằm không — SQLite trả về SQLITE_BUSY. Khóa được giải phóng khi tiến trình
// chết, nên không có chuyện khóa cũ còn sót lại chặn nhầm.
function mayChuDangMoCSDL() {
  if (!fs.existsSync(DB_FILE)) return false;
  let db;
  try {
    db = new Database(DB_FILE);
    db.pragma('locking_mode = EXCLUSIVE');
    db.exec('BEGIN IMMEDIATE; ROLLBACK;');
    return false;
  } catch (err) {
    // CHỈ SQLITE_BUSY mới là "có người đang giữ". Tệp hỏng hay không đọc được
    // thì để phần sau xử lý — khôi phục chính là cách chữa một tệp hỏng, chặn
    // ở đây là chặn đúng lúc người ta cần script này nhất.
    return (err.code || '').startsWith('SQLITE_BUSY');
  } finally {
    try { if (db) db.close(); } catch { /* đóng không được thì thôi */ }
  }
}

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

// Dọn một tệp cơ sở dữ liệu KÈM hai tệp đi cùng của SQLite.
//
// Mở một tệp .db ở chế độ WAL — kể cả chỉ để đọc — là SQLite sinh thêm `-wal`
// và `-shm` bên cạnh. Bản trước chỉ `unlinkSync(tmp)`, tức xóa đúng một trong
// ba tệp, nên mỗi lần chạy `npm run restore:check` lại bỏ lại hai tệp
// `.khoi-phuc-*.db-wal` và `.khoi-phuc-*.db-shm` trong thư mục dữ liệu của
// trường. Chúng nằm đó mãi, và còn khớp đúng mẫu mà bộ canh dữ liệu coi là
// "bản lưu trước khi khôi phục" — rác tự sinh ở đúng chỗ không nên có rác.
function donTam(duong) {
  for (const hau of ['', '-wal', '-shm']) {
    try { fs.rmSync(duong + hau, { force: true }); } catch { /* xóa không được thì thôi */ }
  }
}

// Giải nén ra tệp tạm rồi kiểm tra tính toàn vẹn trước khi dùng.
const tmp = path.join(DATA_DIR, `.khoi-phuc-${Date.now()}.db`);
fs.writeFileSync(tmp, zlib.gunzipSync(fs.readFileSync(nguon)));

let thongKe;
try {
  const db = new Database(tmp, { readonly: true });
  const kq = db.pragma('integrity_check');
  const ok = kq.length === 1 && kq[0].integrity_check === 'ok';
  if (!ok) throw new Error('Cơ sở dữ liệu trong bản sao lưu bị hỏng');
  // Đếm cả PHÂN CÔNG CÔ, không chỉ người và bé.
  //
  // Một bản sao lưu mất sạch `class_teachers` vẫn qua được `integrity_check` —
  // tệp không hỏng, chỉ thiếu một bảng nội dung. Khôi phục xong thì phụ huynh
  // vẫn thấy con bình thường, còn CẢ BA CÔ đăng nhập vào thấy "Nhóm chưa có bé
  // nào". Không ai báo động, vì phía phụ huynh — phía đông người hơn — trông
  // vẫn đúng. Con số này đưa nó ra ánh sáng trước khi người ta bấm khôi phục.
  const dem = (sql) => { try { return db.prepare(sql).get().c; } catch { return null; } };
  thongKe = {
    users: dem('SELECT COUNT(*) c FROM users'),
    students: dem('SELECT COUNT(*) c FROM students'),
    attendance: dem('SELECT COUNT(*) c FROM attendance'),
    messages: dem('SELECT COUNT(*) c FROM messages'),
    classes: dem('SELECT COUNT(*) c FROM classes WHERE active = 1'),
    phanCong: dem('SELECT COUNT(*) c FROM class_teachers'),
  };
  db.close();
} catch (err) {
  donTam(tmp);
  console.error(`Bản sao lưu KHÔNG dùng được: ${err.message}`);
  process.exit(1);
}

// Đã đọc xong và đã đóng kết nối: dọn ngay `-wal`/`-shm` của tệp tạm, để phần
// còn lại của script chỉ phải nghĩ về đúng một tệp.
for (const hau of ['-wal', '-shm']) {
  try { fs.rmSync(tmp + hau, { force: true }); } catch { /* xóa không được thì thôi */ }
}

console.log('Kiểm tra toàn vẹn: đạt');
console.log(`  ${thongKe.users} người dùng · ${thongKe.students} bé · ` +
  `${thongKe.attendance} lượt điểm danh · ${thongKe.messages} tin nhắn`);
console.log(`  ${thongKe.classes} nhóm lớp đang mở · ` +
  `${thongKe.phanCong == null ? 'KHÔNG CÓ BẢNG phân công cô' : `${thongKe.phanCong} phân công cô`}`);

// Nhóm có, cô có, mà không dòng phân công nào: đây là bản sao lưu sẽ khôi phục
// thành một trường mà không cô nào mở được nhóm của mình.
if (thongKe.classes > 0 && !thongKe.phanCong) {
  console.warn(`
⚠️  BẢN SAO LƯU NÀY KHÔNG CÓ PHÂN CÔNG CÔ NÀO.

   Tệp không hỏng — nó qua được kiểm tra toàn vẹn. Nhưng khôi phục từ đây xong
   thì MỌI CÔ đăng nhập vào đều thấy "Nhóm chưa có bé nào": không điểm danh,
   không nhận xét, không nhắn tin với gia đình được.

   Phía phụ huynh vẫn trông bình thường, nên rất dễ không ai báo động ngay.

   Nếu trường đang có phân công thật, hãy chọn một bản sao lưu khác. Nếu vẫn
   khôi phục từ bản này, sau đó chạy:

     npm run sua-quyen-chu-nhiem            # xem trước, không sửa gì
     npm run sua-quyen-chu-nhiem -- --sua   # dựng lại phân công
`);
}

if (chiKiemTra) {
  donTam(tmp);
  console.log('\nChỉ kiểm tra, không thay đổi dữ liệu hiện tại.');
  console.log('Nên chạy lệnh kiểm tra này mỗi quý để chắc chắn bản sao lưu dùng được.');
  process.exit(0);
}

// Từ đây trở xuống là phần ĐỘNG VÀO tệp thật. Hỏi trước khi động.
if (mayChuDangMoCSDL()) {
  donTam(tmp);
  console.error(`
✗ KHÔNG khôi phục được: đang có tiến trình khác mở cơ sở dữ liệu này.

    ${DB_FILE}

  Nhiều khả năng máy chủ vẫn đang chạy. Khôi phục lúc này KHÔNG báo lỗi, nhưng:

    • Máy chủ vẫn giữ tệp cũ đang mở và tiếp tục ghi vào đó. Mọi thứ cô giáo
      nhập từ giờ trở đi rơi vào một tệp không ai còn nhìn tới.
    • Nhật ký ghi (-wal) bị xóa ngay dưới chân một kết nối đang mở — phần chưa
      kịp lưu xuống thì mất hẳn.
    • Màn hình vẫn hiện dữ liệu cũ trong bộ nhớ, nên nhìn thì tưởng là ổn.

  Hỏng kiểu này thường chỉ lộ ra sau khi khởi động lại, tức là hôm sau.

  Dừng máy chủ rồi chạy lại lệnh này:

    sudo systemctl stop casa-mamnon      # nếu chạy bằng systemd
    docker compose stop                  # nếu chạy bằng Docker
    pm2 stop casa-mamnon                 # nếu chạy bằng pm2

  Nếu chắc chắn máy chủ đã dừng mà vẫn báo dòng này, hãy tìm xem còn tiến
  trình nào đang giữ tệp:

    fuser -v ${DB_FILE}
`);
  process.exit(1);
}

// Giữ lại dữ liệu hiện tại phòng khi khôi phục nhầm.
if (fs.existsSync(DB_FILE)) {
  // GỘP NHẬT KÝ GHI VÀO TỆP CHÍNH TRƯỚC KHI ĐỔI TÊN.
  //
  // Ở chế độ WAL, phần vừa ghi gần nhất nằm trong `school.db-wal` chứ chưa nằm
  // trong `school.db`. Bản trước đổi tên tệp chính rồi XÓA `-wal` — nghĩa là
  // tệp "giữ lại phòng khi khôi phục nhầm" mất đúng phần mới nhất, lặng lẽ.
  // Máy chủ vừa bị tắt đột ngột (mất điện, OOM) là kịch bản hay gặp nhất khi
  // người ta phải chạy lệnh khôi phục, và cũng chính là kịch bản để lại nhiều
  // dữ liệu chưa gộp nhất trong `-wal`.
  //
  // Tới đây đã chắc chắn không còn ai mở cơ sở dữ liệu, nên checkpoint an toàn.
  try {
    const cu = new Database(DB_FILE);
    cu.pragma('wal_checkpoint(TRUNCATE)');
    cu.close();
  } catch (err) {
    // Tệp cũ hỏng tới mức không mở được thì thôi — vẫn giữ nguyên nó lại, còn
    // hơn dừng cả việc khôi phục. Nhưng phải NÓI RA, đừng nuốt lặng.
    console.warn(`\n⚠️  Không gộp được nhật ký ghi của dữ liệu cũ: ${err.message}`);
    console.warn('   Bản giữ lại có thể thiếu phần ghi gần nhất.');
  }

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
