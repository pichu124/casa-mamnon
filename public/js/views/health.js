// Phân hệ Sức khỏe của bé.
// Phụ huynh: xem hồ sơ sức khỏe của từng con. Cô: xem theo bé và thêm ghi nhận.
App.views.health = {
  TYPES: {
    checkup: { label: 'Khám định kỳ', cls: 'blue', emoji: '🩺', bg: '#e6efff' },
    vaccination: { label: 'Tiêm chủng', cls: 'green', emoji: '💉', bg: '#e3f7ec' },
    incident: { label: 'Sự cố y tế', cls: 'orange', emoji: '🩹', bg: '#fef0e0' },
  },
  _records: [],
  _sid: null,          // bé đang chọn (phía giáo viên)
  _newType: 'checkup', // loại ghi nhận đang chọn trong biểu mẫu

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: hồ sơ y tế của con đang chọn ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const data = await API.get(`/api/health?studentId=${current.id}`);
    this._records = data.records;
    root.innerHTML = `
      ${UI.pageHeader('Sức khỏe của bé')}
      ${UI.studentBar()}${UI.thanhChonBe()}
      ${this.latestCard(data.latestCheckup)}
      ${this.recordsHtml()}`;
  },

  // ---- Giáo viên: chọn bé trong nhóm + thêm ghi nhận ----
  async renderTeacher(root) {
    const students = App.state.students || [];
    if (!students.length) {
      root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('🎒', 'Nhóm chưa có bé nào');
      return;
    }
    if (!this._sid || !students.some(s => s.id === this._sid)) this._sid = students[0].id;
    const data = await API.get(`/api/health?studentId=${this._sid}`);
    this._records = data.records;
    root.innerHTML = `
      ${UI.pageHeader('Sức khỏe của bé', { action: { id: 'btn-new-health', label: 'Thêm ghi nhận', icon: 'plus' } })}
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
        ${r.daSua ? `<div class="muted small mt-8">Đã chỉnh sửa lúc ${UI.esc(UI.fmtTime(r.suaLuc))} ${UI.esc(UI.fmtDateShort(r.suaLuc))}</div>` : ''}
      </div>
      ${r.coTheSua ? `
        <div class="flex mt-14" style="gap:8px">
          <button class="btn outline" style="flex:1" onclick="App.views.health.openSua('${UI.esc(r.id)}')">Sửa lại</button>
          <button class="btn danger-soft" style="flex:1" onclick="App.views.health.hoiThuHoi('${UI.esc(r.id)}')">Thu hồi</button>
        </div>` : ''}`, 'Chi tiết ghi nhận y tế');
  },

  // GỢI Ý CÂN ĐO PHẢI ĐI THEO TUỔI THẬT CỦA BÉ.
  //
  // Hai ô này từng để sẵn gợi ý "VD: 105" cm và "VD: 17" kg — đúng cho bé 4–5
  // tuổi, sai hẳn với nhóm nhà trẻ 12–18 tháng (khoảng 76 cm, 10 kg) mà trường
  // đã có thật. CLAUDE.md nêu đúng chuyện này ngay dòng đầu là thứ cô và y tế
  // trường nhận ra ngay.
  //
  // ĐÂY LÀ CHỖ PHẢI CẨN THẬN VỚI QUY TẮC 4.
  //
  // "Không so sánh bé với chuẩn của độ tuổi" — nên tôi CỐ Ý chỉ đổi chữ mờ
  // trong ô TRỐNG, và KHÔNG thêm dòng nào kiểu "bé tuổi này thường 103 cm" nằm
  // cạnh con số thật của bé. Chữ mờ biến mất ngay khi cô gõ, nên nó là gợi ý
  // nhập liệu; một dòng chú thích nằm lại bên cạnh con số thì thành lời so
  // sánh, và đó đúng thứ QUY TẮC 4 cấm.
  goiYCanDo(thang) {
    if (!Number.isFinite(thang) || thang < 0) return { cao: 'VD: 105', nang: 'VD: 17' };
    const t = Math.min(Math.max(thang, 12), 72);
    const cao = Math.round(75 + (t - 12) * 0.72);
    const nang = Math.round((9.5 + (t - 12) * 0.2) * 10) / 10;
    return { cao: `VD: ${cao}`, nang: `VD: ${nang}` };
  },

  thangTuoiCuaBe(studentId) {
    const s = (App.state.students || []).find(x => x.id === studentId);
    if (!s || !s.dob) return null;
    const ns = UI.parseDate(s.dob);
    if (!ns || Number.isNaN(ns.getTime())) return null;
    const nay = new Date();
    let thang = (nay.getFullYear() - ns.getFullYear()) * 12 + (nay.getMonth() - ns.getMonth());
    if (nay.getDate() < ns.getDate()) thang -= 1;
    return thang >= 0 ? thang : null;
  },

  // Đổi bé trong ô chọn thì chữ mờ đổi theo — không thì cô chọn bé nhà trẻ mà
  // vẫn thấy gợi ý của bé nhóm Lá.
  capNhatGoiYCanDo() {
    const o = document.getElementById('ht-c-student');
    const g = this.goiYCanDo(this.thangTuoiCuaBe(o && o.value));
    const cao = document.getElementById('ht-height');
    const nang = document.getElementById('ht-weight');
    if (cao) cao.placeholder = g.cao;
    if (nang) nang.placeholder = g.nang;
  },

  // ---- Giáo viên: thêm ghi nhận ----
  openCreate() {
    const students = App.state.students || [];
    this._newType = 'checkup';
    const goiY = this.goiYCanDo(this.thangTuoiCuaBe(this._sid || (students[0] || {}).id));
    UI.modal(`
      <div class="field">
        <label>Bé</label>
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
        <input id="ht-title" placeholder="VD: Cân đo định kỳ đầu năm">
      </div>
      <div class="field">
        <label>Chi tiết</label>
        <textarea id="ht-detail" placeholder="VD: Sức khỏe tổng quát tốt. Răng miệng bình thường."></textarea>
      </div>
      <div class="grid-2" id="ht-metrics">
        <div class="field">
          <label>Chiều cao (cm)</label>
          <input type="number" id="ht-height" min="0" step="0.1" placeholder="${UI.esc(goiY.cao)}">
        </div>
        <div class="field">
          <label>Cân nặng (kg)</label>
          <input type="number" id="ht-weight" min="0" step="0.1" placeholder="${UI.esc(goiY.nang)}">
        </div>
      </div>
      <div class="field">
        <label>Ngày ghi nhận</label>
        <input type="date" id="ht-date" value="${UI.todayStr()}">
        <div class="hint">Mặc định hôm nay. Đổi lại khi nhập kết quả khám định kỳ hay đợt tiêm chủng đã làm trước đó.</div>
      </div>
      <button class="btn primary block" onclick="App.views.health.submitCreate()">${UI.icon('check', 18)} Lưu ghi nhận</button>
    `, 'Thêm ghi nhận y tế');

    const oBe = document.getElementById('ht-c-student');
    if (oBe) oBe.onchange = () => this.capNhatGoiYCanDo();
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
    const ngay = (document.getElementById('ht-date') || {}).value;
    if (ngay) body.date = ngay;
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

  // ---- Sửa lại và thu hồi một ghi nhận y tế ----
  //
  // Một ghi nhận kiểu "sốt, nghi tay chân miệng" bấm nhầm sang bé khác
  // trước đây gắn vĩnh viễn vào hồ sơ đứa trẻ, mà hiệu trưởng cũng không gỡ được.
  openSua(id) {
    const r = (this._records || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    this._typeSua = r.type;
    UI.modal(`
      <div class="field">
        <label>Loại ghi nhận</label>
        <div class="seg" id="ht-s-seg" style="margin-bottom:0">
          <button data-type="checkup" class="${r.type === 'checkup' ? 'active' : ''}" onclick="App.views.health.pickTypeSua('checkup')">🩺 Khám</button>
          <button data-type="vaccination" class="${r.type === 'vaccination' ? 'active' : ''}" onclick="App.views.health.pickTypeSua('vaccination')">💉 Tiêm chủng</button>
          <button data-type="incident" class="${r.type === 'incident' ? 'active' : ''}" onclick="App.views.health.pickTypeSua('incident')">🩹 Sự cố</button>
        </div>
      </div>
      <div class="field"><label>Tiêu đề</label><input id="ht-s-title" value="${UI.esc(r.title)}"></div>
      <div class="field"><label>Chi tiết</label><textarea id="ht-s-detail">${UI.esc(r.detail || '')}</textarea></div>
      <div class="grid-2">
        <div class="field"><label>Chiều cao (cm)</label><input type="number" id="ht-s-height" min="0" step="0.1" value="${UI.esc(r.height ?? '')}"></div>
        <div class="field"><label>Cân nặng (kg)</label><input type="number" id="ht-s-weight" min="0" step="0.1" value="${UI.esc(r.weight ?? '')}"></div>
      </div>
      <div class="field"><label>Ngày ghi nhận</label><input type="date" id="ht-s-date" value="${UI.esc(r.date)}"></div>
      <button class="btn primary block" id="ht-s-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa ghi nhận y tế');

    document.getElementById('ht-s-luu').onclick = async () => {
      const title = document.getElementById('ht-s-title').value.trim();
      if (!title) return UI.toast('Cô nhập tiêu đề ghi nhận giúp nhé', 'error');
      try {
        await API.put(`/api/health/${encodeURIComponent(id)}`, {
          type: this._typeSua,
          title,
          detail: document.getElementById('ht-s-detail').value.trim(),
          height: document.getElementById('ht-s-height').value || null,
          weight: document.getElementById('ht-s-weight').value || null,
          date: document.getElementById('ht-s-date').value || undefined,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  pickTypeSua(t) {
    this._typeSua = t;
    document.querySelectorAll('#ht-s-seg button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  },

  hoiThuHoi(id) {
    const r = (this._records || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    UI.modal(`
      <p style="line-height:1.6">Thu hồi ghi nhận <b>"${UI.esc(r.title)}"</b>?</p>
      <p class="muted small" style="line-height:1.6">
        Ghi nhận sẽ biến khỏi hồ sơ sức khỏe của bé. <b>Nội dung vẫn được giữ lại</b>
        trong hệ thống để tra khi có khiếu nại. Dùng khi ghi nhầm sang bé khác.
      </p>
      <button class="btn primary block mt-14" id="ht-th-ok">Xác nhận thu hồi</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Thu hồi ghi nhận y tế');

    document.getElementById('ht-th-ok').onclick = async () => {
      try {
        await API.del(`/api/health/${encodeURIComponent(id)}`);
        UI.toast('Đã thu hồi ghi nhận', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};

// Dòng thông tin nhãn – giá trị trong modal chi tiết y tế.
function infoRowHealth(label, value) {
  return `<div class="list-row"><div class="row-main"><div class="row-sub">${UI.esc(label)}</div><div class="row-title">${UI.esc(value ?? '—')}</div></div></div>`;
}
