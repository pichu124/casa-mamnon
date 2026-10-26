// LUỒNG "HÌNH ẢNH GHI NHANH" TRÊN TRÌNH DUYỆT THẬT (Đ242B — B1, B4, B5, B7).
//
// Chạy bằng:  node test/phan-hoi-2010-hinh-anh-ghi-nhanh-giao-dien.test.mjs
//
// Chủ dự án quyết ngày 26/10 (B7): ảnh kể cho gia đình là ảnh quá trình học
// tập ở ba chương trình. Phần máy chủ có test/hanh-trinh-ke-anh.test.mjs; ở
// đây đo đúng đường tay cô đi:
//   [1] Lối phụ chỉ còn "Hình ảnh ghi nhanh" — nút "Chủ đề tuần" đã chuyển
//       sang Lịch sinh hoạt; địa chỉ #/hanhtrinh/chude và #/hanhtrinh/suyngam
//       vẫn mở.
//   [2] Cô ghi nhanh MỘT ĐOẠN VIDEO, không chữ, không chọn bé → mục nằm ở
//       Hình ảnh ghi nhanh.
//   [3] Hoàn thiện: chọn bé, gắn Cambridge (góc con chỉ hiện ở Montessori),
//       "Cùng con ở nhà" điền sẵn từ chủ đề tuần, gửi kèm video, bắt buộc
//       trả lời "Trong ảnh có bé khác không?" → Kể → mục rời danh sách.
//   [4] Gia đình bé thấy video ở tab Cambridge; gia đình bé khác không thấy.
//   [5] Ảnh có bé chưa đồng ý chia sẻ: màn cô nói lý do bằng chữ trung tính,
//       gia đình không nhận ảnh. Thu hồi thì mục quay lại Hình ảnh ghi nhanh.
import { chromium } from 'playwright';
import crypto from 'crypto';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-hinh-anh-ghi-nhanh-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'thuchup', 'album', 'tkb']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hagn_qt');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7241), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Hộp `ftyp` ở byte 4–8 là đủ qua phép kiểm chữ ký video của máy chủ.
function mp4Buf(soByte = 4096) {
  const b = Buffer.alloc(soByte);
  b.writeUInt32BE(soByte, 0);
  b.write('ftypisom', 4, 'ascii');
  return b;
}
const CUNG_CON_TUAN = 'Tối nay cả nhà cùng con hát bài Hello và vẫy tay chào nhau.';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
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
const moMan = async (hash, cho = 1300) => {
  if (await page.evaluate(() => location.hash) === hash) await page.evaluate(() => App.route());
  else await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(cho);
};
const chuCua = async (sel) => (await page.locator(sel).count() ? page.locator(sel).innerText() : '');
const choKe = async (cookie) => ((await req('GET', '/api/hanhtrinh/cho-ke', { cookie })).data || {}).muc || [];
const layByte = async (duong, cookie) => (await fetch(`${sv.BASE}${duong}`, { headers: cookie ? { cookie } : {} })).status;

