// BA CHỈ TIÊU THỜI GIAN CỦA BẢN KẾ HOẠCH — CÓ ĐO THẬT HAY KHÔNG.
//
// Cần Playwright. Chạy bằng:  npm run test:giao-dien
//
// VÌ SAO TỆP NÀY TỒN TẠI
//
// `docs/KE-HOACH.md:274` hứa ba chỉ tiêu *"đo được ngay trong bài test"*:
//
//   • nhật ký cả nhóm  < 5 phút
//   • một khoảnh khắc  < 20 giây
//   • một quan sát    ≤ 3 phút
//
// Trước đợt này chỉ hai chỉ tiêu sau có dấu vết, và **cả hai đều không đo tốc
// độ**: `test/thuchup.test.mjs` gửi lên một con số rồi kiểm máy chủ trả lại
// đúng con số ấy; `test/hanh-trinh.test.mjs` đọc mã nguồn xem có gọi
// `Date.now()` không. Đó là kiểm ĐƯỜNG ỐNG, không phải kiểm tốc độ. Chỉ tiêu
// đầu — nhật ký cả nhóm — thì không có bài nào chạm tới.
//
// MỘT BÀI TEST KHÔNG ĐO ĐƯỢC CÔ GIÁO, VÀ KHÔNG ĐƯỢC GIẢ VỜ LÀ ĐO ĐƯỢC
//
// Năm phút của cô gồm hai phần cộng lại:
//
//   phần MÁY   — vẽ màn, áp cho cả nhóm, gửi lên máy chủ và vẽ lại
//   phần NGƯỜI — số lần cô chạm nhân với thời gian mỗi lần chạm
//
// Máy chủ đo được phần đầu chính xác. Phần sau thì bài test chỉ đo được **số
// lần chạm**, không đo được cô chạm nhanh hay chậm — chỗ đó phải ra máy thật,
// và đó là việc của `docs/PHEP-THU-DIEN-THOAI.md`.
//
// Nên bài này đo đúng ba thứ nó đo được, và mục [4] canh cho phần còn lại
// không bị bỏ quên: cả ba chỉ tiêu phải có mặt trong phiếu thử máy thật.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  GOC, thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, CHROMIUM, tatBannerMoiCai, batPhanHe, MAU,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Cỡ nhóm dùng để đo. Bản kế hoạch nói "cả nhóm", và nhóm thật của trường mầm
// non thường 18–25 bé. Đo trên nhóm 5 bé của dữ liệu mẫu rồi nhân lên là tự
// lừa mình: chỗ đắt nhất là số ô trên màn, mà số ô thì tỉ lệ với sĩ số.
const SI_SO_DO = 20;

// Ngân sách phần MÁY, tính bằng mili-giây. Cả chỉ tiêu là 5 phút = 300 giây;
// nếu riêng phần máy đã ăn hơn 60 giây thì cô không còn cửa nào đạt, kể cả khi
// cô thao tác nhanh nhất có thể. Số này cố ý rộng — nó canh SỰ SỤP ĐỔ (một câu
// truy vấn N+1, một vòng lặp gọi API cho từng bé), không canh vài trăm mili-giây.
const NGAN_SACH_MAY_MS = 60_000;

const DIR = thuMucTam('chi-tieu-thoi-gian');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3311), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));

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

// ===========================================================================
console.log(`\n[1] Dựng một nhóm ${SI_SO_DO} bé — đúng cỡ nhóm thật của trường`);
{
  // Mật khẩu tạm đưa thẳng vào màn "đổi mật khẩu", không vào trang chủ — nên
  // không dùng `dangNhap` được ở lần đầu này.
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', 'hieutruong');
  await page.fill('#lg-pass', mkQT);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    await API.post('/api/auth/set-new-password', { newPassword: 'quantri2026' });
  });
  await dangNhap('hieutruong', 'quantri2026');

  // Thêm bé bằng ĐÚNG con đường nhà trường dùng: nhập tệp danh sách. Viết thẳng
  // vào cơ sở dữ liệu thì nhanh hơn, nhưng khi đó bài đo trên một nhóm mà app
  // chưa chắc tạo ra được.
  const canThem = SI_SO_DO - MAU.soBeNhomChoi2;
  const dong = [];
  for (let i = 1; i <= canThem; i++) {
    dong.push(`Bé Đo Thứ ${String(i).padStart(2, '0')},2021-03-1${i % 10},Chồi 2,Phụ Huynh Đo ${i},09770000${String(i).padStart(2, '0')}`);
  }
  const csv = ['Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại', ...dong].join('\n');

  const kq = await page.evaluate(async (noiDung) => {
    try { return await API.post('/api/admin/import/commit', { csv: noiDung }); }
    catch (err) { return { loi: err.message }; }
  }, csv);
  check(`nhập thêm ${canThem} bé vào nhóm Chồi 2`, kq && kq.imported === canThem, kq);
}

