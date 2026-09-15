// Bài canh SAO LƯU và KHÔI PHỤC.
//
// Chạy bằng:  npm run test:sao-luu
//
// VÌ SAO CÓ BÀI NÀY
//
// `scripts/backup.js` và `scripts/restore.js` ra đời từ app 1 và chưa từng có
// bài kiểm thử nào. Đó là hai script mà người ta chỉ chạy đúng vào lúc tệ nhất:
// dữ liệu vừa hỏng, trường đang chờ, người vận hành đang cuống. Chính lúc đó
// mới phát hiện script sai thì không còn đường lùi.
//
// Bài này đi đúng con đường đó một lượt trên dữ liệu tạm: sao lưu → kiểm tra →
// làm hỏng → khôi phục → soi lại từng con số.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu, HOM_NAY } from './_chung.mjs';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));
const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('sao-luu');
fs.mkdirSync(DIR, { recursive: true });
const DB_FILE = path.join(DIR, 'school.db');
const BACKUP_DIR = path.join(DIR, 'backups');

const chay = (script, ...args) => spawnSync('node', [path.join(GOC, 'scripts', script), ...args],
  { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });

sinhDuLieu(DIR);

function demBe() {
  const db = new Database(DB_FILE, { readonly: true });
  const n = db.prepare('SELECT COUNT(*) c FROM students').get().c;
  db.close();
  return n;
}

// ===========================================================================
console.log('\n[1] Sao lưu tạo ra một bản dùng được');
{
  const soBeBanDau = demBe();
  check('dữ liệu mẫu có bé để sao lưu', soBeBanDau > 0, soBeBanDau);

  const kq = chay('backup.js');
  check('lệnh sao lưu chạy xong không lỗi', kq.status === 0, (kq.stdout + kq.stderr).slice(0, 300));

  const ds = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter(f => /^school-\d{8}-\d{4}\.db\.gz$/.test(f)) : [];
  check('có đúng một tệp sao lưu đặt đúng tên', ds.length === 1, ds);
  check('tệp sao lưu không rỗng',
    ds.length === 1 && fs.statSync(path.join(BACKUP_DIR, ds[0])).size > 0);
}

// ===========================================================================
console.log('\n[2] Kiểm tra bản sao lưu KHÔNG được đụng vào dữ liệu đang chạy');
{
  const truoc = fs.statSync(DB_FILE).mtimeMs;
  const soBe = demBe();
  const kq = chay('restore.js', '--kiem-tra');
  const chu = kq.stdout + kq.stderr;

  check('lệnh --kiem-tra chạy xong không lỗi', kq.status === 0, chu.slice(0, 300));
  check('báo kiểm tra toàn vẹn đạt', /Kiểm tra toàn vẹn: đạt/.test(chu), chu.slice(0, 300));
  check('nói rõ là chỉ kiểm tra, không thay đổi gì',
    /không thay đổi dữ liệu hiện tại/.test(chu), chu.slice(0, 300));
  check('đếm đúng số bé trong bản sao lưu',
    new RegExp(`${soBe} bé`).test(chu), chu.slice(0, 300));
  check('KHÔNG đụng vào tệp dữ liệu đang dùng', fs.statSync(DB_FILE).mtimeMs === truoc);
  check('không để lại tệp tạm .khoi-phuc-* nào',
    fs.readdirSync(DIR).filter(f => f.startsWith('.khoi-phuc-')).length === 0,
    fs.readdirSync(DIR));
}

// ===========================================================================
console.log('\n[3] Đang có người mở cơ sở dữ liệu thì TỪ CHỐI khôi phục');
{
  // ĐÂY LÀ MỤC QUAN TRỌNG NHẤT CỦA CẢ BÀI.
  //
  // Khôi phục trong lúc máy chủ đang chạy là kịch bản mất dữ liệu tệ nhất mà
  // script này có thể gây ra, và bản trước KHÔNG hề kiểm tra:
  //
  //   • `rename` chỉ đổi tên trong thư mục — máy chủ vẫn giữ file descriptor cũ
  //     và tiếp tục ghi vào tệp đã đổi tên. Mọi thứ cô nhập từ đó rơi vào một
  //     tệp không ai còn nhìn tới.
  //   • Nhật ký ghi `-wal` bị xóa ngay dưới chân một kết nối đang mở.
  //   • Không có lỗi nào hiện ra. Màn hình vẫn chạy vì dữ liệu còn trong bộ nhớ.
  //
  // Hỏng kiểu này chỉ lộ ra sau lần khởi động lại kế tiếp — thường là hôm sau,
  // khi đã không còn ai nhớ tối qua vừa chạy lệnh gì.
  const giu = new Database(DB_FILE);            // đóng vai máy chủ đang chạy
  giu.pragma('journal_mode = WAL');
  giu.prepare('SELECT COUNT(*) c FROM students').get();

  const soBeTruoc = giu.prepare('SELECT COUNT(*) c FROM students').get().c;
  const kq = chay('restore.js');
  const chu = kq.stdout + kq.stderr;

  check('BỊ TỪ CHỐI, không âm thầm khôi phục đè lên', kq.status !== 0, kq.status);
  check('nói rõ đang có tiến trình khác mở cơ sở dữ liệu',
    /đang có tiến trình khác mở/i.test(chu), chu.slice(0, 400));
  check('giải thích hậu quả chứ không chỉ báo lỗi cụt',
    /tiếp tục ghi vào đó/.test(chu) && /-wal/.test(chu), chu.slice(0, 600));
  check('chỉ cách dừng máy chủ', /systemctl stop|docker compose stop|pm2 stop/.test(chu));
  check('chỉ cách tìm tiến trình còn giữ tệp nếu vẫn báo', /fuser/.test(chu));

  check('tệp dữ liệu vẫn nguyên chỗ cũ, không bị đổi tên',
    fs.existsSync(DB_FILE));
  check('không có tệp .truoc-khi-khoi-phuc-* nào được tạo ra',
    fs.readdirSync(DIR).filter(f => f.includes('truoc-khi-khoi-phuc')).length === 0,
    fs.readdirSync(DIR));
  check('không để lại tệp tạm .khoi-phuc-* nào',
    fs.readdirSync(DIR).filter(f => f.startsWith('.khoi-phuc-')).length === 0,
    fs.readdirSync(DIR));
  check('kết nối đang mở vẫn đọc được dữ liệu như cũ',
    giu.prepare('SELECT COUNT(*) c FROM students').get().c === soBeTruoc);

  giu.close();
}

