// Phân hệ Báo cáo học tập: kết quả từng học kỳ.
// Phụ huynh: xem theo từng con. Giáo viên: chọn bé trong nhóm và soạn
// báo cáo từng học kỳ ngay tại đây; chuyên cần tự tính từ sổ điểm danh.
App.views.reports = {
  termIdx: 0,
  teacherStudentId: null,
  _student: null,  // bé đang xem
  _reports: [],    // các báo cáo đã tải của bé đó

  MUC_DANH_GIA: ['Hoàn thành xuất sắc', 'Hoàn thành tốt', 'Hoàn thành', 'Chưa hoàn thành'],
  MUC_HANH_KIEM: ['Tốt', 'Khá', 'Trung bình', 'Cần cố gắng'],
  // Bộ môn mặc định khi bé chưa từng có báo cáo nào.
  MON_MAC_DINH: ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Đạo đức', 'Tự nhiên & Xã hội', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Tin học'],

  async render(root) {
    const isTeacher = App.state.user.role === 'teacher';
    let student;
    if (isTeacher) {
      const students = App.state.students || [];
      if (!students.length) {
        root.innerHTML = UI.pageHeader('Báo cáo học tập') + UI.emptyState('📊', 'Nhóm chưa có bé nào');
        return;
      }
      if (!this.teacherStudentId || !students.some(s => s.id === this.teacherStudentId)) {
        this.teacherStudentId = students[0].id;
      }
      student = students.find(s => s.id === this.teacherStudentId);
    } else {
      student = App.currentStudent();
      if (!student) {
        root.innerHTML = UI.pageHeader('Báo cáo học tập') + UI.emptyState('📊', 'Chưa có bé nào liên kết với tài khoản này');
        return;
      }
    }

    const reports = await API.get(`/api/reports?studentId=${encodeURIComponent(student.id)}`);
    this._student = student;
    this._reports = reports;
    if (this.termIdx >= reports.length) this.termIdx = 0;
    const rp = reports[this.termIdx];
    const suaDuoc = this.canEdit();

    root.innerHTML = `
      ${UI.pageHeader('Báo cáo học tập', suaDuoc ? { action: { id: 'btn-soan-bc', label: 'Soạn báo cáo', icon: 'edit' } } : {})}
      ${isTeacher ? `
        <div class="field">
          <label>Bé</label>
          <select id="rp-student">
            ${App.state.students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === student.id ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('')}
          </select>
        </div>` : UI.studentBar() + UI.thanhChonBe()}
      ${reports.length ? `
        <div class="seg">
          ${reports.map((r, i) => `<button class="${i === this.termIdx ? 'active' : ''}" onclick="App.views.reports.setTerm(${i})">${UI.esc(this.termLabel(r.term))}</button>`).join('')}
        </div>
        ${this.renderReport(rp)}`
        : UI.emptyState('📊', 'Chưa có báo cáo học tập nào')}`;

    if (isTeacher) {
      document.getElementById('rp-student').onchange = (e) => {
        this.teacherStudentId = e.target.value;
        this.termIdx = 0;
        App.route();
      };
    }
    if (suaDuoc) document.getElementById('btn-soan-bc').onclick = () => this.moSoan();
  },

  // Giáo viên soạn cho bé của nhóm mình; quản trị cho bé bất kỳ.
  canEdit() {
    const u = App.state.user;
    return !!u && (u.role === 'teacher' || u.role === 'admin');
  },

  setTerm(i) {
    this.termIdx = i;
    App.route();
  },

  // Rút gọn nhãn học kỳ cho tab: "Học kỳ 1 (2024-2025)" → "Học kỳ 1"
  termLabel(term) {
    return String(term || '').replace(/\s*\(.*\)\s*$/, '');
  },

  renderReport(rp) {
    const att = rp.attendanceSummary || { present: 0, absent: 0, late: 0 };
    return `
      <div class="card">
        <div class="card-title">${UI.icon('report', 19)} Kết quả học tập</div>
        <div class="muted small" style="margin:-6px 0 10px">${UI.esc(rp.term)} · Năm học ${UI.esc(rp.year)}</div>
        <div class="table-wrap">
          <table class="simple">
            <thead><tr><th>Môn</th><th>Điểm</th><th>Đánh giá</th></tr></thead>
            <tbody>
              ${rp.subjects.map(sb => `
                <tr>
                  <td>${UI.esc(sb.name)}</td>
                  <td>${sb.score == null ? '—' : `<b>${UI.esc(sb.score)}</b>`}</td>
                  <td>${UI.esc(sb.level)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('attendance', 19)} Chuyên cần</div>
        <div class="stat-row" style="margin-bottom:0">
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${UI.esc(att.present)}</div><div class="stat-label">Có mặt</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--danger)">${UI.esc(att.absent)}</div><div class="stat-label">Vắng</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${UI.esc(att.late)}</div><div class="stat-label">Muộn</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('remark', 19)} Nhận xét của giáo viên</div>
        <div class="mb-8">${UI.badge(rp.overall, 'green')}</div>
        <div class="small" style="margin:8px 0">Hạnh kiểm: <b>${UI.esc(rp.conduct)}</b></div>
        <div style="border-left:3px solid var(--primary);padding-left:10px;line-height:1.55">${UI.esc(rp.teacherComment)}</div>
      </div>`;
  },

  // ---- Cô phụ trách / quản trị: soạn báo cáo một học kỳ ----

  // Các học kỳ chọn được: HK1/HK2 của năm học hiện tại + các kỳ đã có báo cáo.
  cacKyChonDuoc() {
    const ds = new Map();
    for (const r of this._reports) {
      const m = String(r.term).match(/Học kỳ\s*(\d)/);
      if (m) ds.set(`${m[1]}|${r.year}`, { term: Number(m[1]), year: r.year, daCo: true });
    }
    const namNay = App.state.year;
    if (namNay) {
      for (const t of [1, 2]) {
        if (!ds.has(`${t}|${namNay}`)) ds.set(`${t}|${namNay}`, { term: t, year: namNay, daCo: false });
      }
    }
    return [...ds.values()].sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.term - b.term);
  },

  // Học kỳ mặc định khi mở màn soạn: theo tháng hiện tại của năm học đang chạy.
  kyMacDinh() {
    const thang = new Date().getMonth() + 1;
    return `${thang >= 8 || thang === 1 ? 1 : 2}|${App.state.year || ''}`;
  },

  // Mở modal soạn cho học kỳ `tv` dạng "term|year" (mặc định: kỳ hiện tại).
  moSoan(tv) {
    const [term, year] = (tv || this.kyMacDinh()).split('|');
    const termLabel = `Học kỳ ${term} (${year})`;
    const p = this._reports.find(r => r.term === termLabel) || null;

    // Bộ môn: của bản đã soạn kỳ này → của báo cáo gần nhất → bộ mặc định.
    const monCu = p ? p.subjects
      : (this._reports.length ? this._reports[this._reports.length - 1].subjects.map(sb => ({ ...sb, score: null }))
        : this.MON_MAC_DINH.map(name => ({ name, score: null, level: '', comment: '' })));

    const mucDG = [...this.MUC_DANH_GIA];
    for (const sb of monCu) if (sb.level && !mucDG.includes(sb.level)) mucDG.push(sb.level);

    UI.modal(`
      <div class="muted small" style="margin-bottom:10px">Soạn cho: <b>${UI.esc(this._student ? this._student.name : '')}</b></div>
      <div class="field">
        <label>Học kỳ</label>
        <select id="bc-ky" onchange="App.views.reports.moSoan(this.value)">
          ${this.cacKyChonDuoc().map(k => `
            <option value="${k.term}|${UI.esc(k.year)}" ${String(k.term) === term && k.year === year ? 'selected' : ''}>
              Học kỳ ${k.term} (${UI.esc(k.year)})${k.daCo ? ' — đã có' : ''}
            </option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Bảng điểm các môn — điểm thang 10, để trống nếu môn không chấm điểm</label></div>
      ${monCu.map((sb, i) => `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <div style="flex:1.4;font-weight:600;font-size:.92rem">${UI.esc(sb.name)}</div>
          <div class="field" style="flex:.7;margin:0">
            <input id="bc-diem-${i}" type="number" min="0" max="10" step="0.1" value="${sb.score == null ? '' : UI.esc(sb.score)}" placeholder="Điểm">
          </div>
          <div class="field" style="flex:1.3;margin:0">
            <select id="bc-muc-${i}">
              ${mucDG.map(m => `<option ${m === (sb.level || 'Hoàn thành tốt') ? 'selected' : ''}>${UI.esc(m)}</option>`).join('')}
            </select>
          </div>
        </div>`).join('')}
      <div class="grid-2" style="border-top:1px solid var(--line);padding-top:10px;margin-top:12px">
        <div class="field">
          <label>Hạnh kiểm</label>
          <select id="bc-hanhkiem">
            ${this.MUC_HANH_KIEM.map(m => `<option ${m === (p ? p.conduct : 'Tốt') ? 'selected' : ''}>${UI.esc(m)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Chuyên cần</label>
          <input value="Tự tính từ sổ điểm danh" disabled>
        </div>
      </div>
      <div class="field">
        <label>Đánh giá chung</label>
        <input id="bc-tongquat" value="${UI.esc(p ? p.overall : 'Hoàn thành tốt nhiệm vụ học tập')}" placeholder="VD: Hoàn thành tốt nhiệm vụ học tập">
      </div>
      <div class="field">
        <label>Nhận xét gửi phụ huynh</label>
        <textarea id="bc-nhanxet" rows="3" placeholder="VD: Con chăm ngoan, tiếp thu bài tốt...">${UI.esc(p ? (p.teacherComment || '') : '')}</textarea>
      </div>
      <button class="btn primary block" onclick="App.views.reports.luuBaoCao(${Number(term)}, '${UI.esc(year)}', ${monCu.length})">${UI.icon('check', 18)} Lưu báo cáo</button>
    `, 'Soạn báo cáo học tập');
    // Giữ lại tên môn để gửi kèm điểm khi lưu.
    this._monDangSoan = monCu.map(sb => sb.name);
  },

  async luuBaoCao(term, year, soMon) {
    const subjects = [];
    for (let i = 0; i < soMon; i++) {
      subjects.push({
        name: this._monDangSoan[i],
        score: document.getElementById(`bc-diem-${i}`).value.trim(),
        level: document.getElementById(`bc-muc-${i}`).value,
      });
    }
    const body = {
      term, year, subjects,
      conduct: document.getElementById('bc-hanhkiem').value,
      overall: document.getElementById('bc-tongquat').value.trim(),
      teacherComment: document.getElementById('bc-nhanxet').value.trim(),
    };
    try {
      const kq = await API.put(`/api/reports/${encodeURIComponent(this._student.id)}`, body);
      UI.toast(`Đã lưu báo cáo ${kq.term}`, 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
