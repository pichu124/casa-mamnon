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
// Từ Đ145 canh thêm hai tệp nền mà chính đợt 2 sinh ra:
//
//   lib/thong-bao-be.js  MỘT điểm gọi cho mọi tin riêng của một bé — ảnh tới
//                        lớp, từng bữa nhật ký, cân đo, album, câu chuyện,
//                        Cambridge, báo cáo đều đi qua `gui(...)`
//   lib/day.js           đường đẩy Web Push; `thong-bao-be` gọi nó, routes/push
//                        gọi nó, và không tệp nào khác biết về khoá VAPID
//
// Hai tệp này ra đời SAU bản chụp đầu tiên nên lọt khỏi bài canh suốt đợt 2 —
// đúng nhóm mà CLAUDE.md gọi là nguy hiểm nhất. Bỏ sót ấy là lý do có Đ145.
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
// Nạp được hai tệp này là đã kiểm luôn một điều: chúng KHÔNG có tác dụng phụ
// lúc nạp. `lib/day.js` thử `require('web-push')` trong khối bắt lỗi nên máy
// chưa cài gói vẫn nạp được — và bài canh vẫn phải xanh ở đó.
const thongBaoBe = require(path.join(GOC, 'lib', 'thong-bao-be.js'));
const day = require(path.join(GOC, 'lib', 'day.js'));
const { UI } = docTepTrinhDuyet(path.join(GOC, 'public', 'js', 'ui.js'));
const { App } = docTepTrinhDuyet(path.join(GOC, 'public', 'js', 'app.js'));

const hienTai = {
  'lib/db.js': hinhDang(db),
  'lib/auth.js': hinhDang(auth),
  'lib/modules.js': hinhDang(modules),
  'lib/thong-bao-be.js': hinhDang(thongBaoBe),
  'lib/day.js': hinhDang(day),
  'public/js/ui.js (UI)': hinhDang(UI),
  'public/js/app.js (App)': hinhDang(App),
};

// --- Mất bản chụp thì BÁO ĐỎ, không âm thầm ghi lại một bản mới ------------
//
// Bản chụp `test/khe-uoc.json` chính là cái bánh cóc: nó nhớ hôm qua các tệp
// dùng chung có những gì. Nếu thiếu nó mà bài này lẳng lặng ghi ra một bản mới
// rồi báo xanh, thì việc XOÁ bản chụp trở thành cách dễ nhất để cho một thay
// đổi phá vỡ khế ước đi qua — mà lại còn không để lại dấu vết nào trong kết
// quả chạy. Thiếu bản chụp là một sự cố phải có người nhìn, không phải một
// trạng thái tự chữa.
if (!capNhat && !fs.existsSync(BAN_CHUP)) {
  console.error(`\n  KHÔNG TÌM THẤY BẢN CHỤP KHẾ ƯỚC: ${path.relative(GOC, BAN_CHUP)}`);
  console.error('\n  Tệp này được theo dõi trong git. Thiếu nó nghĩa là một trong hai:');
  console.error('    - nó vừa bị xoá hoặc bị .gitignore nuốt mất — lấy lại bằng');
  console.error('      `git checkout -- test/khe-uoc.json`;');
  console.error('    - hoặc đây thật sự là lần đầu dựng bản chụp — khi đó chạy');
  console.error('      `npm run test:khe-uoc -- --cap-nhat` và ĐỌC KỸ bản vừa ghi');
  console.error('      trước khi commit.\n');
  process.exit(1);
}

