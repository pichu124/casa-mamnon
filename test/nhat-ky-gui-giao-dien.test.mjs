// Bài canh MÀN NHẬT KÝ NGÀY trên trình duyệt thật — góp ý 06/10, mục 9.
//
// Chạy bằng:  node test/nhat-ky-gui-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
// Phần máy chủ của "Lưu là nháp, Gửi mới thấy" đã có `test/nhat-ky-gui.test.mjs`.
// Bài này đo đúng những thứ chỉ trình duyệt trả lời được:
//
//   1. Ba tab Ăn uống / Nghỉ trưa / Vệ sinh; dải bước bữa ăn vẫn còn trong tab
//      Ăn uống (các bài cũ bấm `.seg [data-buoc="bua:lunch"]`).
//   2. Chọn nhiều bé → "Áp" chỉ điền cho bé đã chọn, bé khác để nguyên.
//   3. Lưu xong gia đình CHƯA thấy; bấm Gửi mở hộp soát từng bé, xác nhận xong
//      gia đình mới thấy — trên màn của chính gia đình.
//   4. Tab Vệ sinh: ghi một mốc giờ cho các bé đã chọn, bỏ một mốc ghi nhầm.
//   5. Khổ điện thoại: không cuộn ngang, không nút / ô chọn nào nhỏ hơn 32px.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhat-ky-gui-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3341), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const PH_NT = (await login('ph.trang', '123456')).cookie;    // mẹ s9
const docCuaMe = async () => ((await req('GET', '/api/nhatky?studentId=s9', { cookie: PH_NT })).data || {}).ngayCo || [];

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
  await page.waitForTimeout(900);
};
const chu = () => page.locator('#view').innerText();
const bamTab = async (ma) => {
  await page.click(`.nk-phan [data-phan="${ma}"]`);
  await page.waitForTimeout(800);
};

