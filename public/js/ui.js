// Tiện ích giao diện dùng chung cho mọi view.
window.UI = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Bộ icon SVG nét mảnh (kiểu feather), dùng: UI.icon('bus', 26)
  const P = (d) => `<path d="${d}"/>`;
  const ICON_PATHS = {
    student: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v5"/>',
    attendance: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18"/><path d="M8.5 15l2.5 2.5L16 13"/>',
    leave: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z"/><path d="M14 2v5h5"/><path d="M9 14l2 2 4-4.5"/>',
    menu: '<path d="M5 2v8M8 2v8M6.5 10v12"/><path d="M14 2v20"/><path d="M14 2c3 0 5 2.5 5 6s-2 5-5 5"/>',
    timetable: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18M9 9v12M15 9v12M3 15h18"/>',
    remark: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/><path d="M8.5 10h7M8.5 13.5h4.5"/>',
    report: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15l3.2-3.8 2.6 2.3L17 9.5"/>',
    bus: '<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 9h16M8 3v6M16 3v6"/><circle cx="8" cy="19.5" r="1.6"/><circle cx="16" cy="19.5" r="1.6"/><path d="M4 13h.01M20 13h.01"/>',
    conduct: '<path d="M4 5h2M4 12h2M4 19h2"/><path d="M10 5h10M10 12h10M10 19h10"/><circle cx="5" cy="5" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="5" cy="19" r="1.4"/>',
    survey: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    health: '<path d="M12 20s-7-4.3-9.3-8.5C.8 8 2.7 4.5 6.2 4.5c2.2 0 3.8 1.2 4.8 3 1-1.8 2.6-3 4.8-3 3.5 0 5.4 3.5 3.5 7-2.3 4.2-9.3 8.5-9.3 8.5z"/><path d="M7 12h3l1.5-2.8 2 5 1.5-2.2h3"/>',
    medicine: '<rect x="2.5" y="8.5" width="13" height="7" rx="3.5" transform="rotate(-45 9 12)"/><path d="M8.2 7.8l5 5"/><circle cx="17" cy="17" r="4.5"/><path d="M15 17h4M17 15v4"/>',
    album: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15.5l-4.5-4.5L7 21"/>',
    plan: '<path d="M12 6c-1.5-1.8-4-2.5-9-2.5v14c5 0 7.5.7 9 2.5 1.5-1.8 4-2.5 9-2.5v-14c-5 0-7.5.7-9 2.5v14"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10.2 20a2 2 0 0 0 3.6 0"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-6h4v6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.15-1.44l2.1-1.62-2-3.46-2.46 1a7 7 0 0 0-2.49-1.44L13.5 2h-3l-.5 2.6a7 7 0 0 0-2.49 1.44l-2.46-1-2 3.46 2.1 1.62A7 7 0 0 0 5 12c0 .49.05.97.15 1.44l-2.1 1.62 2 3.46 2.46-1a7 7 0 0 0 2.49 1.44l.5 2.6h3l.5-2.6a7 7 0 0 0 2.49-1.44l2.46 1 2-3.46-2.1-1.62c.1-.47.15-.95.15-1.44z"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4 12.5l5 5L20 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.25a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  };
  function icon(name, size = 24, stroke = 2) {
    const p = ICON_PATHS[name] || ICON_PATHS.info;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  }

  // ---- Định dạng ngày giờ tiếng Việt ----
  const DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function parseDate(s) {
    if (s instanceof Date) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
    return new Date(s);
  }
  function fmtDate(s, opts = {}) {
    const d = parseDate(s);
    const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return opts.weekday === false ? dd : `${DOW[d.getDay()]}, ${dd}`;
  }
  function fmtDateShort(s) {
    const d = parseDate(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function fmtTime(s) {
    const d = new Date(s);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function timeAgo(s) {
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const dd = Math.floor(h / 24);
    if (dd < 7) return `${dd} ngày trước`;
    return fmtDate(s, { weekday: false });
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---- Thành phần dựng sẵn ----
  function pageHeader(title, opts = {}) {
    return `
      <div class="page-head">
        <button class="back-btn" onclick="history.back()" aria-label="Quay lại">${icon('back', 20)}</button>
        <h1>${esc(title)}</h1>
        ${opts.action ? `<button class="head-action" id="${esc(opts.action.id)}">${opts.action.icon ? icon(opts.action.icon, 17) : ''}${esc(opts.action.label)}</button>` : ''}
      </div>`;
  }

  function avatar(av, size = 42) {
    const bg = av && av.bg ? av.bg : '#8899aa';
    const emoji = av && av.emoji ? av.emoji : '👤';
    return `<span class="avatar" style="width:${size}px;height:${size}px;background:${esc(bg)};font-size:${Math.round(size * 0.55)}px">${emoji}</span>`;
  }

  function emptyState(emoji, text) {
    return `<div class="empty-state"><div class="es-icon">${emoji}</div><p>${esc(text)}</p></div>`;
  }

  // Chip chọn con (phụ huynh nhiều con). Tự render lại view hiện tại khi đổi.
  function studentBar() {
    const students = App.state.students || [];
    if (App.state.user.role !== 'parent' || students.length < 2) return '';
    return `<div class="student-bar">${students.map(s => `
      <button class="student-chip ${s.id === App.state.currentStudentId ? 'active' : ''}" onclick="App.setStudent('${esc(s.id)}')">
        ${avatar(s.avatar, 30)}<span>${esc(s.name)}</span>
      </button>`).join('')}</div>`;
  }

  // Ô chọn bé dành cho vai QUẢN TRỊ.
  //
  // VÌ SAO LÀ HÀM RIÊNG, KHÔNG NỚI `studentBar`
  //
  // `studentBar` là dải chip ngang, làm cho phụ huynh có hai ba con. Quản trị
  // một trường ba cơ sở nhìn thấy hàng trăm bé — dải chip đó thành băng cuộn
  // dài vô tận. Và `studentBar` đang được 10 màn hình gọi: nới điều kiện của nó
  // là đổi hành vi cả 10 chỗ cùng một lúc, đúng thứ Nguyên tắc số 1 cấm làm với
  // tệp dùng chung.
  //
  // VÌ SAO CẦN
  //
  // Các màn một-bé (Hồ sơ, Nhận xét, Nề nếp, Báo cáo, Sức khỏe…) rẽ nhánh theo
  // `role === 'teacher'`, nên vai quản trị rơi vào nhánh PHỤ HUYNH và hiện dữ
  // liệu của bé đầu bảng chữ cái — không ô chọn, và có màn không ghi tên bé nào
  // trên đó cả. Quản trị đang đọc nhận xét của một đứa trẻ mà không biết là đứa
  // nào. Lúc phụ huynh gọi điện khiếu nại thì đó là chỗ nhầm rất đắt.
  function thanhChonBe() {
    const u = App.state.user || {};
    const students = App.state.students || [];
    if (u.role !== 'admin' || !students.length) return '';
    const dang = students.find(s => s.id === App.state.currentStudentId) || students[0];
    return `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Đang xem hồ sơ của bé</label>
          <select onchange="App.setStudent(this.value)">
            ${students.map(s => `<option value="${esc(s.id)}" ${s.id === dang.id ? 'selected' : ''}>${
              esc(s.name)}${s.className ? ` · ${esc(s.className)}` : ''}</option>`).join('')}
          </select>
        </div>
      </div>`;
  }

  function toast(msg, type = '') {
    let zone = document.getElementById('toast-zone');
    if (!zone) { zone = document.createElement('div'); zone.id = 'toast-zone'; document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    zone.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 2600);
  }

  // Mở modal dạng bottom-sheet. Trả về phần tử overlay; đóng bằng UI.closeModal().
  function modal(innerHtml, title = '') {
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'modal-overlay';
    ov.innerHTML = `<div class="modal">
      ${title ? `<div class="modal-title">${esc(title)}<button class="close-x" onclick="UI.closeModal()">${icon('x', 20)}</button></div>` : ''}
      <div class="modal-body">${innerHtml}</div>
    </div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    return ov;
  }
  function closeModal() {
    const ov = document.getElementById('modal-overlay');
    if (ov) ov.remove();
  }

  const ATT_STATUS = {
    present: { label: 'Có mặt', cls: 'green', color: '#27ae60' },
    late: { label: 'Đến muộn', cls: 'orange', color: '#f2994a' },
    absent_excused: { label: 'Nghỉ có phép', cls: 'blue', color: '#2f80ed' },
    absent_unexcused: { label: 'Nghỉ không phép', cls: 'red', color: '#e74c3c' },
  };
  const RATING = {
    great: { label: 'Con làm rất tốt', cls: 'green', emoji: '🌟' },
    good: { label: 'Con làm tốt', cls: 'blue', emoji: '👍' },
    needs_effort: { label: 'Cần cố gắng thêm', cls: 'orange', emoji: '💪' },
  };
  function badge(label, cls) { return `<span class="badge ${cls}">${esc(label)}</span>`; }

  return {
    esc, icon, fmtDate, fmtDateShort, fmtTime, timeAgo, todayStr, parseDate,
    pageHeader, avatar, emptyState, studentBar, thanhChonBe, toast, modal, closeModal,
    badge, ATT_STATUS, RATING, DOW,
  };
})();
