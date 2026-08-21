// Phân hệ Thông báo.
// Danh sách thông báo (ghim trước, mới nhất trước), đánh dấu đã đọc,
// giáo viên tạo thông báo gửi lớp mình hoặc toàn trường.
App.views.notifications = {
  CATS: {
    'Nhà trường': { emoji: '🏫', bg: '#e6efff' },
    'Lớp học': { emoji: '📚', bg: '#f1e8fd' },
    'Y tế': { emoji: '🩺', bg: '#e3f7ec' },
    'Học phí': { emoji: '💳', bg: '#fef0e0' },
  },
  DEFAULT_CAT: { emoji: '📣', bg: '#eef1f5' },
  _list: [],
  _root: null,
  _aud: 'class',

  async render(root) {
    this._root = root;
    this._list = await API.get('/api/notifications');
    this.paint();
  },

  // Vẽ lại danh sách từ dữ liệu đã tải (không gọi lại API).
  paint() {
    const root = this._root;
    const isTeacher = App.state.user.role === 'teacher';
    const unread = this._list.filter(n => !n.read).length;
    root.innerHTML = `
      ${UI.pageHeader('Thông báo', isTeacher ? { action: { id: 'btn-new-notif', label: 'Tạo thông báo', icon: 'plus' } } : {})}
      ${unread ? `
        <div class="flex" style="margin-bottom:10px">
          <span class="muted small">${unread} thông báo chưa đọc</span>
          <span class="spacer"></span>
          <button class="btn sm outline" id="btn-read-all">${UI.icon('check', 16)} Đọc tất cả</button>
        </div>` : ''}
      ${this._list.length
        ? `<div class="card">${this._list.map(n => this.rowHtml(n)).join('')}</div>`
        : UI.emptyState('🔔', 'Chưa có thông báo nào')}`;
    if (isTeacher) document.getElementById('btn-new-notif').onclick = () => this.openCreate();
    const btnAll = document.getElementById('btn-read-all');
    if (btnAll) btnAll.onclick = () => this.readAll();
  },

  catOf(n) { return this.CATS[n.category] || this.DEFAULT_CAT; },

  rowHtml(n) {
    const cat = this.catOf(n);
    return `
      <div class="list-row clickable"${n.read ? '' : ' style="background:#f0f6ff;border-radius:10px"'} onclick="App.views.notifications.showDetail('${UI.esc(n.id)}')">
        <div class="row-icon" style="background:${cat.bg};font-size:20px">${cat.emoji}</div>
        <div class="row-main">
          <div class="row-title">${n.read ? '' : '<span style="color:var(--primary)">●</span> '}${UI.esc(n.title)}${n.pinned ? ' 📌' : ''}</div>
          <div class="row-sub">${UI.esc(n.authorName)} · ${UI.esc(UI.timeAgo(n.createdAt))}</div>
        </div>
        <span class="muted">${UI.icon('chevron', 18)}</span>
      </div>`;
  },

  // Modal chi tiết + đánh dấu đã đọc.
  async showDetail(id) {
    const n = this._list.find(x => x.id === id);
    if (!n) return;
    const cat = this.catOf(n);
    UI.modal(`
      <div class="flex mb-8">
        <div class="row-icon" style="background:${cat.bg};font-size:20px">${cat.emoji}</div>
        ${UI.badge(n.category || 'Khác', 'gray')}
        ${n.pinned ? UI.badge('📌 Ghim', 'orange') : ''}
      </div>
      <h3 style="margin:6px 0 8px">${UI.esc(n.title)}</h3>
      <div style="white-space:pre-wrap;font-size:.94rem;line-height:1.55">${UI.esc(n.body)}</div>
      <div class="muted small mt-14">${UI.esc(n.authorName)} · ${UI.esc(UI.fmtDate(n.createdAt))} lúc ${UI.esc(UI.fmtTime(n.createdAt))}${
        n.daSua ? ` · đã chỉnh sửa lúc ${UI.esc(UI.fmtTime(n.suaLuc))} ${UI.esc(UI.fmtDateShort(n.suaLuc))}` : ''}</div>
      ${n.coTheSua ? `
        <div class="flex mt-14" style="gap:8px">
          <button class="btn outline" style="flex:1" onclick="App.views.notifications.openSua('${UI.esc(n.id)}')">Sửa lại</button>
          <button class="btn danger-soft" style="flex:1" onclick="App.views.notifications.hoiThuHoi('${UI.esc(n.id)}')">Thu hồi</button>
        </div>` : ''}
    `, 'Chi tiết thông báo');
    if (!n.read) {
      try {
        await API.post(`/api/notifications/${n.id}/read`);
        n.read = true;
        this.paint();
        App.refreshBadges();
      } catch (_) { /* bỏ qua lỗi mạng tạm thời */ }
    }
  },

  // Đánh dấu đã đọc tất cả.
  async readAll() {
    try {
      await API.post('/api/notifications/read-all');
      this._list.forEach(n => { n.read = true; });
      UI.toast('Đã đánh dấu đã đọc tất cả thông báo', 'success');
      this.paint();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Giáo viên: tạo thông báo mới ----
  openCreate() {
    this._aud = 'class';
    UI.modal(`
      <div class="field">
        <label>Tiêu đề</label>
        <input id="nt-title" placeholder="Ví dụ: Chuẩn bị đồ dùng tiết Mỹ thuật">
      </div>
      <div class="field">
        <label>Nội dung</label>
        <textarea id="nt-body" placeholder="Nội dung chi tiết gửi tới phụ huynh..."></textarea>
      </div>
      <div class="field">
        <label>Phân loại</label>
        <select id="nt-cat">
          <option>Lớp học</option>
          <option>Nhà trường</option>
          <option>Y tế</option>
          <option>Học phí</option>
          <option>Khác</option>
        </select>
      </div>
      <div class="field">
        <label>Phạm vi gửi</label>
        <div class="seg" id="nt-aud" style="margin-bottom:0">
          <button class="active" data-aud="class" onclick="App.views.notifications.setAud('class')">Lớp mình</button>
          <button data-aud="all" onclick="App.views.notifications.setAud('all')">Toàn trường</button>
        </div>
      </div>
      <button class="btn primary block" onclick="App.views.notifications.submitCreate()">${UI.icon('send', 18)} Gửi thông báo</button>
    `, 'Tạo thông báo');
  },

  setAud(aud) {
    this._aud = aud;
    document.querySelectorAll('#nt-aud button').forEach(b => b.classList.toggle('active', b.dataset.aud === aud));
  },

  async submitCreate() {
    const title = document.getElementById('nt-title').value.trim();
    const body = document.getElementById('nt-body').value.trim();
    const category = document.getElementById('nt-cat').value;
    if (!title) return UI.toast('Vui lòng nhập tiêu đề thông báo', 'error');
    if (!body) return UI.toast('Vui lòng nhập nội dung thông báo', 'error');
    try {
      await API.post('/api/notifications', { title, body, category, audience: this._aud });
      UI.toast('Đã gửi thông báo', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Sửa lại và thu hồi thông báo đã gửi ----
  //
  // Trước đây gõ nhầm giờ họp phụ huynh rồi gửi đi là hết cách: chỉ còn gửi thêm
  // một thông báo đính chính rồi hai cái cùng nằm đó.
  openSua(id) {
    const n = this._list.find(x => x.id === id);
    if (!n) return;
    UI.modal(`
      <div class="field"><label>Tiêu đề</label><input id="nt-s-title" value="${UI.esc(n.title)}"></div>
      <div class="field"><label>Nội dung</label><textarea id="nt-s-body">${UI.esc(n.body)}</textarea></div>
      <div class="field">
        <label>Phân loại</label>
        <select id="nt-s-cat">
          ${['Lớp học', 'Nhà trường', 'Y tế', 'Học phí', 'Khác']
            .map(c => `<option ${c === n.category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="muted small" style="line-height:1.6">
        Phụ huynh sẽ thấy dòng "đã chỉnh sửa lúc…" bên dưới thông báo, để không ai
        tưởng mình nhớ nhầm nội dung cũ. Phạm vi gửi không đổi được sau khi đã gửi.
      </div>
      <button class="btn primary block mt-14" id="nt-s-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa thông báo');

    document.getElementById('nt-s-luu').onclick = async () => {
      const title = document.getElementById('nt-s-title').value.trim();
      const body = document.getElementById('nt-s-body').value.trim();
      if (!title) return UI.toast('Vui lòng nhập tiêu đề thông báo', 'error');
      if (!body) return UI.toast('Vui lòng nhập nội dung thông báo', 'error');
      try {
        await API.put(`/api/notifications/${encodeURIComponent(id)}`, {
          title, body, category: document.getElementById('nt-s-cat').value,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  hoiThuHoi(id) {
    const n = this._list.find(x => x.id === id);
    if (!n) return;
    UI.modal(`
      <p style="line-height:1.6">Thu hồi thông báo <b>"${UI.esc(n.title)}"</b>?</p>
      <p class="muted small" style="line-height:1.6">
        Thông báo sẽ biến khỏi màn hình của phụ huynh và không còn tính vào số
        "chưa đọc". <b>Nội dung vẫn được giữ lại</b> trong hệ thống để tra khi cần.
        Phụ huynh đã đọc rồi thì không lấy lại được điều họ đã thấy.
      </p>
      <button class="btn primary block mt-14" id="nt-th-ok">Xác nhận thu hồi</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Thu hồi thông báo');

    document.getElementById('nt-th-ok').onclick = async () => {
      try {
        await API.del(`/api/notifications/${encodeURIComponent(id)}`);
        UI.toast('Đã thu hồi thông báo', 'success');
        UI.closeModal();
        App.route();
        App.refreshBadges();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};
