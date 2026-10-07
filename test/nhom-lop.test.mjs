// Kiểm thử mô hình NHIỀU CÔ ↔ MỘT NHÓM LỚP (G0.4).
//
// Chạy bằng:  npm run test:nhom-lop
//
// VÌ SAO CÓ BÀI NÀY
//
// App 1 là trường tiểu học: một lớp đúng một giáo viên chủ nhiệm, quan hệ nằm ở
// hai cột `classes.teacherId` và `users.classId`. Trường mầm non thì một nhóm có
// 2–3 cô cùng phụ trách và một cô có thể phụ trách nhiều nhóm — hai cột kia
// không diễn tả nổi.
//
// Việc chuyển đổi chạm vào `lib/db.js`, tệp mà cả ứng dụng đang dựa vào, nên
// CLAUDE.md bắt đi ba bước, mỗi bước một commit:
//
//   1. Thêm bảng `class_teachers` + hàm mới, CHƯA AI GỌI.
//   2. Chuyển từng chỗ gọi sang hàm mới; hai cột cũ vẫn được ghi và vẫn đúng.
//   3. Đường quyền thôi ĐỌC hai cột cũ. Cột dữ liệu giữ nguyên, không DROP.
//
// Bài này canh cả ba bước. Mục [6] là mục quan trọng nhất của bước 1: nó chứng
// minh bước 1 CHƯA đổi hành vi của bất cứ màn hình nào — thêm cái mới bên cạnh
// đúng nghĩa "bên cạnh".
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoQuanTri, HOM_NAY } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();

// Trỏ DATA_DIR sang thư mục tạm TRƯỚC KHI nạp lib/db.js, để bài này không bao
// giờ chạm vào data/school.db của trường.
const DIR = thuMucTam('nhom-lop');
sinhDuLieu(DIR);
process.env.DATA_DIR = DIR;
const db = require('../lib/db.js');

// Đọc thẳng hai cột đời cũ, không qua hàm nào — để so gương cho chắc.
const lopCu = (id) => db.first('classes', 'SELECT * FROM classes WHERE id = ?', [id]);
const coCu = (id) => db.findUser(id);
const ten = (ds) => ds.map(t => t.id).join(',');

// Khởi động một tiến trình khác trên CÙNG cơ sở dữ liệu — mô phỏng lần khởi
// động máy chủ kế tiếp, tức đúng lúc phần chuyển đổi ở lib/db.js chạy.
function khoiDongLai() {
  execFileSync('node', ['-e', "require('./lib/db.js').close();"],
    { cwd: GOC, env: { ...process.env, DATA_DIR: DIR }, stdio: 'ignore' });
}

// ===========================================================================
console.log('\n[1] Dữ liệu mẫu tự kể được mô hình nhiều cô một nhóm');
{
  // Từ G0.5, dữ liệu mẫu KHÔNG còn là "một cô một lớp" của app 1: nhóm Chồi 2
  // có hai cô, và cô Bích Ngọc (t3) phụ trách cả hai nhóm. Nếu bài này đỏ vì
  // dữ liệu mẫu quay về một cô một lớp thì mô hình mầm non đã mất khỏi màn hình
  // đầu tiên người ta nhìn thấy — đó là lý do nó được canh ở đây.
  check('cô Mai Anh (t1) phụ trách nhóm Chồi 2',
    db.classIdsOfTeacher('t1').join(',') === 'c1', db.classIdsOfTeacher('t1'));
  check('nhóm Chồi 2 có HAI cô cùng phụ trách',
    db.teachersOfClass('c1').length === 2, ten(db.teachersOfClass('c1')));
  check('cô Mai Anh là người phụ trách chính, đứng đầu danh sách',
    db.teachersOfClass('c1')[0]?.id === 't1' && db.teachersOfClass('c1')[0]?.vaiTro === 'chinh',
    db.teachersOfClass('c1').map(t => `${t.id}:${t.vaiTro}`));
  check('cô Bích Ngọc (t3) phụ trách CẢ HAI nhóm — điều app 1 không tả nổi',
    db.classIdsOfTeacher('t3').slice().sort().join(',') === 'c1,c2', db.classIdsOfTeacher('t3'));
  check('danh sách cô KHÔNG kèm mật khẩu đã băm',
    db.teachersOfClass('c1').every(t => !('passwordHash' in t)));
  check('cô Thu Hương (t2) phụ trách nhóm Lá 1',
    db.classIdsOfTeacher('t2').join(',') === 'c2', db.classIdsOfTeacher('t2'));
}

// ===========================================================================
console.log('\n[2] Nhiều cô cùng phụ trách một nhóm');
{
  db.setClassTeachers('c1', ['t1', 't2'], 't1');
  const ds = db.teachersOfClass('c1');
  check('nhóm c1 giờ có hai cô', ds.length === 2, ten(ds));
  check('cô phụ trách chính đứng đầu danh sách', ds[0]?.id === 't1' && ds[0]?.vaiTro === 'chinh', ten(ds));
  check('cô còn lại được ghi vai "phụ"', ds[1]?.vaiTro === 'phu', ds[1]?.vaiTro);
  check('cả hai cô đều được tính là cô của nhóm',
    db.isTeacherOfClass('t1', 'c1') && db.isTeacherOfClass('t2', 'c1'));
  check('cô nhóm khác vẫn không phải cô của nhóm này', !db.isTeacherOfClass('p1', 'c1'));
}

// ===========================================================================
console.log('\n[3] Một cô phụ trách nhiều nhóm — điều app 1 không làm được');
{
  db.addClassTeacher('c2', 't1', 'phu');
  check('cô t1 phụ trách cả hai nhóm',
    db.classIdsOfTeacher('t1').sort().join(',') === 'c1,c2', db.classIdsOfTeacher('t1'));
  check('gán vào nhóm mới KHÔNG gỡ cô khỏi nhóm cũ', db.isTeacherOfClass('t1', 'c1'));
  check('nhóm c2 vẫn giữ cô đang có', db.isTeacherOfClass('t2', 'c2'));
  check('cô t1 ở c2 là cô phụ, không phải cô chính',
    db.teachersOfClass('c2').find(t => t.id === 't1')?.vaiTro === 'phu');

  db.removeClassTeacher('c2', 't1');
  check('gỡ khỏi một nhóm thì chỉ mất đúng nhóm đó',
    db.classIdsOfTeacher('t1').join(',') === 'c1', db.classIdsOfTeacher('t1'));
  check('nhóm c2 vẫn còn nguyên cô của nó', db.isTeacherOfClass('t2', 'c2'));
}

