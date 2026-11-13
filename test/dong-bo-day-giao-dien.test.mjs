// Mở app hay đăng nhập lại trên máy ĐÃ bật thông báo thì app tự nối đăng ký
// đẩy của máy với phiên đăng nhập mới (Đ255).
//
// Chạy bằng:  node test/dong-bo-day-giao-dien.test.mjs
//
// Phần máy chủ (phiên hết thì thôi gửi tin về bé, một tin nhắc, nối lại đúng
// người) nằm ở `test/het-phien-thoi-day.test.mjs`. Bài này canh nửa còn lại:
// APP có tự gọi đường nối lại không — không có lời gọi ấy thì gia đình đăng
// nhập lại sau 30 ngày vẫn im, tới khi tự vào Cài đặt bấm Bật lần nữa — và
// lời gọi ấy hỏng kiểu gì thì app vẫn phải mở được, đăng nhập được.
//
//   [1] Đăng nhập lại trên máy còn đăng ký đẩy: app gửi địa chỉ đẩy của máy,
//       máy chủ nối với phiên mới, không phải bấm "Bật trên máy này".
//   [2] Mở lại app khi đang đăng nhập: cũng nối, đúng một lần.
//   [3] Máy chưa cho phép thông báo, hoặc không có đăng ký đẩy: không gọi gì.
//   [4] Đường nối lại trả lỗi, đứt mạng, service worker hỏng hay treo: app vẫn
//       vào trang chủ, không lời báo lỗi, không bị đưa về màn đăng nhập.
//   [5] Người khác đăng nhập trên máy đó: đăng ký của người cũ không đổi chủ.
//   [6] Không lỗi JS nào.
//
// Phần đẩy của trình duyệt được thay bằng bản giả giữ trạng thái trong
// localStorage — cùng lý do và cùng cách với
// `test/dang-xuat-huy-day-giao-dien.test.mjs`.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoReq, taoLogin, taoBoDem,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dong-bo-day-gd');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7365), dir: DIR });
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
const noi = (endpoint) => doc('SELECT phienTaoLuc, daNhac FROM push_dang_ky_phien WHERE endpoint = ?', endpoint)[0] || null;
const chuCua = (endpoint) => (doc('SELECT userId FROM push_dang_ky WHERE endpoint = ?', endpoint)[0] || {}).userId || null;

// MÁY NÀY đã bật thông báo từ một lần đăng nhập trước, và phiên ấy nay đã quá
// hạn; máy chủ đã gửi tin nhắc "đăng nhập lại" một lần.
const MAY_NAY = 'https://day.example.invalid/may-nay';
{
  const cu = await login('phuhuynh', '123456');
  await req('POST', '/api/push/dang-ky', {
    cookie: cu.cookie, body: { subscription: { endpoint: MAY_NAY, keys: { p256dh: 'k', auth: 'k' } } },
  });
  const moc = Date.now() - 31 * 24 * 3600 * 1000;
  ghi('UPDATE sessions SET createdAt = ? WHERE token = ?', moc, cu.cookie.split('=')[1]);
  ghi('UPDATE push_dang_ky_phien SET phienTaoLuc = ?, daNhac = 1 WHERE endpoint = ?', moc, MAY_NAY);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
await ctx.addInitScript(() => {
  const KHOA = 'gia-day';
  const doc = () => { try { return JSON.parse(localStorage.getItem(KHOA) || '{}'); } catch (_) { return {}; } };
  const ghi = (o) => localStorage.setItem(KHOA, JSON.stringify(o));
  const dem = (ten) => { const o = doc(); o[ten] = (o[ten] || 0) + 1; ghi(o); };
  const taoSub = (endpoint) => ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'khoa-gia', auth: 'khoa-gia' } }),
    unsubscribe: () => { const o = doc(); delete o.endpoint; ghi(o); return Promise.resolve(true); },
  });
  const reg = { pushManager: {
    getSubscription: () => { const o = doc(); return Promise.resolve(o.endpoint ? taoSub(o.endpoint) : null); },
    subscribe: () => Promise.resolve(taoSub(doc().endpoint)),
  } };
  ServiceWorkerContainer.prototype.getRegistration = () => {
    dem('soLanHoi');
    const o = doc();
    if (o.cheDo === 'hoi-nem') return Promise.reject(new Error('service worker hỏng'));
    if (o.cheDo === 'hoi-treo') return new Promise(() => {});
    return Promise.resolve(reg);
  };
  Object.defineProperty(ServiceWorkerContainer.prototype, 'ready', { configurable: true, get: () => Promise.resolve(reg) });
  if (!('PushManager' in window)) window.PushManager = function PushManager() {};
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => doc().quyen || 'default' });
  Notification.requestPermission = () => { dem('soLanXinQuyen'); return Promise.resolve(doc().quyen || 'default'); };
});
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

