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
import { GOC, taoBoDem, thuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { soiTep } = require(path.join(GOC, 'scripts', 'kiem-tra-du-lieu.js'));
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

  fs.rmSync(kho, { recursive: true, force: true });
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

tongKet();