// ===========================================================================
console.log('\n[4] Đóng máy chủ rồi thì khôi phục được, và dữ liệu quay lại đúng');
{
  const soBeTruoc = demBe();

  // Làm hỏng dữ liệu như một lần xóa nhầm ngoài đời: xóa hết bé.
  {
    const db = new Database(DB_FILE);
    db.pragma('foreign_keys = OFF');
    db.exec('DELETE FROM students');
    db.close();
  }
  check('đã xóa sạch bé để giả lập sự cố', demBe() === 0);

  const kq = chay('restore.js');
  const chu = kq.stdout + kq.stderr;
  check('khôi phục chạy xong không lỗi', kq.status === 0, chu.slice(0, 400));
  check('báo đã khôi phục xong', /Đã khôi phục xong/.test(chu), chu.slice(0, 300));
  check('DỮ LIỆU QUAY LẠI ĐÚNG SỐ BÉ BAN ĐẦU', demBe() === soBeTruoc,
    `${demBe()} ≠ ${soBeTruoc}`);

  // Khôi phục nhầm thì vẫn quay lại được — đây là lời hứa của chính script.
  const giuLai = fs.readdirSync(DIR).filter(f => f.includes('truoc-khi-khoi-phuc'));
  check('dữ liệu cũ ĐƯỢC GIỮ LẠI chứ không bị xóa', giuLai.length === 1, giuLai);
  check('lời nhắc chỉ rõ tệp giữ lại nằm ở đâu',
    /Dữ liệu cũ được giữ lại tại/.test(chu), chu.slice(0, 400));
  {
    const cu = new Database(path.join(DIR, giuLai[0]), { readonly: true });
    check('tệp giữ lại đúng là bản vừa bị hỏng (0 bé), không phải bản nào khác',
      cu.prepare('SELECT COUNT(*) c FROM students').get().c === 0);
    cu.close();
  }
  check('không để lại tệp tạm .khoi-phuc-* nào',
    fs.readdirSync(DIR).filter(f => f.startsWith('.khoi-phuc-')).length === 0,
    fs.readdirSync(DIR));
}

// ===========================================================================
console.log('\n[4b] Máy chủ bị tắt đột ngột: bản giữ lại KHÔNG được mất phần ghi cuối');
{
  // Ở chế độ WAL, phần vừa ghi gần nhất nằm trong `school.db-wal` chứ chưa nằm
  // trong `school.db`. Bản trước của restore.js đổi tên tệp chính rồi XÓA `-wal`,
  // nên tệp "giữ lại phòng khi khôi phục nhầm" mất đúng phần mới nhất — lặng lẽ,
  // không một dòng cảnh báo.
  //
  // Mà máy chủ bị tắt đột ngột (mất điện, hết bộ nhớ) vừa là lý do hay gặp nhất
  // khiến người ta phải chạy lệnh khôi phục, vừa là kịch bản để lại nhiều dữ
  // liệu chưa gộp nhất trong `-wal`. Hai thứ đó gặp nhau đúng lúc tệ nhất.
  const DAU = 'Bé Chỉ Có Trong WAL';
  const con = spawnSync('node', ['-e', `
    const D = require(${JSON.stringify(path.join(GOC, 'node_modules', 'better-sqlite3'))});
    const db = new D(${JSON.stringify(DB_FILE)});
    db.pragma('journal_mode = WAL');
    db.pragma('wal_autocheckpoint = 0');      // ép phần ghi nằm lại trong -wal
    db.prepare('UPDATE students SET name = ? WHERE id = (SELECT id FROM students LIMIT 1)').run(${JSON.stringify(DAU)});
    process.kill(process.pid, 'SIGKILL');     // tắt đột ngột, KHÔNG đóng kết nối
  `], { cwd: GOC, encoding: 'utf8' });

  const walTruoc = fs.existsSync(DB_FILE + '-wal') ? fs.statSync(DB_FILE + '-wal').size : 0;
  check('dựng được tình huống: phần ghi cuối còn nằm trong -wal', walTruoc > 0,
    { walTruoc, loi: (con.stderr || '').slice(0, 200) });

  // PHÉP THỬ NGƯỢC — chứng minh tình huống này MẤT DỮ LIỆU THẬT nếu xử lý ngây
  // thơ. Không có mục này thì check ở dưới xanh cũng không nói lên điều gì: có
  // thể phần ghi cuối vốn đã nằm sẵn trong tệp chính từ đầu.
  //
  // Chép cả ba tệp sang một chỗ riêng rồi làm đúng thứ bản restore.js cũ làm:
  // đổi tên tệp chính, xóa `-wal`.
  {
    const nguHo = path.join(DIR, 'thu-nguoc');
    fs.mkdirSync(nguHo, { recursive: true });
    for (const hau of ['', '-wal', '-shm']) {
      if (fs.existsSync(DB_FILE + hau)) fs.copyFileSync(DB_FILE + hau, path.join(nguHo, 'school.db' + hau));
    }
    fs.rmSync(path.join(nguHo, 'school.db-wal'), { force: true });   // ← đúng chỗ mất dữ liệu
    fs.rmSync(path.join(nguHo, 'school.db-shm'), { force: true });
    const hong = new Database(path.join(nguHo, 'school.db'), { readonly: true });
    const conLai = hong.prepare('SELECT COUNT(*) c FROM students WHERE name = ?').get(DAU).c;
    hong.close();
    check('xóa thẳng -wal như bản cũ thì MẤT phần ghi cuối — tình huống là thật',
      conLai === 0, conLai);
    fs.rmSync(nguHo, { recursive: true, force: true });
  }

  const kq = chay('restore.js');
  check('khôi phục vẫn chạy được sau khi máy chủ bị tắt đột ngột', kq.status === 0,
    (kq.stdout + kq.stderr).slice(0, 400));

  const giuLai = fs.readdirSync(DIR)
    .filter(f => f.includes('truoc-khi-khoi-phuc') && !f.endsWith('-wal') && !f.endsWith('-shm'))
    .sort();
  check('có tệp giữ lại', giuLai.length >= 1, giuLai);
  {
    const cu = new Database(path.join(DIR, giuLai[giuLai.length - 1]), { readonly: true });
    const co = cu.prepare('SELECT COUNT(*) c FROM students WHERE name = ?').get(DAU).c;
    cu.close();
    check('BẢN GIỮ LẠI CÒN NGUYÊN PHẦN GHI CUỐI — không mất theo -wal bị xóa',
      co === 1, co);
  }
  for (const f of fs.readdirSync(DIR)) {
    if (f.includes('truoc-khi-khoi-phuc')) fs.rmSync(path.join(DIR, f), { force: true });
  }
}