// ===========================================================================
console.log('\n[4] Hai cột đời cũ vẫn được ghi và vẫn đúng — còn đường quay lại');
{
  check('classes.teacherId của c1 là cô phụ trách chính', lopCu('c1').teacherId === 't1', lopCu('c1').teacherId);
  check('users.classId của cô chính trỏ đúng về c1', coCu('t1').classId === 'c1', coCu('t1').classId);
  check('cô PHỤ không chiếm users.classId của nhóm này',
    coCu('t2').classId === 'c2', coCu('t2').classId);

  // Đổi cô chính của c1 sang t2, y như quản trị vẫn làm ở app 1.
  db.setClassTeachers('c1', ['t1', 't2'], 't2');
  check('đổi cô chính thì classes.teacherId đi theo', lopCu('c1').teacherId === 't2', lopCu('c1').teacherId);
  check('users.classId của cô mới trỏ về nhóm mới', coCu('t2').classId === 'c1', coCu('t2').classId);
  check('nhóm CŨ của cô đó không còn mang tên cô nữa (không có "chủ nhiệm ma")',
    !lopCu('c2').teacherId, lopCu('c2').teacherId);
  check('nhưng cô vẫn còn trong nhóm cũ với vai phụ — đây mới là mầm non',
    db.isTeacherOfClass('t2', 'c2')
    && db.teachersOfClass('c2').find(t => t.id === 't2')?.vaiTro === 'phu',
    db.teachersOfClass('c2').map(t => `${t.id}:${t.vaiTro}`));

  db.setClassTeachers('c1', ['t1'], 't1');
  db.setClassTeachers('c2', ['t2'], 't2');
  check('dọn về một cô một nhóm thì hai cột cũ khớp lại như app 1',
    lopCu('c1').teacherId === 't1' && coCu('t1').classId === 'c1'
    && lopCu('c2').teacherId === 't2' && coCu('t2').classId === 'c2');
}

// ===========================================================================
console.log('\n[5] Nhóm đã đóng: giữ vết, KHÔNG giữ quyền');
{
  db.addClassTeacher('c2', 't1', 'phu');
  check('trước khi đóng, cô t1 đang phụ trách c2', db.classIdsOfTeacher('t1').includes('c2'));
  db.update('classes', 'c2', { active: false });
  check('nhóm đóng rồi thì không còn nằm trong quyền của cô',
    !db.classIdsOfTeacher('t1').includes('c2'), db.classIdsOfTeacher('t1'));
  check('nhưng vết "cô từng phụ trách nhóm này" vẫn còn — để mở lại album năm cũ',
    db.classIdsEverOfTeacher('t1').includes('c2'), db.classIdsEverOfTeacher('t1'));
  db.update('classes', 'c2', { active: true });
  db.removeClassTeacher('c2', 't1');
}

// ===========================================================================
console.log('\n[6] BƯỚC 3: đường quyền đi theo bảng mới, KHÔNG theo hai cột cũ nữa');
{
  // Mục quan trọng nhất của cả ba bước. Ở bước 1 và 2 mục này canh điều ngược
  // lại — rằng quyền CHƯA đổi. Bước 3 lật nó, và đó chính là việc bước 3 làm.
  const beC1 = db.studentsOf(coCu('t1'))[0];

  db.addClassTeacher('c1', 't2', 'phu');   // cô t2 là cô PHỤ của c1
  const t2 = coCu('t2');
  check('cô phụ đã có trong bảng mới', db.isTeacherOfClass('t2', 'c1'));
  check('cột users.classId đời cũ vẫn chỉ ghi nổi MỘT nhóm', t2.classId === 'c2', t2.classId);
  check('classIdsOf đi theo bảng mới nên thấy đủ cả hai nhóm',
    db.classIdsOf(t2).slice().sort().join(',') === 'c1,c2', db.classIdsOf(t2));
  check('studentsOf trả về trẻ của CẢ HAI nhóm',
    new Set(db.studentsOf(t2).map(s => s.classId)).size === 2,
    [...new Set(db.studentsOf(t2).map(s => s.classId))]);
  check('cô phụ mở được hồ sơ bé của nhóm mình phụ trách',
    db.canAccessStudent(t2, beC1.id), beC1.id);
  check('canAccessClass cũng mở theo', db.canAccessClass(t2, 'c1'));

  db.removeClassTeacher('c1', 't2');
  check('gỡ cô khỏi nhóm là mất quyền NGAY, không đợi đăng nhập lại',
    !db.canAccessStudent(coCu('t2'), beC1.id));
  check('và trẻ của nhóm đó rơi khỏi studentsOf ngay',
    db.studentsOf(coCu('t2')).every(s => s.classId === 'c2'),
    db.studentsOf(coCu('t2')).map(s => s.classId));
  check('phụ huynh không hề bị ảnh hưởng — vẫn đúng các con của mình',
    db.studentsOf(coCu('p1')).length > 0
    && db.studentsOf(coCu('p1')).every(s => (s.parentIds || []).includes('p1')),
    db.studentsOf(coCu('p1')).map(s => s.id));
}

console.log('\n[6b] BƯỚC 3: nhóm đã đóng không còn cấp quyền cho ai');
{
  const beC2 = db.studentsOf(coCu('t2'))[0];
  check('trước khi đóng, cô đọc được hồ sơ bé', db.canAccessStudent(coCu('t2'), beC2.id));
  db.update('classes', 'c2', { active: false });
  check('nhóm đóng rồi thì cô mất quyền đọc hồ sơ trẻ của nhóm đó',
    !db.canAccessStudent(coCu('t2'), beC2.id), beC2.id);
  check('classIdsOf cũng không còn nhóm đã đóng',
    !db.classIdsOf(coCu('t2')).includes('c2'), db.classIdsOf(coCu('t2')));
  check('nhưng vết "cô từng phụ trách nhóm này" còn nguyên cho album năm cũ',
    db.classIdsEverOfTeacher('t2').includes('c2'), db.classIdsEverOfTeacher('t2'));
  db.update('classes', 'c2', { active: true });
}

// ===========================================================================
console.log('\n[7] Không nhận người không phải cô vào nhóm');
{
  const truoc = ten(db.teachersOfClass('c1'));
  const kq = db.setClassTeachers('c1', ['p1'], 'p1');   // p1 là phụ huynh
  check('gán một phụ huynh làm cô → không ghi gì', kq.length === 0, kq);
  check('nhóm bị dọn trống chứ không nhận nhầm người',
    !db.isTeacherOfClass('p1', 'c1'), ten(db.teachersOfClass('c1')));
  db.setClassTeachers('c1', ['t1'], 't1');
  check('trả nhóm về như cũ được', ten(db.teachersOfClass('c1')) === truoc, ten(db.teachersOfClass('c1')));
  check('gán vào một nhóm không có thật → không ghi gì',
    db.setClassTeachers('khong-co-nhom-nay', ['t1'], 't1').length === 0);
}

