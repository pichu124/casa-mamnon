// Bài canh giao diện Đ261i — ba rủi ro báo cáo Đ261d để lại. Trình duyệt thật,
// khổ điện thoại 390px.
//
// Chạy bằng:  node test/phan-hoi-2611-o-so-giao-dien.test.mjs
//
//   [1] Trang chủ của cô: "Nghỉ không phép" màu CAM như màn Điểm danh và màn
//       gia đình (Đ261d), không còn đỏ — chấm trên ảnh bé, chú thích, ô đếm,
//       nhãn ở màn một nhóm.
//   [2] Ô tiền ở Học phí (một bé, cả nhóm, ưu đãi, biểu phí): ô type="number"
//       đọc "500.000" thành 500 đồng và "1,5" thành 15 đồng mà không báo gì.
//       Nay "500.000" là 500000 đồng, còn "1,5" bị báo rõ và không gửi đi.
//   [3] Nhân sự, tính công theo giờ: "7,5" tiếng là 450 phút (không thành 75
//       rồi bị từ chối); "1,5" phút xê dịch bị báo rõ, không thành 15 phút.
//   [4] Văn phòng mở Điểm danh thứ Bảy / Chủ nhật: không có "Cần gọi xác
//       nhận", có câu "không cần rà soát"; ngày thường đã qua giữ nguyên.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri,
  CHROMIUM, tatBannerMoiCai, batPhanHe, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('2611-o-so-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi', 'nhansu', 'diemdanh', 'xinphep']);
