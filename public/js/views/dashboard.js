// Trang chủ: lưới icon các phân hệ, giống cổng ANS.
App.views.dashboard = {
  TILES: [
    { key: 'hocsinh', hash: '#/student', label: 'Học sinh', icon: 'student', bg: 'linear-gradient(135deg,#5b6ceb,#3f4fd8)' },
    { key: 'diemdanh', hash: '#/attendance', label: 'Điểm danh', icon: 'attendance', bg: 'linear-gradient(135deg,#38a1f7,#1f7ae0)' },
    { key: 'xinphep', hash: '#/leave', label: 'Xin phép', icon: 'leave', bg: 'linear-gradient(135deg,#f36f95,#e0476f)' },
    { key: 'thucdon', hash: '#/menu', label: 'Thực đơn', icon: 'menu', bg: 'linear-gradient(135deg,#f7a145,#ef7d1a)' },
    { key: 'tkb', hash: '#/timetable', label: 'Thời khóa biểu', icon: 'timetable', bg: 'linear-gradient(135deg,#a86ef5,#8a46e8)' },
    { key: 'nhanxet', hash: '#/remarks', label: 'Nhận xét', icon: 'remark', bg: 'linear-gradient(135deg,#2ec9a5,#14a984)' },
    { key: 'baocao', hash: '#/reports', label: 'Báo cáo', icon: 'report', bg: 'linear-gradient(135deg,#f0b429,#dd9505)' },
    { key: 'xebuyt', hash: '#/bus', label: 'Xe buýt', icon: 'bus', bg: 'linear-gradient(135deg,#3f8ef7,#2b6cd9)' },
    { key: 'nenep', hash: '#/conduct', label: 'Nề nếp', icon: 'conduct', bg: 'linear-gradient(135deg,#f2635c,#dd3f38)' },
    { key: 'khaosat', hash: '#/surveys', label: 'Khảo sát', icon: 'survey', bg: 'linear-gradient(135deg,#f7c948,#eda810)' },
    { key: 'yte', hash: '#/health', label: 'Y tế', icon: 'health', bg: 'linear-gradient(135deg,#3ecf6e,#22aa4e)' },
    { key: 'danthuoc', hash: '#/medicine', label: 'Dặn thuốc', icon: 'medicine', bg: 'linear-gradient(135deg,#ec5f8c,#d63868)' },
    { key: 'album', hash: '#/albums', label: 'Album ảnh', icon: 'album', bg: 'linear-gradient(135deg,#b06ef0,#9146d8)' },
    { key: 'kehoach', hash: '#/plans', label: 'Kế hoạch giáo dục', icon: 'plan', bg: 'linear-gradient(135deg,#2fbfae,#0f9d8d)' },
  ],

  render(root) {
    const { school, user, badges } = App.state;
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
              ? `Giáo viên chủ nhiệm ${UI.esc(this.teacherClassName())}`
              : child ? `Phụ huynh em ${UI.esc(child.name)} · ${UI.esc(child.className || '')}` : 'Phụ huynh'}</i>
          </div>
        </div>
        ${UI.studentBar()}
      </header>

      <div class="tile-sheet">
        <div class="tile-grid">
          ${this.TILES.map(t => `
            <button class="tile" onclick="location.hash='${t.hash}'">
              <span class="tile-icon" style="background:${t.bg}">${UI.icon(t.icon, 29)}</span>
              <span class="tile-badge" data-tile-badge="${t.key}" style="${badges[t.key] ? '' : 'display:none'}">${badges[t.key] || ''}</span>
              <span class="tile-label">${t.label}</span>
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

  teacherClassName() {
    const cls = App.state.classes.find(c => c.id === App.state.user.classId);
    return cls ? cls.name : '';
  },
};
