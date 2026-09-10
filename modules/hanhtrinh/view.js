// HÀNH TRÌNH HỌC TẬP — màn hình.
//
// QUY TẮC 2 SỐNG Ở ĐÂY, KHÔNG PHẢI Ở MÁY CHỦ
//
// "Chưa quan sát thấy không phải là không làm được" là một quy tắc về CHỮ và
// MÀU trên màn hình. Máy chủ chỉ lưu một nhãn; chính chỗ này quyết định nhãn đó
// đọc lên thành một lời trấn an hay thành một ô đỏ. Nên trong tệp này:
//
//   • Không nhãn trạng thái nào dùng màu đỏ hay màu cảnh báo.
//   • Bé chưa có quan sát nào thì màn hình MỜI, không TRÁCH: "chưa có gì ở đây,
//     và không sao cả".
//   • Không đếm số quan sát của một bé ra màn hình, không thanh tiến độ, không
//     phần trăm, không xếp bé nào trên bé nào.
//   • Lời nhắc "mấy bé tuần này chưa có ghi chép" nói rõ nó là lời nhắc cho CÔ,
//     không phải nhận định về đứa trẻ.
App.views.hanhtrinh = {
  _tab: 'suyngam',
  _ngay: null,
  _classId: null,
  _data: null,
  _anhMoi: null,
  _batDauSuyNgam: null,

  // Màu của năm trạng thái. KHÔNG CÁI NÀO ĐỎ.
  //
  // "Chưa dạy" và "Chưa quan sát thấy" để màu xám trung tính — chúng là thông
  // tin về LỚP HỌC (chưa tới bài này, chưa có dịp thấy), không phải phán xét về
  // đứa trẻ. Một ô đỏ ở đây là cách nhanh nhất biến sổ quan sát thành sổ chê.
  MAU_TRANG_THAI: {
    'chua-day': 'gray',
    'chua-quan-sat-thay': 'gray',
    'dang-hinh-thanh': 'blue',
    'da-vung': 'green',
    'vuot-troi': 'green',
  },

  laGiaDinh() { return App.state.user.role === 'parent'; },

  ten(ds, ma) {
    const t = (ds || []).find(x => x.ma === ma);
    return t ? t.ten : '';
  },

  async render(root) {
    this._ngay = this._ngay || UI.todayStr();
    if (this.laGiaDinh()) return this.manGiaDinh(root);
    return this.manCoGiao(root);
  },

  // ================= Màn của CÔ =================
  async manCoGiao(root) {
    root.innerHTML = `
      ${UI.pageHeader('Hành trình học tập')}
      <div class="seg" id="ht-tabs">
        <button class="${this._tab === 'suyngam' ? 'active' : ''}" data-tab="suyngam">Suy ngẫm cuối ngày</button>
        <button class="${this._tab === 'chude' ? 'active' : ''}" data-tab="chude">Chủ đề tuần</button>
        <button class="${this._tab === 'be' ? 'active' : ''}" data-tab="be">Hành trình từng bé</button>
      </div>
      <div id="ht-than"><div class="loading">Đang tải</div></div>`;

    for (const b of document.getElementById('ht-tabs').querySelectorAll('button')) {
      b.onclick = () => { this._tab = b.dataset.tab; App.route(); };
    }
    const than = document.getElementById('ht-than');
    if (this._tab === 'chude') return this.manChuDe(than);
    if (this._tab === 'be') return this.manTungBe(than);
    return this.manSuyNgam(than);
  },

  // ---- Tab 1: suy ngẫm cuối ngày ----
  async manSuyNgam(than) {
    const d = await API.get(`/api/hanhtrinh/hom-nay?ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;
    const nhac = await API.get('/api/hanhtrinh/nhac-nhe').catch(() => ({ be: [] }));

    const chuaSuyNgam = (d.quanSat || []).filter(q => !q.daSuyNgam);

    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Ngày</label>
          <input type="date" id="ht-ngay" value="${UI.esc(this._ngay)}" max="${UI.esc(UI.todayStr())}">
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          Ghi lúc nào cũng được, gắn lĩnh vực lúc nào cũng được — <b>hai việc riêng nhau</b>.
          Một quan sát chỉ có mô tả đã là một quan sát hoàn chỉnh.
        </div>
      </div>

      <button class="btn primary block" id="ht-them">${UI.icon('plus', 18)} Ghi một quan sát</button>

      ${(d.ghiNhanhChuaDung || []).length ? `
        <div class="section-label">Ghi nhanh hôm nay chưa đưa vào hành trình</div>
        <div class="card">
          <div class="muted small mb-8">Cô bấm để chép sang thành một quan sát, khỏi gõ lại.</div>
          ${(d.ghiNhanhChuaDung || []).map(g => `
            <div class="list-row clickable" data-tu-ghinhanh="${UI.esc(g.id)}" data-be="${UI.esc(g.studentId)}">
              <div class="row-main">
                <div class="row-title">${UI.esc(this.tenBe(g.studentId))}</div>
                <div class="row-sub">${UI.esc(g.note || '(chỉ có ảnh)')}</div>
              </div>
              ${UI.icon('chevron', 18)}
            </div>`).join('')}
        </div>` : ''}

      <div class="section-label">Quan sát hôm đó${chuaSuyNgam.length ? ` · ${chuaSuyNgam.length} cái chưa suy ngẫm` : ''}</div>
      ${(d.quanSat || []).length
        ? (d.quanSat || []).map(q => this.theQuanSat(q)).join('')
        : UI.emptyState('🌱', 'Hôm đó chưa có quan sát nào. Ghi một dòng bất cứ lúc nào cô thấy điều đáng nhớ.')}

      ${(nhac.be || []).length ? `
        <div class="section-label">Nhắc nhẹ cho cô</div>
        <div class="card">
          <div class="muted small" style="line-height:1.6">
            Mấy bé sau <b>chưa có ghi chép nào của cô</b> trong ${UI.esc(String(nhac.soNgay))} ngày qua.
            Đây là lời nhắc cho cô về việc ghi chép, <b>không phải nhận định gì về bé</b> —
            bé vẫn học và chơi như mọi hôm, chỉ là chưa có khoảnh khắc nào được ghi lại.
          </div>
          <div class="flex mt-8" style="flex-wrap:wrap;gap:6px">
            ${(nhac.be || []).map(b => `<span class="badge gray">${UI.esc(b.hoTen)}</span>`).join('')}
          </div>
        </div>` : ''}`;

    document.getElementById('ht-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    document.getElementById('ht-them').onclick = () => this.moGhi(null);
    for (const el of than.querySelectorAll('[data-tu-ghinhanh]')) {
      el.onclick = () => {
        // Mang sẵn chữ và cờ "có ảnh" sang hộp thoại. Không mang thì cô bấm
        // "chép sang" rồi phải gõ lại từ đầu đúng câu mình vừa viết — nút đó
        // không giúp được gì cả.
        const g = (d.ghiNhanhChuaDung || []).find(x => x.id === el.dataset.tuGhinhanh) || {};
        this.moGhi(null, {
          ghiNhanhId: el.dataset.tuGhinhanh,
          studentId: el.dataset.be,
          moTa: g.note || '',
          coAnh: !!g.coAnh,
        });
      };
    }
    for (const el of than.querySelectorAll('[data-ghinham]')) {
      el.onclick = () => this.moGhiNham(el.dataset.ghinham);
    }
    for (const el of than.querySelectorAll('[data-suyngam]')) {
      el.onclick = () => this.moSuyNgam(el.dataset.suyngam);
    }
    for (const el of than.querySelectorAll('[data-cauchuyen]')) {
      el.onclick = () => this.moCauChuyen(el.dataset.cauchuyen);
    }
  },

  tenBe(id) {
    const b = ((this._data || {}).danhSachBe || []).find(x => x.id === id);
    return b ? b.hoTen : '';
  },

  theQuanSat(q) {
    const tt = q.trangThai
      ? UI.badge(this.ten(this._data.trangThai, q.trangThai), this.MAU_TRANG_THAI[q.trangThai] || 'gray')
      : '';
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          <div class="row-main">
            <div class="row-title">${UI.esc(q.hoTen || '')}</div>
            ${q.linhVuc ? `<div class="row-sub">${UI.esc(this.ten(this._data.linhVuc, q.linhVuc))}</div>` : ''}
          </div>
          ${tt}
          ${q.daCongBo ? UI.badge('Đã kể cho gia đình', 'green') : ''}
        </div>
        <div class="small" style="line-height:1.6;margin:2px 0 8px">${UI.esc(q.moTa || '')}</div>
        ${q.anh ? `
          <img src="/api/hanhtrinh/anh/${UI.esc(q.anh)}" alt=""
            style="width:100%;max-height:220px;border-radius:12px;object-fit:cover;background:var(--line);margin-bottom:8px">`
    : ''}
        ${q.oLopLamGi ? `<div class="muted small" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:8px">
          Ở lớp: ${UI.esc(q.oLopLamGi)}</div>` : ''}
        <div class="grid-2">
          <button class="btn outline" data-suyngam="${UI.esc(q.id)}">
            ${UI.icon('edit', 16)} ${q.daSuyNgam ? 'Sửa nhận định' : 'Suy ngẫm'}
          </button>
          <button class="btn ${q.daCongBo ? 'outline' : 'success-soft'}" data-cauchuyen="${UI.esc(q.id)}">
            ${UI.icon('send', 16)} ${q.daCongBo ? 'Sửa câu chuyện' : 'Kể cho gia đình'}
          </button>
        </div>
        ${q.cuaToi || App.state.user.role === 'admin' ? `
          <button class="btn danger-soft block" style="margin-top:8px" data-ghinham="${UI.esc(q.id)}">
            ${UI.icon('x', 16)} Ghi nhầm bé
          </button>` : ''}
      </div>`;
  },

  // ---- Hộp thoại: GHI NHẦM BÉ ----
  //
  // Hai đường ra, và đường CHUYỂN đứng trước đường XOÁ.
  //
  // Cú bấm nhầm thường gặp nhất là quên đổi tên bé trong ô chọn, và lúc đó việc
  // cô muốn làm là chuyển sang đúng bé — không phải gõ lại từ đầu. Xoá chỉ dành
  // cho bản ghi đúng là rác.
  moGhiNham(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    const ds = ((this._data || {}).danhSachBe || []).filter(b => b.id !== q.studentId);
    UI.modal(`
      <p class="muted small" style="line-height:1.7">Quan sát này đang nằm trong hành trình của
        <b>${UI.esc(q.hoTen || 'bé')}</b>.</p>
      <div class="field">
        <label>Chuyển sang bé khác</label>
        <select id="ht-nham-be">
          <option value="">— Chọn bé —</option>
          ${ds.map(b => `<option value="${UI.esc(b.id)}">${UI.esc(b.hoTen)}</option>`).join('')}
        </select>
        ${q.daCongBo ? `<div class="hint">Câu chuyện này đã kể cho gia đình rồi, nên khi chuyển
          sang bé khác app sẽ <b>thu lại</b> — cô kể lại nếu vẫn muốn.</div>` : ''}
      </div>
      <button class="btn primary block" id="ht-nham-chuyen">${UI.icon('check', 18)} Chuyển sang bé đã chọn</button>
      <p class="muted small center" style="margin:14px 0 8px">hoặc, nếu bản ghi này là ghi thừa</p>
      <button class="btn danger-soft block" id="ht-nham-xoa">Xoá hẳn quan sát này</button>
    `, 'Ghi nhầm bé');

    document.getElementById('ht-nham-chuyen').onclick = async () => {
      const be = document.getElementById('ht-nham-be').value;
      if (!be) return UI.toast('Cô chọn giúp bé đúng nhé', 'error');
      try {
        await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, { studentId: be });
        UI.toast('Đã chuyển sang đúng bé', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };

    document.getElementById('ht-nham-xoa').onclick = async () => {
      if (!confirm('Xoá hẳn quan sát này? Ảnh kèm theo cũng được dọn, và không lấy lại được.')) return;
      try {
        await API.del(`/api/hanhtrinh/${encodeURIComponent(id)}`);
        UI.toast('Đã xoá quan sát', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Hộp thoại: ghi một quan sát (lớp 1) ----
  //
  // DÒNG "— Chọn bé —" TRONG Ô CHỌN LÀ MỘT QUYẾT ĐỊNH, KHÔNG PHẢI BỎ QUÊN.
  //
  // Không có nó thì bé đầu danh sách luôn được chọn sẵn, và cô bấm Lưu mà quên
  // đổi tên bé là quan sát nằm vĩnh viễn trong hành trình của bé khác — kèm ảnh
  // của bé khác. Bắt chọn tường minh tốn của cô một thao tác; ghi nhầm tốn của
  // một đứa trẻ cả một trang hồ sơ.
  //
  // Chú thích này để ở đây, KHÔNG để trong chuỗi HTML: chú thích `<!-- -->` đi
  // thẳng ra trình duyệt, nên bộ canh QUY TẮC 2 đọc nó như chữ trên màn hình —
  // và nó đọc đúng.
  moGhi(id, tu = {}) {
    this._anhMoi = null;
    const ds = (this._data || {}).danhSachBe || [];
    UI.modal(`
      <div class="field">
        <label>Quan sát về bé nào</label>
        <select id="ht-be">
          <option value="">— Chọn bé —</option>
          ${ds.map(b => `<option value="${UI.esc(b.id)}" ${tu.studentId === b.id ? 'selected' : ''}>${
            UI.esc(b.hoTen)}${b.ngungHoSoHocTap ? ' — gia đình đã dừng hồ sơ học tập' : ''}</option>`).join('')}
        </select>
        ${ds.some(b => b.ngungHoSoHocTap) ? `
          <div class="hint">Vài bé trong nhóm có gia đình đã dừng phần hồ sơ học tập.
          Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường —
          chỉ phần quan sát học tập là ngưng ghi mới.</div>` : ''}
      </div>
      <div class="field">
        <label>Cô đã thấy gì</label>
        <textarea id="ht-mota" rows="4"
          placeholder="Chỉ mô tả điều đã thấy, chưa cần nhận xét. Ví dụ: Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau.">${UI.esc(tu.moTa || '')}</textarea>
        <div class="hint">Đây là ghi chép riêng của cô. Gia đình <b>không</b> đọc được phần này —
          chỉ đọc câu chuyện cô chủ động kể sau.</div>
      </div>
      <div class="field">
        <label>Ảnh (không bắt buộc)</label>
        <div class="flex">
          <div id="ht-anh-xem" style="width:64px;height:64px;flex:none;border-radius:12px;background:var(--line);
            display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden">🌱</div>
          <input type="file" id="ht-anh" accept="image/*" style="flex:1;min-width:0">
        </div>
        ${tu.coAnh ? `<div class="hint">Bản Ghi nhanh này có sẵn một tấm ảnh — cô không chọn ảnh
          mới thì app dùng luôn tấm đó.</div>` : ''}
      </div>
      <button class="btn primary block" id="ht-luu">${UI.icon('check', 18)} Lưu quan sát</button>
    `, 'Ghi một quan sát');
    this.ganChonAnh();

    // NÓI TRƯỚC KHI CÔ GÕ, KHÔNG PHẢI SAU KHI CÔ GÕ XONG.
    //
    // Máy chủ chặn đúng (Đ96), nhưng nó chỉ chặn lúc LƯU. Cô chọn bé, gõ trọn
    // một quan sát, bấm Lưu, rồi mới nhận 403 — mất cả đoạn vừa gõ và mất luôn
    // lòng tin vào màn hình. Cờ `ngungHoSoHocTap` đã đi kèm danh sách bé từ
    // Đ96; tới đợt này mới có ai đọc nó.
    const oBe = document.getElementById('ht-be');
    const nhac = () => {
      const be = ds.find(x => x.id === oBe.value);
      const cu = document.getElementById('ht-nhac-ngung');
      if (cu) cu.remove();
      if (!be || !be.ngungHoSoHocTap) return;
      oBe.closest('.field').insertAdjacentHTML('afterend', `
        <div class="card" id="ht-nhac-ngung" style="border-left:4px solid var(--warning)">
          <div class="small" style="line-height:1.7">
            Gia đình bé ${UI.esc(be.hoTen)} đã dừng phần hồ sơ học tập, nên quan sát mới
            sẽ không lưu được. Phần đã ghi vẫn giữ nguyên và cô xem lại được.
            Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.
          </div>
        </div>`);
    };
    oBe.onchange = nhac;
    nhac();

    document.getElementById('ht-luu').onclick = () => this.luuGhi(tu.ghiNhanhId || '');
  },

  async luuGhi(ghiNhanhId) {
    const body = {
      studentId: document.getElementById('ht-be').value,
      ngay: this._ngay,
      moTa: document.getElementById('ht-mota').value.trim(),
      ghiNhanhId,
    };
    if (this._anhMoi) body.anh = this._anhMoi;
    if (!body.studentId) return UI.toast('Cô chọn giúp quan sát này là về bé nào nhé', 'error');
    if (!body.moTa) return UI.toast('Cô mô tả giúp điều đã thấy ở bé nhé', 'error');
    try {
      await API.post('/api/hanhtrinh', body);
      UI.toast('Đã lưu quan sát', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Hộp thoại: suy ngẫm (lớp 2) ----
  moSuyNgam(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    // Đo chỉ tiêu "suy ngẫm một quan sát <= 3 phút" bằng số thật.
    this._batDauSuyNgam = Date.now();
    UI.modal(`
      <div class="small" style="line-height:1.6;margin-bottom:12px">
        <b>${UI.esc(q.hoTen || '')}</b> — ${UI.esc(q.moTa || '')}
      </div>
      <div class="field">
        <label>Lĩnh vực phát triển</label>
        <select id="ht-lv">
          <option value="">— chưa gắn —</option>
          ${(this._data.linhVuc || []).map(l => `<option value="${UI.esc(l.ma)}" ${q.linhVuc === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Cô thấy bé đang ở đâu</label>
        <select id="ht-tt">
          <option value="">— chưa chọn —</option>
          ${(this._data.trangThai || []).map(t => `<option value="${UI.esc(t.ma)}" ${q.trangThai === t.ma ? 'selected' : ''}>${UI.esc(t.ten)}</option>`).join('')}
        </select>
        <div class="hint">
          <b>"Chưa quan sát thấy" không phải là bé không làm được</b> — nó chỉ nói rằng
          cô chưa có dịp thấy. Chọn nó là bình thường, và nó không đi đâu ra khỏi màn hình này.
        </div>
      </div>
      <div class="field">
        <label>Minh chứng (không bắt buộc)</label>
        <input id="ht-mc" value="${UI.esc(q.minhChung || '')}" placeholder="Ví dụ: làm được ba lần trong tuần, không cần cô nhắc">
      </div>
      <div class="field">
        <label>Ở lớp cô làm gì tiếp</label>
        <input id="ht-olop" value="${UI.esc(q.oLopLamGi || '')}"
          placeholder="Ví dụ: đặt thêm bộ rót nước ở góc thực hành cho bé thử">
        <div class="hint">Bắt buộc khi cô chọn <i>Đang hình thành</i>, <i>Đã vững</i> hoặc <i>Vượt trội</i> —
          một nhận định không kèm việc làm được thì tháng sau đọc lại không dùng được vào đâu.</div>
      </div>
      <button class="btn primary block" id="ht-luu-sn">${UI.icon('check', 18)} Lưu nhận định</button>
    `, 'Suy ngẫm');
    document.getElementById('ht-luu-sn').onclick = () => this.luuSuyNgam(id);
  },

  async luuSuyNgam(id) {
    const giay = this._batDauSuyNgam ? (Date.now() - this._batDauSuyNgam) / 1000 : null;
    try {
      await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, {
        linhVuc: document.getElementById('ht-lv').value,
        trangThai: document.getElementById('ht-tt').value,
        minhChung: document.getElementById('ht-mc').value.trim(),
        oLopLamGi: document.getElementById('ht-olop').value.trim(),
        giaySuyNgam: giay,
      });
      UI.toast('Đã lưu nhận định', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Hộp thoại: câu chuyện cho gia đình (lớp 3) ----
  async moCauChuyen(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    // ALBUM ĐỂ LƯU ẢNH VỀ (Đ144). Chỉ hỏi khi quan sát CÓ ảnh và chưa về album
    // nào; danh sách là album của đúng nhóm bé, nhóm đang mở. Tải lỗi thì bỏ
    // qua ô này — kể chuyện vẫn phải làm được khi mạng chập chờn.
    let albums = [];
    if (q.anh && !q.daVeAlbum) {
      try {
        const be = (App.state.students || []).find(s => s.id === q.studentId) || {};
        albums = (await API.get('/api/albums') || [])
          .filter(a => a.classId === be.classId && !a.lopDaDong);
      } catch (_) { albums = []; }
    }
    UI.modal(`
      <div class="small" style="line-height:1.6;margin-bottom:12px">
        <b>${UI.esc(q.hoTen || '')}</b> — ${UI.esc(q.moTa || '')}
      </div>
      <div class="field">
        <label>Câu chuyện kể cho gia đình</label>
        <textarea id="ht-cc" rows="4" placeholder="Kể lại bằng lời của cô, cho bố mẹ đọc buổi tối.">${UI.esc(q.cauChuyen || '')}</textarea>
        <div class="hint">Phần này <b>chỉ công bố khi cô bấm nút</b>. Gõ dở để đó cũng không ai đọc được.</div>
      </div>
      <div class="field">
        <label>Cùng con ở nhà</label>
        <textarea id="ht-cn" rows="3" placeholder="Ví dụ: tối nay bố mẹ để con tự rót nước vào cốc — 5 phút, dùng luôn ca nước trên bàn.">${UI.esc(q.cungConONha || '')}</textarea>
        <div class="hint">5–10 phút, đồ có sẵn trong nhà, không cần màn hình.
          Đây là <b>lời rủ chơi</b> gửi gia đình, không phải việc phải nộp lại cho cô.</div>
      </div>
      ${q.daVeAlbum ? `<div class="hint mb-8">🖼️ Ảnh của quan sát này đã lưu về album <b>${UI.esc(q.daVeAlbum.title)}</b>.</div>` : ''}
      ${albums.length ? `
      <div class="field">
        <label>Lưu ảnh về album</label>
        <select id="ht-album">
          <option value="">Không lưu về album</option>
          ${albums.map(a => `<option value="${UI.esc(a.id)}">${UI.esc(a.title)}${a.cheDo === 'theo-the' ? ' (theo thẻ)' : ''}</option>`).join('')}
        </select>
        <div class="hint">Ảnh được chép sang album đã chọn và gắn thẻ bé, để gia đình về sau vào Album ảnh tìm lại cho tiện.</div>
      </div>` : ''}
      <div class="grid-2">
        <button class="btn outline" id="ht-luu-nhap">${q.daCongBo ? 'Lưu thay đổi' : 'Lưu nháp'}</button>
        <button class="btn success-soft" id="ht-cong-bo">${UI.icon('send', 16)} Kể cho gia đình</button>
      </div>
      ${q.daCongBo ? `<button class="btn danger-soft block mt-8" id="ht-thu-hoi">Thu hồi khỏi màn hình gia đình</button>` : ''}
    `, 'Câu chuyện cho gia đình');

    const doc = () => ({
      cauChuyen: document.getElementById('ht-cc').value.trim(),
      cungConONha: document.getElementById('ht-cn').value.trim(),
    });
    document.getElementById('ht-luu-nhap').onclick = async () => {
      try {
        await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, doc());
        // NÓI ĐÚNG SỰ THẬT. Bản đã công bố thì chữ vừa lưu đi THẲNG lên màn
        // hình gia đình — câu "gia đình chưa đọc được" ở đó là nói sai.
        UI.toast(q.daCongBo
          ? 'Đã lưu — gia đình thấy bản mới ngay'
          : 'Đã lưu nháp — gia đình chưa đọc được', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    document.getElementById('ht-cong-bo').onclick = async () => {
      try {
        const albumId = (document.getElementById('ht-album') || {}).value || '';
        await API.post(`/api/hanhtrinh/${encodeURIComponent(id)}/cong-bo`, { ...doc(), ...(albumId ? { albumId } : {}) });
        UI.toast('Đã gửi câu chuyện tới gia đình', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    const thu = document.getElementById('ht-thu-hoi');
    if (thu) thu.onclick = async () => {
      try {
        await API.post(`/api/hanhtrinh/${encodeURIComponent(id)}/thu-hoi`, {});
        UI.toast('Đã thu hồi — chữ cô viết vẫn còn nguyên', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Tab 2: chủ đề tuần ----
  async manChuDe(than) {
    // Nhóm của cô — xem chú thích ở `App.nhomCuaCo()`.
    const nhom = App.nhomCuaCo();
    this._classId = this._classId || (nhom[0] && nhom[0].id) || '';
    if (!this._classId) {
      than.innerHTML = UI.emptyState('🌱', 'Cô chưa phụ trách nhóm nào.');
      return;
    }
    // Tuần đang soạn. Mặc định là tuần này; cô chuyển sang tuần sau được.
    this._tuan = this._tuan || this.thuHaiCua(UI.todayStr());
    const d = await API.get(`/api/hanhtrinh/chu-de?classId=${encodeURIComponent(this._classId)}`
      + `&tuan=${encodeURIComponent(this._tuan)}`);
    const c = d.chuDe || {};
    const nhac = await this.nhacThuSau();

    than.innerHTML = `
      ${nhom.length > 1 ? `
        <div class="card">
          <div class="field" style="margin:0">
            <label>Nhóm</label>
            <select id="ht-nhom">
              ${nhom.map(x => `<option value="${UI.esc(x.id)}" ${x.id === this._classId ? 'selected' : ''}>${UI.esc(x.name)}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
      ${nhac}
      <div class="card">
        <div class="card-title">Tuần từ ${UI.esc(UI.fmtDate(d.tuan, { weekday: false }))}</div>
        ${this.oChonTuan()}
        <div class="field">
          <label>Chủ đề tuần</label>
          <input id="ht-cd-ten" value="${UI.esc(c.chuDe || '')}" placeholder="Ví dụ: Nước và những thứ nổi">
        </div>
        <div class="field">
          <label>Tuần này ở lớp có gì</label>
          <textarea id="ht-cd-mota" rows="3" placeholder="Vài dòng cho gia đình biết cả tuần lớp làm gì.">${UI.esc(c.moTa || '')}</textarea>
        </div>
        <div class="field">
          <label>Cùng con ở nhà tuần này</label>
          <textarea id="ht-cd-nha" rows="3" placeholder="Ví dụ: cho con thả thìa, nắp chai, lá cây vào chậu nước xem cái nào nổi.">${UI.esc(c.cungConONha || '')}</textarea>
          <div class="hint">5–10 phút, đồ trong nhà, không màn hình — và <b>không phải là bài tập</b>.</div>
        </div>
        <div class="grid-2">
          ${d.tuanTruoc && !d.chuDe
            ? `<button class="btn outline" id="ht-cd-chep">${UI.icon('plus', 16)} Chép tuần trước</button>`
            : '<span></span>'}
          <button class="btn primary" id="ht-cd-luu">${UI.icon('check', 18)} Lưu chủ đề</button>
        </div>
      </div>`;

    const sel = document.getElementById('ht-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    document.getElementById('ht-cd-luu').onclick = () => this.luuChuDe();
    const chep = document.getElementById('ht-cd-chep');
    if (chep) chep.onclick = () => this.chepTuanTruoc();
    for (const nut of than.querySelectorAll('[data-tuan]')) {
      nut.onclick = () => this.chonTuan(nut.getAttribute('data-tuan'));
    }
  },

  // ---- Tuần nào đang soạn ----
  //
  // VÌ SAO PHẢI CHỌN ĐƯỢC TUẦN
  //
  // Nếp của trường: thứ Sáu gửi thực đơn VÀ chủ đề học tập của tuần tới cho
  // gia đình. Nhưng màn này trước đây luôn soạn cho TUẦN ĐANG CHẠY — nghĩa là
  // thứ Sáu, đúng hôm phải soạn tuần sau, lại là hôm duy nhất không soạn được.
  // Cô chỉ còn cách chờ tới thứ Hai, mà thứ Hai thì gia đình đã cần biết rồi.
  //
  // Máy chủ vẫn nhận `tuan` từ đầu; chỗ thiếu nằm ở màn hình.
  thuHaiCua(ngayChuoi) {
    const d = UI.parseDate(ngayChuoi);
    if (!d) return '';
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // T2 = 0 … CN = 6
    return this.chuoiNgay(d);
  },

  themNgay(ngayChuoi, soNgay) {
    const d = UI.parseDate(ngayChuoi);
    if (!d) return '';
    d.setDate(d.getDate() + soNgay);
    return this.chuoiNgay(d);
  },

  chuoiNgay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      + `-${String(d.getDate()).padStart(2, '0')}`;
  },

  oChonTuan() {
    const nay = this.thuHaiCua(UI.todayStr());
    const sau = this.themNgay(nay, 7);
    const nut = (tuan, nhan) => `
      <button class="btn ${this._tuan === tuan ? 'primary' : 'outline'}" data-tuan="${UI.esc(tuan)}">
        ${UI.esc(nhan)}
      </button>`;
    return `<div class="grid-2" style="margin-bottom:12px">${nut(nay, 'Tuần này')}${nut(sau, 'Tuần sau')}</div>`;
  },

  chonTuan(tuan) {
    if (!tuan || tuan === this._tuan) return;
    this._tuan = tuan;
    App.route();
  },

  // NHẮC VÀO THỨ SÁU — nhắc, không chặn.
  //
  // Cùng cách làm với lời nhắc thực đơn ở màn Thực đơn: chặn không cho làm
  // việc khác cho tới khi soạn xong là biến một nếp tốt thành cái cửa khoá,
  // và thứ Sáu là hôm bận nhất.
  //
  // Chỉ hỏi máy chủ vào đúng thứ Sáu: ngày thường thì không tốn thêm lần gọi
  // nào, và cũng không có gì để nhắc.
  async nhacThuSau() {
    const homNay = UI.todayStr();
    const t = UI.parseDate(homNay);
    if (!t || t.getDay() !== 5) return '';
    const tuanSau = this.themNgay(this.thuHaiCua(homNay), 7);
    if (this._tuan === tuanSau) return '';
    const d = await API.get(`/api/hanhtrinh/chu-de?classId=${encodeURIComponent(this._classId)}`
      + `&tuan=${encodeURIComponent(tuanSau)}`).catch(() => null);
    if (!d || d.chuDe) return '';
    return `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="small" style="line-height:1.7">
          Hôm nay thứ Sáu, và <b>tuần sau chưa có chủ đề</b>. Nhà trường hẹn gửi
          chủ đề tuần tới cho gia đình vào hôm nay, cùng lúc với thực đơn.
        </div>
        <button class="btn outline block mt-8" data-tuan="${UI.esc(tuanSau)}">
          ${UI.icon('edit', 16)} Soạn chủ đề tuần sau
        </button>
      </div>`;
  },

  async luuChuDe() {
    try {
      await API.put('/api/hanhtrinh/chu-de', {
        classId: this._classId,
        tuan: this._tuan,
        chuDe: document.getElementById('ht-cd-ten').value.trim(),
        moTa: document.getElementById('ht-cd-mota').value.trim(),
        cungConONha: document.getElementById('ht-cd-nha').value.trim(),
      });
      UI.toast('Đã lưu chủ đề tuần', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async chepTuanTruoc() {
    try {
      const r = await API.post('/api/hanhtrinh/chu-de/chep-tuan-truoc',
        { classId: this._classId, tuan: this._tuan });
      UI.toast(`Đã chép chủ đề tuần ${UI.fmtDate(r.chepTu, { weekday: false })}`, 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Tab 3: hành trình từng bé ----
  async manTungBe(than) {
    const ds = (this._data && this._data.danhSachBe) || [];
    if (!ds.length) {
      const d = await API.get(`/api/hanhtrinh/hom-nay?ngay=${encodeURIComponent(this._ngay)}`);
      this._data = d;
    }
    const dsBe = (this._data.danhSachBe || []);
    if (!dsBe.length) { than.innerHTML = UI.emptyState('🌱', 'Chưa có bé nào.'); return; }
    this._beDangXem = this._beDangXem || dsBe[0].id;

    const d = await API.get(`/api/hanhtrinh?studentId=${encodeURIComponent(this._beDangXem)}`);
    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Xem hành trình của bé</label>
          <select id="ht-chon-be">
            ${dsBe.map(b => `<option value="${UI.esc(b.id)}" ${b.id === this._beDangXem ? 'selected' : ''}>${UI.esc(b.hoTen)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${(d.quanSat || []).length
        ? (d.quanSat || []).map(q => this.theDong(q, d)).join('')
        : UI.emptyState('🌱',
          'Chưa có quan sát nào về bé, và không sao cả — hành trình của mỗi bé bắt đầu từ dòng đầu tiên cô ghi.')}`;
    document.getElementById('ht-chon-be').onchange = (e) => { this._beDangXem = e.target.value; App.route(); };
  },

  theDong(q, d) {
    const tt = q.trangThai
      ? UI.badge(this.ten(d.trangThai, q.trangThai), this.MAU_TRANG_THAI[q.trangThai] || 'gray') : '';
    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(q.ngay))}
          <span class="spacer"></span>${tt}
          ${q.daCongBo ? UI.badge('Đã kể cho gia đình', 'green') : ''}
        </div>
        ${q.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(q.moTa)}</div>` : ''}
        ${q.linhVuc ? `<div class="muted small mt-8">${UI.esc(this.ten(d.linhVuc, q.linhVuc))}</div>` : ''}
        ${q.oLopLamGi ? `<div class="muted small" style="line-height:1.6">Ở lớp: ${UI.esc(q.oLopLamGi)}</div>` : ''}
        ${q.cauChuyen ? `<div class="mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(q.cauChuyen)}</div>` : ''}
      </div>`;
  },

  // ================= Màn của GIA ĐÌNH =================
  async manGiaDinh(root) {
    const be = App.currentStudent();
    if (!be) {
      root.innerHTML = UI.pageHeader('Hành trình học tập') + UI.emptyState('🌱', 'Chưa chọn bé.');
      return;
    }
    const d = await API.get(`/api/hanhtrinh?studentId=${encodeURIComponent(be.id)}`);
    const cd = d.chuDeTuan;
    // Tuần sau chỉ hiện khi cô đã soạn và khi nó KHÁC tuần này — không thì
    // gia đình đọc hai thẻ giống hệt nhau và không hiểu để làm gì.
    const cds = d.chuDeTuanSau && (!cd || d.chuDeTuanSau.id !== cd.id) ? d.chuDeTuanSau : null;

    root.innerHTML = `
      ${UI.pageHeader('Hành trình học tập')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}

      ${cd ? `
        <div class="card">
          <div class="card-title">Tuần này ở lớp: ${UI.esc(cd.chuDe)}</div>
          ${cd.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(cd.moTa)}</div>` : ''}
          ${cd.cungConONha ? `
            <div class="section-label">Cùng con ở nhà</div>
            <div class="small" style="line-height:1.6">${UI.esc(cd.cungConONha)}</div>
            <div class="muted small mt-8">Một lời rủ chơi 5–10 phút, đồ có sẵn trong nhà — không phải việc phải nộp lại cho cô.</div>` : ''}
        </div>` : ''}

      ${cds ? `
        <div class="card">
          <div class="card-title">Tuần sau ở lớp: ${UI.esc(cds.chuDe)}</div>
          ${cds.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(cds.moTa)}</div>` : ''}
          ${cds.cungConONha ? `
            <div class="section-label">Cùng con ở nhà</div>
            <div class="small" style="line-height:1.6">${UI.esc(cds.cungConONha)}</div>` : ''}
          <div class="muted small mt-8">Cô đã soạn sẵn cho tuần tới. Cuối tuần này nhà chơi trước cũng được.</div>
        </div>` : ''}

      <div class="section-label">Câu chuyện của con</div>
      ${(d.quanSat || []).length
        ? (d.quanSat || []).map(q => this.theCauChuyen(q)).join('')
        : UI.emptyState('🌱',
          'Chưa có câu chuyện nào — cô kể khi có khoảnh khắc đáng nhớ, thường vài tuần một lần chứ không phải mỗi ngày.')}`;
  },

  theCauChuyen(q) {
    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(q.ngay))}</div>
        <div style="line-height:1.7">${UI.esc(q.cauChuyen || '')}</div>
        ${q.cungConONha ? `
          <div class="section-label">Cùng con ở nhà</div>
          <div class="small" style="line-height:1.6">${UI.esc(q.cungConONha)}</div>` : ''}
      </div>`;
  },

  // ---- Ảnh ----
  ganChonAnh() {
    const o = document.getElementById('ht-anh');
    if (!o) return;
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        this._anhMoi = await UI.nenAnh(f);
        document.getElementById('ht-anh-xem').innerHTML =
          `<img src="${this._anhMoi}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      } catch (err) {
        this._anhMoi = null;
        UI.toast(err.message || 'Không đọc được ảnh', 'error');
      }
    };
  },
};
