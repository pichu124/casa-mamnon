// Bài canh NGOÀI TUYẾN — cô mở app khi máy không có mạng.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
//
// VÌ SAO ĐÁNG MỘT TỆP RIÊNG
//
// Cả GĐ 0 dựng lên quanh một lời hứa: "cô chụp được, ghi được, kể cả lúc mất
// sóng". Phép thử quyết định của giai đoạn đó — chụp ảnh, tắt mạng, đóng app,
// mở lại — đứng hay đổ đúng ở chỗ này.
//
// Mà đường đi lúc mất mạng lại hỏng theo một kiểu rất kín tiếng: app khởi động
// gọi /api/auth/me, service worker cố tình KHÔNG lưu cache đường /api nên trả
// về một lỗi, và khối bắt lỗi ở public/js/app.js đưa thẳng cô về màn ĐĂNG NHẬP.
// Màn đăng nhập cũng phải gọi máy chủ. Nghĩa là cô đứng ở sân trường sóng yếu
// mở app ra sẽ gặp một màn hình không làm gì được — kể cả Ghi nhanh.
//
// Bài cũ trong test/pwa.test.mjs có một mục tên là "mở được app khi mất mạng",
// nhưng nó chỉ hỏi thẻ <div id="app"> có tồn tại không. Thẻ đó nằm sẵn trong
// index.html nên nó XANH kể cả khi app hỏng hoàn toàn. Bài này hỏi thứ thật:
// trên màn hình lúc đó có chữ gì, và có phải ô đăng nhập hay không.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, batPhanHe,
  CHROMIUM, tatBannerThongBao,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ngoai-tuyen');
sinhDuLieu(DIR);
// Bật Ghi nhanh — phân hệ mà cả lời hứa "mất mạng vẫn ghi được" đứng trên.
batPhanHe(DIR, ['thuchup']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3982), dir: DIR });
const browser = await chromium.launch({ executablePath: CHROMIUM });

async function dangNhapCo(page) {
  await page.waitForSelector('#lg-user');
  await page.fill('#lg-user', 'giaovien');
  await page.fill('#lg-pass', '123456');
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector('.tile-grid');
}

// ===========================================================================
// CÁCH DỰNG TÌNH HUỐNG "MẤT MẠNG" — VÀ VÌ SAO KHÔNG DÙNG setOffline
//
// Bản đầu của bài này gọi `context.setOffline(true)`. Nó KHÔNG chặn được các
// lời gọi mạng do service worker phát ra (giới hạn đã biết của Playwright trên
// Chromium), nên app vẫn gọi được /api/auth/me và màn hình chính vẫn hiện ra
// đầy đủ — bài test thì xanh mà chẳng đo gì cả. Đúng cái bẫy mà bài cũ trong
// test/pwa.test.mjs đã dính.
//
// Nay chặn thẳng ở tầng route với service worker tắt hẳn, nên "mất mạng" là
// mất thật. Phần service worker giữ tệp thì đo riêng ở mục [1].
// ===========================================================================

// ===========================================================================
console.log('\n[1] Có mạng: cô đăng nhập bình thường, và máy nhớ lại màn hình phân hệ');
const ctx1 = await tatBannerThongBao(await browser.newContext());
const p = await ctx1.newPage();
{
  await p.goto(sv.BASE);
  await dangNhapCo(p);
  check('cô vào được màn hình chính', await p.locator('.tile-grid').count() > 0);

  // Chờ service worker kích hoạt và nhận lời nhờ giữ tệp màn hình phân hệ.
  await p.waitForTimeout(2500);
  const sw = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg && reg.active ? 'active' : 'chưa';
  });
  check('service worker đã kích hoạt', sw === 'active', sw);

  const nho = await p.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('casa.man-hinh-phan-he') || 'null'); }
    catch (_) { return null; }
  });
  check('MÁY NHỚ ĐỊA CHỈ MÀN HÌNH CỦA PHÂN HỆ ĐÃ BẬT',
    Array.isArray(nho) && nho.some(u => u.indexOf('/modules/thuchup/view.js') === 0), nho);

  // Và chỉ nhớ ĐỊA CHỈ TỆP, không nhớ một chữ nào về bé hay về cô. Điện thoại
  // của cô có thể là máy dùng chung ở lớp.
  const roRi = await p.evaluate(() => {
    const ra = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ra.push([k, String(localStorage.getItem(k) || '').slice(0, 400)]);
    }
    return ra;
  });
  const chuoiNho = roRi.map(([, v]) => v).join(' ');
  check('KHÔNG có tên bé nào nằm lại trong máy',
    !/Nguyễn|Trần|Phạm|Lê Thị|Vũ Đình/.test(chuoiNho), roRi.map(([k]) => k));

  const giuSan = await p.evaluate(async () => {
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      if ((await c.keys()).some(k => k.url.includes('/modules/thuchup/view.js'))) return true;
    }
    return false;
  });
  check('SERVICE WORKER GIỮ SẴN TỆP MÀN HÌNH PHÂN HỆ', giuSan === true);
  await ctx1.close();
}

