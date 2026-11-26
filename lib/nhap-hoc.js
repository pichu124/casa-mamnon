// NGÀY NHẬP HỌC CỦA BÉ (Đ260l — góp ý 18/11 của văn phòng).
//
// Trường: "Toàn bộ thông tin khảo sát, thông báo trước ngày bé nhập học sẽ
// không gửi tới phụ huynh (trừ khảo sát còn hiệu lực)". Trước đợt này mốc của
// gia đình là ngày tạo tài khoản phụ huynh (P2, 20/10) — mà văn phòng thường
// tạo tài khoản trước hôm bé vào trường cả tuần.
//
// Tệp này giữ bảng `student_nhap_hoc` và câu hỏi "gia đình này tính từ ngày
// nào". Luật ai thấy thông báo, khảo sát nào vẫn nằm ở lib/thong-bao.js và
// routes/surveys.js; chúng chỉ hỏi mốc ở đây.
//
// Bé chưa có dòng ở bảng = hành vi cũ: mốc là ngày tạo tài khoản phụ huynh.
const db = require('./db');
const ngay = require('./ngay');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NGAY_MS = 86400000;

function ngayHopLe(s) {
  if (!DATE_RE.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
}

// Câu lỗi cho người dùng, hoặc null khi ngày dùng được. Chuỗi rỗng là "xoá
// ngày nhập học" — hợp lệ.
function kiemTra(ngayNhapHoc, dob) {
  const s = String(ngayNhapHoc ?? '').trim();
  if (!s) return null;
  if (!ngayHopLe(s)) return 'Ngày nhập học chưa đúng, ví dụ đúng: 2026-09-07';
  const homNay = ngay.homNay();
  const xaNhat = new Date(Date.parse(`${homNay}T00:00:00Z`) + 365 * NGAY_MS).toISOString().slice(0, 10);
  if (s > xaNhat) return 'Ngày nhập học xa quá — chỉ ghi được tới một năm kể từ hôm nay.';
  const ns = String(dob || '').slice(0, 10);
  if (ngayHopLe(ns) && s < ns) return 'Ngày nhập học không được trước ngày sinh của bé.';
  return null;
}

// Ghi (hoặc xoá khi chuỗi rỗng). Chỗ gọi đã soát bằng `kiemTra` và lo nhật ký.
function ghi(studentId, ngayNhapHoc, userId) {
  const s = String(ngayNhapHoc ?? '').trim();
  if (!s) {
    db.run('DELETE FROM student_nhap_hoc WHERE studentId = ?', [studentId]);
    return null;
  }
  db.run(`INSERT INTO student_nhap_hoc (studentId, ngayNhapHoc, nguoiGhi, capNhatLuc) VALUES (?, ?, ?, ?)
          ON CONFLICT(studentId) DO UPDATE SET ngayNhapHoc = excluded.ngayNhapHoc,
            nguoiGhi = excluded.nguoiGhi, capNhatLuc = excluded.capNhatLuc`,
  [studentId, s, userId || null, new Date().toISOString()]);
  return s;
}

function theoBe(ids) {
  const ds = [...new Set((ids || []).filter(Boolean))];
  if (!ds.length) return new Map();
  return new Map(db.all('student_nhap_hoc',
    `SELECT studentId, ngayNhapHoc FROM student_nhap_hoc WHERE studentId IN (${ds.map(() => '?').join(',')})`, ds)
    .map(r => [r.studentId, r.ngayNhapHoc]));
}

function ngayCua(studentId) {
  const r = db.first('student_nhap_hoc', 'SELECT ngayNhapHoc FROM student_nhap_hoc WHERE studentId = ?', [studentId]);
  return r ? r.ngayNhapHoc : null;
}

// MỐC NGÀY (YYYY-MM-DD, giờ Việt Nam) CỦA MỘT GIA ĐÌNH.
//
// Mỗi bé TỪNG gắn với tài khoản (kể cả bé đã nghỉ / ra trường) góp một ngày:
// ngày nhập học, hoặc ngày tạo tài khoản khi bé chưa có ngày nhập học. Lấy ngày
// SỚM NHẤT — nhà có con lớn học từ năm trước, nay thêm em bé mới vào, vẫn đọc
// tiếp được lịch sử; và khi con lớn ra trường, mốc KHÔNG nhảy lên ngày nhập học
// của em (nhà sẽ mất những tin đã đọc). Không có bé nào thì dùng ngày tạo tài
// khoản. Tin đẩy (`phuHuynhChuaToiNgay`) vẫn chỉ xét bé đang học. Có bé không ra được
// ngày nào (tài khoản cũ không có `createdAt`) thì không có mốc: thà thấy thừa
// còn hơn giấu nhầm.
function mocNgayCuaPhuHuynh(user) {
  if (!user || user.role !== 'parent') return null;
  const t = user.createdAt ? Date.parse(user.createdAt) : NaN;
  const ngayTaiKhoan = Number.isFinite(t) ? ngay.ngayCua(t) : null;
  const rows = db.all('student_parents',
    `SELECT n.ngayNhapHoc AS ngayNhapHoc FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       LEFT JOIN student_nhap_hoc n ON n.studentId = s.id
      WHERE sp.parentId = ?`, [user.id]);
  if (!rows.length) return ngayTaiKhoan;
  let moc = null;
  for (const r of rows) {
    const d = r.ngayNhapHoc || ngayTaiKhoan;
    if (!d) return null;
    if (!moc || d < moc) moc = d;
  }
  return moc;
}

// Phụ huynh mà MỌI bé đang học đều nhập học SAU ngày đã cho — tức chưa tới mốc.
// Dùng cho tin đẩy: tin vừa ghi hôm nay mà danh sách của nhà ấy còn giấu thì
// cũng không được kêu chuông ở điện thoại nhà ấy. Bé chưa có ngày nhập học
// tính như mốc rất xa trong quá khứ (ngày tạo tài khoản luôn ≤ hôm nay).
function phuHuynhChuaToiNgay(homNay = ngay.homNay()) {
  return new Set(db.all('student_parents',
    `SELECT sp.parentId AS parentId FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       LEFT JOIN student_nhap_hoc n ON n.studentId = s.id
      WHERE s.active = 1
      GROUP BY sp.parentId
     HAVING MIN(COALESCE(n.ngayNhapHoc, '0000')) > ?`, [homNay]).map(r => r.parentId));
}

module.exports = { kiemTra, ghi, theoBe, ngayCua, mocNgayCuaPhuHuynh, phuHuynhChuaToiNgay };
