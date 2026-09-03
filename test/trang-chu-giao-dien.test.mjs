// Bài canh TRANG CHỦ THEO VAI (Đ124) — trên trình duyệt thật.
//
// Chạy bằng:  npm run test:trang-chu-giao-dien   (cần Playwright)
//
// Ba điều phải thấy bằng mắt máy:
//   • Cô: bảng "Hôm nay ở nhóm" với đủ bé của nhóm, bấm bé ra hồ sơ, bấm "Xem
//     cả nhóm" ra màn nhóm.
//   • Văn phòng: cây cơ sở → nhóm thay cho ô chọn bé phẳng; bấm nhóm → màn
//     nhóm; bấm bé → Hồ sơ của bé với ô chọn theo cấp (optgroup Cơ sở › Nhóm).
//   • Gia đình: KHÔNG đổi — không có bảng hôm nay, lưới biểu tượng nguyên vẹn.
// Kèm: thông báo nói rõ gửi cho ai; không lỗi JavaScript nào trên bất kỳ màn.
//
// Ảnh chụp từng màn để người đọc nhìn được, không chỉ tin con số.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, batPhanHe, CHROMIUM, tatBannerMoiCai, MAU,
} from './_chung.mjs';

const DIR = thuMucTam('trang-chu-giao-dien');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['nhatky', 'dontra', 'thuchup']);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 4170), dir: DIR });

let pass = 0, fail = 0; const failures = [];
const check = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; failures.push(`${n} ${x !== undefined ? JSON.stringify(x).slice(0, 250) : ''}`); console.log('  ✗ ' + n, x ?? ''); }
};
const goiApi = async (duong, body, cookie) => {
  const r = await fetch(BASE + duong, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;

// Tài khoản quản trị: đổi mật khẩu tạm qua API cho nhanh.
const ckQT = await dnApi('htruong', mkTam);
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, ckQT);

// Hai thông báo mẫu để soi nhãn phạm vi.
const ckGv = await dnApi('giaovien', '123456');
await goiApi('/api/notifications', { title: 'Mai nhóm mình chơi với nước', body: 'Gửi thêm quần áo', category: 'Nhóm lớp', audience: 'class' }, ckGv);
const ckQT2 = await dnApi('htruong', 'quantri2026');
await goiApi('/api/notifications', { title: 'Nghỉ lễ Quốc khánh', body: 'Toàn trường nghỉ', category: 'Nhà trường', audience: 'all' }, ckQT2);

const SHOT = path.join(thuMucTam('trang-chu-anh-chup'), '/');
fs.mkdirSync(SHOT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loi = [];
async function moTrang(viewport) {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: viewport.width < 700, hasTouch: viewport.width < 700,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loi.push(e.message));
  return page;
}
async function dangNhap(page, u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const chu = (page) => page.evaluate(() => document.getElementById('view').innerText);
const vaiTrenBody = (page) => page.evaluate(() => document.body.dataset.vai || '');

// ===========================================================================
console.log('\n[1] Cô: bảng "Hôm nay ở nhóm" trên điện thoại');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'giaovien', '123456');
  check('body mang dấu vai = teacher', (await vaiTrenBody(page)) === 'teacher');
  await page.waitForSelector('#hn-panel', { timeout: 8000 });
  const t = await chu(page);
  check('có bảng "Hôm nay ở nhóm"', t.includes('Hôm nay ở nhóm'), t.slice(0, 200));
  const soChip = await page.locator('#hn-panel .be-chip').count();
  check(`đủ ${MAU.soBeNhomChoi2} bé của nhóm Chồi 2 thành chip`, soChip === MAU.soBeNhomChoi2, soChip);
  check('có dãy số đếm với tổng bé', t.includes(`bé ${MAU.soBeNhomChoi2}`), t.slice(0, 400));
  check('có nút việc Điểm danh, Nhật ký ngày, Đón trả bé, Ghi nhanh',
    ['Điểm danh', 'Nhật ký ngày', 'Đón trả bé', 'Ghi nhanh'].every(x => t.includes(x)), t.slice(0, 500));
  check('có dòng "Đã ghi nhật ký" (phân hệ đang bật)', t.includes('Đã ghi nhật ký'), t.slice(0, 500));
  check('lưới biểu tượng vẫn còn bên dưới', (await page.locator('.tile-label').count()) >= 8);
  await page.screenshot({ path: SHOT + 'co-trang-chu.png', fullPage: true });

  // Bấm một bé → hộp thoại hồ sơ.
  await page.locator('#hn-panel .be-chip').first().click();
  await page.waitForSelector('.modal', { timeout: 6000 });
  const modal = await page.evaluate(() => document.querySelector('.modal').innerText);
  check('bấm bé mở hồ sơ của bé', modal.includes('Hồ sơ của bé'), modal.slice(0, 120));
  await page.evaluate(() => UI.closeModal());

  // "Xem cả nhóm" → màn nhóm với danh sách.
  await page.locator('#hn-panel .hn-link').click();
  await page.waitForSelector('.list-row', { timeout: 6000 });
  const t2 = await chu(page);
  check('tới màn nhóm #/dashboard/nhom/c1', (await location(page)) === '#/dashboard/nhom/c1', await location(page));
  check('màn nhóm có tiêu đề nhóm', t2.includes('Nhóm Chồi 2'), t2.slice(0, 120));
  check(`màn nhóm liệt kê ${MAU.soBeNhomChoi2} bé`, (await page.locator('#view .card .list-row').count()) === MAU.soBeNhomChoi2);
  await page.screenshot({ path: SHOT + 'co-man-nhom.png', fullPage: true });
  await page.context().close();
}
function location(page) { return page.evaluate(() => window.location.hash); }

