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
//   6. (Góp ý 16/10, mục 7) Tab Ăn uống luôn đủ năm bữa đúng tên, không còn
//      bước Bú bình; gia đình đọc "Bữa sáng: Bánh bao xá xíu — con ăn hết", và
//      dòng Bú bình chỉ hiện ở ngày bản đã gửi thật sự có số bú bình.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe, taoQuanTri, HOM_NAY as homNayVN,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhat-ky-gui-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3341), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const PH_NT = (await login('ph.trang', '123456')).cookie;    // mẹ s9
const docCuaMe = async () => ((await req('GET', '/api/nhatky?studentId=s9', { cookie: PH_NT })).data || {}).ngayCo || [];

// Hai ngày trước hôm nay, dựng bằng API như cô đã ghi và đã gửi:
//   • HOM_QUA: thực đơn ba bữa nhãn cũ, cô ghi Bữa sáng "ăn hết" rồi gửi.
//   • HOM_KIA: bản gửi có số bú bình (đường ghi của app đời cũ vẫn nhận).
// Hôm nay cũng có thực đơn ba bữa nhãn cũ, để đo dải bước của cô.
const HOM_NAY = homNayVN();
const lui = (n) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const HOM_QUA = lui(1);
const HOM_KIA = lui(2);
{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('hieutruong', 'quantri2026')).cookie;
  const GV4 = (await login('giaovien4', '123456')).cookie;
  const BA_BUA = [
    { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: ['Bánh bao xá xíu'] },
    { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cơm', 'Cá kho'] },
    { type: 'snack', label: 'Bữa xế', time: '14:30', items: ['Chè đậu xanh'] },
  ];
  for (const ngay of [HOM_NAY, HOM_QUA]) {
    const td = await req('PUT', `/api/menu/${ngay}`, { cookie: QT, body: { meals: BA_BUA } });
    if (td.status !== 200) throw new Error(`Không soạn được thực đơn ${ngay}: ${td.status}`);
  }
  await req('PUT', '/api/nhatky/bua', { cookie: GV4, body: {
    classId: 'c4', ngay: HOM_QUA, bua: 'breakfast', danhSach: [{ studentId: 's9', muc: 'het' }] } });
  await req('PUT', '/api/nhatky/bua', { cookie: GV4, body: {
    classId: 'c4', ngay: HOM_KIA, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'het' }] } });
  await req('PUT', '/api/nhatky', { cookie: GV4, body: {
    ngay: HOM_KIA, truong: ['buBinhSoLan', 'buBinhMl'], danhSach: [{ studentId: 's9', buBinhSoLan: 2, buBinhMl: 120 }] } });
  for (const ngay of [HOM_QUA, HOM_KIA]) {
    const g = await req('POST', '/api/nhatky/gui', { cookie: GV4, body: { classId: 'c4', ngay, phan: 'an', studentIds: ['s9'] } });
    if (g.status !== 200 || g.data.daGui !== 1) throw new Error(`Không gửi được phần ăn uống ngày ${ngay}: ${JSON.stringify(g.data)}`);
  }
}

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
    // Đổi 16/10 (góp ý mục 7): "Bỏ tab bú bình trong mục ăn uống".
    check('nhóm nhà trẻ KHÔNG còn bước Bú bình trong tab Ăn uống', await page.locator('.seg [data-buoc="sua"]').count() === 0);
    const buoc = (await page.locator('.seg [data-buoc]').allInnerTexts()).map(t => t.trim());
    check('tab Ăn uống đủ năm bữa đúng tên của trường (thực đơn hôm nay chỉ ba bữa, nhãn cũ "Bữa xế"), rồi Ghi chú',
      buoc.join(' | ') === 'Bữa sáng | Bữa phụ sáng | Bữa trưa | Bữa phụ chiều | Bữa sữa chiều | Ghi chú', buoc);
    check('có nút Gửi cho gia đình', await page.locator('#nk-gui').count() === 1);
    await page.click('.seg [data-buoc="bua:breakfast"]');
    await page.waitForTimeout(800);
    check('bước Bữa sáng hiện món của thực đơn hôm nay ngay dưới tên bữa',
      /Bữa sáng\s*\n?[^\n]*Bánh bao xá xíu/.test(await page.locator('#view .card').nth(1).innerText()),
      await page.locator('#view .card').nth(1).innerText());
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
    // Góp ý 20/10 (J2): trường bỏ theo dõi bỉm — tab Vệ sinh chỉ còn ghi giờ
    // đi vệ sinh, không còn ô chọn "Việc". Xem test/phan-hoi-2010-dot1g-giao-dien.test.mjs.
    await page.fill('#nk-vs-gio', '09:15');
    await page.selectOption('#nk-vs-poo', '1');
    await page.click('#nk-vs-ghi');
    await page.waitForTimeout(1500);
    const sau = await chu();
    check('hai thẻ hiện mốc 09:15 đi vệ sinh', (sau.match(/09:15\s*Đi vệ sinh · có đi ngoài/g) || []).length === 2, sau.slice(0, 400));
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

    // Góp ý 16/10, mục 7 — từng thẻ ngày, tra theo đúng ngày.
    const the = await page.evaluate((ngay) => {
      const ra = {};
      for (const c of document.querySelectorAll('#view .card')) {
        const tieuDe = c.querySelector('.card-title');
        for (const [k, v] of Object.entries(ngay)) {
          if (tieuDe && tieuDe.innerText.trim().startsWith(UI.fmtDate(v))) ra[k] = c.innerText;
        }
      }
      return ra;
    }, { nay: HOM_NAY, qua: HOM_QUA, kia: HOM_KIA });
    check('gia đình đọc "Bữa sáng: Bánh bao xá xíu — con ăn hết"', /Bữa sáng: Bánh bao xá xíu — con ăn hết/.test(the.qua || ''), the.qua);
    check('thực đơn ghi "Bữa xế" mà gia đình đọc "Bữa phụ chiều" kèm món',
      /Bữa phụ chiều: Chè đậu xanh/.test(the.qua || '') && !/Bữa xế/.test(the.qua || ''), the.qua);
    check('đủ năm bữa, bữa cô chưa ghi thì nói "cô chưa ghi"',
      ['Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Bữa sữa chiều'].every(t => (the.qua || '').includes(t))
      && /Bữa phụ sáng — cô chưa ghi/.test(the.qua || ''), the.qua);
    check('ngày mới không có số bú bình: KHÔNG còn dòng Bú bình', !!the.qua && !/Bú bình/.test(the.qua), the.qua);
    check('ngày bản đã gửi có số bú bình: gia đình VẪN thấy dòng Bú bình',
      /Bú bình\s*\n?\s*2 lần · 120 ml/.test(the.kia || ''), the.kia);
    check('hôm nay cũng không có dòng Bú bình', !!the.nay && !/Bú bình/.test(the.nay), the.nay);
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
