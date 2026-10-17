// Bài canh MÀN HÀNH TRÌNH BỐN TAB trên trình duyệt thật — góp ý 06/10, mục 7
// và góp ý 16/10, mục 6.
//
// Chạy bằng:  node test/hanh-trinh-bon-tab-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
// Phần máy chủ có `test/hanh-trinh-bon-tab.test.mjs`. Ở đây đo bằng mắt người:
//   • cô: mở Hành trình là vào thẳng BỐN tab theo đúng thứ tự trường đặt
//     (Kế hoạch của bé / Cambridge / P.E (Thể chất) / Montessori & Kỹ năng
//     sống); Suy ngẫm cuối ngày và Chủ đề tuần là hai lối phụ, vẫn mở được;
//     tab Kế hoạch có chữ quy ước, lưu mức độ từ chính tab ấy;
//   • nút + biết tab đang mở: ô Chương trình đặt sẵn đúng chương trình, bé
//     đặt sẵn là bé đang chọn;
//   • nháp chưa gắn bé ghi từ tab chương trình nằm ở đúng tab ấy, chỉ người
//     viết thấy; gắn bé và "Kể cho gia đình" làm được ngay tại tab;
//   • gia đình: bốn tab cùng thứ tự, tab Kế hoạch thấy tên bài chia theo
//     chương trình với tên góc thật, KHÔNG thấy mức độ; câu chuyện cô kể từ
//     tab Cambridge hiện ở tab Cambridge của gia đình; khổ điện thoại không
//     cuộn ngang.
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
const BON_TAB = ['Kế hoạch của bé', 'Cambridge', 'P.E (Thể chất)', 'Montessori & Kỹ năng sống'];

