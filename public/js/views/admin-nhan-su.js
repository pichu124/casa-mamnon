// Quản trị — mục Nhân sự của tab Thông tin bé & nhân sự: hồ sơ cô cơ bản,
// nhập cô từ tệp.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---- Nhân sự: hồ sơ cô cơ bản và nhập cô từ tệp (L2) ----
  //
  // Máy chủ quyết ai sửa được (`suaDuoc`): văn phòng cơ sở chỉ xem. Danh sách
  // không có CCCD và chỗ ở; hai ô ấy chỉ có trong phiếu của từng cô, và mở
  // phiếu là máy chủ ghi nhật ký. Phần nhập cô chỉ vẽ cho người tạo được cô
  // (`quyenTaiKhoan.taoCo`) — văn phòng không tạo cô.
  async mucNhanSu(o) {
    o.innerHTML = '<div id="ad-hsc"></div><div id="ad-nc"></div>';
    const [ds, ov] = await Promise.all([
      API.get('/api/admin/teachers/ho-so-co-ban').catch(e => ({ loi: e.message || 'Chưa mở được hồ sơ cô' })),
      API.get('/api/admin/overview').catch(() => ({})),
    ]);
    this.veHoSoCo(ds);
    if ((ov.quyenTaiKhoan || {}).taoCo) this.veNhapCo();
  },

  veHoSoCo(d) {
    const o = document.getElementById('ad-hsc');
    if (!o) return;
    if (d.loi) {
      o.innerHTML = `<div class="card"><div class="card-title">Hồ sơ cô</div>
        <div class="muted small">${UI.esc(d.loi)}</div></div>`;
      return;
    }
    const ds = d.danhSach || [];
    o.innerHTML = `
      <div class="card">
        <div class="card-title">Hồ sơ cô</div>
        <div class="muted small mb-8" style="line-height:1.6">
          Ngày sinh, CCCD, điện thoại, chỗ ở — cùng một hồ sơ với phân hệ Nhân sự.
          CCCD và chỗ ở chỉ hiện khi mở hồ sơ từng cô, và mỗi lần mở đều được ghi lại trong <b>Nhật ký</b>.
          ${d.suaDuoc ? '' : '<br>Tài khoản này xem được hồ sơ cô, không sửa được.'}
        </div>
        ${ds.length ? ds.map(c => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(c.hoTen)}</div>
              <div class="row-sub">${c.ngaySinh ? `Sinh ${UI.esc(UI.fmtDate(c.ngaySinh, { weekday: false }))}` : 'Chưa có ngày sinh'} · ${
  UI.esc(c.dienThoai || 'chưa có điện thoại')}</div>
            </div>
            <div class="row-end">
              <button class="btn sm outline" onclick="App.views.admin.moHoSoCo('${UI.esc(c.userId)}')">${d.suaDuoc ? 'Sửa' : 'Xem'}</button>
            </div>
          </div>`).join('') : '<div class="muted small">Chưa có cô nào trong phạm vi tài khoản này.</div>'}
      </div>`;
  },

  async moHoSoCo(userId) {
    const duong = `/api/admin/teachers/${encodeURIComponent(userId)}/ho-so-co-ban`;
    let h;
    try { h = await API.get(duong); } catch (e) { UI.toast(e.message, 'error'); return; }
    const o = (id, nhan, giaTri, hien, them) => `<div class="field"><label>${nhan}</label>${h.suaDuoc
      ? `<input id="${id}" value="${UI.esc(giaTri)}" ${them}>`
      : `<div>${giaTri ? UI.esc(hien) : '<span class="muted">Chưa có</span>'}</div>`}</div>`;
    UI.modal(`
      ${o('ad-hsc-ngay', 'Ngày sinh', h.ngaySinh, h.ngaySinh && UI.fmtDate(h.ngaySinh, { weekday: false }), 'type="date"')}
      ${o('ad-hsc-cccd', 'Số CCCD', h.cccd, h.cccd, 'inputmode="numeric" maxlength="12"')}
      ${o('ad-hsc-sdt', 'Điện thoại', h.dienThoai, h.dienThoai, 'maxlength="20"')}
      ${o('ad-hsc-cho', 'Chỗ ở', h.choO, h.choO, 'maxlength="200"')}
      ${h.suaDuoc
    ? '<button class="btn primary block" id="ad-hsc-luu">Lưu hồ sơ</button>'
    : '<div class="muted small">Sửa hồ sơ cô cần ban giám hiệu, Nhân sự hoặc quản lý cơ sở.</div>'}`, h.hoTen);
    const nut = document.getElementById('ad-hsc-luu');
    if (!nut) return;
    nut.onclick = async () => {
      const v = (id) => document.getElementById(id).value.trim();
      try {
        await API.put(duong, { ngaySinh: v('ad-hsc-ngay'), cccd: v('ad-hsc-cccd'), dienThoai: v('ad-hsc-sdt'), choO: v('ad-hsc-cho') });
        UI.toast('Đã lưu hồ sơ cô', 'success');
        UI.closeModal();
        App.route();
      } catch (e) { UI.toast(e.message, 'error'); }
    };
  },

  // Nhập cô từ tệp: cùng hai bước với nhập bé (xem trước rồi mới ghi). Khác ở
  // một điểm máy chủ đã chốt: còn một dòng lỗi là KHÔNG tạo tài khoản nào, nên
  // nút nhập khoá lại cho tới khi tệp sạch lỗi.
  _csvCo: null,
  _nhapCaTrungCo: false,

  veNhapCo() {
    const o = document.getElementById('ad-nc');
    if (!o) return;
    o.innerHTML = `
      <div class="card">
        <div class="card-title">📋 Nhập cô từ Excel</div>
        <p class="muted small" style="line-height:1.6">
          Mỗi dòng một cô. Hệ thống tạo tài khoản kèm mật khẩu tạm; cô đổi mật khẩu khi đăng nhập
          lần đầu. Cô trùng số điện thoại hoặc CCCD với một cô đang làm thì được bỏ qua.
        </p>
        <a class="btn outline block mt-14" href="/api/admin/teachers/nhap/mau" download>⬇ Tải tệp mẫu CSV</a>
        <div class="field mt-14">
          <input type="file" id="ad-nc-file" accept=".csv,text/csv" style="display:none">
          <button class="btn outline block" id="ad-nc-chon">📄 Chọn tệp từ máy</button>
          <div class="hint">Cột cần có: Họ tên. Không bắt buộc: Điện thoại, Email, Ngày sinh, CCCD, Cơ sở, Nhóm, Vai.</div>
        </div>
        <div id="ad-nc-xem"></div>
      </div>`;
    const input = document.getElementById('ad-nc-file');
    document.getElementById('ad-nc-chon').onclick = () => input.click();
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { this._csvCo = String(reader.result); this.xemTruocCo(); };
      reader.readAsText(f, 'utf-8');
      input.value = '';
    };
  },

  async xemTruocCo() {
    const zone = document.getElementById('ad-nc-xem');
    if (!zone) return;
    zone.innerHTML = '<div class="loading">Đang kiểm tra</div>';
    let r;
    try {
      r = await API.post('/api/admin/teachers/nhap/xem-truoc', { csv: this._csvCo });
    } catch (e) {
      zone.innerHTML = `<div class="card mt-14" style="border-left:4px solid var(--danger)">${UI.esc(e.message)}</div>`;
      return;
    }
    const loi = r.rows.filter(x => x.loi.length);
    const trung = r.rows.filter(x => !x.loi.length && x.trung);
    const moi = r.rows.filter(x => !x.loi.length && !x.trung);
    this._nhapCaTrungCo = false;
    const o = (so, nhan) => `<div class="stat-box"><div class="stat-num">${UI.esc(String(so))}</div><div class="stat-label">${nhan}</div></div>`;
    zone.innerHTML = `
      <div class="stat-row mt-14">
        ${o(r.total, 'Dòng đọc được')}${o(loi.length ? 0 : moi.length, 'Sẽ nhập')}${o(loi.length, 'Có lỗi')}${o(trung.length, 'Đã có')}
      </div>
      ${loi.length ? `
        <div class="card" style="border-left:4px solid var(--danger)">
          <div class="card-title">Tệp còn ${loi.length} dòng lỗi</div>
          <div class="muted small mb-8">Chưa tạo tài khoản nào. Xin sửa các dòng dưới đây trong tệp rồi tải lên lại.</div>
          ${loi.slice(0, 15).map(x => `<div class="small" style="margin-bottom:6px">
            <b>Dòng ${UI.esc(String(x.line))}</b> ${UI.esc(x.hoTen || '(chưa có tên)')} — ${UI.esc(x.loi.join('; '))}</div>`).join('')}
          ${loi.length > 15 ? `<div class="muted small">…và ${loi.length - 15} dòng khác</div>` : ''}
        </div>` : ''}
      ${trung.length ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="card-title">${trung.length} cô đã có tài khoản — sẽ được bỏ qua</div>
          ${trung.slice(0, 15).map(x => `<div class="small mt-8">
            <b>Dòng ${UI.esc(String(x.line))}</b> ${UI.esc(x.hoTen)} — ${UI.esc(x.trung)}</div>`).join('')}
          ${trung.length > 15 ? `<div class="muted small mt-8">…và ${trung.length - 15} cô khác</div>` : ''}
          <label class="mt-14" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
            <input type="checkbox" id="ad-nc-trung" style="margin-top:3px">
            <span class="small">Đây là những cô khác nhau — cứ nhập cả ${trung.length} cô này.</span>
          </label>
        </div>` : ''}
      <div class="table-wrap mt-14">
        <table class="simple">
          <thead><tr><th>Cô</th><th>Cơ sở</th><th>Nhóm</th><th>Tên đăng nhập</th></tr></thead>
          <tbody>${moi.slice(0, 20).map(x => `
            <tr><td>${UI.esc(x.hoTen)}</td><td>${UI.esc(x.tenCoSo || '—')}</td>
                <td>${UI.esc(x.tenNhom || '—')}</td><td>${UI.esc(x.username)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      ${moi.length > 20 ? `<div class="muted small center mt-8">Hiển thị 20 dòng đầu trong ${moi.length} cô sẽ nhập</div>` : ''}
      <button class="btn primary block mt-14" id="ad-nc-ghi">Nhập ${moi.length} cô vào hệ thống</button>`;

    const btn = document.getElementById('ad-nc-ghi');
    const oTrung = document.getElementById('ad-nc-trung');
    const soNhap = () => (this._nhapCaTrungCo ? moi.length + trung.length : moi.length);
    const veLaiNut = () => {
      this._nhapCaTrungCo = !!(oTrung && oTrung.checked);
      btn.disabled = !!loi.length || !soNhap();
      btn.textContent = `Nhập ${soNhap()} cô vào hệ thống`;
    };
    veLaiNut();
    if (oTrung) oTrung.onchange = veLaiNut;
    btn.onclick = () => this.nhapCo(soNhap());
  },

  async nhapCo(soLuong) {
    if (!confirm(`Nhập ${soLuong} cô vào hệ thống?\n\nHệ thống sẽ tạo tài khoản cô kèm mật khẩu tạm.`)) return;
    const btn = document.getElementById('ad-nc-ghi');
    btn.disabled = true;
    btn.textContent = 'Đang nhập…';
    try {
      const r = await API.post('/api/admin/teachers/nhap/ghi', { csv: this._csvCo, nhapCaTrung: this._nhapCaTrungCo === true });
      this.hienPhieuCo(r);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = `Nhập ${soLuong} cô vào hệ thống`;
    }
  },

  // Phiếu mật khẩu tạm: chỉ hiện một lần, nên có nút tải về để in.
  hienPhieuCo(r) {
    const rows = r.taiKhoan || [];
    UI.modal(`
      <p>Đã tạo <b>${UI.esc(String(r.imported))}</b> tài khoản cô${r.boQuaTrung ? `, bỏ qua ${UI.esc(String(r.boQuaTrung))} cô đã có tài khoản` : ''}.</p>
      ${r.hoSoChuaLuu ? `<p class="small" style="color:var(--danger)">${UI.esc(String(r.hoSoChuaLuu))} hồ sơ (ngày sinh, CCCD)
        chưa lưu được — mở mục Nhân sự để nhập lại cho các cô ấy.</p>` : ''}
      <p class="muted small">Danh sách dưới đây <b>chỉ hiện một lần</b>. Hãy tải về và in phát cho cô.
      Cô sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.</p>
      <button class="btn primary block mt-14" id="ad-nc-tai">⬇ Tải danh sách tài khoản (CSV)</button>
      <div class="table-wrap mt-14" style="max-height:40vh;overflow-y:auto">
        <table class="simple">
          <thead><tr><th>Cô</th><th>Cơ sở</th><th>Nhóm</th><th>Tên đăng nhập</th><th>Mật khẩu tạm</th></tr></thead>
          <tbody>${rows.map(t => `<tr>
            <td>${UI.esc(t.hoTen)}</td><td>${UI.esc(t.coSo || '—')}</td><td>${UI.esc(t.nhom || '—')}</td>
            <td><code>${UI.esc(t.username)}</code></td><td><code>${UI.esc(t.matKhau)}</code></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn outline block mt-14" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
    `, 'Tài khoản cô đã tạo', { giuKhiBamNen: true });

    document.getElementById('ad-nc-tai').onclick = () => {
      const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      const noiDung = '﻿' + [['Cô', 'Cơ sở', 'Nhóm', 'Tên đăng nhập', 'Mật khẩu tạm'].join(',')]
        .concat(rows.map(t => [t.hoTen, t.coSo || '', t.nhom || '', t.username, t.matKhau].map(esc).join(',')))
        .join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([noiDung], { type: 'text/csv;charset=utf-8' }));
      a.download = 'tai-khoan-co.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  },
});
