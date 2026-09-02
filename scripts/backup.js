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
const ngay = require('../lib/ngay');
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

// Tên bản sao lưu đọc theo GIỜ VIỆT NAM.
//
// Người đọc tên tệp này là nhà trường, đứng ở Việt Nam. Máy chủ thì có thể ở
// bất cứ đâu — hôm nay Singapore, mai là VPS trong nước — nên lấy giờ máy chủ
// là tên bản sao lúc đúng lúc lệch, mà lệch thì không ai nhận ra cho tới lúc
// cần khôi phục đúng bản của một buổi chiều nào đó.
function stamp(moc = Date.now()) {
  const t = moc instanceof Date ? moc.getTime() : moc;
  return `${ngay.ngayCua(t).replace(/-/g, '')}-${ngay.gioCua(t).replace(':', '')}`;
}

function mb(bytes) { return (bytes / 1024 / 1024).toFixed(1) + ' MB'; }

// Sổ ghi "tấm ảnh này lần đầu thấy vắng mặt lúc nào" — xem chú thích mục 2b.
// Hỏng sổ thì coi như sổ trống: giữ lại hết, không xoá nhầm cái gì.
const SO_VANG = () => path.join(BACKUP_DIR, 'uploads-da-vang.json');

function docSoVang() {
  try {
    const o = JSON.parse(fs.readFileSync(SO_VANG(), 'utf8'));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (_) { return {}; }
}

function ghiSoVang(o) {
  try { fs.writeFileSync(SO_VANG(), JSON.stringify(o, null, 0) + '\n'); } catch (_) {}
}

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
  //
  // GHI NGUYÊN TỬ: nén vào tệp .tmp rồi mới rename sang tên thật. Ghi thẳng
  // vào tên .gz mà chết giữa chừng (mất điện, đầy đĩa) là để lại một bản .gz
  // CỤT mang tên hợp lệ — vòng đời dọn 7 ngày / 4 tuần đếm nó như một bản sao
  // thật và xoá mất bản tốt cùng khe, còn restore thì tới lúc cần mới vỡ lẽ.
  // rename trên cùng một ổ đĩa là thao tác nguyên tử của hệ tệp.
  const raw = fs.readFileSync(tmp);
  const dichTam = `${dich}.tmp`;
  fs.writeFileSync(dichTam, zlib.gzipSync(raw, { level: 9 }));
  fs.renameSync(dichTam, dich);
  fs.unlinkSync(tmp);

  console.log(`  ${path.basename(dich)}  ${mb(fs.statSync(dich).size)} (gốc ${mb(raw.length)})`);

  // ---- 2. Sao lưu ảnh album ----
  // Ảnh không bao giờ đổi nội dung nên chỉ cần chép tệp mới, không chép lại từ đầu.
  const anhDir = path.join(BACKUP_DIR, 'uploads');
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(anhDir, { recursive: true });
    let moi = 0, tongCu = 0;
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      // Tệp .tmp là ảnh ĐANG TẢI DỞ của lib/uploads.js — chép nó vào kho bản
      // sao là lưu vĩnh viễn một tệp cụt không ai đọc được, và mỗi lần sao lưu
      // trúng giờ cô đang đăng ảnh lại thêm một tệp rác.
      if (f.endsWith('.tmp')) continue;
      const src = path.join(UPLOAD_DIR, f);
      const dst = path.join(anhDir, f);
      if (fs.existsSync(dst)) { tongCu++; continue; }
      fs.copyFileSync(src, dst);
      moi++;
    }
    console.log(`  Ảnh album: thêm ${moi} tệp mới, đã có sẵn ${tongCu} tệp`);

    // ---- 2b. GHI NHẬN ẢNH ĐÃ BIẾN MẤT KHỎI THƯ MỤC GỐC ----
    //
    // Phần dọn ở mục 3 chỉ áp cho tệp school-*.db.gz. Ảnh thì chép vào rồi
    // nằm đó vĩnh viễn, kể cả sau khi cô đã xoá tấm ảnh khỏi album và mọi bản
    // sao còn giữ đều được chụp SAU lúc xoá. Nghĩa là chỗ ảnh trong DATA_DIR
    // luôn gấp đôi và chỉ có tăng — mà bản kế hoạch dự trù 80–160 GB ảnh cho
    // ba cơ sở, tức 160–320 GB thật.
    //
    // KHÔNG THỂ XOÁ NGAY khi ảnh biến mất khỏi thư mục gốc: những bản sao chụp
    // TRƯỚC lúc xoá vẫn còn nhắc tới tấm ảnh đó, khôi phục về là album thủng lỗ.
    //
    // Cách làm đúng và rẻ, dựa trên một điều luôn đúng: bản sao chụp SAU lúc
    // ảnh bị xoá thì không thể nhắc tới nó. Nên chỉ cần nhớ MỐC LẦN ĐẦU THẤY
    // ẢNH BIẾN MẤT; khi mọi bản sao còn giữ đều mới hơn mốc đó thì không bản
    // nào cần tấm ảnh nữa, xoá được. Mốc ghi lại luôn muộn hơn hoặc bằng lúc
    // xoá thật, tức là sai về phía GIỮ LÂU HƠN — phía an toàn.
    const dangCo = new Set(fs.readdirSync(UPLOAD_DIR));
    const soVang = docSoVang();
    const bayGio = new Date().toISOString();
    for (const f of fs.readdirSync(anhDir)) {
      if (dangCo.has(f)) delete soVang[f];            // quay lại rồi thì xoá dấu
      else if (!soVang[f]) soVang[f] = bayGio;         // lần đầu thấy vắng
    }
    for (const f of Object.keys(soVang)) {
      if (!fs.existsSync(path.join(anhDir, f))) delete soVang[f];
    }
    ghiSoVang(soVang);
  }

  // ---- 3. Dọn bản cũ theo vòng đời ----
  const list = danhSach();
  const giu = new Set();
  const theoNgay = new Map(), theoTuan = new Map(), theoThang = new Map();

  for (const b of list) {
    // Khoá gom nhóm cũng theo giờ Việt Nam, để "một bản mỗi ngày" nghĩa là một
    // bản mỗi ngày CỦA TRƯỜNG, không phải mỗi ngày của máy chủ.
    const ngayVN = ngay.ngayCua(b.at.getTime());
    const khoaNgay = ngayVN;
    const khoaThang = ngayVN.slice(0, 7);
    const tuan = Math.floor(Date.parse(`${ngayVN}T00:00:00Z`) / (7 * 86400000));
    const khoaTuan = String(tuan);
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

  // ---- 3b. Dọn ảnh không còn bản sao nào cần tới ----
  //
  // Mốc so sánh là bản sao CŨ NHẤT còn giữ. Ảnh nào đã thấy vắng mặt từ trước
  // mốc đó thì mọi bản sao còn lại đều chụp sau lúc nó biến mất, nên không bản
  // nào nhắc tới nó nữa. Không có bản sao nào thì không dọn gì cả — lúc đó
  // không có gì để so, mà đoán mò ở đây là mất ảnh thật.
  const conGiu = list.filter(b => giu.has(b.file));
  if (fs.existsSync(anhDir) && conGiu.length) {
    const mocCuNhat = Math.min(...conGiu.map(b => b.at.getTime()));
    const soVang = docSoVang();
    let doiRac = 0, dungLuong = 0;
    for (const [f, luc] of Object.entries(soVang)) {
      if (Date.parse(luc) > mocCuNhat) continue;   // còn bản sao cũ hơn cần tới
      const p = path.join(anhDir, f);
      try {
        dungLuong += fs.statSync(p).size;
        fs.unlinkSync(p);
        delete soVang[f];
        doiRac++;
      } catch (_) { delete soVang[f]; }
    }
    ghiSoVang(soVang);
    if (doiRac) {
      console.log(`  Đã dọn ${doiRac} ảnh không bản sao nào còn cần (${mb(dungLuong)})`);
    }
  }

  console.log(`\nHoàn tất. Giữ lại ${giu.size} bản trong ${BACKUP_DIR}`);
  // BẢN SAO NẰM CÙNG Ổ ĐĨA VỚI DỮ LIỆU GỐC THÌ KHÔNG PHẢI LÀ BẢN SAO.
  // Ổ hỏng là mất cả hai cùng lúc. Nói thẳng, và nói ở chỗ dễ thấy.
  if (BACKUP_DIR.startsWith(DATA_DIR + path.sep)) {
    console.log('');
    console.log('⚠  Bản sao đang nằm CÙNG Ổ ĐĨA với dữ liệu gốc, nên ổ hỏng là mất cả hai.');
    console.log('   Hãy chạy thêm một lần nữa ra nơi khác, ví dụ:');
    console.log('     node scripts/backup.js --out /mnt/o-cung-ngoai/casa-mamnon');
    console.log('   hoặc đặt lịch đồng bộ thư mục này ra ổ cứng ngoài / dịch vụ lưu trữ.');
  } else {
    console.log('Nhớ giữ nơi này tách khỏi máy chủ — đó mới là điều làm nó thành bản sao.');
  }
}).catch(err => {
  console.error(`Sao lưu thất bại: ${err.message}`);
  try { fs.unlinkSync(tmp); } catch (_) {}
  process.exit(1);
});
