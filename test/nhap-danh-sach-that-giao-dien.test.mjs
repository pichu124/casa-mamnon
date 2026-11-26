// Bài canh GIAO DIỆN cho đợt sửa nhập danh sách (Đ261a — báo cáo kiểm thử 26/11).
//
// Chạy bằng:  node test/nhap-danh-sach-that-giao-dien.test.mjs
//
//   [1] B1 — phiếu "Đã nhận bé" (mật khẩu chỉ hiện một lần) KHÔNG đóng khi bấm
//       ra vùng tối; kèm cảnh báo ngày sinh khi bé ngoài lứa.
//   [2] O1/O7/B3 — màn xem trước nói rõ: dòng ngày sinh không có thật, dòng cảnh
//       báo vàng, tên nhóm gõ lệch dấu, dòng ví dụ đã bỏ qua.
//   [3] O2 — thêm phụ huynh có số đã là tài khoản: hỏi rồi nối, không mật khẩu mới.
//   [4] B2/B10 — hộp Sửa nhóm: câu nhắc đúng sự thật, không còn thay bỉm/bú bình.
//   [5] O1/B13 — hồ sơ phía gia đình: ngày sinh lưu sai thì nhắc văn phòng sửa,
//       không "NaN/NaN/NaN"; bé chưa có mã thì không in "Mã của bé:" rỗng.
import { chromium } from 'playwright';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhap-danh-sach-that-giao-dien');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu trưởng', 'ndg_qt');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7002), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const CSDL = path.join(DIR, 'school.db');
const doc = (sql, ...thamSo) => {
  const c = new Database(CSDL, { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const ghi = (sql, ...thamSo) => {
  const c = new Database(CSDL);
  try { c.prepare(sql).run(...thamSo); } finally { c.close(); }
};
const luiThang = (n) => {
  const [y, m, d] = HOM_NAY().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - n, Math.min(d, 28))).toISOString().slice(0, 10);
};

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const hoi = [];
page.on('dialog', d => { hoi.push(d.message()); d.accept(); });

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

try {
  const d0 = await login('ndg_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  await dangNhap('ndg_qt', 'quantri2026');

  // =========================================================================
  console.log('\n[1] Phiếu "Đã nhận bé" giữ lại khi bấm ra vùng tối');
  {
    await page.goto(`${sv.BASE}/#/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => App.views.admin.moNhanBe('c4', 'Nhà trẻ 1'));
    await page.waitForSelector('#nb-luu', { timeout: 6000 });
    await page.fill('#nb-ten', 'Bé Nhận Sớm Giao Diện');
    await page.fill('#nb-ns', luiThang(8));
    await page.fill('#nb-ph', 'Mẹ Bé Sớm');
    await page.fill('#nb-sdt', '0976666661');
    await page.click('#nb-luu');
    await page.waitForSelector('#nb-xong', { timeout: 8000 });
    check('phiếu có cảnh báo bé 8 tháng (vẫn nhận)',
      /8 tháng/.test(await page.locator('#modal-overlay [data-canh-bao]').innerText().catch(() => '')));
    await page.mouse.click(195, 20);   // vùng tối phía trên phiếu
    await page.waitForTimeout(500);
    check('bấm ra vùng tối: phiếu mật khẩu VẪN còn', await page.locator('#nb-xong').count() === 1);
    await page.click('#nb-xong');
    await page.waitForTimeout(800);
  }

  // =========================================================================
  console.log('\n[2] Màn xem trước của nhập danh sách');
  {
    await page.goto(`${sv.BASE}/#/admin/thongtin/nhapbe`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#ad-file', { state: 'attached', timeout: 8000 });
    const mau = (await (await fetch(`${sv.BASE}/api/admin/import/template`, {
      headers: { Cookie: (await login('ndg_qt', 'quantri2026')).cookie },
    })).text()).replace(/^﻿/, '').trim();
    const them = [
      ['', 'Bé Ngày Sai', '31/02/2024', '', 'Chồi 2', '', '', 'PH Sai', '0977777771'],
      ['', 'Bé Sáu Tháng', luiThang(6).split('-').reverse().join('/'), '', 'Chồi 2', '', '', 'PH Sáu', '0977777772'],
      ['', 'Bé Nhóm Lệch', '', '', 'Choi 2', '', '', 'PH Lệch', '0977777773'],
    ].map(h => h.join(',')).join('\n');
    await page.setInputFiles('#ad-file', {
      name: 'danh-sach.csv', mimeType: 'text/csv', buffer: Buffer.from(`${mau}\n${them}\n`, 'utf8'),
    });
    await page.waitForSelector('#ad-commit', { timeout: 8000 });
    const chu = await page.locator('#ad-preview').innerText();
    check('dòng 3: ngày sinh không có thật', /Dòng 3.*ngày sinh '31\/02\/2024' không có thật/.test(chu), chu.slice(0, 600));
    check('cảnh báo vàng cho bé 6 tháng', /6 tháng/.test(await page.locator('#ad-preview [data-canh-bao]').innerText().catch(() => '')));
    const lech = await page.locator('#ad-preview [data-lop-gan-giong]').innerText().catch(() => '');
    check('cảnh báo nổi bật: nhóm MỚI giống nhóm đã có', /Sẽ tạo nhóm MỚI 'Choi 2' \(giống 'Chồi 2' đã có\?\)/.test(lech), lech);
    check('báo đã bỏ qua dòng ví dụ', /dòng ví dụ/.test(await page.locator('#ad-preview [data-vi-du]').innerText().catch(() => '')));
    check('nút nhập đếm đúng 2 bé (không có dòng ví dụ, không có dòng lỗi)',
      /Nhập 2 bé/.test(await page.locator('#ad-commit').innerText()), await page.locator('#ad-commit').innerText());
  }

  // =========================================================================
  console.log('\n[3] Thêm phụ huynh có số đã là tài khoản: hỏi rồi nối');
  {
    const be = doc("SELECT id, name FROM students WHERE name = 'Bé Nhận Sớm Giao Diện'")[0];
    hoi.length = 0;
    await page.evaluate((s) => App.views.admin.moThemPhuHuynh({ ...s, parents: [] }), be);
    await page.waitForSelector('#tk-ph-luu', { timeout: 6000 });
    check('câu dẫn không còn hứa "luôn tạo tài khoản mới"',
      !/luôn tạo/.test(await page.locator('#modal-overlay').innerText()));
    await page.fill('#tk-ph-ten', 'Lê Thị Thu Hà');
    await page.fill('#tk-ph-sdt', '0912 345 678');
    await page.click('#tk-ph-luu');
    await page.waitForTimeout(1500);
    check('máy hỏi trước, nêu tên chủ tài khoản và bé', hoi.some(x => /Lê Thị Thu Hà.*Nguyễn Bảo An.*Nối vào bé này\?/s.test(x)), hoi);
    check('đồng ý thì nối vào tài khoản p1', doc('SELECT 1 FROM student_parents WHERE studentId = ? AND parentId = ?', be.id, 'p1').length === 1);
    check('không hiện hộp mật khẩu tạm nào', await page.locator('#tk-mat-khau').count() === 0);
    check('không sinh tài khoản thứ hai', doc("SELECT COUNT(*) AS n FROM users WHERE REPLACE(phone, ' ', '') = '0912345678'")[0].n === 1);
  }

  // =========================================================================
  console.log('\n[4] Hộp Sửa nhóm');
  {
    await page.goto(`${sv.BASE}/#/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => App.views.admin.suaLop('c4'));
    await page.waitForSelector('#ad-sl-luu', { timeout: 6000 });
    const chu = await page.locator('#modal-overlay').innerText();
    check('không còn câu thay bỉm / bú bình', !/bỉm|bú bình/i.test(chu), chu.slice(0, 400));
    check('câu nhắc nói chọn cô phụ trách không đổi vai ở nhóm khác', /KHÔNG đổi vai của cô ở\s+nhóm khác/.test(chu));
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[5] Hồ sơ phía gia đình');
  {
    ghi("UPDATE students SET dob = '24/09/2023', code = NULL WHERE id IN (SELECT studentId FROM student_parents WHERE parentId = 'p1')");
    await dangNhap('phuhuynh', '123456');
    await page.goto(`${sv.BASE}/#/student`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-ma-nhom]', { timeout: 8000 });
    const chu = await page.locator('#view').innerText();
    check('không có NaN', !/NaN/.test(chu), chu.slice(0, 300));
    check('nhắc "Ngày sinh chưa đúng — văn phòng sửa lại"', /Ngày sinh chưa đúng — văn phòng sửa lại/.test(chu));
    const maNhom = await page.locator('[data-ma-nhom]').innerText();
    check('bé chưa có mã: không in "Mã của bé:" rỗng', !/Mã của bé/.test(maNhom) && maNhom.trim().length > 0, maNhom);

    // Bé chưa ghi giới tính: trước đây là một nhãn rỗng rồi dấu cách, rồi tuổi.
    ghi(`UPDATE students SET dob = ?, gender = NULL WHERE id IN (SELECT studentId FROM student_parents WHERE parentId = 'p1')`, luiThang(40));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-nhan-be]', { timeout: 8000 });
    const nhan = await page.locator('[data-nhan-be]').innerHTML();
    check('bé chưa ghi giới tính: chỉ một nhãn tuổi, không nhãn rỗng, không dấu cách thừa',
      /^<span class="badge purple">3 tuổi 4 tháng<\/span>$/.test(nhan), JSON.stringify(nhan.slice(0, 80)));
    check('ngày sinh đúng thì hiện dd/mm/yyyy',
      (await page.locator('#view').innerText()).includes(luiThang(40).split('-').reverse().join('/')));
  }

  check('không có lỗi JavaScript trên trang', !loiJs.length, loiJs);
} catch (err) {
  check('bài chạy không vấp lỗi', false, err.stack || err.message);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
