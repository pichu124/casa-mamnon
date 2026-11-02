// Quản trị — tab Tính năng: bật/tắt phân hệ.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---------- Bật/tắt tính năng ----------
  async tabTinhNang(body) {
    const list = await API.get('/api/admin/modules');
    const loi = list.filter(m => m.loi);
    const khoi = (title, items) => items.length ? `
      <div class="card">
        <div class="card-title">${title}</div>
        ${items.map(m => `
          <div class="list-row">
            <span class="row-icon" style="background:${UI.esc(m.bg || 'var(--bg-2)')};font-size:19px">
              ${m.emoji ? UI.esc(m.emoji) : UI.icon(m.icon || 'info', 20)}
            </span>
            <div class="row-main">
              <div class="row-title">${UI.esc(m.name)}
                ${m.moRong ? UI.badge('Cắm thêm', 'purple') : ''}
                ${m.required ? UI.badge('Phần lõi', 'gray') : ''}</div>
              <div class="row-sub">${UI.esc(m.desc || '')}</div>
              ${m.loi ? `<div class="row-sub" style="color:var(--danger)">Lỗi: ${UI.esc(m.loi)}</div>` : ''}
            </div>
            ${m.required
              ? '<span class="muted small">Luôn bật</span>'
              : `<button class="btn sm ${m.enabled ? 'success-soft' : 'outline'}"
                   onclick="App.views.admin.doiTinhNang('${UI.esc(m.key)}', ${!m.enabled})">
                   ${m.enabled ? 'Đang bật' : 'Đang tắt'}
                 </button>`}
          </div>`).join('')}
      </div>` : '';

    body.innerHTML = `
      <div class="card">
        <p class="muted small" style="line-height:1.6">
          Tắt một tính năng là ẩn nó khỏi màn hình chính của <b>mọi người dùng</b> và
          chặn luôn đường vào dữ liệu của tính năng đó. Dữ liệu đã có vẫn được giữ
          nguyên, bật lại là dùng tiếp bình thường.
        </p>
      </div>
      ${loi.length ? `<div class="card" style="border-left:4px solid var(--danger)">
        <b>${loi.length} tính năng cắm thêm đang lỗi</b> và bị tạm ngưng.
        Các tính năng còn lại vẫn chạy bình thường.</div>` : ''}
      ${khoi('Trên màn hình chính', list.filter(m => !m.nav && !m.moRong))}
      ${khoi('Trên thanh điều hướng', list.filter(m => m.nav && !m.moRong))}
      ${khoi('Tính năng cắm thêm', list.filter(m => m.moRong))}
      <div id="tn-nhan-tin-nn"></div>`;
    this.veCongTacCoNuocNgoai();
  },

  // CÔNG TẮC "PHỤ HUYNH NHẮN TIN CÔ NƯỚC NGOÀI" (Đ242F — F6b). Tải riêng và nuốt
  // lỗi: phân hệ Nhắn tin tắt hay hỏng thì thẻ này không hiện, còn các tính
  // năng khác trên màn vẫn đổi được như thường.
  async veCongTacCoNuocNgoai() {
    const o = document.getElementById('tn-nhan-tin-nn');
    if (!o) return;
    let cd;
    try { cd = await API.get('/api/messages/cai-dat'); } catch (_) { return; }
    if (!cd || !cd.suaDuoc) return;
    o.innerHTML = `
      <div class="card">
        <div class="card-title">Nhắn tin</div>
        <div class="list-row">
          <div class="row-main">
            <div class="row-title">Gia đình nhắn tin với cô nước ngoài</div>
            <div class="row-sub">Tắt thì gia đình không mở được cuộc mới và cả hai bên không gửi thêm tin
              với cô nước ngoài. Tin cũ vẫn đọc được. Bật lại là dùng tiếp như cũ.</div>
          </div>
          <button class="btn sm ${cd.coNuocNgoai ? 'success-soft' : 'outline'}" id="tn-nn-doi">
            ${cd.coNuocNgoai ? 'Đang bật' : 'Đang tắt'}
          </button>
        </div>
      </div>`;
    document.getElementById('tn-nn-doi').onclick = async () => {
      try {
        await API.put('/api/messages/cai-dat', { coNuocNgoai: !cd.coNuocNgoai });
        UI.toast(cd.coNuocNgoai ? 'Đã tắt nhắn tin với cô nước ngoài' : 'Đã bật nhắn tin với cô nước ngoài', 'success');
        this.veCongTacCoNuocNgoai();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async doiTinhNang(key, bat) {
    try {
      const r = await API.put(`/api/admin/modules/${key}`, { enabled: bat });
      UI.toast(r.message, 'success');
      await App.loadModules();      // cập nhật ngay cho chính người quản trị
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
});
