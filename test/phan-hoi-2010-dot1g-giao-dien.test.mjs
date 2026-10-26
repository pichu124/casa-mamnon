// Góp ý 20/10 — đơn vị Đ241g, trên trình duyệt thật: Hồ sơ bé, Sức khỏe,
// Nhật ký ngày, Xuất báo cáo.
//
// Chạy bằng:  node test/phan-hoi-2010-dot1g-giao-dien.test.mjs
//
//   C1. Hồ sơ bé và phiếu Sửa hồ sơ không còn ô Nhóm máu; lưu hồ sơ không xoá
//       nhóm máu đã có trong dữ liệu.
//   H1. Màn Sức khỏe của GIA ĐÌNH không còn danh sách khám định kỳ / tiêm
//       chủng; vẫn có "Chỉ số gần nhất", "Các lần cân đo" và dòng sự cố y tế
//       (chuông "cô ghi một sự cố y tế" dẫn về đây). Màn của cô giữ nguyên.
//   J1. Màn cô ghi bữa: tên món nằm ngay trên ô nhận xét của TỪNG bé; bữa chưa
//       có thực đơn thì nói rõ "Chưa có thực đơn bữa này — văn phòng nhập ở
//       Thực đơn".
//   J2. Tab Vệ sinh không còn ghi thay bỉm; ngày cũ đã có giờ thay bỉm vẫn hiện
//       cho cô và gia đình; ngày không có bỉm thì gia đình không thấy dòng
//       "Thay bỉm · cô chưa ghi".
//   K2. Xuất báo cáo: chọn một bé theo bậc Cơ sở → Nhóm lớp → Bé, chỉ trong
//       phạm vi tài khoản; tài khoản một cơ sở thì không có ô cơ sở.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe, taoQuanTri, khoaVaoCoSo, datChucVu, HOM_NAY as homNayVN,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-dot1g-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky', 'xuatbaocao', 'kehoachbe', 'baocaohoctap']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkQL = taoQuanTri(DIR, 'Quản lý CS1', 'qlcs1');
khoaVaoCoSo(DIR, 'qlcs1', 'cs1');
datChucVu(DIR, 'qlcs1', 'quanly-coso');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5472), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const docDb = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
for (const [u, mk] of [['hieutruong', mkHT], ['qlcs1', mkQL]]) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
}

const HOM_NAY = homNayVN();
const HOM_QUA = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
{
  const QT = (await login('hieutruong', 'quantri2026')).cookie;
  const GV4 = (await login('giaovien4', '123456')).cookie;
  // Thực đơn hôm nay chỉ có Bữa sáng và Bữa trưa — Bữa phụ sáng chưa nhập.
  const td = await req('PUT', `/api/menu/${HOM_NAY}`, { cookie: QT, body: { meals: [
    { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: ['Bánh bao xá xíu'] },
    { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cơm', 'Cá kho'] },
  ] } });
  if (td.status !== 200) throw new Error(`Không soạn được thực đơn: ${td.status}`);
  // Hôm qua: cô đã ghi giờ thay bỉm cho s9 (trước khi trường bỏ phần bỉm) và gửi.
  const bim = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV4, body: {
    classId: 'c4', ngay: HOM_QUA, studentIds: ['s9'], luc: '09:15', loai: 'thay-bim' } });
  if (bim.status !== 200 || bim.data.daGhi !== 1) throw new Error(`Không ghi được giờ thay bỉm cũ: ${JSON.stringify(bim.data)}`);
  // Hôm nay: chỉ đi vệ sinh, không có bỉm.
  const vs = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV4, body: {
    classId: 'c4', ngay: HOM_NAY, studentIds: ['s9'], luc: '10:00', loai: 'di-ve-sinh' } });
  if (vs.status !== 200 || vs.data.daGhi !== 1) throw new Error(`Không ghi được giờ vệ sinh: ${JSON.stringify(vs.data)}`);
  for (const ngay of [HOM_QUA, HOM_NAY]) {
    const g = await req('POST', '/api/nhatky/gui', { cookie: GV4, body: { classId: 'c4', ngay, phan: 'vesinh', studentIds: ['s9'] } });
    if (g.status !== 200 || g.data.daGui !== 1) throw new Error(`Không gửi được phần vệ sinh ngày ${ngay}: ${JSON.stringify(g.data)}`);
  }
  // Một nhóm ban giám hiệu tạo mà chưa gắn cơ sở (đường tạo nhóm cho phép).
  const nk = await req('POST', '/api/admin/classes', { cookie: QT, body: { name: 'Nhóm thử chưa gắn cơ sở' } });
  if (nk.status !== 201) throw new Error(`Không tạo được nhóm chưa gắn cơ sở: ${JSON.stringify(nk.data)}`);
  // Thêm một lần cân đo cho s1 để màn gia đình có thẻ "Các lần cân đo".
  const cd = await req('POST', '/api/health', { cookie: QT, body: {
    studentId: 's1', type: 'checkup', title: 'Cân đo tháng này', height: 106, weight: 18, date: HOM_NAY } });
  if (cd.status !== 201) throw new Error(`Không ghi được cân đo: ${JSON.stringify(cd.data)}`);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });

