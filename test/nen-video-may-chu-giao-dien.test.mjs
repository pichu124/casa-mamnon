// Bài canh trên trình duyệt thật (390px) — MÁY CHỦ NÉN VIDEO (Đ260f, chủ dự
// án quyết 25/11).
//
// Chạy bằng:  node test/nen-video-may-chu-giao-dien.test.mjs
//
// Máy chủ có ffmpeg thì MỌI video (kể cả video nhỏ) gửi nguyên bản lên từng
// phần, máy chủ nén 720p rồi trả mã tệp; màn hình gửi mã đó lúc đăng.
//
//   [1] Form Tạo album: chọn video → "Đang gửi … MB" (thanh tiến độ, nút
//       Dừng lại, nút đăng khoá) → mạng rớt một phần thì tự gửi lại → "Máy
//       chủ đang làm nét video…" → xong hiện ở ô xem trước, chữ đã gõ còn
//       nguyên → đăng gửi `videoDaNen`, không gửi data URL.
//   [2] Ô lưới: video .mp4 có ảnh bìa (poster), không tải trước; phát được
//       (trình duyệt đọc ra 720x1280 — đã xoay đúng video dọc).
//   [3] Bấm Dừng lại giữa chừng: dừng gọn, máy chủ bỏ lượt, form vẫn mở.
//   [4] Đóng form giữa chừng: lượt bị bỏ, form mở lại không nhận video cũ.
//   [5] Hình ảnh ghi nhanh: cùng đường, xong thì lưu thành nháp có video.
//
// Máy không có ffmpeg thì bỏ qua (báo rõ). CASA_BAT_BUOC_FFMPEG=1 để đỏ.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, goCoNuocNgoaiMau, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const coFf = (() => {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
      && spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch (_) { return false; }
})();
if (!coFf) {
  if (process.env.CASA_BAT_BUOC_FFMPEG === '1') {
    check('máy chạy bài có ffmpeg và ffprobe (CASA_BAT_BUOC_FFMPEG=1)', false);
  } else {
    console.log('\n⚠  MÁY NÀY KHÔNG CÓ ffmpeg — BỎ QUA bài giao diện nén video trên máy chủ.');
    console.log('   Cài ffmpeg (sudo apt install -y ffmpeg) để chạy bài này.\n');
  }
  tongKet();
  process.exit(0);
}

const DIR = thuMucTam('nen-video-may-chu-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album', 'hanhtrinh']);
goCoNuocNgoaiMau(DIR);
fs.mkdirSync(DIR, { recursive: true });

// Video dọc của iPhone: ghi 1920x1080 kèm cờ xoay 90°, có tiếng, 3 giây.
const TEP = path.join(DIR, 'IMG_0420.mov');
{
  const tho = path.join(DIR, 'tho.mp4');
  const ff = (args) => {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
  };
  ff(['-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', '3', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', tho]);
  ff(['-display_rotation', '90', '-i', tho, '-c', 'copy', TEP]);
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 6030), dir: DIR, env: { HEN_GIO_PHUT: '0' } });
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