const HOM = HOM_NAY();
const ngayCach = (n) => new Date(Date.parse(`${HOM}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const thuCua = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
function ngayTruoc(thu, tu) {
  for (let n = tu; ; n++) if (thuCua(ngayCach(-n)) === thu) return ngayCach(-n);
}
const THU_BAY = ngayTruoc(6, 1);
const CHU_NHAT = ngayTruoc(0, 1);
const THU_HAI_CU = ngayTruoc(1, 35);   // ngoài 20 ngày học dữ liệu mẫu đã chấm

const csdl = (fn) => { const c = new Database(path.join(DIR, 'school.db')); try { return fn(c); } finally { c.close(); } };
const TEN_S3 = csdl(c => {
  c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s3', HOM);
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
             VALUES ('att_kp_s3', 's3', ?, 'absent_unexcused', NULL, NULL, '', 't1')`).run(HOM);
  c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s4', HOM);
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
             VALUES ('att_cm_s4', 's4', ?, 'present', '07:30', NULL, '', 't1')`).run(HOM);
  for (const d of [THU_BAY, CHU_NHAT, THU_HAI_CU]) c.prepare('DELETE FROM attendance WHERE date = ?').run(d);
  return c.prepare("SELECT name FROM students WHERE id = 's3'").get().name;
});
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkNS = taoQuanTri(DIR, 'Nhân Sự', 'nhansu1');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7411), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function doiMatKhau(u, mkTam) {
  const d = await login(u, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await doiMatKhau('hieutruong', mkQT);
const NS = await doiMatKhau('nhansu1', mkNS);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', d => { d.accept().catch(() => {}); });
let guiDi = [];
page.on('request', r => {
  if (r.method() !== 'GET') guiDi.push({ method: r.method(), url: r.url().replace(sv.BASE, ''), than: r.postData() || '' });
});
const daGui = (duong) => guiDi.filter(x => x.url === duong).map(x => { try { return JSON.parse(x.than); } catch { return {}; } });

async function dangNhap(u, p = '123456') {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
};
const nghi = (ms = 900) => page.waitForTimeout(ms);
const toastLoi = () => page.evaluate(() => [...document.querySelectorAll('#toast-zone .toast.error')].map(t => t.textContent));
const xoaToast = () => page.evaluate(() => document.querySelectorAll('#toast-zone .toast').forEach(t => t.remove()));
const CAM = 'rgb(194, 65, 12)';
const DO = 'rgb(231, 76, 60)';
const XANH = 'rgb(39, 174, 96)';
// Mỗi mục chạy riêng: một mục vấp (hộp đã đóng vì máy lỡ ghi) không chặn các mục sau.
async function muc(ten, fn) {
  console.log(`\n${ten}`);
  try { await fn(); } catch (e) { check(`${ten}: chạy hết mục`, false, e.message.split('\n')[0]); }
}

try {
  // =========================================================================
  await muc('[1] Trang chủ của cô — "Nghỉ không phép" màu cam', async () => {
    await dangNhap('giaovien');
    await moMan('#/dashboard');
    const mauCham = (ten) => page.evaluate((t) => {
      const chip = [...document.querySelectorAll('.be-chip')].find(c => (c.title || '').startsWith(t));
      return chip ? getComputedStyle(chip.querySelector('.be-dot')).backgroundColor : null;
    }, ten);
    check('chấm trên ảnh bé nghỉ không phép là cam', (await mauCham(TEN_S3)) === CAM, await mauCham(TEN_S3));
    const tenS4 = csdl(c => c.prepare("SELECT name FROM students WHERE id = 's4'").get().name);
    check('đối chứng — bé có mặt vẫn chấm xanh', (await mauCham(tenS4)) === XANH, await mauCham(tenS4));
    const chuThich = await page.evaluate(() => {
      const s = [...document.querySelectorAll('.hn-chu-thich span')].find(x => /Nghỉ không phép/.test(x.textContent));
      return s ? getComputedStyle(s.querySelector('i')).backgroundColor : null;
    });
    check('chú thích "Nghỉ không phép" cũng cam', chuThich === CAM, chuThich);

    await moMan('#/dashboard/nhom/c1');
    const o = await page.evaluate(() => {
      const p = [...document.querySelectorAll('.dem-pill')].find(x => /Nghỉ không phép/.test(x.textContent));
      const nhan = [...document.querySelectorAll('#view .badge')].find(x => x.textContent === 'Nghỉ không phép');
      return {
        pill: p ? getComputedStyle(p.querySelector('i')).backgroundColor : null,
        nhanLop: nhan ? nhan.className : null,
        nhanMau: nhan ? getComputedStyle(nhan).color : null,
      };
    });
    check('màn một nhóm: ô đếm "Nghỉ không phép" chấm cam', o.pill === CAM, o);
    check('màn một nhóm: nhãn của bé không còn lớp đỏ, chữ cam',
      !!o.nhanLop && !/\bred\b/.test(o.nhanLop) && o.nhanMau === CAM, o);
    check('không chỗ nào trên hai màn còn màu đỏ cũ', o.pill !== DO && chuThich !== DO);
  });

  // =========================================================================
  await muc('[2] Học phí — ô tiền gõ dấu chấm / dấu phẩy', async () => {
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/hocphi');

    // Một bé
    await page.evaluate(() => App.views.hocphi.moTao('s1'));
    await page.waitForSelector('#hp-luu');
    await page.fill('#hp-ky', 'Tháng 12/2026');
    await page.fill('#hp-nd', 'Thử ô tiền một bé');
    guiDi = [];
    await page.click('#hp-tien');
    await page.keyboard.type('1,5');
    await page.click('#hp-luu');
    await nghi();
    check('một bé: gõ "1,5" thì báo rõ', (await toastLoi()).some(t => /chữ số/.test(t)), await toastLoi());
    check('một bé: và không gửi gì lên máy chủ', daGui('/api/hocphi').length === 0, guiDi);
    check('một bé: nút Tạo bấm lại được',
      (await page.locator('#hp-luu').count()) === 1 && !(await page.locator('#hp-luu').isDisabled()));
    await xoaToast();
    await page.fill('#hp-tien', '');
    await page.click('#hp-tien');
    await page.keyboard.type('500.000');
    await page.click('#hp-luu');
    await nghi(1500);
    const mot = csdl(c => c.prepare("SELECT soTien FROM hocphi_khoan WHERE noiDung = 'Thử ô tiền một bé'").all());
    check('một bé: "500.000" ghi đúng 500000 đồng (không thành 500)',
      mot.length === 1 && mot[0].soTien === 500000, mot);

    // Cả nhóm
    await moMan('#/hocphi');
    await page.click('#hp-dot');
    await page.waitForSelector('#hpd-luu');
    await page.fill('#hpd-ky', 'Tháng 12/2026');
    await page.fill('#hpd-nd', 'Thử ô tiền cả nhóm');
    guiDi = [];
    await page.click('#hpd-tien');
    await page.keyboard.type('1,2');
    await page.click('#hpd-luu');
    await nghi();
    check('cả nhóm: gõ "1,2" thì báo rõ và không gửi',
      (await toastLoi()).some(t => /chữ số/.test(t)) && daGui('/api/hocphi/hang-loat').length === 0, { t: await toastLoi(), guiDi });
    await xoaToast();
    await page.fill('#hpd-tien', '');
    await page.click('#hpd-tien');
    await page.keyboard.type('1.200.000');
    await page.click('#hpd-luu');
    await nghi(1500);
    const nhom = csdl(c => c.prepare("SELECT DISTINCT soTien FROM hocphi_khoan WHERE noiDung = 'Thử ô tiền cả nhóm'").all());
    check('cả nhóm: "1.200.000" ghi đúng 1200000 đồng mỗi bé', nhom.length === 1 && nhom[0].soTien === 1200000, nhom);

    // Ưu đãi
    await moMan('#/hocphi');
    await page.click('#hp-uudai');
    await page.waitForSelector('#hpu-them');
    await page.click('#hpu-them');
    await page.waitForSelector('#hpu-luu');
    await page.fill('#hpu-ten', 'Thử ô ưu đãi');
    guiDi = [];
    await page.click('#hpu-muc');
    await page.keyboard.type('1,5');
    await page.click('#hpu-luu');
    await nghi();
    check('ưu đãi: gõ "1,5" thì báo rõ và không gửi',
      (await toastLoi()).some(t => /chữ số/.test(t)) && daGui('/api/hocphi/uu-dai').length === 0, { t: await toastLoi(), guiDi });
    await xoaToast();
    await page.fill('#hpu-muc', '');
    await page.click('#hpu-muc');
    await page.keyboard.type('200.000');
    await page.click('#hpu-luu');
    await nghi(1500);
    const ud = csdl(c => c.prepare("SELECT giaTri FROM hocphi_uudai WHERE ten = 'Thử ô ưu đãi'").all());
    check('ưu đãi: "200.000" ghi đúng 200000 đồng', ud.length === 1 && ud[0].giaTri === 200000, ud);

    // Biểu phí (lưu ưu đãi xong màn mở lại hộp danh sách ưu đãi — đóng đi)
    await page.evaluate(() => UI.closeModal());
    await moMan('#/hocphi');
    await page.click('#hp-bieuphi');
    await page.waitForSelector('#hpb-them');
    await page.click('#hpb-them');
    await page.waitForSelector('#hpb-luu');
    await page.fill('#hpb-ten', 'Thử ô biểu phí');
    await page.fill('[data-bpd-ten="0"]', 'Học phí tháng');
    guiDi = [];
    await page.click('[data-bpd-tien="0"]');
    await page.keyboard.type('2,5');
    await page.click('#hpb-luu');
    await nghi();
    check('biểu phí: gõ "2,5" thì báo rõ và không gửi',
      (await toastLoi()).some(t => /chữ số/.test(t)) && daGui('/api/hocphi/bieu-phi').length === 0, { t: await toastLoi(), guiDi });
    await xoaToast();
    await page.fill('[data-bpd-tien="0"]', '');
    await page.click('[data-bpd-tien="0"]');
    await page.keyboard.type('2.500.000');
    await page.click('#hpb-luu');
    await nghi(1500);
    const bp = (((await req('GET', '/api/hocphi/bieu-phi', { cookie: QT })).data || {}).bieuPhi || [])
      .find(x => x.ten === 'Thử ô biểu phí');
    check('biểu phí: "2.500.000" lưu đúng 2500000 đồng',
      !!bp && bp.dong.length === 1 && bp.dong[0].soTien === 2500000, bp && bp.dong);
  });

  // =========================================================================
  await muc('[3] Nhân sự — số tiếng đủ công gõ dấu phẩy', async () => {
    await dangNhap('nhansu1', 'quantri2026');
    await moMan('#/nhansu');
    await page.click('#ns-tab [data-tab="chamcong"]');
    await nghi(1200);
    await page.click('#ns-qt-bat');
    await page.waitForSelector('#qt-luu');
    await page.fill('#qt-gio', '');
    await page.click('#qt-gio');
    await page.keyboard.type('7,5');
    await page.fill('#qt-dudi', '');
    await page.click('#qt-dudi');
    await page.keyboard.type('1,5');
    guiDi = [];
    await page.click('#qt-luu');
    await nghi();
    check('gõ "1,5" phút xê dịch thì báo rõ', (await toastLoi()).some(t => /chữ số/.test(t)), await toastLoi());
    check('và không gửi gì lên máy chủ', daGui('/api/nhansu/quy-tac-cong').length === 0, guiDi);
    await xoaToast();
    await page.fill('#qt-dudi', '');
    await page.click('#qt-dudi');
    await page.keyboard.type('15');
    await page.click('#qt-luu');
    await nghi(1500);
    const q = (await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS })).data || {};
    check('"7,5" tiếng lưu thành 450 phút, xê dịch 15 phút',
      q.sapToi && q.sapToi.phutDuCong === 450 && q.sapToi.phutDuDi === 15, q.sapToi);
  });

  // =========================================================================
  await muc('[4] Văn phòng mở Điểm danh ngày không học', async () => {
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/attendance');
    for (const [ten, ngay] of [['thứ Bảy', THU_BAY], ['Chủ nhật', CHU_NHAT]]) {
      await page.evaluate((d) => App.views.attendance.setDate(d), ngay);
      await nghi(1300);
      const chu = await page.locator('#view').innerText();
      check(`${ten} (${ngay}): không có "Cần gọi xác nhận"`,
        (await page.locator('#att-can-goi').count()) === 0 && !/Cần gọi xác nhận/.test(chu), chu.slice(0, 400));
      check(`${ten}: thẻ nói không cần rà soát, không nói "Cả trường đã xong"`,
        (await page.locator('#att-ngay-khong-hoc').count()) === 1 && /không cần rà soát/.test(chu) && !/Cả trường đã xong/.test(chu),
        chu.slice(0, 400));
    }
    await page.evaluate((d) => App.views.attendance.setDate(d), THU_HAI_CU);
    await nghi(1300);
    check(`đối chứng — thứ Hai đã qua (${THU_HAI_CU}) vẫn có "Cần gọi xác nhận"`,
      (await page.locator('#att-can-goi').count()) === 1 && (await page.locator('#att-ngay-khong-hoc').count()) === 0);
  });

  check('không có lỗi JavaScript trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
