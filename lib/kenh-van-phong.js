// HỘP THƯ VĂN PHÒNG — mỗi tài khoản phụ huynh × cơ sở một cuộc (Đ239m).
//
// Góp ý nhà trường 16/10, mục PH1; chủ dự án chọn phương án A ngày 18/10. Vì
// sao gắn theo NGƯỜI chứ không theo bé: xem chú thích bảng `kenh_van_phong` ở
// lib/schema.sql.
//
// ĐÂY LÀ CHỖ DUY NHẤT ĐỊNH NGHĨA "AI ĐỌC ĐƯỢC CUỘC NÀO". Danh sách hội thoại,
// mở một cuộc, huy hiệu tin chưa đọc và đẩy thông báo đều hỏi ở đây — bốn chỗ
// tự viết bốn bản là ngày chúng trôi khỏi nhau thì danh sách giấu một cuộc mà
// huy hiệu vẫn đếm nó, hoặc ngược lại: đẩy tin tới người không còn được đọc.
//
//   gia đình  → đúng chủ cuộc, và chủ cuộc còn ít nhất một con trong hạn đọc
//               (`canAccessStudent`, đã gồm hạn 12 tháng sau khi bé nghỉ).
//               CỐ Ý không buộc theo cơ sở: người đọc chỉ có một, chính là
//               người đã viết; bé chuyển cơ sở mà bố mẹ mất thư của chính mình
//               thì sai.
//   văn phòng → tài khoản quản trị trong phạm vi cơ sở của cuộc — cùng tầng
//               quyền với `canAccessStudent` của quản trị.
//   cô        → không bao giờ. Gia đình nói với văn phòng, không nói với cô.
const db = require('./db');

const LOAI = 'vanphong';

function cuaHoiThoai(conversationId) {
  if (!conversationId) return null;
  return db.first('kenh_van_phong',
    'SELECT * FROM kenh_van_phong WHERE conversationId = ?', [conversationId]) || null;
}

// Cuộc đang dùng của một người ở một cơ sở: dòng mới nhất chưa bị đóng.
function cuocDangMo(parentId, campusId) {
  if (!parentId) return null;
  return db.first('kenh_van_phong',
    `SELECT * FROM kenh_van_phong
      WHERE parentId = ? AND campusId = ?
        AND conversationId NOT IN (SELECT conversationId FROM hoi_thoai_dong)
      ORDER BY taoLuc DESC, rowid DESC LIMIT 1`, [parentId, campusId || '']) || null;
}

// Lập cuộc mới. MỘT hàng thành viên duy nhất, cho chủ cuộc: phía gia đình không
// có ai khác, kể cả vợ hay chồng — đó là cái giá chủ dự án đã chấp nhận khi
// chọn phương án này.
function taoCuoc(parentId, campusId) {
  const row = {
    conversationId: db.nextId('cv'),
    parentId,
    campusId: campusId || '',
    taoLuc: new Date().toISOString(),
  };
  db.tx(() => {
    db.insert('conversations', { id: row.conversationId, type: LOAI, name: null, classId: null });
    db.insert('kenh_van_phong', row);
    db.insert('conversation_members',
      { conversationId: row.conversationId, userId: parentId, lastRead: null });
  });
  return row;
}

// Các con mà phụ huynh này CÒN được đọc — theo quan hệ, rồi lọc qua đúng chốt
// quyền chung, để bé đã nghỉ quá 12 tháng hay bé đã gỡ quan hệ không tính.
function beDocDuoc(parent) {
  if (!parent || parent.role !== 'parent') return [];
  return db.studentIdsCuaPhuHuynh(parent.id).filter(id => db.canAccessStudent(parent, id));
}

function giaDinhVaoDuoc(user, row) {
  return !!(user && row && user.role === 'parent' && user.id === row.parentId
    && beDocDuoc(user).length > 0);
}

function vanPhongVaoDuoc(user, row) {
  if (!user || !row || user.role !== 'admin') return false;
  const pham = db.phamViCoSo(user);
  return pham === null || row.campusId === pham;
}

function vaoDuoc(user, row) {
  return giaDinhVaoDuoc(user, row) || vanPhongVaoDuoc(user, row);
}

// ĐIỀU KIỆN CHO DANH SÁCH VÀ HUY HIỆU — trên bí danh `c` của `conversations`.
//
// Đứng trong WHERE, TRƯỚC LIMIT, để số dòng trả về vẫn đúng bằng số dòng người
// này xem được (lời cam kết đếm trang ở routes/messages.js).
//
// Vế `kenh` của gia đình sửa luôn một chỗ hở cũ: hàng thành viên không bao giờ
// bị gỡ, nên người đã mất quyền với một bé vẫn thấy tiêu đề và tin cuối của
// kênh bé đó trong danh sách, chỉ bị chặn lúc bấm vào.
function dieuKienDanhSach(user) {
  if (user && user.role === 'parent') {
    const be = beDocDuoc(user);
    const vp = `(c.type != '${LOAI}' OR (${be.length ? '1 = 1' : '1 = 0'}`
      + ' AND c.id IN (SELECT conversationId FROM kenh_van_phong WHERE parentId = ?)))';
    const kenh = be.length
      ? `(c.type != 'kenh' OR c.id IN (SELECT conversationId FROM kenh_hoi_thoai WHERE studentId IN (${be.map(() => '?').join(',')})))`
      : "(c.type != 'kenh')";
    return { sql: `${vp} AND ${kenh}`, params: [user.id, ...be] };
  }
  if (user && user.role === 'admin') {
    const pham = db.phamViCoSo(user);
    if (pham === null) return { sql: '1 = 1', params: [] };
    return {
      sql: `(c.type != '${LOAI}' OR c.id IN (SELECT conversationId FROM kenh_van_phong WHERE campusId = ?))`,
      params: [pham],
    };
  }
  return { sql: `(c.type != '${LOAI}')`, params: [] };
}

// Cuộc mà một tài khoản văn phòng đọc được nhưng chưa có hàng thành viên —
// thiếu hàng ấy thì cuộc không hiện trong danh sách và không đếm chưa đọc.
function cuocThieuThanhVien(user) {
  if (!user || user.role !== 'admin') return [];
  const pham = db.phamViCoSo(user);
  return db.all('kenh_van_phong',
    `SELECT k.* FROM kenh_van_phong k
      WHERE ${pham === null ? '1 = 1' : 'k.campusId = ?'}
        AND NOT EXISTS (SELECT 1 FROM conversation_members m
                         WHERE m.conversationId = k.conversationId AND m.userId = ?)`,
    pham === null ? [user.id] : [pham, user.id])
    .filter(r => vanPhongVaoDuoc(user, r));
}

// Ai nhận thông báo đẩy khi văn phòng trả lời: chủ cuộc, nếu còn quyền đọc.
function nguoiNhanDay(row) {
  if (!row) return [];
  const u = db.findUser(row.parentId);
  return giaDinhVaoDuoc(u, row) ? [row.parentId] : [];
}

module.exports = {
  LOAI, cuaHoiThoai, cuocDangMo, taoCuoc, beDocDuoc,
  giaDinhVaoDuoc, vanPhongVaoDuoc, vaoDuoc,
  dieuKienDanhSach, cuocThieuThanhVien, nguoiNhanDay,
};
