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
    const xemBangDuoc = !!(d.quyen && d.quyen.xemBangDuoc);
    const xemUuDaiDuoc = !!(d.quyen && d.quyen.xemUuDaiDuoc);

    root.innerHTML = `
      ${UI.pageHeader('Học phí', taoDuoc ? { action: { id: 'hp-them', label: 'Tạo khoản', icon: 'plus' } } : {})}
      ${isTeacher ? this.chonHocSinh(sid) : UI.studentBar()}
      ${xemBangDuoc ? `
        <div class="card">
          <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm outline" id="hp-bang">Xem sổ tiền</button>
            ${taoDuoc ? '<button class="btn sm outline" id="hp-dot">Ghi sổ cho cả nhóm</button>' : ''}
            ${xemUuDaiDuoc ? '<button class="btn sm outline" id="hp-uudai">Ưu đãi</button>' : ''}
            <button class="btn sm outline" id="hp-bieuphi">Biểu phí</button>
            <button class="btn sm outline" id="hp-taikhoan">Tài khoản nhận tiền</button>
          </div>
          ${taoDuoc ? `
            <div class="muted small mt-8">
              Ghi sổ cho cả nhóm tạo cùng một khoản cho mọi bé đang học trong nhóm hoặc cơ sở
              đã chọn. Bé nào đã có đúng khoản ấy rồi thì máy bỏ qua, không ghi chồng.
            </div>` : ''}
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
      ${(d.uuDai || []).length ? `
        <div class="card">
          <div class="card-title">Ưu đãi nhà trường dành cho con</div>
          ${d.uuDai.map(u => {
    const chuaToi = u.tuNgay && u.tuNgay > UI.todayStr();
    const hetHan = u.denNgay && u.denNgay < UI.todayStr();
    return `
            <div class="list-row">
              <span class="row-icon" style="background:var(--success-tint)">🎁</span>
              <div class="row-main">
                <div class="row-title">${UI.esc(u.ten)}</div>
                <div class="row-sub">${u.kieu === 'phan-tram'
    ? 'Giảm ' + Number(u.giaTri) + ' phần trăm'
    : 'Giảm ' + tien(u.giaTri)}${
  u.tuNgay ? ' · Từ ' + UI.fmtDateShort(u.tuNgay) : ''}${
  u.denNgay ? ' · Đến ' + UI.fmtDateShort(u.denNgay) : ''}</div>
              </div>
              <div class="row-end">${
  chuaToi ? UI.badge('Chưa tới ngày', 'gray')
    : hetHan ? UI.badge('Đã hết hạn', 'gray')
      : UI.badge('Đang áp dụng', 'green')}</div>
            </div>`;
  }).join('')}
          <div class="muted small mt-8">Số tiền ở các khoản bên dưới là số nhà trường đã tính sẵn.
            Có gì chưa khớp, gia đình nhắn cho văn phòng giúp nhé.</div>
        </div>` : ''}
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
                ${k.daNop ? '' : `
                  <button class="btn sm outline mt-8"
                    onclick="App.views.hocphi.moChuyenKhoan('${UI.esc(k.id)}')">Chuyển khoản</button>`}
              </div>
            </div>`).join('')}
        </div>` : UI.emptyState('💳', 'Chưa có khoản thu nào')}`;

    const btn = document.getElementById('hp-them');
    if (btn) btn.onclick = () => this.moTao(sid);
    const bBang = document.getElementById('hp-bang');
    if (bBang) bBang.onclick = () => this.moBang();
    const bDot = document.getElementById('hp-dot');
    if (bDot) bDot.onclick = () => this.moGhiSoCaNhom();
    const bUu = document.getElementById('hp-uudai');
    if (bUu) bUu.onclick = () => this.moUuDai();
    const bBp = document.getElementById('hp-bieuphi');
    if (bBp) bBp.onclick = () => this.moBieuPhi();
    const bTk = document.getElementById('hp-taikhoan');
    if (bTk) bTk.onclick = () => this.moTaiKhoan();
    const sel = document.getElementById('hp-hs');
    if (sel) sel.onchange = () => { this._sid = sel.value; App.route(); };
  },

  // MỘT CÁI TÊN TRẦN KHÔNG ĐỦ ĐỂ CHỌN ĐÚNG MỘT ĐỨA TRẺ.
  //
  // Trùng họ tên trong tiếng Việt là chuyện thường, và chính app thừa nhận
  // điều đó: đường nhận bé có hẳn một câu hỏi lại *"có thật chuyện hai bé
  // trùng cả tên lẫn ngày sinh"*. Khuôn dùng chung của cả kho đã in kèm nhóm
  // từ lâu (`UI.thanhChonBe`, màn Sức khoẻ, Xin phép, Dặn thuốc); riêng phân
  // hệ này bỏ vế sau ở CẢ HAI ô chọn bé — mà đây là hai ô ra tiền: một ô ghi
  // nợ cho một nhà, một ô giảm tiền cho một nhà.
  //
  // `className` đã có sẵn trong `App.state.students` cho MỌI vai, kể cả những
  // chức vụ bị cắt bớt hồ sơ bé (routes/auth.js, TRUONG_TOI_THIEU) — nên
  // không phải thêm một trường nào vào câu trả lời của máy chủ.
  nhanBe(s) {
    return s.className ? `${s.name} · ${s.className}` : s.name;
  },

  chonHocSinh(sid) {
    const list = App.state.students;
    this._sid = this._sid || sid;
    return `<div class="field"><label>Chọn bé</label>
      <select id="hp-hs">${list.map(s => `
        <option value="${UI.esc(s.id)}" ${s.id === sid ? 'selected' : ''}>${UI.esc(this.nhanBe(s))}</option>`).join('')}
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

    // KHOÁ NÚT NGAY TỪ CÚ BẤM ĐẦU.
    //
    // Đường ghi sổ HÀNG LOẠT có bước chống ghi trùng, và chú thích của chính nó
    // gọi đó là *"phần quan trọng nhất của đường này"* vì *"mạng chập chờn, cô
    // bấm hai lần… đều dẫn tới một nhà bị đòi tiền hai lần"*. Lập luận ấy đúng
    // y nguyên cho đường MỘT BÉ — mà đường một bé lại không có gì cả: `POST
    // /api/hocphi` ghi thẳng, và nút thì bấm bao nhiêu lần cũng được.
    //
    // Khoá nút bịt đúng cảnh hay gặp nhất: 4G ở phòng kế toán chậm, nút không
    // nhúc nhích, bấm lần hai là phản xạ bình thường. (Chống trùng ở tầng máy
    // chủ cho đường một bé là một quyết định về hành vi của API — đã nêu riêng
    // để chủ dự án quyết, không tự làm ở đây.)
    const nutLuu = document.getElementById('hp-luu');
    const chuNut = nutLuu.textContent;
    // CHỤP BIỂU MẪU MỘT LẦN lúc bấm — lượt gửi lại sau câu hỏi "vẫn ghi thêm?"
    // không được đọc lại ô nhập, vì lúc ấy hộp thoại có thể đã bị một lượt vẽ
    // lại gỡ khỏi màn (`UI.modal` gọi `closeModal` ở dòng đầu). Cùng bài học
    // với màn "Nhận một bé".
    const chupBieuMau = () => ({
      studentId: sid,
      kyThu: document.getElementById('hp-ky').value,
      noiDung: document.getElementById('hp-nd').value,
      soTien: document.getElementById('hp-tien').value,
      hanNop: document.getElementById('hp-han').value || null,
    });
    let banChup = null;

    const ghi = async (xacNhanTrung) => {
      await API.post('/api/hocphi', { ...banChup, xacNhanTrung });
      UI.toast('Đã tạo khoản thu', 'success');
      UI.closeModal();
      App.route();
    };

    nutLuu.onclick = async () => {
      if (nutLuu.disabled) return;
      nutLuu.disabled = true;
      nutLuu.textContent = 'Đang ghi…';
      // MỞ LẠI NÚT KHI KHÔNG GHI ĐƯỢC — gõ nhầm số tiền rồi sửa lại thì phải
      // bấm được lần nữa; khoá vĩnh viễn là bắt kế toán đóng hộp thoại và gõ
      // lại từ đầu, tức biến một lỗi nhỏ thành mất trắng phần đã gõ.
      const moLaiNut = () => { nutLuu.disabled = false; nutLuu.textContent = chuNut; };
      banChup = chupBieuMau();
      try {
        await ghi(false);
      } catch (err) {
        // 409 = "bé này đã có đúng khoản ấy" — CẢNH BÁO, không phải lỗi. Hỏi
        // lại một câu rồi cho ghi, y như đường nhận một bé.
        //
        // BẮT THEO MÃ LỖI, KHÔNG BẮT THEO CHỮ (bài học Đ173): câu 400 của "số
        // tiền phải lớn hơn 0" cũng là một câu tiếng Việt, và dò chữ thì sớm
        // muộn cũng bắt nhầm một câu nào đó rồi dẫn người dùng vào ngõ cụt.
        if (err.status === 409 && confirm(`${err.message}\n\nVẫn ghi thêm khoản này?`)) {
          try { await ghi(true); } catch (e2) { UI.toast(e2.message, 'error'); moLaiNut(); }
        } else {
          UI.toast(err.message, 'error');
          moLaiNut();
        }
      }
    };
  },

  // ---------- Ghi sổ một lượt cho cả nhóm hoặc cả cơ sở (Đ163) ----------
  //
  // Ô này chỉ hiện với người máy chủ đã nói là đặt được khoản thu. Câu trả lời
  // của máy sau khi ghi nói ra ĐỦ BA CON SỐ — tổng, đã ghi, bỏ qua — chứ không
  // chỉ "xong": lần chạy thứ hai của cùng một đợt trông y hệt lần đầu nếu máy
  // không nói, và người ghi sổ sẽ không biết mình vừa bấm thừa hay thiếu.
  // CHỈ MỜI BẤM THỨ BẤM ĐƯỢC, VÀ NÓI ĐỦ TÊN ĐỂ BẤM ĐÚNG (bài học Đ94).
  //
  // `App.state.classes` là nhóm CẢ TRƯỜNG, còn phạm vi ghi sổ của máy chủ là
  // `db.classIdsOf` — tài khoản khoá vào một cơ sở chỉ ghi được nhóm của cơ sở
  // mình. Hai hậu quả, và cái thứ hai nặng hơn:
  //
  //   • Cấp 3 được mời bấm nhóm của cơ sở khác rồi ăn 403. Phiền, nhưng lộ ra
  //     ngay.
  //   • Ba cơ sở đặt trùng tên nhóm là chuyện thường ("Chồi 2" ở cả ba nơi).
  //     Kế toán toàn trường thấy ba dòng GIỐNG HỆT NHAU, bấm nhầm thì máy chủ
  //     ghi đúng cái được bấm — `canAccessClass` cho qua vì Cấp 1 có cả ba cơ
  //     sở — và cả một nhóm ở cơ sở khác bị ghi nợ. Chuyện này KHÔNG lộ ra cho
  //     tới lúc gia đình hỏi, và gỡ thì phải thu hồi từng khoản một.
  //
  // Màn Thông báo, Khảo sát và Sức khoẻ đã vá đúng khuôn này; Học phí là ô
  // chọn nhóm cuối cùng còn sót. Máy chủ vẫn là người chốt — đây chỉ để không
  // mời bấm vào thứ sẽ hỏng.
  nhomGhiSoDuoc() {
    const coSo = ((App.state.school || {}).coSo) || [];
    const cua = ((App.state.user || {}).coSo) || null;
    return (App.state.classes || [])
      .filter(c => !cua || c.campusId === cua)
      .map(c => {
        const cs = coSo.find(x => x.id === c.campusId);
        // Trường một cơ sở: tên nhóm là đủ. Trường nhiều cơ sở: LUÔN nói thêm
        // vế sau, kể cả khi nhóm chưa được xếp vào cơ sở nào — im lặng ở đúng
        // chỗ đó là để lại hai dòng giống hệt nhau, tức là để nguyên lỗi.
        if (coSo.length < 2) return { id: c.id, nhan: c.name };
        return { id: c.id, nhan: `${c.name} · ${cs ? cs.name : 'chưa xếp cơ sở'}` };
      });
  },

  // Cơ sở mà tài khoản này ghi sổ được. Trường một cơ sở, hoặc Cấp 1: y như cũ.
  coSoGhiSoDuoc() {
    const cua = ((App.state.user || {}).coSo) || null;
    return (((App.state.school || {}).coSo) || []).filter(c => !cua || c.id === cua);
  },

  async moGhiSoCaNhom() {
    const homNay = UI.todayStr();
    const thang = Number(homNay.slice(5, 7));
    const nhom = this.nhomGhiSoDuoc();
    // Danh sách cơ sở đến từ `App.state.school.coSo` (routes/auth.js gắn vào
    // khối thông tin trường), không phải một khoá riêng — app không có
    // `state.campuses`. `coSo` giữ nguyên vai trò cũ: nó quyết định trường này
    // có từ hai cơ sở hay không. Cái đem ra cho bấm là `coSoChon`.
    const coSo = ((App.state.school || {}).coSo) || [];
    const coSoChon = this.coSoGhiSoDuoc();
    UI.modal(`
      <div class="field"><label>Ghi sổ cho</label>
        <select id="hpd-pham">
          <option value="nhom">Một nhóm lớp</option>
          ${coSo.length > 1 ? '<option value="coso">Cả một cơ sở</option>' : ''}
          <option value="truong">Mọi bé trong phạm vi của tôi</option>
        </select></div>
      <div class="field" id="hpd-o-nhom"><label>Nhóm lớp</label>
        <select id="hpd-id">${nhom.map(c => `
          <option value="${UI.esc(c.id)}">${UI.esc(c.nhan)}</option>`).join('')}
        </select></div>
      <div class="field" id="hpd-o-coso" style="display:none"><label>Cơ sở</label>
        <select id="hpd-cs">${coSoChon.map(c => `
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
    } catch (err) { UI.toast(err.message, 'error'); return false; }
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
    // "ĐỦ" LÀ MỘT LỜI KHẲNG ĐỊNH, KHÔNG PHẢI Ô TRỐNG TÔ XANH.
    //
    // Bé chưa hề được ghi một khoản nào cũng rơi vào nhánh "không còn nợ" và
    // nhận đúng cái huy hiệu xanh như bé đã nộp đủ. Ở một bảng tiền thì đó là
    // chỗ nguy nhất: bé bị sót khỏi đợt ghi sổ trông y hệt bé đã nộp xong, và
    // người soát bảng lướt qua đúng dòng cần dừng lại.
    : b.daNop ? UI.badge('Đủ', 'green')
      : '<span class="muted small">Chưa ghi khoản nào</span>'}</div>
              </div>`).join('') : '<div class="muted small">Chưa có bé nào đang học trong nhóm này</div>'}`).join('')}
        </div>`).join('')
    : UI.emptyState('💳', 'Chưa có nhóm lớp nào trong phạm vi của tài khoản')}
      <div class="muted small">Xếp theo tên cơ sở, tên nhóm và tên bé.</div>
    `, this.tenBang());

    const o = document.getElementById('hpb-ky');
    if (o) {
      // GỌI MẠNG TRƯỚC, THAY BẢNG SAU — KHÔNG ĐÓNG BẢNG RỒI MỚI ĐI HỎI.
      //
      // Bản trước gọi `UI.closeModal()` ngay trong `onchange`. Rớt một nhịp
      // sóng giữa chừng là bảng biến mất và màn quay về trang Học phí của một
      // bé, dù chẳng có gì thay đổi cả. `UI.modal()` vốn đã tự đóng cái đang mở
      // ở dòng đầu, nên đóng trước hoàn toàn không cần.
      //
      // Và trả ô kỳ thu về đúng bảng ĐANG HIỆN khi gọi mạng hỏng: bảng cũ còn
      // nguyên mà ô lại ghi kỳ khác là đọc số của kỳ này dưới nhãn kỳ kia — ở
      // một màn tiền thì đó là một kết luận sai, không phải một chuyện phiền.
      const kyDangHien = o.value;
      o.onchange = async () => {
        if (await this.moBang(o.value)) return;
        o.value = kyDangHien;
      };
    }
    return true;
  },

  // TIÊU ĐỀ PHẢI NÓI ĐÚNG THỨ ĐANG HIỆN.
  //
  // Máy chủ cắt bảng theo `db.classIdsOf` — quản lý cơ sở và văn phòng cơ sở
  // chỉ thấy cơ sở mình, và bài canh của Đ163 chốt rằng việc cắt ấy là CỐ Ý.
  // Nhưng nhãn thì vẫn ghi "cả trường", nên người đọc kết luận sai về số nhà
  // còn nợ của CẢ TRƯỜNG — một kết luận sai được chính app đứng ra bảo đảm.
  // Tài khoản khoá vào một cơ sở thì gọi đúng tên cơ sở ấy; ai nhìn cả trường
  // thì giữ nguyên chữ cũ.
  tenBang() {
    const cua = ((App.state.user || {}).coSo) || null;
    if (!cua) return 'Sổ tiền cả trường';
    const cs = ((((App.state.school || {}).coSo) || []).find(x => x.id === cua) || {}).name;
    return cs ? `Sổ tiền · ${cs}` : 'Sổ tiền trong phạm vi của tài khoản';
  },

  // ---------- Bảng theo dõi ưu đãi và hạn của nó (Đ169) ----------
  //
  // MÁY KHÔNG TỰ TRỪ TIỀN. Bảng này để nhìn và để nhắc, không phải công thức
  // tính — cùng lập luận đã chốt ở DD-13. Màn hình nói thẳng câu ấy ra, vì một
  // bảng ưu đãi trông như đã trừ sẵn là chỗ kế toán thôi đối chiếu.
  //
  // XẾP THEO TÊN BÉ, không theo mức ưu đãi: máy chủ đã xếp sẵn và ở đây giữ
  // nguyên thứ tự ấy (QUY TẮC 4).
  mucUuDai(u) {
    // Mức ghi được cả hai kiểu — chủ dự án chốt 11/09. Kiểu phần trăm in ra
    // đúng dấu %, và `test:quy-tac-4` có một dòng ngoại lệ nói rõ vì sao: đây
    // là phần trăm của một khoản TIỀN người lớn nộp, không phải một con số về
    // đứa trẻ. Bộ canh ấy giữ cho trẻ không bị sắp trên dưới nhau, chứ không
    // cấm nói về tiền.
    return u.kieu === 'phan-tram'
      ? `giảm ${Number(u.giaTri)}%`
      : `giảm ${Number(u.giaTri).toLocaleString('vi-VN')} đ`;
  },

  async moUuDai() {
    let d = null;
    try {
      d = await API.get('/api/hocphi/uu-dai/bang');
    } catch (err) { UI.toast(err.message, 'error'); return; }

    const sapHet = d.bang.flatMap(x => x.uuDai).filter(u => u.sapHetHan).length;
    const hetHan = d.bang.flatMap(x => x.uuDai).filter(u => u.hetHan).length;

    UI.modal(`
      ${hetHan || sapHet ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="row-title">Có ưu đãi cần nhà trường xem lại</div>
          <div class="row-sub" style="margin-top:4px">
            ${hetHan ? `${hetHan} ưu đãi đã quá hạn` : ''}${hetHan && sapHet ? ' · ' : ''}${
    sapHet ? `${sapHet} ưu đãi sắp hết hạn trong ${d.nhacTruocNgay} ngày tới` : ''}.
          </div>
        </div>` : ''}

      ${d.bang.length ? d.bang.map(x => `
        <div class="card">
          <div class="card-title">${UI.esc(x.tenBe)}</div>
          <div class="muted small">${UI.esc(x.tenNhom || '')}</div>
          ${x.uuDai.map(u => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(u.ten)}</div>
                <div class="row-sub">${UI.esc(this.mucUuDai(u))}${
    u.tuNgay ? ` · từ ${UI.esc(UI.fmtDateShort(u.tuNgay))}` : ''}${
    u.denNgay ? ` · đến ${UI.esc(UI.fmtDateShort(u.denNgay))}` : ' · không đặt hạn'}</div>
              </div>
              <div class="row-end">
                ${u.chuaHieuLuc ? UI.badge('Chưa tới ngày áp dụng', 'gray')
    : u.hetHan ? UI.badge('Đã quá hạn', 'orange')
      : u.sapHetHan ? UI.badge('Sắp hết hạn', 'orange') : ''}
                ${d.datDuoc ? `<button class="btn sm outline mt-8" data-go-uu="${UI.esc(u.id)}">Gỡ</button>` : ''}
              </div>
            </div>`).join('')}
        </div>`).join('')
    : UI.emptyState('🏷️', 'Chưa có bé nào được đặt ưu đãi')}

      <div class="muted small" style="line-height:1.7">
        Bảng này để nhà trường <b>theo dõi và nhắc hạn</b>. Máy <b>không tự trừ tiền</b>
        vào khoản thu — kế toán vẫn ghi số tiền thật của từng khoản, để con số nào cũng
        có người nhìn qua trước khi tới gia đình.
      </div>
      ${d.datDuoc ? '<button class="btn primary block mt-8" id="hpu-them">Đặt ưu đãi cho một bé</button>' : ''}
    `, 'Ưu đãi học phí');

    const them = document.getElementById('hpu-them');
    if (them) them.onclick = () => this.moDatUuDai();
    for (const nut of document.querySelectorAll('button[data-go-uu]')) {
      nut.onclick = async () => {
        const lyDo = prompt('Vì sao gỡ ưu đãi này? (ghi lại cho sổ)');
        if (!lyDo || !lyDo.trim()) return;
        try {
          await API.post(`/api/hocphi/uu-dai/${encodeURIComponent(nut.dataset.goUu)}/go`, { lyDo });
          UI.closeModal();
          UI.toast('Đã gỡ ưu đãi', 'success');
          this.moUuDai();
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },

  moDatUuDai() {
    const ds = App.state.students || [];
    UI.modal(`
      <div class="field"><label>Bé</label>
        <select id="hpu-be">${ds.map(s => `
          <option value="${UI.esc(s.id)}">${UI.esc(this.nhanBe(s))}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tên ưu đãi</label>
        <input id="hpu-ten" placeholder="Ví dụ: Ưu đãi nhà có hai bé cùng học"></div>
      <div class="field"><label>Mức ghi bằng</label>
        <select id="hpu-kieu">
          <option value="so-tien">Số tiền (đồng)</option>
          <option value="phan-tram">Phần trăm</option>
        </select></div>
      <div class="field"><label>Mức ưu đãi</label>
        <input id="hpu-muc" type="number" min="1" step="1000" placeholder="500000"></div>
      <div class="field"><label>Từ ngày</label><input id="hpu-tu" type="date"></div>
      <div class="field"><label>Hết hạn ngày</label><input id="hpu-den" type="date">
        <div class="muted small mt-8">Để trống nếu ưu đãi không có hạn.</div></div>
      <div class="field"><label>Ghi chú</label><input id="hpu-ghi" placeholder="không bắt buộc"></div>
      <button class="btn primary block" id="hpu-luu">Đặt ưu đãi</button>
    `, 'Đặt ưu đãi cho một bé');

    document.getElementById('hpu-luu').onclick = async () => {
      try {
        await API.post('/api/hocphi/uu-dai', {
          studentId: document.getElementById('hpu-be').value,
          ten: document.getElementById('hpu-ten').value,
          kieu: document.getElementById('hpu-kieu').value,
          giaTri: document.getElementById('hpu-muc').value,
          tuNgay: document.getElementById('hpu-tu').value || null,
          denNgay: document.getElementById('hpu-den').value || null,
          ghiChu: document.getElementById('hpu-ghi').value,
        });
        UI.closeModal();
        UI.toast('Đã đặt ưu đãi', 'success');
        this.moUuDai();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // =========================================================================
  // BIỂU PHÍ (Đ200, việc 33) — kế toán soạn, ban giám hiệu duyệt rồi khoá
  // =========================================================================
  //
  // MÀN NÀY KHÔNG TỰ ĐOÁN QUYỀN. Máy chủ trả về `quyen` cho TỪNG bảng giá
  // (`suaDuoc`, `guiDuyetDuoc`, `duyetDuoc`, `xinMoDuoc`, `traLoiXinMoDuoc`),
  // vì quyền ở đây phụ thuộc cả vai LẪN trạng thái: cùng một kế toán, sửa
  // được bản đang soạn và không sửa được bản đã duyệt. Màn hình đoán lấy thì
  // sẽ bày nút cho một việc máy chủ từ chối — đúng thứ `test:khong-hua-suong`
  // sinh ra để chặn. Nếp này lấy từ Đ157.
  mauTrangThaiBp(ma) {
    return ma === 'da-duyet' ? 'green' : ma === 'cho-duyet' ? 'orange' : 'gray';
  },
  tienBp(n) {
    return Number(n || 0).toLocaleString('vi-VN') + ' đ';
  },

  async moBieuPhi() {
    let d = null;
    try {
      d = await API.get('/api/hocphi/bieu-phi');
    } catch (err) { UI.toast(err.message, 'error'); return; }

    UI.modal(`
      ${d.bieuPhi.length ? d.bieuPhi.map(bp => `
        <div class="card">
          <div class="row" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div>
              <div class="card-title">${UI.esc(bp.ten)}</div>
              <div class="muted small">${UI.esc(bp.namHoc || 'chưa ghi năm học')}${
    bp.campusId ? ' · riêng một cơ sở' : ' · áp cho cả trường'}</div>
            </div>
            ${UI.badge(bp.tenTrangThai, this.mauTrangThaiBp(bp.trangThai))}
          </div>
          ${bp.dong.length ? bp.dong.map(dg => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(dg.noiDung)}</div>
                <div class="row-sub">${UI.esc(dg.tenLoai || '')}</div>
              </div>
              <div class="row-end">${UI.esc(this.tienBp(dg.soTien))}</div>
            </div>`).join('') : '<div class="muted small mt-8">Chưa có dòng nào.</div>'}
          ${bp.dong.length ? `<div class="row-sub mt-8"><b>Cộng: ${
    UI.esc(this.tienBp(bp.tongTien))}</b> mỗi tháng</div>` : ''}
          ${bp.ghiChu ? `<div class="muted small mt-8">${UI.esc(bp.ghiChu)}</div>` : ''}
          ${bp.xinMoDangCho ? `
            <div class="card" style="border-left:4px solid var(--warning);margin-top:8px">
              <div class="row-title">Kế toán đang xin mở khoá</div>
              <div class="row-sub" style="margin-top:4px">${UI.esc(bp.xinMoDangCho.lyDo)}</div>
            </div>` : ''}
          <div class="row mt-8" style="display:flex;gap:8px;flex-wrap:wrap">
            ${bp.quyen.suaDuoc ? `<button class="btn sm outline" data-bp-sua="${UI.esc(bp.id)}">Sửa</button>` : ''}
            ${bp.quyen.guiDuyetDuoc ? `<button class="btn sm primary" data-bp-gui="${UI.esc(bp.id)}">Gửi duyệt</button>` : ''}
            ${bp.quyen.duyetDuoc ? `<button class="btn sm primary" data-bp-duyet="${UI.esc(bp.id)}">Duyệt</button>` : ''}
            ${bp.quyen.duyetDuoc ? `<button class="btn sm outline" data-bp-tra="${UI.esc(bp.id)}">Trả lại</button>` : ''}
            ${bp.quyen.xinMoDuoc ? `<button class="btn sm outline" data-bp-xin="${UI.esc(bp.id)}">Xin mở khoá</button>` : ''}
            ${bp.quyen.traLoiXinMoDuoc ? `<button class="btn sm primary" data-bp-mo="${UI.esc(bp.id)}">Mở khoá</button>` : ''}
            ${bp.quyen.traLoiXinMoDuoc ? `<button class="btn sm outline" data-bp-tuchoimo="${UI.esc(bp.id)}">Chưa mở</button>` : ''}
          </div>
        </div>`).join('') : UI.emptyState('📋', 'Chưa có biểu phí nào')}

      <div class="muted small" style="line-height:1.7">
        Biểu phí là <b>bảng giá để nhìn và chép ra</b> khi ghi sổ, không phải cái khoá:
        kế toán vẫn ghi từng khoản thu như thường lệ, kể cả khi trường chưa duyệt bảng
        giá nào. Bảng đã duyệt thì <b>khoá lại</b>; muốn sửa phải xin ban giám hiệu mở.
      </div>
      ${d.quyen.soanDuoc ? '<button class="btn primary block mt-8" id="hpb-them">Soạn biểu phí mới</button>' : ''}
    `, 'Biểu phí của trường');

    const them = document.getElementById('hpb-them');
    if (them) them.onclick = () => this.moSoanBieuPhi(null, d.loaiKhoan);

    const banGhi = (id) => d.bieuPhi.find(x => x.id === id);
    for (const nut of document.querySelectorAll('button[data-bp-sua]')) {
      nut.onclick = () => this.moSoanBieuPhi(banGhi(nut.dataset.bpSua), d.loaiKhoan);
    }
    // Mỗi nút dưới đây là MỘT lượt ghi: hỏi lại, gọi, rồi vẽ lại đúng màn này.
    const chay = async (duong, than, loiBao) => {
      try {
        await API.post(duong, than || {});
        UI.closeModal();
        UI.toast(loiBao, 'success');
        this.moBieuPhi();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    for (const nut of document.querySelectorAll('button[data-bp-gui]')) {
      nut.onclick = () => {
        if (!confirm('Gửi bảng giá này lên ban giám hiệu duyệt? Gửi rồi thì chưa sửa được nữa.')) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpGui)}/gui`, {}, 'Đã gửi chờ duyệt');
      };
    }
    for (const nut of document.querySelectorAll('button[data-bp-duyet]')) {
      nut.onclick = () => {
        if (!confirm('Duyệt bảng giá này? Duyệt xong bảng giá sẽ khoá lại.')) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpDuyet)}/duyet`,
          { quyetDinh: 'duyet' }, 'Đã duyệt và khoá bảng giá');
      };
    }
    for (const nut of document.querySelectorAll('button[data-bp-tra]')) {
      nut.onclick = () => {
        const y = prompt('Trả lại cho kế toán vì sao? (ghi lại cho sổ)');
        if (!y || !y.trim()) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpTra)}/duyet`,
          { quyetDinh: 'tra-lai', yKien: y }, 'Đã trả lại cho kế toán');
      };
    }
    for (const nut of document.querySelectorAll('button[data-bp-xin]')) {
      nut.onclick = () => {
        const y = prompt('Cần sửa gì trong bảng giá này? Ban giám hiệu đọc dòng này để quyết.');
        if (!y || !y.trim()) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpXin)}/xin-mo`,
          { lyDo: y }, 'Đã gửi lời xin mở khoá');
      };
    }
    for (const nut of document.querySelectorAll('button[data-bp-mo]')) {
      nut.onclick = () => {
        if (!confirm('Mở khoá bảng giá này để kế toán sửa?')) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpMo)}/tra-loi-xin-mo`,
          { quyetDinh: 'mo' }, 'Đã mở khoá');
      };
    }
    for (const nut of document.querySelectorAll('button[data-bp-tuchoimo]')) {
      nut.onclick = () => {
        const y = prompt('Chưa mở khoá vì sao? (ghi lại cho kế toán)');
        if (!y || !y.trim()) return;
        chay(`/api/hocphi/bieu-phi/${encodeURIComponent(nut.dataset.bpTuchoimo)}/tra-loi-xin-mo`,
          { quyetDinh: 'tu-choi', yKien: y }, 'Đã trả lời kế toán');
      };
    }
  },

  // Ô SOẠN BẢNG GIÁ. Danh sách dòng giữ trong bộ nhớ rồi gửi TRỌN GÓI —
  // máy chủ đặt lại cả danh sách mỗi lượt ghi, nên hai bên cùng một hình dạng.
  moSoanBieuPhi(bp, loaiKhoan) {
    this._bpDong = bp && bp.dong.length
      ? bp.dong.map(d => ({ noiDung: d.noiDung, loai: d.loai, soTien: d.soTien }))
      : [{ noiDung: '', loai: 'hoc-phi', soTien: '' }];
    const loai = loaiKhoan || [{ ma: 'hoc-phi', ten: 'Học phí' }];

    const veDong = () => this._bpDong.map((d, i) => `
      <div class="list-row" style="align-items:flex-end;gap:8px">
        <div class="row-main">
          <div class="field"><label>Khoản thứ ${i + 1}</label>
            <input data-bpd-ten="${i}" value="${UI.esc(d.noiDung)}" placeholder="Ví dụ: Học phí tháng"></div>
          <div class="field"><label>Loại</label>
            <select data-bpd-loai="${i}">${loai.map(l => `
              <option value="${UI.esc(l.ma)}" ${l.ma === d.loai ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
            </select></div>
          <div class="field"><label>Số tiền mỗi tháng</label>
            <input data-bpd-tien="${i}" type="number" min="0" step="1000" value="${UI.esc(String(d.soTien))}"></div>
        </div>
        <div class="row-end">
          ${this._bpDong.length > 1 ? `<button class="btn sm outline" data-bpd-xoa="${i}">Bỏ dòng</button>` : ''}
        </div>
      </div>`).join('');

    const noiLai = () => {
      // Đọc lại những gì đang gõ dở TRƯỚC khi vẽ lại — bản đầu vẽ đè và mọi ô
      // đang gõ về rỗng, tức người dùng mất công gõ vì bấm "Thêm dòng".
      document.getElementById('hpb-dong').innerHTML = veDong();
      for (const o of document.querySelectorAll('[data-bpd-xoa]')) {
        o.onclick = () => { docDong(); this._bpDong.splice(Number(o.dataset.bpdXoa), 1); noiLai(); };
      }
    };
    const docDong = () => {
      this._bpDong = this._bpDong.map((d, i) => ({
        noiDung: (document.querySelector(`[data-bpd-ten="${i}"]`) || {}).value ?? d.noiDung,
        loai: (document.querySelector(`[data-bpd-loai="${i}"]`) || {}).value ?? d.loai,
        soTien: (document.querySelector(`[data-bpd-tien="${i}"]`) || {}).value ?? d.soTien,
      }));
    };

    UI.modal(`
      <div class="field"><label>Tên biểu phí</label>
        <input id="hpb-ten" value="${UI.esc((bp && bp.ten) || '')}"
          placeholder="Ví dụ: Biểu phí năm học 2026–2027"></div>
      <div class="field"><label>Năm học</label>
        <input id="hpb-nam" value="${UI.esc((bp && bp.namHoc) || '')}" placeholder="2026-2027"></div>
      <div id="hpb-dong"></div>
      <button class="btn sm outline block" id="hpb-them-dong">Thêm một dòng</button>
      <div class="field mt-8"><label>Ghi chú</label>
        <input id="hpb-ghi" value="${UI.esc((bp && bp.ghiChu) || '')}" placeholder="không bắt buộc"></div>
      <button class="btn primary block mt-8" id="hpb-luu">Lưu bản nháp</button>
      <div class="muted small mt-8" style="line-height:1.7">
        Lưu xong bảng giá vẫn đang <b>soạn dở</b> — sửa lại bao nhiêu lần cũng được.
        Chỉ khi bấm <b>Gửi duyệt</b> mới khoá lại chờ ban giám hiệu.
      </div>
    `, bp ? 'Sửa biểu phí' : 'Soạn biểu phí mới');

    noiLai();
    document.getElementById('hpb-them-dong').onclick = () => {
      docDong();
      this._bpDong.push({ noiDung: '', loai: 'hoc-phi', soTien: '' });
      noiLai();
    };
    document.getElementById('hpb-luu').onclick = async () => {
      docDong();
      try {
        await API.post('/api/hocphi/bieu-phi', {
          id: bp ? bp.id : undefined,
          ten: document.getElementById('hpb-ten').value,
          namHoc: document.getElementById('hpb-nam').value,
          campusId: bp ? bp.campusId : undefined,
          ghiChu: document.getElementById('hpb-ghi').value,
          dong: this._bpDong,
        });
        UI.closeModal();
        UI.toast('Đã lưu bản nháp', 'success');
        this.moBieuPhi();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ======================================================================
  // TÀI KHOẢN NHẬN TIỀN, MÃ QR, CÚ PHÁP CHUYỂN KHOẢN (Đ208, việc 36)
  // ======================================================================
  //
  // MÀN CỦA GIA ĐÌNH LUÔN IN SỐ TÀI KHOẢN VÀ TÊN CHỦ TÀI KHOẢN BẰNG CHỮ ngay
  // cạnh mã QR. Một mã QR là một hình vuông đen trắng — người quét không đọc
  // được gì trong đó, nên nếu chỉ có mã thì không ai đối chiếu được trước khi
  // bấm chuyển. In chữ ra là vế duy nhất còn lại để một gia đình phát hiện
  // được rằng số tài khoản đã bị đổi.
  async moChuyenKhoan(khoanId) {
    UI.modal('<div class="loading">Đang lấy thông tin chuyển khoản</div>', 'Chuyển khoản');
    let d;
    try { d = await API.get(`/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`); }
    catch (err) { UI.closeModal(); return UI.toast(err.message, 'error'); }

    if (!d.coTaiKhoan) {
      return UI.modal(`
        ${UI.emptyState('🏦', UI.esc(d.loiNhan || 'Nhà trường chưa khai số tài khoản trên app.'))}
        <button class="btn outline block mt-8" onclick="UI.closeModal()">Đóng</button>
      `, 'Chuyển khoản');
    }

    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';
    UI.modal(`
      ${d.qrSvg ? `
        <div style="background:#fff;border-radius:12px;padding:10px;max-width:250px;margin:0 auto">
          ${d.qrSvg}
        </div>
        <div class="small muted" style="text-align:center;margin-top:6px">
          Mở app ngân hàng, chọn quét mã
        </div>` : `
        <div class="small" style="background:#fff6e9;border-radius:8px;padding:9px 11px;line-height:1.6">
          Lần này app chưa dựng được mã QR. Gia đình chuyển khoản theo thông tin bên dưới giúp nhé —
          vẫn đúng như nhau ạ.
        </div>`}
      <div class="card mt-14" style="padding:10px 12px">
        <div class="field" style="margin-bottom:8px">
          <label>Ngân hàng</label>
          <div>${UI.esc(d.tenNganHang || '—')}</div>
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Số tài khoản</label>
          <div style="font-weight:700;letter-spacing:.5px">${UI.esc(d.soTaiKhoan)}</div>
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Chủ tài khoản</label>
          <div>${UI.esc(d.chuTaiKhoan)}</div>
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Số tiền</label>
          <div style="font-weight:700">${UI.esc(tien(d.soTien))}</div>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>Nội dung chuyển khoản</label>
          <div style="font-weight:700;word-break:break-word">${UI.esc(d.cuPhap)}</div>
          <div class="small muted mt-8">
            Xin gia đình gõ đúng dòng nội dung này, để văn phòng biết ngay tiền này của bé nào.
          </div>
        </div>
      </div>
      <button class="btn outline block mt-14" onclick="UI.closeModal()">Đóng</button>
    `, 'Chuyển khoản');
  },

  // Màn khai tài khoản của nhà trường. Máy chủ nói ra quyền (`doiDuoc`) chứ
  // màn hình không tự đoán theo vai — quyền ở đây là chức vụ, không phải vai.
  async moTaiKhoan() {
    UI.modal('<div class="loading">Đang tải</div>', 'Tài khoản nhận tiền');
    let d;
    try { d = await API.get('/api/hocphi/tai-khoan'); }
    catch (err) { UI.closeModal(); return UI.toast(err.message, 'error'); }

    const dsCu = d.danhSach || [];
    const hien = dsCu.find(x => x.campusId === '') || dsCu[0] || null;
    UI.modal(`
      <div class="small" style="background:#fff6e9;border-left:3px solid var(--warning,#d9822b);
                                border-radius:8px;padding:9px 11px;line-height:1.6">
        <b>Đây là chỗ tiền của tất cả các gia đình chạy về.</b>
        App không hỏi ngân hàng được, nên gõ nhầm một chữ số là tiền đi sang chỗ khác
        mà không có gì báo. Xin đối chiếu với sổ ngân hàng của trường trước khi lưu.
      </div>
      ${dsCu.length ? `
        <div class="card mt-14" style="padding:10px 12px">
          ${dsCu.map(x => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(x.campusId || 'Dùng chung cả trường')}</div>
                <div class="row-sub">${UI.esc(x.tenNganHang || x.tenTheoMa || x.maNganHang)} ·
                  ${UI.esc(x.soTaiKhoan)} · ${UI.esc(x.chuTaiKhoan)}</div>
                ${x.nguoiDoiTen ? `<div class="small muted">${UI.esc(x.nguoiDoiTen)} đặt lần cuối</div>` : ''}
              </div>
              <div class="row-end">${x.duDeDungQr
                ? UI.badge('Dựng được mã QR', 'green')
                : UI.badge('Chưa đủ để dựng mã', 'orange')}</div>
            </div>`).join('')}
        </div>` : UI.emptyState('🏦', 'Trường chưa khai tài khoản nào')}
      ${d.doiDuoc ? `
        <div class="field mt-14">
          <label>Ngân hàng</label>
          <select id="hp-tk-nh">
            <option value="">— Chọn ngân hàng —</option>
            ${(d.nganHang || []).map(n => `<option value="${UI.esc(n.ma)}"
              ${hien && hien.maNganHang === n.ma ? 'selected' : ''}>${UI.esc(n.ten)} (${UI.esc(n.ma)})</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Hoặc gõ mã ngân hàng 6 số</label>
          <input id="hp-tk-ma" inputmode="numeric" placeholder="Ví dụ 970436"
            value="${UI.esc(hien ? hien.maNganHang : '')}">
        </div>
        <div class="field">
          <label>Số tài khoản</label>
          <input id="hp-tk-stk" value="${UI.esc(hien ? hien.soTaiKhoan : '')}">
        </div>
        <div class="field">
          <label>Tên chủ tài khoản</label>
          <input id="hp-tk-chu" value="${UI.esc(hien ? hien.chuTaiKhoan : '')}"
            placeholder="Ví dụ TRUONG MAM NON CASA">
        </div>
        <div class="field">
          <label>Cú pháp chuyển khoản</label>
          <input id="hp-tk-cp" value="${UI.esc(hien && hien.cuPhap ? hien.cuPhap : (d.cuPhapMacDinh || ''))}">
          <div class="small muted mt-8">
            Máy thay các ô {MA_BE}, {TEN_BE}, {TEN_KHOAN}, {THANG} rồi bỏ dấu trước khi đưa vào mã QR.
          </div>
        </div>
        <label style="display:flex;gap:9px;align-items:flex-start;padding:8px 2px;cursor:pointer">
          <input type="checkbox" id="hp-tk-dc" style="width:18px;height:18px;flex:none;accent-color:var(--primary)">
          <span class="small">Tôi đã đối chiếu số tài khoản trên với sổ ngân hàng của trường.</span>
        </label>
        <div class="small muted" id="hp-tk-ten" style="min-height:18px"></div>
        <button class="btn primary block mt-8" id="hp-tk-luu">Lưu tài khoản nhận tiền</button>
      ` : `
        <div class="small muted mt-14" style="line-height:1.6">
          Chỉ ban giám hiệu đổi được tài khoản nhận tiền. App cố ý để một mình khâu kế toán
          không tự đổi được chỗ tiền chạy về.
        </div>`}
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Đóng</button>
    `, 'Tài khoản nhận tiền');

    if (!d.doiDuoc) return;
    const oNh = document.getElementById('hp-tk-nh');
    const oMa = document.getElementById('hp-tk-ma');
    const oTen = document.getElementById('hp-tk-ten');
    // ĐỌC LẠI TÊN NGÂN HÀNG CHO NGƯỜI KHAI NHÌN BẰNG MẮT. Danh sách chỉ là gợi
    // ý, nên chỗ chống sai thật nằm ở việc người khai đọc lại tên máy hiểu được.
    const doiTen = () => {
      const ma = String(oMa.value || '').trim();
      const n = (d.nganHang || []).find(x => x.ma === ma);
      oTen.textContent = !ma ? ''
        : n ? `Mã ${ma} — app hiểu là ${n.ten}. Xin đọc lại giúp.`
          : `Mã ${ma} — app không nhận ra ngân hàng nào. Vẫn lưu được, nhưng xin kiểm tra lại mã.`;
    };
    oNh.onchange = () => { if (oNh.value) { oMa.value = oNh.value; doiTen(); } };
    oMa.oninput = doiTen;
    doiTen();

    document.getElementById('hp-tk-luu').onclick = async () => {
      const ma = String(oMa.value || '').trim();
      const n = (d.nganHang || []).find(x => x.ma === ma);
      try {
        await API.put('/api/hocphi/tai-khoan', {
          campusId: '',
          maNganHang: ma,
          tenNganHang: n ? n.ten : '',
          soTaiKhoan: String(document.getElementById('hp-tk-stk').value || '').trim(),
          chuTaiKhoan: String(document.getElementById('hp-tk-chu').value || '').trim(),
          cuPhap: String(document.getElementById('hp-tk-cp').value || '').trim(),
          daDoiChieu: !!document.getElementById('hp-tk-dc').checked,
        });
        UI.closeModal();
        UI.toast('Đã lưu tài khoản nhận tiền', 'success');
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
