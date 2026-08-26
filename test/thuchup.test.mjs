// Kiểm thử phân hệ "Ghi nhanh" — phép thử quyết định của GĐ 0.
//
// Chạy bằng:  npm run test:thuchup
//
// Bộ này canh ba lời hứa của phép thử. Hai lời hứa đầu canh được ở đây, lời hứa
// thứ ba (nhanh dưới 20 giây) chỉ đo được trên tay cô giáo thật:
//
//   KHÔNG NHÂN ĐÔI — gửi lại cùng một mã bao nhiêu lần cũng chỉ có một bản ghi.
//   KHÔNG LỘT QUYỀN — cô chỉ ghi và xem được bé trong nhóm lớp mình.
//
// Bài kiểm thử tự dựng máy chủ riêng với cơ sở dữ liệu tạm, KHÔNG đụng dữ liệu thật.
import {
  GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri,
  dungMayChu, taoReq, taoLogin,
} from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3720);
const DIR = thuMucTam('thuchup');
const { check, tongKet } = taoBoDem();

sinhDuLieu(DIR);
const adminPw = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const may = await dungMayChu({ port: PORT, dir: DIR });
const req = taoReq(may.BASE);
const login = taoLogin(req);

let A = await login('hieutruong', adminPw);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'hieutruong2026' } });
A = await login('hieutruong', 'hieutruong2026');
const T = (await login('giaovien', '123456')).cookie;
const T2 = (await login('giaovien2', '123456')).cookie;
const P = (await login('phuhuynh', '123456')).cookie;

// Ảnh JPEG hợp lệ nhỏ nhất có thể, đủ để qua bộ kiểm tra chữ ký tệp.
const ANH = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL'
  + 'DBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAA'
  + 'AAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// Học sinh của cô "giaovien" — lấy đúng từ API để không đoán mã.
const dsHs = await req('GET', '/api/students', { cookie: T });
const BE = dsHs.data?.[0]?.id;
const dsHs2 = await req('GET', '/api/students', { cookie: T2 });
const BE_LOP_KHAC = (dsHs2.data || []).find(s => !(dsHs.data || []).some(x => x.id === s.id))?.id;

console.log('\n[1] Phân hệ mặc định TẮT, bật lên mới dùng được');
{
  const truoc = await req('GET', '/api/thuchup', { cookie: T });
  check('đang tắt thì đường dẫn bị chặn', truoc.status === 404, truoc.status);

  const bat = await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: true } });
  check('quản trị bật được', bat.status === 200, bat.data);

  const sau = await req('GET', '/api/thuchup', { cookie: T });
  check('bật rồi cô dùng được', sau.status === 200, sau.status);
  check('chưa ghi gì thì danh sách rỗng', Array.isArray(sau.data?.ghiNhan) && !sau.data.ghiNhan.length);
}

console.log('\n[2] Ghi một khoảnh khắc');
{
  const r = await req('POST', '/api/thuchup', { cookie: T, body: {
    id: 'aaaaaaaa-1111-2222-3333-444444444444',
    studentId: BE, dataUrl: ANH, note: 'An tự xúc hết bát cơm', giay: 12.4, taoLuc: '2026-08-26T02:00:00.000Z',
  } });
  check('ghi được', r.status === 200, r.data);
  check('không phải bản trùng', r.data?.trungLap === false, r.data?.trungLap);
  check('có lưu tệp ảnh', !!r.data?.file, r.data?.file);
  check('giữ đúng số giây cô mất', r.data?.giay === 12.4, r.data?.giay);

  const ds = await req('GET', '/api/thuchup', { cookie: T });
  check('hiện trong danh sách', ds.data?.ghiNhan?.length === 1, ds.data?.ghiNhan?.length);
  check('kèm tên bé để cô nhận ra', !!ds.data?.ghiNhan?.[0]?.tenBe, ds.data?.ghiNhan?.[0]);
}

console.log('\n[3] KHÔNG NHÂN ĐÔI — gửi lại cùng mã không tạo bản thứ hai');
{
  const goi = { id: 'aaaaaaaa-1111-2222-3333-444444444444', studentId: BE,
    dataUrl: ANH, note: 'An tự xúc hết bát cơm', giay: 12.4 };

  const lan2 = await req('POST', '/api/thuchup', { cookie: T, body: goi });
  check('lần gửi thứ hai vẫn trả 200 (không báo lỗi cho cô)', lan2.status === 200, lan2.status);
  check('được đánh dấu là bản trùng', lan2.data?.trungLap === true, lan2.data);

  const lan3 = await req('POST', '/api/thuchup', { cookie: T, body: goi });
  check('lần thứ ba cũng vậy', lan3.data?.trungLap === true, lan3.data);

  const ds = await req('GET', '/api/thuchup', { cookie: T });
  check('vẫn chỉ có MỘT bản ghi', ds.data?.ghiNhan?.length === 1, ds.data?.ghiNhan?.length);

  // Gửi lại đồng thời, giống lúc cô mở app ở hai nơi cùng lúc.
  const cungLuc = await Promise.all([1, 2, 3, 4].map(() =>
    req('POST', '/api/thuchup', { cookie: T, body: goi })));
  check('bốn lần gửi cùng lúc đều được trả lời tử tế',
    cungLuc.every(r => r.status === 200), cungLuc.map(r => r.status));
  const sau = await req('GET', '/api/thuchup', { cookie: T });
  check('sau tất cả vẫn chỉ MỘT bản ghi', sau.data?.ghiNhan?.length === 1, sau.data?.ghiNhan?.length);
}

