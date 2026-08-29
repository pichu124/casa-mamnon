// Bài canh VỎ ỨNG DỤNG (service worker) — chạy MÃ THẬT, không đọc chữ.
//
// Chạy bằng:  npm run test:vo-app
//
// VÌ SAO TỆP NÀY TỒN TẠI
//
// `public/sw.js` là đoạn mã quyết định app có mở được khi mất mạng hay không —
// tức quyết định lời hứa lớn nhất của app 2. Nhưng trước đợt này nó chỉ được
// canh bằng hai kiểu, và cả hai đều không chạy chính nó:
//
//   • `test/pwa.test.mjs` mở trình duyệt và hỏi "tệp có tải về được không",
//     "có đăng ký được không" — canh CÓ MẶT, không canh HÀNH VI.
//   • `test/khong-hua-suong.test.mjs` ĐỌC nội dung tệp bằng biểu thức để tìm
//     chữ `push` — canh chữ, không canh việc.
//
// Bài này nạp thẳng `public/sw.js` vào một hộp cát của Node, dựng sẵn `caches`
// và `self` giả, rồi GỌI đúng các móc mà trình duyệt sẽ gọi. Nhờ vậy nó đo
// được hành vi thật mà không cần trình duyệt, và chạy trong `npm test`.
//
// CHỖ ĐANG CANH: MÀN HÌNH PHÂN HỆ PHẢI SỐNG QUA MỘT LẦN ĐỔI PHIÊN BẢN
//
// Địa chỉ của chúng là /modules/<mã>/view.js?v=<dấu thời gian> — sinh ra lúc
// máy chủ chạy, nên `SHELL_ASSETS` không liệt kê trước được. Chúng chỉ vào kho
// đệm nhờ lời nhắn trang gửi xuống SAU khi nạp danh sách phân hệ. Móc
// `activate` mà xoá sạch kho cũ thì có một khe: cô cập nhật app xong đi ra sân
// sóng yếu, trang chưa kịp nạp lại, và đúng những màn mầm non không dựng lên
// được.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const NGUON = fs.readFileSync(path.join(GOC, 'public', 'sw.js'), 'utf8');
const GOC_WEB = 'https://truong.example';

// --- Kho đệm giả, đủ dùng cho những gì sw.js gọi tới -----------------------
function taoKho() {
  const kho = new Map();                   // tên kho → Map(url → 'nội dung')

  const boc = (ten) => {
    const m = kho.get(ten);
    return {
      async keys() { return [...m.keys()].map(u => ({ url: u })); },
      async match(req) {
        const u = typeof req === 'string' ? new URL(req, GOC_WEB).href : req.url;
        return m.has(u) ? { _noiDung: m.get(u), clone() { return this; } } : undefined;
      },
      async put(req, res) {
        const u = typeof req === 'string' ? new URL(req, GOC_WEB).href : req.url;
        m.set(u, res && res._noiDung !== undefined ? res._noiDung : 'moi');
      },
      async add(req) {
        const u = typeof req === 'string' ? new URL(req, GOC_WEB).href : req.url;
        m.set(u, 'nap-luc-cai-dat');
      },
    };
  };

  return {
    kho,
    api: {
      async open(ten) { if (!kho.has(ten)) kho.set(ten, new Map()); return boc(ten); },
      async keys() { return [...kho.keys()]; },
      async delete(ten) { return kho.delete(ten); },
      async match() { return undefined; },
    },
    dat(ten, cacUrl) {
      const m = new Map();
      for (const [u, noiDung] of cacUrl) m.set(new URL(u, GOC_WEB).href, noiDung);
      kho.set(ten, m);
    },
    doc(ten) {
      const m = kho.get(ten);
      return m ? [...m.keys()].map(u => new URL(u).pathname + new URL(u).search) : null;
    },
  };
}

