// Dải mời "Cài vào màn hình chính" không được che nút cuối trang (Đ253).
//
// Chạy bằng:  node test/dai-moi-khong-che-nut-giao-dien.test.mjs
//
// LỖI ĐÃ CÓ THẬT: dải mời cài là một lớp nổi ở đáy màn hình, còn trang thì
// không chừa chỗ cho nó. Cuộn hết trang Cài đặt, nút "Đăng xuất" nằm ngay
// DƯỚI dải: nhìn thấy mờ mờ mà bấm không tới. Ai không biết phải tắt dải
// trước thì không đăng xuất được — trên điện thoại nhỏ là chắc chắn gặp.
// Cùng lỗi ở mọi màn có nút nằm cuối trang (sổ điểm danh của cô, kế hoạch
// của bé…), và ở dải "Đã có bản mới" dùng chung kiểu trình bày.
//
// BÀI NÀY KHÔNG TẮT DẢI. Gần như mọi bài giao diện khác gọi `tatBannerMoiCai`
// để dải khỏi che nút chúng định bấm — nghĩa là chính lỗi này được che đi
// trong suốt bộ kiểm thử. Ở đây dải phải hiện, như trên máy của người mới.
//
// ĐO BẰNG HÌNH HỌC, không chờ Playwright hết giờ: cuộn hết trang như người
// dùng, rồi hỏi trình duyệt "tại tâm cái nút, thứ nằm trên cùng là gì".
//
//   [1] Bốn khung điện thoại + một khung rộng: nút Đăng xuất không nằm dưới
//       dải, không nằm dưới thanh điều hướng; dải vẫn hiện, vẫn đúng chữ.
//   [2] Bấm thật vào nút (theo toạ độ, không nhờ Playwright cuộn hộ) thì về
//       màn đăng nhập.
//   [3] Dải "Đã có bản mới" — cùng lớp, cùng luật.
//   [4] Màn của cô: nút cuối sổ điểm danh cũng không bị che.
//   [5] Dải vẫn ở đúng chỗ cũ khi chưa cuộn; phòng nhắn tin vẫn ẩn dải.
//   [6] Đăng xuất rồi đăng nhập lại mà không tải trang: vẫn đúng MỘT dải,
//       và nút ✕ của nó vẫn tắt được.
//   [7] Nút nổi "Ghi nhanh" ở Hành trình: có dải thì đứng ngay TRÊN dải, bấm
//       được, không che chữ hay nút ✕ của dải; hết dải thì về đúng chỗ cũ.
//   [8] Không lỗi JS nào.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, CHROMIUM,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dai-moi-khong-che-nut');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4797), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];

async function moMay(rong, cao) {
  const dienThoai = rong < 700;
  const ctx = await browser.newContext({
    viewport: { width: rong, height: cao }, isMobile: dienThoai, hasTouch: dienThoai,
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(`${rong}x${cao}: ${e.message}`));
  await page.goto(sv.BASE);
  return { ctx, page };
}

async function dangNhap(page, ten) {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', ten);
  await page.fill('#lg-pass', '123456');
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}

async function moManHinh(page, hash, choThay) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(choThay, { timeout: 10000 });
  // Dải trượt lên bằng hoạt hoạ; đo lúc nó đã đứng yên.
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 10000 });
}

// Cuộn hết trang như người dùng vuốt tới cuối, rồi đo cái nút so với mọi dải
// nổi và thanh điều hướng. Trả về đủ số để lời báo đỏ đọc là hiểu.
async function doNutCuoiTrang(page, chonNut) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  return page.evaluate((chon) => {
    const nut = document.querySelector(chon);
    if (!nut) return { coNut: false };
    const hop = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
    const n = hop(nut);
    const tam = { x: (n.left + n.right) / 2, y: (n.top + n.bottom) / 2 };
    const tren = document.elementFromPoint(tam.x, tam.y);
    const chong = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const dai = [...document.querySelectorAll('.push-banner')]
      .filter(d => getComputedStyle(d).display !== 'none').map(d => ({ id: d.id, ...hop(d) }));
    const thanh = hop(document.getElementById('bottom-nav'));
    return {
      coNut: true, nut: n, tam, dai, thanh, caoKhung: innerHeight,
      trenCung: tren ? `${tren.tagName.toLowerCase()}${tren.id ? '#' + tren.id : ''}.${tren.className}` : null,
      tamLaNut: !!tren && (tren === nut || nut.contains(tren)),
      duoiDai: dai.some(d => chong(n, d)),
      duoiThanh: chong(n, thanh),
      trongKhung: n.top >= 0 && n.bottom <= innerHeight,
    };
  }, chonNut);
}

