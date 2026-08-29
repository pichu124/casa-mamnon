// Bài canh TÁM MÀN HÌNH PHÂN HỆ MẦM NON, TRÊN TRÌNH DUYỆT THẬT.
//
// Cần Playwright. Chạy bằng:  npm run test:giao-dien
//
// VÌ SAO TỆP NÀY TỒN TẠI
//
// `npm test` chạy hoàn toàn ở tầng API bằng `fetch` — không có trình duyệt nào.
// Bộ chạy trình duyệt thì trước đây chỉ gồm năm tệp, và tệp duy nhất mở màn của
// một phân hệ cắm thêm là bài Tính năng, mở đúng một màn (Học phí).
//
// Nghĩa là khoảng 2.600 dòng mã giao diện của tám phân hệ mầm non CHƯA TỪNG
// chạy trong một trình duyệt. Một lỗi cú pháp, một biến sai tên, một hàm gọi
// nhầm — không bài nào bắt được, và người phát hiện sẽ là cô giáo đang đứng lớp
// với hai mươi đứa trẻ.
//
// BÀI NÀY CỐ Ý CANH THỨ RẤT THẤP, VÀ ĐÓ LÀ CHỦ Ý
//
// Nó không kiểm nghiệp vụ — mỗi phân hệ đã có bộ API riêng làm việc đó. Nó chỉ
// hỏi ba câu mà chỉ trình duyệt thật trả lời được:
//
//   1. Màn có DỰNG LÊN được không, hay ném lỗi JavaScript?
//   2. Có rơi vào màn báo lỗi chung không?
//   3. Có chữ thật trên màn, hay trống trơn vì `render` chết giữa chừng?
//
// Ba câu đó rẻ, nhưng chúng là thứ đang thiếu hoàn toàn.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, CHROMIUM, tatBannerMoiCai, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('man-hinh-phan-he');
sinhDuLieu(DIR);

// Cả tám đều TẮT SẴN — đó là thiết kế, nhà trường tự bật. Bật hết ở đây để soi
// được chúng; nếu không thì bài này chỉ kiểm được màn "phân hệ đang tắt".
const MA = ['nhatky', 'tienan', 'dontra', 'thuchup', 'hanhtrinh', 'kehoachbe', 'cambridge', 'hocphi'];
batPhanHe(DIR, MA);

const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3960), dir: DIR });

// Mỗi màn: mã phân hệ, đường dẫn, và những vai PHẢI mở được nó.
const MAN = [
  { ma: 'nhatky', hash: '#/nhatky', ten: 'Nhật ký ngày', vai: ['co', 'ph'] },
  { ma: 'tienan', hash: '#/tienan', ten: 'Báo ăn & tiền ăn', vai: ['co'] },
  { ma: 'dontra', hash: '#/dontra', ten: 'Đón trả bé', vai: ['co', 'ph'] },
  { ma: 'thuchup', hash: '#/thuchup', ten: 'Ghi nhanh', vai: ['co'] },
  { ma: 'hanhtrinh', hash: '#/hanhtrinh', ten: 'Hành trình học tập', vai: ['co', 'ph'] },
  { ma: 'kehoachbe', hash: '#/kehoachbe', ten: 'Kế hoạch của bé', vai: ['co'] },
  { ma: 'cambridge', hash: '#/cambridge', ten: 'Cambridge & Kết nối ở nhà', vai: ['co', 'ph'] },
  { ma: 'hocphi', hash: '#/hocphi', ten: 'Học phí', vai: ['co', 'ph'] },
];

const TAI_KHOAN = {
  co: { u: 'giaovien', p: '123456', ten: 'cô' },
  ph: { u: 'phuhuynh', p: '123456', ten: 'gia đình' },
  qt: { u: 'hieutruong', p: 'quantri2026', ten: 'văn phòng' },
};

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();

// Gom lỗi JavaScript theo TỪNG MÀN. Gom chung cả phiên thì biết có lỗi mà không
// biết màn nào gây ra — mà đó mới là thứ cần biết để đi sửa.
let loiHienTai = [];
page.on('pageerror', e => loiHienTai.push(e.message));
page.on('console', m => { if (m.type() === 'error') loiHienTai.push(`console: ${m.text()}`); });

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

// Đổi mật khẩu tạm của tài khoản quản trị trước, để đăng nhập được như thường.
{
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', 'hieutruong');
  await page.fill('#lg-pass', mkQT);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (mk) => {
    await API.post('/api/auth/set-new-password', { newPassword: mk });
  }, TAI_KHOAN.qt.p);
}

