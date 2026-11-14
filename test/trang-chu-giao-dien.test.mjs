// Bài canh TRANG CHỦ THEO VAI (Đ124) — trên trình duyệt thật.
//
// Chạy bằng:  npm run test:trang-chu-giao-dien   (cần Playwright)
//
// Ba điều phải thấy bằng mắt máy:
//   • Cô: bảng "Hôm nay ở nhóm" với đủ bé của nhóm, bấm bé ra hồ sơ, bấm "Xem
//     cả nhóm" ra màn nhóm.
//   • Văn phòng: cây cơ sở → nhóm thay cho ô chọn bé phẳng; bấm nhóm → màn
//     nhóm; bấm bé → Hồ sơ của bé với ô chọn theo cấp (optgroup Cơ sở › Nhóm).
//   • Gia đình: không có bảng của cô / văn phòng; từ Đ258 có trang chủ riêng
//     theo bản vẽ — phần đầu gọn, thẻ "Hôm nay của <tên bé>", dòng khảo sát
//     chờ trả lời, nhóm "Hằng ngày" và dòng "… mục khác" (mục [5]–[10]).
// Kèm: thông báo nói rõ gửi cho ai; không lỗi JavaScript nào trên bất kỳ màn.
//
// Ảnh chụp từng màn để người đọc nhìn được, không chỉ tin con số.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, batPhanHe, CHROMIUM, tatBannerMoiCai, MAU, HOM_NAY,
} from './_chung.mjs';

const DIR = thuMucTam('trang-chu-giao-dien');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['nhatky', 'thuchup']);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 4170), dir: DIR });

let pass = 0, fail = 0; const failures = [];
const check = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; failures.push(`${n} ${x !== undefined ? JSON.stringify(x).slice(0, 250) : ''}`); console.log('  ✗ ' + n, x ?? ''); }
};
const goiApi = async (duong, body, cookie) => {
  const r = await fetch(BASE + duong, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;

// Tài khoản quản trị: đổi mật khẩu tạm qua API cho nhanh.
const ckQT = await dnApi('htruong', mkTam);
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, ckQT);

// Hai thông báo mẫu để soi nhãn phạm vi.
const ckGv = await dnApi('giaovien', '123456');
await goiApi('/api/notifications', { title: 'Mai nhóm mình chơi với nước', body: 'Gửi thêm quần áo', category: 'Nhóm lớp', audience: 'class' }, ckGv);
const ckQT2 = await dnApi('htruong', 'quantri2026');
await goiApi('/api/notifications', { title: 'Nghỉ lễ Quốc khánh', body: 'Toàn trường nghỉ', category: 'Nhà trường', audience: 'all' }, ckQT2);

// Một bé của nhóm Chồi 2 đã vào lớp và đã về — để soi số "Đã về" đếm từ sổ
// điểm danh lõi (Đ227).
const chamS1 = await goiApi('/api/attendance/mark', { studentId: 's1', date: HOM_NAY(), status: 'present' }, ckGv);
// Giờ ra 23:59 chứ không phải một giờ chiều cố định (Đ253): ngày không có dòng
// mẫu thì giờ vào là lúc bài này chạy, và máy chủ nay từ chối giờ ra sớm hơn
// giờ vào — "16:45" làm bài này đỏ mỗi lần chạy cuối tuần sau 16h45.
const veS1 = await goiApi('/api/attendance/ra-ve', { studentId: 's1', date: HOM_NAY(), gio: '23:59' }, ckGv);
const soDaVe = ((await goiApi('/api/dashboard/hom-nay?classId=c1', null, ckGv)).data || { dem: {} }).dem.daVe;

const SHOT = path.join(thuMucTam('trang-chu-anh-chup'), '/');
fs.mkdirSync(SHOT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loi = [];
async function moTrang(viewport, them = {}) {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, ...them,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loi.push(e.message));
  return page;
}
async function dangNhap(page, u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const chu = (page) => page.evaluate(() => document.getElementById('view').innerText);
const vaiTrenBody = (page) => page.evaluate(() => document.body.dataset.vai || '');

// ===========================================================================
console.log('\n[1] Cô: bảng "Hôm nay ở nhóm" trên điện thoại');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'giaovien', '123456');
  check('body mang dấu vai = teacher', (await vaiTrenBody(page)) === 'teacher');
  await page.waitForSelector('#hn-panel', { timeout: 8000 });
  const t = await chu(page);
  check('có bảng "Hôm nay ở nhóm"', t.includes('Hôm nay ở nhóm'), t.slice(0, 200));
  const soChip = await page.locator('#hn-panel .be-chip').count();
  check(`đủ ${MAU.soBeNhomChoi2} bé của nhóm Chồi 2 thành chip`, soChip === MAU.soBeNhomChoi2, soChip);
  check('có dãy số đếm với tổng bé', t.includes(`bé ${MAU.soBeNhomChoi2}`), t.slice(0, 400));
  check('có nút việc Điểm danh, Ghi nhanh',
    (await page.locator('.viec-nut', { hasText: 'Điểm danh' }).count()) === 1
    && (await page.locator('.viec-nut', { hasText: 'Ghi nhanh' }).count()) === 1, t.slice(0, 500));
  // Đ252 gỡ mã phân hệ Đón trả bé. Nửa "ra về" của ngày nằm ở sổ điểm danh
  // lõi, và trang chủ đếm nó ở ô "Đã về".
  check('KHÔNG còn nút việc hay ô "Đón trả bé" (Đ252)',
    !(await page.locator('.viec-nut', { hasText: 'Đón trả bé' }).count())
    && !(await page.locator('.tile-label', { hasText: 'Đón trả bé' }).count()) && !/Đã đón về \d/.test(t), t.slice(0, 500));
  check('(đối chứng) cô ghi được một bé đã về qua sổ điểm danh',
    chamS1.status === 200 && veS1.status === 200 && soDaVe >= 1, [chamS1.status, veS1.status, soDaVe]);
  check('dãy số đếm có ô "Đã về" đúng bằng số bé có giờ ra về',
    (await page.locator('#hn-panel .dem-pill', { hasText: `Đã về ${soDaVe}` }).count()) === 1, t.slice(0, 500));
  check('bé đã về mang dấu 🏠 trên chip',
    (await page.locator('#hn-panel .be-chip', { hasText: '🏠' }).count()) === soDaVe,
    await page.locator('#hn-panel .be-chip', { hasText: '🏠' }).count());
  // Nhà trường 07/09: "Nhật ký ngày sẽ được tự động bỏ đi với các bạn không
  // phải lớp nhà trẻ." Chồi 2 không có bé nhà trẻ → không ô, không nút việc
  // (module.json `dieuKienHien` → /api/nhatky/pham-vi). Xem test/nhat-ky-bua.
  await page.waitForTimeout(600);
  check('KHÔNG có nút việc / ô "Nhật ký ngày" với cô nhóm toàn bé lớn (Đ141)',
    !(await page.locator('.viec-nut', { hasText: 'Nhật ký ngày' }).count())
    && !(await page.locator('.tile[data-tile-key="nhatky"]').count()), t.slice(0, 500));
  check('có dòng "Đã ghi nhật ký" (phân hệ đang bật)', t.includes('Đã ghi nhật ký'), t.slice(0, 500));
  check('lưới biểu tượng vẫn còn bên dưới', (await page.locator('.tile-label').count()) >= 8);
  // Đ258-P chỉ đổi trang chủ của GIA ĐÌNH. Cô giữ nguyên: lời chào cũ, bảng
  // hôm nay, mọi ô đều hiện — không thẻ, không dòng "mục khác" của gia đình.
  check('trang chủ của cô KHÔNG đổi theo Đ258-P: vẫn #hom-nay và lời chào cũ, không ô nào bị giấu',
    (await page.locator('#hom-nay').count()) === 1 && (await page.locator('.hero-greet').count()) === 1
    && t.includes('Cô phụ trách') && (await page.locator('#ph-hom-nay, #ph-them, #ph-khao-sat, .tile-phu').count()) === 0
    && (await page.locator('.tile:visible').count()) === (await page.locator('.tile').count()), t.slice(0, 200));
  await page.screenshot({ path: SHOT + 'co-trang-chu.png', fullPage: true });

  // Bấm một bé → hộp thoại hồ sơ.
  await page.locator('#hn-panel .be-chip').first().click();
  await page.waitForSelector('.modal', { timeout: 6000 });
  const modal = await page.evaluate(() => document.querySelector('.modal').innerText);
  check('bấm bé mở hồ sơ của bé', modal.includes('Hồ sơ của bé'), modal.slice(0, 120));
  await page.evaluate(() => UI.closeModal());

  // "Xem cả nhóm" → màn nhóm với danh sách.
  await page.locator('#hn-panel .hn-link').click();
  await page.waitForSelector('.list-row', { timeout: 6000 });
  const t2 = await chu(page);
  check('tới màn nhóm #/dashboard/nhom/c1', (await location(page)) === '#/dashboard/nhom/c1', await location(page));
  check('màn nhóm có tiêu đề nhóm', t2.includes('Nhóm Chồi 2'), t2.slice(0, 120));
  check(`màn nhóm liệt kê ${MAU.soBeNhomChoi2} bé`, (await page.locator('#view .card .list-row').count()) === MAU.soBeNhomChoi2);
  await page.screenshot({ path: SHOT + 'co-man-nhom.png', fullPage: true });
  await page.context().close();
}
function location(page) { return page.evaluate(() => window.location.hash); }

