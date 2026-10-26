// Bài canh MÀN NHẮN TIN của quản lý, cô và gia đình trên trình duyệt thật —
// Đ242F (góp ý 20/10 mục F1, F2, F3).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-quan-ly-giao-dien.test.mjs
//
// Phần máy chủ có `test/phan-hoi-2010-nhan-tin-quan-ly.test.mjs`. Bài này đo
// những gì chỉ trình duyệt trả lời được:
//   1. MINH BẠCH: màn Nhắn tin của gia đình và của cô hiện dòng báo trước rằng
//      ban giám hiệu và quản lý cơ sở có thể xem; màn của quản lý thì không.
//   2. Quản lý lọc cơ sở → nhóm → bé, mở một cuộc ở chế độ chỉ đọc: có dòng
//      "Chế độ xem của quản lý — chỉ đọc", không có ô nhập, không có nút thu
//      hồi, và mỗi bong bóng ghi tên người gửi.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoQuanTri, taoReq, taoLogin,
  batPhanHe, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-quan-ly-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng GD', 'gd_bgh');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7104), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
{
  const d = await login('gd_bgh', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
}
// Dựng sẵn một cuộc cô ↔ gia đình qua API — bài này đo màn hình, không đo lối mở cuộc.
const PH = (await login('phuhuynh', '123456')).cookie;
const GV = (await login('giaovien', '123456')).cookie;
const KENH = (await req('POST', '/api/messages/start', { cookie: PH, body: { kenh: 'nhom', studentId: 's1' } })).data.id;
await req('POST', `/api/messages/${KENH}`, { cookie: PH, body: { text: 'Cô ơi sáng nay bé ăn ít ạ' } });
await req('POST', `/api/messages/${KENH}`, { cookie: GV, body: { text: 'Dạ cô sẽ cho bé ăn thêm bữa phụ' } });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

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
const CAU_MINH_BACH = 'Để bảo đảm chất lượng trao đổi, ban giám hiệu và quản lý cơ sở có thể xem '
  + 'các cuộc trò chuyện giữa cô và gia đình.';

try {
  // =========================================================================
  console.log('\n[1] Minh bạch: gia đình và cô được báo trước, ngay trên màn Nhắn tin');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan('#/messages');
    const chuPH = (await page.locator('#msg-minh-bach').innerText().catch(() => '')).trim();
    check('màn Nhắn tin của GIA ĐÌNH có dòng báo trước', chuPH === CAU_MINH_BACH, chuPH);
    check('gia đình không có lối vào màn của quản lý', await page.locator('#msg-quan-ly').count() === 0);

    await dangNhap('giaovien', '123456');
    await moMan('#/messages');
    const chuGV = (await page.locator('#msg-minh-bach').innerText().catch(() => '')).trim();
    check('màn Nhắn tin của CÔ cũng có', chuGV === CAU_MINH_BACH, chuGV);
    check('cô không có lối vào màn của quản lý', await page.locator('#msg-quan-ly').count() === 0);
  }

  // =========================================================================
  console.log('\n[2] Quản lý: lọc cơ sở → nhóm → bé, mở cuộc ở chế độ chỉ đọc');
  {
    await dangNhap('gd_bgh', 'quantri2026');
    await moMan('#/messages');
    check('màn của quản lý KHÔNG có dòng báo dành cho cô và gia đình', await page.locator('#msg-minh-bach').count() === 0);
    check('có mục "Hội thoại cô – gia đình"',
      (await page.locator('#msg-quan-ly').innerText().catch(() => '')).includes('Hội thoại cô – gia đình'));
    await page.click('#msg-quan-ly');
    await page.waitForSelector('#ql-coso', { timeout: 5000 });
    check('mở ra màn lọc', page.url().endsWith('#/messages/quan-ly'), page.url());
    check('chưa chọn nhóm thì chưa liệt kê gì, và nói rõ phải chọn nhóm',
      /Chọn một nhóm lớp/.test(await page.locator('#ql-ds').innerText()));

    await page.selectOption('#ql-coso', 'cs1');
    await page.waitForTimeout(300);
    const nhomCs1 = await page.locator('#ql-nhom option').allInnerTexts();
    check('chọn cơ sở 1 thì ô nhóm chỉ còn nhóm của cơ sở 1',
      nhomCs1.includes('Chồi 2') && !nhomCs1.includes('Mầm 1'), nhomCs1);
    await page.selectOption('#ql-nhom', 'c1');
    await page.waitForTimeout(800);
    const dong = page.locator('#ql-ds .ql-cuoc');
    const chuDs = await page.locator('#ql-ds').innerText();
    check('chọn nhóm Chồi 2 thì thấy cuộc của gia đình bé Nguyễn Bảo An',
      /Gia đình bé Nguyễn Bảo An/.test(chuDs), chuDs);
    check('dòng nói rõ kênh với cô nào và số tin', /Cô phụ trách nhóm/.test(chuDs) && /2 tin nhắn/.test(chuDs), chuDs);
    check('danh sách KHÔNG chép nội dung tin', !/ăn ít/.test(chuDs), chuDs);
    const beCs1 = await page.locator('#ql-be option').allInnerTexts();
    check('ô bé liệt kê các bé của nhóm', beCs1.includes('Nguyễn Bảo An'), beCs1);
    await page.selectOption('#ql-be', 's3');
    await page.waitForTimeout(800);
    check('lọc đến bé khác thì cuộc ấy biến khỏi danh sách',
      !/Nguyễn Bảo An/.test(await page.locator('#ql-ds').innerText()));
    await page.selectOption('#ql-be', 's1');
    await page.waitForTimeout(800);

    await dong.first().click();
    await page.waitForSelector('#chat-chi-doc', { timeout: 5000 });
    check('bấm vào thì mở đúng cuộc', page.url().endsWith(`#/messages/quan-ly/${KENH}`), page.url());
    const bao = await page.locator('#chat-chi-doc').innerText();
    check('có dòng "Chế độ xem của quản lý — chỉ đọc"', bao.includes('Chế độ xem của quản lý — chỉ đọc'), bao);
    check('KHÔNG có ô nhập tin', await page.locator('#chat-input').count() === 0);
    check('KHÔNG có nút gửi', await page.locator('#chat-send').count() === 0);
    check('KHÔNG có nút thu hồi nào', await page.locator('#chat-msgs button', { hasText: 'Thu hồi' }).count() === 0);
    const khung = await page.locator('#chat-msgs').innerText();
    check('đọc được cả hai phía', /ăn ít/.test(khung) && /bữa phụ/.test(khung), khung);
    const ten = await page.locator('#chat-msgs .bubble-name').allInnerTexts();
    check('mỗi bong bóng ghi tên người gửi — biết câu nào của cô, câu nào của nhà',
      ten.length === 2 && ten.some(t => /Nguyễn Thị Mai Anh/.test(t)) && ten.some(t => /Lê Thị Thu Hà/.test(t)), ten);

    await page.goBack();
    await page.waitForSelector('#ql-ds .ql-cuoc', { timeout: 5000 });
    check('quay lại thì bộ lọc vẫn giữ nhóm vừa chọn', await page.locator('#ql-nhom').inputValue() === 'c1');
  }

  // =========================================================================
  console.log('\n[3] Cô nhắn nhiều gia đình: ô tích, "chọn tất cả", một tin, mỗi nhà một cuộc');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/messages');
    await page.click('#msg-nhieu-nha');
    await page.waitForSelector('#gn-ds .gn-be', { timeout: 5000 });
    check('mở ra màn "Nhắn nhiều gia đình"', page.url().endsWith('#/messages/gui-nhieu'), page.url());
    const ten = await page.locator('#gn-ds .gn-be').allInnerTexts();
    check('liệt kê các bé của nhóm cô (Chồi 2)', ten.some(t => /Nguyễn Bảo An/.test(t)) && ten.some(t => /Phạm Gia Hân/.test(t)), ten);
    check('không có bé của nhóm khác', !ten.some(t => /Nguyễn Bảo Nam/.test(t)), ten);
    await page.check('#gn-tat-ca');
    const soO = await page.locator('#gn-ds .gn-be input:not([disabled])').count();
    check('"Chọn tất cả" tích mọi bé', await page.locator('#gn-ds .gn-be input:checked').count() === soO && soO >= 2);
    check('và đếm đúng', (await page.locator('#gn-dem').innerText()).includes(`${soO} bé`));
    await page.locator('#gn-ds .gn-be', { hasText: 'Nguyễn Bảo An' }).locator('input').uncheck();
    check('bỏ một bé thì "Chọn tất cả" không còn tích', !(await page.isChecked('#gn-tat-ca')));
    await page.fill('#gn-noi-dung', 'Thứ sáu này nhóm mình tổ chức sinh nhật chung ạ');
    await page.click('#gn-gui');
    await page.waitForSelector('#gn-ket-qua-the', { timeout: 5000 });
    const kq = await page.locator('#gn-ket-qua-the').innerText();
    check('báo số nhà đã gửi', kq.includes(`Đã gửi tới gia đình của ${soO - 1} bé`), kq);
    const PH2 = (await login('phuhuynh2', '123456')).cookie;
    const ds2 = (await req('GET', '/api/messages', { cookie: PH2 })).data?.conversations || [];
    check('gia đình bé Gia Hân nhận trong cuộc riêng với cô',
      ds2.some(c => c.type === 'kenh' && /sinh nhật chung/.test(c.lastMessage?.text || '')), ds2.map(c => c.lastMessage?.text));
    const ds1 = (await req('GET', '/api/messages', { cookie: PH })).data?.conversations || [];
    check('bé đã bỏ chọn thì gia đình không nhận', !ds1.some(c => /sinh nhật chung/.test(c.lastMessage?.text || '')));
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
