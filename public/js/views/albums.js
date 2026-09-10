// Phân hệ Album ảnh.
// Danh sách album (#/albums) và trang chi tiết (#/albums/<id>).
// Giáo viên tạo album, thêm và xóa ảnh cho nhóm mình phụ trách.
App.views.albums = {
  _detail: null,
  _pending: [],   // ảnh đang chờ tải lên: [{ dataUrl, caption, name }]

  // Danh sách album tải theo từng trang. Máy chủ cắt ở 60 album một lượt để
  // điện thoại không phải kéo cả lịch sử ảnh của trường về chỉ để xem mấy
  // album trên cùng.
  MOI_TRANG: 60,
  _daTai: [],     // album đã tải về, cộng dồn qua các lượt "xem cũ hơn"
  _conNua: false,
  // CHỦ CỦA PHẦN ĐÃ TẢI. Xem chú thích ở `renderList`.
  _cuaAi: null,

  async render(root, params) {
    const albumId = params && params[0];
    if (albumId) return this.renderDetail(root, albumId);
    return this.renderList(root);
  },

  // ================= Danh sách album =================
  async renderList(root) {
    const isTeacher = App.state.user.role === 'teacher';
    // Hỏi kèm album của nhóm đã đóng cho mọi vai. Máy chủ tự quyết ai được thấy
    // gì: quản trị và cô cũ thấy cả nhóm; phụ huynh chỉ thấy ảnh chụp trong đúng
    // khoảng con còn học nhóm đó.
    // Lượt đầu luôn tải lại từ trang một: vào lại màn này là muốn thấy album
    // mới nhất, không phải thấy lại đúng chỗ đã cuộn tới lần trước.
    //
    // ĐỔI NGƯỜI ĐĂNG NHẬP THÌ DỌN SẠCH, KHÔNG CHỜ `_giuTrang`.
    //
    // `App.views.albums` là một đối tượng sống suốt vòng đời trang, và
    // `App.logout()` cố ý KHÔNG tải lại trang (xem chú thích ở public/js/app.js).
    // Nên nếu ai đó đăng xuất rồi người khác đăng nhập trên cùng máy — máy tính
    // dùng chung ở phòng hành chính là chuyện thường — thì `_daTai` vẫn còn
    // nguyên album của người trước.
    //
    // Nó KHÔNG lộ ra ngay: `_giuTrang` là false ở lượt vào đầu tiên nên phần cũ
    // bị dọn. Chỗ vỡ nằm ở đường "Xem album cũ hơn": nút ấy đặt `_giuTrang =
    // true` rồi mới `App.route()`, và nếu phiên bị đổi ĐÚNG giữa hai bước đó
    // thì phần cũ được giữ lại và trộn vào danh sách của người mới. Ảnh khuôn
    // mặt trẻ thì không có "xác suất thấp" nào là chấp nhận được.
    //
    // Gắn phần đã tải với MÃ NGƯỜI DÙNG là bịt cả họ tình huống ấy, và không
    // phải chạm `public/js/app.js` — tệp dùng chung, phải commit riêng.
    const ai = (App.state.user || {}).id || null;
    if (this._cuaAi !== ai) { this._daTai = []; this._conNua = false; this._giuTrang = false; }
    this._cuaAi = ai;

    if (!this._giuTrang) { this._daTai = []; this._conNua = false; }
    this._giuTrang = false;
    if (!this._daTai.length) await this.taiThem();
    const albums = this._daTai;
    // Tách theo "con/nhóm mình còn ở đó hay không", chứ không theo "nhóm đã đóng":
    // bé chuyển nhóm giữa năm thì nhóm cũ vẫn đang mở nhưng con đã rời rồi.
    const laCu = a => a.lopCuCuaCon || a.lopDaDong;
    const namNay = albums.filter(a => !laCu(a));
    const namCu = albums.filter(laCu);

    root.innerHTML = `
      ${UI.pageHeader('Album ảnh', isTeacher ? { action: { id: 'btn-new-album', label: 'Tạo album', icon: 'plus' } } : {})}
      ${namNay.length
        ? `<div class="grid-2">${namNay.map(a => this.albumCard(a)).join('')}</div>`
        : UI.emptyState('📷', isTeacher
          ? 'Chưa có album nào. Bấm "Tạo album" để đăng ảnh hoạt động của nhóm.'
          : 'Chưa có album ảnh nào của nhóm')}
      ${namCu.length ? `
        <div class="card mt-14" style="border-left:4px solid var(--info)">
          <div class="card-title">Album của các năm học trước</div>
          <div class="muted small" style="line-height:1.6">
            ${namCu.length} album thuộc nhóm đã đóng sau khi chuyển năm học.
            ${isTeacher || App.state.user.role === 'admin'
              ? 'Ảnh vẫn còn nguyên — tải về giữ lại hoặc xóa cho nhẹ máy chủ.'
              : 'Đây là ảnh của nhóm con từng học. Gia đình nên tải về giữ lại.'}
          </div>
        </div>
        <div class="grid-2">${namCu.map(a => this.albumCard(a)).join('')}</div>` : ''}
      ${this._conNua ? `
        <button class="btn outline block mt-14" id="btn-album-cu-hon">
          ${UI.icon('plus', 16)} Xem album cũ hơn
        </button>` : ''}`;
    if (isTeacher) document.getElementById('btn-new-album').onclick = () => this.openCreate();
    const themNua = document.getElementById('btn-album-cu-hon');
    if (themNua) {
      themNua.onclick = async () => {
        themNua.disabled = true;
        themNua.textContent = 'Đang tải…';
        try {
          await this.taiThem();
          this._giuTrang = true;   // đừng xoá phần vừa tải khi vẽ lại
          App.route();
        } catch (err) {
          themNua.disabled = false;
          UI.toast(err.message, 'error');
        }
      };
    }
  },

  // Tải thêm một trang album, nối vào phần đã có.
  //
  // "Còn nữa hay hết" suy ra bằng cách ĐẾM: máy chủ cắt cửa sổ SAU khi lọc
  // quyền, nên nhận đủ một trang nghĩa là còn, nhận thiếu nghĩa là hết. Không
  // cần thêm ô đếm nào trong câu trả lời, và câu trả lời vẫn là một mảng như cũ.
  async taiThem() {
    const bo = this._daTai.length;
    const them = await API.get(`/api/albums?keCaLopCu=1&bo=${bo}&soLuong=${this.MOI_TRANG}`);
    this._daTai = this._daTai.concat(them);
    this._conNua = them.length >= this.MOI_TRANG;
  },

  albumCard(a) {
    return `
      <div class="card clickable" style="margin-bottom:0${a.lopDaDong || a.lopCuCuaCon ? ';opacity:.8' : ''}" onclick="App.navigate('#/albums/${UI.esc(a.id)}')">
        ${this.thumb(a.cover, a.id, 'aspect-ratio:4/3;border-radius:12px')}
        <div style="font-weight:700;margin-top:9px">${UI.esc(a.title)}</div>
        <div class="muted small" style="margin-top:3px">${UI.esc(a.photoCount)} ảnh · ${UI.esc(UI.fmtDateShort(a.date))}</div>
        <div class="mt-8">${UI.badge(a.className, 'gray')}${a.cheDo === 'theo-the' ? ` ${UI.badge('Theo thẻ', 'blue')}` : ''}${a.lopDaDong || a.lopCuCuaCon ? ` ${UI.badge(a.namHoc || 'nhóm cũ', 'orange')}` : ''}</div>
      </div>`;
  },

  // Tệp này là video hay ảnh — nhận theo phần mở rộng, không cần cột mới.
  laVideo(p) { return /\.(mp4|webm)$/i.test((p && p.file) || ''); },

  // Khung ảnh dùng chung: ảnh thật thì hiện ảnh, ảnh cũ thì hiện emoji trên nền màu.
  thumb(photo, albumId, extraStyle = '') {
    // Ô video trong lưới KHÔNG tự phát và không tự tải.
    //
    // `preload="none"` là chủ ý: một album 20 video mà mỗi ô tải sẵn vài trăm
    // KB là gia đình mở album ra hết vài chục MB dữ liệu 4G mà chưa xem gì.
    if (photo && photo.file && this.laVideo(photo)) {
      return `<video src="/api/albums/${UI.esc(albumId)}/photo/${UI.esc(photo.id)}"
        preload="none" playsinline controls
        style="${extraStyle};width:100%;height:100%;object-fit:cover;background:#000"></video>`;
    }
    if (photo && photo.file) {
      return `<img src="/api/albums/${UI.esc(albumId)}/photo/${UI.esc(photo.id)}" alt="${UI.esc(photo.caption || 'Ảnh của nhóm')}"
        loading="lazy" style="${extraStyle};width:100%;height:100%;object-fit:cover;background:var(--bg-2)">`;
    }
    const g = (photo && photo.g) || ['#e6eaf0', '#f2f4f8'];
    const emoji = (photo && photo.emoji) || '📷';
    return `<div style="${extraStyle};width:100%;background:linear-gradient(135deg, ${UI.esc(g[0])}, ${UI.esc(g[1])});display:flex;align-items:center;justify-content:center;font-size:44px">${UI.esc(emoji)}</div>`;
  },

  // ================= Chi tiết một album =================
  async renderDetail(root, id) {
    const a = await API.get(`/api/albums/${id}`);
    this._detail = a;
    root.innerHTML = `
      ${UI.pageHeader(a.title, a.canEdit ? { action: { id: 'btn-add-photo', label: 'Thêm ảnh', icon: 'plus' } } : {})}
      <div class="card">
        <div class="muted small">${UI.esc(a.className)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}${a.authorName ? ` · Đăng bởi ${UI.esc(a.authorName)}` : ''}${a.cheDo === 'theo-the' ? ` · ${UI.badge('Theo thẻ từng bé', 'blue')}` : ''}</div>
        ${a.description ? `<p class="mt-8" style="font-size:.93rem;line-height:1.55">${UI.esc(a.description)}</p>` : ''}
        ${a.lopDaDong ? `<div class="muted small mt-8" style="line-height:1.6">
          Nhóm này đã đóng sau khi chuyển sang năm học mới${a.namHoc ? ` (năm ${UI.esc(a.namHoc)})` : ''},
          nên không đăng thêm ảnh được nữa. Gia đình nên tải về phần muốn giữ lại.
        </div>` : ''}
        ${a.nhacGanThe ? `<div class="small mt-8" style="line-height:1.6;border-left:3px solid var(--warning);padding-left:10px">
          ${UI.esc(a.nhacGanThe.loiNhac)}
        </div>` : ''}
        ${a.nhacChoPhuHuynh ? `<div class="muted small mt-8" style="line-height:1.6;border-left:3px solid var(--line);padding-left:10px">
          ${UI.esc(a.nhacChoPhuHuynh)}
        </div>` : ''}
      </div>
      ${a.photos.length ? `
        <div class="photo-grid">
          ${a.photos.map((p, i) => `
            <div class="photo" style="${p.file ? '' : `background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])})`}">
              <div style="position:absolute;inset:0" onclick="App.views.albums.showPhoto(${i})">
                ${this.thumb(p, a.id)}
              </div>
              ${p.caption ? `<div class="photo-cap" style="pointer-events:none">${UI.esc(p.caption)}</div>` : ''}
              ${a.canEdit ? `
                <button title="Xóa ảnh" onclick="event.stopPropagation();App.views.albums.deletePhoto('${UI.esc(p.id)}')"
                  style="position:absolute;top:6px;right:6px;width:30px;height:30px;border-radius:50%;background:rgba(15,23,42,.62);color:#fff;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)">
                  ${UI.icon('x', 15)}
                </button>
                <button title="Gắn thẻ bé có trong ảnh" onclick="event.stopPropagation();App.views.albums.moGanThe('${UI.esc(p.id)}')"
                  style="position:absolute;top:6px;left:6px;height:30px;padding:0 10px;border-radius:15px;background:rgba(15,23,42,.62);color:#fff;display:flex;align-items:center;gap:5px;font-size:.78rem;backdrop-filter:blur(6px)">
                  ${(p.beTrongAnh || []).length ? `👧 ${(p.beTrongAnh || []).length}` : '＋ gắn bé'}
                </button>` : ''}
            </div>`).join('')}
        </div>` : UI.emptyState('📷', a.canEdit ? 'Album chưa có ảnh nào. Bấm "Thêm ảnh" để đăng.' : 'Album chưa có ảnh')}
      ${a.canXoa ? `
        <button class="btn danger-soft block mt-14" onclick="App.views.albums.deleteAlbum()">Xóa album này</button>` : ''}`;

    if (a.canEdit) document.getElementById('btn-add-photo').onclick = () => this.openAddPhotos();
  },

  // Gắn thẻ bé có mặt trong một tấm ảnh.
  //
  // Đây là thứ quyết định ảnh hiện với nhà nào, nên nó phải nằm ngay trên tấm
  // ảnh, một lượt bấm là xong — cô đứng lớp không mở màn hình thứ ba để làm
  // việc này. Máy KHÔNG đoán thay bằng nhận diện khuôn mặt: chạy nhận diện
  // trên ảnh trẻ dưới 6 tuổi là tạo ra dữ liệu sinh trắc học của trẻ.
  async moGanThe(photoId) {
    const a = this._detail;
    if (!a) return;
    const anh = (a.photos || []).find(x => x.id === photoId);
    if (!anh) return;
    let dsBe = [];
    try {
      dsBe = await API.get(`/api/students?classId=${encodeURIComponent(a.classId || '')}`);
    } catch (_) { dsBe = []; }
    const trongNhom = dsBe.filter(b => !a.classId || b.classId === a.classId);
    const daGan = new Set((anh.beTrongAnh || []).map(b => b.id));

    UI.modal(`
      <div class="muted small" style="line-height:1.6">
        Chọn những bé <b>có mặt trong ảnh này</b>. Ảnh chỉ hiện với gia đình khác
        khi mọi bé trong ảnh đều có đồng ý chia sẻ — gia đình của chính bé thì
        luôn xem được ảnh của con mình.
      </div>
      <div class="mt-14" id="gt-ds" style="max-height:46vh;overflow-y:auto">
        ${trongNhom.length ? trongNhom.map(b => `
          <label class="list-row" style="cursor:pointer">
            <input type="checkbox" class="gt-be" value="${UI.esc(b.id)}" ${daGan.has(b.id) ? 'checked' : ''}
              style="width:20px;height:20px;flex:none;margin-right:10px">
            <div class="row-main"><div class="row-title">${UI.esc(b.name)}</div></div>
          </label>`).join('') : '<div class="muted small">Nhóm chưa có bé nào.</div>'}
      </div>
      <button class="btn primary block mt-14" id="gt-luu">${UI.icon('check', 18)} Lưu</button>
      <div class="hint mt-8">Bỏ chọn hết là gỡ thẻ khỏi ảnh.</div>
    `, 'Bé có trong ảnh');

    document.getElementById('gt-luu').onclick = async () => {
      const chon = [...document.querySelectorAll('#gt-ds .gt-be:checked')].map(x => x.value);
      try {
        await API.put(`/api/albums/${encodeURIComponent(a.id)}/photos/${encodeURIComponent(photoId)}/be`,
          { studentIds: chon });
        UI.toast(chon.length ? `Đã gắn ${chon.length} bé vào ảnh` : 'Đã gỡ thẻ khỏi ảnh', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // Xem một ảnh phóng to.
  showPhoto(index) {
    const a = this._detail;
    if (!a || !a.photos[index]) return;
    const p = a.photos[index];
    UI.modal(`
      ${p.file
        // Video phóng to phải là <video>: nhét vào <img> là gia đình bấm vào
        // đoạn quay của con chỉ thấy một ô ảnh vỡ. Lưới bên ngoài đã phân
        // biệt đúng (this.laVideo) — màn phóng to dùng cùng một phép thử.
        ? (this.laVideo(p)
          ? `<video src="/api/albums/${UI.esc(a.id)}/photo/${UI.esc(p.id)}" controls playsinline
               style="width:100%;max-height:66vh;border-radius:14px;background:#000"></video>`
          : `<img src="/api/albums/${UI.esc(a.id)}/photo/${UI.esc(p.id)}" alt="${UI.esc(p.caption || '')}"
             style="width:100%;max-height:66vh;object-fit:contain;border-radius:14px;background:var(--bg-2)">`)
        : `<div style="height:260px;border-radius:14px;background:linear-gradient(135deg, ${UI.esc(p.g[0])}, ${UI.esc(p.g[1])});display:flex;align-items:center;justify-content:center;font-size:90px">${UI.esc(p.emoji)}</div>`}
      ${p.caption ? `<div class="center mt-14" style="font-weight:700">${UI.esc(p.caption)}</div>` : ''}
      <div class="muted small center mt-8">${UI.esc(a.title)} · ${UI.esc(UI.fmtDate(a.date, { weekday: false }))}</div>
      <div class="muted small center mt-8">Ảnh ${index + 1} / ${a.photos.length}</div>
    `, 'Xem ảnh');
  },

  // ================= Giáo viên: tạo album =================
  openCreate() {
    this._pending = [];
    UI.modal(`
      <div class="field">
        <label>Tên album</label>
        <input id="al-title" placeholder="Ví dụ: Hoạt động trải nghiệm tháng này">
      </div>
      <div class="field">
        <label>Mô tả</label>
        <textarea id="al-desc" placeholder="Đôi dòng giới thiệu về album gửi tới phụ huynh..."></textarea>
      </div>
      <div class="field">
        <label>Ai xem được</label>
        <select id="al-che-do">
          <option value="cong-khai">Cả nhóm — mọi gia đình trong nhóm đều xem được</option>
          <option value="theo-the">Theo thẻ — gia đình chỉ thấy tấm có con mình được gắn thẻ</option>
        </select>
        <div class="hint">Ảnh chung (sự kiện, dã ngoại) thì chọn <b>Cả nhóm</b>: gia đình nhận thông báo ngay,
          cô không phải gắn thẻ từng tấm. Ảnh riêng từng bé thì chọn <b>Theo thẻ</b>: cô gắn thẻ bé
          nào, nhà bé đó được báo và chỉ thấy tấm của con mình.</div>
      </div>
      ${this.pickerMarkup()}
      <button class="btn primary block mt-14" id="al-submit">${UI.icon('plus', 18)} Đăng album</button>
    `, 'Tạo album mới');
    this.bindPicker();
    document.getElementById('al-submit').onclick = () => this.submitCreate();
  },

  // ================= Giáo viên: thêm ảnh vào album có sẵn =================
  openAddPhotos() {
    this._pending = [];
    UI.modal(`
      ${this.pickerMarkup()}
      <button class="btn primary block mt-14" id="al-submit">${UI.icon('plus', 18)} Tải ảnh lên</button>
    `, 'Thêm ảnh vào album');
    this.bindPicker();
    document.getElementById('al-submit').onclick = () => this.submitAddPhotos();
  },

  // Khối chọn ảnh dùng chung cho cả hai màn hình trên.
  pickerMarkup() {
    return `
      <div class="field">
        <label>Ảnh và video</label>
        <input type="file" id="al-file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple style="display:none">
        <button class="btn outline block" id="al-pick">📷 Chọn ảnh hoặc video từ máy</button>
        <div class="hint">
          Chọn được nhiều tệp cùng lúc. Trên điện thoại có thể chụp hoặc quay trực tiếp.
          Ảnh tự thu nhỏ trước khi gửi. <b>Video thì không thu nhỏ được</b> — cô quay
          khoảng 10–20 giây thôi nhé, một đoạn ngắn gia đình xem hết vẫn hơn một đoạn
          dài tải mãi không xong.
        </div>
        <div id="al-preview" class="mt-14"></div>
      </div>`;
  },

  // Trần dung lượng video, PHẢI khớp với `MAX_VIDEO_BYTES` của máy chủ.
  // Bài canh đối chiếu hai con số này với nhau.
  TRAN_VIDEO: 8 * 1024 * 1024,

  // Trần ĐỘ DÀI video. Nhà trường xin 3–5 phút; 6 phút rưỡi là chừa dư cho
  // đoạn quay lố mấy giây, mà vẫn chặn được đoạn nửa tiếng quay quên tắt.
  TOI_DA_GIAY_VIDEO: 390,

  // Đọc tệp thành data URL, KHÔNG nén. Chỉ dùng cho video đã đủ nhỏ.
  docTep(f) {
    return new Promise((ok, that) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => that(new Error('Không đọc được tệp'));
      r.readAsDataURL(f);
    });
  },

  // VIDEO 3–5 PHÚT: NÉN TRÊN MÁY CỦA CÔ RỒI MỚI GỬI (Đ150).
  //
  // Nhà trường 10/09: *"ok chấp nhận giảm chất lượng video để có thể upload
  // video 3-5 phút"*.
  //
  // Việc nén mất đúng bằng độ dài đoạn phim — trình duyệt không có đường nào
  // nhanh hơn thời gian thật (xem chú thích `UI.nenVideo`). Nên trước khi bắt
  // đầu, HỎI CÔ MỘT CÂU kèm con số phút phải chờ, thay vì lẳng lặng chiếm máy
  // của cô bốn phút rồi để cô đoán xem app có treo không.
  //
  // Trả về data URL, hoặc `null` nếu cô bấm Thôi.
  nenVideoCoCho(f) {
    const soMB = Math.round(f.size / 1048576);
    return new Promise((xong, hong) => {
      UI.modal(`
        <div class="center">
          <div style="font-size:34px">🎬</div>
          <h3 class="mt-8">Đoạn phim này nặng ${UI.esc(String(soMB))} MB</h3>
        </div>
        <div class="muted small mt-8" style="line-height:1.7">
          Máy sẽ <b>nén nhỏ lại</b> ngay trên điện thoại của cô rồi mới gửi, để đoạn dài
          3–5 phút vẫn gửi được. Đổi lại <b>hình sẽ mờ hơn</b> bản gốc — nhà trường đã chọn
          như vậy để có video dài.
          <br><br>
          Nén mất <b>khoảng đúng bằng độ dài đoạn phim</b>. Trong lúc đó xin cô
          <b>để nguyên màn hình này</b>, đừng khoá máy hay chuyển sang app khác — chuyển đi
          là bản nén dở dang. Bản gốc trong máy cô <b>không bị đụng tới</b>.
        </div>
        <button class="btn primary block mt-14" id="al-nen-ok">Nén và gửi</button>
        <button class="btn outline block mt-8" id="al-nen-thoi">Thôi, để lần khác</button>
      `, 'Gửi video dài');

      let daQuyet = false;
      document.getElementById('al-nen-thoi').onclick = () => {
        if (daQuyet) return;
        daQuyet = true; UI.closeModal(); xong(null);
      };
      document.getElementById('al-nen-ok').onclick = async () => {
        if (daQuyet) return;
        daQuyet = true;
        let boCuoc = false;
        UI.modal(`
          <div class="center">
            <div style="font-size:34px">⏳</div>
            <h3 class="mt-8">Đang nén video</h3>
            <div class="muted small mt-8" id="al-nen-dongho">Đang chuẩn bị…</div>
            <div class="muted small mt-8" style="line-height:1.7">
              Xin cô để nguyên màn hình này tới khi xong.
            </div>
          </div>
          <button class="btn outline block mt-14" id="al-nen-dung">Dừng lại</button>
        `, 'Đang nén video');
        document.getElementById('al-nen-dung').onclick = () => { boCuoc = true; };

        const phutGiay = (g) => `${Math.floor(g / 60)}:${String(Math.floor(g % 60)).padStart(2, '0')}`;
        try {
          const data = await UI.nenVideo(f, {
            tranByte: this.TRAN_VIDEO,
            toiDaGiay: this.TOI_DA_GIAY_VIDEO,
            huy: () => boCuoc,
            tien: ({ giay, tongGiay }) => {
              const o = document.getElementById('al-nen-dongho');
              if (o) o.textContent = `${phutGiay(giay)} / ${phutGiay(tongGiay)}`;
            },
          });
          UI.closeModal();
          xong(data);
        } catch (err) {
          UI.closeModal();
          // Máy không nén được thì nói bằng tiếng của trường, không để lọt một
          // chữ tiếng Anh nào ra màn hình của cô.
          hong(err && err.message === 'KHONG_NEN_DUOC'
            ? new Error('Máy này chưa nén được video. Cô quay đoạn ngắn hơn '
              + `(dưới ${Math.round(this.TRAN_VIDEO / 1048576)} MB) giúp trường nhé.`)
            : err);
        }
      };
    });
  },

  bindPicker() {
    const input = document.getElementById('al-file');
    document.getElementById('al-pick').onclick = () => input.click();
    input.onchange = () => this.handleFiles(input.files);
  },

  // Đọc ảnh người dùng chọn, thu nhỏ rồi đưa vào danh sách chờ.
  async handleFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;

    const zone = document.getElementById('al-preview');
    if (zone) zone.insertAdjacentHTML('beforeend', '<div class="muted small" id="al-loading">Đang xử lý ảnh…</div>');

    for (const f of files) {
      // VIDEO: KHÔNG NÉN ĐƯỢC, NÊN CHẶN NGAY Ở ĐÂY.
      //
      // Máy chủ cũng chặn, nhưng chặn ở đây thì cô biết ngay lúc chọn tệp —
      // thay vì đứng chờ tải lên 25 MB qua 4G rồi mới nhận câu từ chối.
      if (/^video\/(mp4|webm)$/.test(f.type)) {
        try {
          const video = f.size > this.TRAN_VIDEO
            ? await this.nenVideoCoCho(f)
            : await this.docTep(f);
          if (video) this._pending.push({ video, caption: '', name: f.name, laVideo: true });
        } catch (err) {
          UI.toast(err && err.message ? err.message : `Không đọc được video "${f.name}"`, 'error');
        }
        continue;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        UI.toast(`Bỏ qua "${f.name}" — chỉ nhận ảnh JPG, PNG, WebP và video MP4, WebM`, 'error');
        continue;
      }
      try {
        const dataUrl = await UI.nenAnh(f, { canhToiDa: 1600 });
        this._pending.push({ dataUrl, caption: '', name: f.name });
      } catch (_) {
        UI.toast(`Không đọc được ảnh "${f.name}"`, 'error');
      }
    }

    const loading = document.getElementById('al-loading');
    if (loading) loading.remove();
    this.renderPreview();
    document.getElementById('al-file').value = ''; // cho phép chọn lại đúng ảnh đó
  },



  renderPreview() {
    const zone = document.getElementById('al-preview');
    if (!zone) return;
    if (!this._pending.length) {
      zone.innerHTML = '<div class="muted small">Chưa chọn ảnh nào.</div>';
      return;
    }
    zone.innerHTML = this._pending.map((p, i) => `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
        ${p.laVideo
          ? `<div style="width:56px;height:56px;flex:none;border-radius:10px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px">🎬</div>`
          : `<img src="${p.dataUrl}" alt="" style="width:56px;height:56px;flex:none;border-radius:10px;object-fit:cover">`}
        <input class="al-cap" data-i="${i}" value="${UI.esc(p.caption)}" placeholder="Chú thích ảnh (không bắt buộc)">
        <button class="btn outline sm" style="flex:none;padding:9px 11px" title="Bỏ ảnh này"
          onclick="App.views.albums.removePending(${i})">${UI.icon('x', 16)}</button>
      </div>`).join('') +
      `<div class="muted small">Đã chọn ${this._pending.length} ảnh.</div>`;

    // Ghi nhớ chú thích ngay khi gõ để không mất khi danh sách vẽ lại.
    zone.querySelectorAll('.al-cap').forEach(inp => {
      inp.oninput = () => { this._pending[Number(inp.dataset.i)].caption = inp.value; };
    });
  },

  removePending(i) {
    this._pending.splice(i, 1);
    this.renderPreview();
  },

  // Gửi ảnh theo từng nhóm nhỏ để không vượt giới hạn dung lượng mỗi lần gửi.
  // GOM LÔ: ba ảnh một lượt, NHƯNG VIDEO THÌ MỘT MÌNH MỘT LƯỢT.
  //
  // Thân yêu cầu của máy chủ là 12 MB. Ba tấm ảnh đã nén thì thừa sức lọt; hai
  // video 8 MB thì base64 lên hơn 21 MB và bị Express từ chối bằng một lỗi
  // trơ trước khi tới mã của ta.
  //
  // Bản đầu để nguyên `BATCH = 3` cho cả hai loại. Bắt được khi đọc lại
  // `server.js` trước lúc commit, chứ không phải khi cô đứng ở sân trường.
  chiaLo(photos) {
    const lo = [];
    let hienTai = [];
    for (const p of photos) {
      if (p && p.laVideo) {
        if (hienTai.length) { lo.push(hienTai); hienTai = []; }
        lo.push([p]);
        continue;
      }
      hienTai.push(p);
      if (hienTai.length === 3) { lo.push(hienTai); hienTai = []; }
    }
    if (hienTai.length) lo.push(hienTai);
    return lo;
  },

  async uploadInBatches(photos, sendBatch, onProgress) {
    let sent = 0;
    for (const batch of this.chiaLo(photos)) {
      await sendBatch(batch);
      sent += batch.length;
      if (onProgress) onProgress(sent, photos.length);
    }
    return sent;
  },

  setSubmitting(text) {
    const btn = document.getElementById('al-submit');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = text;
  },

  async submitCreate() {
    const title = document.getElementById('al-title').value.trim();
    const description = document.getElementById('al-desc').value.trim();
    if (!title) return UI.toast('Cô nhập tên album giúp nhé', 'error');
    if (!this._pending.length) return UI.toast('Cô chọn ít nhất 1 ảnh nhé', 'error');

    const photos = this._pending;
    this._nhacGanTheSauKhiDang = false;
    try {
      this.setSubmitting('Đang tải ảnh lên…');
      // Tạo album với nhóm đầu, phần còn lại gửi bổ sung sau.
      // Nhóm đầu lấy theo đúng luật chia lô ở trên — nếu không thì lượt tạo
      // album có thể ôm ba video cùng lúc và vỡ thân yêu cầu.
      const first = this.chiaLo(photos)[0] || [];
      const cheDo = (document.getElementById('al-che-do') || {}).value || 'cong-khai';
      const album = await API.post('/api/albums', { title, description, cheDo, photos: first });

      const rest = photos.slice(first.length);
      if (rest.length) {
        await this.uploadInBatches(
          rest,
          batch => API.post(`/api/albums/${album.id}/photos`, { photos: batch }),
          (sent) => this.setSubmitting(`Đang tải ảnh lên… ${first.length + sent}/${photos.length}`),
        );
      }

      UI.toast(`Đã đăng album với ${photos.length} ảnh`, 'success');
      UI.closeModal();
      this._pending = [];
      App.navigate(`#/albums/${album.id}`);
      App.refreshBadges();
    } catch (err) {
      UI.toast(err.message, 'error');
      const btn = document.getElementById('al-submit');
      if (btn) { btn.disabled = false; btn.textContent = 'Đăng album'; }
    }
  },

  async submitAddPhotos() {
    const a = this._detail;
    if (!a) return;
    if (!this._pending.length) return UI.toast('Cô chọn ít nhất 1 ảnh nhé', 'error');

    const photos = this._pending;
    try {
      this.setSubmitting('Đang tải ảnh lên…');
      await this.uploadInBatches(
        photos,
        async (batch) => {
          const r = await API.post(`/api/albums/${a.id}/photos`, { photos: batch });
          if (r && r.nhacGanThe) this._nhacGanTheSauKhiDang = true;
          return r;
        },
        (sent) => this.setSubmitting(`Đang tải ảnh lên… ${sent}/${photos.length}`),
      );
      // Nhóm có gia đình từ chối thì nhắc gắn thẻ NGAY, không đợi cô mở lại
      // album: lúc vừa đăng là lúc duy nhất cô còn nhớ chắc trong ảnh là bé nào.
      UI.toast(this._nhacGanTheSauKhiDang
        ? `Đã thêm ${photos.length} ảnh. Cô bấm vào từng ảnh để gắn thẻ bé nhé.`
        : `Đã thêm ${photos.length} ảnh vào album`, 'success');
      UI.closeModal();
      this._pending = [];
      App.route();
    } catch (err) {
      UI.toast(err.message, 'error');
      const btn = document.getElementById('al-submit');
      if (btn) { btn.disabled = false; btn.textContent = 'Tải ảnh lên'; }
    }
  },

  async deletePhoto(photoId) {
    const a = this._detail;
    if (!a) return;
    if (!confirm('Xóa ảnh này khỏi album?')) return;
    try {
      await API.del(`/api/albums/${a.id}/photos/${photoId}`);
      UI.toast('Đã xóa ảnh', 'success');
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async deleteAlbum() {
    const a = this._detail;
    if (!a) return;
    if (!confirm(`Xóa album "${a.title}" cùng toàn bộ ảnh bên trong?`)) return;
    try {
      await API.del(`/api/albums/${a.id}`);
      UI.toast('Đã xóa album', 'success');
      App.navigate('#/albums');
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};
