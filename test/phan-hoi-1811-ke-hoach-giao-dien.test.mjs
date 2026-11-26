// Bài canh KẾ HOẠCH CỦA BÉ + HÀNH TRÌNH — góp ý 18/11 (Đ260h), trên trình duyệt thật.
//
// Chạy bằng:  node test/phan-hoi-1811-ke-hoach-giao-dien.test.mjs
//
// Dựng trên DỮ LIỆU MẪU THẬT (sinhDuLieu có phân hệ): bé An (s1) có bản đã
// duyệt gồm mục "Việc khác" ở năm góc và bài từ kho, trong đó có bài Cambridge
// thuộc Maths / Let's Explore — đúng thứ người của trường thấy khi mở bản thử.
//
//   [6] Gia đình: ba chương trình là ba khối màu khác nhau (không họ đỏ / cam),
//       Cambridge chia Maths / Let's Explore…; quản lý ở Hành trình thấy mục
//       chữ, không còn "Tháng này chưa có bài nào ở phần này".
//   [7] Phần Cambridge đã khoá ở màn Kế hoạch chia theo mục con.
//   [8] Hộp đề xuất sửa: đổi Dạy mới → Ôn tập, bỏ một bài, thêm một bài, gửi;
//       quản lý thấy Thêm / Bỏ / Đổi nhãn và đồng ý thay bản đã duyệt.
//   [9] Thẻ "Môn Cambridge theo cơ sở" chỉ hiện với hiệu trưởng.
//
// Phần máy chủ: test/phan-hoi-1811-ke-hoach.test.mjs.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, datChucVu, khoaVaoCoSo, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-ke-hoach-gd');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkQL = taoQuanTri(DIR, 'Quản Lý CS1', 'ql.cs1');
datChucVu(DIR, 'ql.cs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'ql.cs1', 'cs1');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5430), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const THANG = HOM_NAY().slice(0, 7);
const BON_TAB = ['Kế hoạch của bé', 'Cambridge', 'P.E (Thể chất)', 'Montessori & Kỹ năng sống'];

async function doiMatKhau(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await doiMatKhau('hieutruong', mkHT);
await doiMatKhau('ql.cs1', mkQL);
const NN = (await login('giaovien.nn', '123456')).cookie;   // t5 — cô nước ngoài của c1
const keS1 = async () => ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: NN })).data.danhSach || [])
  .find(x => x.studentId === 's1').ke;