const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  // Dựng sẵn một kế hoạch đã duyệt cho bé s1 bằng đường API.
  const d0 = await login('hieutruong', mk1);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QL = (await login('hieutruong', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;
  const GV3 = (await login('giaovien3', '123456')).cookie;   // cô dạy cả c1 lẫn c2
  const PH = (await login('phuhuynh', '123456')).cookie;     // mẹ s1 (c1) và s2 (c2)
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
  // Đang đứng đúng địa chỉ ấy thì `goto` không vẽ lại — gọi định tuyến để
  // màn đọc lại dữ liệu vừa đổi qua API.
  const moMan = async (hash, cho = 1200) => {
    if (await page.evaluate(() => location.hash) === hash) await page.evaluate(() => App.route());
    else await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(cho);
  };
  const dongHop = async () => { await page.evaluate(() => UI.closeModal()); await page.waitForTimeout(200); };
  const chuCua = async (sel) => (await page.locator(sel).count() ? page.locator(sel).innerText() : '');

  // =========================================================================
  console.log('\n[1] Cô: mở Hành trình là vào thẳng bốn tab, đúng thứ tự trường đặt');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/hanhtrinh');
    const tab = (await page.locator('#ht-tabs [data-tab]').allInnerTexts()).map(t => t.trim());
    check('đúng bốn tab: Kế hoạch của bé / Cambridge / P.E (Thể chất) / Montessori & Kỹ năng sống',
      tab.join(' | ') === BON_TAB.join(' | '), tab);
    check('dải tab KHÔNG còn Suy ngẫm cuối ngày, Chủ đề tuần hay "Hành trình từng bé"',
      !tab.some(t => /Suy ngẫm|Chủ đề tuần|từng bé/.test(t)), tab);
    check('mở vào là tab Kế hoạch của bé (không rơi vào Suy ngẫm nữa)',
      /Kế hoạch của bé/.test(await chuCua('#ht-tabs button.active')) && await page.locator('#ht-them').count() === 0);
    const phu = (await page.locator('#ht-loi-phu [data-tab]').allInnerTexts()).map(t => t.trim());
    check('có hai lối phụ dưới tiêu đề: Suy ngẫm cuối ngày, Chủ đề tuần',
      phu.join(' | ') === 'Suy ngẫm cuối ngày | Chủ đề tuần', phu);
    check('đầu màn có ô chọn bé, chưa chọn sẵn bé nào',
      await page.locator('#ht-chon-be').count() === 1 && (await page.inputValue('#ht-chon-be')) === '');
    check('có ô tìm bé theo tên', await page.locator('#ht-tim-be').count() === 1);
    check('chưa chọn bé: tab Kế hoạch nhắc chọn bé, chưa tải kế hoạch',
      /chọn một bé/i.test(await chuCua('#ht-be-than')) && await page.locator('#ht-kh-thang').count() === 0,
      await chuCua('#ht-be-than'));

    await page.fill('#ht-tim-be', 'gia han');
    await page.waitForTimeout(300);
    const conLai = await page.locator('#ht-chon-be option').allInnerTexts();
    check('gõ tên (không dấu) thì ô chọn bé chỉ còn bé khớp tên',
      conLai.some(t => /Phạm Gia Hân/.test(t)) && !conLai.some(t => /Nguyễn Bảo An/.test(t)), conLai);
    await page.fill('#ht-tim-be', '');
    await page.waitForTimeout(300);

    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    check('chọn bé xong: tab Kế hoạch có ô tháng và lời giải thích chữ quy ước',
      await page.locator('#ht-kh-thang').count() === 1 && /S = đã vững/.test(await chuCua('#ht-be-than')));
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
    await page.click('#ht-tabs [data-tab="nuoc-ngoai"]');
    await page.waitForTimeout(1500);
    check('bấm tab Cambridge: địa chỉ đổi thành #/hanhtrinh/nuoc-ngoai',
      (await page.evaluate(() => location.hash)) === '#/hanhtrinh/nuoc-ngoai', await page.evaluate(() => location.hash));
    check('tab Cambridge mở phần của chương trình đó, vẫn đúng bé đang chọn',
      await page.locator('#ht-kh-thang').count() === 0 && (await page.inputValue('#ht-chon-be')) === 's1'
      && /Cambridge/.test(await chuCua('#ht-tabs button.active')));
  }

  // =========================================================================
  console.log('\n[1a] Hai lối phụ vẫn mở đúng màn cũ; địa chỉ mở thẳng được từng tab');
  {
    await moMan('#/hanhtrinh');
    await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Suy ngẫm cuối ngày' }).click();
    await page.waitForTimeout(1500);
    check('lối phụ Suy ngẫm cuối ngày mở màn suy ngẫm, có nút ghi một quan sát', await page.locator('#ht-them').count() === 1);
    check('và bốn tab vẫn ở đó để quay về', (await page.locator('#ht-tabs [data-tab]').count()) === 4);
    await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Chủ đề tuần' }).click();
    await page.waitForTimeout(1500);
    check('lối phụ Chủ đề tuần mở màn soạn chủ đề tuần', await page.locator('#ht-cd-luu').count() === 1);
    await moMan('#/hanhtrinh/the-chat');
    check('#/hanhtrinh/the-chat mở thẳng tab P.E (Thể chất)', /P\.E \(Thể chất\)/.test(await chuCua('#ht-tabs button.active')));
    await moMan('#/hanhtrinh/suyngam');
    check('#/hanhtrinh/suyngam mở thẳng Suy ngẫm cuối ngày', await page.locator('#ht-them').count() === 1);
  }

  // =========================================================================
  console.log('\n[1b] Cô: ghi nháp CHƯA GẮN BÉ ở Suy ngẫm rồi gắn bé sau; nút nói thành chữ');
  {
    await moMan('#/hanhtrinh/suyngam');
    await page.click('#ht-them');
    await page.waitForTimeout(600);
    check('ô chọn bé có lựa chọn "Chưa gắn bé · lưu nháp"', await page.locator('#ht-be option[value="__nhap__"]').count() === 1);
    check('có ô chọn chương trình', await page.locator('#ht-nhom option').count() === 4);
    check('ở lối phụ Suy ngẫm, ô chương trình vẫn "theo vai" như cũ', (await page.inputValue('#ht-nhom')) === '');
    const coNoi = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    check('máy hỗ trợ nhận giọng thì có nút "Nói để ghi", không thì có lời chỉ micro bàn phím',
      coNoi ? await page.locator('.ht-noi[data-o="ht-mota"]').count() === 1
        : /micro trên bàn phím/.test(await page.locator('#modal-overlay').innerText()), coNoi);
    await page.selectOption('#ht-be', '__nhap__');
    await page.fill('#ht-mota', 'Một bạn tự rót nước không làm đổ');
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    check('nháp hiện ở mục "Nháp chưa gắn bé"', /Một bạn tự rót nước không làm đổ/.test(await chuCua('#ht-nhap-ds')));
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
    await moMan('#/hanhtrinh/chu-nhiem');
    await page.selectOption('#ht-chon-be', 's3');
    await page.waitForTimeout(1500);
    check('tab Montessori của bé hiện ảnh của quan sát', await page.locator('#ht-be-than img[src^="/api/hanhtrinh/anh/"]').count() >= 1);
  }

  // =========================================================================
  console.log('\n[1c] Nút + biết tab đang mở');
  {
    await moMan('#/hanhtrinh/the-chat');
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(600);
    check('bấm + ở tab P.E: ô chương trình đặt sẵn là P.E (the-chat)', (await page.inputValue('#ht-nhom')) === 'the-chat',
      await page.inputValue('#ht-nhom'));
    check('và bé đặt sẵn là bé đang chọn', (await page.inputValue('#ht-be')) === 's1', await page.inputValue('#ht-be'));
    check('vẫn chọn được "Chưa gắn bé · lưu nháp"', await page.locator('#ht-be option[value="__nhap__"]').count() === 1);
    await dongHop();
    await page.click('#ht-tabs [data-tab="kehoach"]');
    await page.waitForTimeout(1500);
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(600);
    check('bấm + ở tab Kế hoạch: ô chương trình "theo vai" như cũ, bé vẫn là bé đang chọn',
      (await page.inputValue('#ht-nhom')) === '' && (await page.inputValue('#ht-be')) === 's1');
    await dongHop();
  }

  // =========================================================================
  console.log('\n[1d] Nháp chưa gắn bé ghi từ tab Cambridge nằm ở tab Cambridge của chính cô');
  {
    await moMan('#/hanhtrinh/nuoc-ngoai');
    for (const chu of ['Nháp A: bé hát theo bài Hello thật to', 'Nháp B: bé đếm tới mười bằng tiếng Anh']) {
      await page.click('#ht-ghi-nhanh');
      await page.waitForTimeout(500);
      await page.selectOption('#ht-be', '__nhap__');
      await page.fill('#ht-mota', chu);
      await page.click('#ht-luu');
      await page.waitForTimeout(1500);
    }
    const ds = (await req('GET', '/api/hanhtrinh/nhap', { cookie: GV })).data.nhap || [];
    const cuaAB = ds.filter(n => /^Nháp [AB]/.test(n.moTa));
    check('hai nháp ghi từ tab Cambridge mang đúng chương trình Cambridge',
      cuaAB.length === 2 && cuaAB.every(n => n.nhom === 'nuoc-ngoai'), ds.map(n => [n.moTa, n.nhom]));
    // Nháp C: ghi vội KHÔNG chọn chương trình — đứng ở mọi tab chương trình
    // cho tới khi cô gắn.
    await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: 'Nháp C: bé nói được ba từ chỉ màu sắc' } });
    await moMan('#/hanhtrinh/nuoc-ngoai');
    const nhapCam = await chuCua('#ht-nhap-ds');
    check('khối "Nháp chưa gắn bé" của tab Cambridge có A, B và nháp chưa chọn chương trình C',
      /Nháp A/.test(nhapCam) && /Nháp B/.test(nhapCam) && /Nháp C/.test(nhapCam), nhapCam);
    await page.click('#ht-tabs [data-tab="the-chat"]');
    await page.waitForTimeout(1500);
    const nhapPe = await chuCua('#ht-be-than');
    check('tab P.E KHÔNG hiện nháp của Cambridge, nhưng có nháp chưa chọn chương trình',
      !/Nháp A|Nháp B/.test(nhapPe) && /Nháp C/.test(nhapPe), nhapPe.slice(0, 300));
    const ds3 = (await req('GET', '/api/hanhtrinh/nhap', { cookie: GV3 })).data.nhap || [];
    check('cô khác KHÔNG nhận được nháp nào của cô này', !ds3.some(n => /^Nháp [ABC]/.test(n.moTa)), ds3);
    check('gia đình không mở được đường nháp', (await req('GET', '/api/hanhtrinh/nhap', { cookie: PH })).status === 403);
    const htPh = JSON.stringify((await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {});
    check('hành trình gia đình nhận về KHÔNG có chữ nào của nháp', !/Nháp [ABC]/.test(htPh));
  }

  // =========================================================================
  console.log('\n[1e] Gắn bé ngay tại tab Cambridge, rồi kể cho gia đình từ đó');
  {
    await moMan('#/hanhtrinh/nuoc-ngoai');
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    await page.locator('#ht-nhap-ds .list-row', { hasText: 'Nháp C' }).locator('[data-nhap-gan]').click();
    await page.waitForTimeout(500);
    check('hộp gắn bé của nháp chưa chọn chương trình đặt sẵn tab đang mở (Cambridge)',
      (await page.inputValue('#ht-gan-nhom')) === 'nuoc-ngoai', await page.inputValue('#ht-gan-nhom'));
    await page.selectOption('#ht-gan-be', 's1');
    await page.click('#ht-gan-luu');
    await page.waitForTimeout(1800);
    check('gắn xong: nháp C rời khối nháp, A và B vẫn còn',
      !/Nháp C/.test(await chuCua('#ht-nhap-ds')) && /Nháp A/.test(await chuCua('#ht-nhap-ds')) && /Nháp B/.test(await chuCua('#ht-nhap-ds')));
    const the = page.locator('#ht-be-than .card', { hasText: 'Nháp C' });
    check('và hiện thành quan sát của bé ở tab Cambridge', await the.count() === 1);
    const qs = ((await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data.quanSat || []).find(x => /^Nháp C/.test(x.moTa || ''));
    check('máy chủ ghi quan sát ấy vào chương trình Cambridge', !!qs && qs.nhomCo === 'nuoc-ngoai', qs);
    check('quan sát của chính cô có nút "Kể cho gia đình"', await the.locator('[data-cauchuyen]').count() === 1);
    await the.locator('[data-cauchuyen]').click();
    await page.waitForTimeout(800);
    await page.fill('#ht-cc', 'Hôm nay con hát bài Hello rất to và vẫy tay chào cả nhóm.');
    await page.fill('#ht-cn', 'Tối nay bố mẹ cùng con hát lại bài Hello trong 5 phút.');
    await page.click('#ht-cong-bo');
    await page.waitForTimeout(1800);
    check('kể xong: thẻ ở tab hiện "Đã kể cho gia đình"',
      /Đã kể cho gia đình/.test(await chuCua('#ht-be-than')), (await chuCua('#ht-be-than')).slice(0, 300));
    const ph = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {};
    const q = (ph.quanSat || []).find(x => /hát bài Hello rất to/.test(x.cauChuyen || ''));
    check('gia đình nhận câu chuyện, nằm ở chương trình Cambridge', !!q && q.nhomCo === 'nuoc-ngoai', q);
    check('và KHÔNG nhận ghi chép thô của cô', !!q && !q.moTa && !/Nháp [ABC]/.test(JSON.stringify(ph)), q);
  }

  // =========================================================================
  console.log('\n[1f] Cô khác: không thấy nháp của cô kia, không có nút kể chuyện thay; nút + ở Chủ đề tuần vẫn lưu được');
  {
    await dangNhap('giaovien3', '123456');
    await moMan('#/hanhtrinh/nuoc-ngoai');
    check('cô khác cùng nhóm KHÔNG thấy nháp A, B', !/Nháp A|Nháp B/.test(await page.locator('#view').innerText()));
    check('cô dạy hai nhóm có ô chọn nhóm, chỉ gồm nhóm của cô',
      (await page.locator('#ht-chon-nhom option').evaluateAll(os => os.map(o => o.value))).sort().join(',') === 'c1,c2');
    await page.selectOption('#ht-chon-nhom', 'c1');
    await page.waitForTimeout(1500);
    await page.selectOption('#ht-chon-be', 's1');
    await page.waitForTimeout(1500);
    const theKhac = page.locator('#ht-be-than .card', { hasText: 'hát bài Hello rất to' });
    check('cô khác thấy câu chuyện đã kể của bé ở tab Cambridge', await theKhac.count() === 1);
    check('nhưng KHÔNG có nút kể / sửa câu chuyện của cô kia', await theKhac.locator('[data-cauchuyen]').count() === 0);

    // Nhà trường khai cô này là cô nước ngoài của nhóm c1: màn phản ánh đúng
    // luật ghi của máy chủ (chốt chặn vẫn ở máy chủ — bài máy chủ canh).
    await req('PUT', '/api/admin/classes/c1/teachers', { cookie: QL, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'nuoc-ngoai' } } });
    await moMan('#/hanhtrinh/the-chat');
    check('tab P.E của bé: nói trước phần này do cô khác phụ trách ghi', /do cô khác phụ trách ghi/.test(await chuCua('#ht-be-than')),
      (await chuCua('#ht-be-than')).slice(0, 200));
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(500);
    check('và nút + không đặt sẵn phần cô không ghi được', (await page.inputValue('#modal-overlay #ht-nhom')) === '');
    await dongHop();
    await moMan('#/hanhtrinh/nuoc-ngoai');
    check('tab Cambridge (phần của cô): không có lời nhắc ấy', !/do cô khác phụ trách ghi/.test(await chuCua('#ht-be-than')));
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(500);
    check('và nút + đặt sẵn Cambridge', (await page.inputValue('#modal-overlay #ht-nhom')) === 'nuoc-ngoai');
    await dongHop();

    await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Chủ đề tuần' }).click();
    await page.waitForTimeout(1500);
    check('đối chứng — màn Chủ đề tuần có ô chọn nhóm của chính nó', await page.locator('#view #ht-nhom').count() === 1);
    await page.click('#ht-ghi-nhanh');
    await page.waitForTimeout(600);
    await page.selectOption('#modal-overlay #ht-be', 's3');
    await page.fill('#ht-mota', 'Bé tự xếp ghế vào bàn sau giờ chơi');
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s3', { cookie: GV3 })).data || {};
    check('nút + ở lối phụ Chủ đề tuần lưu được quan sát (ô chương trình không lẫn với ô nhóm của màn)',
      (ht.quanSat || []).some(x => /tự xếp ghế vào bàn/.test(x.moTa || '')), (ht.quanSat || []).slice(0, 2).map(x => x.moTa));
    await dongHop();
  }

  // =========================================================================
  console.log('\n[2] Gia đình: bốn tab cùng thứ tự, tên bài chia theo chương trình, KHÔNG thấy mức độ');
  {
    await dangNhap('phuhuynh', '123456');
    await moMan('#/hanhtrinh', 1500);
    const tabGd = (await page.locator('#ht-ph-tabs [data-tab]').allInnerTexts()).map(t => t.trim());
    check('bốn tab đúng thứ tự: Kế hoạch của bé / Cambridge / P.E (Thể chất) / Montessori & Kỹ năng sống',
      tabGd.join(' | ') === BON_TAB.join(' | '), tabGd);
    const t = await page.locator('#view').innerText();
    check('tab Kế hoạch: tên bài và tên góc thật (không mã trần)', /Tháp hồng/.test(t) && /Giác quan/.test(t) && !/giac-quan/.test(t), t.slice(0, 400));
    check('KHÔNG thấy mức độ hay chữ quy ước nào', !/Vượt trội|Đã vững|M · |S · /.test(t), t.slice(0, 400));
    await page.click('#ht-ph-tabs [data-tab="nuoc-ngoai"]');
    await page.waitForTimeout(800);
    // textContent: nhãn mục viết hoa bằng CSS.
    const cam = await page.locator('#view').textContent();
    check('tab Cambridge mở phần câu chuyện của chương trình đó', /Câu chuyện của con · Cambridge/.test(cam));
    check('và có câu chuyện cô vừa kể từ tab Cambridge', /hát bài Hello rất to/.test(cam), cam.slice(0, 300));
    check('không chữ nào của nháp hay ghi chép thô lọt sang', !/Nháp [ABC]/.test(cam));
    await page.click('#ht-ph-tabs [data-tab="chu-nhiem"]');
    await page.waitForTimeout(800);
    check('tab Montessori KHÔNG có câu chuyện của phần Cambridge', !/hát bài Hello rất to/.test(await page.locator('#view').textContent()));
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
