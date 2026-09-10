// Lõi SPA: trạng thái, định tuyến theo hash, thanh điều hướng dưới, huy hiệu.
window.App = {
  state: {
    user: null,          // người dùng hiện tại
    students: [],        // bé được phép xem (con của mình / nhóm cô phụ trách)
    classes: [],
    school: null,
    currentStudentId: null,
    badges: {},          // { diemdanh: 2, thongbao: 1, nhantin: 3, ... }
    year: null,
    modules: [],         // các phân hệ đang bật, do máy chủ quyết định
  },
  views: {},             // các view tự đăng ký: App.views.tenview = { render(root, params) }
  _badgeTimer: null,

  async init() {
    this.registerServiceWorker();
    this.watchInstallPrompt();
    try {
      const me = await API.get('/api/auth/me');
      this.applyMe(me);
      await this.loadModules();
      this.route();
      this.startBadgePolling();
      this.moiCaiVaoManHinhChinh();
    } catch (err) {
      // MẤT MẠNG KHÔNG PHẢI LÀ HẾT PHIÊN ĐĂNG NHẬP.
      //
      // Trước đây mọi lỗi ở đây đều đưa về màn đăng nhập. Nhưng màn đăng nhập
      // cũng phải gọi máy chủ, nên cô đứng ở sân trường sóng yếu mở app ra là
      // gặp một màn hình không làm được gì — kể cả Ghi nhanh, thứ cả GĐ 0 dựng
      // lên để hứa "mất mạng vẫn ghi được".
      if (API.laMatMang && API.laMatMang(err)) this.showOffline();
      else this.showLogin();
    }
    window.addEventListener('hashchange', () => this.route());
  },

  // Đăng ký service worker để app mở nhanh và xem được khi mất mạng.
  // Chỉ hoạt động qua HTTPS hoặc localhost — dùng qua IP mạng LAN sẽ bị bỏ qua.
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* không hỗ trợ hoặc không chạy qua HTTPS — app vẫn dùng bình thường */
      });
      this.ngheBanMoi();
    });
  },

  // CÓ BẢN MỚI THÌ PHẢI NÓI, NHƯNG TUYỆT ĐỐI KHÔNG TỰ TẢI LẠI.
  //
  // Cả bộ máy VERSION (Đ29, Đ40, Đ43) chỉ lo một việc: bản mới TỚI ĐƯỢC máy của
  // cô. Nhưng service worker mới nhận quyền xong thì TRANG ĐANG MỞ vẫn chạy mã
  // cũ nằm trong bộ nhớ — cô đọc tài liệu thấy có nút mới, mở máy ra không thấy,
  // và không ai hiểu vì sao. Đây là nửa sau của cùng một vấn đề.
  //
  // VÌ SAO KHÔNG `location.reload()` NGAY:
  //
  // Cô có thể đang gõ dở nhật ký của hai mươi bé. Tải lại là mất sạch phần chưa
  // bấm Lưu — đúng thứ Đ28 dựng cả cơ chế giữ nháp để tránh. Một dải nhắc tốn
  // của cô một cú bấm; tự tải lại tốn của cô cả buổi làm.
  //
  // `controllerchange` bắn khi service worker MỚI đã nhận quyền điều khiển
  // trang. Từ giây đó, mọi tệp trang xin về đều là bản mới, còn mã đang chạy
  // thì vẫn là bản cũ — nên đây đúng là lúc phải nói.
  ngheBanMoi() {
    try {
      const sw = navigator.serviceWorker;
      if (!sw || this._daNgheBanMoi) return;
      this._daNgheBanMoi = true;
      sw.addEventListener('controllerchange', () => {
        // Lần đầu cài app cũng bắn sự kiện này, mà lúc đó KHÔNG có bản cũ nào
        // để thay — nhắc là nhắc sai. Chỉ nhắc khi trang đã có người điều khiển
        // từ trước, tức thật sự là một lần ĐỔI bản.
        if (!this._daCoNguoiDieuKhien) return;
        this.baoCoBanMoi();
      });
      this._daCoNguoiDieuKhien = !!sw.controller;
    } catch (_) { /* trình duyệt cũ thì thôi, app vẫn chạy */ }
  },

  baoCoBanMoi() {
    if (document.getElementById('ban-moi-banner')) return;
    const b = document.createElement('div');
    b.className = 'push-banner';
    b.id = 'ban-moi-banner';
    b.innerHTML = `
      <span class="pb-logo">🔄</span>
      <div class="pb-text"><b>Đã có bản mới</b><span>Bấm để dùng bản mới. Phần đang gõ dở nên lưu trước.</span></div>
      <button class="pb-bell" id="bm-tai-lai">${UI.icon('check', 20)}</button>
      <button class="pb-close" id="bm-de-sau">${UI.icon('x', 18)}</button>`;
    document.body.appendChild(b);
    document.getElementById('bm-tai-lai').onclick = () => location.reload();
    // "Để sau" chỉ tắt dải nhắc của lần này, KHÔNG ghi nhớ vào máy: lần mở app
    // sau cô vẫn đang ở bản cũ, nên vẫn đáng được nhắc lại.
    document.getElementById('bm-de-sau').onclick = () => b.remove();
  },

  // Ghi lại lời mời cài đặt của Chrome/Edge để hiện nút "Cài đặt ứng dụng" trong Cài đặt.
  watchInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      document.querySelectorAll('[data-install-app]').forEach(el => { el.style.display = ''; });
    });
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      UI.toast('Đã cài CASA Mầm non vào màn hình chính', 'success');
    });
  },

  // Có thể cài đặt khi trình duyệt đã gửi lời mời và app chưa chạy ở chế độ toàn màn hình.
  canInstall() {
    return !!this.installPrompt && !window.matchMedia('(display-mode: standalone)').matches;
  },

  async promptInstall() {
    if (!this.installPrompt) {
      UI.toast('Hãy dùng menu trình duyệt: "Thêm vào màn hình chính"');
      return;
    }
    this.installPrompt.prompt();
    const { outcome } = await this.installPrompt.userChoice;
    if (outcome !== 'accepted') UI.toast('Bạn có thể cài lại bất cứ lúc nào trong Cài đặt');
    this.installPrompt = null;
  },

  applyMe(me) {
    this.state.user = me.user;
    this.state.students = me.students || [];
    this.state.classes = me.classes || [];
    this.state.school = me.school;
    this.state.year = me.school ? me.school.currentYear : null;
    // VAI ĐANG ĐĂNG NHẬP GẮN LÊN <body> (Đ124). CSS dựa vào đó để co giao diện
    // cho cô và văn phòng — dữ liệu dày hơn, ô và chữ nhỏ hơn — mà không đụng
    // màn của gia đình. THÊM MỚI, không đổi trạng thái nào đang có.
    try { document.body.dataset.vai = (me.user && me.user.role) || ''; } catch (_) { /* không có DOM */ }
    if (!this.state.currentStudentId && this.state.students.length) {
      this.state.currentStudentId = this.state.students[0].id;
    }
    document.getElementById('bottom-nav').style.display = '';
  },

  currentStudent() {
    return this.state.students.find(s => s.id === this.state.currentStudentId) || this.state.students[0] || null;
  },

  // NHỮNG NHÓM NGƯỜI ĐANG ĐĂNG NHẬP ĐƯỢC PHÉP MỞ.
  //
  // `state.classes` là danh sách nhóm của CẢ TRƯỜNG — nó có mặt để văn phòng
  // dựng ô chọn. Cô thì chỉ mở được nhóm mình phụ trách; máy chủ trả 403 cho
  // nhóm khác, hoàn toàn đúng. Nhưng bốn màn đang tự lọc lấy, mỗi màn một
  // kiểu, và ba trong bốn màn đó QUÊN lọc phần ô chọn:
  //
  //   - mở màn ra thì đúng nhóm của cô (vì mặc định lấy `classIds[0]`),
  //   - nhưng ô "Nhóm" vẫn liệt kê cả bốn nhóm của trường, và cô bấm vào một
  //     nhóm không phải của mình là rơi thẳng vào màn "Có lỗi xảy ra".
  //
  // Đo trên bàn thử ngày 31/08: Nhật ký ngày và Đón trả bé đều như vậy với cô
  // nhóm Nhà trẻ 1. Một danh sách chọn mà có lựa chọn nào bấm vào cũng hỏng
  // thì đó là lỗi của màn hình, không phải của cô.
  //
  // Hàm này là MỘT chỗ trả lời câu đó. THÊM MỚI, không đổi và không bỏ thứ gì
  // đang có: `state.classes` vẫn nguyên vẹn cho mọi chỗ đang dùng.
  //
  // Văn phòng (không có `classIds`) nhận lại đủ danh sách như trước.
  nhomCuaCo() {
    const cua = (this.state.user && this.state.user.classIds) || [];
    const tatCa = this.state.classes || [];
    return cua.length ? tatCa.filter(c => cua.includes(c.id)) : tatCa;
  },

  setStudent(id) {
    this.state.currentStudentId = id;
    this.route(); // vẽ lại view hiện tại theo bé vừa chọn
  },

  // Nạp danh sách phân hệ đang bật. Phân hệ cắm thêm có tệp giao diện riêng nên
  // phải tải về trước khi định tuyến, nếu không màn hình của nó sẽ trống.
  async loadModules() {
    try {
      this.state.modules = await API.get('/api/modules');
    } catch (_) {
      this.state.modules = [];
      return;
    }
    await Promise.all(
      this.state.modules
        .filter(m => m.viewUrl && !this.views[m.view])
        .map(m => this.loadScript(m.viewUrl).catch(() => {
          console.warn(`Không tải được giao diện phân hệ "${m.key}"`);
        }))
    );
    this.nhoManHinhPhanHe();
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(src));
      document.body.appendChild(el);
    });
  },

  // Phân hệ này có đang bật với người dùng hiện tại không.
  moduleEnabled(viewName) {
    return this.state.modules.some(m => m.view === viewName);
  },

  // MÀN "KHÔNG MỞ ĐƯỢC" PHẢI NÓI ĐÚNG LÝ DO.
  //
  // `state.modules` là danh sách máy chủ đã lọc qua BỐN tầng khác hẳn nhau:
  // nhà trường tắt, ngoài vai trò, ngoài phần việc của chức vụ, và phân hệ
  // đang lỗi. Trình duyệt chỉ thấy "không có trong danh sách", nên câu cũ
  // đoán đúng một lý do — *"phân hệ này hiện đang được nhà trường tắt"*.
  //
  // Nó đoán sai đúng vào trường hợp hay gặp nhất: gia đình mở một địa chỉ chỉ
  // dành cho trường. Nhà trường không tắt gì cả; còn phụ huynh đọc câu đó rồi
  // gọi lên văn phòng hỏi vì sao trường tắt mất phần của mình, và văn phòng
  // không hiểu họ đang nói về cái gì.
  //
  // VẼ CÂU TRUNG TÍNH TRƯỚC, RỒI MỚI HỎI MÁY CHỦ. Mất mạng thì màn hình vẫn
  // đúng, chỉ ít chi tiết hơn — không bao giờ trắng, và không bao giờ nói sai.
  async baoKhongMoDuoc(root, name) {
    const ve = (loi) => { root.innerHTML = UI.pageHeader('Không mở được') + UI.emptyState('🔒', loi); };
    ve('Phần này không mở trong tài khoản của bạn.');

    let r = null;
    try { r = await API.get(`/api/modules/vi-sao/${encodeURIComponent(name)}`); } catch (_) { return; }
    if (!r || !r.ly) return;
    // Cô có thể đã bấm đi màn khác trong lúc chờ mạng — đừng vẽ đè lên đó.
    if ((location.hash.replace(/^#\/?/, '') || '').split('/')[0] !== name) return;
    ve(this.loiKhongMoDuoc(r));
  },

  loiKhongMoDuoc(r) {
    const ten = r.ten ? `“${r.ten}”` : 'này';
    if (r.ly === 'tat') return `Nhà trường hiện đang tắt phần ${ten}.`;
    if (r.ly === 'su-co') return `Phần ${ten} đang gặp sự cố. Các phần khác vẫn dùng bình thường.`;
    if (r.ly === 'ngoai-vai') {
      if (r.danhCho === 'gia-dinh') return `Phần ${ten} chỉ dành cho gia đình các bé.`;
      // Đ140: phần của gia đình và văn phòng (Học phí) — cô mở thì nói đúng chiều.
      if (r.danhCho === 'gia-dinh-va-van-phong') return `Phần ${ten} dành cho gia đình các bé và văn phòng nhà trường.`;
      return `Phần ${ten} chỉ dành cho cô và văn phòng nhà trường.`;
    }
    if (r.ly === 'ngoai-chuc-vu') return `Phần ${ten} nằm ngoài phần việc của tài khoản này.`;
    if (r.ly === 'khong-co') return 'Không có phần nào ở địa chỉ này. Bấm Trang chủ để quay lại.';
    return 'Phần này không mở trong tài khoản của bạn.';
  },

  // Hết phiên: về màn đăng nhập ĐÚNG MỘT LẦN. Một màn hình thường phát vài
  // lời gọi song song, cùng dính 401 cả loạt — vẽ lại màn đăng nhập cho từng
  // lời là xoá mất chữ cô vừa gõ vào ô tài khoản. Đặt user = null trước để
  // route() đang chạy dở biết đường dừng, không vẽ đè lên màn đăng nhập.
  onUnauthorized() {
    if (!this.state.user) return;
    this.state.user = null;
    this.showLogin();
  },

  // MÀN HÌNH KHI MÁY KHÔNG CÓ MẠNG.
  //
  // Cố ý KHÔNG hiện màn đăng nhập: app không hề biết phiên của cô còn hay hết,
  // và bảo cô đăng nhập lại lúc không có mạng là bảo cô làm một việc không thể
  // làm được. Nói đúng chuyện đang xảy ra, rồi tự mở lại khi có sóng.
  showOffline() {
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = 'none';
    this.stopBadgePolling();

    // Nạp màn hình phân hệ từ bản đã lưu trong máy. Đây chính là chỗ hàng đợi
    // Ghi nhanh được đánh thức: tệp view.js của nó vừa nạp xong là bộ nghe
    // 'online' gắn vào, nên sóng về là bài ghi tự bay đi, dù cô chưa mở màn nào.
    this.loadOfflineModuleViews();

    const root = document.getElementById('view');
    if (root) {
      root.innerHTML = `
        <div class="card center" style="margin-top:36px">
          <div style="font-size:44px;line-height:1.2">📵</div>
          <h2 style="margin:8px 0 6px;font-size:19px">Máy đang không có mạng</h2>
          <p class="muted" style="line-height:1.7;margin:0 0 14px">
            App chưa gọi được về trường. Có sóng trở lại là màn hình tự mở ra,
            và những gì cô đã ghi lúc mất mạng sẽ tự gửi đi, không mất.
          </p>
          <button class="btn primary block" id="off-thu-lai">Thử lại</button>
        </div>`;
      const nut = document.getElementById('off-thu-lai');
      if (nut) nut.onclick = () => location.reload();
    }

    if (!this._dangChoSong) {
      this._dangChoSong = true;
      window.addEventListener('online', () => location.reload());
    }
  },

  // Địa chỉ tệp giao diện của các phân hệ đã bật, ghi lại lần nạp gần nhất.
  //
  // CHỈ ĐỊA CHỈ TỆP .js — không một chữ nào về bé, về cô, về trường. Điện thoại
  // của cô có thể là máy dùng chung ở lớp, nên thứ duy nhất được phép nằm lại
  // trong máy là mấy đường dẫn tĩnh này.
  KHOA_MAN_HINH_PHAN_HE: 'casa.man-hinh-phan-he',

  nhoManHinhPhanHe() {
    const urls = (this.state.modules || []).map(m => m.viewUrl).filter(Boolean);
    try { localStorage.setItem(this.KHOA_MAN_HINH_PHAN_HE, JSON.stringify(urls)); } catch (_) {}
    // Nhờ service worker giữ sẵn mấy tệp đó, để lần sau mất mạng còn dựng được.
    try {
      const sw = navigator.serviceWorker;
      if (sw && sw.controller) sw.controller.postMessage({ type: 'luu-man-hinh', urls });
    } catch (_) {}
  },

  loadOfflineModuleViews() {
    let urls = [];
    try { urls = JSON.parse(localStorage.getItem(this.KHOA_MAN_HINH_PHAN_HE) || '[]'); } catch (_) {}
    if (!Array.isArray(urls)) return Promise.resolve([]);
    return Promise.all(urls
      .filter(u => typeof u === 'string' && u.indexOf('/modules/') === 0)
      .map(u => this.loadScript(u).catch(() => {})));
  },

  showLogin() {
    // Về màn đăng nhập thì bỏ dấu vai — người sau đăng nhập có thể là vai khác.
    try { delete document.body.dataset.vai; } catch (_) { /* không có DOM */ }
    document.getElementById('bottom-nav').style.display = 'none';
    this.stopBadgePolling();
    const root = document.getElementById('view');
    this.views.login.render(root);
  },

  async logout() {
    try { await API.post('/api/auth/logout'); } catch (_) {}
    this.state.user = null;
    location.hash = '';
    this.showLogin();
  },

  navigate(hash) { location.hash = hash; },

  // Định tuyến: #/tenview/param1/param2
  route() {
    if (!this.state.user) return;

    // Đang dùng mật khẩu tạm thì phải đặt mật khẩu riêng trước khi vào phần khác.
    if (this.state.user.mustChangePassword) {
      document.getElementById('bottom-nav').style.display = 'none';
      this.views.setpassword.render(document.getElementById('view'));
      return;
    }

    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    const name = parts[0] || 'dashboard';
    const root = document.getElementById('view');

    // Các màn hình luôn có, không phụ thuộc việc bật/tắt phân hệ.
    const LUON_CO = ['dashboard', 'settings', 'setpassword', 'accounts', 'admin', 'login'];

    // Vào thẳng đường dẫn của phân hệ đã tắt thì báo rõ thay vì hiện màn hình trống.
    if (!LUON_CO.includes(name) && !this.moduleEnabled(name)) {
      this.baoKhongMoDuoc(root, name);
      this.renderBottomNav('dashboard');
      return;
    }

    // Phân hệ đang bật nhưng tệp màn hình của nó hỏng hoặc chưa tải về được:
    // báo đúng sự thật và chỉ đường quay lại, thay vì lặng lẽ hiện trang chủ
    // khiến người dùng tưởng mình bấm nhầm.
    const view = this.views[name];
    if (!view) {
      root.innerHTML = UI.pageHeader('Chưa mở được') +
        UI.emptyState('🛠️', 'Phần này đang gặp sự cố. Các phần khác vẫn dùng bình thường — ' +
          'bấm Trang chủ để quay lại.');
      this.renderBottomNav(name);
      return;
    }

    root.innerHTML = '<div class="loading">Đang tải</div>';
    window.scrollTo(0, 0);
    Promise.resolve(view.render(root, parts.slice(1))).catch(err => {
      // Hết phiên giữa lúc màn hình đang vẽ: onUnauthorized đã dựng màn đăng
      // nhập rồi — vẽ "Có lỗi xảy ra" đè lên là cô mất luôn ô đăng nhập.
      if (!this.state.user) return;
      root.innerHTML = UI.pageHeader('Có lỗi xảy ra') + UI.emptyState('😥', err.message || 'Không tải được dữ liệu');
    });
    this.demQuanTam(name);
    this.renderBottomNav(name);
  },

  // GIA ĐÌNH QUAN TÂM ĐIỀU GÌ — ĐẾM GỘP, KHÔNG THEO DÕI AI (Đ149).
  //
  // Nhà trường muốn biết gia đình vào app hay xem phần nào: ăn uống, lịch sinh
  // hoạt, kế hoạch của bé, hay hình ảnh. Máy chủ chỉ cộng MỘT vào một ô đếm
  // (ngày · mục · cơ sở) và không ghi lại ai đã mở — xem chú thích bảng
  // `luot_quan_tam` ở lib/schema.sql.
  //
  // BỐN ĐIỀU CỐ Ý Ở PHÍA MÀN HÌNH:
  //
  //   1. CHỈ GIA ĐÌNH. Cô mở màn Thực đơn hai chục lần một ngày để soạn bữa;
  //      đếm cả cô là con số nói về việc của trường chứ không về mối quan tâm
  //      của gia đình — tức trả lời sai câu nhà trường hỏi.
  //   2. MỘT LẦN MỖI MỤC MỖI NGÀY, nhớ ngay trên máy của gia đình. Không có
  //      chỗ nhớ này thì một nhà bấm tới bấm lui mười lần thành mười lượt, và
  //      bảng nói rằng mục ấy được quan tâm gấp mười lần sự thật. Nhớ ở MÁY
  //      chứ không ở máy chủ, vì nhớ ở máy chủ thì phải nhớ kèm "nhà nào".
  //   3. IM LẶNG TUYỆT ĐỐI. Không chờ, không báo lỗi, không giữ chỗ trên màn.
  //      Đây là con số cho marketing; một dòng lỗi vì nó là lỗi của app đối với
  //      người dùng, mà họ có bấm gì đâu.
  //   4. KHÔNG BAO GIỜ CHẶN VIỆC CHÍNH. Kho của trình duyệt bị khoá (chế độ ẩn
  //      danh, máy cũ) thì bỏ qua luôn, không đếm còn hơn làm hỏng màn hình.
  demQuanTam(name) {
    try {
      const u = this.state.user;
      if (!u || u.role !== 'parent') return;
      if (!name || name === 'dashboard' || name === 'login' || name === 'setpassword') return;
      const homNay = new Date().toISOString().slice(0, 10);
      const khoa = `qt:${homNay}:${name}`;
      if (localStorage.getItem(khoa)) return;
      // Dọn dấu của những ngày đã qua. Không dọn thì mỗi ngày để lại chừng hai
      // chục khoá và sau một năm học là vài nghìn khoá nằm lại trong máy của
      // gia đình — một thứ app tự bày ra rồi không bao giờ tự dọn.
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith('qt:') && !k.startsWith(`qt:${homNay}:`)) localStorage.removeItem(k);
      }
      localStorage.setItem(khoa, '1');
      API.post('/api/dashboard/quan-tam', { muc: name }).catch(() => {});
    } catch (_) { /* kho bị khoá — bỏ qua, không đếm còn hơn làm hỏng màn hình */ }
  },

  renderBottomNav(active) {
    const nav = document.getElementById('bottom-nav');
    const items = [
      { key: 'back', label: 'Quay lại', icon: 'back', onclick: 'history.back()' },
      { key: 'dashboard', label: 'Trang chủ', icon: 'home', hash: '#/' },
      { key: 'notifications', label: 'Thông báo', icon: 'bell', hash: '#/notifications', badge: this.state.badges.thongbao, module: 'notifications' },
      { key: 'messages', label: 'Nhắn tin', icon: 'chat', hash: '#/messages', badge: this.state.badges.nhantin, module: 'messages' },
      { key: 'settings', label: 'Cài đặt', icon: 'settings', hash: '#/settings' },
    ].filter(it => !it.module || this.moduleEnabled(it.module));
    nav.innerHTML = items.map(it => `
      <button class="nav-item ${active === it.key ? 'active' : ''}"
        onclick="${it.onclick || `location.hash='${it.hash}'`}">
        ${UI.icon(it.icon, 22)}
        <span>${it.label}</span>
        ${it.badge ? `<span class="nav-badge">${it.badge > 99 ? '99+' : it.badge}</span>` : ''}
      </button>`).join('');
  },

  async refreshBadges() {
    if (!this.state.user) return;
    try {
      // Gọi kiểu NỀN: đây là lời gọi định kỳ app tự phát, không phải cô bấm.
      // Hết phiên ở đây mà để API.get() giật về màn đăng nhập là cô đang gõ dở
      // nhật ký bỗng mất trắng — chỉ ngừng hỏi tiếp; thao tác kế của cô sẽ gặp
      // 401 của chính nó và được đưa về màn đăng nhập đàng hoàng.
      this.state.badges = await (API.getNen || API.get)('/api/dashboard/badges');
      const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
      this.renderBottomNav(parts[0] || 'dashboard');
      // cập nhật badge trên lưới icon nếu đang ở dashboard
      document.querySelectorAll('[data-tile-badge]').forEach(el => {
        const n = this.state.badges[el.dataset.tileBadge] || 0;
        el.textContent = n > 99 ? '99+' : n;
        el.style.display = n ? '' : 'none';
      });
    } catch (err) {
      if (API.laHetPhien && API.laHetPhien(err)) { this.stopBadgePolling(); return; }
      /* còn lại là lỗi mạng tạm thời — bỏ qua */
    }
  },

  startBadgePolling() {
    this.stopBadgePolling();
    this.refreshBadges();
    this._badgeTimer = setInterval(() => this.refreshBadges(), 15000);
    this.watchVisibility();
  },
  stopBadgePolling() {
    if (this._badgeTimer) { clearInterval(this._badgeTimer); this._badgeTimer = null; }
  },

  // Tiết kiệm pin và dung lượng 4G: ngừng hỏi máy chủ khi người dùng chuyển
  // sang ứng dụng khác hoặc tắt màn hình, chạy lại ngay khi họ quay lại.
  watchVisibility() {
    if (this._visibilityBound) return;
    this._visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.state.user) return;
      if (document.hidden) {
        this.stopBadgePolling();
        const chat = this.views.messages;
        if (chat && chat._timer) { clearInterval(chat._timer); chat._timer = null; }
      } else {
        this.refreshBadges();
        // Không chồng đồng hồ: sự kiện visibilitychange có thể bắn "hiện" hai
        // lần liền (đổi tab nhanh) mà đồng hồ cũ chưa từng bị dừng.
        if (!this._badgeTimer) this._badgeTimer = setInterval(() => this.refreshBadges(), 15000);
        // Quay lại phòng chat: tải ngay tin nhắn đã nhỡ rồi bật lại theo dõi.
        const chat = this.views.messages;
        if (chat && !chat._timer && location.hash.startsWith('#/messages/') && typeof chat.poll === 'function') {
          chat.poll();
          chat._timer = setInterval(() => chat.poll(), 4000);
        }
      }
    });
  },

  // BANNER MỜI CÀI APP VÀO MÀN HÌNH CHÍNH.
  //
  // TRƯỚC ĐÂY BANNER NÀY HỨA MỘT THỨ APP HOÀN TOÀN KHÔNG LÀM ĐƯỢC.
  //
  // Nó ghi "Bật để nhận thông báo kịp thời", xin quyền Notification, rồi báo
  // "Đã bật thông báo". Nhưng `public/sw.js` không có một bộ nghe `push` nào,
  // cả kho mã không có `pushManager.subscribe`, không khoá VAPID, không gói
  // gửi thông báo, và máy chủ không có chỗ nào lưu đăng ký. Nghĩa là gia đình
  // bấm đồng ý xong sẽ KHÔNG BAO GIỜ nhận được một thông báo nào — kể cả khi
  // cô báo con sốt.
  //
  // Đây đúng bài học của A5 (dặn thuốc): app chỉ nên hứa thứ nó biết chắc.
  // Một lời hứa sai còn tệ hơn thiếu hẳn tính năng, vì gia đình sẽ THÔI mở app
  // ra xem — họ tưởng có tin thì máy sẽ báo.
  //
  // Nay banner mời đúng một việc app làm được thật: cài vào màn hình chính, để
  // mở nhanh và mở được cả khi mất mạng (Đ12).
  moiCaiVaoManHinhChinh() {
    if (localStorage.getItem('casa.moi-cai-app-da-tat')) return;
    // Đã chạy như app rồi thì không mời nữa.
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
    } catch (_) {}
    const b = document.createElement('div');
    b.className = 'push-banner';
    b.id = 'push-banner';
    b.innerHTML = `
      <span class="pb-logo">🏫</span>
      <div class="pb-text"><b>CASA Mầm non</b><span>Cài vào màn hình chính cho mở nhanh</span></div>
      <button class="pb-bell" id="pb-enable">${UI.icon('plus', 20)}</button>
      <button class="pb-close" id="pb-close">${UI.icon('x', 18)}</button>`;
    document.body.appendChild(b);
    const tat = () => { b.remove(); localStorage.setItem('casa.moi-cai-app-da-tat', '1'); };
    document.getElementById('pb-enable').onclick = () => { this.promptInstall(); tat(); };
    document.getElementById('pb-close').onclick = tat;
  },

  // Tên cũ, giữ lại cho khỏi phá khế ước tệp dùng chung.
  //
  // CLAUDE.md bắt đi ba bước khi bỏ một thứ dùng chung: thêm cái mới bên cạnh →
  // chuyển từng chỗ gọi → khi không còn ai gọi mới xóa. Đây là bước 2; bước 3
  // để lại cho một commit riêng sau, khi chắc chắn không còn chỗ nào gọi.
  maybeShowPushBanner() { return this.moiCaiVaoManHinhChinh(); },
};

document.addEventListener('DOMContentLoaded', () => App.init());