// ===========================================================================
console.log('\n[4c] Bản sao lưu MẤT SẠCH PHÂN CÔNG CÔ phải bị nói ra, không lặng lẽ "đạt"');
{
  // VÌ SAO ĐÂY LÀ CHỖ NGUY HIỂM RIÊNG
  //
  // `class_teachers` là nguồn quyền duy nhất của cô sau G0.4. Một bản sao lưu
  // mất sạch bảng đó vẫn qua `integrity_check` — tệp không hỏng, chỉ thiếu nội
  // dung. Khôi phục xong:
  //
  //   • phụ huynh vẫn thấy con bình thường — phía đông người hơn trông vẫn đúng;
  //   • MỌI CÔ đăng nhập vào thấy "Nhóm chưa có bé nào": không điểm danh, không
  //     nhận xét, không nhắn tin với gia đình được.
  //
  // Người vận hành đọc "Kiểm tra toàn vẹn: đạt" rồi yên tâm bấm khôi phục, và
  // chỉ biết mình vừa làm gì vào sáng hôm sau khi ba cô cùng gọi điện.
  const rong = thuMucTam('sao-luu-mat-phan-cong');
  fs.mkdirSync(path.join(rong, 'backups'), { recursive: true });
  sinhDuLieu(rong);
  {
    const db = new Database(path.join(rong, 'school.db'));
    const truoc = db.prepare('SELECT COUNT(*) c FROM class_teachers').get().c;
    check('dữ liệu mẫu có phân công cô để mà làm mất', truoc > 0, truoc);
    db.exec('DELETE FROM class_teachers');
    db.close();
  }
  const sl = spawnSync('node', [path.join(GOC, 'scripts', 'backup.js')],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: rong } });
  check('sao lưu được bản đã mất phân công', sl.status === 0, (sl.stdout + sl.stderr).slice(0, 200));

  const kq = spawnSync('node', [path.join(GOC, 'scripts', 'restore.js'), '--kiem-tra'],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: rong } });
  const chu = kq.stdout + kq.stderr;
  check('vẫn báo toàn vẹn đạt — vì tệp thật sự không hỏng',
    /Kiểm tra toàn vẹn: đạt/.test(chu), chu.slice(0, 300));
  check('NHƯNG NÓI THẲNG LÀ KHÔNG CÓ PHÂN CÔNG CÔ NÀO',
    /KHÔNG CÓ PHÂN CÔNG CÔ NÀO/.test(chu), chu.slice(0, 600));
  check('giải thích hậu quả bằng thứ cô sẽ nhìn thấy',
    /Nhóm chưa có bé nào/.test(chu), chu.slice(0, 900));
  check('nói rõ phía phụ huynh vẫn trông bình thường — chỗ dễ bỏ qua nhất',
    /phụ huynh vẫn trông bình thường/i.test(chu), chu.slice(0, 900));
  check('mách lệnh dựng lại phân công', /sua-quyen-chu-nhiem/.test(chu), chu.slice(0, 900));

  // Chiều ngược lại: bản sao lưu bình thường thì KHÔNG được dọa người vận hành.
  const kqTot = chay('restore.js', '--kiem-tra');
  const chuTot = kqTot.stdout + kqTot.stderr;
  check('bản sao lưu bình thường thì không in cảnh báo đó',
    !/KHÔNG CÓ PHÂN CÔNG CÔ NÀO/.test(chuTot), chuTot.slice(0, 300));
  check('và vẫn nêu số phân công cô để đối chiếu',
    /phân công cô/.test(chuTot), chuTot.slice(0, 300));

  donThuMucTam(rong);
}

// ===========================================================================
console.log('\n[5] Bản sao lưu hỏng thì TỪ CHỐI, không đè lên dữ liệu đang có');
{
  const soBeTruoc = demBe();
  const banHong = path.join(BACKUP_DIR, 'school-20200101-0000.db.gz');
  fs.writeFileSync(banHong, require('zlib').gzipSync(Buffer.from('ĐÂY KHÔNG PHẢI CƠ SỞ DỮ LIỆU')));

  const kq = chay('restore.js', 'school-20200101-0000.db.gz');
  const chu = kq.stdout + kq.stderr;
  check('BỊ TỪ CHỐI', kq.status !== 0, kq.status);
  check('nói rõ bản sao lưu không dùng được',
    /KHÔNG dùng được/.test(chu), chu.slice(0, 300));
  check('DỮ LIỆU ĐANG CÓ KHÔNG SUY SUYỂN', demBe() === soBeTruoc, `${demBe()} ≠ ${soBeTruoc}`);
  check('không để lại tệp tạm .khoi-phuc-* nào',
    fs.readdirSync(DIR).filter(f => f.startsWith('.khoi-phuc-')).length === 0,
    fs.readdirSync(DIR));

  fs.unlinkSync(banHong);
}

