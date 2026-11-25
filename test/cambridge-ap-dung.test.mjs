// Bài canh CAMBRIDGE THEO KHOẢNG NGÀY ÁP DỤNG (Đ260m).
//
// Chạy bằng:  node test/cambridge-ap-dung.test.mjs   (TEST_PORT tuỳ chọn)
//
// GÓP Ý CỦA TRƯỜNG (văn phòng, đợt 18/11):
//
//   *"Phần Cambridge và kết nối: bổ sung phần setup block này hoặc chương
//   trình này dạy từ thời gian này tới thời gian này, chứ không phải theo từng
//   tuần … chỉ hiện duy nhất thông tin về tuần hoặc thời gian áp dụng chương
//   trình đó, còn lại không lưu vết cho phụ huynh (phụ huynh không xem lại bài
//   học tuần trước, tháng trước)."*
//
// BA ĐIỀU BÀI NÀY CANH:
//
//   • Gia đình CHỈ nhận bài có khoảng áp dụng chứa hôm nay — cắt ở tầng dữ
//     liệu, cả đường liệt kê lẫn đường trả ảnh và tệp. Cô và văn phòng vẫn
//     thấy đủ (họ cần sửa bài, đặt lại khoảng).
//   • Khoảng lấy theo thứ tự: khoảng riêng → tuần đã gắn → tuần gửi tới gia
//     đình. KHÔNG suy từ block (bài gắn block đã qua vẫn hiện nếu tuần gửi là
//     tuần này) — và `tuan` sai dạng không được làm hỏng đường liệt kê.
//   • Dữ liệu không mất: bài đã qua vẫn nằm nguyên, văn phòng đặt lại khoảng
//     thì nó hiện lại.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, ngay,
} from './_chung.mjs';
import path from 'path';
import { createRequire } from 'module';

const Database = createRequire(import.meta.url)('better-sqlite3');
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge-ap-dung');
sinhDuLieu(DIR);
batPhanHe(DIR, ['cambridge']);
const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5451), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const d0 = await login('hieutruong', mk);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const VP = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;   // p1 — con ở c1 và c2

const cong = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const thuHaiCua = (s) => cong(s, -((new Date(`${s}T00:00:00Z`).getUTCDay() + 6) % 7));
const HOM = HOM_NAY();
const TUAN_NAY = thuHaiCua(HOM);

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PDF = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n').toString('base64');

const danhSach = async (cookie) => ((await req('GET', '/api/cambridge?soLuong=200', { cookie })).data?.bai || []);
const tim = async (cookie, id) => (await danhSach(cookie)).find(b => b.id === id) || null;

async function dang(body) {
  const r = await req('POST', '/api/cambridge', { cookie: VP, body: { loai: 'cambridge', phamVi: 'truong', ...body } });
  if (r.status === 201) r.congBo = await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
  return r;
}

// ===========================================================================
console.log('\n[1] Bài không ghi khoảng, không gắn tuần: áp dụng trong TUẦN GỬI tới gia đình');
let BAI_GUI;
{
  const r = await dang({ tieuDe: 'Thư tuần này', noiDung: 'Chào gia đình', loai: 'thu-phu-huynh' });
  BAI_GUI = r.data?.id;
  const b = await tim(PH, BAI_GUI);
  check('gia đình thấy bài vừa gửi', !!b, b);
  check('khoảng = thứ Hai → Chủ nhật của tuần gửi, nguồn "cong-bo"',
    b?.apDung?.tuNgay === TUAN_NAY && b?.apDung?.denNgay === cong(TUAN_NAY, 6) && b?.apDung?.nguon === 'cong-bo', b?.apDung);
  check('và đang áp dụng', b?.dangApDung === true, b?.dangApDung);
}

// ===========================================================================
console.log('\n[2] Bài gắn TUẦN TRƯỚC: gia đình không còn thấy, người trong trường vẫn thấy');
let BAI_CU;
{
  const r = await dang({ tieuDe: 'Weekly Plan tuần trước', noiDung: 'Colours', tuan: cong(TUAN_NAY, -7) });
  BAI_CU = r.data?.id;
  check('đối chứng — đăng được', r.status === 201, r.data);
  check('GIA ĐÌNH KHÔNG THẤY bài tuần trước', !(await tim(PH, BAI_CU)));
  const vp = await tim(VP, BAI_CU);
  check('văn phòng vẫn thấy, kèm dangApDung = false', !!vp && vp.dangApDung === false, vp && { a: vp.apDung, d: vp.dangApDung });
  check('khoảng của bài gắn tuần là tuần ấy, nguồn "tuan"',
    vp?.apDung?.tuNgay === cong(TUAN_NAY, -7) && vp?.apDung?.denNgay === cong(TUAN_NAY, -1) && vp?.apDung?.nguon === 'tuan', vp?.apDung);
  check('cô vẫn thấy', !!(await tim(GV, BAI_CU)));
}

