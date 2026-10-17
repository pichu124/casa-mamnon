// Bài canh NHẬT KÝ NGÀY — GHI THEO TỪNG BỮA, và "tự bỏ đi với nhóm không phải nhà trẻ".
//
// Chạy bằng:  npm run test:nhat-ky-bua
//
// Phản hồi của nhà trường 07/09, bốn ý, bốn thứ canh được bằng máy:
//
//   1. "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm một
//      loạt — tách riêng từng bữa theo thực đơn của nhà trường." → có đường ghi
//      MỘT BỮA cho cả nhóm; món lấy theo THỰC ĐƠN NGÀY ĐÓ của bếp cơ sở. (Đổi
//      16/10 — góp ý mục 7: LUÔN đủ năm bữa đúng tên của trường, kể cả ngày
//      bếp chưa soạn hay thực đơn thiếu bữa; mục [11].)
//   2. Bảng `nhatky_ngay` KHÔNG đổi cột. Bữa ghi ở bảng phụ `nhatky_bua`, và
//      ba bữa trùng cột cũ được đồng bộ ngược — app cũ còn trong máy vẫn đúng.
//   3. (Đổi 06/10 — góp ý mục 9, chủ dự án chốt "Lưu là nháp, Gửi mới thấy".)
//      Bản 07/09 báo gia đình ngay mỗi lần lưu. Nay lưu KHÔNG báo ai; tin đi
//      khi cô bấm Gửi, một tin mỗi bé, tên bữa lấy từ thực đơn. Luồng gửi đầy
//      đủ canh ở `test/nhat-ky-gui.test.mjs`; mục [7] dưới đây giữ phần nối
//      giữa ghi bữa và tin báo.
//   4. "Nhật ký ngày sẽ được tự động bỏ đi với các bạn không phải lớp nhà trẻ."
//      → /api/nhatky/pham-vi trả đúng cho từng vai, và trang chủ ẩn ô theo
//      trường `dieuKienHien` TỔNG QUÁT của module.json.
//
// Ranh giới nhà mình ↔ nhà khác vẫn canh: gia đình chỉ đọc con mình, và không
// ghi được gì.
import fs from 'fs';
import path from 'path';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, GOC, HOM_NAY as homNayVN } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhat-ky-bua');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4631), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const GV = (await login('giaovien', '123456')).cookie;       // cô nhóm c1 Chồi 2 — không có bé nhà trẻ
const GV_NT = (await login('giaovien4', '123456')).cookie;   // cô nhóm c4 Nhà trẻ 1 (s9 14 tháng, s10 34 tháng, s11 38 tháng)
const PH = (await login('phuhuynh', '123456')).cookie;       // mẹ s1 + s2 — hai bé lớn
const PH_NT = (await login('ph.trang', '123456')).cookie;    // mẹ s9 — bé nhà trẻ

