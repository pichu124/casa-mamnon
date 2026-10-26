// Bài canh GIAO DIỆN cho góp ý 20/10 ở màn soạn báo cáo tháng (Đ241b).
// Bấm trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-2010-bao-cao-thang-giao-dien.test.mjs
//
//   1. O1 — trên máy tính (≥ 900px) ô viết rộng hết cột, cao tối thiểu ~8
//      dòng; trên điện thoại giữ đúng kích thước cũ.
//   2. O3 — bấm "Mời chữ từ Kế hoạch của bé" khi kế hoạch chỉ có bài đã tích:
//      hộp mời hiện tên bài, bấm Chép thì chữ vào ô tổng hợp, CHƯA lưu gì.
//   3. O5 — màn soạn không còn ô "Cô ký tên"; bản gia đình đọc không in tên cô.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-bao-cao-thang-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph2010bcgd_qt');

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4959), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];
const guiDi = [];

async function moTrang(viewport, mobile) {
  const ctx = await tatBannerMoiCai(await browser.newContext(mobile
    ? { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  page.on('request', r => { if (r.method() !== 'GET') guiDi.push(r.url().replace(sv.BASE, '')); });
  return { ctx, page };
}
async function dangNhap(page, u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
async function moBan(page, banId) {
  await page.goto(`${sv.BASE}/#/baocaohoctap`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate((id) => { App.views.baocaohoctap._banId = id; App.route(); }, banId);
  await page.waitForSelector('#bc-tong', { timeout: 10000 });
}
const kichThuoc = (page) => page.evaluate(() => {
  const o = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const cot = document.querySelector('#bc-tong').closest('.card');
  const pad = parseFloat(getComputedStyle(cot).paddingLeft) + parseFloat(getComputedStyle(cot).paddingRight);
  return {
    cot: Math.round(cot.getBoundingClientRect().width - pad),
    dong: o(document.querySelector('textarea[data-chu]')),
    tong: o(document.getElementById('bc-tong')),
    lop: o(document.getElementById('bc-lop')),
    dongChu: parseFloat(getComputedStyle(document.querySelector('textarea[data-chu]')).lineHeight),
  };
});

let mayTinh;
let dienThoai;
try {
  const qtTam = await login('ph2010bcgd_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtTam.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ph2010bcgd_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;

  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'thang', ten: 'Báo cáo tháng thử giao diện', tuThang: 0, denThang: 72,
    dong: [{ nhom: 'I. LƯU Ý', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
  const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
    studentId: 's1', mauId: mau.data.mau.id, tuNgay: `${THANG}-01`, denNgay: HOM } });
  const banId = mo.data.ban.id;
  // Bản đã có chữ ký từ máy cũ — để soi rằng màn hình không còn in nó ra.
  await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: GV, body: { tongHop: '', coKy: 'Cô Lan Ký' } });

  const bai = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
  const thapHong = bai.find(b => b.ten === 'Tháp hồng');
  const lap = await req('PUT', '/api/kehoachbe', { cookie: GV, body: {
    classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [], baiHoc: [{ baiHocId: thapHong.id, nhan: 'on-tap' }] }] } });
  check('đối chứng — kế hoạch tháng của s1 chỉ có bài đã tích', lap.status === 200, lap.data);

  // =========================================================================
  console.log('\n[1] O1 — ô viết trên máy tính rộng và cao hơn, điện thoại giữ như cũ');
  mayTinh = await moTrang({ width: 1280, height: 900 }, false);
  await dangNhap(mayTinh.page, 'giaovien', '123456');
  await moBan(mayTinh.page, banId);
  const mt = await kichThuoc(mayTinh.page);
  check('máy tính: ô của từng dòng mẫu rộng hết cột', Math.abs(mt.dong.w - mt.cot) <= 2, mt);
  check('máy tính: ô của từng dòng mẫu cao tối thiểu ~8 dòng chữ', mt.dong.h >= 8 * mt.dongChu, mt);
  check('máy tính: ô tổng hợp và ô việc làm tiếp cũng cao ~8 dòng',
    mt.tong.h >= 8 * mt.dongChu && mt.lop.h >= 8 * mt.dongChu, mt);

  dienThoai = await moTrang({ width: 390, height: 844 }, true);
  await dangNhap(dienThoai.page, 'giaovien', '123456');
  await moBan(dienThoai.page, banId);
  const dt = await kichThuoc(dienThoai.page);
  // Cùng một trang, gỡ lớp mới đi thì kích thước phải y nguyên: điện thoại không đổi gì.
  const dtCu = await dienThoai.page.evaluate(() => {
    for (const t of document.querySelectorAll('textarea.bc-o-viet')) t.classList.remove('bc-o-viet');
    const r = (el) => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    return { dong: r(document.querySelector('textarea[data-chu]')), tong: r(document.getElementById('bc-tong')) };
  });
  check('điện thoại: ô viết giữ đúng kích thước cũ',
    JSON.stringify(dt.dong) === JSON.stringify(dtCu.dong) && JSON.stringify(dt.tong) === JSON.stringify(dtCu.tong), { dt, dtCu });
  check('đối chứng — máy tính thật sự cao hơn điện thoại', mt.dong.h > dt.dong.h, { mt: mt.dong, dt: dt.dong });

  // =========================================================================
  console.log('\n[2] O3 — mời chữ từ bài đã tích, chép vào ô, chưa lưu');
  {
    const page = mayTinh.page;
    guiDi.length = 0;
    await page.click('#bc-moi');
    await page.waitForSelector('#modal-overlay [data-chep]', { timeout: 5000 }).catch(() => {});
    const hop = await page.locator('#modal-overlay').innerText().catch(() => '');
    check('hộp mời chữ hiện bài đã tích kèm nhãn: Tháp hồng (ôn tập)', /Tháp hồng \(ôn tập\)/.test(hop), hop);
    await page.locator('#modal-overlay [data-chep]').first().click();
    await page.waitForTimeout(400);
    const o = await page.inputValue('#bc-tong');
    check('bấm Chép: chữ vào ô tổng hợp để cô sửa', /Tháp hồng \(ôn tập\)/.test(o), o);
    check('và CHƯA gửi gì lên máy chủ (chữ mời là nháp)', guiDi.length === 0, guiDi);
    const ban = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('bản báo cáo trên máy chủ vẫn trống ô tổng hợp', ban.tongHop === '', ban.tongHop);
  }

  // =========================================================================
  console.log('\n[3] O5 — không còn "Cô ký tên"');
  {
    const page = mayTinh.page;
    const man = await page.locator('#view').innerText();
    check('màn soạn không còn ô "Cô ký tên"', !/Cô ký tên/.test(man) && await page.locator('#bc-ky').count() === 0);
    await page.fill('#bc-tong', 'Tháng này con vui vẻ.');
    await page.click('#bc-luu');
    await page.waitForTimeout(800);
    const ban = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('Lưu nháp từ màn mới giữ nguyên chữ ký cũ trong dữ liệu', ban.tongHop === 'Tháng này con vui vẻ.' && ban.coKy === 'Cô Lan Ký', ban);
    const doc = await page.evaluate(async (id) => {
      const d = await API.get(`/api/baocaohoctap/ban/${encodeURIComponent(id)}`);
      return App.views.baocaohoctap.theTongHop(d.ban);
    }, banId);
    check('đối chứng — khối "Cô kể thêm" vẫn có chữ cô nhắn', /Tháng này con vui vẻ\./.test(doc), doc);
    check('khối "Cô kể thêm" gia đình đọc không in tên cô', !doc.includes('Cô Lan Ký'), doc);
  }

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  if (mayTinh) await mayTinh.ctx.close();
  if (dienThoai) await dienThoai.ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
