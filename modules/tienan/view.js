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
  laGiaDinh() { return App.state.user.role === 'parent'; },

  async render(root) {
    this._ngay = this._ngay || UI.todayStr();
    this._thang = this._thang || UI.todayStr().slice(0, 7);
    if (!this.laVanPhong()) this._tab = 'ngay';

    // GIA ĐÌNH CÓ MÀN RIÊNG, KHÔNG PHẢI MỘT TAB BỚT ĐI (Đ204, việc 48 — Y3-b).
    //
    // Hai màn của trường đều bắt đầu bằng một lượt gọi mà gia đình nhận 403
    // (`/api/tienan/bao-an`, `/api/tienan/thang`), nên cho họ đi vào rồi giấu
    // bớt nút là màn trắng kèm một câu lỗi. Rẽ ngay từ đây.
    if (this.laGiaDinh()) {
      root.innerHTML = `${UI.pageHeader('Tiền ăn của con')}${UI.studentBar()}<div id="ta-than"></div>`;
      return this.manCuaBe(document.getElementById('ta-than'));
    }

    root.innerHTML = `
      ${UI.pageHeader('Tiền ăn')}
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

  // ================= Bảng tiền ăn của con (gia đình) =================
  //
  // Nhà trường đã hỏi lại ở DD-01 nên mở. Trước đợt này gia đình chỉ thấy kết
  // quả hoàn tiền của TỪNG ĐƠN nghỉ trên màn Xin phép — đúng phần họ cần biết
  // ngay, nhưng không trả lời được câu *"tháng này nhà tôi ăn bao nhiêu bữa"*,
  // mà đó mới là câu hỏi lúc nhận phiếu thu.
  //
  // MÀN NÀY KHÔNG TỰ CỘNG MỘT CON SỐ NÀO. Mọi số do máy chủ đưa xuống, tính
  // bằng đúng hàm đã dựng bảng của văn phòng — nhà và trường phải ra CÙNG một
  // con số, nếu không thì bảng này còn hại hơn là không có.
  async manCuaBe(than) {
    const be = App.currentStudent();
    if (!be) { than.innerHTML = UI.emptyState('🍲', 'Chưa có bé nào liên kết với tài khoản này'); return; }
    let d = null;
    try {
      d = await API.get(`/api/tienan/cua-be?studentId=${encodeURIComponent(be.id)}`
        + `&thang=${encodeURIComponent(this._thang)}`);
    } catch (err) {
      than.innerHTML = UI.emptyState('🍲', err.message || 'Chưa có số liệu tháng này');
      return;
    }

    const o = (nhan, so, phu) => `
      <div class="list-row">
        <div class="row-main">
          <div class="row-title">${UI.esc(nhan)}</div>
          ${phu ? `<div class="row-sub">${UI.esc(phu)}</div>` : ''}
        </div>
        <div class="row-end"><b>${UI.esc(String(so))}</b></div>
      </div>`;

    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Tháng</label>
          <input type="month" id="ta-be-thang" value="${UI.esc(this._thang)}">
        </div>
      </div>
      <div class="card">
        <div class="card-title">${UI.esc(d.be.hoTen)}${d.be.tenNhom ? ` · ${UI.esc(d.be.tenNhom)}` : ''}</div>
        ${o('Số ngày con ăn ở trường', d.soNgayAnOTruong)}
        ${o('Số ngày con nghỉ có phép', d.soNgayVangCoPhep)}
        ${o('Số ngày con nghỉ không phép', d.soNgayVangKhongPhep)}
        ${o('Số ngày trường nghỉ', d.soNgayTruongNghi, 'lễ, Tết, hoặc đợt trường thông báo')}
        ${o('Số ngày trường hoàn tiền ăn', d.soNgayHoanTienAn)}
      </div>

      ${(d.donHoan || []).length ? `
        <div class="card">
          <div class="card-title">Đơn xin nghỉ được hoàn tiền ăn trong tháng</div>
          ${d.donHoan.map(x => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(UI.fmtDateShort(x.fromDate))} → ${UI.esc(UI.fmtDateShort(x.toDate))}</div>
              </div>
              <div class="row-end">${UI.esc(String(x.soNgay))} ngày</div>
            </div>`).join('')}
        </div>` : ''}

      ${(d.dotTruongNghi || []).length ? `
        <div class="card">
          <div class="card-title">Đợt trường nghỉ chạm vào tháng này</div>
          ${d.dotTruongNghi.map(k => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(k.ten)}</div>
                <div class="row-sub">${UI.esc(UI.fmtDateShort(k.tuNgay))} → ${UI.esc(UI.fmtDateShort(k.denNgay))}</div>
              </div>
              <div class="row-end">${k.hoanTienAn === 'co' ? UI.badge('Có hoàn tiền ăn', 'green') : ''}</div>
            </div>`).join('')}
        </div>` : ''}

      <div class="card muted small" style="line-height:1.7">
        Đây là <b>số ngày</b>, chưa phải số tiền. Nhà trường nhân với đơn giá bữa ăn rồi
        ghi thành khoản thu — nên nếu con số ở đây khác với phiếu thu, nhắn văn phòng giúp
        nhà trường đối chiếu lại nhé.
      </div>`;

    const oThang = document.getElementById('ta-be-thang');
    if (oThang) oThang.onchange = () => { this._thang = oThang.value; App.route(); };
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
        ${d.tong.soNgayCoMatTrongDonHoan ? `
          <div class="muted small mt-8" style="line-height:1.6">
            Có <b>${UI.esc(String(d.tong.soNgayCoMatTrongDonHoan))} ngày</b> nằm trong đơn
            đã duyệt hoàn tiền ăn mà bé <b>vẫn tới lớp</b> — nhà đổi ý cho con đi học,
            và sổ điểm danh ghi theo ảnh con tới lớp. Những bữa đó trường đã nấu, nên
            <b>trừ ra khi chốt tháng</b>. App không tự trừ vì số ngày hoàn là do văn
            phòng gõ tổng tay, không biết được đã trừ sẵn hay chưa.
          </div>` : ''}
      </div>

      ${(d.danhSach || []).length
        ? (d.danhSach || []).map(x => this.theBe(x)).join('')
        : UI.emptyState('🧾', 'Tháng này chưa có bé nào trong phạm vi của mình.')}`;

    document.getElementById('ta-thang').onchange = (e) => { this._thang = e.target.value; App.route(); };
    document.getElementById('ta-xuat').onclick = () => {
      window.location.href = `/api/tienan/thang.xlsx?thang=${encodeURIComponent(this._thang)}`;
    };
  },

  theBe(x) {
    const canKiemTra = [
      ...x.donHoan.filter(d => d.vatThang)
        .map(d => `${UI.fmtDate(d.fromDate, { weekday: false })} – ${UI.fmtDate(d.toDate, { weekday: false })}: ${d.soNgay} ngày, đơn kéo sang tháng sau`),
      ...x.donVatSangThangNay
        .map(d => `${UI.fmtDate(d.fromDate, { weekday: false })} – ${UI.fmtDate(d.toDate, { weekday: false })}: ${d.soNgay} ngày, đã tính ở tháng trước`),
      ...x.donHoan.filter(d => d.soNgayBeCoMat > 0)
        .map(d => `${UI.fmtDate(d.fromDate, { weekday: false })} – ${UI.fmtDate(d.toDate, { weekday: false })}: ${d.soNgay} ngày hoàn, nhưng bé vẫn đi học ${d.soNgayBeCoMat} hôm — trừ ra`),
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
        ${x.soNgayCoMatTrongDonHoan
          ? this.dongSo('Trong đó bé vẫn đi học', `${x.soNgayCoMatTrongDonHoan} ngày — trừ ra`)
          : ''}
        ${canKiemTra.length ? `
          <div class="muted small mt-8" style="line-height:1.6">
            ${canKiemTra.map(t => `<div>${UI.esc(t)}</div>`).join('')}
          </div>` : ''}
      </div>`;
  },
};
