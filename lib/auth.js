// Phiên đăng nhập bằng cookie token.
//
// Phiên lưu trong cơ sở dữ liệu nên khởi động lại máy chủ (deploy phiên bản mới)
// người dùng vẫn đăng nhập nguyên trạng — quan trọng khi dùng trên điện thoại.
const crypto = require('crypto');
const db = require('./db');

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

// Dọn phiên hết hạn mỗi giờ để bảng không phình theo thời gian.
function purgeExpired() {
  try {
    db.run('DELETE FROM sessions WHERE createdAt < ?', [Date.now() - SESSION_TTL]);
  } catch (_) { /* bỏ qua, sẽ dọn ở lần sau */ }
}
const purgeTimer = setInterval(purgeExpired, 60 * 60 * 1000);
purgeTimer.unref();

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.run('INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)', [token, userId, Date.now()]);
  return token;
}

function destroySession(token) {
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

// Đăng xuất mọi thiết bị khác của một người dùng (dùng sau khi đổi mật khẩu).
function destroyUserSessions(userId, exceptToken) {
  const r = db.run('DELETE FROM sessions WHERE userId = ? AND token IS NOT ?', [userId, exceptToken || null]);
  return r.changes;
}

// Middleware: gắn req.user nếu có phiên hợp lệ.
function attachUser(req, res, next) {
  const token = parseCookies(req).session;
  if (token) {
    const sess = db.first('sessions', 'SELECT * FROM sessions WHERE token = ?', [token]);
    if (sess) {
      if (Date.now() - Number(sess.createdAt) < SESSION_TTL) {
        const user = db.findUser(sess.userId);
        if (user && user.active) {
          req.user = user;
          req.sessionToken = token;
        } else {
          destroySession(token); // tài khoản đã bị xóa hoặc khóa
        }
      } else {
        destroySession(token);
      }
    }
  }
  next();
}

// Middleware: bắt buộc đăng nhập (dùng cho mọi /api trừ auth).
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  next();
}

// Middleware: bắt buộc vai trò cụ thể, ví dụ requireRole('teacher').
// Quản trị viên luôn có quyền của giáo viên để hỗ trợ khi cần.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Không có quyền thực hiện' });
    next();
  };
}

// Chuỗi cookie phiên. Cờ Secure chỉ bật khi truy cập qua HTTPS, để dùng thử
// qua http://localhost hay địa chỉ mạng nội bộ vẫn đăng nhập được.
function sessionCookie(req, token) {
  const parts = [
    `session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL / 1000}`,
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(req) {
  const parts = ['session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

// req.secure đã tính cả header X-Forwarded-Proto khi bật 'trust proxy'.
function isSecureRequest(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

module.exports = {
  attachUser, requireAuth, requireRole,
  createSession, destroySession, destroyUserSessions,
  sessionCookie, clearCookie, isSecureRequest,
  flushSessions: () => {},   // không còn cần: phiên đã ghi thẳng vào cơ sở dữ liệu
  sessionCount: () => db.count('SELECT COUNT(*) FROM sessions'),
};