// ===========================================================================
console.log('\n[6] Không có bản sao lưu nào thì nói rõ, không nổ');
{
  const rong = thuMucTam('sao-luu-rong');
  fs.mkdirSync(rong, { recursive: true });
  const kq = spawnSync('node', [path.join(GOC, 'scripts', 'restore.js')],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: rong } });
  const chu = kq.stdout + kq.stderr;
  check('dừng lại với mã lỗi', kq.status === 1, kq.status);
  check('nói không tìm thấy bản sao lưu nào', /Không tìm thấy bản sao lưu nào/.test(chu), chu.slice(0, 200));
  check('mách luôn lệnh tạo bản đầu tiên', /npm run backup/.test(chu), chu.slice(0, 200));
  donThuMucTam(rong);
}

// ===========================================================================
console.log('\n[7] ẢNH TRONG BẢN SAO cũng phải được dọn — nhưng không dọn sớm một giây nào');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Vòng đời 7 ngày / 4 tuần / 12 tháng ở mục 3 của backup.js chỉ áp cho tệp
  // school-*.db.gz. Ảnh thì chép vào backups/uploads rồi nằm đó VĨNH VIỄN, kể
  // cả khi cô đã xoá tấm ảnh khỏi album từ lâu. Nghĩa là chỗ ảnh trong DATA_DIR
  // luôn gấp đôi và chỉ tăng — bản kế hoạch dự trù 80–160 GB ảnh cho ba cơ sở,
  // tức phải chuẩn bị 160–320 GB thật.
  //
  // Nhưng dọn sai còn tệ hơn không dọn: xoá tấm ảnh mà một bản sao cũ còn nhắc
  // tới là khôi phục về album thủng lỗ, không lấy lại được. Nên bài này canh cả
  // hai chiều, và chiều KHÔNG ĐƯỢC XOÁ đứng trước.
  const D = thuMucTam('sao-luu-anh');
  fs.mkdirSync(D, { recursive: true });
  sinhDuLieu(D);
  const UP = path.join(D, 'uploads');
  const BK = path.join(D, 'backups');
  const BKUP = path.join(BK, 'uploads');
  fs.mkdirSync(UP, { recursive: true });
  const chayD = (...a) => spawnSync('node', [path.join(GOC, 'scripts', 'backup.js'), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D } });

  fs.writeFileSync(path.join(UP, 'anh-con-dung.jpg'), 'x'.repeat(600));
  fs.writeFileSync(path.join(UP, 'anh-se-bi-xoa.jpg'), 'y'.repeat(600));
  chayD();
  check('lần sao lưu đầu chép cả hai tấm ảnh sang bản sao',
    fs.existsSync(path.join(BKUP, 'anh-con-dung.jpg'))
    && fs.existsSync(path.join(BKUP, 'anh-se-bi-xoa.jpg')));

  // Cô xoá một tấm khỏi album. Bản sao vừa chụp ở trên VẪN CÒN nhắc tới nó.
  fs.unlinkSync(path.join(UP, 'anh-se-bi-xoa.jpg'));
  const l2 = chayD();
  check('ẢNH VỪA XOÁ VẪN CÒN TRONG BẢN SAO — bản sao cũ hơn còn cần tới nó',
    fs.existsSync(path.join(BKUP, 'anh-se-bi-xoa.jpg')), l2.stdout.slice(-300));
  check('và sổ ghi lại mốc lần đầu thấy nó vắng mặt',
    fs.existsSync(path.join(BK, 'uploads-da-vang.json')));

  // Nay dồn cho mọi bản sao còn giữ đều MỚI HƠN lúc ảnh biến mất. Lúc đó không
  // bản nào nhắc tới tấm ảnh nữa, và chỗ đĩa nó chiếm là chỗ chết.
  const soVang = JSON.parse(fs.readFileSync(path.join(BK, 'uploads-da-vang.json'), 'utf8'));
  check('sổ ghi đúng tên tấm ảnh đã vắng', !!soVang['anh-se-bi-xoa.jpg'], soVang);
  soVang['anh-se-bi-xoa.jpg'] = new Date(Date.now() - 400 * 86400000).toISOString();
  fs.writeFileSync(path.join(BK, 'uploads-da-vang.json'), JSON.stringify(soVang));

  const l3 = chayD();
  check('KHI KHÔNG BẢN SAO NÀO CÒN CẦN, ẢNH TRONG BẢN SAO ĐƯỢC DỌN',
    !fs.existsSync(path.join(BKUP, 'anh-se-bi-xoa.jpg')), l3.stdout.slice(-400));
  check('và nói ra là đã dọn bao nhiêu', /Đã dọn \d+ ảnh/.test(l3.stdout), l3.stdout.slice(-400));

  // Chiều còn lại, quan trọng hơn: ảnh vẫn đang dùng thì tuyệt đối không đụng.
  check('ẢNH CÒN ĐANG DÙNG KHÔNG BAO GIỜ BỊ DỌN',
    fs.existsSync(path.join(BKUP, 'anh-con-dung.jpg')));
  check('và nó vẫn còn nguyên trong thư mục gốc',
    fs.existsSync(path.join(UP, 'anh-con-dung.jpg')));

  // Nói thẳng chuyện bản sao nằm cùng ổ đĩa với dữ liệu gốc.
  check('CẢNH BÁO bản sao nằm cùng ổ đĩa với dữ liệu gốc',
    /CÙNG Ổ ĐĨA/.test(l3.stdout), l3.stdout.slice(-400));
  check('và mách luôn lệnh sao lưu ra nơi khác',
    /--out/.test(l3.stdout), l3.stdout.slice(-400));

  donThuMucTam(D);
}

