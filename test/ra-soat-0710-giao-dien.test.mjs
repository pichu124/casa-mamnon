// Bài canh VÒNG RÀ ĐỐI KHÁNG ĐỢT Đ222–Đ231 (Đ232) — phần chỉ trình duyệt thấy.
//
// Chạy bằng:  node test/ra-soat-0710-giao-dien.test.mjs   (nằm trong test:giao-dien)
//
// Phần máy chủ ở `test/ra-soat-0710.test.mjs`. Ở đây là những lỗi chỉ lộ ra
// khi bấm thật trên màn hình:
//   1. Điểm danh: chạm ảnh bé đã "có mặt" mà CHƯA có ảnh → hỏi ảnh nào, không
//      tự ghi "ra về" (và không báo gia đình "con đã được đón về" lúc sáng).
//   2. Kế hoạch của bé: đổi ô Bé khi đang sửa dở → hỏi trước, không mất im lặng.
//   3. Hành trình: (Đ232 canh câu nói dở khi bấm Lưu.) Phản hồi 20/10 (B2) bỏ
//      hẳn nút "Nói để ghi", nên mục này nay canh: trình duyệt CÓ nhận giọng
//      mà màn vẫn không hiện nút, và chữ gõ tay được lưu đúng một lần.
//   4. Kế hoạch tuần: hộp Soạn đổi sang tuần ĐÃ có kế hoạch thì nạp đúng tuần ấy.
//   5. Cambridge: sửa bài Letter có chữ ở ô khung → ô ấy hiện ra để sửa.
//   6. Tắt Lịch sinh hoạt → #/plans vẫn có kế hoạch tuần chung và nút soạn.
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, CHROMIUM, tatBannerMoiCai,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ra-soat-0710-gd');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh', 'cambridge', 'kehoach', 'tkb']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const HOM = HOM_NAY();
{
  // Bé s6 hôm nay: "Muộn 08:05", ghi tay, CHƯA có ảnh nào.
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM attendance WHERE date = ? AND studentId = ?').run(HOM, 's6');
  c.prepare('DELETE FROM attendance_photo WHERE date = ? AND studentId = ?').run(HOM, 's6');
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
             VALUES ('att_rs6', 's6', ?, 'late', '08:05', NULL, '', 't1')`).run(HOM);
  c.close();
}
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3361), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await tatBannerMoiCai(await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
}));
// Máy nhận giọng GIẢ: start() ghi lại đối tượng; stop() bắn kết quả CHỐT về
// muộn 50 ms rồi onend — đúng nhịp của trình duyệt thật. Từ B2 (20/10) app
// không còn gọi tới nó; giữ để mục [3] đo đúng cảnh "trình duyệt có hỗ trợ".
await ctx.addInitScript(() => {
  class Nhan {
    start() { window.__nhan = this; }
    stop() {
      setTimeout(() => {
        const kq = [{ transcript: 'bé tự rót nước không đổ' }]; kq.isFinal = true;
        if (this.onresult) this.onresult({ resultIndex: 0, results: [kq] });
        if (this.onend) this.onend();
      }, 50);
    }
  }
  window.SpeechRecognition = Nhan;
  window.webkitSpeechRecognition = Nhan;
});
const page = await ctx.newPage();
const loiJs = [];
page.on('pageerror', e => loiJs.push(e.message));
const hopThoai = [];
let traLoi = 'accept';
page.on('dialog', (d) => { hopThoai.push(d.message()); (traLoi === 'accept' ? d.accept() : d.dismiss()).catch(() => {}); });
const goiApi = [];
page.on('request', r => { if (r.method() !== 'GET') goiApi.push(r.url().replace(sv.BASE, '')); });

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
const moMan = async (hash) => { await page.goto(`${sv.BASE}/${hash}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000); };

