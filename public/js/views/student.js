// Phân hệ Hồ sơ bé.
// Phụ huynh: hồ sơ của con. Giáo viên: danh sách bé nhóm mình phụ trách.
App.views.student = {
  // Tuổi của bé, tính theo NGÀY SINH chứ không phải hiệu hai con số năm.
  //
  // Bản đầu lấy `nămNay − nămSinh`. Với trẻ 2–6 tuổi thì lệch một năm là lệch
  // rất nhiều: một bé sinh tháng 12 bị ghi già hơn tuổi thật gần trọn một năm,
  // suốt từ tháng 1 cho tới sinh nhật. Cô nhìn con số đó rồi chờ đợi ở bé
  // những việc bé chưa tới tuổi làm được — và ở tuổi này, sáu tháng là một
  // khoảng cách thật sự.
  //
  // Ở tuổi này người Việt vẫn nói kèm tháng: "3 tuổi 8 tháng", "26 tháng".
  // Nên hiện luôn cả tháng, đúng cách cô và gia đình vẫn nói với nhau.
  //
  // `moc` chỉ để bài kiểm thử cố định được ngày hôm nay; app luôn gọi không
  // truyền tham số này.
  tuoiCuaBe(dob, moc) {
    if (!dob) return null;
    const ns = UI.parseDate(dob);
    if (!ns || Number.isNaN(ns.getTime())) return null;
    const nay = moc ? UI.parseDate(moc) : new Date();
    let thang = (nay.getFullYear() - ns.getFullYear()) * 12 + (nay.getMonth() - ns.getMonth());
    if (nay.getDate() < ns.getDate()) thang -= 1;
    if (thang < 0) return null;          // ngày sinh nhập nhầm sang tương lai
    const nam = Math.floor(thang / 12);
    const du = thang % 12;
    if (nam < 1) return `${thang} tháng`;
    return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
  },

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderRoster(root);
    return this.renderProfile(root);
  },

  // ---- Phụ huynh: hồ sơ con ----
  async renderProfile(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Hồ sơ bé') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const s = await API.get(`/api/students/${current.id}`);
    const tuoi = this.tuoiCuaBe(s.dob);
    root.innerHTML = `
      ${UI.pageHeader('Hồ sơ của bé')}
      ${UI.studentBar()}${UI.thanhChonBe()}
      <div class="card center" style="padding-top:24px">
        ${UI.avatar(s.avatar, 84)}
        <h2 style="margin-top:10px">${UI.esc(s.name)}</h2>
        <div class="muted small mt-8">Mã của bé: ${UI.esc(s.code)} · ${UI.esc(s.className)}</div>
        <div class="mt-8">${UI.badge(s.gender, 'blue')}${tuoi ? ` ${UI.badge(tuoi, 'purple')}` : ''}</div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Thông tin cá nhân</div>
        ${infoRow('Ngày sinh', UI.fmtDate(s.dob, { weekday: false }))}
        ${infoRow('Giới tính', s.gender)}
        ${infoRow('Dân tộc', s.ethnicity)}
        ${infoRow('Địa chỉ', s.address)}
        ${infoRow('Nhóm máu', s.bloodType)}
        ${infoRow('Dị ứng', s.allergies)}
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('student', 19)} Nhóm lớp</div>
        ${infoRow('Nhóm', `${s.className} · ${s.room}`)}
        ${infoRow('Cô phụ trách', s.teacherNames || s.teacherName)}
        ${infoRow('Điện thoại của cô', s.teacherPhone)}
        <button class="btn primary block mt-14" onclick="location.hash='#/messages'">${UI.icon('chat', 18)} Nhắn tin với giáo viên</button>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('user', 19)} Phụ huynh</div>
        ${s.parents.map(p => `
          <div class="list-row">
            ${UI.avatar(p.avatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(p.title)} ${UI.esc(p.name)}</div>
              <div class="row-sub">${UI.esc(p.phone)} · ${UI.esc(p.email)}</div>
            </div>
          </div>`).join('')}
      </div>`;
  },

  // ---- Cô: danh sách bé của nhóm ----
  async renderRoster(root) {
    const students = await API.get('/api/students');
    const tenNhom = (App.state.user.nhomCuaCo || []).map(n => n.name).join(', ');
    root.innerHTML = `
      ${UI.pageHeader(`Các bé nhóm ${tenNhom}`)}
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${students.length}</div><div class="stat-label">Sĩ số</div></div>
        <div class="stat-box"><div class="stat-num">${students.filter(s => s.gender === 'Nam').length}</div><div class="stat-label">Nam</div></div>
        <div class="stat-box"><div class="stat-num">${students.filter(s => s.gender === 'Nữ').length}</div><div class="stat-label">Nữ</div></div>
      </div>
      <div class="card">
        ${students.map(s => `
          <div class="list-row clickable" onclick="App.views.student.showDetail('${UI.esc(s.id)}')">
            ${UI.avatar(s.avatar, 44)}
            <div class="row-main">
              <div class="row-title">${UI.esc(s.name)}</div>
              <div class="row-sub">${UI.esc(s.code)} · ${UI.fmtDate(s.dob, { weekday: false })}</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>`).join('')}
      </div>`;
  },

  async showDetail(id) {
    try {
      const s = await API.get(`/api/students/${id}`);
      UI.modal(`
        <div class="center">${UI.avatar(s.avatar, 68)}<h3 class="mt-8">${UI.esc(s.name)}</h3>
          <div class="muted small">${UI.esc(s.code)} · ${UI.esc(s.className)}</div></div>
        <div class="mt-14">
          ${infoRow('Ngày sinh', UI.fmtDate(s.dob, { weekday: false }))}
          ${infoRow('Địa chỉ', s.address)}
          ${infoRow('Dị ứng', s.allergies)}
          ${s.parents.map(p => infoRow(`Phụ huynh: ${p.title} ${p.name}`, p.phone)).join('')}
        </div>`, 'Hồ sơ của bé');
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};

// Dòng thông tin nhãn – giá trị dùng chung.
function infoRow(label, value) {
  return `<div class="list-row"><div class="row-main"><div class="row-sub">${UI.esc(label)}</div><div class="row-title">${UI.esc(value ?? '—')}</div></div></div>`;
}
