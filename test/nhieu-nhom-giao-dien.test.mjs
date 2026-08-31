// Bài canh: CÔ PHỤ TRÁCH HAI NHÓM PHẢI MỞ ĐƯỢC CẢ HAI.
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:nhieu-nhom
//
// VÌ SAO CÓ BÀI NÀY
//
// G0.4 chuyển tầng dữ liệu từ "một cô một lớp" sang "nhiều cô một nhóm", và
// tầng đó đã đúng: máy chủ cho cô mở bất kỳ nhóm nào cô phụ trách. Nhưng màn
// hình thì chưa theo. `plans.js` và `timetable.js` lấy CỨNG `nhomCuaCo[0]`, nên
// cô dạy hai nhóm không có đường nào mở kế hoạch hay lịch sinh hoạt của nhóm
// thứ hai — quyền có mà lối vào thì không.
//
// Đây đúng là loại lỗi mà bài kiểm thử API không bao giờ thấy: gọi thẳng
// `/api/plans?classId=c2` thì 200, mọi bài đều xanh. Chỉ khi ngồi trước màn
// hình như cô mới thấy không có nút nào dẫn tới đó.
//
// Nên bài này chạy trên trình duyệt thật và đi bằng chuột, không gọi API.
import { chromium } from 'playwright';
import { dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo, datChucVu, CHROMIUM, tatBannerMoiCai, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhieu-nhom-gd');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Cô Hiệu Trưởng', 'quantri');

