// Bài canh trên trình duyệt thật — VIDEO LỚN TRONG ALBUM (Đ260f, góp ý 18/11).
//
// Chạy bằng:  node test/phan-hoi-1811-album-video-giao-dien.test.mjs
//
// Nhà trường 18/11: *"Up video lên rất lâu, đồng thời up xong thì không thấy
// đâu cả"* — kèm ảnh hộp "Đang nén video 1:01 / 1:16 … Dừng lại".
//
// Gốc lỗi: video trên 8 MB phải nén trên máy của cô, và phần hỏi + đồng hồ nén
// trước đây mở bằng `UI.modal`. `UI.modal` luôn đóng hộp đang mở trước, nên
// form "Tạo album" / "Thêm ảnh" (tên, mô tả, ô xem trước, nút đăng) bị huỷ.
// Nén xong video vào danh sách chờ của một form không còn nữa — cô không thấy
// gì, mở lại form thì danh sách bị xoá.
//
// Bài này canh:
//   [1] Tạo album với video lớn: phần hỏi và tiến độ nén nằm NGAY TRONG form,
//       chữ đã gõ còn nguyên, nén xong video hiện ở ô xem trước, đăng được,
//       máy chủ nhận bản webm, ô lưới có ảnh bìa (preload="metadata") và ▶.
//   [2] Gia đình của nhóm (đồng ý chia sẻ trong dữ liệu mẫu) thấy video đó.
//   [3] Nhiều video lớn nén lần lượt "Video 2/2"; lời báo đếm "1 ảnh, 2 video".
//   [4] Bấm "Dừng lại": dừng gọn, form vẫn mở, chữ đã gõ còn nguyên.
//   [5] Đóng form giữa chừng: việc nén dừng, form mở lại không nhận video cũ.
//
// [1] và [2] NÉN THẬT bằng `UI.nenVideo` (chỉ hạ ngưỡng "video lớn" để một
// đoạn phim 3 giây đi đúng đường của đoạn 1 phút). [3]–[5] thay `UI.nenVideo`
// bằng bản giả có đồng hồ để kiểm màn hình mà không chờ nén thật.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph1811-album-video-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5350), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=';
const TEP_ANH = path.join(DIR, 'mau-album.jpg');
fs.writeFileSync(TEP_ANH, Buffer.from(JPEG_B64, 'base64'));

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
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
const dem = (sel) => page.locator(sel).count();
const chu = (sel) => page.locator(sel).innerText().catch(() => '');
const loiBao = () => chu('#toast-zone');
const giaTri = (sel) => page.locator(sel).inputValue().catch(() => null);

// Một đoạn phim webm THẬT, dựng trong trình duyệt, ghi ra tệp để chọn qua ô
// chọn tệp đúng như cô chọn từ máy.
async function dungVideoMau(giay) {
  const b64 = await page.evaluate((g) => new Promise((ok, hong) => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
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
      ctx2.fillStyle = `hsl(${(i * 7) % 360} 80% 50%)`;
      ctx2.fillRect(0, 0, 320, 240);
      ctx2.fillStyle = '#fff';
      ctx2.font = '48px sans-serif';
      ctx2.fillText(String(i), 20 + ((i * 3) % 200), 120);
      requestAnimationFrame(ve);
    };
    may.start(200);
    requestAnimationFrame(ve);
    setTimeout(() => { try { may.stop(); } catch (_) { /* đã dừng */ } }, g * 1000);
  }), giay);
  return Buffer.from(b64, 'base64');
}

// Hạ ngưỡng "video lớn" để đoạn phim mẫu đi đường nén. `giaLap` thay
// `UI.nenVideo` bằng bản có đồng hồ: mỗi 250 ms tiến nửa "giây" và báo tiến
// độ, hết `tongGiay` thì trả về đúng đoạn phim mẫu; `huy()` trả true thì dừng
// như bản thật.
async function haNguong({ giaLap = false, tongGiay = 2 } = {}) {
  await page.evaluate(({ giaLap, tongGiay }) => {
    App.views.albums.TRAN_VIDEO = 1000;
    window.__daHuy = 0;
    window.__soLanNen = 0;
    if (!window.__nenThat) window.__nenThat = UI.nenVideo;
    if (!giaLap) {
      // Nén thật, chỉ nới trần đích cho đoạn mẫu nhỏ.
      UI.nenVideo = (f, o) => window.__nenThat(f, { ...o, tranByte: 4 * 1024 * 1024 });
      return;
    }
    UI.nenVideo = (f, o) => new Promise((ok, hong) => {
      window.__soLanNen += 1;
      let g = 0;
      const t = setInterval(() => {
        if (o.huy && o.huy()) { clearInterval(t); window.__daHuy += 1; hong(new Error('Đã dừng nén video')); return; }
        g += 0.5;
        if (o.tien) o.tien({ giay: Math.min(g, tongGiay), tongGiay });
        if (g >= tongGiay) {
          clearInterval(t);
          const r = new FileReader();
          r.onload = () => ok(r.result);
          r.readAsDataURL(f);
        }
      }, 250);
    });
  }, { giaLap, tongGiay });
}