// ===========================================================================
console.log('\n[2] Văn phòng: cây cơ sở → nhóm → bé');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'htruong', 'quantri2026');
  check('body mang dấu vai = admin', (await vaiTrenBody(page)) === 'admin');
  await page.waitForSelector('#tq-panel', { timeout: 8000 });
  const t = await chu(page);
  check('có "Hôm nay theo cơ sở"', t.includes('Hôm nay theo cơ sở'), t.slice(0, 200));
  check('liệt kê cơ sở 1 và cơ sở 2', t.includes('Cơ sở 1') && t.includes('Cơ sở 2'));
  // Đ241f (góp ý 20/10, A2): mỗi cơ sở là một khối gập sẵn — innerText không
  // thấy phần gập, nên đếm nhóm bằng textContent.
  const tq = await page.locator('#tq-panel').textContent();
  check('liệt kê nhóm Chồi 2 và nhóm Mầm 1 (trống)', tq.includes('Chồi 2') && tq.includes('Mầm 1'));
  check('TRANG CHỦ KHÔNG còn ô chọn bé phẳng của cả trường', !t.includes('Đang xem hồ sơ của bé'));
  check('tổng bé và tổng nhóm ghi trên đầu', t.includes(`${MAU.soBe} bé`) && t.includes(`${MAU.soNhom} nhóm`), t.slice(0, 300));
  check('trang chủ của văn phòng KHÔNG đổi theo Đ258-P: vẫn #hom-nay và lời chào cũ, không ô nào bị giấu',
    (await page.locator('#hom-nay').count()) === 1 && (await page.locator('.hero-greet').count()) === 1
    && (await page.locator('#ph-hom-nay, #ph-them, #ph-khao-sat, .tile-phu').count()) === 0
    && (await page.locator('.tile:visible').count()) === (await page.locator('.tile').count()));
  await page.screenshot({ path: SHOT + 'vanphong-trang-chu.png', fullPage: true });

  // Bấm nhóm Chồi 2 → màn nhóm (mở khối Cơ sở 1 trước — gập sẵn từ Đ241f).
  await page.locator('#tq-panel details.tq-coso > summary', { hasText: 'Cơ sở 1' }).click();
  await page.locator('.tq-nhom', { hasText: 'Chồi 2' }).first().click();
  await page.waitForSelector('#view .card .list-row', { timeout: 6000 });
  check('tới màn nhóm', (await location(page)) === '#/dashboard/nhom/c1', await location(page));
  const t2 = await chu(page);
  check('màn nhóm ghi rõ nhóm · cơ sở', t2.includes('Chồi 2 · Cơ sở 1'), t2.slice(0, 200));
  check(`liệt kê ${MAU.soBeNhomChoi2} bé`, (await page.locator('#view .card .list-row').count()) === MAU.soBeNhomChoi2);

  // Bấm một bé → Hồ sơ của ĐÚNG bé ấy (#/student/<mã>), có nút tìm bé khác.
  // Góp ý 06/10 (mục 1): `#/student` trống là màn TÌM BÉ — ô gõ nhanh ở
  // trên, cây Cơ sở → Nhóm → Bé ở dưới — thay cho ô chọn 300 dòng.
  const tenBeBam = (await page.locator('#view .card .list-row .row-title').first().innerText()).trim();
  await page.locator('#view .card .list-row').first().click();
  await page.waitForSelector('#hs-tim-khac', { timeout: 6000 });
  check('tới hồ sơ của ĐÚNG bé vừa bấm', /^#\/student\/.+/.test(await location(page)) && (await chu(page)).includes(tenBeBam),
    { hash: await location(page), tenBeBam });
  check('hồ sơ có nút "Tìm bé khác"', await page.locator('#hs-tim-khac').count() === 1);
  await page.click('#hs-tim-khac');
  await page.waitForSelector('#hs-tim', { timeout: 6000 });
  check('bấm "Tìm bé khác" về màn tìm #/student', (await location(page)) === '#/student', await location(page));
  const cay = await page.locator('#hs-cay').textContent();   // cây đang gập: innerText không thấy phần gập
  check('cây gom theo cấp: Cơ sở → Nhóm', cay.includes('Cơ sở 1') && cay.includes('Chồi 2'), cay.slice(0, 200));
  const soBe = await page.locator('#hs-cay [data-mo-be]').count();
  check(`cây có đủ mọi bé của trường (${MAU.soBe})`, soBe === MAU.soBe, soBe);
  check('cây GẬP SẴN — không bày 300 dòng ra màn', await page.locator('#hs-cay details[open]').count() === 0);
  await page.fill('#hs-tim', 'bao an');
  await page.waitForTimeout(300);
  const kq = await page.locator('#hs-ket-qua').innerText();
  check('gõ "bao an" (không dấu) ra bé Nguyễn Bảo An', kq.includes('Nguyễn Bảo An'), kq.slice(0, 200));
  await page.screenshot({ path: SHOT + 'vanphong-ho-so-be.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[3] Văn phòng trên máy tính: cây cơ sở xếp thành cột');
{
  const page = await moTrang({ width: 1280, height: 860 });
  await dangNhap(page, 'htruong', 'quantri2026');
  await page.waitForSelector('#tq-panel', { timeout: 8000 });
  const rong = await page.evaluate(() => document.querySelector('#view').getBoundingClientRect().width);
  check('khung nội dung của văn phòng rộng hơn khung gia đình (>= 1000px)', rong >= 1000, rong);
  const cot = await page.evaluate(() => getComputedStyle(document.querySelector('.tq-luoi')).gridTemplateColumns.split(' ').length);
  check('các cơ sở xếp thành nhiều cột', cot >= 2, cot);
  await page.screenshot({ path: SHOT + 'vanphong-may-tinh.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[4] Gia đình: không có bảng của cô / văn phòng');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'phuhuynh', '123456');
  check('body mang dấu vai = parent', (await vaiTrenBody(page)) === 'parent');
  await page.waitForTimeout(600);
  check('KHÔNG có bảng hôm nay', (await page.locator('#hom-nay').count()) === 0);
  const t = await chu(page);
  check('không có chữ nào của bảng cô / văn phòng', !t.includes('Hôm nay ở nhóm') && !t.includes('Hôm nay theo cơ sở'));
  check('lưới biểu tượng đủ như trước', (await page.locator('.tile-label').count()) >= 10);

  // Thông báo nói rõ gửi cho ai.
  await page.goto(BASE + '/#/notifications', { waitUntil: 'networkidle' });
  await page.waitForSelector('.list-row', { timeout: 6000 });
  const tb = await chu(page);
  check('dòng thông báo nhóm ghi "Nhóm Chồi 2 · Cơ sở 1"', tb.includes('Nhóm Chồi 2 · Cơ sở 1'), tb.slice(0, 300));
  check('dòng thông báo toàn trường ghi "Toàn trường"', tb.includes('Toàn trường'), tb.slice(0, 300));
  await page.locator('.list-row', { hasText: 'Mai nhóm mình chơi với nước' }).first().click();
  await page.waitForSelector('.modal', { timeout: 6000 });
  const modal = await page.evaluate(() => document.querySelector('.modal').innerText);
  check('chi tiết có huy hiệu "Gửi nhóm Chồi 2 · Cơ sở 1"', modal.includes('Gửi nhóm Chồi 2 · Cơ sở 1'), modal.slice(0, 200));
  await page.screenshot({ path: SHOT + 'thong-bao-pham-vi.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
// Đ258-P — TRANG CHỦ CỦA GIA ĐÌNH THEO BẢN VẼ
// ===========================================================================
//
// Thẻ "Hôm nay của <tên bé>" được GHÉP Ở TRÌNH DUYỆT từ các đường API đã có,
// nên dữ liệu ở đây dựng qua chính các đường ấy: cô chụp ảnh con tới lớp kèm
// lời nhắn (có ký tự HTML, để soi việc bọc chữ), rồi ghi lời nhắn lúc về. Bé
// Nam (nhóm Lá 1) chưa có dòng điểm danh hôm nay.
//
// THỰC ĐƠN: máy chủ chỉ trả Thứ Hai → Thứ Sáu, nên bài chạy cuối tuần không có
// bữa trưa "hôm nay" nào. `gaThucDon` để lời gọi THẬT đi tới máy chủ rồi ghép
// thêm bữa của hôm nay vào câu trả lời — chạy ngày nào cũng soi được cùng một
// thứ, và vẫn bắt được trang hỏi sai đường hay sai cơ sở.
//
// Trang nào có `page.route` thì mở với `KHONG_SW`: yêu cầu đi qua service
// worker thì `page.route` không thấy (cùng cách với các bài giao diện khác).
const KHONG_SW = { serviceWorkers: 'block' };
const NGAY = HOM_NAY();
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAP5FBQXqWM+GAAAAAElFTkSuQmCC';
const GHI_VAO = 'Con hơi ho <img src=x onerror="window.__xss=1"> cô cho uống nước ấm';
const GHI_VE = 'Chiều con ăn hết suất';
const MON_TRUA = ['Cơm trắng', 'Canh bí đỏ <b>nấu</b> tôm'];
const goi = async (method, duong, body, cookie) => {
  const r = await fetch(BASE + duong, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const anhS1 = await goi('POST', '/api/attendance/anh',
  { studentId: 's1', date: NGAY, anh: `data:image/png;base64,${PNG_B64}`, yDinh: 'toi-lop', ghiChu: GHI_VAO }, ckGv);
const veS1b = await goi('POST', '/api/attendance/ra-ve', { studentId: 's1', date: NGAY, gio: '23:59', ghiChu: GHI_VE }, ckGv);
const ckPh = await dnApi('phuhuynh', '123456');
const dongHomNay = async (maBe) => (((await goi('GET', `/api/attendance?studentId=${maBe}&month=${NGAY.slice(0, 7)}`, null, ckPh)).data) || [])
  .find(r => r.date === NGAY) || null;
const dongS1 = (await dongHomNay('s1')) || {};
const dongS2 = await dongHomNay('s2');
const soKs = (((await goi('GET', '/api/dashboard/badges', null, ckPh)).data) || {}).khaosat || 0;

async function gaThucDon(page, nhatKy = []) {
  await page.route(/\/api\/menu\?/, async (route) => {
    nhatKy.push(route.request().url());
    const tra = await route.fetch();
    const d = await tra.json();
    d.menus = (d.menus || []).filter(m => m.date !== NGAY).concat([{
      date: NGAY,
      meals: [
        { type: 'breakfast', label: 'Bữa sáng', time: '08:00', items: ['Phở bò'] },
        { type: 'lunch', label: 'Bữa trưa', time: '11:20', items: MON_TRUA },
      ],
    }]);
    await route.fulfill({ response: tra, json: d });
  });
}
const cho = (page, sel, ms = 6000) => page.waitForSelector(sel, { timeout: ms }).then(() => true, () => false);
const chuO = (page, sel) => page.locator(sel).first().innerText({ timeout: 1500 }).catch(() => '');
const dem = (page, sel) => page.locator(sel).count();
const dongThe = (page) => page.locator('#ph-hom-nay [data-ph]').evaluateAll(els => els.map(e => e.dataset.ph));
const veLai = async (page, sel) => {
  await page.evaluate(() => App.route());
  await cho(page, sel);
};
// Màu TRUNG TÍNH: ba kênh gần nhau (xám, xám xanh) và kênh đỏ không trội.
// Đỏ #b91c1c lệch 157, cam #c2410c lệch 182; xám của bản vẽ lệch dưới 40.
const mauTrungTinh = (rgb) => {
  const so = (String(rgb).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  if (so.length < 3) return false;
  const [r, g, b] = so;
  return Math.max(r, g, b) - Math.min(r, g, b) <= 60 && r <= b + 10;
};
const mauCua = (page, sel) => page.evaluate((s) => {
  const dong = document.querySelector(s);
  if (!dong) return null;
  const lay = (el, thuoc) => (el ? getComputedStyle(el)[thuoc] : '');
  return {
    chu: lay(dong.querySelector('.ph-dong-ten'), 'color'),
    vien: lay(dong.querySelector('.ph-cham'), 'borderTopColor'),
    bieuTuong: lay(dong.querySelector('.ph-cham'), 'color'),
  };
}, sel);
const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date(`${NGAY}T00:00:00Z`).getUTCDay()];
const DDMM = `${NGAY.slice(8, 10)}/${NGAY.slice(5, 7)}`;
const O_HANG_NGAY = ['diemdanh', 'xinphep', 'thucdon', 'danthuoc', 'album'];

// ===========================================================================
console.log('\n[5] Gia đình: phần đầu gọn và thẻ "Hôm nay của <tên bé>"');
{
  const page = await moTrang({ width: 390, height: 844 }, KHONG_SW);
  const hoiThucDon = [];
  await gaThucDon(page, hoiThucDon);
  await dangNhap(page, 'phuhuynh', '123456');
  await cho(page, '#ph-hom-nay [data-ph]');
  check('(đối chứng) cô đã chụp ảnh bé An tới lớp kèm lời nhắn, đã ghi giờ về; bé Nam chưa có dòng điểm danh hôm nay',
    anhS1.status < 300 && veS1b.status === 200 && !!dongS1.checkIn && dongS1.checkOut === '23:59'
    && dongS1.note === GHI_VAO && !dongS2, { anh: anhS1.status, ve: veS1b.status, dongS1, dongS2 });

  check('trang chủ KHÔNG còn ô chọn năm học', (await dem(page, '#year-select')) === 0);
  const dau = await chuO(page, '.hero');
  check('phần đầu: tên trường và MỘT dòng chào theo buổi, không còn dòng "Phụ huynh bé …"',
    /Chào buổi (sáng|trưa|chiều|tối), chị Thu Hà/.test(dau) && dau.includes('Trường Mầm non') && !dau.includes('Phụ huynh bé')
    && (await dem(page, '.hero .student-chip')) === 2 && (await dem(page, '.hero .student-chip.active')) === 1, dau);

  const the = await chuO(page, '#ph-hom-nay');
  check('thẻ có tiêu đề "Hôm nay của Bảo An" kèm thứ và ngày dd/mm theo giờ Việt Nam',
    the.includes('Hôm nay của Bảo An') && the.includes(`${THU}, ${DDMM}`), the.slice(0, 200));
  const thuTu = await dongThe(page);
  check('các dòng đúng thứ tự: tới lớp → thực đơn bữa trưa → lời cô nhắn → ra về',
    JSON.stringify(thuTu) === JSON.stringify(['toi', 'thuc-don', 'loi-co', 'ra-ve']), thuTu);
  const toi = await chuO(page, '#ph-hom-nay [data-ph="toi"]');
  check('dòng Tới lớp ghi đúng giờ cô đã ghi', toi.includes('Tới lớp') && toi.includes(String(dongS1.checkIn)), toi);
  const td = await chuO(page, '#ph-hom-nay [data-ph="thuc-don"]');
  check('dòng thực đơn ghi các món BỮA TRƯA của hôm nay, không lẫn bữa khác',
    td.includes('Thực đơn bữa trưa') && td.includes(MON_TRUA[0]) && td.includes(MON_TRUA[1]) && !td.includes('Phở bò'), td);
  check('hỏi thực đơn của tuần này, đúng cơ sở của bé (cs1)',
    hoiThucDon.length > 0 && hoiThucDon.every(u => /week=0/.test(u) && /campusId=cs1/.test(u)), hoiThucDon);
  const ln = await chuO(page, '#ph-hom-nay [data-ph="loi-co"]');
  check('lời cô nhắn: đủ ghi chú lúc vào lớp và lúc về, đứng tên cô đã chấm',
    ln.includes('Cô Mai Anh nhắn') && ln.includes('Con hơi ho') && ln.includes(GHI_VE), ln);
  check('chữ cô gõ và tên món hiện ra là CHỮ, không thành thẻ HTML',
    ln.includes('<img src=x') && td.includes('<b>nấu</b>')
    && (await dem(page, '#ph-hom-nay img[src="x"], #ph-hom-nay [data-ph="thuc-don"] b')) === 0
    && (await page.evaluate(() => window.__xss)) === undefined, ln);
  const rv = await chuO(page, '#ph-hom-nay [data-ph="ra-ve"]');
  check('dòng Ra về ghi giờ về', rv.includes('Ra về') && rv.includes('23:59') && !rv.includes('Cô chưa ghi giờ về'), rv);
  const anh = await page.evaluate(() => {
    const a = document.querySelector('#ph-hom-nay [data-ph="toi"] a.ph-anh');
    const i = a && a.querySelector('img');
    return a ? { href: a.getAttribute('href'), rong: i ? i.naturalWidth : 0, alt: i ? i.alt : '', cao: a.getBoundingClientRect().height } : null;
  });
  check('ảnh tới lớp thu nhỏ nằm trên dòng, tải được, trỏ tới đúng hộp ngày của đúng bé',
    !!anh && anh.href === `#/attendance/${NGAY}/s1` && anh.rong > 0 && !!anh.alt && anh.cao >= 44, anh);
  const man = await chu(page);
  check('thẻ không có phần trăm; trang không chép ba câu app không có dữ liệu',
    the.length > 0 && !/%/.test(the) && !/đón con|Mất khoảng|Văn phòng sẽ gọi/.test(man), the);
  check('gia đình vẫn KHÔNG có bảng của cô (#hom-nay)', (await dem(page, '#hom-nay')) === 0);
  await page.screenshot({ path: SHOT + 'gia-dinh-trang-chu.png', fullPage: true });

  if (anh) {
    await page.locator('#ph-hom-nay a.ph-anh').click();
    await cho(page, '.modal');
    const hop = await chuO(page, '.modal');
    check('bấm ảnh → màn Điểm danh mở hộp của đúng ngày', hop.includes('Chi tiết điểm danh') && hop.includes(DDMM), hop.slice(0, 160));
    await page.evaluate(() => UI.closeModal());
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    await cho(page, '#ph-hom-nay [data-ph]');
  } else {
    check('bấm ảnh → màn Điểm danh mở hộp của đúng ngày', false, 'không có ảnh để bấm');
  }

  // ---- Đổi con: thẻ đổi theo, và bé chưa có dòng điểm danh ----
  await page.locator('.student-chip', { hasText: 'Bảo Nam' }).click();
  await page.waitForFunction(() => /Bảo Nam/.test((document.querySelector('#ph-hom-nay') || {}).innerText || '')
    && !!document.querySelector('#ph-hom-nay [data-ph]'), null, { timeout: 6000 }).catch(() => {});
  const the2 = await chuO(page, '#ph-hom-nay');
  const thuTu2 = await dongThe(page);
  check('đổi con thì thẻ đổi theo: "Hôm nay của Bảo Nam", không còn dòng nào của bé An',
    the2.includes('Hôm nay của Bảo Nam') && !the2.includes('Con hơi ho') && !thuTu2.includes('toi')
    && (await dem(page, '#ph-hom-nay a.ph-anh')) === 0, the2.slice(0, 200));
  check('chưa có dòng điểm danh → "Cô chưa điểm danh hôm nay", không có dòng Ra về',
    thuTu2[0] === 'chua' && the2.includes('Cô chưa điểm danh hôm nay') && !thuTu2.includes('ra-ve') && !the2.includes('Ra về'), thuTu2);
  const mauChua = await mauCua(page, '#ph-hom-nay [data-ph="chua"]');
  check('"chưa điểm danh" là chữ xám trung tính: không đỏ, không cam, không viền cảnh báo, không phần trăm (QUY TẮC 2, 4)',
    !!mauChua && mauTrungTinh(mauChua.chu) && mauTrungTinh(mauChua.vien) && mauTrungTinh(mauChua.bieuTuong) && !/%/.test(the2), mauChua);

  // ---- Hôm nay có trong lịch nghỉ của trường ----
  const dot = await goi('POST', '/api/leave/lich-nghi', { ten: 'Nghỉ lễ <i>thử</i>', tuNgay: NGAY, denNgay: NGAY }, ckQT2);
  await veLai(page, '#ph-hom-nay [data-ph="truong-nghi"]');
  const the3 = await chuO(page, '#ph-hom-nay');
  const thuTu3 = await dongThe(page);
  check('hôm nay trong lịch nghỉ → "Hôm nay trường nghỉ: <tên>", không nhắc điểm danh, không dòng Ra về, không thực đơn',
    dot.status === 201 && JSON.stringify(thuTu3) === JSON.stringify(['truong-nghi'])
    && the3.includes('Hôm nay trường nghỉ: Nghỉ lễ <i>thử</i>') && !the3.includes('Cô chưa điểm danh')
    && (await dem(page, '#ph-hom-nay [data-ph] i')) === 0, { ma: dot.status, thuTu3, the3 });
  const mauNghi = await mauCua(page, '#ph-hom-nay [data-ph="truong-nghi"]');
  check('dòng trường nghỉ cũng màu trung tính', !!mauNghi && mauTrungTinh(mauNghi.chu) && mauTrungTinh(mauNghi.vien), mauNghi);
  const xoaDot = dot.data && dot.data.dot ? await goi('DELETE', `/api/leave/lich-nghi/${dot.data.dot.id}`, null, ckQT2) : { status: 0 };

  // ---- Bé nghỉ ----
  const ckGv2 = await dnApi('giaovien2', '123456');
  for (const [trangThai, nhan] of [['absent_excused', 'Nghỉ có phép'], ['absent_unexcused', 'Nghỉ không phép']]) {
    const cham = await goi('POST', '/api/attendance/mark',
      { studentId: 's2', date: NGAY, status: trangThai, note: 'Gia đình báo con ở nhà' }, ckGv2);
    await page.evaluate(() => { const o = document.getElementById('ph-hom-nay'); if (o) o.dataset.cu = '1'; });
    await page.evaluate(() => App.route());
    await page.waitForFunction(() => {
      const o = document.getElementById('ph-hom-nay');
      return !!o && !o.dataset.cu && !!o.querySelector('[data-ph]');
    }, null, { timeout: 6000 }).catch(() => {});
    const the4 = await chuO(page, '#ph-hom-nay');
    const thuTu4 = await dongThe(page);
    const mauBeNghi = await mauCua(page, '#ph-hom-nay [data-ph="be-nghi"]');
    check(`bé nghỉ → đúng nhãn "${nhan}", màu trung tính, không dòng Ra về, ghi chú không bị gọi là lời cô nhắn`,
      xoaDot.status === 200 && cham.status === 200 && JSON.stringify(thuTu4) === JSON.stringify(['be-nghi', 'thuc-don'])
      && (await chuO(page, '#ph-hom-nay [data-ph="be-nghi"] .ph-dong-ten')) === nhan
      && the4.includes('Gia đình báo con ở nhà') && !the4.includes('nhắn') && !the4.includes('Ra về') && !/%/.test(the4)
      && !!mauBeNghi && mauTrungTinh(mauBeNghi.chu) && mauTrungTinh(mauBeNghi.vien) && mauTrungTinh(mauBeNghi.bieuTuong),
      { xoa: xoaDot.status, cham: cham.status, thuTu4, mauBeNghi, the4: the4.slice(0, 200) });
  }
  await page.screenshot({ path: SHOT + 'gia-dinh-be-nghi.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[6] Gia đình: dòng khảo sát, nhóm "Hằng ngày", dòng "… mục khác"');
{
  const page = await moTrang({ width: 390, height: 844 }, KHONG_SW);
  await dangNhap(page, 'phuhuynh', '123456');
  await cho(page, '#ph-them');
  await page.waitForTimeout(900);   // các ô có điều kiện hiện hỏi máy chủ xong

  check('(đối chứng) gia đình mẫu đang có khảo sát chờ trả lời', soKs >= 1, soKs);
  const ks = await page.evaluate(() => {
    const o = document.getElementById('ph-khao-sat');
    return o ? { chu: o.innerText.trim(), hien: o.offsetParent !== null, href: o.getAttribute('href'), cao: o.getBoundingClientRect().height } : null;
  });
  check(`dòng khảo sát: "${soKs} khảo sát chờ gia đình trả lời", bấm được, cao ≥ 44px`,
    !!ks && ks.hien && ks.chu.split('\n')[0] === `${soKs} khảo sát chờ gia đình trả lời` && ks.href === '#/surveys' && ks.cao >= 44, ks);

  check('vẫn đúng MỘT .tile-grid', (await dem(page, '.tile-grid')) === 1);
  const hangNgay = await page.locator('.tile-grid .tile:not(.tile-phu)').evaluateAll(
    els => els.map(e => ({ key: e.dataset.tileKey, hien: e.offsetParent !== null })));
  check('nhóm "Hằng ngày" đủ 5 ô đúng thứ tự bản vẽ, đều đang HIỆN',
    JSON.stringify(hangNgay.map(o => o.key)) === JSON.stringify(O_HANG_NGAY) && hangNgay.every(o => o.hien)
    && (await chu(page)).includes('Hằng ngày'), hangNgay);

  // MỌI phần đang bật với gia đình phải có ô — tính lại từ danh sách máy chủ
  // trả về và từ chính các đường `dieuKienHien`, không tin vào lưới đang vẽ.
  const mong = await page.evaluate(async () => {
    const u = App.state.user;
    const ra = [];
    for (const m of App.state.modules) {
      if (m.nav || m.anKhoiTrangChu || App.views.dashboard.gopVaoManKhac(m, u)) continue;
      if (m.dieuKienHien) {
        let r = null;
        try { r = await API.get(m.dieuKienHien); } catch (_) { /* lỗi thì ô vẫn hiện */ }
        if (r && r.hien === false) continue;
      }
      ra.push({ key: m.key, hash: m.hash });
    }
    return ra;
  });
  const coO = await page.locator('.tile[data-tile-key]').evaluateAll(els => els.map(e => ({
    key: e.dataset.tileKey, onclick: e.getAttribute('onclick') || '',
    huyHieu: e.querySelectorAll(`.tile-badge[data-tile-badge="${e.dataset.tileKey}"]`).length,
    nhan: e.querySelectorAll('.tile-label').length, hien: e.offsetParent !== null,
  })));
  check('MỌI phần đang bật đều có ô trong trang, kèm nhãn, chỗ huy hiệu và đường vào — không ô nào mất',
    mong.length >= 10 && coO.length === mong.length
    && mong.every(m => coO.some(o => o.key === m.key && o.onclick.includes(`'${m.hash}'`) && o.huyHieu === 1 && o.nhan === 1)),
    { mong: mong.map(m => m.key), co: coO.map(o => o.key) });
  const soPhu = coO.length - O_HANG_NGAY.length;
  check('các ô ngoài nhóm Hằng ngày đang GIẤU nhưng vẫn nằm trong trang (lớp tile-phu)',
    soPhu > 3 && (await dem(page, '.tile.tile-phu')) === soPhu && coO.filter(o => o.hien).length === O_HANG_NGAY.length,
    { soPhu, hien: coO.filter(o => o.hien).map(o => o.key) });
  const them = await page.evaluate(() => {
    const o = document.getElementById('ph-them');
    return o ? { chu: o.innerText, mo: o.getAttribute('aria-expanded'), cao: o.getBoundingClientRect().height } : null;
  });
  check(`dòng "… và N mục khác" đếm đúng ${soPhu} ô đang giấu (ba tên + ${soPhu - 3} mục khác)`,
    !!them && new RegExp(`và ${soPhu - 3} mục khác`).test(them.chu) && them.chu.includes('Hồ sơ của bé')
    && them.mo === 'false' && them.cao >= 44, them);
  const bong = await page.evaluate(() => {
    const o = document.querySelector('#ph-them [data-tile-badge="khaosat"]');
    return o ? { chu: o.textContent.trim(), hien: o.offsetParent !== null } : null;
  });
  check('ô Khảo sát đang giấu thì con số của nó hiện ngay trên dòng "mục khác"',
    !!bong && bong.hien && bong.chu === String(soKs), bong);

  if (them) await page.click('#ph-them');
  await page.waitForTimeout(250);
  const sauMo = await page.evaluate(() => ({
    an: [...document.querySelectorAll('.tile')].filter(e => e.offsetParent === null).map(e => e.dataset.tileKey),
    tong: document.querySelectorAll('.tile').length,
    mo: (document.getElementById('ph-them') || { getAttribute: () => null }).getAttribute('aria-expanded'),
    luoi: document.querySelectorAll('.tile-grid').length,
  }));
  check('bấm "mục khác" thì hiện HẾT ô, vẫn một lưới', !!them && sauMo.tong === mong.length && sauMo.an.length === 0
    && sauMo.mo === 'true' && sauMo.luoi === 1, sauMo);
  await page.screenshot({ path: SHOT + 'gia-dinh-mo-het-o.png', fullPage: true });
  if (await dem(page, '.tile.tile-phu[data-tile-key="hocsinh"]')) await page.click('.tile.tile-phu[data-tile-key="hocsinh"]');
  await page.waitForTimeout(500);
  check('ô vừa lộ ra bấm được, tới đúng màn', (await location(page)) === '#/student', await location(page));
  await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
  await cho(page, '.tile-grid');
  check('quay lại trang chủ: các ô vẫn đang mở như lúc rời đi',
    (await dem(page, '#ph-them[aria-expanded="true"]')) === 1 && (await dem(page, '.tile:visible')) === mong.length);
  if (them) await page.click('#ph-them');
  await page.waitForTimeout(250);
  check('bấm lần nữa thì gọn lại còn nhóm Hằng ngày',
    (await dem(page, '#ph-them[aria-expanded="false"]')) === 1 && (await dem(page, '.tile:visible')) === O_HANG_NGAY.length);

  // Con số khảo sát đổi (app tự hỏi lại huy hiệu mỗi 15 giây) thì dòng đổi theo.
  const datHuyHieu = async (soMoi) => {
    await page.unroute(/\/api\/dashboard\/badges/).catch(() => {});
    await page.route(/\/api\/dashboard\/badges/, r => r.fulfill({ json: { thongbao: 0, nhantin: 0, khaosat: soMoi } }));
    await page.evaluate(() => App.refreshBadges());
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const o = document.getElementById('ph-khao-sat');
      const b = document.querySelector('#ph-them [data-tile-badge="khaosat"]');
      return { dong: o ? o.offsetParent !== null : null, chu: o ? o.innerText.trim().split('\n')[0] : '', bong: b ? b.offsetParent !== null : null };
    });
  };
  const het = await datHuyHieu(0);
  check('hết khảo sát chờ → dòng khảo sát và bong bóng biến mất', het.dong === false && het.bong === false, het);
  const lai = await datHuyHieu(3);
  check('có 3 khảo sát chờ → dòng hiện lại đúng con số', lai.dong === true && lai.chu === '3 khảo sát chờ gia đình trả lời' && lai.bong === true, lai);
  if (await dem(page, '#ph-khao-sat')) await page.click('#ph-khao-sat');
  await page.waitForTimeout(400);
  check('bấm dòng khảo sát → màn Khảo sát', (await location(page)) === '#/surveys', await location(page));
  await page.context().close();
}

// ===========================================================================
console.log('\n[7] Gia đình trên màn hẹp 320px: không cuộn ngang, chỗ bấm đủ lớn');
{
  const page = await moTrang({ width: 320, height: 640 }, KHONG_SW);
  await gaThucDon(page);
  await dangNhap(page, 'phuhuynh', '123456');
  await cho(page, '#ph-hom-nay [data-ph]');
  await page.waitForTimeout(600);
  const tran = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('có thẻ hôm nay và không cuộn ngang khi đang gọn', (await dem(page, '#ph-hom-nay [data-ph]')) > 0 && (await tran()) <= 0, await tran());
  const kich = await page.evaluate(() => ['#ph-them', '#ph-khao-sat', '.hero .student-chip', '.tile:not(.tile-phu)']
    .map(s => { const o = document.querySelector(s); return { s, cao: o ? Math.round(o.getBoundingClientRect().height) : 0 }; }));
  check('dòng mục khác, dòng khảo sát, ô chọn con, ô Hằng ngày đều cao ≥ 44px', kich.every(k => k.cao >= 44), kich);
  if (await dem(page, '#ph-them')) await page.click('#ph-them');
  await page.waitForTimeout(250);
  check('mở hết ô vẫn không cuộn ngang', (await dem(page, '.tile.tile-phu:visible')) > 0 && (await tran()) <= 0, await tran());
  await page.screenshot({ path: SHOT + 'gia-dinh-320.png', fullPage: true });
  await page.context().close();
}

// ===========================================================================
console.log('\n[8] Thẻ hôm nay hỏng thì trang chủ vẫn dùng được (Nguyên tắc số 1)');
{
  const page = await moTrang({ width: 390, height: 844 }, KHONG_SW);
  await gaThucDon(page);
  const chan500 = (re) => page.route(re, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"thử hỏng"}' }));
  await chan500(/\/api\/attendance/);
  await dangNhap(page, 'phuhuynh', '123456');
  await cho(page, '#ph-them');
  await page.waitForTimeout(1200);
  check('đường điểm danh trả 500 → thẻ hôm nay được gỡ, không để thẻ dở',
    (await dem(page, '#ph-them')) === 1 && (await dem(page, '#ph-hom-nay')) === 0, await dem(page, '#ph-hom-nay'));
  check('… trang chủ vẫn đủ ô, nhóm Hằng ngày vẫn hiện', (await dem(page, '.tile')) >= 10
    && (await dem(page, '.tile:not(.tile-phu):visible')) === O_HANG_NGAY.length);
  if (await dem(page, '#ph-them')) await page.click('#ph-them');
  await page.waitForTimeout(250);
  check('… dòng "mục khác" vẫn mở được', (await dem(page, '.tile.tile-phu:visible')) > 3);

  await page.unroute(/\/api\/attendance/);
  await chan500(/\/api\/leave\/lich-nghi/);
  await page.unroute(/\/api\/menu\?/);
  await chan500(/\/api\/menu\?/);
  await veLai(page, '#ph-hom-nay [data-ph]');
  const thuTu = await dongThe(page);
  check('chỉ thực đơn và lịch nghỉ hỏng → thẻ vẫn có phần điểm danh, chỉ thiếu dòng thực đơn',
    JSON.stringify(thuTu) === JSON.stringify(['toi', 'loi-co', 'ra-ve']), thuTu);

  // Bước lui: chính hàm vẽ trang chủ mới ném lỗi thì rơi về cách vẽ cũ.
  await page.evaluate(() => { App.views.dashboard.chiaO = () => { throw new Error('thử hỏng'); }; App.route(); });
  await page.waitForTimeout(600);
  check('hàm vẽ trang chủ mới ném lỗi → rơi về cách vẽ cũ: vẫn đủ ô, mọi ô đều hiện',
    (await dem(page, '.hero-greet')) === 1 && (await dem(page, '.tile-label')) >= 10
    && (await dem(page, '.tile:visible')) === (await dem(page, '.tile')) && (await dem(page, '#ph-hom-nay')) === 0,
    { chao: await dem(page, '.hero-greet'), o: await dem(page, '.tile-label') });
  await page.context().close();
}

// ===========================================================================
console.log('\n[9] Ô chọn năm học chuyển sang Cài đặt');
{
  const page = await moTrang({ width: 390, height: 844 });
  await dangNhap(page, 'phuhuynh', '123456');
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await cho(page, '#year-select');
  const nam = await page.evaluate(() => {
    const o = document.getElementById('year-select');
    return o ? { ds: [...o.options].map(x => x.value), chon: o.value, hienHanh: App.state.school.currentYear,
      cao: o.getBoundingClientRect().height } : null;
  });
  check('Cài đặt của gia đình có ô chọn năm học, đang đứng ở năm hiện hành',
    !!nam && nam.ds.length >= 2 && nam.chon === nam.hienHanh && nam.cao >= 44 && (await chu(page)).includes('Năm học'), nam);
  const namCu = nam ? nam.ds.find(x => x !== nam.hienHanh) : '';
  if (nam) await page.selectOption('#year-select', namCu);
  await page.waitForTimeout(700);
  check('chọn năm cũ → tới màn "Năm học trước", năm hiện hành của app không đổi',
    (await location(page)) === '#/namhoccu' && (await page.evaluate(() => App.state.year === App.state.school.currentYear)),
    await location(page));

  // Phần "Năm học trước" đang tắt: đứng yên, nhắc bằng một dòng, ô trả về năm hiện hành.
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await cho(page, '#year-select');
  await page.evaluate(() => { App.state.modules = App.state.modules.filter(m => m.view !== 'namhoccu'); });
  if (nam) await page.selectOption('#year-select', namCu);
  await page.waitForTimeout(400);
  const sau = await page.evaluate(() => ({
    hash: location.hash, chon: (document.getElementById('year-select') || {}).value,
    bao: (document.getElementById('toast-zone') || { innerText: '' }).innerText,
  }));
  check('phần "Năm học trước" tắt → ở lại Cài đặt, có lời nhắc, ô trả về năm hiện hành',
    !!nam && sau.hash === '#/settings' && sau.chon === nam.hienHanh && /Năm học trước/.test(sau.bao), sau);
  await page.context().close();

  const pCo = await moTrang({ width: 390, height: 844 });
  await dangNhap(pCo, 'giaovien', '123456');
  await pCo.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await cho(pCo, '#st-change-pw');
  check('Cài đặt của cô KHÔNG có ô chọn năm học', (await dem(pCo, '#st-change-pw')) === 1 && (await dem(pCo, '#year-select')) === 0);
  await pCo.context().close();
}

// ===========================================================================
console.log('\n[10] Nhà trường tắt phần Thực đơn / Điểm danh: thẻ không hỏi, không vẽ phần ấy');
{
  const moVaGhi = async () => {
    const page = await moTrang({ width: 390, height: 844 }, KHONG_SW);
    const hoi = [];
    page.on('request', q => { if (/\/api\/(menu|attendance|leave)\b/.test(q.url())) hoi.push(new URL(q.url()).pathname); });
    await gaThucDon(page);
    await dangNhap(page, 'phuhuynh', '123456');
    await cho(page, '#ph-them');
    await page.waitForTimeout(1200);
    return { page, hoi };
  };
  const tatTd = await goi('PUT', '/api/admin/modules/thucdon', { enabled: false }, ckQT2);
  {
    const { page, hoi } = await moVaGhi();
    const thuTu = await dongThe(page);
    const o = await page.locator('.tile-grid .tile:not(.tile-phu):visible').evaluateAll(els => els.map(e => e.dataset.tileKey));
    check('Thực đơn tắt → không hỏi /api/menu, thẻ còn tới lớp · lời cô nhắn · ra về, nhóm Hằng ngày còn 4 ô',
      tatTd.status === 200 && !hoi.includes('/api/menu') && hoi.includes('/api/attendance')
      && JSON.stringify(thuTu) === JSON.stringify(['toi', 'loi-co', 'ra-ve'])
      && JSON.stringify(o) === JSON.stringify(O_HANG_NGAY.filter(k => k !== 'thucdon')), { thuTu, o, hoi });
    await page.context().close();
  }
  const batTd = await goi('PUT', '/api/admin/modules/thucdon', { enabled: true }, ckQT2);
  const tatDd = await goi('PUT', '/api/admin/modules/diemdanh', { enabled: false }, ckQT2);
  {
    const { page, hoi } = await moVaGhi();
    const thuTu = await dongThe(page);
    const the = await chuO(page, '#ph-hom-nay');
    check('Điểm danh tắt → không hỏi /api/attendance, thẻ chỉ còn thực đơn, không nói gì về điểm danh',
      batTd.status === 200 && tatDd.status === 200 && !hoi.some(u => u.startsWith('/api/attendance')) && hoi.includes('/api/menu')
      && JSON.stringify(thuTu) === JSON.stringify(['thuc-don']) && the.includes('Hôm nay của Bảo An')
      && !/điểm danh|Tới lớp|Ra về/.test(the), { thuTu, hoi, the });
    await page.context().close();
  }
  await goi('PUT', '/api/admin/modules/diemdanh', { enabled: true }, ckQT2);
}

check('không có lỗi JavaScript nào trên mọi màn đã mở', loi.length === 0, loi);

await browser.close();
dung();
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
console.log(`Ảnh chụp: ${SHOT}`);
if (failures.length) { console.log('\nLỖI:'); failures.forEach(f => console.log(' ✗', f)); process.exit(1); }
