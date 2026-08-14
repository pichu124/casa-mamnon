// Kiểm thử bộ canh "sửa tệp dùng chung phải là commit riêng".
//
// Chạy bằng:  npm run test:commit-rieng-kiemthu
//
// Bản thân bộ canh cũng là mã, cũng hỏng được. Nếu nó hỏng theo hướng luôn cho
// qua thì không ai biết — quy định coi như biến mất trong im lặng. Bài này dựng
// một kho git thật trong thư mục tạm rồi thử commit đủ các tình huống.
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { phanLoai } = require(path.join(GOC, 'scripts', 'kiem-tra-commit.js'));
const { check, tongKet } = taoBoDem();

console.log('\n[1] Phân loại tệp');
{
  const chung = phanLoai(['lib/db.js']);
  check('sửa mỗi tệp dùng chung → cho qua', !chung.tron, chung);

  const tinhNang = phanLoai(['routes/attendance.js', 'public/js/views/attendance.js']);
  check('sửa mỗi tệp tính năng → cho qua', !tinhNang.tron, tinhNang);

  check('trộn lib/db.js với một route → chặn', phanLoai(['lib/db.js', 'routes/bus.js']).tron);
  check('trộn UI.js với một view → chặn',
    phanLoai(['public/js/ui.js', 'public/js/views/bus.js']).tron);
  check('trộn lib/auth.js với phân hệ cắm thêm → chặn',
    phanLoai(['lib/auth.js', 'modules/hocphi/routes.js']).tron);
  check('trộn app.js với route → chặn', phanLoai(['public/js/app.js', 'routes/menu.js']).tron);

  check('tài liệu và kiểm thử không tính là tệp tính năng',
    !phanLoai(['lib/db.js', 'README.md', 'docs/TIEN-DO.md', 'test/api.test.mjs']).tron);
  check('thêm một tính năng lõi mới (đăng ký + route + view) → cho qua',
    !phanLoai(['lib/modules.js', 'routes/hocba.js', 'public/js/views/hocba.js',
      'public/index.html', 'public/sw.js']).tron,
    'nếu chặn ở đây thì quy định sẽ bị vô hiệu hóa vì cản trở việc bình thường');
  check('sửa lược đồ và một route → cho qua',
    !phanLoai(['lib/schema.sql', 'routes/health.js']).tron);
}

