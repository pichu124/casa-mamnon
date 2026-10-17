// BÀI HỌC B9 CHO TÁM PHÂN HỆ MẦM NON:
// màn nào hiển thị dữ liệu thì phải có người tạo được dữ liệu đó QUA GIAO DIỆN.
//
// Cần Playwright. Chạy bằng:  npm run test:giao-dien
//
// VÌ SAO TỆP NÀY TỒN TẠI
//
// App 1 từng có màn hình đẹp, đầy dữ liệu mẫu, mà không đường nào tạo được dữ
// liệu ấy ngoài việc sửa tay vào cơ sở dữ liệu. Bài học rút ra được ghi ở
// `docs/TIEN-DO.md` là B9. `test/bien-soan-giao-dien.test.mjs` canh bài học đó
// cho các màn LÕI kế thừa từ app 1 — mười đường `#/`, không đường nào là phân
// hệ mầm non.
//
// Nghĩa là đúng những màn cô soạn nhiều nhất (nhật ký ngày, quan sát, chủ đề
// tuần, kế hoạch của bé) lại không có bài nào đi hết đường ghi trên trình duyệt
// thật. Bộ `man-hinh-phan-he` có mở tám màn đó, nhưng nó cố ý chỉ hỏi "màn có
// dựng lên được không" — không bấm nút nào, không lưu gì cả.
//
// BÀI NÀY ĐI ĐỦ VÒNG, TRÊN TRÌNH DUYỆT THẬT, CHO TỪNG PHÂN HỆ:
//
//   mở màn → tìm thấy đường ghi → điền → lưu → THẤY LẠI thứ vừa lưu trên màn.
//
// Bước cuối là bước đắt nhất và cũng là bước duy nhất chứng minh được cả vòng:
// nút bấm được mà dữ liệu không hiện lại thì cô vẫn phải gọi điện hỏi văn
// phòng, đúng cái app này sinh ra để bỏ đi.
//
// MỤC [0] LÀ BỘ CANH CHO CHÍNH MÓN NỢ NÀY
//
// Món nợ B9 lớn dần theo từng phân hệ thêm mới. Nên trước khi mở trình duyệt,
// bài đọc `modules/*/module.json` và đòi mọi phân hệ đều có một dòng trong bảng
// dưới. Thêm phân hệ thứ chín mà quên viết đường ghi cho nó là bài đỏ ngay,
// không cần ai nhớ.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  GOC, thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, CHROMIUM, tatBannerMoiCai, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// ===========================================================================
// BẢNG PHỦ — mỗi phân hệ một dòng, và mục [0] canh cho nó không thiếu dòng nào.
//
//   ma      mã phân hệ, khớp `key` trong module.json
//   ten     tên hiển thị, chỉ để đọc lời báo lỗi cho dễ
//   ai      vai NGƯỜI SOẠN của phân hệ đó — không phải phân hệ nào cũng là cô:
//           Cambridge chỉ văn phòng đăng được, hồ sơ đón trả thì gia đình khai
//   vi_sao_khong_ghi  chỉ điền khi phân hệ THẬT SỰ không có đường ghi nào
// ===========================================================================
const PHU = [
  { ma: 'nhatky', ten: 'Nhật ký ngày', ai: 'cô' },
  { ma: 'tienan', ten: 'Báo ăn & tiền ăn', ai: 'cô' },
  { ma: 'dontra', ten: 'Đón trả bé', ai: 'gia đình khai + cô ghi sổ' },
  { ma: 'thuchup', ten: 'Ghi nhanh', ai: 'cô' },
  { ma: 'hanhtrinh', ten: 'Hành trình học tập', ai: 'cô' },
  { ma: 'kehoachbe', ten: 'Kế hoạch của bé', ai: 'cô' },
  { ma: 'cambridge', ten: 'Cambridge & Kết nối ở nhà', ai: 'văn phòng' },
  { ma: 'hocphi', ten: 'Học phí', ai: 'văn phòng' },
  { ma: 'baocaohoctap', ten: 'Báo cáo học tập', ai: 'nhà trường soạn mẫu + cô soạn báo cáo' },
  { ma: 'nhansu', ten: 'Nhân sự & chấm công', ai: 'Nhân sự / ban giám hiệu' },
  {
    ma: 'xuatbaocao', ten: 'Xuất báo cáo', ai: 'văn phòng',
    vi_sao_khong_ghi: 'Chỉ ĐỌC dữ liệu của phần khác ra tệp Excel, không có đường ghi nào; '
      + 'đường tải tệp có bài riêng test/xuat-bao-cao.test.mjs.',
  },
];

// ===========================================================================
console.log('\n[0] Mọi phân hệ đang có đều phải được bài này đi hết đường ghi');
{
  const thuMuc = fs.readdirSync(path.join(GOC, 'modules'), { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  const tren_dia = [];
  for (const ten of thuMuc) {
    const tep = path.join(GOC, 'modules', ten, 'module.json');
    if (!fs.existsSync(tep)) continue;
    let mj = null;
    try { mj = JSON.parse(fs.readFileSync(tep, 'utf8')); } catch (_) { continue; }
    tren_dia.push((mj && mj.key) || ten);
  }
  check('đọc được danh sách phân hệ trên đĩa', tren_dia.length > 0, tren_dia);

  const daPhu = new Set(PHU.map(p => p.ma));
  const thieu = tren_dia.filter(k => !daPhu.has(k));
  check('KHÔNG phân hệ nào nằm ngoài bảng phủ của bài này',
    thieu.length === 0,
    thieu.length ? `chưa có dòng trong PHU: ${thieu.join(', ')}` : '');

  const thua = [...daPhu].filter(k => !tren_dia.includes(k));
  check('bảng phủ không kể tên phân hệ đã gỡ khỏi kho mã',
    thua.length === 0, thua);

  // Một dòng chỉ được miễn phần bấm nút khi nói rõ vì sao. Không có lời giải
  // thích thì đó là món nợ B9 đang trốn dưới dạng một dòng bảng.
  const troTruot = PHU.filter(p => p.vi_sao_khong_ghi !== undefined
    && String(p.vi_sao_khong_ghi).trim().length < 20);
  check('phân hệ nào được miễn đường ghi thì phải ghi rõ lý do',
    troTruot.length === 0, troTruot.map(p => p.ma));
}

const DIR = thuMucTam('bien-soan-phan-he');
sinhDuLieu(DIR);
batPhanHe(DIR, PHU.map(p => p.ma));
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3310), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

// MÁY NGHE HỘP CHỌN TỆP PHẢI GẮN TỪ ĐÂY, KHÔNG GẮN NGAY TRƯỚC LẦN BẤM.
//
// Playwright chỉ chặn hộp chọn tệp sau khi báo được xuống trình duyệt, mà đó là
// một vòng đi–về. Gắn ngay trước `click` thì lần bấm có thể tới trước, hộp bị
// trình duyệt tự huỷ, và bài đứng chờ một sự kiện không bao giờ tới. Đã gặp
// đúng lỗi đó ở bản đầu của mục [4].
// Vài đường ghi hỏi lại bằng `confirm()` trước khi gửi cho gia đình. Trình
// duyệt do máy điều khiển tự bấm "Huỷ" nếu không ai trả lời, nên bài sẽ đứng ở
// bước nháp mà không hiểu vì sao — trả lời "Đồng ý" ở đây đúng như cô bấm.
page.on('dialog', (d) => { d.accept().catch(() => {}); });

page.on('filechooser', async (fc) => {
  try { await fc.setFiles({ name: 'khoanhkhac.png', mimeType: 'image/png', buffer: ANH_THU }); }
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

// Đổi mật khẩu tạm của quản trị để đăng nhập được như một người thật.
{
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', 'hieutruong');
  await page.fill('#lg-pass', mkQT);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    await API.post('/api/auth/set-new-password', { newPassword: 'quantri2026' });
  });
}

const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
};
const chuTrenMan = () => page.locator('#view').innerText();
// Màn nhật ký của cô đi theo BƯỚC (Đ141); bước mở sẵn tuỳ giờ trong ngày, nên
// phải tự bấm sang bước Bữa trưa trước khi đo.
async function moBuocTrua() {
  const nut = page.locator('.seg [data-buoc="bua:lunch"]');
  if (!(await nut.count())) return;
  if ((await nut.getAttribute('class')) !== 'active') {
    await nut.click();
    await page.waitForTimeout(700);
  }
}

