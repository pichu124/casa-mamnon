// Bài giao diện KHO THỰC ĐƠN MẪU VÀ THỰC ĐƠN DỰ KIẾN (Đ260d), trên điện thoại 390px.
//
// Cần trình duyệt Playwright. Chạy bằng:  node test/thuc-don-mau-giao-dien.test.mjs
//
// Góp ý 18/11: bỏ "Chép tuần trước", thay bằng tab Kho thực đơn mẫu và tab Thực
// đơn dự kiến. Bài đi đúng đường văn phòng sẽ đi: tạo mẫu, gõ món, lưu; đặt
// lịch; mở một tuần từ danh sách dự kiến và thấy món kèm nhãn mẫu; sửa riêng
// một ngày. Gia đình thấy món, không thấy tab nào, không có ô nhập nào. Mỗi màn
// đều được đo: không tràn ngang trên điện thoại.
import { chromium } from 'playwright';
import path from 'path';
import Database from 'better-sqlite3';
import { dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, CHROMIUM, tatBannerMoiCai, HOM_NAY } from './_chung.mjs';

const congNgay = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const lech = (s) => (new Date(`${s}T00:00:00Z`).getUTCDay() + 6) % 7;
const T2 = congNgay(HOM_NAY(), -lech(HOM_NAY()));
const TUAN_SAU = congNgay(T2, 7);

const DIR = thuMucTam('thuc-don-mau-giao-dien');
sinhDuLieu(DIR);
{
  // Dữ liệu mẫu có sẵn thực đơn dùng chung tuần sau; bỏ đi để tuần sau lấy từ
  // thực đơn mẫu (dòng thật dùng chung đứng trước mẫu dùng chung).
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM menus WHERE date >= ?').run(TUAN_SAU);
  c.close();
}
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 5262), dir: DIR });
{
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hieutruong', password: mkTam }),
  });
  const ck = r.headers.get('set-cookie').split(';')[0];
  await fetch(BASE + '/api/auth/set-new-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ newPassword: 'quantri2026' }),
  });
}

const { check, tongKet } = taoBoDem();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const thongBao = [];
page.on('dialog', d => d.accept());

async function dangNhap(u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const khongTranNgang = () => page.evaluate(() => {
  const w = window.innerWidth;
  const lo = [...document.querySelectorAll('#view *')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.right > w + 1 && !e.closest('.seg');
  }).map(e => `${e.tagName}.${e.className}`).slice(0, 5);
  return { ok: document.documentElement.scrollWidth <= w + 1 && !lo.length, rong: document.documentElement.scrollWidth, lo };
});
const toastCuoi = async () => {
  await page.waitForSelector('.toast', { timeout: 5000 }).catch(() => {});
  const t = await page.locator('.toast').allInnerTexts();
  thongBao.push(...t);
  return t.join(' | ');
};

