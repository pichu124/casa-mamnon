// Bài canh trên trình duyệt thật — AI ĐĂNG ẢNH VÀO ALBUM (M1), phần màn hình.
//
// Chạy bằng:  node test/phan-hoi-2010-album-ai-cung-dang-giao-dien.test.mjs
//
// Phần máy chủ (ma trận quyền) có test/phan-hoi-2010-album-ai-cung-dang.test.mjs.
// Bài này canh màn hình dựng nút theo đúng quyền máy chủ trả về:
//   - nút "Tạo album" theo `tao-duoc`, ô chọn nhóm khi có hơn một nhóm (vá
//     luôn lỗi cô phụ trách nhiều nhóm không tạo được album);
//   - "Thêm ảnh", gắn thẻ, đổi chế độ, nút xoá từng tấm theo từng cờ riêng;
//   - cô nhóm khác không thấy album của nhóm khác (không có "album chung").
//
// Dữ liệu mẫu: c1, c2, c4 ở cơ sở 1; c3 ở cơ sở 2. giaovien dạy c1, giaovien4
// dạy c4, cô Emily (giaovien.nn) dạy c1, c2, c4.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-album-ai-cung-dang-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album']);
const mkVP = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 1', 'aag_vp');
khoaVaoCoSo(DIR, 'aag_vp', 'cs1');
datChucVu(DIR, 'aag_vp', 'vanphong-coso');
const mkMK = taoQuanTri(DIR, 'Marketing', 'aag_mk');
datChucVu(DIR, 'aag_mk', 'marketing');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3893), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// Ảnh JPEG thật 2x2 pixel, ghi ra tệp để chọn qua ô chọn tệp như người dùng.
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=';
const TEP_ANH = path.join(DIR, 'mau-album.jpg');
fs.writeFileSync(TEP_ANH, Buffer.from(JPEG_B64, 'base64'));

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', d => d.accept());

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
const dem = (sel) => page.locator(sel).count();
const loiBao = () => page.locator('#toast-zone').innerText().catch(() => '');
const NUT_XOA = '.photo button[title="Xóa ảnh"]';
const NUT_GAN = '.photo button[title="Gắn thẻ bé có trong ảnh"]';

// Mở hộp tạo album, điền tên, chọn một ảnh. Không bấm đăng.
async function moHopTao(ten) {
  await moMan('#/albums');
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  await page.fill('#al-title', ten);
  await page.setInputFiles('#al-file', [TEP_ANH]);
  await page.waitForTimeout(1000);
}
const giaTriO = (sel) => page.$$eval(`${sel} option`, os => os.map(o => o.value).filter(Boolean));

