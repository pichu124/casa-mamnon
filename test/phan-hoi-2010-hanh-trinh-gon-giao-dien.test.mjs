// Bài canh MÀN HÀNH TRÌNH GỌN LẠI theo phản hồi 20/10 — trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-2010-hanh-trinh-gon-giao-dien.test.mjs
//
//   B2. Không còn nút "Nói để ghi" (nhận dạng giọng nói của trình duyệt) — kể cả
//       khi trình duyệt CÓ hỗ trợ. Thay bằng lời nhắc ngắn dùng micro trên bàn
//       phím, ở cả ba hộp: ghi quan sát, gắn bé cho nháp, kể cho gia đình.
//   B3. Không còn nút "Suy ngẫm" (gắn lĩnh vực / mức / ở lớp cô làm gì tiếp)
//       trên từng quan sát. CHỈ ẨN: nhận định đã có vẫn nguyên ở máy chủ.
//       Lối phụ dưới tiêu đề nay là "Hình ảnh ghi nhanh" (Đ242B, B1 — thay
//       "Suy ngẫm cuối ngày"); quan sát chưa kể của cô nằm ở đó.
//   B6. Ban giám hiệu mở hộp "Kể cho gia đình" thấy ô "Lưu ảnh về album" và
//       lưu được ảnh về album theo thẻ của nhóm.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-hanh-trinh-gon-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'album']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'htg_qt');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5242), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
// Trình duyệt CÓ nhận dạng giọng nói: nút cũ chỉ hiện khi có, nên phải dựng
// đúng cảnh đó thì "không còn nút" mới có nghĩa.
await ctx.addInitScript(() => {
  class Nhan { start() { window.__nhanDaChay = true; } stop() {} }
  window.SpeechRecognition = Nhan;
  window.webkitSpeechRecognition = Nhan;
});
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
const moMan = async (hash) => { await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000); };
const chuHop = () => page.locator('#modal-overlay').innerText();
const dongHop = () => page.evaluate(() => UI.closeModal());
const NHAC = /Có thể bấm micro trên bàn phím để nói thay gõ/;

