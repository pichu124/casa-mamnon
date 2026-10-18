// THÔNG BÁO RIÊNG CHO GIA ĐÌNH MỘT BÉ (Đ137).
//
// Nhà trường 07/09: "mọi update của nhà trường như cân đo, cập nhật ăn uống,
// ảnh check-in, album… cần phải có thông báo tới phụ huynh". Những việc đó là
// chuyện của MỘT bé, nên đi riêng bảng `thongbao_be` (xem lib/schema.sql) và
// đọc theo quan hệ bố mẹ – con, không đi qua luật "ai thấy gì" của thông báo
// nhà trường.
//
// MỘT ĐIỂM GỌI, KHÔNG BAO GIỜ NÉM LỖI: mọi phân hệ chỉ gọi `gui(...)`. Ghi
// chuông trong app xong thì thử đẩy về điện thoại (lib/day.js); cả hai hỏng
// thì việc chính của cô vẫn xong.
const db = require('./db');

const TOI_DA_TIEU_DE = 120;
const TOI_DA_NOI_DUNG = 500;

// DÒNG CHUÔNG ĐI THEO BẢN GHI GỐC KHI GỐC BỊ THU HỒI (Đ239p).
//
// `noiDung` thường chép chữ của một bản ghi thu hồi được — tin nhắn của cô
// chép 140 chữ đầu. Cô nhắn nhầm nhà rồi thu hồi ngay mà dòng chuông vẫn in
// nguyên câu ấy thì lời hứa "giữ chỗ, bỏ chữ" của tin nhắn vỡ ở màn Thông báo.
// Nên ai chép chữ của một bản ghi như thế thì truyền `nguon: { bang, recordId }`
// (bảng và mã, cùng nghĩa với `record_edits`); lúc ĐỌC, dòng có gốc đã thu hồi
// không đi ra khỏi máy chủ nữa — cả chữ lẫn con số chưa đọc. Dòng vẫn nằm
// nguyên trong bảng. Thông báo đẩy đã tới điện thoại thì không thu lại được.
const NGUON_CON_HIEN = `NOT EXISTS (SELECT 1 FROM thongbao_be_nguon n
    JOIN record_edits e ON e.bang = n.bang AND e.recordId = n.recordId AND e.thuHoi = 1
   WHERE n.thongBaoId = t.id)`;

function gui({ studentId, loai = '', tieuDe, noiDung = '', hash = '', nguoiTao = null, nguon = null } = {}) {
  try {
    if (!studentId || !tieuDe) return null;
    const rec = {
      id: db.nextId('tbb'),
      studentId: String(studentId),
      loai: String(loai || '').slice(0, 40),
      tieuDe: String(tieuDe).trim().slice(0, TOI_DA_TIEU_DE),
      noiDung: String(noiDung || '').trim().slice(0, TOI_DA_NOI_DUNG),
      hash: String(hash || '').slice(0, 200),
      nguoiTao: nguoiTao || null,
      taoLuc: new Date().toISOString(),
    };
    // Cùng một giao dịch: thà không có chuông còn hơn có chuông mà thu hồi
    // không chạm tới được.
    db.tx(() => {
      db.insert('thongbao_be', rec);
      if (nguon && nguon.bang && nguon.recordId) {
        db.insert('thongbao_be_nguon', {
          thongBaoId: rec.id, bang: String(nguon.bang), recordId: String(nguon.recordId),
        });
      }
    });
    try {
      require('./day').guiChoGiaDinhCuaBe(rec.studentId, { tieuDe: rec.tieuDe, noiDung: rec.noiDung, hash: rec.hash });
    } catch (_) { /* đẩy là việc phụ */ }
    return rec.id;
  } catch (_) {
    return null;
  }
}

// Mã các bé mà người này là bố/mẹ. Cô, văn phòng: rỗng — thông báo riêng của
// bé là thứ gia đình nhận, không phải một luồng thứ hai cho cô.
function conCua(user) {
  if (!user || user.role !== 'parent') return [];
  return db.all('student_parents', 'SELECT studentId FROM student_parents WHERE parentId = ?', [user.id])
    .map(r => r.studentId);
}

// Danh sách cho một người, mới nhất trước, kèm tên bé và đã đọc chưa. Hình
// dạng gần với dòng của `notifications` để màn Thông báo vẽ chung một danh sách.
function danhSachCua(user, { soLuong = 30, bo = 0 } = {}) {
  const ids = conCua(user);
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(',');
  const rows = db.all('thongbao_be',
    `SELECT t.*, (d.userId IS NOT NULL) AS daDoc, s.name AS tenBe
       FROM thongbao_be t
       JOIN students s ON s.id = t.studentId
       LEFT JOIN thongbao_be_doc d ON d.thongBaoId = t.id AND d.userId = ?
      WHERE t.studentId IN (${marks}) AND ${NGUON_CON_HIEN}
      ORDER BY t.taoLuc DESC
      LIMIT ? OFFSET ?`,
    [user.id, ...ids, Math.max(1, Math.min(100, soLuong)), Math.max(0, bo)]);
  return rows.map(r => ({
    id: r.id,
    laRiengBe: true,
    studentId: r.studentId,
    tenBe: r.tenBe,
    loai: r.loai,
    title: r.tieuDe,
    body: r.noiDung,
    hash: r.hash,
    createdAt: r.taoLuc,
    createdBy: r.nguoiTao,
    read: !!r.daDoc,
    pinned: false,
    category: 'Về bé',
    audience: 'be',
  }));
}

function demChuaDoc(user) {
  const ids = conCua(user);
  if (!ids.length) return 0;
  const marks = ids.map(() => '?').join(',');
  return db.count(
    `SELECT COUNT(*) FROM thongbao_be t
      WHERE t.studentId IN (${marks}) AND ${NGUON_CON_HIEN}
        AND NOT EXISTS (SELECT 1 FROM thongbao_be_doc d WHERE d.thongBaoId = t.id AND d.userId = ?)`,
    [...ids, user.id]);
}

// Đánh dấu đã đọc — chỉ khi thông báo là của con mình.
function danhDaDoc(user, id) {
  const t = db.first('thongbao_be', 'SELECT * FROM thongbao_be WHERE id = ?', [id]);
  if (!t) return { ok: false, ma: 404 };
  if (!conCua(user).includes(t.studentId)) return { ok: false, ma: 403 };
  db.run('INSERT OR IGNORE INTO thongbao_be_doc (thongBaoId, userId, docLuc) VALUES (?, ?, ?)',
    [t.id, user.id, new Date().toISOString()]);
  return { ok: true };
}

function docTatCa(user) {
  const ids = conCua(user);
  if (!ids.length) return 0;
  const marks = ids.map(() => '?').join(',');
  const r = db.run(
    `INSERT OR IGNORE INTO thongbao_be_doc (thongBaoId, userId, docLuc)
     SELECT id, ?, ? FROM thongbao_be WHERE studentId IN (${marks})`,
    [user.id, new Date().toISOString(), ...ids]);
  return r.changes;
}

function laMaRiengBe(id) { return /^tbb/.test(String(id || '')); }

module.exports = { gui, danhSachCua, demChuaDoc, danhDaDoc, docTatCa, laMaRiengBe, conCua };
