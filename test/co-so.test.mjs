// Bài canh TẦNG CƠ SỞ — dữ liệu giữa các cơ sở phải ĐỘC LẬP.
//
// Chạy bằng:  npm run test:co-so
//
// VÌ SAO CÓ BÀI NÀY
//
// Quy định phân quyền của nhà trường có một câu rất dứt khoát:
//
//     "Cấp 3 Cơ sở A không thể xem dữ liệu của Cấp 3 Cơ sở B."
//
// Đây là loại tính năng mà một bài kiểm thử cẩu thả sẽ luôn xanh: nếu dữ liệu
// mẫu chỉ có MỘT cơ sở thì không có gì để rò, và bài canh không chứng minh được
// điều gì cả. Nên dữ liệu mẫu cố ý có nhóm Mầm 1 ở cơ sở 2, và bài này tạo thêm
// một bé thật ở đó rồi mới đi soi.
//
// Bài cũng canh chiều ngược lại, quan trọng không kém: trường CHƯA khai báo cơ
// sở nào thì cả tầng này phải nằm im, không lấy đi quyền của một ai.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo,
  dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));
const { check, tongKet } = taoBoDem();

// ===========================================================================
// Phần A — trường CÓ cơ sở: Cấp 1 thấy tất, Cấp 3 chỉ thấy cơ sở mình
// ===========================================================================
const DIR = thuMucTam('co-so');
sinhDuLieu(DIR);
const mkCap1 = taoQuanTri(DIR, 'Giám Đốc Hệ Thống', 'cap1');
const mkCap3 = taoQuanTri(DIR, 'Quản Lý Cơ Sở Một', 'cap3');

// Một bé THẬT ở cơ sở 2, để có thứ mà cách ly. Thêm trực tiếp vào bảng: bài này
// canh đường QUYỀN, không canh đường nhập liệu.
{
  const db = new Database(path.join(DIR, 'school.db'));
  db.prepare(`INSERT INTO students (id, code, name, dob, gender, classId, active, createdAt)
              VALUES ('s_cs2', 'MN-CS2-01', 'Trần Khánh Linh', '2023-03-10', 'Nữ', 'c3', 1, ?)`)
    .run(new Date().toISOString());
  db.close();
}
khoaVaoCoSo(DIR, 'cap3', 'cs1');   // biến tài khoản cap3 thành Cấp 3 của cơ sở 1

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3940), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(user, mkTam) {
  const dau = await login(user, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: `${user}2026` } });
  return (await login(user, `${user}2026`)).cookie;
}
const C1 = await vao('cap1', mkCap1);
const C3 = await vao('cap3', mkCap3);

console.log('\n[1] Cấp 1 — toàn hệ thống, không bị giới hạn cơ sở nào');
{
  const bes = await req('GET', '/api/students', { cookie: C1 });
  check('thấy bé của MỌI cơ sở', bes.data.some(b => b.id === 's_cs2') && bes.data.length >= 9,
    { so: bes.data.length });
  check('mở được hồ sơ bé ở cơ sở 2', (await req('GET', '/api/students/s_cs2', { cookie: C1 })).status === 200);
  check('mở được hồ sơ bé ở cơ sở 1', (await req('GET', '/api/students/s1', { cookie: C1 })).status === 200);
  const cs = await req('GET', '/api/admin/campuses', { cookie: C1 });
  check('thấy đủ ba cơ sở', cs.data.length === 3, cs.data?.map(x => x.name));
}

console.log('\n[2] Cấp 3 — CHỈ thấy cơ sở mình, đây là câu quan trọng nhất của cả bài');
{
  const bes = await req('GET', '/api/students', { cookie: C3 });
  check('KHÔNG thấy bé của cơ sở khác trong danh sách',
    !bes.data.some(b => b.id === 's_cs2'), bes.data.map(b => b.name));
  check('vẫn thấy đủ bé của cơ sở mình', bes.data.length === 8, bes.data.length);

  check('MỞ THẲNG HỒ SƠ BÉ CƠ SỞ KHÁC → 403',
    (await req('GET', '/api/students/s_cs2', { cookie: C3 })).status === 403);
  check('vẫn mở được hồ sơ bé cơ sở mình',
    (await req('GET', '/api/students/s1', { cookie: C3 })).status === 200);
}

