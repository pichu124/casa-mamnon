// Kiểm thử giao diện đường GHI của các phân hệ nội dung: giáo viên/quản trị
// thấy nút soạn và lưu được; phụ huynh tuyệt đối không thấy nút soạn.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium } from 'playwright';
import { dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, CHROMIUM, tatBannerThongBao } from './_chung.mjs';

const DIR = thuMucTam('bien-soan-giao-dien');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3950), dir: DIR });

// Đổi mật khẩu tạm của quản trị qua API để đăng nhập được trên trình duyệt.
{
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hieutruong', password: mkTam }),
  });
  const ck = r.headers.get('set-cookie').split(';')[0];
  await fetch(BASE + '/api/auth/set-new-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ newPassword: 'quantri2026' }),
  });
}

const { check, tongKet } = taoBoDem();

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerThongBao(await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

async function dangNhap(u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const dangXuat = async () => { await page.evaluate(() => App.logout()); await page.waitForTimeout(600); };

// ============================================================
// 1. THỜI KHÓA BIỂU
// ============================================================
console.log('\n[1] TKB — giáo viên chủ nhiệm sửa ngay trên màn hình');
await dangNhap('giaovien', '123456');
await page.goto(BASE + '/#/timetable', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('giáo viên thấy nút Chỉnh sửa', await page.locator('#btn-sua-tkb').count() === 1);

await page.click('#btn-sua-tkb');
await page.waitForTimeout(700);
check('mở được màn hình sửa', await page.locator('#tkb-mon-0').count() === 1);

await page.fill('#tkb-mon-0', 'Đọc sách đầu tuần');
await page.locator('button', { hasText: 'Lưu thời khóa biểu' }).click();
await page.waitForTimeout(1200);
const sauLuu = await page.locator('#view').innerText();
check('lưu xong quay về màn hình xem, thấy môn vừa sửa', /Đọc sách đầu tuần/.test(sauLuu), sauLuu.slice(0, 200));

// Sửa rồi bấm Hủy thì không được lưu gì cả.
await page.click('#btn-sua-tkb');
await page.waitForTimeout(700);
await page.fill('#tkb-mon-0', 'Môn không được lưu');
await page.locator('button', { hasText: 'Hủy' }).click();
await page.waitForTimeout(900);
const sauHuy = await page.locator('#view').innerText();
check('bấm Hủy thì bản nháp bị bỏ', !/Môn không được lưu/.test(sauHuy) && /Đọc sách đầu tuần/.test(sauHuy), sauHuy.slice(0, 200));

console.log('\n[2] TKB — phụ huynh chỉ xem, không có nút soạn');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/timetable', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
// Nhà có 2 con hai lớp — chọn đúng bé học lớp 3A (lớp cô vừa sửa TKB).
await page.locator('.student-chip', { hasText: 'Nguyễn Minh Khang' }).click();
await page.waitForTimeout(900);
const manPH = await page.locator('#view').innerText();
check('phụ huynh vẫn xem được TKB (có môn GV vừa sửa)', /Đọc sách đầu tuần/.test(manPH), manPH.slice(0, 200));
check('phụ huynh KHÔNG thấy nút Chỉnh sửa', await page.locator('#btn-sua-tkb').count() === 0);
check('màn hình phụ huynh không có ô nhập nào', await page.locator('#view input').count() === 0);

// ============================================================
// 2. THỰC ĐƠN
// ============================================================
console.log('\n[3] Thực đơn — quản trị soạn ngay trên màn hình');
await dangXuat();
await dangNhap('hieutruong', 'quantri2026');
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('quản trị thấy nút Chép tuần trước', await page.locator('#btn-chep-tuan').count() === 1);
const soNutSua = await page.locator('#view .card .head-action').count();
check('mỗi ngày trong tuần có nút Sửa/Soạn', soNutSua === 5, soNutSua);

await page.locator('#view .card .head-action').first().click();
await page.waitForTimeout(800);
check('mở được màn soạn thực đơn', await page.locator('#td-items-0').count() === 1);
await page.fill('#td-items-0', 'Phở bò kiểm thử\nSữa chua');
await page.locator('button', { hasText: 'Lưu thực đơn' }).click();
await page.waitForTimeout(1200);
const sauLuuTd = await page.locator('#view').innerText();
check('lưu xong thấy món vừa soạn trên thẻ ngày', /Phở bò kiểm thử/.test(sauLuuTd), sauLuuTd.slice(0, 250));

console.log('\n[4] Thực đơn — phụ huynh chỉ xem');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const manTdPH = await page.locator('#view').innerText();
check('phụ huynh thấy món quản trị vừa soạn', /Phở bò kiểm thử/.test(manTdPH), manTdPH.slice(0, 250));
check('phụ huynh KHÔNG có nút soạn/sửa/chép nào', await page.locator('#view .head-action').count() === 0);

// ============================================================
// 3. KẾ HOẠCH GIÁO DỤC
// ============================================================
console.log('\n[5] Kế hoạch — GVCN soạn ngay trên màn hình');
await dangXuat();
await dangNhap('giaovien', '123456');
await page.goto(BASE + '/#/plans', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('giáo viên thấy nút Soạn kế hoạch', await page.locator('#btn-soan-kh').count() === 1);

await page.click('#btn-soan-kh');
await page.waitForTimeout(700);
check('mở được màn soạn với đủ chủ đề, mục tiêu, 4 tuần', await page.locator('#kh-chude').count() === 1
  && await page.locator('#kh-tt-3').count() === 1);
await page.fill('#kh-chude', 'Tháng của kiểm thử');
await page.fill('#kh-muctieu', 'Mục tiêu trình duyệt 1\nMục tiêu trình duyệt 2');
await page.locator('button', { hasText: 'Lưu kế hoạch' }).click();
await page.waitForTimeout(1200);
const sauLuuKh = await page.locator('#view').innerText();
check('lưu xong màn hình hiện chủ đề vừa soạn', /Tháng của kiểm thử/.test(sauLuuKh)
  && /Mục tiêu trình duyệt 1/.test(sauLuuKh), sauLuuKh.slice(0, 250));

console.log('\n[6] Kế hoạch — phụ huynh chỉ xem');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/plans', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('.student-chip', { hasText: 'Nguyễn Minh Khang' }).click();
await page.waitForTimeout(900);
const manKhPH = await page.locator('#view').innerText();
check('phụ huynh thấy kế hoạch cô vừa soạn', /Tháng của kiểm thử/.test(manKhPH), manKhPH.slice(0, 250));
check('phụ huynh KHÔNG thấy nút Soạn kế hoạch', await page.locator('#btn-soan-kh').count() === 0);

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);

await browser.close();
tongKet();
process.exit(0);
