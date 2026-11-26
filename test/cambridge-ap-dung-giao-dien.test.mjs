// Bài canh GIAO DIỆN — Cambridge theo khoảng ngày áp dụng (Đ260m).
//
// Chạy bằng:  node test/cambridge-ap-dung-giao-dien.test.mjs   (cần Playwright; TEST_PORT tuỳ chọn)
//
// Góp ý văn phòng 18/11: *"setup block này hoặc chương trình này dạy từ thời
// gian này tới thời gian này, chứ không phải theo từng tuần … phụ huynh không
// xem lại bài học tuần trước, tháng trước"*.
//
// Đi như người thật: văn phòng soạn bài bằng hai ô "Áp dụng từ … đến …" (và
// nút lấy ngày theo block), gửi đi; gia đình mở màn chỉ thấy bài đang áp dụng,
// không có nút "Xem tờ cũ hơn"; văn phòng thấy nhãn "Đã qua — gia đình không
// còn thấy" ở bài cũ.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge-ap-dung-giao-dien');
sinhDuLieu(DIR);
batPhanHe(DIR, ['cambridge']);
const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5456), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const d0 = await login('hieutruong', mk);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const VP = (await login('hieutruong', 'quantri2026')).cookie;

const cong = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const HOM = HOM_NAY();
const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

// Bài cũ (đã qua) và một block có ngày, dựng qua API.
const cu = await req('POST', '/api/cambridge', { cookie: VP, body: {
  loai: 'cambridge', phamVi: 'truong', tieuDe: 'Weekly Plan THÁNG TRƯỚC', noiDung: 'Shapes',
  apDung: { tuNgay: cong(HOM, -40), denNgay: cong(HOM, -10) } } });
await req('POST', `/api/cambridge/${cu.data?.id}/cong-bo`, { cookie: VP, body: {} });
const TU_BLOCK = cong(HOM, -5), DEN_BLOCK = cong(HOM, 30);
const bl = await req('POST', '/api/cambridge/block', { cookie: VP, body: {
  ten: 'Block 3', luaTuoi: '', tuNgay: TU_BLOCK, denNgay: DEN_BLOCK, mucTieu: 'Animals', thuTu: 1 } });
check('đối chứng — dựng được bài cũ và block', cu.status === 201 && bl.status === 201, { cu: cu.status, bl: bl.status });
// Một nháp chưa ghi khoảng: chưa có tuần gửi nên chưa có ngày áp dụng.
await req('POST', '/api/cambridge', { cookie: VP, body: { loai: 'cambridge', phamVi: 'truong', tieuDe: 'Nháp chưa ghi khoảng', noiDung: 'x' } });

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
  await page.waitForTimeout(1000);
};
const the = (tieuDe) => page.locator('#view .card', { hasText: tieuDe });

