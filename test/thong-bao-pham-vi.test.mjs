// THÔNG BÁO: QUẢN TRỊ GỬI ĐƯỢC CHO MỘT NHÓM, VÀ CẤP 3 KHÔNG VỚI TAY SANG
// CƠ SỞ KHÁC.
//
// Hai lỗi cùng một tệp, trước bản vá:
//
//   1. POST /api/notifications với audience='class' rơi vào `nhomDangThaoTac`
//      — hàm chỉ trả lời cho vai CÔ — nên MỌI tài khoản quản trị (văn phòng
//      cơ sở, ban giám hiệu) nhận 400 "Tài khoản chưa gắn với nhóm lớp nào":
//      một câu sai sự thật, không lối ra, cho đúng những người mà việc gửi
//      thông báo là việc hằng ngày.
//   2. PUT/DELETE chỉ hỏi `laChuBanGhi` — với quản trị thì luôn đúng, không
//      hỏi cơ sở — nên quản lý cơ sở A sửa và THU HỒI được thông báo nhóm
//      của cơ sở B.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const DIR = thuMucTam('thong-bao-pham-vi');
sinhDuLieu(DIR);

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkVP = taoQuanTri(DIR, 'Văn Phòng CS1', 'vanphong1');
const mkQL = taoQuanTri(DIR, 'Quản Lý CS1', 'quanly1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4130), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

const bgh = await login('hieutruong', mkBGH);
const vp = await login('vanphong1', mkVP);
const ql = await login('quanly1', mkQL);

console.log('\n[1] Quản trị gửi được thông báo cho MỘT nhóm');
{
  const r = await req('POST', '/api/notifications', {
    cookie: bgh.cookie,
    body: { title: 'Họp phụ huynh Chồi 2', body: 'Thứ Sáu 16h30 ạ.', audience: 'class', classId: 'c1' },
  });
  check('ban giám hiệu gửi cho nhóm c1 → 201', r.status === 201, { status: r.status, data: r.data });
  check('phạm vi ghi đúng mã nhóm', r.data?.audience === 'c1', r.data?.audience);

  const thieu = await req('POST', '/api/notifications', {
    cookie: bgh.cookie,
    body: { title: 'Thiếu nhóm', body: 'x', audience: 'class' },
  });
  check('không chọn nhóm thì được nhắc chọn, không phải câu "chưa gắn nhóm" sai sự thật',
    thieu.status === 400 && /chọn nhóm/i.test(thieu.data?.error || ''), thieu.data);
}

console.log('\n[2] Văn phòng cơ sở gửi được cho nhóm CỦA CƠ SỞ MÌNH, không hơn');
{
  const trong = await req('POST', '/api/notifications', {
    cookie: vp.cookie,
    body: { title: 'Báo ăn nhóm Chồi 2', body: 'Mai nhóm dã ngoại.', audience: 'class', classId: 'c1' },
  });
  check('văn phòng cs1 gửi cho nhóm c1 (cs1) → 201', trong.status === 201, trong.status);

  const ngoai = await req('POST', '/api/notifications', {
    cookie: vp.cookie,
    body: { title: 'Với tay', body: 'x', audience: 'class', classId: 'c3' },
  });
  check('văn phòng cs1 gửi cho nhóm c3 (cs2) → 403', ngoai.status === 403, ngoai.status);
}

console.log('\n[3] Cấp 3 không sửa/thu hồi được thông báo nhóm của cơ sở khác');
{
  const cuaCs2 = await req('POST', '/api/notifications', {
    cookie: bgh.cookie,
    body: { title: 'Thông báo Mầm 1', body: 'Của cơ sở 2.', audience: 'class', classId: 'c3' },
  });
  check('dựng được thông báo nhóm c3 (cs2)', cuaCs2.status === 201, cuaCs2.status);
  const idCs2 = cuaCs2.data?.id;

  const sua = await req('PUT', `/api/notifications/${idCs2}`, {
    cookie: ql.cookie, body: { title: 'Bị sửa từ cơ sở 1' },
  });
  check('quản lý cs1 SỬA thông báo của cs2 → 403', sua.status === 403, sua.status);

  const thuHoi = await req('DELETE', `/api/notifications/${idCs2}`, { cookie: ql.cookie });
  check('quản lý cs1 THU HỒI thông báo của cs2 → 403', thuHoi.status === 403, thuHoi.status);

  const cuaCs1 = await req('POST', '/api/notifications', {
    cookie: bgh.cookie,
    body: { title: 'Thông báo Chồi 2', body: 'Của cơ sở 1.', audience: 'class', classId: 'c1' },
  });
  const suaNha = await req('PUT', `/api/notifications/${cuaCs1.data?.id}`, {
    cookie: ql.cookie, body: { title: 'Sửa trong cơ sở mình' },
  });
  check('quản lý cs1 sửa thông báo nhóm CỦA cs1 vẫn được', suaNha.status === 200, suaNha.status);

  const suaAll = await req('POST', '/api/notifications', {
    cookie: bgh.cookie, body: { title: 'Cả trường', body: 'x', audience: 'all' },
  });
  const suaAllR = await req('PUT', `/api/notifications/${suaAll.data?.id}`, {
    cookie: ql.cookie, body: { title: 'Cả trường (sửa)' },
  });
  check('thông báo CẢ TRƯỜNG quản trị Cấp 3 vẫn sửa được như cũ', suaAllR.status === 200, suaAllR.status);
}

console.log('\n[4] Đường của cô giữ nguyên như cũ');
{
  const co = await login('giaovien', '123456');   // t1 — chỉ phụ trách c1
  const r = await req('POST', '/api/notifications', {
    cookie: co.cookie,
    body: { title: 'Cô nhắn nhóm mình', body: 'x', audience: 'class' },
  });
  check('cô một nhóm không phải chọn gì, gửi thẳng như trước', r.status === 201, { status: r.status, data: r.data });
  check('gửi đúng nhóm của cô', r.data?.audience === 'c1', r.data?.audience);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
