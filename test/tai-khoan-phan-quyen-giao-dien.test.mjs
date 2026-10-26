// Kiểm thử giao diện: tab "Tài khoản" trong Quản trị (Đ239d1 — góp ý 16/10, mục 5).
//
// Cần trình duyệt Playwright. Chạy bằng:  npm run test:giao-dien
//
// Trường hỏi "tạo tài khoản ở đâu, phân quyền ở chỗ nào". Bài này đi đúng con
// đường người của trường đi: Cài đặt → "Tài khoản & phân quyền", rồi canh mỗi
// vai thấy ĐÚNG phần việc của mình — ban giám hiệu thấy ô tạo tài khoản quản
// trị, quản lý cơ sở không thấy ô đó nhưng tạo được cô và chuyển cô giữa các
// nhóm, văn phòng cơ sở thấy phần phụ huynh và bé.
//
// Đ239d2: văn phòng làm trọn bốn việc trường kể ra ngay trên tab này — thêm
// phụ huynh cho bé, chuyển nhóm cho bé, nghỉ học bảo lưu / đi học lại, nhận bé
// nhập đủ thông tin kèm phụ huynh thứ hai.
import { chromium } from 'playwright';
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, taoReq, taoLogin,
  CHROMIUM, tatBannerMoiCai, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tai-khoan-giao-dien');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'htruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4889), dir: DIR });
const BASE = sv.BASE;
const req = taoReq(BASE);
const login = taoLogin(req);

async function datMatKhauMoi(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const BGH = await datMatKhauMoi('htruong', mkTam);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
const page = await ctx.newPage();
const loi = [];
page.on('pageerror', e => loi.push(e.message));

async function dangNhap(u, p) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 8000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 8000 });
}
async function dangXuat() {
  await page.evaluate(() => App.logout());
  await page.waitForSelector('#lg-user', { timeout: 8000 });
}
// Lối vào mà trường được chỉ: Cài đặt → "Tài khoản & phân quyền".
async function moTabTaiKhoanTuCaiDat() {
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await page.waitForSelector('#st-tai-khoan', { timeout: 8000 });
  await page.click('#st-tai-khoan');
  await page.waitForSelector('#admin-body .card', { timeout: 8000 });
  await page.waitForTimeout(400);
}
const chuTrongTab = () => page.locator('#admin-body').innerText();