// Một tấm PNG 1×1 thật, dựng bằng mã chứ không kèm tệp ảnh vào kho: bộ canh dữ
// liệu chặn ảnh trong kho mã, và đúng như vậy.
const ANH_THU = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

// ===========================================================================
console.log('\n[1] Nhật ký ngày — cô ghi và thấy lại phần vừa ghi');
{
  // Từ Đ141 màn của cô đi theo BƯỚC từng bữa (nhà trường 07/09), và "tự bỏ đi
  // với các bạn không phải lớp nhà trẻ" — nên đo trên cô nhóm Nhà trẻ 1, ở
  // bước Bữa trưa.
  await dangNhap('giaovien4', '123456');
  await moMan('#/nhatky');
  await moBuocTrua();

  check('cô thấy nút lưu bước này cho cả nhóm', await page.locator('#nk-luu').count() === 1);
  const soO = await page.locator('.nk-o').count();
  check('màn có ô nhập cho từng bé', soO > 0, soO);
  check('màn hiện tên bé thật của nhóm', /Ngô Gia Huy/.test(await chuTrenMan()));

  // Ghi cho ĐÚNG MỘT bé, và ghi cả ô chữ tự do — ô chữ là thứ chỉ đường ghi
  // qua giao diện tạo được, khác với mấy ô chọn có thể sinh từ "Áp cho cả nhóm".
  const beDau = await page.locator('.nk-o').first().getAttribute('data-be');
  await page.selectOption(`select.nk-o[data-be="${beDau}"][data-truong="bua.lunch.muc"]`, 'het');
  await page.fill(`input.nk-o[data-be="${beDau}"][data-truong="bua.lunch.ghiChu"]`, 'Bé tự xúc, ăn thêm nửa bát');
  await page.click('#nk-luu');
  await page.waitForTimeout(1600);
  await moBuocTrua();

  const sauLuu = await chuTrenMan();
  check('LƯU XONG MÀN HIỆN NGAY DẤU "Đã ghi"', /Đã ghi/.test(sauLuu), sauLuu.slice(0, 160));

  // Mở lại từ đầu: phần cô ghi phải còn, không phải chỉ còn trong bộ nhớ trang.
  await moMan('#/nhatky');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await moBuocTrua();
  const ghiChu = await page.inputValue(`input.nk-o[data-be="${beDau}"][data-truong="bua.lunch.ghiChu"]`).catch(() => '');
  check('MỞ LẠI MÀN VẪN THẤY ĐÚNG CHỮ CÔ ĐÃ GÕ',
    ghiChu === 'Bé tự xúc, ăn thêm nửa bát', ghiChu);
  const buaTrua = await page.inputValue(`select.nk-o[data-be="${beDau}"][data-truong="bua.lunch.muc"]`).catch(() => '');
  check('và ô bữa trưa vẫn giữ lựa chọn cô đã chọn', buaTrua === 'het', buaTrua);
}

// ===========================================================================
console.log('\n[2] Báo ăn & tiền ăn — văn phòng chốt số cho bếp và thấy lại');
{
  // Từ Đ140 Báo ăn là việc của VĂN PHÒNG (bảng phân quyền của trường 07/09:
  // "văn phòng nhập, không hiện với GV, PH") — cô không còn ô này.
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/tienan');
  check('màn có nút chốt báo ăn', await page.locator('[data-chot]').count() >= 1);

  await page.locator('[data-chot]').first().click();
  await page.waitForTimeout(800);
  check('mở được hộp chốt báo ăn', await page.locator('#ta-so').count() === 1);

  await page.fill('#ta-ghichu', 'Thêm 2 suất cho cô, bé Bin ăn cháo loãng');
  await page.click('#ta-luu');
  await page.waitForTimeout(1600);

  const sauChot = await chuTrenMan();
  check('CHỐT XONG MÀN HIỆN GHI CHÚ CÔ GỬI BẾP',
    /Thêm 2 suất cho cô/.test(sauChot), sauChot.slice(0, 200));
  check('và nút đổi thành "Sửa số đã chốt"', /Sửa số đã chốt/.test(sauChot));

  await moMan('#/tienan');
  check('mở lại màn vẫn còn số đã chốt', /Thêm 2 suất cho cô/.test(await chuTrenMan()));
}

