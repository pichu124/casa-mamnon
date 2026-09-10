// MỘT TAB HAI PHẦN — Lịch sinh hoạt có cả Kế hoạch giáo dục, trên trình duyệt
// thật (Đ148).
//
// Cần Playwright. Chạy bằng:  npm run test:lich-sinh-hoat-gop
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"bỏ newsletter: gộp phần kế hoạch giáo dục và lịch sinh
// hoạt vào 1 tab tên là Lịch sinh hoạt, trong đó có đủ 2 nội dung là Kế hoạch
// giáo dục và Lịch sinh hoạt"*.
//
// BỐN ĐIỀU MỘT BẢN GỘP LÀM VỘI DỄ HỎNG, canh ở [2] [4] [5] [6]:
//
//   1. GỘP MÀN, KHÔNG GỘP MÃ. `/api/plans` không đổi một chữ và `#/plans` vẫn
//      mở được — điện thoại đã cài app còn giữ liên kết cũ, và bảy bộ bài kiểm
//      thử khác đang gọi đường đó. Bỏ một đường dẫn đang có là đổi hành vi của
//      thứ đang chạy, đúng thứ Nguyên tắc số 1 cấm.
//   2. TẮT KẾ HOẠCH THÌ MÀN LỊCH SINH HOẠT TRỞ LẠI Y NHƯ TRƯỚC. Dải hai phần
//      biến mất — một dải tab chỉ có một nút là một dải tab nói dối — và ô Kế
//      hoạch KHÔNG quay lại trang chủ (nó đang tắt). Tắt LỊCH SINH HOẠT thì
//      ngược lại: ô Kế hoạch quay về trang chủ, vì chỗ gộp không còn.
//   3. VĂN PHÒNG MỞ ĐƯỢC PHẦN KẾ HOẠCH. Trước đợt này thì không: máy chủ CHO
//      quản trị soạn kế hoạch cho nhóm bất kỳ, nhưng màn hình đẩy mọi vai
//      không phải cô sang nhánh "bé đang chọn" — mà tài khoản văn phòng không
//      có bé nào. Việc gộp làm lỗi ấy lộ ra giữa màn văn phòng chắc chắn vào.
//   4. KHÔNG LỖI JAVASCRIPT, và không lộ tiếng tiểu học ra màn hình.
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('lich-sinh-hoat-gop');
sinhDuLieu(DIR);
batPhanHe(DIR, ['tkb', 'kehoach']);
const mkQT = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4196), dir: DIR });

const goiApi = async (duong, body, cookie, method) => {
  const r = await fetch(sv.BASE + duong, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;
const ckTam = await dnApi('htruong', mkQT);
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, ckTam);
const ckQT = await dnApi('htruong', 'quantri2026');
const batTat = (key, bat) => goiApi(`/api/admin/modules/${key}`, { enabled: bat }, ckQT, 'PUT');

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
let loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

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
const chu = () => page.locator('#view').innerText();
const dem = (sel) => page.locator(sel).count();
const oTrangChu = async (ten) => {
  await moMan('#/');
  return (await page.locator('.tile-grid').innerText()).includes(ten);
};
const XAU = /học sinh|lớp học\b|giáo viên bộ môn|điểm số|xếp hạng/i;

// ===========================================================================
console.log('\n[1] Cô: một tab tên Lịch sinh hoạt, bên trong hai phần');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/timetable');
  check('có dải hai phần', await dem('#tkb-phan [data-phan]') === 2, await dem('#tkb-phan [data-phan]'));
  const nhan = await page.locator('#tkb-phan [data-phan]').allInnerTexts();
  check('nhãn đúng hai nội dung trường yêu cầu',
    /Lịch sinh hoạt/.test(nhan[0] || '') && /Kế hoạch giáo dục/.test(nhan[1] || ''), nhan);
  check('mặc định đứng ở Lịch sinh hoạt',
    await page.locator('#tkb-phan [data-phan="lich"]').evaluate(el => el.classList.contains('active')));
  check('phần Lịch sinh hoạt vẫn có dải T2…T6 như trước', await dem('#tkb-seg button') === 5, await dem('#tkb-seg button'));
  check('ĐẦU TRANG CHỈ MỘT TÊN — "Lịch sinh hoạt", không hai tiêu đề chồng nhau',
    (await chu()).split('Kế hoạch giáo dục').length <= 2, (await chu()).slice(0, 120));
}

// ===========================================================================
console.log('\n[2] Bấm sang Kế hoạch giáo dục: đổi bằng ĐƯỜNG DẪN, có nội dung thật');
{
  await page.click('#tkb-phan [data-phan="kehoach"]');
  await page.waitForTimeout(1200);
  check('đường dẫn thành #/timetable/kehoach — nút Quay lại của điện thoại còn đúng',
    await page.evaluate(() => location.hash) === '#/timetable/kehoach');
  const man = await chu();
  check('vẫn đứng dưới tên Lịch sinh hoạt', /Lịch sinh hoạt/.test(man));
  check('nút Kế hoạch giáo dục đang sáng',
    await page.locator('#tkb-phan [data-phan="kehoach"]').evaluate(el => el.classList.contains('active')));
  check('CÓ NỘI DUNG KẾ HOẠCH THẬT, không phải ô trống',
    /Mục tiêu tháng/.test(man) && /Kế hoạch từng tuần/.test(man), man.slice(0, 300));
  check('cô phụ trách được mời soạn kế hoạch ngay tại đây', await dem('#btn-soan-kh-nhung') === 1);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs.slice(0, 3));
  check('không lộ tiếng tiểu học', !XAU.test(man), (man.match(XAU) || [])[0]);

  // Mở thẳng địa chỉ sâu, không đi qua nút — liên kết gửi cho nhau phải chạy.
  await moMan('#/timetable/kehoach');
  check('mở THẲNG #/timetable/kehoach cũng ra đúng phần Kế hoạch',
    /Mục tiêu tháng/.test(await chu()), (await chu()).slice(0, 160));
}

