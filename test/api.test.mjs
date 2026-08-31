// Kiểm thử API end-to-end: đăng nhập 2 vai trò, gọi mọi endpoint, in PASS/FAIL.
//
// Chạy bằng:  npm run test:api
// Tự dựng máy chủ riêng với cơ sở dữ liệu tạm, không đụng dữ liệu thật.
import { dungMayChu, thuMucTam, sinhDuLieu, batPhanHe, taoQuanTri, HOM_NAY as homNayVN, GOC as GOCTB } from './_chung.mjs';
import fsTb from 'fs';
import pathTb from 'path';

const DIR = thuMucTam('api');
sinhDuLieu(DIR);
// Bộ này quét TOÀN BỘ mặt API, nên phải bật cả bốn phân hệ nay tắt sẵn —
// nhà trường bật lại lúc nào thì đường dẫn của chúng phải vẫn đúng lúc đó.
batPhanHe(DIR, ['nenep', 'baocao', 'nhanxet', 'xebuyt']);
// Từ Y2, đơn xin nghỉ do VĂN PHÒNG duyệt — bộ này cần thêm một tài khoản quản trị.
const MK_VP = taoQuanTri(DIR, 'Văn Phòng', 'vanphong');
const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3100), dir: DIR });

let pass = 0, fail = 0;
const failures = [];

async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  return { cookie, me: await res.json() };
}