// ===========================================================================
console.log('\n[3] Đón trả bé — gia đình đọc sổ và nhắn văn phòng, cô ghi sổ ở cổng');
{
  // Phân hệ này có HAI người soạn ở hai màn khác nhau. Bỏ sót vế nào cũng là
  // một nửa món nợ B9 còn nguyên.
  await dangNhap('phuhuynh', '123456');
  await moMan('#/dontra');
  // Nhà này có hai con, hai nhóm. Khai nhầm bé thì vế "cô ở cổng thấy người
  // gia đình vừa khai" xanh hay đỏ đều do may rủi, nên chọn tường minh bé An —
  // bé của nhóm mà tài khoản cô bên dưới phụ trách.
  await page.locator('.student-chip', { hasText: 'Nguyễn Bảo An' }).click();
  await page.waitForTimeout(1000);
  // TỪ Đ151, GIA ĐÌNH KHÔNG KHAI NGƯỜI ĐÓN TRONG APP NỮA.
  //
  // Nhà trường 10/09: *"trường khi đón trả bé đã đăng ký bằng file giấy rồi,
  // mình nghĩ điền file giấy lưu vết sẽ an toàn hơn cho trường"*, và đón thay
  // một lần thì *"PH sẽ nhắn tin với văn phòng để thông báo"*.
  //
  // Mục này trước đây đo vế "gia đình khai người đón". Vế ấy đã gỡ khỏi màn,
  // nên nay đo đúng thứ THAY CHỖ NÓ — và đo cả hai điều mà việc gỡ dễ làm hỏng:
  // gia đình có được chỉ đường đi tiếp không, và sổ đón trả có còn nguyên không.
  const manPH = await chuTrenMan();
  check('gia đình KHÔNG còn nút khai người được đón', await page.locator('#dt-them').count() === 0);
  check('cũng không còn nút uỷ quyền một lần', await page.locator('#dt-uy').count() === 0);
  check('mà có nút NHẮN CHO VĂN PHÒNG — đúng cách trường nói sẽ làm',
    await page.locator('#dt-nhan-vp').count() === 1);
  check('và màn nói rõ vì sao: nhà trường dùng bản giấy ở văn phòng',
    /bản giấy/.test(manPH), manPH.slice(0, 260));
  // `innerText` trả về chữ ĐÃ QUA CSS, mà `.section-label` viết hoa toàn bộ —
  // nên phải dò không phân biệt hoa thường, không thì phép kiểm đỏ vì một luật
  // trình bày chứ không vì thứ nó đang canh.
  check('SỔ ĐÓN TRẢ CỦA CON VẪN CÒN — gỡ lối vào, không gỡ dữ liệu',
    /sổ đón trả gần đây/i.test(manPH), manPH.slice(0, 300));

  await page.click('#dt-nhan-vp');
  await page.waitForTimeout(1200);
  check('bấm vào là sang đúng màn Nhắn tin',
    await page.evaluate(() => location.hash) === '#/messages');
  await moMan('#/dontra');
  await page.waitForTimeout(600);

  // Vế thứ hai: cô ở cổng chọn đúng người gia đình vừa khai rồi ghi vào sổ.
  await dangNhap('giaovien', '123456');
  await moMan('#/dontra');
  check('màn cổng của cô có nút ghi đã trả bé', await page.locator('[data-tra]').count() >= 1);

  const maBeAn = await page.evaluate(async () => {
    const d = await API.get('/api/students');
    const ds = Array.isArray(d) ? d : (d.students || []);
    return (ds.find(s => s.name === 'Nguyễn Bảo An') || {}).id || '';
  });
  check('cô tìm được thẻ của đúng bé gia đình vừa khai người đón',
    !!maBeAn && await page.locator(`[data-tra="${maBeAn}"]`).count() === 1, maBeAn);
  await page.locator(`[data-tra="${maBeAn}"]`).click();
  await page.waitForTimeout(800);
  check('mở được hộp ghi trả bé', await page.locator('#dt-ai').count() === 1);
  const cacNguoi = await page.locator('#dt-ai option').allInnerTexts();
  // Gia đình không khai trước nữa, nên ô chọn của cô phải LUÔN có lối "người
  // khác — ghi rõ tên". Không có lối đó thì từ Đ151 cô ở cổng không ghi nổi
  // một dòng nào vào sổ.
  check('ô chọn người đón luôn có lối "Người khác — ghi rõ tên"',
    cacNguoi.some(t => /Người khác/.test(t)), cacNguoi);
  await page.selectOption('#dt-ai', 'khac|');
  await page.waitForTimeout(400);
  check('chọn "Người khác" thì hiện ô gõ tên', await page.locator('#dt-ten').isVisible());
  await page.fill('#dt-ten', 'Nguyễn Thị Lan');

  await page.fill('#dt-ghichu', 'Có đối chiếu ảnh ở cổng');
  await page.click('#dt-luu');
  await page.waitForTimeout(1600);
  const manCo = await chuTrenMan();
  check('CÔ GHI XONG THÌ MÀN CỔNG HIỆN NGAY LẦN TRẢ ĐÓ',
    /Có đối chiếu ảnh ở cổng/.test(manCo) || /Sửa lại người đã đón/.test(manCo),
    manCo.slice(0, 250));
}

// ===========================================================================
console.log('\n[4] Ghi nhanh — cô ghi một khoảnh khắc qua đúng nút trên màn');
{
  await moMan('#/thuchup');
  check('màn có nút ghi nhanh một khoảnh khắc', await page.locator('#tc-ghi').count() === 1);

  // Nút này mở máy ảnh của điện thoại. Trên trình duyệt thật đó là hộp chọn
  // tệp — đưa cho nó một tấm ảnh thật để đi qua luôn `UI.nenAnh`, đúng đường
  // cô đi khi đứng lớp.
  await page.click('#tc-ghi');
  await page.waitForSelector('#tc-note', { timeout: 10000 });
  check('chọn ảnh xong mở ra ô ghi chú', await page.locator('#tc-note').count() === 1);
  // Ô xem trước chỉ hiện khi ảnh đã qua `UI.nenAnh` trong trình duyệt thật —
  // tức phép kiểm này canh luôn cả hàm nén ảnh dùng chung.
  check('và hộp ghi hiện ảnh cô vừa chụp',
    await page.locator('#modal-overlay img').count() >= 1);

  await page.fill('#tc-note', 'An tự xúc hết bát cơm, không cần cô nhắc');
  await page.click('#tc-luu');
  await page.waitForTimeout(2500);

  const sauGhi = await chuTrenMan();
  check('GHI XONG MÀN HIỆN LẠI BÀI VỪA GHI',
    /An tự xúc hết bát cơm/.test(sauGhi), sauGhi.slice(0, 250));
  const daLen = await page.evaluate(async () => (await API.get('/api/thuchup')).ghiNhan?.length || 0);
  check('và bài ghi đã lên tới máy chủ, không nằm lại trong máy', daLen >= 1, daLen);
}

// ===========================================================================
console.log('\n[5] Hành trình học tập — cô ghi một quan sát và chủ đề tuần');
{
  // Góp ý 16/10 (mục 6): Hành trình mở vào bốn tab của bé; Suy ngẫm cuối ngày
  // và Chủ đề tuần là hai lối phụ dưới tiêu đề.
  await moMan('#/hanhtrinh');
  await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Suy ngẫm cuối ngày' }).click();
  await page.waitForTimeout(1200);
  check('lối phụ Suy ngẫm cuối ngày có nút ghi một quan sát', await page.locator('#ht-them').count() === 1);

  await page.click('#ht-them');
  await page.waitForTimeout(800);
  check('mở được hộp ghi quan sát', await page.locator('#ht-mota').count() === 1);
  const cacBe = await page.locator('#ht-be option').count();
  check('hộp ghi có danh sách bé để chọn', cacBe > 1, cacBe);

  const maBe = await page.locator('#ht-be option').nth(1).getAttribute('value');
  await page.selectOption('#ht-be', maBe);
  await page.fill('#ht-mota', 'Bé xếp chồng năm khối gỗ rồi tự đếm lại từ đầu');
  await page.click('#ht-luu');
  await page.waitForTimeout(1800);

  const sauQs = await chuTrenMan();
  check('GHI XONG MÀN HIỆN NGAY QUAN SÁT VỪA GHI',
    /xếp chồng năm khối gỗ/.test(sauQs), sauQs.slice(0, 250));

  // Chủ đề tuần là màn B9 nói tới đúng chữ trong docs/TIEN-DO.md.
  await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Chủ đề tuần' }).click();
  await page.waitForTimeout(1200);
  check('mở được màn soạn chủ đề tuần', await page.locator('#ht-cd-luu').count() >= 1,
    (await chuTrenMan()).slice(0, 160));
}

