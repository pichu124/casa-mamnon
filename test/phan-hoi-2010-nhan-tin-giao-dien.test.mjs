// Bài canh MÀN NHẮN TIN trên trình duyệt thật — góp ý 20/10 (Đ241c, F4 + F6).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-giao-dien.test.mjs
//
// Phần máy chủ có `test/phan-hoi-2010-nhan-tin.test.mjs` và
// `test/nhan-tin-thu-hoi-phong.test.mjs`. Bài này đo những gì chỉ trình duyệt
// trả lời được:
//   1. Hộp "Trò chuyện mới" nói rõ đầu mối nào nhóm của bé chưa có cô nhận tin.
//   2. Tin của chính mình có nút "Thu hồi", hỏi xác nhận; bấm "Huỷ" thì tin còn.
//   3. Thu hồi xong bong bóng ghi "Tin nhắn đã được thu hồi", chữ cũ biến khỏi
//      màn hình, mở lại vẫn vậy; danh sách hội thoại cũng nói như thế.
//   4. Người kia thấy cùng dòng ấy và KHÔNG có nút thu hồi tin của người khác.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4974), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
let traLoiHop = 'accept';
const hopThoai = [];
page.on('dialog', (d) => {
  hopThoai.push(d.message());
  (traLoiHop === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
});

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
const khungChat = () => page.locator('#chat-msgs').innerText();

const TIN = 'Cô ơi em nhắn nhầm giờ đón bé ạ';
let cvId = '';

try {
  await dangNhap('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Hộp "Trò chuyện mới": đầu mối chưa có cô nhận tin được nói rõ');
  {
    await moMan('#/messages');
    await page.click('#msg-new');
    await page.waitForTimeout(400);
    const dong = page.locator('#modal-overlay .list-row');
    const chu = await dong.allInnerTexts();
    const nn = chu.filter(t => /Cô nước ngoài/.test(t));
    const cn = chu.filter(t => /Cô phụ trách nhóm/.test(t));
    check('đối chứng — vẫn đủ dòng cô nước ngoài cho mỗi bé', nn.length === 2, chu);
    check('dòng cô nước ngoài (nhóm chưa khai cô nào) ghi rõ chưa có cô nhận tin',
      nn.every(t => /chưa có cô nhận tin/.test(t)), nn);
    check('dòng cô phụ trách nhóm KHÔNG mang dòng ấy', cn.length === 2 && cn.every(t => !/chưa có cô nhận tin/.test(t)), cn);

    await dong.filter({ hasText: 'Cô nước ngoài' }).first().click();
    await page.waitForTimeout(800);
    check('bấm vào thì không mở phòng trống, vẫn ở hộp chọn', !/#\/messages\/cv/.test(page.url()), page.url());
    check('và nói bằng tiếng Việt vì sao',
      /chưa có cô nước ngoài/i.test(await page.locator('body').innerText()));

    await dong.filter({ hasText: 'Cô phụ trách nhóm' }).first().click();
    await page.waitForSelector('#chat-input', { timeout: 5000 });
    cvId = page.url().split('#/messages/')[1] || '';
    check('dòng cô phụ trách nhóm mở được phòng chat', !!cvId, page.url());
  }

  // =========================================================================
  console.log('\n[2] Nút "Thu hồi" trên tin của mình, có hỏi xác nhận');
  {
    await page.fill('#chat-input', TIN);
    await page.click('#chat-send');
    await page.waitForTimeout(800);
    const tinCuaToi = page.locator('#chat-msgs .bubble-row.mine').last();
    check('tin vừa gửi hiện ra', (await tinCuaToi.innerText()).includes(TIN));
    check('tin của chính mình có nút "Thu hồi"',
      await tinCuaToi.locator('button', { hasText: 'Thu hồi' }).count() === 1);

    traLoiHop = 'dismiss';
    await tinCuaToi.locator('button', { hasText: 'Thu hồi' }).click();
    await page.waitForTimeout(600);
    check('bấm thì hỏi xác nhận trước', hopThoai.length === 1 && /Thu hồi tin nhắn/.test(hopThoai[0]), hopThoai);
    check('bấm "Huỷ" thì tin vẫn còn nguyên', (await khungChat()).includes(TIN));

    traLoiHop = 'accept';
    await tinCuaToi.locator('button', { hasText: 'Thu hồi' }).click();
    await page.waitForTimeout(800);
    const khung = await khungChat();
    check('đồng ý thì bong bóng ghi "Tin nhắn đã được thu hồi"', khung.includes('Tin nhắn đã được thu hồi'), khung);
    check('và chữ cũ biến khỏi màn hình', !khung.includes(TIN), khung);
    check('tin đã thu hồi không còn nút "Thu hồi"',
      await page.locator('#chat-msgs .bubble-row.mine').last().locator('button').count() === 0);

    await moMan(`#/messages/${cvId}`);
    const lai = await khungChat();
    check('mở lại phòng vẫn là "Tin nhắn đã được thu hồi"',
      lai.includes('Tin nhắn đã được thu hồi') && !lai.includes(TIN), lai);

    await moMan('#/messages');
    const ds = await page.locator('#view').innerText();
    check('danh sách hội thoại cũng ghi "Tin nhắn đã được thu hồi"', ds.includes('Tin nhắn đã được thu hồi'), ds);
  }

  // =========================================================================
  console.log('\n[3] Người kia thấy cùng dòng, không có nút thu hồi tin của người khác');
  {
    await dangNhap('giaovien', '123456');
    await moMan(`#/messages/${cvId}`);
    const khung = await khungChat();
    check('cô thấy "Tin nhắn đã được thu hồi", không thấy chữ cũ',
      khung.includes('Tin nhắn đã được thu hồi') && !khung.includes(TIN), khung);
    await page.fill('#chat-input', 'Dạ cô nhận được rồi ạ');
    await page.click('#chat-send');
    await page.waitForTimeout(800);
    check('tin của gia đình KHÔNG có nút thu hồi trên màn của cô',
      await page.locator('#chat-msgs .bubble-row:not(.mine) button').count() === 0);
    check('tin cô vừa gửi thì có',
      await page.locator('#chat-msgs .bubble-row.mine').last().locator('button', { hasText: 'Thu hồi' }).count() === 1);
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
