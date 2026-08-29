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

// Một tấm PNG 1×1 thật, dựng bằng mã chứ không kèm tệp ảnh vào kho: bộ canh dữ
// liệu chặn ảnh trong kho mã, và đúng như vậy.
const ANH_THU = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

// ===========================================================================
console.log('\n[1] Nhật ký ngày — cô ghi và thấy lại phần vừa ghi');
{
  await dangNhap('giaovien', '123456');
  await moMan('#/nhatky');

  check('cô thấy nút lưu nhật ký cả nhóm', await page.locator('#nk-luu').count() === 1);
  const soO = await page.locator('.nk-o').count();
  check('màn có ô nhập cho từng bé', soO > 0, soO);
  check('màn hiện tên bé thật của nhóm', /Nguyễn Bảo An/.test(await chuTrenMan()));

  // Ghi cho ĐÚNG MỘT bé, và ghi cả ô chữ tự do — ô chữ là thứ chỉ đường ghi
  // qua giao diện tạo được, khác với mấy ô chọn có thể sinh từ "Áp cho cả nhóm".
  const beDau = await page.locator('.nk-o').first().getAttribute('data-be');
  await page.selectOption(`select.nk-o[data-be="${beDau}"][data-truong="anTrua"]`, 'het');
  await page.fill(`input.nk-o[data-be="${beDau}"][data-truong="anGhiChu"]`, 'Bé tự xúc, ăn thêm nửa bát');
  await page.click('#nk-luu');
  await page.waitForTimeout(1600);

  const sauLuu = await chuTrenMan();
  check('LƯU XONG MÀN HIỆN NGAY DẤU "Đã ghi"', /Đã ghi/.test(sauLuu), sauLuu.slice(0, 160));

  // Mở lại từ đầu: phần cô ghi phải còn, không phải chỉ còn trong bộ nhớ trang.
  await moMan('#/nhatky');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const ghiChu = await page.inputValue(`input.nk-o[data-be="${beDau}"][data-truong="anGhiChu"]`).catch(() => '');
  check('MỞ LẠI MÀN VẪN THẤY ĐÚNG CHỮ CÔ ĐÃ GÕ',
    ghiChu === 'Bé tự xúc, ăn thêm nửa bát', ghiChu);
  const buaTrua = await page.inputValue(`select.nk-o[data-be="${beDau}"][data-truong="anTrua"]`).catch(() => '');
  check('và ô bữa trưa vẫn giữ lựa chọn cô đã chọn', buaTrua === 'het', buaTrua);
}

// ===========================================================================
console.log('\n[2] Báo ăn & tiền ăn — cô chốt số cho bếp và thấy lại');
{
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
console.log('\n[3] Đón trả bé — gia đình khai người đón, cô ghi sổ, cả hai đều thấy');
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
  check('gia đình thấy nút thêm người được đón', await page.locator('#dt-them').count() === 1);

  await page.click('#dt-them');
  await page.waitForTimeout(800);
  check('mở được hộp khai người được đón', await page.locator('#dt-n-ten').count() === 1);
  await page.fill('#dt-n-ten', 'Nguyễn Thị Lan');
  await page.fill('#dt-n-quanhe', 'Bà ngoại');
  await page.fill('#dt-n-dt', '0912345678');
  await page.click('#dt-n-luu');
  await page.waitForTimeout(1600);

  const manPH = await chuTrenMan();
  check('GIA ĐÌNH KHAI XONG THÌ THẤY NGƯỜI VỪA KHAI',
    /Nguyễn Thị Lan/.test(manPH) && /Bà ngoại/.test(manPH), manPH.slice(0, 220));

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
  check('ô chọn người đón CÓ SẴN người gia đình vừa khai',
    cacNguoi.some(t => /Nguyễn Thị Lan/.test(t)), cacNguoi);

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
  await moMan('#/hanhtrinh');
  check('tab suy ngẫm có nút ghi một quan sát', await page.locator('#ht-them').count() === 1);

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
  await page.locator('#ht-tabs button', { hasText: 'Chủ đề tuần' }).click();
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
console.log('\n[8] Học phí — văn phòng tạo khoản thu, gia đình nhìn thấy');
{
  await dangNhap('hieutruong', 'quantri2026');
  await moMan('#/hocphi');
  check('văn phòng thấy nút tạo khoản thu', await page.locator('#hp-them').count() === 1);

  // Tạo cho ĐÚNG bé của tài khoản gia đình dùng ở dưới, để vế "gia đình nhìn
  // thấy" không phụ thuộc vào bé nào tình cờ đứng đầu ô chọn.
  await page.selectOption('#hp-hs', { label: 'Nguyễn Bảo An' });
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
  await dangNhap('giaovien', '123456');
  await moMan('#/hocphi');
  // Phải đứng ĐÚNG ở bé đang có khoản CHƯA NỘP. Đứng ở bé không nợ gì thì màn
  // không có nút "Xác nhận" dù mã có hỏng hay không — phép kiểm phủ định bên
  // dưới sẽ xanh vì màn trống, chứ không vì cổng đang đóng.
  check('cô có ô chọn bé trên màn Học phí', await page.locator('#hp-hs').count() === 1);
  await page.selectOption('#hp-hs', { label: 'Nguyễn Bảo An' });
  await page.waitForTimeout(1400);
  const hpCo = await chuTrenMan();
  check('CÔ ĐỌC ĐƯỢC khoản văn phòng đã tạo — siết ghi, không siết đọc',
    /Tiền ăn tháng thử nghiệm/.test(hpCo), hpCo.slice(0, 250));
  check('và khoản đó đang ở trạng thái CHƯA NỘP — tức đúng chỗ lẽ ra có nút Xác nhận',
    /Chưa nộp/.test(hpCo), hpCo.slice(0, 250));
  check('CÔ KHÔNG THẤY NÚT "Tạo khoản"', await page.locator('#hp-them').count() === 0);
  check('và KHÔNG thấy nút "Xác nhận" trên khoản chưa nộp đó',
    await page.locator('#view button', { hasText: 'Xác nhận' }).count() === 0);
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

  // Ba phân hệ chỉ dành cho người của trường: gia đình không mở tới được.
  for (const [hash, ten, nut] of [
    ['#/tienan', 'Báo ăn', '[data-chot]'],
    ['#/thuchup', 'Ghi nhanh', '#tc-ghi'],
    ['#/kehoachbe', 'Kế hoạch của bé', '#kb-luu'],
  ]) {
    await moMan(hash);
    const chu = await chuTrenMan();
    check(`${ten} — gia đình bị chặn ở cửa, có lời báo tử tế`,
      /Không dùng được|không có quyền|chưa được mở/i.test(chu), chu.slice(0, 160));
    check(`${ten} — và không có đường ghi nào lọt ra`,
      await page.locator(nut).count() === 0);
  }
}

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs.slice(0, 3));

await browser.close();
sv.dung();
tongKet();
process.exit(0);