// ===========================================================================
console.log('\n[6] Kế hoạch của bé — cô lưu kế hoạch cả nhóm');
{
  await moMan('#/kehoachbe');
  check('màn có nút lưu kế hoạch cả nhóm', await page.locator('#kb-luu').count() === 1);
  const soOKh = await page.locator('.kb-o').count();
  check('mỗi bé có ô nhập cho từng góc', soOKh > 0, soOKh);

  const beKh = await page.locator('.kb-o').first().getAttribute('data-be');
  const gocKh = await page.locator('.kb-o').first().getAttribute('data-goc');
  await page.fill(`.kb-o[data-be="${beKh}"][data-goc="${gocKh}"]`, 'Tháng này cùng bé rót nước bằng bình nhỏ');
  await page.click('#kb-luu');
  await page.waitForTimeout(1800);

  await moMan('#/kehoachbe');
  const giuLai = await page.inputValue(`.kb-o[data-be="${beKh}"][data-goc="${gocKh}"]`).catch(() => '');
  check('MỞ LẠI MÀN VẪN THẤY ĐÚNG KẾ HOẠCH CÔ ĐÃ GÕ',
    giuLai === 'Tháng này cùng bé rót nước bằng bình nhỏ', giuLai);
}

// ===========================================================================
console.log('\n[7] Cambridge & Kết nối ở nhà — văn phòng soạn, gia đình đọc được');
{
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/cambridge');
  check('văn phòng thấy nút soạn bài mới', await page.locator('#cam-them').count() === 1);

  await page.click('#cam-them');
  await page.waitForTimeout(800);
  check('mở được hộp soạn bài', await page.locator('#cam-tieude').count() === 1);
  await page.fill('#cam-tieude', 'Tuần này nhóm mình tìm hiểu chủ điểm Animals');
  await page.fill('#cam-noidung', 'Ở nhà gia đình cùng con gọi tên ba con vật quen thuộc bằng tiếng Anh.');
  await page.click('#cam-luu');
  await page.waitForTimeout(1800);

  const sauSoan = await chuTrenMan();
  check('SOẠN XONG MÀN HIỆN BÀI VỪA SOẠN',
    /chủ điểm Animals/.test(sauSoan), sauSoan.slice(0, 250));
  check('và bài mới được đánh dấu là NHÁP, gia đình chưa đọc được',
    /Nháp/.test(sauSoan), sauSoan.slice(0, 250));

  // Gửi tới gia đình rồi mới sang xem bằng tài khoản gia đình.
  await page.locator('button', { hasText: 'Gửi tới gia đình' }).first().click();
  await page.waitForTimeout(1800);
  check('gửi xong màn ghi ĐÃ GỬI GIA ĐÌNH',
    /Đã gửi gia đình/.test(await chuTrenMan()), (await chuTrenMan()).slice(0, 250));

  await dangNhap('phuhuynh', '123456');
  await moMan('#/cambridge');
  const manGd = await chuTrenMan();
  check('GIA ĐÌNH ĐỌC ĐƯỢC BÀI VĂN PHÒNG VỪA GỬI',
    /chủ điểm Animals/.test(manGd), manGd.slice(0, 250));
  check('nhưng gia đình KHÔNG có nút soạn bài', await page.locator('#cam-them').count() === 0);
}

