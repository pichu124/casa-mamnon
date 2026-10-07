// BA NHÓM CÔ CỦA TRƯỜNG MẦM NON — chủ nhiệm / nước ngoài / thể chất.
//
// Nhà trường 15/09/2026 (Câu 11): *"Ở cấp độ 3 thì muốn chia ra thêm giáo viên
// sẽ có: Giáo viên chủ nhiệm – phụ trách mảng chương trình Montessori, GV nước
// ngoài - phụ trách chương trình Cambridge, GV P.E – phụ trách chương trình
// thể chất chuyên sâu. -> 3 vị trí này sẽ giúp lên kế hoạch và đánh giá ->
// báo cáo học tập cho từng trẻ"*.
//
// Và phía gia đình: *"Khi ở giao diện của Phụ huynh tôi chỉ muốn hiện lên 3 ng
// để PH có thể nhắn tin tới: Giáo viên chủ nhiệm, GV nước ngoài, văn phòng
// Nhà trường"*.
//
// HAI DANH SÁCH ẤY KHÔNG GIỐNG NHAU, VÀ ĐÓ LÀ CHỦ Ý CỦA TRƯỜNG. Bên trường có
// BA nhóm cô; bên gia đình có BA đầu mối nhắn tin, trong đó một là văn phòng
// chứ không phải cô. Cô thể chất nằm trong danh sách thứ nhất và KHÔNG nằm
// trong danh sách thứ hai. Đây chính là chỗ bản triage cũ suýt dựng hai danh
// sách thành một và sai cả hai.
//
// VÌ SAO KHÔNG KHAI THÀNH "CHỨC VỤ"
//
// Tầng chức vụ (`lib/db.js`, `CHUC_VU`) chỉ áp cho tài khoản QUẢN TRỊ — nó
// quyết định quản lý cơ sở mở được phần nào. Cô mang vai `teacher`, không đi
// qua tầng ấy một bước nào. Khai "GV nước ngoài" thành một chức vụ vì thế
// không chặn được gì cả: nó là một cái nhãn không ai đọc.
//
// NHÓM CÔ LÀ THUỘC TÍNH CỦA MỘT LƯỢT PHÂN CÔNG, KHÔNG PHẢI CỦA CON NGƯỜI
//
// Một cô thể chất dạy thể chất ở năm nhóm; một cô có thể là chủ nhiệm nhóm này
// và dạy tăng cường ở nhóm kia. Nên nhóm gắn vào cặp (nhóm lớp, cô), đúng chỗ
// `class_teachers` đang mô tả — bằng một BẢNG PHỤ, vì lược đồ lõi cấm ALTER
// TABLE (xem chú thích ở `lib/schema.sql`).
//
// THIẾU DÒNG = CHỦ NHIỆM. Đây là điều giữ cho Nguyên tắc số 1 không bị vi
// phạm: hôm nay chưa nhóm nào được khai, nên MỌI cô đều là chủ nhiệm, và mọi
// thứ chạy y hệt trước khi có tệp này. Trường khai tới đâu thì đổi tới đó.

const MAC_DINH = 'chu-nhiem';

// [mã, tên hiện ra màn hình, chương trình phụ trách, có phải đầu mối nhắn tin
// của gia đình không]
// TÊN HIỆN RA MÀN HÌNH DÙNG TIẾNG CỦA TRƯỜNG MẦM NON, KHÔNG DÙNG NGUYÊN VĂN
// CHỮ TRƯỜNG GÕ TRONG TỆP PHẢN HỒI.
//
// Nhà trường viết "Giáo viên chủ nhiệm". Nhưng `CLAUDE.md` quy định màn hình
// nói *cô*, và nêu đích danh "giáo viên chủ nhiệm" là cách gọi KHÔNG dùng —
// `npm run test:goi-ten` canh điều đó bằng máy, và nó báo đỏ ngay lần đầu chỗ
// này viết theo nguyên văn.
//
// Hai bên không mâu thuẫn về NGƯỜI, chỉ khác nhau về CHỮ: trường đang mô tả
// vai nào, còn quy định nói vai ấy hiện lên màn bằng chữ gì. Nên giữ trọn ý
// của trường và đổi cách gọi — "Cô phụ trách nhóm" là chính chữ mà bộ canh
// gợi ý thay thế, và nó vẫn là người mà gia đình nhận ra ngay.
//
// Đã ghi lại để hỏi nhà trường: nếu trường muốn đúng chữ "Giáo viên chủ
// nhiệm" hiện trên màn của gia đình thì đó là một ngoại lệ với quy định gọi
// tên, và phải do chủ dự án duyệt — không phải thứ tự đổi ở đây.
const NHOM = [
  ['chu-nhiem', 'Cô phụ trách nhóm', 'Montessori', true],
  ['nuoc-ngoai', 'Cô nước ngoài', 'Cambridge', true],
  ['the-chat', 'Cô thể chất', 'Thể chất chuyên sâu', false],
];
const MA_NHOM = NHOM.map(x => x[0]);
const TEN_NHOM = Object.fromEntries(NHOM.map(x => [x[0], x[1]]));
const CHUONG_TRINH = Object.fromEntries(NHOM.map(x => [x[0], x[2]]));
// Nhóm cô mà gia đình nhắn tin tới được. Cô thể chất KHÔNG nằm trong đây —
// trường nói rõ gia đình chỉ nhắn ba đầu mối, và một trong ba là văn phòng.
const NHOM_NHAN_TIN = NHOM.filter(x => x[3]).map(x => x[0]);

