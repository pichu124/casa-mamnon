// Góp ý của trường — Đ242D (D3): ĐIỂM DANH BẤM TÊN, CÓ MÀN XEM LẠI.
//
// Cần Playwright. Chạy bằng:
//   node test/phan-hoi-2010-diem-danh-bam-ten-giao-dien.test.mjs
//
// Trường nói: mỗi dòng bé có 5–6 nút, chụp xong là gửi ngay, nên dễ bấm nhầm.
// Thiết kế mới, đo trên điện thoại 390px:
//   - Bấm TÊN bé lần 1 → mở máy ảnh → màn "Xem lại" (ảnh vừa chụp, ảnh hồ sơ,
//     tên + nhóm, ô ghi chú gia đình đọc được, nút "Vào lớp", nút "Huỷ").
//     Chỉ bấm "Vào lớp" mới ghi; Huỷ thì không có dòng điểm danh nào.
//   - Bấm tên lần 2 → cùng kiểu màn, nói rõ RA VỀ, nút "Ra về"; mở màn ra
//     chưa ghi gì cả.
//   - Ghi chú vào/ra gia đình đọc được, hiện cạnh ảnh ở màn của gia đình.
//   - Việc khác của dòng (ghi tay có mặt / nghỉ, lưu ý nội bộ, gọi gia đình,
//     ghi về không ảnh, gỡ ảnh, gỡ giờ ra) gom vào MỘT nút "⋯" cuối dòng.
//   - App đời cũ không gửi ghi chú thì máy chủ chạy y như trước.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri,
  taoBoDem, CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-diem-danh-bam-ten');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
const HOM = HOM_NAY();

// Bắt đầu từ một nhóm CHƯA điểm danh hôm nay: dữ liệu mẫu chấm sẵn ngày học.
{
  const c = new Database(path.join(DIR, 'school.db'));
  const be = "(SELECT id FROM students WHERE classId = 'c1')";
  c.prepare(`DELETE FROM attendance WHERE date = ? AND studentId IN ${be}`).run(HOM);
  c.prepare(`DELETE FROM attendance_photo WHERE date = ? AND studentId IN ${be}`).run(HOM);
  c.prepare(`DELETE FROM attendance_anh_ve WHERE date = ? AND studentId IN ${be}`).run(HOM);
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7121), dir: DIR });
const goiApi = async (duong, body, cookie) => {
  const r = await fetch(sv.BASE + duong, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, await dnApi('htruong', mkTam));

const csdl = (fn) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return fn(c); } finally { c.close(); }
};
const dongHom = (id) => csdl(c => ({
  rec: c.prepare('SELECT * FROM attendance WHERE studentId = ? AND date = ?').get(id, HOM) || null,
  anh: c.prepare('SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?').get(id, HOM) || null,
  anhVe: c.prepare('SELECT file FROM attendance_anh_ve WHERE studentId = ? AND date = ?').get(id, HOM) || null,
}));
const ghiChuVe = (id) => csdl(c => {
  try {
    const r = c.prepare('SELECT ghiChu FROM attendance_ghi_chu_ve WHERE studentId = ? AND date = ?').get(id, HOM);
    return r ? r.ghiChu : null;
  } catch (_) { return null; }   // bảng chưa có
});

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG = `data:image/png;base64,${PNG_B64}`;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });
const guiDi = [];
page.on('request', r => { if (r.method() !== 'GET') guiDi.push(r.url().replace(sv.BASE, '')); });

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
const hop = () => page.locator('#modal-overlay').innerText().catch(() => '');
const coHop = async () => (await page.locator('#modal-overlay').count()) > 0;