console.log('\n[3] Cách ly ăn xuyên mọi phân hệ, không chỉ ở màn danh sách');
{
  // Chặn ở tầng dữ liệu nghĩa là mọi phân hệ được chặn theo, kể cả phân hệ viết
  // sau này. Nếu chỉ chặn ở màn danh sách thì người biết đường dẫn vẫn lấy được.
  const duong = [
    ['điểm danh của nhóm', '/api/attendance/class?classId=c3'],
    ['kế hoạch giáo dục', '/api/plans?classId=c3'],
    ['lịch sinh hoạt', '/api/timetable?classId=c3'],
    ['hồ sơ sức khỏe', '/api/health?studentId=s_cs2'],
  ];
  for (const [ten, url] of duong) {
    const r = await req('GET', url, { cookie: C3 });
    check(`${ten} của cơ sở khác → bị chặn`, r.status === 403 || r.status === 404, r.status);
  }

  // Dặn thuốc và Xin nghỉ trả về DANH SÁCH của mọi bé mình được xem, không nhận
  // `studentId`. Với chúng, "bị chặn" không phải là 403 mà là KHÔNG CÓ DÒNG NÀO
  // của bé cơ sở khác trong danh sách. Đòi 403 ở đây là đòi sai, và bài canh
  // đòi sai thì tới lúc nó đỏ người ta sẽ đi sửa nhầm chỗ.
  for (const [ten, url] of [['dặn thuốc', '/api/medicine'], ['xin nghỉ', '/api/leave']]) {
    const r = await req('GET', url, { cookie: C3 });
    check(`${ten}: danh sách KHÔNG lọt bé của cơ sở khác`,
      r.status === 200 && !(r.data || []).some(x => x.studentId === 's_cs2'),
      { status: r.status, so: (r.data || []).length });
  }
  // Và cùng những đường đó với cơ sở MÌNH thì vẫn mở bình thường — thiếu vế này
  // thì "bị chặn hết" cũng có thể chỉ là app hỏng.
  for (const [ten, url] of [
    ['điểm danh của nhóm', '/api/attendance/class?classId=c1'],
    ['kế hoạch giáo dục', '/api/plans?classId=c1'],
    ['hồ sơ sức khỏe', '/api/health?studentId=s1'],
  ]) {
    check(`${ten} của cơ sở MÌNH vẫn mở bình thường`,
      (await req('GET', url, { cookie: C3 })).status === 200, url);
  }
}

console.log('\n[4] Cô và phụ huynh KHÔNG bị tầng cơ sở đụng tới');
{
  // Quyền của cô đi theo NHÓM LỚP, của phụ huynh đi theo CON. Cả hai đã chặt
  // hơn cơ sở, nên thêm một lớp chặn nữa chỉ tạo ra chỗ hỏng mới.
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;
  check('cô vẫn thấy đúng bé nhóm mình',
    (await req('GET', '/api/students', { cookie: GV })).data.length === 5,
    (await req('GET', '/api/students', { cookie: GV })).data.length);
  check('cô KHÔNG với sang bé cơ sở khác',
    (await req('GET', '/api/students/s_cs2', { cookie: GV })).status === 403);
  check('phụ huynh vẫn thấy đúng con mình',
    (await req('GET', '/api/students', { cookie: PH })).data.length === 2);
  check('phụ huynh KHÔNG với sang bé cơ sở khác',
    (await req('GET', '/api/students/s_cs2', { cookie: PH })).status === 403);
}

