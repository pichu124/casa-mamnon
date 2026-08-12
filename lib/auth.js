// Phiên đăng nhập bằng cookie token.
//
// Phiên được lưu xuống đĩa nên khởi động lại máy chủ (deploy phiên bản mới)
// người dùng vẫn đăng nhập nguyên trạng — quan trọng khi dùng trên điện thoại.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const SESSION_FILE = path.join(db.DATA_DIR, 'sessions.json');
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 ngày

const sessions = new Map(); // token -> { userId, createdAt }
let saveTimer = null;

function loadSessions() {
  try {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const now = Date.now();
    for (const [token, s] of Object.entries(raw)) {
      if (s && typeof s.createdAt === 'number' && now - s.createdAt < SESSION_TTL) {
        sessions.set(token, s);
      }
    }
  } catch (_) {
    /* chưa có file phiên hoặc file hỏng — bắt đầu với danh sách rỗng */
  }
}
loadSessions();

function writeSessions() {
  try {
    fs.mkdirSync(db.DATA_DIR, { recursive: true });
    const tmp = `${SESSION_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(sessions)));
    fs.renameSync(tmp, SESSION_FILE);
  } catch (err) {
    console.error('Không lưu được phiên đăng nhập:', err.message);
  }
}

function saveSessions() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; writeSessions(); }, 300);
}

function flushSessions() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  writeSessions();
}

// Dọn phiên hết hạn mỗi giờ để file không phình theo thời gian.
function purgeExpired() {
  const now = Date.now();
  let removed = 0;
  for (const [token, s] of sessions) {
    if (now - s.createdAt >= SESSION_TTL) { sessions.delete(token); removed++; }
  }
  if (removed) saveSessions();
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
  sessions.set(token, { userId, createdAt: Date.now() });
  saveSessions();
  return token;
}

function destroySession(token) {
  if (sessions.delete(token)) saveSessions();
}

// Đăng xuất mọi thiết bị khác của một người dùng (dùng sau khi đổi mật khẩu).
function destroyUserSessions(userId, exceptToken) {
  let removed = 0;
  for (const [token, s] of sessions) {
    if (s.userId === userId && token !== exceptToken) { sessions.delete(token); removed++; }
  }
  if (removed) saveSessions();
  return removed;
}

// Middleware: gắn req.user nếu có phiên hợp lệ.
function attachUser(req, res, next) {
  const token = parseCookies(req).session;
  if (token && sessions.has(token)) {
    const sess = sessions.get(token);
    if (Date.now() - sess.createdAt < SESSION_TTL) {
      const user = db.findUser(sess.userId);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      } else {
        destroySession(token); // tài khoản đã bị xóa
      }
    } else {
      destroySession(token);
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
  sessionCookie, clearCookie, isSecureRequest, flushSessions,
  sessionCount: () => sessions.size,
};
