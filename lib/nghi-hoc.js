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

// ---------------------------------------------------------------------------
// LỊCH NGHỈ CỦA TRƯỜNG (Đ147) — nghỉ lễ, nghỉ hè, nghỉ Tết
//
// Ba hàm dưới đây trả lời câu hỏi thứ hai của cùng một chuyện: "hôm nay bé có
// phải đến trường không". Câu thứ nhất (`nghiCoPhep` ở trên) là việc của NHÀ
// BÉ; câu này là việc của TRƯỜNG, và nó áp cho mọi bé cùng lúc.
//
// CÙNG MỘT CÔNG TẮC VỚI `nghiCoPhep`, cố ý. Nhà trường tắt phân hệ Xin phép thì
// không ai còn nhập hay sửa được lịch nghỉ (đường API nằm dưới `/api/leave`, bị
// chặn ngay ở máy chủ), nên đọc tiếp một cuốn sổ không ai cập nhật rồi ghi
// "nghỉ có phép" theo nó là đúng hạng lỗi mà chú thích đầu tệp này kể lại. Bật
// lại là mọi thứ trở về y như cũ — dữ liệu không đi đâu cả.
// ---------------------------------------------------------------------------

// Ba cách hỏi về CƠ SỞ, và đây là chỗ dễ đọc nhầm nhất của cả tệp:
//
//   campusId = null/undefined  → MỌI đợt nghỉ, không xét cơ sở nào (màn văn
//                                phòng, nơi phải thấy đủ để sửa)
//   campusId = ''              → CHỈ đợt nghỉ cả trường (ban giám hiệu đang mở
//                                một màn gộp cả ba cơ sở: đợt riêng của một cơ
//                                sở KHÔNG áp cho mọi bé trên màn đó)
//   campusId = 'cs2'          → đợt cả trường + đợt riêng của cơ sở đó
function truongNghiTrongKhoang(tu, den, campusId) {
  if (!tu || !den) return [];
  if (!modules.dangBat('xinphep')) return [];
  const moiCoSo = campusId === null || campusId === undefined;
  const dk = moiCoSo ? '' : (campusId ? "AND (campusId = '' OR campusId = ?)" : "AND campusId = ''");
  const thamSo = moiCoSo || !campusId ? [den, tu] : [den, tu, campusId];
  return db.all('lich_nghi_truong',
    `SELECT * FROM lich_nghi_truong
      WHERE tuNgay <= ? AND denNgay >= ? ${dk}
      ORDER BY tuNgay, ten`, thamSo);
}

// Đợt nghỉ áp cho đúng NGÀY đó, hoặc null. Trùng hai đợt thì lấy đợt đầu —
// màn hình chỉ cần một cái tên để nói "hôm nay trường nghỉ vì...".
function ngayTruongNghi(ngayStr, campusId) {
  return truongNghiTrongKhoang(ngayStr, ngayStr, campusId)[0] || null;
}

// Tập NGÀY ĐI HỌC trường đóng cửa trong khoảng [tu, den] — trả về Set<'YYYY-MM-DD'>.
//
// CHỈ ĐẾM THỨ HAI ĐẾN THỨ SÁU, cùng khuôn với `soNgayHocTrongDon` ở
// routes/leave.js và với bảng `menus` (trường nấu năm ngày mỗi tuần). Đợt nghỉ
// Tết chín ngày dương lịch chỉ có sáu ngày trường vốn định mở cửa; đếm cả thứ
// Bảy Chủ nhật là hoàn tiền ăn cho những bữa chưa từng có ai nấu.
//
// Trả về TẬP NGÀY chứ không trả con số, để chỗ gọi hợp được hai đợt nghỉ chồng
// lên nhau mà không đếm một ngày hai lần.
function ngayHocTruongNghi(tu, den, campusId, tuyChon) {
  const chiKhiHoanTien = !!(tuyChon && tuyChon.chiKhiHoanTien);
  const ra = new Set();
  const dauKhoang = Date.parse(`${tu}T00:00:00Z`);
  const cuoiKhoang = Date.parse(`${den}T00:00:00Z`);
  if (Number.isNaN(dauKhoang) || Number.isNaN(cuoiKhoang) || cuoiKhoang < dauKhoang) return ra;
  for (const d of truongNghiTrongKhoang(tu, den, campusId)) {
    if (chiKhiHoanTien && d.hoanTienAn !== 'co') continue;
    const a = Math.max(Date.parse(`${d.tuNgay}T00:00:00Z`), dauKhoang);
    const b = Math.min(Date.parse(`${d.denNgay}T00:00:00Z`), cuoiKhoang);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    for (let t = a; t <= b; t += 86400000) {
      const thu = new Date(t).getUTCDay();
      if (thu >= 1 && thu <= 5) ra.add(new Date(t).toISOString().slice(0, 10));
    }
  }
  return ra;
}

module.exports = {
  nghiCoPhep, beDangNghi,
  truongNghiTrongKhoang, ngayTruongNghi, ngayHocTruongNghi,
};
