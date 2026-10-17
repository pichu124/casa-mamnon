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
// BÀI ĐƯỢC VIẾT LẠI ĐỂ ĐO THIẾT KẾ MỚI, KHÔNG PHẢI BỊ XOÁ ĐI CHO XANH. Mọi
// bảo đảm cũ còn đúng đều giữ nguyên, chỉ đổi chỗ đo:
//
//   1. CÔ KHÔNG MẤT CỬA NÀO. Trước Đ210 ô "Đón trả bé" bị ẩn khỏi trang chủ
//      của cô vì màn Điểm danh đã vẽ nó. Nay màn Điểm danh KHÔNG vẽ nữa, nên
//      ô ấy phải QUAY LẠI — quên gỡ cờ `gopVao` là cô mất hẳn lối vào sổ đón
//      trả, im lặng. Mục [1] và [6].
//   2. TẮT PHÂN HỆ THÌ ĐIỂM DANH VẪN CHẠY, và tệp giao diện của phân hệ hỏng
//      cũng không kéo theo Điểm danh — nay còn chặt hơn trước, vì màn Điểm
//      danh không còn chạm vào phân hệ ở đâu cả. Mục [4] và [5].
//   3. GIA ĐÌNH VẪN THẤY CẢ HAI NỬA của một ngày. Mục [3].
//   4. SỔ ĐÓN TRẢ GHI TẠI CHỖ, KHÔNG BỊ NÉM VỀ ĐẦU DANH SÁCH — nay ở màn riêng
//      của phân hệ (`#/dontra`) thay vì trong tab. Mục [1].
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai, MAU, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('diem-danh-tra-be');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['nhatky', 'dontra', 'thuchup']);
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

