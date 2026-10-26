// Bài canh trên trình duyệt thật — nút "Thêm từ câu chuyện đã kể" ở màn Album
// (góp ý 20/10, B6 — chủ dự án chọn phương án a ngày 26/10).
//
// Chạy bằng:  node test/phan-hoi-2010-album-tu-cau-chuyen-giao-dien.test.mjs
//
// Phần máy chủ (quyền, lớp dữ liệu, luật ảnh nhóm) có
// test/phan-hoi-2010-album-tu-cau-chuyen.test.mjs.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-album-tu-cau-chuyen-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'album']);
const mkVP = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 1', 'tcg_vp1');
khoaVaoCoSo(DIR, 'tcg_vp1', 'cs1');
datChucVu(DIR, 'tcg_vp1', 'vanphong-coso');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7262), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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
const NUT = '#btn-tu-cau-chuyen';
const soO = () => page.locator('#view .photo-grid .photo').count();

try {
  const d = await login('tcg_vp1', mkVP);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const GV = (await login('giaovien', '123456')).cookie;   // t1 — cô nhóm Chồi 2 (c1)
  const al = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Góc làm việc từng bé', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] },
  });
  const alCK = await req('POST', '/api/albums', { cookie: GV, body: { title: 'Cả nhóm đi dạo', photos: [{ dataUrl: ANH }] } });
  const q = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'MOTA-LOP1 bé xếp tháp hồng', anh: ANH },
  });
  const kb = await req('POST', `/api/hanhtrinh/${q.data?.id}/cong-bo`, {
    cookie: GV,
    body: { cauChuyen: 'An xếp tháp hồng từ lớn tới nhỏ.', cungConONha: 'Cùng con xếp cốc.', kemTep: true, beTrongAnh: [] },
  });
  check('đối chứng — album và câu chuyện kèm ảnh đã có',
    al.status === 201 && alCK.status === 201 && kb.status === 200, [al.status, alCK.status, kb.status]);

  // =========================================================================
  console.log('\n[1] Văn phòng cơ sở 1 thêm ảnh câu chuyện vào album theo thẻ');
  await dangNhap('tcg_vp1', 'quantri2026');
  await moMan(`#/albums/${al.data.id}`);
  check('có nút "Thêm từ câu chuyện đã kể"', await page.locator(NUT).count() === 1);
  const truoc = await soO();
  await page.locator(NUT).click();
  await page.waitForTimeout(1000);
  const hop = page.locator('#modal-overlay');
  const chu = await hop.innerText().catch(() => '');
  check('hộp hiện tên bé và câu chuyện', chu.includes('Nguyễn Bảo An') && chu.includes('An xếp tháp hồng từ lớn tới nhỏ.'), chu.slice(0, 300));
  check('hộp KHÔNG có mô tả lớp 1 của cô', !chu.includes('MOTA-LOP1'));
  check('ảnh của mục đi qua đường của album',
    await hop.locator('img[src*="/tu-cau-chuyen/"]').count() === 1);
  await hop.locator('button', { hasText: 'Thêm vào album' }).first().click();
  await page.waitForTimeout(1500);
  check('báo đã thêm', (await page.locator('#toast-zone').innerText().catch(() => '')).includes('Đã thêm ảnh vào album'));
  check('album có thêm một ô ảnh', (await soO()) === truoc + 1, { truoc, sau: await soO() });
  await page.locator(NUT).click();
  await page.waitForTimeout(1000);
  check('mở lại thì mục ghi "Đã có trong album", không còn nút thêm',
    (await hop.innerText()).includes('Đã có trong album')
      && await hop.locator('button', { hasText: 'Thêm vào album' }).count() === 0);

  // =========================================================================
  console.log('\n[2] Không mời ở chỗ không được');
  await moMan(`#/albums/${alCK.data.id}`);
  check('album cả nhóm xem được → không có nút', await page.locator(NUT).count() === 0);
  await dangNhap('phuhuynh', '123456');
  await moMan(`#/albums/${al.data.id}`);
  check('gia đình → không có nút', await page.locator(NUT).count() === 0);

  check('không có lỗi JavaScript trên trang', !loiJs.length, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
