// Gia đình được trường cấp lại mật khẩu, đăng nhập bằng mật khẩu tạm trên máy
// ĐÃ bật thông báo: đặt mật khẩu riêng xong thì vào trang chủ và máy vẫn nhận
// thông báo đẩy, không phải vào Cài đặt bấm "Bật trên máy này" lần nữa
// (Đ261h, lỗi O5).
//
// Chạy bằng:  TEST_PORT=7395 node test/mat-khau-tam-giao-dien.test.mjs
//
// Từ Đ261b máy chủ chặn mọi API (trừ /api/auth/* và GET /api/modules) khi tài
// khoản còn mật khẩu tạm — kể cả đường nối đăng ký đẩy với phiên mới
// (`/api/push/dong-bo`) mà app gọi ngay lúc đăng nhập. Cấp lại mật khẩu thì
// mọi phiên cũ của gia đình bị huỷ, nên nếu app không nối lại SAU khi đặt
// mật khẩu, máy chỉ nhận được tin nhắc "đăng nhập lại" thay cho tin về bé, cho
// tới lần mở app kế tiếp.
//
//   [1] Đăng nhập bằng mật khẩu tạm: hiện màn đặt mật khẩu, không lời báo lỗi.
//   [2] Đặt mật khẩu xong: vào trang chủ, đăng ký đẩy của máy nối với phiên đang dùng.
//   [3] Cài mới: quản trị đầu tiên tạo bằng create-admin đặt mật khẩu rồi dùng được Quản trị.
//   [4] Không lỗi JS nào.
//
// Phần đẩy của trình duyệt được thay bằng bản giả, cùng cách với
// `test/dong-bo-day-giao-dien.test.mjs`.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoReq, taoLogin, taoBoDem,
  CHROMIUM, tatBannerMoiCai, maPhienTrongBang,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('mat-khau-tam-gd');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Văn Phòng Trường', 'qt_cap_lai');
daDoiMatKhau(DIR, 'qt_cap_lai');
const MK_DAU_TIEN = taoQuanTri(DIR, 'Hiệu Trưởng Mới', 'qt_dau_tien');
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7395), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

function doc(sql, ...ts) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
}
const noi = (endpoint) => doc('SELECT phienTaoLuc, daNhac FROM push_dang_ky_phien WHERE endpoint = ?', endpoint)[0] || null;

