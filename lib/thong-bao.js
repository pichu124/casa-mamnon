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

// NHÓM NÀO CÓ PHÒNG CHAT VỚI NGƯỜI NÀY — dùng chung cho danh sách hội thoại
// (routes/messages.js) và huy hiệu Nhắn tin (routes/dashboard.js), để hai
// con số không trôi khỏi nhau lần nữa.
//
// Cô và gia đình: nhóm ĐANG MỞ (classIdsOf). Quản trị: MỌI nhóm trong cơ sở
// mình, kể cả nhóm đã đóng sau chuyển năm học — findConv đã cho quản trị mở
// lại phòng nhóm cũ để tra lịch sử khi có khiếu nại, thì danh sách và huy hiệu
// phải nói cùng một chuyện. Quan hệ nhóm–cơ sở nằm ở bảng class_campus, KHÔNG
// phải cột trên classes (lược đồ lõi cấm ALTER TABLE).
function nhomPhongChat(user) {
  if (!user) return [];
  if (user.role !== 'admin') return db.classIdsOf(user);
  const coSo = db.phamViCoSo(user);
  const rows = coSo
    ? db.all('classes',
      'SELECT c.id AS id FROM classes c JOIN class_campus cc ON cc.classId = c.id WHERE cc.campusId = ?',
      [coSo])
    : db.all('classes', 'SELECT id FROM classes');
  return rows.map(r => r.id);
}

// MÔ TẢ PHẠM VI GỬI CHO NGƯỜI ĐỌC (Đ124).
//
// Cột `audience` chỉ là mã: 'all' hoặc mã nhóm. Trên màn hình gia đình hai con
// và trên màn văn phòng ba cơ sở, một thông báo phải nói rõ nó gửi cho ai:
// "Toàn trường", hay "Nhóm Chồi 2 · Cơ sở 1". Trả về một hàm có bảng nhớ cho
// ĐÚNG lượt gọi này — một danh sách 100 thông báo thường chỉ có vài nhóm khác
// nhau, không tra cơ sở dữ liệu 100 lần cho cùng một tên.
//
// Đọc `findClass` (kể cả nhóm đã đóng) chứ không phải `classes()`: thông báo
// của năm cũ vẫn phải gọi đúng tên nhóm cũ. Không có tầng cơ sở thì `tenCoSo`
// là chuỗi rỗng, giao diện tự bỏ vế đó.
function taoMoTaPhamVi() {
  const nho = new Map();
  return function moTa(audience) {
    if (!audience || audience === 'all') return { toanTruong: true, tenNhom: '', tenCoSo: '' };
    if (!nho.has(audience)) {
      const c = db.findClass(audience);
      const csId = c ? db.campusOfClass(c.id) : null;
      const cs = csId ? db.findCampus(csId) : null;
      nho.set(audience, {
        toanTruong: false,
        tenNhom: c ? c.name : '',
        tenCoSo: cs ? cs.name : '',
      });
    }
    return nho.get(audience);
  };
}

module.exports = { audienceFilter, canSee, nhomPhongChat, taoMoTaPhamVi };
