// Bài canh MÀN KẾ HOẠCH CỦA BÉ trên trình duyệt thật — góp ý 06/10, mục 6.
//
// Chạy bằng:  node test/ke-hoach-ba-chuong-trinh-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
// Phần máy chủ có `test/ke-hoach-ba-chuong-trinh.test.mjs`. Bài này đo những gì
// chỉ trình duyệt trả lời được:
//   1. Ba tab chương trình; Montessori chọn LĨNH VỰC trước rồi mới tới bài.
//   2. Chọn một bé → chỉ thẻ của bé đó; bấm bài ra đúng chữ "Dạy mới"; Lưu nháp
//      giữ lại sau khi mở lại màn.
//   3. Gửi quản lý duyệt từ màn của cô; phần Cambridge vẫn mở ở tab bên cạnh.
//   4. Quản lý: màn duyệt theo ngày / tháng / năm, gửi lại bắt buộc lý do; cô
//      mở lại màn thấy đúng lý do.
//   5. Kho bài học có lọc lứa và ô tích lứa khi sửa bài.
//   6. Khổ điện thoại: không cuộn ngang.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem,
  CHROMIUM, tatBannerMoiCai, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-ba-ct-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3347), dir: DIR });

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
  await page.waitForTimeout(1200);
}
const moMan = async (hash) => {
  await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
};
const chu = () => page.locator('#view').innerText();

