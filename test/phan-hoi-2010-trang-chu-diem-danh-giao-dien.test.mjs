// Góp ý của trường 20/10 — Đ241f: TRANG CHỦ và ĐIỂM DANH gọn lại (A1, A2, D1, D2).
//
// Cần Playwright. Chạy bằng:
//   node test/phan-hoi-2010-trang-chu-diem-danh-giao-dien.test.mjs
//
//   A1. Ô "Nhân sự & chấm công" KHÔNG hiện trên lưới trang chủ, nhưng phân hệ
//       VẪN BẬT (giờ chụp cổng của cô chép sang bảng công) và vẫn có lối vào
//       ở Cài đặt cho cả văn phòng lẫn cô ("Hồ sơ của tôi"). Cờ đi qua đúng
//       đường nạp phân hệ: `anKhoiTrangChu` trong module.json, máy chủ truyền
//       qua /api/modules, phân hệ không khai thì hiện như cũ.
//       Ô "Đón trả bé" không làm bằng mã: phân hệ mặc định tắt, trường tắt ở
//       Quản trị → Tính năng.
//   A2. "Hôm nay theo cơ sở": mỗi cơ sở một khối gập, mặc định GẬP (cả trên
//       điện thoại lẫn máy tính); chỉ một cơ sở thì mở sẵn.
//   D1. Màn Điểm danh của văn phòng: "Cần gọi xác nhận: N bé" là khối gập,
//       mặc định gập, tiêu đề vẫn có số bé.
//   D2. Không còn thẻ "Mở Đón trả bé" ở màn Điểm danh của văn phòng và của
//       gia đình — kể cả khi phân hệ Đón trả bé đang bật.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  GOC, dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-trang-chu-diem-danh');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['dontra']);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4937), dir: DIR });

