// Bài canh góp ý 18/11 (Đ260b) trên trình duyệt thật — Thông báo và khảo sát.
//
// Chạy bằng:  node test/phan-hoi-1811-thong-bao-giao-dien.test.mjs
//
//   [1] Văn phòng ghim / bỏ ghim một thông báo ngay trong hộp "Chi tiết thông
//       báo"; form tạo có ô "Ghim lên đầu".
//   [2] Phụ huynh chạm "Album mới: …" là sang đúng album; chạm "Thực đơn …
//       đã có" là sang #/menu — kể cả tin cũ tạo trước bản này.
//   [3] Cô không có nút "Toàn trường" ở form Thông báo lẫn Khảo sát; chọn gia
//       đình bằng ô tích, có "Chọn tất cả".
//   [4] Cô thấy thẻ "Thông báo trên điện thoại" ở Cài đặt.
//
// Phần máy chủ (quyền, người nhận, huy hiệu, tin đẩy) ở
// test/phan-hoi-1811-thong-bao.test.mjs.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-tb-gd');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng Thử', 'g_bgh');
const CSDL = path.join(DIR, 'school.db');
function doc(sql, ...ts) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
}
function ghi(sql, ...ts) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5230), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
}));
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
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
};
const hashHienTai = () => page.evaluate(() => location.hash);
const tieuDeHop = async () => (await page.locator('#modal-overlay .modal-title').count())
  ? (await page.locator('#modal-overlay .modal-title').innerText()).trim() : '';
const nutHop = (chu) => page.locator('#modal-overlay button', { hasText: chu });
const dongTin = (chu) => page.locator('#view .list-row', { hasText: chu }).first();

const TIN_HOP = 'Họp phụ huynh Chồi 2 Đ260b';
const TIN_MENU = 'Thực đơn từ 23/11 đến 27/11 đã có';