// ===========================================================================
console.log('\n[8] Nếp CŨ của app 1 vẫn còn nguyên cho đường API cũ');
{
  // `PUT /api/admin/classes/:id` với trường `teacherId` nghĩa là "một cô một
  // lớp": gán cô vào lớp này thì gỡ cô khỏi mọi lớp khác. Bản giao diện cũ nằm
  // trong điện thoại đã cài app vẫn gọi đường này, nên nó phải giữ nguyên nghĩa.
  db.addClassTeacher('c2', 't1', 'phu');
  check('trước khi gọi, cô t1 đang ở hai nhóm',
    db.classIdsOfTeacher('t1').length === 2, db.classIdsOfTeacher('t1'));
  db.setHomeroomTeacher('c2', 't1');
  check('nếp cũ gỡ cô khỏi mọi nhóm khác, chỉ còn nhóm vừa gán',
    db.classIdsOfTeacher('t1').join(',') === 'c2', db.classIdsOfTeacher('t1'));
  check('nhóm vừa gán chỉ còn đúng cô đó', ten(db.teachersOfClass('c2')) === 't1',
    ten(db.teachersOfClass('c2')));
  check('hai cột cũ khớp đúng nếp app 1',
    lopCu('c2').teacherId === 't1' && coCu('t1').classId === 'c2');
  check('nhóm cô vừa rời không còn mang tên cô', !lopCu('c1').teacherId, lopCu('c1').teacherId);

  // Trả về trạng thái ban đầu của dữ liệu mẫu.
  db.setHomeroomTeacher('c1', 't1');
  db.setHomeroomTeacher('c2', 't2');
  check('dọn lại được về đúng dữ liệu mẫu ban đầu',
    lopCu('c1').teacherId === 't1' && lopCu('c2').teacherId === 't2');
}

// ===========================================================================
console.log('\n[9] Phần chuyển đổi lúc khởi động CHỈ THÊM, không bao giờ xóa');
{
  db.addClassTeacher('c1', 't2', 'phu');   // cô phụ — hai cột đời cũ KHÔNG chứa nổi
  db.run('DELETE FROM class_teachers WHERE classId = ? AND teacherId = ?', ['c1', 't1']);
  check('đã cố ý làm mất phân công của cô chính', !db.isTeacherOfClass('t1', 'c1'));

  khoiDongLai();

  check('lần khởi động sau tự dựng lại phân công từ hai cột cũ',
    db.isTeacherOfClass('t1', 'c1'));
  check('và KHÔNG xóa mất cô phụ, thứ hai cột cũ không chứa nổi',
    db.isTeacherOfClass('t2', 'c1'), ten(db.teachersOfClass('c1')));

  // Gỡ có chủ ý thì phải ở yên, không bị dựng dậy — vì mọi đường ghi đều cập
  // nhật hai cột cũ, nên hai cột cũ luôn là TẬP CON của bảng mới.
  db.removeClassTeacher('c1', 't2');
  db.setClassTeachers('c1', [], null);
  khoiDongLai();
  check('phân công đã gỡ có chủ ý KHÔNG bị dựng dậy',
    db.teachersOfClass('c1').length === 0, ten(db.teachersOfClass('c1')));

  db.setHomeroomTeacher('c1', 't1');
}

// ===========================================================================
console.log('\n[9b] Script chữa cháy dọn được CẢ bảng quyền, không chỉ hai cột cũ');
{
  // `scripts/sua-quyen-chu-nhiem.js` ra đời từ app 1, lúc quyền còn đi theo
  // `users.classId`. Sau G0.4 quyền đi theo `class_teachers`, nên script phải
  // nói được điều gì thật sự xảy ra — nếu không, người vận hành chạy nó trong
  // lúc chữa cháy rồi tin vào một câu báo cáo sai.
  const chay = (themCo) => {
    try {
      return { ma: 0, ra: execFileSync('node', ['scripts/sua-quyen-chu-nhiem.js', ...(themCo ? ['--sua'] : [])],
        { cwd: GOC, env: { ...process.env, DATA_DIR: DIR }, encoding: 'utf8' }) };
    } catch (e) {
      return { ma: e.status, ra: String(e.stdout || '') };
    }
  };

  // -- Kiểu 3: hai cột cũ đúng, bảng quyền mất phân công.
  db.run('DELETE FROM class_teachers WHERE teacherId = ?', ['t1']);
  check('đã cố ý làm cô mất nhóm trong bảng quyền', db.classIdsOfTeacher('t1').length === 0);
  const r1 = chay(false);
  check('script báo đúng là vừa dựng lại phân công', /vừa được DỰNG LẠI/.test(r1.ra), r1.ra.slice(0, 200));
  check('và nêu đích danh cô nào, nhóm nào', /Mai Anh/.test(r1.ra) && /Chồi 2/.test(r1.ra));
  check('cô nhận lại được nhóm ngay, không cần khởi động lại máy chủ',
    db.classIdsOfTeacher('t1').join(',') === 'c1', db.classIdsOfTeacher('t1'));
  check('chế độ chỉ xem vẫn thoát bằng mã khác 0 để người dùng biết là chưa xong', r1.ma === 1, r1.ma);

  // -- Kiểu 1: cô còn gắn với nhóm không còn là của mình.
  db.run(`UPDATE users SET classId = 'c1' WHERE id = 't2'`);
  const r2 = chay(false);
  check('script thấy cô đang giữ thừa quyền', /GIỮ THỪA QUYỀN/.test(r2.ra), r2.ra.slice(0, 200));
  check('chỉ xem thì KHÔNG đụng vào hai cột đời cũ', coCu('t2').classId === 'c1', coCu('t2').classId);
  const r3 = chay(true);
  // Script gỡ cô khỏi nhóm không phải của cô (kiểu 1), rồi gắn cô về đúng nhóm
  // mà `classes.teacherId` đang ghi (kiểu 2) — chứ không bỏ cô lơ lửng không nhóm.
  check('sửa thật thì trả cô về đúng nhóm của mình', coCu('t2').classId === 'c2', coCu('t2').classId);
  // Đây là phép thử quan trọng nhất của mục này: THU HỒI THẬT. Gỡ mỗi cột đời cũ
  // là chưa thu hồi được gì — quyền đọc hồ sơ trẻ đi theo `class_teachers`.
  check('và quyền với nhóm không phải của cô bị THU HỒI THẬT trong bảng quyền',
    !db.isTeacherOfClass('t2', 'c1'), ten(db.teachersOfClass('c1')));
  const beC1 = db.studentsOf(coCu('t1'))[0];
  check('cô không đọc được hồ sơ bé của nhóm đó nữa',
    !db.canAccessStudent(coCu('t2'), beC1.id), beC1.id);
  check('sửa xong thoát sạch', r3.ma === 0, r3.ma);
  check('nói rõ không cần khởi động lại máy chủ', /không cần khởi động lại/i.test(r3.ra));

  // -- Kiểu 4: nhóm đang mở mà không còn cô nào. CHỈ báo, KHÔNG tự đoán.
  db.setClassTeachers('c2', [], null);
  const r4 = chay(false);
  check('script báo nhóm đang mở không còn cô nào', /KHÔNG còn cô nào phụ trách/.test(r4.ra), r4.ra.slice(0, 300));
  check('và KHÔNG tự gán bừa một cô vào nhóm đó',
    db.teachersOfClass('c2').length === 0, ten(db.teachersOfClass('c2')));
  check('nói rõ đây là việc của nhà trường', /việc của nhà trường/.test(r4.ra));

  db.setHomeroomTeacher('c2', 't2');
  db.setHomeroomTeacher('c1', 't1');
}

