// BÁO ĂN & TIỀN ĂN — màn hình.
//
// Hai tab, hai người dùng khác nhau:
//
//   • BÁO ĂN HẰNG NGÀY — cô, lúc 7 giờ sáng, tay còn đang đón bé. Màn này phải
//     mở ra là thấy ngay con số, và chốt xong trong hai lần bấm.
//
//   • ĐỐI CHIẾU THÁNG — văn phòng, cuối tháng, ngồi trước máy tính với quyển
//     sổ giấy bên cạnh. Màn này là một cái bảng, và nó được phép dài.
//
// QUY TẮC 4: bảng đối chiếu KHÔNG bao giờ sắp các bé theo con số — luôn theo
// tên. Nó là sổ tiền của văn phòng, không phải nhận định về đứa trẻ.
App.views.tienan = {
  _tab: 'ngay',
  _ngay: null,
  _thang: null,
  _data: null,

  laVanPhong() { return App.state.user.role === 'admin'; },

  async render(root) {
    this._ngay = this._ngay || UI.todayStr();
    this._thang = this._thang || UI.todayStr().slice(0, 7);
    if (!this.laVanPhong()) this._tab = 'ngay';

    root.innerHTML = `
      ${UI.pageHeader('Báo ăn & tiền ăn')}
      ${this.laVanPhong() ? `
        <div class="seg" id="ta-tabs">
          <button class="${this._tab === 'ngay' ? 'active' : ''}" data-tab="ngay">Báo ăn hằng ngày</button>
          <button class="${this._tab === 'thang' ? 'active' : ''}" data-tab="thang">Đối chiếu tháng</button>
        </div>` : ''}
      <div id="ta-than"></div>`;

    const tabs = document.getElementById('ta-tabs');
    if (tabs) {
      for (const b of tabs.querySelectorAll('button')) {
        b.onclick = () => { this._tab = b.dataset.tab; App.route(); };
      }
    }
    const than = document.getElementById('ta-than');
    if (this._tab === 'thang') return this.manThang(than);
    return this.manNgay(than);
  },

  // ================= Báo ăn hằng ngày =================
  async manNgay(than) {
    const d = await API.get(`/api/tienan/bao-an?ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;

    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Ngày báo ăn</label>
          <input type="date" id="ta-ngay" value="${UI.esc(this._ngay)}">
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          Con số dưới đây là <b>sĩ số trừ bé đã có đơn nghỉ được duyệt và bé đã điểm danh vắng</b>.
          Bé có đơn nghỉ mà sáng vẫn tới lớp thì vẫn được tính suất — app nghe theo sổ điểm danh.
        </div>
      </div>

      ${(d.nhom || []).length ? `
        <div class="card">
          <div class="card-title">Cả trường hôm đó</div>
          ${this.dongSo('Sĩ số', d.tong.siSo)}
          ${this.dongSo('Suất dự kiến', d.tong.suatDuKien)}
          ${this.dongSo('Đã chốt cho bếp', `${d.tong.suatDaChot} suất · ${d.tong.soNhomDaChot}/${d.tong.soNhom} nhóm`)}
        </div>` : ''}

      ${(d.nhom || []).length
        ? (d.nhom || []).map(n => this.theNhom(n)).join('')
        : UI.emptyState('🍲', 'Chưa có nhóm nào để báo ăn.')}`;

    document.getElementById('ta-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    for (const b of than.querySelectorAll('[data-chot]')) {
      b.onclick = () => this.moChot(b.dataset.chot);
    }
  },

  dongSo(nhan, gt) {
    return `<div class="list-row"><div class="row-main">
      <div class="row-sub">${UI.esc(nhan)}</div>
      <div class="row-title">${UI.esc(String(gt))}</div>
    </div></div>`;
  },

  theNhom(n) {
    const lech = n.chot && n.chot.soSuat !== n.chot.soSuatMay;
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          <div class="row-main">
            <div class="row-title">${UI.esc(n.tenNhom)}</div>
            <div class="row-sub">Sĩ số ${UI.esc(String(n.siSo))} · dự kiến ${UI.esc(String(n.suatDuKien))} suất</div>
          </div>
          ${n.chot ? UI.badge(`Đã chốt ${n.chot.soSuat}`, 'green') : UI.badge('Chưa chốt', 'orange')}
        </div>

        ${(n.khongAn || []).length ? `
          <div class="section-label">Hôm đó không ăn ở trường</div>
          ${(n.khongAn || []).map(b => `
            <div class="list-row"><div class="row-main">
              <div class="row-title">${UI.esc(b.hoTen)}</div>
              <div class="row-sub">${UI.esc(b.vi)}</div>
            </div></div>`).join('')}`
          : '<div class="muted small">Cả nhóm ăn ở trường hôm đó.</div>'}

        ${n.chot ? `
          <div class="muted small mt-8" style="line-height:1.6">
            ${UI.esc(n.chot.nguoiChotTen || 'Đã chốt')} lúc ${UI.esc(UI.timeAgo(n.chot.chotLuc))}
            ${lech ? ` · lúc chốt máy tính ra ${UI.esc(String(n.chot.soSuatMay))} suất` : ''}
            ${n.chot.ghiChu ? `<div>${UI.esc(n.chot.ghiChu)}</div>` : ''}
          </div>` : ''}

        <button class="btn ${n.chot ? 'outline' : 'primary'} block mt-14" data-chot="${UI.esc(n.classId)}">
          ${UI.icon('check', 18)} ${n.chot ? 'Sửa số đã chốt' : 'Chốt báo ăn cho bếp'}
        </button>
      </div>`;
  },

  moChot(classId) {
    const n = (this._data.nhom || []).find(x => x.classId === classId);
    if (!n) return;
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        <div class="row-main">
          <div class="row-title">${UI.esc(n.tenNhom)}</div>
          <div class="row-sub">${UI.esc(UI.fmtDate(this._ngay))}</div>
        </div>
      </div>
      <div class="field">
        <label>Số suất báo cho bếp</label>
        <input type="number" id="ta-so" min="0" max="${UI.esc(String(n.siSo))}"
          value="${UI.esc(String(n.chot ? n.chot.soSuat : n.suatDuKien))}">
        <div class="hint">Sĩ số nhóm ${UI.esc(String(n.siSo))} bé, app tính ra ${UI.esc(String(n.suatDuKien))} suất.
          Suất của cô hay của khách thì ghi vào ô ghi chú giúp bếp.</div>
      </div>
      <div class="field">
        <label>Ghi chú gửi bếp</label>
        <input id="ta-ghichu" value="${UI.esc(n.chot ? n.chot.ghiChu : '')}"
          placeholder="Ví dụ: thêm 2 suất cho cô, bé Bin ăn cháo loãng">
      </div>
      <button class="btn primary block" id="ta-luu">${UI.icon('check', 18)} Chốt số này</button>
    `, 'Chốt báo ăn');
    document.getElementById('ta-luu').onclick = () => this.luuChot(classId);
  },

  async luuChot(classId) {
    const soSuat = Number(document.getElementById('ta-so').value);
    const ghiChu = document.getElementById('ta-ghichu').value.trim();
    try {
      await API.post('/api/tienan/bao-an', { ngay: this._ngay, classId, soSuat, ghiChu });
      UI.toast('Đã chốt báo ăn cho bếp', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ================= Đối chiếu tháng =================
  async manThang(than) {
    const d = await API.get(`/api/tienan/thang?thang=${encodeURIComponent(this._thang)}`);

    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Tháng đối chiếu</label>
          <input type="month" id="ta-thang" value="${UI.esc(this._thang)}">
        </div>
        <button class="btn outline block mt-14" id="ta-xuat">${UI.icon('report', 18)} Xuất ra Excel</button>
      </div>

      <div class="card">
        <div class="card-title">Cả tháng</div>
        ${this.dongSo('Số bé', d.tong.soBe)}
        ${this.dongSo('Tổng số ngày ăn ở trường', d.tong.soNgayAnOTruong)}
        ${this.dongSo('Tổng số ngày trường hoàn tiền ăn', d.tong.soNgayHoanTienAn)}
        ${d.tong.soDonVatThang ? `
          <div class="muted small mt-8" style="line-height:1.6">
            Có <b>${UI.esc(String(d.tong.soDonVatThang))} đơn nghỉ vắt qua hai tháng</b>.
            Văn phòng gõ tổng số ngày hoàn cho cả đơn chứ không gõ từng ngày, nên app
            <b>không tự chia</b> được — nó tính trọn vào tháng có ngày bắt đầu và đánh dấu
            để mình tự chia. Các dòng đó có ghi rõ bên dưới.
          </div>` : ''}
      </div>

      ${(d.danhSach || []).length
        ? (d.danhSach || []).map(x => this.theBe(x)).join('')
        : UI.emptyState('🧾', 'Tháng này chưa có bé nào trong phạm vi của mình.')}`;

    document.getElementById('ta-thang').onchange = (e) => { this._thang = e.target.value; App.route(); };
    document.getElementById('ta-xuat').onclick = () => {
      window.location.href = `/api/tienan/thang.csv?thang=${encodeURIComponent(this._thang)}`;
    };
  },

  theBe(x) {
    const canKiemTra = [
      ...x.donHoan.filter(d => d.vatThang)
        .map(d => `${UI.fmtDate(d.fromDate, { weekday: false })} – ${UI.fmtDate(d.toDate, { weekday: false })}: ${d.soNgay} ngày, đơn kéo sang tháng sau`),
      ...x.donVatSangThangNay
        .map(d => `${UI.fmtDate(d.fromDate, { weekday: false })} – ${UI.fmtDate(d.toDate, { weekday: false })}: ${d.soNgay} ngày, đã tính ở tháng trước`),
    ];
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          <div class="row-main">
            <div class="row-title">${UI.esc(x.hoTen)}</div>
            <div class="row-sub">${UI.esc(x.tenNhom)}${x.maBe ? ` · ${UI.esc(x.maBe)}` : ''}</div>
          </div>
          ${canKiemTra.length ? UI.badge('Cần kiểm tra tay', 'orange') : ''}
        </div>
        ${this.dongSo('Số ngày ăn ở trường', x.soNgayAnOTruong)}
        ${this.dongSo('Vắng có phép', x.soNgayVangCoPhep)}
        ${this.dongSo('Vắng không phép', x.soNgayVangKhongPhep)}
        ${this.dongSo('Trường hoàn tiền ăn', `${x.soNgayHoanTienAn} ngày`)}
        ${canKiemTra.length ? `
          <div class="muted small mt-8" style="line-height:1.6">
            ${canKiemTra.map(t => `<div>${UI.esc(t)}</div>`).join('')}
          </div>` : ''}
      </div>`;
  },
};
