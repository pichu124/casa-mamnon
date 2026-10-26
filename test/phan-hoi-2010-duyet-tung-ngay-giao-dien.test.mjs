// Góp ý của trường 20/10 — Đ242E trên trình duyệt thật: màn DUYỆT TỪNG NGÀY.
//
// Cần Playwright. Chạy bằng:
//   node test/phan-hoi-2010-duyet-tung-ngay-giao-dien.test.mjs
//
// Đơn 21/10 – 24/10/2026, gia đình gửi lúc 7h30 sáng 21/10 (giờ Việt Nam):
//   • Văn phòng mở "Duyệt" → mỗi ngày một dòng, điền sẵn gợi ý; bỏ tích "Nghỉ
//     có phép" thì ô hoàn tự về "không hoàn" và khoá lại; dòng tổng đếm lại.
//   • Duyệt xong, lịch sử có nút "Sửa từng ngày" → sửa và lưu được.
//   • Gia đình mở đơn → thấy kết quả từng ngày, chữ trung tính (không đỏ),
//     không thấy ghi chú nội bộ về tiền ăn.
//   • D5: màn Điểm danh của văn phòng có lối nhỏ sang "Lịch nghỉ của trường".
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-duyet-tung-ngay-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh']);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const CSDL = path.join(DIR, 'school.db');
{
  const c = new Database(CSDL);
  c.prepare(`DELETE FROM attendance WHERE studentId = 's1' AND date BETWEEN '2026-10-21' AND '2026-10-24'`).run();
  c.close();
}
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7142), dir: DIR });

