// Bài canh BỮA ĂN THEO CƠ SỞ trên trình duyệt thật (góp ý 18/11, Đ260g).
//
// Chạy bằng:  node test/phan-hoi-1811-bua-co-so-giao-dien.test.mjs
//
// Phần máy chủ ở `test/phan-hoi-1811-bua-co-so.test.mjs`. Bài này đo đúng thứ
// chỉ trình duyệt trả lời được:
//
//   1. Quản trị mở Nhật ký ngày thấy nút "Bữa ăn theo cơ sở"; hộp mở ra mỗi cơ
//      sở một khối, năm ô chọn bữa; gọn trên điện thoại 390px.
//   2. Bỏ dấu "Bữa sữa chiều" của Cơ sở 1 → cô nhóm Nhà trẻ 1 (Cơ sở 1) mở màn
//      không còn bước Bữa sữa chiều; các bữa khác còn nguyên.
//   3. Bỏ tới bữa cuối cùng của một cơ sở thì không được — ô chọn bật lại.
//   4. Cô không thấy nút cài đặt.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe, taoQuanTri,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bua-co-so-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5451), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
let QT;
{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  QT = (await login('hieutruong', 'quantri2026')).cookie;
}
const tatCua = async (cs) => ((((await req('GET', '/api/nhatky/bua-co-so', { cookie: QT })).data || {}).coSo || [])
  .find(c => c.id === cs) || {}).tat || [];

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });

async function dangNhap(u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
};
const buocBua = async () => (await page.locator('.seg [data-buoc]').allInnerTexts()).map(t => t.trim());
const o = (cs, bua) => page.locator(`.nk-bua-cs input[data-co-so="${cs}"][data-bua="${bua}"]`);
// Bấm một ô chọn rồi chờ đúng lượt PUT của nó trả lời.
async function bam(cs, bua) {
  const xong = page.waitForResponse(r => r.url().includes('/api/nhatky/bua-co-so') && r.request().method() === 'PUT');
  await o(cs, bua).click();
  const r = await xong;
  await page.waitForTimeout(200);
  return r.status();
}

try {
  // =========================================================================
  console.log('\n[0] Đối chứng: cô Nhà trẻ 1 (Cơ sở 1) đang có đủ năm bữa, không có nút cài đặt');
  await dangNhap('giaovien4', '123456');
  await moMan('#/nhatky');
  check('dải bước đủ năm bữa rồi Ghi chú',
    (await buocBua()).join(' | ') === 'Bữa sáng | Bữa phụ sáng | Bữa trưa | Bữa phụ chiều | Bữa sữa chiều | Ghi chú', await buocBua());
  check('cô không thấy nút "Bữa ăn theo cơ sở"', await page.locator('#nk-bua-co-so').count() === 0);

  // =========================================================================
  console.log('\n[1] Quản trị mở hộp "Bữa ăn theo cơ sở"');
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/nhatky');
  check('màn Nhật ký ngày của quản trị có nút "Bữa ăn theo cơ sở"',
    /Bữa ăn theo cơ sở/.test(await page.locator('#nk-bua-co-so').innerText().catch(() => '')));
  await page.click('#nk-bua-co-so');
  await page.waitForSelector('.nk-bua-cs input', { timeout: 5000 });
  const hop = await page.locator('#modal-overlay').innerText();
  check('hộp có tên ba cơ sở', ['Cơ sở 1', 'Cơ sở 2', 'Cơ sở 3'].every(t => hop.includes(t)), hop.slice(0, 300));
  check('mỗi cơ sở năm ô chọn, mặc định đều đang dùng',
    await page.locator('.nk-bua-cs input').count() === 15 && await page.locator('.nk-bua-cs input:not(:checked)').count() === 0);
  check('đủ năm tên bữa của trường', ['Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Bữa sữa chiều'].every(t => hop.includes(t)));
  const kho = await page.evaluate(() => ({
    rong: document.documentElement.scrollWidth,
    nho: [...document.querySelectorAll('.nk-bua-cs input, #nk-bua-xong')].map(e => e.getBoundingClientRect())
      .filter(r => r.width < 32 || r.height < 32).length,
  }));
  check('khổ 390px: không cuộn ngang', kho.rong <= 390, kho.rong);
  check('khổ 390px: không ô chọn / nút nào nhỏ hơn 32px', kho.nho === 0, kho.nho);

  // =========================================================================
  console.log('\n[2] Bỏ Bữa sữa chiều của Cơ sở 1');
  check('máy chủ nhận lượt bỏ', (await bam('cs1', 'milk')) === 200);
  check('ô chọn còn bỏ trống', !(await o('cs1', 'milk').isChecked()));
  check('máy chủ ghi đúng: Cơ sở 1 bỏ milk', (await tatCua('cs1')).join(',') === 'milk', await tatCua('cs1'));
  check('Cơ sở 2 không bị đụng tới', (await tatCua('cs2')).length === 0);

  // =========================================================================
  console.log('\n[3] Không bỏ được bữa cuối cùng');
  for (const b of ['breakfast', 'snack_sang', 'lunch', 'snack']) await bam('cs3', b);
  check('đối chứng — Cơ sở 3 đã bỏ bốn bữa', (await tatCua('cs3')).length === 4, await tatCua('cs3'));
  check('bỏ bữa thứ năm: máy chủ từ chối', (await bam('cs3', 'milk')) === 400);
  check('ô chọn bật lại, Cơ sở 3 vẫn còn Bữa sữa chiều', await o('cs3', 'milk').isChecked() && !(await tatCua('cs3')).includes('milk'));
  await page.click('#nk-bua-xong');
  await page.waitForTimeout(600);
  check('bấm Xong thì hộp đóng', await page.locator('#modal-overlay').count() === 0);

  // =========================================================================
  console.log('\n[4] Cô Nhà trẻ 1 (Cơ sở 1) không còn bước Bữa sữa chiều');
  await dangNhap('giaovien4', '123456');
  await moMan('#/nhatky');
  check('dải bước còn bốn bữa rồi Ghi chú',
    (await buocBua()).join(' | ') === 'Bữa sáng | Bữa phụ sáng | Bữa trưa | Bữa phụ chiều | Ghi chú', await buocBua());
  check('không còn nút bước bua:milk', await page.locator('.seg [data-buoc="bua:milk"]').count() === 0);

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
