// Bài canh KẾ HOẠCH GIÁO DỤC CHUNG CẢ TRƯỜNG, SOẠN THEO TUẦN (Đ225).
//
// Chạy bằng:  npm run test:ke-hoach-tuan
//
// VÌ SAO CÓ PHẦN NÀY
//
// Góp ý của trường 06/10 (mục 4, phần 1): *"đây sẽ là kế hoạch chung của toàn
// trường nên sẽ bỏ nhóm lớp đi … mục này mình sẽ để là soạn kế hoạch tuần nên
// cấu trúc sẽ để: Tuần 1 tháng 9: Trường của bé — Nội dung học của tuần"*.
//
// BA ĐIỀU CỐ Ý:
//
//   • THÊM BÊN CẠNH, KHÔNG THAY. Kế hoạch tháng theo nhóm (`/api/plans`) giữ
//     nguyên từng chữ — bản đã soạn vẫn đọc được (Nguyên tắc số 1, vế 3).
//   • MỌI NGƯỜI ĐỌC, CHỈ QUẢN TRỊ CẢ TRƯỜNG SOẠN. Quản trị một cơ sở sửa bản
//     chung là đổi màn hình của hai cơ sở kia mà họ không biết.
//   • TUẦN LÀ THỨ HAI. Chọn ngày giữa tuần thì ghi vào đúng thứ Hai của tuần ấy —
//     không sinh ra hai bản kế hoạch cho cùng một tuần.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-tuan');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS = taoQuanTri(DIR, 'Quản lý CS1', 'quanly1');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4793), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
const QL = await vao('quanly1', mkCS);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const thuHaiCua = (s) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
};
const cong = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const TUAN_NAY = thuHaiCua(HOM_NAY());

// ===========================================================================
console.log('\n[1] Ai đọc, ai soạn');
{
  for (const [ten, c] of [['ban giám hiệu', QT], ['quản lý cơ sở', QL], ['cô', GV], ['gia đình', PH]]) {
    const r = await req('GET', '/api/plans/tuan', { cookie: c });
    check(`${ten} đọc được (200)`, r.status === 200, r.status);
    check(`${ten}: mặc định là tuần này (thứ Hai ${TUAN_NAY})`, r.data?.tuan === TUAN_NAY, r.data?.tuan);
  }
  check('ban giám hiệu ĐƯỢC mời soạn', (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.duocSoan === true);
  for (const [ten, c] of [['quản lý cơ sở', QL], ['cô', GV], ['gia đình', PH]]) {
    check(`${ten} KHÔNG được mời soạn`, (await req('GET', '/api/plans/tuan', { cookie: c })).data?.duocSoan === false);
  }
  const than = { tieuDe: 'Tuần 1 tháng 9: Trường của bé', noiDung: 'Khám phá: làm quen trường lớp' };
  const co = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: GV, body: than });
  check('cô ghi thì 403', co.status === 403, co.status);
  const ql = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: QL, body: than });
  check('quản lý MỘT cơ sở ghi bản chung cả trường thì 403', ql.status === 403, ql.status);
  check('và câu từ chối nói rõ ai soạn', /ban giám hiệu/.test(ql.data?.error || ''), ql.data);
  const ph = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: PH, body: than });
  check('gia đình ghi thì bị chặn', [401, 403].includes(ph.status), ph.status);
}

