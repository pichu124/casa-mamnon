// ĐÓN TRẢ BÉ — ai được đón, uỷ quyền một lần, và sổ ghi đã trả cho ai.
//
// ĐÂY LÀ PHÂN HỆ AN TOÀN, KHÔNG PHẢI PHÂN HỆ TIỆN LỢI
//
// Sai ở đây là trao một đứa trẻ cho người không được phép. Sổ giấy làm việc
// này rất kém: danh sách người được đón nằm trong hồ sơ ở văn phòng, còn uỷ
// quyền đột xuất là một mẩu giấy hoặc một cuộc gọi mà cô ở cổng không có cách
// nào đối chiếu. Nên mọi lựa chọn dưới đây nghiêng về phía CHẶT.
//
// RANH GIỚI QUAN TRỌNG NHẤT: CÔ KHÔNG THÊM ĐƯỢC NGƯỜI ĐƯỢC ĐÓN
//
// Danh sách ai được đón một đứa trẻ là quyết định của GIA ĐÌNH, và văn phòng
// ghi hộ khi gia đình tới trường. Cô ở lớp không được tự thêm một cái tên vào
// đó — không phải vì nghi ngờ cô, mà vì một phân hệ cho phép điều đó thì chỉ
// cần MỘT tài khoản cô bị lộ mật khẩu là có đường hợp thức hoá việc đón trẻ.
//
// Việc của cô là việc ở cổng: NHÌN, ĐỐI CHIẾU ẢNH, và GHI LẠI đã trả cho ai.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const uploads = require('../../lib/uploads');
// Bé nào đang nghỉ có phép hôm nay — cùng một câu hỏi với màn Báo ăn và màn
// Nhật ký ngày, nên hỏi cùng một chỗ. Xem `lib/nghi-hoc.js`.
const nghiHoc = require('../../lib/nghi-hoc');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TOI_DA_TEN = 120;
const TOI_DA_GHI_CHU = 300;
const TOI_DA_DIEN_THOAI = 20;
// Uỷ quyền dài hơn một tháng thì không còn là "một lần" nữa — nó là người đón
// thường xuyên, và phải khai vào danh sách thường xuyên để còn có ảnh, có
// quan hệ, có người chịu trách nhiệm khai.
const TOI_DA_NGAY_UY_QUYEN = 31;
// Trần để một tài khoản bị chiếm không thể bơm hàng nghìn dòng vào hồ sơ bé.
const TOI_DA_NGUOI_MOI_BE = 12;
// TRẦN THỨ HAI: số dòng TẠO MỚI cho mỗi bé trong 24 giờ, đếm MỌI dòng bất kể
// còn dùng hay đã ngưng.
//
// Trần trên đếm số dòng ĐANG DÙNG — đó là con số đúng cho câu hỏi "bé có mấy
// người được đón". Nhưng "Ngưng dùng" là đường của chính gia đình, nên vòng
// tạo → ngưng dùng → tạo lại không vấp phải trần nào cả. Mỗi vòng ghi thêm một
// tấm ảnh vào ổ đĩa, và ảnh của dòng đã ngưng thì không có đường nào dọn.
//
// Chú thích của trần trên tự nêu mục đích: "để một tài khoản bị chiếm không thể
// bơm hàng nghìn dòng vào hồ sơ bé". Mã cũ không làm được đúng điều nó nói.
//
// 20 lần một ngày rộng hơn nhiều so với việc thật: một nhà khai đủ ông bà, cô
// dì, bác tài đưa đón cũng chỉ vài lần, và còn sửa được thay vì tạo mới.
const TOI_DA_TAO_MOI_24H = 20;
const TOI_DA_UY_QUYEN_DANG_HIEU_LUC = 10;