try {
  const VID = await (async () => {
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    return dungVideoMau(3);
  })();
  const TEP_VIDEO = path.join(DIR, 'be-choi-cat.webm');
  const TEP_VIDEO_2 = path.join(DIR, 'be-xep-hinh.webm');
  fs.writeFileSync(TEP_VIDEO, VID);
  fs.writeFileSync(TEP_VIDEO_2, VID);
  check('đối chứng — dựng được đoạn phim mẫu thật', VID.length > 1000, VID.length);

  const GV4 = (await login('giaovien4', '123456')).cookie;
  const PH = (await login('ph.trang', '123456')).cookie;
  check('đối chứng — đăng nhập được cô nhóm Nhà trẻ 1 và gia đình của nhóm', !!GV4 && !!PH);

  // =========================================================================
  console.log('\n[1] Tạo album với video lớn: hỏi và nén NGAY TRONG form, chữ đã gõ còn nguyên');
  await dangNhap('giaovien4', '123456');
  await moMan('#/albums');
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  await page.fill('#al-title', 'Bé chơi cát');
  await page.fill('#al-desc', 'Cả nhóm ra sân cát buổi sáng');
  await haNguong();
  await page.setInputFiles('#al-file', [TEP_VIDEO]);
  await page.waitForSelector('#al-nen-ok', { timeout: 8000 }).catch(() => {});
  check('hỏi trước khi nén hiện NGAY TRONG form tạo album (form không bị thay bằng hộp khác)',
    await dem('#modal-overlay #al-nen-ok') === 1 && await dem('#modal-overlay #al-title') === 1,
    await chu('#modal-overlay'));
  check('tên và mô tả cô đã gõ còn nguyên',
    await giaTri('#al-title') === 'Bé chơi cát' && await giaTri('#al-desc') === 'Cả nhóm ra sân cát buổi sáng',
    [await giaTri('#al-title'), await giaTri('#al-desc')]);
  const hoi = await chu('#al-nen');
  check('câu hỏi nói thật độ dài video và thời gian phải chờ',
    /Video dài 0:0[23]/.test(hoi) && /nén mất/.test(hoi) && /giữ màn hình mở/.test(hoi), hoi);
  check('đang hỏi: nút đăng và nút chọn tệp tạm khoá (chưa trả lời thì chưa đăng, chưa chọn thêm)',
    await page.locator('#al-submit').isDisabled().catch(() => false)
      && await page.locator('#al-pick').isDisabled().catch(() => false));
  await page.click('#al-nen-ok');
  await page.waitForTimeout(600);
  const tien = await chu('#al-nen');
  check('đang nén: khối tiến độ trong form có chữ "Đang nén video", thanh tiến độ và nút "Dừng lại"',
    /Đang nén video/.test(tien) && await dem('#al-nen progress') === 1 && await dem('#al-nen-dung') === 1, tien);
  check('đang nén: nút đăng tạm khoá để không đăng thiếu video',
    await page.locator('#al-submit').isDisabled().catch(() => false));
  await page.waitForFunction(() => !document.getElementById('al-nen-dung'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(400);
  check('nén xong: form vẫn mở, tên album còn nguyên',
    await dem('#modal-overlay #al-title') === 1 && await giaTri('#al-title') === 'Bé chơi cát');
  const xemTruoc = await chu('#al-preview');
  check('nén xong: video hiện ở ô xem trước, dòng đếm nói "1 video"',
    /Đã chọn 1 video/.test(xemTruoc), xemTruoc);
  check('nén xong: nút đăng mở lại', !(await page.locator('#al-submit').isDisabled().catch(() => true)));
  await page.click('#al-submit');
  await page.waitForFunction(() => /#\/albums\/./.test(location.hash), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const idAl = (page.url().match(/#\/albums\/([^/?#]+)/) || [])[1];
  check('đăng xong chuyển sang album vừa tạo', !!idAl, [page.url(), await loiBao()]);
  check('lời báo đếm đúng "1 video", không gọi video là ảnh',
    /Đã đăng album với 1 video/.test(await loiBao()), await loiBao());
  const ct = idAl ? await req('GET', `/api/albums/${idAl}`, { cookie: GV4 }) : { data: { photos: [] } };
  const tepVid = ((ct.data && ct.data.photos) || [])[0] || {};
  check('máy chủ nhận bản nén webm, lưu thành một dòng trong album',
    (ct.data.photos || []).length === 1 && /\.webm$/.test(tepVid.file || ''), ct.data && ct.data.photos);
  check('ô lưới video tải phần đầu để có ảnh bìa (preload="metadata"), không còn ô đen',
    await dem('.photo-grid video[preload="metadata"]') === 1, await page.locator('.photo-grid').innerHTML().catch(() => ''));
  check('ô lưới video có dấu ▶ chồng lên', /▶/.test(await chu('.photo-grid .photo')));
  const taiCo = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return { s: r.status, t: r.headers.get('content-type') };
  }, `/api/albums/${idAl}/photo/${tepVid.id}`);
  check('cô tải được video (200, video/webm)', taiCo.s === 200 && /video\/webm/.test(taiCo.t || ''), taiCo);

  // =========================================================================
  console.log('\n[2] Gia đình của nhóm thấy video');
  await dangNhap('ph.trang', '123456');
  await moMan(`#/albums/${idAl}`);
  check('gia đình thấy ô video trong album', await dem('.photo-grid video') === 1,
    await chu('#view'));
  const taiPh = await page.evaluate(async (u) => (await fetch(u)).status, `/api/albums/${idAl}/photo/${tepVid.id}`);
  check('gia đình tải được video (200)', taiPh === 200, taiPh);

  // =========================================================================
  console.log('\n[3] Nhiều video lớn: nén lần lượt, hiện "Video 2/2"; lời báo đếm ảnh và video');
  await dangNhap('giaovien4', '123456');
  await moMan(`#/albums/${idAl}`);
  await page.click('#btn-add-photo');
  await page.waitForSelector('#al-file', { state: 'attached' });
  await haNguong({ giaLap: true, tongGiay: 4 });   // bản giả: 4 "giây" nén ≈ 2 giây thật
  await page.setInputFiles('#al-file', [TEP_ANH, TEP_VIDEO, TEP_VIDEO_2]);
  await page.waitForSelector('#al-nen-ok', { timeout: 8000 }).catch(() => {});
  const hoi2 = await chu('#al-nen');
  check('hỏi một lần cho cả hai video, nói rõ có 2 video', /2 video/.test(hoi2), hoi2);
  check('ảnh đi kèm đã vào ô xem trước trong lúc chờ', /1 ảnh/.test(await chu('#al-preview')), await chu('#al-preview'));
  await page.click('#al-nen-ok');
  await page.waitForFunction(() => /Video 2\/2/.test((document.getElementById('al-nen') || {}).innerText || ''),
    null, { timeout: 10000 }).catch(() => {});
  check('đang nén video thứ hai thì hiện "Video 2/2"', /Video 2\/2/.test(await chu('#al-nen')), await chu('#al-nen'));
  check('video thứ nhất đã hiện ở ô xem trước trước khi xong cả lượt',
    /1 ảnh, 1 video/.test(await chu('#al-preview')), await chu('#al-preview'));
  await page.waitForFunction(() => !document.getElementById('al-nen-dung'), null, { timeout: 10000 }).catch(() => {});
  check('xong cả lượt: ô xem trước có 1 ảnh, 2 video',
    /Đã chọn 1 ảnh, 2 video/.test(await chu('#al-preview')), await chu('#al-preview'));
  await page.click('#al-submit');
  await page.waitForTimeout(2500);
  check('lời báo đếm đúng "1 ảnh, 2 video"', /Đã thêm 1 ảnh, 2 video vào album/.test(await loiBao()), await loiBao());
  const ct3 = await req('GET', `/api/albums/${idAl}`, { cookie: GV4 });
  check('album có 4 tệp (1 video cũ + 1 ảnh + 2 video)', (ct3.data.photos || []).length === 4,
    (ct3.data.photos || []).map(p => p.file));
  check('lưới hiện 3 ô video có ảnh bìa', await dem('.photo-grid video[preload="metadata"]') === 3);

  // =========================================================================
  console.log('\n[4] Bấm "Dừng lại": dừng gọn, form vẫn mở, chữ đã gõ còn nguyên');
  await moMan('#/albums');
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  await page.fill('#al-title', 'Bé tưới cây');
  await haNguong({ giaLap: true, tongGiay: 30 });
  await page.setInputFiles('#al-file', [TEP_VIDEO]);
  await page.waitForSelector('#al-nen-ok', { timeout: 8000 }).catch(() => {});
  await page.click('#al-nen-ok');
  await page.waitForTimeout(700);
  await page.click('#al-nen-dung').catch(() => {});
  await page.waitForFunction(() => !document.getElementById('al-nen-dung'), null, { timeout: 5000 }).catch(() => {});
  check('bấm Dừng thì việc nén dừng thật', await page.evaluate(() => window.__daHuy) === 1,
    await page.evaluate(() => window.__daHuy));
  check('form vẫn mở, tên album còn nguyên',
    await dem('#modal-overlay #al-title') === 1 && await giaTri('#al-title') === 'Bé tưới cây');
  check('báo đã dừng bằng tiếng Việt', /Đã dừng nén video/.test(await loiBao()), await loiBao());
  check('nút đăng và nút chọn tệp mở lại',
    !(await page.locator('#al-submit').isDisabled().catch(() => true))
      && !(await page.locator('#al-pick').isDisabled().catch(() => true)));
  check('không có video dở dang nào trong danh sách chờ', /Chưa chọn/.test(await chu('#al-preview')), await chu('#al-preview'));

  console.log('\n[4b] Bấm "Bỏ qua video này": không nén, form mở lại như cũ');
  await haNguong({ giaLap: true, tongGiay: 3 });
  await page.setInputFiles('#al-file', [TEP_VIDEO]);
  await page.waitForSelector('#al-nen-thoi', { timeout: 8000 }).catch(() => {});
  await page.click('#al-nen-thoi');
  await page.waitForTimeout(400);
  check('bỏ qua thì không nén', await page.evaluate(() => window.__soLanNen) === 0);
  check('khối hỏi biến mất, nút đăng và nút chọn tệp mở lại, tên còn nguyên',
    await dem('#al-nen-ok') === 0 && !(await page.locator('#al-submit').isDisabled().catch(() => true))
      && !(await page.locator('#al-pick').isDisabled().catch(() => true)) && await giaTri('#al-title') === 'Bé tưới cây');

  console.log('\n[4c] Đang đọc ảnh vừa chọn: nút chọn tệp và nút đăng khoá tới khi xong');
  await page.evaluate(() => {
    if (!window.__nenAnhThat) window.__nenAnhThat = UI.nenAnh;
    UI.nenAnh = (f, o) => new Promise((ok, hong) => setTimeout(() => window.__nenAnhThat(f, o).then(ok, hong), 1500));
  });
  await page.setInputFiles('#al-file', [TEP_ANH]);
  await page.waitForTimeout(300);
  check('đang đọc ảnh: nút chọn tệp khoá (chọn thêm lúc này là hai lượt giành nhau khối #al-nen)',
    await page.locator('#al-pick').isDisabled().catch(() => false));
  check('đang đọc ảnh: nút đăng khoá (đăng lúc này là đăng thiếu ảnh)',
    await page.locator('#al-submit').isDisabled().catch(() => false));
  await page.waitForFunction(() => /1 ảnh/.test((document.getElementById('al-preview') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
  check('đọc xong: ảnh vào ô xem trước, hai nút mở lại',
    /Đã chọn 1 ảnh/.test(await chu('#al-preview')) && !(await page.locator('#al-pick').isDisabled().catch(() => true))
      && !(await page.locator('#al-submit').isDisabled().catch(() => true)), await chu('#al-preview'));
  await page.evaluate(() => { UI.nenAnh = window.__nenAnhThat; });

  // =========================================================================
  console.log('\n[5] Đóng form giữa chừng: dừng nén, form mở lại không nhận video cũ');
  await haNguong({ giaLap: true, tongGiay: 3 });
  await page.setInputFiles('#al-file', [TEP_VIDEO]);
  await page.waitForSelector('#al-nen-ok', { timeout: 8000 }).catch(() => {});
  await page.click('#al-nen-ok');
  await page.waitForTimeout(600);
  await page.click('#modal-overlay .close-x');
  await page.waitForTimeout(1200);
  check('đóng form thì việc nén dừng lại', await page.evaluate(() => window.__daHuy) === 1,
    await page.evaluate(() => window.__daHuy));
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  await page.waitForTimeout(3500);   // quá thời điểm bản nén cũ lẽ ra xong
  check('form mở lại sạch, không có video của lượt trước',
    !/video/.test(await chu('#al-preview')) && await dem('#al-nen-dung') === 0, await chu('#al-preview'));

  check('không có lỗi JavaScript trên trang', !loiJs.length, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
