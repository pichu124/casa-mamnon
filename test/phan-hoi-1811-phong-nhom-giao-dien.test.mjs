// Bài canh PHÒNG TRAO ĐỔI CHUNG trên trình duyệt thật (Đ260k, góp ý 18/11).
//
// Chạy bằng:  node test/phan-hoi-1811-phong-nhom-giao-dien.test.mjs
//
// Phần máy chủ có `test/phan-hoi-1811-phong-nhom.test.mjs`. Bài này đo những
// gì chỉ trình duyệt trả lời được, trên khổ điện thoại 390px:
//   1. Cô tạo phòng qua giao diện: "Chọn tất cả" bật sẵn, tên gợi ý sẵn, câu
//      giải thích nói rõ gia đình thấy tin của nhau; màn không tràn ngang.
//   2. Phụ huynh thấy phòng trong danh sách và nhắn được.
//   3. Phụ huynh khác thấy tin kèm nhãn "… bé …", không có nút "Ẩn".
//   4. Cô ẩn được tin của gia đình; mở "Thành viên" và khoá phòng.
//   5. Khoá xong phụ huynh không còn ô nhập, thấy câu giải thích.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-phong-nhom-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5310), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const hopThoai = [];
page.on('dialog', (d) => { hopThoai.push(d.message()); d.accept().catch(() => {}); });

async function dangNhap(u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
};
const khongTranNgang = () => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const TEN = 'Bàn chuyện dã ngoại tháng 12';
const TIN = 'Cả nhà ơi mình góp quà Tết cho các cô nhé';
let cvId = '';

