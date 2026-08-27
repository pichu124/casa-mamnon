// Phân hệ Năm học trước.
//
// Sau khi chuyển năm học, mọi nội dung khóa theo nhóm — thông báo gửi riêng nhóm,
// khảo sát, kế hoạch giáo dục, lịch sinh hoạt — rơi khỏi tầm với của phụ huynh
// vì nhóm cũ đã đóng. Màn hình này mở lại đúng phần của nhóm con TỪNG học, và chỉ
// phần rơi vào khoảng con còn ở nhóm đó.
//
// Chỉ ĐỌC: không có đường ghi nào ở đây.
App.views.namhoccu = {
  async render(root, params) {
    const id = params && params[0];
    if (id) return this.renderChiTiet(root, id);
    return this.renderDanhSach(root);
  },

  async renderDanhSach(root) {
    const d = await API.get('/api/namhoccu');
    const ds = d.khoang || [];

    root.innerHTML = `
      ${UI.pageHeader('Năm học trước')}
      ${ds.length ? `
        <div class="card" style="border-left:4px solid var(--info)">
          <div class="muted small" style="line-height:1.6">
            Thông báo, khảo sát, kế hoạch và lịch sinh hoạt của nhóm con từng học.
            Chỉ hiện phần trong khoảng thời gian con còn ở nhóm đó.
            Ảnh của nhóm nằm ở màn <b>Album ảnh</b>, mục "Album của các năm học trước".
          </div>
        </div>
        <div class="card">
          ${ds.map(k => `
            <div class="list-row clickable" onclick="App.navigate('#/namhoccu/${UI.esc(k.id)}')">
              <div class="row-icon" style="background:#eef1f5;font-size:20px">🗂️</div>
              <div class="row-main">
                <div class="row-title">${UI.esc(k.className || 'Nhóm cũ')}${k.year ? ` · ${UI.esc(k.year)}` : ''}</div>
                <div class="row-sub">${UI.esc(k.studentName)} · ${UI.esc(UI.fmtDateShort(k.tu))} – ${UI.esc(UI.fmtDateShort(k.den))}</div>
              </div>
              <span class="muted">${UI.icon('chevron', 18)}</span>
            </div>`).join('')}
        </div>`
        : UI.emptyState('🗂️', 'Chưa có nhóm cũ nào. Khi con lên nhóm hoặc chuyển nhóm, '
          + 'nội dung của nhóm cũ sẽ hiện ở đây để gia đình xem lại.')}`;
  },

  async renderChiTiet(root, id) {
    const d = await API.get(`/api/namhoccu/${encodeURIComponent(id)}`);
    const k = d.khoang;

    root.innerHTML = `
      ${UI.pageHeader(k.className || 'Nhóm cũ')}
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          <b>${UI.esc(k.studentName)}</b> học nhóm này từ ${UI.esc(UI.fmtDate(k.tu, { weekday: false }))}
          đến ${UI.esc(UI.fmtDate(k.den, { weekday: false }))}${k.year ? ` · năm học ${UI.esc(k.year)}` : ''}.
          Dưới đây chỉ là phần nội dung trong khoảng thời gian đó.
        </div>
      </div>

      <div class="section-label">Thông báo của nhóm (${d.thongBao.length})</div>
      ${d.thongBao.length ? `
        <div class="card">
          ${d.thongBao.map(n => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(n.title)}</div>
                <div style="white-space:pre-wrap;line-height:1.5;margin-top:4px" class="small">${UI.esc(n.body)}</div>
                <div class="row-sub">${UI.esc(n.authorName)} · ${UI.esc(UI.fmtDate(n.createdAt, { weekday: false }))}</div>
              </div>
            </div>`).join('')}
        </div>`
        : UI.emptyState('🔔', 'Không có thông báo riêng của nhóm trong khoảng này')}

      <div class="section-label">Kế hoạch giáo dục (${d.keHoach.length})</div>
      ${d.keHoach.length ? `
        <div class="card">
          ${d.keHoach.map(p => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">Tháng ${UI.esc(p.month)}/${UI.esc(p.year)}${p.theme ? ` · ${UI.esc(p.theme)}` : ''}</div>
                ${Array.isArray(p.goals) && p.goals.length ? `
                  <ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.6">
                    ${p.goals.map(g => `<li>${UI.esc(g)}</li>`).join('')}
                  </ul>` : ''}
              </div>
            </div>`).join('')}
        </div>`
        : UI.emptyState('🗓️', 'Không có kế hoạch nào trong khoảng này')}

      <div class="section-label">Khảo sát đã gửi (${d.khaoSat.length})</div>
      ${d.khaoSat.length ? `
        <div class="card">
          ${d.khaoSat.map(s => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(s.title)}</div>
                <div class="row-sub">Gửi ngày ${UI.esc(UI.fmtDate(s.createdAt, { weekday: false }))}</div>
              </div>
            </div>`).join('')}
        </div>`
        : UI.emptyState('📊', 'Không có khảo sát nào trong khoảng này')}

      ${d.tkb ? `
        <div class="section-label">Lịch sinh hoạt của nhóm</div>
        <div class="card">
          <div class="muted small" style="line-height:1.6">
            Lịch sinh hoạt được lưu một bản duy nhất cho mỗi nhóm, không lưu theo
            từng tuần — nên đây là bản gần nhất của nhóm này, có thể đã được sửa
            sau khi con rời nhóm.
          </div>
          ${this.bangTkb(d.tkb)}
        </div>` : ''}

      <button class="btn outline block mt-14" onclick="App.navigate('#/albums')">
        Xem ảnh của nhóm trong màn Album ảnh
      </button>`;
  },

  // `days` lưu dạng { 1: [môn theo tiết], 2: [...], ... } với 1 = thứ Hai.
  TEN_THU: { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ nhật' },

  bangTkb(tkb) {
    const days = (tkb && tkb.days) || {};
    const thu = Object.keys(days).sort((a, b) => Number(a) - Number(b));
    if (!thu.length) return '<div class="muted small mt-8">Nhóm này chưa có lịch sinh hoạt.</div>';
    return `
      <div class="table-wrap mt-14">
        <table class="simple">
          <tbody>
            ${thu.map(t => `
              <tr>
                <td style="white-space:nowrap"><b>${UI.esc(this.TEN_THU[t] || `Thứ ${t}`)}</b></td>
                <td>${(days[t] || []).map(m => UI.esc(m)).join(' · ')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },
};