// ===========================================================================
console.log('\n[2] Soạn một tuần: tiêu đề + nội dung; ngày giữa tuần rơi về thứ Hai');
{
  const giuaTuan = cong(TUAN_NAY, 2);   // thứ Tư
  const r = await req('PUT', `/api/plans/tuan/${giuaTuan}`, {
    cookie: QT,
    body: {
      tieuDe: '  Tuần 1 tháng 10: Nước quanh ta  ',
      noiDung: 'Khám phá: chơi với nước\r\n\r\n  Kỹ năng sống: rửa tay sáu bước  \nÂm nhạc: Cho tôi đi làm mưa với',
    },
  });
  check('ban giám hiệu lưu được', r.status === 200, r.data);
  check('ngày thứ Tư được ghi vào THỨ HAI của tuần', r.data?.keHoach?.tuan === TUAN_NAY, r.data?.keHoach?.tuan);
  check('tiêu đề được cắt khoảng trắng thừa', r.data?.keHoach?.tieuDe === 'Tuần 1 tháng 10: Nước quanh ta', r.data?.keHoach?.tieuDe);
  check('nội dung: bỏ dòng trống, cắt khoảng trắng, mỗi dòng một mục',
    r.data?.keHoach?.noiDung === 'Khám phá: chơi với nước\nKỹ năng sống: rửa tay sáu bước\nÂm nhạc: Cho tôi đi làm mưa với',
    r.data?.keHoach?.noiDung);

  // Lưu lần hai cùng tuần (chọn đúng thứ Hai) thì SỬA, không thêm bản thứ hai.
  const r2 = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: QT, body: { tieuDe: 'Tuần 1 tháng 10: Nước quanh ta (sửa)', noiDung: 'Khám phá: chơi với nước' } });
  check('lưu lại cùng tuần là SỬA', r2.status === 200 && r2.data?.keHoach?.tieuDe.endsWith('(sửa)'), r2.data);

  for (const [ten, c] of [['gia đình', PH], ['cô', GV], ['quản lý cơ sở', QL]]) {
    const d = (await req('GET', '/api/plans/tuan', { cookie: c })).data;
    check(`${ten} đọc được bản vừa soạn — chung cả trường, không theo nhóm`,
      d?.keHoach?.tieuDe === 'Tuần 1 tháng 10: Nước quanh ta (sửa)', d?.keHoach);
  }
}

// ===========================================================================
console.log('\n[3] Ô sai thì từ chối nói rõ; dữ liệu cũ không bị đè');
{
  const truoc = (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.keHoach;
  const khongTieuDe = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: QT, body: { tieuDe: '   ', noiDung: 'x' } });
  check('thiếu tiêu đề → 400', khongTieuDe.status === 400, khongTieuDe.status);
  const ngaySai = await req('PUT', '/api/plans/tuan/2026-02-30', { cookie: QT, body: { tieuDe: 'x' } });
  check('ngày không có thật → 400', ngaySai.status === 400, ngaySai.status);
  const ngaySai2 = await req('GET', '/api/plans/tuan?tuan=hom-nay', { cookie: PH });
  check('hỏi tuần sai dạng → 400, không phải 500', ngaySai2.status === 400, ngaySai2.status);
  const sau = (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.keHoach;
  check('bị từ chối thì bản đã có KHÔNG đổi', JSON.stringify(truoc) === JSON.stringify(sau));

  const nhieuDong = Array.from({ length: 60 }, (_, i) => `Mục ${i + 1}: nội dung`).join('\n');
  const dai = await req('PUT', `/api/plans/tuan/${cong(TUAN_NAY, 7)}`, { cookie: QT, body: { tieuDe: 'Tuần sau', noiDung: nhieuDong } });
  check('quá 40 dòng thì cắt còn 40 — màn điện thoại vẫn đọc được', dai.data?.keHoach?.noiDung.split('\n').length === 40,
    dai.data?.keHoach?.noiDung.split('\n').length);
}

// ===========================================================================
console.log('\n[4] Đi tuần trước / tuần sau chỉ tới tuần CÓ kế hoạch');
{
  await req('PUT', `/api/plans/tuan/${cong(TUAN_NAY, -21)}`, { cookie: QT, body: { tieuDe: 'Ba tuần trước' } });
  const d = (await req('GET', '/api/plans/tuan', { cookie: PH })).data;
  check('tuần trước có kế hoạch gần nhất là ba tuần trước (bỏ qua tuần trống)', d?.tuanTruocCo === cong(TUAN_NAY, -21), d?.tuanTruocCo);
  check('tuần sau có kế hoạch là tuần kế tiếp', d?.tuanSauCo === cong(TUAN_NAY, 7), d?.tuanSauCo);
  const xa = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, -14)}`, { cookie: PH })).data;
  check('hỏi một tuần trống thì keHoach = null, không lỗi', xa?.keHoach === null && xa?.tuan === cong(TUAN_NAY, -14), xa);
}

// ===========================================================================
console.log('\n[5] Kế hoạch THÁNG theo nhóm vẫn nguyên — thêm bên cạnh, không thay');
{
  const cu = await req('GET', '/api/plans?classId=c1', { cookie: GV });
  check('/api/plans?classId=c1 vẫn trả 200', cu.status === 200, cu.status);
  check('và vẫn còn bản kế hoạch tháng đã soạn', (cu.data?.plans || []).length >= 1, (cu.data?.plans || []).length);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Kế hoạch giáo dục tuần chung cả trường');
