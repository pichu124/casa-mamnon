// Kiểm thử giao diện: tab "Tài khoản" trong Quản trị (Đ239d1 — góp ý 16/10, mục 5).
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
//
// Trường hỏi "tạo tài khoản ở đâu, phân quyền ở chỗ nào". Bài này đi đúng con
// đường người của trường đi: Cài đặt → "Tài khoản & phân quyền", rồi canh mỗi
// vai thấy ĐÚNG phần việc của mình — ban giám hiệu thấy ô tạo tài khoản quản
// trị, quản lý cơ sở không thấy ô đó nhưng tạo được cô và chuyển cô giữa các
// nhóm, văn phòng cơ sở thấy phần phụ huynh và bé.
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tai-khoan-giao-dien');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'htruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4889), dir: DIR });
const BASE = sv.BASE;
const req = taoReq(BASE);
const login = taoLogin(req);

async function datMatKhauMoi(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const BGH = await datMatKhauMoi('htruong', mkTam);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
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
async function dangXuat() {
  await page.evaluate(() => App.logout());
  await page.waitForSelector('#lg-user', { timeout: 8000 });
}
// Lối vào mà trường được chỉ: Cài đặt → "Tài khoản & phân quyền".
async function moTabTaiKhoanTuCaiDat() {
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await page.waitForSelector('#st-tai-khoan', { timeout: 8000 });
  await page.click('#st-tai-khoan');
  await page.waitForSelector('#admin-body .card', { timeout: 8000 });
  await page.waitForTimeout(400);
}
const chuTrongTab = () => page.locator('#admin-body').innerText();

try {
  // =========================================================================
  console.log('\n[1] Ban giám hiệu: Cài đặt → "Tài khoản & phân quyền" mở thẳng tab Tài khoản');
  await dangNhap('htruong', 'quantri2026');
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await page.waitForSelector('#st-tai-khoan', { timeout: 8000 });
  check('Cài đặt có dòng "Tài khoản & phân quyền"',
    /Tài khoản & phân quyền/.test(await page.locator('#st-tai-khoan').innerText()));
  check('lối cũ "Nhóm lớp, cô, nhập danh sách" vẫn còn',
    await page.locator('.list-row', { hasText: 'Nhóm lớp, cô, nhập danh sách' }).count() === 1);
  await moTabTaiKhoanTuCaiDat();
  check('địa chỉ mở thẳng tab Tài khoản', await page.evaluate(() => location.hash) === '#/admin/taikhoan',
    await page.evaluate(() => location.hash));
  check('"Tài khoản" đứng đầu dãy tab và đang được chọn',
    (await page.locator('.seg button').first().innerText()).trim() === 'Tài khoản'
      && /active/.test(await page.locator('.seg button').first().getAttribute('class')));
  check('có dòng giải thích ai tạo tài khoản nào', /Ai tạo tài khoản nào/.test(await chuTrongTab()));
  check('ban giám hiệu thấy thẻ Tài khoản quản trị kèm nút tạo',
    await page.locator('#tk-quan-tri button', { hasText: 'Tạo tài khoản quản trị' }).count() === 1);
  check('và thấy cả phần tài khoản cô', await page.locator('#tk-co').count() === 1);

  // =========================================================================
  console.log('\n[2] Tạo một tài khoản Quản lý cơ sở trên màn hình');
  await page.locator('#tk-quan-tri button', { hasText: 'Tạo tài khoản quản trị' }).click();
  await page.waitForSelector('#tk-qt-cv', { timeout: 5000 });
  check('ô chọn chức vụ KHÔNG có "Ban giám hiệu"',
    !(await page.locator('#tk-qt-cv option').allInnerTexts()).some(t => /Ban giám hiệu/.test(t)),
    await page.locator('#tk-qt-cv option').allInnerTexts());
  await page.selectOption('#tk-qt-cv', 'nhansu');
  check('chức vụ cả trường (Nhân sự) thì KHÔNG hỏi cơ sở', !(await page.locator('#tk-qt-o-cs').isVisible()));
  await page.selectOption('#tk-qt-cv', 'quanly-coso');
  check('chức vụ một cơ sở (Quản lý cơ sở) thì hiện ô Cơ sở', await page.locator('#tk-qt-o-cs').isVisible());
  await page.fill('#tk-qt-ten', 'Quản Lý Thử');
  await page.fill('#tk-qt-tdn', 'quanly.thu');
  await page.selectOption('#tk-qt-cs', 'cs1');
  await page.click('#tk-qt-luu');
  await page.waitForSelector('#tk-mat-khau', { timeout: 8000 });
  const mkQL = (await page.locator('#tk-mat-khau').innerText()).trim();
  check('hiện mật khẩu tạm một lần', /^[a-z]{5}[2-9]{3}$/.test(mkQL), mkQL);
  check('kèm nút chép mật khẩu', await page.locator('#tk-chep').count() === 1);
  await page.click('#tk-chep');
  await page.waitForTimeout(400);
  check('bấm chép thì báo rõ đã chép hoặc cách tự chép',
    /chép/i.test(await page.locator('#toast-zone').innerText().catch(() => '')));
  await page.locator('.modal button', { hasText: 'Đã ghi lại' }).click();
  await page.waitForTimeout(900);
  const dongQL = page.locator('#tk-quan-tri .list-row', { hasText: 'quanly.thu' });
  check('tài khoản mới hiện trong danh sách, đúng chức vụ và cơ sở',
    await dongQL.count() === 1 && /Quản lý cơ sở/.test(await dongQL.innerText()) && /Cơ sở 1/.test(await dongQL.innerText()),
    await dongQL.count() ? await dongQL.innerText() : '(không có dòng)');

  // =========================================================================
  console.log('\n[3] Từ địa chỉ #/admin/taikhoan vẫn bấm sang được tab khác');
  await page.locator('.seg button', { hasText: 'Cơ sở' }).click();
  await page.waitForTimeout(900);
  check('bấm "Cơ sở" thì vẽ đúng tab Cơ sở', /Danh sách cơ sở/.test(await chuTrongTab()));
  check('và địa chỉ đổi theo', await page.evaluate(() => location.hash) === '#/admin/coso');
  await dangXuat();

  // =========================================================================
  console.log('\n[4] Quản lý cơ sở: không tạo được quản trị, nhưng tạo cô và chuyển cô được');
  await datMatKhauMoi('quanly.thu', mkQL);
  await dangNhap('quanly.thu', 'quantri2026');
  await moTabTaiKhoanTuCaiDat();
  check('quản lý cơ sở KHÔNG thấy thẻ tạo tài khoản quản trị', await page.locator('#tk-quan-tri').count() === 0);
  check('nhưng thấy nút tạo tài khoản cô',
    await page.locator('#tk-co button', { hasText: 'Tạo tài khoản cô' }).count() === 1);
  check('và nút chuyển nhóm cho cô',
    await page.locator('#tk-co button', { hasText: 'Chuyển nhóm' }).count() > 0);
  check('và phần phụ huynh & bé', await page.locator('#tk-van-phong').count() === 1);

  const dongHong = page.locator('#tk-co .list-row', { hasText: 'Phạm Thị Hồng' });
  check('dòng cô Hồng ghi nhóm đang dạy', /Nhà trẻ 1/.test(await dongHong.innerText()), await dongHong.innerText());
  await dongHong.locator('button', { hasText: 'Chuyển nhóm' }).click();
  await page.waitForSelector('#tk-cn-den', { timeout: 5000 });
  const den = await page.locator('#tk-cn-den option').allInnerTexts();
  check('nhóm đến chỉ có nhóm của cơ sở mình (không có Mầm 1 của Cơ sở 2)',
    den.length > 0 && !den.some(t => /Mầm 1/.test(t)), den);
  await page.selectOption('#tk-cn-den', 'c2');
  await page.click('#tk-cn-luu');
  await page.waitForTimeout(1200);
  const sau = await page.locator('#tk-co .list-row', { hasText: 'Phạm Thị Hồng' }).innerText();
  check('chuyển xong, dòng cô Hồng ghi Lá 1, không còn Nhà trẻ 1',
    /Lá 1/.test(sau) && !/Nhà trẻ 1/.test(sau), sau);
  const coHong = ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || []).find(t => t.id === 't4');
  check('máy chủ cũng nói đúng như màn hình', JSON.stringify(coHong?.classIds) === '["c2"]', coHong?.classIds);
  await dangXuat();

  // =========================================================================
  console.log('\n[5] Văn phòng cơ sở: phần phụ huynh & bé, không có phần tài khoản cô');
  const vp = await req('POST', '/api/admin/managers', {
    cookie: BGH, body: { name: 'Văn Phòng Thử', username: 'vanphong.thu', chucVu: 'vanphong-coso', campusId: 'cs1' },
  });
  await datMatKhauMoi('vanphong.thu', vp.data?.temporaryPassword);
  await dangNhap('vanphong.thu', 'quantri2026');
  await moTabTaiKhoanTuCaiDat();
  check('văn phòng thấy phần phụ huynh & bé', await page.locator('#tk-van-phong').count() === 1);
  check('có lối nhận bé vào nhóm', await page.locator('#tk-van-phong button', { hasText: 'Nhận bé' }).count() > 0);
  check('KHÔNG có thẻ tạo tài khoản quản trị', await page.locator('#tk-quan-tri').count() === 0);
  check('KHÔNG có phần tài khoản cô', await page.locator('#tk-co').count() === 0);

  check('không có lỗi chạy mã nào trên trang', loi.length === 0, loi);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