// ===========================================================================
console.log('\n[7b] KHOÁ GIỮ ẢNH ĐÃ TẢI VỀ — dọn đúng luật vẫn là mất ảnh, nếu trường đang dùng cách khác');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Mục [7] ngay trên canh rằng bản sao của một tấm ảnh ĐƯỢC dọn khi không bản
  // sao nào còn cần tới nó. Luật đó đúng cho việc nó sinh ra: cô xoá một tấm
  // khỏi album thì bản sao của tấm ấy cũng nên đi theo.
  //
  // Nhà trường vừa chốt một cách dùng khác hẳn (Câu 10, duyệt 15/09/2026): khi
  // đĩa máy chủ chạm mốc phải nâng, trường tải ảnh về ổ cứng của trường rồi
  // XOÁ BỚT PHẦN ĐÃ TẢI VỀ trên máy chủ. Tấm ảnh ấy không bị xoá vì hết cần —
  // nó bị xoá vì đã cất sang chỗ khác. Với luật cũ thì đúng một vòng đời sau,
  // máy tự dọn nốt BẢN SAO, và tấm ảnh chỉ còn nằm trên một ổ cứng duy nhất.
  // Ổ đó hỏng là mất hẳn: ảnh là thứ duy nhất trong app không dựng lại được.
  //
  // Nên mục này canh cả hai chiều, và chiều GIỮ đứng trước:
  //   - khoá bật  → ảnh đã vắng mặt từ rất lâu VẪN CÒN trong bản sao;
  //   - khoá tắt  → luật cũ chạy lại y như mục [7], không bị vô hiệu vĩnh viễn.
  const D = thuMucTam('sao-luu-khoa-anh');
  fs.mkdirSync(D, { recursive: true });
  sinhDuLieu(D);
  const UP = path.join(D, 'uploads');
  const BK = path.join(D, 'backups');
  const BKUP = path.join(BK, 'uploads');
  fs.mkdirSync(UP, { recursive: true });
  const chayD = (...a) => spawnSync('node', [path.join(GOC, 'scripts', 'backup.js'), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D } });

  // Lùi mốc "lần đầu thấy vắng mặt" về 400 ngày trước: mọi bản sao còn giữ đều
  // mới hơn mốc đó, nên theo luật cũ tấm ảnh ĐỦ ĐIỀU KIỆN bị dọn. Đây chính là
  // cái bẫy mà khoá phải chặn.
  const luiMoc = (ten) => {
    const p = path.join(BK, 'uploads-da-vang.json');
    const so = JSON.parse(fs.readFileSync(p, 'utf8'));
    so[ten] = new Date(Date.now() - 400 * 86400000).toISOString();
    fs.writeFileSync(p, JSON.stringify(so));
    return so;
  };

  fs.writeFileSync(path.join(UP, 'anh-con-dung.jpg'), 'x'.repeat(600));
  fs.writeFileSync(path.join(UP, 'anh-da-tai-ve.jpg'), 'y'.repeat(600));
  chayD();
  check('bản sao đầu chép cả hai tấm ảnh',
    fs.existsSync(path.join(BKUP, 'anh-con-dung.jpg'))
    && fs.existsSync(path.join(BKUP, 'anh-da-tai-ve.jpg')));

  // ---- Bật khoá ----
  const bat = chayD('--giu-anh');
  check('lệnh bật khoá chạy xong không lỗi', bat.status === 0, (bat.stdout + bat.stderr).slice(0, 300));
  check('nói rõ là ĐÃ BẬT, không im lặng', /ĐÃ BẬT khoá giữ ảnh/.test(bat.stdout), bat.stdout.slice(0, 300));
  check('và cảnh báo luôn cái giá phải trả: chỗ ảnh chỉ tăng',
    /chỉ tăng/.test(bat.stdout), bat.stdout.slice(0, 400));

  // KHOÁ PHẢI LÀ MỘT TỆP, KHÔNG PHẢI THAM SỐ DÒNG LỆNH. Sao lưu chạy theo lịch
  // cron, mà dòng cron thì không ai nhớ sửa — một tham số gõ tay một lần là vô
  // nghĩa với lượt chạy tự động ngay hôm sau.
  check('KHOÁ NẰM TRONG KHO SAO LƯU nên lượt chạy theo lịch cũng thấy',
    fs.existsSync(path.join(BK, 'giu-anh-da-tai-ve.lock')), fs.readdirSync(BK));

  // ---- Trường tải ảnh về ổ ngoài rồi xoá bản gốc ----
  fs.unlinkSync(path.join(UP, 'anh-da-tai-ve.jpg'));
  chayD();
  const so = luiMoc('anh-da-tai-ve.jpg');
  check('sổ có ghi tấm ảnh đã vắng mặt', !!so['anh-da-tai-ve.jpg'], so);

  const l = chayD();
  check('KHOÁ BẬT: ẢNH ĐÃ XOÁ VẪN CÒN TRONG BẢN SAO dù không bản nào còn cần',
    fs.existsSync(path.join(BKUP, 'anh-da-tai-ve.jpg')), l.stdout.slice(-500));
  check('không hề nói đã dọn ảnh nào', !/Đã dọn \d+ ảnh/.test(l.stdout), l.stdout.slice(-500));
  // Một cái khoá im lặng là một cái khoá người ta quên mất đang bật, rồi ngạc
  // nhiên vì đĩa đầy. Nên mỗi lượt sao lưu phải nhắc, và nhắc kèm con số thật.
  check('MỖI LƯỢT SAO LƯU ĐỀU NHẮC là khoá đang bật',
    /Khoá giữ ảnh ĐANG BẬT/.test(l.stdout), l.stdout.slice(-500));
  check('và nhắc kèm số ảnh đang giữ, không phải con số 0 vô nghĩa',
    /giữ lại [1-9]\d* ảnh/.test(l.stdout), l.stdout.slice(-500));
  check('và mách luôn lệnh tắt', /--thoi-giu-anh/.test(l.stdout), l.stdout.slice(-500));

  const ds = chayD('--list');
  check('màn xem danh sách cũng nói trạng thái khoá',
    /Khoá giữ ảnh: ĐANG BẬT/.test(ds.stdout), ds.stdout.slice(-300));

  // Chiều còn lại: khoá chỉ hoãn việc dọn, không được vô hiệu nó vĩnh viễn.
  // Nếu tắt rồi mà vẫn không dọn thì đĩa cứ thế đầy lên, và bài [7] ở trên hoá
  // ra chỉ còn đúng ở một cấu hình duy nhất.
  const tat = chayD('--thoi-giu-anh');
  check('lệnh tắt khoá chạy xong không lỗi', tat.status === 0, (tat.stdout + tat.stderr).slice(0, 300));
  check('và nói thẳng hậu quả: những tấm đã tải về mất chỗ dựa cuối cùng',
    /chỗ dựa cuối cùng/.test(tat.stdout), tat.stdout.slice(0, 500));
  check('tệp khoá được gỡ hẳn',
    !fs.existsSync(path.join(BK, 'giu-anh-da-tai-ve.lock')));

  luiMoc('anh-da-tai-ve.jpg');
  const l2 = chayD();
  check('KHOÁ TẮT: luật dọn cũ chạy lại bình thường',
    !fs.existsSync(path.join(BKUP, 'anh-da-tai-ve.jpg')), l2.stdout.slice(-500));
  check('và không còn nhắc khoá nữa', !/Khoá giữ ảnh ĐANG BẬT/.test(l2.stdout), l2.stdout.slice(-500));

  // Xuyên suốt cả hai chiều, tấm ảnh còn đang dùng không bao giờ bị đụng tới.
  check('ẢNH CÒN ĐANG DÙNG KHÔNG BAO GIỜ BỊ DỌN, dù khoá bật hay tắt',
    fs.existsSync(path.join(BKUP, 'anh-con-dung.jpg'))
    && fs.existsSync(path.join(UP, 'anh-con-dung.jpg')));

  donThuMucTam(D);
}