// ===========================================================================
// Góp ý của trường 06/10, mục 5: bỏ tab "Tất cả"; mỗi loại bài một mẫu soạn;
// "Thêm block" chỉ ở tab Letter for Parent; gia đình chỉ thấy BLOCK ĐANG HỌC.
console.log('\n[7b] Cambridge — ba tab, ba mẫu soạn, gia đình chỉ thấy block đang học');
{
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/cambridge');
  const tab = await page.locator('#cam-loc button').allInnerTexts();
  check('đúng BA tab, không còn "Tất cả"', tab.length === 3 && !tab.some(t => /Tất cả/.test(t)), tab);
  check('mở sẵn ở Letter for Parent',
    /Letter for Parent/.test(await page.locator('#cam-loc button.active').innerText().catch(() => '')));
  check('tab Letter có nút Thêm block', await page.locator('#cam-block-quan-ly').count() === 1);

  // Mẫu soạn đi theo loại bài. Ô ẩn vẫn nằm trong mẫu (để sửa bài cũ không
  // xoá chữ), nên đo bằng "có HIỆN không", không đo "có tồn tại không".
  await page.click('#cam-them');
  await page.waitForTimeout(600);
  const hien = (sel) => page.locator(sel).isVisible();
  check('soạn mới ở tab Letter thì loại bài chọn sẵn là Letter',
    await page.inputValue('#cam-loai') === 'thu-phu-huynh');
  check('Letter: CÓ ô Nội dung', await hien('#cam-noidung'));
  check('Letter: KHÔNG có ô Hoạt động Cambridge', !(await hien('#cam-mon')) && !(await hien('#cam-hd-1-ten')));
  check('Letter: vẫn có Block và Lứa tuổi', (await hien('#cam-block')) && (await hien('#modal-overlay #cam-lua')));
  await page.selectOption('#cam-loai', 'cambridge');
  check('Weekly Plan: KHÔNG có ô Nội dung', !(await hien('#cam-noidung')));
  // Góp ý 16/10, mục 8: 2 hoặc 3 hoạt động, mỗi hoạt động có tên chủ đề, từ
  // vựng, mục tiêu; sau đó mới tới mục chung Song / Chant / Story.
  const khoi = (i) => `#modal-overlay .cam-hd[data-hd="${i}"]`;
  check('Weekly Plan: mặc định HAI khối "Hoạt động 1", "Hoạt động 2"; khối 3 chưa hiện',
    (await hien(khoi(1))) && (await hien(khoi(2))) && !(await hien(khoi(3)))
      && /Hoạt động 1/.test(await page.locator(khoi(1)).innerText()) && /Hoạt động 2/.test(await page.locator(khoi(2)).innerText()));
  let duO = true;
  for (const i of [1, 2]) {
    for (const o of ['ten', 'chu-de', 'tu-vung', 'muc-tieu']) duO = duO && await hien(`#cam-hd-${i}-${o}`);
  }
  check('mỗi khối có Hoạt động (không bắt buộc), Tên chủ đề, Từ vựng, Mục tiêu', duO);
  check('sau các khối là mục chung Song / Chant và Story', (await hien('#cam-song')) && (await hien('#cam-story')));
  check('Weekly Plan: một bộ ô khung lẻ cũ (Hoạt động / Chủ đề / Từ vựng) không còn mời điền',
    !(await hien('#cam-mon')) && !(await hien('#cam-chu-de')) && !(await hien('#cam-tu-vung')));
  check('Weekly Plan: không mời điền ô "Kết nối ở nhà" trùng lặp', !(await hien('#cam-ket-noi')));
  await page.click('#cam-hd-them');
  check('bấm "Thêm hoạt động" thì hiện khối 3', await hien(khoi(3)));
  check('đủ BA khối thì nút "Thêm hoạt động" ẩn — tối đa ba', !(await hien('#cam-hd-them')));
  // Góp ý 16/10, mục 9: Home Connection chỉ còn tiêu đề, nội dung, gửi cho ai,
  // tuần, khung Cambridge (block, tuần trong block, lứa tuổi).
  await page.selectOption('#cam-loai', 'ket-noi');
  check('Home Connection: có Nội dung, Gửi cho ai, Gắn vào tuần, Block, Tuần trong block, Lứa tuổi',
    (await hien('#cam-noidung')) && (await hien('#cam-phamvi')) && (await hien('#cam-tuan'))
      && (await hien('#cam-block')) && (await hien('#cam-tuan-so')) && (await hien('#modal-overlay #cam-lua')));
  const hcThua = [];
  for (const sel of ['#cam-mon', '#cam-chu-de', '#cam-tu-vung', '#cam-song', '#cam-story', '#cam-ket-noi', khoi(1), '#cam-hd-them']) {
    if (await hien(sel)) hcThua.push(sel);
  }
  check('Home Connection: KHÔNG còn ô Hoạt động, Chủ đề, Từ vựng, Song / Chant (cũng không khối hoạt động)',
    hcThua.length === 0, hcThua);

  // Soạn một Weekly Plan HAI HOẠT ĐỘNG, không có ô Nội dung, chọn lứa 4–5, rồi
  // lưu bằng nút trên màn. Hai điều phải đúng: lứa đã chọn được GHI THẬT (Đ206
  // đặt trùng mã `cam-lua` giữa nút "Xem theo từng lứa" và ô chọn lứa, nên văn
  // phòng lưu gì cũng thành "mọi lứa"), và tờ không có ô Nội dung vẫn gửi được
  // tới gia đình.
  await page.selectOption('#cam-loai', 'cambridge');
  await page.fill('#cam-tieude', 'Weekly Plan hai hoạt động — Farm animals');
  await page.fill('#cam-hd-1-ten', 'Communication and Language');
  await page.fill('#cam-hd-1-chu-de', 'Farm animals');
  await page.fill('#cam-hd-1-tu-vung', 'cow, pig, duck');
  await page.fill('#cam-hd-1-muc-tieu', 'Gọi tên ba con vật bằng tiếng Anh');
  await page.fill('#cam-hd-2-ten', 'Mathematics');
  await page.fill('#cam-hd-2-chu-de', 'Numbers');
  await page.fill('#cam-hd-2-muc-tieu', 'Đếm tới ba');
  await page.fill('#cam-song', 'Old MacDonald Had a Farm');
  await page.fill('#cam-story', 'Brown Bear, Brown Bear');
  await page.selectOption('#modal-overlay #cam-lua', '4-5');
  await page.click('#cam-luu');
  await page.waitForTimeout(1500);
  const baiWp = await page.evaluate(async () => {
    const d = await (await fetch('/api/cambridge?loai=cambridge')).json();
    return (d.bai || []).find(b => /hai hoạt động/.test(b.tieuDe)) || null;
  });
  check('lưu từ màn hình: LỨA ĐÃ CHỌN ĐƯỢC GHI THẬT (không rơi về "mọi lứa")',
    baiWp && baiWp.khung && baiWp.khung.luaTuoi === '4-5', baiWp && baiWp.khung);
  check('lưu từ màn hình: HAI hoạt động đúng thứ tự, khối thứ ba để trống thì bị bỏ',
    baiWp && (baiWp.hoatDong || []).map(h => h.chuDe).join('|') === 'Farm animals|Numbers'
      && baiWp.hoatDong[0].mucTieu === 'Gọi tên ba con vật bằng tiếng Anh' && baiWp.hoatDong[1].hoatDong === 'Mathematics',
    baiWp && baiWp.hoatDong);
  check('và mục chung Song / Chant, Story được ghi', baiWp && baiWp.khung.songChant === 'Old MacDonald Had a Farm'
    && baiWp.story === 'Brown Bear, Brown Bear', baiWp && { song: baiWp.khung.songChant, story: baiWp.story });
  const guiWp = await page.evaluate(async (id) => (await fetch(`/api/cambridge/${id}/cong-bo`, { method: 'POST' })).status, baiWp && baiWp.id);
  check('Weekly Plan không có ô Nội dung, chỉ có hoạt động, VẪN GỬI ĐƯỢC tới gia đình', guiWp === 200, guiWp);

  // Đổi tab bằng đường dẫn; tab khác không có khối block.
  await page.locator('#cam-loc button', { hasText: 'Cambridge Weekly Plan' }).click();
  await page.waitForTimeout(1200);
  check('bấm tab đổi đường dẫn thành #/cambridge/cambridge',
    await page.evaluate(() => location.hash) === '#/cambridge/cambridge');
  check('tab Weekly Plan KHÔNG có nút Thêm block', await page.locator('#cam-block-quan-ly').count() === 0);
  const theWp = await page.locator('.card', { hasText: 'Weekly Plan hai hoạt động' }).first().innerText().catch(() => '');
  check('THẺ WEEKLY PLAN hiện lần lượt "Hoạt động 1 — …", "Hoạt động 2 — …" kèm Mục tiêu',
    /Hoạt động 1 — Communication and Language/.test(theWp) && /Hoạt động 2 — Mathematics/.test(theWp) && /Mục tiêu:/.test(theWp), theWp);
  check('rồi mới tới mục chung Song / Chant, Story',
    theWp.indexOf('Song / Chant:') > theWp.indexOf('Hoạt động 2') && /Story:\s*Brown Bear/.test(theWp), theWp);
  await page.locator(`[data-sua="${baiWp && baiWp.id}"]`).click();
  await page.waitForTimeout(600);
  check('mở Sửa: hai khối mang đúng chữ đã lưu',
    (await page.inputValue('#cam-hd-1-chu-de')) === 'Farm animals' && (await page.inputValue('#cam-hd-2-muc-tieu')) === 'Đếm tới ba');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);

  // Hai block lứa 4–5: một đã qua, một đang học. Gia đình chỉ thấy block đang học.
  const homNay = await page.evaluate(() => UI.ngayVN());
  const lui = (n) => new Date(Date.parse(homNay + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const taoBlock = (b) => page.evaluate(async (b) => (await fetch('/api/cambridge/block', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
  })).status, b);
  check('văn phòng tạo được block đã qua',
    await taoBlock({ ten: 'Block Cũ Đã Qua', luaTuoi: '4-5', tuNgay: lui(-90), denNgay: lui(-30), mucTieu: 'Mục tiêu cũ' }) === 201);
  check('văn phòng tạo được block đang học',
    await taoBlock({ ten: 'Block Đang Học', luaTuoi: '4-5', tuNgay: lui(-10), denNgay: lui(30), mucTieu: 'Mục tiêu block này' }) === 201);
  await moMan('#/cambridge');
  const vp = await chuTrenMan();
  check('văn phòng: block đang học đứng trên', /Block Đang Học/.test(vp), vp.slice(0, 300));
  check('văn phòng: block khác vẫn sửa được, gập trong "Mọi block khác"',
    await page.locator('#cam-block-khac').count() === 1);

  await dangNhap('phuhuynh', '123456');
  await moMan('#/cambridge');
  const gd = await chuTrenMan();
  check('GIA ĐÌNH THẤY BLOCK CON ĐANG HỌC', /Block Đang Học/.test(gd) && /Mục tiêu block này/.test(gd), gd.slice(0, 300));
  check('GIA ĐÌNH KHÔNG THẤY BLOCK ĐÃ QUA', !/Block Cũ Đã Qua/.test(gd), gd.slice(0, 300));
  check('gia đình không có dòng "Mọi block khác"', await page.locator('#cam-block-khac').count() === 0);
  await moMan('#/cambridge/cambridge');
  const theGd = await page.locator('.card', { hasText: 'Weekly Plan hai hoạt động' }).first().innerText().catch(() => '');
  check('GIA ĐÌNH đọc thẻ Weekly Plan có "Hoạt động 2" và "Mục tiêu"',
    /Hoạt động 2 — Mathematics/.test(theGd) && /Mục tiêu:\s*Đếm tới ba/.test(theGd), theGd);
}

