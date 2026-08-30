// CASA Mầm non — Sổ liên lạc điện tử kết nối trường mầm non và gia đình.
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
//
// Đường này BẮT BUỘC phải mở cho người chưa đăng nhập: `render.yaml` dùng nó
// làm `healthCheckPath` và `Dockerfile` dùng làm HEALTHCHECK. Nhưng bộ theo dõi
// chỉ cần mã 200 — nó không đọc phần thân.
//
// Bản trước trả luôn `uptime` và `sessions` cho bất kỳ ai hỏi. Khi app ra
// Internet, người ngoài dò được máy chủ vừa khởi động lại lúc nào, và số phiên
// còn hạn nhích lên nhích xuống theo từng lần cô hay phụ huynh đăng nhập. Không
// phải lỗ hổng quyền — không có dữ liệu của bé nào ở đây — nhưng là thông tin
// vận hành của trường, và nó rơi ra miễn phí cho mọi lượt quét cổng.
//
// `auth.attachUser` chạy trước chỗ này nên `req.user` đã có sẵn.
app.get('/healthz', (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.json({ ok: true });
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

// Chặn API nằm ngoài phần việc của một CHỨC VỤ (Cấp 2, và Cấp 3 tách đôi).
//
// Đặt ngay sau lớp trên và vẫn TRƯỚC khi nạp route, nên không đường dẫn nào
// đi vòng qua được — kể cả đường thêm sau này. Tài khoản chưa khai chức vụ thì
// lớp này chỉ là một lần next(), tức trường đang chạy không đổi gì.
app.use(modules.chanApiNgoaiChucVu);

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
//
// CHẶN TRƯỚC KHI MỞ TỆP, KHÔNG ĐÁNH DẤU 404 LÚC ĐÃ MUỘN.
//
// Bản trước đặt `res.status(404)` trong `setHeaders` của `express.static`.
// Nhưng `setHeaders` chạy TRƯỚC khi luồng tệp được mở (send gọi `setHeader()`
// rồi mới `stream()`), nên nó chỉ đổi con số ở dòng đầu — THÂN TỆP VẪN ĐƯỢC GỬI
// ĐI ĐỦ. Nghĩa là `routes.js`, `schema.sql` và `module.json` của mọi phân hệ
// tải về được nguyên vẹn, kể cả khi chưa đăng nhập; chỉ khác là kèm mã 404 nên
// không ai để ý.
//
// `schema.sql` lộ toàn bộ tên bảng và tên cột; `routes.js` lộ đúng chỗ nào canh
// quyền và canh bằng gì. Đây là bản đồ cho người muốn tìm lỗ tiếp theo.
app.use('/modules', (req, res, next) => {
  if (!req.path.endsWith('/view.js')) {
    return res.status(404).type('text/plain; charset=utf-8').send('Không tìm thấy tệp.');
  }
  return next();
});
app.use('/modules', express.static(modules.MODULES_DIR, { index: false }));

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
  // TỆP GỬI LÊN QUÁ NẶNG KHÔNG PHẢI "LỖI MÁY CHỦ".
  //
  // `express.json` chặn thân yêu cầu quá 12 MB và ném `PayloadTooLargeError`
  // TRƯỚC khi bất cứ đường dẫn nào của app chạy. Rơi vào nhánh chung bên dưới
  // thì cô nhận đúng bốn chữ "Lỗi máy chủ" — không cho biết vì sao, không cho
  // biết phải làm gì, và làm người ta tưởng app hỏng chứ không phải tệp nặng.
  //
  // Gặp lần đầu khi thêm video vào album: một đoạn quay dài rơi thẳng vào đây.
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Tệp gửi lên nặng quá — cô chọn ảnh nhỏ hơn, '
        + 'hoặc quay video ngắn lại (khoảng 10–20 giây) rồi gửi lại nhé',
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

// Dữ liệu của trường nằm TRONG thư mục mã nguồn: nhắc khi chạy thử, CHẶN khi
// chạy thật.
//
// Trường hợp nguy hiểm: triển khai bằng `git pull` ngay trên máy chủ. Khi đó
// `data/school.db` nằm trong thư mục làm việc của git, và một lần `git add -A`
// theo thói quen là đẩy hồ sơ trẻ lên kho công khai. `.gitignore` đã chặn, nhưng
// chặn được thì cũng bỏ qua được bằng `git add -f`.
//
// VÌ SAO ĐỔI TỪ NHẮC SANG CHẶN (app 2)
//
// Bản cũ chỉ `console.warn`, và in RA SAU khi máy chủ đã mở cổng — tức đã bắt đầu
// phục vụ dữ liệu trẻ rồi mới nhắc, vào một dòng log không ai đọc. Ở app 1 đó là
// hồ sơ học sinh tiểu học; ở đây là **ảnh khuôn mặt trẻ 12 tháng – 6 tuổi và hồ sơ sức
// khỏe** — nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP. Lộ rồi thì viết lại lịch
// sử git cũng không thu lại được.
//
// Không có đường thoát bằng biến môi trường, cùng lý do với
// `scripts/kiem-tra-du-lieu.js`: một đường thoát có sẵn là một đường thoát sẽ
// được dùng vào lúc 11 giờ đêm. Cách sửa chỉ là đặt đúng một biến, và câu báo
// lỗi nói thẳng ra đó là biến nào.
//
// Hai đường triển khai sẵn có KHÔNG bị ảnh hưởng: `Dockerfile` và `render.yaml`
// đều đã đặt `DATA_DIR=/data`, nằm ngoài thư mục mã nguồn.
function kiemTraViTriDuLieu() {
  const trongKhoMa = !path.relative(__dirname, db.DATA_DIR).startsWith('..');
  if (!trongKhoMa) return;

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '\n⛔ Dữ liệu của trường đang nằm TRONG thư mục mã nguồn, mà máy chủ chạy ở\n' +
      '   chế độ thật. Máy chủ dừng lại để không phục vụ dữ liệu trẻ từ chỗ này.\n\n' +
      `   Thư mục dữ liệu: ${db.DATA_DIR}\n` +
      `   Thư mục mã nguồn: ${__dirname}\n\n` +
      '   Ở đây có ảnh khuôn mặt trẻ và hồ sơ sức khỏe. Nếu máy chủ này cập nhật\n' +
      '   bằng `git pull`, một lần `git add -A` theo thói quen là đẩy tất cả lên\n' +
      '   GitHub — lộ rồi thì không thu lại được.\n\n' +
      '   Cách sửa: trỏ dữ liệu ra ngoài thư mục mã nguồn.\n\n' +
      '     DATA_DIR=/var/lib/casa-mamnon npm start\n\n' +
      '   Nhớ CHUYỂN cả tệp cũ sang thư mục mới trước khi khởi động lại. Chuyển\n' +
      '   ĐÍCH DANH từng thứ — đừng dùng `mv .../data/*`, vì trong thư mục đó còn\n' +
      '   `data/seed.js`, là mã nguồn chứ không phải dữ liệu:\n\n' +
      '     mkdir -p /var/lib/casa-mamnon\n' +
      `     mv ${db.DATA_DIR}/school.db* /var/lib/casa-mamnon/\n` +
      `     mv ${db.DATA_DIR}/uploads ${db.DATA_DIR}/backups /var/lib/casa-mamnon/\n` +
      '   (thứ nào không có thì bỏ khỏi lệnh)\n'
    );
    db.close();
    process.exit(1);
  }

  if (!fs.existsSync(path.join(__dirname, '.git'))) return;
  console.warn(
    '\n⚠️  Dữ liệu đang nằm TRONG thư mục mã nguồn:\n' +
    `   ${db.DATA_DIR}\n\n` +
    '   Chạy thử thì không sao. Nhưng đặt NODE_ENV=production với thư mục này thì\n' +
    '   máy chủ sẽ DỪNG — hãy trỏ ra ngoài trước khi triển khai thật:\n\n' +
    '     DATA_DIR=/var/lib/casa-mamnon npm start\n'
  );
}