try {
  const d = await login('aag_vp', mkVP);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const dm = await login('aag_mk', mkMK);
  await req('POST', '/api/auth/set-new-password', { cookie: dm.cookie, body: { newPassword: 'quantri2026' } });
  const VP = (await login('aag_vp', 'quantri2026')).cookie;
  const GV4 = (await login('giaovien4', '123456')).cookie;
  check('đối chứng — đăng nhập được văn phòng và cô nhóm c4', !!VP && !!GV4);

  // =========================================================================
  console.log('\n[1] Văn phòng cơ sở 1 tạo album, phải chọn nhóm lớp');
  await dangNhap('aag_vp', 'quantri2026');
  await moMan('#/albums');
  check('văn phòng thấy nút "Tạo album"', await dem('#btn-new-album') === 1);
  await moHopTao('Ngày hội trăng rằm');
  const oNhomVP = await giaTriO('#al-nhom');
  check('hộp tạo album có ô chọn nhóm lớp của cơ sở 1 (c1, c2, c4), không có c3',
    ['c1', 'c2', 'c4'].every(x => oNhomVP.includes(x)) && !oNhomVP.includes('c3'), oNhomVP);
  await page.click('#al-submit');
  await page.waitForTimeout(800);
  check('chưa chọn nhóm thì nhắc chọn, không gửi đi',
    (await loiBao()).includes('chọn nhóm lớp') && !page.url().includes('#/albums/'), await loiBao());
  await page.selectOption('#al-nhom', 'c4');
  await page.click('#al-submit');
  await page.waitForTimeout(2500);
  const idVP = (page.url().match(/#\/albums\/([^/?#]+)/) || [])[1];
  check('đăng xong chuyển sang album vừa tạo', !!idVP, page.url());
  const ctVP = idVP ? await req('GET', `/api/albums/${idVP}`, { cookie: VP }) : { data: {} };
  check('album thuộc đúng nhóm đã chọn (c4)', ctVP.data && ctVP.data.classId === 'c4', ctVP.data && ctVP.data.classId);

  console.log('\n[2] Văn phòng ở chi tiết album của mình');
  check('có nút "Thêm ảnh"', await dem('#btn-add-photo') === 1);
  check('có nút xoá trên tấm mình đăng', await dem(NUT_XOA) === 1);
  check('KHÔNG có nút gắn thẻ bé (gắn thẻ là việc của cô trong nhóm)', await dem(NUT_GAN) === 0);
  check('có nút đổi ai xem được album', await dem('#btn-doi-che-do') === 1);
  check('không còn công tắc "album chung"', await dem('#al-gop-anh') === 0
    && !(await page.locator('#view').innerText()).includes('Cho cô khác trong cơ sở góp ảnh'));

  // =========================================================================
  console.log('\n[3] Văn phòng thêm ảnh vào nhóm có nhà từ chối chia sẻ');
  // Chồi 2 (c1) có gia đình chưa đồng ý chia sẻ ảnh. Văn phòng không gắn thẻ
  // được, nên lời báo phải nói ảnh chờ cô phụ trách nhóm gắn thẻ.
  const alC1 = await req('POST', '/api/albums', {
    cookie: VP, body: { title: 'Bé tập thể dục', classId: 'c1', photos: [{ dataUrl: `data:image/jpeg;base64,${JPEG_B64}` }] },
  });
  check('đối chứng — văn phòng tạo album cho Chồi 2', alC1.status === 201, alC1.data);
  const idC1 = alC1.data && alC1.data.id;
  await moMan(`#/albums/${idC1}`);
  await page.click('#btn-add-photo');
  await page.waitForSelector('#al-file', { state: 'attached' });
  await page.setInputFiles('#al-file', [TEP_ANH]);
  await page.waitForTimeout(1000);
  await page.click('#al-submit');
  await page.waitForTimeout(2200);
  const baoGop = await loiBao();
  check('lời báo sau khi đăng nói ảnh tạm ẩn chờ cô phụ trách nhóm gắn thẻ, không bảo văn phòng tự gắn',
    baoGop.includes('cô phụ trách nhóm gắn thẻ') && !baoGop.includes('Cô bấm vào từng ảnh'), baoGop);
  check('album có 2 tấm, văn phòng không có nút gắn thẻ',
    await dem('.photo-grid .photo') === 2 && await dem(NUT_GAN) === 0);

  // =========================================================================
  console.log('\n[4] Cô nhóm khác cùng cơ sở không thấy album của nhóm khác');
  await dangNhap('giaovien', '123456');
  await moMan('#/albums');
  check('đối chứng — danh sách của cô nhóm c1 có album nhóm mình',
    await page.locator('.card.clickable').count() > 0);
  check('album của nhóm c4 KHÔNG hiện trong danh sách của cô nhóm c1',
    await page.locator('.card.clickable', { hasText: 'Ngày hội trăng rằm' }).count() === 0);
  check('không thẻ album nào có nhãn "Album chung"',
    !(await page.locator('.card.clickable').allInnerTexts()).join(' ').includes('Album chung'));
  await moMan(`#/albums/${idVP}`);
  check('mở thẳng đường dẫn: cô nhóm khác KHÔNG có nút "Thêm ảnh"', await dem('#btn-add-photo') === 0);
  check('và không thấy tấm ảnh nào', await dem('.photo-grid .photo') === 0);

  // =========================================================================
  console.log('\n[5] Cô phụ trách nhiều nhóm chọn được nhóm khi tạo album');
  await dangNhap('giaovien.nn', '123456');
  await moHopTao('Giờ tiếng Anh nhóm Lá');
  const oNhomEm = await giaTriO('#al-nhom');
  check('cô Emily có ô chọn nhóm với đủ ba nhóm mình dạy',
    oNhomEm.length === 3 && ['c1', 'c2', 'c4'].every(x => oNhomEm.includes(x)), oNhomEm);
  await page.selectOption('#al-nhom', 'c2');
  await page.click('#al-submit');
  await page.waitForTimeout(2500);
  const idEm = (page.url().match(/#\/albums\/([^/?#]+)/) || [])[1];
  const ctEm = idEm ? await req('GET', `/api/albums/${idEm}`, { cookie: VP }) : { data: {} };
  check('tạo được album cho nhóm c2', ctEm.data && ctEm.data.classId === 'c2', [page.url(), await loiBao()]);

  // =========================================================================
  console.log('\n[6] Cô phụ trách một nhóm: y như cũ');
  await dangNhap('giaovien4', '123456');
  await moMan('#/albums');
  await page.click('#btn-new-album');
  await page.waitForSelector('#al-title');
  check('cô một nhóm KHÔNG phải chọn nhóm', await dem('#al-nhom') === 0);
  await moMan(`#/albums/${idVP}`);
  check('cô của nhóm thấy "Thêm ảnh"', await dem('#btn-add-photo') === 1);
  check('cô của nhóm gắn thẻ được tấm văn phòng đăng', await dem('.photo-grid .photo') === 1 && await dem(NUT_GAN) === 1);
  check('cô của nhóm xoá được tấm văn phòng đăng', await dem(NUT_XOA) === 1);
  check('cô của nhóm đổi được ai xem', await dem('#btn-doi-che-do') === 1);

  // =========================================================================
  console.log('\n[7] Gia đình và Marketing chỉ xem');
  await dangNhap('ph.trang', '123456');
  await moMan('#/albums');
  check('gia đình KHÔNG có nút "Tạo album"', await dem('#btn-new-album') === 0);
  await moMan(`#/albums/${idVP}`);
  check('gia đình KHÔNG có "Thêm ảnh", xoá, gắn thẻ',
    await dem('#btn-add-photo') === 0 && await dem(NUT_XOA) === 0 && await dem(NUT_GAN) === 0);

  await dangNhap('aag_mk', 'quantri2026');
  await moMan('#/albums');
  check('Marketing KHÔNG có nút "Tạo album"', await dem('#btn-new-album') === 0);
  await moMan(`#/albums/${idVP}`);
  check('Marketing KHÔNG có "Thêm ảnh", xoá, đổi ai xem',
    await dem('#btn-add-photo') === 0 && await dem(NUT_XOA) === 0
      && await dem('#btn-doi-che-do') === 0);

  check('không có lỗi JavaScript trên trang', !loiJs.length, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
