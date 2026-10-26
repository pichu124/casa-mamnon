// NHẬT KÝ NGÀY — màn hình.
//
// Hai màn khác hẳn nhau vì hai việc khác hẳn nhau:
//
//   • CÔ ghi cho cả nhóm, NGAY SAU MỖI BỮA, tay còn bận. Nhà trường 07/09:
//     "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm một
//     loạt — tách riêng từng bữa theo thực đơn của nhà trường." Nên màn của
//     cô là một DẢI BƯỚC: [Bữa sáng] [Bữa phụ sáng] [Bữa trưa] [Bữa phụ chiều]
//     [Bữa sữa chiều] [Ghi chú]. Mỗi bước là danh sách bé với đúng một hai ô,
//     có "Áp cho cả nhóm" và MỘT nút Lưu cho bước đó. Năm bữa LUÔN đủ, đúng
//     tên của trường (góp ý 16/10, mục 7); món của từng bữa lấy theo THỰC ĐƠN
//     NGÀY ĐÓ của bếp cơ sở, máy chủ đưa xuống.
//
//   • GIA ĐÌNH đọc, buổi tối, trên điện thoại, mỗi lần một bé. Nên màn của gia
//     đình là từng ngày một, viết thành câu tiếng Việt chứ không phải bảng.
//
// GÓP Ý 06/10 (mục 9): BA TAB, CHỌN NHIỀU BÉ, GIỜ VỆ SINH, LƯU NHÁP + GỬI.
//
//   • Ba tab trên cùng đúng như trường đặt: Ăn uống (năm bữa, ghi chú) /
//     Nghỉ trưa / Vệ sinh. Dải bước cũ (`data-buoc`) vẫn còn, nằm trong tab
//     Ăn uống. Bước Bú bình đã bỏ (góp ý 16/10, mục 7) — số bú bình đã ghi
//     trước đó vẫn hiện cho gia đình ở đúng những ngày đó.
//   • Mỗi thẻ bé có ô chọn. Có bé được chọn thì "Áp" chỉ điền cho các bé đó;
//     không chọn bé nào thì "Áp cho cả nhóm" như trước.
//   • Tab Vệ sinh ghi TỪNG MỐC GIỜ đi vệ sinh cho các bé đã chọn. Phần thay
//     bỉm đã bỏ (góp ý 20/10, J2) — giờ bỉm đã ghi trước đó vẫn hiện.
//   • LƯU LÀ NHÁP CỦA CÔ. Gia đình chỉ thấy và chỉ nhận tin khi cô bấm "Gửi",
//     qua một hộp soát lại từng bé (chủ dự án chốt 06/10). Xem routes.js.
App.views.nhatky = {
  MUC_AN: [
    ['het', 'Ăn hết'],
    ['gan-het', 'Gần hết'],
    ['nua-suat', 'Khoảng nửa suất'],
    ['it', 'Ăn ít'],
    ['khong-an', 'Không ăn'],
  ],
  // Mức ăn viết thành nửa câu cho GIA ĐÌNH đọc: "Bữa sáng: Bánh bao xá xíu —
  // con ăn hết" (góp ý 16/10, mục 7). Màn của cô vẫn dùng nhãn `MUC_AN`.
  CAU_MUC_AN: {
    het: 'con ăn hết', 'gan-het': 'con ăn gần hết', 'nua-suat': 'con ăn khoảng nửa suất',
    it: 'con ăn ít', 'khong-an': 'con không ăn',
  },
  TINH_CHAT: [
    ['binh-thuong', 'Bình thường'],
    ['hoi-long', 'Hơi lỏng'],
    ['long', 'Lỏng'],
    ['tao', 'Táo'],
  ],
  // Ba bữa đời cũ — chỉ còn dùng để đọc dữ liệu từ máy chủ đời cũ chưa gửi
  // `buaAn`. Máy chủ mới thì màn gia đình đọc theo `buaAn` (năm bữa).
  BUA_NHAN: [['anSang', 'Sáng'], ['anTrua', 'Trưa'], ['anXe', 'Xế']],
  // Ba tab nhà trường đặt (góp ý 06/10, mục 9) — cũng là ba PHẦN cô gửi
  // riêng cho gia đình.
  PHAN: [['an', 'Ăn uống'], ['ngu', 'Nghỉ trưa'], ['vesinh', 'Vệ sinh']],
  LOAI_VS: [['thay-bim', 'Thay bỉm'], ['di-ve-sinh', 'Đi vệ sinh']],
  // Các bước không phải bữa ăn, đứng sau các bữa. `truong` là các cột mà bước
  // đó gửi lên — máy chủ chỉ ghi đúng các cột này, phần khác giữ nguyên.
  BUOC_KHAC: [
    { ma: 'ghichu', phan: 'an', ten: 'Ghi chú', kieu: 'ghichu', truong: ['anGhiChu', 'ghiChu'] },
    { ma: 'ngu', phan: 'ngu', ten: 'Ngủ trưa', kieu: 'ngu', truong: ['nguTuLuc', 'nguDenLuc', 'nguGhiChu'] },
    { ma: 'vesinh', phan: 'vesinh', ten: 'Vệ sinh', kieu: 'vesinh', truong: [] },
  ],
  // Bé cô đang chọn trên màn (mã bé). Giữ qua các lần vẽ lại trong cùng
  // nhóm và ngày; đổi nhóm hay ngày thì bỏ hết.
  _chon: null,
  _chonCua: '',
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

  // Các bước của một ngày: từng bữa máy chủ đưa xuống, rồi ghi chú, ngủ, vệ
  // sinh. Máy chủ đời cũ không gửi `buaAn` thì về ba bữa sáng / trưa / xế.
  cacBuoc(d) {
    const ds = (d && Array.isArray(d.buaAn) && d.buaAn.length) ? d.buaAn
      : [{ bua: 'breakfast', ten: 'Bữa sáng' }, { bua: 'lunch', ten: 'Bữa trưa' }, { bua: 'snack', ten: 'Bữa phụ chiều' }];
    return [
      ...ds.map(b => ({ ma: `bua:${b.bua}`, phan: 'an', ten: b.ten, kieu: 'bua', bua: b })),
      ...this.BUOC_KHAC,
    ];
  },

  tenPhan(ma) {
    return (this.PHAN.find(p => p[0] === ma) || [ma, ''])[1];
  },

  dsChon() {
    const khoa = `${this._classId}|${this._ngay}`;
    if (!this._chon || this._chonCua !== khoa) { this._chon = new Set(); this._chonCua = khoa; }
    return this._chon;
  },

  // Một dòng tóm tắt phần `phan` của một bé — dùng trong hộp soát trước khi gửi.
  tomTatBe(b, phan) {
    const co = (v) => v !== null && v !== undefined && v !== '';
    if (phan === 'an') {
      const ds = (b.buaAn || []).filter(x => x.muc).map(x => `${x.ten}: ${this.nhanMucAn(x.muc)}`);
      if (co(b.buBinhSoLan)) ds.push(`Bú bình ${b.buBinhSoLan} lần${co(b.buBinhMl) ? ` (${b.buBinhMl} ml)` : ''}`);
      if (b.ghiChu) ds.push(`Lời nhắn: ${b.ghiChu}`);
      return ds.join(' · ') || b.anGhiChu || '';
    }
    if (phan === 'ngu') {
      return b.nguTuLuc && b.nguDenLuc ? `Ngủ ${b.nguTuLuc} – ${b.nguDenLuc}${b.nguGhiChu ? ` · ${b.nguGhiChu}` : ''}`
        : (b.nguGhiChu || '');
    }
    const sk = b.suKien || [];
    const nhan = Object.fromEntries(this.LOAI_VS);
    if (sk.length) {
      return sk.map(e => `${e.luc} ${nhan[e.loai] || ''}${e.coPoo ? ' (có đi ngoài)' : ''}${e.ghiChu ? ` — ${e.ghiChu}` : ''}`).join(' · ');
    }
    return [co(b.bimSoLan) ? `Thay bỉm ${b.bimSoLan} lần` : '',
      co(b.veSinhSoLan) ? `Đi vệ sinh ${b.veSinhSoLan} lần` : '',
      this.nhanTinhChat(b.veSinhTinhChat)].filter(Boolean).join(' · ');
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
          Nhật ký ăn, ngủ, vệ sinh là của lứa nhà trẻ (dưới 36 tháng).
          Với các bé lớn hơn, gia đình theo dõi qua ảnh đón bé, thực đơn và lịch sinh hoạt.
        </div>`;
      this.ganDoiNgayNhom();
      return;
    }

    const phan = buoc.phan || 'an';
    const buocPhan = cacBuoc.filter(x => (x.phan || 'an') === phan);
    const coGui = Array.isArray(d.phanGui);
    const chon = this.dsChon();
    for (const id of [...chon]) if (!dsBe.some(x => x.studentId === id)) chon.delete(id);
    // Số bé có phần đó đã ghi mà chưa gửi — hiện ngay trên tab, để cô nhìn
    // qua là biết còn phần nào chưa tới tay gia đình.
    const demCho = (ma) => dsBe.filter(x => x.gui && x.gui[ma] && x.gui[ma].chuaGui).length;

    root.innerHTML = `
      ${UI.pageHeader('Nhật ký ngày')}
      ${theDau}

      <div class="seg nk-phan" role="tablist" aria-label="Phần nhật ký">
        ${this.PHAN.map(([ma, ten]) => {
          const n = coGui ? demCho(ma) : 0;
          return `
          <button class="${ma === phan ? 'active' : ''}" data-phan="${UI.esc(ma)}" role="tab"
            aria-selected="${ma === phan ? 'true' : 'false'}">${UI.esc(ten)}${n
            ? ` <span class="nk-cho" title="Bé đã ghi mà chưa gửi">· ${n}</span>` : ''}</button>`;
        }).join('')}
      </div>

      ${buocPhan.length > 1 ? `
      <div class="seg" role="tablist" aria-label="Bước ghi" style="overflow-x:auto;margin-top:8px">
        ${buocPhan.map(x => `
          <button class="${x.ma === buoc.ma ? 'active' : ''}" data-buoc="${UI.esc(x.ma)}" role="tab"
            aria-selected="${x.ma === buoc.ma ? 'true' : 'false'}">${UI.esc(x.ten)}</button>`).join('')}
      </div>` : ''}

      ${this.theBuoc(buoc)}

      ${dsBe.length ? this.thanhChon(dsBe, chon) : ''}

      ${dsBe.length ? dsBe.map(x => this.theBe(x, buoc, chon, phan)).join('')
        : UI.emptyState('📔', 'Nhóm này chưa có bé nào.')}

      ${dsBe.length && buoc.kieu !== 'vesinh' ? `
        <button class="btn primary block mt-14" id="nk-luu">${UI.icon('check', 18)} Lưu ${UI.esc(buoc.ten)} cho cả nhóm</button>` : ''}
      ${dsBe.length && coGui ? `
        <button class="btn outline block mt-8" id="nk-gui">${UI.icon('send', 18)} Gửi phần ${UI.esc(this.tenPhan(phan).toLowerCase())} cho gia đình</button>
        <div class="muted small center" style="padding:6px 12px 14px;line-height:1.6">
          Lưu là bản nháp của cô — gia đình chưa thấy gì. Soát xong cả nhóm rồi bấm
          <b>Gửi</b>, gia đình mới nhận được.
        </div>` : ''}`;

    this.ganDoiNgayNhom();
    const nutAp = document.getElementById('nk-ap');
    if (nutAp) nutAp.onclick = () => this.apCaNhom();
    const btn = document.getElementById('nk-luu');
    if (btn) btn.onclick = () => this.luu();
    const nutGui = document.getElementById('nk-gui');
    if (nutGui) nutGui.onclick = () => this.moGui(phan);
    this.ganChon();
    this.ganVeSinh();

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
    // Ba tab trên cùng: sang tab nào thì đứng ở bước đầu của tab đó; về Ăn
    // uống thì đứng ở bữa gần nhất đã tới giờ, như lúc mới mở màn.
    for (const nut of document.querySelectorAll('.nk-phan [data-phan]')) {
      nut.onclick = () => {
        const v = nut.dataset.phan;
        if (v === (this.buocHienTai().phan || 'an')) return;
        const dau = this.cacBuoc(this._data).find(x => (x.phan || 'an') === v);
        if (!dau) return;
        doiMan(() => { this._buoc = v === 'an' ? this.buocMacDinh(this._data) : dau.ma; });
      };
    }
  },

  // Thẻ đầu bước: món của bữa (từ thực đơn, cô không gõ lại) và "Áp cho cả nhóm".
  theBuoc(buoc) {
    if (buoc.kieu === 'vesinh') return this.theVeSinh();
    let mon = '';
    if (buoc.kieu === 'bua') {
      const b = buoc.bua || {};
      // Bữa chưa có món thì NÓI RA và chỉ chỗ nhập (góp ý 20/10, J1) — để
      // trống thì cô tưởng app chưa nối thực đơn vào nhật ký.
      mon = (b.mon || []).length ? `
        <div class="muted small" style="margin-bottom:10px;line-height:1.6">
          ${b.gio ? `${UI.esc(b.gio)} · ` : ''}<b>${UI.esc((b.mon || []).join(', '))}</b>
          <span class="muted">— theo thực đơn của bếp, cô không phải gõ lại</span>
        </div>` : `
        <div class="muted small" style="margin-bottom:10px;line-height:1.6">
          Chưa có thực đơn bữa này — văn phòng nhập ở Thực đơn
        </div>`;
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
    }
    return `
      <div class="card">
        <div class="card-title">${UI.esc(buoc.ten)}</div>
        ${mon}
        ${ap ? `
          <div class="muted small" style="margin-bottom:10px">Đặt nhanh cho cả nhóm — hoặc chỉ cho các bé cô đã chọn ở danh sách dưới — rồi sửa lại riêng bé nào khác.</div>
          ${ap}
          <button class="btn outline block mt-14" id="nk-ap">${this.nhanAp()}</button>` : `
          <div class="muted small" style="line-height:1.6">
            Ô nào cô chưa kịp ghi thì để trống — màn hình của gia đình sẽ nói
            <b>"cô chưa ghi"</b>, chứ không nói bé không ăn.
          </div>`}
      </div>`;
  },

  nhanAp() {
    const n = this.dsChon().size;
    return n ? `Áp cho ${n} bé đã chọn` : 'Áp cho cả nhóm';
  },

  // Thẻ đầu tab Vệ sinh: ghi MỘT MỐC GIỜ đi vệ sinh cho mọi bé đang chọn.
  //
  // KHÔNG CÒN GHI THAY BỈM (góp ý 20/10, J2): trường bỏ theo dõi bỉm. Chỉ bỏ
  // ô ghi; mốc thay bỉm và số lần bỉm đã ghi của những ngày cũ vẫn hiện ở thẻ
  // từng bé và ở màn gia đình. Đường `/api/nhatky/ve-sinh` vẫn nhận 'thay-bim'.
  theVeSinh() {
    const homNay = this._ngay === UI.todayStr();
    return `
      <div class="card" id="nk-vs-the">
        <div class="card-title">Ghi giờ đi vệ sinh</div>
        <div class="muted small" style="margin-bottom:10px;line-height:1.6">
          Chọn bé ở danh sách dưới (hoặc "Chọn cả nhóm"), chọn giờ rồi bấm Ghi.
          Mỗi lần bấm là một mốc giờ cho từng bé đã chọn — ghi xong là lưu ngay.
        </div>
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Giờ</label>
            <input type="time" id="nk-vs-gio" value="${homNay ? UI.esc(UI.gioVN()) : ''}"></div>
          <div class="field" style="margin:0"><label>Có đi ngoài không</label>
            <select id="nk-vs-poo">
              <option value="">Không</option>
              <option value="1">Có đi ngoài</option>
            </select></div>
        </div>
        <div class="field mt-8" style="margin:0"><label>Tình trạng (nếu có đi ngoài)</label>
          <select id="nk-vs-tc">
            <option value="">— không ghi —</option>
            ${this.TINH_CHAT.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')}
          </select></div>
        <div class="field mt-8" style="margin:0">
          <input id="nk-vs-ghichu" maxlength="200" placeholder="Ghi chú ngắn (không bắt buộc)">
        </div>
        <button class="btn primary block mt-14" id="nk-vs-ghi">${UI.icon('plus', 18)} Ghi cho bé đã chọn</button>
      </div>`;
  },

  // Dải chọn bé: đếm số bé đang chọn, chọn cả nhóm, bỏ chọn.
  thanhChon(dsBe, chon) {
    return `
      <div class="card" style="padding:10px 14px">
        <div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">
          <span id="nk-so-chon" class="muted small" style="flex:1;min-width:130px">${this.chuSoChon(chon.size)}</span>
          <button type="button" class="btn outline sm" id="nk-chon-het" style="min-height:36px">Chọn cả nhóm</button>
          <button type="button" class="btn outline sm" id="nk-bo-chon" style="min-height:36px">Bỏ chọn</button>
        </div>
      </div>`;
  },
  chuSoChon(n) {
    return n ? `Đã chọn <b>${n}</b> bé` : 'Chạm ô vuông ở thẻ để chọn bé';
  },

  ganChon() {
    const chon = this.dsChon();
    const capNhat = () => {
      const so = document.getElementById('nk-so-chon');
      if (so) so.innerHTML = this.chuSoChon(chon.size);
      const ap = document.getElementById('nk-ap');
      if (ap) ap.textContent = this.nhanAp();
      const ghi = document.getElementById('nk-vs-ghi');
      if (ghi) ghi.lastChild.textContent = chon.size ? ` Ghi cho ${chon.size} bé đã chọn` : ' Ghi cho bé đã chọn';
    };
    for (const o of document.querySelectorAll('.nk-chon')) {
      o.onchange = () => {
        if (o.checked) chon.add(o.dataset.be); else chon.delete(o.dataset.be);
        capNhat();
      };
    }
    const datTatCa = (co) => {
      for (const o of document.querySelectorAll('.nk-chon')) {
        o.checked = co;
        if (co) chon.add(o.dataset.be); else chon.delete(o.dataset.be);
      }
      capNhat();
    };
    const het = document.getElementById('nk-chon-het');
    if (het) het.onclick = () => datTatCa(true);
    const bo = document.getElementById('nk-bo-chon');
    if (bo) bo.onclick = () => datTatCa(false);
    capNhat();
  },

  ganVeSinh() {
    const ghi = document.getElementById('nk-vs-ghi');
    if (ghi) {
      ghi.onclick = async () => {
        const chon = [...this.dsChon()];
        if (!chon.length) return UI.toast('Cô chọn bé trước — chạm ô vuông ở thẻ bé, hoặc "Chọn cả nhóm"', 'error');
        const gt = (id) => { const o = document.getElementById(id); return o ? o.value : ''; };
        const luc = gt('nk-vs-gio');
        if (!/^\d{2}:\d{2}$/.test(luc)) return UI.toast('Cô chọn giờ giúp nhé', 'error');
        const coPoo = gt('nk-vs-poo') === '1';
        ghi.disabled = true;
        try {
          const r = await API.post('/api/nhatky/ve-sinh', {
            classId: this._classId, ngay: this._ngay, studentIds: chon, luc,
            loai: 'di-ve-sinh', coPoo, tinhChat: coPoo ? gt('nk-vs-tc') : '', ghiChu: gt('nk-vs-ghichu'),
          });
          const canNhac = [r.nhacNghiChu, r.nhac].filter(Boolean).join(' ');
          UI.toast(canNhac || `Đã ghi ${luc} cho ${r.daGhi} bé — nhớ bấm Gửi khi xong`, canNhac ? 'error' : 'success');
          App.route();
        } catch (err) { UI.toast(err.message, 'error'); ghi.disabled = false; }
      };
    }
    for (const nut of document.querySelectorAll('.nk-vs-bo')) {
      nut.onclick = async () => {
        if (!confirm(`Bỏ mốc ${nut.dataset.luc || ''} ghi nhầm?`)) return;
        try {
          await API.del(`/api/nhatky/ve-sinh/${encodeURIComponent(nut.dataset.id)}`);
          App.route();
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },

  // HỘP SOÁT TRƯỚC KHI GỬI. Nhà trường: "yêu cầu phải check kỹ ... trước khi
  // gửi cho PH". Mỗi bé một dòng: phần sẽ gửi viết thành chữ, ô chọn bật sẵn
  // cho bé có thay đổi chưa gửi. Bé chưa ghi gì thì hiện mờ, không chọn được.
  moGui(phan) {
    const dangGo = this._moc !== undefined
      && [...document.querySelectorAll('.nk-o')].map(o => o.value).join('\u0001') !== this._moc;
    if (dangGo) return UI.toast('Cô bấm Lưu trước rồi mới Gửi — phần vừa nhập chưa được lưu', 'error');
    const dsBe = (this._data && this._data.danhSach) || [];
    const chon = this.dsChon();
    const dong = dsBe.map(b => {
      const g = (b.gui || {})[phan] || {};
      const tom = g.canGo ? 'Cô đã bỏ hết phần này — gửi để gỡ bản gia đình đang đọc' : this.tomTatBe(b, phan);
      const coGi = g.coNoiDung !== undefined ? (g.coNoiDung || !!g.canGo) : !!tom;
      // Bé có đơn nghỉ hôm nay thì KHÔNG chọn sẵn — cô tự tích nếu bé đi học
      // lại giữa buổi (vòng rà Đ232).
      const bat = coGi && g.chuaGui && !b.nghiPhep && (!chon.size || chon.has(b.studentId));
      const trangThai = (!coGi ? 'chưa ghi'
        : (g.canGo ? 'đã bỏ, gia đình còn thấy bản cũ'
          : (g.chuaGui ? (g.guiLuc ? 'đã sửa sau lần gửi trước' : 'chưa gửi') : `đã gửi ${UI.fmtTime(g.guiLuc)}`)))
        + (b.nghiPhep ? ' · có đơn nghỉ hôm nay' : '');
      return `
        <label class="list-row" style="gap:10px;align-items:flex-start;${coGi ? '' : 'opacity:.55'}">
          <input type="checkbox" class="nk-gui-be" value="${UI.esc(b.studentId)}" ${bat ? 'checked' : ''}
            ${coGi ? '' : 'disabled'} style="width:32px;height:32px;margin:0;flex:none">
          <div class="row-main">
            <div class="row-title">${UI.esc(b.hoTen)} <span class="muted small" style="font-weight:400">· ${UI.esc(trangThai)}</span></div>
            <div class="row-sub" style="line-height:1.5">${tom ? UI.esc(tom) : '<span class="muted">—</span>'}</div>
          </div>
        </label>`;
    }).join('');
    UI.modal(`
      <p class="muted small" style="line-height:1.6;margin-top:0">
        Cô đọc lại từng bé. Gia đình chỉ nhận được bé nào có dấu chọn — bé đã gửi
        mà chưa đổi gì thì không gửi lại.
      </p>
      <div id="nk-gui-ds">${dong}</div>
      <button class="btn primary block mt-14" id="nk-gui-xac"></button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, `Gửi phần ${this.tenPhan(phan).toLowerCase()} cho gia đình`);
    const nut = document.getElementById('nk-gui-xac');
    const dem = () => {
      const n = document.querySelectorAll('.nk-gui-be:checked').length;
      nut.textContent = n ? `Gửi cho ${n} gia đình` : 'Chưa chọn bé nào';
      nut.disabled = !n;
    };
    for (const o of document.querySelectorAll('.nk-gui-be')) o.onchange = dem;
    dem();
    nut.onclick = async () => {
      const ids = [...document.querySelectorAll('.nk-gui-be:checked')].map(o => o.value);
      if (!ids.length) return;
      nut.disabled = true;
      try {
        const r = await API.post('/api/nhatky/gui', { classId: this._classId, ngay: this._ngay, phan, studentIds: ids });
        UI.closeModal();
        const go = (r.daGo || []).length;
        UI.toast(`Đã gửi cho ${r.daGui} gia đình` + (go ? ` · đã gỡ phần cô bỏ của ${go} bé` : '')
          + (r.nhac ? `. ${r.nhac}` : ''), 'success');
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); nut.disabled = false; }
    };
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
  theBe(b, buoc, boChon, phan) {
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
      // Tên món ngay trên ô nhận xét của TỪNG bé (góp ý 20/10, J1): cô cuộn
      // xuống giữa nhóm vẫn biết mình đang nhận xét món gì.
      const mon = (buoc.bua.mon || []).join(', ');
      than = `
        <div class="field" style="margin:0"><label>${UI.esc(mon ? `${buoc.ten}: ${mon}` : buoc.ten)}</label>${chon(`${ma}.muc`, this.MUC_AN, bua.muc)}</div>
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
      // TỪNG MỐC GIỜ (góp ý 06/10, mục 9). Ghi ở thẻ đầu tab cho các bé đã
      // chọn; ở đây chỉ hiện và bỏ mốc ghi nhầm. Số lần ghi tay từ trước vẫn
      // hiện ra để cô biết đã có — mốc mới cộng thêm vào đó.
      const sk = b.suKien || [];
      const co = (v) => v !== null && v !== undefined && v !== '';
      daGhi = sk.length > 0 || co(b.veSinhSoLan) || co(b.bimSoLan) || !!b.veSinhTinhChat;
      const nhan = Object.fromEntries(this.LOAI_VS);
      const soCu = [co(b.bimSoLan) ? `thay bỉm ${b.bimSoLan} lần` : '',
        co(b.veSinhSoLan) ? `đi vệ sinh ${b.veSinhSoLan} lần` : ''].filter(Boolean).join(', ');
      than = sk.length ? `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${sk.map(e => `
            <div class="flex" style="gap:8px;align-items:center;border:1px solid var(--line);border-radius:var(--r-xs);padding:4px 4px 4px 10px">
              <b>${UI.esc(e.luc)}</b>
              <span style="flex:1;min-width:0">${UI.esc(nhan[e.loai] || '')}${e.coPoo
                ? ` · có đi ngoài${e.tinhChat ? ` (${UI.esc(this.nhanTinhChat(e.tinhChat).toLowerCase())})` : ''}` : ''}${e.ghiChu
                ? ` · <span class="muted">${UI.esc(e.ghiChu)}</span>` : ''}</span>
              <button type="button" class="btn outline sm nk-vs-bo" data-id="${UI.esc(e.id)}" data-luc="${UI.esc(e.luc)}"
                style="min-width:36px;min-height:36px;padding:0" aria-label="Bỏ mốc ${UI.esc(e.luc)}">${UI.icon('x', 16)}</button>
            </div>`).join('')}
        </div>
        ${soCu ? `<div class="muted small mt-8">Cả ngày: ${UI.esc(soCu)}</div>` : ''}` : `
        <div class="muted small" style="line-height:1.6">Chưa ghi mốc giờ nào${soCu
          ? ` · đã ghi theo số lần: ${UI.esc(soCu)}` : ''}${b.veSinhTinhChat
          ? ` · ${UI.esc(this.nhanTinhChat(b.veSinhTinhChat).toLowerCase())}` : ''}.</div>`;
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

    // Trạng thái của ô đang mở, gộp MỘT nhãn: đã ghi chưa, và nếu đã ghi thì
    // gia đình đã nhận chưa (phần gửi của tab này). Chưa ghi thì không nhãn.
    const g = (b.gui && phan && b.gui[phan]) || null;
    let nhan = '';
    if (daGhi) {
      if (g && g.chuaGui) nhan = UI.badge(g.guiLuc ? 'Đã ghi · chưa gửi lại' : 'Đã ghi · chưa gửi', 'orange');
      else if (g && g.guiLuc) nhan = UI.badge(`Đã gửi ${UI.fmtTime(g.guiLuc)}`, 'blue');
      else nhan = UI.badge('Đã ghi', 'green');
    } else if (g && g.canGo) nhan = UI.badge('Đã bỏ · gia đình còn thấy bản cũ', 'orange');
    const dangChon = !!(boChon && boChon.has(b.studentId));
    return `
      <div class="card"${nghi ? ' style="opacity:.75"' : ''}>
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${boChon ? `<input type="checkbox" class="nk-chon" data-be="${id}" ${dangChon ? 'checked' : ''}
            aria-label="Chọn ${UI.esc(b.hoTen)}" style="width:32px;height:32px;margin:0;flex:none">` : ''}
          ${UI.avatar(b.avatar, 40)}
          <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
          ${nghi ? UI.badge('Nghỉ hôm nay', 'orange') : ''}
          ${nhan}
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
    muon = muon.filter(([, v]) => v);
    if (!muon.length) return UI.toast('Cô chọn ít nhất một mục để áp nhé', 'error');

    // CÔ ĐÃ CHỌN BÉ (góp ý 06/10, mục 9: "chọn nhiều bé để cập nhật cùng lúc"):
    // điền thẳng cho đúng các bé đó, kể cả ô đã có — cô đã chỉ tận tên từng
    // bé, không cần hỏi lại "giữ ô đã điền". Bé đang nghỉ mà cô vẫn chọn thì
    // cũng điền: đó là lựa chọn có chủ ý, khác cú áp cả nhóm.
    const chon = this.dsChon();
    if (chon.size) {
      const dich = [...document.querySelectorAll('.nk-o')]
        .filter(x => chon.has(x.dataset.be) && muon.some(([truong]) => x.dataset.truong === truong));
      for (const x of dich) x.value = (muon.find(([truong]) => truong === x.dataset.truong) || [])[1];
      const goPhien = this.oDaGoCua(this.khoaNhap(this._classId, this._ngay));
      for (const x of dich) goPhien.add(`${x.dataset.be}|${x.dataset.truong}`);
      this.luuNhap();
      return UI.toast(`Đã điền cho ${chon.size} bé đã chọn. Cô soát lại rồi bấm Lưu.`, 'success');
    }

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
              + (r.daBao ? ` · đã báo gia đình ${r.daBao} bé` : ' — gia đình chưa thấy, soát xong cô bấm Gửi'),
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
        ? (d.ngayCo || []).map(n => this.theNgay(n)).join('')
        : (daLon
          ? UI.emptyState('📔', 'Nhật ký ăn, ngủ, vệ sinh là của lứa nhà trẻ. Bé đã lớn nên cô không ghi phần này nữa — gia đình theo dõi con qua ảnh đón bé, thực đơn và lịch sinh hoạt.')
          : UI.emptyState('📔', 'Hai tuần vừa rồi chưa có ngày nào cô ghi nhật ký cho con.'))}`;
  },

  theNgay(n) {
    // Viết thành CÂU, không phải bảng: gia đình đọc trên điện thoại buổi tối.
    // Ô trống thì nói "cô chưa ghi" — không bao giờ để người đọc tự suy ra.
    const chuaGhi = '<span class="muted" style="font-weight:400">cô chưa ghi</span>';
    const dong = (nhan, gt, phu) => `
      <div class="list-row"><div class="row-main">
        <div class="row-sub">${UI.esc(nhan)}${phu ? ` · <span style="font-weight:400">${UI.esc(phu)}</span>` : ''}</div>
        <div class="row-title">${gt ? UI.esc(gt) : chuaGhi}</div>
      </div></div>`;

    // NGÀY THEO LUẬT "GỬI MỚI THẤY" (góp ý 06/10, mục 9): máy chủ chỉ đưa
    // phần cô đã gửi, kèm `daGui`. Phần chưa gửi nói đúng là "cô chưa gửi" —
    // không để trống, không nói bé không ăn không ngủ.
    const gui = n.daGui || null;
    const chuaGui = (ph) => !!gui && !gui[ph];
    const dongChuaGui = (nhan) => `
      <div class="list-row"><div class="row-main">
        <div class="row-sub">${UI.esc(nhan)}</div>
        <div class="row-title"><span class="muted" style="font-weight:400">cô chưa gửi phần này</span></div>
      </div></div>`;
    // Từng mốc giờ thay bỉm / đi vệ sinh, nếu cô có ghi.
    const sk = n.suKien || [];
    // Ghi chú ngắn của từng mốc (vd "hăm đỏ, cô đã bôi kem") đi trong bản gửi
    // và hiện cho gia đình — như mọi ghi chú khác của nhật ký (vòng rà Đ232).
    const moc = (loai) => sk.filter(e => e.loai === loai).map(e => `${e.luc}${e.coPoo
      ? ` (có đi ngoài${e.tinhChat ? `, ${this.nhanTinhChat(e.tinhChat).toLowerCase()}` : ''})` : ''}${
      e.ghiChu ? ` — ${e.ghiChu}` : ''}`).join(' · ');

    // NĂM BỮA (máy chủ mới gửi `buaAn`): mỗi bữa MỘT CÂU, đúng như trường
    // viết (góp ý 16/10, mục 7) — "Bữa sáng: Bánh bao xá xíu — con ăn hết".
    // Bữa không có món thì "Bữa sáng — con ăn hết"; bữa cô chưa ghi mức thì
    // nói "cô chưa ghi". Máy chủ đời cũ không có `buaAn` thì đọc ba cột cũ.
    let phanAn = '';
    if (Array.isArray(n.buaAn) && n.buaAn.length) {
      phanAn = n.buaAn.map(b => {
        const mon = (b.mon || []).join(', ');
        const cau = this.CAU_MUC_AN[b.muc];
        return `
          <div class="list-row"><div class="row-main">
            <div class="row-title">${UI.esc(`${b.ten}${mon ? `: ${mon}` : ''}`)} — ${cau ? UI.esc(cau) : chuaGhi}</div>
          </div></div>`
          + (b.ghiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(b.ghiChu)}</div>` : '');
      }).join('');
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
    const vs = moc('di-ve-sinh') || [
      n.veSinhSoLan === null || n.veSinhSoLan === undefined ? '' : `${n.veSinhSoLan} lần`,
      this.nhanTinhChat(n.veSinhTinhChat),
    ].filter(Boolean).join(' · ');
    // Thay bỉm: chỉ hiện ở ngày THẬT SỰ có (ghi trước khi trường bỏ phần bỉm,
    // góp ý 20/10, J2). Ngày khác mà hiện "Thay bỉm · cô chưa ghi" là nhắc
    // gia đình một việc cô không còn ghi nữa.
    const bim = moc('thay-bim') || (n.bimSoLan === null || n.bimSoLan === undefined ? '' : `${n.bimSoLan} lần`);
    // Bú bình: chỉ hiện ở ngày THẬT SỰ có số (ghi trước khi bỏ bước Bú bình,
    // hay bằng app đời cũ). Ngày không có số thì không có dòng này.
    const buBinh = [
      n.buBinhSoLan === null || n.buBinhSoLan === undefined ? '' : `${n.buBinhSoLan} lần`,
      n.buBinhMl === null || n.buBinhMl === undefined ? '' : `${n.buBinhMl} ml`,
    ].filter(Boolean).join(' · ');

    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(n.ngay))}
          <span class="spacer"></span>
          ${n.nguoiGhiTen ? `<span class="muted small" style="font-weight:400">${UI.esc(n.nguoiGhiTen)}</span>` : ''}
        </div>
        ${chuaGui('an') ? dongChuaGui('Ăn uống') : `
          ${phanAn}
          ${n.anGhiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(n.anGhiChu)}</div>` : ''}
          ${buBinh ? dong('Bú bình', buBinh) : ''}`}
        ${chuaGui('ngu') ? dongChuaGui('Ngủ trưa') : `
          ${dong('Ngủ trưa', ngu)}
          ${n.nguGhiChu ? `<div class="muted small" style="padding:0 0 8px">${UI.esc(n.nguGhiChu)}</div>` : ''}`}
        ${chuaGui('vesinh') ? dongChuaGui('Vệ sinh') : `
          ${dong('Vệ sinh', vs)}
          ${bim ? dong('Thay bỉm', bim) : ''}`}
        ${n.ghiChu ? `<div class="mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(n.ghiChu)}
        </div>` : ''}
      </div>`;
  },
};