// Máy này đã bật thông báo từ trước. Rồi gia đình quên mật khẩu, văn phòng cấp
// mật khẩu tạm — mọi phiên cũ bị huỷ.
const MAY_NAY = 'https://day.example.invalid/may-gia-dinh';
const cu = await login('phuhuynh', '123456');
await req('POST', '/api/push/dang-ky', {
  cookie: cu.cookie, body: { subscription: { endpoint: MAY_NAY, keys: { p256dh: 'k', auth: 'k' } } },
});
const qt = await login('qt_cap_lai', mkQT);
const cap = await req('POST', '/api/accounts/p1/reset-password', { cookie: qt.cookie });
const MK_TAM = cap.data?.temporaryPassword;
check('đối chứng — văn phòng cấp được mật khẩu tạm', cap.status === 200 && !!MK_TAM, cap.data);
check('đối chứng — phiên cũ của gia đình đã bị huỷ', (await req('GET', '/api/auth/me', { cookie: cu.cookie })).status === 401);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
await ctx.addInitScript((endpoint) => {
  const taoSub = () => ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'khoa-gia', auth: 'khoa-gia' } }),
    unsubscribe: () => Promise.resolve(true),
  });
  const reg = { pushManager: { getSubscription: () => Promise.resolve(taoSub()), subscribe: () => Promise.resolve(taoSub()) } };
  ServiceWorkerContainer.prototype.getRegistration = () => Promise.resolve(reg);
  Object.defineProperty(ServiceWorkerContainer.prototype, 'ready', { configurable: true, get: () => Promise.resolve(reg) });
  if (!('PushManager' in window)) window.PushManager = function PushManager() {};
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
}, MAY_NAY);
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const luotNoi = [];
page.on('response', (r) => {
  if (new URL(r.url()).pathname === '/api/push/dong-bo') luotNoi.push(r.status());
});
async function choLuotNoi(soLuot, ms = 5000) {
  const han = Date.now() + ms;
  while (luotNoi.filter(s => s === 200).length < soLuot && Date.now() < han) await page.waitForTimeout(50);
}
async function mocPhienCuaTrinhDuyet() {
  const c = (await ctx.cookies()).find(x => x.name === 'session');
  return c ? (doc('SELECT createdAt FROM sessions WHERE token = ?', maPhienTrongBang(c.value))[0] || {}).createdAt || null : null;
}
const coBaoLoi = () => page.locator('.toast.error').count();

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });

  // =========================================================================
  console.log('\n[1] Đăng nhập bằng mật khẩu tạm → màn đặt mật khẩu, không lời báo lỗi');
  {
    await page.waitForSelector('#lg-user', { timeout: 10000 });
    await page.fill('#lg-user', 'phuhuynh');
    await page.fill('#lg-pass', MK_TAM);
    await page.click('button[type=submit]');
    await page.waitForSelector('#sp-form', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('hiện màn "Đặt mật khẩu mới"', await page.locator('#sp-form').isVisible());
    await page.waitForTimeout(800);
    check('không lời báo lỗi nào trên màn đặt mật khẩu', (await coBaoLoi()) === 0,
      await page.locator('.toast.error').allInnerTexts());
    check('chưa có trang chủ', (await page.locator('.tile-grid').count()) === 0);
  }

  // =========================================================================
  console.log('\n[2] Đặt mật khẩu xong → trang chủ, máy vẫn nhận thông báo đẩy');
  {
    await page.fill('#sp-new', 'giadinh2026');
    await page.fill('#sp-confirm', 'giadinh2026');
    await page.click('#sp-submit');
    await page.waitForSelector('.tile-grid', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('vào trang chủ', await page.locator('.tile-grid').isVisible());
    await choLuotNoi(1);
    check('app nối đăng ký đẩy của máy với phiên sau khi đặt mật khẩu (một lượt 200)',
      luotNoi.filter(s => s === 200).length === 1, luotNoi);
    const moc = await mocPhienCuaTrinhDuyet();
    check('máy chủ nối đăng ký của máy này với phiên đang dùng',
      !!moc && JSON.stringify(noi(MAY_NAY)) === JSON.stringify({ phienTaoLuc: moc, daNhac: 0 }), [moc, noi(MAY_NAY)]);
    check('không lời báo lỗi nào', (await coBaoLoi()) === 0, await page.locator('.toast.error').allInnerTexts());
  }

  // =========================================================================
  console.log('\n[3] Cài mới: quản trị đầu tiên (create-admin) đặt mật khẩu rồi dùng được Quản trị');
  {
    await page.evaluate(() => API.post('/api/auth/logout'));
    await ctx.clearCookies();
    await page.goto(sv.BASE + '/#/', { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#lg-user', { timeout: 10000 });
    await page.fill('#lg-user', 'qt_dau_tien');
    await page.fill('#lg-pass', MK_DAU_TIEN);
    await page.click('button[type=submit]');
    await page.waitForSelector('#sp-form', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('quản trị mới thấy màn "Đặt mật khẩu mới"', await page.locator('#sp-form').isVisible());
    await page.fill('#sp-new', 'quantri2026');
    await page.fill('#sp-confirm', 'quantri2026');
    await page.click('#sp-submit');
    await page.waitForSelector('.tile-grid', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    await page.evaluate(() => { location.hash = '#/admin'; });
    await page.waitForSelector('#ad-tabs', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    await page.waitForFunction(() => !/Đang tải/.test((document.getElementById('admin-body') || {}).textContent || 'Đang tải'),
      null, { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    const than = await page.locator('#admin-body').innerText().catch(() => '');
    check('vào được Quản trị nhà trường, có dải tab', await page.locator('#ad-tabs').isVisible());
    check('nội dung Quản trị nạp xong, không câu báo mật khẩu tạm hay lỗi',
      than.trim().length > 0 && !/mật khẩu tạm|Có lỗi|😥/.test(than), than.slice(0, 200));
    check('không lời báo lỗi nào', (await coBaoLoi()) === 0, await page.locator('.toast.error').allInnerTexts());
  }

  // =========================================================================
  console.log('\n[4] Không lỗi JS');
  check('không có lỗi JS nào', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