console.log('\n[4b] Gán tài khoản quản trị vào cơ sở — và hai chốt chặn không cho tự khoá cửa');
{
  const ds = await req('GET', '/api/admin/managers', { cookie: C1 });
  check('liệt kê được tài khoản quản trị kèm cấp', ds.status === 200 && ds.data.length >= 2, ds.data);
  const c1 = ds.data.find(u => u.username === 'cap1');
  const c3 = ds.data.find(u => u.username === 'cap3');
  check('cap1 là Cấp 1 (toàn hệ thống)', c1 && c1.cap === 1 && !c1.campusId, c1);
  check('cap3 là Cấp 3, khoá vào cơ sở 1', c3 && c3.cap === 3 && c3.campusId === 'cs1', c3);

  // CHỐT 1: không cho tự khoá chính mình.
  //
  // Người bấm nút đang là Cấp 1. Tự khoá mình lại là mất ngay quyền nhìn toàn
  // hệ thống — kể cả quyền mở lại chính màn hình này để tự gỡ ra.
  const tuKhoa = await req('PUT', `/api/admin/managers/${c1.id}/campus`,
    { cookie: C1, body: { campusId: 'cs2' } });
  check('KHÔNG cho tự khoá tài khoản của mình vào một cơ sở', tuKhoa.status === 400, tuKhoa.data);
  check('và nói rõ phải nhờ ai làm hộ', /quản trị toàn hệ thống khác/.test(tuKhoa.data?.error || ''),
    tuKhoa.data?.error);
  check('tự khoá hỏng thì tài khoản vẫn nguyên là Cấp 1',
    (await req('GET', '/api/students', { cookie: C1 })).data.length >= 9);

  // CHỐT 2 (SIẾT LẠI Ở N15): Cấp 3 KHÔNG CHẠM ĐƯỢC vào đường này.
  //
  // Bản đầu để Cấp 3 gọi được và chỉ chặn bằng luật "phải còn ít nhất một Cấp
  // 1". Luật đó canh chiều KHOÁ VÀO nhưng không canh chiều GỠ RA, nên Cấp 3
  // chỉ cần gỡ khoá của CHÍNH MÌNH là thành Cấp 1 trong một lời gọi. Nay chặn
  // ngay từ cửa: gán tài khoản vào cơ sở là việc của ban giám hiệu.
  //
  // Bài này CHẶT HƠN bản cũ chứ không lỏng hơn — người dùng đã duyệt việc siết.
  const khoaNot = await req('PUT', `/api/admin/managers/${c1.id}/campus`,
    { cookie: C3, body: { campusId: 'cs2' } });
  check('CẤP 3 KHÔNG GÁN ĐƯỢC CƠ SỞ CHO BẤT KỲ TÀI KHOẢN NÀO', khoaNot.status === 403, khoaNot.data);
  check('và nói rõ đây là việc của quản trị toàn hệ thống',
    /toàn hệ thống/.test(khoaNot.data?.error || ''), khoaNot.data?.error);

  // Lối leo thang ngắn nhất: Cấp 3 tự gỡ khoá của chính mình.
  const tuGo = await req('PUT', `/api/admin/managers/${c3.id}/campus`,
    { cookie: C3, body: { campusId: '' } });
  check('CẤP 3 KHÔNG TỰ GỠ KHOÁ CỦA MÌNH ĐỂ THÀNH CẤP 1', tuGo.status === 403, tuGo.data);
  check('tự gỡ hỏng thì vẫn chỉ thấy cơ sở mình',
    !(await req('GET', '/api/students', { cookie: C3 })).data.some(b => b.id === 's_cs2'));

  // Và bất biến cũ vẫn đúng: sau mọi thao tác, luôn còn ít nhất một Cấp 1.
  const conLai = await req('GET', '/api/admin/managers', { cookie: C1 });
  check('LUÔN CÒN ÍT NHẤT MỘT TÀI KHOẢN CẤP 1 sau mọi thao tác ở trên',
    (conLai.data || []).filter(u => u.cap === 1).length >= 1,
    (conLai.data || []).map(u => `${u.username}:cấp ${u.cap}`));

  // Gỡ khoá thì quay lại Cấp 1 ngay, không cần khởi động lại.
  const go = await req('PUT', `/api/admin/managers/${c3.id}/campus`, { cookie: C1, body: { campusId: '' } });
  check('gỡ khoá được', go.status === 200 && go.data.cap === 1, go.data);
  check('GỠ XONG LÀ THẤY TOÀN HỆ THỐNG NGAY',
    (await req('GET', '/api/students', { cookie: C3 })).data.some(b => b.id === 's_cs2'));
  // Khoá lại để phần sau của bài chạy đúng bối cảnh.
  await req('PUT', `/api/admin/managers/${c3.id}/campus`, { cookie: C1, body: { campusId: 'cs1' } });
  check('khoá lại được, và lại chỉ thấy cơ sở mình',
    !(await req('GET', '/api/students', { cookie: C3 })).data.some(b => b.id === 's_cs2'));
}

sv.dung();
donThuMucTam(DIR);

// ===========================================================================
// Phần B — trường CHƯA khai báo cơ sở: cả tầng này phải NẰM IM
// ===========================================================================
console.log('\n[5] Chưa khai báo cơ sở nào thì tầng cơ sở nằm im, không lấy quyền của ai');
{
  // Đây là tính chất an toàn quan trọng nhất của cả thiết kế. Một trường một cơ
  // sở dùng app này phải không hề biết tầng cơ sở tồn tại — và một tài khoản
  // quản trị đang có phải giữ nguyên quyền như trước khi có tầng này.
  const DIR2 = thuMucTam('co-so-trong');
  sinhDuLieu(DIR2);
  {
    const db = new Database(path.join(DIR2, 'school.db'));
    db.exec('DELETE FROM class_campus; DELETE FROM user_campus; DELETE FROM campuses;');
    db.close();
  }
  const mk = taoQuanTri(DIR2, 'Hiệu Trưởng', 'hieutruong');
  const sv2 = await dungMayChu({ port: 3941, dir: DIR2 });
  const req2 = taoReq(sv2.BASE);
  const login2 = taoLogin(req2);
  const dau = await login2('hieutruong', mk);
  await req2('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'hieutruong2026' } });
  const A = (await login2('hieutruong', 'hieutruong2026')).cookie;

  const bes = await req2('GET', '/api/students', { cookie: A });
  check('quản trị thấy đủ mọi bé như trước', bes.data.length === 8, bes.data.length);
  check('mở được nhóm bất kỳ', (await req2('GET', '/api/plans?classId=c3', { cookie: A })).status === 200);
  check('danh sách cơ sở rỗng, và đó không phải lỗi',
    (await req2('GET', '/api/admin/campuses', { cookie: A })).data.length === 0);

  const GV = (await login2('giaovien', '123456')).cookie;
  check('cô vẫn thấy đúng bé nhóm mình', (await req2('GET', '/api/students', { cookie: GV })).data.length === 5);

  sv2.dung();
  donThuMucTam(DIR2);
}

tongKet();
