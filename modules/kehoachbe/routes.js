// KẾ HOẠCH CỦA BÉ — kế hoạch tháng cho từng bé, có phê duyệt.
//
// HAI RỦI RO ĐÃ ĐƯỢC NÊU TRƯỚC KHI VIẾT DÒNG ĐẦU TIÊN
//
//   1. KHỐI LƯỢNG NHẬP LIỆU CHO CÔ RẤT LỚN. Một nhóm 20 bé nhân 5 góc lĩnh
//      vực là 100 ô mỗi tháng. Bắt cô gõ 100 ô là bảo đảm phân hệ này bị bỏ
//      xó sau tháng thứ hai. Nên ở đây có ba đường tắt, và cả ba đều là
//      đường CHÍNH chứ không phải tiện ích thêm:
//
//        • "Đặt cả nhóm": gõ 5 dòng, cả 20 bé có kế hoạch, rồi sửa lẻ bé nào
//          khác. Cùng họ với "đặt nhanh cho cả nhóm" của Nhật ký ngày.
//        • "Chép tháng trước": một lần bấm, và những mục cô đã đánh dấu
//          "tiếp tục ở tháng sau" được mang sang trước tiên.
//        • Lưu CẢ NHÓM trong một giao dịch, không phải 20 lần bấm Lưu.
//
//   2. VẾ CUỐI THÁNG CỦA NHÀ TRƯỜNG CHẠM QUY TẮC 2. Nhà trường mô tả bước
//      cuối tháng bằng một cặp từ đúng/sai rồi ôn tiếp. Giữ nguyên tinh
//      thần — nhìn lại, và làm tiếp thứ chưa xong — nhưng đổi cách nói và đổi
//      cả cấu trúc dữ liệu: `ketQua` dùng đúng năm trạng thái của phân hệ Hành
//      trình học tập, không có giá trị nào là một trong cặp từ đó. Phần "ôn
//      tiếp" thành ô tích `tiepTucThangSau` — trung tính, và cũng chính là
//      việc-làm-tiếp mà QUY TẮC 5 đòi hỏi.
//
//      Chú thích này CỐ Ý không chép lại nguyên văn cặp từ kia. Bài test quét
//      cả chú thích, và một bộ canh có ngoại lệ "trong ngoặc kép thì không
//      tính" là một bộ canh có lỗ.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');

const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// NĂM GÓC LĨNH VỰC của lớp học CASA — do nhà trường liệt kê.
const GOC_LINH_VUC = [
  ['toan', 'Toán'],
  ['tieng-viet', 'Tiếng Việt'],
  ['cambridge', 'Cambridge'],
  ['thuc-hanh-cuoc-song', 'Thực hành cuộc sống'],
  ['giac-quan', 'Giác quan'],
];
const MA_GOC = GOC_LINH_VUC.map(x => x[0]);

// NĂM TRẠNG THÁI — PHẢI TRÙNG KHỚP với phân hệ Hành trình học tập.
//
// Cố ý chép lại thay vì gọi sang phân hệ kia: hai phân hệ cắm thêm không được
// phụ thuộc nhau, tắt cái này thì cái kia phải chạy y nguyên. Đổi lại, bài
// test đối chiếu hai danh sách với nhau và báo đỏ nếu chúng trôi khỏi nhau —
// một bản chép có người canh thì an toàn hơn một mối phụ thuộc chéo.
const KET_QUA = [
  ['chua-day', 'Chưa dạy'],
  ['chua-quan-sat-thay', 'Chưa quan sát thấy'],
  ['dang-hinh-thanh', 'Đang hình thành'],
  ['da-vung', 'Đã vững'],
  ['vuot-troi', 'Vượt trội'],
];
const MA_KET_QUA = KET_QUA.map(x => x[0]);

const TRANG_THAI_DUYET = ['nhap', 'cho-duyet', 'da-duyet', 'tra-lai'];

const TOI_DA_NOI_DUNG = 500;
const TOI_DA_NHAN_XET = 500;
const TOI_DA_MUC_MOI_BE = 12;
// Trần cho một lần lưu cả nhóm — nhóm đông nhất của trường vẫn dưới xa con số
// này, còn số lớn hơn thì gần như chắc chắn là lỗi ở phía gửi.
const TOI_DA_BE_MOT_LAN = 60;

function thangNay() {
  return ngay.thangNay();
}