try {
  // Đổi mật khẩu tạm của quản trị một lần để đăng nhập như người thật.
  await dangNhap('hieutruong', mkQT);
  await page.evaluate(async () => { await API.post('/api/auth/set-new-password', { newPassword: 'quantri2026' }); });

  await dangNhap('giaovien', '123456');   // t1 — cô phụ trách nhóm c1
  await moMan('#/kehoachbe');

  // =========================================================================
  console.log('\n[1] Ba tab chương trình; Montessori chọn lĩnh vực trước');
  let s1Bai;
  {
    const tab = await page.locator('#kb-ct [data-ct]').allInnerTexts();
    check('ba tab: Montessori & Kỹ năng sống / Cambridge / Thể chất',
      tab.map(t => t.trim()).join(' | ') === 'Montessori & Kỹ năng sống | Cambridge | Thể chất', tab);
    check('cô phụ trách nhóm mở ra là tab Montessori', (await page.locator('#kb-ct [data-ct="chu-nhiem"]').getAttribute('class')) === 'active');
    const goc = await page.locator('#kb-goc option').allInnerTexts();
    check('ô Lĩnh vực sổ đủ năm lĩnh vực Montessori', goc.length === 5 && goc.includes('Giác quan'), goc);
    await page.selectOption('#kb-goc', 'giac-quan');
    await page.waitForTimeout(300);
    const hien = await page.locator('.kb-vung[data-goc="giac-quan"]').first().isVisible();
    const an = await page.locator('.kb-vung[data-goc="toan"]').first().isVisible();
    check('chỉ hiện bài của lĩnh vực đang chọn', hien && !an, { hien, an });
    check('nhãn lứa của bé hiện trên ô lĩnh vực', /bài cho lứa \d–\d tuổi/.test(await page.locator('.kb-vung[data-goc="giac-quan"]').first().innerText()));
  }

  // =========================================================================
  console.log('\n[2] Chọn một bé, bấm bài ra "Dạy mới", Lưu nháp giữ lại');
  {
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    check('chọn một bé thì chỉ còn thẻ của bé đó', await page.locator('.kb-vung[data-goc="giac-quan"]').count() === 1);
    check('nút đổi chữ thành Lưu nháp / Gửi quản lý duyệt (cho một bé)',
      /Lưu nháp$/.test((await page.locator('#kb-luu').innerText()).trim()) && /Gửi quản lý duyệt$/.test((await page.locator('#kb-gui').innerText()).trim()));
    const chip = page.locator('.kb-vung[data-goc="giac-quan"] .kb-bai').first();
    s1Bai = await chip.getAttribute('data-bai');
    await chip.click();
    check('bấm một lần ra đúng chữ "Dạy mới"', /· Dạy mới$/.test((await chip.innerText()).trim()), await chip.innerText());
    await page.click('#kb-luu');
    await page.waitForTimeout(1500);
    await moMan('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.selectOption('#kb-goc', 'giac-quan');
    await page.waitForTimeout(400);
    const lai = page.locator(`.kb-bai[data-be="s1"][data-bai="${s1Bai}"]`);
    check('mở lại màn: bài vẫn tích "Dạy mới"', (await lai.getAttribute('data-nhan')) === 'hoc-moi', await lai.getAttribute('data-nhan'));
  }

  // =========================================================================
  console.log('\n[3] Gửi quản lý duyệt phần Montessori; tab Cambridge vẫn soạn được');
  {
    await page.click('#kb-gui');
    await page.waitForTimeout(1500);
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(400);
    check('thẻ bé hiện "Chờ quản lý duyệt"', /Chờ quản lý duyệt/.test(await chu()));
    check('phần đang chờ duyệt thì không còn chip để bấm', await page.locator('.kb-vung .kb-bai').count() === 0);
    await page.click('#kb-ct [data-ct="nuoc-ngoai"]');
    await page.waitForTimeout(500);
    check('tab Cambridge: một lĩnh vực nên không cần ô chọn lĩnh vực', await page.locator('#kb-goc').count() === 0);
    check('tab Cambridge VẪN có bài để tích (phần này còn nháp)', await page.locator('.kb-vung[data-goc="cambridge"] .kb-bai').count() > 0);
  }

  // =========================================================================
  console.log('\n[4] Quản lý: màn duyệt theo ngày / tháng / năm; gửi lại bắt buộc lý do');
  {
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/kehoachbe/duyet');
    check('mở thẳng màn duyệt từ địa chỉ #/kehoachbe/duyet', await page.locator('#kb-dy-ky').count() === 1);
    const ky = await page.locator('#kb-dy-ky option').allInnerTexts();
    check('xem theo Ngày / Tháng / Năm gửi', ky.join('|') === 'Ngày gửi|Tháng gửi|Năm gửi', ky);
    check('thấy phần Montessori của bé s1 đang chờ', /Nguyễn Bảo An[\s\S]*Montessori/.test(await chu()), (await chu()).slice(0, 400));
    await page.selectOption('#kb-dy-ky', 'ngay');
    await page.waitForTimeout(800);
    check('đổi sang xem theo ngày: ô ngày hiện ra, vẫn thấy phần hôm nay', (await page.locator('#kb-dy-moc').getAttribute('type')) === 'date'
      && /Nguyễn Bảo An/.test(await chu()));
    await page.locator('[data-tra-phan]').first().click();
    await page.waitForTimeout(400);
    await page.click('#kb-tra-luu');
    await page.waitForTimeout(400);
    check('bỏ trống lý do thì KHÔNG gửi lại được (hộp vẫn mở)', await page.locator('#kb-tra-luu').count() === 1);
    await page.fill('#kb-ykien', 'Cô ghi rõ thêm bài cho lĩnh vực Toán giúp mình');
    await page.click('#kb-tra-luu');
    await page.waitForTimeout(1500);
    check('gửi lại xong không còn phần chờ', /Không có phần kế hoạch nào chờ duyệt/.test(await chu()), (await chu()).slice(0, 300));
  }

  // =========================================================================
  console.log('\n[5] Kho bài học: lọc lứa, ô tích lứa khi sửa bài');
  {
    await page.click('#kb-tabs [data-tab="baihoc"]');
    await page.waitForTimeout(1000);
    check('có ô lọc lứa', await page.locator('#kb-bh-loc').count() === 1);
    const lua = await page.locator('#kb-bh-loc option').allInnerTexts();
    check('lọc được ba lứa 3–4, 4–5, 5–6', lua.join('|') === 'Mọi lứa|3–4 tuổi|4–5 tuổi|5–6 tuổi', lua);
    // textContent, không innerText: nhãn mục viết hoa bằng CSS.
    check('kho chia theo chương trình', /Montessori & Kỹ năng sống[\s\S]*Cambridge[\s\S]*Thể chất/.test(await page.locator('#view').textContent()));
    await page.locator('[data-sua-bai]').first().click();
    await page.waitForTimeout(400);
    check('hộp sửa bài có ba ô tích lứa', await page.locator('.kb-bh-lua').count() === 3);
    await page.locator('.kb-bh-lua[value="5-6"]').check();
    await page.click('#kb-bh-luu');
    await page.waitForTimeout(1200);
    check('lưu xong bài mang lứa 5–6', /5–6 tuổi/.test(await chu()));
  }

  // =========================================================================
  console.log('\n[6] Cô mở lại màn: thấy phần bị gửi lại kèm lý do; khổ điện thoại không cuộn ngang');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/kehoachbe');
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    const t = await chu();
    check('thẻ bé hiện "Quản lý gửi lại" kèm đúng lý do', /Quản lý gửi lại: Cô ghi rõ thêm bài cho lĩnh vực Toán/.test(t), t.slice(0, 400));
    check('phần bị gửi lại thì cô sửa tiếp được (chip bấm được)', await page.locator('.kb-bai').count() > 0);
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('không cuộn ngang trên khổ điện thoại', tran <= 1, `tràn ${tran}px`);
  }

  check('không có lỗi JavaScript trong suốt quá trình', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
