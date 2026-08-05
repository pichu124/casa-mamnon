// Phân hệ Kế hoạch giáo dục tháng.
// Phụ huynh: xem theo lớp của con đang chọn. Giáo viên: xem theo lớp chủ nhiệm.
App.views.plans = {
  async render(root) {
    const user = App.state.user;
    let classId;
    if (user.role === 'teacher') {
      classId = user.classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Kế hoạch giáo dục') + UI.emptyState('🎒', 'Chưa có học sinh liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    const data = await API.get(`/api/plans?classId=${encodeURIComponent(classId)}`);
    root.innerHTML = `
      ${UI.pageHeader('Kế hoạch giáo dục')}
      ${UI.studentBar()}
      ${data.plan ? this.renderPlan(data.plan) : UI.emptyState('📖', 'Chưa có kế hoạch giáo dục cho tháng này')}`;
  },

  renderPlan(p) {
    const goals = p.goals || [];
    const weeks = p.weeks || [];
    return `
      <div class="card">
        <div style="font-size:1.18rem;font-weight:800">Tháng ${p.month} – ${UI.esc(p.theme)}</div>
        <div class="muted small mt-8">GVCN: ${UI.esc(p.teacherName)}${p.className ? ` · ${UI.esc(p.className)}` : ''}</div>
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
};
