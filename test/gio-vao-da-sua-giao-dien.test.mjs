// Giờ tới lớp cô đã sửa tay thì ảnh tới lớp thôi hiện "Cô chụp lúc…" (Đ255)
// — đo trên trình duyệt, ở màn Điểm danh của gia đình.
//
// Cần Playwright. Chạy bằng:  node test/gio-vao-da-sua-giao-dien.test.mjs
//
// Luật của cờ `gioVaoDaSua` nằm ở `test/gio-vao-da-sua.test.mjs`. Bài này
// canh phần gia đình nhìn thấy trong hộp "Chi tiết điểm danh" của một ngày:
//
//   · cô chưa sửa giờ → dưới ảnh tới lớp có "Cô chụp lúc …" như trước nay;
//   · cô sửa giờ tới lớp → chữ ấy KHÔNG còn, ảnh vẫn hiện, "Giờ đến lớp" mang
//     giờ mới — không còn hai giờ khác nhau cho cùng một buổi sáng;
//   · ảnh RA VỀ giữ nguyên chữ "cô chụp lúc …" của nó;
//   · giờ đang ghi không còn là giờ cô sửa → ảnh tới lớp hiện lại giờ chụp.
//
// Ảnh do cô gửi lên thật (để ô ảnh tải được), còn GIỜ thì đặt thẳng vào bảng
// (23:59 / 23:58) và giờ cô sửa chọn "00:00" — đường sửa giờ từ chối giờ ở
// tương lai — để bài cho cùng kết quả ở mọi giờ chạy.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, taoReq, taoLogin, CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('gio-vao-da-sua-giao-dien');
sinhDuLieu(DIR);
const HOM = HOM_NAY();
const CSDL = path.join(DIR, 'school.db');
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function csdl(viec) {
  const c = new Database(CSDL);
  try { return viec(c); } finally { c.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7363), dir: DIR });
const req = taoReq(sv.BASE);
const co = (await taoLogin(req)('giaovien', '123456')).cookie;

// CA CỦA CHỦ DỰ ÁN: cô chụp ảnh tới lớp BÙ cuối ngày, nên máy đóng giờ vào
// và giờ chụp cùng là 23:59. s1 là con của tài khoản `phuhuynh`.
csdl((c) => {
  for (const bang of ['attendance', 'attendance_photo', 'attendance_anh_ve']) {
    c.prepare(`DELETE FROM ${bang} WHERE studentId = 's1' AND date = ?`).run(HOM);
  }
});
const chup = await req('POST', '/api/attendance/anh', { cookie: co, body: { studentId: 's1', date: HOM, anh: ANH } });
check('dựng cảnh — cô chụp được ảnh tới lớp cho s1', chup.status === 201 && !!chup.data.file, `${chup.status}`);
csdl((c) => {
  c.prepare("UPDATE attendance SET checkIn = '23:59' WHERE studentId = 's1' AND date = ?").run(HOM);
  c.prepare("UPDATE attendance_photo SET taoLuc = '23:59' WHERE studentId = 's1' AND date = ?").run(HOM);
});

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

