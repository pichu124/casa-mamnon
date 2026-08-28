// Phân hệ Album ảnh.
// Danh sách album (#/albums) và trang chi tiết (#/albums/<id>).
// Giáo viên tạo album, thêm và xóa ảnh cho nhóm mình phụ trách.
App.views.albums = {
  _detail: null,
  _pending: [],   // ảnh đang chờ tải lên: [{ dataUrl, caption, name }]

  async render(root, params) {
    const albumId = params && params[0];
    if (albumId) return this.renderDetail(root, albumId);
    return this.renderList(root);
  },

  // ================= Danh sách album =================
  async renderList(root) {
    const isTeacher = App.state.user.role === 'teacher';
    // Hỏi kèm album của nhóm đã đóng cho mọi vai. Máy chủ tự quyết ai được thấy
    // gì: quản trị và cô cũ thấy cả nhóm; phụ huynh chỉ thấy ảnh chụp trong đúng
    // khoảng con còn học nhóm đó.
    const albums = await API.get('/api/albums?keCaLopCu=1');
    // Tách theo "con/nhóm mình còn ở đó hay không", chứ không theo "nhóm đã đóng":
    // bé chuyển nhóm giữa năm thì nhóm cũ vẫn đang mở nhưng con đã rời rồi.
    const laCu = a => a.lopCuCuaCon || a.lopDaDong;
    const namNay = albums.filter(a => !laCu(a));
    const namCu = albums.filter(laCu);

    root.innerHTML = `
      ${UI.pageHeader('Album ảnh', isTeacher ? { action: { id: 'btn-new-album', label: 'Tạo album', icon: 'plus' } } : {})}
      ${namNay.length
        ? `<div class="grid-2">${namNay.map(a => this.albumCard(a)).join('')}</div>`
        : UI.emptyState('📷', isTeacher
          ? 'Chưa có album nào. Bấm "Tạo album" để đăng ảnh hoạt động của nhóm.'
          : 'Chưa có album ảnh nào của nhóm')}
      ${namCu.length ? `
        <div class="card mt-14" style="border-left:4px solid var(--info)">
          <div class="card-title">Album của các năm học trước</div>
          <div class="muted small" style="line-height:1.6">
            ${namCu.length} album thuộc nhóm đã đóng sau khi chuyển năm học.
            ${isTeacher || App.state.user.role === 'admin'
              ? 'Ảnh vẫn còn nguyên — tải về giữ lại hoặc xóa cho nhẹ máy chủ.'
              : 'Đây là ảnh của nhóm con từng học. Gia đình nên tải về giữ lại.'}
          </div>
        </div>
        <div class="grid-2">${namCu.map(a => this.albumCard(a)).join('')}</div>` : ''}`;
    if (isTeacher) document.getElementById('btn-new-album').onclick = () => this.openCreate();
  },

  albumCard(a) {
    return `
      <div class="card clickable" style="margin-bottom:0${a.lopDaDong || a.lopCuCuaCon ? ';opacity:.8' : ''}" onclick="App.navigate('#/albums/${UI.esc(a.id)}')">
        ${this.thumb(a.cover, a.id, 'aspect-ratio:4/3;border-radius:12px')}
        <div style="font-weight:700;margin-top:9px">${UI.esc(a.title)}</div>
        <div class="muted small" style="margin-top:3px">${UI.esc(a.photoCount)} ảnh · ${UI.esc(UI.fmtDateShort(a.date))}</div>
        <div class="mt-8">${UI.badge(a.className, 'gray')}${a.lopDaDong || a.lopCuCuaCon ? ` ${UI.badge(a.namHoc || 'nhóm cũ', 'orange')}` : ''}</div>
      </div>`;
  },

  // Khung ảnh dùng chung: ảnh thật thì hiện ảnh, ảnh cũ thì hiện emoji trên nền màu.
  thumb(photo, albumId, extraStyle = '') {
    if (photo && photo.file) {
      return `<img src="/api/albums/${UI.esc(albumId)}/photo/${UI.esc(photo.id)}" alt="${UI.esc(photo.caption || 'Ảnh của nhóm')}"
        loading="lazy" style="${extraStyle};width:100%;height:100%;object-fit:cover;background:var(--bg-2)">`;
    }
    const g = (photo && photo.g) || ['#e6eaf0', '#f2f4f8'];
    const emoji = (photo && photo.emoji) || '📷';
    return `<div style="${extraStyle};width:100%;background:linear-gradient(135deg, ${UI.esc(g[0])}, ${UI.esc(g[1])});display:flex;align-items:center;justify-content:center;font-size:44px">${UI.esc(emoji)}</div>`;
  },

  // ================= Chi tiết một album =================
  async renderDetail(root, id) {
    const a = await API.get(`/api/albums/${id}`);
    this._detail = a;
    root.innerHTML = `
      ${UI.pageHeader(a.title, a.canEdit ? { action: { id: 'btn-add-photo', label: 'Thêm ảnh', icon: 'plus' } } : {})}
      <div class="card">
        <div class="muted small">${UI.esc(a.className)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}${a.authorName ? ` · Đăng bởi ${UI.esc(a.authorName)}` : ''}</div>
        ${a.description ? `<p class="mt-8" style="font-size:.93rem;line-height:1.55">${UI.esc(a.description)}</p>` : ''}
        ${a.lopDaDong ? `<div class="muted small mt-8" style="line-height:1.6">
          Nhóm này đã đóng sau khi chuyển sang năm học mới${a.namHoc ? ` (năm ${UI.esc(a.namHoc)})` : ''},
          nên không đăng thêm ảnh được nữa. Gia đình nên tải về phần muốn giữ lại.
        </div>` : ''}
        ${a.nhacGanThe ? `<div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--warning);padding-left:10px">
          ${UI.esc(a.nhacGanThe.loiNhac)}
        </div>` : ''}
        ${a.nhacChoPhuHuynh ? `<div class="muted small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(a.nhacChoPhuHuynh)}
        </div>` : ''}
      </div>
      ${a.photos.length ? `
        <div class="photo-grid">
          ${a.photos.map((p, i) => `
            <div class="photo" style="${p.file ? '' : `background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])})`}">
              <div style="position:absolute;inset:0" onclick="App.views.albums.showPhoto(${i})">
                ${p.file
                  ? `<img src="/api/albums/${UI.esc(a.id)}/photo/${UI.esc(p.id)}" alt="${UI.esc(p.caption || 'Ảnh của nhóm')}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
                  : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:46px">${UI.esc(p.emoji)}</div>`}
              </div>
              ${p.caption ? `<div class="photo-cap" style="pointer-events:none">${UI.esc(p.caption)}</div>` : ''}
              ${a.canEdit ? `
                <button title="Xóa ảnh" onclick="event.stopPropagation();App.views.albums.deletePhoto('${UI.esc(p.id)}')"
                  style="position:absolute;top:6px;right:6px;width:30px;height:30px;border-radius:50%;background:rgba(15,23,42,.62);color:#fff;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)">
                  ${UI.icon('x', 15)}
                </button>
                <button title="Gắn thẻ bé có trong ảnh" onclick="event.stopPropagation();App.views.albums.moGanThe('${UI.esc(p.id)}')"
                  style="position:absolute;top:6px;left:6px;height:30px;padding:0 10px;border-radius:15px;background:rgba(15,23,42,.62);color:#fff;display:flex;align-items:center;gap:5px;font-size:.78rem;backdrop-filter:blur(6px)">
                  ${(p.beTrongAnh || []).length ? `👧 ${(p.beTrongAnh || []).length}` : '＋ gắn bé'}
                </button>` : ''}
            </div>`).join('')}
        </div>` : UI.emptyState('📷', a.canEdit ? 'Album chưa có ảnh nào. Bấm "Thêm ảnh" để đăng.' : 'Album chưa có ảnh')}
      ${a.canXoa ? `
        <button class="btn danger-soft block mt-14" onclick="App.views.albums.deleteAlbum()">Xóa album này</button>` : ''}`;

    if (a.canEdit) document.getElementById('btn-add-photo').onclick = () => this.openAddPhotos();
  },

  // Gắn thẻ bé có mặt trong một tấm ảnh.
  //
  // Đây là thứ quyết định ảnh hiện với nhà nào, nên nó phải nằm ngay trên tấm
  // ảnh, một lượt bấm là xong — cô đứng lớp không mở màn hình thứ ba để làm
  // việc này. Máy KHÔNG đoán thay bằng nhận diện khuôn mặt: chạy nhận diện
  // trên ảnh trẻ dưới 6 tuổi là tạo ra dữ liệu sinh trắc học của trẻ.
  async moGanThe(photoId) {
    const a = this._detail;
    if (!a) return;
    const anh = (a.photos || []).find(x => x.id === photoId);
    if (!anh) return;
    let dsBe = [];
    try {
      dsBe = await API.get(`/api/students?classId=${encodeURIComponent(a.classId || '')}`);
    } catch (_) { dsBe = []; }
    const trongNhom = dsBe.filter(b => !a.classId || b.classId === a.classId);
    const daGan = new Set((anh.beTrongAnh || []).map(b => b.id));

    UI.modal(`
      <div class="muted small" style="line-height:1.6">
        Chọn những bé <b>có mặt trong ảnh này</b>. Ảnh chỉ hiện với gia đình khác
        khi mọi bé trong ảnh đều có đồng ý chia sẻ — gia đình của chính bé thì
        luôn xem được ảnh của con mình.
      </div>
      <div class="mt-14" id="gt-ds" style="max-height:46vh;overflow-y:auto">
        ${trongNhom.length ? trongNhom.map(b => `
          <label class="list-row" style="cursor:pointer">
            <input type="checkbox" class="gt-be" value="${UI.esc(b.id)}" ${daGan.has(b.id) ? 'checked' : ''}
              style="width:20px;height:20px;flex:none;margin-right:10px">
            <div class="row-main"><div class="row-title">${UI.esc(b.name)}</div></div>
          </label>`).join('') : '<div class="muted small">Nhóm chưa có bé nào.</div>'}
      </div>
      <button class="btn primary block mt-14" id="gt-luu">${UI.icon('check', 18)} Lưu</button>
      <div class="hint mt-8">Bỏ chọn hết là gỡ thẻ khỏi ảnh.</div>
    `, 'Bé có trong ảnh');

    document.getElementById('gt-luu').onclick = async () => {
      const chon = [...document.querySelectorAll('#gt-ds .gt-be:checked')].map(x => x.value);
      try {
        await API.put(`/api/albums/${encodeURIComponent(a.id)}/photos/${encodeURIComponent(photoId)}/be`,
          { studentIds: chon });
        UI.toast(chon.length ? `Đã gắn ${chon.length} bé vào ảnh` : 'Đã gỡ thẻ khỏi ảnh', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Xem một ảnh phóng to.
  showPhoto(index) {
    const a = this._detail;
    if (!a || !a.photos[index]) return;
    const p = a.photos[index];
    UI.modal(`
      ${p.file
        ? `<img src="/api/albums/${UI.esc(a.id)}/photo/${UI.esc(p.id)}" alt="${UI.esc(p.caption || '')}"
             style="width:100%;max-height:66vh;object-fit:contain;border-radius:14px;background:var(--bg-2)">`
        : `<div style="height:260px;border-radius:14px;background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])});display:flex;align-items:center;justify-content:center;font-size:90px">${UI.esc(p.emoji)}</div>`}
      ${p.caption ? `<div class="center mt-14" style="font-weight:700">${UI.esc(p.caption)}</div>` : ''}
      <div class="muted small center mt-8">${UI.esc(a.title)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}</div>
      <div class="muted small center mt-8">Ảnh ${index + 1} / ${a.photos.length}</div>
    `, 'Xem ảnh');
  },

  // ================= Giáo viên: tạo album =================
  openCreate() {
    this._pending = [];
    UI.modal(`
      <div class="field">
        <label>Tên album</label>
        <input id="al-title" placeholder="Ví dụ: Hoạt động trải nghiệm tháng này">
      </div>
      <div class="field">
        <label>Mô tả</label>
        <textarea id="al-desc" placeholder="Đôi dòng giới thiệu về album gửi tới phụ huynh..."></textarea>
      </div>
      ${this.pickerMarkup()}
      <button class="btn primary block mt-14" id="al-submit">${UI.icon('plus', 18)} Đăng album</button>
    `, 'Tạo album mới');
    this.bindPicker();
    document.getElementById('al-submit').onclick = () => this.submitCreate();
  },

  // ================= Giáo viên: thêm ảnh vào album có sẵn =================
  openAddPhotos() {
    this._pending = [];
    UI.modal(`
      ${this.pickerMarkup()}
      <button class="btn primary block mt-14" id="al-submit">${UI.icon('plus', 18)} Tải ảnh lên</button>
    `, 'Thêm ảnh vào album');
    this.bindPicker();
    document.getElementById('al-submit').onclick = () => this.submitAddPhotos();
  },

  // Khối chọn ảnh dùng chung cho cả hai màn hình trên.
  pickerMarkup() {
    return `
      <div class="field">
        <label>Ảnh</label>
        <input type="file" id="al-file" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
        <button class="btn outline block" id="al-pick">📷 Chọn ảnh từ máy</button>
        <div class="hint">Chọn được nhiều ảnh cùng lúc. Trên điện thoại có thể chụp ảnh trực tiếp. Ảnh sẽ tự thu nhỏ trước khi gửi để tiết kiệm dung lượng.</div>
        <div id="al-preview" class="mt-14"></div>
      </div>`;
  },

  bindPicker() {
    const input = document.getElementById('al-file');
    document.getElementById('al-pick').onclick = () => input.click();
    input.onchange = () => this.handleFiles(input.files);
  },

  // Đọc ảnh người dùng chọn, thu nhỏ rồi đưa vào danh sách chờ.
  async handleFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;

    const zone = document.getElementById('al-preview');
    if (zone) zone.insertAdjacentHTML('beforeend', '<div class="muted small" id="al-loading">Đang xử lý ảnh…</div>');

    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        UI.toast(`Bỏ qua "${f.name}" — chỉ nhận ảnh JPG, PNG, WebP`, 'error');
        continue;
      }
      try {
        const dataUrl = await UI.nenAnh(f, { canhToiDa: 1600 });
        this._pending.push({ dataUrl, caption: '', name: f.name });
      } catch (_) {
        UI.toast(`Không đọc được ảnh "${f.name}"`, 'error');
      }
    }

    const loading = document.getElementById('al-loading');
    if (loading) loading.remove();
    this.renderPreview();
    document.getElementById('al-file').value = ''; // cho phép chọn lại đúng ảnh đó
  },

  // Thu nhỏ ảnh về tối đa 1600px và nén JPEG ngay trên máy người dùng.
  // Ảnh máy ảnh điện thoại thường 3-8MB, sau bước này chỉ còn vài trăm KB.
  compress(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const done = (bitmap, width, height) => {
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      // createImageBitmap xoay ảnh theo đúng chiều máy ảnh đã chụp.
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: 'from-image' })
          .then(bm => done(bm, bm.width, bm.height))
          .catch(() => this.compressViaImg(file, maxDim, quality).then(resolve, reject));
        return;
      }
      this.compressViaImg(file, maxDim, quality).then(resolve, reject);
    });
  },

  // Cách dự phòng cho trình duyệt cũ không có createImageBitmap.
  compressViaImg(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được tệp'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Ảnh hỏng'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  renderPreview() {
    const zone = document.getElementById('al-preview');
    if (!zone) return;
    if (!this._pending.length) {
      zone.innerHTML = '<div class="muted small">Chưa chọn ảnh nào.</div>';
      return;
    }
    zone.innerHTML = this._pending.map((p, i) => `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
        <img src="${p.dataUrl}" alt="" style="width:56px;height:56px;flex:none;border-radius:10px;object-fit:cover">
        <input class="al-cap" data-i="${i}" value="${UI.esc(p.caption)}" placeholder="Chú thích ảnh (không bắt buộc)">
        <button class="btn outline sm" style="flex:none;padding:9px 11px" title="Bỏ ảnh này"
          onclick="App.views.albums.removePending(${i})">${UI.icon('x', 16)}</button>
      </div>`).join('') +
      `<div class="muted small">Đã chọn ${this._pending.length} ảnh.</div>`;

    // Ghi nhớ chú thích ngay khi gõ để không mất khi danh sách vẽ lại.
    zone.querySelectorAll('.al-cap').forEach(inp => {
      inp.oninput = () => { this._pending[Number(inp.dataset.i)].caption = inp.value; };
    });
  },

  removePending(i) {
    this._pending.splice(i, 1);
    this.renderPreview();
  },

  // Gửi ảnh theo từng nhóm nhỏ để không vượt giới hạn dung lượng mỗi lần gửi.
  async uploadInBatches(photos, sendBatch, onProgress) {
    const BATCH = 3;
    let sent = 0;
    for (let i = 0; i < photos.length; i += BATCH) {
      const batch = photos.slice(i, i + BATCH);
      await sendBatch(batch);
      sent += batch.length;
      if (onProgress) onProgress(sent, photos.length);
    }
    return sent;
  },

  setSubmitting(text) {
    const btn = document.getElementById('al-submit');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = text;
  },

  async submitCreate() {
    const title = document.getElementById('al-title').value.trim();
    const description = document.getElementById('al-desc').value.trim();
    if (!title) return UI.toast('Cô nhập tên album giúp nhé', 'error');
    if (!this._pending.length) return UI.toast('Cô chọn ít nhất 1 ảnh nhé', 'error');

    const photos = this._pending;
    this._nhacGanTheSauKhiDang = false;
    try {
      this.setSubmitting('Đang tải ảnh lên…');
      // Tạo album với nhóm ảnh đầu, phần còn lại gửi bổ sung sau.
      const first = photos.slice(0, 3);
      const album = await API.post('/api/albums', { title, description, photos: first });

      const rest = photos.slice(3);
      if (rest.length) {
        await this.uploadInBatches(
          rest,
          batch => API.post(`/api/albums/${album.id}/photos`, { photos: batch }),
          (sent) => this.setSubmitting(`Đang tải ảnh lên… ${first.length + sent}/${photos.length}`),
        );
      }

      UI.toast(`Đã đăng album với ${photos.length} ảnh`, 'success');
      UI.closeModal();
      this._pending = [];
      App.navigate(`#/albums/${album.id}`);
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
      const btn = document.getElementById('al-submit');
      if (btn) { btn.disabled = false; btn.textContent = 'Đăng album'; }
    }
  },

  async submitAddPhotos() {
    const a = this._detail;
    if (!a) return;
    if (!this._pending.length) return UI.toast('Cô chọn ít nhất 1 ảnh nhé', 'error');

    const photos = this._pending;
    try {
      this.setSubmitting('Đang tải ảnh lên…');
      await this.uploadInBatches(
        photos,
        async (batch) => {
          const r = await API.post(`/api/albums/${a.id}/photos`, { photos: batch });
          if (r && r.nhacGanThe) this._nhacGanTheSauKhiDang = true;
          return r;
        },
        (sent) => this.setSubmitting(`Đang tải ảnh lên… ${sent}/${photos.length}`),
      );
      // Nhóm có gia đình từ chối thì nhắc gắn thẻ NGAY, không đợi cô mở lại
      // album: lúc vừa đăng là lúc duy nhất cô còn nhớ chắc trong ảnh là bé nào.
      UI.toast(this._nhacGanTheSauKhiDang
        ? `Đã thêm ${photos.length} ảnh. Cô bấm vào từng ảnh để gắn thẻ bé nhé.`
        : `Đã thêm ${photos.length} ảnh vào album`, 'success');
      UI.closeModal();
      this._pending = [];
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      const btn = document.getElementById('al-submit');
      if (btn) { btn.disabled = false; btn.textContent = 'Tải ảnh lên'; }
    }
  },

  async deletePhoto(photoId) {
    const a = this._detail;
    if (!a) return;
    if (!confirm('Xóa ảnh này khỏi album?')) return;
    try {
      await API.del(`/api/albums/${a.id}/photos/${photoId}`);
      UI.toast('Đã xóa ảnh', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async deleteAlbum() {
    const a = this._detail;
    if (!a) return;
    if (!confirm(`Xóa album "${a.title}" cùng toàn bộ ảnh bên trong?`)) return;
    try {
      await API.del(`/api/albums/${a.id}`);
      UI.toast('Đã xóa album', 'success');
      App.navigate('#/albums');
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
