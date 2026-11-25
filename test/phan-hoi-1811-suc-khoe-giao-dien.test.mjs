// Bài canh GIAO DIỆN cho góp ý Sức khỏe của trường ngày 18/11 (Đ260e).
// Bấm trên trình duyệt thật, điện thoại 390px.
//
// Chạy bằng:  node test/phan-hoi-1811-suc-khoe-giao-dien.test.mjs
//
//   1. Hộp "Cân đo nhóm": mỗi bé có "Lần đo gần nhất"; ô BMI tô màu ngay khi
//      cô gõ (xanh / cam / đỏ theo bảng WHO, có chữ đi kèm); chiều cao thấp
//      hơn lần trước thì viền cam + dòng nhắc; không tràn ngang ở 390px.
//   2. Lưu lần hai trong tháng: hộp hỏi lại "Tháng này đã gửi số đo…" — Thôi
//      thì không đổi gì; Sửa lại thì sửa đúng dòng cũ, gia đình không nhận
//      thêm tin.
//   3. Hộp nhập lẻ: thấy BMI khi gõ, và cũng hỏi lại khi tháng đã có số.
//   4. Gia đình: ô BMI có màu, dòng chữ mức + câu gợi ý, chấm màu ở "Các lần
//      cân đo"; không tràn ngang.
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
  GOC, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const B = createRequire(import.meta.url)(path.join(GOC, 'public', 'js', 'bmi-who.js'));
const DIR = thuMucTam('phan-hoi-1811-suc-khoe-gd');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5320), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

// Màu thật của ba biến CSS (giao diện sáng): --success, --warning, --danger.
const VIEN = { trong: 'rgb(16, 185, 129)', duoi: 'rgb(245, 158, 11)', tren: 'rgb(239, 68, 68)' };

const browser = await chromium.launch({ executablePath: CHROMIUM });
const loiJs = [];
async function moTrang() {
  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => loiJs.push(e.message));
  return page;
}
async function dangNhap(page, u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}
const tranNgang = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const hang = (be) => `.ht-cd-hang[data-hang="${be}"]`;
const oBmi = (page, be) => page.locator(`${hang(be)} .ht-cd-bmi`).evaluate(e => ({
  muc: e.dataset.mucBmi, chu: e.innerText.replace(/\s+/g, ' ').trim(), vien: getComputedStyle(e).borderTopColor,
}));

