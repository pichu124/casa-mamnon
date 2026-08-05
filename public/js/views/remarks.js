// Phân hệ Nhận xét hằng ngày.
// Phụ huynh: dòng thời gian nhận xét của con. Giáo viên: viết nhận xét + xem cả lớp.
App.views.remarks = {
  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: timeline nhận xét của con ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Nhận xét hằng ngày') + UI.emptyState('📝', 'Chưa có học sinh liên kết với tài khoản này');
      return;
    }
    const remarks = await API.get(`/api/remarks?studentId=${encodeURIComponent(current.id)}`);
    root.innerHTML = `
      ${UI.pageHeader('Nhận xét hằng ngày')}
      ${UI.studentBar()}
      ${remarks.length ? `
        <div class="card">
          <div class="timeline">${remarks.map(r => this.tlItem(r)).join('')}</div>
        </div>`
        : UI.emptyState('📝', 'Cô giáo chưa gửi nhận xét nào cho con')}`;
    // Máy chủ đã đánh dấu đã xem — cập nhật lại huy hiệu.
    App.refreshBadges();
  },

  tlItem(r) {
    const rt = UI.RATING[r.rating] || UI.RATING.good;
    return `
      <div class="tl-item">
        <div class="tl-time">${UI.esc(UI.fmtDate(r.date))} ${r.parentSeen ? '' : UI.badge('Mới', 'red')}</div>
        <div class="mt-8">${UI.badge(`${rt.emoji} ${rt.label}`, rt.cls)}</div>
        <div style="margin-top:6px;line-height:1.5">${UI.esc(r.content)}</div>
        ${r.skills && r.skills.length ? `<div class="mt-8">${r.skills.map(k => UI.badge(k, 'gray')).join(' ')}</div>` : ''}
        <div class="muted small" style="margin-top:6px">${UI.icon('edit', 13)} ${UI.esc(r.teacherName)}</div>
      </div>`;
  },

  // ---- Giáo viên: nhận xét gần đây cả lớp + viết mới ----
  async renderTeacher(root) {
    const list = await API.get('/api/remarks/class');
    const cls = App.state.classes.find(c => c.id === App.state.user.classId);
    root.innerHTML = `
      ${UI.pageHeader(`Nhận xét ${cls ? cls.name : ''}`, { action: { id: 'btn-new-remark', label: 'Viết nhận xét', icon: 'plus' } })}
      ${list.length ? `
        <div class="card">
          <div class="card-title">${UI.icon('remark', 19)} Nhận xét gần đây</div>
          ${list.map(r => this.classRow(r)).join('')}
        </div>`
        : UI.emptyState('📝', 'Chưa có nhận xét nào. Hãy viết nhận xét đầu tiên cho các con nhé!')}`;
    document.getElementById('btn-new-remark').onclick = () => this.openForm();
  },

  classRow(r) {
    const rt = UI.RATING[r.rating] || UI.RATING.good;
    return `
      <div class="list-row" style="align-items:flex-start">
        ${UI.avatar(r.studentAvatar, 42)}
        <div class="row-main">
          <div class="flex"><span class="row-title">${UI.esc(r.studentName)}</span><span class="spacer"></span>${UI.badge(`${rt.emoji} ${rt.label}`, rt.cls)}</div>
          <div class="row-sub">${UI.esc(UI.fmtDate(r.date))}</div>
          <div class="small" style="margin-top:4px;line-height:1.45">${UI.esc(r.content)}</div>
        </div>
      </div>`;
  },

  openForm() {
    const students = App.state.students || [];
    if (!students.length) return UI.toast('Lớp chưa có học sinh', 'error');
    UI.modal(`
      <div class="field">
        <label>Học sinh</label>
        <select id="rm-student">
          ${students.map(s => `<option value="${UI.esc(s.id)}">${UI.esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Nội dung nhận xét</label>
        <textarea id="rm-content" placeholder="Hôm nay con học tập, ăn ngủ thế nào..."></textarea>
      </div>
      <div class="field">
        <label>Đánh giá</label>
        <div class="seg" id="rm-rating" style="margin-bottom:0">
          <button type="button" class="active" data-rating="great">🌟 Rất tốt</button>
          <button type="button" data-rating="good">👍 Tốt</button>
          <button type="button" data-rating="needs_effort">💪 Cần cố gắng</button>
        </div>
      </div>
      <div class="field">
        <label>Kỹ năng nổi bật</label>
        <input id="rm-skills" placeholder="Ví dụ: Tập trung, Phát biểu">
        <div class="hint">Phân cách các kỹ năng bằng dấu phẩy</div>
      </div>
      <button class="btn primary block" id="rm-submit">${UI.icon('send', 17)} Gửi nhận xét</button>
    `, 'Viết nhận xét');

    document.querySelectorAll('#rm-rating button').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#rm-rating button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      };
    });
    document.getElementById('rm-submit').onclick = () => this.submitForm();
  },

  async submitForm() {
    const studentId = document.getElementById('rm-student').value;
    const content = document.getElementById('rm-content').value.trim();
    const active = document.querySelector('#rm-rating button.active');
    const rating = active ? active.dataset.rating : 'great';
    const skills = document.getElementById('rm-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!content) return UI.toast('Vui lòng nhập nội dung nhận xét', 'error');
    try {
      await API.post('/api/remarks', { studentId, content, rating, skills });
      UI.toast('Đã gửi nhận xét đến phụ huynh', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};
