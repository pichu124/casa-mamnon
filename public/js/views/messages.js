// Phân hệ Nhắn tin.
// Danh sách hội thoại (giáo viên ↔ phụ huynh, nhóm lớp) + phòng chat có polling tin mới.
App.views.messages = {
  _timer: null,
  _lastTs: null,
  _lastDay: null,
  _convId: null,
  _type: null,
  _contacts: [],

  async render(root, params) {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (params && params[0] === 'gui-nhieu') return this.renderGuiNhieu(root);
    if (params && params[0] === 'quan-ly') {
      return params[1] ? this.renderXem(root, params[1]) : this.renderQuanLy(root);
    }
    if (params && params[0]) return this.renderChat(root, params[0]);
    return this.renderList(root);
  },

  // Ai trong khối quản trị xem được hội thoại cô – gia đình (Đ242F) — cùng danh
  // sách với `CHUC_VU_XEM_TIN_CO` ở routes/messages.js. Chỉ để không mời bấm vào
  // thứ sẽ bị từ chối; máy chủ vẫn là người chốt.
  laQuanLyTinCo() {
    const u = App.state.user || {};
    return u.role === 'admin'
      && (u.chucVu == null || ['hieu-truong', 'quanly-coso', 'vanphong-coso'].includes(u.chucVu));
  },

  // MINH BẠCH VỚI NGƯỜI BỊ XEM (Đ242F, Nghị định 13/2023): cô và gia đình được
  // báo trước, ngay trên màn Nhắn tin của mình, rằng quản lý có thể xem.
  dongMinhBach() {
    return '<div class="muted small" id="msg-minh-bach" style="margin:0 2px 12px;line-height:1.5">'
      + 'Để bảo đảm chất lượng trao đổi, ban giám hiệu và quản lý cơ sở có thể xem '
      + 'các cuộc trò chuyện giữa cô và gia đình.</div>';
  },

  // ---- Danh sách hội thoại ----
  //
  // Máy chủ cắt ở một trang. Hội thoại cô ↔ gia đình chỉ sinh ra chứ không bao
  // giờ đóng, nên danh sách này dài thêm mỗi năm học mà không có gì chặn. Cắt
  // mà màn hình không có đường đi tiếp thì với người dùng đó là GIẤU.
  MOI_TRANG: 40,
  _daTai: [],
  _conNua: false,
  _root: null,

  async renderList(root) {
    this._root = root;
    this._daTai = [];
    this._conNua = false;
    await this.taiThemHoiThoai();
    this.veDanhSach();
  },

  // Tải thêm một trang hội thoại, nối vào phần đã có.
  //
  // "Còn nữa hay hết" suy ra bằng cách ĐẾM, y như màn Thông báo và màn Album:
  // quyền tham gia hội thoại nằm ngay trong phép nối của câu truy vấn máy chủ,
  // không có bộ lọc nào chạy sau nó, nên số dòng nhận về đúng bằng số dòng
  // người này xem được.
  async taiThemHoiThoai() {
    const data = await API.get(
      `/api/messages?bo=${this._daTai.length}&soLuong=${this.MOI_TRANG}`);
    // Danh sách liên hệ chỉ lấy ở lượt đầu — nó không đổi giữa các trang.
    if (!this._daTai.length) this._contacts = data.contacts || [];
    const them = data.conversations || [];
    this._daTai = this._daTai.concat(them);
    this._conNua = them.length >= this.MOI_TRANG;
  },

  // Vẽ lại danh sách từ dữ liệu đã tải (không gọi lại máy chủ).
  veDanhSach() {
    const root = this._root;
    const convs = this._daTai;
    const laQuanTri = App.state.user.role === 'admin';
    root.innerHTML = `
      ${UI.pageHeader('Nhắn tin', { action: { id: 'msg-new', label: 'Trò chuyện mới', icon: 'plus' } })}
      ${laQuanTri ? '' : this.dongMinhBach()}
      ${App.state.user.role === 'teacher' ? `
        <button class="btn outline block mb-8" id="msg-nhieu-nha">
          ${UI.icon('send', 16)} Nhắn nhiều gia đình
        </button>` : ''}
      ${this.laQuanLyTinCo() ? `
        <button class="btn outline block mb-8" id="msg-quan-ly">
          ${UI.icon('chat', 16)} Hội thoại cô – gia đình
        </button>` : ''}
      ${convs.length ? `<div class="card">
        ${convs.map(cv => `
          <div class="chat-list-row" onclick="App.navigate('#/messages/${UI.esc(cv.id)}')">
            ${UI.avatar(cv.avatar, 46)}
            <div style="flex:1;min-width:0">
              <div style="font-weight:${cv.unreadCount > 0 ? 800 : 600}">${UI.esc(cv.title)}</div>
              ${cv.subtitle ? `<div class="chat-list-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:.76rem">${UI.esc(cv.subtitle)}</div>` : ''}
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:.84rem">${cv.lastMessage ? `${UI.esc(cv.lastMessage.senderName)}: ${cv.lastMessage.daThuHoi ? '<i>Tin nhắn đã được thu hồi</i>' : UI.esc(cv.lastMessage.text)}` : 'Chưa có tin nhắn'}</div>
            </div>
            <div style="text-align:right;flex:none">
              ${cv.lastMessage ? `<div class="muted" style="font-size:.74rem">${UI.esc(UI.timeAgo(cv.lastMessage.createdAt))}</div>` : ''}
              ${cv.unreadCount > 0 ? `<span style="display:inline-block;background:var(--danger);color:#fff;border-radius:10px;padding:1px 7px;font-size:.7rem;font-weight:700;margin-top:3px">${cv.unreadCount > 99 ? '99+' : cv.unreadCount}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>` : UI.emptyState('💬', App.state.user.role === 'admin'
        ? 'Chưa có gia đình nào nhắn tới văn phòng.'
        : 'Chưa có cuộc trò chuyện nào. Bấm "Trò chuyện mới" để bắt đầu.')}
      ${this._conNua ? `
        <button class="btn outline block mt-14" id="btn-ht-cu-hon">
          ${UI.icon('plus', 16)} Xem hội thoại cũ hơn
        </button>` : ''}`;
    document.getElementById('msg-new').onclick = () => this.openNew();
    const nutQuanLy = document.getElementById('msg-quan-ly');
    if (nutQuanLy) nutQuanLy.onclick = () => App.navigate('#/messages/quan-ly');
    const nutNhieu = document.getElementById('msg-nhieu-nha');
    if (nutNhieu) nutNhieu.onclick = () => App.navigate('#/messages/gui-nhieu');
    const themNua = document.getElementById('btn-ht-cu-hon');
    if (themNua) {
      themNua.onclick = async () => {
        themNua.disabled = true;
        themNua.textContent = 'Đang tải…';
        try { await this.taiThemHoiThoai(); this.veDanhSach(); }
        catch (err) { themNua.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
  },

  // Hộp chọn nơi bắt đầu một cuộc trò chuyện (Đ151).
  //
  // Nhà trường 10/09: *"giao diện phụ huynh phải nhắn tin với LỚP và nhắn tin
  // với VĂN PHÒNG, chứ mình cũng k muốn là nhắn tin với từng cô riêng lẻ"*.
  // Nên danh sách này với gia đình là hai dòng cô cho MỖI bé, cộng MỘT dòng
  // "Văn phòng nhà trường" cho mỗi cơ sở có con học — không phải danh sách các
  // cô. Dòng văn phòng là hộp thư riêng của TÀI KHOẢN này (góp ý 16/10 PH1,
  // phương án A chủ dự án chọn 18/10 — lib/kenh-van-phong.js), không gắn với bé
  // nào. Với cô thì là các gia đình trong nhóm mình.
  //
  // Văn phòng KHÔNG có dòng nào ở đây — văn phòng trả lời gia đình, còn muốn
  // nói với cả trường thì đã có Thông báo. Câu trong ô trống nói rõ điều đó
  // thay vì để văn phòng đứng nhìn một danh sách rỗng mà đoán.
  openNew() {
    const laVanPhong = App.state.user.role === 'admin';
    // `coNguoiNhan: false`: nhóm của bé chưa có cô nào giữ vai này (góp ý
    // 20/10, F6). Dòng vẫn hiện và vẫn mở được cuộc cũ, nhưng nói rõ trước khi
    // gia đình gõ một tin không ai đọc — máy chủ cũng không nhận tin mới.
    UI.modal(this._contacts.length ? this._contacts.map((c, i) => `
      <div class="list-row clickable" onclick="App.views.messages.pickContact(${i})"${c.coNguoiNhan === false ? ' style="opacity:.6"' : ''}>
        ${UI.avatar(c.avatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(c.name)}</div>
          ${c.subtitle ? `<div class="row-sub">${UI.esc(c.subtitle)}</div>` : ''}
          ${c.coNguoiNhan === false ? '<div class="row-sub">Nhóm của bé hiện chưa có cô nhận tin ở mục này</div>' : ''}
        </div>
      </div>`).join('') : UI.emptyState('💬', laVanPhong
        ? 'Văn phòng trả lời ngay trong cuộc gia đình đã mở. Muốn nhắn cho cả trường '
          + 'hay cả một nhóm thì dùng mục Thông báo nhé.'
        : 'Chưa có nơi nào để bắt đầu trò chuyện.'),
    'Trò chuyện mới');
  },

  // Nhận VỊ TRÍ trong danh sách, không nhận mã: một liên hệ nay được xác định
  // bằng hai thứ (kênh + bé), mà nhét hai thứ vào một chuỗi rồi tách ra là chỗ
  // để lọt ký tự lạ vào chuỗi HTML.
  async pickContact(i) {
    const c = this._contacts[Number(i)];
    if (!c) return;
    try {
      let id = c.existingConversationId;
      if (!id) {
        const r = await API.post('/api/messages/start', { kenh: c.kenh, studentId: c.studentId });
        id = r.id;
      }
      UI.closeModal();
      App.navigate('#/messages/' + id);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Một tin cho nhiều gia đình (Đ242F, F2) ----
  //
  // Mỗi gia đình nhận trong cuộc riêng của nhà mình — các nhà không thấy tên
  // nhau. Lựa chọn giữ qua lúc đổi nhóm, để cô phụ trách hai nhóm chọn được bé
  // của cả hai trong một lượt.
  async renderGuiNhieu(root) {
    const chon = await API.get('/api/messages/chon-be');
    this._chonGN = chon;
    this._daChonGN = new Set();
    const loc = this._locGN = { coSo: chon.coSo.length === 1 ? chon.coSo[0].id : '', nhom: '' };
    const nhomDau = chon.nhom.filter(n => !loc.coSo || n.coSo === loc.coSo);
    if (nhomDau.length === 1) loc.nhom = nhomDau[0].id;
    root.innerHTML = `
      ${UI.pageHeader('Nhắn nhiều gia đình')}
      <div class="muted small" style="margin:0 2px 12px;line-height:1.5">
        Mỗi gia đình nhận tin trong cuộc trò chuyện riêng của nhà mình. Các gia đình không thấy tên nhau.
      </div>
      <div class="card">
        ${chon.coSo.length > 1 ? '<div class="field"><label for="gn-coso">Cơ sở</label><select id="gn-coso"></select></div>' : ''}
        ${chon.nhom.length > 1 ? '<div class="field"><label for="gn-nhom">Nhóm lớp</label><select id="gn-nhom"></select></div>' : ''}
        <label class="list-row" style="gap:10px;cursor:pointer">
          <input type="checkbox" id="gn-tat-ca" style="width:22px;height:22px">
          <span class="row-title">Chọn tất cả</span>
        </label>
        <div id="gn-ds"></div>
        <div class="muted small mt-8" id="gn-dem"></div>
      </div>
      <div class="card mt-14">
        <div class="field"><label for="gn-noi-dung">Nội dung</label>
          <textarea id="gn-noi-dung" rows="4" maxlength="2000" placeholder="Viết lời nhắn gửi các gia đình…"></textarea></div>
        <button class="btn block" id="gn-gui">${UI.icon('send', 16)} Gửi</button>
      </div>
      <div id="gn-ket-qua" class="mt-14"></div>`;
    const oCoSo = document.getElementById('gn-coso');
    if (oCoSo) oCoSo.onchange = (e) => { loc.coSo = e.target.value; loc.nhom = ''; this.veChonGN(); };
    const oNhom = document.getElementById('gn-nhom');
    if (oNhom) oNhom.onchange = (e) => { loc.nhom = e.target.value; this.veChonGN(); };
    document.getElementById('gn-tat-ca').onchange = (e) => {
      for (const b of this.beDangHienGN()) {
        if (e.target.checked) this._daChonGN.add(b.id); else this._daChonGN.delete(b.id);
      }
      this.veChonGN();
    };
    document.getElementById('gn-gui').onclick = () => this.guiNhieu();
    this.veChonGN();
  },

  // Bé đang hiện trong danh sách — chỉ bé có tài khoản gia đình mới chọn được.
  beDangHienGN() {
    const loc = this._locGN;
    return loc.nhom ? this._chonGN.be.filter(b => b.nhom === loc.nhom && b.coGiaDinh) : [];
  },

  veChonGN() {
    const chon = this._chonGN;
    const loc = this._locGN;
    const tuyChon = (ds, chonSan, nhanTrong) => `<option value="">${UI.esc(nhanTrong)}</option>`
      + ds.map(x => `<option value="${UI.esc(x.id)}"${x.id === chonSan ? ' selected' : ''}>${UI.esc(x.ten)}</option>`).join('');
    const oCoSo = document.getElementById('gn-coso');
    if (oCoSo) oCoSo.innerHTML = tuyChon(chon.coSo, loc.coSo, 'Mọi cơ sở');
    const oNhom = document.getElementById('gn-nhom');
    if (oNhom) oNhom.innerHTML = tuyChon(chon.nhom.filter(n => !loc.coSo || n.coSo === loc.coSo), loc.nhom, 'Chọn nhóm lớp');
    const o = document.getElementById('gn-ds');
    const tatCa = document.getElementById('gn-tat-ca');
    const ds = loc.nhom ? chon.be.filter(b => b.nhom === loc.nhom) : [];
    if (!loc.nhom) o.innerHTML = '<p class="muted small">Chọn một nhóm lớp để hiện danh sách các bé.</p>';
    else if (!ds.length) o.innerHTML = '<p class="muted small">Nhóm này chưa có bé nào.</p>';
    else {
      o.innerHTML = ds.map(b => `
        <label class="list-row gn-be" style="gap:10px;cursor:pointer${b.coGiaDinh ? '' : ';opacity:.6'}">
          <input type="checkbox" value="${UI.esc(b.id)}" style="width:22px;height:22px"
            ${this._daChonGN.has(b.id) ? 'checked' : ''}${b.coGiaDinh ? '' : ' disabled'}>
          <span class="row-main"><span class="row-title">${UI.esc(b.ten)}</span>
            ${b.coGiaDinh ? '' : '<span class="row-sub">Bé chưa có tài khoản gia đình trên app</span>'}</span>
        </label>`).join('');
      for (const el of o.querySelectorAll('input[type=checkbox]')) {
        el.onchange = () => {
          if (el.checked) this._daChonGN.add(el.value); else this._daChonGN.delete(el.value);
          this.veChonGN();
        };
      }
    }
    const hien = this.beDangHienGN();
    tatCa.checked = hien.length > 0 && hien.every(b => this._daChonGN.has(b.id));
    tatCa.disabled = !hien.length;
    document.getElementById('gn-dem').textContent = this._daChonGN.size
      ? `Đã chọn gia đình của ${this._daChonGN.size} bé` : 'Chưa chọn bé nào';
  },

  async guiNhieu() {
    const nut = document.getElementById('gn-gui');
    const o = document.getElementById('gn-noi-dung');
    const text = o.value.trim();
    if (!this._daChonGN.size) return UI.toast('Chọn ít nhất một bé để gửi nhé', 'error');
    if (!text) return UI.toast('Viết nội dung tin nhắn trước nhé', 'error');
    if (nut.disabled) return;
    nut.disabled = true;
    try {
      const kq = await API.post('/api/messages/gui-nhieu-nha', { studentIds: [...this._daChonGN], text });
      const ten = new Map(this._chonGN.be.map(b => [b.id, b.ten]));
      document.getElementById('gn-ket-qua').innerHTML = `
        <div class="card" id="gn-ket-qua-the">
          <div style="font-weight:700">Đã gửi tới gia đình của ${UI.esc(kq.soNha)} bé.</div>
          ${kq.khongGui.length ? `<div class="mt-8">Chưa gửi được:</div>
            <ul style="margin:6px 0 0 18px;padding:0">${kq.khongGui.map(x => `
              <li>${UI.esc(x.ten || ten.get(x.studentId) || 'Một bé')}: ${UI.esc(x.lyDo)}</li>`).join('')}</ul>` : ''}
        </div>`;
      o.value = '';
      this._daChonGN.clear();
      this.veChonGN();
      UI.toast('Đã gửi tin nhắn', 'success');
    } catch (err) {
      UI.toast(err.message || 'Chưa gửi được tin nhắn', 'error');
    } finally { nut.disabled = false; }
  },

  // ---- Hội thoại cô – gia đình: màn của quản lý (Đ242F, F1) ----
  //
  // Lọc cơ sở → nhóm → bé rồi mới liệt kê, không đổ cả trường ra một lần. Mở
  // một cuộc là CHỈ ĐỌC: máy chủ không ghi quản lý vào cuộc, không đánh dấu đã
  // đọc hộ ai, và ghi mỗi lượt mở vào nhật ký của trường.
  _locQL: null,

  async renderQuanLy(root) {
    const chon = await API.get('/api/messages/chon-be');
    this._chonQL = chon;
    // Bộ lọc nhớ giữa hai lượt mở (bấm vào một cuộc rồi quay lại), nhưng chỉ khi
    // vẫn còn trong phạm vi — đăng nhập tài khoản khác trên cùng máy thì làm lại.
    let loc = this._locQL;
    if (!loc || (loc.coSo && !chon.coSo.some(c => c.id === loc.coSo))
      || (loc.nhom && !chon.nhom.some(n => n.id === loc.nhom))) {
      loc = this._locQL = { coSo: '', nhom: '', be: '' };
    }
    if (!loc.coSo && chon.coSo.length === 1) loc.coSo = chon.coSo[0].id;
    root.innerHTML = `
      ${UI.pageHeader('Hội thoại cô – gia đình')}
      <div class="muted small" style="margin:0 2px 12px;line-height:1.5">
        Mở một cuộc là chỉ đọc: không nhắn vào được, không đánh dấu đã đọc thay cô hay gia đình,
        và mỗi lượt mở đều được ghi vào nhật ký của trường.
      </div>
      <div class="card">
        <div class="field"><label for="ql-coso">Cơ sở</label><select id="ql-coso"></select></div>
        <div class="field"><label for="ql-nhom">Nhóm lớp</label><select id="ql-nhom"></select></div>
        <div class="field"><label for="ql-be">Bé</label><select id="ql-be"></select></div>
      </div>
      <div id="ql-ds" class="mt-14"></div>`;
    const doi = (khoa, ...xoa) => (e) => {
      loc[khoa] = e.target.value;
      for (const k of xoa) loc[k] = '';
      this.veBoLocQL();
      this.taiCuocQL();
    };
    document.getElementById('ql-coso').onchange = doi('coSo', 'nhom', 'be');
    document.getElementById('ql-nhom').onchange = doi('nhom', 'be');
    document.getElementById('ql-be').onchange = doi('be');
    this.veBoLocQL();
    await this.taiCuocQL();
  },

  veBoLocQL() {
    const chon = this._chonQL;
    const loc = this._locQL;
    const tuyChon = (ds, chonSan, nhanTrong) => `<option value="">${UI.esc(nhanTrong)}</option>`
      + ds.map(x => `<option value="${UI.esc(x.id)}"${x.id === chonSan ? ' selected' : ''}>${UI.esc(x.ten)}</option>`).join('');
    const nhom = chon.nhom.filter(n => !loc.coSo || n.coSo === loc.coSo);
    const be = chon.be.filter(b => b.nhom === loc.nhom);
    document.getElementById('ql-coso').innerHTML = tuyChon(chon.coSo, loc.coSo, 'Mọi cơ sở');
    document.getElementById('ql-nhom').innerHTML = tuyChon(nhom, loc.nhom, 'Chọn nhóm lớp');
    document.getElementById('ql-be').innerHTML = tuyChon(be, loc.be, 'Mọi bé trong nhóm');
    document.getElementById('ql-be').disabled = !loc.nhom;
  },

  async taiCuocQL() {
    const o = document.getElementById('ql-ds');
    const loc = this._locQL;
    if (!o) return;
    if (!loc.nhom) {
      o.innerHTML = UI.emptyState('💬', 'Chọn một nhóm lớp để xem các cuộc trò chuyện giữa cô và gia đình.');
      return;
    }
    o.innerHTML = '<div class="loading">Đang tải</div>';
    const q = `classId=${encodeURIComponent(loc.nhom)}${loc.be ? `&studentId=${encodeURIComponent(loc.be)}` : ''}`;
    try {
      const { cuoc } = await API.get(`/api/messages/quan-ly/cuoc?${q}`);
      o.innerHTML = cuoc.length ? `<div class="card">${cuoc.map(c => `
        <div class="chat-list-row ql-cuoc" data-id="${UI.esc(c.id)}">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600">Gia đình bé ${UI.esc(c.tenBe)}</div>
            <div class="chat-list-sub muted" style="font-size:.78rem">${UI.esc([c.tenKenh, c.tenNhom].filter(Boolean).join(' · '))}</div>
            <div class="muted" style="font-size:.78rem">${c.soTin ? `${UI.esc(c.soTin)} tin nhắn` : 'Chưa có tin nhắn'}${c.daDong ? ' · Nhà trường đã đóng' : ''}</div>
          </div>
          ${c.tinCuoiLuc ? `<div class="muted" style="font-size:.74rem;flex:none">${UI.esc(UI.timeAgo(c.tinCuoiLuc))}</div>` : ''}
        </div>`).join('')}</div>`
        : UI.emptyState('💬', 'Chưa có cuộc trò chuyện nào giữa cô và gia đình ở đây.');
      for (const el of o.querySelectorAll('.ql-cuoc')) {
        el.onclick = () => App.navigate('#/messages/quan-ly/' + encodeURIComponent(el.dataset.id));
      }
    } catch (err) {
      o.innerHTML = UI.emptyState('😥', err.message || 'Chưa tải được danh sách');
    }
  },

  // Mở một cuộc ở chế độ xem của quản lý: KHÔNG ô nhập, KHÔNG hỏi tin mới
  // (đường hỏi tin mới là của người trong cuộc), có ghi tên người gửi.
  async renderXem(root, id) {
    const cv = await API.get('/api/messages/quan-ly/cuoc/' + encodeURIComponent(id));
    this._xemQL = true;
    this._duongTin = '/api/messages/quan-ly/cuoc/';
    this._convId = cv.id;
    this._type = cv.type;
    this._daDong = true;
    this._lastDay = null;
    this._tuLuc = cv.tuLuc || '';
    let bubbles = cv.conCu ? this.nutTinCu() : '';
    for (const m of cv.messages) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== this._lastDay) { bubbles += this.dayLine(m.createdAt); this._lastDay = day; }
      bubbles += this.bubbleHtml(m);
    }
    root.innerHTML = `
      <div class="chat-screen">
        <div class="page-head" style="position:static">
          <button class="back-btn" onclick="history.back()" aria-label="Quay lại">${UI.icon('back', 20)}</button>
          ${UI.avatar(cv.avatar, 42)}
          <div style="flex:1;min-width:0">
            <div style="font-weight:700">${UI.esc(cv.title)}</div>
            <div class="muted small">${UI.esc(cv.subtitle)}</div>
          </div>
        </div>
        <div class="muted small" id="chat-chi-doc" style="padding:8px 14px;background:var(--soft,#f4f6fb);line-height:1.5">
          <b>Chế độ xem của quản lý — chỉ đọc.</b>
          ${cv.daDong ? ' Nhà trường đã đóng cuộc trò chuyện này.' : ''}
        </div>
        <div class="chat-msgs" id="chat-msgs">${bubbles || UI.emptyState('💬', 'Chưa có tin nhắn nào.')}</div>
      </div>`;
    const msgsEl = document.getElementById('chat-msgs');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  },

  // ---- Phòng chat ----
  async renderChat(root, id) {
    const cv = await API.get('/api/messages/' + encodeURIComponent(id));
    this._xemQL = false;
    this._duongTin = '/api/messages/';
    this._convId = cv.id;
    this._type = cv.type;
    this._daDong = !!cv.daDong;
    this._lastTs = null;
    this._lastDay = null;
    // Mốc của tin CŨ NHẤT đang hiện — nút "Xem tin cũ hơn" hỏi tiếp từ đây.
    this._tuLuc = cv.tuLuc || '';
    let bubbles = cv.conCu ? this.nutTinCu() : '';
    for (const m of cv.messages) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== this._lastDay) { bubbles += this.dayLine(m.createdAt); this._lastDay = day; }
      bubbles += this.bubbleHtml(m);
      this._lastTs = m.createdAt;
    }
    root.innerHTML = `
      <div class="chat-screen">
        <div class="page-head" style="position:static">
          <button class="back-btn" onclick="location.hash='#/messages'" aria-label="Quay lại">${UI.icon('back', 20)}</button>
          ${UI.avatar(cv.avatar, 42)}
          <div style="flex:1;min-width:0">
            <div style="font-weight:700">${UI.esc(cv.title)}</div>
            <div class="muted small">${UI.esc(cv.subtitle)}</div>
          </div>
        </div>
        <div class="chat-msgs" id="chat-msgs">${bubbles}</div>
        ${cv.daDong ? `
          <div class="muted small" style="padding:12px 14px;line-height:1.6;border-top:1px solid var(--line,#e6e8ee)">
            Nhà trường đã <b>đóng</b> cuộc trò chuyện này. Nội dung cũ vẫn được giữ nguyên,
            nhưng không nhắn thêm được nữa.
            ${cv.dongDuoc ? '<button class="btn outline sm mt-8" id="chat-mo-lai">Mở lại cuộc trò chuyện</button>' : ''}
          </div>` : `
          <div class="chat-input-bar">
            <textarea id="chat-input" rows="1" placeholder="Nhắn tin..."></textarea>
            <button class="send-btn" id="chat-send" aria-label="Gửi tin nhắn">${UI.icon('send', 20)}</button>
          </div>`}
      </div>`;
    const msgsEl = document.getElementById('chat-msgs');
    msgsEl.scrollTop = msgsEl.scrollHeight;

    // Cuộc đã đóng thì không có ô nhập để gắn sự kiện, và cũng không cần hỏi
    // tin mới — đóng rồi thì không ai nhắn được nữa.
    if (cv.daDong) {
      const nutMo = document.getElementById('chat-mo-lai');
      if (nutMo) nutMo.onclick = () => this.moLai(cv.id);
      App.refreshBadges();
      return;
    }

    const ta = document.getElementById('chat-input');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    document.getElementById('chat-send').onclick = () => this.send();

    App.refreshBadges(); // mở phòng = server đã đánh dấu đã đọc
    this._timer = setInterval(() => this.poll(), 4000);
  },

  async moLai(id) {
    try {
      await API.post(`/api/messages/${encodeURIComponent(id)}/mo-lai`, {});
      UI.toast('Đã mở lại cuộc trò chuyện', 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa mở lại được', 'error'); }
  },

  async poll() {
    // Phòng chat đã bị thay bằng view khác → dừng polling.
    if (!document.getElementById('chat-msgs')) {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      return;
    }
    try {
      const r = await API.get(`/api/messages/${encodeURIComponent(this._convId)}/poll?after=${encodeURIComponent(this._lastTs || '')}`);
      if (r.messages && r.messages.length) {
        this.appendMessages(r.messages);
        App.refreshBadges();
      }
    } catch (_) { /* bỏ qua lỗi mạng tạm thời */ }
  },

  async send() {
    const ta = document.getElementById('chat-input');
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) return;
    // Mạng 4G chậm thì "Gửi" đi mất một hai giây — bấm thêm lần nữa trong lúc
    // đó là CÙNG MỘT câu được gửi hai lần. Khoá lại cho tới khi lượt trước về.
    if (this._dangGui) return;
    this._dangGui = true;
    try {
      const m = await API.post('/api/messages/' + encodeURIComponent(this._convId), { text });
      this.appendMessages([m]);
      ta.value = '';
      ta.style.height = 'auto';
      ta.focus();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
    finally { this._dangGui = false; }
  },

  // MỞ PHÒNG CHỈ NẠP CỬA SỔ TIN MỚI NHẤT, NÊN PHẢI CÓ ĐƯỜNG ĐI NGƯỢC.
  //
  // Máy chủ cắt bớt tin cũ để phòng chat của một năm học vẫn mở được trên máy
  // Android rẻ tiền của trường. Nhưng cắt mà không nói là GIẤU: cô cuộn lên
  // không thấy gì và tin rằng tin nhắn cũ đã mất. Nút này là chỗ nói ra.
  nutTinCu() {
    return '<div id="chat-cu" style="text-align:center;margin:8px 0">'
      + '<button class="btn outline sm" onclick="App.views.messages.xemTinCu()">Xem tin cũ hơn</button>'
      + '</div>';
  },

  async xemTinCu() {
    const el = document.getElementById('chat-msgs');
    const o = document.getElementById('chat-cu');
    if (!el || !o) return;
    o.innerHTML = '<span class="muted small">Đang tải…</span>';
    try {
      const r = await API.get(`${this._duongTin || '/api/messages/'}${encodeURIComponent(this._convId)}`
        + `?truoc=${encodeURIComponent(this._tuLuc || '')}`);
      const ds = r.messages || [];
      // Chèn LÊN ĐẦU và giữ nguyên chỗ cô đang đọc: nhảy về đầu hay về cuối
      // khung sau khi bấm đều làm mất chỗ, và cô phải cuộn tìm lại.
      const caoCu = el.scrollHeight;
      let html = '';
      let ngay = null;
      for (const m of ds) {
        const d = new Date(m.createdAt).toDateString();
        if (d !== ngay) { html += this.dayLine(m.createdAt); ngay = d; }
        html += this.bubbleHtml(m);
      }
      this._tuLuc = r.tuLuc || this._tuLuc;
      o.outerHTML = (r.conCu ? this.nutTinCu() : '') + html;
      // Chỗ nối hai mẻ có thể sinh hai vạch ngày giống hệt nhau, cạnh nhau.
      const vach = [...el.querySelectorAll('.chat-ngay')];
      for (let i = vach.length - 1; i > 0; i--) {
        if (vach[i].dataset.ngay === vach[i - 1].dataset.ngay
          && vach[i].previousElementSibling === vach[i - 1]) vach[i].remove();
      }
      el.scrollTop += el.scrollHeight - caoCu;
      if (!ds.length) UI.toast('Đã hiện hết tin nhắn cũ', 'success');
    } catch (err) {
      o.innerHTML = '<span class="muted small">Chưa tải được tin cũ. Cô thử lại giúp.</span>';
      UI.toast(err.message, 'error');
    }
  },

  // Nối thêm tin nhắn vào cuối khung chat (kèm vạch ngày nếu sang ngày mới).
  appendMessages(list) {
    const el = document.getElementById('chat-msgs');
    if (!el || !list.length) return;
    let html = '';
    for (const m of list) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== this._lastDay) { html += this.dayLine(m.createdAt); this._lastDay = day; }
      html += this.bubbleHtml(m);
      this._lastTs = m.createdAt;
    }
    el.insertAdjacentHTML('beforeend', html);
    el.scrollTop = el.scrollHeight;
  },

  // Tin đã thu hồi: máy chủ không gửi chữ về (giữ chỗ, bỏ chữ — routes/
  // messages.js `messageDto`), màn hình nói rõ thay vì để một bong bóng trống.
  // Nút "Thu hồi" chỉ trên tin của chính mình, cuộc chưa đóng — đúng điều kiện
  // máy chủ nhận.
  bubbleHtml(m) {
    // Quản lý xem một cuộc của người khác thì mọi bong bóng đều "không phải của
    // tôi" — không ghi tên người gửi là không biết câu nào của cô, câu nào của nhà.
    const showSender = (this._type === 'group' || this._xemQL) && !m.mine;
    const noiDung = m.daThuHoi
      ? '<i class="bubble-thu-hoi" style="opacity:.75">Tin nhắn đã được thu hồi</i>'
      : UI.esc(m.text);
    const nutThuHoi = m.mine && !m.daThuHoi && !this._daDong
      ? `<button type="button" class="bubble-nut-thu-hoi" onclick="App.views.messages.thuHoi('${UI.esc(m.id)}')" style="background:none;border:0;padding:0;margin-top:2px;color:inherit;opacity:.7;font-size:.7rem;text-decoration:underline;cursor:pointer">Thu hồi</button>`
      : '';
    return `<div class="bubble-row${m.mine ? ' mine' : ''}" data-tin="${UI.esc(m.id)}" data-luc="${UI.esc(m.createdAt)}">${showSender ? UI.avatar(m.senderAvatar, 28) : ''}<div class="bubble">${showSender ? `<span class="bubble-name">${UI.esc(m.senderName)}</span>` : ''}${noiDung}<span class="bubble-time">${UI.esc(UI.fmtTime(m.createdAt))}</span>${nutThuHoi}</div></div>`;
  },

  async thuHoi(tinId) {
    if (!confirm('Thu hồi tin nhắn này?\n\nMọi người trong cuộc trò chuyện sẽ chỉ còn thấy "Tin nhắn đã được thu hồi".')) return;
    try {
      await API.post(`/api/messages/${encodeURIComponent(this._convId)}/tin/${encodeURIComponent(tinId)}/thu-hoi`, {});
      const dong = [...document.querySelectorAll('#chat-msgs .bubble-row')].find(el => el.dataset.tin === tinId);
      if (dong) {
        dong.outerHTML = this.bubbleHtml({ id: tinId, mine: true, daThuHoi: true, createdAt: dong.dataset.luc });
      }
      UI.toast('Đã thu hồi tin nhắn', 'success');
    } catch (err) { UI.toast(err.message || 'Chưa thu hồi được tin nhắn', 'error'); }
  },

  // `chat-ngay` để `xemTinCu()` nhận ra vạch ngày và bỏ vạch bị lặp ở chỗ nối
  // giữa mẻ tin cũ vừa chèn và mẻ đang hiện.
  dayLine(iso) {
    return `<div class="chat-ngay" data-ngay="${UI.esc(new Date(iso).toDateString())}" `
      + `style="text-align:center;color:var(--muted);font-size:.78rem;margin:10px 0">`
      + `${UI.esc(UI.fmtDate(iso))}</div>`;
  },
};
