// BÁO CÁO HỌC TẬP — màn hình.
//
// BA NGƯỜI NHÌN MÀN NÀY VÀ HỌ CẦN BA THỨ KHÁC NHAU
//
//   • Gia đình mở ra để ĐỌC về con. Không có ô nhập nào, không có chữ "nháp",
//     không thấy bản cô đang soạn dở.
//   • Cô mở ra để SOẠN. Đo bằng số lần gõ: một nhóm 20 bé nhân vài chục dòng
//     tiêu chí là con số làm người ta bỏ cuộc, nên có nút mời sẵn chữ từ Kế
//     hoạch của bé, và mỗi mức chỉ một lần chạm.
//   • Nhà trường mở ra để SỬA MẪU, mỗi năm học một lần.
//
// QUY TẮC 2 Ở MÀN NÀY
//
// Không ô nào màu đỏ. "Chưa quan sát thấy" và "Chưa dạy" là hai lựa chọn xám
// bình thường nằm cùng hàng với ba lựa chọn kia, không phải một khoảng trống
// nhấp nháy chờ lấp. Dòng chưa điền thì để trắng và không đếm ra thành một
// con số thiếu hụt nào.
//
// ĐỢT 2 (phản hồi nhà trường 07/09)
//
//   • Mở báo cáo THÁNG là máy điền sẵn ô còn trống từ Kế hoạch của bé — cô
//     đọc lại, sửa, rồi mới gửi. Máy chủ làm việc điền; màn này chỉ báo cho
//     cô biết ô nào vừa được điền.
//   • Nút gửi của cô nay là "Gửi quản lý duyệt". Quản lý cơ sở duyệt và chọn
//     ngày công bố; gia đình chỉ thấy khi tới ngày ấy.
//   • Ô cô A đã ghi thì cô B thấy khoá; quản lý cơ sở có nút mở khoá.
App.views.baocaohoctap = {
  _tab: 'so',
  _classId: null,
  _tuNgay: null,
  _denNgay: null,
  _loai: 'thang',
  _banId: null,
  _ban: null,
  _mau: [],
  _mucList: [],
  _goiY: null,

  // Không cái nào đỏ — cùng luật với Hành trình học tập và Kế hoạch của bé.
  MAU_MUC: {
    'chua-day': 'gray',
    'chua-quan-sat-thay': 'gray',
    'dang-hinh-thanh': 'blue',
    'da-vung': 'green',
    'vuot-troi': 'green',
  },

  laGiaDinh() { return (App.state.user || {}).role === 'parent'; },
  laQuanTri() { return (App.state.user || {}).role === 'admin'; },
  toiLa() { return (App.state.user || {}).id; },

  // Một bản đang ở bước nào — nhãn và màu. Không cái nào đỏ, không cái nào
  // cam: đây là trạng thái giấy tờ của người lớn, không phải về đứa trẻ.
  nhanBuoc(buoc, ngayCongBo) {
    switch (buoc) {
      case 'cho-duyet': return ['Chờ quản lý duyệt', 'blue'];
      case 'cho-ngay': return [`Đã duyệt · gửi gia đình ${ngayCongBo ? UI.fmtDateShort(ngayCongBo) : ''}`.trim(), 'green'];
      case 'da-cong-bo': return ['Gia đình đã nhận', 'green'];
      case 'tra-lai': return ['Quản lý trả lại', 'blue'];
      default: return ['Cô đang soạn', 'gray'];
    }
  },

  // Kỳ mặc định: tháng đang chạy, từ ngày 1 tới hôm nay.
  kyMacDinh() {
    const t = UI.todayStr();
    return { tu: `${t.slice(0, 7)}-01`, den: t };
  },

  tenMuc(ma) {
    const m = (this._mucList || []).find(x => x.ma === ma);
    return m ? m.ten : '';
  },
  chuCai(ma) {
    const m = (this._mucList || []).find(x => x.ma === ma);
    return m ? m.chuCai : '';
  },

  async render(root) {
    const ky = this.kyMacDinh();
    this._tuNgay = this._tuNgay || ky.tu;
    this._denNgay = this._denNgay || ky.den;

    if (this.laGiaDinh()) return this.veGiaDinh(root);

    // TẮT MỘT MẪU KHÔNG ĐƯỢC LÀ CỬA MỘT CHIỀU.
    //
    // Màn "Mẫu báo cáo" có sẵn nút tắt và có sẵn nhãn "Đang tắt" — nhưng danh
    // sách lại lấy từ đường mặc định, mà đường ấy chỉ trả mẫu `active = 1`.
    // Nên vừa bấm tắt xong là mẫu biến mất khỏi màn hình, không còn chỗ nào
    // bấm để bật lại: nhà trường phải gõ tay vào cơ sở dữ liệu, hoặc tạo mẫu
    // mới rồi soạn lại từ đầu.
    //
    // Quản trị xin CẢ mẫu đang tắt (`tatCa=1`) để còn bật lại được. Cô thì
    // không — chỗ cô chọn mẫu lọc lại `m.active` ở dưới, để mẫu nhà trường đã
    // ngưng dùng không quay về danh sách soạn.
    const d = await API.get(`/api/baocaohoctap/mau${this.laQuanTri() ? '?tatCa=1' : ''}`);
    this._mau = d.mau || [];
    this._mucList = d.muc || [];

    root.innerHTML = `
      ${UI.pageHeader('Báo cáo học tập')}
      <div class="seg" id="bc-tabs">
        <button class="${this._tab === 'so' ? 'active' : ''}" data-tab="so">Sổ của nhóm</button>
        ${this.laQuanTri() ? `<button class="${this._tab === 'duyet' ? 'active' : ''}" data-tab="duyet">Chờ duyệt</button>` : ''}
        ${this.laQuanTri() ? `<button class="${this._tab === 'mau' ? 'active' : ''}" data-tab="mau">Mẫu báo cáo</button>` : ''}
      </div>
      <div id="bc-than"></div>`;

    for (const b of document.getElementById('bc-tabs').querySelectorAll('button')) {
      b.onclick = () => { this._tab = b.dataset.tab; this._banId = null; App.route(); };
    }
    const than = document.getElementById('bc-than');
    if (this._tab === 'mau') return this.veMau(than);
    if (this._banId) return this.veSoan(than);
    if (this._tab === 'duyet' && this.laQuanTri()) return this.veChoDuyet(than);
    return this.veSo(than);
  },

  // ==================== Chờ duyệt (quản lý cơ sở) ====================
  async veChoDuyet(than) {
    const d = await API.get('/api/baocaohoctap/cho-duyet');
    const ds = d.danhSach || [];
    than.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.7">
          Bản cô đã gửi, chờ quản lý đọc. Mở từng bản để đọc rồi <b>Duyệt</b> (chọn ngày gia đình
          nhận được) hoặc <b>Trả lại</b> kèm một dòng vì sao.
        </div>
      </div>
      ${ds.length ? ds.map(x => `
        <div class="card tap" data-mo="${UI.esc(x.banId)}">
          <div class="row-between">
            <div>
              <div style="font-weight:600">${UI.esc(x.hoTen)}</div>
              <div class="muted small">${UI.esc(x.mauTen)} · ${x.nhomLop ? `Nhóm ${UI.esc(x.nhomLop)} · ` : ''}${UI.esc(UI.fmtDateShort(x.tuNgay))} – ${UI.esc(UI.fmtDateShort(x.denNgay))}</div>
              <div class="muted small">${UI.esc(x.nguoiGuiTen || 'Cô')} gửi ${UI.esc(UI.timeAgo(x.guiLuc))}</div>
            </div>
            ${UI.icon('chevron', 18)}
          </div>
        </div>`).join('')
      : UI.emptyState('📘', 'Không có bản nào đang chờ duyệt.')}`;
    for (const c of than.querySelectorAll('[data-mo]')) {
      c.onclick = () => { this._banId = c.dataset.mo; App.route(); };
    }
  },

  // ==================== Màn của gia đình ====================
  async veGiaDinh(root) {
    const sid = App.state.currentStudentId || ((App.state.students || [])[0] || {}).id;
    if (!sid) {
      root.innerHTML = UI.pageHeader('Báo cáo học tập')
        + UI.emptyState('📘', 'Chưa có bé nào trong tài khoản này.');
      return;
    }
    if (this._banId) return this.veDoc(root);

    const d = await API.get(`/api/baocaohoctap/cua-be?studentId=${encodeURIComponent(sid)}`);
    root.innerHTML = `
      ${UI.pageHeader('Báo cáo học tập')}
      ${UI.thanhChonBeTheoCap()}
      ${(d.ban || []).length ? (d.ban || []).map(b => `
        <div class="card tap" data-mo="${UI.esc(b.id)}">
          <div class="card-title">${UI.esc(b.mauTen || 'Báo cáo')}</div>
          <div class="muted small">${UI.esc(UI.fmtDate(b.tuNgay))} – ${UI.esc(UI.fmtDate(b.denNgay))}</div>
        </div>`).join('')
      : UI.emptyState('📘', 'Cô chưa gửi báo cáo nào. Khi có, báo cáo sẽ hiện ở đây.')}`;

    for (const c of root.querySelectorAll('[data-mo]')) {
      c.onclick = () => { this._banId = c.dataset.mo; App.route(); };
    }
  },

  // ==================== Đọc một bản ====================
  async veDoc(root) {
    const d = await API.get(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}`);
    const b = d.ban;
    root.innerHTML = `
      ${UI.pageHeader(b.mau ? b.mau.ten : 'Báo cáo học tập')}
      ${this.theHoSo(b)}
      ${this.theNoiDung(b)}
      ${this.theTongHop(b)}
      <button class="btn outline block mt-14" id="bc-ve-ds">Xem báo cáo khác</button>`;
    document.getElementById('bc-ve-ds').onclick = () => { this._banId = null; App.route(); };
  },

  theHoSo(b) {
    return `
      <div class="card">
        <div class="card-title">${UI.esc(b.hoTen)}</div>
        <div class="muted small" style="line-height:1.7">
          ${b.nhomLop ? `Nhóm ${UI.esc(b.nhomLop)}` : ''}${b.coSo ? ` · ${UI.esc(b.coSo)}` : ''}<br>
          Kỳ báo cáo: ${UI.esc(UI.fmtDate(b.tuNgay))} – ${UI.esc(UI.fmtDate(b.denNgay))}
        </div>
        ${(b.soDo || []).length ? `
          <div class="mt-12">
            <div class="small" style="font-weight:600;margin-bottom:6px">Chiều cao, cân nặng</div>
            ${(b.soDo || []).map(s => `
              <div class="row-between small" style="padding:4px 0">
                <span class="muted">${UI.esc(UI.fmtDateShort(s.ngay))}</span>
                <span>${s.chieuCao != null ? `${UI.esc(String(s.chieuCao))} cm` : '—'} · ${
                  s.canNang != null ? `${UI.esc(String(s.canNang))} kg` : '—'}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  },

  theNoiDung(b) {
    const nhom = [];
    for (const d of (b.dong || [])) {
      const ten = d.nhom || '';
      if (!nhom.length || nhom[nhom.length - 1].ten !== ten) nhom.push({ ten, tenEn: d.nhomEn, dong: [] });
      nhom[nhom.length - 1].dong.push(d);
    }
    // QUY TẮC 2 — "CHƯA QUAN SÁT THẤY" KHÔNG PHẢI MỘT THẤT BẠI.
    //
    // Đây là màn hình DUY NHẤT gia đình đọc được các mức đánh giá. Hai phân hệ
    // kia đã có câu trấn an đi kèm bảng mức, riêng chỗ chữ tới tay gia đình
    // thì chưa — mà đúng chỗ ấy mới là nơi hiểu nhầm gây đau nhất: bố mẹ đọc
    // "Chưa quan sát thấy" cạnh tên con mình, không có gì giải thích, sẽ hiểu
    // thành "con làm không được".
    const coMucChua = (b.dong || []).some(d => d.muc === 'chua-quan-sat-thay' || d.muc === 'chua-day');
    const chuGiai = coMucChua ? `
      <div class="card" style="border-left:4px solid var(--info)">
        <div class="small" style="line-height:1.7">
          <b>Chưa quan sát thấy</b> nghĩa là trong khoảng thời gian này cô chưa có dịp
          nhìn thấy con làm điều đó ở lớp — không phải con làm không được. Mỗi bé đi
          theo nhịp riêng, và có những việc bé chỉ làm ở nhà.
          <b>Chưa dạy</b> nghĩa là nội dung đó chưa tới lượt trong chương trình.
        </div>
      </div>` : '';

    return chuGiai + nhom.map(g => {
      // Bỏ hẳn nhóm nào cô chưa ghi gì. Hiện một mục lớn rỗng ra trước mắt
      // gia đình là biến chỗ chưa tới lượt thành một khoảng trống cần lấp.
      const co = g.dong.filter(d => d.chu || d.muc);
      if (!co.length) return '';
      return `
        <div class="card">
          ${g.ten ? `<div class="card-title">${UI.esc(g.ten)}</div>` : ''}
          ${g.tenEn ? `<div class="muted small" style="margin-top:-4px;margin-bottom:8px">${UI.esc(g.tenEn)}</div>` : ''}
          ${co.map(d => `
            <div style="padding:8px 0;border-top:1px solid var(--line)">
              <div class="small" style="font-weight:600">${UI.esc(d.tieuDe)}</div>
              ${d.tieuDeEn ? `<div class="muted small">${UI.esc(d.tieuDeEn)}</div>` : ''}
              ${d.kieu === 'muc'
                ? `<div class="mt-8">${UI.badge(`${this.tenMuc(d.muc)}${this.chuCai(d.muc) ? ` (${this.chuCai(d.muc)})` : ''}`, this.MAU_MUC[d.muc] || 'gray')}</div>`
                : `<div class="mt-8" style="white-space:pre-wrap;line-height:1.7">${UI.esc(d.chu)}</div>`}
            </div>`).join('')}
        </div>`;
    }).join('');
  },

  theTongHop(b) {
    if (!b.tongHop && !b.oLopLamGi && !b.oNhaChoiGi) return '';
    return `
      <div class="card">
        <div class="card-title">Cô kể thêm</div>
        ${b.tongHop ? `<div style="white-space:pre-wrap;line-height:1.7">${UI.esc(b.tongHop)}</div>` : ''}
        ${b.oLopLamGi ? `<div class="mt-12"><div class="small" style="font-weight:600">Ở lớp cô sẽ làm tiếp</div>
          <div class="small" style="white-space:pre-wrap;line-height:1.7">${UI.esc(b.oLopLamGi)}</div></div>` : ''}
        ${b.oNhaChoiGi ? `<div class="mt-12"><div class="small" style="font-weight:600">Ở nhà gia đình chơi cùng con</div>
          <div class="small" style="white-space:pre-wrap;line-height:1.7">${UI.esc(b.oNhaChoiGi)}</div></div>` : ''}
      </div>`;
  },

  // ==================== Sổ của nhóm ====================
  async veSo(than) {
    // NHÓM CỦA CHÍNH CÔ, KHÔNG PHẢI NHÓM ĐẦU DANH SÁCH CỦA CẢ TRƯỜNG.
    //
    // `App.state.classes` là danh sách nhóm của CẢ TRƯỜNG — nó có ở đây để
    // dựng ô chọn cho văn phòng. Lấy `classes[0]` làm nhóm mặc định thì cô nào
    // không phụ trách nhóm đứng đầu danh sách sẽ mở màn này ra là gặp thẳng
    // màn "Có lỗi xảy ra" (máy chủ trả 403, hoàn toàn đúng).
    //
    // Trên bàn thử: cô nhóm Nhà trẻ 1 bấm vào Báo cáo học tập là hỏng ngay,
    // trong khi cô nhóm Chồi 2 thì không — vì Chồi 2 tình cờ đứng đầu danh
    // sách. Đây là kiểu lỗi chỉ lộ ra khi thử bằng tài khoản THỨ HAI.
    //
    // `App.nhomCuaCo()` trả về nhóm cô đang phụ trách; văn phòng nhận đủ
    // danh sách như trước.
    const cls = App.nhomCuaCo();
    this._classId = this._classId || (cls[0] || {}).id || '';
    if (!this._classId) {
      than.innerHTML = UI.emptyState('📘', 'Cô chưa phụ trách nhóm nào nên chưa soạn báo cáo được.');
      return;
    }
    // Gửi kèm LOẠI báo cáo đang xem: máy chủ tra "bé này đã có bản CHƯA" theo
    // đúng loại ấy, chứ không phải theo bất kỳ bản nào trong kỳ.
    const q = `?classId=${encodeURIComponent(this._classId)}&tuNgay=${encodeURIComponent(this._tuNgay)}`
      + `&denNgay=${encodeURIComponent(this._denNgay)}&loai=${encodeURIComponent(this._loai)}`;
    const d = await API.get(`/api/baocaohoctap/nhom${q}`);

    // `m.active !== false`: quản trị xin cả mẫu đang tắt để bật lại được, nên
    // chỗ CHỌN MẪU ĐỂ SOẠN phải tự lọc ra. Với cô thì danh sách vốn đã chỉ có
    // mẫu đang bật — so sánh này không đổi gì.
    const mauHop = this._mau.filter(m => m.loai === this._loai && m.active !== false);
    than.innerHTML = `
      <div class="card">
        <div class="field"><label>Loại báo cáo</label>
          <select id="bc-loai">
            <option value="thang" ${this._loai === 'thang' ? 'selected' : ''}>Báo cáo tháng</option>
            <option value="hocky" ${this._loai === 'hocky' ? 'selected' : ''}>Báo cáo 6 tháng</option>
            <option value="cambridge" ${this._loai === 'cambridge' ? 'selected' : ''}>Báo cáo Cambridge</option>
          </select>
        </div>
        ${cls.length > 1 ? `<div class="field"><label>Nhóm</label>
          <select id="bc-nhom">${cls.map(c => `<option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}</select>
        </div>` : ''}
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Từ ngày</label><input type="date" id="bc-tu" value="${UI.esc(this._tuNgay)}"></div>
          <div class="field" style="margin:0"><label>Đến ngày</label><input type="date" id="bc-den" value="${UI.esc(this._denNgay)}"></div>
        </div>
      </div>

      ${!mauHop.length ? `<div class="card"><div class="muted small" style="line-height:1.7">
        Chưa có mẫu nào cho loại báo cáo này. ${this.laQuanTri()
          ? 'Sang thẻ <b>Mẫu báo cáo</b> để tạo mẫu.'
          : 'Nhờ nhà trường tạo mẫu ở phần Quản trị giúp cô nhé.'}
      </div></div>` : ''}

      ${(d.danhSach || []).map(x => this.theBe(x, mauHop)).join('')}`;

    document.getElementById('bc-loai').onchange = (e) => { this._loai = e.target.value; App.route(); };
    const sel = document.getElementById('bc-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    document.getElementById('bc-tu').onchange = (e) => { this._tuNgay = e.target.value; App.route(); };
    document.getElementById('bc-den').onchange = (e) => { this._denNgay = e.target.value; App.route(); };

    for (const b of than.querySelectorAll('[data-mo]')) {
      b.onclick = () => { this._banId = b.dataset.mo; App.route(); };
    }
    for (const b of than.querySelectorAll('[data-tao]')) {
      b.onclick = () => this.moBan(b.dataset.tao, b.dataset.mau);
    }
  },

  // Mẫu hợp lứa tuổi của bé. Không tự chọn thay cô khi có nhiều mẫu cùng hợp —
  // chỉ đưa lên trước.
  mauChoBe(x, mauHop) {
    const t = x.thangTuoi;
    if (t == null) return mauHop;
    const hop = mauHop.filter(m => t >= m.tuThang && t < m.denThang);
    return hop.length ? hop : mauHop;
  },

  theBe(x, mauHop) {
    const hop = this.mauChoBe(x, mauHop);
    const tuoi = x.thangTuoi == null ? '' : `${x.thangTuoi} tháng`;
    return `
      <div class="card">
        <div class="row-between">
          <div>
            <div style="font-weight:600">${UI.esc(x.hoTen)}</div>
            ${tuoi ? `<div class="muted small">${UI.esc(tuoi)}</div>` : ''}
          </div>
          ${x.banId ? UI.badge(...this.nhanBuoc(x.buoc, x.ngayCongBo)) : ''}
        </div>
        ${x.buoc === 'tra-lai' && x.yKien ? `<div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">Quản lý trả lại: ${UI.esc(x.yKien)}</div>` : ''}
        ${x.banId
          ? `<button class="btn outline block mt-8" data-mo="${UI.esc(x.banId)}">${UI.icon('edit', 16)} Mở báo cáo</button>`
          : (hop.length
            ? `<button class="btn outline block mt-8" data-tao="${UI.esc(x.studentId)}" data-mau="${UI.esc(hop[0].id)}">
                 ${UI.icon('plus', 16)} Soạn ${UI.esc(hop[0].ten)}
               </button>`
            : '')}
      </div>`;
  },

  async moBan(studentId, mauId) {
    try {
      const r = await API.post('/api/baocaohoctap/ban', {
        studentId, mauId, tuNgay: this._tuNgay, denNgay: this._denNgay,
      });
      this._banId = r.ban.id;
      if ((r.daDienSan || []).length) {
        UI.toast(`Đã điền sẵn ${r.daDienSan.length} ô từ Kế hoạch của bé — cô đọc lại và sửa nhé`, 'success');
      }
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa mở được báo cáo', 'error'); }
  },

  // ==================== Màn soạn của cô ====================
  async veSoan(than) {
    const d = await API.get(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}`);
    const b = d.ban;
    this._ban = b;

    const nhom = [];
    for (const x of (b.dong || [])) {
      const ten = x.nhom || '';
      if (!nhom.length || nhom[nhom.length - 1].ten !== ten) nhom.push({ ten, tenEn: x.nhomEn, dong: [] });
      nhom[nhom.length - 1].dong.push(x);
    }

    than.innerHTML = `
      <div class="card">
        <div class="row-between">
          <div>
            <div style="font-weight:600">${UI.esc(b.hoTen)}</div>
            <div class="muted small">${UI.esc(b.mau ? b.mau.ten : '')} · ${UI.esc(UI.fmtDate(b.tuNgay))} – ${UI.esc(UI.fmtDate(b.denNgay))}</div>
          </div>
          ${UI.badge(...this.nhanBuoc(b.buoc, b.duyet && b.duyet.ngayCongBo))}
        </div>
        ${b.buoc === 'tra-lai' && b.duyet && b.duyet.yKien ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
            ${UI.esc(b.duyet.nguoiDuyetTen || 'Quản lý')} trả lại: ${UI.esc(b.duyet.yKien)}
          </div>` : ''}
        <button class="btn outline block mt-8" id="bc-quay">Quay lại</button>
        ${b.daGui ? '' : `<button class="btn outline block mt-8" id="bc-moi">${UI.icon('plan', 16)} Mời chữ từ Kế hoạch của bé</button>`}
        <div class="muted small mt-8" style="line-height:1.6">
          ${b.giaDinhThay
            ? 'Gia đình đang đọc bản này. Cần sửa thì thu về nháp trước.'
            : (b.daGui
              ? 'Bản đã gửi, đang khoá. Gia đình chỉ nhận khi quản lý duyệt và tới ngày công bố.'
              : 'Nháp này gia đình chưa nhìn thấy. Ô có sẵn chữ từ Kế hoạch của bé thì cô đọc lại và sửa; xong bấm gửi quản lý duyệt ở cuối trang.')}
        </div>
      </div>

      <div id="bc-goi-y"></div>

      ${nhom.map(g => `
        <div class="card">
          ${g.ten ? `<div class="card-title">${UI.esc(g.ten)}</div>` : ''}
          ${g.tenEn ? `<div class="muted small" style="margin-top:-4px;margin-bottom:8px">${UI.esc(g.tenEn)}</div>` : ''}
          ${g.dong.map(x => {
            // KHOÁ Ô THEO CÔ: ô cô khác đã ghi thì chỉ đọc; quản lý có nút mở.
            const khoa = x.khoa && x.khoa.dangKhoa ? x.khoa : null;
            const cuaNguoiKhac = !!khoa && khoa.coGhi !== this.toiLa();
            const chiDoc = b.daGui || cuaNguoiKhac;
            return `
            <div style="padding:10px 0;border-top:1px solid var(--line)">
              <div class="small" style="font-weight:600">${UI.esc(x.tieuDe)}</div>
              ${x.tieuDeEn ? `<div class="muted small">${UI.esc(x.tieuDeEn)}</div>` : ''}
              ${x.kieu === 'muc' ? `
                <div class="seg mt-8" data-muc-cua="${UI.esc(x.id)}" ${chiDoc ? 'data-chi-doc="1"' : ''}>
                  ${this._mucList.map(m => `
                    <button class="${x.muc === m.ma ? 'active' : ''}" data-muc="${UI.esc(m.ma)}" ${chiDoc ? 'disabled' : ''}
                      title="${UI.esc(m.ten)}">${UI.esc(m.chuCai)}</button>`).join('')}
                </div>
                <div class="muted small mt-8" data-ten-muc="${UI.esc(x.id)}">${UI.esc(this.tenMuc(x.muc))}</div>`
              : `<textarea class="mt-8 bc-o-viet" rows="3" data-chu="${UI.esc(x.id)}" ${chiDoc ? 'disabled' : ''}
                    placeholder="Cô kể lại điều đã thấy">${UI.esc(x.chu)}</textarea>`}
              ${khoa ? `
                <div class="row-between mt-8">
                  <span class="muted small">${cuaNguoiKhac
                    ? `${UI.esc(khoa.coGhiTen || 'Cô khác')} đã ghi phần này — đang khoá`
                    : 'Cô đã ghi phần này'}</span>
                  ${cuaNguoiKhac && this.laQuanTri() && x.oId
                    ? `<button class="btn sm outline" data-mo-khoa="${UI.esc(x.oId)}">Mở khoá</button>` : ''}
                </div>` : ''}
            </div>`;
          }).join('')}
        </div>`).join('')}

      <div class="card">
        <div class="card-title">Cô kể thêm</div>
        <div class="field"><label>Báo cáo tổng hợp</label>
          <textarea id="bc-tong" class="bc-o-viet" rows="5" placeholder="Vài dòng cô muốn nhắn gia đình">${UI.esc(b.tongHop)}</textarea></div>
        <div class="field"><label>Ở lớp cô sẽ làm tiếp</label>
          <textarea id="bc-lop" class="bc-o-viet" rows="2">${UI.esc(b.oLopLamGi)}</textarea></div>
        <div class="field"><label>Ở nhà gia đình chơi cùng con</label>
          <textarea id="bc-nha" class="bc-o-viet" rows="2">${UI.esc(b.oNhaChoiGi)}</textarea>
          <div class="hint">Bản nào có ghi nhận điều cô <b>đã quan sát thấy</b> ở bé thì cần
          ít nhất một trong hai ô trên — đây là màn hình duy nhất gia đình đọc được các mức
          đánh giá, và đọc xong họ cần biết làm gì tiếp.</div></div>
      </div>

      ${b.daGui ? '' : `<button class="btn block mt-14" id="bc-luu">${UI.icon('check', 18)} Lưu nháp</button>`}
      ${this.nutCuoiTrang(b)}`;

    document.getElementById('bc-quay').onclick = () => { this._banId = null; this._goiY = null; App.route(); };
    const moi = document.getElementById('bc-moi');
    if (moi) moi.onclick = () => this.moiChu();
    const luu = document.getElementById('bc-luu');
    if (luu) luu.onclick = () => this.luu();
    const gui = document.getElementById('bc-gui');
    if (gui) gui.onclick = () => this.gui();
    const thu = document.getElementById('bc-thu');
    if (thu) thu.onclick = () => this.thuHoi();
    const duyet = document.getElementById('bc-duyet');
    if (duyet) duyet.onclick = () => this.duyet('da-duyet');
    const tra = document.getElementById('bc-tra');
    if (tra) tra.onclick = () => this.moTraLai();
    for (const nut of than.querySelectorAll('[data-mo-khoa]')) {
      nut.onclick = () => this.moKhoa(nut.dataset.moKhoa);
    }

    for (const seg of than.querySelectorAll('[data-muc-cua]')) {
      if (seg.dataset.chiDoc) continue;
      for (const nut of seg.querySelectorAll('button')) {
        nut.onclick = () => {
          for (const k of seg.querySelectorAll('button')) k.classList.remove('active');
          nut.classList.add('active');
          const nhan = than.querySelector(`[data-ten-muc="${seg.dataset.mucCua}"]`);
          if (nhan) nhan.textContent = this.tenMuc(nut.dataset.muc);
        };
      }
    }
  },

  // Ô đang khoá bởi cô khác thì KHÔNG gửi lên: máy chủ giữ nguyên ô không
  // được gửi, còn gửi lên y nguyên cũng đi qua — nhưng không gửi là chắc hơn.
  thuThapO(than) {
    const o = [];
    for (const t of than.querySelectorAll('[data-chu]')) {
      if (t.disabled) continue;
      o.push({ dongId: t.dataset.chu, chu: t.value });
    }
    for (const seg of than.querySelectorAll('[data-muc-cua]')) {
      if (seg.dataset.chiDoc) continue;
      const chon = seg.querySelector('button.active');
      o.push({ dongId: seg.dataset.mucCua, muc: chon ? chon.dataset.muc : '' });
    }
    return o;
  },

  // Nút cuối trang tuỳ theo bước và theo người đang mở.
  nutCuoiTrang(b) {
    if (b.buoc === 'cho-duyet' && this.laQuanTri()) {
      return `
        <div class="card mt-8">
          <div class="field"><label>Ngày gia đình nhận được</label>
            <input type="date" id="bc-ngay-cong-bo" value="${UI.esc(UI.todayStr())}">
            <div class="hint">Để hôm nay thì gia đình nhận ngay khi duyệt. Chọn ngày sau thì tới ngày đó app mới báo.</div>
          </div>
          <div class="grid-2">
            <button class="btn success-soft" id="bc-duyet">${UI.icon('check', 16)} Duyệt và gửi gia đình</button>
            <button class="btn danger-soft" id="bc-tra">Trả lại cho cô</button>
          </div>
        </div>`;
    }
    if (b.daGui) {
      return `<button class="btn outline block mt-8" id="bc-thu">${b.buoc === 'cho-duyet' ? 'Rút lại để sửa' : 'Thu về nháp để sửa'}</button>`;
    }
    if (this.laQuanTri()) {
      return `
        <div class="card mt-8">
          <div class="field"><label>Ngày gia đình nhận được</label>
            <input type="date" id="bc-ngay-cong-bo" value="${UI.esc(UI.todayStr())}"></div>
          <button class="btn primary block" id="bc-gui">${UI.icon('send', 18)} Duyệt và gửi gia đình</button>
        </div>`;
    }
    return `<button class="btn primary block mt-8" id="bc-gui">${UI.icon('send', 18)} Gửi quản lý duyệt</button>`;
  },

  async duyet(quyetDinh, yKien = '') {
    const o = document.getElementById('bc-ngay-cong-bo');
    try {
      const r = await API.post(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}/duyet`, {
        quyetDinh, yKien, ngayCongBo: o ? o.value : '',
      });
      UI.toast(quyetDinh === 'da-duyet'
        ? (r.daBao ? 'Đã duyệt — gia đình đã được báo' : `Đã duyệt — gia đình nhận ngày ${UI.fmtDateShort(r.ngayCongBo)}`)
        : 'Đã trả lại cho cô', 'success');
      UI.closeModal();
      this._banId = null;
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa duyệt được', 'error'); }
  },

  moTraLai() {
    UI.modal(`
      <div class="field">
        <label>Vì sao trả lại</label>
        <textarea id="bc-ykien" rows="3" placeholder="Ví dụ: phần Thực hành cuộc sống còn chung chung, cô kể một việc cụ thể con đã làm."></textarea>
        <div class="hint">Cô đọc dòng này để biết phải sửa gì — bỏ trống thì không trả lại được.</div>
      </div>
      <button class="btn danger-soft block" id="bc-tra-luu">Trả lại cho cô</button>
    `, 'Trả lại báo cáo');
    document.getElementById('bc-tra-luu').onclick = () => {
      const y = document.getElementById('bc-ykien').value.trim();
      if (!y) return UI.toast('Quản lý ghi giúp cô một dòng vì sao nhé', 'error');
      this.duyet('tu-choi', y);
    };
  },

  async moKhoa(oId) {
    try {
      await API.post(`/api/baocaohoctap/o/${encodeURIComponent(oId)}/mo-khoa`, {});
      UI.toast('Đã mở khoá — cô nào ghi tiếp sẽ giữ phần này', 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa mở được', 'error'); }
  },

  async luu(im) {
    const than = document.getElementById('bc-than');
    try {
      await API.put(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}`, {
        o: this.thuThapO(than),
        tongHop: document.getElementById('bc-tong').value,
        oLopLamGi: document.getElementById('bc-lop').value,
        oNhaChoiGi: document.getElementById('bc-nha').value,
      });
      if (!im) { UI.toast('Đã lưu nháp', 'success'); App.route(); }
      return true;
    } catch (e) { UI.toast(e.message || 'Chưa lưu được', 'error'); return false; }
  },

  // Lưu trước rồi mới gửi: cô vừa gõ xong mà bấm thẳng nút gửi thì phần vừa
  // gõ chưa kịp lên máy chủ, và gia đình nhận một bản thiếu đúng đoạn cuối.
  async gui() {
    if (!await this.luu(true)) return;
    const o = document.getElementById('bc-ngay-cong-bo');
    try {
      const r = await API.post(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}/gui`,
        o ? { ngayCongBo: o.value } : {});
      UI.toast(r.choDuyet ? 'Đã gửi quản lý duyệt' : 'Đã duyệt và gửi gia đình', 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa gửi được', 'error'); }
  },

  async thuHoi() {
    try {
      await API.post(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}/thu-hoi`, {});
      UI.toast('Đã thu về nháp', 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa thu về được', 'error'); }
  },

  // MỜI CHỮ, KHÔNG TỰ ĐIỀN.
  //
  // Nhận xét cuối tháng cô ghi ở Kế hoạch của bé là chữ cô viết cho mình đọc.
  // Nó đi sang báo cáo gia đình khi và chỉ khi cô đọc lại rồi bấm chọn.
  async moiChu() {
    let d;
    try { d = await API.get(`/api/baocaohoctap/goi-y/${encodeURIComponent(this._banId)}`); }
    catch (e) { return UI.toast(e.message || 'Chưa lấy được', 'error'); }

    if (!d.bat) {
      return UI.toast('Nhà trường chưa bật phần Kế hoạch của bé', 'error');
    }
    if (!(d.goiY || []).length) {
      return UI.toast(`Kế hoạch của bé tháng ${d.thang || ''} chưa có bài hay ghi chép nào để mời sang`, 'error');
    }

    UI.modal(`
      <div class="muted small" style="line-height:1.7;margin-bottom:10px">
        Đây là chữ cô đã ghi ở <b>Kế hoạch của bé</b> tháng ${UI.esc(d.thang)}.
        Bấm <b>Chép</b> để đưa vào ô tổng hợp rồi sửa lại cho gia đình đọc.
      </div>
      ${(d.goiY || []).map((g, i) => `
        <div class="card" style="margin-bottom:8px">
          ${g.tenGoc ? `<div class="small" style="font-weight:600">${UI.esc(g.tenGoc)}</div>` : ''}
          ${g.noiDung ? `<div class="muted small mt-8">${g.loai === 'bai' ? 'Bài đã tích' : 'Kế hoạch'}: ${UI.esc(g.noiDung)}</div>` : ''}
          ${g.nhanXet ? `<div class="small mt-8" style="white-space:pre-wrap">${UI.esc(g.nhanXet)}</div>` : ''}
          <button class="btn outline block mt-8" data-chep="${i}">Chép câu này</button>
        </div>`).join('')}`, 'Mời chữ từ Kế hoạch của bé');

    const ov = document.getElementById('modal-overlay');
    for (const b of ov.querySelectorAll('[data-chep]')) {
      b.onclick = () => {
        const g = d.goiY[Number(b.dataset.chep)];
        const o = document.getElementById('bc-tong');
        // Bài đã tích: chép cả tên bài lẫn nhận xét — nhận xét "Tháp hồng: …"
        // đứng một mình thì mất các bài cô chưa kịp ghi gì.
        const chu = g.loai === 'bai' ? [g.noiDung, g.nhanXet].filter(Boolean).join('\n') : (g.nhanXet || g.noiDung);
        const them = [g.tenGoc, chu].filter(Boolean).join(': ');
        o.value = (o.value ? `${o.value}\n` : '') + them;
        UI.closeModal();
        UI.toast('Đã chép vào ô tổng hợp, cô sửa lại rồi lưu nhé', 'success');
      };
    }
  },

  // ==================== Mẫu báo cáo (quản trị) ====================
  async veMau(than) {
    than.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.7">
          Mẫu là danh sách các dòng nhà trường muốn cô điền. Mỗi dòng chọn một
          trong hai kiểu: <b>ô chữ</b> để cô kể lại điều đã thấy, hoặc
          <b>chọn mức</b> với năm lựa chọn ${UI.esc(this._mucList.map(m => m.chuCai).join(' · '))}.
        </div>
        <button class="btn primary block mt-8" id="bc-them-mau">${UI.icon('plus', 16)} Tạo mẫu mới</button>
      </div>
      ${this._mau.length ? this._mau.map(m => `
        <div class="card tap" data-sua="${UI.esc(m.id)}">
          <div class="row-between">
            <div>
              <div style="font-weight:600">${UI.esc(m.ten)}</div>
              <div class="muted small">${UI.esc(m.loaiTen)} · ${UI.esc(String(m.tuThang))}–${UI.esc(String(m.denThang))} tháng</div>
            </div>
            ${m.active ? '' : UI.badge('Đang tắt', 'gray')}
          </div>
        </div>`).join('')
      : UI.emptyState('📘', 'Chưa có mẫu nào. Tạo mẫu đầu tiên để cô bắt đầu soạn báo cáo.')}`;

    document.getElementById('bc-them-mau').onclick = () => this.moSuaMau(null);
    for (const c of than.querySelectorAll('[data-sua]')) {
      c.onclick = () => this.moSuaMau(c.dataset.sua);
    }
  },

  async moSuaMau(id) {
    let mau = { loai: 'thang', ten: '', tuThang: 0, denThang: 36, active: 1 };
    let dong = [];
    if (id) {
      const d = await API.get(`/api/baocaohoctap/mau/${encodeURIComponent(id)}`);
      mau = d.mau; dong = d.dong || [];
    }
    UI.modal(`
      <div class="field"><label>Tên mẫu</label>
        <input id="bm-ten" value="${UI.esc(mau.ten)}" placeholder="Báo cáo tháng 0–3"></div>
      <div class="field"><label>Loại</label>
        <select id="bm-loai">
          <option value="thang" ${mau.loai === 'thang' ? 'selected' : ''}>Báo cáo tháng</option>
          <option value="hocky" ${mau.loai === 'hocky' ? 'selected' : ''}>Báo cáo 6 tháng</option>
          <option value="cambridge" ${mau.loai === 'cambridge' ? 'selected' : ''}>Báo cáo Cambridge</option>
        </select></div>
      <div class="grid-2">
        <div class="field" style="margin:0"><label>Từ (tháng tuổi)</label>
          <input type="number" id="bm-tu" min="0" max="240" value="${UI.esc(String(mau.tuThang))}"></div>
        <div class="field" style="margin:0"><label>Đến (tháng tuổi)</label>
          <input type="number" id="bm-den" min="1" max="240" value="${UI.esc(String(mau.denThang))}"></div>
      </div>
      <div class="field"><label>Các dòng — mỗi dòng một tiêu chí</label>
        <div class="muted small" style="margin-bottom:6px;line-height:1.6">
          Mỗi dòng một hàng, theo mẫu:<br>
          <code>Mục lớn | Tiêu đề | chu hoặc muc | góc lĩnh vực (không bắt buộc)</code>
        </div>
        <textarea id="bm-dong" rows="10" placeholder="I. KỸ NĂNG TỰ PHỤC VỤ | Lưu ý | chu
II. PHÁT TRIỂN NHẬN THỨC | Thực hành cuộc sống | chu | thuc-hanh-cuoc-song">${
        UI.esc(dong.map(d => [d.nhom, d.tieuDe, d.kieu, d.gocLinhVuc].join(' | ').replace(/\s*\|\s*$/, '')).join('\n'))}</textarea></div>
      ${id ? `<label class="row-between" style="padding:8px 0">
        <span>Mẫu đang dùng</span>
        <input type="checkbox" id="bm-active" ${mau.active ? 'checked' : ''}></label>` : ''}
      <button class="btn primary block mt-8" id="bm-luu">Lưu mẫu</button>`,
    id ? 'Sửa mẫu báo cáo' : 'Tạo mẫu báo cáo');

    document.getElementById('bm-luu').onclick = async () => {
      const dongs = document.getElementById('bm-dong').value.split('\n')
        .map(s => s.trim()).filter(Boolean)
        .map(s => {
          const p = s.split('|').map(x => x.trim());
          return { nhom: p[0] || '', tieuDe: p[1] || p[0] || '', kieu: p[2] === 'muc' ? 'muc' : 'chu', gocLinhVuc: p[3] || '' };
        });
      const goi = {
        ten: document.getElementById('bm-ten').value,
        loai: document.getElementById('bm-loai').value,
        tuThang: Number(document.getElementById('bm-tu').value),
        denThang: Number(document.getElementById('bm-den').value),
        dong: dongs,
      };
      const ac = document.getElementById('bm-active');
      if (ac) goi.active = ac.checked;
      try {
        if (id) await API.put(`/api/baocaohoctap/mau/${encodeURIComponent(id)}`, goi);
        else await API.post('/api/baocaohoctap/mau', goi);
        UI.closeModal();
        UI.toast('Đã lưu mẫu', 'success');
        App.route();
      } catch (e) { UI.toast(e.message || 'Chưa lưu được', 'error'); }
    };
  },
};
