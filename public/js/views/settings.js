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
          <div class="muted small">${user.role === 'admin' ? 'Quản trị' : user.role === 'teacher' ? 'Cô' : 'Phụ huynh'} · ${UI.esc(user.username)}</div>
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

      ${this.theThongBaoDay()}

      <div class="card" data-install-app style="${App.canInstall() ? '' : 'display:none'}">
        <div class="card-title">📱 Cài đặt ứng dụng</div>
        <div class="list-row">
          <div class="row-main">
            <div class="row-title">Thêm CASA Mầm non vào màn hình chính</div>
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
          <div class="card-title">👪 Tài khoản của gia đình</div>
          <div class="list-row clickable" onclick="location.hash='#/accounts'">
            <div class="row-main">
              <div class="row-title">Tài khoản phụ huynh</div>
              <div class="row-sub">Cấp lại mật khẩu khi phụ huynh quên</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>
        </div>` : ''}

      <div class="card">
        <div class="card-title">${UI.icon('bell', 19)} Tin mới</div>
        <div class="list-row">
          <div class="row-main">
            <div class="row-title">App chưa gửi thông báo ra ngoài</div>
            <div class="row-sub" style="line-height:1.6">Tin nhắn và thông báo mới hiện ngay trên
              màn hình chính khi mở app, kèm dấu chấm đỏ ở mục có tin. Máy sẽ không kêu khi
              app đang đóng — nên vẫn nhớ mở app xem mỗi ngày.</div>
          </div>
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
      <p class="center muted small mt-14">CASA Mầm non v1.0 · Sổ liên lạc điện tử</p>`;

    const installBtn = document.getElementById('st-install');
    if (installBtn) installBtn.onclick = () => App.promptInstall();
    this.ganThongBaoDay();

    document.getElementById('st-change-pw').onclick = () => this.showChangePassword();

    // Nút "Bật thông báo đẩy" từng bị gỡ ở Đ14 vì lúc đó là lời hứa suông.
    // Từ Đ137 đường đẩy có thật (public/sw.js nghe `push`, lib/day.js gửi,
    // bảng push_dang_ky giữ đăng ký) nên nút quay lại — xem `theThongBaoDay`.
  },

  // ---- Thông báo trên điện thoại (Đ137) ----
  //
  // Nói đúng những gì máy làm được: Android và máy tính nhận ngay; iPhone chỉ
  // nhận khi app đã được thêm vào màn hình chính (iOS 16.4 trở lên). Không
  // hứa hơn.
  theThongBaoDay() {
    const u = App.state.user;
    // TỪ Đ157 MÁY CHỦ QUYẾT AI THẤY THẺ NÀY, KHÔNG PHẢI CHỖ NÀY.
    //
    // Bản trước kể thẳng hai mã chức vụ ra ngay tại đây, để đoán xem tài khoản
    // này có đường `/api/push` hay không — tức là hai
    // chỗ cùng nói một chuyện, và hai chỗ thì sẽ trôi khỏi nhau ở lần sửa thứ
    // hai. Nay `/api/push/trang-thai` trả về `batDuoc` và `loaiTin`, và
    // `veTrangThaiDay` gỡ hẳn thẻ khi danh sách rỗng. Thẻ hiện ra một nhịp rồi
    // biến mất là chấp nhận được: nó vốn mở đầu bằng "Đang kiểm tra…".

    // CHỈ GIA ĐÌNH MỚI THẬT SỰ NHẬN ĐƯỢC TIN ĐẨY (Đ145).
    //
    // `lib/day.js` có đúng một đường gửi tin thật: `guiChoGiaDinhCuaBe`, và nó
    // đọc bảng `student_parents`. Nghĩa là cô bật xong chỉ nhận được đúng cái
    // "Gửi thử" rồi thôi — chuông không bao giờ kêu nữa. Thẻ lại còn viết
    // "báo khi có tin về con", tức hứa một thứ tài khoản của cô không có.
    //
    // Đó đúng là kiểu hứa suông mà bài học Đ14 và `test/khong-hua-suong` sinh
    // ra để chặn. Nên: ẩn hẳn với cô.
    //
    // Muốn cô cũng nhận đẩy thì phải THÊM loại tin cho cô trước (gia đình xin
    // nghỉ, đơn chờ duyệt…), rồi mới mở lại thẻ này — ghi ở docs/VIEC-CON-LAI.md.
    if (u.role === 'teacher') return '';

    // TỪ Đ154 QUẢN LÝ ĐÃ CÓ TIN ĐẨY THẬT.
    //
    // Ai còn thấy thẻ này sau hai dòng chặn ở trên: gia đình, quản trị Cấp 1
    // (chưa gắn chức vụ), hiệu trưởng và quản lý cơ sở. Đúng ba nhóm sau là
    // những người `lib/bao-nha-truong.js` gửi tới khi cô gửi báo cáo học tập
    // hay đề xuất sửa kế hoạch — nên câu "tài khoản nhà trường không nhận tin
    // tự động" của bản trước nay đã sai, và phải sửa cùng lúc với việc thêm
    // đường gửi. Hai chỗ nói khác nhau chính là hứa suông.
    const laGiaDinh = u.role === 'parent';
    const hoTro = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    return `
      <div class="card" id="st-push-card">
        <div class="card-title">🔔 Thông báo trên điện thoại</div>
        <div class="muted small" style="line-height:1.6">
          ${laGiaDinh
            ? `Bật để máy tự báo khi có tin về con: ảnh con tới lớp, nhật ký ngày, cân đo, album mới…
               Trên iPhone cần <b>thêm app vào màn hình chính</b> trước rồi mới bật được.`
            : `Bật để máy tự báo khi có <b>việc chờ mình duyệt</b><span id="st-push-loai"></span>.
               Nút "Gửi thử" còn dùng để kiểm đường thông báo của trường — nhận được nghĩa là
               máy chủ gửi được tin tới điện thoại phụ huynh.
               Trên iPhone cần <b>thêm app vào màn hình chính</b> trước rồi mới bật được.`}
        </div>
        <div id="st-push-trang-thai" class="small mt-8" style="line-height:1.6">${hoTro ? 'Đang kiểm tra…' : 'Trình duyệt này chưa hỗ trợ thông báo đẩy.'}</div>
        ${hoTro ? `
        <div class="flex mt-8" style="gap:8px;flex-wrap:wrap">
          <button class="btn sm primary" id="st-push-bat">Bật trên máy này</button>
          <button class="btn sm outline" id="st-push-thu" style="display:none">Gửi thử</button>
          <button class="btn sm outline" id="st-push-tat" style="display:none">Tắt trên máy này</button>
        </div>` : ''}
      </div>`;
  },

  async ganThongBaoDay() {
    const bat = document.getElementById('st-push-bat');
    if (!bat) return;
    bat.onclick = () => this.batThongBaoDay();
    document.getElementById('st-push-tat').onclick = () => this.tatThongBaoDay();
    document.getElementById('st-push-thu').onclick = () => this.guiThuThongBao();
    await this.veTrangThaiDay();
  },

  async dangKyHienTai() {
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (_) { return null; }
  },

  async veTrangThaiDay() {
    const o = document.getElementById('st-push-trang-thai');
    const bat = document.getElementById('st-push-bat');
    const tat = document.getElementById('st-push-tat');
    const thu = document.getElementById('st-push-thu');
    if (!o || !bat) return;
    let tt = { coGoiDay: false, soMay: 0 };
    try { tt = await API.get('/api/push/trang-thai'); } catch (_) {}

    // MÁY CHỦ NÓI KHÔNG CÓ LOẠI TIN NÀO THÌ GỠ HẲN THẺ (Đ157).
    //
    // `batDuoc === false` nghĩa là tài khoản này sẽ không bao giờ nhận được
    // một tin thật nào — mời họ bật là hứa suông, đúng bài học Đ14/Đ145.
    // So bằng đúng giá trị `false`, KHÔNG so bằng dấu phủ định: máy chủ đời cũ
    // (bản trước Đ157 còn trong bộ nhớ đệm của điện thoại) không gửi trường này,
    // và khi ấy phải giữ nguyên hành vi cũ chứ không giấu thẻ đi.
    if (tt.batDuoc === false) {
      const the = document.getElementById('st-push-card');
      if (the) the.remove();
      return;
    }
    // Nói ĐÚNG những gì sẽ tới, bằng chính danh sách máy chủ trả về.
    const oLoai = document.getElementById('st-push-loai');
    if (oLoai && Array.isArray(tt.loaiTin) && tt.loaiTin.length) {
      oLoai.textContent = `: ${tt.loaiTin.join(', ')}`;
    }

    if (!tt.coGoiDay) {
      o.textContent = 'Máy chủ của trường chưa cài phần gửi thông báo đẩy — chuông trong app vẫn hoạt động.';
      bat.style.display = 'none';
      return;
    }
    const sub = await this.dangKyHienTai();
    const quyen = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (sub) {
      o.innerHTML = `<span style="color:var(--success)">Máy này đang nhận thông báo.</span>${tt.soMay > 1 ? ` Tài khoản có ${UI.esc(String(tt.soMay))} máy đang bật.` : ''}`;
      bat.style.display = 'none'; tat.style.display = ''; thu.style.display = '';
    } else if (quyen === 'denied') {
      o.textContent = 'Trình duyệt đang chặn thông báo của trang này. Mở cài đặt trình duyệt, cho phép thông báo rồi quay lại bấm Bật.';
      bat.style.display = ''; tat.style.display = 'none'; thu.style.display = 'none';
    } else {
      o.textContent = tt.soMay ? `Máy này chưa bật. Tài khoản đang bật ở ${tt.soMay} máy khác.` : 'Máy này chưa bật thông báo.';
      bat.style.display = ''; tat.style.display = 'none'; thu.style.display = 'none';
    }
  },

  khoaSangMang(chuoi) {
    const dem = '='.repeat((4 - chuoi.length % 4) % 4);
    const b64 = (chuoi + dem).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const ra = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) ra[i] = raw.charCodeAt(i);
    return ra;
  },

  async batThongBaoDay() {
    try {
      const quyen = await Notification.requestPermission();
      if (quyen !== 'granted') return UI.toast('Chưa được phép hiện thông báo — trình duyệt đang chặn hoặc bạn vừa từ chối', 'error');
      const { khoa } = await API.get('/api/push/khoa-cong-khai');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.khoaSangMang(khoa) });
      await API.post('/api/push/dang-ky', { subscription: sub.toJSON() });
      UI.toast('Đã bật thông báo trên máy này', 'success');
    } catch (e) {
      UI.toast(e.message || 'Chưa bật được thông báo trên máy này', 'error');
    }
    await this.veTrangThaiDay();
  },

  async tatThongBaoDay() {
    try {
      const sub = await this.dangKyHienTai();
      if (sub) {
        await API.del(`/api/push/dang-ky?endpoint=${encodeURIComponent(sub.endpoint)}`).catch(() => {});
        await sub.unsubscribe();
      }
      UI.toast('Đã tắt thông báo trên máy này', 'success');
    } catch (e) { UI.toast(e.message || 'Chưa tắt được', 'error'); }
    await this.veTrangThaiDay();
  },

  async guiThuThongBao() {
    try {
      const r = await API.post('/api/push/thu', {});
      UI.toast(r.guiDuoc ? 'Đã gửi thử — vài giây nữa máy sẽ báo' : 'Chưa gửi được tới máy nào. Thử tắt rồi bật lại.', r.guiDuoc ? 'success' : 'error');
    } catch (e) { UI.toast(e.message || 'Chưa gửi thử được', 'error'); }
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
