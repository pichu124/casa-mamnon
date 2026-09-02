// Trang chủ: lưới icon các phân hệ, giống cổng ANS.
App.views.dashboard = {
  render(root) {
    const { school, user, badges } = App.state;
    // Lưới biểu tượng dựng từ danh sách phân hệ đang bật, do máy chủ quyết định.
    const tiles = (App.state.modules || []).filter(m => !m.nav);
    const years = school ? school.years : [];
    const child = user.role === 'parent' ? App.currentStudent() : null;
    root.innerHTML = `
      <header class="hero">
        <div class="hero-top">
          <span class="hero-logo">🏫</span>
          <div class="hero-brand">
            <b>CASA Mầm non</b>
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
        ${UI.studentBar()}${UI.thanhChonBe()}
      </header>

      <div class="tile-sheet">
        ${tiles.length ? '' : '<div class="muted small center" style="padding:24px 8px">'
          // Câu cũ — "Nhà trường chưa bật phân hệ nào" — SAI với tài khoản Nhân
          // sự hay Kế toán: nhà trường bật đủ cả, chỉ là phần việc của chức vụ
          // đó không nằm ở lưới này. Và "phân hệ" là chữ chỉ có trong mã nguồn.
          + 'Tài khoản của mình chưa có phần nào hiện ở đây. '
          + 'Việc của mình mở trong <b>Cài đặt → Quản trị</b>. '
          + 'Cần thêm phần nào thì nhờ ban giám hiệu mở giúp.'
          + '</div>'}
        <div class="tile-grid">
          ${tiles.map(t => `
            <button class="tile" onclick="location.hash='${UI.esc(t.hash)}'">
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
  },

  // Lời chào theo giờ trong ngày.
  greeting() {
    const h = new Date().getHours();
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
};