// Gọi TRƯỚC khi mở cổng. Nhắc sau khi đã phục vụ được vài lượt là nhắc muộn.
kiemTraViTriDuLieu();

// Cảnh báo nếu đưa lên Internet mà vẫn dùng mật khẩu mẫu.
function warnDefaultPasswords() {
  // SOÁT CẢ HAI MẬT KHẨU MẪU, KHÔNG CHỈ CÁI ĐANG CẤU HÌNH.
  //
  // render.yaml đặt DEMO_PASSWORD bằng một chuỗi Render tự sinh. Nếu chỉ soát
  // đúng chuỗi đó thì mọi tài khoản còn giữ "123456" — bản khôi phục từ sao lưu
  // cũ, tài khoản tạo trước khi có biến môi trường này — đều lọt, và bộ canh
  // báo xanh trong khi cửa vẫn mở. Soát cả hai thì không sót đường nào.
  const mauCu = '123456';
  const demo = process.env.DEMO_PASSWORD || mauCu;
  const dsMau = [...new Set([demo, mauCu])];
  const weak = db.all('users', 'SELECT id, passwordHash FROM users')
    .filter(u => dsMau.some(m => password.verify(m, u.passwordHash)));
  if (!weak.length) return;
  console.warn(
    `\n⚠️  CẢNH BÁO BẢO MẬT: ${weak.length} tài khoản vẫn dùng mật khẩu mẫu "${demo}".\n` +
    '   Trước khi cho phụ huynh dùng thật, hãy đăng nhập từng tài khoản và đổi\n' +
    '   mật khẩu trong mục Cài đặt → Đổi mật khẩu.\n'
  );
}

// Cơ sở dữ liệu trống (lần chạy đầu) thì sinh dữ liệu mẫu để có cái xem ngay.
//
// KHÔNG làm việc này khi chạy thật. Dữ liệu mẫu kèm 13 tài khoản dùng chung mật
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
  console.log(`CASA Mầm non đang chạy tại http://localhost:${PORT}`);
  console.log(`Cơ sở dữ liệu: ${db.DB_FILE}`);
  if (process.env.NODE_ENV === 'production') {
    warnDefaultPasswords();
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
