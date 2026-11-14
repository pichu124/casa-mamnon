// MỘT DÒNG VÀO/RA — Điểm danh gộp cả ngày về một dòng, trên trình duyệt thật.
//
// Cần Playwright. Chạy bằng:  npm run test:diem-danh-tra-be
//
// LỊCH SỬ CỦA CHÍNH BÀI NÀY, ghi lại vì nó giải thích mọi thứ bên dưới:
//
//   Đ126 dựng màn Điểm danh thành HAI TAB — "Đón bé" và "Trả bé" — trong đó
//   tab thứ hai do phân hệ Đón trả bé vẽ vào. Bài này sinh ra để canh bản gộp
//   ấy, và nó ghim dải tab bằng `#att-tab [data-tab]`.
//
//   Đ210 (việc 1, 2, 3 nhà trường xin) GỘP TIẾP: hai tab về MỘT DÒNG Vào/Ra,
//   ảnh trả bé chuyển vào lõi, mục sổ trả bé bỏ khỏi màn Điểm danh. Dải tab
//   không còn, nên bài này BÁO ĐỎ — đúng như một bài canh giao diện phải làm
//   khi màn hình đổi thật.
//
//   Đ252 (chủ dự án duyệt 12/11) GỠ HẲN MÃ phân hệ Đón trả bé — nhà trường ba
//   lần bảo bỏ vì nửa "ra về" đã nằm ở sổ điểm danh. Mọi phần của bài này đo
//   màn riêng `#/dontra` của phân hệ (ghi sổ tại chỗ, đổi nhóm, khoá ngày, tắt
//   và hỏng phân hệ) rời đi cùng nó; chỗ nào trước đòi "ô Đón trả bé phải có"
//   nay đòi điều ngược lại. Máy cũ còn dữ liệu `dontra_*` thì có bài riêng:
//   test/da-go-don-tra.test.mjs.
//
// BẢO ĐẢM CÒN LẠI, TẤT CẢ LÀ VIỆC CỦA LÕI:
//
//   1. MỘT DÒNG VÀO/RA cho cô, kèm lối "Ghi con đã về" ngay trên dòng bé; địa
//      chỉ cũ '#/attendance/tra' không chết. Mục [1].
//   2. GIA ĐÌNH THẤY CẢ HAI NỬA của một ngày trong một hộp, kèm ảnh lúc ra về.
//      Mục [3] và [9].
//   3. KHÔNG CÒN DẤU VẾT NÀO CỦA PHÂN HỆ ĐÃ GỠ trên trang chủ và màn Điểm danh,
//      và địa chỉ cũ '#/dontra' nói rõ là không có, không trang trắng. Mục [6].
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai, MAU, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('diem-danh-tra-be');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['nhatky', 'thuchup']);
const mkTam = taoQuanTri(DIR, 'Hieu Truong', 'htruong');
// KHÔNG dùng 4190: nó nằm trong danh sách "cổng cấm" của fetch chuẩn WHATWG
// (ManageSieve), Node từ chối với "bad port" còn curl thì không — bài đứng chờ
// máy chủ "không khởi động được" trong khi máy chủ đã lên. Mất một giờ để ra.
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4195), dir: DIR });

const goiApi = async (duong, body, cookie, method) => {
  const r = await fetch(sv.BASE + duong, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json().catch(() => null) };
};
const dnApi = async (u, p) => (await goiApi('/api/auth/login', { username: u, password: p })).cookie;
const ckTam = await dnApi('htruong', mkTam);
await goiApi('/api/auth/set-new-password', { newPassword: 'quantri2026' }, ckTam);
const ckQT = await dnApi('htruong', 'quantri2026');
const batTat = async (key, bat) => goiApi(`/api/admin/modules/${key}`, { enabled: bat }, ckQT, 'PUT');

// Dữ liệu mẫu chỉ điểm danh NGÀY HỌC, nên chạy vào cuối tuần thì "hôm nay"
// chưa bé nào vào lớp và mọi nút "Ghi con đã về" biến mất (docs/VIEC-DANG-DO.md,
// việc 3). Ngày thường khối này không chạy, bài y như cũ.
if ([0, 6].includes(new Date(`${HOM_NAY()}T00:00:00Z`).getUTCDay())) {
  const r = await goiApi('/api/attendance/mark-all',
    { date: HOM_NAY(), status: 'present', classId: 'c1' }, await dnApi('giaovien', '123456'));
  check('(cuối tuần) cô chấm có mặt cả nhóm Chồi 2 cho hôm nay', r.status === 200, r.data);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
let loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });

// Máy nghe hộp chọn tệp phải gắn TỪ ĐÂY, không gắn ngay trước lần bấm:
// Playwright chỉ chặn được hộp sau khi báo xuống trình duyệt, mà đó là một
// vòng đi–về; gắn sát lần bấm thì hộp có thể bị trình duyệt tự huỷ trước và
// bài đứng chờ một sự kiện không bao giờ tới.
const ANH_THU = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
page.on('filechooser', async (fc) => {
  try { await fc.setFiles({ name: 'tra-be.png', mimeType: 'image/png', buffer: ANH_THU }); }
  catch (_) { /* hộp đã đóng */ }
});

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
const dem = (sel) => page.locator(sel).count();
const XAU = /học sinh|lớp học\b|giáo viên bộ môn|điểm số|xếp hạng/i;
const homNay = () => page.evaluate(() => UI.todayStr());

