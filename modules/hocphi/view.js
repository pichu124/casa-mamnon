// Giao diện phân hệ Học phí. Tệp này được tải về khi phân hệ đang bật, dùng
// chung mọi hàm trợ giúp giao diện của ứng dụng nên trông đồng bộ với phần lõi.
App.views.hocphi = {
  async render(root) {
    const isTeacher = App.state.user.role !== 'parent';
    const student = isTeacher ? null : App.currentStudent();
    const sid = student ? student.id : (App.state.students[0] || {}).id;
    if (!sid) {
      root.innerHTML = UI.pageHeader('Học phí') + UI.emptyState('💳', 'Chưa có bé nào');
      return;
    }

    const d = await API.get(`/api/hocphi?studentId=${encodeURIComponent(sid)}`);
    const tien = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

    root.innerHTML = `
      ${UI.pageHeader('Học phí', isTeacher ? { action: { id: 'hp-them', label: 'Tạo khoản', icon: 'plus' } } : {})}
      ${isTeacher ? this.chonHocSinh(sid) : UI.studentBar()}
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-num" style="color:${d.soKhoanChuaNop ? 'var(--danger)' : 'var(--success)'};font-size:1.15rem">
            ${tien(d.tongChuaNop)}</div>
          <div class="stat-label">Còn phải nộp</div>
        </div>
        <div class="stat-box"><div class="stat-num">${d.soKhoanChuaNop}</div><div class="stat-label">Khoản chưa nộp</div></div>
        <div class="stat-box"><div class="stat-num">${d.khoan.length}</div><div class="stat-label">Tổng số khoản</div></div>
      </div>
      ${d.khoan.length ? `
        <div class="card">
          ${d.khoan.map(k => `
            <div class="list-row">
              <span class="row-icon" style="background:${k.daNop ? 'var(--success-tint)' : 'var(--warning-tint)'}">
                ${k.daNop ? '✅' : '💳'}
              </span>
              <div class="row-main">
                <div class="row-title">${UI.esc(k.noiDung)}</div>
                <div class="row-sub">${UI.esc(k.kyThu)}${k.hanNop ? ' · Hạn ' + UI.fmtDateShort(k.hanNop) : ''}${
                  k.daNop && k.ngayNop ? ' · Đã nộp ' + UI.fmtDateShort(k.ngayNop) : ''}</div>
              </div>
              <div class="row-end">
                <div style="font-weight:700">${tien(k.soTien)}</div>
                ${k.daNop
                  ? UI.badge('Đã nộp', 'green')
                  : isTeacher
                    ? `<button class="btn sm outline mt-8" onclick="App.views.hocphi.xacNhan('${UI.esc(k.id)}')">Xác nhận</button>`
                    : UI.badge('Chưa nộp', 'orange')}
              </div>
            </div>`).join('')}
        </div>` : UI.emptyState('💳', 'Chưa có khoản thu nào')}`;

    const btn = document.getElementById('hp-them');
    if (btn) btn.onclick = () => this.moTao(sid);
    const sel = document.getElementById('hp-hs');
    if (sel) sel.onchange = () => { this._sid = sel.value; App.route(); };
  },

  chonHocSinh(sid) {
    const list = App.state.students;
    this._sid = this._sid || sid;
    return `<div class="field"><label>Chọn bé</label>
      <select id="hp-hs">${list.map(s => `
        <option value="${UI.esc(s.id)}" ${s.id === sid ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('')}
      </select></div>`;
  },

  moTao(sid) {
    const thang = new Date().getMonth() + 1;
    UI.modal(`
      <div class="field"><label>Kỳ thu</label>
        <input id="hp-ky" value="Tháng ${thang}/${new Date().getFullYear()}"></div>
      <div class="field"><label>Nội dung</label>
        <input id="hp-nd" placeholder="Ví dụ: Tiền ăn tháng 9"></div>
      <div class="field"><label>Số tiền (đồng)</label>
        <input id="hp-tien" type="number" min="1000" step="1000" placeholder="500000"></div>
      <div class="field"><label>Hạn nộp</label><input id="hp-han" type="date"></div>
      <button class="btn primary block" id="hp-luu">Tạo khoản thu</button>
    `, 'Tạo khoản thu');

    document.getElementById('hp-luu').onclick = async () => {
      try {
        await API.post('/api/hocphi', {
          studentId: sid,
          kyThu: document.getElementById('hp-ky').value,
          noiDung: document.getElementById('hp-nd').value,
          soTien: document.getElementById('hp-tien').value,
          hanNop: document.getElementById('hp-han').value || null,
        });
        UI.toast('Đã tạo khoản thu', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async xacNhan(id) {
    if (!confirm('Xác nhận đã nhận tiền của khoản này?')) return;
    try {
      await API.post(`/api/hocphi/${id}/xac-nhan`, {});
      UI.toast('Đã xác nhận nộp tiền', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
