// Kiểm thử giao diện đường GHI của các phân hệ nội dung: giáo viên/quản trị
// thấy nút soạn và lưu được; phụ huynh tuyệt đối không thấy nút soạn.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
import { chromium } from 'playwright';
import { dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, CHROMIUM, tatBannerThongBao } from './_chung.mjs';

const DIR = thuMucTam('bien-soan-giao-dien');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3950), dir: DIR });

// Đổi mật khẩu tạm của quản trị qua API để đăng nhập được trên trình duyệt.
{
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hieutruong', password: mkTam }),
  });
  const ck = r.headers.get('set-cookie').split(';')[0];
  await fetch(BASE + '/api/auth/set-new-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ newPassword: 'quantri2026' }),
  });
}

const { check, tongKet } = taoBoDem();

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerThongBao(await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

async function dangNhap(u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
const dangXuat = async () => { await page.evaluate(() => App.logout()); await page.waitForTimeout(600); };

// ============================================================
// 1. THỜI KHÓA BIỂU
// ============================================================
console.log('\n[1] TKB — cô phụ trách sửa ngay trên màn hình');
await dangNhap('giaovien', '123456');
await page.goto(BASE + '/#/timetable', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('giáo viên thấy nút Chỉnh sửa', await page.locator('#btn-sua-tkb').count() === 1);

await page.click('#btn-sua-tkb');
await page.waitForTimeout(700);
check('mở được màn hình sửa', await page.locator('#tkb-mon-0').count() === 1);

await page.fill('#tkb-mon-0', 'Đọc sách đầu tuần');
await page.locator('button', { hasText: 'Lưu lịch sinh hoạt' }).click();
await page.waitForTimeout(1200);
const sauLuu = await page.locator('#view').innerText();
check('lưu xong quay về màn hình xem, thấy môn vừa sửa', /Đọc sách đầu tuần/.test(sauLuu), sauLuu.slice(0, 200));

// Sửa rồi bấm Hủy thì không được lưu gì cả.
await page.click('#btn-sua-tkb');
await page.waitForTimeout(700);
await page.fill('#tkb-mon-0', 'Môn không được lưu');
await page.locator('button', { hasText: 'Hủy' }).click();
await page.waitForTimeout(900);
const sauHuy = await page.locator('#view').innerText();
check('bấm Hủy thì bản nháp bị bỏ', !/Môn không được lưu/.test(sauHuy) && /Đọc sách đầu tuần/.test(sauHuy), sauHuy.slice(0, 200));

console.log('\n[2] TKB — phụ huynh chỉ xem, không có nút soạn');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/timetable', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
// Nhà có 2 con hai lớp — chọn đúng bé học lớp 3A (lớp cô vừa sửa TKB).
await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
await page.waitForTimeout(900);
const manPH = await page.locator('#view').innerText();
check('phụ huynh vẫn xem được TKB (có môn GV vừa sửa)', /Đọc sách đầu tuần/.test(manPH), manPH.slice(0, 200));
check('phụ huynh KHÔNG thấy nút Chỉnh sửa', await page.locator('#btn-sua-tkb').count() === 0);
check('màn hình phụ huynh không có ô nhập nào', await page.locator('#view input').count() === 0);

// ============================================================
// 2. THỰC ĐƠN
// ============================================================
console.log('\n[3] Thực đơn — quản trị soạn ngay trên màn hình');
await dangXuat();
await dangNhap('hieutruong', 'quantri2026');
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('quản trị thấy nút Chép tuần trước', await page.locator('#btn-chep-tuan').count() === 1);
const soNutSua = await page.locator('#view .card .head-action').count();
check('mỗi ngày trong tuần có nút Sửa/Soạn', soNutSua === 5, soNutSua);

await page.locator('#view .card .head-action').first().click();
await page.waitForTimeout(800);
check('mở được màn soạn thực đơn', await page.locator('#td-items-0').count() === 1);
await page.fill('#td-items-0', 'Phở bò kiểm thử\nSữa chua');
await page.locator('button', { hasText: 'Lưu thực đơn' }).click();
await page.waitForTimeout(1200);
const sauLuuTd = await page.locator('#view').innerText();
check('lưu xong thấy món vừa soạn trên thẻ ngày', /Phở bò kiểm thử/.test(sauLuuTd), sauLuuTd.slice(0, 250));

console.log('\n[4] Thực đơn — phụ huynh chỉ xem');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const manTdPH = await page.locator('#view').innerText();
check('phụ huynh thấy món quản trị vừa soạn', /Phở bò kiểm thử/.test(manTdPH), manTdPH.slice(0, 250));
check('phụ huynh KHÔNG có nút soạn/sửa/chép nào', await page.locator('#view .head-action').count() === 0);

// ============================================================
// 3. KẾ HOẠCH GIÁO DỤC
// ============================================================
console.log('\n[5] Kế hoạch — cô phụ trách soạn ngay trên màn hình');
await dangXuat();
await dangNhap('giaovien', '123456');
await page.goto(BASE + '/#/plans', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('giáo viên thấy nút Soạn kế hoạch', await page.locator('#btn-soan-kh').count() === 1);

await page.click('#btn-soan-kh');
await page.waitForTimeout(700);
check('mở được màn soạn với đủ chủ đề, mục tiêu, 4 tuần', await page.locator('#kh-chude').count() === 1
  && await page.locator('#kh-tt-3').count() === 1);
await page.fill('#kh-chude', 'Tháng của kiểm thử');
await page.fill('#kh-muctieu', 'Mục tiêu trình duyệt 1\nMục tiêu trình duyệt 2');
await page.locator('button', { hasText: 'Lưu kế hoạch' }).click();
await page.waitForTimeout(1200);
const sauLuuKh = await page.locator('#view').innerText();
check('lưu xong màn hình hiện chủ đề vừa soạn', /Tháng của kiểm thử/.test(sauLuuKh)
  && /Mục tiêu trình duyệt 1/.test(sauLuuKh), sauLuuKh.slice(0, 250));

console.log('\n[6] Kế hoạch — phụ huynh chỉ xem');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/plans', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
await page.waitForTimeout(900);
const manKhPH = await page.locator('#view').innerText();
check('phụ huynh thấy kế hoạch cô vừa soạn', /Tháng của kiểm thử/.test(manKhPH), manKhPH.slice(0, 250));
check('phụ huynh KHÔNG thấy nút Soạn kế hoạch', await page.locator('#btn-soan-kh').count() === 0);

// ============================================================
// 4. BÁO CÁO HỌC TẬP
// ============================================================
console.log('\n[7] Báo cáo — cô phụ trách soạn ngay trên màn hình');
await dangXuat();
await dangNhap('giaovien', '123456');
await page.goto(BASE + '/#/reports', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
check('giáo viên thấy nút Soạn báo cáo', await page.locator('#btn-soan-bc').count() === 1);
// Soạn cho đúng bé mà phụ huynh 'phuhuynh' sẽ kiểm tra ở phần sau.
await page.selectOption('#rp-student', { label: 'Nguyễn Bảo An' });
await page.waitForTimeout(900);
const soKyTruoc = await page.locator('.seg button').count();

await page.click('#btn-soan-bc');
await page.waitForTimeout(700);
check('màn soạn có bảng điểm và ô chuyên cần bị khóa', await page.locator('#bc-diem-0').count() === 1
  && await page.locator('input[disabled]').count() === 1);

// Đáy modal phải nằm trong khung NHÌN THẤY, không phải khung BỐ CỤC.
//
// Hai khung này lệch nhau ngay khi bàn phím bật lên — đúng lúc cô vừa gõ xong
// nhận xét và với tay xuống nút Lưu. Lệch là nút cuối modal vẫn nằm trong trang,
// vẫn cuộn tới được, nhưng KHÔNG chạm vào được; modal ngắn thì cuộn hết cỡ cũng
// không kéo nó lên nổi. Xem ghi chú ở `.modal-overlay` trong public/css/app.css.
{
  const khung = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    return {
      dayModal: Math.round(m.getBoundingClientRect().bottom),
      nhinThay: Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight),
    };
  });
  check('đáy modal nằm trong vùng nhìn thấy được, nút cuối chạm tới được',
    khung.dayModal <= khung.nhinThay + 1, khung);
}
await page.fill('#bc-diem-0', '9.5');
await page.fill('#bc-nhanxet', 'Nhận xét trình duyệt cho học kỳ mới');
await page.locator('button', { hasText: 'Lưu báo cáo' }).click();
await page.waitForTimeout(1200);
const soKySau = await page.locator('.seg button').count();
check('lưu xong có thêm một học kỳ trên thanh chọn', soKySau === soKyTruoc + 1, `${soKyTruoc} → ${soKySau}`);
await page.locator('.seg button').nth(soKySau - 1).click();
await page.waitForTimeout(900);
const manBc = await page.locator('#view').innerText();
check('mở kỳ mới thấy điểm và nhận xét vừa soạn', /9\.5/.test(manBc) && /Nhận xét trình duyệt cho học kỳ mới/.test(manBc), manBc.slice(0, 300));

console.log('\n[8] Báo cáo — phụ huynh chỉ xem');
await dangXuat();
await dangNhap('phuhuynh', '123456');
await page.goto(BASE + '/#/reports', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
await page.waitForTimeout(900);
check('phụ huynh KHÔNG thấy nút Soạn báo cáo', await page.locator('#btn-soan-bc').count() === 0);
const soKyPH = await page.locator('.seg button').count();
await page.locator('.seg button').nth(soKyPH - 1).click();
await page.waitForTimeout(900);
const manBcPH = await page.locator('#view').innerText();
check('phụ huynh xem được báo cáo kỳ mới cô vừa soạn', /Nhận xét trình duyệt cho học kỳ mới/.test(manBcPH), manBcPH.slice(0, 300));

// ============================================================
// 5. TÊN CHỨA DẤU NHÁY KHÔNG ĐƯỢC CHẠY THÀNH MÃ
// ============================================================
console.log('\n[9] Tên lớp có dấu nháy: hiện đúng chữ, không chạy thành mã');
{
  // Đây là bài canh HÀNH VI trên trình duyệt thật. Bộ quét tĩnh ở test:lo-hong
  // canh khuôn mẫu nguy hiểm trong mã; bài này chứng minh trên trình duyệt thật
  // là dấu nháy trong tên lớp nay chỉ còn là chữ.
  const TEN_BAY = `Lớp Bé Ong's');window.__pwn=1;//`;
  const ck = await (async () => {
    const r = await fetch(BASE + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hieutruong', password: 'quantri2026' }),
    });
    return r.headers.get('set-cookie').split(';')[0];
  })();
  const tao = await fetch(BASE + '/api/admin/classes', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ name: TEN_BAY, room: 'P999', grade: 1 }),
  });
  check('tạo được lớp có tên chứa dấu nháy', tao.status === 201, tao.status);

  let hopThoai = false;
  page.on('dialog', d => { hopThoai = true; d.dismiss().catch(() => {}); });

  await dangXuat();
  await dangNhap('hieutruong', 'quantri2026');
  await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const dong = page.locator('.list-row', { hasText: "Bé Ong's" }).first();
  check('dòng lớp hiện đúng tên có dấu nháy', await dong.count() > 0);
  await dong.locator('button', { hasText: 'Xem' }).click();
  await page.waitForTimeout(900);

  check('KHÔNG chạy được mã chèn trong tên lớp',
    await page.evaluate(() => window.__pwn) === undefined);
  check('không bung hộp thoại lạ', !hopThoai);
  const tieuDe = await page.locator('.modal-title').innerText();
  check('tiêu đề vẫn hiện nguyên tên lớp, không nuốt chữ', tieuDe.includes("Bé Ong's"), tieuDe);
}