try {
  const d0 = await login('hagn_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô nhóm Chồi 2 (c1)
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — mẹ bé s1
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — bố bé s3, cùng nhóm c1
  const cd = await req('PUT', '/api/hanhtrinh/chu-de', { cookie: GV, body: { classId: 'c1', chuDe: 'Xin chào', cungConONha: CUNG_CON_TUAN } });
  check('đối chứng — nhóm c1 có chủ đề tuần với "Cùng con ở nhà tuần này"', cd.status === 200, cd.data);

  // =========================================================================
  console.log('\n[1] Lối phụ chỉ còn "Hình ảnh ghi nhanh"; địa chỉ cũ vẫn mở');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/hanhtrinh');
    const phu = (await page.locator('#ht-loi-phu [data-tab]').allInnerTexts()).map(t => t.trim());
    check('lối phụ dưới tiêu đề chỉ còn "Hình ảnh ghi nhanh"', phu.join(' | ') === 'Hình ảnh ghi nhanh', phu);
    check('KHÔNG còn nút "Chủ đề tuần" (lối vào nay ở Lịch sinh hoạt)',
      await page.locator('#ht-loi-phu [data-tab="chude"]').count() === 0 && !phu.some(t => /Chủ đề tuần|Suy ngẫm/.test(t)), phu);
    await moMan('#/hanhtrinh/chude');
    check('#/hanhtrinh/chude vẫn mở màn soạn chủ đề tuần', await page.locator('#ht-cd-luu').count() === 1);
    await moMan('#/hanhtrinh/suyngam');
    check('#/hanhtrinh/suyngam (địa chỉ cũ) mở Hình ảnh ghi nhanh',
      await page.locator('#ht-them').count() === 1
        && /Hình ảnh ghi nhanh/.test(await chuCua('#ht-loi-phu button.primary')), await chuCua('#ht-loi-phu'));
  }

  // =========================================================================
  console.log('\n[2] Ghi nhanh một đoạn video — không chữ, không chọn bé');
  let mucVideo = null;
  {
    await moMan('#/hanhtrinh/the-chat');
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(600);
    const accept = await page.getAttribute('#ht-anh', 'accept');
    check('ô chụp/quay nhận cả ảnh lẫn video', /image/.test(accept || '') && /video/.test(accept || ''), accept);
    const thuTu = await page.evaluate(() => {
      const o = ['#ht-anh', '#ht-be', '#ht-mota'].map(s => document.querySelector(`#modal-overlay ${s}`));
      return o.every(Boolean) && (o[0].compareDocumentPosition(o[1]) & 4) && (o[1].compareDocumentPosition(o[2]) & 4);
    });
    check('chụp/quay đứng TRƯỚC ô chọn bé và ô chữ', !!thuTu);
    check('ô chọn bé không đặt sẵn bé nào — mặc định là lưu nháp',
      (await page.inputValue('#ht-be')) === '__nhap__', await page.inputValue('#ht-be'));
    await page.setInputFiles('#ht-anh', { name: 'dai.mp4', mimeType: 'video/mp4', buffer: mp4Buf(9 * 1024 * 1024) });
    await page.waitForTimeout(800);
    check('video quá 8 MB: hỏi trước khi nén trên máy, báo phải chờ khoảng bằng độ dài đoạn phim',
      await page.locator('#ht-nen-ok').count() === 1 && /nén nhỏ lại[\s\S]*bằng độ dài đoạn phim/.test(await chuCua('#ht-nen')),
      await chuCua('#ht-nen'));
    await page.setInputFiles('#ht-anh', { name: 'be-rot-nuoc.mp4', mimeType: 'video/mp4', buffer: mp4Buf() });
    await page.waitForTimeout(800);
    check('chọn lại đoạn ngắn thì lời mời nén biến mất', await page.locator('#ht-nen-ok').count() === 0);
    check('chọn video xong thì ô xem trước là một đoạn video', await page.locator('#ht-anh-xem video').count() === 1);
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    check('lưu được khi không có chữ nào (B5) — hộp đóng lại', await page.locator('#modal-overlay #ht-luu').count() === 0,
      await chuCua('#modal-overlay'));
    const ds = await choKe(GV);
    mucVideo = ds.find(m => m.nguon === 'nhap' && m.laVideo && !m.moTa);
    check('máy chủ có một nháp video không chữ, chưa gắn bé, mang chương trình của tab đang mở',
      !!mucVideo && mucVideo.studentId === null && mucVideo.nhom === 'the-chat', ds.map(m => [m.nguon, m.laVideo, m.nhom]));

    await moMan('#/hanhtrinh/ghinhanh');
    const the = page.locator(`#ht-gn-ds [data-muc="nhap:${mucVideo?.id}"]`);
    check('mục nằm ở Hình ảnh ghi nhanh, có ô xem video', await the.count() === 1 && await the.locator('video').count() === 1);
    check('ô video không tải trước cả đoạn (preload="none")',
      await the.locator('video').count() === 1 && (await the.locator('video').getAttribute('preload')) === 'none');
    check('thẻ nói rõ chưa gắn bé, có nút Hoàn thiện & kể và nút Bỏ',
      /Chưa gắn bé/.test(await the.innerText()) && await the.locator('[data-hoan-thien]').count() === 1
        && await the.locator('[data-bo]').count() === 1);
  }

  // =========================================================================
  console.log('\n[3] Hoàn thiện & kể: bé, Cambridge, Cùng con ở nhà điền sẵn, gửi kèm video, "chỉ có bé X"');
  {
    await page.locator(`#ht-gn-ds [data-muc="nhap:${mucVideo?.id}"] [data-hoan-thien]`).click();
    await page.waitForTimeout(900);
    check('hộp hoàn thiện có ô chọn bé (mục chưa gắn bé)', await page.locator('#ht-hc-be').count() === 1);
    await page.selectOption('#ht-hc-be', 's1');
    await page.waitForTimeout(1200);
    check('"Cùng con ở nhà" điền sẵn từ chủ đề tuần của nhóm bé',
      (await page.inputValue('#ht-cn')) === CUNG_CON_TUAN, await page.inputValue('#ht-cn'));
    const ct = await page.locator('#ht-hc-nhom option').evaluateAll(os => os.map(o => o.value));
    check('ô chương trình chỉ có ba chương trình của trường', ct.length >= 1 && ct.every(v => ['chu-nhiem', 'nuoc-ngoai', 'the-chat'].includes(v)), ct);
    check('giữ chương trình đã chọn lúc ghi (P.E)', (await page.inputValue('#ht-hc-nhom')) === 'the-chat');
    await page.selectOption('#ht-hc-nhom', 'chu-nhiem');
    await page.waitForTimeout(300);
    const goc = await page.locator('#ht-hc-goc option').allInnerTexts();
    check('chọn Montessori thì hiện góc con (5 góc + không chọn)', goc.length === 6 && goc.some(g => /Giác quan/.test(g)), goc);
    await page.selectOption('#ht-hc-nhom', 'nuoc-ngoai');
    await page.waitForTimeout(300);
    check('Cambridge thì không có góc con', await page.locator('#ht-hc-goc').count() === 0);
    check('ô "Gửi kèm ảnh/video cho gia đình" mặc định đã tích', await page.isChecked('#ht-kem-tep'));
    check('có câu hỏi "Trong ảnh có bé khác không?" kèm lời nhắc đồng ý chia sẻ',
      /Trong ảnh có bé khác không/.test(await chuCua('#modal-overlay')) && /đồng ý chia sẻ/.test(await chuCua('#modal-overlay')));
    check('lựa chọn "Chỉ có bé" gọi đúng tên bé', /Chỉ có bé Nguyễn Bảo An/.test(await chuCua('#modal-overlay')));

    await page.fill('#ht-cc', 'Con hát Hello cùng cả nhóm và vẫy tay chào cô.');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(900);
    check('chưa trả lời câu hỏi bé trong ảnh thì CHƯA kể — hộp vẫn mở',
      await page.locator('#modal-overlay #ht-cong-bo').count() === 1);
    check('và máy chủ chưa đổi gì (nháp vẫn là nháp)', (await choKe(GV)).some(m => m.nguon === 'nhap' && m.id === mucVideo?.id));

    await page.check('#ht-chi-be');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1800);
    check('kể xong hộp đóng lại', await page.locator('#modal-overlay #ht-cong-bo').count() === 0, await chuCua('#modal-overlay'));
    const sau = await choKe(GV);
    check('mục rời "Hình ảnh ghi nhanh" ở máy chủ (không còn nháp, không còn quan sát chưa kể nào của video ấy)',
      !sau.some(m => m.id === mucVideo?.id) && !sau.some(m => m.laVideo), sau.map(m => [m.nguon, m.laVideo]));
    check('và biến khỏi màn', await page.locator(`#ht-gn-ds [data-muc="nhap:${mucVideo?.id}"]`).count() === 0
      && await page.locator('#ht-gn-ds video').count() === 0);
  }

  // =========================================================================
  console.log('\n[4] Gia đình bé thấy video ở tab Cambridge; gia đình bé khác không thấy');
  let tepId = '';
  {
    const ph = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {};
    const q = (ph.quanSat || []).find(x => /hát Hello cùng cả nhóm/.test(x.cauChuyen || ''));
    check('gia đình nhận câu chuyện ở chương trình Cambridge', !!q && q.nhomCo === 'nuoc-ngoai', q);
    check('kèm đúng một video gửi kèm', !!q && (q.tepKe || []).length === 1 && q.tepKe[0].loai === 'video', q && q.tepKe);
    check('"Cùng con ở nhà" là lời rủ của chủ đề tuần', !!q && q.cungConONha === CUNG_CON_TUAN, q && q.cungConONha);
    tepId = (q && q.tepKe && q.tepKe[0] && q.tepKe[0].id) || '';

    await dangNhap('phuhuynh', '123456');
    await moMan('#/hanhtrinh', 1500);
    await page.click('#ht-ph-tabs [data-tab="nuoc-ngoai"]');
    await page.waitForTimeout(900);
    const v = page.locator(`#view video[src="/api/hanhtrinh/ke-tep/${tepId}"]`);
    check('tab Cambridge của gia đình có ô video trỏ đường bản chép', !!tepId && await v.count() === 1);
    check('video có nút điều khiển, phát tại chỗ, chỉ tải phần đầu',
      await v.count() === 1 && (await v.getAttribute('controls')) !== null
        && (await v.getAttribute('playsinline')) !== null && (await v.getAttribute('preload')) === 'metadata');
    const tai = await page.evaluate(async (u) => (await fetch(u)).status, `/api/hanhtrinh/ke-tep/${tepId}`);
    check('trình duyệt của gia đình tải được video (200)', tai === 200, tai);
    check('màn gia đình không lộ đường tệp lớp 1', await page.locator('#view [src^="/api/hanhtrinh/anh/"]').count() === 0);
    await page.click('#ht-ph-tabs [data-tab="chu-nhiem"]');
    await page.waitForTimeout(600);
    check('tab Montessori KHÔNG có video ấy', await page.locator('#view video').count() === 0);

    check('gia đình bé khác không mở được hành trình bé s1',
      (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH2 })).status === 403);
    check('và không tải được video gửi kèm (403)', await layByte(`/api/hanhtrinh/ke-tep/${tepId}`, PH2) === 403);
  }

  // =========================================================================
  console.log('\n[5] Ảnh có bé chưa đồng ý chia sẻ: màn cô nói lý do, chữ trung tính; thu hồi thì mục quay lại');
  {
    const gn = await req('POST', '/api/thuchup', { cookie: GV, body: { id: crypto.randomUUID(), studentId: 's1', note: 'Hai bạn xếp tháp', dataUrl: ANH } });
    check('đối chứng — một bản Ghi nhanh có ảnh của bé s1', gn.status === 200 || gn.status === 201, gn.data);
    await dangNhap('giaovien', '123456');
    await moMan('#/hanhtrinh/ghinhanh');
    const the = page.locator(`#ht-gn-ds [data-muc="ghinhanh:${gn.data?.id}"]`);
    check('bản Ghi nhanh nằm ở Hình ảnh ghi nhanh kèm ảnh', await the.count() === 1 && await the.locator('img').count() === 1);
    await the.locator('[data-hoan-thien]').click();
    await page.waitForTimeout(1200);
    check('mục đã có bé thì không hỏi lại bé', await page.locator('#ht-hc-be').count() === 0);
    await page.selectOption('#ht-hc-nhom', 'chu-nhiem');
    await page.waitForTimeout(300);
    await page.selectOption('#ht-hc-goc', 'giac-quan');
    await page.fill('#ht-cc', 'An và Hân cùng xếp tháp hồng.');
    await page.check('#ht-co-be-khac');
    await page.waitForTimeout(300);
    await page.check('#modal-overlay .ht-be-anh[value="s3"]');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1800);
    check('kể xong hộp đóng lại', await page.locator('#modal-overlay #ht-cong-bo').count() === 0, await chuCua('#modal-overlay'));
    check('bản Ghi nhanh rời danh sách', !(await choKe(GV)).some(m => m.id === gn.data?.id));

    const co = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data || {};
    const q = (co.quanSat || []).find(x => /cùng xếp tháp hồng/.test(x.cauChuyen || ''));
    const t = (q && q.tepKe && q.tepKe[0]) || {};
    check('máy chủ ghi Montessori + góc Giác quan', !!q && q.nhomCo === 'chu-nhiem' && q.goc === 'giac-quan', q && [q.nhomCo, q.goc]);
    check('bé trong ảnh gồm bé chính và bé Hân', (t.beTrongAnh || []).map(b => b.id).sort().join(',') === 's1,s3', t.beTrongAnh);
    check('bé Hân chưa đồng ý chia sẻ ảnh → ảnh ẩn với gia đình', t.hienVoiGiaDinh === false && !!t.lyDo, t);
    const ph = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {};
    const qPh = (ph.quanSat || []).find(x => x.id === q?.id);
    check('gia đình nhận câu chuyện nhưng KHÔNG nhận ảnh', !!qPh && (qPh.tepKe || []).length === 0, qPh && qPh.tepKe);

    await moMan('#/hanhtrinh/chu-nhiem');
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    const theTab = page.locator('#ht-be-than .card', { hasText: 'cùng xếp tháp hồng' });
    check('tab Montessori của cô hiện lý do ảnh đang ẩn', await theTab.count() === 1 && (await theTab.innerText()).includes(t.lyDo || '§'),
      await theTab.innerText().catch(() => ''));
    const mau = await theTab.locator('[data-ly-do]').evaluate(el => getComputedStyle(el).color).catch(() => '');
    check('chữ lý do màu trung tính, không đỏ (QUY TẮC 2)', !!mau && !/rgb\(2[0-5]\d, [0-9]{1,2}, [0-9]{1,2}\)/.test(mau), mau);

    await theTab.locator('[data-cauchuyen]').click();
    await page.waitForTimeout(900);
    check('hộp sửa câu chuyện có nút thu hồi', await page.locator('#ht-thu-hoi').count() === 1);
    await page.click('#ht-thu-hoi');
    await page.waitForTimeout(1500);
    check('thu hồi xong: mục quay lại Hình ảnh ghi nhanh', (await choKe(GV)).some(m => m.nguon === 'quansat' && m.id === q?.id));
    await moMan('#/hanhtrinh/ghinhanh');
    check('và hiện lại trên màn', await page.locator(`#ht-gn-ds [data-muc="quansat:${q?.id}"]`).count() === 1);
    check('mục quan sát có nút "Ghi nhầm bé"',
      await page.locator(`#ht-gn-ds [data-muc="quansat:${q?.id}"] [data-ghinham]`).count() === 1);
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('không cuộn ngang trên khổ điện thoại', tran <= 1, `tràn ${tran}px`);
  }

  check('không có lỗi JavaScript nào trên trang', loiJs.length === 0, loiJs);
} finally {
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
