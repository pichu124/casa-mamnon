// Phân hệ Thông báo.
// Danh sách thông báo (ghim trước, mới nhất trước), đánh dấu đã đọc. Cô gửi
// cho cả nhóm hoặc vài gia đình tích chọn; văn phòng gửi thêm được toàn trường
// và ghim / bỏ ghim (Đ260b).
App.views.notifications = {
  CATS: {
    'Nhà trường': { emoji: '🏫', bg: '#e6efff' },
    'Nhóm lớp': { emoji: '📚', bg: '#f1e8fd' },
    'Y tế': { emoji: '🩺', bg: '#e3f7ec' },
    'Học phí': { emoji: '💳', bg: '#fef0e0' },
  },
  DEFAULT_CAT: { emoji: '📣', bg: '#eef1f5' },
  // Đ260l: gia đình chỉ thấy tin từ ngày bé nhập học — kể cả tin ghim.
  GOI_Y_NHAP_HOC: 'Gia đình nhập học sau ngày đăng sẽ không thấy tin này — cần thì gửi lại.',
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
    //
    // Cô, văn phòng, quản lý có chuông riêng (Đ260c) ở `/rieng-nv`: cùng hình
    // dạng, cùng chỗ `_rieng`, cùng cách ghép.
    const laDau = this._list.length === 0;
    const duongRieng = App.state.user.role === 'parent' ? '/api/notifications/rieng-be' : '/api/notifications/rieng-nv';
    const [them, rieng] = await Promise.all([
      API.get(`/api/notifications?bo=${this._list.length}&soLuong=${this.MOI_TRANG}`),
      laDau ? API.get(duongRieng).catch(() => []) : Promise.resolve(null),
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
  // Đ260b: tin gửi riêng vài gia đình nói thêm "· 2 gia đình" (chỉ cô và văn
  // phòng nhận ô `soBeNhan`).
  chuPhamVi(n) {
    if (n.toanTruong) return 'Toàn trường';
    if (n.tenNhom) return `Nhóm ${n.tenNhom}${n.tenCoSo ? ` · ${n.tenCoSo}` : ''}${n.soBeNhan ? ` · ${n.soBeNhan} gia đình` : ''}`;
    return '';
  },
  theoPhamVi(n) {
    if (n.toanTruong) return UI.badge('Gửi toàn trường', 'purple');
    if (n.tenNhom) {
      return UI.badge(n.soBeNhan
        ? `Gửi riêng ${n.soBeNhan} gia đình nhóm ${n.tenNhom}`
        : `Gửi nhóm ${n.tenNhom}${n.tenCoSo ? ` · ${n.tenCoSo}` : ''}`, 'blue');
    }
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
    // Chuông riêng của cô / văn phòng / quản lý (Đ260c).
    'xin-nghi-ket-qua': '📝', 'xin-nghi-huy': '📝', 'tin-nhan': '💬', 'khao-sat': '📋',
    'ke-hoach-gui': '🧭', 'ke-hoach-duyet': '🧭', 'ke-hoach-tra-lai': '🧭', 'de-xuat': '🧭', 'de-xuat-quyet': '🧭',
    'bao-cao-gui': '📘', 'bao-cao-duyet': '📘', 'bao-cao-tra-lai': '📘', 'lien-he-khan': '☎️',
  },

  // Dòng phụ của tin riêng: về bé nào (hoặc nhóm nào), và mấy lần nếu đã gộp.
  dongPhuRieng(n, coGio = true) {
    const ve = n.tenBe ? `Về bé ${n.tenBe}` : (n.tenNhom ? `Nhóm ${n.tenNhom}` : '');
    return [ve, n.soLan > 1 ? `${n.soLan} lần` : '', coGio ? UI.timeAgo(n.createdAt) : ''].filter(Boolean).join(' · ');
  },

  rowHtml(n) {
    if (n.laRiengBe || n.laRiengNv) {
      return `
      <div class="list-row clickable"${n.read ? '' : ' style="background:#f0f6ff;border-radius:10px"'} onclick="App.views.notifications.showDetail('${UI.esc(n.id)}')">
        <div class="row-icon" style="background:#e3f7ec;font-size:20px">${this.LOAI_RIENG[n.loai] || '🔔'}</div>
        <div class="row-main">
          <div class="row-title">${n.read ? '' : '<span style="color:var(--primary)">●</span> '}${UI.esc(n.title)}</div>
          <div class="row-sub">${UI.esc(this.dongPhuRieng(n))}</div>
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
    if (n.laRiengBe || n.laRiengNv) return this.moTinRiengBe(n);
    // G2 (góp ý 20/10): thông báo khảo sát mở thẳng khảo sát. Người sửa / thu
    // hồi được thông báo này thì vẫn vào hộp chi tiết, có thêm nút mở.
    if (this.coLienKet(n) && !n.coTheSua) return this.moLienKet(n.id);
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
      ${this.coLienKet(n) ? `
        <button class="btn primary block mt-14" onclick="App.views.notifications.moLienKet('${UI.esc(n.id)}')">${UI.esc(this.chuLienKet(n))}</button>` : ''}
      ${App.state.user.role === 'admin' ? `
        <button class="btn outline block mt-14" onclick="App.views.notifications.datGhim('${UI.esc(n.id)}', ${n.pinned ? 'false' : 'true'})">${
          n.pinned ? 'Bỏ ghim' : '📌 Ghim lên đầu'}</button>
        <div class="hint" id="nt-ct-goi-y">${UI.esc(this.GOI_Y_NHAP_HOC)}</div>` : ''}
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

  coLienKet(n) { return !!(n && n.lienKet && /^#\//.test(n.lienKet)); },
  // Nút nói đúng nơi sẽ mở ra (Đ260b).
  chuLienKet(n) {
    const lk = String((n && n.lienKet) || '');
    if (/^#\/surveys(\/|$)/.test(lk)) return 'Mở khảo sát';
    if (/^#\/albums(\/|$)/.test(lk)) return 'Xem album';
    if (/^#\/menu(\/|$)/.test(lk)) return 'Xem thực đơn';
    if (/^#\/timetable\/lich(\/|$)/.test(lk)) return 'Xem lịch sinh hoạt';
    return 'Xem chi tiết';
  },

  // GHIM / BỎ GHIM (Đ260b) — chỉ văn phòng, ban giám hiệu; máy chủ tự chặn vai
  // khác và tin của cơ sở khác.
  async datGhim(id, ghim) {
    try {
      await API.put(`/api/notifications/${encodeURIComponent(id)}`, { pinned: !!ghim });
      UI.toast(ghim ? 'Đã ghim thông báo lên đầu' : 'Đã bỏ ghim thông báo', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Đánh dấu đã đọc rồi mở màn của liên kết. Màn đích tự hỏi máy chủ, nên
  // liên kết không mở thêm quyền nào.
  async moLienKet(id) {
    const n = this.timTin(id);
    if (!this.coLienKet(n)) return;
    if (!n.read) {
      try { await API.post(`/api/notifications/${n.id}/read`); n.read = true; App.refreshBadges(); } catch (_) {}
    }
    UI.closeModal();
    location.hash = n.lienKet;
  },

  // Tin riêng về con: đánh dấu đã đọc rồi mở thẳng màn có tin (ảnh tới lớp,
  // nhật ký…). Không có chỗ mở thì hiện nội dung tại chỗ.
  async moTinRiengBe(n) {
    if (!n.read) {
      try { await API.post(`/api/notifications/${n.id}/read`); n.read = true; this.paint(); App.refreshBadges(); } catch (_) {}
    }
    if (n.hash && /^#\//.test(n.hash)) {
      // Chỉ gia đình chọn bé theo tin: màn của cô và văn phòng tự vẽ cả nhóm.
      if (n.laRiengBe && n.studentId && typeof App.setStudent === 'function') { try { App.setStudent(n.studentId); } catch (_) {} }
      location.hash = n.hash;
      return;
    }
    UI.modal(`
      <div class="flex mb-8">${UI.badge(this.dongPhuRieng(n, false) || 'Việc của mình', 'green')}</div>
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
    this._dsBe = null;
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
          <button class="active" data-aud="class" onclick="App.views.notifications.setAud('class')">${laVanPhong ? 'Một nhóm lớp' : 'Cả nhóm'}</button>
          <button data-aud="chon" onclick="App.views.notifications.setAud('chon')">Chọn gia đình</button>
          ${laVanPhong ? `<button data-aud="all" onclick="App.views.notifications.setAud('all')">Toàn trường</button>` : ''}
        </div>
      </div>
      ${canChonNhom ? `
      <div class="field" id="nt-lop-o">
        <label>Gửi cho nhóm</label>
        <select id="nt-lop" onchange="App.views.notifications.doiNhomChon('nt')">
          ${nhom.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(this.nhanNhom(c))}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="field" id="nt-gd-o" style="display:none">
        <label>Gia đình nhận</label>
        <div id="nt-gd"></div>
      </div>
      ${laVanPhong ? `
      <div class="field">
        <label class="flex" style="gap:8px;font-weight:600"><input type="checkbox" id="nt-ghim"> 📌 Ghim lên đầu danh sách</label>
        <div class="hint" id="nt-ghim-goi-y">${UI.esc(this.GOI_Y_NHAP_HOC)}</div>
      </div>` : ''}
      <button class="btn primary block" onclick="App.views.notifications.submitCreate()">${UI.icon('send', 18)} Gửi thông báo</button>
    `, 'Tạo thông báo');
  },

  // PHẠM VI GỬI (Đ260b). Toàn trường là việc của văn phòng, ban giám hiệu; cô
  // gửi cho cả nhóm, hoặc tích chọn vài gia đình. Máy chủ chặn cô gửi toàn
  // trường bằng 403 — nút ấy không có trên màn của cô để không ai bấm vào một
  // lỗi. Ba hàm dưới dùng chung với form Tạo khảo sát (public/js/views/
  // surveys.js); `tienTo` là 'nt' hoặc 'sv'.
  //
  // Đổi phạm vi: ô nhóm khi gửi một nhóm, danh sách tích khi chọn gia đình.
  doiPhamVi(tienTo, aud) {
    document.querySelectorAll(`#${tienTo}-aud button`).forEach(b => b.classList.toggle('active', b.dataset.aud === aud));
    const lop = document.getElementById(`${tienTo}-lop-o`);
    if (lop) lop.style.display = aud === 'all' ? 'none' : '';
    const gd = document.getElementById(`${tienTo}-gd-o`);
    if (gd) gd.style.display = aud === 'chon' ? '' : 'none';
    if (aud === 'chon') this.veChonGiaDinh(tienTo);
  },

  doiNhomChon(tienTo) {
    const gd = document.getElementById(`${tienTo}-gd-o`);
    if (gd && gd.style.display !== 'none') this.veChonGiaDinh(tienTo);
  },

  // Danh sách bé của nhóm đang chọn, mỗi bé một ô tích "Gia đình bé …".
  // `/api/students` đã cắt theo phạm vi người hỏi (cô: nhóm mình; văn phòng:
  // cơ sở mình). Cô một nhóm không có ô chọn nhóm: mọi bé đều của nhóm ấy.
  _dsBe: null,
  async veChonGiaDinh(tienTo) {
    const o = document.getElementById(`${tienTo}-gd`);
    if (!o) return;
    const lop = document.getElementById(`${tienTo}-lop`);
    const nhom = lop ? lop.value : '';
    o.innerHTML = '<div class="muted small">Đang tải danh sách bé…</div>';
    let ds = [];
    try {
      if (!this._dsBe) this._dsBe = await API.get('/api/students');
      ds = this._dsBe.filter(b => !nhom || b.classId === nhom);
    } catch (err) {
      o.innerHTML = `<div class="muted small">${UI.esc(err.message)}</div>`;
      return;
    }
    o.innerHTML = ds.length ? `
      <label class="flex" style="gap:8px;padding:6px 0;font-weight:600">
        <input type="checkbox" id="${tienTo}-gd-tat-ca"> Chọn tất cả
      </label>
      ${ds.map(b => `
      <label class="flex" style="gap:8px;padding:6px 0">
        <input type="checkbox" class="${tienTo}-gd-be" value="${UI.esc(b.id)}"> Gia đình bé ${UI.esc(b.name)}
      </label>`).join('')}`
      : '<div class="muted small">Nhóm này chưa có bé nào.</div>';
    const tatCa = document.getElementById(`${tienTo}-gd-tat-ca`);
    const cacO = [...o.querySelectorAll(`.${tienTo}-gd-be`)];
    if (tatCa) tatCa.onchange = () => cacO.forEach(c => { c.checked = tatCa.checked; });
    cacO.forEach(c => { c.onchange = () => { if (tatCa) tatCa.checked = cacO.every(x => x.checked); }; });
  },

  beDaChon(tienTo) {
    return [...document.querySelectorAll(`.${tienTo}-gd-be:checked`)].map(c => c.value);
  },

  setAud(aud) {
    this._aud = aud;
    this.doiPhamVi('nt', aud);
  },

  async submitCreate() {
    const title = document.getElementById('nt-title').value.trim();
    const body = document.getElementById('nt-body').value.trim();
    const category = document.getElementById('nt-cat').value;
    if (!title) return UI.toast('Vui lòng nhập tiêu đề thông báo', 'error');
    if (!body) return UI.toast('Vui lòng nhập nội dung thông báo', 'error');
    const goi = { title, body, category, audience: this._aud === 'all' ? 'all' : 'class' };
    const lop = document.getElementById('nt-lop');
    if (this._aud !== 'all' && lop) goi.classId = lop.value;
    if (this._aud === 'chon') {
      goi.nguoiNhan = this.beDaChon('nt');
      if (!goi.nguoiNhan.length) return UI.toast('Vui lòng tích chọn ít nhất một gia đình', 'error');
    }
    const ghim = document.getElementById('nt-ghim');
    if (ghim && ghim.checked) goi.pinned = true;
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

  // MỞ MỘT MÀN LÀ ĐÃ ĐỌC CHUÔNG CỦA MÀN ẤY (Đ260c).
  //
  // Cô mở màn Xin phép thì dòng "Gia đình xin nghỉ cho bé…" thôi đỏ; máy chủ
  // tự bỏ qua dòng phải mở đúng mục mới tính (tin nhắn: mở đúng cuộc). Chỉ hỏi
  // khi chuông đang có số, nên không thêm lượt gọi nào cho người không có việc.
  // Mở thẳng một màn bằng tải lại trang thì không có `hashchange` — dòng tắt
  // ở lần đổi màn kế tiếp.
  daXemMan() {
    try {
      const u = App.state.user;
      if (!u || u.role === 'parent') return;
      if (typeof App.moduleEnabled === 'function' && !App.moduleEnabled('notifications')) return;
      if (!((App.state.badges || {}).thongbao > 0)) return;
      const man = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || '');
      if (!man || man === 'notifications') return;
      API.post('/api/notifications/rieng-nv/da-xem', { man })
        .then((r) => { if (r && r.marked) App.refreshBadges(); })
        .catch(() => { /* chuông là việc phụ */ });
    } catch (_) { /* không bao giờ chặn việc đổi màn */ }
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

// Gắn MỘT lần khi tệp nạp (index.html nạp sẵn tệp này), không đợi mở màn Thông báo.
window.addEventListener('hashchange', () => {
  const v = App.views && App.views.notifications;
  if (v && typeof v.daXemMan === 'function') v.daXemMan();
});
