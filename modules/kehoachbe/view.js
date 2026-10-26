// KẾ HOẠCH CỦA BÉ — màn hình.
//
// MÀN NÀY ĐƯỢC ĐO BẰNG SỐ LẦN GÕ, KHÔNG PHẢI BẰNG ĐỘ ĐẦY ĐỦ
//
// Một nhóm 20 bé nhân 5 góc lĩnh vực là 100 ô mỗi tháng. Nếu con đường mặc
// định của màn này là gõ 100 ô thì phân hệ bị bỏ xó sau tháng thứ hai, và cả
// phần "Class Progress" của nhà trường thành một mục chết. Nên ba nút tắt nằm
// NGAY TRÊN ĐẦU, trước cả danh sách bé:
//
//   Chép tháng trước · Đặt cả nhóm · Gửi duyệt cả nhóm
//
// QUY TẮC 2 Ở MÀN NÀY
//
// Phần cuối tháng gọi là "Nhìn lại", không phải "Đánh giá". Năm kết quả dùng
// đúng năm trạng thái của Hành trình học tập, không cái nào màu đỏ, và ô tích
// "Tiếp tục ở tháng sau" là một lựa chọn bình thường chứ không phải dấu hiệu
// một việc đã hỏng.
//
// ĐỢT 2 (phản hồi nhà trường 07/09)
//
//   • Mỗi góc có DANH MỤC BÀI HỌC để cô TÍCH thay vì gõ: bấm một bài là "Học
//     mới", bấm nữa là "Ôn tập", bấm nữa là "Mở rộng", bấm nữa là bỏ tích. Ô
//     chữ tự do vẫn còn đó cho việc không có trong danh mục.
//   • Kế hoạch ĐÃ DUYỆT thì cô không sửa thẳng: nút "Đề xuất sửa" mở một hộp
//     bắt ghi lý do; quản lý duyệt thì kế hoạch mở lại cho cô sửa.
//   • Nhìn lại từng bài ở HAI mức: "Đã thấy con làm được" và "Tiếp tục cùng
//     con". Bài "tiếp tục" được tích sẵn (ôn tập) khi cô lập tháng sau.
//
// GÓP Ý 06/10 (mục 6)
//
//   • BA TAB THEO CHƯƠNG TRÌNH: Montessori & Kỹ năng sống / Cambridge / Thể
//     chất. Mỗi tab do một cô soạn, tự "Lưu nháp" và tự "Gửi quản lý duyệt" —
//     máy chủ giữ trạng thái riêng từng phần. Tab không phải của cô thì cô xem
//     được, không sửa được.
//   • Chọn BÉ và THÁNG; với Montessori chọn LĨNH VỰC trước rồi mới tới danh
//     sách bài, và bài lọc theo LỨA của bé (3–4, 4–5, 5–6) từ kho bài.
//   • Nhãn "Học mới" đổi thành "Dạy mới" (máy chủ gửi chữ xuống).
//   • Màn duyệt của quản lý xem theo NGÀY / THÁNG / NĂM gửi, gom theo nhóm,
//     duyệt từng bé hoặc cả nhóm; gửi lại bắt buộc ghi lý do và cô được báo.
App.views.kehoachbe = {
  _classId: null,
  _thang: null,
  _data: null,
  _tab: 'lap',
  _ct: null,          // chương trình (tab) đang mở
  _be: '',            // '' = cả nhóm; hoặc mã một bé
  _goc: {},           // lĩnh vực đang chọn, theo chương trình
  _dy: { ky: 'thang', moc: '', trangThai: 'cho-duyet' },
  _nguoi: null,       // tài khoản mà mọi lựa chọn ở trên thuộc về

  TEN_CT: { 'chu-nhiem': 'Montessori & Kỹ năng sống', 'nuoc-ngoai': 'Cambridge', 'the-chat': 'Thể chất' },
  TEN_CO_CT: { 'chu-nhiem': 'cô phụ trách nhóm', 'nuoc-ngoai': 'cô nước ngoài', 'the-chat': 'cô thể chất' },

  // Vòng bấm của một chip bài học: bỏ tích → học mới → ôn tập → mở rộng → bỏ tích.
  VONG_NHAN: ['', 'hoc-moi', 'on-tap', 'mo-rong'],
  // Hai mức nhìn lại từng bài — không cái nào đỏ, không cái nào cam.
  MAU_KET_LUAN: { 'da-thay': 'green', 'tiep-tuc': 'blue' },

  // Không cái nào đỏ — cùng luật với phân hệ Hành trình học tập.
  MAU_KET_QUA: {
    'chua-day': 'gray',
    'chua-quan-sat-thay': 'gray',
    'dang-hinh-thanh': 'blue',
    'da-vung': 'green',
    'vuot-troi': 'green',
  },
  MAU_DUYET: {
    nhap: ['Cô đang soạn', 'gray'],
    'cho-duyet': ['Chờ quản lý duyệt', 'orange'],
    'da-duyet': ['Đã duyệt', 'green'],
    'tra-lai': ['Quản lý gửi lại', 'blue'],
  },

  laQuanLy() { return App.state.user.role === 'admin'; },

  // "S · Đã vững" — chữ quy ước đọc kèm tên trạng thái (góp ý 06/10, mục 7).
  chuMucDo(ma) {
    const t = ((this._data || {}).mucDo || []).find(x => x.ma === ma);
    return t ? (t.chuCai ? `${t.chuCai} · ${t.ten}` : t.ten) : '';
  },

  ten(ds, ma) {
    const t = (ds || []).find(x => x.ma === ma);
    return t ? t.ten : '';
  },

  async render(root, params) {
    // LỰA CHỌN CỦA NGƯỜI TRƯỚC KHÔNG SANG NGƯỜI SAU (góp ý 20/10, N8). Đối
    // tượng này sống suốt phiên trang, mà đăng xuất không tải lại trang: cô A
    // chọn nhóm của mình, đăng xuất, cô B đăng nhập trên cùng máy là màn hỏi
    // nhóm của cô A và nhận "Không có quyền xem kế hoạch của nhóm này".
    const nguoi = App.state.user.id;
    if (this._nguoi !== nguoi) {
      this._nguoi = nguoi;
      this._classId = null;
      this._thang = null;
      this._tab = 'lap';
      this._ct = null;
      this._be = '';
      this._goc = {};
      this._dy = { ky: 'thang', moc: '', trangThai: 'cho-duyet' };
    }
    // `#/kehoachbe/duyet` mở thẳng màn duyệt (tin báo cho quản lý trỏ vào đây).
    if (params && params[0] === 'duyet' && this.laQuanLy()) this._tab = 'duyet';
    this._thang = this._thang || UI.todayStr().slice(0, 7);
    // Đứng ở tab Duyệt thì danh sách duyệt tự ghi số lên tab — khỏi hỏi hai lần.
    const [d, soChoDuyet] = await Promise.all([
      this.napNhom(),
      this.laQuanLy() && this._tab !== 'duyet' ? this.demChoDuyet() : null,
    ]);
    this._data = d;
    this._classId = d.classId || this._classId;

    if (!d.classId) {
      root.innerHTML = UI.pageHeader('Kế hoạch của bé')
        + UI.emptyState('🧭', 'Cô chưa phụ trách nhóm nào nên chưa lập kế hoạch được.');
      return;
    }

    // Tab chương trình: giữ tab đang mở; lần đầu thì mở đúng tab của cô.
    const dsCt = (d.chuongTrinhTab || []).map(t => t.ma);
    if (!dsCt.includes(this._ct)) {
      this._ct = (d.ctCuaToi && dsCt.includes(d.ctCuaToi)) ? d.ctCuaToi
        : ((d.ctDuocSua || [])[0] || dsCt[0] || null);
    }
    if (this._be && !(d.danhSach || []).some(x => x.studentId === this._be)) this._be = '';

    root.innerHTML = `
      ${UI.pageHeader('Kế hoạch của bé')}
      ${this.laQuanLy() ? `
        <div class="seg" id="kb-tabs">
          <button class="${this._tab === 'lap' ? 'active' : ''}" data-tab="lap">Lập kế hoạch</button>
          <button class="${this._tab === 'duyet' ? 'active' : ''}" data-tab="duyet">${UI.esc(this.nhanTabDuyet(soChoDuyet))}</button>
          <button class="${this._tab === 'baihoc' ? 'active' : ''}" data-tab="baihoc">Kho bài học</button>
        </div>` : ''}

      ${this._tab === 'lap' || !this.laQuanLy() ? `
      <div class="card">
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Tháng</label>
            <input type="month" id="kb-thang" value="${UI.esc(this._thang)}">
          </div>
          ${(d.nhom || []).length > 1 ? `
            <div class="field" style="margin:0">
              <label>Nhóm</label>
              <select id="kb-nhom">
                ${(d.nhom || []).map(c => `<option value="${UI.esc(c.id)}" ${c.id === d.classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>
        <div class="field mt-8" style="margin-bottom:0">
          <label>Bé</label>
          <select id="kb-be">
            <option value="">Cả nhóm (${UI.esc(String(d.tong.soBe))} bé)</option>
            ${(d.danhSach || []).map(x => `<option value="${UI.esc(x.studentId)}" ${x.studentId === this._be ? 'selected' : ''}>${UI.esc(x.hoTen)}</option>`).join('')}
          </select>
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          ${UI.esc(String(d.tong.soBe))} bé · chưa lập ${UI.esc(String(d.tong.chuaLap))} ·
          chờ duyệt ${UI.esc(String(d.tong.choDuyet))} · đã duyệt ${UI.esc(String(d.tong.daDuyet))}
          ${d.tong.traLai ? ` · quản lý gửi lại ${UI.esc(String(d.tong.traLai))}` : ''}
        </div>
      </div>` : ''}

      <div id="kb-than"></div>`;

    const oThang = document.getElementById('kb-thang');
    if (oThang) oThang.onchange = (e) => { this._thang = e.target.value; App.route(); };
    const sel = document.getElementById('kb-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; this._be = ''; App.route(); };
    const selBe = document.getElementById('kb-be');
    // Đổi bé vẽ lại từ bản đã lưu — hỏi như nút đổi tab, không thì mọi chip
    // cô vừa bấm mà chưa Lưu nháp mất im lặng (vòng rà Đ232).
    if (selBe) {
      selBe.onchange = (e) => {
        if (this.dangSuaDo() && !confirm('Cô đang sửa dở mà chưa bấm Lưu nháp.\n\nĐổi bé sẽ mất phần vừa sửa. Cô vẫn đổi chứ?')) {
          e.target.value = this._be || '';
          return;
        }
        this._be = e.target.value;
        this.veLap(document.getElementById('kb-than'));
      };
    }
    const tabs = document.getElementById('kb-tabs');
    // Tab Duyệt có địa chỉ riêng (#/kehoachbe/duyet) để tin báo mở thẳng vào
    // đó; hai tab kia về #/kehoachbe — không thì địa chỉ cũ kéo màn về tab Duyệt.
    if (tabs) for (const b of tabs.querySelectorAll('button')) {
      b.onclick = () => {
        this._tab = b.dataset.tab;
        const muon = this._tab === 'duyet' ? '#/kehoachbe/duyet' : '#/kehoachbe';
        if (location.hash !== muon) location.hash = muon; else App.route();
      };
    }

    const than = document.getElementById('kb-than');
    if (this.laQuanLy() && this._tab === 'duyet') return this.veDuyet(than);
    if (this.laQuanLy() && this._tab === 'baihoc') return this.veBaiHoc(than);
    return this.veLap(than);
  },

  // Nhóm đang nhớ mà máy chủ trả 403 — cô vừa bị gỡ khỏi nhóm đó trong lúc
  // app còn mở (N8) — thì bỏ nó và để máy chủ chọn nhóm đầu tiên cô được phân.
  async napNhom() {
    const qThang = `thang=${encodeURIComponent(this._thang)}`;
    if (this._classId) {
      try {
        return await API.get(`/api/kehoachbe?classId=${encodeURIComponent(this._classId)}&${qThang}`);
      } catch (err) {
        if (err.status !== 403) throw err;
        this._classId = null;
        this._be = '';
      }
    }
    return API.get(`/api/kehoachbe?${qThang}`);
  },

  // SỐ TRÊN TAB "DUYỆT" HỎI ĐÚNG CÂU CỦA DANH SÁCH DUYỆT (góp ý 20/10, N7).
  // Trước đây tab đếm một nhóm và một tháng kế hoạch đang chọn ở tab Lập kế
  // hoạch, còn danh sách gom mọi nhóm theo ngày gửi: tab "Duyệt (0)" mở ra
  // một bé đang chờ. Nay cả hai cùng gọi `urlDuyet`.
  urlDuyet(trangThai) {
    const dy = this._dy;
    const homNay = UI.todayStr();
    if (!dy.moc) dy.moc = dy.ky === 'ngay' ? homNay : dy.ky === 'thang' ? homNay.slice(0, 7) : homNay.slice(0, 4);
    return `/api/kehoachbe/cho-duyet?ky=${encodeURIComponent(dy.ky)}&moc=${encodeURIComponent(dy.moc)}&trangThai=${encodeURIComponent(trangThai)}`;
  },
  // Đếm hỏng thì tab chỉ thiếu con số — không kéo cả màn Lập kế hoạch đổ theo.
  async demChoDuyet() {
    try { return (await API.get(this.urlDuyet('cho-duyet'))).tong; } catch (_) { return null; }
  },
  // Cộng đề xuất sửa đang chờ — đúng những đề xuất màn duyệt hiện bên dưới.
  nhanTabDuyet(soChoDuyet) {
    if (soChoDuyet == null) return 'Duyệt';
    return `Duyệt (${soChoDuyet + (((this._data || {}).tong || {}).deXuatCho || 0)})`;
  },
  datSoTabDuyet(soChoDuyet) {
    const b = document.querySelector('#kb-tabs [data-tab="duyet"]');
    if (b) b.textContent = this.nhanTabDuyet(soChoDuyet);
  },

  // Bài học của một góc (danh mục đang bật).
  baiCuaGoc(ma) {
    return ((this._data || {}).baiHoc || []).filter(b => b.gocLinhVuc === ma);
  },

  // Góc của chương trình đang mở, đúng thứ tự máy chủ gửi.
  gocCuaCt(ct) {
    const t = ((this._data || {}).chuongTrinhTab || []).find(x => x.ma === ct);
    const ma = t ? (t.goc || []).map(g => g.ma) : [];
    return ((this._data || {}).gocLinhVuc || []).filter(g => ma.includes(g.ma));
  },

  duocSuaCt(ct) {
    return ((this._data || {}).ctDuocSua || []).includes(ct);
  },

  // Trạng thái MỘT phần của bản kế hoạch. Máy chủ đời cũ chưa gửi
  // `chuongTrinh` thì về trạng thái chung của cả bản.
  ttCt(k, ct) {
    if (!k) return null;
    return (k.chuongTrinh && k.chuongTrinh[ct]) || {
      trangThai: k.trangThai, guiLuc: k.guiLuc, nguoiDuyetTen: k.nguoiDuyetTen, duyetLuc: k.duyetLuc,
      yKienDuyet: k.yKienDuyet, capNhatLuc: k.capNhatLuc, coNoiDung: true,
    };
  },

  // ================= Màn lập kế hoạch =================
  veLap(than) {
    const d = this._data;
    const ct = this._ct;
    const sua = this.duocSuaCt(ct);
    const goc = this.gocCuaCt(ct);
    if (!goc.some(g => g.ma === this._goc[ct])) this._goc[ct] = (goc[0] || {}).ma || '';
    const ds = (d.danhSach || []).filter(x => !this._be || x.studentId === this._be);
    const motBe = !!this._be;

    than.innerHTML = `
      <div class="seg" id="kb-ct" role="tablist" aria-label="Chương trình" style="overflow-x:auto">
        ${(d.chuongTrinhTab || []).map(t => `
          <button class="${t.ma === ct ? 'active' : ''}" data-ct="${UI.esc(t.ma)}" role="tab"
            aria-selected="${t.ma === ct ? 'true' : 'false'}">${UI.esc(this.TEN_CT[t.ma] || t.chuongTrinh || t.ten)}</button>`).join('')}
      </div>

      ${sua ? '' : `
        <div class="card"><div class="muted small" style="line-height:1.6">
          Phần <b>${UI.esc(this.TEN_CT[ct] || '')}</b> do ${UI.esc(this.TEN_CO_CT[ct] || 'cô khác')} của nhóm soạn và gửi duyệt.
          Cô xem được để nắm bé đang học gì, không sửa ở đây.
        </div></div>`}

      ${goc.length > 1 ? `
        <div class="card">
          <div class="field" style="margin:0">
            <label>Lĩnh vực</label>
            <select id="kb-goc">
              ${goc.map(g => `<option value="${UI.esc(g.ma)}" ${g.ma === this._goc[ct] ? 'selected' : ''}>${UI.esc(g.ten)}</option>`).join('')}
            </select>
          </div>
          <div class="muted small mt-8" style="line-height:1.6">
            Chọn lĩnh vực trước, rồi bấm bài cho từng bé: bấm một lần là <b>${UI.esc(this.tenNhan('hoc-moi'))}</b>,
            lần nữa là <b>${UI.esc(this.tenNhan('on-tap'))}</b>, lần nữa là <b>${UI.esc(this.tenNhan('mo-rong'))}</b>, lần nữa là bỏ.
            Bài đã lọc theo lứa tuổi của bé.
          </div>
        </div>` : ''}

      ${sua && !motBe ? `
        <div class="card">
          <div class="card-title">Đường tắt cho cả nhóm</div>
          <button class="btn outline block" id="kb-chep">${UI.icon('plus', 16)} Chép phần này của tháng ${UI.esc(d.thangTruoc)}</button>
          <button class="btn outline block mt-8" id="kb-ca-nhom">${UI.icon('edit', 16)} Đặt một kế hoạch cho cả nhóm</button>
        </div>` : ''}

      ${ds.map(x => this.theBe(x)).join('')}

      ${sua ? `
        <button class="btn primary block mt-14" id="kb-luu">${UI.icon('check', 18)} Lưu nháp${motBe ? '' : ' cả nhóm'}</button>
        <button class="btn outline block mt-8" id="kb-gui">${UI.icon('send', 16)} Gửi quản lý duyệt${motBe ? '' : ' cả nhóm'}</button>` : ''}`;

    for (const b of than.querySelectorAll('#kb-ct [data-ct]')) {
      b.onclick = () => {
        if (b.dataset.ct === this._ct) return;
        if (this.dangSuaDo() && !confirm('Cô đang sửa dở mà chưa bấm Lưu nháp.\n\nSang tab khác sẽ mất phần vừa sửa. Cô vẫn sang chứ?')) return;
        this._ct = b.dataset.ct;
        this.veLap(than);
      };
    }
    const selGoc = document.getElementById('kb-goc');
    if (selGoc) selGoc.onchange = () => { this._goc[ct] = selGoc.value; this.hienGoc(than); };
    const chep = document.getElementById('kb-chep');
    if (chep) chep.onclick = () => this.chepThangTruoc();
    const caNhom = document.getElementById('kb-ca-nhom');
    if (caNhom) caNhom.onclick = () => this.moDatCaNhom();
    const gui = document.getElementById('kb-gui');
    if (gui) gui.onclick = () => this.guiDuyet();
    const luu = document.getElementById('kb-luu');
    if (luu) luu.onclick = () => this.luuCaNhom();
    for (const b of than.querySelectorAll('[data-nhin-lai]')) {
      b.onclick = () => this.moNhinLai(b.dataset.nhinLai);
    }
    for (const b of than.querySelectorAll('[data-rut-lai]')) {
      b.onclick = () => this.rutLai(b.dataset.rutLai);
    }
    for (const b of than.querySelectorAll('[data-de-xuat]')) {
      b.onclick = () => this.moDeXuat(b.dataset.deXuat);
    }
    this.gangChip(than);
    this.hienGoc(than);
    this._mocSua = this.anhChup();
  },

  // Chỉ hiện vùng của lĩnh vực đang chọn. Vùng khác vẫn nằm trong trang (ẩn)
  // để lúc Lưu nháp gom đủ mọi bài của chương trình — không gửi thiếu là không
  // xoá nhầm bài cô đã tích ở lĩnh vực khác.
  hienGoc(vung) {
    const chon = this._goc[this._ct];
    for (const el of vung.querySelectorAll('.kb-vung')) {
      el.style.display = el.dataset.goc === chon || this.gocCuaCt(this._ct).length <= 1 ? '' : 'none';
    }
  },

  // Ảnh chụp mọi ô và chip đang có — để biết cô có sửa dở gì không.
  anhChup() {
    return [...document.querySelectorAll('.kb-o')].map(o => o.value).join('\u0001')
      + '\u0002' + [...document.querySelectorAll('.kb-bai')].map(c => c.dataset.nhan || '').join('\u0001');
  },
  dangSuaDo() {
    return this._mocSua !== undefined && this.anhChup() !== this._mocSua;
  },

  // CHIP BÀI HỌC — gắn sự kiện SAU khi vẽ, không nhét dữ liệu vào onclick.
  gangChip(vung) {
    for (const c of vung.querySelectorAll('.kb-bai')) {
      c.onclick = () => {
        const i = this.VONG_NHAN.indexOf(c.dataset.nhan || '');
        this.datChip(c, this.VONG_NHAN[(i + 1) % this.VONG_NHAN.length]);
      };
    }
  },

  tenNhan(ma) { return this.ten((this._data || {}).nhanBai, ma); },

  datChip(c, nhan) {
    c.dataset.nhan = nhan;
    c.className = `btn sm kb-bai ${nhan ? 'primary' : 'outline'}`;
    c.textContent = nhan ? `${c.dataset.ten} · ${this.tenNhan(nhan)}` : c.dataset.ten;
  },

  chip(be, bai, nhan) {
    return `<button type="button" class="btn sm kb-bai ${nhan ? 'primary' : 'outline'}"
      data-be="${UI.esc(be)}" data-bai="${UI.esc(bai.id)}" data-ten="${UI.esc(bai.ten)}" data-nhan="${UI.esc(nhan || '')}"
      ${bai.moTa ? `title="${UI.esc(bai.moTa)}"` : ''}>${UI.esc(nhan ? `${bai.ten} · ${this.tenNhan(nhan)}` : bai.ten)}</button>`;
  },

  // Bài của một góc dành cho bé này: đúng lứa của bé (bài không gắn lứa nào là
  // của mọi lứa), cộng bài bé ĐÃ được tích dù khác lứa — không giấu thứ đã lập.
  //
  // Bài đã tích mà văn phòng ẨN khỏi kho sau đó (kho trên màn chỉ có bài đang
  // dùng) vẫn phải có chip: không có chip thì lần Lưu nháp kế tiếp không gửi
  // bài ấy và máy chủ xoá nó khỏi kế hoạch — kèm cả phần nhìn lại (vòng rà
  // Đ232). Chip dựng từ chính dòng đã tích (tên, góc).
  baiChoBe(goc, x, daTich) {
    const kho = this.baiCuaGoc(goc);
    const ds = kho.filter(b => !(b.lua || []).length || !x.lua || (b.lua || []).includes(x.lua)
      || daTich.some(t => t.baiHocId === b.id));
    const daAn = daTich.filter(t => t.gocLinhVuc === goc && t.ten && !kho.some(b => b.id === t.baiHocId))
      .filter((t, i, a) => a.findIndex(y => y.baiHocId === t.baiHocId) === i)
      .map(t => ({ id: t.baiHocId, ten: t.ten, gocLinhVuc: goc, lua: [] }));
    return ds.concat(daAn);
  },

  theBe(x) {
    const d = this._data;
    const ct = this._ct;
    const k = x.ke;
    const p = this.ttCt(k, ct);
    const goc = this.gocCuaCt(ct);
    const maGoc = goc.map(g => g.ma);
    const tt = p && (p.coNoiDung || p.trangThai !== 'nhap')
      ? (this.MAU_DUYET[p.trangThai] || ['', 'gray']) : ['Chưa lập', 'gray'];
    const khoa = !this.duocSuaCt(ct) || (!!p && p.trangThai !== 'nhap' && p.trangThai !== 'tra-lai');
    const muc = k ? (k.muc || []).filter(m => maGoc.includes(m.gocLinhVuc)) : [];

    const baiDaTich = k ? (k.baiHoc || []).filter(b => maGoc.includes(b.gocLinhVuc)) : [];
    // Bé chưa có bản — hoặc PHẦN NÀY chưa ai soạn (vòng rà Đ232): bài "Tiếp
    // tục cùng con" của tháng gần nhất được TÍCH SẴN đúng nhãn cô chọn. Chỉ
    // tích trên màn — chưa ghi gì cho tới khi cô bấm Lưu.
    const goiY = !k ? (x.goiY || null)
      : (p && !p.coNoiDung && p.trangThai === 'nhap' ? (x.goiYPhanTrong || null) : null);
    const goiYCt = goiY ? (goiY.baiHoc || []).filter(b => maGoc.includes(b.gocLinhVuc)) : [];
    const nhanSan = (baiId) => {
      const t = baiDaTich.find(b => b.baiHocId === baiId);
      if (t) return t.nhan;
      const g = goiYCt.find(b => b.baiHocId === baiId);
      return g ? (g.nhan || 'on-tap') : '';
    };

    const oGoc = (g) => {
      const m = muc.find(y => y.gocLinhVuc === g.ma);
      const gt = m ? m.noiDung : '';
      const ds = this.baiChoBe(g.ma, x, baiDaTich.concat(goiYCt));
      if (khoa) {
        const bg = baiDaTich.filter(b => b.gocLinhVuc === g.ma);
        if (!gt && !bg.length) return `<div class="kb-vung" data-goc="${UI.esc(g.ma)}"></div>`;
        return `
          <div class="list-row kb-vung" data-goc="${UI.esc(g.ma)}"><div class="row-main">
            <div class="row-sub">${UI.esc(g.ten)}</div>
            ${bg.length ? `<div class="small" style="line-height:1.7">${bg.map(b =>
              `${UI.esc(b.ten)} <span class="muted">· ${UI.esc(this.tenNhan(b.nhan))}</span>${
                b.mucDo ? ` ${UI.badge(this.chuMucDo(b.mucDo), this.MAU_KET_QUA[b.mucDo] || 'gray')}`
                  : (b.ketQua ? ` ${UI.badge(this.ten(d.ketLuanBai, b.ketQua), this.MAU_KET_LUAN[b.ketQua] || 'gray')}` : '')}${
                b.tiepTuc ? ` <span class="muted small">· ${UI.esc(this.ten(d.tiepTuc, b.tiepTuc).toLowerCase())}</span>` : ''}`).join('<br>')}</div>` : ''}
            ${gt ? `<div class="row-title" style="font-weight:400">${UI.esc(gt)}</div>` : ''}
            ${m && m.ketQua ? `<div class="row-sub">${UI.esc(this.ten(d.ketQua, m.ketQua))}${m.tiepTucThangSau ? ' · tiếp tục ở tháng sau' : ''}</div>` : ''}
          </div></div>`;
      }
      return `
        <div class="field kb-vung" data-goc="${UI.esc(g.ma)}" style="margin-bottom:8px">
          <label>${UI.esc(g.ten)}${x.lua ? ` <span class="muted" style="font-weight:400">· bài cho lứa ${UI.esc(x.lua.replace('-', '–'))} tuổi</span>` : ''}</label>
          ${ds.length ? `<div class="flex" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${
            ds.map(b => this.chip(x.studentId, b, nhanSan(b.id))).join('')}</div>`
            : '<div class="muted small" style="margin-bottom:6px">Kho chưa có bài cho lứa này — văn phòng thêm ở mục Kho bài học.</div>'}
          <input class="kb-o" data-be="${UI.esc(x.studentId)}" data-goc="${UI.esc(g.ma)}"
            value="${UI.esc(gt)}" placeholder="Việc khác ngoài danh mục (không bắt buộc)">
        </div>`;
    };
    // Đề xuất của ĐÚNG phần này; máy chủ đời cũ chưa có khoá theo phần thì
    // dùng đề xuất của cả bản như trước.
    const dx = k && (k.deXuatTheoCt ? k.deXuatTheoCt[ct] : k.deXuat);
    const suaDuoc = this.duocSuaCt(ct);

    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(x.avatar, 40)}
          <div class="row-main">
            <div class="row-title">${UI.esc(x.hoTen)}</div>
            ${p && p.nguoiDuyetTen && p.duyetLuc ? `<div class="row-sub">${UI.esc(p.nguoiDuyetTen)} · ${UI.esc(UI.timeAgo(p.duyetLuc))}</div>` : ''}
          </div>
          ${UI.badge(tt[0], tt[1])}
        </div>

        ${p && p.trangThai === 'tra-lai' && p.yKienDuyet ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Quản lý gửi lại: ${UI.esc(p.yKienDuyet)}
          </div>` : ''}

        ${goiYCt.length ? `
          <div class="small muted" style="line-height:1.6;margin-bottom:8px">
            Tháng ${UI.esc(goiY.tuThang)} cô ghi <b>Tiếp tục ở tháng sau</b>: ${UI.esc(goiYCt.map(b => b.ten).join(', '))}
            — đã tích sẵn đúng lựa chọn của cô (dạy mới, ôn tập hoặc mở rộng), cô bỏ tích được.
          </div>` : ''}

        ${dx && dx.trangThai === 'cho-duyet' ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Đề xuất sửa đang chờ quản lý: ${UI.esc(dx.lyDo)}
          </div>` : ''}
        ${dx && dx.trangThai === 'tu-choi' && p && p.trangThai === 'da-duyet' ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Quản lý chưa đồng ý mở lại: ${UI.esc(dx.yKien || '')}
          </div>` : ''}

        ${goc.map(g => oGoc(g)).join('')}

        ${k && suaDuoc ? `
          <div class="grid-2 mt-8">
            <button class="btn outline" data-nhin-lai="${UI.esc(k.id)}">${UI.icon('star', 16)} Nhìn lại cuối tháng</button>
            ${p && p.trangThai === 'cho-duyet'
              ? `<button class="btn danger-soft" data-rut-lai="${UI.esc(k.id)}">Rút lại để sửa</button>`
              : (p && p.trangThai === 'da-duyet' && !(dx && dx.trangThai === 'cho-duyet')
                ? `<button class="btn outline" data-de-xuat="${UI.esc(k.id)}">${UI.icon('edit', 16)} Đề xuất sửa</button>`
                : '<span></span>')}
          </div>` : ''}
      </div>`;
  },

  // ĐỀ XUẤT SỬA KẾ HOẠCH ĐÃ DUYỆT — lý do là bắt buộc, đúng lời nhà trường.
  moDeXuat(keId) {
    UI.modal(`
      <div class="muted small" style="line-height:1.6;margin-bottom:12px">
        Kế hoạch này quản lý đã duyệt. Cô ghi <b>vì sao</b> muốn đổi và định đổi gì;
        quản lý đồng ý thì kế hoạch mở lại cho cô sửa, sửa xong gửi duyệt lại.
      </div>
      <div class="field">
        <label>Lý do</label>
        <textarea id="kb-dx-lydo" rows="2" placeholder="Ví dụ: bé nghỉ ốm hai tuần, bài Gậy số chưa kịp bắt đầu"></textarea>
      </div>
      <div class="field">
        <label>Định đổi gì (mỗi dòng một ý, không bắt buộc)</label>
        <textarea id="kb-dx-nd" rows="3" placeholder="Toán: bỏ Gậy số, thêm Số nhám"></textarea>
      </div>
      <button class="btn primary block" id="kb-dx-gui">${UI.icon('send', 16)} Gửi đề xuất</button>
    `, 'Đề xuất sửa kế hoạch');
    document.getElementById('kb-dx-gui').onclick = async () => {
      const lyDo = document.getElementById('kb-dx-lydo').value.trim();
      if (!lyDo) return UI.toast('Cô ghi rõ lý do nhé — quản lý đọc dòng này để quyết', 'error');
      try {
        await API.post(`/api/kehoachbe/${encodeURIComponent(keId)}/de-xuat`, {
          lyDo, noiDung: document.getElementById('kb-dx-nd').value.trim(), chuongTrinh: this._ct,
        });
        UI.toast('Đã gửi đề xuất — quản lý duyệt thì kế hoạch mở lại cho cô', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // LƯU NHÁP phần của chương trình đang mở. `im` = gọi từ nút Gửi duyệt: không
  // báo "chưa sửa gì" và không vẽ lại màn — nút Gửi lo phần đó.
  async luuCaNhom({ im = false } = {}) {
    const ct = this._ct;
    const theoBe = new Map();
    const layBe = (be) => {
      if (!theoBe.has(be)) {
        // Gửi kèm dấu thời gian của bản đã NẠP VỀ (null khi bé chưa có bản
        // nào) — máy chủ so nó để ảnh chụp màn hình cũ của cô này không đè
        // lên phần cô kia vừa lưu.
        const x = ((this._data || {}).danhSach || []).find(y => y.studentId === be);
        const mucCu = (x && x.ke && x.ke.muc) || [];
        const baiCu = (x && x.ke && x.ke.baiHoc) || [];
        const p = x && x.ke ? this.ttCt(x.ke, ct) : null;
        theoBe.set(be, {
          studentId: be,
          // Mốc của ĐÚNG PHẦN chương trình này (máy chủ so theo phần).
          capNhatLucGoc: x && x.ke ? (p ? (p.capNhatLuc || null) : (x.ke.capNhatLuc || null)) : null,
          muc: [],
          baiHoc: [],
          mucCu,
          baiCu,
          coSua: false,
        });
      }
      return theoBe.get(be);
    };
    for (const o of document.querySelectorAll('.kb-o')) {
      const t = layBe(o.dataset.be);
      const cu = (t.mucCu.find(m => m.gocLinhVuc === o.dataset.goc) || {}).noiDung || '';
      if (o.value.trim() !== cu) t.coSua = true;
      t.muc.push({ gocLinhVuc: o.dataset.goc, noiDung: o.value.trim() });
    }
    // Chip bài học: so với bản đã nạp để biết cô có đổi gì không. Bé chưa có
    // bản mà có chip tích sẵn từ gợi ý thì đó là một thay đổi thật — lưu.
    for (const c of document.querySelectorAll('.kb-bai')) {
      const t = layBe(c.dataset.be);
      const nhan = c.dataset.nhan || '';
      const cu = (t.baiCu.find(b => b.baiHocId === c.dataset.bai) || {}).nhan || '';
      if (nhan !== cu) t.coSua = true;
      if (nhan) t.baiHoc.push({ baiHocId: c.dataset.bai, nhan });
    }
    // CHỈ GỬI BÉ CÔ CÓ SỬA. Gửi cả mấy bé cô không đụng tới là gửi ảnh chụp
    // màn hình của họ — mà ảnh đó có thể đã cũ: cô khác vừa lập kế hoạch cho
    // một bé đang hiện "Chưa lập" trên màn của cô này. Lần Lưu đầu máy chủ
    // chặn được nhờ mốc nền; nhưng sau lời báo đụng độ, lần Lưu thứ hai (mốc
    // đã nạp lại) sẽ ghi đè cả bé đó — cô không hề gõ, chỉ vì nó nằm trên
    // màn. Bé không sửa thì không gửi: không có gì để đè.
    const danhSach = [...theoBe.values()].filter(t => t.coSua)
      .map(({ mucCu: _c, baiCu: _b, coSua: _s, ...t }) => t);
    if (!theoBe.size) { if (!im) UI.toast('Không có bé nào đang mở để sửa', 'error'); return { khongDoi: true }; }
    if (!danhSach.length) { if (!im) UI.toast('Cô chưa sửa ô nào so với bản đang lưu', 'error'); return { khongDoi: true }; }
    try {
      const r = await API.put('/api/kehoachbe', {
        classId: this._classId, thang: this._thang, chuongTrinh: ct, danhSach,
      });

      // CÓ BÉ ĐỤNG ĐỘ: cô khác vừa lưu trong lúc màn này đang mở. KHÔNG vẽ
      // lại màn — vẽ lại là phần cô đang gõ cho mấy bé đó biến mất. Chỉ nạp
      // lại dấu thời gian nền, để nếu cô đọc lời báo xong vẫn bấm Lưu lần
      // nữa thì đó là một lần ghi đè CÓ CHỦ Ý, không phải một tai nạn.
      if (r.xungDot && r.xungDot.length) {
        UI.toast(r.nhac || `${r.xungDot.length} bé chưa lưu được vì cô khác vừa sửa — bấm Lưu lần nữa nếu cô muốn giữ bản đang gõ`, 'error');
        await this.napLaiMoc();
        return { loi: true };
      }
      // NHÁNH `daLuu = 0` TỪNG NÓI NGƯỢC HẲN VIỆC CÔ VỪA LÀM.
      //
      // Cô gõ nội dung cho đúng một bé, mà bé đó gia đình đã dừng hồ sơ học
      // tập: máy chủ bỏ qua, `daLuu` bằng 0, và màn hình báo "Chưa có bé nào
      // được gõ nội dung". Cô nhìn xuống thấy chữ mình vừa gõ còn nguyên trên
      // màn hình, kết luận app hỏng, rồi gõ lại lần nữa.
      const boQua = this.nhacBoQua(r);
      if (im) return { daLuu: r.daLuu };
      UI.toast(
        r.daLuu ? `Đã lưu nháp phần ${this.TEN_CT[ct] || ''} cho ${r.daLuu} bé${boQua}`
          : (boQua ? `Không lưu được bé nào${boQua}` : 'Chưa có bé nào được gõ nội dung'),
        r.daLuu ? 'success' : 'error');
      App.route();
      return { daLuu: r.daLuu };
    } catch (err) { UI.toast(err.message, 'error'); return { loi: true }; }
  },

  // Nạp lại RIÊNG dấu thời gian nền sau một lần đụng độ — không đụng tới ô
  // nào đang gõ trên màn. Không nạp lại thì lần Lưu sau vẫn đụng độ mãi với
  // chính lời báo cũ, không có đường ra.
  async napLaiMoc() {
    try {
      const d = await API.get(`/api/kehoachbe?classId=${encodeURIComponent(this._classId)}&thang=${encodeURIComponent(this._thang)}`);
      const moi = new Map((d.danhSach || []).map(x => [x.studentId, x.ke]));
      for (const x of ((this._data || {}).danhSach || [])) {
        if (moi.has(x.studentId)) x.ke = moi.get(x.studentId);
      }
    } catch (_) { /* mạng chập chờn thì thôi — lần Lưu sau sẽ báo lại */ }
  },

  // CÔ PHẢI ĐƯỢC BIẾT BÉ NÀO BỊ BỎ QUA.
  //
  // Máy chủ trả `boQuaNgungHoSo` — tên những bé mà gia đình đã dừng phần hồ sơ
  // học tập (Đ96) — nhưng màn hình chưa bao giờ đọc tới. Cô lưu kế hoạch cho cả
  // nhóm, đọc "Đã lưu kế hoạch cho 24 bé", và tưởng cả nhóm xong. Bé thứ 25 bị
  // loại lặng lẽ.
  //
  // Im lặng bỏ qua đúng là thứ chú thích ở máy chủ đã cấm: "Im lặng bỏ qua
  // cũng sai — cô sẽ tưởng đã lập kế hoạch cho cả nhóm."
  nhacBoQua(r) {
    const ds = (r && r.boQuaNgungHoSo) || [];
    if (!ds.length) return '';
    return ds.length === 1
      ? ` — riêng bé ${ds[0]} thì gia đình đã dừng phần hồ sơ học tập, cô nhé`
      : ` — riêng ${ds.length} bé (${ds.join(', ')}) thì gia đình đã dừng phần hồ sơ học tập`;
  },

  moDatCaNhom() {
    const d = this._data;
    UI.modal(`
      <div class="muted small" style="line-height:1.6;margin-bottom:12px">
        Gõ ở đây một lần, cả nhóm có kế hoạch. Bé nào cô đã nhập riêng ở góc đó thì
        <b>giữ nguyên</b> — nút này không đè lên phần cô vừa gõ tay.
      </div>
      ${this.gocCuaCt(this._ct).map(g => `
        <div class="field">
          <label>${UI.esc(g.ten)}</label>
          ${this.baiCuaGoc(g.ma).length ? `<div class="flex" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${
            this.baiCuaGoc(g.ma).map(b => this.chip('*', b, '')).join('')}</div>` : ''}
          <input id="kb-cn-${UI.esc(g.ma)}" placeholder="Việc khác ngoài danh mục — để trống thì bỏ qua">
        </div>`).join('')}
      <button class="btn primary block" id="kb-cn-luu">${UI.icon('check', 18)} Đặt cho cả nhóm</button>
    `, `Đặt cho cả nhóm · ${this.TEN_CT[this._ct] || ''}`);
    const ov = document.getElementById('modal-overlay');
    if (ov) this.gangChip(ov);
    document.getElementById('kb-cn-luu').onclick = async () => {
      const muc = this.gocCuaCt(this._ct).map(g => ({
        gocLinhVuc: g.ma,
        noiDung: (document.getElementById(`kb-cn-${g.ma}`) || {}).value || '',
      })).filter(m => m.noiDung.trim());
      const baiHoc = [...(ov ? ov.querySelectorAll('.kb-bai') : [])]
        .filter(c => c.dataset.nhan).map(c => ({ baiHocId: c.dataset.bai, nhan: c.dataset.nhan }));
      if (!muc.length && !baiHoc.length) return UI.toast('Cô tích ít nhất một bài hoặc gõ một góc nhé', 'error');
      try {
        const r = await API.post('/api/kehoachbe/dat-ca-nhom', {
          classId: this._classId, thang: this._thang, chuongTrinh: this._ct, muc, baiHoc,
        });
        UI.toast(`Đã đặt cho ${r.daDat} bé${r.boQua ? `, bỏ qua ${r.boQua} bé đang khoá` : ''}`
          + this.nhacBoQua(r), 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async chepThangTruoc() {
    try {
      const r = await API.post('/api/kehoachbe/chep-thang-truoc', {
        classId: this._classId, thang: this._thang, chuongTrinh: this._ct,
      });
      const boQuaChep = this.nhacBoQua(r);
      UI.toast(r.daChep
        ? `Đã chép cho ${r.daChep} bé — mục "tiếp tục ở tháng sau" xếp lên trước${boQuaChep}`
        : (boQuaChep
          ? `Không chép được bé nào${boQuaChep}`
          : 'Không có gì để chép (tháng trước trống, hoặc tháng này đã soạn rồi)'),
      r.daChep ? 'success' : 'error');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async guiDuyet() {
    // Cô sửa xong bấm thẳng "Gửi" là chuyện thường — lưu phần đang sửa trước,
    // rồi mới gửi. Không vậy thì quản lý duyệt bản CŨ còn cô tưởng đã gửi bản mới.
    if (this.dangSuaDo()) {
      const l = await this.luuCaNhom({ im: true });
      if (l && l.loi) return;
    }
    try {
      const r = await API.post('/api/kehoachbe/gui-duyet', {
        classId: this._classId, thang: this._thang, chuongTrinh: this._ct,
        ...(this._be ? { studentId: this._be } : {}),
      });
      UI.toast(r.daGui
        ? `Đã gửi ${r.daGui} kế hoạch cho quản lý${r.trong ? `, bỏ qua ${r.trong} bé chưa có mục nào` : ''}`
        : 'Chưa có kế hoạch nào để gửi', r.daGui ? 'success' : 'error');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async rutLai(id) {
    try {
      await API.post('/api/kehoachbe/rut-lai', { id, chuongTrinh: this._ct });
      UI.toast('Đã rút lại — cô sửa tiếp rồi gửi lại nhé', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ================= Nhìn lại cuối tháng =================
  moNhinLai(keId) {
    const d = this._data;
    const x = (d.danhSach || []).find(y => y.ke && y.ke.id === keId);
    if (!x) return;
    // Chỉ phần của chương trình đang mở — cô Cambridge nhìn lại bài Cambridge.
    const maGoc = this.gocCuaCt(this._ct).map(g => g.ma);
    const k = { ...x.ke,
      baiHoc: (x.ke.baiHoc || []).filter(b => maGoc.includes(b.gocLinhVuc)),
      muc: (x.ke.muc || []).filter(m => maGoc.includes(m.gocLinhVuc)) };
    if (!k.baiHoc.length && !k.muc.length) return UI.toast('Phần này chưa có bài nào để nhìn lại', 'error');
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(x.avatar, 40)}
        <div class="row-main"><div class="row-title">${UI.esc(x.hoTen)}</div>
          <div class="row-sub">Tháng ${UI.esc(k.thang)} · ${UI.esc(this.TEN_CT[this._ct] || '')}</div></div>
      </div>
      <div class="muted small" style="line-height:1.6;margin-bottom:12px">
        Đây là chỗ <b>nhìn lại</b>, không phải chỗ chấm điểm. "Chưa quan sát thấy" nghĩa là
        cô chưa có dịp thấy, <b>không phải bé không làm được</b> — chọn nó là bình thường.
        Việc gì cần làm tiếp thì tích "Tiếp tục ở tháng sau", nút <i>Chép tháng trước</i>
        sẽ mang nó sang giúp cô.
      </div>
      ${(k.baiHoc || []).map((b, i) => `
        <div style="${i ? 'border-top:1px solid var(--line);padding-top:10px;margin-top:12px' : ''}">
          <div class="small" style="font-weight:700">${UI.esc(this.ten(d.gocLinhVuc, b.gocLinhVuc))} · ${UI.esc(b.ten)}
            <span class="muted" style="font-weight:400">· ${UI.esc(this.tenNhan(b.nhan))}</span></div>
          ${(d.mucDo || []).length ? `
          <div class="grid-2 mt-8">
            <div class="field" style="margin:0"><label>Mức độ (chữ quy ước)</label>
              <select class="kb-md" data-bai-id="${UI.esc(b.id)}">
                <option value="">— chưa chọn —</option>
                ${(d.mucDo || []).map(t => `<option value="${UI.esc(t.ma)}" ${b.mucDo === t.ma ? 'selected' : ''}>${UI.esc(t.chuCai ? `${t.chuCai} · ${t.ten}` : t.ten)}</option>`).join('')}
              </select></div>
            <div class="field" style="margin:0"><label>Tiếp tục ở tháng sau</label>
              <select class="kb-tt" data-bai-id="${UI.esc(b.id)}">
                <option value="">— không —</option>
                ${(d.tiepTuc || []).map(t => `<option value="${UI.esc(t.ma)}" ${b.tiepTuc === t.ma ? 'selected' : ''}>${UI.esc(t.ten)}</option>`).join('')}
              </select></div>
          </div>` : `
          <div class="seg mt-8" data-kl-cua="${UI.esc(b.id)}">
            ${(d.ketLuanBai || []).map(t => `<button type="button" class="${b.ketQua === t.ma ? 'active' : ''}" data-kl="${UI.esc(t.ma)}">${UI.esc(t.ten)}</button>`).join('')}
          </div>`}
          <input class="kb-bnx mb-8 mt-8" data-bai-id="${UI.esc(b.id)}" value="${UI.esc(b.nhanXet || '')}" placeholder="Ghi chú thêm (không bắt buộc)">
        </div>`).join('')}
      ${(k.muc || []).map((m, i) => `
        <div style="${i || (k.baiHoc || []).length ? 'border-top:1px solid var(--line);padding-top:10px;margin-top:12px' : ''}">
          <div class="small" style="font-weight:700">${UI.esc(this.ten(d.gocLinhVuc, m.gocLinhVuc))}</div>
          <div class="small" style="line-height:1.6;margin-bottom:8px">${UI.esc(m.noiDung)}</div>
          <div class="field" style="margin-bottom:8px">
            <label>Cuối tháng cô thấy bé đang ở đâu</label>
            <select id="kb-kq-${i}">
              <option value="">— chưa chọn —</option>
              ${(d.ketQua || []).map(t => `<option value="${UI.esc(t.ma)}" ${m.ketQua === t.ma ? 'selected' : ''}>${UI.esc(t.ten)}</option>`).join('')}
            </select>
          </div>
          <input id="kb-nx-${i}" class="mb-8" value="${UI.esc(m.nhanXet || '')}" placeholder="Ghi chú thêm (không bắt buộc)">
          <label class="flex" style="gap:8px;cursor:pointer">
            <input type="checkbox" id="kb-tt-${i}" ${m.tiepTucThangSau ? 'checked' : ''}>
            <span class="small">Tiếp tục ở tháng sau</span>
          </label>
          <input type="hidden" id="kb-id-${i}" value="${UI.esc(m.id)}">
        </div>`).join('')}
      <button class="btn primary block mt-14" id="kb-nl-luu">${UI.icon('check', 18)} Lưu phần nhìn lại</button>
    `, 'Nhìn lại cuối tháng');

    const ov = document.getElementById('modal-overlay');
    // Hai nút một hàng: bấm lại nút đang chọn là bỏ chọn — "chưa kết luận"
    // cũng là một trạng thái hợp lệ, không ép cô phải chọn một trong hai.
    for (const seg of ov.querySelectorAll('[data-kl-cua]')) {
      for (const nut of seg.querySelectorAll('button')) {
        nut.onclick = () => {
          const dangChon = nut.classList.contains('active');
          for (const x of seg.querySelectorAll('button')) x.classList.remove('active');
          if (!dangChon) nut.classList.add('active');
        };
      }
    }
    document.getElementById('kb-nl-luu').onclick = async () => {
      const muc = (k.muc || []).map((m, i) => ({
        id: document.getElementById(`kb-id-${i}`).value,
        ketQua: document.getElementById(`kb-kq-${i}`).value,
        nhanXet: document.getElementById(`kb-nx-${i}`).value.trim(),
        tiepTucThangSau: document.getElementById(`kb-tt-${i}`).checked,
      }));
      // Màn đời mới: mức độ bằng chữ quy ước + "tiếp tục ở tháng sau" —
      // máy chủ tự suy ra kết luận hai mức cho các chỗ đang đọc nó.
      const baiHoc = (d.mucDo || []).length
        ? [...ov.querySelectorAll('.kb-md')].map(o => {
          const id = o.dataset.baiId;
          const tt = ov.querySelector(`.kb-tt[data-bai-id="${id}"]`);
          const nx = ov.querySelector(`.kb-bnx[data-bai-id="${id}"]`);
          return { id, mucDo: o.value, tiepTuc: tt ? tt.value : '', nhanXet: nx ? nx.value.trim() : '' };
        })
        : [...ov.querySelectorAll('[data-kl-cua]')].map(seg => {
          const chon = seg.querySelector('button.active');
          const nx = ov.querySelector(`.kb-bnx[data-bai-id="${seg.dataset.klCua}"]`);
          return { id: seg.dataset.klCua, ketQua: chon ? chon.dataset.kl : '', nhanXet: nx ? nx.value.trim() : '' };
        });
      try {
        await API.put('/api/kehoachbe/nhin-lai', { id: keId, muc, baiHoc });
        UI.toast('Đã lưu phần nhìn lại', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ================= Màn duyệt của quản lý =================
  //
  // Góp ý 06/10 (mục 6): "Quản lý có màn hình xem theo Ngày/Tháng/Năm để duyệt
  // kế hoạch (duyệt từng em hoặc duyệt hàng loạt theo nhóm). Nếu từ chối, bắt
  // buộc nhập lý do để hệ thống gửi thông báo trả về cho giáo viên."
  //
  // Mỗi dòng là MỘT PHẦN chương trình của một bé — Montessori, Cambridge và
  // Thể chất do ba cô khác nhau gửi, duyệt riêng từng phần.
  async veDuyet(than) {
    const d0 = this._data;
    const dy = this._dy;
    let d;
    try {
      d = await API.get(this.urlDuyet(dy.trangThai));
    } catch (err) { than.innerHTML = UI.emptyState('🧭', err.message); return; }
    this._duyet = d;
    this.datSoTabDuyet(d.trangThai === 'cho-duyet' ? d.tong : await this.demChoDuyet());
    const oMoc = dy.ky === 'ngay' ? `<input type="date" id="kb-dy-moc" value="${UI.esc(d.moc)}">`
      : dy.ky === 'thang' ? `<input type="month" id="kb-dy-moc" value="${UI.esc(d.moc)}">`
        : `<input type="number" id="kb-dy-moc" min="2020" max="2100" value="${UI.esc(d.moc)}">`;
    const dxCho = (d0.danhSach || []).filter(x => x.ke && x.ke.deXuat && x.ke.deXuat.trangThai === 'cho-duyet');
    const choDuyet = d.trangThai === 'cho-duyet';

    than.innerHTML = `
      <div class="card">
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Xem theo</label>
            <select id="kb-dy-ky">
              <option value="ngay" ${dy.ky === 'ngay' ? 'selected' : ''}>Ngày gửi</option>
              <option value="thang" ${dy.ky === 'thang' ? 'selected' : ''}>Tháng gửi</option>
              <option value="nam" ${dy.ky === 'nam' ? 'selected' : ''}>Năm gửi</option>
            </select>
          </div>
          <div class="field" style="margin:0"><label>${dy.ky === 'ngay' ? 'Ngày' : dy.ky === 'thang' ? 'Tháng' : 'Năm'}</label>${oMoc}</div>
        </div>
        <div class="field mt-8" style="margin-bottom:0">
          <label>Hiện</label>
          <select id="kb-dy-tt">
            <option value="cho-duyet" ${choDuyet ? 'selected' : ''}>Đang chờ duyệt</option>
            <option value="tat-ca" ${choDuyet ? '' : 'selected'}>Mọi phần đã gửi (cả đã duyệt, đã gửi lại)</option>
          </select>
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          ${UI.esc(String(d.tong))} phần kế hoạch. Duyệt từng bé hoặc cả nhóm một lần;
          <b>gửi lại thì phải ghi một dòng vì sao</b> — cô được báo ngay và đọc dòng đó để sửa.
        </div>
      </div>

      ${(d.nhom || []).map(n => this.theNhomDuyet(n, choDuyet)).join('')}
      ${!(d.nhom || []).length ? UI.emptyState('🧭', choDuyet ? 'Không có phần kế hoạch nào chờ duyệt trong khoảng này.' : 'Chưa có phần kế hoạch nào được gửi trong khoảng này.') : ''}

      ${dxCho.length ? `
        <div class="card">
          <div class="card-title">Đề xuất sửa kế hoạch đã duyệt · nhóm ${UI.esc(((d0.nhom || []).find(c => c.id === d0.classId) || {}).name || '')}, tháng ${UI.esc(d0.thang)}</div>
          <div class="muted small" style="line-height:1.6">
            Đồng ý thì phần đó <b>mở lại</b> cho cô sửa, sửa xong cô gửi duyệt lại. Từ chối thì ghi một dòng vì sao.
          </div>
        </div>
        ${dxCho.map(x => `
          <div class="card">
            <div class="list-row" style="border-bottom:none;padding-top:0">
              ${UI.avatar(x.avatar, 40)}
              <div class="row-main">
                <div class="row-title">${UI.esc(x.hoTen)}</div>
                <div class="row-sub">${UI.esc(x.ke.deXuat.coDeXuatTen || '')} đề xuất ${UI.esc(UI.timeAgo(x.ke.deXuat.taoLuc))}</div>
              </div>
            </div>
            <div class="small" style="line-height:1.6"><b>Lý do:</b> ${UI.esc(x.ke.deXuat.lyDo)}</div>
            ${x.ke.deXuat.noiDung ? `<div class="small mt-8" style="white-space:pre-wrap;line-height:1.6">${UI.esc(x.ke.deXuat.noiDung)}</div>` : ''}
            <div class="grid-2 mt-8">
              <button class="btn success-soft" data-dx-duyet="${UI.esc(x.ke.deXuat.id)}">${UI.icon('check', 16)} Đồng ý, mở lại</button>
              <button class="btn danger-soft" data-dx-tu-choi="${UI.esc(x.ke.deXuat.id)}">Từ chối</button>
            </div>
          </div>`).join('')}` : ''}`;

    document.getElementById('kb-dy-ky').onchange = (e) => { dy.ky = e.target.value; dy.moc = ''; this.veDuyet(than); };
    document.getElementById('kb-dy-moc').onchange = (e) => { dy.moc = String(e.target.value || ''); this.veDuyet(than); };
    document.getElementById('kb-dy-tt').onchange = (e) => { dy.trangThai = e.target.value; this.veDuyet(than); };
    for (const b of than.querySelectorAll('[data-dx-duyet]')) {
      b.onclick = () => this.duyetDeXuat(b.dataset.dxDuyet, 'da-duyet');
    }
    for (const b of than.querySelectorAll('[data-dx-tu-choi]')) {
      b.onclick = () => this.moTuChoiDeXuat(b.dataset.dxTuChoi);
    }
    const phanCua = (nut) => {
      const [keId, chuongTrinh] = String(nut).split('|');
      return { keId, chuongTrinh };
    };
    const phanNhom = (classId) => {
      const n = (d.nhom || []).find(x => x.classId === classId);
      return n ? n.ds.filter(x => x.trangThai === 'cho-duyet' && !x.laCuaToi).map(x => ({ keId: x.keId, chuongTrinh: x.chuongTrinh })) : [];
    };
    for (const b of than.querySelectorAll('[data-duyet-phan]')) b.onclick = () => this.duyet([phanCua(b.dataset.duyetPhan)], 'da-duyet');
    for (const b of than.querySelectorAll('[data-tra-phan]')) b.onclick = () => this.moTraLai([phanCua(b.dataset.traPhan)]);
    for (const b of than.querySelectorAll('[data-duyet-nhom]')) b.onclick = () => this.duyet(phanNhom(b.dataset.duyetNhom), 'da-duyet');
    for (const b of than.querySelectorAll('[data-tra-nhom]')) b.onclick = () => this.moTraLai(phanNhom(b.dataset.traNhom));
  },

  theNhomDuyet(n, choDuyet) {
    const nhan = (ds) => (ds || []).map(b => `${UI.esc(b.ten)} <span class="muted">· ${UI.esc(this.ten((this._duyet || {}).nhanBai, b.nhan))}</span>`).join('<br>');
    const tenGoc = (ma) => this.ten((this._duyet || {}).gocLinhVuc, ma);
    const coTheDuyet = n.ds.filter(x => x.trangThai === 'cho-duyet' && !x.laCuaToi).length;
    return `
      <div class="card">
        <div class="card-title">Nhóm ${UI.esc(n.tenNhom)} <span class="muted small" style="font-weight:400">· ${UI.esc(String(n.ds.length))} phần</span></div>
        ${choDuyet && coTheDuyet > 1 ? `
          <div class="grid-2" style="margin-bottom:10px">
            <button class="btn success-soft" data-duyet-nhom="${UI.esc(n.classId)}">${UI.icon('check', 16)} Duyệt cả nhóm (${UI.esc(String(coTheDuyet))})</button>
            <button class="btn danger-soft" data-tra-nhom="${UI.esc(n.classId)}">Gửi lại cả nhóm</button>
          </div>` : ''}
        ${n.ds.map(x => {
          const tt = this.MAU_DUYET[x.trangThai] || ['', 'gray'];
          const theoGoc = {};
          for (const b of x.baiHoc) (theoGoc[b.gocLinhVuc] = theoGoc[b.gocLinhVuc] || []).push(b);
          return `
          <div class="kb-dong-duyet" style="border-top:1px solid var(--line);padding:10px 0">
            <div class="list-row" style="border-bottom:none;padding:0 0 6px">
              <div class="row-main">
                <div class="row-title">${UI.esc(x.hoTen)} <span class="muted small" style="font-weight:400">· ${UI.esc(this.TEN_CT[x.chuongTrinh] || x.tenChuongTrinh)} · tháng ${UI.esc(x.thang)}</span></div>
                <div class="row-sub">${UI.esc(x.coLapTen || 'Cô')} gửi ${UI.esc(UI.timeAgo(x.guiLuc))}</div>
              </div>
              ${UI.badge(tt[0], tt[1])}
            </div>
            ${Object.entries(theoGoc).map(([g, ds]) => `
              <div class="small" style="line-height:1.7"><span class="muted">${UI.esc(tenGoc(g))}:</span><br>${nhan(ds)}</div>`).join('')}
            ${x.muc.map(m => `<div class="small" style="line-height:1.6"><span class="muted">${UI.esc(tenGoc(m.gocLinhVuc))}:</span> ${UI.esc(m.noiDung)}</div>`).join('')}
            ${x.trangThai === 'tra-lai' && x.yKienDuyet ? `<div class="small muted mt-8">Đã gửi lại: ${UI.esc(x.yKienDuyet)}</div>` : ''}
            ${x.trangThai === 'cho-duyet' ? (x.laCuaToi
              ? '<div class="muted small mt-8">Phần này do chính tài khoản của anh/chị lập — nhờ một quản lý khác duyệt giúp.</div>'
              : `<div class="grid-2 mt-8">
                  <button class="btn success-soft" data-duyet-phan="${UI.esc(`${x.keId}|${x.chuongTrinh}`)}">${UI.icon('check', 16)} Duyệt</button>
                  <button class="btn danger-soft" data-tra-phan="${UI.esc(`${x.keId}|${x.chuongTrinh}`)}">Gửi lại cho cô</button>
                </div>`) : ''}
          </div>`;
        }).join('')}
      </div>`;
  },

  async duyet(phan, quyetDinh, yKienDuyet = '') {
    if (!phan.length) return UI.toast('Không có phần nào để duyệt', 'error');
    try {
      const r = await API.post('/api/kehoachbe/duyet', { phan, quyetDinh, yKienDuyet });
      UI.toast(quyetDinh === 'da-duyet' ? `Đã duyệt ${r.so} phần kế hoạch` : `Đã gửi lại ${r.so} phần kế hoạch — cô đã được báo`, 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  moTraLai(phan) {
    if (!phan.length) return UI.toast('Không có phần nào để gửi lại', 'error');
    UI.modal(`
      <div class="field">
        <label>Vì sao gửi lại</label>
        <textarea id="kb-ykien" rows="3" placeholder="Ví dụ: phần Toán ghi chung quá, cô ghi rõ bé đang làm bộ nào giúp mình."></textarea>
        <div class="hint">Cô được báo ngay và đọc dòng này để biết phải sửa gì — bỏ trống thì không gửi lại được.</div>
      </div>
      <button class="btn danger-soft block" id="kb-tra-luu">Gửi lại cho cô</button>
    `, `Gửi lại ${phan.length} phần kế hoạch`);
    document.getElementById('kb-tra-luu').onclick = () => {
      const y = document.getElementById('kb-ykien').value.trim();
      if (!y) return UI.toast('Quản lý ghi giúp cô một dòng vì sao nhé', 'error');
      this.duyet(phan, 'tra-lai', y);
    };
  },

  async duyetDeXuat(id, quyetDinh, yKien = '') {
    try {
      await API.post(`/api/kehoachbe/de-xuat/${encodeURIComponent(id)}/duyet`, { quyetDinh, yKien });
      UI.toast(quyetDinh === 'da-duyet' ? 'Đã mở lại kế hoạch cho cô sửa' : 'Đã từ chối đề xuất', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  moTuChoiDeXuat(id) {
    UI.modal(`
      <div class="field">
        <label>Vì sao từ chối</label>
        <textarea id="kb-dx-ykien" rows="3" placeholder="Ví dụ: giữ lộ trình tới hết tháng rồi tính, tháng sau đổi."></textarea>
        <div class="hint">Cô đọc dòng này — bỏ trống thì không từ chối được.</div>
      </div>
      <button class="btn danger-soft block" id="kb-dx-tc">Từ chối đề xuất</button>
    `, 'Từ chối đề xuất sửa');
    document.getElementById('kb-dx-tc').onclick = () => {
      const y = document.getElementById('kb-dx-ykien').value.trim();
      if (!y) return UI.toast('Quản lý ghi giúp cô một dòng vì sao nhé', 'error');
      this.duyetDeXuat(id, 'tu-choi', y);
    };
  },

  // ================= Danh mục bài học (văn phòng / quản lý) =================
  async veBaiHoc(than) {
    let d;
    try { d = await API.get('/api/kehoachbe/bai-hoc?tatCa=1'); }
    catch (err) { than.innerHTML = UI.emptyState('🧭', err.message); return; }
    const goc = d.gocLinhVuc || [];
    this._luaKho = d.luaKho || [];
    const loc = this._locLua || '';
    const tenLua = (ma) => (this._luaKho.find(x => x.ma === ma) || {}).ten || ma;
    // Kho chia theo CHƯƠNG TRÌNH rồi tới lĩnh vực, lọc được theo lứa — đúng
    // cách nhà trường mô tả kho bài chuẩn (góp ý 06/10, mục 6).
    const theoCt = (d.chuongTrinhTab || []).map(t => ({ ...t, goc: goc.filter(g => (t.goc || []).some(x => x.ma === g.ma)) }));
    than.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.7">
          Đây là kho bài cô nhìn thấy khi tích bài cho từng bé. Mỗi bài gắn lứa tuổi
          (3–4, 4–5, 5–6) — cô chỉ thấy bài đúng lứa của bé; bài không gắn lứa nào là
          của mọi lứa. Thêm, sửa, hoặc <b>ẩn</b> bài không dùng nữa — không xoá, vì
          kế hoạch tháng cũ vẫn phải hiện đúng tên bài.
        </div>
        <div class="field mt-8" style="margin-bottom:0">
          <label>Xem bài của lứa</label>
          <select id="kb-bh-loc">
            <option value="">Mọi lứa</option>
            ${this._luaKho.map(l => `<option value="${UI.esc(l.ma)}" ${loc === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
          </select>
        </div>
        <button class="btn primary block mt-8" id="kb-bh-them">${UI.icon('plus', 16)} Thêm bài học</button>
      </div>
      ${theoCt.map(t => `
        <div class="section-label">${UI.esc(this.TEN_CT[t.ma] || t.chuongTrinh)}</div>
        ${t.goc.map(g => {
          const ds = (d.baiHoc || []).filter(b => b.gocLinhVuc === g.ma)
            .filter(b => !loc || !(b.lua || []).length || (b.lua || []).includes(loc));
          return `
            <div class="card">
              <div class="card-title">${UI.esc(g.ten)}</div>
              ${ds.length ? ds.map(b => `
                <div class="list-row">
                  <div class="row-main">
                    <div class="row-title" style="font-weight:${b.active ? 600 : 400}">${UI.esc(b.ten)}${b.active ? '' : ' <span class="muted">· đang ẩn</span>'}</div>
                    <div class="row-sub">${(b.lua || []).length ? UI.esc((b.lua || []).map(tenLua).join(', ')) : 'Mọi lứa'}${b.moTa ? ` · ${UI.esc(b.moTa)}` : ''}</div>
                  </div>
                  <button class="btn sm outline" data-sua-bai="${UI.esc(b.id)}" style="min-height:36px">Sửa</button>
                </div>`).join('') : '<div class="muted small">Chưa có bài nào ở lĩnh vực này cho lứa đang xem.</div>'}
            </div>`;
        }).join('')}`).join('')}`;
    document.getElementById('kb-bh-loc').onchange = (e) => { this._locLua = e.target.value; this.veBaiHoc(than); };
    document.getElementById('kb-bh-them').onclick = () => this.moSuaBai(null, goc, d.baiHoc || []);
    for (const b of than.querySelectorAll('[data-sua-bai]')) {
      b.onclick = () => this.moSuaBai(b.dataset.suaBai, goc, d.baiHoc || []);
    }
  },

  moSuaBai(id, goc, ds) {
    const b = id ? (ds.find(x => x.id === id) || {}) : { gocLinhVuc: (goc[0] || {}).ma, ten: '', moTa: '', active: true };
    UI.modal(`
      <div class="field"><label>Góc lĩnh vực</label>
        <select id="kb-bh-goc">${goc.map(g => `<option value="${UI.esc(g.ma)}" ${g.ma === b.gocLinhVuc ? 'selected' : ''}>${UI.esc(g.ten)}</option>`).join('')}</select></div>
      <div class="field"><label>Tên bài</label>
        <input id="kb-bh-ten" value="${UI.esc(b.ten || '')}" placeholder="Ví dụ: Rót nước"></div>
      <div class="field"><label>Mô tả ngắn (không bắt buộc)</label>
        <input id="kb-bh-mota" value="${UI.esc(b.moTa || '')}" placeholder="Giáo cụ, gợi ý cách mời bé"></div>
      <div class="field"><label>Dùng cho lứa (không tích lứa nào = mọi lứa)</label>
        <div class="flex" style="gap:14px;flex-wrap:wrap">
          ${(this._luaKho || []).map(l => `
            <label class="flex" style="gap:6px;align-items:center;cursor:pointer">
              <input type="checkbox" class="kb-bh-lua" value="${UI.esc(l.ma)}" ${(b.lua || []).includes(l.ma) ? 'checked' : ''}
                style="width:32px;height:32px;margin:0">
              <span>${UI.esc(l.ten)}</span>
            </label>`).join('')}
        </div></div>
      ${id ? `<label class="row-between" style="padding:8px 0">
        <span>Đang dùng (bỏ tích để ẩn)</span>
        <input type="checkbox" id="kb-bh-active" ${b.active ? 'checked' : ''}></label>` : ''}
      <button class="btn primary block mt-8" id="kb-bh-luu">${UI.icon('check', 18)} Lưu</button>
    `, id ? 'Sửa bài học' : 'Thêm bài học');
    document.getElementById('kb-bh-luu').onclick = async () => {
      const goi = {
        gocLinhVuc: document.getElementById('kb-bh-goc').value,
        ten: document.getElementById('kb-bh-ten').value.trim(),
        moTa: document.getElementById('kb-bh-mota').value.trim(),
        lua: [...document.querySelectorAll('.kb-bh-lua:checked')].map(o => o.value),
      };
      const ac = document.getElementById('kb-bh-active');
      if (ac) goi.active = ac.checked;
      if (!goi.ten) return UI.toast('Bài học cần có tên', 'error');
      try {
        if (id) await API.put(`/api/kehoachbe/bai-hoc/${encodeURIComponent(id)}`, goi);
        else await API.post('/api/kehoachbe/bai-hoc', goi);
        UI.closeModal();
        UI.toast('Đã lưu danh mục', 'success');
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};
