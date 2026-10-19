#!/usr/bin/env node
// Khôi phục cơ sở dữ liệu từ một bản sao lưu.
//
//     node scripts/restore.js                        khôi phục bản mới nhất
//     node scripts/restore.js school-20260812-0200.db.gz
//     node scripts/restore.js --kiem-tra             chỉ kiểm tra bản sao còn tốt không
//     node scripts/restore.js /mnt/usb/casa/school-20270115-0200.db.gz
//                                                    khôi phục từ bản sao ở ổ ngoài
//     node scripts/restore.js <tệp> --anh <thư mục>  khi ảnh cất tách khỏi tệp .db.gz
//
// LƯU Ý: dừng máy chủ trước khi khôi phục. Dữ liệu hiện tại sẽ được đổi tên giữ
// lại chứ không bị xóa, nên nếu khôi phục nhầm vẫn quay lại được.
//
// Script này TỰ KIỂM TRA xem có ai đang mở cơ sở dữ liệu hay không, và từ chối
// nếu có — xem `mayChuDangMoCSDL()` bên dưới để biết vì sao đó là chuyện sống còn.
// Dòng đầu tiên: thiếu DATA_DIR trên máy chủ thật thì dừng ngay (Đ234).
require('./canh-thu-muc-du-lieu')();
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

// `--anh <thư mục>` cho ca hiếm: ảnh được cất tách khỏi tệp `.db.gz`. Mặc định
// thì không cần cờ này — ảnh được tìm ngay cạnh tệp bản sao.
//
// Nhận cả hai dạng `--anh X` và `--anh=X`, và phải LOẠI giá trị đó ra khỏi chỗ
// tìm tên tệp bản sao: `args.find(a => !a.startsWith('--'))` mà gặp
// `--anh /mnt/x school.db.gz` sẽ tưởng `/mnt/x` là tệp bản sao.
let coCoAnh = null;
const daDung = new Set();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--anh=')) { coCoAnh = a.slice(6); daDung.add(i); continue; }
  if (a === '--anh' && args[i + 1] !== undefined) {
    coCoAnh = args[i + 1]; daDung.add(i); daDung.add(i + 1); i++;
  }
}
const chiDinh = args.find((a, i) => !a.startsWith('--') && !daDung.has(i));

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
    try { fs.rmSync(duong + hau, { force: true }); } catch (e) { console.error(`[CHAN-DOAN] donTam ${duong + hau}: ${e.code} ${e.message}`); }
    if (fs.existsSync(duong + hau)) console.error(`[CHAN-DOAN] donTam con sot ${duong + hau}`);
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
    // Số tệp ảnh mà CƠ SỞ DỮ LIỆU đang trỏ tới. Xem chú thích ở phần in ra.
    anhTrongCsdl:
      (dem("SELECT COUNT(*) c FROM album_photos WHERE file IS NOT NULL AND file != ''") || 0)
      + (dem("SELECT COUNT(*) c FROM attendance_photo WHERE file IS NOT NULL AND file != ''") || 0)
      + (dem("SELECT COUNT(*) c FROM dontra_nguoi WHERE anh IS NOT NULL AND anh != ''") || 0),
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

