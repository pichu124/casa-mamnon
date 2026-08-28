// Kiểm thử bộ canh "dữ liệu thật không được lên kho mã".
//
// Chạy bằng:  npm run test:du-lieu
//
// Hồ sơ 300 học sinh lộ lên GitHub là loại sự cố không sửa được bằng mã: viết
// lại lịch sử git cũng không xóa được thứ người khác đã tải về. Nên bài này
// kiểm cả ba lớp chặn: .gitignore, bộ canh lúc commit, và việc git không còn
// theo dõi tệp dữ liệu nào nữa.
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam, donThuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { soiTep, quetKho } = require(path.join(GOC, 'scripts', 'kiem-tra-du-lieu.js'));
const { check, tongKet } = taoBoDem();
const git = (...a) => execFileSync('git', a, { cwd: GOC, encoding: 'utf8' });

console.log('\n[1] Nhận diện tệp dữ liệu');
{
  const chan = (tep) => soiTep([tep]).length === 1;

  check('cơ sở dữ liệu chính', chan('data/school.db'));
  check('tệp đi kèm của SQLite (-wal, -shm)',
    chan('data/school.db-wal') && chan('data/school.db-shm'));
  check('cơ sở dữ liệu đặt ở thư mục khác', chan('bien-ban/du-lieu.sqlite'));
  check('cơ sở dữ liệu đặt ngay gốc kho mã', chan('school.db'));
  check('bản sao lưu đánh số', chan('data/school.db.3'));
  check('ảnh học sinh đã tải lên', chan('data/uploads/a1b2c3.jpg'));
  check('thư mục sao lưu', chan('data/backups/2026-08-14.db'));
  check('bản lưu trước khi khôi phục', chan('data/.khoi-phuc-1786636306300.db-shm'));
  // TÊN CHÍNH XÁC MÀ scripts/restore.js ĐỂ LẠI. Bộ canh từng bỏ lọt tên này:
  // mẫu cũ đòi tên KẾT THÚC bằng `.db`, `-wal`, `-shm` hoặc một con số, mà tên
  // này còn cả một cụm chữ phía sau. `.gitignore` với `*.db` cũng không khớp.
  // Tức một bản sao NGUYÊN VẸN hồ sơ cả trường nằm trong thư mục làm việc, git
  // nhìn thấy, và bộ canh nói "sạch" — đúng lúc người ta đang thao tác vội.
  check('BẢN GIỮ LẠI CỦA LỆNH KHÔI PHỤC (tên thật restore.js sinh ra)',
    chan('data/school.db.truoc-khi-khoi-phuc-1756000000000'));
  check('kể cả khi nó nằm ngay gốc kho mã',
    chan('school.db.truoc-khi-khoi-phuc-1756000000000'));
  check('và bản chép tay đặt tên kiểu khác cũng bị chặn',
    chan('data/school.db.bak') && chan('data/school.db.2026-08-28'));
  check('kho JSON đời cũ', chan('data/db.json') && chan('data/sessions.json'));
  check('tệp bí mật .env', chan('.env') && chan('.env.production'));
  check('khóa ký ứng dụng Android', chan('android/app/khoa.jks'));
  check('danh sách học sinh dạng CSV trong data/', chan('data/danh-sach-lop-3a.csv'));

  // Không được chặn nhầm những thứ hằng ngày, nếu không sẽ bị vô hiệu hóa.
  const choQua = (tep) => soiTep([tep]).length === 0;
  check('mã nguồn thường → cho qua', choQua('routes/attendance.js'));
  check('tài liệu → cho qua', choQua('docs/SAO-LUU.md'));
  check('data/seed.js (mã sinh dữ liệu mẫu) → cho qua', choQua('data/seed.js'));
  check('tệp trong test/ → cho qua', choQua('test/album.test.mjs'));
  check('tệp CSV mẫu kèm hướng dẫn → cho qua', choQua('docs/mau-danh-sach.csv'));
  check('tên tệp có chữ "db" nhưng không phải CSDL → cho qua', choQua('lib/db.js'));
  // Mẫu mới rộng hơn hẳn mẫu cũ, nên phải kiểm cả chiều KHÔNG chặn nhầm —
  // một bộ canh chặn cả mã nguồn thì lần sau người ta tắt nó đi.
  check('mã nguồn có chữ "db" trong đường dẫn → cho qua',
    choQua('lib/db-nang-cap.js') && choQua('scripts/migrate-json-to-sqlite.js'));
  check('không nhầm chữ "uploads" trong tên tệp', choQua('lib/uploads.js'));
}

