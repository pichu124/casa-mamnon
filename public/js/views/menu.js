// Phân hệ Thực đơn của bé: xem thực đơn tuần này / tuần sau (T2–T6).
// Quản trị soạn từng ngày ngay tại đây và chép được thực đơn tuần liền trước.
App.views.menu = {
  week: 0, // 0 = tuần này, 1 = tuần sau
  MEAL_EMOJI: { breakfast: '🌅', lunch: '🍚', snack: '🍰' },
  // Bộ khung khi soạn một ngày mới tinh.
  BUA_MAC_DINH: [
    { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: [] },
    { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: [] },
    { type: 'snack', label: 'Bữa xế', time: '14:30', items: [] },
  ],
  _editDate: null, // ngày đang soạn trong modal
  _editMeals: null,

  laQuanTri() { return App.state.user && App.state.user.role === 'admin'; },

  async render(root) {
    const qt = this.laQuanTri();
    root.innerHTML = `
      ${UI.pageHeader('Thực đơn của bé', qt ? { action: { id: 'btn-chep-tuan', label: 'Chép tuần trước', icon: 'plus' } } : {})}
      <div class="seg" id="menu-seg">
        <button class="${this.week === 0 ? 'active' : ''}" onclick="App.views.menu.setWeek(0)">Tuần này</button>
        <button class="${this.week === 1 ? 'active' : ''}" onclick="App.views.menu.setWeek(1)">Tuần sau</button>
      </div>
      <div id="menu-days"></div>`;
    if (qt) document.getElementById('btn-chep-tuan').onclick = () => this.chepTuanTruoc();
    await this.load();
  },

  async setWeek(w) {
    if (this.week === w) return;
    this.week = w;
    const seg = document.getElementById('menu-seg');
    if (seg) Array.from(seg.children).forEach((btn, i) => btn.classList.toggle('active', i === w));
    await this.load();
  },

  async load() {
    const zone = document.getElementById('menu-days');
    if (!zone) return;
    zone.innerHTML = '<div class="loading">Đang tải</div>';
    try {
      const data = await API.get(`/api/menu?week=${this.week}`);
      const menus = data.menus || [];
      const today = UI.todayStr();

      if (this.laQuanTri()) {
        // Quản trị: hiện đủ 5 ngày của tuần, ngày trống có nút soạn ngay.
        const coSan = new Map(menus.map(m => [m.date, m]));
        zone.innerHTML = this.ngayTrongTuan(data.from).map(date => {
          const m = coSan.get(date);
          return m ? this.dayCard(m, date === today) : this.dayCardTrong(date, date === today);
        }).join('');
        return;
      }

      if (!menus.length) {
        zone.innerHTML = UI.emptyState('🍽️', this.week === 0
          ? 'Nhà bếp chưa cập nhật thực đơn tuần này, phụ huynh quay lại sau nhé'
          : 'Nhà bếp chưa cập nhật thực đơn tuần sau, phụ huynh quay lại sau nhé');
        return;
      }
      zone.innerHTML = menus.map(m => this.dayCard(m, m.date === today)).join('');
    } catch (err) {
      zone.innerHTML = UI.emptyState('😥', err.message || 'Không tải được thực đơn');
    }
  },

  // 5 ngày T2–T6 của tuần, tính từ ngày Thứ Hai mà máy chủ trả về.
  ngayTrongTuan(from) {
    const monday = UI.parseDate(from);
    return [0, 1, 2, 3, 4].map(i => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  },

  tieuDeNgay(date) {
    const d = UI.parseDate(date);
    return `${UI.DOW[d.getDay()]}, ${UI.fmtDateShort(date)}`;
  },

  // Thẻ một ngày: "Thứ X, dd/mm" + các bữa ăn. Hôm nay có viền primary + badge.
  dayCard(m, isToday) {
    return `
      <div class="card"${isToday ? ' style="border:1.5px solid var(--primary)"' : ''}>
        <div class="card-title">${UI.esc(this.tieuDeNgay(m.date))}
          ${isToday ? `${UI.badge('Hôm nay', 'blue')}` : ''}
          <span class="spacer"></span>
          ${this.laQuanTri() ? `<button class="head-action" onclick="App.views.menu.moSoan('${UI.esc(m.date)}')">${UI.icon('edit', 15)}Sửa</button>` : ''}
        </div>
        ${(m.meals || []).map((meal, i) => this.mealBlock(meal, i)).join('')}
      </div>`;
  },

  // Ngày chưa có thực đơn (chỉ quản trị nhìn thấy dạng này).
  dayCardTrong(date, isToday) {
    return `
      <div class="card"${isToday ? ' style="border:1.5px solid var(--primary)"' : ''}>
        <div class="card-title">${UI.esc(this.tieuDeNgay(date))}
          ${isToday ? `${UI.badge('Hôm nay', 'blue')}` : ''}
          <span class="spacer"></span>
          <button class="head-action" onclick="App.views.menu.moSoan('${UI.esc(date)}')">${UI.icon('plus', 15)}Soạn</button>
        </div>
        <div class="muted small" style="padding:6px 0 2px">Chưa có thực đơn cho ngày này.</div>
      </div>`;
  },

  // Khối một bữa: emoji + tên bữa + giờ, bên dưới là danh sách món (mỗi món 1 dòng).
  mealBlock(meal, i) {
    const emoji = this.MEAL_EMOJI[meal.type] || '🍽️';
    return `
      <div style="padding:10px 0 4px${i ? ';border-top:1px solid var(--line)' : ''}">
        <div class="flex" style="margin-bottom:5px">
          <span style="font-size:19px">${emoji}</span>
          <span style="font-weight:700">${UI.esc(meal.label)}</span>
          ${UI.badge(meal.time, 'gray')}
        </div>
        <div style="padding-left:29px">
          ${(meal.items || []).map(it => `<div style="padding:2px 0;font-size:.9rem;color:#46536a">${UI.esc(it)}</div>`).join('')}
        </div>
      </div>`;
  },

  // ---- Quản trị: soạn một ngày ----

  moSoan(date) {
    this._editDate = date;
    // Gọi lại API để soạn trên dữ liệu mới nhất, tránh ghi đè bản người khác vừa lưu.
    API.get(`/api/menu?week=${this.week}`).then(data => {
      const m = (data.menus || []).find(x => x.date === date);
      this._editMeals = JSON.parse(JSON.stringify(m ? m.meals : this.BUA_MAC_DINH));
      UI.modal(`
        ${this._editMeals.map((bua, j) => `
          <div style="${j ? 'border-top:1px solid var(--line);padding-top:10px;margin-top:12px' : ''}">
            <div class="grid-2">
              <div class="field">
                <label>Tên bữa</label>
                <input id="td-label-${j}" value="${UI.esc(bua.label)}" placeholder="VD: Bữa trưa">
              </div>
              <div class="field">
                <label>Giờ ăn</label>
                <input id="td-time-${j}" value="${UI.esc(bua.time || '')}" placeholder="VD: 10:45">
              </div>
            </div>
            <div class="field">
              <label>Món ăn — mỗi dòng một món</label>
              <textarea id="td-items-${j}" rows="3" placeholder="VD: Cơm trắng ⏎ Thịt kho trứng ⏎ Canh bí đỏ">${UI.esc((bua.items || []).join('\n'))}</textarea>
            </div>
          </div>`).join('')}
        <button class="btn primary block" onclick="App.views.menu.luuSoan()">${UI.icon('check', 18)} Lưu thực đơn</button>
      `, `Thực đơn ${this.tieuDeNgay(date)}`);
    }).catch(err => UI.toast(err.message, 'error'));
  },

  async luuSoan() {
    const meals = this._editMeals.map((bua, j) => ({
      type: bua.type || 'other',
      label: (document.getElementById(`td-label-${j}`)?.value || '').trim(),
      time: (document.getElementById(`td-time-${j}`)?.value || '').trim(),
      items: (document.getElementById(`td-items-${j}`)?.value || '')
        .split('\n').map(s => s.trim()).filter(Boolean),
    }));
    if (meals.some(m => !m.label)) return UI.toast('Mỗi bữa cần có tên bữa', 'error');
    try {
      await API.put(`/api/menu/${encodeURIComponent(this._editDate)}`, { meals });
      UI.toast('Đã lưu thực đơn', 'success');
      UI.closeModal();
      await this.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Chép tuần liền trước vào tuần đang xem — chỉ đổ vào ngày còn trống.
  async chepTuanTruoc() {
    try {
      const kq = await API.post('/api/menu/copy-week', { week: this.week });
      UI.toast(kq.daChep
        ? `Đã chép thực đơn cho ${kq.daChep} ngày còn trống`
        : 'Không có ngày nào cần chép (tuần này đã soạn đủ hoặc tuần trước trống)');
      await this.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
