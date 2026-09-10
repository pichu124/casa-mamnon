// BÁO CHO NGƯỜI CỦA NHÀ TRƯỜNG, KHÔNG PHẢI CHO GIA ĐÌNH (Đ154).
//
// `lib/thong-bao-be.js` là tin riêng của MỘT BÉ và chỉ gia đình bé đó đọc.
// `lib/thong-bao.js` là thông báo nhà trường, mà `audience` của nó chỉ có hai
// giá trị: 'all' hoặc mã nhóm — cả hai đều tới tay phụ huynh. Không có đường
// nào nói riêng với người lớn trong trường.
//
// Chỗ đầu tiên cần: cô gửi bản báo cáo học tập chờ duyệt, hoặc gửi đề xuất sửa
// kế hoạch đã duyệt. Quản lý cơ sở không nhận gì cả — chỉ biết khi tự mở đúng
// màn ấy ra và thấy con số ở thẻ "Chờ duyệt".
//
// HAI ĐƯỜNG, VÀ CỐ Ý KHÔNG DỰNG BẢNG THỨ BA
//
//   1. **Huy hiệu trên màn hình chính** (`lib/huy-hieu.js`) — dấu vết BỀN.
//      Nó vẫn đó khi quản lý mở app ra lúc 8h sáng, không phụ thuộc điện
//      thoại, không phụ thuộc mạng, và tự về 0 khi duyệt xong.
//   2. **Tin đẩy về điện thoại** (`lib/day.js`) — dấu hiệu NGAY. Có thì tốt,
//      mất thì huy hiệu vẫn nói đủ.
//
// Không dựng bảng "hộp thư nhân viên" thứ ba, vì hộp thư nào cũng kéo theo
// đánh dấu đã đọc, dọn tin cũ, và một màn hình nữa phải nuôi. Hai đường trên
// đã trả lời đúng câu hỏi "có việc gì đang chờ tôi không".
//
// AI NHẬN: đúng những người bấm duyệt được, không rộng hơn.
//
// Ba chức vụ Cấp 2 (nhân sự, kế toán, marketing) không mở được màn duyệt, nên
// báo cho họ là làm phiền. Danh sách này TRÙNG với danh sách mà màn Cài đặt
// dùng để quyết có hiện thẻ "Thông báo trên điện thoại" hay không — hai chỗ
// nói khác nhau là hứa suông một lần nữa.
const db = require('./db');

const CHUC_VU_NHAN = ['hieu-truong', 'quanly-coso'];

// Quản trị nhận được tin về bé này. Lọc bằng chính `canAccessStudent` — quản
// lý cơ sở 1 không nhận tin về bé cơ sở 2, và luật ấy chỉ có MỘT bản.
function quanLyCuaBe(studentId) {
  if (!studentId) return [];
  const ds = db.all('users', "SELECT * FROM users WHERE role = 'admin' AND active = 1");
  return ds.filter((u) => {
    const cv = db.chucVu(u);
    if (cv !== null && !CHUC_VU_NHAN.includes(cv)) return false;
    return db.canAccessStudent(u, studentId);
  });
}

// Cùng câu hỏi, hỏi theo NHÓM LỚP. Gửi cả nhóm là một lượt bấm của cô, nên
// nó đáng một tin cho cả lượt — không phải 20 tiếng chuông liền nhau.
function quanLyCuaNhom(classId) {
  if (!classId) return [];
  const ds = db.all('users', "SELECT * FROM users WHERE role = 'admin' AND active = 1");
  return ds.filter((u) => {
    const cv = db.chucVu(u);
    if (cv !== null && !CHUC_VU_NHAN.includes(cv)) return false;
    return db.canAccessClass(u, classId);
  });
}

// Đẩy tin cho quản lý của bé. KHÔNG BAO GIỜ NÉM, và không bao giờ đứng chờ:
// chỗ gọi là đường ghi của cô, không được chậm lại vì máy chủ đẩy của Google.
// `tru` là người vừa bấm — cô admin tự gửi rồi tự nhận tin của chính mình là
// vô nghĩa.
function guiChoQuanLyCuaBe(studentId, goi = {}) {
  return day(quanLyCuaBe(studentId), goi);
}

function guiChoQuanLyCuaNhom(classId, goi = {}) {
  return day(quanLyCuaNhom(classId), goi);
}

function day(dsNguoi, { tieuDe, noiDung = '', hash = '', tru = null } = {}) {
  try {
    if (!tieuDe) return 0;
    const ds = (dsNguoi || []).filter(u => u.id !== tru);
    if (!ds.length) return 0;
    const duong = require('./day');
    for (const u of ds) {
      try { duong.guiChoNguoi(u.id, { tieuDe, noiDung, hash }).catch(() => {}); } catch (_) { /* đẩy là việc phụ */ }
    }
    return ds.length;
  } catch (_) {
    return 0;
  }
}

module.exports = { CHUC_VU_NHAN, quanLyCuaBe, quanLyCuaNhom, guiChoQuanLyCuaBe, guiChoQuanLyCuaNhom };
