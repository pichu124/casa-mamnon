// Kiểm thử đường GHI của các phân hệ nội dung: Thời khóa biểu, Thực đơn,
// Kế hoạch giáo dục, Báo cáo học tập — giáo viên/quản trị soạn, phụ huynh chỉ xem.
//
// Ra đời sau khi phát hiện 4 phân hệ này chỉ có đường đọc (dữ liệu vào bằng seed),
// tức là giáo viên không có cách nào cập nhật nội dung cho phụ huynh. Bộ này canh
// để chuyện "màn hình đẹp nhưng không nhập được" không tái diễn.
//
// Chạy bằng:  npm run test:bien-soan
import { dungMayChu, thuMucTam, sinhDuLieu, taoQuanTri, taoBoDem, taoReq, taoLogin } from './_chung.mjs';

const DIR = thuMucTam('bien-soan');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3150), dir: DIR });

const { check, tongKet } = taoBoDem();
const req = taoReq(BASE);
const login = taoLogin(req);

// ---- Đăng nhập 4 vai: GVCN lớp 3A, GVCN lớp 5B, phụ huynh, quản trị ----
const T1 = (await login('giaovien', '123456')).cookie;   // t1 — chủ nhiệm c1 (3A)
const T2 = (await login('giaovien2', '123456')).cookie;  // t2 — chủ nhiệm c2 (5B)
const PH = (await login('phuhuynh', '123456')).cookie;   // p1 — con s1 (3A), s2 (5B)
let A = await login('hieutruong', mkTam);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'quantri2026' } });
A = (await login('hieutruong', 'quantri2026')).cookie;

const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Máy chủ chuẩn hóa số tiết `p` thành chuỗi khi làm sạch — quy về cùng dạng để so.
const chuanKhungGio = (pts) => pts.map((pt, i) => ({ p: String(pt.p ?? i + 1), time: String(pt.time || '') }));

// ============================================================
// 1. THỜI KHÓA BIỂU
// ============================================================
console.log('\n[1] TKB — phân quyền đường ghi');
{
  const goc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  const body = { periodTimes: goc.periodTimes, days: goc.days };
  let r = await req('PUT', '/api/timetable/c1', { cookie: PH, body });
  check('phụ huynh KHÔNG sửa được TKB → 403', r.status === 403, r);
  r = await req('PUT', '/api/timetable/c2', { cookie: T1, body });
  check('GVCN KHÔNG sửa được TKB lớp khác → 403', r.status === 403, r);
  r = await req('PUT', '/api/timetable/c999', { cookie: T1, body });
  check('lớp không tồn tại → 404', r.status === 404, r);
}

console.log('\n[2] TKB — GVCN sửa lớp mình, phụ huynh thấy ngay');
{
  const goc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  check('GVCN đọc được TKB lớp mình', Array.isArray(goc.periodTimes) && goc.days && goc.days['1'], goc);

  const days = JSON.parse(JSON.stringify(goc.days));
  const periodTimes = JSON.parse(JSON.stringify(goc.periodTimes));
  days['1'][1] = 'Toán nâng cao (kiểm thử)';
  days['3'][0] = 'Tiếng Việt (kiểm thử)';
  periodTimes[0].time = '07:15 – 07:50';

  const r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: { periodTimes, days } });
  check('GVCN lưu được TKB lớp mình → 200', r.status === 200, r);
  check('phản hồi trả lại đúng nội dung vừa lưu',
    bang(r.data.days, days) && bang(chuanKhungGio(r.data.periodTimes), chuanKhungGio(periodTimes)), r.data);

  const doc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  check('đọc lại đúng từng tiết, từng khung giờ',
    bang(doc.days, days) && bang(chuanKhungGio(doc.periodTimes), chuanKhungGio(periodTimes)), doc);

  const ph = (await req('GET', '/api/timetable?classId=c1', { cookie: PH })).data;
  check('phụ huynh thấy ngay môn vừa đổi', ph.days['1'][1] === 'Toán nâng cao (kiểm thử)', ph.days['1']);
}

