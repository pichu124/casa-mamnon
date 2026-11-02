// Quản trị — tab Tài khoản: danh sách tài khoản theo cơ sở, tạo quản trị, đổi chức vụ
// và cơ sở phụ trách, cấp lại mật khẩu, phân cô vào nhóm, thẻ Phụ huynh & bé của
// văn phòng (cũng hiện ở tab Thông tin bé & nhân sự), tạo tài khoản cô.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
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

  // ---------- Tài khoản & phân quyền (Đ239d1 — góp ý 16/10, mục 5) ----------
  //
  // Trường hỏi: "tạo tài khoản cho giáo viên, phụ huynh ở đâu, phân quyền ở chỗ
  // nào". Phần lớn việc đã có nhưng rải ở ba tab và mấy hộp thoại; tab này gom
  // lại theo NGƯỜI LÀM, mỗi vai thấy đúng phần việc của mình.
  //
  // MÁY CHỦ QUYẾT VẼ NÚT NÀO (`quyenTaiKhoan` trong /api/admin/overview), màn
  // hình không tự kể mã chức vụ ra — cùng lý do với thẻ thông báo đẩy ở Cài
  // đặt (Đ157). Đó cũng chỉ là chỉ đường: chốt thật vẫn là từng đường API.
  _tk: null,

  // L1: danh sách đọc từ `/api/accounts/danh-sach`, gom theo Cơ sở → nhóm lớp.
  // Mỗi dòng mang cờ `capLai` tính bằng đúng luật của đường cấp lại, nên nút
  // "Cấp lại mật khẩu" chỉ vẽ ở dòng máy chủ sẽ nhận. Hai thẻ đổi chức vụ và
  // gán cơ sở ở tab Cơ sở dời về đây, thành hai ô chọn ngay trên dòng.
  async tabTaiKhoan(body) {
    const gioiThieu = `
      <div class="card">
        <div class="card-title">Ai tạo tài khoản nào</div>
        <div class="muted small" style="line-height:1.7">
          <b>Ban giám hiệu</b> tạo tài khoản quản trị: Cấp 2 (Nhân sự, Kế toán, Marketing),
          quản lý cơ sở, văn phòng cơ sở, bảo vệ cổng.<br>
          <b>Quản lý cơ sở</b> tạo tài khoản cô, phân cô vào nhóm và chuyển cô giữa các nhóm.<br>
          <b>Văn phòng cơ sở</b> tạo tài khoản gia đình (khi nhận bé, hoặc thêm phụ huynh cho bé đã có),
          chuyển nhóm cho bé, ghi nghỉ học bảo lưu.<br>
          <b>Cấp lại mật khẩu</b>: văn phòng cơ sở cho gia đình của cơ sở mình; quản lý cơ sở cho cô,
          nhân viên và gia đình của cơ sở mình; ban giám hiệu cho mọi tài khoản.
          Nút chỉ hiện ở dòng mình cấp lại được.
        </div>
      </div>`;
    let d;
    try {
      d = await API.get('/api/admin/overview');
    } catch (err) {
      body.innerHTML = gioiThieu + UI.emptyState('🔒', err.message || 'Tài khoản này không có việc nào ở đây');
      return;
    }
    const q = d.quyenTaiKhoan || {};
    this._lop = d.classes || [];
    // Kế toán, Marketing, Bảo vệ nhận 403 ở danh sách: đó là "không có việc ở
    // đây", không phải lỗi. Lỗi khác (mất mạng…) thì nói đúng câu của máy chủ.
    const [ds, chucVu, quanTri] = await Promise.all([
      API.get('/api/accounts/danh-sach').catch(err => ({ loi: err })),
      q.taoQuanTri ? API.get('/api/admin/chuc-vu') : [],
      q.doiChucVu ? API.get('/api/admin/managers') : [],
    ]);
    const loiDs = ds.loi && ds.loi.status !== 403 ? ds.loi.message : '';
    const coSo = ds.loi ? [] : ds.coSo || [];
    const dong = new Map();
    for (const r of ds.loi ? [] : this.tkMoiDong(ds)) dong.set(r.id, r);
    this._tk = { q, coSo: d.campuses || [], chucVu, quanTri: new Map(quanTri.map(u => [u.id, u])), dong };
    const phan = (q.taoQuanTri ? this.theQuanTri(ds.loi ? [] : ds.quanTri || []) : '')
      + (coSo.length ? this.theCoSo(coSo) : '')
      + (q.nhanBe ? this.theVanPhong() : '');
    body.innerHTML = gioiThieu
      + (dong.size ? this.tkOTim() : '')
      + (loiDs && phan ? `<div class="card"><div class="muted small">${UI.esc(loiDs)}</div></div>` : '')
      + (phan || UI.emptyState('🔒', loiDs
        || 'Tài khoản này không tạo hay phân công tài khoản nào. Cần thì nhờ ban giám hiệu.'));
  },

  // Mọi dòng của danh sách, để tra theo mã khi bấm nút trên một dòng.
  tkMoiDong(ds) {
    return [
      ...(ds.quanTri || []),
      ...(ds.coSo || []).flatMap(k => [
        ...k.nhanVien, ...k.coChuaNhom, ...k.nhom.flatMap(n => [...n.co, ...n.phuHuynh]),
      ]),
    ];
  },

  tkOTim() {
    return `
      <div class="card">
        <div class="field" style="margin:0">
          <input id="tk-tim" type="search" autocomplete="off"
            placeholder="Tìm theo tên, tên đăng nhập hoặc số điện thoại"
            oninput="App.views.admin.tkLoc(this.value)">
        </div>
        <div class="muted small mt-8" id="tk-khong-thay" style="display:none">Không tìm thấy tài khoản nào khớp.</div>
      </div>`;
  },

  // Bỏ dấu để gõ "hong" vẫn ra "Hồng" — trên điện thoại, gõ có dấu chậm.
  tkGap(chu) {
    return String(chu || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/đ/g, 'd');
  },

  tkLoc(chu) {
    const body = document.getElementById('admin-body');
    if (!body) return;
    const tim = this.tkGap(chu).trim();
    const so = String(chu || '').replace(/\D/g, '');
    let thay = 0;
    body.querySelectorAll('.list-row[data-tim]').forEach(r => {
      const khop = !tim || r.dataset.tim.includes(tim) || (so.length >= 3 && r.dataset.so.includes(so));
      r.style.display = khop ? '' : 'none';
      if (khop) thay++;
    });
    // Khối không còn dòng nào khớp thì ẩn; khối có dòng khớp thì mở ra.
    body.querySelectorAll('details.tk-khoi').forEach(k => {
      const conDong = [...k.querySelectorAll('.list-row[data-tim]')].some(r => r.style.display !== 'none');
      k.style.display = !tim || conDong ? '' : 'none';
      if (tim && conDong) k.open = true;
    });
    const o = document.getElementById('tk-khong-thay');
    if (o) o.style.display = tim && !thay ? '' : 'none';
  },

  theQuanTri(ds) {
    const { q } = this._tk;
    return `
      <div class="card" id="tk-quan-tri">
        <div class="card-title">Tài khoản quản trị<span class="spacer"></span>
          <button class="btn sm primary" onclick="App.views.admin.taoQuanTri()">+ Tạo tài khoản quản trị</button>
        </div>
        <div class="muted small mb-8" style="line-height:1.6">
          Tài khoản mới nhận <b>mật khẩu tạm</b> hiện đúng một lần, và phải đổi ở lần đăng nhập đầu.
          Tài khoản Ban giám hiệu chỉ tạo bằng lệnh trên máy chủ.
        </div>
        ${q.doiChucVu ? `
        <div class="muted small mb-8" style="line-height:1.6">
          Chức vụ quyết định <b>mở được phần nào</b>. Để trống là <b>ban giám hiệu</b> —
          làm được mọi việc. Chọn một chức vụ là <b>bớt đi</b>, không bao giờ thêm quyền.
          <b>Quản lý cơ sở</b> và <b>Văn phòng cơ sở</b> cần được gắn vào một cơ sở — không gắn
          thì họ vẫn nhìn thấy <b>mọi cơ sở</b>. Tài khoản đã gắn cơ sở nằm trong khối của
          cơ sở ấy bên dưới.
        </div>` : ''}
        ${ds.map(r => this.tkDong(r)).join('') || '<div class="muted small">Chưa có tài khoản nào.</div>'}
      </div>`;
  },

  theCoSo(ds) {
    const { q } = this._tk;
    return `
      <div class="card" id="tk-co-so">
        <div class="card-title">Cơ sở và nhóm lớp<span class="spacer"></span>
          ${q.taoCo ? '<button class="btn sm primary" onclick="App.views.admin.themGiaoVien()">+ Tạo tài khoản cô</button>' : ''}
        </div>
        <div class="muted small mb-8" style="line-height:1.6">
          Cô chỉ xem được hồ sơ bé của những nhóm cô được phân vào.
          ${q.phanCongCo ? '<b>Chuyển nhóm</b> là một bước: cô rời nhóm đi, vào nhóm đến và giữ nguyên vai đang có.' : ''}
        </div>
        ${ds.map(k => this.tkKhoiCoSo(k, ds.length === 1)).join('')}
      </div>`;
  },

  tkKhoiCoSo(k, moSan) {
    const dem = [k.nhom.length && `${k.nhom.length} nhóm`, k.nhanVien.length && `${k.nhanVien.length} nhân viên`]
      .filter(Boolean).join(' · ');
    const trong = !k.nhanVien.length && !k.nhom.length && !k.coChuaNhom.length;
    return `
      <details class="tk-khoi" style="margin-bottom:6px"${moSan ? ' open' : ''}>
        <summary style="cursor:pointer;padding:10px 4px;font-weight:700">${UI.esc(k.ten || 'Toàn trường')}${
  dem ? ` <span class="muted small" style="font-weight:400">(${UI.esc(dem)})</span>` : ''}</summary>
        ${k.nhanVien.length ? this.tkMuc('Nhân viên cơ sở', '', k.nhanVien.map(r => this.tkDong(r, { coSo: k })).join('')) : ''}
        ${k.nhom.map(n => this.tkNhom(n)).join('')}
        ${k.coChuaNhom.length ? this.tkMuc('Cô chưa phân nhóm', '', k.coChuaNhom.map(r => this.tkDong(r)).join('')) : ''}
        ${trong ? '<div class="muted small" style="padding:4px">Cơ sở này chưa có tài khoản nào.</div>' : ''}
      </details>`;
  },

  tkNhom(n) {
    const dem = [n.co.length && `${n.co.length} cô`, n.phuHuynh.length && `${n.phuHuynh.length} gia đình`]
      .filter(Boolean).join(' · ');
    const dong = n.co.map(r => this.tkDong(r, { nhom: n })).join('') + n.phuHuynh.map(r => this.tkDong(r)).join('');
    return this.tkMuc(n.ten, dem, dong || '<div class="muted small" style="padding:4px">Nhóm chưa có tài khoản nào.</div>');
  },

  tkMuc(tieuDe, dem, html) {
    return `
      <details class="tk-khoi" open style="margin:4px 0 6px 4px">
        <summary style="cursor:pointer;padding:8px 4px;font-weight:600">${UI.esc(tieuDe)}${
  dem ? ` <span class="muted small" style="font-weight:400">(${UI.esc(dem)})</span>` : ''}</summary>
        ${html}
      </details>`;
  },

  // Một dòng tài khoản. `nhom`: nhóm lớp đang vẽ (dòng cô); `coSo`: khối cơ sở
  // đang vẽ (dòng nhân viên cơ sở).
  tkDong(r, { nhom, coSo } = {}) {
    const { q, chucVu, quanTri } = this._tk;
    const tenVai = Object.fromEntries(this.VAI_CO);
    const phu = [];
    let nut = '';
    let chon = '';
    if (r.loai === 'phu-huynh') {
      phu.push(UI.esc([r.username, r.sdt].filter(Boolean).join(' · ')));
      if ((r.con || []).length) phu.push(`Phụ huynh của bé ${UI.esc(r.con.join(', '))}`);
    } else if (r.loai === 'co') {
      phu.push(UI.esc(r.username));
      phu.push(nhom
        ? `${UI.esc(nhom.ten)}: ${UI.esc(tenVai[r.nhomCo] || tenVai['chu-nhiem'])}${r.coChinh ? ' · cô chính' : ''}`
        : 'Chưa phụ trách nhóm nào');
      if (q.phanCongCo) {
        nut = nhom
          ? `<button class="btn sm outline" onclick="App.views.admin.chuyenNhomCo('${UI.esc(r.id)}')">Chuyển nhóm</button>`
          : `<button class="btn sm outline" onclick="App.views.admin.phanCoVaoNhom('${UI.esc(r.id)}')">Phân vào nhóm</button>`;
      }
    } else {
      // Chỉ cấp 1 đọc được `/api/admin/managers`, nên chỉ cấp 1 có `m`.
      const m = quanTri.get(r.id);
      phu.push(UI.esc(`${r.username} · ${r.chucVuTen || 'Ban giám hiệu'} · ${coSo ? (coSo.ten || 'một cơ sở') : 'cả trường'}`));
      const mo = m && m.chucVu ? (chucVu.find(c => c.ma === m.chucVu) || {}).moTa : '';
      if (mo) phu.push(UI.esc(mo));
      // Máy chủ không cho tự đổi chức vụ hay tự khoá mình vào một cơ sở.
      if (q.doiChucVu && m && r.id !== App.state.user.id) {
        const cs = this._tk.coSo;
        chon = `
          <div class="flex mt-8" style="gap:6px;flex-wrap:wrap">
            <select class="tk-chon-cv" aria-label="Chức vụ" style="max-width:100%"
              onchange="App.views.admin.datChucVu('${UI.esc(r.id)}', this.value)">
              <option value="">— Ban giám hiệu —</option>
              ${chucVu.filter(c => c.ma !== 'hieu-truong').map(c => `
                <option value="${UI.esc(c.ma)}"${c.ma === m.chucVu ? ' selected' : ''}>${UI.esc(c.ten)}</option>`).join('')}
            </select>
            ${cs.length ? `
            <select class="tk-chon-cs" aria-label="Cơ sở" style="max-width:100%"
              onchange="App.views.admin.datCoSoChoQuanTri('${UI.esc(r.id)}', this.value)">
              <option value="">— Cả trường —</option>
              ${cs.map(c => `<option value="${UI.esc(c.id)}"${c.id === m.campusId ? ' selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
            </select>` : ''}
          </div>`;
      }
    }
    if (r.capLai) {
      nut += `<button class="btn sm outline" onclick="App.views.admin.capLaiMatKhau('${UI.esc(r.id)}')">Cấp lại mật khẩu</button>`;
    }
    const tim = this.tkGap([r.hoTen, r.username, r.sdt, ...(r.con || [])].join(' '));
    return `
      <div class="list-row" data-loai="${UI.esc(r.loai || '')}" data-tim="${UI.esc(tim)}" data-so="${UI.esc(String(r.sdt || '').replace(/\D/g, ''))}">
        <div class="row-main">
          <div class="row-title">${UI.esc(r.hoTen)}</div>
          ${phu.map(x => `<div class="row-sub">${x}</div>`).join('')}
          ${r.matKhauTam ? `<div class="mt-8">${UI.badge('Chưa đổi mật khẩu', 'orange')}</div>` : ''}
          ${chon}
        </div>
        ${nut ? `<div class="row-end" style="display:flex;flex-direction:column;gap:6px">${nut}</div>` : ''}
      </div>`;
  },

  taoQuanTri() {
    const chon = (this._tk.chucVu || []).filter(c => c.cap !== 1);
    UI.modal(`
      <div class="field"><label>Họ tên</label><input id="tk-qt-ten" placeholder="Nguyễn Thị Lan"></div>
      <div class="field"><label>Tên đăng nhập</label>
        <input id="tk-qt-tdn" placeholder="quanly.coso1" autocapitalize="off" autocomplete="off">
        <div class="hint">Chữ thường không dấu, số, dấu chấm hoặc gạch dưới; 3–30 ký tự.</div></div>
      <div class="field"><label>Chức vụ</label>
        <select id="tk-qt-cv">
          <option value="">— Chọn chức vụ —</option>
          ${chon.map(c => `<option value="${UI.esc(c.ma)}">${UI.esc(c.ten)}</option>`).join('')}
        </select>
        <div class="hint" id="tk-qt-mota"></div></div>
      <div class="field" id="tk-qt-o-cs" style="display:none"><label>Cơ sở</label>
        <select id="tk-qt-cs">
          <option value="">— Chọn cơ sở —</option>
          ${this._tk.coSo.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}
        </select>
        <div class="hint">Tài khoản chỉ thấy đúng cơ sở này.</div></div>
      <button class="btn primary block" id="tk-qt-luu">Tạo tài khoản</button>
    `, 'Tạo tài khoản quản trị');

    const oCv = document.getElementById('tk-qt-cv');
    const dangChon = () => chon.find(c => c.ma === oCv.value);
    oCv.onchange = () => {
      const c = dangChon();
      document.getElementById('tk-qt-mota').textContent = c ? c.moTa : '';
      document.getElementById('tk-qt-o-cs').style.display = c && c.cap === 3 ? '' : 'none';
    };

    const nut = document.getElementById('tk-qt-luu');
    nut.onclick = async () => {
      if (nut.disabled) return;
      const c = dangChon();
      const than = {
        name: document.getElementById('tk-qt-ten').value,
        username: document.getElementById('tk-qt-tdn').value,
        chucVu: oCv.value,
      };
      // Chỉ gửi cơ sở khi chức vụ cần: chức vụ cả trường mà kèm cơ sở thì
      // máy chủ từ chối, và ô cơ sở đang ẩn vẫn giữ lựa chọn cũ.
      if (c && c.cap === 3) than.campusId = document.getElementById('tk-qt-cs').value;
      nut.disabled = true;
      try {
        const r = await API.post('/api/admin/managers', than);
        this.hienMatKhauTam(`${r.name} · ${r.chucVuTen}`, r.username, r.temporaryPassword,
          'Người nhận sẽ được yêu cầu đặt mật khẩu riêng ngay ở lần đăng nhập đầu.');
      } catch (err) {
        UI.toast(err.message, 'error');
        nut.disabled = false;
      }
    };
  },

  // Các nhóm (trong phạm vi người xem) mà cô đang dạy, kèm dòng của cô ở nhóm đó.
  nhomCuaCoTk(teacherId) {
    return (this._lop || [])
      .map(c => ({ c, o: (c.teachers || []).find(x => x.id === teacherId) }))
      .filter(x => x.o);
  },

  coTheoMa(teacherId) {
    return ((this._tk || {}).dong || new Map()).get(teacherId) || null;
  },

  chuyenNhomCo(teacherId) {
    const t = this.coTheoMa(teacherId);
    if (!t) return;
    const dangDay = this.nhomCuaCoTk(teacherId).map(x => x.c);
    const khac = (this._lop || []).filter(c => !dangDay.some(x => x.id === c.id));
    if (!khac.length) return UI.toast('Chưa có nhóm nào khác để chuyển cô sang', 'error');
    const oChon = (ds) => ds.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('');
    UI.modal(`
      <div class="muted small mb-8" style="line-height:1.6">
        Cô rời nhóm đi và vào nhóm đến trong một bước, giữ nguyên vai đang có. Từ lúc
        bấm, cô thôi xem được hồ sơ bé của nhóm đi.
      </div>
      <div class="field"><label>Nhóm đi</label><select id="tk-cn-tu">${oChon(dangDay)}</select></div>
      <div class="field"><label>Nhóm đến</label><select id="tk-cn-den">${oChon(khac)}</select></div>
      <button class="btn primary block" id="tk-cn-luu">Chuyển nhóm</button>
    `, `Chuyển nhóm cho ${t.hoTen}`);
    const nut = document.getElementById('tk-cn-luu');
    nut.onclick = async () => {
      if (nut.disabled) return;
      nut.disabled = true;
      try {
        await API.post(`/api/admin/teachers/${encodeURIComponent(teacherId)}/chuyen-nhom`, {
          tuNhom: document.getElementById('tk-cn-tu').value,
          denNhom: document.getElementById('tk-cn-den').value,
        });
        UI.toast(`Đã chuyển ${t.hoTen} sang nhóm mới`, 'success');
        UI.closeModal();
        App.route();
      } catch (err) {
        UI.toast(err.message, 'error');
        nut.disabled = false;
      }
    };
  },

  // Cô chưa phụ trách nhóm nào: thêm cô vào MỘT nhóm, giữ nguyên các cô đang
  // dạy nhóm đó — đi qua đúng đường phân công của màn Sửa nhóm.
  phanCoVaoNhom(teacherId) {
    const t = this.coTheoMa(teacherId);
    const lop = this._lop || [];
    if (!t) return;
    if (!lop.length) return UI.toast('Chưa có nhóm nào để phân cô vào', 'error');
    UI.modal(`
      <div class="field"><label>Nhóm</label>
        <select id="tk-pv-nhom">${lop.map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Vai của cô ở nhóm này</label>
        <select id="tk-pv-vai">${this.VAI_CO.map(([ma, ten]) => `<option value="${UI.esc(ma)}">${UI.esc(ten)}</option>`).join('')}</select></div>
      <div class="muted small mb-8">Các cô đang phụ trách nhóm giữ nguyên. Cô xem được hồ sơ bé của nhóm ngay khi lưu.</div>
      <button class="btn primary block" id="tk-pv-luu">Phân vào nhóm</button>
    `, `Phân ${t.hoTen} vào nhóm`);
    const nut = document.getElementById('tk-pv-luu');
    nut.onclick = async () => {
      const c = lop.find(x => x.id === document.getElementById('tk-pv-nhom').value);
      if (!c || nut.disabled) return;
      const chinh = (c.teachers || []).find(x => x.vaiTro === 'chinh');
      nut.disabled = true;
      try {
        await API.put(`/api/admin/classes/${encodeURIComponent(c.id)}/teachers`, {
          teacherIds: [...(c.teachers || []).map(x => x.id), teacherId],
          chinhId: chinh ? chinh.id : null,
          nhom: { [teacherId]: document.getElementById('tk-pv-vai').value },
        });
        UI.toast(`Đã phân ${t.hoTen} vào ${c.name}`, 'success');
        UI.closeModal();
        App.route();
      } catch (err) {
        UI.toast(err.message, 'error');
        nut.disabled = false;
      }
    };
  },

  // Cấp lại cho bất kỳ dòng nào của danh sách — nút chỉ có ở dòng `capLai`.
  async capLaiMatKhau(userId) {
    const r = ((this._tk || {}).dong || new Map()).get(userId);
    if (!r) return;
    const giaDinh = r.loai === 'phu-huynh';
    if (!confirm(`Cấp mật khẩu tạm mới cho ${r.hoTen}?\n\nMật khẩu cũ sẽ không dùng được nữa và ${
      giaDinh ? 'gia đình' : 'người này'} sẽ bị đăng xuất khỏi mọi thiết bị.`)) return;
    const nguoi = giaDinh ? 'Gia đình' : r.loai === 'co' ? 'Cô' : 'Người nhận';
    try {
      const k = await API.post(`/api/accounts/${encodeURIComponent(userId)}/reset-password`);
      this.hienMatKhauTam(r.hoTen, k.username, k.temporaryPassword,
        `${nguoi} sẽ được yêu cầu đặt mật khẩu riêng ngay sau khi đăng nhập.`);
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Phần việc của văn phòng cơ sở với gia đình và bé (Đ239d2): bốn việc trường
  // kể ra, mỗi việc một nút. Ban giám hiệu và quản lý cơ sở cũng thấy khối này.
  theVanPhong() {
    const { q } = this._tk;
    return `
      <div class="card" id="tk-van-phong">
        <div class="card-title">Phụ huynh &amp; bé</div>
        <div style="display:flex;flex-direction:column;gap:6px" class="mb-8">
          <button class="btn sm primary" onclick="App.views.admin.tkNhanBeMoi()">Nhận bé mới (nhập đủ thông tin)</button>
          <button class="btn sm outline" onclick="App.views.admin.tkThemPhuHuynh()">Thêm phụ huynh cho bé</button>
          <button class="btn sm outline" onclick="App.views.admin.tkChuyenNhomBe()">Chuyển nhóm cho bé</button>
          <button class="btn sm outline" onclick="App.views.admin.tkBaoLuu()">Nghỉ học bảo lưu / Đi học lại</button>
        </div>
        <div class="muted small mb-8" style="line-height:1.7">
          Nhận bé là tạo luôn tài khoản gia đình; nhà đã có con học ở trường thì nối vào tài khoản cũ
          theo số điện thoại. Thêm phụ huynh thì luôn là tài khoản mới. Dữ liệu của bé nghỉ học hay
          bảo lưu đều giữ nguyên.<br>
          <b>Gia đình quên mật khẩu:</b> ${q.capLaiPhuHuynh
    ? 'tìm nhà đó ở tab <b>Tài khoản</b> (theo tên hoặc số điện thoại), bấm <b>Cấp lại mật khẩu</b>.'
    : 'văn phòng cơ sở, quản lý cơ sở hoặc ban giám hiệu cấp lại ở tab <b>Tài khoản</b>.'}
        </div>
        ${(this._lop || []).map(c => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(c.name)}</div>
              <div class="row-sub">${UI.esc(String(c.studentCount))} bé</div>
            </div>
            <div class="row-end" style="display:flex;gap:6px">
              <button class="btn sm outline" onclick="App.views.admin.xemLop('${UI.esc(c.id)}')">Xem bé</button>
              <button class="btn sm primary" onclick="App.views.admin.nhanBeVaoNhom('${UI.esc(c.id)}')">Nhận bé</button>
            </div>
          </div>`).join('') || '<div class="muted small">Chưa có nhóm nào.</div>'}
      </div>`;
  },

  nhanBeVaoNhom(classId) {
    const c = (this._lop || []).find(x => x.id === classId);
    if (!c) return;
    // Bấm "Xong" trên phiếu nhận bé là mở lại danh sách của ĐÚNG nhóm này.
    this._lopDangXem = { classId, tenLop: c.name };
    this.moNhanBe(classId, c.name);
  },

  oChonNhomTk() {
    return `<div class="field"><label>Nhóm</label><select id="tk-cb-nhom">${(this._lop || [])
      .map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}</select></div>`;
  },

  tkNhanBeMoi() {
    if (!(this._lop || []).length) return UI.toast('Chưa có nhóm nào để nhận bé vào', 'error');
    UI.modal(`${this.oChonNhomTk()}
      <button class="btn primary block" id="tk-cb-tiep">Tiếp</button>`, 'Nhận bé mới');
    document.getElementById('tk-cb-tiep').onclick = () => this.nhanBeVaoNhom(document.getElementById('tk-cb-nhom').value);
  },

  // Chọn nhóm → chọn bé, rồi giao bé cho `khiChon`. `chuNut(s)` đặt chữ trên
  // nút theo bé đang chọn (đang học / bảo lưu / đã nghỉ).
  async chonBeTk(tieuDe, { keCaNghi = false, chuNut = () => 'Tiếp' } = {}, khiChon) {
    const lop = this._lop || [];
    if (!lop.length) return UI.toast('Chưa có nhóm nào', 'error');
    UI.modal(`${this.oChonNhomTk()}
      <div class="field"><label>Bé</label><select id="tk-cb-be"></select></div>
      <button class="btn primary block" id="tk-cb-tiep" disabled>Tiếp</button>`, tieuDe);
    const oNhom = document.getElementById('tk-cb-nhom');
    const oBe = document.getElementById('tk-cb-be');
    const nut = document.getElementById('tk-cb-tiep');
    let ds = [];
    const dangChon = () => ds.find(x => x.id === oBe.value);
    const capNhatNut = () => {
      const s = dangChon();
      nut.disabled = !s;
      nut.textContent = s ? chuNut(s) : 'Tiếp';
    };
    const trangThai = (s) => (s.active === false ? (s.baoLuu ? ' — bảo lưu' : ' — đã nghỉ') : '');
    // Đổi nhóm hai lần liền tay: chỉ câu trả lời của LẦN CUỐI được vẽ, không
    // để danh sách bé của nhóm trước về muộn rồi đè lên.
    let luot = 0;
    const napBe = async () => {
      const luotNay = ++luot;
      nut.disabled = true;
      oBe.innerHTML = '<option value="">Đang tải…</option>';
      let moi = [];
      try {
        moi = await API.get(`/api/admin/students?classId=${encodeURIComponent(oNhom.value)}${keCaNghi ? '&keCaNghi=1' : ''}`);
      } catch (err) { UI.toast(err.message, 'error'); }
      if (luotNay !== luot || !oBe.isConnected) return;
      ds = moi;
      oBe.innerHTML = ds.length
        ? ds.map(s => `<option value="${UI.esc(s.id)}">${UI.esc(s.name + trangThai(s))}</option>`).join('')
        : '<option value="">Nhóm chưa có bé nào</option>';
      capNhatNut();
    };
    oNhom.onchange = napBe;
    oBe.onchange = capNhatNut;
    nut.onclick = () => {
      const s = dangChon();
      const c = lop.find(x => x.id === oNhom.value);
      if (!s || !c) return;
      // Xong việc thì mở lại danh sách của ĐÚNG nhóm này (lamMoiLop).
      this._lopDangXem = { classId: c.id, tenLop: c.name };
      khiChon(s);
    };
    await napBe();
  },

  tkThemPhuHuynh() {
    return this.chonBeTk('Thêm phụ huynh cho bé', {}, s => this.moThemPhuHuynh(s));
  },

  tkBaoLuu() {
    return this.chonBeTk('Nghỉ học bảo lưu / Đi học lại', {
      keCaNghi: true,
      chuNut: s => (s.active === false ? (s.baoLuu ? 'Cho bé đi học lại' : 'Nhận lại bé') : 'Ghi nghỉ học bảo lưu'),
    }, s => {
      if (s.active !== false) return this.choBaoLuu(s.id);
      return s.baoLuu ? this.diHocLai(s.id) : this.nhanLaiHocSinh(s.id);
    });
  },

  tkChuyenNhomBe() {
    return this.chonBeTk('Chuyển nhóm cho bé', {}, s => {
      const khac = (this._lop || []).filter(c => c.id !== s.classId);
      if (!khac.length) return UI.toast('Chưa có nhóm nào khác để chuyển bé sang', 'error');
      UI.modal(`
        <div class="muted small mb-8" style="line-height:1.6">Đang ở nhóm <b>${UI.esc(s.className || '—')}</b>.
          Chuyển xong, cô của nhóm đến xem được hồ sơ của bé; cô nhóm cũ thì thôi.</div>
        <div class="field"><label>Nhóm đến</label><select id="tk-cnb-den">${khac
    .map(c => `<option value="${UI.esc(c.id)}">${UI.esc(c.name)}</option>`).join('')}</select></div>
        <button class="btn primary block" id="tk-cnb-luu">Chuyển nhóm</button>
      `, `Chuyển nhóm cho ${s.name}`);
      const nut = document.getElementById('tk-cnb-luu');
      nut.onclick = async () => {
        if (nut.disabled) return;
        nut.disabled = true;
        const den = khac.find(c => c.id === document.getElementById('tk-cnb-den').value);
        try {
          await API.put(`/api/admin/students/${encodeURIComponent(s.id)}`, { classId: den.id });
          UI.toast(`Đã chuyển ${s.name} sang ${den.name}`, 'success');
          this._lopDangXem = { classId: den.id, tenLop: den.name };
          App.route();
          await this.lamMoiLop();
        } catch (err) {
          UI.toast(err.message, 'error');
          nut.disabled = false;
        }
      };
    });
  },

  // ---------- Tạo một tài khoản cô (nút ở tab Tài khoản) ----------
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
    `, 'Thêm cô');

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
          <p>Đã tạo tài khoản cho <b>${UI.esc(r.name)}</b>. Đọc thông tin sau cho cô:</p>
          <div class="card" style="margin:14px 0;text-align:center;background:var(--primary-tint);border-color:var(--primary)">
            <div class="muted small">Tên đăng nhập</div>
            <div style="font-size:1.2rem;font-weight:800">${UI.esc(r.username)}</div>
            <div class="muted small mt-14">Mật khẩu ban đầu</div>
            <div style="font-size:1.5rem;font-weight:800;letter-spacing:.1em;font-family:ui-monospace,monospace">${UI.esc(r.temporaryPassword)}</div>
          </div>
          <p class="muted small">Mật khẩu chỉ hiện một lần. Cô sẽ được yêu cầu đổi khi đăng nhập.</p>
          <button class="btn primary block mt-14" onclick="UI.closeModal();App.route()">Đã ghi lại</button>
        `, 'Tài khoản cô', { giuKhiBamNen: true });
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },
});
