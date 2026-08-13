// Trang quản trị dành cho ban giám hiệu: quản lý lớp, giáo viên, học sinh
// và nhập danh sách đầu năm từ tệp Excel/CSV.
App.views.admin = {
  _tab: 'tongquan',
  _csv: null,

  async render(root, params) {
    if (App.state.user.role !== 'admin') {
      root.innerHTML = UI.pageHeader('Quản trị') + UI.emptyState('🔒', 'Chỉ tài khoản quản trị mới vào được mục này');
      return;
    }
    if (params && params[0]) this._tab = params[0];

    root.innerHTML = `
      ${UI.pageHeader('Quản trị nhà trường')}
      <div class="seg">
        ${[['tongquan', 'Tổng quan'], ['nhaplieu', 'Nhập danh sách'], ['giaovien', 'Giáo viên'], ['nhatky', 'Nhật ký']]
          .map(([k, t]) => `<button class="${this._tab === k ? 'active' : ''}" onclick="App.views.admin.go('${k}')">${t}</button>`).join('')}
      </div>
      <div id="admin-body"><div class="loading">Đang tải</div></div>`;

    const body = document.getElementById('admin-body');
    try {
      if (this._tab === 'nhaplieu') return this.tabNhapLieu(body);
      if (this._tab === 'giaovien') return this.tabGiaoVien(body);
      if (this._tab === 'nhatky') return this.tabNhatKy(body);
      return this.tabTongQuan(body);
    } catch (err) {
      body.innerHTML = UI.emptyState('😥', err.message);
    }
  },

  go(tab) { this._tab = tab; App.route(); },

  // ---------- Tổng quan ----------
  async tabTongQuan(body) {
    const d = await API.get('/api/admin/overview');
    body.innerHTML = `
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${d.counts.students}</div><div class="stat-label">Học sinh</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.classes}</div><div class="stat-label">Lớp</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.teachers}</div><div class="stat-label">Giáo viên</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.parents}</div><div class="stat-label">Phụ huynh</div></div>
      </div>
      ${d.counts.mustChange ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <b>${d.counts.mustChange} tài khoản</b> đang dùng mật khẩu tạm và chưa đổi.
          <div class="muted small mt-8">Nhắc họ đăng nhập và đặt mật khẩu riêng để bảo vệ thông tin học sinh.</div>
        </div>` : ''}

      <div class="card">
        <div class="card-title">Danh sách lớp<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themLop()">+ Thêm lớp</button>
        </div>
        ${d.classes.length ? d.classes.map(c => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(c.name)}</div>
              <div class="row-sub">${UI.esc(c.teacherName || 'chưa phân công giáo viên')} · ${c.studentCount} học sinh${c.room ? ' · ' + UI.esc(c.room) : ''}</div>
            </div>
            <button class="btn sm outline" onclick="App.views.admin.xemLop('${UI.esc(c.id)}','${UI.esc(c.name)}')">Xem</button>
          </div>`).join('') : '<div class="muted small">Chưa có lớp nào. Bấm "Thêm lớp" hoặc nhập danh sách để tạo tự động.</div>'}
      </div>`;
  },

  async themLop() {
    const teachers = await API.get('/api/admin/teachers');
    UI.modal(`
      <div class="field"><label>Tên lớp</label><input id="ad-lop-ten" placeholder="Ví dụ: Lớp 3A"></div>
      <div class="field"><label>Phòng học</label><input id="ad-lop-phong" placeholder="Ví dụ: Phòng 203"></div>
      <div class="field"><label>Khối</label><input id="ad-lop-khoi" type="number" min="1" max="12" placeholder="3"></div>
      <div class="field"><label>Giáo viên chủ nhiệm</label>
        <select id="ad-lop-gv"><option value="">— Chưa phân công —</option>
          ${teachers.map(t => `<option value="${UI.esc(t.id)}">${UI.esc(t.title)} ${UI.esc(t.name)}</option>`).join('')}
        </select>
      </div>
      <button class="btn primary block" id="ad-lop-luu">Tạo lớp</button>
    `, 'Thêm lớp mới');
    document.getElementById('ad-lop-luu').onclick = async () => {
      const name = document.getElementById('ad-lop-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên lớp', 'error');
      try {
        await API.post('/api/admin/classes', {
          name,
          room: document.getElementById('ad-lop-phong').value.trim(),
          grade: document.getElementById('ad-lop-khoi').value,
          teacherId: document.getElementById('ad-lop-gv').value || null,
        });
        UI.toast('Đã tạo lớp', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async xemLop(classId, tenLop) {
    const students = await API.get(`/api/admin/students?classId=${encodeURIComponent(classId)}`);
    const danhSach = students.map(s => `
      <div class="list-row">
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}</div>
          <div class="row-sub">${UI.esc(s.code || '')} · PH: ${UI.esc(s.parents.map(p => p.name).join(', ') || 'chưa có')}</div>
        </div>
      </div>`).join('');
    UI.modal(
      students.length
        ? `<div class="muted small mb-8">${students.length} học sinh</div>${danhSach}`
        : UI.emptyState('🎒', 'Lớp chưa có học sinh'),
      tenLop);
  },

  // ---------- Nhập danh sách ----------
  async tabNhapLieu(body) {
    body.innerHTML = `
      <div class="card">
        <div class="card-title">📋 Nhập danh sách học sinh từ Excel</div>
        <p class="muted small" style="line-height:1.6">
          Xuất danh sách của trường ra tệp CSV rồi tải lên đây. Hệ thống tự tạo lớp,
          học sinh và tài khoản phụ huynh. Phụ huynh có nhiều con dùng chung một tài
          khoản nếu trùng số điện thoại.
        </p>
        <a class="btn outline block mt-14" href="/api/admin/import/template" download>⬇ Tải tệp mẫu CSV</a>
      </div>

      <div class="card">
        <div class="field">
          <label>Chọn tệp CSV</label>
          <input type="file" id="ad-file" accept=".csv,text/csv" style="display:none">
          <button class="btn outline block" id="ad-pick">📄 Chọn tệp từ máy</button>
          <div class="hint">Cột cần có: Họ tên, Lớp, Họ tên phụ huynh. Các cột khác không bắt buộc.</div>
        </div>
        <div id="ad-preview"></div>
      </div>`;

    const input = document.getElementById('ad-file');
    document.getElementById('ad-pick').onclick = () => input.click();
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { this._csv = String(reader.result); this.xemTruoc(); };
      reader.readAsText(f, 'utf-8');
    };
  },

  async xemTruoc() {
    const zone = document.getElementById('ad-preview');
    zone.innerHTML = '<div class="loading">Đang kiểm tra</div>';
    try {
      const r = await API.post('/api/admin/import/preview', { csv: this._csv });
      const loi = r.rows.filter(x => x.loi.length);
      zone.innerHTML = `
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.total}</div><div class="stat-label">Dòng đọc được</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${r.total - r.loi}</div><div class="stat-label">Hợp lệ</div></div>
          <div class="stat-box"><div class="stat-num" style="color:${r.loi ? 'var(--danger)' : 'var(--muted)'}">${r.loi}</div><div class="stat-label">Có lỗi</div></div>
        </div>
        ${r.lopMoi.length ? `<div class="card" style="border-left:4px solid var(--info)">
          Sẽ tạo mới ${r.lopMoi.length} lớp: <b>${UI.esc(r.lopMoi.join(', '))}</b></div>` : ''}
        ${loi.length ? `
          <div class="card" style="border-left:4px solid var(--danger)">
            <div class="card-title">Các dòng sẽ bị bỏ qua</div>
            ${loi.slice(0, 15).map(x => `<div class="small" style="margin-bottom:6px">
              <b>Dòng ${x.line}</b> ${UI.esc(x.hoTen || '(chưa có tên)')} — ${UI.esc(x.loi.join('; '))}</div>`).join('')}
            ${loi.length > 15 ? `<div class="muted small">…và ${loi.length - 15} dòng khác</div>` : ''}
          </div>` : ''}
        <div class="table-wrap mt-14">
          <table class="simple">
            <thead><tr><th>Học sinh</th><th>Lớp</th><th>Phụ huynh</th><th>Tên đăng nhập</th></tr></thead>
            <tbody>${r.rows.filter(x => !x.loi.length).slice(0, 20).map(x => `
              <tr><td>${UI.esc(x.hoTen)}</td><td>${UI.esc(x.tenLop)}</td>
                  <td>${UI.esc(x.phHoTen)}</td><td>${UI.esc(x.username)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        ${r.total - r.loi > 20 ? `<div class="muted small center mt-8">Hiển thị 20 dòng đầu trong ${r.total - r.loi} dòng hợp lệ</div>` : ''}
        <button class="btn primary block mt-14" id="ad-commit" ${r.total === r.loi ? 'disabled' : ''}>
          Nhập ${r.total - r.loi} học sinh vào hệ thống
        </button>`;

      const btn = document.getElementById('ad-commit');
      if (btn) btn.onclick = () => this.nhapThat(r.total - r.loi);
    } catch (err) {
      zone.innerHTML = `<div class="card" style="border-left:4px solid var(--danger)">${UI.esc(err.message)}</div>`;
    }
  },

  async nhapThat(soLuong) {
    if (!confirm(`Nhập ${soLuong} học sinh vào hệ thống?\n\nHệ thống sẽ tạo tài khoản phụ huynh kèm mật khẩu ban đầu.`)) return;
    const btn = document.getElementById('ad-commit');
    btn.disabled = true;
    btn.textContent = 'Đang nhập…';
    try {
      const r = await API.post('/api/admin/import/commit', { csv: this._csv });
      this.hienPhieu(r);
    } catch (err) {
      UI.toast(err.message, 'error');
      btn.disabled = false;
    }
  },

  // Danh sách tài khoản vừa tạo — nhà trường in ra phát cho phụ huynh.
  hienPhieu(r) {
    const rows = r.taiKhoan;
    UI.modal(`
      <p>Đã nhập <b>${r.imported}</b> học sinh${r.boQua ? `, bỏ qua ${r.boQua} dòng có lỗi` : ''}.</p>
      <p class="muted small">Danh sách tài khoản dưới đây <b>chỉ hiện một lần</b>. Hãy tải về và in
      phát cho phụ huynh. Mật khẩu sẽ được yêu cầu đổi khi đăng nhập lần đầu.</p>
      <button class="btn primary block mt-14" id="ad-tai">⬇ Tải danh sách tài khoản (CSV)</button>
      <div class="table-wrap mt-14" style="max-height:40vh;overflow-y:auto">
        <table class="simple">
          <thead><tr><th>Học sinh</th><th>Phụ huynh</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr></thead>
          <tbody>${rows.map(t => `<tr>
            <td>${UI.esc(t.hocSinh)}</td><td>${UI.esc(t.phuHuynh)}</td>
            <td><code>${UI.esc(t.username)}</code></td><td><code>${UI.esc(t.matKhau)}</code></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `, 'Tài khoản đã tạo');

    document.getElementById('ad-tai').onclick = () => {
      const head = ['Học sinh', 'Lớp', 'Phụ huynh', 'Tên đăng nhập', 'Mật khẩu'];
      const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      const noiDung = '﻿' + [head.join(',')]
        .concat(rows.map(t => [t.hocSinh, t.lop, t.phuHuynh, t.username, t.matKhau].map(esc).join(',')))
        .join('\r\n');
      const blob = new Blob([noiDung], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tai-khoan-phu-huynh.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  },

  // ---------- Giáo viên ----------
  async tabGiaoVien(body) {
    const list = await API.get('/api/admin/teachers');
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Giáo viên<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themGiaoVien()">+ Thêm</button>
        </div>
        ${list.length ? list.map(t => `
          <div class="list-row">
            ${UI.avatar(t.avatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(t.title)} ${UI.esc(t.name)}</div>
              <div class="row-sub">${UI.esc(t.className || 'chưa chủ nhiệm lớp nào')} · ${UI.esc(t.username)}</div>
            </div>
            ${t.mustChangePassword ? UI.badge('Chưa đổi mật khẩu', 'orange') : ''}
          </div>`).join('') : '<div class="muted small">Chưa có giáo viên nào.</div>'}
      </div>`;
  },

  async themGiaoVien() {
    const d = await API.get('/api/admin/overview');
    UI.modal(`
      <div class="field"><label>Họ tên</label><input id="ad-gv-ten" placeholder="Nguyễn Thị Mai Anh"></div>
      <div class="field"><label>Danh xưng</label>
        <select id="ad-gv-xung"><option value="Cô">Cô</option><option value="Thầy">Thầy</option></select></div>
      <div class="field"><label>Điện thoại</label><input id="ad-gv-sdt" placeholder="0903111222"></div>
      <div class="field"><label>Email</label><input id="ad-gv-email" type="email" placeholder="maianh@truong.edu.vn"></div>
      <div class="field"><label>Chủ nhiệm lớp</label>
        <select id="ad-gv-lop"><option value="">— Chưa phân công —</option>
          ${d.classes.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
        </select></div>
      <button class="btn primary block" id="ad-gv-luu">Tạo tài khoản</button>
    `, 'Thêm giáo viên');

    document.getElementById('ad-gv-luu').onclick = async () => {
      const name = document.getElementById('ad-gv-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập họ tên', 'error');
      try {
        const r = await API.post('/api/admin/teachers', {
          name,
          title: document.getElementById('ad-gv-xung').value,
          phone: document.getElementById('ad-gv-sdt').value.trim(),
          email: document.getElementById('ad-gv-email').value.trim(),
          classId: document.getElementById('ad-gv-lop').value || null,
        });
        UI.modal(`
          <p>Đã tạo tài khoản cho <b>${UI.esc(r.name)}</b>. Đọc thông tin sau cho giáo viên:</p>
          <div class="card" style="margin:14px 0;text-align:center;background:var(--primary-tint);border-color:var(--primary)">
            <div class="muted small">Tên đăng nhập</div>
            <div style="font-size:1.2rem;font-weight:800">${UI.esc(r.username)}</div>
            <div class="muted small mt-14">Mật khẩu ban đầu</div>
            <div style="font-size:1.5rem;font-weight:800;letter-spacing:.1em;font-family:ui-monospace,monospace">${UI.esc(r.temporaryPassword)}</div>
          </div>
          <p class="muted small">Mật khẩu chỉ hiện một lần. Giáo viên sẽ được yêu cầu đổi khi đăng nhập.</p>
          <button class="btn primary block mt-14" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
        `, 'Tài khoản giáo viên');
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---------- Nhật ký ----------
  async tabNhatKy(body) {
    const rows = await API.get('/api/admin/audit');
    const TEN = {
      login: 'Đăng nhập', 'change-password': 'Đổi mật khẩu', 'set-new-password': 'Đặt mật khẩu mới',
      'reset-password': 'Cấp lại mật khẩu', 'leave-review': 'Duyệt đơn xin phép',
      'notification-create': 'Tạo thông báo', 'album-delete': 'Xóa album',
      'import-students': 'Nhập danh sách học sinh', 'class-create': 'Tạo lớp',
      'class-update': 'Sửa lớp', 'teacher-create': 'Tạo tài khoản giáo viên',
      'student-update': 'Sửa hồ sơ học sinh', 'student-deactivate': 'Cho học sinh nghỉ học',
      'admin-create': 'Tạo tài khoản quản trị',
    };
    body.innerHTML = rows.length ? `
      <div class="card">
        <p class="muted small mb-8">200 thao tác gần nhất. Dùng để tra khi có khiếu nại về dữ liệu.</p>
        ${rows.map(r => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(TEN[r.action] || r.action)}</div>
              <div class="row-sub">${UI.esc(r.who)} · ${UI.fmtDate(r.at, { weekday: false })} ${UI.fmtTime(r.at)}</div>
            </div>
          </div>`).join('')}
      </div>` : UI.emptyState('📋', 'Chưa có thao tác nào được ghi lại');
  },
};
