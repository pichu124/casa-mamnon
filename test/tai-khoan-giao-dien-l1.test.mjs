// Kiểm thử giao diện: tab Tài khoản dựng lại theo Cơ sở → nhóm lớp (L1, đơn vị 5).
//
// Cần trình duyệt Playwright. Chạy bằng:  node test/tai-khoan-giao-dien-l1.test.mjs
//
// Máy chủ đã có `GET /api/accounts/danh-sach`, mỗi dòng mang cờ `capLai` tính
// bằng đúng luật của đường cấp lại. Bài này canh phía màn hình: nút "Cấp lại
// mật khẩu" chỉ hiện ở dòng máy chủ nói là cấp được, và bấm thì cấp thật.
//
// Đi đúng vai người của trường:
//   - cô không có nút cấp lại ở đâu cả (cô thôi cấp lại cho gia đình — 1c-5);
//   - văn phòng cơ sở thấy nút ở dòng gia đình cơ sở mình, không ở dòng cô hay
//     quản lý cơ sở;
//   - quản lý cơ sở thấy nút ở dòng văn phòng cơ sở mình;
//   - ban giám hiệu đổi chức vụ và cơ sở ngay trên dòng (hai thẻ ở tab Cơ sở
//     dời sang đây);
//   - ô tìm lọc dòng theo tên (gõ không dấu cũng được) và số điện thoại;
//   - không lỗi chạy mã, không cuộn ngang ở màn 390px.
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo, datChucVu,
  taoBoDem, taoReq, taoLogin, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tai-khoan-giao-dien-l1');
sinhDuLieu(DIR);

const MK = {};
function quanTri(hoTen, u, chucVu, coSo) {
  MK[u] = taoQuanTri(DIR, hoTen, u);
  if (chucVu) datChucVu(DIR, u, chucVu);
  if (coSo) khoaVaoCoSo(DIR, u, coSo);
}
quanTri('Hiệu Trưởng', 'bgh');
quanTri('Quản Lý Một', 'ql1', 'quanly-coso', 'cs1');
quanTri('Văn Phòng Một', 'vp1', 'vanphong-coso', 'cs1');
quanTri('Kế Toán Thử', 'kt1', 'ketoan');
quanTri('Văn Phòng Đích', 'd.vp', 'vanphong-coso', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3901), dir: DIR });
const BASE = sv.BASE;
const req = taoReq(BASE);
const login = taoLogin(req);
const MOI = 'quantri2026';
for (const u of ['bgh', 'ql1', 'vp1']) {
  const d = await login(u, MK[u]);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: MOI } });
}
const BGH = (await login('bgh', MOI)).cookie;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loi = [];
page.on('pageerror', e => loi.push(e.message));
page.on('dialog', d => d.accept());

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
async function moTabTaiKhoan() {
  await page.goto(BASE + '/#/admin/taikhoan', { waitUntil: 'networkidle' });
  await page.waitForSelector('#admin-body .card', { timeout: 8000 });
  await page.waitForTimeout(500);
}
const NUT_CAP_LAI = /Cấp lại mật khẩu|Cấp mật khẩu tạm/;
const dong = (khung, chu) => page.locator(`${khung} .list-row`, { hasText: chu });
const coNut = async (loc) => (await loc.locator('button', { hasText: 'Cấp lại mật khẩu' }).count()) > 0;
const khongCuonNgang = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// Mở hết các khối gập, để phép đo cuộn ngang thấy mọi dòng.
const moHetKhoi = () => page.evaluate(() => document.querySelectorAll('#admin-body details').forEach(d => { d.open = true; }));

