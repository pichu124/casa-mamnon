// Bài canh cho chính BỘ CANH VERSION của service worker.
//
// Chạy bằng:  npm run test:sw-version-kiemthu
//
// VÌ SAO QUY ĐỊNH NÀY CẦN MỘT CÁI MÁY CANH
//
// `CLAUDE.md` ghi: *"Đổi bất cứ tệp nào trong `public/` thì tăng số `VERSION`
// trong `public/sw.js`, nếu không thì điện thoại đã cài app sẽ kẹt ở bản cũ."*
//
// Trước bài này, quy định đó chỉ nằm trong một dòng văn xuôi. Và nó ĐÃ BỊ QUÊN
// thật: đối chiếu lịch sử nhánh cho thấy hai đợt (Đ14, Đ19) sửa
// `public/js/app.js`, `public/js/views/settings.js`, `public/js/views/admin.js`
// mà `VERSION` đứng yên ở `v50`.
//
// Hậu quả không hiện ra ngay, và đó mới là chỗ đắt:
//
//   máy chủ có bản mới → điện thoại đã cài app vẫn chạy bản cũ, vĩnh viễn
//
// Cô báo *"app này không có nút đó"*. Người sửa mở máy mình ra thấy nút vẫn còn
// — vì máy đó chưa cài app nên không có service worker. Không ai tái hiện được,
// không ai kết luận được gì.
//
// SO VỚI NHÁNH CHÍNH, KHÔNG SO VỚI COMMIT NGAY TRƯỚC
//
// Quy định commit riêng bắt tách một đợt việc làm hai ba commit, và chỉ một
// trong số đó tăng `VERSION`. So với commit ngay trước sẽ báo đỏ oan ở các
// commit sau — mà một bộ canh báo đỏ oan là một bộ canh sẽ bị tắt. Thứ thật sự
// đi tới máy của cô là NHÁNH; nên mốc so sánh là nơi nhánh tách khỏi nhánh
// chính.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const canh = require(path.join(GOC, 'scripts', 'kiem-tra-sw.js'));

// GOM CẢ HAI DÒNG RA, KHÔNG CHỈ DÒNG CHÍNH.
//
// Bản trước dùng `execFileSync`, vốn chỉ trả về dòng chính (stdout) khi lệnh
// chạy thành công. Lời NHẮC của bộ canh đi ra dòng lỗi (stderr), nên mọi phép
// kiểm về lời nhắc đều không thấy gì và báo đỏ oan — hoặc tệ hơn, xanh oan nếu
// phép kiểm hỏi ngược lại.
const chay = (...a) => {
  const r = spawnSync('node', [path.join(GOC, 'scripts', 'kiem-tra-sw.js'), ...a],
    { cwd: GOC, encoding: 'utf8' });
  return { ma: r.status ?? 1, chu: `${r.stdout || ''}${r.stderr || ''}` };
};

// ===========================================================================
console.log('\n[1] Script chạy được và có mặt ở đúng ba chỗ');
{
  check('scripts/kiem-tra-sw.js tồn tại',
    fs.existsSync(path.join(GOC, 'scripts', 'kiem-tra-sw.js')));

  const hook = fs.readFileSync(path.join(GOC, '.githooks', 'commit-msg'), 'utf8');
  check('MÓC GIT gọi tới nó — quên là bị chặn ngay lúc commit',
    hook.includes('kiem-tra-sw.js'), hook);

  const pkg = JSON.parse(fs.readFileSync(path.join(GOC, 'package.json'), 'utf8'));
  check('có lệnh gõ tay `npm run test:sw-version`',
    typeof pkg.scripts['test:sw-version'] === 'string', Object.keys(pkg.scripts).length);
  check('và bài canh này nằm trong `npm test`',
    pkg.scripts.test.includes('test/sw-version.test.mjs'));

  const kq = chay();
  check('chạy trên kho mã hiện tại thì ĐẠT', kq.ma === 0, kq.chu.slice(-300));
}

// ===========================================================================
console.log('\n[2] Đọc đúng hằng VERSION, không đoán mò');
{
  check('đọc được VERSION thường', canh.docVersion("const VERSION = 'v55';") === 'v55');
  check('đọc được cả nháy kép', canh.docVersion('const VERSION = "v7";') === 'v7');
  check('KHÔNG nhận nhầm một dòng nhắc tới VERSION trong chú thích',
    canh.docVersion("// nhớ đổi const VERSION = 'v99'; mỗi lần sửa") === null);
  check('không có hằng thì trả null, không nổ', canh.docVersion('const A = 1;') === null);
  check('nội dung rỗng cũng không nổ', canh.docVersion('') === null);
}

