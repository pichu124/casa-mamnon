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
  MAU_LOAI: { 'di-lam': 'green', 'nua-ngay': 'blue' },

  // Ngày công tính từ giờ ở cổng (K1). `loai` chỉ là loại GHI TAY, nên ngày tự
  // tính phải đọc theo `trangThai`. "Cần giải trình" là lời nhắc, không phải
  // lỗi: không tô đỏ, không tô cam.
  TRANG_THAI: {
    'du-cong': ['Đủ công', 'green'],
    'nua-ngay': ['Nửa ngày', 'blue'],
    'can-giai-trinh': ['Cần giải trình', 'purple'],
    'dang-lam': ['Đang ở trường', 'gray'],
    'chua-co-cong': ['Chưa có giờ ở cổng', 'gray'],
  },
  LY_DO: { 'thieu-gio-ra': 'chưa có giờ ra', 'chua-du-gio': 'chưa đủ giờ' },
  NGUON: { tay: 'Nhân sự ghi', 'giai-trinh': 'theo giải trình đã duyệt', 'cong-cu': 'chụp ảnh ở cổng' },

  nhanNgay(d) {
    if (!d || !d.trangThai) return null;
    if (d.trangThai === 'da-ghi') {
      return { nhan: this.LOAI_CONG[d.loai] || d.loai, mau: this.MAU_LOAI[d.loai] || 'gray', phu: this.NGUON[d.nguon] || '' };
    }
    const [nhan, mau] = this.TRANG_THAI[d.trangThai] || [d.trangThai, 'gray'];
    return { nhan, mau, phu: this.LY_DO[d.lyDo] || '' };
  },

  gioCong(d) {
    if (!d || !d.gioVao) return '';
    return d.gioRa ? `${d.gioVao}–${d.gioRa}` : `vào ${d.gioVao}`;
  },

  so(x) { return String(x ?? 0).replace('.', ','); },
  ngayDep(n) { return UI.fmtDate(n, { weekday: false }); },
  tieng(phut) {
    const h = Math.floor(Number(phut) / 60);
    const p = Number(phut) % 60;
    return p ? `${h} tiếng ${p} phút` : `${h} tiếng`;
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
    root.innerHTML = `${UI.pageHeader('Hồ sơ của tôi')}<div id="ns-toi"><div class="loading">Đang tải</div></div>`;
    return this.veCuaToi(document.getElementById('ns-toi'));
  },

  // Phần "của tôi" — dùng cho cô và cho cả Nhân sự / ban giám hiệu (tab
  // "Của tôi"): người duyệt giải trình cũng chụp ảnh ở cổng như mọi người.
  async veCuaToi(el) {
    const [hs, cc] = await Promise.all([
      API.get('/api/nhansu/ho-so/toi'),
      API.get(`/api/nhansu/cham-cong/toi?thang=${encodeURIComponent(this._thang)}`).catch(() => null),
    ]);
    const h = hs.hoSo || {};
    const t = cc && cc.cuaToi;
    const dong = (nhan, gt) => (gt ? UI.dongThongTin(nhan, gt) : '');
    el.innerHTML = `
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
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Tháng</label>
          <input type="month" id="ns-toi-thang" value="${UI.esc(this._thang)}">
        </div>
      </div>
      ${t && t.soCanGiaiTrinh ? `<div class="card" id="ns-toi-nhac" style="border-left:4px solid var(--info)">
        <div class="muted small" style="line-height:1.7">
          Có <b>${UI.esc(String(t.soCanGiaiTrinh))} ngày</b> giờ chụp ở cổng chưa đủ để tính công.
          Nếu hôm đó bạn vẫn làm (quên chụp lúc về, đi tập huấn, được cho về sớm...),
          bấm <b>Gửi giải trình</b> ở ngày đó để Nhân sự hoặc Ban giám hiệu xem giúp.
        </div>
      </div>` : ''}
      ${t ? `<div class="card">
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num">${UI.esc(this.so(t.soCong))}</div><div class="stat-label">Công</div></div>
          <div class="stat-box"><div class="stat-num">${UI.esc(String(t.soNghiPhep))}</div><div class="stat-label">Nghỉ phép</div></div>
          <div class="stat-box"><div class="stat-num">${UI.esc(String(t.soNghiLe))}</div><div class="stat-label">Nghỉ lễ</div></div>
        </div>
        ${(t.ngay || []).length ? (t.ngay || []).map(d => this.dongNgayToi(d)).join('')
    : '<div class="muted small">Tháng này chưa có ngày công nào được ghi.</div>'}
      </div>` : UI.emptyState('📅', 'Tháng này chưa có bảng công.')}`;

    document.getElementById('ns-toi-thang').onchange = (e) => {
      if (/^\d{4}-\d{2}$/.test(e.target.value)) { this._thang = e.target.value; this.veCuaToi(el); }
    };
    const ngayCua = n => ((t && t.ngay) || []).find(d => d.ngay === n);
    for (const b of el.querySelectorAll('[data-gui]')) {
      b.onclick = () => this.moGuiGiaiTrinh(ngayCua(b.dataset.gui), () => this.veCuaToi(el));
    }
    for (const b of el.querySelectorAll('[data-rut]')) {
      b.onclick = async () => {
        b.disabled = true;
        try {
          await API.del(`/api/nhansu/cham-cong/toi?id=${encodeURIComponent(b.dataset.rut)}`);
          UI.toast('Đã rút giải trình', 'success');
          await this.veCuaToi(el);
        } catch (err) { b.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
  },

  guiDuoc(d) {
    return !!d && ['can-giai-trinh', 'chua-co-cong'].includes(d.trangThai)
      && !(d.giaiTrinh && d.giaiTrinh.trangThai === 'cho-duyet');
  },

  dongNgayToi(d) {
    const nh = this.nhanNgay(d);
    const gio = this.gioCong(d);
    const g = d.giaiTrinh;
    let gt = '';
    if (g && g.trangThai === 'cho-duyet') {
      gt = `<div class="row-sub">📝 Đã gửi giải trình, đang chờ duyệt
        <button type="button" class="btn outline sm" data-rut="${UI.esc(g.id)}">Rút lại</button></div>`;
    } else if (g && g.trangThai === 'tu-choi' && d.trangThai !== 'da-ghi') {
      gt = `<div class="row-sub">Giải trình chưa được duyệt${g.ghiChuDuyet ? `: ${UI.esc(g.ghiChuDuyet)}` : ''}.
        Bạn có thể gửi lại.</div>`;
    }
    // Dòng do cổng (cũ) hoặc giải trình sinh ra đã tự nói nguồn trong ghi chú.
    const ghiChuNoiNguon = d.ghiChu && ['cong-cu', 'giai-trinh'].includes(d.nguon);
    const phu = [nh && !ghiChuNoiNguon && nh.phu, gio].filter(Boolean).join(' · ');
    return `
      <div class="list-row" data-ngay-toi="${UI.esc(d.ngay)}">
        <div class="row-main">
          <div class="row-title">${UI.esc(UI.fmtDate(d.ngay))}</div>
          ${phu ? `<div class="row-sub">${UI.esc(phu)}</div>` : ''}
          ${d.ghiChu ? `<div class="row-sub">${UI.esc(d.ghiChu)}</div>` : ''}
          ${gt}
          ${this.linkAnhCong(d, '/toi')}
          ${this.guiDuoc(d) ? `<button type="button" class="btn outline sm mt-8" data-gui="${UI.esc(d.ngay)}">📝 Gửi giải trình</button>` : ''}
        </div>
        <div class="row-end">${nh ? UI.badge(nh.nhan, nh.mau) : ''}</div>
      </div>`;
  },

  moGuiGiaiTrinh(d, xong) {
    if (!d) return;
    UI.modal(`
      <div class="center"><h3>${UI.esc(UI.fmtDate(d.ngay))}</h3>
        <div class="muted small">${UI.esc(d.gioVao ? `Giờ chụp ở cổng: ${this.gioCong(d)}` : 'Hôm đó chưa có giờ chụp ở cổng')}</div></div>
      <div class="field mt-14">
        <label>Đề nghị tính</label>
        <select id="gt-loai">
          <option value="di-lam">Đi làm cả ngày</option>
          <option value="nua-ngay">Nửa ngày</option>
        </select>
      </div>
      <div class="field"><label>Giờ vào (nếu nhớ)</label><input type="time" id="gt-vao" value="${UI.esc(d.gioVao || '')}"></div>
      <div class="field"><label>Giờ về (nếu nhớ)</label><input type="time" id="gt-ra" value="${UI.esc(d.gioRa || '')}"></div>
      <div class="field">
        <label>Lý do</label>
        <textarea id="gt-lydo" maxlength="500" placeholder="Ví dụ: Quên chụp ảnh lúc về, hôm đó tôi về lúc 17:00"></textarea>
      </div>
      <button class="btn primary block" id="gt-gui">${UI.icon('check', 18)} Gửi giải trình</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Gửi giải trình ngày công');
    document.getElementById('gt-gui').onclick = async () => {
      try {
        await API.post('/api/nhansu/cham-cong/toi', {
          ngay: d.ngay,
          loaiDeNghi: document.getElementById('gt-loai').value,
          gioVaoDeNghi: document.getElementById('gt-vao').value,
          gioRaDeNghi: document.getElementById('gt-ra').value,
          lyDo: document.getElementById('gt-lydo').value,
        });
        UI.toast('Đã gửi giải trình', 'success');
        UI.closeModal();
        await xong();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Ảnh chấm công ở cổng của một ngày (vòng rà Đ232) — máy chủ chỉ gửi tên
  // tệp cho người được xem; trước đó ảnh được giữ mà không màn nào mở ra được.
  linkAnhCong(d, duoi = '') {
    const ra = [['anhVao', 'Ảnh vào'], ['anhRa', 'Ảnh ra']].filter(([k]) => d && d[k])
      .map(([k, nhan]) => `<a href="/api/nhansu/anh-cham-cong/${encodeURIComponent(d[k])}${duoi}" target="_blank" rel="noopener">${UI.esc(nhan)}</a>`);
    return ra.length ? `<div class="row-sub">📷 ${ra.join(' · ')} <span class="muted">· giữ 90 ngày</span></div>` : '';
  },

  // ================= Màn của NHÂN SỰ =================
  async manNhanSu(root) {
    root.innerHTML = `
      ${UI.pageHeader('Nhân sự & chấm công')}
      <div class="seg" id="ns-tab">
        <button type="button" data-tab="hoso" class="${this._tab === 'hoso' ? 'active' : ''}">🗂️ Hồ sơ</button>
        <button type="button" data-tab="chamcong" class="${this._tab === 'chamcong' ? 'active' : ''}">📅 Chấm công</button>
        <button type="button" data-tab="toi" class="${this._tab === 'toi' ? 'active' : ''}">🙋 Của tôi</button>
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
      if (this._tab === 'toi') return await this.veCuaToi(body);
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
    // Thẻ quy tắc và hàng chờ duyệt hỏng thì bảng công vẫn phải mở được.
    const [d, q, gt] = await Promise.all([
      API.get(`/api/nhansu/cham-cong?thang=${encodeURIComponent(this._thang)}`),
      API.get('/api/nhansu/quy-tac-cong').catch(() => null),
      API.get('/api/nhansu/giai-trinh?trangThai=cho-duyet').catch(() => null),
    ]);
    this._cc = d;
    this._gt = (gt && gt.danhSach) || [];
    body.innerHTML = `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Tháng</label>
          <input type="month" id="ns-thang" value="${UI.esc(this._thang)}">
        </div>
      </div>
      ${this.theQuyTac(q)}
      ${this.hangGiaiTrinh(q)}
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Bấm vào một người để chấm từng ngày. Bảng này ghi <b>ngày công</b>, không tính lương —
          xuất ra tệp để kế toán tính.
        </div>
        <button class="btn outline block mt-8" id="ns-ca-truong">${UI.icon('check', 16)} Cả trường đi làm hôm nay</button>
        <button class="btn outline block mt-8" id="ns-xuat">⬇ Xuất bảng công ra Excel</button>
      </div>
      <div class="card" id="ns-cc-ds"></div>`;
    document.getElementById('ns-thang').onchange = (e) => {
      if (/^\d{4}-\d{2}$/.test(e.target.value)) { this._thang = e.target.value; App.route(); }
    };
    document.getElementById('ns-ca-truong').onclick = () => this.chamCaTruong();
    document.getElementById('ns-xuat').onclick = () => {
      window.location.href = `/api/nhansu/cham-cong.csv?thang=${encodeURIComponent(this._thang)}`;
    };
    this.ganQuyTac(q, body);
    for (const b of body.querySelectorAll('[data-duyet]')) b.onclick = () => this.moDuyet(this._gt[Number(b.dataset.duyet)], body);
    for (const b of body.querySelectorAll('[data-tu-choi]')) b.onclick = () => this.moTuChoi(this._gt[Number(b.dataset.tuChoi)], body);
    this.veDanhSachCong();
  },

  veDanhSachCong() {
    const el = document.getElementById('ns-cc-ds');
    if (!el || !this._cc) return;
    const ds = this._cc.danhSach || [];
    el.innerHTML = ds.map((x, i) => {
      const them = [
        x.soNghiPhep ? `${this.so(x.soNghiPhep)} nghỉ phép` : '',
        x.soNghiKhongPhep ? `${this.so(x.soNghiKhongPhep)} nghỉ không phép` : '',
        x.soCanGiaiTrinh ? `${this.so(x.soCanGiaiTrinh)} ngày cần giải trình` : '',
        x.soChoDuyet ? `${this.so(x.soChoDuyet)} giải trình chờ duyệt` : '',
        x.soDangLam ? 'đang ở trường' : '',
      ].filter(Boolean);
      return `
          <div class="list-row clickable" data-cc="${UI.esc(String(i))}">
            ${UI.avatar(x.avatar, 42)}
            <div class="row-main">
              <div class="row-title">${UI.esc(x.hoTen)}</div>
              <div class="row-sub">${UI.esc([`${this.so(x.soCong)} công`, ...them].join(' · '))}</div>
            </div>
            <div class="row-end">${UI.icon('chevron', 18)}</div>
          </div>`;
    }).join('');
    for (const b of el.querySelectorAll('[data-cc]')) {
      b.onclick = () => this.moChamCong(ds[Number(b.dataset.cc)]);
    }
  },

  // ---------- Quy tắc tính công từ giờ ở cổng ----------
  // Mọi thay đổi chỉ có hiệu lực từ NGÀY MAI (máy chủ chặn ngày sớm hơn), nên
  // màn hình không cho chọn ngày: luôn gửi `ngayMai` máy chủ đưa.
  moTaThamSo(t) {
    return `<ul class="muted small" style="line-height:1.7;margin:6px 0 0;padding-left:18px">
      <li>Đủ 1 công: ở trường từ <b>${UI.esc(this.tieng(t.phutDuCong))}</b> trở lên, tính từ lúc vào tới lúc về (không trừ giờ nghỉ trưa).</li>
      <li>Nửa công: ở trường trọn ca sáng ${UI.esc(t.ca1Tu)}–${UI.esc(t.ca1Den)} hoặc trọn ca chiều ${UI.esc(t.ca2Tu)}–${UI.esc(t.ca2Den)}.</li>
      <li>${Number(t.phutDuDi) ? `Cho phép xê dịch ${UI.esc(String(t.phutDuDi))} phút ở mỗi đầu ca.` : 'Không xê dịch giờ ca.'}</li>
      <li>Ngày chưa đủ giờ: cô gửi giải trình, Nhân sự hoặc Ban giám hiệu duyệt.</li>
    </ul>`;
  },

  conChay(q) {
    return (q.lichSu || []).filter(x => !x.tatTu || x.tatTu > q.ngayMai);
  },

  theQuyTac(q) {
    if (!q) return '';
    const ht = q.hienTai;
    const st = q.sapToi;
    let tinhTrang;
    if (ht) {
      tinhTrang = `Đang bật từ ${this.ngayDep(ht.apDungTu)}${ht.tatTu && !st ? `, sẽ tắt từ ${this.ngayDep(ht.tatTu)}` : ''}.`;
    } else if (st) {
      tinhTrang = `Đang tắt, sẽ bật từ ${this.ngayDep(st.apDungTu)}.`;
    } else {
      tinhTrang = 'Đang tắt. Mỗi lần chụp ảnh vào ở cổng được ghi là một ngày đi làm, như trước giờ.';
    }
    const coChay = this.conChay(q).length > 0;
    const lich = (q.lichSu || []).slice().reverse();
    const truoc = n => new Date(Date.parse(`${n}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const dot = (x) => {
      let khoang;
      if (x.tatTu && x.tatTu <= x.apDungTu) khoang = `Định bật từ ${this.ngayDep(x.apDungTu)}, đã bỏ trước khi bắt đầu`;
      else if (x.tatTu) khoang = `${this.ngayDep(x.apDungTu)} – ${this.ngayDep(truoc(x.tatTu))}`;
      else khoang = `Từ ${this.ngayDep(x.apDungTu)}, chưa tắt`;
      return `<div class="row-sub" data-dot>${UI.esc(khoang)} · ${UI.esc(this.tieng(x.phutDuCong))} đủ công · ca ${
        UI.esc(x.ca1Tu)}–${UI.esc(x.ca1Den)}, ${UI.esc(x.ca2Tu)}–${UI.esc(x.ca2Den)}</div>`;
    };
    return `
      <div class="card" id="ns-quy-tac">
        <div class="card-title">⏱️ Tính công theo giờ ở cổng</div>
        <div class="small" style="line-height:1.7">${UI.esc(tinhTrang)}</div>
        ${this.moTaThamSo(ht || st || q.macDinh)}
        ${ht && st ? `<div class="small mt-8" style="line-height:1.7">Từ <b>${UI.esc(this.ngayDep(st.apDungTu))}</b> tính theo cách mới:</div>
          ${this.moTaThamSo(st)}` : ''}
        ${coChay ? `
          <button class="btn outline block mt-8" id="ns-qt-doi">Đổi cách tính</button>
          <button class="btn outline block mt-8" id="ns-qt-tat">Tắt từ ngày mai (${UI.esc(this.ngayDep(q.ngayMai))})</button>`
    : `<button class="btn primary block mt-8" id="ns-qt-bat">Bật từ ngày mai (${UI.esc(this.ngayDep(q.ngayMai))})</button>`}
        <div class="muted small mt-8">Hôm nay và những ngày đã qua giữ nguyên cách tính đang có.</div>
        ${lich.length ? `<details class="mt-8"><summary class="small">Các lần bật / tắt (${UI.esc(String(lich.length))})</summary>
          ${lich.map(dot).join('')}</details>` : ''}
      </div>`;
  },

  ganQuyTac(q, body) {
    if (!q) return;
    const nut = id => document.getElementById(id);
    const goc = q.sapToi || q.hienTai || q.macDinh;
    if (nut('ns-qt-bat')) nut('ns-qt-bat').onclick = () => this.moQuyTac(q, q.macDinh, body);
    if (nut('ns-qt-doi')) nut('ns-qt-doi').onclick = () => this.moQuyTac(q, goc, body);
    if (nut('ns-qt-tat')) nut('ns-qt-tat').onclick = () => this.moTatQuyTac(q, body);
  },

  moQuyTac(q, t, body) {
    UI.modal(`
      <div class="muted small" style="line-height:1.7">
        Áp dụng từ <b>ngày mai, ${UI.esc(this.ngayDep(q.ngayMai))}</b>. Hôm nay và những ngày đã qua
        giữ nguyên cách tính đang có.
      </div>
      <div class="field mt-14">
        <label>Số tiếng ở trường để đủ 1 công (tính từ lúc vào tới lúc về, không trừ giờ nghỉ trưa)</label>
        <input type="number" id="qt-gio" min="1" max="12" step="0.5" value="${UI.esc(String(Number(t.phutDuCong) / 60))}">
      </div>
      <div class="field"><label>Ca sáng — từ</label><input type="time" id="qt-ca1tu" value="${UI.esc(t.ca1Tu)}"></div>
      <div class="field"><label>Ca sáng — đến</label><input type="time" id="qt-ca1den" value="${UI.esc(t.ca1Den)}"></div>
      <div class="field"><label>Ca chiều — từ</label><input type="time" id="qt-ca2tu" value="${UI.esc(t.ca2Tu)}"></div>
      <div class="field"><label>Ca chiều — đến</label><input type="time" id="qt-ca2den" value="${UI.esc(t.ca2Den)}"></div>
      <div class="muted small">Ở trường trọn một ca thì được nửa công.</div>
      <div class="field mt-8">
        <label>Số phút cho phép xê dịch ở mỗi đầu ca</label>
        <input type="number" id="qt-dudi" min="0" max="120" step="1" value="${UI.esc(String(t.phutDuDi))}">
      </div>
      <button class="btn primary block" id="qt-luu">${UI.icon('check', 18)} Lưu, áp dụng từ ${UI.esc(this.ngayDep(q.ngayMai))}</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Tính công theo giờ ở cổng');
    document.getElementById('qt-luu').onclick = async () => {
      const gio = Number(document.getElementById('qt-gio').value);
      if (!(gio >= 1 && gio <= 12)) { UI.toast('Số tiếng đủ công phải từ 1 đến 12', 'error'); return; }
      const v = id => document.getElementById(id).value;
      try {
        await API.put('/api/nhansu/quy-tac-cong', {
          bat: true,
          apDungTu: q.ngayMai,
          phutDuCong: Math.round(gio * 60),
          ca1Tu: v('qt-ca1tu'),
          ca1Den: v('qt-ca1den'),
          ca2Tu: v('qt-ca2tu'),
          ca2Den: v('qt-ca2den'),
          phutDuDi: Number(v('qt-dudi')),
        });
        UI.toast(`Đã lưu, áp dụng từ ${this.ngayDep(q.ngayMai)}`, 'success');
        UI.closeModal();
        await this.tabChamCong(body);
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  moTatQuyTac(q, body) {
    UI.modal(`
      <div class="center">
        <h3>Tắt tính công theo giờ ở cổng?</h3>
        <div class="muted small mt-8" style="line-height:1.7">
          Từ <b>${UI.esc(this.ngayDep(q.ngayMai))}</b>, mỗi lần chụp ảnh vào ở cổng lại được ghi là một
          ngày đi làm như trước. Công đã tính của hôm nay và những ngày đã qua <b>giữ nguyên</b>.
          Bật lại được bất cứ lúc nào.
        </div>
      </div>
      <button class="btn primary block mt-14" id="qt-tat-ok">Tắt từ ${UI.esc(this.ngayDep(q.ngayMai))}</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Tính công theo giờ ở cổng');
    document.getElementById('qt-tat-ok').onclick = async () => {
      try {
        await API.put('/api/nhansu/quy-tac-cong', { bat: false, tatTu: q.ngayMai });
        UI.toast(`Đã tắt từ ${this.ngayDep(q.ngayMai)}`, 'success');
        UI.closeModal();
        await this.tabChamCong(body);
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---------- Hàng chờ duyệt giải trình ----------
  hangGiaiTrinh(q) {
    const ds = this._gt || [];
    if (!ds.length) {
      return q && (q.lichSu || []).length
        ? '<div class="card" id="ns-giai-trinh"><div class="muted small">Không có giải trình nào đang chờ duyệt.</div></div>'
        : '';
    }
    const de = (vao, ra) => (vao || ra ? `${vao || '?'}–${ra || '?'}` : '');
    return `
      <div class="card" id="ns-giai-trinh">
        <div class="card-title">📝 Giải trình chờ duyệt (${UI.esc(String(ds.length))})</div>
        ${ds.map((g, i) => `
          <div class="list-row" data-gt="${UI.esc(String(i))}">
            <div class="row-main">
              <div class="row-title">${UI.esc(g.hoTen)} · ${UI.esc(UI.fmtDate(g.ngay))}</div>
              <div class="row-sub">Ở cổng: ${UI.esc(de(g.gioVaoCong, g.gioRaCong) || 'chưa có giờ')}</div>
              <div class="row-sub">Đề nghị: ${UI.esc(this.LOAI_CONG[g.loaiDeNghi] || g.loaiDeNghi)}${
  de(g.gioVaoDeNghi, g.gioRaDeNghi) ? ` · ${UI.esc(de(g.gioVaoDeNghi, g.gioRaDeNghi))}` : ''}</div>
              <div class="row-sub">Lý do: ${UI.esc(g.lyDo)}</div>
              ${g.laCuaToi
    ? '<div class="row-sub muted">Giải trình của chính bạn — cần một người khác duyệt.</div>'
    : `<div class="mt-8">
                  <button type="button" class="btn primary sm" data-duyet="${UI.esc(String(i))}">Duyệt</button>
                  <button type="button" class="btn outline sm" data-tu-choi="${UI.esc(String(i))}">Không duyệt</button>
                </div>`}
            </div>
          </div>`).join('')}
      </div>`;
  },

  moDuyet(g, body) {
    if (!g) return;
    const vao = g.gioVaoDeNghi || g.gioVaoCong || '';
    const ra = g.gioRaDeNghi || g.gioRaCong || '';
    UI.modal(`
      <div class="center"><h3>${UI.esc(g.hoTen)}</h3>
        <div class="muted small">${UI.esc(UI.fmtDate(g.ngay))}</div></div>
      <div class="muted small mt-8" style="line-height:1.7">Lý do: ${UI.esc(g.lyDo)}</div>
      <div class="field mt-14">
        <label>Ghi vào bảng công là</label>
        <select id="gt-loai">
          ${Object.keys(this.LOAI_CONG).map(k => `<option value="${UI.esc(k)}"${
  k === g.loaiDeNghi ? ' selected' : ''}>${UI.esc(this.LOAI_CONG[k])}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Giờ vào</label><input type="time" id="gt-vao" value="${UI.esc(vao)}"></div>
      <div class="field"><label>Giờ về</label><input type="time" id="gt-ra" value="${UI.esc(ra)}"></div>
      <div class="field"><label>Ghi chú (không bắt buộc)</label><input type="text" id="gt-ghichu" maxlength="300"></div>
      <button class="btn primary block" id="gt-duyet-ok">${UI.icon('check', 18)} Duyệt</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Duyệt giải trình');
    document.getElementById('gt-duyet-ok').onclick = async () => {
      try {
        await API.put(`/api/nhansu/giai-trinh/${encodeURIComponent(g.id)}`, {
          duyet: true,
          loai: document.getElementById('gt-loai').value,
          gioVao: document.getElementById('gt-vao').value,
          gioRa: document.getElementById('gt-ra').value,
          ghiChu: document.getElementById('gt-ghichu').value,
        });
        UI.toast('Đã duyệt, bảng công đã cập nhật', 'success');
        UI.closeModal();
        await this.tabChamCong(body);
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  moTuChoi(g, body) {
    if (!g) return;
    UI.modal(`
      <div class="center"><h3>${UI.esc(g.hoTen)}</h3>
        <div class="muted small">${UI.esc(UI.fmtDate(g.ngay))}</div></div>
      <div class="muted small mt-8" style="line-height:1.7">Lý do cô gửi: ${UI.esc(g.lyDo)}</div>
      <div class="field mt-14">
        <label>Vì sao chưa duyệt? (cô sẽ đọc được câu này)</label>
        <textarea id="gt-ly-do-tu-choi" maxlength="300"></textarea>
      </div>
      <button class="btn primary block" id="gt-tu-choi-ok">Không duyệt</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Không duyệt giải trình');
    document.getElementById('gt-tu-choi-ok').onclick = async () => {
      try {
        await API.put(`/api/nhansu/giai-trinh/${encodeURIComponent(g.id)}`, {
          duyet: false,
          ghiChu: document.getElementById('gt-ly-do-tu-choi').value,
        });
        UI.toast('Đã gửi lại cho cô kèm lý do', 'success');
        UI.closeModal();
        await this.tabChamCong(body);
      } catch (err) { UI.toast(err.message, 'error'); }
    };
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
        UI.toast(`Đã ghi cho ${r.soVuaGhi} người, giữ nguyên ${r.soDaCoTruoc} người đã chấm${
          r.soCoGioCong ? `, ${r.soCoGioCong} người tính theo giờ ở cổng` : ''}`, 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Một ngày trong hộp chấm từng ngày: ô chọn là phần GHI TAY; trạng thái tự
  // tính từ giờ ở cổng đứng riêng bên cạnh, để không ai tưởng nhầm là đã ghi.
  dongNgayNS(n, d) {
    const nh = this.nhanNgay(d);
    const gio = this.gioCong(d);
    let trangThai = '';
    if (nh && d.trangThai === 'da-ghi') {
      trangThai = nh.phu ? `<div class="row-sub muted">${UI.esc(nh.phu)}</div>` : '';
    } else if (nh) {
      trangThai = `<div class="row-sub">Theo giờ ở cổng: ${UI.badge(nh.nhan, nh.mau)}${
        nh.phu ? ` <span class="muted">${UI.esc(nh.phu)}</span>` : ''}</div>`;
    }
    return `
            <div class="row-main"><div class="row-sub">${UI.esc(UI.fmtDate(n))}${gio ? ` · ${UI.esc(gio)}` : ''}</div>
              ${trangThai}
              ${d.giaiTrinh && d.giaiTrinh.trangThai === 'cho-duyet' ? '<div class="row-sub">📝 Có giải trình đang chờ duyệt</div>' : ''}
              ${this.linkAnhCong(d)}</div>
            <div class="row-end">
              <select data-ngay="${UI.esc(n)}">
                <option value="">—</option>
                ${Object.keys(this.LOAI_CONG).map(k => `<option value="${UI.esc(k)}"${
  d.loai === k ? ' selected' : ''}>${UI.esc(this.LOAI_CONG[k])}</option>`).join('')}
              </select>
            </div>`;
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
      ${this._cc && this._cc.quyTac ? `<div class="muted small mt-8" style="line-height:1.6">
        Ô chọn là phần <b>ghi tay</b> và luôn được ưu tiên. Để trống (—) thì công tính theo giờ ở cổng.</div>` : ''}
      <div class="mt-14">
        ${ds.map(n => `<div class="list-row" data-dong="${UI.esc(n)}">${this.dongNgayNS(n, daGhi.get(n) || {})}</div>`).join('')}
      </div>
    `, 'Chấm công từng ngày');
    for (const o of document.querySelectorAll('#modal-overlay [data-ngay]')) this.ganONgay(row.userId, o);
  },

  // Máy chủ giữ ô nào không gửi, nên dòng đã ghi tay chỉ cần gửi `loai` — giờ
  // vào/ra và ghi chú còn nguyên. Ngày đang tự tính thì mang giờ ở cổng theo
  // vào dòng ghi tay, để bảng công vẫn còn giờ thật của hôm đó.
  ganONgay(userId, o) {
    o.onchange = async () => {
      const n = o.dataset.ngay;
      const cu = this.ngayCuaNguoi(userId, n) || {};
      const than = { loai: o.value };
      if (o.value && cu.nguon === 'tinh' && cu.gioVao) {
        than.gioVao = cu.gioVao;
        if (cu.gioRa && cu.gioRa >= cu.gioVao) than.gioRa = cu.gioRa;
      }
      try {
        await API.put(`/api/nhansu/cham-cong/${encodeURIComponent(userId)}/${encodeURIComponent(n)}`, than);
        UI.toast('Đã ghi', 'success');
      } catch (err) { UI.toast(err.message, 'error'); }
      try {
        this._cc = await API.get(`/api/nhansu/cham-cong?thang=${encodeURIComponent(this._thang)}`);
      } catch (_) { return; }
      this.veDanhSachCong();
      const dong = document.querySelector(`#modal-overlay [data-dong="${CSS.escape(n)}"]`);
      if (!dong) return;
      dong.innerHTML = this.dongNgayNS(n, this.ngayCuaNguoi(userId, n) || {});
      const oMoi = dong.querySelector('[data-ngay]');
      if (oMoi) this.ganONgay(userId, oMoi);
    };
  },

  ngayCuaNguoi(userId, n) {
    const p = ((this._cc && this._cc.danhSach) || []).find(x => x.userId === userId);
    return p ? (p.ngay || []).find(d => d.ngay === n) : null;
  },
};
