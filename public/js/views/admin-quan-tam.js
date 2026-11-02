// Quản trị — tab Quan tâm: gia đình mở mục nào trong app.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---------- Gia đình quan tâm điều gì (Đ149) ----------
  //
  // Nhà trường 10/09: *"mình chỉ muốn xem PH khi vào app quan tâm những gì"*.
  //
  // MÀN NÀY PHẢI TỰ NÓI RA GIỚI HẠN CỦA CHÍNH NÓ, ở ngay trên bảng số chứ không
  // giấu dưới chân trang. Người đọc một danh sách sắp theo con số sẽ mặc định
  // coi nó là "số gia đình quan tâm", rồi mang con số ấy đi họp — trong khi nó
  // là số LƯỢT MỞ, và app cố ý không biết có bao nhiêu NHÀ đằng sau mỗi lượt.
  //
  // KHÔNG TỈ LỆ, KHÔNG THANH BIỂU ĐỒ — đây là một quyết định, có chủ ý.
  //
  // Bộ canh QUY TẮC 4 chặn mọi tỉ lệ được tính rồi in thẳng ra màn hình trong
  // kho mã này, kể cả khi con số ấy nói về màn hình chứ không nói về đứa trẻ
  // nào. Bản đầu của đợt này có tỉ lệ và thanh biểu đồ; bộ canh báo đỏ, và bộ
  // canh đúng — xin một ngoại lệ cho tiện là mở sẵn cửa cho lần sau, mà lần sau
  // thì rất có thể đúng là một con số về một đứa trẻ. Con số thô kèm khoảng
  // ngày đã trả lời đủ câu nhà trường hỏi.
  //
  // (Chú thích này cũng từng làm hai bộ canh báo đỏ vì chính LỜI VĂN của nó —
  // một lần vì viết thẳng khuôn mẫu mà QUY TẮC 4 dò, một lần vì dùng một từ mà
  // QUY TẮC 2 xếp vào nhóm chữ chê. Cả hai lần bộ canh đều đúng theo đúng việc
  // nó được giao: nó dò TỆP, không dò ý định của người viết.)
  _quanTamNgay: 30,

  async tabQuanTam(body) {
    const den = UI.todayStr();
    const tu = (() => {
      const d = UI.parseDate(den);
      d.setDate(d.getDate() - (this._quanTamNgay - 1));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const d = await API.get(`/api/admin/quan-tam?tu=${encodeURIComponent(tu)}&den=${encodeURIComponent(den)}`);
    const ds = d.muc || [];
    body.innerHTML = `
      <div class="card">
        <div class="field" style="margin-bottom:0">
          <label>Khoảng thời gian</label>
          <select onchange="App.views.admin.doiKhoangQuanTam(this.value)">
            ${[[7, '7 ngày gần nhất'], [30, '30 ngày gần nhất'], [90, '90 ngày gần nhất']]
              .map(([n, t]) => `<option value="${n}"${this._quanTamNgay === n ? ' selected' : ''}>${UI.esc(t)}</option>`).join('')}
          </select>
          <div class="hint">${UI.esc(UI.fmtDate(d.tuNgay, { weekday: false }))} – ${UI.esc(UI.fmtDate(d.denNgay, { weekday: false }))}</div>
        </div>
      </div>

      <div class="card" style="border-left:4px solid var(--primary)">
        <div class="card-title">${UI.icon('info', 18)} Bảng này đếm gì, và cố ý không đếm gì</div>
        <div class="muted small" style="line-height:1.7">
          Đây là <b>số lượt mở</b> từng mục của <b>các gia đình</b>, gộp chung cả trường —
          không phải số gia đình, và không phải nhà nào mở gì.
          App <b>không lưu</b> việc một gia đình đã mở mục nào: bảng số này không có
          chỗ nào ghi tên người, nên không tra ngược ra được, kể cả với tài khoản
          ban giám hiệu. Mỗi nhà được tính <b>một lượt cho mỗi mục mỗi ngày</b>.
        </div>
      </div>

      ${ds.length ? `<div class="card">
        <div class="card-title">Mục gia đình mở nhiều nhất<span class="spacer"></span>
          <span class="muted small">${UI.esc(String(d.tongLuot))} lượt</span></div>
        ${ds.map(x => `
          <div class="list-row">
            <div class="row-main"><div class="row-title">${UI.esc(x.ten)}</div></div>
            <div class="row-end">${UI.esc(String(x.soLuot))} lượt</div>
          </div>`).join('')}
      </div>` : UI.emptyState('📊', 'Chưa có lượt mở nào trong khoảng này. '
        + 'Con số bắt đầu được đếm từ lúc gia đình mở app trên bản mới.')}`;
  },

  doiKhoangQuanTam(v) {
    const n = Number(v);
    if (![7, 30, 90].includes(n)) return;
    this._quanTamNgay = n;
    App.route();
  },
});
