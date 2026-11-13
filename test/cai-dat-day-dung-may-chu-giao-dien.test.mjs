// Thẻ "Thông báo trên điện thoại" ở màn Cài đặt chỉ nói "máy này đang nhận"
// khi MÁY CHỦ cũng có đăng ký của ĐÚNG người đang đăng nhập cho máy ấy (Đ257).
//
// Chạy bằng:  node test/cai-dat-day-dung-may-chu-giao-dien.test.mjs
//
// Bản trước chỉ hỏi trình duyệt "còn giữ đăng ký đẩy không". Trình duyệt còn
// giữ mà máy chủ không có dòng nào của người đang đăng nhập thì thẻ vẫn ghi
// "đang nhận" và giấu nút "Bật trên máy này" — người ấy không bao giờ nhận
// tin, và không có nút nào để sửa. Hai ca có thật: người khác đăng nhập trên
// máy của người cũ (người cũ không bấm Đăng xuất), và trường vừa đổi khoá
// hoặc quản trị vừa gỡ máy.
//
//   [1] Bật lần đầu: y như cũ, và máy chưa có đăng ký thì không hỏi máy chủ.
//   [2] Đã bật thật: thẻ ghi đang nhận, đổi trạng thái đúng MỘT lần, hỏi máy
//       chủ đúng một lần.
//   [3] Lần nối lại lúc đăng nhập bị hỏng: mở Cài đặt là nối lại, "Gửi thử"
//       không còn rơi vào tin nhắc "đăng nhập lại".
//   [4] Máy chủ không trả lời được: thẻ tin vào trình duyệt như trước, không
//       báo oan "chưa bật", không lời báo lỗi.
//   [5] Người khác đăng nhập trên máy còn đăng ký của người cũ: thẻ ghi CHƯA
//       bật, bấm Bật là đăng ký sang tên người mới.
//   [6] Trường đổi khoá: thẻ ghi chưa bật; bấm Bật thì huỷ đăng ký cũ (tạo
//       bằng khoá cũ) rồi đăng ký lại bằng khoá mới.
//   [7] Quản trị gỡ máy: thẻ ghi chưa bật, bấm Bật là có lại.
//   [8] Ca thường ngày: tắt trên máy này, trình duyệt đang chặn, tài khoản
//       còn máy khác đang bật.
//   [9] Tài khoản không có loại tin nào: không thấy thẻ, không hỏi máy chủ.
//   [10] Không lỗi JS nào.
//
// Phần đẩy của trình duyệt được thay bằng bản giả giữ trạng thái trong
// localStorage — cùng lý do và cùng cách với
// `test/dang-xuat-huy-day-giao-dien.test.mjs`. Bản giả ở đây nhớ thêm đăng ký
// được tạo bằng KHOÁ nào, và từ chối đăng ký bằng khoá khác khi còn đăng ký
// cũ — đúng điều trình duyệt thật làm, và là lý do phải huỷ rồi mới đăng ký lại.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoReq, taoLogin, taoBoDem,
  taoQuanTri, datChucVu, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cai-dat-day-may-chu-gd');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng Thử', 'c_qt');
// Nhân sự: chức vụ KHÔNG có loại tin đẩy nào. (Bản đầu của bài dùng kế toán;
// từ Đ257B kế toán nhận tin nhắc hạn nộp nên không còn là ví dụ đúng.)
const mkKT = taoQuanTri(DIR, 'Nhân Sự Thử', 'c_ns');
datChucVu(DIR, 'c_ns', 'nhansu');
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7367), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

function doc(sql, ...ts) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
}
function ghi(sql, ...ts) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
}
const chuCua = (endpoint) => (doc('SELECT userId FROM push_dang_ky WHERE endpoint = ?', endpoint)[0] || {}).userId || null;
const noi = (endpoint) => doc('SELECT phienTaoLuc, daNhac FROM push_dang_ky_phien WHERE endpoint = ?', endpoint)[0] || null;
const soDong = () => doc('SELECT COUNT(*) AS n FROM push_dang_ky')[0].n;
const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Tài khoản quản trị tạo bằng script mang mật khẩu tạm — đặt mật khẩu riêng
// trước, rồi mới dùng được.
const MK_QT = 'quantri2026';
async function datMatKhau(u, mkTam) {
  const d = await login(u, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: MK_QT } });
  return (await login(u, MK_QT)).cookie;
}
const QT = await datMatKhau('c_qt', mkQT);
await datMatKhau('c_ns', mkKT);

