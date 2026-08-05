// Phân hệ Báo cáo học tập: kết quả từng học kỳ.
// Phụ huynh: xem theo từng con. Giáo viên: chọn học sinh trong lớp.
App.views.reports = {
  termIdx: 0,
  teacherStudentId: null,

  async render(root) {
    const isTeacher = App.state.user.role === 'teacher';
    let student;
    if (isTeacher) {
      const students = App.state.students || [];
      if (!students.length) {
        root.innerHTML = UI.pageHeader('Báo cáo học tập') + UI.emptyState('📊', 'Lớp chưa có học sinh nào');
        return;
      }
      if (!this.teacherStudentId || !students.some(s => s.id === this.teacherStudentId)) {
        this.teacherStudentId = students[0].id;
      }
      student = students.find(s => s.id === this.teacherStudentId);
    } else {
      student = App.currentStudent();
      if (!student) {
        root.innerHTML = UI.pageHeader('Báo cáo học tập') + UI.emptyState('📊', 'Chưa có học sinh liên kết với tài khoản này');
        return;
      }
    }

    const reports = await API.get(`/api/reports?studentId=${encodeURIComponent(student.id)}`);
    if (this.termIdx >= reports.length) this.termIdx = 0;
    const rp = reports[this.termIdx];

    root.innerHTML = `
      ${UI.pageHeader('Báo cáo học tập')}
      ${isTeacher ? `
        <div class="field">
          <label>Học sinh</label>
          <select id="rp-student">
            ${App.state.students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === student.id ? 'selected' : ''}>${UI.esc(s.name)}</option>`).join('')}
          </select>
        </div>` : UI.studentBar()}
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
};