const HOM_NAY = homNayVN();
const NAM_BUA = [
  { type: 'breakfast', label: 'Bữa sáng', time: '07:30', items: ['Cháo thịt bằm'] },
  { type: 'snack_sang', label: 'Bữa phụ sáng', time: '09:00', items: ['Sữa chua nếp cẩm'] },
  { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cơm', 'Cá kho', 'Canh bí đỏ'] },
  { type: 'snack', label: 'Bữa phụ chiều', time: '14:30', items: ['Bánh su kem'] },
  { type: 'milk', label: 'Sữa Vinamilk', time: '15:30', items: ['Sữa tươi 180ml'] },
];
const tenBe = async (id) => {
  const r = await req('GET', '/api/nhatky?classId=c4', { cookie: GV_NT });
  return ((r.data || {}).danhSach || []).find(b => b.studentId === id)?.hoTen || id;
};
const beCua = (r, id) => ((r.data || {}).danhSach || []).find(b => b.studentId === id) || {};
const buaCua = (b, kieu) => ((b && b.buaAn) || []).find(x => x.bua === kieu) || {};

try {
  // =========================================================================
  console.log('\n[1] Chưa có thực đơn năm bữa thì VẪN ĐỦ NĂM BỮA; bếp soạn năm bữa thì món theo bếp');
  {
    // Dữ liệu mẫu có thực đơn dùng chung ba bữa cho các ngày trong tuần; cuối
    // tuần thì không có thực đơn. Cả hai trường hợp đều phải đủ năm bữa
    // (góp ý 16/10, mục 7 — trước đó là ba bữa mặc định).
    const r = await req('GET', '/api/nhatky?classId=c4', { cookie: GV_NT });
    check('cô nhà trẻ mở được màn nhóm', r.status === 200, r.status);
    const ds = (r.data || {}).buaAn || [];
    check('máy chủ gửi kèm danh sách bữa của NGÀY ĐÓ', Array.isArray(ds) && ds.length === 5, ds.length);
    check('đủ năm bữa của trường, đúng thứ tự, khi chưa có thực đơn năm bữa',
      ds.map(b => b.bua).join(',') === 'breakfast,snack_sang,lunch,snack,milk', ds.map(b => b.bua));
    check('từng bé cũng có buaAn cùng số bữa, mỗi bữa muc rỗng = cô chưa ghi',
      (r.data.danhSach || []).every(b => Array.isArray(b.buaAn) && b.buaAn.length === ds.length && b.buaAn.every(x => x.muc === '')),
      JSON.stringify((r.data.danhSach || [])[0]?.buaAn || []).slice(0, 200));

    // Văn phòng soạn thực đơn NĂM BỮA cho bếp cơ sở 1 (c4 thuộc cs1).
    const td = await req('PUT', `/api/menu/${HOM_NAY}`, { cookie: C1, body: { campusId: 'cs1', meals: NAM_BUA } });
    check('đối chứng — soạn được thực đơn năm bữa cho bếp cs1', td.status === 200, `${td.status} ${JSON.stringify(td.data).slice(0, 120)}`);

    const r2 = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    const ds2 = (r2.data || {}).buaAn || [];
    check('NAY CÓ ĐÚNG NĂM BỮA, đúng thứ tự bếp soạn',
      ds2.map(b => b.bua).join(',') === 'breakfast,snack_sang,lunch,snack,milk', ds2.map(b => b.bua).join(','));
    check('mỗi bữa mang tên, giờ và món của bếp — cô không phải gõ lại',
      ds2[2] && ds2[2].ten === 'Bữa trưa' && ds2[2].gio === '10:45' && ds2[2].mon.join(',') === 'Cơm,Cá kho,Canh bí đỏ',
      JSON.stringify(ds2[2]));
    // Nhóm c3 (cs2) không có bếp riêng: vẫn ba bữa dùng chung, không lây thực đơn cs1.
    const r3 = await req('GET', `/api/nhatky?classId=c1&ngay=${HOM_NAY}`, { cookie: GV });
    check('nhóm cùng cơ sở cs1 (Chồi 2) cũng thấy năm bữa của bếp mình', ((r3.data || {}).buaAn || []).length === 5, ((r3.data || {}).buaAn || []).length);
  }

  // =========================================================================
  console.log('\n[2] Ghi MỘT BỮA cho cả nhóm, một giao dịch — và đồng bộ ngược vào cột cũ');
  {
    const truoc = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    const gocS9 = buaCua(beCua(truoc, 's9'), 'snack_sang').capNhatLuc || '';

    const r = await req('PUT', '/api/nhatky/bua', {
      cookie: GV_NT,
      body: {
        classId: 'c4', ngay: HOM_NAY, bua: 'snack_sang',
        danhSach: [
          { studentId: 's9', muc: 'het', ghiChu: 'ăn ngon', capNhatLucGoc: gocS9 },
          { studentId: 's10', muc: 'nua-suat', capNhatLucGoc: '' },
          { studentId: 's11', muc: '', capNhatLucGoc: '' },
        ],
      },
    });
    check('ghi được bữa phụ sáng cho cả nhóm', r.status === 200 && r.data.ok === true, `${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
    check('máy chủ nói đã ghi 3 bé, không xung đột', r.data.daGhi === 3 && (r.data.xungDot || []).length === 0, JSON.stringify(r.data));
    check('LƯU LÀ NHÁP: không báo ai (daBao 0), nhưng máy chủ vẫn đếm đúng 2 bé có gì mới — bé để trống thì không',
      r.data.daBao === 0 && r.data.daDoi === 2, JSON.stringify({ daBao: r.data.daBao, daDoi: r.data.daDoi }));

    const sau = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    const b9 = buaCua(beCua(sau, 's9'), 'snack_sang');
    check('mở lại thấy đúng mức và ghi chú của bữa đó', b9.muc === 'het' && b9.ghiChu === 'ăn ngon', JSON.stringify(b9));
    check('bữa khác của bé vẫn trống', buaCua(beCua(sau, 's9'), 'lunch').muc === '');
    check('bữa phụ sáng KHÔNG có cột cũ nên anSang/anTrua/anXe vẫn trống',
      !beCua(sau, 's9').anSang && !beCua(sau, 's9').anTrua && !beCua(sau, 's9').anXe);
    check('nhưng ngày đó đã CÓ DÒNG ở nhatky_ngay (daGhi) — trang chủ đếm "đã ghi nhật ký" đúng', beCua(sau, 's9').daGhi === true);
    check('bé để trống thì không sinh dòng bữa, và vẫn chưa có dòng ngày', beCua(sau, 's11').daGhi === false && buaCua(beCua(sau, 's11'), 'snack_sang').muc === '');

    // Bữa trưa: có cột cũ anTrua → phải đồng bộ ngược.
    const r2 = await req('PUT', '/api/nhatky/bua', {
      cookie: GV_NT,
      body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'it' }, { studentId: 's10', muc: 'het' }] },
    });
    check('ghi được bữa trưa', r2.status === 200 && r2.data.daGhi === 2, JSON.stringify(r2.data).slice(0, 120));
    const sau2 = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    check('ĐỒNG BỘ NGƯỢC: cột anTrua của nhatky_ngay = mức bữa lunch', beCua(sau2, 's9').anTrua === 'it' && beCua(sau2, 's10').anTrua === 'het',
      `${beCua(sau2, 's9').anTrua} / ${beCua(sau2, 's10').anTrua}`);
    check('và buaAn.lunch cũng nói y vậy', buaCua(beCua(sau2, 's9'), 'lunch').muc === 'it');
  }

  // =========================================================================
  console.log('\n[3] Hai cô cùng ghi một bữa: người lưu sau KHÔNG xoá người lưu trước');
  {
    const manA = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });   // cô A mở màn
    const gocA = buaCua(beCua(manA, 's9'), 'lunch').capNhatLuc;
    // Văn phòng (như cô B) ghi đè bữa trưa của s9 trong lúc màn cô A đang mở.
    const b = await req('PUT', '/api/nhatky/bua', {
      cookie: C1, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'gan-het' }] },
    });
    check('đối chứng — cô B ghi được', b.status === 200 && b.data.daGhi === 1, JSON.stringify(b.data).slice(0, 100));
    const a = await req('PUT', '/api/nhatky/bua', {
      cookie: GV_NT,
      body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'khong-an', capNhatLucGoc: gocA }, { studentId: 's10', muc: 'it', capNhatLucGoc: buaCua(beCua(manA, 's10'), 'lunch').capNhatLuc }] },
    });
    check('cô A lưu: bé cô B vừa ghi bị BỎ QUA và được nói ra', a.status === 200 && (a.data.xungDot || []).map(x => x.studentId).join() === 's9', JSON.stringify(a.data).slice(0, 200));
    check('bé còn lại vẫn lưu bình thường', a.data.daGhi === 1);
    const sau = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    check('phần cô B ghi còn nguyên', buaCua(beCua(sau, 's9'), 'lunch').muc === 'gan-het' && beCua(sau, 's9').anTrua === 'gan-het');
    check('lời nhắc nói tiếng của trường, không lộ thuật ngữ', /cô khác vừa ghi/.test(a.data.nhac || ''), a.data.nhac);
  }

  // =========================================================================
  console.log('\n[4] Đường PUT cũ vẫn nguyên, và thêm `truong` để ghi MỘT BƯỚC không đụng bước khác');
  {
    // Bước Ngủ trưa: chỉ ba cột ngủ.
    const r = await req('PUT', '/api/nhatky', {
      cookie: GV_NT,
      body: { ngay: HOM_NAY, truong: ['nguTuLuc', 'nguDenLuc', 'nguGhiChu'], danhSach: [{ studentId: 's9', nguTuLuc: '11:30', nguDenLuc: '14:00' }] },
    });
    check('ghi được bước ngủ', r.status === 200 && r.data.daGhi === 1, JSON.stringify(r.data).slice(0, 120));
    const sau = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    check('giờ ngủ vào đúng chỗ', beCua(sau, 's9').nguTuLuc === '11:30' && beCua(sau, 's9').nguDenLuc === '14:00');
    check('BỮA TRƯA ĐÃ GHI KHÔNG BỊ XOÁ dù bước ngủ không gửi cột ăn', beCua(sau, 's9').anTrua === 'gan-het' && buaCua(beCua(sau, 's9'), 'lunch').muc === 'gan-het',
      `${beCua(sau, 's9').anTrua} / ${buaCua(beCua(sau, 's9'), 'lunch').muc}`);

    const sai = await req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: HOM_NAY, truong: ['capNhatLuc'], danhSach: [{ studentId: 's9' }] } });
    check('tên cột ngoài danh sách thì từ chối', sai.status === 400, sai.status);

    // App ĐỜI CŨ: gửi đủ mọi cột, không có `truong` → ghi như trước, và anXe
    // phải chảy XUÔI sang bảng từng bữa.
    const cu = await req('PUT', '/api/nhatky', {
      cookie: GV_NT,
      body: { ngay: HOM_NAY, danhSach: [{ studentId: 's10', anSang: 'het', anTrua: 'het', anXe: 'nua-suat', nguTuLuc: '11:15', nguDenLuc: '14:15', veSinhSoLan: 2 }] },
    });
    check('app cũ ghi trọn bản ghi vẫn được', cu.status === 200 && cu.data.daGhi === 1, JSON.stringify(cu.data).slice(0, 120));
    const sau2 = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_NAY}`, { cookie: GV_NT });
    check('ĐỒNG BỘ XUÔI: bữa xế ghi bằng app cũ hiện đúng ở buaAn.snack', buaCua(beCua(sau2, 's10'), 'snack').muc === 'nua-suat', JSON.stringify(beCua(sau2, 's10').buaAn));
    check('bữa trưa ghi bằng app cũ đè lên bữa trưa ở bảng bữa (một sự thật, không hai)', buaCua(beCua(sau2, 's10'), 'lunch').muc === 'het');
  }

  // =========================================================================
  console.log('\n[5] Gia đình thấy đúng NĂM bữa với tên món của con mình — nhà khác không thấy, và không ghi được');
  {
    // LƯU LÀ NHÁP (góp ý 06/10, mục 9): trước khi cô bấm Gửi, gia đình chưa thấy gì.
    const truocGui = await req('GET', `/api/nhatky?studentId=s9&tu=${HOM_NAY}&den=${HOM_NAY}`, { cookie: PH_NT });
    check('trước khi cô bấm Gửi, gia đình chưa thấy bản cô đang ghi',
      truocGui.status === 200 && ((truocGui.data || {}).ngayCo || []).length === 0, JSON.stringify(truocGui.data).slice(0, 160));
    const gui = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, phan: 'an', studentIds: ['s9'] } });
    check('cô bấm Gửi phần ăn uống của s9', gui.status === 200 && gui.data.daGui === 1, JSON.stringify(gui.data).slice(0, 160));

    const r = await req('GET', `/api/nhatky?studentId=s9&tu=${HOM_NAY}&den=${HOM_NAY}`, { cookie: PH_NT });
    check('mẹ s9 đọc được nhật ký con', r.status === 200, r.status);
    const ngay = ((r.data || {}).ngayCo || [])[0] || {};
    const ds = ngay.buaAn || [];
    check('có đúng năm bữa theo thực đơn ngày đó', ds.map(b => b.bua).join(',') === 'breakfast,snack_sang,lunch,snack,milk', ds.map(b => b.bua).join(','));
    check('mỗi bữa có tên món của bếp', ds.every(b => (b.mon || []).length > 0), JSON.stringify(ds.map(b => b.mon)));
    check('bữa phụ sáng: mức "ăn hết" và ghi chú của cô', buaCua(ngay, 'snack_sang').muc === 'het' && buaCua(ngay, 'snack_sang').ghiChu === 'ăn ngon');
    check('bữa trưa: đúng mức cô B ghi sau cùng', buaCua(ngay, 'lunch').muc === 'gan-het');
    check('bữa chưa ghi thì muc rỗng — màn hình nói "cô chưa ghi"', buaCua(ngay, 'milk').muc === '');
    check('thực đơn đời cũ (ba ô) vẫn gửi kèm cho app cũ', ngay.thucDon && ngay.thucDon.anTrua && ngay.thucDon.anTrua.mon.includes('Cá kho'));

    const khac = await req('GET', `/api/nhatky?studentId=s9&tu=${HOM_NAY}&den=${HOM_NAY}`, { cookie: PH });
    check('NHÀ KHÁC không đọc được', khac.status === 403, khac.status);
    const ghi = await req('PUT', '/api/nhatky/bua', { cookie: PH_NT, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('gia đình không ghi được bữa', ghi.status === 403, ghi.status);
    const nhom = await req('GET', '/api/nhatky?classId=c4', { cookie: PH_NT });
    check('gia đình không xem được cả nhóm', nhom.status === 403, nhom.status);
  }

  // =========================================================================
  console.log('\n[6] Từ chối đúng chỗ: ngày chưa tới, bữa không có trong thực đơn, mức lạ, nhóm không phải của cô');
  {
    const mai = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const a = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: { classId: 'c4', ngay: mai, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('ngày chưa tới → 400', a.status === 400, a.status);
    const b = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, bua: 'tiec-ngot', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('bữa bếp không nấu → 400', b.status === 400, b.status);
    const c = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'chin-phan' }] } });
    check('mức ăn lạ → 400', c.status === 400, c.status);
    const d = await req('PUT', '/api/nhatky/bua', { cookie: GV, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('cô nhóm khác → 403', d.status === 403, d.status);
    const e = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's1', muc: 'het' }] } });
    check('bé không thuộc nhóm gửi lên → 403', e.status === 403, e.status);
  }

  // =========================================================================
  console.log('\n[7] Lưu là NHÁP — tin đi khi cô bấm GỬI, một tin mỗi bé, gửi lại y hệt thì im (đổi 06/10)');
  {
    const truoc = await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT });
    const rieng = (truoc.data || []).filter(n => n.laRiengBe && n.loai === 'nhatky');
    const ten = await tenBe('s9');
    check('mẹ s9 có ĐÚNG MỘT tin — của lần Gửi ở mục [5]; các lần LƯU ở trên không sinh tin', rieng.length === 1, rieng.map(n => n.title).join(' | '));

    // Lưu lại Y HỆT → vẫn không tin nào.
    const lap = await req('PUT', '/api/nhatky/bua', { cookie: C1, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'gan-het' }] } });
    check('lưu lại y hệt: máy chủ nhận nhưng không báo ai', lap.status === 200 && lap.data.daBao === 0, JSON.stringify(lap.data).slice(0, 100));

    // Ghi bữa sữa rồi GỬI phần ăn uống → đúng MỘT tin, tên bữa lấy từ thực đơn.
    await req('PUT', '/api/nhatky/bua', { cookie: C1, body: { classId: 'c4', ngay: HOM_NAY, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'het' }, { studentId: 's10', muc: 'het' }] } });
    const gui = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, phan: 'an', studentIds: ['s9'] } });
    check('cô bấm Gửi phần ăn uống cho s9', gui.status === 200 && gui.data.daGui === 1, JSON.stringify(gui.data).slice(0, 160));
    const sau = await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT });
    const tin = (sau.data || []).filter(n => n.laRiengBe && n.loai === 'nhatky');
    check('mẹ s9 nhận thêm đúng MỘT tin', tin.length === 2, tin.length);
    check('tin gọi đúng phần, tên bé, và nói là cô vừa cập nhật', (tin[0] || {}).title === `Ăn uống của ${ten} — cô vừa cập nhật`, (tin[0] || {}).title);
    // Đổi 16/10 (góp ý mục 7): năm bữa chuẩn LUÔN mang tên của trường — thực
    // đơn ghi "Sữa Vinamilk" vẫn là "Bữa sữa chiều" — và mỗi bữa đọc thành câu
    // "<bữa>: <món> — con <mức>".
    check('tin đọc "<bữa>: <món của bếp> — con <mức>", tên bữa là tên chuẩn của trường',
      /Bữa sữa chiều: Sữa tươi 180ml — con ăn hết/.test((tin[0] || {}).body || '')
      && /Bữa phụ sáng: Sữa chua nếp cẩm — con ăn hết/.test((tin[0] || {}).body || '')
      && !/Sữa Vinamilk/.test((tin[0] || {}).body || ''), (tin[0] || {}).body);
    check('tin mở đúng màn Nhật ký', tin.every(n => n.hash === '#/nhatky'));
    check('nhà khác KHÔNG có tin về s9', !((await req('GET', '/api/notifications/rieng-be', { cookie: PH })).data || []).some(n => n.studentId === 's9'));

    const lai = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, phan: 'an', studentIds: ['s9'] } });
    const soLai = ((await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT })).data || []).filter(n => n.laRiengBe && n.loai === 'nhatky').length;
    check('KHÔNG LẶP: gửi lại khi không đổi gì thì không có tin mới', lai.data.daGui === 0 && soLai === 2, `${lai.data.daGui} / ${soLai}`);
  }

  // =========================================================================
  console.log('\n[8] "Tự bỏ đi với nhóm không phải nhà trẻ": /api/nhatky/pham-vi đúng cho từng vai');
  {
    const pv = async (cookie) => (await req('GET', '/api/nhatky/pham-vi', { cookie })).data;
    check('cô Chồi 2 (không có bé nhà trẻ) → hien: false', (await pv(GV)).hien === false, JSON.stringify(await pv(GV)));
    check('cô Nhà trẻ 1 → hien: true', (await pv(GV_NT)).hien === true);
    check('mẹ s9 (14 tháng) → hien: true', (await pv(PH_NT)).hien === true);
    check('mẹ s1 + s2 (hai bé lớn) → hien: false', (await pv(PH)).hien === false);
    check('văn phòng → luôn hien: true', (await pv(C1)).hien === true);
    // Ẩn ô KHÔNG phải chặn API: cô Chồi 2 vẫn đọc được nhật ký nhóm mình.
    const van = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
    check('ẩn ô chứ không khoá đường: cô Chồi 2 vẫn mở được API', van.status === 200, van.status);
  }

  // =========================================================================
  console.log('\n[9] Cơ chế ẩn ô là TỔNG QUÁT theo `dieuKienHien`, không viết tên phân hệ vào trang chủ');
  {
    const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/nhatky/module.json'), 'utf8'));
    check('module.json khai dieuKienHien trỏ vào đường của chính phân hệ', mj.dieuKienHien === '/api/nhatky/pham-vi', mj.dieuKienHien);
    const mods = await req('GET', '/api/modules', { cookie: GV });
    const nk = (mods.data || []).find(m => m.key === 'nhatky');
    check('GET /api/modules đưa dieuKienHien xuống cho trình duyệt — phân hệ vẫn CÓ trong danh sách', nk && nk.dieuKienHien === '/api/nhatky/pham-vi', JSON.stringify(nk));
    const khac = (mods.data || []).find(m => m.key !== 'nhatky');
    check('phân hệ không khai thì null, không undefined — hình dạng ổn định', khac && khac.dieuKienHien === null, JSON.stringify(khac && khac.dieuKienHien));

    const dash = fs.readFileSync(path.join(GOC, 'public/js/views/dashboard.js'), 'utf8');
    check('trang chủ có hàm xử lý dieuKienHien', /apDieuKienHien\(/.test(dash));
    check('gọi song song cho mọi ô có điều kiện (Promise.all)', /apDieuKienHien[\s\S]*?Promise\.all/.test(dash));
    check('chỉ { hien: false } mới bỏ ô; lỗi thì vẫn hiện', /hien === false/.test(dash) && /catch \(_\) \{ hien = true; \}/.test(dash));
    const thanDash = dash.slice(dash.indexOf('async apDieuKienHien('), dash.indexOf('async napHomNayCo('));
    check('KHÔNG viết chữ "nhatky" trong phần xử lý — làm tổng quát theo trường', !/nhatky/.test(thanDash));
    check('nút việc "hôm nay" cũng thôi mời khi ô đã ẩn', /_anView\.has\(view\)/.test(dash));
    const readme = fs.readFileSync(path.join(GOC, 'modules/README.md'), 'utf8');
    check('modules/README.md tả trường mới trong bảng module.json', /`dieuKienHien`/.test(readme));
    const view = fs.readFileSync(path.join(GOC, 'modules/nhatky/view.js'), 'utf8');
    check('màn cô mở với nhóm toàn bé lớn thì nói nhẹ nhàng, không phải lỗi', /không có bé nhà trẻ nên không dùng Nhật ký ngày/.test(view));
  }

  // =========================================================================
  console.log('\n[10] Bảng cũ không đổi cột; bảng mới chỉ CREATE IF NOT EXISTS');
  {
    const sql = fs.readFileSync(path.join(GOC, 'modules/nhatky/schema.sql'), 'utf8');
    const dauBang = sql.indexOf('nhatky_ngay (');
    const cotCu = sql.slice(sql.indexOf('\n', dauBang) + 1, sql.indexOf(');', dauBang))
      .split('\n').map(l => l.trim().split(/\s+/)[0]).filter(c => /^[a-zA-Z]/.test(c));
    check('nhatky_ngay vẫn đúng 18 cột như trước', cotCu.length === 18
      && cotCu.join(',') === 'id,studentId,ngay,anSang,anTrua,anXe,anGhiChu,nguTuLuc,nguDenLuc,nguGhiChu,veSinhSoLan,veSinhTinhChat,bimSoLan,buBinhSoLan,buBinhMl,ghiChu,nguoiGhi,capNhatLuc',
      cotCu.join(','));
    check('có bảng phụ nhatky_bua khoá (bé, ngày, bữa)', /CREATE TABLE IF NOT EXISTS nhatky_bua/.test(sql) && /UNIQUE INDEX IF NOT EXISTS \w+ ON nhatky_bua\(studentId, ngay, bua\)/.test(sql));
    check('không ALTER / DROP / DELETE / TRIGGER', !/\b(ALTER|DROP|DELETE|TRIGGER)\b/i.test(sql));
    const routes = fs.readFileSync(path.join(GOC, 'modules/nhatky/routes.js'), 'utf8');
    check('ghi bữa đi qua canAccessClass VÀ canAccessStudent', /\/api\/nhatky\/bua[\s\S]*?canAccessClass[\s\S]*?canAccessStudent/.test(routes));
    check('ghi xong gọi lib/thong-bao-be, không ghi thẳng bảng thongbao_be', /thong-bao-be/.test(routes) && !/INSERT INTO thongbao_be/.test(routes));
  }

  // =========================================================================
  console.log('\n[11] LUÔN ĐỦ NĂM BỮA ĐÚNG TÊN, món nối từ thực đơn hôm đó (góp ý 16/10, mục 7)');
  {
    // Trường: "Bữa sáng / Bữa Phụ Sáng / Bữa trưa / bữa phụ chiều / Bữa sữa
    // chiều. Phần ăn uống từng bữa sẽ link thực đơn của hôm đó qua và thể hiện
    // như bữa sáng bánh bao xá xíu - con ăn hết".
    const NAM = 'breakfast,snack_sang,lunch,snack,milk';
    const TEN = 'Bữa sáng,Bữa phụ sáng,Bữa trưa,Bữa phụ chiều,Bữa sữa chiều';
    const lui = (n) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

    // (a) Ngày bếp chưa soạn gì (dữ liệu mẫu chỉ có thực đơn tuần này và tuần sau).
    const NGAY_TRONG = lui(40);
    const a = await req('GET', `/api/nhatky?classId=c4&ngay=${NGAY_TRONG}`, { cookie: GV_NT });
    const dsA = (a.data || {}).buaAn || [];
    check('ngày chưa có thực đơn: vẫn đủ NĂM bữa, đúng thứ tự của trường', dsA.map(b => b.bua).join(',') === NAM, dsA.map(b => b.bua));
    check('và đúng năm tên của trường', dsA.map(b => b.ten).join(',') === TEN, dsA.map(b => b.ten));
    check('chưa có thực đơn thì không bữa nào có món — không bịa món', dsA.every(b => Array.isArray(b.mon) && !b.mon.length), dsA.map(b => b.mon));
    check('từng bé cũng đủ năm bữa', ((a.data || {}).danhSach || []).every(b => (b.buaAn || []).map(x => x.bua).join(',') === NAM),
      JSON.stringify(((a.data || {}).danhSach || [])[0]?.buaAn || []).slice(0, 200));

    // (b) Thực đơn đời cũ: ba bữa, nhãn "Bữa xế", kèm một bữa lạ.
    const NGAY_CU = lui(41);
    const td = await req('PUT', `/api/menu/${NGAY_CU}`, { cookie: C1, body: { campusId: 'cs1', meals: [
      { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: ['Bánh bao xá xíu'] },
      { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cơm', 'Thịt kho trứng'] },
      { type: 'snack', label: 'Bữa xế', time: '14:30', items: ['Chè đậu xanh'] },
      { type: 'other', label: 'Tiệc sinh nhật', time: '15:00', items: ['Bánh kem'] },
    ] } });
    check('đối chứng — soạn được thực đơn ba bữa nhãn cũ (kèm một bữa lạ) cho bếp cs1', td.status === 200, `${td.status} ${JSON.stringify(td.data).slice(0, 120)}`);
    const b = await req('GET', `/api/nhatky?classId=c4&ngay=${NGAY_CU}`, { cookie: GV_NT });
    const dsB = (b.data || {}).buaAn || [];
    const buaB = (k) => dsB.find(x => x.bua === k) || {};
    check('thực đơn chỉ ba bữa: vẫn đủ năm bữa, bữa lạ của thực đơn nối phía sau', dsB.map(x => x.bua).join(',') === `${NAM},other`, dsB.map(x => x.bua));
    check('"Bữa xế" của thực đơn cũ hiện thành "Bữa phụ chiều", kèm đúng món của bếp',
      buaB('snack').ten === 'Bữa phụ chiều' && (buaB('snack').mon || []).join(',') === 'Chè đậu xanh', buaB('snack'));
    check('bữa sáng mang món và giờ của bếp', (buaB('breakfast').mon || []).join(',') === 'Bánh bao xá xíu' && buaB('breakfast').gio === '07:00', buaB('breakfast'));
    check('bữa thực đơn ngày đó không có thì không có món', !(buaB('snack_sang').mon || [1]).length && !(buaB('milk').mon || [1]).length,
      [buaB('snack_sang'), buaB('milk')]);
    check('bữa lạ giữ nhãn của thực đơn', buaB('other').ten === 'Tiệc sinh nhật', buaB('other'));

    // (c) Ghi được cả bữa mà thực đơn ngày đó không có.
    const c = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_CU, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('ghi được Bữa sữa chiều cho ngày thực đơn không có bữa sữa', c.status === 200 && c.data.daGhi === 1, `${c.status} ${JSON.stringify(c.data).slice(0, 120)}`);
    const c2 = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_TRONG, bua: 'snack_sang', danhSach: [{ studentId: 's9', muc: 'it' }] } });
    check('ghi được Bữa phụ sáng cho ngày chưa có thực đơn', c2.status === 200 && c2.data.daGhi === 1, `${c2.status} ${JSON.stringify(c2.data).slice(0, 120)}`);
    const c3 = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_TRONG, bua: 'other', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('bữa lạ mà thực đơn ngày đó không có thì vẫn từ chối', c3.status === 400, c3.status);

    // (d) Gia đình đọc "Bữa sáng: Bánh bao xá xíu — con ăn hết".
    await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_CU, bua: 'breakfast', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_CU, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'nua-suat' }] } });
    const gui = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY_CU, phan: 'an', studentIds: ['s9'] } });
    check('cô gửi phần ăn uống của ngày đó', gui.status === 200 && gui.data.daGui === 1, JSON.stringify(gui.data).slice(0, 160));
    const tin = (((await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT })).data || [])
      .filter(n => n.laRiengBe && n.loai === 'nhatky')[0] || {}).body || '';
    check('tin báo: "Bữa sáng: Bánh bao xá xíu — con ăn hết"', tin.includes('Bữa sáng: Bánh bao xá xíu — con ăn hết'), tin);
    check('mức khác viết thành câu: "— con ăn khoảng nửa suất"', tin.includes('Bữa trưa: Cơm, Thịt kho trứng — con ăn khoảng nửa suất'), tin);
    check('bữa không có món: "Bữa sữa chiều — con ăn hết"', tin.includes('Bữa sữa chiều — con ăn hết'), tin);
    check('không nhắc bú bình khi cô không ghi số bú bình', !/Bú bình/.test(tin), tin);
    const doc = await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY_CU}&den=${NGAY_CU}`, { cookie: PH_NT });
    const nd = ((doc.data || {}).ngayCo || [])[0] || {};
    const buaPH = (k) => (nd.buaAn || []).find(x => x.bua === k) || {};
    check('gia đình đọc đủ năm bữa của ngày đó (và bữa lạ)', (nd.buaAn || []).map(x => x.bua).join(',') === `${NAM},other`, (nd.buaAn || []).map(x => x.bua));
    check('gia đình đọc "Bữa phụ chiều" kèm món, không phải "Bữa xế"', buaPH('snack').ten === 'Bữa phụ chiều' && (buaPH('snack').mon || []).join() === 'Chè đậu xanh', buaPH('snack'));
    check('và bữa sáng: món của bếp + mức cô ghi', (buaPH('breakfast').mon || []).join() === 'Bánh bao xá xíu' && buaPH('breakfast').muc === 'het', buaPH('breakfast'));
    check('nhà khác vẫn không đọc được', (await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY_CU}&den=${NGAY_CU}`, { cookie: PH })).status === 403);

    // Đường ghi bú bình của app đời cũ vẫn nhận; có số thì tin mới nhắc.
    const bb = await req('PUT', '/api/nhatky', { cookie: GV_NT, body: {
      ngay: NGAY_CU, truong: ['buBinhSoLan', 'buBinhMl'], danhSach: [{ studentId: 's9', buBinhSoLan: 2, buBinhMl: 120 }] } });
    check('đường ghi bú bình cũ vẫn nhận (app cũ còn trong máy)', bb.status === 200 && bb.data.daGhi === 1, JSON.stringify(bb.data).slice(0, 120));
    await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY_CU, phan: 'an', studentIds: ['s9'] } });
    const tin2 = (((await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT })).data || [])
      .filter(n => n.laRiengBe && n.loai === 'nhatky')[0] || {}).body || '';
    check('có số bú bình thì tin có nhắc', /Bú bình 2 lần \(120 ml\)/.test(tin2), tin2);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
