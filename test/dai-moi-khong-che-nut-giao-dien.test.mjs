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
//   [7c] Thanh điều hướng dưới đáy THEO VAI (Đ258-N): gia đình có ô Điểm
//       danh; cô có ô "Ghi nhanh" nổi ở giữa mà không che dải, không làm
//       thanh cao lên; quản trị vẫn đúng năm ô cũ kể cả "Quay lại"; phần
//       nào tắt thì ô của nó không hiện.
//   [8] Không lỗi JS nào.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, CHROMIUM,
  taoQuanTri, taoReq, taoLogin, tatPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dai-moi-khong-che-nut');
sinhDuLieu(DIR);
// Tài khoản quản trị cho mục [7c]: thanh điều hướng của quản trị phải y như cũ.
const MK_TAM_QUAN_TRI = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const MK_QUAN_TRI = 'quantri2026';
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

async function dangNhap(page, ten, matKhau = '123456') {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', ten);
  await page.fill('#lg-pass', matKhau);
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
for (const [rong, cao] of [[320, 568], [360, 640], [375, 667], [390, 844], [420, 900], [1280, 800]]) {
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

  // DẢI KHÔNG ĐƯỢC ĐÈ LÊN THANH ĐIỀU HƯỚNG (Đ256). Trên màn rộng từ 375px
  // trở xuống, chữ của năm mục ("Thông báo", "Trang chủ"…) từng rớt xuống hai
  // dòng: thanh cao 89px thay vì 71px, trong khi dải, hộp báo nổi và nút nổi
  // đều đặt theo chiều cao một dòng — dải đè lên mép trên của thanh 3px.
  if (rong < 700) {
    const t = await page.evaluate(() => {
      const hop = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), cao: Math.round(r.height) }; };
      const nav = document.getElementById('bottom-nav');
      const muc = [...nav.querySelectorAll('.nav-item')];
      return {
        thanh: hop(nav), dai: hop(document.getElementById('push-banner')), rongKhung: document.documentElement.clientWidth,
        soMuc: muc.length,
        // Mỗi mục: chữ có rớt dòng không (cao hơn mục thấp nhất), có tràn ra ngoài mục hay ngoài khung không.
        muc: muc.map(e => ({ chu: e.textContent.trim().replace(/\s+/g, ' '), ...hop(e), tranChu: e.scrollWidth > e.clientWidth + 1 })),
        tranNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    check(`${khung}: thanh điều hướng có đủ năm mục, chữ MỘT dòng (thanh không cao quá 72px)`,
      t.soMuc === 5 && t.thanh.cao <= 72, { cao: t.thanh.cao, muc: t.muc });
    check(`${khung}: không mục nào tràn chữ, tràn khung hay chồng lên mục bên cạnh`,
      !t.tranNgang && t.muc.every(m => !m.tranChu && m.left >= 0 && m.right <= t.rongKhung)
      && t.muc.every((m, i) => i === 0 || m.left >= t.muc[i - 1].right), t.muc);
    check(`${khung}: dải mời cài KHÔNG đè lên thanh điều hướng`, t.dai.bottom <= t.thanh.top, { dai: t.dai, thanh: t.thanh });
  }

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
console.log('\n[7b] IPHONE CÓ VẠCH HOME — vùng an toàn đáy 34px (Đ256)');
{
  // Chromium không có vùng an toàn: `env(safe-area-inset-bottom)` luôn bằng 0,
  // nên mọi phép đo ở trên đều là của máy KHÔNG có vạch Home. Trên iPhone đời
  // mới chạy như app đã cài, thanh điều hướng cao thêm 34px. Giả đúng điều đó
  // bằng cách thay mọi `env(safe-area-inset-bottom…)` trong tệp CSS được tải
  // về thành `34px` — mọi phép tính của trang chạy y như trên máy thật.
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(`375x812 vạch Home: ${e.message}`));
  let daThay = 0;
  await page.route('**/css/app.css*', async (route) => {
    const r = await route.fetch();
    const goc = await r.text();
    const moi = goc.replace(/env\(\s*safe-area-inset-bottom\s*(,[^)]*)?\)/g, () => { daThay += 1; return '34px'; });
    await route.fulfill({ response: r, body: moi });
  });
  await page.goto(sv.BASE);
  await dangNhap(page, 'phuhuynh');
  await page.waitForSelector('#push-banner', { timeout: 10000 });
  await moManHinh(page, '#/settings', NUT_DANG_XUAT);
  check('đối chứng — tệp CSS được tải có chỗ tính vùng an toàn đáy để thay', daThay >= 1, daThay);

  const t = await page.evaluate(() => {
    const hop = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), cao: Math.round(r.height) }; };
    const bao = document.getElementById('toast-zone');
    return {
      thanh: hop(document.getElementById('bottom-nav')), dai: hop(document.getElementById('push-banner')),
      dayHopBao: bao ? Math.round(parseFloat(getComputedStyle(bao).bottom)) : null,
    };
  });
  check('đối chứng — thanh điều hướng cao thêm đúng 34px (105px)', t.thanh.cao === 105, t.thanh);
  check('dải mời cài KHÔNG đè lên thanh điều hướng', t.dai.bottom <= t.thanh.top, t);
  check('hộp báo nổi (toast) đặt TRÊN thanh điều hướng', t.dayHopBao !== null && t.dayHopBao >= t.thanh.cao, t);

  const d = await doNutCuoiTrang(page, NUT_DANG_XUAT);
  check('cuộn hết trang — nút Đăng xuất không nằm dưới dải, không nằm dưới thanh, bấm trúng nút',
    d.coNut && d.trongKhung && !d.duoiDai && !d.duoiThanh && d.tamLaNut, d);
  await ctx.close();
}

