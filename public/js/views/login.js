// Màn hình đăng nhập.
App.views.login = {
  render(root) {
    document.getElementById('bottom-nav').style.display = 'none';
    root.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-logo">🏫</div>
          <h1>SchoolConnect</h1>
          <p class="sub">Sổ liên lạc điện tử – Kết nối nhà trường và gia đình</p>
          <form id="login-form">
            <div class="field">
              <label>Tên đăng nhập</label>
              <input id="lg-user" autocomplete="username" placeholder="Nhập tên đăng nhập" required>
            </div>
            <div class="field">
              <label>Mật khẩu</label>
              <input id="lg-pass" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required>
            </div>
            <button class="btn primary block" type="submit">Đăng nhập</button>
          </form>
          <div class="demo-accounts">
            <p>Tài khoản dùng thử</p>
            <div class="demo-row">
              <button class="btn outline block sm" id="demo-parent">👩 Phụ huynh<br><small class="muted">phuhuynh / 123456</small></button>
              <button class="btn outline block sm" id="demo-teacher">👩‍🏫 Giáo viên<br><small class="muted">giaovien / 123456</small></button>
            </div>
          </div>
        </div>
      </div>`;

    const doLogin = async (username, password) => {
      try {
        const me = await API.post('/api/auth/login', { username, password });
        App.applyMe(me);
        await App.loadModules();
        location.hash = '#/';
        App.route();
        App.startBadgePolling();
        App.maybeShowPushBanner();
        UI.toast(`Xin chào ${me.user.title} ${me.user.name}!`, 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };

    document.getElementById('login-form').onsubmit = (e) => {
      e.preventDefault();
      doLogin(document.getElementById('lg-user').value.trim(), document.getElementById('lg-pass').value);
    };
    document.getElementById('demo-parent').onclick = () => doLogin('phuhuynh', '123456');
    document.getElementById('demo-teacher').onclick = () => doLogin('giaovien', '123456');
  },
};
