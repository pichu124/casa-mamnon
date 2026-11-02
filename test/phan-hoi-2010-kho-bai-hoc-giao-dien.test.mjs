// Bài canh KHO BÀI HỌC của Kế hoạch của bé trên trình duyệt thật — góp ý
// 20/10, N1–N5.
//
// Chạy bằng:  node test/phan-hoi-2010-kho-bai-hoc-giao-dien.test.mjs
//
//   [1] Kho bài (văn phòng): mỗi khối (góc Montessori, mục con Cambridge /
//       Thể chất) là một khối gập; khối đầu mở sẵn, mở khối thì thấy bài.
//       Mỗi hàng có số thứ tự. Bấm ↑ rồi tải lại trang, thứ tự vẫn giữ.
//       Hộp sửa bài có ô mục con và bốn ô tích lứa (có nhà trẻ).
//   [2] Lập kế hoạch: bài Cambridge gom theo mục con, mỗi bài một hàng có số.
//       Tích bài trong một khối, gập khối lại, Lưu nháp: bài vẫn được lưu.
//   [3] "Đã học các tháng trước" dưới thẻ bé: tên tháng, tên bài, nhãn; bản
//       chưa duyệt ghi rõ "chưa duyệt", duyệt rồi thì thôi ghi.
//   [4] Cô nhóm nhà trẻ: bé dưới 3 tuổi thấy mục Tiếng Anh, không thấy
//       Communication and Language; thấy bài nhà trẻ, không thấy Tháp hồng.
//   [5] Khổ 390px không cuộn ngang; không lỗi JavaScript.
//
// Phần máy chủ có `test/phan-hoi-2010-kho-bai-hoc.test.mjs` và
// `test/phan-hoi-2010-ke-hoach-lich-su.test.mjs`.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, batPhanHe, goCoNuocNgoaiMau, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-kho-bai-hoc-gd');
sinhDuLieu(DIR);
// Cô phụ trách soạn cả ba phần (trường chưa khai cô nước ngoài) — để cô c1 và
// cô c4 tự tích được bài Cambridge trên màn của mình.
goCoNuocNgoaiMau(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3891), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const THANG = HOM_NAY().slice(0, 7);
const THANG_TRUOC = (() => {
  const [n, t] = THANG.split('-').map(Number);
  return new Date(Date.UTC(n, t - 2, 1)).toISOString().slice(0, 7);
})();
const TEN_THANG_TRUOC = `Tháng ${Number(THANG_TRUOC.slice(5))}/${THANG_TRUOC.slice(0, 4)}`;

{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
}
const QL = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;
const khoApi = async () => ((await req('GET', '/api/kehoachbe/bai-hoc?tatCa=1', { cookie: QL })).data || {}).baiHoc || [];
const beApi = async (classId, thang, sid, cookie = GV) => ((((await req('GET',
  `/api/kehoachbe?classId=${classId}&thang=${thang}`, { cookie })).data || {}).danhSach || [])
  .find(x => x.studentId === sid) || {});

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
  await page.waitForFunction((ten) => window.App && App.state.user && App.state.user.username === ten, u, { timeout: 10000 });
  await page.waitForTimeout(600);
}
// Tải lại cả trang rồi mới mở màn: trạng thái nhớ trong trang mất sạch, màn
// chỉ còn đọc được những gì máy chủ đã lưu.
async function taiLai(hash) {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}
const chu = () => page.locator('#view').innerText();
const tran = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

