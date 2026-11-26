// Bài canh giao diện của gia đình và phần dùng chung — kiểm thử thay trường
// 26/11 (Đ261d). Chạy trên trình duyệt thật, khổ điện thoại 390px.
//
// Chạy bằng:  node test/phan-hoi-2611-gia-dinh-giao-dien.test.mjs
//
//   1. R2-L1  Bấm "Gửi đơn xin phép" / "Gửi lời dặn thuốc" hai lần khi mạng
//             chậm chỉ gửi MỘT yêu cầu và chỉ có MỘT đơn.
//   2. R2-L2  Nút quay lại của điện thoại đóng hộp đang mở (gia đình và cô);
//             phiếu mật khẩu chỉ hiện một lần thì KHÔNG tự đóng.
//   3. R2-L6  "Nghỉ không phép" ở màn gia đình là màu cam, không phải đỏ.
//   4. R1-B16 Nhà trường vừa bật lại một phần, gia đình chưa tải lại trang mà
//             mở phần đó thì vào được, không gặp "không mở trong tài khoản".
//   5. R2-L3  Màn "Máy đang không có mạng" nói đúng sự thật theo vai.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri,
  CHROMIUM, tatBannerMoiCai, batPhanHe, tatPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('2611-gia-dinh-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['thuchup']);
tatPhanHe(DIR, ['hocphi']);
const HOM = HOM_NAY();
// Hôm nay bé s1 được ghi "Nghỉ không phép" — để soi màu trên màn gia đình.
{
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s1', HOM);
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
             VALUES ('att_kp_s1', 's1', ?, 'absent_unexcused', NULL, NULL, '', 't1')`).run(HOM);
  c.close();
}
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7153), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
let QT;
{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  QT = (await login('hieutruong', 'quantri2026')).cookie;
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const DT = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const loiJs = [];

async function moTrang(opts = {}) {
  const ctx = await tatBannerMoiCai(await browser.newContext({ ...DT, ...opts }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  page.on('dialog', d => { d.accept().catch(() => {}); });
  return { ctx, page };
}
async function dangNhap(page, u, p = '123456') {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}
const moMan = async (page, hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
};
// Bấm hai lần cách nhau 350 ms bằng chính nút trên màn (nút đã khoá thì lần
// bấm thứ hai không làm gì — đúng như ngón tay chạm vào nút xám).
async function bamHaiLan(page, chuNut) {
  const bam = () => page.evaluate((chu) => {
    const nut = [...document.querySelectorAll('#modal-overlay button')].find(b => b.textContent.includes(chu));
    if (nut) nut.click();
    return !!nut;
  }, chuNut);
  const lan1 = await bam();
  await page.waitForTimeout(350);
  await bam();
  await page.waitForTimeout(2500);
  return lan1;
}
const hopMo = async (page) => (await page.locator('#modal-overlay').count()) > 0;

try {
  // =========================================================================
  console.log('\n[1] R2-L1 — gia đình bấm "Gửi" hai lần khi mạng chậm');
  {
    const { ctx, page } = await moTrang();
    await dangNhap(page, 'phuhuynh');
    const guiDon = [];
    page.on('request', r => {
      if (r.method() === 'POST' && /\/api\/(leave|medicine)$/.test(new URL(r.url()).pathname)) guiDon.push(new URL(r.url()).pathname);
    });
    // Mạng chậm 0,9 giây cho đúng hai đường gửi đơn.
    await page.route(/\/api\/(leave|medicine)$/, async (route) => {
      if (route.request().method() === 'POST') await new Promise(r => setTimeout(r, 900));
      await route.continue();
    });

    await moMan(page, '#/leave');
    await page.click('#btn-new-leave');
    await page.waitForSelector('#lv-reason');
    await page.fill('#lv-reason', 'Con đi khám răng — thử bấm hai lần');
    check('có nút "Gửi đơn xin phép"', await bamHaiLan(page, 'Gửi đơn xin phép'));
    check('chỉ MỘT yêu cầu gửi đơn xin nghỉ đi', guiDon.filter(x => x === '/api/leave').length === 1, guiDon);
    const don = await page.evaluate(() => API.get('/api/leave'));
    check('và chỉ có MỘT đơn', don.filter(l => l.reason === 'Con đi khám răng — thử bấm hai lần').length === 1,
      don.map(l => l.reason));
    check('hộp đã đóng sau khi gửi', !(await hopMo(page)));

    await moMan(page, '#/medicine');
    await page.click('#btn-new-med');
    await page.waitForSelector('#md-meds .md-name');
    await page.fill('#md-meds .md-name', 'Siro thử bấm hai lần');
    check('có nút "Gửi lời dặn thuốc"', await bamHaiLan(page, 'Gửi lời dặn thuốc'));
    check('chỉ MỘT yêu cầu dặn thuốc đi', guiDon.filter(x => x === '/api/medicine').length === 1, guiDon);
    const thuoc = await page.evaluate(() => API.get('/api/medicine'));
    check('và chỉ có MỘT đơn thuốc',
      thuoc.filter(m => (m.medicines || []).some(t => t.name === 'Siro thử bấm hai lần')).length === 1, thuoc.length);
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[2] R2-L2 / R2-L6 — gia đình: nút quay lại đóng hộp; "Nghỉ không phép" màu cam');
  {
    const { ctx, page } = await moTrang();
    await dangNhap(page, 'phuhuynh');
    await moMan(page, '#/attendance');
    const mau = await page.evaluate(() => {
      const nhan = [...document.querySelectorAll('.badge')].find(b => b.textContent.trim() === 'Nghỉ không phép');
      const chuGiai = [...document.querySelectorAll('.card span.small')].find(s => s.textContent.trim() === 'Nghỉ không phép');
      const cham = chuGiai && chuGiai.querySelector('span');
      return {
        nhan: nhan ? getComputedStyle(nhan).color : null,
        cham: cham ? getComputedStyle(cham).backgroundColor : null,
      };
    });
    check('nhãn "Nghỉ không phép" màu cam rgb(194, 65, 12)', mau.nhan === 'rgb(194, 65, 12)', mau);
    check('chấm chú giải lịch cũng cam', mau.cham === 'rgb(194, 65, 12)', mau);

    await page.locator('.card .list-row.clickable').first().click();
    await page.waitForSelector('#modal-overlay', { timeout: 5000 });
    check('đối chứng — hộp "Chi tiết điểm danh" đang mở', /Chi tiết điểm danh/.test(await page.locator('#modal-overlay').innerText()));
    await page.goBack();
    await page.waitForTimeout(900);
    check('bấm quay lại: màn dưới đã về trang trước', !/attendance/.test(await page.evaluate(() => location.hash)),
      await page.evaluate(() => location.hash));
    check('…và hộp đã đóng', !(await hopMo(page)));

    // Phiếu mật khẩu tạm (giuKhiBamNen) chỉ hiện một lần: đổi màn KHÔNG đóng.
    await page.evaluate(() => UI.modal('<p id="mk-mot-lan">Mật khẩu tạm: thử-123</p>', 'Mật khẩu tạm', { giuKhiBamNen: true }));
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForTimeout(900);
    check('phiếu mật khẩu chỉ hiện một lần KHÔNG tự đóng khi đổi màn', await page.locator('#mk-mot-lan').count() === 1);
    await page.evaluate(() => UI.closeModal());

    // Hộp thường mở rồi đổi địa chỉ (gõ thẳng) cũng đóng.
    await page.evaluate(() => UI.modal('<p id="hop-thuong">x</p>', 'Hộp thường'));
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(900);
    check('hộp thường đóng khi đổi địa chỉ', await page.locator('#hop-thuong').count() === 0);

    // =======================================================================
    console.log('\n[3] R1-B16 — nhà trường vừa bật lại Học phí, gia đình chưa tải lại trang');
    check('đối chứng — lúc mở app Học phí đang tắt', !(await page.evaluate(() => App.moduleEnabled('hocphi'))));
    const bat = await req('PUT', '/api/admin/modules/hocphi', { cookie: QT, body: { enabled: true } });
    check('quản trị bật lại Học phí', bat.status === 200, bat);
    await page.evaluate(() => { location.hash = '#/hocphi'; });
    await page.waitForTimeout(2500);
    const chu = await page.locator('#view').innerText();
    check('KHÔNG gặp "Phần này không mở trong tài khoản của bạn"', !/không mở trong tài khoản/.test(chu), chu.slice(0, 200));
    check('màn Học phí mở ra', await page.evaluate(() => App.moduleEnabled('hocphi')) && /Học phí/.test(chu), chu.slice(0, 200));
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[4] R2-L2 — cô: mở "⋯" ở Điểm danh rồi bấm quay lại');
  {
    const { ctx, page } = await moTrang();
    await dangNhap(page, 'giaovien');
    await moMan(page, '#/attendance');
    await page.locator('.dd-viec-khac').first().click();
    await page.waitForSelector('#modal-overlay', { timeout: 5000 });
    check('đối chứng — hộp "Việc khác" đang mở', /Việc khác/.test(await page.locator('#modal-overlay').innerText()));
    await page.goBack();
    await page.waitForTimeout(900);
    check('về Trang chủ và hộp đã đóng', !(await hopMo(page)) && (await page.locator('.tile-grid').count()) > 0);
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[5] R2-L3 / R4-B5 — màn "Máy đang không có mạng" nói đúng theo vai');
  async function chuMatMang(u) {
    const { ctx, page } = await moTrang({ serviceWorkers: 'block' });
    await dangNhap(page, u);
    await ctx.route('**/api/**', route => route.abort('internetdisconnected'));
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);
    const chu = (await page.locator('#view').innerText().catch(() => '')) || '';
    await ctx.close();
    return chu;
  }
  {
    const chu = await chuMatMang('phuhuynh');
    check('gia đình: màn nói máy không có mạng', /không có mạng/i.test(chu), chu);
    check('gia đình: không nói với "cô"', !/(^|\s)cô(\s|$)/i.test(chu), chu);
    check('gia đình: không hứa "tự gửi đi"', !/tự gửi đi/.test(chu), chu);
    check('gia đình: nói gửi đơn, tin nhắn cần có mạng', /cần có mạng/.test(chu), chu);
  }
  {
    const chu = await chuMatMang('giaovien');
    check('cô: màn nói máy không có mạng', /không có mạng/i.test(chu), chu);
    check('cô: chỉ hứa cho Ghi nhanh đã lưu trên máy', /Ghi nhanh đã lưu trên máy sẽ tự gửi đi/.test(chu), chu);
    check('cô: nói rõ điểm danh và nhật ký cần có mạng', /điểm danh và nhật ký cần có mạng/i.test(chu), chu);
    check('cô: không còn câu hứa chung "những gì cô đã ghi … không mất"', !/những gì cô đã ghi/.test(chu), chu);
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
