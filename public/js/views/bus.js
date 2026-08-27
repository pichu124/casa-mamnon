// Phân hệ Xe buýt.
// Phụ huynh: tuyến của con đang chọn. Giáo viên: các tuyến có bé của nhóm mình + cập nhật hành trình.
App.views.bus = {
  async render(root) {
    const routes = await API.get('/api/bus');

    if (App.state.user.role === 'teacher') {
      root.innerHTML = `
        ${UI.pageHeader('Xe buýt')}
        ${routes.length
          ? routes.map(r => this.routeCards(r, true)).join('')
          : UI.emptyState('🚌', 'Nhóm của cô chưa có bé nào đăng ký xe đưa đón')}`;
      return;
    }

    const current = App.currentStudent();
    const mine = current ? routes.filter(r => r.studentIds.includes(current.id)) : [];
    root.innerHTML = `
      ${UI.pageHeader('Xe buýt')}
      ${UI.studentBar()}${UI.thanhChonBe()}
      ${mine.length
        ? mine.map(r => this.routeCards(r, false)).join('')
        : UI.emptyState('🚌', 'Con chưa đăng ký dịch vụ xe đưa đón của trường')}`;
  },

  // Bộ 3 thẻ của một tuyến: thông tin, lộ trình, hành trình hôm nay.
  routeCards(r, isTeacher) {
    const names = isTeacher ? (r.classStudentNames || []) : (r.childNames || []);
    const todayLog = (r.log || []).filter(l => new Date(l.time).toDateString() === new Date().toDateString());
    return `
      <div class="card">
        <div class="card-title">${UI.icon('bus', 19)} ${UI.esc(r.name)} <span class="spacer"></span> ${UI.badge(r.plate, 'blue')}</div>
        ${names.length ? `<div class="muted small" style="margin:-6px 0 6px">${isTeacher ? 'Bé của nhóm mình trên tuyến' : 'Con đi tuyến này'}: ${names.map(n => UI.esc(n)).join(', ')}</div>` : ''}
        ${this.contactRow('Tài xế', r.driver)}
        ${this.contactRow('Cô phụ trách', r.monitor)}
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('plan', 19)} Lộ trình</div>
        <div class="timeline">
          ${r.stops.map(st => `
            <div class="tl-item">
              <div class="row-title">${UI.esc(st.name)}</div>
              <div class="tl-time">Đón ${UI.esc(st.pickup)} · Trả ${UI.esc(st.dropoff)}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('clock', 19)} Hành trình hôm nay</div>
        ${todayLog.length
          ? `<div class="timeline">${todayLog.map(l => `
              <div class="tl-item">
                <div class="tl-time">${UI.fmtTime(l.time)}</div>
                <div>${UI.esc(l.text)}</div>
              </div>`).join('')}</div>`
          : '<div class="muted small">Chưa có cập nhật hôm nay</div>'}
        ${isTeacher ? `
          <div class="flex mt-14">
            <input id="bus-log-${UI.esc(r.id)}" placeholder="VD: Xe bắt đầu trả bé"
              style="flex:1;min-width:0;border:1.5px solid var(--line);border-radius:12px;padding:10px 13px;outline:none">
            <button class="btn primary sm" onclick="App.views.bus.addLog('${UI.esc(r.id)}')">Cập nhật</button>
          </div>` : ''}
      </div>`;
  },

  // Dòng liên hệ tài xế / cô phụ trách kèm nút gọi.
  contactRow(label, person) {
    if (!person) return '';
    const tel = String(person.phone || '').replace(/[^\d+]/g, '');
    return `
      <div class="list-row">
        <div class="row-main">
          <div class="row-title">${UI.esc(person.name)}</div>
          <div class="row-sub">${UI.esc(label)} · ${UI.esc(person.phone)}</div>
        </div>
        <a class="btn sm outline" href="tel:${UI.esc(tel)}">${UI.icon('phone', 16)} Gọi</a>
      </div>`;
  },

  // Giáo viên gửi cập nhật hành trình.
  async addLog(routeId) {
    const input = document.getElementById(`bus-log-${routeId}`);
    const text = input ? input.value.trim() : '';
    if (!text) return UI.toast('Vui lòng nhập nội dung cập nhật', 'error');
    try {
      await API.post(`/api/bus/${encodeURIComponent(routeId)}/log`, { text });
      UI.toast('Đã cập nhật hành trình', 'success');
      App.route();
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};
