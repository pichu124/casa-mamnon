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
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const canh = require(path.join(GOC, 'scripts', 'kiem-tra-sw.js'));

const chay = (...a) => {
  try {
    return { ma: 0, chu: execFileSync('node', [path.join(GOC, 'scripts', 'kiem-tra-sw.js'), ...a],
      { cwd: GOC, encoding: 'utf8' }) };
  } catch (e) {
    return { ma: e.status ?? 1, chu: `${e.stdout || ''}${e.stderr || ''}` };
  }
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
console.log('\n[6] Chạy trên lịch sử thật của nhánh');
{
  const kq = chay('--khoang', 'bc9dfa3..HEAD');
  check('cả nhánh app 2 tính từ điểm tách đều ĐẠT', kq.ma === 0, kq.chu.slice(-400));
  check('và nói ra VERSION đã đi từ đâu tới đâu', /VERSION v\d+ → v\d+/.test(kq.chu), kq.chu.slice(-200));
}

tongKet();