function thangTruoc(thang) {
  const [nam, th] = thang.split('-').map(Number);
  const d = new Date(Date.UTC(nam, th - 2, 1));
  return d.toISOString().slice(0, 7);
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

module.exports = (app, { db }) => {
  function nhomCuaToi(user) {
    return db.classIdsOf(user).map(id => db.findClass(id))
      .filter(c => c && c.active !== false && c.active !== 0);
  }

  function beCuaNhom(classId) {
    return db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
  }

  function mucCuaKe(keId) {
    return db.all('kehoachbe_muc',
      'SELECT * FROM kehoachbe_muc WHERE keId = ? ORDER BY rowid', [keId])
      .map(m => ({ ...m, tiepTucThangSau: m.tiepTucThangSau !== 0 }));
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  function keCuaBe(studentId, thang) {
    const k = db.first('kehoachbe_ke',
      'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [studentId, thang]);
    if (!k) return null;
    return {
      ...k,
      coLapTen: tenNguoi(k.coLap),
      nguoiDuyetTen: tenNguoi(k.nguoiDuyet),
      muc: mucCuaKe(k.id),
    };
  }

  // KHOÁ KHI ĐANG CHỜ DUYỆT, VÀ KHOÁ KHI ĐÃ DUYỆT.
  //
  // Sửa sau lưng người duyệt thì chữ ký duyệt không còn nghĩa gì. Cô muốn sửa
  // tiếp thì rút lại (`thu-hoi`) — một hành động có ghi lại, chứ không phải
  // sửa lén.
  //
  // Nhưng phần NHÌN LẠI CUỐI THÁNG thì vẫn ghi được trên bản đã duyệt — đó
  // chính là việc của cuối tháng, và nó không đụng tới nội dung đã duyệt.
  function duocSuaNoiDung(k) {
    return !k || k.trangThai === 'nhap' || k.trangThai === 'tra-lai';
  }

  function chanNeuKhoa(res, k) {
    if (duocSuaNoiDung(k)) return false;
    res.status(400).json({
      error: k.trangThai === 'cho-duyet'
        ? 'Kế hoạch này đã gửi quản lý duyệt nên đang khoá. Cô bấm "Rút lại" nếu muốn sửa tiếp.'
        : 'Kế hoạch này đã được duyệt nên phần nội dung khoá lại. Phần nhìn lại cuối tháng thì cô vẫn ghi được.',
    });
    return true;
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================

  // Cả nhóm, một tháng — màn chính của cô.
  app.get('/api/kehoachbe', requireRole('teacher', 'admin'), (req, res) => {
    const classId = chuoi(req.query.classId, 40) || (nhomCuaToi(req.user)[0] || {}).id || '';
    if (!classId) return res.json({ thang: thangNay(), classId: '', danhSach: [] });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của nhóm này' });
    }
    const thang = THANG_RE.test(String(req.query.thang || '')) ? req.query.thang : thangNay();

    const danhSach = beCuaNhom(classId).map(b => ({
      studentId: b.id, hoTen: b.name, avatar: b.avatar, ke: keCuaBe(b.id, thang),
    }));

    res.json({
      thang, classId,
      thangTruoc: thangTruoc(thang),
      gocLinhVuc: GOC_LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      ketQua: KET_QUA.map(([ma, ten]) => ({ ma, ten })),
      laQuanLy: req.user.role === 'admin',
      nhom: nhomCuaToi(req.user).map(c => ({ id: c.id, name: c.name })),
      danhSach,
      // Đếm theo TRẠNG THÁI DUYỆT, không đếm gì về đứa trẻ: đây là con số về
      // việc giấy tờ của cô và của quản lý, không phải con số về các bé.
      tong: {
        soBe: danhSach.length,
        chuaLap: danhSach.filter(x => !x.ke).length,
        choDuyet: danhSach.filter(x => x.ke && x.ke.trangThai === 'cho-duyet').length,
        daDuyet: danhSach.filter(x => x.ke && x.ke.trangThai === 'da-duyet').length,
        traLai: danhSach.filter(x => x.ke && x.ke.trangThai === 'tra-lai').length,
      },
    });
  });

  app.get('/api/kehoachbe/be', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = chuoi(req.query.studentId, 40);
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const thang = THANG_RE.test(String(req.query.thang || '')) ? req.query.thang : thangNay();
    res.json({
      be: { id: be.id, hoTen: be.name, avatar: be.avatar },
      thang,
      gocLinhVuc: GOC_LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      ketQua: KET_QUA.map(([ma, ten]) => ({ ma, ten })),
      ke: keCuaBe(studentId, thang),
    });
  });

  // =========================================================================
  // SOẠN — lưu CẢ NHÓM trong một giao dịch
  // =========================================================================
  app.put('/api/kehoachbe', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });

    const ds = b.danhSach;
    if (!Array.isArray(ds) || !ds.length || ds.length > TOI_DA_BE_MOT_LAN) {
      return res.status(400).json({ error: `Danh sách bé chưa hợp lệ (1 đến ${TOI_DA_BE_MOT_LAN} bé một lần)` });
    }

    // KIỂM TOÀN BỘ TRƯỚC KHI GHI DÒNG NÀO.
    //
    // Cùng lý do như đường soạn thực đơn cả tuần: lỗi ở bé thứ mười để lại một
    // nhóm lưu dở, mà màn hình vừa báo lỗi nên cô không biết mình đang đứng ở
    // đâu.
    const sach = [];
    const boQua = [];
    for (const x of ds) {
      const be = db.findStudent(chuoi((x || {}).studentId, 40));
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (be.classId !== classId) {
        return res.status(400).json({ error: `Bé ${be.name} không thuộc nhóm này` });
      }
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền soạn kế hoạch cho bé ${be.name}` });
      }
      const cu = db.first('kehoachbe_ke',
        'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
      if (chanNeuKhoa(res, cu)) return;

      // GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP: BỎ QUA BÉ ĐÓ, KHÔNG TỪ CHỐI CẢ LÔ.
      //
      // Đây là chỗ CỐ Ý làm khác ba phân hệ kia. Đường này ghi kế hoạch cho CẢ
      // NHÓM một lượt, nên trả 403 vì một bé là làm hỏng kế hoạch tháng của
      // hai mươi tư bé còn lại — và cô sẽ không hiểu vì sao, vì màn hình chỉ
      // báo một câu lỗi chung. Đó là vi phạm Nguyên tắc số 1 ở vế "mọi tính
      // năng khác vẫn chạy y như cũ".
      //
      // Nên: ghi cho những bé còn lại, và TRẢ VỀ TÊN những bé đã bỏ qua để màn
      // hình nói thẳng ra. Im lặng bỏ qua cũng sai — cô sẽ tưởng đã lập kế
      // hoạch cho cả nhóm.
      if (db.beNgungHoSoHocTap(be.id)) { boQua.push(be.name); continue; }

      const muc = [];
      for (const m of ((x || {}).muc || [])) {
        const goc = chuoi((m || {}).gocLinhVuc, 40);
        if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
        const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
        if (!noiDung) continue;   // ô trống là ô cô chưa định làm gì ở góc đó
        muc.push({ gocLinhVuc: goc, noiDung });
      }
      if (muc.length > TOI_DA_MUC_MOI_BE) {
        return res.status(400).json({ error: `Mỗi bé tối đa ${TOI_DA_MUC_MOI_BE} mục một tháng` });
      }
      sach.push({ be, cu, muc });
    }

    const luc = new Date().toISOString();
    let daLuu = 0;
    db.tx(() => {
      for (const { be, cu, muc } of sach) {
        // Bé không có mục nào và cũng chưa có bản cũ: bỏ qua. Tạo một bản rỗng
        // là màn hình quản lý hiện ra một kế hoạch trắng trông như cô đã lập.
        if (!muc.length && !cu) continue;

        let keId = cu && cu.id;
        if (cu) {
          db.update('kehoachbe_ke', cu.id, { capNhatLuc: luc });
        } else {
          keId = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id: keId, studentId: be.id, classId, thang,
            trangThai: 'nhap', coLap: req.user.id, lapLuc: luc,
            guiLuc: null, nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
        }

        // GHI ĐÈ TOÀN BỘ MỤC, nhưng GIỮ LẠI PHẦN NHÌN LẠI của mục trùng nội
        // dung. Cô sửa một chữ trong mục Toán không được làm bay nhận xét cuối
        // tháng cô đã ghi cho chính mục đó.
        const cuMuc = mucCuaKe(keId);
        db.run('DELETE FROM kehoachbe_muc WHERE keId = ?', [keId]);
        for (const m of muc) {
          const giong = cuMuc.find(o => o.gocLinhVuc === m.gocLinhVuc && o.noiDung === m.noiDung);
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            ketQua: giong ? giong.ketQua : '',
            nhanXet: giong ? giong.nhanXet : '',
            tiepTucThangSau: giong && giong.tiepTucThangSau ? 1 : 0,
            capNhatLuc: luc,
          });
        }
        daLuu += 1;
      }
    });

    db.audit(req.user.id, 'kehoachbe-luu', classId, { thang, soBe: daLuu, boQua: boQua.length || undefined });
    res.json({ ok: true, thang, classId, daLuu, boQuaNgungHoSo: boQua });
  });

  // ĐẶT CẢ NHÓM — đường tắt số một cho khối lượng nhập liệu.
  //
  // Cô gõ 5 dòng, cả nhóm có kế hoạch, rồi sửa lẻ bé nào khác. KHÔNG ghi đè bé
  // đã có mục ở góc đó: cô thường lập riêng vài bé trước rồi mới đặt cho phần
  // còn lại, ghi đè hết là xoá đúng phần cô vừa nhập tay.
  app.post('/api/kehoachbe/dat-ca-nhom', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });

    const muc = [];
    for (const m of (b.muc || [])) {
      const goc = chuoi((m || {}).gocLinhVuc, 40);
      if (!MA_GOC.includes(goc)) return res.status(400).json({ error: `Góc lĩnh vực "${goc}" không hợp lệ` });
      const noiDung = chuoi((m || {}).noiDung, TOI_DA_NOI_DUNG);
      if (noiDung) muc.push({ gocLinhVuc: goc, noiDung });
    }
    if (!muc.length) return res.status(400).json({ error: 'Cô gõ ít nhất một mục để đặt cho cả nhóm nhé' });

    const luc = new Date().toISOString();
    let daDat = 0;
    let boQua = 0;
    const boQuaNgungHoSo = [];
    db.tx(() => {
      // Bé mà gia đình đã dừng phần hồ sơ học tập: bỏ qua, đếm riêng (Đ96).
      const ngung = db.dsBeNgungHoSoHocTap(beCuaNhom(classId).map(x => x.id));
      for (const be of beCuaNhom(classId)) {
        if (ngung.has(be.id)) { boQuaNgungHoSo.push(be.name); continue; }
        let k = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        if (k && !duocSuaNoiDung(k)) { boQua += 1; continue; }
        if (!k) {
          const id = db.nextId('khb');
          db.insert('kehoachbe_ke', {
            id, studentId: be.id, classId, thang, trangThai: 'nhap',
            coLap: req.user.id, lapLuc: luc, guiLuc: null,
            nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
          });
          k = { id };
        }
        const dangCo = mucCuaKe(k.id);
        for (const m of muc) {
          if (dangCo.some(o => o.gocLinhVuc === m.gocLinhVuc)) continue;  // không đè phần cô đã nhập riêng
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId: k.id,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        daDat += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-dat-ca-nhom', classId, { thang, daDat, soMuc: muc.length });
    res.json({ ok: true, daDat, boQua, boQuaNgungHoSo });
  });

  // CHÉP THÁNG TRƯỚC — đường tắt số hai.
  //
  // Mang sang những mục cô đã đánh dấu "tiếp tục ở tháng sau" TRƯỚC TIÊN, rồi
  // mới tới phần còn lại. Đây chính là vế "ôn tiếp" của nhà trường, làm thành
  // một hành động một lần bấm thay vì một lời dặn cô phải tự nhớ.
  app.post('/api/kehoachbe/chep-thang-truoc', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn kế hoạch cho nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });
    const truoc = thangTruoc(thang);
    const chiTiepTuc = !!b.chiTiepTuc;

    const luc = new Date().toISOString();
    let daChep = 0;
    let boQua = 0;
    const boQuaNgungHoSoChep = [];
    db.tx(() => {
      // Bé mà gia đình đã dừng phần hồ sơ học tập: bỏ qua, đếm riêng (Đ96).
      const ngungChep = db.dsBeNgungHoSoHocTap(beCuaNhom(classId).map(x => x.id));
      for (const be of beCuaNhom(classId)) {
        if (ngungChep.has(be.id)) { boQuaNgungHoSoChep.push(be.name); continue; }
        const cu = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, truoc]);
        if (!cu) continue;
        const nay = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        // Tháng đích đã có bản thì GIỮ NGUYÊN — bấm nhầm không được xoá cả
        // buổi soạn của cô.
        if (nay) { boQua += 1; continue; }

        let muc = mucCuaKe(cu.id);
        if (chiTiepTuc) muc = muc.filter(m => m.tiepTucThangSau);
        else muc = [...muc.filter(m => m.tiepTucThangSau), ...muc.filter(m => !m.tiepTucThangSau)];
        if (!muc.length) continue;

        const id = db.nextId('khb');
        db.insert('kehoachbe_ke', {
          id, studentId: be.id, classId, thang, trangThai: 'nhap',
          coLap: req.user.id, lapLuc: luc, guiLuc: null,
          nguoiDuyet: null, duyetLuc: null, yKienDuyet: '', capNhatLuc: luc,
        });
        for (const m of muc.slice(0, TOI_DA_MUC_MOI_BE)) {
          db.insert('kehoachbe_muc', {
            id: db.nextId('khm'), keId: id,
            gocLinhVuc: m.gocLinhVuc, noiDung: m.noiDung,
            // Kết quả và nhận xét KHÔNG chép sang: chúng nói về tháng trước.
            ketQua: '', nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc,
          });
        }
        daChep += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-chep-thang', classId, { thang, tuThang: truoc, daChep });
    res.json({ ok: true, thang, tuThang: truoc, daChep, boQua, boQuaNgungHoSo: boQuaNgungHoSoChep });
  });

  // =========================================================================
  // GỬI DUYỆT · RÚT LẠI · DUYỆT
  // =========================================================================
  app.post('/api/kehoachbe/gui-duyet', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền với nhóm này' });
    }
    const thang = chuoi(b.thang, 7) || thangNay();
    const chiBe = chuoi(b.studentId, 40);

    const luc = new Date().toISOString();
    let daGui = 0;
    let trong = 0;
    db.tx(() => {
      for (const be of beCuaNhom(classId)) {
        if (chiBe && be.id !== chiBe) continue;
        const k = db.first('kehoachbe_ke',
          'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [be.id, thang]);
        if (!k || !duocSuaNoiDung(k)) continue;
        // Kế hoạch rỗng thì không gửi — quản lý mở ra thấy trang trắng.
        if (!mucCuaKe(k.id).length) { trong += 1; continue; }
        db.update('kehoachbe_ke', k.id, { trangThai: 'cho-duyet', guiLuc: luc, capNhatLuc: luc });
        daGui += 1;
      }
    });
    db.audit(req.user.id, 'kehoachbe-gui-duyet', classId, { thang, daGui });
    res.json({ ok: true, daGui, trong });
  });

  app.post('/api/kehoachbe/rut-lai', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(b.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }
    if (k.trangThai !== 'cho-duyet') {
      return res.status(400).json({ error: 'Chỉ rút lại được kế hoạch đang chờ duyệt' });
    }
    const luc = new Date().toISOString();
    db.update('kehoachbe_ke', k.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
    db.audit(req.user.id, 'kehoachbe-rut-lai', k.studentId, { id: k.id });
    res.json({ ok: true, id: k.id, trangThai: 'nhap' });
  });

  // DUYỆT — VIỆC CỦA QUẢN LÝ, KHÔNG PHẢI CỦA CÔ.
  //
  // Cùng luật với duyệt đơn nghỉ (Y2): người lập không phải người duyệt, nếu
  // không thì bước duyệt chỉ là một cái nút thừa.
  app.post('/api/kehoachbe/duyet', requireRole('teacher', 'admin'), (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Kế hoạch do quản lý duyệt. Cô lập kế hoạch rồi bấm "Gửi duyệt" — '
          + 'người lập không duyệt kế hoạch của chính mình.',
      });
    }
    const b = req.body || {};
    const quyet = chuoi(b.quyetDinh, 20);
    if (quyet !== 'da-duyet' && quyet !== 'tra-lai') {
      return res.status(400).json({ error: 'Quyết định phải là duyệt hoặc trả lại' });
    }
    const yKien = chuoi(b.yKienDuyet, TOI_DA_NHAN_XET);
    // Trả lại mà không nói vì sao thì cô không biết phải sửa gì.
    if (quyet === 'tra-lai' && !yKien) {
      return res.status(400).json({ error: 'Trả lại thì ghi giúp cô một dòng vì sao nhé' });
    }

    const ids = Array.isArray(b.ids) ? b.ids.map(x => chuoi(x, 40)).filter(Boolean) : [];
    if (!ids.length || ids.length > TOI_DA_BE_MOT_LAN) {
      return res.status(400).json({ error: 'Danh sách kế hoạch cần duyệt chưa hợp lệ' });
    }

    const sach = [];
    for (const id of ids) {
      const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [id]);
      if (!k) return res.status(404).json({ error: 'Danh sách có kế hoạch không tồn tại' });
      if (!db.canAccessStudent(req.user, k.studentId)) {
        return res.status(403).json({ error: 'Có kế hoạch của bé ngoài phạm vi cơ sở mình' });
      }
      if (k.trangThai !== 'cho-duyet') {
        return res.status(400).json({ error: 'Chỉ duyệt được kế hoạch đang chờ duyệt' });
      }
      sach.push(k);
    }

    const luc = new Date().toISOString();
    db.tx(() => {
      for (const k of sach) {
        db.update('kehoachbe_ke', k.id, {
          trangThai: quyet, nguoiDuyet: req.user.id, duyetLuc: luc,
          yKienDuyet: yKien, capNhatLuc: luc,
        });
      }
    });
    db.audit(req.user.id, 'kehoachbe-duyet', null, { quyetDinh: quyet, so: sach.length });
    res.json({ ok: true, quyetDinh: quyet, so: sach.length });
  });

  // =========================================================================
  // CUỐI THÁNG NHÌN LẠI
  // =========================================================================
  //
  // Ghi được cả trên bản ĐÃ DUYỆT — đó chính là việc của cuối tháng, và nó
  // không đụng tới nội dung kế hoạch đã được duyệt.
  app.put('/api/kehoachbe/nhin-lai', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const k = db.first('kehoachbe_ke', 'SELECT * FROM kehoachbe_ke WHERE id = ?', [chuoi(b.id, 40)]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy kế hoạch này' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền với kế hoạch của bé này' });
    }

    // ĐƯỜNG GHI THỨ CHÍN CỦA Đ96 — BỊ BỎ SÓT LẦN ĐẦU.
    //
    // Đ96 chốt tám đường ghi, nhưng quên đúng đường này. Mà "nhìn lại cuối
    // tháng" mới là chỗ cô xếp bé vào một trong năm mức phát triển và viết
    // nhận xét — tức là nội dung hồ sơ học tập theo nghĩa đúng nhất của nó.
    //
    // Gia đình gạt ô ①, màn của họ hứa "trường ngưng ghi mới ngay", màn quản
    // trị hứa "ngưng ghi quan sát, kế hoạch và báo cáo mới cho bé". Rồi cuối
    // tháng cô vẫn ghi được. Có nhật ký thao tác chứng minh trường đã nhận lời
    // rút, nên đây là chỗ khó giải thích nhất nếu có khiếu nại theo NĐ 13/2023.
    //
    // Chốt ở ĐÂY chứ không ở `gui-duyet`: gửi duyệt là thao tác trên CẢ NHÓM,
    // chặn nó là một bé làm cô không gửi được kế hoạch của mười chín bé còn
    // lại — đúng cái bẫy mà Đ96 đã tránh ở đường lưu cả nhóm.
    if (db.beNgungHoSoHocTap(k.studentId)) {
      return res.status(403).json({
        error: 'Gia đình bé này đã dừng phần hồ sơ học tập. Phần đã ghi vẫn giữ '
          + 'nguyên và cô xem lại được; chỉ ngưng ghi mới. Cô vẫn ghi nhật ký '
          + 'ngày và vẫn nhắn tin với gia đình như thường.',
      });
    }

    const sach = [];
    for (const m of (b.muc || [])) {
      const cu = db.first('kehoachbe_muc', 'SELECT * FROM kehoachbe_muc WHERE id = ?', [chuoi((m || {}).id, 40)]);
      if (!cu || cu.keId !== k.id) {
        return res.status(400).json({ error: 'Có mục không thuộc kế hoạch này' });
      }
      const kq = chuoi((m || {}).ketQua, 40);
      if (kq && !MA_KET_QUA.includes(kq)) {
        return res.status(400).json({ error: 'Kết quả nhìn lại không hợp lệ' });
      }
      sach.push({
        id: cu.id,
        ketQua: kq,
        nhanXet: chuoi((m || {}).nhanXet, TOI_DA_NHAN_XET),
        tiepTucThangSau: (m || {}).tiepTucThangSau ? 1 : 0,
      });
    }
    if (!sach.length) return res.status(400).json({ error: 'Chưa có mục nào để ghi' });

    const luc = new Date().toISOString();
    db.tx(() => {
      for (const m of sach) {
        db.update('kehoachbe_muc', m.id, {
          ketQua: m.ketQua, nhanXet: m.nhanXet,
          tiepTucThangSau: m.tiepTucThangSau, capNhatLuc: luc,
        });
      }
    });
    db.audit(req.user.id, 'kehoachbe-nhin-lai', k.studentId, { id: k.id, soMuc: sach.length });
    res.json({ ok: true, ke: keCuaBe(k.studentId, k.thang) });
  });
};
