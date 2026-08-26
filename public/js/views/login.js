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
          <p class="sub" style="margin-top:16px;font-size:.86rem">
            Quên mật khẩu? Nhờ cô phụ trách cấp lại giúp.
          </p>
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
  },
};
