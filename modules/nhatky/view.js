// NHẬT KÝ NGÀY — màn hình.
//
// Hai màn khác hẳn nhau vì hai việc khác hẳn nhau:
//
//   • CÔ ghi cho cả nhóm, cuối giờ chiều, trong khoảng 10 phút, tay còn bận.
//     Chỉ tiêu của bản kế hoạch là CẢ NHÓM DƯỚI 5 PHÚT. Nên màn của cô là một
//     bảng dài, mọi bé trên cùng một trang, có hàng "đặt cho cả nhóm" ở trên
//     cùng và một nút Lưu duy nhất ở dưới cùng.
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
  BUA_NHAN: [['anSang', 'Sáng'], ['anTrua', 'Trưa'], ['anXe', 'Xế']],
  _ngay: null,
  _classId: null,
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

  // Thực đơn của đúng ngày đang ghi. Rỗng thì không hiện thẻ nào — màn hình
  // trống sạch vẫn tốt hơn một thẻ nói "chưa có".
  theThucDon(td) {
    if (!td) return '';
    const dong = this.BUA_NHAN.map(([k, t]) => {
      const b = td[k];
      if (!b || !(b.mon || []).length) return '';
      return `
        <div class="list-row"><div class="row-main">
          <div class="row-sub">${UI.esc(b.ten || t)}${b.gio ? ` · ${UI.esc(b.gio)}` : ''}</div>
          <div class="row-title" style="font-weight:400">${UI.esc((b.mon || []).join(', '))}</div>
        </div></div>`;
    }).filter(Boolean).join('');
    if (!dong) return '';
    return `
      <div class="card">
        <div class="card-title">Thực đơn hôm đó</div>
        <div class="muted small" style="margin-bottom:6px">
          Lấy thẳng từ màn Thực đơn của trường, cô không phải gõ lại tên món.
        </div>
        ${dong}
      </div>`;
  },

  nhanMucAn(ma) {
    const t = this.MUC_AN.find(x => x[0] === ma);
    return t ? t[1] : '';
  },
  nhanTinhChat(ma) {
    const t = this.TINH_CHAT.find(x => x[0] === ma);
    return t ? t[1] : '';
  },

  // ===========================================================================
  // NHÁP TRONG MÁY — GIỮ PHẦN CÔ ĐANG GÕ QUA MỘT LẦN APP BỊ ĐÓNG
  // ===========================================================================
  //
  // Màn của cô là một trang dài: hai mươi bé, mỗi bé khoảng mười ô, một nút Lưu
  // duy nhất ở cuối. Chỉ tiêu của bản kế hoạch là CẢ NHÓM DƯỚI 5 PHÚT — nghĩa
  // là có tới năm phút công việc chỉ nằm trong DOM, chưa ở đâu cả.
  //
  // Lời hỏi lại khi đổi ngày / đổi nhóm (bên dưới) đã đỡ được chỗ chạm nhầm.
  // Nhưng nó không đỡ được thứ hay xảy ra hơn trên điện thoại của cô: có người
  // gọi tới, cô chuyển sang app khác, hệ điều hành đóng trình duyệt để lấy bộ
  // nhớ. Mở lại là trắng. Mất một lượt nhập của hai mươi bé đúng là cách làm cô
  // bỏ app quay về sổ giấy.
  //
  // VÌ SAO KHÔNG TỰ ĐIỀN LẠI, MÀ HỎI
  //
  // Một nhóm có nhiều cô. Trong lúc bản nháp nằm trong máy cô A, cô B có thể đã
  // ghi và lưu từ máy của mình. Tự điền đè lên là lấy bản cũ của cô A ghi chồng
  // lên bản mới của cô B ngay lần bấm Lưu tiếp theo — âm thầm, và không ai biết.
  // Nên app hiện một dải nhắc và để cô chọn.
  KHOA_NHAP: 'casa.nhatky-nhap',
  HAN_NHAP_MS: 24 * 60 * 60 * 1000,   // nhật ký là của ĐÚNG một ngày; quá hạn thì bỏ

  khoaNhap(classId, ngay) {
    return `${this.KHOA_NHAP}.${classId}.${ngay}`;
  },

  // Đọc mọi ô đang hiện thành { "<mã bé>|<tên trường>": giá trị }.
  ganhO() {
    const o = {};
    for (const el of document.querySelectorAll('.nk-o')) {
      o[`${el.dataset.be}|${el.dataset.truong}`] = el.value;
    }
    return o;
  },

  // Ô cô ĐÃ THẬT SỰ GÕ trong phiên này, theo từng (nhóm, ngày). Nháp chỉ giữ
  // và điền lại những ô đó: các ô còn lại trên màn là giá trị máy chủ TẠI THỜI
  // ĐIỂM CHỤP — chụp cả chúng vào nháp rồi điền lại là lấy bản cũ ghi đè bản
  // mới cô khác vừa lưu, đúng thứ lời nhắc bên dưới hứa sẽ không làm.
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

  xoaNhap(classId, ngay) {
    try { localStorage.removeItem(this.khoaNhap(classId || this._classId, ngay || this._ngay)); } catch (_) { }
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
        <b>Cô có phần nhập dở chưa lưu</b> của đúng ngày và nhóm này
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
    const neo = document.getElementById('nk-ap');
    const the = neo && neo.closest('.card');
    if (the && the.parentNode) the.parentNode.insertBefore(dai, the.nextSibling);
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

  // ================= Màn của cô: ghi cả nhóm một lượt =================
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

    const coNhaTre = (d.danhSach || []).some(b => b.laNhaTre);

    root.innerHTML = `
      ${UI.pageHeader('Nhật ký ngày')}
      <div class="card">
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
        <div class="muted small mt-8" style="line-height:1.6">
          Ô nào cô chưa kịp ghi thì để trống — màn hình của gia đình sẽ nói
          <b>"cô chưa ghi"</b>, chứ không nói bé không ăn.
        </div>
      </div>

      ${this.theThucDon(d.thucDon)}

      <div class="card">
        <div class="card-title">Đặt nhanh cho cả nhóm</div>
        <div class="muted small" style="margin-bottom:10px">Chọn ở đây rồi sửa lại riêng bé nào khác.</div>
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Bữa trưa</label>
            <select id="nk-ca-trua">
              <option value="">— không đặt —</option>
              ${this.MUC_AN.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin:0">
            <label>Ngủ trưa</label>
            <div class="flex" style="gap:6px">
              ${this.oGio('id="nk-ca-ngu-tu" style="flex:1;min-width:0"', '', 'từ')}
              ${this.oGio('id="nk-ca-ngu-den" style="flex:1;min-width:0"', '', 'đến')}
            </div>
          </div>
        </div>
        <button class="btn outline block mt-14" id="nk-ap">Áp cho cả nhóm</button>
      </div>

      ${(d.danhSach || []).length ? (d.danhSach || []).map(b => this.theBe(b, coNhaTre)).join('')
        : UI.emptyState('📔', 'Nhóm này chưa có bé nào.')}

      ${(d.danhSach || []).length ? `
        <button class="btn primary block mt-14" id="nk-luu">${UI.icon('check', 18)} Lưu nhật ký cả nhóm</button>` : ''}`;

    // ĐỔI NGÀY HAY ĐỔI NHÓM LÀ VẼ LẠI TOÀN BỘ — nên phải hỏi khi cô đang gõ dở.
    //
    // `App.route()` thay sạch nội dung `#view`, nghĩa là mọi ô cô vừa điền mà
    // chưa bấm Lưu đều mất. Cô nhập nhật ký cho hai mươi bé, chạm nhầm ô ngày,
    // mất cả buổi làm — và app không nói một lời nào.
    //
    // Chỉ hỏi khi THẬT SỰ có thay đổi chưa lưu. Hỏi khi không có gì để mất thì
    // lần thứ ba cô sẽ bấm "Đồng ý" theo phản xạ, và lời hỏi thành vô dụng.
    const nhoMoc = () => {
      this._moc = [...document.querySelectorAll('.nk-o')].map(o => o.value).join('\u0001');
    };
    const dangGoDo = () => {
      if (this._moc === undefined) return false;
      return [...document.querySelectorAll('.nk-o')].map(o => o.value).join('\u0001') !== this._moc;
    };
    const doiMan = (dat) => {
      if (dangGoDo() && !confirm('Cô đang nhập dở mà chưa bấm Lưu.\n\n'
        + 'Chuyển sang ngày hoặc nhóm khác sẽ mất phần vừa nhập. Cô vẫn chuyển chứ?')) {
        App.route();      // vẽ lại để ô chọn quay về đúng chỗ cũ
        return;
      }
      dat();
      App.route();
    };
    nhoMoc();

    document.getElementById('nk-ngay').onchange = (e) => {
      const v = e.target.value;
      doiMan(() => { this._ngay = v; });
    };
    const selNhom = document.getElementById('nk-nhom');
    if (selNhom) {
      selNhom.onchange = (e) => {
        const v = e.target.value;
        doiMan(() => { this._classId = v; });
      };
    }
    document.getElementById('nk-ap').onclick = () => this.apCaNhom();
    const btn = document.getElementById('nk-luu');
    if (btn) btn.onclick = () => this.luu();

    this.napLaiNhap();
    this.ganGhiNhap();
  },

  // Một thẻ cho một bé.
  //
  // MỌI Ô NHẬP ĐỀU NẰM TRONG `.field`, KHÔNG CÓ Ô NÀO ĐỨNG TRẦN.
  //
  // CSS chung chỉ cấp đệm cho ô nằm trong `.field`. Ô đứng trần cao đúng 21px
  // trên khổ điện thoại — nhỏ hơn đầu ngón tay người lớn cầm máy một tay. Cô sẽ
  // bấm hai ba lần, hoặc bấm nhầm sang ô của BÉ KHÁC ngay bên cạnh.
  //
  // Chỗ này từng sai đúng như vậy ở hai ô giờ ngủ và hai ô ghi chú; bộ canh bố
  // cục điện thoại trong `test/man-hinh-phan-he.test.mjs` mục [7] tìm ra.
  theBe(b, coNhaTre) {
    const id = UI.esc(b.studentId);
    // Nhớ dấu thời gian bản ghi lúc màn hình NẠP VỀ, để lúc lưu gửi kèm.
    // Máy chủ dùng nó để biết cô khác có vừa ghi cho bé này không — xem chú
    // thích dài ở `PUT /api/nhatky` trong routes.js.
    (this._goc || (this._goc = {}))[b.studentId] = b.capNhatLuc || '';
    // `data-nghi` để `apCaNhom()` bỏ qua bé này. Đánh dấu ở tầng ô chứ không
    // lọc ở tầng thẻ: cô vẫn gõ tay được cho bé, chỉ thao tác ĐIỀN HÀNG LOẠT
    // mới né ra.
    const dnghi = b.nghiPhep ? ' data-nghi="1"' : '';
    const chon = (ten, ma, ds, dangChon) => `
      <select class="nk-o"${dnghi} data-be="${id}" data-truong="${UI.esc(ma)}">
        <option value="">— chưa ghi —</option>
        ${ds.map(([v, t]) => `<option value="${UI.esc(v)}" ${dangChon === v ? 'selected' : ''}>${UI.esc(t)}</option>`).join('')}
      </select>`;
    const so = (ma, gt, ph) => `
      <input type="number" min="0" class="nk-o"${dnghi} data-be="${id}" data-truong="${UI.esc(ma)}"
        value="${gt === null || gt === undefined ? '' : UI.esc(String(gt))}" placeholder="${UI.esc(ph)}">`;

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

    return `
      <div class="card"${nghi ? ' style="opacity:.75"' : ''}>
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(b.avatar, 40)}
          <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
          ${nghi ? UI.badge('Nghỉ hôm nay', 'orange') : ''}
          ${b.daGhi ? UI.badge('Đã ghi', 'green') : ''}
        </div>
        ${daiNghi}

        <div class="section-label">Ăn</div>
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Sáng</label>${chon('Sáng', 'anSang', this.MUC_AN, b.anSang)}</div>
          <div class="field" style="margin:0"><label>Trưa</label>${chon('Trưa', 'anTrua', this.MUC_AN, b.anTrua)}</div>
        </div>
        <div class="field mt-8" style="margin-bottom:0"><label>Bữa xế</label>${chon('Xế', 'anXe', this.MUC_AN, b.anXe)}</div>
        <div class="field mt-8" style="margin-bottom:0">
          <input class="nk-o" data-be="${id}" data-truong="anGhiChu" placeholder="Ghi chú về bữa ăn"
            value="${UI.esc(b.anGhiChu || '')}">
        </div>

        <div class="section-label">Ngủ</div>
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Từ</label>
            ${this.oGio(`class="nk-o"${dnghi} data-be="${id}" data-truong="nguTuLuc"`, b.nguTuLuc || '', 'từ')}</div>
          <div class="field" style="margin:0"><label>Đến</label>
            ${this.oGio(`class="nk-o"${dnghi} data-be="${id}" data-truong="nguDenLuc"`, b.nguDenLuc || '', 'đến')}</div>
        </div>
        <div class="field mt-8" style="margin-bottom:0">
          <input class="nk-o" data-be="${id}" data-truong="nguGhiChu" placeholder="Ví dụ: ngủ ngon, hoặc trằn trọc đầu giờ"
            value="${UI.esc(b.nguGhiChu || '')}">
        </div>

        <div class="section-label">Vệ sinh</div>
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Số lần</label>${so('veSinhSoLan', b.veSinhSoLan, 'số lần')}</div>
          <div class="field" style="margin:0"><label>Tình trạng</label>${chon('Tình trạng', 'veSinhTinhChat', this.TINH_CHAT, b.veSinhTinhChat)}</div>
        </div>

        ${b.laNhaTre ? `
          <div class="section-label">Nhà trẻ</div>
          <div class="grid-2">
            <div class="field" style="margin:0"><label>Thay bỉm</label>${so('bimSoLan', b.bimSoLan, 'số lần')}</div>
            <div class="field" style="margin:0"><label>Bú bình</label>${so('buBinhSoLan', b.buBinhSoLan, 'số lần')}</div>
          </div>
          <div class="field mt-8" style="margin-bottom:0"><label>Tổng lượng sữa (ml)</label>${so('buBinhMl', b.buBinhMl, 'ml')}</div>`
        : (coNhaTre ? '' : '')}

        <div class="section-label">Lời nhắn cho gia đình</div>
        <div class="field" style="margin:0">
          <textarea class="nk-o" data-be="${id}" data-truong="ghiChu" rows="2"
            placeholder="Hôm nay có gì gia đình cần biết ạ">${UI.esc(b.ghiChu || '')}</textarea>
        </div>
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
    const trua = document.getElementById('nk-ca-trua').value;
    const tu = document.getElementById('nk-ca-ngu-tu').value;
    const den = document.getElementById('nk-ca-ngu-den').value;
    if (!trua && !tu && !den) return UI.toast('Cô chọn ít nhất một mục để áp nhé', 'error');

    const muon = [['anTrua', trua], ['nguTuLuc', tu], ['nguDenLuc', den]].filter(([, v]) => v);
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

  async luu() {
    const theoBe = new Map();
    for (const o of document.querySelectorAll('.nk-o')) {
      const be = o.dataset.be;
      if (!theoBe.has(be)) {
        theoBe.set(be, { studentId: be, capNhatLucGoc: (this._goc || {})[be] || '' });
      }
      theoBe.get(be)[o.dataset.truong] = o.value;
    }
    try {
      const r = await API.put('/api/nhatky', { ngay: this._ngay, danhSach: [...theoBe.values()] });
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
            : `Đã lưu nhật ký cho ${r.daGhi} bé`,
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
        : UI.emptyState('📔', 'Hai tuần vừa rồi chưa có ngày nào cô ghi nhật ký cho con.')}`;
  },

  theNgay(n, be) {
    // Viết thành CÂU, không phải bảng: gia đình đọc trên điện thoại buổi tối.
    // Ô trống thì nói "cô chưa ghi" — không bao giờ để người đọc tự suy ra.
    const dong = (nhan, gt) => `
      <div class="list-row"><div class="row-main">
        <div class="row-sub">${UI.esc(nhan)}</div>
        <div class="row-title">${gt ? UI.esc(gt) : '<span class="muted" style="font-weight:400">cô chưa ghi</span>'}</div>
      </div></div>`;

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
        ${dong('Ăn', bua)}
        ${mon.length ? `
          <div class="muted small" style="padding:0 0 8px;line-height:1.6">
            Thực đơn của trường hôm đó:
            ${mon.map(t => `<div>${UI.esc(t)}</div>`).join('')}
          </div>` : ''}
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
