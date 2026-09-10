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
const ngay = require('./ngay');
const st = require('./sua-thu-hoi');

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

// GỬI MỘT THÔNG BÁO NHÀ TRƯỜNG CHO MỘT HAY NHIỀU NHÓM (Đ137) — dùng khi một
// việc của văn phòng đáng để gia đình biết ngay: thực đơn tuần vừa đăng, lịch
// sinh hoạt vừa đổi. Cùng hình dạng bản ghi với POST /api/notifications, nên
// màn Thông báo và bộ đếm chuông không phải học thêm gì.
//
// `chongLap`: cùng tiêu đề, cùng nhóm, trong cùng ngày thì KHÔNG gửi lần hai —
// văn phòng bấm Lưu năm lần khi sửa thực đơn không được thành năm cái chuông.
// Không bao giờ ném lỗi: thông báo là việc phụ của đường ghi.
function guiChoNhom(classIds, { title, body = '', category = 'Khác', createdBy = null, chongLap = true } = {}) {
  const ra = [];
  try {
    const ds = [...new Set((classIds || []).filter(Boolean))];
    if (!ds.length || !title) return ra;
    // "Cùng ngày" là ngày VIỆT NAM, so bằng khoảng UTC của ngày đó (lib/ngay.js).
    const [tuUtc, denUtc] = ngay.khoangUtcCuaNgay(ngay.homNay());
    for (const classId of ds) {
      if (chongLap) {
        // Tin đã THU HỒI không tính là "đã gửi hôm nay": văn phòng rút một tin
        // sai rồi sửa nguồn (thực đơn, lịch) thì tin mới phải đi được.
        const co = db.first('notifications',
          `SELECT id FROM notifications WHERE audience = ? AND title = ? AND createdAt >= ? AND createdAt < ?
             AND ${st.dieuKienConHien('notifications', 'id')}`,
          [classId, String(title).trim(), tuUtc, denUtc]);
        if (co) continue;
      }
      const rec = {
        id: db.nextId('nt'),
        title: String(title).trim().slice(0, 120),
        body: String(body || '').trim().slice(0, 1000),
        category,
        audience: classId,
        createdBy,
        createdAt: new Date().toISOString(),
        pinned: false,
      };
      db.insert('notifications', rec);
      ra.push(rec.id);
    }
  } catch (_) { /* việc phụ */ }
  return ra;
}

module.exports = { audienceFilter, canSee, nhomPhongChat, taoMoTaPhamVi, guiChoNhom };