console.log('\n[2] Chặn thật khi commit trong một kho git');
{
  const kho = thuMucTam('commit-rieng');
  fs.mkdirSync(kho, { recursive: true });
  const git = (...a) => execFileSync('git', a, { cwd: kho, encoding: 'utf8' });

  git('init', '-q');
  git('config', 'user.email', 'kiemthu@example.com');
  git('config', 'user.name', 'Kiem Thu');

  // Dựng đủ cấu trúc để bộ canh nhận ra tệp, và trỏ móc về kho mã thật.
  for (const d of ['lib', 'routes', 'public/js', 'public/js/views', 'scripts', '.githooks']) {
    fs.mkdirSync(path.join(kho, d), { recursive: true });
  }
  fs.copyFileSync(path.join(GOC, 'scripts', 'kiem-tra-commit.js'),
    path.join(kho, 'scripts', 'kiem-tra-commit.js'));
  fs.copyFileSync(path.join(GOC, '.githooks', 'commit-msg'),
    path.join(kho, '.githooks', 'commit-msg'));
  fs.chmodSync(path.join(kho, '.githooks', 'commit-msg'), 0o755);
  git('config', 'core.hooksPath', '.githooks');

  fs.writeFileSync(path.join(kho, 'lib', 'db.js'), '// nền\n');
  fs.writeFileSync(path.join(kho, 'routes', 'bus.js'), '// tính năng\n');
  git('add', '-A');
  // Commit đầu tiên có cả hai loại, nhưng đây là lúc dựng kho nên phải cho qua
  // bằng đường thoát — cũng chính là dịp kiểm tra đường thoát có hoạt động không.
  const dauTien = thu(() => git('commit', '-q', '-m', 'dựng kho [tron-co-y] khởi tạo'));
  check('đường thoát [tron-co-y] cho commit đi qua', dauTien.ok, dauTien.loi);

  function thu(fn) {
    try { fn(); return { ok: true }; }
    catch (err) { return { ok: false, loi: (err.stdout || '') + (err.stderr || '') }; }
  }

  // Sửa mỗi tệp dùng chung → phải cho qua.
  fs.appendFileSync(path.join(kho, 'lib', 'db.js'), '// thêm hàm mới\n');
  git('add', '-A');
  const chiNen = thu(() => git('commit', '-q', '-m', 'lib/db.js: thêm hàm mới'));
  check('commit chỉ sửa tệp dùng chung → cho qua', chiNen.ok, chiNen.loi);

  // Sửa mỗi tệp tính năng → phải cho qua.
  fs.appendFileSync(path.join(kho, 'routes', 'bus.js'), '// sửa tính năng\n');
  git('add', '-A');
  const chiTinhNang = thu(() => git('commit', '-q', '-m', 'Xe buýt: sửa lỗi'));
  check('commit chỉ sửa tệp tính năng → cho qua', chiTinhNang.ok, chiTinhNang.loi);

  // Trộn cả hai → phải bị chặn.
  fs.appendFileSync(path.join(kho, 'lib', 'db.js'), '// lại thêm\n');
  fs.appendFileSync(path.join(kho, 'routes', 'bus.js'), '// lại sửa\n');
  git('add', '-A');
  const tron = thu(() => git('commit', '-q', '-m', 'Xe buýt: sửa kèm nền'));
  check('commit trộn hai loại → BỊ CHẶN', !tron.ok, 'commit đã lọt qua');
  check('lời báo lỗi nêu rõ tệp nào thuộc nhóm nào',
    /lib\/db\.js/.test(tron.loi || '') && /routes\/bus\.js/.test(tron.loi || ''), tron.loi?.slice(0, 200));
  check('lời báo lỗi chỉ ra cách tách', /git reset/.test(tron.loi || ''), tron.loi?.slice(0, 200));
  check('lời báo lỗi viết bằng tiếng Việt', /tệp dùng chung|DÙNG CHUNG/i.test(tron.loi || ''));

  // Vẫn còn nguyên vùng chờ, chưa commit gì.
  const conCho = git('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
  check('bị chặn thì không mất công đã làm, tệp vẫn nằm trong vùng chờ',
    conCho.length === 2, conCho);

  // Trộn nhưng có đường thoát → cho qua.
  const tronCoY = thu(() => git('commit', '-q', '-m', 'Xe buýt: sửa kèm nền [tron-co-y] đổi tên biến xuyên suốt'));
  check('trộn kèm [tron-co-y] → cho qua', tronCoY.ok, tronCoY.loi);

  // Kiểm tra một commit đã có trong lịch sử.
  const ma = git('rev-parse', 'HEAD~1').trim();
  const kt = thu(() => execFileSync('node',
    [path.join(kho, 'scripts', 'kiem-tra-commit.js'), '--commit', ma],
    { cwd: kho, encoding: 'utf8' }));
  check('kiểm tra được một commit đã có trong lịch sử', kt.ok, kt.loi);

  // Chế độ khoảng, dùng cho GitHub.
  const goc = git('rev-list', '--max-parents=0', 'HEAD').trim();
  const khoang = thu(() => execFileSync('node',
    [path.join(kho, 'scripts', 'kiem-tra-commit.js'), '--khoang', `${goc}..HEAD`],
    { cwd: kho, encoding: 'utf8' }));
  check('kiểm tra được cả một khoảng commit', khoang.ok, khoang.loi);

  fs.rmSync(kho, { recursive: true, force: true });
}

console.log('\n[3] Bộ canh hỏng thì không được chặn việc của người dùng');
{
  // Lời giải thích đi ra luồng lỗi, nên dùng spawnSync để đọc được cả hai luồng.
  const kq = spawnSync('node',
    [path.join(GOC, 'scripts', 'kiem-tra-commit.js'), '--commit', 'ma-khong-co-that'],
    { cwd: GOC, encoding: 'utf8' });
  check('mã commit không tồn tại → không chặn (mã thoát 0)', kq.status === 0, kq.status);
  check('có giải thích vì sao bỏ qua', /bỏ qua/i.test(kq.stdout + kq.stderr),
    (kq.stdout + kq.stderr).slice(0, 150));
}

tongKet();
