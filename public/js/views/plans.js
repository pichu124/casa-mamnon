// Phân hệ Kế hoạch giáo dục tháng.
// Phụ huynh: xem theo nhóm của con đang chọn. Cô: xem theo nhóm mình phụ trách.
// Cô phụ trách/quản trị soạn kế hoạch từng tháng ngay tại đây (chủ đề, mục tiêu, tuần, lời nhắn).
//
// Cô mầm non có thể phụ trách 2–3 nhóm, và mỗi nhóm có kế hoạch riêng. Bản đầu
// lấy cứng `nhomCuaCo[0]` và ghi chú là "ô chọn nhóm nằm ở màn Điểm danh" —
// nhưng ô đó chỉ đổi nhóm cho màn Điểm danh, không đổi cho màn này. Nghĩa là cô
// dạy hai nhóm KHÔNG có đường nào soạn kế hoạch cho nhóm thứ hai. Ô chọn chỉ
// hiện khi cô có nhiều hơn một nhóm; cô một nhóm không thấy nó.
App.views.plans = {
  _classId: null,
  _plans: [],

  async render(root) {
    const user = App.state.user;
    let classId;
    const dsNhom = user.role === 'teacher' ? (user.nhomCuaCo || []) : [];
    if (user.role === 'teacher') {
      // Giữ nhóm cô đang chọn, nếu nhóm đó vẫn còn thuộc về cô. Quản trị vừa rút
      // cô khỏi một nhóm thì rơi về nhóm đầu, không kẹt ở nhóm không còn quyền.
      if (!dsNhom.some(n => n.id === this._classId)) {
        this._classId = dsNhom[0]?.id || user.classId || null;
      }
      classId = this._classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Kế hoạch giáo dục') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    this._classId = classId;
    // CÔ CHƯA ĐƯỢC PHÂN CÔNG NHÓM NÀO.
    //
    // Không chặn ở đây thì `classId` là null, chuỗi truy vấn thành
    // `?classId=null`, máy chủ không tìm thấy nhóm tên "null" và trả "Không tìm
    // thấy nhóm lớp" — màn hình hiện "Có lỗi xảy ra 😥" rồi đổ lỗi cho một nhóm
    // không tồn tại. Cô sẽ đi tìm xem mình bấm sai chỗ nào, trong khi việc cần
    // làm là nhờ văn phòng phân công nhóm.
    if (!classId) {
      root.innerHTML = UI.pageHeader('Kế hoạch giáo dục')
        + UI.emptyState('🧭', 'Cô chưa phụ trách nhóm nào nên chưa có kế hoạch để xem. '
          + 'Nhờ văn phòng nhà trường phân công nhóm giúp cô nhé.');
      return;
    }
    const data = await API.get(`/api/plans?classId=${encodeURIComponent(classId)}`);
    this._plans = data.plans || [];
    const suaDuoc = this.canEdit();
    root.innerHTML = `
      ${UI.pageHeader('Kế hoạch giáo dục', suaDuoc ? { action: { id: 'btn-soan-kh', label: 'Soạn kế hoạch', icon: 'edit' } } : {})}
      ${UI.studentBar()}${UI.thanhChonBe()}
      ${this.oChonNhom(dsNhom)}
      ${data.plan ? this.renderPlan(data.plan) : UI.emptyState('📖', 'Chưa có kế hoạch giáo dục cho tháng này')}`;
    if (suaDuoc) document.getElementById('btn-soan-kh').onclick = () => this.moSoan();
  },

  // Ô chọn nhóm — chỉ hiện khi cô phụ trách nhiều hơn một nhóm.
  oChonNhom(dsNhom) {
    if (!dsNhom || dsNhom.length < 2) return '';
    return `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Nhóm lớp</label>
          <select onchange="App.views.plans.setNhom(this.value)">
            ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this._classId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;
  },

  setNhom(value) {
    if (!value || value === this._classId) return;
    this._classId = value;
    App.route();
  },

  // Cô phụ trách soạn cho nhóm mình; quản trị soạn nhóm bất kỳ; phụ huynh chỉ xem.
  canEdit() {
    const u = App.state.user;
    if (!u) return false;
    if (u.role === 'admin') return true;
    return u.role === 'teacher' && (u.classIds || []).includes(this._classId);
  },

  renderPlan(p) {
    const goals = p.goals || [];
    const weeks = p.weeks || [];
    return `
      <div class="card">
        <div style="font-size:1.18rem;font-weight:800">Tháng ${p.month} – ${UI.esc(p.theme)}</div>
        <div class="muted small mt-8">Cô phụ trách: ${UI.esc(p.teacherNames || p.teacherName)}${p.className ? ` · ${UI.esc(p.className)}` : ''}</div>
      </div>

      <div class="card">
        <div class="card-title">Mục tiêu tháng</div>
        ${goals.length
          ? goals.map(g => `<div style="padding:6px 0;line-height:1.5">✅ ${UI.esc(g)}</div>`).join('')
          : '<div class="muted small">Chưa có mục tiêu</div>'}
      </div>

      <div class="card">
        <div class="card-title">Kế hoạch từng tuần</div>
        ${weeks.length
          ? weeks.map((w, i) => `
            <div style="padding:11px 0;${i < weeks.length - 1 ? 'border-bottom:1px solid var(--line)' : ''}">
              ${UI.badge(`Tuần ${w.week}`, 'blue')}
              <div style="font-weight:700;margin-top:7px">${UI.esc(w.focus)}</div>
              <div class="muted small mt-8" style="line-height:1.5">${UI.esc(w.activities)}</div>
            </div>`).join('')
          : '<div class="muted small">Chưa có kế hoạch tuần</div>'}
      </div>

      ${p.note ? `
        <div class="card" style="background:#fff8e1;border-radius:12px">
          💌 <b>Nhắn gửi phụ huynh:</b> ${UI.esc(p.note)}
        </div>` : ''}`;
  },

  // ---- Cô phụ trách / quản trị: soạn kế hoạch một tháng ----

  // Danh sách tháng chọn được: tháng trước → 4 tháng tới, gộp thêm các tháng đã soạn.
  cacThangChonDuoc() {
    const now = new Date();
    const ds = new Map();
    for (let i = -1; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      ds.set(`${d.getFullYear()}-${d.getMonth() + 1}`, { year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    for (const p of this._plans) ds.set(`${p.year}-${p.month}`, { year: p.year, month: p.month });
    return [...ds.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  },

  // Mở modal soạn cho tháng `ym` dạng "YYYY-M" (mặc định: tháng hiện tại).
  moSoan(ym) {
    const now = new Date();
    const [year, month] = (ym || `${now.getFullYear()}-${now.getMonth() + 1}`).split('-').map(Number);
    const p = this._plans.find(x => x.year === year && x.month === month) || null;
    const weeks = (p && p.weeks && p.weeks.length ? p.weeks : []).slice(0, 6);
    while (weeks.length < 4) weeks.push({ week: weeks.length + 1, focus: '', activities: '' });

    UI.modal(`
      <div class="field">
        <label>Kế hoạch cho tháng</label>
        <select id="kh-thang" onchange="App.views.plans.moSoan(this.value)">
          ${this.cacThangChonDuoc().map(t => `
            <option value="${t.year}-${t.month}" ${t.year === year && t.month === month ? 'selected' : ''}>
              Tháng ${t.month}/${t.year}${this._plans.some(x => x.year === t.year && x.month === t.month) ? ' — đã soạn' : ''}
            </option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Chủ đề của tháng</label>
        <input id="kh-chude" value="${UI.esc(p ? p.theme : '')}" placeholder="VD: Trường mầm non của bé">
      </div>
      <div class="field">
        <label>Mục tiêu tháng — mỗi dòng một mục tiêu</label>
        <textarea id="kh-muctieu" rows="3" placeholder="VD: Bé tự cất ba lô, cất dép vào đúng ô">${UI.esc((p && p.goals ? p.goals : []).join('\n'))}</textarea>
      </div>
      ${weeks.map((w, i) => `
        <div style="border-top:1px solid var(--line);padding-top:10px;margin-top:12px">
          <div style="font-weight:700;margin-bottom:8px">Tuần ${i + 1}</div>
          <div class="field">
            <label>Trọng tâm</label>
            <input id="kh-tt-${i}" value="${UI.esc(w.focus || '')}" placeholder="VD: Làm quen cô, bạn và các góc chơi">
          </div>
          <div class="field">
            <label>Hoạt động</label>
            <textarea id="kh-hd-${i}" rows="2" placeholder="VD: Chơi đóng vai bán hàng theo nhóm ba bé; xây nhà bằng khối gỗ">${UI.esc(w.activities || '')}</textarea>
          </div>
        </div>`).join('')}
      <div class="field" style="border-top:1px solid var(--line);padding-top:10px;margin-top:12px">
        <label>💌 Nhắn gửi phụ huynh (không bắt buộc)</label>
        <textarea id="kh-loinhan" rows="2" placeholder="VD: Ở nhà gia đình thử để bé tự xúc bữa tối nhé">${UI.esc(p ? (p.note || '') : '')}</textarea>
      </div>
      <button class="btn primary block" onclick="App.views.plans.luuKeHoach(${year}, ${month}, ${weeks.length})">${UI.icon('check', 18)} Lưu kế hoạch</button>
    `, 'Soạn kế hoạch giáo dục');
  },

  async luuKeHoach(year, month, soTuan) {
    const theme = document.getElementById('kh-chude').value.trim();
    if (!theme) return UI.toast('Cô nhập chủ đề của tháng giúp nhé', 'error');
    const goals = document.getElementById('kh-muctieu').value.split('\n').map(s => s.trim()).filter(Boolean);
    const weeks = [];
    for (let i = 0; i < soTuan; i++) {
      weeks.push({
        week: i + 1,
        focus: document.getElementById(`kh-tt-${i}`).value.trim(),
        activities: document.getElementById(`kh-hd-${i}`).value.trim(),
      });
    }
    const note = document.getElementById('kh-loinhan').value.trim();
    try {
      await API.put(`/api/plans/${encodeURIComponent(this._classId)}/${year}/${month}`, { theme, goals, weeks, note });
      UI.toast(`Đã lưu kế hoạch tháng ${month}/${year}`, 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
