// Bài canh: CÔ PHỤ TRÁCH HAI NHÓM PHẢI MỞ ĐƯỢC CẢ HAI.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:nhieu-nhom
//
// VÌ SAO CÓ BÀI NÀY
//
// G0.4 chuyển tầng dữ liệu từ "một cô một lớp" sang "nhiều cô một nhóm", và
// tầng đó đã đúng: máy chủ cho cô mở bất kỳ nhóm nào cô phụ trách. Nhưng màn
// hình thì chưa theo. `plans.js` và `timetable.js` lấy CỨNG `nhomCuaCo[0]`, nên
// cô dạy hai nhóm không có đường nào mở kế hoạch hay thời khóa biểu của nhóm
// thứ hai — quyền có mà lối vào thì không.
//
// Đây đúng là loại lỗi mà bài kiểm thử API không bao giờ thấy: gọi thẳng
// `/api/plans?classId=c2` thì 200, mọi bài đều xanh. Chỉ khi ngồi trước màn
// hình như cô mới thấy không có nút nào dẫn tới đó.
//
// Nên bài này chạy trên trình duyệt thật và đi bằng chuột, không gọi API.
import { chromium } from 'playwright';
import { dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, CHROMIUM, tatBannerThongBao, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhieu-nhom-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3907), dir: DIR });
const BASE = sv.BASE;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerThongBao(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJS = [];
page.on('pageerror', e => loiJS.push(e.message));

async function dangNhap(u, p) {
  // Phiên đăng nhập nằm ở cookie, không ở localStorage — xóa cookie mới thật sự
  // là đăng xuất. Bản đầu xóa localStorage rồi tưởng đã ra, và bài kẹt ở màn
  // chính của tài khoản trước.
  await ctx.clearCookies();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* chưa có */ } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}

async function mo(duong) {
  await page.goto(BASE + duong, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

// Ô chọn nhóm của màn đang mở, hoặc null nếu không có.
const oChon = () => page.$('#view select');
const chuTrenMan = () => page.innerText('#view');

// ===========================================================================
console.log('\n[1] Cô phụ trách HAI nhóm — Thời khóa biểu');
{
  await dangNhap('giaovien3', '123456');   // cô Bích Ngọc: Chồi 2 và Lá 1
  await mo('/#/timetable');

  const o = await oChon();
  check('có ô chọn nhóm', !!o);
  const cacNhom = o ? await o.$$eval('option', els => els.map(e => e.textContent.trim())) : [];
  check('ô chọn liệt kê đủ CẢ HAI nhóm của cô',
    cacNhom.length === 2 && cacNhom.includes('Chồi 2') && cacNhom.includes('Lá 1'), cacNhom);

  // Chọn Thứ Hai cho chắc chắn, vì mặc định là thứ hôm nay.
  await page.click('#tkb-seg button:first-child');
  await page.waitForTimeout(400);
  const nhom1 = await chuTrenMan();
  check('đang xem nhóm đầu, thấy hoạt động riêng của nhóm đó',
    nhom1.includes('Trường mầm non của bé'), nhom1.slice(0, 300));

  // ĐÂY LÀ PHÉP THỬ CHÍNH: đổi sang nhóm thứ hai bằng đúng thao tác của cô.
  const idNhom2 = await page.$eval('#view select option:nth-child(2)', e => e.value);
  await page.selectOption('#view select', idNhom2);
  await page.waitForTimeout(800);
  await page.click('#tkb-seg button:first-child');
  await page.waitForTimeout(400);
  const nhom2 = await chuTrenMan();
  check('ĐỔI SANG NHÓM THỨ HAI THÌ NỘI DUNG ĐỔI THEO',
    nhom2.includes('Nước và hiện tượng tự nhiên'), nhom2.slice(0, 300));
  check('không còn lẫn nội dung của nhóm thứ nhất',
    !nhom2.includes('Khám phá: Trường mầm non của bé'), nhom2.slice(0, 300));
  check('vẫn còn nút Chỉnh sửa — cô phụ trách nhóm này nên sửa được',
    nhom2.includes('Chỉnh sửa'), nhom2.slice(0, 200));
}

// ===========================================================================
console.log('\n[2] Cô phụ trách HAI nhóm — Kế hoạch giáo dục');
{
  await mo('/#/plans');
  const o = await oChon();
  check('có ô chọn nhóm', !!o);
  const cacNhom = o ? await o.$$eval('option', els => els.map(e => e.textContent.trim())) : [];
  check('ô chọn liệt kê đủ cả hai nhóm', cacNhom.length === 2, cacNhom);

  const truoc = await chuTrenMan();
  check('đang xem kế hoạch của nhóm đầu',
    truoc.includes('Trường mầm non của bé'), truoc.slice(0, 300));

  const idNhom2 = await page.$eval('#view select option:nth-child(2)', e => e.value);
  await page.selectOption('#view select', idNhom2);
  await page.waitForTimeout(800);
  const sau = await chuTrenMan();
  check('ĐỔI SANG NHÓM THỨ HAI THÌ KẾ HOẠCH ĐỔI THEO',
    sau.includes('Bé chuẩn bị vào lớp 1'), sau.slice(0, 300));
  check('vẫn còn nút Soạn kế hoạch cho nhóm thứ hai',
    sau.includes('Soạn kế hoạch'), sau.slice(0, 200));
}

// ===========================================================================
console.log('\n[3] Cô phụ trách MỘT nhóm — màn hình không đổi một chút nào');
{
  // Ô chọn nhóm là thứ thêm vào. Nếu nó hiện với cô chỉ có một nhóm thì đó là
  // một bước thừa mỗi ngày, cho mọi cô, để phục vụ một số ít cô dạy hai nhóm.
  await dangNhap('giaovien2', '123456');   // cô Thu Hà: chỉ Lá 1
  await mo('/#/timetable');
  check('Thời khóa biểu: KHÔNG hiện ô chọn nhóm', !(await oChon()));
  const tkb = await chuTrenMan();
  check('vẫn mở đúng thời khóa biểu của nhóm cô', tkb.includes('Lá 1'), tkb.slice(0, 200));

  await mo('/#/plans');
  check('Kế hoạch: KHÔNG hiện ô chọn nhóm', !(await oChon()));
  const kh = await chuTrenMan();
  check('vẫn mở đúng kế hoạch của nhóm cô',
    kh.includes('Bé chuẩn bị vào lớp 1'), kh.slice(0, 200));
}

// ===========================================================================
console.log('\n[4] Phụ huynh không bị đụng tới');
{
  // Phụ huynh xem theo nhóm của con đang chọn, không phải theo nhóm phụ trách.
  // Thêm ô chọn cho cô mà làm phụ huynh thấy ô đó là rò quyền ra màn hình.
  await dangNhap('phuhuynh', '123456');
  await mo('/#/timetable');
  check('Thời khóa biểu: phụ huynh KHÔNG thấy ô chọn nhóm lớp', !(await oChon()));
  await mo('/#/plans');
  check('Kế hoạch: phụ huynh KHÔNG thấy ô chọn nhóm lớp', !(await oChon()));
}

// ===========================================================================
console.log('\n[5] Không có lỗi JavaScript nào trên đường đi');
{
  check('không màn nào ném lỗi', loiJS.length === 0, loiJS.slice(0, 3));
}

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
