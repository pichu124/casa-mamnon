// Màn hình buộc đặt mật khẩu mới, hiện ngay sau khi đăng nhập bằng mật khẩu tạm
// do giáo viên cấp. Không cho vào các phần khác cho tới khi đặt xong.
App.views.setpassword = {
  render(root) {
    document.getElementById('bottom-nav').style.display = 'none';
    root.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-logo">🔑</div>
          <h1>Đặt mật khẩu mới</h1>
          <p class="sub">Bạn đang dùng mật khẩu tạm do nhà trường cấp.<br>Hãy đặt mật khẩu riêng để bảo vệ thông tin của con.</p>
          <form id="sp-form">
            <div class="field">
              <label>Mật khẩu mới</label>
              <input type="password" id="sp-new" autocomplete="new-password" placeholder="Ít nhất 8 ký tự" required>
              <div class="hint">Cần tối thiểu 8 ký tự, có cả chữ và số.</div>
            </div>
            <div class="field">
              <label>Nhập lại mật khẩu mới</label>
              <input type="password" id="sp-confirm" autocomplete="new-password" placeholder="Gõ lại mật khẩu vừa nhập" required>
            </div>
            <button class="btn primary block" type="submit" id="sp-submit">Lưu mật khẩu</button>
          </form>
          <p class="muted small center mt-14">Ghi nhớ mật khẩu này để lần sau đăng nhập.</p>
        </div>
      </div>`;

    document.getElementById('sp-form').onsubmit = async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('sp-new').value;
      const confirm = document.getElementById('sp-confirm').value;
      if (newPassword !== confirm) return UI.toast('Hai lần nhập chưa khớp nhau', 'error');

      const btn = document.getElementById('sp-submit');
      btn.disabled = true;
      try {
        const r = await API.post('/api/auth/set-new-password', { newPassword });
        UI.toast(r.message || 'Đã đặt mật khẩu mới', 'success');
        App.state.user.mustChangePassword = false;
        document.getElementById('bottom-nav').style.display = '';
        location.hash = '#/';
        App.route();
      } catch (err) {
        UI.toast(err.message, 'error');
        btn.disabled = false;
      }
    };
  },
};
