// Kiểm thử GIAO DIỆN album: cô chọn ảnh và đăng album trên trình duyệt thật.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
//
// Phần API — phân quyền và chống tệp giả danh ảnh — nằm ở
// `test/album-api.test.mjs`, và tệp đó chạy trong `npm test` (không cần
// trình duyệt). Tách ra ở đợt Đ34 vì sửa `routes/albums.js` rồi chạy
// `npm test` là mọi chốt chống tệp độc hại đều không được chạy.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { chromium, devices } from 'playwright';
import { GOC, thuMucTam, donThuMucTam, CHROMIUM, tatBannerMoiCai } from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3300);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('album');
const SHOT = path.join(thuMucTam('album-anh-chup'), '/');
fs.mkdirSync(SHOT, { recursive: true });

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0, 200) : ''}`); console.log('  ✗', n, x ?? ''); } };

const server = spawn('node', ['server.js'], {
  cwd: GOC, stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR },
});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 250));
  try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {}
}

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
}
const login = async (u, p) => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  });
  const sc = r.headers.get('set-cookie');
  return sc ? sc.split(';')[0] : null;
};

// Ảnh JPEG thật 2x2 pixel (đủ để máy chủ nhận dạng chữ ký tệp).
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=';
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAP5FBQXqWM+GAAAAAElFTkSuQmCC';
const jpeg = (cap = '') => ({ dataUrl: `data:image/jpeg;base64,${JPEG_B64}`, caption: cap });

console.log('\n[7] Giao diện: chọn ảnh và đăng album trên trình duyệt thật');
{
  const tmpImg = `${SHOT}mau.jpg`;
  fs.writeFileSync(tmpImg, Buffer.from(JPEG_B64, 'base64'));

  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await tatBannerMoiCai(await browser.newContext({ ...devices['Pixel 7'] }));
  const page = await ctx.newPage();
  const jsErr = [];
  page.on('pageerror', e => jsErr.push(String(e).slice(0, 200)));

  await page.goto(BASE);
  await page.waitForSelector('#lg-user');
  await page.fill('#lg-user', 'giaovien');
  await page.fill('#lg-pass', '123456');
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector('.tile-grid');

  await page.goto(`${BASE}/#/albums`);
  await page.waitForTimeout(900);
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  check('có nút chọn ảnh từ máy', await page.locator('#al-pick').count() === 1);

  await page.fill('#al-title', 'Buổi học vẽ tranh');
  await page.fill('#al-desc', 'Các con vẽ tranh chủ đề gia đình');
  await page.setInputFiles('#al-file', [tmpImg, tmpImg]);
  await page.waitForTimeout(1200);
  const previews = await page.locator('#al-preview img').count();
  check('hiện xem trước 2 ảnh đã chọn', previews === 2, previews);

  await page.locator('#al-preview .al-cap').first().fill('Con vẽ rất đẹp');
  await page.screenshot({ path: `${SHOT}chon-anh.png` });

  await page.click('#al-submit');
  await page.waitForTimeout(2500);
  const onDetail = page.url().includes('#/albums/');
  check('đăng xong chuyển sang trang album vừa tạo', onDetail, page.url());
  await page.waitForTimeout(900);

  const imgs = await page.locator('.photo-grid img').count();
  check('trang chi tiết hiển thị 2 ảnh thật', imgs === 2, imgs);
  const loaded = await page.evaluate(() =>
    [...document.querySelectorAll('.photo-grid img')].every(i => i.complete && i.naturalWidth > 0));
  check('ảnh tải về được, không vỡ', loaded === true);
  check('có nút Thêm ảnh trong album', await page.locator('#btn-add-photo').count() === 1);
  await page.screenshot({ path: `${SHOT}chi-tiet-album.png`, fullPage: true });

  // Thêm ảnh từ trang chi tiết
  await page.click('#btn-add-photo');
  await page.waitForSelector('#al-file', { state: 'attached' });
  await page.setInputFiles('#al-file', [tmpImg]);
  await page.waitForTimeout(1000);
  await page.click('#al-submit');
  await page.waitForTimeout(2200);
  const imgs2 = await page.locator('.photo-grid img').count();
  check('thêm ảnh từ trang chi tiết hoạt động (3 ảnh)', imgs2 === 3, imgs2);
  await page.screenshot({ path: `${SHOT}sau-khi-them.png`, fullPage: true });

  // Xóa một ảnh
  page.once('dialog', d => d.accept());
  await page.locator('.photo button[title="Xóa ảnh"]').first().click();
  await page.waitForTimeout(1600);
  const imgs3 = await page.locator('.photo-grid img').count();
  check('xóa ảnh trên giao diện hoạt động (còn 2)', imgs3 === 2, imgs3);

  // Phụ huynh không thấy nút sửa
  const ctx2 = await tatBannerMoiCai(await browser.newContext({ ...devices['Pixel 7'] }));
  const p2 = await ctx2.newPage();
  await p2.goto(BASE);
  await p2.waitForSelector('#lg-user');
  await p2.fill('#lg-user', 'phuhuynh'); await p2.fill('#lg-pass', '123456');
  await p2.click('#login-form button[type=submit]');
  await p2.waitForSelector('.tile-grid');
  await p2.goto(`${BASE}/#/albums`);
  await p2.waitForTimeout(900);
  check('phụ huynh không thấy nút Tạo album', await p2.locator('#btn-new-album').count() === 0);
  await p2.locator('.card.clickable').first().click();
  await p2.waitForTimeout(1200);
  check('phụ huynh không thấy nút Thêm ảnh', await p2.locator('#btn-add-photo').count() === 0);
  check('phụ huynh không thấy nút xóa ảnh', await p2.locator('.photo button[title="Xóa ảnh"]').count() === 0);
  await p2.screenshot({ path: `${SHOT}phu-huynh-xem.png`, fullPage: true });

  check('không có lỗi JavaScript', jsErr.length === 0, jsErr);
  await browser.close();
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 600));
donThuMucTam(DIR);

console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
