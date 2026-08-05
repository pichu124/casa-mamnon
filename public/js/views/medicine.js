// Phân hệ Dặn thuốc.
// Phụ huynh: gửi lời dặn thuốc và theo dõi. Giáo viên: nhận thuốc, ghi nhật ký, hoàn tất.
App.views.medicine = {
  STATUS: {
    pending: { label: 'Chờ xác nhận', cls: 'orange' },
    received: { label: 'Cô đã nhận thuốc', cls: 'blue' },
    done: { label: 'Hoàn tất', cls: 'green' },
  },
  _list: [],

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: danh sách đơn dặn thuốc của các con ----
  async renderParent(root) {
    this._list = await API.get('/api/medicine');
    const manyKids = (App.state.students || []).length > 1;
    root.innerHTML = `
      ${UI.pageHeader('Dặn thuốc', { action: { id: 'btn-new-med', label: 'Dặn thuốc', icon: 'plus' } })}
      ${this._list.length
        ? this._list.map(m => this.parentCard(m, manyKids)).join('')
        : UI.emptyState('💊', 'Chưa có đơn dặn thuốc nào. Khi con cần uống thuốc ở trường, gia đình bấm "Dặn thuốc" để nhờ cô nhé.')}`;
    document.getElementById('btn-new-med').onclick = () => this.openCreate();
  },

  parentCard(m, manyKids) {
    const st = this.STATUS[m.status] || { label: m.status, cls: 'gray' };
    return `
      <div class="card">
        <div class="flex">
          ${UI.badge(st.label, st.cls)}
          <span class="spacer"></span>
          <span class="muted small">📅 ${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</span>
        </div>
        ${manyKids ? `<div class="small mt-8" style="font-weight:700">🎒 ${UI.esc(m.studentName)}</div>` : ''}
        <div class="mt-8">${this.medsTable(m.medicines)}</div>
        ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
        ${(m.status === 'received' || m.status === 'done') && m.confirmedAt
          ? `<div class="small mt-8" style="color:#1e8e4e;font-weight:600">✅ ${UI.esc(m.confirmedByName || 'Giáo viên')} đã nhận lúc ${UI.esc(UI.fmtTime(m.confirmedAt))} ${UI.esc(UI.fmtDateShort(m.confirmedAt))}</div>`
          : ''}
        ${m.log && m.log.length ? `<div class="timeline mt-14">${this.logItems(m.log)}</div>` : ''}
      </div>`;
  },

  openCreate() {
    const students = App.state.students || [];
    const current = App.currentStudent();
    const today = UI.todayStr();
    UI.modal(`
      ${students.length > 1 ? `
        <div class="field">
          <label>Dặn thuốc cho con</label>
          <select id="md-student">
            ${students.map(s => `<option value="${UI.esc(s.id)}" ${current && s.id === current.id ? 'selected' : ''}>${UI.esc(s.name)} · ${UI.esc(s.className)}</option>`).join('')}
          </select>
        </div>` : `
        <div class="field">
          <label>Dặn thuốc cho con</label>
          <input value="${UI.esc(current ? `${current.name} · ${current.className}` : '')}" disabled>
        </div>`}
      <div class="grid-2">
        <div class="field">
          <label>Dùng từ ngày</label>
          <input type="date" id="md-from" value="${UI.esc(today)}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="md-to" value="${UI.esc(today)}">
        </div>
      </div>
      <div class="field">
        <label>Các loại thuốc</label>
        <div id="md-meds">${this.medFieldset()}</div>
        <button class="btn outline sm mt-8" onclick="App.views.medicine.addMed()">${UI.icon('plus', 15)} Thêm thuốc</button>
      </div>
      <div class="field">
        <label>Ghi chú gửi cô</label>
        <textarea id="md-note" placeholder="Ví dụ: Thuốc để trong ba lô, ngăn trước. Nhờ cô cho con uống đúng giờ giúp gia đình ạ."></textarea>
        <div class="hint">Cô giáo chủ nhiệm sẽ xác nhận khi đã nhận thuốc của con.</div>
      </div>
      <button class="btn primary block" onclick="App.views.medicine.submitCreate()">${UI.icon('send', 18)} Gửi lời dặn thuốc</button>
    `, 'Dặn thuốc cho con');
  },

  // Một khối nhập thông tin thuốc trong biểu mẫu.
  medFieldset() {
    return `
      <div class="med-item" style="border:1.5px solid var(--line);border-radius:12px;padding:10px;margin-bottom:8px">
        <div class="flex" style="margin-bottom:8px">
          <input class="md-name" placeholder="Tên thuốc (VD: Siro ho Prospan)" style="flex:1;border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
          <button class="btn danger-soft sm" style="flex:none;padding:8px 10px" onclick="App.views.medicine.removeMed(this)" aria-label="Xóa thuốc">${UI.icon('x', 15)}</button>
        </div>
        <div class="grid-2">
          <input class="md-dose" placeholder="Liều dùng (VD: 5ml)" style="border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
          <input class="md-timing" placeholder="Thời điểm (VD: Sau bữa trưa)" style="border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
        </div>
      </div>`;
  },

  addMed() {
    document.getElementById('md-meds').insertAdjacentHTML('beforeend', this.medFieldset());
  },

  removeMed(btn) {
    const wrap = document.getElementById('md-meds');
    if (wrap.querySelectorAll('.med-item').length <= 1) {
      return UI.toast('Cần ít nhất một loại thuốc trong đơn', 'error');
    }
    btn.closest('.med-item').remove();
  },

  async submitCreate() {
    const sel = document.getElementById('md-student');
    const current = App.currentStudent();
    const studentId = sel ? sel.value : (current ? current.id : null);
    const fromDate = document.getElementById('md-from').value;
    const toDate = document.getElementById('md-to').value;
    const note = document.getElementById('md-note').value.trim();
    if (!fromDate || !toDate) return UI.toast('Gia đình chọn ngày dùng thuốc giúp cô nhé', 'error');
    if (fromDate > toDate) return UI.toast('Ngày bắt đầu phải trước hoặc trùng ngày kết thúc', 'error');
    const medicines = [...document.querySelectorAll('#md-meds .med-item')].map(it => ({
      name: it.querySelector('.md-name').value.trim(),
      dose: it.querySelector('.md-dose').value.trim(),
      timing: it.querySelector('.md-timing').value.trim(),
    })).filter(m => m.name || m.dose || m.timing);
    if (!medicines.length) return UI.toast('Gia đình thêm ít nhất một loại thuốc nhé', 'error');
    if (medicines.some(m => !m.name)) return UI.toast('Gia đình nhập tên cho từng loại thuốc nhé', 'error');
    try {
      await API.post('/api/medicine', { studentId, fromDate, toDate, medicines, note });
      UI.toast('Đã gửi lời dặn thuốc tới cô giáo', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Giáo viên: nhận thuốc, ghi nhật ký, hoàn tất ----
  async renderTeacher(root) {
    this._list = await API.get('/api/medicine');
    const pending = this._list.filter(m => m.status === 'pending');
    const received = this._list.filter(m => m.status === 'received');
    const done = this._list.filter(m => m.status === 'done');
    root.innerHTML = `
      ${UI.pageHeader('Dặn thuốc')}
      <div class="section-label">Chờ xác nhận (${pending.length})</div>
      ${pending.length
        ? pending.map(m => `
          <div class="card">
            ${this.teacherHead(m)}
            <div class="mt-8">${this.medsTable(m.medicines)}</div>
            ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
            <button class="btn success-soft block mt-14" onclick="App.views.medicine.confirm('${UI.esc(m.id)}')">${UI.icon('check', 18)} Xác nhận đã nhận thuốc</button>
          </div>`).join('')
        : UI.emptyState('✅', 'Không có đơn dặn thuốc nào chờ xác nhận')}

      ${received.length ? `
        <div class="section-label">Đang theo dõi (${received.length})</div>
        ${received.map(m => `
          <div class="card">
            ${this.teacherHead(m)}
            <div class="mt-8">${this.medsTable(m.medicines)}</div>
            ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
            ${m.log && m.log.length ? `<div class="timeline mt-14">${this.logItems(m.log)}</div>` : ''}
            <div class="field" style="margin:10px 0 8px">
              <input id="md-log-${UI.esc(m.id)}" placeholder="VD: Đã cho con uống thuốc sau bữa trưa">
            </div>
            <div class="grid-2">
              <button class="btn primary" onclick="App.views.medicine.submitLog('${UI.esc(m.id)}')">${UI.icon('edit', 16)} Ghi nhật ký</button>
              <button class="btn outline" onclick="App.views.medicine.markDone('${UI.esc(m.id)}')">${UI.icon('check', 16)} Hoàn tất đợt thuốc</button>
            </div>
          </div>`).join('')}` : ''}

      ${done.length ? `
        <div class="section-label">Đã hoàn tất (${done.length})</div>
        <div class="card">
          ${done.map(m => `
            <div class="list-row">
              ${UI.avatar(m.studentAvatar, 40)}
              <div class="row-main">
                <div class="row-title">${UI.esc(m.studentName)}</div>
                <div class="row-sub">${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</div>
              </div>
              <div class="row-end">${UI.badge('Hoàn tất', 'green')}</div>
            </div>`).join('')}
        </div>` : ''}`;
  },

  // Phần đầu thẻ đơn phía giáo viên: học sinh, phụ huynh, khoảng ngày.
  teacherHead(m) {
    return `
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(m.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(m.studentName)}</div>
          <div class="row-sub">${UI.esc(m.parentName)} · 📅 ${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</div>
        </div>
        ${this.statusBadge(m.status)}
      </div>`;
  },

  async confirm(id) {
    try {
      await API.post(`/api/medicine/${id}/confirm`);
      UI.toast('Đã xác nhận nhận thuốc từ gia đình', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async submitLog(id) {
    const input = document.getElementById(`md-log-${id}`);
    const text = input ? input.value.trim() : '';
    if (!text) return UI.toast('Cô nhập nội dung nhật ký giúp gia đình nhé', 'error');
    try {
      await API.post(`/api/medicine/${id}/log`, { text });
      UI.toast('Đã ghi nhật ký cho thuốc', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async markDone(id) {
    try {
      await API.post(`/api/medicine/${id}/done`);
      UI.toast('Đã hoàn tất đợt dùng thuốc', 'success');
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

  medsTable(medicines) {
    return `
      <div class="table-wrap">
        <table class="simple">
          <thead><tr><th>Thuốc</th><th>Liều</th><th>Thời điểm</th></tr></thead>
          <tbody>
            ${(medicines || []).map(m => `
              <tr>
                <td style="font-weight:600">${UI.esc(m.name)}</td>
                <td>${UI.esc(m.dose || '—')}</td>
                <td>${UI.esc(m.timing || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  logItems(log) {
    return log.map(e => `
      <div class="tl-item">
        <div class="tl-time">${UI.esc(UI.fmtDateShort(e.time))} · ${UI.esc(UI.fmtTime(e.time))}</div>
        <div class="small">${UI.esc(e.text)}</div>
      </div>`).join('');
  },
};