// ===========================================================================
console.log('\n[7c] THANH ĐIỀU HƯỚNG THEO VAI (Đ258-N)');
{
  // Gia đình mở app chủ yếu để xem con đã tới lớp chưa; cô thì ghi nhanh cả
  // chục lần một ngày. Trước Đ258 cả ba vai dùng chung năm ô, ô đầu là "Quay
  // lại" — thứ điện thoại nào cũng đã có sẵn.
  const PHU_HUYNH = ['Trang chủ', 'Điểm danh', 'Thông báo', 'Nhắn tin', 'Cài đặt'];
  const CO = ['Trang chủ', 'Thông báo', 'Ghi nhanh', 'Nhắn tin', 'Cài đặt'];
  const QUAN_TRI = ['Quay lại', 'Trang chủ', 'Thông báo', 'Nhắn tin', 'Cài đặt'];
  const HASH = {
    'Trang chủ': '#/', 'Điểm danh': '#/attendance', 'Thông báo': '#/notifications',
    'Nhắn tin': '#/messages', 'Cài đặt': '#/settings', 'Ghi nhanh': '#/thuchup',
  };
  const giong = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // Đo cả thanh. Vòng tròn của ô nổi nhô ra NGOÀI nút, đo riêng cái nút thì
  // không thấy: `bao` là hộp bao cả nút lẫn mọi thứ vẽ trong nó (để biết nhô
  // lên bao nhiêu), còn chuyện chạm vào thứ khác thì xét TỪNG phần một.
  const doThanh = (page) => page.evaluate(() => {
    const lam = (r) => ({ top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), cao: Math.round(r.height), rong: Math.round(r.width) });
    const hop = (e) => lam(e.getBoundingClientRect());
    const chong = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const tai = (x, y) => document.elementFromPoint(x, y);
    const nav = document.getElementById('bottom-nav');
    const thanh = hop(nav);
    const rongKhung = document.documentElement.clientWidth;
    const dai = [...document.querySelectorAll('.push-banner')].filter(d => getComputedStyle(d).display !== 'none');
    const phanDai = dai.flatMap(d => [d, ...d.querySelectorAll('.pb-text, .pb-bell, .pb-close')]);
    const nutNoiHanhTrinh = document.getElementById('ht-ghi-nhanh');
    const muc = [...nav.querySelectorAll('.nav-item')].map((e) => {
      const ban = e.cloneNode(true);
      ban.querySelectorAll('.nav-badge').forEach(b => b.remove());
      const con = [e, ...e.querySelectorAll(':scope > *')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const cac = con.map(x => x.getBoundingClientRect());
      const bao = {
        top: Math.round(Math.min(...cac.map(r => r.top))), bottom: Math.round(Math.max(...cac.map(r => r.bottom))),
        left: Math.round(Math.min(...cac.map(r => r.left))), right: Math.round(Math.max(...cac.map(r => r.right))),
      };
      // Thứ nhô cao nhất trong ô (với ô nổi là vòng tròn có máy ảnh).
      const dinh = con.reduce((a, x) => (x.getBoundingClientRect().top < a.getBoundingClientRect().top ? x : a), e);
      const d = dinh.getBoundingClientRect();
      const tDinh = tai(d.left + d.width / 2, d.top + d.height / 2);
      const n = e.getBoundingClientRect();
      const tNut = tai(n.left + n.width / 2, n.top + n.height / 2);
      return {
        chu: ban.textContent.trim().replace(/\s+/g, ' '),
        ...hop(e), bao,
        noi: e.classList.contains('nav-noi'), dangChon: e.classList.contains('active'),
        tranChu: e.scrollWidth > e.clientWidth + 1,
        nhoLen: thanh.top - bao.top,
        dinh: { ...hop(dinh), tamX: d.left + d.width / 2, tamY: d.top + d.height / 2 },
        tamDinhLaNo: !!tDinh && e.contains(tDinh),
        tamNutLaNo: !!tNut && e.contains(tNut),
        tam: { x: n.left + n.width / 2, y: n.top + n.height / 2 },
        chongDai: phanDai.filter(p => con.some(x => chong(hop(x), hop(p)))).map(p => p.id || p.className),
        chongNutHanhTrinh: !!nutNoiHanhTrinh && con.some(x => chong(hop(x), hop(nutNoiHanhTrinh))),
      };
    });
    return {
      thanh, rongKhung, muc, nhan: muc.map(m => m.chu), soDai: dai.length,
      tranNgang: document.documentElement.scrollWidth > rongKhung,
      // Chữ và hai nút của dải: thứ nằm trên cùng tại tâm của chúng phải thuộc về dải.
      daiBiChe: dai.flatMap(d => [...d.querySelectorAll('.pb-text, .pb-bell, .pb-close')]
        .filter((p) => { const r = p.getBoundingClientRect(); const t = tai(r.left + r.width / 2, r.top + r.height / 2); return !t || !d.contains(t); })
        .map(p => `${d.id} ${p.className}`)),
    };
  });
  const motDong = (t) => !t.tranNgang
    && t.muc.every(m => !m.tranChu && m.left >= 0 && m.right <= t.rongKhung)
    && t.muc.every((m, i) => i === 0 || m.left >= t.muc[i - 1].right);
  // Bấm theo TOẠ ĐỘ vào từng ô rồi xem địa chỉ. Ô đầu bấm SAU CÙNG: lúc mới
  // đăng nhập đã đứng sẵn ở trang chủ, bấm "Trang chủ" trước thì chẳng đo gì.
  const bamTungO = async (page, t, khung) => {
    for (const m of [...t.muc.slice(1), t.muc[0]]) {
      if (!HASH[m.chu]) continue;
      await page.mouse.click(m.tam.x, m.tam.y);
      // Chờ cả địa chỉ LẪN thanh vẽ lại: địa chỉ đổi trước, màn và thanh vẽ sau.
      const toi = await page.waitForFunction(([h, chu]) => {
        const chon = [...document.querySelectorAll('#bottom-nav .nav-item.active')];
        return (location.hash || '#/') === h && chon.length === 1 && chon[0].textContent.includes(chu);
      }, [HASH[m.chu], m.chu], { timeout: 4000 }).then(() => true, () => false);
      const sau = await doThanh(page);
      const chon = sau.muc.filter(x => x.dangChon).map(x => x.chu);
      check(`${khung}: bấm ô "${m.chu}" thì tới ${HASH[m.chu]}, và đúng ô ấy sáng lên`,
        toi && giong(chon, [m.chu]), { hash: await page.evaluate(() => location.hash), chon });
    }
  };

  let caoThanhGiaDinh = null;
  for (const [rong, cao] of [[320, 568], [360, 640], [390, 844], [420, 900]]) {
    const khung = `${rong}x${cao}`;

    // ---- GIA ĐÌNH ----
    {
      const { ctx, page } = await moMay(rong, cao);
      await dangNhap(page, 'phuhuynh');
      await page.waitForSelector('#push-banner', { timeout: 10000 });
      await moManHinh(page, '#/', '.tile-grid');
      const t = await doThanh(page);
      caoThanhGiaDinh = t.thanh.cao;
      check(`${khung} gia đình: năm ô đúng thứ tự — Trang chủ · Điểm danh · Thông báo · Nhắn tin · Cài đặt`, giong(t.nhan, PHU_HUYNH), t.nhan);
      check(`${khung} gia đình: không có ô nổi, không ô nào nhô khỏi thanh`, t.muc.every(m => !m.noi && m.nhoLen <= 0), t.muc.map(m => [m.chu, m.noi, m.nhoLen]));
      check(`${khung} gia đình: thanh cao đúng 71px như cũ, chữ một dòng`, t.thanh.cao === 71 && motDong(t), { cao: t.thanh.cao, muc: t.muc });
      await bamTungO(page, t, `${khung} gia đình`);
      await ctx.close();
    }

    // ---- CÔ ----
    {
      const { ctx, page } = await moMay(rong, cao);
      await dangNhap(page, 'giaovien');
      await page.waitForSelector('#push-banner', { timeout: 10000 });
      await moManHinh(page, '#/', '.tile-grid');
      const t = await doThanh(page);
      const noi = t.muc.filter(m => m.noi);
      const giua = t.muc[2] || {};
      check(`${khung} cô: năm ô đúng thứ tự — Trang chủ · Thông báo · Ghi nhanh · Nhắn tin · Cài đặt`, giong(t.nhan, CO), t.nhan);
      check(`${khung} cô: đúng MỘT ô nổi, là ô giữa "Ghi nhanh"`, noi.length === 1 && giua.noi === true && giua.chu === 'Ghi nhanh', t.muc.map(m => [m.chu, m.noi]));
      check(`${khung} cô: thanh vẫn cao 71px, bằng thanh của gia đình; chữ một dòng`,
        t.thanh.cao === 71 && t.thanh.cao === caoThanhGiaDinh && motDong(t), { cao: t.thanh.cao, caoThanhGiaDinh, muc: t.muc });
      check(`${khung} cô: ô nổi nhô khỏi mép trên của thanh, nhưng KHÔNG quá 12px`, giua.nhoLen > 0 && giua.nhoLen <= 12, giua);
      // Lệch tối đa 2px: ở 320px cột "Thông báo" phải rộng hơn bốn cột kia một
      // chút cho đủ chữ, nên vòng tròn xê đi hơn 1px; từ 340px trở lên là 0.
      check(`${khung} cô: vòng tròn của ô nổi đủ lớn để bấm (từ 44px) và đứng giữa màn (lệch không quá 2px)`,
        !!giua.dinh && giua.dinh.rong >= 44 && giua.dinh.cao >= 44 && Math.abs(giua.dinh.tamX - t.rongKhung / 2) <= 2, { dinh: giua.dinh, rongKhung: t.rongKhung });
      check(`${khung} cô: tại tâm vòng tròn và tại tâm ô nổi, thứ nằm trên cùng là chính ô ấy`, giua.tamDinhLaNo === true && giua.tamNutLaNo === true, giua);
      check(`${khung} cô: ô nổi KHÔNG chạm dải mời cài, KHÔNG che chữ hay nút của dải`,
        t.soDai === 1 && !!giua.chongDai && giua.chongDai.length === 0 && t.daiBiChe.length === 0, { chongDai: giua.chongDai, daiBiChe: t.daiBiChe });
      check(`${khung} cô: không ô thường nào nhô khỏi thanh`, t.muc.filter(m => !m.noi).every(m => m.nhoLen <= 0), t.muc.map(m => [m.chu, m.nhoLen]));

      // Bấm theo toạ độ vào TÂM VÒNG TRÒN (phần nhô lên), không phải tâm ô.
      if (giua.dinh) await page.mouse.click(giua.dinh.tamX, giua.dinh.tamY);
      const toiGhiNhanh = await page.waitForFunction(() => location.hash === '#/thuchup', null, { timeout: 4000 }).then(() => true, () => false);
      check(`${khung} cô: bấm vào vòng tròn thì mở Ghi nhanh`, toiGhiNhanh, await page.evaluate(() => location.hash));
      await bamTungO(page, t, `${khung} cô`);

      // Màn Hành trình có sẵn một nút nổi "Ghi nhanh" ở góc phải (mục [7]).
      // Hết dải thì nút ấy về chỗ cũ, sát thanh: ô nổi không được chạm vào nó.
      await moManHinh(page, '#/hanhtrinh', '#ht-ghi-nhanh');
      await page.click('#pb-close');
      await page.waitForFunction(() => !document.querySelector('.push-banner'), null, { timeout: 5000 });
      await page.waitForTimeout(150);
      const h = await doThanh(page);
      const giuaH = h.muc.find(m => m.noi) || {};
      check(`${khung} cô: ở Hành trình, ô nổi KHÔNG chạm nút nổi "Ghi nhanh" của màn ấy`, giuaH.chongNutHanhTrinh === false, giuaH);
      await ctx.close();
    }
  }

  // ---- MÀN RỘNG: thanh nằm ngang, ô nổi không được làm thanh cao lên ----
  {
    const mo = async (ten, mk) => {
      const { ctx, page } = await moMay(1280, 800);
      await dangNhap(page, ten, mk);
      await moManHinh(page, '#/', '.tile-grid');
      return { ctx, t: await doThanh(page) };
    };
    const gd = await mo('phuhuynh');
    const co = await mo('giaovien');
    check('1280x800 cô: vẫn năm ô ấy, ô giữa là "Ghi nhanh"', giong(co.t.nhan, CO) && co.t.muc[2].noi === true, co.t.nhan);
    check('1280x800 cô: thanh cao bằng thanh của gia đình, chữ một dòng, ô nổi không nhô quá 12px',
      co.t.thanh.cao === gd.t.thanh.cao && motDong(co.t) && co.t.muc.every(m => m.nhoLen <= 12) && co.t.muc[2].tamNutLaNo === true,
      { co: co.t.thanh, giaDinh: gd.t.thanh, muc: co.t.muc });
    await gd.ctx.close();
    await co.ctx.close();
  }

  // ---- QUẢN TRỊ: ĐÚNG NĂM Ô CŨ, KỂ CẢ "QUAY LẠI" ----
  {
    const req = taoReq(sv.BASE);
    const d0 = await taoLogin(req)('hieutruong', MK_TAM_QUAN_TRI);
    const doi = await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: MK_QUAN_TRI } });
    check('đối chứng — tài khoản quản trị đặt được mật khẩu riêng', doi.status === 200, doi.status);
    for (const [rong, cao] of [[320, 568], [390, 844]]) {
      const khung = `${rong}x${cao}`;
      const { ctx, page } = await moMay(rong, cao);
      await dangNhap(page, 'hieutruong', MK_QUAN_TRI);
      await moManHinh(page, '#/', '.tile-grid');
      const t = await doThanh(page);
      check(`${khung} quản trị: đúng năm ô cũ, cùng thứ tự — Quay lại · Trang chủ · Thông báo · Nhắn tin · Cài đặt`, giong(t.nhan, QUAN_TRI), t.nhan);
      check(`${khung} quản trị: không có ô nổi; thanh cao 71px, chữ một dòng`,
        t.muc.every(m => !m.noi && m.nhoLen <= 0) && t.thanh.cao === 71 && motDong(t), { cao: t.thanh.cao, muc: t.muc });
      await bamTungO(page, t, `${khung} quản trị`);
      // "Quay lại" là lùi một bước, không phải một địa chỉ: đi Thông báo rồi
      // Cài đặt, bấm "Quay lại" thì phải về Thông báo.
      const tim = (chu) => t.muc.find(m => m.chu === chu).tam;
      await page.mouse.click(tim('Thông báo').x, tim('Thông báo').y);
      await page.waitForFunction(() => location.hash === '#/notifications', null, { timeout: 4000 }).catch(() => {});
      await page.mouse.click(tim('Cài đặt').x, tim('Cài đặt').y);
      await page.waitForFunction(() => location.hash === '#/settings', null, { timeout: 4000 }).catch(() => {});
      await page.mouse.click(tim('Quay lại').x, tim('Quay lại').y);
      const lui = await page.waitForFunction(() => location.hash === '#/notifications', null, { timeout: 4000 }).then(() => true, () => false);
      check(`${khung} quản trị: bấm "Quay lại" thì lùi về màn vừa rời`, lui, await page.evaluate(() => location.hash));
      await ctx.close();
    }
  }

  // ---- PHẦN NÀO TẮT THÌ Ô CỦA NÓ KHÔNG HIỆN ----
  // Mục này ĐỨNG CUỐI: nó tắt phân hệ trong cơ sở dữ liệu của cả bài.
  {
    const nhanCua = async (ten, rong, cao) => {
      const { ctx, page } = await moMay(rong, cao);
      await dangNhap(page, ten);
      await moManHinh(page, '#/', '.tile-grid');
      return { ctx, page, t: await doThanh(page) };
    };

    tatPhanHe(DIR, ['thuchup']);
    for (const [rong, cao] of [[320, 568], [390, 844]]) {
      const khung = `${rong}x${cao}`;
      const { ctx, page, t } = await nhanCua('giaovien', rong, cao);
      check(`${khung} cô, Ghi nhanh TẮT: chỗ giữa là ô "Điểm danh" THƯỜNG — không nổi, không nhô`,
        giong(t.nhan, ['Trang chủ', 'Thông báo', 'Điểm danh', 'Nhắn tin', 'Cài đặt']) && t.muc.every(m => !m.noi && m.nhoLen <= 0),
        t.muc.map(m => [m.chu, m.noi, m.nhoLen]));
      check(`${khung} cô, Ghi nhanh TẮT: thanh vẫn cao 71px, chữ một dòng`, t.thanh.cao === 71 && motDong(t), { cao: t.thanh.cao, muc: t.muc });
      await bamTungO(page, t, `${khung} cô, Ghi nhanh tắt`);
      await ctx.close();
    }
    {
      const { ctx, t } = await nhanCua('phuhuynh', 390, 844);
      check('gia đình, Ghi nhanh TẮT: năm ô không đổi', giong(t.nhan, PHU_HUYNH), t.nhan);
      await ctx.close();
    }

    tatPhanHe(DIR, ['diemdanh']);
    {
      const { ctx, t } = await nhanCua('giaovien', 390, 844);
      check('cô, Ghi nhanh và Điểm danh CÙNG TẮT: bỏ hẳn ô giữa, còn bốn ô',
        giong(t.nhan, ['Trang chủ', 'Thông báo', 'Nhắn tin', 'Cài đặt']) && t.muc.every(m => !m.noi), t.nhan);
      await ctx.close();
    }
    {
      const { ctx, t } = await nhanCua('phuhuynh', 390, 844);
      check('gia đình, Điểm danh TẮT: không còn ô Điểm danh', giong(t.nhan, ['Trang chủ', 'Thông báo', 'Nhắn tin', 'Cài đặt']), t.nhan);
      await ctx.close();
    }

    tatPhanHe(DIR, ['thongbao', 'nhantin']);
    {
      const { ctx, t } = await nhanCua('phuhuynh', 390, 844);
      check('gia đình, Thông báo và Nhắn tin cũng TẮT: chỉ còn Trang chủ · Cài đặt', giong(t.nhan, ['Trang chủ', 'Cài đặt']), t.nhan);
      await ctx.close();
    }
    {
      const { ctx, page } = await moMay(390, 844);
      await dangNhap(page, 'hieutruong', MK_QUAN_TRI);
      await moManHinh(page, '#/', '.tile-grid');
      const t = await doThanh(page);
      check('quản trị, Thông báo và Nhắn tin TẮT: còn Quay lại · Trang chủ · Cài đặt (như cũ)', giong(t.nhan, ['Quay lại', 'Trang chủ', 'Cài đặt']), t.nhan);
      await ctx.close();
    }
  }
}

// ===========================================================================
console.log('\n[8] KHÔNG LỖI JS');
check('không lỗi JS nào trong suốt bài', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
