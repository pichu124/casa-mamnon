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
    // Giờ ra 23:59 chứ không phải một giờ chiều cố định: giờ vào của bé là lúc
    // bài này chạy, và từ Đ253 máy chủ từ chối giờ ra sớm hơn giờ vào — "16:30"
    // làm bài này đỏ mỗi lần chạy sau 16h30.
    const ra = await goiApi('/api/attendance/ra-ve', { studentId: 's3', date: HOM, gio: '23:59' }, ckGV);
    check('ghi ra về KHÔNG kèm ghi chú vẫn 200', ra.status === 200 && ra.data.gio === '23:59', ra.data);
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

  // =========================================================================
  // Đ258-T — màn điểm danh theo ngày dựng lại theo bản vẽ đã duyệt (14/11).
  //
  // Sổ lúc này: s1 có mặt, s3 có mặt và đã về, s4 nghỉ có phép, s5 và s6 chưa
  // có dòng nào.
  //
  // Ngữ cảnh riêng, chặn service worker để `page.route` thấy được yêu cầu. Bảng
  // rà soát chỉ có danh sách sau mốc giờ (máy chủ ép rỗng trước đó): dựng sẵn
  // "đã qua 8h30, 2 bé cần gọi" trên chính câu trả lời thật của máy chủ, để bài
  // không đỏ/xanh theo giờ chạy — và để đo rằng giờ trên màn lấy từ dữ liệu.
  {
    const ctx2 = await tatBannerMoiCai(await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      serviceWorkers: 'block',
    }));
    const p = await ctx2.newPage();
    p.on('pageerror', e => loiJs.push(e.message));
    await p.route('**/api/attendance/ra-soat**', async (route) => {
      const r = await route.fetch();
      const d = await r.json();
      await route.fulfill({
        response: r,
        json: {
          ...d,
          quaGio: true, gioRaSoat: '08:30', gioRaSoatChu: '8h30',
          danhSach: [
            { studentId: 's5', hoTen: 'Bé Thử Một', classId: 'c1', avatar: '' },
            { studentId: 's6', hoTen: 'Bé Thử Hai', classId: 'c1', avatar: '' },
          ],
        },
      });
    });
    const vao = async (u, mk) => {
      await p.goto(sv.BASE, { waitUntil: 'networkidle' });
      await p.evaluate(() => { try { App.logout(); } catch (_) {} });
      await p.goto(sv.BASE, { waitUntil: 'networkidle' });
      await p.waitForSelector('#lg-user', { timeout: 10000 });
      await p.fill('#lg-user', u);
      await p.fill('#lg-pass', mk);
      await p.click('button[type=submit]');
      await p.waitForSelector('.tile-grid', { timeout: 10000 });
      await p.goto(`${sv.BASE}/#/attendance`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
    };
    // Đọc không chờ: phần tử chưa có thì trả rỗng, để phép kiểm báo đỏ ngay.
    const chu = (sel) => p.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    }, sel);
    const dem = (sel) => p.locator(sel).count();
    const so = async (sel) => { const t = await chu(sel); return t === '' ? NaN : Number(t); };
    const kieu = (sel, thuoc) => p.evaluate(([s, t]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el)[t] : '';
    }, [sel, thuoc]);
    const hinh = (sel) => p.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);
    const du44 = (h) => !!h && h.w >= 44 && h.h >= 44;
    // Đỏ, cam và vàng đều có kênh đỏ trội hẳn hai kênh kia; xám thì không.
    const trungTinh = (mau) => {
      const m = (String(mau).match(/[\d.]+/g) || []).map(Number);
      return m.length >= 3 && !(m[0] > m[1] + 25 && m[0] > m[2] + 25);
    };
    const bam = (sel) => p.locator(sel).first().click({ timeout: 3000 }).catch(() => {});
    const ngayViet = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const CHU_HOM_NAY = `Hôm nay · ${THU[new Date(`${HOM}T00:00:00Z`).getUTCDay()]} ${HOM.slice(8, 10)}/${HOM.slice(5, 7)}`;
    const HOM_QUA = new Date(Date.parse(`${HOM}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const oNgayKhac = () => p.evaluate(() => {
      const l = document.getElementById('att-ngay-khac');
      if (!l) return null;
      window.scrollTo(0, 0);
      const o = l.querySelectorAll('input[type=date]');
      const r = l.getBoundingClientRect();
      return {
        the: l.tagName, chu: l.innerText.replace(/\s+/g, ' ').trim(), soO: o.length, max: o[0] ? o[0].max : '',
        w: Math.round(r.width), h: Math.round(r.height),
        chamTrungO: !!o[0] && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === o[0],
        doTrong: o[0] ? getComputedStyle(o[0]).opacity : '',
      };
    });

    // -----------------------------------------------------------------------
    console.log('\n[9] Đ258-T1: phần đầu màu tím có nút quay lại');
    await vao('giaovien', '123456');
    const soDong = await dem('[id^="att-dong-"]');
    check('đối chứng — nhóm Chồi 2 có 5 bé trên màn', soDong === 5, soDong);
    check('có nút "Quay lại" trong phần đầu, đủ lớn để bấm',
      await dem('#view .dd-dau button.back-btn[aria-label="Quay lại"]') === 1 && du44(await hinh('#view .dd-dau button.back-btn')),
      await hinh('#view .dd-dau button.back-btn'));
    check('tiêu đề là "Điểm danh"', await chu('#view .dd-dau h1') === 'Điểm danh', await chu('#view .dd-dau h1'));
    check('dòng phụ ghi tên nhóm và số bé', await chu('#view .dd-dau-phu') === `Nhóm Chồi 2 · ${soDong} bé`, await chu('#view .dd-dau-phu'));
    {
      const nen = await kieu('#view .dd-dau', 'backgroundImage');
      check('nền phần đầu là dải tím của bản vẽ (#4f46e5 → #7c3aed)',
        /rgb\(79, 70, 229\)/.test(nen) && /rgb\(124, 58, 237\)/.test(nen), nen);
    }

    // -----------------------------------------------------------------------
    console.log('\n[10] Đ258-T3: ô đếm Đã tới lớp · Nghỉ có phép · Chưa điểm danh');
    {
      const nhan = await p.evaluate(() => [...document.querySelectorAll('#att-o-so .dd-o span')].map(e => e.innerText.trim()));
      check('ba ô, đúng thứ tự của bản vẽ', JSON.stringify(nhan) === JSON.stringify(['Đã tới lớp', 'Nghỉ có phép', 'Chưa điểm danh']), nhan);
      const [toi, phep, chua] = [await so('#att-so-toi'), await so('#att-so-phep'), await so('#att-so-chua')];
      check('số trên từng ô khớp sổ: 2 bé đã tới, 1 nghỉ có phép, 2 chưa điểm danh', toi === 2 && phep === 1 && chua === 2, { toi, phep, chua });
      check('ba ô cộng lại đúng bằng số bé của nhóm', toi + phep + chua === soDong, { toi, phep, chua, soDong });
      check('không còn ô "Đã điểm danh" cũ', await dem('#att-so-da') === 0 && !/Đã điểm danh/.test(await chu('#view')));
      check('chưa bé nào nghỉ không phép → KHÔNG có ô thứ tư',
        await dem('#att-o-so') === 1 && await dem('#att-so-kp') === 0 && !/Nghỉ không phép/.test(await chu('#att-o-so')), await chu('#att-o-so'));
      check('QUY TẮC 2: ô "Chưa điểm danh" màu trung tính dù còn bé chưa điểm danh — không đỏ, không cam',
        chua > 0 && trungTinh(await kieu('#att-so-chua', 'color')) && trungTinh(await kieu('#att-o-so .dd-o:nth-child(3)', 'backgroundColor')),
        [await kieu('#att-so-chua', 'color'), await kieu('#att-o-so .dd-o:nth-child(3)', 'backgroundColor')]);
    }

    // -----------------------------------------------------------------------
    console.log('\n[11] Đ258-T5: mỗi bé một thẻ, nhãn trạng thái bằng chữ, nút "Vào lớp" cho bé chưa điểm danh');
    {
      const bang = await p.evaluate(() => {
        const v = App.views.attendance;
        if (typeof v.trangThaiDong !== 'function') return null;
        const don = { fromDate: '2026-01-05', toDate: '2026-01-05' };
        return [[null, null], [null, don], [{ status: 'present' }, null], [{ status: 'present', checkOut: '16:30' }, null],
          [{ status: 'late' }, null], [{ status: 'absent_excused' }, null], [{ status: 'absent_unexcused' }, null]]
          .map(([ghi, d]) => v.trangThaiDong(ghi, d).chu);
      });
      check('bảng trạng thái: mỗi trạng thái một nhãn bằng chữ, viết đủ không viết tắt',
        JSON.stringify(bang) === JSON.stringify(['Chưa có ảnh đến lớp', 'Nghỉ có phép theo đơn', 'Có mặt', 'Đã về',
          'Đến muộn', 'Nghỉ có phép', 'Nghỉ không phép']), bang);
      check('bé có mặt: nhãn "Có mặt"', await chu('#att-dong-s1 .dd-nhan') === 'Có mặt', await chu('#att-dong-s1'));
      check('bé đã về: nhãn "Đã về", dòng vẫn ghi giờ ra', await chu('#att-dong-s3 .dd-nhan') === 'Đã về'
        && /Ra về 23:59/.test(await chu('#att-dong-s3')), await chu('#att-dong-s3'));
      check('bé nghỉ có phép: nhãn viết đủ "Nghỉ có phép", không còn "Nghỉ CP" trên dòng',
        await chu('#att-dong-s4 .dd-nhan') === 'Nghỉ có phép' && !/Nghỉ CP/.test(await chu('#att-dong-s4')), await chu('#att-dong-s4'));
      const dongChua = await chu('#att-dong-s5');
      check('bé chưa điểm danh: chữ "Chưa có ảnh đến lớp" và câu "Bấm tên để vào lớp"',
        await chu('#att-dong-s5 .dd-chua') === 'Chưa có ảnh đến lớp' && /Bấm tên để vào lớp/.test(dongChua), dongChua);
      const vien = await p.evaluate(() => {
        const e = document.querySelector('#att-dong-s5 .dd-anh');
        if (!e) return null;
        const c = getComputedStyle(e);
        return { net: c.borderTopStyle, mau: c.borderTopColor };
      });
      check('QUY TẮC 2: bé chưa điểm danh — viền đứt nét màu trung tính, chữ trung tính',
        !!vien && vien.net === 'dashed' && trungTinh(vien.mau) && trungTinh(await kieu('#att-dong-s5 .dd-chua', 'color')),
        [vien, await kieu('#att-dong-s5 .dd-chua', 'color')]);
      check('bé đã có dòng thì viền liền', await kieu('#att-dong-s1 .dd-anh', 'borderTopStyle') === 'solid'
        && await kieu('#att-dong-s4 .dd-anh', 'borderTopStyle') === 'solid');
      check('nút "Vào lớp" nằm TRONG nút tên của bé chưa điểm danh',
        await chu('#att-dong-s5 button.att-ten .dd-vao-lop') === 'Vào lớp' && await dem('#att-dong-s6 button.att-ten .dd-vao-lop') === 1);
      check('bé đã có dòng thì không có nút "Vào lớp"',
        await dem('#att-dong-s1 .dd-vao-lop') + await dem('#att-dong-s3 .dd-vao-lop') + await dem('#att-dong-s4 .dd-vao-lop') === 0);
      check('nút ⋯ đủ lớn để bấm (≥ 44px)', du44(await hinh('#att-dong-s5 button[data-viec-khac]')), await hinh('#att-dong-s5 button[data-viec-khac]'));

      const [fc] = await Promise.all([
        p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
        bam('#att-dong-s5 .att-ten .dd-vao-lop'),
      ]);
      if (fc) {
        await fc.setFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
        await p.waitForSelector('#att-xl', { timeout: 5000 }).catch(() => {});
      }
      check('bấm "Vào lớp" → mở máy ảnh rồi màn Xem lại như bấm tên', !!fc && await chu('#att-xl-ok') === 'Vào lớp', await chu('#modal-overlay'));
      await bam('#att-xl-huy');
      await p.waitForTimeout(500);
      check('…Huỷ thì bé vẫn chưa có dòng nào', !dongHom('s5').rec, dongHom('s5').rec);
    }

    // -----------------------------------------------------------------------
    console.log('\n[12] Đ258-T4: khối "Cần văn phòng gọi xác nhận" của cô thu thành một dòng');
    {
      const khoi = await p.evaluate(() => {
        const e = document.getElementById('att-co-can-goi');
        return e ? { the: e.tagName, mo: e.open } : null;
      });
      check('là một khối <details>, mặc định GẬP', !!khoi && khoi.the === 'DETAILS' && khoi.mo === false, khoi);
      const tomTat = await chu('#att-co-can-goi > summary');
      check('dòng tóm tắt ghi số bé và giờ rà soát lấy từ dữ liệu (8h30, không ghi cứng 9 giờ)',
        /2 bé chưa có điểm danh sau 8h30/.test(tomTat) && !/9 ?(giờ|h)/.test(tomTat), tomTat);
      check('giữ chữ app đang dùng "Cần văn phòng gọi xác nhận", không chép câu của bản vẽ',
        /Cần văn phòng gọi xác nhận/.test(tomTat) && !/Văn phòng sẽ gọi gia đình xác nhận/.test(await chu('#view')), tomTat);
      check('dòng tóm tắt đủ cao để bấm', ((await hinh('#att-co-can-goi > summary')) || {}).h >= 44, await hinh('#att-co-can-goi > summary'));
      const nutGoi = p.locator('#att-co-can-goi [data-goi-be]');
      check('lúc gập, danh sách và nút Gọi chưa hiện', await nutGoi.count() === 2 && !(await nutGoi.first().isVisible()), await nutGoi.count());
      await bam('#att-co-can-goi > summary');
      await p.waitForTimeout(300);
      const than = await chu('#att-co-can-goi');
      check('bấm dòng tóm tắt → mở ĐÚNG nội dung cũ: lời giải thích, tên bé, nút Gọi, nút chốt sổ',
        await nutGoi.first().isVisible().catch(() => false) && /gọi một cuộc cho chắc/.test(than) && /Bé Thử Một/.test(than)
          && await dem('#att-co-can-goi #att-chot-vang') === 1, than.slice(0, 300));
      await nutGoi.first().click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(1000);
      check('nút Gọi vẫn mở hộp "Gọi xác nhận"', /Gọi xác nhận/.test(await chu('#modal-overlay')), await chu('#modal-overlay'));
      await p.evaluate(() => UI.closeModal());
    }

    // -----------------------------------------------------------------------
    console.log('\n[13] Đ258-T3: ô thứ tư "Nghỉ không phép" chỉ hiện khi có, và ô đếm cập nhật tại chỗ');
    {
      await p.evaluate(() => { document.getElementById('view').dataset.moc = 'con-nguyen'; });
      await bam('#att-dong-s6 button[data-viec-khac]');
      await bam('#att-sua-absent_unexcused');
      await p.waitForTimeout(1200);
      check('đối chứng — sổ ghi s6 nghỉ không phép', (dongHom('s6').rec || {}).status === 'absent_unexcused', dongHom('s6').rec);
      check('ghi một bé nghỉ không phép → hiện ô thứ tư "Nghỉ không phép" = 1',
        await so('#att-so-kp') === 1 && /Nghỉ không phép/.test(await chu('#att-o-so .dd-o:nth-child(4)')), await chu('#att-o-so'));
      check('…ô "Chưa điểm danh" giảm còn 1, trang không vẽ lại toàn bộ',
        await so('#att-so-chua') === 1 && await p.evaluate(() => document.getElementById('view').dataset.moc) === 'con-nguyen', await chu('#att-o-so'));
      check('…dòng của bé mang nhãn viết đủ "Nghỉ không phép", không còn nút "Vào lớp"',
        await chu('#att-dong-s6 .dd-nhan') === 'Nghỉ không phép' && await dem('#att-dong-s6 .dd-vao-lop') === 0, await chu('#att-dong-s6'));
      await bam('#att-dong-s6 button[data-viec-khac]');
      await bam('#att-sua-present');
      await p.waitForTimeout(1200);
      check('sửa lại thành có mặt → ô thứ tư biến mất, "Đã tới lớp" lên 3',
        await dem('#att-o-so') === 1 && await dem('#att-so-kp') === 0 && await so('#att-so-toi') === 3, await chu('#att-o-so'));
    }

    // -----------------------------------------------------------------------
    console.log('\n[14] Đ258-T2: hai nút "Hôm nay · <thứ dd/mm>" và "Ngày khác"');
    {
      check('nút "Hôm nay" ghi thứ và ngày/tháng của hôm nay, đang được chọn',
        await chu('#att-hom-nay') === CHU_HOM_NAY && await kieu('#att-hom-nay', 'backgroundColor') === 'rgb(255, 255, 255)'
          && await p.evaluate(() => (document.getElementById('att-hom-nay') || {}).ariaPressed) === 'true', await chu('#att-hom-nay'));
      const nk = await oNgayKhac();
      check('"Ngày khác" là <label> chứa ĐÚNG MỘT ô ngày, trần là hôm nay',
        !!nk && nk.the === 'LABEL' && nk.chu === 'Ngày khác' && nk.soO === 1 && nk.max === HOM, nk);
      check('ô ngày phủ trong suốt lên nút: chạm vào nút là chạm vào ô ngày',
        !!nk && nk.chamTrungO && nk.doTrong === '0' && du44(nk), nk);
      check('cả màn vẫn chỉ MỘT ô ngày', await dem('#view input[type=date]') === 1, await dem('#view input[type=date]'));
      check('dòng ngày tiếng Việt vẫn hiện, kèm "· hôm nay"', (await chu('#view .dd-dau')).includes(`${ngayViet(HOM)} · hôm nay`), await chu('#view .dd-dau'));

      await p.fill('#att-ngay-khac input[type=date]', HOM_QUA, { timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(1200);
      check('chọn ngày khác → nhãn nói rõ ngày ấy kiểu dd/mm/yyyy', await chu('#att-ngay-khac') === ngayViet(HOM_QUA), await chu('#att-ngay-khac'));
      check('…nút "Hôm nay" vẫn ghi ngày hôm nay nhưng thôi được chọn',
        await chu('#att-hom-nay') === CHU_HOM_NAY
          && await p.evaluate(() => (document.getElementById('att-hom-nay') || {}).ariaPressed) === 'false', await chu('#att-hom-nay'));
      const manCu = await chu('#view');
      check('…ngày đã qua vẫn khoá như cũ: thẻ "Ngày này đã khoá", đủ dòng bé, không còn nút tên để chấm',
        (await p.evaluate(() => App.views.attendance.date)) === HOM_QUA && /Ngày này đã khoá/.test(manCu)
          && await dem('[id^="att-dong-"]') === soDong && await dem('[id^="att-dong-"] button.att-ten') === 0
          && !/Cả nhóm có mặt/.test(manCu), manCu.slice(0, 300));
      check('…dòng ngày tiếng Việt đổi theo ngày đang xem, bỏ chữ "hôm nay"',
        (await chu('#view .dd-dau')).includes(ngayViet(HOM_QUA)) && !/· hôm nay/.test(manCu), await chu('#view .dd-dau'));
      await bam('#att-hom-nay');
      await p.waitForTimeout(1200);
      check('bấm "Hôm nay" → quay về hôm nay, chấm lại được',
        (await p.evaluate(() => App.views.attendance.date)) === HOM && await chu('#att-ngay-khac') === 'Ngày khác'
          && await dem('[id^="att-dong-"] button.att-ten') === soDong, await chu('#view .dd-dau'));
    }

    // -----------------------------------------------------------------------
    console.log('\n[15] Đ258-T: khổ 320px, nút quay lại, và màn của văn phòng');
    {
      await p.setViewportSize({ width: 320, height: 700 });
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
      const hep = await p.evaluate(() => {
        const cac = [...document.querySelectorAll('#att-hom-nay, #att-ngay-khac, #att-o-so .dd-o, .dd-nhan, .dd-vao-lop, [data-viec-khac]')]
          .map(e => e.getBoundingClientRect());
        return {
          tran: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          so: cac.length, lot: cac.filter(r => r.width <= 0 || r.left < 0 || r.right > window.innerWidth + 1).length,
        };
      });
      check('khổ 320px: không cuộn ngang; nút ngày, ô đếm, nhãn và nút ⋯ đều nằm trọn trong màn',
        hep.tran <= 1 && hep.so >= 15 && hep.lot === 0, hep);
      await p.setViewportSize({ width: 390, height: 844 });

      await p.goto(`${sv.BASE}/#/`, { waitUntil: 'networkidle' });
      await p.goto(`${sv.BASE}/#/attendance`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
      await bam('#view .dd-dau button.back-btn');
      await p.waitForTimeout(900);
      check('nút "Quay lại" đưa về màn trước', (await p.evaluate(() => location.hash)) !== '#/attendance' && await dem('.tile-grid') === 1,
        await p.evaluate(() => location.hash));

      await vao('htruong', 'quantri2026');
      check('văn phòng: cùng phần đầu tím — nút quay lại, "Điểm danh", hai nút ngày',
        await dem('#view .dd-dau button.back-btn[aria-label="Quay lại"]') === 1 && await chu('#view .dd-dau h1') === 'Điểm danh'
          && await chu('#att-hom-nay') === CHU_HOM_NAY, await chu('#view .dd-dau'));
      const nkVP = await oNgayKhac();
      check('văn phòng: vẫn chỉ MỘT ô ngày (trần hôm nay) nằm trong nút "Ngày khác", không ô chọn nhóm',
        await dem('#view input[type=date]') === 1 && !!nkVP && nkVP.soO === 1 && nkVP.max === HOM && nkVP.chamTrungO
          && await dem('#view select') === 0, nkVP);
      check('văn phòng: dòng ngày tiếng Việt vẫn hiện, kèm "· hôm nay"',
        (await chu('#view .dd-dau')).includes(`${ngayViet(HOM)} · hôm nay`), await chu('#view .dd-dau'));
      const khoiVP = await p.evaluate(() => {
        const e = document.getElementById('att-can-goi');
        return e ? { the: e.tagName, mo: e.open, tieuDe: e.querySelector('summary').innerText.trim() } : null;
      });
      check('văn phòng: khối "Cần gọi xác nhận" GIỮ NGUYÊN là #att-can-goi gập, không dùng khối của cô',
        !!khoiVP && khoiVP.the === 'DETAILS' && khoiVP.mo === false && /Cần gọi xác nhận: 2 bé/.test(khoiVP.tieuDe)
          && await dem('#att-co-can-goi') === 0, khoiVP);
      check('văn phòng: không có ô đếm của cô, các phần cũ còn đủ (mốc rà soát, sổ theo nhóm)',
        await dem('#view .dd-dau') === 1 && await dem('#att-o-so') === 0 && await dem('#dd-moc-ra-soat') === 1
          && await dem('#view details.card') >= 1, await chu('#view'));
    }
    await ctx2.close();
  }

  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Đ242D — điểm danh bấm tên, có màn xem lại');