const goiApi = async (duong, body, cookie) => {
  const r = await fetch(sv.BASE + duong, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, await dnApi('htruong', mkTam));
const ckQT = await dnApi('htruong', 'quantri2026');
const ckGV = await dnApi('giaovien', '123456');

// ===========================================================================
console.log('\n[A1-máy chủ] Cờ anKhoiTrangChu đi qua /api/modules');
{
  const ds = (await goiApi('/api/modules', null, ckQT)).data || [];
  const ns = ds.find(m => m.key === 'nhansu');
  check('văn phòng: phân hệ Nhân sự VẪN có trong danh sách đang bật', !!ns, ds.map(m => m.key));
  check('…và mang cờ anKhoiTrangChu: true', !!ns && ns.anKhoiTrangChu === true, ns);
  const khac = ds.filter(m => m.key !== 'nhansu' && m.anKhoiTrangChu !== false);
  check('mọi phân hệ không khai cờ → anKhoiTrangChu: false (hiện như cũ)', khac.length === 0, khac.map(m => m.key));
  const dsCo = (await goiApi('/api/modules', null, ckGV)).data || [];
  check('cô: Nhân sự vẫn bật (phần "Hồ sơ của tôi")', dsCo.some(m => m.key === 'nhansu' && m.anKhoiTrangChu === true));
  const meta = JSON.parse(fs.readFileSync(path.join(GOC, 'modules', 'dontra', 'module.json'), 'utf8'));
  check('Đón trả bé mặc định TẮT (defaultEnabled: false) — trường tắt ở Quản trị → Tính năng', meta.defaultEnabled === false, meta.defaultEnabled);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];
async function moTrang(viewport = { width: 390, height: 844 }, them = {}) {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, ...them,
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
const chu = (page) => page.evaluate(() => document.getElementById('view').innerText);

// ===========================================================================
console.log('\n[A1] Không còn ô Nhân sự trên trang chủ, vẫn vào được từ Cài đặt');
for (const [ten, u, p, tieuDe] of [
  ['văn phòng', 'htruong', 'quantri2026', 'Nhân sự & chấm công'],
  ['cô', 'giaovien', '123456', 'Hồ sơ của tôi'],
]) {
  const page = await moTrang();
  await dangNhap(page, u, p);
  await page.waitForTimeout(800);
  const nhan = await page.locator('.tile-label').allInnerTexts();
  check(`${ten}: lưới trang chủ KHÔNG có ô "Nhân sự & chấm công"`,
    !nhan.includes('Nhân sự & chấm công') && await page.locator('.tile[data-tile-key="nhansu"]').count() === 0, nhan);
  check(`${ten}: lưới vẫn còn các ô khác`, nhan.length >= 5, nhan);
  check(`${ten}: phân hệ Nhân sự vẫn bật trên máy`, await page.evaluate(() => App.moduleEnabled('nhansu')));
  if (u === 'htruong') check('văn phòng: ô "Đón trả bé" vẫn hiện khi trường bật phân hệ ấy', nhan.includes('Đón trả bé'), nhan);
  await moMan(page, '#/settings');
  const loi = page.locator('#view [onclick*="#/nhansu"]');
  check(`${ten}: Cài đặt có lối vào "Nhân sự & chấm công"`,
    await loi.count() === 1 && /Nhân sự & chấm công/.test(await loi.innerText()), await chu(page));
  if (await loi.count() === 1) {
    await loi.click();
    await page.waitForTimeout(1500);
    const man = await chu(page);
    check(`${ten}: bấm lối vào → #/nhansu, mở màn "${tieuDe}"`,
      (await page.evaluate(() => location.hash)) === '#/nhansu' && man.includes(tieuDe), man.slice(0, 200));
  }
  await page.context().close();
}

// ===========================================================================
console.log('\n[A2] Hôm nay theo cơ sở: mỗi cơ sở một khối gập');
for (const [ten, viewport] of [['điện thoại', { width: 390, height: 844 }], ['máy tính', { width: 1280, height: 860 }]]) {
  const page = await moTrang(viewport);
  await dangNhap(page, 'htruong', 'quantri2026');
  await page.waitForSelector('#tq-panel', { timeout: 8000 });
  const soKhoi = await page.locator('#tq-panel details.tq-coso').count();
  check(`${ten}: mỗi cơ sở là một khối <details> (≥ 2 cơ sở)`, soKhoi >= 2, soKhoi);
  check(`${ten}: mặc định GẬP hết`, await page.locator('#tq-panel details.tq-coso[open]').count() === 0,
    await page.locator('#tq-panel details.tq-coso[open]').count());
  const tieuDe = await page.locator('#tq-panel details.tq-coso > summary').allInnerTexts();
  check(`${ten}: tiêu đề khối vẫn có tên cơ sở và số bé · số nhóm`,
    tieuDe.some(t => /Cơ sở 1/.test(t) && /\d+ bé · \d+ nhóm/.test(t)), tieuDe);
  const nhom = page.locator('.tq-nhom', { hasText: 'Chồi 2' }).first();
  check(`${ten}: lúc gập, dòng nhóm Chồi 2 chưa hiện`, !(await nhom.isVisible()));
  await page.locator('#tq-panel details.tq-coso > summary', { hasText: 'Cơ sở 1' }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  check(`${ten}: bấm "Cơ sở 1" → mở ra, thấy nhóm Chồi 2`, await nhom.isVisible());
  await nhom.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(`${ten}: bấm nhóm vẫn tới màn nhóm`, (await page.evaluate(() => location.hash)) === '#/dashboard/nhom/c1');
  if (ten === 'điện thoại') {
    const motCoSo = await page.evaluate(() => App.views.dashboard.theTongQuan({
      ngay: '2026-10-20', tong: { soBe: 3, soNhom: 1 },
      coSo: [{ id: 'cs1', name: 'Cơ sở duy nhất', dem: { soBe: 3 }, nhom: [{ id: 'c1', name: 'Chồi 2', soBe: 3, coMat: 1 }] }],
      khongCoSo: [], phanHe: {},
    }));
    check('chỉ MỘT cơ sở thì khối mở sẵn', /<details class="tq-coso"[^>]*\sopen/.test(motCoSo), motCoSo.slice(0, 300));
  }
  await page.context().close();
}

// ===========================================================================
console.log('\n[D1 + D2] Màn Điểm danh của văn phòng');
{
  // Chặn service worker: yêu cầu đi qua nó thì `page.route` không thấy.
  const page = await moTrang(undefined, { serviceWorkers: 'block' });
  // Bảng rà soát chỉ có danh sách sau mốc giờ (máy chủ ép rỗng trước đó). Để
  // bài không đỏ/xanh theo giờ chạy, dựng sẵn câu trả lời "đã qua giờ, 2 bé
  // cần gọi" trên chính câu trả lời thật của máy chủ.
  await page.route('**/api/attendance/ra-soat**', async (route) => {
    const r = await route.fetch();
    const d = await r.json();
    await route.fulfill({
      response: r,
      json: {
        ...d,
        quaGio: true,
        danhSach: [
          { studentId: 's1', hoTen: 'Bé Thử Một', classId: 'c1', avatar: '' },
          { studentId: 's2', hoTen: 'Bé Thử Hai', classId: 'c1', avatar: '' },
        ],
      },
    });
  });
  await dangNhap(page, 'htruong', 'quantri2026');
  check('(đối chứng) phân hệ Đón trả bé đang BẬT với văn phòng', await page.evaluate(() => App.moduleEnabled('dontra')));
  await moMan(page, '#/attendance');
  const khoi = page.locator('#att-can-goi');
  check('D1: "Cần gọi xác nhận" là một khối <details>', await khoi.count() === 1
    && await khoi.evaluate(e => e.tagName) === 'DETAILS');
  check('D1: mặc định GẬP', await khoi.count() === 1 && !(await khoi.evaluate(e => e.open)));
  const tieuDe = await khoi.locator('summary').innerText().catch(() => '');
  check('D1: tiêu đề vẫn ghi số bé', /Cần gọi xác nhận: 2 bé/.test(tieuDe), tieuDe);
  const nutGoi = page.locator('[data-goi-be]').first();
  check('D1: lúc gập, danh sách và nút Gọi chưa hiện', await nutGoi.count() === 1 && !(await nutGoi.isVisible()));
  await khoi.locator('summary').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  check('D1: bấm tiêu đề → mở danh sách, thấy nút Gọi', await nutGoi.isVisible().catch(() => false));
  check('D1: trong danh sách có tên bé', (await chu(page)).includes('Bé Thử Một'));
  const man = await chu(page);
  check('D2: văn phòng KHÔNG còn thẻ "Mở Đón trả bé"', !/Mở Đón trả bé/.test(man), man.slice(-400));
  check('D2: văn phòng KHÔNG còn dòng "Sổ trả bé … ở phần Đón trả bé"', !/xem theo từng nhóm ở phần Đón trả bé/.test(man));
  check('D2: không nút nào trỏ sang #/dontra trên màn Điểm danh',
    await page.locator('#view [onclick*="#/dontra"]').count() === 0);
  await page.context().close();
}

// ===========================================================================
console.log('\n[D2] Màn Điểm danh của gia đình');
{
  const page = await moTrang();
  await dangNhap(page, 'phuhuynh', '123456');
  check('(đối chứng) phân hệ Đón trả bé đang BẬT với gia đình', await page.evaluate(() => App.moduleEnabled('dontra')));
  await moMan(page, '#/attendance');
  const man = await chu(page);
  check('(đối chứng) màn Điểm danh của gia đình đã dựng', /Lịch điểm danh của con/.test(man), man.slice(0, 200));
  check('D2: gia đình KHÔNG còn thẻ "Mở Đón trả bé"', !/Mở Đón trả bé/.test(man), man.slice(-400));
  check('D2: gia đình KHÔNG còn dòng "gia đình khai ở phần Đón trả bé"', !/khai ở phần Đón trả bé/.test(man));
  check('D2: không nút nào trỏ sang #/dontra trên màn Điểm danh',
    await page.locator('#view [onclick*="#/dontra"]').count() === 0);
  check('ô "Đón trả bé" vẫn còn trên trang chủ của gia đình (phân hệ giữ nguyên)', await page.evaluate(() =>
    (App.state.modules || []).some(m => m.key === 'dontra')));
  await page.context().close();
}

check('không lỗi JavaScript trên mọi màn', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