try {
  // =========================================================================
  console.log('\n[1] Ban giám hiệu: Cài đặt → "Tài khoản & phân quyền" mở thẳng tab Tài khoản');
  await dangNhap('htruong', 'quantri2026');
  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await page.waitForSelector('#st-tai-khoan', { timeout: 8000 });
  check('Cài đặt có dòng "Tài khoản & phân quyền"',
    /Tài khoản & phân quyền/.test(await page.locator('#st-tai-khoan').innerText()));
  check('lối cũ "Nhóm lớp, cô, nhập danh sách" vẫn còn',
    await page.locator('.list-row', { hasText: 'Nhóm lớp, cô, nhập danh sách' }).count() === 1);
  await moTabTaiKhoanTuCaiDat();
  check('địa chỉ mở thẳng tab Tài khoản', await page.evaluate(() => location.hash) === '#/admin/taikhoan',
    await page.evaluate(() => location.hash));
  check('"Tài khoản" đứng đầu dãy tab và đang được chọn',
    (await page.locator('.seg button').first().innerText()).trim() === 'Tài khoản'
      && /active/.test(await page.locator('.seg button').first().getAttribute('class')));
  check('có dòng giải thích ai tạo tài khoản nào', /Ai tạo tài khoản nào/.test(await chuTrongTab()));
  check('ban giám hiệu thấy thẻ Tài khoản quản trị kèm nút tạo',
    await page.locator('#tk-quan-tri button', { hasText: 'Tạo tài khoản quản trị' }).count() === 1);
  check('và thấy cả phần tài khoản cô', await page.locator('#tk-co').count() === 1);

  // =========================================================================
  console.log('\n[2] Tạo một tài khoản Quản lý cơ sở trên màn hình');
  await page.locator('#tk-quan-tri button', { hasText: 'Tạo tài khoản quản trị' }).click();
  await page.waitForSelector('#tk-qt-cv', { timeout: 5000 });
  check('ô chọn chức vụ KHÔNG có "Ban giám hiệu"',
    !(await page.locator('#tk-qt-cv option').allInnerTexts()).some(t => /Ban giám hiệu/.test(t)),
    await page.locator('#tk-qt-cv option').allInnerTexts());
  await page.selectOption('#tk-qt-cv', 'nhansu');
  check('chức vụ cả trường (Nhân sự) thì KHÔNG hỏi cơ sở', !(await page.locator('#tk-qt-o-cs').isVisible()));
  await page.selectOption('#tk-qt-cv', 'quanly-coso');
  check('chức vụ một cơ sở (Quản lý cơ sở) thì hiện ô Cơ sở', await page.locator('#tk-qt-o-cs').isVisible());
  await page.fill('#tk-qt-ten', 'Quản Lý Thử');
  await page.fill('#tk-qt-tdn', 'quanly.thu');
  await page.selectOption('#tk-qt-cs', 'cs1');
  await page.click('#tk-qt-luu');
  await page.waitForSelector('#tk-mat-khau', { timeout: 8000 });
  const mkQL = (await page.locator('#tk-mat-khau').innerText()).trim();
  check('hiện mật khẩu tạm một lần', /^[a-z]{5}[2-9]{3}$/.test(mkQL), mkQL);
  check('kèm nút chép mật khẩu', await page.locator('#tk-chep').count() === 1);
  await page.click('#tk-chep');
  await page.waitForTimeout(400);
  check('bấm chép thì báo rõ đã chép hoặc cách tự chép',
    /chép/i.test(await page.locator('#toast-zone').innerText().catch(() => '')));
  await page.locator('.modal button', { hasText: 'Đã ghi lại' }).click();
  await page.waitForTimeout(900);
  const dongQL = page.locator('#tk-quan-tri .list-row', { hasText: 'quanly.thu' });
  check('tài khoản mới hiện trong danh sách, đúng chức vụ và cơ sở',
    await dongQL.count() === 1 && /Quản lý cơ sở/.test(await dongQL.innerText()) && /Cơ sở 1/.test(await dongQL.innerText()),
    await dongQL.count() ? await dongQL.innerText() : '(không có dòng)');

  // =========================================================================
  console.log('\n[3] Từ địa chỉ #/admin/taikhoan vẫn bấm sang được tab khác');
  await page.locator('.seg button', { hasText: 'Cơ sở' }).click();
  await page.waitForTimeout(900);
  check('bấm "Cơ sở" thì vẽ đúng tab Cơ sở', /Danh sách cơ sở/.test(await chuTrongTab()));
  check('và địa chỉ đổi theo', await page.evaluate(() => location.hash) === '#/admin/coso');
  await dangXuat();

  // =========================================================================
  console.log('\n[4] Quản lý cơ sở: không tạo được quản trị, nhưng tạo cô và chuyển cô được');
  await datMatKhauMoi('quanly.thu', mkQL);
  await dangNhap('quanly.thu', 'quantri2026');
  await moTabTaiKhoanTuCaiDat();
  check('quản lý cơ sở KHÔNG thấy thẻ tạo tài khoản quản trị', await page.locator('#tk-quan-tri').count() === 0);
  check('nhưng thấy nút tạo tài khoản cô',
    await page.locator('#tk-co button', { hasText: 'Tạo tài khoản cô' }).count() === 1);
  check('và nút chuyển nhóm cho cô',
    await page.locator('#tk-co button', { hasText: 'Chuyển nhóm' }).count() > 0);
  check('và phần phụ huynh & bé', await page.locator('#tk-van-phong').count() === 1);

  const dongHong = page.locator('#tk-co .list-row', { hasText: 'Phạm Thị Hồng' });
  check('dòng cô Hồng ghi nhóm đang dạy', /Nhà trẻ 1/.test(await dongHong.innerText()), await dongHong.innerText());
  await dongHong.locator('button', { hasText: 'Chuyển nhóm' }).click();
  await page.waitForSelector('#tk-cn-den', { timeout: 5000 });
  const den = await page.locator('#tk-cn-den option').allInnerTexts();
  check('nhóm đến chỉ có nhóm của cơ sở mình (không có Mầm 1 của Cơ sở 2)',
    den.length > 0 && !den.some(t => /Mầm 1/.test(t)), den);
  await page.selectOption('#tk-cn-den', 'c2');
  await page.click('#tk-cn-luu');
  await page.waitForTimeout(1200);
  const sau = await page.locator('#tk-co .list-row', { hasText: 'Phạm Thị Hồng' }).innerText();
  check('chuyển xong, dòng cô Hồng ghi Lá 1, không còn Nhà trẻ 1',
    /Lá 1/.test(sau) && !/Nhà trẻ 1/.test(sau), sau);
  const coHong = ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || []).find(t => t.id === 't4');
  check('máy chủ cũng nói đúng như màn hình', JSON.stringify(coHong?.classIds) === '["c2"]', coHong?.classIds);

  // Đ239d2: cô mình tạo mà chưa phân nhóm thì cấp lại mật khẩu được ngay.
  const QL = (await login('quanly.thu', 'quantri2026')).cookie;
  await req('POST', '/api/admin/teachers', { cookie: QL, body: { name: 'Cô Chưa Phân Nhóm' } });
  await moTabTaiKhoanTuCaiDat();
  const dongMoi = page.locator('#tk-co .list-row', { hasText: 'Cô Chưa Phân Nhóm' });
  check('cô chưa phân nhóm do quản lý tạo có nút "Cấp lại mật khẩu"',
    await dongMoi.locator('button', { hasText: 'Cấp lại mật khẩu' }).count() === 1,
    await dongMoi.count() ? await dongMoi.innerText() : '(không có dòng)');
  check('và không còn câu "Phân cô vào một nhóm… rồi mới cấp lại"',
    !/rồi mới cấp lại/.test(await chuTrongTab()));
  await dangXuat();

  // =========================================================================
  console.log('\n[5] Văn phòng cơ sở: phần phụ huynh & bé, không có phần tài khoản cô');
  const vp = await req('POST', '/api/admin/managers', {
    cookie: BGH, body: { name: 'Văn Phòng Thử', username: 'vanphong.thu', chucVu: 'vanphong-coso', campusId: 'cs1' },
  });
  await datMatKhauMoi('vanphong.thu', vp.data?.temporaryPassword);
  await dangNhap('vanphong.thu', 'quantri2026');
  await moTabTaiKhoanTuCaiDat();
  check('văn phòng thấy phần phụ huynh & bé', await page.locator('#tk-van-phong').count() === 1);
  check('có lối nhận bé vào nhóm', await page.locator('#tk-van-phong button', { hasText: 'Nhận bé' }).count() > 0);
  check('KHÔNG có thẻ tạo tài khoản quản trị', await page.locator('#tk-quan-tri').count() === 0);
  check('KHÔNG có phần tài khoản cô', await page.locator('#tk-co').count() === 0);

  // =========================================================================
  console.log('\n[6] Văn phòng: bốn việc của trường, mỗi việc một nút (Đ239d2)');
  const nutVP = (chu) => page.locator('#tk-van-phong button', { hasText: chu });
  for (const chu of ['Nhận bé mới (nhập đủ thông tin)', 'Thêm phụ huynh cho bé', 'Chuyển nhóm cho bé', 'Nghỉ học bảo lưu / Đi học lại']) {
    check(`có nút "${chu}"`, await nutVP(chu).count() === 1);
  }
  check('không còn các dòng chỉ đường tạm "bấm Xem bé, bấm Sửa…"', !/bấm Sửa ở dòng của bé/.test(await chuTrongTab()));
  const chonBe = async (classId, studentId) => {
    await page.waitForSelector('#tk-cb-nhom', { timeout: 5000 });
    await page.selectOption('#tk-cb-nhom', classId);
    await page.waitForSelector(`#tk-cb-be option[value="${studentId}"]`, { state: 'attached', timeout: 5000 });
    await page.selectOption('#tk-cb-be', studentId);
  };
  const beQuaApi = async (classId, id) => (((await req('GET', `/api/admin/students?classId=${classId}&keCaNghi=1`, { cookie: BGH })).data || [])
    .find(s => s.id === id) || {});

  // -- Thêm phụ huynh cho bé
  await nutVP('Thêm phụ huynh cho bé').click();
  await chonBe('c1', 's3');
  await page.click('#tk-cb-tiep');
  await page.waitForSelector('#tk-ph-ten', { timeout: 5000 });
  check('phiếu thêm phụ huynh nói rõ là tài khoản mới', /tài khoản mới/.test(await page.locator('.modal').innerText()));
  await page.fill('#tk-ph-ten', 'Trần Thị Mẹ Thử');
  await page.fill('#tk-ph-sdt', '0977 555 111');
  await page.fill('#tk-ph-qh', 'Mẹ');
  await page.click('#tk-ph-luu');
  await page.waitForSelector('#tk-mat-khau', { timeout: 8000 });
  const mkPh = (await page.locator('#tk-mat-khau').innerText()).trim();
  check('hiện mật khẩu tạm của phụ huynh mới một lần', /^[a-z]{5}[2-9]{3}$/.test(mkPh), mkPh);
  check('kèm nút chép mật khẩu', await page.locator('#tk-chep').count() === 1);
  const s3 = await beQuaApi('c1', 's3');
  check('máy chủ: bé Gia Hân có thêm phụ huynh "Mẹ"',
    (s3.parents || []).some(p => /Mẹ Thử/.test(p.name) && p.quanHe === 'Mẹ'), s3.parents);
  await page.locator('.modal button', { hasText: 'Đã ghi lại' }).click();
  await page.waitForTimeout(700);

  // -- Nghỉ học bảo lưu rồi đi học lại
  await nutVP('Nghỉ học bảo lưu / Đi học lại').click();
  await chonBe('c1', 's4');
  check('nút nói đúng việc sắp làm với bé đang học',
    (await page.locator('#tk-cb-tiep').innerText()).trim() === 'Ghi nghỉ học bảo lưu',
    await page.locator('#tk-cb-tiep').innerText());
  await page.click('#tk-cb-tiep');
  await page.waitForSelector('#ad-bl-ok', { timeout: 5000 });
  check('phiếu bảo lưu nói rõ dữ liệu cũ giữ nguyên', /giữ nguyên/.test(await page.locator('.modal').innerText()));
  const namSau = Number((await page.evaluate(() => UI.todayStr())).slice(0, 4)) + 1;
  await page.fill('#ad-bl-den', `${namSau}-01`);
  await page.fill('#ad-bl-ly-do', 'Gia đình về quê');
  await page.click('#ad-bl-ok');
  await page.waitForSelector('.modal .list-row', { timeout: 8000 });
  await page.waitForTimeout(600);
  const dongBL = page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first();
  const chuBL = await dongBL.innerText();
  check('danh sách nhóm: bé mang nhãn "Bảo lưu", không phải "Đã nghỉ"',
    /Bảo lưu/.test(chuBL) && !/Đã nghỉ/.test(chuBL), chuBL);
  check(`và ghi "từ dd/mm/yyyy · dự kiến quay lại 01/${namSau}"`,
    /Bảo lưu · từ \d{2}\/\d{2}\/\d{4} · dự kiến quay lại 01\//.test(chuBL) && chuBL.includes(`01/${namSau}`), chuBL);
  check('máy chủ: bé đã nghỉ, có dòng bảo lưu', (await beQuaApi('c1', 's4')).baoLuu?.duKienQuayLai === `${namSau}-01`);
  await dongBL.locator('button', { hasText: 'Đi học lại' }).click();
  await page.waitForTimeout(1500);
  const sauDHL = await page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first().innerText();
  check('bấm "Đi học lại": bé về mục đang học, hết nhãn bảo lưu',
    !/Bảo lưu ·|Đi học lại/.test(sauDHL) && /Sửa/.test(sauDHL), sauDHL);
  const s4 = await beQuaApi('c1', 's4');
  check('máy chủ: bé đang học lại, không còn bảo lưu', s4.active === true && !s4.baoLuu, [s4.active, s4.baoLuu]);
  check('dòng của bé đang học có nút "Bảo lưu" cạnh "Cho nghỉ"',
    await page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first().locator('button', { hasText: 'Bảo lưu' }).count() === 1);

  // -- Bé bảo lưu không quay lại: "Thôi bảo lưu, nghỉ hẳn" (Đ239-vá3). Bảo lưu
  // ghi lùi ba ngày (Đ239-vá4): bé tính là nghỉ từ ngày bắt đầu bảo lưu, không
  // phải từ hôm văn phòng bấm Bảo lưu.
  const tuNgayBL = new Date(Date.parse(`${HOM_NAY()}T00:00:00Z`) - 3 * 86400000).toISOString().slice(0, 10);
  const dmyBL = `${tuNgayBL.slice(8, 10)}/${tuNgayBL.slice(5, 7)}/${tuNgayBL.slice(0, 4)}`;
  await page.evaluate((tuNgay) => API.post('/api/admin/students/s4/bao-luu', { tuNgay }), tuNgayBL);
  await page.evaluate(() => App.views.admin.xemLop('c1'));
  await page.waitForSelector('.modal .list-row', { timeout: 8000 });
  const dongBL2 = page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first();
  check('dòng bé bảo lưu có nút "Thôi bảo lưu, nghỉ hẳn" cạnh "Đi học lại"',
    await dongBL2.locator('button', { hasText: 'Thôi bảo lưu, nghỉ hẳn' }).count() === 1
    && await dongBL2.locator('button', { hasText: 'Đi học lại' }).count() === 1, await dongBL2.innerText());
  const ngayNghiTruoc = (await beQuaApi('c1', 's4')).leftAt;
  check('(đối chứng) ngày nghỉ đang là hôm bấm Bảo lưu, khác ngày bắt đầu bảo lưu',
    !!ngayNghiTruoc && ngayNghiTruoc !== tuNgayBL, [ngayNghiTruoc, tuNgayBL]);
  await dongBL2.locator('button', { hasText: 'Thôi bảo lưu, nghỉ hẳn' }).click();
  await page.waitForSelector('#ad-thoi-bl-ok', { timeout: 5000 });
  const hopThoi = await page.locator('.modal').innerText();
  check(`hộp xác nhận nói bé tính là nghỉ từ ngày bắt đầu bảo lưu ${dmyBL}, dữ liệu giữ nguyên`,
    hopThoi.includes(`Bé tính là nghỉ từ ngày bắt đầu bảo lưu ${dmyBL}`) && /dữ liệu cũ vẫn được giữ nguyên/.test(hopThoi), hopThoi);
  await page.click('#ad-thoi-bl-ok');
  await page.waitForSelector('.modal .list-row', { timeout: 8000 });
  await page.waitForTimeout(600);
  const sauThoi = await page.locator('.modal .list-row', { hasText: 'Vũ Đức Anh' }).first().innerText();
  check('bấm xác nhận: bé mang nhãn "Đã nghỉ", hết nhãn bảo lưu, có nút "Nhận lại"',
    /Đã nghỉ/.test(sauThoi) && !/Bảo lưu|Đi học lại/.test(sauThoi) && /Nhận lại/.test(sauThoi), sauThoi);
  const s4Nghi = await beQuaApi('c1', 's4');
  check('máy chủ: bé vẫn nghỉ, không còn bảo lưu, ngày nghỉ là ngày bắt đầu bảo lưu',
    s4Nghi.active === false && !s4Nghi.baoLuu && s4Nghi.leftAt === tuNgayBL, [s4Nghi.active, s4Nghi.baoLuu, s4Nghi.leftAt, tuNgayBL]);
  await page.evaluate(() => API.put('/api/admin/students/s4', { active: true }));
  await page.evaluate(() => UI.closeModal());

  // -- Chuyển nhóm cho bé
  await nutVP('Chuyển nhóm cho bé').click();
  await chonBe('c1', 's5');
  await page.click('#tk-cb-tiep');
  await page.waitForSelector('#tk-cnb-den', { timeout: 5000 });
  const nhomDen = await page.locator('#tk-cnb-den option').allInnerTexts();
  check('nhóm đến không có nhóm bé đang học, không có nhóm cơ sở khác',
    !nhomDen.some(t => /Chồi 2|Mầm 1/.test(t)) && nhomDen.length > 0, nhomDen);
  await page.selectOption('#tk-cnb-den', 'c4');
  await page.click('#tk-cnb-luu');
  await page.waitForTimeout(1500);
  check('máy chủ: bé Khánh Vy đã sang Nhà trẻ 1', (await beQuaApi('c4', 's5')).classId === 'c4');
  await page.evaluate(() => UI.closeModal());

  // -- Nhận bé mới nhập đủ thông tin, kèm phụ huynh thứ hai
  await moTabTaiKhoanTuCaiDat();
  await nutVP('Nhận bé mới').click();
  await page.waitForSelector('#tk-cb-nhom', { timeout: 5000 });
  await page.selectOption('#tk-cb-nhom', 'c1');
  await page.click('#tk-cb-tiep');
  await page.waitForSelector('#nb-ten', { timeout: 5000 });
  for (const id of ['nb-dt', 'nb-ddcn', 'nb-tsb', 'nb-email', 'nb-qh', 'nb-ph2', 'nb-sdt2', 'nb-qh2']) {
    check(`phiếu nhận bé có ô #${id}`, await page.locator(`#${id}`).count() === 1);
  }
  check('phiếu nhận bé có ô liên hệ khẩn cấp', await page.locator('#nb-lhkc .lhkc-dong').count() === 1);
  // Đ242 — chủ dự án 26/10 (góp ý C1, trả lời 2a): bỏ ô Nhóm máu khỏi phiếu
  // nhận bé mới. Trước đây bài đòi có ô #nb-nm và kiểm bloodType === 'B'.
  check('phiếu nhận bé KHÔNG còn ô Nhóm máu (C1)',
    await page.locator('#nb-nm').count() === 0 && !/Nhóm máu/.test(await page.locator('.modal').innerText()));
  await page.fill('#nb-ten', 'Lê Minh Thử');
  await page.fill('#nb-ns', '2023-03-03');
  await page.fill('#nb-dt', 'Mường');
  await page.fill('#nb-ddcn', '001223009999');
  await page.fill('#nb-tsb', 'Dị ứng sữa bò');
  await page.fill('#nb-lhkc .lhkc-ten', 'Lê Thị Bà');
  await page.fill('#nb-lhkc .lhkc-qh', 'Bà ngoại');
  await page.fill('#nb-lhkc .lhkc-dt', '0909 777 000');
  await page.fill('#nb-ph', 'Lê Văn Bố Thử');
  await page.fill('#nb-sdt', '0977 666 111');
  await page.fill('#nb-qh', 'Bố');
  await page.fill('#nb-ph2', 'Phan Thị Mẹ Thử');
  await page.fill('#nb-sdt2', '0977 666 222');
  await page.fill('#nb-qh2', 'Mẹ');
  await page.click('#nb-luu');
  await page.waitForSelector('#nb-xong', { timeout: 8000 });
  const phieu = await page.locator('.modal').innerText();
  check('phiếu kết quả có tài khoản của phụ huynh thứ hai', await page.locator('#nb-tk2').count() === 1, phieu.slice(0, 300));
  check('và hiện mật khẩu tạm của CẢ HAI phụ huynh',
    (phieu.match(/\b[a-z]{5}[2-9]{3}\b/g) || []).length === 2, phieu.slice(0, 400));
  const moi = (((await req('GET', '/api/admin/students?classId=c1', { cookie: BGH })).data || [])
    .find(s => s.name === 'Lê Minh Thử') || {});
  check('máy chủ: dân tộc, số định danh, tiền sử bệnh đã lưu (nhóm máu để trống — C1)',
    moi.ethnicity === 'Mường' && !moi.bloodType && moi.soDinhDanh === '001223009999' && moi.tienSuBenh === 'Dị ứng sữa bò',
    [moi.ethnicity, moi.bloodType, moi.soDinhDanh, moi.tienSuBenh]);
  check('máy chủ: liên hệ khẩn cấp và hai phụ huynh Bố / Mẹ đã lưu',
    (moi.lienHeKhanCap || []).length === 1 && JSON.stringify((moi.parents || []).map(p => p.quanHe).sort()) === '["Bố","Mẹ"]',
    [moi.lienHeKhanCap, moi.parents]);
  await page.click('#nb-xong');
  await page.waitForTimeout(800);

  // -- Thẻ Sửa bé: danh sách phụ huynh + nút thêm phụ huynh (văn phòng mở được phiếu)
  await page.locator('.modal .list-row', { hasText: 'Lê Minh Thử' }).first().locator('button', { hasText: 'Sửa' }).click();
  await page.waitForSelector('#ad-hs-ph', { timeout: 5000 });
  const dsPh = await page.locator('#ad-hs-ph').innerText();
  check('thẻ Sửa bé liệt kê phụ huynh kèm quan hệ', /Bố/.test(dsPh) && /Mẹ/.test(dsPh), dsPh);
  check('và có nút "Thêm phụ huynh"', await page.locator('#ad-hs-them-ph').count() === 1);
  await page.click('#ad-hs-them-ph');
  await page.waitForSelector('#tk-ph-ten', { timeout: 5000 });
  check('nút ấy mở phiếu thêm phụ huynh cho đúng bé', /Lê Minh Thử/.test(await page.locator('.modal-title').innerText()));
  await page.evaluate(() => UI.closeModal());

  check('không có lỗi chạy mã nào trên trang', loi.length === 0, loi);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