function homNay() {
  return ngay.homNay();
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

module.exports = (app, { db }) => {
  // AI ĐƯỢC SỬA DANH SÁCH NGƯỜI ĐƯỢC ĐÓN CỦA MỘT BÉ.
  //
  // Gia đình của chính bé đó, và quản trị (văn phòng ghi hộ khi gia đình tới
  // trường). Cô thì KHÔNG — xem khối chú thích ở đầu tệp.
  function duocSua(user, studentId) {
    if (!user || !studentId) return false;
    if (!db.canAccessStudent(user, studentId)) return false;
    return user.role === 'parent' || user.role === 'admin';
  }

  function chanNeuKhongDuocSua(req, res, studentId) {
    if (duocSua(req.user, studentId)) return false;
    if (req.user.role === 'teacher') {
      res.status(403).json({
        error: 'Danh sách người được đón bé do gia đình khai, văn phòng ghi hộ khi gia đình '
          + 'tới trường. Cô xem được để đối chiếu ở cổng và ghi lại đã trả bé cho ai.',
      });
    } else {
      res.status(403).json({ error: 'Không có quyền với hồ sơ đón trả của bé này' });
    }
    return true;
  }

  function nguoiCuaBe(studentId, keCaNgung = true) {
    return db.all('dontra_nguoi',
      `SELECT * FROM dontra_nguoi WHERE studentId = ?${keCaNgung ? '' : ' AND dangDung = 1'}
       ORDER BY dangDung DESC, hoTen`, [studentId])
      .map(x => ({ ...x, dangDung: x.dangDung !== 0 }));
  }

  // Trạng thái của một uỷ quyền, tính theo NGÀY đang xét.
  //
  // Ba trạng thái, và cả ba đều phải NÓI RA. Một uỷ quyền hết hạn mà lặng lẽ
  // biến mất là lúc người đó tới cổng, cô không thấy gì, rồi phải gọi điện hỏi
  // giữa lúc đang trả 20 bé.
  function trangThaiUyQuyen(u, ngay) {
    if (u.huyLuc) return 'da-huy';
    if (ngay < u.tuNgay) return 'chua-toi';
    if (ngay > u.denNgay) return 'het-han';
    return 'con-hieu-luc';
  }

  function uyQuyenCuaBe(studentId, ngay) {
    return db.all('dontra_uyquyen',
      'SELECT * FROM dontra_uyquyen WHERE studentId = ? ORDER BY tuNgay DESC', [studentId])
      .map(u => ({ ...u, trangThai: trangThaiUyQuyen(u, ngay) }));
  }

  // UỶ QUYỀN CỦA CẢ NHÓM, MỘT CÂU — VÀ CHỈ PHẦN MÀN CỔNG THẬT SỰ HIỆN RA.
  //
  // Hàm trên nạp TOÀN BỘ lịch sử uỷ quyền của một bé. Đúng cho hồ sơ một bé,
  // sai cho màn cổng: mỗi năm học trôi qua, màn này nặng thêm đúng bằng số lần
  // các nhà nhờ người đón hộ — mà uỷ quyền một lần chính là thứ nhà trường
  // muốn gia đình dùng thường xuyên. Đo thật trên nhóm c1 với 750 dòng uỷ
  // quyền đã hết hạn: 40 ms lên 118 ms, trong khi số dòng HIỆN RA vẫn là 0.
  //
  // Đây là màn nặng nhất trong ngày — 16h30–17h30, cả ba cơ sở cùng mở, cô
  // đứng ở cổng với điện thoại trên tay, phụ huynh đứng đợi trước mặt.
  //
  // VÌ SAO `denNgay >= ngày−7` LÀ ĐÚNG BẰNG PHẦN MÀN CỔNG HIỆN RA:
  // màn cổng có đúng hai mục, và cả hai đều nằm gọn trong mốc đó —
  //   • "được đón hôm nay" = còn hiệu lực, tức denNgay >= ngày;
  //   • "không còn hiệu lực" đã TỰ đòi denNgay >= ngày−7 ở chỗ lọc bên dưới.
  // Mục "chưa tới" không bao giờ được hiện ở màn này, nên không cần giữ.
  //
  // CỐ Ý KHÔNG thêm `tuNgay <= ngày`, dù nó trông hợp lý: một uỷ quyền của
  // NGÀY MAI mà gia đình đã huỷ có trạng thái 'da-huy' chứ không phải
  // 'chua-toi' (hàm `trangThaiUyQuyen` xét `huyLuc` trước), và cô vẫn phải
  // thấy nó — người đó có thể đang đứng ở cổng và cô cần biết vì sao app nói
  // không. Thêm điều kiện ấy là làm nó lặng lẽ biến mất.
  function uyQuyenChoManCong(studentIds, ngay) {
    const ra = new Map(studentIds.map(id => [id, []]));
    if (!studentIds.length) return ra;
    const dau = studentIds.map(() => '?').join(',');
    for (const u of db.all('dontra_uyquyen',
      `SELECT * FROM dontra_uyquyen WHERE studentId IN (${dau}) AND denNgay >= ?
       ORDER BY studentId, tuNgay DESC`, [...studentIds, luiNgay(ngay, 7)])) {
      ra.get(u.studentId).push({ ...u, trangThai: trangThaiUyQuyen(u, ngay) });
    }
    return ra;
  }

  // Người được đón THƯỜNG XUYÊN của cả nhóm, một câu. Chỉ người đang dùng —
  // đúng như `nguoiCuaBe(id, false)` mà màn cổng vẫn gọi.
  function nguoiDangDungCuaNhom(studentIds) {
    const ra = new Map(studentIds.map(id => [id, []]));
    if (!studentIds.length) return ra;
    const dau = studentIds.map(() => '?').join(',');
    for (const n of db.all('dontra_nguoi',
      `SELECT * FROM dontra_nguoi WHERE studentId IN (${dau}) AND dangDung = 1
       ORDER BY studentId, hoTen`, studentIds)) {
      ra.get(n.studentId).push({ ...n, dangDung: n.dangDung !== 0 });
    }
    return ra;
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // -------------------------------------------------------------------------
  // ĐỌC
  // -------------------------------------------------------------------------

  // Hồ sơ đón trả của MỘT bé.
  app.get('/api/dontra', (req, res) => {
    const studentId = String(req.query.studentId || '').trim();
    if (!studentId) return res.status(400).json({ error: 'Cần chọn bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem hồ sơ đón trả của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();

    res.json({
      be: { id: be.id, hoTen: be.name, avatar: be.avatar },
      ngay,
      duocSua: duocSua(req.user, studentId),
      nguoiThuongXuyen: nguoiCuaBe(studentId),
      uyQuyen: uyQuyenCuaBe(studentId, ngay).map(u => ({ ...u, nguoiTaoTen: tenNguoi(u.nguoiTao) })),
      soGanDay: db.all('dontra_ghi',
        'SELECT * FROM dontra_ghi WHERE studentId = ? ORDER BY ngay DESC LIMIT 30', [studentId])
        .map(g => ({ ...g, coGhiTen: tenNguoi(g.coGhi) })),
    });
  });

  // MÀN CỔNG của cô: cả nhóm, một ngày.
  //
  // Không cho phụ huynh vào đây. `db.canAccessClass` trả true cho phụ huynh
  // với nhóm của con họ — đúng cho thông báo hay album, nhưng màn này là danh
  // sách người được đón của HAI MƯƠI đứa trẻ khác, kèm ảnh và số điện thoại.
  app.get('/api/dontra/nhom', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.query.classId || '').trim();
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
    }
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();
    const dsBe = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);

    // BÉ ĐANG NGHỈ CÓ PHÉP THÌ SỔ ĐÓN TRẢ PHẢI NÓI RA.
    //
    // Không giấu dòng đi — bé có thể vẫn tới lớp dù nhà đã xin nghỉ. Nhưng để
    // nó nằm lẫn như một bé đang chờ được đón thì cuối giờ cô đếm "còn mấy bé
    // chưa ai đón" và đếm nhầm một bé đang ở nhà; nặng hơn, ô "chưa trả" đứng
    // đó suốt buổi chiều như một việc chưa xong.
    const maBe = dsBe.map(b => b.id);
    const dangNghi = nghiHoc.nghiCoPhep(maBe, ngay);

    // BA CÂU CHO CẢ NHÓM, KHÔNG PHẢI BA CÂU CHO MỖI BÉ.
    //
    // better-sqlite3 chạy ĐỒNG BỘ — mỗi câu chặn thẳng vòng lặp sự kiện của
    // máy chủ — nên chừng ấy câu của MỘT cô cũng làm chậm mọi cô khác đang mở
    // cùng màn ở hai cơ sở kia, đúng vào 16h30 khi cả ba cơ sở cùng trả bé.
    const uyTheoBe = uyQuyenChoManCong(maBe, ngay);
    const nguoiTheoBe = nguoiDangDungCuaNhom(maBe);
    const ghiTheoBe = new Map();
    if (maBe.length) {
      for (const g of db.all('dontra_ghi',
        `SELECT * FROM dontra_ghi WHERE studentId IN (${maBe.map(() => '?').join(',')})
           AND ngay = ?`, [...maBe, ngay])) {
        // Một bé một ngày một dòng (chỉ mục duy nhất `dontra_mot_be_mot_ngay`).
        ghiTheoBe.set(g.studentId, g);
      }
    }

    // Tên cô đã ghi sổ: một câu cho cả nhóm. Cả nhóm chỉ có 2–3 cô, nên bản cũ
    // là hai mươi mấy lượt hỏi lại đúng ba câu trả lời.
    const maCo = [...new Set([...ghiTheoBe.values()].map(g => g.coGhi).filter(Boolean))];
    const tenCo = new Map();
    if (maCo.length) {
      for (const u of db.all('users',
        `SELECT id, title, name FROM users WHERE id IN (${maCo.map(() => '?').join(',')})`, maCo)) {
        tenCo.set(u.id, `${u.title} ${u.name}`);
      }
    }

    const danhSach = dsBe.map(b => {
      const uy = uyTheoBe.get(b.id) || [];
      const ghi = ghiTheoBe.get(b.id) || null;
      return {
        studentId: b.id,
        hoTen: b.name,
        avatar: b.avatar,
        nguoiThuongXuyen: nguoiTheoBe.get(b.id) || [],
        // Chỉ uỷ quyền CÒN HIỆU LỰC mới nằm ở mục "được đón hôm nay"...
        uyQuyenHomNay: uy.filter(u => u.trangThai === 'con-hieu-luc'),
        // ...nhưng cái vừa hết hạn hoặc vừa bị huỷ thì vẫn nói ra, vì người đó
        // có thể đang đứng ở cổng và cô cần biết vì sao app nói không.
        uyQuyenKhongConHieuLuc: uy.filter(u =>
          u.trangThai !== 'con-hieu-luc' && u.trangThai !== 'chua-toi'
          && u.denNgay >= luiNgay(ngay, 7)),
        // `tenNguoi` trả '' khi không tìm thấy người; giữ đúng chữ đó ở đây để
        // sổ cũ của một cô đã nghỉ việc vẫn hiện y như trước.
        daTra: ghi ? { ...ghi, coGhiTen: ghi.coGhi ? (tenCo.get(ghi.coGhi) || '') : '' } : null,
        // `null` = bé đi học bình thường.
        nghiPhep: dangNghi.get(b.id) || null,
      };
    });

    res.json({
      ngay,
      classId,
      danhSach,
      tong: {
        soBe: danhSach.length,
        soDaTra: danhSach.filter(x => x.daTra).length,
        // Đếm "còn mấy bé chưa ai đón" mà tính cả bé đang ở nhà là đếm sai, và
        // cô sẽ đi tìm một đứa trẻ không có ở trường.
        soNghi: danhSach.filter(x => x.nghiPhep).length,
      },
    });
  });

  function luiNgay(ngay, n) {
    return new Date(Date.parse(`${ngay}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
  }

  // Ảnh của người được đón.
  //
  // ĐI QUA CANH QUYỀN, KHÔNG PHỤC VỤ TĨNH. Đây là ảnh khuôn mặt một người
  // trưởng thành gắn với một đứa trẻ cụ thể — biết ai đón bé nào cũng là một
  // thông tin về đứa trẻ đó. Chỉ gia đình của bé, cô của nhóm, và văn phòng
  // trong phạm vi cơ sở mới xem được.
  app.get('/api/dontra/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    const chu = db.first('dontra_nguoi', 'SELECT * FROM dontra_nguoi WHERE anh = ?', [file])
      || db.first('dontra_uyquyen', 'SELECT * FROM dontra_uyquyen WHERE anh = ?', [file]);
    // Không có ai nhận ảnh này thì trả 404 — trước cả khi hỏi tệp có tồn tại
    // không, để không ai dò được thư mục ảnh bằng cách so hai loại lỗi.
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!db.canAccessStudent(req.user, chu.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // -------------------------------------------------------------------------
  // NGƯỜI ĐƯỢC ĐÓN THƯỜNG XUYÊN
  // -------------------------------------------------------------------------
  function lamSachNguoi(b) {
    const hoTen = chuoi(b.hoTen, TOI_DA_TEN);
    if (!hoTen) return { loi: 'Cần nhập họ tên người được đón' };
    return {
      hoTen,
      quanHe: chuoi(b.quanHe, 40),
      dienThoai: chuoi(b.dienThoai, TOI_DA_DIEN_THOAI),
      ghiChu: chuoi(b.ghiChu, TOI_DA_GHI_CHU),
    };
  }

  // Nhận ảnh dạng data URL. Trả { anh } hoặc { loi }.
  function nhanAnh(anhMoi) {
    if (!anhMoi) return { anh: '' };
    try {
      return { anh: uploads.saveDataUrl(anhMoi).file };
    } catch (err) {
      return { loi: err.message || 'Ảnh không hợp lệ' };
    }
  }

  app.post('/api/dontra/nguoi', (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '').trim();
    if (!db.findStudent(studentId)) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (chanNeuKhongDuocSua(req, res, studentId)) return;

    const s = lamSachNguoi(b);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const dsCuaBe = nguoiCuaBe(studentId);
    const dangCo = dsCuaBe.filter(x => x.dangDung).length;
    if (dangCo >= TOI_DA_NGUOI_MOI_BE) {
      return res.status(400).json({
        error: `Mỗi bé giữ tối đa ${TOI_DA_NGUOI_MOI_BE} người được đón thường xuyên. `
          + 'Ai không còn đón nữa thì bấm "Ngưng dùng" giúp trường nhé.',
      });
    }
    // Trần thứ hai — xem chú thích ở `TOI_DA_TAO_MOI_24H`.
    const motNgayTruoc = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const taoGanDay = dsCuaBe.filter(x => String(x.taoLuc || '') >= motNgayTruoc).length;
    if (taoGanDay >= TOI_DA_TAO_MOI_24H) {
      return res.status(400).json({
        error: 'Hôm nay đã khai khá nhiều người đón cho bé rồi. '
          + 'Xin gia đình sửa lại người đã khai thay vì thêm mới, '
          + 'hoặc nhờ văn phòng nhà trường giúp.',
      });
    }
    const a = nhanAnh(b.anh);
    if (a.loi) return res.status(400).json({ error: a.loi });

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('dtn'), studentId, ...s, anh: a.anh,
      dangDung: 1, nguoiTao: req.user.id, taoLuc: luc, capNhatLuc: luc,
    };
    db.insert('dontra_nguoi', rec);
    db.audit(req.user.id, 'dontra-them-nguoi', studentId, { hoTen: rec.hoTen, coAnh: !!a.anh });
    res.status(201).json({ ...rec, dangDung: true });
  });

  app.put('/api/dontra/nguoi/:id', (req, res) => {
    const cu = db.first('dontra_nguoi', 'SELECT * FROM dontra_nguoi WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy người được đón này' });
    if (chanNeuKhongDuocSua(req, res, cu.studentId)) return;

    const b = req.body || {};
    const patch = { capNhatLuc: new Date().toISOString() };
    if (b.hoTen !== undefined || b.quanHe !== undefined || b.dienThoai !== undefined || b.ghiChu !== undefined) {
      const s = lamSachNguoi({ ...cu, ...b });
      if (s.loi) return res.status(400).json({ error: s.loi });
      Object.assign(patch, s);
    }
    if (b.dangDung !== undefined) patch.dangDung = b.dangDung ? 1 : 0;
    if (b.anh) {
      const a = nhanAnh(b.anh);
      if (a.loi) return res.status(400).json({ error: a.loi });
      patch.anh = a.anh;
      // Ảnh cũ bị thay thì bỏ tệp cũ đi — nó không còn ai trỏ tới, mà đây là
      // ảnh khuôn mặt một con người thật.
      if (cu.anh) { try { uploads.remove(cu.anh); } catch (_) { /* tệp đã mất thì thôi */ } }
    }

    db.update('dontra_nguoi', cu.id, patch);
    db.audit(req.user.id, 'dontra-sua-nguoi', cu.studentId, {
      id: cu.id, ngungDung: patch.dangDung === 0,
    });
    const moi = db.first('dontra_nguoi', 'SELECT * FROM dontra_nguoi WHERE id = ?', [cu.id]);
    res.json({ ...moi, dangDung: moi.dangDung !== 0 });
  });

  // -------------------------------------------------------------------------
  // UỶ QUYỀN MỘT LẦN
  // -------------------------------------------------------------------------
  app.post('/api/dontra/uyquyen', (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '').trim();
    if (!db.findStudent(studentId)) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (chanNeuKhongDuocSua(req, res, studentId)) return;

    const hoTen = chuoi(b.hoTen, TOI_DA_TEN);
    if (!hoTen) return res.status(400).json({ error: 'Cần nhập họ tên người được uỷ quyền đón' });

    const tuNgay = chuoi(b.tuNgay, 10);
    const denNgay = chuoi(b.denNgay, 10) || tuNgay;
    if (!NGAY_RE.test(tuNgay) || !NGAY_RE.test(denNgay)) {
      return res.status(400).json({ error: 'Ngày uỷ quyền chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    }
    if (denNgay < tuNgay) {
      return res.status(400).json({ error: 'Ngày kết thúc phải sau hoặc trùng ngày bắt đầu' });
    }
    const soNgay = Math.round(
      (Date.parse(`${denNgay}T00:00:00Z`) - Date.parse(`${tuNgay}T00:00:00Z`)) / 86400000) + 1;
    if (soNgay > TOI_DA_NGAY_UY_QUYEN) {
      return res.status(400).json({
        error: `Uỷ quyền một lần dài nhất ${TOI_DA_NGAY_UY_QUYEN} ngày. Người đón lâu dài hơn thì `
          + 'gia đình khai vào danh sách người đón thường xuyên giúp trường nhé.',
      });
    }
    if (denNgay < homNay()) {
      return res.status(400).json({ error: 'Uỷ quyền đã qua thì không tạo mới được nữa' });
    }

    const tatCaUyQuyen = uyQuyenCuaBe(studentId, homNay());
    const dangCo = tatCaUyQuyen
      .filter(u => u.trangThai === 'con-hieu-luc' || u.trangThai === 'chua-toi').length;
    if (dangCo >= TOI_DA_UY_QUYEN_DANG_HIEU_LUC) {
      return res.status(400).json({
        error: `Bé đang có ${dangCo} uỷ quyền còn hiệu lực. Huỷ bớt cái không dùng nữa giúp trường nhé.`,
      });
    }
    // Trần thứ hai, đếm MỌI dòng tạo trong 24 giờ bất kể đã huỷ — cùng lý do
    // và cùng con số với `TOI_DA_TAO_MOI_24H` của danh sách người thường
    // xuyên: "Huỷ" là đường của chính gia đình, nên vòng tạo → huỷ → tạo lại
    // lách được trần trên, mà mỗi vòng lại ghi thêm một tấm ảnh vào ổ đĩa và
    // ảnh của uỷ quyền đã huỷ thì không có đường nào dọn.
    const motNgayTruocUQ = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const taoGanDayUQ = tatCaUyQuyen.filter(u => String(u.taoLuc || '') >= motNgayTruocUQ).length;
    if (taoGanDayUQ >= TOI_DA_TAO_MOI_24H) {
      return res.status(400).json({
        error: 'Hôm nay đã gửi khá nhiều uỷ quyền cho bé rồi. '
          + 'Xin gia đình dùng lại uỷ quyền đã khai, hoặc nhờ văn phòng nhà trường giúp.',
      });
    }

    // ẢNH KHÔNG BẮT BUỘC, NHƯNG PHẢI NÓI RÕ LÀ THIẾU.
    //
    // Nhà trường yêu cầu "uỷ quyền một lần có kèm ảnh". Nhưng bắt buộc phải có
    // ảnh thì mẹ đang họp, điện thoại không có ảnh bác hàng xóm, sẽ gọi điện
    // cho cô — tức quay về đúng cách cũ mà app định thay. Nên: cho gửi không
    // ảnh, và màn hình của cô ở cổng NÓI THẲNG "uỷ quyền này không có ảnh".
    const a = nhanAnh(b.anh);
    if (a.loi) return res.status(400).json({ error: a.loi });

    const rec = {
      id: db.nextId('dtu'), studentId, hoTen,
      quanHe: chuoi(b.quanHe, 40),
      dienThoai: chuoi(b.dienThoai, TOI_DA_DIEN_THOAI),
      anh: a.anh,
      tuNgay, denNgay,
      lyDo: chuoi(b.lyDo, TOI_DA_GHI_CHU),
      huyLuc: null, huyBoi: null,
      nguoiTao: req.user.id, taoLuc: new Date().toISOString(),
    };
    db.insert('dontra_uyquyen', rec);
    db.audit(req.user.id, 'dontra-uy-quyen', studentId, { hoTen, tuNgay, denNgay, coAnh: !!a.anh });
    res.status(201).json({ ...rec, trangThai: trangThaiUyQuyen(rec, homNay()) });
  });

  // Huỷ một uỷ quyền. HUỶ chứ không xoá — cô cần thấy "đã bị gia đình huỷ",
  // không phải một khoảng trống.
  app.post('/api/dontra/uyquyen/:id/huy', (req, res) => {
    const u = db.first('dontra_uyquyen', 'SELECT * FROM dontra_uyquyen WHERE id = ?', [req.params.id]);
    if (!u) return res.status(404).json({ error: 'Không tìm thấy uỷ quyền này' });
    if (chanNeuKhongDuocSua(req, res, u.studentId)) return;
    if (u.huyLuc) return res.status(400).json({ error: 'Uỷ quyền này đã huỷ trước đó' });

    const luc = new Date().toISOString();
    db.update('dontra_uyquyen', u.id, { huyLuc: luc, huyBoi: req.user.id });
    db.audit(req.user.id, 'dontra-huy-uy-quyen', u.studentId, { id: u.id, hoTen: u.hoTen });
    res.json({ ...u, huyLuc: luc, huyBoi: req.user.id, trangThai: 'da-huy' });
  });

  // -------------------------------------------------------------------------
  // SỔ TRẢ BÉ — việc của cô ở cổng
  // -------------------------------------------------------------------------
  app.post('/api/dontra/ghi', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const be = db.findStudent(String(b.studentId || '').trim());
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, be.id)) {
      return res.status(403).json({ error: `Không có quyền ghi sổ đón trả cho bé ${be.name}` });
    }
    const ngay = NGAY_RE.test(String(b.ngay || '')) ? b.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi sổ trả bé cho ngày chưa tới được' });
    }
    const luc = chuoi(b.luc, 5);
    if (luc && !GIO_RE.test(luc)) {
      return res.status(400).json({ error: 'Giờ trả bé phải có dạng 16:30' });
    }

    // TÊN NGƯỜI ĐÓN LÀ BẮT BUỘC, và được CHÉP LẠI chứ không chỉ giữ khoá.
    //
    // Sang năm gia đình gỡ cô giúp việc khỏi danh sách thì sổ tháng Chín vẫn
    // phải nói đúng hôm đó ai đón bé, chứ không hiện một dòng trống.
    let nguoiDon = chuoi(b.nguoiDon, TOI_DA_TEN);
    let nguonLoai = ['thuong-xuyen', 'uy-quyen', 'khac', 'giu'].includes(String(b.nguonLoai || ''))
      ? b.nguonLoai : 'khac';
    let nguonId = chuoi(b.nguonId, 40);

    // 'giu' = GIỮ NGUYÊN NGƯỜI ĐÓN đã ghi của ngày đó, chỉ sửa giờ / ghi chú.
    //
    // Dành cho lúc cô mở lại một bản ghi cũ mà người đón gốc KHÔNG còn trong
    // danh sách chọn (gia đình đã gỡ tên, uỷ quyền đã qua ngày): không có giá
    // trị này thì ô chọn trên màn hình buộc phải nhảy sang một cái tên khác,
    // và cô sửa mỗi giờ trả cũng thành sổ đổi tên người đón — trên đúng quyển
    // sổ là chứng cứ duy nhất khi có tranh chấp về việc giao bé cho ai.
    //
    // Người đón chép NGUYÊN từ sổ nên hai khối kiểm danh sách bên dưới được
    // miễn — chúng chỉ dành cho việc ghi nhận một người MỚI.
    const giuNguyen = nguonLoai === 'giu';
    if (giuNguyen) {
      const daGhi = db.first('dontra_ghi',
        'SELECT * FROM dontra_ghi WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
      if (!daGhi) {
        return res.status(400).json({ error: 'Ngày này chưa có bản ghi trả bé nào để giữ nguyên người đón' });
      }
      nguoiDon = daGhi.nguoiDon;
      nguonLoai = daGhi.nguonLoai;
      nguonId = daGhi.nguonId;
    }

    if (!giuNguyen && nguonLoai === 'thuong-xuyen' && nguonId) {
      const n = db.first('dontra_nguoi', 'SELECT * FROM dontra_nguoi WHERE id = ?', [nguonId]);
      if (!n || n.studentId !== be.id) {
        return res.status(400).json({ error: 'Người được đón này không thuộc hồ sơ của bé' });
      }
      // NGƯỜI GIA ĐÌNH ĐÃ NGƯNG DÙNG THÌ KHÔNG GHI SỔ BẰNG HỌ ĐƯỢC.
      //
      // Không cần kẻ tấn công nào: cô mở màn cổng lúc 7 giờ sáng, danh sách
      // nằm trong bộ nhớ trang cả ngày; 10 giờ gia đình gỡ một tên (ly hôn,
      // người giúp việc nghỉ, có mâu thuẫn); 4 giờ chiều cô bấm "Ghi: đã trả
      // bé" từ danh sách cũ — và máy chủ nhận.
      //
      // Sổ đón trả là chứng cứ DUY NHẤT khi có tranh chấp về việc giao một đứa
      // trẻ cho ai, và `schema.sql` của phân hệ này tự nhận nó là "phân hệ AN
      // TOÀN, không phải phân hệ tiện lợi".
      //
      // Chép đúng cách đã dùng cho uỷ quyền hết hạn ngay bên dưới: GIỮ ĐƯỜNG
      // RA cho cô. Cô vẫn trả bé được — chỉ là phải ghi "Người khác" và gõ
      // tên, để sổ nói đúng chuyện đã xảy ra thay vì mượn một dòng danh sách
      // gia đình đã gỡ.
      if (n.dangDung === 0) {
        return res.status(400).json({
          error: `Gia đình đã ngưng dùng ${n.hoTen} trong danh sách người được đón. `
            + 'Nếu vẫn trả bé thì cô chọn "Người khác" và ghi rõ tên giúp trường nhé.',
        });
      }
      if (!nguoiDon) nguoiDon = n.hoTen;
    }
    if (!giuNguyen && nguonLoai === 'uy-quyen' && nguonId) {
      const u = db.first('dontra_uyquyen', 'SELECT * FROM dontra_uyquyen WHERE id = ?', [nguonId]);
      if (!u || u.studentId !== be.id) {
        return res.status(400).json({ error: 'Uỷ quyền này không thuộc hồ sơ của bé' });
      }
      // KHÔNG cho ghi nhận bằng một uỷ quyền đã hết hạn hoặc đã bị huỷ. Cô vẫn
      // trả bé được — nhưng phải ghi là "người khác" và gõ tên, để sổ nói đúng
      // chuyện đã xảy ra thay vì mượn một tờ giấy không còn giá trị.
      const tt = trangThaiUyQuyen(u, ngay);
      if (tt !== 'con-hieu-luc') {
        return res.status(400).json({
          error: `Uỷ quyền cho ${u.hoTen} ${tt === 'da-huy' ? 'đã bị gia đình huỷ'
            : tt === 'het-han' ? 'đã hết hạn' : 'chưa tới ngày có hiệu lực'}. `
            + 'Nếu vẫn trả bé thì cô chọn "Người khác" và ghi rõ tên giúp trường nhé.',
        });
      }
      if (!nguoiDon) nguoiDon = u.hoTen;
    }
    if (!nguoiDon) return res.status(400).json({ error: 'Cần ghi rõ tên người đón bé' });

    const rec = {
      studentId: be.id, ngay, luc, nguoiDon, nguonLoai, nguonId,
      ghiChu: chuoi(b.ghiChu, TOI_DA_GHI_CHU),
      coGhi: req.user.id, capNhatLuc: new Date().toISOString(),
    };
    const cu = db.first('dontra_ghi',
      'SELECT * FROM dontra_ghi WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
    if (cu) db.update('dontra_ghi', cu.id, rec);
    else db.insert('dontra_ghi', { id: db.nextId('dtg'), ...rec });

    db.audit(req.user.id, 'dontra-tra-be', be.id, { ngay, nguoiDon, nguonLoai });
    res.json({ ok: true, ...rec, coGhiTen: tenNguoi(req.user.id) });
  });
};
