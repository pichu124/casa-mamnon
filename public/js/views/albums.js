// Phân hệ Album ảnh.
// Danh sách album (#/albums) và trang chi tiết (#/albums/<id>).
// Giáo viên có thể tạo album mới cho lớp chủ nhiệm.
App.views.albums = {
  _detail: null,

  async render(root, params) {
    const albumId = params && params[0];
    if (albumId) return this.renderDetail(root, albumId);
    return this.renderList(root);
  },

  // ---- Danh sách album ----
  async renderList(root) {
    const isTeacher = App.state.user.role === 'teacher';
    const albums = await API.get('/api/albums');
    root.innerHTML = `
      ${UI.pageHeader('Album ảnh', isTeacher ? { action: { id: 'btn-new-album', label: 'Tạo album', icon: 'plus' } } : {})}
      ${albums.length
        ? `<div class="grid-2">${albums.map(a => this.albumCard(a)).join('')}</div>`
        : UI.emptyState('📷', 'Chưa có album ảnh nào của lớp')}`;
    if (isTeacher) document.getElementById('btn-new-album').onclick = () => this.openCreate();
  },

  albumCard(a) {
    const g = (a.cover && a.cover.g) || ['#e6eaf0', '#f2f4f8'];
    const emoji = (a.cover && a.cover.emoji) || '📷';
    return `
      <div class="card clickable" style="margin-bottom:0" onclick="App.navigate('#/albums/${UI.esc(a.id)}')">
        <div style="aspect-ratio:4/3;border-radius:12px;background:linear-gradient(135deg, ${UI.esc(g[0])}, ${UI.esc(g[1])});display:flex;align-items:center;justify-content:center;font-size:44px">${UI.esc(emoji)}</div>
        <div style="font-weight:700;margin-top:9px">${UI.esc(a.title)}</div>
        <div class="muted small" style="margin-top:3px">${UI.esc(a.photoCount)} ảnh · ${UI.esc(UI.fmtDateShort(a.date))}</div>
        <div class="mt-8">${UI.badge(a.className, 'gray')}</div>
      </div>`;
  },

  // ---- Chi tiết một album ----
  async renderDetail(root, id) {
    const a = await API.get(`/api/albums/${id}`);
    this._detail = a;
    root.innerHTML = `
      ${UI.pageHeader(a.title)}
      <div class="card">
        <div class="muted small">${UI.esc(a.className)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}${a.authorName ? ` · Đăng bởi ${UI.esc(a.authorName)}` : ''}</div>
        ${a.description ? `<p class="mt-8" style="font-size:.93rem;line-height:1.55">${UI.esc(a.description)}</p>` : ''}
      </div>
      <div class="photo-grid">
        ${a.photos.map((p, i) => `
          <div class="photo" style="background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])})" onclick="App.views.albums.showPhoto(${i})">
            ${UI.esc(p.emoji)}
            ${p.caption ? `<div class="photo-cap">${UI.esc(p.caption)}</div>` : ''}
          </div>`).join('')}
      </div>`;
  },

  // Xem một ảnh phóng to trong modal.
  showPhoto(index) {
    const a = this._detail;
    if (!a || !a.photos[index]) return;
    const p = a.photos[index];
    UI.modal(`
      <div style="height:260px;border-radius:14px;background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])});display:flex;align-items:center;justify-content:center;font-size:90px">${UI.esc(p.emoji)}</div>
      ${p.caption ? `<div class="center mt-14" style="font-weight:700">${UI.esc(p.caption)}</div>` : ''}
      <div class="muted small center mt-8">${UI.esc(a.title)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}</div>
    `, 'Xem ảnh');
  },

  // ---- Giáo viên: tạo album mới ----
  openCreate() {
    UI.modal(`
      <div class="field">
        <label>Tên album</label>
        <input id="al-title" placeholder="Ví dụ: Hoạt động trải nghiệm tháng này">
      </div>
      <div class="field">
        <label>Mô tả</label>
        <textarea id="al-desc" placeholder="Đôi dòng giới thiệu về album gửi tới phụ huynh..."></textarea>
      </div>
      <div class="field">
        <label>Ảnh trong album</label>
        <div id="al-photos"></div>
        <button class="btn outline sm mt-8" onclick="App.views.albums.addPhotoRow()">+ Thêm ảnh</button>
        <div class="hint">Mỗi ảnh gồm một emoji minh họa và chú thích.</div>
      </div>
      <button class="btn primary block" onclick="App.views.albums.submitCreate()">${UI.icon('plus', 18)} Đăng album</button>
    `, 'Tạo album mới');
    this.addPhotoRow();
  },

  addPhotoRow() {
    const zone = document.getElementById('al-photos');
    if (!zone) return;
    const row = document.createElement('div');
    row.className = 'al-photo-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
    row.innerHTML = `
      <input class="al-ph-emoji" maxlength="2" placeholder="📷" style="width:58px;flex:none;text-align:center;font-size:20px;padding:9px 4px">
      <input class="al-ph-caption" placeholder="Chú thích ảnh">
      <button class="btn outline sm" style="flex:none;padding:9px 11px" title="Xóa ảnh" onclick="this.closest('.al-photo-row').remove()">${UI.icon('x', 16)}</button>`;
    zone.appendChild(row);
    row.querySelector('.al-ph-emoji').focus();
  },

  async submitCreate() {
    const title = document.getElementById('al-title').value.trim();
    const description = document.getElementById('al-desc').value.trim();
    const photos = [...document.querySelectorAll('#al-photos .al-photo-row')]
      .map(row => ({
        emoji: row.querySelector('.al-ph-emoji').value.trim(),
        caption: row.querySelector('.al-ph-caption').value.trim(),
      }))
      .filter(p => p.emoji || p.caption);
    if (!title) return UI.toast('Cô nhập tên album giúp nhé', 'error');
    if (!photos.length) return UI.toast('Album cần có ít nhất 1 ảnh', 'error');
    try {
      await API.post('/api/albums', { title, description, photos });
      UI.toast('Đã đăng album ảnh cho lớp', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
