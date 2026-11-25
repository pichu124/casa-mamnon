// Bài canh GIAO DIỆN — Kế hoạch giáo dục tuần: văn phòng cơ sở soạn bản của
// cơ sở mình; gia đình chỉ thấy tuần này (Đ260m).
//
// Chạy bằng:  node test/ke-hoach-tuan-co-so-giao-dien.test.mjs   (cần Playwright; TEST_PORT tuỳ chọn)
//
// Góp ý văn phòng 18/11:
//   • *"Văn phòng có quyền tạo và sửa lịch sinh hoạt"* — ảnh chụp đúng tab
//     Kế hoạch giáo dục. Chủ dự án chốt phương án (a): văn phòng cơ sở soạn
//     bản kế hoạch tuần RIÊNG của cơ sở mình; chưa soạn thì thấy bản chung.
//   • *"chỉ hiện duy nhất thông tin về tuần … phụ huynh không xem lại bài học
//     tuần trước"* — và dòng "Xem kế hoạch tháng … trước đây →" bị gạch.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  khoaVaoCoSo, datChucVu, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-tuan-co-so-giao-dien');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5467), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
await vao('vanphong1', mkVP);

const cong = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const HOM = HOM_NAY();
// Bản chung tuần này, tuần trước và tuần sau — có chỗ để đi tuần.
for (const [t, tieuDe] of [[cong(HOM, -7), 'BẢN CHUNG TUẦN TRƯỚC'], [HOM, 'BẢN CHUNG TUẦN NÀY'], [cong(HOM, 7), 'BẢN CHUNG TUẦN SAU']]) {
  await req('PUT', `/api/plans/tuan/${t}`, { cookie: QT, body: { tieuDe, noiDung: 'Khám phá: chơi với nước' } });
}

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
const tieuDe = () => page.locator('#kht-tieu-de').innerText().catch(() => '');

try {
  // =========================================================================
  console.log('\n[1] Văn phòng cơ sở 1 soạn bản kế hoạch tuần của cơ sở mình');
  await dangNhap('vanphong1', 'quantri2026');
  await moMan('#/timetable/kehoach');
  check('văn phòng cơ sở thấy nút "Soạn kế hoạch tuần"', await page.locator('#btn-soan-kh-tuan').count() === 1);
  check('trước khi soạn: cơ sở đang thấy bản chung', /BẢN CHUNG TUẦN NÀY/.test(await tieuDe())
    && /Bản chung cả trường/.test(await page.locator('#kht-ban').innerText().catch(() => '')));
  check('dòng "Xem kế hoạch tháng … trước đây" không còn', !(/trước đây/.test(await page.locator('#view').innerText())));

  await page.click('#btn-soan-kh-tuan');
  await page.waitForTimeout(500);
  const goiY = await page.locator('#kht-o-ban').innerText();
  check('hộp soạn nói rõ đây là bản của Cơ sở 1', /Cơ sở 1/.test(goiY) && /thay cho bản chung/.test(goiY), goiY);
  check('và nói hộp đang mang sẵn chữ của bản chung', /mang sẵn chữ của bản chung/.test(goiY), goiY);
  await page.fill('#kht-o-tieu-de', 'Tuần này: Cơ sở 1 đi vườn rau');
  await page.click('#kht-luu');
  await page.waitForTimeout(1200);
  check('lưu xong: thẻ hiện bản của cơ sở', /CƠ SỞ 1 ĐI VƯỜN RAU/i.test(await tieuDe()), await tieuDe());
  check('kèm dòng "Bản riêng của Cơ sở 1"', /Bản riêng của Cơ sở 1/.test(await page.locator('#kht-ban').innerText().catch(() => '')));
  const qt = (await req('GET', '/api/plans/tuan', { cookie: QT })).data;
  check('bản chung của ban giám hiệu KHÔNG bị đè', qt?.keHoach?.tieuDe === 'BẢN CHUNG TUẦN NÀY', qt?.keHoach);
  check('văn phòng vẫn đi được tuần trước / tuần sau',
    await page.locator('#kht-truoc').count() === 1 && await page.locator('#kht-sau').count() === 1);

  // =========================================================================
  console.log('\n[2] Gia đình cơ sở 1: chỉ tuần này, bản của cơ sở mình');
  await dangNhap('phuhuynh', '123456');
  await moMan('#/timetable/kehoach');
  check('gia đình thấy bản của cơ sở 1', /CƠ SỞ 1 ĐI VƯỜN RAU/i.test(await tieuDe()), await tieuDe());
  check('gia đình KHÔNG có nút tuần trước / tuần sau',
    await page.locator('#kht-truoc').count() === 0 && await page.locator('#kht-sau').count() === 0);
  check('gia đình không có nút Soạn', await page.locator('#btn-soan-kh-tuan').count() === 0);
  const chu = await page.locator('#view').innerText();
  check('màn gia đình ghi "tuần này", không có chữ của tuần trước / tuần sau',
    /tuần này/.test(chu) && !/TUẦN TRƯỚC|TUẦN SAU/.test(chu));
  check('không có dòng "Xem kế hoạch tháng … trước đây"', !/trước đây/.test(chu));

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Kế hoạch tuần — bản của cơ sở, gia đình chỉ tuần này (giao diện)');
