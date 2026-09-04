// Giao diện phân hệ Học phí. Tệp này được tải về khi phân hệ đang bật, dùng
// chung mọi hàm trợ giúp giao diện của ứng dụng nên trông đồng bộ với phần lõi.
App.views.hocphi = {
  async render(root) {
    // HAI VAI, KHÔNG PHẢI MỘT.
    //
    //   `laNguoiTruong` — cô hoặc văn phòng: xem được cả nhóm, chọn từng bé.
    //   `laVanPhong`    — chỉ văn phòng: mới được tạo khoản và xác nhận nộp.
    //
    // Tách ra vì máy chủ đã tách (Đ42): cô gọi hai đường ghi đó nhận 403. Nếu
    // màn hình vẫn bày nút thì cô bấm và nhận một câu từ chối — app hứa một
    // việc nó không cho làm, đúng thứ `test:khong-hua-suong` sinh ra để chặn.
    const laNguoiTruong = App.state.user.role !== 'parent';
    const laVanPhong = App.state.user.role === 'admin';
    const isTeacher = laNguoiTruong;
    const student = isTeacher ? null : App.currentStudent();
    // Ô "Chọn bé" của người trong trường PHẢI được đọc lại ở đây.
    //
    // Bản đầu chỉ ghi `this._sid` rồi vẽ lại màn, mà lúc vẽ lại thì luôn lấy
    // `students[0]`. Kết quả: văn phòng chọn bé nào cũng vô ích, màn quay về bé
    // đầu danh sách, và KHOẢN THU VỪA TẠO RƠI VÀO NHÀ NGƯỜI KHÁC — sai tiền,
    // sai nhà, mà trên màn trông vẫn bình thường.
    const dsBe = App.state.students || [];
    const sid = student
      ? student.id
      : (isTeacher && this._sid && dsBe.some(s => s.id === this._sid))
        ? this._sid
        : (dsBe[0] || {}).id;
    if (!sid) {
      root.innerHTML = UI.pageHeader('Học phí') + UI.emptyState('💳', 'Chưa có bé nào');
      return;
    }

    const d = await API.get(`/api/hocphi?studentId=${encodeURIComponent(sid)}`);
    const tien = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

    root.innerHTML = `
      ${UI.pageHeader('Học phí', laVanPhong ? { action: { id: 'hp-them', label: 'Tạo khoản', icon: 'plus' } } : {})}
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
                  : laVanPhong
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
    const homNay = UI.todayStr();              // giờ Việt Nam
    const thang = Number(homNay.slice(5, 7));
    UI.modal(`
      <div class="field"><label>Kỳ thu</label>
        <input id="hp-ky" value="Tháng ${thang}/${homNay.slice(0, 4)}"></div>
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