console.log('\n[10] Nút Sửa nhóm: phân công lại cô phụ trách ngay trên màn hình');
{
  await page.evaluate(() => UI.closeModal());   // đóng modal của bài trước, nếu không nó che nút
  await page.waitForTimeout(400);
  await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const dong = page.locator('.list-row', { hasText: 'Chồi 2' }).first();
  check('dòng lớp có nút Sửa', await dong.locator('button', { hasText: 'Sửa' }).count() === 1);
  await dong.locator('button', { hasText: 'Sửa' }).click();
  await page.waitForTimeout(800);
  check('mở được form sửa lớp', await page.locator('#ad-sl-ten').count() === 1);
  check('form có ô chọn cô phụ trách', await page.locator('#ad-sl-gv').count() === 1);
  check('form KHÔNG có ô năm học (cố ý, tránh làm hỏng việc chuyển năm)',
    await page.locator('#ad-sl-nam').count() === 0);

  await page.selectOption('#ad-sl-gv', '');
  await page.locator('button', { hasText: 'Lưu thay đổi' }).click();
  await page.waitForTimeout(1400);
  const man = await page.locator('#view').innerText();
  check('gỡ cô phụ trách xong màn hình nhắc việc ngay', /chưa có cô phụ trách/i.test(man), man.slice(0, 200));
  check('dòng nhóm được đánh dấu Chưa có cô phụ trách', /Chưa có cô phụ trách/.test(man));
}

