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
  async renderList(root) {
    const data = await API.get('/api/messages');
    this._contacts = data.contacts || [];
    const convs = data.conversations || [];
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
      </div>` : UI.emptyState('💬', 'Chưa có cuộc trò chuyện nào. Bấm "Trò chuyện mới" để bắt đầu.')}`;
    document.getElementById('msg-new').onclick = () => this.openNew();
  },

  // Modal chọn liên hệ để bắt đầu trò chuyện mới.
  openNew() {
    UI.modal(this._contacts.length ? this._contacts.map(c => `
      <div class="list-row clickable" onclick="App.views.messages.pickContact('${UI.esc(c.userId)}')">
        ${UI.avatar(c.avatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(c.name)}</div>
          <div class="row-sub">${UI.esc(c.subtitle)}</div>
        </div>
      </div>`).join('') : UI.emptyState('🔍', 'Không có liên hệ nào để bắt đầu trò chuyện'),
    'Trò chuyện mới');
  },

  async pickContact(userId) {
    const c = this._contacts.find(x => x.userId === userId);
    if (!c) return;
    try {
      let id = c.existingConversationId;
      if (!id) {
        const r = await API.post('/api/messages/start', { userId });
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
    let bubbles = '';
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
        <div class="chat-input-bar">
          <textarea id="chat-input" rows="1" placeholder="Nhắn tin..."></textarea>
          <button class="send-btn" id="chat-send" aria-label="Gửi tin nhắn">${UI.icon('send', 20)}</button>
        </div>
      </div>`;
    const msgsEl = document.getElementById('chat-msgs');
    msgsEl.scrollTop = msgsEl.scrollHeight;

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
    try {
      const m = await API.post('/api/messages/' + encodeURIComponent(this._convId), { text });
      this.appendMessages([m]);
      ta.value = '';
      ta.style.height = 'auto';
      ta.focus();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
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

  dayLine(iso) {
    return `<div style="text-align:center;color:var(--muted);font-size:.78rem;margin:10px 0">${UI.esc(UI.fmtDate(iso))}</div>`;
  },
};