try {
  // Dữ liệu dựng sẵn qua API: s1 có kế hoạch tháng trước (còn nháp).
  const kho0 = await khoApi();
  const thapHong = kho0.find(b => b.ten === 'Tháp hồng');
  const colours = kho0.find(b => b.ten === 'Colours');
  check('đối chứng — kho có "Tháp hồng" và "Colours"', !!thapHong && !!colours);
  const luuTruoc = await req('PUT', '/api/kehoachbe', { cookie: GV, body: {
    classId: 'c1', thang: THANG_TRUOC, chuongTrinh: 'chu-nhiem',
    danhSach: [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }],
      muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt cùng cô' }] }] } });
  check('đối chứng — lưu được kế hoạch tháng trước cho s1', luuTruoc.status === 200, luuTruoc.data);

  // =========================================================================
  console.log('\n[1] Kho bài: gập theo khối, số thứ tự, ↑ giữ sau khi tải lại, ô mục con và bốn lứa');
  await dangNhap('hieutruong', 'quantri2026');
  await taiLai('#/kehoachbe');
  await page.click('#kb-tabs [data-tab="baihoc"]');
  await page.waitForTimeout(1000);
  {
    const khoi = page.locator('details.kb-khoi');
    check('kho chia thành nhiều khối gập', await khoi.count() >= 8, await khoi.count());
    check('khối đầu mở sẵn', await khoi.first().evaluate(el => el.open));
    const maths = page.locator('details.kb-khoi', { has: page.locator('summary', { hasText: /^Maths/ }) });
    check('Cambridge có khối "Maths"', await maths.count() === 1);
    check('khối "Maths" đang gập: bài bên trong chưa hiện', !(await maths.locator('[data-sua-bai]').first().isVisible()));
    await maths.locator('summary').click();
    await page.waitForTimeout(200);
    check('mở khối "Maths" thì thấy bài', await maths.locator('[data-sua-bai]').first().isVisible());
    check('có khối "Tiếng Anh" và khối "Vận động thô"',
      await page.locator('details.kb-khoi summary', { hasText: /^Tiếng Anh/ }).count() === 1
      && await page.locator('details.kb-khoi summary', { hasText: /^Vận động thô/ }).count() === 1);

    const lua = await page.locator('#kb-bh-loc option').allInnerTexts();
    check('lọc được bốn lứa, có nhà trẻ', lua.join('|') === 'Mọi lứa|Nhà trẻ (dưới 3 tuổi)|3–4 tuổi|4–5 tuổi|5–6 tuổi', lua);

    // Hàng trong khối đầu (Toán) đánh số 1., 2., ...
    const dau = khoi.first();
    const stt = (await dau.locator('.kb-stt').allInnerTexts()).map(x => x.trim());
    check('hàng trong khối đánh số 1., 2., 3.', stt.slice(0, 3).join(' ') === '1. 2. 3.', stt.slice(0, 4));
    const id2 = await dau.locator('[data-sua-bai]').nth(1).getAttribute('data-sua-bai');
    const id1 = await dau.locator('[data-sua-bai]').nth(0).getAttribute('data-sua-bai');
    check('nút ↑ của hàng đầu bị khoá', await dau.locator('[data-len]').first().isDisabled());
    await dau.locator(`[data-len="${id2}"]`).click();
    await page.waitForTimeout(1200);
    await taiLai('#/kehoachbe');
    await page.click('#kb-tabs [data-tab="baihoc"]');
    await page.waitForTimeout(1000);
    const sau = await page.locator('details.kb-khoi').first().locator('[data-sua-bai]').evaluateAll(els => els.map(e => e.dataset.suaBai));
    check('bấm ↑ rồi tải lại trang: bài thứ hai lên đầu, bài đầu xuống thứ hai', sau[0] === id2 && sau[1] === id1, { sau: sau.slice(0, 3), id1, id2 });
    const toanApi = (await khoApi()).filter(b => b.gocLinhVuc === 'toan').map(b => b.id);
    check('máy chủ cũng giữ thứ tự mới', toanApi[0] === id2 && toanApi[1] === id1);

    // Đang lọc lứa nhà trẻ: ↓ đưa bài qua bài nhà trẻ kế tiếp, nhảy qua các
    // bài mẫu giáo bộ lọc đang giấu; thứ tự của chúng giữ nguyên.
    const toanDu = (await khoApi()).filter(b => b.gocLinhVuc === 'toan');
    const nt = toanDu.filter(b => (b.luaApDung || []).includes('0-3')).map(b => b.id);
    await page.selectOption('#kb-bh-loc', '0-3');
    await page.waitForTimeout(800);
    const hienLoc = await page.locator('details.kb-khoi').first().locator('[data-sua-bai]').evaluateAll(els => els.map(e => e.dataset.suaBai));
    check('lọc nhà trẻ: khối Toán chỉ còn bài nhà trẻ', nt.length >= 2 && hienLoc.join() === nt.join(), { hienLoc, nt });
    await page.locator(`[data-xuong="${nt[0]}"]`).click();
    await page.waitForTimeout(1200);
    const mong = toanDu.map(b => b.id).filter(x => x !== nt[0]);
    mong.splice(mong.indexOf(nt[1]) + 1, 0, nt[0]);
    const thuc = (await khoApi()).filter(b => b.gocLinhVuc === 'toan').map(b => b.id);
    check('↓ khi đang lọc: bài nhảy qua bài nhà trẻ kế tiếp, bài bị giấu giữ chỗ', thuc.join() === mong.join(), { thuc, mong });
    await page.selectOption('#kb-bh-loc', '');
    await page.waitForTimeout(800);

    // Hộp sửa: ô mục con theo góc, bốn ô lứa.
    const cg = page.locator('details.kb-khoi', { has: page.locator('summary', { hasText: /^Communication and Language/ }) });
    await cg.locator('summary').click();
    await page.waitForTimeout(200);
    await cg.locator(`[data-sua-bai="${colours.id}"]`).click();
    await page.waitForTimeout(400);
    check('hộp sửa bài có bốn ô tích lứa, có ô nhà trẻ', await page.locator('.kb-bh-lua').count() === 4
      && await page.locator('.kb-bh-lua[value="0-3"]').count() === 1);
    check('ô nhà trẻ ghi rõ "Nhà trẻ"', /Nhà trẻ/.test(await page.locator('.kb-bh-lua[value="0-3"]').locator('xpath=..').innerText()));
    check('ô mục con đang là "Communication and Language"', (await page.inputValue('#kb-bh-con')) === 'cam-giao-tiep');
    const con = await page.locator('#kb-bh-con option').evaluateAll(els => els.map(e => e.value));
    check('ô mục con chỉ có mục của Cambridge', con.join(',') === ',cam-giao-tiep,cam-toan,cam-kham-pha,tieng-anh', con);
    await page.selectOption('#kb-bh-goc', 'toan');
    check('đổi sang góc Montessori: ô mục con ẩn đi', !(await page.locator('#kb-bh-con').isVisible()));
    await page.selectOption('#kb-bh-goc', 'cambridge');
    await page.selectOption('#kb-bh-con', 'cam-toan');
    await page.click('#kb-bh-luu');
    await page.waitForTimeout(1200);
    check('lưu xong: "Colours" chuyển sang Maths trên máy chủ',
      ((await khoApi()).find(b => b.id === colours.id) || {}).linhVucCon === 'cam-toan');
    await req('PUT', `/api/kehoachbe/bai-hoc/${colours.id}`, { cookie: QL, body: { linhVucCon: 'cam-giao-tiep' } });
    check('kho bài khổ 390px không cuộn ngang', await tran() <= 1, `tràn ${await tran()}px`);
  }

  // =========================================================================
  console.log('\n[2] Lập kế hoạch: Cambridge gom theo mục con; tích, gập khối, Lưu nháp vẫn giữ');
  await dangNhap('giaovien', '123456');
  await taiLai('#/kehoachbe');
  await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
  await page.waitForTimeout(400);
  let baiMaths;
  {
    // Hộp "Đặt cả nhóm": gom theo cùng khối, chỉ bài thuộc lứa của bé trong nhóm.
    await page.click('#kb-ca-nhom');
    await page.waitForTimeout(400);
    const hop = (await page.locator('#modal-overlay details.kb-khoi > summary').allInnerTexts()).map(x => x.trim());
    check('hộp Đặt cả nhóm gom bài Cambridge theo mục, không có Tiếng Anh cho nhóm mẫu giáo',
      hop.some(x => /^Maths/.test(x)) && !hop.some(x => /^Tiếng Anh/.test(x)), hop);
    await page.evaluate(() => UI.closeModal());
    await page.waitForTimeout(300);
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    const vung = page.locator('.kb-vung[data-goc="cambridge"]');
    const tieuDe = (await vung.locator('details.kb-khoi > summary').allInnerTexts()).map(x => x.trim());
    check('bài Cambridge gom thành ba khối mẫu giáo',
      tieuDe.length === 3 && /^Communication and Language · \d+ bài$/.test(tieuDe[0]) && /^Maths/.test(tieuDe[1]) && /^Let's Explore/.test(tieuDe[2]), tieuDe);
    check('bé mẫu giáo không thấy khối Tiếng Anh', !tieuDe.some(t => /^Tiếng Anh/.test(t)));
    const maths = vung.locator('details.kb-khoi', { has: page.locator('summary', { hasText: /^Maths/ }) });
    check('khối chưa tích gì thì gập sẵn', !(await maths.evaluate(el => el.open)));
    const tongChip = await vung.locator('.kb-bai').count();
    check('khối gập vẫn có đủ bài trong trang', tongChip >= 9, tongChip);
    await maths.locator('summary').click();
    await page.waitForTimeout(200);
    const dong = maths.locator('.kb-dong-bai').first();
    check('mỗi bài một hàng, mở đầu bằng "1."', (await dong.locator('.kb-stt').innerText()).trim() === '1.');
    const chip = dong.locator('.kb-bai');
    baiMaths = await chip.getAttribute('data-bai');
    await chip.click();
    check('bấm bài ra "Dạy mới"', /· Dạy mới$/.test((await chip.innerText()).trim()), await chip.innerText());
    await maths.locator('summary').click();
    await page.waitForTimeout(200);
    check('gập khối lại', !(await maths.evaluate(el => el.open)));
    await page.click('#kb-luu');
    await page.waitForTimeout(1500);
    const ke = (await beApi('c1', THANG, 's1')).ke || {};
    check('Lưu nháp với khối đang gập: bài vừa tích VẪN được lưu',
      (ke.baiHoc || []).some(b => b.baiHocId === baiMaths && b.nhan === 'hoc-moi'), ke.baiHoc);
    await taiLai('#/kehoachbe');
    await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    const maths2 = page.locator('.kb-vung[data-goc="cambridge"] details.kb-khoi', { has: page.locator('summary', { hasText: /^Maths/ }) });
    check('mở lại màn: khối có bài đã tích được mở sẵn', await maths2.evaluate(el => el.open));
  }

  // =========================================================================
  console.log('\n[3] "Đã học các tháng trước" dưới thẻ bé');
  {
    await page.click('#kb-ct [data-ct="chu-nhiem"]');
    await page.waitForTimeout(400);
    const ls = page.locator('details.kb-lich-su');
    check('có khối "Đã học các tháng trước", mở sẵn khi xem một bé',
      await ls.count() === 1 && await ls.evaluate(el => el.open) && /Đã học các tháng trước/.test(await ls.locator('summary').innerText()));
    const t = await ls.innerText();
    check('hiện tên tháng trước, tên bài và nhãn "Dạy mới"',
      t.includes(TEN_THANG_TRUOC) && /Tháp hồng/.test(t) && /Dạy mới/.test(t), t);
    check('hiện cả chữ tự do của tháng trước', /Đếm hạt cùng cô/.test(t), t);
    check('bản còn nháp ghi rõ "chưa duyệt"', /chưa duyệt/.test(t), t);
    check('không có phần trăm hay điểm', !/%|điểm/.test(t), t);

    await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
    await page.waitForTimeout(400);
    check('tab Cambridge không hiện bài Montessori của tháng trước', !/Tháp hồng/.test(await chu()));
    await page.click('#kb-ct [data-ct="chu-nhiem"]');
    await page.selectOption('#kb-be', '');
    await page.waitForTimeout(500);
    const lsNhom = page.locator('details.kb-lich-su');
    check('xem cả nhóm: khối lịch sử gập sẵn', await lsNhom.count() >= 1 && !(await lsNhom.first().evaluate(el => el.open)));

    // Duyệt bản tháng trước: chữ "chưa duyệt" phải biến mất.
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG_TRUOC, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
    const keT = (await beApi('c1', THANG_TRUOC, 's1')).ke;
    const duyet = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: keT.id, chuongTrinh: 'chu-nhiem' }] } });
    check('đối chứng — quản lý duyệt được bản tháng trước', duyet.status === 200, duyet.data);
    const lsApi = ((await beApi('c1', THANG, 's1')).lichSu || [])[0] || {};
    check('đối chứng — lịch sử báo bản tháng trước đã duyệt', lsApi.trangThai === 'da-duyet', lsApi);
    await taiLai('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    const t2 = await page.locator('details.kb-lich-su').innerText();
    check('đã duyệt thì thôi ghi "chưa duyệt"', t2.includes(TEN_THANG_TRUOC) && !/chưa duyệt/.test(t2), t2);
    check('khổ 390px không cuộn ngang', await tran() <= 1, `tràn ${await tran()}px`);
  }

  // =========================================================================
  console.log('\n[4] Cô nhóm nhà trẻ (c4): bé dưới 3 tuổi thấy bài nhà trẻ');
  {
    await dangNhap('giaovien4', '123456');
    await taiLai('#/kehoachbe');
    await page.selectOption('#kb-be', 's10');
    await page.waitForTimeout(500);
    await page.selectOption('#kb-goc', 'giac-quan');
    await page.waitForTimeout(300);
    check('nhãn lứa ghi "nhà trẻ"', /nhà trẻ/.test(await page.locator('.kb-vung[data-goc="giac-quan"]').innerText()));
    const ten = await page.locator('.kb-vung[data-goc="giac-quan"] .kb-bai').evaluateAll(els => els.map(e => e.dataset.ten));
    check('bé nhà trẻ thấy "Giỏ kho báu", không thấy "Tháp hồng"', ten.includes('Giỏ kho báu') && !ten.includes('Tháp hồng'), ten);
    await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
    await page.waitForTimeout(400);
    const tieuDe = (await page.locator('.kb-vung[data-goc="cambridge"] details.kb-khoi > summary').allInnerTexts()).map(x => x.trim());
    check('bé nhà trẻ thấy khối Tiếng Anh, không thấy Communication and Language',
      tieuDe.some(x => /^Tiếng Anh · \d+ bài$/.test(x)) && !tieuDe.some(x => /Communication and Language/.test(x)), tieuDe);
    check('khối duy nhất thì mở sẵn', await page.locator('.kb-vung[data-goc="cambridge"] details.kb-khoi').first().evaluate(el => el.open));
    check('khổ 390px không cuộn ngang', await tran() <= 1, `tràn ${await tran()}px`);
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