console.log('\n[11] Sửa hồ sơ bé và cho nghỉ học ngay trong màn hình nhóm');
{
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);
  await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('.list-row', { hasText: 'Chồi 2' }).first()
    .locator('button', { hasText: 'Xem' }).click();
  await page.waitForTimeout(900);

  const hs = page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first();
  check('dòng của bé có nút Sửa', await hs.locator('button', { hasText: 'Sửa' }).count() === 1);
  check('dòng của bé có nút Cho nghỉ', await hs.locator('button', { hasText: 'Cho nghỉ' }).count() === 1);

  // -- Sửa hồ sơ
  await hs.locator('button', { hasText: 'Sửa' }).click();
  await page.waitForTimeout(900);
  check('mở được form sửa hồ sơ của bé', await page.locator('#ad-hs-ten').count() === 1);
  check('form có ô chuyển lớp', await page.locator('#ad-hs-lop').count() === 1);
  await page.fill('#ad-hs-dc', '99 Ngõ Kiểm Thử');
  await page.locator('button', { hasText: 'Lưu thay đổi' }).click();
  await page.waitForTimeout(1400);
  check('lưu xong quay lại đúng danh sách lớp vừa xem',
    (await page.locator('.modal-title').innerText()).includes('Chồi 2'),
    await page.locator('.modal-title').innerText());

  // -- Cho nghỉ học: phải hỏi lại, và phải nói rõ dữ liệu được giữ
  await page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first()
    .locator('button', { hasText: 'Cho nghỉ' }).click();
  await page.waitForTimeout(700);
  const hoi = await page.locator('.modal').innerText();
  check('hỏi lại trước khi cho nghỉ học', /Xác nhận/.test(hoi), hoi.slice(0, 120));
  check('nói rõ dữ liệu cũ vẫn được giữ nguyên', /giữ nguyên/.test(hoi));
  check('có đường quay lại nếu bấm nhầm', await page.locator('button', { hasText: 'Quay lại' }).count() >= 1);

  await page.locator('#ad-nghi-ok').click();
  await page.waitForTimeout(1500);
  const sau = await page.locator('.modal').innerText();
  check('em chuyển xuống mục đã nghỉ, không biến mất khỏi màn hình', /Đã nghỉ/.test(sau), sau.slice(0, 200));
  check('màn hình nói rõ dữ liệu vẫn tra cứu được', /tra cứu được/.test(sau));

  // -- Nhận lại
  await page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first()
    .locator('button', { hasText: 'Nhận lại' }).click();
  await page.waitForTimeout(1500);
  const cuoi = await page.locator('.modal').innerText();
  check('nhận lại xong em về mục đang học', !/Đã nghỉ/.test(cuoi), cuoi.slice(0, 200));
}

