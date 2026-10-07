// HUY HIỆU CỦA PHÂN HỆ CẮM THÊM (Đ154).
//
// `routes/dashboard.js` đếm huy hiệu cho năm thứ của phần lõi (thông báo,
// nhắn tin, điểm danh, xin phép, dặn thuốc). Phân hệ cắm thêm thì KHÔNG có
// đường nào hiện con số lên lưới icon — và đó là lý do quản lý cơ sở không
// biết cô vừa gửi bản báo cáo nào chờ mình duyệt: con số chỉ nằm bên trong
// màn của phân hệ, phải mở đúng màn ấy mới thấy.
//
// Sổ đăng ký này là đường ngắn nhất KHÔNG phá cô lập:
//
//   • Phần lõi vẫn không biết tên bảng nào của phân hệ. Nó chỉ gọi một hàm.
//   • Phân hệ gỡ đi thì hàm biến mất theo, lưới icon không hụt gì.
//   • Mỗi hàm đếm chạy trong khối bắt lỗi RIÊNG. Một phân hệ đếm sai câu SQL
//     thì huy hiệu của nó vắng mặt, các huy hiệu còn lại vẫn hiện, và màn
//     hình chính KHÔNG hỏng (Nguyên tắc số 1).
//   • Phân hệ đang TẮT thì không đếm. Tắt là biến khỏi màn hình chính, một
//     con số đỏ trên ô đã biến mất là chuyện vô nghĩa.
//
// Hàm đếm nhận `user` và trả về một SỐ. Nó phải tự lọc theo quyền của người
// đó — quản lý cơ sở 1 không được đếm bản của cơ sở 2. Trả 0 thì huy hiệu
// không hiện.
const modules = require('./modules');

const NGUON = [];

// `key` là MÃ PHÂN HỆ, còn huy hiệu hiện theo `view`. Hai thứ này gần như
// luôn trùng nhau, nhưng không phải luôn — nên tra lại qua sổ đăng ký phân hệ
// thay vì đoán.
function dangKy(key, dem) {
  if (!key || typeof dem !== 'function') return false;
  const i = NGUON.findIndex(x => x.key === key);
  const rec = { key: String(key), dem };
  if (i >= 0) NGUON[i] = rec; else NGUON.push(rec);
  return true;
}

function demTatCa(user) {
  const out = {};
  if (!user) return out;
  for (const n of NGUON) {
    try {
      if (!modules.dangBat(n.key)) continue;
      const m = modules.timTheoKey(n.key);
      if (m && Array.isArray(m.roles) && !m.roles.includes(user.role)) continue;
      const so = Number(n.dem(user)) || 0;
      if (so > 0) out[(m && m.view) || n.key] = so;
    } catch (err) {
      console.error(`[huy-hieu] phân hệ "${n.key}" đếm lỗi: ${err.message}`);
    }
  }
  return out;
}

function danhSach() { return NGUON.map(n => n.key); }

module.exports = { dangKy, demTatCa, danhSach };
