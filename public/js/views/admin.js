// Trang quản trị dành cho ban giám hiệu: quản lý nhóm lớp, cô, bé
// và nhập danh sách đầu năm từ tệp Excel/CSV.
//
// Tệp này là LÕI: dải tab, render/go, bí danh, HAM_TAB/coHam và hàm dùng chung
// giữa nhiều tệp. Từng tab nằm ở admin-thong-tin.js, admin-tai-khoan.js,
// admin-nhan-su.js, admin-mot-ngay.js, admin-danh-gia.js, admin-co-so.js,
// admin-quan-tam.js, admin-tinh-nang.js, admin-nam-hoc.js, admin-nhat-ky.js —
// mỗi tệp `Object.assign` thêm hàm vào đúng đối tượng này, nên `this.xxx` và
// `App.views.admin.xxx(...)` vẫn như cũ.
// Thêm tệp mới thì thêm vào public/index.html (sau admin.js) và đệm của sw.js.

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
  // Ba vai của cô ở một nhóm (Đ188, Câu 11) — cùng mã với lib/nhom-co.js.
  VAI_CO: [
    ['chu-nhiem', 'Cô phụ trách nhóm (Montessori)'],
    ['nuoc-ngoai', 'Cô nước ngoài (Cambridge)'],
    ['the-chat', 'Cô thể chất (P.E)'],
  ],
  // DẢI TAB (L6 — góp ý 20/10, mục 12). Máy chủ nói tài khoản này thấy tab nào
  // (`tabQuanTri` trong /api/auth/me, lib/tab-quan-tri.js); null — tệp ấy hỏng
  // hay máy chủ cũ — thì vẽ đủ tab như trước. Chỉ là chỉ đường: chốt thật vẫn
  // ở từng đường API.
  TAB: [
    ['taikhoan', 'Tài khoản'], ['thongtin', 'Thông tin bé & nhân sự'], ['motngay', 'Tổng quan ngày'],
    ['danhgia', 'Cài đặt đánh giá'], ['coso', 'Cơ sở'], ['quantam', 'Quan tâm'],
    ['tinhnang', 'Tính năng'], ['namhoc', 'Năm học'], ['nhatky', 'Nhật ký'],
  ],
  // Mã tab cũ giữ làm bí danh, để địa chỉ cũ (#/admin/nhaplieu) và bản giao
  // diện cũ còn trong máy vẫn mở đúng chỗ: mã cũ → [tab, mục con].
  BI_DANH: { tongquan: ['thongtin', 'nhom'], nhaplieu: ['thongtin', 'nhapbe'], giaovien: ['thongtin', 'nhansu'] },
  MUC_THONG_TIN: [['nhom', 'Nhóm lớp & bé'], ['nhansu', 'Nhân sự'], ['nhapbe', 'Nhập danh sách bé']],
  // Mã tab → tên hàm vẽ tab. Mã lạ rơi về tab Thông tin như trước.
  HAM_TAB: {
    taikhoan: 'tabTaiKhoan', motngay: 'tabMotNgay', danhgia: 'tabDanhGia', coso: 'tabCoSo',
    quantam: 'tabQuanTam', tinhnang: 'tabTinhNang', namhoc: 'tabNamHoc', nhatky: 'tabNhatKy',
  },
  _tab: 'thongtin',
  _muc: 'nhom',
  _csv: null,

  async render(root, params) {
    if (App.state.user.role !== 'admin') {
      root.innerHTML = UI.pageHeader('Quản trị') + UI.emptyState('🔒', 'Chỉ tài khoản quản trị mới vào được mục này');
      return;
    }
    if (params && params[0]) {
      const biDanh = this.BI_DANH[params[0]];
      this._tab = biDanh ? biDanh[0] : params[0];
      if (biDanh) this._muc = biDanh[1];
      else if (this._tab === 'thongtin' && params[1]) this._muc = params[1];
    }
    const choPhep = App.state.user.tabQuanTri;
    const tabs = this.TAB.filter(([k]) => !Array.isArray(choPhep) || choPhep.includes(k));
    if (!tabs.length) {
      root.innerHTML = UI.pageHeader('Quản trị nhà trường')
        + UI.emptyState('🔒', 'Tài khoản này không có việc ở Quản trị');
      return;
    }
    if (!tabs.some(([k]) => k === this._tab)) {
      this._tab = tabs.some(([k]) => k === 'thongtin') ? 'thongtin' : tabs[0][0];
    }

    root.innerHTML = `
      ${UI.pageHeader('Quản trị nhà trường')}
      <div class="seg" id="ad-tabs">
        ${tabs.map(([k, t]) => `<button class="${this._tab === k ? 'active' : ''}" onclick="App.views.admin.go('${k}')">${UI.esc(t)}</button>`).join('')}
      </div>
      <div id="admin-body"><div class="loading">Đang tải</div></div>`;

    const body = document.getElementById('admin-body');
    try {
      // PHẢI await: các tab đều là hàm async, `return this.tabCoSo(body)` là
      // trả promise ra ngoài mà không chờ — lỗi của tab không bao giờ rơi vào
      // catch này, mà rơi về App.route() và bị vẽ đè "Có lỗi xảy ra" lên CẢ
      // trang, mất luôn dải tab để bấm sang tab khác còn chạy được.
      const ham = this.HAM_TAB[this._tab] || 'tabThongTin';
      if (!this.coHam(ham, body)) return;
      return await this[ham](body);
    } catch (err) {
      body.innerHTML = UI.emptyState('😥', err.message);
    }
  },

  // Hàm của một tab nằm ở tệp admin-<phần>.js chưa tải được (mạng chập chờn,
  // tệp lỗi) thì báo đúng ô ấy bằng tiếng Việt và trả false; dải tab cùng các
  // tab khác vẫn bấm được (Nguyên tắc số 1).
  coHam(ten, o) {
    if (typeof this[ten] === 'function') return true;
    o.innerHTML = UI.emptyState('😥', 'Phần này chưa tải được. Bạn tải lại trang giúp nhé.');
    return false;
  },

  // Cùng việc với coHam nhưng cho NÚT BẤM gọi sang tệp tab khác: thiếu tệp thì
  // báo bằng tiếng Việt thay vì một lỗi JS lặng lẽ không ai thấy.
  coHamBao(ten) {
    if (typeof this[ten] === 'function') return true;
    UI.toast('Phần này chưa tải được. Bạn tải lại trang giúp nhé.', 'error');
    return false;
  },

  // Mở thẳng một tab bằng địa chỉ (`#/admin/taikhoan`, lối vào từ Cài đặt) thì
  // địa chỉ phải đổi theo tab được bấm: `render` đọc tab từ địa chỉ, nên để
  // nguyên địa chỉ cũ là bấm tab nào cũng vẽ lại đúng tab cũ.
  go(tab) {
    const biDanh = this.BI_DANH[tab];
    if (biDanh) [tab, this._muc] = biDanh;
    this._tab = tab;
    const [ten, tabTrenDiaChi] = location.hash.replace(/^#\/?/, '').split('/');
    if (ten === 'admin' && tabTrenDiaChi && tabTrenDiaChi !== tab) {
      location.hash = `#/admin/${tab}`;
      return;
    }
    App.route();
  },

  // ---------- Dùng chung giữa nhiều tệp tab ----------
  dongSoNgay(nhan, giaTri) {
    return `<div class="list-row">
      <div class="row-main"><div class="row-title">${UI.esc(nhan)}</div></div>
      <div class="row-end"><b>${UI.esc(giaTri === null || giaTri === undefined ? '—' : String(giaTri))}</b></div>
    </div>`;
  },

  // UI.modal đóng modal đang mở trước khi mở cái mới, nên sau khi sửa xong phải
  // vẽ lại danh sách nhóm bằng tay thì quản trị mới thấy kết quả ngay.
  async lamMoiLop() {
    const l = this._lopDangXem;
    if (!l) return UI.closeModal();
    await this.xemLop(l.classId, l.tenLop);
  },

  // ---------- Thêm phụ huynh cho bé đã có (Đ239d2) ----------
  QUAN_HE_GOI: ['Mẹ', 'Bố', 'Ông', 'Bà', 'Người giám hộ'],

  moThemPhuHuynh(s) {
    UI.modal(`
      <div class="muted small mb-8" style="line-height:1.6">
        Đang có: ${UI.esc((s.parents || []).map(p => p.name).join(', ') || 'chưa có phụ huynh nào')}.<br>
        Máy luôn tạo một <b>tài khoản mới</b> riêng cho người này, kể cả khi số điện thoại
        đã có ở trường. Người này chỉ thấy bé <b>${UI.esc(s.name)}</b>.
      </div>
      <div class="field"><label>Họ tên</label><input id="tk-ph-ten" placeholder="Trần Văn Cường"></div>
      <div class="field"><label>Điện thoại</label><input id="tk-ph-sdt" placeholder="09xxxxxxxx"></div>
      <div class="field"><label>Quan hệ với bé</label>
        <input id="tk-ph-qh" list="tk-ph-qh-goi" placeholder="Bố">
        <datalist id="tk-ph-qh-goi">${this.QUAN_HE_GOI.map(x => `<option value="${UI.esc(x)}"></option>`).join('')}</datalist></div>
      <div class="field"><label>Email</label><input id="tk-ph-email" type="email" placeholder="Không bắt buộc"></div>
      <button class="btn primary block" id="tk-ph-luu">Tạo tài khoản phụ huynh</button>
    `, `Thêm phụ huynh cho ${s.name}`);

    const nut = document.getElementById('tk-ph-luu');
    nut.onclick = async () => {
      if (nut.disabled) return;
      nut.disabled = true;
      try {
        const r = await API.post(`/api/admin/students/${encodeURIComponent(s.id)}/phu-huynh`, {
          name: document.getElementById('tk-ph-ten').value,
          phone: document.getElementById('tk-ph-sdt').value,
          quanHe: document.getElementById('tk-ph-qh').value,
          email: document.getElementById('tk-ph-email').value,
        });
        this.hienMatKhauTam(`${r.name}${r.quanHe ? ` (${r.quanHe} của bé ${s.name})` : ` — phụ huynh của bé ${s.name}`}`,
          r.username, r.temporaryPassword, 'Lần đăng nhập đầu app sẽ bắt đổi mật khẩu.');
      } catch (err) {
        UI.toast(err.message, 'error');
        nut.disabled = false;
      }
    };
  },

  // Hộp mật khẩu tạm, hiện MỘT lần: máy chủ không giữ lại mật khẩu gốc.
  hienMatKhauTam(ten, username, matKhau, loiDan) {
    UI.modal(`
      <p>Đọc thông tin sau cho <b>${UI.esc(ten)}</b>:</p>
      <div class="card" style="margin:14px 0;text-align:center;background:var(--primary-tint);border-color:var(--primary)">
        <div class="muted small">Tên đăng nhập</div>
        <div style="font-size:1.2rem;font-weight:800">${UI.esc(username)}</div>
        <div class="muted small mt-14">Mật khẩu tạm</div>
        <div id="tk-mat-khau" style="font-size:1.5rem;font-weight:800;letter-spacing:.1em;font-family:ui-monospace,monospace">${UI.esc(matKhau)}</div>
      </div>
      <p class="muted small">Mật khẩu chỉ hiện đúng lần này. ${UI.esc(loiDan)}</p>
      <button class="btn outline block" id="tk-chep">Chép mật khẩu</button>
      <button class="btn primary block mt-8" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
    `, 'Mật khẩu tạm', { giuKhiBamNen: true });
    document.getElementById('tk-chep').onclick = async () => {
      try {
        await navigator.clipboard.writeText(matKhau);
        UI.toast('Đã chép mật khẩu', 'success');
      } catch (_) {
        // Trình duyệt không cho chép tự động (trang chưa chạy https, máy cũ):
        // bôi đen sẵn để người dùng tự chép, và nói thẳng như vậy.
        const vung = document.createRange();
        vung.selectNodeContents(document.getElementById('tk-mat-khau'));
        const chon = window.getSelection();
        chon.removeAllRanges();
        chon.addRange(vung);
        UI.toast('Máy chưa cho chép tự động. Mật khẩu đã được bôi đen, bấm giữ để chép.', 'error');
      }
    };
  },
};