const NUT_DANG_XUAT = 'button[onclick="App.logout()"]';
const CHU_DAI = 'Cài vào màn hình chính cho mở nhanh';
const NUT_CA_NHOM = 'button[onclick="App.views.attendance.markAll()"]';

// ===========================================================================
console.log('\n[1][2] NÚT ĐĂNG XUẤT Ở MÀN CÀI ĐẶT — dải mời cài đang hiện');
for (const [rong, cao] of [[320, 568], [360, 640], [390, 844], [420, 900], [1280, 800]]) {
  const khung = `${rong}x${cao}`;
  const { ctx, page } = await moMay(rong, cao);
  await dangNhap(page, 'phuhuynh');
  await page.waitForSelector('#push-banner', { timeout: 10000 });
  await moManHinh(page, '#/settings', NUT_DANG_XUAT);

  // Chưa cuộn: dải phải ở đúng chỗ cũ — đáy dải cách đáy khung 86px (chiều
  // cao thanh điều hướng 68 + 18), canh giữa, rộng như cũ. Sửa lỗi che nút
  // không được đổi chỗ của dải.
  const luc0 = await page.evaluate(() => {
    const d = document.getElementById('push-banner').getBoundingClientRect();
    return {
      chu: document.querySelector('#push-banner .pb-text span').textContent,
      cachDay: Math.round(innerHeight - d.bottom), top: Math.round(d.top),
      lechGiua: Math.round(Math.abs((d.left + d.right) / 2 - document.documentElement.clientWidth / 2)),
      rong: Math.round(d.width), rongKhung: innerWidth, cuon: scrollY,
    };
  });
  check(`${khung}: dải mời cài đang hiện, đúng chữ`, luc0.chu === CHU_DAI, luc0.chu);
  check(`${khung}: chưa cuộn — dải ở đúng chỗ cũ: sát trên thanh điều hướng, canh giữa`,
    luc0.cuon === 0 && luc0.top > 0 && luc0.cachDay === 86 && luc0.lechGiua <= 1
    && luc0.rong === Math.round(Math.min(430, rong * 0.92)), luc0);

  const do1 = await doNutCuoiTrang(page, NUT_DANG_XUAT);
  check(`${khung}: cuộn hết trang — nút Đăng xuất nằm trọn trong khung`, do1.coNut && do1.trongKhung, do1);
  check(`${khung}: nút Đăng xuất KHÔNG nằm dưới dải mời cài`, do1.coNut && do1.dai.length === 1 && !do1.duoiDai, do1);
  check(`${khung}: nút Đăng xuất KHÔNG nằm dưới thanh điều hướng`, do1.coNut && !do1.duoiThanh, do1);
  check(`${khung}: tại tâm nút, thứ nằm trên cùng là chính cái nút`, do1.coNut && do1.tamLaNut, do1.trenCung);
  const conDai = await page.evaluate(() => {
    const d = document.getElementById('push-banner').getBoundingClientRect();
    return d.height > 0 && d.top >= 0 && d.bottom <= innerHeight;
  });
  check(`${khung}: cuộn hết trang — dải vẫn hiện trong khung`, conDai);

  // Bấm theo TOẠ ĐỘ: Playwright không cuộn hộ, không chờ hộ. Thứ gì đang nằm
  // trên tâm nút thì thứ đó nhận cú bấm — đúng như ngón tay của phụ huynh.
  if (do1.coNut) await page.mouse.click(do1.tam.x, do1.tam.y);
  const veDangNhap = await page.waitForSelector('#lg-user', { timeout: 4000 }).then(() => true, () => false);
  check(`${khung}: bấm thật vào nút thì về màn đăng nhập`, veDangNhap);
  await page.screenshot({ path: `${DIR}/sau-bam-${khung}.png` }).catch(() => {});
  await ctx.close();
}

// ===========================================================================
console.log('\n[3] DẢI "ĐÃ CÓ BẢN MỚI" — cùng lớp, cùng luật');
{
  const { ctx, page } = await moMay(360, 640);
  await dangNhap(page, 'phuhuynh');
  await page.waitForSelector('#push-banner', { timeout: 10000 });
  // Tắt dải mời cài bằng đúng nút ✕ của nó, để chỉ còn dải bản mới.
  await page.click('#pb-close');
  await page.evaluate(() => App.baoCoBanMoi());
  await page.waitForSelector('#ban-moi-banner', { timeout: 5000 });
  await moManHinh(page, '#/settings', NUT_DANG_XUAT);
  const d = await doNutCuoiTrang(page, NUT_DANG_XUAT);
  check('chỉ còn đúng dải "Đã có bản mới"', d.coNut && d.dai.length === 1 && d.dai[0].id === 'ban-moi-banner', d.dai);
  check('nút Đăng xuất KHÔNG nằm dưới dải "Đã có bản mới"', d.coNut && !d.duoiDai && !d.duoiThanh, d);
  check('tại tâm nút, thứ nằm trên cùng là chính cái nút', d.coNut && d.tamLaNut, d.trenCung);
  await ctx.close();
}

