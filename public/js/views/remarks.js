// Phân hệ Nhận xét hằng ngày.
// Phụ huynh: dòng thời gian nhận xét của con. Giáo viên: viết nhận xét + xem cả nhóm.
App.views.remarks = {
  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: timeline nhận xét của con ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Nhận xét hằng ngày') + UI.emptyState('📝', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const remarks = await API.get(`/api/remarks?studentId=${encodeURIComponent(current.id)}`);
    root.innerHTML = `
      ${UI.pageHeader('Nhận xét hằng ngày')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}
      ${remarks.length ? `
        <div class="card">
          <div class="timeline">${remarks.map(r => this.tlItem(r)).join('')}</div>
        </div>`
        : UI.emptyState('📝', 'Cô giáo chưa gửi nhận xét nào cho con')}`;
    // Máy chủ đã đánh dấu đã xem — cập nhật lại huy hiệu.
    App.refreshBadges();
  },

  // BỘ BA BẬC CŨ ĐÃ GỠ KHỎI MÀN HÌNH (Đ203, việc 47).
  //
  // Đây là QUY TẮC 4 của CLAUDE.md: không đặt trẻ trên dưới nhau trên bất kỳ
  // màn nào phụ huynh hoặc cô nhìn thấy. Bộ ba bậc ấy kế thừa từ app 1 (trường
  // tiểu học) và trượt qua cả năm dấu hiệu của bộ dò, nên `test:quy-tac-4` phải
  // dựng một bánh cóc riêng cho đúng mẫu này. Nay gỡ hẳn: còn lại lời nhận xét
  // của cô — thứ nói được điều đã thấy ở đứa trẻ, không phải một bậc đặt nó
  // cạnh các bạn.
  //
  // CỘT `rating` TRONG BẢNG GIỮ NGUYÊN. Bỏ một tính năng là ngưng dùng nó,
  // không phải xoá dữ liệu của nó (Nguyên tắc số 1) — nhận xét cũ của cô vẫn
  // còn đủ, chỉ là màn hình thôi dựng nó thành một cái bậc.
  tlItem(r) {
    return `
      <div class="tl-item">
        <div class="tl-time">${UI.esc(UI.fmtDate(r.date))} ${r.parentSeen ? '' : UI.badge('Mới', 'red')}${
          r.daSua ? ` ${UI.badge('Đã chỉnh sửa', 'gray')}` : ''}</div>
        <div style="margin-top:6px;line-height:1.5">${UI.esc(r.content)}</div>
        ${r.skills && r.skills.length ? `<div class="mt-8">${r.skills.map(k => UI.badge(k, 'gray')).join(' ')}</div>` : ''}
        <div class="muted small" style="margin-top:6px">${UI.icon('edit', 13)} ${UI.esc(r.teacherName)}</div>
      </div>`;
  },

  // ---- Giáo viên: nhận xét gần đây cả nhóm + viết mới ----
  async renderTeacher(root) {
    const list = await API.get('/api/remarks/class');
    this._lop = list;
    const tenNhom = UI.noiTenNhom(App.state.user.nhomCuaCo);
    root.innerHTML = `
      ${UI.pageHeader(`Nhận xét ${tenNhom}`, { action: { id: 'btn-new-remark', label: 'Viết nhận xét', icon: 'plus' } })}
      ${list.length ? `
        <div class="card">
          <div class="card-title">${UI.icon('remark', 19)} Nhận xét gần đây</div>
          ${list.map(r => this.classRow(r)).join('')}
        </div>`
        : UI.emptyState('📝', 'Chưa có nhận xét nào. Hãy viết nhận xét đầu tiên cho các con nhé!')}`;
    document.getElementById('btn-new-remark').onclick = () => this.openForm();
  },

  classRow(r) {
    return `
      <div class="list-row" style="align-items:flex-start">
        ${UI.avatar(r.studentAvatar, 42)}
        <div class="row-main">
          <div class="flex"><span class="row-title">${UI.esc(r.studentName)}</span><span class="spacer"></span></div>
          <div class="row-sub">${UI.esc(UI.fmtDate(r.date))}${r.daSua ? ' · đã chỉnh sửa' : ''}</div>
          <div class="small" style="margin-top:4px;line-height:1.45">${UI.esc(r.content)}</div>
          ${r.coTheSua ? `
            <div class="flex mt-8" style="gap:6px">
              <button class="btn sm outline" onclick="App.views.remarks.openSua('${UI.esc(r.id)}')">Sửa</button>
              <button class="btn sm outline" onclick="App.views.remarks.hoiThuHoi('${UI.esc(r.id)}')">Thu hồi</button>
            </div>` : ''}
        </div>
      </div>`;
  },

  openForm() {
    const students = App.state.students || [];
    if (!students.length) return UI.toast('Nhóm chưa có bé nào', 'error');
    UI.modal(`
      <div class="field">
        <label>Bé</label>
        <select id="rm-student">
          ${students.map(s => `<option value="${UI.esc(s.id)}">${UI.esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Nội dung nhận xét</label>
        <textarea id="rm-content" placeholder="Hôm nay con học tập, ăn ngủ thế nào..."></textarea>
      </div>
      <div class="field">
        <label>Kỹ năng nổi bật</label>
        <input id="rm-skills" placeholder="Ví dụ: Tập trung, Phát biểu">
        <div class="hint">Phân cách các kỹ năng bằng dấu phẩy</div>
      </div>
      <button class="btn primary block" id="rm-submit">${UI.icon('send', 17)} Gửi nhận xét</button>
    `, 'Viết nhận xét');

    document.getElementById('rm-submit').onclick = () => this.submitForm();
  },

  async submitForm() {
    const studentId = document.getElementById('rm-student').value;
    const content = document.getElementById('rm-content').value.trim();
    const skills = document.getElementById('rm-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!content) return UI.toast('Vui lòng nhập nội dung nhận xét', 'error');
    try {
      // KHÔNG GỬI `rating` NỮA. Máy chủ để trống thì tự điền mức trung tính —
      // xem chú thích ở `routes/remarks.js`. Gửi một mức cứng từ đây là màn
      // hình vẫn đang xếp bậc đứa trẻ, chỉ là xếp lén.
      await API.post('/api/remarks', { studentId, content, skills });
      UI.toast('Đã gửi nhận xét đến phụ huynh', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  // ---- Sửa lại và thu hồi một nhận xét ----
  openSua(id) {
    const r = (this._lop || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy nhận xét này', 'error');
    UI.modal(`
      <div class="muted small">${UI.esc(r.studentName || '')}</div>
      <div class="field mt-8"><label>Nội dung nhận xét</label><textarea id="rm-s-content">${UI.esc(r.content)}</textarea></div>
      <div class="field">
        <label>Kỹ năng nổi bật</label>
        <input id="rm-s-skills" value="${UI.esc((r.skills || []).join(', '))}">
        <div class="hint">Phân cách các kỹ năng bằng dấu phẩy</div>
      </div>
      <div class="field"><label>Ngày nhận xét</label><input type="date" id="rm-s-date" value="${UI.esc(r.date)}"></div>
      <div class="muted small" style="line-height:1.6">
        Phụ huynh sẽ thấy nhận xét này được đánh dấu <b>mới</b> lại và kèm chữ
        "đã chỉnh sửa", để không ai tưởng mình nhớ nhầm nội dung cũ.
      </div>
      <button class="btn primary block mt-14" id="rm-s-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa nhận xét');

    document.getElementById('rm-s-luu').onclick = async () => {
      const content = document.getElementById('rm-s-content').value.trim();
      if (!content) return UI.toast('Vui lòng nhập nội dung nhận xét', 'error');
      try {
        // KHÔNG gửi `rating`: đường sửa chỉ chạm những ô có gửi lên, nên mức
        // cũ của bản ghi giữ nguyên trong bảng làm chứng từ.
        await API.put(`/api/remarks/${encodeURIComponent(id)}`, {
          content,
          skills: document.getElementById('rm-s-skills').value,
          date: document.getElementById('rm-s-date').value || undefined,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  hoiThuHoi(id) {
    const r = (this._lop || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy nhận xét này', 'error');
    UI.modal(`
      <p style="line-height:1.6">Thu hồi nhận xét của <b>${UI.esc(r.studentName || 'bé này')}</b> ngày ${UI.esc(UI.fmtDate(r.date))}?</p>
      <p class="muted small" style="line-height:1.6">
        Nhận xét sẽ biến khỏi sổ liên lạc của gia đình. <b>Nội dung vẫn được giữ
        lại</b> trong hệ thống để tra khi cần. Phụ huynh đã đọc rồi thì không lấy
        lại được điều họ đã thấy.
      </p>
      <button class="btn primary block mt-14" id="rm-th-ok">Xác nhận thu hồi</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Thu hồi nhận xét');

    document.getElementById('rm-th-ok').onclick = async () => {
      try {
        await API.del(`/api/remarks/${encodeURIComponent(id)}`);
        UI.toast('Đã thu hồi nhận xét', 'success');
        UI.closeModal();
        App.route();
        App.refreshBadges();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};