function hopLe(ma) {
  return MA_NHOM.includes(String(ma || ''));
}

// Nhóm của MỘT cô ở MỘT nhóm lớp. Không có dòng nào thì là chủ nhiệm.
//
// Bọc bắt lỗi vì cùng lý do với sổ ảnh đã vắng của backup.js: bảng phụ hỏng
// hay chưa kịp tạo thì phải về mặc định, tức là về đúng hành vi cũ, chứ không
// làm sập màn nhắn tin của cả trường.
function nhomCua(db, classId, teacherId) {
  if (!classId || !teacherId) return MAC_DINH;
  try {
    const r = db.first('class_teacher_nhom',
      'SELECT nhom FROM class_teacher_nhom WHERE classId = ? AND teacherId = ?',
      [classId, teacherId]);
    return r && hopLe(r.nhom) ? r.nhom : MAC_DINH;
  } catch (_) {
    return MAC_DINH;
  }
}

// Bản đồ teacherId -> nhóm cho cả một nhóm lớp, đọc MỘT lượt.
//
// Có hàm này để màn phân công không hỏi từng cô một: một nhóm mười cô là mười
// lượt truy vấn cho một thứ đọc trọn gói được.
function nhomTheoLop(db, classId) {
  const ra = {};
  if (!classId) return ra;
  try {
    for (const r of db.all('class_teacher_nhom',
      'SELECT teacherId, nhom FROM class_teacher_nhom WHERE classId = ?', [classId])) {
      if (hopLe(r.nhom)) ra[r.teacherId] = r.nhom;
    }
  } catch (_) { /* bảng chưa có thì coi như chưa khai nhóm nào */ }
  return ra;
}

// Các nhóm lớp mà một cô đang giữ ĐÚNG vai này.
//
// Chỉ trả về trong số nhóm cô ĐANG phụ trách (`classIdsOfTeacher` đã lọc nhóm
// đã đóng). Không tự đi tìm trong bảng phụ, vì một dòng khai nhóm còn sót lại
// của năm trước không được biến thành quyền đọc của năm nay.
function lopCuaCoTheoNhom(db, teacherId, nhom) {
  const ds = db.classIdsOfTeacher(teacherId) || [];
  if (!ds.length) return [];
  return ds.filter(cid => nhomCua(db, cid, teacherId) === nhom);
}

// Ghi nhóm cho một cô ở một nhóm lớp. `MAC_DINH` thì XOÁ dòng thay vì ghi —
// giữ bảng phụ chỉ chứa những gì trường đã thật sự khai, để còn phân biệt
// "trường chưa khai" với "trường khai là chủ nhiệm".
function dat(db, classId, teacherId, nhom) {
  if (!classId || !teacherId) return MAC_DINH;
  const ma = hopLe(nhom) ? String(nhom) : MAC_DINH;
  if (ma === MAC_DINH) {
    db.run('DELETE FROM class_teacher_nhom WHERE classId = ? AND teacherId = ?', [classId, teacherId]);
    return ma;
  }
  db.upsert('class_teacher_nhom', { classId, teacherId, nhom: ma }, ['classId', 'teacherId']);
  return ma;
}

// Dọn dòng khai nhóm của những cô KHÔNG còn trong nhóm lớp nữa.
//
// Gọi sau mỗi lượt đặt lại danh sách cô. Không dọn thì cô rời nhóm rồi quay
// lại sẽ mang theo vai cũ mà không ai bấm gì — đúng loại lỗi không dựng lại
// được để báo.
function donTheoDanhSachCo(db, classId, teacherIds) {
  if (!classId) return;
  const giu = new Set(teacherIds || []);
  try {
    for (const r of db.all('class_teacher_nhom',
      'SELECT teacherId FROM class_teacher_nhom WHERE classId = ?', [classId])) {
      if (!giu.has(r.teacherId)) {
        db.run('DELETE FROM class_teacher_nhom WHERE classId = ? AND teacherId = ?',
          [classId, r.teacherId]);
      }
    }
  } catch (_) { /* chưa có bảng thì chưa có gì để dọn */ }
}

module.exports = {
  MAC_DINH, NHOM, MA_NHOM, TEN_NHOM, CHUONG_TRINH, NHOM_NHAN_TIN,
  hopLe, nhomCua, nhomTheoLop, lopCuaCoTheoNhom, dat, donTheoDanhSachCo,
};