try {
  const d0 = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('hieutruong', 'quantri2026')).cookie;

  // =========================================================================
  console.log('\n[1] Điểm danh: chạm ảnh bé "Muộn" chưa có ảnh → hỏi ảnh nào, không tự ghi ra về');
  {
    await dangNhap('giaovien', '123456');
    await moMan('#/attendance');
    const dong = page.locator('#att-dong-s6');
    check('đối chứng — dòng của bé s6 có trên màn', await dong.count() === 1);
    goiApi.length = 0;
    await dong.locator('span[title="Bấm để chụp ảnh"]').click();
    await page.waitForTimeout(600);
    check('mở hộp hỏi: Ảnh con tới lớp / Ảnh ra về',
      await page.locator('#att-cn-toi').count() === 1 && await page.locator('#att-cn-ve').count() === 1);
    check('KHÔNG gọi đường ghi ra về khi chưa ai chọn', !goiApi.some(u => /ra-ve/.test(u)), goiApi);
    if (await page.locator('#modal-overlay button:has-text("Quay lại")').count()) {
      await page.click('#modal-overlay button:has-text("Quay lại")');
      await page.waitForTimeout(300);
    }
    const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
    const s6 = c.prepare('SELECT status, checkOut FROM attendance WHERE studentId = ? AND date = ?').get('s6', HOM);
    c.close();
    check('bé vẫn "Muộn", chưa có giờ ra về', !!s6 && s6.status === 'late' && !s6.checkOut, s6);
    // Đ242D (góp ý D3): dòng bé không còn nút "Chụp ảnh ra về" riêng — chụp là
    // bấm tên, và bé chưa có ảnh tới lớp thì luôn qua hộp hỏi ở trên. Phép
    // kiểm giữ đúng ý cũ: dòng không mời cô bấm thẳng vào ra về.
    check('dòng KHÔNG có nút "Chụp ảnh ra về" tô nổi khi bé chưa có ảnh tới lớp',
      await dong.locator('button.primary', { hasText: 'Chụp ảnh ra về' }).count() === 0);
  }

  // =========================================================================
  console.log('\n[2] Kế hoạch của bé: đổi ô Bé khi đang sửa dở → hỏi trước');
  {
    await moMan('#/kehoachbe');
    await page.selectOption('#kb-goc', 'giac-quan').catch(() => {});
    const chip = page.locator('.kb-vung[data-goc="giac-quan"] .kb-bai').first();
    await chip.click();
    const nhanSau = await chip.getAttribute('data-nhan');
    hopThoai.length = 0;
    traLoi = 'dismiss';
    await page.selectOption('#kb-be', 's1');
    await page.waitForTimeout(500);
    traLoi = 'accept';
    check('có hộp hỏi "đang sửa dở"', hopThoai.some(m => /sửa dở/.test(m)), hopThoai);
    check('cô chọn ở lại: ô Bé về "Cả nhóm", chip vừa bấm còn nguyên',
      (await page.inputValue('#kb-be')) === '' && (await chip.getAttribute('data-nhan')) === nhanSau && !!nhanSau,
      { be: await page.inputValue('#kb-be'), nhanSau });
  }

  // =========================================================================
  console.log('\n[3] Hành trình: trình duyệt có nhận giọng nhưng KHÔNG còn nút "Nói để ghi" (B2, 20/10)');
  {
    await moMan('#/hanhtrinh');
    await page.locator('#ht-loi-phu [data-tab]', { hasText: 'Suy ngẫm cuối ngày' }).click();
    await page.waitForTimeout(1000);
    await page.click('#ht-them');
    await page.waitForTimeout(500);
    check('không có nút nói trong hộp ghi quan sát', await page.locator('.ht-noi').count() === 0);
    await page.selectOption('#ht-be', 's1');
    await page.fill('#ht-mota', 'bé tự rót nước không đổ');
    await page.click('#ht-luu');
    await page.waitForTimeout(1500);
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: (await login('giaovien', '123456')).cookie })).data || {};
    const q = (ht.quanSat || []).find(x => /tự rót nước không đổ/.test(x.moTa || ''));
    check('quan sát gõ tay được lưu đúng chữ, một lần',
      !!q && (q.moTa.match(/rót nước/g) || []).length === 1, q && q.moTa);
    check('app không khởi động nhận dạng giọng nói', !(await page.evaluate(() => !!window.__nhan)));
  }

  // =========================================================================
  console.log('\n[4] Kế hoạch tuần: đổi ngày trong hộp Soạn sang tuần ĐÃ có kế hoạch → nạp đúng tuần ấy');
  const tuanSau2 = new Date(Date.parse(`${HOM}T00:00:00Z`) + 14 * 86400000).toISOString().slice(0, 10);
  {
    await req('PUT', `/api/plans/tuan/${HOM}`, { cookie: QT, body: { tieuDe: 'TUẦN NÀY: Bé khám phá nước', noiDung: 'Khám phá: rót, đong' } });
    await req('PUT', `/api/plans/tuan/${tuanSau2}`, { cookie: QT, body: { tieuDe: 'TUẦN SAU NỮA: Gia đình của bé', noiDung: 'Ngôn ngữ: kể về gia đình' } });
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/timetable/kehoach');
    await page.click('#btn-soan-kh-tuan');
    await page.waitForTimeout(500);
    check('đối chứng — hộp mở với kế hoạch tuần đang xem', /TUẦN NÀY/.test(await page.inputValue('#kht-o-tieu-de')));
    await page.fill('#kht-o-tuan', tuanSau2);
    await page.locator('#kht-o-tuan').dispatchEvent('change');
    await page.waitForTimeout(800);
    check('đổi sang tuần đã có kế hoạch: hộp nạp đúng tiêu đề và nội dung của tuần ấy',
      /TUẦN SAU NỮA/.test(await page.inputValue('#kht-o-tieu-de')) && /gia đình/.test(await page.inputValue('#kht-o-noi-dung')),
      await page.inputValue('#kht-o-tieu-de'));
    await page.click('#modal-overlay .modal-close, #modal-overlay [onclick*="closeModal"]').catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(300);
  }

  // =========================================================================
  console.log('\n[5] Cambridge: sửa bài Letter có chữ ở ô "Chủ đề" → ô ấy HIỆN để sửa');
  {
    const bl = await req('POST', '/api/cambridge/block', { cookie: QT, body: {
      ten: 'Block thử', luaTuoi: '', tuNgay: HOM, denNgay: tuanSau2, mucTieu: 'Thử', thuTu: 1 } });
    const bai = await req('POST', '/api/cambridge', { cookie: QT, body: {
      loai: 'thu-phu-huynh', phamVi: 'truong', tieuDe: 'Thư gửi gia đình tuần này', noiDung: 'Chào gia đình',
      khung: { blockId: bl.data?.id, tuanSo: 1, luaTuoi: '', chuDe: 'Colours CHỦ ĐỀ CŨ' } } });
    check('đối chứng — tạo được bài Letter có khung', bai.status === 201, bai.data);
    await moMan('#/cambridge');
    await page.locator(`[data-sua="${bai.data?.id}"]`).click();
    await page.waitForTimeout(600);
    check('ô Chủ đề còn chữ thì HIỆN ở bài Letter', await page.locator('#cam-chu-de').isVisible()
      && (await page.inputValue('#cam-chu-de')) === 'Colours CHỦ ĐỀ CŨ');
    check('ô khung trống thì vẫn ẩn như mẫu Letter', !(await page.locator('#cam-tu-vung').isVisible()));
    await page.keyboard.press('Escape').catch(() => {});
    await moMan('#/');
  }

  // =========================================================================
  console.log('\n[6] Tắt Lịch sinh hoạt → #/plans vẫn đọc và soạn được kế hoạch tuần chung');
  {
    const tat = await req('PUT', '/api/admin/modules/tkb', { cookie: QT, body: { enabled: false } });
    check('đối chứng — tắt được Lịch sinh hoạt', tat.status === 200, tat.data);
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/plans');
    const o = page.locator('#kht-trong-plans');
    check('#/plans có khối kế hoạch tuần chung', await o.count() === 1 && /TUẦN NÀY/i.test(await o.innerText()), await o.innerText().catch(() => ''));
    check('ban giám hiệu có nút Soạn kế hoạch tuần ngay tại đây', await page.locator('#btn-soan-kh-tuan').count() === 1);
    check('không còn dòng chỉ đường sang Lịch sinh hoạt đã tắt', await page.locator('#btn-ve-lich-sinh-hoat').count() === 0);
    await req('PUT', '/api/admin/modules/tkb', { cookie: QT, body: { enabled: true } });
    await dangNhap('hieutruong', 'quantri2026');
    await moMan('#/plans');
    check('Lịch sinh hoạt bật lại: #/plans không vẽ trùng khối tuần', await page.locator('#kht-trong-plans').count() === 0);
    check('dòng chỉ đường nói đúng: kế hoạch TUẦN chung ở Lịch sinh hoạt',
      /Kế hoạch tuần chung cả trường/.test(await page.locator('#btn-ve-lich-sinh-hoat').innerText().catch(() => '')));
  }

  check('không có lỗi JavaScript', loiJs.length === 0, loiJs);
} finally {
  await ctx.close();
  await browser.close();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
