// Phân hệ Xin phép nghỉ học.
// Phụ huynh: tạo đơn và theo dõi đơn của từng con. Giáo viên: duyệt đơn của nhóm.
App.views.leave = {
  STATUS: {
    pending: { label: 'Chờ duyệt', cls: 'orange' },
    approved: { label: 'Đã duyệt', cls: 'green' },
    rejected: { label: 'Từ chối', cls: 'red' },
  },
  _list: [],

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: danh sách đơn của con đang chọn ----
  async renderParent(root) {
    this._list = await API.get('/api/leave');
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Xin phép nghỉ học') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const list = this._list.filter(l => l.studentId === current.id);
    root.innerHTML = `
      ${UI.pageHeader('Xin phép nghỉ học', { action: { id: 'btn-new-leave', label: 'Tạo đơn', icon: 'plus' } })}
      ${UI.studentBar()}${UI.thanhChonBe()}
      ${list.length ? `<div class="card">
        ${list.map(l => `
          <div class="list-row clickable" onclick="App.views.leave.showDetail('${UI.esc(l.id)}')">
            <div class="row-main">
              <div class="row-title">${UI.esc(this.fmtRange(l))}</div>
              <div class="row-sub">${UI.esc(l.reason)}</div>
            </div>
            <div class="row-end">${this.statusBadge(l.status)}</div>
          </div>`).join('')}
      </div>` : UI.emptyState('📝', `Chưa có đơn xin phép nào cho con ${current.name}. Bấm "Tạo đơn" khi gia đình cần xin nghỉ nhé.`)}`;
    document.getElementById('btn-new-leave').onclick = () => this.openCreate();
  },

  openCreate() {
    const students = App.state.students || [];
    const current = App.currentStudent();
    const tomorrow = this.tomorrowStr();
    UI.modal(`
      ${students.length > 1 ? `
        <div class="field">
          <label>Xin phép cho con</label>
          <select id="lv-student">
            ${students.map(s => `<option value="${UI.esc(s.id)}" ${current && s.id === current.id ? 'selected' : ''}>${UI.esc(s.name)} · ${UI.esc(s.className)}</option>`).join('')}
          </select>
        </div>` : `
        <div class="field">
          <label>Xin phép cho con</label>
          <input value="${UI.esc(current ? `${current.name} · ${current.className}` : '')}" disabled>
        </div>`}
      <div class="grid-2">
        <div class="field">
          <label>Nghỉ từ ngày</label>
          <input type="date" id="lv-from" value="${UI.esc(tomorrow)}" min="${UI.esc(UI.todayStr())}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="lv-to" value="${UI.esc(tomorrow)}" min="${UI.esc(UI.todayStr())}">
        </div>
      </div>
      <div class="field">
        <label>Lý do xin nghỉ</label>
        <textarea id="lv-reason" placeholder="Ví dụ: Con bị sốt nhẹ, gia đình xin phép cho con ở nhà theo dõi."></textarea>
        <div class="hint">Đơn sẽ được gửi tới cô phụ trách của con để duyệt.</div>
      </div>
      <button class="btn primary block" onclick="App.views.leave.submitCreate()">${UI.icon('send', 18)} Gửi đơn xin phép</button>
    `, 'Tạo đơn xin phép');
  },

  async submitCreate() {
    const sel = document.getElementById('lv-student');
    const current = App.currentStudent();
    const studentId = sel ? sel.value : (current ? current.id : null);
    const fromDate = document.getElementById('lv-from').value;
    const toDate = document.getElementById('lv-to').value;
    const reason = document.getElementById('lv-reason').value.trim();
    if (!fromDate || !toDate) return UI.toast('Gia đình chọn ngày nghỉ giúp cô nhé', 'error');
    if (fromDate > toDate) return UI.toast('Ngày bắt đầu phải trước hoặc trùng ngày kết thúc', 'error');
    if (!reason) return UI.toast('Gia đình nhập lý do xin nghỉ giúp cô nhé', 'error');
    try {
      await API.post('/api/leave', { studentId, fromDate, toDate, reason });
      UI.toast('Đã gửi đơn xin phép tới giáo viên', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  showDetail(id) {
    const l = this._list.find(x => x.id === id);
    if (!l) return;
    const st = this.STATUS[l.status] || this.STATUS.pending;
    UI.modal(`
      <div class="center">
        ${this.statusBadge(l.status)}
        <h3 class="mt-8">${UI.esc(l.studentName)}</h3>
        <div class="muted small">${UI.esc(l.className)} · Gửi ${UI.esc(UI.timeAgo(l.createdAt))}</div>
      </div>
      <div class="mt-14">
        ${infoRowLeave('Thời gian nghỉ', this.fmtRange(l))}
        ${infoRowLeave('Người gửi đơn', l.parentName)}
        ${infoRowLeave('Lý do', l.reason)}
      </div>
      ${l.status === 'pending'
        ? `<div class="muted small center mt-14">Đơn đang chờ cô phụ trách duyệt, gia đình đợi thêm chút nhé.</div>`
        : `<div class="card" style="background:${l.status === 'approved' ? '#e3f7ec' : '#fde8e6'};box-shadow:none;margin:14px 0 0">
            <div class="small" style="font-weight:700;margin-bottom:4px">Phản hồi của ${UI.esc(l.reviewerName || 'giáo viên')}</div>
            <div class="small">${l.reviewNote ? UI.esc(l.reviewNote) : `${st.label === 'Đã duyệt' ? 'Cô đã duyệt đơn cho con.' : 'Cô chưa đồng ý với đơn này.'}`}</div>
          </div>`}
    `, 'Chi tiết đơn xin phép');
  },

  // ---- Giáo viên: duyệt đơn của nhóm ----
  async renderTeacher(root) {
    this._list = await API.get('/api/leave');
    const pending = this._list.filter(l => l.status === 'pending');
    const history = this._list.filter(l => l.status !== 'pending');
    root.innerHTML = `
      ${UI.pageHeader('Xin phép nghỉ học')}
      <div class="section-label">Chờ duyệt (${pending.length})</div>
      ${pending.length ? pending.map(l => `
        <div class="card">
          <div class="list-row" style="border-bottom:none;padding-top:0">
            ${UI.avatar(l.studentAvatar, 44)}
            <div class="row-main">
              <div class="row-title">${UI.esc(l.studentName)}</div>
              <div class="row-sub">${UI.esc(this.fmtRange(l))}</div>
            </div>
            ${this.statusBadge(l.status)}
          </div>
          <div class="small" style="margin:2px 0 8px">${UI.esc(l.reason)}</div>
          <div class="muted small mb-8">Phụ huynh: ${UI.esc(l.parentName)} · Gửi ${UI.esc(UI.timeAgo(l.createdAt))}</div>
          <div class="grid-2">
            <button class="btn success-soft" onclick="App.views.leave.openReview('${UI.esc(l.id)}','approved')">${UI.icon('check', 18)} Duyệt</button>
            <button class="btn danger-soft" onclick="App.views.leave.openReview('${UI.esc(l.id)}','rejected')">${UI.icon('x', 18)} Từ chối</button>
          </div>
        </div>`).join('') : UI.emptyState('✅', 'Không có đơn nào chờ duyệt. Nhóm mình đi học đầy đủ, tuyệt quá!')}

      <div class="section-label">Lịch sử</div>
      ${history.length ? `<div class="card">
        ${history.map(l => `
          <div class="list-row">
            ${UI.avatar(l.studentAvatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(l.studentName)} · ${UI.esc(this.fmtRange(l))}</div>
              <div class="row-sub">${UI.esc(l.reason)}${l.reviewNote ? ` — Phản hồi: ${UI.esc(l.reviewNote)}` : ''}</div>
            </div>
            <div class="row-end">${this.statusBadge(l.status)}</div>
          </div>`).join('')}
      </div>` : UI.emptyState('🗂️', 'Chưa có đơn xin phép nào được xử lý')}`;
  },

  openReview(id, status) {
    const l = this._list.find(x => x.id === id);
    if (!l) return;
    const approve = status === 'approved';
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(l.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(l.studentName)}</div>
          <div class="row-sub">${UI.esc(this.fmtRange(l))}</div>
        </div>
      </div>
      <div class="small" style="margin:2px 0 12px">${UI.esc(l.reason)}</div>
      <div class="field">
        <label>Lời nhắn phản hồi gửi gia đình</label>
        <textarea id="lv-review-note" placeholder="${approve
          ? 'Ví dụ: Cô đã nhận thông tin. Chúc con mau khỏe!'
          : 'Ví dụ: Hôm đó nhóm có buổi làm quen với cô lớp 1, mong gia đình đổi lịch giúp cô.'}"></textarea>
      </div>
      <button class="btn ${approve ? 'success-soft' : 'danger-soft'} block" onclick="App.views.leave.submitReview('${UI.esc(l.id)}','${UI.esc(status)}')">
        ${UI.icon(approve ? 'check' : 'x', 18)} ${approve ? 'Duyệt đơn' : 'Từ chối đơn'}
      </button>
    `, approve ? 'Duyệt đơn xin phép' : 'Từ chối đơn xin phép');
  },

  async submitReview(id, status) {
    const reviewNote = document.getElementById('lv-review-note').value.trim();
    try {
      await API.post(`/api/leave/${id}/review`, { status, reviewNote });
      UI.toast(status === 'approved' ? 'Đã duyệt đơn xin phép' : 'Đã từ chối đơn xin phép', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Tiện ích ----
  statusBadge(status) {
    const st = this.STATUS[status] || { label: status, cls: 'gray' };
    return UI.badge(st.label, st.cls);
  },

  fmtRange(l) {
    if (l.fromDate === l.toDate) return UI.fmtDate(l.fromDate);
    const days = Math.round((UI.parseDate(l.toDate) - UI.parseDate(l.fromDate)) / 86400000) + 1;
    return `${UI.fmtDate(l.fromDate, { weekday: false })} – ${UI.fmtDate(l.toDate, { weekday: false })} (${days} ngày)`;
  },

  tomorrowStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
};

// Dòng thông tin nhãn – giá trị trong modal chi tiết.
function infoRowLeave(label, value) {
  return `<div class="list-row"><div class="row-main"><div class="row-sub">${UI.esc(label)}</div><div class="row-title">${UI.esc(value ?? '—')}</div></div></div>`;
}
