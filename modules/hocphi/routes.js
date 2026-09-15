const vietqr = require('../../lib/vietqr');
const qrcode = require('qrcode');

// Phân hệ Học phí — ví dụ về một tính năng cắm thêm.
//
// Nhận sẵn `db` qua tham số thứ hai nên không cần biết ứng dụng đặt tệp dữ liệu
// ở đâu. Mọi hàm kiểm tra quyền dùng chung với phần lõi, nhờ vậy phân hệ mới
// không thể vô tình để lộ dữ liệu của học sinh lớp khác.
// ===========================================================================
// LOẠI CỦA MỘT KHOẢN THU (Đ199, việc 34)
// ===========================================================================
//
// Nhà trường: ưu đãi chỉ áp trên HỌC PHÍ, không áp trên tiền ăn hay tiền xe.
// Hôm nay `hocphi_khoan` chỉ có `noiDung` là chữ tự do nên máy không phân
// biệt được — mà "Tiền ăn tháng 9" với "Học phí tháng 9" thì con người đọc ra
// ngay, còn máy thì không, và đoán theo chữ là đoán sai vào đúng lúc tên
// khoản được gõ khác đi một chữ.
//
// KHÔNG CÓ DÒNG = HỌC PHÍ. Xem chú thích dài ở `hocphi_khoan_loai` trong
// schema.sql: cho khoản cũ về 'khac' là số tiền một nhà đang nợ tự nhiên
// tăng lên mà không ai bấm gì.
const LOAI_KHOAN = [
  ['hoc-phi', 'Học phí'],
  ['tien-an', 'Tiền ăn'],
  ['xe-dua-don', 'Xe đưa đón'],
  ['khac', 'Khoản khác'],
];
const MA_LOAI_KHOAN = LOAI_KHOAN.map(x => x[0]);
const TEN_LOAI_KHOAN = Object.fromEntries(LOAI_KHOAN);
const LOAI_MAC_DINH = 'hoc-phi';

// ƯU ĐÃI CHỈ ÁP TRÊN LOẠI NÀY. Một hằng số, không phải một ô cấu hình: nhà
// trường nói thẳng "ưu đãi chỉ áp trên học phí", nên đây là LUẬT chứ không
// phải lựa chọn. Ngày trường đổi ý thì đổi ở đúng một dòng.
const LOAI_DUOC_UU_DAI = ['hoc-phi'];