// ===========================================================================
console.log('\n[8] VÒNG SAO LƯU → MẤT → KHÔI PHỤC PHẢI TRẢ LẠI ĐÚNG BYTE CỦA ẢNH');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Bảy mục trên chỉ đếm số bé trong tệp SQLite. Nhưng ảnh khuôn mặt trẻ, ảnh
  // người được uỷ quyền đón, ảnh Ghi nhanh đều nằm NGOÀI cơ sở dữ liệu, trong
  // `uploads/`. Và ảnh là thứ duy nhất trong cả app KHÔNG DỰNG LẠI ĐƯỢC nếu
  // mất: bé đã lớn, khoảnh khắc đã qua, không ai chụp lại được nữa.
  //
  // `scripts/restore.js` có đoạn chép ảnh từ bản sao về (dòng ~247), nhưng
  // trước mục này không bài nào chạy tới đoạn đó. Nó có thể hỏng hoàn toàn —
  // đổi tên thư mục, đọc nhầm cấp, chép rỗng — mà cả 58 bài của tệp này vẫn
  // xanh. Đúng kiểu "bài canh luôn đúng".
  //
  // Mục này đi trọn vòng đời thật: có ảnh → sao lưu → MẤT SẠCH uploads/ →
  // khôi phục → so từng byte.
  const D = thuMucTam('sao-luu-vong-anh');
  fs.mkdirSync(D, { recursive: true });
  sinhDuLieu(D);
  const UP = path.join(D, 'uploads');
  const chayD = (script, ...a) => spawnSync('node', [path.join(GOC, 'scripts', script), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D } });

  // Ảnh JPEG thật 2x2 pixel — cùng tấm mà test/album.test.mjs dùng, nên đây là
  // byte của một tệp ảnh hợp lệ chứ không phải chuỗi 'x' lặp lại.
  const JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a'
    + 'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEB'
    + 'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh'
    + 'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ'
    + 'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG'
    + 'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=', 'base64');
  const TEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90.jpg';   // đúng dạng tên thật: 16 byte ngẫu nhiên
  fs.mkdirSync(UP, { recursive: true });
  fs.writeFileSync(path.join(UP, TEN), JPEG);

  const l1 = chayD('backup.js');
  check('sao lưu chạy xong khi có ảnh trong uploads/', l1.status === 0, (l1.stdout + l1.stderr).slice(-300));

  // MẤT SẠCH — ổ hỏng, xoá nhầm, container dựng lại mà DATA_DIR trỏ vào chỗ trống.
  fs.rmSync(UP, { recursive: true, force: true });
  check('đã xoá sạch uploads/ để giả lập mất ảnh', !fs.existsSync(path.join(UP, TEN)));

  // Làm hỏng luôn cơ sở dữ liệu để restore.js đi đúng đường thật của nó.
  {
    const db = new Database(path.join(D, 'school.db'));
    db.pragma('foreign_keys = OFF');
    db.exec('DELETE FROM students');
    db.close();
  }

  const l2 = chayD('restore.js');
  const chu2 = l2.stdout + l2.stderr;
  check('khôi phục chạy xong không lỗi', l2.status === 0, chu2.slice(-400));
  check('ẢNH QUAY LẠI SAU KHI KHÔI PHỤC', fs.existsSync(path.join(UP, TEN)),
    fs.existsSync(UP) ? fs.readdirSync(UP) : 'không có thư mục uploads/');
  check('VÀ QUAY LẠI ĐÚNG TỪNG BYTE, không phải một tệp rỗng cùng tên',
    fs.existsSync(path.join(UP, TEN)) && fs.readFileSync(path.join(UP, TEN)).equals(JPEG),
    fs.existsSync(path.join(UP, TEN)) ? fs.statSync(path.join(UP, TEN)).size : null);
  check('và nói ra là đã khôi phục bao nhiêu ảnh', /Khôi phục thêm \d+ ảnh/.test(chu2), chu2.slice(-400));

  // --- Chiều ngược: ảnh đang có mà KHÁC bản sao thì phải NÓI RA -------------
  //
  // restore.js cố ý không đè lên tệp đã có. Chọn vậy là đúng: tên tệp là 16 byte
  // ngẫu nhiên nên trùng tên nghĩa là trùng ảnh, mà bản trên đĩa có thể mới hơn
  // bản sao. Nhưng im lặng bỏ qua thì người vận hành — đang khôi phục vì nghi
  // dữ liệu hỏng — không hề biết còn một tấm ảnh chưa được chữa.
  fs.writeFileSync(path.join(UP, TEN), Buffer.from('hong'));   // tệp cụt, coi như hỏng
  const l3 = chayD('restore.js');
  const chu3 = l3.stdout + l3.stderr;
  check('khôi phục lần hai vẫn chạy xong', l3.status === 0, chu3.slice(-400));
  check('KHÔNG ĐÈ LÊN TỆP ĐANG CÓ — bản trên đĩa có thể mới hơn bản sao',
    fs.readFileSync(path.join(UP, TEN)).toString() === 'hong',
    fs.statSync(path.join(UP, TEN)).size);
  check('NHƯNG NÓI RA LÀ CÓ ẢNH KHÁC VỚI BẢN SAO, không im lặng bỏ qua',
    /khác với bản sao/i.test(chu3), chu3.slice(-500));
  check('và chỉ đúng tên tấm ảnh đó để người vận hành soi được',
    chu3.includes(TEN), chu3.slice(-500));

  donThuMucTam(D);
}

