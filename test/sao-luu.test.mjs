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
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu } from './_chung.mjs';

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

donThuMucTam(DIR);
tongKet();
