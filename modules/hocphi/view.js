// Giao diện phân hệ Học phí. Tệp này được tải về khi phân hệ đang bật, dùng
// chung mọi hàm trợ giúp giao diện của ứng dụng nên trông đồng bộ với phần lõi.
App.views.hocphi = {
  async render(root) {
    // HAI VAI, KHÔNG PHẢI MỘT — VÀ VAI THỨ HAI DO MÁY CHỦ NÓI RA.
    //
    //   `laNguoiTruong` — cô hoặc văn phòng: xem được cả nhóm, chọn từng bé.
    //   `d.quyen`       — máy chủ trả về: ai đặt được khoản thu, ai xác nhận
    //                     được đã nhận tiền.
    //
    // Tách ra vì máy chủ đã tách (Đ42): cô gọi hai đường ghi đó nhận 403. Nếu
    // màn hình vẫn bày nút thì cô bấm và nhận một câu từ chối — app hứa một
    // việc nó không cho làm, đúng thứ `test:khong-hua-suong` sinh ra để chặn.
    //
    // Bản trước hỏi `role === 'admin'` ngay tại đây. Sau Đ163 câu đó SAI với
    // văn phòng cơ sở: họ vẫn là vai admin nhưng đã thôi đặt được khoản thu.
    // Nên màn hình thôi tự đoán và hỏi thẳng máy chủ — cùng nếp Đ157 đã dựng
    // cho thẻ thông báo đẩy.
    const laNguoiTruong = App.state.user.role !== 'parent';
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
    // Máy chủ bản cũ chưa trả `quyen` thì mọi nút ghi im đi, chứ không bày ra
    // rồi mời bấm: quên theo hướng đóng lại.
    const taoDuoc = !!(d.quyen && d.quyen.taoDuoc);
    const xacNhanDuoc = !!(d.quyen && d.quyen.xacNhanDuoc);

    root.innerHTML = `
      ${UI.pageHeader('Học phí', taoDuoc ? { action: { id: 'hp-them', label: 'Tạo khoản', icon: 'plus' } } : {})}
      ${isTeacher ? this.chonHocSinh(sid) : UI.studentBar()}
      ${taoDuoc ? `
        <div class="card">
          <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm outline" id="hp-bang">Xem cả trường</button>
            <button class="btn sm outline" id="hp-dot">Ghi sổ cho cả nhóm</button>
          </div>
          <div class="muted small mt-8">
            Ghi sổ cho cả nhóm tạo cùng một khoản cho mọi bé đang học trong nhóm hoặc cơ sở
            đã chọn. Bé nào đã có đúng khoản ấy rồi thì máy bỏ qua, không ghi chồng.
          </div>
        </div>` : ''}
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
                  : xacNhanDuoc
                    ? `<button class="btn sm outline mt-8" onclick="App.views.hocphi.xacNhan('${UI.esc(k.id)}')">Xác nhận</button>`
                    : UI.badge('Chưa nộp', 'orange')}
              </div>
            </div>`).join('')}
        </div>` : UI.emptyState('💳', 'Chưa có khoản thu nào')}`;

    const btn = document.getElementById('hp-them');
    if (btn) btn.onclick = () => this.moTao(sid);
    const bBang = document.getElementById('hp-bang');
    if (bBang) bBang.onclick = () => this.moBang();
    const bDot = document.getElementById('hp-dot');
    if (bDot) bDot.onclick = () => this.moGhiSoCaNhom();
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

  // ---------- Ghi sổ một lượt cho cả nhóm hoặc cả cơ sở (Đ163) ----------
  //
  // Ô này chỉ hiện với người máy chủ đã nói là đặt được khoản thu. Câu trả lời
  // của máy sau khi ghi nói ra ĐỦ BA CON SỐ — tổng, đã ghi, bỏ qua — chứ không
  // chỉ "xong": lần chạy thứ hai của cùng một đợt trông y hệt lần đầu nếu máy
  // không nói, và người ghi sổ sẽ không biết mình vừa bấm thừa hay thiếu.
  async moGhiSoCaNhom() {
    const homNay = UI.todayStr();
    const thang = Number(homNay.slice(5, 7));
    const nhom = (App.state.classes || []);
    // Danh sách cơ sở đến từ `App.state.school.coSo` (routes/auth.js gắn vào
    // khối thông tin trường), không phải một khoá riêng — app không có
    // `state.campuses`.
    const coSo = ((App.state.school || {}).coSo) || [];
    UI.modal(`
      <div class="field"><label>Ghi sổ cho</label>
        <select id="hpd-pham">
          <option value="nhom">Một nhóm lớp</option>
          ${coSo.length > 1 ? '<option value="coso">Cả một cơ sở</option>' : ''}
          <option value="truong">Mọi bé trong phạm vi của tôi</option>
        </select></div>
      <div class="field" id="hpd-o-nhom"><label>Nhóm lớp</label>
        <select id="hpd-id">${nhom.map(c => `
          <option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
        </select></div>
      <div class="field" id="hpd-o-coso" style="display:none"><label>Cơ sở</label>
        <select id="hpd-cs">${coSo.map(c => `
          <option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
        </select></div>
      <div class="field"><label>Kỳ thu</label>
        <input id="hpd-ky" value="Tháng ${thang}/${homNay.slice(0, 4)}"></div>
      <div class="field"><label>Nội dung</label>
        <input id="hpd-nd" placeholder="Ví dụ: Tiền ăn tháng 9"></div>
      <div class="field"><label>Số tiền mỗi bé (đồng)</label>
        <input id="hpd-tien" type="number" min="1000" step="1000" placeholder="500000"></div>
      <div class="field"><label>Hạn nộp</label><input id="hpd-han" type="date"></div>
      <button class="btn primary block" id="hpd-luu">Ghi sổ</button>
    `, 'Ghi sổ cho cả nhóm');

    const oPham = document.getElementById('hpd-pham');
    const doiO = () => {
      document.getElementById('hpd-o-nhom').style.display = oPham.value === 'nhom' ? '' : 'none';
      document.getElementById('hpd-o-coso').style.display = oPham.value === 'coso' ? '' : 'none';
    };
    oPham.onchange = doiO;
    doiO();

    document.getElementById('hpd-luu').onclick = async () => {
      const pham = oPham.value;
      try {
        const r = await API.post('/api/hocphi/hang-loat', {
          pham,
          id: pham === 'nhom' ? document.getElementById('hpd-id').value
            : pham === 'coso' ? document.getElementById('hpd-cs').value : '',
          kyThu: document.getElementById('hpd-ky').value,
          noiDung: document.getElementById('hpd-nd').value,
          soTien: document.getElementById('hpd-tien').value,
          hanNop: document.getElementById('hpd-han').value || null,
        });
        UI.closeModal();
        UI.toast(r.boQua
          ? `Đã ghi cho ${r.daTao} bé. Bỏ qua ${r.boQua} bé đã có sẵn khoản này.`
          : `Đã ghi khoản thu cho ${r.daTao} bé`, 'success');
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---------- Bảng sổ tiền gom theo cơ sở → nhóm → bé (Đ163) ----------
  //
  // XẾP THEO TÊN, KHÔNG THEO TIỀN — máy chủ đã xếp sẵn và giữ nguyên thứ tự ấy
  // ở đây. Xếp các bé theo số còn nợ là dựng một thứ tự trên dưới giữa những
  // đứa trẻ bằng hoàn cảnh của cha mẹ chúng (QUY TẮC 4).
  async moBang(kyThu) {
    const q = kyThu ? `?kyThu=${encodeURIComponent(kyThu)}` : '';
    let d = null;
    try {
      d = await API.get(`/api/hocphi/bang${q}`);
    } catch (err) { UI.toast(err.message, 'error'); return; }
    const tien = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

    UI.modal(`
      <div class="field"><label>Kỳ thu</label>
        <select id="hpb-ky">
          <option value="">Mọi kỳ thu</option>
          ${(d.kyThuCo || []).map(k => `
            <option value="${UI.esc(k)}" ${k === d.kyThu ? 'selected' : ''}>${UI.esc(k)}</option>`).join('')}
        </select></div>
      ${(d.bang || []).length ? (d.bang || []).map(cs => `
        <div class="card">
          <div class="card-title">${UI.esc(cs.ten)}</div>
          ${cs.nhom.map(n => `
            <div class="mt-8"><b>${UI.esc(n.ten)}</b></div>
            ${n.be.length ? n.be.map(b => `
              <div class="list-row">
                <div class="row-main">
                  <div class="row-title">${UI.esc(b.ten)}</div>
                  <div class="row-sub">${UI.esc(String(b.daNop))} khoản đã nộp${
    b.chuaNop ? ` · ${UI.esc(String(b.chuaNop))} khoản chưa nộp` : ''}</div>
                </div>
                <div class="row-end">${b.chuaNop
    ? `<b>${UI.esc(tien(b.tienChuaNop))}</b>`
    : UI.badge('Đủ', 'green')}</div>
              </div>`).join('') : '<div class="muted small">Chưa có bé nào đang học trong nhóm này</div>'}`).join('')}
        </div>`).join('')
    : UI.emptyState('💳', 'Chưa có nhóm lớp nào trong phạm vi của tài khoản')}
      <div class="muted small">Xếp theo tên cơ sở, tên nhóm và tên bé.</div>
    `, 'Sổ tiền cả trường');

    const o = document.getElementById('hpb-ky');
    if (o) o.onchange = () => { UI.closeModal(); this.moBang(o.value); };
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