// ===========================================================================
console.log('\n[3] Khoảng riêng "Áp dụng từ … đến …"');
let BAI_KHOANG;
{
  const tu = cong(HOM, -10), den = cong(HOM, 20);
  const r = await dang({ tieuDe: 'Block 3 — Animals', noiDung: 'Cả block học về con vật', apDung: { tuNgay: tu, denNgay: den } });
  BAI_KHOANG = r.data?.id;
  check('tạo được với khoảng riêng (201)', r.status === 201, r.data);
  check('khoảng trả về đúng như đã ghi, nguồn "rieng"',
    r.data?.apDung?.tuNgay === tu && r.data?.apDung?.denNgay === den && r.data?.apDung?.nguon === 'rieng', r.data?.apDung);
  check('tuần sắp xếp đặt theo thứ Hai của ngày bắt đầu', r.data?.tuan === thuHaiCua(tu), r.data?.tuan);
  check('khoảng chứa hôm nay (dài hơn một tuần) → gia đình THẤY', !!(await tim(PH, BAI_KHOANG)));

  const tl = await dang({ tieuDe: 'Block sau', noiDung: 'Chưa tới', apDung: { tuNgay: cong(HOM, 8), denNgay: cong(HOM, 30) } });
  check('khoảng ở TƯƠNG LAI → gia đình chưa thấy', tl.status === 201 && !(await tim(PH, tl.data?.id)), tl.data);
  check('văn phòng thấy, dangApDung = false', (await tim(VP, tl.data?.id))?.dangApDung === false);
  // Tin báo trỏ tới một bài gia đình chưa thấy là tin báo hỏng.
  check('gửi bài chưa tới thời gian áp dụng: chưa báo nhà nào', tl.congBo?.data?.soGiaDinhDuocBao === 0, tl.congBo?.data);
  check('đối chứng — bài đang áp dụng thì có báo', (r.congBo?.data?.soGiaDinhDuocBao || 0) > 0, r.congBo?.data);

  // Sửa bài đã qua thành một khoảng chứa hôm nay → hiện lại; dữ liệu không mất.
  const sua = await req('PUT', `/api/cambridge/${BAI_CU}`, { cookie: VP, body: { apDung: { tuNgay: cong(HOM, -3), denNgay: HOM } } });
  check('đặt lại khoảng cho bài đã qua (200)', sua.status === 200 && sua.data?.apDung?.nguon === 'rieng', sua.data?.apDung);
  check('bài ấy HIỆN LẠI với gia đình, chữ còn nguyên', (await tim(PH, BAI_CU))?.noiDung === 'Colours');

  // Không gửi apDung = không đổi.
  await req('PUT', `/api/cambridge/${BAI_CU}`, { cookie: VP, body: { tieuDe: 'Weekly Plan (đổi tiêu đề)' } });
  check('sửa mà không gửi apDung thì khoảng giữ nguyên', (await tim(VP, BAI_CU))?.apDung?.nguon === 'rieng');

  // null = xoá khoảng riêng (và bỏ tuần đã gắn): rơi về tuần gửi.
  const xoa = await req('PUT', `/api/cambridge/${BAI_CU}`, { cookie: VP, body: { apDung: null } });
  check('gửi apDung = null thì bỏ khoảng riêng, rơi về tuần gửi',
    xoa.status === 200 && xoa.data?.apDung?.nguon === 'cong-bo' && xoa.data?.apDung?.tuNgay === TUAN_NAY, xoa.data?.apDung);
  const rong = await req('PUT', `/api/cambridge/${BAI_KHOANG}`, { cookie: VP, body: { apDung: { tuNgay: '', denNgay: '' } } });
  check('hai ô rỗng cũng là bỏ khoảng riêng', rong.status === 200 && rong.data?.apDung?.nguon === 'cong-bo', rong.data?.apDung);
}

// ===========================================================================
console.log('\n[4] Khoảng sai thì từ chối, nói rõ bằng tiếng Việt, không ghi gì');
{
  const truoc = (await tim(VP, BAI_GUI))?.apDung;
  for (const [ten, apDung] of [
    ['ngày kết thúc trước ngày bắt đầu', { tuNgay: HOM, denNgay: cong(HOM, -1) }],
    ['khoảng dài quá 366 ngày', { tuNgay: HOM, denNgay: cong(HOM, 400) }],
    ['ngày không có thật', { tuNgay: '2026-02-30', denNgay: '2026-03-10' }],
    ['sai dạng', { tuNgay: '25/11/2026', denNgay: '30/11/2026' }],
    ['chỉ có một ngày', { tuNgay: HOM, denNgay: '' }],
  ]) {
    const r = await req('PUT', `/api/cambridge/${BAI_GUI}`, { cookie: VP, body: { apDung } });
    check(`${ten} → 400`, r.status === 400 && /ngày/i.test(r.data?.error || ''), r);
  }
  const moi = await req('POST', '/api/cambridge', { cookie: VP, body: { tieuDe: 'x', apDung: { tuNgay: HOM, denNgay: cong(HOM, -5) } } });
  check('tạo mới với khoảng ngược cũng 400', moi.status === 400, moi.status);
  check('bị từ chối thì khoảng cũ KHÔNG đổi', JSON.stringify((await tim(VP, BAI_GUI))?.apDung) === JSON.stringify(truoc));
}