try {
  const d = await login('g_bgh', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const co = await login('giaovien', '123456');   // t1 — nhóm Chồi 2 (c1)
  const hop = await req('POST', '/api/notifications', {
    cookie: co.cookie, body: { title: TIN_HOP, body: 'Thứ Sáu 16h30 ạ.', category: 'Nhóm lớp', audience: 'class' },
  });
  check('đối chứng — cô gửi được thông báo cho nhóm', hop.status === 201, hop.status);

  // Hai tin CŨ đúng như góp ý của trường: tạo trước bản này, không có liên kết.
  const album = doc("SELECT id, title FROM albums WHERE classId = 'c1' ORDER BY date DESC LIMIT 1")[0];
  check('đối chứng — dữ liệu mẫu có album của nhóm Chồi 2', !!album);
  const TIN_ALBUM = `Album mới: ${album.title}`;
  for (const [id, title] of [['nt-gd-album', TIN_ALBUM], ['nt-gd-menu', TIN_MENU]]) {
    ghi(`INSERT INTO notifications (id, title, body, category, audience, createdBy, createdAt, pinned)
         VALUES (?, ?, 'Mở để xem.', 'Khác', 'c1', 't1', ?, 0)`, id, title, new Date().toISOString());
  }

  // =========================================================================
  console.log('\n[1] Văn phòng ghim / bỏ ghim trong hộp chi tiết');
  await dangNhap('g_bgh', 'quantri2026');
  await moMan('#/notifications');
  await dongTin(TIN_HOP).click();
  await page.waitForTimeout(800);
  check('mở hộp "Chi tiết thông báo"', (await tieuDeHop()) === 'Chi tiết thông báo', await tieuDeHop());
  check('…có nút "Ghim lên đầu"', await nutHop('Ghim lên đầu').count() === 1);
  await nutHop('Ghim lên đầu').click();
  await page.waitForTimeout(1200);
  check('bấm xong: máy chủ ghi đã ghim', doc('SELECT pinned FROM notifications WHERE id = ?', hop.data.id)[0].pinned === 1);
  check('…dòng tin có nhãn 📌', (await dongTin(TIN_HOP).innerText()).includes('📌'), await dongTin(TIN_HOP).innerText());
  const thuTu = await page.locator('#view .list-row .row-title').allInnerTexts();
  const viTri = thuTu.findIndex(t => t.includes(TIN_HOP));
  check('…tin ghim đứng trên mọi tin chưa ghim',
    viTri >= 0 && thuTu.slice(0, viTri).every(t => t.includes('📌')), thuTu.slice(0, viTri + 1));
  await dongTin(TIN_HOP).click();
  await page.waitForTimeout(800);
  check('mở lại: hộp có nhãn "📌 Ghim" và nút "Bỏ ghim"',
    (await page.locator('#modal-overlay').innerText()).includes('📌 Ghim') && await nutHop('Bỏ ghim').count() === 1);
  await nutHop('Bỏ ghim').click();
  await page.waitForTimeout(1200);
  check('bấm "Bỏ ghim": máy chủ ghi hết ghim', doc('SELECT pinned FROM notifications WHERE id = ?', hop.data.id)[0].pinned === 0);
  check('…dòng tin không còn 📌', !(await dongTin(TIN_HOP).innerText()).includes('📌'));

  await page.locator('#btn-new-notif').click();
  await page.waitForTimeout(600);
  check('form tạo của văn phòng có ô "Ghim lên đầu" và nút "Toàn trường"',
    await page.locator('#nt-ghim').count() === 1 && await page.locator('#nt-aud button[data-aud="all"]').count() === 1);
  await page.fill('#nt-title', 'Nghỉ Tết Đ260b');
  await page.fill('#nt-body', 'Trường nghỉ từ 25/01.');
  await page.locator('#nt-aud button[data-aud="all"]').click();
  await page.locator('#nt-ghim').check();
  await page.locator('#modal-overlay button', { hasText: 'Gửi thông báo' }).click();
  await page.waitForTimeout(1200);
  const tet = doc("SELECT audience, pinned FROM notifications WHERE title = 'Nghỉ Tết Đ260b'")[0];
  check('tích "Ghim lên đầu" khi tạo: tin toàn trường được ghim', tet && tet.audience === 'all' && tet.pinned === 1, tet);

  // =========================================================================
  console.log('\n[2] Phụ huynh chạm thông báo là sang đúng màn');
  await dangNhap('phuhuynh2', '123456');           // p2 — bé s3, Chồi 2
  await moMan('#/notifications');
  await dongTin(TIN_ALBUM).click();
  await page.waitForTimeout(1500);
  check(`chạm "${TIN_ALBUM}" → sang đúng album`, (await hashHienTai()) === `#/albums/${album.id}`, await hashHienTai());
  check('…màn album hiện tên album', (await page.locator('#view').innerText()).includes(album.title));
  await moMan('#/notifications');
  await dongTin(TIN_MENU).click();
  await page.waitForTimeout(1500);
  check(`chạm "${TIN_MENU}" → sang #/menu`, (await hashHienTai()) === '#/menu', await hashHienTai());
  await moMan('#/notifications');
  await dongTin(TIN_HOP).click();
  await page.waitForTimeout(800);
  check('tin gõ tay vẫn mở hộp chi tiết, không có nút ghim cho phụ huynh',
    (await tieuDeHop()) === 'Chi tiết thông báo' && await nutHop('Ghim').count() === 0, await tieuDeHop());

  // =========================================================================
  console.log('\n[3] Cô: chỉ "Cả nhóm" hoặc "Chọn gia đình"');
  await dangNhap('giaovien', '123456');
  await moMan('#/notifications');
  await page.locator('#btn-new-notif').click();
  await page.waitForTimeout(600);
  const nutCo = await page.locator('#nt-aud button').allInnerTexts();
  check('form Thông báo của cô: đúng hai nút "Cả nhóm", "Chọn gia đình"',
    JSON.stringify(nutCo.map(t => t.trim())) === '["Cả nhóm","Chọn gia đình"]', nutCo);
  check('…không có nút "Toàn trường", không có ô ghim',
    await page.locator('#modal-overlay button', { hasText: 'Toàn trường' }).count() === 0 && await page.locator('#nt-ghim').count() === 0);
  await page.locator('#nt-aud button[data-aud="chon"]').click();
  await page.waitForSelector('.nt-gd-be', { timeout: 5000 }).catch(() => {});
  const nhan = (await page.locator('#nt-gd').innerText()).replace(/\s+/g, ' ');
  check('danh sách tích hiện "Gia đình bé …" của nhóm mình', /Gia đình bé Phạm Gia Hân/.test(nhan) && /Gia đình bé Đỗ Khánh Vy/.test(nhan), nhan);
  check('…không có bé nhóm khác', !/Bùi Minh Thư/.test(nhan), nhan);
  await page.locator('#nt-gd-tat-ca').check();
  const soO = await page.locator('.nt-gd-be').count();
  check('"Chọn tất cả" tích mọi gia đình', soO > 2 && await page.locator('.nt-gd-be:checked').count() === soO, soO);
  await page.locator('#nt-gd-tat-ca').uncheck();
  check('…bỏ "Chọn tất cả" thì bỏ hết', await page.locator('.nt-gd-be:checked').count() === 0);
  await page.fill('#nt-title', 'Nhắc riêng Đ260b');
  await page.fill('#nt-body', 'Mai bé mang giày thể thao.');
  await page.locator('#modal-overlay button', { hasText: 'Gửi thông báo' }).click();
  await page.waitForTimeout(800);
  check('chưa tích ai mà bấm gửi: báo cần chọn, không gửi',
    (await page.locator('#toast-zone').innerText().catch(() => '')).includes('tích chọn ít nhất một gia đình')
      && doc("SELECT COUNT(*) AS n FROM notifications WHERE title = 'Nhắc riêng Đ260b'")[0].n === 0);
  await page.locator('.nt-gd-be[value="s3"]').check();
  await page.locator('.nt-gd-be[value="s5"]').check();
  await page.locator('#modal-overlay button', { hasText: 'Gửi thông báo' }).click();
  await page.waitForTimeout(1200);
  const rieng = doc("SELECT id FROM notifications WHERE title = 'Nhắc riêng Đ260b'")[0];
  check('gửi được cho 2 gia đình đã tích', rieng && JSON.stringify(doc(
    'SELECT studentId FROM notification_nguoi_nhan WHERE notificationId = ? ORDER BY studentId', rieng.id).map(r => r.studentId)) === '["s3","s5"]');
  check('…dòng tin của cô ghi "2 gia đình"', (await dongTin('Nhắc riêng Đ260b').innerText()).includes('2 gia đình'),
    await dongTin('Nhắc riêng Đ260b').innerText().catch(() => ''));

  await moMan('#/surveys');
  await page.locator('#btn-new-survey').click();
  await page.waitForTimeout(600);
  const nutKs = await page.locator('#sv-aud button').allInnerTexts();
  check('form Khảo sát của cô: đúng hai nút "Cả nhóm", "Chọn gia đình"',
    JSON.stringify(nutKs.map(t => t.trim())) === '["Cả nhóm","Chọn gia đình"]', nutKs);
  await page.fill('#sv-title', 'Khảo sát riêng Đ260b');
  await page.locator('#sv-questions .q-text').first().fill('Nhà mình đi được không ạ?');
  await page.locator('#sv-questions .q-options').first().fill('Có, Không');
  await page.locator('#sv-aud button[data-aud="chon"]').click();
  await page.waitForSelector('.sv-gd-be', { timeout: 5000 }).catch(() => {});
  await page.locator('.sv-gd-be[value="s3"]').check();
  await page.locator('#modal-overlay button', { hasText: 'Tạo khảo sát' }).click();
  await page.waitForTimeout(1200);
  const ks = doc("SELECT id, audience FROM surveys WHERE title = 'Khảo sát riêng Đ260b'")[0];
  check('khảo sát tạo cho đúng 1 gia đình đã tích', ks && ks.audience === 'c1'
    && JSON.stringify(doc('SELECT studentId FROM survey_nguoi_nhan WHERE surveyId = ?', ks.id).map(r => r.studentId)) === '["s3"]', ks);
  check('…thẻ khảo sát ghi "Gửi riêng 1 gia đình"',
    (await page.locator('#view .card', { hasText: 'Khảo sát riêng Đ260b' }).first().innerText()).includes('Gửi riêng 1 gia đình'));

  // =========================================================================
  console.log('\n[4] Cô thấy thẻ bật thông báo ở Cài đặt');
  await moMan('#/settings');
  await page.waitForFunction(() => /gia đình gửi đơn xin nghỉ/.test((document.getElementById('st-push-card') || {}).textContent || ''), null, { timeout: 10000 })
    .catch(() => { /* phép kiểm bên dưới sẽ nói */ });
  const the = (await page.locator('#st-push-card').innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('có thẻ "Thông báo trên điện thoại" với nút Bật', /Thông báo trên điện thoại/.test(the)
    && await page.locator('#st-push-bat').count() === 1, the);
  check('…câu giới thiệu nói việc của cô, không phải "việc chờ mình duyệt"',
    /việc gia đình gửi tới cô/.test(the) && !/chờ mình duyệt/.test(the), the);

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