async function call(cookie, method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${name} ${extra ? JSON.stringify(extra).slice(0, 300) : ''}`); }
}

const P = await login('phuhuynh', '123456');   // parent p1, con s1 (3A), s2 (5B)
const T = await login('giaovien', '123456');   // teacher t1, lớp 3A
const T2 = await login('giaovien2', '123456'); // teacher t2, lớp 5B
const VPtam = await login('vanphong', MK_VP);
await call(VPtam.cookie, 'POST', '/api/auth/set-new-password', { newPassword: 'quantri2026' });
const A = await login('vanphong', 'quantri2026');  // văn phòng (quản trị)
check('login parent', P.me.user && P.me.user.id === 'p1' && !('password' in P.me.user));
check('login teacher', T.me.user && T.me.user.id === 't1');

let r;
// ---- students ----
r = await call(P.cookie, 'GET', '/api/students'); check('P students', r.status === 200 && r.data.length === 2, r);
r = await call(P.cookie, 'GET', '/api/students/s3'); check('P student khác nhà -> 403', r.status === 403, r);
r = await call(T.cookie, 'GET', '/api/students'); check('T roster 3A = 5 hs', r.status === 200 && r.data.length === 5, r);

// ---- badges ----
r = await call(P.cookie, 'GET', '/api/dashboard/badges'); check('P badges', r.status === 200 && typeof r.data.thongbao === 'number', r);
r = await call(T.cookie, 'GET', '/api/dashboard/badges'); check('T badges có xinphep/danthuoc', r.status === 200 && r.data.xinphep >= 1 && r.data.danthuoc >= 0, r);

// ---- attendance ----
r = await call(P.cookie, 'GET', '/api/attendance?studentId=s1'); check('P attendance s1', r.status === 200 && Array.isArray(r.data) && r.data.length > 0, r);
r = await call(P.cookie, 'GET', '/api/attendance?studentId=s3'); check('P attendance s3 -> 403', r.status === 403, r);
r = await call(P.cookie, 'GET', '/api/attendance/class'); check('P attendance/class -> 403', r.status === 403, r);
r = await call(T.cookie, 'GET', '/api/attendance/class'); check('T attendance/class', r.status === 200 && (r.data.students || r.data).length === 5, r);
r = await call(T.cookie, 'POST', '/api/attendance/mark', { studentId: 's3', date: homNayVN(), status: 'present' });
check('T mark s3 present', r.status === 200 || r.status === 201, r);
r = await call(T.cookie, 'POST', '/api/attendance/mark', { studentId: 's2', date: homNayVN(), status: 'present' });
check('T mark hs lớp khác -> 403', r.status === 403, r);

// ---- leave ----
r = await call(P.cookie, 'GET', '/api/leave'); check('P leave list', r.status === 200 && r.data.length >= 3, r);
r = await call(P.cookie, 'POST', '/api/leave', { studentId: 's1', fromDate: '2026-08-10', toDate: '2026-08-10', reason: 'Test đơn' });
check('P tạo leave', r.status === 200 || r.status === 201, r);
const newLeave = r.data;
// Y2: cô chỉ đọc, VĂN PHÒNG duyệt.
r = await call(T.cookie, 'POST', `/api/leave/${(newLeave && newLeave.id) || 'lv_1'}/review`, { status: 'approved', hoanTienAn: 'khong' });
check('T duyệt leave -> 403', r.status === 403, r);
r = await call(A.cookie, 'POST', `/api/leave/${(newLeave && newLeave.id) || 'lv_1'}/review`, { status: 'approved', reviewNote: 'OK test', hoanTienAn: 'khong' });
check('A duyệt leave', r.status === 200, r);
r = await call(P.cookie, 'POST', '/api/leave', { studentId: 's3', fromDate: '2026-08-10', toDate: '2026-08-10', reason: 'x' });
check('P tạo leave con người khác -> 403', r.status === 403, r);

// ---- menu / timetable ----
r = await call(P.cookie, 'GET', '/api/menu'); check('menu tuần này', r.status === 200 && (r.data.menus || r.data).length === 5, r);
r = await call(P.cookie, 'GET', '/api/menu?week=1'); check('menu tuần sau', r.status === 200, r);
r = await call(P.cookie, 'GET', '/api/timetable?classId=c1'); check('P tkb c1', r.status === 200, r);
r = await call(P.cookie, 'GET', '/api/timetable?classId=c2'); check('P tkb c2 (con thứ 2)', r.status === 200, r);
r = await call(T.cookie, 'GET', '/api/timetable?classId=c2'); check('T tkb lớp khác -> 403', r.status === 403, r);

// ---- remarks / reports ----
r = await call(P.cookie, 'GET', '/api/remarks?studentId=s1'); check('P remarks s1', r.status === 200 && r.data.length > 0 && r.data[0].teacherName, r);
r = await call(T.cookie, 'GET', '/api/remarks/class'); check('T remarks class', r.status === 200, r);
r = await call(T.cookie, 'POST', '/api/remarks', { studentId: 's1', content: 'Test nhận xét', rating: 'great', skills: ['Test'] });
check('T tạo remark', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'GET', '/api/reports?studentId=s1'); check('P reports s1', r.status === 200 && r.data.length === 2, r);
r = await call(P.cookie, 'GET', '/api/reports?studentId=s4'); check('P reports s4 -> 403', r.status === 403, r);

// ---- bus / conduct ----
r = await call(P.cookie, 'GET', '/api/bus'); check('P bus (s1 tuyến 1)', r.status === 200 && r.data.length >= 1, r);
r = await call(T.cookie, 'GET', '/api/bus'); check('T bus', r.status === 200, r);
r = await call(T.cookie, 'POST', '/api/bus/bus1/log', { text: 'Test cập nhật hành trình' }); check('T bus log', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'GET', '/api/conduct?studentId=s1'); check('P conduct s1', r.status === 200, r);
r = await call(T.cookie, 'GET', '/api/conduct/class'); check('T conduct class + ranking', r.status === 200 && r.data.ranking && r.data.ranking.length === 5, r);
r = await call(T.cookie, 'POST', '/api/conduct', { studentId: 's1', type: 'praise', title: 'Test', content: 'Test', points: 10 });
check('T tạo conduct', r.status === 200 || r.status === 201, r);

// ---- surveys / plans ----
r = await call(P.cookie, 'GET', '/api/surveys'); check('P surveys', r.status === 200 && r.data.length === 2, r);
r = await call(P.cookie, 'GET', '/api/surveys/sv1'); check('P survey detail', r.status === 200 && r.data.questions, r);
r = await call(P.cookie, 'POST', '/api/surveys/sv1/respond', { answers: { q1: 'Hài lòng', q2: 'Thỉnh thoảng', q3: 'Test' } });
check('P respond sv1', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'POST', '/api/surveys/sv1/respond', { answers: { q1: 'Hài lòng', q2: 'Hiếm khi', q3: 'x' } });
check('P respond lần 2 -> 400', r.status === 400, r);
r = await call(T.cookie, 'GET', '/api/surveys/sv1'); check('T survey results', r.status === 200 && r.data.results, r);
r = await call(T.cookie, 'POST', '/api/surveys', { title: 'Test KS', description: 'x', deadline: '2026-09-01', questions: [{ text: 'Q?', type: 'choice', options: ['A', 'B'] }] });
check('T tạo survey', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'GET', '/api/plans?classId=c1'); check('P plans c1', r.status === 200 && (r.data.plan || r.data.plans), r);
r = await call(T.cookie, 'GET', '/api/plans?classId=c2'); check('T plans lớp khác -> 403', r.status === 403, r);

// ---- health / medicine ----
r = await call(P.cookie, 'GET', '/api/health?studentId=s1'); check('P health s1 + latestCheckup', r.status === 200 && r.data.latestCheckup, r);
r = await call(T.cookie, 'POST', '/api/health', { studentId: 's1', type: 'checkup', title: 'Test khám', detail: 'x', height: 130, weight: 28 });
check('T tạo health', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'GET', '/api/medicine'); check('P medicine', r.status === 200 && r.data.length >= 1, r);
r = await call(P.cookie, 'POST', '/api/medicine', { studentId: 's1', fromDate: '2026-08-06', toDate: '2026-08-06', medicines: [{ name: 'Test thuốc', dose: '1 viên', timing: 'Sau ăn' }], note: 'x' });
check('P tạo medicine', r.status === 200 || r.status === 201, r);
const md = r.data;
r = await call(T.cookie, 'POST', `/api/medicine/${(md && md.id) || 'x'}/confirm`); check('T confirm medicine', r.status === 200, r);
r = await call(T.cookie, 'POST', `/api/medicine/${(md && md.id) || 'x'}/log`, { text: 'Đã cho uống' }); check('T medicine log', r.status === 200 || r.status === 201, r);
r = await call(T.cookie, 'POST', `/api/medicine/${(md && md.id) || 'x'}/done`); check('T medicine done', r.status === 200, r);

// ---- albums / notifications ----
r = await call(P.cookie, 'GET', '/api/albums'); check('P albums (2 lớp)', r.status === 200 && r.data.length === 4, r);
r = await call(T.cookie, 'GET', '/api/albums'); check('T albums lớp 3A = 3', r.status === 200 && r.data.length === 3, r);
r = await call(P.cookie, 'GET', '/api/albums/al1'); check('P album detail', r.status === 200 && r.data.photos, r);
r = await call(T2.cookie, 'GET', '/api/albums/al1'); check('T2 album lớp khác -> 403', r.status === 403, r);
r = await call(T.cookie, 'POST', '/api/albums', { title: 'Test album', description: 'x', photos: [{ emoji: '🎉', caption: 'Test' }] });
check('T tạo album', r.status === 200 || r.status === 201, r);
r = await call(P.cookie, 'GET', '/api/notifications'); check('P notifications >= 5', r.status === 200 && r.data.length >= 5, r);
r = await call(P.cookie, 'POST', '/api/notifications/nt1/read'); check('P đọc nt1', r.status === 200, r);
r = await call(P.cookie, 'POST', '/api/notifications/read-all'); check('P đọc tất cả', r.status === 200, r);
r = await call(T.cookie, 'POST', '/api/notifications', { title: 'Test TB', body: 'Nội dung', category: 'Lớp học', audience: 'class' });
check('T tạo notification', r.status === 200 || r.status === 201, r);

// ---- Thông báo: cắt cửa sổ ----
//
// Bảng thông báo chỉ thêm vào chứ không ai dọn, nên sau vài năm học, mở màn
// Thông báo là kéo cả lịch sử của trường về điện thoại chỉ để xem mấy dòng
// trên cùng. Máy chủ nay cắt ở 100 dòng một lượt, và màn hình có nút "xem
// thông báo cũ hơn" — cắt mà không có nút là GIẤU MẤT thông báo.
{
  const day = (await call(P.cookie, 'GET', '/api/notifications')).data;
  const mot = await call(P.cookie, 'GET', '/api/notifications?soLuong=1');
  check('TB: xin một dòng thì nhận đúng một', mot.data.length === 1, mot.data.length);
  check('TB: và là dòng đứng đầu của danh sách đầy đủ',
    mot.data[0].id === day[0].id, { mot: mot.data[0]?.id, day: day[0]?.id });
  const hai = await call(P.cookie, 'GET', '/api/notifications?bo=1&soLuong=1');
  check('TB: trang sau nối tiếp, không lặp lại',
    hai.data[0].id === day[1].id && hai.data[0].id !== mot.data[0].id,
    { hai: hai.data[0]?.id, day1: day[1]?.id });
  const gop = [];
  for (let i = 0; i < 20 && gop.length <= day.length; i++) {
    const t = await call(P.cookie, 'GET', `/api/notifications?bo=${gop.length}&soLuong=2`);
    if (!t.data.length) break;
    gop.push(...t.data.map(n => n.id));
  }
  check('TB: GHÉP TỪNG TRANG LẠI RA ĐÚNG DANH SÁCH CŨ',
    gop.join(',') === day.map(n => n.id).join(','), { ghep: gop.length, day: day.length });
  const het = await call(P.cookie, 'GET', `/api/notifications?bo=${day.length}`);
  check('TB: bỏ qua hết thì rỗng, không lỗi', het.status === 200 && het.data.length === 0, het.status);
  const bay = await call(P.cookie, 'GET', '/api/notifications?bo=-3&soLuong=99999');
  check('TB: số âm và số vượt trần đều không làm sập', bay.status === 200, bay.status);
  check('TB: thông báo GHIM vẫn đứng đầu trang một — cắt cửa sổ không đẩy nó rơi mất',
    !day.some((n, i) => n.pinned && day.slice(0, i).some(x => !x.pinned)),
    day.map(n => (n.pinned ? 'ghim' : '-')));

  const man = fsTb.readFileSync(pathTb.join(GOCTB, 'public/js/views/notifications.js'), 'utf8');
  check('TB: màn hình có nút "xem thông báo cũ hơn"', /Xem thông báo cũ hơn/.test(man));
  check('TB: và nút đó gọi máy chủ kèm chỗ bỏ qua', /bo=\$\{this\._list\.length\}/.test(man));
}

// ---- messages ----
r = await call(P.cookie, 'GET', '/api/messages'); check('P messages list + contacts', r.status === 200 && r.data.conversations && r.data.contacts, r);
const pConvs = r.data.conversations;
check('P thấy 3 hội thoại', pConvs.length === 3, pConvs.map(c => c.id));
r = await call(P.cookie, 'GET', '/api/messages/cv1'); check('P mở cv1', r.status === 200 && r.data.messages.length >= 5, r);
r = await call(P.cookie, 'GET', '/api/messages/cv3'); check('P mở cv3 (không tham gia) -> 403', r.status === 403, r);
r = await call(P.cookie, 'POST', '/api/messages/cv1', { text: 'Tin nhắn test từ phụ huynh' }); check('P gửi tin cv1', r.status === 200 || r.status === 201, r);
r = await call(T.cookie, 'GET', '/api/messages/cv1/poll?after=' + encodeURIComponent(new Date(Date.now() - 60000).toISOString()));
check('T poll thấy tin mới', r.status === 200 && r.data.messages.length >= 1, r);
r = await call(T.cookie, 'POST', '/api/messages/start', { userId: 'p6' }); check('T start với PH lớp khác -> 403', r.status === 403, r);
r = await call(T.cookie, 'POST', '/api/messages/start', { userId: 'p5' }); check('T start với PH lớp mình', (r.status === 200 || r.status === 201) && r.data.id, r);

// ---- auth edge ----
r = await call('', 'GET', '/api/students'); check('không cookie -> 401', r.status === 401, r);
// Chưa đăng nhập thì mọi API đều 401 trước khi kịp biết có tồn tại hay không.
r = await fetch(BASE + '/api/khongtontai').then(x => x.status); check('API lạ khi chưa đăng nhập -> 401', r === 401, r);
r = await call(P.cookie, 'GET', '/api/khongtontai'); check('API lạ khi đã đăng nhập -> 404', r.status === 404, r);

// In ĐÚNG dạng chung của mọi bài kiểm thử: `===== PASS: n  FAIL: n =====`.
//
// Bài này từng in thiếu hai đầu `=====`, và hậu quả không nằm ở chỗ xấu mã.
// Lệnh đếm ghi trong `docs/TIEN-DO.md` là `grep "PASS: " | awk '{s+=$3}'` —
// với dạng có `=====` thì $3 là con số, còn với dạng cụt thì $3 rơi vào chữ
// "FAIL" và cộng vào 0. Nghĩa là 69 phép kiểm của bài này CHƯA BAO GIỜ được
// đếm, và con số ghi trong tài liệu thấp hơn sự thật suốt từ đó tới giờ.
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (failures.length) { console.log('\nCHI TIẾT LỖI:'); failures.forEach(f => console.log(' ✗', f)); process.exit(1); }
