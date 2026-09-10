// Giao diện phân hệ HỒ SƠ NHÂN SỰ & CHẤM CÔNG (Đ152).
//
// HAI MÀN HOÀN TOÀN KHÁC NHAU dưới cùng một ô:
//
//   • Nhân sự / ban giám hiệu → hồ sơ của cả trường và bảng công theo tháng.
//   • Mọi người khác (cô, và cả tài khoản quản trị không phải Nhân sự) → phần
//     "CỦA TÔI": trường đang giữ những gì về mình, và bảng công tháng này của
//     mình. Chỉ đọc.
//
// Vế thứ hai không phải phần thêm cho đủ. Giữ dữ liệu về một người mà chính họ
// không xem được là chỗ hỏng lòng tin nhanh nhất — và với hồ sơ có số định
// danh, số bảo hiểm, số tài khoản ngân hàng thì cũng là chỗ luật đòi rõ nhất.
App.views.nhansu = {
  _tab: 'hoso',
  _thang: null,

  LOAI_CONG: {
    'di-lam': 'Đi làm',
    'nua-ngay': 'Nửa ngày',
    'nghi-phep': 'Nghỉ phép',
    'nghi-khong-phep': 'Nghỉ không phép',
    'nghi-le': 'Nghỉ lễ',
  },

  async render(root, params) {
    if (!this._thang) this._thang = UI.todayStr().slice(0, 7);
    if (params && params[0]) this._tab = params[0];

    // Ai mở được phần của cả trường thì máy chủ trả lời, màn hình KHÔNG tự
    // đoán theo vai: quyền ở đây phụ thuộc CHỨC VỤ, mà chức vụ thì màn hình
    // không có. Hỏi một câu rẻ rồi rẽ, thay vì bày nút rồi nhận 403.
    let cuaTruong = false;
    if (App.state.user.role === 'admin') {
      try {
        const r = await API.get('/api/nhansu/ho-so');
        this._ds = r;
        cuaTruong = true;
      } catch (_) { cuaTruong = false; }
    }
    if (!cuaTruong) return this.manCuaToi(root);
    return this.manNhanSu(root);
  },

  // ================= Màn CỦA TÔI =================
  async manCuaToi(root) {
    const [hs, cc] = await Promise.all([
      API.get('/api/nhansu/ho-so/toi'),
      API.get(`/api/nhansu/cham-cong/toi?thang=${encodeURIComponent(this._thang)}`).catch(() => null),
    ]);
    const h = hs.hoSo || {};
    const t = cc && cc.cuaToi;
    const dong = (nhan, gt) => (gt ? UI.dongThongTin(nhan, gt) : '');
    root.innerHTML = `
      ${UI.pageHeader('Hồ sơ của tôi')}
      <div class="card" style="border-left:4px solid var(--primary)">
        <div class="muted small" style="line-height:1.7">
          Đây là những gì nhà trường đang lưu về ${UI.esc(hs.hoTen || 'bạn')}.
          Phần này <b>chỉ mình bạn và bộ phận Nhân sự</b> đọc được — đồng nghiệp
          và phụ huynh không thấy. Thấy chỗ nào chưa đúng thì nhắn
          <b>${UI.esc(hs.aiSua || 'bộ phận Nhân sự')}</b> sửa giúp nhé.
        </div>
      </div>
      ${h.coHoSo ? `<div class="card">
        <div class="card-title">Hồ sơ</div>
        ${dong('Chức danh', h.chucDanh)}
        ${dong('Ngày vào làm', h.ngayVaoLam ? UI.fmtDate(h.ngayVaoLam, { weekday: false }) : '')}
        ${dong('Loại hợp đồng', h.loaiHopDong)}
        ${dong('Ngày sinh', h.ngaySinh ? UI.fmtDate(h.ngaySinh, { weekday: false }) : '')}
        ${dong('Điện thoại', h.dienThoai)}
        ${dong('Trình độ', h.trinhDo)}
        ${dong('Chuyên ngành', h.chuyenNganh)}
        ${dong('Số định danh cá nhân', h.cccd)}
        ${dong('Mã số thuế', h.mst)}
        ${dong('Số bảo hiểm xã hội', h.soBhxh)}
        ${dong('Ngân hàng', h.nganHang)}
        ${dong('Số tài khoản', h.soTaiKhoan)}
        ${dong('Người báo tin khẩn', h.khanCapTen)}
        ${dong('Điện thoại khẩn', h.khanCapDienThoai)}
      </div>` : UI.emptyState('🗂️', 'Nhà trường chưa lập hồ sơ nhân sự cho bạn.')}

      <div class="section-label">Bảng công tháng ${UI.esc(this._thang.slice(5))}/${UI.esc(this._thang.slice(0, 4))}</div>
      ${t ? `<div class="card">
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num">${UI.esc(String(t.soCong))}</div><div class="stat-label">Công</div></div>
          <div class="stat-box"><div class="stat-num">${UI.esc(String(t.soNghiPhep))}</div><div class="stat-label">Nghỉ phép</div></div>
          <div class="stat-box"><div class="stat-num">${UI.esc(String(t.soNghiLe))}</div><div class="stat-label">Nghỉ lễ</div></div>
        </div>
        ${(t.ngay || []).length ? (t.ngay || []).map(d => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(UI.fmtDate(d.ngay))}</div>
              ${d.ghiChu ? `<div class="row-sub">${UI.esc(d.ghiChu)}</div>` : ''}
            </div>
            <div class="row-end">${UI.esc(this.LOAI_CONG[d.loai] || d.loai)}${
  d.gioVao ? ` · ${UI.esc(d.gioVao)}${d.gioRa ? `–${UI.esc(d.gioRa)}` : ''}` : ''}</div>
          </div>`).join('')
        : '<div class="muted small">Tháng này chưa có ngày công nào được ghi.</div>'}
      </div>` : UI.emptyState('📅', 'Tháng này chưa có bảng công.')}`;
  },

  // ================= Màn của NHÂN SỰ =================
  async manNhanSu(root) {
    root.innerHTML = `
      ${UI.pageHeader('Nhân sự & chấm công')}
      <div class="seg" id="ns-tab">
        <button type="button" data-tab="hoso" class="${this._tab === 'hoso' ? 'active' : ''}">🗂️ Hồ sơ</button>
        <button type="button" data-tab="chamcong" class="${this._tab === 'chamcong' ? 'active' : ''}">📅 Chấm công</button>
      </div>
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="muted small" style="line-height:1.7">
          Đây là <b>dữ liệu cá nhân của người lớn</b>: số định danh, mã số thuế, số bảo hiểm,
          số tài khoản ngân hàng. Chỉ <b>Nhân sự và ban giám hiệu</b> mở được phần này.
          Mỗi lần mở một hồ sơ đều được ghi lại trong <b>Nhật ký</b>, và mỗi người
          <b>xem được hồ sơ của chính mình</b> ở mục "Hồ sơ của tôi".
        </div>
      </div>
      <div id="ns-body"><div class="loading">Đang tải</div></div>`;
    for (const b of root.querySelectorAll('#ns-tab [data-tab]')) {
      b.onclick = () => { this._tab = b.dataset.tab; App.route(); };
    }
    const body = document.getElementById('ns-body');
    try {
      if (this._tab === 'chamcong') return await this.tabChamCong(body);
      return await this.tabHoSo(body);
    } catch (err) { body.innerHTML = UI.emptyState('😥', err.message); }
  },

  async tabHoSo(body) {
    const d = this._ds || await API.get('/api/nhansu/ho-so');
    this._ds = d;
    body.innerHTML = `
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${UI.esc(String(d.soNguoi))}</div><div class="stat-label">Người</div></div>
        <div class="stat-box"><div class="stat-num">${UI.esc(String(d.soDangLam))}</div><div class="stat-label">Đang làm</div></div>
        <div class="stat-box"><div class="stat-num" style="color:${d.soChuaCoHoSo ? 'var(--warning)' : 'var(--muted)'}">${UI.esc(String(d.soChuaCoHoSo))}</div><div class="stat-label">Chưa có hồ sơ</div></div>
      </div>
      <div class="card">
        ${(d.danhSach || []).map((x, i) => `
          <div class="list-row clickable" data-mo="${UI.esc(String(i))}">
            ${UI.avatar(x.avatar, 42)}
            <div class="row-main">
              <div class="row-title">${UI.esc(x.hoTen)}</div>
              <div class="row-sub">${UI.esc(x.chucDanh || (x.vai === 'teacher' ? 'Cô' : 'Văn phòng'))}${
  x.ngayVaoLam ? ` · vào làm ${UI.esc(UI.fmtDate(x.ngayVaoLam, { weekday: false }))}` : ''}</div>
            </div>
            <div class="row-end">${x.coHoSo
    ? (x.dangLam ? '' : UI.badge('Đã nghỉ', 'gray'))
    : UI.badge('Chưa có hồ sơ', 'orange')}</div>
          </div>`).join('')}
      </div>`;
    for (const b of body.querySelectorAll('[data-mo]')) {
      b.onclick = () => this.moHoSo(d.danhSach[Number(b.dataset.mo)]);
    }
  },

  O_HO_SO: [
    ['chucDanh', 'Chức danh', 'text'], ['loaiHopDong', 'Loại hợp đồng', 'text'],
    ['ngayVaoLam', 'Ngày vào làm', 'date'], ['ngayNghiViec', 'Ngày nghỉ việc', 'date'],
    ['ngaySinh', 'Ngày sinh', 'date'], ['gioiTinh', 'Giới tính', 'text'],
    ['dienThoai', 'Điện thoại', 'text'], ['email', 'Email', 'text'],
    ['cccd', 'Số định danh cá nhân', 'text'], ['cccdNgayCap', 'Ngày cấp', 'date'],
    ['cccdNoiCap', 'Nơi cấp', 'text'], ['mst', 'Mã số thuế', 'text'],
    ['soBhxh', 'Số bảo hiểm xã hội', 'text'],
    ['queQuan', 'Quê quán', 'text'], ['hoKhau', 'Hộ khẩu thường trú', 'text'],
    ['choO', 'Chỗ ở hiện nay', 'text'], ['danToc', 'Dân tộc', 'text'],
    ['honNhan', 'Tình trạng hôn nhân', 'text'],
    ['tenVoChong', 'Họ tên vợ/chồng', 'text'], ['dienThoaiVoChong', 'Điện thoại vợ/chồng', 'text'],
    ['soCon', 'Số con', 'number'],
    ['trinhDo', 'Trình độ', 'text'], ['chuyenNganh', 'Chuyên ngành', 'text'],
    ['nganHang', 'Ngân hàng', 'text'], ['soTaiKhoan', 'Số tài khoản', 'text'],
    ['khanCapTen', 'Người báo tin khẩn', 'text'], ['khanCapQuanHe', 'Quan hệ', 'text'],
    ['khanCapDienThoai', 'Điện thoại khẩn', 'text'],
  ],

  async moHoSo(row) {
    if (!row) return;
    const d = await API.get(`/api/nhansu/ho-so/${encodeURIComponent(row.userId)}`);
    const h = d.hoSo || {};
    UI.modal(`
      <div class="center"><h3>${UI.esc(d.hoTen)}</h3></div>
      ${this.O_HO_SO.map(([o, nhan, kieu]) => `
        <div class="field">
          <label>${UI.esc(nhan)}</label>
          <input type="${UI.esc(kieu)}" id="ns-${UI.esc(o)}" value="${UI.esc(String(h[o] ?? ''))}">
        </div>`).join('')}
      <div class="field">
        <label>Ghi chú</label>
        <textarea id="ns-ghiChu">${UI.esc(h.ghiChu || '')}</textarea>
      </div>
      <button class="btn primary block" id="ns-luu">${UI.icon('check', 18)} Lưu hồ sơ</button>
    `, 'Hồ sơ nhân sự');

    document.getElementById('ns-luu').onclick = async () => {
      const than = {};
      for (const [o] of this.O_HO_SO) than[o] = document.getElementById(`ns-${o}`).value;
      than.ghiChu = document.getElementById('ns-ghiChu').value;
      try {
        await API.put(`/api/nhansu/ho-so/${encodeURIComponent(row.userId)}`, than);
        UI.toast('Đã lưu hồ sơ', 'success');
        UI.closeModal();
        this._ds = null;
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async tabChamCong(body) {
    const d = await API.get(`/api/nhansu/cham-cong?thang=${encodeURIComponent(this._thang)}`);
    this._cc = d;
    body.innerHTML = `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Tháng</label>
          <input type="month" id="ns-thang" value="${UI.esc(this._thang)}">
        </div>
      </div>
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Bấm vào một người để chấm từng ngày. Bảng này ghi <b>ngày công</b>, không tính lương —
          xuất ra tệp để kế toán tính.
        </div>
        <button class="btn outline block mt-8" id="ns-ca-truong">${UI.icon('check', 16)} Cả trường đi làm hôm nay</button>
        <button class="btn outline block mt-8" id="ns-xuat">⬇ Xuất bảng công ra Excel</button>
      </div>
      <div class="card">
        ${(d.danhSach || []).map((x, i) => `
          <div class="list-row clickable" data-cc="${UI.esc(String(i))}">
            ${UI.avatar(x.avatar, 42)}
            <div class="row-main">
              <div class="row-title">${UI.esc(x.hoTen)}</div>
              <div class="row-sub">${UI.esc(String(x.soCong))} công${
  x.soNghiPhep ? ` · ${UI.esc(String(x.soNghiPhep))} nghỉ phép` : ''}${
  x.soNghiKhongPhep ? ` · ${UI.esc(String(x.soNghiKhongPhep))} nghỉ không phép` : ''}</div>
            </div>
            <div class="row-end">${UI.icon('chevron', 18)}</div>
          </div>`).join('')}
      </div>`;
    document.getElementById('ns-thang').onchange = (e) => {
      if (/^\d{4}-\d{2}$/.test(e.target.value)) { this._thang = e.target.value; App.route(); }
    };
    document.getElementById('ns-ca-truong').onclick = () => this.chamCaTruong();
    document.getElementById('ns-xuat').onclick = () => {
      window.location.href = `/api/nhansu/cham-cong.csv?thang=${encodeURIComponent(this._thang)}`;
    };
    for (const b of body.querySelectorAll('[data-cc]')) {
      b.onclick = () => this.moChamCong(d.danhSach[Number(b.dataset.cc)]);
    }
  },

  chamCaTruong() {
    UI.modal(`
      <div class="center">
        <div style="font-size:34px">📅</div>
        <h3 class="mt-8">Ghi "đi làm" cho cả trường hôm nay?</h3>
        <div class="muted small mt-8" style="line-height:1.7">
          Chỉ ghi cho những người <b>chưa có dòng nào</b> của hôm nay. Ai đã được chấm tay
          rồi thì <b>giữ nguyên</b>, không bị đè lên.
        </div>
      </div>
      <button class="btn primary block mt-14" id="ns-ct-ok">${UI.icon('check', 18)} Ghi cho cả trường</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Chấm công cả trường');
    document.getElementById('ns-ct-ok').onclick = async () => {
      try {
        const r = await API.post('/api/nhansu/cham-cong/ca-truong', { ngay: UI.todayStr(), loai: 'di-lam' });
        UI.toast(`Đã ghi cho ${r.soVuaGhi} người, giữ nguyên ${r.soDaCoTruoc} người đã chấm`, 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  moChamCong(row) {
    if (!row) return;
    const daGhi = new Map((row.ngay || []).map(d => [d.ngay, d]));
    const [nam, th] = this._thang.split('-').map(Number);
    const soNgay = new Date(nam, th, 0).getDate();
    const ds = [];
    for (let i = 1; i <= soNgay; i += 1) {
      ds.push(`${this._thang}-${String(i).padStart(2, '0')}`);
    }
    UI.modal(`
      <div class="center"><h3>${UI.esc(row.hoTen)}</h3>
        <div class="muted small">Tháng ${UI.esc(this._thang.slice(5))}/${UI.esc(this._thang.slice(0, 4))}</div></div>
      <div class="mt-14">
        ${ds.map(n => {
    const d = daGhi.get(n) || {};
    return `<div class="list-row">
            <div class="row-main"><div class="row-sub">${UI.esc(UI.fmtDate(n))}</div></div>
            <div class="row-end">
              <select data-ngay="${UI.esc(n)}">
                <option value="">—</option>
                ${Object.keys(this.LOAI_CONG).map(k => `<option value="${UI.esc(k)}"${
  d.loai === k ? ' selected' : ''}>${UI.esc(this.LOAI_CONG[k])}</option>`).join('')}
              </select>
            </div>
          </div>`;
  }).join('')}
      </div>
    `, 'Chấm công từng ngày');

    for (const o of document.querySelectorAll('[data-ngay]')) {
      o.onchange = async () => {
        try {
          await API.put(
            `/api/nhansu/cham-cong/${encodeURIComponent(row.userId)}/${encodeURIComponent(o.dataset.ngay)}`,
            { loai: o.value });
          UI.toast('Đã ghi', 'success');
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },
};
