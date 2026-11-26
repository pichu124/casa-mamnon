// Bài canh: ĐĂNG NHẬP XONG THÌ TRANG CHỦ VẼ MỘT LẦN, KHÔNG PHẢI HAI (Đ261b, báo cáo tải S).
//
// Chạy bằng:  TEST_PORT=7059 node test/dang-nhap-mot-lan-giao-dien.test.mjs
//
// Kiểm thử tải đo được: đăng nhập trên Chromium, chuỗi tám yêu cầu của trang
// chủ (điểm danh, thực đơn, nhật ký, lịch nghỉ…) chạy HAI lần. Gốc ở
// `public/js/views/login.js`: gán `location.hash = '#/'` — sự kiện
// `hashchange` tự gọi `App.route()` — rồi lại gọi `App.route()` thêm lần nữa.
// Mỗi lượt đăng nhập của mỗi gia đình là gấp đôi tải trang chủ, đúng lúc 7 giờ
// sáng cả trường cùng mở app.
//
// Bài đếm từng yêu cầu GET tới /api từ lúc bấm Đăng nhập tới khi mạng lặng:
// không đường nào được gọi hai lần. Thử cả trường hợp trình duyệt đang đứng ở
// '#/' (gán lại '#/' thì hashchange KHÔNG bắn — hết phiên ngay trên trang chủ)
// lẫn ở chỗ khác (hashchange bắn) — sửa cho trường hợp này mà làm trường hợp
// kia trắng màn hình là sửa hỏng.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dang-nhap-mot-lan-gd');
sinhDuLieu(DIR, { phanHe: true });
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7059), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];

async function dangNhapVaDem(ten, hashLucDau) {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(`${ten}: ${e.message}`));
  await page.goto(`${sv.BASE}/${hashLucDau}`);
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  const dem = new Map();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (r.method() === 'GET' && u.pathname.startsWith('/api/')) {
      const k = u.pathname + u.search;
      dem.set(k, (dem.get(k) || 0) + 1);
    }
  });
  await page.fill('#lg-user', ten);
  await page.fill('#lg-pass', '123456');
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  // Trang chủ vẽ xong hẳn: chờ thêm một nhịp cho lần vẽ thứ hai (nếu có) kịp bắn.
  await page.waitForTimeout(500);
  await page.waitForLoadState('networkidle');
  const hash = await page.evaluate(() => location.hash);
  await ctx.close();
  return { dem, hash };
}

for (const [ten, vai] of [['phuhuynh', 'gia đình'], ['giaovien', 'cô']]) {
  for (const hashLucDau of ['', '#/', '#/settings']) {
    console.log(`\n[${vai}] đăng nhập khi trình duyệt đang ở "${hashLucDau || '(trống)'}"`);
    const { dem, hash } = await dangNhapVaDem(ten, hashLucDau);
    const trangChu = [...dem.keys()].filter(k => !k.startsWith('/api/modules') && !k.startsWith('/api/dashboard/badges'));
    check('trang chủ có gọi máy chủ (bài không chạy trong khoảng không)', trangChu.length >= 3, [...dem.keys()]);
    const lap = [...dem.entries()].filter(([, n]) => n > 1);
    check('không yêu cầu nào của trang chủ chạy hai lần', lap.length === 0, lap);
    check('đứng ở trang chủ sau đăng nhập', hash === '#/', hash);
  }
}

check('không lỗi JS nào', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
