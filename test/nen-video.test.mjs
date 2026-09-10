// Bài canh NÉN VIDEO TRÊN MÁY CỦA CÔ (Đ150) — chạy trên Chromium THẬT.
//
// Cần Playwright. Chạy bằng:  npm run test:nen-video
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"ok chấp nhận giảm chất lượng video để có thể upload video
// 3-5 phút"*. Ở đợt trước tôi nói trần tệp là 8 MB còn một video điện thoại 3
// phút nặng 150–400 MB, và đề nghị hai đường: hoặc chỉ cho video 60 giây, hoặc
// nén mạnh trên máy của cô. Trường chọn đường thứ hai.
//
// BÀI NÀY NÉN MỘT ĐOẠN PHIM THẬT, KHÔNG GIẢ LẬP.
//
// Nó tự dựng một đoạn video ngay trong trình duyệt (canvas + MediaRecorder),
// rồi đưa đúng đoạn ấy cho `UI.nenVideo` như thể cô vừa chọn tệp. Giả lập hàm
// nén rồi kiểm cái giả lập thì chỉ chứng minh bài canh chạy, không chứng minh
// việc nén chạy — mà đây đúng là chỗ dễ hỏng nhất: nó phụ thuộc vào ba thứ của
// trình duyệt (`MediaRecorder`, `canvas.captureStream`, `AudioContext`) mà máy
// cũ có thể thiếu bất kỳ cái nào.
//
// BỐN ĐIỀU CANH Ở ĐÂY
//
//   1. NÉN XONG PHẢI RA MỘT VIDEO THẬT, nhỏ hơn trần, đúng dạng webm — mục [2].
//   2. PHẢI BÁO TIẾN ĐỘ. Nén lâu đúng bằng độ dài đoạn phim; không báo thì cô
//      tưởng app treo và tắt đi giữa chừng — mục [2].
//   3. DỪNG ĐƯỢC GIỮA CHỪNG. Cô đổi ý thì phải dừng được ngay — mục [3].
//   4. TỪ CHỐI BẰNG TIẾNG CỦA TRƯỜNG. Đoạn quá dài, hay máy không nén được,
//      thì câu từ chối phải là tiếng Việt cô đọc hiểu — mục [4] và [5].
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, CHROMIUM,
  tatBannerMoiCai, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nen-video');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4197), dir: DIR });

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  // Không có cờ này thì Chromium không dựng nổi một đoạn video để làm mẫu thử.
  args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

await page.goto(sv.BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.UI, null, { timeout: 10000 });

// Dựng một đoạn phim thật ngay trong trình duyệt: vẽ vào canvas rồi thu lại.
// `giay` là độ dài mong muốn.
await page.evaluate(() => {
  window.__taoVideo = (giay) => new Promise((ok, hong) => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const ctx2 = c.getContext('2d');
    const dong = c.captureStream(15);
    const may = new MediaRecorder(dong, { mimeType: 'video/webm' });
    const manh = [];
    may.ondataavailable = (e) => { if (e.data && e.data.size) manh.push(e.data); };
    may.onerror = () => hong(new Error('không dựng được video mẫu'));
    may.onstop = () => ok(new File(manh, 'mau.webm', { type: 'video/webm' }));
    let i = 0;
    const ve = () => {
      if (may.state === 'inactive') return;
      i += 1;
      // Vẽ thứ gì đó ĐỔI theo từng khung: canvas đứng yên thì bộ mã hoá nén
      // xuống gần bằng không và bài canh đo một đoạn phim không có thật.
      ctx2.fillStyle = `hsl(${(i * 7) % 360} 80% 50%)`;
      ctx2.fillRect(0, 0, 320, 240);
      ctx2.fillStyle = '#fff';
      ctx2.font = '48px sans-serif';
      ctx2.fillText(String(i), 20 + ((i * 3) % 200), 120);
      requestAnimationFrame(ve);
    };
    may.start(200);
    requestAnimationFrame(ve);
    setTimeout(() => { try { may.stop(); } catch (_) { /* đã dừng */ } }, giay * 1000);
  });
});

// ===========================================================================
console.log('\n[1] Đối chứng — dựng được một đoạn phim thật để mà nén');
{
  const d = await page.evaluate(async () => {
    const f = await window.__taoVideo(3);
    window.__mau = f;
    return { size: f.size, type: f.type };
  });
  check('dựng được tệp video mẫu', d.size > 0, d);
  check('và nó là webm', /webm/.test(d.type), d.type);
}

