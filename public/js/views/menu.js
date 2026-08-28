// Phân hệ Thực đơn của bé: xem thực đơn tuần này / tuần sau (T2–T6).
//
// NHÀ TRƯỜNG NÓI GÌ VỀ MÀN NÀY
//
// "Giao diện máy tính hơi khó nhìn", và muốn "nhập liệu nhanh nhất có thể".
// Hai câu đó chỉ ra hai chỗ khác nhau:
//
//   • KHÓ NHÌN: 5 ngày xếp dọc thành một cột hẹp dài, phải cuộn mới so được
//     thứ Hai với thứ Sáu — mà so ngang chính là việc người soạn thực đơn làm
//     (tuần này đã có món cá hai lần chưa?). Nay trên màn rộng xếp NGANG,
//     trên điện thoại vẫn một cột như cũ.
//
//   • CHẬM KHI NHẬP: soạn một tuần là mở 5 hộp thoại, mỗi hộp 9 ô, bấm Lưu 5
//     lần. Nay có nút "Soạn cả tuần": 5 ngày trên cùng một trang, mỗi ngày chỉ
//     ba ô gõ món, một nút Lưu duy nhất. Tên bữa và giờ ăn gần như không bao
//     giờ đổi nên GẤP LẠI, mở ra khi cần.
//
// Hộp thoại soạn từng ngày GIỮ NGUYÊN bên cạnh — ai quen cách cũ vẫn dùng
// được, và sửa vội một ngày thì mở một ngày vẫn nhanh hơn mở cả tuần.
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
  _tuan: null,     // cả tuần đang soạn trên màn "Soạn cả tuần"

  laQuanTri() { return App.state.user && App.state.user.role === 'admin'; },

  async render(root) {
    const qt = this.laQuanTri();
    root.innerHTML = `
      ${UI.pageHeader('Thực đơn của bé', qt ? { action: { id: 'btn-chep-tuan', label: 'Chép tuần trước', icon: 'plus' } } : {})}
      <div class="seg" id="menu-seg">
        <button class="${this.week === 0 ? 'active' : ''}" onclick="App.views.menu.setWeek(0)">Tuần này</button>
        <button class="${this.week === 1 ? 'active' : ''}" onclick="App.views.menu.setWeek(1)">Tuần sau</button>
      </div>
      ${qt ? `<button class="btn primary block mb-8" id="btn-soan-tuan">${UI.icon('edit', 18)} Soạn cả tuần một lượt</button>` : ''}
      <div id="menu-days"></div>`;
    if (qt) {
      document.getElementById('btn-chep-tuan').onclick = () => this.chepTuanTruoc();
      document.getElementById('btn-soan-tuan').onclick = () => this.moSoanTuan();
    }
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
        zone.innerHTML = `<div class="luoi-tuan">${this.ngayTrongTuan(data.from).map(date => {
          const m = coSan.get(date);
          return m ? this.dayCard(m, date === today) : this.dayCardTrong(date, date === today);
        }).join('')}</div>`;
        return;
      }

      if (!menus.length) {
        zone.innerHTML = UI.emptyState('🍽️', this.week === 0
          ? 'Nhà bếp chưa cập nhật thực đơn tuần này, phụ huynh quay lại sau nhé'
          : 'Nhà bếp chưa cập nhật thực đơn tuần sau, phụ huynh quay lại sau nhé');
        return;
      }
      zone.innerHTML = `<div class="luoi-tuan">${menus.map(m => this.dayCard(m, m.date === today)).join('')}</div>`;
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

  // ---- Quản trị: SOẠN CẢ TUẦN trên một trang ----

  // Mở màn soạn ngay tại chỗ danh sách, KHÔNG dùng hộp thoại.
  //
  // Hộp thoại trên máy tính là một khung hẹp giữa màn hình rộng — đúng thứ nhà
  // trường kêu khó nhìn. Soạn cả tuần thì cần cả bề ngang.
  async moSoanTuan() {
    const zone = document.getElementById('menu-days');
    if (!zone) return;
    zone.innerHTML = '<div class="loading">Đang tải</div>';
    try {
      // Lấy lại từ máy chủ để soạn trên bản mới nhất, tránh ghi đè thứ người
      // khác vừa lưu.
      const data = await API.get(`/api/menu?week=${this.week}`);
      const coSan = new Map((data.menus || []).map(m => [m.date, m]));
      this._tuan = this.ngayTrongTuan(data.from).map(date => ({
        date,
        meals: JSON.parse(JSON.stringify(
          coSan.get(date) ? coSan.get(date).meals : this.BUA_MAC_DINH)),
      }));
      this.veSoanTuan(zone);
    } catch (err) {
      zone.innerHTML = UI.emptyState('😥', err.message || 'Không tải được thực đơn');
    }
  },

  veSoanTuan(zone) {
    zone.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Mỗi dòng là một món. Gõ xong cả tuần rồi bấm <b>Lưu cả tuần</b> một lần —
          lưu là lưu hết, lỗi ở một ngày thì không ngày nào bị ghi dở.
          Ngày nào để trống thì bỏ qua, không tạo ra một ngày trắng trên màn hình của gia đình.
        </div>
      </div>
      <div class="luoi-tuan dang-soan">
        ${this._tuan.map((ng, i) => this.theSoanNgay(ng, i)).join('')}
      </div>
      <div class="grid-2 mt-14">
        <button class="btn outline" id="td-huy">Quay lại</button>
        <button class="btn primary" id="td-luu-tuan">${UI.icon('check', 18)} Lưu cả tuần</button>
      </div>`;

    document.getElementById('td-huy').onclick = () => this.load();
    document.getElementById('td-luu-tuan').onclick = () => this.luuCaTuan();
    for (const b of zone.querySelectorAll('[data-chep-tu]')) {
      b.onclick = () => this.chepNgayTruoc(Number(b.dataset.chepTu));
    }
  },

  theSoanNgay(ng, i) {
    const homNay = ng.date === UI.todayStr();
    return `
      <div class="card"${homNay ? ' style="border:1.5px solid var(--primary)"' : ''}>
        <div class="card-title">${UI.esc(this.tieuDeNgay(ng.date))}
          ${homNay ? UI.badge('Hôm nay', 'blue') : ''}
          <span class="spacer"></span>
          ${i > 0 ? `<button class="head-action" data-chep-tu="${i}">${UI.icon('plus', 15)}Giống hôm trước</button>` : ''}
        </div>
        ${ng.meals.map((bua, j) => `
          <div class="field" style="margin-bottom:10px">
            <label>${UI.esc(this.MEAL_EMOJI[bua.type] || '🍽️')} ${UI.esc(bua.label || 'Bữa ăn')}</label>
            <textarea id="tt-mon-${i}-${j}" rows="3"
              placeholder="Mỗi dòng một món">${UI.esc((bua.items || []).join('\n'))}</textarea>
          </div>`).join('')}
        <details>
          <summary class="muted small" style="cursor:pointer;padding:4px 0">Sửa tên bữa và giờ ăn</summary>
          ${ng.meals.map((bua, j) => `
            <div class="grid-2" style="margin-top:8px">
              <div class="field" style="margin:0">
                <label>Tên bữa</label>
                <input id="tt-ten-${i}-${j}" value="${UI.esc(bua.label || '')}" placeholder="VD: Bữa trưa">
              </div>
              <div class="field" style="margin:0">
                <label>Giờ ăn</label>
                <input id="tt-gio-${i}-${j}" value="${UI.esc(bua.time || '')}" placeholder="VD: 10:45">
              </div>
            </div>`).join('')}
        </details>
      </div>`;
  },

  // Đọc những gì đang gõ trên màn về lại `_tuan`, để chuyển qua chuyển lại
  // không mất chữ.
  docManHinh() {
    this._tuan.forEach((ng, i) => {
      ng.meals.forEach((bua, j) => {
        const oTen = document.getElementById(`tt-ten-${i}-${j}`);
        const oGio = document.getElementById(`tt-gio-${i}-${j}`);
        const oMon = document.getElementById(`tt-mon-${i}-${j}`);
        if (oTen) bua.label = oTen.value.trim();
        if (oGio) bua.time = oGio.value.trim();
        if (oMon) bua.items = oMon.value.split('\n').map(x => x.trim()).filter(Boolean);
      });
    });
  },

  // "Giống hôm trước" — thứ Ba giống thứ Hai là chuyện thường ở bếp trường, và
  // chép rồi sửa một hai món nhanh hơn gõ lại cả ngày.
  chepNgayTruoc(i) {
    this.docManHinh();
    if (i < 1) return;
    this._tuan[i].meals = JSON.parse(JSON.stringify(this._tuan[i - 1].meals));
    this.veSoanTuan(document.getElementById('menu-days'));
    UI.toast(`Đã chép thực đơn ${this.tieuDeNgay(this._tuan[i - 1].date)} sang`, 'success');
  },

  async luuCaTuan() {
    this.docManHinh();
    const thieuTen = this._tuan.some(ng => ng.meals.some(b => !b.label));
    if (thieuTen) return UI.toast('Mỗi bữa cần có tên bữa — mở "Sửa tên bữa và giờ ăn" để điền nhé', 'error');
    try {
      const kq = await API.put('/api/menu/tuan', {
        ngay: this._tuan.map(ng => ({ date: ng.date, meals: ng.meals })),
      });
      UI.toast(kq.daLuu
        ? `Đã lưu thực đơn cho ${kq.daLuu} ngày`
        : 'Chưa có ngày nào được gõ món, nên chưa lưu gì', kq.daLuu ? 'success' : 'error');
      if (kq.daLuu) await this.load();
    } catch (err) { UI.toast(err.message, 'error'); }
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
