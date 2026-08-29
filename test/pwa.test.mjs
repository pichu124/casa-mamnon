// Kiểm thử PWA + giao diện trên khổ điện thoại thật (iPhone 14 / Pixel 7).
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { dungMayChu, thuMucTam, sinhDuLieu, CHROMIUM, tatBannerMoiCai } from './_chung.mjs';

const DIR = thuMucTam('pwa');
sinhDuLieu(DIR);
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3800), dir: DIR });

const SHOT = path.join(thuMucTam('pwa-anh-chup'), '/');
fs.mkdirSync(SHOT, { recursive: true });

let pass = 0, fail = 0;
const errs = [];
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; errs.push(`${name} ${extra != null ? JSON.stringify(extra).slice(0, 200) : ''}`); console.log('  ✗', name, extra ?? ''); }
};

const browser = await chromium.launch({ executablePath: CHROMIUM });

// ---------- 1. Manifest và icon ----------
console.log('\n[1] Manifest & icon');
{
  const ctx = await tatBannerMoiCai(await browser.newContext());
  const p = await ctx.newPage();
  const mres = await p.goto(BASE + '/manifest.json');
  check('manifest.json trả 200', mres.status() === 200);
  const m = await mres.json();
  check('có name + short_name', !!m.name && !!m.short_name);
  check('display standalone', m.display === 'standalone');
  check('start_url + scope', m.start_url === '/' && m.scope === '/');
  check('theme_color khớp thiết kế mới', m.theme_color === '#4f46e5', m.theme_color);
  const png192 = m.icons.find(i => i.sizes === '192x192' && i.type === 'image/png');
  const png512 = m.icons.find(i => i.sizes === '512x512' && i.type === 'image/png');
  const maskable = m.icons.filter(i => i.purpose === 'maskable');
  check('có icon PNG 192 (Chrome bắt buộc)', !!png192);
  check('có icon PNG 512 (Chrome bắt buộc)', !!png512);
  check('có icon maskable', maskable.length >= 1);
  for (const ic of m.icons) {
    const r = await p.goto(BASE + ic.src);
    check(`tải được ${ic.src}`, r.status() === 200 && (r.headers()['content-type'] || '').includes('png'));
  }
  const apple = await p.goto(BASE + '/icons/apple-touch-icon.png');
  check('apple-touch-icon.png tải được', apple.status() === 200);
  await ctx.close();
}