const MAY_1 = 'https://day.example.invalid/may-gia-1';
const MAY_2 = 'https://day.example.invalid/may-gia-2';
const MAY_O_NHA = 'https://day.example.invalid/may-o-nha';
const CHUA_BAT = 'Máy này chưa bật thông báo.';
const DANG_NHAN = 'Máy này đang nhận thông báo.';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
await ctx.addInitScript(() => {
  const KHOA = 'gia-day';
  const doc = () => { try { return JSON.parse(localStorage.getItem(KHOA) || '{}'); } catch (_) { return {}; } };
  const ghi = (o) => localStorage.setItem(KHOA, JSON.stringify(o));
  // Nhật ký việc trình duyệt được bảo làm, theo đúng thứ tự.
  const viec = (ten) => { const o = doc(); o.viec = [...(o.viec || []), ten]; ghi(o); };
  const taoSub = (endpoint) => ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'khoa-gia', auth: 'khoa-gia' } }),
    unsubscribe: () => {
      viec('huy');
      const o = doc(); delete o.endpoint; delete o.khoaDangKy; ghi(o);
      return Promise.resolve(true);
    },
  });
  const reg = { pushManager: {
    getSubscription: () => { const o = doc(); return Promise.resolve(o.endpoint ? taoSub(o.endpoint) : null); },
    subscribe: (tuyChon) => {
      if (doc().hongDichVu) {
        // Dịch vụ thông báo của hãng trình duyệt không tới được: lỗi tiếng Anh.
        viec('dich-vu-hong');
        return Promise.reject(new DOMException('Registration failed - push service error', 'AbortError'));
      }
      const khoa = Array.from((tuyChon && tuyChon.applicationServerKey) || []).join('.');
      const o = doc();
      if (o.endpoint && o.khoaDangKy !== khoa) {
        // Trình duyệt thật: còn đăng ký tạo bằng khoá khác thì từ chối.
        viec('dang-ky-bi-tu-choi');
        return Promise.reject(new DOMException(
          'A subscription with a different applicationServerKey already exists', 'InvalidStateError'));
      }
      if (o.endpoint) { viec('dang-ky-lai-cu'); return Promise.resolve(taoSub(o.endpoint)); }
      o.soMay = (o.soMay || 0) + 1;
      o.endpoint = `https://day.example.invalid/may-gia-${o.soMay}`;
      o.khoaDangKy = khoa;
      ghi(o);
      viec('dang-ky-moi');
      return Promise.resolve(taoSub(o.endpoint));
    },
  } };
  ServiceWorkerContainer.prototype.getRegistration = () => Promise.resolve(reg);
  Object.defineProperty(ServiceWorkerContainer.prototype, 'ready', { configurable: true, get: () => Promise.resolve(reg) });
  if (!('PushManager' in window)) window.PushManager = function PushManager() {};
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => doc().quyen || 'default' });
  Notification.requestPermission = () => {
    const o = doc(); o.quyen = 'granted'; ghi(o);
    return Promise.resolve('granted');
  };

  // Lời báo nổi tự biến mất sau vài giây — chép lại từng cái để bài này đếm
  // được cả những cái đã tắt.
  new MutationObserver((ds) => {
    for (const d of ds) {
      for (const n of d.addedNodes) {
        if (n.nodeType !== 1 || !n.classList || !n.classList.contains('toast')) continue;
        let o = [];
        try { o = JSON.parse(localStorage.getItem('gia-bao') || '[]'); } catch (_) { o = []; }
        o.push({ loi: n.classList.contains('error'), chu: n.textContent });
        localStorage.setItem('gia-bao', JSON.stringify(o));
      }
    }
  }).observe(document, { childList: true, subtree: true });
});
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

// Mọi lời gọi tới phần đẩy của máy chủ mà APP phát ra, theo thứ tự.
const luotDay = [];
page.on('request', (r) => {
  const duong = new URL(r.url()).pathname;
  if (!duong.startsWith('/api/push/')) return;
  let than = null;
  try { than = JSON.parse(r.postData() || 'null'); } catch (_) { than = r.postData(); }
  luotDay.push({ goi: `${r.method()} ${duong}`, than });
});
const luotTu = (n0) => luotDay.slice(n0).map(l => l.goi);
const HOI_TRANG_THAI = 'GET /api/push/trang-thai';
const HOI_MAY_NAY = 'POST /api/push/dong-bo';