const goiApi = async (duong, body, cookie, method) => {
  const r = await fetch(sv.BASE + duong, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, await dnApi('htruong', mkTam));
const ckQT = await dnApi('htruong', 'quantri2026');
const ckPH = await dnApi('phuhuynh', '123456');

const tao = await goiApi('/api/leave', {
  studentId: 's1', fromDate: '2026-10-21', toDate: '2026-10-24', reason: 'Con bị sốt, gia đình xin cho con ở nhà',
}, ckPH);
const DON = tao.data?.id;
{
  const c = new Database(CSDL);
  c.prepare('UPDATE leave_requests SET createdAt = ? WHERE id = ?').run('2026-10-21T00:30:00.000Z', DON);
  c.close();
}
check('(dựng) gia đình gửi được đơn 21–24/10', !!DON, tao.data);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];
async function moTrang() {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  page.on('dialog', d => { d.accept().catch(() => {}); });
  return page;
}
async function dangNhap(page, u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
async function moMan(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
}
const dong = (page, ngay) => page.locator(`.lv-ngay[data-ngay="${ngay}"]`);

// ===========================================================================
console.log('\n[1] Văn phòng duyệt: mỗi ngày một dòng, điền sẵn gợi ý');
{
  const page = await moTrang();
  await dangNhap(page, 'htruong', 'quantri2026');
  await moMan(page, '#/leave');
  await page.locator(`button[onclick*="${DON}"][onclick*="approved"]`).click();
  await page.waitForSelector('.lv-ngay', { timeout: 5000 });
  check('hộp duyệt có đúng 4 dòng ngày', await page.locator('.lv-ngay').count() === 4, await page.locator('.lv-ngay').count());
  check('không còn ô "Số ngày được hoàn" kiểu cũ', await page.locator('#lv-hoan-ngay').count() === 0);

  const d21 = dong(page, '2026-10-21');
  check('21/10: bỏ tích "Nghỉ có phép"', !(await d21.locator('.lv-ng-phep').isChecked()));
  check('21/10: ô hoàn là "không hoàn" và khoá',
    await d21.locator('.lv-ng-hoan').inputValue() === 'khong' && await d21.locator('.lv-ng-hoan').isDisabled());
  check('21/10: lý do điền sẵn "Gửi đơn sau 7 giờ sáng"',
    /sau 7 giờ sáng/.test(await d21.locator('.lv-ng-lydo').inputValue()), await d21.locator('.lv-ng-lydo').inputValue());
  const d22 = dong(page, '2026-10-22');
  check('22/10: có phép, được hoàn',
    await d22.locator('.lv-ng-phep').isChecked() && await d22.locator('.lv-ng-hoan').inputValue() === 'co');
  const d24 = dong(page, '2026-10-24');
  check('24/10 (Thứ Bảy): không hoàn, lý do Thứ Bảy/Chủ Nhật',
    await d24.locator('.lv-ng-hoan').inputValue() === 'khong'
      && /Thứ Bảy\/Chủ Nhật/.test(await d24.locator('.lv-ng-lydo').inputValue()));
  check('dòng tổng: Hoàn tiền ăn 2 ngày', (await page.locator('#lv-tong-hoan').innerText()).includes('Hoàn tiền ăn 2 ngày'),
    await page.locator('#lv-tong-hoan').innerText());

  const d23 = dong(page, '2026-10-23');
  await d23.locator('.lv-ng-phep').uncheck();
  check('bỏ tích 23/10 → ô hoàn tự về "không hoàn" và khoá',
    await d23.locator('.lv-ng-hoan').inputValue() === 'khong' && await d23.locator('.lv-ng-hoan').isDisabled());
  check('dòng tổng đếm lại: 1 ngày', (await page.locator('#lv-tong-hoan').innerText()).includes('1 ngày'));
  await d23.locator('.lv-ng-phep').check();
  await d23.locator('.lv-ng-hoan').selectOption('co');
  check('tích lại và chọn hoàn → 2 ngày', (await page.locator('#lv-tong-hoan').innerText()).includes('2 ngày'));

  await page.fill('#lv-hoan-ghichu', 'GHI CHU NOI BO bep cat suat');
  await page.fill('#lv-review-note', 'Chúc con mau khoẻ!');
  await page.locator('button', { hasText: 'Duyệt đơn' }).click();
  await page.waitForTimeout(1500);

  const l = ((await goiApi('/api/leave', null, ckQT)).data || []).find(x => x.id === DON);
  check('máy chủ lưu 4 dòng, hoàn 2 ngày', l?.theoNgay?.length === 4 && l?.hoanTien?.soNgay === 2, l?.hoanTien);
  const dd = new Map(((await goiApi('/api/attendance?studentId=s1&month=2026-10', null, ckPH)).data || []).map(r => [r.date, r.status]));
  check('sổ điểm danh tự có dòng: 21 không phép, 22 có phép',
    dd.get('2026-10-21') === 'absent_unexcused' && dd.get('2026-10-22') === 'absent_excused', Object.fromEntries(dd));

  // ---- Sửa từng ngày sau khi duyệt ----
  await moMan(page, '#/leave');
  const nutSua = page.locator(`[data-sua-ngay="${DON}"]`);
  check('lịch sử có nút "Sửa từng ngày"', await nutSua.count() === 1);
  await nutSua.click();
  await page.waitForSelector('.lv-ngay', { timeout: 5000 });
  check('hộp sửa điền đúng dòng đã lưu (22/10 có phép)', await dong(page, '2026-10-22').locator('.lv-ng-phep').isChecked());
  await dong(page, '2026-10-22').locator('.lv-ng-phep').uncheck();
  await page.locator('#lv-luu-ngay').click();
  await page.waitForTimeout(1500);
  const l2 = ((await goiApi('/api/leave', null, ckQT)).data || []).find(x => x.id === DON);
  check('lưu xong: còn hoàn 1 ngày', l2?.hoanTien?.soNgay === 1, l2?.hoanTien);
  check('ghi chú nội bộ giữ nguyên khi sửa', /GHI CHU NOI BO/.test(l2?.hoanTien?.ghiChu || ''), l2?.hoanTien);

  // ---- D5: lối vào lịch nghỉ từ màn Điểm danh của văn phòng ----
  await moMan(page, '#/attendance');
  const loi = page.locator('#att-lich-nghi');
  check('màn Điểm danh của văn phòng có liên kết "Lịch nghỉ của trường"',
    await loi.count() === 1 && /Lịch nghỉ của trường/.test(await loi.innerText()));
  await loi.click();
  await page.waitForTimeout(1500);
  check('bấm vào → tới #/leave/lich-nghi và thấy phần Lịch nghỉ của trường',
    (await page.evaluate(() => location.hash)) === '#/leave/lich-nghi' && await page.locator('#lich-nghi-truong').count() === 1);
  await page.context().close();
}

// ===========================================================================
console.log('\n[2] Gia đình thấy kết quả từng ngày — chữ trung tính, không lộ ghi chú nội bộ');
{
  const page = await moTrang();
  await dangNhap(page, 'phuhuynh', '123456');
  await moMan(page, '#/leave');
  await page.locator(`.list-row.clickable[onclick*="${DON}"]`).click();
  await page.waitForSelector('#lv-ket-qua-ngay', { timeout: 5000 });
  const khoi = page.locator('#lv-ket-qua-ngay');
  const chu = await khoi.innerText();
  check('có phần "Kết quả từng ngày" với 4 ngày', /Kết quả từng ngày/.test(chu) && (chu.match(/Nghỉ (có|không) phép/g) || []).length === 4, chu);
  check('thấy 21/10 nghỉ không phép kèm lý do', /Nghỉ không phép[^\n]*Gửi đơn sau 7 giờ sáng/.test(chu), chu);
  const mauDo = await khoi.evaluate((el) => [el, ...el.querySelectorAll('*')].some((x) => {
    const m = getComputedStyle(x).color.match(/\d+/g).map(Number);
    return m[0] > 180 && m[1] < 90 && m[2] < 90;
  }));
  check('không chữ nào tô đỏ', !mauDo);
  const tatCa = await page.evaluate(() => document.body.innerText);
  check('không lộ ghi chú nội bộ về tiền ăn', !/GHI CHU NOI BO/.test(tatCa));
  await page.context().close();
}

check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
