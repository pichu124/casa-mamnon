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
  _ngay: null,
  _classId: null,

  nhanMucAn(ma) {
    const t = this.MUC_AN.find(x => x[0] === ma);
    return t ? t[1] : '';
  },
  nhanTinhChat(ma) {
    const t = this.TINH_CHAT.find(x => x[0] === ma);
    return t ? t[1] : '';
  },

  async render(root) {
    if (App.state.user.role === 'parent') return this.manGiaDinh(root);
    return this.manCoGiao(root);
  },

  // ================= Màn của cô: ghi cả nhóm một lượt =================
  async manCoGiao(root) {
    const nhom = (App.state.user.classIds || []).length
      ? App.state.user.classIds
      : (App.state.classes || []).map(c => c.id);
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
          ${(App.state.classes || []).length > 1 ? `
            <div class="field" style="margin:0">
              <label>Nhóm</label>
              <select id="nk-nhom">
                ${(App.state.classes || []).map(c => `
                  <option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          Ô nào cô chưa kịp ghi thì để trống — màn hình của gia đình sẽ nói
          <b>"cô chưa ghi"</b>, chứ không nói bé không ăn.
        </div>
      </div>

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
              <input type="time" id="nk-ca-ngu-tu" placeholder="Từ" style="flex:1;min-width:0">
              <input type="time" id="nk-ca-ngu-den" placeholder="Đến" style="flex:1;min-width:0">
            </div>
          </div>
        </div>
        <button class="btn outline block mt-14" id="nk-ap">Áp cho cả nhóm</button>
      </div>

      ${(d.danhSach || []).length ? (d.danhSach || []).map(b => this.theBe(b, coNhaTre)).join('')
        : UI.emptyState('📔', 'Nhóm này chưa có bé nào.')}

      ${(d.danhSach || []).length ? `
        <button class="btn primary block mt-14" id="nk-luu">${UI.icon('check', 18)} Lưu nhật ký cả nhóm</button>` : ''}`;

    document.getElementById('nk-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    const selNhom = document.getElementById('nk-nhom');
    if (selNhom) selNhom.onchange = (e) => { this._classId = e.target.value; App.route(); };
    document.getElementById('nk-ap').onclick = () => this.apCaNhom();
    const btn = document.getElementById('nk-luu');
    if (btn) btn.onclick = () => this.luu();
  },

  // Một thẻ cho một bé.
  theBe(b, coNhaTre) {
    const id = UI.esc(b.studentId);
    const chon = (ten, ma, ds, dangChon) => `
      <select class="nk-o" data-be="${id}" data-truong="${UI.esc(ma)}">
        <option value="">— chưa ghi —</option>
        ${ds.map(([v, t]) => `<option value="${UI.esc(v)}" ${dangChon === v ? 'selected' : ''}>${UI.esc(t)}</option>`).join('')}
      </select>`;
    const so = (ma, gt, ph) => `
      <input type="number" min="0" class="nk-o" data-be="${id}" data-truong="${UI.esc(ma)}"
        value="${gt === null || gt === undefined ? '' : UI.esc(String(gt))}" placeholder="${UI.esc(ph)}">`;

    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(b.avatar, 40)}
          <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
          ${b.daGhi ? UI.badge('Đã ghi', 'green') : ''}
        </div>

        <div class="section-label">Ăn</div>
        <div class="grid-2">
          <div class="field" style="margin:0"><label>Sáng</label>${chon('Sáng', 'anSang', this.MUC_AN, b.anSang)}</div>
          <div class="field" style="margin:0"><label>Trưa</label>${chon('Trưa', 'anTrua', this.MUC_AN, b.anTrua)}</div>
        </div>
        <div class="field mt-8" style="margin-bottom:0"><label>Bữa xế</label>${chon('Xế', 'anXe', this.MUC_AN, b.anXe)}</div>
        <input class="nk-o mt-8" data-be="${id}" data-truong="anGhiChu" placeholder="Ghi chú về bữa ăn"
          value="${UI.esc(b.anGhiChu || '')}">

        <div class="section-label">Ngủ</div>
        <div class="flex" style="gap:6px">
          <input type="time" class="nk-o" data-be="${id}" data-truong="nguTuLuc" value="${UI.esc(b.nguTuLuc || '')}" style="flex:1;min-width:0">
          <input type="time" class="nk-o" data-be="${id}" data-truong="nguDenLuc" value="${UI.esc(b.nguDenLuc || '')}" style="flex:1;min-width:0">
        </div>
        <input class="nk-o mt-8" data-be="${id}" data-truong="nguGhiChu" placeholder="Ví dụ: ngủ ngon, hoặc trằn trọc đầu giờ"
          value="${UI.esc(b.nguGhiChu || '')}">

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
        <textarea class="nk-o" data-be="${id}" data-truong="ghiChu" rows="2"
          placeholder="Hôm nay có gì gia đình cần biết ạ">${UI.esc(b.ghiChu || '')}</textarea>
      </div>`;
  },

  // Áp một lựa chọn cho mọi bé — chỗ giúp cô xong cả nhóm trong vài phút.
  apCaNhom() {
    const trua = document.getElementById('nk-ca-trua').value;
    const tu = document.getElementById('nk-ca-ngu-tu').value;
    const den = document.getElementById('nk-ca-ngu-den').value;
    if (!trua && !tu && !den) return UI.toast('Cô chọn ít nhất một mục để áp nhé', 'error');
    let dem = 0;
    for (const o of document.querySelectorAll('.nk-o')) {
      if (trua && o.dataset.truong === 'anTrua') { o.value = trua; dem++; }
      if (tu && o.dataset.truong === 'nguTuLuc') { o.value = tu; dem++; }
      if (den && o.dataset.truong === 'nguDenLuc') { o.value = den; dem++; }
    }
    UI.toast(`Đã áp cho cả nhóm. Cô sửa lại riêng bé nào khác rồi bấm Lưu.`, 'success');
    void dem;
  },

  async luu() {
    const theoBe = new Map();
    for (const o of document.querySelectorAll('.nk-o')) {
      const be = o.dataset.be;
      if (!theoBe.has(be)) theoBe.set(be, { studentId: be });
      theoBe.get(be)[o.dataset.truong] = o.value;
    }
    try {
      const r = await API.put('/api/nhatky', { ngay: this._ngay, danhSach: [...theoBe.values()] });
      UI.toast(`Đã lưu nhật ký cho ${r.daGhi} bé`, 'success');
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

    const bua = [['Sáng', n.anSang], ['Trưa', n.anTrua], ['Xế', n.anXe]]
      .filter(([, v]) => v)
      .map(([t, v]) => `${t}: ${this.nhanMucAn(v)}`).join(' · ');
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