try {
  // =========================================================================
  console.log('\n[1] Cô tạo phòng trao đổi chung qua giao diện');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/messages');
    check('màn Nhắn tin của cô có nút "Tạo phòng trao đổi chung"', await page.locator('#msg-tao-phong').count() === 1);
    await page.click('#msg-tao-phong');
    await page.waitForSelector('#tp-tao', { timeout: 5000 });
    await page.waitForTimeout(400);
    const giaiThich = await page.locator('#tp-giai-thich').innerText();
    check('câu giải thích nói gia đình đọc được tin của nhau', /đọc được tin của nhau/.test(giaiThich), giaiThich);
    check('tên phòng gợi ý sẵn theo nhóm', (await page.inputValue('#tp-ten')) === 'Trao đổi chung nhóm Chồi 2',
      await page.inputValue('#tp-ten'));
    check('"Chọn tất cả" bật sẵn', await page.isChecked('#tp-tat-ca'));
    const o = page.locator('#tp-ds input[type=checkbox]');
    check('đủ 5 gia đình nhóm Chồi 2, đều đã chọn', await o.count() === 5
      && (await o.evaluateAll(els => els.every(e => e.checked))), await o.count());
    const nhan = await page.locator('#tp-ds').innerText();
    check('gia đình hiện bằng nhãn "… bé …"', /Mẹ bé Nguyễn Bảo An/.test(nhan), nhan);
    check('không lộ họ tên người lớn', !/Lê Thị Thu Hà/.test(nhan));
    check('màn tạo phòng không tràn ngang ở 390px', await khongTranNgang());

    await page.fill('#tp-ten', TEN);
    await page.click('#tp-tao');
    await page.waitForSelector('#chat-input', { timeout: 5000 });
    cvId = page.url().split('#/messages/')[1] || '';
    check('tạo xong mở thẳng phòng', /^cv/.test(cvId), page.url());
    check('đầu phòng có nút "Thành viên"', await page.locator('#chat-thanh-vien').count() === 1);
    const dau = await page.locator('.page-head').innerText();
    check('đầu phòng ghi tên phòng và tên nhóm', dau.includes(TEN) && /Chồi 2/.test(dau), dau);
    check('phòng chat không tràn ngang ở 390px', await khongTranNgang());
  }

  // =========================================================================
  console.log('\n[2] Phụ huynh thấy phòng và nhắn được');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan('#/messages');
    const ds = await page.locator('#view').innerText();
    check('phòng hiện trong danh sách của gia đình', ds.includes(TEN), ds);
    await page.locator('.chat-list-row', { hasText: TEN }).click();
    await page.waitForSelector('#chat-input', { timeout: 5000 });
    await page.fill('#chat-input', TIN);
    await page.click('#chat-send');
    await page.waitForTimeout(800);
    check('tin vừa gửi hiện ra', (await page.locator('#chat-msgs').innerText()).includes(TIN));
  }

  // =========================================================================
  console.log('\n[3] Phụ huynh khác thấy tin kèm nhãn, không có nút "Ẩn"');
  {
    await dangNhap('phuhuynh2', '123456');
    await moMan(`#/messages/${cvId}`);
    const bongBong = page.locator('#chat-msgs .bubble-row', { hasText: TIN });
    check('thấy tin của nhà khác', await bongBong.count() === 1);
    const ten = await bongBong.locator('.bubble-name').innerText();
    check('tên người gửi là "Mẹ bé Nguyễn Bảo An"', ten === 'Mẹ bé Nguyễn Bảo An', ten);
    check('gia đình không có nút "Ẩn"', await page.locator('#chat-msgs .bubble-nut-an').count() === 0);
    await page.click('#chat-thanh-vien');
    await page.waitForSelector('#modal-overlay', { timeout: 3000 });
    const tv = await page.locator('#modal-overlay').innerText();
    check('gia đình xem được thành viên', /Gia đình \(5\)/.test(tv) && /Các cô/.test(tv), tv);
    check('gia đình không có nút khoá hay bỏ', await page.locator('#tv-khoa, #modal-overlay .tv-bo').count() === 0);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[4] Cô ẩn tin, mở "Thành viên" và khoá phòng');
  {
    await dangNhap('giaovien', '123456');
    await moMan(`#/messages/${cvId}`);
    const bongBong = page.locator('#chat-msgs .bubble-row', { hasText: TIN });
    check('cô có nút "Ẩn" trên tin của gia đình', await bongBong.locator('.bubble-nut-an').count() === 1);
    await bongBong.locator('.bubble-nut-an').click();
    await page.waitForTimeout(800);
    check('bấm "Ẩn" thì hỏi xác nhận', hopThoai.some(h => /Ẩn tin nhắn/.test(h)), hopThoai);
    const khung = await page.locator('#chat-msgs').innerText();
    check('tin hiện "Tin nhắn đã được cô ẩn", chữ cũ biến mất', khung.includes('Tin nhắn đã được cô ẩn') && !khung.includes(TIN), khung);

    await page.click('#chat-thanh-vien');
    await page.waitForSelector('#tv-khoa', { timeout: 3000 });
    check('cô thấy nút bỏ gia đình', await page.locator('#modal-overlay .tv-bo').count() === 5);
    check('hộp thành viên không tràn ngang', await khongTranNgang());
    await page.click('#tv-khoa');
    await page.waitForSelector('#chat-da-khoa', { timeout: 5000 });
    check('khoá xong ô nhập biến mất', await page.locator('#chat-input').count() === 0);
  }

  // =========================================================================
  console.log('\n[5] Phòng đã khoá: gia đình không còn ô nhập');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan(`#/messages/${cvId}`);
    check('không có ô nhập', await page.locator('#chat-input').count() === 0);
    const cau = await page.locator('#chat-da-khoa').innerText();
    check('có câu giải thích phòng đã khoá', /khoá/.test(cau) && /đọc được tin cũ/.test(cau), cau);
    const khung = await page.locator('#chat-msgs').innerText();
    check('gia đình cũng thấy "Tin nhắn đã được cô ẩn"', khung.includes('Tin nhắn đã được cô ẩn') && !khung.includes(TIN), khung);
    check('tin đã bị ẩn không có nút "Thu hồi"', await page.locator('#chat-msgs .bubble-nut-thu-hoi').count() === 0);
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
