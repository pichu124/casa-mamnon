// Bài canh CHUÔNG CỦA CÔ trên trình duyệt thật (Đ260c).
//
// Chạy bằng:  node test/thong-bao-nv-giao-dien.test.mjs   (TEST_PORT đổi được cổng)
//
// Nhà trường 18/11: gia đình xin nghỉ cho con thì cô phải thấy ở CHUÔNG và
// thấy chấm đỏ ở ô Xin phép, không chỉ khi tự mở màn Xin phép ra. Phần máy
// chủ (ai nhận, không chép lý do…) có test/thong-bao-nv.test.mjs.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('thong-bao-nv-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5210), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

async function dangNhap(u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
}
// Đổi màn như người bấm (có `hashchange`), không tải lại trang.
const sangMan = async (hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
};
const lamMoiSo = () => page.evaluate(() => App.refreshBadges());
const soChuong = () => page.evaluate(() => {
  const nut = [...document.querySelectorAll('#bottom-nav button')].find(b => (b.getAttribute('onclick') || '').includes("'#/notifications'"));
  const so = nut && nut.querySelector('.nav-badge');
  return so ? Number(so.textContent.replace('+', '')) : 0;
});
const soO = (key) => page.evaluate((k) => {
  const el = document.querySelector(`.tile[data-tile-key="${k}"] .tile-badge`);
  if (!el) return null;
  return el.style.display === 'none' ? 0 : Number(el.textContent) || 0;
}, key);

const HOM = HOM_NAY();

try {
  const ph = await login('phuhuynh', '123456');   // p1 — mẹ bé s1, nhóm Chồi 2 (c1)
  const don = await req('POST', '/api/leave', { cookie: ph.cookie, body: {
    studentId: 's1', fromDate: HOM, toDate: HOM, reason: 'Về quê thăm ông bà' } });
  check('đối chứng — gia đình gửi đơn xin nghỉ qua máy chủ', don.status === 201, don.status);

  // =========================================================================
  console.log('\n[1] Cô đăng nhập: chuông có số, ô Xin phép có chấm');
  await dangNhap('giaovien', '123456');            // t1 — cô phụ trách nhóm c1
  await lamMoiSo();
  const chuongTruoc = await soChuong();
  check('chuông ở thanh dưới có số ≥ 1', chuongTruoc >= 1, chuongTruoc);
  check('ô Xin phép có chấm đỏ', (await soO('xinphep')) >= 1, await soO('xinphep'));

  console.log('\n[2] Mở Thông báo thấy dòng xin nghỉ; bấm thì sang Xin phép và chuông giảm');
  await sangMan('#/notifications');
  const dong = page.locator('#view .list-row', { hasText: 'Gia đình xin nghỉ cho bé Nguyễn Bảo An' }).first();
  check('có dòng "Gia đình xin nghỉ cho bé…"', await dong.count() === 1);
  const chuDong = await dong.innerText().catch(() => '');
  check('dòng nói "Về bé …", không chép lý do nghỉ', /Về bé Nguyễn Bảo An/.test(chuDong) && !/quê/.test(chuDong), chuDong);
  await dong.click();
  await page.waitForTimeout(1500);
  check('sang màn Xin phép', (await page.evaluate(() => location.hash)) === '#/leave', await page.evaluate(() => location.hash));
  await lamMoiSo();
  const chuongSau = await soChuong();
  check('chuông giảm đúng 1', chuongSau === chuongTruoc - 1, { chuongTruoc, chuongSau });

  // =========================================================================
  console.log('\n[3] Người tạo khảo sát: ô Khảo sát có chấm, mở màn Khảo sát thì tắt');
  {
    const co = await login('giaovien', '123456');
    const ks = await req('POST', '/api/surveys', { cookie: co.cookie, body: {
      title: 'Giờ đón bé Đ260c', deadline: '2030-01-01', audience: 'class',
      questions: [{ type: 'choice', text: 'Giờ nào tiện?', options: ['16 giờ', '17 giờ'] }] } });
    check('đối chứng — cô tạo khảo sát', ks.status === 201, ks.status);
    const tl = await req('POST', `/api/surveys/${ks.data.id}/respond`, { cookie: ph.cookie, body: { answers: { q1: '16 giờ' } } });
    check('đối chứng — gia đình trả lời', tl.status === 201, tl.status);
  }
  await sangMan('#/');
  await lamMoiSo();
  check('ô Khảo sát của cô có chấm đỏ', (await soO('khaosat')) >= 1, await soO('khaosat'));
  await sangMan('#/surveys');
  await lamMoiSo();
  await sangMan('#/');
  await lamMoiSo();
  check('mở màn Khảo sát xong, ô Khảo sát hết chấm', (await soO('khaosat')) === 0, await soO('khaosat'));

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} catch (err) {
  check('bài chạy không lỗi', false, err.stack || err.message);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