try {
  // =========================================================================
  console.log('\n[1] Văn phòng soạn bài bằng "Áp dụng từ … đến …", lấy ngày theo block');
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/cambridge/cambridge');
  await page.click('#cam-them');
  await page.waitForTimeout(600);
  check('mẫu soạn có hai ô Áp dụng từ / Đến',
    (await page.locator('#cam-tu').isVisible()) && (await page.locator('#cam-den').isVisible()));
  check('ô "Gắn vào tuần" cũ không còn', await page.locator('#cam-tuan').count() === 0);
  check('bài mới: hai ô để trống (áp dụng theo tuần gửi)',
    (await page.inputValue('#cam-tu')) === '' && (await page.inputValue('#cam-den')) === '');

  await page.selectOption('#cam-block', bl.data.id);
  await page.click('#cam-lay-block');
  check('nút "Lấy theo thời gian của block" điền đúng ngày của block',
    (await page.inputValue('#cam-tu')) === TU_BLOCK && (await page.inputValue('#cam-den')) === DEN_BLOCK,
    { tu: await page.inputValue('#cam-tu'), den: await page.inputValue('#cam-den') });

  await page.fill('#cam-tieude', 'Block 3 — Animals (cả block)');
  await page.fill('#cam-hd-1-chu-de', 'Animals');
  await page.click('#cam-luu');
  await page.waitForTimeout(1200);
  const moi = (await req('GET', '/api/cambridge?loai=cambridge', { cookie: VP })).data?.bai?.find(b => b.tieuDe === 'Block 3 — Animals (cả block)');
  check('lưu xong: máy chủ ghi đúng khoảng riêng', moi?.apDung?.nguon === 'rieng'
    && moi?.apDung?.tuNgay === TU_BLOCK && moi?.apDung?.denNgay === DEN_BLOCK, moi?.apDung);
  await page.locator(`[data-cong-bo="${moi?.id}"]`).click();
  await page.waitForTimeout(1200);

  const theMoi = await the('Block 3 — Animals (cả block)').innerText();
  check('thẻ bài ghi "Áp dụng dd/mm – dd/mm/yyyy"',
    theMoi.includes(`Áp dụng ${ddmm(TU_BLOCK)} – ${ddmm(DEN_BLOCK)}`), theMoi.slice(0, 200));
  check('văn phòng thấy nhãn "Đang áp dụng"', /Đang áp dụng/.test(theMoi));
  const theCu = await the('Weekly Plan THÁNG TRƯỚC').innerText();
  check('bài cũ: văn phòng vẫn thấy, kèm nhãn "Đã qua — gia đình không còn thấy"',
    /Đã qua — gia đình không còn thấy/.test(theCu), theCu.slice(0, 200));
  const mau = await the('Weekly Plan THÁNG TRƯỚC').locator('.badge', { hasText: 'Đã qua' }).getAttribute('class');
  check('nhãn "Đã qua" không tô đỏ (QUY TẮC 2)', !/\bred\b/.test(mau || ''), mau);
  const theNhap = await the('Nháp chưa ghi khoảng').innerText();
  check('nháp chưa ghi khoảng: "Áp dụng trong tuần gửi tới gia đình", không nhãn trạng thái',
    /Áp dụng trong tuần gửi tới gia đình/.test(theNhap) && !/Đang áp dụng|Đã qua|Sắp tới/.test(theNhap), theNhap.slice(0, 200));

  // Sửa bài: hai ô mang sẵn khoảng đã ghi.
  await page.locator(`[data-sua="${moi?.id}"]`).click();
  await page.waitForTimeout(600);
  check('mở Sửa: hai ô mang sẵn khoảng đã ghi',
    (await page.inputValue('#cam-tu')) === TU_BLOCK && (await page.inputValue('#cam-den')) === DEN_BLOCK);
  await page.keyboard.press('Escape').catch(() => {});

  // =========================================================================
  console.log('\n[2] Gia đình chỉ thấy bài đang áp dụng');
  await dangNhap('phuhuynh', '123456');
  await moMan('#/cambridge/cambridge');
  const chu = await page.locator('#view').innerText();
  check('gia đình thấy bài đang áp dụng', chu.includes('Block 3 — Animals (cả block)'));
  check('gia đình KHÔNG thấy bài tháng trước', !chu.includes('Weekly Plan THÁNG TRƯỚC'));
  check('thẻ của gia đình nói thời gian áp dụng, không có nhãn trạng thái',
    chu.includes(`Áp dụng ${ddmm(TU_BLOCK)}`) && !/Đang áp dụng|Đã qua/.test(chu));
  check('không có nút "Xem tờ cũ hơn"', await page.locator('#cam-cu-hon').count() === 0);

  await moMan('#/cambridge/ket-noi');
  const trong = await page.locator('#view').innerText();
  check('tab trống nói "chưa có nội dung nào đang áp dụng"', /chưa có nội dung nào đang áp dụng/i.test(trong), trong.slice(0, 300));

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Cambridge theo khoảng ngày — giao diện');
