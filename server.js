// SchoolConnect — Sổ liên lạc điện tử kết nối nhà trường và gia đình.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const auth = require('./lib/auth');
const password = require('./lib/password');
const modules = require('./lib/modules');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 để điện thoại cùng Wi-Fi vào được

// Khi chạy sau reverse proxy (Render, Railway, Nginx, Cloudflare) thì tin cậy
// header X-Forwarded-* để biết địa chỉ IP thật và giao thức thật (http/https).
if (process.env.TRUST_PROXY !== '0') app.set('trust proxy', 1);
app.disable('x-powered-by');

// Giới hạn nới rộng để nhận ảnh album (trình duyệt đã nén trước khi gửi).
app.use(express.json({ limit: '12mb' }));

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

// Nạp các phân hệ cắm thêm trong thư mục modules/ (nếu có).
// Một phân hệ lỗi chỉ tự nó không dùng được, phần còn lại vẫn chạy bình thường.
const moRong = modules.napMoRong();
if (moRong.length) {
  console.log(`Phân hệ mở rộng: ${moRong.map(m => m.key).join(', ')}`);
}

// Kiểm tra máy chủ còn sống (dịch vụ triển khai dùng để theo dõi).
app.get('/healthz', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), sessions: auth.sessionCount() });
});

// Mọi API (trừ /api/auth/*) đều yêu cầu đăng nhập.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  auth.requireAuth(req, res, next);
});

// Chặn API của phân hệ đang tắt. Đặt sau lớp kiểm tra đăng nhập và trước khi
// nạp route, để việc tắt một phân hệ chặn được cả đường vào dữ liệu chứ không
// chỉ giấu biểu tượng ngoài giao diện.
app.use(modules.chanApiDaTat);

// Tự động nạp toàn bộ route trong thư mục routes/.
//
// Mỗi tệp nạp trong khối bắt lỗi riêng: một tính năng viết sai chỉ làm chính nó
// ngưng hoạt động, những tính năng còn lại và cả máy chủ vẫn chạy bình thường.
// Đây là điều bảo đảm "thêm hoặc bỏ một tính năng không làm hỏng app".
const routesDir = path.join(__dirname, 'routes');
modules.kiemTraThieuCaiDat(routesDir);

// Nếu chính những tệp nền tảng này hỏng thì không có gì để cứu — dừng hẳn còn
// hơn chạy tiếp với một ứng dụng không đăng nhập được.
const NEN_TANG = ['auth.js', 'dashboard.js', 'admin.js', 'accounts.js', 'modules.js', 'schoolyear.js'];

for (const file of fs.readdirSync(routesDir).sort()) {
  if (!file.endsWith('.js')) continue;
  try {
    const mod = require(path.join(routesDir, file));
    if (typeof mod === 'function') mod(app);
  } catch (err) {
    if (NEN_TANG.includes(file)) throw err;
    const keys = modules.danhDauLoiTheoTep(file, err.message);
    console.error(`\n⚠️  Tính năng trong routes/${file} không nạp được: ${err.message}`);
    console.error(keys.length
      ? `   Đã tạm ẩn phân hệ: ${keys.join(', ')}. Các phần còn lại vẫn chạy bình thường.\n`
      : '   Các phần còn lại vẫn chạy bình thường.\n');
  }
}

// Nạp đường dẫn API của các phân hệ mở rộng.
modules.napApiMoRong(app);

// Phục vụ tệp giao diện của phân hệ mở rộng: /modules/<thư mục>/view.js
app.use('/modules', express.static(modules.MODULES_DIR, {
  index: false,
  setHeaders(res, filePath) {
    if (!filePath.endsWith('view.js')) res.status(404);
  },
}));

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

// Cảnh báo khi dữ liệu thật đang nằm ngay trong thư mục mã nguồn.
//
// Trường hợp nguy hiểm: triển khai bằng `git pull` ngay trên máy chủ. Khi đó
// `data/school.db` nằm trong thư mục làm việc của git, và một lần `git add -A`
// theo thói quen là đẩy hồ sơ học sinh lên kho công khai. `.gitignore` đã chặn,
// nhưng chặn được thì cũng bỏ qua được bằng `git add -f`, nên vẫn phải nhắc.
function warnDataInsideRepo() {
  const trongKhoMa = !path.relative(__dirname, db.DATA_DIR).startsWith('..');
  if (!trongKhoMa || !fs.existsSync(path.join(__dirname, '.git'))) return;
  console.warn(
    '\n⚠️  Dữ liệu của trường đang nằm TRONG thư mục mã nguồn:\n' +
    `   ${db.DATA_DIR}\n\n` +
    '   Nếu máy chủ này cập nhật bằng `git pull`, hồ sơ học sinh có nguy cơ bị\n' +
    '   đẩy nhầm lên GitHub. Nên chuyển dữ liệu ra ngoài:\n\n' +
    '     DATA_DIR=/var/lib/schoolconnect npm start\n\n' +
    '   Nhớ chuyển cả tệp cũ sang thư mục mới trước khi khởi động lại.\n'
  );
}

