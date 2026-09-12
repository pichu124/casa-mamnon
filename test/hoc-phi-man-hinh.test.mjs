// Bài canh MÀN HỌC PHÍ TRÊN TRÌNH DUYỆT THẬT — ba ô chọn và hai cái nhãn.
//
// Cần Playwright. Chạy bằng:  npm run test:hoc-phi-man-hinh
//
// VÌ SAO CÓ BÀI NÀY
//
// Đ171 ghi lại một bài học bằng ba tính năng hỏng ngay khi người dùng chạm vào:
// *bài canh gọi API KHÔNG thay được bài canh gõ đúng cách màn hình gõ.* Vòng rà
// đối kháng thứ ba lại bắt đúng bốn lỗi nằm trong khoảng cách ấy — cả bốn đều
// vô hình với `npm test` vì `npm test` không có trình duyệt nào:
//
// [1] Ô CHỌN NHÓM CỦA ĐỢT GHI SỔ liệt kê nhóm CẢ TRƯỜNG, không lọc theo cơ sở
//     của tài khoản, và chỉ in tên nhóm trần. Ba cơ sở đặt trùng tên nhóm là
//     chuyện thường, nên kế toán toàn trường thấy ba dòng GIỐNG HỆT NHAU. Bấm
//     nhầm thì máy chủ ghi đúng cái được bấm — `canAccessClass` cho qua vì Cấp 1
//     có cả ba cơ sở — và cả một nhóm ở cơ sở khác bị ghi nợ. Chuyện này không
//     lộ ra cho tới lúc gia đình hỏi, và gỡ thì phải thu hồi từng khoản một.
//
// [2] HAI Ô CHỌN BÉ (tạo khoản thu, và đặt ưu đãi) cũng chỉ in một cái tên trần.
//     Trùng họ tên trong tiếng Việt là chuyện thường — chính app thừa nhận điều
//     đó ở đường nhận bé. Khuôn dùng chung của cả kho in kèm nhóm từ lâu; riêng
//     phân hệ này bỏ vế sau ở cả hai ô, mà đây là hai ô ra tiền.
//
// [3] NHÃN "XEM CẢ TRƯỜNG" NÓI SAI với quản lý và văn phòng cơ sở: máy chủ cắt
//     bảng theo phạm vi của họ — và bài canh của Đ163 chốt rằng việc cắt ấy là
//     CỐ Ý — nhưng nhãn vẫn ghi "cả trường", nên họ kết luận sai về số nhà còn
//     nợ của cả trường. Một kết luận sai được chính app đứng ra bảo đảm.
//
// [4] NÚT "TẠO KHOẢN THU" KHÔNG KHOÁ sau cú bấm đầu. Đường ghi sổ hàng loạt có
//     hẳn bước chống ghi trùng, và chú thích của nó gọi đó là *"phần quan trọng
//     nhất của đường này"* vì *"mạng chập chờn, cô bấm hai lần… đều dẫn tới một
//     nhà bị đòi tiền hai lần"*. Đường MỘT BÉ thì không có gì cả.
//
// BÀI NÀY ĐO TRÊN DOM THẬT, không dò chuỗi trong mã nguồn: chính chỗ dò chuỗi
// là chỗ Đ171 đã trượt một lần.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, CHROMIUM, tatBannerMoiCai, batPhanHe, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hoc-phi-man-hinh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi']);

const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hp_qt');   // chưa khai chức vụ — dựng dữ liệu
const mkKT = taoQuanTri(DIR, 'Chị Kế Toán', 'hp_kt');
const mkQL = taoQuanTri(DIR, 'Quản Lý CS1', 'hp_ql');
datChucVu(DIR, 'hp_kt', 'ketoan');
datChucVu(DIR, 'hp_ql', 'quanly-coso');
khoaVaoCoSo(DIR, 'hp_ql', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3972), dir: DIR });

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
const page = await ctx.newPage();
let loi = [];
page.on('pageerror', e => loi.push(e.message));

