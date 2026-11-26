// Bài canh giao diện phía nhà trường (cô, văn phòng, chức vụ) — kiểm thử thay
// trường 26/11 (Đ261d). Trình duyệt thật, khổ điện thoại 390px.
//
// Chạy bằng:  node test/phan-hoi-2611-truong-giao-dien.test.mjs
//
//   R2-L4  Duyệt đơn: đổi lựa chọn thì câu tự điền "Gửi đơn sau 7 giờ sáng" mất.
//   R2-L5  Văn phòng Cơ sở 1 không thấy nhóm Cơ sở 2 ở ô Nhóm của Nhật ký ngày.
//   R2-C3  Bảo vệ cổng không đọc câu "chốt sổ vắng" ở màn Điểm danh.
//   R1-B11 Cài đặt của Kế toán không bày ba lối vào màn họ không mở được.
//   R1-B14 Dải tab Quản trị trên điện thoại cuộn tới tab đang chọn.
//   R2-L7  Ngày đã qua / Chủ nhật không còn dòng "x bé chưa có điểm danh";
//          thẻ "Ngày này chưa tới" không nói "chỉ không sửa được nữa".
//   R2-L10 Hộp ghi giờ về không đóng khi giờ về sớm hơn giờ vào.
//   R2-C1  Trang chủ cô nước ngoài ghi "Cô nước ngoài …", không "Cô phụ trách".
//   R2-C2  "Đã lưu Ngủ trưa cho N bé" chỉ đếm bé có ghi.
//   R4-B8  Lời báo đỏ "Vui lòng tích chọn…" mất khi gửi lại được.
//   Bàn phím  Ô cân nặng gõ "15,5" là 15,5 kg (không thành 155) — lẻ và cả nhóm.
//   R2-L8  Ngày trường nghỉ, lưới ảnh bé ở Trang chủ ghi rõ "Trường nghỉ".
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri,
  CHROMIUM, tatBannerMoiCai, batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('2611-truong-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const HOM = HOM_NAY();
const ngayCach = (n) => new Date(Date.parse(`${HOM}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
function ngayThuongTruoc(soNgay) {
  for (let n = soNgay; ; n++) {
    const d = ngayCach(-n);
    const thu = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (thu >= 1 && thu <= 5) return d;
  }
}
function chuNhatTruoc() {
  for (let n = 1; ; n++) if (new Date(`${ngayCach(-n)}T00:00:00Z`).getUTCDay() === 0) return ngayCach(-n);
}
// Hôm nay bé s1 có mặt, giờ vào 23:59 — giờ về nào cũng sớm hơn (ca R2-L10).
{
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s1', HOM);
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
             VALUES ('att_l10_s1', 's1', ?, 'present', '23:59', NULL, '', 't1')`).run(HOM);
  c.close();
}
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk = {
  vanphong1: taoQuanTri(DIR, 'Văn Phòng Một', 'vanphong1'),
  baove1: taoQuanTri(DIR, 'Bảo Vệ Một', 'baove1'),
  ketoan1: taoQuanTri(DIR, 'Kế Toán Một', 'ketoan1'),
};
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'baove1', 'cs1');
datChucVu(DIR, 'baove1', 'baove');
datChucVu(DIR, 'ketoan1', 'ketoan');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7154), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function doiMatKhau(u, mkTam) {
  const d = await login(u, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await doiMatKhau('hieutruong', mkQT);
for (const [u, m] of Object.entries(mk)) await doiMatKhau(u, m);
const PH = (await login('phuhuynh', '123456')).cookie;

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
page.on('dialog', d => { d.accept().catch(() => {}); });

async function dangNhap(u, p = '123456') {
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
  await page.waitForTimeout(800);
};
const cacToast = () => page.evaluate(() => [...document.querySelectorAll('#toast-zone .toast')]
  .map(t => ({ chu: t.textContent, loi: t.classList.contains('error') })));

try {
  // =========================================================================
  console.log('\n[1] R2-L4 — duyệt đơn: đổi lựa chọn thì câu tự điền mất');
  {
    const ngay = ngayThuongTruoc(40);
    const tao = await req('POST', '/api/leave', {
      cookie: PH, body: { studentId: 's1', fromDate: ngay, toDate: ngay, reason: 'Con về quê (thử duyệt)' },
    });
    check('đơn tạo được', tao.status === 201, tao);
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/leave');
    await page.locator(`[onclick*="openReview('${tao.data.id}','approved')"]`).click();
    await page.waitForSelector('.lv-ngay');
    const lyDo = page.locator('.lv-ngay .lv-ng-lydo');
    check('đối chứng — máy gợi ý không phép, lý do "Gửi đơn sau 7 giờ sáng"',
      /sau 7 giờ sáng/.test(await lyDo.inputValue()) && !(await page.locator('.lv-ngay .lv-ng-phep').isChecked()),
      await lyDo.inputValue());
    await page.locator('.lv-ngay .lv-ng-phep').check();
    check('tích "Nghỉ có phép" thì câu tự điền mất', (await lyDo.inputValue()) === '', await lyDo.inputValue());
    await page.locator('.lv-ngay .lv-ng-phep').uncheck();
    check('bỏ tích (về đúng như gợi ý) thì câu tự điền trở lại', /sau 7 giờ sáng/.test(await lyDo.inputValue()));
    await page.locator('.lv-ngay .lv-ng-phep').check();
    await page.locator('.lv-ngay .lv-ng-hoan').selectOption('co');
    check('có phép + hoàn tiền: ô lý do trống', (await lyDo.inputValue()) === '');
    await page.locator('#modal-overlay button', { hasText: 'Duyệt đơn' }).click();
    await page.waitForTimeout(1200);
    const don = ((await req('GET', '/api/leave', { cookie: PH })).data || []).find(l => l.id === tao.data.id) || {};
    const d = (don.theoNgay || [])[0] || {};
    check('gia đình đọc "có phép · được hoàn", không kèm câu 7 giờ',
      d.coPhep === 'co' && d.duocHoan === 'co' && !d.lyDo, d);
  }

  // =========================================================================
  console.log('\n[2] R1-B14 — dải tab Quản trị cuộn tới tab đang chọn');
  {
    await moMan('#/admin/namhoc');
    const vt = await page.evaluate(() => {
      const dai = document.getElementById('ad-tabs');
      const tab = dai && dai.querySelector('button.active');
      if (!dai || !tab) return null;
      const a = dai.getBoundingClientRect(); const b = tab.getBoundingClientRect();
      return { tab: tab.textContent.trim(), trai: b.left - a.left, phai: a.right - b.right, cuon: dai.scrollLeft, rong: dai.scrollWidth > dai.clientWidth };
    });
    check('đối chứng — dải tab dài hơn màn hình', vt && vt.rong, vt);
    check('tab đang chọn nằm trọn trong khung nhìn của dải', vt && vt.trai >= 0 && vt.phai >= 0, vt);
  }

  // =========================================================================
  console.log('\n[3] R2-L5 — văn phòng Cơ sở 1 mở Nhật ký ngày');
  {
    await dangNhap('vanphong1', 'quantri2026');
    await moMan('#/nhatky');
    const ten = await page.locator('#nk-nhom option').allInnerTexts();
    check('ô Nhóm có nhóm của Cơ sở 1', ten.some(t => /Chồi 2/.test(t)), ten);
    check('ô Nhóm KHÔNG có Mầm 1 (Cơ sở 2)', !ten.some(t => /Mầm 1/.test(t)), ten);
  }

  // =========================================================================
  console.log('\n[4] R2-C3 — bảo vệ cổng mở Điểm danh');
  {
    await dangNhap('baove1', 'quantri2026');
    await moMan('#/attendance');
    const chu = await page.locator('#view').innerText();
    check('đối chứng — màn Điểm danh mở', /Điểm danh/.test(chu), chu.slice(0, 200));
    check('không có nút chốt sổ', (await page.locator('#att-chot-vang').count()) === 0);
    check('và không đọc câu "chốt sổ vắng"', !/chốt sổ vắng/i.test(chu), chu.slice(0, 400));
  }

  // =========================================================================
  console.log('\n[5] R1-B11 — Cài đặt của Kế toán');
  {
    await dangNhap('ketoan1', 'quantri2026');
    await moMan('#/settings');
    const chu = await page.locator('#view').innerText();
    for (const dong of ['Tài khoản & phân quyền', 'Nhóm lớp, cô, nhập danh sách', 'Tài khoản phụ huynh']) {
      check(`không bày dòng "${dong}"`, !chu.includes(dong), chu.slice(0, 300));
    }
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/settings');
    const chuQT = await page.locator('#view').innerText();
    check('đối chứng — ban giám hiệu vẫn thấy đủ ba dòng',
      ['Tài khoản & phân quyền', 'Nhóm lớp, cô, nhập danh sách', 'Tài khoản phụ huynh'].every(x => chuQT.includes(x)));
  }

  // =========================================================================
  console.log('\n[6] R2-L7 — cô xem lại ngày đã qua / Chủ nhật / ngày mai');
  {
    await dangNhap('giaovien');
    await moMan('#/attendance');
    for (const [ten, ngay] of [['Chủ nhật', chuNhatTruoc()], ['ngày thường đã qua, cô chưa chấm', ngayThuongTruoc(40)]]) {
      await page.evaluate((d) => App.views.attendance.setDate(d), ngay);
      await page.waitForTimeout(1200);
      const chu = await page.locator('#view').innerText();
      check(`${ten} (${ngay}): đối chứng — thẻ "Ngày này đã khoá"`, /Ngày này đã khoá/.test(chu), chu.slice(0, 200));
      check(`${ten}: không có dòng "chưa có điểm danh sau … Cần văn phòng gọi"`,
        (await page.locator('#att-co-can-goi').count()) === 0 && !/Cần văn phòng gọi/.test(chu), chu.slice(0, 400));
    }
    await page.evaluate((d) => App.views.attendance.setDate(d), ngayCach(1));
    await page.waitForTimeout(1200);
    const mai = await page.locator('#view').innerText();
    check('ngày mai: thẻ "Ngày này chưa tới"', /Ngày này chưa tới/.test(mai), mai.slice(0, 300));
    check('…không nói "chỉ không sửa được nữa"', !/không sửa được nữa/.test(mai), mai.slice(0, 400));
  }

  // =========================================================================
  console.log('\n[7] R2-L10 — giờ về sớm hơn giờ vào: hộp còn mở để cô sửa');
  {
    await page.evaluate((d) => App.views.attendance.setDate(d), HOM);
    await page.waitForSelector('#att-dong-s1', { timeout: 8000 });
    await page.locator('#att-dong-s1 .dd-viec-khac').click();
    await page.waitForSelector('#att-vk-ve', { timeout: 5000 });
    await page.click('#att-vk-ve');
    await page.waitForSelector('#att-rv-gio', { timeout: 5000 });
    await page.fill('#att-rv-gio', '00:30');
    await page.click('#att-rv-khong');
    await page.waitForTimeout(1200);
    const bao = (await cacToast()).map(t => t.chu).join(' | ');
    check('đối chứng — máy chủ từ chối giờ về sớm hơn giờ vào', /sớm hơn giờ con tới lớp/.test(bao), bao);
    check('hộp ghi giờ về VẪN MỞ, ô giờ còn đó', (await page.locator('#att-rv-gio').count()) === 1);
    check('…và còn giờ cô vừa gõ', (await page.locator('#att-rv-gio').inputValue().catch(() => '')) === '00:30');
    check('…và nút ghi bấm lại được', !(await page.locator('#att-rv-khong').isDisabled().catch(() => true)));
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[8] R4-B8 — gửi lại được thì lời báo đỏ cũ mất');
  {
    await moMan('#/notifications');
    await page.click('#btn-new-notif');
    await page.waitForSelector('#nt-title');
    await page.fill('#nt-title', 'Thử gửi cho vài gia đình');
    await page.fill('#nt-body', 'Nội dung thử');
    await page.click('#nt-aud [data-aud="chon"]');
    await page.waitForSelector('.nt-gd-be', { timeout: 8000 });
    await page.locator('#modal-overlay button', { hasText: 'Gửi thông báo' }).click();
    await page.waitForTimeout(300);
    check('đối chứng — chưa tích ai thì có lời báo đỏ',
      (await cacToast()).some(t => t.loi && /tích chọn/.test(t.chu)), await cacToast());
    await page.locator('.nt-gd-be').first().check();
    await page.locator('#modal-overlay button', { hasText: 'Gửi thông báo' }).click();
    await page.waitForTimeout(800);
    const t = await cacToast();
    check('đã gửi', t.some(x => /Đã gửi thông báo/.test(x.chu)), t);
    check('lời báo đỏ "Vui lòng tích chọn…" không còn đứng cạnh', !t.some(x => x.loi && /tích chọn/.test(x.chu)), t);
  }

  // =========================================================================
  console.log('\n[9] Bàn phím — ô cân đo nhận "15,5" là 15,5');
  {
    await moMan('#/health');
    await page.click('#btn-can-do-nhom');
    await page.waitForSelector('.ht-cd[data-be="s1"][data-cot="weight"]');
    await page.locator('.ht-cd[data-be="s1"][data-cot="height"]').pressSequentially('100');
    await page.locator('.ht-cd[data-be="s1"][data-cot="weight"]').pressSequentially('15,5');
    const bmi = await page.locator('.ht-cd-hang[data-hang="s1"] .ht-cd-bmi').innerText();
    check('cả nhóm: ô BMI tính từ 15,5 kg (BMI 15.5)', /15[.,]5/.test(bmi), bmi);
    const gui = page.waitForResponse(r => r.url().includes('/api/health/can-do-nhom'));
    await page.click('#ht-cd-luu');
    const r1 = await gui;
    if (r1.status() === 409) {
      await page.evaluate(() => App.views.health.luuCanDoNhom(true));
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(800);
    const hs1 = (await page.evaluate(() => API.get('/api/health?studentId=s1'))).records || [];
    check('cả nhóm: máy chủ ghi 15.5 kg (không phải 155)', hs1.some(x => Number(x.weight) === 15.5), hs1.map(x => x.weight));

    await page.evaluate(() => App.views.health.openCreate('s3'));
    await page.waitForSelector('#ht-weight');
    await page.fill('#ht-title', 'Cân đo thử dấu phẩy');
    await page.locator('#ht-height').pressSequentially('98,5');
    await page.locator('#ht-weight').pressSequentially('14,2');
    const gui2 = page.waitForResponse(r => /\/api\/health$/.test(new URL(r.url()).pathname));
    await page.locator('#modal-overlay button', { hasText: 'Lưu ghi nhận' }).click();
    const r2 = await gui2;
    if (r2.status() === 409) {
      await page.evaluate(() => App.views.health.submitCreate(true));
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(800);
    const hs2 = (await page.evaluate(() => API.get('/api/health?studentId=s3'))).records || [];
    check('hộp lẻ: máy chủ ghi 98.5 cm và 14.2 kg',
      hs2.some(x => Number(x.weight) === 14.2 && Number(x.height) === 98.5), hs2.map(x => [x.height, x.weight]));
  }

  // =========================================================================
  console.log('\n[10] R2-C1 — trang chủ cô nước ngoài');
  {
    await dangNhap('giaovien.nn');
    const chu = await page.locator('#view').innerText();
    check('ghi "Cô nước ngoài …"', /Cô nước ngoài/.test(chu), chu.slice(0, 300));
    check('không gọi là "Cô phụ trách"', !/Cô phụ trách/.test(chu), chu.slice(0, 300));
  }

  // =========================================================================
  console.log('\n[11] R2-C2 — "Đã lưu Ngủ trưa cho N bé" chỉ đếm bé có ghi');
  {
    await dangNhap('giaovien4');
    await moMan('#/nhatky');
    await page.click('.nk-phan [data-phan="ngu"]');
    await page.waitForSelector('.nk-o[data-truong="nguTuLuc"]');
    const tu = page.locator('.nk-o[data-truong="nguTuLuc"]').first();
    const den = page.locator('.nk-o[data-truong="nguDenLuc"]').first();
    await tu.selectOption({ index: 2 });
    await den.selectOption({ index: 5 });
    const soBe = await page.locator('.nk-o[data-truong="nguTuLuc"]').count();
    check('đối chứng — nhóm có hơn một bé', soBe > 1, soBe);
    await page.click('#nk-luu');
    await page.waitForTimeout(1000);
    const bao = (await cacToast()).map(t => t.chu).join(' | ');
    check('câu báo nói "cho 1 bé"', /Đã lưu Ngủ trưa cho 1 bé/.test(bao), bao);
  }

  // =========================================================================
  console.log('\n[12] R2-L8 — ngày trường nghỉ, lưới ảnh bé ghi rõ "Trường nghỉ"');
  {
    const r = await req('POST', '/api/leave/lich-nghi', {
      cookie: QT, body: { ten: 'Nghỉ thử', tuNgay: HOM, denNgay: HOM, loai: 'khac', campusId: 'cs1' },
    });
    check('đặt được đợt nghỉ hôm nay cho Cơ sở 1', r.status === 201, r);
    await dangNhap('giaovien');
    await page.waitForSelector('#hn-panel', { timeout: 8000 });
    await page.waitForTimeout(500);
    const panel = await page.locator('#hn-panel').innerText();
    const chuThich = await page.locator('#hn-panel .hn-chu-thich').innerText().catch(() => '');
    check('ngay trên lưới có dòng "Trường nghỉ — Nghỉ thử"', /Trường nghỉ — Nghỉ thử/.test(panel), panel.slice(0, 400));
    check('chú thích chấm xám nói "Trường nghỉ", không "Chưa điểm danh"',
      /Trường nghỉ/.test(chuThich) && !/Chưa điểm danh/.test(chuThich), chuThich);
    check('khổ 390px: không cuộn ngang', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