// ---------- 2. Service worker ----------
console.log('\n[2] Service worker');
{
  const ctx = await tatBannerMoiCai(await browser.newContext());
  const p = await ctx.newPage();
  const swres = await p.goto(BASE + '/sw.js');
  check('sw.js trả 200', swres.status() === 200);
  check('sw.js là JavaScript', (swres.headers()['content-type'] || '').includes('javascript'), swres.headers()['content-type']);

  await p.goto(BASE);
  await p.waitForTimeout(2500);
  const swState = await p.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'không hỗ trợ';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'chưa đăng ký';
    return reg.active ? 'active' : (reg.installing ? 'installing' : 'waiting');
  });
  check('service worker đã đăng ký và kích hoạt', swState === 'active', swState);

  // Vỏ ứng dụng đã được lưu cache chưa
  const cached = await p.evaluate(async () => {
    const names = await caches.keys();
    if (!names.length) return { names, count: 0 };
    const c = await caches.open(names[0]);
    const keys = await c.keys();
    return { names, count: keys.length, hasCss: keys.some(k => k.url.includes('app.css')) };
  });
  check('đã lưu cache vỏ ứng dụng', cached.count > 10, cached);
  check('cache có app.css', cached.hasCss === true);

  // Dữ liệu riêng tư KHÔNG được cache
  await p.evaluate(() => fetch('/api/auth/me').catch(() => {}));
  await p.waitForTimeout(600);
  const apiCached = await p.evaluate(async () => {
    const names = await caches.keys();
    for (const n of names) {
      const c = await caches.open(n);
      const keys = await c.keys();
      if (keys.some(k => new URL(k.url).pathname.startsWith('/api/'))) return true;
    }
    return false;
  });
  check('KHÔNG lưu cache dữ liệu /api (bảo mật)', apiCached === false);

  // --- CHẠY KHI MẤT MẠNG -----------------------------------------------
  //
  // BẢN CŨ CỦA HAI PHÉP KIỂM NÀY LUÔN XANH DÙ APP HỎNG HẲN.
  //
  // Nó tắt mạng rồi chỉ hỏi hai điều: trang trả mã dưới 400, và trong DOM có
  // phần tử `#app`. Cả hai luôn đúng — `#app` là một thẻ TĨNH viết cứng trong
  // `public/index.html`, nên chỉ cần vỏ index.html nằm trong cache là nó có,
  // kể cả khi service worker không lưu được một tệp JS nào và người dùng nhìn
  // vào một trang trắng.
  //
  // Nay hỏi thứ chỉ đúng khi service worker thật sự làm việc:
  //
  //   1. Mã JS của vỏ ứng dụng CHẠY ĐƯỢC — `window.UI` và `window.App` tồn
  //      tại. Nếu `/js/ui.js` không nằm trong cache thì thẻ <script> hỏng và
  //      hai biến này không có, trong khi `#app` vẫn có.
  //   2. MỌI tệp cần để dựng màn hình đầu tiên đều đã nằm trong cache. Đây là
  //      thứ quyết định lần mở app lúc mất mạng có ra màn hình hay ra trang
  //      trắng, và nó kiểm được chắc chắn vì đọc thẳng nội dung cache.
  //
  // CHỖ BÀI NÀY KHÔNG KIỂM ĐƯỢC, VÀ VÌ SAO
  //
  // `setOffline` của Playwright KHÔNG chặn fetch do service worker phát ra —
  // đã thử: gọi `/api/auth/me` sau khi tắt mạng vẫn nhận 401 THẬT từ máy chủ,
  // nghĩa là yêu cầu đi lọt ra ngoài. Nên nhánh 503 + `X-CASA-Mat-Mang` của
  // service worker không thể kiểm ở đây; kiểm ở đây là tự lừa mình.
  //
  // Phần đó — cùng với đăng nhập rồi mất mạng, và hàng đợi Ghi nhanh tự gửi
  // khi có sóng lại — nằm ở `test/ngoai-tuyen.test.mjs`, nơi service worker bị
  // chặn hẳn (`serviceWorkers: 'block'`) và mạng bị cắt ở tầng route.
  await p.context().setOffline(true);
  const offl = await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => null);
  check('mở được app khi mất mạng', !!offl && offl.status() < 400);
  const hasShell = await p.locator('#app').count();
  check('vỏ giao diện hiển thị khi offline', hasShell > 0);

  const voChay = await p.evaluate(() => ({
    ui: typeof window.UI, app: typeof window.App, esc: typeof (window.UI || {}).esc,
  }));
  check('MÃ JS CỦA VỎ ỨNG DỤNG CHẠY ĐƯỢC KHI MẤT MẠNG, không chỉ có cái khung rỗng',
    voChay.ui === 'object' && voChay.app === 'object' && voChay.esc === 'function', voChay);

  // Mọi tệp cần để dựng màn hình đầu tiên phải nằm sẵn trong cache. Thiếu một
  // tệp trong danh sách này là lần mở app lúc mất mạng ra trang trắng — mà
  // `#app` thì vẫn có, nên phép kiểm cũ vẫn xanh.
  const CAN_CO = ['/index.html', '/css/app.css', '/js/api.js', '/js/ui.js',
    '/js/app.js', '/js/views/login.js', '/js/views/dashboard.js'];
  const thieu = await p.evaluate(async (ds) => {
    const co = new Set();
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      for (const k of await c.keys()) co.add(new URL(k.url).pathname);
    }
    return ds.filter(x => !co.has(x));
  }, CAN_CO);
  check('MỌI TỆP CẦN ĐỂ DỰNG MÀN HÌNH ĐẦU TIÊN ĐỀU ĐÃ NẰM TRONG CACHE',
    thieu.length === 0, thieu);

  await p.context().setOffline(false);
  await ctx.close();
}