async function vaoLanDau(u, mkTam, mkMoi) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) { /* chưa đăng nhập */ } });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', mkTam);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (mk) => {
    await API.post('/api/auth/set-new-password', { newPassword: mk });
  }, mkMoi);
}

async function dangNhap(u, p) {
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { App.logout(); } catch (_) { /* chưa đăng nhập */ } });
  await page.goto(sv.BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lg-user', { timeout: 10000 });
  await page.fill('#lg-user', u);
  await page.fill('#lg-pass', p);
  await page.click('button[type=submit]');
  await page.waitForSelector('.tile-grid', { timeout: 10000 });
}

const MK = 'quantri2026';
await vaoLanDau('hp_qt', mkQT, MK);
await vaoLanDau('hp_kt', mkKT, MK);
await vaoLanDau('hp_ql', mkQL, MK);

// DỰNG ĐÚNG TÌNH HUỐNG NGUY HIỂM: hai nhóm TRÙNG TÊN ở hai cơ sở khác nhau.
//
// Dữ liệu mẫu không có cặp nào như vậy, mà đó lại chính là cảnh bài này sinh ra
// để canh. Đo trên một trường không có nhóm trùng tên thì phép so chẳng chứng
// minh được gì.
// Dựng bằng tài khoản CHƯA KHAI CHỨC VỤ: kế toán cố ý không mở được hồ sơ bé
// và không tạo được nhóm — đúng thiết kế của tầng chức vụ.
await dangNhap('hp_qt', MK);
const dung = await page.evaluate(async () => {
  const c1 = (App.state.classes || []).find(c => c.id === 'c1');
  const r = await API.post('/api/admin/classes', { name: c1.name });   // cùng tên "Chồi 2"
  await API.put(`/api/admin/classes/${r.id}/campus`, { campusId: 'cs2' });
  return { tenTrung: c1.name, idMoi: r.id };
});
await page.goto(sv.BASE, { waitUntil: 'networkidle' });   // nạp lại App.state
check('dựng được HAI nhóm trùng tên ở hai cơ sở khác nhau', !!dung.idMoi, dung);

