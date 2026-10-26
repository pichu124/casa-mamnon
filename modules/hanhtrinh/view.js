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
// hai, sau "Hành trình từng bé"). Tab đi theo đường dẫn `#/hanhtrinh/<mã>`.
//
// Đ242B (góp ý 20/10, B1/B7): lối phụ duy nhất dưới tiêu đề là "Hình ảnh ghi
// nhanh" — thay chỗ "Suy ngẫm cuối ngày" (địa chỉ cũ `#/hanhtrinh/suyngam` vẫn
// mở, về màn mới). Nút "Chủ đề tuần" bỏ vì lối vào soạn nay ở Lịch sinh hoạt;
// địa chỉ `#/hanhtrinh/chude` vẫn mở màn soạn.
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
  LOI_PHU: [['ghinhanh', 'Hình ảnh ghi nhanh']],
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
  _videoMoi: null,
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
    let ma = (params && params[0]) || '';
    if (this.laGiaDinh()) {
      // Tin báo câu chuyện mở `#/hanhtrinh/<mã bé>` — không phải mã tab thì giữ tab đang xem.
      if (this.laTab(this.BON_TAB, ma)) this._tabGd = ma;
      return this.manGiaDinh(root);
    }
    // ĐƯỜNG DẪN QUYẾT ĐỊNH TAB: `#/hanhtrinh` là tab Kế hoạch của bé — không
    // còn rơi vào Suy ngẫm như trước góp ý 16/10. Hai địa chỉ không còn nút
    // vẫn mở: `suyngam` (trước Đ242B) về Hình ảnh ghi nhanh, `chude` mở màn
    // soạn chủ đề tuần mà Lịch sinh hoạt dẫn tới.
    if (ma === 'suyngam') ma = 'ghinhanh';
    this._tab = this.laTab(this.BON_TAB, ma) || this.laTab(this.LOI_PHU, ma) || ma === 'chude' ? ma : 'kehoach';
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
    if (this._tab === 'ghinhanh') return sau(this.manGhiNhanh(than));
    return sau(this.manBonTab(than, document.getElementById('ht-chon')));
  },

  // ---- Lối phụ: HÌNH ẢNH GHI NHANH (Đ242B — góp ý 20/10, B1/B7) ----
  //
  // Thay chỗ "Suy ngẫm cuối ngày". Mọi thứ cô đã ghi mà CHƯA kể cho gia đình
  // — nháp chưa gắn bé, quan sát chưa kể, Ghi nhanh chưa chép sang — trong
  // một danh sách, mới nhất trước, không lọc ngày: lọc theo ngày là để mục
  // chưa kể lặng lẽ trôi mất. Kể xong thì mục rời đây; thu hồi thì quay lại.
  // Máy chủ chỉ trả mục của chính người đang đăng nhập (cả ba nguồn là lớp 1).
  //
  // `/hom-nay` vẫn đọc ở đây cho danh sách bé (kèm cờ dừng hồ sơ học tập) mà
  // hộp Ghi nhanh và hộp hoàn thiện cần.
  async manGhiNhanh(than) {
    const [d, ck, nhac] = await Promise.all([
      API.get(`/api/hanhtrinh/hom-nay?ngay=${encodeURIComponent(this._ngay)}`),
      API.get('/api/hanhtrinh/cho-ke'),
      API.get('/api/hanhtrinh/nhac-nhe').catch(() => ({ be: [] })),
    ]);
    this._data = d;
    this._choKe = ck;
    const ds = ck.muc || [];

    than.innerHTML = `
      <div class="card">
        <div class="muted small" style="line-height:1.6">
          Ảnh, video và những dòng cô ghi nhanh mà <b>chưa kể cho gia đình</b> nằm ở đây,
          mới nhất trước — chỉ cô thấy. Rảnh tay thì cô bấm <b>Hoàn thiện &amp; kể</b>:
          thêm chú thích, chọn bé và chương trình, rồi kể. Kể xong mục rời khỏi đây.
          ${ds.some(m => m.nguon === 'nhap') ? 'Nháp chưa gắn bé quá <b>30 ngày</b> sẽ tự bỏ, kể cả ảnh.' : ''}
        </div>
      </div>

      <button class="btn primary block" id="ht-them">${UI.icon('plus', 18)} Ghi nhanh ảnh, video hoặc một dòng</button>

      <div id="ht-gn-ds">
        ${ds.length
          ? ds.map(m => this.theChoKe(m)).join('')
          : UI.emptyState('📷', 'Chưa có ảnh hay ghi chép nào chờ kể, và không sao cả. Thấy khoảnh khắc nào đáng nhớ thì cô bấm Ghi nhanh.')}
      </div>

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

    document.getElementById('ht-them').onclick = () => this.moGhi(null);
    const tim = (ma) => ds.find(m => `${m.nguon}:${m.id}` === ma);
    for (const el of than.querySelectorAll('[data-hoan-thien]')) {
      el.onclick = () => this.moCauChuyen(null, tim(el.dataset.hoanThien));
    }
    for (const el of than.querySelectorAll('[data-bo]')) {
      el.onclick = () => this.boMucChoKe(tim(el.dataset.bo));
    }
    for (const el of than.querySelectorAll('[data-ghinham]')) {
      el.onclick = () => this.moGhiNham(el.dataset.ghinham, tim(`quansat:${el.dataset.ghinham}`));
    }
  },

  // Thẻ của một mục chờ kể.
  theChoKe(m) {
    const ma = `${m.nguon}:${m.id}`;
    const tep = m.coTep && m.tepUrl ? this.xemTep(m.tepUrl, m.laVideo) : '';
    return `
      <div class="card" data-muc="${UI.esc(ma)}">
        <div class="card-title">${m.hoTen ? UI.esc(m.hoTen) : 'Chưa gắn bé'}
          <span class="spacer"></span>${this.TEN_CT[m.nhom] ? UI.badge(this.TEN_CT[m.nhom], 'blue') : ''}</div>
        ${tep}
        ${m.moTa ? `<div class="small" style="line-height:1.6">${UI.esc(m.moTa)}</div>` : ''}
        <div class="muted small">${UI.esc(UI.timeAgo(m.taoLuc))}${m.nguon === 'nhap' ? ' · nháp chỉ cô thấy' : ''}</div>
        <button class="btn success-soft block mt-8" data-hoan-thien="${UI.esc(ma)}">${UI.icon('send', 16)} Hoàn thiện &amp; kể</button>
        <div class="grid-2 mt-8">
          ${m.nguon === 'quansat' ? `<button class="btn outline" data-ghinham="${UI.esc(m.id)}">Ghi nhầm bé</button>` : '<span></span>'}
          <button class="btn outline" data-bo="${UI.esc(ma)}">Bỏ</button>
        </div>
      </div>`;
  },

  // Bỏ một mục: đi đúng đường xoá sẵn có của nguồn ấy — mỗi đường đã tự canh
  // "chỉ cô đã ghi" và tự dọn ảnh.
  async boMucChoKe(m) {
    if (!m) return;
    const hoi = {
      nhap: 'Bỏ bản nháp này? Đây là ghi chép riêng của cô, bỏ rồi không lấy lại được.',
      quansat: 'Xoá hẳn quan sát này? Ảnh kèm theo cũng được dọn, và không lấy lại được.',
      ghinhanh: 'Bỏ bản Ghi nhanh này? Ảnh kèm theo cũng được dọn, và không lấy lại được.',
    }[m.nguon];
    const duong = {
      nhap: `/api/hanhtrinh/nhap/${encodeURIComponent(m.id)}`,
      quansat: `/api/hanhtrinh/${encodeURIComponent(m.id)}`,
      ghinhanh: `/api/thuchup/${encodeURIComponent(m.id)}`,
    }[m.nguon];
    if (!duong || !confirm(hoi)) return;
    try {
      await API.del(duong);
      UI.toast('Đã bỏ', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // NHÁP CHƯA GẮN BÉ CỦA CHÍNH CÔ (lớp 1 — máy chủ chỉ trả nháp của người
  // đang đăng nhập). Khối của ba tab chương trình; ở Hình ảnh ghi nhanh nháp
  // nằm chung danh sách chờ kể.
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
              ${n.coAnh ? this.xemTep(`/api/hanhtrinh/anh/${n.anh}`, n.laVideo, 'width:48px;height:48px;border-radius:10px;flex:none') : ''}
              <div class="row-main" style="min-width:140px">
                <div class="row-title" style="font-weight:400">${UI.esc(n.moTa || (n.laVideo ? '(chỉ có video)' : '(chỉ có ảnh)'))}</div>
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

  // Ô xem tệp lớp 1 — ảnh, hoặc video KHÔNG tải trước: danh sách dài mà máy
  // tải trước từng đoạn là ngốn hết 4G của cô.
  xemTep(url, laVideo, kieu = 'width:100%;max-height:240px;border-radius:12px;margin-bottom:8px') {
    const k = `${kieu};object-fit:cover;background:var(--line)`;
    return laVideo
      ? `<video src="${UI.esc(url)}" preload="none" controls playsinline style="${k}"></video>`
      : `<img src="${UI.esc(url)}" alt="" loading="lazy" style="${k}">`;
  },

  // ---- Hộp thoại: GHI NHẦM BÉ ----
  //
  // Hai đường ra, và đường CHUYỂN đứng trước đường XOÁ.
  //
  // Cú bấm nhầm thường gặp nhất là quên đổi tên bé trong ô chọn, và lúc đó việc
  // cô muốn làm là chuyển sang đúng bé — không phải gõ lại từ đầu. Xoá chỉ dành
  // cho bản ghi đúng là rác. `q`: mục quan sát của danh sách Hình ảnh ghi nhanh.
  moGhiNham(id, q) {
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

  // ---- Hộp thoại: GHI NHANH (lớp 1) ----
  //
  // Đ242B (góp ý 20/10, B4/B5): chụp hoặc quay TRƯỚC — khoảnh khắc qua nhanh,
  // chữ để sau cũng được. Ảnh hay đoạn video đã là điều cô thấy, nên ô chữ và
  // ô bé đều không bắt buộc; trống cả tệp lẫn chữ thì máy chủ nói câu từ chối.
  //
  // DÒNG ĐẦU Ô CHỌN BÉ LÀ "CHƯA GẮN BÉ", KHÔNG PHẢI BÉ ĐẦU DANH SÁCH.
  //
  // Chọn sẵn bé đầu danh sách thì cô bấm Lưu mà quên đổi tên bé là quan sát
  // nằm vĩnh viễn trong hành trình của bé khác — kèm ảnh của bé khác. Để trống
  // bé thì ghi chép thành nháp riêng của cô ở Hình ảnh ghi nhanh, cô gắn bé lúc
  // hoàn thiện: ghi nhầm tốn của một đứa trẻ cả một trang hồ sơ, gắn bé sau chỉ
  // tốn của cô một thao tác.
  //
  // Chú thích này để ở đây, KHÔNG để trong chuỗi HTML: chú thích `<!-- -->` đi
  // thẳng ra trình duyệt, nên bộ canh QUY TẮC 2 đọc nó như chữ trên màn hình —
  // và nó đọc đúng.
  //
  // Bé đặt sẵn chỉ là bé CÔ ĐÃ TỰ CHỌN ở bốn tab (`dangMo`), không bao giờ là
  // bé đầu danh sách.
  moGhi(id, tu = this.dangMo()) {
    this._anhMoi = null;
    this._videoMoi = null;
    this._luotGhi = (this._luotGhi || 0) + 1;
    const ds = (this._data || {}).danhSachBe || [];
    UI.modal(`
      <div class="field">
        <label>Chụp ảnh hoặc quay video</label>
        <div class="flex">
          <div id="ht-anh-xem" style="width:64px;height:64px;flex:none;border-radius:12px;background:var(--line);
            display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden">🌱</div>
          <input type="file" id="ht-anh" accept="image/*,video/*" style="flex:1;min-width:0">
        </div>
        <div id="ht-nen"></div>
      </div>
      <div class="field">
        <label>Bé nào (không bắt buộc)</label>
        <select id="ht-be">
          <option value="__nhap__">— Chưa gắn bé · lưu nháp, gắn sau —</option>
          ${ds.map(b => `<option value="${UI.esc(b.id)}" ${tu.studentId === b.id ? 'selected' : ''}>${
            UI.esc(b.hoTen)}${b.ngungHoSoHocTap ? ' — gia đình đã dừng hồ sơ học tập' : ''}</option>`).join('')}
        </select>
        <div class="hint">Chưa chọn bé thì ghi chép nằm ở <b>Hình ảnh ghi nhanh</b>, cô gắn bé lúc hoàn thiện.</div>
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
        <label>Con đang làm gì (không bắt buộc)</label>
        <textarea id="ht-mota" rows="3"
          placeholder="Chỉ mô tả điều đã thấy, chưa cần nhận xét. Ví dụ: Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau.">${UI.esc(tu.moTa || '')}</textarea>
        ${this.nhacMicro()}
        <div class="hint">Đây là ghi chép riêng của cô. Gia đình <b>không</b> đọc được phần này —
          chỉ đọc câu chuyện cô chủ động kể sau. Ảnh đăng cho gia đình cần chú thích rõ
          bé đang làm gì, hoặc gia đình có thể cùng con thực hành gì ở nhà.</div>
      </div>
      <button class="btn primary block" id="ht-luu">${UI.icon('check', 18)} Lưu</button>
    `, 'Ghi nhanh');
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

    document.getElementById('ht-luu').onclick = () => this.luuGhi();
  },

  async luuGhi() {
    const studentId = document.getElementById('ht-be').value;
    // Không gửi ngày: màn này không còn ô chọn ngày, máy chủ ghi ngày hôm nay.
    const body = { moTa: document.getElementById('ht-mota').value.trim() };
    // Hỏi TRONG HỘP THOẠI: màn Chủ đề tuần cũng có một ô `ht-nhom` (chọn nhóm
    // lớp) đứng trước hộp trong trang — hỏi cả trang là gửi mã nhóm lớp lên
    // làm chương trình, và máy chủ từ chối lượt ghi.
    const oNhom = document.querySelector('#modal-overlay #ht-nhom');
    if (oNhom && oNhom.value) body.nhom = oNhom.value;
    if (this._anhMoi) body.anh = this._anhMoi;
    if (this._videoMoi) body.video = this._videoMoi;
    // CHƯA GẮN BÉ: lưu thành nháp riêng của cô, gắn bé lúc hoàn thiện (góp ý
    // 06/10, mục 7; 20/10, B1).
    const laNhap = !studentId || studentId === '__nhap__';
    try {
      if (laNhap) await API.post('/api/hanhtrinh/nhap', { ...body, nhom: body.nhom || '' });
      else await API.post('/api/hanhtrinh', { ...body, studentId });
      UI.toast(laNhap
        ? 'Đã lưu — cô gắn bé và kể ở mục "Hình ảnh ghi nhanh" (nháp quá 30 ngày chưa gắn bé thì tự bỏ)'
        : 'Đã lưu — ghi chép chờ cô kể ở mục "Hình ảnh ghi nhanh"', 'success');
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
      ${n.coAnh ? this.xemTep(`/api/hanhtrinh/anh/${n.anh}`, n.laVideo) : ''}
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

  // ---- Hộp thoại: HOÀN THIỆN & KỂ cho gia đình (lớp 3) ----
  //
  // Một hộp cho mọi nguồn (Đ242B): quan sát ở bốn tab, và ba nguồn của Hình
  // ảnh ghi nhanh — nháp chưa gắn bé, quan sát chưa kể, Ghi nhanh chưa chép.
  // Cô chủ động bấm mới kể, không có gì tự công bố.
  //
  // NHÁP / GHI NHANH THÌ THÀNH QUAN SÁT TRƯỚC, RỒI MỚI KỂ. Hai bước, hai lần
  // gọi máy chủ. Hỏng ở bước kể thì ghi chép đã là một quan sát chưa kể của
  // bé — vẫn nằm ở Hình ảnh ghi nhanh, cô kể lại được, không mất gì.
  //
  // "CÙNG CON Ở NHÀ" VẪN BẮT BUỘC (QUY TẮC 5) nhưng điền sẵn từ "Cùng con ở
  // nhà tuần này" của chủ đề tuần nhóm bé — cô sửa cho hợp khoảnh khắc nếu muốn.
  //
  // GỬI KÈM ẢNH THÌ PHẢI NÓI TRONG ẢNH CÓ AI. Ảnh có bé khác chỉ tới gia đình
  // khi mọi bé trong ảnh đều có đồng ý chia sẻ; máy chủ lọc, hộp này chỉ hỏi.
  mucTuQuanSat(q) {
    return {
      nguon: 'quansat', id: q.id, studentId: q.studentId, hoTen: q.hoTen || '',
      moTa: q.moTa || '', coTep: !!q.anh, laVideo: !!q.laVideo,
      tepUrl: q.anh ? `/api/hanhtrinh/anh/${q.anh}` : '',
      nhom: q.nhomCo || '', goc: q.goc || '',
      cauChuyen: q.cauChuyen || '', cungConONha: q.cungConONha || '',
      daCongBo: !!q.daCongBo, daVeAlbum: q.daVeAlbum || null, tepKe: q.tepKe || [],
    };
  },

  async moCauChuyen(id, tu) {
    if (!tu) return;
    const q = tu.nguon ? tu : this.mucTuQuanSat(tu);
    const dsBe = (this._data || {}).danhSachBe || [];
    const tepCu = (q.tepKe || [])[0] || null;
    const st = { be: q.studentId || '', tt: null, nhom: q.nhom || '', goc: q.goc || '', cnDienSan: '' };
    const taiBe = async () => {
      st.tt = st.be ? await API.get(`/api/hanhtrinh?studentId=${encodeURIComponent(st.be)}`).catch(() => null) : null;
    };
    const lopCua = () => (st.tt && st.tt.be && st.tt.be.classId)
      || (dsBe.find(b => b.id === st.be) || {}).classId
      || ((App.state.students || []).find(s => s.id === st.be) || {}).classId || '';
    const tenCua = () => (st.tt && st.tt.be && st.tt.be.hoTen) || (dsBe.find(b => b.id === st.be) || {}).hoTen || q.hoTen || '';
    const cnTuan = () => ((st.tt && st.tt.chuDeTuan) || {}).cungConONha || '';
    // ALBUM ĐỂ LƯU ẢNH VỀ (Đ144). CHỈ MỜI ALBUM "THEO THẺ": câu chuyện là của
    // riêng một bé, nên album cả nhóm cùng xem không được hiện ra để cô bấm
    // nhầm. Máy chủ cũng từ chối, nhưng mời rồi mới từ chối là làm cô mất công
    // gõ lại. Tải lỗi thì bỏ qua ô này — kể chuyện vẫn phải làm được khi mạng
    // chập chờn.
    let albums = [];
    if (q.coTep && !q.daVeAlbum) {
      try {
        albums = (await API.get('/api/albums') || []).filter(a => !a.lopDaDong && a.cheDo === 'theo-the');
      } catch (_) { albums = []; }
    }
    await taiBe();
    const cnDau = q.cungConONha || cnTuan();
    if (!q.cungConONha) st.cnDienSan = cnDau;

    UI.modal(`
      ${q.coTep && q.tepUrl ? this.xemTep(q.tepUrl, q.laVideo) : ''}
      ${q.moTa ? `<div class="muted small" style="line-height:1.6;margin-bottom:12px">Cô đã ghi: ${UI.esc(q.moTa)}</div>` : ''}
      ${q.studentId
    ? `<div class="small" style="margin-bottom:12px">Bé: <b>${UI.esc(q.hoTen || tenCua())}</b></div>`
    : `<div class="field">
          <label>Bé nào</label>
          <select id="ht-hc-be">
            <option value="">— Chọn bé —</option>
            ${dsBe.map(b => `<option value="${UI.esc(b.id)}">${UI.esc(b.hoTen)}${b.ngungHoSoHocTap ? ' — gia đình đã dừng hồ sơ học tập' : ''}</option>`).join('')}
          </select>
        </div>`}
      <div id="ht-hc-ngung"></div>
      <div id="ht-hc-ct"></div>
      <div class="field">
        <label>Chú thích kể cho gia đình</label>
        <textarea id="ht-cc" rows="4" placeholder="Kể lại bằng lời của cô: con đang làm gì ở lớp — và nếu có ảnh, ảnh chụp lúc nào, con làm ra sản phẩm gì.">${UI.esc(q.cauChuyen || '')}</textarea>
        ${this.nhacMicro()}
        <div class="hint">Phần này <b>chỉ công bố khi cô bấm nút</b>. Gõ dở để đó cũng không ai đọc được.
          Chú thích rõ hoạt động của con ở lớp, hoặc cách gia đình cùng con thực hành thêm ở nhà (ô dưới).</div>
      </div>
      <div class="field">
        <label>Cùng con ở nhà</label>
        <textarea id="ht-cn" rows="3" placeholder="Ví dụ: tối nay bố mẹ để con tự rót nước vào cốc — 5 phút, dùng luôn ca nước trên bàn.">${UI.esc(cnDau)}</textarea>
        <div class="hint" id="ht-cn-nguon" ${st.cnDienSan ? '' : 'hidden'}>Điền sẵn từ <b>"Cùng con ở nhà tuần này"</b> của chủ đề tuần —
          cô sửa cho hợp với khoảnh khắc này nếu muốn.</div>
        <div class="hint">5–10 phút, đồ có sẵn trong nhà, không cần màn hình.
          Đây là <b>lời rủ chơi</b> gửi gia đình, không phải việc phải nộp lại cho cô.</div>
      </div>
      ${q.coTep ? `
      <div class="field">
        <label class="flex" style="gap:10px;align-items:center;cursor:pointer">
          <input type="checkbox" id="ht-kem-tep" ${!q.daCongBo || tepCu ? 'checked' : ''}
            style="width:20px;height:20px;flex:none;accent-color:var(--primary)">
          Gửi kèm ${q.laVideo ? 'video' : 'ảnh'} này cho gia đình
        </label>
        ${tepCu && !tepCu.hienVoiGiaDinh && tepCu.lyDo ? `<div class="muted small mt-8" data-ly-do style="line-height:1.6">${UI.esc(tepCu.lyDo)}</div>` : ''}
        <div id="ht-hc-anh"></div>
      </div>` : ''}
      ${q.daVeAlbum ? `<div class="hint mb-8">🖼️ Ảnh của quan sát này đã lưu về album <b>${UI.esc(q.daVeAlbum.title)}</b>.</div>` : ''}
      <div id="ht-hc-album"></div>
      <div class="grid-2">
        <button class="btn outline" id="ht-luu-nhap">${q.daCongBo ? 'Lưu thay đổi' : 'Lưu, chưa kể'}</button>
        <button class="btn success-soft" id="ht-cong-bo">${UI.icon('send', 16)} Kể cho gia đình</button>
      </div>
      ${q.daCongBo ? `<button class="btn danger-soft block mt-8" id="ht-thu-hoi">Thu hồi khỏi màn hình gia đình</button>` : ''}
    `, q.nguon === 'quansat' ? 'Câu chuyện cho gia đình' : 'Hoàn thiện & kể');

    const $ = (x) => document.getElementById(x);

    // Chương trình: CHỈ PHẦN CÔ GHI ĐƯỢC ở nhóm bé (máy chủ khai `nhomDuocGhi`;
    // chốt chặn vẫn ở máy chủ). Chương trình cũ của quan sát nằm ngoài phần ấy
    // thì vẫn hiện để giữ nguyên — không lặng lẽ chuyển quan sát sang tab khác.
    // Góc con chỉ ở Montessori.
    const veCt = () => {
      const duoc = (st.tt && st.tt.nhomDuocGhi) || Object.keys(this.TEN_CT);
      const ds = Object.keys(this.TEN_CT).filter(ma => duoc.includes(ma) || (q.nguon === 'quansat' && ma === q.nhom));
      if (!ds.includes(st.nhom)) st.nhom = duoc.find(ma => ds.includes(ma)) || ds[0] || '';
      const gocKH = ((st.tt && st.tt.gocKeHoach) || (this._choKe || {}).gocKeHoach || [])
        .filter(g => g.chuongTrinh === 'chu-nhiem');
      $('ht-hc-ct').innerHTML = `
        <div class="field">
          <label>Chương trình</label>
          <select id="ht-hc-nhom">
            ${ds.map(ma => `<option value="${UI.esc(ma)}" ${st.nhom === ma ? 'selected' : ''}>${UI.esc(this.TEN_CT[ma])}</option>`).join('')}
          </select>
        </div>
        ${st.nhom === 'chu-nhiem' && gocKH.length ? `
          <div class="field">
            <label>Góc (không bắt buộc)</label>
            <select id="ht-hc-goc">
              <option value="">— Không chọn góc —</option>
              ${gocKH.map(g => `<option value="${UI.esc(g.ma)}" ${st.goc === g.ma ? 'selected' : ''}>${UI.esc(g.ten)}</option>`).join('')}
            </select>
          </div>` : ''}`;
      $('ht-hc-nhom').onchange = (e) => { st.nhom = st.nhomChon = e.target.value; veCt(); };
      const oGoc = $('ht-hc-goc');
      if (oGoc) oGoc.onchange = () => { st.goc = oGoc.value; };
    };

    // "Trong ảnh có bé khác không?" — bắt buộc trả lời khi gửi kèm ảnh.
    const daXacNhan = tepCu && tepCu.daXacNhanBe;
    st.beKhac = daXacNhan ? ((tepCu.beTrongAnh || []).some(b => b.id !== q.studentId) ? 'co' : 'chi') : '';
    st.beChon = new Set(daXacNhan ? (tepCu.beTrongAnh || []).map(b => b.id).filter(x => x !== q.studentId) : []);
    const veAnh = () => {
      const vung = $('ht-hc-anh');
      if (!vung) return;
      if (!$('ht-kem-tep').checked) { vung.innerHTML = ''; return; }
      const lop = lopCua();
      const ban = dsBe.filter(b => b.classId === lop && b.id !== st.be);
      const ten = tenCua();
      vung.innerHTML = `
        <div class="muted small mt-8" style="font-weight:700">Trong ảnh có bé khác không?</div>
        <label class="list-row" style="cursor:pointer">
          <input type="radio" name="ht-be-khac" id="ht-chi-be" value="chi" ${st.beKhac === 'chi' ? 'checked' : ''}
            style="width:20px;height:20px;flex:none;margin-right:10px;accent-color:var(--primary)">
          <div class="row-main"><div class="row-title">${ten ? `Chỉ có bé ${UI.esc(ten)}` : 'Chỉ có bé này'}</div></div>
        </label>
        <label class="list-row" style="cursor:pointer">
          <input type="radio" name="ht-be-khac" id="ht-co-be-khac" value="co" ${st.beKhac === 'co' ? 'checked' : ''}
            style="width:20px;height:20px;flex:none;margin-right:10px;accent-color:var(--primary)">
          <div class="row-main"><div class="row-title">Có bé khác — cô chọn tên các bé</div></div>
        </label>
        ${st.beKhac === 'co' ? `
          <div style="max-height:40vh;overflow-y:auto;padding-left:12px">
            ${!st.be ? '<div class="muted small">Cô chọn bé ở trên trước nhé.</div>' : ban.length ? ban.map(b => `
              <label class="list-row" style="cursor:pointer">
                <input type="checkbox" class="ht-be-anh" value="${UI.esc(b.id)}" ${st.beChon.has(b.id) ? 'checked' : ''}
                  style="width:20px;height:20px;flex:none;margin-right:10px">
                <div class="row-main"><div class="row-title">${UI.esc(b.hoTen)}</div></div>
              </label>`).join('') : '<div class="muted small">Nhóm của bé chưa có bé nào khác.</div>'}
          </div>` : ''}
        <div class="hint">Ảnh có bé khác chỉ hiện với gia đình khi <b>mọi bé trong ảnh</b> đều có đồng ý chia sẻ
          ảnh với gia đình khác. Chưa có đồng ý thì ảnh tạm ẩn, câu chuyện vẫn tới gia đình.</div>`;
      for (const r of vung.querySelectorAll('[name="ht-be-khac"]')) r.onchange = () => { st.beKhac = r.value; veAnh(); };
      for (const c of vung.querySelectorAll('.ht-be-anh')) {
        c.onchange = () => { if (c.checked) st.beChon.add(c.value); else st.beChon.delete(c.value); };
      }
    };

    const veAlbum = () => {
      const vung = $('ht-hc-album');
      if (!q.coTep || q.daVeAlbum || !st.be) { vung.innerHTML = ''; return; }
      const ds = albums.filter(a => a.classId === lopCua());
      vung.innerHTML = ds.length ? `
        <div class="field">
          <label>Lưu ảnh về album</label>
          <select id="ht-album">
            <option value="">Không lưu về album</option>
            ${ds.map(a => `<option value="${UI.esc(a.id)}">${UI.esc(a.title)}</option>`).join('')}
          </select>
          <div class="hint">Ảnh được chép sang album đã chọn và gắn thẻ các bé có trong ảnh, để gia đình về sau vào Album ảnh tìm lại cho tiện.
            Chỉ hiện album ở chế độ <b>theo thẻ</b> — ở đó mỗi nhà chỉ thấy ảnh có thẻ con mình.</div>
        </div>` : `
        <div class="hint mb-8">Nhóm mình chưa có album nào ở chế độ <b>theo thẻ</b>, nên chưa lưu ảnh của
          câu chuyện này về album được. Câu chuyện vẫn kể cho gia đình bình thường.
          Muốn lưu thì nhờ nhà trường tạo một album theo thẻ giúp cô nhé.</div>`;
    };

    const veNgung = () => {
      const ngung = st.tt ? st.tt.ngungHoSoHocTap : (dsBe.find(b => b.id === st.be) || {}).ngungHoSoHocTap;
      $('ht-hc-ngung').innerHTML = ngung ? `
        <div class="card" style="border-left:4px solid var(--warning)"><div class="small" style="line-height:1.7">
          Gia đình bé ${UI.esc(tenCua())} đã dừng phần hồ sơ học tập, nên chưa kể được câu chuyện mới.
          Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.</div></div>` : '';
    };

    veCt(); veAnh(); veAlbum(); veNgung();
    const oKem = $('ht-kem-tep');
    if (oKem) oKem.onchange = veAnh;
    const oBe = $('ht-hc-be');
    if (oBe) {
      oBe.onchange = async () => {
        st.be = oBe.value;
        st.beChon.clear();
        // Cô chưa tự chọn chương trình thì theo vai của cô ở nhóm bé MỚI.
        st.nhom = st.nhomChon || q.nhom || '';
        await taiBe();
        // Ô "Cùng con ở nhà" theo chủ đề tuần của nhóm bé MỚI — trừ khi cô đã
        // tự gõ vào đó.
        const oCn = $('ht-cn');
        if (oCn && (!oCn.value.trim() || oCn.value === st.cnDienSan)) {
          st.cnDienSan = cnTuan();
          oCn.value = st.cnDienSan;
          $('ht-cn-nguon').hidden = !st.cnDienSan;
        }
        veCt(); veAnh(); veAlbum(); veNgung();
      };
    }

    const doc = () => ({
      cauChuyen: $('ht-cc').value.trim(),
      cungConONha: $('ht-cn').value.trim(),
    });
    const ngayCua = (luc) => { const d = luc ? new Date(luc) : null; return d && !isNaN(d) ? this.chuoiNgay(d) : this._ngay; };
    // Bước 1: nháp / Ghi nhanh thành quan sát của bé. Trả về mã quan sát.
    const thanhQuanSat = async () => {
      if (q.nguon === 'quansat') return q.id;
      if (q.nguon === 'nhap') {
        return (await API.post(`/api/hanhtrinh/nhap/${encodeURIComponent(q.id)}/gan`, { studentId: st.be, nhom: st.nhom })).id;
      }
      return (await API.post('/api/hanhtrinh', {
        studentId: st.be, ghiNhanhId: q.id, nhom: st.nhom, ngay: ngayCua(q.taoLuc),
      })).id;
    };
    const xong = (chu) => { UI.toast(chu, 'success'); UI.closeModal(); App.route(); };

    $('ht-luu-nhap').onclick = async () => {
      if (!st.be) return UI.toast('Cô chọn bé để lưu ghi chép này vào hành trình của bé nhé', 'error');
      try {
        const qsId = await thanhQuanSat();
        await API.put(`/api/hanhtrinh/${encodeURIComponent(qsId)}`, doc());
        // NÓI ĐÚNG SỰ THẬT. Bản đã công bố thì chữ vừa lưu đi THẲNG lên màn
        // hình gia đình — câu "gia đình chưa đọc được" ở đó là nói sai.
        xong(q.daCongBo ? 'Đã lưu — gia đình thấy bản mới ngay' : 'Đã lưu — gia đình chưa đọc được, cô kể khi muốn');
      } catch (err) { UI.toast(err.message, 'error'); }
    };

    $('ht-cong-bo').onclick = async () => {
      const v = doc();
      // Kiểm HẾT trước bước 1: nháp đã gắn bé mà bước kể bị từ chối vì thiếu
      // chữ là bắt cô mở lại hộp ở một mục khác.
      if (!st.be) return UI.toast('Cô chọn bé cho ghi chép này nhé', 'error');
      if (!v.cauChuyen) return UI.toast('Cô viết chú thích gửi gia đình trước khi kể nhé', 'error');
      if (!v.cungConONha) {
        return UI.toast('Cô gợi ý giúp gia đình một việc "cùng con ở nhà" nhé — 5 tới 10 phút, đồ có sẵn trong nhà.', 'error');
      }
      const body = { ...v, goc: st.nhom === 'chu-nhiem' ? st.goc : '' };
      if (q.coTep) {
        body.kemTep = $('ht-kem-tep').checked;
        if (body.kemTep) {
          if (!st.beKhac) return UI.toast('Cô cho biết giúp trong ảnh có bé khác không nhé', 'error');
          if (st.beKhac === 'co' && !st.beChon.size) return UI.toast('Cô chọn tên các bé có trong ảnh nhé', 'error');
          body.beTrongAnh = st.beKhac === 'co' ? [...st.beChon] : [];
        }
      }
      // Nháp / Ghi nhanh mang chương trình ở bước 1; quan sát chỉ gửi khi cô đổi.
      if (q.nguon === 'quansat' && st.nhom && st.nhom !== q.nhom) body.nhom = st.nhom;
      const albumId = ($('ht-album') || {}).value || '';
      if (albumId) body.albumId = albumId;
      const nut = $('ht-cong-bo');
      nut.disabled = true;
      let qsId = '';
      try { qsId = await thanhQuanSat(); } catch (err) { nut.disabled = false; return UI.toast(err.message, 'error'); }
      try {
        await API.post(`/api/hanhtrinh/${encodeURIComponent(qsId)}/cong-bo`, body);
        xong('Đã gửi câu chuyện tới gia đình');
      } catch (err) {
        if (q.nguon === 'quansat') { nut.disabled = false; UI.toast(err.message, 'error'); return; }
        // Đã thành quan sát mà chưa kể được: giữ chữ cô vừa gõ, mục vẫn ở
        // Hình ảnh ghi nhanh để cô kể lại.
        try { await API.put(`/api/hanhtrinh/${encodeURIComponent(qsId)}`, v); } catch (_) { /* chữ vẫn trong hộp đã đóng — cô gõ lại */ }
        UI.closeModal();
        App.route();
        UI.toast(`${err.message} — ghi chép đã gắn bé và vẫn nằm ở Hình ảnh ghi nhanh, cô kể lại sau nhé`, 'error');
      }
    };

    const thu = $('ht-thu-hoi');
    if (thu) thu.onclick = async () => {
      try {
        await API.post(`/api/hanhtrinh/${encodeURIComponent(q.id)}/thu-hoi`, {});
        xong('Đã thu hồi — chữ cô viết vẫn còn nguyên');
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
  // phụ (và màn chủ đề tuần) thì như cũ.
  dangMo() {
    if (this.laTab(this.LOI_PHU, this._tab) || this._tab === 'chude') return {};
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
        ${this.tinhTrangTepKe(q)}
        ${nut}
      </div>`;
  },

  // Ảnh/video đã gửi kèm câu chuyện có đang tới gia đình không (Đ242B). Đang
  // ẩn thì nói vì sao — ẩn mà không nói là chỗ cô mất lòng tin vào app. Chữ
  // trung tính, không màu cảnh báo: đây là chuyện đồng ý của người lớn, không
  // phải điều gì về đứa trẻ (QUY TẮC 2).
  tinhTrangTepKe(q) {
    return (q.tepKe || []).filter(t => 'hienVoiGiaDinh' in t).map(t => `
      <div class="muted small mt-8" data-ly-do style="line-height:1.6">
        ${t.hienVoiGiaDinh ? `${t.loai === 'video' ? 'Đoạn video' : 'Ảnh'} đã gửi kèm cho gia đình.` : UI.esc(t.lyDo || '')}
      </div>`).join('');
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
    if (!tab.length) return this.veBaiThangNay(d) + this.veCauChuyen(d.quanSat || [], '', d.gocKeHoach);
    if (this._tabGd !== 'kehoach' && !tab.some(t => t.ma === this._tabGd)) this._tabGd = 'kehoach';
    const loc = (d.quanSat || []).filter(q => q.nhomCo === this._tabGd);
    return `
      <div class="seg" id="ht-ph-tabs" style="flex-wrap:wrap">
        ${this.BON_TAB.filter(([ma]) => ma === 'kehoach' || tab.some(t => t.ma === ma)).map(([ma, ten]) => `
          <button class="${this._tabGd === ma ? 'active' : ''}" data-tab="${UI.esc(ma)}">${UI.esc(ten)}</button>`).join('')}
      </div>
      ${this._tabGd === 'kehoach'
        ? (this.veBaiThangNay(d) || UI.emptyState('🧭', 'Kế hoạch tháng này của con sẽ hiện ở đây khi nhà trường đã duyệt.'))
        : this.veCauChuyen(loc, this.TEN_CT[this._tabGd], d.gocKeHoach)}`;
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

  veCauChuyen(ds, tenCt, gocKH) {
    return `
      <div class="section-label">Câu chuyện của con${tenCt ? ` · ${UI.esc(tenCt)}` : ''}</div>
      ${ds.length
        ? ds.map(q => this.theCauChuyen(q, gocKH)).join('')
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

  // Ảnh/video gia đình nhận là BẢN CHÉP cô chủ động gửi kèm (Đ242B), đi đường
  // riêng `/ke-tep/` có luật đồng ý ảnh nhóm — không bao giờ là tệp lớp 1.
  theCauChuyen(q, gocKH) {
    const goc = q.goc ? ((gocKH || []).find(g => g.ma === q.goc) || {}).ten : '';
    const kieu = 'width:100%;max-height:360px;border-radius:12px;margin-bottom:8px;background:var(--line)';
    const tep = (q.tepKe || []).map(t => (t.loai === 'video'
      ? `<video src="/api/hanhtrinh/ke-tep/${UI.esc(t.id)}" controls playsinline preload="metadata" style="${kieu}"></video>`
      : `<img src="/api/hanhtrinh/ke-tep/${UI.esc(t.id)}" alt="" loading="lazy" style="${kieu};object-fit:cover">`)).join('');
    return `
      <div class="card">
        <div class="card-title">${UI.esc(UI.fmtDate(q.ngay))}<span class="spacer"></span>${goc ? UI.badge(goc, 'blue') : ''}</div>
        ${tep}
        <div style="line-height:1.7">${UI.esc(q.cauChuyen || '')}</div>
        ${q.cungConONha ? `
          <div class="section-label">Cùng con ở nhà</div>
          <div class="small" style="line-height:1.6">${UI.esc(q.cungConONha)}</div>` : ''}
      </div>`;
  },

  // ---- Ảnh hoặc video của hộp Ghi nhanh ----
  ganChonAnh() {
    const o = document.getElementById('ht-anh');
    if (!o) return;
    o.onchange = async () => {
      const f = o.files && o.files[0];
      this._anhMoi = null;
      this._videoMoi = null;
      const nen = document.getElementById('ht-nen');
      if (nen) nen.innerHTML = '';
      if (!f) return;
      if (/^video\//.test(f.type)) return this.chonVideo(f);
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

  // Trần video, khớp `MAX_VIDEO_BYTES` của máy chủ — đọc từ chính gói
  // Hình ảnh ghi nhanh khi đã có, không thì 8 MB như màn Album.
  tranVideo() {
    return Number((this._choKe || {}).toiDaVideo) || 8 * 1024 * 1024;
  },

  // VIDEO: CÙNG LUẬT VỚI MÀN ALBUM (public/js/views/albums.js). Nhỏ hơn trần
  // thì gửi nguyên; quá trần thì nén ngay trên máy bằng `UI.nenVideo` — HỎI
  // TRƯỚC kèm lời báo phải chờ khoảng bằng độ dài đoạn phim, rồi hiện đồng hồ.
  // Nén ngay TRONG hộp này chứ không mở hộp riêng như Album: mở hộp khác là
  // đóng mất hộp Ghi nhanh cùng chữ cô đang gõ.
  async chonVideo(f) {
    const luot = this._luotGhi;
    const conHop = () => luot === this._luotGhi && !!document.getElementById('ht-nen');
    const xem = document.getElementById('ht-anh-xem');
    const nen = document.getElementById('ht-nen');
    const nutLuu = document.getElementById('ht-luu');
    // .mov của iPhone (video/quicktime) là cùng họ hộp `ftyp` với MP4 — máy chủ
    // nhận và lưu thành .mp4 (lib/uploads.js), nên không chặn ở đây.
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) {
      UI.toast('Chỉ nhận video MP4 hoặc WebM — ảnh thì JPG, PNG, WebP', 'error');
      return;
    }
    const dat = (data) => {
      if (!conHop()) return;
      this._videoMoi = data;
      xem.innerHTML = '<video muted playsinline style="width:100%;height:100%;object-fit:cover"></video>';
      xem.firstChild.src = URL.createObjectURL(f);
    };
    const tran = this.tranVideo();
    if (f.size <= tran) {
      try {
        dat(await new Promise((ok, hong) => {
          const r = new FileReader();
          r.onload = () => ok(r.result);
          r.onerror = () => hong(new Error('Không đọc được video này'));
          r.readAsDataURL(f);
        }));
      } catch (err) { UI.toast(err.message, 'error'); }
      return;
    }
    nen.innerHTML = `
      <div class="hint" style="line-height:1.7">
        Đoạn phim này nặng <b>${UI.esc(String(Math.round(f.size / 1048576)))} MB</b>. Máy sẽ <b>nén nhỏ lại</b>
        ngay trên điện thoại của cô rồi mới gửi — hình mờ hơn bản gốc một chút. Nén mất
        <b>khoảng đúng bằng độ dài đoạn phim</b>; trong lúc đó cô để nguyên màn hình này,
        đừng khoá máy hay chuyển sang app khác. Bản gốc trong máy cô không bị đụng tới.
      </div>
      <button class="btn outline block mt-8" id="ht-nen-ok">Nén đoạn phim này</button>`;
    document.getElementById('ht-nen-ok').onclick = async () => {
      let boCuoc = false;
      nen.innerHTML = `
        <div class="muted small mt-8" id="ht-nen-dongho">Đang chuẩn bị…</div>
        <button class="btn outline block mt-8" id="ht-nen-dung">Dừng lại</button>`;
      document.getElementById('ht-nen-dung').onclick = () => { boCuoc = true; };
      if (nutLuu) nutLuu.disabled = true;
      const phutGiay = (g) => `${Math.floor(g / 60)}:${String(Math.floor(g % 60)).padStart(2, '0')}`;
      try {
        const data = await UI.nenVideo(f, {
          tranByte: tran,
          toiDaGiay: 390,
          huy: () => boCuoc || !conHop(),
          tien: ({ giay, tongGiay }) => {
            const dh = document.getElementById('ht-nen-dongho');
            if (dh) dh.textContent = `Đang nén ${phutGiay(giay)} / ${phutGiay(tongGiay)}`;
          },
        });
        dat(data);
        if (conHop()) nen.innerHTML = '<div class="hint">Đã nén xong — cô bấm Lưu nhé.</div>';
      } catch (err) {
        if (!conHop()) return;
        nen.innerHTML = '';
        UI.toast(err && err.message === 'KHONG_NEN_DUOC'
          ? `Máy này chưa nén được video. Cô quay đoạn ngắn hơn (dưới ${Math.round(tran / 1048576)} MB) giúp trường nhé.`
          : (err && err.message) || 'Chưa nén được video này', 'error');
      } finally {
        if (nutLuu) nutLuu.disabled = false;
      }
    };
  },
};
