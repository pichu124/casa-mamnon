// Kiểm thử giao diện đường GHI của các phân hệ nội dung: giáo viên/quản trị
// thấy nút soạn và lưu được; phụ huynh tuyệt đối không thấy nút soạn.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium } from 'playwright';
import { dungMayChu, thuMucTam, sinhDuLieu, taoBoDem, CHROMIUM, tatBannerThongBao } from './_chung.mjs';

const DIR = thuMucTam('bien-soan-giao-dien');
sinhDuLieu(DIR);
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3950), dir: DIR });

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

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);

await browser.close();
tongKet();
process.exit(0);
