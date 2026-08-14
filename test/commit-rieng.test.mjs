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
const { phanLoai, xinThoat } = require(path.join(GOC, 'scripts', 'kiem-tra-commit.js'));
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

console.log('\n[2] Đường thoát phải là một dòng riêng, không phải chuỗi trong bài');
{
  check('dòng riêng có lý do → mở đường thoát',
    xinThoat('Sửa gì đó\n\nTron-co-y: đổi tên biến xuyên suốt') === 'đổi tên biến xuyên suốt');
  check('không phân biệt hoa thường', !!xinThoat('x\n\ntron-co-y: lý do'));

  // Đây chính là lỗi đã xảy ra thật: lời commit GIẢI THÍCH quy định, không phải
  // xin bỏ qua nó, mà vẫn được cho qua vì bộ canh chỉ tìm chuỗi trong bài.
  check('nhắc tới quy định trong văn xuôi thì KHÔNG mở đường thoát',
    xinThoat('Thêm bộ canh commit riêng\n\nĐường thoát: ghi Tron-co-y kèm lý do vào lời commit.') === null,
    'lời commit chỉ nói về quy định lại vô tình tự miễn trừ');
  check('token cũ kiểu [tron-co-y] không còn tác dụng',
    xinThoat('Sửa gì đó [tron-co-y] vì lý do nào đó') === null);

  check('dòng thoát mà bỏ trống lý do → không cho qua', xinThoat('x\n\nTron-co-y:') === null);
  check('dòng thoát chỉ có khoảng trắng → không cho qua', xinThoat('x\n\nTron-co-y:    ') === null);
  check('lời commit bình thường → không cho qua', xinThoat('Xe buýt: sửa lỗi hiển thị') === null);
  check('lời commit rỗng → không cho qua', xinThoat('') === null);
}

console.log('\n[3] Chặn thật khi commit trong một kho git');
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
  // Móc commit-msg chạy CẢ HAI bộ canh, nên kho thử phải có đủ cả hai.
  for (const t of ['kiem-tra-commit.js', 'kiem-tra-du-lieu.js']) {
    fs.copyFileSync(path.join(GOC, 'scripts', t), path.join(kho, 'scripts', t));
  }
  fs.copyFileSync(path.join(GOC, '.githooks', 'commit-msg'),
    path.join(kho, '.githooks', 'commit-msg'));
  fs.chmodSync(path.join(kho, '.githooks', 'commit-msg'), 0o755);
  git('config', 'core.hooksPath', '.githooks');

  fs.writeFileSync(path.join(kho, 'lib', 'db.js'), '// nền\n');
  fs.writeFileSync(path.join(kho, 'routes', 'bus.js'), '// tính năng\n');
  git('add', '-A');
  // Commit đầu tiên có cả hai loại, nhưng đây là lúc dựng kho nên phải cho qua
  // bằng đường thoát — cũng chính là dịp kiểm tra đường thoát có hoạt động không.
  const dauTien = thu(() => git('commit', '-q', '-m', 'dựng kho\n\nTron-co-y: commit khởi tạo, chưa có gì để tách'));
  check('đường thoát Tron-co-y cho commit đi qua', dauTien.ok, dauTien.loi);

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
  const tronCoY = thu(() => git('commit', '-q', '-m', 'Xe buýt: sửa kèm nền\n\nTron-co-y: đổi tên biến xuyên suốt, tách ra thì mã không chạy'));
  check('trộn kèm dòng Tron-co-y → cho qua', tronCoY.ok, tronCoY.loi);

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

console.log('\n[4] Bộ canh hỏng thì không được chặn việc của người dùng');
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