// ---------- 3. Giao diện trên điện thoại thật ----------
for (const [label, dev] of [['iphone', devices['iPhone 14']], ['android', devices['Pixel 7']]]) {
  console.log(`\n[3] Giao diện ${label} (${dev.viewport.width}x${dev.viewport.height})`);
  const ctx = await tatBannerMoiCai(await browser.newContext({ ...dev }));
  const p = await ctx.newPage();
  const jsErrs = [];
  p.on('pageerror', e => jsErrs.push(String(e).slice(0, 160)));

  await p.goto(BASE);
  await p.waitForSelector('#lg-user');

  // iOS phóng to trang nếu ô nhập < 16px
  const inputFs = await p.evaluate(() => {
    const el = document.getElementById('lg-user');
    return parseFloat(getComputedStyle(el).fontSize);
  });
  check(`[${label}] ô nhập >= 16px (iOS không tự phóng to)`, inputFs >= 16, inputFs + 'px');

  await p.fill('#lg-user', 'phuhuynh');
  await p.fill('#lg-pass', '123456');
  await p.click('#login-form button[type=submit]');
  await p.waitForSelector('.tile-grid');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${SHOT}${label}-dashboard.png` });

  // Không được cuộn ngang
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${label}] không cuộn ngang ở trang chủ`, overflow <= 1, overflow);

  // Vùng chạm đủ lớn trên các màn hay dùng
  for (const view of ['attendance', 'menu', 'notifications', 'medicine', 'surveys']) {
    await p.goto(`${BASE}/#/${view}`);
    await p.waitForTimeout(800);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`[${label}] ${view}: không cuộn ngang`, ov <= 1, ov);
  }
  await p.goto(`${BASE}/#/attendance`);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${SHOT}${label}-attendance.png`, fullPage: true });

  const small = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[href], .clickable').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) {
        out.push(`${el.className || el.tagName}:${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out.slice(0, 6);
  });
  check(`[${label}] không còn nút bấm quá nhỏ`, small.length === 0, small);

  // Phòng chat: ô nhập phải nằm trong màn hình
  await p.goto(`${BASE}/#/messages`);
  await p.waitForTimeout(800);
  const row = p.locator('.chat-list-row').first();
  if (await row.count()) {
    await row.click();
    await p.waitForTimeout(900);
    const vis = await p.evaluate(() => {
      const bar = document.querySelector('.chat-input-bar');
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      return { bottom: Math.round(r.bottom), vh: window.innerHeight };
    });
    check(`[${label}] ô nhập tin nhắn nằm trong màn hình`, vis && vis.bottom <= vis.vh + 2, vis);
    await p.screenshot({ path: `${SHOT}${label}-chat.png` });
  }

  check(`[${label}] không có lỗi JavaScript`, jsErrs.length === 0, jsErrs);
  await ctx.close();
}

// ---------- 4. Chế độ đã cài (toàn màn hình, có tai thỏ) ----------
console.log('\n[4] Chế độ đã cài như app');
{
  const ctx = await tatBannerMoiCai(await browser.newContext({ ...devices['iPhone 14'] }));
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.waitForSelector('#lg-user');
  await p.fill('#lg-user', 'giaovien'); await p.fill('#lg-pass', '123456');
  await p.click('#login-form button[type=submit]');
  await p.waitForSelector('.tile-grid');
  const usesSafeArea = await p.evaluate(() => {
    const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join(''); } catch { return ''; } }).join('');
    return {
      hero: css.includes('safe-area-inset-top'),
      bottom: css.includes('safe-area-inset-bottom'),
    };
  });
  check('CSS có chừa vùng tai thỏ phía trên', usesSafeArea.hero === true);
  check('CSS có chừa vùng thanh home phía dưới', usesSafeArea.bottom === true);
  await p.screenshot({ path: `${SHOT}teacher-dashboard.png` });
  await ctx.close();
}