// ===========================================================================
console.log('\n[3] Ô Kế hoạch giáo dục gấp vào ô Lịch sinh hoạt trên trang chủ');
{
  check('trang chủ của cô KHÔNG còn ô "Kế hoạch giáo dục" riêng', !(await oTrangChu('Kế hoạch giáo dục')));
  check('nhưng vẫn có ô "Lịch sinh hoạt"', await oTrangChu('Lịch sinh hoạt'));

  // Địa chỉ cũ KHÔNG bị bỏ — chỉ thêm một dòng chỉ đường.
  await moMan('#/plans');
  const man = await chu();
  check('#/plans vẫn mở được, không phải màn "không mở được"',
    /Kế hoạch giáo dục/.test(man) && !/Chưa mở được|Không mở được/.test(man), man.slice(0, 160));
  check('và có dòng chỉ đường sang chỗ mới', await dem('#btn-ve-lich-sinh-hoat') === 1);
  await page.click('#btn-ve-lich-sinh-hoat');
  await page.waitForTimeout(1000);
  check('bấm vào là sang đúng phần Kế hoạch của Lịch sinh hoạt',
    await page.evaluate(() => location.hash) === '#/timetable/kehoach');
}

// ===========================================================================
console.log('\n[4] VĂN PHÒNG mở được phần Kế hoạch — trước Đ148 thì không');
{
  await dangNhap('htruong', 'quantri2026');
  loiJs = [];
  await moMan('#/timetable/kehoach');
  const man = await chu();
  check('văn phòng KHÔNG còn nhận câu "Chưa có bé nào liên kết với tài khoản này"',
    !/Chưa có bé nào liên kết/.test(man), man.slice(0, 200));
  check('mà thấy nội dung kế hoạch của một nhóm', /Mục tiêu tháng/.test(man), man.slice(0, 250));
  check('và được mời soạn kế hoạch', await dem('#btn-soan-kh-nhung') === 1);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs.slice(0, 3));
}

// ===========================================================================
console.log('\n[5] Gia đình: cũng một tab, và vẫn có thanh chọn bé');
{
  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/timetable/kehoach');
  const man = await chu();
  check('gia đình thấy dải hai phần', await dem('#tkb-phan [data-phan]') === 2);
  check('và đọc được kế hoạch của con', /Mục tiêu tháng/.test(man), man.slice(0, 250));
  check('CHỈ MỘT thanh chọn bé trên màn — màn ngoài vẽ, phần trong không vẽ lại',
    await dem('.student-bar') <= 1, await dem('.student-bar'));
  check('gia đình KHÔNG được mời soạn kế hoạch', await dem('#btn-soan-kh-nhung') === 0);
  check('trang chủ của gia đình cũng không còn ô riêng', !(await oTrangChu('Kế hoạch giáo dục')));
  check('không lỗi JavaScript', loiJs.length === 0, loiJs.slice(0, 3));
}

// ===========================================================================
console.log('\n[6] Tắt từng phân hệ — mỗi bên tắt thì bên kia trở lại y như trước');
{
  await batTat('kehoach', false);
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/timetable');
  check('TẮT Kế hoạch → màn Lịch sinh hoạt không còn dải hai phần', await dem('#tkb-phan [data-phan]') === 0);
  check('và vẫn chạy đủ như trước Đ148', await dem('#tkb-seg button') === 5);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs.slice(0, 3));
  await moMan('#/timetable/kehoach');
  check('mở địa chỉ phần đã tắt thì rơi về phần Lịch, không phải màn trắng',
    await dem('#tkb-seg button') === 5, await chu());
  check('ô Kế hoạch KHÔNG quay lại trang chủ — nó đang tắt', !(await oTrangChu('Kế hoạch giáo dục')));

  await batTat('kehoach', true);
  await batTat('tkb', false);
  await dangNhap('giaovien', '123456');
  loiJs = [];
  check('TẮT Lịch sinh hoạt → ô Kế hoạch giáo dục QUAY LẠI trang chủ', await oTrangChu('Kế hoạch giáo dục'));
  await moMan('#/plans');
  const man = await chu();
  check('và màn Kế hoạch riêng vẫn đầy đủ', /Mục tiêu tháng/.test(man), man.slice(0, 200));
  check('không còn dòng chỉ đường sang chỗ đã tắt', await dem('#btn-ve-lich-sinh-hoat') === 0);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs.slice(0, 3));
  await batTat('tkb', true);
}

await ctx.close();
await browser.close();
await sv.dung();
donThuMucTam(DIR);
tongKet('Lịch sinh hoạt gộp Kế hoạch giáo dục');
