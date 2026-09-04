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

  // NGÀY KHÁC HÔM NAY THÌ CHỈ XEM LẠI (Đ127b).
  //
  // Cùng luật với sổ điểm danh, và cùng lý do — mạnh hơn: sổ này là dòng nói
  // trường đã trao đứa trẻ cho ai, và là chứng cứ duy nhất khi có tranh chấp.
  // Máy chủ giữ luật; màn hình chỉ cần đừng mời cô bấm vào thứ chắc chắn bị từ
  // chối, và nói rõ vì sao.
  ngayDaKhoa() {
    return this._ngay !== UI.todayStr();
  },

  theNgayDaKhoa() {
    if (!this.ngayDaKhoa()) return '';
    const mai = this._ngay > UI.todayStr();
    return `<div class="card" style="border-left:4px solid var(--line-strong)">
      <div class="card-title">${UI.icon('clock', 16)} ${mai ? 'Ngày này chưa tới' : 'Ngày này đã khoá'}</div>
      <div class="muted small" style="line-height:1.7">
        Sổ đón trả chỉ ghi và sửa được trong chính ngày hôm đó, nên ${mai
          ? 'ngày chưa tới thì chưa ghi được.'
          : 'ngày đã qua chỉ mở ra xem lại — đây là chỗ tra sau cùng khi cần biết hôm đó trường trao bé cho ai.'}
      </div>
    </div>`;
  },

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
  //
  // `opts.chon` (Đ126): ảnh trở thành NÚT — cô bấm vào mặt người đang đứng
  // trước cổng là hộp ghi mở ra với đúng người đó chọn sẵn. Vừa đối chiếu vừa
  // chọn trong một chạm; ô chọn trong hộp vẫn là nguồn sự thật, cô đổi được.
  theNguoi(n, opts = {}) {
    let anh = n.anh
      ? `<img src="/api/dontra/anh/${UI.esc(n.anh)}" alt=""
           style="width:64px;height:64px;flex:none;border-radius:12px;object-fit:cover;background:var(--line)">`
      : `<div style="width:64px;height:64px;flex:none;border-radius:12px;background:var(--line);
           display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>`;
    if (opts.chon && opts.be) {
      anh = `<button type="button" data-chon-nguoi="${UI.esc(opts.chon)}" data-be="${UI.esc(opts.be)}"
           title="Ghi: đã trả bé cho ${UI.esc(n.hoTen)}" aria-label="Ghi: đã trả bé cho ${UI.esc(n.hoTen)}"
           style="padding:0;border:0;background:none;width:64px;height:64px;flex:none;border-radius:12px;overflow:hidden;cursor:pointer">${anh}</button>`;
    }
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
  //
  // Từ Đ126 màn này có HAI lối vào cùng một mã: '#/dontra' (hàm này) và phần
  // "Trả bé" của màn Điểm danh (gọi `veTraBe` bên dưới). Phần thân — nạp nhóm,
  // vẽ danh sách, gắn sự kiện — tách thành ba hàm để không có bản chép nào
  // trôi khỏi nhau. Ở đây vẫn giữ ô ngày / ô nhóm của riêng nó: phân hệ phải
  // tự đứng được khi Điểm danh tắt (modules/README.md).
  async manCong(root) {
    // Nhóm của cô — trước đây ô chọn liệt kê nhóm của cả trường, bấm sang nhóm
    // không phụ trách là gặp màn "Có lỗi xảy ra" (403).
    const nhom = App.nhomCuaCo();
    this._classId = this._classId || (nhom[0] && nhom[0].id) || '';
    if (!this._classId) {
      root.innerHTML = UI.pageHeader('Đón trả bé')
        + UI.emptyState('🤝', 'Cô chưa phụ trách nhóm nào nên chưa có bé để trả.');
      return;
    }

    const d = await this.napNhom(this._classId, this._ngay);

    root.innerHTML = `
      ${UI.pageHeader('Đón trả bé')}
      <div class="card">
        <div class="grid-2">
          <div class="field" style="margin:0">
            <label>Ngày</label>
            <input type="date" id="dt-ngay" value="${UI.esc(this._ngay)}" max="${UI.esc(UI.todayStr())}">
            ${UI.dongNgayViet(this._ngay)}
          </div>
          ${nhom.length > 1 ? `
            <div class="field" style="margin:0">
              <label>Nhóm</label>
              <select id="dt-nhom">
                ${nhom.map(c => `<option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>
        <div class="muted small mt-8" id="dt-tong">${this.htmlTong(d)}</div>
        ${this.dongChiDuongDiemDanh()}
      </div>
      ${this.theNgayDaKhoa()}
      <div id="dt-so">${this.htmlDanhSachCong(d)}</div>`;

    document.getElementById('dt-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    const sel = document.getElementById('dt-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    const nutDD = root.querySelector('[data-mo-tra-be]');
    if (nutDD) nutDD.onclick = () => { location.hash = '#/attendance/tra'; };
    this.ganSuKienCong(root);
  },

  // Cô có Điểm danh đang bật thì sổ này cũng nằm trong đó (phần "Trả bé") —
  // chỉ đường, không ép. Văn phòng thì không: màn Điểm danh của văn phòng là
  // bảng rà soát, không có phần Trả bé.
  dongChiDuongDiemDanh() {
    if (App.state.user.role !== 'teacher' || !App.moduleEnabled('attendance')) return '';
    return `<button type="button" class="btn outline block mt-8" data-mo-tra-be>
      ${UI.icon('calendar', 16)} Sổ này cũng nằm trong Điểm danh → Trả bé</button>`;
  },

  async napNhom(classId, ngay) {
    this._classId = classId;
    this._ngay = ngay || UI.todayStr();
    const d = await API.get(
      `/api/dontra/nhom?classId=${encodeURIComponent(this._classId)}&ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;
    return d;
  },

  // Bé "nghỉ" ở màn cổng: có đơn nghỉ được duyệt, HOẶC (Đ126) sáng nay cô đã
  // chấm nghỉ ở Điểm danh — cả hai đều là "bé đang ở nhà", không phải việc chờ.
  laNghi(b) {
    if (b.nghiPhep) return true;
    const st = b._sang && b._sang.status;
    return st === 'absent_excused' || st === 'absent_unexcused';
  },

  // Dòng đếm tính từ danh sách đang cầm (không từ `tong` của máy chủ) để sau
  // khi ghi một bé tại chỗ, con số đổi theo mà không phải hỏi lại máy chủ.
  htmlTong(d) {
    const ds = (d && d.danhSach) || [];
    const soDaTra = ds.filter(b => b.daTra).length;
    const soNghi = ds.filter(b => !b.daTra && this.laNghi(b)).length;
    return `Đã trả ${UI.esc(String(soDaTra))} / ${UI.esc(String(ds.length))} bé.${
      soNghi ? ` ${UI.esc(String(soNghi))} bé nghỉ hôm nay.` : ''}`;
  },

  // Thứ tự thẻ ở cổng 16h30: bé CÒN Ở LỚP lên đầu (đó là việc còn lại của cô),
  // rồi bé đã trả, rồi bé nghỉ — trong mỗi nhóm giữ thứ tự tên máy chủ trả.
  xepThuTu(ds) {
    const bac = (b) => (b.daTra ? 1 : (this.laNghi(b) ? 2 : 0));
    return ds.map((b, i) => ({ b, i }))
      .sort((x, y) => (bac(x.b) - bac(y.b)) || (x.i - y.i))
      .map(x => x.b);
  },

  htmlDanhSachCong(d) {
    const ds = (d && d.danhSach) || [];
    if (!ds.length) return UI.emptyState('🤝', 'Nhóm này chưa có bé nào.');
    return this.xepThuTu(ds).map(b => this.theBeCong(b)).join('');
  },

  ganSuKienCong(root) {
    for (const b of root.querySelectorAll('[data-tra]')) {
      b.onclick = () => this.moTra(b.dataset.tra);
    }
    for (const b of root.querySelectorAll('[data-chon-nguoi]')) {
      b.onclick = () => this.moTra(b.dataset.be, b.dataset.chonNguoi);
    }
    for (const b of root.querySelectorAll('[data-anh-tra]')) {
      b.onclick = () => this.chonAnhTra(b.dataset.anhTra);
    }
    for (const b of root.querySelectorAll('[data-go-anh-tra]')) {
      b.onclick = () => this.goAnhTra(b.dataset.goAnhTra);
    }
  },

  // ---- Phần "Trả bé" của màn Điểm danh gọi vào đây (Đ126) ----
  //
  // ĐIỂM DANH GỌI HÀM NÀY — đổi chữ ký là đổi cả hai chỗ. `diemDanh` là Map
  // studentId → { status, checkIn, anhUrl } do Điểm danh dựng sẵn; phân hệ chỉ
  // VẼ thứ được đưa, không tự hỏi API Điểm danh, nên không dựa vào màn lõi
  // (tắt Điểm danh thì '#/dontra' vẫn nguyên). Vẽ vào `el` được đưa, không
  // vẽ tiêu đề / ô ngày / ô nhóm — những thứ đó là của màn gọi.
  async veTraBe(el, { classId, ngay, diemDanh } = {}) {
    if (!classId) {
      el.innerHTML = UI.emptyState('🤝', 'Cô chưa phụ trách nhóm nào nên chưa có bé để trả.');
      return;
    }
    const d = await this.napNhom(classId, ngay);
    if (diemDanh && typeof diemDanh.get === 'function') {
      for (const b of d.danhSach || []) b._sang = diemDanh.get(b.studentId) || null;
    }
    el.innerHTML = `
      <div class="card"><div class="muted small" id="dt-tong">${this.htmlTong(d)}</div></div>
      ${this.theNgayDaKhoa()}
      <div id="dt-so">${this.htmlDanhSachCong(d)}</div>`;
    this.ganSuKienCong(el);
  },

  // Vẽ lại ĐÚNG MỘT thẻ sau khi ghi / chụp / gỡ — không App.route().
  //
  // App.route() vẽ lại cả trang rồi cuộn về đầu: bé thứ 20 vừa ghi xong là cô
  // bị ném lên đầu danh sách, phải cuộn lại tìm bé — đúng lỗi Điểm danh đã vá
  // ở `veLaiDong`. Thẻ vẽ lại tại chỗ; thứ tự thẻ giữ nguyên tới lần mở sau
  // (bé vừa trả không nhảy xuống dưới ngay dưới tay cô).
  veLaiThe(studentId) {
    const b = ((this._data || {}).danhSach || []).find(x => x.studentId === studentId);
    const el = document.getElementById(`dt-the-${studentId}`);
    if (!b || !el) { App.route(); return; }
    el.outerHTML = this.theBeCong(b);
    const moi = document.getElementById(`dt-the-${studentId}`);
    if (moi) {
      this.ganSuKienCong(moi);
      try { moi.scrollIntoView({ block: 'nearest' }); } catch (_) { /* trình duyệt cũ */ }
    }
    const tong = document.getElementById('dt-tong');
    if (tong) tong.innerHTML = this.htmlTong(this._data);
  },

  // ---- Ảnh lúc trả bé (Đ125) — cùng ý với "Chụp ảnh con tới lớp" của Điểm danh ----
  //
  // Nút chụp chỉ hiện SAU khi đã ghi sổ: chụp là chụp khoảnh khắc trao bé,
  // không phải chụp một bé còn đang ở lớp. "Đã gửi", không phải "đã thấy" —
  // app không có đường nào biết gia đình đã mở ảnh ra xem.
  oAnhTra(b) {
    const khoa = this.ngayDaKhoa();
    if (b.anhTra && b.anhTra.file) {
      return `
        <div class="flex" style="align-items:center;gap:8px;margin-bottom:8px">
          <img src="/api/dontra/anh/${UI.esc(b.anhTra.file)}" alt="Ảnh ${UI.esc(b.hoTen)} lúc trả"
            style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:var(--line)">
          <span class="small" style="color:var(--success)">Ảnh lúc trả đã gửi cho gia đình</span>
          ${khoa ? '' : `<button class="btn sm outline" data-go-anh-tra="${UI.esc(b.studentId)}">Gỡ</button>`}
        </div>`;
    }
    if (khoa) return '';
    return `
      <button class="btn sm outline" style="margin-bottom:8px" data-anh-tra="${UI.esc(b.studentId)}">
        ${UI.icon('album', 14)} Chụp ảnh lúc trả bé
      </button>`;
  },

  chonAnhTra(studentId) {
    const o = document.createElement('input');
    o.type = 'file';
    o.accept = 'image/*';
    o.capture = 'environment';
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        const anh = await UI.nenAnh(f, { canhToiDa: 900, chatLuong: 0.72 });
        const r = await API.post('/api/dontra/anh-tra', { studentId, ngay: this._ngay, anh });
        UI.toast('Đã gửi ảnh lúc trả cho gia đình', 'success');
        this.capNhatAnhTra(studentId, r && r.file ? { file: r.file } : null);
      } catch (e) { UI.toast(e.message || 'Chưa gửi được ảnh', 'error'); }
    };
    o.click();
  },

  async goAnhTra(studentId) {
    try {
      await API.post('/api/dontra/anh-tra/go', { studentId, ngay: this._ngay });
      UI.toast('Đã gỡ ảnh', 'success');
      this.capNhatAnhTra(studentId, null);
    } catch (e) { UI.toast(e.message || 'Chưa gỡ được ảnh', 'error'); }
  },

  capNhatAnhTra(studentId, anhTra) {
    const b = ((this._data || {}).danhSach || []).find(x => x.studentId === studentId);
    if (!b) { App.route(); return; }
    b.anhTra = anhTra;
    this.veLaiThe(studentId);
  },

  // Gia đình bấm vào ảnh nhỏ thì xem to.
  xemAnhTra(file) {
    UI.modal(`<img src="/api/dontra/anh/${UI.esc(file)}" alt="" style="width:100%;border-radius:12px;display:block">`,
      'Ảnh lúc trả bé');
  },

  theBeCong(b) {
    const uy = b.uyQuyenHomNay || [];
    const het = b.uyQuyenKhongConHieuLuc || [];
    // BÉ ĐANG NGHỈ: nhãn "còn ở lớp" là nhãn SAI cho bé đang ở nhà.
    //
    // Cuối buổi chiều cô nhìn sổ đếm "còn mấy bé chưa ai đón". Một bé nghỉ đứng
    // đó với nhãn "còn ở lớp" là một việc chưa xong giả, và trong ca xấu nhất
    // là cô đi tìm một đứa trẻ không có ở trường. Nghỉ = có đơn được duyệt,
    // hoặc (Đ126) sáng nay cô đã chấm nghỉ ở Điểm danh.
    //
    // Nhãn của bé còn ở lớp là "Còn ở lớp" màu xám: đó là một sự thật về buổi
    // chiều đang diễn ra, không phải một việc trễ hạn — không cam, không đỏ.
    const nghi = this.laNghi(b);
    const chonBe = b.studentId;
    let nhan;
    if (b.daTra) nhan = UI.badge(`Đã trả${b.daTra.luc ? ` ${b.daTra.luc}` : ''}`, 'green');
    else if (nghi) nhan = UI.badge('Nghỉ hôm nay', 'gray');
    else nhan = UI.badge('Còn ở lớp', 'gray');
    return `
      <div class="card" id="dt-the-${UI.esc(b.studentId)}"${nghi && !b.daTra ? ' style="opacity:.75"' : ''}>
        <div class="list-row" style="border-bottom:none;padding-top:0">
          ${UI.avatar(b.avatar, 44)}
          <div class="row-main">
            <div class="row-title">${UI.esc(b.hoTen)}</div>
            ${this.dongSang(b)}
          </div>
          ${nhan}
        </div>

        ${nghi && !b.daTra ? `
          <div class="muted small" style="line-height:1.6;margin-bottom:8px">
            ${b.nghiPhep
              ? `Gia đình đã xin nghỉ hôm nay${b.nghiPhep.reason ? ` — ${UI.esc(b.nghiPhep.reason)}` : ''}.`
              : 'Cô đã chấm nghỉ ở phần Đón bé.'}
            Cô vẫn ghi được nếu bé có tới lớp.
          </div>` : ''}

        ${b.daTra ? `
          <div class="muted small" style="line-height:1.6;margin-bottom:8px">
            Đã trả cho <b>${UI.esc(b.daTra.nguoiDon)}</b>${b.daTra.coGhiTen ? ` — ${UI.esc(b.daTra.coGhiTen)} ghi` : ''}
            ${b.daTra.ghiChu ? `<div>${UI.esc(b.daTra.ghiChu)}</div>` : ''}
          </div>
          ${this.oAnhTra(b)}` : ''}

        ${uy.length ? `
          <div class="section-label">Hôm nay gia đình uỷ quyền</div>
          ${uy.map(u => this.theNguoi(u, {
            phu: `${UI.fmtDate(u.tuNgay, { weekday: false })} – ${UI.fmtDate(u.denNgay, { weekday: false })}${u.lyDo ? ` · ${u.lyDo}` : ''}`,
            chon: this.ngayDaKhoa() ? '' : `uy-quyen|${u.id}`, be: chonBe,
          })).join('')}` : ''}

        <div class="section-label">Người đón thường xuyên</div>
        ${(b.nguoiThuongXuyen || []).length
          ? (b.nguoiThuongXuyen || []).map(n => this.theNguoi(n, {
              chon: this.ngayDaKhoa() ? '' : `thuong-xuyen|${n.id}`, be: chonBe,
            })).join('')
          : `<div class="small" style="color:var(--danger);line-height:1.6">
               Gia đình chưa khai ai được đón bé. Cô nhắc gia đình vào mục Đón trả bé khai giúp trường nhé.
             </div>`}

        ${het.length ? `
          <details class="mt-8">
            <summary class="muted small" style="cursor:pointer;padding:6px 0">
              Uỷ quyền KHÔNG còn hiệu lực (${UI.esc(String(het.length))})
            </summary>
            <div class="muted small" style="margin:4px 0 6px">
              Nêu ở đây để nếu người này tới cổng thì cô biết vì sao app nói không, chứ không phải đoán.
            </div>
            ${het.map(u => {
              const [nhanUQ, mau] = this.nhanTrangThai(u.trangThai);
              return this.theNguoi(u, {
                phu: `${UI.fmtDate(u.tuNgay, { weekday: false })} – ${UI.fmtDate(u.denNgay, { weekday: false })}`,
                cuoi: UI.badge(nhanUQ, mau),
              });
            }).join('')}
          </details>` : ''}

        ${this.ngayDaKhoa() ? '' : `
        <button class="btn ${b.daTra ? 'outline' : 'primary'} block mt-14" data-tra="${UI.esc(b.studentId)}">
          ${UI.icon('check', 18)} ${b.daTra ? 'Sửa lại người đã đón' : 'Ghi: đã trả bé'}
        </button>`}
      </div>`;
  },

  // Dòng "Đón bé" (Đ126): trạng thái điểm danh + ảnh tới lớp thu nhỏ, chỉ khi
  // màn Điểm danh đưa sang. Mở từ '#/dontra' thì không có dòng này.
  //
  // KHÔNG viết "Sáng nay". Mầm non có bé học nửa buổi, vào lớp đầu giờ chiều —
  // dòng "Sáng nay: Có mặt · vào 13:55" tự nó nói ngược. "Đón bé" là tên đúng
  // của việc đó và cũng là tên phần bên cạnh, nên cô đọc là hiểu ngay.
  dongSang(b) {
    const sang = b._sang;
    if (!sang) return '';
    const st = sang.status && UI.ATT_STATUS[sang.status];
    const chu = st
      ? `${st.label}${sang.checkIn ? ` · vào ${sang.checkIn}` : ''}`
      : 'cô chưa chấm điểm danh';
    return `<div class="row-sub" style="display:flex;align-items:center;gap:6px;margin-top:2px">
      ${sang.anhUrl ? `<img src="${UI.esc(sang.anhUrl)}" alt="" style="width:28px;height:28px;flex:none;border-radius:8px;object-fit:cover;background:var(--line)">` : ''}
      <span${st ? ` style="color:${st.color}"` : ''}>Đón bé: ${UI.esc(chu)}</span>
    </div>`;
  },

  // `chonSan` (Đ126): 'thuong-xuyen|<id>' hoặc 'uy-quyen|<id>' khi cô bấm vào
  // ảnh một người đón — người đó được chọn sẵn, nếu còn trong danh sách chọn.
  moTra(studentId, chonSan) {
    const b = ((this._data || {}).danhSach || []).find(x => x.studentId === studentId);
    if (!b) return;
    const chon = [
      ...(b.nguoiThuongXuyen || []).map(n => ({ loai: 'thuong-xuyen', id: n.id, ten: `${n.hoTen}${n.quanHe ? ` (${n.quanHe})` : ''}` })),
      ...(b.uyQuyenHomNay || []).map(u => ({ loai: 'uy-quyen', id: u.id, ten: `${u.hoTen} — uỷ quyền hôm nay` })),
    ];
    const cu = b.daTra;
    const gio = (cu && cu.luc) || UI.gioVN();   // giờ Việt Nam, không phải giờ máy
    // Bản ghi cũ có thể trỏ tới người KHÔNG còn trong danh sách chọn: uỷ quyền
    // chỉ sống trong hôm đó, người thường xuyên thì gỡ được. Trước đây các
    // trường hợp ấy rơi im lặng về lựa chọn ĐẦU TIÊN — cô mở sổ ra chỉ để sửa
    // giờ đón, bấm Ghi, và tên người đón đổi theo mà không ai nhận ra. Máy chủ
    // nhận 'giu': giữ nguyên người như đã ghi.
    const cuMoCoi = !!cu && cu.nguonLoai !== 'khac' && !chon.some(c => c.id === cu.nguonId);
    this._daTra = cu || null;
    // Đúng MỘT lựa chọn mang `selected`: người cô vừa bấm ảnh; không thì như
    // đã ghi; chưa ghi thì trình duyệt lấy dòng đầu như trước.
    const chonHopLe = chonSan && chon.some(c => `${c.loai}|${c.id}` === chonSan) ? chonSan : '';
    const giaTriChon = chonHopLe
      || (cuMoCoi ? 'giu|' : (cu && cu.nguonLoai === 'khac') ? 'khac|' : (cu ? `${cu.nguonLoai}|${cu.nguonId}` : ''));
    const daChon = (v) => (v === giaTriChon ? 'selected' : '');

    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(b.avatar, 44)}
        <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div>
          <div class="row-sub">${UI.esc(UI.fmtDate(this._ngay))}</div></div>
      </div>
      <div class="field">
        <label>Người đón</label>
        <select id="dt-ai">
          ${cuMoCoi ? `<option value="giu|" ${daChon('giu|')}>Giữ như đã ghi — ${UI.esc(cu.nguoiDon)}</option>` : ''}
          ${chon.map(c => `<option value="${UI.esc(c.loai)}|${UI.esc(c.id)}"
            ${daChon(`${c.loai}|${c.id}`)}>${UI.esc(c.ten)}</option>`).join('')}
          <option value="khac|" ${daChon('khac|')}>Người khác — ghi rõ tên bên dưới</option>
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
    // 'giu' gửi kèm tên người đón đã ghi: máy chủ đời cũ (lùi bản để xử lý sự
    // cố) không biết 'giu', sẽ coi là 'khac' và cần một cái tên — có tên thì
    // vẫn ghi được, chỉ mất mối nối tới danh sách thường xuyên.
    const nguoiDon = nguonLoai === 'giu'
      ? ((this._daTra && this._daTra.nguoiDon) || '')
      : ((document.getElementById('dt-ten') || {}).value || '');
    try {
      const r = await API.post('/api/dontra/ghi', {
        studentId, ngay: this._ngay, nguonLoai, nguonId,
        nguoiDon: nguoiDon.trim(),
        luc: document.getElementById('dt-luc').value,
        ghiChu: document.getElementById('dt-ghichu').value.trim(),
      });
      UI.closeModal();
      this.capNhatDaTra(studentId, r);
      this.nhacChupAnhTra(studentId);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // GHI XONG THÌ CHỈ NGAY VÀO NÚT CHỤP (Đ126b).
  //
  // Nút "Chụp ảnh lúc trả bé" cố ý chỉ hiện SAU khi đã ghi sổ — chụp là chụp
  // khoảnh khắc trao bé, không phải chụp một bé còn đang ở lớp. Nhưng luật đó
  // khó đoán: cô mở màn ra, thấy thẻ bé chưa trả không có nút chụp nào, và kết
  // luận phần này chưa làm được ảnh. Người dùng thử app đã vấp đúng chỗ này.
  //
  // KHÔNG DÙNG HỘP THOẠI ĐỂ MỜI, dù đó là cách gọn nhất để viết.
  //
  // Bản đầu của Đ126b làm đúng vậy và `test:bien-soan-phan-he` bắt được ngay:
  // hộp thoại của app phủ kín màn hình và KHÔNG tự đóng khi người dùng bấm đi
  // màn khác (`App.route()` không đụng tới hộp thoại — đó là hành vi chung của
  // cả app, không sửa ở đây cho một lời mời). Cô ghi xong, bấm sang phần khác,
  // và gặp một lớp phủ chặn mọi thao tác cho tới khi tìm ra nút đóng.
  //
  // Nên chỉ tay thay vì chặn đường: một dòng nhắn, cuộn đúng nút chụp vào tầm
  // mắt và viền sáng nó vài giây. Cô bấm là máy ảnh mở ngay trong lần chạm đó.
  nhacChupAnhTra(studentId) {
    const b = ((this._data || {}).danhSach || []).find(x => x.studentId === studentId);
    if (!b) return;
    // Ngày đó đã có ảnh rồi (cô mở lại chỉ để sửa người đón): không nhắc nữa.
    if (b.anhTra && b.anhTra.file) { UI.toast('Đã ghi vào sổ đón trả', 'success'); return; }
    UI.toast('Đã ghi vào sổ. Chụp ảnh lúc trả bé ở nút ngay dưới nhé', 'success');
    const the = document.getElementById(`dt-the-${studentId}`);
    const nut = the && the.querySelector('[data-anh-tra]');
    if (!nut) return;
    try { nut.scrollIntoView({ block: 'center' }); } catch (_) { /* trình duyệt cũ */ }
    nut.style.outline = '2px solid var(--primary)';
    nut.style.outlineOffset = '2px';
    setTimeout(() => {
      // Thẻ có thể đã được vẽ lại trong lúc chờ — nút cũ lúc đó không còn trên
      // màn hình nữa, gỡ viền của nó cũng không hại gì.
      nut.style.outline = '';
      nut.style.outlineOffset = '';
    }, 4000);
  },

  // Ghi xong: cập nhật đúng thẻ đó tại chỗ (xem `veLaiThe`). Máy chủ trả về
  // đủ dòng vừa ghi (kèm tên cô), nên không cần hỏi lại cả nhóm.
  capNhatDaTra(studentId, r) {
    const b = ((this._data || {}).danhSach || []).find(x => x.studentId === studentId);
    if (!b || !r || !r.ok) { App.route(); return; }
    b.daTra = { ...(b.daTra || {}), ...r };
    this.veLaiThe(studentId);
  },

  // ================= Cho lịch tháng của màn Điểm danh (Đ126) =================
  //
  // ĐIỂM DANH GỌI BỐN HÀM NÀY — đổi chữ ký là đổi cả hai chỗ. Mọi thứ về sổ
  // trả bé của gia đình (đường API, hình dạng dòng, chữ) nằm ở đây; màn Điểm
  // danh chỉ hỏi "tháng này có gì" và "ngày này vẽ ra sao". Chỉ dữ liệu của
  // MỘT bé qua `canAccessStudent` — gia đình không có đường nào tới sổ nhóm.
  //
  // DỌN TRƯỚC KHI HỎI, KHÔNG PHẢI SAU KHI CÓ TRẢ LỜI.
  //
  // Bảng này nhớ sổ của MỘT bé. Nếu chỉ gán sau khi máy chủ trả lời thì lần
  // hỏi nào hỏng — mất sóng giữa chừng, 403, máy chủ đời cũ chưa có đường này
  // — bảng vẫn giữ nguyên sổ của bé TRƯỚC ĐÓ, và hộp chi tiết ngày của bé
  // đang xem hiện tên người đón của bé kia. Nhà hai con thấy sai ngay; máy
  // dùng chung ở văn phòng thì là dữ liệu của một nhà khác.
  //
  // Nên: xoá trước, hỏi sau. Hỏng thì là một bảng RỖNG — màn hình không hiện
  // gì cả, đúng như ngày chưa có ai ghi sổ; không bao giờ hiện của người khác.
  async napSoThang(studentId, thang) {
    this._soThang = new Map();
    const d = await API.get(
      `/api/dontra/so?studentId=${encodeURIComponent(studentId)}&thang=${encodeURIComponent(thang)}`);
    const theoNgay = new Map();
    for (const g of (d && d.so) || []) theoNgay.set(g.ngay, g);
    this._soThang = theoNgay;
    return theoNgay;
  },

  // Khối "Trả bé" của một ngày trong hộp chi tiết. Ngày không có dòng trả thì
  // trả '' — không khung xám, không chữ "chưa": cô ghi được hôm nào hay hôm ấy.
  htmlTraBeCuaNgay(ngay) {
    const g = this._soThang && this._soThang.get(ngay);
    if (!g) return '';
    return `
      <div class="section-label">Trả bé</div>
      <div class="list-row"><div class="row-main">
        <div class="row-title">Về với ${UI.esc(g.nguoiDon)}${g.luc ? ` lúc ${UI.esc(g.luc)}` : ''}</div>
        ${g.coGhiTen ? `<div class="row-sub">${UI.esc(g.coGhiTen)} ghi sổ</div>` : ''}
        ${g.ghiChu ? `<div class="row-sub">${UI.esc(g.ghiChu)}</div>` : ''}
      </div></div>
      ${g.anhTra ? `<div class="mt-8 center">
        <img src="/api/dontra/anh/${UI.esc(g.anhTra)}" alt="Ảnh lúc trả bé" style="max-width:100%;border-radius:12px">
      </div>` : ''}`;
  },

  // Một cụm ngắn cho danh sách "Bản ghi gần nhất": "về với Bà ngoại 16:35".
  chuTraBeNgan(ngay) {
    const g = this._soThang && this._soThang.get(ngay);
    if (!g) return '';
    return `về với ${g.nguoiDon}${g.luc ? ` ${g.luc}` : ''}`;
  },

  // Giờ trả bé của một ngày, để dòng "Giờ ra về" của Điểm danh không hiện "—"
  // ngay trên dòng "về với bà lúc 16:35".
  gioTraBe(ngay) {
    const g = this._soThang && this._soThang.get(ngay);
    return (g && g.luc) || '';
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
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}

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
          <div class="list-row">
            ${g.anhTra ? `<img src="/api/dontra/anh/${UI.esc(g.anhTra)}" alt="Ảnh lúc trả" class="clickable"
              style="width:54px;height:54px;flex:none;border-radius:10px;object-fit:cover;background:var(--line)"
              data-xem-anh="${UI.esc(g.anhTra)}">` : ''}
            <div class="row-main">
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
    for (const b of root.querySelectorAll('[data-xem-anh]')) b.onclick = () => this.xemAnhTra(b.dataset.xemAnh);
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
};
