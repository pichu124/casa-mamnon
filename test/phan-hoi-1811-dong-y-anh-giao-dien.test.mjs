// Bài canh GIAO DIỆN cho góp ý "đồng ý chia sẻ ảnh theo giấy nhập học" (Đ260i).
//
// Chạy bằng:  node test/phan-hoi-1811-dong-y-anh-giao-dien.test.mjs
//
//   1. Phụ huynh: hồ sơ của bé KHÔNG còn khối "Giấy đồng ý của gia đình" (không
//      nút "Rút lại"), chỉ một dòng nhỏ: việc dùng ảnh theo giấy nhập học, muốn
//      thay đổi thì liên hệ văn phòng.
//   2. Cô ở nhóm không gia đình nào rút: hộp kể KHÔNG hỏi "Trong ảnh có bé khác
//      không?" và kể kèm ảnh được ngay; gia đình bé thấy ảnh.
//   3. Văn phòng mở Sửa hồ sơ một bé của nhóm đó, chọn "Gia đình xin rút: không
//      chia sẻ ảnh có mặt con cho gia đình khác", lưu.
//   4. Cô nhóm đó kể lần sau: câu hỏi quay lại và bắt buộc trả lời như cũ.
import { chromium } from 'playwright';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, CHROMIUM, tatBannerMoiCai, goCoNuocNgoaiMau,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-dong-y-anh-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'thuchup']);
goCoNuocNgoaiMau(DIR);
const mkVP = taoQuanTri(DIR, 'Văn phòng', 'dyg_vp');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5360), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const doc = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
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
const moMan = async (hash, cho = 1300) => {
  if (await page.evaluate(() => location.hash) === hash) await page.evaluate(() => App.route());
  else await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(cho);
};
const chuCua = async (sel) => (await page.locator(sel).count() ? page.locator(sel).innerText() : '');
const tepCua = (qsId) => doc('SELECT * FROM hanhtrinh_ke_tep WHERE quanSatId = ?', qsId)[0] || null;

// Cô ghi một quan sát kèm ảnh qua API rồi mở hộp "Hoàn thiện & kể" trên màn.
async function moHopKe(cookie, studentId) {
  const q = (await req('POST', '/api/hanhtrinh', { cookie, body: { studentId, moTa: 'Con rót nước', anh: ANH } })).data;
  await moMan('#/hanhtrinh/ghinhanh');
  const nut = page.locator(`#ht-gn-ds [data-muc="quansat:${q?.id}"] [data-hoan-thien]`);
  check('đối chứng — thẻ quan sát vừa ghi nằm ở Hình ảnh ghi nhanh', await nut.count() === 1, q);
  await nut.click();
  await page.waitForTimeout(1200);
  return q;
}

