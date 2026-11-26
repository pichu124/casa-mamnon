// Bài canh GIAO DIỆN cho nhóm việc nhỏ theo góp ý của trường ngày 18/11
// (Đ260a). Bấm trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-1811-viec-nho-giao-dien.test.mjs
//
//   1. Trang chủ gia đình: không còn dòng "… và N mục khác" / "Thu gọn" — mọi
//      ô hiện ngay, nhóm "Hằng ngày" vẫn đứng đầu.
//   2. Không còn ô "Năm học trước" trên trang chủ gia đình; lối vào ở Cài đặt.
//   3. Lịch sinh hoạt: không còn thẻ "Ghi chú" (Nhóm / Một ngày ở nhóm / Cô
//      phụ trách).
//   4. Báo cáo học tập trên điện thoại 390px: ô viết rộng hết khung, đủ cao,
//      không tràn ngang trang.
//   5. Sức khỏe: không còn "Thị lực" trên màn, dữ liệu cũ vẫn ở máy chủ.
//   6–7. Kể cho gia đình khi để trống ô "Đồng hành cùng bé tại nhà" (máy chủ
//      trả 200); gia đình không thấy dòng ấy khi trống, thấy một dòng nhỏ khi
//      có.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-viec-nho-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'baocaohoctap']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph1811_qt');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5187), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];

