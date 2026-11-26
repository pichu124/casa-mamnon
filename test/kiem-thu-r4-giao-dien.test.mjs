// Bài canh trên trình duyệt thật — chữ nghĩa album video và nút sửa thông báo
// của đợt kiểm thử thay trường R4 (Đ261c).
//
// Chạy bằng:  node test/kiem-thu-r4-giao-dien.test.mjs
//
//   [1] B6 — ô xem trước video trong form là khung hình của đoạn phim (không
//       phải biểu tượng 🎬); thẻ album chỉ có video ghi "1 video", không ghi
//       "1 ảnh"; hộp xem lớn tiêu đề "Xem video", dòng "Video 1 / 1".
//   [2] B3 — văn phòng mở thông báo nhóm do cô gửi: còn nút Thu hồi, không
//       còn nút "Sửa lại".
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  taoQuanTri, datChucVu, khoaVaoCoSo, batPhanHe, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('kiem-thu-r4-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album']);
const mkVP = taoQuanTri(DIR, 'Văn Phòng G', 'g_vp');
datChucVu(DIR, 'g_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'g_vp', 'cs1');

// Máy chủ không có ffmpeg: video nhỏ đi thẳng lên như trước, đủ để canh chữ.
const sv = await dungMayChu({
  port: Number(process.env.TEST_PORT || 7130), dir: DIR, env: { CASA_FFMPEG: '/khong-co/ffmpeg' },
});
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', d => d.accept());

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
  await page.waitForTimeout(1000);
};
const chu = (sel) => page.locator(sel).innerText().catch(() => '');

// Một đoạn phim webm THẬT, dựng trong trình duyệt (cùng cách bài album video).
async function dungVideoMau(giay) {
  const b64 = await page.evaluate((g) => new Promise((ok, hong) => {
    const c = document.createElement('canvas');
    c.width = 160; c.height = 120;
    const ctx2 = c.getContext('2d');
    const may = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' });
    const manh = [];
    may.ondataavailable = (e) => { if (e.data && e.data.size) manh.push(e.data); };
    may.onerror = () => hong(new Error('không dựng được video mẫu'));
    may.onstop = () => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(',')[1]);
      r.readAsDataURL(new Blob(manh, { type: 'video/webm' }));
    };
    let i = 0;
    const ve = () => {
      if (may.state === 'inactive') return;
      i += 1;
      ctx2.fillStyle = `hsl(${(i * 9) % 360} 80% 50%)`;
      ctx2.fillRect(0, 0, 160, 120);
      requestAnimationFrame(ve);
    };
    may.start(200);
    requestAnimationFrame(ve);
    setTimeout(() => { try { may.stop(); } catch (_) { /* đã dừng */ } }, g * 1000);
  }), giay);
  return Buffer.from(b64, 'base64');
}