console.log('\n[9] KHÔI PHỤC TỪ BẢN SAO Ở Ổ NGOÀI — đúng ca mà bản sao ra ổ ngoài sinh ra để cứu');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `backup.js` in ra lời khuyên chạy thêm một lần ra ổ ngoài (`--out`), và cả
  // `docs/TRIEN-KHAI.md` lẫn `docs/SAO-LUU.md` đều dạy như vậy. Nhưng đường
  // khôi phục lại đóng cứng thư mục ảnh vào `DATA_DIR/backups`. Nên khôi phục
  // từ ổ ngoài — đúng kịch bản "ổ VPS hỏng" — thì CƠ SỞ DỮ LIỆU về đủ, còn ẢNH
  // thì KHÔNG một tấm nào, mà script vẫn in "Đã khôi phục xong".
  //
  // Mục [8] không bắt được vì nó chỉ đi đường mặc định. Đây đúng là chỗ "bài
  // canh bao phủ thiếu đúng chỗ nguy hiểm".
  const D9 = thuMucTam('sao-luu-o-ngoai');
  const O_NGOAI = thuMucTam('sao-luu-usb');
  fs.mkdirSync(D9, { recursive: true });
  fs.mkdirSync(O_NGOAI, { recursive: true });
  sinhDuLieu(D9);
  const UP9 = path.join(D9, 'uploads');
  const chay9 = (script, ...a) => spawnSync('node', [path.join(GOC, 'scripts', script), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D9 } });

  const ANH9 = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const TEN9 = 'b1c2d3e4f5061728394a5b6c7d8e9f01.png';
  fs.mkdirSync(UP9, { recursive: true });
  fs.writeFileSync(path.join(UP9, TEN9), ANH9);

  // Sao lưu RA Ổ NGOÀI, đúng lệnh mà backup.js và tài liệu khuyên.
  const b9 = chay9('backup.js', '--out', O_NGOAI);
  check('sao lưu ra ổ ngoài chạy xong', b9.status === 0, (b9.stdout + b9.stderr).slice(-300));
  const tepBanSao = fs.existsSync(O_NGOAI)
    ? fs.readdirSync(O_NGOAI).filter(f => f.endsWith('.db.gz')).sort().pop() : null;
  check('có tệp .db.gz nằm ở ổ ngoài', !!tepBanSao, fs.existsSync(O_NGOAI) ? fs.readdirSync(O_NGOAI) : null);
  check('và ẢNH cũng được chép ra ổ ngoài — nếu không thì cả mục này vô nghĩa',
    fs.existsSync(path.join(O_NGOAI, 'uploads', TEN9)),
    fs.existsSync(path.join(O_NGOAI, 'uploads')) ? fs.readdirSync(path.join(O_NGOAI, 'uploads')) : 'không có');

  // Ổ VPS hỏng: mất sạch ảnh, mất sạch bé, và mất luôn thư mục backups nội bộ.
  fs.rmSync(UP9, { recursive: true, force: true });
  fs.rmSync(path.join(D9, 'backups'), { recursive: true, force: true });
  {
    const db = new Database(path.join(D9, 'school.db'));
    db.pragma('foreign_keys = OFF');
    db.exec('DELETE FROM students');
    db.close();
  }

  const r9 = chay9('restore.js', path.join(O_NGOAI, tepBanSao || 'x.db.gz'));
  const chu9 = r9.stdout + r9.stderr;
  check('khôi phục từ ổ ngoài chạy xong không lỗi', r9.status === 0, chu9.slice(-400));

  // Vế đối chứng: cơ sở dữ liệu PHẢI về đủ. Không có phép kiểm này thì phép
  // kiểm ảnh bên dưới xanh cả khi cả lệnh khôi phục hỏng hoàn toàn.
  {
    const db = new Database(path.join(D9, 'school.db'));
    const n = db.prepare('SELECT COUNT(*) c FROM students').get().c;
    db.close();
    check('cơ sở dữ liệu về đủ số bé', n > 0, n);
  }

  check('ẢNH CŨNG QUAY LẠI khi khôi phục từ ổ ngoài',
    fs.existsSync(path.join(UP9, TEN9)),
    fs.existsSync(UP9) ? fs.readdirSync(UP9) : 'không có thư mục uploads/');
  check('và đúng từng byte', fs.existsSync(path.join(UP9, TEN9))
    && fs.readFileSync(path.join(UP9, TEN9)).equals(ANH9));

  // ---- VÀ KHI THẬT SỰ KHÔNG TÌM THẤY ẢNH THÌ PHẢI NÓI RA ----
  //
  // Bản vá trên cứu được ca ảnh nằm cạnh tệp bản sao. Lời cảnh báo này cứu
  // những ca nó không với tới — và nó là thứ duy nhất đứng giữa người vận hành
  // với câu "Đã khôi phục xong" mà họ sẽ tin.
  const D10 = thuMucTam('sao-luu-thieu-anh');
  fs.mkdirSync(D10, { recursive: true });
  sinhDuLieu(D10);
  const LE = thuMucTam('sao-luu-le-loi');
  fs.mkdirSync(LE, { recursive: true });
  fs.copyFileSync(path.join(O_NGOAI, tepBanSao), path.join(LE, tepBanSao));  // CHỈ chép .db.gz
  const r10 = spawnSync('node', [path.join(GOC, 'scripts', 'restore.js'), path.join(LE, tepBanSao)],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D10 } });
  const chu10 = r10.stdout + r10.stderr;
  check('không tìm thấy ảnh thì NÓI RA, không im lặng',
    /KHÔNG tìm thấy thư mục ảnh/.test(chu10), chu10.slice(-500));
  check('và nói rõ hậu quả bằng tiếng người vận hành hiểu',
    /ô ảnh vỡ|ẢNH thì CHƯA/.test(chu10), chu10.slice(-500));
  check('và chỉ đúng chỗ đã tìm', new RegExp('Đã tìm ở').test(chu10), chu10.slice(-500));

  // Cờ --anh cứu nốt ca đó, và KHÔNG được nuốt mất tên tệp bản sao.
  const r11 = spawnSync('node', [path.join(GOC, 'scripts', 'restore.js'),
    '--anh', path.join(O_NGOAI, 'uploads'), path.join(LE, tepBanSao)],
  { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D10 } });
  check('cờ --anh chạy xong không lỗi', r11.status === 0, (r11.stdout + r11.stderr).slice(-400));
  check('và mang ảnh về từ thư mục được chỉ',
    fs.existsSync(path.join(D10, 'uploads', TEN9)),
    fs.existsSync(path.join(D10, 'uploads')) ? fs.readdirSync(path.join(D10, 'uploads')) : 'không có');

  donThuMucTam(D9); donThuMucTam(O_NGOAI); donThuMucTam(D10); donThuMucTam(LE);
}