console.log('\n[4] Mã ghi nhận phải hợp lệ');
{
  for (const [ten, id] of [['thiếu mã', ''], ['quá ngắn', 'abc'], ['ký tự lạ', 'a<script>bbbbbbb']]) {
    const r = await req('POST', '/api/thuchup', { cookie: T, body: { id, studentId: BE, note: 'x' } });
    check(`${ten} bị từ chối`, r.status === 400, r.status);
  }
  const rong = await req('POST', '/api/thuchup', { cookie: T, body: {
    id: 'bbbbbbbb-1111-2222-3333-444444444444', studentId: BE } });
  check('không ảnh không chữ thì từ chối', rong.status === 400, rong.data);
}

console.log('\n[5] Phân quyền — cô chỉ ghi được bé nhóm mình');
{
  if (!BE_LOP_KHAC) {
    check('dữ liệu mẫu có bé ở nhóm khác để thử', false, 'không tìm được');
  } else {
    const r = await req('POST', '/api/thuchup', { cookie: T, body: {
      id: 'cccccccc-1111-2222-3333-444444444444', studentId: BE_LOP_KHAC, note: 'x' } });
    check('ghi cho bé nhóm khác bị chặn', r.status === 403, r.status);
  }

  const ph = await req('POST', '/api/thuchup', { cookie: P, body: {
    id: 'dddddddd-1111-2222-3333-444444444444', studentId: BE, note: 'x' } });
  check('phụ huynh không ghi được', ph.status === 403, ph.status);

  const phXem = await req('GET', '/api/thuchup', { cookie: P });
  check('phụ huynh không xem được danh sách', phXem.status === 403, phXem.status);
}

console.log('\n[6] Ảnh chỉ mở được bởi cô của bé đó');
{
  const ID = 'aaaaaaaa-1111-2222-3333-444444444444';
  const oke = await fetch(`${may.BASE}/api/thuchup/anh/${ID}`, { headers: { Cookie: T } });
  check('cô của bé xem được ảnh', oke.status === 200, oke.status);
  check('trả về đúng kiểu ảnh', (oke.headers.get('content-type') || '').startsWith('image/'),
    oke.headers.get('content-type'));

  const co2 = await fetch(`${may.BASE}/api/thuchup/anh/${ID}`, { headers: { Cookie: T2 } });
  check('cô nhóm khác KHÔNG xem được', co2.status === 403, co2.status);

  const ph = await fetch(`${may.BASE}/api/thuchup/anh/${ID}`, { headers: { Cookie: P } });
  check('phụ huynh KHÔNG xem được (đây là bản nháp của cô)', ph.status === 403, ph.status);

  const la = await fetch(`${may.BASE}/api/thuchup/anh/khong-co-that-dau`, { headers: { Cookie: T } });
  check('mã không có thật trả 404', la.status === 404, la.status);
}

console.log('\n[7] Số liệu của phép thử');
{
  await req('POST', '/api/thuchup', { cookie: T, body: {
    id: 'eeeeeeee-1111-2222-3333-444444444444', studentId: BE,
    note: 'ghi lúc mất mạng', giay: 31.2, ngoaiTuyen: 1, choBaoLau: 420 } });

  const r = await req('GET', '/api/thuchup/ket-qua', { cookie: T });
  check('đếm đủ số lần ghi', r.data?.soLan === 2, r.data);
  check('nhanh nhất đúng', r.data?.nhanhNhat === 12.4, r.data?.nhanhNhat);
  check('chậm nhất đúng', r.data?.chamNhat === 31.2, r.data?.chamNhat);
  check('đếm đúng số lần dưới 20 giây', r.data?.duoi20Giay === 1, r.data?.duoi20Giay);
  check('đếm đúng số lần ghi lúc mất mạng', r.data?.soLanNgoaiTuyen === 1, r.data?.soLanNgoaiTuyen);
}

console.log('\n[8] Tắt phân hệ thì dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: false } });
  check('tắt được', tat.status === 200, tat.data);

  const chan = await req('GET', '/api/thuchup', { cookie: T });
  check('tắt rồi thì đường dẫn bị chặn', chan.status === 404, chan.status);

  const anh = await fetch(`${may.BASE}/api/thuchup/anh/aaaaaaaa-1111-2222-3333-444444444444`,
    { headers: { Cookie: T } });
  check('đường dẫn ảnh cũng bị chặn', anh.status === 404, anh.status);

  await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: true } });
  const lai = await req('GET', '/api/thuchup', { cookie: T });
  check('bật lại thì dữ liệu cũ còn NGUYÊN', lai.data?.ghiNhan?.length === 2, lai.data?.ghiNhan?.length);
}

console.log('\n[9] Phân hệ này không được đụng tới phần đang chạy');
{
  const dd = await req('GET', '/api/attendance/class', { cookie: T });
  check('điểm danh vẫn chạy', dd.status === 200, dd.status);
  const hs = await req('GET', '/api/students', { cookie: P });
  check('phụ huynh vẫn xem được con mình', hs.status === 200, hs.status);
  const tc = await req('GET', '/api/dashboard/badges', { cookie: P });
  check('huy hiệu trang chủ vẫn tải được', tc.status === 200, tc.status);
}

may.dung();
donThuMucTam(DIR);
tongKet();