// ===========================================================================
console.log('\n[1] Cô một nhóm: MỘT dòng Vào/Ra, và sổ đón trả ở màn riêng ghi tại chỗ');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/attendance');
  // DẢI TAB ĐÃ GỠ (Đ210). Trước đợt ấy chỗ này đòi đúng hai tab.
  check('KHÔNG còn dải hai phần Đón bé / Trả bé', await dem('#att-tab') === 0, await dem('#att-tab'));
  check('màn vẫn có ô đếm và danh sách chấm như trước',
    await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  check('vẫn có nút "Chụp ảnh con tới lớp" (ảnh check-in)', /Chụp ảnh con tới lớp/.test(await chu()));
  // MỘT DÒNG MANG CẢ HAI NỬA CỦA NGÀY.
  check('mỗi dòng bé có nút "Ghi con đã về" — nửa thứ hai nằm ngay trên dòng',
    /Ghi con đã về/.test(await chu()), (await chu()).slice(0, 300));
  check('CHỈ MỘT ô ngày trên màn', await dem('#view input[type=date]') === 1);

  // ĐƯỜNG DẪN CŨ KHÔNG ĐƯỢC CHẾT. Điện thoại đã cài app còn giữ nó trong lịch
  // sử, và một liên kết chết là cô bấm vào thấy trang trắng.
  await moMan('#/attendance/tra');
  check('#/attendance/tra lặng lẽ về màn gộp, không trang trắng',
    await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  check('…và không có ô sự cố nào', await dem('#att-tra') === 0);
  await doBoCuc('Điểm danh gộp');

  // SỔ ĐÓN TRẢ NAY Ở MÀN RIÊNG CỦA PHÂN HỆ — cô vẫn tới được và vẫn ghi tại chỗ.
  await moMan('#/dontra');
  await page.waitForSelector('[data-tra]', { timeout: 10000 });
  await page.waitForTimeout(500);
  check('cô mở được sổ đón trả ở màn riêng', await dem('[data-tra]') === MAU.soBeNhomChoi2, await dem('[data-tra]'));
  const manTra = await chu();
  check('có dòng đếm "Đã trả x / y bé"', /Đã trả \d+ \/ \d+ bé/.test(manTra), manTra.slice(0, 200));
  // Dữ liệu mẫu đã ghi trả sẵn vài bé hôm nay, nên đo bằng HIỆU SỐ, không đoán số tuyệt đối.
  const soDaTraTruoc = Number((manTra.match(/Đã trả (\d+) \//) || [])[1] || 0);
  check('thẻ bé nói "Đón bé: …" — trạng thái lúc đón đưa sang phần trả', /Đón bé:/.test(manTra));
  check('KHÔNG viết "Sáng nay" — bé học nửa buổi vào lớp đầu giờ chiều thì câu đó nói ngược',
    !/Sáng nay/.test(manTra), (manTra.match(/.{0,40}Sáng nay.{0,40}/) || [])[0]);
  check('không còn nhãn "Chưa trả" cam — bé chờ đón là "Còn ở lớp"', !/Chưa trả/.test(manTra) && /Còn ở lớp|Đã trả|Nghỉ hôm nay/.test(manTra));
  check('không lộ tiếng tiểu học ở sổ đón trả', !XAU.test(manTra), (manTra.match(XAU) || [])[0]);
  await doBoCuc('Sổ đón trả');

  maBeAn = await page.evaluate(async () => {
    const d = await API.get('/api/students');
    const ds = Array.isArray(d) ? d : (d.students || []);
    return (ds.find(s => s.name === 'Nguyễn Bảo An') || {}).id || '';
  });
  check('tìm được thẻ của bé An', !!maBeAn && await dem(`#dt-the-${maBeAn}`) === 1, maBeAn);

  // Bấm vào ẢNH người đón → hộp ghi mở với đúng người đó chọn sẵn.
  const nutAnh = page.locator(`#dt-the-${maBeAn} [data-chon-nguoi]`).first();
  check('thẻ bé An có ảnh người đón bấm được (dữ liệu mẫu đã khai người đón quen)', await nutAnh.count() === 1);
  const chonSan = await nutAnh.getAttribute('data-chon-nguoi');
  await nutAnh.click();
  await page.waitForSelector('#dt-ai', { timeout: 5000 });
  check('bấm ảnh → hộp ghi mở, người đó ĐÃ được chọn sẵn',
    await page.inputValue('#dt-ai') === chonSan, [chonSan, await page.inputValue('#dt-ai')]);
  await page.evaluate(() => UI.closeModal());
  await page.waitForTimeout(300);

  // TRẢ BÉ CHỈ BẰNG MỘT TẤM ẢNH (Đ128) — nút chính trên thẻ bé chưa trả.
  //
  // Đây là câu trả lời cho đúng chỗ người dùng vấp hai lần: nút chụp trước đây
  // chỉ mọc ra SAU khi ghi sổ, nên mở màn ra là không thấy ảnh đâu.
  const theCon0 = page.locator('#dt-so .card', { has: page.locator('.badge', { hasText: 'Còn ở lớp' }) }).first();
  const maBeChup = ((await theCon0.getAttribute('id')) || '').replace(/^dt-the-/, '');
  check('bé CHƯA trả đã có sẵn nút "Chụp ảnh trả bé"', await dem(`#dt-the-${maBeChup} [data-tra-anh]`) === 1);
  const nhanNut = await page.locator(`#dt-the-${maBeChup} [data-tra-anh]`).innerText();
  check('nút đó nói đúng việc cô làm ở cổng', /Chụp ảnh trả bé/.test(nhanNut), nhanNut);
  check('và vẫn còn đường gõ tên khi cần', await dem(`#dt-the-${maBeChup} [data-tra]`) === 1);

  await page.locator(`#dt-the-${maBeChup} [data-tra-anh]`).click();
  await page.waitForTimeout(2500);
  const theSauChup = await page.locator(`#dt-the-${maBeChup}`).innerText();
  const soDaTraSau = Number(((await page.locator('#dt-tong').innerText()).match(/Đã trả (\d+) \//) || [])[1] || 0);
  check('dòng đếm tăng đúng một mà không tải lại trang', soDaTraSau === soDaTraTruoc + 1, [soDaTraTruoc, soDaTraSau]);
  check('CHỤP MỘT TẤM LÀ GHI SỔ LUÔN — không phải gõ tên',
    /Đã trả/.test(theSauChup) && /xác nhận bằng ảnh/i.test(theSauChup), theSauChup.slice(0, 250));
  check('thẻ hiện ảnh vừa chụp, kèm "đã gửi cho gia đình"',
    await dem(`#dt-the-${maBeChup} img[src^="/api/dontra/anh/"]`) === 1
      && /đã gửi cho gia đình/i.test(theSauChup), theSauChup.slice(0, 250));
  check('KHÔNG có hộp thoại nào phải bấm qua', await dem('#modal-overlay') === 0);
  check('vẫn sửa lại được người đã đón nếu cô muốn ghi rõ tên',
    await dem(`#dt-the-${maBeChup} [data-tra]`) === 1);

  // Đường ghi thường: nút "Ghi tên người đón" → hộp → Ghi vào sổ.
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(200);
  await page.locator(`[data-tra="${maBeAn}"]`).click();
  await page.waitForSelector('#dt-luu', { timeout: 5000 });
  await page.fill('#dt-ghichu', 'Đối chiếu ảnh ở cổng');
  await page.click('#dt-luu');
  await page.waitForTimeout(1500);
  loiJs.length === 0 || console.log('  lỗi JS:', loiJs);

  // GHI XONG THÌ APP CHỈ NGAY VÀO NÚT CHỤP. Nút chụp cố ý chỉ hiện sau khi ghi
  // (chụp là chụp khoảnh khắc trao bé), nên nếu app không nhắc thì cô mở màn
  // ra, thấy thẻ bé chưa trả không có nút chụp nào, và kết luận phần này chưa
  // làm được ảnh — người dùng thử đã vấp đúng chỗ đó.
  const nhac = await page.locator('#toast-zone .toast').last().innerText().catch(() => '');
  check('ghi xong → có dòng nhắn chỉ đường tới nút chụp ảnh', /Chụp ảnh lúc trả bé/.test(nhac), nhac);
  check('nút chụp của bé đó được viền sáng cho dễ thấy',
    await page.locator(`#dt-the-${maBeAn} [data-anh-tra]`).evaluate(el => !!el.style.outline).catch(() => false));

  // NHẮC BẰNG DÒNG NHẮN, KHÔNG BẰNG HỘP THOẠI.
  //
  // Hộp thoại của app không tự đóng khi đi màn khác, nên một lời mời dạng hộp
  // thoại là một lớp phủ chặn mọi thao tác ở màn sau. Bản đầu của Đ126b làm
  // đúng vậy và `test:bien-soan-phan-he` chết đứng vì lớp phủ ấy.
  check('KHÔNG để lại hộp thoại nào chặn màn hình sau khi ghi', await dem('#modal-overlay') === 0);

  const the = await page.locator(`#dt-the-${maBeAn}`).innerText();
  check('GHI XONG THẺ BÉ ĐỔI TẠI CHỖ: "Sửa lại người đã đón" + ghi chú vừa gõ',
    /Sửa lại người đã đón/.test(the) && /Đối chiếu ảnh ở cổng/.test(the), the.slice(0, 250));
  check('hộp thoại đã đóng', await dem('#modal-overlay') === 0);
  check('đường dẫn vẫn là #/dontra — ghi xong không bị ném đi đâu', await page.evaluate(() => location.hash) === '#/dontra');
  check('sau khi ghi có nút "Chụp ảnh lúc trả bé" (ảnh check-out) ngay trong thẻ',
    await dem(`#dt-the-${maBeAn} [data-anh-tra]`) === 1);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  // CÔ PHẢI CÓ LỐI VÀO SỔ TỪ TRANG CHỦ. Trước Đ210 ô này bị ẩn khỏi trang chủ
  // của cô vì màn Điểm danh đã vẽ sổ; nay màn Điểm danh không vẽ nữa, nên
  // quên gỡ cờ `gopVao` là cô mất hẳn lối vào — im lặng, không báo gì.
  await moMan('#/');
  await page.waitForTimeout(800);
  const oCuaCo = await page.locator('.tile-label').allInnerTexts();
  check('CÔ THẤY LẠI Ô "Đón trả bé" TRÊN TRANG CHỦ', oCuaCo.includes('Đón trả bé'), oCuaCo);
}

// ===========================================================================
console.log('\n[2] Cô nhiều nhóm: đổi nhóm ở sổ đón trả thì danh sách đổi theo');
{
  await dangNhap('giaovien3', '123456');
  loiJs = [];
  await moMan('#/dontra');
  await page.waitForSelector('[data-tra]', { timeout: 10000 });
  const cacNhom = await page.evaluate(() => (App.state.user.nhomCuaCo || []).map(n => n.id));
  check('cô này phụ trách hơn một nhóm', cacNhom.length >= 2, cacNhom);
  const lac = await page.evaluate(() => {
    const cuaCo = new Set(App.state.user.classIds || []);
    const cuaTruong = new Set((App.state.classes || []).map(c => c.id));
    return [...document.querySelectorAll('#view select option')].map(o => o.value).filter(v => cuaTruong.has(v) && !cuaCo.has(v));
  });
  check('ô chọn nhóm KHÔNG mời cô sang nhóm không phụ trách', lac.length === 0, lac);
  const nhomHai = cacNhom[1];
  const tenNhomHai = await page.evaluate(async (id) => {
    const d = await API.get('/api/students');
    const ds = Array.isArray(d) ? d : (d.students || []);
    return ds.filter(s => s.classId === id).map(s => s.name);
  }, nhomHai);
  await page.selectOption('#view select', nhomHai);
  await page.waitForTimeout(1200);
  await page.waitForSelector('[data-tra]', { timeout: 10000 });
  const man = await chu();
  check('đổi nhóm → vẫn ở sổ đón trả', await page.evaluate(() => location.hash) === '#/dontra');
  check('sổ hiện đúng bé của nhóm vừa chọn',
    tenNhomHai.length > 0 && tenNhomHai.every(t => man.includes(t)), { tenNhomHai, man: man.slice(0, 200) });
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

// ===========================================================================
console.log('\n[3] Gia đình: một ngày của con có cả hai nửa trong một hộp');
{
  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/attendance');
  // Nhà này có hai con — chọn đúng bé An, bé cô vừa ghi sổ ở mục [1].
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  const hn = await homNay();
  check('lịch tháng có chấm "có ghi sổ trả bé" cho hôm nay', await dem('.att-cal .dot.tra') >= 1);
  check('chú thích lịch có mục "Có ghi sổ trả bé"', /Có ghi sổ trả bé/.test(await chu()));
  check('có nút chỉ đường sang Đón trả bé (khai người đón, uỷ quyền)', /Mở Đón trả bé/.test(await chu()));
  await page.evaluate((d) => App.views.attendance.showDay(d), hn);
  await page.waitForSelector('.modal', { timeout: 5000 });
  const hop = await page.locator('.modal').innerText();
  check('hộp chi tiết ngày có nửa "Trả bé"', /Trả bé/i.test(hop), hop.slice(0, 300));
  check('nói rõ về với ai, kèm ghi chú cô ghi', /Về với/.test(hop) && /Đối chiếu ảnh ở cổng/.test(hop), hop.slice(0, 300));
  check('nửa Đón bé vẫn còn (Giờ đến lớp / Giờ ra về)', /Giờ đến lớp/.test(hop) && /Giờ ra về/.test(hop));
  check('không nói hộ gia đình "đã xem / đã thấy" ảnh', !/đã thấy|đã xem/i.test(hop));
  await page.evaluate(() => UI.closeModal());

  // HỎI HỎNG THÌ LÀ RỖNG, KHÔNG PHẢI LÀ SỔ CỦA BÉ TRƯỚC.
  //
  // Bảng nhớ sổ trả bé của phân hệ chỉ nhớ MỘT bé. Nếu nó chỉ được thay sau
  // khi máy chủ trả lời, thì một lần hỏi hỏng (mất sóng, 403, máy chủ đời cũ)
  // là hộp chi tiết ngày của bé đang xem hiện tên người đón của bé trước đó —
  // nhà hai con thấy sai ngay, máy dùng chung thì là dữ liệu nhà khác.
  const roRi = await page.evaluate(async (ma) => {
    const v = App.views.dontra;
    const hn = UI.todayStr();
    await v.napSoThang(ma, hn.slice(0, 7));
    const truoc = (v.htmlTraBeCuaNgay(hn) || '').length;
    let nem = false;
    try { await v.napSoThang('khong-co-be-nay', hn.slice(0, 7)); } catch (_) { nem = true; }
    return { truoc, sau: (v.htmlTraBeCuaNgay(hn) || '').length, nem };
  }, maBeAn);
  check('đối chứng: nạp được sổ của bé này thì có nội dung', roRi.truoc > 0, roRi);
  check('lần hỏi sau bị từ chối thật (không phải bài tự cho mình qua)', roRi.nem === true, roRi);
  check('HỎI HỎNG → sổ RỖNG, không giữ lại dòng trả bé của bé trước', roRi.sau === 0, roRi);

  await page.locator('button[aria-label="Tháng trước"]').click();
  await page.waitForTimeout(1000);
  check('lùi một tháng vẫn dựng bình thường, không lỗi', await dem('.att-cal') === 1 && loiJs.length === 0, loiJs);
}

// ===========================================================================
console.log('\n[4] Tắt phân hệ Đón trả bé → Điểm danh y hệt trước, không dấu vết Trả bé');
{
  await batTat('dontra', false);
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/attendance');
  check('KHÔNG có dải hai phần', await dem('#att-tab') === 0);
  check('màn Điểm danh đầy đủ', await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2);
  check('…và vẫn có nút ghi con đã về (việc của LÕI, không phụ thuộc phân hệ)',
    /Ghi con đã về/.test(await chu()), (await chu()).slice(0, 200));
  await moMan('#/attendance/tra');
  check('#/attendance/tra lặng lẽ về màn gộp, không ô sự cố', await dem('#att-so-da') === 1 && await dem('#att-tra') === 0);
  await moMan('#/');
  await page.waitForTimeout(800);
  const nhanO = await page.locator('.tile-label').allInnerTexts();
  check('trang chủ cô không có ô Đón trả bé (phân hệ đang tắt)', !nhanO.includes('Đón trả bé'), nhanO);

  await dangNhap('phuhuynh', '123456');
  await moMan('#/attendance');
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  check('gia đình: lịch không có chấm trả bé, không nút chỉ đường', await dem('.att-cal .dot.tra') === 0 && !/Mở Đón trả bé/.test(await chu()));
  await page.evaluate((d) => App.views.attendance.showDay(d), await homNay());
  await page.waitForTimeout(500);
  const coHop = await dem('.modal');
  const hop = coHop ? await page.locator('.modal').innerText() : '';
  check('hộp chi tiết (nếu hôm nay có dòng điểm danh) không có nửa Trả bé', !/Trả bé|Về với/.test(hop), hop.slice(0, 200));
  await page.evaluate(() => UI.closeModal());
  check('không lỗi JavaScript khi phân hệ tắt', loiJs.length === 0, loiJs);
  await batTat('dontra', true);
}

// ===========================================================================
console.log('\n[5] Tệp giao diện của phân hệ hỏng → màn Điểm danh KHÔNG hề hấn gì');
{
  // BẢO ĐẢM NÀY NAY CHẶT HƠN TRƯỚC Đ210, chứ không lỏng đi.
  //
  // Trước: màn Điểm danh vẽ tab Trả bé bằng mã của phân hệ, nên phân hệ hỏng
  // thì ô ấy phải tự nói "đang gặp sự cố" — tức màn Điểm danh vẫn phải BIẾT
  // xử lý một phân hệ hỏng. Nay màn Điểm danh không chạm vào phân hệ ở đâu
  // cả, nên phép kiểm đúng là: hỏng phân hệ thì Điểm danh dựng Y HỆT bình
  // thường, không một dấu vết nào.
  await dangNhap('giaovien', '123456');
  await moMan('#/attendance');
  loiJs = [];
  // Giả lập đúng thứ xảy ra khi view.js của phân hệ lỗi cú pháp: loadScript
  // bắt lỗi và App.views.dontra không tồn tại.
  await page.evaluate(() => { delete App.views.dontra; App.route(); });
  await page.waitForTimeout(1200);
  const man = await chu();
  check('màn Điểm danh dựng ĐỦ như bình thường',
    await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  check('không có ô sự cố nào trên màn Điểm danh', !/đang gặp sự cố/.test(man), man.slice(0, 200));
  check('không rơi vào màn "Có lỗi xảy ra" chung', !/Có lỗi xảy ra/.test(man));
  check('nút ghi con đã về vẫn dùng được (việc của lõi)', /Ghi con đã về/.test(man));
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  await dangNhap('phuhuynh', '123456');
  await moMan('#/attendance');
  await page.evaluate(() => { delete App.views.dontra; });
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  loiJs = [];
  check('gia đình: lịch vẫn lên khi phân hệ hỏng', await dem('.att-cal') === 1);
  await page.evaluate((d) => App.views.attendance.showDay(d), await homNay());
  await page.waitForTimeout(400);
  check('hộp ngày vẫn mở được (nếu có dòng), không lỗi JavaScript', loiJs.length === 0, loiJs);
  await page.evaluate(() => UI.closeModal());
}

// ===========================================================================
console.log('\n[6] Trang chủ: cô chỉ còn một cửa, gia đình và văn phòng không mất cửa nào');
{
  await dangNhap('giaovien', '123456');
  await moMan('#/');
  await page.waitForSelector('.viec-nut', { timeout: 10000 });
  const nhanO = await page.locator('.tile-label').allInnerTexts();
  // ĐỔI CHIỀU SAU Đ210: màn Điểm danh không vẽ sổ nữa, nên ô này PHẢI có lại.
  // Giữ nguyên phép kiểm cũ là ghim đúng cái bẫy làm cô mất lối vào sổ.
  check('cô: CÓ ô "Đón trả bé" trên lưới (màn Điểm danh không vẽ sổ nữa)', nhanO.includes('Đón trả bé'), nhanO);
  check('cô: vẫn có ô Điểm danh', nhanO.includes('Điểm danh'));
  check('cô: lưới vẫn đủ ô khác', nhanO.length >= 8, nhanO.length);
  const nutViec = page.locator('.viec-nut', { hasText: 'Đón trả bé' });
  check('cô: nút việc "Đón trả bé" vẫn có trong bảng Hôm nay', await nutViec.count() === 1);
  await nutViec.click();
  await page.waitForTimeout(1200);
  check('bấm nút việc → mở được sổ đón trả, không trang trắng', await dem('[data-tra]') >= 1,
    await page.evaluate(() => location.hash));

  await dangNhap('phuhuynh', '123456');
  await moMan('#/');
  const nhanPH = await page.locator('.tile-label').allInnerTexts();
  check('gia đình: VẪN có ô "Đón trả bé" — để đọc sổ đón trả của con', nhanPH.includes('Đón trả bé'), nhanPH);
  await moMan('#/dontra');
  // TỪ Đ151, GIA ĐÌNH KHÔNG KHAI NGƯỜI ĐÓN TRONG APP NỮA.
  //
  // Nhà trường 10/09 chọn dùng bản giấy ở văn phòng. Điều mục [6] này canh —
  // ô "Đón trả bé" của GIA ĐÌNH không bị gấp đi theo ô của cô — thì không đổi:
  // gia đình vẫn có ô riêng, chỉ là bên trong nay là sổ đón trả và một nút nhắn
  // cho văn phòng, không còn phần khai người đón.
  check('gia đình: mở ô đó KHÔNG còn phần khai người đón (Đ151)', await dem('#dt-them') === 0);
  check('mà là nút nhắn cho văn phòng', await dem('#dt-nhan-vp') === 1);
  check('và sổ đón trả của con vẫn còn', /sổ đón trả gần đây/i.test(await chu()));

  await dangNhap('htruong', 'quantri2026');
  await moMan('#/');
  const nhanVP = await page.locator('.tile-label').allInnerTexts();
  check('văn phòng: VẪN có ô "Đón trả bé"', nhanVP.includes('Đón trả bé'), nhanVP);
  await moMan('#/attendance');
  const manVP = await chu();
  check('văn phòng: Điểm danh vẫn là bảng rà soát, không có dải hai phần', await dem('#att-tab') === 0);
  check('văn phòng: có thẻ chỉ đường "Mở Đón trả bé"', /Mở Đón trả bé/.test(manVP), manVP.slice(0, 300));
  check('văn phòng: màn rà soát vẫn không có ô chọn nhóm', await dem('#view select') === 0);

  // Điểm danh TẮT → ô Đón trả bé phải quay lại cho cô, không có ngõ cụt.
  await batTat('diemdanh', false);
  await dangNhap('giaovien', '123456');
  await moMan('#/');
  await page.waitForTimeout(1200);
  const nhanSau = await page.locator('.tile-label').allInnerTexts();
  check('TẮT Điểm danh → cô CÓ LẠI ô "Đón trả bé"', nhanSau.includes('Đón trả bé'), nhanSau);
  const nutSau = page.locator('.viec-nut', { hasText: 'Đón trả bé' });
  check('…và nút việc trỏ về #/dontra', await nutSau.count() === 1 && /#\/dontra/.test(await nutSau.getAttribute('onclick') || ''),
    await nutSau.count() ? await nutSau.getAttribute('onclick') : 'không có nút');
  await moMan('#/dontra');
  check('…màn cổng vẫn mở được, và không còn nút chỉ đường về Điểm danh', await dem('[data-tra]') >= 1 && await dem('[data-mo-tra-be]') === 0);
  await batTat('diemdanh', true);
  // Danh sách phân hệ nạp lúc mở app — bật lại thì tải lại trang mới thấy, y như cô ngoài đời.
  await page.goto(`${sv.BASE}/#/`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
  await page.waitForTimeout(800);
  // Đ210: ô này KHÔNG còn gấp vào Điểm danh nữa, nên bật lại Điểm danh thì nó
  // vẫn ở đó. Trước Đ210 phép kiểm đòi điều ngược lại.
  check('BẬT LẠI Điểm danh → ô Đón trả bé VẪN CÒN (không còn gấp vào)',
    (await page.locator('.tile-label').allInnerTexts()).includes('Đón trả bé'),
    await page.locator('.tile-label').allInnerTexts());
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

  // SỔ ĐÓN TRẢ CŨNG KHOÁ NGOÀI NGÀY (Đ127b) — nhà trường chốt cùng luật.
  await page.evaluate((d) => { App.views.attendance.setDate(d); }, homQua);
  await page.waitForTimeout(600);
  // Đ210: sổ trả bé nay ở màn riêng của phân hệ, không còn là một tab của
  // Điểm danh. Luật khoá ngày của nó thì KHÔNG đổi — đó mới là thứ mục này đo.
  await page.evaluate(() => { location.hash = '#/dontra'; });
  await page.waitForTimeout(1500);
  await page.evaluate((d) => { App.views.dontra._ngay = d; App.route(); }, homQua);
  await page.waitForTimeout(1500);
  const manTraCu = await chu();
  check('phần Trả bé của ngày cũ cũng nói "Ngày này đã khoá"', /Ngày này đã khoá/.test(manTraCu), manTraCu.slice(0, 300));
  check('nói rõ đây là chỗ tra lại xem hôm đó trường trao bé cho ai',
    /trao bé cho ai/.test(manTraCu), manTraCu.slice(0, 400));
  check('KHÔNG còn nút ghi trả bé nào', await dem('[data-tra]') === 0);
  check('KHÔNG còn nút chụp hay gỡ ảnh lúc trả',
    await dem('[data-anh-tra]') === 0 && await dem('[data-go-anh-tra]') === 0);
  check('ảnh người đón KHÔNG còn bấm được để mở hộp ghi', await dem('[data-chon-nguoi]') === 0);
  check('vẫn xem lại được — có tên bé của nhóm', /Nguyễn Bảo An/.test(manTraCu), manTraCu.slice(0, 300));
  const thuTra = await page.evaluate(async (d) => {
    try {
      await API.post('/api/dontra/ghi', { studentId: 's1', ngay: d, nguonLoai: 'khac', nguoiDon: 'Ai đó' });
      return { ok: true };
    } catch (e) { return { ok: false, loi: e.message || '' }; }
  }, homQua);
  check('gọi thẳng máy chủ để ghi sổ trả cho ngày cũ vẫn bị từ chối', thuTra.ok === false, thuTra);
  check('câu từ chối là của SỔ ĐÓN TRẢ, nói bằng tiếng của trường',
    /Sổ đón trả chỉ ghi và sửa được trong chính ngày hôm đó/.test(thuTra.loi || ''), thuTra.loi);

  await page.evaluate(() => { App.views.dontra._ngay = UI.todayStr(); App.route(); });
  await page.waitForTimeout(1500);
  check('về hôm nay thì sổ đón trả ghi lại được', await dem('[data-tra]') > 0);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

// ===========================================================================
// Góp ý của trường 06/10 (mục 2): "Giáo viên" đứng đầu, rồi từng nhóm gập
// sẵn; bấm người là chụp — lần một vào, lần hai ra; "cần gọi xác nhận" bấm là
// gọi được phụ huynh.
console.log('\n[8] Văn phòng: Giáo viên & nhân viên đứng đầu, nhóm gập sẵn, chụp hai lần, gọi một chạm');
{
  await dangNhap('htruong', 'quantri2026');
  // Kéo mốc rà soát về 06:00 để bảng "cần gọi xác nhận" có bé ngay bây giờ.
  await goiApi('/api/attendance/cai-dat', { gioRaSoat: '06:00' }, ckQT, 'PUT');
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
  const nutGoi = await dem('[data-goi-be]');
  check('bảng "cần gọi xác nhận" có nút Gọi cạnh từng bé', nutGoi > 0, nutGoi);
  if (nutGoi > 0) {
    await page.locator('[data-goi-be]').first().click();
    await page.waitForTimeout(1200);
    check('bấm Gọi mở số của gia đình kèm nút gọi thật (tel:)', await dem('#modal-overlay a[href^="tel:"]') > 0,
      await page.locator('#modal-overlay').innerText().catch(() => ''));
    await page.evaluate(() => UI.closeModal());
  }

  // Chụp lần hai cho BÉ = ra về.
  const beCoMat = await page.evaluate(() => {
    const r = (App.views.attendance._roster || []).find(x => x.record && ['present', 'late'].includes(x.record.status) && !x.record.checkOut);
    return r ? r.student.id : null;
  });
  check('(đối chứng) có một bé đã vào lớp mà chưa về', !!beCoMat);
  if (beCoMat) {
    await page.evaluate((id) => { document.getElementById(`att-dong-${id}`).closest('details').open = true; }, beCoMat);
    await page.locator(`#att-dong-${beCoMat} button`, { hasText: 'Chụp ảnh ra về' }).click();
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
  const ve = await goiApi('/api/attendance/ra-ve',
    { studentId: maBeAn, date: hn, gio: '16:40', anh: ANH_URL }, ckCo);
  const fileVe = (ve.data && ve.data.anh && ve.data.anh.file) || '';
  check('cô ghi được giờ ra về kèm ảnh cho bé An', ve.status === 200 && !!fileVe, ve.data);
  const SRC_VE = `/api/attendance/anh/${fileVe}`;

  // Phân hệ Đón trả bé TẮT (đúng như trường chọn ở mục 4): ảnh vẫn hiện,
  // vì nó là của lõi, và hộp ngày không có dấu vết Trả bé nào.
  await batTat('dontra', false);
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
  check('kèm giờ ra về cô đã ghi', /Giờ ra về\s*16:40/.test(hop), hop.slice(0, 300));
  const anhVeHop = page.locator(`.modal img[src="${SRC_VE}"]`);
  check('hộp có thẻ ảnh ra về trỏ /api/attendance/anh/<tệp>', await anhVeHop.count() === 1);
  await page.waitForTimeout(300);
  check('ảnh ra về hiện ra thật (tải về được, không vỡ)',
    await anhVeHop.evaluate(el => el.complete && el.naturalWidth > 0).catch(() => false));
  const taiVe = await page.evaluate(async (src) => (await fetch(src)).status, SRC_VE);
  check('gia đình tải ảnh ra về: 200', taiVe === 200, taiVe);
  check('phân hệ Đón trả bé tắt: hộp ngày KHÔNG có nửa Trả bé', !/Trả bé|Về với/.test(hop), hop.slice(0, 300));
  await page.evaluate(() => UI.closeModal());
  const lac = await goiApi(SRC_VE, null, await dnApi('phuhuynh2', '123456'));
  check('gia đình KHÁC không mở được ảnh ra về của bé An (403/404)', [403, 404].includes(lac.status), lac.status);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  // CHẠM THÔNG BÁO LÀ THẤY NGAY ẢNH. Đang xem bé kia cũng vậy: thông báo
  // chọn đúng bé rồi mở thẳng hộp của ngày hôm đó.
  const tin = ((await page.evaluate(() => API.get('/api/notifications/rieng-be'))) || [])
    .find(n => n.title === 'Con đã được đón về' && n.studentId === maBeAn);
  check('thông báo "Con đã được đón về" trỏ thẳng tới ngày hôm đó',
    !!tin && tin.hash === `#/attendance/${hn}`, tin && tin.hash);
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

  // Phân hệ BẬT: ảnh trả bé do phân hệ ghi (máy chủ gộp vào `anhVe`) hiện ở
  // cùng chỗ trên dòng của ngày. Nửa Trả bé của phân hệ cũng tự vẽ tấm ấy
  // trong hộp ngày, nên tấm đó không được hiện hai lần.
  await batTat('dontra', true);
  const ghi = await goiApi('/api/dontra/ghi',
    { studentId: 's2', ngay: hn, nguonLoai: 'khac', nguoiDon: 'Bà ngoại', luc: '16:45' }, ckQT);
  const cu = await goiApi('/api/dontra/anh-tra', { studentId: 's2', ngay: hn, anh: ANH_URL }, ckQT);
  const fileCu = (cu.data && cu.data.file) || '';
  const coMat = await goiApi('/api/attendance/mark', { studentId: 's2', date: hn, status: 'present' }, ckQT);
  check('(đối chứng) bé Nam có mặt, có sổ trả bé kèm ảnh của phân hệ',
    ghi.status < 300 && cu.status === 201 && !!fileCu && coMat.status < 300, [ghi.status, cu.status, coMat.status]);
  await dangNhap('phuhuynh', '123456');
  loiJs = [];
  await moMan('#/attendance');
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  await page.evaluate((d) => App.views.attendance.showDay(d), hn);
  await page.waitForSelector('.modal', { timeout: 5000 });
  check('phân hệ bật: hộp của bé An vẫn có ảnh lúc ra về', await dem(`.modal img[src="${SRC_VE}"]`) === 1);
  await page.evaluate(() => UI.closeModal());

  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo Nam' }).click();
  await page.waitForTimeout(1000);
  const dongNam = page.locator(`#view .list-row[onclick*="'${hn}'"]`);
  check('ảnh trả bé của phân hệ hiện ở ảnh nhỏ lúc ra về trên dòng hôm nay',
    await dongNam.locator(`img[alt="Ảnh con lúc ra về"][src="/api/attendance/anh/${fileCu}"]`).count() === 1,
    await dongNam.innerHTML().catch(() => ''));
  check('…và mở ra được', await dongNam.locator('img[alt="Ảnh con lúc ra về"]')
    .evaluate(el => el.complete && el.naturalWidth > 0).catch(() => false));
  await page.evaluate((d) => App.views.attendance.showDay(d), hn);
  await page.waitForSelector('.modal', { timeout: 5000 });
  const soTam = await page.evaluate((f) => [...document.querySelectorAll('.modal img')]
    .filter(i => (i.getAttribute('src') || '').endsWith(`/${f}`)).length, fileCu);
  check('trong hộp ngày, tấm ảnh ấy hiện ĐÚNG MỘT lần (không trùng với nửa Trả bé)', soTam === 1, soTam);
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
