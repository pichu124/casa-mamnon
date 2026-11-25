// Bài canh GIAO DIỆN cho NGÀY NHẬP HỌC (Đ260l — góp ý 18/11 của văn phòng).
//
// Chạy bằng:  node test/nhap-hoc-giao-dien.test.mjs
//
//   1. Phiếu "Nhận một bé" có ô Ngày nhập học, mặc định hôm nay; chọn ngày
//      khác rồi nhận bé thì máy chủ ghi đúng ngày đã chọn.
//   2. Phiếu "Sửa hồ sơ" hiện lại đúng ngày đó; đổi được, để trống là bỏ.
//   3. Văn phòng cơ sở (không sửa được nhân thân) vẫn đổi được ngày nhập học
//      từ cùng phiếu, không vấp lỗi.
//   4. Màn soạn thông báo của văn phòng nhắc: gia đình nhập học sau ngày đăng
//      không thấy tin này. Màn của cô không có câu đó.
import { chromium } from 'playwright';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, khoaVaoCoSo, datChucVu, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhap-hoc-giao-dien');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu trưởng', 'nhg_qt');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'nhg_vp');
datChucVu(DIR, 'nhg_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'nhg_vp', 'cs1');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5203), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const doc = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const ngayNhapHocCua = (id) => (doc('SELECT ngayNhapHoc FROM student_nhap_hoc WHERE studentId = ?', id)[0] || {}).ngayNhapHoc || null;

const HOM_NAY = ngay.homNay();
const congNgay = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const D1 = congNgay(HOM_NAY, 3);
const D2 = congNgay(HOM_NAY, -2);
const D3 = congNgay(HOM_NAY, 10);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', d => d.accept());

async function dangNhap(u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
async function moNhom() {
  await page.goto(`${sv.BASE}/#/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => App.views.admin.xemLop('c1', 'Chồi 2'));
  await page.waitForTimeout(1000);
}
async function moSua(id) {
  await page.evaluate((x) => App.views.admin.suaHocSinh(x), id);
  await page.waitForSelector('#ad-hs-nhap-hoc', { timeout: 6000 });
}
const toastLoi = async () => (await page.locator('.toast.error').count()) ? page.locator('.toast.error').first().innerText() : '';

try {
  for (const [u, mk] of [['nhg_qt', mkQT], ['nhg_vp', mkVP]]) {
    const d0 = await login(u, mk);
    await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  }

  // =========================================================================
  console.log('\n[1] Nhận một bé kèm ngày nhập học');
  let beId = null;
  {
    await dangNhap('nhg_qt', 'quantri2026');
    await moNhom();
    await page.click('#ad-them-be');
    await page.waitForSelector('#nb-nhap-hoc', { timeout: 6000 });
    check('ô Ngày nhập học mặc định là hôm nay', await page.inputValue('#nb-nhap-hoc') === HOM_NAY, await page.inputValue('#nb-nhap-hoc'));
    const goiY = await page.locator('#nb-nhap-hoc + .hint').innerText();
    check('kèm lời giải thích bằng tiếng Việt', /chỉ thấy thông báo và khảo sát/.test(goiY), goiY);
    await page.fill('#nb-ten', 'Phan Minh Nhật');
    await page.fill('#nb-ph', 'Phan Thu Hương');
    await page.fill('#nb-sdt', '0977555111');
    await page.fill('#nb-nhap-hoc', D1);
    await page.click('#nb-luu');
    await page.waitForSelector('#nb-xong', { timeout: 8000 });
    beId = (doc("SELECT id FROM students WHERE name = 'Phan Minh Nhật'")[0] || {}).id;
    check('đối chứng — bé đã được nhận', !!beId);
    check('máy chủ ghi đúng ngày nhập học đã chọn', ngayNhapHocCua(beId) === D1, ngayNhapHocCua(beId));
    await page.click('#nb-xong');
    await page.waitForTimeout(1200);
  }

  // =========================================================================
  console.log('\n[2] Sửa hồ sơ hiện lại và đổi được ngày nhập học');
  {
    await moSua(beId);
    check('phiếu Sửa hồ sơ hiện đúng ngày đã ghi', await page.inputValue('#ad-hs-nhap-hoc') === D1, await page.inputValue('#ad-hs-nhap-hoc'));
    await page.fill('#ad-hs-nhap-hoc', D2);
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    check('lưu xong máy chủ có ngày mới', ngayNhapHocCua(beId) === D2, ngayNhapHocCua(beId));
    const truocNk = doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'student-nhap-hoc' AND target = ?", beId)[0].n;
    await moSua(beId);
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    check('lưu lại mà không đổi ngày thì không gửi thêm lượt ghi nào',
      doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'student-nhap-hoc' AND target = ?", beId)[0].n === truocNk);
    await moSua(beId);
    await page.fill('#ad-hs-nhap-hoc', '');
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    check('để trống rồi lưu thì bỏ ngày nhập học', ngayNhapHocCua(beId) === null, ngayNhapHocCua(beId));
  }

  // =========================================================================
  console.log('\n[3] Văn phòng cơ sở đổi ngày nhập học từ phiếu Sửa hồ sơ');
  {
    await dangNhap('nhg_vp', 'quantri2026');
    await moNhom();
    await moSua(beId);
    check('đối chứng — ô đang trống', await page.inputValue('#ad-hs-nhap-hoc') === '');
    await page.fill('#ad-hs-nhap-hoc', D3);
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    check('không hiện lỗi (phần nhân thân không đổi nên không bị chặn)', !(await toastLoi()), await toastLoi());
    check('máy chủ ghi ngày văn phòng chọn', ngayNhapHocCua(beId) === D3, ngayNhapHocCua(beId));
  }

  // =========================================================================
  console.log('\n[4] Màn soạn thông báo nhắc văn phòng về ngày nhập học');
  const CAU = 'Gia đình nhập học sau ngày đăng sẽ không thấy tin này — cần thì gửi lại.';
  {
    await page.goto(`${sv.BASE}/#/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => App.views.notifications.openCreate());
    await page.waitForSelector('#nt-ghim', { timeout: 6000 });
    const goiY = (await page.locator('#nt-ghim-goi-y').count()) ? await page.locator('#nt-ghim-goi-y').innerText() : '';
    check('văn phòng thấy câu nhắc ngay dưới ô Ghim', goiY.trim() === CAU, goiY);
    await page.evaluate(() => UI.closeModal());
    const tin = await page.evaluate(() => (App.views.notifications._list.find(n => !n.lienKet && !n.laRiengBe && !n.laRiengNv) || {}).id);
    await page.evaluate((x) => App.views.notifications.showDetail(x), tin);
    await page.waitForTimeout(800);
    const goiYCt = (await page.locator('#nt-ct-goi-y').count()) ? await page.locator('#nt-ct-goi-y').innerText() : '';
    check('…và dưới nút Ghim của hộp chi tiết', !!tin && goiYCt.trim() === CAU, { tin, goiYCt });

    await dangNhap('giaovien', '123456');
    await page.goto(`${sv.BASE}/#/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => App.views.notifications.openCreate());
    await page.waitForSelector('#nt-title', { timeout: 6000 });
    check('cô không thấy câu nhắc (cô không ghim được)', await page.locator('#nt-ghim-goi-y').count() === 0);
  }

  check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
