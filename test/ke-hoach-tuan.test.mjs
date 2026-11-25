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
//   • MỌI NGƯỜI ĐỌC. Ban giám hiệu soạn BẢN CHUNG cả trường. Văn phòng / quản
//     lý MỘT cơ sở soạn BẢN RIÊNG của cơ sở mình (góp ý 18/11 "Văn phòng có
//     quyền tạo và sửa", chủ dự án chốt phương án (a) ngày 25/11) — không bao
//     giờ đè bản chung, nên không đổi màn hình của hai cơ sở kia. Cơ sở chưa
//     soạn tuần nào thì thấy bản chung của tuần ấy (mục [6]).
//   • TUẦN LÀ THỨ HAI. Chọn ngày giữa tuần thì ghi vào đúng thứ Hai của tuần ấy —
//     không sinh ra hai bản kế hoạch cho cùng một tuần.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-tuan');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS = taoQuanTri(DIR, 'Quản lý CS1', 'quanly1');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');

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
const VP = await vao('vanphong1', mkVP);
const QL2 = await vao('quanly2', mkCS2);
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
  // Đ260m: quản lý / văn phòng một cơ sở nay được mời soạn — bản của CƠ SỞ
  // MÌNH (mục [6] canh việc ghi). Cô và gia đình vẫn không.
  for (const [ten, c] of [['quản lý cơ sở', QL], ['văn phòng cơ sở', VP]]) {
    const d = (await req('GET', '/api/plans/tuan', { cookie: c })).data;
    check(`${ten} ĐƯỢC mời soạn, bản của cơ sở mình`, d?.duocSoan === true && d?.soanChoCoSo === 'cs1', d && { s: d.duocSoan, cs: d.soanChoCoSo });
  }
  check('ban giám hiệu soạn bản chung (soanChoCoSo rỗng)', (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.soanChoCoSo === '');
  for (const [ten, c] of [['cô', GV], ['gia đình', PH]]) {
    check(`${ten} KHÔNG được mời soạn`, (await req('GET', '/api/plans/tuan', { cookie: c })).data?.duocSoan === false);
  }
  const than = { tieuDe: 'Tuần 1 tháng 9: Trường của bé', noiDung: 'Khám phá: làm quen trường lớp' };
  const co = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: GV, body: than });
  check('cô ghi thì 403', co.status === 403, co.status);
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
// Người trong trường đi được tuần trước / tuần sau. Gia đình thì KHÔNG (góp ý
// 18/11, Đ260m): *"chỉ hiện duy nhất thông tin về tuần … còn lại không lưu vết
// cho phụ huynh"* — nên ca đi tuần ở đây dùng tài khoản ban giám hiệu, và mục
// [4b] canh phía gia đình.
console.log('\n[4] Đi tuần trước / tuần sau chỉ tới tuần CÓ kế hoạch (người trong trường)');
{
  await req('PUT', `/api/plans/tuan/${cong(TUAN_NAY, -21)}`, { cookie: QT, body: { tieuDe: 'Ba tuần trước' } });
  const d = (await req('GET', '/api/plans/tuan', { cookie: QT })).data;
  check('tuần trước có kế hoạch gần nhất là ba tuần trước (bỏ qua tuần trống)', d?.tuanTruocCo === cong(TUAN_NAY, -21), d?.tuanTruocCo);
  check('tuần sau có kế hoạch là tuần kế tiếp', d?.tuanSauCo === cong(TUAN_NAY, 7), d?.tuanSauCo);
  const xa = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, -14)}`, { cookie: QT })).data;
  check('hỏi một tuần trống thì keHoach = null, không lỗi', xa?.keHoach === null && xa?.tuan === cong(TUAN_NAY, -14), xa);
  const co = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, -21)}`, { cookie: GV })).data;
  check('cô cũng xem lại được tuần cũ', co?.tuan === cong(TUAN_NAY, -21) && co?.keHoach?.tieuDe === 'Ba tuần trước', co);
}

// ===========================================================================
console.log('\n[4b] Gia đình chỉ thấy TUẦN NÀY — không lùi về tuần trước, không xem trước tuần sau');
{
  const d = (await req('GET', '/api/plans/tuan', { cookie: PH })).data;
  check('gia đình: không có đường sang tuần trước', d?.tuanTruocCo === null, d?.tuanTruocCo);
  check('gia đình: không có đường sang tuần sau', d?.tuanSauCo === null, d?.tuanSauCo);
  const cu = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, -21)}`, { cookie: PH })).data;
  check('gia đình hỏi thẳng ba tuần trước vẫn chỉ nhận TUẦN NÀY',
    cu?.tuan === TUAN_NAY && cu?.keHoach?.tieuDe !== 'Ba tuần trước', cu && { tuan: cu.tuan, kh: cu.keHoach });
  const sau = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, 7)}`, { cookie: PH })).data;
  check('gia đình hỏi tuần sau cũng nhận tuần này', sau?.tuan === TUAN_NAY && sau?.tuanSauCo === null, sau && sau.tuan);

  // Kế hoạch THÁNG theo nhóm: gia đình chỉ nhận tháng này (và tháng tới đã
  // soạn sẵn), không nhận cả lịch sử.
  const thangCu = await req('PUT', '/api/plans/c1/2025/1', { cookie: QT, body: { theme: 'Tháng cũ năm ngoái' } });
  check('đối chứng — soạn được một tháng cũ', thangCu.status === 200, thangCu.data);
  const ph = (await req('GET', '/api/plans?classId=c1', { cookie: PH })).data;
  check('gia đình: danh sách tháng KHÔNG có tháng cũ', !(ph?.plans || []).some(p => p.theme === 'Tháng cũ năm ngoái'), (ph?.plans || []).map(p => `${p.month}/${p.year}`));
  check('gia đình: danh sách chỉ còn tháng này / tháng tới',
    (ph?.plans || []).every(p => (ph.plan && p.id === ph.plan.id) || (ph.planSapToi && p.id === ph.planSapToi.id)), ph?.plans);
  const gv = (await req('GET', '/api/plans?classId=c1', { cookie: GV })).data;
  check('cô vẫn nhận đủ lịch sử tháng', (gv?.plans || []).some(p => p.theme === 'Tháng cũ năm ngoái'));
}

