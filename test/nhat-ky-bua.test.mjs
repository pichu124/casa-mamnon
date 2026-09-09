// Bài canh NHẬT KÝ NGÀY — GHI THEO TỪNG BỮA, và "tự bỏ đi với nhóm không phải nhà trẻ".
//
// Chạy bằng:  npm run test:nhat-ky-bua
//
// Phản hồi của nhà trường 07/09, bốn ý, bốn thứ canh được bằng máy:
//
//   1. "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm một
//      loạt — tách riêng từng bữa theo thực đơn của nhà trường." → có đường ghi
//      MỘT BỮA cho cả nhóm; bữa lấy theo THỰC ĐƠN NGÀY ĐÓ của bếp cơ sở (năm
//      bữa), không có thực đơn thì ba bữa mặc định.
//   2. Bảng `nhatky_ngay` KHÔNG đổi cột. Bữa ghi ở bảng phụ `nhatky_bua`, và
//      ba bữa trùng cột cũ được đồng bộ ngược — app cũ còn trong máy vẫn đúng.
//   3. Ghi xong là gia đình có tin riêng ("Bữa trưa của An đã được cô ghi"),
//      một lần lưu = tối đa một tin mỗi bé, lưu lại y hệt thì không có tin.
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
  console.log('\n[1] Không có thực đơn riêng thì có BA BỮA MẶC ĐỊNH; bếp soạn NĂM bữa thì có năm bước');
  {
    // Dữ liệu mẫu có thực đơn dùng chung ba bữa cho tuần này — hôm nay là ngày
    // trong tuần thì thấy ba, cuối tuần thì cũng về ba bữa mặc định.
    const r = await req('GET', '/api/nhatky?classId=c4', { cookie: GV_NT });
    check('cô nhà trẻ mở được màn nhóm', r.status === 200, r.status);
    const ds = (r.data || {}).buaAn || [];
    check('máy chủ gửi kèm danh sách bữa của NGÀY ĐÓ', Array.isArray(ds) && ds.length >= 3, ds.length);
    check('có đủ sáng / trưa / xế khi chưa có thực đơn năm bữa',
      ['breakfast', 'lunch', 'snack'].every(k => ds.some(b => b.bua === k)), ds.map(b => b.bua));
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
    check('chỉ 2 bé có gì mới được BÁO gia đình — bé để trống thì không', r.data.daBao === 2, r.data.daBao);

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
  console.log('\n[7] Gia đình được BÁO ngay khi cô ghi — một lần lưu, một tin mỗi bé, lưu lại y hệt thì im');
  {
    const truoc = await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT });
    const rieng = (truoc.data || []).filter(n => n.laRiengBe && n.loai === 'nhatky');
    const ten = await tenBe('s9');
    check('mẹ s9 đã có tin riêng loại nhatky từ các lần cô ghi ở trên', rieng.length >= 3, rieng.length);
    check('tin bữa trưa gọi đúng tên bữa và tên bé', rieng.some(n => n.title === `Bữa trưa của ${ten} đã được cô ghi`), rieng.map(n => n.title).join(' | '));
    check('tin bữa phụ sáng mang mức ăn và ghi chú làm nội dung', rieng.some(n => n.title.startsWith('Bữa phụ sáng của') && /Ăn hết · ăn ngon/.test(n.body)), rieng.map(n => n.body).join(' | '));
    check('tin giấc trưa từ bước ngủ', rieng.some(n => n.title === `Giấc trưa của ${ten} đã được cô ghi`), rieng.map(n => n.title).join(' | '));
    check('tin mở đúng màn Nhật ký', rieng.every(n => n.hash === '#/nhatky'));
    check('nhà khác KHÔNG có tin về s9', !((await req('GET', '/api/notifications/rieng-be', { cookie: PH })).data || []).some(n => n.studentId === 's9'));

    // Lưu lại Y HỆT → không tin mới.
    const lap = await req('PUT', '/api/nhatky/bua', { cookie: C1, body: { classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'gan-het' }] } });
    check('lưu lại y hệt: máy chủ nhận nhưng không báo ai', lap.status === 200 && lap.data.daBao === 0, JSON.stringify(lap.data).slice(0, 100));
    const giua = await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT });
    const soGiua = (giua.data || []).filter(n => n.laRiengBe && n.loai === 'nhatky').length;
    check('KHÔNG LẶP: số tin không đổi', soGiua === rieng.length, `${rieng.length} → ${soGiua}`);

    // Đổi thật → đúng MỘT tin thêm.
    await req('PUT', '/api/nhatky/bua', { cookie: C1, body: { classId: 'c4', ngay: HOM_NAY, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'het' }, { studentId: 's10', muc: 'het' }] } });
    const sau = await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT });
    const soSau = (sau.data || []).filter(n => n.laRiengBe && n.loai === 'nhatky').length;
    check('ghi bữa sữa → mẹ s9 thêm đúng một tin', soSau === soGiua + 1, `${soGiua} → ${soSau}`);
    check('tên bữa lấy từ thực đơn ("Sữa Vinamilk"), không tự đặt', ((sau.data || [])[0] || {}).title === `Sữa Vinamilk của ${ten} đã được cô ghi`, ((sau.data || [])[0] || {}).title);
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
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
