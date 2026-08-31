// Cấp lại mật khẩu khi người dùng quên.
//
// Trường học thường không có máy chủ gửi thư điện tử, nên cách làm thực tế là:
// giáo viên chủ nhiệm (hoặc quản trị viên) cấp một mật khẩu tạm, đọc cho phụ
// huynh, và phụ huynh buộc phải đổi ngay khi đăng nhập.
const db = require('../lib/db');
const password = require('../lib/password');
const { requireRole, destroyUserSessions } = require('../lib/auth');

// Mật khẩu tạm dễ đọc qua điện thoại: bỏ các ký tự dễ nhầm (0/O, 1/l/I).
const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
function sinhMatKhauTam() {
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let out = '';
  for (let i = 0; i < 5; i++) out += pick(CHU);
  for (let i = 0; i < 3; i++) out += pick(SO);
  return out;
}

// Người dùng mà tài khoản hiện tại được phép cấp lại mật khẩu.
// Cô: phụ huynh của trẻ trong CÁC nhóm mình phụ trách. Quản trị: mọi người trừ
// chính mình — TRỪ hai chỗ nói ở dưới.
//
// ĐƯỜNG NÀY TỪNG LÀ LỐI LEO THANG QUYỀN NGẮN NHẤT TRONG CẢ APP (N15)
//
// Đường cấp lại mật khẩu TRẢ THẲNG mật khẩu tạm về cho người bấm — phải thế,
// vì cô đọc nó qua điện thoại cho phụ huynh. Nhưng cộng với `role === 'admin'
// thì được cấp cho mọi người`, một quản trị Cấp 3 chỉ cần ba lời gọi để thành
// Cấp 1: xem danh sách quản trị, cấp lại mật khẩu cho tài khoản Cấp 1, rồi
// đăng nhập bằng chính mật khẩu vừa nhận. Đã dựng lại được, và thành công.
//
// Mọi chốt chặn khác của tầng cơ sở đều vô nghĩa khi lối này còn mở, nên hai
// vế dưới đây là phần quan trọng nhất của N15:
//
//   1. Quản trị Cấp 3 KHÔNG cấp lại mật khẩu cho tài khoản quản trị nào khác.
//      Không phân biệt Cấp 1 hay Cấp 3 khác: cấp cho một Cấp 3 khác cũng là
//      chiếm được cơ sở của người ta.
//   2. Quản trị Cấp 3 chỉ cấp lại được cho cô và phụ huynh CỦA CƠ SỞ MÌNH.
//
// Trường chưa khai cơ sở nào thì `db.phamViCoSo` trả null và cả khối này nằm
// im — quản trị giữ nguyên quyền như trước khi có N4.
// CHỨC VỤ CẤP 2 CŨNG KHÔNG ĐỤNG TỚI TÀI KHOẢN QUẢN TRỊ
//
// N15 bịt lối leo thang cho Cấp 3 bằng cách hỏi `db.phamViCoSo`. Chức vụ Cấp 2
// (Nhân sự) đi lọt qua đúng chỗ đó: nó là tài khoản quản trị KHÔNG khoá vào cơ
// sở nào, nên `phamViCoSo` trả `null` và dòng `return true` ở trên nhận nó là
// ban giám hiệu. Ba lời gọi sau đó là thành Cấp 1: mở danh sách quản trị, cấp
// lại mật khẩu cho ban giám hiệu, đọc mật khẩu tạm ngay trên màn hình rồi đăng
// nhập. Đúng lối cũ, chỉ đổi người đi.
//
// Nên Cấp 2 dừng ở đây: cô và phụ huynh thì được, tài khoản quản trị thì không
// — kể cả một tài khoản Cấp 2 khác, vì chiếm được nó là chiếm được phần việc
// của người ta.
// CHỨC VỤ CHỈ LO TÀI KHOẢN CỦA TRƯỜNG, KHÔNG CHẠM TÀI KHOẢN CỦA GIA ĐÌNH.
//
// Nhân sự có `/api/accounts` vì họ lập, khoá và cấp lại mật khẩu cho tài khoản
// của CÔ. Nhưng chính mô tả chức vụ ấy hứa với nhà trường rằng họ "KHÔNG mở
// được hồ sơ bé, sức khoẻ, hay ảnh của trẻ" — mà hai đường dưới đây đi vòng
// qua đúng lời hứa đó:
//
//   • cấp lại mật khẩu cho một tài khoản PHỤ HUYNH thì người cấp cầm luôn mật
//     khẩu tạm, và tài khoản đó mở được cả ba thứ vừa kể;
//   • danh sách phụ huynh trả về kèm TÊN CÁC CON của từng nhà.
//
// Đây không phải lỗ hổng cần vá gấp — app buộc đổi mật khẩu ở lần đăng nhập kế,
// đá mọi thiết bị của gia đình ra, và ghi lại ai bấm cho ai. Nhưng "để lại dấu
// vết" là cách xử lý sau khi chuyện đã xảy ra, còn đây là chặn từ đầu, và chặn
// mà không ai mất việc: gia đình quên mật khẩu vẫn có cô của nhóm bé (đường
// ngay dưới), ban giám hiệu, và quản trị toàn hệ thống lo được.
const CHUC_VU_KHONG_LO_GIA_DINH = ['nhansu'];