db.close();
donThuMucTam(DIR);

// ===========================================================================
// Phần hai: qua HTTP, trên một máy chủ thật và một cơ sở dữ liệu riêng.
//
// Phần trên gọi thẳng lib/db.js. Phần này đi đúng đường mà quản trị bấm trên màn
// hình, vì chỗ dễ sai nhất không phải câu SQL mà là đường API nào gọi hàm nào.
// ===========================================================================
const PORT = Number(process.env.TEST_PORT || 3765);
const BASE = `http://localhost:${PORT}`;
const DIR2 = thuMucTam('nhom-lop-http');
const may = await dungMayChu({ port: PORT, dir: DIR2 });

async function req(method, duong, { body, cookie } = {}) {
  const res = await fetch(BASE + duong, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* không phải JSON */ }
  return { status: res.status, data };
}
async function dangNhap(u, p) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  });
  const sc = res.headers.get('set-cookie');
  return sc ? sc.split(';')[0] : null;
}

const mkQt = taoQuanTri(DIR2, 'Hiệu trưởng Nhóm Lớp', 'ht.nhomlop');
let qt = await dangNhap('ht.nhomlop', mkQt);
await req('POST', '/api/auth/set-new-password', { cookie: qt, body: { newPassword: 'quantri2026' } });
qt = await dangNhap('ht.nhomlop', 'quantri2026');

console.log('\n[10] Quản trị phân công nhiều cô cho một nhóm, qua màn hình');
{
  const r = await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: qt, body: { teacherIds: ['t1', 't2'], chinhId: 't1' },
  });
  check('đặt được danh sách cô của nhóm → 200', r.status === 200, r.data);
  check('trả về đủ hai cô', (r.data?.teachers || []).length === 2, r.data?.teachers);
  check('cô phụ trách chính đứng đầu', r.data?.teachers?.[0]?.vaiTro === 'chinh', r.data?.teachers);
  check('tên các cô ghép lại đủ cả hai', (r.data?.teacherNames || '').split(', ').length === 2,
    r.data?.teacherNames);

  const ov = await req('GET', '/api/admin/overview', { cookie: qt });
  const c1 = (ov.data?.classes || []).find(c => c.id === 'c1');
  check('màn hình quản trị nêu đủ các cô của nhóm',
    (c1?.teacherNames || '').split(', ').length === 2, c1?.teacherNames);
  check('cột chủ nhiệm đời cũ vẫn trỏ đúng cô chính', c1?.teacherId === 't1', c1?.teacherId);
}

console.log('\n[11] Một cô phụ trách nhiều nhóm — không nhóm nào gỡ mất nhóm nào');
{
  await req('PUT', '/api/admin/classes/c2/teachers', {
    cookie: qt, body: { teacherIds: ['t2', 't1'], chinhId: 't2' },
  });
  const gv = await req('GET', '/api/admin/teachers', { cookie: qt });
  const t1 = (gv.data || []).find(t => t.id === 't1');
  check('cô t1 hiện đang phụ trách hai nhóm', (t1?.classIds || []).length === 2, t1?.classIds);
  check('màn hình nêu đủ tên hai nhóm', (t1?.className || '').split(', ').length === 2, t1?.className);

  const c1 = await req('GET', '/api/admin/overview', { cookie: qt });
  check('nhóm đầu KHÔNG bị gỡ mất cô khi cô nhận thêm nhóm sau',
    ((c1.data?.classes || []).find(c => c.id === 'c1')?.teachers || []).some(t => t.id === 't1'));
}

console.log('\n[12] Đường API cũ vẫn giữ đúng nghĩa "một cô một lớp"');
{
  // Bản giao diện cũ nằm trong điện thoại đã cài app vẫn gửi trường `teacherId`
  // qua đường này. Nó phải tiếp tục gỡ cô khỏi các nhóm khác, đúng như trước.
  const r = await req('PUT', '/api/admin/classes/c2', { cookie: qt, body: { teacherId: 't1' } });
  check('đường cũ vẫn chạy → 200', r.status === 200, r.status);
  const gv = await req('GET', '/api/admin/teachers', { cookie: qt });
  const t1 = (gv.data || []).find(t => t.id === 't1');
  check('đường cũ gỡ cô khỏi nhóm khác, chỉ còn nhóm vừa gán',
    (t1?.classIds || []).join(',') === 'c2', t1?.classIds);
}

console.log('\n[13] Danh sách cô không nhận người ngoài');
{
  check('gán một phụ huynh làm cô → 400',
    (await req('PUT', '/api/admin/classes/c1/teachers',
      { cookie: qt, body: { teacherIds: ['p1'] } })).status === 400);
  check('cô chính không nằm trong danh sách → 400',
    (await req('PUT', '/api/admin/classes/c1/teachers',
      { cookie: qt, body: { teacherIds: ['t1'], chinhId: 't2' } })).status === 400);
  check('thiếu hẳn danh sách → 400',
    (await req('PUT', '/api/admin/classes/c1/teachers', { cookie: qt, body: {} })).status === 400);
  check('nhóm không có thật → 404',
    (await req('PUT', '/api/admin/classes/khong-co/teachers',
      { cookie: qt, body: { teacherIds: [] } })).status === 404);

  const co = await dangNhap('giaovien', '123456');
  check('cô KHÔNG tự phân công được cô cho nhóm',
    (await req('PUT', '/api/admin/classes/c1/teachers',
      { cookie: co, body: { teacherIds: ['t1'] } })).status === 403);
}

console.log('\n[14] Sổ điểm danh mở được từng nhóm');
{
  // Dọn về một cô một nhóm trước, vì bài [11]–[12] đã xếp cô t1 vào cả hai nhóm.
  await req('PUT', '/api/admin/classes/c1/teachers', { cookie: qt, body: { teacherIds: ['t1'], chinhId: 't1' } });
  await req('PUT', '/api/admin/classes/c2/teachers', { cookie: qt, body: { teacherIds: ['t2'], chinhId: 't2' } });
  const co = await dangNhap('giaovien', '123456');
  const tatCa = await req('GET', '/api/attendance/class', { cookie: co });
  check('không chọn nhóm thì giữ nguyên hành vi cũ', tatCa.status === 200 && tatCa.data.students.length > 0,
    tatCa.data?.students?.length);
  check('kèm danh sách nhóm để màn hình dựng ô chọn',
    Array.isArray(tatCa.data?.nhom) && tatCa.data.nhom.length >= 1, tatCa.data?.nhom);
  const mot = await req('GET', '/api/attendance/class?classId=c1', { cookie: co });
  check('chọn nhóm thì chỉ còn trẻ của nhóm đó', mot.status === 200 && mot.data.students.length > 0,
    mot.data?.students?.length);
  check('chọn nhóm không thuộc quyền → 403',
    (await req('GET', '/api/attendance/class?classId=c2', { cookie: co })).status === 403);
}