// ===========================================================================
console.log('\n[4] MÀN CỦA CÔ — nút cuối sổ điểm danh');
{
  const { ctx, page } = await moMay(360, 640);
  await dangNhap(page, 'giaovien');
  await page.waitForSelector('#push-banner', { timeout: 10000 });
  await moManHinh(page, '#/attendance', NUT_CA_NHOM);
  const d = await doNutCuoiTrang(page, NUT_CA_NHOM);
  check('có nút "Cả nhóm có mặt" cuối sổ điểm danh', d.coNut, d);
  check('nút "Cả nhóm có mặt" KHÔNG nằm dưới dải, KHÔNG nằm dưới thanh điều hướng', d.coNut && d.dai.length === 1 && !d.duoiDai && !d.duoiThanh, d);
  check('tại tâm nút "Cả nhóm có mặt", thứ nằm trên cùng là chính cái nút', d.coNut && d.tamLaNut, d.trenCung);

  // ===========================================================================
  console.log('\n[5] PHÒNG NHẮN TIN VẪN ẨN DẢI; TẮT DẢI THÌ TRANG THÔI CHỪA CHỖ');
  await page.evaluate(() => { location.hash = '#/messages'; });
  await page.waitForSelector('.chat-list-row', { timeout: 10000 });
  await page.click('.chat-list-row');
  await page.waitForSelector('.chat-screen', { timeout: 10000 });
  const trongPhong = await page.evaluate(() => ({
    daiAn: getComputedStyle(document.getElementById('push-banner')).display === 'none',
    cuonDuoc: document.documentElement.scrollHeight - innerHeight,
  }));
  check('trong phòng nhắn tin dải vẫn ẩn', trongPhong.daiAn, trongPhong);
  check('trong phòng nhắn tin trang không cuộn thêm được (ô nhập vẫn sát đáy)', trongPhong.cuonDuoc <= 0, trongPhong);

  await moManHinh(page, '#/settings', NUT_DANG_XUAT);
  const coDai = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.click('#pb-close');
  const hetDai = await page.evaluate(() => ({
    conDai: !!document.getElementById('push-banner'),
    cao: document.documentElement.scrollHeight,
    nho: localStorage.getItem('casa.moi-cai-app-da-tat'),
  }));
  check('bấm ✕ thì dải biến mất và máy nhớ là đã tắt', !hetDai.conDai && hetDai.nho === '1', hetDai);
  check('tắt dải rồi thì trang thôi chừa chỗ cho nó', hetDai.cao < coDai, { coDai, hetDai: hetDai.cao });
  const sauTat = await doNutCuoiTrang(page, NUT_DANG_XUAT);
  check('không còn dải: nút Đăng xuất vẫn bấm tới được', sauTat.coNut && sauTat.dai.length === 0 && sauTat.tamLaNut && !sauTat.duoiThanh, sauTat);
  await ctx.close();
}