console.log('\n[12] Nhập lại tệp cũ: màn hình cảnh báo trùng thay vì âm thầm nhân đôi');
{
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);

  const TEP = 'Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại\n'
    + 'Trịnh Thu Thảo,2018-03-03,Lớp Nhập Thử,Trịnh Văn Cha,0966000001\n'
    + 'Vương Chí Kiên,2018-04-04,Lớp Nhập Thử,Vương Thị Mẹ,0966000002';
  const tepCsv = { name: 'danh-sach.csv', mimeType: 'text/csv', buffer: Buffer.from(TEP, 'utf8') };

  const nhapTep = async () => {
    await page.goto(BASE + '/#/admin/nhaplieu', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.setInputFiles('#ad-file', tepCsv);
    await page.waitForSelector('#ad-commit', { timeout: 8000 });
    await page.waitForTimeout(400);
  };

  // -- Lần đầu: không có cảnh báo nào.
  await nhapTep();
  check('lần đầu KHÔNG hiện cảnh báo trùng', await page.locator('#ad-trung-ok').count() === 0);
  check('nút nhập ghi đúng 2 bé',
    /Nhập 2 bé/.test(await page.locator('#ad-commit').innerText()),
    await page.locator('#ad-commit').innerText());

  // Bài [9] đã cài sẵn một bộ bắt hộp thoại luôn bấm Hủy — gỡ đi, nếu không lời
  // xác nhận "Nhập N bé?" bị hủy và không có gì được ghi.
  page.removeAllListeners('dialog');
  page.once('dialog', d => d.accept());
  await page.locator('#ad-commit').click();
  await page.waitForSelector('.modal', { timeout: 10000 });
  await page.waitForTimeout(600);
  check('nhập xong hiện phiếu tài khoản phụ huynh',
    /Đã nhập/.test(await page.locator('.modal').innerText()));
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);

  // -- Lần hai với đúng tệp đó: phải cảnh báo và KHÔNG cho nhập.
  await nhapTep();
  const man = await page.locator('#ad-preview').innerText();
  check('lần hai hiện cảnh báo đã có trong hệ thống', /đã có trong hệ thống/.test(man), man.slice(0, 300));
  check('nói rõ hậu quả nếu cứ nhập', /hai hồ sơ/.test(man));
  check('liệt kê tên từng em bị trùng', /Trịnh Thu Thảo/.test(man));
  const nut = page.locator('#ad-commit');
  check('nút nhập bị khóa vì không còn gì để nhập', await nut.isDisabled());
  check('nút ghi rõ là 0 bé', /Nhập 0 bé/.test(await nut.innerText()), await nut.innerText());

  // -- Quản trị vẫn được quyền chủ động nhập cả em trùng.
  check('có ô tích để chủ động nhập cả em trùng', await page.locator('#ad-trung-ok').count() === 1);
  await page.check('#ad-trung-ok');
  await page.waitForTimeout(300);
  check('tích vào thì nút mở lại', !(await nut.isDisabled()));
  check('và nút đếm lại đúng 2 bé', /Nhập 2 bé/.test(await nut.innerText()), await nut.innerText());
}