console.log('\n[2] .gitignore chặn thật');
{
  const bichan = (tep) => {
    const r = spawnSync('git', ['check-ignore', '-q', tep], { cwd: GOC });
    return r.status === 0;
  };
  check('data/school.db bị .gitignore chặn', bichan('data/school.db'));
  check('ảnh đã tải lên bị chặn', bichan('data/uploads/x.jpg'));
  check('bản sao lưu bị chặn', bichan('data/backups/x.db'));
  check('tệp dữ liệu tên lạ trong data/ cũng bị chặn', bichan('data/gi-do-moi.dat'));
  check('.env bị chặn', bichan('.env'));
  check('data/seed.js KHÔNG bị chặn', !bichan('data/seed.js'));
  check('bản giữ lại của lệnh khôi phục cũng bị .gitignore chặn',
    bichan('data/school.db.truoc-khi-khoi-phuc-1756000000000'));
}

console.log('\n[3] Git không còn theo dõi tệp dữ liệu nào');
{
  const dangTheoDoi = git('ls-files').split('\n').map(s => s.trim()).filter(Boolean);
  const dinh = soiTep(dangTheoDoi);
  check('không tệp dữ liệu nào đang được git theo dõi', dinh.length === 0,
    dinh.map(d => d.tep));
  check('data/ chỉ còn seed.js',
    git('ls-files', 'data/').trim() === 'data/seed.js', git('ls-files', 'data/').trim());
}