async function dangNhap(u, p) {
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
  await page.waitForTimeout(900);
};
const chu = () => page.locator('#view').innerText();
const theBe = (id) => page.locator('#view .card').filter({ has: page.locator(`[data-be="${id}"]`) }).first();

try {
  // =========================================================================
  console.log('\n[C1] Hồ sơ bé và phiếu Sửa hồ sơ: không còn Nhóm máu');
  await dangNhap('hieutruong', 'quantri2026');
  {
    await moMan('#/student/s1');
    const hs = await chu();
    check('hồ sơ bé mở được, vẫn có Dân tộc', /Nguyễn Bảo An/.test(hs) && /Dân tộc/.test(hs), hs.slice(0, 300));
    check('hồ sơ bé KHÔNG còn dòng Nhóm máu', !/Nhóm máu/.test(hs), hs.slice(0, 600));

    await moMan('#/admin');
    await page.locator('.list-row', { hasText: 'Chồi 2' }).first().locator('button', { hasText: 'Xem' }).click();
    await page.waitForTimeout(900);
    await page.locator('.modal .list-row', { hasText: 'Nguyễn Bảo An' }).first().locator('button', { hasText: 'Sửa' }).click();
    await page.waitForSelector('#ad-hs-ten', { timeout: 5000 });
    const phieu = await page.locator('.modal').innerText();
    check('phiếu Sửa hồ sơ vẫn có ô Dân tộc', await page.locator('#ad-hs-dt').count() === 1);
    check('phiếu Sửa hồ sơ KHÔNG còn ô Nhóm máu',
      await page.locator('#ad-hs-nm').count() === 0 && !/Nhóm máu/.test(phieu), phieu.slice(0, 400));
    await page.fill('#ad-hs-dc', '7 Ngõ Thử Nhóm Máu');
    await page.locator('button', { hasText: 'Lưu thay đổi' }).click();
    await page.waitForTimeout(1500);
    const be = docDb("SELECT address, bloodType FROM students WHERE id = 's1'")[0];
    check('bấm Lưu thì địa chỉ mới được ghi', be.address === '7 Ngõ Thử Nhóm Máu', be.address);
    check('NHÓM MÁU ĐÃ CÓ CÒN NGUYÊN trong dữ liệu', be.bloodType === 'O', be.bloodType);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[K2] Xuất báo cáo: chọn bé theo Cơ sở → Nhóm lớp → Bé');
  {
    await moMan('#/xuatbaocao');
    const X = '#xb-ke-hoach';
    check('có thẻ Kế hoạch của bé', await page.locator(X).count() === 1);
    await page.selectOption(`${X}-pham`, 'be');
    await page.waitForTimeout(200);
    check('không còn hộp danh sách dài 5 dòng', (await page.locator(`${X}-ai`).getAttribute('size')) === null);
    const coSo = await page.locator(`${X}-be-coso option`).allInnerTexts();
    check('ô Cơ sở có đủ hai cơ sở của trường', coSo.includes('Cơ sở 1') && coSo.includes('Cơ sở 2'), coSo);
    await page.selectOption(`${X}-be-coso`, 'cs1');
    const nhom1 = await page.locator(`${X}-be-nhom option`).allInnerTexts();
    check('chọn Cơ sở 1: ô Nhóm lớp chỉ có nhóm của Cơ sở 1',
      nhom1.includes('Nhà trẻ 1') && nhom1.includes('Chồi 2') && !nhom1.includes('Mầm 1'), nhom1);
    await page.selectOption(`${X}-be-nhom`, 'c4');
    const be4 = await page.locator(`${X}-ai option`).evaluateAll(os => os.map(o => o.value).filter(Boolean).sort());
    check('chọn Nhà trẻ 1: ô Bé chỉ có ba bé của nhóm', JSON.stringify(be4) === '["s10","s11","s9"]', be4);
    await page.selectOption(`${X}-ai`, 's10');
    const [yc] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/api/xuatbaocao/kehoach-be'), { timeout: 5000 }),
      page.click(`${X}-tai`),
    ]);
    const q = new URL(yc.url()).searchParams;
    check('bấm Tải Excel là xin đúng bé đã chọn', q.get('pham') === 'be' && q.get('studentId') === 's10', yc.url());
    await page.waitForTimeout(800);

    await page.selectOption(`${X}-be-coso`, 'cs2');
    const nhom2 = await page.locator(`${X}-be-nhom option`).allInnerTexts();
    check('đổi sang Cơ sở 2: ô Nhóm lớp đổi theo', JSON.stringify(nhom2) === '["Mầm 1"]', nhom2);
    const be2 = await page.locator(`${X}-ai option`).evaluateAll(os => os.map(o => o.value).filter(Boolean));
    check('nhóm chưa có bé thì ô Bé không có bé nào để chọn', be2.length === 0, be2);
    check('ô Bé nói rõ nhóm chưa có bé', /chưa có bé/i.test(await page.locator(`${X}-ai`).innerText()));

    // Nhóm chưa gắn cơ sở không thuộc ô cơ sở nào, nên phải có một lựa chọn
    // riêng — thiếu nó thì bé của nhóm ấy không chọn được ở "Một bé".
    const coSoDu = await page.locator(`${X}-be-coso option`).allInnerTexts();
    check('ô Cơ sở có lựa chọn "Nhóm chưa gắn cơ sở"', coSoDu.includes('Nhóm chưa gắn cơ sở'), coSoDu);
    await page.selectOption(`${X}-be-coso`, { label: 'Nhóm chưa gắn cơ sở' });
    const nhomLe = await page.locator(`${X}-be-nhom option`).allInnerTexts();
    check('chọn nó: ô Nhóm lớp có đúng nhóm chưa gắn cơ sở', JSON.stringify(nhomLe) === '["Nhóm thử chưa gắn cơ sở"]', nhomLe);

    // Báo cáo tháng dùng đúng bộ ba ô ấy.
    await page.selectOption('#xb-bao-cao-pham', 'be');
    check('Báo cáo tháng cũng chọn theo Cơ sở → Nhóm lớp → Bé',
      await page.locator('#xb-bao-cao-be-coso').isVisible() && await page.locator('#xb-bao-cao-be-nhom').isVisible()
      && await page.locator('#xb-bao-cao-ai').isVisible());
  }

  await dangNhap('qlcs1', 'quantri2026');
  {
    await moMan('#/xuatbaocao');
    const X = '#xb-ho-so';
    await page.selectOption(`${X}-pham`, 'be');
    await page.waitForTimeout(200);
    check('tài khoản một cơ sở: không có ô Cơ sở', await page.locator(`${X}-be-coso`).count() === 0);
    const nhom = await page.locator(`${X}-be-nhom option`).allInnerTexts();
    check('và ô Nhóm lớp chỉ có nhóm của cơ sở mình', nhom.length > 0 && !nhom.includes('Mầm 1'), nhom);
    check('ô Bé đã có bé của nhóm đầu để chọn',
      (await page.locator(`${X}-ai option`).evaluateAll(os => os.map(o => o.value).filter(Boolean))).length > 0);
  }

  // =========================================================================
  console.log('\n[H1] Sức khỏe: gia đình không còn danh sách khám định kỳ / tiêm chủng');
  await dangNhap('phuhuynh', '123456');
  {
    await page.evaluate(() => { App.state.currentStudentId = 's1'; });
    await moMan('#/health');
    const sk = await chu();
    check('vẫn có Chỉ số gần nhất', /Chỉ số gần nhất/.test(sk), sk.slice(0, 300));
    check('vẫn có Các lần cân đo', /Các lần cân đo/.test(sk), sk.slice(0, 600));
    check('KHÔNG còn dòng Khám định kỳ', !/Khám định kỳ/.test(sk), sk);
    check('KHÔNG còn dòng Tiêm chủng', !/Tiêm chủng/.test(sk) && !/Tiêm nhắc vắc-xin/.test(sk), sk);
    check('dòng Sự cố y tế VẪN CÒN (chuông y tế dẫn về đây)',
      /Trầy nhẹ đầu gối/.test(sk) && /Sự cố y tế/.test(sk), sk);
    check('không hiện "chưa có ghi nhận y tế nào" khi đã có chỉ số và sự cố', !/Chưa có ghi nhận y tế nào/.test(sk));
    await page.locator('.list-row.clickable', { hasText: 'Trầy nhẹ đầu gối' }).first().click();
    await page.waitForTimeout(500);
    check('bấm dòng sự cố vẫn mở được chi tiết', /Chi tiết ghi nhận y tế/.test(await page.locator('.modal').innerText()));
    await page.evaluate(() => UI.closeModal());
  }

  await dangNhap('giaovien', '123456');
  {
    await moMan('#/health');
    await page.locator('[data-mo-be="s1"]').click();
    await page.waitForTimeout(1200);
    const sk = await chu();
    check('màn của cô GIỮ NGUYÊN: vẫn có Khám định kỳ, Tiêm chủng và Sự cố y tế',
      /Khám định kỳ/.test(sk) && /Tiêm chủng/.test(sk) && /Sự cố y tế/.test(sk), sk.slice(0, 600));
  }

  // =========================================================================
  console.log('\n[J1] Màn cô ghi bữa: món của bữa ngay trên ô nhận xét của từng bé');
  await dangNhap('giaovien4', '123456');
  {
    await moMan('#/nhatky');
    await page.click('.seg [data-buoc="bua:breakfast"]');
    await page.waitForTimeout(800);
    for (const id of ['s9', 's10']) {
      const t = await theBe(id).innerText();
      check(`thẻ bé ${id}: có tên món Bữa sáng ngay trên ô nhận xét`, /Bữa sáng:\s*Bánh bao xá xíu/.test(t), t);
    }
    await page.click('.seg [data-buoc="bua:lunch"]');
    await page.waitForTimeout(800);
    check('đổi sang Bữa trưa thì thẻ bé đổi món theo', /Bữa trưa:\s*Cơm, Cá kho/.test(await theBe('s9').innerText()),
      await theBe('s9').innerText());
    await page.click('.seg [data-buoc="bua:snack_sang"]');
    await page.waitForTimeout(800);
    const v = await chu();
    check('bữa chưa có thực đơn: nói rõ "Chưa có thực đơn bữa này — văn phòng nhập ở Thực đơn"',
      v.includes('Chưa có thực đơn bữa này — văn phòng nhập ở Thực đơn'), v.slice(0, 500));
    check('và thẻ bé không bịa món', !/Bữa phụ sáng:/.test(await theBe('s9').innerText()), await theBe('s9').innerText());
  }

  // =========================================================================
  console.log('\n[J2] Tab Vệ sinh: không còn ghi thay bỉm; giờ thay bỉm cũ vẫn hiện');
  {
    await page.click('.nk-phan [data-phan="vesinh"]');
    await page.waitForTimeout(800);
    check('không còn lựa chọn Thay bỉm khi ghi', await page.locator('#nk-vs-loai option[value="thay-bim"]').count() === 0);
    check('thẻ đầu tab không còn nói tới thay bỉm', !/bỉm/i.test(await page.locator('#nk-vs-the').innerText()),
      await page.locator('#nk-vs-the').innerText());
    check('tab vẫn tên Vệ sinh', /^Vệ sinh/.test((await page.locator('.nk-phan [data-phan="vesinh"]').innerText()).trim()));
    await page.check('.nk-chon[data-be="s10"]');
    await page.fill('#nk-vs-gio', '10:20');
    await page.click('#nk-vs-ghi');
    await page.waitForTimeout(1500);
    check('vẫn ghi được giờ đi vệ sinh', /10:20\s*Đi vệ sinh/.test(await theBe('s10').innerText()), await theBe('s10').innerText());
    const moc = docDb("SELECT loai FROM nhatky_vesinh WHERE studentId = 's10' AND ngay = ?", HOM_NAY);
    check('mốc vừa ghi là đi vệ sinh', moc.length === 1 && moc[0].loai === 'di-ve-sinh', moc);

    await page.fill('#nk-ngay', HOM_QUA);
    await page.waitForTimeout(1200);
    if (await page.locator('.nk-phan [data-phan="vesinh"].active').count() === 0) {
      await page.click('.nk-phan [data-phan="vesinh"]');
      await page.waitForTimeout(800);
    }
    check('ngày cũ: cô vẫn thấy mốc 09:15 thay bỉm đã ghi', /09:15\s*Thay bỉm/.test(await theBe('s9').innerText()),
      await theBe('s9').innerText());
  }

  await dangNhap('ph.trang', '123456');   // mẹ s9
  {
    await moMan('#/nhatky');
    const nk = await chu();
    check('gia đình: ngày cũ vẫn đọc được giờ thay bỉm', /Thay bỉm[\s\S]{0,40}09:15/.test(nk), nk.slice(0, 800));
    check('gia đình: ngày không có bỉm không hiện dòng "Thay bỉm · cô chưa ghi"',
      (nk.match(/Thay bỉm/g) || []).length === 1, nk.slice(0, 800));
    check('gia đình: hôm nay vẫn đọc được giờ đi vệ sinh', /10:00/.test(nk), nk.slice(0, 800));
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