// ===========================================================================
console.log('\n[2] Chỉ tiêu "nhật ký cả nhóm dưới 5 phút" — đo phần MÁY chịu trách nhiệm');
let soOSauAp = 0;
let soBeTrenMan = 0;
{
  await dangNhap('giaovien', '123456');

  // --- (a) mở màn ---
  const t0 = Date.now();
  await page.goto(`${sv.BASE}/#/nhatky`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#nk-luu', { timeout: 30000 });
  const tMo = Date.now() - t0;

  soBeTrenMan = await page.locator('[data-tra], .card .row-title').count();
  const soO = await page.locator('.nk-o').count();
  check(`màn dựng đủ ô cho cả ${SI_SO_DO} bé`, soO >= SI_SO_DO * 5, soO);

  // --- (b) áp cho cả nhóm: MỘT lần chạm ---
  const t1 = Date.now();
  await page.selectOption('#nk-ca-trua', 'het');
  // Hai ô giờ ngủ là ô CHỌN, và danh sách giờ do máy chủ đưa xuống theo khung
  // giờ ngủ của trường — nên chọn theo vị trí, không gõ cứng "11:30".
  await page.selectOption('#nk-ca-ngu-tu', { index: 1 });
  await page.selectOption('#nk-ca-ngu-den', { index: 2 });
  await page.click('#nk-ap');
  await page.waitForTimeout(500);
  const tAp = Date.now() - t1;

  soOSauAp = await page.evaluate(() =>
    [...document.querySelectorAll('.nk-o')].filter(o => String(o.value || '').trim() !== '').length);

  // --- (c) chỉnh riêng 3 bé, đúng như bản kế hoạch mô tả ---
  const cacBe = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('.nk-o')].map(o => o.dataset.be))]);
  for (const be of cacBe.slice(0, 3)) {
    await page.selectOption(`select.nk-o[data-be="${be}"][data-truong="anTrua"]`, 'it');
    await page.fill(`input.nk-o[data-be="${be}"][data-truong="anGhiChu"]`, 'Hôm nay bé mệt, ăn ít');
  }

  // --- (d) lưu cả nhóm ---
  const t2 = Date.now();
  await page.click('#nk-luu');
  await page.waitForFunction(() => /Đã ghi/.test(document.getElementById('view').innerText),
    null, { timeout: 60000 });
  const tLuu = Date.now() - t2;

  const tMay = tMo + tAp + tLuu;
  console.log(`      · mở màn ${tMo} ms · áp cả nhóm ${tAp} ms · lưu ${tLuu} ms → PHẦN MÁY ${tMay} ms`);
  check(`PHẦN MÁY của cả nhóm ${SI_SO_DO} bé nằm trong ngân sách ${NGAN_SACH_MAY_MS / 1000} giây`,
    tMay < NGAN_SACH_MAY_MS, `${tMay} ms`);

  // Lưu xong phải THẤY LẠI, nếu không thì con số ở trên chỉ là thời gian của
  // một lần lưu hỏng.
  const chu = await page.locator('#view').innerText();
  check('và lưu xong màn hiện dấu "Đã ghi"', /Đã ghi/.test(chu));
  const soDaGhi = (chu.match(/Đã ghi/g) || []).length;
  check(`cả ${SI_SO_DO} bé đều được ghi trong một lần lưu`, soDaGhi >= SI_SO_DO, soDaGhi);
}

