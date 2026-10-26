// XUẤT BÁO CÁO — màn hình (Đ239c, góp ý 16/10 mục 2 và 3).
//
// Một thẻ cho mỗi phần, và CHỈ vẽ phần người này mở được: máy chủ quyết qua
// `/api/xuatbaocao/pham-vi`, màn hình không tự đoán theo chức vụ. Mỗi thẻ ba
// bước cho người không rành máy: chọn phạm vi, chọn thời gian (mặc định tháng
// này), chọn kiểu — rồi bấm "Tải Excel".
//
// Tải bằng fetch rồi lưu tệp, không đổi thẳng `location`: máy chủ từ chối
// (quá khoảng ngày, chưa chọn bé...) thì màn báo lỗi bằng tiếng Việt, người
// dùng không rơi vào một trang chữ máy.
//
// `#/xuatbaocao/<phần>` (ví dụ `#/xuatbaocao/diemdanh-be`) cuộn thẳng tới thẻ
// đó — để màn Điểm danh có lối vào "Xuất báo cáo điểm danh".
App.views.xuatbaocao = {
  PHAN: [
    {
      ma: 'diemDanhBe', id: 'diemdanh-be', ten: 'Điểm danh của bé', doiTuong: 'be', thoiGian: 'ngay',
      moTa: 'Mỗi bé có mặt, đến muộn, nghỉ có phép, nghỉ không phép bao nhiêu ngày — hoặc giờ vào, giờ ra từng ngày.',
      kieu: [['trangthai', 'Có mặt / nghỉ phép / nghỉ không phép'], ['gio', 'Giờ vào – giờ ra từng ngày']],
      duong: '/api/xuatbaocao/diemdanh-be',
    },
    {
      ma: 'diemDanhCo', id: 'diemdanh-co', ten: 'Điểm danh cô và nhân viên', doiTuong: 'nguoi', thoiGian: 'ngay',
      moTa: 'Giờ vào, giờ ra ở cổng; hoặc số ngày đi làm, nghỉ phép theo bảng công. Tệp không kèm ảnh.',
      kieu: [['trangthai', 'Đi làm / nghỉ phép / nghỉ không phép'], ['gio', 'Giờ vào – giờ ra từng ngày']],
      duong: '/api/xuatbaocao/diemdanh-co',
    },
    {
      ma: 'tienAn', id: 'tien-an', ten: 'Đối chiếu tiền ăn tháng', doiTuong: 'tienan', thoiGian: 'thang',
      moTa: 'Số ngày ăn ở trường, ngày vắng, ngày được hoàn tiền ăn của từng bé — đúng bảng đối chiếu cuối tháng.',
    },
    {
      ma: 'baoCaoHocTap', id: 'bao-cao', ten: 'Báo cáo tháng và báo cáo 6 tháng', doiTuong: 'be', thoiGian: 'ngay',
      moTa: 'Từng mục của bản báo cáo, kèm tình trạng: nháp, chờ duyệt, đã duyệt, đã gửi gia đình.',
      loai: [['thang', 'Báo cáo tháng'], ['hocky', 'Báo cáo 6 tháng']],
      duong: '/api/xuatbaocao/baocao-hoctap',
    },
    {
      ma: 'keHoachBe', id: 'ke-hoach', ten: 'Kế hoạch của bé', doiTuong: 'be', thoiGian: 'khoangThang',
      moTa: 'Bài và mục theo từng lĩnh vực, phần nhìn lại cuối tháng bằng chữ quy ước, việc tiếp tục ở tháng sau.',
      duong: '/api/xuatbaocao/kehoach-be',
    },
    {
      ma: 'hoSoBe', id: 'ho-so', ten: 'Hồ sơ bé', doiTuong: 'be', thoiGian: null, keCaNghi: true,
      moTa: 'Thông tin của bé, gia đình, người liên hệ khẩn cấp và giấy đồng ý.',
      duong: '/api/xuatbaocao/ho-so-be',
    },
  ],

  async render(root, params = []) {
    const pv = await API.get('/api/xuatbaocao/pham-vi');
    this._pv = pv;
    const phan = this.PHAN.filter(p => pv.phan && pv.phan[p.ma] && pv.phan[p.ma].duoc);
    root.innerHTML = `
      ${UI.pageHeader('Xuất báo cáo')}
      <div class="card">
        <div class="muted small" style="line-height:1.7">
          Chọn phạm vi và thời gian, rồi bấm <b>Tải Excel</b>. Tệp có tên bé và thông tin của
          gia đình — giữ trên máy của trường, đừng gửi vào nhóm trò chuyện chung.
        </div>
      </div>
      ${phan.length ? phan.map(p => this.the(p)).join('')
    : UI.emptyState('📤', 'Tài khoản này chưa có phần nào để xuất.')}`;
    for (const p of phan) this.gan(p);
    const dich = phan.find(p => p.id === params[0]);
    const el = dich ? document.getElementById(`xb-${dich.id}`) : null;
    if (el && el.scrollIntoView) el.scrollIntoView();
  },

  luaChonPhamVi(p) {
    const pv = this._pv;
    if (p.doiTuong === 'tienan') return [['', 'Mọi nhóm của tài khoản này'], ['nhom', 'Một nhóm']];
    const ra = [];
    if (pv.caTruong) ra.push(['truong', 'Cả trường']);
    if ((pv.coSo || []).length) ra.push(['coso', 'Một cơ sở']);
    ra.push(['nhom', p.doiTuong === 'nguoi' ? 'Cô của một nhóm' : 'Một nhóm']);
    ra.push(p.doiTuong === 'nguoi' ? ['nguoi', 'Một người'] : ['be', 'Một bé']);
    return ra;
  },

  oChon(id, nhan, ds) {
    return `<div class="field">
      <label for="${id}">${UI.esc(nhan)}</label>
      <select id="${id}">${ds.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')}</select>
    </div>`;
  },

  the(p) {
    const pv = this._pv;
    const id = `xb-${p.id}`;
    const thang = UI.todayStr().slice(0, 7);
    const coSo = (pv.coSo || []).map(c => [c.id, c.name]);
    const nhom = (pv.nhom || []).map(n => [n.id, n.name]);
    const thoiGian = {
      ngay: `
        ${this.oChon(`${id}-cach`, 'Thời gian', [['thang', 'Một tháng'], ['khoang', 'Từ ngày… đến ngày…']])}
        <div class="field" id="${id}-o-thang"><label for="${id}-thang">Tháng</label>
          <input type="month" id="${id}-thang" value="${UI.esc(thang)}"></div>
        <div id="${id}-o-khoang" hidden>
          <div class="field"><label for="${id}-tu">Từ ngày</label><input type="date" id="${id}-tu" value="${UI.esc(`${thang}-01`)}"></div>
          <div class="field"><label for="${id}-den">Đến ngày</label><input type="date" id="${id}-den" value="${UI.esc(UI.todayStr())}"></div>
        </div>`,
      thang: `<div class="field"><label for="${id}-thang">Tháng đối chiếu</label>
          <input type="month" id="${id}-thang" value="${UI.esc(thang)}"></div>`,
      khoangThang: `
        ${this.oChon(`${id}-cach`, 'Thời gian', [['thang', 'Một tháng'], ['khoang', 'Nhiều tháng liền nhau']])}
        <div class="field"><label for="${id}-thang">Tháng</label>
          <input type="month" id="${id}-thang" value="${UI.esc(thang)}"></div>
        <div class="field" id="${id}-o-khoang" hidden><label for="${id}-thang-den">Đến tháng</label>
          <input type="month" id="${id}-thang-den" value="${UI.esc(thang)}"></div>`,
    };
    return `
      <div class="card" id="${id}">
        <div class="card-title">${UI.esc(p.ten)}</div>
        <div class="muted small mb-8" style="line-height:1.6">${UI.esc(p.moTa)}</div>
        ${this.oChon(`${id}-pham`, 'Phạm vi', this.luaChonPhamVi(p))}
        <div id="${id}-o-coso" hidden>${this.oChon(`${id}-coso`, 'Cơ sở', coSo)}</div>
        <div id="${id}-o-nhom" hidden>${this.oChon(`${id}-nhom`, 'Nhóm lớp', nhom)}</div>
        ${p.doiTuong === 'nguoi' ? `
        <div class="field" id="${id}-o-ai" hidden>
          <label for="${id}-tim">Tìm theo tên</label>
          <input type="search" id="${id}-tim" placeholder="Gõ vài chữ trong tên" autocomplete="off">
          <select id="${id}-ai" size="5" style="margin-top:8px"></select>
        </div>` : `
        <div id="${id}-o-ai" hidden>
          ${coSo.length > 1 ? this.oChon(`${id}-be-coso`, 'Cơ sở', coSo) : ''}
          ${this.oChon(`${id}-be-nhom`, 'Nhóm lớp', [])}
          ${this.oChon(`${id}-ai`, 'Bé', [])}
        </div>`}
        ${p.thoiGian ? thoiGian[p.thoiGian] : ''}
        ${p.kieu ? this.oChon(`${id}-kieu`, 'Kiểu báo cáo', p.kieu) : ''}
        ${p.loai ? this.oChon(`${id}-loai`, 'Loại báo cáo', p.loai) : ''}
        ${p.keCaNghi ? `<label class="small" style="display:flex;gap:8px;align-items:center;margin:4px 0 12px">
          <input type="checkbox" id="${id}-nghi"> Kèm cả bé đã nghỉ học</label>` : ''}
        <button type="button" class="btn primary block" id="${id}-tai">${UI.icon('report', 18)} Tải Excel</button>
        ${p.ma === 'tienAn' ? `<a class="btn outline block mt-8" href="#/tienan">Mở bảng đối chiếu trên màn hình</a>` : ''}
      </div>`;
  },

  // Bỏ dấu để tìm "an" ra "Bảo An", "ngoc" ra "Bảo Ngọc".
  khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  },

  // CHỌN MỘT BÉ THEO BẬC Cơ sở → Nhóm lớp → Bé (góp ý 20/10, K2), thay cho ô
  // tìm + hộp danh sách dài. Ô sau lọc theo ô trước, và chỉ từ `pham-vi` máy
  // chủ đã lọc theo quyền — màn hình không tự thêm bé nào. Trường một cơ sở
  // (hay tài khoản một cơ sở) thì không có ô cơ sở.
  ganChonBe(p) {
    const pv = this._pv;
    const $ = (k) => document.getElementById(`xb-${p.id}-${k}`);
    const tuyChon = (ds, rong) => (ds.length
      ? ds.map(([v, t]) => `<option value="${UI.esc(v)}">${UI.esc(t)}</option>`).join('')
      : `<option value="">${UI.esc(rong)}</option>`);
    const beTheoNhom = new Map();
    for (const b of pv.be || []) {
      if (!beTheoNhom.has(b.classId)) beTheoNhom.set(b.classId, []);
      beTheoNhom.get(b.classId).push(b);
    }
    const veBe = () => {
      const ds = (beTheoNhom.get($('be-nhom').value) || []).slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
      $('ai').innerHTML = tuyChon(ds.map(b => [b.id, b.name]), 'Nhóm này chưa có bé');
    };
    const veNhom = () => {
      const cs = $('be-coso') ? $('be-coso').value : '';
      const ds = (pv.nhom || []).filter(n => !cs || n.campusId === cs);
      $('be-nhom').innerHTML = tuyChon(ds.map(n => [n.id, n.name]), 'Cơ sở này chưa có nhóm lớp');
      veBe();
    };
    if ($('be-coso')) $('be-coso').onchange = veNhom;
    $('be-nhom').onchange = veBe;
    veNhom();
  },

  gan(p) {
    const pv = this._pv;
    const id = `xb-${p.id}`;
    const $ = (k) => document.getElementById(`${id}-${k}`);
    const ds = (pv.nguoi || []).map(n => ({ id: n.id, ten: n.hoTen, phu: n.vai }));
    const veDanhSach = () => {
      const tim = this.khongDau($('tim') ? $('tim').value.trim() : '');
      const hop = ds.filter(x => !tim || this.khongDau(x.ten).includes(tim)).slice(0, 50);
      $('ai').innerHTML = hop.map(x => `<option value="${UI.esc(x.id)}">${UI.esc(x.ten)}${x.phu ? ` — ${UI.esc(x.phu)}` : ''}</option>`).join('');
      if (hop.length === 1) $('ai').value = hop[0].id;
    };
    const doiPham = () => {
      const pham = $('pham').value;
      $('o-coso').hidden = pham !== 'coso';
      $('o-nhom').hidden = pham !== 'nhom';
      $('o-ai').hidden = pham !== 'be' && pham !== 'nguoi';
    };
    $('pham').onchange = doiPham;
    if ($('tim')) $('tim').oninput = veDanhSach;
    if ($('cach')) {
      $('cach').onchange = () => {
        const khoang = $('cach').value === 'khoang';
        if ($('o-khoang')) $('o-khoang').hidden = !khoang;
        if ($('o-thang') && p.thoiGian === 'ngay') $('o-thang').hidden = khoang;
      };
    }
    $('tai').onclick = () => this.tai(p);
    doiPham();
    if (p.doiTuong === 'nguoi') veDanhSach();
    else if (p.doiTuong === 'be') this.ganChonBe(p);
  },

  async tai(p) {
    const id = `xb-${p.id}`;
    const $ = (k) => document.getElementById(`${id}-${k}`);
    const gt = (k) => ($(k) ? $(k).value : '');
    const q = new URLSearchParams();
    const pham = gt('pham');
    if (p.doiTuong === 'tienan') {
      if (pham === 'nhom') q.set('classId', gt('nhom'));
    } else {
      q.set('pham', pham);
      if (pham === 'coso') q.set('campusId', gt('coso'));
      if (pham === 'nhom') q.set('classId', gt('nhom'));
      if (pham === 'be' || pham === 'nguoi') {
        if (!gt('ai')) return UI.toast(pham === 'be' ? 'Chọn một bé trong danh sách trước đã' : 'Chọn một người trong danh sách trước đã', 'error');
        q.set(pham === 'be' ? 'studentId' : 'userId', gt('ai'));
      }
    }
    const khoang = gt('cach') === 'khoang';
    if (p.thoiGian === 'ngay') {
      if (khoang) { q.set('tu', gt('tu')); q.set('den', gt('den')); } else q.set('thang', gt('thang'));
    } else if (p.thoiGian === 'thang') {
      q.set('thang', gt('thang'));
    } else if (p.thoiGian === 'khoangThang') {
      if (khoang) { q.set('tu', gt('thang')); q.set('den', gt('thang-den')); } else q.set('thang', gt('thang'));
    }
    if (p.kieu) q.set('kieu', gt('kieu'));
    if (p.loai) q.set('loai', gt('loai'));
    if (p.keCaNghi && $('nghi') && $('nghi').checked) q.set('keCaNghi', '1');

    const duong = p.ma === 'tienAn' ? ((this._pv.phan.tienAn || {}).duong || '/api/tienan/thang.xlsx') : p.duong;
    const nut = $('tai');
    nut.disabled = true;
    try {
      const res = await fetch(`${duong}?${q.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) {
        let loi = '';
        try { loi = (await res.json()).error || ''; } catch (_) { loi = ''; }
        throw new Error(loi || 'Chưa tải được tệp. Thử lại sau ít phút nhé.');
      }
      const blob = await res.blob();
      const ten = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ten ? ten[1] : 'bao-cao.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      UI.toast('Đã tải tệp Excel về máy', 'success');
    } catch (err) {
      UI.toast(err.message || 'Chưa tải được tệp. Thử lại sau ít phút nhé.', 'error');
    } finally {
      nut.disabled = false;
    }
  },
};
