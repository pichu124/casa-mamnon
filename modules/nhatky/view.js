// NHẬT KÝ NGÀY — màn hình.
//
// Hai màn khác hẳn nhau vì hai việc khác hẳn nhau:
//
//   • CÔ ghi cho cả nhóm, NGAY SAU MỖI BỮA, tay còn bận. Nhà trường 07/09:
//     "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm một
//     loạt — tách riêng từng bữa theo thực đơn của nhà trường." Nên màn của
//     cô là một DẢI BƯỚC: [Bữa sáng] [Phụ sáng] [Bữa trưa] [Phụ chiều] [Sữa]
//     [Ngủ trưa] [Vệ sinh · Bỉm] [Ghi chú]. Mỗi bước là danh sách bé với đúng
//     một hai ô, có "Áp cho cả nhóm" và MỘT nút Lưu cho bước đó. Các bữa lấy
//     theo THỰC ĐƠN NGÀY ĐÓ của bếp cơ sở, máy chủ đưa xuống — hôm nào bếp
//     soạn bốn bữa thì có bốn bước bữa.
//
//   • GIA ĐÌNH đọc, buổi tối, trên điện thoại, mỗi lần một bé. Nên màn của gia
//     đình là từng ngày một, viết thành câu tiếng Việt chứ không phải bảng.
App.views.nhatky = {
  MUC_AN: [
    ['het', 'Ăn hết'],
    ['gan-het', 'Gần hết'],
    ['nua-suat', 'Khoảng nửa suất'],
    ['it', 'Ăn ít'],
    ['khong-an', 'Không ăn'],
  ],
  TINH_CHAT: [
    ['binh-thuong', 'Bình thường'],
    ['hoi-long', 'Hơi lỏng'],
    ['long', 'Lỏng'],
    ['tao', 'Táo'],
  ],
  // Ba bữa đời cũ — chỉ còn dùng để đọc dữ liệu từ máy chủ đời cũ chưa gửi
  // `buaAn`. Máy chủ mới thì màn gia đình đọc theo `buaAn` (năm bữa).
  BUA_NHAN: [['anSang', 'Sáng'], ['anTrua', 'Trưa'], ['anXe', 'Xế']],
  // Ba bước không phải bữa ăn, đứng sau các bữa. `truong` là các cột mà bước
  // đó gửi lên — máy chủ chỉ ghi đúng các cột này, phần khác giữ nguyên.
  BUOC_KHAC: [
    { ma: 'ngu', ten: 'Ngủ trưa', kieu: 'ngu', truong: ['nguTuLuc', 'nguDenLuc', 'nguGhiChu'] },
    { ma: 'vesinh', ten: 'Vệ sinh · Bỉm', kieu: 'vesinh', truong: ['veSinhSoLan', 'veSinhTinhChat', 'bimSoLan', 'buBinhSoLan', 'buBinhMl'] },
    { ma: 'ghichu', ten: 'Ghi chú', kieu: 'ghichu', truong: ['anGhiChu', 'ghiChu'] },
  ],
  _ngay: null,
  _classId: null,
  _buoc: null,
  _data: null,

  // Danh sách giờ ngủ để cô CHỌN thay vì gõ.
  //
  // Giờ đã lưu mà nằm ngoài khung vẫn được ghép vào danh sách. Không có phần
  // này thì mở lại một bản ghi cũ sẽ thấy ô trống, và cô bấm Lưu lần nữa là
  // xoá mất giờ chính cô đã ghi hôm trước — mất dữ liệu mà không ai kịp thấy.
  gioChon(dangChon) {
    const khung = (this._data && this._data.khungGioNgu) || [];
    const ds = khung.slice();
    if (dangChon && !ds.includes(dangChon)) { ds.push(dangChon); ds.sort(); }
    return ds;
  },

  oGio(thuocTinh, dangChon, nhan) {
    return `
      <select ${thuocTinh}>
        <option value="">— ${UI.esc(nhan)} —</option>
        ${this.gioChon(dangChon).map(g =>
          `<option value="${UI.esc(g)}" ${g === dangChon ? 'selected' : ''}>${UI.esc(g)}</option>`).join('')}
      </select>`;
  },

  nhanMucAn(ma) {
    const t = this.MUC_AN.find(x => x[0] === ma);
    return t ? t[1] : '';
  },
  nhanTinhChat(ma) {
    const t = this.TINH_CHAT.find(x => x[0] === ma);
    return t ? t[1] : '';
  },

  // Các bước của một ngày: từng bữa theo thực đơn ngày đó, rồi ngủ, vệ sinh,
  // ghi chú. Máy chủ đời cũ không gửi `buaAn` thì về ba bữa sáng / trưa / xế.
  cacBuoc(d) {
    const ds = (d && Array.isArray(d.buaAn) && d.buaAn.length) ? d.buaAn
      : [{ bua: 'breakfast', ten: 'Bữa sáng' }, { bua: 'lunch', ten: 'Bữa trưa' }, { bua: 'snack', ten: 'Bữa phụ chiều' }];
    return [
      ...ds.map(b => ({ ma: `bua:${b.bua}`, ten: b.ten, kieu: 'bua', bua: b })),
      ...this.BUOC_KHAC,
    ];
  },

  buocHienTai() {
    const ds = this.cacBuoc(this._data);
    return ds.find(b => b.ma === this._buoc) || ds[0];
  },

  // Bước mở sẵn khi cô vào màn: BỮA GẦN NHẤT ĐÃ TỚI GIỜ trong ngày hôm nay —
  // 11 giờ mở ra là đứng ở Bữa trưa, không phải Bữa sáng. Ngày cũ thì bước
  // đầu. Cô bấm dải chọn để đi bước khác, và app nhớ bước đó cho tới khi đổi.
  buocMacDinh(d) {
    const ds = this.cacBuoc(d);
    if (this._ngay !== UI.todayStr()) return ds[0].ma;
    const gio = UI.gioVN();
    let chon = ds[0];
    for (const b of ds) if (b.kieu === 'bua' && b.bua.gio && b.bua.gio <= gio) chon = b;
    return chon.ma;
  },

  // Mức và ghi chú của một bé cho bữa `kieu`, từ `buaAn` máy chủ gửi kèm.
  buaCuaBe(b, kieu) {
    return ((b && b.buaAn) || []).find(x => x.bua === kieu) || { muc: '', ghiChu: '', capNhatLuc: '' };
  },

  // ===========================================================================
  // NHÁP TRONG MÁY — GIỮ PHẦN CÔ ĐANG GÕ QUA MỘT LẦN APP BỊ ĐÓNG
  // ===========================================================================
  //
  // Mỗi bước là một trang ngắn, nhưng vẫn là hai mươi bé chưa ở đâu cả cho tới
  // lúc bấm Lưu. Trên điện thoại của cô: có người gọi tới, cô chuyển sang app
  // khác, hệ điều hành đóng trình duyệt để lấy bộ nhớ. Mở lại là trắng.
  //
  // VÌ SAO KHÔNG TỰ ĐIỀN LẠI, MÀ HỎI
  //
  // Một nhóm có nhiều cô. Trong lúc bản nháp nằm trong máy cô A, cô B có thể đã
  // ghi và lưu từ máy của mình. Tự điền đè lên là lấy bản cũ của cô A ghi chồng
  // lên bản mới của cô B ngay lần bấm Lưu tiếp theo — âm thầm, và không ai biết.
  // Nên app hiện một dải nhắc và để cô chọn.
  //
  // NHÁP THEO TỪNG BƯỚC (nhóm, ngày, bước): lưu xong Bữa trưa thì chỉ nháp của
  // Bữa trưa hết việc; phần gõ dở ở bước Ngủ trưa vẫn còn đó chờ cô quay lại.
  KHOA_NHAP: 'casa.nhatky-nhap',
  HAN_NHAP_MS: 24 * 60 * 60 * 1000,   // nhật ký là của ĐÚNG một ngày; quá hạn thì bỏ

  khoaNhap(classId, ngay, buoc) {
    return `${this.KHOA_NHAP}.${classId}.${ngay}.${buoc || this._buoc || ''}`;
  },

  // Đọc mọi ô đang hiện thành { "<mã bé>|<tên trường>": giá trị }.
  ganhO() {
    const o = {};
    for (const el of document.querySelectorAll('.nk-o')) {
      o[`${el.dataset.be}|${el.dataset.truong}`] = el.value;
    }
    return o;
  },

  // Ô cô ĐÃ THẬT SỰ GÕ trong phiên này, theo từng (nhóm, ngày, bước). Nháp chỉ
  // giữ và điền lại những ô đó: các ô còn lại trên màn là giá trị máy chủ TẠI
  // THỜI ĐIỂM CHỤP — chụp cả chúng vào nháp rồi điền lại là lấy bản cũ ghi đè
  // bản mới cô khác vừa lưu, đúng thứ lời nhắc bên dưới hứa sẽ không làm.
  _oDaGo: {},

  oDaGoCua(khoa) {
    if (!this._oDaGo[khoa]) this._oDaGo[khoa] = new Set();
    return this._oDaGo[khoa];
  },

  luuNhap() {
    try {
      const khoa = this.khoaNhap(this._classId, this._ngay);
      const goPhien = this.oDaGoCua(khoa);
      if (!goPhien.size) return;   // phiên này chưa gõ gì thì đừng đụng nháp cũ
      let cuu = null;
      try { cuu = JSON.parse(localStorage.getItem(khoa) || 'null'); } catch (_) { cuu = null; }
      const o = {};
      // Phần phiên TRƯỚC còn giữ (app từng bị đóng giữa chừng): giữ nguyên giá
      // trị đã chụp — màn hình bây giờ đang hiện giá trị máy chủ, không phải
      // thứ cô đã gõ hôm đó.
      if (cuu && cuu.o && Array.isArray(cuu.go)) {
        for (const k of cuu.go) if (k in cuu.o) o[k] = cuu.o[k];
      }
      // Phần phiên NÀY: lấy từ màn hình, đè lên bản cũ của chính ô đó.
      const tatCa = this.ganhO();
      for (const k of goPhien) if (k in tatCa) o[k] = tatCa[k];
      if (!Object.keys(o).length) return;
      localStorage.setItem(khoa, JSON.stringify({ luc: Date.now(), o, go: Object.keys(o) }));
    } catch (_) { /* hết chỗ hay bị chặn: không phải lý do làm hỏng màn hình */ }
  },

  xoaNhap(classId, ngay, buoc) {
    try { localStorage.removeItem(this.khoaNhap(classId || this._classId, ngay || this._ngay, buoc)); } catch (_) { }
  },

  docNhap() {
    try {
      const raw = localStorage.getItem(this.khoaNhap(this._classId, this._ngay));
      if (!raw) return null;
      const n = JSON.parse(raw);
      if (!n || typeof n.o !== 'object' || !n.o) return null;
      if (!Number.isFinite(n.luc) || Date.now() - n.luc > this.HAN_NHAP_MS) {
        this.xoaNhap();
        return null;
      }
      return n;
    } catch (_) { return null; }
  },

  // Nháp chỉ đáng nhắc khi nó KHÁC những gì máy chủ vừa trả về. Trùng khít thì
  // nó đã được lưu rồi — nhắc lúc đó là dạy cô bỏ qua mọi lời nhắc sau này.
  napLaiNhap() {
    const n = this.docNhap();
    if (!n) return;
    const dangCo = this.ganhO();
    // Nháp đời cũ (chưa ghi danh sách ô đã gõ) thì đành coi mọi ô là đã gõ.
    const goSet = Array.isArray(n.go) ? new Set(n.go) : new Set(Object.keys(n.o));
    const khac = Object.keys(n.o).filter(k => goSet.has(k) && k in dangCo && n.o[k] !== dangCo[k]);
    if (!khac.length) { this.xoaNhap(); return; }

    const dai = document.createElement('div');
    dai.className = 'card';
    dai.style.borderLeft = '3px solid #f2994a';
    dai.innerHTML = `
      <div style="line-height:1.7">
        <b>Cô có phần nhập dở chưa lưu</b> của đúng bước này, ngày và nhóm này
        (${UI.esc(String(khac.length))} ô), còn lại từ lần mở trước.
      </div>
      <div class="muted small mt-8" style="line-height:1.6">
        Trong lúc đó cô khác cùng nhóm có thể đã ghi và lưu rồi, nên app không tự
        điền đè. Cô xem rồi chọn giúp.
      </div>
      <div class="flex mt-14" style="gap:8px">
        <button class="btn primary sm" id="nk-nhap-dung">Điền lại phần dở</button>
        <button class="btn outline sm" id="nk-nhap-bo">Bỏ phần dở</button>
      </div>`;
    const neo = document.getElementById('nk-dau');
    if (neo && neo.parentNode) neo.parentNode.insertBefore(dai, neo.nextSibling);
    else document.getElementById('view').appendChild(dai);

    document.getElementById('nk-nhap-dung').onclick = () => {
      // Chỉ điền đúng những ô ĐÃ GÕ và đang khác — không quét cả nháp lên màn:
      // phần còn lại của nháp là giá trị máy chủ lúc chụp, điền lại chúng là
      // ghi đè thứ cô khác vừa lưu bằng một bản cũ.
      const goPhien = this.oDaGoCua(this.khoaNhap(this._classId, this._ngay));
      for (const el of document.querySelectorAll('.nk-o')) {
        const k = `${el.dataset.be}|${el.dataset.truong}`;
        if (khac.includes(k)) { el.value = n.o[k]; goPhien.add(k); }
      }
      dai.remove();
      UI.toast('Đã điền lại phần cô nhập dở — nhớ bấm Lưu', 'success');
    };
    document.getElementById('nk-nhap-bo').onclick = () => {
      this.xoaNhap();
      dai.remove();
    };
  },

  // Ghi nháp sau mỗi lần cô gõ, nhưng gom lại — gõ một chữ ghi một lần thì
  // localStorage bị đập liên tục trên đúng loại máy yếu mà trường đang dùng.
  ganGhiNhap() {
    // Gắn ĐÚNG MỘT LẦN: phần tử #view sống xuyên các lần vẽ lại màn hình,
    // trước đây mỗi lần mở màn là chồng thêm một cặp bộ nghe với đồng hồ hẹn
    // riêng — gõ một chữ là ghi nháp N lần trên đúng loại máy yếu đang né.
    if (this._daGanNhap) return;
    this._daGanNhap = true;
    const view = document.getElementById('view');
    if (!view) return;
    let hen = null;
    const danhDau = (e) => {
      if (!e.target.classList.contains('nk-o')) return;
      // Ghi nhớ ô này là ô CÔ GÕ — nháp chỉ giữ những ô như vậy.
      this.oDaGoCua(this.khoaNhap(this._classId, this._ngay))
        .add(`${e.target.dataset.be}|${e.target.dataset.truong}`);
      clearTimeout(hen);
      hen = setTimeout(() => this.luuNhap(), 500);
    };
    view.addEventListener('input', danhDau);
    view.addEventListener('change', danhDau);
  },

  async render(root) {
    if (App.state.user.role === 'parent') return this.manGiaDinh(root);
    return this.manCoGiao(root);
  },

  // ================= Màn của cô: từng bước, cả nhóm một lượt =================
  async manCoGiao(root) {
    // Nhóm của cô, cho cả nhóm mặc định LẪN ô chọn bên dưới. Trước đây ô chọn
    // liệt kê nhóm của cả trường, nên cô bấm nhầm sang nhóm không phụ trách là
    // rơi vào màn "Có lỗi xảy ra" (403).
    const nhomCua = App.nhomCuaCo();
    const nhom = nhomCua.map(c => c.id);
    this._classId = this._classId || nhom[0] || '';
    this._ngay = this._ngay || UI.todayStr();

    if (!this._classId) {
      root.innerHTML = UI.pageHeader('Nhật ký ngày')
        + UI.emptyState('📔', 'Cô chưa phụ trách nhóm nào nên chưa ghi nhật ký được.');
      return;
    }

    const d = await API.get(
      `/api/nhatky?classId=${encodeURIComponent(this._classId)}&ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;
    const cacBuoc = this.cacBuoc(d);
    if (!cacBuoc.some(b => b.ma === this._buoc)) this._buoc = this.buocMacDinh(d);
    const buoc = this.buocHienTai();

    const dsBe = d.danhSach || [];
    const coNhaTre = dsBe.some(b => b.laNhaTre);

    const theDau = `
      <div class="card" id="nk-dau">
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Ngày</label>
            <input type="date" id="nk-ngay" value="${UI.esc(this._ngay)}" max="${UI.esc(UI.todayStr())}">
          </div>
          ${nhomCua.length > 1 ? `
            <div class="field" style="margin:0">
              <label>Nhóm</label>
              <select id="nk-nhom">
                ${nhomCua.map(c => `
                  <option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>
      </div>`;

    // NHÓM TOÀN BÉ LỚN: KHÔNG PHẢI LỖI, CHỈ LÀ KHÔNG DÙNG.
    //
    // Nhà trường 07/09: "Nhật ký ngày sẽ được tự động bỏ đi với các bạn không
    // phải lớp nhà trẻ." Ô ở trang chủ đã ẩn (dieuKienHien), nhưng cô vẫn có
    // thể tới đây bằng địa chỉ cũ hay từ nhóm khác — nói nhẹ nhàng, giữ ô chọn
    // nhóm để cô phụ trách hai nhóm chuyển sang nhóm nhà trẻ của mình.
    if (dsBe.length && !coNhaTre) {
      root.innerHTML = `
        ${UI.pageHeader('Nhật ký ngày')}
        ${theDau}
        ${UI.emptyState('📔', 'Nhóm này không có bé nhà trẻ nên không dùng Nhật ký ngày.')}
        <div class="muted small center" style="padding:0 16px 16px;line-height:1.6">
          Nhật ký ăn, ngủ, vệ sinh, bỉm là của lứa nhà trẻ (dưới 36 tháng).
          Với các bé lớn hơn, gia đình theo dõi qua ảnh đón bé, thực đơn và lịch sinh hoạt.
        </div>`;
      this.ganDoiNgayNhom();
      return;
    }

    root.innerHTML = `
      ${UI.pageHeader('Nhật ký ngày')}
      ${theDau}

      <div class="seg" role="tablist" aria-label="Bước ghi" style="overflow-x:auto">
        ${cacBuoc.map(b => `
          <button class="${b.ma === buoc.ma ? 'active' : ''}" data-buoc="${UI.esc(b.ma)}" role="tab"
            aria-selected="${b.ma === buoc.ma ? 'true' : 'false'}">${UI.esc(b.ten)}</button>`).join('')}
      </div>

      ${this.theBuoc(buoc)}

      ${dsBe.length ? dsBe.map(b => this.theBe(b, buoc)).join('')
        : UI.emptyState('📔', 'Nhóm này chưa có bé nào.')}

      ${dsBe.length ? `
        <button class="btn primary block mt-14" id="nk-luu">${UI.icon('check', 18)} Lưu ${UI.esc(buoc.ten)} cho cả nhóm</button>` : ''}`;

    this.ganDoiNgayNhom();
    const nutAp = document.getElementById('nk-ap');
    if (nutAp) nutAp.onclick = () => this.apCaNhom();
    const btn = document.getElementById('nk-luu');
    if (btn) btn.onclick = () => this.luu();

    // Nút "+1" bỉm: bấm một cái là thêm một lần — cô đang bế bé, không gõ số.
    for (const nut of document.querySelectorAll('.nk-bim-them')) {
      nut.onclick = () => {
        const o = document.querySelector(`.nk-o[data-be="${nut.dataset.be}"][data-truong="bimSoLan"]`);
        if (!o) return;
        const n = Number(o.value);
        o.value = String((Number.isInteger(n) && n >= 0 ? n : 0) + 1);
        // Đặt `.value` bằng mã không phát sự kiện — phát tay để bộ ghi nháp và
        // bộ "đang gõ dở" nghe thấy như một lần gõ thật.
        o.dispatchEvent(new Event('input', { bubbles: true }));
      };
    }

    this.napLaiNhap();
    this.ganGhiNhap();
  },

  // ĐỔI NGÀY, ĐỔI NHÓM, ĐỔI BƯỚC LÀ VẼ LẠI TOÀN BỘ — nên phải hỏi khi cô đang gõ dở.
  //
  // `App.route()` thay sạch nội dung `#view`, nghĩa là mọi ô cô vừa điền mà
  // chưa bấm Lưu đều mất. Cô nhập cho hai mươi bé, chạm nhầm ô ngày, mất cả
  // lượt — và app không nói một lời nào.
  //
  // Chỉ hỏi khi THẬT SỰ có thay đổi chưa lưu. Hỏi khi không có gì để mất thì
  // lần thứ ba cô sẽ bấm "Đồng ý" theo phản xạ, và lời hỏi thành vô dụng.
  ganDoiNgayNhom() {
    const nhoMoc = () => {
      this._moc = [...document.querySelectorAll('.nk-o')].map(o => o.value).join('\u0001');
    };
    const dangGoDo = () => {
      if (this._moc === undefined) return false;
      return [...document.querySelectorAll('.nk-o')].map(o => o.value).join('\u0001') !== this._moc;
    };
    const doiMan = (dat) => {
      if (dangGoDo() && !confirm('Cô đang nhập dở mà chưa bấm Lưu.\n\n'
        + 'Chuyển sang ngày, nhóm hay bước khác sẽ mất phần vừa nhập. Cô vẫn chuyển chứ?')) {
        App.route();      // vẽ lại để ô chọn quay về đúng chỗ cũ
        return;
      }
      dat();
      App.route();
    };
    nhoMoc();

    const oNgay = document.getElementById('nk-ngay');
    if (oNgay) oNgay.onchange = (e) => {
      const v = e.target.value;
      doiMan(() => { this._ngay = v; this._buoc = null; });
    };
    const selNhom = document.getElementById('nk-nhom');
    if (selNhom) {
      selNhom.onchange = (e) => {
        const v = e.target.value;
        doiMan(() => { this._classId = v; });
      };
    }
    for (const nut of document.querySelectorAll('.seg [data-buoc]')) {
      nut.onclick = () => {
        const v = nut.dataset.buoc;
        if (v === this._buoc) return;
        doiMan(() => { this._buoc = v; });
      };
    }
  },

  // Thẻ đầu bước: món của bữa (từ thực đơn, cô không gõ lại) và "Áp cho cả nhóm".
  theBuoc(buoc) {
    let mon = '';
    if (buoc.kieu === 'bua') {
      const b = buoc.bua || {};
      mon = (b.mon || []).length ? `
        <div class="muted small" style="margin-bottom:10px;line-height:1.6">
          ${b.gio ? `${UI.esc(b.gio)} · ` : ''}<b>${UI.esc((b.mon || []).join(', '))}</b>
          <span class="muted">— theo thực đơn của bếp, cô không phải gõ lại</span>
        </div>` : '';
    }
    let ap = '';
    if (buoc.kieu === 'bua') {
      ap = `
        <div class="field" style="margin:0">
          <label>Cả nhóm ăn</label>
          <select id="nk-ca-muc">
            <option value="">— không đặt —</option>
            ${this.MUC_AN.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')}
          </select>
        </div>`;
    } else if (buoc.kieu === 'ngu') {
      ap = `
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Ngủ từ</label>
            ${this.oGio('id="nk-ca-ngu-tu"', '', 'từ')}</div>
          <div class="field" style="margin:0"><label>Dậy lúc</label>
            ${this.oGio('id="nk-ca-ngu-den"', '', 'đến')}</div>
        </div>`;
    } else if (buoc.kieu === 'vesinh') {
      ap = `
        <div class="field" style="margin:0">
          <label>Tình trạng cả nhóm</label>
          <select id="nk-ca-vs">
            <option value="">— không đặt —</option>
            ${this.TINH_CHAT.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')}
          </select>
        </div>`;
    }
    return `
      <div class="card">
        <div class="card-title">${UI.esc(buoc.ten)}</div>
        ${mon}
        ${ap ? `
          <div class="muted small" style="margin-bottom:10px">Đặt nhanh cho cả nhóm rồi sửa lại riêng bé nào khác.</div>
          ${ap}
          <button class="btn outline block mt-14" id="nk-ap">Áp cho cả nhóm</button>` : `
          <div class="muted small" style="line-height:1.6">
            Ô nào cô chưa kịp ghi thì để trống — màn hình của gia đình sẽ nói
            <b>"cô chưa ghi"</b>, chứ không nói bé không ăn.
          </div>`}
      </div>`;
  },

  // Một thẻ cho một bé, chỉ các ô của BƯỚC đang mở.
  //
  // MỌI Ô NHẬP ĐỀU NẰM TRONG `.field`, KHÔNG CÓ Ô NÀO ĐỨNG TRẦN.
  //
  // CSS chung chỉ cấp đệm cho ô nằm trong `.field`. Ô đứng trần cao đúng 21px
  // trên khổ điện thoại — nhỏ hơn đầu ngón tay người lớn cầm máy một tay. Cô sẽ
  // bấm hai ba lần, hoặc bấm nhầm sang ô của BÉ KHÁC ngay bên cạnh.
  //
  // Chỗ này từng sai đúng như vậy ở hai ô giờ ngủ và hai ô ghi chú; bộ canh bố
  // cục điện thoại trong `test/man-hinh-phan-he.test.mjs` mục [7] tìm ra.
  theBe(b, buoc) {
    const id = UI.esc(b.studentId);
    const bua = buoc.kieu === 'bua' ? this.buaCuaBe(b, buoc.bua.bua) : null;
    // Nhớ dấu thời gian bản ghi lúc màn hình NẠP VỀ, để lúc lưu gửi kèm.
    // Máy chủ dùng nó để biết cô khác có vừa ghi cho bé này không — xem chú
    // thích dài ở `PUT /api/nhatky` trong routes.js. Bước bữa ăn thì là dấu
    // của ĐÚNG DÒNG BỮA ĐÓ, không phải của cả ngày.
    (this._goc || (this._goc = {}))[b.studentId] = (bua ? bua.capNhatLuc : b.capNhatLuc) || '';
    // `data-nghi` để `apCaNhom()` bỏ qua bé này. Đánh dấu ở tầng ô chứ không
    // lọc ở tầng thẻ: cô vẫn gõ tay được cho bé, chỉ thao tác ĐIỀN HÀNG LOẠT
    // mới né ra.
    const dnghi = b.nghiPhep ? ' data-nghi="1"' : '';
    const chon = (ma, ds, dangChon) => `
      <select class="nk-o"${dnghi} data-be="${id}" data-truong="${UI.esc(ma)}">
        <option value="">— chưa ghi —</option>
        ${ds.map(([v, t]) => `<option value="${UI.esc(v)}" ${dangChon === v ? 'selected' : ''}>${UI.esc(t)}</option>`).join('')}
      </select>`;
    const so = (ma, gt, ph) => `
      <input type="number" min="0" class="nk-o"${dnghi} data-be="${id}" data-truong="${UI.esc(ma)}"
        value="${gt === null || gt === undefined ? '' : UI.esc(String(gt))}" placeholder="${UI.esc(ph)}">`;
    const chu = (ma, gt, ph) => `
      <div class="field mt-8" style="margin-bottom:0">
        <input class="nk-o" data-be="${id}" data-truong="${UI.esc(ma)}" placeholder="${UI.esc(ph)}"
          value="${UI.esc(gt || '')}">
      </div>`;

    // BÉ ĐANG NGHỈ CÓ PHÉP: NÓI RA NGAY TRÊN THẺ.
    //
    // Không giấu thẻ đi — bé có thể vẫn tới lớp dù nhà đã xin nghỉ, và cô vẫn
    // phải ghi được. Nhưng để bé nằm lẫn giữa các bạn mà không một dấu hiệu nào
    // thì cú "áp cả nhóm" điền luôn cho bé, và chiều tối mẹ đọc được "ăn hết
    // bát cơm, ngủ 11h30–14h" về đúng ngày con nằm nhà sốt.
    const nghi = b.nghiPhep;
    const daiNghi = nghi ? `
      <div class="muted small" style="padding:0 2px 10px;line-height:1.6">
        Gia đình đã xin nghỉ hôm nay${nghi.reason ? ` — ${UI.esc(nghi.reason)}` : ''}.
        Cô vẫn ghi được nếu bé có tới lớp.
      </div>` : '';

    let than = '';
    let daGhi = false;
    if (buoc.kieu === 'bua') {
      daGhi = !!(bua.muc || bua.ghiChu);
      const ma = `bua.${buoc.bua.bua}`;
      than = `
        <div class="field" style="margin:0"><label>${UI.esc(buoc.ten)}</label>${chon(`${ma}.muc`, this.MUC_AN, bua.muc)}</div>
        ${chu(`${ma}.ghiChu`, bua.ghiChu, 'Ghi chú ngắn về bữa này')}`;
    } else if (buoc.kieu === 'ngu') {
      daGhi = !!(b.nguTuLuc || b.nguDenLuc);
      than = `
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Từ</label>
            ${this.oGio(`class="nk-o"${dnghi} data-be="${id}" data-truong="nguTuLuc"`, b.nguTuLuc || '', 'từ')}</div>
          <div class="field" style="margin:0"><label>Đến</label>
            ${this.oGio(`class="nk-o"${dnghi} data-be="${id}" data-truong="nguDenLuc"`, b.nguDenLuc || '', 'đến')}</div>
        </div>
        ${chu('nguGhiChu', b.nguGhiChu, 'Ví dụ: ngủ ngon, hoặc trằn trọc đầu giờ')}`;
    } else if (buoc.kieu === 'vesinh') {
      daGhi = (b.veSinhSoLan !== null && b.veSinhSoLan !== undefined) || !!b.veSinhTinhChat
        || (b.bimSoLan !== null && b.bimSoLan !== undefined);
      // Ô bỉm và sữa CHỈ cho bé nhà trẻ — bé lớn không thấy ô, đúng như sổ giấy
      // của nhóm Lá không có cột thay bỉm.
      than = `
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Vệ sinh (lần)</label>${so('veSinhSoLan', b.veSinhSoLan, 'số lần')}</div>
          <div class="field" style="margin:0"><label>Tình trạng</label>${chon('veSinhTinhChat', this.TINH_CHAT, b.veSinhTinhChat)}</div>
        </div>
        ${b.laNhaTre ? `
          <div class="section-label">Bỉm · Sữa</div>
          <div class="grid-2">
            <div class="field" style="margin:0"><label>Thay bỉm (lần)</label>
              <div class="flex" style="gap:6px;align-items:stretch">
                <div style="flex:1;min-width:0">${so('bimSoLan', b.bimSoLan, 'số lần')}</div>
                <button type="button" class="btn primary nk-bim-them" data-be="${id}" style="padding:0 18px;font-size:1.05rem" aria-label="Thêm một lần thay bỉm">+1</button>
              </div>
            </div>
            <div class="field" style="margin:0"><label>Bú bình (lần)</label>${so('buBinhSoLan', b.buBinhSoLan, 'số lần')}</div>
          </div>
          <div class="field mt-8" style="margin-bottom:0"><label>Tổng lượng sữa (ml)</label>${so('buBinhMl', b.buBinhMl, 'ml')}</div>` : ''}`;
    } else {
      daGhi = !!(b.ghiChu || b.anGhiChu);
      than = `
        ${chu('anGhiChu', b.anGhiChu, 'Ghi chú chung về ăn uống hôm nay')}
        <div class="field mt-8" style="margin:0">
          <label>Lời nhắn cho gia đình</label>
          <textarea class="nk-o" data-be="${id}" data-truong="ghiChu" rows="2"
            placeholder="Hôm nay có gì gia đình cần biết ạ">${UI.esc(b.ghiChu || '')}</textarea>
        </div>`;
    }

    return `
      <div class="card"${nghi ? ' style="opacity:.75"' : ''}>
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(b.avatar, 40)}
          <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
          ${nghi ? UI.badge('Nghỉ hôm nay', 'orange') : ''}
          ${daGhi ? UI.badge('Đã ghi', 'green') : ''}
        </div>
        ${daiNghi}
        ${than}
      </div>`;
  },

  // Áp một lựa chọn cho mọi bé — chỗ giúp cô xong cả nhóm trong vài phút.
  //
  // MẶC ĐỊNH CHỈ ĐIỀN Ô CÒN TRỐNG, KHÔNG GHI ĐÈ PHẦN CÔ ĐÃ CHỈNH RIÊNG.
  //
  // Bản đầu gán thẳng giá trị cho MỌI ô cùng tên trường: không hỏi lại, không
  // đếm, không chừa ô nào. Mà biểu mẫu được nạp sẵn bằng giá trị ĐÃ LƯU của
  // từng bé, nên một lần chạm nhầm rồi bấm Lưu là xoá cả phần đã ghi trong
  // ngày — bé dị ứng ăn nửa suất, bé ốm ngủ ngắn, tất cả về cùng một giá trị.
  //
  // Màn điểm danh của app 1 đã trả giá cho đúng bài học này và làm ngược lại
  // (`public/js/views/attendance.js` — hàm `markAll`): đếm rõ bao nhiêu ô còn
  // trống, bao nhiêu ô đã có, và tách hẳn hai nút. Chép nguyên cách đó sang đây.
  apCaNhom() {
    const buoc = this.buocHienTai();
    const gt = (id) => { const o = document.getElementById(id); return o ? o.value : ''; };
    let muon = [];
    if (buoc.kieu === 'bua') muon = [[`bua.${buoc.bua.bua}.muc`, gt('nk-ca-muc')]];
    else if (buoc.kieu === 'ngu') muon = [['nguTuLuc', gt('nk-ca-ngu-tu')], ['nguDenLuc', gt('nk-ca-ngu-den')]];
    else if (buoc.kieu === 'vesinh') muon = [['veSinhTinhChat', gt('nk-ca-vs')]];
    muon = muon.filter(([, v]) => v);
    if (!muon.length) return UI.toast('Cô chọn ít nhất một mục để áp nhé', 'error');

    // BỎ QUA BÉ ĐANG NGHỈ CÓ PHÉP.
    //
    // "Áp cả nhóm" là thao tác mà cả phân hệ được thiết kế quanh nó — ghi 20 bé
    // dưới 5 phút. Nhưng chính vì nó điền cho MỌI ô đang hiện, bé nghỉ ăn trọn
    // cú đó mà không ai để ý, và chiều tối gia đình đọc được "ăn hết bát cơm,
    // ngủ 11h30–14h" về đúng ngày con nằm nhà.
    //
    // Bỏ qua ở đây, KHÔNG khoá ô: cô vẫn gõ tay được cho bé nếu bé có tới lớp.
    const o = [...document.querySelectorAll('.nk-o')]
      .filter(x => muon.some(([truong]) => x.dataset.truong === truong))
      .filter(x => !x.dataset.nghi);
    const soNghi = new Set([...document.querySelectorAll('.nk-o[data-nghi]')]
      .map(x => x.dataset.be)).size;
    const trong = o.filter(x => !x.value);
    const daCo = o.length - trong.length;

    const dien = (ghiDe) => {
      const dich = ghiDe ? o : trong;
      for (const x of dich) {
        const v = (muon.find(([truong]) => truong === x.dataset.truong) || [])[1];
        if (v) x.value = v;
      }
      UI.closeModal();
      // Đặt `.value` bằng mã KHÔNG phát ra sự kiện `input`, nên bộ ghi nháp
      // không nghe thấy gì — và cũng không ai ĐÁNH DẤU các ô này là "cô đã
      // gõ". Nháp chỉ giữ ô đã gõ (Đ118o), nên phải đánh dấu trước rồi mới
      // gọi thẳng; nếu không thì đúng thao tác điền nhanh nhất của cô lại là
      // thao tác duy nhất không được giữ.
      const goPhien = this.oDaGoCua(this.khoaNhap(this._classId, this._ngay));
      for (const x of dich) goPhien.add(`${x.dataset.be}|${x.dataset.truong}`);
      this.luuNhap();
      UI.toast(`Đã điền ${dich.length} ô.`
        + (soNghi ? ` Bỏ qua ${soNghi} bé có đơn nghỉ hôm nay.` : '')
        + ' Cô sửa lại riêng bé nào khác rồi bấm Lưu.', 'success');
    };

    // Không có gì để giữ thì đừng bắt cô bấm thêm một lần — hỏi khi không có gì
    // để hỏi cũng là một kiểu làm phiền.
    if (!daCo) return dien(false);

    UI.modal(`
      <p style="line-height:1.6">Điền <b>${trong.length} ô còn trống</b> của cả nhóm?</p>
      <p class="muted small" style="line-height:1.6">
        <b>${daCo} ô cô đã điền riêng sẽ giữ nguyên</b> — bé ăn nửa suất, bé ngủ ngắn,
        cô đã ghi thế nào thì vẫn thế.
      </p>
      ${trong.length
    ? `<button class="btn primary block mt-14" id="nk-ap-trong">Điền ${trong.length} ô còn trống</button>`
    : '<p class="muted small mt-8">Không còn ô trống nào.</p>'}
      <button class="btn outline block mt-8" id="nk-ap-de">
        Ghi đè cả nhóm
        <span class="muted small">(${daCo} ô cô đã điền sẽ bị thay)</span>
      </button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Áp cho cả nhóm');

    const nutTrong = document.getElementById('nk-ap-trong');
    if (nutTrong) nutTrong.onclick = () => dien(false);
    document.getElementById('nk-ap-de').onclick = () => dien(true);
  },

  // LƯU MỘT BƯỚC cho cả nhóm. Bước bữa ăn đi đường `/api/nhatky/bua`; ba bước
  // còn lại đi đường cũ `/api/nhatky` với `truong` = đúng các cột của bước đó,
  // nên phần cô khác ghi ở bước khác không bị đụng tới.
  async luu() {
    const buoc = this.buocHienTai();
    const theoBe = new Map();
    for (const o of document.querySelectorAll('.nk-o')) {
      const be = o.dataset.be;
      if (!theoBe.has(be)) {
        theoBe.set(be, { studentId: be, capNhatLucGoc: (this._goc || {})[be] || '' });
      }
      theoBe.get(be)[o.dataset.truong] = o.value;
    }
    try {
      let r;
      if (buoc.kieu === 'bua') {
        const kieu = buoc.bua.bua;
        r = await API.put('/api/nhatky/bua', {
          classId: this._classId,
          ngay: this._ngay,
          bua: kieu,
          danhSach: [...theoBe.values()].map(x => ({
            studentId: x.studentId,
            capNhatLucGoc: x.capNhatLucGoc,
            muc: x[`bua.${kieu}.muc`] || '',
            ghiChu: x[`bua.${kieu}.ghiChu`] || '',
          })),
        });
      } else {
        r = await API.put('/api/nhatky', { ngay: this._ngay, truong: buoc.truong, danhSach: [...theoBe.values()] });
      }
      // Lưu xong là hết "gõ dở". Không xoá mốc thì lần đổi ngày ngay sau đó vẫn
      // bị hỏi lại, và một lời hỏi sai lúc thì lần sau người ta bấm cho xong.
      this._moc = undefined;
      // CÔ KHÁC VỪA GHI CHO MẤY BÉ NÀY — nói ra, đừng để cô tưởng đã lưu đủ.
      // Trước bản vá này phần của cô kia bị ghi đè im lặng và máy chủ vẫn báo
      // "Đã lưu"; nay các bé đó được giữ nguyên và cô được mời mở lại màn.
      //
      // GIỮ NHÁP KHI CÓ BÉ CHƯA LƯU ĐƯỢC. Màn hình nạp lại ngay dưới đây, và
      // phần cô vừa gõ cho mấy bé đó chưa vào máy chủ — xoá nháp lúc này là
      // đúng thứ Nguyên tắc số 1 cấm, chỉ đổi người mất công từ cô kia sang cô.
      // Giữ lại thì `napLaiNhap()` của lần nạp sau tự so với bản mới về, thấy
      // khác thì mời cô "Điền lại phần dở" — cơ chế đã có sẵn từ Đ8.
      if (r.xungDot && r.xungDot.length) {
        UI.toast(r.nhac || 'Có bé chưa lưu được vì cô khác vừa ghi', 'error');
      } else {
        // Lưu lên máy chủ xong thì bản nháp trong máy hết việc. Giữ lại là lần
        // mở sau app nhắc một phần dở KHÔNG còn dở nữa.
        //
        // Lời nhắc "bé đang nghỉ" nằm TRONG nhánh này, không tách ra thành một
        // nhánh riêng: cú lưu đó ĐÃ THÀNH CÔNG, nên nháp phải được xoá. Tách ra
        // là giữ lại một bản nháp cho dữ liệu đã lưu, tức lần mở sau app nhắc
        // "phần dở" cho thứ không còn dở — đúng chỗ Đ8 dọn.
        this.xoaNhap();
        // Đã lên máy chủ hết thì tập "ô cô đã gõ" cũng hết việc. Giữ lại là
        // lần gõ tiếp theo chụp lại cả những ô đã lưu với giá trị màn hình cũ,
        // rồi có ngày mời cô "điền lại" đè lên phần cô khác vừa ghi.
        delete this._oDaGo[this.khoaNhap(this._classId, this._ngay)];
        const coNghi = r.nhacNghi && r.nhacNghi.length;
        UI.toast(
          coNghi
            ? (r.nhacNghiChu || 'Có bé đang nghỉ hôm nay mà vẫn được ghi nhật ký')
            : `Đã lưu ${buoc.ten} cho ${r.daGhi} bé`
              + (r.daBao ? ` · đã báo gia đình ${r.daBao} bé` : ''),
          coNghi ? 'error' : 'success');
      }
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ================= Màn của gia đình: đọc từng ngày =================
  async manGiaDinh(root) {
    const be = App.currentStudent();
    if (!be) {
      root.innerHTML = UI.pageHeader('Nhật ký ngày') + UI.emptyState('📔', 'Chưa chọn bé.');
      return;
    }
    const den = UI.todayStr();
    const tu = new Date(Date.parse(`${den}T00:00:00Z`) - 13 * 86400000).toISOString().slice(0, 10);
    const d = await API.get(
      `/api/nhatky?studentId=${encodeURIComponent(be.id)}&tu=${tu}&den=${den}`);

    // Bé đã qua lứa nhà trẻ và hai tuần qua không có trang nào: nói đúng lý do,
    // không nói "cô chưa ghi" — cô không ghi là đúng, vì nhật ký ngày là của
    // lứa nhà trẻ (nhà trường 07/09). Còn có trang cũ thì vẫn đọc được.
    const daLon = d.be && d.be.laNhaTre === false;
    root.innerHTML = `
      ${UI.pageHeader('Nhật ký ngày')}
      ${
        // Nhà hai con phải có chỗ đổi con, và màn phải GHI TÊN đang xem nhật
        // ký của bé nào — trước đây mở ra là nhật ký của bé đầu danh sách,
        // không một dòng nào nói đó là ai.
        UI.studentBar()}${UI.thanhChonBeTheoCap()}
      <div class="muted small" style="margin:-2px 0 10px">Nhật ký của bé <b>${UI.esc(be.name)}</b></div>
      ${(d.ngayCo || []).length
        ? (d.ngayCo || []).map(n => this.theNgay(n, d.be)).join('')
        : (daLon
          ? UI.emptyState('📔', 'Nhật ký ăn, ngủ, vệ sinh là của lứa nhà trẻ. Bé đã lớn nên cô không ghi phần này nữa — gia đình theo dõi con qua ảnh đón bé, thực đơn và lịch sinh hoạt.')
          : UI.emptyState('📔', 'Hai tuần vừa rồi chưa có ngày nào cô ghi nhật ký cho con.'))}`;
  },

  theNgay(n, be) {
    // Viết thành CÂU, không phải bảng: gia đình đọc trên điện thoại buổi tối.
    // Ô trống thì nói "cô chưa ghi" — không bao giờ để người đọc tự suy ra.
    const chuaGhi = '<span class="muted" style="font-weight:400">cô chưa ghi</span>';
    const dong = (nhan, gt, phu) => `
      <div class="list-row"><div class="row-main">
        <div class="row-sub">${UI.esc(nhan)}${phu ? ` · <span style="font-weight:400">${UI.esc(phu)}</span>` : ''}</div>
        <div class="row-title">${gt ? UI.esc(gt) : chuaGhi}</div>
      </div></div>`;

    // NĂM BỮA THEO THỰC ĐƠN NGÀY ĐÓ (máy chủ mới gửi `buaAn`): mỗi bữa một
    // dòng — tên bữa, món của bếp, và bé ăn được bao nhiêu phần. Máy chủ đời cũ
    // không có `buaAn` thì đọc ba cột cũ như trước.
    let phanAn = '';
    if (Array.isArray(n.buaAn) && n.buaAn.length) {
      phanAn = n.buaAn.map(b => dong(b.ten, this.nhanMucAn(b.muc), (b.mon || []).join(', '))
        + (b.ghiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(b.ghiChu)}</div>` : '')).join('');
    } else {
      const bua = this.BUA_NHAN
        .map(([k, t]) => [t, n[k]])
        .filter(([, v]) => v)
        .map(([t, v]) => `${t}: ${this.nhanMucAn(v)}`).join(' · ');
      // Món của hôm đó, lấy từ thực đơn trường. Cô không gõ lại, gia đình vẫn đọc
      // được ngay cạnh dòng "bé ăn hết / ăn ít".
      const mon = this.BUA_NHAN.map(([k, t]) => {
        const b = n.thucDon ? n.thucDon[k] : null;
        return b && (b.mon || []).length ? `${t}: ${(b.mon || []).join(', ')}` : '';
      }).filter(Boolean);
      phanAn = dong('Ăn', bua) + (mon.length ? `
          <div class="muted small" style="padding:0 0 8px;line-height:1.6">
            Thực đơn của trường hôm đó:
            ${mon.map(t => `<div>${UI.esc(t)}</div>`).join('')}
          </div>` : '');
    }
    const ngu = n.nguTuLuc && n.nguDenLuc ? `${n.nguTuLuc} – ${n.nguDenLuc}` : '';
    const vs = [
      n.veSinhSoLan === null || n.veSinhSoLan === undefined ? '' : `${n.veSinhSoLan} lần`,
      this.nhanTinhChat(n.veSinhTinhChat),
    ].filter(Boolean).join(' · ');

    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(n.ngay))}
          <span class="spacer"></span>
          ${n.nguoiGhiTen ? `<span class="muted small" style="font-weight:400">${UI.esc(n.nguoiGhiTen)}</span>` : ''}
        </div>
        ${phanAn}
        ${n.anGhiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(n.anGhiChu)}</div>` : ''}
        ${dong('Ngủ trưa', ngu)}
        ${n.nguGhiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(n.nguGhiChu)}</div>` : ''}
        ${dong('Vệ sinh', vs)}
        ${be && be.laNhaTre ? `
          ${dong('Thay bỉm', n.bimSoLan === null || n.bimSoLan === undefined ? '' : `${n.bimSoLan} lần`)}
          ${dong('Bú bình', [
            n.buBinhSoLan === null || n.buBinhSoLan === undefined ? '' : `${n.buBinhSoLan} lần`,
            n.buBinhMl === null || n.buBinhMl === undefined ? '' : `${n.buBinhMl} ml`,
          ].filter(Boolean).join(' · '))}` : ''}
        ${n.ghiChu ? `<div class="mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(n.ghiChu)}
        </div>` : ''}
      </div>`;
  },
};