// ===========================================================================
console.log('\n[5] Kế hoạch THÁNG theo nhóm vẫn nguyên — thêm bên cạnh, không thay');
{
  const cu = await req('GET', '/api/plans?classId=c1', { cookie: GV });
  check('/api/plans?classId=c1 vẫn trả 200', cu.status === 200, cu.status);
  check('và vẫn còn bản kế hoạch tháng đã soạn', (cu.data?.plans || []).length >= 1, (cu.data?.plans || []).length);
}

// ===========================================================================
console.log('\n[6] Văn phòng cơ sở soạn BẢN RIÊNG của cơ sở mình; chưa soạn thì thấy bản chung');
{
  const chung = (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.keHoach;
  check('đối chứng — tuần này đang có bản chung', chung?.tieuDe === 'Tuần 1 tháng 10: Nước quanh ta (sửa)', chung);
  for (const [ten, c] of [['gia đình cơ sở 1', PH], ['cô cơ sở 1', GV], ['văn phòng cơ sở 1', VP]]) {
    const d = (await req('GET', '/api/plans/tuan', { cookie: c })).data;
    check(`${ten}: cơ sở chưa soạn bản riêng → thấy bản chung`, d?.keHoach?.tieuDe === chung?.tieuDe && d?.keHoach?.campusId === '', d?.keHoach);
  }

  const r = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: VP, body: {
    tieuDe: 'Tuần 4 tháng 11: Cơ sở 1 đi tham quan', noiDung: 'Khám phá: tham quan vườn rau' } });
  check('VĂN PHÒNG cơ sở lưu được kế hoạch tuần (200)', r.status === 200, r.data);
  check('bản vừa lưu là bản của cơ sở 1', r.data?.keHoach?.campusId === 'cs1', r.data?.keHoach);

  for (const [ten, c] of [['gia đình cơ sở 1', PH], ['cô cơ sở 1', GV], ['quản lý cơ sở 1', QL]]) {
    const d = (await req('GET', '/api/plans/tuan', { cookie: c })).data;
    check(`${ten} thấy bản của cơ sở 1`, d?.keHoach?.tieuDe === 'Tuần 4 tháng 11: Cơ sở 1 đi tham quan', d?.keHoach);
  }
  check('ban giám hiệu vẫn thấy BẢN CHUNG — văn phòng cơ sở không đè bản chung',
    (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.keHoach?.tieuDe === chung?.tieuDe);
  check('cơ sở 2 vẫn thấy bản chung',
    (await req('GET', '/api/plans/tuan', { cookie: QL2 })).data?.keHoach?.tieuDe === chung?.tieuDe);

  // Cơ sở 2 soạn bản của mình: không lọt sang cơ sở 1.
  const r2 = await req('PUT', `/api/plans/tuan/${TUAN_NAY}`, { cookie: QL2, body: { tieuDe: 'Bản của cơ sở 2' } });
  check('quản lý cơ sở 2 lưu bản của cơ sở 2', r2.status === 200 && r2.data?.keHoach?.campusId === 'cs2', r2.data);
  check('gia đình cơ sở 1 KHÔNG thấy bản của cơ sở 2',
    (await req('GET', '/api/plans/tuan', { cookie: PH })).data?.keHoach?.tieuDe === 'Tuần 4 tháng 11: Cơ sở 1 đi tham quan');
  check('cơ sở 2 thấy bản của mình', (await req('GET', '/api/plans/tuan', { cookie: QL2 })).data?.keHoach?.tieuDe === 'Bản của cơ sở 2');

  // Lưu lại cùng tuần là SỬA bản của cơ sở, không đẻ bản thứ hai, không đụng bản chung.
  const r3 = await req('PUT', `/api/plans/tuan/${cong(TUAN_NAY, 1)}`, { cookie: VP, body: { tieuDe: 'Cơ sở 1 (sửa)' } });
  check('lưu lại cùng tuần là SỬA bản của cơ sở', r3.status === 200 && r3.data?.keHoach?.campusId === 'cs1' && r3.data?.keHoach?.tieuDe === 'Cơ sở 1 (sửa)', r3.data);
  check('bản chung vẫn nguyên', (await req('GET', '/api/plans/tuan', { cookie: QT })).data?.keHoach?.tieuDe === chung?.tieuDe);

  // Đi tuần của văn phòng cơ sở: tính cả tuần có bản của cơ sở mình.
  const tuanRieng = cong(TUAN_NAY, 28);
  await req('PUT', `/api/plans/tuan/${tuanRieng}`, { cookie: VP, body: { tieuDe: 'Bốn tuần nữa — chỉ cơ sở 1' } });
  const qt = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, 7)}`, { cookie: QT })).data;
  const vp = (await req('GET', `/api/plans/tuan?tuan=${cong(TUAN_NAY, 7)}`, { cookie: VP })).data;
  check('văn phòng cơ sở 1 đi "tuần sau" tới được tuần chỉ cơ sở 1 có', vp?.tuanSauCo === tuanRieng, vp?.tuanSauCo);
  check('ban giám hiệu (bản chung) không bị dẫn vào tuần riêng của cơ sở', qt?.tuanSauCo !== tuanRieng, qt?.tuanSauCo);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Kế hoạch giáo dục tuần chung cả trường');