// ===========================================================================
console.log('\n[2] NÉN THẬT: ra video nhỏ hơn trần, và có báo tiến độ');
{
  const d = await page.evaluate(async () => {
    const moc = [];
    const data = await UI.nenVideo(window.__mau, {
      tranByte: 2 * 1024 * 1024,
      tien: (t) => moc.push(t),
    });
    return {
      dau: String(data).slice(0, 24),
      soByte: Math.round((String(data).length - String(data).indexOf(',') - 1) * 0.75),
      soLanBao: moc.length,
      baoCoTong: moc.length ? Number.isFinite(moc[0].tongGiay) && moc[0].tongGiay > 0 : false,
    };
  });
  check('trả về data URL của một video webm', /^data:video\/webm/.test(d.dau), d.dau);
  check('bản nén có nội dung thật, không rỗng', d.soByte > 500, d.soByte);
  check('và nhỏ hơn trần đã đặt', d.soByte < 2 * 1024 * 1024, d.soByte);
  check('CÓ BÁO TIẾN ĐỘ — cô không phải ngồi đoán app còn sống hay đã treo',
    d.soLanBao >= 1, d.soLanBao);
  check('và mỗi lần báo đều kèm TỔNG độ dài, để màn hình nói được "còn bao lâu"',
    d.baoCoTong, d.baoCoTong);
}

// ===========================================================================
console.log('\n[3] Cô đổi ý thì DỪNG ĐƯỢC giữa chừng');
{
  const d = await page.evaluate(async () => {
    try {
      await UI.nenVideo(window.__mau, { tranByte: 2 * 1024 * 1024, huy: () => true });
      return { dung: false };
    } catch (e) { return { dung: true, loi: e.message }; }
  });
  check('bấm Dừng thì việc nén dừng lại', d.dung, d);
  check('và câu báo là tiếng Việt', /Đã dừng nén video/.test(d.loi || ''), d.loi);
}

// ===========================================================================
console.log('\n[4] Đoạn QUÁ DÀI thì từ chối ngay, bằng tiếng của trường');
{
  const d = await page.evaluate(async () => {
    try {
      // Trần một giây: đoạn mẫu 3 giây chắc chắn vượt.
      await UI.nenVideo(window.__mau, { toiDaGiay: 1 });
      return { chan: false };
    } catch (e) { return { chan: true, loi: e.message }; }
  });
  check('từ chối đoạn dài quá trần', d.chan, d);
  check('câu từ chối bằng tiếng Việt và nói rõ trần là bao nhiêu phút',
    /phút/.test(d.loi || '') && !/undefined|Error|null/.test(d.loi || ''), d.loi);
}

// ===========================================================================
console.log('\n[5] Máy KHÔNG nén được thì nói rõ, không nổ giữa chừng');
{
  const d = await page.evaluate(async () => {
    const giu = window.MediaRecorder;
    delete window.MediaRecorder;
    try {
      await UI.nenVideo(window.__mau, {});
      return { chan: false };
    } catch (e) { return { chan: true, loi: e.message }; } finally { window.MediaRecorder = giu; }
  });
  check('máy thiếu MediaRecorder thì ném đúng mã KHONG_NEN_DUOC', d.chan && d.loi === 'KHONG_NEN_DUOC', d);
}

// ===========================================================================
console.log('\n[6] Màn Album dịch mã ấy sang tiếng của trường, không để lọt chữ tiếng Anh');
{
  const ma = fs.readFileSync(path.join(GOC, 'public/js/views/albums.js'), 'utf8');
  check('albums.js có bắt mã KHONG_NEN_DUOC', /KHONG_NEN_DUOC/.test(ma));
  const quanh = ma.slice(ma.indexOf('KHONG_NEN_DUOC'), ma.indexOf('KHONG_NEN_DUOC') + 400);
  check('và đổi nó thành một câu tiếng Việt cho cô đọc',
    /Máy này chưa nén được video/.test(quanh), quanh.slice(0, 160));
  check('trần dung lượng của màn hình vẫn khớp với trần của máy chủ',
    (() => {
      const up = fs.readFileSync(path.join(GOC, 'lib/uploads.js'), 'utf8');
      const mc = (up.match(/MAX_VIDEO_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/) || [])[1];
      const mh = (ma.match(/TRAN_VIDEO:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/) || [])[1];
      return mc && mh && mc === mh;
    })(), 'hai con số phải bằng nhau');
  check('có trần ĐỘ DÀI riêng — trần dung lượng không chặn được đoạn quay quên tắt',
    /TOI_DA_GIAY_VIDEO:\s*\d+/.test(ma));
  check('và màn hình nói trước rằng nén mất khoảng đúng bằng độ dài đoạn phim',
    /khoảng đúng bằng độ dài đoạn phim/.test(ma));
  check('cùng lời dặn đừng khoá máy giữa chừng',
    /đừng khoá máy|để nguyên màn hình/i.test(ma));
  check('không lỗi JavaScript nào trong cả bài', loiJs.length === 0, loiJs.slice(0, 3));
}

await ctx.close();
await browser.close();
await sv.dung();
donThuMucTam(DIR);
tongKet('Nén video trên máy của cô');
