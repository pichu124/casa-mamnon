// Bài canh MÀN HÌNH ngày công tính từ giờ ở cổng và giải trình (K1-4).
//
// Chạy bằng:  node test/phan-hoi-2010-ngay-cong-giao-dien.test.mjs   (trình duyệt thật)
//
// Phía máy chủ đã có bài riêng (test/phan-hoi-2010-ngay-cong.test.mjs). Bài
// này bấm trên trình duyệt thật đúng những gì cô và Nhân sự sẽ bấm:
//
//   1. Nhân sự bật quy tắc từ NGÀY MAI trên thẻ "Tính công theo giờ ở cổng".
//   2. Bảng công từng ngày hiện trạng thái tự tính bằng chữ (không còn ô trống
//      hay "—" cho ngày tính từ giờ cổng), kèm giờ ở cổng. "Cần giải trình" là
//      lời nhắc trung tính, không tô đỏ / cam. Đổi loại ngày không xoá giờ.
//   3. "Của tôi": cô gửi giải trình cho ngày cần giải trình / chưa có giờ,
//      rút lại khi còn chờ.
//   4. Hàng chờ duyệt: duyệt, không duyệt (bắt buộc lý do), không tự duyệt.
//   5. Cô thấy kết quả; hôm nay chưa có giờ ra là "Đang ở trường".
//   6. Đổi cách tính và tắt — chỉ từ ngày mai, lịch sử giữ đủ.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, datChucVu, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ngay-cong-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu', 'diemdanh']);
const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
datChucVu(DIR, 'nhansu1', 'nhansu');