// Bấm tên → hộp chọn tệp (máy ảnh) → chọn một ảnh → chờ màn xem lại.
async function bamTenVaChup(id) {
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    page.locator(`#att-dong-${id} .att-ten`).click(),
  ]);
  await fc.setFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
  await page.waitForSelector('#att-xl', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

const GHI_VAO = 'Con hơi ho nhẹ, cô đã cho uống nước ấm';
const GHI_RA = 'Bà ngoại đón, chiều nay con ngủ trưa ngon';

try {
  // =========================================================================
  console.log('\n[1] Dòng bé: bấm tên là việc chính, chỉ còn MỘT nút "⋯" cạnh tên');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/attendance');
    const soDong = await page.locator('[id^="att-dong-"]').count();
    check('đối chứng — màn có các dòng bé của nhóm', soDong >= 3, soDong);
    const nutMoiDong = await page.evaluate(() => [...document.querySelectorAll('[id^="att-dong-"]')]
      .map(d => d.querySelectorAll('button').length));
    check('mỗi dòng có tối đa 2 nút (tên bé + "⋯"), không còn 5–6 nút',
      nutMoiDong.length > 0 && nutMoiDong.every(n => n <= 2), nutMoiDong);
    check('dòng của bé có nút TÊN để bấm', await page.locator('#att-dong-s1 button.att-ten', { hasText: 'Nguyễn Bảo An' }).count() === 1);
    check('và một nút "⋯" cho việc khác', await page.locator('#att-dong-s1 button[data-viec-khac]').count() === 1);
    const chuDong = await page.locator('#att-dong-s1').innerText();
    check('dòng nói rõ bấm tên để làm gì', /Bấm tên để vào lớp/.test(chuDong), chuDong);
    check('không còn các nút chụp / ghi về / sửa / lưu ý phơi trên dòng',
      !/Chụp ảnh con tới lớp|Ghi con đã về|Chụp ảnh ra về|Lưu ý/.test(chuDong), chuDong);
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('không cuộn ngang trên khổ 390px', tran <= 1, tran);
    const nho = await page.evaluate(() => [...document.querySelectorAll('[id^="att-dong-"] button')]
      .map(b => b.getBoundingClientRect()).filter(r => r.width > 0 && (r.width < 32 || r.height < 32)).length);
    check('nút trên dòng không nhỏ hơn đầu ngón tay', nho === 0, nho);
  }

  // =========================================================================
  console.log('\n[2] Bấm tên lần 1 → màn xem lại đủ thứ; Huỷ thì không ghi gì');
  {
    guiDi.length = 0;
    await bamTenVaChup('s1');
    check('mở màn xem lại', await page.locator('#att-xl').count() === 1);
    const src = await page.locator('#att-xl-anh').getAttribute('src').catch(() => '');
    check('có ảnh lớn vừa chụp', /^data:image\//.test(src || ''), (src || '').slice(0, 30));
    const rong = await page.locator('#att-xl-anh').evaluate(el => el.getBoundingClientRect().width).catch(() => 0);
    check('ảnh vừa chụp hiện LỚN (gần hết bề ngang)', rong >= 250, rong);
    check('có ảnh hồ sơ của bé', await page.locator('#att-xl .att-xl-hoso .avatar, #att-xl .att-xl-hoso img').count() >= 1);
    const h = await hop();
    check('có tên bé và tên nhóm', /Nguyễn Bảo An/.test(h) && /Chồi 2/.test(h), h.slice(0, 200));
    check('nói rõ đây là VÀO LỚP', /VÀO LỚP/.test(h), h.slice(0, 200));
    check('có ô ghi chú', await page.locator('#att-xl-ghichu').count() === 1);
    check('dưới ô ghi rõ "Gia đình đọc được ghi chú này"', /Gia đình đọc được ghi chú này/.test(h), h);
    check('ô này KHÔNG phải ô lưu ý nội bộ', !/🔒|Lưu ý nội bộ/.test(h), h);
    check('nút xác nhận là "Vào lớp"', (await page.locator('#att-xl-ok').innerText().catch(() => '')).trim() === 'Vào lớp');
    check('có nút "Huỷ"', await page.locator('#att-xl-huy', { hasText: 'Huỷ' }).count() === 1);
    check('chưa bấm xác nhận thì CHƯA gửi gì lên máy chủ', !guiDi.some(u => /\/api\/attendance/.test(u)), guiDi);
    await page.locator('#att-xl-huy').click();
    await page.waitForTimeout(600);
    check('bấm Huỷ → màn xem lại đóng', !(await coHop()));
    const d = dongHom('s1');
    check('Huỷ → KHÔNG có dòng điểm danh nào', !d.rec, d.rec);
    check('Huỷ → không có ảnh nào được lưu', !d.anh, d.anh);
    check('Huỷ → không gọi đường ghi nào', !guiDi.some(u => /\/api\/attendance/.test(u)), guiDi);
  }

  // =========================================================================
  console.log('\n[3] Bấm "Vào lớp" → có dòng giờ vào + ảnh + ghi chú');
  {
    await bamTenVaChup('s1');
    await page.fill('#att-xl-ghichu', GHI_VAO);
    await page.locator('#att-xl-ok').click();
    await page.waitForTimeout(1500);
    const d = dongHom('s1');
    check('có dòng có mặt kèm giờ vào', !!d.rec && d.rec.status === 'present' && /^\d{2}:\d{2}/.test(d.rec.checkIn || ''), d.rec);
    check('có ảnh tới lớp', !!d.anh && !!d.anh.file, d.anh);
    check('ghi chú lưu đúng chữ cô gõ', !!d.rec && d.rec.note === GHI_VAO, d.rec && d.rec.note);
    check('màn xem lại đã đóng', !(await coHop()));
    const chuDong = await page.locator('#att-dong-s1').innerText();
    check('dòng của bé hiện giờ vào và ghi chú', /Vào lớp \d{2}:\d{2}/.test(chuDong) && chuDong.includes(GHI_VAO), chuDong);
    check('dòng nay nói bấm tên là ra về', /Bấm tên để ra về/.test(chuDong), chuDong);
  }

  // =========================================================================
  console.log('\n[4] Bấm tên lần 2 → màn RA VỀ, mở ra chưa ghi gì; Huỷ rồi xác nhận');
  {
    guiDi.length = 0;
    await bamTenVaChup('s1');
    const h = await hop();
    check('màn nói rõ đây là RA VỀ', /RA VỀ/.test(h), h.slice(0, 200));
    check('nút xác nhận là "Ra về"', (await page.locator('#att-xl-ok').innerText().catch(() => '')).trim() === 'Ra về');
    check('có ô ghi chú gia đình đọc được', await page.locator('#att-xl-ghichu').count() === 1 && /Gia đình đọc được ghi chú này/.test(h));
    check('ảnh đối chiếu là ảnh tới lớp buổi sáng', /^\/api\/attendance\/anh\//.test(
      await page.locator('#att-xl .att-xl-hoso img').getAttribute('src').catch(() => '') || ''));
    check('mở màn ra về CHƯA ghi giờ ra', !dongHom('s1').rec.checkOut, dongHom('s1').rec);
    check('và chưa gọi đường ghi ra về', !guiDi.some(u => /ra-ve/.test(u)), guiDi);
    await page.locator('#att-xl-huy').click();
    await page.waitForTimeout(500);
    check('Huỷ màn ra về → vẫn chưa có giờ ra', !dongHom('s1').rec.checkOut && !dongHom('s1').anhVe);

    await bamTenVaChup('s1');
    await page.fill('#att-xl-ghichu', GHI_RA);
    await page.locator('#att-xl-ok').click();
    await page.waitForTimeout(1500);
    const d = dongHom('s1');
    check('bấm "Ra về" → có giờ ra', !!d.rec.checkOut, d.rec);
    check('…có ảnh lúc ra về', !!d.anhVe && !!d.anhVe.file, d.anhVe);
    check('…và ghi chú ra về lưu đúng chữ', ghiChuVe('s1') === GHI_RA, ghiChuVe('s1'));
    check('ghi chú vào lớp buổi sáng vẫn nguyên', d.rec.note === GHI_VAO, d.rec.note);
    const chuDong = await page.locator('#att-dong-s1').innerText();
    check('dòng hiện giờ ra và ghi chú ra về', /Ra về \d{2}:\d{2}/.test(chuDong) && chuDong.includes(GHI_RA), chuDong);

    // Lần 3: bé đã về — bấm tên không mở máy ảnh, không ghi đè.
    let moMay = false;
    const nghe = () => { moMay = true; };
    page.on('filechooser', nghe);
    guiDi.length = 0;
    await page.locator('#att-dong-s1 .att-ten').click();
    await page.waitForTimeout(800);
    page.off('filechooser', nghe);
    check('bấm tên lần 3 (đã về) không mở máy ảnh', !moMay);
    check('…và không gửi gì', !guiDi.some(u => /\/api\/attendance/.test(u)), guiDi);
  }

  // =========================================================================
  console.log('\n[5] Gia đình thấy ghi chú cạnh ảnh vào lớp / ra về');
  {
    const ckPH = await dnApi('phuhuynh', '123456');
    const kho = await goiApi(`/api/attendance/anh?studentId=s1&month=${HOM.slice(0, 7)}`, null, ckPH);
    check('đường ảnh của gia đình trả ghi chú ra về', (kho.data.ghiChuVe || []).some(x => x.date === HOM && x.ghiChu === GHI_RA), kho.data.ghiChuVe);

    await dangNhap('phuhuynh', '123456');
    await moMan('#/attendance');
    await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click().catch(() => {});
    await page.waitForTimeout(1000);
    const dong = page.locator(`#view .list-row[onclick*="'${HOM}'"]`);
    const chuDong = await dong.innerText().catch(() => '');
    check('dòng hôm nay trong "Bản ghi gần nhất" có cả hai ghi chú', chuDong.includes(GHI_VAO) && chuDong.includes(GHI_RA), chuDong);
    await page.evaluate((d) => App.views.attendance.showDay(d), HOM);
    await page.waitForTimeout(600);
    const tam = await page.evaluate(() => [...document.querySelectorAll('#modal-overlay .att-anh-ngay')]
      .map(el => ({ anh: !!el.querySelector('img'), chu: el.innerText })));
    check('hộp ngày có hai tấm ảnh (vào lớp, ra về)', tam.length === 2 && tam.every(t => t.anh), tam);
    check('ghi chú vào lớp nằm ngay dưới ảnh tới lớp', !!tam[0] && tam[0].chu.includes(GHI_VAO), tam[0]);
    check('ghi chú ra về nằm ngay dưới ảnh ra về', !!tam[1] && tam[1].chu.includes(GHI_RA), tam[1]);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[6] Nút "⋯": đủ việc khác của dòng; gỡ ảnh và gỡ giờ ra vẫn chạy');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/attendance');
    await page.locator('#att-dong-s1 button[data-viec-khac]').click();
    await page.waitForTimeout(500);
    const h = await hop();
    check('hộp "⋯" có ghi tay có mặt / nghỉ có phép / nghỉ không phép',
      /Có mặt/.test(h) && /Nghỉ CP/.test(h) && /Nghỉ KP/.test(h), h.slice(0, 300));
    check('…có ô lưu ý nội bộ và gọi gia đình', /Lưu ý nội bộ/.test(h) && /Gọi gia đình/.test(h), h);
    check('…có gỡ ảnh tới lớp và gỡ giờ ra về', /Gỡ ảnh tới lớp/.test(h) && /Gỡ giờ ra về/.test(h), h);
    await page.locator('#modal-overlay button', { hasText: 'Gỡ ảnh tới lớp' }).click();
    await page.waitForTimeout(1200);
    let d = dongHom('s1');
    check('gỡ ảnh: ảnh tới lớp đã gỡ', !d.anh, d.anh);
    check('gỡ ảnh: dòng điểm danh vẫn còn', !!d.rec && d.rec.status === 'present', d.rec);

    await page.locator('#att-dong-s1 button[data-viec-khac]').click();
    await page.waitForTimeout(500);
    await page.locator('#modal-overlay button', { hasText: 'Gỡ giờ ra về' }).click();
    await page.waitForTimeout(1200);
    d = dongHom('s1');
    check('gỡ giờ ra: giờ ra và ảnh ra về đã gỡ', !!d.rec && !d.rec.checkOut && !(d.anhVe && d.anhVe.file), d);
    check('gỡ giờ ra: ghi chú ra về cũng bỏ theo', !ghiChuVe('s1'), ghiChuVe('s1'));

    // Bé chưa có dòng nào: hộp "⋯" vẫn có ghi tay, và chọn Nghỉ CP thì ghi.
    await page.locator('#att-dong-s4 button[data-viec-khac]').click();
    await page.waitForTimeout(500);
    const h4 = await hop();
    check('bé chưa có dòng: không mời gỡ thứ chưa có', !/Gỡ ảnh tới lớp|Gỡ giờ ra về/.test(h4), h4);
    await page.locator('#modal-overlay button', { hasText: 'Nghỉ CP' }).click();
    await page.waitForTimeout(1200);
    check('chọn Nghỉ CP trong hộp "⋯" → ghi nghỉ có phép', (dongHom('s4').rec || {}).status === 'absent_excused', dongHom('s4').rec);
  }

  // =========================================================================
  console.log('\n[7] App đời cũ không gửi ghi chú → máy chủ y như trước');
  {
    const ckGV = await dnApi('giaovien', '123456');
    const vao = await goiApi('/api/attendance/mark', { studentId: 's3', date: HOM, status: 'present', note: 'ghi chú cũ' }, ckGV);
    check('(đối chứng) ghi tay có mặt kèm ghi chú cũ', vao.status === 200);
    const anh = await goiApi('/api/attendance/anh', { studentId: 's3', date: HOM, anh: PNG }, ckGV);
    check('gắn ảnh KHÔNG kèm ghi chú vẫn 201', anh.status === 201, anh.data);
    check('…và ghi chú cũ của dòng giữ nguyên', dongHom('s3').rec.note === 'ghi chú cũ', dongHom('s3').rec);
    const ra = await goiApi('/api/attendance/ra-ve', { studentId: 's3', date: HOM, gio: '16:30' }, ckGV);
    check('ghi ra về KHÔNG kèm ghi chú vẫn 200', ra.status === 200 && ra.data.gio === '16:30', ra.data);
    check('…và không sinh ghi chú ra về nào', !ghiChuVe('s3'), ghiChuVe('s3'));
    const ckPH = await dnApi('phuhuynh', '123456');
    const la = await goiApi('/api/attendance/ra-ve', { studentId: 's3', date: HOM, ghiChu: 'x' }, ckPH);
    check('gia đình KHÔNG ghi được ghi chú ra về', la.status === 403, la.status);
  }

  // =========================================================================
  console.log('\n[8] Văn phòng: sổ cả cơ sở dùng cùng kiểu dòng');
  {
    await dangNhap('htruong', 'quantri2026');
    await moMan('#/attendance');
    await page.evaluate(() => { for (const d of document.querySelectorAll('#view details')) d.open = true; });
    const nutMoiDong = await page.evaluate(() => [...document.querySelectorAll('[id^="att-dong-"]')]
      .map(d => d.querySelectorAll('button').length));
    check('văn phòng: mỗi dòng bé tối đa 2 nút', nutMoiDong.length > 0 && nutMoiDong.every(n => n <= 2), nutMoiDong);
    check('văn phòng: dòng của bé có nút tên', await page.locator('#att-dong-s1 button.att-ten').count() === 1);
  }

  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Đ242D — điểm danh bấm tên, có màn xem lại');
