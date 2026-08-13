// Kiểm thử KHẾ ƯỚC của các tệp dùng chung.
//
// Chạy bằng:  npm run test:khe-uoc
//
// VÌ SAO CÓ BÀI NÀY
//
// Tính năng riêng (routes/<tên>.js, public/js/views/<tên>.js) đã được cô lập:
// viết sai thì chỉ nó hỏng. Nhưng các tệp DÙNG CHUNG thì không cô lập được, vì
// theo định nghĩa cả ứng dụng đang dựa vào chúng:
//
//   lib/db.js       22/22 tệp route đều gọi
//   lib/auth.js     mọi đường dẫn API đều đi qua
//   public/js/ui.js riêng UI.esc đã có hơn 300 chỗ gọi
//   public/js/app.js lõi định tuyến của toàn bộ giao diện
//
// Quy định trong CLAUDE.md là: chạm vào tệp dùng chung thì CHỈ ĐƯỢC THÊM, không
// đổi và không bỏ thứ đang có. Bài này biến vế "không bỏ, không đổi tên, không
// đổi số tham số" từ một lời hứa thành thứ máy kiểm được: nó chụp lại danh sách
// những gì các tệp dùng chung đang cung cấp, rồi báo đỏ nếu có thứ biến mất.
//
// Thêm hàm mới thì bài này KHÔNG báo đỏ — chỉ cần chạy lại với --cap-nhat để
// ghi thêm vào bản chụp. Bỏ hay đổi tên hàm cũ thì luôn báo đỏ, buộc người sửa
// phải nhìn thấy mình đang phá khế ước mà cả ứng dụng đang dựa vào.
//
// LƯU Ý: bài này chỉ bắt được thay đổi về HÌNH DẠNG (tên hàm, số tham số).
// Thay đổi về HÀNH VI — ví dụ đổi canAccessStudent trả về true thay vì false —
// thì chỉ các bộ kiểm thử còn lại mới bắt được. Vì vậy vẫn phải chạy `npm test`.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);

// Nạp lib/db.js là mở cơ sở dữ liệu. Trỏ sang thư mục tạm TRƯỚC KHI nạp, để bài
// kiểm thử này không bao giờ chạm vào data/school.db của trường.
process.env.DATA_DIR = thuMucTam('khe-uoc');

const { check, tongKet } = taoBoDem();
const BAN_CHUP = path.join(GOC, 'test', 'khe-uoc.json');
const capNhat = process.argv.includes('--cap-nhat');

// --- Lấy hình dạng hiện tại của một đối tượng dùng chung -------------------
// Hàm  → 'ham(<số tham số>)'   ví dụ 'ham(2)'
// Khác → kiểu dữ liệu          ví dụ 'object', 'string'
function hinhDang(obj) {
  const out = {};
  for (const ten of Object.keys(obj).sort()) {
    const v = obj[ten];
    out[ten] = typeof v === 'function' ? `ham(${v.length})` : typeof v;
  }
  return out;
}

// --- Đọc các tệp phía trình duyệt trong một hộp cát tối giản ---------------
// ui.js và app.js gán vào `window`, nên chỉ cần dựng vài thứ giả là chạy được.
function docTepTrinhDuyet(duongDan) {
  const window = {};
  const sandbox = {
    window,
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { style: {}, classList: { add() {} } }; },
      body: { appendChild() {} },
    },
    navigator: {},
    location: { hash: '' },
    localStorage: { getItem() { return null; }, setItem() {} },
    setInterval() {}, clearInterval() {}, setTimeout() {},
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(duongDan, 'utf8'), sandbox, { filename: duongDan });
  return window;
}

const db = require(path.join(GOC, 'lib', 'db.js'));
const auth = require(path.join(GOC, 'lib', 'auth.js'));
const modules = require(path.join(GOC, 'lib', 'modules.js'));
const { UI } = docTepTrinhDuyet(path.join(GOC, 'public', 'js', 'ui.js'));
const { App } = docTepTrinhDuyet(path.join(GOC, 'public', 'js', 'app.js'));

const hienTai = {
  'lib/db.js': hinhDang(db),
  'lib/auth.js': hinhDang(auth),
  'lib/modules.js': hinhDang(modules),
  'public/js/ui.js (UI)': hinhDang(UI),
  'public/js/app.js (App)': hinhDang(App),
};

// --- Lần đầu chạy hoặc chạy với --cap-nhat thì ghi bản chụp ----------------
if (capNhat || !fs.existsSync(BAN_CHUP)) {
  fs.writeFileSync(BAN_CHUP, JSON.stringify(hienTai, null, 2) + '\n');
  console.log(`Đã ghi bản chụp khế ước vào ${path.relative(GOC, BAN_CHUP)}`);
  const tong = Object.values(hienTai).reduce((n, o) => n + Object.keys(o).length, 0);
  console.log(`Đang theo dõi ${tong} mục trong ${Object.keys(hienTai).length} tệp dùng chung.`);
  process.exit(0);
}

const cu = JSON.parse(fs.readFileSync(BAN_CHUP, 'utf8'));
const themMoi = [];

for (const [tep, mucCu] of Object.entries(cu)) {
  console.log(`\n[${tep}]`);
  const mucMoi = hienTai[tep];

  if (!mucMoi) {
    check(`tệp dùng chung "${tep}" vẫn còn`, false, 'tệp đã bị xóa hoặc đổi tên');
    continue;
  }

  for (const [ten, dang] of Object.entries(mucCu)) {
    if (!(ten in mucMoi)) {
      check(`"${ten}" vẫn còn`, false,
        'ĐÃ BỊ BỎ hoặc đổi tên. Tệp dùng chung chỉ được THÊM, không được bỏ — ' +
        'xem CLAUDE.md. Nếu thật sự cần bỏ thì phải chuyển hết chỗ gọi sang thứ ' +
        'thay thế trước, ở một commit riêng, rồi mới xóa.');
      continue;
    }
    check(`"${ten}" giữ nguyên hình dạng`, mucMoi[ten] === dang,
      mucMoi[ten] !== dang
        ? `trước: ${dang} — nay: ${mucMoi[ten]}. Đổi số tham số hay đổi kiểu của ` +
          'một thứ dùng chung sẽ làm hỏng mọi chỗ đang gọi nó.'
        : undefined);
  }

  for (const ten of Object.keys(mucMoi)) {
    if (!(ten in mucCu)) themMoi.push(`${tep} → ${ten}`);
  }
}

for (const tep of Object.keys(hienTai)) {
  if (!(tep in cu)) themMoi.push(`${tep} (tệp mới)`);
}

if (themMoi.length) {
  console.log(`\n[Phần THÊM MỚI — được phép, không tính là lỗi]`);
  themMoi.forEach(t => console.log('  +', t));
  console.log('\n  Chạy `npm run test:khe-uoc -- --cap-nhat` để ghi nhận vào bản chụp.');
}

tongKet();