console.log('\n[4] Chặn thật khi commit, kể cả khi cố tình ép bằng git add -f');
{
  const kho = thuMucTam('du-lieu');
  fs.mkdirSync(path.join(kho, 'data'), { recursive: true });
  fs.mkdirSync(path.join(kho, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(kho, '.githooks'), { recursive: true });
  const g = (...a) => execFileSync('git', a, { cwd: kho, encoding: 'utf8' });
  const thu = (fn) => {
    try { fn(); return { ok: true }; }
    catch (err) { return { ok: false, loi: (err.stdout || '') + (err.stderr || '') }; }
  };

  g('init', '-q');
  g('config', 'user.email', 'kiemthu@example.com');
  g('config', 'user.name', 'Kiem Thu');
  for (const t of ['kiem-tra-du-lieu.js', 'kiem-tra-commit.js']) {
    fs.copyFileSync(path.join(GOC, 'scripts', t), path.join(kho, 'scripts', t));
  }
  fs.copyFileSync(path.join(GOC, '.githooks', 'commit-msg'), path.join(kho, '.githooks', 'commit-msg'));
  fs.chmodSync(path.join(kho, '.githooks', 'commit-msg'), 0o755);
  fs.copyFileSync(path.join(GOC, '.gitignore'), path.join(kho, '.gitignore'));
  g('config', 'core.hooksPath', '.githooks');

  fs.writeFileSync(path.join(kho, 'README.md'), '# thử\n');
  g('add', '-A');
  check('commit bình thường vẫn đi qua', thu(() => g('commit', '-q', '-m', 'khởi tạo')).ok);

  // Giả lập cơ sở dữ liệu thật của trường.
  fs.writeFileSync(path.join(kho, 'data', 'school.db'), 'DỮ LIỆU HỌC SINH THẬT');
  const tuNhien = thu(() => g('add', '-A'));
  check('git add -A KHÔNG nhặt tệp dữ liệu (nhờ .gitignore)',
    tuNhien.ok && !g('diff', '--cached', '--name-only').includes('school.db'));

  // Cố tình ép — đây là chỗ .gitignore hết tác dụng và bộ canh phải đỡ.
  g('add', '-f', 'data/school.db');
  check('git add -f ép được vào vùng chờ (nên .gitignore là chưa đủ)',
    g('diff', '--cached', '--name-only').includes('data/school.db'));

  const bichan = thu(() => g('commit', '-q', '-m', 'thêm dữ liệu'));
  check('commit CÓ dữ liệu → BỊ CHẶN', !bichan.ok, 'đã lọt qua');
  check('báo lỗi nêu đúng tệp', /data\/school\.db/.test(bichan.loi || ''), bichan.loi?.slice(0, 150));
  check('báo lỗi giải thích vì sao nguy hiểm',
    /trẻ em|nhạy cảm|13\/2023/i.test(bichan.loi || ''), bichan.loi?.slice(0, 200));
  check('báo lỗi chỉ cách gỡ ra', /git reset|git rm --cached/.test(bichan.loi || ''));
  check('báo lỗi mách cách chạy đúng khi triển khai',
    /DATA_DIR=/.test(bichan.loi || ''), bichan.loi?.slice(0, 200));

  // Không có đường thoát — khác hẳn bộ canh commit riêng.
  const epThoat = thu(() => g('commit', '-q', '-m', 'thêm dữ liệu\n\nTron-co-y: tôi biết tôi đang làm gì'));
  check('KHÔNG có đường thoát, dòng Tron-co-y cũng không cứu được', !epThoat.ok, 'đã lọt qua');

  // Gỡ ra thì commit lại được ngay.
  g('reset', '-q', 'data/school.db');
  fs.writeFileSync(path.join(kho, 'README.md'), '# thử\nthêm dòng\n');
  g('add', 'README.md');
  check('gỡ tệp dữ liệu ra thì commit lại được', thu(() => g('commit', '-q', '-m', 'sửa readme')).ok);
  check('tệp dữ liệu vẫn còn nguyên trên đĩa, không bị xóa',
    fs.readFileSync(path.join(kho, 'data', 'school.db'), 'utf8') === 'DỮ LIỆU HỌC SINH THẬT');

  donThuMucTam(kho);
}

console.log('\n[5] Bộ canh hỏng thì CHẶN, không cho qua');
{
  const kq = spawnSync('node',
    [path.join(GOC, 'scripts', 'kiem-tra-du-lieu.js'), '--khoang', 'ma-khong-co-that..HEAD'],
    { cwd: GOC, encoding: 'utf8' });
  check('không kiểm tra được thì chặn (mã thoát khác 0)', kq.status !== 0, kq.status);
  check('nói rõ vì sao chặn',
    /chặn commit để an toàn/i.test(kq.stdout + kq.stderr), (kq.stdout + kq.stderr).slice(0, 150));
}

console.log('\n[6] Tệp dữ liệu LẠC trong kho mã — thứ .gitignore giấu đi');
{
  // VÌ SAO CÓ MỤC NÀY
  //
  // Bốn mục trên đều canh đường vào git. Nhưng có một lối rò mà chúng không bao
  // giờ thấy: tệp dữ liệu nằm ngay trong kho mã và bị .gitignore GIẤU ĐI. Nó
  // không hiện trong `git status`, không vào commit nào — nên ai cũng tưởng là
  // không có, kể cả người đang đi soát.
  //
  // Đã xảy ra thật ở kho này: một `undefined/school.db` 520 KB với hồ sơ 8 bé
  // nằm im nhiều ngày, do một bài kiểm thử đặt DATA_DIR thành chuỗi "undefined".
  // Cả `npm test` lẫn `git status` đều xanh trong suốt thời gian đó.
  check('hiện tại kho mã sạch — không có tệp dữ liệu nào nằm lạc',
    quetKho().length === 0, quetKho().map(d => `${d.tep} (${d.loai})`));

  // Phép thử ngược: một bài canh luôn xanh là một bài canh vô dụng.
  const kho = thuMucTam('quet-kho');
  fs.mkdirSync(path.join(kho, 'undefined'), { recursive: true });
  fs.writeFileSync(path.join(kho, 'undefined', 'school.db'), 'DỮ LIỆU CỦA BÉ');
  fs.mkdirSync(path.join(kho, 'routes'), { recursive: true });
  fs.writeFileSync(path.join(kho, 'routes', 'attendance.js'), 'module.exports = {};');
  const bat = quetKho(kho);
  check('bắt được cơ sở dữ liệu nằm ở thư mục lạ',
    bat.length === 1 && bat[0].tep === 'undefined/school.db', bat);
  check('KHÔNG bắt nhầm mã nguồn thường', !bat.some(d => d.tep.endsWith('.js')), bat);

  // data/ được bỏ qua CÓ CHỦ Ý: đó là chỗ máy chủ tự đặt dữ liệu khi chạy thử
  // không đặt DATA_DIR, và server.js đã có lời nhắc riêng cho nó. Mục này đi tìm
  // thứ NẰM SAI CHỖ — thứ không ai chờ đợi nên không ai đi dọn.
  fs.mkdirSync(path.join(kho, 'data'), { recursive: true });
  fs.writeFileSync(path.join(kho, 'data', 'school.db'), 'DỮ LIỆU CHẠY THỬ');
  check('data/ được bỏ qua có chủ ý — server.js đã nhắc riêng chỗ đó',
    quetKho(kho).length === 1, quetKho(kho));
  donThuMucTam(kho);

  // Chạy qua dòng lệnh cũng phải chặn được, vì đó là cách người ta dùng thật.
  const kq = spawnSync('node',
    [path.join(GOC, 'scripts', 'kiem-tra-du-lieu.js'), '--quet-kho'],
    { cwd: GOC, encoding: 'utf8' });
  check('lệnh --quet-kho chạy được và báo sạch', kq.status === 0,
    (kq.stdout + kq.stderr).slice(0, 200));
}

console.log('\n[7] .dockerignore chặn đúng những gì .gitignore chặn');
{
  // VÌ SAO
  //
  // `docker build` KHÔNG đọc .gitignore. `COPY . .` đóng gói mọi thứ trong thư
  // mục, kể cả tệp mà .gitignore đang giấu. Ảnh đó đẩy lên registry rồi kéo về
  // mọi máy chủ — lộ rộng hơn cả đẩy nhầm lên GitHub, mà lại lặng lẽ hơn.
  //
  // Bản .dockerignore cũ chỉ chặn `data/db.json` và `data/sessions.json` của
  // thời kho JSON. Từ khi chuyển sang SQLite, `data/school.db` KHÔNG bị chặn.
  const chu = fs.readFileSync(path.join(GOC, '.dockerignore'), 'utf8');
  const dong = chu.split('\n').map(d => d.trim()).filter(d => d && !d.startsWith('#'));

  // Đúng những loại mà scripts/kiem-tra-du-lieu.js gọi là dữ liệu của trường.
  const PHAI_CO = [
    'data/*', '*.db', '*.db-wal', '*.db-shm', '*.sqlite', '*.sqlite3',
    'uploads/', 'backups/', '.khoi-phuc-*', 'db.json*', 'sessions.json*',
    '.env', '.env.*', '*.pem', '*.key', '*.p12',
  ];
  for (const mau of PHAI_CO) {
    check(`chặn ${mau}`, dong.includes(mau), dong);
  }
  check('vẫn cho data/seed.js vào ảnh (đó là mã nguồn, không phải dữ liệu)',
    dong.includes('!data/seed.js'), dong);

  // Hai tệp phải nói cùng một chuyện. Quên đồng bộ là lối rò quay lại ngay.
  const gitig = fs.readFileSync(path.join(GOC, '.gitignore'), 'utf8')
    .split('\n').map(d => d.trim()).filter(d => d && !d.startsWith('#'));
  const thieu = gitig
    .filter(d => !d.startsWith('!'))
    .filter(d => /\.db|\.sqlite|uploads|backups|khoi-phuc|db\.json|sessions\.json|\.env|\.pem|\.key|\.p12|jks|keystore/.test(d))
    .filter(d => !dong.includes(d.replace(/^\//, '')));
  check('mọi loại dữ liệu .gitignore chặn thì .dockerignore cũng chặn',
    thieu.length === 0, thieu);
}


console.log('\n[8] Mọi chỗ đều chỉ về CÙNG MỘT thư mục dữ liệu');
{
  // VÌ SAO
  //
  // Người vận hành đọc lời nhắc của `server.js`, tạo `/var/lib/casa-mamnon`,
  // rồi chạy một script khác mà phần hướng dẫn của nó ghi
  // `/var/lib/schoolconnect`. Kết quả: script mở một cơ sở dữ liệu TRỐNG và
  // báo mọi thứ đều sạch. Nhầm lẫn này xảy ra đúng lúc đang chữa cháy, và nó
  // trấn an sai — tệ hơn là báo lỗi.
  const nguon = ['server.js', ...fs.readdirSync(path.join(GOC, 'scripts'))
    .filter(f => f.endsWith('.js'))
    // scripts/xuat-quy-trinh.js là NỘI DUNG tài liệu triển khai của app 1, đã
    // dán cảnh báo "chưa cập nhật cho app 2" ở trang đầu (N1). Sửa đường dẫn
    // trong đó là làm nó TRÔNG như đã cập nhật trong khi quy trình thì chưa.
    .filter(f => f !== 'xuat-quy-trinh.js')
    .map(f => `scripts/${f}`)];

  const thay = new Map();
  for (const tep of nguon) {
    const chu = fs.readFileSync(path.join(GOC, tep), 'utf8');
    for (const m of chu.matchAll(/\/var\/lib\/([a-z0-9-]+)/g)) {
      if (!thay.has(m[1])) thay.set(m[1], []);
      if (!thay.get(m[1]).includes(tep)) thay.get(m[1]).push(tep);
    }
  }
  check('máy chủ và mọi script chỉ nói về đúng một thư mục dữ liệu',
    thay.size <= 1, [...thay].map(([ten, ts]) => `${ten}: ${ts.join(', ')}`));
  check('và đó là thư mục mang tên app 2', thay.size === 0 || thay.has('casa-mamnon'),
    [...thay.keys()]);
}

console.log('\n[9] Lệnh chuyển dữ liệu ra ngoài KHÔNG được cuốn theo mã nguồn');
{
  // `mv <DATA_DIR>/* <đích>/` là lệnh trông thì gọn, nhưng khi DATA_DIR là
  // `data/` trong kho mã thì nó cuốn luôn `data/seed.js` — tệp mã nguồn duy
  // nhất nằm trong đó. Người vận hành làm theo lời nhắc, và tự tay làm hỏng
  // kho mã ngay giữa lúc đang sửa một chuyện khác.
  const chu = fs.readFileSync(path.join(GOC, 'server.js'), 'utf8');
  check('không mách lệnh `mv .../data/*`', !/mv \$\{db\.DATA_DIR\}\/\*/.test(chu),
    (chu.match(/.*mv .*/g) || []).slice(0, 4));
  check('vẫn có mách lệnh chuyển tệp cũ sang', /mv \$\{db\.DATA_DIR\}\//.test(chu));
  check('nói rõ vì sao phải chuyển đích danh', /seed\.js/.test(chu));
}


tongKet();
