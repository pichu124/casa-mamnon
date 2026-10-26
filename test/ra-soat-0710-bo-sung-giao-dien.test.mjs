// Bài canh BỔ SUNG cho vòng rà Đ232 — những bản vá trước đây chỉ được canh ở
// phía máy chủ, hoặc mới chỉ đọc lại mã. Mọi mục ở đây bấm trên trình duyệt thật.
//
// Chạy bằng:  node test/ra-soat-0710-bo-sung-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
//   1. Điểm danh, màn ở cổng mở từ sáng: chạm chụp bé mà máy khác đã chụp ảnh
//      tới lớp → hộp hỏi "ghi tấm này là ảnh RA VỀ?". Đồng ý thì ghi giờ về;
//      không đồng ý thì không ghi gì. Ảnh sáng KHÔNG bao giờ bị thay.
//   2. Kế hoạch của bé: bài đã tích mà văn phòng ẩn khỏi kho vẫn có chip, và
//      Lưu nháp không xoá bài ấy (kèm mức độ đã nhìn lại).
//   3. Kế hoạch của bé: phần Cambridge còn trống thì chip gợi ý từ tháng trước
//      được tích sẵn đúng nhãn, dù phần Montessori đã lưu trước.
//   4. Thực đơn: đang soạn cả tuần dở mà bấm Lưu từ tệp Excel → hỏi trước.
//   5. Nhật ký: phần đã gửi rồi bỏ hết → thẻ và hộp Gửi nói "gia đình còn thấy
//      bản cũ", gửi là gỡ; bé có đơn nghỉ không được chọn sẵn.
//   6. Nhật ký: ghi chú của mốc vệ sinh hiện trong hộp soát và trên màn gia đình.
//   7. Nhân sự: bảng công có link "Ảnh vào" mở được; cô thấy ảnh của chính mình.
import path from 'node:path';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY, CHROMIUM, tatBannerMoiCai, GOC, goCoNuocNgoaiMau,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const xlsx = require(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ra-soat-0710-bs-gd');
sinhDuLieu(DIR);
// Đ242F — F6b: dữ liệu mẫu nay có cô nước ngoài khai vai ở mọi nhóm. Bài này
// canh ca "trường CHƯA khai vai" (cô phụ trách soạn cả ba phần), nên gỡ đi.
goCoNuocNgoaiMau(DIR);
batPhanHe(DIR, ['kehoachbe', 'nhatky', 'xinphep', 'nhansu', 'diemdanh']);
const mk = {
  qt: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  bv: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
datChucVu(DIR, 'nhansu1', 'nhansu');

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const thangTruoc = (() => { const [y, m] = THANG.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
// Nhật ký: ngày HAI hôm trước — trong hai tuần gia đình đọc được, và xoá sạch
// dòng mẫu trước khi máy chủ chạy để ngày này theo đúng luật "gửi mới thấy".
const NGAY_NK = new Date(Date.parse(`${HOM}T00:00:00Z`) - 2 * 86400000).toISOString().slice(0, 10);
const csdl = (fn, chiDoc = false) => {
  const c = new Database(path.join(DIR, 'school.db'), chiDoc ? { readonly: true } : {});
  try { return fn(c); } finally { c.close(); }
};
csdl(c => {
  for (const s of ['s1', 's3']) {
    c.prepare('DELETE FROM attendance WHERE date = ? AND studentId = ?').run(HOM, s);
    c.prepare('DELETE FROM attendance_photo WHERE date = ? AND studentId = ?').run(HOM, s);
  }
  for (const t of ['nhatky_ngay', 'nhatky_bua', 'nhatky_vesinh', 'nhatky_gui']) {
    try { c.prepare(`DELETE FROM ${t} WHERE ngay = ? AND studentId IN ('s9', 's10', 's11')`).run(NGAY_NK); } catch (_) { /* bảng chưa có */ }
  }
  c.prepare(`INSERT INTO leave_requests (id, studentId, parentId, fromDate, toDate, reason, status, createdAt, reviewedBy, reviewNote)
             VALUES ('lv_bs', 's10', 'p8', ?, ?, 'Sốt', 'approved', ?, 't4', '')`).run(NGAY_NK, NGAY_NK, new Date().toISOString());
});

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3365), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG = `data:image/png;base64,${PNG_B64}`;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const hopThoai = [];
let traLoi = 'accept';
page.on('dialog', (d) => { hopThoai.push(d.message()); (traLoi === 'accept' ? d.accept() : d.dismiss()).catch(() => {}); });
const guiDi = [];
page.on('request', r => { if (r.method() !== 'GET') guiDi.push({ url: r.url().replace(sv.BASE, ''), than: r.postData() || '' }); });

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
const chu = () => page.locator('#view').innerText();

try {
  const QT = await vao('hieutruong', mk.qt);
  const BV = await vao('baove1', mk.bv);
  await vao('nhansu1', mk.ns);
  const GV = (await login('giaovien', '123456')).cookie;     // t1, nhóm c1
  const GV_NT = (await login('giaovien4', '123456')).cookie; // t4, nhóm c4
  const PH_NT = (await login('ph.trang', '123456')).cookie;  // mẹ s9

  // =========================================================================
  console.log('\n[1] Điểm danh: màn ở cổng đã cũ — chạm chụp bé đã có ảnh tới lớp thì HỎI, không thay ảnh sáng');
  {
    const dongDiemDanh = (id) => csdl(c => ({
      rec: c.prepare('SELECT status, checkOut FROM attendance WHERE studentId = ? AND date = ?').get(id, HOM),
      anh: (c.prepare('SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?').get(id, HOM) || {}).file,
    }), true);
    const chamVaChonAnh = async (id) => {
      const [fc] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.locator(`#att-dong-${id} span[title="Bấm để chụp ảnh"]`).click(),
      ]);
      await fc.setFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
      await page.waitForTimeout(2000);
    };

    // (a) KHÔNG đồng ý: không ghi gì, ảnh sáng còn nguyên.
    await dangNhap('giaovien', '123456');
    await moMan('#/attendance');
    check('đối chứng — màn mở khi bé s3 chưa có mặt', /chưa có ảnh|Chụp ảnh con tới lớp/i.test(await page.locator('#att-dong-s3').innerText()));
    const sang3 = await req('POST', '/api/attendance/anh', { cookie: GV, body: { studentId: 's3', date: HOM, anh: PNG, yDinh: 'toi-lop' } });
    check('đối chứng — máy khác vừa chụp ảnh tới lớp cho s3', sang3.status === 201, sang3.data);
    hopThoai.length = 0;
    traLoi = 'dismiss';
    await chamVaChonAnh('s3');
    traLoi = 'accept';
    check('màn cũ hỏi: bé đã có ảnh tới lớp — ghi tấm này là ảnh RA VỀ?',
      hopThoai.some(m => /đã có ảnh tới lớp/.test(m) && /RA VỀ/.test(m)), hopThoai);
    const s3 = dongDiemDanh('s3');
    check('cô không đồng ý: chưa ghi giờ về', !!s3.rec && !s3.rec.checkOut, s3.rec);
    check('và ảnh sáng KHÔNG bị thay', s3.anh === sang3.data.file, { anh: s3.anh, sang: sang3.data.file });
    check('không gọi đường ghi ra về', !guiDi.some(x => /\/api\/attendance\/ra-ve$/.test(x.url)));

    // (b) ĐỒNG Ý: tấm vừa chụp thành ảnh ra về, ảnh sáng vẫn còn.
    await moMan('#/attendance');
    const sang1 = await req('POST', '/api/attendance/anh', { cookie: GV, body: { studentId: 's1', date: HOM, anh: PNG, yDinh: 'toi-lop' } });
    hopThoai.length = 0;
    await chamVaChonAnh('s1');
    const s1 = dongDiemDanh('s1');
    check('cô đồng ý: hộp hỏi đã hiện', hopThoai.some(m => /RA VỀ/.test(m)), hopThoai);
    check('giờ ra về được ghi', !!s1.rec && !!s1.rec.checkOut, s1.rec);
    check('ảnh tới lớp buổi sáng vẫn là ảnh sáng', s1.anh === sang1.data.file, { anh: s1.anh, sang: sang1.data.file });
  }

  // =========================================================================
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
  const bai = (ten) => dm.find(b => b.ten === ten);
  const [thapHong, hopMau, cauThang, colours] = [bai('Tháp hồng'), bai('Hộp màu 1'), bai('Cầu thang nâu'), bai('Colours')];
  const keCua = async (id) => ((((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data || {}).danhSach || [])
    .find(x => x.studentId === id) || {});
  console.log('\n[2] Kế hoạch của bé: bài đã tích mà văn phòng ẨN khỏi kho vẫn có chip, Lưu nháp không xoá nó');
  {
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem',
      danhSach: [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: hopMau.id, nhan: 'hoc-moi' }] }] } });
    let ke = (await keCua('s1')).ke;
    await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: [
      { id: (ke.baiHoc.find(b => b.baiHocId === hopMau.id) || {}).id, mucDo: 'dang-hinh-thanh', tiepTuc: '' }] } });
    csdl(c => c.prepare('UPDATE kehoachbe_baihoc SET active = 0 WHERE id = ?').run(hopMau.id));
    const kho = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
    check('đối chứng — "Hộp màu 1" không còn trong kho đang dùng', !kho.some(b => b.id === hopMau.id));

    await moMan('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(400);
    await page.selectOption('#kb-goc', 'giac-quan');
    await page.waitForTimeout(400);
    const chipAn = page.locator(`.kb-bai[data-be="s1"][data-bai="${hopMau.id}"]`);
    check('bài đã ẩn vẫn có chip, vẫn mang nhãn "Dạy mới"',
      await chipAn.count() === 1 && (await chipAn.getAttribute('data-nhan')) === 'hoc-moi', await chipAn.count());
    await page.locator(`.kb-bai[data-be="s1"][data-bai="${cauThang.id}"]`).click();
    await page.click('#kb-luu');
    await page.waitForTimeout(1500);
    ke = (await keCua('s1')).ke;
    const hm = (ke.baiHoc || []).find(b => b.baiHocId === hopMau.id);
    check('Lưu nháp xong: "Cầu thang nâu" vừa tích đã vào kế hoạch', (ke.baiHoc || []).some(b => b.baiHocId === cauThang.id));
    check('và "Hộp màu 1" (đã ẩn) VẪN còn, kèm mức độ đã nhìn lại', !!hm && hm.mucDo === 'dang-hinh-thanh', hm);
  }

  // =========================================================================
  console.log('\n[3] Kế hoạch của bé: phần Cambridge còn trống thì chip gợi ý tháng trước được tích sẵn');
  {
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: thangTruoc, chuongTrinh: 'nuoc-ngoai',
      danhSach: [{ studentId: 's3', capNhatLucGoc: null, baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }] } });
    const keT = (((await req('GET', `/api/kehoachbe?classId=c1&thang=${thangTruoc}`, { cookie: GV })).data || {}).danhSach || [])
      .find(x => x.studentId === 's3').ke;
    await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: keT.id, baiHoc: [
      { id: keT.baiHoc.find(b => b.baiHocId === colours.id).id, mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' }] } });
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem',
      danhSach: [{ studentId: 's3', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] } });
    const x3 = await keCua('s3');
    check('đối chứng — máy chủ gửi gợi ý cho phần Cambridge còn trống của s3',
      !!x3.goiYPhanTrong && (x3.goiYPhanTrong.baiHoc || []).some(b => b.baiHocId === colours.id), { goiY: x3.goiYPhanTrong, ct: x3.ke && x3.ke.chuongTrinh });
    // Trang đang đứng sẵn ở #/kehoachbe (mục 2): mở lại đúng địa chỉ ấy không
    // tải lại dữ liệu — rời trang trước để màn đọc bản vừa lưu.
    await moMan('#/');
    await moMan('#/kehoachbe');
    await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
    await page.waitForTimeout(500);
    await page.selectOption('#kb-be', 's3');
    await page.waitForTimeout(500);
    const chip = page.locator(`.kb-bai[data-be="s3"][data-bai="${colours.id}"]`);
    check('chip "Colours" được tích sẵn là ÔN TẬP', (await chip.getAttribute('data-nhan').catch(() => '')) === 'on-tap',
      await chip.getAttribute('data-nhan').catch(() => 'không có chip'));
    check('có dòng nhắc "Tiếp tục ở tháng sau" từ tháng trước', /Tiếp tục ở tháng sau/.test(await chu()));
    await page.click('#kb-ct [data-ct="chu-nhiem"]');
    await page.waitForTimeout(500);
    check('tab Montessori (đã soạn) KHÔNG có dòng gợi ý chen vào', !/Tiếp tục ở tháng sau/.test(await chu()));
  }

  // =========================================================================
  console.log('\n[4] Thực đơn: đang soạn cả tuần dở mà bấm Lưu từ tệp Excel → hỏi trước');
  {
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/menu');
    await page.click('#btn-soan-tuan');
    await page.waitForTimeout(800);
    await page.fill('#tt-mon-0-0', 'Món đang gõ dở');
    const [y, m] = HOM.split('-').map(Number);
    const tg = new Date(Date.UTC(y, m - 1 + 2, 1));
    while (tg.getUTCDay() === 0 || tg.getUTCDay() === 6) tg.setUTCDate(tg.getUTCDate() + 1);
    const ngay = tg.toISOString().slice(0, 10);
    const tep = xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: [
      ['Ngày', 'Thứ', 'Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Sữa Vinamilk'],
      [`${ngay.slice(8, 10)}/${ngay.slice(5, 7)}/${ngay.slice(0, 4)}`, '', 'Cháo', '', 'Cơm', '', ''],
    ] }]);
    await page.setInputFiles('#mn-xl-file', { name: 'thuc-don.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: tep });
    await page.waitForTimeout(1500);
    check('đối chứng — hộp xem trước mở ra', await page.locator('#mn-xl-luu').count() === 1);
    hopThoai.length = 0;
    guiDi.length = 0;
    traLoi = 'dismiss';
    await page.click('#mn-xl-luu');
    await page.waitForTimeout(800);
    traLoi = 'accept';
    check('bấm Lưu thì HỎI "đang soạn dở thực đơn cả tuần"', hopThoai.some(x => /soạn dở thực đơn cả tuần/.test(x)), hopThoai);
    check('cô chọn ở lại: chưa lưu gì', !guiDi.some(x => /nap-excel/.test(x.url) && /"luu":true/.test(x.than)), guiDi);
    check('phần đang gõ trong màn soạn còn nguyên', (await page.inputValue('#tt-mon-0-0').catch(() => '')) === 'Món đang gõ dở');
    if (await page.locator('#mn-xl-luu').count()) {
      await page.click('#mn-xl-luu');
      await page.waitForTimeout(1500);
    }
    const daLuu = csdl(c => c.prepare('SELECT meals FROM menus WHERE date = ?').get(ngay), true);
    check('cô đồng ý rời màn soạn: thực đơn từ tệp được lưu', !!daLuu && /Cháo/.test(daLuu.meals || ''), daLuu);
  }

  // =========================================================================
  console.log('\n[5] Nhật ký: phần đã gửi rồi bỏ hết → màn nói "gia đình còn thấy bản cũ", gửi là gỡ; bé nghỉ không chọn sẵn');
  {
    const putNgu = (danhSach) => req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: NGAY_NK, truong: ['nguTuLuc', 'nguDenLuc'], danhSach } });
    await putNgu([{ studentId: 's9', nguTuLuc: '11:30', nguDenLuc: '14:00' }]);
    await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY_NK, phan: 'ngu', studentIds: ['s9'] } });
    await putNgu([{ studentId: 's9', nguTuLuc: '', nguDenLuc: '' }, { studentId: 's10', nguTuLuc: '11:00', nguDenLuc: '13:00' }]);
    const meDoc = async () => ((await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY_NK}&den=${NGAY_NK}`, { cookie: PH_NT })).data || {}).ngayCo || [];
    check('đối chứng — gia đình s9 đang đọc giấc trưa ghi nhầm', (await meDoc()).some(n => n.nguTuLuc === '11:30'));

    await dangNhap('giaovien4', '123456');
    await moMan('#/nhatky');
    await page.fill('#nk-ngay', NGAY_NK);
    await page.locator('#nk-ngay').dispatchEvent('change');
    await page.waitForTimeout(1200);
    await page.click('.nk-phan [data-phan="ngu"]');
    await page.waitForTimeout(800);
    check('thẻ bé nói rõ "Đã bỏ · gia đình còn thấy bản cũ"', /Đã bỏ · gia đình còn thấy bản cũ/.test(await chu()), (await chu()).slice(0, 300));
    await page.click('#nk-gui');
    await page.waitForTimeout(600);
    const o9 = page.locator('.nk-gui-be[value="s9"]');
    const o10 = page.locator('.nk-gui-be[value="s10"]');
    const ds = await page.locator('#nk-gui-ds').innerText();
    check('hộp Gửi: bé đã bỏ hết vẫn chọn được và được chọn sẵn', !(await o9.isDisabled()) && await o9.isChecked());
    check('hộp Gửi nói rõ "đã bỏ, gia đình còn thấy bản cũ"', /đã bỏ, gia đình còn thấy bản cũ/.test(ds), ds);
    check('bé có đơn nghỉ hôm ấy KHÔNG được chọn sẵn, và có ghi chú "có đơn nghỉ"',
      !(await o10.isChecked()) && /có đơn nghỉ hôm nay/.test(ds), ds);
    await page.click('#nk-gui-xac');
    await page.waitForTimeout(1500);
    check('gửi xong gia đình KHÔNG còn đọc giấc trưa ghi nhầm', !(await meDoc()).some(n => n.nguTuLuc === '11:30'), await meDoc());
    const nhomNk = ((await req('GET', `/api/nhatky?classId=c4&ngay=${NGAY_NK}`, { cookie: GV_NT })).data || {}).danhSach || [];
    const g10 = (((nhomNk.find(b => b.studentId === 's10') || {}).gui || {}).ngu) || {};
    check('bé có đơn nghỉ không bị gửi kèm (vẫn chờ cô tự quyết)', !g10.guiLuc && g10.chuaGui === true, g10);
  }

  // =========================================================================
  console.log('\n[6] Nhật ký: ghi chú của mốc vệ sinh hiện trong hộp soát và trên màn gia đình');
  {
    await req('POST', '/api/nhatky/ve-sinh', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_NK, studentIds: ['s9'], luc: '10:30', loai: 'thay-bim', ghiChu: 'hăm đỏ, cô đã bôi kem' } });
    await moMan('#/nhatky');
    await page.fill('#nk-ngay', NGAY_NK);
    await page.locator('#nk-ngay').dispatchEvent('change');
    await page.waitForTimeout(1200);
    await page.click('.nk-phan [data-phan="vesinh"]');
    await page.waitForTimeout(800);
    await page.click('#nk-gui');
    await page.waitForTimeout(600);
    check('hộp soát có ghi chú của mốc vệ sinh', /hăm đỏ, cô đã bôi kem/.test(await page.locator('#nk-gui-ds').innerText()));
    await page.click('#nk-gui-xac');
    await page.waitForTimeout(1500);
    await dangNhap('ph.trang', '123456');
    await moMan('#/nhatky');
    check('màn gia đình hiện ghi chú ấy cạnh giờ thay bỉm', /10:30[^\n]*hăm đỏ, cô đã bôi kem/.test(await chu()), (await chu()).slice(0, 500));
  }

  // =========================================================================
  console.log('\n[7] Nhân sự: bảng công có link ảnh chấm công mở được; cô thấy ảnh của chính mình');
  {
    const chup = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
    check('đối chứng — bảo vệ chụp ảnh vào cho cô t1', chup.status === 201, chup.data);
    await dangNhap('nhansu1', 'quantri2026');
    await moMan('#/nhansu');
    await page.click('#ns-tab [data-tab="chamcong"]');
    await page.waitForTimeout(1000);
    await page.locator('[data-cc]', { hasText: 'Mai Anh' }).first().click();
    await page.waitForTimeout(800);
    const link = page.locator('#modal-overlay a', { hasText: 'Ảnh vào' });
    check('hộp chấm công từng ngày có link "Ảnh vào"', await link.count() === 1);
    const href = await link.getAttribute('href').catch(() => '');
    const mo = await page.evaluate(async (u) => (await fetch(u)).status, href || '/x');
    check('link mở được ảnh (đường của Nhân sự)', /^\/api\/nhansu\/anh-cham-cong\//.test(href || '') && mo === 200, { href, mo });

    await dangNhap('giaovien', '123456');
    await moMan('#/nhansu');
    const linkToi = page.locator('#view a', { hasText: 'Ảnh vào' });
    const hrefToi = await linkToi.first().getAttribute('href').catch(() => '');
    const moToi = await page.evaluate(async (u) => (await fetch(u)).status, hrefToi || '/x');
    check('cô thấy link ảnh chấm công của chính mình (đường /toi) và mở được',
      /\/toi$/.test(hrefToi || '') && moToi === 200, { hrefToi, moToi });
  }

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