// ===========================================================================
console.log('\n[3] Biết tệp nào trong public/ mới đáng tính');
{
  check('tệp giao diện thì tính', canh.laPublic('public/js/views/nhatky.js') === true);
  check('ảnh biểu tượng cũng tính — nó nằm trong danh sách nạp sẵn',
    canh.laPublic('public/icons/icon-192.png') === true);
  check('chính sw.js cũng tính', canh.laPublic('public/sw.js') === true);
  check('tệp ngoài public/ thì không', canh.laPublic('routes/students.js') === false);
  check('tài liệu trong public/ thì không', canh.laPublic('public/README.md') === false);
}

// ===========================================================================
console.log('\n[4] PHÉP THỬ NGƯỢC — bộ canh này có bắt được thật không');
{
  // Gọi thẳng hàm xét trên dữ liệu bịa, không đụng tới kho mã thật.
  const bat = (tep, cu, moi) => canh.xet(tep, { cu, moi }, 'Thử');

  check('BẮT ĐƯỢC: đổi màn hình mà VERSION đứng yên',
    typeof bat(['public/js/views/nhatky.js'], 'v10', 'v10') === 'string');
  check('và câu báo lỗi nói rõ máy đã cài sẽ kẹt bản cũ',
    /kẹt|CHẠY MÃI BẢN CŨ/i.test(bat(['public/js/views/nhatky.js'], 'v10', 'v10') || ''));
  check('và chỉ đúng tên tệp đã đổi',
    (bat(['public/js/views/nhatky.js'], 'v10', 'v10') || '').includes('public/js/views/nhatky.js'));

  check('ĐẠT: đổi màn hình VÀ có tăng VERSION',
    bat(['public/js/views/nhatky.js', 'public/sw.js'], 'v10', 'v11') === null);
  check('ĐẠT: không đụng gì trong public/',
    bat(['routes/students.js', 'lib/db.js'], 'v10', 'v10') === null);
  check('ĐẠT: sw.js mới ra đời trong chính commit này',
    bat(['public/sw.js'], null, 'v1') === null);
  check('BẮT ĐƯỢC cả khi chỉ đổi một tấm icon',
    typeof bat(['public/icons/icon-192.png'], 'v10', 'v10') === 'string');
}

// ===========================================================================
console.log('\n[5] Đường thoát phải là một DÒNG RIÊNG kèm lý do');
{
  check('nhận đúng dòng thoát', canh.xinThoat('sửa gì đó\n\nKhong-can-sw: chỉ sửa chú thích')
    === 'chỉ sửa chú thích');
  check('KHÔNG mở đường thoát khi lời commit chỉ NHẮC TỚI quy định trong văn xuôi',
    canh.xinThoat('thêm bộ canh Khong-can-sw cho public/') === null);
  check('không có dòng nào thì trả null', canh.xinThoat('sửa lặt vặt') === null);
  check('dòng thoát mà thiếu lý do thì KHÔNG tính',
    canh.xinThoat('sửa gì đó\n\nKhong-can-sw:') === null);
}