module.exports = (app, { db, modules }) => {
  // Loại của một khoản, và của cả một danh sách (đọc MỘT lượt).
  function loaiCua(khoanId) {
    try {
      const r = db.first('hocphi_khoan_loai',
        'SELECT loai FROM hocphi_khoan_loai WHERE khoanId = ?', [khoanId]);
      return r && MA_LOAI_KHOAN.includes(r.loai) ? r.loai : LOAI_MAC_DINH;
    } catch (_) {
      return LOAI_MAC_DINH;
    }
  }
  function loaiTheoKhoan(ids) {
    const ra = new Map();
    const ds = (ids || []).filter(Boolean);
    if (!ds.length) return ra;
    try {
      const m = ds.map(() => '?').join(',');
      for (const r of db.all('hocphi_khoan_loai',
        `SELECT khoanId, loai FROM hocphi_khoan_loai WHERE khoanId IN (${m})`, ds)) {
        if (MA_LOAI_KHOAN.includes(r.loai)) ra.set(r.khoanId, r.loai);
      }
    } catch (_) { /* bảng chưa có thì mọi khoản về mặc định */ }
    return ra;
  }
  // Ghi loại cho một khoản. MẶC ĐỊNH THÌ KHÔNG GHI DÒNG NÀO — giữ bảng phụ chỉ
  // chứa những gì kế toán thật sự đã chọn khác đi, cùng lối `lib/nhom-co.js`.
  function ghiLoai(khoanId, loai) {
    const ma = MA_LOAI_KHOAN.includes(String(loai || '')) ? String(loai) : LOAI_MAC_DINH;
    if (ma === LOAI_MAC_DINH) return ma;
    try {
      db.upsert('hocphi_khoan_loai', { khoanId, loai: ma }, ['khoanId']);
    } catch (_) { /* việc phụ: hỏng thì khoản về mặc định, không làm hỏng lượt ghi */ }
    return ma;
  }

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

  // BÉ ĐANG HỌC MÀ CHƯA XẾP NHÓM VẪN LÀ BÉ CỦA TRƯỜNG, VÀ NHÀ VẪN PHẢI NỘP TIỀN.
  //
  // Cả sổ tiền lẫn bảng ưu đãi đều đi vòng qua nhóm lớp: `nhomCuaToi` → từng
  // nhóm → `beCuaNhom`. Đường ấy đúng cho phần lớn bé, nhưng nó BỎ RƠI hai
  // trường hợp có thật và không báo một lời nào:
  //
  //   • bé vừa nhận vào trường mà văn phòng chưa xếp nhóm;
  //   • bé của một nhóm vừa đóng (cuối năm học, gộp nhóm) mà chưa chuyển sang
  //     nhóm mới — `nhomCuaToi` chỉ lấy nhóm còn hoạt động.
  //
  // Hậu quả nặng hơn vẻ ngoài của nó: bé ấy KHÔNG BAO GIỜ được ghi một khoản
  // nào trong đợt ghi sổ "cả trường", cũng không hiện ở bảng sổ tiền để ai đó
  // nhận ra là thiếu. Nhà đi học suốt một tháng rồi mới có người hỏi ra.
  //
  // Lấy phần còn thiếu bằng cách TRỪ: mọi bé trong phạm vi, bớt đi những bé đã
  // có mặt trong danh sách nhóm. Trừ thì không sót và cũng không đếm hai lần,
  // dù lý do rơi ra là gì. `db.studentsOf` đã lo tầng cơ sở (Cấp 3 không thấy
  // bé chưa xếp nhóm vì bé ấy không thuộc cơ sở nào), và vẫn hỏi lại từng bé.
  function beNgoaiNhom(user, daCoIds) {
    return db.studentsOf(user)
      .filter(s => !daCoIds.has(s.id))
      .filter(s => s.active !== false && s.active !== 0)
      .filter(s => db.canAccessStudent(user, s.id))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  }

  // Tên hiện trên màn cho nhóm giả ấy. Một chỗ duy nhất để hai bảng không gọi
  // khác tên nhau.
  const TEN_CHUA_XEP_NHOM = 'Chưa xếp nhóm';

  // CHUẨN HOÁ KHI SO, GIỮ NGUYÊN KHI GHI — MỘT LUẬT CHO CẢ HAI ĐƯỜNG GHI SỔ.
  //
  // Đường hàng loạt có luật này từ Đ171: "Tiền ăn tháng 9" và "Tiền ăn Tháng 9"
  // phải là MỘT khoản, không thì cả trường bị đòi tiền hai lần vì một chữ hoa
  // hay một dấu cách thừa lúc dán từ Excel. Đường MỘT BÉ nay dùng chung đúng
  // hàm ấy — hai đường so khác nhau thì cùng một cặp chữ vừa là trùng vừa là
  // không trùng, tuỳ người dùng bấm nút nào.
  //
  // Cái GHI xuống sổ vẫn là chữ kế toán đã gõ, không đụng tới.
  const chuanHoa = (x) => String(x || '').trim().replace(/\s+/g, ' ').toLowerCase();

  // Bé này ĐÃ có đúng khoản ấy chưa (chưa bị thu hồi)?
  function khoanTrungCuaBe(studentId, kyThu, noiDung) {
    const ky = chuanHoa(kyThu);
    const nd = chuanHoa(noiDung);
    return db.all('hocphi_khoan',
      `SELECT id, kyThu, noiDung, soTien, taoLuc FROM hocphi_khoan
        WHERE studentId = ?
          AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)`, [studentId])
      .find(k => chuanHoa(k.kyThu) === ky && chuanHoa(k.noiDung) === nd) || null;
  }

  // Những kỳ thu CÓ THẬT trong sổ của đúng nhóm bé này, để ô xổ khỏi bắt gõ tay.
  // Trả về nhiều nhất 24 kỳ gần nhất.
  function kyThuTrongPhamVi(ids) {
    if (!ids.length) return [];
    const co = new Set();
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const m = lo.map(() => '?').join(',');
      for (const r of db.all('hocphi_khoan',
        `SELECT DISTINCT kyThu FROM hocphi_khoan
          WHERE studentId IN (${m})
            AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)`, lo)) {
        if (r.kyThu) co.add(r.kyThu);
      }
    }
    return [...co].sort().reverse().slice(0, 24);
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

    // ƯU ĐÃI CỦA CHÍNH BÉ NÀY — nhà trường mở cho gia đình ngày 10/09/2026
    // (A19 ý 1): *"Gia đình có thể xem được ưu đãi của con mình — theo dõi hành
    // trình ưu đãi luôn"*.
    //
    // Đ169 để mặc định ĐÓNG với gia đình vì lúc đó *"quyết định ai đọc được nó
    // là của nhà trường"*. Nay nhà trường đã quyết, nên mở.
    //
    // ĐI QUA CHÍNH ĐƯỜNG NÀY, KHÔNG DỰNG ĐƯỜNG MỚI: chốt `canAccessStudent` ở
    // đầu hàm đã gác đúng câu hỏi "bé này có phải con nhà này không", và gia
    // đình vốn đã mở màn sổ tiền để xem khoản phải nộp. Thêm một đường riêng là
    // thêm một chỗ phải nhớ gác, và hai chỗ rồi sẽ trôi khỏi nhau.
    //
    // KHÔNG trả `ghiChu`: ô đó là chỗ kế toán ghi hoàn cảnh của nhà — *"mẹ xin
    // giảm vì bố mất việc"* — tức là ghi chép nội bộ của trường về một gia
    // đình, không phải thứ để chính nhà ấy đọc lại trên điện thoại. Cùng tinh
    // thần ba lớp dữ liệu của CLAUDE.md.
    //
    // Và cũng KHÔNG trả `taoBoi`: tên người đặt ưu đãi là việc nội bộ.
    const uuDaiCuaBe = db.all('hocphi_uudai',
      `SELECT id, ten, kieu, giaTri, tuNgay, denNgay, taoLuc FROM hocphi_uudai
         WHERE studentId = ?
           AND id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)
       ORDER BY rowid DESC`, [studentId]);

    // LOẠI CỦA TỪNG KHOẢN, đọc MỘT lượt cho cả danh sách (Đ199, việc 34).
    const loaiMap = loaiTheoKhoan(khoan.map(k => k.id));
    const loaiCuaK = k => loaiMap.get(k.id) || LOAI_MAC_DINH;

    res.json({
      khoan: khoan.map(k => ({
        ...k,
        daNop: !!k.daNop,
        loai: loaiCuaK(k),
        tenLoai: TEN_LOAI_KHOAN[loaiCuaK(k)] || '',
      })),
      loaiKhoan: LOAI_KHOAN.map(([ma, ten]) => ({
        ma, ten, duocUuDai: LOAI_DUOC_UU_DAI.includes(ma),
      })),
      uuDai: uuDaiCuaBe,
      tongChuaNop: chuaNop.reduce((s, k) => s + Number(k.soTien || 0), 0),
      // PHẦN ƯU ĐÃI ÁP ĐƯỢC LÊN — nhà trường: ưu đãi chỉ áp trên HỌC PHÍ.
      //
      // Máy chủ nói ra con số này chứ không để màn hình tự cộng: cộng tiền ở
      // hai nơi là hai nơi sẽ ra hai số, và số sai sẽ là số nhà nhìn thấy.
      //
      // Đây là số GỐC để tính ưu đãi, không phải số đã trừ: phân hệ này cố ý
      // không tự trừ tiền của ai — kế toán quyết định và ghi thành một khoản
      // (xem chú thích ở đường ghi sổ). Nói ra gốc là đủ để kế toán tính đúng
      // và để màn hình giải thích được vì sao.
      tongChuaNopDuocUuDai: chuaNop
        .filter(k => LOAI_DUOC_UU_DAI.includes(loaiCuaK(k)))
        .reduce((s, k) => s + Number(k.soTien || 0), 0),
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
        // mất luôn nút CHỈ ĐỌC xem sổ tiền mà máy chủ vẫn mở cho họ; đúng
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

    // CẢNH BÁO KHI BÉ ĐÃ CÓ ĐÚNG KHOẢN NÀY, KHÔNG GHI CHỒNG LẶNG LẼ.
    //
    // Đường ghi sổ HÀNG LOẠT có bước này từ đầu, và chú thích của chính nó gọi
    // đó là *"phần quan trọng nhất của đường này"*: mạng chập chờn, cô bấm hai
    // lần, hay văn phòng chạy lại vì nhớ nhầm — cả ba đều có thật, và cả ba đều
    // dẫn tới một nhà bị đòi tiền hai lần. Lập luận ấy đúng y nguyên cho đường
    // MỘT BÉ, mà đường một bé thì trước đợt này ghi thẳng, không hỏi gì cả.
    //
    // HỎI LẠI CHỨ KHÔNG CẤM. Một nhà nộp hai lần cùng một nội dung trong một kỳ
    // là chuyện có thật (hai đợt dã ngoại cùng tên, tiền ăn bù tháng trước), nên
    // máy không được tự quyết thay kế toán — nó chỉ không được im lặng. Cùng
    // khuôn với đường nhận một bé: 409 kèm câu hỏi, gửi lại với `xacNhanTrung`
    // thì ghi.
    //
    // 409 chứ không phải 400: đây là CẢNH BÁO, và màn hình phân biệt hai thứ ấy
    // bằng mã lỗi chứ không bằng câu chữ (bài học Đ173).
    if (req.body?.xacNhanTrung !== true) {
      const daCo = khoanTrungCuaBe(studentId, kyThu, noiDung);
      if (daCo) {
        return res.status(409).json({
          error: `Bé này đã có một khoản "${daCo.noiDung}" của kỳ "${daCo.kyThu}" `
            + `(${Number(daCo.soTien || 0).toLocaleString('vi-VN')} đ) và chưa được thu hồi. `
            + 'Nếu đây đúng là một khoản KHÁC thì xác nhận để ghi thêm.',
          khoanDaCo: {
            id: daCo.id, kyThu: daCo.kyThu, noiDung: daCo.noiDung, soTien: daCo.soTien,
          },
        });
      }
    }

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
    const loaiXin = String((req.body || {}).loai || LOAI_MAC_DINH);
    if (!MA_LOAI_KHOAN.includes(loaiXin)) {
      return res.status(400).json({
        error: `Loại khoản thu chỉ có: ${LOAI_KHOAN.map(x => x[1]).join(' · ')}`,
      });
    }
    db.tx(() => {
      db.insert('hocphi_khoan', rec);
      ghiLoai(rec.id, loaiXin);
    });
    db.audit(req.user.id, 'hocphi-create', rec.id, { studentId, soTien: rec.soTien, loai: loaiXin });
    res.status(201).json({ ...rec, daNop: false, loai: loaiXin, tenLoai: TEN_LOAI_KHOAN[loaiXin] });
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
    // "CẢ TRƯỜNG" PHẢI LÀ CẢ TRƯỜNG, kể cả bé chưa xếp nhóm. Chỉ thêm ở phạm vi
    // này: chọn một nhóm hay một cơ sở là chọn đúng chỗ ấy, không kèm theo bé
    // không thuộc chỗ nào.
    if (pham === 'truong') {
      be.push(...beNgoaiNhom(req.user, new Set(be.map(s => s.id))));
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
    // Bé chưa xếp nhóm gom vào một thẻ riêng ở cuối bảng — xem `beNgoaiNhom`.
    // Dùng `classId: ''` làm khoá của nhóm giả; bé thật không bao giờ có khoá ấy.
    const ngoaiNhom = beNgoaiNhom(req.user, new Set(be.map(s => s.id)))
      .map(s => ({ ...s, classId: '' }));
    be.push(...ngoaiNhom);

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
    // Thẻ "Chưa xếp nhóm" LUÔN Ở CUỐI, không xếp lẫn theo tên cơ sở: nó không
    // phải một cơ sở, và đặt nó giữa bảng thì người đọc tưởng trường có thêm
    // một cơ sở tên như vậy.
    if (ngoaiNhom.length) {
      bang.push({
        campusId: '',
        ten: TEN_CHUA_XEP_NHOM,
        nhom: [{
          classId: '',
          ten: TEN_CHUA_XEP_NHOM,
          be: ngoaiNhom
            .map(s => ({ id: s.id, ten: s.name, ...theoBe.get(s.id) }))
            .sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')),
        }],
      });
    }

    res.json({
      kyThu,
      // Danh sách kỳ thu có thật trong sổ, để màn hình khỏi bắt gõ tay.
      // DANH SÁCH KỲ THU CŨNG PHẢI NẰM TRONG PHẠM VI.
      //
      // Bản đầu quét cả bảng, nên tài khoản khoá vào cơ sở 1 đọc được chữ kế
      // toán cơ sở 2 gõ vào ô kỳ thu ("Tiền học hè cơ sở Vinhomes đợt 2"…).
      // Chữ tự do là chữ tự do: nó mang thông tin của một cơ sở khác ra ngoài
      // phạm vi, và chỗ ấy lại là một ô xổ ai cũng bấm vào.
      kyThuCo: kyThuTrongPhamVi(ids),
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
    // BẢNG VÀ HUY HIỆU PHẢI NHÌN CÙNG MỘT DANH SÁCH BÉ.
    //
    // Huy hiệu đếm theo `db.studentsOf` (mọi bé trong phạm vi), còn bảng này đi
    // vòng qua nhóm lớp — nên ưu đãi của một bé chưa xếp nhóm được ĐẾM mà không
    // hiện ở đâu để gỡ. Kế toán thấy số đỏ, mở bảng ra thì không có dòng nào.
    be.push(...beNgoaiNhom(req.user, new Set(be.map(s => s.id)))
      .map(s => ({ ...s, tenNhom: TEN_CHUA_XEP_NHOM })));
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
          // "TỪ NGÀY" PHẢI NÓI ĐƯỢC RA MÀN HÌNH.
          //
          // Biểu mẫu có ô Từ ngày, máy chủ nhận và lưu, nhưng trước đợt này
          // KHÔNG màn nào hiện nó ra. Kế toán đặt ưu đãi "từ tháng sau" rồi
          // nhìn bảng thấy nó nằm đó y như một ưu đãi đang chạy — và trừ tiền
          // sớm cả học kỳ. Máy vẫn KHÔNG tự trừ, nhưng nó phải nói thật là
          // dòng này chưa tới ngày áp dụng.
          chuaHieuLuc: !!(u.tuNgay && u.tuNgay > homNay),
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

  // =========================================================================
  // TẦNG BIỂU PHÍ (Đ200, việc 33)
  // =========================================================================
  //
  // Nhà trường: *"kế toán soạn, cấp 1 duyệt rồi khoá, muốn sửa phải xin mở"*.
  // Lý do đầy đủ ở đầu khối `hocphi_bieuphi` trong schema.sql — đọc chỗ đó
  // trước khi sửa gì ở đây.
  //
  // ĐĂNG KÝ TRƯỚC MỌI ĐƯỜNG CÓ `/:id`. Express khớp đường dẫn theo THỨ TỰ
  // ĐĂNG KÝ, nên đường có chỗ trống `:id` đứng trước sẽ NUỐT đường có tên
  // thật đứng sau.
  //
  // NÓI CHO ĐÚNG MỨC: HÔM NAY CHƯA CÓ ĐƯỜNG NÀO NUỐT ĐƯỢC KHỐI NÀY. Mấy
  // đường `/:id` đang có đều là bốn đoạn và đoạn cuối là chữ thật
  // (`/:id/xac-nhan`, `/:id/thu-hoi`, `/:id/huy-xac-nhan`), còn
  // `/api/hocphi/bieu-phi` chỉ ba đoạn — không đường nào khớp. Nên thứ tự này
  // là PHÒNG chứ chưa phải VÁ.
  //
  // Vẫn giữ, vì cái ngày người sau thêm `GET /api/hocphi/:id` — một đường
  // rất tự nhiên để thêm — thì mọi đường tên thật ba đoạn ở đây rơi hết vào
  // nó với :id là chuỗi "bieu-phi", và kế toán soạn xong bảng giá nhận câu
  // "Không tìm thấy khoản thu": một lỗi mà thông báo KHÔNG chỉ ra nguyên
  // nhân. Đặt sẵn đúng thứ tự thì ngày đó không có gì để sửa. Bài canh
  // `test/bieu-phi.test.mjs` mục [1] giữ thứ tự này.
  const TRANG_THAI_BP = ['nhap', 'cho-duyet', 'da-duyet', 'da-thay'];
  const TEN_TRANG_THAI_BP = {
    'nhap': 'Đang soạn',
    'cho-duyet': 'Chờ ban giám hiệu duyệt',
    'da-duyet': 'Đã duyệt và khoá',
    'da-thay': 'Đã có bản mới thay',
  };

  function bieuPhiCua(id) {
    try {
      return db.first('hocphi_bieuphi', 'SELECT * FROM hocphi_bieuphi WHERE id = ?', [id]) || null;
    } catch (_) { return null; }
  }
  function dongCuaBieuPhi(id) {
    try {
      return db.all('hocphi_bieuphi_dong',
        'SELECT * FROM hocphi_bieuphi_dong WHERE bieuPhiId = ? ORDER BY thuTu, rowid', [id]);
    } catch (_) { return []; }
  }
  // Lượt xin mở khoá đang CHỜ của một biểu phí, hoặc null.
  function xinMoDangCho(id) {
    try {
      return db.first('hocphi_bieuphi_moKhoa',
        "SELECT * FROM hocphi_bieuphi_moKhoa WHERE bieuPhiId = ? AND trangThai = 'cho-duyet' ORDER BY rowid DESC",
        [id]) || null;
    } catch (_) { return null; }
  }
  // BIỂU PHÍ NÀY THUỘC PHẠM VI CỦA NGƯỜI NÀY KHÔNG.
  //
  // Biểu phí của CẢ TRƯỜNG (campusId rỗng) thì quản lý một cơ sở vẫn đọc được
  // — đó là bảng giá áp lên chính cơ sở họ. Nhưng biểu phí RIÊNG của cơ sở
  // khác thì không: bảng giá của cơ sở 2 không phải việc của cơ sở 1.
  function trongPhamVi(user, bp) {
    if (!bp) return false;
    if (!bp.campusId) return true;
    const pham = db.phamViCoSo(user);
    return pham === null || pham === bp.campusId;
  }

  function goiBieuPhi(bp, user) {
    const dong = dongCuaBieuPhi(bp.id);
    const xin = xinMoDangCho(bp.id);
    return {
      ...bp,
      tenTrangThai: TEN_TRANG_THAI_BP[bp.trangThai] || bp.trangThai,
      dong: dong.map(d => ({ ...d, tenLoai: TEN_LOAI_KHOAN[d.loai] || '' })),
      tongTien: dong.reduce((t, d) => t + Number(d.soTien || 0), 0),
      // MÁY CHỦ NÓI RA QUYỀN, MÀN HÌNH KHÔNG TỰ ĐOÁN THEO VAI — nếp của Đ157.
      quyen: {
        suaDuoc: bp.trangThai === 'nhap' && db.taoKhoanThuDuoc(user),
        guiDuyetDuoc: bp.trangThai === 'nhap' && dong.length > 0 && db.taoKhoanThuDuoc(user),
        duyetDuoc: bp.trangThai === 'cho-duyet' && db.duyetBieuPhiDuoc(user),
        xinMoDuoc: bp.trangThai === 'da-duyet' && !xin && db.taoKhoanThuDuoc(user),
        traLoiXinMoDuoc: !!xin && db.duyetBieuPhiDuoc(user),
        chepDuoc: bp.trangThai === 'da-duyet' && db.taoKhoanThuDuoc(user),
      },
      xinMoDangCho: xin ? { id: xin.id, lyDo: xin.lyDo, xinLuc: xin.xinLuc, xinBoi: xin.xinBoi } : null,
    };
  }

  // BÁO NGƯỜI DUYỆT KHI CÓ BẢN CHỜ DUYỆT.
  //
  // Một bản chờ duyệt mà không ai biết là một bản nằm đó tới lúc kế toán phải
  // đi hỏi — cùng lý do đã ghi ở Đ154 cho nhật ký chờ duyệt.
  //
  // KHÔNG đi qua `bao-nha-truong.js`: mọi hàm ở đó nhận `studentId` hoặc
  // `classId` để lọc theo phạm vi, mà một biểu phí không thuộc về bé nào cả.
  // Ở đây người nhận là NGƯỜI DUYỆT ĐƯỢC BIỂU PHÍ — hỏi đúng `duyetBieuPhiDuoc`
  // thay vì chép lại một danh sách chức vụ thứ hai.
  //
  // Việc phụ: hỏng thì lượt gửi duyệt vẫn xong.
  function baoNguoiDuyetBieuPhi(bp, nguoiGui) {
    try {
      const ds = db.all('users', "SELECT * FROM users WHERE role = 'admin' AND active = 1")
        .filter(u => u.id !== (nguoiGui && nguoiGui.id))
        .filter(u => db.duyetBieuPhiDuoc(u))
        .filter(u => !bp.campusId || db.phamViCoSo(u) === null || db.phamViCoSo(u) === bp.campusId);
      if (!ds.length) return 0;
      // KHÔNG NÊU SỐ TIỀN — tin hiện trên màn hình khoá điện thoại, và bảng giá
      // của trường chưa duyệt thì chưa phải thứ người đi qua đọc được. Cùng
      // lối đã ghi ở `quetHanNop` (Đ199).
      require('../../lib/day').guiChoNhieuNguoi(ds.map(u => u.id), {
        tieuDe: 'Có biểu phí chờ duyệt',
        noiDung: `Kế toán vừa gửi biểu phí "${bp.ten}" lên chờ duyệt.`,
        hash: '#/hocphi',
        gop: `bp-${bp.id}`,
      });
      return ds.length;
    } catch (_) {
      return 0;
    }
  }

  app.get('/api/hocphi/bieu-phi', requireRole('admin'), (req, res) => {
    let ds = [];
    try {
      ds = db.all('hocphi_bieuphi', 'SELECT * FROM hocphi_bieuphi ORDER BY rowid DESC LIMIT 200');
    } catch (_) { ds = []; }
    res.json({
      bieuPhi: ds.filter(bp => trongPhamVi(req.user, bp)).map(bp => goiBieuPhi(bp, req.user)),
      loaiKhoan: LOAI_KHOAN.map(([ma, ten]) => ({ ma, ten, duocUuDai: LOAI_DUOC_UU_DAI.includes(ma) })),
      trangThai: TRANG_THAI_BP.map(ma => ({ ma, ten: TEN_TRANG_THAI_BP[ma] })),
      quyen: { soanDuoc: db.taoKhoanThuDuoc(req.user), duyetDuoc: db.duyetBieuPhiDuoc(req.user) },
    });
  });

  // Kế toán soạn một biểu phí mới, hoặc sửa bản còn đang soạn.
  //
  // ĐẶT LẠI TRỌN DANH SÁCH DÒNG mỗi lượt ghi — đúng hình dạng của một bảng giá
  // mà người ta sửa trên màn rồi bấm Lưu. Chỉ làm được khi bản còn `nhap`.
  app.post('/api/hocphi/bieu-phi', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const b = req.body || {};
    const ten = String(b.ten || '').trim().slice(0, 120);
    if (!ten) return res.status(400).json({ error: 'Đặt giúp một cái tên cho biểu phí nhé' });

    const id = String(b.id || '').trim();
    let bp = id ? bieuPhiCua(id) : null;
    if (id && !bp) return res.status(404).json({ error: 'Không tìm thấy biểu phí này' });
    if (bp && !trongPhamVi(req.user, bp)) {
      return res.status(403).json({ error: 'Biểu phí này thuộc cơ sở khác' });
    }
    if (bp && bp.trangThai !== 'nhap') {
      // ĐÂY LÀ CÁI KHOÁ, và câu từ chối phải nói ra đường đi tiếp.
      return res.status(403).json({
        error: bp.trangThai === 'da-duyet'
          ? 'Biểu phí đã duyệt nên đang khoá. Muốn sửa thì xin ban giám hiệu mở khoá trước nhé.'
          : 'Biểu phí đang chờ ban giám hiệu duyệt nên chưa sửa được.',
      });
    }

    // Làm sạch từng dòng. Số tiền âm hay không phải số thì TỪ CHỐI CẢ MẺ —
    // một bảng giá ghi vào nửa chừng còn tệ hơn không ghi được.
    const dong = [];
    for (const [i, x] of (Array.isArray(b.dong) ? b.dong : []).entries()) {
      const noiDung = String((x || {}).noiDung || '').trim().slice(0, 120);
      if (!noiDung) return res.status(400).json({ error: `Dòng thứ ${i + 1} chưa có tên khoản` });
      const loai = String((x || {}).loai || LOAI_MAC_DINH);
      if (!MA_LOAI_KHOAN.includes(loai)) {
        return res.status(400).json({ error: `Dòng "${noiDung}" có loại khoản thu chưa hợp lệ` });
      }
      const tien = Number((x || {}).soTien);
      if (!Number.isFinite(tien) || tien < 0 || tien > 1e12) {
        return res.status(400).json({ error: `Dòng "${noiDung}" có số tiền chưa hợp lệ` });
      }
      dong.push({ noiDung, loai, soTien: Math.round(tien), thuTu: i });
    }

    const luc = new Date().toISOString();
    const campusId = String(b.campusId || '').trim() || null;
    // Quản lý một cơ sở chỉ soạn được biểu phí của chính cơ sở mình.
    const pham = db.phamViCoSo(req.user);
    if (pham !== null && campusId && campusId !== pham) {
      return res.status(403).json({ error: 'Chỉ soạn được biểu phí của cơ sở mình' });
    }
    if (pham !== null && !campusId) {
      return res.status(403).json({ error: 'Biểu phí cho cả trường là việc của ban giám hiệu' });
    }

    let raId = bp ? bp.id : db.nextId('bp');
    db.tx(() => {
      if (bp) {
        db.update('hocphi_bieuphi', bp.id, {
          ten, namHoc: String(b.namHoc || '').trim().slice(0, 20),
          campusId, ghiChu: String(b.ghiChu || '').trim().slice(0, 500),
        });
        db.run('DELETE FROM hocphi_bieuphi_dong WHERE bieuPhiId = ?', [bp.id]);
      } else {
        db.insert('hocphi_bieuphi', {
          id: raId, ten, namHoc: String(b.namHoc || '').trim().slice(0, 20),
          campusId, trangThai: 'nhap', ghiChu: String(b.ghiChu || '').trim().slice(0, 500),
          taoBoi: req.user.id, taoLuc: luc,
          guiBoi: null, guiLuc: null, duyetBoi: null, duyetLuc: null,
        });
      }
      for (const d of dong) {
        db.insert('hocphi_bieuphi_dong', { id: db.nextId('bpd'), bieuPhiId: raId, ...d });
      }
    });
    db.audit(req.user.id, bp ? 'hocphi-bieuphi-sua' : 'hocphi-bieuphi-tao', raId, { ten, soDong: dong.length });
    res.status(bp ? 200 : 201).json(goiBieuPhi(bieuPhiCua(raId), req.user));
  });

  // Kế toán gửi biểu phí lên chờ duyệt. Gửi xong là THÔI SỬA ĐƯỢC.
  app.post('/api/hocphi/bieu-phi/:id/gui', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const bp = bieuPhiCua(req.params.id);
    if (!bp) return res.status(404).json({ error: 'Không tìm thấy biểu phí này' });
    if (!trongPhamVi(req.user, bp)) return res.status(403).json({ error: 'Biểu phí này thuộc cơ sở khác' });
    if (bp.trangThai !== 'nhap') {
      return res.status(400).json({ error: 'Biểu phí này đã gửi rồi' });
    }
    if (!dongCuaBieuPhi(bp.id).length) {
      return res.status(400).json({ error: 'Biểu phí chưa có dòng nào — thêm ít nhất một khoản rồi gửi nhé' });
    }
    db.update('hocphi_bieuphi', bp.id, {
      trangThai: 'cho-duyet', guiBoi: req.user.id, guiLuc: new Date().toISOString(),
    });
    db.audit(req.user.id, 'hocphi-bieuphi-gui-duyet', bp.id, { ten: bp.ten });
    baoNguoiDuyetBieuPhi(bp, req.user);
    res.json(goiBieuPhi(bieuPhiCua(bp.id), req.user));
  });

  // CẤP 1 DUYỆT — và duyệt xong là KHOÁ.
  //
  // `db.duyetBieuPhiDuoc` chỉ mở cho ban giám hiệu: người SOẠN không được tự
  // duyệt lấy, nếu không thì bước duyệt chỉ là một cái nút kế toán tự bấm cho
  // mình. Lý do đầy đủ ở `lib/db.js`.
  app.post('/api/hocphi/bieu-phi/:id/duyet', requireRole('admin'), (req, res) => {
    const bp = bieuPhiCua(req.params.id);
    if (!bp) return res.status(404).json({ error: 'Không tìm thấy biểu phí này' });
    if (!db.duyetBieuPhiDuoc(req.user)) {
      return res.status(403).json({
        error: 'Duyệt biểu phí là việc của ban giám hiệu. Kế toán soạn và gửi, ban giám hiệu duyệt — '
          + 'người đặt ra bảng giá không tự duyệt bảng giá của mình.',
      });
    }
    if (!trongPhamVi(req.user, bp)) return res.status(403).json({ error: 'Biểu phí này thuộc cơ sở khác' });
    if (bp.trangThai !== 'cho-duyet') {
      return res.status(400).json({ error: 'Biểu phí này chưa được gửi duyệt' });
    }
    const dongY = String((req.body || {}).quyetDinh || 'duyet') === 'duyet';
    const yKien = String((req.body || {}).yKien || '').trim().slice(0, 500);
    if (!dongY && !yKien) {
      return res.status(400).json({ error: 'Trả lại thì ghi giúp kế toán một dòng vì sao nhé' });
    }
    db.update('hocphi_bieuphi', bp.id, dongY
      ? { trangThai: 'da-duyet', duyetBoi: req.user.id, duyetLuc: new Date().toISOString() }
      : { trangThai: 'nhap', ghiChu: yKien ? `Ban giám hiệu trả lại: ${yKien}` : bp.ghiChu });
    db.audit(req.user.id, dongY ? 'hocphi-bieuphi-duyet' : 'hocphi-bieuphi-tra-lai', bp.id, { ten: bp.ten, yKien });
    res.json(goiBieuPhi(bieuPhiCua(bp.id), req.user));
  });

  // XIN MỞ KHOÁ — kế toán xin, ban giám hiệu trả lời.
  app.post('/api/hocphi/bieu-phi/:id/xin-mo', requireRole('admin'), (req, res) => {
    if (chiNguoiLoTien(req, res)) return;
    const bp = bieuPhiCua(req.params.id);
    if (!bp) return res.status(404).json({ error: 'Không tìm thấy biểu phí này' });
    if (!trongPhamVi(req.user, bp)) return res.status(403).json({ error: 'Biểu phí này thuộc cơ sở khác' });
    if (bp.trangThai !== 'da-duyet') {
      return res.status(400).json({ error: 'Biểu phí này chưa khoá nên không cần xin mở' });
    }
    if (xinMoDangCho(bp.id)) {
      return res.status(409).json({ error: 'Đã có một lượt xin mở đang chờ ban giám hiệu trả lời' });
    }
    // LÝ DO LÀ BẮT BUỘC, và đó là toàn bộ giá trị của bước này. Một lượt xin
    // không lý do thì người duyệt chỉ có thể bấm bừa, và cái khoá thành thủ tục.
    const lyDo = String((req.body || {}).lyDo || '').trim().slice(0, 500);
    if (lyDo.length < 10) {
      return res.status(400).json({
        error: 'Ghi giúp vài chữ vì sao cần sửa bảng giá nhé — ban giám hiệu đọc dòng này để quyết.',
      });
    }
    const id = db.nextId('bpm');
    db.insert('hocphi_bieuphi_moKhoa', {
      id, bieuPhiId: bp.id, lyDo, trangThai: 'cho-duyet',
      xinBoi: req.user.id, xinLuc: new Date().toISOString(),
      traLoiBoi: null, traLoiLuc: null, yKien: '',
    });
    db.audit(req.user.id, 'hocphi-bieuphi-xin-mo', bp.id, { lyDo });
    res.status(201).json(goiBieuPhi(bieuPhiCua(bp.id), req.user));
  });

  app.post('/api/hocphi/bieu-phi/:id/tra-loi-xin-mo', requireRole('admin'), (req, res) => {
    const bp = bieuPhiCua(req.params.id);
    if (!bp) return res.status(404).json({ error: 'Không tìm thấy biểu phí này' });
    if (!db.duyetBieuPhiDuoc(req.user)) {
      return res.status(403).json({ error: 'Mở khoá biểu phí là việc của ban giám hiệu' });
    }
    if (!trongPhamVi(req.user, bp)) return res.status(403).json({ error: 'Biểu phí này thuộc cơ sở khác' });
    const xin = xinMoDangCho(bp.id);
    if (!xin) return res.status(400).json({ error: 'Không có lượt xin mở nào đang chờ' });

    const dongY = String((req.body || {}).quyetDinh || 'mo') === 'mo';
    const yKien = String((req.body || {}).yKien || '').trim().slice(0, 500);
    if (!dongY && !yKien) {
      return res.status(400).json({ error: 'Từ chối thì ghi giúp kế toán một dòng vì sao nhé' });
    }
    db.tx(() => {
      db.update('hocphi_bieuphi_moKhoa', xin.id, {
        trangThai: dongY ? 'da-mo' : 'tu-choi',
        traLoiBoi: req.user.id, traLoiLuc: new Date().toISOString(), yKien,
      });
      // MỞ KHOÁ LÀ VỀ 'nhap', KHÔNG PHẢI XOÁ DẤU ĐÃ DUYỆT. `duyetBoi` và
      // `duyetLuc` giữ nguyên làm chứng từ: bảng giá này ĐÃ từng được duyệt,
      // và câu hỏi "ai duyệt bản trước" vẫn trả lời được sau khi sửa.
      if (dongY) db.update('hocphi_bieuphi', bp.id, { trangThai: 'nhap' });
    });
    db.audit(req.user.id, dongY ? 'hocphi-bieuphi-mo-khoa' : 'hocphi-bieuphi-tu-choi-mo', bp.id, { yKien });
    res.json(goiBieuPhi(bieuPhiCua(bp.id), req.user));
  });

  // Xác nhận đã nhận tiền — cùng một lý do như trên, và nặng hơn: đây là chỗ
  // biến "nhà này còn nợ" thành "nhà này đã nộp".
  // =========================================================================
  // TÀI KHOẢN NHẬN TIỀN, MÃ QR VÀ CÚ PHÁP CHUYỂN KHOẢN (Đ208, việc 36)
  // =========================================================================
  //
  // ĐĂNG KÝ TRƯỚC NHÓM `/:id/...` LÀ PHÒNG, KHÔNG PHẢI VÁ. Hôm nay không có
  // va chạm thật: các đường `/:id/...` đều bốn đoạn, hai đường dưới đây ba
  // đoạn. Giữ thứ tự này để ngày ai đó thêm một đường `/api/hocphi/:id` ba
  // đoạn thì "tai-khoan" không bị đọc thành một mã khoản thu. Cùng lý do đã
  // ghi ở khối biểu phí (Đ200).
  //
  // CHỐT CHẶT NHẤT PHÂN HỆ NẰM Ở ĐƯỜNG GHI, VÀ ĐÂY LÀ LÝ DO:
  //
  //   Đổi một chữ số trong số tài khoản là đổi chỗ nhận tiền của TOÀN BỘ phụ
  //   huynh, và đổi một cách IM LẶNG — màn hình vẫn dựng một mã QR trông hoàn
  //   toàn bình thường cho số sai. App không nối tới ngân hàng nào nên không
  //   có bước nào kiểm tra hộ. Nhìn từ ngoài, một tài khoản bị đổi trộm không
  //   phân biệt được với một tài khoản đúng.
  //
  // Nên đường ghi hỏi `db.duyetBieuPhiDuoc` (chỉ ban giám hiệu) chứ không hỏi
  // `chiNguoiLoTien` — kế toán soạn được biểu phí nhưng không tự đổi được chỗ
  // tiền chạy về. Cùng vế tách người soạn khỏi người duyệt của Đ200.
  const CU_PHAP_MAC_DINH = '{MA_BE} {TEN_BE} {TEN_KHOAN}';

  function coSoCuaBe(be) {
    return (be && be.classId && db.campusOfClass(be.classId)) || '';
  }

  // Tài khoản áp cho một cơ sở: dòng của chính cơ sở ấy, không có thì lùi về
  // dòng dùng chung cả trường (`campusId` rỗng).
  function taiKhoanCua(campusId) {
    const rieng = campusId ? db.first('hocphi_taikhoan',
      'SELECT * FROM hocphi_taikhoan WHERE campusId = ?', [campusId]) : null;
    if (rieng && rieng.soTaiKhoan) return rieng;
    return db.first('hocphi_taikhoan', "SELECT * FROM hocphi_taikhoan WHERE campusId = ''") || null;
  }

  // ĐỦ ĐỂ DỰNG MÃ QR HAY CHƯA. Thiếu một trong ba thì màn của gia đình KHÔNG
  // hiện mã nào cả và nói rõ là trường chưa khai — chứ không dựng một mã sai.
  function duDeDungQr(tk) {
    return !!(tk && vietqr.hopLeMa(tk.maNganHang) && String(tk.soTaiKhoan || '').trim());
  }

  function thayOTrongCuPhap(mau, { be, khoan, thang }) {
    return String(mau || CU_PHAP_MAC_DINH)
      .replace(/\{MA_BE\}/g, (be && (be.code || be.id)) || '')
      .replace(/\{TEN_BE\}/g, (be && be.name) || '')
      .replace(/\{TEN_KHOAN\}/g, (khoan && khoan.noiDung) || '')
      .replace(/\{THANG\}/g, thang || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  app.get('/api/hocphi/tai-khoan', requireRole('admin'), (req, res) => {
    const pham = db.phamViCoSo(req.user) || '';
    const rows = db.all('hocphi_taikhoan', 'SELECT * FROM hocphi_taikhoan ORDER BY campusId');
    const thay = pham ? rows.filter(r => r.campusId === pham || r.campusId === '') : rows;
    res.json({
      // Danh sách ngân hàng là GỢI Ý cho ô chọn, không phải nguồn sự thật —
      // xem chú thích đầu `lib/vietqr.js`. Trường dùng ngân hàng ngoài danh
      // sách vẫn gõ thẳng mã 6 số được.
      nganHang: vietqr.NGAN_HANG,
      cuPhapMacDinh: CU_PHAP_MAC_DINH,
      doiDuoc: db.duyetBieuPhiDuoc(req.user),
      danhSach: thay.map(r => ({
        ...r,
        daDoiChieu: !!r.daDoiChieu,
        tenTheoMa: vietqr.tenNganHang(r.maNganHang),
        duDeDungQr: duDeDungQr(r),
        nguoiDoiTen: r.nguoiDoi ? ((db.findUser(r.nguoiDoi) || {}).name || '') : '',
      })),
    });
  });

  app.put('/api/hocphi/tai-khoan', requireRole('admin'), (req, res) => {
    if (!db.duyetBieuPhiDuoc(req.user)) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu mới đổi được tài khoản nhận tiền của trường. '
          + 'Đây là chỗ tiền của tất cả các gia đình chạy về, nên app cố ý để một '
          + 'mình khâu kế toán không tự đổi được.',
      });
    }
    const b = req.body || {};
    const campusId = String(b.campusId || '').trim();
    if (campusId && !db.canAccessCampus(req.user, campusId)) {
      return res.status(403).json({ error: 'Cơ sở này không thuộc phạm vi của tài khoản' });
    }
    const maNganHang = String(b.maNganHang || '').trim();
    const soTaiKhoan = String(b.soTaiKhoan || '').trim();
    const chuTaiKhoan = String(b.chuTaiKhoan || '').trim();
    const cuPhap = String(b.cuPhap || '').trim() || CU_PHAP_MAC_DINH;

    if (!vietqr.hopLeMa(maNganHang)) {
      return res.status(400).json({ error: 'Mã ngân hàng phải là 6 chữ số — chọn ngân hàng trong danh sách hoặc gõ mã' });
    }
    if (!/^[0-9A-Za-z]{4,25}$/.test(soTaiKhoan)) {
      return res.status(400).json({ error: 'Số tài khoản chỉ gồm chữ và số, từ 4 đến 25 ký tự' });
    }
    if (!chuTaiKhoan) {
      return res.status(400).json({
        error: 'Xin ghi tên chủ tài khoản. Màn của gia đình in tên này ngay cạnh mã QR '
          + 'để người chuyển tiền đối chiếu trước khi bấm.',
      });
    }
    // BẮT NGƯỜI KHAI XÁC NHẬN ĐÃ ĐỐI CHIẾU. App không kiểm tra được số tài
    // khoản có thật hay không, nên vế duy nhất còn lại là bắt người khai nói
    // rõ mình đã tự đối chiếu với sổ ngân hàng.
    if (!b.daDoiChieu) {
      return res.status(400).json({
        error: 'Xin đối chiếu lại số tài khoản với sổ ngân hàng của trường rồi tích vào ô xác nhận. '
          + 'App không hỏi ngân hàng được, nên gõ nhầm một chữ số là tiền của các gia đình '
          + 'đi sang chỗ khác mà không có gì báo.',
      });
    }

    const luc = new Date().toISOString();
    const dong = {
      campusId, maNganHang,
      tenNganHang: String(b.tenNganHang || '').trim() || vietqr.tenNganHang(maNganHang),
      soTaiKhoan, chuTaiKhoan, cuPhap,
      daDoiChieu: 1, nguoiDoi: req.user.id, doiLuc: luc,
    };
    db.tx(() => {
      db.upsert('hocphi_taikhoan', dong, ['campusId']);
      // GIỮ VẾT, KHÔNG GHI ĐÈ MẤT DẤU: câu "tháng trước tiền chạy vào số nào,
      // ai đặt số đó" phải trả lời được bằng dữ liệu — đúng lúc cần nhất là
      // lúc có nhà báo đã chuyển mà trường bảo chưa nhận.
      db.insert('hocphi_taikhoan_su', {
        id: db.nextId('hptk'), campusId, maNganHang, tenNganHang: dong.tenNganHang,
        soTaiKhoan, chuTaiKhoan, cuPhap, nguoiDoi: req.user.id, doiLuc: luc,
      });
    });
    // Nhật ký CỐ Ý không chép đủ số tài khoản — bốn số cuối là đủ để đối chiếu.
    db.audit(req.user.id, 'hocphi-doi-tai-khoan', campusId || 'toan-truong', {
      maNganHang, bonSoCuoi: soTaiKhoan.slice(-4), chuTaiKhoan,
    });
    res.json({ ok: true, ...dong, daDoiChieu: true, tenTheoMa: vietqr.tenNganHang(maNganHang) });
  });

  // Gia đình: cách chuyển khoản cho MỘT khoản thu của con mình.
  app.get('/api/hocphi/chuyen-khoan', async (req, res) => {
    const khoanId = String(req.query.khoanId || '').trim();
    if (!khoanId) return res.status(400).json({ error: 'Thiếu mã khoản thu' });
    const k = db.first('hocphi_khoan', 'SELECT * FROM hocphi_khoan WHERE id = ?', [khoanId]);
    if (!k) return res.status(404).json({ error: 'Không tìm thấy khoản thu' });
    if (!db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem khoản thu này' });
    }
    const be = db.findStudent(k.studentId);
    const tk = taiKhoanCua(coSoCuaBe(be));

    // CHƯA KHAI THÌ NÓI THẲNG LÀ CHƯA KHAI. Dựng một mã QR từ dữ liệu thiếu là
    // mời gia đình quét vào chỗ không có thật.
    if (!duDeDungQr(tk)) {
      return res.json({
        coTaiKhoan: false,
        loiNhan: 'Nhà trường chưa khai số tài khoản nhận tiền trên app. '
          + 'Xin gia đình hỏi văn phòng giúp nhé.',
      });
    }

    const cuPhap = thayOTrongCuPhap(tk.cuPhap, {
      be, khoan: k, thang: String(k.hanNop || '').slice(0, 7),
    });
    const ra = {
      coTaiKhoan: true,
      tenNganHang: tk.tenNganHang || vietqr.tenNganHang(tk.maNganHang),
      soTaiKhoan: tk.soTaiKhoan,
      chuTaiKhoan: tk.chuTaiKhoan,
      soTien: k.soTien,
      // Chuỗi ĐÃ BỎ DẤU, đúng thứ sẽ nằm trong mã QR — để gia đình gõ tay cũng
      // ra đúng chuỗi ấy, chứ không phải một bản có dấu rồi ngân hàng cắt khác đi.
      cuPhap: vietqr.boDauASCII(cuPhap),
      qrSvg: null,
    };
    try {
      const chuoi = vietqr.payload({
        maNganHang: tk.maNganHang, soTaiKhoan: tk.soTaiKhoan,
        soTien: k.daNop ? 0 : k.soTien, noiDung: ra.cuPhap,
      });
      ra.qrSvg = await qrcode.toString(chuoi, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    } catch (_) {
      // MÃ QR LÀ PHẦN TIỆN, KHÔNG PHẢI PHẦN CHÍNH. Dựng hỏng thì vẫn trả số
      // tài khoản và cú pháp bằng chữ — gia đình vẫn chuyển khoản được tay.
      ra.qrSvg = null;
    }
    res.json(ra);
  });

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

  // ===========================================================================
  // NHẮC HẠN NỘP CHO NGƯỜI LO TIỀN (Đ199, việc 37)
  // ===========================================================================
  //
  // Nhà trường xin kế toán nhận tin nhắc hạn. Hôm nay `hanNop` được ghi vào
  // khoản thu rồi nằm đó — không đường nào trong app đọc nó ra để nhắc ai,
  // nên nó là một cột chỉ để nhìn.
  //
  // GỬI CHO NGƯỜI LO TIỀN, KHÔNG GỬI CHO GIA ĐÌNH. Đây là bản nhắc nội bộ để
  // kế toán còn gọi điện hay nhắn riêng; bắn thẳng "nhà bạn sắp tới hạn nộp
  // tiền" về điện thoại của phụ huynh là một quyết định khác hẳn, về quan hệ
  // giữa trường và gia đình, và nó phải do nhà trường chốt chứ không phải do
  // tôi chọn thay. Đã ghi lại để hỏi.
  //
  // KHÔNG NÊU SỐ TIỀN TRONG TIN ĐẨY. Tin hiện trên màn hình khoá điện thoại,
  // nơi người đi qua cũng đọc được; số tiền một nhà đang nợ là chuyện riêng
  // của nhà ấy. Cùng lối đã ghi ở `quetHanUuDai` cho tên ưu đãi.
  function daNhacKhoan(id) {
    try {
      return !!db.first('hocphi_khoan_nhac',
        'SELECT khoanId FROM hocphi_khoan_nhac WHERE khoanId = ?', [id]);
    } catch (_) { return true; }   // bảng hỏng thì THÔI nhắc, không nhắc loạn
  }

  function quetHanNop() {
    if (!phanHeDangBat()) return;
    const homNay = ngay.homNay();
    const moc = congNgay(homNay, HAN_NHAC_TRUOC_NGAY);
    if (!moc) return;
    let ds = [];
    try {
      ds = db.all('hocphi_khoan',
        `SELECT * FROM hocphi_khoan
          WHERE hanNop IS NOT NULL AND hanNop >= ? AND hanNop <= ?
            AND daNop = 0
            AND id NOT IN (SELECT khoanId FROM hocphi_thuhoi)
            AND id NOT IN (SELECT khoanId FROM hocphi_khoan_nhac)
          LIMIT 200`, [homNay, moc]);
    } catch (err) {
      console.error(`[hocphi] không quét được hạn nộp: ${err.message}`);
      return;
    }
    for (const k of ds) {
      try {
        const be = db.findStudent(k.studentId);
        if (!be) continue;
        // Bé đã nghỉ học thì thôi nhắc — cùng lý do đã ghi ở `quetHanUuDai`.
        if (be.active === false || be.active === 0) continue;
        baoNhaTruong.guiChoNguoiLoTienCuaBe(k.studentId, {
          tieuDe: 'Có khoản thu sắp tới hạn',
          noiDung: `Một khoản của bé ${be.name} tới hạn ngày ${k.hanNop}. `
            + 'Xin mở mục Học phí để xem và nhắc gia đình giúp.',
          hash: '#/hocphi',
        });
        db.upsert('hocphi_khoan_nhac',
          { khoanId: k.id, luc: new Date().toISOString() }, ['khoanId']);
      } catch (err) {
        console.error(`[hocphi] không nhắc được hạn nộp ${k.id}: ${err.message}`);
      }
    }
  }
  henGio.dangKy('hocphi:han-nop', quetHanNop);

  // Đường gọi tay, để bài canh và nhà trường chạy được bộ quét mà không phải
  // chờ tới giờ hẹn. Cùng lối đã có cho các bộ quét khác của kho mã.
  app.post('/api/hocphi/quet-han-nop', requireRole('admin'), (req, res) => {
    if (!db.taoKhoanThuDuoc(req.user)) {
      return res.status(403).json({ error: 'Chỉ kế toán và ban giám hiệu chạy được việc này' });
    }
    quetHanNop();
    res.json({ ok: true });
  });

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

    const homNay = ngay.homNay();
    const tran = congNgay(homNay, HAN_NHAC_TRUOC_NGAY);
    // CÓ CẬN DƯỚI. Bản đầu chỉ có trần, nên mọi ưu đãi đã hết hạn từ bao giờ
    // vẫn được đếm mãi: cuối năm học 80 ưu đãi cùng hết hạn là sang tháng 6 ô
    // Học phí hiện một con số đỏ không bao giờ về 0, và một con số như vậy
    // thì người ta thôi nhìn nó. Chỉ đếm việc CÒN LÀM ĐƯỢC: sắp hết hạn, và
    // vừa quá hạn trong vòng một tháng.
    const san = congNgay(homNay, -30);
    if (!tran || !san) return 0;

    // ĐẾM BẰNG MỘT CÂU HỎI, KHÔNG NẠP CẢ TRƯỜNG VÀO BỘ NHỚ.
    //
    // Bản đầu gọi `db.studentsOf(user)` — nạp trọn hồ sơ mọi bé trong phạm vi
    // (mấy trăm dòng, kèm một câu tra phụ huynh), rồi mới hỏi một câu đếm theo
    // lô 400 mã. Hàm này chạy ở MỖI lần mở trang chủ, của MỖI tài khoản quản
    // trị, để trả về một con số gần như luôn bằng 0. Cái giá đi theo sĩ số
    // toàn trường chứ không theo số việc đang chờ.
    //
    // Phạm vi giữ NGUYÊN nghĩa cũ: khuôn `JOIN class_campus` dưới đây chính là
    // nhánh quản trị của `db.canAccessStudent` — Cấp 1 thấy toàn hệ thống (kể
    // cả bé chưa xếp nhóm), Cấp 3 chỉ thấy bé thuộc một nhóm của cơ sở mình.
    const coSo = db.phamViCoSo(user);
    const dieu = `u.denNgay IS NOT NULL AND u.denNgay <= ? AND u.denNgay >= ?
        AND u.id NOT IN (SELECT uuDaiId FROM hocphi_uudai_go)`;
    const r = coSo
      ? db.first('hocphi_uudai',
        `SELECT COUNT(*) AS n FROM hocphi_uudai u
           JOIN students s ON s.id = u.studentId AND s.active = 1
           JOIN class_campus cc ON cc.classId = s.classId
          WHERE cc.campusId = ? AND ${dieu}`, [coSo, tran, san])
      : db.first('hocphi_uudai',
        `SELECT COUNT(*) AS n FROM hocphi_uudai u
           JOIN students s ON s.id = u.studentId AND s.active = 1
          WHERE ${dieu}`, [tran, san]);
    return Number((r || {}).n || 0);
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
