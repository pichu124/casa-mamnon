// Phân hệ Lịch sinh hoạt: một ngày ở nhóm, xem theo từng thứ trong tuần.
//
// Tên cũ là "Thời khóa biểu" — chữ của trường phổ thông. Nội dung bên trong đã
// là lịch sinh hoạt một ngày từ lâu (đón bé, thể dục sáng, ăn, ngủ trưa, trả bé),
// nên cái tên và cái ruột đang nói hai chuyện khác nhau: cô đọc "thời khóa biểu"
// rồi đi tìm "tiết học", không thấy. Tên biến `periodTimes`, `p`, `TOI_DA_TIET`
// giữ nguyên — CLAUDE.md cho phép tầng dữ liệu nói tiếng Anh của app 1.
// Phụ huynh xem theo nhóm của con đang chọn; giáo viên xem nhóm mình phụ trách.
// Cô phụ trách và quản trị sửa được TKB của nhóm ngay trên màn hình này.
//
// Cô mầm non có thể phụ trách 2–3 nhóm. Bản đầu lấy cứng `nhomCuaCo[0]`, nên cô
// dạy hai nhóm KHÔNG có đường nào mở TKB của nhóm thứ hai — kể cả khi máy chủ
// vẫn cho phép. Ô chọn nhóm chỉ hiện khi cô có nhiều hơn một nhóm; cô một nhóm
// không thấy nó và số thao tác không đổi một chút nào. Giống hệt màn Điểm danh.
App.views.timetable = {
  day: null,      // 1 = Thứ Hai ... 5 = Thứ Sáu
  data: null,     // bản ghi TKB đang hiển thị
  classId: null,  // nhóm đang xem
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
    const dsNhom = user.role === 'teacher' ? (user.nhomCuaCo || []) : [];
    if (user.role === 'teacher') {
      // Nhóm cô đang chọn, nếu nhóm đó vẫn còn thuộc về cô. Quản trị vừa rút cô
      // khỏi một nhóm thì rơi về nhóm đầu, không kẹt ở một nhóm không còn quyền.
      if (!dsNhom.some(n => n.id === this.classId)) {
        this.classId = dsNhom[0]?.id || user.classId || null;
      }
      classId = this.classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Lịch sinh hoạt') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
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

    let data = null, thongBao = 'Nhóm chưa có lịch sinh hoạt';
    try {
      data = await API.get(`/api/timetable?classId=${encodeURIComponent(classId)}`);
    } catch (err) {
      thongBao = err.message || thongBao;
    }
    this.data = data;

    if (!data) {
      // Chỉ mời tạo mới khi máy chủ xác nhận nhóm CHƯA có TKB. Lỗi mạng thì không —
      // kẻo lưu bản mặc định đè lên TKB thật đang có.
      const chuaCo = /chưa có lịch sinh hoạt/i.test(thongBao);
      root.innerHTML = `
        ${UI.pageHeader('Lịch sinh hoạt')}
        ${UI.studentBar()}${UI.thanhChonBe()}
        ${UI.emptyState('📚', thongBao)}
        ${this.canEdit() && chuaCo ? `
          <button class="btn primary block" onclick="App.views.timetable.batDauTao()">${UI.icon('plus', 18)} Lập lịch sinh hoạt</button>` : ''}`;
      return;
    }

    const suaDuoc = this.canEdit();
    root.innerHTML = `
      ${UI.pageHeader('Lịch sinh hoạt', suaDuoc ? { action: { id: 'btn-sua-tkb', label: 'Chỉnh sửa', icon: 'edit' } } : {})}
      ${UI.studentBar()}${UI.thanhChonBe()}
      ${this.oChonNhom(dsNhom)}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(d => `
          <button class="${d === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${d})">T${d + 1}</button>`).join('')}
      </div>
      <div id="tkb-day"></div>
      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Ghi chú</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Nhóm</div><div class="row-title">${UI.esc(data.className)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Một ngày ở nhóm</div><div class="row-title">Từ lúc đón bé tới lúc trả bé</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Cô phụ trách</div><div class="row-title">${UI.esc(data.teacherNames || data.teacherName || '—')}</div></div></div>
      </div>`;
    if (suaDuoc) document.getElementById('btn-sua-tkb').onclick = () => this.batDauSua();
    this.renderDay();
  },

  // Ô chọn nhóm — chỉ hiện khi cô phụ trách nhiều hơn một nhóm.
  oChonNhom(dsNhom) {
    if (!dsNhom || dsNhom.length < 2) return '';
    return `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Nhóm lớp</label>
          <select onchange="App.views.timetable.setNhom(this.value)">
            ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this.classId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;
  },

  setNhom(value) {
    if (!value || value === this.classId) return;
    // Đang sửa dở TKB nhóm này mà chuyển sang nhóm khác thì bỏ bản nháp, kẻo
    // lưu nhầm hoạt động của nhóm này sang nhóm kia.
    this.editing = false;
    this.draft = null;
    this.classId = value;
    App.route();
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

  // Vẽ lịch sinh hoạt của thứ đang chọn.
  renderDay() {
    const zone = document.getElementById('tkb-day');
    if (!zone || !this.data) return;
    const subjects = (this.data.days && this.data.days[String(this.day)]) || [];
    if (!subjects.length) {
      zone.innerHTML = UI.emptyState('📚', 'Chưa có lịch sinh hoạt cho ngày này');
      return;
    }
    const isToday = new Date().getDay() === this.day;
    zone.innerHTML = `<div class="card">${subjects.map((sub, i) => this.periodRow(sub, i, isToday)).join('')}</div>`;
  },

  // Một mốc sinh hoạt: số thứ tự + tên hoạt động + khung giờ; tô sáng nếu đang diễn ra.
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

  // Nhóm chưa có lịch: bắt đầu từ khung giờ mặc định, các mốc để trống.
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
      ${UI.pageHeader('Sửa lịch sinh hoạt')}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(x => `
          <button class="${x === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${x})">T${x + 1}</button>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Thứ ${this.day + 1} — hoạt động từng mốc</div>
        <div class="muted small" style="margin-bottom:10px">Để trống hoặc ghi "—" nếu mốc đó không có hoạt động riêng. Khung giờ dùng chung cho cả tuần.</div>
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
      <button class="btn primary block" onclick="App.views.timetable.luuSua()">${UI.icon('check', 18)} Lưu lịch sinh hoạt</button>
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
      UI.toast('Đã lưu lịch sinh hoạt', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  huySua() {
    this.editing = false;
    this.draft = null;
    App.route();
  },
};
