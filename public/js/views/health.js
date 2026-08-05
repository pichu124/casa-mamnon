// Phân hệ Y tế học đường.
// Phụ huynh: xem hồ sơ sức khỏe của từng con. Giáo viên: xem theo học sinh và thêm ghi nhận.
App.views.health = {
  TYPES: {
    checkup: { label: 'Khám định kỳ', cls: 'blue', emoji: '🩺', bg: '#e6efff' },
    vaccination: { label: 'Tiêm chủng', cls: 'green', emoji: '💉', bg: '#e3f7ec' },
    incident: { label: 'Sự cố y tế', cls: 'orange', emoji: '🩹', bg: '#fef0e0' },
  },
  _records: [],
  _sid: null,          // học sinh đang chọn (phía giáo viên)
  _newType: 'checkup', // loại ghi nhận đang chọn trong biểu mẫu

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: hồ sơ y tế của con đang chọn ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Y tế học đường') + UI.emptyState('🎒', 'Chưa có học sinh liên kết với tài khoản này');
      return;
    }
    const data = await API.get(`/api/health?studentId=${current.id}`);
    this._records = data.records;
    root.innerHTML = `
      ${UI.pageHeader('Y tế học đường')}
      ${UI.studentBar()}
      ${this.latestCard(data.latestCheckup)}
      ${this.recordsHtml()}`;
  },

  // ---- Giáo viên: chọn học sinh trong lớp + thêm ghi nhận ----
  async renderTeacher(root) {
    const students = App.state.students || [];
    if (!students.length) {
      root.innerHTML = UI.pageHeader('Y tế học đường') + UI.emptyState('🎒', 'Lớp chưa có học sinh nào');
      return;
    }
    if (!this._sid || !students.some(s => s.id === this._sid)) this._sid = students[0].id;
    const data = await API.get(`/api/health?studentId=${this._sid}`);
    this._records = data.records;
    root.innerHTML = `
      ${UI.pageHeader('Y tế học đường', { action: { id: 'btn-new-health', label: 'Thêm ghi nhận', icon: 'plus' } })}
      <div class="field">
        <select id="ht-student" onchange="App.views.health.changeStudent(this.value)">
          ${students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === this._sid ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('')}
        </select>
      </div>
      ${this.latestCard(data.latestCheckup)}
      ${this.recordsHtml()}`;
    document.getElementById('btn-new-health').onclick = () => this.openCreate();
  },

  changeStudent(id) {
    this._sid = id;
    App.route();
  },

  // ---- Thẻ chỉ số lần khám gần nhất ----
  latestCard(lc) {
    if (!lc) return '';
    return `
      <div class="card">
        <div class="card-title">${UI.icon('health', 19)} Chỉ số gần nhất</div>
        <div class="stat-row" style="margin-bottom:0">
          ${this.statBox(lc.height, 'cm', 'Chiều cao')}
          ${this.statBox(lc.weight, 'kg', 'Cân nặng')}
          ${this.statBox(lc.vision, '', 'Thị lực')}
        </div>
        <div class="muted small mt-8 flex">
          <span>Khám ngày ${UI.esc(UI.fmtDate(lc.date, { weekday: false }))}</span>
          ${lc.bmiNote ? UI.badge(lc.bmiNote, 'green') : ''}
        </div>
      </div>`;
  },

  statBox(value, unit, label) {
    const has = value !== undefined && value !== null && value !== '';
    return `
      <div class="stat-box">
        <div class="stat-num">${has ? `${UI.esc(value)}${unit ? ` <span style="font-size:.82rem;font-weight:600">${UI.esc(unit)}</span>` : ''}` : '—'}</div>
        <div class="stat-label">${UI.esc(label)}</div>
      </div>`;
  },

  // ---- Danh sách hồ sơ ----
  recordsHtml() {
    if (!this._records.length) {
      return UI.emptyState('🩺', 'Chưa có ghi nhận y tế nào. Thật mừng vì con luôn khỏe mạnh!');
    }
    return `
      <div class="card">
        ${this._records.map(r => {
          const t = this.TYPES[r.type] || { label: r.type, cls: 'gray', emoji: '📋', bg: '#eef1f5' };
          return `
            <div class="list-row clickable" onclick="App.views.health.showDetail('${UI.esc(r.id)}')">
              <div class="row-icon" style="background:${UI.esc(t.bg)};font-size:21px">${t.emoji}</div>
              <div class="row-main">
                <div class="row-title">${UI.esc(r.title)}</div>
                <div class="row-sub">${UI.esc(UI.fmtDate(r.date))} · ${UI.esc(r.detail)}</div>
              </div>
              <div class="row-end">${UI.badge(t.label, t.cls)}</div>
            </div>`;
        }).join('')}
      </div>`;
  },

  showDetail(id) {
    const r = this._records.find(x => x.id === id);
    if (!r) return;
    const t = this.TYPES[r.type] || { label: r.type, cls: 'gray', emoji: '📋', bg: '#eef1f5' };
    UI.modal(`
      <div class="center">
        <div class="row-icon" style="background:${UI.esc(t.bg)};font-size:26px;width:56px;height:56px;margin:0 auto">${t.emoji}</div>
        <h3 class="mt-8">${UI.esc(r.title)}</h3>
        <div class="mt-8">${UI.badge(t.label, t.cls)}</div>
      </div>
      <div class="mt-14">
        ${infoRowHealth('Ngày ghi nhận', UI.fmtDate(r.date))}
        ${infoRowHealth('Nội dung chi tiết', r.detail)}
        ${r.height !== undefined && r.height !== null ? infoRowHealth('Chiều cao', `${r.height} cm`) : ''}
        ${r.weight !== undefined && r.weight !== null ? infoRowHealth('Cân nặng', `${r.weight} kg`) : ''}
        ${r.vision ? infoRowHealth('Thị lực', r.vision) : ''}
        ${r.bmiNote ? infoRowHealth('Đánh giá thể trạng', r.bmiNote) : ''}
      </div>`, 'Chi tiết ghi nhận y tế');
  },

  // ---- Giáo viên: thêm ghi nhận ----
  openCreate() {
    const students = App.state.students || [];
    this._newType = 'checkup';
    UI.modal(`
      <div class="field">
        <label>Học sinh</label>
        <select id="ht-c-student">
          ${students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === this._sid ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Loại ghi nhận</label>
        <div class="seg" id="ht-type-seg" style="margin-bottom:0">
          <button data-type="checkup" class="active" onclick="App.views.health.pickType('checkup')">🩺 Khám</button>
          <button data-type="vaccination" onclick="App.views.health.pickType('vaccination')">💉 Tiêm chủng</button>
          <button data-type="incident" onclick="App.views.health.pickType('incident')">🩹 Sự cố</button>
        </div>
      </div>
      <div class="field">
        <label>Tiêu đề</label>
        <input id="ht-title" placeholder="VD: Khám sức khỏe định kỳ học kỳ này">
      </div>
      <div class="field">
        <label>Chi tiết</label>
        <textarea id="ht-detail" placeholder="VD: Sức khỏe tổng quát tốt. Răng miệng bình thường."></textarea>
      </div>
      <div class="grid-2" id="ht-metrics">
        <div class="field">
          <label>Chiều cao (cm)</label>
          <input type="number" id="ht-height" min="0" step="0.1" placeholder="VD: 130">
        </div>
        <div class="field">
          <label>Cân nặng (kg)</label>
          <input type="number" id="ht-weight" min="0" step="0.1" placeholder="VD: 28">
        </div>
      </div>
      <button class="btn primary block" onclick="App.views.health.submitCreate()">${UI.icon('check', 18)} Lưu ghi nhận</button>
    `, 'Thêm ghi nhận y tế');
  },

  pickType(t) {
    this._newType = t;
    document.querySelectorAll('#ht-type-seg button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
    const metrics = document.getElementById('ht-metrics');
    if (metrics) metrics.style.display = t === 'checkup' ? '' : 'none';
  },

  async submitCreate() {
    const studentId = document.getElementById('ht-c-student').value;
    const type = this._newType;
    const title = document.getElementById('ht-title').value.trim();
    const detail = document.getElementById('ht-detail').value.trim();
    if (!title) return UI.toast('Cô nhập tiêu đề ghi nhận giúp nhé', 'error');
    const body = { studentId, type, title, detail };
    if (type === 'checkup') {
      const h = document.getElementById('ht-height').value;
      const w = document.getElementById('ht-weight').value;
      if (h) body.height = Number(h);
      if (w) body.weight = Number(w);
    }
    try {
      await API.post('/api/health', body);
      UI.toast('Đã thêm ghi nhận y tế', 'success');
      UI.closeModal();
      this._sid = studentId;
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};

// Dòng thông tin nhãn – giá trị trong modal chi tiết y tế.
function infoRowHealth(label, value) {
  return `<div class="list-row"><div class="row-main"><div class="row-sub">${UI.esc(label)}</div><div class="row-title">${UI.esc(value ?? '—')}</div></div></div>`;
}