console.log('\n[13] Điểm danh: chạm một em KHÔNG ném cô về đầu danh sách');
{
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);
  // Bài [10] cố tình gỡ cô phụ trách nhóm Chồi 2 để thử thẻ cảnh báo — phân công
  // lại, nếu không cô đăng nhập vào sẽ thấy nhóm trống.
  const phanCong = await page.evaluate(() => API.put('/api/admin/classes/c1', { teacherId: 't1' }).then(() => 'ok', e => e.message));
  check('phân công lại cô phụ trách để thử điểm danh', phanCong === 'ok', phanCong);

  await dangXuat();
  await dangNhap('giaovien', '123456');

  // Màn hình thấp lại để danh sách chắc chắn phải cuộn — đúng cảnh lớp 30 em
  // trên điện thoại thật.
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto(BASE + '/#/attendance', { waitUntil: 'networkidle' });
  await page.waitForSelector('[id^="att-dong-"]', { timeout: 8000 });
  // Chọn một ngày chưa có dữ liệu mẫu để bắt đầu từ lớp chưa điểm danh.
  await page.evaluate(() => App.views.attendance.setDate('2026-11-20'));
  await page.waitForTimeout(900);

  const soDong = await page.locator('[id^="att-dong-"]').count();
  check('màn hình điểm danh hiện danh sách lớp', soDong > 0, soDong);
  check('ngày mới chọn chưa em nào được điểm danh',
    Number(await page.locator('#att-so-da').innerText()) === 0,
    await page.locator('#att-so-da').innerText());

  // Đánh dấu để biết trang có bị vẽ lại toàn bộ hay không: App.route() thay sạch
  // #view nên dấu này sẽ biến mất.
  await page.evaluate(() => { document.getElementById('view').dataset.moc = 'con-nguyen'; });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const truoc = await page.evaluate(() => window.scrollY);
  check('cuộn xuống được (danh sách dài hơn màn hình)', truoc > 0, truoc);

  const cuoi = page.locator('[id^="att-dong-"]').last();
  const tenEm = await cuoi.locator('.row-title').innerText();
  await cuoi.locator('button', { hasText: 'Nghỉ CP' }).click();
  await page.waitForTimeout(1200);

  const sau = await page.evaluate(() => window.scrollY);
  check('CHẠM XONG VẪN Ở NGUYÊN CHỖ CŨ, không nhảy về đầu trang',
    Math.abs(sau - truoc) < 40, `${truoc} → ${sau}`);
  check('trang KHÔNG bị vẽ lại toàn bộ',
    await page.evaluate(() => document.getElementById('view').dataset.moc) === 'con-nguyen');

  // Dòng vừa chạm phải cập nhật thật, không phải chỉ nằm im.
  const dongMoi = page.locator('[id^="att-dong-"]').last();
  check('vẫn đúng em vừa chạm', (await dongMoi.locator('.row-title').innerText()) === tenEm, tenEm);
  check('hai ô đếm cập nhật ngay',
    Number(await page.locator('#att-so-da').innerText()) === 1,
    await page.locator('#att-so-da').innerText());
  check('số em chưa điểm danh giảm đi một',
    Number(await page.locator('#att-so-chua').innerText()) === soDong - 1,
    await page.locator('#att-so-chua').innerText());

  // -- "Cả nhóm có mặt" phải hỏi lại và giữ nguyên em vừa đánh dấu nghỉ.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('button', { hasText: 'Cả nhóm có mặt' }).click();
  await page.waitForTimeout(700);
  const hoi = await page.locator('.modal').innerText();
  check('hỏi lại trước khi điểm danh cả nhóm', /Cả nhóm có mặt/.test(hoi), hoi.slice(0, 150));
  check('nói rõ em đã đánh dấu sẽ được giữ nguyên', /giữ nguyên/.test(hoi), hoi.slice(0, 300));
  check('có nút riêng để ghi đè, không phải mặc định',
    await page.locator('#att-ghi-de').count() === 1);
  check('có đường quay lại nếu bấm nhầm', await page.locator('button', { hasText: 'Quay lại' }).count() >= 1);

  await page.locator('#att-tat-ca').click();
  await page.waitForTimeout(1500);
  const man = await page.locator('#view').innerText();
  check('điểm danh cả lớp xong không còn ai chưa đánh dấu',
    Number(await page.locator('#att-so-chua').innerText()) === 0,
    await page.locator('#att-so-chua').innerText());
  check('EM NGHỈ CÓ PHÉP KHÔNG BỊ GHI ĐÈ THÀNH CÓ MẶT', /Nghỉ CP/.test(man));

  await page.setViewportSize({ width: 390, height: 844 });
}

