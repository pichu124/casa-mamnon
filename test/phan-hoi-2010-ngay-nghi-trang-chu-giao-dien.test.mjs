// Ngày trường nghỉ trên TRANG CHỦ CỦA CÔ — màn hình thật, trình duyệt thật.
//
// Cần Playwright. Chạy bằng:
//   node test/phan-hoi-2010-ngay-nghi-trang-chu-giao-dien.test.mjs
//
// Ngày thường: nút việc "Điểm danh" nhắc "còn N bé". Ngày cơ sở của nhóm nghỉ
// theo lịch của trường: nút ấy nói "Hôm nay trường nghỉ: <tên>" (trung tính,
// không tô như việc còn dở), không có ô "Chưa điểm danh", và màn một nhóm
// không gắn nhãn "Chưa điểm danh" cho bé nào.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, taoReq, taoLogin, CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ngay-nghi-trang-chu-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const NGAY = HOM_NAY();
{
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM attendance WHERE date = ?').run(NGAY);
  c.close();
}
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7212), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const VP = await (async () => {
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login('hieutruong', 'quantri2026')).cookie;
})();

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];
const ctx = await tatBannerMoiCai(await browser.newContext({ viewport: { width: 390, height: 844 } }));
const page = await ctx.newPage();
page.on('pageerror', e => loiJs.push(e.message));
await page.goto(sv.BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('#lg-user', { timeout: 8000 });
await page.fill('#lg-user', 'giaovien');
await page.fill('#lg-pass', '123456');
await page.click('button[type=submit]');
await page.waitForSelector('#hn-panel', { timeout: 8000 });
const nutDiemDanh = () => page.locator('#hn-panel .viec-nut', { hasText: 'Điểm danh' }).first();
const dem = () => page.locator('#hn-panel .dem-hang').innerText();

// ===========================================================================
console.log('\n[1] Ngày thường: nút Điểm danh nhắc số bé còn lại');
{
  const chu = await nutDiemDanh().innerText();
  check('nút Điểm danh ghi "còn N bé"', /còn \d+ bé/.test(chu), chu);
  check('nút Điểm danh tô như việc còn dở', await nutDiemDanh().evaluate(e => e.classList.contains('con')));
  check('dãy số đếm có ô "Chưa điểm danh"', /Chưa điểm danh/.test(await dem()), await dem());
}

// ===========================================================================
console.log('\n[2] Cơ sở 1 nghỉ Tết: dòng trung tính thay cho lời nhắc');
{
  const r = await req('POST', '/api/leave/lich-nghi', {
    cookie: VP, body: { ten: 'Nghỉ Tết Nguyên đán', tuNgay: NGAY, denNgay: NGAY, loai: 'tet', campusId: 'cs1' },
  });
  check('văn phòng đặt được đợt nghỉ cho cơ sở 1', r.status === 201, r);
  await page.evaluate(() => App.views.dashboard.napHomNayCo());
  await page.waitForFunction(() => /trường nghỉ/.test(document.getElementById('hn-panel')?.innerText || ''),
    null, { timeout: 8000 }).catch(() => {});
  const chu = await nutDiemDanh().innerText();
  check('nút Điểm danh nói "Hôm nay trường nghỉ: Nghỉ Tết Nguyên đán"',
    /Hôm nay trường nghỉ: Nghỉ Tết Nguyên đán/.test(chu), chu);
  check('…không còn "còn N bé"', !/còn \d+ bé/.test(chu), chu);
  check('…không tô như việc còn dở', !(await nutDiemDanh().evaluate(e => e.classList.contains('con'))));
  check('dãy số đếm không có ô "Chưa điểm danh"', !/Chưa điểm danh/.test(await dem()), await dem());

  await page.evaluate(() => { location.hash = '#/dashboard/nhom/c1'; });
  await page.waitForTimeout(1500);
  const man = await page.evaluate(() => document.getElementById('view').innerText);
  check('màn một nhóm: bé chưa có dòng mang nhãn "Trường nghỉ"', /Trường nghỉ/.test(man), man.slice(0, 400));
  check('màn một nhóm: không bé nào bị ghi "Chưa điểm danh"', !/Chưa điểm danh/.test(man), man.slice(0, 400));
}

check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
