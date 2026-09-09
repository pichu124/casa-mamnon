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
App.views.kehoachbe = {
  _classId: null,
  _thang: null,
  _data: null,
  _tab: 'lap',

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

  ten(ds, ma) {
    const t = (ds || []).find(x => x.ma === ma);
    return t ? t.ten : '';
  },

  async render(root) {
    this._thang = this._thang || UI.todayStr().slice(0, 7);
    const q = this._classId ? `?classId=${encodeURIComponent(this._classId)}&thang=${encodeURIComponent(this._thang)}`
      : `?thang=${encodeURIComponent(this._thang)}`;
    const d = await API.get(`/api/kehoachbe${q}`);
    this._data = d;
    this._classId = d.classId || this._classId;

    if (!d.classId) {
      root.innerHTML = UI.pageHeader('Kế hoạch của bé')
        + UI.emptyState('🧭', 'Cô chưa phụ trách nhóm nào nên chưa lập kế hoạch được.');
      return;
    }

    root.innerHTML = `
      ${UI.pageHeader('Kế hoạch của bé')}
      ${this.laQuanLy() ? `
        <div class="seg" id="kb-tabs">
          <button class="${this._tab === 'lap' ? 'active' : ''}" data-tab="lap">Kế hoạch cả nhóm</button>
          <button class="${this._tab === 'duyet' ? 'active' : ''}" data-tab="duyet">Chờ duyệt (${UI.esc(String(d.tong.choDuyet + (d.tong.deXuatCho || 0)))})</button>
          <button class="${this._tab === 'baihoc' ? 'active' : ''}" data-tab="baihoc">Bài học</button>
        </div>` : ''}

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
        <div class="muted small mt-8" style="line-height:1.6">
          ${UI.esc(String(d.tong.soBe))} bé · chưa lập ${UI.esc(String(d.tong.chuaLap))} ·
          chờ duyệt ${UI.esc(String(d.tong.choDuyet))} · đã duyệt ${UI.esc(String(d.tong.daDuyet))}
          ${d.tong.traLai ? ` · quản lý gửi lại ${UI.esc(String(d.tong.traLai))}` : ''}
        </div>
      </div>

      <div id="kb-than"></div>`;

    document.getElementById('kb-thang').onchange = (e) => { this._thang = e.target.value; App.route(); };
    const sel = document.getElementById('kb-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    const tabs = document.getElementById('kb-tabs');
    if (tabs) for (const b of tabs.querySelectorAll('button')) {
      b.onclick = () => { this._tab = b.dataset.tab; App.route(); };
    }

    const than = document.getElementById('kb-than');
    if (this.laQuanLy() && this._tab === 'duyet') return this.veDuyet(than);
    if (this.laQuanLy() && this._tab === 'baihoc') return this.veBaiHoc(than);
    return this.veLap(than);
  },

  // Bài học của một góc (danh mục đang bật).
  baiCuaGoc(ma) {
    return ((this._data || {}).baiHoc || []).filter(b => b.gocLinhVuc === ma);
  },

  // ================= Màn lập kế hoạch =================
  veLap(than) {
    const d = this._data;
    than.innerHTML = `
      <div class="card">
        <div class="card-title">Ba đường tắt</div>
        <div class="muted small" style="line-height:1.6;margin-bottom:10px">
          Nhóm ${UI.esc(String(d.tong.soBe))} bé nhân ${UI.esc(String((d.gocLinhVuc || []).length))} góc là ${UI.esc(String(d.tong.soBe * (d.gocLinhVuc || []).length))} ô.
          Đừng gõ từng ô — tích bài trong danh mục, hoặc dùng ba nút này rồi chỉ sửa lẻ bé nào khác.
        </div>
        <button class="btn outline block" id="kb-chep">${UI.icon('plus', 16)} Chép kế hoạch tháng ${UI.esc(d.thangTruoc)}</button>
        <button class="btn outline block mt-8" id="kb-ca-nhom">${UI.icon('edit', 16)} Đặt một kế hoạch cho cả nhóm</button>
        <button class="btn primary block mt-8" id="kb-gui">${UI.icon('send', 16)} Gửi quản lý duyệt cả nhóm</button>
      </div>

      ${(d.danhSach || []).map(x => this.theBe(x)).join('')}

      <button class="btn primary block mt-14" id="kb-luu">${UI.icon('check', 18)} Lưu kế hoạch cả nhóm</button>`;

    document.getElementById('kb-chep').onclick = () => this.chepThangTruoc();
    document.getElementById('kb-ca-nhom').onclick = () => this.moDatCaNhom();
    document.getElementById('kb-gui').onclick = () => this.guiDuyet();
    document.getElementById('kb-luu').onclick = () => this.luuCaNhom();
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

  theBe(x) {
    const d = this._data;
    const k = x.ke;
    const tt = k ? (this.MAU_DUYET[k.trangThai] || ['', 'gray']) : ['Chưa lập', 'gray'];
    const khoa = !!k && k.trangThai !== 'nhap' && k.trangThai !== 'tra-lai';
    const muc = k ? k.muc : [];

    const baiDaTich = k ? (k.baiHoc || []) : [];
    // Bé chưa có bản: bài "Tiếp tục cùng con" của tháng gần nhất được TÍCH SẴN
    // là ôn tập. Chỉ tích trên màn — chưa ghi gì cho tới khi cô bấm Lưu.
    const goiY = !k && x.goiY ? x.goiY : null;
    const nhanSan = (baiId) => {
      const t = baiDaTich.find(b => b.baiHocId === baiId);
      if (t) return t.nhan;
      return goiY && (goiY.baiHoc || []).some(b => b.baiHocId === baiId) ? 'on-tap' : '';
    };

    const oGoc = (goc) => {
      const m = muc.find(y => y.gocLinhVuc === goc.ma);
      const gt = m ? m.noiDung : '';
      const ds = this.baiCuaGoc(goc.ma);
      if (khoa) {
        const bg = baiDaTich.filter(b => b.gocLinhVuc === goc.ma);
        if (!gt && !bg.length) return '';
        return `
          <div class="list-row"><div class="row-main">
            <div class="row-sub">${UI.esc(goc.ten)}</div>
            ${bg.length ? `<div class="small" style="line-height:1.7">${bg.map(b =>
              `${UI.esc(b.ten)} <span class="muted">· ${UI.esc(this.tenNhan(b.nhan))}</span>${
                b.ketQua ? ` ${UI.badge(this.ten(d.ketLuanBai, b.ketQua), this.MAU_KET_LUAN[b.ketQua] || 'gray')}` : ''}`).join('<br>')}</div>` : ''}
            ${gt ? `<div class="row-title" style="font-weight:400">${UI.esc(gt)}</div>` : ''}
            ${m && m.ketQua ? `<div class="row-sub">${UI.esc(this.ten(d.ketQua, m.ketQua))}${m.tiepTucThangSau ? ' · tiếp tục ở tháng sau' : ''}</div>` : ''}
          </div></div>`;
      }
      return `
        <div class="field" style="margin-bottom:8px">
          <label>${UI.esc(goc.ten)}</label>
          ${ds.length ? `<div class="flex" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${
            ds.map(b => this.chip(x.studentId, b, nhanSan(b.id))).join('')}</div>` : ''}
          <input class="kb-o" data-be="${UI.esc(x.studentId)}" data-goc="${UI.esc(goc.ma)}"
            value="${UI.esc(gt)}" placeholder="Việc khác ngoài danh mục (không bắt buộc)">
        </div>`;
    };
    const dx = k && k.deXuat;

    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(x.avatar, 40)}
          <div class="row-main">
            <div class="row-title">${UI.esc(x.hoTen)}</div>
            ${k && k.nguoiDuyetTen ? `<div class="row-sub">${UI.esc(k.nguoiDuyetTen)} · ${UI.esc(UI.timeAgo(k.duyetLuc))}</div>` : ''}
          </div>
          ${UI.badge(tt[0], tt[1])}
        </div>

        ${k && k.trangThai === 'tra-lai' && k.yKienDuyet ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Quản lý gửi lại: ${UI.esc(k.yKienDuyet)}
          </div>` : ''}

        ${goiY && (goiY.baiHoc || []).length ? `
          <div class="small muted" style="line-height:1.6;margin-bottom:8px">
            Tháng ${UI.esc(goiY.tuThang)} cô ghi <b>Tiếp tục cùng con</b>: ${UI.esc((goiY.baiHoc || []).map(b => b.ten).join(', '))}
            — đã tích sẵn là ôn tập, cô bỏ tích được.
          </div>` : ''}

        ${dx && dx.trangThai === 'cho-duyet' ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Đề xuất sửa đang chờ quản lý: ${UI.esc(dx.lyDo)}
          </div>` : ''}
        ${dx && dx.trangThai === 'tu-choi' && k.trangThai === 'da-duyet' ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:10px">
            Quản lý chưa đồng ý mở lại: ${UI.esc(dx.yKien || '')}
          </div>` : ''}

        ${(d.gocLinhVuc || []).map(g => oGoc(g)).join('')}

        ${k ? `
          <div class="grid-2 mt-8">
            <button class="btn outline" data-nhin-lai="${UI.esc(k.id)}">${UI.icon('star', 16)} Nhìn lại cuối tháng</button>
            ${k.trangThai === 'cho-duyet'
              ? `<button class="btn danger-soft" data-rut-lai="${UI.esc(k.id)}">Rút lại để sửa</button>`
              : (k.trangThai === 'da-duyet' && !(dx && dx.trangThai === 'cho-duyet')
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
          lyDo, noiDung: document.getElementById('kb-dx-nd').value.trim(),
        });
        UI.toast('Đã gửi đề xuất — quản lý duyệt thì kế hoạch mở lại cho cô', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async luuCaNhom() {
    const theoBe = new Map();
    const layBe = (be) => {
      if (!theoBe.has(be)) {
        // Gửi kèm dấu thời gian của bản đã NẠP VỀ (null khi bé chưa có bản
        // nào) — máy chủ so nó để ảnh chụp màn hình cũ của cô này không đè
        // lên phần cô kia vừa lưu.
        const x = ((this._data || {}).danhSach || []).find(y => y.studentId === be);
        const mucCu = (x && x.ke && x.ke.muc) || [];
        const baiCu = (x && x.ke && x.ke.baiHoc) || [];
        theoBe.set(be, {
          studentId: be,
          capNhatLucGoc: x && x.ke ? (x.ke.capNhatLuc || null) : null,
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
    if (!theoBe.size) return UI.toast('Không có bé nào đang mở để sửa', 'error');
    if (!danhSach.length) return UI.toast('Cô chưa sửa ô nào so với bản đang lưu', 'error');
    try {
      const r = await API.put('/api/kehoachbe', {
        classId: this._classId, thang: this._thang, danhSach,
      });

      // CÓ BÉ ĐỤNG ĐỘ: cô khác vừa lưu trong lúc màn này đang mở. KHÔNG vẽ
      // lại màn — vẽ lại là phần cô đang gõ cho mấy bé đó biến mất. Chỉ nạp
      // lại dấu thời gian nền, để nếu cô đọc lời báo xong vẫn bấm Lưu lần
      // nữa thì đó là một lần ghi đè CÓ CHỦ Ý, không phải một tai nạn.
      if (r.xungDot && r.xungDot.length) {
        UI.toast(r.nhac || `${r.xungDot.length} bé chưa lưu được vì cô khác vừa sửa — bấm Lưu lần nữa nếu cô muốn giữ bản đang gõ`, 'error');
        await this.napLaiMoc();
        return;
      }
      // NHÁNH `daLuu = 0` TỪNG NÓI NGƯỢC HẲN VIỆC CÔ VỪA LÀM.
      //
      // Cô gõ nội dung cho đúng một bé, mà bé đó gia đình đã dừng hồ sơ học
      // tập: máy chủ bỏ qua, `daLuu` bằng 0, và màn hình báo "Chưa có bé nào
      // được gõ nội dung". Cô nhìn xuống thấy chữ mình vừa gõ còn nguyên trên
      // màn hình, kết luận app hỏng, rồi gõ lại lần nữa.
      const boQua = this.nhacBoQua(r);
      UI.toast(
        r.daLuu ? `Đã lưu kế hoạch cho ${r.daLuu} bé${boQua}`
          : (boQua ? `Không lưu được bé nào${boQua}` : 'Chưa có bé nào được gõ nội dung'),
        r.daLuu ? 'success' : 'error');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
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
      ${(d.gocLinhVuc || []).map(g => `
        <div class="field">
          <label>${UI.esc(g.ten)}</label>
          ${this.baiCuaGoc(g.ma).length ? `<div class="flex" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${
            this.baiCuaGoc(g.ma).map(b => this.chip('*', b, '')).join('')}</div>` : ''}
          <input id="kb-cn-${UI.esc(g.ma)}" placeholder="Việc khác ngoài danh mục — để trống thì bỏ qua">
        </div>`).join('')}
      <button class="btn primary block" id="kb-cn-luu">${UI.icon('check', 18)} Đặt cho cả nhóm</button>
    `, 'Đặt một kế hoạch cho cả nhóm');
    const ov = document.getElementById('modal-overlay');
    if (ov) this.gangChip(ov);
    document.getElementById('kb-cn-luu').onclick = async () => {
      const muc = (d.gocLinhVuc || []).map(g => ({
        gocLinhVuc: g.ma,
        noiDung: (document.getElementById(`kb-cn-${g.ma}`) || {}).value || '',
      })).filter(m => m.noiDung.trim());
      const baiHoc = [...(ov ? ov.querySelectorAll('.kb-bai') : [])]
        .filter(c => c.dataset.nhan).map(c => ({ baiHocId: c.dataset.bai, nhan: c.dataset.nhan }));
      if (!muc.length && !baiHoc.length) return UI.toast('Cô tích ít nhất một bài hoặc gõ một góc nhé', 'error');
      try {
        const r = await API.post('/api/kehoachbe/dat-ca-nhom', {
          classId: this._classId, thang: this._thang, muc, baiHoc,
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
        classId: this._classId, thang: this._thang,
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
    try {
      const r = await API.post('/api/kehoachbe/gui-duyet', {
        classId: this._classId, thang: this._thang,
      });
      UI.toast(r.daGui
        ? `Đã gửi ${r.daGui} kế hoạch cho quản lý${r.trong ? `, bỏ qua ${r.trong} bé chưa có mục nào` : ''}`
        : 'Chưa có kế hoạch nào để gửi', r.daGui ? 'success' : 'error');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async rutLai(id) {
    try {
      await API.post('/api/kehoachbe/rut-lai', { id });
      UI.toast('Đã rút lại — cô sửa tiếp rồi gửi lại nhé', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ================= Nhìn lại cuối tháng =================
  moNhinLai(keId) {
    const d = this._data;
    const x = (d.danhSach || []).find(y => y.ke && y.ke.id === keId);
    if (!x) return;
    const k = x.ke;
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(x.avatar, 40)}
        <div class="row-main"><div class="row-title">${UI.esc(x.hoTen)}</div>
          <div class="row-sub">Tháng ${UI.esc(k.thang)}</div></div>
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
          <div class="seg mt-8" data-kl-cua="${UI.esc(b.id)}">
            ${(d.ketLuanBai || []).map(t => `<button type="button" class="${b.ketQua === t.ma ? 'active' : ''}" data-kl="${UI.esc(t.ma)}">${UI.esc(t.ten)}</button>`).join('')}
          </div>
          <input class="kb-bnx mb-8" data-bai-id="${UI.esc(b.id)}" value="${UI.esc(b.nhanXet || '')}" placeholder="Ghi chú thêm (không bắt buộc)">
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
      const baiHoc = [...ov.querySelectorAll('[data-kl-cua]')].map(seg => {
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
  veDuyet(than) {
    const d = this._data;
    const cho = (d.danhSach || []).filter(x => x.ke && x.ke.trangThai === 'cho-duyet');
    const dxCho = (d.danhSach || []).filter(x => x.ke && x.ke.deXuat && x.ke.deXuat.trangThai === 'cho-duyet');
    than.innerHTML = `
      ${cho.length ? `
        <div class="card">
          <div class="muted small" style="line-height:1.6;margin-bottom:10px">
            ${UI.esc(String(cho.length))} kế hoạch đang chờ. Duyệt cả loạt được, nhưng
            <b>trả lại thì phải ghi một dòng vì sao</b> — cô cần biết phải sửa gì.
          </div>
          <div class="grid-2">
            <button class="btn success-soft" id="kb-duyet-het">${UI.icon('check', 16)} Duyệt tất cả</button>
            <button class="btn danger-soft" id="kb-tra-het">Trả lại tất cả</button>
          </div>
        </div>` : ''}

      ${cho.length ? cho.map(x => this.theDuyet(x)).join('') : ''}

      ${dxCho.length ? `
        <div class="card">
          <div class="card-title">Đề xuất sửa kế hoạch đã duyệt</div>
          <div class="muted small" style="line-height:1.6">
            Đồng ý thì kế hoạch <b>mở lại</b> cho cô sửa, sửa xong cô gửi duyệt lại. Từ chối thì ghi một dòng vì sao.
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
          </div>`).join('')}` : ''}

      ${!cho.length && !dxCho.length ? UI.emptyState('🧭', 'Không có kế hoạch hay đề xuất nào đang chờ duyệt.') : ''}`;

    for (const b of than.querySelectorAll('[data-dx-duyet]')) {
      b.onclick = () => this.duyetDeXuat(b.dataset.dxDuyet, 'da-duyet');
    }
    for (const b of than.querySelectorAll('[data-dx-tu-choi]')) {
      b.onclick = () => this.moTuChoiDeXuat(b.dataset.dxTuChoi);
    }
    const het = document.getElementById('kb-duyet-het');
    if (het) het.onclick = () => this.duyet(cho.map(x => x.ke.id), 'da-duyet');
    const tra = document.getElementById('kb-tra-het');
    if (tra) tra.onclick = () => this.moTraLai(cho.map(x => x.ke.id));
    for (const b of than.querySelectorAll('[data-duyet]')) {
      b.onclick = () => this.duyet([b.dataset.duyet], 'da-duyet');
    }
    for (const b of than.querySelectorAll('[data-tra]')) {
      b.onclick = () => this.moTraLai([b.dataset.tra]);
    }
  },

  theDuyet(x) {
    const d = this._data;
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(x.avatar, 40)}
          <div class="row-main">
            <div class="row-title">${UI.esc(x.hoTen)}</div>
            <div class="row-sub">${UI.esc(x.ke.coLapTen || '')} gửi ${UI.esc(UI.timeAgo(x.ke.guiLuc))}</div>
          </div>
        </div>
        ${(d.gocLinhVuc || []).map(g => {
          const bg = (x.ke.baiHoc || []).filter(b => b.gocLinhVuc === g.ma);
          if (!bg.length) return '';
          return `<div class="list-row"><div class="row-main">
            <div class="row-sub">${UI.esc(g.ten)}</div>
            <div class="small" style="line-height:1.7">${bg.map(b => `${UI.esc(b.ten)} <span class="muted">· ${UI.esc(this.tenNhan(b.nhan))}</span>`).join('<br>')}</div>
          </div></div>`;
        }).join('')}
        ${(x.ke.muc || []).map(m => `
          <div class="list-row"><div class="row-main">
            <div class="row-sub">${UI.esc(this.ten(d.gocLinhVuc, m.gocLinhVuc))}</div>
            <div class="row-title" style="font-weight:400">${UI.esc(m.noiDung)}</div>
          </div></div>`).join('')}
        <div class="grid-2 mt-8">
          <button class="btn success-soft" data-duyet="${UI.esc(x.ke.id)}">${UI.icon('check', 16)} Duyệt</button>
          <button class="btn danger-soft" data-tra="${UI.esc(x.ke.id)}">Gửi lại cho cô</button>
        </div>
      </div>`;
  },

  async duyet(ids, quyetDinh, yKienDuyet = '') {
    try {
      const r = await API.post('/api/kehoachbe/duyet', { ids, quyetDinh, yKienDuyet });
      UI.toast(quyetDinh === 'da-duyet' ? `Đã duyệt ${r.so} kế hoạch` : `Đã gửi lại ${r.so} kế hoạch`, 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  moTraLai(ids) {
    UI.modal(`
      <div class="field">
        <label>Vì sao gửi lại</label>
        <textarea id="kb-ykien" rows="3" placeholder="Ví dụ: phần Toán ghi chung quá, cô ghi rõ bé đang làm bộ nào giúp mình."></textarea>
        <div class="hint">Cô đọc dòng này để biết phải sửa gì — bỏ trống thì không gửi lại được.</div>
      </div>
      <button class="btn danger-soft block" id="kb-tra-luu">Gửi lại cho cô</button>
    `, `Gửi lại ${ids.length} kế hoạch`);
    document.getElementById('kb-tra-luu').onclick = () => {
      const y = document.getElementById('kb-ykien').value.trim();
      if (!y) return UI.toast('Quản lý ghi giúp cô một dòng vì sao nhé', 'error');
      this.duyet(ids, 'tra-lai', y);
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
    than.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.7">
          Đây là danh mục cô nhìn thấy khi tích bài cho từng bé. Thêm, sửa tên, hoặc
          <b>ẩn</b> bài không dùng nữa — không xoá, vì kế hoạch tháng cũ vẫn phải hiện đúng tên bài.
        </div>
        <button class="btn primary block mt-8" id="kb-bh-them">${UI.icon('plus', 16)} Thêm bài học</button>
      </div>
      ${goc.map(g => {
        const ds = (d.baiHoc || []).filter(b => b.gocLinhVuc === g.ma);
        return `
          <div class="card">
            <div class="card-title">${UI.esc(g.ten)}</div>
            ${ds.length ? ds.map(b => `
              <div class="list-row">
                <div class="row-main">
                  <div class="row-title" style="font-weight:${b.active ? 600 : 400}">${UI.esc(b.ten)}${b.active ? '' : ' <span class="muted">· đang ẩn</span>'}</div>
                  ${b.moTa ? `<div class="row-sub">${UI.esc(b.moTa)}</div>` : ''}
                </div>
                <button class="btn sm outline" data-sua-bai="${UI.esc(b.id)}">Sửa</button>
              </div>`).join('') : '<div class="muted small">Chưa có bài nào ở góc này.</div>'}
          </div>`;
      }).join('')}`;
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
