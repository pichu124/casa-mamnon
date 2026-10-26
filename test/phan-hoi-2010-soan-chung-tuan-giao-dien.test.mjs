// LỐI VÀO SOẠN KẾ HOẠCH CHUNG TUẦN TỪ LỊCH SINH HOẠT (Đ242B — B1), trên
// trình duyệt thật.
//
// Góp ý 20/10 (B1): chủ đề tuần là thứ cô soạn cho Lịch sinh hoạt, nên lối
// vào soạn phải nằm ở chính Lịch sinh hoạt — không phải ở một nút phụ trong
// Hành trình. Bước đầu chỉ thêm lối mới; khi lối mới đã có, đơn vị màn
// hình Đ242B bỏ nút "Chủ đề tuần" cũ ở Hành trình (địa chỉ vẫn mở).
//
// Bốn điều canh:
//   [1] Cô (nhiều nhóm) thấy nút, kể cả khi tuần chưa soạn gì; bấm vào mở màn
//       soạn của ĐÚNG nhóm đang xem ở Lịch sinh hoạt, không phải nhóm đầu.
//   [2] Nhóm CHƯA có lịch sinh hoạt vẫn có nút — chủ đề tuần không đợi lịch.
//   [3] Văn phòng thấy nút (máy chủ cho văn phòng soạn).
//   [4] Gia đình KHÔNG thấy nút, nhưng vẫn thấy khối kế hoạch chung như cũ.
//
// Chạy bằng:  node test/phan-hoi-2010-soan-chung-tuan-giao-dien.test.mjs
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-soan-chung-tuan');
sinhDuLieu(DIR);
batPhanHe(DIR, ['tkb', 'hanhtrinh']);
const mkQT = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7201), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const NUT = '#tkb-soan-chung';
let browser;
try {
  const d0 = await login('htruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('htruong', 'quantri2026')).cookie;
  // Nhóm c2 và c4 có chủ đề tuần này; c1 để trống — để thấy nút ở cả khối có
  // nội dung lẫn khối trống. c4 (Nhà trẻ 1) không có lịch sinh hoạt trong dữ liệu mẫu.
  for (const [classId, chuDe] of [['c2', 'Chủ đề của nhóm Lá 1'], ['c4', 'Chủ đề của nhóm Nhà trẻ 1']]) {
    const r = await req('PUT', '/api/hanhtrinh/chu-de', { cookie: QT, body: { classId, chuDe } });
    if (r.status !== 200) throw new Error(`Không soạn được chủ đề mẫu ${classId}: ${r.status}`);
  }
  const lichC4 = await req('GET', '/api/timetable?classId=c4', { cookie: QT });
  check('đối chứng — nhóm c4 chưa có lịch sinh hoạt', lichC4.status === 404, lichC4.status);

  browser = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  const loiJs = [];
  page.on('pageerror', e => loiJs.push(e.message));

  const dangNhap = async (u, p) => {
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { App.logout(); } catch (_) {} });
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#lg-user', { timeout: 10000 });
    await page.fill('#lg-user', u);
    await page.fill('#lg-pass', p);
    await page.click('button[type=submit]');
    await page.waitForSelector('.tile-grid', { timeout: 10000 });
  };
  const moMan = async (hash) => {
    await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
  };
  const dem = (sel) => page.locator(sel).count();
  const chu = () => page.locator('#view').innerText();
  const bamNut = async () => {
    await page.click(NUT);
    await page.waitForSelector('#ht-cd-luu', { timeout: 10000 });
    await page.waitForTimeout(300);
  };

  // =========================================================================
  console.log('\n[1] Cô hai nhóm: nút ở khối trống và khối có nội dung; mở đúng nhóm');
  {
    await dangNhap('giaovien3', '123456');
    await moMan('#/timetable/lich');
    check('đối chứng — đang xem nhóm c1, có lịch', (await page.inputValue('#tkb-nhom')) === 'c1'
      && await dem('#tkb-seg button') === 5);
    check('tuần chưa soạn: KHÔNG có khung "Kế hoạch chung tuần này" trống',
      !/Kế hoạch chung tuần này/.test(await chu()));
    check('nhưng cô vẫn có nút "Soạn kế hoạch chung tuần"',
      await dem(NUT) === 1 && /Soạn kế hoạch chung tuần/.test(await page.locator(NUT).innerText()));

    await page.selectOption('#tkb-nhom', 'c2');
    await page.waitForTimeout(1200);
    check('nhóm c2 đã soạn: khối kế hoạch chung hiện chủ đề',
      /Chủ đề của nhóm Lá 1/.test(await chu()));
    check('và có nút ngay trong khối', await dem(`.card ${NUT}`) === 1);

    await bamNut();
    check('bấm vào thì sang #/hanhtrinh/chude',
      (await page.evaluate(() => location.hash)) === '#/hanhtrinh/chude');
    check('ĐÚNG NHÓM đang xem ở Lịch sinh hoạt (c2), không rơi về nhóm đầu',
      (await page.inputValue('#ht-nhom')) === 'c2', await page.inputValue('#ht-nhom'));
    check('ô chủ đề mở sẵn chủ đề của nhóm đó',
      (await page.inputValue('#ht-cd-ten')) === 'Chủ đề của nhóm Lá 1', await page.inputValue('#ht-cd-ten'));

    const ve = page.locator('#ht-than a', { hasText: 'Lịch sinh hoạt' });
    check('màn soạn có liên kết "← Lịch sinh hoạt"', await ve.count() === 1);
    await ve.click();
    await page.waitForTimeout(1200);
    check('bấm liên kết thì về phần Lịch sinh hoạt',
      (await page.evaluate(() => location.hash)) === '#/timetable/lich' && await dem('#tkb-seg button') === 5);
    // Đ242B — bước "bỏ cái cũ" sau khi lối mới đã chạy: nút cũ ở Hành trình
    // không còn, lối vào duy nhất là nút ở Lịch sinh hoạt vừa kiểm ở trên.
    check('nút "Chủ đề tuần" cũ ở Hành trình ĐÃ BỎ (lối vào nay ở Lịch sinh hoạt)',
      await (async () => {
        await moMan('#/hanhtrinh');
        return page.locator('#ht-loi-phu [data-tab="chude"]').count();
      })() === 0);
  }

  // =========================================================================
  console.log('\n[2] Nhóm CHƯA có lịch sinh hoạt vẫn có nút');
  {
    await dangNhap('giaovien4', '123456');
    await moMan('#/timetable/lich');
    check('đối chứng — màn báo nhóm chưa có lịch', /chưa có lịch sinh hoạt/i.test(await chu()));
    check('vẫn có nút "Soạn kế hoạch chung tuần"', await dem(NUT) === 1);
    await bamNut();
    check('bấm vào mở màn soạn của nhóm c4',
      (await page.inputValue('#ht-cd-ten')) === 'Chủ đề của nhóm Nhà trẻ 1', await page.inputValue('#ht-cd-ten'));
  }

  // =========================================================================
  console.log('\n[3] Văn phòng thấy nút và mở đúng nhóm');
  {
    await dangNhap('htruong', 'quantri2026');
    await moMan('#/timetable/lich');
    check('văn phòng có nút', await dem(NUT) === 1);
    await page.selectOption('#tkb-nhom', 'c2');
    await page.waitForTimeout(1200);
    await bamNut();
    check('văn phòng mở màn soạn của nhóm đang chọn (c2)',
      (await page.inputValue('#ht-cd-ten')) === 'Chủ đề của nhóm Lá 1', await page.inputValue('#ht-cd-ten'));
  }

  // =========================================================================
  console.log('\n[4] Gia đình KHÔNG thấy nút');
  {
    await dangNhap('phuhuynh2', '123456');   // p2: con s3 ở c1 — nhóm có lịch, tuần chưa soạn
    await moMan('#/timetable/lich');
    check('đối chứng — gia đình đang ở Lịch sinh hoạt', await dem('#tkb-seg button') === 5);
    check('gia đình nhóm chưa soạn: không có nút', await dem(NUT) === 0);

    await dangNhap('ph.huong', '123456');    // p6: con s7 ở c2 — nhóm đã soạn
    await moMan('#/timetable/lich');
    check('gia đình nhóm đã soạn vẫn thấy khối kế hoạch chung như cũ',
      /Chủ đề của nhóm Lá 1/.test(await chu()));
    check('nhưng không có nút soạn', await dem(NUT) === 0);

    await dangNhap('ph.trang', '123456');    // p7: con s9 ở c4 — nhóm chưa có lịch
    await moMan('#/timetable/lich');
    check('gia đình nhóm chưa có lịch: không có nút', await dem(NUT) === 0);
  }

  check('không lỗi JavaScript nào', loiJs.length === 0, loiJs);
} finally {
  if (browser) await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
