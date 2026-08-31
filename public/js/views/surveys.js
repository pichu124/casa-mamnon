// Phân hệ Khảo sát.
// Phụ huynh: trả lời / xem lại khảo sát. Giáo viên: tạo khảo sát, xem kết quả, đóng khảo sát.
App.views.surveys = {
  async render(root) {
    // VAI QUẢN TRỊ KHÔNG PHẢI PHỤ HUYNH.
    //
    // Nhánh cũ chỉ hỏi `role === 'teacher'`, nên hiệu trưởng và văn phòng rơi
    // vào màn của PHỤ HUYNH: được mời điền phiếu / gửi đơn, bấm vào là nhận
    // "Không có quyền thực hiện". Nặng hơn phần thẩm mỹ — "lấy ý kiến phụ
    // huynh" và "nhận thuốc gia đình gửi" đều là việc của văn phòng, mà văn
    // phòng lại là vai duy nhất không có nút để làm.
    //
    // Dùng được `renderTeacher` cho quản trị vì nhánh đó CHỈ hỏi máy chủ
    // (`/api/surveys`, `/api/medicine`) — máy chủ tự cắt theo phạm vi người
    // gọi — và mọi đường ghi của nó đã nhận `requireRole('teacher', 'admin')`
    // từ đầu. KHÔNG dùng được ở màn Điểm danh: nhánh cô ở đó đọc
    // `user.nhomCuaCo`, mà `routes/auth.js` chỉ gán ô ấy cho vai `teacher`
    // (xem chú thích Đ97 ở public/js/views/attendance.js).
    if (App.state.user.role !== 'parent') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ==== Phụ huynh ====
  async renderParent(root) {
    const list = await API.get('/api/surveys');
    const open = list.filter(s => s.status === 'open');
    const closed = list.filter(s => s.status !== 'open');
    root.innerHTML = `
      ${UI.pageHeader('Khảo sát')}
      <div class="section-label">Đang diễn ra</div>
      ${open.length ? open.map(s => this.parentCard(s)).join('') : UI.emptyState('📋', 'Không có khảo sát nào đang diễn ra')}
      <div class="section-label">Đã kết thúc</div>
      ${closed.length ? closed.map(s => this.parentCard(s, true)).join('') : UI.emptyState('🗂️', 'Chưa có khảo sát nào kết thúc')}`;
  },

  parentCard(s, ended = false) {
    return `
      <div class="card clickable" ${ended ? 'style="opacity:.6"' : ''} onclick="App.views.surveys.openParent('${UI.esc(s.id)}')">
        <div style="font-weight:700">${UI.esc(s.title)}</div>
        ${s.description ? `<div class="muted small mt-8">${UI.esc(s.description)}</div>` : ''}
        <div class="flex mt-8">
          <span class="muted small">Hạn: ${UI.fmtDateShort(s.deadline)} · ${s.questionCount} câu hỏi</span>
          <span class="spacer"></span>
          ${s.answered ? UI.badge('Đã trả lời', 'green') : UI.badge('Chưa trả lời', 'orange')}
        </div>
      </div>`;
  },

  async openParent(id) {
    try {
      const sv = await API.get(`/api/surveys/${id}`);
      if (sv.status === 'open' && !sv.myResponse) return this.showAnswerForm(sv);
      this.showReview(sv);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Modal điền phiếu trả lời.
  showAnswerForm(sv) {
    this._survey = sv;
    UI.modal(`
      ${sv.description ? `<p class="muted small mb-8">${UI.esc(sv.description)}</p>` : ''}
      <div class="muted small mb-8">Hạn trả lời: ${UI.fmtDate(sv.deadline, { weekday: false })}</div>
      <form id="survey-form" onsubmit="return false">
        ${sv.questions.map((q, i) => `
          <div class="field">
            <label>Câu ${i + 1}. ${UI.esc(q.text)}</label>
            ${q.type === 'choice'
              ? (q.options || []).map(opt => `
                <label style="display:flex;align-items:center;gap:10px;padding:9px 4px;font-weight:500;cursor:pointer;border-bottom:1px solid var(--line)">
                  <input type="radio" name="ans-${UI.esc(q.id)}" value="${UI.esc(opt)}" style="width:18px;height:18px;accent-color:var(--primary);flex:none">
                  <span>${UI.esc(opt)}</span>
                </label>`).join('')
              : `<textarea name="ans-${UI.esc(q.id)}" placeholder="Nhập câu trả lời của gia đình..."></textarea>`}
          </div>`).join('')}
        <button class="btn primary block" onclick="App.views.surveys.submitAnswers()">${UI.icon('send', 18)} Gửi câu trả lời</button>
      </form>`, sv.title);
  },

  async submitAnswers() {
    const sv = this._survey;
    const form = document.getElementById('survey-form');
    if (!sv || !form) return;
    const answers = {};
    for (const q of sv.questions) {
      if (q.type === 'choice') {
        const checked = form.querySelector(`input[name="ans-${q.id}"]:checked`);
        if (!checked) return UI.toast('Vui lòng trả lời đầy đủ các câu trắc nghiệm', 'error');
        answers[q.id] = checked.value;
      } else {
        const ta = form.querySelector(`textarea[name="ans-${q.id}"]`);
        const val = ta ? ta.value.trim() : '';
        if (val) answers[q.id] = val;
      }
    }
    try {
      await API.post(`/api/surveys/${sv.id}/respond`, { answers });
      UI.toast('Đã gửi câu trả lời. Cảm ơn quý phụ huynh!', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Modal xem lại câu trả lời của mình (hoặc khảo sát đã kết thúc).
  showReview(sv) {
    const my = sv.myResponse;
    UI.modal(`
      <div class="mb-8">
        ${sv.status === 'open' ? UI.badge('Đang diễn ra', 'green') : UI.badge('Đã kết thúc', 'gray')}
        ${my ? UI.badge('Đã trả lời', 'blue') : UI.badge('Chưa trả lời', 'orange')}
      </div>
      ${my ? `<div class="muted small mb-8">Gửi lúc ${UI.fmtTime(my.submittedAt)}, ${UI.fmtDate(my.submittedAt, { weekday: false })}</div>` : ''}
      ${sv.questions.map((q, i) => `
        <div style="padding:11px 0;border-bottom:1px solid var(--line)">
          <div style="font-weight:700;font-size:.93rem">Câu ${i + 1}. ${UI.esc(q.text)}</div>
          <div class="mt-8">${my && my.answers && my.answers[q.id]
            ? UI.esc(my.answers[q.id])
            : '<span class="muted">Không trả lời</span>'}</div>
        </div>`).join('')}
      ${!my ? '<p class="muted small mt-14 center">Khảo sát đã kết thúc, bạn chưa gửi câu trả lời.</p>' : ''}`, sv.title);
  },

  // ==== Giáo viên ====
  async renderTeacher(root) {
    const list = await API.get('/api/surveys');
    root.innerHTML = `
      ${UI.pageHeader('Khảo sát', { action: { id: 'btn-new-survey', label: 'Tạo khảo sát', icon: 'plus' } })}
      ${list.length ? list.map(s => `
        <div class="card clickable" onclick="App.views.surveys.openResults('${UI.esc(s.id)}')">
          <div class="flex">
            <div style="font-weight:700;flex:1;min-width:0">${UI.esc(s.title)}</div>
            ${s.status === 'open' ? UI.badge('Đang mở', 'green') : UI.badge('Đã đóng', 'gray')}
          </div>
          ${s.description ? `<div class="muted small mt-8">${UI.esc(s.description)}</div>` : ''}
          <div class="flex mt-8">
            <span class="muted small">Hạn: ${UI.fmtDateShort(s.deadline)} · ${s.questionCount} câu hỏi</span>
            <span class="spacer"></span>
            ${UI.badge(`${s.responseCount} phản hồi`, 'blue')}
          </div>
        </div>`).join('') : UI.emptyState('📋', 'Chưa có khảo sát nào')}`;
    document.getElementById('btn-new-survey').onclick = () => this.openCreate();
  },

  // Modal tạo khảo sát mới.
  openCreate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const defDeadline = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    UI.modal(`
      <div class="field"><label>Tiêu đề khảo sát</label>
        <input id="sv-title" placeholder="Ví dụ: Khảo sát ý kiến phụ huynh về..."></div>
      <div class="field"><label>Mô tả</label>
        <textarea id="sv-desc" placeholder="Đôi lời gửi tới quý phụ huynh về mục đích khảo sát..."></textarea></div>
      <div class="field"><label>Hạn trả lời</label>
        <input id="sv-deadline" type="date" value="${defDeadline}"></div>
      <div class="field"><label>Câu hỏi</label>
        <div id="sv-questions"></div>
        <button class="btn outline sm mt-8" onclick="App.views.surveys.addQuestion()">${UI.icon('plus', 15)} Thêm câu hỏi</button>
      </div>
      <button class="btn primary block" onclick="App.views.surveys.submitCreate()">Tạo khảo sát</button>`, 'Tạo khảo sát mới');
    this.addQuestion();
  },

  // Thêm một khối câu hỏi vào form tạo khảo sát.
  addQuestion() {
    const zone = document.getElementById('sv-questions');
    if (!zone) return;
    const item = document.createElement('div');
    item.className = 'sv-q';
    item.style.cssText = 'border:1.5px solid var(--line);border-radius:12px;padding:11px;margin-bottom:10px';
    item.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input class="q-text" placeholder="Nội dung câu hỏi" style="flex:1;min-width:0;border:1.5px solid var(--line);border-radius:10px;padding:9px 11px;outline:none">
        <button style="color:var(--muted);padding:6px;flex:none" title="Xóa câu hỏi" aria-label="Xóa câu hỏi"
          onclick="this.closest('.sv-q').remove()">${UI.icon('x', 18)}</button>
      </div>
      <select class="q-type" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--surface);margin-bottom:8px;outline:none"
        onchange="this.parentElement.querySelector('.q-options').style.display = this.value === 'choice' ? '' : 'none'">
        <option value="choice">Trắc nghiệm</option>
        <option value="text">Tự luận</option>
      </select>
      <input class="q-options" placeholder="Các lựa chọn, phân cách bằng dấu phẩy" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:9px 11px;outline:none">`;
    zone.appendChild(item);
  },

  async submitCreate() {
    const title = document.getElementById('sv-title').value.trim();
    const description = document.getElementById('sv-desc').value.trim();
    const deadline = document.getElementById('sv-deadline').value;
    const questions = [...document.querySelectorAll('#sv-questions .sv-q')].map(el => {
      const q = { text: el.querySelector('.q-text').value.trim(), type: el.querySelector('.q-type').value };
      if (q.type === 'choice') {
        q.options = el.querySelector('.q-options').value.split(',').map(o => o.trim()).filter(Boolean);
      }
      return q;
    });
    if (!title) return UI.toast('Vui lòng nhập tiêu đề khảo sát', 'error');
    if (!deadline) return UI.toast('Vui lòng chọn hạn trả lời', 'error');
    if (!questions.length) return UI.toast('Khảo sát cần ít nhất 1 câu hỏi', 'error');
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text) return UI.toast(`Vui lòng nhập nội dung câu hỏi ${i + 1}`, 'error');
      if (questions[i].type === 'choice' && questions[i].options.length < 2) {
        return UI.toast(`Câu ${i + 1}: cần ít nhất 2 lựa chọn, phân cách bằng dấu phẩy`, 'error');
      }
    }
    try {
      await API.post('/api/surveys', { title, description, deadline, questions });
      UI.toast('Đã tạo khảo sát mới', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Modal kết quả tổng hợp.
  async openResults(id) {
    try {
      const sv = await API.get(`/api/surveys/${id}`);
      UI.modal(`
        <div class="flex mb-8">
          ${sv.status === 'open' ? UI.badge('Đang mở', 'green') : UI.badge('Đã đóng', 'gray')}
          ${UI.badge(`${sv.responseCount} phản hồi`, 'blue')}
          <span class="spacer"></span>
          <span class="muted small">Hạn: ${UI.fmtDateShort(sv.deadline)}</span>
        </div>
        ${sv.results.map((r, i) => `
          <div style="padding:12px 0;border-bottom:1px solid var(--line)">
            <div style="font-weight:700;font-size:.93rem">Câu ${i + 1}. ${UI.esc(r.text)}</div>
            ${r.type === 'choice' ? this.choiceBars(r) : this.textAnswers(r)}
          </div>`).join('')}
        <div class="mt-14">
          <div style="font-weight:700;font-size:.9rem">Phụ huynh đã trả lời (${sv.respondents.length})</div>
          <div class="muted small mt-8">${sv.respondents.length
            ? sv.respondents.map(n => UI.esc(n)).join(', ')
            : 'Chưa có phụ huynh nào trả lời'}</div>
          ${sv.responseCount > (sv.soPhieuTrongPhamVi ?? sv.respondents.length) ? `
            <div class="hint mt-8">
              Khảo sát này gửi cho cả trường và đã có ${sv.responseCount} phiếu.
              Ở đây chỉ hiện ${sv.soPhieuTrongPhamVi ?? sv.respondents.length} phiếu
              của các nhóm mình phụ trách — ý kiến gia đình gửi nhà trường là
              chuyện riêng của từng nhà.
            </div>` : ''}
        </div>
        ${sv.status === 'open' && sv.createdByMe
          ? `<button class="btn danger-soft block mt-14" onclick="App.views.surveys.closeSurvey('${UI.esc(sv.id)}')">Đóng khảo sát</button>`
          : ''}`, sv.title);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Thanh phần trăm cho câu trắc nghiệm.
  choiceBars(r) {
    const total = r.counts.reduce((sum, c) => sum + c.count, 0);
    return r.counts.map(c => {
      const pct = total ? Math.round(c.count * 100 / total) : 0;
      return `
        <div class="mt-8">
          <div class="flex" style="font-size:.86rem">
            <span>${UI.esc(c.option)}</span>
            <span class="spacer"></span>
            <span class="muted">${c.count} phiếu (${pct}%)</span>
          </div>
          <div style="background:#e8ecf3;border-radius:6px;margin-top:4px;overflow:hidden">
            <div style="background:var(--primary);height:8px;width:${pct}%;border-radius:6px"></div>
          </div>
        </div>`;
    }).join('');
  },

  // Danh sách câu trả lời tự luận kèm tên phụ huynh.
  textAnswers(r) {
    if (!r.answers.length) return '<div class="muted small mt-8">Chưa có câu trả lời</div>';
    return r.answers.map(a => `
      <div class="mt-8" style="background:#f4f6fa;border-radius:10px;padding:9px 12px;font-size:.9rem">
        “${UI.esc(a.answer)}”
        <div class="muted small" style="margin-top:3px">— ${UI.esc(a.parentName)}</div>
      </div>`).join('');
  },

  async closeSurvey(id) {
    try {
      await API.post(`/api/surveys/${id}/close`);
      UI.toast('Đã đóng khảo sát', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
