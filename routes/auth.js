// Đăng nhập / đăng xuất / thông tin phiên hiện tại / đổi mật khẩu.
const db = require('../lib/db');
const password = require('../lib/password');
const {
  createSession, destroySession, destroyUserSessions,
  sessionCookie, clearCookie, requireAuth,
} = require('../lib/auth');

// ---- Chống dò mật khẩu: giới hạn số lần đăng nhập sai theo địa chỉ IP ----
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000; // khóa 15 phút
const attempts = new Map(); // ip -> { count, firstAt, lockedUntil }

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function lockRemaining(ip) {
  const rec = attempts.get(ip);
  if (!rec || !rec.lockedUntil) return 0;
  const left = rec.lockedUntil - Date.now();
  if (left <= 0) { attempts.delete(ip); return 0; }
  return left;
}

function noteFailure(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, firstAt: now, lockedUntil: 0 };
  // Quá 15 phút kể từ lần sai đầu tiên thì đếm lại từ đầu.
  if (now - rec.firstAt > LOCK_MS) { rec.count = 0; rec.firstAt = now; }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = now + LOCK_MS;
  attempts.set(ip, rec);
}

function clearFailures(ip) { attempts.delete(ip); }

// Dọn bản ghi cũ để Map không phình vô hạn.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) {
    if (now - rec.firstAt > LOCK_MS && (!rec.lockedUntil || rec.lockedUntil < now)) attempts.delete(ip);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

// ---- Chuẩn hóa dữ liệu trả về ----

function publicUser(u) {
  if (!u) return null;
  const { passwordHash: _h, ...rest } = u;
  return rest;
}

// Gói dữ liệu trả về sau đăng nhập: người dùng + học sinh liên quan + lớp + trường.
function mePayload(user) {
  const students = db.studentsOf(user).map(s => {
    const cls = s.classId ? db.findClass(s.classId) : null;
    const teacher = cls && cls.teacherId ? db.findUser(cls.teacherId) : null;
    return {
      ...s,
      className: cls ? cls.name : '',
      teacherName: teacher ? `${teacher.title} ${teacher.name}` : '',
      teacherId: teacher ? teacher.id : null,
    };
  });
  return {
    user: publicUser(user),
    students,
    classes: db.classes(),
    school: db.school(),
  };
}

module.exports = (app) => {
  app.post('/api/auth/login', (req, res) => {
    const ip = clientIp(req);
    const locked = lockRemaining(ip);
    if (locked) {
      const minutes = Math.ceil(locked / 60000);
      return res.status(429).json({
        error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      });
    }

    const { username, password: plain } = req.body || {};
    const user = db.findUserByUsername(username);

    // So khớp mật khẩu đã băm. Câu báo lỗi cố ý không nói rõ sai tên hay sai
    // mật khẩu, để không giúp người lạ dò ra tài khoản nào có thật.
    const ok = user && user.active && password.verify(String(plain || ''), user.passwordHash);
    if (!ok) {
      noteFailure(ip);
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    clearFailures(ip);
    const token = createSession(user.id);
    db.audit(user.id, 'login', null, { ip });
    res.setHeader('Set-Cookie', sessionCookie(req, token));
    res.json(mePayload(user));
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) destroySession(req.sessionToken);
    res.setHeader('Set-Cookie', clearCookie(req));
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    res.json(mePayload(req.user));
  });

  // Đổi mật khẩu. Sau khi đổi, mọi thiết bị khác bị đăng xuất.
  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!password.verify(String(currentPassword || ''), req.user.passwordHash)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    const weak = password.checkStrength(newPassword);
    if (weak) return res.status(400).json({ error: weak });
    if (String(newPassword) === String(currentPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    }

    db.update('users', req.user.id, {
      passwordHash: password.hash(String(newPassword)),
      mustChangePassword: false,
    });
    db.audit(req.user.id, 'change-password', req.user.id, null);
    const kicked = destroyUserSessions(req.user.id, req.sessionToken);
    res.json({
      ok: true,
      message: kicked
        ? `Đã đổi mật khẩu. ${kicked} thiết bị khác đã được đăng xuất.`
        : 'Đã đổi mật khẩu thành công.',
    });
  });
};

module.exports.mePayload = mePayload;
module.exports.publicUser = publicUser;