// Cảnh báo nếu đưa lên Internet mà vẫn dùng mật khẩu mẫu.
function warnDefaultPasswords() {
  const demo = process.env.DEMO_PASSWORD || '123456';
  const weak = db.all('users', 'SELECT id, passwordHash FROM users')
    .filter(u => password.verify(demo, u.passwordHash));
  if (!weak.length) return;
  console.warn(
    `\n⚠️  CẢNH BÁO BẢO MẬT: ${weak.length} tài khoản vẫn dùng mật khẩu mẫu "${demo}".\n` +
    '   Trước khi cho phụ huynh dùng thật, hãy đăng nhập từng tài khoản và đổi\n' +
    '   mật khẩu trong mục Cài đặt → Đổi mật khẩu.\n'
  );
}

// Cơ sở dữ liệu trống (lần chạy đầu) thì sinh dữ liệu mẫu để có cái xem ngay.
//
// KHÔNG làm việc này khi chạy thật. Dữ liệu mẫu kèm 8 tài khoản dùng chung mật
// khẩu "123456" — sinh ra chúng trên một máy chủ đang mở ra Internet là tự mở
// cửa cho người lạ. Ở chế độ production, cơ sở dữ liệu trống nghĩa là người
// triển khai chưa nhập danh sách thật hoặc đang trỏ nhầm DATA_DIR: báo rõ rồi
// dừng, để họ biết mà sửa, còn hơn lặng lẽ dựng một trường học giả.
if (db.isEmpty()) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '\n⛔ Cơ sở dữ liệu đang TRỐNG trong khi máy chủ chạy ở chế độ thật.\n' +
      `   Thư mục dữ liệu: ${db.DATA_DIR}\n\n` +
      '   Máy chủ KHÔNG tự sinh dữ liệu mẫu ở chế độ này, vì dữ liệu mẫu kèm\n' +
      '   các tài khoản dùng mật khẩu "123456".\n\n' +
      '   Nếu đây là lần cài đầu, hãy tạo tài khoản quản trị rồi nhập danh sách thật:\n' +
      `     DATA_DIR=${db.DATA_DIR} npm run create-admin "Họ tên" tendangnhap\n\n` +
      '   Nếu trường đã có dữ liệu, nhiều khả năng DATA_DIR đang trỏ nhầm thư mục.\n'
    );
    db.close();
    process.exit(1);
  }
  console.log('Cơ sở dữ liệu trống — đang sinh dữ liệu mẫu...');
  require('./data/seed').generate();
}

const server = app.listen(PORT, HOST, () => {
  console.log(`SchoolConnect đang chạy tại http://localhost:${PORT}`);
  console.log(`Cơ sở dữ liệu: ${db.DB_FILE}`);
  if (process.env.NODE_ENV === 'production') {
    warnDefaultPasswords();
    warnDataInsideRepo();
  }
});

// Tắt máy chủ êm: ghi nốt dữ liệu đang chờ rồi mới thoát, tránh mất bản ghi
// vừa tạo khi dịch vụ triển khai khởi động lại tiến trình.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nNhận tín hiệu ${signal}, đang đóng cơ sở dữ liệu...`);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref(); // không chờ quá lâu
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Lưới an toàn cuối cho lỗi bất đồng bộ.
//
// Cô lập lỗi ở tầng nạp phân hệ và tầng xử lý yêu cầu KHÔNG đỡ được lỗi ném ra
// trong setTimeout hay trong promise bị bỏ quên — mặc định Node sập cả tiến
// trình, nghĩa là một dòng viết ẩu trong MỘT phân hệ cắm thêm tắt app của CẢ
// TRƯỜNG. Hai loại lỗi được đối xử khác nhau, có chủ ý:
//
// - Promise bị từ chối mà không ai bắt: ghi log rồi CHẠY TIẾP. Đó chỉ là một
//   giá trị lỗi bị bỏ quên (thiếu .catch hoặc await); mọi thao tác ghi vào
//   SQLite đều đồng bộ nên không có giao dịch nào đang dở dang. Sập cả trường
//   vì một dấu .catch thiếu trong phân hệ Học phí thì trái nguyên tắc số 1.
//
// - Lỗi ném đồng bộ mà không ai bắt: trạng thái trong bộ nhớ có thể đang dở
//   dang, chạy tiếp có nguy cơ ghi dữ liệu sai — tệ hơn là dừng. Ghi log thật
//   rõ, đóng cơ sở dữ liệu rồi thoát mã 1 để trình giám sát (NSSM, systemd,
//   Docker) khởi động lại. Xem README mục "Tự khởi động lại khi gặp sự cố".
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  console.error('\n⚠️  Một promise bị từ chối mà không nơi nào bắt — thường do thiếu .catch hoặc await trong một phân hệ:');
  console.error(reason);
  console.error('   Ứng dụng vẫn chạy tiếp bình thường. Hãy tìm và sửa phân hệ gây ra lỗi này.\n');
});

process.on('uncaughtException', (err) => {
  console.error('\n✗ Lỗi không nơi nào bắt được — phải dừng để tránh ghi dữ liệu sai:');
  console.error(err);
  console.error('  Trình giám sát (NSSM / systemd / Docker) sẽ tự khởi động lại ứng dụng.');
  console.error('  Nếu lỗi lặp lại, xem tên tệp trong dòng "at ..." phía trên để biết phân hệ nào gây ra.\n');
  try { db.close(); } catch { /* đóng không được cũng không mất gì: WAL giữ nguyên dữ liệu đã ghi */ }
  process.exit(1);
});

module.exports = app;