// ===========================================================================
console.log('\n[8] Học phí — văn phòng tạo khoản thu, gia đình nhìn thấy');
{
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/hocphi');
  check('văn phòng thấy nút tạo khoản thu', await page.locator('#hp-them').count() === 1);

  // Tạo cho ĐÚNG bé của tài khoản gia đình dùng ở dưới, để vế "gia đình nhìn
  // thấy" không phụ thuộc vào bé nào tình cờ đứng đầu ô chọn.
  // CHỌN THEO MÃ BÉ, KHÔNG CHỌN THEO NHÃN NGUYÊN VĂN.
  //
  // Từ Đ174 nhãn của ô này là "Tên bé · Nhóm" — trùng họ tên trong tiếng Việt
  // là chuyện thường, và đây là ô ra tiền nên một cái tên trần không đủ để
  // chọn đúng một đứa trẻ. Bài canh neo vào nhãn nguyên văn thì vỡ mỗi lần màn
  // hình nói rõ hơn, mà nói rõ hơn lại đúng là điều ta muốn.
  const maBe = await page.$$eval('#hp-hs option', (os) => {
    const o = os.find(x => x.textContent.trim().startsWith('Nguyễn Bảo An'));
    return o ? o.value : null;
  });
  check('tìm được bé Nguyễn Bảo An trong ô chọn', !!maBe, maBe);
  const nhanBe = await page.$$eval('#hp-hs option', (os) => {
    const o = os.find(x => x.textContent.trim().startsWith('Nguyễn Bảo An'));
    return o ? o.textContent.trim() : '';
  });
  check('Ô CHỌN BÉ NÓI CẢ TÊN NHÓM, không chỉ một cái tên trần (Đ174)',
    / · .+/.test(nhanBe), nhanBe);
  await page.selectOption('#hp-hs', maBe);
  await page.waitForTimeout(1400);
  // Ô chọn bé phải GIỮ NGUYÊN lựa chọn sau khi màn vẽ lại. Bản đầu không giữ:
  // màn quay về bé đầu danh sách, nên khoản thu văn phòng vừa tạo rơi vào nhà
  // người khác. Sai tiền, sai nhà, mà nhìn màn hình không thấy gì bất thường.
  const beDangChon = await page.locator('#hp-hs option:checked').innerText().catch(() => '');
  check('CHỌN BÉ XONG MÀN GIỮ ĐÚNG BÉ ĐÓ, KHÔNG NHẢY VỀ BÉ ĐẦU DANH SÁCH',
    /Nguyễn Bảo An/.test(beDangChon), beDangChon);

  await page.click('#hp-them');
  await page.waitForTimeout(800);
  check('mở được hộp tạo khoản thu', await page.locator('#hp-nd').count() === 1);
  await page.fill('#hp-nd', 'Tiền ăn tháng thử nghiệm');
  await page.fill('#hp-tien', '750000');
  await page.click('#hp-luu');
  await page.waitForTimeout(1800);

  const sauTao = await chuTrenMan();
  check('TẠO XONG MÀN HIỆN KHOẢN VỪA TẠO',
    /Tiền ăn tháng thử nghiệm/.test(sauTao), sauTao.slice(0, 250));

  await dangNhap('phuhuynh', '123456');
  await moMan('#/hocphi');
  const hpGd = await chuTrenMan();
  check('GIA ĐÌNH THẤY KHOẢN VĂN PHÒNG VỪA TẠO',
    /Tiền ăn tháng thử nghiệm/.test(hpGd), hpGd.slice(0, 250));
  check('gia đình KHÔNG thấy nút tạo khoản thu', await page.locator('#hp-them').count() === 0);

  // GHI SỔ TIỀN LÀ VIỆC CỦA VĂN PHÒNG (Đ42) — nên màn của cô không được bày
  // hai nút đó. Máy chủ đã chặn; nếu màn hình vẫn bày thì cô bấm và nhận một
  // câu từ chối, tức app hứa một việc nó không cho làm.
  //
  // Phép kiểm này phải ở đây chứ không ở bộ API: dò mã nguồn bằng biểu thức
  // không bắt được — đã thử ngược và nó xanh cả khi cổng đã mở toang.
  //
  // TỪ Đ140 CÔ KHÔNG CÒN MÀN HỌC PHÍ NÀO CẢ (bảng phân quyền của trường
  // 07/09: "ở giao diện giáo viên bỏ đi luôn") — mạnh hơn cả "không có hai
  // nút": mở địa chỉ #/hocphi bằng tay thì nhận màn "không mở được" trung
  // tính, không ô chọn bé, không khoản nào, không nút nào.
  await dangNhap('giaovien', '123456');
  await moMan('#/hocphi');
  await page.waitForTimeout(1200);
  const hpCo = await chuTrenMan();
  check('CÔ MỞ #/hocphi THÌ NHẬN MÀN "KHÔNG MỞ ĐƯỢC", nói tiếng của trường',
    /Không mở được/.test(hpCo) && /dành cho gia đình các bé và văn phòng/i.test(hpCo), hpCo.slice(0, 250));
  check('và KHÔNG nói ngược "chỉ dành cho cô và văn phòng" với chính cô',
    !/chỉ dành cho cô/.test(hpCo), hpCo.slice(0, 250));
  check('cô KHÔNG có ô chọn bé trên màn Học phí', await page.locator('#hp-hs').count() === 0);
  check('và KHÔNG đọc được khoản văn phòng đã tạo', !/Tiền ăn tháng thử nghiệm/.test(hpCo), hpCo.slice(0, 250));
  check('CÔ KHÔNG THẤY NÚT "Tạo khoản"', await page.locator('#hp-them').count() === 0);
  check('và KHÔNG thấy nút "Xác nhận" nào',
    await page.locator('#view button', { hasText: 'Xác nhận' }).count() === 0);
}

