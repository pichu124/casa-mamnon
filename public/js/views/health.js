// Phân hệ Sức khỏe của bé.
// Phụ huynh: xem hồ sơ sức khỏe của từng con. Cô: xem theo bé và thêm ghi nhận.
App.views.health = {
  TYPES: {
    checkup: { label: 'Khám định kỳ', cls: 'blue', emoji: '🩺', bg: '#e6efff' },
    vaccination: { label: 'Tiêm chủng', cls: 'green', emoji: '💉', bg: '#e3f7ec' },
    incident: { label: 'Sự cố y tế', cls: 'orange', emoji: '🩹', bg: '#fef0e0' },
  },
  _records: [],
  _sid: null,          // bé đang chọn (phía giáo viên)
  _newType: 'checkup', // loại ghi nhận đang chọn trong biểu mẫu
  _classId: null,      // nhóm đang xem bảng cân đo (Đ138)
  _thang: null,        // tháng đang xem (YYYY-MM)
  _dsBe: null,         // danh sách bé của nhóm đang xem, từ /api/health/nhom
  _beDangMo: null,     // đang mở hồ sơ chi tiết của một bé (từ bảng nhóm)

  async render(root) {
    const u = App.state.user;
    // Cô và văn phòng đi cùng một đường (Đ138): bảng cả nhóm → bấm một bé.
    // Văn phòng trước đây rơi vào nhánh gia đình và thấy "chưa có bé nào".
    if (u.role === 'teacher' || u.role === 'admin') {
      if (this._beDangMo) return this.renderBe(root);
      return this.renderNhom(root);
    }
    return this.renderParent(root);
  },

  // Nhóm mà người này xem được: cô — các nhóm mình phụ trách; văn phòng —
  // mọi nhóm trong cơ sở mình (Cấp 1: cả trường). Lọc theo cơ sở ngay trên
  // màn hình để ô chọn không mời bấm vào nhóm sẽ bị 403 (bài học Đ94).
  nhomCuaToi() {
    const u = App.state.user;
    if (u.role === 'teacher') return (u.nhomCuaCo || []).map(n => ({ id: n.id, name: n.name }));
    const coSo = u.coSo || null;
    return (App.state.classes || []).filter(c => !coSo || c.campusId === coSo).map(c => ({ id: c.id, name: c.name }));
  },

  // ---- Cô / văn phòng: BẢNG CÂN ĐO CẢ NHÓM THEO THÁNG (Đ138) ----
  //
  // Nhà trường 07/09: "để theo cấu trúc cơ sở → lớp, hiện một loạt danh sách
  // bé thể hiện cân nặng, chiều cao cả lớp, có ô tháng để xem lại; bấm vào
  // từng bạn để xem chi tiết". Mỗi dòng là con số của CHÍNH bé đó — không
  // trung bình nhóm, không xếp theo số đo, không đem bé đặt cạnh một cái
  // chuẩn nào theo tuổi (QUY TẮC 4).
  async renderNhom(root) {
    const dsNhom = this.nhomCuaToi();
    if (!dsNhom.some(n => n.id === this._classId)) this._classId = (dsNhom[0] || {}).id || null;
    if (!this._thang) this._thang = UI.thangVN();
    if (!this._classId) {
      root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('🎒', App.state.user.role === 'admin'
        ? 'Cơ sở chưa có nhóm lớp nào.' : 'Cô chưa phụ trách nhóm nào. Nhờ văn phòng phân công nhóm giúp cô nhé.');
      return;
    }
    let d;
    try {
      d = await API.get(`/api/health/nhom?classId=${encodeURIComponent(this._classId)}&thang=${encodeURIComponent(this._thang)}`);
    } catch (e) {
      root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('😥', e.message || 'Không tải được bảng cân đo');
      return;
    }
    this._dsBe = d.danhSach || [];
    const daDo = this._dsBe.filter(b => b.doTrongThang).length;
    const [nam, th] = String(d.thang).split('-');
    root.innerHTML = `
      ${UI.pageHeader('Sức khỏe của bé', { action: { id: 'btn-can-do-nhom', label: 'Nhập cân đo cả nhóm', icon: 'plus' } })}
      <div class="card">
        ${dsNhom.length > 1 ? `
          <div class="field">
            <label>Nhóm lớp</label>
            <select id="ht-nhom">
              ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this._classId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
            </select>
          </div>` : `<div class="row-sub" style="margin-bottom:8px">Nhóm ${UI.esc(d.className)}</div>`}
        <div class="field" style="margin-bottom:0">
          <label>Tháng xem cân đo</label>
          <input type="month" id="ht-thang" value="${UI.esc(d.thang)}" max="${UI.esc(UI.thangVN())}">
        </div>
        <div class="muted small mt-8">Tháng ${UI.esc(th)}/${UI.esc(nam)}: đã ghi cân đo cho ${daDo}/${this._dsBe.length} bé.</div>
      </div>
      <div class="card">
        ${this._dsBe.length ? this._dsBe.map(b => this.dongBe(b)).join('') : UI.emptyState('🎒', 'Nhóm chưa có bé nào')}
      </div>`;
    document.getElementById('btn-can-do-nhom').onclick = () => this.moCanDoNhom(d);
    const oNhom = document.getElementById('ht-nhom');
    if (oNhom) oNhom.onchange = () => { this._classId = oNhom.value; App.route(); };
    document.getElementById('ht-thang').onchange = (e) => { if (e.target.value) { this._thang = e.target.value; App.route(); } };
    for (const r of root.querySelectorAll('[data-mo-be]')) r.onclick = () => this.moBe(r.dataset.moBe);
  },

  // BMI — CON SỐ, VÀ CHỈ CON SỐ (Đ186).
  //
  // Nhà trường trả lời ngày 15/09, gọn đúng hai chữ: *"con số"*. Câu hỏi đặt ra
  // là trường cần con số hay cần chữ đánh giá thể trạng; chữ đánh giá thì đã
  // trả lời là không làm được, vì với trẻ 12 tháng – 6 tuổi nó chỉ có nghĩa khi
  // quy chiếu theo tuổi, mà quy chiếu theo tuổi chính là thứ QUY TẮC 4 cấm.
  //
  // Nên chỗ này làm đúng phần được duyệt và dừng lại ở đó:
  //
  //   - TÍNH Ở TẦNG HIỂN THỊ, không ở máy chủ. Không cột mới, không bảng mới,
  //     không ghi vào `bmiNote` — ô ấy vẫn là chữ do cô và y tế trường tự gõ.
  //     Một con số không lưu thì không bao giờ trở thành dữ liệu về đứa trẻ mà
  //     ai đó lọc, sắp xếp hay đem ra so.
  //   - KHÔNG kèm bất kỳ lời nào: không màu, không huy hiệu, không mũi tên lên
  //     xuống, không "so với lần trước". Con số đứng một mình.
  //   - Thiếu một trong hai số đo thì KHÔNG hiện gì cả, chứ không hiện số 0 —
  //     một ô trống là "chưa đo", còn số 0 trông như một kết quả.
  //
  // Bộ canh QUY TẮC 4 được siết thêm trong cùng đợt: mọi chữ mang nghĩa xếp
  // loại thể trạng nay là dấu hiệu bị bắt trên toàn kho mã.
  bmi(x) {
    if (!x) return null;
    const cao = Number(x.height), nang = Number(x.weight);
    if (!Number.isFinite(cao) || !Number.isFinite(nang)) return null;
    if (cao <= 0 || nang <= 0) return null;
    const m = cao / 100;
    const v = nang / (m * m);
    if (!Number.isFinite(v)) return null;
    return v.toFixed(1);
  },

  soDo(x) {
    if (!x) return '';
    const cao = x.height !== null && x.height !== undefined ? `${x.height} cm` : '';
    const nang = x.weight !== null && x.weight !== undefined ? `${x.weight} kg` : '';
    const chiSo = this.bmi(x);
    return [cao, nang, chiSo ? `BMI ${chiSo}` : ''].filter(Boolean).join(' · ');
  },

  // Một dòng bé trong bảng nhóm. "Tháng này chưa đo" là việc của người lớn
  // chưa làm — chữ xám, không đỏ, không hàm ý gì về bé.
  dongBe(b) {
    const tt = b.doTrongThang;
    const gn = b.doGanNhat;
    const dongThang = tt
      ? `<b>${UI.esc(this.soDo(tt))}</b> <span class="muted">· đo ngày ${UI.esc(UI.fmtDateShort(tt.date))}</span>`
      : '<span class="muted">Tháng này chưa đo</span>';
    const dongGan = gn && (!tt || gn.id !== tt.id)
      ? `<div class="row-sub">Lần gần nhất: ${UI.esc(this.soDo(gn))} (${UI.esc(UI.fmtDateShort(gn.date))})</div>` : '';
    return `
      <div class="list-row clickable" data-mo-be="${UI.esc(b.studentId)}">
        ${UI.avatar(b.avatar, 42)}
        <div class="row-main">
          <div class="row-title">${UI.esc(b.hoTen)}</div>
          <div class="row-sub">${dongThang}</div>
          ${dongGan}
        </div>
        <span class="muted">${UI.icon('chevron', 18)}</span>
      </div>`;
  },

  moBe(studentId) {
    this._beDangMo = studentId;
    this._sid = studentId;
    App.route();
  },

  // Hồ sơ chi tiết một bé, mở từ bảng nhóm. Có nút quay lại bảng.
  async renderBe(root) {
    const sid = this._beDangMo;
    const be = (this._dsBe || []).find(b => b.studentId === sid) || (App.state.students || []).find(s => s.id === sid) || null;
    let data;
    try { data = await API.get(`/api/health?studentId=${encodeURIComponent(sid)}`); }
    catch (e) { root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('😥', e.message || 'Không tải được hồ sơ'); return; }
    this._records = data.records;
    root.innerHTML = `
      ${UI.pageHeader('Sức khỏe của bé', { action: { id: 'btn-new-health', label: 'Thêm ghi nhận', icon: 'plus' } })}
      <button class="btn outline block" id="ht-ve-nhom" style="margin-bottom:12px">${UI.icon('chevron', 16)} Về bảng cả nhóm</button>
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding:0">
          ${UI.avatar(be ? (be.avatar || be.avatar) : null, 48)}
          <div class="row-main">
            <div class="row-title">${UI.esc(be ? (be.hoTen || be.name) : '')}</div>
            <div class="row-sub">${UI.esc(this.tuoiChu(be ? be.dob : ''))}</div>
          </div>
        </div>
      </div>
      ${this.latestCard(data.latestCheckup)}
      ${this.theLichSuCanDo(data.lichSuCanDo)}
      ${this.recordsHtml()}`;
    document.getElementById('btn-new-health').onclick = () => this.openCreate(sid);
    document.getElementById('ht-ve-nhom').onclick = () => { this._beDangMo = null; App.route(); };
  },

  tuoiChu(dob) {
    const th = this.thangTuoiTu(dob);
    if (th === null) return '';
    return th < 36 ? `${th} tháng` : `${Math.floor(th / 12)} tuổi ${th % 12} tháng`;
  },

  // Lịch sử cân đo (Đ138): từng lần một, mới nhất trước. Chỉ con số của lần
  // đó — không chênh lệch, không mũi tên lên xuống.
  theLichSuCanDo(ds) {
    if (!Array.isArray(ds) || ds.length < 2) return '';
    return `
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Các lần cân đo</div>
        ${ds.map(x => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(this.soDo(x) || '—')}</div>
              <div class="row-sub">${UI.esc(UI.fmtDate(x.date, { weekday: false }))}${x.title ? ` · ${UI.esc(x.title)}` : ''}</div>
            </div>
          </div>`).join('')}
      </div>`;
  },

  // Hộp NHẬP CÂN ĐO CẢ NHÓM (Đ138): mỗi bé một dòng hai ô, một nút Lưu.
  // Ô điền sẵn số đã ghi trong tháng (nếu có) để sửa được; để trống là bỏ qua bé đó.
  moCanDoNhom(d) {
    const ds = this._dsBe || [];
    if (!ds.length) return UI.toast('Nhóm chưa có bé nào', 'error');
    UI.modal(`
      <div class="field">
        <label>Ngày cân đo</label>
        <input type="date" id="ht-cd-ngay" value="${UI.esc(UI.todayStr())}" max="${UI.esc(UI.todayStr())}">
        <div class="hint">Bé nào để trống cả hai ô thì không ghi. Số đã có trong tháng được điền sẵn để cô sửa.</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 84px 84px;gap:6px;align-items:center;margin-bottom:6px" class="muted small">
        <span>Bé</span><span>Cao (cm)</span><span>Nặng (kg)</span>
      </div>
      ${ds.map(b => {
        const g = this.goiYCanDo(this.thangTuoiTu(b.dob));
        const tt = b.doTrongThang || {};
        return `
        <div style="display:grid;grid-template-columns:1fr 84px 84px;gap:6px;align-items:center;margin-bottom:8px">
          <div class="small" style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(b.hoTen)}</div>
          <input type="number" class="ht-cd" data-be="${UI.esc(b.studentId)}" data-cot="height" min="0" step="0.1" inputmode="decimal"
            value="${tt.height !== null && tt.height !== undefined ? UI.esc(String(tt.height)) : ''}" placeholder="${UI.esc(g.cao)}"
            style="border:1.5px solid var(--line);border-radius:10px;padding:9px 8px;min-width:0;min-height:40px">
          <input type="number" class="ht-cd" data-be="${UI.esc(b.studentId)}" data-cot="weight" min="0" step="0.1" inputmode="decimal"
            value="${tt.weight !== null && tt.weight !== undefined ? UI.esc(String(tt.weight)) : ''}" placeholder="${UI.esc(g.nang)}"
            style="border:1.5px solid var(--line);border-radius:10px;padding:9px 8px;min-width:0;min-height:40px">
        </div>`;
      }).join('')}
      <button class="btn primary block mt-8" id="ht-cd-luu">${UI.icon('check', 18)} Lưu cân đo cả nhóm</button>

      <div class="card-title mt-8">Hoặc làm bằng tệp</div>
      <div class="muted small" style="line-height:1.7">
        Hôm cân đo cả trường thì cô đứng ở phòng y tế với cái cân, không cầm điện thoại.
        Tải mẫu về, điền hai cột số, rồi nạp lại — <b>tên bé đã điền sẵn</b>, cô chỉ gõ số.
      </div>
      <div class="grid-2 mt-8">
        <a class="btn outline" id="ht-cd-mau" href="/api/health/mau-can-do.csv?classId=${UI.esc(d.classId)}">
          ${UI.icon('report', 16)} Tải mẫu về
        </a>
        <label class="btn outline" style="text-align:center;cursor:pointer;margin:0">
          ${UI.icon('plus', 16)} Nạp tệp đã điền
          <input type="file" id="ht-cd-tep" accept=".csv,text/csv" hidden>
        </label>
      </div>
    `, `Cân đo nhóm ${d.className}`);
    document.getElementById('ht-cd-luu').onclick = () => this.luuCanDoNhom();
    const oTep = document.getElementById('ht-cd-tep');
    if (oTep) oTep.onchange = () => this.napTepCanDo(oTep, d.classId);
  },

  // NẠP TỆP CÂN ĐO (Đ205, việc 11).
  //
  // Đọc tệp thành CHỮ ngay trên máy của cô rồi gửi lên — máy chủ nhận chuỗi
  // CSV chứ không nhận tệp nhị phân, cùng lối đường nhập danh sách bé đã dùng.
  // Tệp cân đo là chữ thuần, nên không có gì phải nén hay cắt nhỏ.
  async napTepCanDo(o, classId) {
    const f = o.files && o.files[0];
    if (!f) return;
    o.disabled = true;
    try {
      const text = await f.text();
      const kq = await API.post('/api/health/nap-can-do', { classId, text });
      UI.closeModal();
      const boQua = (kq.boQua || []).length;
      UI.toast(`Đã nạp cân đo cho ${kq.soBe} bé`
        + (boQua ? ` · ${boQua} bé để trống nên bỏ qua` : ''), 'success');
      App.route();
    } catch (err) {
      // Câu lỗi của máy chủ nói rõ DÒNG nào sai, nên hiện nguyên văn chứ không
      // rút gọn — cô cần biết mở tệp ra sửa dòng nào.
      UI.toast(err.message, 'error');
      o.disabled = false;
      o.value = '';
    }
  },

  async luuCanDoNhom() {
    const theoBe = new Map();
    for (const o of document.querySelectorAll('.ht-cd')) {
      const be = o.dataset.be;
      if (!theoBe.has(be)) theoBe.set(be, { studentId: be, height: '', weight: '' });
      theoBe.get(be)[o.dataset.cot] = o.value.trim();
    }
    const danhSach = [...theoBe.values()].filter(x => x.height !== '' || x.weight !== '');
    if (!danhSach.length) return UI.toast('Cô điền số đo cho ít nhất một bé nhé', 'error');
    try {
      const kq = await API.post('/api/health/can-do-nhom', {
        classId: this._classId, date: document.getElementById('ht-cd-ngay').value, danhSach,
      });
      UI.closeModal();
      UI.toast(`Đã ghi cân đo cho ${kq.soBe} bé${kq.daSua ? ` (sửa lại ${kq.daSua})` : ''}`, 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa lưu được', 'error'); }
  },

  thangTuoiTu(dob) {
    if (!dob) return null;
    const ns = UI.parseDate(dob);
    if (!ns || Number.isNaN(ns.getTime())) return null;
    const nay = UI.parseDate(UI.todayStr());
    let thang = (nay.getFullYear() - ns.getFullYear()) * 12 + (nay.getMonth() - ns.getMonth());
    if (nay.getDate() < ns.getDate()) thang -= 1;
    return thang >= 0 ? thang : null;
  },

  // ---- Phụ huynh: hồ sơ y tế của con đang chọn ----
  async renderParent(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Sức khỏe của bé') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const data = await API.get(`/api/health?studentId=${current.id}`);
    // Gia đình không còn đọc danh sách khám định kỳ / tiêm chủng (góp ý 20/10,
    // H1): số đo đã nằm ở hai thẻ trên. Chỉ giữ dòng SỰ CỐ Y TẾ — chuông "cô
    // ghi một sự cố y tế" dẫn về đúng màn này. API không đổi; chỉ màn này lọc.
    this._records = data.records.filter(r => r.type === 'incident');
    const coSoDo = !!data.latestCheckup;
    root.innerHTML = `
      ${UI.pageHeader('Sức khỏe của bé')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}
      ${this.latestCard(data.latestCheckup)}
      ${this.theLichSuCanDo(data.lichSuCanDo)}
      ${this._records.length || !coSoDo ? this.recordsHtml() : ''}`;
  },

  // (Màn "chọn bé trong ô chọn" của cô đã thay bằng bảng cả nhóm — Đ138.)
  changeStudent(id) {
    this._sid = id;
    App.route();
  },

  // ---- Thẻ chỉ số lần khám gần nhất ----
  latestCard(lc) {
    if (!lc) return '';
    return `
      <div class="card">
        <div class="card-title">${UI.icon('health', 19)} Chỉ số gần nhất</div>
        <div class="stat-row" style="margin-bottom:0">
          ${this.statBox(lc.height, 'cm', 'Chiều cao')}
          ${this.statBox(lc.weight, 'kg', 'Cân nặng')}
          ${this.bmi(lc) ? this.statBox(this.bmi(lc), '', 'BMI') : ''}
          ${this.statBox(lc.vision, '', 'Thị lực')}
        </div>
        <div class="muted small mt-8 flex">
          <span>Khám ngày ${UI.esc(UI.fmtDate(lc.date, { weekday: false }))}</span>
          ${
            // Huy hiệu TRUNG TÍNH: bmiNote là chữ cô/y tế tự ghi — "thiếu cân
            // so với tháng tuổi" mà khoác màu xanh "tốt" là màn hình nói ngược
            // với lời người ghi.
            lc.bmiNote ? UI.badge(lc.bmiNote, 'gray') : ''}
        </div>
      </div>`;
  },

  statBox(value, unit, label) {
    const has = value !== undefined && value !== null && value !== '';
    return `
      <div class="stat-box">
        <div class="stat-num">${has ? `${UI.esc(value)}${unit ? ` <span style="font-size:.82rem;font-weight:600">${UI.esc(unit)}</span>` : ''}` : '—'}</div>
        <div class="stat-label">${UI.esc(label)}</div>
      </div>`;
  },

  // ---- Danh sách hồ sơ ----
  recordsHtml() {
    if (!this._records.length) {
      return UI.emptyState('🩺', 'Chưa có ghi nhận y tế nào. Thật mừng vì con luôn khỏe mạnh!');
    }
    return `
      <div class="card">
        ${this._records.map(r => {
          const t = this.TYPES[r.type] || { label: r.type, cls: 'gray', emoji: '📋', bg: '#eef1f5' };
          return `
            <div class="list-row clickable" onclick="App.views.health.showDetail('${UI.esc(r.id)}')">
              <div class="row-icon" style="background:${UI.esc(t.bg)};font-size:21px">${t.emoji}</div>
              <div class="row-main">
                <div class="row-title">${UI.esc(r.title)}</div>
                <div class="row-sub">${UI.esc(UI.fmtDate(r.date))} · ${UI.esc(r.detail)}</div>
              </div>
              <div class="row-end">${UI.badge(t.label, t.cls)}</div>
            </div>`;
        }).join('')}
      </div>`;
  },

  showDetail(id) {
    const r = this._records.find(x => x.id === id);
    if (!r) return;
    const t = this.TYPES[r.type] || { label: r.type, cls: 'gray', emoji: '📋', bg: '#eef1f5' };
    UI.modal(`
      <div class="center">
        <div class="row-icon" style="background:${UI.esc(t.bg)};font-size:26px;width:56px;height:56px;margin:0 auto">${t.emoji}</div>
        <h3 class="mt-8">${UI.esc(r.title)}</h3>
        <div class="mt-8">${UI.badge(t.label, t.cls)}</div>
      </div>
      <div class="mt-14">
        ${infoRowHealth('Ngày ghi nhận', UI.fmtDate(r.date))}
        ${infoRowHealth('Nội dung chi tiết', r.detail)}
        ${r.height !== undefined && r.height !== null ? infoRowHealth('Chiều cao', `${r.height} cm`) : ''}
        ${r.weight !== undefined && r.weight !== null ? infoRowHealth('Cân nặng', `${r.weight} kg`) : ''}
        ${this.bmi(r) ? infoRowHealth('BMI', this.bmi(r)) : ''}
        ${r.vision ? infoRowHealth('Thị lực', r.vision) : ''}
        ${r.bmiNote ? infoRowHealth('Đánh giá thể trạng', r.bmiNote) : ''}
        ${r.daSua ? `<div class="muted small mt-8">Đã chỉnh sửa lúc ${UI.esc(UI.fmtTime(r.suaLuc))} ${UI.esc(UI.fmtDateShort(r.suaLuc))}</div>` : ''}
      </div>
      ${r.coTheSua ? `
        <div class="flex mt-14" style="gap:8px">
          <button class="btn outline" style="flex:1" onclick="App.views.health.openSua('${UI.esc(r.id)}')">Sửa lại</button>
          <button class="btn danger-soft" style="flex:1" onclick="App.views.health.hoiThuHoi('${UI.esc(r.id)}')">Thu hồi</button>
        </div>` : ''}`, 'Chi tiết ghi nhận y tế');
  },

  // GỢI Ý CÂN ĐO PHẢI ĐI THEO TUỔI THẬT CỦA BÉ.
  //
  // Hai ô này từng để sẵn gợi ý "VD: 105" cm và "VD: 17" kg — đúng cho bé 4–5
  // tuổi, sai hẳn với nhóm nhà trẻ 12–18 tháng (khoảng 76 cm, 10 kg) mà trường
  // đã có thật. CLAUDE.md nêu đúng chuyện này ngay dòng đầu là thứ cô và y tế
  // trường nhận ra ngay.
  //
  // ĐÂY LÀ CHỖ PHẢI CẨN THẬN VỚI QUY TẮC 4.
  //
  // Quy tắc cấm đem bé ra đặt cạnh một cái chuẩn theo tuổi — nên tôi CỐ Ý
  // chỉ đổi chữ mờ
  // trong ô TRỐNG, và KHÔNG thêm dòng nào kiểu "bé tuổi này thường 103 cm" nằm
  // cạnh con số thật của bé. Chữ mờ biến mất ngay khi cô gõ, nên nó là gợi ý
  // nhập liệu; một dòng chú thích nằm lại bên cạnh con số thì thành lời so
  // sánh, và đó đúng thứ QUY TẮC 4 cấm.
  goiYCanDo(thang) {
    if (!Number.isFinite(thang) || thang < 0) return { cao: 'VD: 105', nang: 'VD: 17' };
    const t = Math.min(Math.max(thang, 12), 72);
    const cao = Math.round(75 + (t - 12) * 0.72);
    const nang = Math.round((9.5 + (t - 12) * 0.2) * 10) / 10;
    return { cao: `VD: ${cao}`, nang: `VD: ${nang}` };
  },

  thangTuoiCuaBe(studentId) {
    const b = (this._dsBe || []).find(x => x.studentId === studentId);
    const s = b ? { dob: b.dob } : (App.state.students || []).find(x => x.id === studentId);
    if (!s || !s.dob) return null;
    // "Bây giờ" theo giờ Việt Nam, không theo múi giờ máy (Đ127).
    return this.thangTuoiTu(s.dob);
  },

  // Đổi bé trong ô chọn thì chữ mờ đổi theo — không thì cô chọn bé nhà trẻ mà
  // vẫn thấy gợi ý của bé nhóm Lá.
  capNhatGoiYCanDo() {
    const o = document.getElementById('ht-c-student');
    const g = this.goiYCanDo(this.thangTuoiCuaBe(o && o.value));
    const cao = document.getElementById('ht-height');
    const nang = document.getElementById('ht-weight');
    if (cao) cao.placeholder = g.cao;
    if (nang) nang.placeholder = g.nang;
  },

  // ---- Giáo viên: thêm ghi nhận ----
  openCreate(studentId) {
    // Bé của nhóm đang xem (cô lẫn văn phòng) — App.state.students chỉ có
    // với cô, và là mọi nhóm của cô gộp lại.
    const students = (this._dsBe && this._dsBe.length)
      ? this._dsBe.map(b => ({ id: b.studentId, name: b.hoTen, dob: b.dob, className: '' }))
      : (App.state.students || []);
    if (studentId) this._sid = studentId;
    this._newType = 'checkup';
    const goiY = this.goiYCanDo(this.thangTuoiCuaBe(this._sid || (students[0] || {}).id));
    UI.modal(`
      <div class="field">
        <label>Bé</label>
        <select id="ht-c-student">
          ${students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === this._sid ? 'selected' : ''}>${UI.esc(s.name)}${s.className ? ` · ${UI.esc(s.className)}` : ''}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Loại ghi nhận</label>
        <!-- Không còn "Tiêm chủng" (Đ136): nhà trường 07/09 — "trường không có
             tiêm chủng". Ghi nhận tiêm chủng đã có vẫn đọc được (TYPES giữ
             nguyên), chỉ không ghi thêm. "Khám" gồm cả cân đo hằng tháng. -->
        <div class="seg" id="ht-type-seg" style="margin-bottom:0">
          <button data-type="checkup" class="active" onclick="App.views.health.pickType('checkup')">🩺 Khám / cân đo</button>
          <button data-type="incident" onclick="App.views.health.pickType('incident')">🩹 Sự cố</button>
        </div>
      </div>
      <div class="field">
        <label>Tiêu đề</label>
        <input id="ht-title" placeholder="VD: Cân đo định kỳ đầu năm">
      </div>
      <div class="field">
        <label>Chi tiết</label>
        <textarea id="ht-detail" placeholder="VD: Sức khỏe tổng quát tốt. Răng miệng bình thường."></textarea>
      </div>
      <div class="grid-2" id="ht-metrics">
        <div class="field">
          <label>Chiều cao (cm)</label>
          <input type="number" id="ht-height" min="0" step="0.1" placeholder="${UI.esc(goiY.cao)}">
        </div>
        <div class="field">
          <label>Cân nặng (kg)</label>
          <input type="number" id="ht-weight" min="0" step="0.1" placeholder="${UI.esc(goiY.nang)}">
        </div>
        <div class="field">
          <label>Thị lực</label>
          <input id="ht-vision" placeholder="VD: 10/10">
        </div>
        <div class="field">
          <label>Đánh giá thể trạng</label>
          <input id="ht-bmi" placeholder="VD: phát triển bình thường">
        </div>
      </div>
      <div class="field">
        <label>Ngày ghi nhận</label>
        <input type="date" id="ht-date" value="${UI.todayStr()}">
        <div class="hint">Mặc định hôm nay. Đổi lại khi nhập kết quả khám định kỳ đã làm trước đó.</div>
      </div>
      <button class="btn primary block" onclick="App.views.health.submitCreate()">${UI.icon('check', 18)} Lưu ghi nhận</button>
    `, 'Thêm ghi nhận y tế');

    const oBe = document.getElementById('ht-c-student');
    if (oBe) oBe.onchange = () => this.capNhatGoiYCanDo();
  },

  pickType(t) {
    this._newType = t;
    document.querySelectorAll('#ht-type-seg button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
    const metrics = document.getElementById('ht-metrics');
    if (metrics) metrics.style.display = t === 'checkup' ? '' : 'none';
  },

  async submitCreate() {
    const studentId = document.getElementById('ht-c-student').value;
    const type = this._newType;
    const title = document.getElementById('ht-title').value.trim();
    const detail = document.getElementById('ht-detail').value.trim();
    if (!title) return UI.toast('Cô nhập tiêu đề ghi nhận giúp nhé', 'error');
    const body = { studentId, type, title, detail };
    const ngay = (document.getElementById('ht-date') || {}).value;
    if (ngay) body.date = ngay;
    if (type === 'checkup') {
      const h = document.getElementById('ht-height').value;
      const w = document.getElementById('ht-weight').value;
      if (h) body.height = Number(h);
      if (w) body.weight = Number(w);
      const tl = (document.getElementById('ht-vision') || {}).value;
      const tt = (document.getElementById('ht-bmi') || {}).value;
      if (tl && tl.trim()) body.vision = tl.trim();
      if (tt && tt.trim()) body.bmiNote = tt.trim();
    }
    try {
      await API.post('/api/health', body);
      UI.toast('Đã thêm ghi nhận y tế', 'success');
      UI.closeModal();
      this._sid = studentId;
      if (App.state.user.role !== 'parent') this._beDangMo = studentId;
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Sửa lại và thu hồi một ghi nhận y tế ----
  //
  // Một ghi nhận kiểu "sốt, nghi tay chân miệng" bấm nhầm sang bé khác
  // trước đây gắn vĩnh viễn vào hồ sơ đứa trẻ, mà hiệu trưởng cũng không gỡ được.
  openSua(id) {
    const r = (this._records || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    this._typeSua = r.type;
    UI.modal(`
      <div class="field">
        <label>Loại ghi nhận</label>
        <div class="seg" id="ht-s-seg" style="margin-bottom:0">
          <button data-type="checkup" class="${r.type === 'checkup' ? 'active' : ''}" onclick="App.views.health.pickTypeSua('checkup')">🩺 Khám</button>
          <button data-type="incident" class="${r.type === 'incident' ? 'active' : ''}" onclick="App.views.health.pickTypeSua('incident')">🩹 Sự cố</button>
        </div>
        ${r.type === 'vaccination' ? `
        <div class="hint">Đây là một ghi nhận tiêm chủng cũ. Trường mình không ghi tiêm chủng nữa,
          nên loại của nó giữ nguyên — cô vẫn sửa được tiêu đề, chi tiết và ngày.</div>` : ''}
      </div>
      <div class="field"><label>Tiêu đề</label><input id="ht-s-title" value="${UI.esc(r.title)}"></div>
      <div class="field"><label>Chi tiết</label><textarea id="ht-s-detail">${UI.esc(r.detail || '')}</textarea></div>
      <div class="grid-2">
        <div class="field"><label>Chiều cao (cm)</label><input type="number" id="ht-s-height" min="0" step="0.1" value="${UI.esc(r.height ?? '')}"></div>
        <div class="field"><label>Cân nặng (kg)</label><input type="number" id="ht-s-weight" min="0" step="0.1" value="${UI.esc(r.weight ?? '')}"></div>
        <div class="field"><label>Thị lực</label><input id="ht-s-vision" value="${UI.esc(r.vision || '')}" placeholder="VD: 10/10"></div>
        <div class="field"><label>Đánh giá thể trạng</label><input id="ht-s-bmi" value="${UI.esc(r.bmiNote || '')}" placeholder="VD: phát triển bình thường"></div>
      </div>
      <div class="field"><label>Ngày ghi nhận</label><input type="date" id="ht-s-date" value="${UI.esc(r.date)}"></div>
      <button class="btn primary block" id="ht-s-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa ghi nhận y tế');

    document.getElementById('ht-s-luu').onclick = async () => {
      const title = document.getElementById('ht-s-title').value.trim();
      if (!title) return UI.toast('Cô nhập tiêu đề ghi nhận giúp nhé', 'error');
      try {
        await API.put(`/api/health/${encodeURIComponent(id)}`, {
          type: this._typeSua,
          title,
          detail: document.getElementById('ht-s-detail').value.trim(),
          height: document.getElementById('ht-s-height').value || null,
          weight: document.getElementById('ht-s-weight').value || null,
          vision: document.getElementById('ht-s-vision').value.trim(),
          bmiNote: document.getElementById('ht-s-bmi').value.trim(),
          date: document.getElementById('ht-s-date').value || undefined,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  pickTypeSua(t) {
    this._typeSua = t;
    document.querySelectorAll('#ht-s-seg button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  },

  hoiThuHoi(id) {
    const r = (this._records || []).find(x => x.id === id);
    if (!r) return UI.toast('Không tìm thấy ghi nhận này', 'error');
    UI.modal(`
      <p style="line-height:1.6">Thu hồi ghi nhận <b>"${UI.esc(r.title)}"</b>?</p>
      <p class="muted small" style="line-height:1.6">
        Ghi nhận sẽ biến khỏi hồ sơ sức khỏe của bé. <b>Nội dung vẫn được giữ lại</b>
        trong hệ thống để tra khi có khiếu nại. Dùng khi ghi nhầm sang bé khác.
      </p>
      <button class="btn primary block mt-14" id="ht-th-ok">Xác nhận thu hồi</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Thu hồi ghi nhận y tế');

    document.getElementById('ht-th-ok').onclick = async () => {
      try {
        await API.del(`/api/health/${encodeURIComponent(id)}`);
        UI.toast('Đã thu hồi ghi nhận', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
};

// Dòng thông tin nhãn – giá trị: bản dùng chung nằm ở UI.dongThongTin,
// giữ tên cũ để các chỗ gọi trong tệp này khỏi đổi.
function infoRowHealth(label, value) {
  return UI.dongThongTin(label, value);
}