// --- Nạp sw.js vào hộp cát và bắt lại các móc nó đăng ký -------------------
function napSw(kho) {
  const moc = {};
  const daGoi = { skipWaiting: 0, claim: 0 };
  const self = {
    addEventListener(ten, fn) { moc[ten] = fn; },
    skipWaiting() { daGoi.skipWaiting += 1; },
    clients: { async claim() { daGoi.claim += 1; } },
    location: { origin: GOC_WEB },
  };
  const sandbox = {
    self,
    caches: kho.api,
    URL,
    Request: class { constructor(u) { this.url = new URL(u, GOC_WEB).href; } },
    Response: class { constructor(b) { this._noiDung = b; } clone() { return this; } },
    fetch: async () => { throw new Error('bài này không cho gọi mạng'); },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(NGUON, sandbox, { filename: 'public/sw.js' });
  return { moc, daGoi };
}

// Gọi một móc rồi CHỜ XONG phần việc nó nhận trong `waitUntil`.
async function goiMoc(fn, duLieu = {}) {
  const cho = [];
  await fn({ ...duLieu, waitUntil: (p) => cho.push(p) });
  await Promise.all(cho);
}

const VER = /^const VERSION = '([^']+)';/m.exec(NGUON)[1];
const KHO_MOI = `casa-mamnon-shell-${VER}`;
const KHO_CU = 'casa-mamnon-shell-v0-cu';

// ===========================================================================
console.log('\n[1] Nạp được mã thật và bắt được đủ móc — nếu không thì cả bài vô nghĩa');
{
  const kho = taoKho();
  const { moc } = napSw(kho);
  for (const ten of ['install', 'activate', 'message', 'fetch']) {
    check(`sw.js đăng ký móc "${ten}"`, typeof moc[ten] === 'function', Object.keys(moc));
  }
  check('đọc được hằng VERSION từ chính tệp', /^v\d+$/.test(VER), VER);
}

// ===========================================================================
console.log('\n[2] Cài đặt nạp sẵn vỏ ứng dụng');
{
  const kho = taoKho();
  const { moc, daGoi } = napSw(kho);
  await goiMoc(moc.install);
  const daNap = kho.doc(KHO_MOI) || [];
  check('kho đệm của phiên bản này được tạo', daNap.length > 10, daNap.length);
  check('có trang chủ và tệp giao diện lõi',
    daNap.includes('/index.html') && daNap.includes('/js/app.js'), daNap.slice(0, 5));
  check('và nhường quyền ngay, không chờ đóng hết tab', daGoi.skipWaiting === 1, daGoi.skipWaiting);
}

// ===========================================================================
console.log('\n[3] ĐỔI PHIÊN BẢN: MÀN HÌNH PHÂN HỆ ĐI THEO, VỎ CŨ THÌ KHÔNG');
{
  const kho = taoKho();
  const { moc, daGoi } = napSw(kho);

  // Kho của phiên bản trước: hai màn phân hệ cô đã dùng, cộng một tệp vỏ cũ.
  kho.dat(KHO_CU, [
    ['/modules/nhatky/view.js?v=111', 'nhatky-cu'],
    ['/modules/thuchup/view.js?v=222', 'thuchup-cu'],
    ['/js/views/dashboard.js', 'dashboard-CU-KHONG-DUOC-GIU'],
    ['/index.html', 'index-CU-KHONG-DUOC-GIU'],
  ]);

  await goiMoc(moc.install);
  await goiMoc(moc.activate);

  const con = kho.doc(KHO_MOI) || [];
  check('MÀN NHẬT KÝ NGÀY ĐI THEO SANG PHIÊN BẢN MỚI',
    con.includes('/modules/nhatky/view.js?v=111'), con.filter(u => u.startsWith('/modules/')));
  check('MÀN GHI NHANH CŨNG ĐI THEO',
    con.includes('/modules/thuchup/view.js?v=222'), con.filter(u => u.startsWith('/modules/')));

  // Vế ngược lại quan trọng ngang: giữ bản cũ của tệp vỏ là dựng lại đúng cái
  // bẫy "máy đã cài kẹt ở bản cũ" mà hằng VERSION sinh ra để tránh.
  const banVo = (u) => (kho.kho.get(KHO_MOI) || new Map()).get(new URL(u, GOC_WEB).href);
  check('tệp vỏ thì KHÔNG giữ bản cũ — nó vừa được nạp mới ở bước cài đặt',
    banVo('/js/views/dashboard.js') === 'nap-luc-cai-dat', banVo('/js/views/dashboard.js'));
  check('trang chủ cũng vậy',
    banVo('/index.html') === 'nap-luc-cai-dat', banVo('/index.html'));

  check('kho đệm của phiên bản cũ bị dọn hẳn', !kho.kho.has(KHO_CU), [...kho.kho.keys()]);
  check('và nhận quyền điều khiển các tab đang mở', daGoi.claim === 1, daGoi.claim);
}