// Vùng chạm và cuộn ngang — cùng phép đo với man-hinh-phan-he [7].
async function doBoCuc(ten) {
  const tran = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${ten}: không cuộn ngang trên khổ điện thoại`, tran <= 1, `tràn ${tran}px`);
  const nhoQua = await page.evaluate(() => {
    const ra = [];
    for (const el of document.querySelectorAll('button, a[href], select, input[type=checkbox]')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.height < 32 || r.width < 32) ra.push(`${el.tagName}.${el.className || '-'}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return ra.slice(0, 5);
  });
  check(`${ten}: không nút nào nhỏ hơn đầu ngón tay`, nhoQua.length === 0, nhoQua);
}

let maBeAn = '';

// Đ242D (góp ý D3): các nút trên dòng bé gom vào nút "⋯"; "Ghi con đã về"
// nay nằm trong hộp ấy, ở dòng của bé đã vào lớp mà chưa về. Bảo đảm giữ
// nguyên — nửa thứ hai của ngày vẫn ghi được ngay từ dòng bé — chỉ đổi chỗ đo.
async function coLoiGhiVe() {
  const id = await page.evaluate(() => {
    const r = (App.views.attendance._roster || []).find(x =>
      x.record && ['present', 'late'].includes(x.record.status) && !x.record.checkOut);
    return r ? r.student.id : null;
  });
  if (!id) return false;
  await page.locator(`#att-dong-${id} [data-viec-khac]`).click();
  await page.waitForTimeout(400);
  const co = /Ghi con đã về/.test(await page.locator('#modal-overlay').innerText().catch(() => ''));
  await page.evaluate(() => UI.closeModal());
  return co;
}