console.log('\n[3] TKB — máy chủ tự làm sạch dữ liệu nhập tay');
{
  const goc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  const soTiet = goc.periodTimes.length;
  const days = JSON.parse(JSON.stringify(goc.days));
  days['2'] = ['Toán'];                    // thiếu tiết → phải tự bù "—"
  days['4'] = ['x'.repeat(200), '', 'Vẽ']; // tên quá dài phải cắt, để trống thành "—"
  delete days['5'];                        // thiếu cả ngày → cả ngày nghỉ

  const r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: { periodTimes: goc.periodTimes, days } });
  check('dữ liệu lệch chuẩn vẫn lưu được → 200', r.status === 200, r);
  const d = r.data.days;
  check('ngày thiếu tiết được bù "—" đủ số tiết', d['2'].length === soTiet && d['2'][0] === 'Toán' && d['2'][1] === '—', d['2']);
  check('tên môn quá dài bị cắt còn 60 ký tự', d['4'][0].length === 60, d['4'][0].length);
  check('ô để trống thành "—"', d['4'][1] === '—', d['4']);
  check('ngày bỏ trống thành cả ngày nghỉ', d['5'].every(m => m === '—'), d['5']);
}

console.log('\n[4] TKB — thân yêu cầu sai bị chặn 400');
{
  const goc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  let r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: { periodTimes: goc.periodTimes, days: 'hong' } });
  check('days không phải object → 400', r.status === 400, r);
  r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: { periodTimes: [], days: goc.days } });
  check('periodTimes rỗng → 400', r.status === 400, r);
  r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: { periodTimes: Array(13).fill({ p: 1, time: 'x' }), days: goc.days } });
  check('quá 12 tiết/ngày → 400', r.status === 400, r);
  r = await req('PUT', '/api/timetable/c1', { cookie: T1, body: {} });
  check('thân rỗng → 400', r.status === 400, r);
  const doc = (await req('GET', '/api/timetable?classId=c1', { cookie: T1 })).data;
  check('bị chặn thì dữ liệu cũ còn nguyên', doc.days['1'][1] === 'Toán nâng cao (kiểm thử)', doc.days['1']);
}

console.log('\n[5] TKB — quản trị sửa lớp bất kỳ, lập mới cho lớp chưa có');
{
  const goc = (await req('GET', '/api/timetable?classId=c2', { cookie: A })).data;
  const days = JSON.parse(JSON.stringify(goc.days));
  days['1'][0] = 'Chào cờ toàn trường (kiểm thử)';
  let r = await req('PUT', '/api/timetable/c2', { cookie: A, body: { periodTimes: goc.periodTimes, days } });
  check('quản trị sửa được lớp bất kỳ → 200', r.status === 200, r);

  // Lớp mới tinh chưa có TKB: đọc → 404 báo "chưa có", lập mới → đọc được ngay.
  const lop = await req('POST', '/api/admin/classes', { cookie: A, body: { name: 'Lớp 1A', room: 'P101', grade: 1 } });
  check('tạo được lớp mới để thử', lop.status === 201 && lop.data.id, lop);
  const lopId = lop.data.id;
  r = await req('GET', `/api/timetable?classId=${lopId}`, { cookie: A });
  check('lớp mới chưa có TKB → 404 báo rõ', r.status === 404 && /chưa có thời khóa biểu/i.test(r.data?.error || ''), r);
  r = await req('PUT', `/api/timetable/${lopId}`, {
    cookie: A,
    body: { periodTimes: [{ p: 1, time: '07:30 – 08:05' }, { p: 2, time: '08:10 – 08:45' }], days: { 1: ['Toán', 'Tiếng Việt'] } },
  });
  check('lập TKB lần đầu cho lớp mới → 200', r.status === 200, r);
  r = await req('GET', `/api/timetable?classId=${lopId}`, { cookie: A });
  check('đọc lại được TKB vừa lập', r.status === 200 && r.data.days['1'][0] === 'Toán' && r.data.days['2'][0] === '—', r.data);
}

tongKet();
process.exit(0);