try {
  // =========================================================================
  console.log('\n[1] Cô: không có nút cấp lại mật khẩu ở đâu cả');
  await dangNhap('giaovien', '123456');
  for (const duong of ['/#/', '/#/settings', '/#/accounts', '/#/admin/taikhoan']) {
    await page.goto(BASE + duong, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    check(`${duong}: không có nút cấp lại mật khẩu`,
      await page.locator('button', { hasText: NUT_CAP_LAI }).count() === 0);
  }
  check('cô mở #/admin/taikhoan thì không thấy danh sách tài khoản nào',
    await page.locator('#tk-co-so, #tk-quan-tri, .list-row[data-tim]').count() === 0);
  await dangXuat();

  // =========================================================================
  console.log('\n[2] Văn phòng cơ sở 1: nút ở dòng gia đình, không ở dòng cô hay quản lý');
  await dangNhap('vp1', MOI);
  await moTabTaiKhoan();
  check('có khối Cơ sở → nhóm lớp (#tk-co-so)', await page.locator('#tk-co-so').count() === 1);
  check('văn phòng KHÔNG thấy khối tài khoản quản trị cả trường', await page.locator('#tk-quan-tri').count() === 0);
  const dongPh = page.locator('#tk-co-so .list-row[data-loai="phu-huynh"]');
  const soPh = await dongPh.count();
  let phThieuNut = 0;
  for (let i = 0; i < soPh; i++) if (!(await coNut(dongPh.nth(i)))) phThieuNut++;
  check('có dòng gia đình, và dòng nào cũng có nút "Cấp lại mật khẩu"', soPh > 0 && phThieuNut === 0, { soPh, phThieuNut });
  const bao = dong('#tk-co-so', 'Phạm Quốc Bảo').first();
  check('dòng nhà anh Bảo ghi tên con và số điện thoại',
    /Phạm Gia Hân/.test(await bao.innerText()) && /0987 654 321/.test(await bao.innerText()), await bao.innerText());
  const dongCo = page.locator('#tk-co-so .list-row[data-loai="co"]');
  check('có dòng cô, nhưng KHÔNG dòng cô nào có nút cấp lại',
    await dongCo.count() > 0 && await dongCo.locator('button', { hasText: 'Cấp lại mật khẩu' }).count() === 0,
    await dongCo.count());
  const dongQL = dong('#tk-co-so', 'ql1');
  check('dòng quản lý cơ sở có mặt, KHÔNG có nút cấp lại',
    await dongQL.count() === 1 && !(await coNut(dongQL)), await dongQL.count());
  check('văn phòng không có nút tạo cô, chuyển nhóm hay phân cô vào nhóm',
    await page.locator('#tk-co-so button', { hasText: /Tạo tài khoản cô|Chuyển nhóm|Phân vào nhóm/ }).count() === 0);
  check('màn 390px của văn phòng không cuộn ngang', await khongCuonNgang());

  await bao.locator('button', { hasText: 'Cấp lại mật khẩu' }).click();
  await page.waitForSelector('#tk-mat-khau', { timeout: 8000 });
  const mkPh = (await page.locator('#tk-mat-khau').innerText()).trim();
  check('bấm cấp lại: hiện mật khẩu tạm một lần', /^[a-z]{5}[2-9]{3}$/.test(mkPh), mkPh);
  const thu = await login('phuhuynh2', mkPh);
  check('mật khẩu tạm ấy đăng nhập được, và bị buộc đổi',
    thu.status === 200 && thu.data?.user?.mustChangePassword === true, [thu.status, thu.data?.user?.mustChangePassword]);
  await page.locator('.modal button', { hasText: 'Đã ghi lại' }).click();
  await page.waitForTimeout(800);
  await dangXuat();

  // =========================================================================
  console.log('\n[3] Quản lý cơ sở 1: nút ở dòng văn phòng cơ sở mình');
  await dangNhap('ql1', MOI);
  await moTabTaiKhoan();
  const dongVP = dong('#tk-co-so', 'vp1');
  check('dòng văn phòng cơ sở 1 có nút "Cấp lại mật khẩu"', await dongVP.count() === 1 && await coNut(dongVP),
    await dongVP.count());
  const dongMinh = dong('#tk-co-so', 'ql1');
  check('dòng của chính mình KHÔNG có nút', await dongMinh.count() === 1 && !(await coNut(dongMinh)));
  check('quản lý cơ sở có nút tạo tài khoản cô',
    await page.locator('#tk-co-so button', { hasText: 'Tạo tài khoản cô' }).count() === 1);
  check('quản lý cơ sở KHÔNG có ô đổi chức vụ hay cơ sở',
    await page.locator('#tk-co-so select.tk-chon-cv, #tk-co-so select.tk-chon-cs').count() === 0);
  await moHetKhoi();
  check('màn 390px của quản lý không cuộn ngang', await khongCuonNgang());
  await dangXuat();

  // =========================================================================
  console.log('\n[4] Ban giám hiệu: đổi chức vụ và cơ sở ngay trên dòng');
  await dangNhap('bgh', MOI);
  await moTabTaiKhoan();
  const dongKT = dong('#tk-quan-tri', 'kt1');
  check('dòng Kế toán có ở khối tài khoản quản trị cả trường', await dongKT.count() === 1);
  check('dòng ấy ghi chức vụ hiện tại', /Kế toán/.test(await dongKT.locator('.row-sub').first().innerText()));
  await dongKT.locator('select.tk-chon-cv').selectOption('marketing');
  await page.waitForTimeout(1200);
  const sauKT = await dong('#tk-quan-tri', 'kt1').locator('.row-sub').first().innerText();
  check('chọn Marketing: dòng đổi chữ ngay', /Marketing/.test(sauKT) && !/Kế toán/.test(sauKT), sauKT);
  const qt = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  check('máy chủ: kt1 nay là Marketing', (qt.find(u => u.username === 'kt1') || {}).chucVu === 'marketing');
  check('dòng của chính mình không có ô đổi chức vụ (máy chủ không cho tự đổi)',
    await dong('#tk-quan-tri', 'bgh').locator('select').count() === 0);

  // Ban giám hiệu thấy ba cơ sở nên các khối đang gập: bấm mở Cơ sở 1.
  await page.locator('#tk-co-so summary', { hasText: 'Cơ sở 1' }).click();
  await dong('#tk-co-so', 'd.vp').locator('select.tk-chon-cs').selectOption('cs2');
  await page.waitForTimeout(1200);
  const qt2 = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  check('đổi cơ sở trên dòng: máy chủ ghi d.vp sang cơ sở 2', (qt2.find(u => u.username === 'd.vp') || {}).campusId === 'cs2');
  const khoiCs2 = page.locator('#tk-co-so details', { has: page.locator('summary', { hasText: 'Cơ sở 2' }) });
  check('và dòng ấy nay nằm trong khối Cơ sở 2',
    await khoiCs2.locator('.list-row', { hasText: 'd.vp' }).count() === 1);

  await page.evaluate(() => App.views.admin.go('coso'));
  await page.waitForTimeout(1000);
  check('tab Cơ sở không còn hai thẻ chức vụ / gán cơ sở cho quản trị',
    !/Chức vụ của tài khoản quản trị|Tài khoản không gắn cơ sở/.test(await page.locator('#admin-body').innerText()));

  // =========================================================================
  console.log('\n[5] Ô tìm lọc dòng');
  await moTabTaiKhoan();
  const hien = () => page.locator('#admin-body .list-row[data-tim]:visible');
  const truoc = await hien().count();
  await page.fill('#tk-tim', 'quoc bao');
  await page.waitForTimeout(300);
  const chuHien = await hien().allInnerTexts();
  check('gõ "quoc bao" (không dấu): còn đúng dòng nhà anh Bảo',
    chuHien.length === 1 && /Phạm Quốc Bảo/.test(chuHien[0]), chuHien.map(t => t.slice(0, 40)));
  await page.fill('#tk-tim', '0987654321');
  await page.waitForTimeout(300);
  const theoSo = await hien().allInnerTexts();
  check('gõ số điện thoại liền: cũng ra nhà anh Bảo', theoSo.length === 1 && /Phạm Quốc Bảo/.test(theoSo[0]), theoSo.length);
  await page.fill('#tk-tim', 'kt1');
  await page.waitForTimeout(300);
  const theoTen = await hien().allInnerTexts();
  check('gõ tên đăng nhập: ra đúng tài khoản ấy', theoTen.length === 1 && /kt1/.test(theoTen[0]), theoTen.length);
  await page.fill('#tk-tim', 'khong ai ten nay');
  await page.waitForTimeout(300);
  check('không khớp ai: không còn dòng nào, và nói rõ là không tìm thấy',
    await hien().count() === 0 && /Không tìm thấy/.test(await page.locator('#admin-body').innerText()));
  await page.fill('#tk-tim', '');
  await page.waitForTimeout(300);
  await moHetKhoi();
  check('xoá chữ tìm: các dòng quay lại', await hien().count() >= truoc && truoc > 0, [truoc, await hien().count()]);
  check('màn 390px của ban giám hiệu (mở hết khối) không cuộn ngang', await khongCuonNgang());

  check('không có lỗi chạy mã nào trên trang', loi.length === 0, loi);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
