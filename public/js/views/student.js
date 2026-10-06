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
    // "Bây giờ" theo giờ Việt Nam, không theo múi giờ máy (Đ127).
    const nay = UI.parseDate(moc || UI.todayStr());
    let thang = (nay.getFullYear() - ns.getFullYear()) * 12 + (nay.getMonth() - ns.getMonth());
    if (nay.getDate() < ns.getDate()) thang -= 1;
    if (thang < 0) return null;          // ngày sinh nhập nhầm sang tương lai
    if (thang < 36) return `${thang} tháng`;
    const nam = Math.floor(thang / 12);
    const du = thang % 12;
    return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
  },

  // VĂN PHÒNG: TÌM BÉ TRƯỚC, XEM HỒ SƠ SAU (góp ý của trường 06/10, mục 1).
  //
  // *"Nếu để giao diện này khi đông học sinh sẽ phải kéo mỏi cả tay để tìm học
  // sinh đó"*. Bản trước mở thẳng hồ sơ bé đầu danh sách, kèm MỘT ô chọn chứa
  // mọi bé trong phạm vi — 300 bé ba cơ sở là một ô chọn dài 300 dòng. Nay
  // `#/student` là màn TÌM: ô gõ nhanh (tên hoặc mã) ở trên, cây Cơ sở → Nhóm →
  // Bé gập sẵn ở dưới; bấm một bé thì sang `#/student/<mã>` là hồ sơ của bé ấy.
  //
  // Cây dựng từ `App.state.students` — danh sách máy chủ ĐÃ CẮT theo phạm vi
  // của người đăng nhập (`studentsOf`) — chứ không từ `App.state.classes` (cả
  // trường): văn phòng một cơ sở không thấy tên nhóm của cơ sở khác.
  //
  // Đ167 từng chọn "không dựng cây thứ hai" ở trang chủ. Lần này trường đòi
  // đúng chỗ này; cây ở đây và thẻ cơ sở ở trang chủ cùng đọc một nguồn
  // (`App.state.students`) nên không có hai bản số liệu trôi khỏi nhau.
  async render(root, params) {
    const u = App.state.user;
    if (u.role === 'teacher') return this.renderRoster(root);
    if (u.role === 'admin') {
      const id = params && params[0];
      if (id && (App.state.students || []).some(x => x.id === id)) {
        App.state.currentStudentId = id;
        return this.renderProfile(root);
      }
      return this.renderTimBe(root);
    }
    return this.renderProfile(root);
  },

  // Bỏ dấu để gõ "bao an" vẫn ra "Bảo An".
  boDau(x) {
    return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  },

  // Một dòng bé trong danh sách tìm / cây. Bấm là sang hồ sơ.
  dongBe(s, kemNhom) {
    return `
      <div class="list-row clickable" data-mo-be="${UI.esc(s.id)}">
        ${UI.avatar(s.avatar, 36)}
        <div class="row-main">
          <div class="row-title">${UI.esc(s.name)}</div>
          <div class="row-sub">${UI.esc([s.code, kemNhom ? (s.className || '') : ''].filter(Boolean).join(' · '))}</div>
        </div>
        <span class="muted">${UI.icon('chevron', 16)}</span>
      </div>`;
  },

  // Cây Cơ sở → Nhóm → Bé, gập sẵn hết. Trường một cơ sở thì bỏ tầng cơ sở.
  cayCoSo(students) {
    const tenCoSo = new Map((((App.state.school || {}).coSo) || []).map(c => [c.id, c.name]));
    const nhomTheoMa = new Map((App.state.classes || []).map(c => [c.id, c]));
    const theoNhom = new Map();
    for (const s of students) {
      const k = s.classId || '';
      if (!theoNhom.has(k)) theoNhom.set(k, []);
      theoNhom.get(k).push(s);
    }
    const tenNhom = (k) => k ? ((nhomTheoMa.get(k) || {}).name || (theoNhom.get(k)[0] || {}).className || k) : 'Chưa xếp nhóm';
    const coSoCua = (k) => ((nhomTheoMa.get(k) || {}).campusId) || '';
    const theoCoSo = new Map();
    for (const k of theoNhom.keys()) {
      const cs = coSoCua(k);
      if (!theoCoSo.has(cs)) theoCoSo.set(cs, []);
      theoCoSo.get(cs).push(k);
    }
    const veNhom = (k) => {
      const ds = theoNhom.get(k).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
      return `
        <details class="hs-nhom" data-nhom="${UI.esc(k)}" style="margin:6px 0 6px 4px">
          <summary style="cursor:pointer;padding:8px 4px;font-weight:600">🏠 ${UI.esc(tenNhom(k))}
            <span class="muted small" style="font-weight:400">(${ds.length} bé)</span></summary>
          ${ds.map(s => this.dongBe(s, false)).join('')}
        </details>`;
    };
    const sapNhom = (ks) => ks.slice().sort((a, b) => tenNhom(a).localeCompare(tenNhom(b), 'vi'));
    const nhieuCoSo = theoCoSo.size > 1 || (theoCoSo.size === 1 && tenCoSo.size > 1);
    if (!nhieuCoSo) return sapNhom([...theoNhom.keys()]).map(veNhom).join('');
    const tenCs = (cs) => cs ? (tenCoSo.get(cs) || cs) : 'Chưa gắn cơ sở';
    return [...theoCoSo.keys()].sort((a, b) => tenCs(a).localeCompare(tenCs(b), 'vi')).map(cs => {
      const ks = theoCoSo.get(cs);
      const soBe = ks.reduce((n, k) => n + theoNhom.get(k).length, 0);
      return `
        <details class="hs-coso" data-coso="${UI.esc(cs)}" style="margin-bottom:6px">
          <summary style="cursor:pointer;padding:10px 4px;font-weight:700">🏫 ${UI.esc(tenCs(cs))}
            <span class="muted small" style="font-weight:400">(${ks.length} nhóm · ${soBe} bé)</span></summary>
          ${sapNhom(ks).map(veNhom).join('')}
        </details>`;
    }).join('');
  },

  renderTimBe(root) {
    const students = App.state.students || [];
    if (!students.length) {
      root.innerHTML = UI.pageHeader('Hồ sơ của bé') + UI.emptyState('🎒', 'Phạm vi của tài khoản này chưa có bé nào.');
      return;
    }
    root.innerHTML = `
      ${UI.pageHeader('Hồ sơ của bé')}
      <div class="card">
        <div class="card-title">🔍 Tìm nhanh</div>
        <input id="hs-tim" type="search" autocomplete="off" enterkeyhint="search"
          placeholder="Gõ tên hoặc mã của bé…" aria-label="Tìm bé theo tên hoặc mã">
        <div id="hs-ket-qua" class="mt-8"></div>
      </div>
      <div class="card" id="hs-cay">
        <div class="card-title">${UI.icon('student', 18)} Chọn theo cơ sở và nhóm lớp</div>
        ${this.cayCoSo(students)}
      </div>
      <div class="muted small center mb-8">Bấm vào tên bé để xem hồ sơ chi tiết.</div>`;
    const o = document.getElementById('hs-tim');
    const kq = document.getElementById('hs-ket-qua');
    const TOI_DA = 20;
    const loc = () => {
      const q = this.boDau(o.value);
      if (!q) { kq.innerHTML = ''; return; }
      const trung = students.filter(s => this.boDau(s.name).includes(q) || this.boDau(s.code).includes(q));
      kq.innerHTML = trung.length
        ? trung.slice(0, TOI_DA).map(s => this.dongBe(s, true)).join('')
          + (trung.length > TOI_DA ? `<div class="muted small mt-8">Còn ${trung.length - TOI_DA} bé nữa — gõ thêm chữ để thu hẹp.</div>` : '')
        : '<div class="muted small">Không thấy bé nào khớp. Thử gõ ít chữ hơn, hoặc tìm trong cây bên dưới.</div>';
    };
    o.oninput = loc;
    // Gắn vào hai thẻ của màn này, không gắn vào #view: #view sống qua mọi lần
    // vẽ lại, gắn vào đó là mỗi lần mở màn thêm một bộ nghe nữa.
    const mo = (e) => {
      const dong = e.target.closest('[data-mo-be]');
      if (dong) location.hash = `#/student/${dong.dataset.moBe}`;
    };
    kq.onclick = mo;
    document.getElementById('hs-cay').onclick = mo;
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
      ${App.state.user.role === 'admin'
        ? `<button class="btn outline block mb-8" id="hs-tim-khac" onclick="location.hash='#/student'">🔍 Tìm bé khác</button>`
        : UI.studentBar()}
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
            ${App.state.user.role === 'admin' && String(p.phone || '').replace(/\s/g, '')
              ? `<a class="btn sm outline" href="tel:${UI.esc(String(p.phone).replace(/\s/g, ''))}">Gọi</a>` : ''}
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
    if (!t.hotline && !t.email && !t.tenCoSo && !t.emailKeToan) return '';
    // Email kế toán đứng RIÊNG một dòng, không gộp với email trường: gia đình
    // hỏi chuyện học phí thì gửi thẳng đúng người, không phải qua văn phòng
    // rồi chờ chuyển tiếp (Đ161). Chưa nhập thì bỏ hẳn dòng — một dòng rỗng
    // chỉ làm màn hình dài thêm.
    return `
      ${t.tenCoSo ? infoRow('Cơ sở', t.tenCoSo) : ''}
      ${t.diaChi ? infoRow('Địa chỉ', t.diaChi) : ''}
      ${t.hotline ? infoRow('Hotline văn phòng', t.hotline) : ''}
      ${t.email ? infoRow('Email trường', t.email) : ''}
      ${t.emailKeToan ? infoRow('Email kế toán (học phí)', t.emailKeToan) : ''}`;
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
  // SINH NHẬT TRONG THÁNG (Đ139). Nhà trường 07/09: "Hiện ở phần trên sinh
  // nhật các bạn trong tháng để GV nhớ chuẩn bị thông báo cho PH". Tháng theo
  // giờ Việt Nam; xếp theo ngày trong tháng; bé đã qua sinh nhật vẫn hiện (cô
  // vẫn cần biết để nhắc gia đình album/ảnh).
  theSinhNhatThang(students) {
    const thang = Number(UI.thangVN().slice(5, 7));
    const homNay = UI.todayStr();
    const ds = students
      .map(s => ({ s, d: UI.parseDate(s.dob) }))
      .filter(x => x.d && !Number.isNaN(x.d.getTime()) && (x.d.getMonth() + 1) === thang)
      .sort((a, b) => a.d.getDate() - b.d.getDate());
    if (!ds.length) return '';
    const ngayNay = Number(homNay.slice(8, 10));
    return `
      <div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title">🎂 Sinh nhật tháng ${thang}</div>
        ${ds.map(({ s, d }) => {
          const tuoi = UI.parseDate(homNay).getFullYear() - d.getFullYear();
          const ngay = d.getDate();
          const nhan = ngay === ngayNay ? 'Hôm nay!' : (ngay < ngayNay ? 'đã qua' : `còn ${ngay - ngayNay} ngày`);
          return `
          <div class="list-row">
            ${UI.avatar(s.avatar, 36)}
            <div class="row-main">
              <div class="row-title">${UI.esc(s.name)}</div>
              <div class="row-sub">Ngày ${ngay} · tròn ${tuoi} tuổi</div>
            </div>
            ${UI.badge(nhan, ngay === ngayNay ? 'orange' : 'gray')}
          </div>`;
        }).join('')}
      </div>`;
  },

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
      ${this.theSinhNhatThang(students)}
      <div class="card">
        <input id="hs-tim-co" type="search" autocomplete="off" enterkeyhint="search"
          placeholder="🔍 Gõ tên hoặc mã của bé…" aria-label="Tìm bé theo tên hoặc mã">
      </div>
      ${this.dsTheoNhom(students)}`;
    // Cùng ô tìm như màn của văn phòng (góp ý 06/10, mục 1) — lọc NGAY trên
    // danh sách đang có, không hỏi lại máy chủ.
    const o = document.getElementById('hs-tim-co');
    o.oninput = () => {
      const q = this.boDau(o.value);
      for (const dong of root.querySelectorAll('[data-dong-be]')) {
        const be = students.find(x => x.id === dong.dataset.dongBe) || {};
        dong.style.display = !q || this.boDau(be.name).includes(q) || this.boDau(be.code).includes(q) ? '' : 'none';
      }
    };
  },

  // Danh sách bé của cô. Cô dạy từ hai nhóm trở lên thì mỗi nhóm một thẻ có
  // tên nhóm — trước đây là một danh sách phẳng trộn bé của mọi nhóm.
  dsTheoNhom(students) {
    const dong = (s) => `
          <div class="list-row clickable" data-dong-be="${UI.esc(s.id)}" onclick="App.views.student.showDetail('${UI.esc(s.id)}')">
            ${UI.avatar(s.avatar, 44)}
            <div class="row-main">
              <div class="row-title">${UI.esc(s.name)}</div>
              <div class="row-sub">${UI.esc(s.code)} · ${UI.fmtDate(s.dob, { weekday: false })}</div>
            </div>
            <span class="muted">${UI.icon('chevron', 18)}</span>
          </div>`;
    const nhom = App.state.user.nhomCuaCo || [];
    if (nhom.length < 2) return `<div class="card">${students.map(dong).join('')}</div>`;
    return nhom.map(n => {
      const ds = students.filter(s => s.classId === n.id);
      if (!ds.length) return '';
      return `<div class="card"><div class="card-title">🏠 ${UI.esc(n.name)}
        <span class="muted small" style="font-weight:400">(${ds.length} bé)</span></div>${ds.map(dong).join('')}</div>`;
    }).join('') + (() => {
      const ngoai = students.filter(s => !nhom.some(n => n.id === s.classId));
      return ngoai.length ? `<div class="card">${ngoai.map(dong).join('')}</div>` : '';
    })();
  },

  // Dòng số điện thoại có nút Gọi (Đ139): "đủ số điện thoại của bố, mẹ và
  // người liên hệ khẩn cấp" — và bấm là gọi, không phải chép số sang ứng dụng khác.
  dongGoi(nhan, so) {
    const sach = String(so || '').replace(/\s/g, '');
    return `
      <div class="list-row">
        <div class="row-main">
          <div class="row-sub">${UI.esc(nhan)}</div>
          <div class="row-title">${UI.esc(so || '—')}</div>
        </div>
        ${sach ? `<a class="btn sm outline" href="tel:${UI.esc(sach)}">Gọi</a>` : ''}
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
          ${s.parents.map(p => this.dongGoi(`Phụ huynh: ${p.title} ${p.name}`, p.phone)
            + (p.soCccd ? infoRow(`CCCD của ${p.title} ${p.name}`, p.soCccd) : '')).join('')}
          ${(s.lienHeKhanCap || []).map(x => this.dongGoi(
            `Khẩn cấp: ${x.hoTen}${x.quanHe ? ` (${x.quanHe})` : ''}`, x.dienThoai)).join('')}
          ${!s.parents.length && !(s.lienHeKhanCap || []).length
            ? '<div class="muted small mt-8">Hồ sơ chưa có số điện thoại nào — nhờ văn phòng bổ sung.</div>' : ''}
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
