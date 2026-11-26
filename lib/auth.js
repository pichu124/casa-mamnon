// Phiên đăng nhập bằng cookie token.
//
// Phiên lưu trong cơ sở dữ liệu nên khởi động lại máy chủ (deploy phiên bản mới)
// người dùng vẫn đăng nhập nguyên trạng — quan trọng khi dùng trên điện thoại.
const crypto = require('crypto');
const db = require('./db');

// Hạn của một phiên: 30 ngày, tính CỐ ĐỊNH từ lúc đăng nhập (`createdAt`) —
// dùng app không kéo dài thêm. Chủ dự án quyết ngày 12/11/2026, trước đó là 7
// ngày. Một hằng này quyết cả ba chỗ: dọn phiên cũ, kiểm phiên ở mỗi yêu cầu,
// và `Max-Age` của cookie. `test/bao-mat.test.mjs` mục [3] và [8b] canh.
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

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

// BẢNG `sessions` CHỈ GIỮ MÃ BĂM CỦA TOKEN, KHÔNG GIỮ TOKEN (Đ261b, lỗi O4).
//
// Cookie của người dùng mang token thô; cột `sessions.token` mang
// `sha256$<hex>` của token ấy. Bản trước lưu thô: ai cầm được một tệp sao lưu
// `.db.gz` (hay bản chép của `school.db`) là dựng được cookie và đăng nhập như
// quản trị tới 30 ngày, không cần phá mật khẩu. Token là 32 byte ngẫu nhiên nên
// một lần sha256 là đủ — không có gì để dò ngược như với mật khẩu.
//
// Mọi hàm dưới đây vẫn NHẬN và TRẢ token thô như trước; băm nằm gọn bên trong
// tệp này. `req.sessionToken` vẫn là token thô.
const TIEN_TO_BAM = 'sha256$';
function bamToken(token) {
  return TIEN_TO_BAM + crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Phiên lưu thô từ trước bản vá: băm tại chỗ một lần lúc nạp tệp, để nâng cấp
// không đăng xuất cả trường và bản sao lưu kế tiếp không còn token thô nào.
// Chạy lại vô hại (dòng đã băm có tiền tố, bị bỏ qua) — kể cả sau khi khôi
// phục một bản sao lưu cũ. Lỗi thì ghi nhật ký và để máy chủ chạy tiếp: tệ
// nhất là những phiên cũ ấy phải đăng nhập lại.
function bamPhienCu() {
  try {
    db.tx(() => {
      const cu = db.all('sessions', "SELECT token FROM sessions WHERE token NOT LIKE 'sha256$%'");
      for (const { token } of cu) {
        db.run('UPDATE sessions SET token = ? WHERE token = ?', [bamToken(token), token]);
      }
    });
  } catch (err) {
    console.error(`[auth] chưa băm được phiên đăng nhập cũ: ${err && err.message}`);
  }
}
bamPhienCu();

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.run('INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)', [bamToken(token), userId, Date.now()]);
  return token;
}

function destroySession(token) {
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [bamToken(token)]);
}

// Đăng xuất mọi thiết bị khác của một người dùng (dùng sau khi đổi mật khẩu).
function destroyUserSessions(userId, exceptToken) {
  const r = db.run('DELETE FROM sessions WHERE userId = ? AND token IS NOT ?',
    [userId, exceptToken ? bamToken(exceptToken) : null]);
  return r.changes;
}

// Middleware: gắn req.user nếu có phiên hợp lệ.
function attachUser(req, res, next) {
  const token = parseCookies(req).session;
  if (token) {
    const sess = db.first('sessions', 'SELECT * FROM sessions WHERE token = ?', [bamToken(token)]);
    if (sess) {
      if (Date.now() - Number(sess.createdAt) < SESSION_TTL) {
        const user = db.findUser(sess.userId);
        if (user && user.active) {
          req.user = user;
          req.sessionToken = token;
          // Mốc tạo của phiên đang gọi, cho chỗ cần nó (routes/push.js) khỏi
          // phải tự tra bảng `sessions` theo token.
          req.sessionCreatedAt = Number(sess.createdAt);
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
  sessionCount: () => db.count('SELECT COUNT(*) FROM sessions'),
  // Hạn của một phiên, cho chỗ nào cần hỏi "phiên này còn sống không" mà
  // không đi qua `attachUser` (lib/day.js, Đ255). Một định nghĩa, không chép số.
  SESSION_TTL,
};
