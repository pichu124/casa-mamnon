// PHÒNG TRAO ĐỔI CHUNG CỦA MỘT NHÓM LỚP (Đ260k, góp ý 18/11).
//
// Nhà trường: *"Chưa biết cách tạo cuộc hội thoại nhóm, để cho phụ huynh khác
// cùng nhắn bàn bạc về 1 vấn đề chung của lớp. Chỉ có chức năng gửi tin nhắn
// nhiều người cùng lúc thôi."*
//
// Phòng là `conversations{type:'group', classId}` cộng một dòng `phong_nhom`.
// AI VÀO ĐƯỢC TÍNH LẠI MỖI LẦN HỎI, không theo danh sách chép lúc lập phòng:
//
//   gia đình → có hàng thành viên VÀ `canAccessClass` (con còn đang học nhóm)
//   cô       → `canAccessClass` (mọi cô của nhóm, hàng thành viên tự thêm)
//   quản trị → có hàng thành viên VÀ `canAccessClass` (phạm vi cơ sở)
//
// Ba chốt ấy đã nằm sẵn ở `findConv`, danh sách hội thoại và huy hiệu nhờ cột
// `classId`; tệp này chỉ giữ phần riêng của phòng nhóm.
//
// GIA ĐÌNH HIỆN LÀ "Mẹ bé An", không họ tên người lớn, không số điện thoại:
// trong phòng chung, các nhà chỉ cần biết ai là phụ huynh của bé nào.
const db = require('./db');

function cuaPhong(conversationId) {
  if (!conversationId) return null;
  return db.first('phong_nhom', 'SELECT * FROM phong_nhom WHERE conversationId = ?', [conversationId]) || null;
}

// Phụ huynh có bé ĐANG HỌC đúng nhóm này không — chốt cho mọi lượt mời.
function laGiaDinhCuaNhom(parentId, classId) {
  return db.count(
    `SELECT COUNT(*) FROM student_parents sp JOIN students s ON s.id = sp.studentId
      WHERE sp.parentId = ? AND s.classId = ? AND s.active = 1`, [parentId, classId]) > 0;
}

// Nhãn của phụ huynh trong phòng: "Mẹ bé Nguyễn Bảo An". Chỉ nêu bé đang học
// ĐÚNG nhóm của phòng — bé ở nhóm khác là chuyện của nhà ấy, không phải của
// phòng này. Không còn bé nào trong nhóm thì chỉ ghi "Phụ huynh".
function nhanNguoiGui(classId, userIds) {
  const ra = new Map();
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return ra;
  for (const id of ids) ra.set(id, 'Phụ huynh');
  const dong = db.all('students',
    `SELECT sp.parentId AS ph, s.name AS ten, COALESCE(q.quanHe, '') AS quanHe
       FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       LEFT JOIN quan_he_phu_huynh q ON q.studentId = s.id AND q.parentId = sp.parentId
      WHERE sp.parentId IN (${ids.map(() => '?').join(',')}) AND s.classId = ? AND s.active = 1
      ORDER BY sp.parentId, s.name`, [...ids, classId]);
  const theo = new Map();
  for (const r of dong) {
    if (!theo.has(r.ph)) theo.set(r.ph, { quanHe: String(r.quanHe || '').trim(), ten: [] });
    theo.get(r.ph).ten.push(r.ten);
  }
  for (const [id, x] of theo) ra.set(id, `${x.quanHe || 'Phụ huynh'} bé ${x.ten.join(' và ')}`);
  return ra;
}

// Gia đình của các bé đang học một nhóm: [{ id, nhan, classId, avatar }].
function giaDinhCuaNhom(classId) {
  const ids = db.all('student_parents',
    `SELECT DISTINCT sp.parentId AS id FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       JOIN users u ON u.id = sp.parentId
      WHERE s.classId = ? AND s.active = 1 AND u.active = 1`, [classId]).map(r => r.id);
  const nhan = nhanNguoiGui(classId, ids);
  return ids.map(id => ({ id, nhan: nhan.get(id), classId, avatar: (db.findUser(id) || {}).avatar || null }))
    .sort((a, b) => a.nhan.localeCompare(b.nhan, 'vi'));
}

// Cô của nhóm tự có trong phòng: thêm hàng thành viên cho mọi phòng nhóm của
// các nhóm cô đang phụ trách mà cô chưa có hàng. Hàng KHÔNG cấp quyền, chỉ để
// phòng hiện trong danh sách và đếm được tin chưa đọc.
function dongBoCo(user) {
  if (!user || user.role !== 'teacher') return;
  const lop = db.classIdsOf(user);
  if (!lop.length) return;
  const thieu = db.all('phong_nhom',
    `SELECT p.conversationId AS id FROM phong_nhom p
      WHERE p.classId IN (${lop.map(() => '?').join(',')})
        AND NOT EXISTS (SELECT 1 FROM conversation_members m
                         WHERE m.conversationId = p.conversationId AND m.userId = ?)`, [...lop, user.id]);
  if (!thieu.length) return;
  db.tx(() => {
    for (const r of thieu) {
      db.insert('conversation_members', { conversationId: r.id, userId: user.id, lastRead: null });
    }
  });
}

// Người này còn đọc được phòng không — cùng luật `findConv`, hỏi cho một
// người khác người đang gọi (để biết đẩy thông báo tới ai).
function conVaoDuoc(u, phong, laThanhVien) {
  if (!u || u.active === false || !phong) return false;
  if (!db.canAccessClass(u, phong.classId)) return false;
  return u.role === 'teacher' || laThanhVien;
}

// GÓI ĐẨY KHI CÓ TIN MỚI TRONG PHÒNG — hàm thuần, chỗ gọi tự gửi.
//
// Gửi cho thành viên CÒN quyền đọc, trừ người gửi. Khoá gộp ổn định theo
// phòng: một buổi sáng hai mươi nhà nhắn thì màn hình chờ chỉ giữ một dòng
// mới nhất của phòng, không chồng hai mươi dòng.
//
// KHÔNG ghi chuông `thongbao_be`: chuông đó theo bé, mọi phụ huynh của bé đọc
// được — kể cả người không có trong phòng.
function goiDayPhong(cv, nguoiGui, text) {
  const phong = cuaPhong(cv && cv.id);
  if (!phong) return null;
  const thanhVien = new Set(db.all('conversation_members',
    'SELECT userId FROM conversation_members WHERE conversationId = ?', [cv.id]).map(r => r.userId));
  const nguoiNhan = [...thanhVien]
    .filter(id => id !== nguoiGui.id)
    .filter(id => conVaoDuoc(db.findUser(id), phong, true));
  const ai = nguoiGui.role === 'parent'
    ? nhanNguoiGui(phong.classId, [nguoiGui.id]).get(nguoiGui.id)
    : `${nguoiGui.title || ''} ${nguoiGui.name || ''}`.trim();
  return {
    nguoiNhan,
    goi: {
      tieuDe: cv.name || 'Phòng trao đổi chung',
      noiDung: `${ai}: ${String(text || '')}`.slice(0, 140),
      hash: `#/messages/${cv.id}`,
      gop: `phong-${cv.id}`,
    },
  };
}

module.exports = {
  cuaPhong, laGiaDinhCuaNhom, nhanNguoiGui, giaDinhCuaNhom, dongBoCo, conVaoDuoc, goiDayPhong,
};