async function moTrang(viewport = { width: 390, height: 844 }) {
  const mobile = viewport.width < 700;
  const ctx = await tatBannerMoiCai(await browser.newContext(mobile
    ? { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  return page;
}
async function dangNhap(page, u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
const moMan = async (page, hash, cho = 1000) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(cho);
};
const chu = (page, sel = '#view') => page.locator(sel).innerText().catch(() => '');
const tranNgang = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

try {
  const qtTam = await login('ph1811_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtTam.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ph1811_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm Chồi 2 (c1), có bé s1
  const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1

  // =========================================================================
  console.log('\n[1–2] Trang chủ gia đình: mọi ô hiện ngay, không còn ô "Năm học trước"');
  {
    const page = await moTrang({ width: 390, height: 844 });
    await dangNhap(page, 'phuhuynh', '123456');
    await page.waitForSelector('.ph-o .tile-grid', { timeout: 8000 });
    await page.waitForTimeout(1000);   // các ô có điều kiện hiện hỏi máy chủ xong
    const o = await page.evaluate(() => [...document.querySelectorAll('.ph-o .tile')]
      .filter(e => e.style.display !== 'none')
      .map(e => ({ key: e.dataset.tileKey, hien: e.offsetParent !== null && e.getBoundingClientRect().height > 0 })));
    check('đối chứng — trang chủ gia đình có nhiều hơn nhóm Hằng ngày (≥ 8 ô)', o.length >= 8, o.map(x => x.key));
    check('MỌI ô đều đang hiện, không phải bấm gì', o.length > 0 && o.every(x => x.hien), o.filter(x => !x.hien));
    check('không còn nút "… và N mục khác" / "Thu gọn"',
      (await page.locator('#ph-them, .ph-them').count()) === 0
      && !/mục khác|Thu gọn/.test(await chu(page)), (await chu(page)).slice(0, 400));
    check('nhóm "Hằng ngày" vẫn đứng đầu: tiêu đề có, ô Điểm danh là ô đầu',
      (await page.locator('.ph-nhom', { hasText: 'Hằng ngày' }).count()) === 1 && o[0] && o[0].key === 'diemdanh', o.map(x => x.key));

    const mods = await page.evaluate(() => (App.state.modules || []).filter(m => m.key === 'namhoccu'));
    check('đối chứng — phần "Năm học trước" vẫn BẬT với gia đình, chỉ mang cờ ẩn khỏi trang chủ',
      mods.length === 1 && mods[0].anKhoiTrangChu === true, mods);
    check('KHÔNG có ô "Năm học trước" trên trang chủ gia đình',
      (await page.locator('.tile[data-tile-key="namhoccu"]').count()) === 0
      && !/Năm học trước/.test(await chu(page)));

    await moMan(page, '#/settings');
    check('lối vào "Năm học trước" còn ở Cài đặt → Phần việc khác',
      (await page.locator('.card', { hasText: 'Phần việc khác' }).locator('.list-row', { hasText: 'Năm học trước' }).count()) === 1,
      (await chu(page)).slice(0, 600));
    const api = await req('GET', '/api/namhoccu', { cookie: PH });
    check('API "Năm học trước" vẫn trả lời gia đình như cũ', api.status !== 404 && api.status !== 403, api.status);
    await page.context().close();

    const hep = await moTrang({ width: 320, height: 640 });
    await dangNhap(hep, 'phuhuynh', '123456');
    await hep.waitForSelector('.ph-o .tile-grid', { timeout: 8000 });
    await hep.waitForTimeout(800);
    check('màn 320px: hiện hết ô mà không cuộn ngang', (await tranNgang(hep)) <= 0, await tranNgang(hep));
    await hep.context().close();
  }

  // =========================================================================
  console.log('\n[3] Lịch sinh hoạt: không còn thẻ "Ghi chú"');
  {
    const page = await moTrang({ width: 390, height: 844 });
    await dangNhap(page, 'phuhuynh', '123456');
    await moMan(page, '#/timetable/lich', 1500);
    const man = await chu(page);
    check('đối chứng — đang ở màn Lịch sinh hoạt có dải ngày', (await page.locator('#tkb-seg').count()) === 1, man.slice(0, 200));
    check('KHÔNG còn thẻ "Ghi chú" (Nhóm / Một ngày ở nhóm / Cô phụ trách)',
      (await page.locator('#view .card-title', { hasText: 'Ghi chú' }).count()) === 0
      && !/Một ngày ở nhóm|Từ lúc đón bé tới lúc trả bé|Cô phụ trách/.test(man), man.slice(-400));
    await page.context().close();

    const pCo = await moTrang({ width: 390, height: 844 });
    await dangNhap(pCo, 'giaovien', '123456');
    await moMan(pCo, '#/timetable/lich', 1500);
    check('màn của cô cũng không còn thẻ "Ghi chú"',
      (await pCo.locator('#tkb-seg').count()) === 1 && !/Một ngày ở nhóm/.test(await chu(pCo)));
    await pCo.context().close();
  }

  // =========================================================================
  console.log('\n[4] Báo cáo học tập trên điện thoại 390px: ô viết đủ rộng, đủ cao');
  {
    const THANG = HOM_NAY().slice(0, 7);
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'thang', ten: 'Báo cáo tháng thử ô viết', tuThang: 0, denThang: 72,
      dong: [{ nhom: 'I. LƯU Ý', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
    const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: mau.data?.mau?.id, tuNgay: `${THANG}-01`, denNgay: HOM_NAY() } });
    const banId = mo.data?.ban?.id;
    check('đối chứng — cô mở được một bản báo cáo', !!banId, mo.data);

    const page = await moTrang({ width: 390, height: 844 });
    await dangNhap(page, 'giaovien', '123456');
    await moMan(page, '#/baocaohoctap', 800);
    await page.evaluate((id) => { App.views.baocaohoctap._banId = id; App.route(); }, banId);
    await page.waitForSelector('#bc-tong', { timeout: 10000 });
    await page.waitForTimeout(400);
    const k = await page.evaluate(() => {
      const do_ = (el) => {
        const khung = el.closest('.card');
        const cs = getComputedStyle(khung);
        const trong = khung.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { w: Math.round(r.width), h: Math.round(r.height), khung: Math.round(trong),
          vien: parseFloat(s.borderTopWidth), dem: parseFloat(s.paddingLeft), dong: parseFloat(s.lineHeight) };
      };
      return {
        dong: do_(document.querySelector('textarea[data-chu]')),
        tong: do_(document.getElementById('bc-tong')),
        lop: do_(document.getElementById('bc-lop')),
        nha: do_(document.getElementById('bc-nha')),
      };
    });
    for (const [ten, o] of [['ô của dòng mẫu', k.dong], ['ô tổng hợp', k.tong], ['ô ở lớp', k.lop], ['ô ở nhà', k.nha]]) {
      check(`${ten}: rộng ≥ 90% khung chứa, cao ≥ 110px, có viền và đệm`,
        o.w >= 0.9 * o.khung && o.h >= 110 && o.vien >= 1 && o.dem >= 8, o);
    }
    check('ô tổng hợp cao ~6 dòng chữ', k.tong.h >= 6 * k.tong.dong, k.tong);
    check('không tràn ngang trang', (await tranNgang(page)) <= 0, await tranNgang(page));
    await page.context().close();
  }

  // =========================================================================
  console.log('\n[5] Sức khỏe: không còn "Thị lực" trên màn');
  {
    const page = await moTrang({ width: 390, height: 844 });
    await dangNhap(page, 'phuhuynh', '123456');
    await moMan(page, '#/health', 1500);
    const man = await chu(page);
    check('đối chứng — gia đình thấy thẻ "Chỉ số gần nhất"', /Chỉ số gần nhất/.test(man), man.slice(0, 300));
    check('gia đình: KHÔNG còn "Thị lực" trên màn', !/Thị lực/i.test(man), man.slice(0, 600));
    const o = await page.locator('.stat-row .stat-box').evaluateAll(els => els.map(e => {
      const r = e.getBoundingClientRect();
      return { nhan: e.querySelector('.stat-label').textContent, tren: Math.round(r.top), rong: Math.round(r.width) };
    }));
    check('thẻ chỉ số còn đúng Chiều cao / Cân nặng / BMI',
      JSON.stringify(o.map(x => x.nhan)) === JSON.stringify(['Chiều cao', 'Cân nặng', 'BMI']), o);
    check('ba ô cùng một hàng, rộng bằng nhau',
      o.length === 3 && new Set(o.map(x => x.tren)).size === 1 && Math.max(...o.map(x => x.rong)) - Math.min(...o.map(x => x.rong)) <= 1, o);
    await page.context().close();

    // Cô: chi tiết lần khám, hộp thêm và hộp sửa đều không còn ô thị lực.
    const ds = (await req('GET', '/api/health?studentId=s1', { cookie: GV })).data?.records || [];
    const kham = ds.find(r => r.type === 'checkup' && r.vision);
    check('đối chứng — dữ liệu mẫu có lần khám mang thị lực', !!kham, ds.map(r => [r.type, r.vision]));
    const pCo = await moTrang({ width: 390, height: 844 });
    await dangNhap(pCo, 'giaovien', '123456');
    await moMan(pCo, '#/health', 800);
    await pCo.evaluate(() => { App.views.health._beDangMo = 's1'; App.route(); });
    await pCo.waitForSelector('#btn-new-health', { timeout: 8000 });
    await pCo.waitForTimeout(500);
    check('cô: màn sức khỏe của bé không có "Thị lực"', !/Thị lực/i.test(await chu(pCo)));
    await pCo.evaluate((id) => App.views.health.showDetail(id), kham?.id);
    await pCo.waitForTimeout(300);
    const chiTiet = await chu(pCo, '#modal-overlay');
    check('chi tiết lần khám không có dòng "Thị lực"', /Chiều cao/.test(chiTiet) && !/Thị lực/i.test(chiTiet), chiTiet);
    await pCo.evaluate(() => UI.closeModal());
    await pCo.click('#btn-new-health');
    await pCo.waitForSelector('#ht-height', { timeout: 5000 });
    check('hộp thêm ghi nhận: không còn ô nhập thị lực',
      (await pCo.locator('#ht-vision').count()) === 0 && !/Thị lực/i.test(await chu(pCo, '#modal-overlay')));
    await pCo.evaluate(() => UI.closeModal());

    // Hộp sửa: lưu lại một lần khám cũ thì thị lực cũ trên máy chủ KHÔNG mất.
    const moi = await req('POST', '/api/health', { cookie: GV, body: {
      studentId: 's1', type: 'checkup', title: 'Cân đo giữa kỳ', detail: '', height: 104, weight: 17, vision: '10/10' } });
    check('đối chứng — máy chủ vẫn nhận cột thị lực', moi.status === 201 && moi.data?.vision === '10/10', moi.data);
    await pCo.evaluate(() => App.route());
    await pCo.waitForTimeout(800);
    await pCo.evaluate((id) => App.views.health.openSua(id), moi.data?.id);
    await pCo.waitForSelector('#ht-s-luu', { timeout: 5000 });
    check('hộp sửa: không còn ô thị lực', (await pCo.locator('#ht-s-vision').count()) === 0
      && !/Thị lực/i.test(await chu(pCo, '#modal-overlay')));
    await pCo.fill('#ht-s-title', 'Cân đo giữa kỳ (đã sửa)');
    await pCo.click('#ht-s-luu');
    await pCo.waitForTimeout(800);
    const sau = ((await req('GET', '/api/health?studentId=s1', { cookie: GV })).data?.records || []).find(r => r.id === moi.data?.id);
    check('sửa qua màn hình: tiêu đề đổi, thị lực cũ vẫn nguyên ở máy chủ',
      !!sau && sau.title === 'Cân đo giữa kỳ (đã sửa)' && sau.vision === '10/10', sau);
    await pCo.context().close();
  }

  // =========================================================================
  console.log('\n[6–7] Kể cho gia đình khi để trống "Đồng hành cùng bé tại nhà"');
  {
    const q1 = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé tự xếp giày lên kệ.' } });
    const q2 = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé tưới cây cùng bạn.' } });
    check('đối chứng — cô ghi được hai quan sát', q1.status === 201 && q2.status === 201, [q1.data, q2.data]);

    const page = await moTrang({ width: 390, height: 844 });
    await dangNhap(page, 'giaovien', '123456');
    await moMan(page, '#/hanhtrinh/chu-nhiem', 1000);
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    await page.locator(`#ht-than [data-cauchuyen="${q1.data?.id}"]`).evaluate(b => b.click());
    await page.waitForSelector('#ht-cn', { timeout: 5000 });
    const hop = await chu(page, '#modal-overlay');
    check('nhãn ô: "Đồng hành cùng bé tại nhà (không bắt buộc)"', /Đồng hành cùng bé tại nhà \(không bắt buộc\)/.test(hop), hop);
    check('gợi ý ngắn, giọng khuyến khích',
      /Một việc nhỏ 5–10 phút gia đình làm cùng con, nếu cô có gợi ý/.test(hop), hop);
    await page.fill('#ht-cc', 'Sáng nay con tự xếp đôi giày lên kệ, ngay ngắn từng đôi.');
    await page.fill('#ht-cn', '');
    const choTraLoi = page.waitForResponse(r => r.url().includes(`/api/hanhtrinh/${q1.data?.id}/cong-bo`), { timeout: 8000 })
      .catch(() => null);
    await page.click('#ht-cong-bo');
    const tl = await choTraLoi;
    check('để trống ô ấy vẫn kể được: máy chủ trả 200', !!tl && tl.status() === 200, tl && tl.status());
    await page.waitForTimeout(800);
    check('hộp đóng lại sau khi kể', (await page.locator('#modal-overlay #ht-cong-bo').count()) === 0);
    await page.context().close();

    const cb2 = await req('POST', `/api/hanhtrinh/${q2.data?.id}/cong-bo`, { cookie: GV, body: {
      cauChuyen: 'Con tưới cây cùng bạn, nhắc bạn tưới gốc.', cungConONha: 'Cuối tuần cho con tưới một chậu cây.' } });
    check('đối chứng — câu chuyện thứ hai có gợi ý ở nhà', cb2.status === 200, cb2.data);

    const ph = await moTrang({ width: 390, height: 844 });
    await dangNhap(ph, 'phuhuynh', '123456');
    await moMan(ph, '#/hanhtrinh', 1200);
    if (await ph.locator('#ht-ph-tabs [data-tab="chu-nhiem"]').count()) {
      await ph.click('#ht-ph-tabs [data-tab="chu-nhiem"]');
      await ph.waitForTimeout(800);
    }
    const the = async (re) => {
      const t = ph.locator('#view .card', { hasText: re });
      if (!(await t.count())) return null;
      return t.first().evaluate((el) => {
        const d = el.querySelector('.ht-dong-hanh');
        const s = d ? getComputedStyle(d) : null;
        return { chu: el.innerText, dong: d ? d.textContent.trim() : null,
          co: s ? parseFloat(s.fontSize) : null, hoa: s ? s.textTransform : null, dam: s ? Number(s.fontWeight) : null };
      });
    };
    const trong = await the(/tự xếp đôi giày/);
    check('gia đình đọc được câu chuyện cô để trống ô ở nhà', !!trong, (await chu(ph)).slice(0, 400));
    check('… và KHÔNG có dòng "Đồng hành cùng bé tại nhà" (không dòng trống)',
      !!trong && trong.dong === null && !/Đồng hành cùng bé|Cùng con ở nhà/i.test(trong.chu), trong);
    const co = await the(/tưới cây cùng bạn/);
    check('câu chuyện có gợi ý: hiện dòng nhỏ "Đồng hành cùng bé tại nhà" kèm lời cô',
      !!co && co.dong === 'Đồng hành cùng bé tại nhà' && /tưới một chậu cây/.test(co.chu), co);
    check('… dòng ấy chữ thường, cỡ ~13px, không viết hoa, không đậm',
      !!co && co.hoa === 'none' && co.co >= 12 && co.co <= 14 && co.dam < 600
      && !/ĐỒNG HÀNH|CÙNG CON Ở NHÀ/.test(co.chu), co);
    check('màn gia đình không còn nhãn "Cùng con ở nhà"', !/Cùng con ở nhà/i.test(await chu(ph)));
    await ph.context().close();
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