async function moMan(hash) {
  loiHienTai = [];
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const chu = await page.locator('#view').innerText().catch(() => '');
  return { chu, loi: [...loiHienTai] };
}

// ===========================================================================
console.log('\n[1] Tám màn hình dựng lên được trên trình duyệt thật');
for (const vaiMa of ['co', 'ph', 'qt']) {
  const tk = TAI_KHOAN[vaiMa];
  await dangNhap(tk.u, tk.p);

  for (const m of MAN) {
    // Chỉ đòi những vai mà phân hệ khai là dùng được. Quản trị mở được tất,
    // vì `roles` của cả tám đều có `admin`.
    if (vaiMa !== 'qt' && !m.vai.includes(vaiMa)) continue;

    const { chu, loi } = await moMan(m.hash);
    check(`${m.ten} — ${tk.ten} mở được, KHÔNG lỗi JavaScript`, loi.length === 0, loi.slice(0, 2));
    check(`${m.ten} — ${tk.ten} không rơi vào màn báo lỗi chung`,
      !/có lỗi xảy ra/i.test(chu), chu.slice(0, 120));
    check(`${m.ten} — ${tk.ten} có nội dung thật, không trống trơn`,
      chu.trim().length > 20, chu.slice(0, 120));
  }
}

// ===========================================================================
console.log('\n[2] Màn hình nói tiếng của trường mầm non');
{
  await dangNhap(TAI_KHOAN.co.u, TAI_KHOAN.co.p);
  // Quét chữ THẬT trên màn, không quét mã nguồn — `test:goi-ten` đã soi mã rồi.
  // Hai bài bắt hai thứ khác nhau: mã nguồn có thể sạch mà chữ dựng động lúc
  // chạy vẫn ra "học sinh", vì nó ghép từ nhiều mảnh.
  const XAU = /học sinh|lớp học\b|giáo viên bộ môn|điểm số|xếp hạng/i;
  for (const m of MAN) {
    if (!m.vai.includes('co')) continue;
    const { chu } = await moMan(m.hash);
    const dinh = chu.match(XAU);
    check(`${m.ten} — không lộ tiếng tiểu học ra màn hình`, !dinh, dinh && dinh[0]);
  }
}