// Một tài khoản CẤP 3 — khoá vào cơ sở 1. Đây là vai chưa từng được mở trên
// trình duyệt thật lần nào, dù tầng cơ sở là khác biệt lớn nhất giữa app 2 và
// app 1. Mục [6] ở cuối tệp dùng nó.
const mkCs1 = taoQuanTri(DIR, 'Quản Lý Cơ Sở 1', 'quanlycs1');
datChucVu(DIR, 'quanlycs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3907), dir: DIR });
const BASE = sv.BASE;

// Đổi mật khẩu tạm ngay, vì lần đăng nhập đầu app bắt đổi trước khi vào được.
const MK_QUANTRI = 'quantri2026';
async function doiMatKhauTam(tenDangNhap, mkTamThoi, mkMoi) {
  const dn = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: tenDangNhap, password: mkTamThoi }),
  });
  const ck = dn.headers.get('set-cookie').split(';')[0];
  await fetch(`${BASE}/api/auth/set-new-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ newPassword: mkMoi }),
  });
  return ck;
}
await doiMatKhauTam('quantri', mkTam, MK_QUANTRI);
await doiMatKhauTam('quanlycs1', mkCs1, MK_QUANTRI);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJS = [];
page.on('pageerror', e => loiJS.push(e.message));

async function dangNhap(u, p) {
  // Phiên đăng nhập nằm ở cookie, không ở localStorage — xóa cookie mới thật sự
  // là đăng xuất. Bản đầu xóa localStorage rồi tưởng đã ra, và bài kẹt ở màn
  // chính của tài khoản trước.
  await ctx.clearCookies();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* chưa có */ } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}

async function mo(duong) {
  await page.goto(BASE + duong, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

// Ô chọn nhóm của màn đang mở, hoặc null nếu không có.
const oChon = () => page.$('#view select');
const chuTrenMan = () => page.innerText('#view');

// ===========================================================================
console.log('\n[1] Cô phụ trách HAI nhóm — Lịch sinh hoạt');
{
  await dangNhap('giaovien3', '123456');   // cô Bích Ngọc: Chồi 2 và Lá 1
  await mo('/#/timetable');

  const o = await oChon();
  check('có ô chọn nhóm', !!o);
  const cacNhom = o ? await o.$$eval('option', els => els.map(e => e.textContent.trim())) : [];
  check('ô chọn liệt kê đủ CẢ HAI nhóm của cô',
    cacNhom.length === 2 && cacNhom.includes('Chồi 2') && cacNhom.includes('Lá 1'), cacNhom);

  // Chọn Thứ Hai cho chắc chắn, vì mặc định là thứ hôm nay.
  await page.click('#tkb-seg button:first-child');
  await page.waitForTimeout(400);
  const nhom1 = await chuTrenMan();
  check('đang xem nhóm đầu, thấy hoạt động riêng của nhóm đó',
    nhom1.includes('Trường mầm non của bé'), nhom1.slice(0, 300));

  // ĐÂY LÀ PHÉP THỬ CHÍNH: đổi sang nhóm thứ hai bằng đúng thao tác của cô.
  const idNhom2 = await page.$eval('#view select option:nth-child(2)', e => e.value);
  await page.selectOption('#view select', idNhom2);
  await page.waitForTimeout(800);
  await page.click('#tkb-seg button:first-child');
  await page.waitForTimeout(400);
  const nhom2 = await chuTrenMan();
  check('ĐỔI SANG NHÓM THỨ HAI THÌ NỘI DUNG ĐỔI THEO',
    nhom2.includes('Nước và hiện tượng tự nhiên'), nhom2.slice(0, 300));
  check('không còn lẫn nội dung của nhóm thứ nhất',
    !nhom2.includes('Khám phá: Trường mầm non của bé'), nhom2.slice(0, 300));
  check('vẫn còn nút Chỉnh sửa — cô phụ trách nhóm này nên sửa được',
    nhom2.includes('Chỉnh sửa'), nhom2.slice(0, 200));
}

// ===========================================================================
console.log('\n[2] Cô phụ trách HAI nhóm — Kế hoạch giáo dục');
{
  await mo('/#/plans');
  const o = await oChon();
  check('có ô chọn nhóm', !!o);
  const cacNhom = o ? await o.$$eval('option', els => els.map(e => e.textContent.trim())) : [];
  check('ô chọn liệt kê đủ cả hai nhóm', cacNhom.length === 2, cacNhom);

  const truoc = await chuTrenMan();
  check('đang xem kế hoạch của nhóm đầu',
    truoc.includes('Trường mầm non của bé'), truoc.slice(0, 300));

  const idNhom2 = await page.$eval('#view select option:nth-child(2)', e => e.value);
  await page.selectOption('#view select', idNhom2);
  await page.waitForTimeout(800);
  const sau = await chuTrenMan();
  check('ĐỔI SANG NHÓM THỨ HAI THÌ KẾ HOẠCH ĐỔI THEO',
    sau.includes('Bé chuẩn bị vào lớp 1'), sau.slice(0, 300));
  check('vẫn còn nút Soạn kế hoạch cho nhóm thứ hai',
    sau.includes('Soạn kế hoạch'), sau.slice(0, 200));
}

// ===========================================================================
console.log('\n[3] Cô phụ trách MỘT nhóm — màn hình không đổi một chút nào');
{
  // Ô chọn nhóm là thứ thêm vào. Nếu nó hiện với cô chỉ có một nhóm thì đó là
  // một bước thừa mỗi ngày, cho mọi cô, để phục vụ một số ít cô dạy hai nhóm.
  await dangNhap('giaovien2', '123456');   // cô Thu Hà: chỉ Lá 1
  await mo('/#/timetable');
  check('Lịch sinh hoạt: KHÔNG hiện ô chọn nhóm', !(await oChon()));
  const tkb = await chuTrenMan();
  check('vẫn mở đúng lịch sinh hoạt của nhóm cô', tkb.includes('Lá 1'), tkb.slice(0, 200));

  await mo('/#/plans');
  check('Kế hoạch: KHÔNG hiện ô chọn nhóm', !(await oChon()));
  const kh = await chuTrenMan();
  check('vẫn mở đúng kế hoạch của nhóm cô',
    kh.includes('Bé chuẩn bị vào lớp 1'), kh.slice(0, 200));
}

// ===========================================================================
console.log('\n[4] Phụ huynh không bị đụng tới');
{
  // Phụ huynh xem theo nhóm của con đang chọn, không phải theo nhóm phụ trách.
  // Thêm ô chọn cho cô mà làm phụ huynh thấy ô đó là rò quyền ra màn hình.
  await dangNhap('phuhuynh', '123456');
  await mo('/#/timetable');
  check('Lịch sinh hoạt: phụ huynh KHÔNG thấy ô chọn nhóm lớp', !(await oChon()));
  await mo('/#/plans');
  check('Kế hoạch: phụ huynh KHÔNG thấy ô chọn nhóm lớp', !(await oChon()));
}

// ===========================================================================
console.log('\n[4b] Quản trị: biết mình là ai, và biết đang xem hồ sơ của bé nào');
{
  // VÌ SAO CÓ MỤC NÀY
  //
  // Các màn một-bé rẽ nhánh theo `role === 'teacher'`, nên vai quản trị rơi vào
  // nhánh PHỤ HUYNH: trang chủ ghi cô hiệu trưởng là "Phụ huynh", và các màn Hồ
  // sơ / Nhận xét / Nề nếp hiện dữ liệu của bé ĐẦU BẢNG CHỮ CÁI — không ô chọn,
  // có màn không ghi tên bé nào trên đó cả.
  //
  // Quản trị đang đọc hồ sơ của một đứa trẻ mà không biết là đứa nào. Lúc phụ
  // huynh gọi điện khiếu nại thì đó là chỗ nhầm rất đắt.
  await dangNhap('quantri', MK_QUANTRI);
  await mo('/#/');
  const trangChu = await chuTrenMan();
  check('trang chủ gọi đúng vai: Quản trị nhà trường',
    trangChu.includes('Quản trị nhà trường'), trangChu.slice(0, 200));
  check('KHÔNG còn ghi cô hiệu trưởng là "Phụ huynh"',
    !/Phụ huynh/.test(trangChu.split('\n').slice(0, 6).join('\n')), trangChu.slice(0, 200));

  // Ba màn này đều là màn MỘT BÉ và đều đang bật. Nề nếp và Nhận xét từng nằm ở
  // đây nhưng nay TẮT SẴN (N3 · A2) nên chỉ hiện "Phân hệ đang được nhà trường
  // tắt" — soi ô chọn bé trên một màn đang tắt là soi nhầm chỗ.
  for (const [duong, ten] of [['/#/student', 'Hồ sơ bé'], ['/#/health', 'Sức khỏe']]) {
    await mo(duong);
    const chu = await chuTrenMan();
    check(`${ten}: có ô chọn bé, không còn đoán bé nào`,
      chu.includes('Đang xem hồ sơ của bé'), chu.slice(0, 200));
    const o = await page.$('#view select');
    const soBe = o ? (await o.$$('option')).length : 0;
    check(`${ten}: ô chọn liệt kê mọi bé của trường`, soBe >= 8, soBe);
  }

  // XIN PHÉP KHÔNG CÒN LÀ MÀN MỘT BÉ VỚI QUẢN TRỊ — và đó là cách giải TỐT HƠN
  // cho đúng nỗi lo của N10.
  //
  // Từ Y2, văn phòng là người duyệt đơn nghỉ, nên màn của họ liệt kê MỌI đơn
  // đang chờ, mỗi đơn kèm tên bé và tên phụ huynh. Không còn "một bé được chọn
  // hộ" nào để mà nhầm. Ô chọn bé là cách chữa cho màn một bé; ở đây không cần
  // chữa vì bệnh không còn.
  await mo('/#/leave');
  const xinPhep = await chuTrenMan();
  check('Xin phép: quản trị vào thẳng màn duyệt của văn phòng, không phải màn một bé',
    !xinPhep.includes('Đang xem hồ sơ của bé'), xinPhep.slice(0, 200));
  check('và màn đó nói rõ đang có bao nhiêu đơn chờ văn phòng duyệt',
    /chờ duyệt \(\d+\)/.test(xinPhep.toLowerCase()), xinPhep.slice(0, 200));

  // Đổi bé thì nội dung phải đổi theo — nếu không thì ô chọn chỉ là trang trí.
  await mo('/#/student');
  const be1 = await chuTrenMan();
  const idBe2 = await page.$eval('#view select option:nth-child(3)', (e) => e.value);
  await page.selectOption('#view select', idBe2);
  await page.waitForTimeout(800);
  const be2 = await chuTrenMan();
  check('CHỌN BÉ KHÁC THÌ HỒ SƠ ĐỔI THEO', be1 !== be2, { be1: be1.slice(0, 80), be2: be2.slice(0, 80) });
}

// ===========================================================================
console.log('\n[4c] Phụ huynh và cô KHÔNG thấy ô chọn của quản trị');
{
  // Ô chọn này liệt kê TÊN MỌI BÉ CỦA TRƯỜNG. Nó lọt sang màn hình phụ huynh là
  // rò danh sách trẻ ra ngoài — chỗ rò lặng lẽ nhất, vì màn hình vẫn chạy đúng.
  await dangNhap('phuhuynh', '123456');
  for (const duong of ['/#/', '/#/student', '/#/remarks']) {
    await mo(duong);
    check(`phụ huynh KHÔNG thấy ô chọn của quản trị ở ${duong}`,
      !(await chuTrenMan()).includes('Đang xem hồ sơ của bé'));
  }
  await dangNhap('giaovien3', '123456');
  for (const duong of ['/#/', '/#/student']) {
    await mo(duong);
    check(`cô KHÔNG thấy ô chọn của quản trị ở ${duong}`,
      !(await chuTrenMan()).includes('Đang xem hồ sơ của bé'));
  }

  // Y2: cô ĐỌC được đơn nghỉ của nhóm mình, nhưng KHÔNG có nút duyệt.
  //
  // Đây là bản kiểm trên trình duyệt thật của thứ mà test:nghi-hoc chỉ soi được
  // trong mã nguồn. Hai chỗ cùng canh một điều, và chỗ này là chỗ cô thật sự
  // nhìn thấy.
  await mo('/#/leave');
  const manCo = await chuTrenMan();
  check('cô vẫn mở được màn Xin phép để biết bé nào sắp nghỉ',
    /chờ duyệt \(\d+\)/.test(manCo.toLowerCase()), manCo.slice(0, 200));
  const nutDuyet = await page.$$('#view button');
  const chuNut = await Promise.all(nutDuyet.map(b => b.innerText()));
  check('nhưng KHÔNG có nút Duyệt hay Từ chối nào trên màn của cô',
    !chuNut.some(t => /Duyệt|Từ chối/.test(t)), chuNut);
  // Nhóm của cô có thể đang không có đơn nào chờ — lúc đó không có dòng nhắc
  // nào để mà soi, và bắt nó phải có là bài test sai chứ không phải app sai.
  const coDonCho = !/chờ duyệt \(0\)/.test(manCo.toLowerCase());
  check('có đơn đang chờ thì màn hình nói rõ ai mới là người duyệt',
    !coDonCho || /Văn phòng duyệt đơn này/.test(manCo), { coDonCho, chu: manCo.slice(0, 300) });
}

// ===========================================================================
console.log('\n[4d] Phụ huynh gõ nhầm vào màn của cô: nói tử tế, không quăng lỗi máy');
{
  // Máy chủ vẫn chặn đúng ở tầng dữ liệu và không rò gì — đây thuần là chuyện
  // nói cho tử tế. "Không có quyền thực hiện" là câu máy chủ nói với máy, không
  // phải câu nói với một bà mẹ vừa gõ nhầm địa chỉ.
  await dangNhap('phuhuynh', '123456');
  await mo('/#/accounts');
  const chu = await chuTrenMan();
  check('không còn màn "Có lỗi xảy ra"', !/Có lỗi xảy ra/.test(chu), chu.slice(0, 200));
  check('không còn câu của máy chủ nói với máy',
    !/Không có quyền thực hiện/.test(chu), chu.slice(0, 200));
  check('nói bằng tiếng của người', /dành cho cô và nhà trường/.test(chu), chu.slice(0, 200));
}

// ===========================================================================
console.log('\n[6] CẤP 3 TRÊN TRÌNH DUYỆT THẬT — không thấy bé của cơ sở khác');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Tầng cơ sở là khác biệt lớn nhất giữa app 2 và app 1 — ba cơ sở, mỗi quản
  // lý chỉ được thấy cơ sở mình. Nhưng cho tới trước đợt Đ38, vai Cấp 3 CHƯA
  // TỪNG được mở trên một trình duyệt thật lần nào: mọi bài về tầng cơ sở đều
  // gọi API bằng `fetch`.
  //
  // Chỗ API đúng mà màn hình vẫn sai là chuyện có thật và hay xảy ra: màn hình
  // giữ lại danh sách của lần tải trước, một ô chọn dựng từ nguồn khác, một
  // đường gọi quên tham số lọc. Không mở màn thì không thấy.
  //
  // Bài này dựng đúng cảnh nguy hiểm: chuyển MỘT BÉ sang nhóm của cơ sở 2, rồi
  // đăng nhập bằng tài khoản khoá vào cơ sở 1 và đi qua các màn có tên bé.
  const A = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'quantri', password: MK_QUANTRI }),
  });
  const ckA = A.headers.get('set-cookie').split(';')[0];
  const api = async (m, p, body) => {
    const r = await fetch(`${BASE}${p}`, {
      method: m,
      headers: { 'Content-Type': 'application/json', Cookie: ckA },
      body: body ? JSON.stringify(body) : undefined,
    });
    let d = null; try { d = await r.json(); } catch { /* không phải JSON */ }
    return { status: r.status, data: d };
  };

  // c3 "Mầm 1" thuộc cơ sở 2 và chưa có bé nào — chuyển một bé sang đó.
  const dsBe = (await api('GET', '/api/admin/students')).data || [];
  const be = dsBe.find(b => b.classId === 'c1');
  check('có bé của cơ sở 1 để chuyển sang cơ sở 2', !!be, dsBe.length);
  const chuyen = await api('PUT', `/api/admin/students/${be.id}`, { classId: 'c3' });
  check('chuyển bé sang nhóm của cơ sở 2 → 200', chuyen.status === 200, chuyen.data);

  await dangNhap('quanlycs1', MK_QUANTRI);

  // Một bé của cơ sở 1 để làm CHỨNG CỨ MÀN HÌNH CÓ DỰNG THẬT.
  const beCs1 = dsBe.find(b => b.classId === 'c1' && b.id !== be.id);
  check('có một bé khác của cơ sở 1 để đối chứng', !!beCs1, dsBe.map(b => b.classId));

  // Hai màn có tên bé. Mỗi màn hỏi BA điều, và câu hỏi thứ hai là câu quan
  // trọng nhất:
  //
  //   1. màn dựng lên được, không rơi vào màn lỗi;
  //   2. MÀN CÓ THẬT SỰ HIỆN TÊN BÉ KHÔNG — nếu không thì câu 3 vô nghĩa;
  //   3. và không lọt tên bé của cơ sở khác.
  //
  // Thiếu câu 2 là bẫy đã sập một lần ngay trong đợt này: bản đầu của mục này
  // mở `#/students`, mà phân hệ đó đang TẮT trong dữ liệu mẫu — màn hình hiện
  // màn "Không mở được", không có tên bé nào, nên phép kiểm "không lọt tên bé
  // của cơ sở khác" báo xanh mà chẳng kiểm gì.
  //
  // Bắt theo TIÊU ĐỀ "Không mở được", không bắt theo câu giải thích: từ Đ54 câu
  // đó đổi theo lý do (nhà trường tắt / ngoài vai / ngoài chức vụ / sự cố), còn
  // tiêu đề thì chung cho cả bốn.
  // NGÀY XEM PHẢI TỰ DỰNG, KHÔNG TRÔNG VÀO DỮ LIỆU MẪU RƠI ĐÚNG CHỖ.
  //
  // Từ Đ97, vai quản trị mở màn Điểm danh ra là BẢNG RÀ SOÁT của cả phạm vi —
  // không còn rơi nhầm vào lịch tháng của một bé bất kỳ như trước. Bảng ấy chỉ
  // liệt kê bé CHƯA có dòng điểm danh và CHƯA có đơn nghỉ được duyệt, nên tên
  // bé chỉ hiện ra khi tình huống đó có thật.
  //
  // Chọn một ngày ĐÃ QUA đủ xa để dữ liệu mẫu chưa chấm điểm danh (seed chỉ
  // chấm 20 ngày học gần nhất). Hai lý do, và lý do thứ hai mới là chính:
  //   - ngày đã qua thì `quaGio` luôn đúng, bảng luôn có nghĩa;
  //   - lấy HÔM NAY thì bài này xanh sau 9 giờ và đỏ trước 9 giờ — đúng loại
  //     đỏ theo giờ trong ngày mà Đ92 vừa phải đi vá bốn bài.
  const NGAY_XA = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

  for (const [hash, ten] of [['#/attendance', 'Điểm danh']]) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.evaluate((d) => App.views.attendance.setDate(d), NGAY_XA);
    await page.waitForTimeout(1400);
    const chu = await page.locator('body').innerText();
    check(`${ten}: Cấp 3 mở được, không rơi vào màn lỗi hay màn "đang tắt"`,
      !/Có lỗi xảy ra|Không mở được/.test(chu), chu.slice(0, 150));
    check(`${ten}: MÀN CÓ HIỆN TÊN BÉ — nếu không thì phép kiểm sau vô nghĩa`,
      chu.includes(beCs1.name), `không thấy "${beCs1?.name}" trên ${hash}`);
    check(`${ten}: KHÔNG lọt tên bé của cơ sở khác lên màn hình`,
      !chu.includes(be.name), `thấy "${be.name}" trên ${hash}`);
  }

  // ĐI THẲNG TỪ TRONG PHIÊN CỦA TRÌNH DUYỆT.
  //
  // Hai phép kiểm trên đọc thứ HIỆN RA. Phép kiểm này hỏi thứ nằm phía sau: gọi
  // API bằng chính phiên đăng nhập của trình duyệt, cho mã bé của cơ sở khác.
  // Màn hình lọc đúng mà đường API còn mở thì chỉ cần một địa chỉ gõ tay là ra —
  // và đó mới là chốt chặn thật.
  const thangTay = await page.evaluate(async (id) => {
    const r = await fetch(`/api/students/${id}`, { headers: { Accept: 'application/json' } });
    return r.status;
  }, be.id);
  check('gọi thẳng API từ trong phiên của Cấp 3 cũng bị từ chối',
    thangTay === 403 || thangTay === 404, thangTay);

  // Và ô chọn nhóm — chỗ dễ quên lọc nhất, vì nó thường dựng từ một nguồn khác
  // với danh sách chính.
  await page.goto(`${BASE}/#/attendance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const nhomTrenMan = await page.evaluate(() =>
    [...document.querySelectorAll('select option')].map(o => o.value).filter(Boolean));
  check('ô chọn nhóm KHÔNG liệt kê nhóm của cơ sở khác',
    !nhomTrenMan.includes('c3'), nhomTrenMan);

  // Trả bé về chỗ cũ để các mục sau (nếu có) đo trên nền như thường.
  await api('PUT', `/api/admin/students/${be.id}`, { classId: 'c1' });
}

// ===========================================================================
console.log('\n[5] Không có lỗi JavaScript nào trên đường đi');
{
  check('không màn nào ném lỗi', loiJS.length === 0, loiJS.slice(0, 3));
}

await browser.close();
sv.dung();
donThuMucTam(DIR);
tongKet();