const T = HOM_NAY();
const THANG = T.slice(0, 7);
const congNgay = (n, k) => new Date(Date.parse(`${n}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
const MAI = congNgay(T, 1);
// Tháng trước luôn đã qua trọn vẹn, nên mọi ngày dựng sẵn đều là "ngày đã qua"
// bất kể bài chạy vào ngày mấy trong tháng.
const THANG_TRUOC = (() => { const [y, m] = THANG.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
const DAU_THANG_TRUOC = `${THANG_TRUOC}-01`;
const W = [];
for (let n = DAU_THANG_TRUOC; n.startsWith(THANG_TRUOC); n = congNgay(n, 1)) {
  const thu = new Date(`${n}T00:00:00Z`).getUTCDay();
  if (thu >= 1 && thu <= 5) W.push(n);
}
const fmt = (n) => `${n.slice(8, 10)}/${n.slice(5, 7)}/${n.slice(0, 4)}`;

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3895), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
function csdl(fn) {
  const c = new Database(path.join(DIR, 'school.db'), { timeout: 10000 });
  try { return fn(c); } finally { c.close(); }
}
const NS_ID = csdl(c => c.prepare("SELECT id FROM users WHERE username = 'nhansu1'").get().id);
const dongTay = (userId, n) => csdl(c => c.prepare('SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?').get(userId, n));
const giaiTrinhCua = (userId, n) => csdl(c => c.prepare(
  'SELECT * FROM nhansu_giai_trinh WHERE userId = ? AND ngay = ? ORDER BY guiLuc DESC').all(userId, n));

// Dữ liệu cổng của cô t1 (Mai Anh) trong tháng trước, và một dòng ghi tay có giờ.
csdl((c) => {
  c.prepare("UPDATE users SET createdAt = '2025-01-01T00:00:00.000Z' WHERE id = 't1'").run();
  c.prepare('DELETE FROM staff_checkin WHERE userId IN (?, ?)').run('t1', NS_ID);
  c.prepare('DELETE FROM nhansu_cham_cong WHERE userId IN (?, ?)').run('t1', NS_ID);
  const cong = c.prepare(`INSERT INTO staff_checkin (id, userId, ngay, gioVao, gioRa, campusId, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, 'cs1', ?)`);
  const luc = new Date().toISOString();
  cong.run('gd_0', 't1', W[0], '07:00', '15:30', luc);   // đủ công
  cong.run('gd_1', 't1', W[1], '07:00', '14:00', luc);   // trọn ca sáng → nửa ngày
  cong.run('gd_2', 't1', W[2], '08:00', '11:00', luc);   // chưa đủ giờ
  cong.run('gd_3', 't1', W[3], '07:30', '', luc);        // thiếu giờ ra
  cong.run('gd_t', 't1', T, '07:30', '', luc);           // hôm nay, chưa về
  cong.run('gd_ns', NS_ID, W[2], '07:30', '', luc);      // của chính người Nhân sự
  c.prepare(`INSERT INTO nhansu_cham_cong (userId, ngay, loai, gioVao, gioRa, ghiChu, nguoiGhi, capNhatLuc)
    VALUES ('t1', ?, 'di-lam', '07:10', '16:00', 'Đi tập huấn', 'x', ?)`).run(W[5], luc);
});

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const guiDi = [];
page.on('request', r => { if (r.method() !== 'GET') guiDi.push({ method: r.method(), url: r.url().replace(sv.BASE, ''), than: r.postData() || '' }); });

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
const nghi = (ms = 1000) => page.waitForTimeout(ms);
const chuCua = async (sel) => (await page.locator(sel).count() ? page.locator(sel).first().innerText() : '');
async function chonThang(sel, thang) {
  await page.evaluate(([s, v]) => {
    const e = document.querySelector(s);
    if (!e) return;
    e.value = v;
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }, [sel, thang]);
  await nghi(1200);
}
async function moTabChamCong(thang) {
  await moMan('#/nhansu');
  await page.click('#ns-tab [data-tab="chamcong"]');
  await nghi(1200);
  if (thang) await chonThang('#ns-thang', thang);
}

try {
  const NS = await vao('nhansu1', mk.ns);
  await vao('hieutruong', mk.ht);
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — Mai Anh

  // =========================================================================
  console.log('\n[1] Nhân sự bật "tính công theo giờ ở cổng" — chỉ từ ngày mai');
  {
    await dangNhap('nhansu1', 'quantri2026');
    await moTabChamCong();
    const the = await chuCua('#ns-quy-tac');
    check('thẻ quy tắc có mặt và nói "đang tắt"', /Tính công theo giờ ở cổng/.test(the) && /đang tắt/i.test(the), the);
    check('thẻ nói rõ cách tính mặc định: 8 tiếng, không trừ giờ nghỉ trưa',
      /8 tiếng/.test(the) && /không trừ giờ nghỉ trưa/.test(the), the);
    await page.click('#ns-qt-bat');
    await nghi(600);
    const hop = await chuCua('#modal-overlay');
    check('hộp bật ghi ngày bắt đầu là ngày mai', hop.includes(fmt(MAI)), hop);
    check('hộp bật điền sẵn 8 tiếng', (await page.inputValue('#qt-gio')) === '8');
    await page.click('#qt-luu');
    await nghi(1200);
    const q = (await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS })).data;
    check('máy chủ: đợt mới bắt đầu từ ngày mai, 480 phút, hôm nay chưa áp dụng',
      q && q.dangBat === false && q.sapToi && q.sapToi.apDungTu === MAI && q.sapToi.phutDuCong === 480, q);
    const the2 = await chuCua('#ns-quy-tac');
    check('thẻ nói "sẽ bật từ" ngày mai', /sẽ bật từ/i.test(the2) && the2.includes(fmt(MAI)), the2);
  }
  // Giả như đã bật từ đầu tháng trước (API không cho chọn ngày đã qua).
  csdl(c => c.prepare('UPDATE nhansu_quy_tac_cong SET apDungTu = ?').run(DAU_THANG_TRUOC));

  // =========================================================================
  console.log('\n[2] Bảng công từng ngày: trạng thái tự tính bằng chữ, kèm giờ ở cổng');
  {
    await moTabChamCong(THANG_TRUOC);
    const dong = page.locator('[data-cc]', { hasText: 'Mai Anh' }).first();
    const sub = await dong.innerText();
    check('dòng của cô có "2 ngày cần giải trình"', /2 ngày cần giải trình/.test(sub), sub);
    await dong.click();
    await nghi(800);
    const o = (n) => `#modal-overlay [data-dong="${n}"]`;
    const t0 = await chuCua(o(W[0]));
    check('ngày đủ giờ: "Đủ công" kèm giờ cổng 07:00–15:30', /Đủ công/.test(t0) && /07:00–15:30/.test(t0), t0);
    check('ngày đủ giờ: ô chọn ghi tay để trống (không giả làm ghi tay)',
      (await page.locator(`${o(W[0])} select`).inputValue()) === '');
    const t1 = await chuCua(o(W[1]));
    check('ngày trọn ca sáng: "Nửa ngày"', /Nửa ngày/.test(t1) && /07:00–14:00/.test(t1), t1);
    const t2 = await chuCua(o(W[2]));
    check('ngày thiếu giờ: "Cần giải trình" · chưa đủ giờ', /Cần giải trình/.test(t2) && /chưa đủ giờ/.test(t2), t2);
    const t3 = await chuCua(o(W[3]));
    check('ngày quên chụp lúc về: "Cần giải trình" · chưa có giờ ra', /Cần giải trình/.test(t3) && /chưa có giờ ra/.test(t3), t3);
    check('"Cần giải trình" không tô đỏ / cam',
      await page.locator(`${o(W[2])} .badge.red, ${o(W[2])} .badge.orange, ${o(W[3])} .badge.red, ${o(W[3])} .badge.orange`).count() === 0);

    // Đổi loại của một dòng ghi tay: chỉ gửi loại, giờ và ghi chú còn nguyên.
    guiDi.length = 0;
    await page.selectOption(`${o(W[5])} select`, 'nua-ngay');
    await nghi(1200);
    const gui5 = guiDi.find(g => g.method === 'PUT' && g.url.endsWith(`/t1/${W[5]}`));
    check('đổi loại dòng ghi tay chỉ gửi { loai }', gui5 && JSON.stringify(JSON.parse(gui5.than)) === '{"loai":"nua-ngay"}', gui5);
    const r5 = dongTay('t1', W[5]);
    check('giờ vào / giờ ra / ghi chú của dòng ấy KHÔNG bị xoá',
      r5 && r5.loai === 'nua-ngay' && r5.gioVao === '07:10' && r5.gioRa === '16:00' && r5.ghiChu === 'Đi tập huấn', r5);

    // Ghi tay đè lên một ngày tự tính: giờ ở cổng đi theo vào dòng ghi tay.
    await page.selectOption(`${o(W[2])} select`, 'di-lam');
    await nghi(1500);
    const r2 = dongTay('t1', W[2]);
    check('ghi tay lên ngày tự tính giữ giờ ở cổng 08:00–11:00', r2 && r2.loai === 'di-lam' && r2.gioVao === '08:00' && r2.gioRa === '11:00', r2);
    const t2b = await chuCua(o(W[2]));
    check('dòng ấy đổi ngay thành "Nhân sự ghi"', /Nhân sự ghi/.test(t2b) && !/Cần giải trình/.test(t2b), t2b);
    await page.selectOption(`${o(W[2])} select`, '');
    await nghi(1500);
    check('bỏ ghi tay → dòng ghi tay bị gỡ', !dongTay('t1', W[2]));
    const t2c = await chuCua(o(W[2]));
    check('… và trạng thái tự tính quay lại "Cần giải trình"', /Cần giải trình/.test(t2c), t2c);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[3] Của tôi: cô gửi và rút giải trình');
  let chuaCo = '';
  {
    const toi = (await req('GET', `/api/nhansu/cham-cong/toi?thang=${THANG_TRUOC}`, { cookie: GV })).data;
    chuaCo = ((toi?.cuaToi?.ngay || []).find(d => d.trangThai === 'chua-co-cong') || {}).ngay || '';
    check('đối chứng — tháng trước có ngày "chưa có công" của cô', !!chuaCo, toi?.cuaToi?.ngay);

    await dangNhap('giaovien', '123456');
    await moMan('#/nhansu');
    await chonThang('#ns-toi-thang', THANG_TRUOC);
    const o = (n) => `#view [data-ngay-toi="${n}"]`;
    const nhac = await chuCua('#ns-toi-nhac');
    check('lời nhắc trung tính: có 2 ngày cần giải trình', /2 ngày/.test(nhac) && /Gửi giải trình/.test(nhac), nhac);
    check('ngày thiếu giờ có nút "Gửi giải trình"', await page.locator(`${o(W[2])} [data-gui]`).count() === 1);
    check('ngày đủ công KHÔNG có nút', await page.locator(`${o(W[0])} [data-gui]`).count() === 0);
    check('ngày Nhân sự đã ghi tay KHÔNG có nút', await page.locator(`${o(W[5])} [data-gui]`).count() === 0);
    await page.click('#view [data-nhom-chua-co] > summary');   // gom gập sẵn, xem [7]
    await nghi(400);
    const tc = await chuCua(o(chuaCo));
    check('ngày không có giờ ở cổng: "Chưa có giờ ở cổng" và có nút gửi',
      /Chưa có giờ ở cổng/.test(tc) && await page.locator(`${o(chuaCo)} [data-gui]`).count() === 1, tc);
    check('ngày đủ công hiện "Đủ công"', /Đủ công/.test(await chuCua(o(W[0]))));

    await page.click(`${o(W[2])} [data-gui]`);
    await nghi(600);
    check('hộp gửi điền sẵn giờ vào ở cổng', (await page.inputValue('#gt-vao')) === '08:00');
    check('hộp gửi mặc định đề nghị "đi làm"', (await page.inputValue('#gt-loai')) === 'di-lam');
    await page.fill('#gt-ra', '17:00');
    await page.fill('#gt-lydo', 'Đi tập huấn ở phòng giáo dục, về thẳng nhà');
    await page.click('#gt-gui');
    await nghi(1500);
    let g = giaiTrinhCua('t1', W[2])[0];
    check('máy chủ: có giải trình chờ duyệt, đúng giờ và lý do',
      g && g.trangThai === 'cho-duyet' && g.loaiDeNghi === 'di-lam' && g.gioVaoDeNghi === '08:00'
        && g.gioRaDeNghi === '17:00' && /tập huấn/.test(g.lyDo), g);
    const t2 = await chuCua(o(W[2]));
    check('dòng ấy hiện "đang chờ duyệt", nút gửi thành nút rút',
      /đang chờ duyệt/.test(t2) && await page.locator(`${o(W[2])} [data-gui]`).count() === 0
        && await page.locator(`${o(W[2])} [data-rut]`).count() === 1, t2);

    await page.click(`${o(W[2])} [data-rut]`);
    await nghi(1500);
    g = giaiTrinhCua('t1', W[2])[0];
    check('rút lại → máy chủ chuyển "đã rút", không xoá dòng', g && g.trangThai === 'da-rut', g);
    check('rút xong thì nút gửi quay lại', await page.locator(`${o(W[2])} [data-gui]`).count() === 1);

    // Gửi lại (để duyệt) và gửi cho ngày quên chụp lúc về (để không duyệt).
    await page.click(`${o(W[2])} [data-gui]`);
    await nghi(600);
    await page.fill('#gt-ra', '17:00');
    await page.fill('#gt-lydo', 'Đi tập huấn ở phòng giáo dục, về thẳng nhà');
    await page.click('#gt-gui');
    await nghi(1500);
    await page.click(`${o(W[3])} [data-gui]`);
    await nghi(600);
    await page.fill('#gt-lydo', '<b>quên chụp</b> lúc về');
    await page.click('#gt-gui');
    await nghi(1500);
    check('hai giải trình đang chờ', giaiTrinhCua('t1', W[2])[0]?.trangThai === 'cho-duyet'
      && giaiTrinhCua('t1', W[3])[0]?.trangThai === 'cho-duyet');
  }
  const tuGui = await req('POST', '/api/nhansu/cham-cong/toi', {
    cookie: NS, body: { ngay: W[2], loaiDeNghi: 'di-lam', lyDo: 'Quên chụp ảnh lúc về' },
  });
  check('đối chứng — người Nhân sự gửi giải trình của chính mình', tuGui.status === 201, tuGui.data);

  // =========================================================================
  console.log('\n[4] Hàng chờ duyệt: duyệt, không duyệt, không tự duyệt');
  {
    await dangNhap('nhansu1', 'quantri2026');
    await moTabChamCong();
    const hang = '#ns-giai-trinh';
    const tieuDe = await chuCua(hang);
    check('hàng chờ có 3 giải trình', /Giải trình chờ duyệt \(3\)/.test(tieuDe), tieuDe);
    const cuaMinh = page.locator(`${hang} [data-gt]`, { hasText: 'Quên chụp ảnh lúc về' });
    check('giải trình của chính mình: báo cần người khác duyệt, không có nút duyệt',
      /người khác duyệt/.test(await cuaMinh.innerText())
        && await cuaMinh.locator('[data-duyet], [data-tu-choi]').count() === 0);
    const gtLoi = page.locator(`${hang} [data-gt]`, { hasText: 'quên chụp' }).filter({ hasText: 'Mai Anh' });
    check('lý do do người gõ hiện đúng chữ, không thành thẻ HTML',
      /<b>quên chụp<\/b>/.test(await gtLoi.innerText()) && await gtLoi.locator('b', { hasText: 'quên chụp' }).count() === 0);

    const gtDuyet = page.locator(`${hang} [data-gt]`, { hasText: 'tập huấn' });
    check('giải trình hiện giờ ở cổng và giờ đề nghị',
      /08:00–11:00/.test(await gtDuyet.innerText()) && /08:00–17:00/.test(await gtDuyet.innerText()), await gtDuyet.innerText());
    await gtDuyet.locator('[data-duyet]').click();
    await nghi(600);
    check('hộp duyệt điền sẵn loại và giờ đề nghị',
      (await page.inputValue('#gt-loai')) === 'di-lam' && (await page.inputValue('#gt-vao')) === '08:00'
        && (await page.inputValue('#gt-ra')) === '17:00');
    await page.click('#gt-duyet-ok');
    await nghi(1500);
    check('máy chủ: giải trình đã duyệt', giaiTrinhCua('t1', W[2])[0]?.trangThai === 'da-duyet');
    const r2 = dongTay('t1', W[2]);
    check('… và có dòng công ghi tay "đi làm" 08:00–17:00', r2 && r2.loai === 'di-lam' && r2.gioVao === '08:00' && r2.gioRa === '17:00', r2);
    check('hàng chờ còn 2', /Giải trình chờ duyệt \(2\)/.test(await chuCua(hang)), await chuCua(hang));

    await page.locator(`${hang} [data-gt]`, { hasText: 'quên chụp' }).filter({ hasText: 'Mai Anh' }).locator('[data-tu-choi]').click();
    await nghi(600);
    await page.click('#gt-tu-choi-ok');
    await nghi(1000);
    check('không duyệt mà chưa ghi lý do → chưa đổi gì', giaiTrinhCua('t1', W[3])[0]?.trangThai === 'cho-duyet');
    await page.fill('#gt-ly-do-tu-choi', 'Hôm đó không thấy ghi giờ về ở sổ trực');
    await page.click('#gt-tu-choi-ok');
    await nghi(1500);
    const g3 = giaiTrinhCua('t1', W[3])[0];
    check('ghi lý do rồi → máy chủ: không duyệt, kèm lý do', g3?.trangThai === 'tu-choi' && /sổ trực/.test(g3.ghiChuDuyet), g3);

    await page.click('#ns-tab [data-tab="toi"]');
    await nghi(1200);
    await chonThang('#ns-toi-thang', THANG_TRUOC);
    const toiNs = await chuCua(`#view [data-ngay-toi="${W[2]}"]`);
    check('Nhân sự cũng có phần "Của tôi": thấy giải trình của mình đang chờ', /đang chờ duyệt/.test(toiNs), toiNs);
  }

  // =========================================================================
  console.log('\n[5] Cô thấy kết quả; hôm nay chưa về là "Đang ở trường"');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/nhansu');
    await chonThang('#ns-toi-thang', THANG_TRUOC);
    const o = (n) => `#view [data-ngay-toi="${n}"]`;
    const t2 = await chuCua(o(W[2]));
    check('ngày được duyệt: "Đi làm" theo giải trình đã duyệt, hết nút gửi',
      /Đi làm/.test(t2) && /giải trình đã duyệt/i.test(t2) && await page.locator(`${o(W[2])} [data-gui]`).count() === 0, t2);
    const t3 = await chuCua(o(W[3]));
    check('ngày không được duyệt: nói rõ lý do và cho gửi lại',
      /chưa được duyệt/i.test(t3) && /sổ trực/.test(t3) && await page.locator(`${o(W[3])} [data-gui]`).count() === 1, t3);
    await chonThang('#ns-toi-thang', THANG);
    const tn = await chuCua(o(T));
    check('hôm nay có giờ vào, chưa có giờ ra: "Đang ở trường"', /Đang ở trường/.test(tn) && /07:30/.test(tn), tn);
  }

  // =========================================================================
  console.log('\n[6] Đổi cách tính và tắt — chỉ từ ngày mai, lịch sử giữ đủ');
  {
    await dangNhap('nhansu1', 'quantri2026');
    await moTabChamCong();
    const the = await chuCua('#ns-quy-tac');
    check('thẻ nói "đang bật từ" đầu tháng trước', /đang bật từ/i.test(the) && the.includes(fmt(DAU_THANG_TRUOC)), the);
    await page.click('#ns-qt-doi');
    await nghi(600);
    await page.fill('#qt-gio', '7.5');
    await page.click('#qt-luu');
    await nghi(1500);
    let q = (await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS })).data;
    check('máy chủ: đợt mới từ ngày mai 450 phút, đợt cũ đóng ở ngày mai',
      q?.sapToi?.apDungTu === MAI && q.sapToi.phutDuCong === 450 && q.hienTai?.tatTu === MAI && q.lichSu.length === 2, q);
    const the2 = await chuCua('#ns-quy-tac');
    check('thẻ hiện cách tính mới từ ngày mai: 7 tiếng 30 phút', /7 tiếng 30 phút/.test(the2) && the2.includes(fmt(MAI)), the2);
    check('lịch sử có 2 đợt', await page.locator('#ns-quy-tac [data-dot]').count() === 2);

    await page.click('#ns-qt-tat');
    await nghi(600);
    await page.click('#qt-tat-ok');
    await nghi(1500);
    q = (await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS })).data;
    check('máy chủ: tắt từ ngày mai, không đợt nào bị xoá',
      q?.hienTai?.tatTu === MAI && !q.sapToi && q.lichSu.length === 2, q);
    const the3 = await chuCua('#ns-quy-tac');
    check('thẻ nói "sẽ tắt từ" ngày mai và cho bật lại',
      /sẽ tắt từ/i.test(the3) && the3.includes(fmt(MAI)) && await page.locator('#ns-qt-bat').count() === 1, the3);
  }

  // =========================================================================
  console.log('\n[7] Ngày "chưa có giờ ở cổng" gom thành một dòng gập, mở ra vẫn gửi được');
  {
    // Cô t1 chỉ có giờ cổng W[0]–W[3] và một dòng ghi tay W[5]; mọi ngày thường
    // khác của tháng trước nằm trong đợt quy tắc (apDungTu đã lùi về đầu tháng
    // trước ở trên) nên đều là "chưa có giờ ở cổng".
    const toi = (await req('GET', `/api/nhansu/cham-cong/toi?thang=${THANG_TRUOC}`, { cookie: GV })).data;
    const ngayToi = toi?.cuaToi?.ngay || [];
    const chua = ngayToi.filter(d => d.trangThai === 'chua-co-cong').map(d => d.ngay);
    check('đối chứng — cô có nhiều ngày "chưa có giờ ở cổng" tháng trước', chua.length >= 5, chua);
    const truocNhom = ngayToi.filter(d => d.ngay < chua[0]).map(d => d.ngay);
    const sauNhom = ngayToi.filter(d => d.ngay > chua[0] && d.trangThai !== 'chua-co-cong').map(d => d.ngay);

    await dangNhap('giaovien', '123456');
    await moMan('#/nhansu');
    await chonThang('#ns-toi-thang', THANG_TRUOC);
    const nhom = '#view [data-nhom-chua-co]';
    check('Của tôi: đúng MỘT dòng gom', await page.locator(nhom).count() === 1);
    const tom = await chuCua(`${nhom} > summary`);
    check(`dòng gom ghi "${chua.length} ngày chưa có giờ ở cổng"`, tom.trim() === `${chua.length} ngày chưa có giờ ở cổng`, tom);
    check('dòng gom gập sẵn', await page.locator(nhom).evaluate(e => !e.open));
    const trongNhom = await page.locator(`${nhom} [data-ngay-toi]`).evaluateAll(es => es.map(e => e.dataset.ngayToi));
    check('trong nhóm có đủ từng ngày chưa có giờ, đúng thứ tự', JSON.stringify(trongNhom) === JSON.stringify(chua), trongNhom);
    const thuTu = await page.locator('#view [data-ngay-toi], #view [data-nhom-chua-co]').evaluateAll(es => es
      .filter(e => !e.closest('[data-nhom-chua-co]') || e.matches('[data-nhom-chua-co]'))
      .map(e => (e.matches('[data-nhom-chua-co]') ? 'NHOM' : e.dataset.ngayToi)));
    check('ngày khác vẫn từng dòng theo ngày, dòng gom đứng chỗ ngày chưa có giờ đầu tiên',
      JSON.stringify(thuTu) === JSON.stringify([...truocNhom, 'NHOM', ...sauNhom]), thuTu);
    check('các ngày khác không bị gom (đủ công, ghi tay vẫn ngoài nhóm)',
      await page.locator(`${nhom} [data-ngay-toi="${W[0]}"], ${nhom} [data-ngay-toi="${W[5]}"]`).count() === 0);

    await page.click(`${nhom} > summary`);
    await nghi(400);
    const n0 = chua[1];
    const o0 = `${nhom} [data-ngay-toi="${n0}"]`;
    check('mở nhóm: từng ngày hiện như cũ, có chữ "Chưa có giờ ở cổng" và nút gửi',
      await page.locator(o0).isVisible() && /Chưa có giờ ở cổng/.test(await chuCua(o0))
        && await page.locator(`${o0} [data-gui]`).count() === 1, await chuCua(o0));
    await page.click(`${o0} [data-gui]`);
    await nghi(600);
    await page.fill('#gt-lydo', 'Đi họp ở phòng giáo dục cả ngày');
    await page.click('#gt-gui');
    await nghi(1500);
    const g = giaiTrinhCua('t1', n0)[0];
    check('nút gửi trong nhóm chạy: máy chủ có giải trình chờ duyệt', g && g.trangThai === 'cho-duyet' && /họp/.test(g.lyDo), g);
    // Ngày đang có giải trình chờ duyệt (hoặc bị "không duyệt") ra NGOÀI nhóm:
    // cô phải thấy ngay trạng thái và lý do, không phải mở nhóm mới thấy.
    const oNgoai = `#view [data-ngay-toi="${n0}"]`;
    check('gửi xong: ngày ấy ra ngoài nhóm, hiện "đang chờ duyệt" và nút rút',
      await page.locator(`${nhom} [data-ngay-toi="${n0}"]`).count() === 0
        && /đang chờ duyệt/.test(await chuCua(oNgoai))
        && await page.locator(`${oNgoai} [data-rut]`).count() === 1, await chuCua(oNgoai));
    const tomSau = await chuCua(`${nhom} > summary`);
    check(`… nhóm còn ${chua.length - 1} ngày`, tomSau.trim() === `${chua.length - 1} ngày chưa có giờ ở cổng`, tomSau);
    await page.click(`${oNgoai} [data-rut]`);
    await nghi(1500);
    check('nút rút chạy: máy chủ chuyển "đã rút"', giaiTrinhCua('t1', n0)[0]?.trangThai === 'da-rut');
    check('rút xong: ngày ấy về lại trong nhóm',
      await page.locator(`${nhom} [data-ngay-toi="${n0}"]`).count() === 1);

    // Bảng chấm từng ngày Nhân sự / BGH mở cho một người.
    await dangNhap('nhansu1', 'quantri2026');
    await moTabChamCong(THANG_TRUOC);
    await page.locator('[data-cc]', { hasText: 'Mai Anh' }).first().click();
    await nghi(800);
    const nhomNs = '#modal-overlay [data-nhom-chua-co]';
    check('Nhân sự: đúng MỘT dòng gom trong bảng từng ngày', await page.locator(nhomNs).count() === 1);
    const tomNs = await chuCua(`${nhomNs} > summary`);
    check(`… ghi "${chua.length} ngày chưa có giờ ở cổng"`, tomNs.trim() === `${chua.length} ngày chưa có giờ ở cổng`, tomNs);
    const trongNs = await page.locator(`${nhomNs} [data-dong]`).evaluateAll(es => es.map(e => e.dataset.dong));
    check('… trong nhóm đủ từng ngày', JSON.stringify(trongNs) === JSON.stringify(chua), trongNs);
    check('… ngày cuối tuần và ngày có giờ cổng vẫn ngoài nhóm',
      await page.locator(`#modal-overlay [data-dong="${W[0]}"]`).count() === 1
        && await page.locator(`${nhomNs} [data-dong="${W[0]}"]`).count() === 0
        && await page.locator(`${nhomNs} [data-dong="${DAU_THANG_TRUOC}"]`).count() === 0);
    await page.click(`${nhomNs} > summary`);
    await nghi(400);
    const n1 = chua[2];
    await page.selectOption(`${nhomNs} [data-dong="${n1}"] select`, 'nghi-phep');
    await nghi(1500);
    check('ô chọn trong nhóm chạy: ghi tay "nghỉ phép"', dongTay('t1', n1)?.loai === 'nghi-phep', dongTay('t1', n1));
    await page.evaluate(() => UI.closeModal());

    // Chỉ một ngày chưa có giờ thì để nguyên một dòng, không gom.
    const motNgay = W[W.length - 1];
    csdl(c => c.prepare('UPDATE users SET createdAt = ? WHERE id = ?').run(`${motNgay}T00:00:00.000Z`, NS_ID));
    const toiNs = (await req('GET', `/api/nhansu/cham-cong/toi?thang=${THANG_TRUOC}`, { cookie: NS })).data;
    const chuaNs = (toiNs?.cuaToi?.ngay || []).filter(d => d.trangThai === 'chua-co-cong').map(d => d.ngay);
    check('đối chứng — người Nhân sự có đúng 1 ngày chưa có giờ', JSON.stringify(chuaNs) === JSON.stringify([motNgay]), chuaNs);
    await page.click('#ns-tab [data-tab="toi"]');
    await nghi(1200);
    await chonThang('#ns-toi-thang', THANG_TRUOC);
    check('1 ngày: không có dòng gom', await page.locator(nhom).count() === 0);
    check('1 ngày: hiện thành dòng thường, có nút gửi',
      await page.locator(`#view [data-ngay-toi="${motNgay}"] [data-gui]`).isVisible());
  }

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
