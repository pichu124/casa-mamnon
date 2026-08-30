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

    const d = await API.get('/api/baocaohoctap/mau');
    this._mau = d.mau || [];
    this._mucList = d.muc || [];

    root.innerHTML = `
      ${UI.pageHeader('Báo cáo học tập')}
      <div class="seg" id="bc-tabs">
        <button class="${this._tab === 'so' ? 'active' : ''}" data-tab="so">Sổ của nhóm</button>
        ${this.laQuanTri() ? `<button class="${this._tab === 'mau' ? 'active' : ''}" data-tab="mau">Mẫu báo cáo</button>` : ''}
      </div>
      <div id="bc-than"></div>`;

    for (const b of document.getElementById('bc-tabs').querySelectorAll('button')) {
      b.onclick = () => { this._tab = b.dataset.tab; this._banId = null; App.route(); };
    }
    const than = document.getElementById('bc-than');
    if (this._tab === 'mau') return this.veMau(than);
    if (this._banId) return this.veSoan(than);
    return this.veSo(than);
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
      ${UI.thanhChonBe()}
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
    return nhom.map(g => {
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
        ${b.coKy ? `<div class="muted small mt-12">${UI.esc(b.coKy)}</div>` : ''}
      </div>`;
  },

  // ==================== Sổ của nhóm ====================
  async veSo(than) {
    const cls = (App.state.classes || []);
    this._classId = this._classId || (cls[0] || {}).id || '';
    if (!this._classId) {
      than.innerHTML = UI.emptyState('📘', 'Cô chưa phụ trách nhóm nào nên chưa soạn báo cáo được.');
      return;
    }
    const q = `?classId=${encodeURIComponent(this._classId)}&tuNgay=${encodeURIComponent(this._tuNgay)}&denNgay=${encodeURIComponent(this._denNgay)}`;
    const d = await API.get(`/api/baocaohoctap/nhom${q}`);

    const mauHop = this._mau.filter(m => m.loai === this._loai);
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
          ${x.banId
            ? UI.badge(x.daGui ? 'Đã gửi gia đình' : 'Cô đang soạn', x.daGui ? 'green' : 'gray')
            : ''}
        </div>
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
          ${UI.badge(b.daGui ? 'Đã gửi gia đình' : 'Nháp của cô', b.daGui ? 'green' : 'gray')}
        </div>
        <button class="btn outline block mt-8" id="bc-quay">Quay lại sổ của nhóm</button>
        <button class="btn outline block mt-8" id="bc-moi">${UI.icon('plan', 16)} Mời chữ từ Kế hoạch của bé</button>
        <div class="muted small mt-8" style="line-height:1.6">
          Nháp này gia đình chưa nhìn thấy. Cô đọc lại rồi bấm gửi ở cuối trang.
        </div>
      </div>

      <div id="bc-goi-y"></div>

      ${nhom.map(g => `
        <div class="card">
          ${g.ten ? `<div class="card-title">${UI.esc(g.ten)}</div>` : ''}
          ${g.tenEn ? `<div class="muted small" style="margin-top:-4px;margin-bottom:8px">${UI.esc(g.tenEn)}</div>` : ''}
          ${g.dong.map(x => `
            <div style="padding:10px 0;border-top:1px solid var(--line)">
              <div class="small" style="font-weight:600">${UI.esc(x.tieuDe)}</div>
              ${x.tieuDeEn ? `<div class="muted small">${UI.esc(x.tieuDeEn)}</div>` : ''}
              ${x.kieu === 'muc' ? `
                <div class="seg mt-8" data-muc-cua="${UI.esc(x.id)}">
                  ${this._mucList.map(m => `
                    <button class="${x.muc === m.ma ? 'active' : ''}" data-muc="${UI.esc(m.ma)}"
                      title="${UI.esc(m.ten)}">${UI.esc(m.chuCai)}</button>`).join('')}
                </div>
                <div class="muted small mt-8" data-ten-muc="${UI.esc(x.id)}">${UI.esc(this.tenMuc(x.muc))}</div>`
              : `<textarea class="mt-8" rows="3" data-chu="${UI.esc(x.id)}"
                    placeholder="Cô kể lại điều đã thấy">${UI.esc(x.chu)}</textarea>`}
            </div>`).join('')}
        </div>`).join('')}

      <div class="card">
        <div class="card-title">Cô kể thêm</div>
        <div class="field"><label>Báo cáo tổng hợp</label>
          <textarea id="bc-tong" rows="5" placeholder="Vài dòng cô muốn nhắn gia đình">${UI.esc(b.tongHop)}</textarea></div>
        <div class="field"><label>Ở lớp cô sẽ làm tiếp</label>
          <textarea id="bc-lop" rows="2">${UI.esc(b.oLopLamGi)}</textarea></div>
        <div class="field"><label>Ở nhà gia đình chơi cùng con</label>
          <textarea id="bc-nha" rows="2">${UI.esc(b.oNhaChoiGi)}</textarea></div>
        <div class="field"><label>Cô ký tên</label>
          <input id="bc-ky" value="${UI.esc(b.coKy)}" placeholder="Tên cô"></div>
      </div>

      <button class="btn block mt-14" id="bc-luu">${UI.icon('check', 18)} Lưu nháp</button>
      ${b.daGui
        ? `<button class="btn outline block mt-8" id="bc-thu">Thu về nháp để sửa</button>`
        : `<button class="btn primary block mt-8" id="bc-gui">${UI.icon('send', 18)} Gửi cho gia đình</button>`}`;

    document.getElementById('bc-quay').onclick = () => { this._banId = null; this._goiY = null; App.route(); };
    document.getElementById('bc-moi').onclick = () => this.moiChu();
    document.getElementById('bc-luu').onclick = () => this.luu();
    const gui = document.getElementById('bc-gui');
    if (gui) gui.onclick = () => this.gui();
    const thu = document.getElementById('bc-thu');
    if (thu) thu.onclick = () => this.thuHoi();

    for (const seg of than.querySelectorAll('[data-muc-cua]')) {
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

  thuThapO(than) {
    const o = [];
    for (const t of than.querySelectorAll('[data-chu]')) o.push({ dongId: t.dataset.chu, chu: t.value });
    for (const seg of than.querySelectorAll('[data-muc-cua]')) {
      const chon = seg.querySelector('button.active');
      o.push({ dongId: seg.dataset.mucCua, muc: chon ? chon.dataset.muc : '' });
    }
    return o;
  },

  async luu(im) {
    const than = document.getElementById('bc-than');
    try {
      await API.put(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}`, {
        o: this.thuThapO(than),
        tongHop: document.getElementById('bc-tong').value,
        oLopLamGi: document.getElementById('bc-lop').value,
        oNhaChoiGi: document.getElementById('bc-nha').value,
        coKy: document.getElementById('bc-ky').value,
      });
      if (!im) { UI.toast('Đã lưu nháp', 'success'); App.route(); }
      return true;
    } catch (e) { UI.toast(e.message || 'Chưa lưu được', 'error'); return false; }
  },

  // Lưu trước rồi mới gửi: cô vừa gõ xong mà bấm thẳng nút gửi thì phần vừa
  // gõ chưa kịp lên máy chủ, và gia đình nhận một bản thiếu đúng đoạn cuối.
  async gui() {
    if (!await this.luu(true)) return;
    try {
      await API.post(`/api/baocaohoctap/ban/${encodeURIComponent(this._banId)}/gui`, {});
      UI.toast('Đã gửi cho gia đình', 'success');
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
      return UI.toast(`Tháng ${d.thang || ''} chưa có nhận xét nào ở Kế hoạch của bé`, 'error');
    }

    UI.modal(`
      <div class="muted small" style="line-height:1.7;margin-bottom:10px">
        Đây là chữ cô đã ghi ở <b>Kế hoạch của bé</b> tháng ${UI.esc(d.thang)}.
        Bấm <b>Chép</b> để đưa vào ô tổng hợp rồi sửa lại cho gia đình đọc.
      </div>
      ${(d.goiY || []).map((g, i) => `
        <div class="card" style="margin-bottom:8px">
          <div class="small" style="font-weight:600">${UI.esc(g.gocLinhVuc || '')}</div>
          ${g.noiDung ? `<div class="muted small mt-8">Kế hoạch: ${UI.esc(g.noiDung)}</div>` : ''}
          ${g.nhanXet ? `<div class="small mt-8" style="white-space:pre-wrap">${UI.esc(g.nhanXet)}</div>` : ''}
          <button class="btn outline block mt-8" data-chep="${i}">Chép câu này</button>
        </div>`).join('')}`, 'Mời chữ từ Kế hoạch của bé');

    const ov = document.getElementById('modal-overlay');
    for (const b of ov.querySelectorAll('[data-chep]')) {
      b.onclick = () => {
        const g = d.goiY[Number(b.dataset.chep)];
        const o = document.getElementById('bc-tong');
        const them = [g.gocLinhVuc, g.nhanXet || g.noiDung].filter(Boolean).join(': ');
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
