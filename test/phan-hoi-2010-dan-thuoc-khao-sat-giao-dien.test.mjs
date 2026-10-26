// Bài canh góp ý 20/10 trên trình duyệt thật — Q1 (giờ gửi lời dặn thuốc) và
// G1 (danh sách gia đình chưa trả lời khảo sát).
//
// Chạy bằng:  node test/phan-hoi-2010-dan-thuoc-khao-sat-giao-dien.test.mjs
//
// Trình duyệt CỐ Ý đặt múi giờ New York: giờ gửi phải là GIỜ VIỆT NAM (giờ của
// trường), không phải giờ của máy đang cầm. Phần máy chủ của G1 có
// test/phan-hoi-2010-khao-sat.test.mjs.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, ngay, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-dt-ks-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 6413), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/New_York',
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
const chu = () => page.locator('#view').innerText();

try {
  const ph = await login('phuhuynh', '123456');
  const co = await login('giaovien', '123456');

  // Một lời dặn thuốc mới của mẹ bé An (s1, Chồi 2).
  const don = await req('POST', '/api/medicine', {
    cookie: ph.cookie,
    body: { studentId: 's1', fromDate: HOM_NAY(), toDate: HOM_NAY(), medicines: [{ name: 'Siro ho Q1', dose: '5ml', timing: 'Sau ăn trưa' }], note: '' },
  });
  check('đối chứng — gia đình gửi được lời dặn thuốc', don.status === 201, don.status);
  const t = Date.parse(don.data.createdAt);
  const [, thang, ngayTrongThang] = ngay.ngayCua(t).split('-');
  const MONG = `Gửi lúc ${ngay.gioCua(t)} · ${ngayTrongThang}/${thang}`;

  // =========================================================================
  console.log('\n[Q1] Màn Dặn thuốc hiện giờ gia đình gửi, theo giờ Việt Nam');
  await dangNhap('giaovien', '123456');
  await moMan('#/medicine');
  {
    const v = await chu();
    const the = page.locator('.card', { hasText: 'Siro ho Q1' }).first();
    const trongThe = await the.innerText();
    check(`màn của cô: thẻ lời dặn mới ghi "${MONG}"`, trongThe.includes(MONG), trongThe.slice(0, 200));
    check('mọi lời dặn khác cũng có giờ gửi', (v.match(/Gửi lúc \d{2}:\d{2} · \d{2}\/\d{2}/g) || []).length >= 2, v.slice(0, 300));
  }
  await dangNhap('phuhuynh', '123456');
  await moMan('#/medicine');
  {
    const the = await page.locator('.card', { hasText: 'Siro ho Q1' }).first().innerText();
    check(`màn gia đình xem lại: cùng dòng "${MONG}"`, the.includes(MONG), the.slice(0, 200));
  }

  // =========================================================================
  console.log('\n[G1] Kết quả khảo sát có danh sách gia đình chưa trả lời');
  const ks = await req('POST', '/api/surveys', {
    cookie: co.cookie,
    body: { title: 'Khảo sát G1 nhóm Chồi 2', description: '', deadline: '2030-01-01', audience: 'class', questions: [{ text: 'Đi được không ạ?', type: 'choice', options: ['Có', 'Không'] }] },
  });
  check('đối chứng — cô tạo được khảo sát cho nhóm mình', ks.status === 201, ks.status);
  await req('POST', `/api/surveys/${ks.data.id}/respond`, { cookie: ph.cookie, body: { answers: { q1: 'Có' } } });

  await dangNhap('giaovien', '123456');
  await moMan('#/surveys');
  await page.locator('.card', { hasText: 'Khảo sát G1 nhóm Chồi 2' }).first().click();
  await page.waitForTimeout(800);
  {
    const o = page.locator('[data-chua-tra-loi]');
    check('hộp kết quả có mục "Gia đình chưa trả lời"', await o.count() === 1);
    const v = await o.innerText();
    check('đếm đúng 4 bé Chồi 2 chưa có trả lời', /Gia đình chưa trả lời \(4\)/.test(v), v.slice(0, 120));
    check('dòng ghi tên bé, nhóm và tên phụ huynh', /Bé Phạm Gia Hân · Nhóm Chồi 2/.test(v) && /Anh Phạm Quốc Bảo/.test(v), v);
    check('bé An (mẹ đã trả lời) không nằm trong danh sách', !/Nguyễn Bảo An/.test(v));
    check('không có phần trăm trong danh sách', !/%/.test(v));
  }
  // =========================================================================
  console.log('\n[P1] Đang ở màn Thông báo mà bấm chuông thì danh sách tải lại');
  await dangNhap('phuhuynh', '123456');
  await moMan('#/notifications');
  const tb = await req('POST', '/api/notifications', {
    cookie: co.cookie,
    body: { title: 'Thông báo P1 vừa gửi', body: 'Mai các con mặc đồ thể thao.', category: 'Nhóm lớp', audience: 'class' },
  });
  check('đối chứng — cô gửi được thông báo cho nhóm', tb.status === 201, tb.status);
  check('đối chứng — danh sách đang mở chưa có thông báo mới', !(await chu()).includes('Thông báo P1 vừa gửi'));
  const nutChuong = page.locator('#bottom-nav button', { hasText: 'Thông báo' });
  await nutChuong.click();
  await page.waitForTimeout(1000);
  check('bấm chuông ngay tại màn Thông báo → thấy thông báo mới', (await chu()).includes('Thông báo P1 vừa gửi'));

  // Từ màn khác bấm sang: hashchange đã vẽ, cú bấm không được vẽ thêm lần nữa.
  await moMan('#/');
  let soLanTai = 0;
  const dem = r => { if (/\/api\/notifications\?bo=0/.test(r.url())) soLanTai += 1; };
  page.on('request', dem);
  await nutChuong.click();
  await page.waitForTimeout(1200);
  page.off('request', dem);
  check('từ trang chủ bấm chuông: danh sách tải đúng một lần', soLanTai === 1, soLanTai);

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  donThuMucTam(DIR);
}
tongKet();