function chiLoTaiKhoanTruong(user) {
  return !!user && user.role === 'admin'
    && CHUC_VU_KHONG_LO_GIA_DINH.includes(db.chucVu(user));
}

const LOI_KHONG_LO_GIA_DINH = 'Tài khoản Nhân sự lo phần tài khoản của trường. '
  + 'Phần của gia đình do cô phụ trách nhóm của bé, ban giám hiệu, hoặc quản trị '
  + 'toàn hệ thống làm giúp.';

function coQuyenCapLai(actor, target) {
  if (!target || !target.active) return false;
  if (actor.id === target.id) return false;
  if (actor.role === 'admin') {
    if (target.role === 'parent' && chiLoTaiKhoanTruong(actor)) return false;
    if (db.capChucVu(actor) === 2 && target.role === 'admin') return false;
    const pham = db.phamViCoSo(actor);
    if (pham === null) return true;
    if (target.role === 'admin') return false;
    return trongCoSo(target, pham);
  }
  if (actor.role !== 'teacher') return false;
  if (target.role !== 'parent') return false;
  const nhom = db.classIdsOfTeacher(actor.id);
  if (!nhom.length) return false;
  const marks = nhom.map(() => '?').join(',');
  return db.count(
    `SELECT COUNT(*) FROM student_parents sp
     JOIN students s ON s.id = sp.studentId
     WHERE sp.parentId = ? AND s.classId IN (${marks}) AND s.active = 1`,
    [target.id, ...nhom]) > 0;
}

// Một tài khoản cô hoặc phụ huynh có thuộc cơ sở này không.
//
// Cả hai đều KHÔNG có cơ sở của riêng mình — quan hệ đi vòng qua nhóm lớp:
// cô thì qua nhóm cô phụ trách, phụ huynh thì qua nhóm con đang học. Người nào
// không nối được tới nhóm nào của cơ sở này thì không thuộc về nó.
function trongCoSo(target, campusId) {
  const nhom = db.classIdsOfCampus(campusId);
  if (!nhom.length) return false;
  const marks = nhom.map(() => '?').join(',');
  if (target.role === 'teacher') {
    return db.classIdsOfTeacher(target.id).some(id => nhom.includes(id));
  }
  if (target.role === 'parent') {
    return db.count(
      `SELECT COUNT(*) FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       WHERE sp.parentId = ? AND s.classId IN (${marks}) AND s.active = 1`,
      [target.id, ...nhom]) > 0;
  }
  return false;
}

