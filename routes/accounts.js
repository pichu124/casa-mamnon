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
// chính mình.
function coQuyenCapLai(actor, target) {
  if (!target || !target.active) return false;
  if (actor.id === target.id) return false;
  if (actor.role === 'admin') return true;
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

module.exports = (app) => {
  // Danh sách phụ huynh lớp mình, kèm tên con — để giáo viên tìm đúng người.
  app.get('/api/accounts/parents', requireRole('teacher', 'admin'), (req, res) => {
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
      return res.status(403).json({ error: 'Bạn không có quyền cấp lại mật khẩu cho tài khoản này' });
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

  // Nhật ký cấp lại mật khẩu — để tra khi có tranh chấp.
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
