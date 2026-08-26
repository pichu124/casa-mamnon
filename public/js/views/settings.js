// Cài đặt: hồ sơ cá nhân, thông tin trường, đăng xuất.
App.views.settings = {
  render(root) {
    const { user, school } = App.state;
    root.innerHTML = `
      ${UI.pageHeader('Cài đặt')}
      <div class="card" style="display:flex;align-items:center;gap:14px">
        ${UI.avatar(user.avatar, 56)}
        <div style="flex:1">
          <div style="font-weight:800;font-size:1.05rem">${UI.esc(user.title)} ${UI.esc(user.name)}</div>
          <div class="muted small">${user.role === 'admin' ? 'Quản trị' : user.role === 'teacher' ? 'Giáo viên' : 'Phụ huynh'} · ${UI.esc(user.username)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('user', 19)} Tài khoản</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Điện thoại</div><div class="row-title">${UI.esc(user.phone)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Email</div><div class="row-title">${UI.esc(user.email)}</div></div></div>
        <div class="list-row clickable" id="st-change-pw">
          <div class="row-main">
            <div class="row-title">🔑 Đổi mật khẩu</div>
            <div class="row-sub">Nên đổi mật khẩu mặc định trước khi dùng thật</div>
          </div>
          <span class="muted">${UI.icon('chevron', 18)}</span>
        </div>
      </div>

      <div class="card" data-install-app style="${App.canInstall() ? '' : 'display:none'}">
        <div class="card-title">📱 Cài đặt ứng dụng</div>
        <div class="list-row">
          <div class="row-main">
            <div class="row-title">Thêm SchoolConnect vào màn hình chính</div>
            <div class="row-sub">Mở nhanh như ứng dụng thường, không còn thanh địa chỉ</div>
          </div>
          <button class="btn sm primary" id="st-install">Cài đặt</button>
        </div>
      </div>

      ${user.role === 'admin' ? `
        <div class="card">
          <div class="card-title">🏫 Quản trị nhà trường</div>
          <div class="list-row clickable" onclick="location.hash='#/admin'">
            <div class="row-main">
              <div class="row-title">Nhóm lớp, cô, nhập danh sách</div>
              <div class="row-sub">Quản lý toàn trường và xem nhật ký thao tác</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>
        </div>` : ''}

      ${user.role === 'teacher' || user.role === 'admin' ? `
        <div class="card">
          <div class="card-title">👪 Quản lý nhóm lớp</div>
          <div class="list-row clickable" onclick="location.hash='#/accounts'">
            <div class="row-main">
              <div class="row-title">Tài khoản phụ huynh</div>
              <div class="row-sub">Cấp lại mật khẩu khi phụ huynh quên</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>
        </div>` : ''}

      <div class="card">
        <div class="card-title">${UI.icon('bell', 19)} Thông báo</div>
        <div class="list-row">
          <div class="row-main">
            <div class="row-title">Thông báo đẩy trên thiết bị</div>
            <div class="row-sub">Nhận tin nhắn và thông báo mới kịp thời</div>
          </div>
          <button class="btn sm outline" id="st-push">Bật</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🏫 Nhà trường</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Trường</div><div class="row-title">${UI.esc(school.name)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Địa chỉ</div><div class="row-title">${UI.esc(school.address)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Điện thoại</div><div class="row-title">${UI.esc(school.phone)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Email</div><div class="row-title">${UI.esc(school.email)}</div></div></div>
      </div>

      <button class="btn danger-soft block" onclick="App.logout()">${UI.icon('logout', 18)} Đăng xuất</button>
      <p class="center muted small mt-14">SchoolConnect v1.0 · Sổ liên lạc điện tử</p>`;

    const installBtn = document.getElementById('st-install');
    if (installBtn) installBtn.onclick = () => App.promptInstall();

    document.getElementById('st-change-pw').onclick = () => this.showChangePassword();

    document.getElementById('st-push').onclick = async () => {
      if (!('Notification' in window)) return UI.toast('Trình duyệt không hỗ trợ thông báo', 'error');
      const perm = await Notification.requestPermission();
      UI.toast(perm === 'granted' ? 'Đã bật thông báo đẩy' : 'Thông báo chưa được cấp quyền', perm === 'granted' ? 'success' : '');
    };
  },

  showChangePassword() {
    UI.modal(`
      <div class="field">
        <label>Mật khẩu hiện tại</label>
        <input type="password" id="pw-current" autocomplete="current-password" placeholder="Nhập mật khẩu đang dùng">
      </div>
      <div class="field">
        <label>Mật khẩu mới</label>
        <input type="password" id="pw-new" autocomplete="new-password" placeholder="Ít nhất 8 ký tự">
        <div class="hint">Cần tối thiểu 8 ký tự, có cả chữ và số.</div>
      </div>
      <div class="field">
        <label>Nhập lại mật khẩu mới</label>
        <input type="password" id="pw-confirm" autocomplete="new-password" placeholder="Gõ lại mật khẩu mới">
      </div>
      <button class="btn primary block" id="pw-submit">Đổi mật khẩu</button>
      <p class="muted small center mt-14">Các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</p>
    `, 'Đổi mật khẩu');

    const btn = document.getElementById('pw-submit');
    btn.onclick = async () => {
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;
      const confirm = document.getElementById('pw-confirm').value;
      if (!currentPassword || !newPassword) return UI.toast('Vui lòng nhập đủ thông tin', 'error');
      if (newPassword !== confirm) return UI.toast('Hai lần nhập mật khẩu mới chưa khớp', 'error');

      btn.disabled = true;
      try {
        const r = await API.post('/api/auth/change-password', { currentPassword, newPassword });
        UI.closeModal();
        UI.toast(r.message || 'Đã đổi mật khẩu', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
        btn.disabled = false;
      }
    };
  },
};