// --- Chạy với --cap-nhat thì ghi bản chụp ----------------------------------
if (capNhat) {
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

// ===========================================================================
// MỘT BẢN NÉN ẢNH DUY NHẤT — VÀ KHÔNG AI ĐƯỢC CHÉP BẢN THỨ SÁU
// ===========================================================================
//
// Khế ước có hai vế. Phần trên canh vế thứ nhất: "tệp dùng chung còn cung cấp
// đủ những gì nó từng cung cấp". Phần này canh vế còn lại — *và mọi người thật
// sự đang dùng nó*, thay vì chép một bản riêng.
//
// Trước đợt Đ21 hàm nén ảnh tồn tại thành NĂM bản gần giống nhau: albums
// 1600px, Cambridge 1400, Hành trình 1280, Ghi nhanh 1280/0.75, Đón trả 640.
// Ba trong năm bản không xoay ảnh theo chiều máy ảnh đã chụp.
//
// Lý do canh KHÔNG phải là cho gọn mã. Vẽ lại ảnh qua canvas rồi `toDataURL`
// là bước duy nhất bỏ được phần thông tin đi kèm tệp gốc: ngày giờ, kiểu máy,
// và TOẠ ĐỘ NƠI CHỤP. Ảnh trẻ chụp trong lớp mà còn kèm toạ độ trường là thứ
// không được để lọt ra ngoài. Một bản thứ sáu gửi thẳng tệp gốc lên máy chủ sẽ
// không bộ test nào khác bắt được — nên bắt ở đây, ở mức đọc mã.
console.log('\n[Một bản nén ảnh duy nhất]');
{
  const CHO_PHEP = 'public/js/ui.js';
  const DAU_HIEU = [
    [/createElement\((['"`])canvas\1\)/, 'tự dựng thẻ canvas'],
    [/\.toDataURL\s*\(/, 'tự gọi toDataURL'],
  ];

  // Mọi tệp chạy trên máy người dùng: view lõi, ui/app, và view của phân hệ.
  function tepTrinhDuyet() {
    const ds = [];
    const themThuMuc = (tuongDoi, loc = () => true) => {
      const tm = path.join(GOC, tuongDoi);
      if (!fs.existsSync(tm)) return;
      for (const ten of fs.readdirSync(tm)) {
        if (ten.endsWith('.js') && loc(ten)) ds.push(path.join(tuongDoi, ten));
      }
    };
    themThuMuc('public/js');
    themThuMuc('public/js/views');
    const goc = path.join(GOC, 'modules');
    if (fs.existsSync(goc)) {
      for (const ma of fs.readdirSync(goc)) {
        const v = path.join('modules', ma, 'view.js');
        if (fs.existsSync(path.join(GOC, v))) ds.push(v);
      }
    }
    return ds;
  }

  // Trả về danh sách "tệp — vì sao bị bắt". Tách hẳn ra để phép thử ngược ở
  // dưới chạy được chính hàm này trên một chuỗi mã bịa ra.
  function batChepLai(danhSach, docTep) {
    const bat = [];
    for (const tep of danhSach) {
      if (tep === CHO_PHEP) continue;
      const ma = docTep(tep);
      for (const [re, vi] of DAU_HIEU) if (re.test(ma)) bat.push(`${tep} — ${vi}`);
    }
    return bat;
  }

  const ds = tepTrinhDuyet();
  check('có tìm thấy tệp để quét (bộ canh không quét vào khoảng không)',
    ds.length >= 20 && ds.includes(CHO_PHEP), ds.length);

  const doc = (tep) => fs.readFileSync(path.join(GOC, tep), 'utf8');
  const bat = batChepLai(ds, doc);
  check('KHÔNG TỆP NÀO NGOÀI public/js/ui.js TỰ NÉN ẢNH', bat.length === 0,
    bat.length ? `${bat.join(' · ')}\n\n  Dùng UI.nenAnh(file, { canhToiDa, chatLuong }) thay vì chép lại.` : undefined);

  // Và năm màn hình có gửi ảnh phải thật sự gọi tới bản dùng chung — nếu không
  // thì bài trên vẫn xanh trong khi ảnh đi thẳng lên máy chủ, không qua bước
  // xoá toạ độ.
  for (const tep of [
    'public/js/views/albums.js',
    'modules/thuchup/view.js',
    'modules/hanhtrinh/view.js',
    'modules/cambridge/view.js',
    'modules/dontra/view.js',
  ]) {
    check(`${tep} gọi UI.nenAnh`, /UI\.nenAnh\s*\(/.test(doc(tep)));
  }

  check('UI.nenAnh có thật và nhận (file, tuỳ chọn)',
    typeof UI.nenAnh === 'function' && UI.nenAnh.length === 1,
    typeof UI.nenAnh === 'function' ? UI.nenAnh.length : typeof UI.nenAnh);

  // --- Phép thử ngược: bộ canh này có bắt được thật không? ------------------
  const maBia = {
    'modules/bia-dat/view.js': "const cv = document.createElement('canvas');",
    'public/js/views/bia-dat.js': "resolve(cv.toDataURL('image/jpeg', 0.8));",
    'public/js/ui.js': "document.createElement('canvas'); x.toDataURL('image/jpeg');",
  };
  const batBia = batChepLai(Object.keys(maBia), (t) => maBia[t]);
  check('PHÉP THỬ NGƯỢC — bắt được bản chép thứ sáu ở cả modules/ lẫn public/js/views/',
    batBia.length === 2, batBia);
  check('và KHÔNG bắt nhầm chính public/js/ui.js',
    !batBia.some(x => x.startsWith('public/js/ui.js')), batBia);
}

tongKet();