console.log('\n[15] Gia đình nhắn được cho MỌI cô của nhóm, không chỉ một cô');
{
  // MỤC TIÊU KHÔNG ĐỔI, CÁCH ĐẠT TỚI THÌ ĐỔI (Đ151).
  //
  // Bản trước đo điều này bằng cách đếm: gia đình phải thấy ĐỦ HAI CÔ trong
  // danh sách liên hệ, mỗi cô một dòng, và hai vai phải phân biệt được bằng
  // chữ. Nhà trường 10/09 bỏ đúng cách ấy đi: *"chứ mình cũng k muốn là nhắn
  // tin với từng cô riêng lẻ"*.
  //
  // Cách mới đạt CÙNG mục tiêu và đạt chặt hơn: gia đình có MỘT cuộc với nhóm,
  // và MỌI cô của nhóm đọc được cuộc đó. Bản cũ chỉ chứng minh gia đình BẤM
  // ĐƯỢC vào tên cô thứ hai; bản này chứng minh cô thứ hai THẬT SỰ đọc được
  // điều gia đình đã nói — kể cả khi gia đình không hề nhắn riêng cho cô ấy.
  await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: qt, body: { teacherIds: ['t1', 't2'], chinhId: 't1' },
  });
  // Dùng phụ huynh p2: con (bé s3) chỉ học MỘT nhóm (c1). Phụ huynh p1 có hai
  // con ở hai nhóm khác nhau nên không nói được gì gọn về vai của cô ở nhóm này.
  const ph = await dangNhap('phuhuynh2', '123456');
  const ds = await req('GET', '/api/messages', { cookie: ph });
  const lh = ds.data?.contacts || [];
  check('gia đình KHÔNG còn danh sách từng cô để bấm vào',
    lh.every(x => !x.userId), lh.map(x => x.name));
  check('mà có đúng một dòng "Nhóm lớp …" cho con mình',
    lh.filter(x => x.kenh === 'nhom' && x.studentId === 's3').length === 1, lh.map(x => x.name));

  const kenh = await req('POST', '/api/messages/start', {
    cookie: ph, body: { kenh: 'nhom', studentId: 's3' },
  });
  check('mở được kênh với nhóm lớp', kenh.status === 200 && !!kenh.data?.id, kenh.data);
  await req('POST', `/api/messages/${kenh.data.id}`, {
    cookie: ph, body: { text: 'Nhà con xin phép đón sớm hôm nay ạ' },
  });

  const co1 = await dangNhap('giaovien', '123456');   // t1 — cô chính
  const co2 = await dangNhap('giaovien2', '123456');  // t2 — cô thứ hai của nhóm
  const doc1 = await req('GET', `/api/messages/${kenh.data.id}`, { cookie: co1 });
  const doc2 = await req('GET', `/api/messages/${kenh.data.id}`, { cookie: co2 });
  check('CÔ CHÍNH đọc được', doc1.status === 200
    && (doc1.data.messages || []).some(m => /đón sớm/.test(m.text)), doc1.status);
  check('CÔ THỨ HAI CỦA NHÓM CŨNG ĐỌC ĐƯỢC — dù gia đình không nhắn riêng cho cô ấy',
    doc2.status === 200 && (doc2.data.messages || []).some(m => /đón sớm/.test(m.text)), doc2.status);
  const tra = await req('POST', `/api/messages/${kenh.data.id}`, {
    cookie: co2, body: { text: 'Dạ cô nhận được rồi ạ' },
  });
  check('và cô thứ hai TRẢ LỜI được vào chính cuộc đó', tra.status === 200, tra.status);
}

console.log('\n[16] TẠO CÔ MỚI KHÔNG ĐƯỢC XOÁ SẠCH PHÂN CÔNG CỦA CÁC CÔ ĐANG DẠY');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `POST /api/admin/teachers` gọi `datChuNhiem` → `db.setHomeroomTeacher`, tức
  // ĐẶT LẠI danh sách cô của nhóm thành đúng MỘT người. Văn phòng tạo tài khoản
  // cho cô mới rồi chọn nhóm ở ô "Phụ trách nhóm" là mọi cô đang dạy nhóm đó
  // mất sạch quyền — mà `class_teachers` là nguồn sự thật duy nhất của quyền
  // đọc hồ sơ trẻ. Sáng hôm sau cô mở app thấy "Nhóm chưa có bé nào".
  //
  // App báo "Đã tạo tài khoản" kèm mật khẩu tạm, không một lời cảnh báo. Đây là
  // mất dữ liệu im lặng, đúng thứ Nguyên tắc số 1 cấm.
  //
  // Lý lẽ giữ nếp cũ "một cô một lớp" ở mục [12] là vì bản giao diện cũ trong
  // điện thoại vẫn gửi `teacherId` qua đường ĐÓ. Nó không áp được ở đây: một cô
  // vừa tạo ra thì không thể từng là cô duy nhất của nhóm nào.
  await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: qt, body: { teacherIds: ['t1', 't2'], chinhId: 't1' },
  });
  // Đọc danh sách cô của nhóm qua `GET /api/admin/teachers` — cùng cách mục
  // [12] dùng. Không có đường `GET /api/admin/classes` nào cả.
  const coCuaNhom = async (cid) => {
    const gv = await req('GET', '/api/admin/teachers', { cookie: qt });
    return (gv.data || []).filter(t => (t.classIds || []).includes(cid)).map(t => t.id);
  };
  const truoc = await coCuaNhom('c1');
  check('dựng được nhóm HAI CÔ để làm phép thử — nếu không thì mục này rỗng',
    truoc.length === 2, truoc);

  const moi = await req('POST', '/api/admin/teachers', {
    cookie: qt, body: { name: 'Cô Lan Mới', classId: 'c1' },
  });
  check('tạo được tài khoản cô mới kèm nhóm', moi.status === 201, `${moi.status} ${JSON.stringify(moi.data).slice(0, 120)}`);

  const ds = await coCuaNhom('c1');
  check('HAI CÔ CŨ VẪN CÒN NGUYÊN trong nhóm', ds.includes('t1') && ds.includes('t2'), ds);
  check('và cô mới được thêm vào, không thay thế ai', ds.includes(moi.data?.id) && ds.length === 3, ds);

  // Quyền là thứ thật sự mất, không phải chỉ một dòng trong bảng.
  const cookieCu = await dangNhap('giaovien', '123456');
  const beCuaCo = await req('GET', '/api/students', { cookie: cookieCu });
  check('cô cũ VẪN mở được danh sách bé của nhóm mình',
    beCuaCo.status === 200 && (beCuaCo.data || []).length > 0,
    `${beCuaCo.status} ${(beCuaCo.data || []).length}`);

  // Và luồng "tạo nhóm rồi tạo cô" giữ nguyên: nhóm chưa có ai thì cô mới là
  // cô phụ trách CHÍNH, đúng như trước bản vá.
  const nhomMoi = await req('POST', '/api/admin/classes', {
    cookie: qt, body: { name: 'Nhà trẻ 2', year: '2026-2027' },
  });
  const nhomId = nhomMoi.data?.id;
  const coDau = await req('POST', '/api/admin/teachers', {
    cookie: qt, body: { name: 'Cô Đầu Tiên', classId: nhomId },
  });
  const dsMoi = await coCuaNhom(nhomId);
  check('nhóm chưa có ai thì cô mới vào đúng nhóm đó, một mình',
    dsMoi.length === 1 && dsMoi[0] === coDau.data?.id, { dsMoi, moi: coDau.data?.id });
}

