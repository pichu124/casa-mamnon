// Bài canh GIAO DIỆN cho đợt sửa lỗi kiểm thử thay trường 26/11 (Đ261e).
// Bấm trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-2611-giao-dien.test.mjs
//
//   1. R3-1 — gia đình đọc báo cáo 6 tháng: ô mức có chữ ("Đã vững (S)",
//      "Chưa quan sát thấy (N)"), mức N màu xám (QUY TẮC 2).
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2611-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe', 'hanhtrinh', 'thuchup', 'hocphi']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph2611gd_qt');

const HOM = HOM_NAY();

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7201), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];

async function moTrang() {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  return { ctx, page };
}
async function dangNhap(page, u, p, duong = '') {
  await page.goto(`${sv.BASE}/${duong}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
async function moMan(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
}
const chuMan = (page) => page.locator('#view').innerText();

try {
  const qtTam = await login('ph2611gd_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtTam.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ph2611gd_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] R3-1 — gia đình đọc báo cáo 6 tháng: ô mức có chữ');
  {
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'hocky', ten: 'Bản đánh giá thử (Đ261e)', tuThang: 0, denThang: 72,
      dong: [
        { nhom: 'I. VẬN ĐỘNG', tieuDe: 'Chạy theo đường thẳng', kieu: 'muc' },
        { nhom: 'I. VẬN ĐỘNG', tieuDe: 'Bật xa bằng hai chân', kieu: 'muc' },
      ] } });
    check('đối chứng — tạo được mẫu 6 tháng', mau.status === 201 || mau.status === 200, mau.data);
    const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's5', mauId: mau.data.mau.id, tuNgay: `${HOM.slice(0, 4)}-06-01`, denNgay: HOM } });
    const ban = mo.data.ban;
    const [d1, d2] = ban.dong;
    await req('PUT', `/api/baocaohoctap/ban/${ban.id}`, { cookie: GV, body: {
      o: [{ dongId: d1.id, muc: 'da-vung' }, { dongId: d2.id, muc: 'chua-quan-sat-thay' }],
      oLopLamGi: 'Cô bày thêm vạch kẻ ở sân để con chạy theo.' } });
    const gui = await req('POST', `/api/baocaohoctap/ban/${ban.id}/gui`, { cookie: QT, body: { ngayCongBo: HOM } });
    check('đối chứng — quản trị duyệt và gửi gia đình ngay', gui.status === 200, gui.data);

    const { ctx, page } = await moTrang();
    await dangNhap(page, 'ph.lan', '123456');
    await moMan(page, '#/baocaohoctap');
    await page.locator('#view [data-mo]').first().click();
    await page.waitForTimeout(1200);
    const nhan = await page.locator('#view .badge').allInnerTexts();
    check('gia đình thấy "Đã vững (S)"', nhan.includes('Đã vững (S)'), nhan);
    check('gia đình thấy "Chưa quan sát thấy (N)"', nhan.includes('Chưa quan sát thấy (N)'), nhan);
    check('không còn ô mức trống chữ', nhan.every(x => x.trim()), nhan);
    const lopN = await page.locator('#view .badge', { hasText: 'Chưa quan sát thấy (N)' }).getAttribute('class');
    check('mức N màu xám (QUY TẮC 2)', /\bgray\b/.test(lopN || '') && !/red|danger/.test(lopN || ''), lopN);
    await page.click('#bc-ve-ds');
    await page.waitForTimeout(800);
    await page.locator('#view [data-mo]').first().click();
    await page.waitForTimeout(1200);
    const lai = await page.locator('#view .badge').allInnerTexts();
    check('bấm "Xem báo cáo khác" rồi mở lại vẫn có chữ', lai.includes('Đã vững (S)'), lai);
    await ctx.close();
  }

  check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  await browser.close();
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}
tongKet();