// ===========================================================================
console.log('\n[1] Cô một nhóm: MỘT dòng Vào/Ra');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/attendance');
  // DẢI TAB ĐÃ GỠ (Đ210). Trước đợt ấy chỗ này đòi đúng hai tab.
  check('KHÔNG còn dải hai phần Đón bé / Trả bé', await dem('#att-tab') === 0, await dem('#att-tab'));
  check('màn vẫn có ô đếm và danh sách chấm như trước',
    await dem('#att-so-chua') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  // Đ242D: chụp ảnh check-in là bấm TÊN bé (ảnh + tên là một nút).
  check('mỗi dòng bé có nút tên để chụp ảnh check-in',
    await dem('[id^="att-dong-"] button.att-ten') === MAU.soBeNhomChoi2, await dem('[id^="att-dong-"] button.att-ten'));
  // MỘT DÒNG MANG CẢ HAI NỬA CỦA NGÀY.
  check('dòng bé có lối "Ghi con đã về" (trong nút ⋯) — nửa thứ hai nằm ngay trên dòng',
    await coLoiGhiVe(), (await chu()).slice(0, 300));
  check('CHỈ MỘT ô ngày trên màn', await dem('#view input[type=date]') === 1);

  // ĐƯỜNG DẪN CŨ KHÔNG ĐƯỢC CHẾT. Điện thoại đã cài app còn giữ nó trong lịch
  // sử, và một liên kết chết là cô bấm vào thấy trang trắng.
  await moMan('#/attendance/tra');
  check('#/attendance/tra lặng lẽ về màn gộp, không trang trắng',
    await dem('#att-so-chua') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  check('…và không có ô sự cố nào', await dem('#att-tra') === 0);
  await doBoCuc('Điểm danh gộp');

  maBeAn = await page.evaluate(async () => {
    const d = await API.get('/api/students');
    const ds = Array.isArray(d) ? d : (d.students || []);
    return (ds.find(s => s.name === 'Nguyễn Bảo An') || {}).id || '';
  });
  check('tìm được mã của bé An', !!maBeAn, maBeAn);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  // Đ252: mã phân hệ Đón trả bé đã gỡ, nên trang chủ của cô không còn ô ấy.
  // Nửa "ra về" của ngày ghi ngay trên dòng bé ở màn Điểm danh (đã đo ở trên).
  await moMan('#/');
  await page.waitForTimeout(800);
  const oCuaCo = await page.locator('.tile-label').allInnerTexts();
  check('cô KHÔNG còn ô "Đón trả bé" trên trang chủ, vẫn có ô Điểm danh',
    !oCuaCo.includes('Đón trả bé') && oCuaCo.includes('Điểm danh'), oCuaCo);
}

// ===========================================================================
console.log('\n[3] Gia đình: một ngày của con có cả hai nửa trong một hộp');
{
  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/attendance');
  // Nhà này có hai con — chọn đúng bé An.
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  const hn = await homNay();
  check('lịch tháng KHÔNG còn chấm "có ghi sổ trả bé" của phân hệ đã gỡ', await dem('.att-cal .dot.tra') === 0);
  check('chú thích lịch KHÔNG còn mục "Có ghi sổ trả bé"', !/Có ghi sổ trả bé/.test(await chu()));
  check('KHÔNG có nút chỉ đường "Mở Đón trả bé" (Đ241f, D2)', !/Mở Đón trả bé/.test(await chu()));
  await page.evaluate((d) => App.views.attendance.showDay(d), hn);
  await page.waitForSelector('.modal', { timeout: 5000 });
  const hop = await page.locator('.modal').innerText();
  check('hộp chi tiết ngày có đủ hai nửa: Giờ đến lớp và Giờ ra về', /Giờ đến lớp/.test(hop) && /Giờ ra về/.test(hop), hop.slice(0, 300));
  check('hộp KHÔNG còn nửa "Trả bé" của phân hệ đã gỡ', !/Trả bé|Về với/.test(hop), hop.slice(0, 300));
  check('không nói hộ gia đình "đã xem / đã thấy" ảnh', !/đã thấy|đã xem/i.test(hop));
  await page.evaluate(() => UI.closeModal());

  await page.locator('button[aria-label="Tháng trước"]').click();
  await page.waitForTimeout(1000);
  check('lùi một tháng vẫn dựng bình thường, không lỗi', await dem('.att-cal') === 1 && loiJs.length === 0, loiJs);
}

// ===========================================================================
console.log('\n[6] Trang chủ và địa chỉ cũ: không còn dấu vết của phân hệ Đón trả bé đã gỡ (Đ252)');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/');
  await page.waitForSelector('.viec-nut', { timeout: 10000 });
  const nhanO = await page.locator('.tile-label').allInnerTexts();
  check('cô: KHÔNG còn ô "Đón trả bé" trên lưới', !nhanO.includes('Đón trả bé'), nhanO);
  check('cô: vẫn có ô Điểm danh', nhanO.includes('Điểm danh'));
  check('cô: lưới vẫn đủ ô khác', nhanO.length >= 8, nhanO.length);
  check('cô: KHÔNG còn nút việc "Đón trả bé" trong bảng Hôm nay',
    await page.locator('.viec-nut', { hasText: 'Đón trả bé' }).count() === 0);
  const nutDiemDanh = page.locator('.viec-nut', { hasText: 'Điểm danh' });
  check('cô: nút việc "Điểm danh" vẫn có', await nutDiemDanh.count() === 1);
  await nutDiemDanh.click();
  await page.waitForTimeout(1200);
  check('bấm nút việc → mở sổ điểm danh, nơi ghi cả giờ ra về',
    await page.evaluate(() => location.hash) === '#/attendance' && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await page.evaluate(() => location.hash));

  // ĐỊA CHỈ CŨ KHÔNG ĐƯỢC LÀ TRANG TRẮNG. Điện thoại đã cài app còn giữ
  // '#/dontra' trong lịch sử; mở ra phải thấy một câu nói rõ, bằng tiếng Việt.
  await moMan('#/dontra');
  await page.waitForTimeout(600);
  const manCu = await chu();
  check('cô mở địa chỉ cũ #/dontra → màn "Không mở được", không trang trắng',
    /Không mở được/.test(manCu) && await dem('[data-tra]') === 0, manCu.slice(0, 200));
  check('…không lỗi JavaScript', loiJs.length === 0, loiJs);

  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/');
  const nhanPH = await page.locator('.tile-label').allInnerTexts();
  check('gia đình: KHÔNG còn ô "Đón trả bé", vẫn có ô Điểm danh',
    !nhanPH.includes('Đón trả bé') && nhanPH.includes('Điểm danh'), nhanPH);
  await moMan('#/dontra');
  await page.waitForTimeout(600);
  const manCuPH = await chu();
  check('gia đình mở địa chỉ cũ #/dontra → màn "Không mở được", không trang trắng, không lỗi',
    /Không mở được/.test(manCuPH) && await dem('#dt-nhan-vp') === 0 && loiJs.length === 0, manCuPH.slice(0, 200));

  await dangNhap('htruong', 'quantri2026');
  await moMan('#/');
  const nhanVP = await page.locator('.tile-label').allInnerTexts();
  check('văn phòng: KHÔNG còn ô "Đón trả bé", vẫn có ô Điểm danh',
    !nhanVP.includes('Đón trả bé') && nhanVP.includes('Điểm danh'), nhanVP);
  await moMan('#/attendance');
  const manVP = await chu();
  check('văn phòng: Điểm danh vẫn là bảng rà soát, không có dải hai phần', await dem('#att-tab') === 0);
  check('văn phòng: KHÔNG có thẻ chỉ đường "Mở Đón trả bé" (Đ241f, D2)', !/Mở Đón trả bé/.test(manVP), manVP.slice(0, 300));
  check('văn phòng: màn rà soát vẫn không có ô chọn nhóm', await dem('#view select') === 0);
}

