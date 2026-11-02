// Quản trị — tab Cài đặt đánh giá: bộ chữ đánh giá và đề xuất đổi chữ.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---- BỘ CHỮ ĐÁNH GIÁ (Đ185, Câu 6) — tab Cài đặt đánh giá (L4) ----
  //
  // Nhà trường xin quyền tự sửa năm chữ này "cho hợp lý theo thời gian". Màn
  // này chỉ để cô khỏi gõ nhầm — chốt thật nằm ở máy chủ, vì màn hình thì ai
  // cũng vòng qua được.
  //
  // NÓI RÕ HAI ĐIỀU NGAY TRÊN MÀN, vì cả hai đều là câu người sửa sẽ hỏi:
  // đổi chữ KHÔNG làm đổi ngược bản báo cáo đã gửi gia đình tháng trước (mọi
  // bản ghi giữ MÃ, không giữ chữ), và bộ chữ dùng chung cho cả ba cơ sở.
  async tabDanhGia(body) {
    body.innerHTML = '<div id="ad-nhan-danh-gia"><div class="loading">Đang tải</div></div>';
    await this.theNhanDanhGia(document.getElementById('ad-nhan-danh-gia'));
  },

  // THẺ TỰ CHỨA: vẽ vào phần tử `o` được truyền vào, mọi id có tiền tố
  // `ad-ndg-`, gắn sự kiện qua `o.querySelector`. Hai GET chạy song song và
  // hỏng độc lập: đọc đề xuất lỗi hay bị từ chối (văn phòng) thì thẻ bộ chữ
  // vẫn vẽ y như cũ.
  //
  // ĐỀ XUẤT (chủ dự án 02/11): quản lý cơ sở gửi, ban giám hiệu đồng ý (áp
  // vào bộ chữ) hoặc chưa đồng ý. Sửa thẳng ở thẻ bộ chữ KHÔNG khép đề xuất.
  async theNhanDanhGia(o) {
    if (!o) return;
    const [d, dx] = await Promise.all([
      API.get('/api/admin/nhan-danh-gia').catch(() => null),
      API.get('/api/admin/nhan-danh-gia/de-xuat').catch(() => null),
    ]);
    if (!d) {
      o.innerHTML = UI.emptyState('🗂️', 'Chưa mở được bộ chữ đánh giá. Xin thử lại sau ít phút.');
      return;
    }
    const ds = d.nhan || [];
    const toiDa = UI.esc(String(d.toiDa || 40));
    const cho = dx && dx.choDuyet;
    const luc = (iso) => (iso ? `${UI.fmtTime(iso)} ngày ${UI.fmtDate(iso, { weekday: false })}` : '');
    const nguoiGui = (x) => `${UI.esc(x.coDeXuatTen || 'Một quản lý')}${x.coSoTen ? ` (${UI.esc(x.coSoTen)})` : ''}`;
    const dongDoi = (x) => `<div class="small mt-8">${UI.esc(x.dangDung)} → <b>${UI.esc(x.deXuat)}</b>${
      x.daDoiTuLucGui ? ' <span class="muted">(đã đổi từ lúc gửi)</span>' : ''}</div>`;
    const ketQua = (x) => (x.trangThai === 'da-duyet' ? `Đã đồng ý ngày ${UI.esc(UI.fmtDate(x.xemLuc, { weekday: false }))}`
      : x.trangThai === 'tu-choi' ? `Chưa đồng ý: ${UI.esc(x.yKien)}` : 'Đã rút');

    const theCho = dx && dx.duyetDuoc && cho ? `
      <div class="card" id="ad-ndg-cho" style="border-left:4px solid var(--warning)">
        <div class="card-title">Đề xuất đang chờ ban giám hiệu xem</div>
        <div class="small">${nguoiGui(cho)} · gửi lúc ${UI.esc(luc(cho.taoLuc))}</div>
        <div class="small mt-8"><b>Vì sao muốn đổi:</b> ${UI.esc(cho.lyDo)}</div>
        ${(cho.thayDoi || []).map(dongDoi).join('') || '<div class="muted small mt-8">Đề xuất này không còn chữ nào để áp.</div>'}
        <div class="field mt-8"><label>Ý kiến của ban giám hiệu</label>
          <textarea id="ad-ndg-dx-ykien" rows="2" maxlength="300" placeholder="Cần ghi khi chưa đồng ý"></textarea></div>
        <div class="flex" style="gap:8px;flex-wrap:wrap">
          <button class="btn sm primary" id="ad-ndg-dx-dongy">Đồng ý và áp dụng</button>
          <button class="btn sm outline" id="ad-ndg-dx-tuchoi">Chưa đồng ý</button>
        </div>
        <div class="muted small mt-8">Sửa trực tiếp bên dưới không khép đề xuất này.</div>
      </div>` : '';

    const theBoChu = `
      <div class="card">
        <div class="card-title">🗂️ Chữ đánh giá dùng trong Kế hoạch của bé và Hành trình</div>
        <div class="muted small" style="line-height:1.7">
          Đây là các chữ cô chọn khi nhìn lại cuối tháng. Trường sửa được cho hợp
          với cách nói của mình — ví dụ <b>Hoàn thành</b>, <b>Đang thực hiện</b>,
          <b>Chưa học tới</b>.
          <div class="mt-8">
            Đổi chữ ở đây <b>không làm đổi</b> bản báo cáo đã gửi gia đình tháng trước:
            máy lưu lại lựa chọn của cô chứ không lưu chữ, nên chỉ chữ hiện ra từ nay
            là đổi. Bộ chữ này <b>dùng chung cho cả ba cơ sở</b>.
          </div>
          <div class="mt-8">
            Phần mềm của trường mình không xếp các bé trên dưới nhau, nên những chữ
            mang nghĩa phân bậc hay mang con số sẽ không lưu được.
          </div>
        </div>
        ${ds.map(n => `
          <div class="field mt-8">
            <label>${UI.esc(n.macDinh)}${n.daSua ? ' <span class="muted">(đã sửa)</span>' : ''}</label>
            ${d.suaDuoc
    ? `<input id="ad-ndg-${UI.esc(n.ma)}" value="${UI.esc(n.nhan)}" maxlength="${toiDa}">`
    : `<div>${UI.esc(n.nhan)}</div>`}
          </div>`).join('')}
        ${d.suaDuoc
    ? '<button class="btn sm outline mt-8" id="ad-ndg-luu">Lưu bộ chữ</button>'
    : '<div class="muted small mt-8">Sửa mục này cần tài khoản quản trị toàn hệ thống, vì bộ chữ dùng chung cả ba cơ sở.</div>'}
      </div>`;

    let theDeXuat = '';
    if (dx && dx.deXuatDuoc && !cho) {
      theDeXuat = `
        <div class="card" id="ad-ndg-dx">
          <div class="card-title">Đề xuất đổi bộ chữ</div>
          <div class="muted small" style="line-height:1.6">
            Sửa những chữ muốn đổi rồi ghi vì sao. Ban giám hiệu xem và quyết; mỗi lúc
            cả trường chỉ có một đề xuất đang chờ.
          </div>
          ${ds.map(n => `
            <div class="field mt-8"><label>${UI.esc(n.macDinh)}</label>
              <input id="ad-ndg-dx-${UI.esc(n.ma)}" value="${UI.esc(n.nhan)}" maxlength="${toiDa}"></div>`).join('')}
          <div class="field"><label>Vì sao muốn đổi</label>
            <textarea id="ad-ndg-dx-lydo" rows="2" maxlength="300"></textarea></div>
          <button class="btn sm primary" id="ad-ndg-dx-gui">Gửi đề xuất cho ban giám hiệu</button>
        </div>`;
    } else if (dx && dx.deXuatDuoc && cho.cuaToi) {
      theDeXuat = `
        <div class="card" id="ad-ndg-dx">
          <div class="card-title">Đề xuất của bạn đang chờ ban giám hiệu xem</div>
          <div class="small">Gửi lúc ${UI.esc(luc(cho.taoLuc))}</div>
          ${(cho.thayDoi || []).map(dongDoi).join('')}
          <div class="small mt-8"><b>Vì sao muốn đổi:</b> ${UI.esc(cho.lyDo)}</div>
          <button class="btn sm outline mt-8" id="ad-ndg-dx-rut">Rút đề xuất</button>
        </div>`;
    } else if (dx && dx.deXuatDuoc) {
      theDeXuat = `
        <div class="card" id="ad-ndg-dx">
          <div class="muted small" style="line-height:1.6">
            ${nguoiGui(cho)} đã gửi một đề xuất đang chờ ban giám hiệu xem. Xem xong đề xuất ấy
            thì cơ sở mình gửi được đề xuất mới.
          </div>
        </div>`;
    }

    const ganDay = (dx && dx.ganDay) || [];
    const theGanDay = ganDay.length ? `
      <div class="card">
        <div class="card-title">Đề xuất gần đây</div>
        ${ganDay.map(x => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${ketQua(x)}</div>
              <div class="row-sub">${dx.duyetDuoc ? `${nguoiGui(x)} · ` : ''}gửi lúc ${UI.esc(luc(x.taoLuc))}</div>
              ${(x.thayDoi || []).map(t => `<div class="row-sub">${UI.esc(t.nen || t.macDinh)} → ${UI.esc(t.deXuat)}</div>`).join('')}
            </div>
          </div>`).join('')}
      </div>` : '';

    o.innerHTML = theCho + theBoChu + theDeXuat + theGanDay;

    const q = (s) => o.querySelector(s);
    const lam = async (viec, loiBao) => {
      try {
        await viec();
        UI.toast(loiBao, 'success');
        await this.theNhanDanhGia(o);
      } catch (e) {
        UI.toast(e.message || 'Chưa làm được', 'error');
      }
    };
    if (q('#ad-ndg-luu')) {
      q('#ad-ndg-luu').onclick = () => lam(() => {
        const nhan = {};
        for (const n of ds) { const i = q(`#ad-ndg-${n.ma}`); if (i) nhan[n.ma] = i.value.trim(); }
        return API.put('/api/admin/nhan-danh-gia', { nhan });
      }, 'Đã lưu bộ chữ đánh giá');
    }
    if (q('#ad-ndg-dx-gui')) {
      q('#ad-ndg-dx-gui').onclick = () => lam(() => {
        const nhan = {};
        for (const n of ds) { const i = q(`#ad-ndg-dx-${n.ma}`); if (i) nhan[n.ma] = i.value.trim(); }
        return API.post('/api/admin/nhan-danh-gia/de-xuat', { nhan, lyDo: q('#ad-ndg-dx-lydo').value.trim() });
      }, 'Đã gửi đề xuất cho ban giám hiệu');
    }
    if (q('#ad-ndg-dx-rut')) {
      q('#ad-ndg-dx-rut').onclick = () => lam(
        () => API.post(`/api/admin/nhan-danh-gia/de-xuat/${encodeURIComponent(cho.id)}/rut`, {}), 'Đã rút đề xuất');
    }
    const duyet = (quyetDinh, loiBao) => lam(() => API.post(
      `/api/admin/nhan-danh-gia/de-xuat/${encodeURIComponent(cho.id)}/duyet`,
      { quyetDinh, yKien: q('#ad-ndg-dx-ykien').value.trim() }), loiBao);
    if (q('#ad-ndg-dx-dongy')) q('#ad-ndg-dx-dongy').onclick = () => duyet('da-duyet', 'Đã áp dụng đề xuất vào bộ chữ');
    if (q('#ad-ndg-dx-tuchoi')) q('#ad-ndg-dx-tuchoi').onclick = () => duyet('tu-choi', 'Đã báo quản lý cơ sở: chưa đồng ý');
  },
});
