// Giáo viên cấp lại mật khẩu cho phụ huynh lớp mình khi họ quên.
App.views.accounts = {
  async render(root) {
    const parents = await API.get('/api/accounts/parents');
    root.innerHTML = `
      ${UI.pageHeader('Tài khoản phụ huynh')}
      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Khi phụ huynh quên mật khẩu</div>
        <p class="muted small" style="line-height:1.6">
          Bấm <b>Cấp mật khẩu tạm</b> bên cạnh tên phụ huynh. Hệ thống sinh một mật khẩu
          ngắn, cô đọc cho phụ huynh qua điện thoại. Phụ huynh đăng nhập xong sẽ được
          yêu cầu đặt lại mật khẩu riêng ngay.
        </p>
      </div>
      ${parents.length ? `
        <div class="card">
          ${parents.map(p => `
            <div class="list-row">
              ${UI.avatar(p.avatar, 42)}
              <div class="row-main">
                <div class="row-title">${UI.esc(p.name)}</div>
                <div class="row-sub">PH em ${UI.esc(p.children.join(', '))} · ${UI.esc(p.phone || 'chưa có số điện thoại')}</div>
                ${p.mustChangePassword ? `<div class="mt-8">${UI.badge('Đang dùng mật khẩu tạm', 'orange')}</div>` : ''}
              </div>
              <button class="btn sm outline" onclick="App.views.accounts.reset('${UI.esc(p.userId)}','${UI.esc(p.name)}')">
                Cấp mật khẩu tạm
              </button>
            </div>`).join('')}
        </div>` : UI.emptyState('👪', 'Lớp chưa có phụ huynh nào trong hệ thống')}`;
  },

  async reset(userId, name) {
    if (!confirm(`Cấp mật khẩu tạm mới cho ${name}?\n\nMật khẩu cũ sẽ không dùng được nữa và phụ huynh sẽ bị đăng xuất khỏi mọi thiết bị.`)) return;
    try {
      const r = await API.post(`/api/accounts/${userId}/reset-password`);
      UI.modal(`
        <p>Đọc thông tin sau cho <b>${UI.esc(name)}</b>:</p>
        <div class="card" style="margin:14px 0;text-align:center;background:var(--primary-tint);border-color:var(--primary)">
          <div class="muted small">Tên đăng nhập</div>
          <div style="font-size:1.2rem;font-weight:800;letter-spacing:.02em">${UI.esc(r.username)}</div>
          <div class="muted small mt-14">Mật khẩu tạm</div>
          <div style="font-size:1.6rem;font-weight:800;letter-spacing:.12em;font-family:ui-monospace,monospace">${UI.esc(r.temporaryPassword)}</div>
        </div>
        <p class="muted small">
          Phụ huynh sẽ được yêu cầu đặt mật khẩu riêng ngay sau khi đăng nhập.
          Mật khẩu tạm này chỉ hiện một lần, nếu quên thì cấp lại lần nữa.
        </p>
        <button class="btn primary block mt-14" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
      `, 'Mật khẩu tạm');
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