// ===========================================================================
console.log('\n[7] Giờ Việt Nam, ngày viết bằng tiếng Việt, và ngày khác thì chỉ xem lại');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/attendance');

  // GIỜ VIỆT NAM, KHÔNG PHẢI GIỜ MÁY (Đ127). Máy chạy bài test có thể đang ở
  // múi giờ bất kỳ, nên bài tự tính mốc chuẩn từ đồng hồ tuyệt đối rồi so.
  const giờ = await page.evaluate(() => {
    const vn = new Date(Date.now() + 7 * 3600 * 1000).toISOString();
    return {
      homNayApp: UI.todayStr(), homNayVN: vn.slice(0, 10),
      gioApp: UI.gioVN(), gioVN: vn.slice(11, 16),
      fmtApp: UI.fmtTime('2026-09-04T03:26:00.000Z'),
      thuApp: UI.thuVN(), thuVN: new Date(Date.now() + 7 * 3600 * 1000).getUTCDay(),
    };
  });
  check('"hôm nay" của app là hôm nay của Việt Nam', giờ.homNayApp === giờ.homNayVN, giờ);
  check('giờ phút của app là giờ Việt Nam', giờ.gioApp === giờ.gioVN, giờ);
  check('mốc thời gian đầy đủ đọc ra giờ Việt Nam (03:26 UTC → 10:26)', giờ.fmtApp === '10:26', giờ.fmtApp);
  check('thứ trong tuần cũng theo giờ Việt Nam', giờ.thuApp === giờ.thuVN, giờ);

  // DÒNG NGÀY TIẾNG VIỆT. Ô ngày là ô của hệ điều hành: máy để tiếng Anh thì
  // mùng 4 tháng 9 hiện ra "09/04/2026" và cô đọc thành mùng 9 tháng 4.
  const man = await chu();
  const hnVN = giờ.homNayVN;
  const ngayViet = `${hnVN.slice(8, 10)}/${hnVN.slice(5, 7)}/${hnVN.slice(0, 4)}`;
  check('cạnh ô ngày có dòng ngày tiếng Việt kèm thứ', new RegExp(`Thứ .*${ngayViet}|Chủ nhật, ${ngayViet}`).test(man), man.slice(0, 300));
  check('và nói rõ đang là hôm nay', /· hôm nay/.test(man), man.slice(0, 300));
  check('ô ngày không cho chọn ngày mai (trần là hôm nay)',
    await page.locator('#view input[type=date]').first().getAttribute('max') === hnVN);

  // NGÀY KHÁC HÔM NAY: CHỈ XEM LẠI.
  const soNutTruoc = await dem('[id^="att-dong-"] button');
  check('đối chứng — hôm nay có nút chấm điểm danh', soNutTruoc > 0, soNutTruoc);
  const homQua = await page.evaluate(() => {
    const d = new Date(Date.now() + 7 * 3600 * 1000 - 86400000);
    return d.toISOString().slice(0, 10);
  });
  await page.evaluate((d) => App.views.attendance.setDate(d), homQua);
  await page.waitForTimeout(1200);
  const manCu = await chu();
  check('ngày đã qua → nói rõ "Ngày này đã khoá"', /Ngày này đã khoá/.test(manCu), manCu.slice(0, 300));
  check('nói rõ vì sao, bằng tiếng của trường',
    /chỉ ghi và sửa được trong chính ngày hôm đó/.test(manCu), manCu.slice(0, 400));
  // Đ207 thêm nút "Lưu ý" (ô nội bộ của trường) vào cả dòng của ngày đã khoá —
  // cố ý: ô lưu ý là chỗ ghi thứ BIẾT ĐƯỢC SAU, thường vài hôm sau khi gia
  // đình gọi lại, nên nó KHÔNG khoá theo ngày như sổ điểm danh. Vì vậy phép
  // kiểm không còn đòi "không nút nào", mà đòi đúng điều nó vẫn phải đòi:
  // không còn nút CHẤM ĐIỂM DANH nào.
  const nutNgayCu = await page.locator('[id^="att-dong-"] button').allInnerTexts();
  check('KHÔNG còn nút chấm điểm danh / ghi con đã về nào',
    nutNgayCu.every(t => /Lưu ý/.test(t)), nutNgayCu);
  check('KHÔNG còn nút "Cả nhóm có mặt"', !/Cả nhóm có mặt/.test(manCu));
  check('KHÔNG còn nút chụp ảnh con tới lớp', !/Chụp ảnh con tới lớp/.test(manCu));
  check('vẫn xem lại được — có tên bé và trạng thái đã ghi hôm đó',
    /Nguyễn Bảo An/.test(manCu) && /(Có mặt|Nghỉ|Đến muộn|cô chưa chấm)/.test(manCu), manCu.slice(0, 400));
  check('dòng ngày tiếng Việt đổi theo ngày đang xem, và bỏ chữ "hôm nay"',
    !/· hôm nay/.test(manCu), manCu.slice(0, 200));

  // Máy chủ giữ luật, không chỉ giao diện: gọi thẳng đường ghi cũng bị từ chối.
  const thu = await page.evaluate(async (d) => {
    const be = (App.views.attendance._roster || [])[0];
    try {
      await API.post('/api/attendance/mark', { studentId: be.student.id, date: d, status: 'present' });
      return { ok: true };
    } catch (e) { return { ok: false, loi: e.message || '' }; }
  }, homQua);
  check('gọi thẳng máy chủ cho ngày cũ vẫn bị từ chối', thu.ok === false, thu);
  check('câu từ chối của máy chủ nói bằng tiếng của trường',
    /chỉ ghi và sửa được trong chính ngày hôm đó/.test(thu.loi || ''), thu.loi);

  await page.locator('button', { hasText: 'Về ngày hôm nay' }).click();
  await page.waitForTimeout(1200);
  check('bấm "Về ngày hôm nay" → chấm lại được', await dem('[id^="att-dong-"] button') > 0);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

