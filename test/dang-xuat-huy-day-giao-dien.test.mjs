// Bấm ĐĂNG XUẤT trên màn hình thật thì máy đó thôi nhận thông báo đẩy (Đ252).
//
// Chạy bằng:  node test/dang-xuat-huy-day-giao-dien.test.mjs
//
// Phần máy chủ (xoá đúng dòng, không xoá của người khác, tài khoản đã khoá)
// nằm ở `test/dang-xuat-huy-day.test.mjs`. Bài này canh nửa còn lại: APP có
// gửi kèm địa chỉ đẩy của máy khi bấm Đăng xuất không, trình duyệt có được
// bảo thôi nhận không, và — quan trọng nhất — bước ấy hỏng kiểu gì thì người
// dùng vẫn phải ra được màn đăng nhập.
//
//   [1] Bật thông báo trên máy này qua màn Cài đặt (đường đăng ký thật).
//   [2] Bấm Đăng xuất: app gửi kèm địa chỉ đẩy, trình duyệt thôi nhận, máy chủ
//       xoá đúng dòng của máy này, máy khác của cùng người còn nguyên.
//   [3] Đăng nhập lại trên cùng máy: màn Cài đặt nói ĐÚNG là máy chưa bật,
//       không tự xin quyền, bấm Bật là nhận lại được.
//   [4] Trình duyệt từ chối thôi nhận → vẫn đăng xuất, máy chủ vẫn xoá.
//   [5] Không hỏi được service worker (ném lỗi / treo mãi) → vẫn đăng xuất.
//   [6] Mất mạng lúc đăng xuất → vẫn ra màn đăng nhập, trình duyệt vẫn thôi nhận.
//   [7] Máy chưa từng cho phép thông báo → đăng xuất y như cũ, không hỏi gì.
//   [8] Không lỗi JS nào.
//
// VÌ SAO PHẢI GIẢ PHẦN ĐẨY CỦA TRÌNH DUYỆT: Chromium không đầu không đăng ký
// đẩy thật được (không có dịch vụ đẩy đứng sau). Nên `pushManager` và quyền
// `Notification` được thay bằng bản giả giữ trạng thái trong localStorage —
// đúng thứ một trình duyệt thật nhớ giữa hai lần đăng nhập trên cùng máy. Mọi
// thứ còn lại là thật: màn hình, nút bấm, yêu cầu mạng, máy chủ, bảng dữ liệu.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoReq, taoLogin, taoBoDem,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dang-xuat-huy-day-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4785), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const dangKyCua = (userId) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try {
    return c.prepare('SELECT endpoint FROM push_dang_ky WHERE userId = ? ORDER BY endpoint').all(userId).map(r => r.endpoint);
  } finally { c.close(); }
};
const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Máy THỨ HAI của cùng người — đăng ký thẳng qua API, để canh nó không bị đụng.
const MAY_KHAC = 'https://day.example.invalid/may-o-nha';
const mayKhac = await login('phuhuynh', '123456');
const HA = mayKhac.data.user.id;
await req('POST', '/api/push/dang-ky', {
  cookie: mayKhac.cookie, body: { subscription: { endpoint: MAY_KHAC, keys: { p256dh: 'k', auth: 'k' } } },
});

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
await ctx.addInitScript(() => {
  const KHOA = 'gia-day';
  const doc = () => { try { return JSON.parse(localStorage.getItem(KHOA) || '{}'); } catch (_) { return {}; } };
  const ghi = (o) => localStorage.setItem(KHOA, JSON.stringify(o));
  const dem = (ten) => { const o = doc(); o[ten] = (o[ten] || 0) + 1; ghi(o); };
  const taoSub = (endpoint) => ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'khoa-gia', auth: 'khoa-gia' } }),
    unsubscribe: () => {
      dem('soLanThoiNhan');
      const o = doc();
      if (o.cheDo === 'thoi-nhan-nem') return Promise.reject(new Error('AbortError'));
      delete o.endpoint; ghi(o);
      return Promise.resolve(true);
    },
  });
  const reg = { pushManager: {
    getSubscription: () => { const o = doc(); return Promise.resolve(o.endpoint ? taoSub(o.endpoint) : null); },
    subscribe: () => {
      const o = doc();
      if (!o.endpoint) { o.soMay = (o.soMay || 0) + 1; o.endpoint = `https://day.example.invalid/may-gia-${o.soMay}`; ghi(o); }
      return Promise.resolve(taoSub(o.endpoint));
    },
  } };
  ServiceWorkerContainer.prototype.getRegistration = () => {
    dem('soLanHoi');
    const o = doc();
    if (o.cheDo === 'hoi-nem') return Promise.reject(new Error('service worker hỏng'));
    if (o.cheDo === 'hoi-treo') return new Promise(() => {});
    return Promise.resolve(reg);
  };
  Object.defineProperty(ServiceWorkerContainer.prototype, 'ready', { configurable: true, get: () => Promise.resolve(reg) });
  if (!('PushManager' in window)) window.PushManager = function PushManager() {};
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => doc().quyen || 'default' });
  Notification.requestPermission = () => {
    dem('soLanXinQuyen');
    const o = doc(); o.quyen = 'granted'; ghi(o);
    return Promise.resolve('granted');
  };
});
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

