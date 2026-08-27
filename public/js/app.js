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
      this.maybeShowPushBanner();
    } catch (_) {
      this.showLogin();
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
    });
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
    if (!this.state.currentStudentId && this.state.students.length) {
      this.state.currentStudentId = this.state.students[0].id;
    }
    document.getElementById('bottom-nav').style.display = '';
  },

  currentStudent() {
    return this.state.students.find(s => s.id === this.state.currentStudentId) || this.state.students[0] || null;
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

  onUnauthorized() { this.showLogin(); },

  showLogin() {
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
      root.innerHTML = UI.pageHeader('Không dùng được') +
        UI.emptyState('🔒', 'Phân hệ này hiện đang được nhà trường tắt.');
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
      root.innerHTML = UI.pageHeader('Có lỗi xảy ra') + UI.emptyState('😥', err.message || 'Không tải được dữ liệu');
    });
    this.renderBottomNav(name);
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
      this.state.badges = await API.get('/api/dashboard/badges');
      const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
      this.renderBottomNav(parts[0] || 'dashboard');
      // cập nhật badge trên lưới icon nếu đang ở dashboard
      document.querySelectorAll('[data-tile-badge]').forEach(el => {
        const n = this.state.badges[el.dataset.tileBadge] || 0;
        el.textContent = n > 99 ? '99+' : n;
        el.style.display = n ? '' : 'none';
      });
    } catch (_) { /* bỏ qua lỗi mạng tạm thời */ }
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
        this._badgeTimer = setInterval(() => this.refreshBadges(), 15000);
        // Quay lại phòng chat: tải ngay tin nhắn đã nhỡ rồi bật lại theo dõi.
        const chat = this.views.messages;
        if (chat && !chat._timer && location.hash.startsWith('#/messages/') && typeof chat.poll === 'function') {
          chat.poll();
          chat._timer = setInterval(() => chat.poll(), 4000);
        }
      }
    });
  },

  // Banner mời bật thông báo (giống ANS Portal)
  maybeShowPushBanner() {
    if (localStorage.getItem('pushBannerDismissed')) return;
    if (!('Notification' in window) || Notification.permission === 'granted') return;
    const b = document.createElement('div');
    b.className = 'push-banner';
    b.id = 'push-banner';
    b.innerHTML = `
      <span class="pb-logo">🏫</span>
      <div class="pb-text"><b>CASA Mầm non</b><span>Bật để nhận thông báo kịp thời</span></div>
      <button class="pb-bell" id="pb-enable">${UI.icon('bell', 20)}</button>
      <button class="pb-close" id="pb-close">${UI.icon('x', 18)}</button>`;
    document.body.appendChild(b);
    document.getElementById('pb-enable').onclick = async () => {
      try {
        const perm = await Notification.requestPermission();
        UI.toast(perm === 'granted' ? 'Đã bật thông báo' : 'Bạn có thể bật lại trong Cài đặt', perm === 'granted' ? 'success' : '');
      } catch (_) {}
      b.remove();
      localStorage.setItem('pushBannerDismissed', '1');
    };
    document.getElementById('pb-close').onclick = () => {
      b.remove();
      localStorage.setItem('pushBannerDismissed', '1');
    };
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
