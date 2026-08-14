// Kiểm thử PWA + giao diện trên khổ điện thoại thật (iPhone 14 / Pixel 7).
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { dungMayChu, thuMucTam, sinhDuLieu, CHROMIUM, tatBannerThongBao } from './_chung.mjs';

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
  const ctx = await tatBannerThongBao(await browser.newContext());
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
  const ctx = await tatBannerThongBao(await browser.newContext());
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

  // Chạy khi mất mạng
  await p.context().setOffline(true);
  const offl = await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => null);
  check('mở được app khi mất mạng', !!offl && offl.status() < 400);
  const hasShell = await p.locator('#app').count();
  check('vỏ giao diện hiển thị khi offline', hasShell > 0);
  await p.context().setOffline(false);
  await ctx.close();
}

// ---------- 3. Giao diện trên điện thoại thật ----------
for (const [label, dev] of [['iphone', devices['iPhone 14']], ['android', devices['Pixel 7']]]) {
  console.log(`\n[3] Giao diện ${label} (${dev.viewport.width}x${dev.viewport.height})`);
  const ctx = await tatBannerThongBao(await browser.newContext({ ...dev }));
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
  const ctx = await tatBannerThongBao(await browser.newContext({ ...devices['iPhone 14'] }));
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

await browser.close();
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
