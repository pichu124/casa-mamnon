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
    if (params && params[0]) return this.renderChat(root, params[0]);
    return this.renderList(root);
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
    root.innerHTML = `
      ${UI.pageHeader('Nhắn tin', { action: { id: 'msg-new', label: 'Trò chuyện mới', icon: 'plus' } })}
      ${convs.length ? `<div class="card">
        ${convs.map(cv => `
          <div class="chat-list-row" onclick="App.navigate('#/messages/${UI.esc(cv.id)}')">
            ${UI.avatar(cv.avatar, 46)}
            <div style="flex:1;min-width:0">
              <div style="font-weight:${cv.unreadCount > 0 ? 800 : 600}">${UI.esc(cv.title)}</div>
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:.84rem">${cv.lastMessage ? `${UI.esc(cv.lastMessage.senderName)}: ${UI.esc(cv.lastMessage.text)}` : 'Chưa có tin nhắn'}</div>
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
  // Nên danh sách này với gia đình là HAI DÒNG cho mỗi bé, không phải danh sách
  // các cô. Với cô thì là các gia đình trong nhóm mình.
  //
  // Văn phòng KHÔNG có dòng nào ở đây — văn phòng trả lời gia đình, còn muốn
  // nói với cả trường thì đã có Thông báo. Câu trong ô trống nói rõ điều đó
  // thay vì để văn phòng đứng nhìn một danh sách rỗng mà đoán.
  openNew() {
    const laVanPhong = App.state.user.role === 'admin';
    UI.modal(this._contacts.length ? this._contacts.map((c, i) => `
      <div class="list-row clickable" onclick="App.views.messages.pickContact(${i})">
        ${UI.avatar(c.avatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(c.name)}</div>
          <div class="row-sub">${UI.esc(c.subtitle)}</div>
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

  // ---- Phòng chat ----
  async renderChat(root, id) {
    const cv = await API.get('/api/messages/' + encodeURIComponent(id));
    this._convId = cv.id;
    this._type = cv.type;
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
      const r = await API.get(`/api/messages/${encodeURIComponent(this._convId)}`
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

  bubbleHtml(m) {
    const showSender = this._type === 'group' && !m.mine;
    return `<div class="bubble-row${m.mine ? ' mine' : ''}">${showSender ? UI.avatar(m.senderAvatar, 28) : ''}<div class="bubble">${showSender ? `<span class="bubble-name">${UI.esc(m.senderName)}</span>` : ''}${UI.esc(m.text)}<span class="bubble-time">${UI.esc(UI.fmtTime(m.createdAt))}</span></div></div>`;
  },

  // `chat-ngay` để `xemTinCu()` nhận ra vạch ngày và bỏ vạch bị lặp ở chỗ nối
  // giữa mẻ tin cũ vừa chèn và mẻ đang hiện.
  dayLine(iso) {
    return `<div class="chat-ngay" data-ngay="${UI.esc(new Date(iso).toDateString())}" `
      + `style="text-align:center;color:var(--muted);font-size:.78rem;margin:10px 0">`
      + `${UI.esc(UI.fmtDate(iso))}</div>`;
  },
};
