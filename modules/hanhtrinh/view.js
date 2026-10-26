// HÀNH TRÌNH HỌC TẬP — màn hình.
//
// QUY TẮC 2 SỐNG Ở ĐÂY, KHÔNG PHẢI Ở MÁY CHỦ
//
// "Chưa quan sát thấy không phải là không làm được" là một quy tắc về CHỮ và
// MÀU trên màn hình. Máy chủ chỉ lưu một nhãn; chính chỗ này quyết định nhãn đó
// đọc lên thành một lời trấn an hay thành một ô đỏ. Nên trong tệp này:
//
//   • Không nhãn trạng thái nào dùng màu đỏ hay màu cảnh báo.
//   • Bé chưa có quan sát nào thì màn hình MỜI, không TRÁCH: "chưa có gì ở đây,
//     và không sao cả".
//   • Không đếm số quan sát của một bé ra màn hình, không thanh tiến độ, không
//     phần trăm, không xếp bé nào trên bé nào.
//   • Lời nhắc "mấy bé tuần này chưa có ghi chép" nói rõ nó là lời nhắc cho CÔ,
//     không phải nhận định về đứa trẻ.
// BỐN TAB, CHO CẢ CÔ LẪN GIA ĐÌNH (góp ý 06/10 mục 7; thứ tự 16/10 mục 6)
//
//   [Kế hoạch của bé] [Cambridge] [P.E (Thể chất)] [Montessori & Kỹ năng sống]
//
// Tab đầu đọc kế hoạch tháng của bé từ phân hệ Kế hoạch; cô nhìn lại cuối tháng
// từng bài bằng CHỮ QUY ƯỚC (M/S/W/N/NA — năm trạng thái trung tính, chủ dự án
// chốt 06/10) và chọn "Tiếp tục ở tháng sau" (dạy mới / ôn tập). Gia đình chỉ
// thấy TÊN BÀI của phần đã duyệt — không thấy mức độ từng bài (bài canh Đ191).
// Ba tab sau là quan sát / câu chuyện theo chương trình.
//
// Góp ý 16/10: màn của cô mở THẲNG vào bốn tab này (trước đó chúng nằm ở tầng
// hai, sau "Hành trình từng bé"). Suy ngẫm cuối ngày và Chủ đề tuần không mất —
// thành hai lối phụ dưới tiêu đề. Tab đi theo đường dẫn `#/hanhtrinh/<mã>`.
App.views.hanhtrinh = {
  // Thứ tự và chữ của bốn tab do nhà trường đặt — khai ở ĐÚNG MỘT CHỖ này cho
  // cả cô lẫn gia đình. Không đổi thứ tự ở `lib/nhom-co.js`: màn nhắn tin và
  // Kế hoạch của bé đang đọc thứ tự ở đó.
  BON_TAB: [
    ['kehoach', 'Kế hoạch của bé'],
    ['nuoc-ngoai', 'Cambridge'],
    ['the-chat', 'P.E (Thể chất)'],
    ['chu-nhiem', 'Montessori & Kỹ năng sống'],
  ],
  LOI_PHU: [['suyngam', 'Suy ngẫm cuối ngày'], ['chude', 'Chủ đề tuần']],
  // Tên ba chương trình, cùng thứ tự với BON_TAB — đọc từ đó, không chép lại.
  get TEN_CT() { return Object.fromEntries(this.BON_TAB.slice(1)); },
  _tab: 'kehoach',
  // Bé đang xem ở bốn tab. Mặc định CHƯA chọn bé nào: nút Ghi nhanh đặt sẵn
  // bé này, nên đoán hộ bé đầu danh sách là mời cô ghi nhầm (xem `moGhi`).
  _beDangXem: '',
  _tabGd: 'kehoach',
  _thangKH: null,
  MAU_DUYET_KH: {
    nhap: ['Cô đang soạn', 'gray'], 'cho-duyet': ['Chờ quản lý duyệt', 'orange'],
    'da-duyet': ['Đã duyệt', 'green'], 'tra-lai': ['Quản lý gửi lại', 'blue'],
  },
  _ngay: null,
  _classId: null,
  _data: null,
  _anhMoi: null,
  _batDauSuyNgam: null,

  // Màu của năm trạng thái. KHÔNG CÁI NÀO ĐỎ.
  //
  // "Chưa dạy" và "Chưa quan sát thấy" để màu xám trung tính — chúng là thông
  // tin về LỚP HỌC (chưa tới bài này, chưa có dịp thấy), không phải phán xét về
  // đứa trẻ. Một ô đỏ ở đây là cách nhanh nhất biến sổ quan sát thành sổ chê.
  MAU_TRANG_THAI: {
    'chua-day': 'gray',
    'chua-quan-sat-thay': 'gray',
    'dang-hinh-thanh': 'blue',
    'da-vung': 'green',
    'vuot-troi': 'green',
  },

  laGiaDinh() { return App.state.user.role === 'parent'; },

  ten(ds, ma) {
    const t = (ds || []).find(x => x.ma === ma);
    return t ? t.ten : '';
  },

  laTab(ds, ma) { return ds.some(([m]) => m === ma); },

  async render(root, params) {
    this._ngay = this._ngay || UI.todayStr();
    const ma = (params && params[0]) || '';
    if (this.laGiaDinh()) {
      // Tin báo câu chuyện mở `#/hanhtrinh/<mã bé>` — không phải mã tab thì giữ tab đang xem.
      if (this.laTab(this.BON_TAB, ma)) this._tabGd = ma;
      return this.manGiaDinh(root);
    }
    // ĐƯỜNG DẪN QUYẾT ĐỊNH TAB: `#/hanhtrinh` là tab Kế hoạch của bé — không
    // còn rơi vào Suy ngẫm như trước góp ý 16/10.
    this._tab = this.laTab(this.BON_TAB, ma) || this.laTab(this.LOI_PHU, ma) ? ma : 'kehoach';
    return this.manCoGiao(root);
  },

  // ================= Màn của CÔ =================
  async manCoGiao(root) {
    // Khoảng đệm cuối màn: nút Ghi nhanh nổi cố định ở góc dưới, không chừa chỗ
    // thì cuộn hết nó vẫn che dòng cuối (nút Gắn bé / Bỏ của khối nháp).
    root.innerHTML = `
      ${UI.pageHeader('Hành trình học tập')}
      <div class="flex" id="ht-loi-phu" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${this.LOI_PHU.map(([ma, ten]) => `<button class="btn sm ${this._tab === ma ? 'primary' : 'outline'}"
          data-tab="${UI.esc(ma)}" style="min-height:36px">${UI.esc(ten)}</button>`).join('')}
      </div>
      <div id="ht-chon"></div>
      <div class="seg" id="ht-tabs" style="flex-wrap:wrap">
        ${this.BON_TAB.map(([ma, ten]) => `<button class="${this._tab === ma ? 'active' : ''}" data-tab="${UI.esc(ma)}">${UI.esc(ten)}</button>`).join('')}
      </div>
      <div id="ht-than"><div class="loading">Đang tải</div></div>
      <div aria-hidden="true" style="height:calc(56px + env(safe-area-inset-bottom, 0px))"></div>`;

    for (const b of root.querySelectorAll('#ht-loi-phu [data-tab], #ht-tabs [data-tab]')) {
      b.onclick = () => { location.hash = `#/hanhtrinh/${b.dataset.tab}`; };
    }
    const than = document.getElementById('ht-than');
    // Nút Ghi nhanh nằm ngoài phần thân nên nó ở nguyên khi cô đổi tab —
    // đúng ý "luôn có ở góc dưới màn hình".
    root.insertAdjacentHTML('beforeend', this.nutGhiNhanh());
    const sau = (p) => Promise.resolve(p).then(() => this.ganNutGhiNhanh());
    if (this._tab === 'chude') return sau(this.manChuDe(than));
    if (this._tab === 'suyngam') return sau(this.manSuyNgam(than));
    return sau(this.manBonTab(than, document.getElementById('ht-chon')));
  },

  // ---- Tab 1: suy ngẫm cuối ngày ----
  async manSuyNgam(than) {
    const d = await API.get(`/api/hanhtrinh/hom-nay?ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;
    const nhac = await API.get('/api/hanhtrinh/nhac-nhe').catch(() => ({ be: [] }));
    const nhap = await API.get('/api/hanhtrinh/nhap').catch(() => ({ nhap: [] }));
    this._nhap = nhap.nhap || [];

    than.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0">
          <label>Ngày</label>
          <input type="date" id="ht-ngay" value="${UI.esc(this._ngay)}" max="${UI.esc(UI.todayStr())}">
        </div>
        <div class="muted small mt-8" style="line-height:1.6">
          Một quan sát chỉ có mô tả đã là một quan sát hoàn chỉnh.
        </div>
      </div>

      <button class="btn primary block" id="ht-them">${UI.icon('plus', 18)} Ghi một quan sát</button>

      ${this.khoiNhap(this._nhap)}

      ${(d.ghiNhanhChuaDung || []).length ? `
        <div class="section-label">Ghi nhanh hôm nay chưa đưa vào hành trình</div>
        <div class="card">
          <div class="muted small mb-8">Cô bấm để chép sang thành một quan sát, khỏi gõ lại.</div>
          ${(d.ghiNhanhChuaDung || []).map(g => `
            <div class="list-row clickable" data-tu-ghinhanh="${UI.esc(g.id)}" data-be="${UI.esc(g.studentId)}">
              <div class="row-main">
                <div class="row-title">${UI.esc(this.tenBe(g.studentId))}</div>
                <div class="row-sub">${UI.esc(g.note || '(chỉ có ảnh)')}</div>
              </div>
              ${UI.icon('chevron', 18)}
            </div>`).join('')}
        </div>` : ''}

      <div class="section-label">Quan sát hôm đó</div>
      ${(d.quanSat || []).length
        ? (d.quanSat || []).map(q => this.theQuanSat(q)).join('')
        : UI.emptyState('🌱', 'Hôm đó chưa có quan sát nào. Ghi một dòng bất cứ lúc nào cô thấy điều đáng nhớ.')}

      ${(nhac.be || []).length ? `
        <div class="section-label">Nhắc nhẹ cho cô</div>
        <div class="card">
          <div class="muted small" style="line-height:1.6">
            Mấy bé sau <b>chưa có ghi chép nào của cô</b> trong ${UI.esc(String(nhac.soNgay))} ngày qua.
            Đây là lời nhắc cho cô về việc ghi chép, <b>không phải nhận định gì về bé</b> —
            bé vẫn học và chơi như mọi hôm, chỉ là chưa có khoảnh khắc nào được ghi lại.
          </div>
          <div class="flex mt-8" style="flex-wrap:wrap;gap:6px">
            ${(nhac.be || []).map(b => `<span class="badge gray">${UI.esc(b.hoTen)}</span>`).join('')}
          </div>
          ${nhac.loiKhuyen ? `<div class="muted small mt-8" style="line-height:1.6">${UI.esc(nhac.loiKhuyen)}</div>` : ''}
        </div>` : ''}

      ${(nhac.tuanNay || []).length ? `
        <div class="card">
          <div class="muted small" style="line-height:1.6">
            <b>Tuần này</b>${nhac.chuongTrinh ? ` phần ${UI.esc(nhac.chuongTrinh)} của cô` : ''} chưa có ảnh hay
            quan sát nào cho mấy bé sau. Nhà trường đặt mỗi cô của từng chương trình
            đăng ít nhất một ảnh hoặc một quan sát về mỗi bé mỗi tuần — ảnh nhớ kèm
            chú thích bé đang làm gì, hoặc gia đình có thể cùng con thực hành gì ở nhà.
          </div>
          <div class="flex mt-8" style="flex-wrap:wrap;gap:6px">
            ${(nhac.tuanNay || []).map(b => `<span class="badge gray">${UI.esc(b.hoTen)}</span>`).join('')}
          </div>
        </div>` : ''}`;

    document.getElementById('ht-ngay').onchange = (e) => { this._ngay = e.target.value; App.route(); };
    document.getElementById('ht-them').onclick = () => this.moGhi(null);
    this.ganNutNhap(than);
    for (const el of than.querySelectorAll('[data-tu-ghinhanh]')) {
      el.onclick = () => {
        // Mang sẵn chữ và cờ "có ảnh" sang hộp thoại. Không mang thì cô bấm
        // "chép sang" rồi phải gõ lại từ đầu đúng câu mình vừa viết — nút đó
        // không giúp được gì cả.
        const g = (d.ghiNhanhChuaDung || []).find(x => x.id === el.dataset.tuGhinhanh) || {};
        this.moGhi(null, {
          ghiNhanhId: el.dataset.tuGhinhanh,
          studentId: el.dataset.be,
          moTa: g.note || '',
          coAnh: !!g.coAnh,
        });
      };
    }
    for (const el of than.querySelectorAll('[data-ghinham]')) {
      el.onclick = () => this.moGhiNham(el.dataset.ghinham);
    }
    for (const el of than.querySelectorAll('[data-cauchuyen]')) {
      el.onclick = () => this.moCauChuyen(el.dataset.cauchuyen);
    }
  },

  // NHÁP CHƯA GẮN BÉ CỦA CHÍNH CÔ (lớp 1 — máy chủ chỉ trả nháp của người
  // đang đăng nhập). Một khối dùng chung cho Suy ngẫm và ba tab chương trình.
  khoiNhap(ds) {
    if (!ds.length) return '';
    return `
        <div class="section-label">Nháp chưa gắn bé · chỉ cô thấy</div>
        <div class="card" id="ht-nhap-ds">
          <div class="muted small mb-8" style="line-height:1.6">
            Cô ghi vội lúc đứng lớp, chưa chọn bé. Rảnh tay thì gắn bé và chương trình —
            nháp thành một quan sát như mọi quan sát khác, rồi cô kể cho gia đình khi muốn.
            Nháp quá <b>30 ngày</b> chưa gắn bé sẽ tự bỏ, kể cả ảnh.
          </div>
          ${ds.map(n => `
            <div class="list-row" style="flex-wrap:wrap;gap:8px">
              ${n.coAnh ? `<img src="/api/hanhtrinh/anh/${UI.esc(n.anh)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:10px;flex:none">` : ''}
              <div class="row-main" style="min-width:140px">
                <div class="row-title" style="font-weight:400">${UI.esc(n.moTa || '(chỉ có ảnh)')}</div>
                <div class="row-sub">${UI.esc(UI.timeAgo(n.taoLuc))}${n.tenChuongTrinh ? ` · ${UI.esc(n.tenChuongTrinh)}` : ''}</div>
              </div>
              <button class="btn sm primary" data-nhap-gan="${UI.esc(n.id)}" style="min-height:36px">Gắn bé</button>
              <button class="btn sm outline" data-nhap-bo="${UI.esc(n.id)}" style="min-height:36px">Bỏ</button>
            </div>`).join('')}
        </div>`;
  },

  // `ct`: chương trình đặt sẵn khi cô bấm Gắn bé ở một tab chương trình.
  ganNutNhap(than, ct) {
    for (const b of than.querySelectorAll('[data-nhap-gan]')) b.onclick = () => this.moGanNhap(b.dataset.nhapGan, ct);
    for (const b of than.querySelectorAll('[data-nhap-bo]')) {
      b.onclick = async () => {
        if (!confirm('Bỏ bản nháp này? Đây là ghi chép riêng của cô, bỏ rồi không lấy lại được.')) return;
        try { await API.del(`/api/hanhtrinh/nhap/${encodeURIComponent(b.dataset.nhapBo)}`); App.route(); }
        catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },

  tenBe(id) {
    const b = ((this._data || {}).danhSachBe || []).find(x => x.id === id);
    return b ? b.hoTen : '';
  },

  theQuanSat(q) {
    const tt = q.trangThai
      ? UI.badge(this.ten(this._data.trangThai, q.trangThai), this.MAU_TRANG_THAI[q.trangThai] || 'gray')
      : '';
    return `
      <div class="card">
        <div class="list-row" style="border-bottom:none;padding-top:0">
          <div class="row-main">
            <div class="row-title">${UI.esc(q.hoTen || '')}</div>
            ${q.linhVuc ? `<div class="row-sub">${UI.esc(this.ten(this._data.linhVuc, q.linhVuc))}</div>` : ''}
          </div>
          ${tt}
          ${q.daCongBo ? UI.badge('Đã kể cho gia đình', 'green') : ''}
        </div>
        <div class="small" style="line-height:1.6;margin:2px 0 8px">${UI.esc(q.moTa || '')}</div>
        ${q.anh ? `
          <img src="/api/hanhtrinh/anh/${UI.esc(q.anh)}" alt=""
            style="width:100%;max-height:220px;border-radius:12px;object-fit:cover;background:var(--line);margin-bottom:8px">`
    : ''}
        ${q.oLopLamGi ? `<div class="muted small" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px;margin-bottom:8px">
          Ở lớp: ${UI.esc(q.oLopLamGi)}</div>` : ''}
        <button class="btn block ${q.daCongBo ? 'outline' : 'success-soft'}" data-cauchuyen="${UI.esc(q.id)}">
          ${UI.icon('send', 16)} ${q.daCongBo ? 'Sửa câu chuyện' : 'Kể cho gia đình'}
        </button>
        ${q.cuaToi || App.state.user.role === 'admin' ? `
          <button class="btn danger-soft block" style="margin-top:8px" data-ghinham="${UI.esc(q.id)}">
            ${UI.icon('x', 16)} Ghi nhầm bé
          </button>` : ''}
      </div>`;
  },

  // ---- Hộp thoại: GHI NHẦM BÉ ----
  //
  // Hai đường ra, và đường CHUYỂN đứng trước đường XOÁ.
  //
  // Cú bấm nhầm thường gặp nhất là quên đổi tên bé trong ô chọn, và lúc đó việc
  // cô muốn làm là chuyển sang đúng bé — không phải gõ lại từ đầu. Xoá chỉ dành
  // cho bản ghi đúng là rác.
  moGhiNham(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    const ds = ((this._data || {}).danhSachBe || []).filter(b => b.id !== q.studentId);
    UI.modal(`
      <p class="muted small" style="line-height:1.7">Quan sát này đang nằm trong hành trình của
        <b>${UI.esc(q.hoTen || 'bé')}</b>.</p>
      <div class="field">
        <label>Chuyển sang bé khác</label>
        <select id="ht-nham-be">
          <option value="">— Chọn bé —</option>
          ${ds.map(b => `<option value="${UI.esc(b.id)}">${UI.esc(b.hoTen)}</option>`).join('')}
        </select>
        ${q.daCongBo ? `<div class="hint">Câu chuyện này đã kể cho gia đình rồi, nên khi chuyển
          sang bé khác app sẽ <b>thu lại</b> — cô kể lại nếu vẫn muốn.</div>` : ''}
      </div>
      <button class="btn primary block" id="ht-nham-chuyen">${UI.icon('check', 18)} Chuyển sang bé đã chọn</button>
      <p class="muted small center" style="margin:14px 0 8px">hoặc, nếu bản ghi này là ghi thừa</p>
      <button class="btn danger-soft block" id="ht-nham-xoa">Xoá hẳn quan sát này</button>
    `, 'Ghi nhầm bé');

    document.getElementById('ht-nham-chuyen').onclick = async () => {
      const be = document.getElementById('ht-nham-be').value;
      if (!be) return UI.toast('Cô chọn giúp bé đúng nhé', 'error');
      try {
        await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, { studentId: be });
        UI.toast('Đã chuyển sang đúng bé', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };

    document.getElementById('ht-nham-xoa').onclick = async () => {
      if (!confirm('Xoá hẳn quan sát này? Ảnh kèm theo cũng được dọn, và không lấy lại được.')) return;
      try {
        await API.del(`/api/hanhtrinh/${encodeURIComponent(id)}`);
        UI.toast('Đã xoá quan sát', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Hộp thoại: ghi một quan sát (lớp 1) ----
  //
  // DÒNG "— Chọn bé —" TRONG Ô CHỌN LÀ MỘT QUYẾT ĐỊNH, KHÔNG PHẢI BỎ QUÊN.
  //
  // Không có nó thì bé đầu danh sách luôn được chọn sẵn, và cô bấm Lưu mà quên
  // đổi tên bé là quan sát nằm vĩnh viễn trong hành trình của bé khác — kèm ảnh
  // của bé khác. Bắt chọn tường minh tốn của cô một thao tác; ghi nhầm tốn của
  // một đứa trẻ cả một trang hồ sơ.
  //
  // Chú thích này để ở đây, KHÔNG để trong chuỗi HTML: chú thích `<!-- -->` đi
  // thẳng ra trình duyệt, nên bộ canh QUY TẮC 2 đọc nó như chữ trên màn hình —
  // và nó đọc đúng.
  //
  // Bé đặt sẵn chỉ là bé CÔ ĐÃ TỰ CHỌN ở bốn tab (`dangMo`), không bao giờ là
  // bé đầu danh sách.
  moGhi(id, tu = this.dangMo()) {
    this._anhMoi = null;
    const ds = (this._data || {}).danhSachBe || [];
    UI.modal(`
      <div class="field">
        <label>Quan sát về bé nào</label>
        <select id="ht-be">
          <option value="">— Chọn bé —</option>
          ${tu.ghiNhanhId ? '' : '<option value="__nhap__">— Chưa gắn bé · lưu nháp, gắn sau —</option>'}
          ${ds.map(b => `<option value="${UI.esc(b.id)}" ${tu.studentId === b.id ? 'selected' : ''}>${
            UI.esc(b.hoTen)}${b.ngungHoSoHocTap ? ' — gia đình đã dừng hồ sơ học tập' : ''}</option>`).join('')}
        </select>
        ${ds.some(b => b.ngungHoSoHocTap) ? `
          <div class="hint">Vài bé trong nhóm có gia đình đã dừng phần hồ sơ học tập.
          Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường —
          chỉ phần quan sát học tập là ngưng ghi mới.</div>` : ''}
      </div>
      <div class="field">
        <label>Chương trình</label>
        <select id="ht-nhom">
          <option value="">Theo vai của cô ở nhóm</option>
          ${Object.entries(this.TEN_CT).map(([ma, ten]) => `<option value="${UI.esc(ma)}" ${tu.nhom === ma ? 'selected' : ''}>${UI.esc(ten)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Cô đã thấy gì</label>
        <textarea id="ht-mota" rows="4"
          placeholder="Chỉ mô tả điều đã thấy, chưa cần nhận xét. Ví dụ: Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau.">${UI.esc(tu.moTa || '')}</textarea>
        ${this.nhacMicro()}
        <div class="hint">Đây là ghi chép riêng của cô. Gia đình <b>không</b> đọc được phần này —
          chỉ đọc câu chuyện cô chủ động kể sau. Ảnh đăng cho gia đình cần chú thích rõ
          bé đang làm gì, hoặc gia đình có thể cùng con thực hành gì ở nhà.</div>
      </div>
      <div class="field">
        <label>Ảnh (không bắt buộc)</label>
        <div class="flex">
          <div id="ht-anh-xem" style="width:64px;height:64px;flex:none;border-radius:12px;background:var(--line);
            display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden">🌱</div>
          <input type="file" id="ht-anh" accept="image/*" style="flex:1;min-width:0">
        </div>
        ${tu.coAnh ? `<div class="hint">Bản Ghi nhanh này có sẵn một tấm ảnh — cô không chọn ảnh
          mới thì app dùng luôn tấm đó.</div>` : ''}
      </div>
      <button class="btn primary block" id="ht-luu">${UI.icon('check', 18)} Lưu quan sát</button>
    `, 'Ghi một quan sát');
    this.ganChonAnh();

    // NÓI TRƯỚC KHI CÔ GÕ, KHÔNG PHẢI SAU KHI CÔ GÕ XONG.
    //
    // Máy chủ chặn đúng (Đ96), nhưng nó chỉ chặn lúc LƯU. Cô chọn bé, gõ trọn
    // một quan sát, bấm Lưu, rồi mới nhận 403 — mất cả đoạn vừa gõ và mất luôn
    // lòng tin vào màn hình. Cờ `ngungHoSoHocTap` đã đi kèm danh sách bé từ
    // Đ96; tới đợt này mới có ai đọc nó.
    const oBe = document.getElementById('ht-be');
    const nhac = () => {
      const be = ds.find(x => x.id === oBe.value);
      const cu = document.getElementById('ht-nhac-ngung');
      if (cu) cu.remove();
      if (!be || !be.ngungHoSoHocTap) return;
      oBe.closest('.field').insertAdjacentHTML('afterend', `
        <div class="card" id="ht-nhac-ngung" style="border-left:4px solid var(--warning)">
          <div class="small" style="line-height:1.7">
            Gia đình bé ${UI.esc(be.hoTen)} đã dừng phần hồ sơ học tập, nên quan sát mới
            sẽ không lưu được. Phần đã ghi vẫn giữ nguyên và cô xem lại được.
            Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.
          </div>
        </div>`);
    };
    oBe.onchange = nhac;
    nhac();

    document.getElementById('ht-luu').onclick = () => this.luuGhi(tu.ghiNhanhId || '');
  },

  async luuGhi(ghiNhanhId) {
    const body = {
      studentId: document.getElementById('ht-be').value,
      ngay: this._ngay,
      moTa: document.getElementById('ht-mota').value.trim(),
      ghiNhanhId,
    };
    // Hỏi TRONG HỘP THOẠI: màn Chủ đề tuần cũng có một ô `ht-nhom` (chọn nhóm
    // lớp) đứng trước hộp trong trang — hỏi cả trang là gửi mã nhóm lớp lên
    // làm chương trình, và máy chủ từ chối lượt ghi.
    const oNhom = document.querySelector('#modal-overlay #ht-nhom');
    if (oNhom && oNhom.value) body.nhom = oNhom.value;
    if (this._anhMoi) body.anh = this._anhMoi;
    // CHƯA GẮN BÉ: lưu thành nháp riêng của cô, gắn bé sau (góp ý 06/10, mục 7).
    if (body.studentId === '__nhap__') {
      if (!body.moTa && !body.anh) return UI.toast('Cô ghi một dòng hoặc chọn một tấm ảnh nhé', 'error');
      try {
        await API.post('/api/hanhtrinh/nhap', { moTa: body.moTa, anh: body.anh, nhom: body.nhom || '' });
        UI.toast('Đã lưu nháp — rảnh tay cô gắn bé ở mục "Nháp chưa gắn bé" (quá 30 ngày chưa gắn thì tự bỏ)', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
      return;
    }
    if (!body.studentId) return UI.toast('Cô chọn giúp quan sát này là về bé nào nhé', 'error');
    if (!body.moTa) return UI.toast('Cô mô tả giúp điều đã thấy ở bé nhé', 'error');
    try {
      await API.post('/api/hanhtrinh', body);
      UI.toast('Đã lưu quan sát', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // GẮN BÉ + CHƯƠNG TRÌNH cho một nháp (góp ý 06/10, mục 7). Nháp chưa chọn
  // chương trình thì đặt sẵn `ctMacDinh` — tab chương trình đang mở (16/10).
  moGanNhap(id, ctMacDinh) {
    const n = (this._nhap || []).find(x => x.id === id);
    if (!n) return;
    const ds = (this._data || {}).danhSachBe || [];
    UI.modal(`
      ${n.coAnh ? `<img src="/api/hanhtrinh/anh/${UI.esc(n.anh)}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:10px">` : ''}
      <div class="field"><label>Bé</label>
        <select id="ht-gan-be">
          <option value="">— Chọn bé —</option>
          ${ds.map(b => `<option value="${UI.esc(b.id)}">${UI.esc(b.hoTen)}${b.ngungHoSoHocTap ? ' — gia đình đã dừng hồ sơ học tập' : ''}</option>`).join('')}
        </select></div>
      <div class="field"><label>Chương trình</label>
        <select id="ht-gan-nhom">
          <option value="">Theo vai của cô ở nhóm</option>
          ${Object.entries(this.TEN_CT).map(([ma, ten]) => `<option value="${UI.esc(ma)}" ${(n.nhom || ctMacDinh) === ma ? 'selected' : ''}>${UI.esc(ten)}</option>`).join('')}
        </select></div>
      <div class="field"><label>Cô đã thấy gì</label>
        <textarea id="ht-gan-mota" rows="3">${UI.esc(n.moTa || '')}</textarea>
        ${this.nhacMicro()}</div>
      <button class="btn primary block" id="ht-gan-luu">${UI.icon('check', 18)} Gắn bé</button>
    `, 'Gắn bé cho bản nháp');
    document.getElementById('ht-gan-luu').onclick = async () => {
      const studentId = document.getElementById('ht-gan-be').value;
      if (!studentId) return UI.toast('Cô chọn bé giúp nhé', 'error');
      const moTa = document.getElementById('ht-gan-mota').value.trim();
      if (!moTa) return UI.toast('Cô mô tả giúp điều đã thấy ở bé nhé', 'error');
      try {
        await API.post(`/api/hanhtrinh/nhap/${encodeURIComponent(id)}/gan`, {
          studentId, nhom: document.getElementById('ht-gan-nhom').value, moTa,
        });
        UI.toast('Đã gắn bé — nháp thành một quan sát của bé', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // NÓI THAY GÕ: dùng micro của bàn phím điện thoại (góp ý 20/10, B2 — nút
  // nhận dạng giọng nói của trình duyệt nhận sai tiếng Việt quá nhiều, đã bỏ).
  nhacMicro() {
    return '<div class="hint">Có thể bấm micro trên bàn phím để nói thay gõ.</div>';
  },

  // ---- Hộp thoại: suy ngẫm (lớp 2) ----
  //
  // Từ góp ý 20/10 (B3) màn hình KHÔNG còn nút mở hộp này: nhà trường đánh giá
  // trên hành trình phát triển ba lĩnh vực. Hộp, đường PUT và nhận định đã có
  // giữ nguyên — ẩn, không xoá (Nguyên tắc số 1, điều 3). Bài canh
  // test/hanh-trinh.test.mjs [8] và test/quy-tac-2.test.mjs [3] đọc mã hộp này.
  moSuyNgam(id) {
    const q = (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    // Đo chỉ tiêu "suy ngẫm một quan sát <= 3 phút" bằng số thật.
    this._batDauSuyNgam = Date.now();
    UI.modal(`
      <div class="small" style="line-height:1.6;margin-bottom:12px">
        <b>${UI.esc(q.hoTen || '')}</b> — ${UI.esc(q.moTa || '')}
      </div>
      <div class="field">
        <label>Lĩnh vực phát triển</label>
        <select id="ht-lv">
          <option value="">— chưa gắn —</option>
          ${(this._data.linhVuc || []).map(l => `<option value="${UI.esc(l.ma)}" ${q.linhVuc === l.ma ? 'selected' : ''}>${UI.esc(l.ten)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Cô thấy bé đang ở đâu</label>
        <select id="ht-tt">
          <option value="">— chưa chọn —</option>
          ${(this._data.trangThai || []).map(t => `<option value="${UI.esc(t.ma)}" ${q.trangThai === t.ma ? 'selected' : ''}>${UI.esc(t.ten)}</option>`).join('')}
        </select>
        <div class="hint">
          <b>"Chưa quan sát thấy" không phải là bé không làm được</b> — nó chỉ nói rằng
          cô chưa có dịp thấy. Chọn nó là bình thường, và nó không đi đâu ra khỏi màn hình này.
        </div>
      </div>
      <div class="field">
        <label>Minh chứng (không bắt buộc)</label>
        <input id="ht-mc" value="${UI.esc(q.minhChung || '')}" placeholder="Ví dụ: làm được ba lần trong tuần, không cần cô nhắc">
      </div>
      <div class="field">
        <label>Ở lớp cô làm gì tiếp</label>
        <input id="ht-olop" value="${UI.esc(q.oLopLamGi || '')}"
          placeholder="Ví dụ: đặt thêm bộ rót nước ở góc thực hành cho bé thử">
        <div class="hint">Bắt buộc khi cô chọn <i>Đang hình thành</i>, <i>Đã vững</i> hoặc <i>Vượt trội</i> —
          một nhận định không kèm việc làm được thì tháng sau đọc lại không dùng được vào đâu.</div>
      </div>
      <button class="btn primary block" id="ht-luu-sn">${UI.icon('check', 18)} Lưu nhận định</button>
    `, 'Suy ngẫm');
    document.getElementById('ht-luu-sn').onclick = () => this.luuSuyNgam(id);
  },

  async luuSuyNgam(id) {
    const giay = this._batDauSuyNgam ? (Date.now() - this._batDauSuyNgam) / 1000 : null;
    try {
      await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, {
        linhVuc: document.getElementById('ht-lv').value,
        trangThai: document.getElementById('ht-tt').value,
        minhChung: document.getElementById('ht-mc').value.trim(),
        oLopLamGi: document.getElementById('ht-olop').value.trim(),
        giaySuyNgam: giay,
      });
      UI.toast('Đã lưu nhận định', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Hộp thoại: câu chuyện cho gia đình (lớp 3) ----
  //
  // `tu`: quan sát mở từ một tab chương trình của bé (không nằm trong danh
  // sách hôm nay của Suy ngẫm). Cùng một hộp, cùng một đường công bố — cô
  // chủ động bấm mới kể, không có gì tự công bố.
  async moCauChuyen(id, tu) {
    const q = tu || (this._data.quanSat || []).find(x => x.id === id);
    if (!q) return;
    // ALBUM ĐỂ LƯU ẢNH VỀ (Đ144). Chỉ hỏi khi quan sát CÓ ảnh và chưa về album
    // nào; danh sách là album của đúng nhóm bé, nhóm đang mở. Tải lỗi thì bỏ
    // qua ô này — kể chuyện vẫn phải làm được khi mạng chập chờn.
    let albums = [];
    if (q.anh && !q.daVeAlbum) {
      try {
        const be = (App.state.students || []).find(s => s.id === q.studentId) || {};
        // CHỈ MỜI ALBUM "THEO THẺ". Câu chuyện là của riêng một bé, nên album
        // cả nhóm cùng xem thì không được hiện ra để cô bấm nhầm. Máy chủ cũng
        // từ chối, nhưng mời rồi mới từ chối là làm cô mất công gõ lại.
        albums = (await API.get('/api/albums') || [])
          .filter(a => a.classId === be.classId && !a.lopDaDong && a.cheDo === 'theo-the');
      } catch (_) { albums = []; }
    }
    UI.modal(`
      <div class="small" style="line-height:1.6;margin-bottom:12px">
        <b>${UI.esc(q.hoTen || '')}</b> — ${UI.esc(q.moTa || '')}
      </div>
      <div class="field">
        <label>Câu chuyện kể cho gia đình</label>
        <textarea id="ht-cc" rows="4" placeholder="Kể lại bằng lời của cô: con đang làm gì ở lớp — và nếu có ảnh, ảnh chụp lúc nào, con làm ra sản phẩm gì.">${UI.esc(q.cauChuyen || '')}</textarea>
        ${this.nhacMicro()}
        <div class="hint">Phần này <b>chỉ công bố khi cô bấm nút</b>. Gõ dở để đó cũng không ai đọc được.
          Chú thích rõ hoạt động của con ở lớp, hoặc cách gia đình cùng con thực hành thêm ở nhà (ô dưới).</div>
      </div>
      <div class="field">
        <label>Cùng con ở nhà</label>
        <textarea id="ht-cn" rows="3" placeholder="Ví dụ: tối nay bố mẹ để con tự rót nước vào cốc — 5 phút, dùng luôn ca nước trên bàn.">${UI.esc(q.cungConONha || '')}</textarea>
        <div class="hint">5–10 phút, đồ có sẵn trong nhà, không cần màn hình.
          Đây là <b>lời rủ chơi</b> gửi gia đình, không phải việc phải nộp lại cho cô.</div>
      </div>
      ${q.daVeAlbum ? `<div class="hint mb-8">🖼️ Ảnh của quan sát này đã lưu về album <b>${UI.esc(q.daVeAlbum.title)}</b>.</div>` : ''}
      ${q.anh && !q.daVeAlbum ? (albums.length ? `
      <div class="field">
        <label>Lưu ảnh về album</label>
        <select id="ht-album">
          <option value="">Không lưu về album</option>
          ${albums.map(a => `<option value="${UI.esc(a.id)}">${UI.esc(a.title)}</option>`).join('')}
        </select>
        <div class="hint">Ảnh được chép sang album đã chọn và gắn thẻ bé, để gia đình về sau vào Album ảnh tìm lại cho tiện.
          Chỉ hiện album ở chế độ <b>theo thẻ</b> — ở đó mỗi nhà chỉ thấy ảnh có thẻ con mình.</div>
      </div>` : `
      <div class="hint mb-8">Nhóm mình chưa có album nào ở chế độ <b>theo thẻ</b>, nên chưa lưu ảnh của
        câu chuyện này về album được. Câu chuyện vẫn kể cho gia đình bình thường.
        Muốn lưu thì nhờ nhà trường tạo một album theo thẻ giúp cô nhé.</div>`) : ''}
      <div class="grid-2">
        <button class="btn outline" id="ht-luu-nhap">${q.daCongBo ? 'Lưu thay đổi' : 'Lưu nháp'}</button>
        <button class="btn success-soft" id="ht-cong-bo">${UI.icon('send', 16)} Kể cho gia đình</button>
      </div>
      ${q.daCongBo ? `<button class="btn danger-soft block mt-8" id="ht-thu-hoi">Thu hồi khỏi màn hình gia đình</button>` : ''}
    `, 'Câu chuyện cho gia đình');

    const doc = () => ({
      cauChuyen: document.getElementById('ht-cc').value.trim(),
      cungConONha: document.getElementById('ht-cn').value.trim(),
    });
    document.getElementById('ht-luu-nhap').onclick = async () => {
      try {
        await API.put(`/api/hanhtrinh/${encodeURIComponent(id)}`, doc());
        // NÓI ĐÚNG SỰ THẬT. Bản đã công bố thì chữ vừa lưu đi THẲNG lên màn
        // hình gia đình — câu "gia đình chưa đọc được" ở đó là nói sai.
        UI.toast(q.daCongBo
          ? 'Đã lưu — gia đình thấy bản mới ngay'
          : 'Đã lưu nháp — gia đình chưa đọc được', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    document.getElementById('ht-cong-bo').onclick = async () => {
      try {
        const albumId = (document.getElementById('ht-album') || {}).value || '';
        await API.post(`/api/hanhtrinh/${encodeURIComponent(id)}/cong-bo`, { ...doc(), ...(albumId ? { albumId } : {}) });
        UI.toast('Đã gửi câu chuyện tới gia đình', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    const thu = document.getElementById('ht-thu-hoi');
    if (thu) thu.onclick = async () => {
      try {
        await API.post(`/api/hanhtrinh/${encodeURIComponent(id)}/thu-hoi`, {});
        UI.toast('Đã thu hồi — chữ cô viết vẫn còn nguyên', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Tab 2: chủ đề tuần ----
  async manChuDe(than) {
    // Nhóm của cô — xem chú thích ở `App.nhomCuaCo()`.
    const nhom = App.nhomCuaCo();
    this._classId = this._classId || (nhom[0] && nhom[0].id) || '';
    if (!this._classId) {
      than.innerHTML = UI.emptyState('🌱', 'Cô chưa phụ trách nhóm nào.');
      return;
    }
    // Tuần đang soạn. Mặc định là tuần này; cô chuyển sang tuần sau được.
    this._tuan = this._tuan || this.thuHaiCua(UI.todayStr());
    const d = await API.get(`/api/hanhtrinh/chu-de?classId=${encodeURIComponent(this._classId)}`
      + `&tuan=${encodeURIComponent(this._tuan)}`);
    const c = d.chuDe || {};
    // Máy chủ đời cũ chưa trả `them` thì mọi ô về rỗng, không phải `undefined`
    // rơi thành chữ "undefined" trong ô nhập.
    const t = d.them || { baiHat: '', linkBaiHat: '', talkshow: '', linkTalkshow: '', nhacGiaDinh: '' };
    const nhac = await this.nhacThuSau();

    than.innerHTML = `
      <a class="btn sm outline mb-8" href="#/timetable/lich" style="min-height:36px">← Lịch sinh hoạt</a>
      ${nhom.length > 1 ? `
        <div class="card">
          <div class="field" style="margin:0">
            <label>Nhóm</label>
            <select id="ht-nhom">
              ${nhom.map(x => `<option value="${UI.esc(x.id)}" ${x.id === this._classId ? 'selected' : ''}>${UI.esc(x.name)}</option>`).join('')}
            </select>
          </div>
        </div>` : ''}
      ${nhac}
      <div class="card">
        <div class="card-title">Tuần từ ${UI.esc(UI.fmtDate(d.tuan, { weekday: false }))}</div>
        ${this.oChonTuan()}
        <div class="field">
          <label>Chủ đề tuần</label>
          <input id="ht-cd-ten" value="${UI.esc(c.chuDe || '')}" placeholder="Ví dụ: Nước và những thứ nổi">
        </div>
        <div class="field">
          <label>Tuần này ở lớp có gì</label>
          <textarea id="ht-cd-mota" rows="3" placeholder="Vài dòng cho gia đình biết cả tuần lớp làm gì.">${UI.esc(c.moTa || '')}</textarea>
        </div>
        <div class="field">
          <label>Cùng con ở nhà tuần này</label>
          <textarea id="ht-cd-nha" rows="3" placeholder="Ví dụ: cho con thả thìa, nắp chai, lá cây vào chậu nước xem cái nào nổi.">${UI.esc(c.cungConONha || '')}</textarea>
          <div class="hint">5–10 phút, đồ trong nhà, không màn hình — và <b>không phải là bài tập</b>.</div>
        </div>

        <div class="card-title mt-8">Kế hoạch chung tuần này</div>
        <div class="muted small" style="line-height:1.7">
          Phần này hiện ở <b>đầu màn Lịch sinh hoạt</b> cho gia đình. Ô nào để trống thì
          không hiện ô ấy — <b>không bắt buộc điền hết</b>.
        </div>
        <div class="field">
          <label>Bài hát của tuần</label>
          <input id="ht-cd-bh" value="${UI.esc(t.baiHat)}" placeholder="Ví dụ: Cả nhà thương nhau">
        </div>
        <div class="field">
          <label>Đường dẫn video bài hát</label>
          <input id="ht-cd-bhl" value="${UI.esc(t.linkBaiHat)}" placeholder="https://...">
        </div>
        <div class="field">
          <label>Casa talkshow tuần này</label>
          <input id="ht-cd-ts" value="${UI.esc(t.talkshow)}" placeholder="Ví dụ: Dạy con tự xúc ăn">
        </div>
        <div class="field">
          <label>Đường dẫn video Casa talkshow</label>
          <input id="ht-cd-tsl" value="${UI.esc(t.linkTalkshow)}" placeholder="https://...">
        </div>
        <div class="field">
          <label>Lời nhắc gia đình</label>
          <textarea id="ht-cd-nhac" rows="2" placeholder="Ví dụ: thứ Tư lớp ra sân, nhà chuẩn bị giúp cô một mũ rộng vành.">${UI.esc(t.nhacGiaDinh)}</textarea>
        </div>

        <div class="field">
          <label>Tệp kế hoạch tuần (PDF, Word hoặc ảnh chụp)</label>
          ${(d.tep || []).length ? (d.tep || []).map(x => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(x.tenGoc)}</div>
                <div class="row-sub">${UI.esc(this.coTep(x))}</div>
              </div>
              <div class="row-end">
                <button class="btn sm outline" data-xoa-tep="${UI.esc(x.id)}">Gỡ</button>
              </div>
            </div>`).join('') : '<div class="muted small">Chưa treo tệp nào.</div>'}
          ${(d.tep || []).length < (d.toiDaTep || 5)
            ? '<input type="file" id="ht-cd-tep" accept=".pdf,.docx,image/*" class="mt-8">'
            : `<div class="hint">Mỗi tuần treo tối đa ${UI.esc(String(d.toiDaTep || 5))} tệp — gỡ bớt rồi treo tiếp nhé.</div>`}
        </div>

        <div class="grid-2">
          ${d.tuanTruoc && !d.chuDe
            ? `<button class="btn outline" id="ht-cd-chep">${UI.icon('plus', 16)} Chép tuần trước</button>`
            : '<span></span>'}
          <button class="btn primary" id="ht-cd-luu">${UI.icon('check', 18)} Lưu chủ đề</button>
        </div>
      </div>`;

    const sel = document.getElementById('ht-nhom');
    if (sel) sel.onchange = (e) => { this._classId = e.target.value; App.route(); };
    document.getElementById('ht-cd-luu').onclick = () => this.luuChuDe();
    const chep = document.getElementById('ht-cd-chep');
    if (chep) chep.onclick = () => this.chepTuanTruoc();
    const oTep = document.getElementById('ht-cd-tep');
    if (oTep) oTep.onchange = () => this.treoTep(oTep);
    for (const nut of than.querySelectorAll('[data-xoa-tep]')) {
      nut.onclick = () => this.goTep(nut.dataset.xoaTep);
    }
    for (const nut of than.querySelectorAll('[data-tuan]')) {
      nut.onclick = () => this.chonTuan(nut.getAttribute('data-tuan'));
    }
  },

  // ---- Tuần nào đang soạn ----
  //
  // VÌ SAO PHẢI CHỌN ĐƯỢC TUẦN
  //
  // Nếp của trường: thứ Sáu gửi thực đơn VÀ chủ đề học tập của tuần tới cho
  // gia đình. Nhưng màn này trước đây luôn soạn cho TUẦN ĐANG CHẠY — nghĩa là
  // thứ Sáu, đúng hôm phải soạn tuần sau, lại là hôm duy nhất không soạn được.
  // Cô chỉ còn cách chờ tới thứ Hai, mà thứ Hai thì gia đình đã cần biết rồi.
  //
  // Máy chủ vẫn nhận `tuan` từ đầu; chỗ thiếu nằm ở màn hình.
  thuHaiCua(ngayChuoi) {
    const d = UI.parseDate(ngayChuoi);
    if (!d) return '';
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // T2 = 0 … CN = 6
    return this.chuoiNgay(d);
  },

  themNgay(ngayChuoi, soNgay) {
    const d = UI.parseDate(ngayChuoi);
    if (!d) return '';
    d.setDate(d.getDate() + soNgay);
    return this.chuoiNgay(d);
  },

  chuoiNgay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      + `-${String(d.getDate()).padStart(2, '0')}`;
  },

  oChonTuan() {
    const nay = this.thuHaiCua(UI.todayStr());
    const sau = this.themNgay(nay, 7);
    const nut = (tuan, nhan) => `
      <button class="btn ${this._tuan === tuan ? 'primary' : 'outline'}" data-tuan="${UI.esc(tuan)}">
        ${UI.esc(nhan)}
      </button>`;
    return `<div class="grid-2" style="margin-bottom:12px">${nut(nay, 'Tuần này')}${nut(sau, 'Tuần sau')}</div>`;
  },

  chonTuan(tuan) {
    if (!tuan || tuan === this._tuan) return;
    this._tuan = tuan;
    App.route();
  },

  // NHẮC VÀO THỨ SÁU — nhắc, không chặn.
  //
  // Cùng cách làm với lời nhắc thực đơn ở màn Thực đơn: chặn không cho làm
  // việc khác cho tới khi soạn xong là biến một nếp tốt thành cái cửa khoá,
  // và thứ Sáu là hôm bận nhất.
  //
  // Chỉ hỏi máy chủ vào đúng thứ Sáu: ngày thường thì không tốn thêm lần gọi
  // nào, và cũng không có gì để nhắc.
  async nhacThuSau() {
    const homNay = UI.todayStr();
    const t = UI.parseDate(homNay);
    if (!t || t.getDay() !== 5) return '';
    const tuanSau = this.themNgay(this.thuHaiCua(homNay), 7);
    if (this._tuan === tuanSau) return '';
    const d = await API.get(`/api/hanhtrinh/chu-de?classId=${encodeURIComponent(this._classId)}`
      + `&tuan=${encodeURIComponent(tuanSau)}`).catch(() => null);
    if (!d || d.chuDe) return '';
    return `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="small" style="line-height:1.7">
          Hôm nay thứ Sáu, và <b>tuần sau chưa có chủ đề</b>. Nhà trường hẹn gửi
          chủ đề tuần tới cho gia đình vào hôm nay, cùng lúc với thực đơn.
        </div>
        <button class="btn outline block mt-8" data-tuan="${UI.esc(tuanSau)}">
          ${UI.icon('edit', 16)} Soạn chủ đề tuần sau
        </button>
      </div>`;
  },

  // Nhãn ngắn cho một tệp: loại và cỡ. Cỡ tệp là thứ cô cần biết trước khi
  // bảo gia đình mở bằng 3G.
  coTep(x) {
    const ten = x.loai === 'pdf' ? 'PDF' : x.loai === 'docx' ? 'Word' : 'Ảnh';
    const kb = Math.max(1, Math.round(Number(x.bytes || 0) / 1024));
    return kb >= 1024 ? `${ten} · ${(kb / 1024).toFixed(1)} MB` : `${ten} · ${kb} KB`;
  },

  async treoTep(o) {
    const f = o.files && o.files[0];
    if (!f) return;
    o.disabled = true;
    try {
      const dataUrl = await new Promise((ok, hong) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = () => hong(new Error('Không đọc được tệp này'));
        r.readAsDataURL(f);
      });
      await API.post('/api/hanhtrinh/chu-de/tep', {
        classId: this._classId, tuan: this._tuan, ten: f.name, dataUrl,
      });
      UI.toast('Đã treo tệp cho tuần này', 'success');
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      o.disabled = false;
      o.value = '';
    }
  },

  async goTep(id) {
    if (!confirm('Gỡ tệp này khỏi tuần?')) return;
    try {
      await API.del(`/api/hanhtrinh/chu-de/tep/${encodeURIComponent(id)}`);
      UI.toast('Đã gỡ tệp', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async luuChuDe() {
    const oV = (id) => (document.getElementById(id) || {}).value || '';
    try {
      await API.put('/api/hanhtrinh/chu-de', {
        classId: this._classId,
        tuan: this._tuan,
        chuDe: document.getElementById('ht-cd-ten').value.trim(),
        moTa: document.getElementById('ht-cd-mota').value.trim(),
        cungConONha: document.getElementById('ht-cd-nha').value.trim(),
        baiHat: oV('ht-cd-bh').trim(),
        linkBaiHat: oV('ht-cd-bhl').trim(),
        talkshow: oV('ht-cd-ts').trim(),
        linkTalkshow: oV('ht-cd-tsl').trim(),
        nhacGiaDinh: oV('ht-cd-nhac').trim(),
      });
      UI.toast('Đã lưu chủ đề tuần', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async chepTuanTruoc() {
    try {
      const r = await API.post('/api/hanhtrinh/chu-de/chep-tuan-truoc',
        { classId: this._classId, tuan: this._tuan });
      UI.toast(`Đã chép chủ đề tuần ${UI.fmtDate(r.chepTu, { weekday: false })}`, 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---- Bốn tab của bé (góp ý 16/10, mục 6) ----
  //
  // Đầu màn: chọn nhóm (cô nhiều nhóm / văn phòng) rồi chọn bé. Tab Kế hoạch
  // cần một bé; tab chương trình thì chưa chọn bé vẫn có việc — khối nháp
  // chưa gắn bé của chính cô thuộc chương trình ấy (hoặc chưa chọn chương
  // trình), gắn bé ngay tại chỗ.
  async manBonTab(than, vungChon) {
    const d = await API.get(`/api/hanhtrinh/hom-nay?ngay=${encodeURIComponent(this._ngay)}`);
    this._data = d;
    const tatCa = d.danhSachBe || [];
    // Chỉ những nhóm của cô (văn phòng: nhóm mình xem được) đang có bé —
    // không mời cô bấm sang nhóm máy chủ sẽ từ chối.
    const nhom = App.nhomCuaCo().filter(c => tatCa.some(b => b.classId === c.id));
    if (!nhom.some(c => c.id === this._classId)) this._classId = (nhom[0] && nhom[0].id) || '';
    const dsBe = nhom.length > 1 ? tatCa.filter(b => b.classId === this._classId) : tatCa;
    if (!dsBe.some(b => b.id === this._beDangXem)) this._beDangXem = '';
    this.veChonBe(vungChon, nhom, dsBe);

    const dBe = this._beDangXem
      ? await API.get(`/api/hanhtrinh?studentId=${encodeURIComponent(this._beDangXem)}`) : null;
    // Phần nào cô ghi được ở nhóm của bé — máy chủ khai, màn chỉ phản ánh;
    // chốt chặn vẫn là đường ghi của máy chủ.
    this._duocGhi = (dBe && dBe.nhomDuocGhi) || null;
    const ct = this._tab;
    if (ct === 'kehoach') {
      if (!dBe) {
        than.innerHTML = `<div id="ht-be-than">${UI.emptyState('🧭',
          'Cô chọn một bé ở ô trên để xem kế hoạch tháng của bé và nhìn lại cuối tháng.')}</div>`;
        return;
      }
      than.innerHTML = '<div id="ht-be-than"><div class="loading">Đang tải</div></div>';
      return this.veKeHoachCo(document.getElementById('ht-be-than'), dBe.be);
    }

    const nhap = await API.get('/api/hanhtrinh/nhap').catch(() => ({ nhap: [] }));
    this._nhap = (nhap.nhap || []).filter(n => !n.nhom || n.nhom === ct);
    const ten = this.TEN_CT[ct];
    const ds = dBe ? (dBe.quanSat || []).filter(q => q.nhomCo === ct).map(q => ({ ...q, hoTen: dBe.be.hoTen })) : [];
    // Kể cho gia đình: chỉ trên quan sát của chính cô (văn phòng: mọi quan
    // sát) — đúng luật của đường công bố.
    const nutKe = (q) => (q.cuaToi || App.state.user.role === 'admin' ? `
      <button class="btn ${q.daCongBo ? 'outline' : 'success-soft'} block mt-8" data-cauchuyen="${UI.esc(q.id)}">
        ${UI.icon('send', 16)} ${q.daCongBo ? 'Sửa câu chuyện' : 'Kể cho gia đình'}
      </button>` : '');

    // CÂU KHI TAB RỖNG PHẢI KHÁC CÂU KHI BÉ CHƯA CÓ QUAN SÁT NÀO.
    //
    // QUY TẮC 2: "chưa quan sát thấy" không bao giờ được trình bày như một
    // thất bại hay một khoảng trống cần lấp. Tab Cambridge trống nghĩa là
    // chương trình ấy chưa tới lượt ghi, không phải bé thiếu gì cả.
    const trong = dBe && !(dBe.quanSat || []).length
      ? UI.emptyState('🌱',
        'Chưa có quan sát nào về bé, và không sao cả — hành trình của mỗi bé bắt đầu từ dòng đầu tiên cô ghi.')
      : UI.emptyState('🌱', `Phần ${ten} của bé chưa có dòng nào. Các phần khác vẫn ở dải trên.`);

    than.innerHTML = `
      <div id="ht-be-than">
        ${dBe ? `
          ${this._duocGhi && !this._duocGhi.includes(ct) ? `
            <div class="card"><div class="muted small" style="line-height:1.6">
              Phần ${UI.esc(ten)} ở nhóm của bé do cô khác phụ trách ghi. Cô vẫn đọc được những gì
              đã ghi ở đây; quan sát của cô vào phần cô phụ trách.</div></div>` : ''}
          ${ds.length ? ds.map(q => this.theDong(q, dBe, nutKe(q))).join('') : trong}`
        : `
          <div class="card"><div class="muted small" style="line-height:1.6">
            Cô chọn một bé ở ô trên để xem nhận xét, ảnh và câu chuyện của bé ở phần ${UI.esc(ten)}.
            Nút <b>Ghi nhanh</b> dùng được ngay — chưa chọn bé thì lưu nháp, gắn bé sau.</div></div>`}
        ${this.khoiNhap(this._nhap)}
      </div>`;
    const vung = document.getElementById('ht-be-than');
    this.ganNutNhap(vung, ct);
    for (const el of vung.querySelectorAll('[data-cauchuyen]')) {
      el.onclick = () => this.moCauChuyen(el.dataset.cauchuyen, ds.find(q => q.id === el.dataset.cauchuyen));
    }
  },

  // Ô chọn nhóm + ô chọn bé (tìm theo tên, gõ không dấu cũng ra).
  veChonBe(vung, nhom, dsBe) {
    vung.innerHTML = `
      <div class="card">
        ${nhom.length > 1 ? `
          <div class="field">
            <label>Nhóm</label>
            <select id="ht-chon-nhom">
              ${nhom.map(c => `<option value="${UI.esc(c.id)}" ${c.id === this._classId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
            </select>
          </div>` : ''}
        <div class="field" style="margin:0">
          <label>Bé</label>
          ${dsBe.length ? `
            <input id="ht-tim-be" type="search" autocomplete="off" placeholder="Gõ tên để tìm bé…" aria-label="Tìm bé theo tên">
            <select id="ht-chon-be" class="mt-8"></select>` : '<div class="muted small">Nhóm chưa có bé nào.</div>'}
        </div>
      </div>`;
    const oNhom = document.getElementById('ht-chon-nhom');
    if (oNhom) oNhom.onchange = () => { this._classId = oNhom.value; this._beDangXem = ''; App.route(); };
    const oBe = document.getElementById('ht-chon-be');
    if (!oBe) return;
    const oTim = document.getElementById('ht-tim-be');
    const boDau = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
    // Bé đang chọn luôn ở lại trong ô, để ô chọn không nói khác phần bên dưới.
    const ve = () => {
      const tim = boDau(oTim.value);
      const trung = dsBe.filter(b => !tim || boDau(b.hoTen).includes(tim) || b.id === this._beDangXem);
      oBe.innerHTML = `<option value="">— Chọn bé —</option>${trung.map(b => `
        <option value="${UI.esc(b.id)}" ${b.id === this._beDangXem ? 'selected' : ''}>${UI.esc(b.hoTen)}</option>`).join('')}`;
    };
    ve();
    oTim.oninput = ve;
    oBe.onchange = () => { this._beDangXem = oBe.value; App.route(); };
  },

  // Nút Ghi nhanh biết cô đang đứng ở đâu (góp ý 16/10, mục 6). Ở bốn tab: bé
  // đặt sẵn là bé cô đang chọn; ở tab chương trình: ô Chương trình đặt sẵn
  // chương trình ấy — trừ khi phần ấy ở nhóm của bé do cô khác ghi (đặt sẵn
  // một lựa chọn chắc chắn bị từ chối là bắt cô gõ xong mới biết). Ở hai lối
  // phụ thì như cũ.
  dangMo() {
    if (this.laTab(this.LOI_PHU, this._tab)) return {};
    const ct = this.TEN_CT[this._tab] && (!this._duocGhi || this._duocGhi.includes(this._tab)) ? this._tab : '';
    return { studentId: this._beDangXem, nhom: ct };
  },

  // ---- Tab "Kế hoạch của bé" của CÔ (góp ý 06/10, mục 7) ----
  //
  // Đọc từ phân hệ Kế hoạch (đường cả nhóm của nó — không mở thêm cửa API
  // riêng cho một bé). Phân hệ ấy tắt thì nói nhẹ nhàng, không làm hỏng màn.
  async veKeHoachCo(vung, be) {
    if (!vung || !be) return;
    this._thangKH = this._thangKH || UI.todayStr().slice(0, 7);
    let d;
    try {
      d = await API.get(`/api/kehoachbe?classId=${encodeURIComponent(be.classId || '')}&thang=${encodeURIComponent(this._thangKH)}`);
    } catch (_) {
      vung.innerHTML = UI.emptyState('🧭', 'Phần Kế hoạch của bé đang tắt hoặc chưa mở được — các tab chương trình bên cạnh vẫn xem bình thường.');
      return;
    }
    const x = (d.danhSach || []).find(y => y.studentId === be.id) || {};
    const k = x.ke;
    const sua = d.ctDuocSua || [];
    const tenGoc = (ma) => ((d.gocLinhVuc || []).find(g => g.ma === ma) || {}).ten || ma;
    const tenNhan = (ma) => ((d.nhanBai || []).find(t => t.ma === ma) || {}).ten || '';
    const chu = (ma) => { const t = (d.mucDo || []).find(y => y.ma === ma); return t ? `${t.chuCai} · ${t.ten}` : ''; };
    const MAU = { 'chua-day': 'gray', 'chua-quan-sat-thay': 'gray', 'dang-hinh-thanh': 'blue', 'da-vung': 'green', 'vuot-troi': 'green' };

    // Thẻ ba phần theo đúng thứ tự bốn tab của trường, không theo thứ tự máy chủ gửi.
    const thuTu = Object.keys(this.TEN_CT);
    const phan = [...(d.chuongTrinhTab || [])].sort((a, b) => thuTu.indexOf(a.ma) - thuTu.indexOf(b.ma)).map(t => {
      const goc = (t.goc || []).map(g => g.ma);
      const bai = k ? (k.baiHoc || []).filter(b => goc.includes(b.gocLinhVuc)) : [];
      const p = k && k.chuongTrinh ? k.chuongTrinh[t.ma] : null;
      const tt = p && (p.coNoiDung || p.trangThai !== 'nhap') ? (this.MAU_DUYET_KH[p.trangThai] || ['', 'gray']) : null;
      const duocNhin = sua.includes(t.ma) && bai.length;
      return `
        <div class="card">
          <div class="card-title">${UI.esc(this.TEN_CT[t.ma] || t.chuongTrinh)}
            <span class="spacer"></span>${tt ? UI.badge(tt[0], tt[1]) : ''}</div>
          ${bai.length ? bai.map(b => `
            <div class="list-row" style="flex-wrap:wrap;gap:6px">
              <div class="row-main" style="min-width:150px">
                <div class="row-title">${UI.esc(b.ten)}</div>
                <div class="row-sub">${UI.esc(tenGoc(b.gocLinhVuc))} · ${UI.esc(tenNhan(b.nhan))}</div>
              </div>
              ${duocNhin ? `
                <div class="grid-2" style="width:100%">
                  <div class="field" style="margin:0"><label>Mức độ</label>
                    <select class="ht-kh-md" data-bai-id="${UI.esc(b.id)}" data-ct="${UI.esc(t.ma)}">
                      <option value="">— chưa chọn —</option>
                      ${(d.mucDo || []).map(m => `<option value="${UI.esc(m.ma)}" ${b.mucDo === m.ma ? 'selected' : ''}>${UI.esc(`${m.chuCai} · ${m.ten}`)}</option>`).join('')}
                    </select></div>
                  <div class="field" style="margin:0"><label>Tiếp tục ở tháng sau</label>
                    <select class="ht-kh-tt" data-bai-id="${UI.esc(b.id)}" data-ct="${UI.esc(t.ma)}">
                      <option value="">— không —</option>
                      ${(d.tiepTuc || []).map(m => `<option value="${UI.esc(m.ma)}" ${b.tiepTuc === m.ma ? 'selected' : ''}>${UI.esc(m.ten)}</option>`).join('')}
                    </select></div>
                </div>`
                : (b.mucDo ? UI.badge(chu(b.mucDo), MAU[b.mucDo] || 'gray') : '')}
            </div>`).join('')
            : '<div class="muted small">Tháng này chưa có bài nào ở phần này.</div>'}
          ${duocNhin ? `<button class="btn primary block mt-8" data-ht-kh-luu="${UI.esc(t.ma)}">${UI.icon('check', 16)} Lưu phần nhìn lại</button>` : ''}
        </div>`;
    }).join('');

    vung.innerHTML = `
      <div class="card">
        <div class="field" style="margin:0"><label>Tháng</label>
          <input type="month" id="ht-kh-thang" value="${UI.esc(this._thangKH)}"></div>
        <div class="muted small mt-8" style="line-height:1.6">
          Cuối tháng cô nhìn lại từng bài bằng <b>chữ quy ước</b>
          (${(d.mucDo || []).map(m => `${UI.esc(m.chuCai)} = ${UI.esc(m.ten.toLowerCase())}`).join(', ')}).
          "Chưa quan sát thấy" là cô chưa có dịp thấy, <b>không phải bé không làm được</b>.
          Bài ở mức S hoặc M được tính là "Đã thấy con làm được" và tự điền vào bản nháp
          Báo cáo tháng ở ô còn trống — cô vẫn đọc lại trước khi gửi. Gia đình chỉ thấy tên bài, không thấy mức độ.
        </div>
        ${k ? '' : '<div class="muted small mt-8">Tháng này bé chưa có kế hoạch — cô lập ở mục Kế hoạch của bé.</div>'}
      </div>
      ${k ? phan : ''}`;

    const oThang = document.getElementById('ht-kh-thang');
    if (oThang) oThang.onchange = () => { this._thangKH = oThang.value; this.veKeHoachCo(vung, be); };
    for (const nut of vung.querySelectorAll('[data-ht-kh-luu]')) {
      nut.onclick = async () => {
        const ct = nut.dataset.htKhLuu;
        const baiHoc = [...vung.querySelectorAll(`.ht-kh-md[data-ct="${ct}"]`)].map(o => {
          const tt = vung.querySelector(`.ht-kh-tt[data-bai-id="${o.dataset.baiId}"]`);
          return { id: o.dataset.baiId, mucDo: o.value, tiepTuc: tt ? tt.value : '' };
        });
        try {
          await API.put('/api/kehoachbe/nhin-lai', { id: k.id, baiHoc });
          UI.toast('Đã lưu phần nhìn lại cuối tháng', 'success');
          this.veKeHoachCo(vung, be);
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },

  // `nut`: nút thao tác của cô dưới thẻ (vd "Kể cho gia đình" ở tab chương trình).
  theDong(q, d, nut = '') {
    const tt = q.trangThai
      ? UI.badge(this.ten(d.trangThai, q.trangThai), this.MAU_TRANG_THAI[q.trangThai] || 'gray') : '';
    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(q.ngay))}
          <span class="spacer"></span>${tt}
          ${q.tenNhomCo ? UI.badge(q.tenNhomCo, 'blue') : ''}
          ${q.daCongBo ? UI.badge('Đã kể cho gia đình', 'green') : ''}
        </div>
        ${q.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(q.moTa)}</div>` : ''}
        ${q.anh ? `<img src="/api/hanhtrinh/anh/${UI.esc(q.anh)}" alt="" loading="lazy"
          style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-top:8px">` : ''}
        ${q.linhVuc ? `<div class="muted small mt-8">${UI.esc(this.ten(d.linhVuc, q.linhVuc))}</div>` : ''}
        ${q.oLopLamGi ? `<div class="muted small" style="line-height:1.6">Ở lớp: ${UI.esc(q.oLopLamGi)}</div>` : ''}
        ${q.cauChuyen ? `<div class="mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(q.cauChuyen)}</div>` : ''}
        ${nut}
      </div>`;
  },

  // ================= Màn của GIA ĐÌNH =================
  async manGiaDinh(root) {
    const be = App.currentStudent();
    if (!be) {
      root.innerHTML = UI.pageHeader('Hành trình học tập') + UI.emptyState('🌱', 'Chưa chọn bé.');
      return;
    }
    const d = await API.get(`/api/hanhtrinh?studentId=${encodeURIComponent(be.id)}`);
    const cd = d.chuDeTuan;
    // Tuần sau chỉ hiện khi cô đã soạn và khi nó KHÁC tuần này — không thì
    // gia đình đọc hai thẻ giống hệt nhau và không hiểu để làm gì.
    const cds = d.chuDeTuanSau && (!cd || d.chuDeTuanSau.id !== cd.id) ? d.chuDeTuanSau : null;

    root.innerHTML = `
      ${UI.pageHeader('Hành trình học tập')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}

      ${cd ? `
        <div class="card">
          <div class="card-title">Tuần này ở lớp: ${UI.esc(cd.chuDe)}</div>
          ${cd.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(cd.moTa)}</div>` : ''}
          ${cd.cungConONha ? `
            <div class="section-label">Cùng con ở nhà</div>
            <div class="small" style="line-height:1.6">${UI.esc(cd.cungConONha)}</div>
            <div class="muted small mt-8">Một lời rủ chơi 5–10 phút, đồ có sẵn trong nhà — không phải việc phải nộp lại cho cô.</div>` : ''}
        </div>` : ''}

      ${cds ? `
        <div class="card">
          <div class="card-title">Tuần sau ở lớp: ${UI.esc(cds.chuDe)}</div>
          ${cds.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(cds.moTa)}</div>` : ''}
          ${cds.cungConONha ? `
            <div class="section-label">Cùng con ở nhà</div>
            <div class="small" style="line-height:1.6">${UI.esc(cds.cungConONha)}</div>` : ''}
          <div class="muted small mt-8">Cô đã soạn sẵn cho tuần tới. Cuối tuần này nhà chơi trước cũng được.</div>
        </div>` : ''}

      ${this.veTabGiaDinh(d)}`;
    for (const b of root.querySelectorAll('#ht-ph-tabs [data-tab]')) {
      b.onclick = () => { this._tabGd = b.dataset.tab; this.manGiaDinh(root); };
    }
  },

  // Bốn tab của gia đình (góp ý 06/10, mục 7), cùng thứ tự và chữ với màn
  // của cô (16/10, mục 6). Máy chủ đời cũ chưa gửi `nhomCoTab` thì về đúng
  // một danh sách như trước.
  veTabGiaDinh(d) {
    const tab = d.nhomCoTab || [];
    if (!tab.length) return this.veBaiThangNay(d) + this.veCauChuyen(d.quanSat || []);
    if (this._tabGd !== 'kehoach' && !tab.some(t => t.ma === this._tabGd)) this._tabGd = 'kehoach';
    const loc = (d.quanSat || []).filter(q => q.nhomCo === this._tabGd);
    return `
      <div class="seg" id="ht-ph-tabs" style="flex-wrap:wrap">
        ${this.BON_TAB.filter(([ma]) => ma === 'kehoach' || tab.some(t => t.ma === ma)).map(([ma, ten]) => `
          <button class="${this._tabGd === ma ? 'active' : ''}" data-tab="${UI.esc(ma)}">${UI.esc(ten)}</button>`).join('')}
      </div>
      ${this._tabGd === 'kehoach'
        ? (this.veBaiThangNay(d) || UI.emptyState('🧭', 'Kế hoạch tháng này của con sẽ hiện ở đây khi nhà trường đã duyệt.'))
        : this.veCauChuyen(loc, this.TEN_CT[this._tabGd])}`;
  },

  // Bài tháng này, chia theo chương trình. CHỈ TÊN BÀI VÀ NHÃN — không có mức
  // độ cuối tháng (bài canh Đ191).
  veBaiThangNay(d) {
    const ds = d.baiThangNay || [];
    if (!ds.length) return '';
    const goc = d.gocKeHoach || [];
    const ctCua = (ma) => (goc.find(g => g.ma === ma) || {}).chuongTrinh || 'chu-nhiem';
    const tenGoc = (ma) => (goc.find(g => g.ma === ma) || {}).ten || this.tenGoc(d, ma);
    const nhom = Object.keys(this.TEN_CT)
      .map(ct => [ct, ds.filter(b => ctCua(b.gocLinhVuc) === ct)]).filter(([, x]) => x.length);
    return `
      <div class="section-label">Tháng này con được học</div>
      <div class="card">
        <div class="muted small mb-8" style="line-height:1.6">
          Những bài cô đã đưa vào kế hoạch tháng này cho con. Đây là
          <b>việc cô làm cùng con ở lớp</b>, không phải bài tập giao về nhà.
        </div>
        ${nhom.map(([ct, bai]) => `
          <div class="small" style="font-weight:700;margin-top:8px">${UI.esc(this.TEN_CT[ct] || '')}</div>
          ${bai.map(b => `
            <div class="list-row" style="padding:6px 4px">
              <div class="row-main">
                <div class="row-title">${UI.esc(b.ten)}</div>
                <div class="row-sub">${UI.esc(tenGoc(b.gocLinhVuc))}</div>
              </div>
              ${b.nhan && b.nhan !== 'hoc-moi'
    ? UI.badge(b.nhan === 'on-tap' ? 'Ôn lại' : 'Mở rộng', 'gray') : ''}
            </div>`).join('')}`).join('')}
      </div>`;
  },

  veCauChuyen(ds, tenCt) {
    return `
      <div class="section-label">Câu chuyện của con${tenCt ? ` · ${UI.esc(tenCt)}` : ''}</div>
      ${ds.length
        ? ds.map(q => this.theCauChuyen(q)).join('')
        : UI.emptyState('🌱', tenCt
          ? `Phần ${tenCt} chưa có câu chuyện nào — cô kể khi có khoảnh khắc đáng nhớ.`
          : 'Chưa có câu chuyện nào — cô kể khi có khoảnh khắc đáng nhớ, thường vài tuần một lần chứ không phải mỗi ngày.')}`;
  },

  // Ô GHI NHANH Ở GÓC DƯỚI MÀN HÌNH (Đ191, Câu 1).
  //
  // Nhà trường: *"Mong muốn khi vào mục 'hành trình của bé' sẽ hiện thêm phần
  // ghi nhanh quan sát ở dưới góc dưới màn hình và có thể tag tên học sinh"*.
  //
  // CHỈ HIỆN VỚI CÔ. Đây là ô để cô ghi, không phải ô của gia đình — và bản ghi
  // nó tạo ra là ghi chép thô của cô, dữ liệu LỚP 1, thứ không bao giờ lộ sang
  // phụ huynh.
  //
  // PHẦN "TAG TÊN BÉ" CHÍNH LÀ Ô CHỌN BÉ CỦA BIỂU MẪU GHI QUAN SÁT đang có —
  // nút này mở thẳng biểu mẫu ấy. Dựng một đường ghi thứ hai đi tắt qua nó là
  // có hai chỗ phải nhớ gác cùng một luật, rồi hai chỗ sẽ trôi khỏi nhau.
  nutGhiNhanh() {
    if (this.laGiaDinh()) return '';
    return `
      <button class="btn primary" id="ht-ghi-nhanh"
              style="position:fixed;right:16px;z-index:40;border-radius:999px;
                     box-shadow:0 6px 20px rgba(0,0,0,.18);padding:12px 18px;
                     bottom:calc(76px + env(safe-area-inset-bottom, 0px))">
        ${UI.icon('plus', 18)} Ghi nhanh
      </button>`;
  },

  ganNutGhiNhanh() {
    const n = document.getElementById('ht-ghi-nhanh');
    if (n) n.onclick = () => this.moGhi(null);
  },

  // Tên góc lĩnh vực đọc từ chính gói máy chủ gửi, không chép lại bảng: chép
  // là hai chỗ sẽ trôi khỏi nhau đúng lúc nhà trường đổi chữ.
  tenGoc(d, ma) {
    return ((d.linhVuc || []).find(l => l.ma === ma) || {}).ten || ma || '';
  },

  theCauChuyen(q) {
    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(q.ngay))}</div>
        <div style="line-height:1.7">${UI.esc(q.cauChuyen || '')}</div>
        ${q.cungConONha ? `
          <div class="section-label">Cùng con ở nhà</div>
          <div class="small" style="line-height:1.6">${UI.esc(q.cungConONha)}</div>` : ''}
      </div>`;
  },

  // ---- Ảnh ----
  ganChonAnh() {
    const o = document.getElementById('ht-anh');
    if (!o) return;
    o.onchange = async () => {
      const f = o.files && o.files[0];
      if (!f) return;
      try {
        this._anhMoi = await UI.nenAnh(f);
        document.getElementById('ht-anh-xem').innerHTML =
          `<img src="${this._anhMoi}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      } catch (err) {
        this._anhMoi = null;
        UI.toast(err.message || 'Không đọc được ảnh', 'error');
      }
    };
  },
};
