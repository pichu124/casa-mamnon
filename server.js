// SchoolConnect — Sổ liên lạc điện tử kết nối nhà trường và gia đình.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const auth = require('./lib/auth');
const password = require('./lib/password');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 để điện thoại cùng Wi-Fi vào được

// Khi chạy sau reverse proxy (Render, Railway, Nginx, Cloudflare) thì tin cậy
// header X-Forwarded-* để biết địa chỉ IP thật và giao thức thật (http/https).
if (process.env.TRUST_PROXY !== '0') app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '2mb' }));

// Buộc dùng HTTPS khi đã bật FORCE_HTTPS (nên bật khi chạy trên Internet).
app.use((req, res, next) => {
  if (process.env.FORCE_HTTPS === '1' && !auth.isSecureRequest(req)) {
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Các header bảo mật cơ bản.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');            // chống nhúng vào trang lạ
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",           // giao diện dùng onclick nội tuyến
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  if (auth.isSecureRequest(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  // Không để trình duyệt hay proxy lưu lại dữ liệu riêng tư của học sinh.
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(auth.attachUser);

// Kiểm tra máy chủ còn sống (dịch vụ triển khai dùng để theo dõi).
app.get('/healthz', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), sessions: auth.sessionCount() });
});

// Mọi API (trừ /api/auth/*) đều yêu cầu đăng nhập.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  auth.requireAuth(req, res, next);
});

// Tự động nạp toàn bộ route trong thư mục routes/.
const routesDir = path.join(__dirname, 'routes');
for (const file of fs.readdirSync(routesDir).sort()) {
  if (!file.endsWith('.js')) continue;
  const mod = require(path.join(routesDir, file));
  if (typeof mod === 'function') mod(app);
}

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    // Service worker phải luôn được kiểm tra lại, nếu không người dùng sẽ
    // kẹt mãi ở phiên bản giao diện cũ sau mỗi lần cập nhật.
    if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// SPA fallback: mọi đường dẫn không phải /api trả về index.html.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Không tìm thấy API' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bắt lỗi tập trung cho API.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

// Cảnh báo nếu đưa lên Internet mà vẫn dùng mật khẩu mẫu.
function warnDefaultPasswords() {
  const demo = process.env.DEMO_PASSWORD || '123456';
  const weak = db.get().users.filter(u => password.verify(demo, u.passwordHash));
  if (!weak.length) return;
  console.warn(
    `\n⚠️  CẢNH BÁO BẢO MẬT: ${weak.length} tài khoản vẫn dùng mật khẩu mẫu "${demo}".\n` +
    '   Trước khi cho phụ huynh dùng thật, hãy đăng nhập từng tài khoản và đổi\n' +
    '   mật khẩu trong mục Cài đặt → Đổi mật khẩu.\n'
  );
}

// Nạp (và sinh nếu chưa có) dữ liệu ngay lúc khởi động, để phát hiện sớm khi
// file dữ liệu hỏng thay vì để người dùng đầu tiên gặp lỗi.
db.get();

const server = app.listen(PORT, HOST, () => {
  console.log(`SchoolConnect đang chạy tại http://localhost:${PORT}`);
  console.log(`Thư mục dữ liệu: ${db.DATA_DIR}`);
  if (process.env.NODE_ENV === 'production') warnDefaultPasswords();
});

// Tắt máy chủ êm: ghi nốt dữ liệu đang chờ rồi mới thoát, tránh mất bản ghi
// vừa tạo khi dịch vụ triển khai khởi động lại tiến trình.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nNhận tín hiệu ${signal}, đang lưu dữ liệu trước khi tắt...`);
  db.flush();
  auth.flushSessions();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref(); // không chờ quá lâu
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
