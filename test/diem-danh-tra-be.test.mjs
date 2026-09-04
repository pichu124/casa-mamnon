// MỘT NGÀY HAI PHẦN — Điểm danh có Đón bé và Trả bé, trên trình duyệt thật (Đ126).
//
// Cần Playwright. Chạy bằng:  npm run test:diem-danh-tra-be
//
// Người dùng thử app xong hỏi: "có thể kết hợp Điểm danh và Đón trả bé vào
// cùng một chỗ cho tiện theo dõi cả cô lẫn phụ huynh không — trong một thư
// mục to Điểm danh có hai phần đón bé / trả bé trong một ngày, đều có chụp
// ảnh". Bài này đi đúng con đường cô và gia đình sẽ đi, và canh ba điều mà
// một bản gộp làm vội dễ hỏng:
//
//   1. GỘP MÀN, KHÔNG GỘP MÃ. Phần Trả bé vẫn là của phân hệ Đón trả bé (cắm
//      thêm, tắt được). Tắt phân hệ thì màn Điểm danh y hệt trước Đ126; tệp
//      giao diện của phân hệ hỏng thì chỉ ô Trả bé nói sự cố, phần Đón bé và
//      dải tab vẫn nguyên — mục [4] và [5].
//   2. CÔ CHỈ CÒN MỘT CỬA, GIA ĐÌNH VÀ VĂN PHÒNG KHÔNG MẤT CỬA NÀO. Ô "Đón trả
//      bé" ẩn khỏi trang chủ của cô khi Điểm danh đang bật, và QUAY LẠI khi
//      Điểm danh tắt; gia đình vẫn có ô đó để khai người đón — mục [6].
//   3. Ở CỔNG 16H30 KHÔNG BỊ NÉM VỀ ĐẦU DANH SÁCH. Ghi xong một bé, thẻ bé đó
//      đổi tại chỗ, hộp thoại đóng, đường dẫn vẫn là '#/attendance/tra' — mục [1].
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, CHROMIUM, tatBannerMoiCai, MAU,
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
console.log('\n[1] Cô một nhóm: Điểm danh có hai phần, Trả bé ghi tại chỗ không bị ném về đầu');
{
  await dangNhap('giaovien', '123456');
  loiJs = [];
  await moMan('#/attendance');
  check('có dải hai phần Đón bé / Trả bé', await dem('#att-tab [data-tab]') === 2);
  const nhan = await page.locator('#att-tab [data-tab]').allInnerTexts();
  check('nhãn là "Đón bé" và "Trả bé"', /Đón bé/.test(nhan[0] || '') && /Trả bé/.test(nhan[1] || ''), nhan);
  check('mặc định đứng ở Đón bé (không đoán theo giờ)',
    await page.locator('#att-tab [data-tab="don"]').evaluate(el => el.classList.contains('active')));
  check('phần Đón bé vẫn có ô đếm và danh sách chấm như trước',
    await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2,
    await dem('[id^="att-dong-"]'));
  check('phần Đón bé vẫn có nút "Chụp ảnh con tới lớp" (ảnh check-in)', /Chụp ảnh con tới lớp/.test(await chu()));

  await page.click('#att-tab [data-tab="tra"]');
  await page.waitForSelector('[data-tra]', { timeout: 10000 });
  await page.waitForTimeout(500);
  check('bấm Trả bé → đường dẫn là #/attendance/tra', await page.evaluate(() => location.hash) === '#/attendance/tra');
  check('mỗi bé một thẻ trả', await dem('[data-tra]') === MAU.soBeNhomChoi2, await dem('[data-tra]'));
  check('CHỈ MỘT ô ngày trên màn — ô ngày/ô nhóm là của Điểm danh, phần Trả bé không vẽ ô riêng',
    await dem('#view input[type=date]') === 1 && await dem('#dt-ngay') === 0 && await dem('#dt-nhom') === 0);
  const manTra = await chu();
  check('có dòng đếm "Đã trả x / y bé"', /Đã trả \d+ \/ \d+ bé/.test(manTra), manTra.slice(0, 200));
  // Dữ liệu mẫu đã ghi trả sẵn vài bé hôm nay, nên đo bằng HIỆU SỐ, không đoán số tuyệt đối.
  const soDaTraTruoc = Number((manTra.match(/Đã trả (\d+) \//) || [])[1] || 0);
  check('thẻ bé nói "Đón bé: …" — trạng thái lúc đón đưa sang phần trả', /Đón bé:/.test(manTra));
  check('KHÔNG viết "Sáng nay" — bé học nửa buổi vào lớp đầu giờ chiều thì câu đó nói ngược',
    !/Sáng nay/.test(manTra), (manTra.match(/.{0,40}Sáng nay.{0,40}/) || [])[0]);
  check('không còn nhãn "Chưa trả" cam — bé chờ đón là "Còn ở lớp"', !/Chưa trả/.test(manTra) && /Còn ở lớp|Đã trả|Nghỉ hôm nay/.test(manTra));
  check('không lộ tiếng tiểu học ở phần Trả bé', !XAU.test(manTra), (manTra.match(XAU) || [])[0]);
  await doBoCuc('Trả bé');

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
  check('đường dẫn vẫn là #/attendance/tra — không bật sang #/dontra', await page.evaluate(() => location.hash) === '#/attendance/tra');
  check('sau khi ghi có nút "Chụp ảnh lúc trả bé" (ảnh check-out) ngay trong thẻ',
    await dem(`#dt-the-${maBeAn} [data-anh-tra]`) === 1);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);

  // '#/dontra' của cô vẫn là màn cổng đầy đủ, và chỉ đường về Điểm danh.
  await moMan('#/dontra');
  check('#/dontra vẫn mở được cho cô (phân hệ tự đứng)', await dem('[data-tra]') >= 1);
  check('#/dontra có nút chỉ đường "cũng nằm trong Điểm danh"', await dem('[data-mo-tra-be]') === 1);
  await page.click('[data-mo-tra-be]');
  await page.waitForTimeout(900);
  check('bấm nút đó → về #/attendance/tra', await page.evaluate(() => location.hash) === '#/attendance/tra');
}

// ===========================================================================
console.log('\n[2] Cô nhiều nhóm: đổi nhóm ở ô của Điểm danh thì phần Trả bé đổi theo');
{
  await dangNhap('giaovien3', '123456');
  loiJs = [];
  await moMan('#/attendance/tra');
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
  check('đổi nhóm → vẫn ở phần Trả bé', await page.evaluate(() => location.hash) === '#/attendance/tra');
  check('phần Trả bé hiện đúng bé của nhóm vừa chọn',
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
  check('phần Đón bé đầy đủ', await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2);
  await moMan('#/attendance/tra');
  check('#/attendance/tra lặng lẽ về Đón bé, không ô sự cố', await dem('#att-so-da') === 1 && await dem('#att-tra') === 0);
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
console.log('\n[5] Tệp giao diện của phân hệ hỏng → chỉ ô Trả bé nói sự cố, Đón bé vẫn nguyên');
{
  await dangNhap('giaovien', '123456');
  await moMan('#/attendance/tra');
  await page.waitForSelector('[data-tra]', { timeout: 10000 });
  loiJs = [];
  // Giả lập đúng thứ xảy ra khi view.js của phân hệ lỗi cú pháp: loadScript
  // bắt lỗi và App.views.dontra không tồn tại.
  await page.evaluate(() => { delete App.views.dontra; App.route(); });
  await page.waitForTimeout(1200);
  const man = await chu();
  check('dải hai phần VẪN còn (cô biết phần này tồn tại)', await dem('#att-tab') === 1);
  check('ô Trả bé nói "đang gặp sự cố", không trắng trơn', /đang gặp sự cố/.test(man), man.slice(0, 200));
  check('không rơi vào màn "Có lỗi xảy ra" chung', !/Có lỗi xảy ra/.test(man));
  await page.click('#att-tab [data-tab="don"]');
  await page.waitForTimeout(1000);
  check('bấm sang Đón bé → vẫn dựng đủ', await dem('#att-so-da') === 1 && await dem('[id^="att-dong-"]') === MAU.soBeNhomChoi2);
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
  check('cô: KHÔNG còn ô "Đón trả bé" trên lưới (đã gấp vào Điểm danh)', !nhanO.includes('Đón trả bé'), nhanO);
  check('cô: vẫn có ô Điểm danh', nhanO.includes('Điểm danh'));
  check('cô: lưới vẫn đủ ô khác', nhanO.length >= 8, nhanO.length);
  const nutViec = page.locator('.viec-nut', { hasText: 'Đón trả bé' });
  check('cô: nút việc "Đón trả bé" vẫn có trong bảng Hôm nay', await nutViec.count() === 1);
  check('…và trỏ thẳng vào phần Trả bé của Điểm danh',
    /#\/attendance\/tra/.test(await nutViec.getAttribute('onclick') || ''), await nutViec.getAttribute('onclick'));
  await nutViec.click();
  await page.waitForTimeout(1200);
  check('bấm nút việc → mở đúng phần Trả bé', await page.evaluate(() => location.hash) === '#/attendance/tra' && await dem('[data-tra]') >= 1);

  await dangNhap('phuhuynh', '123456');
  await moMan('#/');
  const nhanPH = await page.locator('.tile-label').allInnerTexts();
  check('gia đình: VẪN có ô "Đón trả bé" (khai người đón, uỷ quyền)', nhanPH.includes('Đón trả bé'), nhanPH);
  await moMan('#/dontra');
  check('gia đình: mở ô đó vẫn là màn khai người đón như trước', await dem('#dt-them') === 1);

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
  check('BẬT LẠI Điểm danh → ô Đón trả bé lại gấp vào', !(await page.locator('.tile-label').allInnerTexts()).includes('Đón trả bé'),
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
  check('KHÔNG còn nút chấm điểm danh nào', await dem('[id^="att-dong-"] button') === 0);
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
  await page.evaluate(() => { location.hash = '#/attendance/tra'; });
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

  await page.evaluate(() => { App.views.attendance.setDate(UI.todayStr()); });
  await page.waitForTimeout(1500);
  check('về hôm nay thì phần Trả bé ghi lại được', await dem('[data-tra]') > 0);
  check('không lỗi JavaScript', loiJs.length === 0, loiJs);
}

check('không có lỗi JavaScript nào còn sót', loiJs.length === 0, loiJs);
await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
