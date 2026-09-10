// Phân hệ Dặn thuốc.
// Phụ huynh: gửi lời dặn thuốc và theo dõi. Cô: xác nhận đã nhận thuốc, hoàn tất đợt.
//
// KHÔNG CÓ Ô "ĐÃ CHO UỐNG" — ĐÂY LÀ CHỦ Ý CỦA NHÀ TRƯỜNG
//
// Bản đầu (kế thừa từ app 1) có thêm một bước: cô gõ tay từng dòng nhật ký
// kiểu "đã cho con uống sau bữa trưa". Nhà trường bỏ bước đó sau khi chạy thử
// quy trình nhận thuốc thật, vì hai lẽ:
//
//   • Cô đang đứng nhóm với 20 bé thì không rảnh tay mở app gõ từng dòng. Ô
//     nào cô không kịp ghi sẽ nằm trống, mà một dòng trống trên màn hình phụ
//     huynh đọc ra thành "cô quên cho con uống" — sai và mất lòng tin.
//   • Nhà trường không muốn app đứng ra hứa một điều app không kiểm chứng
//     được. Thứ app biết chắc và ghi được là: gia đình đã gửi thuốc, cô đã
//     nhận. Chỉ ghi đúng chừng đó.
//
// Dòng nhật ký CŨ vẫn hiện nguyên — bỏ một bước là ngưng ghi thêm, không phải
// xóa thứ phụ huynh đã đọc thấy.
App.views.medicine = {
  STATUS: {
    pending: { label: 'Chờ xác nhận', cls: 'orange' },
    received: { label: 'Cô đã nhận thuốc', cls: 'blue' },
    done: { label: 'Hoàn tất', cls: 'green' },
  },
  _list: [],

  async render(root) {
    // VAI QUẢN TRỊ KHÔNG PHẢI PHỤ HUYNH.
    //
    // Nhánh cũ chỉ hỏi `role === 'teacher'`, nên hiệu trưởng và văn phòng rơi
    // vào màn của PHỤ HUYNH: được mời điền phiếu / gửi đơn, bấm vào là nhận
    // "Không có quyền thực hiện". Nặng hơn phần thẩm mỹ — "lấy ý kiến phụ
    // huynh" và "nhận thuốc gia đình gửi" đều là việc của văn phòng, mà văn
    // phòng lại là vai duy nhất không có nút để làm.
    //
    // Dùng được `renderTeacher` cho quản trị vì nhánh đó CHỈ hỏi máy chủ
    // (`/api/surveys`, `/api/medicine`) — máy chủ tự cắt theo phạm vi người
    // gọi — và mọi đường ghi của nó đã nhận `requireRole('teacher', 'admin')`
    // từ đầu. KHÔNG dùng được ở màn Điểm danh: nhánh cô ở đó đọc
    // `user.nhomCuaCo`, mà `routes/auth.js` chỉ gán ô ấy cho vai `teacher`
    // (xem chú thích Đ97 ở public/js/views/attendance.js).
    if (App.state.user.role !== 'parent') return this.renderTeacher(root);
    return this.renderParent(root);
  },

  // ---- Phụ huynh: danh sách đơn dặn thuốc của các con ----
  async renderParent(root) {
    this._list = await API.get('/api/medicine');
    const manyKids = (App.state.students || []).length > 1;
    root.innerHTML = `
      ${UI.pageHeader('Dặn thuốc', { action: { id: 'btn-new-med', label: 'Dặn thuốc', icon: 'plus' } })}
      ${this._list.length
        ? this._list.map(m => this.parentCard(m, manyKids)).join('')
        : UI.emptyState('💊', 'Chưa có đơn dặn thuốc nào. Khi con cần uống thuốc ở trường, gia đình bấm "Dặn thuốc" để nhờ cô nhé.')}`;
    document.getElementById('btn-new-med').onclick = () => this.openCreate();
  },

  parentCard(m, manyKids) {
    const st = this.STATUS[m.status] || { label: m.status, cls: 'gray' };
    return `
      <div class="card">
        <div class="flex">
          ${UI.badge(st.label, st.cls)}
          <span class="spacer"></span>
          <span class="muted small">📅 ${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</span>
        </div>
        ${manyKids ? `<div class="small mt-8" style="font-weight:700">🎒 ${UI.esc(m.studentName)}</div>` : ''}
        <div class="mt-8">${this.medsTable(m.medicines)}</div>
        ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
        ${(m.status === 'received' || m.status === 'done') && m.confirmedAt
          ? `<div class="small mt-8" style="color:#1e8e4e;font-weight:600">✅ ${UI.esc(m.confirmedByName || 'Cô')} đã nhận lúc ${UI.esc(UI.fmtTime(m.confirmedAt))} ${UI.esc(UI.fmtDateShort(m.confirmedAt))}</div>`
          : ''}
        ${m.log && m.log.length ? `<div class="timeline mt-14">${this.logItems(m.log)}</div>` : ''}
        <button class="btn sm outline mt-8" data-dan-lai="${UI.esc(m.id)}" onclick="App.views.medicine.danLai('${UI.maAnToan(m.id)}')">
          ${UI.icon('plus', 14)} Dặn lại như đơn này
        </button>
      </div>`;
  },

  // DẶN LẠI ĐƠN CŨ (Đ134). Nhà trường 07/09: "có thể sao chép lại các đơn dặn
  // trước đó". Bé uống một loại siro ho ba đợt trong mùa lạnh là chuyện
  // thường; gõ lại tên thuốc, liều, thời điểm mỗi lần là thứ làm gia đình bỏ
  // dặn qua app mà quay về nhắn tin cho cô. Chép THUỐC và GHI CHÚ; ngày dùng
  // để hôm nay vì đợt mới là đợt mới.
  danLai(id) {
    const m = (this._list || []).find(x => x.id === id);
    if (!m) return;
    this.openCreate({ studentId: m.studentId, medicines: m.medicines || [], note: m.note || '' });
  },

  openCreate(mau) {
    const students = App.state.students || [];
    const current = App.currentStudent();
    const today = UI.todayStr();
    const chonSan = mau && mau.studentId ? mau.studentId : (current ? current.id : null);
    const dsThuoc = mau && Array.isArray(mau.medicines) && mau.medicines.length ? mau.medicines : [null];
    UI.modal(`
      ${students.length > 1 ? `
        <div class="field">
          <label>Dặn thuốc cho con</label>
          <select id="md-student">
            ${students.map(s => `<option value="${UI.esc(s.id)}" ${s.id === chonSan ? 'selected' : ''}>${UI.esc(s.name)} · ${UI.esc(s.className)}</option>`).join('')}
          </select>
        </div>` : `
        <div class="field">
          <label>Dặn thuốc cho con</label>
          <input value="${UI.esc(current ? `${current.name} · ${current.className}` : '')}" disabled>
        </div>`}
      ${mau ? `<div class="muted small mb-8">Đã chép thuốc và ghi chú từ đơn trước — gia đình xem lại rồi sửa nếu cần.</div>` : ''}
      <div class="grid-2">
        <div class="field">
          <label>Dùng từ ngày</label>
          <input type="date" id="md-from" value="${UI.esc(today)}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="md-to" value="${UI.esc(today)}">
        </div>
      </div>
      <div class="field">
        <label>Các loại thuốc</label>
        <div id="md-meds">${dsThuoc.map(t => this.medFieldset(t)).join('')}</div>
        <button class="btn outline sm mt-8" onclick="App.views.medicine.addMed()">${UI.icon('plus', 15)} Thêm thuốc</button>
      </div>
      <div class="field">
        <label>Ghi chú gửi cô</label>
        <textarea id="md-note" placeholder="Ví dụ: Thuốc để trong ba lô, ngăn trước. Nhờ cô cho con uống đúng giờ giúp gia đình ạ.">${UI.esc(mau && mau.note ? mau.note : '')}</textarea>
        <div class="hint">Cô phụ trách sẽ xác nhận khi đã nhận thuốc của con.</div>
      </div>
      <button class="btn primary block" onclick="App.views.medicine.submitCreate()">${UI.icon('send', 18)} Gửi lời dặn thuốc</button>
    `, 'Dặn thuốc cho con');
  },

  // Một khối nhập thông tin thuốc trong biểu mẫu. `t` là thuốc điền sẵn khi
  // dặn lại đơn cũ; không có thì ô trống.
  medFieldset(t) {
    const v = (k) => UI.esc(t && t[k] ? String(t[k]) : '');
    return `
      <div class="med-item" style="border:1.5px solid var(--line);border-radius:12px;padding:10px;margin-bottom:8px">
        <div class="flex" style="margin-bottom:8px">
          <input class="md-name" value="${v('name')}" placeholder="Tên thuốc (VD: Siro ho Prospan)" style="flex:1;border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
          <button class="btn danger-soft sm" style="flex:none;padding:8px 10px" onclick="App.views.medicine.removeMed(this)" aria-label="Xóa thuốc">${UI.icon('x', 15)}</button>
        </div>
        <div class="grid-2">
          <input class="md-dose" value="${v('dose')}" placeholder="Liều dùng (VD: 5ml)" style="border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
          <input class="md-timing" value="${v('timing')}" placeholder="Thời điểm (VD: Sau bữa trưa)" style="border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0">
        </div>
      </div>`;
  },

  addMed() {
    document.getElementById('md-meds').insertAdjacentHTML('beforeend', this.medFieldset());
  },

  removeMed(btn) {
    const wrap = document.getElementById('md-meds');
    if (wrap.querySelectorAll('.med-item').length <= 1) {
      return UI.toast('Cần ít nhất một loại thuốc trong đơn', 'error');
    }
    btn.closest('.med-item').remove();
  },

  async submitCreate() {
    const sel = document.getElementById('md-student');
    const current = App.currentStudent();
    const studentId = sel ? sel.value : (current ? current.id : null);
    const fromDate = document.getElementById('md-from').value;
    const toDate = document.getElementById('md-to').value;
    const note = document.getElementById('md-note').value.trim();
    if (!fromDate || !toDate) return UI.toast('Gia đình chọn ngày dùng thuốc giúp cô nhé', 'error');
    if (fromDate > toDate) return UI.toast('Ngày bắt đầu phải trước hoặc trùng ngày kết thúc', 'error');
    const medicines = [...document.querySelectorAll('#md-meds .med-item')].map(it => ({
      name: it.querySelector('.md-name').value.trim(),
      dose: it.querySelector('.md-dose').value.trim(),
      timing: it.querySelector('.md-timing').value.trim(),
    })).filter(m => m.name || m.dose || m.timing);
    if (!medicines.length) return UI.toast('Gia đình thêm ít nhất một loại thuốc nhé', 'error');
    if (medicines.some(m => !m.name)) return UI.toast('Gia đình nhập tên cho từng loại thuốc nhé', 'error');
    try {
      await API.post('/api/medicine', { studentId, fromDate, toDate, medicines, note });
      UI.toast('Đã gửi lời dặn thuốc tới cô giáo', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // CẮT BỚT MÀ KHÔNG NÓI RA THÌ VỚI NGƯỜI DÙNG ĐÓ LÀ GIẤU.
  //
  // Cùng hình dạng và cùng cách vá với màn Xin phép nghỉ — xem khối chú thích
  // ở public/js/views/leave.js. Máy chủ cắt phần ĐÃ HOÀN TẤT ở 60 đơn gần
  // nhất; đơn chưa xong thì không bao giờ cắt, nên hai con số "Chờ xác nhận
  // (N)" và "Cô đã nhận thuốc (N)" luôn đúng.
  MOI_TRANG: 60,
  TRAN_LICH_SU: 500,

  // ---- Cô: xác nhận đã nhận thuốc, cất đơn khi hết đợt ----
  async renderTeacher(root) {
    this._gioiHan = this._gioiHan || this.MOI_TRANG;
    this._list = await API.get(`/api/medicine?gioiHan=${this._gioiHan}`);
    const pending = this._list.filter(m => m.status === 'pending');
    const received = this._list.filter(m => m.status === 'received');
    const done = this._list.filter(m => m.status === 'done');
    const conNua = done.length >= this._gioiHan && this._gioiHan < this.TRAN_LICH_SU;
    root.innerHTML = `
      ${UI.pageHeader('Dặn thuốc')}
      <div class="section-label">Chờ xác nhận (${pending.length})</div>
      ${pending.length
        ? pending.map(m => `
          <div class="card">
            ${this.teacherHead(m)}
            <div class="mt-8">${this.medsTable(m.medicines)}</div>
            ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
            <button class="btn success-soft block mt-14" onclick="App.views.medicine.confirm('${UI.esc(m.id)}')">${UI.icon('check', 18)} Xác nhận đã nhận thuốc</button>
          </div>`).join('')
        : UI.emptyState('✅', 'Không có đơn dặn thuốc nào chờ xác nhận')}

      ${received.length ? `
        <div class="section-label">Cô đã nhận thuốc (${received.length})</div>
        ${received.map(m => `
          <div class="card">
            ${this.teacherHead(m)}
            <div class="mt-8">${this.medsTable(m.medicines)}</div>
            ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
            ${m.log && m.log.length ? `<div class="timeline mt-14">${this.logItems(m.log)}</div>` : ''}
            <button class="btn outline block mt-14" onclick="App.views.medicine.markDone('${UI.esc(m.id)}')">${UI.icon('check', 16)} Hết đợt thuốc, cất khỏi danh sách</button>
          </div>`).join('')}` : ''}

      ${done.length ? `
        <div class="section-label">Đã hoàn tất (${done.length})</div>
        <div class="card">
          ${done.map((m, i) => `
            <div class="list-row clickable" data-xem-thuoc="${UI.esc(String(i))}">
              ${UI.avatar(m.studentAvatar, 40)}
              <div class="row-main">
                <div class="row-title">${UI.esc(m.studentName)}</div>
                <div class="row-sub">${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</div>
                <div class="row-sub">${UI.esc(this.tomTatThuoc(m.medicines))}</div>
              </div>
              <div class="row-end">${UI.badge('Hoàn tất', 'green')}</div>
            </div>`).join('')}
        </div>
        ${conNua ? `
          <div class="hint mt-8">Đang hiện ${done.length} đơn đã hoàn tất gần nhất.</div>
          <button class="btn outline block mt-8" id="btn-thuoc-cu-hon">
            ${UI.icon('plus', 16)} Xem đơn cũ hơn
          </button>` : ''}` : ''}`;

    // MỞ LẠI ĐƠN ĐÃ HOÀN TẤT (Đ153 / DT-03).
    //
    // Trước đợt này mục "Đã hoàn tất" chỉ có tên bé và khoảng ngày — không bấm
    // vào được. Nghĩa là khi gia đình hỏi lại "hôm ấy cô cho con uống thuốc gì,
    // mấy giờ", cô không tra được, dù mọi thứ vẫn nằm nguyên trong kho. Sổ
    // liên lạc giấy thì lật lại được; đây là chỗ app đang thua quyển sổ.
    for (const b of root.querySelectorAll('[data-xem-thuoc]')) {
      b.onclick = () => this.xemDonDaXong(done[Number(b.dataset.xemThuoc)]);
    }

    const themNua = document.getElementById('btn-thuoc-cu-hon');
    if (themNua) {
      themNua.onclick = async () => {
        themNua.disabled = true;
        themNua.textContent = 'Đang tải…';
        this._gioiHan = Math.min(this.TRAN_LICH_SU, this._gioiHan + this.MOI_TRANG);
        try { await this.renderTeacher(root); }
        catch (err) { themNua.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
  },

  // Phần đầu thẻ đơn phía giáo viên: bé, phụ huynh, khoảng ngày.
  teacherHead(m) {
    return `
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(m.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(m.studentName)}</div>
          <div class="row-sub">${UI.esc(m.parentName)} · 📅 ${UI.esc(UI.fmtDateShort(m.fromDate))} – ${UI.esc(UI.fmtDateShort(m.toDate))}</div>
        </div>
        ${this.statusBadge(m.status)}
      </div>`;
  },

  async confirm(id) {
    try {
      await API.post(`/api/medicine/${id}/confirm`);
      UI.toast('Đã nhận thuốc từ gia đình', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async markDone(id) {
    try {
      await API.post(`/api/medicine/${id}/done`);
      UI.toast('Đã cất đơn thuốc khỏi danh sách đang nhận', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Tiện ích ----
  statusBadge(status) {
    const st = this.STATUS[status] || { label: status, cls: 'gray' };
    return UI.badge(st.label, st.cls);
  },

  // Một dòng tóm tắt tên thuốc, để dòng trong danh sách "Đã hoàn tất" nói được
  // ít nhất một chữ về nội dung — cô liếc qua là biết đơn nào.
  tomTatThuoc(medicines) {
    const ds = (medicines || []).map(m => m.name).filter(Boolean);
    if (!ds.length) return 'Không ghi tên thuốc';
    return ds.length <= 3 ? ds.join(', ') : `${ds.slice(0, 3).join(', ')} và ${ds.length - 3} thuốc nữa`;
  },

  // Xem lại một đơn ĐÃ HOÀN TẤT — chỉ đọc, không có nút nào đổi trạng thái.
  //
  // Đơn đã cất đi là chuyện đã qua; mở lại nó ra để tra, không phải để sửa.
  // Có nút "mở lại đợt thuốc" ở đây là mở đường cho một đơn hết hạn quay về
  // danh sách đang dùng mà gia đình không hề biết.
  xemDonDaXong(m) {
    if (!m) return;
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(m.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(m.studentName)}</div>
          <div class="row-sub">${UI.esc(UI.fmtDate(m.fromDate, { weekday: false }))} – ${UI.esc(UI.fmtDate(m.toDate, { weekday: false }))}</div>
        </div>
        <div class="row-end">${UI.badge('Hoàn tất', 'green')}</div>
      </div>
      <div class="mt-14">${this.medsTable(m.medicines)}</div>
      ${m.note ? `<div class="muted small mt-8">📝 ${UI.esc(m.note)}</div>` : ''}
      ${m.log && m.log.length
    ? `<div class="section-label">Nhật ký đơn này</div><div class="timeline">${this.logItems(m.log)}</div>`
    : '<div class="muted small mt-14">Đơn này không có dòng nhật ký nào.</div>'}
      <div class="muted small mt-14" style="line-height:1.6">
        Đơn đã cất đi thì chỉ mở ra xem lại, không sửa được nữa. Gia đình cần dặn tiếp
        thì gửi một đơn mới.
      </div>
    `, 'Đơn dặn thuốc đã hoàn tất');
  },

  medsTable(medicines) {
    return `
      <div class="table-wrap">
        <table class="simple">
          <thead><tr><th>Thuốc</th><th>Liều</th><th>Thời điểm</th></tr></thead>
          <tbody>
            ${(medicines || []).map(m => `
              <tr>
                <td style="font-weight:600">${UI.esc(m.name)}</td>
                <td>${UI.esc(m.dose || '—')}</td>
                <td>${UI.esc(m.timing || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  logItems(log) {
    return log.map(e => `
      <div class="tl-item">
        <div class="tl-time">${UI.esc(UI.fmtDateShort(e.time))} · ${UI.esc(UI.fmtTime(e.time))}</div>
        <div class="small">${UI.esc(e.text)}</div>
      </div>`).join('');
  },
};
