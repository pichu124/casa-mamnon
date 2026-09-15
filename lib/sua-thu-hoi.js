// Sửa và thu hồi bản ghi cho bốn phân hệ chỉ-ghi-thêm:
// Thông báo, Nề nếp, Y tế, Nhận xét.
//
// Trước đây bốn phân hệ này chỉ có đường ghi thêm. Cô gõ nhầm giờ họp phụ huynh
// rồi gửi đi thì không sửa, không gỡ, chỉ còn cách gửi thêm một thông báo đính
// chính rồi hai cái cùng nằm đó. Nặng hơn: một lời "nhắc nhở" ghi nhầm, hoặc
// một ghi nhận y tế bấm nhầm sang bé khác, thì gắn vĩnh viễn vào hồ sơ đứa
// trẻ, phụ huynh nhìn thấy và khiếu nại mà hiệu trưởng cũng không gỡ được. Đây
// còn là rủi ro tuân thủ: Nghị định 13/2023 cho cha mẹ quyền yêu cầu chỉnh sửa
// và xóa dữ liệu cá nhân của con.
//
// HAI ĐIỀU CỐ Ý:
//
// 1. Thu hồi là ĐÁNH DẤU ẨN, không xóa. Giữ đúng nguyên tắc không mất dữ liệu,
//    và còn vết để tra khi có tranh chấp.
//
// 2. Trạng thái nằm ở BẢNG PHỤ `record_edits`, không phải cột mới trên bốn bảng
//    gốc. `lib/schema.sql` được chạy lại ở mỗi lần khởi động và không có khối
//    bắt lỗi, nên ALTER TABLE ADD COLUMN sẽ chạy được lần đầu rồi báo lỗi trùng
//    cột ở mọi lần khởi động sau — app chết lặng lẽ vài ngày sau khi triển khai,
//    sau khi mọi bài kiểm thử đã xanh.
const db = require('./db');

// 'messages' thêm ở Đ196 (việc 25) — nhưng nó dùng bảng phụ này theo một cách
// KHÁC BỐN BẢNG KIA, và chỗ khác ấy phải đọc kỹ trước khi sửa gì.
//
// Với bốn bảng gốc, thu hồi là BIẾN MẤT: một ghi nhận y tế bấm nhầm sang bé
// khác thì không ai nên còn thấy nó ở đâu nữa.
//
// Một lời nhắn thì khác, vì NGƯỜI KIA ĐÃ ĐỌC RỒI. Cho nó biến mất là màn hình
// của họ tự nhiên thiếu một dòng giữa cuộc trò chuyện, và câu trả lời ngay
// dưới đó thành ra không hiểu nổi. Nên `routes/messages.js` GIỮ CHỖ của tin
// ấy và chỉ bỏ phần chữ — xem chú thích ở `messageDto`.
//
// Hai cách dùng, một cơ chế: vết thu hồi vẫn ghi cùng một chỗ, tra khiếu nại
// vẫn một đường.
const BANG_HOP_LE = ['notifications', 'conduct', 'health', 'remarks', 'messages'];

function kiemTraBang(bang) {
  if (!BANG_HOP_LE.includes(bang)) {
    throw new Error(`Bảng "${bang}" không nằm trong nhóm được phép sửa/thu hồi`);
  }
  return bang;
}

// Mã của mọi bản ghi đã thu hồi trong một bảng. Dùng để lọc danh sách.
function maDaThuHoi(bang) {
  kiemTraBang(bang);
  return new Set(db.all('record_edits',
    'SELECT recordId FROM record_edits WHERE bang = ? AND thuHoi = 1', [bang])
    .map(r => r.recordId));
}

// Mảnh SQL để lọc ngay trong câu truy vấn, khi danh sách có thể dài.
// Dùng: `... WHERE ${dieuKienConHien('conduct', 'c.id')}`
function dieuKienConHien(bang, cotId) {
  kiemTraBang(bang);
  return `${cotId} NOT IN (SELECT recordId FROM record_edits
    WHERE bang = '${bang}' AND thuHoi = 1)`;
}

// Thông tin sửa/thu hồi của một bản ghi (null nếu chưa từng bị đụng tới).
function trangThai(bang, recordId) {
  kiemTraBang(bang);
  return db.first('record_edits',
    'SELECT * FROM record_edits WHERE bang = ? AND recordId = ?', [bang, recordId]) || null;
}

// Gắn cờ `daSua` / `suaLuc` vào từng phần tử của một danh sách, để giao diện
// hiện được dòng "đã chỉnh sửa lúc…". Một truy vấn cho cả danh sách.
function ganDauDaSua(bang, rows) {
  kiemTraBang(bang);
  if (!rows || !rows.length) return rows || [];
  const theo = new Map(db.all('record_edits',
    `SELECT * FROM record_edits WHERE bang = ? AND recordId IN (${rows.map(() => '?').join(',')})`,
    [bang, ...rows.map(r => r.id)]).map(r => [r.recordId, r]));
  return rows.map(r => {
    const t = theo.get(r.id);
    return t && t.suaLuc ? { ...r, daSua: true, suaLuc: t.suaLuc } : r;
  });
}

function ghiDaSua(bang, recordId, userId) {
  kiemTraBang(bang);
  db.run(
    `INSERT INTO record_edits (bang, recordId, thuHoi, suaLuc, suaBoi)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT (bang, recordId) DO UPDATE SET suaLuc = excluded.suaLuc, suaBoi = excluded.suaBoi`,
    [bang, recordId, new Date().toISOString(), userId || null]);
}

function ghiThuHoi(bang, recordId, userId) {
  kiemTraBang(bang);
  db.run(
    `INSERT INTO record_edits (bang, recordId, thuHoi, thuHoiLuc, thuHoiBoi)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT (bang, recordId) DO UPDATE SET
       thuHoi = 1, thuHoiLuc = excluded.thuHoiLuc, thuHoiBoi = excluded.thuHoiBoi`,
    [bang, recordId, new Date().toISOString(), userId || null]);
}

function boThuHoi(bang, recordId) {
  kiemTraBang(bang);
  db.run(
    `UPDATE record_edits SET thuHoi = 0, thuHoiLuc = NULL, thuHoiBoi = NULL
     WHERE bang = ? AND recordId = ?`, [bang, recordId]);
}

function daThuHoi(bang, recordId) {
  const t = trangThai(bang, recordId);
  return !!(t && t.thuHoi);
}

// Ai được sửa / thu hồi: người đã tạo ra bản ghi, hoặc quản trị.
// Quản trị phải có quyền vì chính hiệu trưởng là người phải gỡ được một ghi nhận
// sai khi phụ huynh khiếu nại.
function laChuBanGhi(user, nguoiTao) {
  if (!user) return false;
  return user.role === 'admin' || (nguoiTao && user.id === nguoiTao);
}

module.exports = {
  BANG_HOP_LE,
  maDaThuHoi, dieuKienConHien, trangThai, ganDauDaSua,
  ghiDaSua, ghiThuHoi, boThuHoi, daThuHoi, laChuBanGhi,
};