// ===========================================================================
console.log('\n[8b] Báo cáo học tập — nhà trường soạn mẫu, cô soạn báo cáo cho bé');
{
  // ĐI ĐỦ CẢ HAI NỬA, vì phân hệ này có hai người dùng khác hẳn nhau: nhà
  // trường dựng mẫu mỗi năm một lần, cô soạn báo cáo mỗi tháng. Nửa nào không
  // đi được qua giao diện thì nửa kia thành vô dụng.
  // Mật khẩu tạm đã được đổi ở mục [1]; từ đây dùng mật khẩu mới.
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/baocaohoctap');
  await page.click('#bc-tabs button[data-tab="mau"]');
  await page.waitForTimeout(500);
  check('nhà trường có nút tạo mẫu báo cáo', await page.locator('#bc-them-mau').count() === 1);

  await page.click('#bc-them-mau');
  await page.waitForSelector('#bm-ten', { timeout: 8000 });
  await page.fill('#bm-ten', 'Báo cáo tháng thử');
  await page.fill('#bm-tu', '0');
  await page.fill('#bm-den', '240');
  await page.fill('#bm-dong', 'I. KỸ NĂNG TỰ PHỤC VỤ | Lưu ý | chu\nII. PHÁT TRIỂN NHẬN THỨC | Giác quan | muc');
  await page.click('#bm-luu');
  await page.waitForTimeout(1500);

  await moMan('#/baocaohoctap');
  await page.click('#bc-tabs button[data-tab="mau"]');
  await page.waitForTimeout(600);
  const coMau = await page.locator('[data-sua]').count();
  check('MỞ LẠI MÀN VẪN THẤY MẪU NHÀ TRƯỜNG VỪA TẠO', coMau >= 1, coMau);

  // Nửa của cô.
  await dangNhap('giaovien', '123456');
  await moMan('#/baocaohoctap');
  const nutSoan = await page.locator('[data-tao]').count();
  check('cô thấy nút soạn báo cáo cho bé của nhóm mình', nutSoan > 0, nutSoan);

  await page.locator('[data-tao]').first().click();
  await page.waitForSelector('#bc-tong', { timeout: 8000 });
  const soOChu = await page.locator('[data-chu]').count();
  check('bản báo cáo dựng đúng các dòng của mẫu', soOChu > 0, soOChu);

  await page.locator('[data-chu]').first().fill('Con tự xúc cơm và gọi cô khi cần.');
  await page.fill('#bc-tong', 'Tháng này con vui vẻ, hợp tác với cô và các bạn.');
  await page.click('#bc-luu');
  await page.waitForTimeout(1800);

  // QUAY VỀ SỔ RỒI MỞ LẠI, đúng đường cô đi.
  //
  // `moMan('#/baocaohoctap')` một mình KHÔNG đủ: màn soạn nhớ bản đang mở, nên
  // vào lại vẫn là chính màn ấy và phép kiểm dưới sẽ đọc lại đúng ô trên màn
  // hình chứ không đọc lại từ máy chủ — xanh mà không chứng minh được gì.
  await page.click('#bc-quay');
  await page.waitForTimeout(1200);
  await page.locator('[data-mo]').first().click();
  await page.waitForSelector('#bc-tong', { timeout: 8000 });
  const giuChu = await page.locator('[data-chu]').first().inputValue().catch(() => '');
  const giuTong = await page.inputValue('#bc-tong').catch(() => '');
  check('MỞ LẠI MÀN VẪN THẤY ĐÚNG CHỮ CÔ ĐÃ GÕ TRONG Ô DÒNG',
    giuChu.includes('tự xúc cơm'), giuChu);
  check('và đúng phần tổng hợp cô đã gõ',
    giuTong.includes('vui vẻ, hợp tác'), giuTong);

  // NHÁP CHƯA GỬI THÌ GIA ĐÌNH KHÔNG THẤY — kiểm ngay trên trình duyệt, vì
  // đây là ranh giới dễ hỏng nhất và cũng là chỗ chỉ nhìn API thì không thấy
  // được màn hình gia đình thật sự hiện ra cái gì.
  await dangNhap('phuhuynh', '123456');
  await moMan('#/baocaohoctap');
  const chuDoc = await page.locator('#app').innerText().catch(() => '');
  check('gia đình KHÔNG đọc được nội dung nháp của cô',
    !chuDoc.includes('tự xúc cơm') && !chuDoc.includes('vui vẻ, hợp tác'),
    chuDoc.slice(0, 160));
}