try {
  const d0 = await login('htg_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm Chồi 2 (c1)

  // Một quan sát có ảnh, ĐÃ có nhận định từ trước (lĩnh vực, mức, ở lớp).
  const q1 = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé tự rót nước vào ly.', anh: ANH } });
  check('đối chứng — cô ghi được quan sát có ảnh', q1.status === 201, q1.data);
  const Q1 = q1.data?.id;
  const nd = await req('PUT', `/api/hanhtrinh/${Q1}`, {
    cookie: GV, body: { linhVuc: 'tinh-cam-xa-hoi', trangThai: 'dang-hinh-thanh', oLopLamGi: 'Đặt thêm bình rót ở góc thực hành' },
  });
  check('đối chứng — đường lưu nhận định ở máy chủ vẫn chạy', nd.status === 200, nd.data);
  const al = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Góc của từng bé', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] },
  });
  check('đối chứng — album theo thẻ của nhóm c1', al.status === 201, al.data);
  const AL = al.data?.id;

  // =========================================================================
  console.log('\n[1] B3 — thẻ quan sát không còn nút Suy ngẫm; lối phụ Hình ảnh ghi nhanh');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/hanhtrinh');
    check('lối phụ "Hình ảnh ghi nhanh" dưới tiêu đề (Đ242B — thay Suy ngẫm cuối ngày)',
      await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Hình ảnh ghi nhanh' }).count() === 1);
    await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Hình ảnh ghi nhanh' }).click();
    await page.waitForTimeout(1200);
    const than = await page.locator('#ht-than').innerText();
    check('đối chứng — quan sát hiện trên màn', /Bé tự rót nước vào ly/.test(than), than.slice(0, 200));
    check('KHÔNG còn nút mở hộp Suy ngẫm trên quan sát', await page.locator('#ht-than [data-suyngam]').count() === 0);
    check('KHÔNG còn chữ "Sửa nhận định" hay "chưa suy ngẫm"', !/Sửa nhận định|chưa suy ngẫm/.test(than), than.slice(0, 300));
    check('KHÔNG còn lời mời "gắn lĩnh vực lúc nào cũng được"', !/gắn lĩnh vực/.test(than));
    // Đ242B: thẻ ở Hình ảnh ghi nhanh mở cùng hộp kể qua nút "Hoàn thiện & kể".
    check('nút "Hoàn thiện & kể" vẫn ở trên quan sát', await page.locator(`#ht-than [data-hoan-thien="quansat:${Q1}"]`).count() === 1);

    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data || {};
    const q = (ht.quanSat || []).find(x => x.id === Q1) || {};
    check('nhận định đã có KHÔNG mất (lĩnh vực, mức, ở lớp cô làm gì tiếp)',
      q.linhVuc === 'tinh-cam-xa-hoi' && q.trangThai === 'dang-hinh-thanh' && q.oLopLamGi === 'Đặt thêm bình rót ở góc thực hành',
      { linhVuc: q.linhVuc, trangThai: q.trangThai, oLopLamGi: q.oLopLamGi });
  }

  // =========================================================================
  console.log('\n[2] B2 — không còn nút "Nói để ghi" ở cả ba hộp, chỉ còn lời nhắc micro bàn phím');
  {
    // Hộp kể cho gia đình
    await page.click(`#ht-than [data-hoan-thien="quansat:${Q1}"]`);
    await page.waitForTimeout(800);
    check('hộp Kể cho gia đình: không có nút nói', await page.locator('#modal-overlay .ht-noi').count() === 0
      && !/Nói để ghi/.test(await chuHop()));
    check('hộp Kể cho gia đình: có lời nhắc micro bàn phím', NHAC.test(await chuHop()));
    await dongHop();

    // Hộp ghi một quan sát → ghi thành nháp để mở tiếp hộp gắn bé
    await page.click('#ht-them');
    await page.waitForTimeout(600);
    check('hộp Ghi một quan sát: không có nút nói', await page.locator('#modal-overlay .ht-noi').count() === 0
      && !/Nói để ghi/.test(await chuHop()));
    check('hộp Ghi một quan sát: có lời nhắc micro bàn phím', NHAC.test(await chuHop()));
    await page.selectOption('#ht-be', '__nhap__');
    await page.fill('#ht-mota', 'Một bạn tự cất giày lên kệ');
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    check('lưu vẫn chạy như cũ (nháp hiện ra)', /Một bạn tự cất giày lên kệ/.test(await page.locator('#ht-than').innerText()));

    // Đ242B: hộp "Gắn bé" của nháp nay ở khối nháp của tab chương trình.
    await moMan('#/hanhtrinh/chu-nhiem');
    await page.locator('[data-nhap-gan]').first().click();
    await page.waitForTimeout(500);
    check('hộp Gắn bé cho bản nháp: không có nút nói', await page.locator('#modal-overlay .ht-noi').count() === 0
      && !/Nói để ghi/.test(await chuHop()));
    check('hộp Gắn bé cho bản nháp: có lời nhắc micro bàn phím', NHAC.test(await chuHop()));
    await page.selectOption('#ht-gan-be', 's3');
    await page.click('#ht-gan-luu');
    await page.waitForTimeout(1500);
    const s3 = (await req('GET', '/api/hanhtrinh?studentId=s3', { cookie: GV })).data || {};
    check('gắn bé vẫn chạy như cũ', (s3.quanSat || []).some(q => /tự cất giày/.test(q.moTa || '')));
    check('app không bao giờ khởi động nhận dạng giọng nói', !(await page.evaluate(() => !!window.__nhanDaChay)));
  }

  // =========================================================================
  console.log('\n[3] B6 — ban giám hiệu lưu ảnh của câu chuyện về album theo thẻ');
  {
    await dangNhap('htg_qt', 'quantri2026');
    // Đ242B: Hình ảnh ghi nhanh chỉ có mục của chính người đăng nhập — văn
    // phòng kể quan sát của cô từ tab chương trình của bé.
    await moMan('#/hanhtrinh/chu-nhiem');
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    // Nút nằm cuối thẻ, sát thanh điều hướng cố định ở đáy — bấm bằng mã để
    // thanh ấy không che mất cú bấm.
    await page.locator(`#ht-than [data-cauchuyen="${Q1}"]`).evaluate(b => b.click());
    await page.waitForTimeout(1000);
    check('hộp có ô "Lưu ảnh về album" mời đúng album theo thẻ của nhóm',
      await page.locator(`#ht-album option[value="${AL}"]`).count() === 1, await chuHop());
    await page.fill('#ht-cc', 'Hôm nay An tự rót nước vào ly, không làm đổ.');
    await page.fill('#ht-cn', 'Tối nay để con tự rót nước vào cốc.');
    await page.selectOption('#ht-album', AL);
    await page.check('#ht-chi-be');   // Đ242B, B7: gửi kèm ảnh thì phải nói trong ảnh có ai
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1500);
    const anh = ((await req('GET', `/api/albums/${AL}`, { cookie: GV })).data?.photos || []);
    check('album có tấm mới gắn thẻ bé s1', anh.length === 2 && (anh[1].beTrongAnh || []).some(b => b.id === 's1'),
      anh.map(p => p.beTrongAnh));
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
