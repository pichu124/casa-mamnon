// Phân hệ Xin phép nghỉ học.
//
// Ba màn, ba việc khác nhau:
//   • Phụ huynh gửi đơn và theo dõi đơn của từng con.
//   • CÔ chỉ ĐỌC đơn của nhóm mình, để biết hôm nào bé vắng. Không có nút duyệt.
//   • VĂN PHÒNG duyệt, và ngay lúc duyệt thì chốt luôn có hoàn tiền ăn hay không.
//
// Vì sao cô không duyệt nữa: nhà trường yêu cầu như vậy. Duyệt một đơn nghỉ ở
// mầm non kéo theo tiền ăn của tháng, mà tiền thì cô không cầm và không đối
// chiếu — bắt cô quyết là bắt cô chịu trách nhiệm về thứ cô không nắm.
App.views.leave = {
  STATUS: {
    pending: { label: 'Chờ duyệt', cls: 'orange' },
    approved: { label: 'Đã duyệt', cls: 'green' },
    rejected: { label: 'Từ chối', cls: 'red' },
  },
  _list: [],

  async render(root, params = []) {
    const vai = App.state.user.role;
    // Quản trị trước đây rơi vào màn của phụ huynh — mà quản trị thì không có
    // "con đang chọn", nên màn đó vốn đã không dùng được. Nay văn phòng là
    // người duyệt, nên phải vào đúng màn duyệt.
    if (vai === 'teacher' || vai === 'admin') await this.renderTeacher(root);
    else await this.renderParent(root);
    // '#/leave/lich-nghi' — lối vào từ màn Điểm danh của văn phòng (D5).
    if (params[0] === 'lich-nghi') {
      const o = document.getElementById('lich-nghi-truong');
      if (o) o.scrollIntoView({ block: 'start' });
    }
  },

  laVanPhong() { return App.state.user.role === 'admin'; },

  // ---- LỊCH NGHỈ CỦA TRƯỜNG (Đ147) ----
  //
  // Đứng chung màn với đơn xin phép, cố ý: với gia đình thì hai thứ trả lời
  // cùng một câu hỏi — "mai con có phải đi học không". Tách ra hai chỗ là bắt
  // người ta nhớ hôm nay phải mở chỗ nào.
  LOAI_NGHI: { le: 'Nghỉ lễ', he: 'Nghỉ hè', tet: 'Nghỉ Tết', khac: 'Đợt nghỉ khác' },
  _lichNghi: null,
  _hienDotCu: false,

  // Hỏng phần này thì KHÔNG được kéo cả màn Xin phép xuống theo: đơn của gia
  // đình là việc chính ở đây, lịch nghỉ là việc phụ đứng cạnh.
  async napLichNghi() {
    try { this._lichNghi = await API.get('/api/leave/lich-nghi'); }
    catch (err) { this._lichNghi = { dot: [], duocSua: false, hong: err.message }; }
    return this._lichNghi;
  },

  theLichNghi() {
    const d = this._lichNghi;
    if (!d) return '';
    if (d.hong) {
      return `<div class="section-label" id="lich-nghi-truong">Lịch nghỉ của trường</div>
        <div class="card"><div class="muted small">Chưa xem được lịch nghỉ lúc này. Cô thử mở lại màn sau ít phút giúp nhé.</div></div>`;
    }
    const homNay = UI.todayStr();
    const sapToi = (d.dot || []).filter(x => x.denNgay >= homNay);
    const daQua = (d.dot || []).filter(x => x.denNgay < homNay);
    const hien = this._hienDotCu ? [...sapToi, ...daQua] : sapToi;
    return `
      <div class="section-label" id="lich-nghi-truong">Lịch nghỉ của trường</div>
      ${d.duocSua ? `<button class="btn outline block mb-8" onclick="App.views.leave.openDot('')">
        ${UI.icon('plus', 16)} Thêm đợt nghỉ
      </button>` : ''}
      ${hien.length ? `<div class="card">
        ${hien.map(x => `
          <div class="list-row${d.duocSua ? ' clickable' : ''}"
               ${d.duocSua ? `onclick="App.views.leave.openDot('${UI.esc(x.id)}')"` : ''}>
            <div class="row-main">
              <div class="row-title">${UI.esc(x.ten)}</div>
              <div class="row-sub">${UI.esc(this.fmtKhoang(x.tuNgay, x.denNgay))}${x.tenCoSo ? ` · ${UI.esc(x.tenCoSo)}` : ' · Cả trường'}</div>
              <div class="row-sub">${UI.esc(x.hoanTienAn === 'co' ? 'Có hoàn tiền ăn' : 'Không hoàn tiền ăn')}${x.ghiChu ? ` · ${UI.esc(x.ghiChu)}` : ''}</div>
            </div>
            <div class="row-end">${UI.badge(this.LOAI_NGHI[x.loai] || this.LOAI_NGHI.khac, 'gray')}</div>
          </div>`).join('')}
      </div>` : UI.emptyState('📅', d.duocSua
        ? 'Chưa đặt đợt nghỉ nào. Nhà trường thêm lịch nghỉ lễ, nghỉ hè, nghỉ Tết ở đây — những ngày đó các bé được ghi là nghỉ có phép và được hoàn tiền ăn, gia đình không phải gửi đơn.'
        : 'Nhà trường chưa đăng lịch nghỉ nào.')}
      ${daQua.length && !this._hienDotCu ? `
        <button class="btn outline block mt-8" onclick="App.views.leave.moDotCu()">
          ${UI.icon('calendar', 16)} Xem ${UI.esc(String(daQua.length))} đợt đã qua
        </button>` : ''}`;
  },

  moDotCu() { this._hienDotCu = true; App.route(); },

  openDot(id) {
    const d = this._lichNghi || {};
    const x = (d.dot || []).find(k => k.id === id) || {
      id: '', ten: '', tuNgay: UI.todayStr(), denNgay: UI.todayStr(),
      loai: 'le', campusId: d.coSoCuaToi || '', hoanTienAn: 'co', ghiChu: '',
    };
    const moi = !x.id;
    const dsCoSo = d.danhSachCoSo || [];
    // Tài khoản bị khoá vào một cơ sở thì KHÔNG mời chọn cơ sở khác — mời rồi
    // từ chối là để người ta gõ xong mới biết mình không được phép.
    const khoaCoSo = !!d.coSoCuaToi;
    UI.modal(`
      <div class="field">
        <label>Tên đợt nghỉ</label>
        <input id="ln-ten" value="${UI.esc(x.ten)}" placeholder="Ví dụ: Nghỉ Tết Nguyên đán">
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Nghỉ từ ngày</label>
          <input type="date" id="ln-tu" value="${UI.esc(x.tuNgay)}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="ln-den" value="${UI.esc(x.denNgay)}">
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Loại</label>
          <select id="ln-loai">
            ${Object.keys(this.LOAI_NGHI).map(k => `<option value="${UI.esc(k)}" ${k === x.loai ? 'selected' : ''}>${UI.esc(this.LOAI_NGHI[k])}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Tiền ăn những ngày này</label>
          <select id="ln-hoan">
            <option value="co" ${x.hoanTienAn !== 'khong' ? 'selected' : ''}>Có hoàn tiền ăn</option>
            <option value="khong" ${x.hoanTienAn === 'khong' ? 'selected' : ''}>Không hoàn tiền ăn</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Áp cho cơ sở</label>
        ${khoaCoSo
          ? `<input value="${UI.esc((dsCoSo.find(c => c.id === d.coSoCuaToi) || {}).name || 'Cơ sở của mình')}" disabled>
             <div class="hint">Tài khoản này quản lý một cơ sở. Đợt nghỉ cho cả trường do ban giám hiệu đặt.</div>`
          : `<select id="ln-coso">
              <option value="" ${!x.campusId ? 'selected' : ''}>Cả trường</option>
              ${dsCoSo.map(c => `<option value="${UI.esc(c.id)}" ${c.id === x.campusId ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('')}
             </select>`}
      </div>
      <div class="field">
        <label>Ghi chú (không bắt buộc)</label>
        <input id="ln-ghichu" value="${UI.esc(x.ghiChu)}" placeholder="Ví dụ: theo lịch nghỉ lễ của nhà nước">
      </div>
      <div class="hint mb-8">Những ngày trong đợt nghỉ này, bé chưa có dòng điểm danh sẽ được ghi là
        <b>nghỉ có phép</b> — gia đình không phải gửi đơn xin nghỉ.</div>
      <button class="btn primary block" onclick="App.views.leave.luuDot('${UI.esc(x.id)}')">
        ${UI.icon('check', 18)} ${moi ? 'Thêm đợt nghỉ' : 'Lưu thay đổi'}
      </button>
      ${moi ? '' : `<button class="btn danger-soft block mt-8" onclick="App.views.leave.xoaDot('${UI.esc(x.id)}')">
        ${UI.icon('x', 18)} Xoá đợt nghỉ này
      </button>`}
    `, moi ? 'Thêm đợt nghỉ của trường' : 'Sửa đợt nghỉ');
  },

  async luuDot(id) {
    const oCoSo = document.getElementById('ln-coso');
    const than = {
      ten: document.getElementById('ln-ten').value.trim(),
      tuNgay: document.getElementById('ln-tu').value,
      denNgay: document.getElementById('ln-den').value,
      loai: document.getElementById('ln-loai').value,
      hoanTienAn: document.getElementById('ln-hoan').value,
      ghiChu: document.getElementById('ln-ghichu').value.trim(),
    };
    // Ô cơ sở bị khoá thì KHÔNG gửi trường này lên — để máy chủ tự điền cơ sở
    // của tài khoản, thay vì màn hình đoán hộ rồi gửi một mã có thể đã cũ.
    if (oCoSo) than.campusId = oCoSo.value;
    if (!than.ten) return UI.toast('Nhà trường đặt giúp tên cho đợt nghỉ nhé', 'error');
    if (!than.tuNgay || !than.denNgay) return UI.toast('Nhà trường chọn giúp hai ô ngày nhé', 'error');
    if (than.tuNgay > than.denNgay) return UI.toast('Ngày kết thúc phải sau hoặc trùng ngày bắt đầu', 'error');
    try {
      if (id) await API.put(`/api/leave/lich-nghi/${encodeURIComponent(id)}`, than);
      else await API.post('/api/leave/lich-nghi', than);
      UI.toast(id ? 'Đã lưu đợt nghỉ' : 'Đã thêm đợt nghỉ của trường', 'success');
      UI.closeModal();
      App.route();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  xoaDot(id) {
    const x = ((this._lichNghi || {}).dot || []).find(k => k.id === id);
    UI.modal(`
      <div class="center">
        <div style="font-size:34px">📅</div>
        <h3 class="mt-8">Xoá đợt nghỉ này?</h3>
        <div class="muted small mt-8" style="line-height:1.7">
          ${UI.esc(x ? x.ten : 'Đợt nghỉ')} — ${UI.esc(x ? this.fmtKhoang(x.tuNgay, x.denNgay) : '')}.<br>
          Từ giờ những ngày ấy không còn được tính là trường nghỉ nữa.
          Riêng các dòng điểm danh ĐÃ ghi ra trước đó thì <b>giữ nguyên</b>, không bị sửa lại.
        </div>
      </div>
      <button class="btn danger-soft block mt-14" id="ln-xoa-ok">${UI.icon('x', 18)} Xoá đợt nghỉ</button>
      <button class="btn outline block mt-8" onclick="UI.closeModal()">Quay lại</button>
    `, 'Xoá đợt nghỉ của trường');

    document.getElementById('ln-xoa-ok').onclick = async () => {
      try {
        await API.del(`/api/leave/lich-nghi/${encodeURIComponent(id)}`);
        UI.toast('Đã xoá đợt nghỉ', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  fmtKhoang(tu, den) {
    if (tu === den) return UI.fmtDate(tu);
    const so = Math.round((UI.parseDate(den) - UI.parseDate(tu)) / 86400000) + 1;
    return `${UI.fmtDate(tu, { weekday: false })} – ${UI.fmtDate(den, { weekday: false })} (${so} ngày)`;
  },

  // Một câu tiếng Việt cho kết quả tiền ăn. Dùng chung cho cả ba màn để không
  // có chỗ nào nói khác chỗ nào.
  cauHoanTien(l) {
    if (!l || l.status !== 'approved') return '';
    if (!l.hoanTien) return 'Văn phòng chưa ghi phần tiền ăn';
    if (l.hoanTien.hoanTienAn === 'khong') return 'Không hoàn tiền ăn';
    const n = l.hoanTien.soNgay;
    return `Hoàn tiền ăn ${n === null || n === undefined ? '' : `${n} ngày`}`.trim();
  },

  // ---- TỪNG NGÀY CỦA ĐƠN (góp ý 20/10, E1) ----
  //
  // Kết quả từng ngày nói bằng chữ trung tính: "nghỉ không phép" là một dòng
  // của sổ, không phải lời phê về bé hay về gia đình — không tô đỏ.
  TRANG_THAI_SO: {
    present: 'Có mặt', late: 'Đến muộn', absent_excused: 'Nghỉ có phép', absent_unexcused: 'Nghỉ không phép',
  },

  danhSachNgay(theoNgay) {
    return (theoNgay || []).map(x => `
      <div class="list-row" style="padding:6px 0">
        <div class="row-main">
          <div class="row-title small">${UI.esc(UI.fmtDate(x.ngay))}</div>
          <div class="row-sub">${UI.esc(x.coPhep === 'co' ? 'Nghỉ có phép' : 'Nghỉ không phép')} · ${
  UI.esc(x.duocHoan === 'co' ? 'Được hoàn tiền ăn' : 'Không hoàn tiền ăn')}${x.lyDo ? ` · ${UI.esc(x.lyDo)}` : ''}</div>
        </div>
      </div>`).join('');
  },

  // Sổ điểm danh đã có dòng do người ghi và nói khác đơn — văn phòng cần thấy.
  soKhacDon(x) {
    if (x.diemDanh !== 'da-co' || !x.diemDanhCo) return '';
    const mong = x.coPhep === 'co' ? 'absent_excused' : 'absent_unexcused';
    if (x.diemDanhCo === mong) return '';
    return `Sổ điểm danh đã ghi: ${this.TRANG_THAI_SO[x.diemDanhCo] || x.diemDanhCo} — giữ nguyên`;
  },

  // Bảng sửa từng ngày, dùng chung cho lúc duyệt và lúc sửa lại sau duyệt.
  bangSuaNgay(dong) {
    return `
      <div class="field">
        <label>Chi tiết từng ngày</label>
        <div class="hint">Máy điền sẵn gợi ý theo giờ gửi đơn, thứ trong tuần và lịch nghỉ của trường. Văn phòng sửa được từng dòng.</div>
        ${dong.map((x, i) => `
          <div class="list-row lv-ngay" data-ngay="${UI.esc(x.ngay)}" style="align-items:flex-start">
            <div class="row-main">
              <div class="row-title small">${UI.esc(UI.fmtDate(x.ngay))}</div>
              <label class="small" style="display:flex;gap:6px;align-items:center;margin:4px 0">
                <input type="checkbox" class="lv-ng-phep" id="lv-ng-phep-${i}" ${x.coPhep === 'co' ? 'checked' : ''}> Nghỉ có phép
              </label>
              <select class="lv-ng-hoan" id="lv-ng-hoan-${i}" ${x.coPhep === 'co' ? '' : 'disabled'}>
                <option value="co" ${x.duocHoan === 'co' ? 'selected' : ''}>Được hoàn tiền ăn</option>
                <option value="khong" ${x.duocHoan === 'co' ? '' : 'selected'}>Không hoàn tiền ăn</option>
              </select>
              <input class="lv-ng-lydo mt-8" id="lv-ng-lydo-${i}" value="${UI.esc(x.lyDo || '')}" placeholder="Lý do (không bắt buộc)">
              ${this.soKhacDon(x) ? `<div class="hint">${UI.esc(this.soKhacDon(x))}</div>` : ''}
            </div>
          </div>`).join('')}
        <div class="small mt-8" style="font-weight:700" id="lv-tong-hoan"></div>
      </div>`;
  },

  // Bỏ tích "có phép" thì ô hoàn tự về "không hoàn" và khoá lại — máy chủ
  // cũng không nhận một ngày nghỉ không phép mà được hoàn.
  ganBangSuaNgay() {
    const tong = () => {
      const o = document.getElementById('lv-tong-hoan');
      const n = [...document.querySelectorAll('.lv-ngay .lv-ng-hoan')].filter(s => s.value === 'co').length;
      if (o) o.textContent = n ? `Hoàn tiền ăn ${n} ngày` : 'Không hoàn tiền ăn ngày nào';
    };
    for (const dongEl of document.querySelectorAll('.lv-ngay')) {
      const phep = dongEl.querySelector('.lv-ng-phep');
      const hoan = dongEl.querySelector('.lv-ng-hoan');
      phep.onchange = () => {
        if (!phep.checked) hoan.value = 'khong';
        hoan.disabled = !phep.checked;
        tong();
      };
      hoan.onchange = tong;
    }
    tong();
  },

  docBangSuaNgay() {
    return [...document.querySelectorAll('.lv-ngay')].map(el => ({
      ngay: el.dataset.ngay,
      coPhep: el.querySelector('.lv-ng-phep').checked ? 'co' : 'khong',
      duocHoan: el.querySelector('.lv-ng-hoan').value,
      lyDo: el.querySelector('.lv-ng-lydo').value.trim(),
    }));
  },

  // ---- Phụ huynh: danh sách đơn của con đang chọn ----
  async renderParent(root) {
    this._list = await API.get('/api/leave');
    await this.napLichNghi();
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Xin phép nghỉ học') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const list = this._list.filter(l => l.studentId === current.id);
    root.innerHTML = `
      ${UI.pageHeader('Xin phép nghỉ học', { action: { id: 'btn-new-leave', label: 'Tạo đơn', icon: 'plus' } })}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}
      ${list.length ? `<div class="card">
        ${list.map(l => `
          <div class="list-row clickable" onclick="App.views.leave.showDetail('${UI.esc(l.id)}')">
            <div class="row-main">
              <div class="row-title">${UI.esc(this.fmtRange(l))}</div>
              <div class="row-sub">${UI.esc(l.reason)}</div>
            </div>
            <div class="row-end">${this.statusBadge(l.status)}</div>
          </div>`).join('')}
      </div>` : UI.emptyState('📝', `Chưa có đơn xin phép nào cho con ${current.name}. Bấm "Tạo đơn" khi gia đình cần xin nghỉ nhé.`)}
      ${this.theLichNghi()}`;
    document.getElementById('btn-new-leave').onclick = () => this.openCreate();
  },

  openCreate() {
    const students = App.state.students || [];
    const current = App.currentStudent();
    const tomorrow = this.tomorrowStr();
    UI.modal(`
      ${students.length > 1 ? `
        <div class="field">
          <label>Xin phép cho con</label>
          <select id="lv-student">
            ${students.map(s => `<option value="${UI.esc(s.id)}" ${current && s.id === current.id ? 'selected' : ''}>${UI.esc(s.name)} · ${UI.esc(s.className)}</option>`).join('')}
          </select>
        </div>` : `
        <div class="field">
          <label>Xin phép cho con</label>
          <input value="${UI.esc(current ? `${current.name} · ${current.className}` : '')}" disabled>
        </div>`}
      <div class="grid-2">
        <div class="field">
          <label>Nghỉ từ ngày</label>
          <input type="date" id="lv-from" value="${UI.esc(tomorrow)}" min="${UI.esc(UI.todayStr())}">
        </div>
        <div class="field">
          <label>Đến hết ngày</label>
          <input type="date" id="lv-to" value="${UI.esc(tomorrow)}" min="${UI.esc(UI.todayStr())}">
        </div>
      </div>
      <div class="field">
        <label>Lý do xin nghỉ</label>
        <textarea id="lv-reason" placeholder="Ví dụ: Con bị sốt nhẹ, gia đình xin phép cho con ở nhà theo dõi."></textarea>
        <div class="hint">Đơn được gửi tới văn phòng nhà trường để duyệt. Cô phụ trách cũng đọc được đơn để biết hôm đó con nghỉ.</div>
      </div>
      <button class="btn primary block" onclick="App.views.leave.submitCreate()">${UI.icon('send', 18)} Gửi đơn xin phép</button>
    `, 'Tạo đơn xin phép');
  },

  async submitCreate() {
    const sel = document.getElementById('lv-student');
    const current = App.currentStudent();
    const studentId = sel ? sel.value : (current ? current.id : null);
    const fromDate = document.getElementById('lv-from').value;
    const toDate = document.getElementById('lv-to').value;
    const reason = document.getElementById('lv-reason').value.trim();
    if (!fromDate || !toDate) return UI.toast('Gia đình chọn ngày nghỉ giúp cô nhé', 'error');
    if (fromDate > toDate) return UI.toast('Ngày bắt đầu phải trước hoặc trùng ngày kết thúc', 'error');
    if (!reason) return UI.toast('Gia đình nhập lý do xin nghỉ giúp cô nhé', 'error');
    try {
      await API.post('/api/leave', { studentId, fromDate, toDate, reason });
      UI.toast('Đã gửi đơn xin phép tới nhà trường', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  showDetail(id) {
    const l = this._list.find(x => x.id === id);
    if (!l) return;
    const st = this.STATUS[l.status] || this.STATUS.pending;
    UI.modal(`
      <div class="center">
        ${this.statusBadge(l.status)}
        <h3 class="mt-8">${UI.esc(l.studentName)}</h3>
        <div class="muted small">${UI.esc(l.className)} · Gửi ${UI.esc(UI.timeAgo(l.createdAt))}</div>
      </div>
      <div class="mt-14">
        ${infoRowLeave('Thời gian nghỉ', this.fmtRange(l))}
        ${infoRowLeave('Người gửi đơn', l.parentName)}
        ${infoRowLeave('Lý do', l.reason)}
      </div>
      ${l.status === 'pending'
        ? `<div class="muted small center mt-14">Đơn đang chờ văn phòng nhà trường duyệt, gia đình đợi thêm chút nhé.</div>`
        : `<div class="card" style="background:${l.status === 'approved' ? '#e3f7ec' : '#fde8e6'};box-shadow:none;margin:14px 0 0">
            <div class="small" style="font-weight:700;margin-bottom:4px">Phản hồi của ${UI.esc(l.reviewerName || 'nhà trường')}</div>
            <div class="small">${l.reviewNote ? UI.esc(l.reviewNote) : `${st.label === 'Đã duyệt' ? 'Nhà trường đã duyệt đơn cho con.' : 'Nhà trường chưa đồng ý với đơn này.'}`}</div>
            ${l.status === 'approved' ? `<div class="small mt-8" style="font-weight:700">${UI.esc(this.cauHoanTien(l))}</div>
              ${l.hoanTien && l.hoanTien.ghiChu ? `<div class="small">${UI.esc(l.hoanTien.ghiChu)}</div>` : ''}` : ''}
          </div>
          ${l.status === 'approved' && l.theoNgay ? `<div class="mt-14" id="lv-ket-qua-ngay">
            <div class="small" style="font-weight:700">Kết quả từng ngày</div>
            ${this.danhSachNgay(l.theoNgay)}
          </div>` : ''}`}
    `, 'Chi tiết đơn xin phép');
  },

  // CẮT BỚT MÀ KHÔNG NÓI RA THÌ VỚI NGƯỜI DÙNG ĐÓ LÀ GIẤU.
  //
  // Máy chủ cắt phần LỊCH SỬ ở 60 đơn gần nhất — cố ý, và đúng (đơn CHỜ DUYỆT
  // thì không bao giờ cắt, nên con số "Chờ duyệt (N)" luôn đúng). Nhưng tham
  // số `?gioiHan=` có sẵn ở routes/leave.js từ đầu mà KHÔNG màn hình nào gửi,
  // và màn hình cũng không nói một chữ nào là đã cắt.
  //
  // Tài khoản văn phòng gom đơn của cả trường, nên chỉ sau chừng một tuần là
  // phần lịch sử cũ không còn thấy được. Người dùng kết luận "đơn mất" chứ
  // không kết luận "danh sách bị cắt" — đúng cái mà chú thích ở
  // routes/messages.js gọi tên là "cắt bớt tin mà không nói là GIẤU tin".
  //
  // Suy ra "còn nữa" bằng cách ĐẾM, không đổi hình dạng câu trả lời: đường này
  // trả về một MẢNG, và điện thoại giữ bản app cũ sẽ gọi `.filter` trên nó.
  // Đổi mảng thành đối tượng để nhét thêm ô đếm là làm trắng màn hình của họ.
  MOI_TRANG: 60,
  TRAN_LICH_SU: 500,

  // ---- Cô ĐỌC, văn phòng DUYỆT ----
  async renderTeacher(root) {
    this._gioiHan = this._gioiHan || this.MOI_TRANG;
    this._list = await API.get(`/api/leave?gioiHan=${this._gioiHan}`);
    await this.napLichNghi();
    const pending = this._list.filter(l => l.status === 'pending');
    const history = this._list.filter(l => l.status !== 'pending');
    // Nhận về đúng bằng giới hạn nghĩa là RẤT CÓ THỂ còn nữa. Máy chủ chặn
    // `gioiHan` trong [1, 500], nên tới trần thì thôi không mời thêm.
    const conNua = history.length >= this._gioiHan && this._gioiHan < this.TRAN_LICH_SU;
    root.innerHTML = `
      ${UI.pageHeader('Xin phép nghỉ học')}
      <div class="section-label">Chờ duyệt (${pending.length})</div>
      ${pending.length ? pending.map(l => `
        <div class="card">
          <div class="list-row" style="border-bottom:none;padding-top:0">
            ${UI.avatar(l.studentAvatar, 44)}
            <div class="row-main">
              <div class="row-title">${UI.esc(l.studentName)}</div>
              <div class="row-sub">${UI.esc(this.fmtRange(l))}</div>
            </div>
            ${this.statusBadge(l.status)}
          </div>
          <div class="small" style="margin:2px 0 8px">${UI.esc(l.reason)}</div>
          <div class="muted small mb-8">Phụ huynh: ${UI.esc(l.parentName)} · Gửi ${UI.esc(UI.timeAgo(l.createdAt))}</div>
          ${this.laVanPhong() ? `
            <div class="grid-2">
              <button class="btn success-soft" onclick="App.views.leave.openReview('${UI.esc(l.id)}','approved')">${UI.icon('check', 18)} Duyệt</button>
              <button class="btn danger-soft" onclick="App.views.leave.openReview('${UI.esc(l.id)}','rejected')">${UI.icon('x', 18)} Từ chối</button>
            </div>`
            : `<div class="muted small">Văn phòng duyệt đơn này. Cô xem trước để biết hôm đó bé nghỉ.</div>`}
        </div>`).join('') : UI.emptyState('✅', this.laVanPhong()
          ? 'Không có đơn nào chờ duyệt.'
          : 'Không có đơn nào chờ duyệt. Nhóm mình đi học đầy đủ, tuyệt quá!')}

      <div class="section-label">Lịch sử</div>
      ${history.length ? `<div class="card">
        ${history.map(l => `
          <div class="list-row">
            ${UI.avatar(l.studentAvatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(l.studentName)} · ${UI.esc(this.fmtRange(l))}</div>
              <div class="row-sub">${UI.esc(l.reason)}${l.reviewNote ? ` — Phản hồi: ${UI.esc(l.reviewNote)}` : ''}</div>
              ${l.status === 'approved' ? `<div class="row-sub">${UI.esc(this.cauHoanTien(l))}</div>` : ''}
              ${l.status === 'approved' && l.theoNgay ? `<div class="row-sub">${UI.esc(l.theoNgay.map(x =>
    `${x.ngay.slice(8, 10)}/${x.ngay.slice(5, 7)} ${x.coPhep === 'co' ? 'có phép' : 'không phép'}`).join(' · '))}</div>
              ${this.laVanPhong() && l.theoNgay.some(x => this.soKhacDon(x))
    ? '<div class="row-sub">Có ngày sổ điểm danh ghi khác đơn — mở "Sửa từng ngày" để xem</div>' : ''}
              ${this.laVanPhong() ? `<button class="btn sm outline mt-8" data-sua-ngay="${UI.esc(l.id)}">Sửa từng ngày</button>` : ''}` : ''}
            </div>
            <div class="row-end">${this.statusBadge(l.status)}</div>
          </div>`).join('')}
      </div>` : UI.emptyState('🗂️', 'Chưa có đơn xin phép nào được xử lý')}
      ${conNua ? `
        <div class="hint mt-8">Đang hiện ${history.length} đơn gần nhất.</div>
        <button class="btn outline block mt-8" id="btn-don-cu-hon">
          ${UI.icon('plus', 16)} Xem đơn cũ hơn
        </button>` : ''}
      ${this.theLichNghi()}`;

    for (const b of root.querySelectorAll('[data-sua-ngay]')) b.onclick = () => this.openSuaNgay(b.dataset.suaNgay);

    const themNua = document.getElementById('btn-don-cu-hon');
    if (themNua) {
      themNua.onclick = async () => {
        themNua.disabled = true;
        themNua.textContent = 'Đang tải…';
        this._gioiHan = Math.min(this.TRAN_LICH_SU, this._gioiHan + this.MOI_TRANG);
        try { await this.renderTeacher(root); }
        catch (err) { themNua.disabled = false; UI.toast(err.message, 'error'); }
      };
    }
  },

  openReview(id, status) {
    const l = this._list.find(x => x.id === id);
    if (!l) return;
    const approve = status === 'approved';
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(l.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(l.studentName)}</div>
          <div class="row-sub">${UI.esc(this.fmtRange(l))}</div>
        </div>
      </div>
      <div class="small" style="margin:2px 0 12px">${UI.esc(l.reason)}</div>
      ${approve ? `
        ${this.bangSuaNgay(l.goiYTheoNgay || [])}
        <div class="field">
          <label>Ghi chú nội bộ về tiền ăn</label>
          <input id="lv-hoan-ghichu" placeholder="Ví dụ: đã báo bếp cắt suất từ thứ Ba">
        </div>` : ''}
      <div class="field">
        <label>Lời nhắn phản hồi gửi gia đình</label>
        <textarea id="lv-review-note" placeholder="${approve
          ? 'Ví dụ: Cô đã nhận thông tin. Chúc con mau khỏe!'
          : 'Ví dụ: Hôm đó nhóm có buổi làm quen với cô lớp 1, mong gia đình đổi lịch giúp cô.'}"></textarea>
      </div>
      <button class="btn ${approve ? 'success-soft' : 'danger-soft'} block" onclick="App.views.leave.submitReview('${UI.esc(l.id)}','${UI.esc(status)}')">
        ${UI.icon(approve ? 'check' : 'x', 18)} ${approve ? 'Duyệt đơn' : 'Từ chối đơn'}
      </button>
    `, approve ? 'Duyệt đơn xin phép' : 'Từ chối đơn xin phép');
    if (approve) this.ganBangSuaNgay();
  },

  async submitReview(id, status) {
    const reviewNote = document.getElementById('lv-review-note').value.trim();
    const oGhiChu = document.getElementById('lv-hoan-ghichu');
    const them = status === 'approved' ? {
      theoNgay: this.docBangSuaNgay(),
      ghiChuHoan: oGhiChu ? oGhiChu.value.trim() : '',
    } : {};
    try {
      await API.post(`/api/leave/${id}/review`, { status, reviewNote, ...them });
      UI.toast(status === 'approved' ? 'Đã duyệt đơn xin phép' : 'Đã từ chối đơn xin phép', 'success');
      UI.closeModal();
      App.route();
      App.refreshBadges();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // Văn phòng sửa lại từng ngày sau khi đã duyệt. Dòng điểm danh do app tự ghi
  // đổi theo; dòng cô đã ghi thì giữ nguyên (máy chủ giữ luật này).
  openSuaNgay(id) {
    const l = this._list.find(x => x.id === id);
    if (!l || !l.theoNgay) return;
    UI.modal(`
      <div class="list-row" style="border-bottom:none;padding-top:0">
        ${UI.avatar(l.studentAvatar, 44)}
        <div class="row-main">
          <div class="row-title">${UI.esc(l.studentName)}</div>
          <div class="row-sub">${UI.esc(this.fmtRange(l))}</div>
        </div>
      </div>
      ${this.bangSuaNgay(l.theoNgay)}
      <div class="field">
        <label>Ghi chú nội bộ về tiền ăn</label>
        <input id="lv-hoan-ghichu" value="${UI.esc((l.hoanTien && l.hoanTien.ghiChu) || '')}">
      </div>
      <div class="hint mb-8">Dòng điểm danh app đã tự ghi theo đơn sẽ đổi theo. Dòng cô đã ghi (chấm tay, ảnh tới lớp) giữ nguyên.</div>
      <button class="btn primary block" id="lv-luu-ngay">${UI.icon('check', 18)} Lưu thay đổi</button>
    `, 'Sửa từng ngày của đơn');
    this.ganBangSuaNgay();
    document.getElementById('lv-luu-ngay').onclick = async () => {
      try {
        await API.put(`/api/leave/${encodeURIComponent(id)}/ngay`, {
          theoNgay: this.docBangSuaNgay(),
          ghiChuHoan: document.getElementById('lv-hoan-ghichu').value.trim(),
        });
        UI.toast('Đã lưu chi tiết từng ngày', 'success');
        UI.closeModal();
        App.route();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
  },

  // ---- Tiện ích ----
  statusBadge(status) {
    const st = this.STATUS[status] || { label: status, cls: 'gray' };
    return UI.badge(st.label, st.cls);
  },

  fmtRange(l) {
    if (l.fromDate === l.toDate) return UI.fmtDate(l.fromDate);
    const days = Math.round((UI.parseDate(l.toDate) - UI.parseDate(l.fromDate)) / 86400000) + 1;
    return `${UI.fmtDate(l.fromDate, { weekday: false })} – ${UI.fmtDate(l.toDate, { weekday: false })} (${days} ngày)`;
  },

  // Ngày mai tính từ HÔM NAY CỦA TRƯỜNG (giờ Việt Nam), không từ múi giờ máy.
  tomorrowStr() {
    const d = UI.parseDate(UI.todayStr());
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
};

// Dòng thông tin nhãn – giá trị: bản dùng chung nằm ở UI.dongThongTin,
// giữ tên cũ để các chỗ gọi trong tệp này khỏi đổi.
function infoRowLeave(label, value) {
  return UI.dongThongTin(label, value);
}
