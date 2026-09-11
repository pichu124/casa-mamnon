// Trang quản trị dành cho ban giám hiệu: quản lý nhóm lớp, cô, bé
// và nhập danh sách đầu năm từ tệp Excel/CSV.

App.views.admin = {
  // BẬC MẦM NON THAY CHO Ô "KHỐI 1–12".
  //
  // Cả biểu mẫu thêm nhóm lẫn biểu mẫu sửa nhóm đều từng có một ô nhãn "Khối",
  // kiểu số, giới hạn 1–12, gợi ý mẫu là "3" — kế thừa nguyên từ app 1. Mầm non
  // không có khối 1–12: nhóm đi theo bậc Nhà trẻ → Mầm → Chồi → Lá, đúng như
  // phần chuyển năm học đã dạy máy (`BAC_MAM_NON` trong routes/schoolyear.js).
  // Người của văn phòng khai một nhóm mới sẽ phải đoán điền số gì vào ô đó.
  //
  // Cột `grade` ở TẦNG DỮ LIỆU giữ nguyên, chỉ đổi thứ hiện ra màn hình —
  // CLAUDE.md cho phép giữ tên tiếng Anh và kiểu số ở tầng dữ liệu.
  BAC_MAM_NON: ['Nhà trẻ', 'Mầm', 'Chồi', 'Lá'],

  // Bậc của một nhóm: đoán theo TÊN trước, rồi mới tới con số cũ.
  //
  // Đoán theo tên vì đó là thứ đáng tin nhất — chính phần chuyển năm học cũng
  // đọc tên nhóm chứ không đọc số. Dữ liệu cũ mang số của app 1 (nhóm "Chồi 2"
  // có grade 4) thì tên vẫn nói đúng bậc.
  bacCuaNhom(ten, grade) {
    const t = String(ten || '').trim().toLowerCase();
    const i = this.BAC_MAM_NON.findIndex(b => t.startsWith(b.toLowerCase()));
    if (i >= 0) return i + 1;
    const n = Number(grade);
    return Number.isInteger(n) && n >= 1 && n <= this.BAC_MAM_NON.length ? n : '';
  },

  oChonBac(id, chon) {
    return `<div class="field"><label>Bậc</label>
      <select id="${id}">
        <option value="">— Chưa xếp bậc —</option>
        ${this.BAC_MAM_NON.map((b, i) => `<option value="${i + 1}"${String(chon) === String(i + 1) ? ' selected' : ''}>${b}</option>`).join('')}
      </select>
      <div class="hint">Nhà trẻ → Mầm → Chồi → Lá. Chỉ để xếp thứ tự nhóm;
        việc chuyển năm học đi theo <b>tên nhóm</b>, không theo ô này.</div>
    </div>`;
  },
  // Dấu hiệu tệp CSV lưu sai bảng mã: ký tự thay thế U+FFFD (chữ có dấu đã hỏng)
  // hoặc byte 0 (tệp UTF-16 bị đọc như UTF-8).
  //
  // BẮT BUỘC viết bằng \u…, không gõ thẳng ký tự vào lớp ký tự: byte 0 không tồn
  // tại được trong tệp mã nguồn nên nó lặng lẽ thành dấu cách, và lúc đó MỌI tệp
  // có dấu cách — tức mọi tệp thật — đều bị chặn. Đã xảy ra đúng một lần.
  //
  // KHÔNG đặt cờ /g: cùng một biểu thức dùng cho nhiều lần .test() sẽ nhớ vị trí
  // lần trước rồi trả kết quả đúng/sai xen kẽ.
  _hongBangMa: /[\uFFFD\u0000]/,
  _tab: 'tongquan',
  _csv: null,

  async render(root, params) {
    if (App.state.user.role !== 'admin') {
      root.innerHTML = UI.pageHeader('Quản trị') + UI.emptyState('🔒', 'Chỉ tài khoản quản trị mới vào được mục này');
      return;
    }
    if (params && params[0]) this._tab = params[0];

    root.innerHTML = `
      ${UI.pageHeader('Quản trị nhà trường')}
      <div class="seg">
        ${[['tongquan', 'Tổng quan'], ['motngay', 'Một ngày'], ['coso', 'Cơ sở'], ['nhaplieu', 'Nhập danh sách'], ['giaovien', 'Giáo viên'], ['quantam', 'Quan tâm'], ['tinhnang', 'Tính năng'], ['namhoc', 'Năm học'], ['nhatky', 'Nhật ký']]
          .map(([k, t]) => `<button class="${this._tab === k ? 'active' : ''}" onclick="App.views.admin.go('${k}')">${t}</button>`).join('')}
      </div>
      <div id="admin-body"><div class="loading">Đang tải</div></div>`;

    const body = document.getElementById('admin-body');
    try {
      // PHẢI await: các tab đều là hàm async, `return this.tabCoSo(body)` là
      // trả promise ra ngoài mà không chờ — lỗi của tab không bao giờ rơi vào
      // catch này, mà rơi về App.route() và bị vẽ đè "Có lỗi xảy ra" lên CẢ
      // trang, mất luôn dải tab để bấm sang tab khác còn chạy được.
      if (this._tab === 'motngay') return await this.tabMotNgay(body);
      if (this._tab === 'coso') return await this.tabCoSo(body);
      if (this._tab === 'nhaplieu') return await this.tabNhapLieu(body);
      if (this._tab === 'giaovien') return await this.tabGiaoVien(body);
      if (this._tab === 'quantam') return await this.tabQuanTam(body);
      if (this._tab === 'tinhnang') return await this.tabTinhNang(body);
      if (this._tab === 'namhoc') return await this.tabNamHoc(body);
      if (this._tab === 'nhatky') return await this.tabNhatKy(body);
      return await this.tabTongQuan(body);
    } catch (err) {
      body.innerHTML = UI.emptyState('😥', err.message);
    }
  },

  go(tab) { this._tab = tab; App.route(); },

  // ---------- Một ngày của cả trường (Đ162) ----------
  //
  // Nhà trường xin một màn cho hiệu trưởng: hôm nay ba cơ sở thế nào. Màn Tổng
  // quan trả lời câu "trường có bao nhiêu bé, bao nhiêu cô" — đúng cho việc
  // quản trị, nhưng không trả lời được câu hỏi mỗi sáng.
  //
  // KHÔNG MỘT PHẦN TRĂM NÀO, KHÔNG SO CƠ SỞ NÀO HƠN CƠ SỞ NÀO. Mọi ô ở đây là
  // số đếm đầu người trong một ngày; bảng cơ sở xếp theo TÊN, vì xếp theo con
  // số là biến màn này thành bảng đua nhau giữa ba cơ sở, mà đằng sau mỗi con
  // số ấy là trẻ con đi học hay ở nhà (QUY TẮC 4).
  _ngayXem: null,

  async tabMotNgay(body) {
    if (!this._ngayXem) this._ngayXem = UI.todayStr();
    body.innerHTML = `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Xem ngày</label>
          <input type="date" id="ad-mn-ngay" value="${UI.esc(this._ngayXem)}" max="${UI.esc(UI.todayStr())}">
          ${UI.dongNgayViet(this._ngayXem)}
        </div>
      </div>
      <div id="ad-mn-than"><div class="loading">Đang tải</div></div>`;
    document.getElementById('ad-mn-ngay').onchange = (e) => {
      this._ngayXem = e.target.value;
      this.render(document.getElementById('view'), ['motngay']);
    };
    await this.veMotNgay();
  },

  async veMotNgay() {
    const o = document.getElementById('ad-mn-than');
    if (!o) return;
    let d = null;
    try {
      d = await API.get(`/api/admin/mot-ngay?ngay=${encodeURIComponent(this._ngayXem)}`);
    } catch (e) {
      o.innerHTML = UI.emptyState('📋', e.message || 'Chưa mở được màn này');
      return;
    }
    // `null` nghĩa là phân hệ đang tắt — KHÔNG vẽ số 0, vì 0 đọc thành "đếm
    // được, và bằng không". Vẽ một dấu gạch và nói vì sao.
    const so = (v) => (v === null || v === undefined ? '—' : String(v));
    const b = d.be || {};
    o.innerHTML = `
      ${d.truongNghi ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="card-title">🏫 Hôm nay trường nghỉ: ${UI.esc(d.truongNghi.ten)}</div>
          <div class="muted small">Sĩ số dưới đây đọc theo nghĩa ngày nghỉ, không phải ngày học bình thường.</div>
        </div>` : ''}

      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${UI.esc(so(b.dangHoc))}</div><div class="stat-label">Bé đang học</div></div>
        <div class="stat-box"><div class="stat-num">${UI.esc(so(b.coMat))}</div><div class="stat-label">Có mặt</div></div>
        <div class="stat-box"><div class="stat-num">${UI.esc(so(b.daRaVe))}</div><div class="stat-label">Đã ra về</div></div>
        <div class="stat-box"><div class="stat-num">${UI.esc(so(b.chuaCham))}</div><div class="stat-label">Chưa chấm</div></div>
      </div>

      <div class="card">
        <div class="card-title">Nghỉ hôm nay</div>
        ${b.nghiCoPhep === null ? `<div class="muted small">
          Phân hệ <b>Điểm danh</b> đang tắt nên hôm nay không có sổ để đếm.
        </div>` : `
          ${this.dongSoNgay('Nghỉ có phép', b.nghiCoPhep)}
          ${this.dongSoNgay('Nghỉ không phép', b.nghiKhongPhep)}
          ${this.dongSoNgay('Chưa có dòng điểm danh', b.chuaCham)}
          <div class="muted small mt-8" style="line-height:1.7">
            "Chưa chấm" là việc của người lớn chưa xong — cô chưa kịp chấm hoặc gia đình
            chưa kịp báo — chứ không nói gì về bé.
          </div>`}
      </div>

      <div class="card">
        <div class="card-title">Cô đi làm hôm nay</div>
        ${d.co ? `
          ${this.dongSoNgay('Tổng số cô trong phạm vi', d.co.tong)}
          ${this.dongSoNgay('Đã chấm đi làm', d.co.diLam)}
          ${this.dongSoNgay('Đã chấm nghỉ', d.co.nghi)}
          ${this.dongSoNgay('Chưa chấm công', d.co.chuaCham)}` : `
          <div class="muted small">
            Phân hệ <b>Nhân sự &amp; chấm công</b> đang tắt, nên chưa có sổ chấm công để đếm.
          </div>`}
      </div>

      ${d.hocPhi ? `
        <div class="card">
          <div class="card-title">Học phí</div>
          ${this.dongSoNgay('Khoản đã nộp', d.hocPhi.daNop)}
          ${this.dongSoNgay('Khoản chưa nộp', d.hocPhi.chuaNop)}
          <div class="muted small mt-8">Đếm số KHOẢN THU, không phải số nhà. Chi tiết từng nhà ở màn Học phí.</div>
        </div>` : ''}

      ${(d.theoCoSo || []).length ? `
        <div class="card">
          <div class="card-title">Theo cơ sở</div>
          ${d.theoCoSo.map(cs => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(cs.ten)}</div>
                <div class="row-sub">${UI.esc(String(cs.dangHoc))} bé đang học · ${
    UI.esc(String(cs.coMat))} có mặt · ${UI.esc(String(cs.daRaVe))} đã ra về${
    cs.chuaCham ? ` · ${UI.esc(String(cs.chuaCham))} chưa chấm` : ''}</div>
              </div>
            </div>`).join('')}
          <div class="muted small mt-8">Xếp theo tên cơ sở. Đây không phải bảng so cơ sở nào hơn cơ sở nào.</div>
        </div>` : ''}`;
  },

  dongSoNgay(nhan, giaTri) {
    return `<div class="list-row">
      <div class="row-main"><div class="row-title">${UI.esc(nhan)}</div></div>
      <div class="row-end"><b>${UI.esc(giaTri === null || giaTri === undefined ? '—' : String(giaTri))}</b></div>
    </div>`;
  },

  // ---------- Gia đình quan tâm điều gì (Đ149) ----------
  //
  // Nhà trường 10/09: *"mình chỉ muốn xem PH khi vào app quan tâm những gì"*.
  //
  // MÀN NÀY PHẢI TỰ NÓI RA GIỚI HẠN CỦA CHÍNH NÓ, ở ngay trên bảng số chứ không
  // giấu dưới chân trang. Người đọc một danh sách sắp theo con số sẽ mặc định
  // coi nó là "số gia đình quan tâm", rồi mang con số ấy đi họp — trong khi nó
  // là số LƯỢT MỞ, và app cố ý không biết có bao nhiêu NHÀ đằng sau mỗi lượt.
  //
  // KHÔNG TỈ LỆ, KHÔNG THANH BIỂU ĐỒ — đây là một quyết định, có chủ ý.
  //
  // Bộ canh QUY TẮC 4 chặn mọi tỉ lệ được tính rồi in thẳng ra màn hình trong
  // kho mã này, kể cả khi con số ấy nói về màn hình chứ không nói về đứa trẻ
  // nào. Bản đầu của đợt này có tỉ lệ và thanh biểu đồ; bộ canh báo đỏ, và bộ
  // canh đúng — xin một ngoại lệ cho tiện là mở sẵn cửa cho lần sau, mà lần sau
  // thì rất có thể đúng là một con số về một đứa trẻ. Con số thô kèm khoảng
  // ngày đã trả lời đủ câu nhà trường hỏi.
  //
  // (Chú thích này cũng từng làm hai bộ canh báo đỏ vì chính LỜI VĂN của nó —
  // một lần vì viết thẳng khuôn mẫu mà QUY TẮC 4 dò, một lần vì dùng một từ mà
  // QUY TẮC 2 xếp vào nhóm chữ chê. Cả hai lần bộ canh đều đúng theo đúng việc
  // nó được giao: nó dò TỆP, không dò ý định của người viết.)
  _quanTamNgay: 30,

  async tabQuanTam(body) {
    const den = UI.todayStr();
    const tu = (() => {
      const d = UI.parseDate(den);
      d.setDate(d.getDate() - (this._quanTamNgay - 1));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const d = await API.get(`/api/admin/quan-tam?tu=${encodeURIComponent(tu)}&den=${encodeURIComponent(den)}`);
    const ds = d.muc || [];
    body.innerHTML = `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Khoảng thời gian</label>
          <select onchange="App.views.admin.doiKhoangQuanTam(this.value)">
            ${[[7, '7 ngày gần nhất'], [30, '30 ngày gần nhất'], [90, '90 ngày gần nhất']]
              .map(([n, t]) => `<option value="${n}"${this._quanTamNgay === n ? ' selected' : ''}>${UI.esc(t)}</option>`).join('')}
          </select>
          <div class="hint">${UI.esc(UI.fmtDate(d.tuNgay, { weekday: false }))} – ${UI.esc(UI.fmtDate(d.denNgay, { weekday: false }))}</div>
        </div>
      </div>

      <div class="card" style="border-left:4px solid var(--primary)">
        <div class="card-title">${UI.icon('info', 18)} Bảng này đếm gì, và cố ý không đếm gì</div>
        <div class="muted small" style="line-height:1.7">
          Đây là <b>số lượt mở</b> từng mục của <b>các gia đình</b>, gộp chung cả trường —
          không phải số gia đình, và không phải nhà nào mở gì.
          App <b>không lưu</b> việc một gia đình đã mở mục nào: bảng số này không có
          chỗ nào ghi tên người, nên không tra ngược ra được, kể cả với tài khoản
          ban giám hiệu. Mỗi nhà được tính <b>một lượt cho mỗi mục mỗi ngày</b>.
        </div>
      </div>

      ${ds.length ? `<div class="card">
        <div class="card-title">Mục gia đình mở nhiều nhất<span class="spacer"></span>
          <span class="muted small">${UI.esc(String(d.tongLuot))} lượt</span></div>
        ${ds.map(x => `
          <div class="list-row">
            <div class="row-main"><div class="row-title">${UI.esc(x.ten)}</div></div>
            <div class="row-end">${UI.esc(String(x.soLuot))} lượt</div>
          </div>`).join('')}
      </div>` : UI.emptyState('📊', 'Chưa có lượt mở nào trong khoảng này. '
        + 'Con số bắt đầu được đếm từ lúc gia đình mở app trên bản mới.')}`;
  },

  doiKhoangQuanTam(v) {
    const n = Number(v);
    if (![7, 30, 90].includes(n)) return;
    this._quanTamNgay = n;
    App.route();
  },

  // ---------- Tổng quan ----------
  async tabTongQuan(body) {
    const d = await API.get('/api/admin/overview');
    this._lop = d.classes;
    const chuaCoGv = d.classes.filter(c => !c.teacherId).length;
    body.innerHTML = `
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${d.counts.students}</div><div class="stat-label">Bé</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.classes}</div><div class="stat-label">Nhóm</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.teachers}</div><div class="stat-label">Giáo viên</div></div>
        <div class="stat-box"><div class="stat-num">${d.counts.parents}</div><div class="stat-label">Phụ huynh</div></div>
      </div>
      ${d.counts.mustChange ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <b>${d.counts.mustChange} tài khoản</b> đang dùng mật khẩu tạm và chưa đổi.
          <div class="muted small mt-8">Nhắc họ đăng nhập và đặt mật khẩu riêng để bảo vệ thông tin của bé.</div>
        </div>` : ''}

      ${chuaCoGv ? `
        <div class="card" style="border-left:4px solid var(--danger)">
          <b>${chuaCoGv} nhóm lớp chưa có cô phụ trách.</b>
          <div class="muted small mt-8">
            Cô chưa được phân công sẽ đăng nhập vào và thấy "Nhóm chưa có bé nào" —
            không điểm danh, không nhận xét, không nhắn tin với phụ huynh được.
            Bấm <b>Sửa</b> ở dòng nhóm được tô đỏ bên dưới để phân công.
          </div>
        </div>` : ''}

      <div class="card">
        <div class="card-title">Danh sách bé<span class="spacer"></span>
          <button class="btn sm outline" onclick="App.views.admin.xuatDanhSachBe()">⬇ Xuất ra Excel</button>
        </div>
        <div class="muted small">Tải về một tệp mở thẳng được bằng Excel, để văn phòng làm báo cáo và đối chiếu sĩ số cuối tháng.</div>
        <label class="mt-8" style="display:flex;gap:8px;align-items:center;cursor:pointer">
          <input type="checkbox" id="ad-xuat-nghi">
          <span class="small">Xuất kèm cả bé đã nghỉ học</span>
        </label>
        <div class="muted small mt-8" style="border-left:3px solid var(--warning);padding-left:10px">
          Tệp này có <b>số định danh cá nhân</b> và <b>tiền sử bệnh</b> của từng bé.
          Đây là dữ liệu cá nhân của trẻ dưới 6 tuổi — tải xong xin giữ trong máy của trường,
          đừng gửi qua Zalo hay email cá nhân. Mỗi lần xuất đều được ghi lại trong <b>Nhật ký</b>.
        </div>
      </div>

      <div class="card">
        <div class="card-title">Danh sách nhóm lớp<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themLop()">+ Thêm nhóm</button>
        </div>
        ${d.classes.length
    ? this.nhomTheoCoSo(d).map(cs => `
          ${cs.tieuDe ? `<div class="row-title mt-8" style="color:var(--muted)">${UI.esc(cs.ten)}</div>` : ''}
          ${cs.nhom.map(c => `
            <div class="list-row"${c.teacherId ? '' : ' style="background:var(--danger-tint)"'}>
              <div class="row-main">
                <div class="row-title">${UI.esc(c.name)}${c.teacherId ? '' : ` ${UI.badge('Chưa có cô phụ trách', 'red')}`}</div>
                <div class="row-sub">${UI.esc(c.teacherNames || 'chưa phân công cô')} · ${c.studentCount} bé${
    c.room ? ' · ' + UI.esc(c.room) : ''}</div>
              </div>
              <div class="row-end" style="display:flex;gap:8px">
                <button class="btn sm outline" onclick="App.views.admin.suaLop('${UI.esc(c.id)}')">Sửa</button>
                <button class="btn sm outline" onclick="App.views.admin.xemLop('${UI.esc(c.id)}')">Xem</button>
              </div>
            </div>`).join('')}`).join('')
    : '<div class="muted small">Chưa có nhóm nào. Bấm "Thêm nhóm" hoặc nhập danh sách để tạo tự động.</div>'}
      </div>

      <div id="ad-ho-so"></div>
      <div id="ad-day"></div>`;

    this.veHoSoChuaDu();
    this.veThongBaoDay();
  },

  // GOM DANH SÁCH NHÓM LỚP THEO CƠ SỞ (Đ167 — ý (4) mảng Hồ sơ bé).
  //
  // Nhà trường xin bố cục duyệt theo Cơ sở → Lớp → Bé. Đo lại thì CÂY ẤY ĐÃ CÓ
  // từ Đ124, ở trang chủ của văn phòng, đi tới tận hồ sơ từng bé; màn Hồ sơ bé
  // cũng đã có ô chọn gom theo "Cơ sở › Nhóm". Thứ còn phẳng chỉ là thẻ này:
  // tên cơ sở đứng lẫn trong dòng phụ, cùng hàng với tên cô và số phòng, nên
  // hiệu trưởng trường ba cơ sở phải đọc từng dòng mới biết nhóm nào ở đâu.
  //
  // Nên đây là GOM TIÊU ĐỀ, không dựng cây thứ hai. Dựng cây thứ hai là hai
  // chỗ cùng làm một việc, và chúng sẽ trôi khỏi nhau ở lần sửa thứ hai.
  //
  // MỘT CƠ SỞ THÌ KHÔNG HIỆN TIÊU ĐỀ NÀO. Trường chưa khai cơ sở, hoặc quản lý
  // Cấp 3 chỉ nhìn được cơ sở mình, thì một dòng tiêu đề lặp lại trên mỗi nhóm
  // là chữ thừa. Cũng vì vậy màn này KHÔNG lộ thêm quy mô cơ sở khác: nó chỉ
  // xếp lại đúng những nhóm máy chủ đã gửi, không hỏi thêm gì.
  //
  // Xếp theo TÊN cơ sở rồi tên nhóm — không xếp theo sĩ số, cùng luật QUY TẮC 4
  // mà Đ162 đã chốt cho bảng chia theo cơ sở.
  nhomTheoCoSo(d) {
    const ten = new Map((d.campuses || []).map(c => [c.id, c.name]));
    const gom = new Map();
    for (const c of d.classes) {
      const k = c.campusId || '';
      if (!gom.has(k)) gom.set(k, { id: k, ten: ten.get(k) || 'Chưa xếp cơ sở', nhom: [] });
      gom.get(k).nhom.push(c);
    }
    const ds = [...gom.values()].sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
    for (const cs of ds) cs.nhom.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
    const nhieuCoSo = ds.length > 1;
    return ds.map(cs => ({ ...cs, tieuDe: nhieuCoSo }));
  },

  // ---- Hồ sơ bé còn thiếu giấy tờ người lớn (Đ161) ----
  //
  // Nhà trường nói **bắt buộc** mỗi bé có đủ bố, mẹ và một người liên hệ khẩn
  // cấp ngoài bố mẹ. Máy KHÔNG chặn đường ghi nào — chặn ở đường nhập danh
  // sách đầu năm là cả lượt nhập trượt, chặn ở đường sửa là văn phòng thôi sửa
  // hồ sơ. Cái trường cần là **biết hồ sơ nào còn thiếu gì để đi đòi cho đủ**,
  // và đó là thứ thẻ này làm.
  //
  // CHỮ Ở ĐÂY NÓI VỀ GIẤY TỜ NGƯỜI LỚN CHƯA NỘP, KHÔNG NÓI VỀ ĐỨA TRẺ. Tên bé
  // xuất hiện để văn phòng biết gọi nhà nào, chứ không phải để chấm một dòng
  // đỏ lên đứa trẻ ấy (QUY TẮC 2).
  async veHoSoChuaDu() {
    const o = document.getElementById('ad-ho-so');
    if (!o) return;
    let d = null;
    try { d = await API.get('/api/admin/ho-so-chua-du'); } catch (_) { return; }
    if (!d.soChuaDu) {
      o.innerHTML = `
        <div class="card" style="border-left:4px solid var(--success)">
          <div class="card-title" style="color:var(--success)">
            ${UI.icon('check', 16)} Hồ sơ liên hệ đã đủ cả trường
          </div>
          <div class="muted small" style="line-height:1.7">
            ${UI.esc(String(d.soBe))} bé đang học, hồ sơ nào cũng có đủ hai phụ huynh
            và một người liên hệ khẩn cấp ngoài bố mẹ.
          </div>
        </div>`;
      return;
    }
    o.innerHTML = `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title">📋 Hồ sơ liên hệ còn thiếu: ${UI.esc(String(d.soChuaDu))} bé</div>
        <div class="muted small" style="line-height:1.7">
          Nhà trường cần mỗi bé có đủ <b>hai phụ huynh</b> và <b>một người liên hệ khẩn
          cấp ngoài bố mẹ</b> — có lúc gọi bố không được, gọi mẹ cũng không được.
          Danh sách dưới đây là chỗ còn phải đi đòi giấy; app không chặn việc gì cả.
        </div>
        <details class="mt-8"><summary class="small">Xem danh sách</summary>
          ${d.danhSach.slice(0, 100).map(x => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(x.hoTen)}</div>
                <div class="row-sub">${UI.esc(x.tenNhom || 'chưa xếp nhóm')}${
    x.maBe ? ` · ${UI.esc(x.maBe)}` : ''} — còn thiếu ${UI.esc(x.thieuChu.join(' và '))}</div>
              </div>
            </div>`).join('')}
          ${d.danhSach.length > 100 ? `<div class="muted small mt-8">…và ${
  UI.esc(String(d.danhSach.length - 100))} bé nữa.</div>` : ''}
        </details>
      </div>`;
  },

  // ---------- Thông báo đẩy của cả trường (Đ157) ----------
  //
  // VÌ SAO THẺ NÀY NẰM Ở ĐÂY
  //
  // Bảng `push_dang_ky` trước đợt này không có màn nào để xem hay dọn: nó chỉ
  // tự xoá khi dịch vụ đẩy của Google/Apple trả về 404/410. Nghĩa là nhà
  // trường không có cách nào biết ai đang bật thông báo, hay gỡ máy của một
  // người vừa nghỉ việc. Và khoá VAPID thì sinh một lần rồi nằm mãi — lộ ra
  // ngoài cũng không đổi được.
  //
  // VẼ RIÊNG SAU KHI TAB ĐÃ HIỆN, KHÔNG CHỜ. Tài khoản chức vụ Cấp 2 gọi
  // đường này sẽ nhận 403; chờ nó thì cả tab Tổng quan chậm theo, mà thứ ở
  // đây là phần phụ. Hỏng thì thẻ không hiện, phần còn lại y nguyên.
  async veThongBaoDay() {
    const o = document.getElementById('ad-day');
    if (!o) return;
    let d = null;
    try { d = await API.get('/api/push/quan-tri'); } catch (_) { return; }
    const ds = (d && d.danhSach) || [];
    const theoVai = (v) => ds.filter(x => x.vai === v).length;
    o.innerHTML = `
      <div class="card">
        <div class="card-title">🔔 Thông báo trên điện thoại</div>
        ${d.coGoiDay ? '' : `<div class="muted small" style="border-left:3px solid var(--warning);padding-left:10px">
          Máy chủ của trường <b>chưa cài phần gửi thông báo đẩy</b>. Chuông trong app vẫn
          hoạt động bình thường; chỉ là điện thoại không tự kêu khi app đang đóng.
        </div>`}
        <div class="muted small mt-8" style="line-height:1.7">
          Đang có <b>${UI.esc(String(ds.length))} máy</b> bật thông báo:
          ${UI.esc(String(theoVai('parent')))} máy của gia đình,
          ${UI.esc(String(theoVai('teacher')))} của cô,
          ${UI.esc(String(theoVai('admin')))} của nhà trường.
        </div>
        ${ds.length ? `<details class="mt-8"><summary class="small">Xem từng máy</summary>
          ${ds.slice(0, 100).map(x => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(x.hoTen)}</div>
                <div class="row-sub">${UI.esc(x.dichVu || 'không rõ dịch vụ')}${
    x.taoLuc ? ` · bật từ ${UI.esc(String(x.taoLuc).slice(0, 10))}` : ''}${
    x.loiCuoi ? ` · lần gửi cuối lỗi: ${UI.esc(x.loiCuoi)}` : ''}</div>
              </div>
              <button class="btn sm outline" data-go-may="${UI.esc(x.userId)}">Gỡ</button>
            </div>`).join('')}
          ${ds.length > 100 ? `<div class="muted small mt-8">…và ${UI.esc(String(ds.length - 100))} máy nữa.</div>` : ''}
        </details>` : ''}
        <div class="muted small mt-8" style="border-left:3px solid var(--warning);padding-left:10px;line-height:1.7">
          <b>Đổi khoá thông báo</b> chỉ làm khi khoá bị lộ — ví dụ bản sao lưu bị chép ra ngoài.
          Đổi xong thì <b>mọi máy đang bật đều phải bật lại từ đầu</b>, kể cả điện thoại của
          gia đình, và không có cách nào báo cho họ biết ngoài việc nhắn tay.
          <div class="mt-8">
            <button class="btn sm outline" id="ad-day-doi-khoa">Đổi khoá thông báo</button>
          </div>
        </div>
      </div>`;

    // TÊN NGƯỜI KHÔNG BAO GIỜ ĐI VÀO THAM SỐ CHUỖI CỦA `onclick`.
    //
    // `UI.esc` che được dấu ngoặc nhọn của HTML, nhưng KHÔNG che dấu nháy đơn
    // — một cái tên có dấu nháy là thoát ra khỏi chuỗi JavaScript và chạy được
    // mã trong đó. Bài canh `lo-hong-da-va` bắt đúng chỗ này, và nó bắt được
    // ngay lần đầu tôi viết thẻ này. Nên: mã tài khoản đi qua `data-`, tên thì
    // tra lại từ danh sách vừa vẽ.
    const nho = new Map(ds.map(x => [x.userId, x.hoTen]));
    for (const nut of o.querySelectorAll('[data-go-may]')) {
      nut.onclick = () => this.goMayDay(nut.dataset.goMay, nho.get(nut.dataset.goMay) || '');
    }
    const nutKhoa = document.getElementById('ad-day-doi-khoa');
    if (nutKhoa) nutKhoa.onclick = () => this.doiKhoaDay();
  },

  async goMayDay(userId, hoTen) {
    if (!confirm(`Gỡ mọi máy đang bật thông báo của ${hoTen}?\n\nHọ vẫn dùng app bình thường, chỉ là điện thoại thôi tự kêu.`)) return;
    try {
      const r = await API.post('/api/push/quan-tri/go', { userId });
      UI.toast(`Đã gỡ ${r.daXoa} máy`, 'success');
      this.veThongBaoDay();
    } catch (e) { UI.toast(e.message || 'Chưa gỡ được', 'error'); }
  },

  async doiKhoaDay() {
    const g = prompt('Đổi khoá là MỌI máy đang bật thông báo phải bật lại từ đầu, '
      + 'kể cả điện thoại của gia đình.\n\nGõ đúng chữ  DOI KHOA  để xác nhận:');
    if (g === null) return;
    try {
      const r = await API.post('/api/push/doi-khoa', { xacNhan: String(g).trim() });
      UI.toast(`Đã đổi khoá. ${r.soMayPhaiDangKyLai} máy cần bật lại thông báo.`, 'success');
      this.veThongBaoDay();
    } catch (e) { UI.toast(e.message || 'Chưa đổi được khoá', 'error'); }
  },

  // Tải danh sách bé về máy dưới dạng tệp Excel mở được.
  //
  // Không dùng API.get: hàm đó luôn cố đọc JSON, mà đây là tệp. Cũng không đổi
  // thẳng window.location — trang này là ứng dụng một trang, điều hướng cả trang
  // sang một đường dẫn tệp là cách nhanh nhất để mất chỗ cô đang đứng nếu trình
  // duyệt không nhận ra đó là tệp tải về.
  async xuatDanhSachBe() {
    const keCaNghi = document.getElementById('ad-xuat-nghi');
    const duong = `/api/admin/students/xuat.csv${keCaNghi && keCaNghi.checked ? '?keCaNghi=1' : ''}`;
    try {
      const res = await fetch(duong, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status === 403 ? 'Chỉ tài khoản quản trị mới xuất được danh sách' : `Lỗi ${res.status}`);
      const blob = await res.blob();
      const ten = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ten ? ten[1] : 'danh-sach-be.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      UI.toast('Đã tải danh sách bé về máy', 'success');
    } catch (err) {
      UI.toast(err.message || 'Không tải được danh sách. Vui lòng thử lại.', 'error');
    }
  },

  // Tab Cơ sở — trường có ba cơ sở, dữ liệu giữa chúng phải độc lập.
  //
  // Chưa khai báo cơ sở nào thì cả tầng cơ sở nằm im và app chạy y như trước;
  // màn này nói thẳng điều đó thay vì hiện một danh sách trống không lời.
  async tabCoSo(body) {
    const [ds, d, qt, cv] = await Promise.all([
      API.get('/api/admin/campuses'),
      API.get('/api/admin/overview'),
      API.get('/api/admin/managers'),
      // Quản lý cơ sở không gán chức vụ cho ai, nên cũng không đọc được bảng này.
      // Nuốt lỗi và trả mảng rỗng để cả tab không sập vì một thẻ họ không dùng.
      API.get('/api/admin/chuc-vu').catch(() => []),
    ]);
    this._coso = ds;
    this._lop = d.classes;
    this._quanTri = qt;
    this._chucVu = cv;
    const chuaGan = d.classes.filter(c => !c.campusId);
    body.innerHTML = `
      ${ds.length ? '' : `
        <div class="card">
          <div class="card-title">Trường chưa khai báo cơ sở nào</div>
          <div class="muted small" style="line-height:1.6">
            Trường một cơ sở thì để trống mục này cũng được — app chạy y như cũ.
            Khai báo cơ sở khi trường có từ hai điểm trở lên, để dữ liệu của mỗi
            cơ sở tách riêng và quản lý cơ sở chỉ nhìn thấy phần của mình.
          </div>
        </div>`}

      <div class="card">
        <div class="card-title">Danh sách cơ sở<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themCoSo()">+ Thêm cơ sở</button>
        </div>
        ${ds.length ? ds.map(cs => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(cs.name)}</div>
              <div class="row-sub">${cs.classCount} nhóm · ${cs.studentCount} bé${
                cs.address ? ' · ' + UI.esc(cs.address) : ''}</div>
              <div class="row-sub">${UI.esc(cs.phone || 'chưa có hotline')} · ${UI.esc(cs.email || 'chưa có email')}</div>
            </div>
            <div class="row-end">
              <button class="btn sm outline" onclick="App.views.admin.suaCoSo('${UI.esc(cs.id)}')">Sửa</button>
            </div>
          </div>`).join('') : '<div class="muted small">Chưa có cơ sở nào.</div>'}
      </div>

      <div id="ad-lien-he"></div>

      ${(this._chucVu || []).length ? `
      <div class="card">
        <div class="card-title">Chức vụ của tài khoản quản trị</div>
        <div class="muted small mb-8" style="line-height:1.6">
          Chức vụ quyết định <b>mở được phần nào</b>. Để trống là <b>ban giám hiệu</b> —
          làm được mọi việc, y như từ trước tới nay. Chọn một chức vụ là <b>bớt đi</b>,
          không bao giờ thêm quyền.
        </div>
        <div class="muted small mb-8" style="line-height:1.6">
          Hai chức vụ <b>Quản lý cơ sở</b> và <b>Văn phòng cơ sở</b> cần được gắn vào
          một cơ sở ở thẻ <b>Tài khoản quản trị</b> bên dưới — không gắn thì họ vẫn
          nhìn thấy <b>mọi cơ sở</b>.
        </div>
        ${(this._quanTri || []).map(u => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(`${u.title || ''} ${u.name}`.trim())}</div>
              <div class="row-sub">${UI.esc(u.username)} · ${UI.esc(u.chucVuTen || 'Ban giám hiệu')}</div>
              ${u.chucVu ? `<div class="row-sub muted">${UI.esc(
    ((this._chucVu || []).find(c => c.ma === u.chucVu) || {}).moTa || '')}</div>` : ''}
            </div>
            <div class="row-end">
              <select onchange="App.views.admin.datChucVu('${UI.esc(u.id)}', this.value)">
                <option value="">— Ban giám hiệu —</option>
                ${(this._chucVu || []).filter(c => c.ma !== 'hieu-truong').map(c => `
                  <option value="${UI.esc(c.ma)}" ${c.ma === u.chucVu ? 'selected' : ''}>${UI.esc(c.ten)}</option>`).join('')}
              </select>
            </div>
          </div>`).join('')}
      </div>` : ''}

      ${ds.length ? `
        <div class="card">
          <div class="card-title">Tài khoản quản trị</div>
          <div class="muted small mb-8" style="line-height:1.6">
            Tài khoản <b>không gắn cơ sở</b> nhìn thấy toàn hệ thống. Gắn vào một
            cơ sở là chỉ còn thấy đúng cơ sở đó — dùng cho quản lý từng cơ sở.
          </div>
          ${(this._quanTri || []).map(u => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(`${u.title || ''} ${u.name}`.trim())}</div>
                <div class="row-sub">${UI.esc(u.username)} · ${u.campusId ? 'quản lý cơ sở' : 'toàn hệ thống'}</div>
              </div>
              <div class="row-end">
                <select onchange="App.views.admin.datCoSoChoQuanTri('${UI.esc(u.id)}', this.value)">
                  <option value="">— Toàn hệ thống —</option>
                  ${ds.map(cs => `<option value="${UI.esc(cs.id)}" ${cs.id === u.campusId ? 'selected' : ''}>${UI.esc(cs.name)}</option>`).join('')}
                </select>
              </div>
            </div>`).join('')}
        </div>

        <div class="card">
          <div class="card-title">Nhóm lớp thuộc cơ sở nào</div>
          ${chuaGan.length ? `
            <div class="muted small mb-8" style="line-height:1.6">
              <b>${chuaGan.length} nhóm chưa gắn cơ sở.</b> Nhóm chưa gắn thì chỉ
              tài khoản quản trị toàn hệ thống nhìn thấy — quản lý cơ sở sẽ không
              thấy nhóm đó trong danh sách của mình.
            </div>` : ''}
          ${d.classes.map(c => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(c.name)}</div>
                <div class="row-sub">${c.studentCount} bé</div>
              </div>
              <div class="row-end">
                <select onchange="App.views.admin.datCoSoChoNhom('${UI.esc(c.id)}', this.value)">
                  <option value="">— Chưa gắn —</option>
                  ${ds.map(cs => `<option value="${UI.esc(cs.id)}" ${cs.id === c.campusId ? 'selected' : ''}>${UI.esc(cs.name)}</option>`).join('')}
                </select>
              </div>
            </div>`).join('')}
        </div>` : ''}`;
    this.veLienHeTruong();
  },

  // ---- Thông tin liên hệ của trường (Đ161) ----
  //
  // Vẽ RIÊNG sau khi tab đã hiện, không chờ: Cấp 3 gọi đường này vẫn đọc được
  // (để biết email kế toán là gì) nhưng không sửa được, và một thẻ phụ không
  // được phép làm chậm cả tab.
  async veLienHeTruong() {
    const o = document.getElementById('ad-lien-he');
    if (!o) return;
    let d = null;
    try { d = await API.get('/api/admin/lien-he'); } catch (_) { return; }
    o.innerHTML = `
      <div class="card">
        <div class="card-title">✉️ Email kế toán (gia đình hỏi học phí)</div>
        <div class="muted small" style="line-height:1.7">
          Địa chỉ này hiện trong <b>Hồ sơ của bé</b> ở màn hình gia đình, ngay dưới
          hotline văn phòng — để nhà nào hỏi chuyện học phí thì gửi thẳng đúng người.
          Một địa chỉ cho cả trường; để trống thì màn hình gia đình bỏ hẳn dòng đó.
        </div>
        ${d.suaDuoc ? `
          <div class="flex mt-8" style="gap:8px;align-items:center;flex-wrap:wrap">
            <input type="email" id="ad-lh-ketoan" value="${UI.esc(d.emailKeToan || '')}"
                   placeholder="ketoan@truong.edu.vn" style="flex:1;min-width:200px">
            <button class="btn sm outline" id="ad-lh-luu">Lưu</button>
          </div>` : `
          <div class="mt-8">${d.emailKeToan
    ? UI.esc(d.emailKeToan)
    : '<span class="muted">Chưa nhập.</span>'}
            <div class="muted small mt-8">Sửa mục này cần tài khoản quản trị toàn hệ thống.</div>
          </div>`}
      </div>`;
    const nut = document.getElementById('ad-lh-luu');
    if (nut) nut.onclick = () => this.luuLienHeTruong();
  },

  async luuLienHeTruong() {
    const o = document.getElementById('ad-lh-ketoan');
    if (!o) return;
    try {
      await API.put('/api/admin/lien-he', { emailKeToan: o.value.trim() });
      UI.toast('Đã lưu email kế toán', 'success');
      this.veLienHeTruong();
    } catch (e) {
      UI.toast(e.message || 'Chưa lưu được', 'error');
    }
  },

  themCoSo() {
    UI.modal(`
      <div class="field"><label>Tên cơ sở</label><input id="ad-cs-ten" placeholder="Ví dụ: Cơ sở 2"></div>
      <div class="field"><label>Địa chỉ</label><input id="ad-cs-dc" placeholder="Ví dụ: 112 Nguyễn Thị Minh Khai, Q. 3"></div>
      <div class="field"><label>Hotline văn phòng</label><input id="ad-cs-dt" placeholder="Ví dụ: 028 3844 5577"></div>
      <div class="field"><label>Email cơ sở</label><input id="ad-cs-email" placeholder="Ví dụ: coso2@truong.edu.vn"></div>
      <div class="muted small mb-8" style="line-height:1.6">
        Hotline và email ở đây là số của <b>văn phòng cơ sở</b> — thứ gia đình cần
        khi có việc gấp. Màn hồ sơ của bé sẽ hiện số này chứ không hiện số riêng của cô.
      </div>
      <button class="btn primary block" id="ad-cs-luu">Tạo cơ sở</button>
    `, 'Thêm cơ sở mới');
    document.getElementById('ad-cs-luu').onclick = async () => {
      const name = document.getElementById('ad-cs-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên cơ sở', 'error');
      try {
        await API.post('/api/admin/campuses', {
          name,
          address: document.getElementById('ad-cs-dc').value.trim(),
          phone: document.getElementById('ad-cs-dt').value.trim(),
          email: document.getElementById('ad-cs-email').value.trim(),
        });
        UI.toast('Đã tạo cơ sở', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  suaCoSo(id) {
    const cs = (this._coso || []).find(x => x.id === id);
    if (!cs) return UI.toast('Không tìm thấy cơ sở này', 'error');
    UI.modal(`
      <div class="field"><label>Tên cơ sở</label><input id="ad-cs-ten" value="${UI.esc(cs.name)}"></div>
      <div class="field"><label>Địa chỉ</label><input id="ad-cs-dc" value="${UI.esc(cs.address || '')}"></div>
      <div class="field"><label>Hotline văn phòng</label><input id="ad-cs-dt" value="${UI.esc(cs.phone || '')}"></div>
      <div class="field"><label>Email cơ sở</label><input id="ad-cs-email" value="${UI.esc(cs.email || '')}"></div>
      <button class="btn primary block" id="ad-cs-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, `Sửa ${cs.name}`);
    document.getElementById('ad-cs-luu').onclick = async () => {
      const name = document.getElementById('ad-cs-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên cơ sở', 'error');
      try {
        await API.put(`/api/admin/campuses/${encodeURIComponent(id)}`, {
          name,
          address: document.getElementById('ad-cs-dc').value.trim(),
          phone: document.getElementById('ad-cs-dt').value.trim(),
          email: document.getElementById('ad-cs-email').value.trim(),
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async datCoSoChoQuanTri(userId, campusId) {
    try {
      await API.put(`/api/admin/managers/${encodeURIComponent(userId)}/campus`, { campusId });
      UI.toast(campusId ? 'Tài khoản nay chỉ thấy cơ sở đó' : 'Tài khoản nay thấy toàn hệ thống', 'success');
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      App.route();   // vẽ lại để ô chọn quay về đúng trạng thái thật
    }
  },

  async datChucVu(userId, ma) {
    try {
      const r = await API.put(`/api/admin/managers/${encodeURIComponent(userId)}/chuc-vu`, { chucVu: ma });
      UI.toast(ma ? `Tài khoản nay là ${r.chucVuTen}` : 'Tài khoản nay là ban giám hiệu', 'success');
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      App.route();   // vẽ lại để ô chọn quay về đúng trạng thái thật
    }
  },

  async datCoSoChoNhom(classId, campusId) {
    try {
      await API.put(`/api/admin/classes/${encodeURIComponent(classId)}/campus`, { campusId });
      UI.toast(campusId ? 'Đã gắn nhóm vào cơ sở' : 'Đã gỡ nhóm khỏi cơ sở', 'success');
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      App.route();   // vẽ lại để ô chọn quay về đúng cơ sở thật, không đứng ở lựa chọn bị từ chối
    }
  },

  async themLop() {
    const [teachers, coSo] = await Promise.all([
      API.get('/api/admin/teachers'),
      // Quản lý cơ sở không chọn cơ sở — nhóm mới tự vào cơ sở của họ. Nuốt lỗi
      // để hộp thoại vẫn mở được nếu đường này bị chặn.
      API.get('/api/admin/campuses').catch(() => []),
    ]);
    const chonCoSo = (coSo || []).length > 1;
    UI.modal(`
      <div class="field"><label>Tên nhóm</label><input id="ad-lop-ten" placeholder="Ví dụ: Chồi 2"></div>
      ${chonCoSo ? `
        <div class="field">
          <label>Cơ sở</label>
          <select id="ad-lop-coso">
            <option value="">— Chưa gắn cơ sở —</option>
            ${coSo.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
          </select>
          <div class="hint">Nhóm chưa gắn cơ sở thì <b>quản lý cơ sở không nhìn thấy</b>, và
            sau lần chuyển năm học tiếp theo thì nhóm kế tiếp của nó cũng vậy.
            Trường nhiều cơ sở hay đặt trùng tên nhóm, nên chọn ngay ở đây là chắc nhất.</div>
        </div>` : ''}
      <div class="field"><label>Phòng học</label><input id="ad-lop-phong" placeholder="Ví dụ: Phòng 203"></div>
      ${this.oChonBac('ad-lop-khoi', '')}
      <div class="field"><label>Cô phụ trách</label>
        <select id="ad-lop-gv"><option value="">— Chưa phân công —</option>
          ${teachers.map(t => `<option value="${UI.esc(t.id)}">${UI.esc(t.title)} ${UI.esc(t.name)}</option>`).join('')}
        </select>
      </div>
      <button class="btn primary block" id="ad-lop-luu">Tạo nhóm</button>
    `, 'Thêm nhóm mới');
    document.getElementById('ad-lop-luu').onclick = async () => {
      const name = document.getElementById('ad-lop-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên nhóm', 'error');
      try {
        await API.post('/api/admin/classes', {
          name,
          room: document.getElementById('ad-lop-phong').value.trim(),
          grade: document.getElementById('ad-lop-khoi').value,
          teacherId: document.getElementById('ad-lop-gv').value || null,
          campusId: (document.getElementById('ad-lop-coso') || {}).value || '',
        });
        UI.toast('Đã tạo nhóm', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Sửa thông tin nhóm và phân công cô phụ trách.
  //
  // Đây là màn hình mà nút "Đi phân công cô phụ trách" sau khi chuyển năm
  // học vẫn luôn chỉ tới — trước đây nó dẫn về một danh sách chỉ để đọc, nên cả
  // trường không có cách nào phân công lại cô phụ trách ngoài việc sửa tay dữ liệu.
  //
  // CỐ Ý KHÔNG cho sửa năm học: routes/schoolyear.js dùng cặp (tên nhóm, năm học)
  // để nhận ra nhóm của năm mới đã tồn tại chưa. Sửa tay năm học ở đây sẽ làm lần
  // chuyển năm sau tạo nhóm trùng tên.
  async suaLop(classId) {
    const [d, teachers] = await Promise.all([
      API.get('/api/admin/overview'),
      API.get('/api/admin/teachers'),
    ]);
    const c = (d.classes || []).find(x => x.id === classId);
    if (!c) return UI.toast('Không tìm thấy nhóm này', 'error');

    // Giữ cô phụ trách hiện tại trong danh sách kể cả khi cô đã ngừng hoạt động,
    // nếu không bấm Lưu sẽ vô tình gỡ mất cô phụ trách mà không ai chủ ý.
    const ds = (!c.teacherId || teachers.some(t => t.id === c.teacherId))
      ? teachers
      : [{ id: c.teacherId, title: '', name: c.teacherName || '(giáo viên đã ngừng hoạt động)' }, ...teachers];
    // Các cô đang phụ trách nhóm này, để tích sẵn ô của họ.
    const dangPhuTrach = new Set((c.teachers || []).map(t => t.id));

    UI.modal(`
      <div class="field"><label>Tên nhóm</label><input id="ad-sl-ten" value="${UI.esc(c.name)}"></div>
      <div class="field"><label>Phòng học</label><input id="ad-sl-phong" value="${UI.esc(c.room || '')}" placeholder="Ví dụ: Phòng 203"></div>
      ${this.oChonBac('ad-sl-khoi', this.bacCuaNhom(c.name, c.grade))}
      <div class="field"><label>Cô phụ trách</label>
        <select id="ad-sl-gv">
          <option value="">— Chưa phân công —</option>
          ${ds.map(t => `<option value="${UI.esc(t.id)}" ${t.id === c.teacherId ? 'selected' : ''}>${UI.esc(`${t.title} ${t.name}`.trim())}</option>`).join('')}
        </select>
        <div class="muted small mt-8">Đổi cô phụ trách sẽ thu quyền xem hồ sơ nhóm này của cô cũ ngay lập tức.</div>
      </div>
      <div class="field"><label>Các cô cùng phụ trách nhóm này</label>
        <div id="ad-sl-cac-co" class="card" style="max-height:220px;overflow:auto;padding:8px">
          ${ds.map(t => `
            <label class="list-row" style="cursor:pointer;padding:6px 4px">
              <input type="checkbox" class="ad-sl-co" value="${UI.esc(t.id)}" ${dangPhuTrach.has(t.id) ? 'checked' : ''}>
              <div class="row-main"><div class="row-title">${UI.esc(`${t.title} ${t.name}`.trim())}</div></div>
            </label>`).join('')}
        </div>
        <div class="muted small mt-8">
          Nhóm mầm non thường có 2–3 cô cùng phụ trách. Cô được tích ở đây sẽ xem
          được hồ sơ các bé của nhóm; cô chọn ở ô trên là cô phụ trách chính.
          Một cô có thể phụ trách nhiều nhóm — tích thêm ở nhóm khác KHÔNG gỡ cô
          khỏi nhóm này.
        </div>
      </div>
      <button class="btn primary block" id="ad-sl-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, `Sửa ${c.name}`);

    // Ô "Cô phụ trách" và danh sách cô phải nói cùng một chuyện, nếu
    // không quản trị gỡ cô phụ trách mà nhóm vẫn còn cô, rồi không hiểu vì sao thẻ
    // nhắc việc không tắt. Chọn "— Chưa phân công —" nghĩa là nhóm này chưa có
    // ai phụ trách; chọn một cô thì tích sẵn ô của cô ấy.
    const oChinh = document.getElementById('ad-sl-gv');
    oChinh.onchange = () => {
      const cac = [...document.querySelectorAll('.ad-sl-co')];
      if (!oChinh.value) { cac.forEach(o => { o.checked = false; }); return; }
      const o = cac.find(x => x.value === oChinh.value);
      if (o) o.checked = true;
    };

    document.getElementById('ad-sl-luu').onclick = async () => {
      const name = document.getElementById('ad-sl-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập tên nhóm', 'error');
      const chinhId = document.getElementById('ad-sl-gv').value || null;
      const teacherIds = [...document.querySelectorAll('.ad-sl-co:checked')].map(o => o.value);
      // Cô phụ trách chính luôn nằm trong danh sách cô của nhóm, kể cả khi quản
      // trị quên tích ô của cô ấy.
      if (chinhId && !teacherIds.includes(chinhId)) teacherIds.unshift(chinhId);
      try {
        await API.put(`/api/admin/classes/${encodeURIComponent(classId)}`, {
          name,
          room: document.getElementById('ad-sl-phong').value.trim(),
          grade: document.getElementById('ad-sl-khoi').value,
        });
        // Ghi danh sách cô ở bước riêng: đường trên là đường CŨ "một cô một lớp",
        // gửi `teacherId` qua đó sẽ gỡ cô khỏi các nhóm khác của cô.
        await API.put(`/api/admin/classes/${encodeURIComponent(classId)}/teachers`, {
          teacherIds, chinhId,
        });
        UI.toast('Đã lưu thay đổi', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Tên nhóm KHÔNG được truyền qua thuộc tính onclick nữa mà tra lại từ đây —
  // cùng lý do như App.views.accounts.reset: trình duyệt giải mã thực thể HTML
  // trước khi JS phân tích, nên dấu nháy trong tên nhóm thoát ra khỏi chuỗi và
  // chạy được mã. Giữ chữ ký hai tham số để bản giao diện cũ trong bộ nhớ đệm
  // của điện thoại đã cài app vẫn gọi được.
  async xemLop(classId, tenLop) {
    if (!tenLop) {
      const c = (this._lop || []).find(x => x.id === classId);
      tenLop = c ? c.name : 'Nhóm';
    }
    // Nhớ lại để các nút bên trong modal mở lại đúng nhóm này sau khi lưu.
    this._lopDangXem = { classId, tenLop };
    // Lấy cả em đã nghỉ: quản trị bấm nhầm "Cho nghỉ học" thì phải thấy em ở đâu
    // mà nhận lại, chứ không phải mở cơ sở dữ liệu ra sửa tay.
    const students = await API.get(`/api/admin/students?classId=${encodeURIComponent(classId)}&keCaNghi=1`);
    const dangHoc = students.filter(s => s.active !== false && s.active !== 0);
    const daNghi = students.filter(s => !(s.active !== false && s.active !== 0));

    // Chỉ mã của bé (do hệ thống sinh) mới được đặt vào tham số của onclick.
    // Họ tên do người nhập gõ nên không bao giờ đi qua đường này — xem ghi chú ở
    // App.views.accounts.reset.
    const dong = (s, daNghiHoc) => `
      <div class="list-row"${daNghiHoc ? ' style="opacity:.65"' : ''}>
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}${daNghiHoc ? ` ${UI.badge('Đã nghỉ', 'gray')}` : ''}</div>
          <div class="row-sub">${UI.esc(s.code || 'chưa có mã')} · Phụ huynh: ${UI.esc(s.parents.map(p => p.name).join(', ') || 'chưa có')}</div>
        </div>
        <div class="row-end" style="display:flex;gap:6px">
          ${daNghiHoc
            ? `<button class="btn sm outline" onclick="App.views.admin.nhanLaiHocSinh('${UI.esc(s.id)}')">Nhận lại</button>`
            : `<button class="btn sm outline" onclick="App.views.admin.suaHocSinh('${UI.esc(s.id)}')">Sửa</button>
               <button class="btn sm outline" onclick="App.views.admin.choNghiHoc('${UI.esc(s.id)}')">Cho nghỉ</button>`}
        </div>
      </div>`;

    const phanDaNghi = daNghi.length ? `
      <div class="muted small mt-14 mb-8">${daNghi.length} bé đã nghỉ học — dữ liệu vẫn giữ nguyên, tra cứu được</div>
      ${daNghi.map(s => dong(s, true)).join('')}` : '';

    UI.modal(
      `${dangHoc.length || daNghi.length
        ? `<div class="muted small mb-8">${dangHoc.length} bé đang học</div>
           ${dangHoc.map(s => dong(s, false)).join('')}${phanDaNghi}`
        : UI.emptyState('🎒', 'Nhóm chưa có bé nào')}
       <button class="btn primary block mt-8" id="ad-them-be">+ Nhận một bé vào nhóm này</button>`,
      tenLop);

    const nut = document.getElementById('ad-them-be');
    if (nut) nut.onclick = () => this.moNhanBe(classId, tenLop);
  },

  // ---------- Nhận MỘT bé nhập học giữa năm (Đ170) ----------
  //
  // Trước đợt này cách duy nhất để tạo hồ sơ một bé là nhập tệp CSV — mở Excel,
  // gõ đúng tên cột, lưu đúng bảng mã, tải lên, để tạo đúng một dòng. Bé nhập
  // học giữa tháng 10 thì văn phòng sẽ nhờ người khác hoặc để đó, và bé đi học
  // mấy hôm rồi mới có trong app.
  //
  // Máy chủ dùng lại NGUYÊN bộ soát và nguyên thân nhận bé của đường nhập tệp,
  // nên mọi câu báo lỗi ở đây là đúng câu văn phòng đã quen đọc.
  moNhanBe(classId, tenLop) {
    UI.modal(`
      <div class="muted small mb-8">Nhận vào nhóm <b>${UI.esc(tenLop)}</b></div>
      <div class="field"><label>Họ và tên của bé</label><input id="nb-ten" placeholder="Nguyễn Văn An"></div>
      <div class="field"><label>Ngày sinh</label><input id="nb-ns" type="date"></div>
      <div class="field"><label>Giới tính</label>
        <select id="nb-gt"><option value="">—</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
      <div class="field"><label>Mã của bé</label>
        <input id="nb-ma" placeholder="Để trống nếu trường không dùng mã"></div>
      <div class="field"><label>Họ tên phụ huynh</label><input id="nb-ph" placeholder="Nguyễn Thị Bình"></div>
      <div class="field"><label>Điện thoại phụ huynh</label><input id="nb-sdt" placeholder="09xxxxxxxx">
        <div class="muted small mt-8">Nhà đã có con học ở trường thì dùng lại đúng số này —
          máy nối bé mới vào đúng tài khoản cũ, gia đình không phải nhớ hai mật khẩu.</div></div>
      <div class="field"><label>Địa chỉ</label><input id="nb-dc"></div>
      <button class="btn primary block" id="nb-luu">Nhận bé vào nhóm</button>
    `, 'Nhận một bé vào trường');

    const gui = async (xacNhanTrung) => {
      const than = {
        hoTen: document.getElementById('nb-ten').value,
        tenLop,
        ngaySinh: document.getElementById('nb-ns').value,
        gioiTinh: document.getElementById('nb-gt').value,
        ma: document.getElementById('nb-ma').value,
        phHoTen: document.getElementById('nb-ph').value,
        phSdt: document.getElementById('nb-sdt').value,
        diaChi: document.getElementById('nb-dc').value,
        xacNhanTrung,
      };
      const d = await API.post('/api/admin/students', than);
      UI.closeModal();
      // PHIẾU TÀI KHOẢN HIỆN MỘT LẦN, y như đường nhập tệp. Tạo hồ sơ bé mà gia
      // đình không vào được app thì mới xong một nửa việc — và mật khẩu này
      // không xem lại được, nên phải nói rõ điều đó ngay trên phiếu.
      const tk = d.taiKhoan;
      UI.modal(`
        <div class="card"><div class="card-title">Đã nhận ${UI.esc(d.name)} vào nhóm ${UI.esc(tenLop)}</div></div>
        ${tk ? `
          <div class="card">
            <div class="card-title">Tài khoản của gia đình</div>
            ${this.dongSoNgay('Tên đăng nhập', tk.username)}
            ${this.dongSoNgay('Mật khẩu', tk.matKhau)}
            <div class="muted small mt-8">Mật khẩu chỉ hiện đúng lần này. Xin chép ra giấy
              đưa gia đình; lần đăng nhập đầu app sẽ bắt đổi mật khẩu.</div>
          </div>` : ''}
        <button class="btn primary block mt-8" onclick="UI.closeModal()">Xong</button>
      `, 'Đã nhận bé');
      await this.lamMoiLop();
    };

    document.getElementById('nb-luu').onclick = async () => {
      try {
        await gui(false);
      } catch (err) {
        // 409 = "có vẻ bé này đã có" — cảnh báo, không phải lỗi. Hỏi lại một câu
        // rồi cho nhận, y như đường nhập tệp cho phép "nhập cả dòng trùng".
        if (/trùng tên|đã có/.test(err.message || '') && confirm(`${err.message}

Vẫn nhận bé này?`)) {
          try { await gui(true); } catch (e2) { UI.toast(e2.message, 'error'); }
        } else {
          UI.toast(err.message, 'error');
        }
      }
    };
  },

  // UI.modal đóng modal đang mở trước khi mở cái mới, nên sau khi sửa xong phải
  // vẽ lại danh sách nhóm bằng tay thì quản trị mới thấy kết quả ngay.
  async lamMoiLop() {
    const l = this._lopDangXem;
    if (!l) return UI.closeModal();
    await this.xemLop(l.classId, l.tenLop);
  },

  // Thêm một dòng liên hệ khẩn cấp vào hộp thoại đang mở.
  themDongLienHe() {
    const hop = document.getElementById('ad-hs-lhkc');
    if (!hop) return;
    const d = document.createElement('div');
    d.className = 'lhkc-dong';
    d.style.cssText = 'display:flex;gap:6px;margin-bottom:6px';
    d.innerHTML = '<input class="lhkc-ten" placeholder="Họ tên" style="flex:2">'
      + '<input class="lhkc-qh" placeholder="Quan hệ" style="flex:1">'
      + '<input class="lhkc-dt" placeholder="Điện thoại" style="flex:1.4">';
    hop.appendChild(d);
  },

  async suaHocSinh(studentId) {
    const l = this._lopDangXem || {};
    const [students, d] = await Promise.all([
      API.get(`/api/admin/students?classId=${encodeURIComponent(l.classId || '')}&keCaNghi=1`),
      API.get('/api/admin/overview'),
    ]);
    const s = students.find(x => x.id === studentId);
    if (!s) return UI.toast('Không tìm thấy bé này', 'error');
    const lop = d.classes || [];

    UI.modal(`
      <div class="field"><label>Họ và tên</label><input id="ad-hs-ten" value="${UI.esc(s.name)}"></div>
      <div class="field"><label>Mã của bé</label><input id="ad-hs-ma" value="${UI.esc(s.code || '')}" placeholder="Để trống nếu trường không dùng mã">
        <div class="hint">Mỗi bé một mã riêng. Trùng mã sẽ báo lỗi khi lưu.</div>
      </div>
      <div class="field"><label>Ngày sinh</label><input id="ad-hs-ns" type="date" value="${UI.esc(s.dob || '')}"></div>
      <div class="field"><label>Giới tính</label>
        <select id="ad-hs-gt">
          <option value="">— Chưa ghi —</option>
          <option value="Nam" ${s.gender === 'Nam' ? 'selected' : ''}>Nam</option>
          <option value="Nữ" ${s.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
        </select>
      </div>
      <div class="field"><label>Địa chỉ</label><input id="ad-hs-dc" value="${UI.esc(s.address || '')}"></div>
      <div class="field"><label>Dân tộc</label>
        <input id="ad-hs-dt" value="${UI.esc(s.ethnicity || '')}" placeholder="Ví dụ: Kinh">
        <div class="hint">Mẫu sổ của Phòng có cột này. Gia đình chưa khai thì cứ để trống,
        không cần điền cho đủ ô.</div>
      </div>
      <div class="field"><label>Nhóm máu</label>
        <input id="ad-hs-nm" list="ad-hs-nm-goi" value="${UI.esc(s.bloodType || '')}" placeholder="Ví dụ: O">
        <datalist id="ad-hs-nm-goi">
          <option value="A"></option><option value="B"></option>
          <option value="AB"></option><option value="O"></option>
        </datalist>
        <div class="hint">Chỉ ghi khi gia đình đã có kết quả xét nghiệm. Bỏ trống an toàn hơn
        ghi theo trí nhớ: y tế trường không truyền máu, ô này chỉ để đưa cho bệnh viện.</div>
      </div>
      <div class="field"><label>Số định danh cá nhân</label>
        <input id="ad-hs-ddcn" value="${UI.esc(s.soDinhDanh || '')}" placeholder="12 chữ số trên giấy khai sinh / CCCD của bé">
        <div class="hint">Chỉ nhà trường thấy ô này. Cô không cần số định danh để làm việc nên màn hình của cô không hiện.</div>
      </div>
      <div class="field"><label>Tiền sử bệnh / lưu ý đặc biệt</label>
        <textarea id="ad-hs-tsb" rows="2" placeholder="Ví dụ: dị ứng tôm cua; hen nhẹ khi trở trời; đang uống thuốc theo toa tới 30/9">${UI.esc(s.tienSuBenh || '')}</textarea>
        <div class="hint">Cô đọc ô này trước khi nhận bé mỗi sáng. Ghi cả thứ không phải dị ứng: hen, co giật do sốt, thuốc đang dùng.</div>
      </div>
      <div class="field"><label>Liên hệ khẩn cấp (ngoài bố mẹ)</label>
        <div id="ad-hs-lhkc">
          ${(s.lienHeKhanCap && s.lienHeKhanCap.length ? s.lienHeKhanCap : [{}]).map((x, i) => `
            <div class="lhkc-dong" style="display:flex;gap:6px;margin-bottom:6px">
              <input class="lhkc-ten" value="${UI.esc(x.hoTen || '')}" placeholder="Họ tên" style="flex:2">
              <input class="lhkc-qh" value="${UI.esc(x.quanHe || '')}" placeholder="Quan hệ" style="flex:1">
              <input class="lhkc-dt" value="${UI.esc(x.dienThoai || '')}" placeholder="Điện thoại" style="flex:1.4">
            </div>`).join('')}
        </div>
        <button class="btn sm outline" onclick="App.views.admin.themDongLienHe()">+ Thêm người</button>
        <div class="hint">Nhà trường gọi những số này khi không liên lạc được với bố mẹ. Bỏ trống họ tên là dòng đó không được lưu.</div>
      </div>
      <div class="field"><label>Số CCCD của bố / mẹ</label>
        ${(s.parents || []).length ? `<div id="ad-hs-cccd">
          ${(s.parents || []).map(p => `
            <div class="cccd-dong" style="display:flex;gap:6px;align-items:center;margin-bottom:6px"
                 data-uid="${UI.esc(p.id)}">
              <span class="small" style="flex:1;min-width:0">${UI.esc(p.name)}</span>
              <input class="cccd-so" value="${UI.esc(p.soCccd || '')}" placeholder="12 chữ số" style="flex:1.2">
            </div>`).join('')}
        </div>` : '<div class="muted small">Bé này chưa gắn tài khoản phụ huynh nào.</div>'}
        <div class="hint">Văn phòng dùng để đối chiếu khi ký hợp đồng và khi giao bé cho người tới đón.
        Số này là <b>của một người</b>, không phải của một bé: nhà có hai con thì sửa ở đâu cũng ra cùng một chỗ.
        Cô không thấy ô này, và bố cũng không thấy số của mẹ.</div>
      </div>
      <div class="field"><label>Giấy đồng ý gia đình đã ký</label>
        <div class="muted small" style="line-height:1.6;margin-bottom:8px">
          Ba mục tách riêng đúng như tờ giấy. Mục <b>chia sẻ ảnh</b> quyết định ảnh của bé
          có hiện với các gia đình khác trong nhóm hay không — <b>lọc thật ở máy chủ</b>,
          không phải chỉ ẩn trên màn hình.
        </div>
        ${[['dy-hoso', 'hoSoHocTap', '① Trường giữ hồ sơ học tập của con'],
           ['dy-chiase', 'chiaSeGiaDinh', '② Chia sẻ ảnh và câu chuyện cho gia đình khác trong nhóm'],
           ['dy-tt', 'truyenThong', '③ Dùng ảnh cho truyền thông / tuyển sinh']]
          .map(([id, khoa, nhan]) => {
            const v = (s.dongY || {})[khoa];
            return `<div style="margin-bottom:8px">
              <div class="small" style="margin-bottom:4px">${UI.esc(nhan)}</div>
              <select id="ad-${UI.esc(id)}" data-khoa="${UI.esc(khoa)}" class="ad-dongy">
                <option value="" ${v === null || v === undefined ? 'selected' : ''}>Chưa trả lời</option>
                <option value="1" ${v === true ? 'selected' : ''}>Đồng ý</option>
                <option value="0" ${v === false ? 'selected' : ''}>Không đồng ý</option>
              </select>
            </div>`;
          }).join('')}
        <div class="grid-2">
          <input id="ad-dy-nguoiky" value="${UI.esc((s.dongY || {}).nguoiKy || '')}" placeholder="Người ký giấy">
          <input id="ad-dy-ngayky" type="date" value="${UI.esc((s.dongY || {}).ngayKy || '')}">
        </div>
        <div class="hint">"Chưa trả lời" khác hẳn "Không đồng ý": chưa thu được giấy thì để nguyên
        mục đó, đừng chọn "Không đồng ý" thay gia đình. Gia đình rút lại đồng ý lúc nào cũng được —
        chọn lại "Chưa trả lời" hoặc "Không đồng ý" là ảnh của bé thôi hiện với nhà khác ngay.
        Riêng mục <b>hồ sơ học tập</b>: chọn "Không đồng ý" là trường ngưng ghi quan sát, kế hoạch
        và báo cáo mới cho bé — phần đã ghi vẫn giữ nguyên, và nhật ký ngày vẫn chạy như thường.</div>
      </div>
      <div class="field"><label>Nhóm</label>
        <select id="ad-hs-lop">
          <option value="">— Chưa xếp nhóm —</option>
          ${lop.map(c => `<option value="${UI.esc(c.id)}" ${c.id === s.classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
        </select>
        <div class="hint">Chuyển nhóm sẽ đổi luôn cô phụ trách được xem hồ sơ của bé.</div>
      </div>
      <button class="btn primary block" id="ad-hs-luu">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, `Sửa hồ sơ ${s.name}`);

    document.getElementById('ad-hs-luu').onclick = async () => {
      const name = document.getElementById('ad-hs-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập họ tên của bé', 'error');
      try {
        await API.put(`/api/admin/students/${encodeURIComponent(studentId)}`, {
          name,
          code: document.getElementById('ad-hs-ma').value.trim(),
          dob: document.getElementById('ad-hs-ns').value,
          gender: document.getElementById('ad-hs-gt').value,
          address: document.getElementById('ad-hs-dc').value.trim(),
          ethnicity: document.getElementById('ad-hs-dt').value.trim(),
          bloodType: document.getElementById('ad-hs-nm').value.trim(),
          soDinhDanh: document.getElementById('ad-hs-ddcn').value.trim(),
          tienSuBenh: document.getElementById('ad-hs-tsb').value.trim(),
          lienHeKhanCap: [...document.querySelectorAll('#ad-hs-lhkc .lhkc-dong')].map(d => ({
            hoTen: d.querySelector('.lhkc-ten').value.trim(),
            quanHe: d.querySelector('.lhkc-qh').value.trim(),
            dienThoai: d.querySelector('.lhkc-dt').value.trim(),
          })),
          classId: document.getElementById('ad-hs-lop').value || null,
        });

        // Giấy đồng ý đi đường riêng: nó là căn cứ pháp lý, có nhật ký riêng,
        // và ba mục của nó có BA giá trị chứ không phải bật/tắt.
        const dy = {};
        for (const o of document.querySelectorAll('.ad-dongy')) {
          dy[o.dataset.khoa] = o.value === '' ? null : o.value === '1';
        }
        dy.nguoiKy = document.getElementById('ad-dy-nguoiky').value.trim();
        dy.ngayKy = document.getElementById('ad-dy-ngayky').value;
        await API.put(`/api/admin/students/${encodeURIComponent(studentId)}/dong-y`, dy);

        // Số CCCD đi đường RIÊNG vì nó thuộc về người lớn, không thuộc về bé.
        // Chỉ gửi những ô người dùng thật sự sửa: gửi hết là mỗi lần lưu hồ sơ
        // bé lại ghi đè lên bản ghi của một người có thể đang được sửa ở màn
        // hình khác, cho bé thứ hai của cùng nhà.
        for (const d of document.querySelectorAll('#ad-hs-cccd .cccd-dong')) {
          const uid = d.dataset.uid;
          const moi = d.querySelector('.cccd-so').value.trim();
          const cu = ((s.parents || []).find(p => p.id === uid) || {}).soCccd || '';
          if (moi === cu) continue;
          await API.put(`/api/admin/parents/${encodeURIComponent(uid)}/cccd`, { soCccd: moi });
        }

        UI.toast('Đã lưu hồ sơ của bé', 'success');
        App.route();
        await this.lamMoiLop();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // "Cho nghỉ học" chỉ đánh dấu ngừng theo học. Không xóa gì cả: điểm danh, nhật
  // ký ngày, album, hành trình học tập và hồ sơ sức khoẻ của bé vẫn còn để tra
  // cứu và bàn giao.
  //
  // KHÔNG hứa giữ "học bạ": mầm non không có học bạ, và app 2 đã tắt phân hệ Báo
  // cáo — tức là app đang hứa giữ một thứ nó không còn tạo ra.
  choNghiHoc(studentId) {
    UI.modal(`
      <p style="line-height:1.6">Đánh dấu bé này <b>đã nghỉ học</b>?</p>
      <p class="muted small" style="line-height:1.6">
        Bé sẽ không còn trong danh sách điểm danh và phụ huynh không nhận thông báo
        của nhóm nữa. <b>Toàn bộ dữ liệu cũ vẫn được giữ nguyên</b> — điểm danh,
        nhật ký ngày, album, hành trình học tập, hồ sơ sức khoẻ đều tra cứu được.
        Nhận lại bất cứ lúc nào bằng nút "Nhận lại" ngay dưới danh sách nhóm.
      </p>
      <button class="btn primary block mt-14" id="ad-nghi-ok">Xác nhận cho nghỉ học</button>
      <button class="btn outline block mt-8" onclick="App.views.admin.lamMoiLop()">Quay lại</button>
    `, 'Xác nhận');

    document.getElementById('ad-nghi-ok').onclick = async () => {
      try {
        await API.del(`/api/admin/students/${encodeURIComponent(studentId)}`);
        UI.toast('Đã đánh dấu nghỉ học', 'success');
        App.route();
        await this.lamMoiLop();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  async nhanLaiHocSinh(studentId) {
    try {
      await API.put(`/api/admin/students/${encodeURIComponent(studentId)}`, { active: true });
      UI.toast('Đã nhận lại bé', 'success');
      App.route();
      await this.lamMoiLop();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---------- Nhập danh sách ----------
  async tabNhapLieu(body) {
    body.innerHTML = `
      <div class="card">
        <div class="card-title">📋 Nhập danh sách bé từ Excel</div>
        <p class="muted small" style="line-height:1.6">
          Xuất danh sách của trường ra tệp CSV rồi tải lên đây. Hệ thống tự tạo nhóm,
          bé và tài khoản phụ huynh. Phụ huynh có nhiều con dùng chung một tài
          khoản nếu trùng số điện thoại.
        </p>
        <a class="btn outline block mt-14" href="/api/admin/import/template" download>⬇ Tải tệp mẫu CSV</a>
      </div>

      <div class="card">
        <div class="field">
          <label>Chọn tệp CSV</label>
          <input type="file" id="ad-file" accept=".csv,text/csv" style="display:none">
          <button class="btn outline block" id="ad-pick">📄 Chọn tệp từ máy</button>
          <div class="hint">Cột cần có: Họ tên, Nhóm, Họ tên phụ huynh. Các cột khác không bắt buộc.</div>
        </div>
        <div id="ad-preview"></div>
      </div>`;

    const input = document.getElementById('ad-file');
    document.getElementById('ad-pick').onclick = () => input.click();
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        // Chặn ngay tại chỗ để văn thư biết mà sửa tệp, khỏi phải chờ gửi lên
        // máy chủ. Máy chủ vẫn chặn lần nữa — đây chỉ là báo sớm cho tiện.
        if (this._hongBangMa.test(text)) { this._csv = null; this.baoLoiPhongChu(f.name, text); return; }
        this._csv = text;
        this.xemTruoc();
      };
      reader.readAsText(f, 'utf-8');
      input.value = '';   // để chọn lại đúng tệp đó sau khi sửa vẫn kích hoạt onchange
    };
  },

  // Tệp lưu sai bảng mã: nói rõ hỏng ở đâu và chỉ từng bước cách sửa trong Excel.
  // Cố ý KHÔNG cho nhập tiếp: nhập vào thì tên bé và tên phụ huynh sai
  // hàng loạt, mà app chưa có màn hình nào sửa lại được hàng loạt.
  baoLoiPhongChu(tenTep, text) {
    const dong = String(text).split(/\r?\n/);
    const i = dong.findIndex(d => this._hongBangMa.test(d));
    const viDu = (dong[i] || '').replace(/\u0000/g, '').slice(0, 60);
    document.getElementById('ad-preview').innerHTML = `
      <div class="card mt-14" style="border-left:4px solid var(--danger)">
        <div class="card-title">Tệp bị lỗi phông chữ tiếng Việt</div>
        <p class="small">Tệp <b>${UI.esc(tenTep)}</b> đang lưu theo kiểu chữ cũ nên tên có dấu
        đã biến thành ký tự lạ. Ở dòng ${i + 1} hệ thống đọc được:</p>
        <p class="small"><code>${UI.esc(viDu)}</code></p>
        <p class="small">Nhập tệp này vào thì tên bé và tên phụ huynh sẽ sai, và không
        sửa lại hàng loạt được. Xin sửa tệp trước, chỉ mất khoảng một phút:</p>
        <ol class="small" style="line-height:1.7;padding-left:18px">
          <li>Mở tệp bằng Excel.</li>
          <li>Chọn <b>Tệp</b> (File) → <b>Lưu dưới dạng</b> (Save As).</li>
          <li>Ở ô chọn kiểu tệp, chọn dòng <b>CSV UTF-8 (Comma delimited) (*.csv)</b> —
              nhớ chọn đúng dòng <b>có chữ UTF-8</b>.</li>
          <li>Lưu lại, rồi bấm <b>Chọn tệp từ máy</b> và tải lên lần nữa.</li>
        </ol>
        <p class="small muted">Nếu máy không có dòng "CSV UTF-8", bấm <b>Tải tệp mẫu CSV</b>
        ở trên, chép danh sách vào tệp mẫu đó rồi lưu lại.</p>
      </div>`;
  },

  async xemTruoc() {
    const zone = document.getElementById('ad-preview');
    zone.innerHTML = '<div class="loading">Đang kiểm tra</div>';
    try {
      const r = await API.post('/api/admin/import/preview', { csv: this._csv });
      const loi = r.rows.filter(x => x.loi.length);
      // Máy chủ cũ chưa có trường `trung` — mặc định 0 để bản giao diện mới vẫn
      // chạy đúng nếu người dùng mở app trước khi máy chủ kịp cập nhật.
      const soTrung = r.trung || 0;
      const dsTrung = r.rows.filter(x => x.trung);
      const soNhap = r.total - r.loi - soTrung;
      this._nhapCaTrung = false;
      zone.innerHTML = `
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.total}</div><div class="stat-label">Dòng đọc được</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${soNhap}</div><div class="stat-label">Sẽ nhập</div></div>
          <div class="stat-box"><div class="stat-num" style="color:${r.loi ? 'var(--danger)' : 'var(--muted)'}">${r.loi}</div><div class="stat-label">Có lỗi</div></div>
          <div class="stat-box"><div class="stat-num" style="color:${soTrung ? 'var(--warning)' : 'var(--muted)'}">${soTrung}</div><div class="stat-label">Đã có</div></div>
        </div>
        ${r.lopMoi.length ? `<div class="card" style="border-left:4px solid var(--info)">
          Sẽ tạo mới ${r.lopMoi.length} nhóm: <b>${UI.esc(r.lopMoi.join(', '))}</b></div>` : ''}
        ${soTrung ? `
          <div class="card" style="border-left:4px solid var(--warning)">
            <div class="card-title">${soTrung} bé đã có trong hệ thống — sẽ được bỏ qua</div>
            <div class="muted small" style="line-height:1.6">
              Nhận ra theo họ tên, ngày sinh và nhóm. Nhập lại sẽ tạo ra hai hồ sơ
              cho cùng một bé, kèm hai tài khoản phụ huynh khác nhau.
            </div>
            ${dsTrung.slice(0, 15).map(x => `<div class="small mt-8">
              <b>Dòng ${x.line}</b> ${UI.esc(x.hoTen)} — ${UI.esc(x.trung)}</div>`).join('')}
            ${dsTrung.length > 15 ? `<div class="muted small mt-8">…và ${dsTrung.length - 15} bé khác</div>` : ''}
            <label class="mt-14" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
              <input type="checkbox" id="ad-trung-ok" style="margin-top:3px">
              <span class="small">Trường tôi có những bé trùng cả họ tên, ngày sinh lẫn nhóm —
                cứ nhập cả ${soTrung} bé này.</span>
            </label>
          </div>` : ''}
        ${loi.length ? `
          <div class="card" style="border-left:4px solid var(--danger)">
            <div class="card-title">Các dòng sẽ bị bỏ qua</div>
            ${loi.slice(0, 15).map(x => `<div class="small" style="margin-bottom:6px">
              <b>Dòng ${x.line}</b> ${UI.esc(x.hoTen || '(chưa có tên)')} — ${UI.esc(x.loi.join('; '))}</div>`).join('')}
            ${loi.length > 15 ? `<div class="muted small">…và ${loi.length - 15} dòng khác</div>` : ''}
          </div>` : ''}
        <div class="table-wrap mt-14">
          <table class="simple">
            <thead><tr><th>Bé</th><th>Nhóm</th><th>Phụ huynh</th><th>Tên đăng nhập</th></tr></thead>
            <tbody>${r.rows.filter(x => !x.loi.length && !x.trung).slice(0, 20).map(x => `
              <tr><td>${UI.esc(x.hoTen)}</td><td>${UI.esc(x.tenLop)}</td>
                  <td>${UI.esc(x.phHoTen)}</td><td>${UI.esc(x.username)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        ${soNhap > 20 ? `<div class="muted small center mt-8">Hiển thị 20 dòng đầu trong ${soNhap} dòng sẽ nhập</div>` : ''}
        <button class="btn primary block mt-14" id="ad-commit" ${soNhap ? '' : 'disabled'}>
          Nhập ${soNhap} bé vào hệ thống
        </button>`;

      const btn = document.getElementById('ad-commit');
      const oTrung = document.getElementById('ad-trung-ok');
      const veLaiNut = () => {
        this._nhapCaTrung = !!(oTrung && oTrung.checked);
        const n = this._nhapCaTrung ? soNhap + soTrung : soNhap;
        btn.disabled = !n;
        btn.textContent = `Nhập ${n} bé vào hệ thống`;
      };
      if (oTrung) oTrung.onchange = veLaiNut;
      if (btn) btn.onclick = () => this.nhapThat(this._nhapCaTrung ? soNhap + soTrung : soNhap);
    } catch (err) {
      zone.innerHTML = `<div class="card" style="border-left:4px solid var(--danger)">${UI.esc(err.message)}</div>`;
    }
  },

  async nhapThat(soLuong) {
    if (!confirm(`Nhập ${soLuong} bé vào hệ thống?\n\nHệ thống sẽ tạo tài khoản phụ huynh kèm mật khẩu ban đầu.`)) return;
    const btn = document.getElementById('ad-commit');
    btn.disabled = true;
    btn.textContent = 'Đang nhập…';
    try {
      const r = await API.post('/api/admin/import/commit', {
        csv: this._csv,
        nhapCaTrung: this._nhapCaTrung === true,
      });
      this.hienPhieu(r);
    } catch (err) {
      UI.toast(err.message, 'error');
      btn.disabled = false;
    }
  },

  // Danh sách tài khoản vừa tạo — nhà trường in ra phát cho phụ huynh.
  hienPhieu(r) {
    const rows = r.taiKhoan;
    UI.modal(`
      <p>Đã nhập <b>${r.imported}</b> bé${r.boQua ? `, bỏ qua ${r.boQua} dòng` : ''}${r.boQuaTrung ? ` (trong đó ${r.boQuaTrung} bé đã có sẵn trong hệ thống)` : ''}.</p>
      <p class="muted small">Danh sách tài khoản dưới đây <b>chỉ hiện một lần</b>. Hãy tải về và in
      phát cho phụ huynh. Mật khẩu sẽ được yêu cầu đổi khi đăng nhập lần đầu.</p>
      <button class="btn primary block mt-14" id="ad-tai">⬇ Tải danh sách tài khoản (CSV)</button>
      <div class="table-wrap mt-14" style="max-height:40vh;overflow-y:auto">
        <table class="simple">
          <thead><tr><th>Bé</th><th>Phụ huynh</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr></thead>
          <tbody>${rows.map(t => `<tr>
            <td>${UI.esc(t.hocSinh)}</td><td>${UI.esc(t.phuHuynh)}</td>
            <td><code>${UI.esc(t.username)}</code></td><td><code>${UI.esc(t.matKhau)}</code></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `, 'Tài khoản đã tạo');

    document.getElementById('ad-tai').onclick = () => {
      const head = ['Bé', 'Nhóm', 'Phụ huynh', 'Tên đăng nhập', 'Mật khẩu'];
      const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      const noiDung = '﻿' + [head.join(',')]
        .concat(rows.map(t => [t.hocSinh, t.lop, t.phuHuynh, t.username, t.matKhau].map(esc).join(',')))
        .join('\r\n');
      const blob = new Blob([noiDung], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tai-khoan-phu-huynh.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  },

  // ---------- Giáo viên ----------
  async tabGiaoVien(body) {
    const list = await API.get('/api/admin/teachers');
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Giáo viên<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.themGiaoVien()">+ Thêm</button>
        </div>
        ${list.length ? list.map(t => `
          <div class="list-row">
            ${UI.avatar(t.avatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(t.title)} ${UI.esc(t.name)}</div>
              <div class="row-sub">${UI.esc(t.className || 'chưa phụ trách nhóm nào')} · ${UI.esc(t.username)}</div>
            </div>
            ${t.mustChangePassword ? UI.badge('Chưa đổi mật khẩu', 'orange') : ''}
          </div>`).join('') : '<div class="muted small">Chưa có giáo viên nào.</div>'}
      </div>`;
  },

  async themGiaoVien() {
    const d = await API.get('/api/admin/overview');
    UI.modal(`
      <div class="field"><label>Họ tên</label><input id="ad-gv-ten" placeholder="Nguyễn Thị Mai Anh"></div>
      <div class="field"><label>Danh xưng</label>
        <select id="ad-gv-xung"><option value="Cô">Cô</option><option value="Thầy">Thầy</option></select></div>
      <div class="field"><label>Điện thoại</label><input id="ad-gv-sdt" placeholder="0903111222"></div>
      <div class="field"><label>Email</label><input id="ad-gv-email" type="email" placeholder="maianh@truong.edu.vn"></div>
      <div class="field"><label>Phụ trách nhóm</label>
        <select id="ad-gv-lop"><option value="">— Chưa phân công —</option>
          ${d.classes.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
        </select></div>
      <button class="btn primary block" id="ad-gv-luu">Tạo tài khoản</button>
    `, 'Thêm giáo viên');

    document.getElementById('ad-gv-luu').onclick = async () => {
      const name = document.getElementById('ad-gv-ten').value.trim();
      if (!name) return UI.toast('Vui lòng nhập họ tên', 'error');
      try {
        const r = await API.post('/api/admin/teachers', {
          name,
          title: document.getElementById('ad-gv-xung').value,
          phone: document.getElementById('ad-gv-sdt').value.trim(),
          email: document.getElementById('ad-gv-email').value.trim(),
          classId: document.getElementById('ad-gv-lop').value || null,
        });
        UI.modal(`
          <p>Đã tạo tài khoản cho <b>${UI.esc(r.name)}</b>. Đọc thông tin sau cho giáo viên:</p>
          <div class="card" style="margin:14px 0;text-align:center;background:var(--primary-tint);border-color:var(--primary)">
            <div class="muted small">Tên đăng nhập</div>
            <div style="font-size:1.2rem;font-weight:800">${UI.esc(r.username)}</div>
            <div class="muted small mt-14">Mật khẩu ban đầu</div>
            <div style="font-size:1.5rem;font-weight:800;letter-spacing:.1em;font-family:ui-monospace,monospace">${UI.esc(r.temporaryPassword)}</div>
          </div>
          <p class="muted small">Mật khẩu chỉ hiện một lần. Giáo viên sẽ được yêu cầu đổi khi đăng nhập.</p>
          <button class="btn primary block mt-14" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
        `, 'Tài khoản giáo viên');
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

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
      ${khoi('Tính năng cắm thêm', list.filter(m => m.moRong))}`;
  },

  async doiTinhNang(key, bat) {
    try {
      const r = await API.put(`/api/admin/modules/${key}`, { enabled: bat });
      UI.toast(r.message, 'success');
      await App.loadModules();      // cập nhật ngay cho chính người quản trị
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---------- Chuyển năm học ----------
  async tabNamHoc(body) {
    const d = await API.get('/api/schoolyear/preview');
    // Nhớ lại bản xem trước để câu hỏi lại nói đúng con số thật, thay vì nhắc
    // tới một "khối cuối cấp" mà nhóm mầm non không hề dùng tới.
    this._xemTruocNam = d;
    // Mọi nhóm đều đi theo bậc mầm non thì ô "Khối cuối cấp" không có tác dụng
    // gì — giấu hẳn đi thay vì để nó nằm đó nhận số của hiệu trưởng rồi bỏ qua.
    const theoBacHet = (d.buoc || []).length > 0 && d.buoc.every(b => b.theoBac);
    body.innerHTML = `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title">⚠️ Việc này ảnh hưởng toàn trường</div>
        <p class="muted small" style="line-height:1.6">
          Chuyển năm học sẽ đưa toàn bộ các bé lên nhóm kế tiếp, cho các bé lớn nhất
          ra trường và đóng các nhóm của năm cũ. Chỉ làm khi đã kết thúc năm học.
          <b>Hãy nhờ người phụ trách máy chủ của trường sao lưu dữ liệu trước khi bấm.</b>
        </p>
      </div>

      <div class="card">
        <div class="card-title">Chuyển từ ${UI.esc(d.namHienTai || 'chưa đặt')} sang ${UI.esc(d.namMoi)}</div>
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${d.tongLenLop}</div><div class="stat-label">Bé lên nhóm</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${d.tongRaTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${d.buoc.filter(b => b.taoLopMoi).length}</div><div class="stat-label">Nhóm tạo mới</div></div>
        </div>
        <div class="table-wrap">
          <table class="simple">
            <thead><tr><th>Nhóm hiện tại</th><th>Số bé</th><th>Chuyển thành</th></tr></thead>
            <tbody>${d.buoc.map(b => `
              <tr>
                <td>${UI.esc(b.tenHienTai)}</td>
                <td>${b.siSo}</td>
                <td>${b.raTruong
                  ? '<span style="color:var(--warning);font-weight:600">Ra trường</span>'
                  : (b.khongNhanDang || !b.tenLopMoi
                    // Máy chủ đã gửi cờ này từ Đ118f; ô trống ở đây từng làm
                    // hiệu trưởng không biết nhóm sẽ đi đâu — nó không đi đâu cả.
                    ? '<span class="muted">Giữ nguyên — tên không theo mẫu, trường tự xếp sau</span>'
                    : UI.esc(b.tenLopMoi) + (b.taoLopMoi ? ' <span class="muted small">(tạo mới)</span>' : ''))}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        ${theoBacHet ? `
          <div class="hint mt-14">
            Các nhóm đi theo bậc mầm non: Nhà trẻ → Mầm → Chồi → Lá → vào lớp 1.
            Bảng trên đã nói rõ nhóm nào lên nhóm nào, không cần chọn gì thêm.
          </div>` : `
          <div class="field mt-14">
            <label>Khối cuối cấp — chỉ dùng cho nhóm đặt tên theo số, ví dụ "Lớp 5A"</label>
            <input type="number" id="ny-khoi" value="${UI.esc(d.khoiToiDa)}" min="1" max="12">
            <div class="hint">Nhóm đặt tên theo bậc (Chồi, Lá…) không dùng tới ô này.</div>
          </div>`}
        <button class="btn danger-soft block" onclick="App.views.admin.chuyenNamHoc('${UI.esc(d.namMoi)}')">
          Chuyển sang năm học ${UI.esc(d.namMoi)}
        </button>
      </div>

      <div class="card" id="ny-cuu">
        <div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Đang xem…</p>
      </div>`;
    // Tải RỜI, sau khi phần chuyển năm đã hiện xong: đây là phần tra cứu thêm,
    // không được phép làm hỏng màn hình chuyển năm nếu nó lỗi.
    this.taiBeRaTruong();
  },

  // Danh sách bé đã ra trường — đường đọc cho `/api/schoolyear/alumni`.
  //
  // Máy chủ có đường này từ lâu và lọc đúng theo cơ sở, nhưng KHÔNG màn hình
  // nào gọi tới: `routes/hocsinh-cu.js` trả mảng rỗng cho cô và quản trị kèm
  // chú thích "đã có đường riêng ở Quản trị → Năm học" — trong khi tab Năm học
  // chỉ có phần chuyển năm. Nghĩa là sau khi chuyển năm, bé ra trường biến mất
  // khỏi mọi màn hình của trường, còn gia đình thì vẫn xem được 12 tháng.
  async taiBeRaTruong() {
    const o = document.getElementById('ny-cuu');
    if (!o) return;
    let ds;
    try {
      ds = await API.get('/api/schoolyear/alumni');
    } catch (err) {
      o.innerHTML = `<div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Chưa xem được danh sách lúc này. ${UI.esc(err.message || '')}</p>`;
      return;
    }
    if (!ds.length) {
      o.innerHTML = `<div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Chưa có bé nào ra trường hoặc chuyển đi.</p>`;
      return;
    }
    o.innerHTML = `
      <div class="card-title">Bé đã ra trường (${ds.length})</div>
      <p class="muted small">Gia đình vẫn xem lại được hồ sơ của con trong 12 tháng
        kể từ ngày rời trường. Trường xem được lâu hơn.</p>
      <div class="table-wrap mt-14">
        <table class="simple">
          <thead><tr><th>Tên bé</th><th>Nhóm cuối</th><th>Ngày rời trường</th></tr></thead>
          <tbody>${ds.map(s => `
            <tr>
              <td>${UI.esc(s.name)}${s.code ? ` <span class="muted small">${UI.esc(s.code)}</span>` : ''}</td>
              <td>${UI.esc(s.className || '—')}</td>
              <td>${s.leftAt ? UI.fmtDate(s.leftAt, { weekday: false }) : '—'}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      ${ds.length >= 500 ? '<div class="hint mt-14">Đang hiện 500 bé rời trường gần nhất.</div>' : ''}`;
  },

  async chuyenNamHoc(namMoi) {
    // Ô "Khối cuối cấp" bị giấu khi mọi nhóm đi theo bậc mầm non, nên phải đọc
    // phòng hờ. 5 là giá trị mặc định của máy chủ, giữ nguyên cho lớp kiểu cũ.
    const oKhoi = document.getElementById('ny-khoi');
    const khoiToiDa = oKhoi ? (Number(oKhoi.value) || 5) : 5;
    // Nói đúng con số thật của bản xem trước, thay vì nhắc tới "khối" — với nhóm
    // mầm non thì "khối" không có nghĩa gì cả.
    const d = this._xemTruocNam || {};
    const soRaTruong = d.tongRaTruong == null ? '' : `${d.tongRaTruong} bé sẽ ra trường. `;
    // HỎI THỨ NGƯỜI BẤM THẬT SỰ BIẾT.
    //
    // Hộp thoại thứ hai từng hỏi "bạn đã chạy npm run backup chưa?". Người đang
    // bấm nút này là hiệu trưởng, ngồi trước điện thoại hoặc máy tính của
    // trường — họ KHÔNG chạy được lệnh đó, và app cũng không có nút nào để sao
    // lưu. Hỏi một câu người ta không trả lời thật được thì họ bấm "Đồng ý" cho
    // xong, và cả hai lớp xác nhận thành hình thức.
    if (!confirm(`Chuyển toàn trường sang năm học ${namMoi}?\n\n${soRaTruong}Việc này không tự hoàn tác được.`)) return;
    if (!confirm('Xác nhận lần nữa: nhà trường ĐÃ SAO LƯU dữ liệu chưa?\n\n'
      + 'Nếu chưa, xin bấm Huỷ và nhờ người phụ trách máy chủ sao lưu giúp trước.')) return;
    try {
      const r = await API.post('/api/schoolyear/promote', { namMoi, khoiToiDa });
      UI.modal(`
        <p>${UI.esc(r.message)}</p>
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.lenLop}</div><div class="stat-label">Lên nhóm</div></div>
          <div class="stat-box"><div class="stat-num">${r.raTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${r.lopTao}</div><div class="stat-label">Nhóm mới</div></div>
          ${r.giuNguyen ? `<div class="stat-box"><div class="stat-num">${r.giuNguyen}</div><div class="stat-label">Giữ nguyên</div></div>` : ''}
        </div>
        <button class="btn primary block mt-14" onclick="UI.closeModal();App.views.admin.go('tongquan')">
          Đi phân công cô phụ trách
        </button>`, `Đã chuyển sang ${namMoi}`);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---------- Nhật ký ----------
  async tabNhatKy(body) {
    const rows = await API.get('/api/admin/audit');
    const TEN = {
      login: 'Đăng nhập', 'change-password': 'Đổi mật khẩu', 'set-new-password': 'Đặt mật khẩu mới',
      'reset-password': 'Cấp lại mật khẩu', 'leave-review': 'Duyệt đơn xin phép',
      'notification-create': 'Tạo thông báo', 'album-delete': 'Xóa album',
      'import-students': 'Nhập danh sách bé', 'class-create': 'Tạo nhóm',
      'class-update': 'Sửa nhóm', 'teacher-create': 'Tạo tài khoản giáo viên',
      'student-update': 'Sửa hồ sơ của bé', 'student-deactivate': 'Cho bé nghỉ học',
      'admin-create': 'Tạo tài khoản quản trị', 'schoolyear-promote': 'Chuyển năm học',
      'module-enable': 'Bật tính năng', 'module-disable': 'Tắt tính năng',
    };
    body.innerHTML = rows.length ? `
      <div class="card">
        <p class="muted small mb-8">200 thao tác gần nhất. Dùng để tra khi có khiếu nại về dữ liệu.</p>
        ${rows.map(r => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(TEN[r.action] || r.action)}</div>
              <div class="row-sub">${UI.esc(r.who)} · ${UI.fmtDate(r.at, { weekday: false })} ${UI.fmtTime(r.at)}</div>
            </div>
          </div>`).join('')}
      </div>` : UI.emptyState('📋', 'Chưa có thao tác nào được ghi lại');
  },
};
