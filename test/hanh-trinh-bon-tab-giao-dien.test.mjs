// Bài canh MÀN HÀNH TRÌNH BỐN TAB trên trình duyệt thật — góp ý 06/10, mục 7.
//
// Chạy bằng:  node test/hanh-trinh-bon-tab-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
// Phần máy chủ có `test/hanh-trinh-bon-tab.test.mjs`. Ở đây đo bằng mắt người:
//   • cô: bốn tab ở "Hành trình từng bé", tab Kế hoạch có chữ quy ước, lưu mức
//     độ từ chính tab ấy;
//   • gia đình: bốn tab, tab Kế hoạch thấy tên bài chia theo chương trình với
//     tên góc thật, KHÔNG thấy mức độ; khổ điện thoại không cuộn ngang.
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hanh-trinh-bon-tab-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3353), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const THANG = HOM_NAY().slice(0, 7);

const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  // Dựng sẵn một kế hoạch đã duyệt cho bé s1 bằng đường API.
  const d0 = await login('hieutruong', mk1);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QL = (await login('hieutruong', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
  const thapHong = dm.find(b => b.ten === 'Tháp hồng');
  await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem',
    danhSach: [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] } });
  await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
  const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
    .find(x => x.studentId === 's1').ke;
  const duyet = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: ke.id, chuongTrinh: 'chu-nhiem' }] } });
  check('đối chứng — có một kế hoạch đã duyệt cho bé s1', duyet.status === 200 && duyet.data.so === 1, duyet.data);

  const ctx = await tatBannerMoiCai(await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }));
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', e => loi.push(e.message));
  const dangNhap = async (u, p) => {
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { App.logout(); } catch (_) {} });
    await page.goto(sv.BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#lg-user', { timeout: 10000 });
    await page.fill('#lg-user', u);
    await page.fill('#lg-pass', p);
    await page.click('button[type=submit]');
    await page.waitForTimeout(1200);
  };

  // =========================================================================
  console.log('\n[1] Cô: bốn tab ở "Hành trình từng bé", nhìn lại bằng chữ quy ước ngay trong tab Kế hoạch');
  {
    await dangNhap('giaovien', '123456');
    await page.goto(`${sv.BASE}/#/hanhtrinh`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.locator('#ht-tabs button', { hasText: 'Hành trình từng bé' }).click();
    await page.waitForTimeout(1500);
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    const tab = await page.locator('#ht-nhom-tabs [data-nhom]').allInnerTexts();
    check('bốn tab Kế hoạch của bé / Montessori / Cambridge / Thể chất',
      tab.length === 4 && /^Kế hoạch của bé/.test(tab[0]) && /^Montessori/.test(tab[1]) && /^Cambridge/.test(tab[2]) && /^Thể chất/.test(tab[3]), tab);
    check('tab Kế hoạch mở sẵn, có ô tháng và lời giải thích chữ quy ước',
      await page.locator('#ht-kh-thang').count() === 1 && /S = đã vững/.test(await page.locator('#ht-be-than').innerText()));
    const md = page.locator('.ht-kh-md').first();
    check('có ô mức độ cho bài của phần mình', await md.count() === 1);
    const chu = await md.locator('option').allInnerTexts();
    check('ô mức độ đọc chữ quy ước kèm tên', chu.includes('M · Vượt trội') && chu.includes('N · Chưa quan sát thấy'), chu);
    await md.selectOption('vuot-troi');
    await page.locator('.ht-kh-tt').first().selectOption('on-tap');
    await page.locator('[data-ht-kh-luu="chu-nhiem"]').click();
    await page.waitForTimeout(1500);
    const sau = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === 's1').ke;
    const b = (sau.baiHoc || []).find(x => x.baiHocId === thapHong.id) || {};
    check('lưu từ tab Kế hoạch ghi đúng mức độ và lựa chọn tiếp tục', b.mucDo === 'vuot-troi' && b.tiepTuc === 'on-tap', b);
    await page.click('#ht-nhom-tabs [data-nhom="nuoc-ngoai"]');
    await page.waitForTimeout(1200);
    check('tab Cambridge mở danh sách quan sát của chương trình đó', await page.locator('#ht-kh-thang').count() === 0);
  }

  // =========================================================================
  console.log('\n[1b] Cô: ghi nháp CHƯA GẮN BÉ rồi gắn bé sau; nút nói thành chữ');
  {
    await page.goto(`${sv.BASE}/#/hanhtrinh`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.locator('#ht-tabs button', { hasText: 'Suy ngẫm cuối ngày' }).click();
    await page.waitForTimeout(1200);
    await page.click('#ht-them');
    await page.waitForTimeout(600);
    check('ô chọn bé có lựa chọn "Chưa gắn bé · lưu nháp"', await page.locator('#ht-be option[value="__nhap__"]').count() === 1);
    check('có ô chọn chương trình', await page.locator('#ht-nhom option').count() === 4);
    const coNoi = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    check('máy hỗ trợ nhận giọng thì có nút "Nói để ghi", không thì có lời chỉ micro bàn phím',
      coNoi ? await page.locator('.ht-noi[data-o="ht-mota"]').count() === 1
        : /micro trên bàn phím/.test(await page.locator('#modal-overlay').innerText()), coNoi);
    await page.selectOption('#ht-be', '__nhap__');
    await page.fill('#ht-mota', 'Một bạn tự rót nước không làm đổ');
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    check('nháp hiện ở mục "Nháp chưa gắn bé"', /Một bạn tự rót nước không làm đổ/.test(await page.locator('#ht-nhap-ds').innerText()));
    await page.locator('[data-nhap-gan]').first().click();
    await page.waitForTimeout(500);
    await page.selectOption('#ht-gan-be', 's3');
    await page.click('#ht-gan-luu');
    await page.waitForTimeout(1500);
    check('gắn bé xong thì nháp rời danh sách', await page.locator('#ht-nhap-ds').count() === 0);
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s3', { cookie: GV })).data;
    check('và thành một quan sát của bé s3', (ht.quanSat || []).some(q => /tự rót nước không làm đổ/.test(q.moTa || '')));
    // Tab chương trình của bé hiện cả ẢNH của quan sát (mục 7: "nhận xét, đánh
    // giá và hình ảnh của trẻ theo từng chương trình") — ảnh chỉ cô đã ghi xem được.
    const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's3', moTa: 'Bé xếp tháp hồng', anh: ANH, nhom: 'chu-nhiem' } });
    await page.locator('#ht-tabs button', { hasText: 'Hành trình từng bé' }).click();
    await page.waitForTimeout(1200);
    await page.selectOption('#ht-chon-be', 's3');
    await page.waitForTimeout(1200);
    await page.click('#ht-nhom-tabs [data-nhom="chu-nhiem"]');
    await page.waitForTimeout(1200);
    check('tab Montessori của bé hiện ảnh của quan sát', await page.locator('#ht-be-than img[src^="/api/hanhtrinh/anh/"]').count() >= 1);
  }

  // =========================================================================
  console.log('\n[2] Gia đình: bốn tab, tên bài chia theo chương trình, KHÔNG thấy mức độ');
  {
    await dangNhap('phuhuynh', '123456');
    await page.goto(`${sv.BASE}/#/hanhtrinh`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const tabGd = await page.locator('#ht-ph-tabs [data-tab]').allInnerTexts();
    check('bốn tab', tabGd.length === 4 && /^Kế hoạch của bé/.test(tabGd[0]), tabGd);
    const t = await page.locator('#view').innerText();
    check('tab Kế hoạch: tên bài và tên góc thật (không mã trần)', /Tháp hồng/.test(t) && /Giác quan/.test(t) && !/giac-quan/.test(t), t.slice(0, 400));
    check('KHÔNG thấy mức độ hay chữ quy ước nào', !/Vượt trội|Đã vững|M · |S · /.test(t), t.slice(0, 400));
    await page.click('#ht-ph-tabs [data-tab="nuoc-ngoai"]');
    await page.waitForTimeout(600);
    // textContent: nhãn mục viết hoa bằng CSS.
    check('tab Cambridge mở phần câu chuyện của chương trình đó', /Câu chuyện của con · Cambridge/.test(await page.locator('#view').textContent()));
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('không cuộn ngang trên khổ điện thoại', tran <= 1, `tràn ${tran}px`);
  }
  check('không có lỗi JavaScript', loi.length === 0, loi);
  await ctx.close();
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
