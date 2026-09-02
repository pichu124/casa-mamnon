// Luật "ai thấy thông báo nào" — MỘT bản, dùng chung cho danh sách thông báo
// (routes/notifications.js) và bộ đếm huy hiệu (routes/dashboard.js).
//
// Trước tệp này, hai nơi ấy mỗi nơi chép một bản `audienceFilter` gần giống
// nhau (khác đúng tiền tố cột). Hai bản của cùng một luật là hai bản sẽ trôi
// khỏi nhau ở lần sửa thứ hai — mà luật này quyết định gia đình nào đọc được
// thông báo nào, không phải chỗ để trôi.
//
// Tệp này KHÔNG thuộc nhóm bốn tệp dùng chung bị siết commit riêng. Nó chỉ
// đọc, không giữ trạng thái, mọi thứ nó cần nằm sau `db.classIdsOf`.
const db = require('./db');

// Điều kiện SQL cho các thông báo người dùng được xem. `tienTo` là tiền tố
// cột trong câu gọi (ví dụ 'n.' khi bảng notifications mang bí danh n).
function audienceFilter(user, tienTo = '') {
  const classIds = db.classIdsOf(user);
  const marks = classIds.map(() => '?').join(',');
  const cot = `${tienTo}audience`;
  return {
    sql: classIds.length ? `(${cot} = 'all' OR ${cot} IN (${marks}))` : `${cot} = 'all'`,
    params: classIds,
  };
}

// Cùng câu hỏi, cho MỘT thông báo đã nằm trong tay.
function canSee(user, notification) {
  return notification.audience === 'all' || db.classIdsOf(user).includes(notification.audience);
}

module.exports = { audienceFilter, canSee };
