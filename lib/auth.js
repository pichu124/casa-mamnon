// Phiên đăng nhập bằng cookie token, lưu trong bộ nhớ.
const crypto = require('crypto');
const db = require('./db');

const sessions = new Map(); // token -> { userId, createdAt }
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

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
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function destroySession(token) { sessions.delete(token); }

// Middleware: gắn req.user nếu có phiên hợp lệ.
function attachUser(req, res, next) {
  const token = parseCookies(req).session;
  if (token && sessions.has(token)) {
    const sess = sessions.get(token);
    if (Date.now() - sess.createdAt < SESSION_TTL) {
      req.user = db.findUser(sess.userId);
      req.sessionToken = token;
    } else {
      sessions.delete(token);
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
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Không có quyền thực hiện' });
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole, createSession, destroySession };
