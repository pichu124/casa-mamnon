// Phân hệ Nề nếp.
// Phụ huynh: điểm thi đua + ghi nhận của con. Giáo viên: bảng xếp hạng lớp + ghi nhận mới.
App.views.conduct = {
  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Nề nếp') + UI.emptyState('🎒', 'Chưa có học sinh liên kết với tài khoản này');
      return;
    }
    const data = await API.get(`/api/conduct?studentId=${encodeURIComponent(current.id)}`);
    const praise = data.records.filter(r => r.type === 'praise').length;
    const reminder = data.records.filter(r => r.type === 'reminder').length;
    root.innerHTML = `
      ${UI.pageHeader('Nề nếp')}
      ${UI.studentBar()}
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${data.totalPoints}</div><div class="stat-label">Tổng điểm</div></div>
        <div class="stat-box"><div class="stat-num">${praise}</div><div class="stat-label">Tuyên dương</div></div>
        <div class="stat-box"><div class="stat-num">${reminder}</div><div class="stat-label">Nhắc nhở</div></div>
      </div>
      ${data.records.length
        ? `<div class="card">${data.records.map(r => this.recordRow(r)).join('')}</div>`
        : UI.emptyState('📋', 'Chưa có ghi nhận nề nếp nào')}`;
  },

  // ---- Giáo viên ----
  // Số ghi nhận hiện trên màn hình. Mặc định máy chủ trả 50 bản ghi gần nhất —
  // học sinh mang lịch sử nề nếp qua từng năm nên lấy hết là màn này nặng thêm
  // mỗi năm. Bấm "Xem thêm" thì nâng dần.
  _soGhiNhan: 50,

  async renderTeacher(root) {
    const data = await API.get(`/api/conduct/class?gioiHan=${this._soGhiNhan}`);
    this._recent = data.recent;
    const tenNhom = (App.state.user.nhomCuaCo || []).map(n => n.name).join(', ');
    const medals = ['🥇', '🥈', '🥉'];
    root.innerHTML = `
      ${UI.pageHeader(`Nề nếp ${tenNhom}`, { action: { id: 'conduct-add', label: 'Ghi nhận', icon: 'plus' } })}
      <div class="card">
        <div class="card-title">${UI.icon('star', 19)} Bảng điểm thi đua</div>
        ${data.ranking.length ? data.ranking.map((r, i) => `
          <div class="list-row">
            ${UI.avatar(r.avatar, 40)}
            <div class="row-main"><div class="row-title">${i < 3 ? medals[i] + ' ' : ''}${UI.esc(r.studentName)}</div></div>
            <span class="row-end">${this.pointBadge(r.points)}</span>
          </div>`).join('') : UI.emptyState('🏆', 'Lớp chưa có học sinh nào')}
      </div>
      <div class="section-label">Ghi nhận gần đây</div>
      ${data.recent.length
        ? `<div class="card">${data.recent.map(r => this.recordRow(r)).join('')}</div>`
        : UI.emptyState('📋', 'Chưa có ghi nhận nào trong lớp')}
      ${data.tongGhiNhan > data.recent.length ? `
        <div class="muted small center">Đang hiện ${data.recent.length} ghi nhận gần nhất trong tổng số ${data.tongGhiNhan}</div>
        <button class="btn outline block mt-8" id="conduct-them">Xem thêm</button>` : ''}`;

    document.getElementById('conduct-add').onclick = () => this.openModal();
    const nutThem = document.getElementById('conduct-them');
    if (nutThem) nutThem.onclick = () => { this._soGhiNhan += 50; App.route(); };
  },

  // Một dòng ghi nhận (dùng chung; có studentName thì hiện kèm).
  recordRow(r) {
    const praise = r.type === 'praise';
    return `
      <div class="list-row" style="align-items:flex-start">
        <span class="row-icon" style="background:${praise ? '#e3f7ec' : '#fef0e0'};font-size:20px">${praise ? '🌟' : '📌'}</span>
        <div class="row-main">
          <div class="row-title">${UI.esc(r.title)}</div>
          ${r.content ? `<div class="row-sub">${UI.esc(r.content)}</div>` : ''}
          <div class="row-sub">${r.studentName ? `${UI.esc(r.studentName)} · ` : ''}${UI.fmtDate(r.date, { weekday: false })}${
            r.daSua ? ' · đã chỉnh sửa' : ''}</div>
          ${r.coTheSua ? `
            <div class="flex mt-8" style="gap:6px">
              <button class="btn sm outline" onclick="App.views.conduct.openSua('${UI.esc(r.id)}')">Sửa</button>
              <button class="btn sm outline" onclick="App.views.conduct.hoiThuHoi('${UI.esc(r.id)}')">Thu hồi</button>
            </div>` : ''}
        </div>
        <span class="row-end">${this.pointBadge(r.points)}</span>
      </div>`;
  },

  pointBadge(p) {
    if (p > 0) return UI.badge(`+${p}`, 'green');
    if (p < 0) return UI.badge(`${p}`, 'orange');
    return UI.badge('0', 'gray');
  },

  // ---- Modal ghi nhận mới (giáo viên) ----
  openModal() {
    this._type = 'praise';
    UI.modal(`
      <div class="field">
        <label>Học sinh</label>
        <select id="cd-student">
          ${App.state.students.map(s => `<option value="${UI.esc(s.id)}">${UI.esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="seg">
        <button id="cd-type-praise" class="active" onclick="App.views.conduct.setType('praise')">🌟 Tuyên dương</button>
        <button id="cd-type-reminder" onclick="App.views.conduct.setType('reminder')">📌 Nhắc nhở</button>
      </div>
      <div class="field">
        <label>Tiêu đề</label>
        <input id="cd-title" placeholder="VD: Tuyên dương giúp đỡ bạn học tập">
      </div>
      <div class="field">
        <label>Nội dung</label>
        <textarea id="cd-content" placeholder="Mô tả cụ thể để phụ huynh nắm rõ..."></textarea>
      </div>
      <div class="field">
        <label>Điểm</label>
        <input id="cd-points" type="number" value="10">
        <div class="hint">Điểm dương cho tuyên dương, điểm âm cho nhắc nhở</div>
      </div>
      <div class="field">
        <label>Ngày ghi nhận</label>
        <input id="cd-date" type="date" value="${UI.todayStr()}">
        <div class="hint">Mặc định là hôm nay. Đổi lại nếu ghi bù cho hôm trước.</div>
      </div>
      <button class="btn primary block" onclick="App.views.conduct.submit()">Lưu ghi nhận</button>
    `, 'Ghi nhận nề nếp');
  },

  setType(t) {
    this._type = t;
    document.getElementById('cd-type-praise').classList.toggle('active', t === 'praise');
    document.getElementById('cd-type-reminder').classList.toggle('active', t === 'reminder');
    document.getElementById('cd-points').value = t === 'praise' ? 10 : -5;
  },

  async submit() {
    const studentId = document.getElementById('cd-student').value;
    const title = document.getElementById('cd-title').value.trim();
    const content = document.getElementById('cd-content').value.trim();
    const points = Number(document.getElementById('cd-points').value);
    if (!title) return UI.toast('Vui lòng nhập tiêu đề', 'error');
    if (!Number.isFinite(points)) return UI.toast('Điểm phải là một số', 'error');
    try {
      await API.post('/api/conduct', {
        studentId, type: this._type, title, content, points,
        date: (document.getElementById('cd-date') || {}).value || undefined,
      });
      UI.toast('Đã ghi nhận nề nếp', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  // ---- Sửa lại và thu hồi một ghi nhận ----
  //
  // Một "nhắc nhở" trừ điểm thi đua bấm nhầm sang học sinh khác trước đây gắn
  // vĩnh viễn vào hồ sơ đứa trẻ: phụ huynh nhìn thấy và khiếu nại mà hiệu trưởng
  // cũng không gỡ được.
  openSua(id) {
    const r = (this._recent || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    UI.modal(`
      <div class="muted small">${UI.esc(r.studentName || '')}</div>
      <div class="seg mt-8">
        <button id="cd-s-praise" class="${r.type === 'praise' ? 'active' : ''}" onclick="App.views.conduct.setTypeSua('praise')">🌟 Tuyên dương</button>
        <button id="cd-s-reminder" class="${r.type === 'reminder' ? 'active' : ''}" onclick="App.views.conduct.setTypeSua('reminder')">📌 Nhắc nhở</button>
      </div>
      <div class="field"><label>Tiêu đề</label><input id="cd-s-title" value="${UI.esc(r.title)}"></div>
      <div class="field"><label>Nội dung</label><textarea id="cd-s-content">${UI.esc(r.content || '')}</textarea></div>
      <div class="field"><label>Điểm</label><input id="cd-s-points" type="number" value="${UI.esc(r.points)}"></div>
      <div class="field"><label>Ngày ghi nhận</label><input id="cd-s-date" type="date" value="${UI.esc(r.date)}"></div>
      <button class="btn primary block" id="cd-s-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa ghi nhận');
    this._typeSua = r.type;

    document.getElementById('cd-s-luu').onclick = async () => {
      const title = document.getElementById('cd-s-title').value.trim();
      const points = Number(document.getElementById('cd-s-points').value);
      if (!title) return UI.toast('Vui lòng nhập tiêu đề', 'error');
      if (!Number.isFinite(points)) return UI.toast('Điểm phải là một số', 'error');
      try {
        await API.put(`/api/conduct/${encodeURIComponent(id)}`, {
          type: this._typeSua,
          title,
          content: document.getElementById('cd-s-content').value.trim(),
          points,
          date: document.getElementById('cd-s-date').value || undefined,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  setTypeSua(t) {
    this._typeSua = t;
    document.getElementById('cd-s-praise').classList.toggle('active', t === 'praise');
    document.getElementById('cd-s-reminder').classList.toggle('active', t === 'reminder');
  },

  hoiThuHoi(id) {
    const r = (this._recent || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    UI.modal(`
      <p style="line-height:1.6">Thu hồi ghi nhận <b>"${UI.esc(r.title)}"</b>${r.studentName ? ` của <b>${UI.esc(r.studentName)}</b>` : ''}?</p>
      <p class="muted small" style="line-height:1.6">
        Ghi nhận sẽ biến khỏi hồ sơ của em và <b>điểm thi đua được cộng/trừ lại
        cho đúng</b>. Nội dung vẫn được giữ trong hệ thống để tra khi có khiếu nại.
      </p>
      <button class="btn primary block mt-14" id="cd-th-ok">Xác nhận thu hồi</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Thu hồi ghi nhận');

    document.getElementById('cd-th-ok').onclick = async () => {
      try {
        await API.del(`/api/conduct/${encodeURIComponent(id)}`);
        UI.toast('Đã thu hồi ghi nhận', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};
