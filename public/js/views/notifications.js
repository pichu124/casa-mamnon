// Phân hệ Thông báo.
// Danh sách thông báo (ghim trước, mới nhất trước), đánh dấu đã đọc,
// giáo viên tạo thông báo gửi nhóm mình hoặc toàn trường.
App.views.notifications = {
  CATS: {
    'Nhà trường': { emoji: '🏫', bg: '#e6efff' },
    'Nhóm lớp': { emoji: '📚', bg: '#f1e8fd' },
    'Y tế': { emoji: '🩺', bg: '#e3f7ec' },
    'Học phí': { emoji: '💳', bg: '#fef0e0' },
  },
  DEFAULT_CAT: { emoji: '📣', bg: '#eef1f5' },
  _list: [],
  _root: null,
  _aud: 'class',

  // Thông báo chỉ thêm vào chứ không ai dọn, nên máy chủ cắt ở 100 dòng một
  // lượt. Thông báo ghim luôn đứng đầu nên trang đầu không bao giờ rơi mất
  // thứ nhà trường muốn nổi lên.
  MOI_TRANG: 100,
  _conNua: false,

  async render(root) {
    this.batBamChuong();
    this._root = root;
    this._list = [];
    this._rieng = [];
    this._conNua = false;
    await this.taiThem();
    this.paint();
  },

  // ĐANG Ở MÀN THÔNG BÁO MÀ BẤM CHUÔNG THÌ PHẢI TẢI LẠI (góp ý 20/10, P1).
  //
  // Nút chuông chỉ gán `location.hash`; đứng sẵn ở #/notifications thì hash
  // không đổi, không có hashchange, nên chuông vừa lên "1" mà bấm vào vẫn là
  // danh sách cũ — đúng câu "báo có 1 thông báo mà vào không thấy gì". Bắt cú
  // bấm ở thanh dưới (gắn một lần), chỉ khi đang đứng đúng màn này.
  batBamChuong() {
    if (this._bamChuong) return;
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    this._bamChuong = true;
    nav.addEventListener('click', (e) => {
      const nut = e.target.closest('button');
      if (!nut || !String(nut.getAttribute('onclick') || '').includes("'#/notifications'")) return;
      if (location.hash !== '#/notifications') return;
      if (this._root && document.body.contains(this._root)) this.render(this._root);
    }, true); // bắt ở pha capture: chạy TRƯỚC onclick của nút, lúc hash chưa đổi —
    // từ màn khác bấm sang thì hash lúc này chưa phải #/notifications, không vẽ đôi.
  },

  // Tải thêm một trang thông báo, nối vào phần đã có.
  //
  // "Còn nữa hay hết" suy ra bằng cách ĐẾM: bộ lọc "ai được thấy gì" nằm ngay
  // trong câu truy vấn của máy chủ, không có bộ lọc nào chạy sau nó, nên số
  // dòng nhận về đúng bằng số dòng người này xem được.
  async taiThem() {
    // `_list` CHỈ là thông báo nhà trường, nên `bo` = độ dài của nó vẫn đúng.
    // Tin riêng về con (Đ137) nằm ở `_rieng`, tải một lần ở lượt đầu, và chỉ
    // ghép lúc VẼ (`danhSachVe`) — hai nguồn không giẫm lên con đếm của nhau.
    const laDau = this._list.length === 0;
    const [them, rieng] = await Promise.all([
      API.get(`/api/notifications?bo=${this._list.length}&soLuong=${this.MOI_TRANG}`),
      laDau && App.state.user.role === 'parent'
        ? API.get('/api/notifications/rieng-be').catch(() => [])
        : Promise.resolve(null),
    ]);
    this._list = this._list.concat(them);
    if (rieng) this._rieng = rieng;
    this._conNua = them.length >= this.MOI_TRANG;
  },

  // Danh sách để vẽ: ghim của nhà trường đứng đầu, còn lại mới nhất trước —
  // tin riêng về con xếp lẫn theo thời gian với thông báo nhà trường.
  danhSachVe() {
    return this._list.concat(this._rieng || [])
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
        || String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  timTin(id) {
    return this._list.find(x => x.id === id) || (this._rieng || []).find(x => x.id === id);
  },

  // Vẽ lại danh sách từ dữ liệu đã tải (không gọi lại API).
  paint() {
    const root = this._root;
    // Văn phòng cũng tạo được thông báo: máy chủ đã nhận vai admin từ lâu
    // (POST /api/notifications requireRole('teacher','admin')), chỉ thiếu mỗi
    // cái nút — văn phòng phải mượn tài khoản cô để gửi thông báo toàn trường.
    const taoDuoc = App.state.user.role === 'teacher' || App.state.user.role === 'admin';
    const ds = this.danhSachVe();
    const unread = ds.filter(n => !n.read).length;
    root.innerHTML = `
      ${UI.pageHeader('Thông báo', taoDuoc ? { action: { id: 'btn-new-notif', label: 'Tạo thông báo', icon: 'plus' } } : {})}
      ${unread ? `
        <div class="flex" style="margin-bottom:10px">
          <span class="muted small">${unread} thông báo chưa đọc</span>
          <span class="spacer"></span>
          <button class="btn sm outline" id="btn-read-all">${UI.icon('check', 16)} Đọc tất cả</button>
        </div>` : ''}
      ${ds.length
        ? `<div class="card">${ds.map(n => this.rowHtml(n)).join('')}</div>`
        : UI.emptyState('🔔', 'Chưa có thông báo nào')}
      ${this._conNua ? `
        <button class="btn outline block mt-14" id="btn-tb-cu-hon">
          ${UI.icon('plus', 16)} Xem thông báo cũ hơn
        </button>` : ''}`;
    if (taoDuoc) document.getElementById('btn-new-notif').onclick = () => this.openCreate();
    const btnAll = document.getElementById('btn-read-all');
    if (btnAll) btnAll.onclick = () => this.readAll();
    const themNua = document.getElementById('btn-tb-cu-hon');
    if (themNua) {
      themNua.onclick = async () => {
        themNua.disabled = true;
        themNua.textContent = 'Đang tải…';
        try { await this.taiThem(); this.paint(); }
        catch (err) { themNua.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
  },

  catOf(n) { return this.CATS[n.category] || this.DEFAULT_CAT; },

  // Đ124: thông báo phải nói rõ gửi cho ai — "Toàn trường" hay "Nhóm Chồi 2 ·
  // Cơ sở 1". Máy chủ đời cũ không trả hai ô này thì chuỗi rỗng, dòng như cũ.
  chuPhamVi(n) {
    if (n.toanTruong) return 'Toàn trường';
    if (n.tenNhom) return `Nhóm ${n.tenNhom}${n.tenCoSo ? ` · ${n.tenCoSo}` : ''}`;
    return '';
  },
  theoPhamVi(n) {
    if (n.toanTruong) return UI.badge('Gửi toàn trường', 'purple');
    if (n.tenNhom) return UI.badge(`Gửi nhóm ${n.tenNhom}${n.tenCoSo ? ` · ${n.tenCoSo}` : ''}`, 'blue');
    return '';
  },

  // Tên nhóm trong ô chọn — kèm tên cơ sở khi trường có từ hai cơ sở, để văn
  // phòng ba cơ sở không phải nhớ "Chồi 2" là Chồi 2 của cơ sở nào.
  nhanNhom(c) {
    const coSo = ((App.state.school || {}).coSo) || [];
    if (coSo.length < 2 || !c.campusId) return c.name;
    const cs = coSo.find(x => x.id === c.campusId);
    return cs ? `${c.name} · ${cs.name}` : c.name;
  },

  // Biểu tượng cho tin riêng về con (Đ137), theo `loai` máy chủ gửi.
  LOAI_RIENG: {
    'toi-lop': '📷', nhatky: '📔', 'suc-khoe': '🩺', album: '🖼️', 'bao-cao': '📘',
    'hanh-trinh': '🌱', 'ke-hoach': '🧭', cambridge: '🎓', 'dan-thuoc': '💊', 'xin-nghi': '📝',
  },

  rowHtml(n) {
    if (n.laRiengBe) {
      return `
      <div class="list-row clickable"${n.read ? '' : ' style="background:#f0f6ff;border-radius:10px"'} onclick="App.views.notifications.showDetail('${UI.esc(n.id)}')">
        <div class="row-icon" style="background:#e3f7ec;font-size:20px">${this.LOAI_RIENG[n.loai] || '🔔'}</div>
        <div class="row-main">
          <div class="row-title">${n.read ? '' : '<span style="color:var(--primary)">●</span> '}${UI.esc(n.title)}</div>
          <div class="row-sub">Về bé ${UI.esc(n.tenBe || '')} · ${UI.esc(UI.timeAgo(n.createdAt))}</div>
        </div>
        <span class="muted">${UI.icon('chevron', 18)}</span>
      </div>`;
    }
    const cat = this.catOf(n);
    return `
      <div class="list-row clickable"${n.read ? '' : ' style="background:#f0f6ff;border-radius:10px"'} onclick="App.views.notifications.showDetail('${UI.esc(n.id)}')">
        <div class="row-icon" style="background:${cat.bg};font-size:20px">${cat.emoji}</div>
        <div class="row-main">
          <div class="row-title">${n.read ? '' : '<span style="color:var(--primary)">●</span> '}${UI.esc(n.title)}${n.pinned ? ' 📌' : ''}</div>
          <div class="row-sub">${UI.esc(n.authorName)} · ${UI.esc(UI.timeAgo(n.createdAt))}${
            this.chuPhamVi(n) ? ` · ${UI.esc(this.chuPhamVi(n))}` : ''}</div>
        </div>
        <span class="muted">${UI.icon('chevron', 18)}</span>
      </div>`;
  },

  // Modal chi tiết + đánh dấu đã đọc.
  async showDetail(id) {
    const n = this.timTin(id);
    if (!n) return;
    if (n.laRiengBe) return this.moTinRiengBe(n);
    const cat = this.catOf(n);
    UI.modal(`
      <div class="flex mb-8">
        <div class="row-icon" style="background:${cat.bg};font-size:20px">${cat.emoji}</div>
        ${UI.badge(n.category || 'Khác', 'gray')}
        ${this.theoPhamVi(n)}
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

  // Tin riêng về con: đánh dấu đã đọc rồi mở thẳng màn có tin (ảnh tới lớp,
  // nhật ký…). Không có chỗ mở thì hiện nội dung tại chỗ.
  async moTinRiengBe(n) {
    if (!n.read) {
      try { await API.post(`/api/notifications/${n.id}/read`); n.read = true; this.paint(); App.refreshBadges(); } catch (_) {}
    }
    if (n.hash && /^#\//.test(n.hash)) {
      if (n.studentId && typeof App.setStudent === 'function') { try { App.setStudent(n.studentId); } catch (_) {} }
      location.hash = n.hash;
      return;
    }
    UI.modal(`
      <div class="flex mb-8">${UI.badge(`Về bé ${n.tenBe || ''}`, 'green')}</div>
      <h3 style="margin:6px 0 8px">${UI.esc(n.title)}</h3>
      <div style="white-space:pre-wrap;font-size:.94rem;line-height:1.55">${UI.esc(n.body || '')}</div>
      <div class="muted small mt-14">${UI.esc(UI.fmtDate(n.createdAt))} lúc ${UI.esc(UI.fmtTime(n.createdAt))}</div>
    `, 'Tin về con');
  },

  // Đánh dấu đã đọc tất cả.
  async readAll() {
    try {
      await API.post('/api/notifications/read-all');
      this._list.forEach(n => { n.read = true; });
      (this._rieng || []).forEach(n => { n.read = true; });
      UI.toast('Đã đánh dấu đã đọc tất cả thông báo', 'success');
      this.paint();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Cô và văn phòng: tạo thông báo mới ----
  openCreate() {
    this._aud = 'class';
    // Cô thấy nhóm mình phụ trách; văn phòng thấy các nhóm của trường (máy
    // chủ tự siết theo cơ sở khi gửi). Cô MỘT nhóm thì khỏi phải chọn — máy
    // chủ tự hiểu; từ hai nhóm trở lên, và văn phòng, thì phải nói rõ nhóm
    // nào — trước đây máy chủ hỏi "chọn nhóm giúp" mà màn hình không có ô nào
    // để chọn cả.
    // Văn phòng cơ sở chỉ thấy nhóm của cơ sở mình — nhóm cơ sở khác bấm vào
    // là máy chủ 403, mà một lựa chọn bấm vào là hỏng thì đừng liệt kê.
    const coSo = (App.state.user || {}).coSo || null;
    const nhom = App.nhomCuaCo().filter(c => !coSo || c.campusId === coSo);
    const laVanPhong = App.state.user.role === 'admin';
    const canChonNhom = laVanPhong || nhom.length > 1;
    UI.modal(`
      <div class="field">
        <label>Tiêu đề</label>
        <input id="nt-title" placeholder="Ví dụ: Mai nhóm mình chơi với nước, gia đình gửi thêm một bộ quần áo">
      </div>
      <div class="field">
        <label>Nội dung</label>
        <textarea id="nt-body" placeholder="Nội dung chi tiết gửi tới phụ huynh..."></textarea>
      </div>
      <div class="field">
        <label>Phân loại</label>
        <select id="nt-cat">
          <option>Nhóm lớp</option>
          <option>Nhà trường</option>
          <option>Y tế</option>
          <option>Học phí</option>
          <option>Khác</option>
        </select>
      </div>
      <div class="field">
        <label>Phạm vi gửi</label>
        <div class="seg" id="nt-aud" style="margin-bottom:0">
          <button class="active" data-aud="class" onclick="App.views.notifications.setAud('class')">${laVanPhong ? 'Một nhóm lớp' : 'Nhóm mình'}</button>
          <button data-aud="all" onclick="App.views.notifications.setAud('all')">Toàn trường</button>
        </div>
      </div>
      ${canChonNhom ? `
      <div class="field" id="nt-lop-o">
        <label>Gửi cho nhóm</label>
        <select id="nt-lop">
          ${nhom.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(this.nhanNhom(c))}</option>`).join('')}
        </select>
      </div>` : ''}
      <button class="btn primary block" onclick="App.views.notifications.submitCreate()">${UI.icon('send', 18)} Gửi thông báo</button>
    `, 'Tạo thông báo');
  },

  setAud(aud) {
    this._aud = aud;
    document.querySelectorAll('#nt-aud button').forEach(b => b.classList.toggle('active', b.dataset.aud === aud));
    // Ô chọn nhóm chỉ có nghĩa khi gửi cho một nhóm.
    const o = document.getElementById('nt-lop-o');
    if (o) o.style.display = aud === 'class' ? '' : 'none';
  },

  async submitCreate() {
    const title = document.getElementById('nt-title').value.trim();
    const body = document.getElementById('nt-body').value.trim();
    const category = document.getElementById('nt-cat').value;
    if (!title) return UI.toast('Vui lòng nhập tiêu đề thông báo', 'error');
    if (!body) return UI.toast('Vui lòng nhập nội dung thông báo', 'error');
    const goi = { title, body, category, audience: this._aud };
    const lop = document.getElementById('nt-lop');
    if (this._aud === 'class' && lop) goi.classId = lop.value;
    try {
      await API.post('/api/notifications', goi);
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
          ${['Nhóm lớp', 'Nhà trường', 'Y tế', 'Học phí', 'Khác']
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