// ===========================================================================
console.log('\n[3] Hàng đợi Ghi nhanh tự gửi khi có mạng lại — KHÔNG cần mở đúng màn đó');
{
  // Đây là phép thử quyết định của GĐ 0, thu nhỏ lại: mất mạng ghi một bản, có
  // mạng lại thì bản đó phải tự lên — trong khi cô ĐANG Ở MÀN KHÁC.
  //
  // BÀI NÀY TUYỆT ĐỐI KHÔNG ĐƯỢC MỞ MÀN GHI NHANH.
  //
  // Bản đầu của bài canh có mở, và vì thế nó XANH CẢ KHI MÃ ĐANG HỎNG: bản lỗi
  // gắn máy nghe `online` bên trong `render()`, mà mở màn thì `render()` chạy,
  // nên máy nghe có mặt và hàng đợi vẫn được đẩy. Bài canh đo đúng thứ nó vừa
  // tự tay dựng lên. Phát hiện khi thử ngược — bản lỗi vẫn 75/75.
  //
  // `App.loadModules()` tải view.js của mọi phân hệ đang bật ngay sau đăng
  // nhập, nên `App.views.thuchup` có sẵn mà không cần vẽ màn nào.
  await dangNhap(TAI_KHOAN.co.u, TAI_KHOAN.co.p);
  await page.goto(`${sv.BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  check('tệp giao diện Ghi nhanh được nạp sẵn dù chưa mở màn nào',
    await page.evaluate(() => !!(window.App && App.views && App.views.thuchup)));
  check('và màn đang đứng KHÔNG phải màn Ghi nhanh',
    !(await page.evaluate(() => String(location.hash))).includes('thuchup'),
    await page.evaluate(() => String(location.hash)));

  const beId = await page.evaluate(async () => {
    const ds = await API.get('/api/students');
    return (Array.isArray(ds) ? ds : ds.students || [])[0]?.id || '';
  });
  check('lấy được mã một bé để ghi thử', !!beId, beId);

  await ctx.setOffline(true);
  const daXep = await page.evaluate(async (sid) => {
    // Xếp thẳng vào kho trong máy, đúng hình dạng mà `guiHangDoi` gửi đi.
    await App.views.thuchup.luuVaoMay({
      id: `thu-${Date.now()}`,
      studentId: sid,
      note: 'Bé xếp hình rất chăm chú',
      ngoaiTuyen: true,
      taoLuc: new Date().toISOString(),
    });
    return (await App.views.thuchup.dangCho()).length;
  }, beId).catch(e => `lỗi: ${e.message}`);
  check('mất mạng vẫn xếp được vào hàng đợi trong máy', daXep === 1, daXep);

  // Có mạng lại — vẫn đứng nguyên ở trang chủ.
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(2500);

  check('vẫn chưa hề mở màn Ghi nhanh',
    !(await page.evaluate(() => String(location.hash))).includes('thuchup'),
    await page.evaluate(() => String(location.hash)));
  const conLai = await page.evaluate(() => App.views.thuchup.dangCho().then(x => x.length)).catch(() => -1);
  check('CÓ MẠNG LẠI THÌ HÀNG ĐỢI TỰ ĐẨY ĐI, DÙ CÔ CHƯA TỪNG MỞ MÀN GHI NHANH',
    conLai === 0, conLai);

  const daLen = await page.evaluate(async () => (await API.get('/api/thuchup')).ghiNhan?.length || 0);
  check('và bản ghi đã lên tới máy chủ', daLen >= 1, daLen);
}

// ===========================================================================
console.log('\n[4] Nhật ký ngày: "Áp cho cả nhóm" KHÔNG xoá phần cô đã chỉnh riêng');
{
  // Đây là bài học mà màn điểm danh đã trả giá một lần (`markAll`). Bản đầu của
  // Nhật ký ngày làm ngược lại: gán thẳng giá trị cho MỌI ô, không hỏi, không
  // chừa. Mà biểu mẫu nạp sẵn giá trị ĐÃ LƯU, nên một lần chạm nhầm rồi bấm Lưu
  // là xoá cả phần đã ghi trong ngày.
  await dangNhap(TAI_KHOAN.co.u, TAI_KHOAN.co.p);
  await page.goto(`${sv.BASE}/#/nhatky`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const soO = await page.locator('.nk-o[data-truong="anTrua"]').count();
  check('màn nhật ký có ô ăn trưa cho từng bé', soO >= 2, soO);

  // Cô chỉnh riêng bé đầu tiên: bé này ăn ít.
  const oDau = page.locator('.nk-o[data-truong="anTrua"]').first();
  await oDau.selectOption('it');
  check('cô chỉnh riêng được một bé', (await oDau.inputValue()) === 'it');

  // Rồi áp "hết suất" cho cả nhóm.
  await page.selectOption('#nk-ca-trua', 'het');
  await page.click('#nk-ap');
  await page.waitForTimeout(500);

  // Phải HỎI LẠI, và mặc định phải là "chỉ điền ô còn trống".
  const hopThoai = await page.locator('#nk-ap-trong').count();
  check('HỎI LẠI trước khi áp, không gán thẳng', hopThoai === 1, hopThoai);
  const chuHop = await page.locator('body').innerText();
  check('và nói rõ bao nhiêu ô cô đã điền sẽ giữ nguyên',
    /giữ nguyên/i.test(chuHop), chuHop.slice(0, 200));

  await page.click('#nk-ap-trong');
  await page.waitForTimeout(400);
  check('BÉ CÔ ĐÃ CHỈNH RIÊNG VẪN GIỮ NGUYÊN',
    (await oDau.inputValue()) === 'it', await oDau.inputValue());
  const oSau = page.locator('.nk-o[data-truong="anTrua"]').nth(1);
  check('còn ô trống thì được điền', (await oSau.inputValue()) === 'het', await oSau.inputValue());

  // Đường ghi đè vẫn còn — cắt mất nó là lấy đi thao tác cô đang cần.
  await page.selectOption('#nk-ca-trua', 'nua-suat');
  await page.click('#nk-ap');
  await page.waitForTimeout(400);
  check('vẫn có đường ghi đè cả nhóm cho lúc cô thật sự muốn',
    (await page.locator('#nk-ap-de').count()) === 1);
  await page.click('#nk-ap-de');
  await page.waitForTimeout(400);
  check('bấm ghi đè thì mới thay phần đã chỉnh riêng',
    (await oDau.inputValue()) === 'nua-suat', await oDau.inputValue());
}

// ===========================================================================
console.log('\n[5] Nhật ký ngày: đổi ngày lúc đang gõ dở thì phải HỎI');
{
  // ĐI VÒNG QUA TRANG CHỦ RỒI MỚI QUAY LẠI.
  //
  // `page.goto` tới ĐÚNG địa chỉ đang đứng thì trình duyệt không vẽ lại gì cả —
  // và mục [4] vừa để lại một form đầy giá trị chưa lưu. Không đi vòng thì bài
  // này đo trên form dở của mục trước, và nó đã đỏ vì đúng lý do đó.
  await page.goto(`${sv.BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.goto(`${sv.BASE}/#/nhatky`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Chưa gõ gì thì đừng hỏi — hỏi khi không có gì để mất thì lần thứ ba cô sẽ
  // bấm "Đồng ý" theo phản xạ, và lời hỏi thành vô dụng.
  let daHoi = false;
  let chuHoi = '';
  page.on('dialog', async d => { daHoi = true; chuHoi = d.message(); await d.accept(); });
  const homQua = await page.evaluate(() => {
    const t = Date.parse(`${App.views.nhatky._ngay}T00:00:00Z`) - 86400000;
    return new Date(t).toISOString().slice(0, 10);
  });
  await page.fill('#nk-ngay', homQua);
  await page.waitForTimeout(700);
  check('chưa gõ gì thì đổi ngày KHÔNG hỏi', daHoi === false, chuHoi || daHoi);

  // Gõ dở rồi đổi ngày → phải hỏi.
  await page.waitForTimeout(400);
  await page.locator('.nk-o[data-truong="anTrua"]').first().selectOption('gan-het');
  daHoi = false;
  const homKia = await page.evaluate(() => {
    const t = Date.parse(`${App.views.nhatky._ngay}T00:00:00Z`) - 86400000;
    return new Date(t).toISOString().slice(0, 10);
  });
  await page.fill('#nk-ngay', homKia);
  await page.waitForTimeout(900);
  check('ĐANG GÕ DỞ MÀ ĐỔI NGÀY THÌ PHẢI HỎI LẠI', daHoi === true, daHoi);
}

// ===========================================================================
console.log('\n[6] Nhật ký ngày: app bị đóng giữa chừng thì phần cô gõ dở KHÔNG mất');
{
  // Lời hỏi ở mục [5] chỉ đỡ được chỗ CHẠM NHẦM. Nó không đỡ được thứ hay xảy
  // ra hơn trên điện thoại của cô: có người gọi tới, cô chuyển sang app khác,
  // hệ điều hành đóng trình duyệt để lấy bộ nhớ. Mở lại là trắng — và cô vừa
  // mất một lượt nhập của hai mươi bé.
  //
  // Bài này mô phỏng đúng cảnh đó: gõ dở → tải lại trang (mọi thứ trong DOM
  // biến mất, y như bị đóng) → mở lại màn.
  //
  // TẢI LẠI HẲN TRANG TRƯỚC KHI BẮT ĐẦU. `page.goto` tới một địa chỉ chỉ khác
  // phần sau dấu `#` là điều hướng TRONG TRANG — không nạp lại mã, nên
  // `App.views.nhatky._ngay` còn giữ nguyên ngày mà mục [5] vừa đổi sang. Nháp
  // ghi theo (nhóm, ngày), nên nếu không tải lại thì bài này ghi nháp cho ngày
  // hôm kia rồi đi tìm nó ở ngày hôm nay.
  await page.goto(`${sv.BASE}/#/nhatky`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Dọn nháp cũ do các mục trước để lại, để bài này đo đúng thứ nó dựng ra.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('casa.nhatky-nhap')) localStorage.removeItem(k);
    }
  });

  const o1 = page.locator('.nk-o[data-truong="anGhiChu"]').first();
  await o1.fill('bé ăn chậm, cô đút thêm');
  await page.locator('.nk-o[data-truong="anSang"]').first().selectOption('it');
  await page.waitForTimeout(900);   // chờ bộ ghi nháp (gom 500ms)

  const coNhap = await page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.startsWith('casa.nhatky-nhap')).length);
  check('phần cô gõ được cất vào máy ngay trong lúc gõ', coNhap === 1, coNhap);

  // ĐÓNG APP: tải lại trang. Mọi thứ trong DOM mất sạch.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const chu = await page.locator('body').innerText();
  check('MỞ LẠI THÌ APP NHẮC CÓ PHẦN NHẬP DỞ', /nhập dở chưa lưu/i.test(chu), chu.slice(0, 300));
  check('và nói rõ vì sao không tự điền đè (cô khác cùng nhóm có thể đã lưu)',
    /cô khác cùng nhóm/i.test(chu), chu.slice(0, 400));

  // KHÔNG tự điền — đó là chủ ý, vì nhóm có nhiều cô.
  const truocKhiBam = await page.locator('.nk-o[data-truong="anGhiChu"]').first().inputValue();
  check('KHÔNG tự điền đè khi chưa hỏi cô', truocKhiBam === '', JSON.stringify(truocKhiBam));

  await page.click('#nk-nhap-dung');
  await page.waitForTimeout(400);
  check('CÔ BẤM "ĐIỀN LẠI" THÌ PHẦN GÕ DỞ QUAY VỀ ĐÚNG NGUYÊN VĂN',
    (await page.locator('.nk-o[data-truong="anGhiChu"]').first().inputValue()) === 'bé ăn chậm, cô đút thêm',
    await page.locator('.nk-o[data-truong="anGhiChu"]').first().inputValue());
  check('cả ô chọn cũng quay về',
    (await page.locator('.nk-o[data-truong="anSang"]').first().inputValue()) === 'it');
  check('dải nhắc biến mất sau khi cô chọn xong',
    (await page.locator('#nk-nhap-dung').count()) === 0);

  // Lưu xong thì nháp hết việc — giữ lại là lần sau app nhắc một phần dở KHÔNG
  // còn dở nữa, và cô sẽ thôi tin mọi lời nhắc.
  await page.click('#nk-luu');
  await page.waitForTimeout(1200);
  const conNhap = await page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.startsWith('casa.nhatky-nhap')).length);
  check('LƯU LÊN MÁY CHỦ XONG THÌ NHÁP TRONG MÁY ĐƯỢC DỌN', conNhap === 0, conNhap);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check('và mở lại KHÔNG còn dải nhắc nào',
    (await page.locator('#nk-nhap-dung').count()) === 0);
}

