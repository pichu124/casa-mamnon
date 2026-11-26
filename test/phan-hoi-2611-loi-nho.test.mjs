// Bài canh phần MÁY CHỦ của các lỗi nhỏ ở đợt kiểm thử thay trường 26/11 (Đ261d).
//
// Chạy bằng:  node test/phan-hoi-2611-loi-nho.test.mjs
//
//   1. R2-L4 — văn phòng cho "Nghỉ có phép" một ngày mà máy đã gợi ý "Gửi đơn
//      sau 7 giờ sáng" (lý do của gợi ý KHÔNG phép). Màn duyệt bản mới xoá câu
//      ấy, nhưng điện thoại giữ bản cũ vẫn gửi nó lên: gia đình đọc "Nghỉ có
//      phép · Được hoàn tiền ăn · Gửi đơn sau 7 giờ sáng", và sổ điểm danh ghi
//      "Theo đơn xin nghỉ đã duyệt — Gửi đơn sau 7 giờ sáng". Máy chủ bỏ câu ấy
//      khi ngày đó có phép; ngày không phép thì câu ấy vẫn là lý do đúng.
//   2. R2-C1 — /api/auth/me kèm nhóm cô (chủ nhiệm / nước ngoài / thể chất) của
//      từng nhóm, để trang chủ không gọi cô nước ngoài là "Cô phụ trách".
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('loi-nho-2611');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7155), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
let QT;
{
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  QT = (await login('hieutruong', 'quantri2026')).cookie;
}
const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1

// Hai ngày thường (thứ Hai–thứ Sáu) đã qua, xa hơn 20 ngày học mà dữ liệu mẫu
// đã có điểm danh — để sổ chưa có dòng nào và việc tự ghi theo đơn chạy thật.
function ngayThuongTruoc(soNgay) {
  let t = Date.parse(`${HOM_NAY()}T00:00:00Z`) - soNgay * 86400000;
  for (;;) {
    const thu = new Date(t).getUTCDay();
    if (thu >= 1 && thu <= 5) return new Date(t).toISOString().slice(0, 10);
    t -= 86400000;
  }
}
const LY_DO_TRE = 'Gửi đơn sau 7 giờ sáng';

async function duyetMotNgay(ngay, dong) {
  const tao = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: ngay, toDate: ngay, reason: `Con nghỉ ngày ${ngay}` },
  });
  const duyet = await req('POST', `/api/leave/${tao.data.id}/review`, {
    cookie: QT, body: { status: 'approved', theoNgay: [{ ngay, ...dong }] },
  });
  const don = ((await req('GET', '/api/leave', { cookie: PH })).data || []).find(l => l.id === tao.data.id);
  const so = ((await req('GET', `/api/attendance?studentId=s1&month=${ngay.slice(0, 7)}`, { cookie: PH })).data || [])
    .find(r => r.date === ngay);
  return { tao, duyet, don, so };
}

try {
  // =========================================================================
  console.log('\n[1] Có phép + hoàn tiền mà bản giao diện cũ còn gửi câu "Gửi đơn sau 7 giờ sáng"');
  {
    const ngay = ngayThuongTruoc(40);
    const { tao, duyet, don, so } = await duyetMotNgay(ngay, { coPhep: 'co', duocHoan: 'co', lyDo: LY_DO_TRE });
    check('đơn tạo được', tao.status === 201, tao);
    check('duyệt được', duyet.status === 200, duyet);
    const d = (don && don.theoNgay || [])[0] || {};
    check('gia đình thấy ngày đó có phép, được hoàn', d.coPhep === 'co' && d.duocHoan === 'co', d);
    check('và KHÔNG còn câu "Gửi đơn sau 7 giờ sáng"', !String(d.lyDo || '').includes('7 giờ'), d);
    check('sổ điểm danh ghi Nghỉ có phép', so && so.status === 'absent_excused', so);
    check('ghi chú điểm danh chỉ là "Theo đơn xin nghỉ đã duyệt"',
      so && so.note === 'Theo đơn xin nghỉ đã duyệt', so && so.note);
  }

  // =========================================================================
  console.log('\n[2] Đối chứng: ngày KHÔNG phép thì câu ấy vẫn là lý do đúng, giữ nguyên');
  {
    const ngay = ngayThuongTruoc(45);
    const { don, so } = await duyetMotNgay(ngay, { coPhep: 'khong', duocHoan: 'khong', lyDo: LY_DO_TRE });
    const d = (don && don.theoNgay || [])[0] || {};
    check('lý do giữ nguyên', d.lyDo === LY_DO_TRE, d);
    check('sổ ghi Nghỉ không phép kèm lý do', so && so.status === 'absent_unexcused'
      && so.note === `Theo đơn xin nghỉ đã duyệt — ${LY_DO_TRE}`, so);
  }

  // =========================================================================
  console.log('\n[3] Lý do văn phòng tự gõ thì giữ nguyên, kể cả ngày có phép');
  {
    const ngay = ngayThuongTruoc(50);
    const { don } = await duyetMotNgay(ngay, { coPhep: 'co', duocHoan: 'khong', lyDo: 'Gia đình đã gọi báo từ tối hôm trước' });
    const d = (don && don.theoNgay || [])[0] || {};
    check('lý do tự gõ còn nguyên', d.lyDo === 'Gia đình đã gọi báo từ tối hôm trước', d);
  }

  // =========================================================================
  console.log('\n[4] /api/auth/me kèm nhóm cô của từng nhóm');
  {
    const nn = (await login('giaovien.nn', '123456')).cookie;
    const me = (await req('GET', '/api/auth/me', { cookie: nn })).data;
    const ds = (me && me.user && me.user.nhomCuaCo) || [];
    check('cô nước ngoài có nhóm', ds.length > 0, ds);
    check('mọi nhóm của cô nước ngoài mang nhomCo = "nuoc-ngoai"', ds.length && ds.every(n => n.nhomCo === 'nuoc-ngoai'), ds);
    check('kèm tên hiện ra màn hình "Cô nước ngoài"', ds.length && ds.every(n => n.tenNhomCo === 'Cô nước ngoài'), ds);
    const gv = (await login('giaovien', '123456')).cookie;
    const me2 = (await req('GET', '/api/auth/me', { cookie: gv })).data;
    const ds2 = (me2 && me2.user && me2.user.nhomCuaCo) || [];
    check('cô phụ trách: nhomCo = "chu-nhiem"', ds2.length && ds2.every(n => n.nhomCo === 'chu-nhiem'), ds2);
    check('các trường cũ giữ nguyên (id, name)', ds2.length && ds2.every(n => n.id && n.name), ds2);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
