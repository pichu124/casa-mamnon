// CAMBRIDGE & KẾT NỐI Ở NHÀ — màn hình.
//
// Gia đình chỉ ĐỌC, nên màn của họ là một trang tin đơn giản: lọc theo hai
// loại, mỗi bài một thẻ, ảnh to. Văn phòng thì có thêm nút soạn, và một dải
// nhắc phạm vi ngay trên hộp thoại soạn — gửi nhầm nhóm là lỗi không rút lại
// được khỏi điện thoại đã đọc.
App.views.cambridge = {
  _loai: '',
  _data: null,
  _anhMoi: null,

  laVanPhong() { return App.state.user.role === 'admin'; },

  // Danh sách tải theo từng trang. Máy chủ cắt cửa sổ SAU khi lọc quyền, nên
  // số bài nhận về đúng bằng số bài người này xem được: nhận đủ một trang
  // nghĩa là còn, nhận thiếu nghĩa là hết. Không cần thêm ô đếm nào trong câu
  // trả lời, và hình dạng câu trả lời không đổi.
  MOI_TRANG: 60,
  _daTai: [],
  _conNua: false,
  _loaiDaTai: null,

  async taiThem() {
    const q = [];
    if (this._loai) q.push(`loai=${encodeURIComponent(this._loai)}`);
    q.push(`bo=${this._daTai.length}`, `soLuong=${this.MOI_TRANG}`);
    const d = await API.get(`/api/cambridge?${q.join('&')}`);
    this._data = d;
    this._daTai = this._daTai.concat(d.bai || []);
    this._conNua = (d.bai || []).length >= this.MOI_TRANG;
  },

  async render(root) {
    // Đổi bộ lọc, hoặc vào lại màn này, thì tải lại từ trang một. Chỉ nút "xem
    // tờ cũ hơn" mới giữ phần đã tải.
    if (this._loai !== this._loaiDaTai || !this._giuTrang) {
      this._daTai = []; this._conNua = false; this._loaiDaTai = this._loai;
    }
    this._giuTrang = false;
    if (!this._daTai.length) await this.taiThem();
    const d = { ...this._data, bai: this._daTai };

    root.innerHTML = `
      ${UI.pageHeader('Cambridge & Kết nối ở nhà')}
      <div class="seg" id="cam-loc">
        <button class="${this._loai === '' ? 'active' : ''}" data-loai="">Tất cả</button>
        ${(d.loai || []).map(l => `<button class="${this._loai === l.ma ? 'active' : ''}" data-loai="${UI.esc(l.ma)}">${UI.esc(l.ten)}</button>`).join('')}
      </div>

      ${d.duocDang ? `<button class="btn primary block mb-8" id="cam-them">${UI.icon('plus', 18)} Soạn bài mới</button>` : ''}

      ${(d.bai || []).length
        ? (d.bai || []).map(b => this.theBai(b, d)).join('')
        : UI.emptyState('🎓', this.laVanPhong()
          ? 'Chưa có bài nào. Bấm "Soạn bài mới" để bắt đầu.'
          : 'Chưa có nội dung nào cho nhóm của con. Nhà trường đăng lên thì gia đình sẽ thấy ở đây.')}
      ${this._conNua ? `
        <button class="btn outline block mt-14" id="cam-cu-hon">
          ${UI.icon('plus', 16)} Xem tờ cũ hơn
        </button>` : ''}`;

    for (const b of document.getElementById('cam-loc').querySelectorAll('button')) {
      b.onclick = () => { this._loai = b.dataset.loai; App.route(); };
    }
    const them = document.getElementById('cam-them');
    if (them) them.onclick = () => this.moSoan(null);
    const cuHon = document.getElementById('cam-cu-hon');
    if (cuHon) {
      cuHon.onclick = async () => {
        cuHon.disabled = true;
        cuHon.textContent = 'Đang tải…';
        try { await this.taiThem(); this._giuTrang = true; App.route(); }
        catch (err) { cuHon.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
    for (const b of root.querySelectorAll('[data-sua]')) b.onclick = () => this.moSoan(b.dataset.sua);
    for (const b of root.querySelectorAll('[data-cong-bo]')) b.onclick = () => this.congBo(b.dataset.congBo);
    for (const b of root.querySelectorAll('[data-thu-hoi]')) b.onclick = () => this.thuHoi(b.dataset.thuHoi);
  },

  nhanPhamVi(b) {
    if (b.phamVi === 'nhom') return `Nhóm ${b.tenNhom || ''}`.trim();
    if (b.phamVi === 'coso') return `Cơ sở ${b.tenCoSo || ''}`.trim();
    return 'Cả trường';
  },

  theBai(b, d) {
    const tenLoai = ((d.loai || []).find(l => l.ma === b.loai) || {}).ten || '';
    return `
      <div class="card">
        <div class="card-title">${UI.esc(b.tieuDe)}
          <span class="spacer"></span>
          ${UI.badge(tenLoai, b.loai === 'ket-noi' ? 'green' : 'blue')}
        </div>
        <div class="muted small" style="line-height:1.6;margin-bottom:8px">
          ${UI.esc(this.nhanPhamVi(b))}
          ${b.tuan ? ` · tuần từ ${UI.esc(UI.fmtDate(b.tuan, { weekday: false }))}` : ''}
          ${b.nguoiDangTen ? ` · ${UI.esc(b.nguoiDangTen)}` : ''}
          ${this.laVanPhong() ? (b.daCongBo ? ` · ${UI.badge('Đã gửi gia đình', 'green')}` : ` · ${UI.badge('Nháp — gia đình chưa đọc được', 'orange')}`) : ''}
        </div>

        ${b.noiDung ? `<div style="line-height:1.7;white-space:pre-wrap">${UI.esc(b.noiDung)}</div>` : ''}

        ${b.nhacAnhTamAn ? `
          <div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--warning);padding-left:10px">
            ${UI.esc(b.nhacAnhTamAn)}
          </div>` : ''}

        ${(b.anh || []).length ? `
          <div class="grid-2 mt-8">
            ${(b.anh || []).map(f => `
              <img src="/api/cambridge/anh/${UI.esc(f)}" alt=""
                style="width:100%;border-radius:12px;object-fit:cover;background:var(--line)">`).join('')}
          </div>` : ''}

        ${d.duocDang ? `
          <div class="grid-2 mt-14">
            <button class="btn outline" data-sua="${UI.esc(b.id)}">${UI.icon('edit', 16)} Sửa</button>
            ${b.daCongBo
              ? `<button class="btn danger-soft" data-thu-hoi="${UI.esc(b.id)}">Thu hồi</button>`
              : `<button class="btn success-soft" data-cong-bo="${UI.esc(b.id)}">${UI.icon('send', 16)} Gửi tới gia đình</button>`}
          </div>` : ''}
      </div>`;
  },

  moSoan(id) {
    const d = this._data;
    const b = id ? (d.bai || []).find(x => x.id === id) : null;
    this._anhMoi = null;
    UI.modal(`
      <div class="field">
        <label>Loại bài</label>
        <select id="cam-loai">
          ${(d.loai || []).map(l => `<option value="${UI.esc(l.ma)}" ${b && b.loai === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Tiêu đề</label>
        <input id="cam-tieude" value="${UI.esc(b ? b.tieuDe : '')}" placeholder="Ví dụ: Tuần này nhóm mình tìm hiểu chủ điểm Animals">
      </div>
      <div class="field">
        <label>Nội dung</label>
        <textarea id="cam-noidung" rows="6" placeholder="Viết cho gia đình đọc trên điện thoại buổi tối.">${UI.esc(b ? b.noiDung : '')}</textarea>
      </div>
      <div class="field">
        <label>Gửi cho ai</label>
        <select id="cam-phamvi">
          <option value="truong" ${b && b.phamVi === 'truong' ? 'selected' : ''}>Cả trường</option>
          <option value="coso" ${b && b.phamVi === 'coso' ? 'selected' : ''}>Một cơ sở</option>
          <option value="nhom" ${b && b.phamVi === 'nhom' ? 'selected' : ''}>Một nhóm</option>
        </select>
        <div class="hint">Gửi nhầm nhóm là thư rác với những gia đình còn lại, mà thư rác thì
          làm gia đình ngừng đọc cả những thông báo quan trọng. Chọn kỹ giúp trường nhé.</div>
      </div>
      <div class="field" id="cam-o-coso" style="display:none">
        <label>Cơ sở</label>
        <select id="cam-coso">
          ${(d.coSo || []).map(c => `<option value="${UI.esc(c.id)}" ${b && b.campusId === c.id ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="cam-o-nhom" style="display:none">
        <label>Nhóm</label>
        <select id="cam-nhom">
          ${(d.nhom || []).map(c => `<option value="${UI.esc(c.id)}" ${b && b.classId === c.id ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Gắn vào tuần (không bắt buộc)</label>
        <input type="date" id="cam-tuan" value="${UI.esc(b ? b.tuan : '')}">
      </div>
      <div class="field">
        <label>Ảnh (không bắt buộc, tối đa 6)</label>
        <input type="file" id="cam-anh" accept="image/*" multiple>
        <div class="hint" id="cam-anh-nhac">${b && (b.anh || []).length
          ? `Bài đang có ${b.anh.length} ảnh. Chọn ảnh mới sẽ THAY toàn bộ số ảnh cũ.`
          : 'Chọn nhiều ảnh một lần cũng được.'}</div>
      </div>
      <div class="field">
        <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
          <input type="checkbox" id="cam-khong-co-be" style="margin-top:3px" ${b && b.anhCoMatBe === false ? 'checked' : ''}>
          <span class="small">Ảnh <b>không có mặt bé nào</b> — chỉ giáo cụ, sách, tranh chủ điểm</span>
        </label>
        <div class="hint">Mặc định app coi như ảnh <b>có</b> mặt bé, và giữ ảnh lại với gia đình
          khi trong phạm vi bài có nhà chưa đồng ý cho ảnh của con hiện với các nhà khác.
          Tích ô này khi chắc chắn trong hình không có bé nào thì ảnh hiện với mọi gia đình.
          Không chắc thì đừng tích — ảnh có mặt bé nên đưa vào <b>Album ảnh</b>, nơi cô đánh dấu
          được bé nào có trong từng tấm.</div>
      </div>
      <button class="btn primary block" id="cam-luu">${UI.icon('check', 18)} Lưu nháp</button>
      <div class="muted small center mt-8">Lưu xong bài vẫn là nháp — gia đình chỉ đọc được sau khi bấm "Gửi tới gia đình".</div>
    `, id ? 'Sửa bài đăng' : 'Soạn bài mới');

    const oPham = document.getElementById('cam-phamvi');
    const hien = () => {
      document.getElementById('cam-o-coso').style.display = oPham.value === 'coso' ? '' : 'none';
      document.getElementById('cam-o-nhom').style.display = oPham.value === 'nhom' ? '' : 'none';
    };
    oPham.onchange = hien;
    hien();
    this.ganChonAnh();
    document.getElementById('cam-luu').onclick = () => this.luu(id);
  },

  async luu(id) {
    const phamVi = document.getElementById('cam-phamvi').value;
    const body = {
      loai: document.getElementById('cam-loai').value,
      tieuDe: document.getElementById('cam-tieude').value.trim(),
      noiDung: document.getElementById('cam-noidung').value.trim(),
      phamVi,
      tuan: document.getElementById('cam-tuan').value || '',
      anhCoMatBe: !document.getElementById('cam-khong-co-be').checked,
    };
    if (phamVi === 'coso') body.campusId = (document.getElementById('cam-coso') || {}).value || '';
    if (phamVi === 'nhom') body.classId = (document.getElementById('cam-nhom') || {}).value || '';
    if (this._anhMoi) body.anh = this._anhMoi;
    if (!body.tieuDe) return UI.toast('Cần một tiêu đề cho bài đăng', 'error');
    try {
      if (id) await API.put(`/api/cambridge/${encodeURIComponent(id)}`, body);
      else await API.post('/api/cambridge', body);
      UI.toast('Đã lưu nháp — gia đình chưa đọc được', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async congBo(id) {
    const b = (this._data.bai || []).find(x => x.id === id);
    if (b && !confirm(`Gửi bài "${b.tieuDe}" tới ${this.nhanPhamVi(b)}?`)) return;
    try {
      await API.post(`/api/cambridge/${encodeURIComponent(id)}/cong-bo`, {});
      UI.toast('Đã gửi tới gia đình', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async thuHoi(id) {
    try {
      await API.post(`/api/cambridge/${encodeURIComponent(id)}/thu-hoi`, {});
      UI.toast('Đã thu hồi — chữ đã viết vẫn còn nguyên', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  ganChonAnh() {
    const o = document.getElementById('cam-anh');
    if (!o) return;
    o.onchange = async () => {
      const fs = [...(o.files || [])].slice(0, 6);
      if (!fs.length) return;
      try {
        this._anhMoi = [];
        for (const f of fs) this._anhMoi.push(await UI.nenAnh(f, { canhToiDa: 1400 }));
        document.getElementById('cam-anh-nhac').textContent =
          `Đã chọn ${this._anhMoi.length} ảnh. Lưu xong sẽ thay toàn bộ ảnh cũ của bài.`;
      } catch (err) {
        this._anhMoi = null;
        UI.toast(err.message || 'Không đọc được ảnh', 'error');
      }
    };
  },
};