try {
  const d0 = await login('dyg_vp', mkVP);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — cô nhóm Lá 1 (c2: s2, s7, s8)
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — mẹ bé s1 và s2

  // =========================================================================
  console.log('\n[1] Phụ huynh: không còn khối giấy đồng ý, chỉ một dòng nhỏ');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan('#/student');
    const chu = await chuCua('#app');
    check('đối chứng — đang ở hồ sơ của bé', /Hồ sơ của bé/.test(chu) && /Phụ huynh/.test(chu), chu.slice(0, 200));
    check('KHÔNG còn khối "Giấy đồng ý của gia đình"', !/Giấy đồng ý của gia đình/.test(chu));
    check('KHÔNG còn ba mục đồng ý và nút "Rút lại"',
      !/Chia sẻ ảnh có mặt con cho gia đình khác/.test(chu) && !/Lập hồ sơ học tập cho con/.test(chu)
      && await page.locator('[data-rut]').count() === 0);
    check('có dòng nhỏ: dùng ảnh theo giấy nhập học, muốn thay đổi thì liên hệ văn phòng',
      /Việc dùng ảnh của con theo giấy nhập học\. Gia đình muốn thay đổi, xin liên hệ văn phòng nhà trường\./.test(await chuCua('[data-dong-y-giay]')),
      await chuCua('[data-dong-y-giay]'));
  }

  // =========================================================================
  console.log('\n[2] Cô nhóm không ai rút: không hỏi "Trong ảnh có bé khác không?", kể được ngay');
  {
    await dangNhap('giaovien2', '123456');
    const q = await moHopKe(GV2, 's2');
    check('ô "Gửi kèm ảnh này cho gia đình" đã tích', await page.isChecked('#ht-kem-tep'));
    check('KHÔNG có câu hỏi "Trong ảnh có bé khác không?"',
      !/Trong ảnh có bé khác không/.test(await chuCua('#modal-overlay')) && await page.locator('#ht-chi-be').count() === 0,
      await chuCua('#modal-overlay'));
    await page.fill('#ht-cc', 'Con tự rót nước vào ly, không đổ giọt nào.');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1800);
    check('kể xong hộp đóng lại', await page.locator('#modal-overlay #ht-cong-bo').count() === 0, await chuCua('#modal-overlay'));
    const t = tepCua(q?.id);
    check('máy chủ ghi bản chép đã xác nhận "chỉ có bé chính"', t?.daXacNhanBe === 1
      && doc('SELECT studentId FROM hanhtrinh_ke_tep_be WHERE tepId = ?', t.id).map(r => r.studentId).join() === 's2', t);
    const ph = ((await req('GET', '/api/hanhtrinh?studentId=s2', { cookie: PH })).data?.quanSat || []).find(x => x.id === q?.id);
    check('gia đình bé thấy ảnh kèm câu chuyện', ph?.tepKe?.length === 1, ph?.tepKe);
  }

  // =========================================================================
  console.log('\n[3] Văn phòng ghi "Gia đình xin rút" chia sẻ ảnh cho bé s7 (nhóm Lá 1)');
  {
    await dangNhap('dyg_vp', 'quantri2026');
    await moMan('#/admin');
    await page.evaluate(() => App.views.admin.suaHocSinh('s7'));
    await page.waitForTimeout(1200);
    const nhan = await page.locator('#ad-dy-chiase option').allInnerTexts();
    check('mục chia sẻ ảnh có lựa chọn "Gia đình xin rút: không chia sẻ ảnh có mặt con cho gia đình khác"',
      nhan.some(x => x.trim() === 'Gia đình xin rút: không chia sẻ ảnh có mặt con cho gia đình khác'), nhan);
    check('và "Đồng ý (theo giấy nhập học)"', nhan.some(x => x.trim() === 'Đồng ý (theo giấy nhập học)'), nhan);
    await page.selectOption('#ad-dy-chiase', '0');
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    const r = doc("SELECT chiaSeGiaDinh FROM student_consent WHERE studentId = 's7'")[0];
    check('máy chủ ghi s7: không chia sẻ (0)', r?.chiaSeGiaDinh === 0, r);
    check('nhật ký thao tác ghi việc văn phòng sửa đồng ý',
      doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'consent-update' AND target = 's7'")[0].n >= 1);
  }

  // =========================================================================
  console.log('\n[4] Cô nhóm đó kể lần sau: câu hỏi quay lại và bắt buộc như cũ');
  {
    await dangNhap('giaovien2', '123456');
    const q = await moHopKe(GV2, 's2');
    check('có câu hỏi "Trong ảnh có bé khác không?"',
      /Trong ảnh có bé khác không/.test(await chuCua('#modal-overlay')) && await page.locator('#ht-chi-be').count() === 1,
      await chuCua('#modal-overlay'));
    await page.fill('#ht-cc', 'Con xếp tháp hồng từ lớn tới nhỏ.');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(900);
    check('chưa trả lời thì CHƯA kể — hộp vẫn mở', await page.locator('#modal-overlay #ht-cong-bo').count() === 1);
    check('máy chủ chưa công bố', !tepCua(q?.id));
    await page.check('#ht-chi-be');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1800);
    check('trả lời "Chỉ có bé" rồi kể được', await page.locator('#modal-overlay #ht-cong-bo').count() === 0, await chuCua('#modal-overlay'));
    check('bản chép đã xác nhận', tepCua(q?.id)?.daXacNhanBe === 1, tepCua(q?.id));
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