try {
  await dangNhap('giaovien4', '123456');   // cô nhóm Nhà trẻ 1 (c4): s9, s10, s11
  await moMan('#/nhatky');

  // =========================================================================
  console.log('\n[1] Ba tab đúng như nhà trường đặt; dải bước bữa ăn nằm trong tab Ăn uống');
  {
    const tab = await page.locator('.nk-phan [data-phan]').allInnerTexts();
    check('có đúng ba tab Ăn uống / Nghỉ trưa / Vệ sinh',
      tab.length === 3 && /^Ăn uống/.test(tab[0]) && /^Nghỉ trưa/.test(tab[1]) && /^Vệ sinh/.test(tab[2]), tab);
    check('đang ở tab Ăn uống khi mới mở', (await page.locator('.nk-phan [data-phan="an"]').getAttribute('class')) === 'active');
    check('dải bước có Bữa trưa (các bài cũ bấm vào đây)', await page.locator('.seg [data-buoc="bua:lunch"]').count() === 1);
    check('nhóm nhà trẻ có bước Bú bình ngay trong tab Ăn uống', await page.locator('.seg [data-buoc="sua"]').count() === 1);
    check('có nút Gửi cho gia đình', await page.locator('#nk-gui').count() === 1);
  }

  // =========================================================================
  console.log('\n[2] Chọn hai bé → "Áp" chỉ điền cho hai bé đó');
  await bamTab('ngu');
  {
    check('tab Nghỉ trưa không còn dải bước con', await page.locator('.seg [data-buoc]').count() === 0);
    check('vẫn có ô đặt nhanh giờ ngủ', await page.locator('#nk-ca-ngu-tu').count() === 1);
    await page.check('.nk-chon[data-be="s9"]');
    await page.check('.nk-chon[data-be="s10"]');
    check('dải chọn đếm đúng 2 bé', /Đã chọn 2 bé/.test(await page.locator('#nk-so-chon').innerText()));
    check('nút áp đổi chữ theo số bé đã chọn', (await page.locator('#nk-ap').innerText()).trim() === 'Áp cho 2 bé đã chọn',
      await page.locator('#nk-ap').innerText());
    const gio = await page.locator('#nk-ca-ngu-tu option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    await page.selectOption('#nk-ca-ngu-tu', gio[2]);
    await page.selectOption('#nk-ca-ngu-den', gio[gio.length - 2]);
    await page.click('#nk-ap');
    const tu = async (id) => page.locator(`select.nk-o[data-be="${id}"][data-truong="nguTuLuc"]`).inputValue();
    check('s9 và s10 được điền', (await tu('s9')) === gio[2] && (await tu('s10')) === gio[2], [await tu('s9'), await tu('s10')]);
    check('s11 KHÔNG bị điền — cô không chọn bé này', (await tu('s11')) === '', await tu('s11'));

    await page.click('#nk-luu');
    await page.waitForTimeout(1500);
    const sau = await chu();
    check('lưu xong màn nói rõ "đã ghi · chưa gửi"', (sau.match(/Đã ghi · chưa gửi/g) || []).length === 2, sau.slice(0, 300));
    check('tab Nghỉ trưa đếm 2 bé chờ gửi', /Nghỉ trưa · 2/.test(await page.locator('.nk-phan').innerText()));
    check('gia đình s9 CHƯA thấy gì sau khi cô lưu', (await docCuaMe()).length === 0);
  }

  // =========================================================================
  console.log('\n[3] Gửi qua hộp soát từng bé — xong gia đình mới thấy');
  {
    await page.click('#nk-gui');
    await page.waitForTimeout(600);
    check('hộp soát mở ra', await page.locator('#nk-gui-xac').count() === 1);
    check('bật sẵn đúng 2 bé có ghi mà chưa gửi', await page.locator('.nk-gui-be:checked').count() === 2);
    check('bé chưa ghi gì thì không chọn được', await page.locator('.nk-gui-be[value="s11"]').isDisabled());
    check('mỗi bé có dòng tóm tắt giờ ngủ để cô đọc lại', /Ngủ \d\d:\d\d – \d\d:\d\d/.test(await page.locator('#nk-gui-ds').innerText()));
    check('nút xác nhận nói rõ gửi cho mấy gia đình', (await page.locator('#nk-gui-xac').innerText()).trim() === 'Gửi cho 2 gia đình');
    await page.click('#nk-gui-xac');
    await page.waitForTimeout(1500);
    check('màn hiện "Đã gửi" cho hai bé', ((await chu()).match(/Đã gửi \d\d:\d\d/g) || []).length === 2, (await chu()).slice(0, 300));
    const doc = await docCuaMe();
    check('gia đình s9 nay đọc được giấc trưa', doc.length === 1 && !!doc[0].nguTuLuc && !!(doc[0].daGui || {}).ngu, doc[0]);
  }

  // =========================================================================
  console.log('\n[4] Tab Vệ sinh: ghi một mốc giờ cho các bé đã chọn, bỏ một mốc ghi nhầm');
  await bamTab('vesinh');
  {
    check('tab Vệ sinh không có nút Lưu — mốc giờ lưu ngay khi ghi', await page.locator('#nk-luu').count() === 0);
    check('vẫn nhớ hai bé đã chọn', /Đã chọn 2 bé/.test(await page.locator('#nk-so-chon').innerText()));
    await page.selectOption('#nk-vs-loai', 'thay-bim');
    await page.fill('#nk-vs-gio', '09:15');
    await page.selectOption('#nk-vs-poo', '1');
    await page.click('#nk-vs-ghi');
    await page.waitForTimeout(1500);
    const sau = await chu();
    check('hai thẻ hiện mốc 09:15 thay bỉm', (sau.match(/09:15\s*Thay bỉm · có đi ngoài/g) || []).length === 2, sau.slice(0, 400));
    check('có nút bỏ mốc cho từng mốc', await page.locator('.nk-vs-bo').count() === 2);
    await page.locator('.nk-vs-bo').first().click();
    await page.waitForTimeout(1500);
    check('bỏ một mốc ghi nhầm thì còn một', await page.locator('.nk-vs-bo').count() === 1);
  }

  // =========================================================================
  console.log('\n[5] Khổ điện thoại: không cuộn ngang, không chỗ chạm nào nhỏ hơn đầu ngón tay');
  for (const ma of ['an', 'ngu', 'vesinh']) {
    await bamTab(ma);
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`tab ${ma}: không cuộn ngang`, tran <= 1, `tràn ${tran}px`);
    const nho = await page.evaluate(() => {
      const ra = [];
      for (const el of document.querySelectorAll('#view button, #view select, #view input[type=checkbox]')) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.height < 32 || r.width < 32) ra.push(`${el.tagName}.${el.className || el.id}:${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return ra.slice(0, 5);
    });
    check(`tab ${ma}: không nút nào nhỏ hơn 32px`, nho.length === 0, nho);
  }

  // =========================================================================
  console.log('\n[6] Màn của GIA ĐÌNH: phần đã gửi hiện ra, phần chưa gửi nói "cô chưa gửi"');
  {
    await dangNhap('ph.trang', '123456');
    await moMan('#/nhatky');
    const t = await chu();
    check('gia đình thấy giấc trưa cô đã gửi', /Ngủ trưa\s*\n?\s*\d\d:\d\d – \d\d:\d\d/.test(t), t.slice(0, 400));
    check('phần ăn uống chưa gửi thì nói rõ "cô chưa gửi phần này"', /Ăn uống\s*\n?\s*cô chưa gửi phần này/.test(t), t.slice(0, 400));
    check('không lộ ô chọn hay nút gửi của cô', await page.locator('.nk-chon, #nk-gui').count() === 0);
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
