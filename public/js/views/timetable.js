// Phân hệ Thời khóa biểu: lịch học theo lớp, xem theo từng thứ trong tuần.
// Phụ huynh xem theo lớp của con đang chọn, giáo viên xem lớp chủ nhiệm.
App.views.timetable = {
  day: null,  // 1 = Thứ Hai ... 5 = Thứ Sáu
  data: null, // bản ghi TKB đang hiển thị

  async render(root) {
    const user = App.state.user;
    let classId = null;
    if (user.role === 'teacher') {
      classId = user.classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Thời khóa biểu') + UI.emptyState('🎒', 'Chưa có học sinh liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    if (!this.day) {
      const dw = new Date().getDay();
      this.day = dw >= 1 && dw <= 5 ? dw : 1; // cuối tuần → xem Thứ Hai
    }
    const data = await API.get(`/api/timetable?classId=${encodeURIComponent(classId)}`);
    this.data = data;
    root.innerHTML = `
      ${UI.pageHeader('Thời khóa biểu')}
      ${UI.studentBar()}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(d => `
          <button class="${d === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${d})">T${d + 1}</button>`).join('')}
      </div>
      <div id="tkb-day"></div>
      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Ghi chú</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Lớp</div><div class="row-title">${UI.esc(data.className)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Lịch học</div><div class="row-title">Buổi sáng 4 tiết, buổi chiều 3 tiết</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Giáo viên chủ nhiệm</div><div class="row-title">${UI.esc(data.teacherName || '—')}</div></div></div>
      </div>`;
    this.renderDay();
  },

  setDay(d) {
    if (this.day === d) return;
    this.day = d;
    const seg = document.getElementById('tkb-seg');
    if (seg) Array.from(seg.children).forEach((btn, i) => btn.classList.toggle('active', i + 1 === d));
    this.renderDay();
  },

  // Vẽ bảng tiết học của thứ đang chọn.
  renderDay() {
    const zone = document.getElementById('tkb-day');
    if (!zone || !this.data) return;
    const subjects = (this.data.days && this.data.days[String(this.day)]) || [];
    if (!subjects.length) {
      zone.innerHTML = UI.emptyState('📚', 'Chưa có thời khóa biểu cho ngày này');
      return;
    }
    const isToday = new Date().getDay() === this.day;
    zone.innerHTML = `<div class="card">${subjects.map((sub, i) => this.periodRow(sub, i, isToday)).join('')}</div>`;
  },

  // Một tiết học: số tiết + tên môn + khung giờ; tô sáng nếu đang diễn ra.
  periodRow(subject, i, isToday) {
    const pt = (this.data.periodTimes || [])[i] || {};
    const time = pt.time || '';
    const free = subject === '—';
    const live = isToday && !free && this.inPeriod(time);
    const rowStyle = live
      ? ' style="background:#e9f0ff;border-radius:12px;padding-left:10px;padding-right:10px;border-bottom:none"'
      : (free ? ' style="opacity:.55"' : '');
    return `
      <div class="list-row"${rowStyle}>
        <span class="row-icon" style="background:#e6efff;color:var(--primary);font-weight:800;font-size:1.02rem">${UI.esc(pt.p || i + 1)}</span>
        <div class="row-main">
          <div class="row-title"${free ? ' style="color:var(--muted);font-weight:500;font-style:italic"' : ''}>${free ? 'Nghỉ / tự học' : UI.esc(subject)}</div>
          <div class="row-sub">${UI.esc(time)}</div>
        </div>
        ${live ? UI.badge('Đang học', 'green') : ''}
      </div>`;
  },

  // Giờ hiện tại có nằm trong khung "HH:MM – HH:MM" không?
  inPeriod(timeStr) {
    const m = String(timeStr).match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
    if (!m) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= (+m[1] * 60 + +m[2]) && cur <= (+m[3] * 60 + +m[4]);
  },
};