console.log('\n[14] Đơn nghỉ đã duyệt hiện ngay trên màn điểm danh');
{
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);
  const NGAY = '2026-12-15';

  // Phụ huynh gửi đơn cho con mình, cô duyệt — làm qua API cho gọn, phần cần
  // kiểm là màn hình điểm danh.
  const daTao = await page.evaluate(async (ngay) => {
    // Đang đăng nhập bằng giáo viên; mượn fetch của trang để giữ đúng phiên.
    const dsLop = await (await fetch(`/api/attendance/class?date=${ngay}`)).json();
    return dsLop.students.map(x => x.student.id);
  }, NGAY);
  check('lấy được danh sách lớp của cô', daTao.length > 0, daTao.length);

  await dangXuat();
  await dangNhap('phuhuynh', '123456');
  const donId = await page.evaluate(async ({ ngay, ids }) => {
    const con = await (await fetch('/api/students')).json();
    const em = con.map(c => c.id).find(id => ids.includes(id));
    if (!em) return null;
    const r = await fetch('/api/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: em, fromDate: ngay, toDate: ngay, reason: 'Con đi khám răng' }),
    });
    return (await r.json()).id || null;
  }, { ngay: NGAY, ids: daTao });
  check('phụ huynh gửi được đơn xin nghỉ', !!donId, donId);

  await dangXuat();
  await dangNhap('giaovien', '123456');
  const duyet = await page.evaluate(async (id) => {
    const r = await fetch(`/api/leave/${id}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    return r.status;
  }, donId);
  check('cô duyệt được đơn', duyet === 200, duyet);

  await page.goto(BASE + '/#/attendance', { waitUntil: 'networkidle' });
  await page.waitForSelector('[id^="att-dong-"]', { timeout: 8000 });
  await page.evaluate(ngay => App.views.attendance.setDate(ngay), NGAY);
  await page.waitForTimeout(1000);

  const man = await page.locator('#view').innerText();
  check('MÀN ĐIỂM DANH HIỆN HUY HIỆU ĐƠN NGHỈ ĐÃ DUYỆT', /Có đơn nghỉ đã duyệt/.test(man), man.slice(0, 400));
  check('kèm lý do để cô khỏi phải mở màn khác', /khám răng/.test(man));

  // Chấm "Nghỉ KP" cho em đó phải bị hỏi lại.
  const dong = page.locator('.list-row', { hasText: 'Có đơn nghỉ đã duyệt' }).first();
  await dong.locator('button', { hasText: 'Nghỉ KP' }).click();
  await page.waitForTimeout(700);
  const hoi = await page.locator('.modal').innerText();
  check('chấm Nghỉ KP đúng ngày có đơn thì bị hỏi lại', /đã có/.test(hoi), hoi.slice(0, 200));
  check('nói rõ hậu quả với phụ huynh', /chữ đỏ|phụ huynh/.test(hoi));
  check('có nút đi thẳng sang Nghỉ có phép', await page.locator('#att-dung-cp').count() === 1);
  check('vẫn cho cô toàn quyền quyết định', await page.locator('#att-van-kp').count() === 1);

  await page.locator('#att-dung-cp').click();
  await page.waitForTimeout(1200);
  const sau = await page.locator('#view').innerText();
  check('chọn đúng thì ghi Nghỉ có phép, không còn hộp thoại', await page.locator('.modal').count() === 0);
  check('em khác không bị gắn nhầm huy hiệu',
    (sau.match(/Có đơn nghỉ đã duyệt/g) || []).length === 1, sau.match(/Có đơn nghỉ đã duyệt/g)?.length);
}

console.log('\n[15] Sửa lại và thu hồi: thông báo, nề nếp, y tế, nhận xét');
{
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(400);
  // Đang đăng nhập bằng giaovien từ bài trước.

  // ---- Thông báo ----
  // Tạo trước rồi mới mở màn hình: `page.goto` tới đúng URL đang mở (kể cả phần
  // sau dấu #) không nạp lại trang, nên vào trước là thấy danh sách cũ.
  const daGui = await page.evaluate(async () => {
    const r = await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Họp phụ huynh 19h', body: 'Kính mời quý phụ huynh', audience: 'class' }),
    });
    return (await r.json()).id || null;
  });
  check('gửi được thông báo để thử', !!daGui, daGui);

  await page.goto(BASE + '/#/notifications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('.list-row', { hasText: 'Họp phụ huynh 19h' }).first().click();
  await page.waitForTimeout(700);
  check('người gửi thấy nút Sửa lại', await page.locator('button', { hasText: 'Sửa lại' }).count() >= 1);
  check('người gửi thấy nút Thu hồi', await page.locator('button', { hasText: 'Thu hồi' }).count() >= 1);

  await page.locator('button', { hasText: 'Sửa lại' }).first().click();
  await page.waitForTimeout(700);
  check('mở được form sửa thông báo', await page.locator('#nt-s-title').count() === 1);
  await page.fill('#nt-s-title', 'Họp phụ huynh 19h30');
  await page.locator('button', { hasText: 'Lưu thay đổi' }).click();
  await page.waitForTimeout(1400);
  const manTb = await page.locator('#view').innerText();
  check('thông báo hiện nội dung đã sửa', /19h30/.test(manTb), manTb.slice(0, 250));

  // ---- Nề nếp ----
  await page.goto(BASE + '/#/conduct', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'Ghi nhận' }).first().click();
  await page.waitForTimeout(700);
  check('form ghi nhận có ô chọn NGÀY (ghi bù hôm trước)', await page.locator('#cd-date').count() === 1);
  await page.fill('#cd-title', 'Nhắc nhở ghi nhầm em');
  await page.locator('button', { hasText: 'Lưu ghi nhận' }).click();
  await page.waitForTimeout(1500);

  const dongNn = page.locator('.list-row', { hasText: 'Nhắc nhở ghi nhầm em' }).first();
  check('ghi nhận vừa tạo có nút Thu hồi', await dongNn.locator('button', { hasText: 'Thu hồi' }).count() === 1);
  await dongNn.locator('button', { hasText: 'Thu hồi' }).click();
  await page.waitForTimeout(700);
  const hoiNn = await page.locator('.modal').innerText();
  check('hỏi lại trước khi thu hồi ghi nhận', /Thu hồi/.test(hoiNn));
  check('nói rõ điểm thi đua được trả lại', /điểm thi đua/.test(hoiNn), hoiNn.slice(0, 250));
  check('nói rõ dữ liệu vẫn được giữ', /vẫn được giữ|giữ trong hệ thống/.test(hoiNn));
  await page.locator('#cd-th-ok').click();
  await page.waitForTimeout(1500);
  check('THU HỒI XONG GHI NHẬN BIẾN KHỎI MÀN HÌNH',
    !/Nhắc nhở ghi nhầm em/.test(await page.locator('#view').innerText()));

  // ---- Y tế ----
  await page.goto(BASE + '/#/health', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'Thêm ghi nhận' }).first().click();
  await page.waitForTimeout(700);
  check('form y tế có ô chọn NGÀY (nhập bù đợt tiêm chủng)', await page.locator('#ht-date').count() === 1);
  await page.fill('#ht-title', 'Sốt nghi tay chân miệng');
  await page.locator('button', { hasText: 'Lưu ghi nhận' }).click();
  await page.waitForTimeout(1500);

  await page.locator('.list-row', { hasText: 'Sốt nghi tay chân miệng' }).first().click();
  await page.waitForTimeout(700);
  check('chi tiết y tế có nút Thu hồi', await page.locator('button', { hasText: 'Thu hồi' }).count() >= 1);
  await page.locator('button', { hasText: 'Thu hồi' }).first().click();
  await page.waitForTimeout(700);
  await page.locator('#ht-th-ok').click();
  await page.waitForTimeout(1500);
  check('THU HỒI XONG GHI NHẬN Y TẾ BIẾN KHỎI HỒ SƠ',
    !/Sốt nghi tay chân miệng/.test(await page.locator('#view').innerText()));

  // ---- Nhận xét ----
  await page.goto(BASE + '/#/remarks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'Viết nhận xét' }).first().click();
  await page.waitForTimeout(700);
  await page.fill('#rm-content', 'Con hôm nay chưa tập trung');
  await page.locator('#rm-submit').click();
  await page.waitForTimeout(1500);

  const dongNx = page.locator('.list-row', { hasText: 'Con hôm nay chưa tập trung' }).first();
  check('nhận xét vừa viết có nút Sửa', await dongNx.locator('button', { hasText: 'Sửa' }).count() === 1);
  await dongNx.locator('button', { hasText: 'Sửa' }).click();
  await page.waitForTimeout(700);
  check('mở được form sửa nhận xét', await page.locator('#rm-s-content').count() === 1);
  check('form sửa có ô chọn ngày', await page.locator('#rm-s-date').count() === 1);
  await page.fill('#rm-s-content', 'Con hôm nay rất cố gắng');
  await page.locator('button', { hasText: 'Lưu thay đổi' }).click();
  await page.waitForTimeout(1500);
  const manNx = await page.locator('#view').innerText();
  check('nhận xét hiện nội dung đã sửa', /rất cố gắng/.test(manNx));
  check('và được đánh dấu là đã chỉnh sửa', /đã chỉnh sửa/.test(manNx), manNx.slice(0, 300));
}

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);

await browser.close();
tongKet();
process.exit(0);
