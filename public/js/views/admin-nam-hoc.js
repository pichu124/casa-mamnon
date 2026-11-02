// Quản trị — tab Năm học: chuyển năm học, danh sách bé đã ra trường.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---------- Chuyển năm học ----------
  async tabNamHoc(body) {
    const d = await API.get('/api/schoolyear/preview');
    // Nhớ lại bản xem trước để câu hỏi lại nói đúng con số thật, thay vì nhắc
    // tới một "khối cuối cấp" mà nhóm mầm non không hề dùng tới.
    this._xemTruocNam = d;
    // Mọi nhóm đều đi theo bậc mầm non thì ô "Khối cuối cấp" không có tác dụng
    // gì — giấu hẳn đi thay vì để nó nằm đó nhận số của hiệu trưởng rồi bỏ qua.
    const theoBacHet = (d.buoc || []).length > 0 && d.buoc.every(b => b.theoBac);
    body.innerHTML = `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title">⚠️ Việc này ảnh hưởng toàn trường</div>
        <p class="muted small" style="line-height:1.6">
          Chuyển năm học sẽ đưa toàn bộ các bé lên nhóm kế tiếp, cho các bé lớn nhất
          ra trường và đóng các nhóm của năm cũ. Chỉ làm khi đã kết thúc năm học.
          <b>Hãy nhờ người phụ trách máy chủ của trường sao lưu dữ liệu trước khi bấm.</b>
        </p>
      </div>

      <div class="card">
        <div class="card-title">Chuyển từ ${UI.esc(d.namHienTai || 'chưa đặt')} sang ${UI.esc(d.namMoi)}</div>
        <div class="stat-row">
          <div class="stat-box"><div class="stat-num" style="color:var(--success)">${d.tongLenLop}</div><div class="stat-label">Bé lên nhóm</div></div>
          <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${d.tongRaTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${d.buoc.filter(b => b.taoLopMoi).length}</div><div class="stat-label">Nhóm tạo mới</div></div>
        </div>
        <div class="table-wrap">
          <table class="simple">
            <thead><tr><th>Nhóm hiện tại</th><th>Số bé</th><th>Chuyển thành</th></tr></thead>
            <tbody>${d.buoc.map(b => `
              <tr>
                <td>${UI.esc(b.tenHienTai)}</td>
                <td>${b.siSo}</td>
                <td>${b.raTruong
                  ? '<span style="color:var(--warning);font-weight:600">Ra trường</span>'
                  : (b.khongNhanDang || !b.tenLopMoi
                    // Máy chủ đã gửi cờ này từ Đ118f; ô trống ở đây từng làm
                    // hiệu trưởng không biết nhóm sẽ đi đâu — nó không đi đâu cả.
                    ? '<span class="muted">Giữ nguyên — tên không theo mẫu, trường tự xếp sau</span>'
                    : UI.esc(b.tenLopMoi) + (b.taoLopMoi ? ' <span class="muted small">(tạo mới)</span>' : ''))}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        ${theoBacHet ? `
          <div class="hint mt-14">
            Các nhóm đi theo bậc mầm non: Nhà trẻ → Mầm → Chồi → Lá → vào lớp 1.
            Bảng trên đã nói rõ nhóm nào lên nhóm nào, không cần chọn gì thêm.
          </div>` : `
          <div class="field mt-14">
            <label>Khối cuối cấp — chỉ dùng cho nhóm đặt tên theo số, ví dụ "Lớp 5A"</label>
            <input type="number" id="ny-khoi" value="${UI.esc(d.khoiToiDa)}" min="1" max="12">
            <div class="hint">Nhóm đặt tên theo bậc (Chồi, Lá…) không dùng tới ô này.</div>
          </div>`}
        <button class="btn danger-soft block" onclick="App.views.admin.chuyenNamHoc('${UI.esc(d.namMoi)}')">
          Chuyển sang năm học ${UI.esc(d.namMoi)}
        </button>
      </div>

      <div class="card" id="ny-cuu">
        <div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Đang xem…</p>
      </div>`;
    // Tải RỜI, sau khi phần chuyển năm đã hiện xong: đây là phần tra cứu thêm,
    // không được phép làm hỏng màn hình chuyển năm nếu nó lỗi.
    this.taiBeRaTruong();
  },

  // Danh sách bé đã ra trường — đường đọc cho `/api/schoolyear/alumni`.
  //
  // Máy chủ có đường này từ lâu và lọc đúng theo cơ sở, nhưng KHÔNG màn hình
  // nào gọi tới: `routes/hocsinh-cu.js` trả mảng rỗng cho cô và quản trị kèm
  // chú thích "đã có đường riêng ở Quản trị → Năm học" — trong khi tab Năm học
  // chỉ có phần chuyển năm. Nghĩa là sau khi chuyển năm, bé ra trường biến mất
  // khỏi mọi màn hình của trường, còn gia đình thì vẫn xem được 12 tháng.
  async taiBeRaTruong() {
    const o = document.getElementById('ny-cuu');
    if (!o) return;
    let ds;
    try {
      ds = await API.get('/api/schoolyear/alumni');
    } catch (err) {
      o.innerHTML = `<div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Chưa xem được danh sách lúc này. ${UI.esc(err.message || '')}</p>`;
      return;
    }
    if (!ds.length) {
      o.innerHTML = `<div class="card-title">Bé đã ra trường</div>
        <p class="muted small">Chưa có bé nào ra trường hoặc chuyển đi.</p>`;
      return;
    }
    o.innerHTML = `
      <div class="card-title">Bé đã ra trường (${ds.length})</div>
      <p class="muted small">Gia đình vẫn xem lại được hồ sơ của con trong 12 tháng
        kể từ ngày rời trường. Trường xem được lâu hơn.</p>
      <div class="table-wrap mt-14">
        <table class="simple">
          <thead><tr><th>Tên bé</th><th>Nhóm cuối</th><th>Ngày rời trường</th></tr></thead>
          <tbody>${ds.map(s => `
            <tr>
              <td>${UI.esc(s.name)}${s.code ? ` <span class="muted small">${UI.esc(s.code)}</span>` : ''}</td>
              <td>${UI.esc(s.className || '—')}</td>
              <td>${s.leftAt ? UI.fmtDate(s.leftAt, { weekday: false }) : '—'}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      ${ds.length >= 500 ? '<div class="hint mt-14">Đang hiện 500 bé rời trường gần nhất.</div>' : ''}`;
  },

  async chuyenNamHoc(namMoi) {
    // Ô "Khối cuối cấp" bị giấu khi mọi nhóm đi theo bậc mầm non, nên phải đọc
    // phòng hờ. 5 là giá trị mặc định của máy chủ, giữ nguyên cho lớp kiểu cũ.
    const oKhoi = document.getElementById('ny-khoi');
    const khoiToiDa = oKhoi ? (Number(oKhoi.value) || 5) : 5;
    // Nói đúng con số thật của bản xem trước, thay vì nhắc tới "khối" — với nhóm
    // mầm non thì "khối" không có nghĩa gì cả.
    const d = this._xemTruocNam || {};
    const soRaTruong = d.tongRaTruong == null ? '' : `${d.tongRaTruong} bé sẽ ra trường. `;
    // HỎI THỨ NGƯỜI BẤM THẬT SỰ BIẾT.
    //
    // Hộp thoại thứ hai từng hỏi "bạn đã chạy npm run backup chưa?". Người đang
    // bấm nút này là hiệu trưởng, ngồi trước điện thoại hoặc máy tính của
    // trường — họ KHÔNG chạy được lệnh đó, và app cũng không có nút nào để sao
    // lưu. Hỏi một câu người ta không trả lời thật được thì họ bấm "Đồng ý" cho
    // xong, và cả hai lớp xác nhận thành hình thức.
    if (!confirm(`Chuyển toàn trường sang năm học ${namMoi}?\n\n${soRaTruong}Việc này không tự hoàn tác được.`)) return;
    if (!confirm('Xác nhận lần nữa: nhà trường ĐÃ SAO LƯU dữ liệu chưa?\n\n'
      + 'Nếu chưa, xin bấm Huỷ và nhờ người phụ trách máy chủ sao lưu giúp trước.')) return;
    try {
      const r = await API.post('/api/schoolyear/promote', { namMoi, khoiToiDa });
      UI.modal(`
        <p>${UI.esc(r.message)}</p>
        <div class="stat-row mt-14">
          <div class="stat-box"><div class="stat-num">${r.lenLop}</div><div class="stat-label">Lên nhóm</div></div>
          <div class="stat-box"><div class="stat-num">${r.raTruong}</div><div class="stat-label">Ra trường</div></div>
          <div class="stat-box"><div class="stat-num">${r.lopTao}</div><div class="stat-label">Nhóm mới</div></div>
          ${r.giuNguyen ? `<div class="stat-box"><div class="stat-num">${r.giuNguyen}</div><div class="stat-label">Giữ nguyên</div></div>` : ''}
        </div>
        <button class="btn primary block mt-14" onclick="UI.closeModal();App.views.admin.go('tongquan')">
          Đi phân công cô phụ trách
        </button>`, `Đã chuyển sang ${namMoi}`);
    } catch (err) { UI.toast(err.message, 'error'); }
  },
});
