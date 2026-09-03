// Phân hệ Hồ sơ bé.
// Phụ huynh: hồ sơ của con. Giáo viên: danh sách bé nhóm mình phụ trách.
App.views.student = {
  // Tuổi của bé, tính theo NGÀY SINH chứ không phải hiệu hai con số năm.
  //
  // Bản đầu lấy `nămNay − nămSinh`. Với trẻ 12 tháng – 6 tuổi thì lệch một năm là lệch
  // rất nhiều: một bé sinh tháng 12 bị ghi già hơn tuổi thật gần trọn một năm,
  // suốt từ tháng 1 cho tới sinh nhật. Cô nhìn con số đó rồi chờ đợi ở bé
  // những việc bé chưa tới tuổi làm được — và ở tuổi này, sáu tháng là một
  // khoảng cách thật sự.
  //
  // Ở tuổi này người Việt vẫn nói kèm tháng: "3 tuổi 8 tháng", "26 tháng".
  // Nên hiện luôn cả tháng, đúng cách cô và gia đình vẫn nói với nhau.
  //
  // `moc` chỉ để bài kiểm thử cố định được ngày hôm nay; app luôn gọi không
  // truyền tham số này.
  // Tuổi của bé.
  //
  // DƯỚI 36 THÁNG THÌ NÓI BẰNG THÁNG — ví dụ mở đầu của CLAUDE.md: bé 14 tháng
  // phải đọc là "14 tháng", không phải "1 tuổi". Mốc 36 tháng trùng mốc tách
  // nhà trẻ / mẫu giáo, nên cả app chỉ có một mốc.
  //
  // PHẢI KHỚP TỪNG CHỮ với `tuoiCuaBe` trong routes/admin.js (tệp xuất Excel).
  // Trình duyệt không nạp được tệp trong lib/ nên hai bản buộc phải ở hai nơi;
  // `test:xuat-danh-sach` canh để chúng không trôi ra khỏi nhau.
  tuoiCuaBe(dob, moc) {
    if (!dob) return null;
    const ns = UI.parseDate(dob);
    if (!ns || Number.isNaN(ns.getTime())) return null;
    const nay = moc ? UI.parseDate(moc) : new Date();
    let thang = (nay.getFullYear() - ns.getFullYear()) * 12 + (nay.getMonth() - ns.getMonth());
    if (nay.getDate() < ns.getDate()) thang -= 1;
    if (thang < 0) return null;          // ngày sinh nhập nhầm sang tương lai
    if (thang < 36) return `${thang} tháng`;
    const nam = Math.floor(thang / 12);
    const du = thang % 12;
    return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
  },

  async render(root) {
    if (App.state.user.role === 'teacher') return this.renderRoster(root);
    return this.renderProfile(root);
  },

  // ---- Phụ huynh: hồ sơ con ----
  async renderProfile(root) {
    const current = App.currentStudent();
    if (!current) {
      root.innerHTML = UI.pageHeader('Hồ sơ của bé') + UI.emptyState('🎒', 'Chưa có bé nào liên kết với tài khoản này');
      return;
    }
    const s = await API.get(`/api/students/${current.id}`);
    const tuoi = this.tuoiCuaBe(s.dob);
    // Giấy đồng ý nạp riêng và nuốt lỗi: hồ sơ bé là màn quan trọng hơn, không
    // được trắng chỉ vì phần này hỏng.
    const gd = await API.get(`/api/dong-y?studentId=${encodeURIComponent(current.id)}`).catch(() => null);
    const lichSu = await this.lichSuNhom(current.id);
    root.innerHTML = `
      ${UI.pageHeader('Hồ sơ của bé')}
      ${UI.studentBar()}${UI.thanhChonBeTheoCap()}
      <div class="card center" style="padding-top:24px">
        ${UI.avatar(s.avatar, 84)}
        <h2 style="margin-top:10px">${UI.esc(s.name)}</h2>
        <div class="muted small mt-8">Mã của bé: ${UI.esc(s.code)} · ${UI.esc(s.className)}</div>
        <div class="mt-8">${UI.badge(s.gender, 'blue')}${tuoi ? ` ${UI.badge(tuoi, 'purple')}` : ''}</div>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('info', 19)} Thông tin cá nhân</div>
        ${infoRow('Ngày sinh', UI.fmtDate(s.dob, { weekday: false }))}
        ${infoRow('Giới tính', s.gender)}
        ${infoRow('Dân tộc', s.ethnicity)}
        ${infoRow('Địa chỉ', s.address)}
        ${infoRow('Nhóm máu', s.bloodType)}
        ${infoRow('Tiền sử bệnh / lưu ý đặc biệt', s.tienSuBenh)}
      </div>

      ${this.theLienHeKhanCap(s)}

      <div class="card">
        <div class="card-title">${UI.icon('student', 19)} Trường và nhóm lớp</div>
        ${infoRow('Nhóm', `${s.className}${s.room ? ` · ${s.room}` : ''}`)}
        ${infoRow('Cô phụ trách', s.teacherNames || s.teacherName)}
        ${this.theLienHeTruong(s)}
        ${this.theLichSuNhom(lichSu)}
        <button class="btn primary block mt-14" onclick="location.hash='#/messages'">${UI.icon('chat', 18)} Nhắn tin với cô</button>
      </div>

      <div class="card">
        <div class="card-title">${UI.icon('user', 19)} Phụ huynh</div>
        ${s.parents.map(p => `
          <div class="list-row">
            ${UI.avatar(p.avatar, 40)}
            <div class="row-main">
              <div class="row-title">${UI.esc(p.title)} ${UI.esc(p.name)}</div>
              <div class="row-sub">${UI.esc(p.phone)} · ${UI.esc(p.email)}</div>
              ${p.soCccd ? `<div class="row-sub">CCCD: ${UI.esc(p.soCccd)}</div>` : ''}
            </div>
          </div>`).join('')}
        <div class="muted small mt-8">Số CCCD chỉ hiện cho chính người đó và cho văn phòng.
        Nhà trường giữ số này để đối chiếu khi giao bé cho người tới đón.</div>
      </div>

      ${this.theDongY(gd)}`;

    this.ganNutRutDongY(current.id);
  },

  // ---- Giấy đồng ý: gia đình xem mình đã ký gì, và rút lại được ----
  //
  // BA TRẠNG THÁI, KHÔNG PHẢI HAI. "Chưa nộp giấy" khác hẳn "gia đình đã nói
  // không" — gộp lại là hoặc vu cho gia đình đã từ chối, hoặc coi im lặng là
  // đồng ý. Cùng luật với tầng dữ liệu.
  MUC_DONG_Y: [
    ['hoSoHocTap', 'Lập hồ sơ học tập cho con',
      'Cô ghi lại quan sát và câu chuyện học tập của con trong năm. '
      + 'Rút lại thì trường ngưng ghi mới ngay; phần đã ghi vẫn giữ và gia đình vẫn xem lại được.'],
    ['chiaSeGiaDinh', 'Chia sẻ ảnh có mặt con cho gia đình khác trong nhóm',
      'Ảnh chụp chung cả nhóm. Rút lại thì ảnh có mặt con thôi hiện với nhà khác ngay.'],
    ['truyenThong', 'Dùng ảnh của con cho trang tin của trường',
      'Ảnh đăng ra ngoài phạm vi nhóm lớp, ví dụ trang tin tuyển sinh.'],
  ],

  nhanDongY(v) {
    if (v === true) return UI.badge('Đã đồng ý', 'green');
    if (v === false) return UI.badge('Không đồng ý', 'gray');
    return UI.badge('Chưa nộp giấy', 'orange');
  },

  theDongY(gd) {
    if (!gd || !gd.dongY) return '';
    const d = gd.dongY;
    return `
      <div class="card">
        <div class="card-title">📝 Giấy đồng ý của gia đình</div>
        ${d.nguoiKy || d.ngayKy ? `<div class="muted small" style="line-height:1.7;margin-bottom:10px">
          Giấy do <b>${UI.esc(d.nguoiKy || 'gia đình')}</b> ký${d.ngayKy ? ` ngày ${UI.fmtDate(d.ngayKy, { weekday: false })}` : ''}.
        </div>` : ''}
        ${this.MUC_DONG_Y.map(([khoa, ten, mo]) => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(ten)}</div>
              <div class="row-sub" style="line-height:1.6">${UI.esc(mo)}</div>
            </div>
            <div class="row-end">
              ${this.nhanDongY(d[khoa])}
              ${gd.tuRutDuoc && d[khoa] === true
                ? `<button class="btn sm outline" data-rut="${UI.esc(khoa)}">Rút lại</button>` : ''}
            </div>
          </div>`).join('')}
        <div class="muted small mt-8" style="line-height:1.7">
          Gia đình <b>rút lại bất cứ lúc nào</b>, ngay trên màn hình này, và có hiệu lực ngay.
          Muốn <b>đồng ý</b> trở lại thì nhờ văn phòng ghi giúp — phần đó cần chữ ký trên giấy,
          app không thay chữ ký được.
        </div>
      </div>`;
  },

  ganNutRutDongY(studentId) {
    for (const el of document.querySelectorAll('[data-rut]')) {
      el.onclick = async () => {
        const khoa = el.dataset.rut;
        const ten = (this.MUC_DONG_Y.find(m => m[0] === khoa) || [])[1] || 'mục này';
        if (!confirm(`Rút lại đồng ý cho "${ten}"?\n\nCó hiệu lực ngay. Muốn đồng ý lại thì nhờ văn phòng ghi giúp.`)) return;
        try {
          await API.put('/api/dong-y', { studentId, [khoa]: false });
          UI.toast('Đã rút lại đồng ý', 'success');
          App.route();
        } catch (err) { UI.toast(err.message, 'error'); }
      };
    }
  },

  // Thông tin liên hệ của TRƯỜNG, không phải của cô.
  //
  // Nhà trường yêu cầu bỏ số điện thoại riêng của cô khỏi màn này và thay bằng
  // hotline văn phòng. Lý do rất thực tế: cô đang đứng nhóm với 20 bé thì không
  // cầm điện thoại, còn văn phòng thì luôn có người nghe. Muốn nhắn riêng cho
  // cô thì đã có nút Nhắn tin ngay bên dưới — nó vào đúng hộp thư của cô, và có
  // lưu lại, khác hẳn một cuộc gọi không ai nhớ nội dung.
  // ---- Nhóm của bé qua các năm ----
  //
  // Nhà trường ghi lại bé từng học nhóm nào, năm nào — mỗi lần chuyển năm học
  // là một khoảng mới. Trước đợt này chỗ ghi đã có nhưng KHÔNG MÀN HÌNH NÀO
  // đọc, nên không ai kiểm chứng được là nó đang ghi đúng: một bảng chỉ ghi mà
  // không ai nhìn thì hỏng lúc nào cũng không biết, và tới lúc cần tra lại một
  // bé đã ra trường thì đã muộn.
  //
  // Nuốt lỗi có chủ ý: đây là phần phụ của hồ sơ bé. Hỏng thì mất một khối,
  // không được làm trắng cả màn hình.
  async lichSuNhom(studentId) {
    return API.get(`/api/schoolyear/lich-su-lop?studentId=${encodeURIComponent(studentId)}`)
      .catch(() => []);
  },

  // Chỉ hiện khi bé đã qua từ HAI năm trở lên. Bé mới vào thì khối này chẳng
  // nói thêm được gì so với dòng "Nhóm" ngay bên trên.
  //
  // Và KHÔNG viết "đây là năm đầu của con ở trường" cho trường hợp một khoảng:
  // trường mới dùng app thì mọi bé đều chỉ có một khoảng, kể cả bé đã học ba
  // năm. Nói vậy là app tự bịa ra một điều nó không biết.
  theLichSuNhom(ds) {
    const ls = Array.isArray(ds) ? ds : [];
    if (ls.length < 2) return '';
    return `
      <div class="mt-14">
        <div class="row-sub">Nhóm qua các năm</div>
        ${ls.map(k => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(k.className || 'Chưa rõ nhóm')}</div>
              <div class="row-sub">Năm học ${UI.esc(k.year)}${k.hienTai ? ' · đang học' : ''}</div>
            </div>
          </div>`).join('')}
      </div>`;
  },

  theLienHeTruong(s) {
    const t = s.lienHeTruong || {};
    if (!t.hotline && !t.email && !t.tenCoSo) return '';
    return `
      ${t.tenCoSo ? infoRow('Cơ sở', t.tenCoSo) : ''}
      ${t.diaChi ? infoRow('Địa chỉ', t.diaChi) : ''}
      ${t.hotline ? infoRow('Hotline văn phòng', t.hotline) : ''}
      ${t.email ? infoRow('Email trường', t.email) : ''}`;
  },

  // Người liên hệ khẩn cấp ngoài bố mẹ.
  //
  // Chưa có ai thì KHÔNG hiện một ô trống — hiện ô trống trên màn hình của phụ
  // huynh là bảo họ đi điền một thứ mà chỉ nhà trường mới nhập được.
  theLienHeKhanCap(s) {
    const ds = s.lienHeKhanCap || [];
    if (!ds.length) return '';
    return `
      <div class="card">
        <div class="card-title">${UI.icon('bell', 19)} Liên hệ khẩn cấp</div>
        <div class="muted small mb-8">Nhà trường gọi những số này khi không liên lạc được với bố mẹ.</div>
        ${ds.map(x => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(x.hoTen)}${x.quanHe ? ` · ${UI.esc(x.quanHe)}` : ''}</div>
              <div class="row-sub">${UI.esc(x.dienThoai || 'chưa có số điện thoại')}${x.ghiChu ? ` · ${UI.esc(x.ghiChu)}` : ''}</div>
            </div>
            ${x.dienThoai ? `<a class="btn sm outline" href="tel:${UI.esc(x.dienThoai.replace(/\s/g, ''))}">Gọi</a>` : ''}
          </div>`).join('')}
      </div>`;
  },

  // ---- Cô: danh sách bé của nhóm ----
  async renderRoster(root) {
    const students = await API.get('/api/students');
    const tenNhom = UI.noiTenNhom(App.state.user.nhomCuaCo);
    root.innerHTML = `
      ${UI.pageHeader(`Các bé nhóm ${tenNhom}`)}
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num">${students.length}</div><div class="stat-label">Số bé</div></div>
        <div class="stat-box"><div class="stat-num">${students.filter(s => s.gender === 'Nam').length}</div><div class="stat-label">Nam</div></div>
        <div class="stat-box"><div class="stat-num">${students.filter(s => s.gender === 'Nữ').length}</div><div class="stat-label">Nữ</div></div>
      </div>
      <div class="card">
        ${students.map(s => `
          <div class="list-row clickable" onclick="App.views.student.showDetail('${UI.esc(s.id)}')">
            ${UI.avatar(s.avatar, 44)}
            <div class="row-main">
              <div class="row-title">${UI.esc(s.name)}</div>
              <div class="row-sub">${UI.esc(s.code)} · ${UI.fmtDate(s.dob, { weekday: false })}</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>`).join('')}
      </div>`;
  },

  async showDetail(id) {
    try {
      const s = await API.get(`/api/students/${id}`);
      const lichSu = await this.lichSuNhom(id);
      UI.modal(`
        <div class="center">${UI.avatar(s.avatar, 68)}<h3 class="mt-8">${UI.esc(s.name)}</h3>
          <div class="muted small">${UI.esc(s.code)} · ${UI.esc(s.className)}</div></div>
        <div class="mt-14">
          ${infoRow('Ngày sinh', UI.fmtDate(s.dob, { weekday: false }))}
          ${this.tuoiCuaBe(s.dob) ? infoRow('Tuổi', this.tuoiCuaBe(s.dob)) : ''}
          ${infoRow('Địa chỉ', s.address)}
          ${infoRow('Tiền sử bệnh / lưu ý đặc biệt', s.tienSuBenh)}
          ${s.soDinhDanh ? infoRow('Số định danh cá nhân', s.soDinhDanh) : ''}
          ${s.parents.map(p => infoRow(`Phụ huynh: ${p.title} ${p.name}`, p.phone)
            + (p.soCccd ? infoRow(`CCCD của ${p.title} ${p.name}`, p.soCccd) : '')).join('')}
          ${(s.lienHeKhanCap || []).map(x => infoRow(
            `Khẩn cấp: ${x.hoTen}${x.quanHe ? ` (${x.quanHe})` : ''}`, x.dienThoai)).join('')}
          ${this.theLichSuNhom(lichSu)}
        </div>`, 'Hồ sơ của bé');
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};

// Dòng thông tin nhãn – giá trị: bản dùng chung nằm ở UI.dongThongTin,
// giữ tên cũ để các chỗ gọi trong tệp này khỏi đổi.
function infoRow(label, value) {
  return UI.dongThongTin(label, value);
}