// Mọi lượt gọi đường đăng xuất mà APP phát ra, kèm thân yêu cầu.
const luotDangXuat = [];
page.on('request', (r) => {
  if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/auth/logout') {
    let than = null;
    try { than = JSON.parse(r.postData() || 'null'); } catch (_) { than = r.postData(); }
    luotDangXuat.push(than);
  }
});

const gia = () => page.evaluate(() => JSON.parse(localStorage.getItem('gia-day') || '{}'));
const datGia = (them) => page.evaluate((t) => {
  const o = JSON.parse(localStorage.getItem('gia-day') || '{}');
  localStorage.setItem('gia-day', JSON.stringify({ ...o, ...t }));
}, them);
async function dangNhapTrenManHinh() {
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', 'phuhuynh');
  await page.fill('#lg-pass', '123456');
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}
async function moCaiDat() {
  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForSelector('#st-push-trang-thai', { timeout: 10000 });
  await page.waitForFunction(
    () => !/Đang kiểm tra/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 });
  return page.locator('#st-push-trang-thai').innerText();
}
// Bấm đúng cái nút người dùng bấm, rồi chờ màn đăng nhập. Trả về số mili giây.
async function bamDangXuat() {
  const t0 = Date.now();
  await page.click('button:has-text("Đăng xuất")');
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  return Date.now() - t0;
}
const conPhien = async () => (await page.evaluate(async () => (await fetch('/api/auth/me')).status)) === 200;
const coBaoLoi = () => page.locator('.toast.error').count();

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });

  // =========================================================================
  console.log('\n[1] Bật thông báo trên máy này qua màn Cài đặt');
  await dangNhapTrenManHinh();
  {
    const truoc = await moCaiDat();
    check('máy mới: màn Cài đặt nói chưa bật, và kể có một máy khác đang bật',
      /Máy này chưa bật/.test(truoc) && /1 máy khác/.test(truoc), truoc);
    await page.click('#st-push-bat');
    await page.waitForFunction(
      () => /đang nhận thông báo/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 });
    check('máy chủ ghi nhận máy này bên cạnh máy kia',
      bang(dangKyCua(HA), ['https://day.example.invalid/may-gia-1', MAY_KHAC]), dangKyCua(HA));
  }

  // =========================================================================
  console.log('\n[2] Bấm Đăng xuất: máy này thôi nhận, máy khác không bị đụng');
  {
    const g0 = await gia();
    await bamDangXuat();
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('gia-day') || '{}').endpoint, null, { timeout: 5000 })
      .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
    const g1 = await gia();
    check('app gọi đường đăng xuất đúng một lần', luotDangXuat.length === 1, luotDangXuat);
    check('và GỬI KÈM địa chỉ đẩy của chính máy này',
      luotDangXuat[0] && luotDangXuat[0].endpoint === 'https://day.example.invalid/may-gia-1', luotDangXuat[0]);
    check('trình duyệt được bảo thôi nhận đúng một lần',
      (g1.soLanThoiNhan || 0) - (g0.soLanThoiNhan || 0) === 1 && !g1.endpoint, g1);
    check('máy chủ đã xoá đăng ký của MÁY NÀY, máy khác còn nguyên', bang(dangKyCua(HA), [MAY_KHAC]), dangKyCua(HA));
    check('phiên đã hết thật', !(await conPhien()));
    check('không hiện lời báo lỗi nào', (await coBaoLoi()) === 0);
  }

  // =========================================================================
  console.log('\n[3] Đăng nhập lại trên cùng máy: màn Cài đặt nói đúng, bấm Bật là nhận lại');
  {
    const g0 = await gia();
    await dangNhapTrenManHinh();
    const chu = await moCaiDat();
    const g1 = await gia();
    check('màn Cài đặt KHÔNG nói "đang nhận" khi máy chủ không còn đăng ký của máy này',
      /Máy này chưa bật/.test(chu) && !/đang nhận/.test(chu), chu);
    check('nút "Bật trên máy này" hiện ra, nút Tắt và Gửi thử ẩn',
      await page.locator('#st-push-bat').isVisible() && !(await page.locator('#st-push-tat').isVisible())
        && !(await page.locator('#st-push-thu').isVisible()));
    check('đăng xuất rồi đăng nhập lại KHÔNG tự xin quyền thông báo',
      (g1.soLanXinQuyen || 0) === (g0.soLanXinQuyen || 0), { truoc: g0.soLanXinQuyen, sau: g1.soLanXinQuyen });
    check('và không tự đăng ký lại sau lưng người dùng', bang(dangKyCua(HA), [MAY_KHAC]) && !g1.endpoint, dangKyCua(HA));

    await page.click('#st-push-bat');
    await page.waitForFunction(
      () => /đang nhận thông báo/.test(document.getElementById('st-push-trang-thai').textContent), null, { timeout: 10000 });
    check('bấm Bật một lần là máy chủ có lại đăng ký của máy này',
      bang(dangKyCua(HA), ['https://day.example.invalid/may-gia-2', MAY_KHAC]), dangKyCua(HA));
  }

  // =========================================================================
  console.log('\n[4] Trình duyệt TỪ CHỐI thôi nhận → vẫn đăng xuất, máy chủ vẫn xoá');
  {
    await datGia({ cheDo: 'thoi-nhan-nem' });
    const n0 = luotDangXuat.length;
    const g0 = await gia();
    await bamDangXuat();
    await page.waitForTimeout(300);
    const g1 = await gia();
    check('có thử bảo trình duyệt thôi nhận (và nó ném lỗi)', (g1.soLanThoiNhan || 0) - (g0.soLanThoiNhan || 0) === 1, g1);
    check('app vẫn gửi kèm địa chỉ đẩy',
      luotDangXuat.length === n0 + 1 && luotDangXuat[n0].endpoint === 'https://day.example.invalid/may-gia-2', luotDangXuat.slice(n0));
    check('máy chủ — lớp chắc — vẫn xoá đăng ký của máy này', bang(dangKyCua(HA), [MAY_KHAC]), dangKyCua(HA));
    check('phiên đã hết thật', !(await conPhien()));
    check('không hiện lời báo lỗi kỹ thuật nào', (await coBaoLoi()) === 0);
  }

  // =========================================================================
  console.log('\n[5] Không hỏi được service worker → vẫn đăng xuất được');
  {
    await datGia({ cheDo: 'hoi-nem' });
    await dangNhapTrenManHinh();
    let n0 = luotDangXuat.length;
    await moCaiDat();
    await bamDangXuat();
    check('service worker ném lỗi: vẫn ra màn đăng nhập, phiên hết thật', !(await conPhien()));
    check('lượt đăng xuất ấy đi không kèm địa chỉ đẩy, như app đời trước',
      luotDangXuat.length === n0 + 1 && !(luotDangXuat[n0] && luotDangXuat[n0].endpoint), luotDangXuat.slice(n0));
    check('không hiện lời báo lỗi kỹ thuật nào', (await coBaoLoi()) === 0);

    await datGia({ cheDo: 'hoi-treo' });
    await dangNhapTrenManHinh();
    n0 = luotDangXuat.length;
    await moCaiDat();
    const ms = await bamDangXuat();
    check('service worker TREO MÃI không trả lời: vẫn ra màn đăng nhập trong vài giây', ms < 5000, ms);
    check('và phiên hết thật', luotDangXuat.length === n0 + 1 && !(await conPhien()), luotDangXuat.slice(n0));
  }

  // =========================================================================
  console.log('\n[6] Mất mạng lúc đăng xuất → vẫn ra màn đăng nhập, trình duyệt vẫn thôi nhận');
  {
    await datGia({ cheDo: '' });
    await dangNhapTrenManHinh();
    const g0 = await gia();
    await moCaiDat();
    await page.route('**/api/auth/logout', r => r.abort('internetdisconnected'));
    await bamDangXuat();
    await page.waitForTimeout(300);
    await page.unroute('**/api/auth/logout');
    const g1 = await gia();
    check('ra được màn đăng nhập dù yêu cầu đăng xuất không tới máy chủ',
      await page.locator('#lg-user').isVisible());
    check('trình duyệt vẫn được bảo thôi nhận — máy này im dù máy chủ chưa hay',
      (g1.soLanThoiNhan || 0) - (g0.soLanThoiNhan || 0) === 1 && !g1.endpoint, g1);
    check('không hiện lời báo lỗi kỹ thuật nào', (await coBaoLoi()) === 0);
    // Yêu cầu không tới nơi nên phiên còn sống trên máy chủ — dọn cho mục sau.
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  }

  // =========================================================================
  console.log('\n[7] Máy CHƯA TỪNG cho phép thông báo → đăng xuất y như cũ, không hỏi gì thêm');
  {
    await datGia({ quyen: 'default', cheDo: '' });
    await dangNhapTrenManHinh();
    const g0 = await gia();
    const n0 = luotDangXuat.length;
    await moCaiDat();
    await bamDangXuat();
    const g1 = await gia();
    check('không hỏi service worker lần nào (yêu cầu đăng xuất đi ngay như bản cũ)',
      (g1.soLanHoi || 0) === (g0.soLanHoi || 0), { truoc: g0.soLanHoi, sau: g1.soLanHoi });
    check('đăng xuất không kèm địa chỉ đẩy và thành công',
      luotDangXuat.length === n0 + 1 && !(luotDangXuat[n0] && luotDangXuat[n0].endpoint) && !(await conPhien()),
      luotDangXuat.slice(n0));
    check('không xin quyền thông báo', (g1.soLanXinQuyen || 0) === (g0.soLanXinQuyen || 0));
  }

  // =========================================================================
  console.log('\n[8] Không lỗi JS');
  check('không có lỗi JS nào trong suốt bài', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
