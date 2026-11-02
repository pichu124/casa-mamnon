// Quản trị — tab Tổng quan ngày: một ngày của cả trường.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
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

      ${this.theCoTheoCong(d.coTheoCong, b.nghiCoPhep === null)}

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
        <div class="card-title">Theo bảng công của Nhân sự</div>
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

  // CÔ ĐI LÀM HÔM NAY THEO ẢNH CHỤP Ở CỔNG (L3). Giờ cổng là bảng lõi của
  // Điểm danh, nên thẻ này đếm được cả khi Nhân sự tắt. Chỉ tên và giờ, không
  // ảnh. `null` từ máy chủ = Điểm danh tắt, hoặc tài khoản không xem phần này.
  theCoTheoCong(c, diemDanhTat) {
    const tieuDe = '<div class="card-title">Cô đi làm hôm nay (theo ảnh chụp ở cổng)</div>';
    if (!c) {
      return diemDanhTat ? `<div class="card" id="ad-mn-cong">${tieuDe}
        <div class="muted small">Phân hệ <b>Điểm danh</b> đang tắt nên chưa có giờ chụp ở cổng.</div></div>` : '';
    }
    return `
      <div class="card" id="ad-mn-cong">
        ${tieuDe}
        ${this.dongSoNgay('Tổng số cô trong phạm vi', c.tong)}
        ${this.dongSoNgay('Đã chụp giờ vào', c.daVao)}
        ${this.dongSoNgay('Đã chụp giờ ra', c.daRa)}
        ${this.dongSoNgay('Chưa chụp giờ vào', c.chuaVao)}
        <div class="row-title mt-8" style="color:var(--muted)">Giờ vào, giờ ra của từng cô</div>
        ${(c.danhSach || []).map(x => `
            <div class="list-row">
              <div class="row-main"><div class="row-title">${UI.esc(x.hoTen)}</div></div>
              <div class="row-end small">${x.gioVao
    ? `Vào ${UI.esc(x.gioVao)}${x.gioRa ? ` · Ra ${UI.esc(x.gioRa)}` : ''}`
    : '<span class="muted">Chưa chụp ở cổng</span>'}</div>
            </div>`).join('') || '<div class="muted small">Chưa có cô nào trong phạm vi.</div>'}
      </div>`;
  },
});
