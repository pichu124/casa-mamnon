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
          // Máy chủ từ chối vì dữ liệu sai (400/403) thì có gửi lại bao nhiêu
          // lần cũng vậy — bỏ khỏi hàng đợi để không kẹt mãi. Lỗi mạng thì giữ.
          if (err && /không hợp lệ|không thuộc|quyền/i.test(err.message || '')) {
            await this.xoaKhoiMay(rec.id);
          }
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
  async render(root) {
    const con = await this.dangCho().catch(() => []);
    let kq = { soLan: 0 };
    let ds = { ghiNhan: [], soBe: 0 };
    let mang = true;
    try {
      [kq, ds] = await Promise.all([
        API.get('/api/thuchup/ket-qua'),
        API.get('/api/thuchup'),
      ]);
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

      ${con.length ? `
        <div class="card" style="border-left:4px solid var(--warning)">
          <div class="row-title">${con.length} bài ghi đang chờ gửi lên</div>
          <div class="row-sub" style="margin-top:4px">
            Đã lưu an toàn trong máy. ${mang
              ? 'Đang gửi…'
              : 'Sẽ tự gửi khi có mạng trở lại.'}
          </div>
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
    const btnGui = document.getElementById('tc-gui');
    if (btnGui) btnGui.onclick = async () => {
      const { gui, con: conLai } = await this.guiHangDoi();
      UI.toast(gui ? `Đã gửi ${gui} bài ghi` : `Chưa gửi được, còn ${conLai} bài chờ`,
        gui ? 'success' : 'error');
      App.route();
    };

    if (con.length && mang) {
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
    this._be = this._be && ds.some(s => s.id === this._be) ? this._be : ds[0].id;

    UI.modal(`
      ${dataUrl ? `<img src="${dataUrl}" alt=""
        style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:12px">` : ''}
      <div class="field"><label>Bé nào?</label>
        <div id="tc-be" style="display:flex;flex-wrap:wrap;gap:8px">
          ${ds.map(s => `<button type="button" class="btn sm ${s.id === this._be ? 'primary' : 'outline'}"
            data-id="${UI.esc(s.id)}">${UI.esc(s.name)}</button>`).join('')}
        </div>
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

  // Ảnh máy ảnh điện thoại 3-8MB, sau bước này còn vài trăm KB — quan trọng vì
  // ảnh phải nằm vừa trong máy lúc mất mạng rồi mới gửi đi sau.
  nenAnh(file, maxDim = 1280, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const xong = (bm, w0, h0) => {
        const scale = Math.min(1, maxDim / Math.max(w0, h0));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w0 * scale));
        cv.height = Math.max(1, Math.round(h0 * scale));
        cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: 'from-image' })
          .then(bm => xong(bm, bm.width, bm.height))
          .catch(() => this.nenQuaImg(file, maxDim, quality).then(resolve, reject));
        return;
      }
      this.nenQuaImg(file, maxDim, quality).then(resolve, reject);
    });
  },

  nenQuaImg(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const doc = new FileReader();
      doc.onerror = () => reject(new Error('Không đọc được tệp'));
      doc.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Ảnh hỏng'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * scale));
          cv.height = Math.max(1, Math.round(img.height * scale));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', quality));
        };
        img.src = doc.result;
      };
      doc.readAsDataURL(file);
    });
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
