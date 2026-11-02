// Quản trị — tab Cơ sở: danh sách cơ sở, thông tin liên hệ của trường, gắn nhóm
// lớp vào cơ sở.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // Tab Cơ sở — trường có ba cơ sở, dữ liệu giữa chúng phải độc lập.
  //
  // Chưa khai báo cơ sở nào thì cả tầng cơ sở nằm im và app chạy y như trước;
  // màn này nói thẳng điều đó thay vì hiện một danh sách trống không lời.
  async tabCoSo(body) {
    const [ds, d] = await Promise.all([
      API.get('/api/admin/campuses'),
      API.get('/api/admin/overview'),
    ]);
    this._coso = ds;
    this._lop = d.classes;
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

      ${ds.length ? `
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
});
