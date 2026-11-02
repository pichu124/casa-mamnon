// Màn Quản trị sắp lại theo L2–L6 (góp ý 20/10, mục 12), trên trình duyệt thật.
//
// Chạy bằng:  node test/tab-quan-tri-giao-dien.test.mjs
//
//   [1] Địa chỉ cũ vẫn mở đúng chỗ: #/admin, #/admin/nhaplieu, #/admin/coso,
//       #/admin/tinhnang (và hai bí danh tongquan, giaovien).
//   [2] Quản lý cơ sở không thấy tab Cơ sở và Tính năng (theo `tabQuanTri`).
//   [3] Mục Nhân sự liệt kê cô; ban giám hiệu sửa được hồ sơ, văn phòng cơ sở
//       chỉ xem — không có nút Sửa, không có ô nhập, không có phần nhập cô.
//   [4] Nhập cô từ tệp: xem trước → nhập → phiếu mật khẩu tạm.
//   [5] Tổng quan ngày có thẻ cô đi làm theo ảnh chụp ở cổng (tên, giờ, không ảnh).
//   [6] Cài đặt đánh giá: quản lý cơ sở gửi đề xuất, ban giám hiệu đồng ý.
//   [7] Không lỗi JS nào.
import path from 'path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoReq, taoLogin, taoBoDem,
  CHROMIUM, tatBannerMoiCai, batPhanHe, taoQuanTri, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tab-quan-tri-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['diemdanh', 'nhansu']);
const mk = {
  bgh: taoQuanTri(DIR, 'Hiệu Trưởng', 'bgh'),
  qlcs1: taoQuanTri(DIR, 'Quản lý CS1', 'qlcs1'),
  vpcs1: taoQuanTri(DIR, 'Văn phòng CS1', 'vpcs1'),
  baove1: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  nhansu1: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'qlcs1', 'cs1'); datChucVu(DIR, 'qlcs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'vpcs1', 'cs1'); datChucVu(DIR, 'vpcs1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4672), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const docDb = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const ck = {};
for (const u of Object.keys(mk)) {
  const d = await login(u, mk[u]);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  ck[u] = (await login(u, 'quantri2026')).cookie;
}
{
  const hs = await req('PUT', '/api/admin/teachers/t1/ho-so-co-ban', { cookie: ck.bgh, body: {
    ngaySinh: '1990-05-12', cccd: '079190001234', choO: '12 Đường Thử, Q. 3' } });
  if (hs.status !== 200) throw new Error(`Không ghi được hồ sơ cô t1: ${JSON.stringify(hs.data)}`);
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const v = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: ck.baove1, body: { userId: 't1', anh: PNG } });
  if (v.status !== 201) throw new Error(`Bảo vệ không chụp được giờ vào của t1: ${JSON.stringify(v.data)}`);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', (d) => { d.accept().catch(() => {}); });

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
const tabDangMo = async () => (await page.locator('#ad-tabs button.active').allInnerTexts()).join('|');
const mucDangMo = async () => (await page.locator('#ad-tt-muc button.active').allInnerTexts()).join('|');
const cacTab = async () => (await page.locator('#ad-tabs button').allInnerTexts()).map(s => s.trim());

