// Bài canh GIAO DIỆN cho góp ý "phụ huynh bổ sung liên hệ khẩn cấp, nhà
// trường xác nhận" (Đ260j).
//
// Chạy bằng:  node test/phan-hoi-1811-lien-he-khan-giao-dien.test.mjs
//
//   1. Phụ huynh bé CHƯA có liên hệ khẩn cấp nào: thẻ vẫn hiện, có nút "Thêm
//      người liên hệ"; thêm xong thấy người ấy kèm nhãn "Chờ nhà trường xác
//      nhận" (xám, không đỏ), chưa có nút Gọi. Màn 390px không tràn ngang.
//   2. Văn phòng cơ sở thấy thẻ "Liên hệ khẩn cấp chờ xác nhận (1)" nhưng không
//      có nút thêm (việc của quản lý cơ sở — Đ168).
//   3. Quản lý cơ sở bấm "Thêm vào hồ sơ" ở thẻ đó → thẻ biến mất; gia đình
//      thấy người mới với nút Gọi.
//   4. Phiếu Sửa hồ sơ: thêm một đề xuất ngay trong phiếu rồi bấm "Lưu thay
//      đổi" → hồ sơ giữ đủ người cũ lẫn người mới (không bị danh sách cũ trong
//      phiếu ghi đè).
import { chromium } from 'playwright';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-lien-he-khan-gd');
sinhDuLieu(DIR);
const mkQL = taoQuanTri(DIR, 'Quản lý cơ sở 1', 'lhg_ql');
const mkVP = taoQuanTri(DIR, 'Văn phòng cơ sở 1', 'lhg_vp');
datChucVu(DIR, 'lhg_ql', 'quanly-coso'); khoaVaoCoSo(DIR, 'lhg_ql', 'cs1');
datChucVu(DIR, 'lhg_vp', 'vanphong-coso'); khoaVaoCoSo(DIR, 'lhg_vp', 'cs1');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5352), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const doc = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const lienHe = (sid) => doc('SELECT hoTen, dienThoai FROM student_emergency_contacts WHERE studentId = ? ORDER BY taoLuc, rowid', sid);

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
const chuCua = async (sel) => (await page.locator(sel).count() ? page.locator(sel).first().innerText() : '');
// Không tràn ngang: cả trang lẫn thẻ không rộng hơn khung.
const khongTran = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  return document.documentElement.scrollWidth <= window.innerWidth
    && (!el || el.scrollWidth <= el.clientWidth + 1);
}, sel);

