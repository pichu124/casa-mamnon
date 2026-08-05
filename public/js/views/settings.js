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
          <div class="muted small">${user.role === 'teacher' ? 'Giáo viên' : 'Phụ huynh'} · ${UI.esc(user.username)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('user', 19)} Tài khoản</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Điện thoại</div><div class="row-title">${UI.esc(user.phone)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Email</div><div class="row-title">${UI.esc(user.email)}</div></div></div>
      </div>

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

    document.getElementById('st-push').onclick = async () => {
      if (!('Notification' in window)) return UI.toast('Trình duyệt không hỗ trợ thông báo', 'error');
      const perm = await Notification.requestPermission();
      UI.toast(perm === 'granted' ? 'Đã bật thông báo đẩy' : 'Thông báo chưa được cấp quyền', perm === 'granted' ? 'success' : '');
    };
  },
};
