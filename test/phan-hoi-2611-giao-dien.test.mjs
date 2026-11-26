// Bài canh GIAO DIỆN cho đợt sửa lỗi kiểm thử thay trường 26/11 (Đ261e).
// Bấm trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-2611-giao-dien.test.mjs
//
//   1. R3-1 — gia đình đọc báo cáo 6 tháng: ô mức có chữ ("Đã vững (S)",
//      "Chưa quan sát thấy (N)"), mức N màu xám (QUY TẮC 2).
//   2. R3-12 (QUY TẮC 5) — cô bấm "Gửi quản lý duyệt" ở báo cáo tháng có
//      "Đã thấy con làm được" mà hai ô việc làm tiếp trống: bị chặn, có lời
//      nhắc, bản vẫn là nháp.
//   3. R3-4 — gia đình chạm tin "Thực đơn tuần từ … đã có" của tuần sau: màn
//      Thực đơn mở ở "Tuần sau", đúng ngày của tuần ấy; nhà hai con chỉ một tin.
//   4. R3-5 — quản lý cơ sở nạp tệp Excel tuần sau chỉ sửa một ngày: ngày lấy
//      từ bản dùng chung gắn "giống bản đang có, không đổi", nút ghi "Lưu 1 ngày".
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai, khoaVaoCoSo, datChucVu, GOC,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2611-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe', 'hanhtrinh', 'thuchup', 'hocphi']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph2611gd_qt');
const mkQl = taoQuanTri(DIR, 'Quản Lý Cơ Sở 1', 'ph2611gd_ql');
datChucVu(DIR, 'ph2611gd_ql', 'quanly-coso');
khoaVaoCoSo(DIR, 'ph2611gd_ql', 'cs1');

const HOM = HOM_NAY();

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7201), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];

