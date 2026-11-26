// Đặt mật khẩu riêng xong thì app NẠP LẠI dữ liệu của tài khoản (Đ261j, O5).
//
// Chạy bằng:  TEST_PORT=7453 node test/mat-khau-tam-nap-lai-giao-dien.test.mjs
//
// Khi còn mật khẩu tạm, gói đăng nhập và /api/auth/me cố ý không có bé, nhóm,
// tab Quản trị (test/mat-khau-tam-goi-toi-thieu.test.mjs). Nên màn đặt mật
// khẩu phải gọi lại /api/auth/me rồi mới vào trang chủ — không thì gia đình
// vào một trang chủ không có con mình, quản trị vào Quản trị không có tab.
//
//   [1] Gia đình mật khẩu tạm → đặt mật khẩu → trang chủ đúng tên bé.
//   [2] Tải lại trang khi còn mật khẩu tạm vẫn ra màn đặt mật khẩu.
//   [3] Quản trị mới (create-admin) → đặt mật khẩu → Quản trị dùng được.
//   [4] Không lỗi JS nào, không lời báo lỗi.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoReq, taoLogin, taoBoDem,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('mat-khau-tam-nap-lai');
sinhDuLieu(DIR);
const mkVP = taoQuanTri(DIR, 'Văn Phòng Trường', 'qt_nap_lai_vp');
daDoiMatKhau(DIR, 'qt_nap_lai_vp');
const MK_MOI = taoQuanTri(DIR, 'Hiệu Trưởng Mới', 'qt_nap_lai_moi');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7453), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const vp = await login('qt_nap_lai_vp', mkVP);
const MK_TAM = (await req('POST', '/api/accounts/p1/reset-password', { cookie: vp.cookie })).data?.temporaryPassword;
check('đối chứng — văn phòng cấp được mật khẩu tạm', !!MK_TAM);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const coBaoLoi = () => page.locator('.toast.error').allInnerTexts();

async function dangNhap(u, p) {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('#sp-form', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
}
async function datMatKhau(mk) {
  await page.fill('#sp-new', mk);
  await page.fill('#sp-confirm', mk);
  await page.click('#sp-submit');
  await page.waitForSelector('.tile-grid', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
}

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });

  // =========================================================================
  console.log('\n[1] Gia đình: mật khẩu tạm → đặt mật khẩu → trang chủ đúng tên bé');
  {
    await dangNhap('phuhuynh', MK_TAM);
    check('hiện màn "Đặt mật khẩu mới"', await page.locator('#sp-form').isVisible());
    check('trình duyệt chưa giữ bé nào khi còn mật khẩu tạm',
      await page.evaluate(() => App.state.students.length) === 0);

    // [2] Tải lại giữa chừng: vẫn là màn đặt mật khẩu, không trắng màn hình.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#sp-form', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    check('[2] tải lại khi còn mật khẩu tạm: vẫn màn đặt mật khẩu', await page.locator('#sp-form').isVisible());

    await datMatKhau('giadinh2026');
    check('vào trang chủ', await page.locator('.tile-grid').isVisible());
    await page.waitForTimeout(500);
    const than = await page.locator('#view').innerText();
    check('trang chủ có tên bé Nguyễn Bảo An', /Bảo An/.test(than), than.slice(0, 300));
    check('trình duyệt đã nạp đủ hai bé', await page.evaluate(() => App.state.students.map(s => s.name).sort().join('|'))
      === 'Nguyễn Bảo An|Nguyễn Bảo Nam');
    check('bé đang chọn là một bé của nhà', ['s1', 's2'].includes(await page.evaluate(() => App.state.currentStudentId)));
    check('không lời báo lỗi nào', (await coBaoLoi()).length === 0, await coBaoLoi());
  }

  // =========================================================================
  console.log('\n[3] Quản trị mới: đặt mật khẩu → Quản trị dùng được');
  {
    await page.evaluate(() => API.post('/api/auth/logout'));
    await ctx.clearCookies();
    await page.goto(sv.BASE + '/#/', { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await dangNhap('qt_nap_lai_moi', MK_MOI);
    check('quản trị mới thấy màn "Đặt mật khẩu mới"', await page.locator('#sp-form').isVisible());
    await datMatKhau('quantri2026');
    check('vào trang chủ', await page.locator('.tile-grid').isVisible());
    check('trình duyệt đã nạp tab Quản trị',
      await page.evaluate(() => Array.isArray(App.state.user.tabQuanTri) && App.state.user.tabQuanTri.length > 0));
    await page.evaluate(() => { location.hash = '#/admin'; });
    await page.waitForSelector('#ad-tabs', { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    await page.waitForFunction(() => !/Đang tải/.test((document.getElementById('admin-body') || {}).textContent || 'Đang tải'),
      null, { timeout: 10000 }).catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    const soTab = await page.locator('#ad-tabs button, #ad-tabs [data-tab]').count();
    check('Quản trị có dải tab, nhiều hơn một tab', await page.locator('#ad-tabs').isVisible() && soTab > 1, soTab);
    const than = await page.locator('#admin-body').innerText().catch(() => '');
    check('nội dung Quản trị nạp xong, không câu báo lỗi', than.trim().length > 0 && !/mật khẩu tạm|Có lỗi|😥/.test(than),
      than.slice(0, 200));
    check('không lời báo lỗi nào', (await coBaoLoi()).length === 0, await coBaoLoi());
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
