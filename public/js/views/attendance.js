// Phân hệ Điểm danh.
// Phụ huynh: lịch điểm danh theo tháng của con. Giáo viên: điểm danh cả nhóm theo ngày.
//
// MỘT NGÀY CÓ HAI PHẦN (Đ126): ĐÓN BÉ và TRẢ BÉ.
//
// Sáng cô đón bé: chấm trạng thái, chụp một tấm "con đã tới lớp". Chiều cô trả
// bé: ghi đã trao cho ai, chụp một tấm lúc trả. Hai việc ấy trước Đ126 nằm ở
// hai ô khác nhau trên trang chủ (Điểm danh và Đón trả bé) — cô và gia đình
// phải mở hai chỗ để theo dõi một ngày. Nay màn này là MỘT chỗ: với cô là hai
// phần '#/attendance' (Đón bé) và '#/attendance/tra' (Trả bé); với gia đình
// là một hộp chi tiết ngày có cả hai nửa.
//
// Phần Trả bé là việc của phân hệ Đón trả bé (cắm thêm, nhà trường tắt được),
// nên màn này KHÔNG chép mã của nó — chỉ gọi sang qua đúng một điểm chạm
// `phanTraBe()`; phân hệ tắt hay hỏng thì phần Đón bé vẫn y như trước.
App.views.attendance = {
  month: null,   // phụ huynh: tháng đang xem 'YYYY-MM'
  date: null,    // giáo viên: ngày đang điểm danh 'YYYY-MM-DD'
  nhomId: null,  // cô: nhóm đang điểm danh, chỉ dùng khi cô phụ trách nhiều nhóm
  _byDate: {},   // phụ huynh: bản ghi theo ngày của tháng đang xem
  _roster: [],   // giáo viên: [{ student, record }] của ngày đang chọn
  _soThang: new Map(),  // phụ huynh: sổ trả bé của tháng đang xem (Đ126), rỗng khi phân hệ tắt
  _pt: null,     // phụ huynh: đối tượng phân hệ Đón trả bé đang dùng được, hoặc null

  STATUS_KEYS: ['present', 'late', 'absent_excused', 'absent_unexcused'],
  SHORT: { present: 'Có mặt', late: 'Muộn', absent_excused: 'Nghỉ CP', absent_unexcused: 'Nghỉ KP' },

  async render(root, params = []) {
    // '#/attendance/tra' = phần Trả bé của cô (Đ126). Gia đình và văn phòng
    // không có phần này nên bỏ qua tham số.
    // MỘT MÀN, MỘT DÒNG VÀO/RA (Đ210, việc 1 + 3).
    //
    // Trước đợt này màn của cô có hai tab: '#/attendance' (Đón bé) và
    // '#/attendance/tra' (Trả bé). Nhà trường xin gộp về một dòng. Đường dẫn
    // cũ GIỮ NGUYÊN và lặng lẽ về màn gộp — điện thoại đã cài app còn giữ
    // đường dẫn ấy trong lịch sử, và một liên kết chết là cô bấm vào thấy
    // trang trắng.
    if (App.state.user.role === 'teacher') return this.renderTeacher(root);
    // VĂN PHÒNG CÓ MÀN RIÊNG, KHÔNG DÙNG LẠI MÀN CỦA CÔ VÀ KHÔNG RƠI VÀO MÀN
    // CỦA GIA ĐÌNH.
    //
    // Trước Đ97 ở đây chỉ có hai dòng, nên quản trị rơi xuống `renderParent` và
    // thấy lịch điểm danh tháng của MỘT BÉ BẤT KỲ — bé đứng đầu danh sách, vì
    // `App.state.students` của quản trị là toàn bộ bé trong phạm vi.
    //
    // Và cũng KHÔNG dùng lại `renderTeacher`: `routes/auth.js` chỉ gán
    // `nhomCuaCo` cho vai `teacher`, nên quản trị vào đó sẽ mở sổ điểm danh
    // với `nhomId` rỗng — tức chấm điểm danh cho cả trường một lượt. Việc của
    // văn phòng ở đây là RÀ SOÁT, không phải chấm thay cô.
    if (App.state.user.role === 'admin') return this.renderVanPhong(root);
    return this.renderParent(root, params);
  },

  // ---- Điểm chạm DUY NHẤT sang phân hệ Đón trả bé (Đ126) ----
  //
  // Đây là chỗ DUY NHẤT màn lõi này biết tên một phân hệ — bài canh đếm chuỗi
  // `App.views.dontra` trong tệp này phải bằng 1, và tệp này không được gọi
  // thẳng đường API nào của phân hệ ấy. Trả về:
  //   null           — phân hệ tắt (hoặc ngoài vai): màn y hệt trước Đ126;
  //   { hong: true } — phân hệ bật mà tệp giao diện hỏng / thiếu hàm;
  //   đối tượng view — dùng được.
  // Mọi lời gọi vào đối tượng trả về đều phải nằm trong try/catch riêng, để
  // một lỗi trong phân hệ không biến cả Điểm danh thành "Có lỗi xảy ra".
  phanTraBe() {
    if (!App.moduleEnabled('dontra')) return null;
    const v = App.views.dontra;
    const du = !!v && ['veTraBe', 'napSoThang', 'htmlTraBeCuaNgay', 'chuTraBeNgan', 'gioTraBe']
      .every(t => typeof v[t] === 'function');
    return du ? v : { hong: true };
  },

  // Ba lớp đỡ cho gia đình: phân hệ tắt → '', hỏng → '', ném lỗi → ''.
  htmlTraBe(dateStr) {
    if (!this._pt) return '';
    try { return this._pt.htmlTraBeCuaNgay(dateStr) || ''; } catch (_) { return ''; }
  },
  chuTraBe(dateStr) {
    if (!this._pt) return '';
    try { return this._pt.chuTraBeNgan(dateStr) || ''; } catch (_) { return ''; }
  },
  gioTraBe(dateStr) {
    if (!this._pt) return '';
    try { return this._pt.gioTraBe(dateStr) || ''; } catch (_) { return ''; }
  },

  // ---- Văn phòng: bảng rà soát sau 9 giờ, cả phạm vi mình quản ----
  //
  // Nhà trường yêu cầu ở điểm 4 (30/08): *"báo đỏ để admin kiểm tra lại sơ sót
  // hay con nghỉ để liên lạc với PH xác nhận"*. Người phải nhấc máy gọi là văn
  // phòng — cô chính là người "chưa kịp chấm", nên báo cho cô là báo cho đúng
  // người không cần được báo.
  //
  // Máy chủ đã trả sẵn theo phạm vi khi KHÔNG kèm `classId`: Cấp 1 nhận cả
  // trường, Cấp 3 chỉ nhận cơ sở mình. Nên màn này CỐ Ý không có ô chọn nhóm —
  // dựng ô chọn từ `App.state.classes` là mời quản lý cơ sở bấm sang nhóm cơ
  // sở khác rồi nhận 403, đúng lỗi đã vá ở Đ94.
  async renderVanPhong(root) {
    if (!this.date) this.date = UI.todayStr();
    let r;
    try {
      r = await API.get(`/api/attendance/ra-soat?date=${encodeURIComponent(this.date)}`);
    } catch (e) {
      root.innerHTML = UI.pageHeader('Điểm danh')
        + UI.emptyState('🗓️', e.message || 'Chưa mở được bảng rà soát');
      return;
    }
    const ds = r.danhSach || [];
    const tenNhom = (classId) => {
      const c = (App.state.classes || []).find(x => x.id === classId);
      return c ? c.name : '';
    };

    // SỔ ĐIỂM DANH CỦA CẢ PHẠM VI (Đ131). Nhà trường: "điểm danh thường do bảo
    // vệ chụp ở cổng, sau 8h30 admin điểm danh chứ không phải giáo viên — nên
    // admin, quản lý cơ sở được quyền check-in các lớp tại cơ sở". KHÔNG kèm
    // mã nhóm: máy chủ tự cắt theo phạm vi của tài khoản, đúng như bảng rà soát.
    let so = { students: [] };
    try {
      so = await API.get(`/api/attendance/class?date=${encodeURIComponent(this.date)}`);
    } catch (e) { so = { students: [], loi: e.message }; }
    this._roster = so.students || [];
    this._raSoat = r;

    root.innerHTML = `
      ${UI.pageHeader('Điểm danh')}
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Ngày điểm danh</label>
          <input type="date" value="${UI.esc(this.date)}" max="${UI.esc(UI.todayStr())}"
                 onchange="App.views.attendance.setDate(this.value)">
          ${UI.dongNgayViet(this.date)}
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          Văn phòng xem và chấm được cả phạm vi mình phụ trách: chụp ảnh con tới
          lớp ở cổng, và chốt sổ vắng sau giờ rà soát.
        </div>
        ${this.theMocRaSoat(r)}
      </div>
      ${this.theRaSoatVanPhong(r, ds, tenNhom)}
      ${this.theNgayDaKhoa()}
      <div id="att-nv-o"></div>
      ${this.theDiemDanhCoSo(so)}
      ${this.theChiDuongTraBe()}`;
    this.ganNutGoi(root);
    this.taiNhanVien();
  },

  // =========================================================================
  // GỌI XÁC NHẬN MỘT CHẠM (góp ý 06/10, mục 2 phần 1)
  // =========================================================================
  //
  // *"Khi hiện danh sách cần gọi xác nhận → khi click vào bé đó có thể ấn và
  // call trực tiếp với phụ huynh"*. Số điện thoại KHÔNG đi theo bảng rà soát:
  // bảng ấy mở cả cho tài khoản bảo vệ ở cổng (Đ156 — "KHÔNG mở được hồ sơ
  // bé"). Bấm Gọi thì hỏi đường hồ sơ bé, đường ấy đã chặn bảo vệ — nên ai
  // được thấy số thì thấy, bảo vệ nhận một câu nhờ văn phòng gọi.
  ganNutGoi(root) {
    for (const b of root.querySelectorAll('[data-goi-be]')) b.onclick = () => this.moGoi(b.dataset.goiBe);
  },

  async moGoi(studentId) {
    let s;
    try {
      s = await API.get(`/api/students/${encodeURIComponent(studentId)}`);
    } catch (_) {
      UI.modal(`<div class="muted" style="line-height:1.7">
        Tài khoản này không xem được số điện thoại của gia đình. Nhờ văn phòng cơ sở gọi xác nhận giúp nhé.
      </div><button class="btn outline block mt-14" onclick="UI.closeModal()">Đóng</button>`, 'Gọi xác nhận');
      return;
    }
    const dong = (nhan, so) => {
      const sach = String(so || '').replace(/\s/g, '');
      return `<div class="list-row">
        <div class="row-main"><div class="row-sub">${UI.esc(nhan)}</div><div class="row-title">${UI.esc(so || '—')}</div></div>
        ${sach ? `<a class="btn sm primary" href="tel:${UI.esc(sach)}">📞 Gọi</a>` : ''}
      </div>`;
    };
    const ph = (s.parents || []).map(p => dong(`${p.title || ''} ${p.name || ''}`.trim(), p.phone));
    const kc = (s.lienHeKhanCap || []).map(x => dong(`Khẩn cấp: ${x.hoTen}${x.quanHe ? ` (${x.quanHe})` : ''}`, x.dienThoai));
    UI.modal(`
      <div class="muted small" style="line-height:1.6;margin-bottom:6px">${UI.esc(s.name)} · ${UI.esc(s.className || '')}</div>
      ${ph.join('') + kc.join('') || '<div class="muted small">Hồ sơ chưa có số điện thoại nào — nhờ văn phòng bổ sung.</div>'}
      <button class="btn outline block mt-14" onclick="UI.closeModal()">Đóng</button>`, 'Gọi xác nhận');
  },

  // =========================================================================
  // GIÁO VIÊN & NHÂN VIÊN — CHẤM CÔNG BẰNG ẢNH (góp ý 06/10, mục 2 phần 2)
  // =========================================================================
  //
  // Đứng ĐẦU danh sách nhóm, gập sẵn như mọi nhóm. Bấm một người → chụp ảnh:
  // lần đầu là giờ vào, lần hai là giờ ra. Người chụp chỉ thấy tên và giờ —
  // ảnh khuôn mặt người lớn chỉ Nhân sự / Ban giám hiệu mở được.
  // Tài khoản không chấm công (máy chủ trả 403) thì khối này không vẽ gì.
  async taiNhanVien() {
    const o = document.getElementById('att-nv-o');
    if (!o) return;
    let d;
    try { d = await API.get(`/api/attendance/nhan-vien?date=${encodeURIComponent(this.date)}`); } catch (_) { o.innerHTML = ''; return; }
    const ds = d.danhSach || [];
    if (!ds.length) { o.innerHTML = ''; return; }
    const daVao = ds.filter(x => x.gioVao).length;
    const moSan = this._nvMo ? ' open' : '';
    o.innerHTML = `<details class="card" id="att-nv" style="padding:0"${moSan}>
      <summary style="cursor:pointer;padding:12px 14px;font-weight:700;display:flex;gap:8px;align-items:center">
        <span>👩‍🏫 Giáo viên &amp; nhân viên</span>
        <span class="muted small" style="font-weight:500">${daVao}/${ds.length} đã chụp ảnh vào</span>
      </summary>
      <div style="padding:0 14px 8px">${ds.map(x => this.dongNhanVien(x, d.homNay)).join('')}</div>
    </details>`;
    const the = document.getElementById('att-nv');
    the.ontoggle = () => { this._nvMo = the.open; };
    for (const b of o.querySelectorAll('[data-chup-nv]')) b.onclick = () => this.chupNhanVien(b.dataset.chupNv);
    for (const b of o.querySelectorAll('[data-go-nv]')) b.onclick = () => this.goNhanVien(b.dataset.goNv);
  },

  dongNhanVien(x, homNay) {
    const gio = [x.gioVao ? `Vào ${x.gioVao}` : '', x.gioRa ? `Ra ${x.gioRa}` : ''].filter(Boolean).join(' · ');
    const nut = !homNay ? ''
      : (!x.gioVao
        ? `<button class="btn sm primary" data-chup-nv="${UI.esc(x.userId)}">📸 Chụp ảnh vào</button>`
        : (!x.gioRa
          ? `<button class="btn sm success-soft" data-chup-nv="${UI.esc(x.userId)}">📸 Chụp ảnh ra</button>`
          : '<span class="small" style="color:var(--success)">Đã đủ vào và ra</span>'))
        + (x.gioVao ? ` <button class="btn sm outline" data-go-nv="${UI.esc(x.userId)}">Gỡ lần chụp cuối</button>` : '');
    return `<div class="list-row" style="align-items:flex-start" id="att-nv-${UI.esc(x.userId)}">
      <span ${homNay && !x.gioRa ? `data-chup-nv="${UI.esc(x.userId)}" style="cursor:pointer"` : ''}>${UI.avatar(x.avatar, 40)}</span>
      <div class="row-main">
        <div class="row-title">${UI.esc(`${x.title ? `${x.title} ` : ''}${x.hoTen}`)} <span class="muted small">· ${UI.esc(x.vai)}</span></div>
        <div class="row-sub">${gio ? UI.esc(gio) : '<span class="muted">Chưa chụp ảnh vào</span>'}</div>
        <div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:6px">${nut}</div>
      </div>
    </div>`;
  },

  chupNhanVien(userId) {
    const o = document.createElement('input');
    o.type = 'file';
    o.accept = 'image/*';
    o.capture = 'environment';
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        const anh = await UI.nenAnh(f, { canhToiDa: 900, chatLuong: 0.72 });
        const kq = await API.post('/api/attendance/nhan-vien/anh', { userId, anh });
        UI.toast(kq.phan === 'ra' ? `Đã ghi giờ ra ${kq.gioRa}` : `Đã ghi giờ vào ${kq.gioVao}`, 'success');
        this._nvMo = true;
        this.taiNhanVien();
      } catch (e) { UI.toast(e.message || 'Chưa gửi được ảnh', 'error'); }
    };
    o.click();
  },

  async goNhanVien(userId) {
    if (!confirm('Gỡ lần chụp gần nhất của người này hôm nay?')) return;
    try {
      await API.post('/api/attendance/nhan-vien/go', { userId });
      UI.toast('Đã gỡ', 'success');
      this._nvMo = true;
      this.taiNhanVien();
    } catch (e) { UI.toast(e.message || 'Chưa gỡ được', 'error'); }
  },

  // Sổ điểm danh của cả cơ sở, xếp theo nhóm — mỗi nhóm một khối gập được.
  //
  // Không có ô chọn nhóm (xem chú thích renderVanPhong): danh sách đã do máy
  // chủ cắt theo phạm vi, và một cơ sở 100 bé gập theo nhóm thì cuộn tới nhóm
  // nào bấm nhóm đó, không cần chọn trước. Dòng bé dùng CHUNG với màn của cô
  // (`rosterRow`) để hai vai chấm cùng một cách, sửa một chỗ là đủ.
  theDiemDanhCoSo(so) {
    const ds = (so && so.students) || [];
    if (so && so.loi) return `<div class="card muted small">${UI.esc(so.loi)}</div>`;
    if (!ds.length) return '';
    const theoNhom = new Map();
    for (const r of ds) {
      const k = r.student.classId || '';
      if (!theoNhom.has(k)) theoNhom.set(k, { ten: r.student.className || 'Chưa xếp nhóm', ds: [] });
      theoNhom.get(k).ds.push(r);
    }
    // GẬP SẴN (góp ý 06/10, mục 2): *"hiện hết tên học sinh thế kéo tìm rất là
    // mệt. Đầu tiên sẽ hiện: Giáo viên, Lớp 1, Lớp 2… click vào sẽ hiện ra toàn
    // bộ danh sách"*. Trước đây ba nhóm trở xuống thì mở sẵn hết. Chỉ còn mở
    // sẵn khi phạm vi có đúng một nhóm — gập một nhóm duy nhất là bắt bấm thừa.
    const moSan = theoNhom.size <= 1;
    return [...theoNhom.values()]
      .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
      .map(n => {
        const daCham = n.ds.filter(r => r.record).length;
        return `<details class="card" style="padding:0"${moSan ? ' open' : ''}>
          <summary style="cursor:pointer;padding:12px 14px;font-weight:700;display:flex;gap:8px;align-items:center">
            <span>${UI.esc(n.ten)}</span>
            <span class="muted small" style="font-weight:500">${daCham}/${n.ds.length} đã điểm danh</span>
          </summary>
          <div style="padding:0 14px 8px">${n.ds.map(r => this.rosterRow(r)).join('')}</div>
        </details>`;
      }).join('');
  },

  // Văn phòng: sổ trả bé xem theo từng nhóm ở màn Đón trả bé — màn rà soát này
  // cố ý không có ô chọn nhóm (xem chú thích renderVanPhong), nên chỉ chỉ đường.
  theChiDuongTraBe() {
    if (!this.phanTraBe()) return '';
    return `<div class="card">
      <div class="muted small" style="line-height:1.6">
        Sổ trả bé (ai đón, lúc mấy giờ, ảnh lúc trả) xem theo từng nhóm ở phần Đón trả bé.
      </div>
      <button class="btn outline block mt-8" onclick="location.hash='#/dontra'">${UI.icon('chevron', 16)} Mở Đón trả bé</button>
    </div>`;
  },

  // BA TRẠNG THÁI, KHÔNG PHẢI HAI.
  //
  // Máy chủ ép `soCanRaSoat: 0` và `danhSach: []` khi chưa qua giờ rà soát, nên
  // "7 giờ 30 sáng, chưa tới giờ" và "đã qua 9 giờ, mọi bé đều xong" trông y
  // hệt nhau nếu chỉ nhìn độ dài mảng. Nói gộp hai cái đó là nói dối văn phòng
  // đúng lúc họ cần tin nhất.
  //
  // Và màn rỗng KHÔNG phải một ô trống chờ lấp: "không bé nào cần gọi" là việc
  // của người lớn đã xong, là tin tốt. QUY TẮC 2 cấm trình bày "chưa" như một
  // thất bại — ở đây còn không có chữ "chưa" nào của một đứa trẻ cả.
  // ĐỔI MỐC GIỜ RÀ SOÁT NGAY TẠI CHỖ NÓ CÓ NGHĨA (Đ155, DD-07).
  //
  // Đặt ở màn Điểm danh chứ không giấu trong Quản trị: người thấy bảng rà soát
  // kêu sai giờ chính là người muốn đổi nó, và bắt họ đi tìm một tab khác là
  // cách chắc chắn để không ai đổi bao giờ. Cô đọc được mốc, chỉ quản trị mới
  // đổi — máy chủ đã chốt vai, chỗ này chỉ giấu nút cho đỡ mời gọi.
  theMocRaSoat(r) {
    const u = App.state.user || {};
    const chu = this.chuGioRaSoat(r);
    if (u.role !== 'admin' || r.datNepDuoc === false) {
      return `<div class="muted small mt-8">Bảng rà soát của trường chốt lúc ${UI.esc(chu)}.</div>`;
    }
    return `
      <div class="flex mt-8" style="gap:8px;align-items:center;flex-wrap:wrap">
        <span class="muted small">Bảng rà soát chốt lúc</span>
        <input type="time" id="dd-moc-ra-soat" value="${UI.esc(String(r.gioRaSoat || '09:00'))}"
               style="max-width:130px">
        <button class="btn sm outline" onclick="App.views.attendance.luuMocRaSoat()">Lưu mốc giờ</button>
      </div>
      <div class="muted small mt-8" style="line-height:1.6">
        Trước mốc này bảng rà soát im lặng, vì các cô vẫn đang đón bé. Trường
        điểm danh từ mấy giờ thì đặt đúng giờ đó.
      </div>`;
  },

  async luuMocRaSoat() {
    const o = document.getElementById('dd-moc-ra-soat');
    if (!o) return;
    try {
      const kq = await API.put('/api/attendance/cai-dat', { gioRaSoat: o.value });
      UI.toast(`Đã đặt mốc rà soát lúc ${kq.gioRaSoatChu}`);
      this.render(document.getElementById('view'), []);
    } catch (e) {
      UI.toast(e.message || 'Chưa lưu được mốc giờ', 'error');
    }
  },

  // MỐC GIỜ RÀ SOÁT NÓI BẰNG TIẾNG CỦA TRƯỜNG (Đ155).
  //
  // Máy chủ trả `gioRaSoat` dạng "HH:MM" và `gioRaSoatChu` dạng "8h30" — dùng
  // chữ, vì "chốt lúc 08:30 giờ" không phải câu tiếng Việt. Vẫn có đường lùi
  // cho điện thoại còn giữ bản giao diện cũ trong bộ nhớ đệm: nếu máy chủ chưa
  // gửi `gioRaSoatChu` thì tự dựng lấy từ "HH:MM", và nếu nhận được một con số
  // (bản trước Đ155 trả về số 9) thì vẫn đọc xuôi thành "9h".
  chuGioRaSoat(r) {
    if (r && r.gioRaSoatChu) return String(r.gioRaSoatChu);
    const g = String((r && r.gioRaSoat) != null ? r.gioRaSoat : '');
    const m = g.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return m[2] === '00' ? `${Number(m[1])}h` : `${Number(m[1])}h${m[2]}`;
    return g ? `${g}h` : '9h';
  },

  theRaSoatVanPhong(r, ds, tenNhom) {
    if (!r.quaGio) {
      return `<div class="card">
        <div class="card-title">Sáng nay còn đang điểm danh</div>
        <div class="muted small" style="line-height:1.7">
          Bảng rà soát chốt lúc ${UI.esc(this.chuGioRaSoat(r))}. Trước giờ đó các cô
          vẫn đang đón bé và chấm sổ, nên bảng này chỉ có nghĩa sau giờ đó.
          Quay lại sau ${UI.esc(this.chuGioRaSoat(r))} nhé.
        </div>
      </div>`;
    }
    if (!ds.length) {
      return `<div class="card" style="border-left:4px solid var(--success)">
        <div class="card-title" style="color:var(--success)">
          ${UI.icon('check', 16)} Cả trường đã xong
        </div>
        <div class="muted small" style="line-height:1.7">
          Đã qua ${UI.esc(this.chuGioRaSoat(r))} và mọi bé đều đã có dòng điểm danh,
          hoặc đã có đơn nghỉ được duyệt. Văn phòng không cần gọi cuộc nào.
        </div>
        ${r.soDaCoDonNghi ? `<div class="muted small mt-8">
          ${UI.esc(String(r.soDaCoDonNghi))} bé đang nghỉ có đơn đã duyệt.
        </div>` : ''}
      </div>`;
    }
    return `
      <div class="card" style="border-left:4px solid var(--danger)">
        <div class="card-title" style="color:var(--danger)">
          ${UI.icon('bell', 16)} Cần gọi xác nhận: ${UI.esc(String(ds.length))} bé
        </div>
        <div class="muted small" style="line-height:1.6;margin-bottom:8px">
          Đã qua ${UI.esc(this.chuGioRaSoat(r))} mà những bé dưới đây chưa có dòng
          điểm danh nào, và cũng chưa có đơn nghỉ được duyệt. Có thể cô chưa kịp chấm,
          cũng có thể gia đình quên báo — gọi một cuộc cho chắc.
        </div>
        ${ds.map(x => `
          <div class="list-row">
            ${UI.avatar(x.avatar, 34)}
            <div class="row-main">
              <div class="row-title">${UI.esc(x.hoTen)}</div>
              ${tenNhom(x.classId) ? `<div class="row-sub">${UI.esc(tenNhom(x.classId))}</div>` : ''}
            </div>
            <button class="btn sm outline" data-goi-be="${UI.esc(x.studentId)}">📞 Gọi</button>
          </div>`).join('')}
        ${r.soDaCoDonNghi ? `<div class="muted small mt-8">
          ${UI.esc(String(r.soDaCoDonNghi))} bé khác đang nghỉ có đơn đã duyệt — không cần gọi.
        </div>` : ''}
        ${this.nutChotVang(ds.length)}
      </div>`;
  },

  // Nút chốt sổ vắng — chỉ cho HÔM NAY, và nằm cuối bảng rà soát: gọi xác nhận
  // xong mới chốt, không phải bấm trước rồi gọi sau.
  nutChotVang(soBe) {
    if (this.ngayDaKhoa() || !soBe) return '';
    // Máy chủ đã chặn (Đ156); chỗ này chỉ để không mời bấm một nút sẽ bị từ
    // chối. Chưa có trường thì coi như được, để bản giao diện cũ trong bộ nhớ
    // đệm của điện thoại vẫn hiện nút y như trước.
    if (this._raSoat && this._raSoat.datNepDuoc === false) return '';
    return `
      <div class="muted small mt-8" style="line-height:1.6">
        Gọi xác nhận xong mà bé không tới thì chốt sổ một lượt: ${UI.esc(String(soBe))} bé
        chưa có dòng điểm danh sẽ được ghi <b>Nghỉ không phép</b>; bé có đơn nghỉ được duyệt
        thì ghi <b>Nghỉ có phép</b>. Bé tới muộn mà được chụp ảnh sau đó vẫn đổi lại thành có mặt.
      </div>
      <button class="btn outline block mt-8" id="att-chot-vang" onclick="App.views.attendance.chotVang()">
        ${UI.icon('check', 16)} Chốt sổ vắng cho ${UI.esc(String(soBe))} bé
      </button>`;
  },

  chotVang() {
    const r = this._raSoat || {};
    const n = (r.danhSach || []).length;
    UI.modal(`
      <p style="line-height:1.6">Ghi <b>Nghỉ không phép</b> cho <b>${UI.esc(String(n))} bé</b> chưa có dòng
        điểm danh và chưa có đơn nghỉ được duyệt?</p>
      <p class="muted small" style="line-height:1.6">
        Bé có đơn nghỉ được duyệt sẽ được ghi <b>Nghỉ có phép</b>. Bé đã có dòng điểm danh giữ nguyên.
        Chốt xong mà bé tới lớp và được chụp ảnh thì dòng đó đổi lại thành có mặt.
      </p>
      <button class="btn primary block mt-14" id="att-chot-dong-y">Chốt sổ vắng</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Chốt sổ vắng');
    document.getElementById('att-chot-dong-y').onclick = async () => {
      try {
        const kq = await API.post('/api/attendance/chot-vang',
          { date: this.date, classId: this.nhomId || undefined });
        UI.closeModal();
        UI.toast(`Đã ghi ${kq.soNghiKhongPhep} bé nghỉ không phép và ${kq.soNghiCoPhep} bé nghỉ có phép`, 'success');
        App.route();
        App.refreshBadges();
      } catch (e) { UI.toast(e.message || 'Chưa chốt được sổ', 'error'); }
    };
  },

  // ---- Phụ huynh: lịch tháng của con ----
  async renderParent(root, params = []) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Điểm danh') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    // '#/attendance/<ngày>' là địa chỉ thông báo "Con đã được đón về" trỏ tới:
    // mở đúng tháng ấy rồi mở hộp của ngày ấy, để chạm thông báo là thấy ảnh.
    const moNgay = /^\d{4}-\d{2}-\d{2}$/.test(params[0] || '') ? params[0] : '';
    if (moNgay) this.month = moNgay.slice(0, 7);
    if (!this.month) this.month = UI.todayStr().slice(0, 7);
    // Ảnh "con đã tới lớp" và sổ trả bé của tháng (Đ126) hỏi song song. Hỏng
    // đường nào thì màn điểm danh vẫn phải dựng bình thường — chúng là phần
    // thêm, không phải phần chính. Sổ trả bé do phân hệ Đón trả bé nạp: tắt
    // hay hỏng thì là một bảng rỗng, không phải một lỗi.
    const pt = this.phanTraBe();
    this._pt = pt && !pt.hong ? pt : null;
    const [records, kho, soTra] = await Promise.all([
      API.get(`/api/attendance?studentId=${encodeURIComponent(current.id)}&month=${this.month}`),
      API.get(`/api/attendance/anh?studentId=${encodeURIComponent(current.id)}&month=${this.month}`)
        .catch(() => ({ anh: [] })),
      this._pt
        ? Promise.resolve().then(() => this._pt.napSoThang(current.id, this.month)).catch(() => new Map())
        : Promise.resolve(new Map()),
    ]);
    this._byDate = {};
    records.forEach(r => { this._byDate[r.date] = r; });
    this._anhTheoNgay = {};
    (kho.anh || []).forEach(a => { this._anhTheoNgay[a.date] = a; });
    // Ảnh lúc ra về: khoá riêng `anhVe`, máy chủ đã gộp sẵn ảnh trả bé cũ của
    // phân hệ Đón trả bé khi phân hệ ấy bật.
    this._anhVeTheoNgay = {};
    (kho.anhVe || []).forEach(a => { this._anhVeTheoNgay[a.date] = a; });
    this._soThang = soTra instanceof Map ? soTra : new Map();

    const [y, m] = this.month.split('-').map(Number);
    const counts = { present: 0, late: 0, absent_excused: 0, absent_unexcused: 0 };
    records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
    const recent = records.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    root.innerHTML = `
      ${UI.pageHeader('Điểm danh')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px">
        <button class="btn outline sm" onclick="App.views.attendance.changeMonth(-1)" aria-label="Tháng trước">‹</button>
        <b>Tháng ${m}/${y}</b>
        <button class="btn outline sm" onclick="App.views.attendance.changeMonth(1)" aria-label="Tháng sau">›</button>
      </div>
      <div class="stat-row">
        ${this.STATUS_KEYS.filter(k => k !== 'late' || counts.late > 0).map(k => `
          <div class="stat-box">
            <div class="stat-num" style="color:${UI.ATT_STATUS[k].color}">${counts[k]}</div>
            <div class="stat-label">${UI.esc(this.SHORT[k])}</div>
          </div>`).join('')}
      </div>
      <div class="muted small" style="text-align:center;margin:-6px 0 12px;line-height:1.6">
        Số ngày con ăn ở trường tháng này (để đối chiếu tiền ăn): <b>${counts.present + counts.late}</b>
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('calendar', 19)} Lịch điểm danh của con</div>
        ${this.calendarHtml(y, m)}
        <div class="flex mt-14" style="flex-wrap:wrap;gap:10px;justify-content:center">
          ${this.STATUS_KEYS.map(k => `
            <span class="small muted flex" style="gap:5px">
              <span style="width:8px;height:8px;border-radius:50%;background:${UI.ATT_STATUS[k].color};display:inline-block"></span>${UI.esc(UI.ATT_STATUS[k].label)}
            </span>`).join('')}
          ${this._pt ? `
            <span class="small muted flex" style="gap:5px">
              <span class="dot tra" style="width:8px;height:8px;border-radius:50%;display:inline-block;margin:0"></span>Có ghi sổ trả bé
            </span>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-title">${UI.icon('clock', 19)} Bản ghi gần nhất</div>
        ${recent.length
          ? recent.map(r => this.recordRow(r)).join('')
          : UI.emptyState('🗓️', 'Tháng này chưa có dữ liệu điểm danh của con')}
      </div>
      ${this._pt ? `
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Ai được đón bé, và uỷ quyền đón một lần khi nhờ người khác đón hộ — gia đình khai ở phần Đón trả bé.
        </div>
        <button class="btn outline block mt-8" onclick="location.hash='#/dontra'">${UI.icon('chevron', 16)} Mở Đón trả bé</button>
      </div>` : ''}`;
    if (moNgay) {
      // Đổi tháng hay chọn bé khác là vẽ lại theo địa chỉ đang mở — bỏ phần
      // ngày khỏi địa chỉ để hộp không tự bật lên lần nữa.
      history.replaceState(null, '', '#/attendance');
      this.showDay(moNgay);
    }
  },

  // Lưới lịch tháng: hàng đầu T2..CN, ô ngoài tháng làm mờ (dim).
  calendarHtml(y, m) {
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // số ô đệm trước ngày 1 (tuần bắt đầu T2)
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevDays = new Date(y, m - 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const today = UI.todayStr();
    let cells = '';
    for (let i = 0; i < total; i++) {
      const dayNum = i - lead + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells += `<div class="cal-cell dim">${dayNum < 1 ? prevDays + dayNum : dayNum - daysInMonth}</div>`;
        continue;
      }
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const rec = this._byDate[dateStr];
      const st = rec ? UI.ATT_STATUS[rec.status] : null;
      // Ngày cô quên chấm sáng nhưng có ghi sổ trả chiều vẫn mở được (Đ126).
      const coTra = this._soThang.has(dateStr);
      const moDuoc = !!rec || coTra;
      cells += `
        <div class="cal-cell ${moDuoc ? 'clickable' : ''}"
          ${moDuoc ? `onclick="App.views.attendance.showDay('${dateStr}')"` : ''}
          ${dateStr === today ? 'style="outline:2px solid var(--primary)"' : ''}>
          ${dayNum}
          <span class="dots"><span class="dot" style="background:${st ? st.color : 'transparent'}"></span>${
            coTra ? '<span class="dot tra"></span>' : ''}</span>
        </div>`;
    }
    return `<div class="att-cal">
      ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => `<div class="cal-head">${d}</div>`).join('')}
      ${cells}
    </div>`;
  },

  // MỘT NGÀY TRONG DANH SÁCH THÁNG CỦA GIA ĐÌNH (Đ131, theo ảnh mẫu của
  // trường): ảnh thu nhỏ lúc vào lớp ngay trên dòng, "Vào lớp HH:MM · Ra về
  // HH:MM" — không phải bấm từng ngày mới thấy mặt con. Giờ ra về lấy từ giờ
  // ra nếu cô ghi, không thì từ sổ trả bé. `loading="lazy"`: một tháng là
  // hơn hai chục ảnh, chỉ tải khi cuộn tới.
  recordRow(r) {
    const st = UI.ATT_STATUS[r.status] || UI.ATT_STATUS.present;
    const gioVe = r.checkOut || this.gioTraBe(r.date) || '';
    const times = [r.checkIn ? `Vào lớp ${r.checkIn}` : null, gioVe ? `Ra về ${gioVe}` : null].filter(Boolean).join(' · ');
    const tra = this.chuTraBe(r.date);
    const a = (this._anhTheoNgay || {})[r.date];
    const ve = (this._anhVeTheoNgay || {})[r.date];
    // Ảnh lúc ra về (góp ý 16/10, PH2) đứng ngay sau ảnh lúc tới lớp.
    const anhNho = [a && a.file && [a.file, 'Ảnh con tới lớp'], ve && [ve.file, 'Ảnh con lúc ra về']].filter(Boolean);
    return `
      <div class="list-row clickable" onclick="App.views.attendance.showDay('${UI.esc(r.date)}')">
        ${anhNho.length
          ? `<span style="display:flex;gap:4px;flex:none">${anhNho.map(([file, chu]) => `
              <img src="/api/attendance/anh/${UI.esc(file)}" alt="${chu}" loading="lazy"
               style="width:42px;height:42px;flex:none;border-radius:10px;object-fit:cover;border:2px solid ${st.color}">`).join('')}</span>`
          : `<span style="width:10px;height:10px;border-radius:50%;background:${st.color};flex:none"></span>`}
        <div class="row-main">
          <div class="row-title">${UI.esc(UI.fmtDate(r.date))}</div>
          <div class="row-sub">${UI.esc(times || 'Không ghi nhận giờ vào/ra')}${r.note ? ` · ${UI.esc(r.note)}` : ''}${tra ? ` · ${UI.esc(tra)}` : ''}</div>
        </div>
        <span class="row-end">${UI.badge(st.label, st.cls)}</span>
      </div>`;
  },

  // MỘT NGÀY CỦA CON, CẢ HAI NỬA (Đ126): nửa trên là Đón bé (trạng thái, ảnh
  // tới lớp, giờ), nửa dưới là Trả bé do phân hệ Đón trả bé vẽ (về với ai,
  // lúc mấy giờ, ảnh lúc trả). Ngày chỉ có một nửa thì chỉ hiện nửa đó; "cô
  // chưa chấm" là việc của người lớn, chữ xám, không đỏ.
  showDay(dateStr) {
    const r = this._byDate[dateStr];
    const traBe = this.htmlTraBe(dateStr);
    if (!r && !traBe) return;
    const st = r ? (UI.ATT_STATUS[r.status] || UI.ATT_STATUS.present) : null;
    // "Giờ ra về" trống mà sổ trả có giờ thì lấy giờ đó — không hiện "—" ngay
    // trên dòng "về với bà lúc 16:35".
    const gioVe = (r && r.checkOut) || this.gioTraBe(dateStr) || '—';
    UI.modal(`
      <div class="center">
        <div class="muted small">${UI.esc(UI.fmtDate(dateStr))}</div>
        <div class="mt-8">${st ? UI.badge(st.label, st.cls) : '<span class="muted small">Cô chưa chấm điểm danh ngày này</span>'}</div>
      </div>
      ${this.anhCuaNgay(dateStr, traBe)}
      <div class="mt-14">
        ${this.detailRow('Giờ đến lớp', (r && r.checkIn) || '—')}
        ${this.detailRow('Giờ ra về', gioVe)}
        ${this.detailRow('Ghi chú của cô', (r && r.note) || 'Không có ghi chú')}
      </div>
      ${traBe}`, 'Chi tiết điểm danh');
  },

  // Ảnh của một ngày, nếu cô có chụp.
  //
  // Ngày không có ảnh thì KHÔNG hiện gì cả — không khung xám, không chữ "chưa
  // có ảnh". Cô chụp được hôm nào hay hôm ấy; biến ngày không có ảnh thành một
  // ô trống chờ lấp là đặt lên vai cô một nghĩa vụ mỗi ngày mà không ai hứa.
  //
  // Có ảnh lúc ra về (góp ý 16/10, PH2) thì hai tấm đứng cạnh nhau, mỗi tấm
  // một chú thích. Phân hệ Đón trả bé đang bật tự vẽ ảnh trả bé cũ ở nửa Trả
  // bé của hộp (`traBe`), nên tấm nào đã có ở đó thì không vẽ lần nữa.
  anhCuaNgay(date, traBe = '') {
    const a = (this._anhTheoNgay || {})[date];
    const v = (this._anhVeTheoNgay || {})[date];
    const ve = v && !traBe.includes(v.file) ? v : null;
    if (!a && !ve) return '';
    if (!ve) {
      return `
      <div class="mt-14 center">
        <img src="/api/attendance/anh/${UI.esc(a.file)}" alt="Ảnh con tới lớp"
          style="max-width:100%;border-radius:12px">
        <div class="muted small mt-8">Cô chụp lúc ${UI.esc(a.taoLuc || '')}</div>
      </div>`;
    }
    const tam = (x, chu) => `
        <div style="flex:1;min-width:0">
          <img src="/api/attendance/anh/${UI.esc(x.file)}" alt="${chu}" style="max-width:100%;border-radius:12px">
          <div class="muted small mt-8">${chu}${x.taoLuc ? ` · cô chụp lúc ${UI.esc(x.taoLuc)}` : ''}</div>
        </div>`;
    return `
      <div class="mt-14 center" style="display:flex;gap:10px;align-items:flex-start">
        ${a ? tam(a, 'Ảnh con tới lớp') : ''}${tam(ve, 'Ảnh con lúc ra về')}
      </div>`;
  },

  // Bản dùng chung nằm ở UI.dongThongTin; giữ tên cũ để chỗ gọi khỏi đổi.
  // Khác biệt duy nhất: giá trị trống nay hiện "—" thay vì một ô trắng.
  detailRow(label, value) {
    return UI.dongThongTin(label, value);
  },

  changeMonth(delta) {
    const [y, m] = this.month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    App.route();
  },

  // ---- Cô: điểm danh nhóm theo ngày ----
  //
  // Cô mầm non có thể phụ trách 2–3 nhóm. Dồn trẻ của mấy nhóm vào một danh sách
  // là cô điểm danh nhầm nhóm mà không hay biết, nên khi cô có nhiều hơn một
  // nhóm thì màn hình bắt chọn nhóm trước. Cô một nhóm không thấy ô chọn này và
  // số thao tác không đổi một chút nào.
  //
  // HAI PHẦN TRONG MỘT NGÀY (Đ126): `tab` là 'don' (mặc định, luôn — KHÔNG tự
  // chọn theo giờ trong ngày, mặc định phải đoán được) hay 'tra'. Dải tab chỉ
  // vẽ khi phân hệ Đón trả bé đang bật; tắt thì màn y hệt trước Đ126 và
  // '#/attendance/tra' lặng lẽ về phần Đón bé. Ô ngày và ô nhóm dùng chung
  // cho cả hai phần — màn này là CHỦ của `date` và `nhomId`, phần Trả bé nhận
  // hai giá trị ấy, không vẽ ô riêng.
  async renderTeacher(root) {
    const tab = 'don';
    if (!this.date) this.date = UI.todayStr();
    const dsNhom = (App.state.user.nhomCuaCo || []);
    if (dsNhom.length > 1 && !dsNhom.some(n => n.id === this.nhomId)) {
      this.nhomId = dsNhom[0].id;
    }
    if (dsNhom.length <= 1) this.nhomId = null;
    const pt = this.phanTraBe();
    const q = `date=${this.date}` + (this.nhomId ? `&classId=${encodeURIComponent(this.nhomId)}` : '');
    // Phần Trả bé không cần bảng rà soát sáng — bớt một lời gọi đúng giờ
    // cao điểm 16h30, khi cả ba cơ sở cùng mở màn này.
    const [data, raSoat] = await Promise.all([
      API.get(`/api/attendance/class?${q}`),
      tab === 'don'
        ? API.get(`/api/attendance/ra-soat?${q}`).catch(() => ({ quaGio: false, danhSach: [] }))
        : Promise.resolve({ quaGio: false, danhSach: [] }),
    ]);
    this._roster = data.students;
    this._raSoat = raSoat;
    this._truongNghi = data.truongNghi || null;
    const tenNhom = this.nhomId
      ? (dsNhom.find(n => n.id === this.nhomId) || {}).name || ''
      : UI.noiTenNhom(dsNhom);
    const total = this._roster.length;
    const marked = this._roster.filter(r => r.record).length;

    root.innerHTML = `
      ${UI.pageHeader(`Điểm danh ${tenNhom}`)}

      <div class="card">
        ${dsNhom.length > 1 ? `
          <div class="field">
            <label>Nhóm lớp</label>
            <select onchange="App.views.attendance.setNhom(this.value)">
              ${dsNhom.map(n => `<option value="${UI.esc(n.id)}" ${n.id === this.nhomId ? 'selected' : ''}>${UI.esc(n.name)}</option>`).join('')}
            </select>
          </div>` : ''}
        <div class="field" style="margin-bottom:0">
          <label>Ngày điểm danh</label>
          <input type="date" value="${UI.esc(this.date)}" max="${UI.esc(UI.todayStr())}"
                 onchange="App.views.attendance.setDate(this.value)">
          ${UI.dongNgayViet(this.date)}
        </div>
      </div>
      ${this.theTruongNghi()}
      ${this.theNgayDaKhoa()}
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Số bé</div></div>
        <div class="stat-box"><div class="stat-num" id="att-so-da" style="color:var(--success)">${marked}</div><div class="stat-label">Đã điểm danh</div></div>
        <div class="stat-box"><div class="stat-num" id="att-so-chua" style="color:${total - marked ? 'var(--warning)' : 'var(--muted)'}">${total - marked}</div><div class="stat-label">Chưa điểm danh</div></div>
      </div>
      ${this.theRaSoat()}
      <div class="card mt-14">
        ${total
          ? this._roster.map(r => this.rosterRow(r)).join('')
          : UI.emptyState('🎒', 'Nhóm chưa có bé nào')}
      </div>
      ${this.ngayDaKhoa() || !total ? '' : `
      <div class="muted small" style="line-height:1.6;margin:0 2px 8px">
        Hôm nào không chụp ảnh được (máy hỏng, mất mạng ở cổng) thì ghi tay một lượt:
      </div>
      <button class="btn outline block" onclick="App.views.attendance.markAll()">${UI.icon('check', 18)} Cả nhóm có mặt (không kèm ảnh)</button>`}`;
    this.ganNutGoi(root);
  },

  // NGÀY KHÁC HÔM NAY THÌ CHỈ XEM LẠI (Đ127).
  //
  // Nhà trường chốt: điểm danh ngày nào chỉ ghi và sửa trong ngày đó. Máy chủ
  // là chỗ giữ luật (`routes/attendance.js`); màn hình chỉ cần đừng mời cô bấm
  // vào thứ chắc chắn bị từ chối, và nói rõ vì sao.
  //
  // CÂU CHỮ Ở ĐÂY NÓI VỀ CUỐN SỔ, KHÔNG NÓI GÌ VỀ ĐỨA TRẺ.
  ngayDaKhoa() {
    return this.date !== UI.todayStr();
  },

  // HÔM NAY TRƯỜNG NGHỈ (Đ147) — nói TRƯỚC khi cô chấm, không phải sau.
  //
  // Cô mở sổ ra thấy hai chục ô trống thì phản xạ là chấm cho xong. Dải này
  // đứng trên đầu danh sách để cô biết hôm nay không ai đến, và biết rằng bấm
  // "Chốt sổ vắng" sẽ ghi cả nhóm là nghỉ CÓ phép chứ không phải không phép.
  theTruongNghi() {
    const n = this._truongNghi;
    if (!n) return '';
    return `<div class="card" style="border-left:4px solid var(--primary)">
      <div class="card-title">${UI.icon('calendar', 16)} Hôm nay trường nghỉ — ${UI.esc(n.ten)}</div>
      <div class="muted small" style="line-height:1.7">
        ${UI.esc(App.views.leave && App.views.leave.fmtKhoang
          ? App.views.leave.fmtKhoang(n.tuNgay, n.denNgay)
          : `${n.tuNgay} – ${n.denNgay}`)}.
        Gia đình không phải xin phép cho những ngày này. Bấm “Chốt sổ vắng” thì các bé
        chưa có dòng sẽ được ghi là <b>nghỉ có phép</b>.
      </div>
    </div>`;
  },

  theNgayDaKhoa() {
    if (!this.ngayDaKhoa()) return '';
    const mai = this.date > UI.todayStr();
    return `<div class="card" style="border-left:4px solid var(--line-strong)">
      <div class="card-title">${UI.icon('clock', 16)} ${mai ? 'Ngày này chưa tới' : 'Ngày này đã khoá'}</div>
      <div class="muted small" style="line-height:1.7">
        Sổ điểm danh chỉ ghi và sửa được trong chính ngày hôm đó, nên ${mai
          ? 'ngày chưa tới thì chưa chấm được.'
          : 'ngày đã qua chỉ mở ra xem lại.'}
        Cô xem lại thoải mái — chỉ không sửa được nữa.
      </div>
      <button class="btn outline block mt-8" onclick="App.views.attendance.setDate(UI.todayStr())">
        ${UI.icon('calendar', 16)} Về ngày hôm nay
      </button>
    </div>`;
  },

  // DẢI TAB ĐÓN BÉ / TRẢ BÉ ĐÃ GỠ (Đ210, việc 1 + 3).
  //
  // Nhà trường xin gộp hai tab về MỘT dòng Vào/Ra, và bỏ mục sổ trả bé riêng
  // khỏi màn của cô. Nay mỗi dòng bé mang cả hai nửa của một ngày, và nút
  // "Ghi con đã về" nằm ngay trên dòng ấy.
  //
  // BỎ KHỎI MÀN KHÔNG PHẢI BỎ DỮ LIỆU. Bảng `dontra_ghi` — sổ ghi bé đã được
  // trao cho ai, lúc mấy giờ, cô nào trao — GIỮ NGUYÊN từng dòng, và phân hệ
  // Đón trả bé vẫn còn màn riêng của nó ở `#/dontra` với đủ người được đón,
  // uỷ quyền một lần và sổ đã trả. Đó là chứng từ trả lời câu "hôm ấy ai đón
  // bé", thứ không được mất chỉ vì một màn hình gộp lại cho gọn.

  // Phần Trả bé: giao cho phân hệ vẽ vào ô này. Phân hệ hỏng thì chỉ ô này
  // nói sự cố, phần Đón bé và dải tab vẫn nguyên. Ngày tương lai thì không hỏi
  // — máy chủ vốn từ chối ghi sổ cho ngày chưa tới.
  async khoiTraBe(el, pt) {
    if (!el) return;
    if (!pt || pt.hong) {
      el.innerHTML = UI.emptyState('🛠️',
        'Phần Trả bé đang gặp sự cố. Phần Đón bé vẫn dùng bình thường — nhờ nhà trường kiểm tra giúp.');
      return;
    }
    if (this.date > UI.todayStr()) {
      el.innerHTML = `<div class="card muted small" style="line-height:1.6">
        Sổ trả bé ghi được tới hôm nay. Chọn lại hôm nay hoặc một ngày đã qua nhé.</div>`;
      return;
    }
    const dsNhom = App.state.user.nhomCuaCo || [];
    const classId = this.nhomId || ((dsNhom[0] || {}).id) || '';
    try {
      await pt.veTraBe(el, { classId, ngay: this.date, diemDanh: this.diemDanhTheoBe() });
    } catch (e) {
      el.innerHTML = UI.emptyState('🤝', (e && e.message) || 'Chưa mở được sổ trả bé');
    }
  },

  // Sáng nay của từng bé, đưa sang phần Trả bé để thẻ ở cổng nói "Sáng nay:
  // Có mặt · vào 7:42" kèm ảnh tới lớp — phân hệ chỉ vẽ đường ảnh được đưa,
  // không tự hỏi API của màn này.
  diemDanhTheoBe() {
    const m = new Map();
    for (const r of this._roster || []) {
      m.set(r.student.id, {
        status: r.record ? r.record.status : null,
        checkIn: r.record ? (r.record.checkIn || '') : '',
        anhUrl: r.anhDenLop && r.anhDenLop.file
          ? `/api/attendance/anh/${encodeURIComponent(r.anhDenLop.file)}` : '',
      });
    }
    return m;
  },

  // BẢNG RÀ SOÁT SAU 9 GIỜ — nhà trường yêu cầu ở điểm 4 (30/08).
  //
  // CHỮ Ở ĐÂY NÓI VỀ VIỆC CỦA NGƯỜI LỚN, KHÔNG NÓI GÌ VỀ ĐỨA TRẺ. "Chưa điểm
  // danh" là cô chưa kịp chấm hoặc gia đình chưa kịp báo — không phải một lời
  // nào về bé. QUY TẮC 2 cấm biến chữ "chưa" của một đứa trẻ thành thất bại;
  // chỗ này không phải chữ "chưa" của đứa trẻ, và câu chữ phải giữ đúng vậy.
  //
  // Chưa tới giờ rà soát thì KHÔNG hiện gì cả. Hiện từ 7h30 là kêu suốt tiếng
  // rưỡi đầu giờ, và người ta tắt nó đi trước khi nó kịp có ích một lần.
  theRaSoat() {
    const r = this._raSoat || {};
    if (!r.quaGio || !(r.danhSach || []).length) return '';
    return `
      <div class="card" style="border-left:4px solid var(--danger)">
        <div class="card-title" style="color:var(--danger)">
          ${UI.icon('bell', 16)} Cần văn phòng gọi xác nhận
        </div>
        <div class="muted small" style="line-height:1.6;margin-bottom:8px">
          Đã qua ${UI.esc(this.chuGioRaSoat(r))} mà ${UI.esc(String(r.danhSach.length))} bé
          chưa có dòng điểm danh nào, và cũng chưa có đơn nghỉ được duyệt.
          Có thể cô chưa kịp chấm, cũng có thể gia đình quên báo — gọi một cuộc cho chắc.
        </div>
        ${r.danhSach.map(x => `
          <div class="list-row">
            ${UI.avatar(x.avatar, 34)}
            <div class="row-main"><div class="row-title">${UI.esc(x.hoTen)}</div></div>
            <button class="btn sm outline" data-goi-be="${UI.esc(x.studentId)}">📞 Gọi</button>
          </div>`).join('')}
        ${r.soDaCoDonNghi ? `<div class="muted small mt-8">
          ${UI.esc(String(r.soDaCoDonNghi))} bé khác đang nghỉ có đơn đã duyệt — không cần gọi.
        </div>` : ''}
        ${this.nutChotVang(r.danhSach.length)}
      </div>`;
  },

  // Cô chụp một khung hình "con đã tới lớp" để gửi gia đình.
  //
  // TỪ Đ131 ẢNH LÀ ĐIỂM DANH: máy chủ ghi "có mặt" ngay khi nhận ảnh và trả
  // dòng điểm danh về. Vẽ lại đúng dòng đó tại chỗ, không vẽ lại cả trang —
  // cùng lý do với `mark()`: nhóm 30 bé mà mỗi tấm ảnh ném cô về đầu danh sách
  // là 30 lần cuộn.
  // GHI CON ĐÃ VỀ (Đ210, việc 1 + 2).
  //
  // Một chạm mở hộp, trong hộp có hai lối: ghi giờ trần, hoặc chụp một khung
  // hình lúc trao bé. Ảnh là TUỲ CHỌN chứ không bắt buộc — 16h30 ở cổng có
  // hôm máy hỏng, có hôm mất mạng, và bắt chụp mới ghi được giờ là đúng lúc
  // ấy cô không ghi được gì cả.
  moRaVe(studentId) {
    const dong = (this._roster || []).find(x => x.student.id === studentId);
    if (!dong) return;
    // GIỜ VIỆT NAM, KHÔNG PHẢI GIỜ MÁY. UI.gioVN() là cùng một định nghĩa với
    // lib/ngay của máy chủ — lấy giờ máy ở đây thì 16h30 chiều ghi thành một
    // con số khác hẳn trên máy đặt sai múi giờ, đúng loại lỗi test:mot-hom-nay
    // sinh ra để canh.
    //
    // (Chú thích để NGOÀI chuỗi mẫu: một dấu huyền trong chuỗi mẫu là kết thúc
    // chuỗi ngay tại đó. Bản đầu của khối này viết chú thích vào trong và hỏng
    // cú pháp cả tệp.)
    UI.modal(`
      <div class="muted small" style="line-height:1.7;margin-bottom:10px">
        Ghi giờ con ra về. Chụp một khung hình lúc trao bé thì gia đình nhận được ngay —
        không chụp cũng ghi được giờ.
      </div>
      <div class="field">
        <label>Giờ ra về</label>
        <input id="att-rv-gio" type="time" value="${UI.esc(UI.gioVN())}">
      </div>
      <button class="btn primary block" id="att-rv-anh">${UI.icon('album', 16)} Chụp ảnh rồi ghi</button>
      <button class="btn outline block mt-8" id="att-rv-khong">Chỉ ghi giờ, không chụp</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, `Con đã về — ${dong.student.name}`);

    const gioGo = () => {
      const v = String((document.getElementById('att-rv-gio') || {}).value || '').trim();
      return /^\d{2}:\d{2}$/.test(v) ? v : undefined;
    };
    document.getElementById('att-rv-khong').onclick = () => {
      UI.closeModal();
      this.ghiRaVe(studentId, { gio: gioGo() });
    };
    document.getElementById('att-rv-anh').onclick = () => {
      const gio = gioGo();
      const o = document.createElement('input');
      o.type = 'file';
      o.accept = 'image/*';
      o.capture = 'environment';
      o.onchange = async () => {
        const f = o.files && o.files[0];
        if (!f) return;
        try {
          const anh = await UI.nenAnh(f, { canhToiDa: 900, chatLuong: 0.72 });
          UI.closeModal();
          await this.ghiRaVe(studentId, { gio, anh });
        } catch (e) { UI.toast(e.message || 'Chưa gửi được ảnh', 'error'); }
      };
      o.click();
    };
  },

  async ghiRaVe(studentId, { gio, anh } = {}) {
    const ngayLucBam = this.date;
    try {
      const kq = await API.post('/api/attendance/ra-ve', { studentId, date: ngayLucBam, gio, anh });
      UI.toast(anh ? 'Đã ghi con về và gửi ảnh cho gia đình' : 'Đã ghi giờ con về', 'success');
      const dong = ngayLucBam === this.date
        ? (this._roster || []).find(x => x.student.id === studentId) : null;
      if (dong && kq && kq.record) {
        dong.record = kq.record;
        if (kq.anh) dong.anhVeNha = { file: kq.anh.file, taoLuc: kq.gio };
        this.veLaiDong(studentId);
      } else {
        App.route();
      }
    } catch (e) { UI.toast(e.message || 'Chưa ghi được', 'error'); }
  },

  async goRaVe(studentId) {
    const ngayLucBam = this.date;
    try {
      await API.post('/api/attendance/ra-ve/go', { studentId, date: ngayLucBam });
      UI.toast('Đã gỡ giờ ra về', 'success');
      const dong = ngayLucBam === this.date
        ? (this._roster || []).find(x => x.student.id === studentId) : null;
      if (dong) {
        if (dong.record) dong.record.checkOut = null;
        dong.anhVeNha = null;
        this.veLaiDong(studentId);
      } else {
        App.route();
      }
    } catch (e) { UI.toast(e.message || 'Chưa gỡ được', 'error'); }
  },

  // BẤM VÀO ẢNH / TÊN LÀ CHỤP (góp ý 06/10, mục 2): *"khi điểm danh ai sẽ click
  // vào sau đó sẽ chụp để checkin … chụp lần 2 sẽ tự động được ghi nhận là ra
  // về"*. Chưa có mặt → ảnh tới lớp; đã có mặt mà chưa về → ảnh ra về (giờ là
  // lúc chụp); đã về rồi → không làm gì, tránh một chạm nhầm đè giờ đã ghi.
  // Nút "Ghi con đã về" (ghi giờ không ảnh) vẫn còn cho hôm máy ảnh hỏng.
  //
  // "LẦN 1 / LẦN 2" ĐẾM THEO ẢNH, KHÔNG THEO TRẠNG THÁI (vòng rà Đ232). Bé
  // được ghi có mặt KHÔNG kèm ảnh ("Cả nhóm có mặt", Sửa → Muộn) thì lần chạm
  // đầu tiên chưa phải "lần 2": tự đoán "ra về" là báo gia đình "con đã được
  // đón về" lúc 8 giờ sáng. Cảnh ấy thì HỎI cô đây là ảnh nào.
  chamNhanh(studentId) {
    const dong = (this._roster || []).find(x => x.student.id === studentId);
    const rec = dong && dong.record;
    const coMat = !!rec && (rec.status === 'present' || rec.status === 'late');
    const coAnhToi = !!(dong && dong.anhDenLop && dong.anhDenLop.file);
    if (coMat && rec.checkOut) return UI.toast('Bé đã được ghi ra về hôm nay', '');
    if (!coMat) return this.chonAnh(studentId);
    if (coAnhToi) return this.chupRaVe(studentId);
    UI.modal(`
      <p class="muted small" style="line-height:1.6;margin-top:0">
        Bé đã được ghi có mặt nhưng chưa có ảnh tới lớp. Cô chụp ảnh nào?
      </p>
      <button class="btn primary block" id="att-cn-toi">${UI.icon('album', 16)} Ảnh con tới lớp</button>
      <button class="btn outline block mt-8" id="att-cn-ve">📸 Ảnh ra về (ghi giờ về)</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, dong && dong.student ? dong.student.name : 'Chụp ảnh');
    document.getElementById('att-cn-toi').onclick = () => { UI.closeModal(); this.chonAnh(studentId); };
    document.getElementById('att-cn-ve').onclick = () => { UI.closeModal(); this.chupRaVe(studentId); };
  },

  chupRaVe(studentId) {
    const o = document.createElement('input');
    o.type = 'file';
    o.accept = 'image/*';
    o.capture = 'environment';
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        const anh = await UI.nenAnh(f, { canhToiDa: 900, chatLuong: 0.72 });
        await this.ghiRaVe(studentId, { gio: UI.gioVN(), anh });
      } catch (e) { UI.toast(e.message || 'Chưa gửi được ảnh', 'error'); }
    };
    o.click();
  },

  chonAnh(studentId) {
    const o = document.createElement('input');
    o.type = 'file';
    o.accept = 'image/*';
    o.capture = 'environment';
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        const anh = await UI.nenAnh(f, { canhToiDa: 900, chatLuong: 0.72 });
        const ngayLucBam = this.date;
        let kq;
        try {
          // `yDinh`: máy chủ không âm thầm thay ảnh sáng khi màn này đã cũ.
          kq = await API.post('/api/attendance/anh', { studentId, date: ngayLucBam, anh, yDinh: 'toi-lop' });
        } catch (e) {
          if (e.status !== 409) throw e;
          // Máy khác đã chụp ảnh tới lớp cho bé — màn này mở từ sáng nên chưa
          // thấy. Tấm vừa chụp gần như chắc là ảnh RA VỀ: hỏi, không tự đoán.
          if (confirm(`${e.message}\n\nGhi tấm ảnh vừa chụp là ảnh RA VỀ lúc ${UI.gioVN()}?`)) {
            await this.ghiRaVe(studentId, { gio: UI.gioVN(), anh });
          }
          App.route();
          return;
        }
        UI.toast('Đã ghi có mặt và gửi ảnh cho gia đình', 'success');
        const dong = ngayLucBam === this.date
          ? (this._roster || []).find(x => x.student.id === studentId) : null;
        if (dong && kq && kq.record) {
          dong.record = kq.record;
          dong.anhDenLop = { file: kq.file, taoLuc: kq.record.checkIn || '' };
          this.veLaiDong(studentId);
          this.veLaiSoDem();
          App.refreshBadges();
        } else {
          App.route();
        }
      } catch (e) { UI.toast(e.message || 'Chưa gửi được ảnh', 'error'); }
    };
    o.click();
  },

  async goAnh(studentId) {
    try {
      await API.del(`/api/attendance/anh?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(this.date)}`);
      UI.toast('Đã gỡ ảnh', 'success');
      App.route();
    } catch (e) { UI.toast(e.message || 'Chưa gỡ được ảnh', 'error'); }
  },

  // DÒNG MỘT BÉ TRONG NGÀY (Đ131): ẢNH LÀ ĐIỂM DANH.
  //
  // Nhà trường 07/09: "Đã chụp ảnh đến lớp thì auto là có mặt. Muốn bỏ phần
  // tích chọn có mặt, muộn, nghỉ phép, nghỉ không phép". Nên dòng này chỉ còn
  // MỘT nút chính — chụp ảnh — và một nút "Sửa" nhỏ cho lúc không chụp được
  // (máy hỏng, mạng cổng rớt) hay cần sửa lại một dòng đã ghi. Bốn nút tích
  // cũ vẫn tồn tại, nhưng nằm trong hộp Sửa chứ không phơi trên từng dòng.
  //
  // Bé chưa có dòng nào thì huy hiệu XÁM "Chưa có ảnh đến lớp" — đó là việc
  // của người lớn chưa làm, không phải một lời nào về bé (QUY TẮC 2). Màu đỏ
  // chỉ có ở bảng rà soát sau 9 giờ, và ở dòng đã ghi "Nghỉ không phép" thật.
  rosterRow({ student: s, record, donNghiDaDuyet, anhDenLop, luuY, anhVeNha }) {
    if (this.ngayDaKhoa()) return this.dongChiXem({ student: s, record, anhDenLop, luuY, anhVeNha });
    const coMat = !!record && (record.status === 'present' || record.status === 'late');
    // MỘT DÒNG VÀO/RA (Đ210, việc 1). Trước đợt này `checkOut` chưa có đường
    // nào ghi vào nên vế "Ra về" luôn rỗng — nay nó có thật.
    const times = record
      ? [record.checkIn ? `Vào lớp ${record.checkIn}` : null, record.checkOut ? `Ra về ${record.checkOut}` : null].filter(Boolean).join(' · ')
      : '';
    const coAnh = !!(anhDenLop && anhDenLop.file);
    return `
      <div class="list-row" id="att-dong-${UI.esc(s.id)}" style="align-items:flex-start">
        <span style="cursor:pointer;flex:none" title="Bấm để chụp ảnh" onclick="App.views.attendance.chamNhanh('${UI.esc(s.id)}')">${coAnh
          ? `<img src="/api/attendance/anh/${UI.esc(anhDenLop.file)}" alt="Ảnh ${UI.esc(s.name)} tới lớp"
               style="width:54px;height:54px;flex:none;border-radius:12px;object-fit:cover">`
          : UI.avatar(s.avatar, 42)}</span>
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}</div>
          <div class="row-sub">${UI.esc(s.code)}${times ? ` · ${UI.esc(times)}` : ''}${record && record.note ? ` · ${UI.esc(record.note)}` : ''}</div>
          ${donNghiDaDuyet ? `
            <div class="small mt-8" style="color:var(--info)">
              ${UI.icon('check', 14)} Có đơn nghỉ đã duyệt${donNghiDaDuyet.fromDate !== donNghiDaDuyet.toDate
                ? ` (${UI.esc(UI.fmtDateShort(donNghiDaDuyet.fromDate))} – ${UI.esc(UI.fmtDateShort(donNghiDaDuyet.toDate))})`
                : ''}${donNghiDaDuyet.reason ? ` · ${UI.esc(donNghiDaDuyet.reason.slice(0, 60))}` : ''}
            </div>` : ''}
          <div class="flex" style="flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
            ${this.huyHieuDong(record, donNghiDaDuyet)}
            ${coMat && coAnh ? `
                <!-- "ĐÃ GỬI", KHÔNG PHẢI "ĐÃ THẤY".
                     App không có đường nào biết gia đình đã mở ảnh ra xem —
                     không ghi lượt xem ở đâu cả. Cô nhìn dòng cũ rồi kết luận
                     mẹ bé đã biết con tới lớp an toàn nên không nhắn thêm;
                     ngày có chuyện thật (bé tới muộn, gia đình đang lo) thì
                     đúng dòng chữ ấy là lý do cô không gọi điện.
                     Muốn nói "đã thấy" thật thì phải ghi lượt xem ở
                     GET /api/attendance/anh/:file trước — việc riêng. -->
                <span class="small" style="color:var(--success)">Đã gửi cho gia đình</span>
                <button class="btn sm outline" onclick="App.views.attendance.goAnh('${UI.esc(s.id)}')">Gỡ ảnh</button>`
              : `<button class="btn sm ${coMat ? 'outline' : 'primary'}" onclick="App.views.attendance.chonAnh('${UI.esc(s.id)}')">
                   ${UI.icon('album', 14)} Chụp ảnh con tới lớp
                 </button>`}
            ${coMat ? (record && record.checkOut
              ? `<button class="btn sm outline" onclick="App.views.attendance.goRaVe('${UI.esc(s.id)}')">Gỡ giờ ra</button>`
              : `<button class="btn sm ${coAnh ? 'primary' : 'outline'}" onclick="App.views.attendance.chupRaVe('${UI.esc(s.id)}')">
                   📸 Chụp ảnh ra về
                 </button>
                 <button class="btn sm success-soft" onclick="App.views.attendance.moRaVe('${UI.esc(s.id)}')">
                   🌇 Ghi con đã về
                 </button>`) : ''}
            <button class="btn sm outline" onclick="App.views.attendance.suaDiemDanh('${UI.esc(s.id)}')">Sửa</button>
            <button class="btn sm outline" onclick="App.views.attendance.moLuuY('${UI.esc(s.id)}')">
              ${luuY && luuY.luuY ? '🔒 Sửa lưu ý' : '🔒 Lưu ý'}
            </button>
          </div>
          ${this.oAnhVe(anhVeNha, record)}
          ${this.oLuuY(luuY)}
        </div>
      </div>`;
  },

  // KHỐI "CON ĐÃ VỀ" trên dòng bé (Đ210, việc 1 + 2).
  oAnhVe(anhVeNha, record) {
    const gio = record && record.checkOut;
    if (!gio && !(anhVeNha && anhVeNha.file)) return '';
    return `
      <div class="flex mt-8" style="gap:8px;align-items:center">
        ${anhVeNha && anhVeNha.file
          ? `<img src="/api/attendance/anh/${UI.esc(anhVeNha.file)}" alt="Ảnh lúc trả bé"
               style="width:42px;height:42px;flex:none;border-radius:10px;object-fit:cover">`
          : ''}
        <span class="small" style="color:var(--success)">
          ${gio ? `🌇 Đã về lúc ${UI.esc(gio)}` : '🌇 Đã có ảnh lúc về'}
        </span>
      </div>`;
  },

  // Ô LƯU Ý NỘI BỘ (Đ207, việc 4) — dựng dùng chung cho dòng đang mở và dòng
  // ngày đã khoá.
  //
  // NHÃN PHẢI NÓI THẲNG "GIA ĐÌNH KHÔNG ĐỌC Ô NÀY". Ngay bên trên đã có một ô
  // ghi chú mang nhãn "gia đình đọc được"; hai ô chữ trông giống hệt nhau trên
  // một màn hình mà một ô gia đình đọc được, một ô không, thì nhãn là thứ DUY
  // NHẤT phân biệt — và gõ nhầm ô ở đây là kể chuyện nhà người ta cho người
  // ngoài nghe. Nên mỗi lần ô hiện ra là một lần nói lại.
  oLuuY(luuY) {
    if (!luuY || !luuY.luuY) return '';
    return `
      <div class="mt-8" style="background:var(--bg-soft,#f6f6f4);border-left:3px solid var(--warning,#d9822b);
                               border-radius:8px;padding:8px 10px">
        <div class="small" style="color:var(--warning,#d9822b);font-weight:600">
          🔒 Lưu ý nội bộ — gia đình KHÔNG đọc ô này
        </div>
        <div class="small" style="white-space:pre-wrap;line-height:1.5;margin-top:3px">${UI.esc(luuY.luuY)}</div>
        ${luuY.nguoiGhi ? `<div class="small muted" style="margin-top:3px">${UI.esc(luuY.nguoiGhi)} ghi</div>` : ''}
      </div>`;
  },

  // Hộp soạn ô lưu ý. Ghi được cả ngày đã khoá — sổ điểm danh khoá vì nó là
  // chứng từ, ô này là chỗ ghi thứ biết được sau (xem chú thích máy chủ).
  moLuuY(studentId) {
    const dong = (this._roster || []).find(x => x.student.id === studentId);
    if (!dong) return;
    const cu = (dong.luuY && dong.luuY.luuY) || '';
    UI.modal(`
      <div class="small" style="background:#fff6e9;border-left:3px solid var(--warning,#d9822b);
                                border-radius:8px;padding:9px 11px;line-height:1.6">
        <b>Ô này chỉ nhà trường đọc.</b> Gia đình không nhìn thấy gì ở đây —
        không trong lịch điểm danh của con, không trong thông báo, không trong báo cáo.
        Câu muốn gửi tới gia đình thì gõ ở ô <b>Ghi chú</b> trong hộp Sửa.
      </div>
      <div class="field mt-14">
        <label>Lưu ý nội bộ về ngày ${UI.esc(UI.fmtDateShort(this.date))}</label>
        <textarea id="att-luuy" rows="4"
          placeholder="Ví dụ: mẹ bé gọi báo chiều nay ông đón muộn khoảng 30 phút">${UI.esc(cu)}</textarea>
      </div>
      <button class="btn primary block" id="att-luuy-luu">Lưu</button>
      ${cu ? '<button class="btn outline block mt-8" id="att-luuy-go">Gỡ lưu ý này</button>' : ''}
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, `Lưu ý nội bộ — ${dong.student.name}`);

    const gui = async (noiDung) => {
      try {
        const kq = await API.put('/api/attendance/luu-y',
          { studentId, ngay: this.date, luuY: noiDung });
        dong.luuY = kq.luuY || null;
        UI.closeModal();
        UI.toast(noiDung ? 'Đã lưu — gia đình không nhìn thấy ô này' : 'Đã gỡ lưu ý', 'success');
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    document.getElementById('att-luuy-luu').onclick = () =>
      gui(String((document.getElementById('att-luuy') || {}).value || '').trim());
    const nutGo = document.getElementById('att-luuy-go');
    if (nutGo) nutGo.onclick = () => gui('');
  },

  // Huy hiệu của một dòng. Có dòng thì nói đúng dòng; chưa có dòng mà đã có
  // đơn nghỉ được duyệt thì báo trước "Nghỉ CP theo đơn" — lúc chốt sổ nó sẽ
  // thành dòng thật; còn lại là chữ xám về việc chưa làm.
  huyHieuDong(record, donNghiDaDuyet) {
    if (record) {
      const conf = UI.ATT_STATUS[record.status] || UI.ATT_STATUS.present;
      return UI.badge(this.SHORT[record.status] || conf.label, conf.cls);
    }
    if (donNghiDaDuyet) return '<span class="badge blue" style="opacity:.8">Nghỉ CP theo đơn</span>';
    return '<span class="badge gray">Chưa có ảnh đến lớp</span>';
  },

  // Hộp Sửa: ba trạng thái + ghi chú, cho lúc không chụp được ảnh hoặc cần
  // sửa lại. "Đến muộn" không còn là lựa chọn — nhà trường bỏ (07/09); dòng cũ
  // đã ghi "muộn" vẫn đọc được, chỉ không ghi thêm.
  suaDiemDanh(studentId) {
    const dong = (this._roster || []).find(x => x.student.id === studentId);
    if (!dong) return;
    const rec = dong.record;
    const lua = [['present', 'success-soft'], ['absent_excused', 'outline'], ['absent_unexcused', 'outline']];
    UI.modal(`
      <p class="muted small" style="line-height:1.6">
        Thường ngày chụp ảnh con tới lớp là đủ — ảnh là điểm danh. Hộp này dành cho lúc
        không chụp được ảnh, hoặc cần sửa lại dòng đã ghi.
      </p>
      <div class="field">
        <label>Ghi chú (gia đình đọc được)</label>
        <input id="att-sua-ghichu" value="${UI.esc((rec && rec.note) || '')}" placeholder="Ví dụ: bà đưa tới lúc 9 giờ">
      </div>
      ${lua.map(([k, cls]) => `
        <button class="btn ${cls} block mt-8" id="att-sua-${k}"
          ${rec && rec.status === k ? 'style="outline:2px solid var(--primary)"' : ''}>
          ${UI.esc(this.SHORT[k])} — ${UI.esc(UI.ATT_STATUS[k].label)}${rec && rec.status === k ? ' · đang ghi' : ''}
        </button>`).join('')}
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, `Sửa điểm danh — ${dong.student.name}`);
    for (const [k] of lua) {
      document.getElementById(`att-sua-${k}`).onclick = () => {
        const note = (document.getElementById('att-sua-ghichu') || {}).value;
        UI.closeModal();
        this.mark(studentId, k, typeof note === 'string' ? note.trim() : undefined);
      };
    }
  },

  // Dòng bé của một ngày đã khoá: đúng những gì đã ghi, không nút nào.
  //
  // "Cô chưa chấm" là việc của người lớn hôm đó, chữ xám — KHÔNG phải một lời
  // nào về đứa trẻ, và không phải một ô trống chờ lấp (QUY TẮC 2).
  dongChiXem({ student: s, record, anhDenLop, luuY }) {
    const st = record ? (UI.ATT_STATUS[record.status] || null) : null;
    const times = record
      ? [record.checkIn ? `Vào ${record.checkIn}` : null, record.checkOut ? `Ra ${record.checkOut}` : null].filter(Boolean).join(' · ')
      : '';
    return `
      <div class="list-row" id="att-dong-${UI.esc(s.id)}">
        ${anhDenLop && anhDenLop.file
          ? `<img src="/api/attendance/anh/${UI.esc(anhDenLop.file)}" alt="Ảnh ${UI.esc(s.name)} tới lớp"
               style="width:42px;height:42px;flex:none;border-radius:10px;object-fit:cover">`
          : UI.avatar(s.avatar, 42)}
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}</div>
          <div class="row-sub">${UI.esc(times || (record ? '' : 'Hôm đó cô chưa chấm điểm danh'))}${
            record && record.note ? ` · ${UI.esc(record.note)}` : ''}</div>
          ${this.oLuuY(luuY)}
          <div class="mt-8">
            <button class="btn sm outline" onclick="App.views.attendance.moLuuY('${UI.esc(s.id)}')">
              ${luuY && luuY.luuY ? '🔒 Sửa lưu ý' : '🔒 Lưu ý'}
            </button>
          </div>
        </div>
        ${st ? UI.badge(st.label, st.cls) : ''}
      </div>`;
  },

  setDate(value) {
    if (!value) return;
    this.date = value;
    App.route();
  },

  setNhom(value) {
    if (!value) return;
    this.nhomId = value;
    App.route();
  },

  // CỐ Ý không gọi App.route() sau mỗi lần chạm.
  //
  // App.route() vẽ lại cả trang rồi cuộn về đầu. Nhóm 30 bé thì cô chạm bé thứ 25
  // xong bị ném về đầu danh sách, phải cuộn lại từ đầu cho từng em — điểm danh
  // một nhóm thành 30 lần cuộn. Chỉ vẽ lại đúng dòng vừa đổi và hai ô đếm.
  async mark(studentId, status, note) {
    // Chấm "Nghỉ không phép" đúng vào ngày em đã có đơn được duyệt gần như luôn
    // là nhầm — và phụ huynh sẽ thấy chữ đỏ cho con mình dù cô đã duyệt đơn.
    // Hỏi lại chứ không chặn: quyền quyết định vẫn là của cô.
    const co = this._roster.find(x => x.student.id === studentId);
    if (status === 'absent_unexcused' && co && co.donNghiDaDuyet) {
      return this.hoiLaiNghiKhongPhep(studentId, co, note);
    }
    return this.ghiDiemDanh(studentId, status, note);
  },

  hoiLaiNghiKhongPhep(studentId, dong, note) {
    const d = dong.donNghiDaDuyet;
    UI.modal(`
      <p style="line-height:1.6">
        <b>${UI.esc(dong.student.name)}</b> đã có <b>đơn xin nghỉ được duyệt</b> cho ngày này${d.reason ? `:` : '.'}
      </p>
      ${d.reason ? `<p class="muted small" style="line-height:1.6">"${UI.esc(d.reason.slice(0, 200))}"</p>` : ''}
      <p class="muted small" style="line-height:1.6">
        Chấm <b>Nghỉ không phép</b> thì phụ huynh sẽ thấy chữ đỏ cho con mình
        dù cô đã duyệt đơn. Cô có chắc không?
      </p>
      <button class="btn primary block mt-14" id="att-dung-cp">Ghi "Nghỉ có phép" (đúng với đơn)</button>
      <button class="btn outline block mt-8" id="att-van-kp">Vẫn ghi "Nghỉ không phép"</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Bé này đã có đơn nghỉ');

    document.getElementById('att-dung-cp').onclick = () => {
      UI.closeModal();
      this.ghiDiemDanh(studentId, 'absent_excused', note);
    };
    document.getElementById('att-van-kp').onclick = () => {
      UI.closeModal();
      this.ghiDiemDanh(studentId, 'absent_unexcused', note);
    };
  },

  async ghiDiemDanh(studentId, status, note) {
    const ngayLucBam = this.date;
    try {
      const than = { studentId, date: ngayLucBam, status };
      if (typeof note === 'string') than.note = note;
      const rec = await API.post('/api/attendance/mark', than);
      // Cô có thể đã đổi ngày trong lúc chờ mạng — lúc đó danh sách trên màn hình
      // là của ngày khác, ghi vào sẽ hiện sai.
      if (this.date !== ngayLucBam) return;
      const dong = this._roster.find(x => x.student.id === studentId);
      if (dong) dong.record = rec;
      this.veLaiDong(studentId);
      this.veLaiSoDem();
      UI.toast('Đã lưu điểm danh', 'success');
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  veLaiDong(studentId) {
    const dong = this._roster.find(x => x.student.id === studentId);
    const el = document.getElementById(`att-dong-${studentId}`);
    if (!dong || !el) return;   // trang đã vẽ lại vì lý do khác — bỏ qua, không nổ
    el.outerHTML = this.rosterRow(dong);
  },

  veLaiSoDem() {
    const tong = this._roster.length;
    const daDiem = this._roster.filter(x => x.record).length;
    const oDa = document.getElementById('att-so-da');
    const oChua = document.getElementById('att-so-chua');
    if (oDa) oDa.textContent = daDiem;
    if (oChua) {
      oChua.textContent = tong - daDiem;
      oChua.style.color = tong - daDiem ? 'var(--warning)' : 'var(--muted)';
    }
  },

  // Hỏi lại trước khi ghi hàng loạt. Trước đây một lần chạm nhầm ghi đè toàn bộ
  // những em cô vừa đánh dấu nghỉ, mà app không có đường hoàn tác.
  markAll() {
    const tong = this._roster.length;
    if (!tong) return;
    const chua = this._roster.filter(r => !r.record).length;
    const daCo = tong - chua;

    UI.modal(`
      ${chua
        ? `<p style="line-height:1.6">Đánh dấu <b>${chua} bé chưa điểm danh</b> là có mặt?</p>`
        : `<p style="line-height:1.6">Cả nhóm đã điểm danh xong rồi — không còn bé nào chưa đánh dấu.</p>`}
      ${daCo
        ? `<p class="muted small" style="line-height:1.6">${daCo} bé cô đã đánh dấu sẽ <b>giữ nguyên</b>,
           kể cả bé nghỉ có phép hay nghỉ không phép.</p>`
        : ''}
      ${chua ? `<button class="btn primary block mt-14" id="att-tat-ca">Đánh dấu ${chua} bé còn lại có mặt</button>` : ''}
      ${daCo ? `<button class="btn outline block mt-8" id="att-ghi-de">
                  Ghi đè cả nhóm thành có mặt
                  <span class="muted small">(${daCo} bé đã đánh dấu sẽ bị thay)</span>
                </button>` : ''}
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Cả nhóm có mặt');

    const chay = async (ghiDe) => {
      try {
        const r = await API.post('/api/attendance/mark-all',
          { date: this.date, status: 'present', ghiDe, classId: this.nhomId || undefined });
        UI.closeModal();
        UI.toast(r.soGiuNguyen
          ? `Đã đánh dấu ${r.soDaGhi} bé có mặt, giữ nguyên ${r.soGiuNguyen} bé`
          : `Đã đánh dấu ${r.soDaGhi} bé có mặt`, 'success');
        App.route();
        App.refreshBadges();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    const nut = document.getElementById('att-tat-ca');
    if (nut) nut.onclick = () => chay(false);
    const nutGhiDe = document.getElementById('att-ghi-de');
    if (nutGhiDe) nutGhiDe.onclick = () => chay(true);
  },
};
