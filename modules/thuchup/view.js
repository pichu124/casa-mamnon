// Màn hình phép thử GĐ 0 — "ghi lại một khoảnh khắc của bé trong dưới 20 giây".
//
// Ba điều màn này phải chứng minh được, và đều đo bằng máy chứ không hỏi cảm
// tính của cô:
//   1. NHANH — bấm giờ từ lúc cô chạm nút tới lúc lưu xong, hiện số giây lên.
//   2. KHÔNG MẤT — lưu vào máy trước, gửi lên sau. Mất mạng vẫn lưu được.
//   3. KHÔNG NHÂN ĐÔI — mỗi lần ghi mang một mã riêng do máy của cô sinh; gửi
//      lại bao nhiêu lần máy chủ cũng chỉ nhận một bản.
//
// Điều 2 và 3 quan trọng nhất với iPhone: khi app đóng, iOS KHÔNG cho gửi ngầm.
// Nên hàng đợi được đẩy đi vào lần cô mở app kế tiếp, và phải chịu được cảnh
// cùng một bản ghi gửi đi vài lần.
App.views.thuchup = {
  _KHO: 'casa-thuchup',
  _BANG: 'hangdoi',
  _dangGui: false,

  // ---- Hàng đợi trong máy (IndexedDB) ----------------------------------
  // Dùng IndexedDB chứ không dùng localStorage: một tấm ảnh đã nén vẫn vài trăm
  // KB, localStorage chỉ khoảng 5MB cho cả app và khi đầy thì ném lỗi giữa chừng
  // — đúng lúc cô đang vội thì mất bài ghi.
  _moKho() {
    return new Promise((resolve, reject) => {
      const yc = indexedDB.open(this._KHO, 1);
      yc.onupgradeneeded = () => {
        const db = yc.result;
        if (!db.objectStoreNames.contains(this._BANG)) {
          db.createObjectStore(this._BANG, { keyPath: 'id' });
        }
      };
      yc.onsuccess = () => resolve(yc.result);
      yc.onerror = () => reject(yc.error || new Error('Không mở được kho trong máy'));
    });
  },

  _viec(che, fn) {
    return this._moKho().then(db => new Promise((resolve, reject) => {
      const gd = db.transaction(this._BANG, che);
      const kq = fn(gd.objectStore(this._BANG));
      gd.oncomplete = () => resolve(kq && kq.result !== undefined ? kq.result : kq);
      gd.onerror = () => reject(gd.error || new Error('Lỗi kho trong máy'));
    }));
  },

  luuVaoMay(rec) { return this._viec('readwrite', kho => kho.put(rec)); },
  xoaKhoiMay(id) { return this._viec('readwrite', kho => kho.delete(id)); },
  dangCho() { return this._viec('readonly', kho => kho.getAll()); },

  // ---- Gửi lên máy chủ --------------------------------------------------
  // Chỉ xoá khỏi máy SAU KHI máy chủ xác nhận. Gửi được nhưng mất sóng trước khi
  // nhận trả lời thì bản ghi còn nguyên trong máy và sẽ gửi lại — máy chủ nhận
  // ra mã trùng nên không tạo bản thứ hai.
  async guiHangDoi() {
    if (this._dangGui) return { gui: 0, con: 0 };
    this._dangGui = true;
    let gui = 0;
    try {
      const ds = await this.dangCho();
      for (const rec of ds) {
        try {
          await API.post('/api/thuchup', {
            id: rec.id,
            studentId: rec.studentId,
            dataUrl: rec.dataUrl || null,
            note: rec.note || '',
            giay: rec.giay,
            ngoaiTuyen: rec.ngoaiTuyen ? 1 : 0,
            choBaoLau: (Date.now() - rec.luuLuc) / 1000,
            taoLuc: rec.taoLuc,
          });
          await this.xoaKhoiMay(rec.id);
          gui++;
        } catch (err) {
          const loi = (err && err.message) || '';

          // KHÔNG BAO GIỜ XOÁ BÀI GHI CỦA CÔ VÌ MỘT LỖI QUYỀN.
          //
          // Mẫu chữ cũ có `không thuộc` và `quyền`, tức mọi câu từ chối 403 của
          // máy chủ đều làm bài ghi BIẾN MẤT HẲN khỏi máy cô, không một chữ báo.
          // Mà lỗi quyền ở đây gần như luôn là chuyện TẠM THỜI và sửa được:
          // văn phòng vừa đổi phân công nhóm, nhóm vừa được đóng lại, nhà
          // trường vừa tắt phân hệ, hay cô bấm nhầm sang bé nhóm khác.
          //
          // Bài ghi là thứ cô gõ giữa lớp, về một khoảnh khắc đã qua. Xoá nó đi
          // là mất vĩnh viễn — đúng thứ điều 2 ở đầu tệp này hứa là KHÔNG MẤT.
          // Kẹt trong hàng đợi thì còn cứu được; xoá rồi thì không.
          //
          // Chỉ còn đúng một loại lỗi được phép bỏ: ẢNH HỎNG. Và ngay cả ở đó
          // cũng GIỮ LẠI DÒNG CHỮ, chỉ bỏ tấm ảnh rồi gửi lại — chữ cô viết
          // đáng giá hơn tấm ảnh không đọc được.
          if (/ảnh không hợp lệ|ảnh quá lớn|ảnh hỏng/i.test(loi)) {
            if (rec.dataUrl && (rec.note || '').trim()) {
              await this.luuVaoMay({ ...rec, dataUrl: null, anhBiBo: true });
            } else {
              await this.xoaKhoiMay(rec.id);
            }
            continue;
          }

          // BÀI VÔ VỌNG THÌ BỎ QUA, KHÔNG DỪNG CẢ HÀNG.
          //
          // Hàng đợi này dừng ở bản ghi lỗi đầu tiên — đúng cho lỗi TẠM THỜI
          // (mất sóng, hết phiên, máy chủ bận): gửi tiếp cũng hỏng, và giữ
          // nguyên thứ tự thì lần sau gửi lại từ đầu là xong.
          //
          // Nhưng lời từ chối vì gia đình đã dừng hồ sơ học tập (Đ96) thì VĨNH
          // VIỄN. Bài ấy không bao giờ gửi được, mà nó lại CHẶN mọi bài xếp
          // sau nó trong cùng hàng đợi — nghĩa là một bé đã rút đồng ý làm kẹt
          // luôn bài ghi của những bé khác. Con số "đang chờ gửi" cứ tăng, và
          // không có nút nào để gỡ.
          //
          // Nhận ra bằng DANH SÁCH MÃ BÉ máy chủ gửi kèm, KHÔNG phải bằng cách
          // dò câu chữ của lời từ chối — cách ấy đã hỏng một lần rồi, đúng như
          // khối chú thích ngay bên trên kể lại.
          if (this._ngungHoSo && this._ngungHoSo.has(rec.studentId)) {
            await this.luuVaoMay({ ...rec, viNgungHoSo: true });
            continue;
          }

          // Mọi lỗi khác — mạng, quyền, máy chủ bận — thì GIỮ. Nhớ lại câu từ
          // chối để màn hình nói được cho cô biết vì sao bài còn nằm chờ.
          this._loiHangDoi = loi;
          break;
        }
      }
    } finally {
      this._dangGui = false;
    }
    const con = (await this.dangCho()).length;
    return { gui, con };
  },

  // ---- Màn hình ---------------------------------------------------------
  // Tên bé để nói với cô, không phải mã. `App.state.students` là danh sách bé
  // của chính cô, đã có sẵn từ lúc đăng nhập.
  tenBe(id) {
    const s = (App.state.students || []).find(x => x.id === id);
    return s ? s.name : 'bé này';
  },

  async render(root) {
    const con = await this.dangCho().catch(() => []);
    // Tách hai loại: bài còn hy vọng gửi được, và bài vô vọng vì gia đình đã
    // dừng hồ sơ học tập. Gộp chung thì con số "đang chờ" cứ tăng mãi và cô
    // không có cách nào biết bài nào cần mình xử lý.
    const keta = con.filter(r => r.viNgungHoSo);
    const cho = con.filter(r => !r.viNgungHoSo);
    let kq = { soLan: 0 };
    let ds = { ghiNhan: [], soBe: 0 };
    let mang = true;
    try {
      [kq, ds] = await Promise.all([
        API.get('/api/thuchup/ket-qua'),
        API.get('/api/thuchup'),
      ]);
      // Nhớ lại để hàng đợi và ô chọn bé cùng dùng. Giữ bản cũ khi mất mạng:
      // thà dùng danh sách hôm qua còn hơn coi như không bé nào đã dừng.
      if (Array.isArray(ds.beNgungHoSo)) this._ngungHoSo = new Set(ds.beNgungHoSo);
    } catch (err) { mang = false; }

    root.innerHTML = `
      ${UI.pageHeader('Ghi nhanh')}

      <div class="card" style="border-left:4px solid #5fb36a">
        <div class="row-title">Đây là phép thử, chưa phải bản dùng thật</div>
        <div class="row-sub" style="margin-top:6px">
          Cô thử ghi lại vài khoảnh khắc như lúc đứng lớp. Máy tự bấm giờ.
          <b>Hãy thử cả lúc tắt mạng</b> — ghi xong, đóng app, mở lại để xem
          bài ghi có tự gửi lên không.
        </div>
      </div>

      <button class="btn primary block" id="tc-ghi"
        style="font-size:1.15rem;padding:18px">📸 Ghi nhanh một khoảnh khắc</button>

      ${keta.length ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="row-title">${keta.length} bài ghi KHÔNG gửi lên được</div>
          <div class="row-sub" style="margin-top:4px;line-height:1.6">
            Gia đình những bé này đã dừng phần hồ sơ học tập, nên bài ghi sẽ không
            bao giờ gửi lên được. App <b>không tự xoá</b> phần cô đã gõ — cô đọc lại
            rồi tự quyết định.
          </div>
          ${keta.map(r => `
            <div class="list-row">
              <div class="row-main">
                <div class="row-title">${UI.esc(this.tenBe(r.studentId))}</div>
                <div class="row-sub">${UI.esc((r.note || '(chỉ có ảnh)').slice(0, 90))}</div>
              </div>
              <button class="btn sm outline" data-bo="${UI.esc(r.id)}">Bỏ bài này</button>
            </div>`).join('')}
        </div>` : ''}

      ${cho.length ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="row-title">${cho.length} bài ghi đang chờ gửi lên</div>
          <div class="row-sub" style="margin-top:4px">
            Đã lưu an toàn trong máy. ${mang
              ? 'Đang gửi…'
              : 'Sẽ tự gửi khi có mạng trở lại.'}
          </div>
          ${this._loiHangDoi ? `
          <!-- NÓI RA VÌ SAO BÀI CÒN NẰM CHỜ.
               Trước đây máy chủ từ chối là bài BIẾN MẤT không một chữ. Nay bài
               được giữ lại — nhưng giữ mà không nói thì cô lại tưởng app hỏng. -->
          <div class="row-sub" style="margin-top:6px;color:var(--warning)">
            Lần gửi gần nhất chưa được: ${UI.esc(this._loiHangDoi)}
            <br>Bài ghi vẫn còn nguyên trong máy, không mất đi đâu cả.
          </div>` : ''}
          <button class="btn sm outline mt-8" id="tc-gui">Thử gửi ngay</button>
        </div>` : ''}

      ${kq.soLan ? `
        <div class="stat-row">
          <div class="stat-box">
            <div class="stat-num" style="color:${kq.trungVi < 20 ? 'var(--success)' : 'var(--danger)'}">
              ${kq.trungVi}s</div>
            <div class="stat-label">Thường mất</div>
          </div>
          <div class="stat-box"><div class="stat-num">${kq.nhanhNhat}s</div><div class="stat-label">Nhanh nhất</div></div>
          <div class="stat-box"><div class="stat-num">${kq.chamNhat}s</div><div class="stat-label">Chậm nhất</div></div>
        </div>
        <div class="card">
          <div class="row-sub">
            ${kq.duoi20Giay}/${kq.soLan} lần ghi xong dưới 20 giây${
              kq.soLanNgoaiTuyen ? ` · ${kq.soLanNgoaiTuyen} lần ghi lúc mất mạng` : ''}.
          </div>
        </div>` : ''}

      ${ds.ghiNhan.length ? `
        <div class="card">
          ${ds.ghiNhan.map(g => `
            <div class="list-row">
              ${g.file
                ? `<img src="/api/thuchup/anh/${encodeURIComponent(g.id)}" alt=""
                     style="width:52px;height:52px;flex:none;border-radius:10px;object-fit:cover">`
                : '<span class="row-icon">📝</span>'}
              <div class="row-main">
                <div class="row-title">${UI.esc(g.tenBe)}</div>
                <div class="row-sub">${UI.esc(g.note || '')}</div>
              </div>
              <div class="row-end">
                ${g.giay != null ? UI.badge(g.giay + 's', g.giay < 20 ? 'green' : 'orange') : ''}
                ${g.ngoaiTuyen ? UI.badge('ngoại tuyến', 'gray') : ''}
                <button class="btn sm outline" data-xoa-gn="${UI.esc(g.id)}"
                  title="Ghi nhầm bé — xoá bản này">${UI.icon('x', 14)}</button>
              </div>
            </div>`).join('')}
        </div>`
        : (mang ? UI.emptyState('📸', 'Chưa có bài ghi nào — bấm nút trên để thử') : '')}

      ${!mang ? `<div class="card"><div class="row-sub">
        Đang mất mạng nên chưa xem được danh sách trên máy chủ. Vẫn ghi được bình thường.
      </div></div>` : ''}`;

    document.getElementById('tc-ghi').onclick = () => this.batDau();

    // GHI NHẦM BÉ — đường lùi cho một cú bấm nhầm.
    //
    // Ghi nhanh là ghi chép thô của cô, và cô ghi nhanh nghĩa là ghi vội. Không
    // có đường xoá thì một bản ghi sai bé nằm lại trong danh sách của đứa trẻ
    // khác, kèm ảnh của đứa trẻ khác.
    for (const el of root.querySelectorAll('[data-xoa-gn]')) {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Xoá bản ghi này? Ảnh kèm theo cũng được dọn, và không lấy lại được.')) return;
        try {
          await API.del(`/api/thuchup/${encodeURIComponent(el.dataset.xoaGn)}`);
          UI.toast('Đã xoá bản ghi', 'success');
          App.route();
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
    // Nút "Bỏ bài này" — chỉ cô bấm, app không bao giờ tự xoá phần cô đã gõ.
    for (const nut of root.querySelectorAll('button[data-bo]')) {
      nut.onclick = async () => {
        if (!confirm('Bỏ hẳn bài ghi này khỏi máy? Không lấy lại được.')) return;
        await this.xoaKhoiMay(nut.dataset.bo);
        UI.toast('Đã bỏ bài ghi khỏi máy', 'success');
        App.route();
      };
    }

    const btnGui = document.getElementById('tc-gui');
    if (btnGui) btnGui.onclick = async () => {
      const { gui, con: conLai } = await this.guiHangDoi();
      UI.toast(gui ? `Đã gửi ${gui} bài ghi` : `Chưa gửi được, còn ${conLai} bài chờ`,
        gui ? 'success' : 'error');
      App.route();
    };

    if (cho.length && mang) {
      this.guiHangDoi().then(({ gui }) => { if (gui) App.route(); });
    }
  },

  // Bấm giờ bắt đầu từ ĐÂY — lúc cô chạm nút, không phải lúc màn hình hiện ra.
  // Đo từ lúc mở màn hình sẽ ra con số đẹp giả tạo nếu cô để máy nằm đó một lúc.
  batDau() {
    this._moLuc = Date.now();
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/jpeg,image/png,image/webp';
    inp.capture = 'environment';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      let dataUrl = null;
      if (f) {
        try { dataUrl = await UI.nenAnh(f, { chatLuong: 0.75 }); }
        catch (err) { UI.toast('Không đọc được ảnh, cô ghi chữ cũng được', 'error'); }
      }
      this.moForm(dataUrl);
    };
    // Cô có thể bỏ qua ảnh: nếu đóng máy ảnh mà không chụp thì vẫn mở ô ghi chữ.
    inp.oncancel = () => { inp.remove(); this.moForm(null); };
    inp.click();
  },

  moForm(dataUrl) {
    const ds = App.state.students || [];
    if (!ds.length) return UI.toast('Chưa có bé nào trong nhóm cô phụ trách', 'error');
    const moDuoc = ds.filter(s => !(this._ngungHoSo && this._ngungHoSo.has(s.id)));
    if (!moDuoc.length) {
      return UI.toast('Cả nhóm đều đã dừng phần hồ sơ học tập — cô ghi ở Nhật ký ngày nhé', 'error');
    }
    this._be = this._be && moDuoc.some(s => s.id === this._be) ? this._be : moDuoc[0].id;

    UI.modal(`
      ${dataUrl ? `<img src="${dataUrl}" alt=""
        style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:12px">` : ''}
      <div class="field"><label>Bé nào?</label>
        <div id="tc-be" style="display:flex;flex-wrap:wrap;gap:8px">
          ${ds.map(s => {
            const ngung = this._ngungHoSo && this._ngungHoSo.has(s.id);
            return `<button type="button" class="btn sm ${s.id === this._be ? 'primary' : 'outline'}"
              data-id="${UI.esc(s.id)}"${ngung ? ' disabled style="opacity:.45"' : ''}
              >${UI.esc(s.name)}${ngung ? ' 🔒' : ''}</button>`;
          }).join('')}
        </div>
        ${ds.some(s => this._ngungHoSo && this._ngungHoSo.has(s.id)) ? `
          <div class="hint">Bé có dấu 🔒 là gia đình đã dừng phần hồ sơ học tập.
          Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.</div>` : ''}
      </div>
      <div class="field"><label>Cô thấy gì?</label>
        <textarea id="tc-note" rows="2" maxlength="500"
          placeholder="Ví dụ: An tự xúc hết bát cơm, không cần cô nhắc"></textarea></div>
      <button class="btn primary block" id="tc-luu">Lưu</button>
    `, 'Ghi nhanh');

    const hop = document.getElementById('tc-be');
    hop.onclick = (e) => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      this._be = b.dataset.id;
      [...hop.querySelectorAll('button')].forEach(x => {
        x.className = 'btn sm ' + (x.dataset.id === this._be ? 'primary' : 'outline');
      });
    };
    setTimeout(() => document.getElementById('tc-note').focus(), 50);
    document.getElementById('tc-luu').onclick = () => this.luu(dataUrl);
  },

  async luu(dataUrl) {
    const note = (document.getElementById('tc-note').value || '').trim();
    if (!dataUrl && !note) {
      return UI.toast('Cần một tấm ảnh hoặc một dòng ghi chú', 'error');
    }
    const giay = (Date.now() - this._moLuc) / 1000;

    const rec = {
      id: this.maMoi(),
      studentId: this._be,
      dataUrl,
      note,
      giay: Math.round(giay * 10) / 10,
      ngoaiTuyen: !navigator.onLine,
      taoLuc: new Date().toISOString(),
      luuLuc: Date.now(),
    };

    // Lưu vào máy TRƯỚC. Từ giây này bài ghi của cô không mất nữa, dù mạng thế
    // nào. Việc gửi lên máy chủ là chuyện xảy ra sau và có thể thất bại.
    try {
      await this.luuVaoMay(rec);
    } catch (err) {
      return UI.toast('Máy không lưu được, cô thử lại giúp', 'error');
    }

    UI.closeModal();
    UI.toast(`Đã lưu trong ${rec.giay} giây`, 'success');
    App.route();
    this.guiHangDoi().then(({ gui }) => { if (gui) App.route(); });
  },

  // Mã do máy của cô sinh, dùng làm khoá chống nhân đôi ở máy chủ.
  maMoi() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const r = () => Math.floor(Math.random() * 1e9).toString(36);
    return `tc-${Date.now().toString(36)}-${r()}-${r()}`;
  },
};

// ===========================================================================
// ĐẨY HÀNG ĐỢI NGAY KHI APP MỞ — KHÔNG CHỜ CÔ MỞ ĐÚNG MÀN NÀY
// ===========================================================================
//
// Bản đầu gắn máy nghe sự kiện `online` bên trong `render()`. Nghĩa là hàng đợi
// chỉ được đẩy đi khi cô MỞ ĐÚNG màn Ghi nhanh. Cô chụp lúc mất sóng ở sân
// trường, rồi cả ngày không mở lại đúng màn đó — bài ghi nằm im trong máy, và
// màn hình không nói gì cả.
//
// Đó là hỏng đúng thứ phép thử quyết định của GĐ 0 đang đo: "tắt mạng, đóng
// app, mở lại → tự gửi lên, không mất".
//
// Chỗ đúng để gắn là NGAY KHI TỆP NÀY ĐƯỢC NẠP. `App.loadModules()` tải view.js
// của MỌI phân hệ đang bật ngay sau khi đăng nhập (public/js/app.js), nên đoạn
// dưới chạy mỗi lần cô mở app — dù cô đang định vào màn nào.
//
// Cố ý KHÔNG đụng `public/js/app.js`: đó là tệp dùng chung, sửa nó phải là một
// commit riêng và một phân hệ cắm thêm thì không được quyền bắt cả app biết về
// mình. Đặt ở đây thì phân hệ tự lo phần của nó, gỡ phân hệ đi là mất luôn.
(() => {
  const V = App.views.thuchup;
  if (V._daGanDay) return;
  V._daGanDay = true;

  const day = () => V.guiHangDoi()
    // Chỉ vẽ lại khi cô ĐANG đứng ở màn này. Gọi App.route() lúc cô đang ở màn
    // khác là màn của cô tự nhiên nhấp nháy vì một việc chạy ngầm.
    .then(({ gui }) => { if (gui && String(location.hash || '').startsWith('#/thuchup')) App.route(); })
    .catch(() => { /* mất mạng hoặc chưa mở được kho — lần sau đẩy tiếp */ });

  window.addEventListener('online', day);

  // Và đẩy luôn một lần lúc mở app: iOS KHÔNG cho gửi ngầm khi app đóng, nên
  // sự kiện `online` có thể đã xảy ra từ lúc app còn đang tắt và không ai nghe.
  if (navigator.onLine) day();
})();