const gia = () => page.evaluate(() => JSON.parse(localStorage.getItem('gia-day') || '{}'));
const datGia = (them) => page.evaluate((t) => {
  const o = JSON.parse(localStorage.getItem('gia-day') || '{}');
  localStorage.setItem('gia-day', JSON.stringify({ ...o, ...t }));
}, them);
const cacBao = () => page.evaluate(() => JSON.parse(localStorage.getItem('gia-bao') || '[]'));
const baoLoiTu = async (n0) => (await cacBao()).slice(n0).filter(b => b.loi).map(b => b.chu);

async function dangNhapTrenManHinh(ten, matKhau = '123456') {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', ten);
  await page.fill('#lg-pass', matKhau);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
  // Lúc đăng nhập app tự gọi đường nối lại một lần (Đ255) — chờ nó xong để
  // các phép đếm bên dưới chỉ đếm lời gọi của màn Cài đặt.
  await page.waitForLoadState('networkidle');
}
// Rời máy mà KHÔNG bấm Đăng xuất: phiên trên máy chủ mất, trình duyệt còn
// nguyên đăng ký đẩy.
async function roiMayKhongDangXuat() {
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await page.evaluate(() => { location.hash = '#/'; });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
}
async function mocPhienCuaTrinhDuyet() {
  const c = (await ctx.cookies()).find(x => x.name === 'session');
  return c ? (doc('SELECT createdAt FROM sessions WHERE token = ?', c.value)[0] || {}).createdAt || null : null;
}