// ===========================================================================
console.log('\n[9] Gia đình không có đường ghi ở những màn không phải của họ');
{
  // Đăng nhập lại bằng tài khoản gia đình: mục [8] kết thúc ở vai CÔ. Không có
  // dòng này thì cả mục dưới đo nhầm vai — và đo nhầm theo hướng dễ dãi nhất.
  await dangNhap('phuhuynh', '123456');

  // Mỗi màn hai vế: PHẢI dựng lên được và có chữ thật (nếu không thì phép kiểm
  // phủ định ở dưới xanh chỉ vì màn trống trơn), rồi mới đòi không có nút soạn.
  await moMan('#/nhatky');
  const nkGd = await chuTrenMan();
  check('gia đình mở được nhật ký của con', /Nhật ký/.test(nkGd), nkGd.slice(0, 160));
  check('màn nhật ký của gia đình có nội dung thật', nkGd.trim().length > 40, nkGd.length);
  check('gia đình KHÔNG thấy nút lưu nhật ký', await page.locator('#nk-luu').count() === 0);
  check('gia đình KHÔNG có ô nhập nhật ký nào', await page.locator('.nk-o').count() === 0);

  await moMan('#/hanhtrinh');
  const htGd = await chuTrenMan();
  check('gia đình mở được hành trình của con', /Hành trình/.test(htGd), htGd.slice(0, 160));
  check('gia đình KHÔNG thấy nút ghi quan sát', await page.locator('#ht-them').count() === 0);
  check('gia đình KHÔNG đọc được ghi chú thô của cô',
    !/xếp chồng năm khối gỗ/.test(htGd), htGd.slice(0, 250));

  // BÁO ĂN ĐÃ RA KHỎI DANH SÁCH NÀY Ở Đ204 (việc 48, điểm Y3-b).
  //
  // Nhà trường đã hỏi lại ở DD-01 và chốt MỞ bảng tiền ăn theo tháng của con
  // cho gia đình. Nên `#/tienan` thôi là màn "chặn ở cửa" — nó có một nhánh
  // riêng cho gia đình. Phép kiểm không mất đi, nó ĐỔI CHIỀU: xuống mục [9b]
  // ngay dưới, nơi đòi gia đình phải THẤY bảng của con mình và vẫn KHÔNG thấy
  // hai màn của trường.
  //
  // Bài canh này báo đỏ đúng lúc Đ204 vừa mở màn ấy ra — nó làm đúng việc của
  // nó, và con số hai màn còn lại chỉnh kèm lý do chứ không chỉnh lặng lẽ.
  for (const [hash, ten, nut] of [
    ['#/thuchup', 'Ghi nhanh', '#tc-ghi'],
    ['#/kehoachbe', 'Kế hoạch của bé', '#kb-luu'],
  ]) {
    await moMan(hash);
    const chu = await chuTrenMan();
    check(`${ten} — gia đình bị chặn ở cửa, có lời báo tử tế`,
      /Không mở được|không có quyền|chưa được mở/i.test(chu), chu.slice(0, 160));

    // VÀ LỜI BÁO ĐÓ PHẢI NÓI ĐÚNG SỰ THẬT (Đ54).
    //
    // Trước Đ54 màn này nói "phân hệ đang được nhà trường tắt" cho mọi trường
    // hợp. Ba phân hệ ở đây thì nhà trường KHÔNG hề tắt — chúng chỉ không dành
    // cho gia đình. Một phụ huynh đọc câu cũ rồi gọi lên văn phòng hỏi vì sao
    // trường tắt mất phần của mình là chuyện sẽ xảy ra thật.
    check(`${ten} — và lời báo nói ĐÚNG lý do, không đổ cho nhà trường tắt`,
      /chỉ dành cho cô và văn phòng/.test(chu) && !/nhà trường .*tắt|tắt phần/.test(chu),
      chu.slice(0, 200));

    check(`${ten} — và không có đường ghi nào lọt ra`,
      await page.locator(nut).count() === 0);
  }

  // =========================================================================
  console.log('\n[9b] Báo ăn — gia đình THẤY bảng của con, và CHỈ bảng của con (Đ204, Y3-b)');
  {
    await moMan('#/tienan');
    const chu = await chuTrenMan();
    check('gia đình mở được màn Tiền ăn của con', /Tiền ăn của con/.test(chu), chu.slice(0, 160));
    check('và màn có con số thật, không phải khung trống',
      /Số ngày con ăn ở trường/.test(chu), chu.slice(0, 220));
    check('nói đúng tên con mình', /Nguyễn Bảo An/.test(chu), chu.slice(0, 160));

    // HAI MÀN CỦA TRƯỜNG KHÔNG ĐƯỢC LỘ RA THEO — mở một cửa không phải mở cả nhà.
    check('KHÔNG có nút chốt báo ăn của cô', await page.locator('[data-chot]').count() === 0);
    check('KHÔNG có tab Đối chiếu tháng của văn phòng',
      !/Đối chiếu tháng|Báo ăn hằng ngày/.test(chu), chu.slice(0, 220));
    check('và KHÔNG có tên bé nào của nhà khác trong bảng',
      !/Trần Gia Hân|Lê Minh Khôi/.test(chu), chu.slice(0, 260));
    check('không có lỗi JavaScript nào ở màn này', loiJs.length === 0, loiJs.slice(0, 3));
  }
}

// ===========================================================================
console.log('\n[8c] Nhân sự & chấm công — Nhân sự ghi hồ sơ và chấm công, cô chỉ thấy phần của mình');
{
  // Phân hệ này có hai màn hoàn toàn khác nhau dưới cùng một ô, và nửa thứ hai
  // — cô xem hồ sơ của CHÍNH MÌNH — là nửa dễ quên nhất, vì nó không phải một
  // đường ghi. Nhưng bỏ nó thì cả lời hứa "mỗi người xem được hồ sơ của mình"
  // chỉ tồn tại trong bài canh máy chủ, chưa từng ai bấm thử.
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/nhansu');
  check('ban giám hiệu thấy hai tab Hồ sơ / Chấm công', await page.locator('#ns-tab [data-tab]').count() === 2);
  const soNguoi = await page.locator('[data-mo]').count();
  check('và danh sách người của trường có nội dung thật', soNguoi >= 2, soNguoi);

  // Mở ĐÚNG hồ sơ của cô sẽ đăng nhập ở nửa sau, không lấy dòng đầu danh sách:
  // danh sách xếp theo vai rồi theo tên, nên "dòng đầu" là ai thì tuỳ dữ liệu
  // mẫu — và nửa sau của mục này sẽ xanh hay đỏ do may rủi.
  const dongCuaCo = page.locator('[data-mo]', { hasText: 'Nguyễn Thị Mai Anh' });
  check('tìm được đúng dòng của cô Mai Anh trong danh sách', await dongCuaCo.count() === 1,
    await page.locator('[data-mo]').allInnerTexts());
  await dongCuaCo.first().click();
  await page.waitForSelector('#ns-chucDanh', { timeout: 8000 });
  check('mở được hộp hồ sơ', await page.locator('#ns-cccd').count() === 1);
  await page.fill('#ns-chucDanh', 'Cô phụ trách chính');
  await page.fill('#ns-cccd', '079123456789');
  await page.fill('#ns-nganHang', 'Vietcombank');
  await page.click('#ns-luu');
  await page.waitForTimeout(1500);

  await moMan('#/nhansu');
  const man = await chuTrenMan();
  check('GHI XONG MỞ LẠI MÀN VẪN THẤY CHỨC DANH VỪA GHI',
    /Cô phụ trách chính/.test(man), man.slice(0, 250));
  check('nhưng DANH SÁCH không hiện số định danh — chỉ màn chi tiết mới có',
    !/079123456789/.test(man), man.slice(0, 250));

  await page.click('#ns-tab [data-tab="chamcong"]');
  await page.waitForTimeout(1200);
  check('sang được tab Chấm công', await page.locator('#ns-thang').count() === 1);
  check('và có nút chấm cả trường một lượt', await page.locator('#ns-ca-truong').count() === 1);
  await page.click('#ns-ca-truong');
  await page.waitForSelector('#ns-ct-ok', { timeout: 8000 });
  await page.click('#ns-ct-ok');
  await page.waitForTimeout(1800);
  check('CHẤM CẢ TRƯỜNG XONG THÌ BẢNG HIỆN SỐ CÔNG',
    /\d+ công/.test(await chuTrenMan()), (await chuTrenMan()).slice(0, 250));

  // Nửa của cô: chỉ thấy phần của mình, và không có đường ghi nào.
  await dangNhap('giaovien', '123456');
  await moMan('#/nhansu');
  const manCo = await chuTrenMan();
  check('CÔ mở cùng một ô thì thấy màn "Hồ sơ của tôi"', /hồ sơ của tôi/i.test(manCo), manCo.slice(0, 160));
  check('và đọc được đúng hồ sơ của mình', /Cô phụ trách chính/.test(manCo), manCo.slice(0, 300));
  check('màn nói rõ ai sửa được', /Nhân sự/.test(manCo), manCo.slice(0, 400));
  check('cô KHÔNG có danh sách người của trường', await page.locator('[data-mo]').count() === 0);
  check('cô KHÔNG có nút chấm công nào', await page.locator('#ns-ca-truong').count() === 0);
  check('và KHÔNG có ô nhập nào để sửa hồ sơ', await page.locator('#ns-cccd').count() === 0);
}

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs.slice(0, 3));

await browser.close();
sv.dung();
tongKet();
process.exit(0);