const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', e => loi.push(e.message));
  page.on('dialog', (d) => { d.accept().catch(() => {}); });
  const dangNhap = async (u, p) => {
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { App.logout(); } catch (_) {} });
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#lg-user', { timeout: 10000 });
    await page.fill('#lg-user', u);
    await page.fill('#lg-pass', p);
    await page.click('button[type=submit]');
    await page.waitForFunction((ten) => window.App && App.state.user && App.state.user.username === ten, u, { timeout: 10000 });
    await page.waitForTimeout(800);
  };
  const moMan = async (hash, cho = 1500) => {
    if (await page.evaluate(() => location.hash) === hash) await page.evaluate(() => App.route());
    else await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(cho);
  };
  const tran = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // Màu viền trái của một khối, dạng [r, g, b].
  const mauVien = (loc) => loc.evaluate(el => (getComputedStyle(el).borderLeftColor.match(/\d+/g) || []).slice(0, 3).map(Number));
  // Họ đỏ / cam / vàng: đỏ trội hẳn, xanh lam thấp.
  const hoNong = ([r, g, b]) => r > 180 && b < 120 && r > g;

  // =========================================================================
  console.log('\n[6] Gia đình: ba khối màu theo chương trình, Cambridge chia theo mục con');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan('#/hanhtrinh');
    const tab = (await page.locator('#ht-ph-tabs [data-tab]').allInnerTexts()).map(t => t.trim());
    check('chữ của bốn tab giữ nguyên (chấm màu không thêm chữ)', tab.join(' | ') === BON_TAB.join(' | '), tab);
    check('tab chương trình có chấm màu', await page.locator('#ht-ph-tabs [data-tab="nuoc-ngoai"] span[aria-hidden]').count() === 1);
    const khoi = page.locator('.ht-kh-ct[data-ct]');
    check('ba khối, mỗi chương trình một khối', await khoi.count() === 3, await khoi.count());
    const mau = [];
    for (const ct of ['nuoc-ngoai', 'the-chat', 'chu-nhiem']) mau.push(await mauVien(page.locator(`.ht-kh-ct[data-ct="${ct}"]`)));
    check('ba màu viền khác nhau', new Set(mau.map(m => m.join(','))).size === 3, mau);
    check('không màu nào thuộc họ đỏ / cam / vàng', !mau.some(hoNong), mau);
    const cam = await page.locator('.ht-kh-ct[data-ct="nuoc-ngoai"]').innerText();
    check('khối Cambridge có tiêu đề Maths, Let\'s Explore, Communication and Language',
      /Maths/.test(cam) && /Let's Explore/.test(cam) && /Communication and Language/.test(cam), cam);
    const iMaths = cam.indexOf('Maths');
    const iShapes = cam.indexOf('Shapes');
    const iExplore = cam.indexOf("Let's Explore");
    check('Shapes nằm dưới Maths, trước Let\'s Explore', iMaths >= 0 && iMaths < iShapes && iShapes < iExplore, cam);
    check('không còn dòng phụ lặp "Tiếng Anh (Cambridge)"', !/Tiếng Anh \(Cambridge\)/.test(cam), cam);
    check('"Việc khác" của Cambridge cũng hiện cho gia đình', /Nghe và làm theo hai chỉ dẫn/.test(cam), cam);
    const mon = await page.locator('.ht-kh-ct[data-ct="chu-nhiem"]').innerText();
    check('khối Montessori chia theo góc (Toán, Thực hành cuộc sống) và có "Việc khác"',
      /Toán/.test(mon) && /Thực hành cuộc sống/.test(mon) && /Đếm và ghép số lượng/.test(mon), mon);
    const t = await page.locator('#view').innerText();
    check('gia đình KHÔNG thấy mức độ hay chữ quy ước', !/Đang hình thành|Đã vững|Chưa quan sát thấy|W · |S · /.test(t), t.slice(0, 400));
    check('không cuộn ngang', (await tran()) <= 1, await tran());
  }

  // =========================================================================
  console.log('\n[6] Quản lý ở Hành trình → Kế hoạch của bé, bé An: thấy mục chữ, không còn câu "chưa có bài"');
  {
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/hanhtrinh');
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1800);
    const phan = page.locator('.ht-kh-phan[data-ct]');
    check('ba thẻ phần chương trình', await phan.count() === 3, await phan.count());
    const v = await page.locator('#ht-be-than').innerText();
    check('KHÔNG còn câu "Tháng này chưa có bài nào ở phần này"', !/chưa có bài nào ở phần này/.test(v), v.slice(0, 500));
    check('thấy mục chữ dạng "Việc khác: …"', /Việc khác: Đếm và ghép số lượng trong phạm vi 5/.test(v), v.slice(0, 500));
    const cam = await page.locator('.ht-kh-phan[data-ct="nuoc-ngoai"]').innerText();
    check('phần Cambridge chia theo mục con', /Maths/.test(cam) && /Let's Explore/.test(cam) && /Shapes/.test(cam), cam);
  }

  // =========================================================================
  console.log('\n[7] Cô nước ngoài: phần Cambridge đã khoá chia theo mục con');
  {
    await dangNhap('giaovien.nn', '123456');
    await moMan('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(800);
    const muc = (await page.locator('.kb-muc-con').allInnerTexts()).map(x => x.trim());
    check('tiêu đề mục con: Communication and Language, Maths, Let\'s Explore',
      muc.includes('Communication and Language') && muc.includes('Maths') && muc.includes("Let's Explore"), muc);
    const vung = await page.locator('.kb-vung[data-goc="cambridge"]').innerText();
    check('mỗi mục đánh số riêng (Shapes là 1. dưới Maths)', /Maths\s*\n?\s*1\. Shapes/.test(vung), vung);
  }

  // =========================================================================
  console.log('\n[8] Hộp đề xuất sửa: sửa ngay trên danh sách đã duyệt, quản lý đồng ý là thay bản');
  {
    const ke = await keS1();
    const id = (ten) => (ke.baiHoc.find(b => b.ten === ten) || {}).baiHocId;
    await page.locator(`[data-de-xuat="${ke.id}"]`).click();
    await page.waitForTimeout(500);
    const hop = page.locator('#modal-overlay');
    check('hộp hiện ĐỦ bài đã duyệt của phần Cambridge (4 bài, mỗi bài một ô nhãn)',
      await hop.locator('.kb-dx-nhan').count() === 4, await hop.locator('.kb-dx-nhan').count());
    check('ô lý do vẫn còn', await hop.locator('#kb-dx-lydo').count() === 1);
    check('ô "Việc khác" điền sẵn nội dung đã duyệt',
      await hop.locator('.kb-dx-muc[data-goc="cambridge"]').inputValue() === 'Nghe và làm theo hai chỉ dẫn liên tiếp bằng tiếng Anh');
    await hop.locator(`.kb-dx-nhan[data-bai="${id('Shapes')}"]`).selectOption('on-tap');
    await hop.locator(`.kb-dx-nhan[data-bai="${id('Animals')}"]`).selectOption('');
    await hop.locator('.kb-dx-kho summary').first().click();
    await hop.locator('.kb-dx-them[data-ten="Weather"]').click();
    check('chip thêm bài đổi sang "Dạy mới" khi bấm', /Weather · Dạy mới/.test(await hop.locator('.kb-dx-them[data-ten="Weather"]').innerText()));
    check('hộp không làm trang cuộn ngang', (await tran()) <= 1, await tran());
    check('chip trong hộp không mang class của màn lập (.kb-bai)', await hop.locator('.kb-bai').count() === 0);
    await hop.locator('#kb-dx-lydo').fill('Bé thích Weather, Animals dời sang tháng sau');
    await hop.locator('#kb-dx-gui').click();
    await page.waitForTimeout(1500);
    const sau = await keS1();
    const ban = (sau.deXuatTheoCt['nuoc-ngoai'] || {}).ban || {};
    const td = ban.thayDoi || {};
    check('máy chủ nhận bản sửa: thêm Weather, bỏ Animals, Shapes Dạy mới → Ôn tập',
      JSON.stringify(td.them) === '["Weather"]' && JSON.stringify(td.bo) === '["Animals"]'
      && (td.doiNhan || []).some(x => x.ten === 'Shapes' && x.sang === 'on-tap'), td);
    check('phần Cambridge vẫn "đã duyệt" trong lúc chờ', sau.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet');

    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/kehoachbe/duyet', 1800);
    const the = page.locator('.kb-dx-the').filter({ hasText: 'Nguyễn Bảo An' });
    check('quản lý thấy thẻ đề xuất của bé An', await the.count() === 1, await the.count());
    const chu = await the.innerText();
    check('thẻ ghi rõ Thêm / Bỏ / Đổi nhãn',
      /Thêm:\s*Weather/.test(chu) && /Bỏ:\s*Animals/.test(chu) && /Shapes \(Dạy mới → Ôn tập\)/.test(chu), chu);
    const nut = the.locator('[data-dx-duyet]');
    check('nút "Đồng ý, thay bản đã duyệt"', /Đồng ý, thay bản đã duyệt/.test(await nut.innerText()));
    await nut.click();
    await page.waitForTimeout(1500);
    const moi = await keS1();
    const ten = moi.baiHoc.filter(b => b.gocLinhVuc === 'cambridge').map(b => b.ten);
    check('bản mới thay bản đã duyệt: có Weather, không còn Animals', ten.includes('Weather') && !ten.includes('Animals'), ten);
    check('Shapes nay là Ôn tập', (moi.baiHoc.find(b => b.ten === 'Shapes') || {}).nhan === 'on-tap');
    check('phần Cambridge vẫn "đã duyệt"', moi.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet', moi.chuongTrinh['nuoc-ngoai']);
  }

  // =========================================================================
  console.log('\n[9] Thẻ "Môn Cambridge theo cơ sở" chỉ hiện với hiệu trưởng');
  {
    await moMan('#/kehoachbe');
    await page.locator('#kb-tabs [data-tab="baihoc"]').click();
    await page.waitForTimeout(1500);
    const the = page.locator('#kb-mon-co-so');
    check('hiệu trưởng thấy thẻ', await the.count() === 1);
    const o = the.locator('.kb-mon-cs[data-co-so="cs1"][data-mon="cam-toan"]');
    check('Maths ở cơ sở 1 đang dạy (có tích)', await o.isChecked());
    await o.click();
    await page.waitForTimeout(1000);
    const ds = (await req('GET', '/api/kehoachbe/mon-co-so', { cookie: QL })).data || {};
    check('bỏ tích → máy chủ ghi Maths đang tắt ở cơ sở 1',
      (ds.coSo || []).some(c => c.id === 'cs1' && (c.tat || []).includes('cam-toan')), ds.coSo);
    check('không cuộn ngang ở tab Kho bài học', (await tran()) <= 1, await tran());

    await dangNhap('ql.cs1', 'quantri2026');
    await moMan('#/kehoachbe');
    await page.locator('#kb-tabs [data-tab="baihoc"]').click();
    await page.waitForTimeout(1500);
    check('đối chứng — quản lý cơ sở mở được Kho bài học', /Thêm bài học/.test(await page.locator('#view').innerText()));
    check('quản lý cơ sở KHÔNG thấy thẻ môn theo cơ sở', await page.locator('#kb-mon-co-so').count() === 0);
  }

  check('không có lỗi JavaScript', loi.length === 0, loi);
  await ctx.close();
} catch (err) {
  console.error(err);
  check('bài chạy không vấp lỗi', false, err.message);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
