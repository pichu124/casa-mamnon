#!/usr/bin/env node
// Sao lưu cơ sở dữ liệu và ảnh album.
//
//     node scripts/backup.js                 sao lưu vào DATA_DIR/backups
//     node scripts/backup.js --out /mnt/usb  sao lưu vào nơi khác
//     node scripts/backup.js --list          xem các bản đã có
//     node scripts/backup.js --giu-anh       BẬT khoá giữ ảnh đã tải về
//     node scripts/backup.js --thoi-giu-anh  TẮT khoá đó
//
// Dùng lệnh .backup của SQLite nên an toàn tuyệt đối ngay cả khi máy chủ đang
// chạy và có người đang ghi dữ liệu — khác hẳn việc chép tệp trực tiếp, vốn có
// thể tạo ra bản sao hỏng không khôi phục được.
// Dòng đầu tiên: thiếu DATA_DIR trên máy chủ thật thì dừng ngay (Đ234).
require('./canh-thu-muc-du-lieu')();
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

// KHOÁ GIỮ ẢNH ĐÃ TẢI VỀ — nhà trường duyệt ngày 15/09/2026 (Câu 10).
//
// VÌ SAO PHẢI CÓ. Mục 3b bên dưới tự dọn BẢN SAO của một tấm ảnh khi mọi bản
// sao còn giữ đều chụp sau lúc ảnh biến mất khỏi thư mục gốc. Luật đó đúng cho
// việc nó sinh ra: cô xoá một tấm khỏi album thì bản sao của nó cũng nên đi.
//
// Nhưng nhà trường vừa chốt một cách dùng KHÁC HẲN (A28): *"khi chạm mốc nâng
// đĩa máy chủ, tôi dự định down về ổ cứng backup của trường và xóa bớt phần đã
// down về"*. Ảnh ấy KHÔNG bị xoá vì không cần nữa — nó bị xoá vì đã được cất
// sang chỗ khác. Với luật cũ thì: trường xoá bản gốc, máy ghi nhận vắng mặt,
// và sau một vòng đời **chính bản sao cũng bị dọn**. Lúc đó tấm ảnh chỉ còn
// nằm trên một ổ cứng duy nhất, và ổ đó hỏng là mất hẳn.
//
// Ảnh là thứ DUY NHẤT trong app không dựng lại được từ đâu khác.
//
// KHOÁ NÀY PHẢI LÀ MỘT TỆP, KHÔNG PHẢI MỘT THAM SỐ DÒNG LỆNH. Sao lưu chạy
// theo lịch (cron), mà dòng cron thì không ai nhớ sửa — một tham số `--giu-anh`
// gõ tay một lần là vô nghĩa với lượt chạy tự động ngay hôm sau. Tệp khoá nằm
// cạnh các bản sao nên nó đi theo kho sao lưu, kể cả khi đổi sang ổ khác.
//
// VÀ KHOÁ PHẢI NÓI RA MỖI LƯỢT CHẠY. Một cái khoá im lặng là một cái khoá
// người ta quên mất đang bật, rồi ngạc nhiên vì đĩa đầy.
const KHOA_GIU_ANH = () => path.join(BACKUP_DIR, 'giu-anh-da-tai-ve.lock');

function dangGiuAnh() {
  try { return fs.existsSync(KHOA_GIU_ANH()); } catch (_) { return false; }
}

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

// BẬT / TẮT khoá giữ ảnh. Đặt TRƯỚC mọi việc khác để gõ nhầm lệnh cũng không
// kéo theo một lượt sao lưu ngoài ý muốn.
if (args.includes('--giu-anh') || args.includes('--thoi-giu-anh')) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const bat = args.includes('--giu-anh');
  if (bat) {
    fs.writeFileSync(KHOA_GIU_ANH(), `Bật lúc ${new Date().toISOString()}\n`
      + 'Khi tệp này còn đây, sao lưu KHÔNG tự dọn bản sao của ảnh đã biến mất\n'
      + 'khỏi thư mục gốc. Dùng khi nhà trường tải ảnh về ổ ngoài rồi xoá bản\n'
      + 'gốc trên máy chủ: bản sao là chỗ dựa cuối cùng, không được tự đi mất.\n'
      + 'Tắt bằng: node scripts/backup.js --thoi-giu-anh\n');
    console.log('✓ ĐÃ BẬT khoá giữ ảnh đã tải về.');
    console.log('  Từ giờ sao lưu KHÔNG tự dọn bản sao của ảnh đã xoá khỏi thư mục gốc.');
    console.log('  Chỗ ảnh trong kho sao lưu sẽ chỉ tăng — nhớ theo dõi dung lượng đĩa.');
    console.log(`  Tệp khoá: ${KHOA_GIU_ANH()}`);
  } else {
    try { fs.unlinkSync(KHOA_GIU_ANH()); } catch (_) {}
    console.log('✓ ĐÃ TẮT khoá giữ ảnh.');
    console.log('  Lượt sao lưu tới sẽ dọn lại bản sao của những ảnh không bản nào còn cần.');
    console.log('  Nếu trường đã xoá bản gốc sau khi tải về, ĐÂY LÀ LÚC những tấm đó mất');
    console.log('  chỗ dựa cuối cùng trên máy chủ. Chỉ tắt khi chắc ổ ngoài đã an toàn.');
  }
  process.exit(0);
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
  // Nói ra trạng thái khoá ngay ở màn xem danh sách: người mở `--list` thường
  // là người đang thắc mắc vì sao kho sao lưu to lên.
  console.log(dangGiuAnh()
    ? '\nKhoá giữ ảnh: ĐANG BẬT — bản sao của ảnh đã xoá khỏi thư mục gốc được giữ lại.'
    : '\nKhoá giữ ảnh: đang tắt.');
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
  if (dangGiuAnh()) {
    // Khoá đang bật: KHÔNG dọn tấm nào. Nhưng phải nói ra, và nói kèm con số —
    // một cái khoá im lặng là một cái khoá người ta quên mất đang bật.
    const soVang = docSoVang();
    let n = 0, dungLuong = 0;
    for (const f of Object.keys(soVang)) {
      try { dungLuong += fs.statSync(path.join(anhDir, f)).size; n++; } catch (_) { /* tệp đã đi rồi */ }
    }
    console.log(`  Khoá giữ ảnh ĐANG BẬT — giữ lại ${n} ảnh đã xoá khỏi thư mục gốc (${mb(dungLuong)}).`);
    console.log('  Tắt bằng: node scripts/backup.js --thoi-giu-anh');
  } else if (fs.existsSync(anhDir) && conGiu.length) {
    const mocCuNhat = Math.min(...conGiu.map(b => b.at.getTime()));
    const soVang = docSoVang();
    let doiRac = 0, dungLuong = 0;
    for (const [f, luc] of Object.entries(soVang)) {
      // `>=`, KHÔNG phải `>`: hai mốc sinh ra cách nhau vài phần nghìn giây trong cùng một lượt,
      // và máy đủ nhanh thì TRÙNG nhau tới từng mi-li-giây. Trùng mốc là chưa chắc bản sao cũ
      // nhất đã chụp sau lúc ảnh biến mất — giữ lại, đúng lời hứa "sai về phía GIỮ LÂU HƠN".
      // (Đỏ thật trên GitHub 01/10/2026 — test/sao-luu.test.mjs mục [7c] dựng lại ca này.)
      if (Date.parse(luc) >= mocCuNhat) continue;   // còn bản sao cũ hơn (hoặc cùng lúc) cần tới
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