async function moHocPhi() {
  loi = [];
  await page.goto(`${sv.BASE}/#/hocphi`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

const chuCacO = (sel) => page.$$eval(`${sel} option`, os => os.map(o => o.textContent.trim()));

try {
  // =========================================================================
  console.log('\n[1] Ô chọn nhóm của đợt ghi sổ — kế toán toàn trường');
  {
    await dangNhap('hp_kt', MK);
    await moHocPhi();
    await page.click('#hp-dot');
    await page.waitForSelector('#hpd-id', { timeout: 8000 });
    const chu = await chuCacO('#hpd-id');
    const trung = chu.filter(x => x.startsWith(dung.tenTrung));

    check('có đúng hai dòng cho hai nhóm trùng tên', trung.length === 2, chu);
    check('HAI DÒNG ẤY PHÂN BIỆT ĐƯỢC VỚI NHAU, không phải hai chuỗi giống hệt',
      new Set(trung).size === 2, trung);
    check('và phân biệt bằng TÊN CƠ SỞ chứ không phải bằng một con số máy',
      trung.every(x => / · .+/.test(x)), trung);
    check('không lỗi JavaScript nào khi mở hộp thoại', loi.length === 0, loi);

    // Đối chứng: kế toán toàn trường vẫn thấy ĐỦ nhóm — siết đúng chỗ, không lan.
    const soNhom = await page.$$eval('#hpd-id option', os => os.length);
    const soThat = await page.evaluate(() => (App.state.classes || []).length);
    check('đối chứng — kế toán toàn trường vẫn thấy đủ mọi nhóm', soNhom === soThat,
      { tren: soNhom, that: soThat });
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[2] Cùng ô đó với QUẢN LÝ CƠ SỞ — chỉ mời bấm thứ bấm được');
  {
    await dangNhap('hp_ql', MK);
    await moHocPhi();
    const coNutDot = await page.locator('#hp-dot').count();
    check('quản lý cơ sở KHÔNG có nút ghi sổ hàng loạt (không phải người lo tiền)',
      coNutDot === 0, coNutDot);

    // Nhưng nút CHỈ ĐỌC thì có, và nhãn của nó phải nói đúng phạm vi.
    check('vẫn có nút xem sổ tiền', await page.locator('#hp-bang').count() === 1);
    const nhan = (await page.locator('#hp-bang').innerText()).trim();
    check('NHÃN NÚT KHÔNG CÒN HỨA "cả trường" với tài khoản chỉ thấy một cơ sở',
      !/cả trường/i.test(nhan), nhan);

    await page.click('#hp-bang');
    await page.waitForSelector('.modal', { timeout: 8000 });
    const tieuDe = await page.locator('.modal').innerText();
    check('TIÊU ĐỀ BẢNG GỌI ĐÚNG TÊN CƠ SỞ của tài khoản, không nói "cả trường"',
      !/Sổ tiền cả trường/.test(tieuDe) && /Sổ tiền/.test(tieuDe), tieuDe.slice(0, 120));
    check('không lỗi JavaScript nào', loi.length === 0, loi);
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[3] Hai ô chọn bé đều nói đủ tên — đây là hai ô ra tiền');
  {
    await dangNhap('hp_kt', MK);
    await moHocPhi();

    // (a) Ô đặt ưu đãi.
    await page.click('#hp-uudai');
    await page.waitForTimeout(700);
    await page.click('#hpu-them');
    await page.waitForSelector('#hpu-be', { timeout: 8000 });
    const be = await chuCacO('#hpu-be');
    check('ô chọn bé của ƯU ĐÃI kèm tên nhóm', be.every(x => / · .+/.test(x)), be.slice(0, 4));
    await page.evaluate(() => UI.closeModal());
  }

  // =========================================================================
  console.log('\n[4] Nút "Tạo khoản thu" khoá ngay từ cú bấm đầu');
  {
    await dangNhap('hp_kt', MK);
    await moHocPhi();
    // Ô chọn bé của màn Học phí chỉ hiện với cô; kế toán dùng thanh chọn bé
    // chung. Mở thẳng hộp tạo khoản cho một bé có thật.
    const sid = await page.evaluate(() => (App.state.students || [])[0].id);
    await page.evaluate((id) => App.views.hocphi.moTao(id), sid);
    await page.waitForSelector('#hp-luu', { timeout: 8000 });

    await page.fill('#hp-ky', 'Tháng 11/2026');
    await page.fill('#hp-nd', 'Tiền ăn tháng 11');
    await page.fill('#hp-tien', '700000');

    // Chặn đường mạng lại để cú bấm đầu còn đang chạy khi ta đo — đúng cảnh
    // 4G chậm ở phòng kế toán, thứ sinh ra cú bấm thứ hai.
    // Chặn CHỈ MỘT lượt: lượt sau để đi thẳng, nếu không Playwright báo
    // "Route is already handled" khi màn hình vẽ lại và hỏi lại cùng đường ấy.
    let daCham = false;
    await page.route('**/api/hocphi', async (r) => {
      if (!daCham) { daCham = true; await new Promise(res => setTimeout(res, 1500)); }
      try { await r.continue(); } catch (_) { /* lượt đã được xử lý */ }
    });
    await page.click('#hp-luu');
    await page.waitForTimeout(300);
    const khoa = await page.locator('#hp-luu').isDisabled();
    const chu = (await page.locator('#hp-luu').innerText()).trim();
    check('NÚT KHOÁ LẠI NGAY trong lúc đang ghi — bấm hai lần không ghi nợ hai lần', khoa, khoa);
    check('và nói cho người bấm biết là đang chạy, không đứng im', /Đang ghi/.test(chu), chu);
    await page.unroute('**/api/hocphi');
    await page.waitForTimeout(2000);

    // Đối chứng: chỉ MỘT khoản được ghi.
    const dem = await page.evaluate(async (id) => {
      const d = await API.get(`/api/hocphi?studentId=${id}`);
      return (d.khoan || []).filter(k => k.noiDung === 'Tiền ăn tháng 11').length;
    }, sid);
    check('đối chứng — đúng MỘT khoản được ghi vào sổ', dem === 1, dem);
    check('không lỗi JavaScript nào suốt mục này', loi.length === 0, loi);
  }
  // =========================================================================
  console.log('\n[5] Ghi đúng khoản ấy lần nữa thì MÁY HỎI LẠI, không ghi lặng lẽ');
  {
    // Mục [4] vừa ghi "Tiền ăn tháng 11" cho bé này. Ghi y hệt lần nữa là đúng
    // cảnh mạng chập chờn / bấm hai lần / chạy lại vì nhớ nhầm — và trước Đ175
    // máy ghi thẳng dòng thứ hai, tức một nhà bị đòi tiền hai lần.
    const sid = await page.evaluate(() => (App.state.students || [])[0].id);
    const dem = async () => page.evaluate(async (id) => {
      const d = await API.get(`/api/hocphi?studentId=${id}`);
      return (d.khoan || []).filter(k => k.noiDung === 'Tiền ăn tháng 11').length;
    }, sid);
    check('đối chứng — đang có đúng một dòng trước khi thử', await dem() === 1, await dem());

    const moHopGhi = async () => {
      await page.evaluate((id) => App.views.hocphi.moTao(id), sid);
      await page.waitForSelector('#hp-luu', { timeout: 8000 });
      await page.fill('#hp-ky', 'Tháng 11/2026');
      await page.fill('#hp-nd', 'Tiền ăn tháng 11');
      await page.fill('#hp-tien', '700000');
    };

    // (a) BẤM HUỶ ở câu hỏi → KHÔNG ghi thêm dòng nào.
    await moHopGhi();
    let chuHoi = '';
    const batHuy = (d) => { chuHoi = d.message(); d.dismiss(); };
    page.once('dialog', batHuy);
    await page.click('#hp-luu');
    await page.waitForTimeout(1200);
    check('MÁY HỎI LẠI bằng một câu hỏi thật trên màn', /Vẫn ghi thêm/.test(chuHoi), chuHoi.slice(0, 160));
    check('và câu hỏi nói rõ khoản đã có là khoản nào',
      /Tiền ăn tháng 11/.test(chuHoi), chuHoi.slice(0, 160));
    check('BẤM HUỶ THÌ KHÔNG GHI THÊM DÒNG NÀO', await dem() === 1, await dem());
    // Hộp thoại phải CÒN MỞ và nút phải mở lại được. Dùng `count()` trước:
    // trên bản chưa vá thì hộp đã đóng vì khoản được ghi thẳng, và `isDisabled`
    // sẽ chờ 30 giây rồi ném lỗi — bài canh phải BÁO ĐỎ chứ không được sập.
    const conHop = await page.locator('#hp-luu').count();
    check('hộp thoại vẫn còn mở sau khi bấm Huỷ, phần đã gõ không mất', conHop === 1, conHop);
    check('và nút mở lại được để kế toán sửa rồi bấm tiếp',
      conHop === 1 && !(await page.locator('#hp-luu').isDisabled()), 'hp-luu');
    await page.evaluate(() => UI.closeModal());

    // (b) BẤM ĐỒNG Ý → ghi thêm thật, vì hai khoản cùng tên trong một kỳ là có thật.
    await moHopGhi();
    page.once('dialog', d => d.accept());
    await page.click('#hp-luu');
    await page.waitForTimeout(1800);
    check('BẤM ĐỒNG Ý THÌ GHI ĐƯỢC — máy không quyết thay kế toán', await dem() === 2, await dem());
    check('không lỗi JavaScript nào suốt mục này', loi.length === 0, loi);
  }

} finally {
  await ctx.close();
  await browser.close();
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Màn Học phí trên trình duyệt thật (Đ174)');
