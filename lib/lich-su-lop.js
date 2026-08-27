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

// Ngày đầu năm học, suy từ chuỗi năm học "2026-2027" → "2026-08-01".
// Trả về null nếu không đọc được — chỗ gọi sẽ tự lùi về phương án khác.
function dauNamHoc(nam) {
  const m = /^(\d{4})/.exec(String(nam || ''));
  return m ? `${m[1]}-08-01` : null;
}

// Ngày bắt đầu của một khoảng ĐƯỢC DỰNG LẠI — khoảng vá cho hồ sơ có từ trước
// khi bảng này ra đời, không phải khoảng do một lần chuyển nhóm có thật ghi lại.
//
// VÌ SAO KHÔNG LẤY CỨNG `createdAt` NỮA
//
// `createdAt` là ngày NHẬP HỒ SƠ vào app, không phải ngày bé vào nhóm. Trường
// cài app giữa năm rồi nhập cả trường trong một buổi chiều thì mọi hồ sơ đều
// mang ngày hôm đó — muộn hơn hẳn mọi tấm ảnh đã chụp từ đầu năm.
//
// Hậu quả chỉ lộ ra SAU khi chuyển năm. Đang học thì `db.canAccessClass` cho
// phụ huynh xem MỌI album của nhóm, không ràng buộc ngày. Nhóm vừa đóng lại thì
// khoảng vá cắt từ `createdAt`, và toàn bộ ảnh chụp trước ngày nhập hồ sơ biến
// mất khỏi máy phụ huynh — đúng những tấm cũ nhất, đúng thứ người ta muốn giữ.
//
// Nên lấy sớm hơn trong hai mốc: ngày nhập hồ sơ, và ngày đầu năm học của nhóm.
//
// ĐÂY KHÔNG PHẢI NỚI QUYỀN. Hôm qua phụ huynh đã xem được đúng chừng ấy album
// rồi; bản vá chỉ thôi lấy đi vào ngày mai thứ hôm nay đang có. Và nó không mở
// thêm nhóm nào: bé chưa từng học nhóm đó thì không có khoảng nào để mà mở.
// Luật NGÀY vẫn nguyên vẹn — ảnh chụp sau khi con rời nhóm vẫn bị chặn.
function ngayBatDauDungLai(hs, lop) {
  const ngayNhapHoSo = (hs.createdAt || '').slice(0, 10);
  const dauNam = dauNamHoc(lop && lop.year);
  if (!ngayNhapHoSo) return dauNam || homNay();
  if (!dauNam) return ngayNhapHoSo;
  return ngayNhapHoSo < dauNam ? ngayNhapHoSo : dauNam;
}

// Bảo đảm em đang có một khoảng mở đúng với lớp hiện tại.
//
// Cần vì bảng này ra đời sau: những em đã nhập vào hệ thống trước bản này chưa có
// khoảng nào cả. Ngày bắt đầu do `ngayBatDauDungLai` quyết — xem lý do ở đó.
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
  return moKhoang(studentId, hs.classId, ngayBatDauDungLai(hs, db.findClass(hs.classId)));
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
  homNay, dauNamHoc, ngayBatDauDungLai,
  khoangDangMo, moKhoang, dongKhoang, baoDamCoKhoang,
  ghiChuyenLop, ghiRoiLop,
  khoangCuaHocSinh, lopCuCuaPhuHuynh, xemDuocNoiDungLopCu,
};