// ===========================================================================
// Góp ý của trường 06/10 (mục 2): "Giáo viên" đứng đầu, rồi từng nhóm gập
// sẵn; bấm người là chụp — lần một vào, lần hai ra; "cần gọi xác nhận" bấm là
// gọi được phụ huynh.
console.log('\n[8] Văn phòng: Giáo viên & nhân viên đứng đầu, nhóm gập sẵn, chụp hai lần, gọi một chạm');
{
  await dangNhap('htruong', 'quantri2026');
  // Kéo mốc rà soát về 06:00 — mốc sớm nhất máy chủ nhận (GIO_RA_SOAT_SOM_NHAT,
  // routes/attendance.js) — để bảng "cần gọi xác nhận" có bé ngay bây giờ. Chạy
  // bài lúc 0h–6h sáng giờ Việt Nam thì bảng ĐÚNG LÀ chưa hiện: chưa tới giờ rà
  // soát thì chưa ai cần gọi. Khung giờ ấy đo đúng điều đó, không đo nút Gọi.
  const MOC_RA_SOAT = '06:00';
  const MOC_RA_SOAT_CHU = '6h';
  await goiApi('/api/attendance/cai-dat', { gioRaSoat: MOC_RA_SOAT }, ckQT, 'PUT');
  let truocMoc = ngay.bayGio() < MOC_RA_SOAT;   // đọc TRƯỚC khi màn hỏi bảng rà soát
  loiJs = [];
  await moMan('#/attendance');
  check('có mục "Giáo viên & nhân viên"', await dem('#att-nv') === 1);
  const thuTu = await page.evaluate(() => {
    const nv = document.getElementById('att-nv');
    const nhom = [...document.querySelectorAll('#view details.card')].filter(d => d.id !== 'att-nv');
    return { nvTruoc: !!nv && nhom.length > 0 && !!(nv.compareDocumentPosition(nhom[0]) & Node.DOCUMENT_POSITION_FOLLOWING), soNhom: nhom.length };
  });
  check('mục Giáo viên đứng TRƯỚC các nhóm', thuTu.nvTruoc, thuTu);
  check('mọi nhóm GẬP SẴN — không bày cả trăm tên ra màn', await dem('#view details.card[open]') === 0, await dem('#view details.card[open]'));

  // Chụp cô t1: lần một giờ vào, lần hai giờ ra.
  await page.click('#att-nv summary');
  await page.waitForTimeout(300);
  await page.click('#att-nv [data-chup-nv="t1"].btn');
  await page.waitForTimeout(1800);
  const sau1 = await page.locator('#att-nv-t1').innerText();
  check('chụp lần một: dưới tên hiện GIỜ VÀO', /Vào \d{2}:\d{2}/.test(sau1) && !/Ra \d/.test(sau1), sau1);
  check('nút đổi thành "Chụp ảnh ra"', /Chụp ảnh ra/.test(sau1), sau1);
  await page.click('#att-nv [data-chup-nv="t1"].btn');
  await page.waitForTimeout(1800);
  const sau2 = await page.locator('#att-nv-t1').innerText();
  check('chụp lần hai: hiện thêm GIỜ RA', /Vào \d{2}:\d{2}/.test(sau2) && /Ra \d{2}:\d{2}/.test(sau2), sau2);
  check('đủ vào và ra thì không còn nút chụp', await dem('#att-nv [data-chup-nv="t1"].btn') === 0);
  check('người chụp KHÔNG thấy ảnh khuôn mặt của cô (chỉ tên và giờ)', await dem('#att-nv img') === 0, await dem('#att-nv img'));

  // Gọi xác nhận một chạm.
  // Đồng hồ vừa qua 06:00 trong lúc chạy mục này thì bảng đã nạp trước mốc:
  // nạp lại trang cho bảng nạp sau mốc, rồi đo như khung giờ sau. (moMan tới
  // đúng địa chỉ đang mở thì trình duyệt không nạp lại gì cả.)
  if (truocMoc && ngay.bayGio() >= MOC_RA_SOAT) {
    truocMoc = false;
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
  }
  const nutGoi = await dem('[data-goi-be]');
  if (truocMoc) {
    console.log(`  (giờ Việt Nam hiện là ${ngay.bayGio()} — trước ${MOC_RA_SOAT} giờ VN — phần nút Gọi kiểm ở khung giờ sau)`);
    const man = await chu();
    check(`chưa tới mốc rà soát: màn nói "Sáng nay còn đang điểm danh", chốt lúc ${MOC_RA_SOAT_CHU}`,
      /Sáng nay còn đang điểm danh/.test(man) && man.includes(`chốt lúc ${MOC_RA_SOAT_CHU}.`), man.slice(0, 600));
    check('chưa tới mốc rà soát: chưa có bảng "cần gọi xác nhận", không nút Gọi nào',
      nutGoi === 0 && !/Cần gọi xác nhận/.test(man), nutGoi);
  } else {
    check('bảng "cần gọi xác nhận" có nút Gọi cạnh từng bé', nutGoi > 0, nutGoi);
    if (nutGoi > 0) {
      // Khối "Cần gọi xác nhận" gập sẵn từ Đ241f (góp ý 20/10, D1).
      await page.click('#att-can-goi > summary');
      await page.locator('[data-goi-be]').first().click();
      await page.waitForTimeout(1200);
      check('bấm Gọi mở số của gia đình kèm nút gọi thật (tel:)', await dem('#modal-overlay a[href^="tel:"]') > 0,
        await page.locator('#modal-overlay').innerText().catch(() => ''));
      await page.evaluate(() => UI.closeModal());
    }
  }

  // Chụp lần hai cho BÉ = ra về.
  const beCoMat = await page.evaluate(() => {
    const r = (App.views.attendance._roster || []).find(x => x.record && ['present', 'late'].includes(x.record.status) && !x.record.checkOut);
    return r ? r.student.id : null;
  });
  check('(đối chứng) có một bé đã vào lớp mà chưa về', !!beCoMat);
  if (beCoMat) {
    await page.evaluate((id) => { document.getElementById(`att-dong-${id}`).closest('details').open = true; }, beCoMat);
    // Đ242D: bấm tên lần hai → chụp → màn xem lại "Ra về" → xác nhận.
    // Bé có mặt mà chưa có ảnh tới lớp thì màn hỏi ảnh nào trước (vòng rà Đ232).
    await page.locator(`#att-dong-${beCoMat} button.att-ten`).click();
    await page.waitForTimeout(600);
    if (await dem('#att-cn-ve')) await page.locator('#att-cn-ve').click();
    await page.waitForSelector('#att-xl-ok', { timeout: 5000 });
    await page.locator('#att-xl-ok', { hasText: 'Ra về' }).click();
    await page.waitForTimeout(1800);
    const dong = await page.locator(`#att-dong-${beCoMat}`).innerText();
    check('bé đã vào lớp: chụp ảnh lần hai là GHI RA VỀ', /Ra về \d{2}:\d{2}/.test(dong), dong);
  }
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

// ===========================================================================
// Góp ý 16/10 (phía phụ huynh, mục 2): *"Chưa thấy update hình ảnh con check
// out tại trường, chỉ ghi nhận thông báo"*. Máy chủ đã lưu ảnh ra về từ Đ210
// và báo gia đình "xem ảnh trong Điểm danh" — nhưng màn của gia đình chưa vẽ.
console.log('\n[9] Gia đình thấy ảnh con lúc ra về ngay ở Điểm danh (góp ý 16/10, PH2)');
{
  const hn = HOM_NAY();
  const ANH_URL = `data:image/png;base64,${ANH_THU.toString('base64')}`;
  const ckCo = await dnApi('giaovien', '123456');
  const toi = await goiApi('/api/attendance/anh', { studentId: maBeAn, date: hn, anh: ANH_URL }, ckCo);
  check('(đối chứng) cô gắn được ảnh tới lớp cho bé An', toi.status === 201 && !!toi.data.file, toi.data);
  // GIỜ RA 23:5x CHỨ KHÔNG PHẢI MỘT GIỜ CHIỀU CỐ ĐỊNH (Đ253). Ngày không có
  // dòng mẫu (thứ Bảy, Chủ nhật) thì giờ vào của bé là lúc bài này chạy, và
  // máy chủ nay từ chối giờ ra sớm hơn giờ vào — "16:40" làm bài này đỏ mỗi
  // lần chạy cuối tuần sau 16h40.
  const ve = await goiApi('/api/attendance/ra-ve',
    { studentId: maBeAn, date: hn, gio: '23:59', anh: ANH_URL }, ckCo);
  const fileVe = (ve.data && ve.data.anh && ve.data.anh.file) || '';
  check('cô ghi được giờ ra về kèm ảnh cho bé An', ve.status === 200 && !!fileVe, ve.data);
  const SRC_VE = `/api/attendance/anh/${fileVe}`;

  // Ảnh ra về là của LÕI: hiện ở màn Điểm danh của gia đình, và hộp ngày
  // không có dấu vết nào của phân hệ Đón trả bé đã gỡ.
  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/attendance');
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  const dongHn = page.locator(`#view .list-row[onclick*="'${hn}'"]`);
  check('(đối chứng) có dòng của hôm nay trong "Bản ghi gần nhất"', await dongHn.count() === 1, await dongHn.count());
  check('dòng hôm nay có ẢNH NHỎ LÚC RA VỀ, trỏ đường có canh quyền',
    await dongHn.locator(`img[alt="Ảnh con lúc ra về"][src="${SRC_VE}"]`).count() === 1,
    await dongHn.innerHTML().catch(() => ''));
  check('…đứng cạnh ảnh nhỏ lúc tới lớp', await dongHn.locator('img[alt="Ảnh con tới lớp"]').count() === 1);
  await dongHn.click();
  await page.waitForSelector('.modal', { timeout: 5000 });
  const hop = await page.locator('.modal').innerText();
  check('hộp ngày có chú thích "Ảnh con tới lớp" và "Ảnh con lúc ra về"',
    /Ảnh con tới lớp/.test(hop) && /Ảnh con lúc ra về/.test(hop), hop.slice(0, 300));
  check('kèm giờ ra về cô đã ghi', /Giờ ra về\s*23:59/.test(hop), hop.slice(0, 300));
  const anhVeHop = page.locator(`.modal img[src="${SRC_VE}"]`);
  check('hộp có thẻ ảnh ra về trỏ /api/attendance/anh/<tệp>', await anhVeHop.count() === 1);
  await page.waitForTimeout(300);
  check('ảnh ra về hiện ra thật (tải về được, không vỡ)',
    await anhVeHop.evaluate(el => el.complete && el.naturalWidth > 0).catch(() => false));
  const taiVe = await page.evaluate(async (src) => (await fetch(src)).status, SRC_VE);
  check('gia đình tải ảnh ra về: 200', taiVe === 200, taiVe);
  check('hộp ngày KHÔNG có nửa Trả bé của phân hệ đã gỡ', !/Trả bé|Về với/.test(hop), hop.slice(0, 300));
  await page.evaluate(() => UI.closeModal());
  const lac = await goiApi(SRC_VE, null, await dnApi('phuhuynh2', '123456'));
  check('gia đình KHÁC không mở được ảnh ra về của bé An (403/404)', [403, 404].includes(lac.status), lac.status);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  // CHẠM THÔNG BÁO LÀ THẤY NGAY ẢNH. Đang xem bé kia cũng vậy: thông báo
  // chọn đúng bé rồi mở thẳng hộp của ngày hôm đó.
  const tin = ((await page.evaluate(() => API.get('/api/notifications/rieng-be'))) || [])
    .find(n => n.title === 'Con đã được đón về' && n.studentId === maBeAn);
  check('thông báo "Con đã được đón về" trỏ thẳng tới ngày hôm đó, kèm mã của bé',
    !!tin && tin.hash === `#/attendance/${hn}/${maBeAn}`, tin && tin.hash);
  await page.evaluate(() => App.setStudent(App.state.students.find(s => s.name !== 'Nguyễn Bảo An').id));
  await page.waitForTimeout(800);
  await moMan('#/notifications');
  await page.locator('#view .list-row', { hasText: 'Con đã được đón về' }).first().click();
  await page.waitForSelector('.modal', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const hopTb = await page.locator('.modal').innerText().catch(() => '');
  check('chạm thông báo → hộp ngày của bé An mở sẵn, có ảnh lúc ra về',
    await dem(`.modal img[src="${SRC_VE}"]`) === 1 && /Ảnh con lúc ra về/.test(hopTb), hopTb.slice(0, 200));
  check('…và địa chỉ trở về #/attendance (đổi tháng không bật lại hộp)',
    await page.evaluate(() => location.hash) === '#/attendance');
  await page.evaluate(() => UI.closeModal());
  await page.locator('button[aria-label="Tháng trước"]').click();
  await page.waitForTimeout(1000);
  check('lùi một tháng: không hộp nào tự bật lên', await dem('.modal') === 0);

  // CHẠM TIN ĐẨY trên điện thoại (Đ239-vá4): service worker chỉ mở địa chỉ
  // trong tin, không chọn bé như màn Thông báo. Nhà hai con đang để bé Nam mà
  // tin là của bé An thì chính địa chỉ phải chọn bé An.
  const maBeNam = await page.evaluate(() => (App.state.students.find(s => s.name === 'Nguyễn Bảo Nam') || {}).id);
  const dangXem = () => page.evaluate(() => App.currentStudent().id);
  const moDiaChi = async (h) => {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForSelector('.modal', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
  };
  await page.evaluate((id) => App.setStudent(id), maBeNam);
  await page.waitForTimeout(800);
  check('(đối chứng) đang xem bé Nam', !!maBeNam && await dangXem() === maBeNam);
  await moDiaChi(`#/attendance/${hn}/${maBeAn}`);
  check('mở địa chỉ của tin đẩy khi đang xem bé Nam → hộp ngày của bé An, có ảnh lúc ra về',
    await dem(`.modal img[src="${SRC_VE}"]`) === 1, (await page.locator('.modal').innerText().catch(() => '')).slice(0, 200));
  check('…màn đã chuyển sang bé An',
    await dangXem() === maBeAn && /Nguyễn Bảo An/.test(await page.locator('.student-chip.active').innerText().catch(() => '')));
  check('…và địa chỉ trở về #/attendance', await page.evaluate(() => location.hash) === '#/attendance');
  await page.evaluate(() => UI.closeModal());

  // Địa chỉ cũ (thông báo đã gửi trước bản này) vẫn mở hộp của bé đang xem.
  await moDiaChi(`#/attendance/${hn}`);
  check('địa chỉ cũ #/attendance/<ngày> vẫn mở hộp ngày của bé đang xem',
    await dangXem() === maBeAn && await dem(`.modal img[src="${SRC_VE}"]`) === 1);
  await page.evaluate(() => UI.closeModal());

  // Mã của bé nhà khác: bỏ qua phần mã, không hỏi máy chủ gì về bé ấy.
  await page.evaluate((id) => App.setStudent(id), maBeNam);
  await page.waitForTimeout(800);
  const hoiBeLa = [];
  const ngheHoi = (r) => { if (/[?&]studentId=s3\b|\/s3\b/.test(r.url())) hoiBeLa.push(r.url()); };
  page.on('request', ngheHoi);
  loiJs = [];
  await moDiaChi(`#/attendance/${hn}/s3`);
  page.off('request', ngheHoi);
  check('mã bé nhà khác: màn vẫn ở bé Nam', await dangXem() === maBeNam, await dangXem());
  check('…không hỏi máy chủ dữ liệu nào của bé ấy', hoiBeLa.length === 0, hoiBeLa);
  check('…không mở hộp nào có ảnh của bé An', await dem(`.modal img[src="${SRC_VE}"]`) === 0);
  check('…không lỗi JavaScript', loiJs.length === 0, loiJs);
  await page.evaluate(() => UI.closeModal());
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

// ===========================================================================
// Góp ý 16/10, mục 2 + 3: *"lồng ghép vào trong mục điểm danh và xuất báo cáo
// điểm danh luôn"*. Màn Điểm danh của NHÀ TRƯỜNG chỉ đường sang hai màn ấy.
console.log('\n[10] Nhà trường: thẻ "Báo cáo" trên màn Điểm danh');
{
  await batTat('tienan', true);
  await dangNhap('htruong', 'quantri2026');
  loiJs = [];
  await moMan('#/attendance');
  const the = page.locator('#att-bao-cao');
  check('văn phòng thấy thẻ "Báo cáo"', await the.count() === 1 && /Báo cáo/.test(await the.innerText()));
  const coXbc = await page.evaluate(() => App.moduleEnabled('xuatbaocao'));
  check('lối "Xuất báo cáo điểm danh (Excel)" có đúng khi phân hệ Xuất báo cáo đang bật',
    await the.locator('button', { hasText: 'Xuất báo cáo điểm danh (Excel)' }).count() === (coXbc ? 1 : 0), coXbc);
  const nutTa = the.locator('button', { hasText: 'Đối chiếu tiền ăn tháng' });
  check('có lối "Đối chiếu tiền ăn tháng"', await nutTa.count() === 1);
  if (await nutTa.count() === 1) await nutTa.click();
  await page.waitForTimeout(800);
  check('bấm → sang màn tiền ăn', await page.evaluate(() => location.hash) === '#/tienan');
  await moMan('#/attendance');
  const nhoQua = await page.evaluate(() => [...document.querySelectorAll('#att-bao-cao button')]
    .map(b => b.getBoundingClientRect()).filter(r => r.height < 32 || r.right > window.innerWidth).length);
  check('nút trong thẻ đủ lớn và không tràn khổ điện thoại', nhoQua === 0, nhoQua);

  // Không lối nào bật thì không vẽ thẻ rỗng.
  await batTat('tienan', false);
  await batTat('xuatbaocao', false);
  await dangNhap('htruong', 'quantri2026');
  await moMan('#/attendance');
  check('tắt cả hai phân hệ → không còn thẻ "Báo cáo"', await dem('#att-bao-cao') === 0);
  check('…mà màn Điểm danh vẫn dựng đủ', await dem('#att-nv') === 1);
  await batTat('tienan', true);
  if (coXbc) await batTat('xuatbaocao', true);

  await dangNhap('giaovien', '123456');
  await moMan('#/attendance');
  check('cô KHÔNG thấy thẻ "Báo cáo"', await dem('#att-bao-cao') === 0);
  await dangNhap('phuhuynh', '123456');
  await moMan('#/attendance');
  check('gia đình KHÔNG thấy thẻ "Báo cáo" (dù phân hệ tiền ăn mở cho gia đình)',
    await page.evaluate(() => App.moduleEnabled('tienan')) && await dem('#att-bao-cao') === 0);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

check('không có lỗi JavaScript nào còn sót', loiJs.length === 0, loiJs);
await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
