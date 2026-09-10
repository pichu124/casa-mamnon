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
      ${this.khoiBlock(d)}

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
    const nutBlock = document.getElementById('cam-block-quan-ly');
    if (nutBlock) nutBlock.onclick = () => this.moBlock(null);
    for (const b of root.querySelectorAll('[data-sua-block]')) b.onclick = () => this.moBlock(b.dataset.suaBlock);
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

  // ---- Block của chương trình (Đ143) ----
  //
  // Gia đình chỉ nhận block đúng lứa của con (máy chủ đã lọc); cô và văn phòng
  // nhận đủ. Mục tiêu của block là thứ trường muốn gia đình đọc TRƯỚC khi đọc
  // từng tuần, nên nó đứng trên danh sách bài.
  khoiBlock(d) {
    const blocks = d.blocks || [];
    const con = d.luaTuoiCuaCon || [];
    const dongCon = con.length ? `
      <div class="muted small mb-8" style="line-height:1.6">
        ${con.map(c => `${UI.esc(c.ten)}: <b>${UI.esc(c.tenLuaTuoi || '')}</b>`).join(' · ')}
      </div>` : '';
    if (!blocks.length && !d.duocDang) return dongCon;
    return `
      ${dongCon}
      <div class="card">
        <div class="card-title">Block của chương trình
          <span class="spacer"></span>
          ${d.duocDang ? `<button class="btn outline sm" id="cam-block-quan-ly">${UI.icon('plus', 14)} Thêm block</button>` : ''}
        </div>
        ${blocks.length ? blocks.map(b => `
          <div class="list-row" style="align-items:flex-start">
            <div class="row-main">
              <div class="row-title">${UI.esc(b.ten)}
                ${b.luaTuoi ? UI.badge(this.tenLua(d, b.luaTuoi), 'blue') : ''}
              </div>
              <div class="row-sub">${b.tuNgay || b.denNgay
                ? `Áp dụng ${b.tuNgay ? `từ ${UI.esc(UI.fmtDate(b.tuNgay, { weekday: false }))}` : ''}${b.denNgay ? ` đến ${UI.esc(UI.fmtDate(b.denNgay, { weekday: false }))}` : ''}`
                : 'Chưa ghi thời gian áp dụng'}</div>
              ${b.mucTieu ? `<div class="small mt-8" style="line-height:1.6;white-space:pre-wrap">${UI.esc(b.mucTieu)}</div>` : ''}
            </div>
            ${d.duocDang ? `<button class="btn outline sm" data-sua-block="${UI.esc(b.id)}">${UI.icon('edit', 14)}</button>` : ''}
          </div>`).join('')
          : '<div class="muted small">Chưa có block nào. Bấm "Thêm block" để ghi mục tiêu và thời gian áp dụng.</div>'}
      </div>`;
  },

  tenLua(d, ma) {
    return ((d.luaTuoi || []).find(l => l.ma === ma) || {}).ten || ma;
  },

  // Năm ô nội dung theo mẫu trường gửi. Ô trống thì không vẽ — bài cũ chưa có
  // khung nhìn y như trước.
  theKhung(k) {
    if (!k) return '';
    const o = [
      ['Hoạt động', k.monHoc], ['Chủ đề', k.chuDe], ['Từ vựng', k.tuVung],
      ['Song / Chant', k.songChant], ['Kết nối ở nhà', k.ketNoiONha],
    ].filter(x => x[1]);
    if (!o.length) return '';
    return `
      <div class="mt-8" style="border-left:3px solid var(--primary);padding-left:10px">
        ${o.map(([ten, gt]) => `
          <div class="small" style="line-height:1.6;margin-bottom:6px">
            <b>${UI.esc(ten)}:</b> <span style="white-space:pre-wrap">${UI.esc(gt)}</span>
          </div>`).join('')}
      </div>`;
  },

  nhanKhung(b, d) {
    const k = b.khung;
    if (!k) return '';
    const phan = [];
    if (k.blockTen) phan.push(k.blockTen);
    if (k.tuanSo) phan.push(`Tuần ${k.tuanSo}`);
    if (k.luaTuoi) phan.push(this.tenLua(d, k.luaTuoi));
    return phan.length ? ` · ${UI.esc(phan.join(' · '))}` : '';
  },

  theTep(b) {
    const tep = b.tep || [];
    if (!tep.length) return '';
    return `
      <div class="mt-8">
        ${tep.map(t => `
          <a class="list-row" href="/api/cambridge/tep/${UI.esc(t.id)}" target="_blank" rel="noopener"
             style="text-decoration:none;color:inherit">
            <div class="row-icon" style="background:#eef2ff;font-size:18px">${t.loai === 'pdf' ? '📄' : '📝'}</div>
            <div class="row-main">
              <div class="row-title">${UI.esc(t.tenGoc)}</div>
              <div class="row-sub">${t.loai === 'pdf' ? 'PDF' : 'Word'} · ${this.kichCo(t.bytes)}</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </a>`).join('')}
      </div>`;
  },

  kichCo(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(n / 1024))} KB`;
  },

  moBlock(id) {
    const d = this._data || {};
    const b = id ? (d.blocks || []).find(x => x.id === id) : null;
    if (id && !b) return UI.toast('Chưa mở được block này — thử tải lại màn nhé', 'error');
    UI.modal(`
      <div class="field">
        <label>Tên block</label>
        <input id="cbl-ten" value="${UI.esc(b ? b.ten : '')}" placeholder="Ví dụ: Block 1">
      </div>
      <div class="field">
        <label>Lứa tuổi</label>
        <select id="cbl-lua">
          ${(d.luaTuoi || []).map(l => `<option value="${UI.esc(l.ma)}" ${b && b.luaTuoi === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
        </select>
        <div class="hint">Lớp Montessori trộn 3–5 tuổi, nhưng Cambridge chỉ có hai lứa. Chọn đúng lứa thì
          gia đình chỉ nhận đúng phần của con mình.</div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Áp dụng từ</label><input type="date" id="cbl-tu" value="${UI.esc(b ? b.tuNgay : '')}"></div>
        <div class="field"><label>Đến</label><input type="date" id="cbl-den" value="${UI.esc(b ? b.denNgay : '')}"></div>
      </div>
      <div class="field">
        <label>Mục tiêu của block</label>
        <textarea id="cbl-muc-tieu" rows="5" placeholder="Gia đình đọc phần này trước khi đọc từng tuần.">${UI.esc(b ? b.mucTieu : '')}</textarea>
      </div>
      <div class="field">
        <label>Thứ tự hiển thị</label>
        <input type="number" id="cbl-thu-tu" min="0" max="99" value="${UI.esc(String(b ? b.thuTu : (d.blocks || []).length + 1))}">
      </div>
      <button class="btn primary block" id="cbl-luu">${UI.icon('check', 18)} Lưu block</button>
    `, id ? 'Sửa block' : 'Thêm block');
    document.getElementById('cbl-luu').onclick = () => this.luuBlock(id);
  },

  async luuBlock(id) {
    const body = {
      ten: document.getElementById('cbl-ten').value.trim(),
      luaTuoi: document.getElementById('cbl-lua').value,
      tuNgay: document.getElementById('cbl-tu').value || '',
      denNgay: document.getElementById('cbl-den').value || '',
      mucTieu: document.getElementById('cbl-muc-tieu').value.trim(),
      thuTu: Number(document.getElementById('cbl-thu-tu').value) || 0,
    };
    if (!body.ten) return UI.toast('Cần tên block, ví dụ: Block 1', 'error');
    try {
      if (id) await API.put(`/api/cambridge/block/${encodeURIComponent(id)}`, body);
      else await API.post('/api/cambridge/block', body);
      UI.toast('Đã lưu block', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
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
          ${b.tuan ? ` · tuần từ ${UI.esc(UI.fmtDate(b.tuan, { weekday: false }))}` : ''}${this.nhanKhung(b, d)}
          ${b.nguoiDangTen ? ` · ${UI.esc(b.nguoiDangTen)}` : ''}
          ${this.laVanPhong() ? (b.daCongBo ? ` · ${UI.badge('Đã gửi gia đình', 'green')}` : ` · ${UI.badge('Nháp — gia đình chưa đọc được', 'orange')}`) : ''}
        </div>

        ${b.noiDung ? `<div style="line-height:1.7;white-space:pre-wrap">${UI.esc(b.noiDung)}</div>` : ''}
        ${this.theKhung(b.khung)}
        ${this.theTep(b)}

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
    const k = (b && b.khung) || {};
    // Bấm "Sửa" mà không tìm lại được bài (danh sách vừa vẽ lại, dữ liệu chưa
    // về kịp) thì trước đây hộp thoại mở ra TRẮNG TRƠN như soạn mới — cô gõ
    // đè rồi bấm Lưu là tạo một bài mới thay vì sửa bài cũ. Dừng và nói rõ.
    if (id && !b) {
      UI.toast('Chưa mở được bài này để sửa — cô thử tải lại danh sách nhé', 'error');
      return;
    }
    this._anhMoi = null;
    this._tepMoi = [];
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

      <div class="card-title mt-14">Khung Cambridge <span class="muted small" style="font-weight:400">(theo mẫu của trường)</span></div>
      <div class="grid-2">
        <div class="field">
          <label>Block</label>
          <select id="cam-block">
            <option value="">— Không gắn block —</option>
            ${(d.blocks || []).map(bl => `<option value="${UI.esc(bl.id)}" ${k.blockId === bl.id ? 'selected' : ''}>${UI.esc(bl.ten)}${bl.luaTuoi ? ` (${UI.esc(this.tenLua(d, bl.luaTuoi))})` : ''}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Tuần trong block</label>
          <input type="number" id="cam-tuan-so" min="0" max="52" value="${UI.esc(String(k.tuanSo || ''))}" placeholder="Ví dụ: 1">
        </div>
      </div>
      <div class="field">
        <label>Lứa tuổi</label>
        <select id="cam-lua">
          ${(d.luaTuoi || []).map(l => `<option value="${UI.esc(l.ma)}" ${k.luaTuoi === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
        </select>
        <div class="hint">Bài cho lứa 3–4 chỉ tới gia đình bé 3–4; bài cho cả hai lứa tới mọi nhà trong phạm vi.</div>
      </div>
      <div class="field"><label>Hoạt động (Cambridge)</label>
        <input id="cam-mon" value="${UI.esc(k.monHoc || '')}" placeholder="Ví dụ: Communication and Language / Mathematics / Let's Explore"></div>
      <div class="field"><label>Chủ đề</label>
        <input id="cam-chu-de" value="${UI.esc(k.chuDe || '')}" placeholder="Ví dụ: My school"></div>
      <div class="field"><label>Từ vựng</label>
        <textarea id="cam-tu-vung" rows="2" placeholder="Ví dụ: classroom, teacher, friend, book">${UI.esc(k.tuVung || '')}</textarea></div>
      <div class="field"><label>Song / Chant</label>
        <textarea id="cam-song" rows="2" placeholder="Ví dụ: If You're Happy and You Know It — kèm đường dẫn nếu có">${UI.esc(k.songChant || '')}</textarea></div>
      <div class="field"><label>Kết nối ở nhà</label>
        <textarea id="cam-ket-noi" rows="3" placeholder="Video, worksheet, việc gia đình làm cùng con tuần này">${UI.esc(k.ketNoiONha || '')}</textarea></div>

      <div class="field">
        <label>Tệp kèm bài (PDF, Word — tối đa 4)</label>
        ${(b && (b.tep || []).length) ? `
          <div id="cam-tep-da-co">
            ${(b.tep || []).map(t => `
              <div class="list-row">
                <div class="row-main"><div class="row-title">${UI.esc(t.tenGoc)}</div>
                  <div class="row-sub">${t.loai === 'pdf' ? 'PDF' : 'Word'} · ${this.kichCo(t.bytes)}</div></div>
                <button type="button" class="btn outline sm" data-xoa-tep="${UI.esc(t.id)}">${UI.icon('x', 14)}</button>
              </div>`).join('')}
          </div>` : ''}
        <input type="file" id="cam-tep" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple>
        <div class="hint" id="cam-tep-nhac">Worksheet, thư gửi gia đình, lời bài hát… Mỗi tệp tối đa 8 MB.</div>
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
    this.ganChonTep();
    for (const x of document.querySelectorAll('[data-xoa-tep]')) {
      x.onclick = () => this.xoaTep(id, x.dataset.xoaTep, x);
    }
    document.getElementById('cam-luu').onclick = () => this.luu(id);
  },

  // Đọc tệp PDF / Word thành data URL — không nén (đây không phải ảnh), chỉ
  // chặn sớm tệp quá nặng để cô khỏi chờ tải lên rồi mới bị từ chối.
  TRAN_TEP: 8 * 1024 * 1024,
  ganChonTep() {
    const o = document.getElementById('cam-tep');
    if (!o) return;
    o.onchange = async () => {
      const fs = [...(o.files || [])].slice(0, 4);
      this._tepMoi = [];
      for (const f of fs) {
        if (f.size > this.TRAN_TEP) {
          UI.toast(`"${f.name}" nặng quá — tối đa 8 MB mỗi tệp`, 'error');
          continue;
        }
        if (!/\.(pdf|docx)$/i.test(f.name)) {
          UI.toast(`Bỏ qua "${f.name}" — chỉ nhận PDF hoặc Word (.docx)`, 'error');
          continue;
        }
        try {
          const dataUrl = await new Promise((ok, that) => {
            const r = new FileReader();
            r.onload = () => ok(r.result);
            r.onerror = () => that(new Error('Không đọc được tệp'));
            r.readAsDataURL(f);
          });
          this._tepMoi.push({ ten: f.name, dataUrl });
        } catch (_) { UI.toast(`Không đọc được "${f.name}"`, 'error'); }
      }
      const nhac = document.getElementById('cam-tep-nhac');
      if (nhac) nhac.textContent = this._tepMoi.length
        ? `Đã chọn ${this._tepMoi.length} tệp: ${this._tepMoi.map(t => t.ten).join(', ')}. Lưu bài là tệp được gửi kèm.`
        : 'Worksheet, thư gửi gia đình, lời bài hát… Mỗi tệp tối đa 8 MB.';
    };
  },

  async xoaTep(baiId, tepId, nut) {
    if (!baiId) return;
    if (!confirm('Gỡ tệp này khỏi bài?')) return;
    try {
      await API.del(`/api/cambridge/${encodeURIComponent(baiId)}/tep/${encodeURIComponent(tepId)}`);
      const dong = nut.closest('.list-row');
      if (dong) dong.remove();
      UI.toast('Đã gỡ tệp', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
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
      khung: {
        blockId: (document.getElementById('cam-block') || {}).value || '',
        tuanSo: Number((document.getElementById('cam-tuan-so') || {}).value) || 0,
        luaTuoi: (document.getElementById('cam-lua') || {}).value || '',
        monHoc: (document.getElementById('cam-mon') || {}).value || '',
        chuDe: (document.getElementById('cam-chu-de') || {}).value || '',
        tuVung: (document.getElementById('cam-tu-vung') || {}).value || '',
        songChant: (document.getElementById('cam-song') || {}).value || '',
        ketNoiONha: (document.getElementById('cam-ket-noi') || {}).value || '',
      },
    };
    if (phamVi === 'coso') body.campusId = (document.getElementById('cam-coso') || {}).value || '';
    if (phamVi === 'nhom') body.classId = (document.getElementById('cam-nhom') || {}).value || '';
    if (this._anhMoi) body.anh = this._anhMoi;
    if (!body.tieuDe) return UI.toast('Cần một tiêu đề cho bài đăng', 'error');
    try {
      let baiId = id;
      if (id) await API.put(`/api/cambridge/${encodeURIComponent(id)}`, body);
      else baiId = (await API.post('/api/cambridge', body)).id;
      // Tệp gửi RIÊNG sau khi bài đã có mã, từng tệp một — thân yêu cầu của máy
      // chủ là 12 MB, hai tệp 8 MB cùng lượt là vỡ.
      for (const t of (this._tepMoi || [])) {
        try {
          await API.post(`/api/cambridge/${encodeURIComponent(baiId)}/tep`, { tep: [t] });
        } catch (err) { UI.toast(`Tệp "${t.ten}": ${err.message}`, 'error'); }
      }
      this._tepMoi = [];
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
