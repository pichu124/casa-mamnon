// ĐÓN TRẢ BÉ — màn hình.
//
// Hai màn, hai lúc khác nhau trong ngày:
//
//   • MÀN CỔNG của cô, 16h30, tay đang dắt bé, người lớn đứng chờ trước mặt.
//     Màn này phải cho xem ẢNH TO và tên, trong một lần bấm. Ghi lại đã trả
//     cho ai cũng trong một lần bấm nữa.
//
//   • HỒ SƠ ĐÓN TRẢ của gia đình, buổi tối, ngồi khai cho đủ. Màn này được
//     phép nhiều ô hơn.
//
// Hàm nén ảnh viết lại ở đây chứ không gọi sang màn Album: phân hệ cắm thêm mà
// dựa vào một màn hình lõi thì lúc nhà trường tắt Album đi là màn này hỏng theo.
App.views.dontra = {
  _classId: null,
  _ngay: null,
  _studentId: null,
  _anhMoi: null,

  laGiaDinh() { return App.state.user.role === 'parent'; },

  async render(root) {
    this._ngay = this._ngay || UI.todayStr();
    if (this.laGiaDinh()) return this.manGiaDinh(root);
    return this.manCong(root);
  },

  nhanTrangThai(t) {
    return ({
      'con-hieu-luc': ['Còn hiệu lực', 'green'],
      'chua-toi': ['Chưa tới ngày', 'blue'],
      'het-han': ['Đã hết hạn', 'gray'],
      'da-huy': ['Gia đình đã huỷ', 'red'],
    })[t] || ['', 'gray'];
  },

  // Thẻ một người được đón: ẢNH TO, tên, quan hệ, số điện thoại.
  //
  // Ảnh nhỏ xíu thì cô phải bấm phóng to giữa lúc đang trả 20 bé — tức là cô
  // sẽ không bấm, và cả phân hệ này thành trang trí.
  theNguoi(n, opts = {}) {
    const anh = n.anh
      ? `<img src="/api/dontra/anh/${UI.esc(n.anh)}" alt=""
           style="width:64px;height:64px;flex:none;border-radius:12px;object-fit:cover;background:var(--line)">`
      : `<div style="width:64px;height:64px;flex:none;border-radius:12px;background:var(--line);
           display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>`;
    return `
      <div class="list-row">
        ${anh}
        <div class="row-main">
          <div class="row-title">${UI.esc(n.hoTen)}</div>
          <div class="row-sub">${UI.esc([n.quanHe, n.dienThoai].filter(Boolean).join(' · ') || '—')}</div>
          ${!n.anh ? '<div class="row-sub" style="color:var(--danger)">Chưa có ảnh để đối chiếu</div>' : ''}
          ${opts.phu ? `<div class="row-sub">${UI.esc(opts.phu)}</div>` : ''}
        </div>
        ${opts.cuoi || ''}
      </div>`;
  },

  // ================= Màn CỔNG của cô =================
  async manCong(root) {
    const nhom = (App.state.classes || []);
    this._classId = this._classId
      || (App.state.user.classIds || [])[0]
      || (nhom[0] && nhom[0].id) || '';
    if (!this._classId) {
      root.innerHTML = UI.pageHeader('Đón trả bé')
        + UI.emptyState('🤝', 'Cô chưa phụ trách nhóm nào nên chưa có bé để trả.');
      return;
    }

    const d = await API.get(
      `/api/dontra/nhom?classId=${encodeURIComponent(this._classId)}&ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;

    root.innerHTML = `
      ${UI.pageHeader('Đón trả bé')}
      <div class="card">
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Ngày</label>
            <input type="date" id="dt-ngay" value="${UI.esc(this._ngay)}" max="${UI.esc(UI.todayStr())}">
          </div>
          ${nhom.length > 1 ? `
            <div class="field" style="margin:0">
              <label>Nhóm</label>
              <select id="dt-nhom">
                ${nhom.map(c => `<option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>
        <div class="muted small mt-8">Đã trả ${UI.esc(String(d.tong.soDaTra))} / ${UI.esc(String(d.tong.soBe))} bé.</div>
      </div>

      ${(d.danhSach || []).length
        ? (d.danhSach || []).map(b => this.theBeCong(b)).join('')
        : UI.emptyState('🤝', 'Nhóm này chưa có bé nào.')}`;

    document.getElementById('dt-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    const sel = document.getElementById('dt-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    for (const b of root.querySelectorAll('[data-tra]')) {
      b.onclick = () => this.moTra(b.dataset.tra);
    }
  },

  theBeCong(b) {
    const uy = b.uyQuyenHomNay || [];
    const het = b.uyQuyenKhongConHieuLuc || [];
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(b.avatar, 44)}
          <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
          ${b.daTra
            ? UI.badge(`Đã trả${b.daTra.luc ? ` ${b.daTra.luc}` : ''}`, 'green')
            : UI.badge('Chưa trả', 'orange')}
        </div>

        ${b.daTra ? `
          <div class="muted small" style="line-height:1.6;margin-bottom:8px">
            Đã trả cho <b>${UI.esc(b.daTra.nguoiDon)}</b>${b.daTra.coGhiTen ? ` — ${UI.esc(b.daTra.coGhiTen)} ghi` : ''}
            ${b.daTra.ghiChu ? `<div>${UI.esc(b.daTra.ghiChu)}</div>` : ''}
          </div>` : ''}

        ${uy.length ? `
          <div class="section-label">Hôm nay gia đình uỷ quyền</div>
          ${uy.map(u => this.theNguoi(u, {
            phu: `${UI.fmtDate(u.tuNgay, { weekday: false })} – ${UI.fmtDate(u.denNgay, { weekday: false })}${u.lyDo ? ` · ${u.lyDo}` : ''}`,
          })).join('')}` : ''}

        <div class="section-label">Người đón thường xuyên</div>
        ${(b.nguoiThuongXuyen || []).length
          ? (b.nguoiThuongXuyen || []).map(n => this.theNguoi(n)).join('')
          : `<div class="small" style="color:var(--danger);line-height:1.6">
               Gia đình chưa khai ai được đón bé. Cô nhắc gia đình vào mục Đón trả bé khai giúp trường nhé.
             </div>`}

        ${het.length ? `
          <div class="section-label">Uỷ quyền KHÔNG còn hiệu lực</div>
          <div class="muted small" style="margin-bottom:6px">
            Nêu ở đây để nếu người này tới cổng thì cô biết vì sao app nói không, chứ không phải đoán.
          </div>
          ${het.map(u => {
            const [nhan, mau] = this.nhanTrangThai(u.trangThai);
            return this.theNguoi(u, {
              phu: `${UI.fmtDate(u.tuNgay, { weekday: false })} – ${UI.fmtDate(u.denNgay, { weekday: false })}`,
              cuoi: UI.badge(nhan, mau),
            });
          }).join('')}` : ''}

        <button class="btn ${b.daTra ? 'outline' : 'primary'} block mt-14" data-tra="${UI.esc(b.studentId)}">
          ${UI.icon('check', 18)} ${b.daTra ? 'Sửa lại người đã đón' : 'Ghi: đã trả bé'}
        </button>
      </div>`;
  },

  moTra(studentId) {
    const b = (this._data.danhSach || []).find(x => x.studentId === studentId);
    if (!b) return;
    const chon = [
      ...(b.nguoiThuongXuyen || []).map(n => ({ loai: 'thuong-xuyen', id: n.id, ten: `${n.hoTen}${n.quanHe ? ` (${n.quanHe})` : ''}` })),
      ...(b.uyQuyenHomNay || []).map(u => ({ loai: 'uy-quyen', id: u.id, ten: `${u.hoTen} — uỷ quyền hôm nay` })),
    ];
    const cu = b.daTra;
    const gio = (cu && cu.luc) || new Date().toTimeString().slice(0, 5);

    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(b.avatar, 44)}
        <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div>
          <div class="row-sub">${UI.esc(UI.fmtDate(this._ngay))}</div></div>
      </div>
      <div class="field">
        <label>Người đón</label>
        <select id="dt-ai">
          ${chon.map(c => `<option value="${UI.esc(c.loai)}|${UI.esc(c.id)}"
            ${cu && cu.nguonId === c.id ? 'selected' : ''}>${UI.esc(c.ten)}</option>`).join('')}
          <option value="khac|" ${cu && cu.nguonLoai === 'khac' ? 'selected' : ''}>Người khác — ghi rõ tên bên dưới</option>
        </select>
      </div>
      <div class="field" id="dt-ten-o" style="display:none">
        <label>Tên người đón</label>
        <input id="dt-ten" value="${UI.esc(cu && cu.nguonLoai === 'khac' ? cu.nguoiDon : '')}"
          placeholder="Ghi rõ họ tên người nhận bé">
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Lúc</label>
          <input type="time" id="dt-luc" value="${UI.esc(gio)}">
        </div>
      </div>
      <div class="field">
        <label>Ghi chú</label>
        <input id="dt-ghichu" value="${UI.esc((cu && cu.ghiChu) || '')}"
          placeholder="Ví dụ: mẹ gọi điện báo trước, có đối chiếu ảnh">
      </div>
      <button class="btn primary block" id="dt-luu">${UI.icon('check', 18)} Ghi vào sổ</button>
    `, 'Trả bé cho ai');

    const oAi = document.getElementById('dt-ai');
    const hienTen = () => {
      document.getElementById('dt-ten-o').style.display =
        oAi.value.startsWith('khac|') ? '' : 'none';
    };
    oAi.onchange = hienTen;
    hienTen();
    document.getElementById('dt-luu').onclick = () => this.luuTra(studentId);
  },

  async luuTra(studentId) {
    const [nguonLoai, nguonId] = document.getElementById('dt-ai').value.split('|');
    const nguoiDon = (document.getElementById('dt-ten') || {}).value || '';
    try {
      await API.post('/api/dontra/ghi', {
        studentId, ngay: this._ngay, nguonLoai, nguonId,
        nguoiDon: nguoiDon.trim(),
        luc: document.getElementById('dt-luc').value,
        ghiChu: document.getElementById('dt-ghichu').value.trim(),
      });
      UI.toast('Đã ghi vào sổ đón trả', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ================= Màn của GIA ĐÌNH =================
  async manGiaDinh(root) {
    const be = App.currentStudent();
    if (!be) {
      root.innerHTML = UI.pageHeader('Đón trả bé') + UI.emptyState('🤝', 'Chưa chọn bé.');
      return;
    }
    this._studentId = be.id;
    const d = await API.get(`/api/dontra?studentId=${encodeURIComponent(be.id)}`);
    this._ho = d;

    const conHieuLuc = (d.uyQuyen || []).filter(u => u.trangThai === 'con-hieu-luc' || u.trangThai === 'chua-toi');
    const daQua = (d.uyQuyen || []).filter(u => u.trangThai === 'het-han' || u.trangThai === 'da-huy');

    root.innerHTML = `
      ${UI.pageHeader('Đón trả bé')}
      ${UI.studentBar()}${UI.thanhChonBe()}

      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Đây là danh sách những người trường được phép trao con cho. Gia đình khai ở đây,
          cô ở cổng nhìn ảnh để đối chiếu. <b>Ai không còn đón nữa thì bấm "Ngưng dùng"</b> —
          trường vẫn giữ lại để tra những lần đón trước, nhưng không nhận người đó ở cổng nữa.
        </div>
      </div>

      <div class="section-label">Người đón thường xuyên</div>
      ${(d.nguoiThuongXuyen || []).length ? (d.nguoiThuongXuyen || []).map(n => `
        <div class="card">
          ${this.theNguoi(n, { cuoi: n.dangDung ? '' : UI.badge('Đã ngưng', 'gray') })}
          ${n.ghiChu ? `<div class="muted small">${UI.esc(n.ghiChu)}</div>` : ''}
          <div class="grid-2 mt-8">
            <button class="btn outline" data-sua="${UI.esc(n.id)}">${UI.icon('edit', 16)} Sửa</button>
            <button class="btn ${n.dangDung ? 'danger-soft' : 'success-soft'}" data-ngung="${UI.esc(n.id)}">
              ${n.dangDung ? 'Ngưng dùng' : 'Dùng lại'}
            </button>
          </div>
        </div>`).join('')
        : UI.emptyState('👤', 'Chưa khai ai được đón bé. Gia đình thêm giúp trường nhé.')}
      <button class="btn primary block" id="dt-them">${UI.icon('plus', 18)} Thêm người được đón</button>

      <div class="section-label">Uỷ quyền đón một lần</div>
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Hôm nay bận, nhờ người khác đón hộ thì khai ở đây. <b>Nên kèm ảnh</b> — cô ở cổng
          chưa gặp người đó bao giờ, không có ảnh thì cô chỉ còn cách gọi điện cho gia đình.
        </div>
        <button class="btn primary block mt-14" id="dt-uy">${UI.icon('plus', 18)} Uỷ quyền một lần</button>
      </div>
      ${conHieuLuc.map(u => this.theUyQuyen(u, true)).join('')}
      ${daQua.length ? `<div class="section-label">Uỷ quyền đã qua</div>
        ${daQua.slice(0, 10).map(u => this.theUyQuyen(u, false)).join('')}` : ''}

      <div class="section-label">Sổ đón trả gần đây</div>
      ${(d.soGanDay || []).length ? `<div class="card">
        ${(d.soGanDay || []).map(g => `
          <div class="list-row"><div class="row-main">
            <div class="row-title">${UI.esc(UI.fmtDate(g.ngay))}${g.luc ? ` · ${UI.esc(g.luc)}` : ''}</div>
            <div class="row-sub">Trả cho ${UI.esc(g.nguoiDon)}${g.coGhiTen ? ` — ${UI.esc(g.coGhiTen)} ghi` : ''}</div>
            ${g.ghiChu ? `<div class="row-sub">${UI.esc(g.ghiChu)}</div>` : ''}
          </div></div>`).join('')}
      </div>` : UI.emptyState('📖', 'Chưa có ngày nào cô ghi sổ đón trả cho con.')}`;

    document.getElementById('dt-them').onclick = () => this.moNguoi(null);
    document.getElementById('dt-uy').onclick = () => this.moUyQuyen();
    for (const b of root.querySelectorAll('[data-sua]')) b.onclick = () => this.moNguoi(b.dataset.sua);
    for (const b of root.querySelectorAll('[data-ngung]')) b.onclick = () => this.doiDangDung(b.dataset.ngung);
    for (const b of root.querySelectorAll('[data-huy]')) b.onclick = () => this.huyUyQuyen(b.dataset.huy);
  },

  theUyQuyen(u, choHuy) {
    const [nhan, mau] = this.nhanTrangThai(u.trangThai);
    return `
      <div class="card">
        ${this.theNguoi(u, {
          phu: `${UI.fmtDate(u.tuNgay, { weekday: false })} – ${UI.fmtDate(u.denNgay, { weekday: false })}${u.lyDo ? ` · ${u.lyDo}` : ''}`,
          cuoi: UI.badge(nhan, mau),
        })}
        ${choHuy && u.trangThai !== 'da-huy'
          ? `<button class="btn danger-soft block mt-8" data-huy="${UI.esc(u.id)}">Huỷ uỷ quyền này</button>`
          : ''}
      </div>`;
  },

  // ---- Hộp thoại: người đón thường xuyên ----
  moNguoi(id) {
    const n = id ? (this._ho.nguoiThuongXuyen || []).find(x => x.id === id) : null;
    this._anhMoi = null;
    UI.modal(`
      <div class="field">
        <label>Họ và tên</label>
        <input id="dt-n-ten" value="${UI.esc(n ? n.hoTen : '')}" placeholder="Ví dụ: Nguyễn Thị Lan">
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Quan hệ với bé</label>
          <input id="dt-n-quanhe" value="${UI.esc(n ? n.quanHe : '')}" placeholder="Ví dụ: Bà ngoại">
        </div>
        <div class="field">
          <label>Số điện thoại</label>
          <input id="dt-n-dt" value="${UI.esc(n ? n.dienThoai : '')}" placeholder="Ví dụ: 0912345678">
        </div>
      </div>
      ${this.oAnh(n && n.anh)}
      <div class="field">
        <label>Ghi chú cho cô</label>
        <input id="dt-n-ghichu" value="${UI.esc(n ? n.ghiChu : '')}" placeholder="Ví dụ: chỉ đón vào thứ Sáu">
      </div>
      <button class="btn primary block" id="dt-n-luu">${UI.icon('check', 18)} Lưu</button>
    `, n ? 'Sửa người được đón' : 'Thêm người được đón');
    this.ganChonAnh();
    document.getElementById('dt-n-luu').onclick = () => this.luuNguoi(id);
  },

  async luuNguoi(id) {
    const body = {
      studentId: this._studentId,
      hoTen: document.getElementById('dt-n-ten').value.trim(),
      quanHe: document.getElementById('dt-n-quanhe').value.trim(),
      dienThoai: document.getElementById('dt-n-dt').value.trim(),
      ghiChu: document.getElementById('dt-n-ghichu').value.trim(),
    };
    if (this._anhMoi) body.anh = this._anhMoi;
    if (!body.hoTen) return UI.toast('Gia đình nhập họ tên người được đón giúp trường nhé', 'error');
    try {
      if (id) await API.put(`/api/dontra/nguoi/${encodeURIComponent(id)}`, body);
      else await API.post('/api/dontra/nguoi', body);
      UI.toast('Đã lưu', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async doiDangDung(id) {
    const n = (this._ho.nguoiThuongXuyen || []).find(x => x.id === id);
    if (!n) return;
    try {
      await API.put(`/api/dontra/nguoi/${encodeURIComponent(id)}`, { dangDung: !n.dangDung });
      UI.toast(n.dangDung ? 'Đã ngưng — cô sẽ không nhận người này ở cổng nữa' : 'Đã dùng lại', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Hộp thoại: uỷ quyền một lần ----
  moUyQuyen() {
    this._anhMoi = null;
    const homNay = UI.todayStr();
    UI.modal(`
      <div class="field">
        <label>Họ và tên người đón hộ</label>
        <input id="dt-u-ten" placeholder="Ví dụ: Trần Văn Nam">
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Quan hệ với gia đình</label>
          <input id="dt-u-quanhe" placeholder="Ví dụ: Bác hàng xóm">
        </div>
        <div class="field">
          <label>Số điện thoại</label>
          <input id="dt-u-dt" placeholder="Ví dụ: 0912345678">
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Đón từ ngày</label>
          <input type="date" id="dt-u-tu" value="${UI.esc(homNay)}" min="${UI.esc(homNay)}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="dt-u-den" value="${UI.esc(homNay)}" min="${UI.esc(homNay)}">
        </div>
      </div>
      ${this.oAnh(null)}
      <div class="field">
        <label>Lý do gửi cô</label>
        <input id="dt-u-lydo" placeholder="Ví dụ: bố mẹ đi công tác, nhờ bác hàng xóm đón">
      </div>
      <button class="btn primary block" id="dt-u-luu">${UI.icon('check', 18)} Gửi uỷ quyền</button>
    `, 'Uỷ quyền đón một lần');
    this.ganChonAnh();
    document.getElementById('dt-u-luu').onclick = () => this.luuUyQuyen();
  },

  async luuUyQuyen() {
    const body = {
      studentId: this._studentId,
      hoTen: document.getElementById('dt-u-ten').value.trim(),
      quanHe: document.getElementById('dt-u-quanhe').value.trim(),
      dienThoai: document.getElementById('dt-u-dt').value.trim(),
      tuNgay: document.getElementById('dt-u-tu').value,
      denNgay: document.getElementById('dt-u-den').value,
      lyDo: document.getElementById('dt-u-lydo').value.trim(),
    };
    if (this._anhMoi) body.anh = this._anhMoi;
    if (!body.hoTen) return UI.toast('Gia đình nhập họ tên người đón hộ giúp trường nhé', 'error');
    if (!this._anhMoi && !confirm(
      'Uỷ quyền này chưa có ảnh. Cô ở cổng chưa gặp người đó bao giờ nên sẽ phải gọi điện '
      + 'cho gia đình để xác nhận. Vẫn gửi chứ ạ?')) return;
    try {
      await API.post('/api/dontra/uyquyen', body);
      UI.toast('Đã gửi uỷ quyền tới cô', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async huyUyQuyen(id) {
    if (!confirm('Huỷ uỷ quyền này? Cô sẽ không trao bé cho người đó nữa.')) return;
    try {
      await API.post(`/api/dontra/uyquyen/${encodeURIComponent(id)}/huy`, {});
      UI.toast('Đã huỷ uỷ quyền', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Ảnh ----
  oAnh(anhCu) {
    return `
      <div class="field">
        <label>Ảnh khuôn mặt — để cô đối chiếu ở cổng</label>
        <div class="flex">
          <div id="dt-anh-xem" style="width:64px;height:64px;flex:none;border-radius:12px;
            background:var(--line);display:flex;align-items:center;justify-content:center;font-size:24px;
            overflow:hidden">${anhCu ? `<img src="/api/dontra/anh/${UI.esc(anhCu)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '👤'}</div>
          <input type="file" id="dt-anh" accept="image/*" style="flex:1;min-width:0">
        </div>
      </div>`;
  },

  ganChonAnh() {
    const o = document.getElementById('dt-anh');
    if (!o) return;
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        this._anhMoi = await UI.nenAnh(f, { canhToiDa: 640 });
        const xem = document.getElementById('dt-anh-xem');
        xem.innerHTML = `<img src="${this._anhMoi}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      } catch (err) {
        this._anhMoi = null;
        UI.toast(err.message || 'Không đọc được ảnh', 'error');
      }
    };
  },

  // Nén về ảnh vuông nhỏ trước khi gửi: đây là ảnh để nhận mặt, không phải ảnh
  // để in. Ảnh 5MB từ điện thoại gửi thẳng lên là gia đình ở mạng yếu chờ mãi
  // rồi bỏ cuộc.
  nenAnh(file, maxDim = 640, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được tệp ảnh'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Tệp này không phải ảnh, hoặc ảnh bị hỏng'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },
};