// ===========================================================================
console.log('\n[7] BỐ CỤC ĐIỆN THOẠI CỦA TÁM MÀN PHÂN HỆ — vai CÔ, không phải vai gia đình');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `test/pwa.test.mjs` có kiểm cuộn ngang và vùng chạm, nhưng chỉ trên NĂM màn
  // lõi kế thừa từ app 1, và chỉ với vai PHỤ HUYNH. Tám màn mầm non — những màn
  // cô dùng thật, một tay bế trẻ một tay cầm điện thoại — chưa từng được đo.
  //
  // Hai thứ đo ở đây đều là thứ chỉ trình duyệt thật trả lời được:
  //
  //   CUỘN NGANG. Một bảng rộng hay một dòng chữ không xuống dòng là cả trang
  //   trượt sang ngang. Trên điện thoại, cô sẽ mất nút Lưu ở mép phải màn hình
  //   và không hiểu vì sao.
  //
  //   VÙNG CHẠM DƯỚI 32px. Ngón tay người lớn cầm điện thoại một tay không bấm
  //   trúng. Cô sẽ bấm hai ba lần, hoặc bấm nhầm nút bên cạnh — mà ở màn Nhật ký
  //   thì nút bên cạnh là của một bé khác.
  //
  // Bài này KHÔNG đòi màn nào đẹp. Nó chỉ đòi hai điều trên, và đo trên khổ
  // 390x844 — đúng khổ iPhone phổ biến nhất.
  await dangNhap(TAI_KHOAN.co.u, TAI_KHOAN.co.p);

  const CUA_CO = MAN.filter(m => m.vai.includes('co'));
  check('có đủ màn của cô để đo', CUA_CO.length >= 6, CUA_CO.map(m => m.ma));

  for (const m of CUA_CO) {
    await page.goto(`${sv.BASE}/${m.hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const tran = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${m.ten}: KHÔNG cuộn ngang trên khổ điện thoại`, tran <= 1, `tràn ${tran}px`);

    const nhoQua = await page.evaluate(() => {
      const ra = [];
      for (const el of document.querySelectorAll('button, a[href], select, input[type=checkbox]')) {
        const r = el.getBoundingClientRect();
        // Bỏ qua phần tử đang ẩn: chiều rộng hoặc cao bằng 0.
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.height < 32 || r.width < 32) {
          ra.push(`${el.tagName}.${el.className || '-'}:${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return ra.slice(0, 5);
    });
    check(`${m.ten}: không nút nào nhỏ hơn đầu ngón tay`, nhoQua.length === 0, nhoQua);
  }
}

await ctx.close();
await browser.close();
await sv.dung();
donThuMucTam(DIR);
tongKet();