try {
  for (const [ten, mk] of [['lhg_ql', mkQL], ['lhg_vp', mkVP]]) {
    const d0 = await login(ten, mk);
    await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  }
  check('dựng được tình huống: bé s3 chưa có liên hệ khẩn cấp nào', lienHe('s3').length === 0, lienHe('s3'));

  // =========================================================================
  console.log('\n[1] Phụ huynh bé chưa có liên hệ khẩn cấp: thêm một người, thấy "Chờ nhà trường xác nhận"');
  {
    await dangNhap('phuhuynh2', '123456');   // bố bé s3
    await moMan('#/student');
    const the = page.locator('#hs-lhkc');
    check('thẻ "Liên hệ khẩn cấp" hiện dù chưa có ai', await the.count() === 1 && /Liên hệ khẩn cấp/.test(await chuCua('#hs-lhkc')),
      await chuCua('#app'));
    check('có nút "Thêm người liên hệ"', await page.locator('#hs-lhkc-them').count() === 1);
    check('390px: thẻ không tràn ngang (trước khi thêm)', await khongTran('#hs-lhkc'));
    await page.click('#hs-lhkc-them');
    await page.waitForTimeout(500);
    await page.fill('#lhdx-ten', 'Bà Trần Thị Hoa');
    await page.fill('#lhdx-qh', 'Bà nội');
    await page.fill('#lhdx-sdt', '0912 777 888');
    await page.fill('#lhdx-gc', 'Đón được bé buổi chiều');
    await page.click('#lhdx-gui');
    await page.waitForTimeout(1500);
    check('hộp nhập đóng lại', await page.locator('#lhdx-gui').count() === 0);
    const chu = await chuCua('#hs-lhkc');
    check('người vừa thêm hiện trong thẻ', /Bà Trần Thị Hoa/.test(chu) && /Bà nội/.test(chu), chu);
    check('kèm nhãn "Chờ nhà trường xác nhận"', /Chờ nhà trường xác nhận/.test(chu), chu);
    const nhan = page.locator('#hs-lhkc [data-de-xuat] .badge');
    check('nhãn màu trung tính (xám), không đỏ',
      await nhan.count() === 1 && /\bgray\b/.test(await nhan.getAttribute('class')) && !/\bred\b/.test(await nhan.getAttribute('class')));
    check('chưa có nút Gọi cho số chưa xác nhận', await page.locator('#hs-lhkc a[href^="tel:"]').count() === 0);
    check('có nút Huỷ đề xuất', await page.locator('#hs-lhkc [data-huy-de-xuat]').count() === 1);
    check('390px: thẻ không tràn ngang (có đề xuất)', await khongTran('#hs-lhkc'));
    check('máy chủ ghi đề xuất đang chờ, chưa vào hồ sơ',
      doc("SELECT COUNT(*) AS n FROM lien_he_khan_de_xuat WHERE studentId = 's3' AND trangThai = 'cho'")[0].n === 1
      && lienHe('s3').length === 0);
  }

  // =========================================================================
  console.log('\n[2] Văn phòng cơ sở: thấy thẻ chờ xác nhận, không có nút thêm');
  {
    await dangNhap('lhg_vp', 'quantri2026');
    await moMan('#/admin/thongtin/nhom', 2000);
    const chu = await chuCua('#ad-lhkc-cho');
    check('thẻ "Liên hệ khẩn cấp chờ xác nhận (1)"', /Liên hệ khẩn cấp chờ xác nhận \(1\)/.test(chu), chu);
    check('kèm tên bé và người được đề xuất', /Phạm Gia Hân/.test(chu) && /Bà Trần Thị Hoa/.test(chu), chu);
    check('không có nút "Thêm vào hồ sơ" cho văn phòng', await page.locator('#ad-lhkc-cho [data-dx-them]').count() === 0);
    check('nói rõ ai xác nhận', /Quản lý cơ sở hoặc ban giám hiệu/.test(chu), chu);
  }

  // =========================================================================
  console.log('\n[3] Quản lý cơ sở thêm vào hồ sơ → gia đình thấy người mới có nút Gọi');
  {
    await dangNhap('lhg_ql', 'quantri2026');
    await moMan('#/admin/thongtin/nhom', 2000);
    check('quản lý cơ sở thấy nút "Thêm vào hồ sơ"', await page.locator('#ad-lhkc-cho [data-dx-them]').count() === 1);
    check('390px: thẻ chờ xác nhận không tràn ngang', await khongTran('#ad-lhkc-cho .card'));
    await page.click('#ad-lhkc-cho [data-dx-them]');
    await page.waitForTimeout(1500);
    check('thẻ biến mất khi không còn đề xuất chờ', (await chuCua('#ad-lhkc-cho')).trim() === '', await chuCua('#ad-lhkc-cho'));
    check('máy chủ: hồ sơ s3 có Bà Trần Thị Hoa', lienHe('s3').some(x => x.hoTen === 'Bà Trần Thị Hoa' && x.dienThoai === '0912777888'), lienHe('s3'));

    await dangNhap('phuhuynh2', '123456');
    await moMan('#/student');
    const chu = await chuCua('#hs-lhkc');
    check('gia đình thấy Bà Trần Thị Hoa trong liên hệ khẩn cấp', /Bà Trần Thị Hoa/.test(chu), chu);
    check('có nút Gọi đúng số', await page.locator('#hs-lhkc a[href="tel:0912777888"]').count() === 1);
    check('không còn nhãn "Chờ nhà trường xác nhận"', !/Chờ nhà trường xác nhận/.test(chu), chu);
    check('390px: thẻ không tràn ngang (sau khi thêm)', await khongTran('#hs-lhkc'));
  }

  // =========================================================================
  console.log('\n[4] Phiếu Sửa hồ sơ: thêm đề xuất trong phiếu rồi Lưu — không mất ai');
  {
    const PH = (await login('phuhuynh2', '123456')).cookie;
    const r = await req('POST', '/api/students/s3/lien-he-de-xuat', {
      cookie: PH, body: { ten: 'Chú Phạm Văn Long', quanHe: 'Chú ruột', sdt: '0933 222 111' },
    });
    check('gia đình gửi thêm đề xuất thứ hai', r.status === 200, r.data);
    await dangNhap('lhg_ql', 'quantri2026');
    await moMan('#/admin/thongtin/nhom', 2000);
    await page.evaluate(() => App.views.admin.suaHocSinh('s3'));
    await page.waitForTimeout(1500);
    const chu = await chuCua('#ad-hs-lhdx');
    check('phiếu Sửa hồ sơ hiện đề xuất đang chờ', /Chú Phạm Văn Long/.test(chu) && /Gia đình đề xuất thêm \(1\)/.test(chu), chu);
    await page.click('#ad-hs-lhdx [data-dx-them]');
    await page.waitForTimeout(1500);
    const dong = await page.locator('#ad-hs-lhkc .lhkc-ten').evaluateAll(xs => xs.map(x => x.value));
    check('người vừa thêm được nối vào các dòng của phiếu', JSON.stringify(dong) === JSON.stringify(['Bà Trần Thị Hoa', 'Chú Phạm Văn Long']), dong);
    check('đề xuất thôi hiện trong phiếu', !/Chú Phạm Văn Long/.test(await chuCua('#ad-hs-lhdx')));
    await page.click('#ad-hs-luu');
    await page.waitForTimeout(1500);
    const sau = lienHe('s3').map(x => x.hoTen);
    check('lưu phiếu xong hồ sơ vẫn đủ hai người', JSON.stringify(sau) === JSON.stringify(['Bà Trần Thị Hoa', 'Chú Phạm Văn Long']), sau);
    const gcHoa = doc('SELECT ghiChu FROM student_emergency_contacts WHERE studentId = ? AND hoTen = ?', 's3', 'Bà Trần Thị Hoa');
    check('lưu phiếu xong ghi chú của người đã có KHÔNG bị xoá trắng', gcHoa.length === 1 && gcHoa[0].ghiChu === 'Đón được bé buổi chiều', gcHoa);
  }

  check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