// Ghi lại mọi lời gọi tới đường gửi video, và cho mỗi PUT chậm lại một nhịp
// để kịp nhìn thấy "Đang gửi…". `rotMang` = số PUT sắp tới sẽ bị cắt mạng.
const goi = [];
let rotMang = 0;
let treMs = 1500;
await page.route(/\/api\/(albums|hanhtrinh)\/video\//, async (route) => {
  const r = route.request();
  goi.push({ method: r.method(), url: r.url() });
  if (r.method() === 'PUT') {
    if (rotMang > 0) { rotMang -= 1; return route.abort('failed'); }
    await new Promise(x => setTimeout(x, treMs));
  }
  return route.continue();
});
let thanTaoAlbum = null;
page.on('request', (r) => {
  if (r.method() === 'POST' && /\/api\/albums$/.test(r.url())) thanTaoAlbum = r.postData();
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
  await page.waitForTimeout(1000);
};
const dem = sel => page.locator(sel).count();
const chu = sel => page.locator(sel).innerText().catch(() => '');
const giaTri = sel => page.locator(sel).inputValue().catch(() => null);
const choChu = (sel, re, ms = 20000) => page.waitForFunction(
  ([s, src]) => new RegExp(src).test((document.querySelector(s) || {}).innerText || ''), [sel, re.source], { timeout: ms },
).then(() => true).catch(() => false);
const tranNgang = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

try {
  const co = (await login('giaovien', '123456')).cookie;
  check('đối chứng — đăng nhập được cô nhóm Chồi 2', !!co);

  // =========================================================================
  console.log('\n[1] Tạo album: gửi nguyên bản từng phần, máy chủ làm nét, ngay trong form');
  let albumId = null;
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/albums');
    await page.click('#btn-new-album');
    await page.waitForSelector('#al-title');
    await page.fill('#al-title', 'Bé chơi cát');
    await page.fill('#al-desc', 'Cả nhóm ra sân cát buổi sáng');
    await choChu('#al-pick-goi-y', /nguyên bản lên máy chủ/, 5000);
    check('lời gợi ý dưới nút chọn nói video gửi nguyên bản để máy chủ làm nét',
      /nguyên bản lên máy chủ/.test(await chu('#al-pick-goi-y')), await chu('#al-pick-goi-y'));
    rotMang = 1;
    await page.setInputFiles('#al-file', [TEP]);
    const thayGui = await choChu('#al-nen', /Đang gửi .*MB/);
    const khoiGui = await chu('#al-nen');
    check('hiện "Đang gửi … MB" ngay trong form', thayGui && /Đang gửi [\d,]+ \/ [\d,]+ MB/.test(khoiGui), khoiGui);
    check('có thanh tiến độ và nút "Dừng lại"',
      await dem('#modal-overlay #al-nen progress') === 1 && await dem('#modal-overlay #al-nen-dung') === 1);
    check('đang gửi: nút đăng và nút chọn tệp tạm khoá',
      await page.locator('#al-submit').isDisabled().catch(() => false) && await page.locator('#al-pick').isDisabled().catch(() => false));
    check('khối tiến độ gọn trong 390px (không tràn ngang)', await tranNgang());
    const thayNen = await choChu('#al-nen', /Máy chủ đang làm nét video/);
    const khoiNen = await chu('#al-nen');
    check('rồi "Máy chủ đang làm nét video… (thường bằng độ dài đoạn phim hoặc nhanh hơn)"',
      thayNen && /thường bằng độ dài đoạn phim hoặc nhanh hơn/.test(khoiNen), khoiNen);
    await page.waitForFunction(() => !document.getElementById('al-nen-dung'), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(300);
    const put = goi.filter(g => g.method === 'PUT' && /\/phan\/0$/.test(g.url)).length;
    check('mạng rớt ở phần đầu thì tự gửi lại phần đó (≥ 2 lần PUT phần 0)', put >= 2, put);
    check('xong: video hiện ở ô xem trước, "Đã chọn 1 video"', /Đã chọn 1 video/.test(await chu('#al-preview')), await chu('#al-preview'));
    check('xong: tên và mô tả cô đã gõ còn nguyên',
      await giaTri('#al-title') === 'Bé chơi cát' && await giaTri('#al-desc') === 'Cả nhóm ra sân cát buổi sáng');
    check('xong: nút đăng mở lại', !(await page.locator('#al-submit').isDisabled().catch(() => true)));
    await page.click('#al-submit');
    await page.waitForFunction(() => /#\/albums\/.+/.test(location.hash), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    albumId = (await page.evaluate(() => location.hash)).split('/')[2] || null;
    check('đăng xong mở album mới', !!albumId, await page.evaluate(() => location.hash));
    const than = JSON.parse(thanTaoAlbum || '{}');
    const p0 = (than.photos || [])[0] || {};
    check('lúc đăng gửi mã tệp (videoDaNen), KHÔNG gửi data URL video',
      /^[a-f0-9]{32}$/.test(p0.videoDaNen || '') && !p0.video && !(thanTaoAlbum || '').includes('data:video'), Object.keys(p0));
  }

  // =========================================================================
  console.log('\n[2] Ô lưới: video .mp4 có ảnh bìa, phát được');
  {
    const v = page.locator('video').first();
    const poster = await v.getAttribute('poster').catch(() => null);
    const src = await v.getAttribute('src').catch(() => '');
    check('ô lưới là <video> có poster = ảnh bìa máy chủ dựng', /\/photo\/[^/?]+\?bia=1$/.test(poster || ''), poster);
    check('ô lưới không tải trước đoạn phim (preload="none")', (await v.getAttribute('preload').catch(() => '')) === 'none');
    const tep = await page.evaluate(async ([s, p]) => {
      const r = await fetch(s, { credentials: 'same-origin' });
      const b = new Uint8Array(await r.arrayBuffer());
      const rb = await fetch(p, { credentials: 'same-origin' });
      return {
        st: r.status, loai: r.headers.get('content-type'), ftyp: String.fromCharCode(...b.slice(4, 8)),
        biaSt: rb.status, biaLoai: rb.headers.get('content-type'),
      };
    }, [src, poster]);
    check('tệp video là MP4 thật (ftyp, video/mp4)', tep.st === 200 && /video\/mp4/.test(tep.loai || '') && tep.ftyp === 'ftyp', tep);
    check('ảnh bìa tải được (image/jpeg)', tep.biaSt === 200 && /image\/jpeg/.test(tep.biaLoai || ''), tep);
    const phat = await page.evaluate(s => new Promise((ok) => {
      const x = document.createElement('video');
      x.muted = true;
      x.preload = 'auto';
      const h = setTimeout(() => ok({ loi: 'quá giờ' }), 15000);
      x.onloadeddata = () => { clearTimeout(h); ok({ w: x.videoWidth, h: x.videoHeight, d: x.duration }); };
      x.onerror = () => { clearTimeout(h); ok({ loi: (x.error || {}).code }); };
      x.src = s;
    }), src);
    check('trình duyệt phát được: 720x1280 (video dọc đã xoay đúng), dài ~3 giây',
      phat.w === 720 && phat.h === 1280 && Math.abs(phat.d - 3) < 0.3, phat);
  }

  // =========================================================================
  console.log('\n[3] Bấm "Dừng lại" giữa lúc gửi: dừng gọn, máy chủ bỏ lượt, form vẫn mở');
  {
    await moMan(`#/albums/${albumId}`);
    await page.click('#btn-add-photo');
    await page.waitForSelector('#al-file', { state: 'attached' });
    treMs = 3000;
    const truoc = goi.length;
    await page.setInputFiles('#al-file', [TEP]);
    await choChu('#al-nen', /Đang gửi/);
    await page.click('#al-nen-dung');
    await page.waitForFunction(() => !document.getElementById('al-nen-dung'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    check('dừng: báo "Đã dừng gửi video"', /Đã dừng gửi video/.test(await chu('#toast-zone')), await chu('#toast-zone'));
    check('dừng: form vẫn mở, chưa có video nào trong danh sách',
      await dem('#modal-overlay #al-file') === 1 && !/video/.test(await chu('#al-preview')), await chu('#al-preview'));
    check('dừng: màn hình xin máy chủ bỏ lượt (DELETE)', goi.slice(truoc).some(g => g.method === 'DELETE'), goi.slice(truoc));
  }

  // =========================================================================
  console.log('\n[4] Đóng form giữa chừng: lượt bị bỏ, form mở lại không nhận video cũ');
  {
    const truoc = goi.length;
    await page.setInputFiles('#al-file', [TEP]);
    await choChu('#al-nen', /Đang gửi/);
    await page.evaluate(() => UI.closeModal());
    await page.waitForTimeout(4500);
    check('đóng form: lượt dở được bỏ trên máy chủ (DELETE), không treo',
      goi.slice(truoc).some(g => g.method === 'DELETE'), goi.slice(truoc).map(g => g.method));
    await page.click('#btn-add-photo');
    await page.waitForSelector('#al-preview', { state: 'attached' });
    await page.waitForTimeout(800);
    check('mở lại form: không có video cũ đổ vào', !/video/.test(await chu('#al-preview')) && await dem('#al-nen-dung') === 0,
      await chu('#al-preview'));
    await page.evaluate(() => UI.closeModal());
    treMs = 1500;
  }

  // =========================================================================
  console.log('\n[5] Hình ảnh ghi nhanh: gửi nguyên bản, máy chủ làm nét, lưu thành nháp có video');
  {
    await moMan('#/hanhtrinh/the-chat');
    await page.click('#ht-ghi-nhanh');
    await page.waitForSelector('#ht-anh', { state: 'attached' });
    await page.fill('#ht-mota', 'Bé lăn bóng qua cầu');
    await page.setInputFiles('#ht-anh', [TEP]);
    const gui = await choChu('#ht-nen', /Đang gửi .*MB/);
    check('Ghi nhanh: "Đang gửi … MB" trong hộp, nút Lưu tạm khoá',
      gui && await page.locator('#ht-luu').isDisabled().catch(() => false), await chu('#ht-nen'));
    const nen = await choChu('#ht-nen', /Máy chủ đang làm nét video/);
    check('Ghi nhanh: rồi "Máy chủ đang làm nét video…"', nen, await chu('#ht-nen'));
    const xong = await choChu('#ht-nen', /làm nét xong/, 60000);
    check('Ghi nhanh: xong thì ô xem trước là video, chữ đã gõ còn nguyên',
      xong && await dem('#ht-anh-xem video') === 1 && await giaTri('#ht-mota') === 'Bé lăn bóng qua cầu');
    check('Ghi nhanh: hộp gọn trong 390px', await tranNgang());
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    const ds = await req('GET', '/api/hanhtrinh/nhap', { cookie: co });
    const n = ((ds.data || {}).nhap || []).find(x => x.moTa === 'Bé lăn bóng qua cầu');
    check('máy chủ có nháp kèm video .mp4 đã nén', !!n && n.laVideo && /\.mp4$/.test(n.anh || ''), n);
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} catch (err) {
  console.error(err);
  check('bài chạy hết không ném lỗi', false, err.message);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