// ===========================================================================
console.log('\n[2] MẤT MẠNG: cô KHÔNG bị đá về màn đăng nhập');
const ctx2 = await tatBannerThongBao(await browser.newContext({ serviceWorkers: 'block' }));
const q = await ctx2.newPage();
{
  await q.goto(sv.BASE);
  await dangNhapCo(q);

  // Từ đây trở đi máy không gọi được về trường nữa.
  await ctx2.route('**/api/**', route => route.abort('internetdisconnected'));
  await q.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await q.waitForTimeout(1500);

  const chu = (await q.locator('body').innerText().catch(() => '')) || '';
  check('màn hình NÓI RÕ máy đang không có mạng', /không có mạng/i.test(chu), chu.slice(0, 200));

  // ĐÂY LÀ PHÉP KIỂM QUAN TRỌNG NHẤT CỦA CẢ TỆP.
  //
  // Bảo cô đăng nhập lại lúc không có mạng là bảo cô làm một việc không thể
  // làm được — và app cũng không hề biết phiên của cô còn hay hết.
  check('KHÔNG hiện ô đăng nhập', await q.locator('#lg-user').count() === 0);
  check('không hiện nút Đăng nhập', await q.locator('#login-form').count() === 0);

  check('có nút Thử lại để cô tự bấm lại', await q.locator('#off-thu-lai').count() === 1);

  // Và app nói đúng sự thật: thứ đã ghi lúc mất mạng không mất.
  check('nói rõ những gì đã ghi sẽ tự gửi đi, không mất', /tự gửi đi/i.test(chu), chu.slice(0, 200));

  check('không thanh điều hướng dưới (chưa vào được màn nào)',
    await q.evaluate(() => {
      const n = document.getElementById('bottom-nav');
      return !n || n.style.display === 'none';
    }));
}

// ===========================================================================
console.log('\n[3] MẤT MẠNG: màn hình Ghi nhanh vẫn nạp được, nên hàng đợi có người đẩy');
{
  // Bộ nghe 'online' của Ghi nhanh gắn vào NGAY KHI tệp view.js được nạp
  // (không phải khi cô mở màn hình). Nạp được tệp đó lúc mất mạng nghĩa là
  // sóng về là bài ghi trong hàng đợi tự bay đi, dù cô chưa mở màn nào.
  //
  // Ở đây /api bị chặn còn tệp tĩnh thì không, nên phép kiểm này đo ĐÚNG một
  // việc: app có tự đi tìm danh sách màn hình đã nhớ trong máy hay không —
  // vì `loadModules()` đã bỏ ngang khi /api/modules hỏng. Vế "tệp đó có nằm
  // sẵn trong máy không" thì mục [1] đo.
  await q.waitForTimeout(1500);
  const co = await q.evaluate(() => !!(window.App && App.views && App.views.thuchup));
  check('TỆP MÀN HÌNH GHI NHANH VẪN ĐƯỢC NẠP DÙ /api ĐÃ CHẾT', co === true);
  check('và nó có hàm đẩy hàng đợi',
    await q.evaluate(() => typeof (window.App?.views?.thuchup?.guiHangDoi) === 'function'));
}

// ===========================================================================
console.log('\n[4] Có sóng trở lại: app tự mở ra, không bắt cô làm gì');
{
  await ctx2.unroute('**/api/**');
  await q.evaluate(() => window.dispatchEvent(new Event('online')));
  await q.waitForSelector('.tile-grid', { timeout: 15000 }).catch(() => {});
  check('CÓ SÓNG LÀ MÀN HÌNH CHÍNH TỰ HIỆN RA', await q.locator('.tile-grid').count() > 0);
  check('và không còn màn báo mất mạng', await q.locator('#off-thu-lai').count() === 0);
}

await ctx2.close();
await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
