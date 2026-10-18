// TIỀN ĂN — màn hình.
//
// Hai người dùng, hai màn:
//
//   • NHÀ TRƯỜNG — ĐỐI CHIẾU THÁNG: văn phòng, cuối tháng, ngồi trước máy tính
//     với quyển sổ giấy bên cạnh. Màn này là một cái bảng, và nó được phép dài.
//
//   • GIA ĐÌNH — bảng tiền ăn của con.
//
// Tab "Báo ăn hằng ngày" đã gỡ khỏi màn (góp ý 16/10, mục 3: *"Mình k cần báo
// ăn lên cho bếp"*). Đường `/api/tienan/bao-an` và bảng `tienan_chot` giữ
// nguyên — số đã chốt trước đây vẫn còn.
//
// QUY TẮC 4: bảng đối chiếu KHÔNG bao giờ sắp các bé theo con số — luôn theo
// tên. Nó là sổ tiền của văn phòng, không phải nhận định về đứa trẻ.
App.views.tienan = {
  _thang: null,

  laGiaDinh() { return App.state.user.role === 'parent'; },

  async render(root) {
    this._thang = this._thang || UI.todayStr().slice(0, 7);

    // GIA ĐÌNH CÓ MÀN RIÊNG, KHÔNG PHẢI MỘT MÀN BỚT ĐI (Đ204, việc 48 — Y3-b).
    //
    // Màn của trường bắt đầu bằng một lượt gọi mà gia đình nhận 403
    // (`/api/tienan/thang`), nên cho họ đi vào rồi giấu bớt nút là màn trắng
    // kèm một câu lỗi. Rẽ ngay từ đây.
    if (this.laGiaDinh()) {
      root.innerHTML = `${UI.pageHeader('Tiền ăn của con')}${UI.studentBar()}<div id="ta-than"></div>`;
      return this.manCuaBe(document.getElementById('ta-than'));
    }

    root.innerHTML = `${UI.pageHeader('Đối chiếu tiền ăn tháng')}<div id="ta-than"></div>`;
    return this.manThang(document.getElementById('ta-than'));
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

  dongSo(nhan, gt) {
    return `<div class="list-row"><div class="row-main">
      <div class="row-sub">${UI.esc(nhan)}</div>
      <div class="row-title">${UI.esc(String(gt))}</div>
    </div></div>`;
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
