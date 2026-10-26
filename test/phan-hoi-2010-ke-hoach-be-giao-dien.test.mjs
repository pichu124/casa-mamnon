// Bài canh góp ý của trường 20/10 cho màn KẾ HOẠCH CỦA BÉ, trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-2010-ke-hoach-be-giao-dien.test.mjs
//
//   N8. Đổi tài khoản trên CÙNG MỘT MÁY (đăng xuất rồi đăng nhập người khác,
//       không tải lại trang): màn không được mang nhóm của người trước sang.
//       Cô bị gỡ khỏi nhóm đang chọn thì màn tự về nhóm cô còn được phân.
//   N7. Số trên tab "Duyệt (N)" đếm đúng thứ danh sách duyệt hiện ra — mọi
//       nhóm, không chỉ nhóm đang chọn ở tab Lập kế hoạch.
//   N6. Nhìn lại cuối tháng có lựa chọn "Mở rộng ở tháng sau", lưu và hiện lại.
//
// Phần máy chủ có `test/phan-hoi-2010-ke-hoach-be.test.mjs`.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ke-hoach-be-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3871), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const THANG = HOM_NAY().slice(0, 7);

// Quản trị đổi mật khẩu tạm một lần, ngoài trình duyệt.
{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
}
const QL = (await login('hieutruong', 'quantri2026')).cookie;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });

// ĐĂNG XUẤT RỒI ĐĂNG NHẬP NGƯỜI KHÁC NHƯ NGƯỜI DÙNG LÀM — KHÔNG TẢI LẠI TRANG.
// Tải lại trang là xoá sạch trạng thái của màn hình, tức che mất đúng lỗi N8.
async function doiTaiKhoan(u, p) {
  if (await page.evaluate(() => !!(window.App && App.state.user))) {
    await page.evaluate(() => App.logout());
  }
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForFunction((ten) => window.App && App.state.user && App.state.user.username === ten, u, { timeout: 10000 });
  await page.waitForTimeout(600);
}
// Đi tới một màn bằng cách đổi địa chỉ trong trang (như bấm ô trên trang chủ).
async function sangMan(hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
}
const chu = () => page.locator('#view').innerText();

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });

  // =========================================================================
  console.log('\n[N8] Cô A chọn nhóm, đăng xuất; giaovien2 đăng nhập trên cùng máy');
  {
    await doiTaiKhoan('giaovien', '123456');          // t1 — nhóm c1 Chồi 2
    await sangMan('#/kehoachbe');
    check('cô A thấy kế hoạch nhóm của mình (bé Nguyễn Bảo An)', /Nguyễn Bảo An/.test(await chu()), (await chu()).slice(0, 200));

    await doiTaiKhoan('giaovien2', '123456');         // t2 — nhóm c2 Lá 1
    await sangMan('#/kehoachbe');
    const t = await chu();
    check('giaovien2 KHÔNG gặp "Không có quyền xem kế hoạch của nhóm này"', !/Không có quyền/.test(t), t.slice(0, 200));
    check('giaovien2 thấy bé nhóm Lá 1 của mình (Nguyễn Bảo Nam)', /Nguyễn Bảo Nam/.test(t), t.slice(0, 200));
    check('và không thấy bé của nhóm cô A', !/Nguyễn Bảo An/.test(t));
  }

  // =========================================================================
  console.log('\n[N8] Cùng một cô, nhóm đang chọn bị gỡ khỏi phân công');
  {
    await doiTaiKhoan('giaovien3', '123456');         // t3 — dạy cả c1 và c2
    await sangMan('#/kehoachbe');
    check('cô dạy hai nhóm thấy ô chọn nhóm', await page.locator('#kb-nhom').count() === 1);
    await page.selectOption('#kb-nhom', 'c2');
    await page.waitForTimeout(1200);
    check('chọn nhóm Lá 1 thì thấy bé Lá 1', /Nguyễn Bảo Nam/.test(await chu()));

    // Văn phòng gỡ cô khỏi nhóm Lá 1 trong lúc app của cô vẫn mở.
    const pc = await req('PUT', '/api/admin/classes/c2/teachers', { cookie: QL, body: { teacherIds: ['t2'], chinhId: 't2' } });
    check('(dựng cảnh) văn phòng gỡ cô khỏi nhóm Lá 1', pc.status === 200, pc.data);

    await sangMan('#/');
    await sangMan('#/kehoachbe');
    const t = await chu();
    check('mở lại màn không báo "Không có quyền"', !/Không có quyền/.test(t), t.slice(0, 200));
    check('màn tự về nhóm cô còn được phân (Chồi 2)', /Nguyễn Bảo An/.test(t) && !/Nguyễn Bảo Nam/.test(t), t.slice(0, 200));
  }

  // =========================================================================
  console.log('\n[N7] Số trên tab "Duyệt" khớp danh sách duyệt (phần Cambridge của nhóm Lá 1)');
  {
    const GV2 = (await login('giaovien2', '123456')).cookie;
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV2 })).data || {};
    const colours = (dm.baiHoc || []).find(b => b.gocLinhVuc === 'cambridge' && b.ten === 'Colours');
    const luu = await req('PUT', '/api/kehoachbe', { cookie: GV2, body: {
      classId: 'c2', thang: THANG, chuongTrinh: 'nuoc-ngoai',
      danhSach: [{ studentId: 's2', capNhatLucGoc: null, baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }] } });
    const gui = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV2, body: {
      classId: 'c2', thang: THANG, chuongTrinh: 'nuoc-ngoai', studentId: 's2' } });
    check('(dựng cảnh) cô gửi duyệt phần Cambridge của bé Lá 1', luu.status === 200 && gui.status === 200 && gui.data.daGui === 1, [luu.data, gui.data]);

    // Tải lại trang cho mục này đứng riêng, không dính trạng thái của N8:
    // quản trị mở màn lần đầu thì tab Lập kế hoạch chọn nhóm đầu tiên.
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await doiTaiKhoan('hieutruong', 'quantri2026');
    await sangMan('#/kehoachbe');
    const nhomDangChon = await page.locator('#kb-nhom').inputValue();
    check('(bối cảnh) tab Lập kế hoạch đang chọn nhóm khác Lá 1', nhomDangChon !== 'c2', nhomDangChon);
    const nhan = (await page.locator('#kb-tabs [data-tab="duyet"]').innerText()).trim();

    await page.click('#kb-tabs [data-tab="duyet"]');
    await page.waitForTimeout(1500);
    const soDong = await page.locator('.kb-dong-duyet').count();
    const t = await chu();
    check('danh sách duyệt có đúng 1 phần: Cambridge, nhóm Lá 1', soDong === 1 && /Nhóm Lá 1/.test(t) && /Cambridge/.test(t), { soDong, t: t.slice(0, 300) });
    check('tab ghi "Duyệt (1)" — cùng con số với danh sách nó mở ra', nhan === `Duyệt (${soDong})`, { nhan, soDong });
    const nhanSau = (await page.locator('#kb-tabs [data-tab="duyet"]').innerText()).trim();
    check('đứng ở tab Duyệt, số trên tab vẫn khớp danh sách', nhanSau === `Duyệt (${soDong})`, nhanSau);

    await page.locator('[data-duyet-phan]').first().click();
    await page.waitForTimeout(1500);
    const nhanXong = (await page.locator('#kb-tabs [data-tab="duyet"]').innerText()).trim();
    check('duyệt xong: danh sách trống và tab về "Duyệt (0)"',
      await page.locator('.kb-dong-duyet').count() === 0 && nhanXong === 'Duyệt (0)', nhanXong);
  }

  // =========================================================================
  console.log('\n[N6] Nhìn lại cuối tháng có "Mở rộng ở tháng sau"');
  {
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await doiTaiKhoan('giaovien', '123456');
    await sangMan('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.selectOption('#kb-goc', 'giac-quan');
    await page.waitForTimeout(300);
    await page.locator('.kb-vung[data-goc="giac-quan"] .kb-bai').first().click();
    await page.click('#kb-luu');
    await page.waitForTimeout(1500);
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(300);
    await page.locator('[data-nhin-lai]').first().click();
    await page.waitForTimeout(500);
    const chon = (await page.locator('.kb-tt').first().locator('option').allInnerTexts()).map(x => x.trim());
    check('ô "Tiếp tục ở tháng sau" có Dạy mới / Ôn tập / Mở rộng ở tháng sau',
      chon.join('|') === '— không —|Dạy mới ở tháng sau|Ôn tập ở tháng sau|Mở rộng ở tháng sau', chon);
    await page.locator('.kb-tt').first().selectOption({ label: 'Mở rộng ở tháng sau' });
    await page.click('#kb-nl-luu');
    await page.waitForTimeout(1500);
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(300);
    await page.locator('[data-nhin-lai]').first().click();
    await page.waitForTimeout(500);
    check('mở lại phần nhìn lại: vẫn là "Mở rộng ở tháng sau"', (await page.locator('.kb-tt').first().inputValue()) === 'mo-rong',
      await page.locator('.kb-tt').first().inputValue());
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