// Mọi lượt gọi đường nối lại mà APP phát ra, kèm thân yêu cầu.
const luotNoi = [];
page.on('request', (r) => {
  if (new URL(r.url()).pathname === '/api/push/dong-bo') {
    let than = null;
    try { than = JSON.parse(r.postData() || 'null'); } catch (_) { than = r.postData(); }
    luotNoi.push({ cach: r.method(), than });
  }
});
// Chờ tới khi app đã gọi đủ `soLuot` lượt (hoặc hết giờ — phép kiểm sẽ nói).
async function choLuotNoi(soLuot, ms = 4000) {
  const han = Date.now() + ms;
  while (luotNoi.length < soLuot && Date.now() < han) await page.waitForTimeout(50);
}

const gia = () => page.evaluate(() => JSON.parse(localStorage.getItem('gia-day') || '{}'));
const datGia = (them) => page.evaluate((t) => {
  const o = JSON.parse(localStorage.getItem('gia-day') || '{}');
  localStorage.setItem('gia-day', JSON.stringify({ ...o, ...t }));
}, them);
async function dangNhapTrenManHinh(ten = 'phuhuynh') {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', ten);
  await page.fill('#lg-pass', '123456');
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}
// Mở app như người dùng mở lại từ đầu. Phải TẢI LẠI trang: đang ở
// `#/settings` mà chỉ đổi địa chỉ về `/` thì trình duyệt không tải lại, và
// app không khởi động lại.
async function moLaiApp() {
  await page.evaluate(() => { location.hash = '#/'; });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.tile-grid, #lg-user', { timeout: 10000 });
}
async function mocPhienCuaTrinhDuyet() {
  const c = (await ctx.cookies()).find(x => x.name === 'session');
  return c ? (doc('SELECT createdAt FROM sessions WHERE token = ?', c.value)[0] || {}).createdAt || null : null;
}
const oTrangChu = () => page.locator('.tile-grid').isVisible();
const coBaoLoi = () => page.locator('.toast.error').count();

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  // Trình duyệt của máy này vẫn giữ quyền thông báo và đăng ký đẩy cũ.
  await datGia({ quyen: 'granted', endpoint: MAY_NAY });

  // =========================================================================
  console.log('\n[1] Đăng nhập lại trên máy còn đăng ký đẩy → app tự nối với phiên mới');
  {
    check('đối chứng — trước khi đăng nhập, máy chủ coi máy này là hết phiên và đã nhắc', (noi(MAY_NAY) || {}).daNhac === 1, noi(MAY_NAY));
    check('chưa đăng nhập thì app không gọi đường nối lại', luotNoi.length === 0, luotNoi);
    const g0 = await gia();
    await dangNhapTrenManHinh();
    await choLuotNoi(1);
    await page.waitForTimeout(300);
    check('app gọi đường nối lại đúng MỘT lần, bằng POST', luotNoi.length === 1 && luotNoi[0].cach === 'POST', luotNoi);
    check('và gửi đúng địa chỉ đẩy của chính máy này', !!luotNoi[0] && !!luotNoi[0].than && luotNoi[0].than.endpoint === MAY_NAY, luotNoi[0]);
    const moc = await mocPhienCuaTrinhDuyet();
    check('máy chủ nối đăng ký của máy này với phiên VỪA đăng nhập, bỏ cờ đã nhắc',
      !!moc && JSON.stringify(noi(MAY_NAY)) === JSON.stringify({ phienTaoLuc: moc, daNhac: 0 }), [moc, noi(MAY_NAY)]);
    const g1 = await gia();
    check('không xin quyền thông báo, không bấm Bật lần nào', (g1.soLanXinQuyen || 0) === (g0.soLanXinQuyen || 0), g1);
    check('đăng nhập xong vẫn ở trang chủ, không lời báo lỗi', await oTrangChu() && (await coBaoLoi()) === 0);
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForFunction(
      () => /đang nhận thông báo/.test((document.getElementById('st-push-trang-thai') || {}).textContent || ''), null, { timeout: 10000 })
      .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('màn Cài đặt nói máy này đang nhận thông báo',
      /đang nhận thông báo/.test(await page.locator('#st-push-trang-thai').innerText()));
  }

  // =========================================================================
  console.log('\n[2] Mở lại app khi đang đăng nhập → cũng nối, đúng một lần');
  {
    // Giả như máy chủ lại coi máy này là hết phiên (dòng nối trỏ về mốc cũ).
    ghi('UPDATE push_dang_ky_phien SET phienTaoLuc = 1, daNhac = 1 WHERE endpoint = ?', MAY_NAY);
    const n0 = luotNoi.length;
    await moLaiApp();
    await choLuotNoi(n0 + 1);
    await page.waitForTimeout(300);
    check('mở app: gọi đường nối lại đúng một lần, kèm địa chỉ đẩy của máy',
      luotNoi.length === n0 + 1 && luotNoi[n0].than && luotNoi[n0].than.endpoint === MAY_NAY, luotNoi.slice(n0));
    const moc = await mocPhienCuaTrinhDuyet();
    check('máy chủ nối lại với phiên đang dùng', !!moc && JSON.stringify(noi(MAY_NAY)) === JSON.stringify({ phienTaoLuc: moc, daNhac: 0 }), noi(MAY_NAY));
    check('app vào thẳng trang chủ', await oTrangChu());
  }

  // =========================================================================
  console.log('\n[3] Máy chưa cho phép thông báo, hoặc không có đăng ký đẩy → không gọi gì');
  {
    await datGia({ quyen: 'default' });
    let n0 = luotNoi.length; const g0 = await gia();
    await moLaiApp();
    await page.waitForTimeout(800);
    const g1 = await gia();
    check('chưa cho phép thông báo: KHÔNG gọi đường nối lại', luotNoi.length === n0, luotNoi.slice(n0));
    check('và không hỏi service worker lần nào', (g1.soLanHoi || 0) === (g0.soLanHoi || 0), { truoc: g0.soLanHoi, sau: g1.soLanHoi });
    check('app vẫn vào trang chủ', await oTrangChu());

    await datGia({ quyen: 'denied' });
    n0 = luotNoi.length;
    await moLaiApp();
    await page.waitForTimeout(800);
    check('trình duyệt đang chặn thông báo: cũng không gọi', luotNoi.length === n0 && await oTrangChu(), luotNoi.slice(n0));

    await datGia({ quyen: 'granted', endpoint: '' });
    n0 = luotNoi.length;
    await moLaiApp();
    await page.waitForTimeout(800);
    check('đã cho phép nhưng trình duyệt không giữ đăng ký đẩy nào: không gọi', luotNoi.length === n0 && await oTrangChu(), luotNoi.slice(n0));
    await datGia({ endpoint: MAY_NAY });
  }

  // =========================================================================
  console.log('\n[4] Đường nối lại hỏng kiểu gì thì app vẫn mở được');
  {
    for (const [ten, ma] of [['lỗi 500', 500], ['từ chối 403', 403], ['báo hết phiên 401', 401]]) {
      await page.route('**/api/push/dong-bo', r => r.fulfill({ status: ma, contentType: 'application/json', body: '{"error":"Lỗi máy chủ thử"}' }));
      const n0 = luotNoi.length;
      await moLaiApp();
      await choLuotNoi(n0 + 1);
      await page.waitForTimeout(400);
      await page.unroute('**/api/push/dong-bo');
      check(`máy chủ trả ${ten}: app có gọi, vẫn ở trang chủ, không lời báo lỗi, không về màn đăng nhập`,
        luotNoi.length === n0 + 1 && await oTrangChu() && (await coBaoLoi()) === 0 && !(await page.locator('#lg-user').isVisible()),
        { luot: luotNoi.length - n0, loi: await coBaoLoi() });
    }

    await page.route('**/api/push/dong-bo', r => r.abort('internetdisconnected'));
    let n0 = luotNoi.length;
    await moLaiApp();
    await choLuotNoi(n0 + 1);
    await page.waitForTimeout(400);
    await page.unroute('**/api/push/dong-bo');
    check('đứt mạng đúng lúc nối lại: app có gọi, vẫn ở trang chủ, không lời báo lỗi',
      luotNoi.length === n0 + 1 && await oTrangChu() && (await coBaoLoi()) === 0, luotNoi.length - n0);

    await datGia({ cheDo: 'hoi-nem' });
    n0 = luotNoi.length;
    await moLaiApp();
    await page.waitForTimeout(600);
    check('service worker ném lỗi: không gọi, app vẫn vào trang chủ, không lời báo lỗi',
      luotNoi.length === n0 && await oTrangChu() && (await coBaoLoi()) === 0, luotNoi.slice(n0));

    // Treo mãi không trả lời: cả mở app lẫn đăng nhập đều không được đứng chờ.
    await datGia({ cheDo: 'hoi-treo' });
    const t0 = Date.now();
    await moLaiApp();
    const msMo = Date.now() - t0;
    check('service worker TREO MÃI: mở app vẫn vào trang chủ trong vài giây', await oTrangChu() && msMo < 5000, msMo);
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForSelector('button:has-text("Đăng xuất")', { timeout: 10000 });
    await page.click('button:has-text("Đăng xuất")');
    const t1 = Date.now();
    await dangNhapTrenManHinh();
    const msDn = Date.now() - t1;
    check('và đăng nhập vẫn vào trang chủ trong vài giây, không lời báo lỗi', msDn < 5000 && (await coBaoLoi()) === 0, msDn);
    await datGia({ cheDo: '' });
  }

  // =========================================================================
  console.log('\n[5] Người KHÁC đăng nhập trên máy đó → đăng ký của người cũ không đổi chủ');
  {
    // Lượt đăng xuất ở mục [4] chạy lúc service worker treo nên máy chủ và
    // trình duyệt đều còn giữ đăng ký của người cũ — đúng cảnh máy sang tay.
    check('đối chứng — máy chủ còn dòng của người cũ, trình duyệt còn địa chỉ đẩy',
      chuCua(MAY_NAY) === 'p1' && (await gia()).endpoint === MAY_NAY, [chuCua(MAY_NAY), await gia()]);
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
    await moLaiApp();
    const truoc = JSON.stringify(noi(MAY_NAY));
    const n0 = luotNoi.length;
    await dangNhapTrenManHinh('phuhuynh2');
    await choLuotNoi(n0 + 1);
    await page.waitForTimeout(400);
    check('app của người mới có gọi đường nối lại', luotNoi.length === n0 + 1, luotNoi.slice(n0));
    check('nhưng đăng ký vẫn thuộc người cũ và dòng nối không đổi', chuCua(MAY_NAY) === 'p1' && JSON.stringify(noi(MAY_NAY)) === truoc, [chuCua(MAY_NAY), noi(MAY_NAY)]);
    check('người mới không có đăng ký nào', doc('SELECT COUNT(*) AS n FROM push_dang_ky WHERE userId = ?', 'p2')[0].n === 0);
    check('và vẫn vào trang chủ bình thường', await oTrangChu() && (await coBaoLoi()) === 0);
  }

  // =========================================================================
  console.log('\n[6] Không lỗi JS');
  check('không có lỗi JS nào trong suốt bài', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
