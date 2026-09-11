// Phân hệ Học phí — ví dụ về một tính năng cắm thêm.
//
// Nhận sẵn `db` qua tham số thứ hai nên không cần biết ứng dụng đặt tệp dữ liệu
// ở đâu. Mọi hàm kiểm tra quyền dùng chung với phần lõi, nhờ vậy phân hệ mới
// không thể vô tình để lộ dữ liệu của học sinh lớp khác.
module.exports = (app, { db, modules }) => {
  const ngay = require('../../lib/ngay');
  const { requireRole } = require('../../lib/auth');
  const henGio = require('../../lib/hen-gio');
  const huyHieu = require('../../lib/huy-hieu');
  const baoNhaTruong = require('../../lib/bao-nha-truong');

  // AI ĐƯỢC ĐẶT RA MỘT KHOẢN TIỀN PHẢI NỘP (Đ163).
  //
  // Nhà trường 07/09: *"chỉ kế toán hoặc Cấp 1 được tạo khoản thu"*. Chốt chặn
  // thật nằm ở `db.taoKhoanThuDuoc` (Đ163a) chứ không ở danh sách tiền tố của
  // chức vụ — xem chú thích ở đó để biết vì sao.
  //
  // SIẾT GHI, KHÔNG SIẾT ĐỌC, và cũng không siết đường xác nhận đã nhận tiền:
  // văn phòng cơ sở vẫn nhận tiền mặt ở bàn tiếp đón và vẫn ghi "đã nhận" như
  // hôm nay. Tách ra như vậy còn chặt hơn bản cũ chứ không lỏng hơn — người
  // ĐẶT RA con số và người XÁC NHẬN đã nhận không còn là một người nữa.
  //
  // `db.taoKhoanThuDuoc` đã tự trả false cho mọi vai không phải `admin`, nên
  // cô và gia đình vẫn bị chặn y như cũ (Đ42).
  function chiNguoiLoTien(req, res) {
    if (db.taoKhoanThuDuoc(req.user)) return false;
    res.status(403).json({
      error: 'Việc đặt ra khoản thu thuộc về kế toán hoặc ban giám hiệu. '
        + 'Tài khoản này vẫn xem được sổ tiền và vẫn xác nhận được đã nhận tiền.',
    });
    return true;
  }

  // Nhóm mà người này được thao tác. `db.classIdsOf` đã lo tầng cơ sở: quản trị
  // Cấp 3 chỉ thấy nhóm của cơ sở mình. Cùng khuôn với `nhomCuaToi` của Báo ăn.
  function nhomCuaToi(user) {
    return db.classIdsOf(user)
      .map(id => db.findClass(id))
      .filter(c => c && c.active !== false && c.active !== 0)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  }

  function beCuaNhom(classId) {
    return db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
  }

  // Các khoản của một học sinh.
  app.get('/api/hocphi', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem học phí của bé này' });
    }
    // Khoản ĐÃ THU HỒI không hiện với ai — nó là khoản tạo nhầm, dòng gốc còn
    // nguyên trong bảng làm chứng từ (xem hocphi_thuhoi trong schema.sql).
    const khoan = db.all('hocphi_khoan',
      `SELECT * FROM hocphi_khoan WHERE studentId = ?
         AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)
       ORDER BY hanNop DESC, rowid DESC`, [studentId]);
    const chuaNop = khoan.filter(k => !k.daNop);
    res.json({
      khoan: khoan.map(k => ({ ...k, daNop: !!k.daNop })),
      tongChuaNop: chuaNop.reduce((s, k) => s + Number(k.soTien || 0), 0),
      soKhoanChuaNop: chuaNop.length,
      // MÁY CHỦ NÓI RA QUYỀN, MÀN HÌNH KHÔNG TỰ ĐOÁN THEO VAI (nếp của Đ157).
      //
      // Bản cũ của `view.js` tự kết luận "role === 'admin' thì bày nút Tạo
      // khoản". Sau Đ163 câu đó sai với chính văn phòng cơ sở: họ vẫn là vai
      // admin nhưng đã thôi đặt được khoản thu, nên màn hình sẽ mời họ bấm một
      // nút chắc chắn nhận 403 — đúng thứ `test:khong-hua-suong` sinh ra để
      // chặn. Hai chỗ cùng nói một chuyện thì sẽ trôi khỏi nhau, nên chỉ còn
      // một chỗ nói: chỗ này.
      quyen: {
        taoDuoc: db.taoKhoanThuDuoc(req.user),
        xacNhanDuoc: req.user.role === 'admin',
        // MỞ ĐƯỢC BẢNG SỔ TIỀN CẢ TRƯỜNG hay không — máy chủ nói, màn hình
        // không đoán. Bản trước giấu cả thẻ ba nút sau quyền GHI, nên văn phòng
        // mất luôn nút CHỈ ĐỌC "Xem cả trường" mà máy chủ vẫn mở cho họ; đúng
        // lúc câu từ chối của chính phân hệ này hứa "vẫn xem được sổ tiền".
        xemBangDuoc: req.user.role === 'admin',
        xemUuDaiDuoc: docUuDaiDuoc(req.user),
      },
    });
  });

  // TẠO KHOẢN THU LÀ VIỆC CỦA VĂN PHÒNG, KHÔNG PHẢI CỦA CÔ.
  //
  // Phân hệ này mang nguyên từ app 1 sang, và ở đó cả `teacher` lẫn `admin`
  // đều tạo được. Ở trường mầm non thì không: tầng chức vụ đã đặt **Kế toán**
  // là người lo học phí và tiền ăn, và đợt Y3 đã tách rõ *"cô chốt suất, kế
  // toán đối chiếu"*.
  //
  // Để cô tạo rồi tự xác nhận một khoản tiền là để một người KHÔNG chịu trách
  // nhiệm về tiền vừa ghi sổ vừa duyệt sổ. Sai sót ở đó không ai đối chiếu ra,
  // và khi có chuyện thì người đứng lớp là người phải giải trình về tiền.
  //
  // Vai `admin` ở đây không có nghĩa "ai cũng vào được": tầng chức vụ vẫn siết
  // tiếp bên trong — Kế toán và Văn phòng cơ sở có `/api/hocphi` trong phần
  // việc, Nhân sự và Marketing thì không.
  app.post('/api/hocphi', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const { studentId, kyThu, noiDung, soTien, hanNop } = req.body || {};
    // Hỏi bé CÓ TỒN TẠI trước: canAccessStudent trả true cho quản trị toàn hệ
    // thống với BẤT KỲ chuỗi nào, nên mã bé sai lọt tới INSERT là vỡ khoá
    // ngoại và người dùng nhận đúng bốn chữ "Lỗi máy chủ".
    if (!db.findStudent(studentId)) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (!String(kyThu || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập kỳ thu' });
    if (!String(noiDung || '').trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung khoản thu' });
    const tien = Number(soTien);
    if (!Number.isFinite(tien) || tien <= 0) return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });

    const rec = {
      id: db.nextId('hp'),
      studentId,
      kyThu: String(kyThu).trim(),
      noiDung: String(noiDung).trim(),
      soTien: Math.round(tien),
      hanNop: hanNop || null,
      daNop: 0,
      ngayNop: null,
      ghiChu: '',
      taoBoi: req.user.id,
      taoLuc: new Date().toISOString(),
    };
    db.insert('hocphi_khoan', rec);
    db.audit(req.user.id, 'hocphi-create', rec.id, { studentId, soTien: rec.soTien });
    res.status(201).json({ ...rec, daNop: false });
  });

  // GHI SỔ MỘT LƯỢT CHO CẢ NHÓM HOẶC CẢ CƠ SỞ (Đ163, ý 2 của trường).
  //
  // Nhà trường 07/09: *"tạo phí tách theo cơ sở / lớp / trẻ cho dễ nhìn"*.
  // Trước đợt này chỉ có "từng trẻ": mỗi bé một lần mở ô, gõ lại y hệt kỳ thu,
  // nội dung và số tiền. Trường ba cơ sở mấy trăm bé thì "tiền ăn tháng 9" là
  // mấy trăm lượt gõ giống nhau — và mỗi lượt là một cơ hội gõ nhầm số tiền
  // cho đúng một nhà, thứ không ai đối chiếu ra cho tới khi gia đình hỏi.
  //
  // BỎ QUA BÉ ĐÃ CÓ ĐÚNG KHOẢN ẤY, KHÔNG TẠO CHỒNG. Đây là phần quan trọng
  // nhất của đường này. Mạng chập chờn, cô bấm hai lần, hay văn phòng chạy lại
  // đợt vì nhớ nhầm — cả ba đều có thật, và cả ba đều dẫn tới một nhà bị đòi
  // tiền hai lần. Máy đối chiếu theo (bé, kỳ thu, nội dung) và ĐẾM số bỏ qua
  // rồi nói ra, chứ không im lặng: im lặng thì lần chạy thứ hai trông y như
  // lần đầu và không ai biết chuyện gì đã xảy ra.
  //
  // TẠO CHO BÉ NÀO thì vẫn đi qua đúng hàng rào cũ: `db.classIdsOf` lo tầng cơ
  // sở, rồi từng bé vẫn hỏi lại `db.canAccessStudent`. Hỏi hai lần là có chủ ý
  // — danh sách nhóm và danh sách bé là hai nguồn khác nhau, và tiền là chỗ
  // không đáng tiết kiệm một câu hỏi.
  app.post('/api/hocphi/hang-loat', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const b = req.body || {};
    const pham = String(b.pham || '').trim();
    if (!['nhom', 'coso', 'truong'].includes(pham)) {
      return res.status(400).json({ error: 'Chưa chọn ghi sổ cho ai: cả nhóm, cả cơ sở, hay cả trường' });
    }
    const kyThu = String(b.kyThu || '').trim();
    const noiDung = String(b.noiDung || '').trim();
    // CHUẨN HOÁ KHI SO, GIỮ NGUYÊN KHI GHI.
    //
    // Chống ghi trùng của bản đầu so khớp chuỗi nguyên văn, nên "Tiền ăn tháng 9"
    // và "Tiền ăn Tháng 9" là hai khoản khác nhau — và cả trường bị đòi tiền hai
    // lần chỉ vì một chữ hoa, hay một dấu cách thừa lúc dán từ Excel. Đó đúng là
    // cảnh mà chú thích ở đầu đường này hứa sẽ chặn.
    //
    // Chỉ so bằng dạng chuẩn hoá; cái GHI xuống sổ vẫn là chữ kế toán đã gõ.
    const chuanHoa = (x) => String(x || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!kyThu) return res.status(400).json({ error: 'Vui lòng nhập kỳ thu' });
    if (!noiDung) return res.status(400).json({ error: 'Vui lòng nhập nội dung khoản thu' });
    const tien = Number(b.soTien);
    if (!Number.isFinite(tien) || tien <= 0) return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
    const hanNop = b.hanNop ? String(b.hanNop).trim() : null;
    if (hanNop && !/^\d{4}-\d{2}-\d{2}$/.test(hanNop)) {
      return res.status(400).json({ error: 'Hạn nộp chưa đúng dạng, ví dụ đúng: 2026-09-10' });
    }

    // Nhóm nằm trong phạm vi ghi sổ của đợt này.
    const trongTam = nhomCuaToi(req.user);
    let nhom = trongTam;
    let phamTen = 'cả trường';
    if (pham === 'nhom') {
      const lop = db.findClass(String(b.id || ''));
      if (!lop) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
      if (!db.canAccessClass(req.user, lop.id)) {
        return res.status(403).json({ error: 'Nhóm lớp này nằm ngoài phạm vi của tài khoản' });
      }
      nhom = [lop];
      phamTen = lop.name;
    } else if (pham === 'coso') {
      const cs = db.findCampus(String(b.id || ''));
      if (!cs) return res.status(404).json({ error: 'Không tìm thấy cơ sở' });
      const trong = new Set(trongTam.map(c => c.id));
      const cuaCoSo = db.classIdsOfCampus(cs.id).filter(id => trong.has(id));
      // Cấp 3 gõ mã cơ sở khác: danh sách rỗng. Nói thẳng là ngoài phạm vi chứ
      // không lặng lẽ ghi sổ cho 0 bé rồi báo "xong" — báo xong khi chưa làm
      // gì là lời hứa suông, và ở sổ tiền thì nó còn che mất một lần vượt rào.
      if (!cuaCoSo.length) {
        return res.status(403).json({ error: 'Cơ sở này nằm ngoài phạm vi của tài khoản' });
      }
      nhom = cuaCoSo.map(id => db.findClass(id)).filter(Boolean);
      phamTen = cs.name;
    }

    const be = [];
    for (const lop of nhom) {
      for (const s of beCuaNhom(lop.id)) {
        if (db.canAccessStudent(req.user, s.id)) be.push(s);
      }
    }
    if (!be.length) {
      return res.status(400).json({ error: 'Chưa có bé nào đang học trong phạm vi vừa chọn' });
    }

    // Bé nào ĐÃ có đúng khoản này rồi (và chưa bị thu hồi) thì bỏ qua.
    const ids = be.map(s => s.id);
    const daCo = new Set();
    const kyChuan = chuanHoa(kyThu);
    const ndChuan = chuanHoa(noiDung);
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      for (const r of db.all('hocphi_khoan',
        `SELECT studentId, kyThu, noiDung FROM hocphi_khoan
          WHERE studentId IN (${m})
            AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)`, lo)) {
        if (chuanHoa(r.kyThu) === kyChuan && chuanHoa(r.noiDung) === ndChuan) daCo.add(r.studentId);
      }
    }

    const dotId = db.nextId('hpd');
    const luc = new Date().toISOString();
    const canTao = be.filter(s => !daCo.has(s.id));
    // MỘT ĐỢT GHI SỔ LÀ MỘT VIỆC, KHÔNG PHẢI 600 VIỆC RỜI.
    //
    // Bản đầu ghi từng dòng ngoài giao dịch rồi mới ghi dòng "đợt" ở cuối. Máy
    // chủ khởi động lại giữa chừng (hoặc một dòng vỡ khoá ngoại) là để lại vài
    // trăm khoản tiền KHÔNG THUỘC ĐỢT NÀO — không ai lần ra chúng từ đâu tới,
    // và cũng không có dòng nhật ký nào vì nhật ký ghi sau cùng.
    db.tx(() => {
    for (const s of canTao) {
      const rec = {
        id: db.nextId('hp'),
        studentId: s.id,
        kyThu,
        noiDung,
        soTien: Math.round(tien),
        hanNop,
        daNop: 0,
        ngayNop: null,
        ghiChu: '',
        taoBoi: req.user.id,
        taoLuc: luc,
      };
      db.insert('hocphi_khoan', rec);
      db.insert('hocphi_dot_khoan', { khoanId: rec.id, dotId });
    }
    db.insert('hocphi_dot', {
      id: dotId,
      pham,
      phamId: pham === 'truong' ? '' : String(b.id || ''),
      phamTen,
      kyThu,
      noiDung,
      soTien: Math.round(tien),
      soBe: canTao.length,
      boQua: be.length - canTao.length,
      taoBoi: req.user.id,
      taoLuc: luc,
    });
    });
    db.audit(req.user.id, 'hocphi-dot', dotId,
      { pham, phamTen, kyThu, soTien: Math.round(tien), daTao: canTao.length, boQua: be.length - canTao.length });

    res.status(201).json({
      dotId,
      phamTen,
      tong: be.length,
      daTao: canTao.length,
      boQua: be.length - canTao.length,
    });
  });

  // BẢNG SỔ TIỀN NHÌN NHIỀU BÉ MỘT LƯỢT, gom theo cơ sở → nhóm → bé (Đ163).
  //
  // Vế thứ hai của cùng một câu trường nói: *"cho dễ nhìn"*. Màn Học phí hôm
  // nay chỉ nhìn được MỘT bé một lúc, chọn từ một ô xổ phẳng gồm mọi bé trong
  // phạm vi — ở trường mấy trăm bé thì đó không phải là một danh sách, đó là
  // một cuộn giấy.
  //
  // XẾP THEO TÊN, KHÔNG BAO GIỜ THEO TIỀN. Xếp các bé theo số nợ là dựng một
  // thứ tự trên dưới giữa những đứa trẻ bằng hoàn cảnh của cha mẹ chúng —
  // đúng thứ QUY TẮC 4 cấm, và là tiền lệ đã chốt ở bảng tháng của Báo ăn.
  // Không một phần trăm nào, không một con số so sánh nào giữa các nhóm.
  app.get('/api/hocphi/bang', requireRole('admin'), (req, res) => {
    const kyThu = String(req.query.kyThu || '').trim();
    const nhom = nhomCuaToi(req.user);
    const be = [];
    for (const lop of nhom) {
      for (const s of beCuaNhom(lop.id)) {
        if (db.canAccessStudent(req.user, s.id)) be.push({ ...s, classId: lop.id });
      }
    }

    const ids = be.map(s => s.id);
    const theoBe = new Map(ids.map(id => [id, { daNop: 0, chuaNop: 0, tienChuaNop: 0 }]));
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      const dk = kyThu ? ' AND kyThu = ?' : '';
      for (const r of db.all('hocphi_khoan',
        `SELECT studentId, soTien, daNop FROM hocphi_khoan
          WHERE studentId IN (${m})${dk}
            AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)`,
        kyThu ? [...lo, kyThu] : lo)) {
        const o = theoBe.get(r.studentId);
        if (!o) continue;
        if (r.daNop) o.daNop += 1;
        else { o.chuaNop += 1; o.tienChuaNop += Number(r.soTien || 0); }
      }
    }

    // Gom theo cơ sở → nhóm. Cơ sở cũng xếp theo TÊN, cùng lý do như trên.
    const tenCoSo = new Map(db.campuses().map(c => [c.id, c.name]));
    const gom = new Map();
    for (const lop of nhom) {
      const csId = db.campusOfClass(lop.id) || '';
      if (!gom.has(csId)) {
        gom.set(csId, { campusId: csId, ten: tenCoSo.get(csId) || 'Chưa xếp cơ sở', nhom: [] });
      }
      gom.get(csId).nhom.push({
        classId: lop.id,
        ten: lop.name,
        // XẾP THEO TÊN TIẾNG VIỆT, không theo thứ tự byte mà `ORDER BY name`
        // của SQLite trả về: ở thứ tự byte thì "Đỗ Khánh Vy" rơi xuống cuối
        // danh sách, và với người đọc tiếng Việt thì bảng trông như chưa xếp.
        be: be.filter(s => s.classId === lop.id)
          .map(s => ({ id: s.id, ten: s.name, ...theoBe.get(s.id) }))
          .sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')),
      });
    }
    const bang = [...gom.values()].sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));

    res.json({
      kyThu,
      // Danh sách kỳ thu có thật trong sổ, để màn hình khỏi bắt gõ tay.
      kyThuCo: db.all('hocphi_khoan',
        `SELECT DISTINCT kyThu FROM hocphi_khoan
           WHERE id NOT IN (SELECT khoanId FROM hocphi_thuhoi)
           ORDER BY kyThu DESC LIMIT 24`).map(r => r.kyThu),
      bang,
      taoDuoc: db.taoKhoanThuDuoc(req.user),
    });
  });

  // ===========================================================================
  // ƯU ĐÃI HỌC PHÍ, VÀ NHẮC TRƯỚC KHI HẠN TỚI (Đ169, ý 4 của trường)
  // ===========================================================================
  //
  // MÁY KHÔNG TỰ TRỪ TIỀN — đây là quyết định lớn nhất của cả mục này. Bảng ưu
  // đãi là chỗ THEO DÕI và NHẮC HẠN, không phải một công thức tính tự động.
  // Cùng lập luận đã chốt ở DD-13 (bảng tháng ĐÁNH DẤU ngày bé vẫn đi học
  // trong đơn hoàn, cố ý không tự trừ): tự trừ thì một dòng khai sai là sai
  // tiền của một nhà mà không ai đối chiếu ra, và kế toán mất đúng chỗ để nhìn
  // thấy con số trước khi nó thành hoá đơn.
  //
  // GIA ĐÌNH CHƯA ĐƯỢC XEM trong đợt này. Một ưu đãi có thể mang hoàn cảnh của
  // nhà ("con hộ nghèo", "thoả thuận riêng") — quyết định ai đọc được nó là
  // của nhà trường chứ không phải của người viết mã, nên mặc định đóng và đã
  // ghi thành câu hỏi trong sổ. Mở ra về sau là thêm một đường; đóng lại sau
  // khi đã mở là thu hồi một thứ gia đình đã nhìn thấy.
  const HAN_NHAC_TRUOC_NGAY = 14;

  // Cộng thêm n ngày vào một chuỗi YYYY-MM-DD.
  //
  // Tự tính chứ không mượn `lib/ngay.js`: tệp ấy KHÔNG có hàm cộng ngày, và
  // bản đầu của mã này viết `ngay.congNgay ? ... : null` — nghĩa là mốc "sắp
  // hết hạn" luôn rỗng và cả vế nhắc hạn chết lặng mà không ai biết. Đúng hạng
  // lỗi `test:khong-hua-suong` sinh ra để chặn: màn hình hứa một việc, mã
  // không bao giờ làm.
  //
  // Cộng bằng mốc UTC của đúng ngày ấy nên không lệch khi qua tháng hay năm.
  function congNgay(yyyymmdd, n) {
    const t = Date.parse(`${yyyymmdd}T00:00:00Z`);
    if (!Number.isFinite(t)) return null;
    return new Date(t + n * 86400000).toISOString().slice(0, 10);
  }

  // AI ĐỌC ĐƯỢC ƯU ĐÃI CỦA MỘT BÉ.
  //
  // Hai đường đọc ưu đãi nằm dưới tiền tố `/api/hocphi`, mà tiền tố ấy có trong
  // phần việc của Văn phòng cơ sở — nên nếu chỉ đòi `requireRole('admin')` thì
  // văn phòng đọc được bảng hoàn cảnh tiền bạc của mọi bé trong cơ sở. Chú thích
  // của chính Đ169 chốt rằng *"quyết định ai đọc được nó là của nhà trường"* và
  // mặc định ĐÓNG — nhưng câu ấy mới chỉ được thi hành với gia đình.
  //
  // Mở cho đúng ba nhóm người mà công việc buộc phải biết: người ĐẶT ra ưu đãi
  // (kế toán, ban giám hiệu) và người NHẬN TIN nhắc hạn (quản lý cơ sở) — nếu
  // không thì tin nhắc dẫn người ta tới một màn hình họ không mở được.
  const CHUC_VU_DOC_UU_DAI = ['hieu-truong', 'ketoan', 'quanly-coso'];
  function docUuDaiDuoc(user) {
    if (!user || user.role !== 'admin') return false;
    const cv = db.chucVu(user);
    return cv === null || CHUC_VU_DOC_UU_DAI.includes(cv);
  }
  function chiNguoiLoUuDai(req, res) {
    if (docUuDaiDuoc(req.user)) return false;
    res.status(403).json({
      error: 'Bảng ưu đãi học phí thuộc về kế toán và ban giám hiệu. '
        + 'Tài khoản này vẫn xem được sổ tiền của từng bé.',
    });
    return true;
  }

  function dangDung(u) {
    return !db.first('hocphi_uudai_go', 'SELECT uuDaiId FROM hocphi_uudai_go WHERE uuDaiId = ?', [u.id]);
  }

  // Ưu đãi của một bé.
  app.get('/api/hocphi/uu-dai', requireRole('admin'), (req, res) => {
    if (chiNguoiLoUuDai(req, res)) return;
    const studentId = String(req.query.studentId || '');
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const ds = db.all('hocphi_uudai',
      `SELECT * FROM hocphi_uudai WHERE studentId = ?
         AND id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)
       ORDER BY rowid DESC`, [studentId]);
    res.json({ uuDai: ds, datDuoc: db.taoKhoanThuDuoc(req.user) });
  });

  // Đặt một ưu đãi. Cùng chốt chặn với việc đặt ra khoản thu: đây cũng là một
  // quyết định về số tiền một nhà phải nộp, chỉ khác dấu.
  app.post('/api/hocphi/uu-dai', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    if (!db.findStudent(studentId)) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const ten = String(b.ten || '').trim().slice(0, 120);
    if (!ten) return res.status(400).json({ error: 'Vui lòng đặt tên cho ưu đãi, ví dụ: Ưu đãi nhà có hai bé cùng học' });
    const kieu = String(b.kieu || '').trim();
    if (!['so-tien', 'phan-tram'].includes(kieu)) {
      return res.status(400).json({ error: 'Chưa chọn mức ưu đãi ghi bằng số tiền hay phần trăm' });
    }
    const giaTri = Number(b.giaTri);
    if (!Number.isFinite(giaTri) || giaTri <= 0) {
      return res.status(400).json({ error: 'Mức ưu đãi phải lớn hơn 0' });
    }
    // Trần của kiểu phần trăm: quá 100 là miễn hơn cả số tiền phải nộp, gần
    // như luôn là gõ nhầm (gõ 1000 thay vì 100).
    if (kieu === 'phan-tram' && giaTri > 100) {
      return res.status(400).json({ error: 'Mức ưu đãi theo phần trăm không quá 100' });
    }
    const ngayHopLe = (x) => !x || /^\d{4}-\d{2}-\d{2}$/.test(String(x));
    if (!ngayHopLe(b.tuNgay) || !ngayHopLe(b.denNgay)) {
      return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-11' });
    }
    if (b.tuNgay && b.denNgay && String(b.denNgay) < String(b.tuNgay)) {
      return res.status(400).json({ error: 'Ngày hết hạn không được trước ngày bắt đầu' });
    }

    const rec = {
      id: db.nextId('hpu'),
      studentId,
      ten,
      kieu,
      giaTri: Math.round(giaTri),
      tuNgay: b.tuNgay || null,
      denNgay: b.denNgay || null,
      ghiChu: String(b.ghiChu || '').trim().slice(0, 300),
      daNhacLuc: null,
      taoBoi: req.user.id,
      taoLuc: new Date().toISOString(),
    };
    db.insert('hocphi_uudai', rec);
    db.audit(req.user.id, 'hocphi-uudai-dat', rec.id, { studentId, kieu, giaTri: rec.giaTri });
    res.status(201).json(rec);
  });

  // GỠ một ưu đãi — ngưng dùng chứ không xoá, và bắt buộc ghi lý do.
  app.post('/api/hocphi/uu-dai/:id/go', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const u = db.first('hocphi_uudai', 'SELECT * FROM hocphi_uudai WHERE id = ?', [req.params.id]);
    if (!u) return res.status(404).json({ error: 'Không tìm thấy ưu đãi này' });
    if (!db.canAccessStudent(req.user, u.studentId)) {
      return res.status(403).json({ error: 'Ưu đãi này nằm ngoài phạm vi của tài khoản' });
    }
    if (!dangDung(u)) return res.status(400).json({ error: 'Ưu đãi này đã được gỡ trước đó' });
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 300);
    if (!lyDo) return res.status(400).json({ error: 'Ghi giúp trường một dòng vì sao gỡ ưu đãi này' });

    db.insert('hocphi_uudai_go', {
      uuDaiId: u.id, lyDo, boiUserId: req.user.id, luc: new Date().toISOString(),
    });
    db.audit(req.user.id, 'hocphi-uudai-go', u.id, { studentId: u.studentId, lyDo });
    res.json({ ok: true });
  });

  // BẢNG THEO DÕI ƯU ĐÃI của mọi bé trong phạm vi.
  //
  // XẾP THEO TÊN BÉ, không theo mức ưu đãi. Xếp theo mức là sắp các bé trên
  // dưới nhau theo hoàn cảnh của cha mẹ chúng — đúng thứ QUY TẮC 4 cấm, và là
  // tiền lệ đã chốt ở bảng tháng của Báo ăn và ở bảng sổ tiền của Đ163.
  app.get('/api/hocphi/uu-dai/bang', requireRole('admin'), (req, res) => {
    if (chiNguoiLoUuDai(req, res)) return;
    const nhom = nhomCuaToi(req.user);
    const be = [];
    for (const lop of nhom) {
      for (const s of beCuaNhom(lop.id)) {
        if (db.canAccessStudent(req.user, s.id)) be.push({ ...s, tenNhom: lop.name });
      }
    }
    const ids = be.map(s => s.id);
    const theoBe = new Map();
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      for (const u of db.all('hocphi_uudai',
        `SELECT * FROM hocphi_uudai WHERE studentId IN (${m})
           AND id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)`, lo)) {
        if (!theoBe.has(u.studentId)) theoBe.set(u.studentId, []);
        theoBe.get(u.studentId).push(u);
      }
    }

    const homNay = ngay.homNay();
    const sapHet = congNgay(homNay, HAN_NHAC_TRUOC_NGAY);
    const dong = be
      .filter(s => (theoBe.get(s.id) || []).length)
      .map(s => ({
        studentId: s.id,
        tenBe: s.name,
        tenNhom: s.tenNhom,
        uuDai: (theoBe.get(s.id) || []).map(u => ({
          id: u.id,
          ten: u.ten,
          kieu: u.kieu,
          giaTri: u.giaTri,
          tuNgay: u.tuNgay,
          denNgay: u.denNgay,
          hetHan: !!(u.denNgay && u.denNgay < homNay),
          sapHetHan: !!(u.denNgay && u.denNgay >= homNay && sapHet && u.denNgay <= sapHet),
        })),
      }))
      .sort((a, b) => String(a.tenBe).localeCompare(String(b.tenBe), 'vi'));

    res.json({
      homNay,
      nhacTruocNgay: HAN_NHAC_TRUOC_NGAY,
      bang: dong,
      datDuoc: db.taoKhoanThuDuoc(req.user),
    });
  });

  // Xác nhận đã nhận tiền — cùng một lý do như trên, và nặng hơn: đây là chỗ
  // biến "nhà này còn nợ" thành "nhà này đã nộp".
  app.post('/api/hocphi/:id/xac-nhan', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (k.daNop) return res.status(400).json({ error: 'Khoản này đã được xác nhận trước đó' });
    if (db.first('hocphi_thuhoi', 'SELECT khoanId FROM hocphi_thuhoi WHERE khoanId = ?', [k.id])) {
      return res.status(400).json({ error: 'Khoản này đã được thu hồi — không xác nhận thu tiền cho nó được nữa' });
    }

    db.update('hocphi_khoan', k.id, {
      daNop: 1,
      ngayNop: ngay.homNay(),
      ghiChu: String((req.body || {}).ghiChu || '').trim(),
    });
    db.audit(req.user.id, 'hocphi-confirm', k.id, null);
    res.json({ ok: true });
  });

  // THU HỒI MỘT KHOẢN TẠO NHẦM — trước đây khoản tạo nhầm là VĨNH VIỄN: phân
  // hệ không có đường sửa hay huỷ nào cho tiền, sai bé / sai số là nằm đó mãi
  // và gia đình nhìn thấy một khoản nợ không có thật.
  //
  // Thu hồi là NGƯNG DÙNG, không phải xoá: dòng gốc giữ nguyên làm chứng từ,
  // bảng hocphi_thuhoi ghi ai thu hồi, lúc nào, vì sao — cùng nếp thu hồi của
  // cả app. Bắt buộc ghi lý do: một khoản tiền biến khỏi danh sách mà không
  // một lời giải thích trong sổ là chỗ mất lòng tin nhanh nhất.
  //
  // Khoản ĐÃ XÁC NHẬN THU TIỀN thì phải huỷ xác nhận trước (đường dưới):
  // thu hồi thẳng một khoản đã nộp là xoá dấu vết của một món tiền đã nhận.
  app.post('/api/hocphi/:id/thu-hoi', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (db.first('hocphi_thuhoi', 'SELECT khoanId FROM hocphi_thuhoi WHERE khoanId = ?', [k.id])) {
      return res.status(400).json({ error: 'Khoản này đã được thu hồi trước đó' });
    }
    if (k.daNop) {
      return res.status(400).json({
        error: 'Khoản này đã xác nhận thu tiền. Muốn thu hồi thì huỷ xác nhận trước, để sổ không mất dấu món tiền đã nhận.',
      });
    }
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 300);
    if (!lyDo) return res.status(400).json({ error: 'Ghi giúp trường một dòng vì sao thu hồi khoản này' });

    db.insert('hocphi_thuhoi', {
      khoanId: k.id, lyDo, boiUserId: req.user.id, luc: new Date().toISOString(),
    });
    db.audit(req.user.id, 'hocphi-thu-hoi', k.id, { studentId: k.studentId, soTien: k.soTien, lyDo });
    res.json({ ok: true, khoanId: k.id });
  });

  // ===========================================================================
  // NHẮC TRƯỚC KHI ƯU ĐÃI HẾT HẠN (Đ169)
  // ===========================================================================
  //
  // Nhà trường xin *"nhắc báo hạn ưu đãi"*. Hai dấu hiệu, cố ý khác nhau:
  //
  //   HUY HIỆU trên lưới ô vuông — dấu vết BỀN. Nó còn đó tới khi có người xử
  //   lý, nên người vắng hôm nhắc vẫn thấy khi quay lại.
  //   TIN ĐẨY — dấu hiệu NGAY, gửi một lần cho quản lý của bé.
  //
  // Cùng cặp mà Đ154 đã chốt cho quy trình duyệt báo cáo.
  //
  // KHÔNG NHẮC HAI LẦN CHO CÙNG MỘT ƯU ĐÃI: cột `daNhacLuc` là chốt chặn, vì
  // đồng hồ chạy 15 phút một lượt và một tin tiền nong lặp lại bốn lần mỗi giờ
  // là cách nhanh nhất để người ta tắt hẳn thông báo.
  //
  // VÀ KHÔNG CHỈ SỐNG NHỜ ĐỒNG HỒ. `HEN_GIO_PHUT=0` tắt hẳn đồng hồ (dành cho
  // máy chạy nhiều bản song song), nên bảng theo dõi vẫn tự đánh dấu "sắp hết
  // hạn" và "đã hết hạn" mỗi lần có người mở — nhắc bằng đồng hồ là lớp thêm,
  // không phải lớp duy nhất.
  // TẮT PHÂN HỆ THÌ ĐỒNG HỒ CŨNG PHẢI IM.
  //
  // Việc định giờ được đăng ký lúc nạp phân hệ và ở lại trong đồng hồ; nhà
  // trường tắt Học phí xong mà tin nhắc hạn ưu đãi vẫn đẩy về điện thoại quản
  // lý thì công tắc kia coi như không có tác dụng — cùng chỗ hở mà Đ154 đã vá
  // cho Báo cáo học tập.
  //
  // MẶC ĐỊNH ĐÓNG khi không biết (`modules` không được truyền vào), ngược với
  // Báo ăn — ở đó đóng nhầm là bếp nấu thiếu suất, còn ở đây gửi nhầm là một
  // tin về tiền đi tới người không chờ nó, mà tin đã gửi thì không rút lại được.
  function phanHeDangBat() {
    return !!(modules && typeof modules.dangBat === 'function' && modules.dangBat('hocphi'));
  }

  function quetHanUuDai() {
    if (!phanHeDangBat()) return;
    const homNay = ngay.homNay();
    const moc = congNgay(homNay, HAN_NHAC_TRUOC_NGAY);
    if (!moc) return;
    const ds = db.all('hocphi_uudai',
      `SELECT * FROM hocphi_uudai
        WHERE denNgay IS NOT NULL AND denNgay >= ? AND denNgay <= ?
          AND daNhacLuc IS NULL
          AND id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)
        LIMIT 200`, [homNay, moc]);
    for (const u of ds) {
      try {
        const be = db.findStudent(u.studentId);
        if (!be) continue;
        // BÉ ĐÃ NGHỈ HỌC THÌ THÔI NHẮC. Bảng theo dõi và huy hiệu chỉ nhìn bé
        // đang học, nên nhắc ở đây là gửi một tin không có màn nào mở ra được.
        if (be.active === false || be.active === 0) continue;

        // KHÔNG NÊU TÊN ƯU ĐÃI TRONG TIN ĐẨY.
        //
        // Tên ưu đãi là chữ tự do và kế toán rất có thể gõ hoàn cảnh của nhà vào
        // đó ("mẹ đơn thân", "hộ nghèo"). Tin đẩy hiện trên MÀN HÌNH KHOÁ điện
        // thoại, nơi người đi qua cũng đọc được. Tin chỉ nói có việc cần xem;
        // muốn biết là gì thì mở app, nơi đã có chốt chặn `docUuDaiDuoc`.
        baoNhaTruong.guiChoQuanLyCuaBe(u.studentId, {
          tieuDe: 'Có ưu đãi học phí sắp hết hạn',
          noiDung: `Một ưu đãi của bé ${be.name} hết hạn ngày ${u.denNgay}. `
            + 'Xin mở mục Học phí để xem và quyết định gia hạn hay gỡ.',
          hash: '#/hocphi',
        });
        db.update('hocphi_uudai', u.id, { daNhacLuc: new Date().toISOString() });
      } catch (err) {
        console.error(`[hocphi] không nhắc được hạn ưu đãi ${u.id}: ${err.message}`);
      }
    }
  }
  henGio.dangKy('hocphi:han-uu-dai', quetHanUuDai);

  // Huy hiệu: đếm số ưu đãi sắp hết hạn hoặc đã quá hạn trong phạm vi người
  // xem. Đếm cho người LO TIỀN — cô không có ô Học phí nên không bao giờ nhận.
  huyHieu.dangKy('hocphi', (user) => {
    if (!user || user.role !== 'admin') return 0;
    // CHỈ ĐẾM CHO NGƯỜI MỞ ĐƯỢC MÀN ƯU ĐÃI RA XEM.
    //
    // Văn phòng cơ sở có ô Học phí (ghi sổ, xác nhận đã nộp) nhưng KHÔNG đọc
    // được ưu đãi: bốn đường ưu đãi trả 403, và nút "Ưu đãi" trong view cũng
    // ẩn theo đúng `docUuDaiDuoc`. Thiếu dòng này thì ô Học phí của họ hiện
    // một con số đỏ mà trong app không có chỗ nào mở ra để xử lý, cũng không
    // có cách nào cho nó về 0 — con số nằm đó tới lúc hạn trôi quá cận dưới.
    // Số trên ô và cánh cửa mở nó ra phải do CÙNG MỘT câu quyết định.
    if (!docUuDaiDuoc(user)) return 0;
    const ids = db.studentsOf(user).map(s => s.id);
    if (!ids.length) return 0;
    const homNay = ngay.homNay();
    const moc = congNgay(homNay, HAN_NHAC_TRUOC_NGAY);
    let dem = 0;
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      // CÓ CẬN DƯỚI. Bản đầu chỉ có trần, nên mọi ưu đãi đã hết hạn từ bao giờ
      // vẫn được đếm mãi: cuối năm học 80 ưu đãi cùng hết hạn là sang tháng 6 ô
      // Học phí hiện một con số đỏ không bao giờ về 0, và một con số như vậy
      // thì người ta thôi nhìn nó. Chỉ đếm việc CÒN LÀM ĐƯỢC: sắp hết hạn, và
      // vừa quá hạn trong vòng một tháng.
      const san = congNgay(homNay, -30);
      const r = db.first('hocphi_uudai',
        `SELECT COUNT(*) AS n FROM hocphi_uudai
          WHERE studentId IN (${m}) AND denNgay IS NOT NULL
            AND denNgay <= ? AND denNgay >= ?
            AND id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)`, [...lo, moc, san]);
      dem += Number((r || {}).n || 0);
    }
    return dem;
  });

  // HUỶ XÁC NHẬN "ĐÃ NỘP" BẤM NHẦM — khoản quay về "chưa nộp", có vết đầy đủ.
  app.post('/api/hocphi/:id/huy-xac-nhan', requireRole('admin'), (req, res) => {
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [req.params.id]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Khoản thu này nằm ngoài phạm vi của tài khoản' });
    }
    if (!k.daNop) return res.status(400).json({ error: 'Khoản này đang ở trạng thái chưa nộp' });
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 300);
    if (!lyDo) return res.status(400).json({ error: 'Ghi giúp trường một dòng vì sao huỷ xác nhận' });

    db.update('hocphi_khoan', k.id, { daNop: 0, ngayNop: null });
    db.audit(req.user.id, 'hocphi-huy-xac-nhan', k.id,
      { studentId: k.studentId, soTien: k.soTien, ngayNopCu: k.ngayNop, lyDo });
    res.json({ ok: true, khoanId: k.id });
  });
};
