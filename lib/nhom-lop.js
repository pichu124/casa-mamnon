// Cách gọi tên các cô của một nhóm lớp trên màn hình.
//
// Tách ra khỏi từng route vì có sáu chỗ cần đúng một câu trả lời (hồ sơ bé, tin
// nhắn, kế hoạch, thời khóa biểu, đăng nhập, quản trị), và vì cách gọi tên còn
// đổi tiếp: trường mầm non nói "cô", không nói "giáo viên chủ nhiệm".
//
// Tệp này KHÔNG thuộc nhóm tệp dùng chung (`lib/db.js`, `lib/auth.js`,
// `public/js/ui.js`, `public/js/app.js`). Nó chỉ đọc, không giữ trạng thái, và
// mọi thứ nó cần đều nằm sau `db.teachersOfClass` / `db.classIdsOfTeacher`.
const db = require('./db');

function hoTen(co) {
  return `${co.title || ''} ${co.name || ''}`.trim();
}

// Tóm tắt các cô của một nhóm để đổ thẳng lên màn hình.
//
// `teacherName` và `teacherPhone` giữ NGUYÊN hình dạng cũ — một cô duy nhất, là
// cô phụ trách chính — để những màn hình chưa đổi vẫn chạy y như trước.
// `teachers` và `teacherNames` là phần mới, nơi 2–3 cô của nhóm hiện đủ.
function tomTat(classId) {
  const ds = classId ? db.teachersOfClass(classId) : [];
  const chinh = ds[0] || null;
  return {
    teachers: ds.map(t => ({
      id: t.id, title: t.title, name: t.name, phone: t.phone,
      vaiTro: t.vaiTro, avatar: t.avatar,
    })),
    teacherName: chinh ? hoTen(chinh) : '',
    teacherPhone: chinh ? chinh.phone : '',
    teacherNames: ds.map(hoTen).join(', '),
  };
}

// Các nhóm một cô đang phụ trách, kèm tên — để giao diện dựng được ô chọn nhóm.
function nhomCuaCo(teacherId) {
  return db.classIdsOfTeacher(teacherId)
    .map(id => db.findClass(id))
    .filter(Boolean)
    .map(c => ({ id: c.id, name: c.name }));
}

// Tên các nhóm một cô đang phụ trách, dạng "Chồi 2, Lá 1".
function tenCacNhomCuaCo(teacherId) {
  return nhomCuaCo(teacherId).map(c => c.name).join(', ');
}

// Nhóm mà cô đang thao tác: nhóm cô chọn, hoặc nhóm duy nhất của cô.
//
// Trả về '' cho CẢ HAI trường hợp "cô chưa có nhóm nào" và "cô có nhiều nhóm mà
// chưa chọn". Hai trường hợp đó cần hai câu báo lỗi khác nhau nên chỗ gọi phải
// tự phân biệt bằng `nhomCuaCo(...).length`, đừng gộp vào đây.
function nhomDangThaoTac(user, classIdChon) {
  if (!user || user.role !== 'teacher') return '';
  const ds = db.classIdsOfTeacher(user.id);
  const chon = String(classIdChon || '');
  if (chon) return ds.includes(chon) ? chon : '';
  return ds.length === 1 ? ds[0] : '';
}

module.exports = { hoTen, tomTat, nhomCuaCo, tenCacNhomCuaCo, nhomDangThaoTac };