try {
  const GV = (await login('giaovien', '123456')).cookie;    // cô Chồi 2 (c1)
  const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1
  const nhom0 = (await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach;
  const be = Object.fromEntries(nhom0.map(b => [b.studentId, b]));
  const mucMay = (sid, cao, nang) => (B.phanLoai({ height: cao, weight: nang, date: NGAY }, be[sid]) || {}).muc;

  // =========================================================================
  console.log('\n[1] Hộp "Cân đo nhóm": lần đo gần nhất, ô BMI tô màu khi gõ, nhắc khi thấp hơn');
  const page = await moTrang();
  await dangNhap(page, 'giaovien', '123456');
  await page.goto(`${sv.BASE}/#/health`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-can-do-nhom', { timeout: 8000 });
  await page.click('#btn-can-do-nhom');
  await page.waitForSelector('.ht-cd-hang', { timeout: 5000 });
  {
    const truoc = await page.locator(`${hang('s1')} .ht-cd-truoc`).innerText();
    const t = be.s1.doTruocThang;
    check('mỗi bé có dòng "Lần đo gần nhất" mang số của lần trước',
      /Lần đo gần nhất/.test(truoc) && truoc.includes(`${t.height} cm`) && truoc.includes(`${t.weight} kg`), truoc);
    check('đủ một dòng cho mỗi bé của nhóm', (await page.locator('.ht-cd-hang').count()) === nhom0.length);

    // Ba mức — giá trị máy tính bằng chính bảng WHO, và phải đúng là ba mức khác nhau.
    const CA = [['duoi', 100, 12], ['tren', 100, 22], ['trong', 100, 15.5]];
    check('đối chứng — ba cặp số đúng là ba mức theo bảng WHO cho bé s4',
      CA.every(([m, c, n]) => mucMay('s4', c, n) === m), CA.map(([, c, n]) => mucMay('s4', c, n)));
    const CHU = { trong: 'trong ngưỡng', duoi: 'dưới ngưỡng', tren: 'trên ngưỡng' };
    for (const [m, c, n] of CA) {
      await page.fill(`${hang('s4')} [data-cot="height"]`, String(c));
      await page.fill(`${hang('s4')} [data-cot="weight"]`, String(n));
      const o = await oBmi(page, 's4');
      const so = (n / ((c / 100) ** 2)).toFixed(1);
      check(`gõ ${c} cm / ${n} kg → ô BMI ${so}, "${CHU[m]}", viền đúng màu`,
        o.muc === m && o.chu.includes(so) && o.chu.includes(CHU[m]) && o.vien === VIEN[m], o);
    }
    await page.fill(`${hang('s4')} [data-cot="weight"]`, '');
    const trong = await oBmi(page, 's4');
    check('xoá cân nặng → ô BMI về trống, không màu', trong.muc === '' && !/\d/.test(trong.chu), trong);
    await page.fill(`${hang('s4')} [data-cot="weight"]`, '15.5');

    // Chiều cao thấp hơn lần trước.
    const nhac = page.locator(`${hang('s1')} .ht-cd-nhac`);
    check('đối chứng — chưa gõ thì chưa nhắc', !(await nhac.isVisible()));
    await page.fill(`${hang('s1')} [data-cot="height"]`, String(be.s1.doTruocThang.height - 5));
    await page.fill(`${hang('s1')} [data-cot="weight"]`, '16');
    const vienCao = await page.locator(`${hang('s1')} [data-cot="height"]`).evaluate(e => getComputedStyle(e).borderTopColor);
    check('chiều cao THẤP HƠN lần trước → viền cam + dòng nhắc',
      (await nhac.isVisible()) && /Thấp hơn lần trước — cô xem lại có nhầm bé không/.test(await nhac.innerText()) && vienCao === VIEN.duoi,
      [await nhac.isVisible(), vienCao]);
    await page.fill(`${hang('s1')} [data-cot="height"]`, String(be.s1.doTruocThang.height + 2));
    check('gõ lại số cao hơn → hết nhắc', !(await nhac.isVisible()));

    const tran = await page.evaluate(() => {
      const m = document.querySelector('#modal-overlay .modal');
      return { modal: m.scrollWidth - m.clientWidth, trang: document.documentElement.scrollWidth - window.innerWidth };
    });
    check('390px: hộp cân đo nhóm không tràn ngang', tran.modal <= 0 && tran.trang <= 0, tran);
    const rong = await page.locator(`${hang('s1')} [data-cot="height"]`).evaluate(e => e.getBoundingClientRect().width);
    check('ô nhập vẫn đủ rộng để gõ (≥ 70px)', rong >= 70, rong);

    await page.click('#ht-cd-luu');
    await page.waitForTimeout(900);
    check('lượt đầu trong tháng: lưu thẳng, không hỏi lại', (await page.locator('#modal-overlay').count()) === 0);
    const sau = (await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach;
    const s1 = sau.find(b => b.studentId === 's1');
    check('máy chủ có số tháng này của s1', s1.doTrongThang && s1.doTrongThang.height === be.s1.doTruocThang.height + 2, s1.doTrongThang);
  }

  // =========================================================================
  console.log('\n[2] Lưu lần hai trong tháng: hộp hỏi lại, Thôi / Sửa lại');
  {
    const tin = async () => ((await req('GET', '/api/notifications/rieng-be', { cookie: PH })).data || [])
      .filter(n => n.laRiengBe && n.loai === 'suc-khoe').length;
    const tin0 = await tin();
    await page.waitForSelector('#btn-can-do-nhom', { timeout: 8000 });
    await page.click('#btn-can-do-nhom');
    await page.waitForSelector('.ht-cd-hang', { timeout: 5000 });
    const caoCu = be.s1.doTruocThang.height + 2;
    check('số đã gửi tháng này được điền sẵn',
      (await page.inputValue(`${hang('s1')} [data-cot="height"]`)) === String(caoCu));
    const moi = caoCu + 0.5;
    await page.fill(`${hang('s1')} [data-cot="height"]`, String(moi));
    await page.click('#ht-cd-luu');
    await page.waitForSelector('#ht-cd-hoi:not([hidden])', { timeout: 4000 });
    const hoi = await page.locator('#ht-cd-hoi').innerText();
    check('hộp hỏi lại: "Tháng này đã gửi số đo cho gia đình của 2 bé … Cô muốn sửa lại số liệu?"',
      /Tháng này đã gửi số đo cho gia đình của 2 bé/.test(hoi) && /Cô muốn sửa lại số liệu\?/.test(hoi), hoi);
    check('hộp có hai nút Sửa lại / Thôi',
      (await page.locator('#ht-cd-sua-lai').innerText()).trim() === 'Sửa lại' && (await page.locator('#ht-cd-thoi').innerText()).trim() === 'Thôi');
    check('số cô vừa gõ vẫn còn nguyên trong hộp', (await page.inputValue(`${hang('s1')} [data-cot="height"]`)) === String(moi));

    await page.click('#ht-cd-thoi');
    await page.waitForTimeout(300);
    const s1a = (await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach.find(b => b.studentId === 's1');
    check('bấm Thôi: hộp hỏi đóng, máy chủ KHÔNG đổi gì',
      !(await page.locator('#ht-cd-hoi').isVisible()) && s1a.doTrongThang.height === caoCu, s1a.doTrongThang);

    await page.click('#ht-cd-luu');
    await page.waitForSelector('#ht-cd-hoi:not([hidden])', { timeout: 4000 });
    await page.click('#ht-cd-sua-lai');
    await page.waitForTimeout(900);
    const hs = (await req('GET', '/api/health?studentId=s1', { cookie: GV })).data;
    const thangNay = hs.records.filter(r => r.type === 'checkup' && r.date.startsWith(THANG) && (r.height || r.weight));
    check('bấm Sửa lại: đúng MỘT dòng cân đo tháng này, mang số mới',
      thangNay.length === 1 && thangNay[0].height === moi, thangNay);
    check('gia đình KHÔNG nhận thêm tin báo', (await tin()) === tin0, `${tin0} → ${await tin()}`);
  }

  // =========================================================================
  console.log('\n[3] Hộp nhập lẻ: thấy BMI khi gõ, hỏi lại khi tháng đã có số');
  {
    await page.evaluate(() => { App.views.health._beDangMo = 's1'; App.route(); });
    await page.waitForSelector('#btn-new-health', { timeout: 8000 });
    await page.click('#btn-new-health');
    await page.waitForSelector('#ht-height', { timeout: 5000 });
    await page.fill('#ht-title', 'Khám định kỳ tháng');
    await page.fill('#ht-height', '100');
    await page.fill('#ht-weight', '22');
    const le = await page.locator('#ht-c-bmi').innerText();
    check('gõ xong cao / nặng là thấy BMI và mức theo bảng WHO',
      /BMI 22\.0/.test(le) && new RegExp(B.MUC[mucMay('s1', 100, 22)].nhan).test(le), le);
    await page.fill('#ht-height', '106');
    await page.fill('#ht-weight', '17');
    await page.click('#modal-overlay .btn.primary.block');
    await page.waitForSelector('#ht-c-hoi:not([hidden])', { timeout: 4000 });
    check('hộp hỏi lại hiện ngay trong hộp nhập lẻ',
      /Tháng này đã gửi số đo cho gia đình của 1 bé/.test(await page.locator('#ht-c-hoi').innerText()));
    await page.click('#ht-c-sua-lai');
    await page.waitForTimeout(900);
    const hs = (await req('GET', '/api/health?studentId=s1', { cookie: GV })).data;
    const thangNay = hs.records.filter(r => r.type === 'checkup' && r.date.startsWith(THANG) && (r.height || r.weight));
    check('Sửa lại: vẫn một dòng, số 106 / 17', thangNay.length === 1 && thangNay[0].height === 106 && thangNay[0].weight === 17, thangNay);
    check('thẻ "Chỉ số gần nhất" của cô cũng có ô BMI tô màu',
      (await page.locator('.stat-box[data-muc-bmi]').count()) === 1);
  }
  await page.context().close();

  // =========================================================================
  console.log('\n[4] Gia đình: ô BMI màu + chữ mức + câu gợi ý');
  {
    const p = await moTrang();
    await dangNhap(p, 'phuhuynh', '123456');
    await p.goto(`${sv.BASE}/#/health`, { waitUntil: 'networkidle' });
    await p.waitForSelector('.stat-row', { timeout: 8000 });
    await p.waitForTimeout(400);
    const sid = await p.evaluate(() => App.currentStudent().id);
    const d = (await req('GET', `/api/health?studentId=${sid}`, { cookie: PH })).data;
    const mong = B.phanLoai(d.latestCheckup, d.thongTinBe);
    check('đối chứng — lần cân đo gần nhất của con có mức theo bảng WHO', !!mong, d.latestCheckup);
    const o = await p.locator('.stat-box[data-muc-bmi]').evaluate(e => ({
      muc: e.dataset.mucBmi, nhan: e.querySelector('.stat-label').textContent, vien: getComputedStyle(e).borderTopColor,
    }));
    check('ô BMI mang màu của đúng mức', o.muc === mong.muc && o.nhan === 'BMI' && o.vien === VIEN[mong.muc], o);
    const goiY = await p.locator('.ht-bmi-goi-y').innerText();
    check('dòng chữ mức kèm nguồn WHO (không chỉ dựa vào màu)',
      goiY.includes(mong.nhan) && /theo bảng tăng trưởng WHO/.test(goiY), goiY);
    check('kèm MỘT câu gợi ý việc cô và gia đình làm được', goiY.includes(mong.goiY), goiY);
    const cham = await p.locator('.ht-cham-bmi').count();
    check('"Các lần cân đo": mỗi lần có chấm màu kèm chữ mức', cham >= 2 && /ngưỡng/.test(await p.locator('.ht-cham-bmi').first().innerText()), cham);
    const man = await p.locator('#view').innerText();
    check('không phần trăm, không so với bé khác', !/%|bạn khác|các bé khác|xếp hạng/.test(man), man.slice(0, 300));
    const o3 = await p.locator('.stat-row .stat-box').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    check('ba ô chỉ số vẫn cùng một hàng, rộng bằng nhau', o3.length === 3 && Math.max(...o3) - Math.min(...o3) <= 1, o3);
    check('390px: màn gia đình không tràn ngang', (await tranNgang(p)) <= 0, await tranNgang(p));
    await p.context().close();
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
