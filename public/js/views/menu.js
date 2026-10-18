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
  MEAL_EMOJI: { breakfast: '🌅', snack_sang: '🍎', lunch: '🍚', snack: '🍰', milk: '🥛' },
  // Bộ khung khi soạn một ngày mới tinh — NĂM BỮA theo đúng cấu trúc nhà
  // trường chốt 07/09; tên và giờ theo ảnh mẫu 16/10: "Bữa sáng 8h / Bữa phụ
  // sáng 9h30 / Bữa trưa 11h20 / Bữa phụ chiều 14h / Bữa sữa chiều". Ba `type`
  // cũ (breakfast, lunch, snack) giữ nguyên tên vì
  // Nhật ký ngày đọc đúng ba mã đó để ghép "hôm nay con ăn gì" — bữa phụ
  // chiều vẫn là `snack`, nên ô "Bữa xế" của nhật ký vẫn nối đúng bữa.
  // Thực đơn đã soạn giữ nguyên tên và giờ của nó; khung năm bữa chỉ áp cho
  // ngày soạn mới.
  BUA_MAC_DINH: [
    { type: 'breakfast', label: 'Bữa sáng', time: '08:00', items: [] },
    { type: 'snack_sang', label: 'Bữa phụ sáng', time: '09:30', items: [] },
    { type: 'lunch', label: 'Bữa trưa', time: '11:20', items: [] },
    { type: 'snack', label: 'Bữa phụ chiều', time: '14:00', items: [] },
    { type: 'milk', label: 'Bữa sữa chiều', time: '15:30', items: [] },
  ],
  // Ngày đang xem: 1..5 = Thứ Hai..Thứ Sáu, 'tuan' = cả tuần một lượt.
  // Gia đình và cô mở trên điện thoại: một ngày một màn, bấm T2/T3 như bên
  // Lịch sinh hoạt (nhà trường yêu cầu 07/09). Văn phòng soạn trên máy tính:
  // mặc định cả tuần, vì soạn là phải nhìn được cả năm ngày cạnh nhau.
  ngay: null,
  _editDate: null, // ngày đang soạn trong modal
  _editMeals: null,
  _tuan: null,     // cả tuần đang soạn trên màn "Soạn cả tuần"

  laQuanTri() { return App.state.user && App.state.user.role === 'admin'; },

  // Cơ sở đang xem. Chỉ có nghĩa với quản trị Cấp 1 — người duy nhất chọn được
  // giữa nhiều cơ sở. Quản lý cơ sở và cô, gia đình đều bị máy chủ neo sẵn vào
  // đúng cơ sở của mình, nên ô chọn không hiện ra cho họ.
  _coSo: '',
  _tenCoSo: '',
  _cacCoSo: [],
  _dungChung: false,

  async render(root) {
    const qt = this.laQuanTri();
    if (this.ngay === null) {
      const dw = UI.thuVN();
      this.ngay = qt ? 'tuan' : (dw >= 1 && dw <= 5 ? dw : 1);
    }
    root.innerHTML = `
      ${UI.pageHeader('Thực đơn của bé', qt ? { action: { id: 'btn-chep-tuan', label: 'Chép tuần trước', icon: 'plus' } } : {})}
      <div class="seg" id="menu-seg">
        <button class="${this.week === 0 ? 'active' : ''}" onclick="App.views.menu.setWeek(0)">Tuần này</button>
        <button class="${this.week === 1 ? 'active' : ''}" onclick="App.views.menu.setWeek(1)">Tuần sau</button>
      </div>
      ${this.segNgay()}
      <div id="menu-coso"></div>
      <div id="menu-tep"></div>
      ${qt ? '<div id="menu-excel"></div>' : ''}
      ${qt ? `<button class="btn primary block mb-8" id="btn-soan-tuan">${UI.icon('edit', 18)} Soạn cả tuần một lượt</button>` : ''}
      <div id="menu-nhac"></div>
      <div id="menu-days"></div>`;
    if (qt) {
      document.getElementById('btn-chep-tuan').onclick = () => this.chepTuanTruoc();
      document.getElementById('btn-soan-tuan').onclick = () => this.moSoanTuan();
    }
    this.ganSegNgay(root);
    await this.load();
  },

  // Đang soạn cả tuần mà chuyển tuần / chuyển bếp là màn hình vẽ lại — mất
  // sạch phần đã gõ, không hỏi một câu. Cờ này bật khi màn soạn dựng lên và
  // tắt khi màn xem quay lại; mọi đường rời màn soạn đi qua một câu hỏi.
  _dangSoanTuan: false,

  boSoanNeuDongY() {
    if (!this._dangSoanTuan) return true;
    const dongY = confirm('Đang soạn dở thực đơn cả tuần — rời đi là mất phần đã gõ chưa lưu.\n\nVẫn rời đi?');
    if (dongY) this._dangSoanTuan = false;
    return dongY;
  },

  async setWeek(w) {
    if (this.week === w) return;
    if (!this.boSoanNeuDongY()) return;
    this.week = w;
    const seg = document.getElementById('menu-seg');
    if (seg) Array.from(seg.children).forEach((btn, i) => btn.classList.toggle('active', i === w));
    await this.load();
  },

  // Dải chọn ngày: T2 … T6 và "Cả tuần". Gắn sự kiện bằng `data-ngay` sau
  // khi vẽ (xem `ganSegNgay`), không nhét giá trị vào chuỗi onclick.
  segNgay() {
    const o = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], ['tuan', 'Cả tuần']];
    return `<div class="seg" id="menu-ngay-seg">
      ${o.map(([v, t]) => `<button type="button" data-ngay="${v}" class="${String(this.ngay) === String(v) ? 'active' : ''}">${t}</button>`).join('')}
    </div>`;
  },

  ganSegNgay(root) {
    for (const b of root.querySelectorAll('#menu-ngay-seg [data-ngay]')) {
      b.onclick = () => this.setNgay(b.dataset.ngay);
    }
  },

  async setNgay(v) {
    const moi = v === 'tuan' ? 'tuan' : Number(v);
    if (String(this.ngay) === String(moi)) return;
    if (!this.boSoanNeuDongY()) return;
    this.ngay = moi;
    const seg = document.getElementById('menu-ngay-seg');
    if (seg) Array.from(seg.children).forEach(btn => {
      btn.classList.toggle('active', String(btn.dataset.ngay) === String(moi));
    });
    await this.load();
  },

  // Những ngày của tuần cần vẽ: một ngày đang chọn, hoặc cả năm ngày.
  ngayCanVe(from) {
    const ds = this.ngayTrongTuan(from);
    if (this.ngay === 'tuan') return ds;
    return [ds[(Number(this.ngay) || 1) - 1]];
  },

  async load() {
    const zone = document.getElementById('menu-days');
    if (!zone) return;
    this._dangSoanTuan = false;
    zone.innerHTML = '<div class="loading">Đang tải</div>';
    try {
      const data = await API.get(this.duongDanTuan());
      const menus = data.menus || [];
      const today = UI.todayStr();
      this._coSo = data.campusId || '';
      this._tenCoSo = data.tenCoSo || '';
      this._cacCoSo = data.cacCoSo || [];
      this.veCoSo();
      this.veTep(data.tep || [], data.from, !!data.taiTepDuoc);
      if (this.laQuanTri()) this.veExcel(data.from);
      this.veNhac(menus, data.from);

      const coSan = new Map(menus.map(m => [m.date, m]));
      const cacNgay = this.ngayCanVe(data.from);
      if (this.laQuanTri()) {
        // Quản trị: đủ 5 ngày của tuần (hoặc một ngày đang chọn), ngày trống có nút soạn ngay.
        zone.innerHTML = `<div class="luoi-tuan">${cacNgay.map(date => {
          const m = coSan.get(date);
          return m ? this.dayCard(m, date === today) : this.dayCardTrong(date, date === today);
        }).join('')}</div>`;
        return;
      }

      const coMon = cacNgay.filter(date => coSan.get(date));
      if (!coMon.length) {
        zone.innerHTML = UI.emptyState('🍽️', this.ngay === 'tuan'
          ? (this.week === 0
            ? 'Nhà bếp chưa cập nhật thực đơn tuần này, phụ huynh quay lại sau nhé'
            : 'Nhà bếp chưa cập nhật thực đơn tuần sau, phụ huynh quay lại sau nhé')
          : 'Nhà bếp chưa cập nhật thực đơn ngày này — bấm "Cả tuần" để xem những ngày đã có');
        return;
      }
      zone.innerHTML = `<div class="luoi-tuan">${coMon.map(date => this.dayCard(coSan.get(date), date === today)).join('')}</div>`;
    } catch (err) {
      zone.innerHTML = UI.emptyState('😥', err.message || 'Không tải được thực đơn');
    }
  },

  // BA CƠ SỞ NẤU RIÊNG BẾP — nói rõ đây là bếp nào.
  //
  // Với gia đình và cô thì đây chỉ là một dòng chữ: họ không chọn được, và
  // cũng không nên thấy tên hai cơ sở kia trong màn thực đơn của con mình.
  // Với quản trị Cấp 1 thì là một ô chọn — họ soạn hộ được cả ba bếp.
  veCoSo() {
    const o = document.getElementById('menu-coso');
    if (!o) return;
    if (this._cacCoSo.length > 1) {
      o.innerHTML = `
        <div class="card">
          <div class="field" style="margin-bottom:0">
            <label>Bếp của cơ sở</label>
            <select id="menu-chon-coso">
              <option value="">Dùng chung cho mọi cơ sở</option>
              ${this._cacCoSo.map(c => `<option value="${UI.esc(c.id)}" ${c.id === this._coSo ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>`;
      document.getElementById('menu-chon-coso').onchange = (e) => {
        if (!this.boSoanNeuDongY()) { e.target.value = this._coSo; return; }
        this._coSo = e.target.value;
        this.load();
      };
      return;
    }
    o.innerHTML = this._tenCoSo
      ? `<div class="muted small" style="margin:-4px 0 10px">Bếp ${UI.esc(this._tenCoSo)}</div>`
      : '';
  },

  // NHẮC ĐĂNG THỰC ĐƠN TUẦN SAU VÀO THỨ SÁU.
  //
  // Nhà trường chốt nếp làm việc: "thực đơn này sẽ được admin cơ sở up lên vào
  // thứ 6 hàng tuần để thông báo thực đơn và kế hoạch học tập cho tuần tới".
  //
  // Đây là một LỜI NHẮC, không phải một chốt chặn. Chặn không cho làm việc
  // khác cho tới khi soạn xong là biến một nếp tốt thành một cái cửa khoá, và
  // thứ Sáu là hôm bận nhất của văn phòng. Nhắc thì người ta làm; chặn thì
  // người ta tìm đường vòng.
  // ---- Thực đơn bằng tệp Excel mẫu THEO TUẦN (góp ý 06/10 mục 3; 16/10 mục 1) ----
  //
  // 06/10: *"hãy tạo 1 form mẫu bằng Excel theo đúng cấu trúc bạn cần, sau đó
  // mình sẽ up lên và bạn sẽ tự điền vào từng ngày"*. 16/10: *"Để upload theo
  // tuần k cần để theo tháng"* — mẫu nay là MỘT TUẦN đúng khuôn bảng của trường
  // (cột là Thứ Hai → Thứ Sáu, hàng là món của từng bữa, mỗi ô một món). Chọn
  // tuần → tải mẫu (món đã có điền sẵn) → điền, hay dán bảng của trường → nạp
  // lên → xem trước từng ngày → Lưu. Ngày để trống trong tệp không bị đụng tới.
  // Tệp khuôn tháng đã điền trước đây vẫn nạp được (máy chủ tự nhận khuôn).
  // Ô "Dán bảng" của Đ132 đã gỡ ở Đ231 (chủ dự án chốt 07/10): tệp mẫu là
  // đường duy nhất để đổ thực đơn từ Excel.
  _tuanXl: '',   // Thứ Hai của tuần đang chọn ở thẻ Excel

  congNgay(iso, n) {
    const d = UI.parseDate(iso);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // "Tuần 19/10 – 23/10/2026" (qua năm thì ghi năm ở cả hai đầu).
  tenTuan(thuHai) {
    const t6 = this.congNgay(thuHai, 4);
    const nam = thuHai.slice(0, 4) === t6.slice(0, 4) ? '' : `/${thuHai.slice(0, 4)}`;
    return `Tuần ${UI.fmtDateShort(thuHai)}${nam} – ${UI.fmtDateShort(t6)}/${t6.slice(0, 4)}`;
  },

  veExcel(tuNgay) {
    const o = document.getElementById('menu-excel');
    if (!o) return;
    // `tuNgay` là Thứ Hai của tuần đang xem, do máy chủ tính theo giờ Việt Nam.
    const nay = this.congNgay(tuNgay, -7 * this.week);
    const cacTuan = [['tuần này', 0], ['tuần sau', 7], ['tuần sau nữa', 14]].map(([ten, n]) => ({ ten, t2: this.congNgay(nay, n) }));
    // Mặc định tuần sau — tuần văn phòng soạn vào thứ Sáu; vẽ lại thì giữ tuần đã chọn.
    if (!cacTuan.some(t => t.t2 === this._tuanXl)) this._tuanXl = cacTuan[1].t2;
    o.innerHTML = `
      <div class="card">
        <div class="card-title">📊 Thực đơn bằng tệp Excel</div>
        <div class="muted small" style="line-height:1.6;margin-bottom:8px">
          Chọn tuần rồi tải tệp mẫu về: mỗi cột là một ngày từ Thứ Hai đến Thứ Sáu, mỗi ô một món
          (bữa sáng 3 dòng riêng). Điền món — hoặc dán bảng thực đơn của trường vào — rồi nạp lên,
          app tự đặt món vào đúng từng ngày của tuần đã chọn. Ngày để trống trong tệp thì giữ nguyên.
        </div>
        <div class="field" style="margin-bottom:8px">
          <label for="mn-xl-tuan">Thực đơn của tuần</label>
          <select id="mn-xl-tuan">
            ${cacTuan.map(t => `<option value="${UI.esc(t.t2)}" ${t.t2 === this._tuanXl ? 'selected' : ''}>${UI.esc(this.tenTuan(t.t2))} (${UI.esc(t.ten)})</option>`).join('')}
          </select>
        </div>
        <a class="btn outline block" id="mn-xl-tai" href="#">📥 Tải tệp mẫu</a>
        <button class="btn primary block mt-8" id="mn-xl-nap">📤 Nạp tệp Excel đã điền</button>
        <input type="file" id="mn-xl-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">
      </div>`;
    const lienKet = () => `/api/menu/mau-excel?tuan=${encodeURIComponent(this._tuanXl)}`
      + (this._coSo ? `&campusId=${encodeURIComponent(this._coSo)}` : '');
    const tai = document.getElementById('mn-xl-tai');
    tai.href = lienKet();
    const chon = document.getElementById('mn-xl-tuan');
    chon.onchange = () => { this._tuanXl = chon.value; tai.href = lienKet(); };
    const oFile = document.getElementById('mn-xl-file');
    document.getElementById('mn-xl-nap').onclick = () => oFile.click();
    oFile.onchange = () => this.napExcel(oFile);
  },

  async napExcel(oFile) {
    const f = oFile.files && oFile.files[0];
    oFile.value = '';
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return UI.toast('Cần tệp Excel dạng .xlsx — tải tệp mẫu của app về rồi điền vào đó nhé', 'error');
    if (f.size > 3 * 1024 * 1024) return UI.toast('Tệp quá lớn — tệp thực đơn chỉ vài chục KB', 'error');
    let tep;
    try {
      tep = await new Promise((ok, that) => {
        const r = new FileReader();
        r.onload = () => ok(r.result); r.onerror = () => that(new Error('Không đọc được tệp'));
        r.readAsDataURL(f);
      });
    } catch (err) { return UI.toast(err.message, 'error'); }
    // Gửi kèm tuần đã chọn: tệp khuôn tuần chỉ có Thứ Hai… Thứ Sáu, máy chủ đặt vào đúng ngày.
    const than = { tep, campusId: this._coSo || '', tuan: this._tuanXl };
    let xem;
    try { xem = await API.post('/api/menu/nap-excel', than); } catch (err) {
      // Hộp thoại, không phải thông báo thoáng qua: câu của máy chủ chỉ cách sửa
      // (chọn đúng tuần, dùng tệp mẫu…), cần đọc hết rồi mới làm theo được.
      return UI.modal(`
        <div id="mn-xl-loi" class="card" style="background:var(--danger-tint);line-height:1.6">${UI.esc(err.message)}</div>
        <div class="muted small mt-8">Chưa lưu gì vào thực đơn.</div>
        <button class="btn outline block mt-14" onclick="UI.closeModal()">Đã hiểu</button>
      `, 'Chưa nạp được tệp Excel');
    }
    const ds = xem.ngay || [];
    const soGhiDe = ds.filter(n => n.daCo && !n.khongDoi).length;
    UI.modal(`
      <div class="muted small" style="line-height:1.6;margin-bottom:8px">
        Tệp <b>${UI.esc(f.name)}</b>${xem.tuan ? ` — thực đơn <b>${UI.esc(this.tenTuan(xem.tuan))}</b> —` : ''} có <b>${ds.length}</b> ngày có món${soGhiDe ? ` — trong đó <b>${soGhiDe}</b> ngày đang có
        thực đơn sẽ được THAY bằng món trong tệp` : ''}. Xem lại rồi bấm Lưu.
      </div>
      ${(xem.canhBao || []).length ? `<div class="card" style="background:#fff8e1;margin-bottom:10px">
        ${(xem.canhBao || []).map(c => `<div class="small" style="line-height:1.6">• ${UI.esc(c)}</div>`).join('')}</div>` : ''}
      <div id="mn-xl-xem" style="max-height:50vh;overflow:auto">
        ${ds.map(n => `
          <div class="list-row" style="align-items:flex-start">
            <div class="row-main">
              <div class="row-title">${UI.esc(n.thu)} ${UI.esc(UI.fmtDate(n.date, { weekday: false }))}${
  n.khongDoi ? ' · <span class="muted small">giống bản đang có, không đổi</span>'
    : (n.daCo ? ' · <span class="muted small">thay bản đang có</span>' : '')}</div>
              ${n.bua.map(b => `<div class="row-sub"><b>${UI.esc(b.label)}:</b> ${UI.esc(b.items.join(', '))}</div>`).join('')}
              ${(n.giuBua || []).length ? `<div class="row-sub muted">Giữ nguyên (trong tệp không có bữa này): ${UI.esc(n.giuBua.join(', '))}</div>` : ''}
            </div>
          </div>`).join('') || '<div class="muted small">Không có ngày nào có món trong tệp.</div>'}
      </div>
      ${ds.length ? `<button class="btn primary block mt-14" id="mn-xl-luu">${UI.icon('check', 18)} Lưu ${ds.length} ngày vào thực đơn</button>` : ''}
    `, 'Xem trước thực đơn từ tệp Excel');
    const luu = document.getElementById('mn-xl-luu');
    if (luu) luu.onclick = async () => {
      // Lưu từ tệp vẽ lại cả màn — đang soạn cả tuần dở thì hỏi trước, như mọi
      // đường rời màn soạn khác (vòng rà Đ232).
      if (!this.boSoanNeuDongY()) return;
      luu.disabled = true;
      try {
        const r = await API.post('/api/menu/nap-excel', { ...than, luu: true });
        UI.closeModal();
        UI.toast(`Đã lưu thực đơn ${r.daLuu} ngày`, 'success');
        this.load();
      } catch (err) { luu.disabled = false; UI.toast(err.message, 'error'); }
    };
  },

  // ---- Tệp thực đơn cả tuần (Đ160 — TD-04) ----
  //
  // Nhà trường xin "tải tệp lên" cho cả tuần. Đây là BẢN ĐÍNH KÈM, không thay
  // chỗ bảng thực đơn đã gõ: app không đọc được chữ trong một tệp PDF hay một
  // tấm ảnh, nên nếu để nó thay chỗ thì màn từng ngày của gia đình, phần Nhật
  // ký "hôm nay con ăn gì" và bảng đối chiếu Tiền ăn đều mất dữ liệu.
  //
  // Với gia đình mà tuần đó không có tệp nào thì KHÔNG vẽ gì cả — một ô trống
  // ghi "chưa có tệp" chỉ làm màn hình dài thêm và không nói được điều gì.
  _tep: [],
  veTep(ds, tuNgay, taiDuoc) {
    const o = document.getElementById('menu-tep');
    if (!o) return;
    this._tep = ds;
    this._tuanTep = tuNgay;
    if (!ds.length && !taiDuoc) { o.innerHTML = ''; return; }
    const bieuTuong = (loai) => (loai === 'anh' ? '🖼️' : (loai === 'pdf' ? '📕' : '📄'));
    const co = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
    o.innerHTML = `
      <div class="card">
        <div class="card-title">📎 Tệp thực đơn tuần này${taiDuoc ? `<span class="spacer"></span>
          <button class="btn sm outline" id="mn-tep-them">+ Tải tệp lên</button>` : ''}</div>
        ${ds.length ? ds.map(t => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${bieuTuong(t.loai)} ${UI.esc(t.tenGoc)}</div>
              <div class="row-sub">${UI.esc(co(t.bytes))}${t.rieng ? ' · riêng cơ sở này' : ' · cả trường'}</div>
            </div>
            <div class="row-end" style="display:flex;gap:8px">
              <a class="btn sm outline" href="/api/menu/tep/${UI.esc(t.id)}" target="_blank" rel="noopener">Mở</a>
              ${taiDuoc ? `<button class="btn sm outline" data-xoa-tep="${UI.esc(t.id)}">Xoá</button>` : ''}
            </div>
          </div>`).join('') : `<div class="muted small">
            Chưa treo tệp nào cho tuần này. Bếp gửi ảnh chụp bảng thực đơn hay tệp PDF thì
            tải thẳng lên đây cho gia đình mở.
          </div>`}
        ${taiDuoc ? `<div class="muted small mt-8" style="line-height:1.7">
          Tệp treo lên là để gia đình <b>mở ra xem</b>. Bảng thực đơn từng ngày ở dưới vẫn
          phải gõ (hoặc nạp tệp Excel mẫu ở trên) — app chỉ đọc được chữ trong bảng ấy, và đó là thứ
          màn hình của gia đình, Nhật ký ngày và bảng đối chiếu Tiền ăn đang dùng.
        </div>
        <input type="file" id="mn-tep-file" accept="image/*,application/pdf,.pdf,.docx" style="display:none">` : ''}
      </div>`;
    if (!taiDuoc) return;
    const nut = document.getElementById('mn-tep-them');
    const oFile = document.getElementById('mn-tep-file');
    if (nut && oFile) {
      nut.onclick = () => oFile.click();
      oFile.onchange = () => this.taiTepLen(oFile);
    }
    // Mã tệp đi qua `data-`, không qua tham số chuỗi của onclick: tên tệp là
    // chữ người dùng gõ, và một dấu nháy trong đó là thoát ra khỏi chuỗi JS.
    for (const b of o.querySelectorAll('[data-xoa-tep]')) {
      b.onclick = () => this.xoaTep(b.dataset.xoaTep);
    }
  },

  async taiTepLen(oFile) {
    const f = oFile && oFile.files && oFile.files[0];
    if (!f) return;
    oFile.value = '';
    try {
      const dataUrl = await new Promise((ok, hong) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result || ''));
        r.onerror = () => hong(new Error('Không đọc được tệp này'));
        r.readAsDataURL(f);
      });
      await API.post('/api/menu/tep', {
        tuNgay: this._tuanTep, campusId: this._coSo || '', ten: f.name, dataUrl,
      });
      UI.toast('Đã treo tệp thực đơn cho tuần này', 'success');
      await this.load();
    } catch (e) {
      UI.toast(e.message || 'Chưa tải được tệp', 'error');
    }
  },

  async xoaTep(id) {
    if (!confirm('Gỡ tệp này khỏi thực đơn tuần?')) return;
    try {
      await API.del(`/api/menu/tep/${encodeURIComponent(id)}`);
      UI.toast('Đã gỡ tệp', 'success');
      await this.load();
    } catch (e) {
      UI.toast(e.message || 'Chưa gỡ được tệp', 'error');
    }
  },

  veNhac(menus, from) {
    const o = document.getElementById('menu-nhac');
    if (!o) return;
    o.innerHTML = '';
    if (!this.laQuanTri() || this.week !== 1) return;
    // Thứ Sáu = 5 theo giờ Việt Nam, lấy từ chính "hôm nay" của app.
    const t = UI.parseDate(UI.todayStr());
    if (!t || t.getDay() !== 5) return;
    const daSoan = (menus || []).filter(m => (m.meals || []).length).length;
    if (daSoan >= 5) return;
    o.innerHTML = `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="small" style="line-height:1.7">
          Hôm nay thứ Sáu. Tuần sau còn <b>${UI.esc(String(5 - daSoan))} ngày</b> chưa có thực đơn —
          nhà trường hẹn đăng thực đơn tuần tới vào hôm nay để gia đình biết trước.
          <div class="mt-8">Nếp của trường gồm hai việc trong cùng một hôm: thực đơn ở màn này,
          và <b>chủ đề học tập tuần tới</b> do cô soạn ở màn Hành trình.</div>
        </div>
      </div>`;
  },

  // ĐƯỜNG DẪN HỎI THỰC ĐƠN MỘT TUẦN — MỘT CHỖ DUY NHẤT.
  //
  // Ba lượt gọi cùng hỏi một thứ: lượt xem, lượt "soạn cả tuần", lượt "sửa một
  // ngày". Trước đợt này chỉ lượt XEM gửi kèm mã cơ sở, hai lượt SOẠN thì
  // không — nên ban giám hiệu chọn "Bếp cơ sở 2", bấm Soạn, và ô nhập hiện lên
  // món của thực đơn DÙNG CHUNG chứ không phải món cơ sở 2 đã soạn. Bấm Lưu là
  // ghi đè thực đơn thật của cơ sở 2 bằng bản dùng chung, không báo gì.
  //
  // Chỗ này khó thấy vì màn XEM hiện đúng: người soạn không có lý do nào để
  // nghi ngờ. Và hậu quả không dừng ở thẩm mỹ — gia đình cơ sở 2 đọc sai món
  // con mình ăn, mà nhà có bé dị ứng thì đó là chuyện an toàn.
  //
  // Gom về một hàm để không còn chỗ nào chép thiếu lần nữa.
  duongDanTuan() {
    return `/api/menu?week=${this.week}`
      + (this._coSo ? `&campusId=${encodeURIComponent(this._coSo)}` : '');
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
      const data = await API.get(this.duongDanTuan());
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
    this._dangSoanTuan = true;
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

    document.getElementById('td-huy').onclick = () => { if (this.boSoanNeuDongY()) this.load(); };
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

  // Ô "DÁN TỪ BẢNG" (Đ132) ĐÃ GỠ — chủ dự án chốt 07/10: chỉ dùng tệp Excel mẫu
  // (`veExcel` / `/api/menu/nap-excel`, Đ226). Hai đường cùng làm một việc là
  // hai chỗ phải giữ cho hiểu bảng giống nhau; tệp mẫu thì máy chủ đọc và cho
  // xem trước từng ngày trước khi lưu, nên chắc hơn.

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
      // GỬI KÈM MÃ CƠ SỞ ĐANG XEM. Thiếu nó thì Cấp 1 đang mở bếp cơ sở 2 mà
      // lưu lại rơi vào bản dùng chung — và cả ba cơ sở đổi theo, âm thầm.
      const kq = await API.put('/api/menu/tuan', {
        campusId: this._coSo || '',
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
    API.get(this.duongDanTuan()).then(data => {
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
      await API.put(`/api/menu/${encodeURIComponent(this._editDate)}`,
        { meals, campusId: this._coSo || '' });
      UI.toast('Đã lưu thực đơn', 'success');
      UI.closeModal();
      await this.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Chép tuần liền trước vào tuần đang xem — chỉ đổ vào ngày còn trống.
  async chepTuanTruoc() {
    if (!this.boSoanNeuDongY()) return;
    try {
      const kq = await API.post('/api/menu/copy-week',
        { week: this.week, campusId: this._coSo || '' });
      UI.toast(kq.daChep
        ? `Đã chép thực đơn cho ${kq.daChep} ngày còn trống`
        : 'Không có ngày nào cần chép (tuần này đã soạn đủ hoặc tuần trước trống)');
      await this.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
