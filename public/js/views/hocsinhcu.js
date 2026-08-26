// Phân hệ Hồ sơ con đã ra trường.
//
// Con rời trường thì biến khỏi ô chọn con ở các màn hình khác (danh sách đó chỉ
// lấy bé đang học), nên phụ huynh mất luôn học bạ và sổ liên lạc. Màn hình
// này mở lại đúng phần đó, trong thời hạn nhà trường đặt.
//
// Chỉ ĐỌC: không có đường ghi nào ở đây.
App.views.hocsinhcu = {
  _ds: [],
  _soThangGiu: 12,

  async render(root, params) {
    const id = params && params[0];
    if (id) return this.renderChiTiet(root, id);
    return this.renderDanhSach(root);
  },

  async renderDanhSach(root) {
    const d = await API.get('/api/hocsinh-cu');
    this._ds = d.students || [];
    this._soThangGiu = d.soThangGiu || 12;

    root.innerHTML = `
      ${UI.pageHeader('Hồ sơ con đã ra trường')}
      ${this._ds.length ? `
        <div class="card" style="border-left:4px solid var(--info)">
          <div class="muted small" style="line-height:1.6">
            Học bạ và sổ liên lạc của con được giữ lại để gia đình tra cứu trong
            <b>${this._soThangGiu} tháng</b> kể từ ngày con rời trường. Gia đình nên
            tải hoặc chụp lại phần cần giữ trước khi hết thời hạn này.
          </div>
        </div>
        <div class="card">
          ${this._ds.map(s => `
            <div class="list-row clickable" onclick="App.navigate('#/hocsinh-cu/${UI.esc(s.id)}')">
              ${UI.avatar(s.avatar, 44)}
              <div class="row-main">
                <div class="row-title">${UI.esc(s.name)}</div>
                <div class="row-sub">${UI.esc(s.lopCuoi || 'chưa rõ lớp')}${s.namCuoi ? ` · năm ${UI.esc(s.namCuoi)}` : ''}${
                  s.leftAt ? ` · rời trường ${UI.esc(UI.fmtDateShort(s.leftAt))}` : ''}</div>
              </div>
              <span class="muted">${UI.icon('chevron', 18)}</span>
            </div>`).join('')}
        </div>`
        : UI.emptyState('🎓', 'Chưa có con nào đã rời trường. Khi con học xong hoặc chuyển trường, '
          + 'hồ sơ của con sẽ hiện ở đây để gia đình tra cứu thêm một thời gian.')}
      ${d.soDaQuaHan ? `
        <div class="muted small center mt-14" style="line-height:1.6">
          Còn ${d.soDaQuaHan} hồ sơ đã quá thời hạn tra cứu. Gia đình cần bản sao
          xin liên hệ trực tiếp nhà trường.
        </div>` : ''}`;
  },

  async renderChiTiet(root, id) {
    const d = await API.get(`/api/hocsinh-cu/${encodeURIComponent(id)}`);
    const s = d.student;
    const cc = d.chuyenCan || {};

    root.innerHTML = `
      ${UI.pageHeader(s.name)}
      <div class="card">
        <div class="flex" style="gap:12px">
          ${UI.avatar(s.avatar, 52)}
          <div class="row-main">
            <div class="row-title">${UI.esc(s.name)}</div>
            <div class="row-sub">${UI.esc(s.lopCuoi || '')}${s.namCuoi ? ` · năm ${UI.esc(s.namCuoi)}` : ''}</div>
            <div class="row-sub">${s.leftAt ? `Rời trường ngày ${UI.esc(UI.fmtDate(s.leftAt, { weekday: false }))}` : ''}</div>
          </div>
        </div>
      </div>

      ${cc.tong ? `
        <div class="section-label">Chuyên cần cả quá trình</div>
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num">${cc.tong}</div><div class="stat-label">Buổi đã ghi</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${cc.coMat}</div><div class="stat-label">Có mặt</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${cc.muon}</div><div class="stat-label">Muộn</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--danger)">${cc.vang}</div><div class="stat-label">Vắng</div></div>
        </div>` : ''}

      <div class="section-label">Học bạ</div>
      ${d.baoCao.length ? `
        <div class="card">
          ${d.baoCao.map(b => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">Học kỳ ${UI.esc(b.term)} · năm ${UI.esc(b.year)}</div>
                ${b.comment ? `<div class="row-sub" style="line-height:1.45">${UI.esc(b.comment)}</div>` : ''}
                ${Array.isArray(b.subjects) && b.subjects.length ? `
                  <div class="small mt-8" style="line-height:1.6">
                    ${b.subjects.map(m => `${UI.esc(m.name)}: <b>${UI.esc(m.score ?? m.level ?? '—')}</b>`).join(' · ')}
                  </div>` : ''}
              </div>
            </div>`).join('')}
        </div>`
        : UI.emptyState('📘', 'Không có học bạ nào được lưu cho con')}

      <div class="section-label">Sổ liên lạc</div>
      ${d.nhanXet.length ? `
        <div class="card">
          <div class="timeline">
            ${d.nhanXet.map(r => {
              const rt = UI.RATING[r.rating] || UI.RATING.good;
              return `
                <div class="tl-item">
                  <div class="tl-time">${UI.esc(UI.fmtDate(r.date))}</div>
                  <div class="mt-8">${UI.badge(`${rt.emoji} ${rt.label}`, rt.cls)}</div>
                  <div style="margin-top:6px;line-height:1.5">${UI.esc(r.content)}</div>
                  ${r.teacherName ? `<div class="muted small" style="margin-top:6px">${UI.esc(r.teacherName)}</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`
        : UI.emptyState('📝', 'Không có nhận xét nào được lưu cho con')}`;
  },
};