console.log('\n[17] ĐƯỜNG CŨ KHÔNG ĐƯỢC LÀ LỐI ĐI VÒNG QUA HAI CHỐT CỦA ĐƯỜNG MỚI');
{
  // `PUT /api/admin/classes/:id/teachers` có `chanNeuVanPhong` vì mô tả chức vụ
  // Văn phòng cơ sở nói rõ họ "KHÔNG đụng tài khoản và KHÔNG phân công cô".
  // Nhưng đường CŨ `PUT /api/admin/classes/:id` cũng phân công cô được — chỉ
  // cần gửi kèm `teacherId` — và trước bản vá nó không hỏi chốt đó lần nào.
  //
  // Mục này chỉ kiểm phần KHÔNG cần dựng chức vụ: vế "vẫn sửa được tên nhóm"
  // và vế cơ sở. Vế chức vụ do test:chuc-vu canh.
  const doiTen = await req('PUT', '/api/admin/classes/c1', {
    cookie: qt, body: { name: 'Chồi 2' },
  });
  check('quản trị vẫn sửa được tên nhóm qua đường cũ — chốt không gắn cho cả đường',
    doiTen.status === 200, doiTen.status);

  const ganLai = await req('PUT', '/api/admin/classes/c1', { cookie: qt, body: { teacherId: 't1' } });
  check('quản trị toàn hệ thống vẫn phân công cô qua đường cũ được',
    ganLai.status === 200, `${ganLai.status} ${ganLai.data?.error || ''}`);
}

