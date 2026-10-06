// Phân hệ Kế hoạch giáo dục tháng.
// Phụ huynh: xem theo nhóm của con đang chọn. Cô: xem theo nhóm mình phụ trách.
// Cô phụ trách/quản trị soạn kế hoạch từng tháng ngay tại đây (chủ đề, mục tiêu, tuần, lời nhắn).
//
// Cô mầm non có thể phụ trách 2–3 nhóm, và mỗi nhóm có kế hoạch riêng. Bản đầu
// lấy cứng `nhomCuaCo[0]` và ghi chú là "ô chọn nhóm nằm ở màn Điểm danh" —
// nhưng ô đó chỉ đổi nhóm cho màn Điểm danh, không đổi cho màn này. Nghĩa là cô
// dạy hai nhóm KHÔNG có đường nào soạn kế hoạch cho nhóm thứ hai. Ô chọn chỉ
// hiện khi cô có nhiều hơn một nhóm; cô một nhóm không thấy nó.
App.views.plans = {
  _classId: null,
  _plans: [],

  // Nhóm mà VĂN PHÒNG soạn được: mọi nhóm trong cơ sở mình (Cấp 3), hoặc cả
  // trường (Cấp 1). Chép đúng khuôn `views/timetable.js` — hai màn nay đứng
  // chung một tab thì ô chọn nhóm của chúng phải hành xử giống hệt nhau.
  nhomVanPhong() {
    const u = App.state.user;
    const coSo = u && u.coSo ? u.coSo : null;
    return (App.state.classes || [])
      .filter(c => !coSo || c.campusId === coSo)
      .map(c => ({ id: c.id, name: c.name }));
  },

  // MÀN RIÊNG hay MỘT PHẦN CỦA MÀN LỊCH SINH HOẠT (Đ148).
  //
  // Nhà trường 10/09: *"bỏ newsletter: gộp phần kế hoạch giáo dục và lịch sinh
  // hoạt vào 1 tab tên là Lịch sinh hoạt, trong đó có đủ 2 nội dung là Kế hoạch
  // giáo dục và Lịch sinh hoạt"*.
  //
  // GỘP KHÔNG PHẢI LÀ XOÁ. Đường `#/plans` vẫn mở được y như cũ (điện thoại đã
  // cài app còn giữ liên kết cũ, và `/api/plans` không đổi một chữ nào) — chỉ
  // là ô vuông trên trang chủ gấp vào ô Lịch sinh hoạt, và màn riêng có thêm
  // một dòng chỉ đường. Cùng cách Đ126 đã làm cho Đón trả bé.
  //
  // `nhung` = đang được màn Lịch sinh hoạt vẽ hộ: khi đó không vẽ phần đầu
  // trang và thanh chọn bé, vì màn kia đã có sẵn một bộ rồi.
  //
  // VĂN PHÒNG MỞ ĐƯỢC MÀN NÀY — trước đợt này thì không, và đó là một lỗi có
  // thật chứ không phải chuyện của việc gộp: máy chủ CHO quản trị soạn kế hoạch
  // cho nhóm bất kỳ (`routes/plans.js`), nhưng màn hình đẩy mọi vai không phải
  // cô sang nhánh "bé đang chọn" — mà tài khoản văn phòng không có bé nào, nên
  // họ luôn nhận đúng câu "Chưa có bé nào liên kết với tài khoản này". Việc gộp
  // làm lỗi ấy lộ ra ngay giữa màn Lịch sinh hoạt, nơi văn phòng chắc chắn vào.
  async render(root, params, nhung) {
    const user = App.state.user;
    let classId;
    const dsNhom = user.role === 'teacher' ? (user.nhomCuaCo || [])
      : (user.role === 'admin' ? this.nhomVanPhong() : []);
    if (user.role === 'teacher' || user.role === 'admin') {
      // Giữ nhóm cô đang chọn, nếu nhóm đó vẫn còn thuộc về cô. Quản trị vừa rút
      // cô khỏi một nhóm thì rơi về nhóm đầu, không kẹt ở nhóm không còn quyền.
      if (!dsNhom.some(n => n.id === this._classId)) {
        this._classId = dsNhom[0]?.id || (user.role === 'teacher' ? user.classId : null) || null;
      }
      classId = this._classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = (nhung ? '' : UI.pageHeader('Kế hoạch giáo dục'))
          + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    this._classId = classId;
    // CÔ CHƯA ĐƯỢC PHÂN CÔNG NHÓM NÀO.
    //
    // Không chặn ở đây thì `classId` là null, chuỗi truy vấn thành
    // `?classId=null`, máy chủ không tìm thấy nhóm tên "null" và trả "Không tìm
    // thấy nhóm lớp" — màn hình hiện "Có lỗi xảy ra 😥" rồi đổ lỗi cho một nhóm
    // không tồn tại. Cô sẽ đi tìm xem mình bấm sai chỗ nào, trong khi việc cần
    // làm là nhờ văn phòng phân công nhóm.
    if (!classId) {
      root.innerHTML = (nhung ? '' : UI.pageHeader('Kế hoạch giáo dục'))
        + UI.emptyState('🧭', user.role === 'admin'
          ? 'Cơ sở chưa có nhóm lớp nào để soạn kế hoạch giáo dục.'
          : 'Cô chưa phụ trách nhóm nào nên chưa có kế hoạch để xem. '
            + 'Nhờ văn phòng nhà trường phân công nhóm giúp cô nhé.');
      return;
    }
    const data = await API.get(`/api/plans?classId=${encodeURIComponent(classId)}`);
    this._plans = data.plans || [];
    const suaDuoc = this.canEdit();
    root.innerHTML = `
      ${nhung ? '' : UI.pageHeader('Kế hoạch giáo dục', suaDuoc ? { action: { id: 'btn-soan-kh', label: 'Soạn kế hoạch', icon: 'edit' } } : {})}
      ${nhung || user.role !== 'parent' ? '' : UI.studentBar() + UI.thanhChonBeTheoCap()}
      ${this.oChonNhom(dsNhom)}
      ${suaDuoc && nhung ? `<button class="btn primary block mb-8" id="btn-soan-kh-nhung">
        ${UI.icon('edit', 18)} Soạn kế hoạch giáo dục</button>` : ''}
      ${this.thanKeHoach(data)}
      ${nhung ? '' : this.dongChiDuongLichSinhHoat()}`;
    const nutSoan = document.getElementById(nhung ? 'btn-soan-kh-nhung' : 'btn-soan-kh');
    if (suaDuoc && nutSoan) nutSoan.onclick = () => this.moSoan();
    const nutLSH = document.getElementById('btn-ve-lich-sinh-hoat');
    if (nutLSH) nutLSH.onclick = () => { location.hash = '#/timetable/kehoach'; };
  },

  // Kế hoạch giáo dục nay nằm trong màn Lịch sinh hoạt — CHỈ ĐƯỜNG, KHÔNG ÉP.
  // Ai mở địa chỉ cũ vẫn đọc được đủ nội dung ngay tại đây; dòng này chỉ nói
  // cho biết chỗ mới, đúng cách modules/dontra/view.js đã làm ở Đ126.
  dongChiDuongLichSinhHoat() {
    if (!App.moduleEnabled('timetable')) return '';
    return `<button type="button" class="btn outline block mt-8" id="btn-ve-lich-sinh-hoat">
      ${UI.icon('calendar', 16)} Phần này cũng nằm trong Lịch sinh hoạt → Kế hoạch giáo dục</button>`;
  },

  // Thân màn hình: kế hoạch tháng này, hoặc kế hoạch tháng sau nếu đã soạn.
  //
  // Cô soạn kế hoạch tháng sau vào cuối tháng này — soạn xong mà màn hình vẫn
  // ghi "Chưa có kế hoạch giáo dục cho tháng này" thì cô tưởng app không lưu
  // được và soạn lại. Nói rõ ra là đủ; không cần cô phải nhớ.
  thanKeHoach(data) {
    if (data.plan) return this.renderPlan(data.plan);
    if (data.planSapToi) {
      const p = data.planSapToi;
      return `
        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="small">Tháng này chưa có kế hoạch. Dưới đây là kế hoạch
          <b>tháng ${UI.esc(String(p.month))}/${UI.esc(String(p.year))}</b> đã soạn sẵn.</div>
        </div>
        ${this.renderPlan(p)}`;
    }
    return UI.emptyState('📖', 'Chưa có kế hoạch giáo dục cho tháng này');
  },

  // Ô chọn nhóm — chỉ hiện khi cô phụ trách nhiều hơn một nhóm.
  oChonNhom(dsNhom) {
    if (!dsNhom || dsNhom.length < 2) return '';
    return `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Nhóm lớp</label>
          <select onchange="App.views.plans.setNhom(this.value)">
            ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this._classId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;
  },

  setNhom(value) {
    if (!value || value === this._classId) return;
    this._classId = value;
    App.route();
  },

  // VĂN PHÒNG SOẠN, CÔ VÀ GIA ĐÌNH CHỈ XEM (Đ198, việc 42).
  //
  // Nhà trường (A24): *"Cái này do VĂN PHÒNG làm cho bớt việc của cô"*.
  //
  // MÀN HÌNH PHẢI THÔI MỜI CÔ BẤM, không chỉ máy chủ từ chối. Để nút lại thì
  // cô soạn xong cả một tháng kế hoạch rồi mới nhận câu từ chối — mất công của
  // cô, và trông như app hỏng chứ không như một quy định. Đó đúng là thứ
  // `test:khong-hua-suong` sinh ra để chặn.
  //
  // Cô KHÔNG mất chỗ nào để soạn cho bé: kế hoạch của TỪNG BÉ vẫn là của cô,
  // ở phân hệ riêng, không đụng tới.
  canEdit() {
    const u = App.state.user;
    if (!u) return false;
    return u.role === 'admin';
  },

  renderPlan(p) {
    const goals = p.goals || [];
    const weeks = p.weeks || [];
    return `
      <div class="card">
        <div style="font-size:1.18rem;font-weight:800">Tháng ${p.month} – ${UI.esc(p.theme)}</div>
        ${p.className ? `<div class="muted small mt-8">${UI.esc(p.className)}</div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">Mục tiêu tháng</div>
        ${goals.length
          ? goals.map(g => `<div style="padding:6px 0;line-height:1.5">✅ ${UI.esc(g)}</div>`).join('')
          : '<div class="muted small">Chưa có mục tiêu</div>'}
      </div>

      <div class="card">
        <div class="card-title">Kế hoạch từng tuần</div>
        ${weeks.length
          ? weeks.map((w, i) => `
            <div style="padding:11px 0;${i < weeks.length - 1 ? 'border-bottom:1px solid var(--line)' : ''}">
              ${UI.badge(`Tuần ${w.week}`, 'blue')}
              <div style="font-weight:700;margin-top:7px">${UI.esc(w.focus)}</div>
              <div class="muted small mt-8" style="line-height:1.5">${UI.esc(w.activities)}</div>
            </div>`).join('')
          : '<div class="muted small">Chưa có kế hoạch tuần</div>'}
      </div>

      ${p.note ? `
        <div class="card" style="background:#fff8e1;border-radius:12px">
          💌 <b>Nhắn gửi phụ huynh:</b> ${UI.esc(p.note)}
        </div>` : ''}`;
  },

  // =========================================================================
  // KẾ HOẠCH GIÁO DỤC CHUNG CẢ TRƯỜNG, THEO TUẦN (góp ý 06/10, mục 4)
  // =========================================================================
  //
  // Màn Lịch sinh hoạt → phần Kế hoạch giáo dục vẽ khối này (thay cho bản kế
  // hoạch tháng theo nhóm). Trường: *"đây sẽ là kế hoạch chung của toàn trường
  // nên sẽ bỏ nhóm lớp đi"* — nên KHÔNG có ô chọn nhóm, không có dòng "Cô phụ
  // trách"; và *"mục này mình sẽ để là soạn kế hoạch tuần"*: một tiêu đề tuần
  // ("Tuần 1 tháng 9: Trường của bé") rồi "Nội dung học của tuần".
  //
  // Kế hoạch tháng theo nhóm đã soạn KHÔNG mất: vẫn mở ở #/plans, và cô/văn
  // phòng có một dòng chỉ đường ở cuối khối.
  _tuan: null,

  // "Tuần 1 tháng 10" của một thứ Hai: tuần thứ mấy tính theo ngày của thứ Hai.
  nhanTuan(thuHai) {
    const [y, m, d] = String(thuHai).split('-').map(Number);
    return `Tuần ${Math.ceil(d / 7)} tháng ${m}`;
  },
  khoangNgay(thuHai) {
    const t = Date.parse(`${thuHai}T00:00:00Z`);
    const f = (ms) => { const x = new Date(ms); return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
    return `${f(t)} – ${f(t + 4 * 86400000)}/${new Date(t + 4 * 86400000).getUTCFullYear()}`;
  },
  // Mỗi dòng "Lĩnh vực: nội dung" thành một gạch đầu dòng, phần trước dấu hai
  // chấm in đậm — đúng hình mẫu trường gửi.
  dongNoiDung(dong) {
    const i = dong.indexOf(':');
    if (i > 0 && i <= 40) {
      return `<li style="margin:6px 0;line-height:1.55"><b>${UI.esc(dong.slice(0, i))}:</b>${UI.esc(dong.slice(i + 1))}</li>`;
    }
    return `<li style="margin:6px 0;line-height:1.55">${UI.esc(dong)}</li>`;
  },

  async renderTuan(o) {
    const q = this._tuan ? `?tuan=${encodeURIComponent(this._tuan)}` : '';
    const d = await API.get(`/api/plans/tuan${q}`);
    this._tuan = d.tuan;
    this._duLieuTuan = d;
    const k = d.keHoach;
    const dong = k ? String(k.noiDung || '').split('\n').filter(Boolean) : [];
    const u = App.state.user || {};
    o.innerHTML = `
      <div class="card" id="kht-the">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
          <button class="btn outline sm" id="kht-truoc" ${d.tuanTruocCo ? '' : 'disabled'} aria-label="Tuần trước có kế hoạch">‹</button>
          <div class="center small" style="flex:1">
            <b>${UI.esc(this.nhanTuan(d.tuan))}</b>${d.tuan === d.tuanNay ? ' · tuần này' : ''}
            <div class="muted">${UI.esc(this.khoangNgay(d.tuan))}</div>
          </div>
          <button class="btn outline sm" id="kht-sau" ${d.tuanSauCo ? '' : 'disabled'} aria-label="Tuần sau có kế hoạch">›</button>
        </div>
        ${k ? `
          <div style="font-size:1.25rem;font-weight:800;line-height:1.35;text-transform:uppercase" id="kht-tieu-de">${UI.esc(k.tieuDe)}</div>
          ${dong.length ? `
            <div class="card-title mt-14" style="font-size:.85rem;letter-spacing:.02em">NỘI DUNG HỌC TRONG TUẦN</div>
            <ul style="margin:0;padding-left:20px" id="kht-noi-dung">${dong.map(x => this.dongNoiDung(x)).join('')}</ul>` : ''}`
          : `<div class="muted" style="line-height:1.6">Tuần này nhà trường chưa đăng kế hoạch giáo dục.${
            d.tuan !== d.tuanNay ? '' : ' Khi có, kế hoạch sẽ hiện ngay ở đây.'}</div>`}
        ${d.duocSoan ? `
          <button class="btn primary block mt-14" id="btn-soan-kh-tuan">${UI.icon('edit', 16)} Soạn kế hoạch tuần</button>` : ''}
        ${d.tuan !== d.tuanNay ? `<button class="btn outline block mt-8" id="kht-ve-nay">Về tuần này</button>` : ''}
      </div>
      ${u.role !== 'parent' ? `
        <div class="muted small center mb-8"><a href="#/plans">Xem kế hoạch tháng theo nhóm đã soạn trước đây →</a></div>` : ''}`;
    const di = (t) => { this._tuan = t; this.renderTuan(o).catch(err => UI.toast(err.message, 'error')); };
    const nt = document.getElementById('kht-truoc');
    if (nt && d.tuanTruocCo) nt.onclick = () => di(d.tuanTruocCo);
    const ns = document.getElementById('kht-sau');
    if (ns && d.tuanSauCo) ns.onclick = () => di(d.tuanSauCo);
    const nn = document.getElementById('kht-ve-nay');
    if (nn) nn.onclick = () => di(d.tuanNay);
    const soan = document.getElementById('btn-soan-kh-tuan');
    if (soan) soan.onclick = () => this.moSoanTuan(o);
  },

  moSoanTuan(o) {
    const d = this._duLieuTuan || {};
    const k = d.keHoach || {};
    UI.modal(`
      <div class="field">
        <label>Tuần</label>
        <input type="date" id="kht-o-tuan" value="${UI.esc(d.tuan || '')}">
        <div class="hint">Chọn ngày bất kỳ trong tuần — app tự lấy thứ Hai của tuần đó.</div>
      </div>
      <div class="field">
        <label>Tiêu đề tuần</label>
        <input id="kht-o-tieu-de" maxlength="150" value="${UI.esc(k.tieuDe || `${this.nhanTuan(d.tuan)}: `)}"
          placeholder="Ví dụ: Tuần 1 tháng 9: Trường của bé">
      </div>
      <div class="field">
        <label>Nội dung học của tuần</label>
        <textarea id="kht-o-noi-dung" rows="9" placeholder="Mỗi dòng một mục, ví dụ:&#10;Khám phá: Trong tuần các con làm quen với môi trường xung quanh, từ vựng mới về trường mầm non.&#10;Kỹ năng sống: Bé làm quen với phép lịch sự nhã nhặn; tự lau dọn bàn sau bữa ăn.&#10;Âm nhạc: Bài hát của tuần: Trường chúng cháu là trường mầm non.">${UI.esc(k.noiDung || '')}</textarea>
        <div class="hint">Mỗi dòng thành một gạch đầu dòng; chữ trước dấu hai chấm được in đậm.
          Đây là kế hoạch chung — mọi gia đình và mọi cô của cả trường đều thấy.</div>
      </div>
      <button class="btn primary block" id="kht-luu">${UI.icon('check', 18)} Lưu kế hoạch tuần</button>
    `, 'Soạn kế hoạch tuần');
    document.getElementById('kht-luu').onclick = async () => {
      const ngayChon = document.getElementById('kht-o-tuan').value;
      const tieuDe = document.getElementById('kht-o-tieu-de').value.trim();
      if (!ngayChon) return UI.toast('Cần chọn tuần', 'error');
      if (!tieuDe) return UI.toast('Cần một tiêu đề tuần', 'error');
      try {
        const r = await API.put(`/api/plans/tuan/${encodeURIComponent(ngayChon)}`, {
          tieuDe, noiDung: document.getElementById('kht-o-noi-dung').value,
        });
        UI.closeModal();
        UI.toast('Đã lưu kế hoạch tuần', 'success');
        this._tuan = r.keHoach ? r.keHoach.tuan : ngayChon;
        await this.renderTuan(o);
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Cô phụ trách / quản trị: soạn kế hoạch một tháng ----

  // Danh sách tháng chọn được: tháng trước → 4 tháng tới, gộp thêm các tháng đã soạn.
  cacThangChonDuoc() {
    const now = UI.parseDate(UI.todayStr());   // hôm nay của trường, giờ Việt Nam
    const ds = new Map();
    for (let i = -1; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      ds.set(`${d.getFullYear()}-${d.getMonth() + 1}`, { year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    for (const p of this._plans) ds.set(`${p.year}-${p.month}`, { year: p.year, month: p.month });
    return [...ds.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  },

  // Mở modal soạn cho tháng `ym` dạng "YYYY-M" (mặc định: tháng hiện tại).
  moSoan(ym) {
    const now = UI.parseDate(UI.todayStr());
    const [year, month] = (ym || `${now.getFullYear()}-${now.getMonth() + 1}`).split('-').map(Number);
    const p = this._plans.find(x => x.year === year && x.month === month) || null;
    const weeks = (p && p.weeks && p.weeks.length ? p.weeks : []).slice(0, 6);
    while (weeks.length < 4) weeks.push({ week: weeks.length + 1, focus: '', activities: '' });

    UI.modal(`
      <div class="field">
        <label>Kế hoạch cho tháng</label>
        <select id="kh-thang" onchange="App.views.plans.moSoan(this.value)">
          ${this.cacThangChonDuoc().map(t => `
            <option value="${t.year}-${t.month}" ${t.year === year && t.month === month ? 'selected' : ''}>
              Tháng ${t.month}/${t.year}${this._plans.some(x => x.year === t.year && x.month === t.month) ? ' — đã soạn' : ''}
            </option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Chủ đề của tháng</label>
        <input id="kh-chude" value="${UI.esc(p ? p.theme : '')}" placeholder="VD: Trường mầm non của bé">
      </div>
      <div class="field">
        <label>Mục tiêu tháng — mỗi dòng một mục tiêu</label>
        <textarea id="kh-muctieu" rows="3" placeholder="VD: Bé tự cất ba lô, cất dép vào đúng ô">${UI.esc((p && p.goals ? p.goals : []).join('\n'))}</textarea>
      </div>
      ${weeks.map((w, i) => `
        <div style="border-top:1px solid var(--line);padding-top:10px;margin-top:12px">
          <div style="font-weight:700;margin-bottom:8px">Tuần ${i + 1}</div>
          <div class="field">
            <label>Trọng tâm</label>
            <input id="kh-tt-${i}" value="${UI.esc(w.focus || '')}" placeholder="VD: Làm quen cô, bạn và các góc chơi">
          </div>
          <div class="field">
            <label>Hoạt động</label>
            <textarea id="kh-hd-${i}" rows="2" placeholder="VD: Chơi đóng vai bán hàng theo nhóm ba bé; xây nhà bằng khối gỗ">${UI.esc(w.activities || '')}</textarea>
          </div>
        </div>`).join('')}
      <div class="field" style="border-top:1px solid var(--line);padding-top:10px;margin-top:12px">
        <label>💌 Nhắn gửi phụ huynh (không bắt buộc)</label>
        <textarea id="kh-loinhan" rows="2" placeholder="VD: Ở nhà gia đình thử để bé tự xúc bữa tối nhé">${UI.esc(p ? (p.note || '') : '')}</textarea>
      </div>
      <button class="btn primary block" onclick="App.views.plans.luuKeHoach(${year}, ${month}, ${weeks.length})">${UI.icon('check', 18)} Lưu kế hoạch</button>
    `, 'Soạn kế hoạch giáo dục');
  },

  async luuKeHoach(year, month, soTuan) {
    const theme = document.getElementById('kh-chude').value.trim();
    if (!theme) return UI.toast('Cô nhập chủ đề của tháng giúp nhé', 'error');
    const goals = document.getElementById('kh-muctieu').value.split('\n').map(s => s.trim()).filter(Boolean);
    const weeks = [];
    for (let i = 0; i < soTuan; i++) {
      weeks.push({
        week: i + 1,
        focus: document.getElementById(`kh-tt-${i}`).value.trim(),
        activities: document.getElementById(`kh-hd-${i}`).value.trim(),
      });
    }
    const note = document.getElementById('kh-loinhan').value.trim();
    try {
      await API.put(`/api/plans/${encodeURIComponent(this._classId)}/${year}/${month}`, { theme, goals, weeks, note });
      UI.toast(`Đã lưu kế hoạch tháng ${month}/${year}`, 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