// ẢNH CŨNG PHẢI ĐƯỢC SOÁT, KHÔNG CHỈ TỆP .db.gz.
//
// `restore:check` trước đây không nói MỘT CHỮ nào về ảnh. Nó giải nén tệp
// `.db.gz`, đếm người và bé, rồi in "bản sao lưu dùng được". Mà một nửa thứ
// trường sẽ tiếc nhất khi mất lại nằm ngoài tệp đó: ảnh khuôn mặt trẻ, ảnh
// điểm danh cô chụp mỗi sáng, ảnh người được đón.
//
// Chỗ này nguy hơn một lỗ bình thường, vì `scripts/kiem-tra-may-chu.js` đọc
// kết quả của chính lệnh này rồi kết luận "bản sao dùng được thật". Một thư
// mục `uploads/` trống — sao lưu bằng `rsync` quên thư mục ảnh, chép bản sao
// đi mà chỉ chép mỗi tệp `.db.gz`, hay `--out` trỏ sang ổ khác — vẫn cho ra
// đúng câu trấn an ấy. Người vận hành đóng máy về nhà, tin rằng ảnh của trẻ
// đang được giữ.
//
// Nên đếm cả hai bên và ĐỐI CHIẾU: cơ sở dữ liệu đang trỏ tới bao nhiêu tệp
// ảnh, và thư mục ảnh đi kèm bản sao có bao nhiêu tệp thật.
{
  const thuMucAnh = coCoAnh ? path.resolve(coCoAnh) : path.join(path.dirname(nguon), 'uploads');
  let soTep = null;
  try {
    if (fs.existsSync(thuMucAnh)) {
      soTep = fs.readdirSync(thuMucAnh)
        .filter(f => fs.statSync(path.join(thuMucAnh, f)).isFile()).length;
    }
  } catch { /* đọc không được thì coi như không có, cảnh báo bên dưới lo */ }

  const canCo = thongKe.anhTrongCsdl || 0;
  if (soTep === null) {
    console.log(`  ẢNH: không thấy thư mục ${thuMucAnh}`);
  } else {
    console.log(`  ẢNH: ${soTep} tệp trong ${thuMucAnh} · cơ sở dữ liệu đang trỏ tới ${canCo} ảnh`);
  }

  if (canCo > 0 && !soTep) {
    console.warn(`
⚠️  BẢN SAO LƯU NÀY KHÔNG KÈM MỘT TẤM ẢNH NÀO.

   Cơ sở dữ liệu trong bản sao đang trỏ tới ${canCo} tệp ảnh — ảnh album, ảnh
   điểm danh, ảnh người được đón — nhưng thư mục ảnh đi kèm thì trống hoặc
   không có:

     ${thuMucAnh}

   Khôi phục từ đây xong, app vẫn chạy và vẫn đăng nhập được, nhưng MỌI ẢNH
   đều hiện ra là ô vỡ. Ảnh không nằm trong tệp .db.gz, nên không có cách nào
   lấy lại từ bản sao này.

   Thường là do lượt chép bản sao đi chỉ chép mỗi tệp .db.gz. Hãy chép cả thư
   mục 'uploads' nằm cạnh nó, hoặc chạy lại kèm:  --anh <thư mục uploads>
`);
  }
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

// Khôi phục ảnh nếu bản sao lưu có kèm.
//
// Ảnh khuôn mặt trẻ, ảnh người được uỷ quyền đón, ảnh Ghi nhanh nằm NGOÀI cơ sở
// dữ liệu. Đây là thứ duy nhất trong cả app không dựng lại được nếu mất.
//
// KHÔNG ĐÈ LÊN TỆP ĐANG CÓ. Tên tệp ảnh là 16 byte ngẫu nhiên (lib/uploads.js),
// nên trùng tên nghĩa là trùng đúng tấm ảnh đó — mà bản trên đĩa có thể mới hơn
// bản sao. Đè xuống là lấy bản cũ ghi chồng lên bản mới, mất luôn.
//
// NHƯNG PHẢI NÓI RA khi tệp trên đĩa KHÁC dung lượng với bản trong bản sao.
// Người đang chạy lệnh này là người vừa nghi dữ liệu hỏng; im lặng bỏ qua một
// tấm ảnh cụt là để họ tin rằng đã chữa xong trong khi chưa. Việc quyết định
// lấy bản nào là của họ, không phải của script — script chỉ có nhiệm vụ đừng
// giấu.
// ĐI TÌM THEO TỆP BẢN SAO, KHÔNG ĐI TÌM THEO `DATA_DIR`.
//
// `backup.js` khuyên chạy thêm một lần ra ổ ngoài (`--out /mnt/...`), và cả
// `docs/TRIEN-KHAI.md` lẫn `docs/SAO-LUU.md` đều dạy như vậy. Nhưng đường khôi
// phục lại đóng cứng thư mục ảnh vào `DATA_DIR/backups`. Khôi phục từ ổ ngoài —
// đúng kịch bản "ổ VPS hỏng" mà bản sao ra ổ ngoài sinh ra để cứu — thì
// `fs.existsSync` trả false, cả khối này bị bỏ qua, KHÔNG chép tấm ảnh nào,
// KHÔNG in một chữ nào, rồi vẫn in "Đã khôi phục xong".
//
// Ảnh khuôn mặt trẻ là thứ DUY NHẤT trong cả app không dựng lại được nếu mất —
// chính tệp này viết thế ở ngay trên.
//
// `backup.js` luôn ghi `.db.gz` và `uploads/` vào CÙNG một thư mục, nên ảnh
// luôn nằm cạnh tệp bản sao. Đi tìm theo tệp mới là đi đúng; đi tìm theo
// `DATA_DIR` chỉ TRÙNG HỢP đúng ở đường mặc định — và ở đó `path.dirname(nguon)`
// bằng đúng `BACKUP_DIR`, nên hành vi cũ không đổi một chút nào.
const anhBackup = coCoAnh ? path.resolve(coCoAnh) : path.join(path.dirname(nguon), 'uploads');
const anhDich = path.join(DATA_DIR, 'uploads');
if (fs.existsSync(anhBackup)) {
  fs.mkdirSync(anhDich, { recursive: true });
  let n = 0;
  const khac = [];
  for (const f of fs.readdirSync(anhBackup)) {
    const src = path.join(anhBackup, f);
    const dst = path.join(anhDich, f);
    if (!fs.existsSync(dst)) { fs.copyFileSync(src, dst); n++; continue; }
    let cs = -1;
    let cd = -2;
    try { cs = fs.statSync(src).size; cd = fs.statSync(dst).size; } catch (_) { /* đọc không được thì coi như khác */ }
    if (cs !== cd) khac.push({ ten: f, banSao: cs, trenDia: cd });
  }
  if (n) console.log(`Khôi phục thêm ${n} ảnh album`);
  if (khac.length) {
    console.log(`\n⚠  ${khac.length} ảnh trên đĩa KHÁC với bản sao — KHÔNG bị đè, xin tự xem:`);
    for (const k of khac.slice(0, 20)) {
      console.log(`   ${k.ten}  (trên đĩa ${k.trenDia} byte · bản sao ${k.banSao} byte)`);
    }
    if (khac.length > 20) console.log(`   … và ${khac.length - 20} tấm nữa`);
    console.log(`   Bản trong bản sao nằm ở: ${anhBackup}`);
  }
} else {
  // NÓI RA KHI KHÔNG TÌM THẤY ẢNH.
  //
  // Cơ chế "nói ra khi lệch" ở trên chỉ chạy KHI đã tìm thấy thư mục ảnh, nên
  // nó không bắt được đúng ca mất trắng. Người đang chạy lệnh này là người vừa
  // nghi dữ liệu hỏng; im lặng rồi in "Đã khôi phục xong" là để họ tin đã chữa
  // xong trong khi mọi ảnh của trẻ vẫn đang thiếu.
  console.log('\n⚠  KHÔNG tìm thấy thư mục ảnh đi kèm bản sao lưu này.');
  console.log(`   Đã tìm ở: ${anhBackup}`);
  console.log('   Cơ sở dữ liệu đã về đủ, nhưng ẢNH thì CHƯA — album của nhóm,');
  console.log('   ảnh Ghi nhanh và ảnh người được uỷ quyền đón sẽ là ô ảnh vỡ.');
  console.log('   Nếu ảnh được cất ở nơi khác, chạy lại kèm:  --anh <thư mục uploads>');
}

console.log('\nĐã khôi phục xong. Khởi động lại máy chủ và kiểm tra dữ liệu.');
