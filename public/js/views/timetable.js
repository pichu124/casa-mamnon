// Phân hệ Lịch sinh hoạt: một ngày ở nhóm, xem theo từng thứ trong tuần.
//
// Tên cũ là "Thời khóa biểu" — chữ của trường phổ thông. Nội dung bên trong đã
// là lịch sinh hoạt một ngày từ lâu (đón bé, thể dục sáng, ăn, ngủ trưa, trả bé),
// nên cái tên và cái ruột đang nói hai chuyện khác nhau: cô đọc "thời khóa biểu"
// rồi đi tìm "tiết học", không thấy. Tên biến `periodTimes`, `p`, `TOI_DA_TIET`
// giữ nguyên — CLAUDE.md cho phép tầng dữ liệu nói tiếng Anh của app 1.
// Phụ huynh xem theo nhóm của con đang chọn; giáo viên xem nhóm mình phụ trách.
// Cô phụ trách và quản trị sửa được TKB của nhóm ngay trên màn hình này.
//
// Cô mầm non có thể phụ trách 2–3 nhóm. Bản đầu lấy cứng `nhomCuaCo[0]`, nên cô
// dạy hai nhóm KHÔNG có đường nào mở TKB của nhóm thứ hai — kể cả khi máy chủ
// vẫn cho phép. Ô chọn nhóm chỉ hiện khi cô có nhiều hơn một nhóm; cô một nhóm
// không thấy nó và số thao tác không đổi một chút nào. Giống hệt màn Điểm danh.
App.views.timetable = {
  day: null,      // 1 = Thứ Hai ... 5 = Thứ Sáu
  data: null,     // bản ghi TKB đang hiển thị
  classId: null,  // nhóm đang xem
  editing: false, // đang ở chế độ sửa
  draft: null,    // bản nháp khi sửa: { periodTimes, days }

  // Khung giờ mặc định khi một nhóm lập lịch sinh hoạt lần đầu.
  //
  // Bản kế thừa từ app 1 là bảy tiết 35 phút, và giữa chúng có một khoảng trống
  // từ 10:15 tới 14:00 mà không mốc nào nói tới. Ở trường tiểu học đó là buổi
  // trưa học sinh về nhà; ở nhà trẻ đó là BỮA TRƯA VÀ GIẤC NGỦ TRƯA — hai việc
  // chiếm nhiều thời gian nhất trong ngày của bé và là hai thứ gia đình hỏi
  // nhiều nhất. Cô lập lịch lần đầu bằng khung đó phải tự xoá bảy dòng rồi gõ
  // lại từ đầu, tức là cái mặc định đang làm cô mất công hơn là không có gì.
  //
  // Khung dưới đây là một ngày ở nhóm mầm non. Cô vẫn sửa được từng dòng —
  // đây là chỗ bắt đầu, không phải cái khuôn.
  KHUNG_GIO_MAC_DINH: [
    { p: 1, time: '07:00 – 08:00' },   // đón bé
    { p: 2, time: '08:00 – 08:30' },   // thể dục sáng, ăn sáng
    { p: 3, time: '08:30 – 09:30' },   // hoạt động buổi sáng
    { p: 4, time: '09:30 – 10:30' },   // chơi ngoài trời
    { p: 5, time: '10:30 – 11:30' },   // ăn trưa
    { p: 6, time: '11:30 – 14:00' },   // ngủ trưa
    { p: 7, time: '14:00 – 14:45' },   // dậy, ăn xế
    { p: 8, time: '14:45 – 16:00' },   // hoạt động buổi chiều
    { p: 9, time: '16:00 – 17:30' },   // trả bé
  ],

  // Nhóm mà văn phòng soạn được: mọi nhóm trong cơ sở mình (Cấp 3), hoặc cả
  // trường (Cấp 1). Lọc theo cơ sở NGAY TRÊN MÀN HÌNH chứ không chỉ trông vào
  // máy chủ — bài học Đ94: ô chọn mời văn phòng bấm sang nhóm cơ sở khác rồi
  // nhận lỗi là một ô chọn nói dối.
  nhomVanPhong() {
    const u = App.state.user;
    const coSo = u && u.coSo ? u.coSo : null;
    return (App.state.classes || [])
      .filter(c => !coSo || c.campusId === coSo)
      .map(c => ({ id: c.id, name: c.name }));
  },

  // HAI PHẦN TRONG MỘT TAB (Đ148).
  //
  // Nhà trường 10/09: *"bỏ newsletter: gộp phần kế hoạch giáo dục và lịch sinh
  // hoạt vào 1 tab tên là Lịch sinh hoạt, trong đó có đủ 2 nội dung là Kế hoạch
  // giáo dục và Lịch sinh hoạt"*.
  //
  // Đổi phần bằng HASH (`#/timetable/kehoach`) chứ không bằng một biến trong
  // bộ nhớ: nút Quay lại của điện thoại và liên kết gửi cho nhau đều phải đúng.
  // Cùng cách màn Điểm danh đã làm ở Đ125.
  //
  // Phần Kế hoạch chỉ hiện khi phân hệ Kế hoạch giáo dục ĐANG BẬT. Nhà trường
  // tắt nó ở Quản trị → Tính năng thì dải tab biến mất và màn này trở lại đúng
  // như trước đợt này — không một dòng nào lỗi.
  async render(root, params) {
    const coKeHoach = App.moduleEnabled('plans');
    const phan = (params && params[0] === 'kehoach' && coKeHoach) ? 'kehoach' : 'lich';
    if (phan === 'kehoach') return this.veKeHoach(root, coKeHoach);
    const user = App.state.user;
    let classId = null;
    const dsNhom = user.role === 'teacher' ? (user.nhomCuaCo || [])
      : (user.role === 'admin' ? this.nhomVanPhong() : []);
    if (user.role === 'teacher' || user.role === 'admin') {
      // Nhóm cô đang chọn, nếu nhóm đó vẫn còn thuộc về cô. Quản trị vừa rút cô
      // khỏi một nhóm thì rơi về nhóm đầu, không kẹt ở một nhóm không còn quyền.
      if (!dsNhom.some(n => n.id === this.classId)) {
        this.classId = dsNhom[0]?.id || (user.role === 'teacher' ? user.classId : null) || null;
      }
      classId = this.classId;
    } else {
      const current = App.currentStudent();
      if (!current) {
        root.innerHTML = UI.pageHeader('Lịch sinh hoạt') + this.thanhPhan('lich')
          + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
        return;
      }
      classId = current.classId;
    }
    // Đổi nhóm giữa chừng (quản trị chuyển bé sang nhóm khác) thì bỏ bản nháp đang sửa.
    if (this.classId !== classId) { this.editing = false; this.draft = null; }
    this.classId = classId;
    // Cùng lý do như `views/plans.js`: không chặn ở đây thì chuỗi truy vấn
    // thành `?classId=null` và cô nhận màn "Có lỗi xảy ra 😥 / Không tìm thấy
    // nhóm lớp" — đổ lỗi cho một nhóm không tồn tại.
    if (!classId) {
      root.innerHTML = UI.pageHeader('Lịch sinh hoạt') + this.thanhPhan('lich')
        + UI.emptyState('🧭', user.role === 'admin'
          ? 'Cơ sở chưa có nhóm lớp nào để lập lịch sinh hoạt.'
          : 'Cô chưa phụ trách nhóm nào nên chưa có lịch sinh hoạt để xem. '
          + 'Nhờ văn phòng nhà trường phân công nhóm giúp cô nhé.');
      this.ganSuKienPhan(root);
      return;
    }
    if (!this.day) {
      const dw = UI.thuVN();   // thứ theo giờ Việt Nam
      this.day = dw >= 1 && dw <= 5 ? dw : 1; // cuối tuần → xem Thứ Hai
    }

    if (this.editing && this.draft) return this.renderEditor(root);

    let data = null, thongBao = 'Nhóm chưa có lịch sinh hoạt';
    try {
      data = await API.get(`/api/timetable?classId=${encodeURIComponent(classId)}`);
    } catch (err) {
      thongBao = err.message || thongBao;
    }
    this.data = data;

    if (!data) {
      // Chỉ mời tạo mới khi máy chủ xác nhận nhóm CHƯA có TKB. Lỗi mạng thì không —
      // kẻo lưu bản mặc định đè lên TKB thật đang có.
      const chuaCo = /chưa có lịch sinh hoạt/i.test(thongBao);
      // Ô chọn nhóm phải có CẢ khi nhóm đang chọn chưa có lịch: văn phòng mở
      // màn ra, nhóm đầu danh sách chưa lập lịch, mà không có ô chọn thì không
      // sang được nhóm khác — kẹt ở một nhóm trống.
      root.innerHTML = `
        ${UI.pageHeader('Lịch sinh hoạt')}
        ${this.thanhPhan('lich')}
        ${user.role === 'parent' ? UI.studentBar() + UI.thanhChonBeTheoCap() : ''}
        ${this.oChonNhom(dsNhom)}
        ${UI.emptyState('📚', thongBao)}
        ${this.canEdit() && chuaCo ? `
          <button class="btn primary block" onclick="App.views.timetable.batDauTao()">${UI.icon('plus', 18)} Lập lịch sinh hoạt</button>` : ''}`;
      this.ganSuKienPhan(root);
      return;
    }

    const suaDuoc = this.canEdit();
    root.innerHTML = `
      ${UI.pageHeader('Lịch sinh hoạt', suaDuoc ? { action: { id: 'btn-sua-tkb', label: 'Chỉnh sửa', icon: 'edit' } } : {})}
      ${this.thanhPhan('lich')}
      ${user.role === 'parent' ? UI.studentBar() + UI.thanhChonBeTheoCap() : ''}
      ${this.oChonNhom(dsNhom)}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(d => `
          <button class="${d === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${d})">T${d + 1}</button>`).join('')}
      </div>
      <div id="tkb-day"></div>
      ${suaDuoc && dsNhom.length > 1 ? `
        <button class="btn outline block" id="btn-chep-tkb" style="margin-bottom:12px">
          ${UI.icon('plus', 16)} Áp dụng lịch này cho nhóm khác…
        </button>` : ''}
      ${user.role === 'teacher' ? `
        <div class="card muted small" style="line-height:1.6">
          Lịch sinh hoạt do văn phòng cơ sở soạn cho từng nhóm. Cô xem được ở đây; cần đổi khung giờ
          hay hoạt động thì nhắn văn phòng nhé.
        </div>` : ''}
      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Ghi chú</div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Nhóm</div><div class="row-title">${UI.esc(data.className)}</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Một ngày ở nhóm</div><div class="row-title">Từ lúc đón bé tới lúc trả bé</div></div></div>
        <div class="list-row"><div class="row-main"><div class="row-sub">Cô phụ trách</div><div class="row-title">${UI.esc(data.teacherNames || data.teacherName || '—')}</div></div></div>
      </div>`;
    if (suaDuoc) document.getElementById('btn-sua-tkb').onclick = () => this.batDauSua();
    const nutChep = document.getElementById('btn-chep-tkb');
    if (nutChep) nutChep.onclick = () => this.moChepSangNhom(dsNhom);
    this.ganSuKienPhan(root);
    this.renderDay();
  },

  // Dải hai phần. KHÔNG vẽ khi phân hệ Kế hoạch giáo dục đang tắt — một dải
  // tab chỉ có một nút là một dải tab nói dối.
  thanhPhan(phan) {
    if (!App.moduleEnabled('plans')) return '';
    return `<div class="seg" id="tkb-phan">
      <button type="button" data-phan="lich" class="${phan === 'lich' ? 'active' : ''}">🕘 Lịch sinh hoạt</button>
      <button type="button" data-phan="kehoach" class="${phan === 'kehoach' ? 'active' : ''}">📖 Kế hoạch giáo dục</button>
    </div>`;
  },

  ganSuKienPhan(root) {
    for (const b of root.querySelectorAll('#tkb-phan [data-phan]')) {
      b.onclick = () => {
        location.hash = b.dataset.phan === 'kehoach' ? '#/timetable/kehoach' : '#/timetable';
      };
    }
  },

  // Phần KẾ HOẠCH GIÁO DỤC — giao cho chính màn Kế hoạch vẽ vào ô này.
  //
  // Vẽ hộ chứ KHÔNG chép lại: `views/plans.js` vẫn là chỗ duy nhất biết cách
  // bày một bản kế hoạch, và đường `#/plans` vẫn mở được y như cũ. Chép ra hai
  // bản là ngày mai sửa một chỗ thì chỗ kia nói khác.
  //
  // Màn Kế hoạch hỏng thì CHỈ ô này báo hỏng — phần Lịch sinh hoạt và dải tab
  // vẫn nguyên, đúng Nguyên tắc số 1.
  async veKeHoach(root, coKeHoach) {
    root.innerHTML = `
      ${UI.pageHeader('Lịch sinh hoạt')}
      ${this.thanhPhan('kehoach')}
      ${App.state.user.role === 'parent' ? UI.studentBar() + UI.thanhChonBeTheoCap() : ''}
      <div id="tkb-kehoach"><div class="loading">Đang tải kế hoạch giáo dục</div></div>`;
    this.ganSuKienPhan(root);
    const o = document.getElementById('tkb-kehoach');
    if (!coKeHoach || !App.views.plans) {
      o.innerHTML = UI.emptyState('🛠️',
        'Phần Kế hoạch giáo dục đang tạm nghỉ. Phần Lịch sinh hoạt vẫn dùng bình thường.');
      return;
    }
    try {
      await App.views.plans.render(o, [], true);
    } catch (err) {
      o.innerHTML = UI.emptyState('😥', err.message || 'Chưa tải được kế hoạch giáo dục');
    }
  },

  // ÁP DỤNG LỊCH NÀY CHO NHÓM KHÁC (Đ133) — hỏi rõ trước, vì máy chủ GHI ĐÈ
  // trọn lịch của nhóm được chọn.
  moChepSangNhom(dsNhom) {
    const khac = (dsNhom || []).filter(n => n.id !== this.classId);
    if (!khac.length) return UI.toast('Không có nhóm nào khác trong cơ sở để áp dụng', 'error');
    const ten = (dsNhom.find(n => n.id === this.classId) || {}).name || '';
    UI.modal(`
      <p class="muted small" style="line-height:1.6">
        Lịch của nhóm <b>${UI.esc(ten)}</b> sẽ được chép sang các nhóm chọn dưới đây.
        Lịch đang có của nhóm đó (nếu có) sẽ bị <b>thay hẳn</b>.
      </p>
      ${khac.map(n => `
        <label style="display:flex;align-items:center;gap:10px;padding:9px 4px;cursor:pointer;border-bottom:1px solid var(--line)">
          <input type="checkbox" class="tkb-chep" value="${UI.esc(n.id)}" style="width:18px;height:18px;accent-color:var(--primary);flex:none">
          <span>${UI.esc(n.name)}</span>
        </label>`).join('')}
      <button class="btn primary block mt-14" id="tkb-chep-dong-y">Áp dụng cho các nhóm đã chọn</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Áp dụng lịch cho nhóm khác');
    document.getElementById('tkb-chep-dong-y').onclick = async () => {
      const denNhom = [...document.querySelectorAll('.tkb-chep:checked')].map(o => o.value);
      if (!denNhom.length) return UI.toast('Chọn ít nhất một nhóm nhé', 'error');
      try {
        const kq = await API.post(`/api/timetable/${encodeURIComponent(this.classId)}/chep`, { denNhom });
        UI.closeModal();
        UI.toast(`Đã áp dụng lịch cho ${kq.daChep.length} nhóm: ${kq.daChep.map(x => x.name).join(', ')}`, 'success');
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Ô chọn nhóm — chỉ hiện khi cô phụ trách nhiều hơn một nhóm.
  oChonNhom(dsNhom) {
    if (!dsNhom || dsNhom.length < 2) return '';
    return `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Nhóm lớp</label>
          <select id="tkb-nhom" onchange="App.views.timetable.setNhom(this.value)">
            ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this.classId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;
  },

  setNhom(value) {
    if (!value || value === this.classId) return;
    // Đang sửa dở TKB nhóm này mà chuyển sang nhóm khác thì bỏ bản nháp, kẻo
    // lưu nhầm hoạt động của nhóm này sang nhóm kia.
    this.editing = false;
    this.draft = null;
    this.classId = value;
    App.route();
  },

  // VĂN PHÒNG soạn (nhóm trong phạm vi mình); cô và phụ huynh chỉ xem (Đ133).
  canEdit() {
    const u = App.state.user;
    if (!u || u.role !== 'admin') return false;
    return this.nhomVanPhong().some(n => n.id === this.classId);
  },

  setDay(d) {
    if (this.day === d) return;
    if (this.editing) {
      // Giữ lại những gì vừa gõ của thứ đang mở trước khi chuyển thứ khác.
      this.thuThapNhap();
      this.day = d;
      App.route();
      return;
    }
    this.day = d;
    const seg = document.getElementById('tkb-seg');
    if (seg) Array.from(seg.children).forEach((btn, i) => btn.classList.toggle('active', i + 1 === d));
    this.renderDay();
  },

  // Vẽ lịch sinh hoạt của thứ đang chọn.
  renderDay() {
    const zone = document.getElementById('tkb-day');
    if (!zone || !this.data) return;
    const subjects = (this.data.days && this.data.days[String(this.day)]) || [];
    if (!subjects.length) {
      zone.innerHTML = UI.emptyState('📚', 'Chưa có lịch sinh hoạt cho ngày này');
      return;
    }
    const isToday = UI.thuVN() === this.day;
    zone.innerHTML = `<div class="card">${subjects.map((sub, i) => this.periodRow(sub, i, isToday)).join('')}</div>`;
  },

  // Một mốc sinh hoạt: số thứ tự + tên hoạt động + khung giờ; tô sáng nếu đang diễn ra.
  //
  // HAI CHỮ TRÊN MÀN NÀY TỪNG LÀ CHỮ CỦA TRƯỜNG PHỔ THÔNG.
  //
  // Mốc chưa xếp hoạt động hiện "Nghỉ / tự học" — một bé 18 tháng không tự học,
  // và "nghỉ" thì gia đình đọc ra là hôm đó nhóm nghỉ. Nay nói đúng việc đang
  // xảy ra: nhà trường CHƯA XẾP hoạt động cho mốc này. Đó cũng là cách nói
  // QUY TẮC 2 đòi — ô để trống chỉ mô tả trạng thái của lịch, không hàm ý gì
  // về nhóm hay về bé.
  //
  // Nhãn của mốc đang diễn ra hiện "Đang học". Nhưng khung 11:30–14:00 là GIẤC
  // NGỦ TRƯA và 10:30–11:30 là BỮA TRƯA, nên đúng giờ ngủ thì màn hình của gia
  // đình treo chữ "Đang học" lên trên dòng "Ngủ trưa". "Đang diễn ra" đúng cho
  // cả chín mốc trong ngày.
  periodRow(subject, i, isToday) {
    const pt = (this.data.periodTimes || [])[i] || {};
    const time = pt.time || '';
    const free = subject === '—';
    const live = isToday && !free && this.inPeriod(time);
    const rowStyle = live
      ? ' style="background:#e9f0ff;border-radius:12px;padding-left:10px;padding-right:10px;border-bottom:none"'
      : (free ? ' style="opacity:.55"' : '');
    return `
      <div class="list-row"${rowStyle}>
        <span class="row-icon" style="background:#e6efff;color:var(--primary);font-weight:800;font-size:1.02rem">${UI.esc(pt.p || i + 1)}</span>
        <div class="row-main">
          <div class="row-title"${free ? ' style="color:var(--muted);font-weight:500;font-style:italic"' : ''}>${free ? 'Chưa xếp hoạt động' : UI.esc(subject)}</div>
          <div class="row-sub">${UI.esc(time)}</div>
        </div>
        ${live ? UI.badge('Đang diễn ra', 'green') : ''}
      </div>`;
  },

  // Giờ hiện tại có nằm trong khung "HH:MM – HH:MM" không?
  inPeriod(timeStr) {
    const m = String(timeStr).match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
    if (!m) return false;
    // Giờ Việt Nam, không phải giờ máy — khung "Đang học" phải đúng với đồng
    // hồ treo tường ở lớp.
    const [gio, phut] = UI.gioVN().split(':').map(Number);
    const cur = gio * 60 + phut;
    return cur >= (+m[1] * 60 + +m[2]) && cur <= (+m[3] * 60 + +m[4]);
  },

  // ---- Chế độ sửa (cô phụ trách / quản trị) ----

  batDauSua() {
    if (!this.data) return;
    this.draft = JSON.parse(JSON.stringify({
      periodTimes: this.data.periodTimes || [],
      days: this.data.days || {},
    }));
    this.editing = true;
    App.route();
  },

  // Nhóm chưa có lịch: bắt đầu từ khung giờ mặc định, các mốc để trống.
  batDauTao() {
    const soTiet = this.KHUNG_GIO_MAC_DINH.length;
    const days = {};
    for (let d = 1; d <= 5; d++) days[String(d)] = Array(soTiet).fill('—');
    this.draft = { periodTimes: JSON.parse(JSON.stringify(this.KHUNG_GIO_MAC_DINH)), days };
    this.editing = true;
    App.route();
  },

  renderEditor(root) {
    const d = this.draft;
    const mon = (d.days[String(this.day)] || []);
    root.innerHTML = `
      ${UI.pageHeader('Sửa lịch sinh hoạt')}
      <div class="seg" id="tkb-seg">
        ${[1, 2, 3, 4, 5].map(x => `
          <button class="${x === this.day ? 'active' : ''}" onclick="App.views.timetable.setDay(${x})">T${x + 1}</button>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Thứ ${this.day + 1} — hoạt động từng mốc</div>
        <div class="muted small" style="margin-bottom:10px">Để trống hoặc ghi "—" nếu mốc đó không có hoạt động riêng. Khung giờ dùng chung cho cả tuần. Mỗi nhóm có thể nhiều hay ít dòng khác nhau — thêm hoặc bớt dòng ở dưới.</div>
        ${d.periodTimes.map((pt, i) => `
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <span class="row-icon" style="background:#e6efff;color:var(--primary);font-weight:800;flex:none">${UI.esc(pt.p || i + 1)}</span>
            <div class="field" style="flex:1.7;margin:0">
              <input id="tkb-mon-${i}" value="${UI.esc(mon[i] === '—' ? '' : (mon[i] || ''))}" placeholder="Đón bé, thể dục sáng, ăn trưa…">
            </div>
            <div class="field" style="flex:1;margin:0">
              <input id="tkb-gio-${i}" value="${UI.esc(pt.time || '')}" placeholder="07:30 – 08:05">
            </div>
            <button class="btn danger-soft sm" style="flex:none;padding:8px 10px" data-xoa-dong="${i}" aria-label="Bỏ dòng ${i + 1}" title="Bỏ dòng này">${UI.icon('x', 15)}</button>
          </div>`).join('')}
        <button class="btn outline block" id="tkb-them-dong">${UI.icon('plus', 16)} Thêm dòng</button>
      </div>
      <button class="btn primary block" onclick="App.views.timetable.luuSua()">${UI.icon('check', 18)} Lưu lịch sinh hoạt</button>
      <button class="btn block" style="margin-top:8px" onclick="App.views.timetable.huySua()">Hủy</button>`;
    document.getElementById('tkb-them-dong').onclick = () => this.themDong();
    for (const b of root.querySelectorAll('[data-xoa-dong]')) {
      b.onclick = () => this.xoaDong(Number(b.dataset.xoaDong));
    }
  },

  // THÊM / BỎ DÒNG (Đ133). Một dòng là một mốc trong ngày, dùng chung cho cả
  // năm thứ, nên thêm dòng là thêm vào khung giờ VÀ vào lịch của mọi thứ.
  // Số thứ tự đánh lại từ 1 sau mỗi lần đổi — số là để nhìn, không phải mã.
  TOI_DA_DONG: 20,

  themDong() {
    if (!this.draft) return;
    this.thuThapNhap();
    if (this.draft.periodTimes.length >= this.TOI_DA_DONG) {
      return UI.toast(`Một ngày ghi tối đa ${this.TOI_DA_DONG} dòng`, 'error');
    }
    this.draft.periodTimes.push({ p: this.draft.periodTimes.length + 1, time: '' });
    for (let d = 1; d <= 5; d++) {
      const ngay = this.draft.days[String(d)] || (this.draft.days[String(d)] = []);
      while (ngay.length < this.draft.periodTimes.length) ngay.push('—');
    }
    App.route();
  },

  xoaDong(i) {
    if (!this.draft) return;
    this.thuThapNhap();
    if (this.draft.periodTimes.length <= 1) return UI.toast('Lịch cần ít nhất một dòng', 'error');
    this.draft.periodTimes.splice(i, 1);
    this.draft.periodTimes.forEach((pt, k) => { pt.p = k + 1; });
    for (let d = 1; d <= 5; d++) {
      const ngay = this.draft.days[String(d)];
      if (Array.isArray(ngay) && ngay.length > i) ngay.splice(i, 1);
    }
    App.route();
  },

  // Đọc các ô nhập của thứ đang mở vào bản nháp.
  thuThapNhap() {
    const d = this.draft;
    if (!d) return;
    const ngay = d.days[String(this.day)] || (d.days[String(this.day)] = []);
    d.periodTimes.forEach((pt, i) => {
      const oMon = document.getElementById(`tkb-mon-${i}`);
      const oGio = document.getElementById(`tkb-gio-${i}`);
      if (oMon) ngay[i] = oMon.value.trim() || '—';
      if (oGio) pt.time = oGio.value.trim();
    });
  },

  async luuSua() {
    this.thuThapNhap();
    try {
      const kq = await API.put(`/api/timetable/${encodeURIComponent(this.classId)}`, {
        periodTimes: this.draft.periodTimes,
        days: this.draft.days,
      });
      this.data = kq;
      this.editing = false;
      this.draft = null;
      UI.toast('Đã lưu lịch sinh hoạt', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  huySua() {
    this.editing = false;
    this.draft = null;
    App.route();
  },
};
