// Trang chủ: lưới icon các phân hệ, giống cổng ANS — và từ Đ124, phần "hôm nay"
// cho cô và văn phòng.
//
// BA TRANG CHỦ CHO BA VAI, MỘT TỆP:
//   • Gia đình (từ Đ258): phần đầu gọn, thẻ "Hôm nay của <tên bé>", dòng khảo
//     sát chờ trả lời, nhóm ô "Hằng ngày" và dòng mở các ô còn lại — xem
//     `renderPhuHuynh` ở cuối tệp. Cách vẽ cũ (hero, dải chọn con, lưới biểu
//     tượng) còn nguyên trong `render` làm bước lui.
//   • Cô: thêm bảng "Hôm nay ở nhóm" ngay dưới hero — 20–25 bé nhìn một lượt:
//     ai có mặt, ai chưa được chấm, ai đang nghỉ có đơn, ai có thuốc, ai đã ghi
//     nhật ký, ai đã được đón — và các nút việc hằng ngày kèm số còn lại. Lưới
//     biểu tượng vẫn nguyên bên dưới.
//   • Văn phòng / ban giám hiệu: thay ô chọn bé phẳng của cả trường bằng cây
//     CƠ SỞ → NHÓM với số đếm hôm nay. Bấm một nhóm là tới màn nhóm
//     (#/dashboard/nhom/<mã>), bấm một bé là tới hồ sơ bé. Theo dõi theo cấp,
//     không theo từng bé — đúng cách hiệu trưởng nhìn một trường ba cơ sở.
//
// LƯỚI BIỂU TƯỢNG VẼ TRƯỚC, PHẦN HÔM NAY NẠP SAU rồi điền vào chỗ trống: mất
// mạng, hay máy chủ đời cũ chưa có đường /hom-nay, thì trang chủ vẫn y như
// trước, chỉ thiếu bảng đó. Không bao giờ trắng vì một phần phụ.
//
// QUY TẮC 2 và 4 ở màn này: mọi con số đều là số ĐẾM VIỆC của người lớn (đã
// điểm danh, đã ghi sổ, đơn chờ duyệt) — không phần trăm, không so bé này với bé kia,
// không một con số nào nói về đứa trẻ. "Chưa điểm danh" là việc cô chưa làm,
// tô màu trung tính.
App.views.dashboard = {
  _nhomId: null,   // nhóm đang xem ở bảng hôm nay (cô phụ trách nhiều nhóm)

  render(root, params = []) {
    if (params[0] === 'nhom' && params[1]) return this.renderNhom(root, params[1]);

    // GIA ĐÌNH CÓ TRANG CHỦ RIÊNG (Đ258). Nó vẽ hỏng ở bất kỳ dòng nào thì rơi
    // xuống cách vẽ cũ ngay bên dưới — phần ấy không đổi một dòng, nên trang
    // chủ của gia đình không bao giờ trắng vì giao diện mới (Nguyên tắc số 1).
    if ((App.state.user || {}).role === 'parent') {
      try { return this.renderPhuHuynh(root); }
      catch (loi) { console.warn('Trang chủ mới của gia đình chưa vẽ được, dùng cách vẽ cũ:', loi); }
    }

    const { school, user, badges } = App.state;
    // Lưới biểu tượng dựng từ danh sách phân hệ đang bật, do máy chủ quyết định.
    //
    // `gopVao` (Đ126): ô của phân hệ gấp vào màn khác với một vài vai — với
    // cô, ô "Đón trả bé" ẩn khi màn Điểm danh đang bật vì phần Trả bé nằm
    // trong đó. Chỉ ẩn khi màn đích THẬT SỰ mở được với người này; màn đích
    // tắt thì ô quay lại ngay, không có ngõ cụt.
    //
    // `anKhoiTrangChu` (Đ241f): phân hệ vẫn bật mà không có ô ở đây — lối vào
    // nằm ở Cài đặt (views/settings.js).
    const tiles = (App.state.modules || [])
      .filter(m => !m.nav && !m.anKhoiTrangChu && !this.gopVaoManKhac(m, user));
    // Ô có ĐIỀU KIỆN HIỆN (`dieuKienHien`, Đ141) — xem `apDieuKienHien` bên dưới.
    this._anView = new Set();
    const years = school ? school.years : [];
    const child = user.role === 'parent' ? App.currentStudent() : null;
    const laCo = user.role === 'teacher';
    const laVanPhong = user.role === 'admin';
    root.innerHTML = `
      <header class="hero">
        <div class="hero-top">
          <span class="hero-logo">🏫</span>
          <div class="hero-brand">
            <b>My Casa</b>
            <span>${UI.esc(school ? school.name : '')}</span>
          </div>
          ${
            // Ô chọn năm chỉ dẫn tới màn "Năm học trước" — màn CHỈ dành cho gia
            // đình (lib/modules.js: roles ['parent']). Vẽ ô chọn cho cô và văn
            // phòng là mời họ bấm vào một thứ không đi tới đâu rồi bảo "nhờ
            // nhà trường bật" — phần đó không bật được cho họ. Với họ, năm học
            // hiện hành là một dòng chữ.
            user.role === 'parent' ? `
          <select class="hero-year" id="year-select" aria-label="Năm học">
            ${years.map(y => `<option value="${UI.esc(y)}" ${y === App.state.year ? 'selected' : ''}>${UI.esc(y)}</option>`).join('')}
          </select>` : `<span class="hero-year" aria-label="Năm học">${UI.esc(App.state.year || '')}</span>`}
        </div>

        <div class="hero-greet">
          ${UI.avatar(user.avatar, 54)}
          <div class="hero-greet-text">
            <small>${this.greeting()},</small>
            <b>${UI.esc(user.title)} ${UI.esc(user.name)}</b>
            <i>${this.vaiTro(user, child)}</i>
          </div>
        </div>
        ${UI.studentBar()}
      </header>
      ${
        // Chỗ trống cho bảng hôm nay của cô / cây cơ sở của văn phòng. Trống thì
        // CSS giấu đi và lưới biểu tượng vẫn đè lên hero như trước.
        (laCo || laVanPhong) ? '<div id="hom-nay"></div>' : ''}

      <div class="tile-sheet">
        ${tiles.length ? '' : '<div class="muted small center" style="padding:24px 8px">'
          // Câu cũ — "Nhà trường chưa bật phân hệ nào" — SAI với tài khoản Nhân
          // sự hay Kế toán: nhà trường bật đủ cả, chỉ là phần việc của chức vụ
          // đó không nằm ở lưới này. Và "phân hệ" là chữ chỉ có trong mã nguồn.
          + 'Tài khoản của mình chưa có phần nào hiện ở đây. '
          + 'Việc của mình mở trong <b>Cài đặt</b>. '
          + 'Cần thêm phần nào thì nhờ ban giám hiệu mở giúp.'
          + '</div>'}
        <div class="tile-grid">
          ${tiles.map(t => `
            <button class="tile" data-tile-key="${UI.esc(t.key)}"${t.dieuKienHien ? ' style="display:none"' : ''}
              onclick="location.hash='${UI.esc(t.hash)}'">
              <span class="tile-icon" style="background:${UI.esc(t.bg || 'linear-gradient(135deg,#5b6ceb,#3f4fd8)')}">${
                t.emoji ? `<span style="font-size:27px">${UI.esc(t.emoji)}</span>` : UI.icon(t.icon, 29)}</span>
              <span class="tile-badge" data-tile-badge="${t.key}" style="${badges[t.key] ? '' : 'display:none'}">${badges[t.key] || ''}</span>
              <span class="tile-label">${UI.esc(t.name)}</span>
            </button>`).join('')}
        </div>
      </div>`;

    const oNam = document.getElementById('year-select');
    if (oNam) oNam.onchange = (e) => {
      // Ô này TỪNG nói dối: đổi `App.state.year` rồi báo "Đang xem năm học X"
      // trong khi không màn nào đổi theo cả — còn màn Báo cáo thì tính nhầm
      // học kỳ vì tin vào con số đó. Dữ liệu năm cũ nằm ở màn "Năm học trước";
      // đưa người dùng tới đúng đó, và con số năm hiện hành giữ nguyên.
      const nam = e.target.value;
      if (school && nam !== school.currentYear) {
        e.target.value = school.currentYear;
        if (App.moduleEnabled('namhoccu')) App.navigate('#/namhoccu');
        else UI.toast('Dữ liệu năm cũ xem ở phần "Năm học trước" — nhờ nhà trường bật phần này giúp nhé');
      }
    };

    this._dieuKienDangHoi = this.apDieuKienHien(tiles);

    if (laCo) this.napHomNayCo();
    else if (laVanPhong) this.napTongQuan();
  },

  // Ô CÓ ĐIỀU KIỆN HIỆN: HỎI MÁY CHỦ TRƯỚC KHI LỘ Ô.
  //
  // Nhà trường 07/09, về Nhật ký ngày: "sẽ được tự động bỏ đi với các bạn
  // không phải lớp nhà trẻ". Nhưng trang chủ không biết bé nào là nhà trẻ, và
  // không nên biết — mỗi phân hệ tự biết mình có ích với ai. Nên làm TỔNG QUÁT
  // theo trường `dieuKienHien` của module.json (một đường API trả
  // { hien: true | false }), không viết tên phân hệ nào ở đây.
  //
  // Ô được vẽ sẵn nhưng giấu đi, rồi hỏi tất cả cùng lúc. Máy chủ nói
  // { hien: false } thì bỏ ô; MỌI trường hợp khác — lỗi mạng, máy chủ đời cũ
  // chưa có đường đó, trả lời lạ — thì lộ ô ra. Ẩn ô là tiện, không phải chốt
  // chặn: chốt thật nằm ở tầng API của phân hệ.
  //
  // Trả về tập `view` bị ẩn để phần "việc hôm nay" của cô (nutViec) cũng thôi
  // mời cô làm một việc mà ô của nó đã biến mất.
  async apDieuKienHien(tiles) {
    const an = new Set();
    const co = (tiles || []).filter(t => t && t.dieuKienHien);
    if (!co.length) return an;
    const antoan = (k) => ((window.CSS && CSS.escape) ? CSS.escape(String(k)) : String(k));
    await Promise.all(co.map(async (t) => {
      let hien = true;
      try {
        const r = await API.get(t.dieuKienHien);
        if (r && r.hien === false) hien = false;
      } catch (_) { hien = true; }
      const o = document.querySelector(`.tile[data-tile-key="${antoan(t.key)}"]`);
      if (!hien) {
        an.add(t.view || t.key);
        if (o) o.remove();
      } else if (o) {
        o.style.display = '';
      }
    }));
    this._anView = an;
    return an;
  },

  // Lời chào theo giờ trong ngày.
  greeting() {
    const h = UI.soGioVN();   // giờ Việt Nam, không phải giờ máy
    if (h < 11) return 'Chào buổi sáng';
    if (h < 14) return 'Chào buổi trưa';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  },

  // Dòng vai trò dưới tên người đang đăng nhập.
  //
  // Bản đầu chỉ rẽ hai nhánh: cô, còn lại là phụ huynh. Nên cô hiệu trưởng đăng
  // nhập vào thì trang chủ ghi thẳng là "Phụ huynh" — sai ngay dòng đầu tiên cô
  // nhìn thấy mỗi sáng, và sai theo kiểu làm người ta nghi ngờ mọi thứ bên dưới.
  vaiTro(user, child) {
    if (user.role === 'admin') return 'Quản trị nhà trường';
    if (user.role === 'teacher') return `Cô phụ trách ${UI.esc(this.teacherClassName())}`;
    if (child) return `Phụ huynh bé ${UI.esc(child.name)} · ${UI.esc(child.className || '')}`;
    return 'Phụ huynh';
  },

  // Cô mầm non có thể phụ trách nhiều nhóm — nêu đủ, đừng chỉ nêu nhóm đầu.
  teacherClassName() {
    return UI.noiTenNhom((App.state.user || {}).nhomCuaCo);
  },

  // =========================================================================
  // CÔ: "HÔM NAY Ở NHÓM"
  // =========================================================================
  async napHomNayCo() {
    const o = document.getElementById('hom-nay');
    if (!o) return;
    const dsNhom = (App.state.user || {}).nhomCuaCo || [];
    if (!dsNhom.length) { o.remove(); return; }
    if (!dsNhom.some(n => n.id === this._nhomId)) this._nhomId = dsNhom[0].id;
    o.innerHTML = '<div class="hn-sheet muted small center">Đang xem hôm nay ở nhóm…</div>';
    // Chờ biết ô nào bị ẩn theo điều kiện, để nút việc bên dưới không mời cô
    // làm việc của một ô đã biến mất. Hỏi lỗi thì coi như không ẩn gì.
    try { if (this._dieuKienDangHoi) await this._dieuKienDangHoi; } catch (_) { /* vẫn vẽ */ }
    let d;
    try {
      d = await API.get(`/api/dashboard/hom-nay?classId=${encodeURIComponent(this._nhomId)}`);
    } catch (_) {
      // Máy chủ đời cũ, mất mạng, hay tài khoản không có phần này: trang chủ như trước.
      const cu = document.getElementById('hom-nay');
      if (cu) cu.remove();
      return;
    }
    const oMoi = document.getElementById('hom-nay');
    if (!oMoi) return;   // cô đã bấm sang màn khác trong lúc chờ
    oMoi.innerHTML = this.theHomNay(d, dsNhom);
  },

  doiNhomHomNay(id) {
    this._nhomId = id;
    this.napHomNayCo();
  },

  theHomNay(d, dsNhom) {
    const chonNhom = dsNhom.length > 1
      ? `<div class="seg" role="tablist" aria-label="Nhóm">${dsNhom.map(n => `
          <button class="${n.id === d.nhom.id ? 'active' : ''}"
            onclick="App.views.dashboard.doiNhomHomNay('${UI.maAnToan(n.id)}')">${UI.esc(n.name)}</button>`).join('')}</div>`
      : `<span class="hn-nhom">${UI.esc(d.nhom.name)}</span>`;
    return `
      <section class="hn-sheet" id="hn-panel">
        <div class="hn-head">
          <div>
            <div class="hn-title">Hôm nay ở nhóm</div>
            <div class="hn-sub">${UI.esc(UI.fmtDate(d.ngay))}</div>
          </div>
          ${chonNhom}
        </div>
        ${this.dongDem(d.dem, d.phanHe, d.truongNghi)}
        ${d.be.length
          ? `<div class="be-luoi">${d.be.map(b => this.chipBe(b, d.truongNghi)).join('')}</div>${this.chuThich()}`
          : '<div class="muted small" style="padding:6px 0">Nhóm chưa có bé nào.</div>'}
        <div class="hn-viec">${this.nutViec(d)}</div>
        <a class="hn-link" href="#/dashboard/nhom/${UI.maAnToan(d.nhom.id)}">
          Xem cả nhóm theo danh sách ${UI.icon('chevron', 14)}</a>
      </section>`;
  },

  // Màu trạng thái của một bé hôm nay — lấy từ bảng dùng chung UI.ATT_STATUS để
  // trang chủ và màn Điểm danh nói cùng một màu. Chưa có dòng nào thì màu
  // trung tính: đó là việc cô chưa làm, không phải một lời nào về bé.
  mauCua(b) {
    if (b.diemDanh && UI.ATT_STATUS[b.diemDanh]) return UI.ATT_STATUS[b.diemDanh].color;
    if (b.nghiCoPhep) return UI.ATT_STATUS.absent_excused.color;
    return 'var(--line-strong)';
  },

  chuCua(b, truongNghi) {
    if (b.diemDanh && UI.ATT_STATUS[b.diemDanh]) {
      return UI.ATT_STATUS[b.diemDanh].label + (b.gioVao ? ` · vào ${b.gioVao}` : '');
    }
    if (truongNghi) return 'Trường nghỉ';
    if (b.nghiCoPhep) return 'Có đơn nghỉ đã duyệt, cô chưa chấm';
    return 'Chưa điểm danh';
  },

  // Tên gọi: hai chữ cuối — 20 bé trên một màn thì "Nguyễn Bảo An" thành ba
  // dòng, còn "Bảo An" là đủ để cô nhận ra. Tên đầy đủ nằm ở title.
  tenGoi(ten) {
    return String(ten || '').trim().split(/\s+/).slice(-2).join(' ');
  },

  dauCua(b) {
    const dau = [];
    if (b.thuoc === 'cho') dau.push('<span title="Gia đình gửi thuốc, cô chưa nhận">💊</span>');
    else if (b.thuoc === 'dang') dau.push('<span title="Đang có thuốc gia đình gửi">💊</span>');
    if (b.donCho) dau.push('<span title="Có đơn xin nghỉ chờ duyệt">✉️</span>');
    if (b.nhatKy) dau.push('<span title="Đã ghi nhật ký hôm nay">📝</span>');
    if (b.gioRa) dau.push('<span title="Đã được đón về">🏠</span>');
    return dau.join('');
  },

  chipBe(b, truongNghi) {
    return `
      <button class="be-chip" title="${UI.esc(b.name)} — ${UI.esc(this.chuCua(b, truongNghi))}"
        onclick="App.views.dashboard.moBe('${UI.maAnToan(b.id)}')">
        <span class="be-chip-avatar">${UI.avatar(b.avatar, 34)}<i class="be-dot" style="background:${this.mauCua(b)}"></i></span>
        <span class="be-chip-ten">${UI.esc(this.tenGoi(b.name))}</span>
        <span class="be-chip-dau">${this.dauCua(b)}</span>
      </button>`;
  },

  chuThich() {
    const muc = [
      ['present', UI.ATT_STATUS.present.label],
      ['late', UI.ATT_STATUS.late.label],
      ['absent_excused', UI.ATT_STATUS.absent_excused.label],
      ['absent_unexcused', UI.ATT_STATUS.absent_unexcused.label],
    ];
    return `<div class="hn-chu-thich">${muc.map(([k, ten]) =>
      `<span><i style="background:${UI.ATT_STATUS[k].color}"></i>${UI.esc(ten)}</span>`).join('')}
      <span><i style="background:var(--line-strong)"></i>Chưa điểm danh</span>
      <span>💊 thuốc · ✉️ đơn chờ · 📝 đã ghi nhật ký · 🏠 đã đón về</span>
    </div>`;
  },

  // Dãy số đếm của một nhóm. Phần của phân hệ đang tắt (null) thì không vẽ.
  // Ngày trường nghỉ thì không có ô "Chưa điểm danh": không ai phải chấm.
  dongDem(dem, phanHe = {}, truongNghi = null) {
    const p = (ten, so, mau) => `<span class="dem-pill">${mau ? `<i style="background:${mau}"></i>` : ''}${UI.esc(ten)} ${UI.esc(String(so))}</span>`;
    const muc = [p('bé', dem.soBe)];
    if (phanHe.diemdanh !== false) {
      muc.push(p('Có mặt', dem.coMat, UI.ATT_STATUS.present.color));
      if (dem.denMuon) muc.push(p('Đến muộn', dem.denMuon, UI.ATT_STATUS.late.color));
      if (dem.nghiPhep) muc.push(p('Nghỉ có phép', dem.nghiPhep, UI.ATT_STATUS.absent_excused.color));
      if (dem.nghiKhongPhep) muc.push(p('Nghỉ không phép', dem.nghiKhongPhep, UI.ATT_STATUS.absent_unexcused.color));
      if (!truongNghi) muc.push(p('Chưa điểm danh', dem.chuaDiemDanh, 'var(--line-strong)'));
      // Ra về ghi ở màn Điểm danh từ Đ210.
      if (dem.daVe) muc.push(p('Đã về', dem.daVe));
    }
    if (dem.nhatKyDaGhi !== null && dem.nhatKyDaGhi !== undefined) muc.push(p('Đã ghi nhật ký', dem.nhatKyDaGhi));
    if (dem.donCho) muc.push(p('Đơn chờ duyệt', dem.donCho));
    if (dem.thuocCho) muc.push(p('Thuốc chờ nhận', dem.thuocCho));
    return `<div class="dem-hang">${muc.join('')}</div>`;
  },

  gopVaoManKhac(m, user) {
    const g = m && m.gopVao;
    if (!g || !g.view || !Array.isArray(g.vai)) return false;
    return g.vai.includes(user && user.role) && App.moduleEnabled(g.view);
  },

  // Nút việc hằng ngày kèm số còn lại — chỉ những phần đang bật với người này.
  nutViec(d) {
    const dem = d.dem || {};
    const viec = [];
    const nut = (view, hash, ten, phu, con) => {
      if (!App.moduleEnabled(view)) return;
      // Ô của phân hệ này đã ẩn theo `dieuKienHien` thì nút việc cũng thôi.
      if (this._anView && this._anView.has(view)) return;
      viec.push(`<button class="viec-nut ${con ? 'con' : ''}" onclick="location.hash='${hash}'">
        <b>${UI.esc(ten)}</b><span>${UI.esc(phu)}</span></button>`);
    };
    // Ngày trường nghỉ: một dòng trung tính thay cho lời nhắc điểm danh.
    if (d.truongNghi) {
      nut('attendance', '#/attendance', 'Điểm danh', `Hôm nay trường nghỉ: ${d.truongNghi.ten}`, false);
    } else {
      nut('attendance', '#/attendance', 'Điểm danh',
        dem.chuaDiemDanh ? `còn ${dem.chuaDiemDanh} bé` : 'đã chấm đủ', !!dem.chuaDiemDanh);
    }
    if (dem.nhatKyDaGhi !== null && dem.nhatKyDaGhi !== undefined) {
      const con = Math.max(0, (dem.soBe || 0) - dem.nhatKyDaGhi);
      nut('nhatky', '#/nhatky', 'Nhật ký ngày',
        con ? `đã ghi ${dem.nhatKyDaGhi} · còn ${con}` : 'đã ghi đủ', !!con);
    }
    nut('thuchup', '#/thuchup', 'Ghi nhanh', 'một khoảnh khắc của bé', false);
    if (dem.donCho) nut('leave', '#/leave', 'Xin phép', `${dem.donCho} đơn chờ duyệt`, true);
    if (dem.thuocCho) nut('medicine', '#/medicine', 'Dặn thuốc', `${dem.thuocCho} chờ cô nhận`, true);
    return viec.join('');
  },

  // Bấm một bé: cô thấy hồ sơ trong hộp thoại (màn Hồ sơ của cô là danh sách
  // nhóm); văn phòng thì tới thẳng hồ sơ của ĐÚNG bé ấy — `#/student/<mã>`.
  // Từ góp ý 06/10 (mục 1), `#/student` trống là màn TÌM BÉ, nên phải mang mã
  // theo; bỏ mã là văn phòng bấm một bé mà rơi về ô tìm.
  moBe(id) {
    const u = App.state.user || {};
    if (u.role === 'admin' && App.moduleEnabled('student')) {
      App.state.currentStudentId = id;
      location.hash = `#/student/${id}`;
      return;
    }
    if (App.views.student && typeof App.views.student.showDetail === 'function') {
      App.views.student.showDetail(id);
    }
  },

  // =========================================================================
  // VĂN PHÒNG: CƠ SỞ → NHÓM
  // =========================================================================
  async napTongQuan() {
    const o = document.getElementById('hom-nay');
    if (!o) return;
    o.innerHTML = '<div class="hn-sheet muted small center">Đang xem hôm nay theo cơ sở…</div>';
    let d;
    try { d = await API.get('/api/dashboard/tong-quan'); }
    catch (_) {
      const cu = document.getElementById('hom-nay');
      if (cu) cu.remove();
      return;
    }
    const oMoi = document.getElementById('hom-nay');
    if (!oMoi) return;
    oMoi.innerHTML = this.theTongQuan(d);
  },

  theTongQuan(d) {
    const tong = d.tong || {};
    const dsCoSo = (d.coSo || []).slice();
    if ((d.khongCoSo || []).length) {
      dsCoSo.push({
        id: '', name: (d.coSo || []).length ? 'Nhóm chưa gắn cơ sở' : 'Các nhóm',
        nhom: d.khongCoSo, dem: null,
      });
    }
    // GẬP SẴN (góp ý 20/10, A2): ba cơ sở mở hết là cả màn điện thoại chỉ còn
    // danh sách nhóm. Mỗi cơ sở một khối gập, tiêu đề giữ số bé · số nhóm;
    // gập cả trên máy tính cho nhất quán. Chỉ một khối thì mở sẵn — gập một
    // khối duy nhất là bắt bấm thừa (cùng luật với màn Điểm danh của văn phòng).
    const moSan = dsCoSo.length <= 1;
    const khoi = dsCoSo.map(cs => this.theCoSo(cs, d, moSan));
    return `
      <section class="hn-sheet" id="tq-panel">
        <div class="hn-head">
          <div>
            <div class="hn-title">Hôm nay theo cơ sở</div>
            <div class="hn-sub">${UI.esc(UI.fmtDate(d.ngay))}</div>
          </div>
          <span class="hn-nhom">${UI.esc(String(tong.soBe || 0))} bé · ${UI.esc(String(tong.soNhom || 0))} nhóm</span>
        </div>
        ${khoi.length ? `<div class="tq-luoi">${khoi.join('')}</div>`
          : '<div class="muted small" style="padding:6px 0">Trường chưa có nhóm nào đang mở.</div>'}
      </section>`;
  },

  theCoSo(cs, d, moSan) {
    const soBe = cs.dem ? cs.dem.soBe : cs.nhom.reduce((s, n) => s + (n.soBe || 0), 0);
    return `
      <details class="tq-coso"${moSan ? ' open' : ''}>
        <summary class="tq-coso-head">
          <b>${UI.esc(cs.name)}</b>
          <span>${UI.esc(String(soBe))} bé · ${UI.esc(String(cs.nhom.length))} nhóm</span>
        </summary>
        ${cs.nhom.length
          ? cs.nhom.map(n => this.dongNhom(n, d)).join('')
          : '<div class="muted small" style="padding:4px 0 8px">Chưa có nhóm nào ở cơ sở này.</div>'}
      </details>`;
  },

  dongNhom(n, d) {
    const ph = d.phanHe || {};
    const p = (ten, so, mau) => `<span class="dem-pill">${mau ? `<i style="background:${mau}"></i>` : ''}${UI.esc(ten)} ${UI.esc(String(so))}</span>`;
    const dem = [p('bé', n.soBe)];
    if (n.soBe && ph.diemdanh !== false) {
      dem.push(p('có mặt', n.coMat, UI.ATT_STATUS.present.color));
      if (n.chuaDiemDanh) dem.push(p('chưa chấm', n.chuaDiemDanh, 'var(--line-strong)'));
    }
    if (n.donCho) dem.push(p('đơn chờ', n.donCho));
    if (n.thuocCho) dem.push(p('thuốc chờ', n.thuocCho));
    // Mở màn nhóm chỉ khi tài khoản được xem từng bé (Nhân sự, Kế toán,
    // Marketing thì không) — một dòng bấm vào là 403 thì đừng cho bấm.
    const moDuoc = d.xemTungBe !== false;
    return `
      <button class="tq-nhom" ${moDuoc ? `onclick="location.hash='#/dashboard/nhom/${UI.maAnToan(n.id)}'"` : 'disabled'}>
        <span class="tq-nhom-ten">
          <b>${UI.esc(n.name)}</b>
          <small>${n.coChinh ? UI.esc(n.coChinh) : 'Chưa phân công cô'}</small>
        </span>
        <span class="tq-nhom-dem">${dem.join('')}</span>
        ${moDuoc ? `<span class="muted">${UI.icon('chevron', 16)}</span>` : ''}
      </button>`;
  },

  // =========================================================================
  // MÀN MỘT NHÓM, HÔM NAY — cho cả cô lẫn văn phòng
  // =========================================================================
  async renderNhom(root, classId) {
    const d = await API.get(`/api/dashboard/hom-nay?classId=${encodeURIComponent(classId)}`);
    const laVanPhong = (App.state.user || {}).role === 'admin';
    const co = d.co.length
      ? d.co.map(c => `${UI.esc(c.title)} ${UI.esc(c.name)}${c.vaiTro === 'phu' ? ' (phụ)' : ''}`).join(', ')
      : 'Chưa phân công cô';
    root.innerHTML = `
      ${UI.pageHeader(`Nhóm ${d.nhom.name}`)}
      <div class="card">
        <div class="row-title">${UI.esc(d.nhom.name)}${d.nhom.coSo ? ` · ${UI.esc(d.nhom.coSo.name)}` : ''}</div>
        <div class="row-sub">${UI.esc(UI.fmtDate(d.ngay))} · ${co}</div>
        <div class="mt-8">${this.dongDem(d.dem, d.phanHe, d.truongNghi)}</div>
        <div class="hn-viec" style="margin-top:4px">${this.nutViec(d)}</div>
      </div>
      <div class="card">
        ${d.be.length
          ? d.be.map(b => this.dongBe(b, laVanPhong, d.truongNghi)).join('')
          : UI.emptyState('🎒', 'Nhóm chưa có bé nào')}
      </div>`;
  },

  dongBe(b, laVanPhong, truongNghi) {
    const conf = b.diemDanh ? UI.ATT_STATUS[b.diemDanh] : null;
    const chuaCo = truongNghi ? UI.badge('Trường nghỉ', 'gray')
      : (b.nghiCoPhep ? UI.badge('Có đơn nghỉ đã duyệt', 'blue') : UI.badge('Chưa điểm danh', 'gray'));
    const trangThai = conf ? UI.badge(conf.label, conf.cls) : chuaCo;
    const them = [];
    if (b.gioVao) them.push(`vào ${b.gioVao}`);
    if (b.thuoc === 'cho') them.push('thuốc chờ cô nhận');
    else if (b.thuoc === 'dang') them.push('đang có thuốc gia đình gửi');
    if (b.donCho) them.push('đơn xin nghỉ chờ duyệt');
    if (b.nhatKy === true) them.push('đã ghi nhật ký');
    if (b.gioRa) them.push(`đã về ${b.gioRa}`);
    return `
      <div class="list-row clickable" onclick="App.views.dashboard.moBe('${UI.maAnToan(b.id)}')">
        ${UI.avatar(b.avatar, 36)}
        <div class="row-main">
          <div class="row-title">${UI.esc(b.name)}</div>
          <div class="row-sub">${them.length ? UI.esc(them.join(' · ')) : UI.esc(b.code || '')}</div>
        </div>
        <div class="row-end">${trangThai}</div>
        ${laVanPhong ? `<span class="muted">${UI.icon('chevron', 16)}</span>` : ''}
      </div>`;
  },

  // =========================================================================
  // GIA ĐÌNH: TRANG CHỦ THEO BẢN VẼ (Đ258)
  // =========================================================================
  //
  // Từ trên xuống: phần đầu gọn (tên trường, một dòng chào, dải chọn con) ·
  // thẻ "Hôm nay của <tên bé>" · dòng khảo sát chờ trả lời · nhóm ô "Hằng
  // ngày" kèm dòng mở các ô còn lại. Ô chọn năm học sang Cài đặt.
  //
  // Ô VẼ TRƯỚC, THẺ HÔM NAY NẠP SAU — cùng nếp với bảng hôm nay của cô: mất
  // mạng hay một đường API hỏng thì gia đình vẫn đủ ô để đi tiếp, chỉ thiếu
  // thẻ. Thẻ không có đường API riêng: nó ghép ngay ở trình duyệt từ những
  // đường gia đình vốn đọc được, nên quyền xem từng bé và chốt bật/tắt từng
  // phần vẫn do máy chủ giữ như cũ.
  //
  // Khuôn một ô và luật lọc ô chép lại từ `render` chứ không dùng chung hàm:
  // `render` là bước lui khi phần này hỏng, nên nó không được dựa vào phần này.
  _moThem: false,     // gia đình đang mở các ô ngoài nhóm "Hằng ngày"
  _theoDoiKs: null,   // bộ theo dõi huy hiệu của ô Khảo sát

  // Năm phần gia đình mở mỗi ngày, đúng thứ tự của bản vẽ. Kể theo `view`.
  O_HANG_NGAY: ['attendance', 'leave', 'menu', 'medicine', 'albums'],

  renderPhuHuynh(root) {
    const { school, user } = App.state;
    const tiles = (App.state.modules || [])
      .filter(m => !m.nav && !m.anKhoiTrangChu && !this.gopVaoManKhac(m, user));
    this._anView = new Set();
    const be = App.currentStudent();
    const { hangNgay, conLai } = this.chiaO(tiles);
    const coNhom = hangNgay.length > 0;
    // Dòng khảo sát đọc số từ huy hiệu của ô Khảo sát: phần ấy tắt thì không
    // có ô, và cũng không có dòng.
    const oKs = tiles.find(t => t.key === 'khaosat');
    const tenChao = [String(user.title || '').toLocaleLowerCase('vi'), this.tenGoi(user.name)]
      .filter(Boolean).join(' ');
    root.innerHTML = `
      <header class="hero ph-hero">
        <div class="ph-truong">${UI.esc(school ? school.name : '')}</div>
        <h1 class="ph-chao">${UI.esc(this.greeting())}, ${UI.esc(tenChao)}</h1>
        ${UI.studentBar()}
      </header>
      <div class="ph-than">
        ${be ? this.khungHomNay(be) : ''}
        ${oKs ? `
        <a class="ph-ks" id="ph-khao-sat" href="${UI.esc(oKs.hash)}" style="display:none">
          <span class="ph-ks-hinh" aria-hidden="true">${UI.icon('survey', 18)}</span>
          <span class="ph-ks-chu"></span>
          ${UI.icon('chevron', 18)}
        </a>` : ''}
        <div class="tile-sheet ph-o${this._moThem ? ' mo-them' : ''}">
          ${coNhom ? '<h2 class="ph-nhom">Hằng ngày</h2>' : ''}
          <div class="tile-grid"${coNhom ? ` data-hn="${hangNgay.length}"` : ''}>
            ${hangNgay.map(t => this.oPhuHuynh(t, false)).join('')}${conLai.map(t => this.oPhuHuynh(t, coNhom)).join('')}
          </div>
          ${coNhom && conLai.length
            ? '<button type="button" class="ph-them" id="ph-them" onclick="App.views.dashboard.doiMoThem()"></button>' : ''}
        </div>
      </div>`;

    this.veDongThem();
    this.theoDoiKhaoSat();
    // Ô có điều kiện hiện trả lời xong thì đếm lại: ô nào máy chủ bảo bỏ là
    // biến khỏi cả lưới lẫn dòng "mục khác".
    this._dieuKienDangHoi = this.apDieuKienHien(tiles).finally(() => this.veDongThem());
    if (be) this.napHomNayPhuHuynh(be);
  },

  // Chia ô thành nhóm "Hằng ngày" và phần còn lại. Không phần hằng ngày nào
  // đang bật thì nhóm rỗng, và chỗ gọi KHÔNG giấu ô nào: trang chủ chỉ còn
  // một dòng "mục khác" là bắt gia đình bấm thừa mới thấy ô đầu tiên.
  chiaO(tiles) {
    const hangNgay = this.O_HANG_NGAY.map(v => tiles.find(t => t.view === v)).filter(Boolean);
    return { hangNgay, conLai: tiles.filter(t => !hangNgay.includes(t)) };
  },

  // Một ô. `phu` = ô ngoài nhóm "Hằng ngày": vẫn nằm trong lưới với đủ nhãn và
  // chỗ huy hiệu, CSS giấu đi cho tới khi gia đình bấm dòng "mục khác".
  oPhuHuynh(t, phu) {
    const so = (App.state.badges || {})[t.key];
    return `
      <button class="tile${phu ? ' tile-phu' : ''}" data-tile-key="${UI.esc(t.key)}"${t.dieuKienHien ? ' style="display:none"' : ''}
        onclick="location.hash='${UI.esc(t.hash)}'">
        <span class="tile-icon" style="background:${UI.esc(t.bg || 'linear-gradient(135deg,#5b6ceb,#3f4fd8)')}">${
          t.emoji ? `<span style="font-size:27px">${UI.esc(t.emoji)}</span>` : UI.icon(t.icon, 29)}</span>
        <span class="tile-badge" data-tile-badge="${UI.esc(t.key)}" style="${so ? '' : 'display:none'}">${UI.esc(so || '')}</span>
        <span class="tile-label">${UI.esc(t.name)}</span>
      </button>`;
  },

  // DÒNG "… VÀ N MỤC KHÁC", DỰNG TỪ CHÍNH CÁC Ô ĐANG CÓ TRONG TRANG.
  //
  // Đếm trên trang chứ không trên danh sách phân hệ, vì `apDieuKienHien` gỡ ô
  // sau khi trang đã vẽ. Mỗi ô đang giấu có một bong bóng mang cùng
  // `data-tile-badge` với ô ấy: `App.refreshBadges` cập nhật mọi phần tử có
  // thuộc tính đó, nên con số của ô giấu vẫn tới được mắt gia đình mà không
  // phải sửa tệp dùng chung.
  veDongThem() {
    const luoi = document.querySelector('.ph-o .tile-grid');
    if (!luoi) return;
    // Ô còn chờ máy chủ trả lời điều kiện hiện thì chưa tính.
    const daLo = (o) => o.style.display !== 'none';
    if (luoi.hasAttribute('data-hn')) {
      luoi.dataset.hn = String([...luoi.querySelectorAll('.tile:not(.tile-phu)')].filter(daLo).length);
    }
    const nut = document.getElementById('ph-them');
    if (!nut) return;
    const giau = [...luoi.querySelectorAll('.tile.tile-phu')].filter(daLo);
    nut.style.display = giau.length ? '' : 'none';
    nut.setAttribute('aria-expanded', this._moThem ? 'true' : 'false');
    const ten = giau.map(o => (o.querySelector('.tile-label') || {}).textContent || '');
    nut.innerHTML = `
      <span class="ph-them-chu">${UI.esc(this._moThem ? 'Thu gọn' : this.chuMucKhac(ten))}</span>
      ${giau.map((o) => {
        const so = o.querySelector('.tile-badge');
        const hien = so && so.style.display !== 'none';
        return `<b class="ph-so" data-tile-badge="${UI.esc(o.dataset.tileKey)}" style="${hien ? '' : 'display:none'}">${UI.esc(hien ? so.textContent : '')}</b>`;
      }).join('')}
      ${UI.icon('chevron', 18)}`;
  },

  // "Hồ sơ của bé, Khảo sát, Sức khỏe và 7 mục khác"; từ ba ô trở xuống thì kể đủ tên.
  chuMucKhac(ten) {
    if (ten.length > 3) return `${ten.slice(0, 3).join(', ')} và ${ten.length - 3} mục khác`;
    return ten.length > 1 ? `${ten.slice(0, -1).join(', ')} và ${ten[ten.length - 1]}` : (ten[0] || '');
  },

  doiMoThem() {
    this._moThem = !this._moThem;
    const o = document.querySelector('.ph-o');
    if (o) o.classList.toggle('mo-them', this._moThem);
    this.veDongThem();
  },

  // DÒNG "N KHẢO SÁT CHỜ GIA ĐÌNH TRẢ LỜI" ĐỌC TỪ HUY HIỆU CỦA Ô KHẢO SÁT.
  //
  // Một con số, một nguồn: huy hiệu ấy do `App.refreshBadges` cập nhật mỗi 15
  // giây. Theo dõi chính phần tử đó thì dòng này không cần lời gọi API nào
  // riêng, và không bao giờ nói khác con số trên ô.
  theoDoiKhaoSat() {
    if (this._theoDoiKs) { this._theoDoiKs.disconnect(); this._theoDoiKs = null; }
    const dong = document.getElementById('ph-khao-sat');
    const so = document.querySelector('.tile .tile-badge[data-tile-badge="khaosat"]');
    if (!dong || !so) return;
    const ve = () => {
      const n = so.style.display === 'none' ? '' : so.textContent.trim();
      dong.querySelector('.ph-ks-chu').textContent = n ? `${n} khảo sát chờ gia đình trả lời` : '';
      dong.style.display = n ? '' : 'none';
    };
    ve();
    this._theoDoiKs = new MutationObserver(ve);
    this._theoDoiKs.observe(so, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  },

  // ---- Thẻ "Hôm nay của <tên bé>" ----

  // Khung thẻ vẽ ngay cùng lưới ô: tên bé và ngày không cần hỏi máy chủ.
  // "Hôm nay" là ngày của TRƯỜNG theo giờ Việt Nam (UI.todayStr).
  khungHomNay(be) {
    const ngay = UI.todayStr();
    return `
      <section class="ph-the" id="ph-hom-nay">
        <div class="ph-the-dau">
          <h2>Hôm nay của ${UI.esc(this.tenGoi(be.name))}</h2>
          <span class="ph-ngay">${UI.esc(`${UI.DOW[UI.parseDate(ngay).getDay()]}, ${UI.fmtDateShort(ngay)}`)}</span>
        </div>
        <div class="ph-the-than"><div class="ph-dang-nap">Đang xem hôm nay của con…</div></div>
      </section>`;
  },

  async napHomNayPhuHuynh(be) {
    const goThe = () => { const o = document.getElementById('ph-hom-nay'); if (o) o.remove(); };
    try {
      const ngay = UI.todayStr();
      const coDiemDanh = App.moduleEnabled('attendance');
      const coSo = ((App.state.classes || []).find(c => c.id === be.classId) || {}).campusId || '';
      const cuaBe = `studentId=${encodeURIComponent(be.id)}&month=${ngay.slice(0, 7)}`;
      // Phần nào đang tắt thì không hỏi. Mỗi đường một `catch` riêng: thực đơn
      // hỏng không được kéo mất dòng tới lớp, và ngược lại.
      const hoi = (bat, duong) => (bat ? API.get(duong).catch(() => null) : Promise.resolve(null));
      const [so, kho, thucDon, lich] = await Promise.all([
        hoi(coDiemDanh, `/api/attendance?${cuaBe}`),
        hoi(coDiemDanh, `/api/attendance/anh?${cuaBe}`),
        hoi(App.moduleEnabled('menu'), `/api/menu?week=0${coSo ? `&campusId=${encodeURIComponent(coSo)}` : ''}`),
        hoi(App.moduleEnabled('leave'), `/api/leave/lich-nghi?tu=${ngay}&den=${ngay}`),
      ]);
      // Gia đình đã đổi con hoặc sang màn khác trong lúc chờ: câu trả lời này
      // là của bé kia, không được vẽ vào thẻ đang hiện.
      if (!document.getElementById('ph-hom-nay') || (App.currentStudent() || {}).id !== be.id) return;
      // Phần Điểm danh đang bật mà không đọc được sổ thì KHÔNG đoán: viết "cô
      // chưa điểm danh" lúc ấy là nói một điều app không biết. Gỡ thẻ.
      const dong = (coDiemDanh && !Array.isArray(so)) ? []
        : this.dongHomNay(be, ngay, { so: so || [], kho, thucDon, lich, coSo, coDiemDanh });
      if (!dong.length) { goThe(); return; }
      document.querySelector('#ph-hom-nay .ph-the-than').innerHTML = dong.join('');
    } catch (loi) {
      // Thẻ là phần thêm. Hỏng thì gỡ, lưới ô bên dưới vẫn nguyên.
      console.warn('Thẻ hôm nay của gia đình chưa vẽ được:', loi);
      goThe();
    }
  },

  // Các dòng của thẻ, đúng thứ tự một ngày: tới lớp → bữa trưa → lời cô nhắn →
  // ra về.
  //
  // QUY TẮC 2 và 4: "cô chưa điểm danh", "cô chưa ghi giờ về" là việc người
  // lớn chưa làm — chữ xám, vòng nét đứt, không màu cảnh báo. Bé nghỉ cũng màu
  // trung tính, kể cả nghỉ không phép. Không con số nào ngoài giờ vào, giờ ra.
  dongHomNay(be, ngay, d) {
    const r = d.so.find(x => x.date === ngay) || null;
    const beNghi = !!r && /^absent/.test(String(r.status));
    const coMat = !!r && !beNghi;
    const nhan = r ? (UI.ATT_STATUS[r.status] || UI.ATT_STATUS.present).label : '';
    // Đợt nghỉ của cả trường hoặc của đúng cơ sở bé đang theo — nhà có con ở
    // hai cơ sở thì đợt nghỉ riêng của cơ sở kia không áp cho bé này.
    const dot = ((d.lich && d.lich.dot) || [])
      .find(x => (!x.campusId || x.campusId === d.coSo) && x.tuNgay <= ngay && x.denNgay >= ngay) || null;
    const anh = ((d.kho && d.kho.anh) || []).find(a => a.date === ngay && a.file) || null;
    const ghiVe = (((d.kho && d.kho.ghiChuVe) || []).find(x => x.date === ngay) || {}).ghiChu || '';
    const bua = (((d.thucDon && d.thucDon.menus) || []).find(m => m.date === ngay) || {}).meals || [];
    const mon = bua.filter(b => b && b.type === 'lunch').flatMap(b => b.items || []).map(String).filter(Boolean);

    const ra = [];
    if (dot) {
      ra.push(this.dongThe({ loai: 'truong-nghi', kieu: 'xam', bieuTuong: 'calendar', ten: `Hôm nay trường nghỉ: ${dot.ten}` }));
    }
    if (coMat) {
      ra.push(this.dongThe({
        loai: 'toi', kieu: 'xanh', bieuTuong: 'check', ten: 'Tới lớp', gio: r.checkIn || '', phu: nhan,
        // Ngày không có ảnh thì không vẽ khung chờ ảnh: cô chụp được hôm nào
        // hay hôm ấy (cùng luật với màn Điểm danh của gia đình).
        canh: anh ? `
        <a class="ph-anh" href="#/attendance/${UI.esc(ngay)}/${UI.maAnToan(be.id)}" aria-label="Xem ảnh con tới lớp">
          <img src="/api/attendance/anh/${UI.esc(anh.file)}" alt="Ảnh con tới lớp">
        </a>` : '',
      }));
    } else if (beNghi) {
      // Ghi chú của một dòng nghỉ (kể cả dòng app tự ghi theo đơn đã duyệt)
      // đứng ngay dưới nhãn, không đội tên "cô nhắn".
      ra.push(this.dongThe({ loai: 'be-nghi', kieu: 'xam', bieuTuong: 'calendar', ten: nhan, phu: r.note || '' }));
    } else if (d.coDiemDanh && !dot) {
      ra.push(this.dongThe({ loai: 'chua', kieu: 'ngo', bieuTuong: 'attendance', ten: 'Cô chưa điểm danh hôm nay' }));
    }
    // Ngày trường nghỉ thì bếp không nấu: món còn nằm trong thực đơn tuần
    // cũng không đưa lên thẻ.
    if (mon.length && (!dot || coMat)) {
      ra.push(this.dongThe({ loai: 'thuc-don', kieu: 'cam', bieuTuong: 'menu', ten: 'Thực đơn bữa trưa', phu: mon.join(', ') }));
    }
    if (coMat && (r.note || ghiVe)) {
      // Tên cô CHỈ ghi khi người chấm dòng này là một cô của nhóm bé mà trang
      // đang có sẵn; không khớp thì không đoán tên.
      const co = (be.teachers || []).find(t => t.id === r.markedBy) || null;
      ra.push(this.dongThe({
        loai: 'loi-co', kieu: 'duong', bieuTuong: 'chat',
        ten: co ? `${co.title || 'Cô'} ${this.tenGoi(co.name)} nhắn` : 'Lời cô nhắn',
        them: (r.note ? `<div class="ph-loi">${UI.esc(r.note)}</div>` : '')
          + (ghiVe ? `<div class="ph-loi"><span class="ph-phu">Lúc về:</span> ${UI.esc(ghiVe)}</div>` : ''),
      }));
    }
    if (coMat && (r.checkOut || !dot)) {
      ra.push(r.checkOut
        ? this.dongThe({ loai: 'ra-ve', kieu: 'xam', bieuTuong: 'home', ten: 'Ra về', gio: r.checkOut })
        : this.dongThe({ loai: 'ra-ve', kieu: 'ngo', bieuTuong: 'home', ten: 'Ra về', phu: 'Cô chưa ghi giờ về' }));
    }
    return ra;
  },

  // Một dòng của thẻ. `ten`, `gio`, `phu` là CHỮ THÔ, hàm này bọc; `them` và
  // `canh` là HTML chỗ gọi đã bọc sẵn.
  dongThe({ loai, kieu, bieuTuong, ten, gio = '', phu = '', them = '', canh = '' }) {
    return `
      <div class="ph-dong ph-k-${kieu}" data-ph="${loai}">
        <span class="ph-cham" aria-hidden="true">${UI.icon(bieuTuong, 18)}</span>
        <div class="ph-dong-than">
          <div class="ph-dong-dau"><span class="ph-dong-ten">${UI.esc(ten)}</span>${
            gio ? `<span class="ph-gio">${UI.esc(gio)}</span>` : ''}</div>
          ${phu ? `<div class="ph-phu">${UI.esc(phu)}</div>` : ''}${them}
        </div>${canh}
      </div>`;
  },
};