console.log('\n[18] PHÒNG CHAT CỦA CẢ NĂM HỌC PHẢI MỞ ĐƯỢC — CỬA SỔ TIN, KHÔNG PHẢI TẤT CẢ');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Nhóm lớp mầm non là MỘT hội thoại chung của cô và 20 gia đình, và Nhắn tin
  // là phân hệ dùng hằng ngày. Vài chục tin một ngày là bình thường, nên sau
  // một năm học hội thoại đó có hàng nghìn tin.
  //
  // `GET /api/messages/:id` trước đây lấy MỌI tin, không giới hạn: máy chủ dựng
  // chừng ấy đối tượng, đường truyền chở chừng ấy chữ, và điện thoại Android rẻ
  // tiền của trường dựng chừng ấy bong bóng chat trước khi vẽ được khung hình
  // đầu tiên. Người dùng đọc cái chậm đó ra là "app hỏng".
  //
  // Nhưng cắt bớt mà không nói là GIẤU. Nên mục này đo CẢ HAI vế: cửa sổ có
  // chặn không, và có đường nào lấy lại tin cũ không.
  const gv = await dangNhap('giaovien', '123456');
  const ph = await dangNhap('phuhuynh2', '123456');

  // Mở hội thoại riêng giữa cô t1 và một phụ huynh, rồi bơm tin thẳng vào cơ sở
  // dữ liệu — gửi 600 lần qua API thì bài test chạy hàng phút mà không đo thêm
  // được gì.
  // Từ Đ151 gia đình mở cuộc bằng KÊNH + BÉ chứ không bằng mã cô. Điều mục này
  // đo — cửa sổ tin có chặn không, và có đường lấy lại tin cũ không — không phụ
  // thuộc vào cuộc đó thuộc loại nào, nên chỉ đổi đúng cái cửa đi vào.
  const batDau = await req('POST', '/api/messages/start', {
    cookie: ph, body: { kenh: 'nhom', studentId: 's3' },
  });
  const hoiThoai = batDau.data?.id;
  check('mở được kênh gia đình ↔ nhóm lớp', !!hoiThoai, batDau.data);

  const SO_TIN = 600;
  const conn = new Database(path.join(DIR2, 'school.db'));
  const them = conn.prepare(
    'INSERT INTO messages (id, conversationId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)');
  // Đặt mẻ tin thử NGAY SAU tin mới nhất đang có, không đặt vào quá khứ. Bản
  // đầu của mục này lấy mốc tháng 9/2025 nên nó nằm TRƯỚC cả dữ liệu mẫu lẫn
  // mốc `lastRead` của gia đình — hai phép kiểm ở dưới xanh/đỏ vì lý do khác
  // hẳn lý do chúng nói. Chính là kiểu bài canh rỗng mà Đ33 đã dọn một lượt.
  const dangCo = conn.prepare('SELECT COUNT(*) n, MAX(createdAt) mx FROM messages WHERE conversationId = ?')
    .get(hoiThoai);
  const goc = (dangCo.mx ? new Date(dangCo.mx).getTime() : Date.now()) + 1000;
  const TONG = (dangCo.n || 0) + SO_TIN;
  conn.transaction(() => {
    for (let i = 0; i < SO_TIN; i++) {
      them.run(`mtest_${i}`, hoiThoai, i % 2 ? 't1' : 'p2', `tin số ${i}`,
        new Date(goc + i * 1000).toISOString());
    }
  })();
  conn.close();

  const mo = await req('GET', `/api/messages/${hoiThoai}`, { cookie: gv });
  const ds = mo.data?.messages || [];
  check('mở phòng chat không kéo về cả năm học', ds.length < TONG, [ds.length, TONG]);
  check('nhưng vẫn nạp đủ dày để dùng được ngay (từ 100 tin trở lên)',
    ds.length >= 100, ds.length);

  // Cắt ở đầu MỚI, không phải đầu cũ: mở phòng ra mà thấy tin của tháng Chín
  // thì cửa sổ này vô dụng.
  check('cửa sổ lấy các tin MỚI NHẤT', ds[ds.length - 1]?.text === `tin số ${SO_TIN - 1}`,
    ds[ds.length - 1]?.text);
  const xuoi = ds.every((m, i) => i === 0 || m.createdAt >= ds[i - 1].createdAt);
  check('và trả về theo thứ tự thời gian xuôi, đúng như màn hình vẽ', xuoi);

  // VẾ THỨ HAI: cắt bớt phải kèm đường lấy lại.
  check('máy chủ NÓI RA là phía trước còn tin cũ hơn', mo.data?.conCu === true, mo.data?.conCu);
  check('và đưa mốc để hỏi tiếp', typeof mo.data?.tuLuc === 'string' && !!mo.data.tuLuc, mo.data?.tuLuc);

  const cu = await req('GET', `/api/messages/${hoiThoai}?truoc=${encodeURIComponent(mo.data.tuLuc)}`,
    { cookie: gv });
  const dsCu = cu.data?.messages || [];
  check('lấy được mẻ tin CŨ HƠN', dsCu.length > 0, dsCu.length);
  check('mẻ cũ nằm hoàn toàn TRƯỚC mẻ đang hiện — không chồng, không sót',
    dsCu[dsCu.length - 1]?.createdAt < ds[0].createdAt
    && dsCu[dsCu.length - 1]?.text === `tin số ${SO_TIN - ds.length - 1}`,
    [dsCu[dsCu.length - 1]?.text, ds[0]?.text, ds.length]);

  // Lật hết về đầu: không được có tin nào rơi ra ngoài mọi cửa sổ.
  let moc = mo.data.tuLuc;
  let dem = ds.length;
  for (let vong = 0; vong < 20; vong++) {
    const r = await req('GET', `/api/messages/${hoiThoai}?truoc=${encodeURIComponent(moc)}`, { cookie: gv });
    const l = r.data?.messages || [];
    if (!l.length) break;
    dem += l.length;
    moc = r.data.tuLuc;
    if (!r.data.conCu) break;
  }
  check('LẬT HẾT VỀ ĐẦU THÌ ĐẾM ĐỦ MỌI TIN — không tin nào rơi ra ngoài',
    dem === TONG, [dem, TONG]);

  // Hội thoại ngắn thì y như cũ. Thiếu vế này thì mọi phép kiểm trên xanh cả
  // khi bản vá cắt nhầm cả những phòng chat chỉ có ba tin.
  const nhom = (await req('GET', '/api/messages', { cookie: gv })).data?.conversations || [];
  const hoiThoaiNgan = nhom.find(c => c.id !== hoiThoai);
  if (hoiThoaiNgan) {
    const r = await req('GET', `/api/messages/${hoiThoaiNgan.id}`, { cookie: gv });
    check('hội thoại ngắn: KHÔNG bị cắt, và máy chủ nói rõ là hết',
      r.status === 200 && r.data?.conCu === false, [r.status, r.data?.conCu]);
  } else {
    // KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG THÌ PHẢI ĐỎ, KHÔNG ĐƯỢC IM.
    //
    // Đây là phép kiểm DUY NHẤT canh vế chống-siết-quá-tay: bản vá cắt cửa sổ
    // mà cắt nhầm cả phòng chat ba tin thì chỉ dòng này bắt được. Nằm trong
    // một `if` không có `else`, nó biến mất lặng lẽ đúng vào ngày dữ liệu mẫu
    // đổi và cô chỉ còn một hội thoại — cả mục vẫn xanh, và không ai biết vế
    // quan trọng nhất đã ngừng chạy.
    //
    // Cùng khuôn với test/co-so-quan-tri.test.mjs: dựng không được thì nói ra.
    check('hội thoại ngắn: KHÔNG bị cắt, và máy chủ nói rõ là hết', false,
      'KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG: cô chỉ có đúng một hội thoại nên không có '
      + 'phòng chat ngắn nào để đối chứng. Thêm một hội thoại thứ hai vào dữ '
      + 'liệu mẫu, hoặc dựng ngay trong bài, rồi chạy lại.');
  }

  // Cuộn ngược lên đọc tin cũ KHÔNG phải là đã đọc hết. Đánh dấu nhầm ở đây là
  // xoá mất dấu tin chưa xem của người ta.
  const sauKhiXemCu = await req('GET', `/api/messages/${hoiThoai}?truoc=${encodeURIComponent(mo.data.tuLuc)}`,
    { cookie: ph });
  check('đọc mẻ tin cũ vẫn trả lời bình thường', sauKhiXemCu.status === 200, sauKhiXemCu.status);
  const dsPh = (await req('GET', '/api/messages', { cookie: ph })).data?.conversations || [];
  const cua = dsPh.find(c => c.id === hoiThoai);
  check('và KHÔNG đánh dấu đã đọc — dấu tin chưa xem còn nguyên',
    (cua?.unreadCount || 0) > 0, cua?.unreadCount);

  // ĐƯỜNG POLL CŨNG PHẢI CÓ TRẦN.
  //
  // `?after=` lấy tin mới hơn một mốc do MÀN HÌNH gửi lên, nên nó không có trần
  // tự nhiên nào: tab để mở qua đêm rồi máy thức dậy là một lượt hỏi kéo về cả
  // quãng ở giữa. Cùng đúng hình dạng vừa vá ở đường mở phòng, chỉ ít lộ hơn.
  const polled = await req('GET', `/api/messages/${hoiThoai}/poll?after=1970-01-01T00:00:00.000Z`,
    { cookie: gv });
  const dsPoll = polled.data?.messages || [];
  check('đường poll cũng không kéo về cả hội thoại', dsPoll.length < TONG, [dsPoll.length, TONG]);
  check('nhưng vẫn trả về được một mẻ dùng ngay', dsPoll.length > 0, dsPoll.length);
  // Cắt ở đầu CŨ, không phải đầu mới: đây là dòng chảy nối tiếp, bỏ khúc giữa
  // là màn hình thủng một khoảng và không bao giờ lấy lại được.
  const poll2 = await req('GET',
    `/api/messages/${hoiThoai}/poll?after=${encodeURIComponent(dsPoll[dsPoll.length - 1].createdAt)}`,
    { cookie: gv });
  check('lượt poll sau nối tiếp đúng chỗ lượt trước dừng',
    (poll2.data?.messages || []).every(m => m.createdAt > dsPoll[dsPoll.length - 1].createdAt),
    (poll2.data?.messages || [])[0]);

  // Màn hình phải có nút đi ngược. Máy chủ mở đường mà màn hình không đi thì
  // với cô, tin cũ vẫn là mất.
  const view = fs.readFileSync(path.join(GOC, 'public/js/views/messages.js'), 'utf8');
  check('màn chat có nút xem tin cũ hơn', /Xem tin cũ hơn/.test(view));
  check('và nút đó gọi đúng đường ?truoc=', /\?truoc=\$\{encodeURIComponent/.test(view));
}

