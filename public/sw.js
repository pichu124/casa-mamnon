/* Service worker của CASA Mầm non.
 *
 * Nguyên tắc:
 * - Giao diện (HTML/CSS/JS/icon) được lưu sẵn để mở app tức thì và xem được khi mất mạng.
 * - Dữ liệu /api/* KHÔNG BAO GIỜ lưu cache: đây là thông tin riêng của từng bé,
 *   lưu lại sẽ có nguy cơ người dùng sau nhìn thấy dữ liệu của người dùng trước.
 */

const VERSION = 'v53';
// Đổi tên kho đệm theo app 2. Không sợ bỏ lại kho cũ: móc 'activate' bên dưới
// xóa MỌI kho không phải kho hiện hành, không lọc theo tiền tố tên.
const SHELL_CACHE = `casa-mamnon-shell-${VERSION}`;

// Vỏ ứng dụng: nạp sẵn ngay khi cài đặt.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/api.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/views/login.js',
  '/js/views/dashboard.js',
  '/js/views/student.js',
  '/js/views/attendance.js',
  '/js/views/leave.js',
  '/js/views/menu.js',
  '/js/views/timetable.js',
  '/js/views/remarks.js',
  '/js/views/reports.js',
  '/js/views/bus.js',
  '/js/views/conduct.js',
  '/js/views/surveys.js',
  '/js/views/health.js',
  '/js/views/medicine.js',
  '/js/views/albums.js',
  '/js/views/plans.js',
  '/js/views/hocsinhcu.js',
  '/js/views/namhoccu.js',
  '/js/views/notifications.js',
  '/js/views/messages.js',
  '/js/views/settings.js',
  '/js/views/setpassword.js',
  '/js/views/accounts.js',
  '/js/views/admin.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll thất bại toàn bộ nếu một file lỗi — nạp từng file để bền hơn.
    await Promise.all(SHELL_ASSETS.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== SHELL_CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Cho phép trang yêu cầu cập nhật ngay khi có phiên bản mới.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') { self.skipWaiting(); return; }

  // MÀN HÌNH CỦA PHÂN HỆ CẮM THÊM KHÔNG NẰM TRONG DANH SÁCH NẠP SẴN ĐƯỢC.
  //
  // Đường dẫn của chúng là /modules/<mã>/view.js?v=<dấu thời gian sửa tệp> —
  // sinh ra lúc máy chủ chạy, nên lúc cài service worker không thể biết trước.
  // Trang tự báo xuống sau mỗi lần nạp danh sách phân hệ. Nhờ vậy lần sau mất
  // mạng thì màn hình của phân hệ vẫn dựng lên được, và quan trọng hơn: tệp
  // view.js của Ghi nhanh vừa nạp là bộ nghe 'online' của nó gắn vào, nên sóng
  // về là bài ghi trong hàng đợi tự bay đi.
  const d = event.data;
  if (d && d.type === 'luu-man-hinh' && Array.isArray(d.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(d.urls
        .filter(u => typeof u === 'string' && u.startsWith('/modules/'))
        .slice(0, 40)
        .map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // phông chữ, tài nguyên ngoài: để trình duyệt tự lo

  // Dữ liệu riêng tư: luôn lấy từ máy chủ, không lưu lại.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ error: 'Không có kết nối mạng. Vui lòng kiểm tra lại đường truyền.' }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            // Đầu đề này nói rõ: câu trả lời 503 là do CHÍNH MÁY NÀY dựng ra vì
            // không gọi được máy chủ, không phải máy chủ trường đang quá tải.
            // Trang đọc nó để phân biệt mất mạng với hết phiên đăng nhập.
            'X-CASA-Mat-Mang': '1',
          },
        }
      ))
    );
    return;
  }

  // Điều hướng trang (mở app, tải lại): ưu tiên mạng, mất mạng thì dùng vỏ đã lưu.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Tài nguyên tĩnh: trả bản đã lưu ngay lập tức, đồng thời cập nhật ngầm cho lần sau.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok) caches.open(SHELL_CACHE).then(c => c.put(req, res.clone()));
      return res;
    // Mất mạng mà không có bản đúng địa chỉ thì thử lại bỏ qua phần sau dấu ?.
    // Màn hình phân hệ mang đuôi ?v=<dấu thời gian sửa tệp>: máy chủ ra bản
    // mới là địa chỉ đổi, và bản cũ trong máy tuy hơi cũ vẫn hơn hẳn màn trắng.
    }).catch(() => cached || caches.match(req, { ignoreSearch: true }));
    return cached || network;
  })());
});