// ---------- 5. Có bản mới thì app phải NÓI, và không được tự tải lại ----------
console.log('\n[5] Có bản mới thì app nói, nhưng KHÔNG tự tải lại');
{
  // Cả bộ máy VERSION lo cho bản mới TỚI ĐƯỢC máy của cô. Nhưng trang đang mở
  // vẫn chạy mã cũ trong bộ nhớ — cô đọc tài liệu thấy có nút mới, mở máy ra
  // không thấy, và không ai hiểu vì sao.
  //
  // Không dựng được một lần đổi service worker thật trong bài này (phải sửa
  // byte của sw.js giữa chừng), nên đo hai thứ đo được và chúng đủ để chặn cả
  // hai kiểu hỏng: app có NGHE sự kiện đó không, và dải nhắc có đúng nết không.
  const ctx = await tatBannerMoiCai(await browser.newContext({ ...devices['iPhone 14'] }));
  const p = await ctx.newPage();
  const jsLoi = [];
  p.on('pageerror', e => jsLoi.push(e.message));
  await p.goto(BASE);
  await p.waitForSelector('#lg-user');
  await p.fill('#lg-user', 'giaovien'); await p.fill('#lg-pass', '123456');
  await p.click('#login-form button[type=submit]');
  await p.waitForSelector('.tile-grid');

  check('app có gắn máy nghe "đổi bản" của service worker',
    await p.evaluate(() => typeof App.ngheBanMoi === 'function' && App._daNgheBanMoi === true));
  check('và có hàm dựng dải nhắc bản mới',
    await p.evaluate(() => typeof App.baoCoBanMoi === 'function'));

  // Chưa đổi bản thì TUYỆT ĐỐI không được nhắc — nhắc sai một lần là lần sau
  // cô bỏ qua mọi lời nhắc.
  check('chưa có bản mới thì KHÔNG có dải nhắc nào',
    await p.locator('#ban-moi-banner').count() === 0);

  // BẮN ĐÚNG SỰ KIỆN THẬT, KHÔNG GỌI TẮT VÀO HÀM DỰNG DẢI NHẮC.
  //
  // Bản đầu của mục này gọi thẳng `App.baoCoBanMoi()`. Phép thử ngược cho thấy
  // nó bỏ lọt đúng kiểu hỏng nặng nhất: đổi máy nghe thành `location.reload()`
  // thì bài vẫn xanh, vì bài không bao giờ đi qua máy nghe. Nay bắn
  // `controllerchange` trên chính `navigator.serviceWorker`, đúng như trình
  // duyệt bắn khi service worker mới nhận quyền.
  await p.evaluate(() => {
    App._daCoNguoiDieuKhien = true;   // giả cảnh trang đã có bản cũ điều khiển
    navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  });
  await p.waitForTimeout(500);
  check('DẢI NHẮC HIỆN LÊN', await p.locator('#ban-moi-banner').count() === 1);
  const chu = await p.locator('#ban-moi-banner').innerText();
  check('nói bằng tiếng Việt dễ hiểu, không lộ thuật ngữ',
    /bản mới/i.test(chu) && !/service worker|cache|version/i.test(chu), chu);
  check('và nhắc cô lưu phần đang gõ dở trước', /gõ dở|lưu/i.test(chu), chu);

  check('có nút tải lại', await p.locator('#bm-tai-lai').count() === 1);
  check('và có nút để sau', await p.locator('#bm-de-sau').count() === 1);

  // KHÔNG TỰ TẢI LẠI. Cô có thể đang gõ dở nhật ký của hai mươi bé.
  //
  // Đo bằng một dấu vết chỉ sống trong trang: tải lại là nó biến mất. So
  // `location.href` không đủ — tải lại xong địa chỉ vẫn y hệt.
  await p.evaluate(() => { window.__dauVetTruocKhiNhac = 'con-nguyen'; });
  await p.evaluate(() => {
    navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  });
  await p.waitForTimeout(1500);
  check('KHÔNG TỰ TẢI LẠI TRANG — cô có thể đang gõ dở',
    (await p.evaluate(() => window.__dauVetTruocKhiNhac)) === 'con-nguyen'
    && await p.locator('#ban-moi-banner').count() === 1);

  // Và nhắc hai lần cũng chỉ một dải, không chồng lên nhau.
  check('bắn sự kiện lần nữa vẫn chỉ MỘT dải nhắc',
    await p.locator('#ban-moi-banner').count() === 1);

  await p.locator('#bm-de-sau').click();
  await p.waitForTimeout(300);
  check('bấm "để sau" thì dải nhắc biến đi', await p.locator('#ban-moi-banner').count() === 0);

  // Và KHÔNG ghi nhớ vào máy: lần mở sau cô vẫn đang ở bản cũ nên vẫn đáng nhắc.
  check('"để sau" KHÔNG ghi nhớ vào máy',
    await p.evaluate(() => !Object.keys(localStorage).some(k => /ban-moi/i.test(k))),
    await p.evaluate(() => Object.keys(localStorage)));

  check('không có lỗi JavaScript trong suốt mục này', jsLoi.length === 0, jsLoi);
  await ctx.close();
}

await browser.close();
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