try {
  // =========================================================================
  console.log('\n[1] Địa chỉ cũ vẫn mở đúng chỗ (ban giám hiệu)');
  await dangNhap('bgh', 'quantri2026');
  {
    await moMan('#/admin');
    check('dải tab của ban giám hiệu đủ 9 tab, đúng thứ tự',
      JSON.stringify(await cacTab()) === JSON.stringify(['Tài khoản', 'Thông tin bé & nhân sự', 'Tổng quan ngày',
        'Cài đặt đánh giá', 'Cơ sở', 'Quan tâm', 'Tính năng', 'Năm học', 'Nhật ký']), await cacTab());
    check('#/admin mở tab Thông tin bé & nhân sự', await tabDangMo() === 'Thông tin bé & nhân sự', await tabDangMo());
    check('… ở mục Nhóm lớp & bé', await mucDangMo() === 'Nhóm lớp & bé', await mucDangMo());
    check('… có danh sách nhóm lớp như tab Tổng quan cũ', /Danh sách nhóm lớp/.test(await chu()));
    const dong = page.locator('.list-row', { hasText: 'Chồi 2' }).first();
    check('dòng nhóm đầu tiên vẫn có nút Sửa và Xem',
      await dong.locator('button', { hasText: 'Sửa' }).count() === 1
        && await dong.locator('button', { hasText: 'Xem' }).count() === 1);
    check('thẻ Phụ huynh & bé dời sang đây', await page.locator('#tk-van-phong').count() === 1);
    check('… với bốn việc của văn phòng',
      await page.locator('#tk-van-phong button', { hasText: 'Nhận bé mới' }).count() === 1
        && await page.locator('#tk-van-phong button', { hasText: 'Thêm phụ huynh' }).count() === 1
        && await page.locator('#tk-van-phong button', { hasText: 'Chuyển nhóm cho bé' }).count() === 1
        && await page.locator('#tk-van-phong button', { hasText: 'bảo lưu' }).count() === 1);

    await moMan('#/admin/nhaplieu');
    check('#/admin/nhaplieu mở mục Nhập danh sách bé',
      await tabDangMo() === 'Thông tin bé & nhân sự' && await mucDangMo() === 'Nhập danh sách bé',
      [await tabDangMo(), await mucDangMo()]);
    check('… có ô chọn tệp danh sách bé', await page.locator('#ad-file').count() === 1);

    await moMan('#/admin/coso');
    check('#/admin/coso mở tab Cơ sở', await tabDangMo() === 'Cơ sở', await tabDangMo());
    check('… có danh sách cơ sở và thẻ liên hệ của trường',
      /Danh sách cơ sở/.test(await chu()) && /Email kế toán/.test(await chu()), (await chu()).slice(0, 300));
    check('… thẻ nhóm lớp thuộc cơ sở nào vẫn ở đây', /Nhóm lớp thuộc cơ sở nào/.test(await chu()));
    check('… bộ chữ đánh giá đã dời khỏi tab Cơ sở', !/Chữ đánh giá dùng trong/.test(await chu()));

    await moMan('#/admin/tinhnang');
    check('#/admin/tinhnang mở tab Tính năng', await tabDangMo() === 'Tính năng', await tabDangMo());
    check('… liệt kê các phân hệ', await page.locator('#admin-body .list-row').count() >= 10
      && /Tắt một tính năng là ẩn nó/.test(await chu()), await page.locator('#admin-body .list-row').count());

    await moMan('#/admin/tongquan');
    check('bí danh tongquan → Nhóm lớp & bé', await mucDangMo() === 'Nhóm lớp & bé', await mucDangMo());
    await moMan('#/admin/giaovien');
    check('bí danh giaovien → Nhân sự', await mucDangMo() === 'Nhân sự', await mucDangMo());

    await moMan('#/admin');
    await page.locator('#ad-tabs button', { hasText: 'Tổng quan ngày' }).click();
    await page.waitForTimeout(900);
    check('bấm tab Tổng quan ngày thì mở đúng tab (mã motngay giữ nguyên)',
      await tabDangMo() === 'Tổng quan ngày' && await page.locator('#ad-mn-ngay').count() === 1, await tabDangMo());
  }

  // =========================================================================
  console.log('\n[2] Quản lý cơ sở: không có tab Cơ sở, Tính năng');
  await dangNhap('qlcs1', 'quantri2026');
  {
    await moMan('#/admin');
    const ds = await cacTab();
    check('quản lý cơ sở thấy đúng 7 tab',
      JSON.stringify(ds) === JSON.stringify(['Tài khoản', 'Thông tin bé & nhân sự', 'Tổng quan ngày',
        'Cài đặt đánh giá', 'Quan tâm', 'Năm học', 'Nhật ký']), ds);
    check('không có tab Cơ sở, không có tab Tính năng', !ds.includes('Cơ sở') && !ds.includes('Tính năng'), ds);
    await moMan('#/admin/coso');
    check('gõ thẳng #/admin/coso thì không mở danh sách cơ sở',
      !/Danh sách cơ sở/.test(await chu()) && await tabDangMo() === 'Thông tin bé & nhân sự', await tabDangMo());
    await moMan('#/admin/tinhnang');
    check('gõ thẳng #/admin/tinhnang thì không mở công tắc phân hệ',
      await tabDangMo() !== 'Tính năng' && !/Tắt một tính năng là ẩn nó/.test(await chu()), await tabDangMo());
  }

  // =========================================================================
  console.log('\n[3] Mục Nhân sự: danh sách cô, sửa hồ sơ, văn phòng chỉ xem');
  await dangNhap('bgh', 'quantri2026');
  {
    await moMan('#/admin/thongtin/nhansu');
    check('mục Nhân sự đang mở', await mucDangMo() === 'Nhân sự', await mucDangMo());
    const the = page.locator('#ad-hsc');
    const tho = await the.innerText();
    check('liệt kê cô của cả trường', /Nguyễn Thị Mai Anh/.test(tho) && /Sarah Miller/.test(tho), tho.slice(0, 400));
    check('danh sách KHÔNG có CCCD và chỗ ở', !tho.includes('079190001234') && !tho.includes('12 Đường Thử'), tho.slice(0, 400));
    const dong = the.locator('.list-row', { hasText: 'Nguyễn Thị Mai Anh' }).first();
    check('ban giám hiệu có nút Sửa', await dong.locator('button', { hasText: 'Sửa' }).count() === 1);
    await dong.locator('button', { hasText: 'Sửa' }).click();
    await page.waitForSelector('#ad-hsc-luu', { timeout: 5000 });
    check('phiếu sửa có đủ bốn ô, điền sẵn',
      await page.inputValue('#ad-hsc-ngay') === '1990-05-12' && await page.inputValue('#ad-hsc-cccd') === '079190001234'
        && await page.inputValue('#ad-hsc-cho') === '12 Đường Thử, Q. 3' && await page.locator('#ad-hsc-sdt').count() === 1);
    await page.fill('#ad-hsc-sdt', '0912 345 678');
    await page.click('#ad-hsc-luu');
    await page.waitForTimeout(1000);
    const hs = docDb("SELECT dienThoai, cccd FROM nhansu_ho_so WHERE userId = 't1'")[0] || {};
    check('bấm Lưu thì số điện thoại được ghi, CCCD giữ nguyên',
      hs.dienThoai === '0912 345 678' && hs.cccd === '079190001234', hs);
    check('ban giám hiệu có phần nhập cô từ tệp', await page.locator('#ad-nc-file').count() === 1);
  }
  await dangNhap('vpcs1', 'quantri2026');
  {
    await moMan('#/admin/thongtin/nhansu');
    const the = page.locator('#ad-hsc');
    const tho = await the.innerText();
    check('văn phòng cơ sở 1 thấy cô cơ sở 1', /Nguyễn Thị Mai Anh/.test(tho), tho.slice(0, 300));
    check('… không thấy cô chỉ thuộc cơ sở 2', !/Sarah Miller/.test(tho), tho.slice(0, 300));
    check('văn phòng KHÔNG có nút Sửa nào', await the.locator('button', { hasText: 'Sửa' }).count() === 0);
    check('văn phòng KHÔNG có phần nhập cô', await page.locator('#ad-nc-file').count() === 0);
    await the.locator('.list-row', { hasText: 'Nguyễn Thị Mai Anh' }).first().locator('button', { hasText: 'Xem' }).click();
    await page.waitForSelector('.modal', { timeout: 5000 });
    await page.waitForTimeout(500);
    const phieu = await page.locator('.modal').innerText();
    check('phiếu xem có CCCD và chỗ ở', phieu.includes('079190001234') && phieu.includes('12 Đường Thử'), phieu.slice(0, 300));
    check('phiếu xem không có ô nhập, không có nút Lưu',
      await page.locator('.modal input').count() === 0 && await page.locator('#ad-hsc-luu').count() === 0);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[4] Nhập cô từ tệp: xem trước → nhập → phiếu mật khẩu tạm');
  await dangNhap('bgh', 'quantri2026');
  {
    await moMan('#/admin/thongtin/nhansu');
    const TEP = 'Họ tên,Điện thoại,Email,Ngày sinh,CCCD,Cơ sở,Nhóm,Vai\n'
      + 'Đỗ Thị Thử Nhập,0911222333,,1995-03-04,,Cơ sở 1,,\n'
      + 'Trùng Số Gốc,0903111222,,,,Cơ sở 1,,\n';
    await page.setInputFiles('#ad-nc-file', { name: 'co.csv', mimeType: 'text/csv', buffer: Buffer.from(TEP, 'utf8') });
    await page.waitForSelector('#ad-nc-ghi', { timeout: 8000 });
    const xem = await page.locator('#ad-nc-xem').innerText();
    check('xem trước có tên cô mới', xem.includes('Đỗ Thị Thử Nhập'), xem.slice(0, 400));
    check('xem trước báo dòng trùng với cô đã có', /đã có cô Nguyễn Thị Mai Anh/.test(xem), xem.slice(0, 600));
    check('nút nhập ghi đúng 1 cô', /Nhập 1 cô/.test(await page.locator('#ad-nc-ghi').innerText()),
      await page.locator('#ad-nc-ghi').innerText());
    check('chưa bấm nhập thì chưa có tài khoản nào',
      docDb("SELECT COUNT(*) AS n FROM users WHERE name = 'Đỗ Thị Thử Nhập'")[0].n === 0);
    await page.click('#ad-nc-ghi');
    await page.waitForSelector('#ad-nc-tai', { timeout: 8000 });
    const phieu = await page.locator('.modal').innerText();
    const co = docDb("SELECT id, username FROM users WHERE name = 'Đỗ Thị Thử Nhập' AND role = 'teacher'")[0];
    check('nhập xong có đúng một tài khoản cô mới', !!co, co);
    check('phiếu có tên đăng nhập của cô mới', !!co && phieu.includes(co.username), phieu.slice(0, 400));
    const mkTam = (await page.locator('.modal code').allInnerTexts()).filter(s => s !== co?.username);
    check('phiếu có một mật khẩu tạm', mkTam.length === 1 && mkTam[0].length >= 6, mkTam);
    check('dòng trùng bị bỏ qua, không tạo tài khoản',
      docDb("SELECT COUNT(*) AS n FROM users WHERE name LIKE 'Trùng Số%'")[0].n === 0);
    if (co && mkTam[0]) {
      const l = await login(co.username, mkTam[0]);
      check('mật khẩu trên phiếu đăng nhập được', l.status === 200, l.status);
    }
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[5] Tổng quan ngày: thẻ cô đi làm theo ảnh chụp ở cổng');
  {
    await moMan('#/admin/motngay');
    await page.waitForSelector('#ad-mn-cong', { timeout: 5000 });
    const the = page.locator('#ad-mn-cong');
    const tho = await the.innerText();
    check('thẻ có đúng tiêu đề', tho.includes('Cô đi làm hôm nay (theo ảnh chụp ở cổng)'), tho.slice(0, 200));
    check('thẻ cổng đứng trên thẻ số bé',
      await page.evaluate(() => {
        const a = document.getElementById('ad-mn-cong');
        const b = document.querySelector('#ad-mn-than .stat-row');
        return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      }));
    const dong = the.locator('.list-row', { hasText: 'Nguyễn Thị Mai Anh' }).first();
    check('dòng của cô t1 có giờ vào dạng HH:MM', /Vào \d{2}:\d{2}/.test(await dong.innerText()), await dong.innerText());
    check('thẻ không có ảnh nào', await the.locator('img').count() === 0);
    check('thẻ bảng công cũ đổi tên', /Theo bảng công của Nhân sự/.test(await chu()));
    check('không phần trăm nào trên màn', !/\d\s*%/.test(await chu()));
  }

  // =========================================================================
  console.log('\n[6] Cài đặt đánh giá: quản lý cơ sở đề xuất, ban giám hiệu đồng ý');
  await dangNhap('qlcs1', 'quantri2026');
  {
    await moMan('#/admin/danhgia');
    check('tab Cài đặt đánh giá mở', await tabDangMo() === 'Cài đặt đánh giá', await tabDangMo());
    check('quản lý cơ sở không sửa thẳng được bộ chữ', await page.locator('#ad-ndg-luu').count() === 0);
    await page.waitForSelector('#ad-ndg-dx-gui', { timeout: 5000 });
    check('ô đề xuất điền sẵn chữ đang dùng', await page.inputValue('#ad-ndg-dx-da-vung') === 'Đã vững');
    await page.fill('#ad-ndg-dx-da-vung', 'Hoàn thành');
    await page.fill('#ad-ndg-dx-lydo', 'Cô các nhóm quen nói Hoàn thành hơn');
    await page.click('#ad-ndg-dx-gui');
    await page.waitForSelector('#ad-ndg-dx-rut', { timeout: 5000 });
    const tho = await page.locator('#ad-nhan-danh-gia').innerText();
    check('gửi xong thấy đề xuất của mình đang chờ', /Đã vững → Hoàn thành/.test(tho), tho.slice(0, 600));
    const dang = (await req('GET', '/api/admin/nhan-danh-gia', { cookie: ck.bgh })).data.nhan.find(n => n.ma === 'da-vung');
    check('bộ chữ đang dùng CHƯA đổi khi mới gửi đề xuất', dang?.nhan === 'Đã vững', dang);
  }
  await dangNhap('bgh', 'quantri2026');
  {
    await moMan('#/admin/danhgia');
    await page.waitForSelector('#ad-ndg-cho', { timeout: 5000 });
    const cho = await page.locator('#ad-ndg-cho').innerText();
    check('ban giám hiệu thấy đề xuất đang chờ, có tên người gửi và lý do',
      /Quản lý CS1/.test(cho) && /quen nói Hoàn thành/.test(cho) && /Đã vững → Hoàn thành/.test(cho), cho.slice(0, 500));
    check('ban giám hiệu vẫn sửa thẳng được', await page.locator('#ad-ndg-luu').count() === 1);
    await page.click('#ad-ndg-dx-dongy');
    await page.waitForTimeout(1200);
    const dang = (await req('GET', '/api/admin/nhan-danh-gia', { cookie: ck.bgh })).data.nhan.find(n => n.ma === 'da-vung');
    check('đồng ý thì bộ chữ đổi thật', dang?.nhan === 'Hoàn thành', dang);
    check('khối đề xuất đang chờ biến mất', await page.locator('#ad-ndg-cho').count() === 0);
    check('ô sửa thẳng hiện chữ mới', await page.inputValue('#ad-ndg-da-vung') === 'Hoàn thành');
    check('đề xuất vừa xem nằm trong mục gần đây', /Đã đồng ý/.test(await page.locator('#ad-nhan-danh-gia').innerText()));
  }
  await dangNhap('qlcs1', 'quantri2026');
  {
    await moMan('#/admin/danhgia');
    await page.waitForSelector('#ad-ndg-dx-gui', { timeout: 5000 });
    const tho = await page.locator('#ad-nhan-danh-gia').innerText();
    check('quản lý cơ sở thấy kết quả "Đã đồng ý" và lại gửi được đề xuất mới', /Đã đồng ý/.test(tho), tho.slice(0, 600));
  }

  // =========================================================================
  console.log('\n[6b] Nhân sự: chỉ mục Nhân sự — hồ sơ cô, nhập cô; không mục nào về bé');
  await dangNhap('nhansu1', 'quantri2026');
  {
    await moMan('#/admin');
    const tabs = await page.locator('#ad-tabs button').allInnerTexts();
    check('Nhân sự thấy đúng hai tab: Tài khoản, Thông tin bé & nhân sự',
      tabs.length === 2 && tabs.some(t => /Tài khoản/.test(t)) && tabs.some(t => /Thông tin/.test(t)), tabs);
    const mucs = await page.locator('#ad-tt-muc button').allInnerTexts();
    check('… và trong đó CHỈ có mục Nhân sự', mucs.length === 1 && mucs[0] === 'Nhân sự', mucs);
    const tho = await page.locator('#ad-hsc').innerText();
    check('danh sách hồ sơ cô hiện ra', /Nguyễn Thị Mai Anh/.test(tho), tho.slice(0, 300));
    const dong = page.locator('#ad-hsc .list-row', { hasText: 'Nguyễn Thị Mai Anh' }).first();
    check('Nhân sự có nút Sửa hồ sơ cô', await dong.locator('button', { hasText: 'Sửa' }).count() === 1);
    check('Nhân sự có phần nhập cô từ tệp', await page.locator('#ad-nc-file').count() === 1);
    // Gõ thẳng địa chỉ mục nhóm / nhập bé: rơi về mục Nhân sự, không vẽ gì về bé.
    for (const h of ['#/admin/thongtin/nhom', '#/admin/thongtin/nhapbe', '#/admin/nhaplieu']) {
      await moMan(h);
      check(`${h}: rơi về mục Nhân sự, không có danh sách nhóm hay tệp bé`,
        await mucDangMo() === 'Nhân sự' && await page.locator('#ad-tt-nhom').count() === 0
          && await page.locator('#ad-file').count() === 0, await mucDangMo());
    }
  }

  // =========================================================================
  console.log('\n[7] Không lỗi JS');
  check('không có lỗi JS nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Màn Quản trị sắp lại theo L2–L6');
