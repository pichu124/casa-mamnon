// Phân hệ Thực đơn bán trú: xem thực đơn tuần này / tuần sau (T2–T6).
App.views.menu = {
  week: 0, // 0 = tuần này, 1 = tuần sau
  MEAL_EMOJI: { breakfast: '🌅', lunch: '🍚', snack: '🍰' },

  async render(root) {
    root.innerHTML = `
      ${UI.pageHeader('Thực đơn bán trú')}
      <div class="seg" id="menu-seg">
        <button class="${this.week === 0 ? 'active' : ''}" onclick="App.views.menu.setWeek(0)">Tuần này</button>
        <button class="${this.week === 1 ? 'active' : ''}" onclick="App.views.menu.setWeek(1)">Tuần sau</button>
      </div>
      <div id="menu-days"></div>`;
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
      if (!menus.length) {
        zone.innerHTML = UI.emptyState('🍽️', this.week === 0
          ? 'Nhà bếp chưa cập nhật thực đơn tuần này, phụ huynh quay lại sau nhé'
          : 'Nhà bếp chưa cập nhật thực đơn tuần sau, phụ huynh quay lại sau nhé');
        return;
      }
      const today = UI.todayStr();
      zone.innerHTML = menus.map(m => this.dayCard(m, m.date === today)).join('');
    } catch (err) {
      zone.innerHTML = UI.emptyState('😥', err.message || 'Không tải được thực đơn');
    }
  },

  // Thẻ một ngày: "Thứ X, dd/mm" + các bữa ăn. Hôm nay có viền primary + badge.
  dayCard(m, isToday) {
    const d = UI.parseDate(m.date);
    const title = `${UI.DOW[d.getDay()]}, ${UI.fmtDateShort(m.date)}`;
    return `
      <div class="card"${isToday ? ' style="border:1.5px solid var(--primary)"' : ''}>
        <div class="card-title">${UI.esc(title)}${isToday ? `<span class="spacer"></span>${UI.badge('Hôm nay', 'blue')}` : ''}</div>
        ${(m.meals || []).map((meal, i) => this.mealBlock(meal, i)).join('')}
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
};
