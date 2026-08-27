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
            <b>SchoolConnect</b>
            <span>${UI.esc(school ? school.name : '')}</span>
          </div>
          <select class="hero-year" id="year-select" aria-label="Năm học">
            ${years.map(y => `<option value="${UI.esc(y)}" ${y === App.state.year ? 'selected' : ''}>${UI.esc(y)}</option>`).join('')}
          </select>
        </div>

        <div class="hero-greet">
          ${UI.avatar(user.avatar, 54)}
          <div class="hero-greet-text">
            <small>${this.greeting()},</small>
            <b>${UI.esc(user.title)} ${UI.esc(user.name)}</b>
            <i>${user.role === 'teacher'
              ? `Cô phụ trách ${UI.esc(this.teacherClassName())}`
              : child ? `Phụ huynh bé ${UI.esc(child.name)} · ${UI.esc(child.className || '')}` : 'Phụ huynh'}</i>
          </div>
        </div>
        ${UI.studentBar()}
      </header>

      <div class="tile-sheet">
        ${tiles.length ? '' : '<div class="muted small center" style="padding:24px 8px">Nhà trường chưa bật phân hệ nào.</div>'}
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

    document.getElementById('year-select').onchange = (e) => {
      App.state.year = e.target.value;
      UI.toast(`Đang xem năm học ${e.target.value}`);
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

  // Cô mầm non có thể phụ trách nhiều nhóm — nêu đủ, đừng chỉ nêu nhóm đầu.
  teacherClassName() {
    return ((App.state.user || {}).nhomCuaCo || []).map(n => n.name).join(', ');
  },
};