async function moTrang() {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  return { ctx, page };
}
async function dangNhap(page, u, p, duong = '') {
  await page.goto(`${sv.BASE}/${duong}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
async function moMan(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
}
const chuMan = (page) => page.locator('#view').innerText();

try {
  const qtTam = await login('ph2611gd_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtTam.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ph2611gd_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] R3-1 — gia đình đọc báo cáo 6 tháng: ô mức có chữ');
  {
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'hocky', ten: 'Bản đánh giá thử (Đ261e)', tuThang: 0, denThang: 72,
      dong: [
        { nhom: 'I. VẬN ĐỘNG', tieuDe: 'Chạy theo đường thẳng', kieu: 'muc' },
        { nhom: 'I. VẬN ĐỘNG', tieuDe: 'Bật xa bằng hai chân', kieu: 'muc' },
      ] } });
    check('đối chứng — tạo được mẫu 6 tháng', mau.status === 201 || mau.status === 200, mau.data);
    const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's5', mauId: mau.data.mau.id, tuNgay: `${HOM.slice(0, 4)}-06-01`, denNgay: HOM } });
    const ban = mo.data.ban;
    const [d1, d2] = ban.dong;
    await req('PUT', `/api/baocaohoctap/ban/${ban.id}`, { cookie: GV, body: {
      o: [{ dongId: d1.id, muc: 'da-vung' }, { dongId: d2.id, muc: 'chua-quan-sat-thay' }],
      oLopLamGi: 'Cô bày thêm vạch kẻ ở sân để con chạy theo.' } });
    const gui = await req('POST', `/api/baocaohoctap/ban/${ban.id}/gui`, { cookie: QT, body: { ngayCongBo: HOM } });
    check('đối chứng — quản trị duyệt và gửi gia đình ngay', gui.status === 200, gui.data);

    const { ctx, page } = await moTrang();
    await dangNhap(page, 'ph.lan', '123456');
    await moMan(page, '#/baocaohoctap');
    await page.locator('#view [data-mo]').first().click();
    await page.waitForTimeout(1200);
    const nhan = await page.locator('#view .badge').allInnerTexts();
    check('gia đình thấy "Đã vững (S)"', nhan.includes('Đã vững (S)'), nhan);
    check('gia đình thấy "Chưa quan sát thấy (N)"', nhan.includes('Chưa quan sát thấy (N)'), nhan);
    check('không còn ô mức trống chữ', nhan.every(x => x.trim()), nhan);
    const lopN = await page.locator('#view .badge', { hasText: 'Chưa quan sát thấy (N)' }).getAttribute('class');
    check('mức N màu xám (QUY TẮC 2)', /\bgray\b/.test(lopN || '') && !/red|danger/.test(lopN || ''), lopN);
    await page.click('#bc-ve-ds');
    await page.waitForTimeout(800);
    await page.locator('#view [data-mo]').first().click();
    await page.waitForTimeout(1200);
    const lai = await page.locator('#view .badge').allInnerTexts();
    check('bấm "Xem báo cáo khác" rồi mở lại vẫn có chữ', lai.includes('Đã vững (S)'), lai);
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[2] R3-12 — báo cáo tháng có nhận định mà chưa có việc làm tiếp: chặn gửi');
  {
    const THANG = HOM.slice(0, 7);
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
    const thapHong = dm.find(b => b.ten === 'Tháp hồng');
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG,
      danhSach: [{ studentId: 's6', baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] } });
    const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === 's6').ke;
    await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id,
      baiHoc: [{ id: ke.baiHoc.find(b => b.baiHocId === thapHong.id).id, mucDo: 'da-vung', tiepTuc: '' }] } });
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'thang', ten: 'Báo cáo tháng thử (Đ261e)', tuThang: 0, denThang: 72,
      dong: [{ nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' }] } });
    const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's6', mauId: mau.data.mau.id, tuNgay: `${THANG}-01`, denNgay: HOM } });
    const banId = mo.data.ban.id;
    check('đối chứng — bản điền sẵn có "Đã thấy con làm được"',
      /Đã thấy con làm được: Tháp hồng/.test(mo.data.ban.dong[0].chu), mo.data.ban.dong[0].chu);

    const { ctx, page } = await moTrang();
    await dangNhap(page, 'giaovien', '123456');
    await moMan(page, '#/baocaohoctap');
    await page.evaluate((id) => { App.views.baocaohoctap._banId = id; App.route(); }, banId);
    await page.waitForSelector('#bc-gui', { timeout: 10000 });
    await page.click('#bc-gui');
    await page.waitForTimeout(1200);
    const loi = await page.locator('#toast, .toast').allInnerTexts().catch(() => []);
    check('lời nhắc hiện ra: cần ghi "ở lớp cô làm gì tiếp" hoặc "ở nhà…"',
      loi.some(t => /ở lớp cô làm gì tiếp/.test(t)), loi);
    const ban = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('bản vẫn là nháp, chưa sang chờ duyệt', ban.trangThai === 'nhap', ban.buoc);
    await page.fill('#bc-nha', 'Cho con xếp chồng các hộp sữa từ to đến nhỏ.');
    await page.click('#bc-gui');
    await page.waitForTimeout(1200);
    const sau = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('ghi một dòng "Ở nhà gia đình chơi cùng con" rồi bấm gửi: sang chờ duyệt', sau.buoc === 'cho-duyet', sau.buoc);
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[3] R3-4 — chạm tin thực đơn tuần sau: mở đúng tuần sau');
  {
    const cong = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const t2 = cong(HOM, -((new Date(`${HOM}T00:00:00Z`).getUTCDay() + 6) % 7));
    const t2Sau = cong(t2, 7);
    const ddmm = (x) => `${x.slice(8, 10)}/${x.slice(5, 7)}`;
    const luu = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { campusId: 'cs1',
      ngay: [{ date: t2Sau, meals: [{ type: 'lunch', label: 'Bữa trưa', time: '11:20', items: ['Cơm gà Đ261e'] }] }] } });
    check('đối chứng — văn phòng lưu thực đơn tuần sau của cơ sở 1', luu.status === 200 && luu.data.daLuu === 1, luu.data);
    const tieuDe = `Thực đơn tuần từ ${ddmm(t2Sau)} đã có`;

    const { ctx, page } = await moTrang();
    await dangNhap(page, 'phuhuynh', '123456');       // p1: hai con, Chồi 2 và Lá 1
    await moMan(page, '#/notifications');
    const dong = page.locator('#view .list-row', { hasText: tieuDe });
    check('nhà hai con chỉ thấy MỘT tin thực đơn tuần sau', await dong.count() === 1, await dong.count());
    await dong.first().click();
    await page.waitForTimeout(1500);
    check('chạm tin → sang màn Thực đơn', (await page.evaluate(() => location.hash)) === '#/menu', await page.evaluate(() => location.hash));
    const dangChon = await page.locator('#menu-seg button.active').innerText().catch(() => '');
    check('màn Thực đơn đang ở "Tuần sau"', dangChon.trim() === 'Tuần sau', dangChon);
    const man = await chuMan(page);
    check('…và hiện món của tuần ấy', /Cơm gà Đ261e/.test(man), man.slice(0, 400));
    await ctx.close();
  }

  // =========================================================================
  console.log('\n[4] R3-5 — xem trước Excel: ngày lấy từ bản dùng chung là "không đổi"');
  {
    const qlTam = await login('ph2611gd_ql', mkQl);
    await req('POST', '/api/auth/set-new-password', { cookie: qlTam.cookie, body: { newPassword: 'quanly2026' } });
    const QL = (await login('ph2611gd_ql', 'quanly2026')).cookie;
    const cong = (x, n) => new Date(Date.parse(`${x}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const t2Sau = cong(cong(HOM, -((new Date(`${HOM}T00:00:00Z`).getUTCDay() + 6) % 7)), 7);
    const xem = (await req('GET', '/api/menu?week=1', { cookie: QL })).data.menus;
    check('đối chứng — tuần sau của cơ sở 1: thứ Hai bản riêng, bốn ngày lấy từ bản dùng chung',
      xem.length === 5 && xem[0].rieng && xem.slice(1).every(m => !m.rieng), xem.map(m => [m.date, m.rieng]));
    const r = await fetch(`${sv.BASE}/api/menu/mau-excel?tuan=${t2Sau}`, { headers: { Cookie: QL } });
    const trang = xlsx.doc(Buffer.from(await r.arrayBuffer())).find(b => b.ten === 'Thực đơn');
    const iTrua = trang.hang.findIndex(h => /^Bữa trưa/.test(String(h[0] || '')));
    trang.hang[iTrua][2] = 'Bún cá Đ261e';     // cột C = Thứ Ba
    const tep = xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: trang.hang }]);

    const { ctx, page } = await moTrang();
    await dangNhap(page, 'ph2611gd_ql', 'quanly2026');
    await moMan(page, '#/menu');
    await page.waitForSelector('#mn-xl-file', { state: 'attached', timeout: 10000 });
    await page.setInputFiles('#mn-xl-file', {
      name: 'thuc-don.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: tep });
    await page.waitForSelector('#mn-xl-xem', { timeout: 10000 });
    const hop = await page.locator('#modal-overlay').innerText();
    check('bốn ngày không sửa gắn "giống bản đang có, không đổi"',
      (hop.match(/giống bản đang có, không đổi/g) || []).length === 4, hop.slice(0, 600));
    const nut = await page.locator('#mn-xl-luu').innerText();
    check('nút lưu chỉ tính ngày có đổi: "Lưu 1 ngày vào thực đơn"', /Lưu 1 ngày vào thực đơn/.test(nut), nut);
    await page.click('#mn-xl-luu');
    await page.waitForTimeout(1500);
    const sau = (await req('GET', '/api/menu?week=1', { cookie: QL })).data.menus;
    check('lưu xong: chỉ thứ Ba thành bản riêng, ba ngày kia vẫn theo bản dùng chung',
      sau.map(m => m.rieng).join() === 'true,true,false,false,false', sau.map(m => [m.date, m.rieng]));
    await ctx.close();
  }

  check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  await browser.close();
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}
tongKet();