// ===========================================================================
console.log('\n[5] Bài cũ trong cơ sở dữ liệu: không tuần thì theo tuần gửi; tuần sai dạng không làm hỏng');
{
  const bl = await req('POST', '/api/cambridge/block', { cookie: VP, body: { ten: 'Block đã qua', tuNgay: cong(HOM, -90), denNgay: cong(HOM, -50) } });
  const quaBlock = await dang({ tieuDe: 'Gắn block đã qua, gửi hôm nay', noiDung: 'x', khung: { blockId: bl.data?.id, tuanSo: 1, luaTuoi: '' } });
  check('KHÔNG suy khoảng từ block: bài gắn block đã qua, gửi tuần này → gia đình vẫn thấy',
    !!(await tim(PH, quaBlock.data?.id)));

  const cu = await dang({ tieuDe: 'Gửi từ ba tuần trước', noiDung: 'x' });
  const sai = await dang({ tieuDe: 'Tuần sai dạng', noiDung: 'x' });
  const conn = new Database(path.join(DIR, 'school.db'));
  const baTuan = new Date(Date.now() - 21 * 86400000).toISOString();
  conn.prepare("UPDATE cambridge_bai SET tuan = '', congBoLuc = ?, taoLuc = ? WHERE id = ?").run(baTuan, baTuan, cu.data?.id);
  conn.prepare("UPDATE cambridge_bai SET tuan = '2026-W37' WHERE id = ?").run(sai.data?.id);
  conn.close();

  check('bài không tuần, gửi ba tuần trước → gia đình không thấy', !(await tim(PH, cu.data?.id)));
  const vp = await tim(VP, cu.data?.id);
  check('văn phòng thấy, nguồn "cong-bo", tuần của ngày gửi',
    vp?.apDung?.nguon === 'cong-bo' && vp?.apDung?.tuNgay === thuHaiCua(ngay.ngayCua(Date.parse(baTuan))), vp?.apDung);
  const ds = await req('GET', '/api/cambridge', { cookie: PH });
  check('tuần sai dạng không làm hỏng đường liệt kê (200)', ds.status === 200, ds.status);
  const s = (ds.data?.bai || []).find(b => b.id === sai.data?.id);
  check('và rơi xuống tuần gửi (đang áp dụng)', s?.apDung?.nguon === 'cong-bo' && s?.dangApDung === true, s?.apDung);
}

// ===========================================================================
console.log('\n[6] Ảnh và tệp của bài đã qua: gia đình nhận 403, người trong trường vẫn mở được');
{
  const r = await req('POST', '/api/cambridge', { cookie: VP, body: {
    loai: 'ket-noi', phamVi: 'truong', tieuDe: 'Home Connection đã qua', noiDung: 'x', anh: [PNG], anhCoMatBe: false,
    apDung: { tuNgay: cong(HOM, -30), denNgay: cong(HOM, -2) } } });
  const id = r.data?.id;
  await req('POST', `/api/cambridge/${id}/cong-bo`, { cookie: VP, body: {} });
  const tep = await req('POST', `/api/cambridge/${id}/tep`, { cookie: VP, body: { tep: [{ ten: 'worksheet.pdf', dataUrl: PDF }] } });
  const anh = r.data?.anh?.[0];
  const tepId = tep.data?.tep?.[0]?.id;
  check('đối chứng — bài có ảnh và tệp', !!anh && !!tepId, { anh, tep: tep.data });

  const phAnh = await req('GET', `/api/cambridge/anh/${anh}`, { cookie: PH });
  check('gia đình tải ẢNH của bài đã qua → 403', phAnh.status === 403 && /thời gian áp dụng/.test(phAnh.data?.error || ''), phAnh);
  const phTep = await req('GET', `/api/cambridge/tep/${tepId}`, { cookie: PH });
  check('gia đình tải TỆP của bài đã qua → 403', phTep.status === 403 && /thời gian áp dụng/.test(phTep.data?.error || ''), phTep);
  check('văn phòng vẫn mở được ảnh', (await req('GET', `/api/cambridge/anh/${anh}`, { cookie: VP })).status === 200);
  check('cô vẫn mở được tệp', (await req('GET', `/api/cambridge/tep/${tepId}`, { cookie: GV })).status === 200);

  // Đối chứng ngược: đặt lại khoảng chứa hôm nay thì gia đình mở được.
  await req('PUT', `/api/cambridge/${id}`, { cookie: VP, body: { apDung: { tuNgay: HOM, denNgay: cong(HOM, 6) } } });
  check('đặt lại khoảng → gia đình mở được ảnh', (await req('GET', `/api/cambridge/anh/${anh}`, { cookie: PH })).status === 200);
  check('và mở được tệp', (await req('GET', `/api/cambridge/tep/${tepId}`, { cookie: PH })).status === 200);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Cambridge theo khoảng ngày áp dụng');