// ===========================================================================
console.log('\n[2] Văn phòng: cây cơ sở → nhóm → bé');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'htruong', 'quantri2026');
  check('body mang dấu vai = admin', (await vaiTrenBody(page)) === 'admin');
  await page.waitForSelector('#tq-panel', { timeout: 8000 });
  const t = await chu(page);
  check('có "Hôm nay theo cơ sở"', t.includes('Hôm nay theo cơ sở'), t.slice(0, 200));
  check('liệt kê cơ sở 1 và cơ sở 2', t.includes('Cơ sở 1') && t.includes('Cơ sở 2'));
  check('liệt kê nhóm Chồi 2 và nhóm Mầm 1 (trống)', t.includes('Chồi 2') && t.includes('Mầm 1'));
  check('TRANG CHỦ KHÔNG còn ô chọn bé phẳng của cả trường', !t.includes('Đang xem hồ sơ của bé'));
  check('tổng bé và tổng nhóm ghi trên đầu', t.includes(`${MAU.soBe} bé`) && t.includes(`${MAU.soNhom} nhóm`), t.slice(0, 300));
  await page.screenshot({ path: SHOT + 'vanphong-trang-chu.png', fullPage: true });

  // Bấm nhóm Chồi 2 → màn nhóm.
  await page.locator('.tq-nhom', { hasText: 'Chồi 2' }).first().click();
  await page.waitForSelector('#view .card .list-row', { timeout: 6000 });
  check('tới màn nhóm', (await location(page)) === '#/dashboard/nhom/c1', await location(page));
  const t2 = await chu(page);
  check('màn nhóm ghi rõ nhóm · cơ sở', t2.includes('Chồi 2 · Cơ sở 1'), t2.slice(0, 200));
  check(`liệt kê ${MAU.soBeNhomChoi2} bé`, (await page.locator('#view .card .list-row').count()) === MAU.soBeNhomChoi2);

  // Bấm một bé → Hồ sơ của bé với ô chọn theo cấp.
  await page.locator('#view .card .list-row').first().click();
  await page.waitForSelector('#view select optgroup', { state: 'attached', timeout: 6000 });
  check('tới màn Hồ sơ của bé', (await location(page)) === '#/student', await location(page));
  const t3 = await chu(page);
  check('màn hồ sơ có ô chọn bé', t3.includes('Đang xem hồ sơ của bé'), t3.slice(0, 200));
  const nhanNhom = await page.$$eval('#view select optgroup', ds => ds.map(o => o.label));
  check('ô chọn gom theo cấp: "Cơ sở › Nhóm"', nhanNhom.some(l => l.includes('Cơ sở 1 › Chồi 2')), nhanNhom);
  const soBe = await page.locator('#view select option').count();
  check(`và vẫn liệt kê mọi bé của trường (${MAU.soBe})`, soBe === MAU.soBe, soBe);
  await page.screenshot({ path: SHOT + 'vanphong-ho-so-be.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[3] Văn phòng trên máy tính: cây cơ sở xếp thành cột');
{
  const page = await moTrang({ width: 1280, height: 860 });
  await dangNhap(page, 'htruong', 'quantri2026');
  await page.waitForSelector('#tq-panel', { timeout: 8000 });
  const rong = await page.evaluate(() => document.querySelector('#view').getBoundingClientRect().width);
  check('khung nội dung của văn phòng rộng hơn khung gia đình (>= 1000px)', rong >= 1000, rong);
  const cot = await page.evaluate(() => getComputedStyle(document.querySelector('.tq-luoi')).gridTemplateColumns.split(' ').length);
  check('các cơ sở xếp thành nhiều cột', cot >= 2, cot);
  await page.screenshot({ path: SHOT + 'vanphong-may-tinh.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[4] Gia đình: không đổi');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'phuhuynh', '123456');
  check('body mang dấu vai = parent', (await vaiTrenBody(page)) === 'parent');
  await page.waitForTimeout(600);
  check('KHÔNG có bảng hôm nay', (await page.locator('#hom-nay').count()) === 0);
  const t = await chu(page);
  check('không có chữ nào của bảng cô / văn phòng', !t.includes('Hôm nay ở nhóm') && !t.includes('Hôm nay theo cơ sở'));
  check('lưới biểu tượng đủ như trước', (await page.locator('.tile-label').count()) >= 10);

  // Thông báo nói rõ gửi cho ai.
  await page.goto(BASE + '/#/notifications', { waitUntil: 'networkidle' });
  await page.waitForSelector('.list-row', { timeout: 6000 });
  const tb = await chu(page);
  check('dòng thông báo nhóm ghi "Nhóm Chồi 2 · Cơ sở 1"', tb.includes('Nhóm Chồi 2 · Cơ sở 1'), tb.slice(0, 300));
  check('dòng thông báo toàn trường ghi "Toàn trường"', tb.includes('Toàn trường'), tb.slice(0, 300));
  await page.locator('.list-row', { hasText: 'Mai nhóm mình chơi với nước' }).first().click();
  await page.waitForSelector('.modal', { timeout: 6000 });
  const modal = await page.evaluate(() => document.querySelector('.modal').innerText);
  check('chi tiết có huy hiệu "Gửi nhóm Chồi 2 · Cơ sở 1"', modal.includes('Gửi nhóm Chồi 2 · Cơ sở 1'), modal.slice(0, 200));
  await page.screenshot({ path: SHOT + 'thong-bao-pham-vi.png', fullPage: true });
  await page.context().close();
}

check('không có lỗi JavaScript nào trên mọi màn đã mở', loi.length === 0, loi);

await browser.close();
dung();
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
console.log(`Ảnh chụp: ${SHOT}`);
if (failures.length) { console.log('\nLỖI:'); failures.forEach(f => console.log(' ✗', f)); process.exit(1); }
