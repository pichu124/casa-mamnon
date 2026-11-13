// Cô sửa giờ con tới lớp ngay trên màn Điểm danh (Đ254) — đo trên trình duyệt.
//
// Cần Playwright. Chạy bằng:  node test/sua-gio-vao-giao-dien.test.mjs
//
// Luật của máy chủ nằm ở `test/sua-gio-vao.test.mjs`. Bài này canh phần cô
// nhìn thấy: nút trong hộp "⋯", hộp sửa giờ, dòng của bé vẽ lại đúng giờ
// mới, và khi máy chủ từ chối thì hộp CÒN MỞ để cô sửa tiếp.
//
// Ca chính là ca chủ dự án nêu 13/11: cô chấm bù cuối ngày nên giờ vào bị
// đóng muộn, giờ về thật của bé bị từ chối. Giờ trong bảng đặt thẳng (23:59 /
// 00:00) để bài cho cùng kết quả ở mọi giờ chạy.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('sua-gio-vao-giao-dien');
sinhDuLieu(DIR);
const HOM = HOM_NAY();
const CSDL = path.join(DIR, 'school.db');

function csdl(viec) {
  const c = new Database(CSDL);
  try { return viec(c); } finally { c.close(); }
}
// s1: có mặt, giờ vào bị đóng muộn (23:59). s3: đang ghi nghỉ. Mọi bé khác
// của nhóm c1: chưa có dòng nào hôm nay.
csdl((c) => {
  const be = "(SELECT id FROM students WHERE classId = 'c1')";
  c.prepare(`DELETE FROM attendance WHERE date = ? AND studentId IN ${be}`).run(HOM);
  c.prepare(`DELETE FROM attendance_photo WHERE date = ? AND studentId IN ${be}`).run(HOM);
  c.prepare(`DELETE FROM attendance_anh_ve WHERE date = ? AND studentId IN ${be}`).run(HOM);
  const them = c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                          VALUES (?, ?, ?, ?, ?, NULL, '', 't1')`);
  them.run('att_gd_s1', 's1', HOM, 'present', '23:59');
  them.run('att_gd_s3', 's3', HOM, 'absent_excused', null);
});
const dongCua = (id) => csdl(c =>
  c.prepare('SELECT status, checkIn, checkOut FROM attendance WHERE studentId = ? AND date = ?').get(id, HOM));

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7361), dir: DIR });
const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const guiDi = [];
page.on('request', r => { if (r.method() !== 'GET') guiDi.push(r.url().replace(sv.BASE, '')); });

await page.goto(sv.BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('#lg-user', { timeout: 10000 });
await page.fill('#lg-user', 'giaovien');
await page.fill('#lg-pass', '123456');
await page.click('button[type=submit]');
await page.waitForSelector('.tile-grid', { timeout: 10000 });
await page.goto(`${sv.BASE}/#/attendance`, { waitUntil: 'networkidle' });
await page.waitForSelector('#att-dong-s1', { timeout: 10000 });

const hop = () => page.locator('#modal-overlay').innerText().catch(() => '');
const coHop = async () => (await page.locator('#modal-overlay').count()) > 0;
const dongChu = (id) => page.locator(`#att-dong-${id}`).innerText();
const moBaCham = async (id) => {
  await page.locator(`#att-dong-${id} button`, { hasText: '⋯' }).click();
  await page.waitForSelector('#modal-overlay', { timeout: 5000 });
  await page.waitForTimeout(200);
};
const dongHop = async () => {
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(200);
};
const cauBao = async () => {
  await page.waitForTimeout(500);
  return page.locator('.toast').allInnerTexts().then(a => a.join(' | ')).catch(() => '');
};

// ===========================================================================
console.log('\n[1] Nút nằm trong hộp "⋯", chỉ hiện cho bé đang ghi có mặt');
{
  check('đối chứng — dòng của s1 đang ghi "Vào lớp 23:59"', /23:59/.test(await dongChu('s1')), await dongChu('s1'));
  await moBaCham('s1');
  check('bé có mặt: hộp "⋯" có nút "Sửa giờ tới lớp"',
    (await page.locator('#att-vk-gio-vao').count()) === 1
    && /Sửa giờ tới lớp/.test(await page.locator('#att-vk-gio-vao').innerText()), await hop());
  await dongHop();

  await moBaCham('s3');
  check('bé đang ghi nghỉ: KHÔNG có nút sửa giờ tới lớp', (await page.locator('#att-vk-gio-vao').count()) === 0, await hop());
  await dongHop();

  await moBaCham('s4');
  check('bé chưa có dòng nào: KHÔNG có nút sửa giờ tới lớp', (await page.locator('#att-vk-gio-vao').count()) === 0, await hop());
  await dongHop();
}

// ===========================================================================
console.log('\n[2] Ca chấm bù: giờ về thật bị từ chối → sửa giờ tới lớp → ghi được giờ về');
{
  // Giờ về thật 00:30, sớm hơn giờ vào đang ghi 23:59.
  await moBaCham('s1');
  await page.click('#att-vk-ve');
  await page.waitForSelector('#att-rv-gio', { timeout: 5000 });
  await page.fill('#att-rv-gio', '00:30');
  await page.click('#att-rv-khong');
  const tuChoi = await cauBao();
  check('giờ về 00:30 bị từ chối, câu báo chỉ cho cô chỗ sửa giờ tới lớp',
    /sớm hơn giờ con tới lớp/.test(tuChoi) && /Sửa giờ tới lớp/.test(tuChoi), tuChoi);
  // LỖI ĐÃ CÓ THẬT (tìm thấy khi viết bài này): nút "Chỉ ghi giờ, không chụp"
  // đóng hộp rồi mới đọc ô giờ, nên giờ cô gõ bị bỏ và máy chủ ghi "bây giờ".
  check('…và giờ bị từ chối là ĐÚNG GIỜ CÔ GÕ (00:30), không phải "bây giờ"', /Giờ ra về \(00:30\)/.test(tuChoi), tuChoi);
  check('…sổ chưa có giờ về', dongCua('s1').checkOut === null, dongCua('s1'));
  if (await coHop()) await dongHop();

  await moBaCham('s1');
  await page.click('#att-vk-gio-vao');
  await page.waitForSelector('#att-gv-gio', { timeout: 5000 });
  const chuHop = await hop();
  check('hộp sửa giờ nói rõ giờ này gia đình nhìn thấy, bằng tiếng của trường',
    /Giờ con tới lớp/.test(chuHop) && /Gia đình thấy giờ này/.test(chuHop)
    && !/học sinh|lớp học|giáo viên|checkIn/i.test(chuHop), chuHop);
  check('ô giờ điền sẵn giờ đang ghi (23:59)', (await page.inputValue('#att-gv-gio')) === '23:59', await page.inputValue('#att-gv-gio'));

  const truocGui = guiDi.length;
  await page.fill('#att-gv-gio', '00:00');
  await page.click('#att-gv-luu');
  const xong = await cauBao();
  check('lưu được, app báo "Đã ghi giờ tới lớp 00:00"', /Đã ghi giờ tới lớp 00:00/.test(xong), xong);
  check('gửi đúng một yêu cầu tới đường sửa giờ vào',
    guiDi.slice(truocGui).filter(u => u === '/api/attendance/gio-vao').length === 1, guiDi.slice(truocGui));
  check('hộp đóng lại', !(await coHop()));
  check('sổ mang giờ vào 00:00, vẫn "có mặt"', dongCua('s1').checkIn === '00:00' && dongCua('s1').status === 'present', dongCua('s1'));
  const dong = await dongChu('s1');
  check('dòng của bé vẽ lại ngay: "Vào lớp 00:00", không còn 23:59', /00:00/.test(dong) && !/23:59/.test(dong), dong);

  await moBaCham('s1');
  await page.click('#att-vk-ve');
  await page.waitForSelector('#att-rv-gio', { timeout: 5000 });
  await page.fill('#att-rv-gio', '00:30');
  await page.click('#att-rv-khong');
  await cauBao();
  check('SAU KHI SỬA: giờ về thật 00:30 ghi được', dongCua('s1').checkOut === '00:30', dongCua('s1'));
  check('…và dòng của bé hiện cả hai giờ', /00:00/.test(await dongChu('s1')) && /00:30/.test(await dongChu('s1')), await dongChu('s1'));
}

// ===========================================================================
console.log('\n[3] Máy chủ từ chối thì hộp CÒN MỞ, sổ không đổi');
{
  // Bé đã về lúc 00:30; gõ giờ tới lớp 00:45 là muộn hơn giờ về (và nếu bài
  // chạy trước 00:45 thì là giờ chưa tới) — đằng nào cũng phải bị từ chối.
  await moBaCham('s1');
  await page.click('#att-vk-gio-vao');
  await page.waitForSelector('#att-gv-gio', { timeout: 5000 });
  await page.fill('#att-gv-gio', '00:45');
  await page.click('#att-gv-luu');
  const tuChoi = await cauBao();
  check('app báo lý do bằng câu của máy chủ, có giờ cô vừa gõ', /Giờ tới lớp \(00:45\)/.test(tuChoi), tuChoi);
  check('hộp CÒN MỞ với giờ cô vừa gõ', (await coHop()) && (await page.inputValue('#att-gv-gio').catch(() => '')) === '00:45');
  check('nút Lưu bấm lại được', !(await page.locator('#att-gv-luu').isDisabled().catch(() => true)));
  check('sổ không đổi', dongCua('s1').checkIn === '00:00' && dongCua('s1').checkOut === '00:30', dongCua('s1'));
  await dongHop();
}

// ===========================================================================
console.log('\n[4] Không lỗi JavaScript nào trong suốt bài');
check('trang không ném lỗi', loiJs.length === 0, loiJs);

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