// Mở màn Cài đặt từ trang chủ và chép lại TỪNG trạng thái thẻ đi qua: dòng chữ
// kèm nút "Bật trên máy này" có đang hiện không. Trả về { chu, cacBuoc, luot }.
async function moCaiDat() {
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  const n0 = luotDay.length;
  await page.evaluate(() => {
    if (window.__canhThe) window.__canhThe.disconnect();
    window.__cacBuoc = [];
    const xem = () => {
      const o = document.getElementById('st-push-trang-thai');
      const nut = document.getElementById('st-push-bat');
      if (!o) return;
      const buoc = `${o.textContent.trim()}|${nut && nut.style.display !== 'none' ? 'có nút Bật' : 'không nút Bật'}`;
      if (window.__cacBuoc[window.__cacBuoc.length - 1] !== buoc) window.__cacBuoc.push(buoc);
    };
    window.__canhThe = new MutationObserver(xem);
    window.__canhThe.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'],
    });
    location.hash = '#/settings';
  });
  await page.waitForSelector('#st-push-trang-thai', { timeout: 10000 });
  await page.waitForFunction(
    () => !/Đang kiểm tra/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);
  return {
    chu: (await page.locator('#st-push-trang-thai').innerText()).trim(),
    cacBuoc: await page.evaluate(() => window.__cacBuoc),
    luot: luotTu(n0),
    n0,
  };
}
const nutHien = async () => ({
  bat: await page.locator('#st-push-bat').isVisible(),
  tat: await page.locator('#st-push-tat').isVisible(),
  thu: await page.locator('#st-push-thu').isVisible(),
});
async function bamBat() {
  // Nút đang ẩn thì không bấm được — để các phép kiểm bên dưới nói, bài không gãy giữa chừng.
  await page.click('#st-push-bat', { timeout: 3000 }).catch(() => {});
  await page.waitForFunction(
    () => /đang nhận thông báo/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 })
    .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
  await page.waitForLoadState('networkidle');
  return (await page.locator('#st-push-trang-thai').innerText()).trim();
}

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });

  // =========================================================================
  console.log('\n[1] Bật lần đầu trên một máy mới — y như cũ');
  await dangNhapTrenManHinh('phuhuynh');
  {
    const m = await moCaiDat();
    check('máy mới: thẻ ghi chưa bật, có nút Bật, không nút Tắt và Gửi thử',
      m.chu === CHUA_BAT && bang(await nutHien(), { bat: true, tat: false, thu: false }), [m.chu, await nutHien()]);
    check('trình duyệt chưa có đăng ký nào thì KHÔNG hỏi máy chủ về máy này', bang(m.luot, [HOI_TRANG_THAI]), m.luot);
    const b0 = (await cacBao()).length;
    const chu = await bamBat();
    const g = await gia();
    check('bấm Bật: thẻ ghi đang nhận, nút Bật ẩn, nút Tắt và Gửi thử hiện',
      chu === DANG_NHAN && bang(await nutHien(), { bat: false, tat: true, thu: true }), [chu, await nutHien()]);
    check('trình duyệt đăng ký đúng một lần, không huỷ gì', bang(g.viec, ['dang-ky-moi']) && g.endpoint === MAY_1, g);
    check('máy chủ ghi đăng ký của máy này cho đúng người bấm', chuCua(MAY_1) === 'p1' && soDong() === 1, [chuCua(MAY_1), soDong()]);
    check('không lời báo lỗi nào', (await baoLoiTu(b0)).length === 0, await baoLoiTu(b0));
  }

  // =========================================================================
  console.log('\n[2] Đã bật thật → thẻ ghi đang nhận, đổi trạng thái đúng một lần');
  {
    const b0 = (await cacBao()).length;
    const m = await moCaiDat();
    check('thẻ ghi máy này đang nhận thông báo', m.chu === DANG_NHAN, m.chu);
    check('không nút Bật; có nút Tắt và Gửi thử', bang(await nutHien(), { bat: false, tat: true, thu: true }), await nutHien());
    check('thẻ đi thẳng từ "Đang kiểm tra…" sang "đang nhận" — không nhấp nháy qua trạng thái nào khác',
      bang(m.cacBuoc, ['Đang kiểm tra…|có nút Bật', `${DANG_NHAN}|không nút Bật`]), m.cacBuoc);
    check('mỗi lần mở Cài đặt: hỏi trạng thái một lần, rồi hỏi máy chủ về máy này một lần',
      bang(m.luot, [HOI_TRANG_THAI, HOI_MAY_NAY]), m.luot);
    check('và gửi đúng địa chỉ đẩy của máy này', bang((luotDay[m.n0 + 1] || {}).than, { endpoint: MAY_1 }), luotDay[m.n0 + 1]);
    check('không lời báo nào hiện ra', (await cacBao()).length === b0, (await cacBao()).slice(b0));
  }

  // =========================================================================
  console.log('\n[3] Lần nối lại lúc đăng nhập bị hỏng → mở Cài đặt là nối lại');
  {
    // Như máy chủ thấy khi lời gọi nối lại sau đăng nhập không tới nơi: đăng
    // ký còn trỏ về một phiên đã hết, và máy đã bị nhắc "đăng nhập lại".
    ghi('UPDATE push_dang_ky_phien SET phienTaoLuc = 1, daNhac = 1 WHERE endpoint = ?', MAY_1);
    const m = await moCaiDat();
    const moc = await mocPhienCuaTrinhDuyet();
    check('thẻ ghi đang nhận', m.chu === DANG_NHAN, m.chu);
    check('máy chủ đã nối đăng ký của máy này với phiên đang dùng — "Gửi thử" không còn rơi vào tin nhắc đăng nhập lại',
      !!moc && bang(noi(MAY_1), { phienTaoLuc: moc, daNhac: 0 }), [moc, noi(MAY_1)]);

    // Nút "Gửi thử" vẫn gọi đúng đường cũ và báo đúng câu cũ. Máy chủ thử
    // không có dịch vụ đẩy thật đứng sau, nên câu trả lời được dựng sẵn.
    await page.route('**/api/push/thu', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"guiDuoc":1}' }));
    const n0 = luotDay.length; const b0 = (await cacBao()).length;
    await page.click('#st-push-thu');
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem('gia-bao') || '[]').length > n, b0, { timeout: 5000 })
      .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    await page.unroute('**/api/push/thu');
    check('"Gửi thử" gọi đúng một lời gọi như cũ', bang(luotTu(n0), ['POST /api/push/thu']), luotTu(n0));
    check('và báo đã gửi thử', bang((await cacBao()).slice(b0), [{ loi: false, chu: 'Đã gửi thử — vài giây nữa máy sẽ báo' }]), (await cacBao()).slice(b0));
  }

  // =========================================================================
  console.log('\n[4] Máy chủ không trả lời được → thẻ tin vào trình duyệt như trước');
  {
    const cacCa = [
      ['lỗi 500', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Lỗi máy chủ thử"}' })],
      ['từ chối 403 (chức vụ không được gọi đường này)', r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"Chức vụ này không dùng phần này"}' })],
      ['đứt mạng', r => r.abort('internetdisconnected')],
      ['trả về thứ không phải câu trả lời (trang HTML)', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>bảo trì</html>' })],
      ['máy chủ đời cũ, trả lời thiếu ý có hay không', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })],
    ];
    for (const [ten, tra] of cacCa) {
      await page.route('**/api/push/dong-bo', tra);
      const b0 = (await cacBao()).length;
      const m = await moCaiDat();
      await page.unroute('**/api/push/dong-bo');
      check(`${ten}: app có hỏi máy chủ`, bang(m.luot, [HOI_TRANG_THAI, HOI_MAY_NAY]), m.luot);
      check(`${ten}: thẻ vẫn ghi đang nhận, không đổi oan thành chưa bật`,
        m.chu === DANG_NHAN && bang(await nutHien(), { bat: false, tat: true, thu: true }), [m.chu, await nutHien()]);
      check(`${ten}: thẻ đổi trạng thái đúng một lần, không lời báo nào`,
        bang(m.cacBuoc, ['Đang kiểm tra…|có nút Bật', `${DANG_NHAN}|không nút Bật`]) && (await cacBao()).length === b0,
        [m.cacBuoc, (await cacBao()).slice(b0)]);
    }
    check('và không ca nào đụng tới đăng ký ở máy chủ', chuCua(MAY_1) === 'p1' && soDong() === 1, [chuCua(MAY_1), soDong()]);
  }

  // =========================================================================
  console.log('\n[5] Người KHÁC đăng nhập trên máy còn đăng ký của người cũ');
  {
    await roiMayKhongDangXuat();
    check('đối chứng — trình duyệt còn đăng ký đẩy, máy chủ còn dòng của người cũ',
      (await gia()).endpoint === MAY_1 && chuCua(MAY_1) === 'p1', [await gia(), chuCua(MAY_1)]);
    await dangNhapTrenManHinh('phuhuynh2');
    const g0 = await gia();
    const m = await moCaiDat();
    check('thẻ của người mới ghi CHƯA bật — không nói "đang nhận"', m.chu === CHUA_BAT, m.chu);
    check('có nút "Bật trên máy này"; không nút Tắt và Gửi thử', bang(await nutHien(), { bat: true, tat: false, thu: false }), await nutHien());
    check('thẻ không hề lướt qua chữ "đang nhận"',
      bang(m.cacBuoc, ['Đang kiểm tra…|có nút Bật', `${CHUA_BAT}|có nút Bật`]), m.cacBuoc);
    check('chỉ mở xem thì đăng ký vẫn của người cũ', chuCua(MAY_1) === 'p1' && soDong() === 1, [chuCua(MAY_1), soDong()]);

    const b0 = (await cacBao()).length;
    const chu = await bamBat();
    const g1 = await gia();
    const moc = await mocPhienCuaTrinhDuyet();
    check('bấm Bật: thẻ ghi đang nhận, nút Bật ẩn', chu === DANG_NHAN && bang(await nutHien(), { bat: false, tat: true, thu: true }), [chu, await nutHien()]);
    check('đăng ký của máy này nay thuộc người MỚI, và người cũ không còn dòng nào',
      chuCua(MAY_1) === 'p2' && soDong() === 1, [chuCua(MAY_1), soDong()]);
    check('và được nối với phiên của người mới', !!moc && bang(noi(MAY_1), { phienTaoLuc: moc, daNhac: 0 }), [moc, noi(MAY_1)]);
    check('đăng ký của trình duyệt còn dùng được nên không huỷ, không tạo địa chỉ mới',
      bang((g1.viec || []).slice((g0.viec || []).length), ['dang-ky-lai-cu']) && g1.endpoint === MAY_1, g1);
    check('báo đã bật, không lời báo lỗi',
      bang((await cacBao()).slice(b0), [{ loi: false, chu: 'Đã bật thông báo trên máy này' }]), (await cacBao()).slice(b0));
  }

  // =========================================================================
  console.log('\n[6] Trường đổi khoá → thẻ ghi chưa bật; bấm Bật thì huỷ đăng ký cũ rồi đăng ký lại');
  {
    const doi = await req('POST', '/api/push/doi-khoa', { cookie: QT, body: { xacNhan: 'DOI KHOA' } });
    check('đối chứng — đổi khoá xong máy chủ không còn dòng nào, trình duyệt vẫn giữ đăng ký cũ',
      doi.status === 200 && soDong() === 0 && (await gia()).endpoint === MAY_1, [doi.status, soDong(), await gia()]);
    const g0 = await gia();
    const m = await moCaiDat();
    check('thẻ ghi chưa bật, có nút Bật', m.chu === CHUA_BAT && bang(await nutHien(), { bat: true, tat: false, thu: false }), [m.chu, await nutHien()]);
    check('thẻ không hề lướt qua chữ "đang nhận"',
      bang(m.cacBuoc, ['Đang kiểm tra…|có nút Bật', `${CHUA_BAT}|có nút Bật`]), m.cacBuoc);

    const b0 = (await cacBao()).length;
    const chu = await bamBat();
    const g1 = await gia();
    check('trình duyệt từ chối đăng ký bằng khoá mới khi còn đăng ký cũ → app HUỶ đăng ký cũ rồi đăng ký lại',
      bang((g1.viec || []).slice((g0.viec || []).length), ['dang-ky-bi-tu-choi', 'huy', 'dang-ky-moi']), g1.viec);
    check('máy chủ có dòng mới của đúng người bấm, địa chỉ cũ không còn',
      g1.endpoint === MAY_2 && chuCua(MAY_2) === 'p2' && chuCua(MAY_1) === null && soDong() === 1, [g1.endpoint, chuCua(MAY_2), soDong()]);
    check('thẻ ghi đang nhận, nút Bật ẩn', chu === DANG_NHAN && bang(await nutHien(), { bat: false, tat: true, thu: true }), [chu, await nutHien()]);
    check('báo đã bật, không lời báo lỗi',
      bang((await cacBao()).slice(b0), [{ loi: false, chu: 'Đã bật thông báo trên máy này' }]), (await cacBao()).slice(b0));
  }

  // =========================================================================
  console.log('\n[7] Quản trị gỡ máy của người này → thẻ ghi chưa bật, bấm Bật là có lại');
  {
    const go = await req('POST', '/api/push/quan-tri/go', { cookie: QT, body: { userId: 'p2' } });
    check('đối chứng — gỡ xong máy chủ không còn dòng nào', go.status === 200 && soDong() === 0, [go.status, soDong()]);
    const g0 = await gia();
    const m = await moCaiDat();
    check('thẻ ghi chưa bật, có nút Bật', m.chu === CHUA_BAT && bang(await nutHien(), { bat: true, tat: false, thu: false }), [m.chu, await nutHien()]);
    const chu = await bamBat();
    const g1 = await gia();
    check('bấm Bật: máy chủ có lại dòng của máy này, thẻ ghi đang nhận',
      chu === DANG_NHAN && chuCua(MAY_2) === 'p2' && soDong() === 1, [chu, chuCua(MAY_2), soDong()]);
    check('khoá không đổi nên không phải huỷ đăng ký của trình duyệt',
      bang((g1.viec || []).slice((g0.viec || []).length), ['dang-ky-lai-cu']), g1.viec);
  }

  // =========================================================================
  console.log('\n[8] Ca thường ngày: tắt, trình duyệt đang chặn, tài khoản còn máy khác');
  {
    const b0 = (await cacBao()).length;
    await page.click('#st-push-tat', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(
      () => /chưa bật/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 })
      .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('bấm Tắt: thẻ ghi chưa bật, nút Bật hiện lại',
      (await page.locator('#st-push-trang-thai').innerText()).trim() === CHUA_BAT
        && bang(await nutHien(), { bat: true, tat: false, thu: false }), await nutHien());
    check('máy chủ xoá dòng của máy này, trình duyệt thôi giữ đăng ký', soDong() === 0 && !(await gia()).endpoint, [soDong(), await gia()]);
    check('báo đã tắt', bang((await cacBao()).slice(b0), [{ loi: false, chu: 'Đã tắt thông báo trên máy này' }]), (await cacBao()).slice(b0));

    await datGia({ quyen: 'denied' });
    let m = await moCaiDat();
    check('trình duyệt đang chặn thông báo: thẻ nói mở cài đặt trình duyệt, không hỏi máy chủ về máy này',
      /đang chặn thông báo/.test(m.chu) && bang(m.luot, [HOI_TRANG_THAI]), [m.chu, m.luot]);

    // Người này bật ở một máy khác (điện thoại ở nhà).
    const p2 = await login('phuhuynh2', '123456');
    await req('POST', '/api/push/dang-ky', {
      cookie: p2.cookie, body: { subscription: { endpoint: MAY_O_NHA, keys: { p256dh: 'k', auth: 'k' } } },
    });
    await datGia({ quyen: 'granted' });
    m = await moCaiDat();
    check('máy này chưa bật, tài khoản bật ở máy khác: thẻ kể đúng một máy khác',
      m.chu === 'Máy này chưa bật. Tài khoản đang bật ở 1 máy khác.', m.chu);

    // Trình duyệt giữ một đăng ký mà máy chủ không biết (đã bị gỡ) — thẻ nói
    // bằng đúng câu của ca "chưa bật", không có câu riêng.
    await datGia({ endpoint: 'https://day.example.invalid/may-da-bi-go', khoaDangKy: (await gia()).khoaDangKy || '' });
    m = await moCaiDat();
    check('trình duyệt giữ đăng ký mà máy chủ không có: vẫn đúng câu "chưa bật", kể đúng một máy khác, có nút Bật',
      m.chu === 'Máy này chưa bật. Tài khoản đang bật ở 1 máy khác.' && bang(await nutHien(), { bat: true, tat: false, thu: false }),
      [m.chu, await nutHien()]);
    await datGia({ endpoint: '' });

    // Dịch vụ thông báo của trình duyệt hỏng lúc bấm Bật: câu báo phải là tiếng
    // Việt của app, không phải câu tiếng Anh trình duyệt ném ra (Đ257C).
    {
      const b1 = (await cacBao()).length;
      const dong0 = soDong();
      await datGia({ hongDichVu: true });
      await page.click('#st-push-bat', { timeout: 3000 }).catch(() => {});
      await page.waitForFunction((n) => JSON.parse(localStorage.getItem('gia-bao') || '[]').length > n, b1, { timeout: 10000 })
        .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
      await page.waitForLoadState('networkidle');
      const bao = (await cacBao()).slice(b1);
      check('trình duyệt không đăng ký được: app báo MỘT câu lỗi tiếng Việt, không lộ câu tiếng Anh của trình duyệt',
        bao.length === 1 && bao[0].loi && /Chưa bật được thông báo trên máy này/.test(bao[0].chu)
          && !/Registration|failed|push service|Error/i.test(bao[0].chu), bao);
      check('…không dòng nào được ghi ở máy chủ, thẻ vẫn ghi chưa bật và còn nút Bật',
        soDong() === dong0 && /chưa bật/i.test((await page.locator('#st-push-trang-thai').innerText()).trim())
          && (await nutHien()).bat, [soDong(), await nutHien()]);
      await datGia({ hongDichVu: false });
    }

    const chu = await bamBat();
    check('bật máy này nữa: thẻ ghi đang nhận và kể tài khoản có 2 máy',
      chu === `${DANG_NHAN} Tài khoản có 2 máy đang bật.`, chu);
  }

  // =========================================================================
  console.log('\n[9] Tài khoản không có loại tin nào → không thấy thẻ');
  {
    // Trình duyệt vẫn còn quyền thông báo và đăng ký đẩy của người trước.
    await roiMayKhongDangXuat();
    await dangNhapTrenManHinh('giaovien');
    let n0 = luotDay.length;
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForSelector('#st-change-pw', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    check('cô: không có thẻ "Thông báo trên điện thoại", màn Cài đặt không gọi phần đẩy',
      (await page.locator('#st-push-card').count()) === 0 && luotTu(n0).length === 0, luotTu(n0));

    await roiMayKhongDangXuat();
    await dangNhapTrenManHinh('c_ns', MK_QT);
    n0 = luotDay.length;
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForSelector('#st-change-pw', { timeout: 10000 });
    await page.waitForFunction(() => !document.getElementById('st-push-card'), null, { timeout: 10000 })
      .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    await page.waitForLoadState('networkidle');
    check('nhân sự (máy chủ nói không có loại tin nào): thẻ được gỡ đi, không hỏi máy chủ về máy này',
      (await page.locator('#st-push-card').count()) === 0 && bang(luotTu(n0), [HOI_TRANG_THAI]), luotTu(n0));
  }

  // =========================================================================
  console.log('\n[10] Không lỗi JS');
  check('không có lỗi JS nào trong suốt bài', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
