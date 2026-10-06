/* Service worker của My Casa.
 *
 * Nguyên tắc:
 * - Giao diện (HTML/CSS/JS/icon) được lưu sẵn để mở app tức thì và xem được khi mất mạng.
 * - Dữ liệu /api/* KHÔNG BAO GIỜ lưu cache: đây là thông tin riêng của từng bé,
 *   lưu lại sẽ có nguy cơ người dùng sau nhìn thấy dữ liệu của người dùng trước.
 */

const VERSION = 'v128';
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

// Số màn hình phân hệ mang theo tối đa khi đổi phiên bản. Rộng hơn số phân hệ
// đang có nhiều lần, nhưng vẫn có trần: một kho đệm cũ khổng lồ không được làm
// bước kích hoạt treo lại.
const TOI_DA_MAN_MANG_THEO = 40;

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const names = await caches.keys();
    const kho_cu = names.filter(n => n !== SHELL_CACHE);

    // MÀN HÌNH PHÂN HỆ PHẢI SỐNG QUA MỘT LẦN ĐỔI PHIÊN BẢN.
    //
    // `SHELL_ASSETS` không liệt kê được chúng — địa chỉ của chúng là
    // /modules/<mã>/view.js?v=<dấu thời gian sửa tệp>, sinh ra lúc máy chủ
    // chạy. Chúng vào kho đệm bằng lời nhắn 'luu-man-hinh' mà trang gửi xuống
    // SAU khi nạp xong danh sách phân hệ.
    //
    // Nghĩa là nếu chỗ này xoá sạch kho cũ thì có một khe: cô cập nhật app
    // xong đi ra sân sóng yếu, trang chưa kịp nạp lại danh sách phân hệ, và
    // đúng những màn mầm non — Nhật ký ngày, Ghi nhanh, Đón trả bé — là những
    // màn không dựng lên được. Đó là những màn app 2 tồn tại vì chúng.
    //
    // Nên: mang theo phần /modules/ trước, rồi mới xoá kho cũ. KHÔNG mang theo
    // thứ gì khác — mọi tệp còn lại đều có tên trong `SHELL_ASSETS` và vừa được
    // nạp mới ở bước cài đặt; giữ bản cũ của chúng là tự dựng lại đúng cái bẫy
    // "máy đã cài kẹt ở bản cũ" mà hằng VERSION sinh ra để tránh.
    let mang = 0;
    for (const ten of kho_cu) {
      if (mang >= TOI_DA_MAN_MANG_THEO) break;
      try {
        const cu = await caches.open(ten);
        for (const req of await cu.keys()) {
          if (mang >= TOI_DA_MAN_MANG_THEO) break;
          if (!new URL(req.url).pathname.startsWith('/modules/')) continue;
          if (await cache.match(req)) continue;
          const res = await cu.match(req);
          if (!res) continue;
          await cache.put(req, res);
          mang += 1;
        }
      } catch (_) { /* kho cũ hỏng thì bỏ qua, không được chặn bước kích hoạt */ }
    }

    await Promise.all(kho_cu.map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// THÔNG BÁO ĐẨY (Đ137). Máy chủ gửi một gói JSON nhỏ { tieuDe, noiDung, hash }
// qua lib/day.js; ở đây chỉ hiện lên và nhớ chỗ cần mở khi gia đình bấm vào.
// Đây là "đường đẩy thật" mà test/khong-hua-suong.test.mjs đòi phải có trước
// khi màn hình được xin quyền Notification.
self.addEventListener('push', (event) => {
  let goi = {};
  try { goi = event.data ? event.data.json() : {}; }
  catch (_) { goi = { noiDung: event.data ? event.data.text() : '' }; }
  const tieuDe = (goi && goi.tieuDe) || 'My Casa';
  const hash = (goi && typeof goi.hash === 'string' && goi.hash.startsWith('#/')) ? goi.hash : '#/';
  // KHOÁ GỘP — TIN MỚI KHÔNG ĐƯỢC ĂN MẤT TIN CŨ TRÊN MÀN HÌNH CHỜ (Đ194).
  //
  // Trình duyệt coi hai thông báo cùng `tag` là MỘT: cái sau thay chỗ cái
  // trước, cái trước biến mất mà không ai bấm gì.
  //
  // Bản trước lấy thẳng `hash` làm `tag`, với lý do "không xếp chồng năm cái
  // Nhật ký ngày". Ý ấy đúng cho nhật ký của MỘT bé, nhưng nó áp cho tất cả:
  // mọi thông báo nhà trường đều mở cùng một màn nên cùng một `tag`, và
  // trường gửi ba tin trong buổi sáng thì gia đình chỉ còn thấy tin thứ ba.
  // Hai tin đầu mất, im lặng — mà trong app cả ba vẫn nằm đó nên không ai
  // đối chiếu ra.
  //
  // Nay MÁY CHỦ khai khoá gộp (`goi.gop`), và chiều mặc định đảo lại: không
  // khai thì mỗi tin một khoá riêng, tức xếp chồng. Gộp là thứ phải xin.
  // Xếp chồng thì tệ nhất là nhiều chuông hơn mong muốn; gộp nhầm là mất một
  // thông báo của trường.
  //
  // Gói của máy chủ đời cũ (không có `gop`) thì lùi về `hash` y như trước —
  // điện thoại đã cài app không đổi hành vi vào ngày máy chủ chưa kịp lên bản
  // mới.
  const gop = (goi && typeof goi.gop === 'string' && goi.gop) ? goi.gop.slice(0, 80) : hash;
  event.waitUntil(self.registration.showNotification(tieuDe, {
    body: (goi && goi.noiDung) || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { hash },
    tag: gop,
    renotify: true,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hash = (event.notification.data && event.notification.data.hash) || '#/';
  const dich = new URL('/' + hash, self.location.origin).href;
  event.waitUntil((async () => {
    const cuaSo = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cuaSo) {
      if ('focus' in c) {
        try { if ('navigate' in c) await c.navigate(dich); } catch (_) {}
        return c.focus();
      }
    }
    return self.clients.openWindow(dich);
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
        // Chỉ lưu câu trả lời TỐT. Máy chủ đang lỗi 500 mà cũng lưu đè lên
        // /index.html thì từ đó về sau mất mạng là app dựng trang lỗi thay vì
        // vỏ app — và kẹt luôn ở đó tới khi có bản service worker mới.
        if (fresh.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', fresh.clone());
        }
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
