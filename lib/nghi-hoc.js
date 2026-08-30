// HÔM NAY BÉ NÀO ĐANG NGHỈ CÓ PHÉP — một câu hỏi, một câu trả lời, một chỗ.
//
// VÌ SAO TÁCH RA ĐÂY
//
// Đây là câu hỏi mà NHIỀU màn hằng ngày của cô đều cần, và trước đợt này chỉ
// một màn hỏi: Báo ăn (`modules/tienan/`) có hàm riêng, còn Nhật ký ngày và
// Đón trả bé thì không hỏi gì cả.
//
// Hậu quả đo được, dựng lại trên máy chủ chạy thật: gia đình báo nghỉ lúc 7h,
// văn phòng duyệt, bếp trừ đúng một suất — nhưng màn Nhật ký ngày vẫn liệt kê
// bé đó lẫn giữa bốn bạn còn lại, KHÔNG một dấu hiệu nào. Cô bấm "áp cả nhóm"
// (đúng thao tác mà cả phân hệ được thiết kế quanh nó, để ghi 20 bé dưới 5
// phút) và bé nằm nhà sốt được ghi "ăn hết bát cơm, ngủ 11h30–14h".
//
// Chiều tối mẹ mở app đọc đúng dòng đó về ngày con nằm nhà. Không mất dữ liệu,
// không rò dữ liệu — nhưng đây là mục tiêu số một của cả app (thay sổ liên lạc
// giấy) đang nói một điều mà gia đình BIẾT CHẮC là sai. Quyển sổ giấy không bao
// giờ tự ghi thay cô; app thì có.
//
// HAI ĐIỀU CỐ Ý
//
// 1. CHỈ ĐƠN ĐÃ DUYỆT. Đơn đang chờ mà đã coi là nghỉ thì một bé vẫn tới lớp sẽ
//    bị bỏ sót — hỏng theo kiểu đứa trẻ phải chịu. Việc duyệt là của văn phòng
//    (đợt Y2), và cho tới lúc duyệt thì bé vẫn được coi là sẽ đến.
//
// 2. HỎI CÔNG TẮC TRƯỚC. Nhà trường tắt phân hệ Xin phép thì bảng
//    `leave_requests` không còn ai cập nhật, và đọc một quyển sổ không ai cập
//    nhật rồi hành động theo nó còn tệ hơn không đọc. Đây đúng là bước đã bị
//    quên bốn lần trước đó (Y1, N24, Đ46, Đ65).
const db = require('./db');
const modules = require('./modules');

// Trả về Map<studentId, {id, fromDate, toDate, reason}> cho những bé ĐANG NGHỈ
// CÓ PHÉP đúng ngày `ngay`. Không có ai thì Map rỗng — chỗ gọi không phải phân
// biệt "không ai nghỉ" với "không hỏi được".
function nghiCoPhep(studentIds, ngay) {
  const ids = (studentIds || []).filter(Boolean);
  if (!ids.length || !ngay) return new Map();
  if (!modules.dangBat('xinphep')) return new Map();

  const marks = ids.map(() => '?').join(',');
  const ra = new Map();
  for (const l of db.all('leave_requests',
    `SELECT id, studentId, fromDate, toDate, reason FROM leave_requests
     WHERE status = 'approved' AND studentId IN (${marks})
       AND fromDate <= ? AND toDate >= ?`, [...ids, ngay, ngay])) {
    ra.set(l.studentId, {
      id: l.id, fromDate: l.fromDate, toDate: l.toDate, reason: l.reason || '',
    });
  }
  return ra;
}

// Một bé thôi — chỗ gọi chỉ có một mã thì không phải tự dựng mảng.
function beDangNghi(studentId, ngay) {
  return nghiCoPhep([studentId], ngay).get(studentId) || null;
}

module.exports = { nghiCoPhep, beDangNghi };
