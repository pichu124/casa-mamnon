// Kiểm thử giao diện: bật/tắt tính năng trong trang quản trị có ăn ngay ra màn hình chính không.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, CHROMIUM, tatBannerThongBao } from './_chung.mjs';

const DIR = thuMucTam('tinh-nang-giao-dien');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3900), dir: DIR });

let pass = 0, fail = 0; const failures = [];
const check = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; failures.push(`${n} ${x !== undefined ? JSON.stringify(x).slice(0, 250) : ''}`); console.log('  ✗ ' + n, x ?? ''); }
};

const dnApi = async (u, p) => {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
  return r.headers.get('set-cookie')?.split(';')[0];
};
const ck = await dnApi('htruong', mkTam);
await fetch(BASE + '/api/auth/set-new-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck }, body: JSON.stringify({ newPassword: 'quantri2026' }) });
const SHOT = path.join(thuMucTam('tinh-nang-anh-chup'), '/');
fs.mkdirSync(SHOT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerThongBao(await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loi = [];
page.on('pageerror', e => loi.push(e.message));

async function dangNhap(u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const moTabTinhNang = async () => {
  await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.locator('.admin-tabs button, .tabs button, button', { hasText: 'Tính năng' }).first().click();
  await page.waitForTimeout(900);
};
const nutCua = (ten) => page.locator('.list-row', { hasText: ten }).first().locator('button');

console.log('\n[1] Quản trị: tab Tính năng');
await dangNhap('htruong', 'quantri2026');
await moTabTinhNang();
const soHang = await page.locator('.list-row').count();
check('liệt kê đủ các phân hệ', soHang >= 15, soHang);
const tieuDe = (await page.locator('.card-title').allTextContents()).join(' | ');
check('chia nhóm rõ ràng cho người không rành máy tính', /màn hình chính/i.test(tieuDe) && /cắm thêm/i.test(tieuDe), tieuDe);
check('phân hệ lõi hiện "Luôn bật", không có nút tắt',
  await page.locator('.list-row', { hasText: 'Hồ sơ bé' }).first().locator('text=Luôn bật').count() > 0);
await page.screenshot({ path: SHOT + '01-tab-tinhnang.png', fullPage: true });

console.log('\n[2] Tắt một tính năng → biến mất khỏi màn hình chính');
const truoc = await page.evaluate(() => App.state.modules.length);
check('nút của Thực đơn đang ở trạng thái bật', (await nutCua('Thực đơn').innerText()).includes('Đang bật'));
await nutCua('Thực đơn').click();
await page.waitForTimeout(1500);
const sau = await page.evaluate(() => App.state.modules.length);
check('danh sách phân hệ giảm đi 1 ngay lập tức', sau === truoc - 1, `${truoc} → ${sau}`);
await moTabTinhNang();
check('nút đổi sang "Đang tắt"', (await nutCua('Thực đơn').innerText()).includes('Đang tắt'));
await page.screenshot({ path: SHOT + '02-da-tat.png', fullPage: true });

await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const nhan = await page.locator('.tile-label').allTextContents();
check('biểu tượng Thực đơn biến khỏi màn hình chính', !nhan.includes('Thực đơn'), nhan);
check('các biểu tượng khác vẫn còn nguyên', nhan.includes('Điểm danh') && nhan.includes('Nhận xét'), nhan);
await page.screenshot({ path: SHOT + '03-trangchu-thieu-thucdon.png', fullPage: true });

console.log('\n[3] Vào thẳng đường dẫn đã tắt');
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const noiDung = await page.locator('#view').innerText();
check('báo rõ nhà trường đã tắt thay vì màn hình trắng', /tắt/i.test(noiDung), noiDung.slice(0, 150));
await page.screenshot({ path: SHOT + '04-vao-thang-duong-dan-tat.png', fullPage: true });

console.log('\n[4] Phụ huynh cũng không thấy');
await page.evaluate(() => App.logout());
await page.waitForTimeout(600);
await dangNhap('phuhuynh', '123456');
await page.waitForTimeout(700);
const nhanPH = await page.locator('.tile-label').allTextContents();
check('phụ huynh không thấy Thực đơn', !nhanPH.includes('Thực đơn'), nhanPH);
check('phụ huynh vẫn dùng được các phần khác', nhanPH.length >= 10, nhanPH.length);
check('phụ huynh không có mục Quản trị', !nhanPH.includes('Quản trị'), nhanPH);

console.log('\n[5] Bật thêm tính năng chưa từng có (Học phí) → hiện ngay');
await page.evaluate(() => App.logout());
await page.waitForTimeout(600);
await dangNhap('htruong', 'quantri2026');
await moTabTinhNang();
check('phân hệ cắm thêm xuất hiện trong danh sách', await page.locator('.list-row', { hasText: 'Học phí' }).count() > 0);
check('được đánh dấu là "Cắm thêm"',
  await page.locator('.list-row', { hasText: 'Học phí' }).first().locator('text=Cắm thêm').count() > 0);
await nutCua('Học phí').click();
await page.waitForTimeout(1800);
await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const nhan2 = await page.locator('.tile-label').allTextContents();
check('biểu tượng Học phí hiện trên màn hình chính', nhan2.includes('Học phí'), nhan2);
await page.screenshot({ path: SHOT + '05-them-hocphi.png', fullPage: true });

await page.locator('.tile', { hasText: 'Học phí' }).first().click();
await page.waitForTimeout(1500);
const manHp = await page.locator('#view').innerText();
check('mở được màn hình của phân hệ mới', /học phí/i.test(manHp), manHp.slice(0, 150));
check('không phải màn hình lỗi', !/có lỗi xảy ra/i.test(manHp), manHp.slice(0, 150));
await page.screenshot({ path: SHOT + '06-man-hinh-hocphi.png', fullPage: true });

console.log('\n[6] Bật lại Thực đơn — dữ liệu cũ còn nguyên');
await moTabTinhNang();
await nutCua('Thực đơn').click();
await page.waitForTimeout(1500);
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const manTd = await page.locator('#view').innerText();
check('Thực đơn mở lại được ngay', !/tắt|có lỗi xảy ra/i.test(manTd), manTd.slice(0, 150));
check('thực đơn vẫn có nội dung cũ', manTd.length > 60, manTd.length);
await page.screenshot({ path: SHOT + '07-bat-lai-thucdon.png', fullPage: true });

check('không có lỗi JavaScript trong suốt quá trình', loi.length === 0, loi);

console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (failures.length) console.log(failures.join('\n'));
await browser.close();
process.exit(fail ? 1 : 0);