// ===========================================================================
// PHÒNG CHUNG CỦA NHÓM PHẢI ĐÓNG LẠI KHI CÔ RỜI NHÓM.
//
// `conversation_members` được ghi MỘT LẦN lúc lập phòng và không bao giờ được
// đồng bộ lại theo `class_teachers`. Gỡ một cô khỏi nhóm đóng được mọi đường
// khác — hồ sơ bé, điểm danh, album, nhật ký, vì tất cả hỏi `canAccessClass`.
// Riêng phòng chat chung của nhóm thì trước bản vá này vẫn mở, vì nó chỉ hỏi
// bảng thành viên.
//
// Cô đã chuyển cơ sở vẫn đọc được mọi trao đổi hằng ngày giữa cô mới và các
// gia đình, kể cả tin gửi SAU khi cô đã rời nhóm, và vẫn nhắn vào đó được.
console.log('\n[+] CÔ ĐÃ RỜI NHÓM KHÔNG CÒN VÀO ĐƯỢC PHÒNG CHUNG CỦA NHÓM');
{
  const co = await dangNhap('giaovien', '123456');   // t1

  // Dựng một phòng chung gắn nhóm c1, có cô t1 làm thành viên. Chưa có màn
  // hình nào lập phòng chung, nên viết thẳng vào bảng — đúng nếp các mục trên.
  {
    const conn = new Database(path.join(DIR2, 'school.db'));
    conn.prepare("INSERT OR REPLACE INTO conversations (id, type, name, classId) VALUES ('cv_c1', 'group', 'Nhóm Chồi 2', 'c1')").run();
    for (const u of ['t1', 'p1']) {
      conn.prepare('INSERT OR REPLACE INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, NULL)').run('cv_c1', u);
    }
    conn.prepare("INSERT OR REPLACE INTO messages (id, conversationId, senderId, text, createdAt) VALUES ('m_c1', 'cv_c1', 'p1', 'Chào cô ạ', ?)")
      .run(new Date(Date.parse(`${HOM_NAY()}T01:00:00.000Z`)).toISOString());
    // Và một phòng RIÊNG giữa đúng hai người, để canh vế chống-siết-quá-tay.
    conn.prepare("INSERT OR REPLACE INTO conversations (id, type, name, classId) VALUES ('cv_rieng', 'direct', NULL, NULL)").run();
    for (const u of ['t1', 'p1']) {
      conn.prepare('INSERT OR REPLACE INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, NULL)').run('cv_rieng', u);
    }
    conn.close();
  }

  // ĐỐI CHỨNG: đang còn trong nhóm thì phải vào được. Thiếu dòng này thì hai
  // phép kiểm dưới xanh cả khi phòng chung hỏng vì một lý do khác hẳn.
  const truoc = await req('GET', '/api/messages/cv_c1', { cookie: co });
  check('đối chứng — cô ĐANG phụ trách nhóm thì mở được phòng chung',
    truoc.status === 200, { status: truoc.status, data: truoc.data });
  const dsTruoc = (await req('GET', '/api/messages', { cookie: co })).data?.conversations || [];
  check('và phòng chung có trong danh sách của cô',
    dsTruoc.some(c => c.id === 'cv_c1'), dsTruoc.map(c => c.id));

  // Nhà trường gỡ cô t1 khỏi nhóm c1 — đúng thao tác của văn phòng.
  const goBo = await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: qt, body: { teacherIds: ['t3'], chinhId: 't3' },
  });
  check('gỡ được cô khỏi nhóm', goBo.status === 200, { status: goBo.status, data: goBo.data });

  const sau = await req('GET', '/api/messages/cv_c1', { cookie: co });
  check('RỜI NHÓM RỒI THÌ KHÔNG MỞ ĐƯỢC PHÒNG CHUNG NỮA', sau.status === 403,
    { status: sau.status, data: sau.data });
  check('và câu từ chối nói đúng lý do, bằng tiếng của trường',
    /không còn trong nhóm/i.test(sau.data?.error || ''), sau.data);

  const gui = await req('POST', '/api/messages/cv_c1', {
    cookie: co, body: { text: 'Cô cũ vẫn nhắn được?' },
  });
  check('và cũng KHÔNG nhắn vào đó được', gui.status === 403, gui.status);

  // Danh sách phải theo cùng một luật: chặn ở đường mở phòng mà để nguyên
  // danh sách thì cô vẫn thấy ô phòng chung kèm TRÍCH TIN CUỐI — vẫn rò đúng
  // thứ cần giấu, rồi bấm vào mới nhận câu từ chối.
  const dsSau = (await req('GET', '/api/messages', { cookie: co })).data?.conversations || [];
  check('phòng chung BIẾN KHỎI danh sách, không để lộ trích tin cuối',
    !dsSau.some(c => c.id === 'cv_c1'), dsSau.map(c => c.id));

  // KHÔNG SIẾT QUÁ TAY: phòng RIÊNG giữa hai người KHÔNG đi theo phân công.
  //
  // Chốt mới chỉ đóng phòng CHUNG của nhóm. Một cuộc trao đổi riêng đã mở giữa
  // cô và một gia đình là chuyện của hai người ấy — cô chuyển nhóm không làm
  // câu chuyện dở dang đó biến mất, và gia đình vẫn đọc lại được phần đã nhắn.
  const rieng = await req('GET', '/api/messages/cv_rieng', { cookie: co });
  check('cô vẫn mở được phòng chat RIÊNG đã có — trao đổi riêng không theo phân công',
    rieng.status === 200, { status: rieng.status, data: rieng.data });
  check('và phòng riêng vẫn nằm trong danh sách của cô',
    ((await req('GET', '/api/messages', { cookie: co })).data?.conversations || [])
      .some(x => x.id === 'cv_rieng'));

  // Nhưng MỞ MỚI một cuộc với nhà đó thì không — đó là đường `contactsFor`,
  // vốn đã đi theo phân công từ đầu. Từ Đ151 cửa vào là KÊNH + BÉ, còn điều
  // được canh thì không đổi: cô đã rời nhóm thì không mở được cuộc mới với
  // gia đình của nhóm ấy. Bé s1 là con của nhà p1, học nhóm c1.
  const moMoi = await req('POST', '/api/messages/start', {
    cookie: co, body: { kenh: 'nhom', studentId: 's1' },
  });
  check('nhưng KHÔNG bắt đầu được cuộc trò chuyện MỚI với nhà của nhóm cũ',
    moMoi.status === 403, moMoi.status);

  // Trả lại phân công để phần sau của bài (nếu có) không đứng trên một nền lạ.
  await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: qt, body: { teacherIds: ['t1', 't3'], chinhId: 't1' },
  });
  const veLai = await req('GET', '/api/messages/cv_c1', { cookie: co });
  check('phân công lại thì cô vào lại được ngay — không phải khởi động lại gì',
    veLai.status === 200, veLai.status);
}

await may.dung();
donThuMucTam(DIR2);
tongKet();