await page.goto(sv.BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('#lg-user', { timeout: 10000 });
await page.fill('#lg-user', 'phuhuynh');
await page.fill('#lg-pass', '123456');
await page.click('button[type=submit]');
await page.waitForSelector('.tile-grid', { timeout: 10000 });

// Gia đình mở hộp của hôm nay, đúng bé s1 — cùng địa chỉ mà tin báo trỏ tới.
// Đi qua Trang chủ trước để màn Điểm danh hỏi lại máy chủ.
async function moHopHomNay() {
  await page.goto(`${sv.BASE}/#/`, { waitUntil: 'networkidle' });
  await page.goto(`${sv.BASE}/#/attendance/${HOM}/s1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#modal-overlay .att-anh-ngay img', { timeout: 10000 });
  await page.waitForTimeout(400);
  return page.evaluate(() => ({
    chu: document.querySelector('#modal-overlay').innerText,
    tam: [...document.querySelectorAll('#modal-overlay .att-anh-ngay')].map((el) => {
      const img = el.querySelector('img');
      return { chu: el.innerText, alt: img ? img.alt : '', taiDuoc: !!img && img.complete && img.naturalWidth > 0 };
    }),
    dong: [...document.querySelectorAll('#modal-overlay .list-row')].map(el => el.innerText.replace(/\s+/g, ' ').trim()),
    banGhi: [...document.querySelectorAll('#view .list-row')].map(el => el.innerText.replace(/\s+/g, ' ').trim()),
  }));
}
const dongCua = (hop, nhan) => hop.dong.find(d => d.startsWith(nhan)) || '';
const CHUP_LUC = /chụp lúc/i;

// ===========================================================================
console.log('\n[1] Cô CHƯA sửa giờ: dưới ảnh tới lớp có "Cô chụp lúc …" như trước nay');
{
  const hop = await moHopHomNay();
  check('hộp của hôm nay có MỘT tấm ảnh tới lớp, tải được',
    hop.tam.length === 1 && hop.tam[0].alt === 'Ảnh con tới lớp' && hop.tam[0].taiDuoc, hop.tam);
  check('dưới ảnh ghi "Cô chụp lúc 23:59"', !!hop.tam[0] && /Cô chụp lúc 23:59/.test(hop.tam[0].chu), hop.tam[0]);
  check('"Giờ đến lớp" ghi 23:59', /23:59/.test(dongCua(hop, 'Giờ đến lớp')), hop.dong);
}

// ===========================================================================
console.log('\n[2] Cô SỬA giờ tới lớp: chữ "Cô chụp lúc …" không còn, ảnh và giờ mới vẫn đó');
{
  const sua = await req('POST', '/api/attendance/gio-vao', { cookie: co, body: { studentId: 's1', date: HOM, gio: '00:00' } });
  check('cô sửa giờ tới lớp thành 00:00 → 200', sua.status === 200, `${sua.status} ${JSON.stringify(sua.data).slice(0, 120)}`);

  const hop = await moHopHomNay();
  check('ảnh tới lớp VẪN hiện và tải được',
    hop.tam.length === 1 && hop.tam[0].alt === 'Ảnh con tới lớp' && hop.tam[0].taiDuoc, hop.tam);
  check('dưới ảnh KHÔNG còn chữ "chụp lúc"', !!hop.tam[0] && !CHUP_LUC.test(hop.tam[0].chu), hop.tam[0]);
  check('"Giờ đến lớp" ghi giờ cô đã sửa (00:00)', /00:00/.test(dongCua(hop, 'Giờ đến lớp')), hop.dong);
  check('cả hộp không còn giờ 23:59 nào — gia đình chỉ thấy MỘT giờ cho buổi sáng', !/23:59/.test(hop.chu), hop.chu);
  check('không để lại dòng chữ trống hay chữ kỹ thuật dưới ảnh',
    !!hop.tam[0] && !/undefined|null|NaN|gioVaoDaSua/.test(hop.chu) && hop.tam[0].chu.trim() === '', hop.tam[0]);
  const banGhi = hop.banGhi.find(d => /Vào lớp/.test(d)) || '';
  check('dòng hôm nay trong "Bản ghi gần nhất" cũng ghi "Vào lớp 00:00"', /Vào lớp 00:00/.test(banGhi), hop.banGhi);
}

// ===========================================================================
console.log('\n[3] Có thêm ảnh RA VỀ: ảnh ra về giữ chữ của nó, ảnh tới lớp vẫn không hiện giờ chụp');
{
  const ve = await req('POST', '/api/attendance/ra-ve', { cookie: co, body: { studentId: 's1', date: HOM, gio: '00:30', anh: ANH } });
  check('dựng cảnh — cô ghi con ra về lúc 00:30 kèm ảnh', ve.status === 200 && !!ve.data.anh, `${ve.status} ${JSON.stringify(ve.data).slice(0, 120)}`);
  csdl(c => c.prepare("UPDATE attendance_anh_ve SET taoLuc = '23:58' WHERE studentId = 's1' AND date = ?").run(HOM));

  const hop = await moHopHomNay();
  const toi = hop.tam.find(t => t.alt === 'Ảnh con tới lớp');
  const raVe = hop.tam.find(t => t.alt === 'Ảnh con lúc ra về');
  check('hộp có hai tấm: tới lớp và ra về, đều tải được',
    hop.tam.length === 2 && !!toi && !!raVe && toi.taiDuoc && raVe.taiDuoc, hop.tam);
  check('ảnh RA VỀ vẫn ghi "Ảnh con lúc ra về · cô chụp lúc 23:58"',
    !!raVe && /Ảnh con lúc ra về · cô chụp lúc 23:58/.test(raVe.chu), raVe);
  check('ảnh tới lớp còn chú thích "Ảnh con tới lớp" nhưng KHÔNG có giờ chụp',
    !!toi && /Ảnh con tới lớp/.test(toi.chu) && !CHUP_LUC.test(toi.chu) && !/23:59/.test(toi.chu), toi);
  check('"Giờ đến lớp" 00:00 và "Giờ ra về" 00:30',
    /00:00/.test(dongCua(hop, 'Giờ đến lớp')) && /00:30/.test(dongCua(hop, 'Giờ ra về')), hop.dong);
}

// ===========================================================================
console.log('\n[4] Giờ đang ghi KHÔNG còn là giờ cô sửa: ảnh tới lớp hiện lại giờ chụp');
{
  // Như khi cô chấm nghỉ rồi chấm có mặt lại và máy đóng giờ mới (ca thật do
  // bài máy chủ canh); ở đây đặt thẳng giờ để không phụ thuộc giờ chạy.
  csdl(c => c.prepare("UPDATE attendance SET checkIn = '00:10' WHERE studentId = 's1' AND date = ?").run(HOM));
  let hop = await moHopHomNay();
  const toi = hop.tam.find(t => t.alt === 'Ảnh con tới lớp');
  check('hai tấm: ảnh tới lớp ghi lại "Ảnh con tới lớp · cô chụp lúc 23:59"',
    !!toi && /Ảnh con tới lớp · cô chụp lúc 23:59/.test(toi.chu), toi);
  check('…ảnh ra về không đổi',
    /Ảnh con lúc ra về · cô chụp lúc 23:58/.test((hop.tam.find(t => t.alt === 'Ảnh con lúc ra về') || {}).chu || ''), hop.tam);

  // Cô gỡ giờ ra về (ảnh ra về gỡ theo): hộp trở lại một tấm.
  const go = await req('POST', '/api/attendance/ra-ve/go', { cookie: co, body: { studentId: 's1', date: HOM } });
  check('dựng cảnh — cô gỡ giờ ra về', go.status === 200, go.status);
  hop = await moHopHomNay();
  check('một tấm: dưới ảnh ghi lại "Cô chụp lúc 23:59"',
    hop.tam.length === 1 && /Cô chụp lúc 23:59/.test(hop.tam[0].chu), hop.tam);
}

// ===========================================================================
console.log('\n[5] Không lỗi JavaScript nào trong suốt bài');
check('trang không ném lỗi', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