// ===========================================================================
// `restore:check` LÀ THỨ NÓI "BẢN SAO DÙNG ĐƯỢC" — NÊN NÓ PHẢI BIẾT VỀ ẢNH.
//
// Mục [8] và [9] canh đường KHÔI PHỤC THẬT: chỗ đó đã nói rất to khi thiếu
// ảnh. Nhưng nhánh `--kiem-tra` thì trước đây không nói một chữ nào về ảnh —
// nó giải nén tệp .db.gz, đếm người và bé, rồi in ra một câu trấn an.
//
// Và `scripts/kiem-tra-may-chu.js` đọc đúng kết quả của nhánh ấy rồi kết luận
// "giải nén và đọc thử thành công — bản sao dùng được thật". Nên một thư mục
// ảnh trống đi qua được CẢ HAI lớp canh mà không ai biết, cho tới ngày cần
// khôi phục thật.
console.log('\n[11] --kiem-tra phải soát cả ẢNH, không chỉ tệp .db.gz');
{
  const D11 = thuMucTam('sao-luu-kiem-anh');
  fs.mkdirSync(D11, { recursive: true });
  sinhDuLieu(D11);

  const chay11 = (...args) => spawnSync('node',
    [path.join(GOC, 'scripts', 'restore.js'), ...args],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D11 } });

  // Dựng một tấm ảnh thật rồi cho cơ sở dữ liệu trỏ tới nó, để bản sao có ảnh.
  const TEN11 = 'anh-kiem-tra-11.jpg';
  fs.mkdirSync(path.join(D11, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(D11, 'uploads', TEN11), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  {
    const db = new Database(path.join(D11, 'school.db'));
    db.prepare("INSERT OR REPLACE INTO albums (id, title, classId, date) VALUES ('alb11','Thử ảnh','c1',?)")
      .run(HOM_NAY());
    db.prepare("INSERT OR REPLACE INTO album_photos (id, albumId, file, position) VALUES ('ap11','alb11',?,0)")
      .run(TEN11);
    db.close();
  }

  const sao = spawnSync('node', [path.join(GOC, 'scripts', 'backup.js')],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: D11 } });
  check('dựng được bản sao có kèm ảnh', sao.status === 0, (sao.stdout + sao.stderr).slice(-300));

  const co = chay11('--kiem-tra');
  const chuCo = co.stdout + co.stderr;
  check('CÓ ẢNH: --kiem-tra chạy xong không lỗi', co.status === 0, chuCo.slice(-400));
  check('CÓ ẢNH: nói ra số tệp ảnh có thật', /ẢNH:\s*1 tệp/.test(chuCo), chuCo.slice(-500));
  check('CÓ ẢNH: và nói cơ sở dữ liệu đang trỏ tới bao nhiêu ảnh',
    /cơ sở dữ liệu đang trỏ tới\s*1 ảnh/.test(chuCo), chuCo.slice(-500));
  check('CÓ ẢNH: KHÔNG cảnh báo oan', !/KHÔNG KÈM MỘT TẤM ẢNH NÀO/.test(chuCo), chuCo.slice(-400));

  // Giờ dựng đúng tình huống hỏng: bản sao chỉ còn tệp .db.gz, ảnh thì không.
  fs.rmSync(path.join(D11, 'backups', 'uploads'), { recursive: true, force: true });
  const khong = chay11('--kiem-tra');
  const chuKhong = khong.stdout + khong.stderr;
  check('MẤT ẢNH: vẫn chạy xong, không nổ', khong.status === 0, chuKhong.slice(-400));
  check('MẤT ẢNH: NÓI RA rằng bản sao không kèm tấm ảnh nào',
    /KHÔNG KÈM MỘT TẤM ẢNH NÀO/.test(chuKhong), chuKhong.slice(-600));
  check('MẤT ẢNH: nói rõ hậu quả bằng tiếng người vận hành hiểu',
    /ô vỡ/.test(chuKhong), chuKhong.slice(-600));
  check('MẤT ẢNH: và chỉ đúng cách chữa', /--anh/.test(chuKhong), chuKhong.slice(-600));

  // ĐỐI CHỨNG: cảnh báo phải là CẢNH BÁO, không phải lỗi. Bản sao thiếu ảnh
  // vẫn là bản sao khôi phục được — chặn hẳn ở đây là chặn nhầm.
  check('MẤT ẢNH: vẫn kết luận tệp .db.gz là dùng được',
    /Kiểm tra toàn vẹn: đạt/.test(chuKhong), chuKhong.slice(0, 300));

  donThuMucTam(D11);
}

donThuMucTam(DIR);
tongKet();
