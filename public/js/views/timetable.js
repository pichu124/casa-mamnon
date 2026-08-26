// Phân hệ Thời khóa biểu: lịch học theo nhóm, xem theo từng thứ trong tuần.
// Phụ huynh xem theo nhóm của con đang chọn; giáo viên xem nhóm mình phụ trách.
// Cô phụ trách và quản trị sửa được TKB của nhóm ngay trên màn hình này.
App.views.timetable = {
  day: null,      // 1 = Thứ Hai ... 5 = Thứ Sáu
  data: null,     // bản ghi TKB đang hiển thị
  classId: null,  // lớp đang xem
  editing: false, // đang ở chế độ sửa
  draft: null,    // bản nháp khi sửa: { periodTimes, days }

  // Khung giờ mặc định khi một nhóm lập TKB lần đầu.
  KHUNG_GIO_MAC_DINH: [
    { p: 1, time: '07:30 – 08:05' }, { p: 2, time: '08:10 – 08:45' },
    { p: 3, time: '09:00 – 09:35' }, { p: 4, time: '09:40 – 10:15' },
    { p: 5, time: '14:00 – 14:35' }, { p: 6, time: '14:40 – 15:15' },
    { p: 7, time: '15:25 – 16:00' },
  ],

  async render(root) {
    const user = App.state.user;
    let classId = null;
    if (user.role === 'teacher') {
      classId = (user.nhomCuaCo || [])[0]?.id || user.classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Thời khóa biểu') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    // Đổi nhóm giữa chừng (quản trị chuyển bé sang nhóm khác) thì bỏ bản nháp đang sửa.
    if (this.classId !== classId) { this.editing = false; this.draft = null; }
    this.classId = classId;
    if (!this.day) {
      const dw = new Date().getDay();
      this.day = dw >= 1 && dw <= 5 ? dw : 1; // cuối tuần → xem Thứ Hai
    }

    if (this.editing && this.draft) return this.renderEditor(root);

    let data = null, thongBao = 'Nhóm chưa có thời khóa biểu';
    try {
      data = await API.get(`/api/timetable?classId=${encodeURIComponent(classId)}`);
    } catch (err) {
      thongBao = err.message || thongBao;
    }
    this.data = data;

    if (!data) {
      // Chỉ mời tạo mới khi máy chủ xác nhận nhóm CHƯA có TKB. Lỗi mạng thì không —
      // kẻo lưu bản mặc định đè lên TKB thật đang có.
      const chuaCo = /chưa có thời khóa biểu/i.test(thongBao);
      root.innerHTML = `
        ${UI.pageHeader('Thời khóa biểu')}
        ${UI.studentBar()}
        ${UI.emptyState('📚', thongBao)}
        ${this.canEdit() && chuaCo ? `
          <button class="btn primary block" onclick="App.views.timetable.batDauTao()">${UI.icon('plus', 18)} Lập thời khóa biểu</button>` : ''}`;
      return;
    }

    const suaDuoc = this.canEdit();
    root.innerHTML = `
      ${UI.pageHeader('Thời khóa biểu', suaDuoc ? { action: { id: 'btn-sua-tkb', label: 'Chỉnh sửa', icon: 'edit' } } : {})}
      ${UI.studentBar()}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(d => `
          <button class="${d === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${d})">T${d + 1}</button>`).join('')}
      </div>
      <div id="tkb-day"></div>
      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Ghi chú</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Nhóm</div><div class="row-title">${UI.esc(data.className)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Lịch học</div><div class="row-title">Buổi sáng 4 tiết, buổi chiều 3 tiết</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Cô phụ trách</div><div class="row-title">${UI.esc(data.teacherNames || data.teacherName || '—')}</div></div></div>
      </div>`;
    if (suaDuoc) document.getElementById('btn-sua-tkb').onclick = () => this.batDauSua();
    this.renderDay();
  },

  // Cô phụ trách sửa nhóm mình; quản trị sửa nhóm bất kỳ; phụ huynh chỉ xem.
  canEdit() {
    const u = App.state.user;
    if (!u) return false;
    if (u.role === 'admin') return true;
    return u.role === 'teacher' && (u.classIds || []).includes(this.classId);
  },

  setDay(d) {
    if (this.day === d) return;
    if (this.editing) {
      // Giữ lại những gì vừa gõ của thứ đang mở trước khi chuyển thứ khác.
      this.thuThapNhap();
      this.day = d;
      App.route();
      return;
    }
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

  // ---- Chế độ sửa (cô phụ trách / quản trị) ----

  batDauSua() {
    if (!this.data) return;
    this.draft = JSON.parse(JSON.stringify({
      periodTimes: this.data.periodTimes || [],
      days: this.data.days || {},
    }));
    this.editing = true;
    App.route();
  },

  // Nhóm chưa có TKB: bắt đầu từ khung giờ mặc định, các tiết để trống.
  batDauTao() {
    const soTiet = this.KHUNG_GIO_MAC_DINH.length;
    const days = {};
    for (let d = 1; d <= 5; d++) days[String(d)] = Array(soTiet).fill('—');
    this.draft = { periodTimes: JSON.parse(JSON.stringify(this.KHUNG_GIO_MAC_DINH)), days };
    this.editing = true;
    App.route();
  },

  renderEditor(root) {
    const d = this.draft;
    const mon = (d.days[String(this.day)] || []);
    root.innerHTML = `
      ${UI.pageHeader('Sửa thời khóa biểu')}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(x => `
          <button class="${x === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${x})">T${x + 1}</button>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Thứ ${this.day + 1} — môn học từng tiết</div>
        <div class="muted small" style="margin-bottom:10px">Để trống hoặc ghi "—" nếu tiết đó nghỉ. Khung giờ dùng chung cho cả tuần.</div>
        ${d.periodTimes.map((pt, i) => `
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <span class="row-icon" style="background:#e6efff;color:var(--primary);font-weight:800;flex:none">${UI.esc(pt.p || i + 1)}</span>
            <div class="field" style="flex:1.7;margin:0">
              <input id="tkb-mon-${i}" value="${UI.esc(mon[i] === '—' ? '' : (mon[i] || ''))}" placeholder="Tên môn học">
            </div>
            <div class="field" style="flex:1;margin:0">
              <input id="tkb-gio-${i}" value="${UI.esc(pt.time || '')}" placeholder="07:30 – 08:05">
            </div>
          </div>`).join('')}
      </div>
      <button class="btn primary block" onclick="App.views.timetable.luuSua()">${UI.icon('check', 18)} Lưu thời khóa biểu</button>
      <button class="btn block" style="margin-top:8px" onclick="App.views.timetable.huySua()">Hủy</button>`;
  },

  // Đọc các ô nhập của thứ đang mở vào bản nháp.
  thuThapNhap() {
    const d = this.draft;
    if (!d) return;
    const ngay = d.days[String(this.day)] || (d.days[String(this.day)] = []);
    d.periodTimes.forEach((pt, i) => {
      const oMon = document.getElementById(`tkb-mon-${i}`);
      const oGio = document.getElementById(`tkb-gio-${i}`);
      if (oMon) ngay[i] = oMon.value.trim() || '—';
      if (oGio) pt.time = oGio.value.trim();
    });
  },

  async luuSua() {
    this.thuThapNhap();
    try {
      const kq = await API.put(`/api/timetable/${encodeURIComponent(this.classId)}`, {
        periodTimes: this.draft.periodTimes,
        days: this.draft.days,
      });
      this.data = kq;
      this.editing = false;
      this.draft = null;
      UI.toast('Đã lưu thời khóa biểu', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  huySua() {
    this.editing = false;
    this.draft = null;
    App.route();
  },
};