// ===========================================================================
console.log('\n[3] MỘT lần chạm phải lấp được cả nhóm — số thao tác KHÔNG tăng theo sĩ số');
{
  // Đây mới là thứ quyết định chỉ tiêu 5 phút, và là thứ bài test đo được chắc
  // chắn. Nếu "Áp cho cả nhóm" chỉ lấp một bé, cô phải chạm 20 lần thay vì 1 —
  // và không ngân sách máy nào cứu được.
  check('“Áp cho cả nhóm” lấp ô cho MỌI bé, không phải bé đầu danh sách',
    soOSauAp >= SI_SO_DO * 3, `${soOSauAp} ô được lấp / cần ít nhất ${SI_SO_DO * 3}`);

  // Số lần chạm trên đường nhanh nhất, đọc từ chính màn hình:
  //   3 ô "đặt nhanh" + 1 nút Áp + 2 thao tác cho mỗi bé chỉnh lẻ + 1 nút Lưu.
  // Không phụ thuộc sĩ số — đó là cả ý nghĩa của màn này.
  const oDatNhanh = await page.locator('#nk-ca-trua, #nk-ca-ngu-tu, #nk-ca-ngu-den').count();
  check('màn có đủ ba ô đặt nhanh cho cả nhóm', oDatNhanh === 3, oDatNhanh);
  const soThaoTac = oDatNhanh + 1 + (3 * 2) + 1;
  console.log(`      · đường nhanh nhất: ${soThaoTac} lần chạm cho ${SI_SO_DO} bé`
    + ` (${(300 / soThaoTac).toFixed(1)} giây/lần chạm mới hết 5 phút)`);
  check('đường nhanh nhất không quá 15 lần chạm cho cả nhóm', soThaoTac <= 15, soThaoTac);

  // Và một nút Lưu duy nhất cho cả nhóm — không phải mỗi bé một nút.
  check('cả nhóm lưu bằng MỘT nút, không phải mỗi bé một nút',
    await page.locator('#nk-luu').count() === 1);
}

// ===========================================================================
console.log('\n[4] Cả ba chỉ tiêu của bản kế hoạch đều phải có chỗ đo trên MÁY THẬT');
{
  // Phần NGƯỜI của cả ba chỉ tiêu chỉ đo được bằng đồng hồ bấm tay, trên điện
  // thoại của chính cô. Bài test không thay thế được việc đó — nó chỉ canh
  // được rằng việc đó có chỗ để làm, và không chỉ tiêu nào bị bỏ quên.
  const phieu = fs.readFileSync(path.join(GOC, 'docs', 'PHEP-THU-DIEN-THOAI.md'), 'utf8');
  const keHoach = fs.readFileSync(path.join(GOC, 'docs', 'KE-HOACH.md'), 'utf8');

  check('bản kế hoạch vẫn nêu đủ ba chỉ tiêu',
    /nhật ký cả nhóm\s*<\s*5 phút/i.test(keHoach)
    && /quan sát\s*<\s*20 giây/i.test(keHoach)
    && /suy ngẫm\s*≤\s*3 phút/i.test(keHoach));

  // Bắt cả TÊN chỉ tiêu lẫn CON SỐ trong cùng một đầu mục. Chỉ tìm "5 phút"
  // thôi là hỏng: mục 2 của phiếu có chữ "khoảng 15 phút", và bài đã xanh giả
  // một lần vì đúng chỗ đó.
  for (const [ten, re] of [
    ['dưới 20 giây (một khoảnh khắc)', /^#+ .*NHANH.*20 giây/mi],
    ['dưới 5 phút (nhật ký cả nhóm)', /^#+ .*NHẬT KÝ CẢ NHÓM.*5 PHÚT/mi],
    ['≤ 3 phút (một quan sát)', /^#+ .*MỘT QUAN SÁT.*3 PHÚT/mi],
  ]) {
    check(`phiếu thử máy thật có ĐẦU MỤC ĐO cho chỉ tiêu ${ten}`, re.test(phieu),
      'thêm một đầu mục đo vào docs/PHEP-THU-DIEN-THOAI.md');
  }

  // Và mỗi đầu mục đó phải có bảng để điền số, không chỉ là một câu nhắc.
  const soBangDo = (phieu.match(/^\|\s*\*\*(Tổng thời gian|Thời gian|Trung vị app báo)\*\*/gmi) || []).length;
  check('mỗi chỉ tiêu có một dòng bảng để điền số đo thật', soBangDo >= 3, soBangDo);
}

check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs.slice(0, 3));

await browser.close();
sv.dung();
tongKet();
process.exit(0);