try {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  const VID = await dungVideoMau(1);
  const TEP_VIDEO = path.join(DIR, 'be-tuoi-cay.webm');
  fs.writeFileSync(TEP_VIDEO, VID);
  check('đối chứng — dựng được đoạn phim mẫu thật', VID.length > 500, VID.length);

  // =========================================================================
  console.log('\n[1] B6 — VIDEO KHÔNG BỊ GỌI LÀ ẢNH');
  await dangNhap('giaovien4', '123456');
  await moMan('#/albums');
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  await page.fill('#al-title', 'Bé tưới cây');
  await page.setInputFiles('#al-file', [TEP_VIDEO]);
  await page.waitForFunction(() => /1 video/.test((document.getElementById('al-preview') || {}).innerText || ''),
    null, { timeout: 8000 }).catch(() => {});
  const xemTruoc = await page.evaluate(() => {
    const v = document.querySelector('#al-preview video.al-xem-truoc');
    return { co: !!v, src: v ? v.getAttribute('src') : '', chu: document.getElementById('al-preview').innerText };
  });
  check('Ô XEM TRƯỚC LÀ KHUNG HÌNH CỦA ĐOẠN PHIM (thẻ <video> từ tệp trong máy)',
    xemTruoc.co && /^blob:/.test(xemTruoc.src), xemTruoc);
  check('không còn biểu tượng 🎬 thay cho khung hình', !xemTruoc.chu.includes('🎬'), xemTruoc.chu);
  const veDuoc = await page.waitForFunction(() => {
    const v = document.querySelector('#al-preview video.al-xem-truoc');
    return v && v.readyState >= 1 && v.videoWidth > 0;
  }, null, { timeout: 6000 }).then(() => true).catch(() => false);
  check('trình duyệt đọc được khung hình (CSP cho phép blob: ở media-src)', veDuoc);

  await page.click('#al-submit');
  await page.waitForTimeout(2500);
  const hash = await page.evaluate(() => location.hash);
  check('đăng được album chỉ có video', /^#\/albums\/al_/.test(hash), hash);
  const alId = hash.replace('#/albums/', '');

  await moMan('#/albums');
  const the = await page.evaluate((id) => {
    const o = [...document.querySelectorAll('.card.clickable')].find(c => (c.getAttribute('onclick') || '').includes(id));
    return o ? o.innerText : '';
  }, alId);
  check('THẺ ALBUM CHỈ CÓ VIDEO GHI "1 video"', /\b1 video\b/.test(the), the);
  check('và không ghi "1 ảnh"', !/\b1 ảnh\b/.test(the), the);

  await moMan(`#/albums/${alId}`);
  await page.evaluate(() => App.views.albums.showPhoto(0));
  await page.waitForTimeout(600);
  const hop = await chu('#modal-overlay');
  check('HỘP XEM LỚN TIÊU ĐỀ "Xem video"', /Xem video/.test(hop) && !/Xem ảnh/.test(hop), hop);
  check('và dòng "Video 1 / 1", không phải "Ảnh 1 / 1"', /Video 1 \/ 1/.test(hop) && !/Ảnh 1 \/ 1/.test(hop), hop);
  await page.click('#modal-overlay .close-x').catch(() => {});

  // Đối chứng: ảnh vẫn là ảnh.
  const GV4 = (await login('giaovien4', '123456')).cookie;
  const alAnh = (await req('POST', '/api/albums', {
    cookie: GV4, body: { title: 'Bé xếp khối', photos: [{ emoji: '🧱' }, { emoji: '🧸' }] },
  })).data?.id;
  await moMan('#/albums');
  const theAnh = await page.evaluate((id) => {
    const o = [...document.querySelectorAll('.card.clickable')].find(c => (c.getAttribute('onclick') || '').includes(id));
    return o ? o.innerText : '';
  }, alAnh);
  check('đối chứng — album chỉ có ảnh vẫn ghi "… ảnh", không kèm "video"',
    /\b2 ảnh\b/.test(theAnh) && !/video/.test(theAnh), theAnh);

  // =========================================================================
  console.log('\n[2] B3 — VĂN PHÒNG KHÔNG CÒN NÚT "SỬA LẠI" Ở TIN NHÓM CÔ GỬI');
  {
    const GV = (await login('giaovien', '123456')).cookie;
    const t = await req('POST', '/api/notifications', {
      cookie: GV, body: { title: 'Nhóm Chồi 2 mang mũ', body: 'Mai nhóm mình ra sân, gia đình cho bé mang mũ nhé.', category: 'Nhóm lớp', audience: 'class' },
    });
    check('đối chứng — cô gửi được thông báo nhóm', t.status === 201, t.status);
    const d0 = await login('g_vp', mkVP);
    await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
    await dangNhap('g_vp', 'quantri2026');
    await moMan('#/notifications');
    await page.locator('.list-row.clickable', { hasText: 'Nhóm Chồi 2 mang mũ' }).first().click();
    await page.waitForTimeout(800);
    const hop2 = await chu('#modal-overlay');
    check('đối chứng — văn phòng mở được hộp chi tiết của tin', /Mai nhóm mình ra sân/.test(hop2), hop2);
    check('CÒN NÚT THU HỒI', /Thu hồi/.test(hop2), hop2);
    check('KHÔNG CÒN NÚT "SỬA LẠI"', !/Sửa lại/.test(hop2), hop2);
  }

  check('không có lỗi JavaScript trên trang', !loiJs.length, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