// ===========================================================================
console.log('\n[4] Kho cũ hỏng thì bước kích hoạt vẫn phải xong');
{
  const kho = taoKho();
  const { moc, daGoi } = napSw(kho);
  kho.dat(KHO_CU, [['/modules/dontra/view.js?v=9', 'x']]);
  // Giả cảnh kho cũ đọc lỗi giữa chừng.
  const moThat = kho.api.open;
  kho.api.open = async (ten) => {
    if (ten === KHO_CU) throw new Error('kho hỏng');
    return moThat(ten);
  };
  await goiMoc(moc.install);
  await goiMoc(moc.activate);
  check('KHÔNG treo và vẫn nhận quyền điều khiển', daGoi.claim === 1, daGoi.claim);
  check('kho hỏng vẫn bị dọn', !kho.kho.has(KHO_CU), [...kho.kho.keys()]);
}

// ===========================================================================
console.log('\n[5] Có trần cho số màn mang theo — kho cũ khổng lồ không làm treo');
{
  const kho = taoKho();
  const { moc } = napSw(kho);
  const nhieu = [];
  for (let i = 0; i < 200; i++) nhieu.push([`/modules/gia${i}/view.js?v=${i}`, `x${i}`]);
  kho.dat(KHO_CU, nhieu);

  await goiMoc(moc.install);
  await goiMoc(moc.activate);

  const soMan = (kho.doc(KHO_MOI) || []).filter(u => u.startsWith('/modules/')).length;
  check('mang theo có trần, không mang hết 200', soMan > 0 && soMan <= 40, soMan);
  const tran = /TOI_DA_MAN_MANG_THEO = (\d+)/.exec(NGUON);
  check('trần đó là một hằng có tên trong mã, không phải số rơi giữa dòng',
    !!tran && Number(tran[1]) === 40, tran && tran[1]);
  check('và trần rộng hơn số phân hệ đang có nhiều lần',
    Number(tran[1]) >= 3 * fs.readdirSync(path.join(GOC, 'modules'))
      .filter(t => fs.existsSync(path.join(GOC, 'modules', t, 'module.json'))).length);
}

// ===========================================================================
console.log('\n[6] Lời nhắn của trang vẫn nạp được màn phân hệ, và CHỈ màn phân hệ');
{
  const kho = taoKho();
  const { moc } = napSw(kho);
  await goiMoc(moc.install);
  await goiMoc(moc.message, {
    data: { type: 'luu-man-hinh', urls: [
      '/modules/hanhtrinh/view.js?v=7',
      '/api/students',                 // dữ liệu riêng của bé — tuyệt đối không lưu
      'https://ngoai.example/xau.js',  // địa chỉ ngoài
    ] },
  });
  const con = kho.doc(KHO_MOI) || [];
  check('màn phân hệ được nạp theo lời nhắn', con.includes('/modules/hanhtrinh/view.js?v=7'),
    con.filter(u => u.startsWith('/modules/')));
  check('KHÔNG lưu đường /api/ — đó là dữ liệu riêng của từng bé',
    !con.some(u => u.startsWith('/api/')), con.filter(u => u.startsWith('/api/')));
  check('không lưu địa chỉ ngoài trường',
    !con.some(u => /ngoai\.example/.test(u)), con.filter(u => /ngoai/.test(u)));
}

tongKet();
