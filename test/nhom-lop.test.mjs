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
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu } from './_chung.mjs';

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
console.log('\n[1] Phân công đời cũ tự chuyển sang bảng mới khi khởi động');
{
  check('cô Mai Anh (t1) nhận đúng nhóm c1',
    db.classIdsOfTeacher('t1').join(',') === 'c1', db.classIdsOfTeacher('t1'));
  check('nhóm c1 có đúng một cô', ten(db.teachersOfClass('c1')) === 't1', ten(db.teachersOfClass('c1')));
  check('cô được ghi là người phụ trách chính',
    db.teachersOfClass('c1')[0]?.vaiTro === 'chinh', db.teachersOfClass('c1')[0]?.vaiTro);
  check('danh sách cô KHÔNG kèm mật khẩu đã băm',
    db.teachersOfClass('c1').every(t => !('passwordHash' in t)));
  check('thầy Hùng (t2) nhận đúng nhóm c2',
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
    db.isTeacherOfClass('t2', 'c2') && db.teachersOfClass('c2')[0]?.vaiTro === 'phu',
    ten(db.teachersOfClass('c2')));

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
console.log('\n[6] BƯỚC 1 chưa đổi hành vi của đường quyền cũ');
{
  // Đây là mục quan trọng nhất của bước 1. Bảng mới đã có dữ liệu, nhưng
  // studentsOf / classIdsOf / canAccessStudent vẫn phải đi theo `users.classId`
  // y như trước. Hết bước 3 mục này sẽ được viết lại cho đúng bước 3.
  db.addClassTeacher('c1', 't2', 'phu');   // t2 là cô PHỤ của c1, users.classId(t2) vẫn = c2
  const t2 = coCu('t2');
  check('cô phụ đã có trong bảng mới', db.isTeacherOfClass('t2', 'c1'));
  check('users.classId của cô phụ vẫn là nhóm cũ', t2.classId === 'c2', t2.classId);
  check('classIdsOf vẫn đi theo users.classId, chưa theo bảng mới',
    db.classIdsOf(t2).join(',') === 'c2', db.classIdsOf(t2));
  check('studentsOf vẫn chỉ trả về trẻ của nhóm trong users.classId',
    db.studentsOf(t2).every(s => s.classId === 'c2'), db.studentsOf(t2).map(s => s.classId));
  const beC1 = db.studentsOf(coCu('t1'))[0];
  check('canAccessStudent chưa mở cho cô phụ', !db.canAccessStudent(t2, beC1.id), beC1.id);
  db.removeClassTeacher('c1', 't2');
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

db.close();
donThuMucTam(DIR);
tongKet();