// ===========================================================================
console.log('\n[6] ĐĂNG XUẤT RỒI ĐĂNG NHẬP LẠI, KHÔNG TẢI TRANG — vẫn đúng MỘT dải, ✕ vẫn tắt được');
{
  // LỖI ĐÃ CÓ THẬT: mỗi lần đăng nhập dựng thêm một dải, mà dải của lần trước
  // vẫn còn trong trang. Hai dải trùng mã: nút ✕ của dải nằm trên không có
  // tay nghe nào (tay nghe gắn nhầm vào dải cũ nằm dưới), nên bấm ✕ không
  // tắt được gì. Máy dùng chung ở phòng giáo viên là gặp ngay.
  const { ctx, page } = await moMay(360, 640);
  const dai = () => page.evaluate(() => ({
    theoMa: document.querySelectorAll('#push-banner').length,
    theoLop: document.querySelectorAll('.push-banner').length,
    chu: [...document.querySelectorAll('.push-banner .pb-text')].map(d => d.textContent),
  }));
  const motDai = (d) => d.theoMa === 1 && d.theoLop === 1 && d.chu[0] === `My Casa${CHU_DAI}`;
  // Cùng hàm mà nút Đăng xuất gọi; cú bấm thật vào nút đã đo ở mục [2].
  const dangXuat = async () => {
    await page.evaluate(() => App.logout());
    await page.waitForSelector('#lg-user', { timeout: 10000 });
  };

  await dangNhap(page, 'phuhuynh');
  await page.waitForSelector('#push-banner', { timeout: 10000 });
  check('đối chứng — đăng nhập lần đầu: đúng một dải', motDai(await dai()), await dai());

  for (const [vong, ten] of [[1, 'phuhuynh'], [2, 'phuhuynh'], [3, 'giaovien']]) {
    await dangXuat();
    check(`vòng ${vong}: ở màn đăng nhập dải vẫn còn, vẫn đúng một`, motDai(await dai()), await dai());
    await dangNhap(page, ten);
    check(`vòng ${vong}: đăng nhập lại (${ten}) không tải trang — vẫn đúng MỘT dải`, motDai(await dai()), await dai());
  }
  // Vòng 3 là NGƯỜI KHÁC đăng nhập trên cùng máy: dải của người trước ở lại
  // là đúng — nó mời cài app, không mang tên hay dữ liệu của ai (phép kiểm
  // `motDai` ở trên so nguyên văn chữ của dải).

  // Bấm ✕ theo TOẠ ĐỘ: dải nào nằm trên thì dải đó nhận cú bấm.
  const diem = await page.evaluate(() => {
    const r = document.getElementById('pb-close').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(diem.x, diem.y);
  await page.waitForTimeout(200);
  const sauTat = await page.evaluate(() => ({
    conDai: document.querySelectorAll('.push-banner').length,
    nho: localStorage.getItem('casa.moi-cai-app-da-tat'),
  }));
  check('bấm ✕ một lần: KHÔNG dải nào còn lại, máy nhớ là đã tắt', sauTat.conDai === 0 && sauTat.nho === '1', sauTat);

  await dangXuat();
  await dangNhap(page, 'phuhuynh');
  await page.waitForTimeout(300);
  check('đã tắt rồi thì đăng nhập lại không mời nữa', (await dai()).theoLop === 0, await dai());
  await ctx.close();
}

// ===========================================================================
console.log('\n[7] NÚT NỔI "GHI NHANH" Ở HÀNH TRÌNH — không nằm dưới dải, không che dải');
{
  // LỖI ĐÃ CÓ THẬT: nút "Ghi nhanh" đứng cố định ở góc dưới phải, đúng chỗ dải
  // mời cài chiếm trên điện thoại, và nằm DƯỚI dải. Cô thấy một mẩu nút ló ra
  // dưới dải mà bấm vào thì trúng dải. Chừa chỗ cuối trang không cứu được: cả
  // hai đều đứng yên theo màn hình, không theo trang.
  const NUT = '#ht-ghi-nhanh';
  const doNutNoi = (page) => page.evaluate(() => {
    const hop = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
    const chong = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const tren = (e) => { const r = e.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); };
    const nut = document.getElementById('ht-ghi-nhanh');
    const n = hop(nut);
    const dai = [...document.querySelectorAll('.push-banner')].filter(d => getComputedStyle(d).display !== 'none');
    const tNut = tren(nut);
    return {
      nut: n, tam: { x: (n.left + n.right) / 2, y: (n.top + n.bottom) / 2 },
      dai: dai.map(d => ({ id: d.id, ...hop(d) })),
      cachDay: innerHeight - n.bottom, cachPhai: document.documentElement.clientWidth - n.right,
      tamLaNut: !!tNut && (tNut === nut || nut.contains(tNut)),
      chongDai: dai.some(d => chong(n, hop(d))),
      trongKhung: n.top >= 0 && n.bottom <= innerHeight,
      // Chữ và hai nút của dải: thứ nằm trên cùng tại tâm của chúng phải thuộc về dải.
      daiBiChe: dai.flatMap(d => [...d.querySelectorAll('.pb-text, .pb-bell, .pb-close')]
        .filter(e => { const t = tren(e); return !t || !d.contains(t); }).map(e => `${d.id} ${e.className}`)),
    };
  });
  const dungYen = (page) => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 10000 });
  const khongCheNhau = (d) => d.dai.length >= 1 && d.tamLaNut && !d.chongDai && d.trongKhung && d.daiBiChe.length === 0;
  // Chỗ CŨ của nút, đo trên mã trước khi sửa: đáy nút cách đáy khung 76px,
  // mép phải cách mép phải khung 16px.
  const choCu = (d) => d.cachDay === 76 && d.cachPhai === 16 && d.tamLaNut;

  for (const [rong, cao] of [[320, 568], [360, 640], [390, 844], [420, 900]]) {
    const khung = `${rong}x${cao}`;
    const { ctx, page } = await moMay(rong, cao);
    await dangNhap(page, 'giaovien');
    await page.waitForSelector('#push-banner', { timeout: 10000 });
    await moManHinh(page, '#/hanhtrinh', NUT);
    let d = await doNutNoi(page);
    check(`${khung}: có dải — nút Ghi nhanh KHÔNG nằm dưới dải, KHÔNG che chữ hay nút của dải`, khongCheNhau(d), d);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    d = await doNutNoi(page);
    check(`${khung}: cuộn hết trang cũng vậy`, khongCheNhau(d), d);

    // Bấm theo toạ độ: thứ nằm trên tâm nút nhận cú bấm.
    await page.mouse.click(d.tam.x, d.tam.y);
    const moDuoc = await page.waitForSelector('#modal-overlay', { timeout: 4000 }).then(() => true, () => false);
    check(`${khung}: bấm thật vào nút thì mở biểu mẫu ghi quan sát`, moDuoc);
    if (moDuoc) await page.evaluate(() => UI.closeModal());

    // Tắt dải: nút về ĐÚNG chỗ cũ.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#pb-close');
    await page.waitForFunction(() => !document.querySelector('.push-banner'), null, { timeout: 5000 });
    await page.waitForTimeout(150);
    d = await doNutNoi(page);
    check(`${khung}: không còn dải — nút về đúng chỗ cũ (cách đáy 76, cách phải 16)`, d.dai.length === 0 && choCu(d), d);

    if (rong === 360) {
      // Dải hiện ra SAU khi màn đã vẽ (dải "Đã có bản mới" tới bất cứ lúc nào).
      await page.evaluate(() => App.baoCoBanMoi());
      await page.waitForSelector('#ban-moi-banner', { timeout: 5000 });
      await dungYen(page);
      await page.waitForTimeout(150);
      d = await doNutNoi(page);
      check(`${khung}: dải "Đã có bản mới" hiện sau khi màn đã vẽ — nút tự nhường chỗ`, khongCheNhau(d) && d.dai[0].id === 'ban-moi-banner', d);
      // Đổi tab trong Hành trình (màn vẽ lại): nút vẫn ở trên dải.
      await moManHinh(page, '#/hanhtrinh/ghinhanh', NUT);
      await page.waitForTimeout(300);
      d = await doNutNoi(page);
      check(`${khung}: đổi tab, màn vẽ lại — nút vẫn không nằm dưới dải`, khongCheNhau(d), d);
      await page.click('#bm-de-sau');
      await page.waitForTimeout(200);
      d = await doNutNoi(page);
      check(`${khung}: bấm "để sau" — nút lại về đúng chỗ cũ`, d.dai.length === 0 && choCu(d), d);
    }
    await ctx.close();
  }

  // Mở thẳng app ở màn Hành trình (tải lại trang): dải được dựng SAU khi màn vẽ.
  {
    const { ctx, page } = await moMay(360, 640);
    await dangNhap(page, 'giaovien');
    await moManHinh(page, '#/hanhtrinh', NUT);
    await page.reload();
    await page.waitForSelector(NUT, { timeout: 10000 });
    await page.waitForSelector('#push-banner', { timeout: 10000 });
    await dungYen(page);
    await page.waitForTimeout(300);
    const d = await doNutNoi(page);
    check('tải lại trang ngay ở màn Hành trình — nút vẫn không nằm dưới dải', khongCheNhau(d), d);
    await ctx.close();
  }

  // Màn rộng: dải ở giữa, nút ở góc phải, không chạm nhau — nút KHÔNG được dời.
  {
    const { ctx, page } = await moMay(1280, 800);
    await dangNhap(page, 'giaovien');
    await page.waitForSelector('#push-banner', { timeout: 10000 });
    await moManHinh(page, '#/hanhtrinh', NUT);
    const d = await doNutNoi(page);
    check('1280x800: dải không chạm nút — nút ở nguyên chỗ cũ dù dải đang hiện',
      d.dai.length === 1 && !d.chongDai && choCu(d) && d.daiBiChe.length === 0, d);
    await ctx.close();
  }
}

// ===========================================================================
console.log('\n[8] KHÔNG LỖI JS');
check('không lỗi JS nào trong suốt bài', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
