// Lịch sử lớp của học sinh — mỗi dòng là một KHOẢNG THỜI GIAN em học một lớp.
//
// Vì sao cần: học sinh chỉ có một trường `classId` duy nhất, bị ghi đè ngay lúc
// chuyển năm học hoặc lúc quản trị chuyển lớp giữa năm. Không ghi lại thì sau đó
// không còn cách nào biết trước đó em học lớp nào — mà đó chính là thông tin cần
// để cho phụ huynh xem lại album, thông báo, kế hoạch của năm cũ.
//
// Vì sao là KHOẢNG chứ không phải "mỗi năm một dòng": em chuyển lớp giữa năm thì
// có hai khoảng trong cùng một năm. Album phải giới hạn đúng khoảng em còn ở lớp
// đó — mở cả lớp cũ thì một em chuyển đi tháng 10 vẫn xem được ảnh chụp tháng 12,
// trong khi album có mặt nhiều trẻ khác.
//
// Tệp này KHÔNG thuộc nhóm tệp dùng chung (`lib/db.js`, `lib/auth.js`,
// `public/js/ui.js`, `public/js/app.js`). Nó chỉ đọc/ghi đúng một bảng phụ.
const db = require('./db');

function homNay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Khoảng đang mở của một học sinh (den = NULL), nếu có.
function khoangDangMo(studentId) {
  return db.first('student_class_periods',
    'SELECT * FROM student_class_periods WHERE studentId = ? AND den IS NULL ORDER BY tu DESC LIMIT 1',
    [studentId]) || null;
}

function moKhoang(studentId, classId, tu) {
  if (!studentId || !classId) return null;
  const lop = db.findClass(classId) || {};
  const rec = {
    id: db.nextId('scp'),
    studentId,
    classId,
    className: lop.name || '',
    year: lop.year || (db.school() || {}).currentYear || '',
    tu: tu || homNay(),
    den: null,
    ghiLuc: new Date().toISOString(),
  };
  db.insert('student_class_periods', rec);
  return rec;
}

function dongKhoang(khoang, den) {
  if (!khoang) return;
  db.update('student_class_periods', khoang.id, { den: den || homNay() });
}

// Bảo đảm em đang có một khoảng mở đúng với lớp hiện tại.
//
// Cần vì bảng này ra đời sau: những em đã nhập vào hệ thống trước bản này chưa có
// khoảng nào cả. Lấy `createdAt` của em làm ngày bắt đầu — sát nhất với sự thật
// trong những gì còn lưu lại được.
function baoDamCoKhoang(studentId) {
  const hs = db.findStudent(studentId);
  if (!hs || !hs.classId) return null;
  // Em đã nghỉ / đã ra trường thì KHÔNG mở khoảng mới. Cho nghỉ học không xóa
  // `classId`, nên thiếu chỗ này thì mỗi lần ai đó mở trang lịch sử lại đẻ ra
  // một khoảng "đang học" cho em đã rời trường.
  if (hs.active === false) return null;
  const dangMo = khoangDangMo(studentId);
  if (dangMo && dangMo.classId === hs.classId) return dangMo;
  if (dangMo) dongKhoang(dangMo);
  const tu = (hs.createdAt || '').slice(0, 10) || homNay();
  return moKhoang(studentId, hs.classId, tu);
}

// Em vừa chuyển sang lớp khác: đóng khoảng cũ, mở khoảng mới.
// Gọi TRƯỚC khi ghi đè `students.classId`, để còn đọc được lớp cũ.
function ghiChuyenLop(studentId, classIdMoi, ngay) {
  baoDamCoKhoang(studentId);
  const dangMo = khoangDangMo(studentId);
  if (dangMo && dangMo.classId === classIdMoi) return;
  if (dangMo) dongKhoang(dangMo, ngay);
  if (classIdMoi) moKhoang(studentId, classIdMoi, ngay);
}

// Em rời trường / ngừng học: chỉ đóng khoảng, không mở khoảng mới.
function ghiRoiLop(studentId, ngay) {
  const dangMo = khoangDangMo(studentId);
  if (dangMo) dongKhoang(dangMo, ngay);
}

// Toàn bộ khoảng của một em, mới nhất trước.
function khoangCuaHocSinh(studentId) {
  return db.all('student_class_periods',
    'SELECT * FROM student_class_periods WHERE studentId = ? ORDER BY tu DESC, rowid DESC', [studentId]);
}

// Các khoảng ĐÃ ĐÓNG của tất cả các con một phụ huynh — tức những lớp cũ mà phụ
// huynh này từng có quyền, kèm đúng khoảng thời gian.
//
// CỐ Ý không gộp vào `db.classIdsOf`: hàm đó đang được 8 chỗ dùng (điểm danh,
// huy hiệu trang chủ, thông báo, khảo sát, kế hoạch, thời khóa biểu, album). Nới
// nó ra là đổi hành vi cả 8 chỗ cùng một lúc — đúng thứ Nguyên tắc số 1 cấm.
// Phân hệ nào cần thì gọi hàm này, từng phân hệ một.
function lopCuCuaPhuHuynh(user) {
  if (!user || user.role !== 'parent') return [];
  return db.all('student_class_periods',
    `SELECT p.* FROM student_class_periods p
     JOIN student_parents sp ON sp.studentId = p.studentId
     WHERE sp.parentId = ? AND p.den IS NOT NULL
     ORDER BY p.tu DESC`, [user.id]);
}

// Phụ huynh có được xem một nội dung của lớp cũ hay không.
// `ngay` là ngày của nội dung đó (ảnh chụp ngày nào, thông báo gửi ngày nào).
// Không có ngày thì chỉ cần từng học lớp đó là đủ.
function xemDuocNoiDungLopCu(user, classId, ngay) {
  if (!classId) return false;
  return lopCuCuaPhuHuynh(user).some(k => {
    if (k.classId !== classId) return false;
    if (!ngay) return true;
    return String(ngay) >= k.tu && String(ngay) <= k.den;
  });
}

module.exports = {
  homNay,
  khoangDangMo, moKhoang, dongKhoang, baoDamCoKhoang,
  ghiChuyenLop, ghiRoiLop,
  khoangCuaHocSinh, lopCuCuaPhuHuynh, xemDuocNoiDungLopCu,
};