try {
  console.log('\n[1] Quản trị: ba tab, không còn "Chép tuần trước"');
  await dangNhap('hieutruong', 'quantri2026');
  await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
  await page.waitForSelector('#menu-tab-seg', { timeout: 8000 });
  const tab = await page.locator('#menu-tab-seg button').allInnerTexts();
  check('có ba tab Thực đơn tuần | Kho thực đơn mẫu | Thực đơn dự kiến',
    tab.join('|') === 'Thực đơn tuần|Kho thực đơn mẫu|Thực đơn dự kiến', tab);
  check('không còn nút Chép tuần trước', await page.locator('#btn-chep-tuan').count() === 0);
  check('tab tuần vẫn có Soạn cả tuần và tệp Excel', await page.locator('#btn-soan-tuan').count() === 1 && await page.locator('#mn-xl-tai').count() === 1);
  let tn = await khongTranNgang();
  check('tab Thực đơn tuần không tràn ngang ở 390px', tn.ok, tn);

  console.log('\n[2] Kho thực đơn mẫu: thêm mẫu, gõ món, lưu');
  await page.click('#menu-tab-seg [data-tab="kho"]');
  await page.waitForSelector('#mn-mau-them', { timeout: 8000 });
  tn = await khongTranNgang();
  check('kho trống không tràn ngang', tn.ok, tn);
  await page.click('#mn-mau-them');
  await page.waitForSelector('#tt-mon-0-2', { timeout: 8000 });
  const tieuDe = await page.locator('#menu-kho .luoi-tuan .card-title').allInnerTexts();
  check('màn soạn mẫu: năm ngày Thứ Hai → Thứ Sáu, không ghi ngày tháng',
    tieuDe.length === 5 && /^Thứ Hai/.test(tieuDe[0]) && !/\d{2}\/\d{2}/.test(tieuDe.join(' ')), tieuDe);
  tn = await khongTranNgang();
  check('màn soạn mẫu không tràn ngang', tn.ok, tn);
  for (let i = 0; i < 5; i++) await page.fill(`#tt-mon-${i}-2`, `Cơm mẫu GD T${i + 2}\nCanh bí`);
  await page.click('#td-luu-tuan');
  await page.waitForSelector('[data-the-mau]', { timeout: 8000 });
  check('lưu xong báo đã lưu', /Đã lưu Thực đơn 1/.test(await toastCuoi()), thongBao);
  const the = await page.locator('[data-the-mau]').innerText();
  check('kho hiện Thực đơn 1, có món cả năm ngày', /Thực đơn 1/.test(the) && /Thứ Hai, Thứ Ba, Thứ Tư, Thứ Năm, Thứ Sáu/.test(the), the);
  check('mỗi mẫu có Sửa món / Đổi tên / Tải Excel / Nạp Excel',
    await page.locator('[data-sua-mau]').count() === 1 && await page.locator('[data-doi-ten]').count() === 1
    && await page.locator('[data-tai-mau]').count() === 1 && await page.locator('[data-nap-mau]').count() === 1);
  tn = await khongTranNgang();
  check('danh sách kho không tràn ngang', tn.ok, tn);

  console.log('\n[3] Thực đơn dự kiến: đặt lịch từ tuần sau');
  await page.click('#menu-tab-seg [data-tab="dukien"]');
  await page.waitForSelector('#mn-lich-luu', { timeout: 8000 });
  await page.fill('#mn-lich-tu', TUAN_SAU);
  await page.fill('#mn-lich-den', congNgay(TUAN_SAU, 4 * 7 + 4));
  check('thứ tự dùng có sẵn mẫu trong kho', await page.locator('[data-thu-tu]').count() === 1);
  tn = await khongTranNgang();
  check('form đặt lịch không tràn ngang', tn.ok, tn);
  await page.click('#mn-lich-luu');
  await page.waitForSelector('[data-huy-doan]', { timeout: 8000 });
  const doan = await page.locator('#menu-dukien').innerText();
  check('hiện đoạn lịch vừa đặt', doan.includes(`${TUAN_SAU.slice(8, 10)}/${TUAN_SAU.slice(5, 7)}/${TUAN_SAU.slice(0, 4)}`) && /Thực đơn 1 → quay lại/.test(doan), doan.slice(0, 400));
  const dong = await page.locator(`[data-mo-tuan="${TUAN_SAU}"]`).innerText();
  check('12 tuần tới: tuần sau dùng Thực đơn 1', /Thực đơn 1/.test(dong), dong);
  check('đủ 12 tuần', await page.locator('[data-mo-tuan]').count() === 12);
  tn = await khongTranNgang();
  check('màn dự kiến không tràn ngang', tn.ok, tn);

  console.log('\n[4] Bấm một tuần: tab tuần hiện món kèm nhãn mẫu; sửa riêng một ngày');
  await page.click(`[data-mo-tuan="${TUAN_SAU}"]`);
  await page.waitForSelector('#menu-tuan-chon', { timeout: 8000 });
  await page.waitForSelector('#menu-days .card', { timeout: 8000 });
  const manTuan = await page.locator('#menu-days').innerText();
  check('tuần mở từ dự kiến có món của mẫu', /Cơm mẫu GD T2/.test(manTuan) && /Cơm mẫu GD T6/.test(manTuan), manTuan.slice(0, 300));
  check('mỗi ngày có nhãn "Thực đơn mẫu 1"', await page.locator('#menu-days .badge', { hasText: 'Thực đơn mẫu 1' }).count() === 5);
  tn = await khongTranNgang();
  check('tab tuần (mở từ dự kiến) không tràn ngang', tn.ok, tn);
  await page.click('#btn-soan-tuan');
  await page.waitForSelector('#tt-mon-0-2', { timeout: 8000 });
  check('soạn cả tuần điền sẵn món của mẫu', (await page.inputValue('#tt-mon-0-2')).startsWith('Cơm mẫu GD T2'));
  await page.fill('#tt-mon-0-2', 'Hết táo — đổi sang lê');
  await page.click('#td-luu-tuan');
  const t = await toastCuoi();
  check('lưu: 1 ngày sửa riêng, 4 ngày giống mẫu', /Đã lưu thực đơn cho 1 ngày/.test(t) && /4 ngày giống thực đơn mẫu/.test(t), t);
  await page.waitForSelector('#menu-days .card', { timeout: 8000 });
  check('ngày sửa riêng mất nhãn mẫu, bốn ngày còn lại giữ',
    await page.locator('#menu-days .badge', { hasText: 'Thực đơn mẫu 1' }).count() === 4
    && /Hết táo — đổi sang lê/.test(await page.locator('#menu-days').innerText()));

  console.log('\n[5] Gia đình: thấy món, không tab, không ô nhập');
  await page.evaluate(() => App.logout());
  await page.waitForTimeout(600);
  await dangNhap('phuhuynh', '123456');
  await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
  await page.waitForSelector('#menu-seg', { timeout: 8000 });
  await page.click('#menu-seg button:nth-child(2)');
  await page.click('#menu-ngay-seg [data-ngay="tuan"]');
  await page.waitForTimeout(900);
  const manPh = await page.locator('#view').innerText();
  check('gia đình thấy món tuần sau lấy từ mẫu', /Cơm mẫu GD T3/.test(manPh) && /Hết táo — đổi sang lê/.test(manPh), manPh.slice(0, 300));
  check('gia đình không có tab kho / dự kiến', await page.locator('#menu-tab-seg').count() === 0);
  check('gia đình không thấy nhãn mẫu', await page.locator('#view .badge', { hasText: 'Thực đơn mẫu' }).count() === 0);
  check('gia đình không có ô nhập nào', await page.locator('#view input, #view textarea, #view select').count() === 0);
  check('gia đình không có nút soạn/sửa', await page.locator('#view .head-action').count() === 0);
  tn = await khongTranNgang();
  check('màn gia đình không tràn ngang', tn.ok, tn);

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  dung();
  donThuMucTam(DIR);
}
tongKet();
