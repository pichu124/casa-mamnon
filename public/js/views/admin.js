// Trang quản trị dành cho ban giám hiệu: quản lý lớp, giáo viên, học sinh
// và nhập danh sách đầu năm từ tệp Excel/CSV.

App.views.admin = {
  // Dấu hiệu tệp CSV lưu sai bảng mã: ký tự thay thế U+FFFD (chữ có dấu đã hỏng)
  // hoặc byte 0 (tệp UTF-16 bị đọc như UTF-8).
  //
  // BẮT BUỘC viết bằng \u…, không gõ thẳng ký tự vào lớp ký tự: byte 0 không tồn
  // tại được trong tệp mã nguồn nên nó lặng lẽ thành dấu cách, và lúc đó MỌI tệp
  // có dấu cách — tức mọi tệp thật — đều bị chặn. Đã xảy ra đúng một lần.
  //
  // KHÔNG đặt cờ /g: cùng một biểu thức dùng cho nhiều lần .test() sẽ nhớ vị trí
  // lần trước rồi trả kết quả đúng/sai xen kẽ.
  _hongBangMa: /[\uFFFD\u0000]/,
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
        ${[['tongquan', 'Tổng quan'], ['nhaplieu', 'Nhập danh sách'], ['giaovien', 'Giáo viên'], ['tinhnang', 'Tính năng'], ['namhoc', 'Năm học'], ['nhatky', 'Nhật ký']]
          .map(([k, t]) => `<button class="${this._tab === k ? 'active' : ''}" onclick="App.views.admin.go('${k}')">${t}</button>`).join('')}
      </div>
      <div id="admin-body"><div class="loading">Đang tải</div></div>`;

    const body = document.getElementById('admin-body');
    try {
      if (this._tab === 'nhaplieu') return this.tabNhapLieu(body);
      if (this._tab === 'giaovien') return this.tabGiaoVien(body);
      if (this._tab === 'tinhnang') return this.tabTinhNang(body);
      if (this._tab === 'namhoc') return this.tabNamHoc(body);
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
    this._lop = d.classes;
    const chuaCoGv = d.classes.filter(c => !c.teacherId).length;
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

      ${chuaCoGv ? `
        <div class="card" style="border-left:4px solid var(--danger)">
          <b>${chuaCoGv} lớp chưa có giáo viên chủ nhiệm.</b>
          <div class="muted small mt-8">
            Cô chưa được phân công sẽ đăng nhập vào và thấy "Lớp chưa có học sinh nào" —
            không điểm danh, không nhận xét, không nhắn tin với phụ huynh được.
            Bấm <b>Sửa</b> ở dòng lớp được tô đỏ bên dưới để phân công.
          </div>
        </div>` : ''}

      <div class="card">
        <div class="card-title">Danh sách lớp<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themLop()">+ Thêm lớp</button>
        </div>
        ${d.classes.length ? d.classes.map(c => `
          <div class="list-row"${c.teacherId ? '' : ' style="background:var(--danger-tint)"'}>
            <div class="row-main">
              <div class="row-title">${UI.esc(c.name)}${c.teacherId ? '' : ` ${UI.badge('Chưa có chủ nhiệm', 'red')}`}</div>
              <div class="row-sub">${UI.esc(c.teacherNames || 'chưa phân công giáo viên')} · ${c.studentCount} học sinh${c.room ? ' · ' + UI.esc(c.room) : ''}</div>
            </div>
            <div class="row-end" style="display:flex;gap:8px">
              <button class="btn sm outline" onclick="App.views.admin.suaLop('${UI.esc(c.id)}')">Sửa</button>
              <button class="btn sm outline" onclick="App.views.admin.xemLop('${UI.esc(c.id)}')">Xem</button>
            </div>
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

  // Sửa thông tin lớp và phân công giáo viên chủ nhiệm.
  //
  // Đây là màn hình mà nút "Đi phân công giáo viên chủ nhiệm" sau khi chuyển năm
  // học vẫn luôn chỉ tới — trước đây nó dẫn về một danh sách chỉ để đọc, nên cả
  // trường không có cách nào phân công lại chủ nhiệm ngoài việc sửa tay dữ liệu.
  //
  // CỐ Ý KHÔNG cho sửa năm học: routes/schoolyear.js dùng cặp (tên lớp, năm học)
  // để nhận ra lớp của năm mới đã tồn tại chưa. Sửa tay năm học ở đây sẽ làm lần
  // chuyển năm sau tạo lớp trùng tên.
  async suaLop(classId) {
    const [d, teachers] = await Promise.all([
      API.get('/api/admin/overview'),
      API.get('/api/admin/teachers'),
    ]);
    const c = (d.classes || []).find(x => x.id === classId);
    if (!c) return UI.toast('Không tìm thấy lớp này', 'error');

    // Giữ chủ nhiệm hiện tại trong danh sách kể cả khi cô đã ngừng hoạt động,
    // nếu không bấm Lưu sẽ vô tình gỡ mất chủ nhiệm mà không ai chủ ý.
    const ds = (!c.teacherId || teachers.some(t => t.id === c.teacherId))
      ? teachers
      : [{ id: c.teacherId, title: '', name: c.teacherName || '(giáo viên đã ngừng hoạt động)' }, ...teachers];
    // Các cô đang phụ trách nhóm này, để tích sẵn ô của họ.
    const dangPhuTrach = new Set((c.teachers || []).map(t => t.id));

    UI.modal(`
      <div class="field"><label>Tên lớp</label><input id="ad-sl-ten" value="${UI.esc(c.name)}"></div>
      <div class="field"><label>Phòng học</label><input id="ad-sl-phong" value="${UI.esc(c.room || '')}" placeholder="Ví dụ: Phòng 203"></div>
      <div class="field"><label>Khối</label><input id="ad-sl-khoi" type="number" min="1" max="12" value="${UI.esc(c.grade ?? '')}"></div>
      <div class="field"><label>Giáo viên chủ nhiệm</label>
        <select id="ad-sl-gv">
          <option value="">— Chưa phân công —</option>
          ${ds.map(t => `<option value="${UI.esc(t.id)}" ${t.id === c.teacherId ? 'selected' : ''}>${UI.esc(`${t.title} ${t.name}`.trim())}</option>`).join('')}
        </select>
        <div class="muted small mt-8">Đổi chủ nhiệm sẽ thu quyền xem hồ sơ lớp này của cô cũ ngay lập tức.</div>
      </div>
      <div class="field"><label>Các cô cùng phụ trách nhóm này</label>
        <div id="ad-sl-cac-co" class="card" style="max-height:220px;overflow:auto;padding:8px">
          ${ds.map(t => `
            <label class="list-row" style="cursor:pointer;padding:6px 4px">
              <input type="checkbox" class="ad-sl-co" value="${UI.esc(t.id)}" ${dangPhuTrach.has(t.id) ? 'checked' : ''}>
              <div class="row-main"><div class="row-title">${UI.esc(`${t.title} ${t.name}`.trim())}</div></div>
            </label>`).join('')}
        </div>
        <div class="muted small mt-8">
          Nhóm mầm non thường có 2–3 cô cùng phụ trách. Cô được tích ở đây sẽ xem
          được hồ sơ các bé của nhóm; cô chọn ở ô trên là cô phụ trách chính.
          Một cô có thể phụ trách nhiều nhóm — tích thêm ở nhóm khác KHÔNG gỡ cô
          khỏi nhóm này.
        </div>
      </div>
      <button class="btn primary block" id="ad-sl-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, `Sửa ${c.name}`);

    // Ô "Giáo viên chủ nhiệm" và danh sách cô phải nói cùng một chuyện, nếu
    // không quản trị gỡ chủ nhiệm mà nhóm vẫn còn cô, rồi không hiểu vì sao thẻ
    // nhắc việc không tắt. Chọn "— Chưa phân công —" nghĩa là nhóm này chưa có
    // ai phụ trách; chọn một cô thì tích sẵn ô của cô ấy.
    const oChinh = document.getElementById('ad-sl-gv');
    oChinh.onchange = () => {
      const cac = [...document.querySelectorAll('.ad-sl-co')];
      if (!oChinh.value) { cac.forEach(o => { o.checked = false; }); return; }
      const o = cac.find(x => x.value === oChinh.value);
      if (o) o.checked = true;
    };

    document.getElementById('ad-sl-luu').onclick = async () => {
      const name = document.getElementById('ad-sl-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên lớp', 'error');
      const chinhId = document.getElementById('ad-sl-gv').value || null;
      const teacherIds = [...document.querySelectorAll('.ad-sl-co:checked')].map(o => o.value);
      // Cô phụ trách chính luôn nằm trong danh sách cô của nhóm, kể cả khi quản
      // trị quên tích ô của cô ấy.
      if (chinhId && !teacherIds.includes(chinhId)) teacherIds.unshift(chinhId);
      try {
        await API.put(`/api/admin/classes/${encodeURIComponent(classId)}`, {
          name,
          room: document.getElementById('ad-sl-phong').value.trim(),
          grade: document.getElementById('ad-sl-khoi').value,
        });
        // Ghi danh sách cô ở bước riêng: đường trên là đường CŨ "một cô một lớp",
        // gửi `teacherId` qua đó sẽ gỡ cô khỏi các nhóm khác của cô.
        await API.put(`/api/admin/classes/${encodeURIComponent(classId)}/teachers`, {
          teacherIds, chinhId,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Tên lớp KHÔNG được truyền qua thuộc tính onclick nữa mà tra lại từ đây —
  // cùng lý do như App.views.accounts.reset: trình duyệt giải mã thực thể HTML
  // trước khi JS phân tích, nên dấu nháy trong tên lớp thoát ra khỏi chuỗi và
  // chạy được mã. Giữ chữ ký hai tham số để bản giao diện cũ trong bộ nhớ đệm
  // của điện thoại đã cài app vẫn gọi được.
  async xemLop(classId, tenLop) {
    if (!tenLop) {
      const c = (this._lop || []).find(x => x.id === classId);
      tenLop = c ? c.name : 'Lớp';
    }
    // Nhớ lại để các nút bên trong modal mở lại đúng lớp này sau khi lưu.
    this._lopDangXem = { classId, tenLop };
    // Lấy cả em đã nghỉ: quản trị bấm nhầm "Cho nghỉ học" thì phải thấy em ở đâu
    // mà nhận lại, chứ không phải mở cơ sở dữ liệu ra sửa tay.
    const students = await API.get(`/api/admin/students?classId=${encodeURIComponent(classId)}&keCaNghi=1`);
    const dangHoc = students.filter(s => s.active !== false && s.active !== 0);
    const daNghi = students.filter(s => !(s.active !== false && s.active !== 0));

    // Chỉ mã học sinh (do hệ thống sinh) mới được đặt vào tham số của onclick.
    // Họ tên do người nhập gõ nên không bao giờ đi qua đường này — xem ghi chú ở
    // App.views.accounts.reset.
    const dong = (s, daNghiHoc) => `
      <div class="list-row"${daNghiHoc ? ' style="opacity:.65"' : ''}>
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}${daNghiHoc ? ` ${UI.badge('Đã nghỉ', 'gray')}` : ''}</div>
          <div class="row-sub">${UI.esc(s.code || 'chưa có mã')} · PH: ${UI.esc(s.parents.map(p => p.name).join(', ') || 'chưa có')}</div>
        </div>
        <div class="row-end" style="display:flex;gap:6px">
          ${daNghiHoc
            ? `<button class="btn sm outline" onclick="App.views.admin.nhanLaiHocSinh('${UI.esc(s.id)}')">Nhận lại</button>`
            : `<button class="btn sm outline" onclick="App.views.admin.suaHocSinh('${UI.esc(s.id)}')">Sửa</button>
               <button class="btn sm outline" onclick="App.views.admin.choNghiHoc('${UI.esc(s.id)}')">Cho nghỉ</button>`}
        </div>
      </div>`;

    const phanDaNghi = daNghi.length ? `
      <div class="muted small mt-14 mb-8">${daNghi.length} em đã nghỉ học — dữ liệu vẫn giữ nguyên, tra cứu được</div>
      ${daNghi.map(s => dong(s, true)).join('')}` : '';

    UI.modal(
      dangHoc.length || daNghi.length
        ? `<div class="muted small mb-8">${dangHoc.length} học sinh đang học</div>
           ${dangHoc.map(s => dong(s, false)).join('')}${phanDaNghi}`
        : UI.emptyState('🎒', 'Lớp chưa có học sinh'),
      tenLop);
  },

  // UI.modal đóng modal đang mở trước khi mở cái mới, nên sau khi sửa xong phải
  // vẽ lại danh sách lớp bằng tay thì quản trị mới thấy kết quả ngay.
  async lamMoiLop() {
    const l = this._lopDangXem;
    if (!l) return UI.closeModal();
    await this.xemLop(l.classId, l.tenLop);
  },

  async suaHocSinh(studentId) {
    const l = this._lopDangXem || {};
    const [students, d] = await Promise.all([
      API.get(`/api/admin/students?classId=${encodeURIComponent(l.classId || '')}&keCaNghi=1`),
      API.get('/api/admin/overview'),
    ]);
    const s = students.find(x => x.id === studentId);
    if (!s) return UI.toast('Không tìm thấy học sinh này', 'error');
    const lop = d.classes || [];

    UI.modal(`
      <div class="field"><label>Họ và tên</label><input id="ad-hs-ten" value="${UI.esc(s.name)}"></div>
      <div class="field"><label>Mã học sinh</label><input id="ad-hs-ma" value="${UI.esc(s.code || '')}" placeholder="Để trống nếu trường không dùng mã">
        <div class="hint">Mỗi em một mã riêng. Trùng mã sẽ báo lỗi khi lưu.</div>
      </div>
      <div class="field"><label>Ngày sinh</label><input id="ad-hs-ns" type="date" value="${UI.esc(s.dob || '')}"></div>
      <div class="field"><label>Giới tính</label>
        <select id="ad-hs-gt">
          <option value="">— Chưa ghi —</option>
          <option value="Nam" ${s.gender === 'Nam' ? 'selected' : ''}>Nam</option>
          <option value="Nữ" ${s.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
        </select>
      </div>
      <div class="field"><label>Địa chỉ</label><input id="ad-hs-dc" value="${UI.esc(s.address || '')}"></div>
      <div class="field"><label>Lớp</label>
        <select id="ad-hs-lop">
          <option value="">— Chưa xếp lớp —</option>
          ${lop.map(c => `<option value="${UI.esc(c.id)}" ${c.id === s.classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
        </select>
        <div class="hint">Chuyển lớp sẽ đổi luôn giáo viên chủ nhiệm được xem hồ sơ của em.</div>
      </div>
      <button class="btn primary block" id="ad-hs-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, `Sửa hồ sơ ${s.name}`);

    document.getElementById('ad-hs-luu').onclick = async () => {
      const name = document.getElementById('ad-hs-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập họ tên học sinh', 'error');
      try {
        await API.put(`/api/admin/students/${encodeURIComponent(studentId)}`, {
          name,
          code: document.getElementById('ad-hs-ma').value.trim(),
          dob: document.getElementById('ad-hs-ns').value,
          gender: document.getElementById('ad-hs-gt').value,
          address: document.getElementById('ad-hs-dc').value.trim(),
          classId: document.getElementById('ad-hs-lop').value || null,
        });
        UI.toast('Đã lưu hồ sơ học sinh', 'success');
        App.route();
        await this.lamMoiLop();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // "Cho nghỉ học" chỉ đánh dấu ngừng theo học. Không xóa gì cả: điểm danh, sổ
  // liên lạc, học bạ, hồ sơ sức khỏe của em vẫn còn để tra cứu và bàn giao.
  choNghiHoc(studentId) {
    UI.modal(`
      <p style="line-height:1.6">Đánh dấu em này <b>đã nghỉ học</b>?</p>
      <p class="muted small" style="line-height:1.6">
        Em sẽ không còn trong danh sách điểm danh và phụ huynh không nhận thông báo
        của lớp nữa. <b>Toàn bộ dữ liệu cũ vẫn được giữ nguyên</b> — điểm danh, sổ
        liên lạc, học bạ, hồ sơ sức khỏe đều tra cứu được. Nhận lại bất cứ lúc nào
        bằng nút "Nhận lại" ngay dưới danh sách lớp.
      </p>
      <button class="btn primary block mt-14" id="ad-nghi-ok">Xác nhận cho nghỉ học</button>
      <button class="btn outline block mt-8" onclick="App.views.admin.lamMoiLop()">Quay lại</button>
    `, 'Xác nhận');

    document.getElementById('ad-nghi-ok').onclick = async () => {
      try {
        await API.del(`/api/admin/students/${encodeURIComponent(studentId)}`);
        UI.toast('Đã đánh dấu nghỉ học', 'success');
        App.route();
        await this.lamMoiLop();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async nhanLaiHocSinh(studentId) {
    try {
      await API.put(`/api/admin/students/${encodeURIComponent(studentId)}`, { active: true });
      UI.toast('Đã nhận lại học sinh', 'success');
      App.route();
      await this.lamMoiLop();
    } catch (err) { UI.toast(err.message, 'error'); }
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
      reader.onload = () => {
        const text = String(reader.result);
        // Chặn ngay tại chỗ để văn thư biết mà sửa tệp, khỏi phải chờ gửi lên
        // máy chủ. Máy chủ vẫn chặn lần nữa — đây chỉ là báo sớm cho tiện.
        if (this._hongBangMa.test(text)) { this._csv = null; this.baoLoiPhongChu(f.name, text); return; }
        this._csv = text;
        this.xemTruoc();
      };
      reader.readAsText(f, 'utf-8');
      input.value = '';   // để chọn lại đúng tệp đó sau khi sửa vẫn kích hoạt onchange
    };
  },

  // Tệp lưu sai bảng mã: nói rõ hỏng ở đâu và chỉ từng bước cách sửa trong Excel.
  // Cố ý KHÔNG cho nhập tiếp: nhập vào thì tên học sinh và tên phụ huynh sai
  // hàng loạt, mà app chưa có màn hình nào sửa lại được hàng loạt.
  baoLoiPhongChu(tenTep, text) {
    const dong = String(text).split(/\r?\n/);
    const i = dong.findIndex(d => this._hongBangMa.test(d));
    const viDu = (dong[i] || '').replace(/\u0000/g, '').slice(0, 60);
    document.getElementById('ad-preview').innerHTML = `
      <div class="card mt-14" style="border-left:4px solid var(--danger)">
        <div class="card-title">Tệp bị lỗi phông chữ tiếng Việt</div>
        <p class="small">Tệp <b>${UI.esc(tenTep)}</b> đang lưu theo kiểu chữ cũ nên tên có dấu
        đã biến thành ký tự lạ. Ở dòng ${i + 1} hệ thống đọc được:</p>
        <p class="small"><code>${UI.esc(viDu)}</code></p>
        <p class="small">Nhập tệp này vào thì tên học sinh và tên phụ huynh sẽ sai, và không
        sửa lại hàng loạt được. Xin sửa tệp trước, chỉ mất khoảng một phút:</p>
        <ol class="small" style="line-height:1.7;padding-left:18px">
          <li>Mở tệp bằng Excel.</li>
          <li>Chọn <b>Tệp</b> (File) → <b>Lưu dưới dạng</b> (Save As).</li>
          <li>Ở ô chọn kiểu tệp, chọn dòng <b>CSV UTF-8 (Comma delimited) (*.csv)</b> —
              nhớ chọn đúng dòng <b>có chữ UTF-8</b>.</li>
          <li>Lưu lại, rồi bấm <b>Chọn tệp từ máy</b> và tải lên lần nữa.</li>
        </ol>
        <p class="small muted">Nếu máy không có dòng "CSV UTF-8", bấm <b>Tải tệp mẫu CSV</b>
        ở trên, chép danh sách vào tệp mẫu đó rồi lưu lại.</p>
      </div>`;
  },

  async xemTruoc() {
    const zone = document.getElementById('ad-preview');
    zone.innerHTML = '<div class="loading">Đang kiểm tra</div>';
    try {
      const r = await API.post('/api/admin/import/preview', { csv: this._csv });
      const loi = r.rows.filter(x => x.loi.length);
      // Máy chủ cũ chưa có trường `trung` — mặc định 0 để bản giao diện mới vẫn
      // chạy đúng nếu người dùng mở app trước khi máy chủ kịp cập nhật.
      const soTrung = r.trung || 0;
      const dsTrung = r.rows.filter(x => x.trung);
      const soNhap = r.total - r.loi - soTrung;
      this._nhapCaTrung = false;
      zone.innerHTML = `
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.total}</div><div class="stat-label">Dòng đọc được</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${soNhap}</div><div class="stat-label">Sẽ nhập</div></div>
          <div class="stat-box"><div class="stat-num" style="color:${r.loi ? 'var(--danger)' : 'var(--muted)'}">${r.loi}</div><div class="stat-label">Có lỗi</div></div>
          <div class="stat-box"><div class="stat-num" style="color:${soTrung ? 'var(--warning)' : 'var(--muted)'}">${soTrung}</div><div class="stat-label">Đã có</div></div>
        </div>
        ${r.lopMoi.length ? `<div class="card" style="border-left:4px solid var(--info)">
          Sẽ tạo mới ${r.lopMoi.length} lớp: <b>${UI.esc(r.lopMoi.join(', '))}</b></div>` : ''}
        ${soTrung ? `
          <div class="card" style="border-left:4px solid var(--warning)">
            <div class="card-title">${soTrung} em đã có trong hệ thống — sẽ được bỏ qua</div>
            <div class="muted small" style="line-height:1.6">
              Nhận ra theo họ tên, ngày sinh và lớp. Nhập lại sẽ tạo ra hai hồ sơ
              cho cùng một em, kèm hai tài khoản phụ huynh khác nhau.
            </div>
            ${dsTrung.slice(0, 15).map(x => `<div class="small mt-8">
              <b>Dòng ${x.line}</b> ${UI.esc(x.hoTen)} — ${UI.esc(x.trung)}</div>`).join('')}
            ${dsTrung.length > 15 ? `<div class="muted small mt-8">…và ${dsTrung.length - 15} em khác</div>` : ''}
            <label class="mt-14" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
              <input type="checkbox" id="ad-trung-ok" style="margin-top:3px">
              <span class="small">Trường tôi có những em trùng cả họ tên, ngày sinh lẫn lớp —
                cứ nhập cả ${soTrung} em này.</span>
            </label>
          </div>` : ''}
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
            <tbody>${r.rows.filter(x => !x.loi.length && !x.trung).slice(0, 20).map(x => `
              <tr><td>${UI.esc(x.hoTen)}</td><td>${UI.esc(x.tenLop)}</td>
                  <td>${UI.esc(x.phHoTen)}</td><td>${UI.esc(x.username)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        ${soNhap > 20 ? `<div class="muted small center mt-8">Hiển thị 20 dòng đầu trong ${soNhap} dòng sẽ nhập</div>` : ''}
        <button class="btn primary block mt-14" id="ad-commit" ${soNhap ? '' : 'disabled'}>
          Nhập ${soNhap} học sinh vào hệ thống
        </button>`;

      const btn = document.getElementById('ad-commit');
      const oTrung = document.getElementById('ad-trung-ok');
      const veLaiNut = () => {
        this._nhapCaTrung = !!(oTrung && oTrung.checked);
        const n = this._nhapCaTrung ? soNhap + soTrung : soNhap;
        btn.disabled = !n;
        btn.textContent = `Nhập ${n} học sinh vào hệ thống`;
      };
      if (oTrung) oTrung.onchange = veLaiNut;
      if (btn) btn.onclick = () => this.nhapThat(this._nhapCaTrung ? soNhap + soTrung : soNhap);
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
      const r = await API.post('/api/admin/import/commit', {
        csv: this._csv,
        nhapCaTrung: this._nhapCaTrung === true,
      });
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
      <p>Đã nhập <b>${r.imported}</b> học sinh${r.boQua ? `, bỏ qua ${r.boQua} dòng` : ''}${r.boQuaTrung ? ` (trong đó ${r.boQuaTrung} em đã có sẵn trong hệ thống)` : ''}.</p>
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

  // ---------- Bật/tắt tính năng ----------
  async tabTinhNang(body) {
    const list = await API.get('/api/admin/modules');
    const loi = list.filter(m => m.loi);
    const khoi = (title, items) => items.length ? `
      <div class="card">
        <div class="card-title">${title}</div>
        ${items.map(m => `
          <div class="list-row">
            <span class="row-icon" style="background:${UI.esc(m.bg || 'var(--bg-2)')};font-size:19px">
              ${m.emoji ? UI.esc(m.emoji) : UI.icon(m.icon || 'info', 20)}
            </span>
            <div class="row-main">
              <div class="row-title">${UI.esc(m.name)}
                ${m.moRong ? UI.badge('Cắm thêm', 'purple') : ''}
                ${m.required ? UI.badge('Phần lõi', 'gray') : ''}</div>
              <div class="row-sub">${UI.esc(m.desc || '')}</div>
              ${m.loi ? `<div class="row-sub" style="color:var(--danger)">Lỗi: ${UI.esc(m.loi)}</div>` : ''}
            </div>
            ${m.required
              ? '<span class="muted small">Luôn bật</span>'
              : `<button class="btn sm ${m.enabled ? 'success-soft' : 'outline'}"
                   onclick="App.views.admin.doiTinhNang('${UI.esc(m.key)}', ${!m.enabled})">
                   ${m.enabled ? 'Đang bật' : 'Đang tắt'}
                 </button>`}
          </div>`).join('')}
      </div>` : '';

    body.innerHTML = `
      <div class="card">
        <p class="muted small" style="line-height:1.6">
          Tắt một tính năng là ẩn nó khỏi màn hình chính của <b>mọi người dùng</b> và
          chặn luôn đường vào dữ liệu của tính năng đó. Dữ liệu đã có vẫn được giữ
          nguyên, bật lại là dùng tiếp bình thường.
        </p>
      </div>
      ${loi.length ? `<div class="card" style="border-left:4px solid var(--danger)">
        <b>${loi.length} tính năng cắm thêm đang lỗi</b> và bị tạm ngưng.
        Các tính năng còn lại vẫn chạy bình thường.</div>` : ''}
      ${khoi('Trên màn hình chính', list.filter(m => !m.nav && !m.moRong))}
      ${khoi('Trên thanh điều hướng', list.filter(m => m.nav && !m.moRong))}
      ${khoi('Tính năng cắm thêm', list.filter(m => m.moRong))}`;
  },

  async doiTinhNang(key, bat) {
    try {
      const r = await API.put(`/api/admin/modules/${key}`, { enabled: bat });
      UI.toast(r.message, 'success');
      await App.loadModules();      // cập nhật ngay cho chính người quản trị
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---------- Chuyển năm học ----------
  async tabNamHoc(body) {
    const d = await API.get('/api/schoolyear/preview');
    body.innerHTML = `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title">⚠️ Việc này ảnh hưởng toàn trường</div>
        <p class="muted small" style="line-height:1.6">
          Chuyển năm học sẽ đưa toàn bộ học sinh lên lớp kế tiếp, cho khối cuối cấp
          ra trường và đóng các lớp của năm cũ. Chỉ làm khi đã kết thúc năm học.
          <b>Hãy sao lưu dữ liệu trước</b> bằng lệnh <code>npm run backup</code>.
        </p>
      </div>

      <div class="card">
        <div class="card-title">Chuyển từ ${UI.esc(d.namHienTai || 'chưa đặt')} sang ${UI.esc(d.namMoi)}</div>
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${d.tongLenLop}</div><div class="stat-label">Học sinh lên lớp</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${d.tongRaTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${d.buoc.filter(b => b.taoLopMoi).length}</div><div class="stat-label">Lớp tạo mới</div></div>
        </div>
        <div class="table-wrap">
          <table class="simple">
            <thead><tr><th>Lớp hiện tại</th><th>Sĩ số</th><th>Chuyển thành</th></tr></thead>
            <tbody>${d.buoc.map(b => `
              <tr>
                <td>${UI.esc(b.tenHienTai)}</td>
                <td>${b.siSo}</td>
                <td>${b.raTruong
                  ? '<span style="color:var(--warning);font-weight:600">Ra trường</span>'
                  : UI.esc(b.tenLopMoi) + (b.taoLopMoi ? ' <span class="muted small">(tạo mới)</span>' : '')}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="field mt-14">
          <label>Khối cuối cấp (học sinh khối này sẽ ra trường)</label>
          <input type="number" id="ny-khoi" value="${d.khoiToiDa}" min="1" max="12">
        </div>
        <button class="btn danger-soft block" onclick="App.views.admin.chuyenNamHoc('${UI.esc(d.namMoi)}')">
          Chuyển sang năm học ${UI.esc(d.namMoi)}
        </button>
      </div>`;
  },

  async chuyenNamHoc(namMoi) {
    const khoiToiDa = Number(document.getElementById('ny-khoi').value) || 5;
    if (!confirm(`Chuyển toàn trường sang năm học ${namMoi}?\n\nHọc sinh khối ${khoiToiDa} sẽ ra trường. Việc này không tự hoàn tác được — hãy chắc chắn đã sao lưu dữ liệu.`)) return;
    if (!confirm('Xác nhận lần nữa: bạn đã chạy "npm run backup" chưa?')) return;
    try {
      const r = await API.post('/api/schoolyear/promote', { namMoi, khoiToiDa });
      UI.modal(`
        <p>${UI.esc(r.message)}</p>
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.lenLop}</div><div class="stat-label">Lên lớp</div></div>
          <div class="stat-box"><div class="stat-num">${r.raTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${r.lopTao}</div><div class="stat-label">Lớp mới</div></div>
        </div>
        <button class="btn primary block mt-14" onclick="UI.closeModal();App.views.admin.go('tongquan')">
          Đi phân công giáo viên chủ nhiệm
        </button>`, `Đã chuyển sang ${namMoi}`);
    } catch (err) { UI.toast(err.message, 'error'); }
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
      'admin-create': 'Tạo tài khoản quản trị', 'schoolyear-promote': 'Chuyển năm học',
      'module-enable': 'Bật tính năng', 'module-disable': 'Tắt tính năng',
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
