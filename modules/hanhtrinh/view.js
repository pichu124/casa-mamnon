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
      el.onclick = () => this.moGhi(null, { ghiNhanhId: el.dataset.tuGhinhanh, studentId: el.dataset.be });
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
      </div>`;
  },

  // ---- Hộp thoại: ghi một quan sát (lớp 1) ----
  moGhi(id, tu = {}) {
    this._anhMoi = null;
    const ds = (this._data || {}).danhSachBe || [];
    UI.modal(`
      <div class="field">
        <label>Quan sát về bé nào</label>
        <select id="ht-be">
          ${ds.map(b => `<option value="${UI.esc(b.id)}" ${tu.studentId === b.id ? 'selected' : ''}>${UI.esc(b.hoTen)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Cô đã thấy gì</label>
        <textarea id="ht-mota" rows="4"
          placeholder="Chỉ mô tả điều đã thấy, chưa cần nhận xét. Ví dụ: Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau."></textarea>
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
      </div>
      <button class="btn primary block" id="ht-luu">${UI.icon('check', 18)} Lưu quan sát</button>
    `, 'Ghi một quan sát');
    this.ganChonAnh();
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
  moCauChuyen(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
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
      <div class="grid-2">
        <button class="btn outline" id="ht-luu-nhap">Lưu nháp</button>
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
        UI.toast('Đã lưu nháp — gia đình chưa đọc được', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    document.getElementById('ht-cong-bo').onclick = async () => {
      try {
        await API.post(`/api/hanhtrinh/${encodeURIComponent(id)}/cong-bo`, doc());
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
    const nhom = App.state.classes || [];
    this._classId = this._classId || (App.state.user.classIds || [])[0] || (nhom[0] && nhom[0].id) || '';
    if (!this._classId) {
      than.innerHTML = UI.emptyState('🌱', 'Cô chưa phụ trách nhóm nào.');
      return;
    }
    const d = await API.get(`/api/hanhtrinh/chu-de?classId=${encodeURIComponent(this._classId)}`);
    const c = d.chuDe || {};

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
      <div class="card">
        <div class="card-title">Tuần từ ${UI.esc(UI.fmtDate(d.tuan, { weekday: false }))}</div>
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
  },

  async luuChuDe() {
    try {
      await API.put('/api/hanhtrinh/chu-de', {
        classId: this._classId,
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
      const r = await API.post('/api/hanhtrinh/chu-de/chep-tuan-truoc', { classId: this._classId });
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

    root.innerHTML = `
      ${UI.pageHeader('Hành trình học tập')}
      ${UI.studentBar()}${UI.thanhChonBe()}

      ${cd ? `
        <div class="card">
          <div class="card-title">Tuần này ở lớp: ${UI.esc(cd.chuDe)}</div>
          ${cd.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(cd.moTa)}</div>` : ''}
          ${cd.cungConONha ? `
            <div class="section-label">Cùng con ở nhà</div>
            <div class="small" style="line-height:1.6">${UI.esc(cd.cungConONha)}</div>
            <div class="muted small mt-8">Một lời rủ chơi 5–10 phút, đồ có sẵn trong nhà — không phải việc phải nộp lại cho cô.</div>` : ''}
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
        this._anhMoi = await this.nenAnh(f);
        document.getElementById('ht-anh-xem').innerHTML =
          `<img src="${this._anhMoi}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      } catch (err) {
        this._anhMoi = null;
        UI.toast(err.message || 'Không đọc được ảnh', 'error');
      }
    };
  },

  nenAnh(file, maxDim = 1280, quality = 0.82) {
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
