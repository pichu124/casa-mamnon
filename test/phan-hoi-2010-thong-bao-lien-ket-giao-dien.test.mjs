// Bài canh góp ý 20/10 trên trình duyệt thật — G2: bấm thông báo khảo sát là
// làm khảo sát luôn.
//
// Chạy bằng:  node test/phan-hoi-2010-thong-bao-lien-ket-giao-dien.test.mjs
//
// Phần máy chủ (lienKet, quyền) có test/phan-hoi-2010-thong-bao-lien-ket.test.mjs.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-tb-lien-ket-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7162), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
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
  await page.waitForTimeout(1200);
}
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
};
const hashHienTai = () => page.evaluate(() => location.hash);
const tieuDeHop = async () => (await page.locator('#modal-overlay .modal-title').count())
  ? (await page.locator('#modal-overlay .modal-title').innerText()).trim() : '';

const TEN_KS = 'Khảo sát G2 giờ đón bé';
const TIN_KS = `Khảo sát mới: ${TEN_KS}`;
const TIN_TAY = 'Mai nhóm chơi với nước G2';

try {
  const co = await login('giaovien', '123456');   // t1 — nhóm Chồi 2 (c1)
  const ks = await req('POST', '/api/surveys', {
    cookie: co.cookie,
    body: {
      title: TEN_KS, description: '', deadline: '2030-01-01', audience: 'class',
      questions: [{ text: 'Gia đình đón bé lúc mấy giờ?', type: 'choice', options: ['16 giờ', '17 giờ'] }],
    },
  });
  check('đối chứng — cô tạo được khảo sát cho nhóm mình', ks.status === 201, ks.status);
  const tay = await req('POST', '/api/notifications', {
    cookie: co.cookie,
    body: { title: TIN_TAY, body: 'Gia đình gửi thêm một bộ quần áo.', category: 'Nhóm lớp', audience: 'class' },
  });
  check('đối chứng — cô gửi được thông báo gõ tay', tay.status === 201, tay.status);

  // =========================================================================
  console.log('\n[G2] Gia đình bấm thông báo khảo sát → mở thẳng phiếu khảo sát');
  await dangNhap('phuhuynh2', '123456');           // p2 — mẹ bé s3, Chồi 2
  await moMan('#/notifications');
  await page.locator('#view .list-row', { hasText: TIN_KS }).first().click();
  await page.waitForTimeout(1500);
  check('sang màn Khảo sát', /^#\/surveys/.test(await hashHienTai()), await hashHienTai());
  check(`hộp đang mở là phiếu "${TEN_KS}"`, (await tieuDeHop()).startsWith(TEN_KS), await tieuDeHop());
  check('phiếu điền được ngay (có ô trả lời)', await page.locator('#survey-form input[type=radio]').count() === 2);
  {
    const p2 = await login('phuhuynh2', '123456');
    const ds = (await req('GET', '/api/notifications?bo=0&soLuong=100', { cookie: p2.cookie })).data;
    check('thông báo khảo sát đã được đánh dấu đã đọc', ds.find(n => n.title === TIN_KS)?.read === true);
  }

  await page.locator('#survey-form input[value="17 giờ"]').check();
  await page.locator('#survey-form button', { hasText: 'Gửi câu trả lời' }).click();
  await page.waitForTimeout(1500);
  check('gửi trả lời xong thì hộp đóng, không bật lại phiếu', await page.locator('#modal-overlay').count() === 0,
    await tieuDeHop());
  check('danh sách khảo sát ghi "Đã trả lời"',
    (await page.locator('#view .card', { hasText: TEN_KS }).first().innerText()).includes('Đã trả lời'));

  console.log('\n[G2] Thông báo không có liên kết vẫn mở hộp chi tiết như cũ');
  await moMan('#/notifications');
  await page.locator('#view .list-row', { hasText: TIN_TAY }).first().click();
  await page.waitForTimeout(800);
  check('mở hộp "Chi tiết thông báo"', (await tieuDeHop()) === 'Chi tiết thông báo', await tieuDeHop());
  check('vẫn đứng ở màn Thông báo', (await hashHienTai()) === '#/notifications', await hashHienTai());
  check('hộp này không có nút "Mở khảo sát"',
    await page.locator('#modal-overlay button', { hasText: 'Mở khảo sát' }).count() === 0);

  // =========================================================================
  console.log('\n[G2] Gia đình ngoài nhóm gõ thẳng đường dẫn vẫn bị chặn');
  await dangNhap('ph.trang', '123456');            // p7 — bé s9, Nhà trẻ 1
  await moMan(`#/surveys/${ks.data.id}`);
  check('không mở phiếu khảo sát', await page.locator('#survey-form').count() === 0);
  check('báo "Không tìm thấy khảo sát"',
    (await page.locator('#toast-zone').innerText().catch(() => '')).includes('Không tìm thấy khảo sát'));

  // =========================================================================
  console.log('\n[G2] Cô gửi khảo sát: bấm thông báo vẫn vào hộp chi tiết (để sửa / thu hồi), có nút mở');
  await dangNhap('giaovien', '123456');
  await moMan('#/notifications');
  await page.locator('#view .list-row', { hasText: TIN_KS }).first().click();
  await page.waitForTimeout(800);
  check('mở hộp "Chi tiết thông báo" có nút Thu hồi',
    (await tieuDeHop()) === 'Chi tiết thông báo'
      && await page.locator('#modal-overlay button', { hasText: 'Thu hồi' }).count() === 1, await tieuDeHop());
  await page.locator('#modal-overlay button', { hasText: 'Mở khảo sát' }).click();
  await page.waitForTimeout(1500);
  check('nút "Mở khảo sát" mở kết quả của đúng khảo sát',
    (await tieuDeHop()).startsWith(TEN_KS) && await page.locator('[data-chua-tra-loi]').count() === 1,
    await tieuDeHop());

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