module.exports = (app) => {
  // Danh sách phụ huynh lớp mình, kèm tên con — để giáo viên tìm đúng người.
  app.get('/api/accounts/parents', requireRole('teacher', 'admin'), (req, res) => {
    if (chiLoTaiKhoanTruong(req.user)) {
      return res.status(403).json({ error: LOI_KHONG_LO_GIA_DINH });
    }
    const students = db.studentsOf(req.user);
    const seen = new Map();
    for (const s of students) {
      for (const pid of s.parentIds) {
        const p = db.findUser(pid);
        if (!p || !p.active) continue;
        if (!seen.has(pid)) {
          seen.set(pid, {
            userId: p.id,
            name: `${p.title} ${p.name}`,
            username: p.username,
            phone: p.phone,
            avatar: p.avatar,
            mustChangePassword: p.mustChangePassword,
            children: [],
          });
        }
        seen.get(pid).children.push(s.name);
      }
    }
    res.json([...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  });

  // Cấp mật khẩu tạm cho một tài khoản.
  app.post('/api/accounts/:id/reset-password', requireRole('teacher', 'admin'), (req, res) => {
    const target = db.findUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    if (!coQuyenCapLai(req.user, target)) {
      return res.status(403).json({
        error: target.role === 'parent' && chiLoTaiKhoanTruong(req.user)
          ? LOI_KHONG_LO_GIA_DINH
          : 'Bạn không có quyền cấp lại mật khẩu cho tài khoản này',
      });
    }

    const matKhauTam = sinhMatKhauTam();
    db.update('users', target.id, {
      passwordHash: password.hash(matKhauTam),
      mustChangePassword: true,
    });
    // Đăng xuất mọi thiết bị của người đó: nếu tài khoản bị chiếm dụng thì
    // việc cấp lại mật khẩu phải cắt được phiên của kẻ đang dùng trộm.
    const kicked = destroyUserSessions(target.id, null);
    db.audit(req.user.id, 'reset-password', target.id, {
      targetName: target.name, targetUsername: target.username, kicked,
    });

    res.json({
      ok: true,
      username: target.username,
      temporaryPassword: matKhauTam,
      message: `Đã cấp mật khẩu tạm cho ${target.title} ${target.name}. ` +
        'Vui lòng đọc cho phụ huynh và nhắc đổi lại ngay khi đăng nhập.',
    });
  });

  // NHỮNG LẦN CHÍNH NGƯỜI NÀY ĐÃ CẤP LẠI MẬT KHẨU CHO AI.
  //
  // CHÚ THÍCH CŨ NÓI SAI, và sai theo hướng nguy hiểm: nó ghi "nhật ký cấp lại
  // mật khẩu — để tra khi có tranh chấp", nghe như đây là chỗ tra "tài khoản
  // của nhà tôi bị ai đổi mật khẩu". Câu truy vấn thì lọc `userId = ?`, tức mã
  // NGƯỜI ĐI CẤP LẠI, không phải mã tài khoản BỊ cấp lại. Ai tin theo chú thích
  // mà mở đường này ra để điều tra một khiếu nại sẽ nhận về danh sách rỗng và
  // kết luận "không ai đụng vào" — trong khi người đụng vào là người khác.
  //
  // Chỗ tra khi có tranh chấp thật là **Quản trị → Nhật ký** (`/api/admin/audit`),
  // nơi đọc được cả bảng `audit_log` chứ không riêng phần của mình.
  //
  // GIỮ ĐƯỜNG NÀY, chỉ sửa lại lời: nó đúng cho một câu hỏi có thật — "tuần này
  // tôi đã cấp lại cho những ai" — và chưa màn hình nào gọi tới, nên bỏ đi thì
  // ngày mai dựng màn ấy lại phải viết lại. Xoá dữ liệu hay đường dẫn là việc
  // phải hỏi nhà trường trước (CLAUDE.md).
  app.get('/api/accounts/reset-log', requireRole('teacher', 'admin'), (req, res) => {
    const rows = db.all('audit_log',
      `SELECT * FROM audit_log WHERE action = 'reset-password' AND userId = ?
       ORDER BY at DESC LIMIT 50`, [req.user.id]);
    res.json(rows.map(r => {
      let detail = {};
      try { detail = JSON.parse(r.detail || '{}'); } catch (_) {}
      return { at: r.at, targetName: detail.targetName || '', targetUsername: detail.targetUsername || '' };
    }));
  });
};

module.exports.sinhMatKhauTam = sinhMatKhauTam;