// ===========================================================================
console.log('\n[5b] MỘT DÒNG THOÁT KHÔNG ĐƯỢC MIỄN CHO CẢ KHOẢNG');
{
  // LỖ HỔNG NÀY CÓ THẬT, VÀ NẰM TRONG CHÍNH BỘ CANH NÀY CHO TỚI ĐỢT Đ40.
  //
  // Chế độ `--khoang` (chế độ GitHub chạy) thấy MỘT commit có dòng thoát là
  // `return 0` cho cả khoảng. Nghĩa là một commit sửa chú thích — xin thoát
  // hoàn toàn chính đáng — đứng cạnh một commit sửa thật `public/js/views/*.js`
  // mà quên tăng VERSION thì bộ canh im lặng. Đúng loại lỗi nó sinh ra để bắt.
  //
  // Dựng một kho git riêng để thử, không đụng lịch sử thật.
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-khoang-'));
  const g = (...a) => execFileSync('git', a, { cwd: tam, encoding: 'utf8' });
  const ghi = (duong, noiDung) => {
    fs.mkdirSync(path.join(tam, path.dirname(duong)), { recursive: true });
    fs.writeFileSync(path.join(tam, duong), noiDung);
  };
  // CHÉP script vào chính kho tạm, không gọi bản trong kho thật: `GOC` của
  // script là thư mục cha của chính nó, nên chạy bản trong kho thật sẽ đi hỏi
  // git về lịch sử của kho THẬT. Bản đầu của mục này làm vậy và "xanh" nhờ
  // đúng lỗi đó — git báo `Invalid revision range`, tiến trình thoát mã 1, và
  // phép kiểm "phải bắt được" đọc mã 1 là đủ.
  const chayTrong = (...a) => {
    try {
      return { ma: 0, chu: execFileSync('node',
        [path.join(tam, 'scripts', 'kiem-tra-sw.js'), ...a], { cwd: tam, encoding: 'utf8' }) };
    } catch (e) { return { ma: e.status ?? 1, chu: `${e.stdout || ''}${e.stderr || ''}` }; }
  };

  fs.mkdirSync(path.join(tam, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(GOC, 'scripts', 'kiem-tra-sw.js'),
    path.join(tam, 'scripts', 'kiem-tra-sw.js'));

  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'thu@casa.test');
  g('config', 'user.name', 'Phép thử');
  ghi('public/sw.js', "const VERSION = 'v1';\n");
  ghi('public/js/views/nhatky.js', '// bản đầu\n');
  g('add', '-A'); g('commit', '-q', '-m', 'nền');
  const goc = g('rev-parse', 'HEAD').trim();

  // Commit A: sửa chú thích trong public/, xin thoát — hợp lệ.
  ghi('public/js/views/nhatky.js', '// bản đầu\n// thêm một dòng chú thích\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'sửa chú thích\n\nKhong-can-sw: chỉ thêm một dòng chú thích');

  // Commit B: sửa THẬT một màn hình khác, KHÔNG tăng VERSION — phải bị bắt.
  ghi('public/js/views/tienan.js', 'App.views.tienan = {};\n');
  g('add', '-A'); g('commit', '-q', '-m', 'thêm màn báo ăn');
  const cuoi = g('rev-parse', 'HEAD').trim();

  const kq = chayTrong('--khoang', `${goc}..${cuoi}`);
  check('BẮT ĐƯỢC: commit quên tăng VERSION đứng SAU một commit có dòng thoát',
    kq.ma === 1 && /KHÔNG tăng VERSION/.test(kq.chu), kq.chu.slice(0, 300));
  check('và biên bản chỉ đúng tệp của commit quên, không phải tệp đã xin thoát',
    kq.chu.includes('public/js/views/tienan.js') && !kq.chu.includes('public/js/views/nhatky.js'),
    kq.chu.slice(0, 300));

  // Còn khoảng chỉ có commit A thì vẫn phải ĐẠT — đường thoát vẫn là đường thoát.
  const chiA = g('rev-parse', 'HEAD^').trim();
  const kq2 = chayTrong('--khoang', `${goc}..${chiA}`);
  check('ĐẠT: khoảng chỉ gồm commit đã xin thoát', kq2.ma === 0, kq2.chu.slice(0, 200));

  fs.rmSync(tam, { recursive: true, force: true });
}

// ===========================================================================
console.log('\n[5c] DÒNG THOÁT KHÔNG CẦN THIẾT THÌ PHẢI ĐƯỢC NHẮC');
{
  // Xin phép bỏ qua trong khi bộ canh vốn đã cho qua thì lời commit ghi lại một
  // điều KHÔNG ĐÚNG — người sau đọc lịch sử tưởng chỗ đó từng phải đánh đổi.
  // Nặng hơn: dùng đường thoát cho quen tay là bước đầu của việc dùng nó lúc
  // thật sự cần bị chặn. Đã xảy ra thật ở đợt Đ39 và Đ51.
  //
  // CHỈ NHẮC, KHÔNG CHẶN: chặn thì người ta phải sửa lời commit vì một việc
  // không sai về kết quả, và một bộ canh gây phiền là một bộ canh bị tắt.
  const batLoiNhac = (fn) => {
    const cu = console.warn;
    let ra = '';
    console.warn = (...a) => { ra += a.join(' '); };
    try { fn(); } finally { console.warn = cu; }
    return ra;
  };

  check('KHÔNG đụng public/ mà vẫn xin thoát → có nhắc',
    /KHÔNG đụng tệp nào trong public/.test(
      batLoiNhac(() => canh.nhacThoatThua('lý do gì đó', ['lib/db.js', 'test/a.mjs'], 'Thử'))));
  check('có đụng public/ thì lời xin phép đúng chỗ → KHÔNG nhắc',
    batLoiNhac(() => canh.nhacThoatThua('chỉ sửa chú thích',
      ['public/js/views/nhatky.js'], 'Thử')) === '');
  check('không có dòng thoát thì cũng không nhắc',
    batLoiNhac(() => canh.nhacThoatThua(null, ['lib/db.js'], 'Thử')) === '');

  // Và nhắc trên lịch sử THẬT: Đ39 có đúng một dòng thoát thừa.
  const kq = chay('--commit', 'd3aaa2e');
  check('chạy trên commit Đ39 vẫn ĐẠT (chỉ nhắc, không chặn)', kq.ma === 0, kq.chu.slice(0, 200));
  check('và có in lời nhắc dòng thoát thừa',
    /KHÔNG đụng tệp nào trong public/.test(kq.chu), kq.chu.slice(-200));
}

// ===========================================================================
console.log('\n[6] Chạy trên lịch sử thật của nhánh');
{
  const kq = chay('--khoang', 'bc9dfa3..HEAD');
  check('cả nhánh app 2 tính từ điểm tách đều ĐẠT', kq.ma === 0, kq.chu.slice(-400));
  check('và nói ra VERSION đã đi từ đâu tới đâu', /VERSION v\d+ → v\d+/.test(kq.chu), kq.chu.slice(-200));
}

tongKet();
