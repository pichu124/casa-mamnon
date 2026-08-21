// Phân hệ Điểm danh.
// Phụ huynh: lịch điểm danh theo tháng của con. Giáo viên: điểm danh cả lớp theo ngày.
App.views.attendance = {
  month: null,   // phụ huynh: tháng đang xem 'YYYY-MM'
  date: null,    // giáo viên: ngày đang điểm danh 'YYYY-MM-DD'
  _byDate: {},   // phụ huynh: bản ghi theo ngày của tháng đang xem
  _roster: [],   // giáo viên: [{ student, record }] của ngày đang chọn

  STATUS_KEYS: ['present', 'late', 'absent_excused', 'absent_unexcused'],
  SHORT: { present: 'Có mặt', late: 'Muộn', absent_excused: 'Nghỉ CP', absent_unexcused: 'Nghỉ KP' },

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: lịch tháng của con ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Điểm danh') + UI.emptyState('🎒', 'Chưa có học sinh liên kết với tài khoản này');
      return;
    }
    if (!this.month) this.month = UI.todayStr().slice(0, 7);
    const records = await API.get(`/api/attendance?studentId=${encodeURIComponent(current.id)}&month=${this.month}`);
    this._byDate = {};
    records.forEach(r => { this._byDate[r.date] = r; });

    const [y, m] = this.month.split('-').map(Number);
    const counts = { present: 0, late: 0, absent_excused: 0, absent_unexcused: 0 };
    records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
    const recent = records.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    root.innerHTML = `
      ${UI.pageHeader('Điểm danh')}
      ${UI.studentBar()}
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px">
        <button class="btn outline sm" onclick="App.views.attendance.changeMonth(-1)" aria-label="Tháng trước">‹</button>
        <b>Tháng ${m}/${y}</b>
        <button class="btn outline sm" onclick="App.views.attendance.changeMonth(1)" aria-label="Tháng sau">›</button>
      </div>
      <div class="stat-row">
        ${this.STATUS_KEYS.map(k => `
          <div class="stat-box">
            <div class="stat-num" style="color:${UI.ATT_STATUS[k].color}">${counts[k]}</div>
            <div class="stat-label">${UI.esc(this.SHORT[k])}</div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Lịch điểm danh của con</div>
        ${this.calendarHtml(y, m)}
        <div class="flex mt-14" style="flex-wrap:wrap;gap:10px;justify-content:center">
          ${this.STATUS_KEYS.map(k => `
            <span class="small muted flex" style="gap:5px">
              <span style="width:8px;height:8px;border-radius:50%;background:${UI.ATT_STATUS[k].color};display:inline-block"></span>${UI.esc(UI.ATT_STATUS[k].label)}
            </span>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('clock', 19)} Bản ghi gần nhất</div>
        ${recent.length
          ? recent.map(r => this.recordRow(r)).join('')
          : UI.emptyState('🗓️', 'Tháng này chưa có dữ liệu điểm danh của con')}
      </div>`;
  },

  // Lưới lịch tháng: hàng đầu T2..CN, ô ngoài tháng làm mờ (dim).
  calendarHtml(y, m) {
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // số ô đệm trước ngày 1 (tuần bắt đầu T2)
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevDays = new Date(y, m - 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const today = UI.todayStr();
    let cells = '';
    for (let i = 0; i < total; i++) {
      const dayNum = i - lead + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells += `<div class="cal-cell dim">${dayNum < 1 ? prevDays + dayNum : dayNum - daysInMonth}</div>`;
        continue;
      }
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const rec = this._byDate[dateStr];
      const st = rec ? UI.ATT_STATUS[rec.status] : null;
      cells += `
        <div class="cal-cell ${rec ? 'clickable' : ''}"
          ${rec ? `onclick="App.views.attendance.showDay('${dateStr}')"` : ''}
          ${dateStr === today ? 'style="outline:2px solid var(--primary)"' : ''}>
          ${dayNum}
          <span class="dot" style="background:${st ? st.color : 'transparent'}"></span>
        </div>`;
    }
    return `<div class="att-cal">
      ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => `<div class="cal-head">${d}</div>`).join('')}
      ${cells}
    </div>`;
  },

  recordRow(r) {
    const st = UI.ATT_STATUS[r.status] || UI.ATT_STATUS.present;
    const times = [r.checkIn ? `Vào ${r.checkIn}` : null, r.checkOut ? `Ra ${r.checkOut}` : null].filter(Boolean).join(' · ');
    return `
      <div class="list-row clickable" onclick="App.views.attendance.showDay('${UI.esc(r.date)}')">
        <span style="width:10px;height:10px;border-radius:50%;background:${st.color};flex:none"></span>
        <div class="row-main">
          <div class="row-title">${UI.esc(UI.fmtDate(r.date))}</div>
          <div class="row-sub">${UI.esc(times || 'Không ghi nhận giờ vào/ra')}${r.note ? ` · ${UI.esc(r.note)}` : ''}</div>
        </div>
        <span class="row-end">${UI.badge(st.label, st.cls)}</span>
      </div>`;
  },

  showDay(dateStr) {
    const r = this._byDate[dateStr];
    if (!r) return;
    const st = UI.ATT_STATUS[r.status] || UI.ATT_STATUS.present;
    UI.modal(`
      <div class="center">
        <div class="muted small">${UI.esc(UI.fmtDate(r.date))}</div>
        <div class="mt-8">${UI.badge(st.label, st.cls)}</div>
      </div>
      <div class="mt-14">
        ${this.detailRow('Giờ vào lớp', r.checkIn || '—')}
        ${this.detailRow('Giờ ra về', r.checkOut || '—')}
        ${this.detailRow('Ghi chú của cô', r.note || 'Không có ghi chú')}
      </div>`, 'Chi tiết điểm danh');
  },

  detailRow(label, value) {
    return `<div class="list-row"><div class="row-main"><div class="row-sub">${UI.esc(label)}</div><div class="row-title">${UI.esc(value)}</div></div></div>`;
  },

  changeMonth(delta) {
    const [y, m] = this.month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    App.route();
  },

  // ---- Giáo viên: điểm danh lớp theo ngày ----
  async renderTeacher(root) {
    if (!this.date) this.date = UI.todayStr();
    const data = await API.get(`/api/attendance/class?date=${this.date}`);
    this._roster = data.students;
    const cls = App.state.classes.find(c => c.id === App.state.user.classId);
    const total = this._roster.length;
    const marked = this._roster.filter(r => r.record).length;

    root.innerHTML = `
      ${UI.pageHeader(`Điểm danh ${cls ? cls.name : ''}`)}
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Ngày điểm danh</label>
          <input type="date" value="${UI.esc(this.date)}" onchange="App.views.attendance.setDate(this.value)">
        </div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Sĩ số</div></div>
        <div class="stat-box"><div class="stat-num" id="att-so-da" style="color:var(--success)">${marked}</div><div class="stat-label">Đã điểm danh</div></div>
        <div class="stat-box"><div class="stat-num" id="att-so-chua" style="color:${total - marked ? 'var(--warning)' : 'var(--muted)'}">${total - marked}</div><div class="stat-label">Chưa điểm danh</div></div>
      </div>
      <button class="btn success-soft block" onclick="App.views.attendance.markAll()">${UI.icon('check', 18)} Cả lớp có mặt</button>
      <div class="card mt-14">
        ${total
          ? this._roster.map(r => this.rosterRow(r)).join('')
          : UI.emptyState('🎒', 'Lớp chưa có học sinh nào')}
      </div>`;
  },

  rosterRow({ student: s, record }) {
    const times = record
      ? [record.checkIn ? `Vào ${record.checkIn}` : null, record.checkOut ? `Ra ${record.checkOut}` : null].filter(Boolean).join(' · ')
      : '';
    return `
      <div class="list-row" id="att-dong-${UI.esc(s.id)}" style="align-items:flex-start">
        ${UI.avatar(s.avatar, 42)}
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}</div>
          <div class="row-sub">${UI.esc(s.code)}${times ? ` · ${UI.esc(times)}` : ''}${record && record.note ? ` · ${UI.esc(record.note)}` : ''}</div>
          <div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:8px">
            ${this.STATUS_KEYS.map(k => {
              const conf = UI.ATT_STATUS[k];
              const sel = record && record.status === k;
              return `<button class="badge ${conf.cls}" title="${UI.esc(conf.label)}"
                style="cursor:pointer;${sel ? `background:${conf.color};color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2)` : 'opacity:.55'}"
                onclick="App.views.attendance.mark('${UI.esc(s.id)}', '${k}')">${UI.esc(this.SHORT[k])}</button>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },

  setDate(value) {
    if (!value) return;
    this.date = value;
    App.route();
  },

  // CỐ Ý không gọi App.route() sau mỗi lần chạm.
  //
  // App.route() vẽ lại cả trang rồi cuộn về đầu. Lớp 30 em thì cô chạm em thứ 25
  // xong bị ném về đầu danh sách, phải cuộn lại từ đầu cho từng em — điểm danh
  // một lớp thành 30 lần cuộn. Chỉ vẽ lại đúng dòng vừa đổi và hai ô đếm.
  async mark(studentId, status) {
    const ngayLucBam = this.date;
    try {
      const rec = await API.post('/api/attendance/mark', { studentId, date: ngayLucBam, status });
      // Cô có thể đã đổi ngày trong lúc chờ mạng — lúc đó danh sách trên màn hình
      // là của ngày khác, ghi vào sẽ hiện sai.
      if (this.date !== ngayLucBam) return;
      const dong = this._roster.find(x => x.student.id === studentId);
      if (dong) dong.record = rec;
      this.veLaiDong(studentId);
      this.veLaiSoDem();
      UI.toast('Đã lưu điểm danh', 'success');
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  veLaiDong(studentId) {
    const dong = this._roster.find(x => x.student.id === studentId);
    const el = document.getElementById(`att-dong-${studentId}`);
    if (!dong || !el) return;   // trang đã vẽ lại vì lý do khác — bỏ qua, không nổ
    el.outerHTML = this.rosterRow(dong);
  },

  veLaiSoDem() {
    const tong = this._roster.length;
    const daDiem = this._roster.filter(x => x.record).length;
    const oDa = document.getElementById('att-so-da');
    const oChua = document.getElementById('att-so-chua');
    if (oDa) oDa.textContent = daDiem;
    if (oChua) {
      oChua.textContent = tong - daDiem;
      oChua.style.color = tong - daDiem ? 'var(--warning)' : 'var(--muted)';
    }
  },

  // Hỏi lại trước khi ghi hàng loạt. Trước đây một lần chạm nhầm ghi đè toàn bộ
  // những em cô vừa đánh dấu nghỉ, mà app không có đường hoàn tác.
  markAll() {
    const tong = this._roster.length;
    if (!tong) return;
    const chua = this._roster.filter(r => !r.record).length;
    const daCo = tong - chua;

    UI.modal(`
      ${chua
        ? `<p style="line-height:1.6">Đánh dấu <b>${chua} em chưa điểm danh</b> là có mặt?</p>`
        : `<p style="line-height:1.6">Cả lớp đã điểm danh xong rồi — không còn em nào chưa đánh dấu.</p>`}
      ${daCo
        ? `<p class="muted small" style="line-height:1.6">${daCo} em cô đã đánh dấu sẽ <b>giữ nguyên</b>,
           kể cả em nghỉ có phép hay nghỉ không phép.</p>`
        : ''}
      ${chua ? `<button class="btn primary block mt-14" id="att-tat-ca">Đánh dấu ${chua} em còn lại có mặt</button>` : ''}
      ${daCo ? `<button class="btn outline block mt-8" id="att-ghi-de">
                  Ghi đè cả lớp thành có mặt
                  <span class="muted small">(${daCo} em đã đánh dấu sẽ bị thay)</span>
                </button>` : ''}
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Cả lớp có mặt');

    const chay = async (ghiDe) => {
      try {
        const r = await API.post('/api/attendance/mark-all', { date: this.date, status: 'present', ghiDe });
        UI.closeModal();
        UI.toast(r.soGiuNguyen
          ? `Đã đánh dấu ${r.soDaGhi} em có mặt, giữ nguyên ${r.soGiuNguyen} em`
          : `Đã đánh dấu ${r.soDaGhi} em có mặt`, 'success');
        App.route();
        App.refreshBadges();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    const nut = document.getElementById('att-tat-ca');
    if (nut) nut.onclick = () => chay(false);
    const nutGhiDe = document.getElementById('att-ghi-de');
    if (nutGhiDe) nutGhiDe.onclick = () => chay(true);
  },
};
