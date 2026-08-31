// CAMBRIDGE & KẾT NỐI Ở NHÀ — văn phòng đăng, gia đình đọc.
//
// PHÂN HỆ NÀY CHỦ YẾU LÀ MỘT BÀI TOÁN PHẠM VI
//
// Nội dung thì đơn giản: một tiêu đề, một khối chữ, vài tấm ảnh. Chỗ khó là
// AI ĐỌC ĐƯỢC BÀI NÀO — và sai ở đó có hai kiểu, cả hai đều tệ:
//
//   GỬI THIẾU: gia đình nhóm Lá 1 không thấy tờ Home Connection của chính
//   nhóm mình. Họ không biết mình đang thiếu, nên không ai báo, và văn phòng
//   tưởng đã gửi rồi.
//
//   GỬI THỪA: tờ của nhóm Lá 1 hiện cho gia đình nhóm nhà trẻ. Nhìn thì vô
//   hại, nhưng đó là thư rác — và thư rác làm gia đình ngừng đọc MỌI THỨ
//   khác, kể cả thông báo thật sự quan trọng.
//
// Nên phạm vi lọc ở TẦNG DỮ LIỆU, có một hàm duy nhất quyết định, và có bài
// test đi đủ ba mức phạm vi nhân ba loại người đọc.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const uploads = require('../../lib/uploads');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOAI = ['cambridge', 'ket-noi'];
const PHAM_VI = ['truong', 'coso', 'nhom'];

const TOI_DA_TIEU_DE = 200;
const TOI_DA_NOI_DUNG = 8000;
const TOI_DA_ANH = 6;
const GIOI_HAN = 60;
// Trần cho lượt hỏi tự đặt số — không để một lượt gọi kéo cả kho về.
const TRANG_TOI_DA = 200;

function homNay() {
  return ngay.homNay();
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

function thuHaiCua(ngay) {
  const t = Date.parse(`${ngay}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  const lui = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - lui * 86400000).toISOString().slice(0, 10);
}

// Danh sách ảnh lưu phẳng: mỗi dòng một tên tệp.
function tachAnh(s) {
  return String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
}

module.exports = (app, { db }) => {
  // =========================================================================
  // MỘT HÀM DUY NHẤT QUYẾT ĐỊNH AI ĐỌC ĐƯỢC BÀI NÀO
  // =========================================================================
  //
  // Quản trị đi theo tầng cơ sở như mọi chỗ khác. Cô và gia đình đi theo NHÓM
  // của mình — và với gia đình, "nhóm của mình" nghĩa là nhóm của bất kỳ đứa
  // con nào, vì một nhà có thể có hai bé ở hai nhóm.
  function xemDuoc(bai, user) {
    if (!bai || !user) return false;
    // Nháp chỉ người đăng và quản trị thấy.
    if (!bai.congBoLuc && user.role !== 'admin') return false;

    if (user.role === 'admin') {
      const pham = db.phamViCoSo(user);
      if (pham === null) return true;                     // Cấp 1 — toàn hệ thống
      if (bai.phamVi === 'truong') return true;
      if (bai.phamVi === 'coso') return bai.campusId === pham;
      return db.classIdsOfCampus(pham).includes(bai.classId);
    }

    if (bai.phamVi === 'truong') return true;
    const nhomCuaToi = db.classIdsOf(user);
    if (bai.phamVi === 'nhom') return nhomCuaToi.includes(bai.classId);
    // Phạm vi CƠ SỞ: đúng khi một trong những nhóm của mình thuộc cơ sở đó.
    return nhomCuaToi.some(cid => db.campusOfClass(cid) === bai.campusId);
  }

  // =========================================================================
  // ẢNH CỦA BÀI CŨNG PHẢI ĐI QUA LUẬT ẢNH NHÓM
  // =========================================================================
  //
  // BẢN ĐẦU CỦA PHÂN HỆ NÀY QUÊN HẲN LUẬT ẢNH NHÓM, VÀ ĐÓ LÀ MỘT LỖ THẬT.
  //
  // `xemDuoc` trả lời câu "người này có đọc được BÀI này không" — theo phạm vi
  // trường / cơ sở / nhóm. Nó không nói gì về ẢNH. Nhưng CLAUDE.md có một dòng
  // riêng cho ảnh: "một ảnh chỉ hiện cho gia đình khác khi MỌI bé trong ảnh
  // đều có đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện."
  //
  // Một tờ Home Connection của nhóm Chồi 2 gần như chắc chắn có ảnh các bé
  // Chồi 2 đang làm việc. Nếu chỉ hỏi phạm vi thì tấm ảnh đó tới mọi gia đình
  // trong nhóm — kể cả gia đình mà một nhà khác đã nói KHÔNG.
  //
  // VÌ SAO KHÔNG GẮN THẺ BÉ NHƯ ALBUM
  //
  // Album có bảng `photo_students` và có màn cho cô gắn thẻ. Ảnh Cambridge thì
  // không, và thêm cả cơ chế gắn thẻ vào đây là một hạng mục riêng. Nên ảnh
  // Cambridge rơi đúng vào NHÁNH 3 của `db.locAnhChoNguoiXem`: ảnh CHƯA GẮN
  // THẺ — app không biết trong đó có ai.
  //
  // Luật của nhánh đó, chép nguyên sang đây: chưa ai trong phạm vi từ chối thì
  // ảnh hiện như thường (đây là chỗ Nguyên tắc số 1 được giữ — trường chưa thu
  // giấy đồng ý thì không mất tấm ảnh nào); chỉ cần MỘT gia đình nói không là
  // ảnh của bài tạm ẩn với TẤT CẢ gia đình trong phạm vi ấy.
  //
  // ĐƯỜNG RA PHẢI CÓ THẬT, NẾU KHÔNG LUẬT NÀY GIẾT CHÍNH TÍNH NĂNG
  //
  // Bản đầu của bản vá này dừng ở đó: trong phạm vi có nhà nói không thì ẩn
  // ảnh. Chạy thử trên dữ liệu mẫu — một trường bình thường, một nhà trong hai
  // mươi nhà nói không — thì MỌI ảnh Cambridge biến mất vĩnh viễn, và không có
  // cách nào lấy lại. Đó không phải "tạm ẩn", đó là gỡ bỏ tính năng.
  //
  // Album không rơi vào cái bẫy đó vì nó có ĐƯỜNG RA: cô gắn thẻ bé, ảnh hiện
  // lại. Ở đây đường ra là một câu hỏi cho cả bài — ẢNH NÀY CÓ MẶT BÉ KHÔNG.
  // Người vừa tải ảnh lên chính là người biết câu trả lời, và giáo cụ, sách,
  // tranh chủ điểm thì chiếm phần lớn ảnh của một tờ Home Connection.
  //
  // MẶC ĐỊNH LÀ "CÓ MẶT BÉ", tức phía đóng. Quên tích ô thì quên theo hướng
  // giữ ảnh lại, không phải hướng thả ảnh ra — cùng một luật với danh sách cho
  // phép của tầng chức vụ.
  //
  // Cô và văn phòng vẫn thấy hết — họ là người đăng, người chịu trách nhiệm,
  // và giấu ảnh khỏi họ thì không ai sửa được bài. Màn của họ nhận thêm một
  // dòng nói rõ ảnh đang tạm ẩn và vì sao.
  function anhCoMatBe(baiId) {
    const r = baiId
      ? db.first('cambridge_anh_be', 'SELECT coMatBe FROM cambridge_anh_be WHERE baiId = ?', [baiId])
      : null;
    return r ? !!r.coMatBe : true;   // không có dòng nào = coi như CÓ mặt bé
  }

  function ghiAnhCoMatBe(baiId, coMatBe) {
    db.run(`INSERT INTO cambridge_anh_be (baiId, coMatBe, ghiLuc) VALUES (?, ?, ?)
            ON CONFLICT(baiId) DO UPDATE SET coMatBe = excluded.coMatBe, ghiLuc = excluded.ghiLuc`,
    [baiId, coMatBe ? 1 : 0, new Date().toISOString()]);
  }

  function nhomTrongPhamVi(bai) {
    if (!bai) return [];
    if (bai.phamVi === 'nhom') return bai.classId ? [bai.classId] : [];
    if (bai.phamVi === 'coso') return bai.campusId ? db.classIdsOfCampus(bai.campusId) : [];
    return db.classes().map(c => c.id);
  }

  function anhHienVoiGiaDinh(bai) {
    if (!anhCoMatBe(bai.id)) return true;      // văn phòng đã nói: trong ảnh không có bé nào
    // Bản TỪNG HỌC, không phải bản chỉ nhìn nhóm hiện tại. Tờ Home Connection
    // của năm ngoái vẫn còn trên màn hình gia đình, nên lời từ chối cũng phải
    // còn hiệu lực ở đó — xem chú thích dài ở `coBeTuChoiChiaSeTungHoc`.
    return !nhomTrongPhamVi(bai).some(cid => db.coBeTuChoiChiaSeTungHoc(cid));
  }

  // MARKETING MANG ẢNH RA NGOÀI TRƯỜNG, NÊN LUẬT CỦA HỌ CHẶT HƠN LUẬT ẢNH NHÓM.
  //
  // Mô tả chức vụ Marketing hứa thẳng với nhà trường: "Chỉ thấy ảnh mà MỌI bé
  // trong ảnh đều có đồng ý truyền thông." `routes/albums.js` giữ đúng lời hứa
  // đó bằng `db.locAnhChoTruyenThong`. Phân hệ này thì KHÔNG: chốt duy nhất ở
  // đây hỏi `role === 'parent'`, mà Marketing là `role === 'admin'` nên đi
  // thẳng qua — cả đường liệt kê lẫn đường trả byte của ảnh.
  //
  // Ảnh Cambridge KHÔNG có bảng gắn thẻ từng bé, nên không bao giờ đối chiếu
  // được "mọi bé trong ảnh đã tích ô ③ chưa". Không biết thì KHÔNG cho — đúng
  // tinh thần "không gắn ai thì không dùng được" của `locAnhChoTruyenThong`.
  // Và ô ③ MẶC ĐỊNH KHÔNG TÍCH, nên mọi bé chưa thu giấy đều thuộc diện chưa
  // cho phép.
  //
  // Đường ra đã có sẵn, không phải dựng thêm gì: ô "Ảnh không có mặt bé nào".
  // Văn phòng tích thì trong ảnh không có bé nào, đồng ý truyền thông không còn
  // là câu hỏi, Marketing dùng được ngay. Tính năng không chết.
  function anhHienVoiTruyenThong(bai) {
    return !anhCoMatBe(bai.id);
  }

  function laTruyenThong(user) {
    return !!user && user.role === 'admin' && db.chucVu(user) === 'marketing';
  }

  const LOI_TRUYEN_THONG = 'Ảnh của bài này chưa dùng cho truyền thông được: bài đang '
    + 'được đánh dấu là ảnh CÓ mặt bé, mà ảnh Cambridge không ghi được từng bé nên không '
    + 'đối chiếu được đồng ý truyền thông của từng nhà. Nếu ảnh chỉ là giáo cụ, sách hay '
    + 'tranh chủ điểm thì nhờ văn phòng tích ô "Ảnh không có mặt bé nào".';

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  function keml(bai, user) {
    const anh = tachAnh(bai.anh);
    const an = !!anh.length && !anhHienVoiGiaDinh(bai);
    const laGiaDinh = !!user && user.role === 'parent';
    const laMkt = laTruyenThong(user);
    const anMkt = !!anh.length && laMkt && !anhHienVoiTruyenThong(bai);
    const coBe = anhCoMatBe(bai.id);
    return {
      ...bai,
      // LỌC Ở TẦNG DỮ LIỆU. Gia đình không nhận về tên tệp của ảnh bị ẩn —
      // không phải nhận rồi giao diện che bớt, vì tên tệp là thứ tải được.
      anh: ((an && laGiaDinh) || anMkt) ? [] : anh,
      daCongBo: !!bai.congBoLuc,
      nguoiDangTen: tenNguoi(bai.nguoiDang),
      tenNhom: bai.classId ? ((db.findClass(bai.classId) || {}).name || '') : '',
      tenCoSo: bai.campusId ? ((db.findCampus(bai.campusId) || {}).name || '') : '',
      // Trạng thái ô tích, chỉ gửi cho người đăng được — gia đình không cần và
      // không nên biết bài nào đang được đánh dấu là có mặt bé.
      ...(laGiaDinh ? {} : { anhCoMatBe: coBe }),
      // Nói cho người đăng biết ảnh đang tạm ẩn, và nói cách làm nó hiện lại.
      // Ẩn mà không giải thích là chỗ cô mất lòng tin vào app nhanh nhất.
      // Marketing được nói lý do RIÊNG của họ. Đưa họ câu dành cho cô thì họ đi
      // hỏi gia đình một chuyện không liên quan tới việc họ đang làm.
      ...(anMkt ? { nhacAnhTamAn: LOI_TRUYEN_THONG } : {}),
      ...(an && !laGiaDinh && !laMkt ? {
        nhacAnhTamAn: `${anh.length} ảnh của bài này đang tạm ẩn với gia đình. `
          + 'Trong phạm vi bài có gia đình chưa đồng ý cho ảnh của con hiện với các nhà khác, '
          + 'mà bài này đang được đánh dấu là ảnh CÓ mặt bé. '
          + 'Nếu ảnh chỉ là giáo cụ, sách hay tranh chủ điểm thì sửa bài và tích ô '
          + '"Ảnh không có mặt bé nào" — ảnh sẽ hiện lại ngay.',
      } : {}),
    };
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================
  app.get('/api/cambridge', (req, res) => {
    const loai = LOAI.includes(String(req.query.loai || '')) ? req.query.loai : '';

    // CẮT CỬA SỔ SAU KHI LỌC QUYỀN, KHÔNG PHẢI TRONG CÂU TRUY VẤN.
    //
    // Câu cũ lấy `GIOI_HAN * 2` dòng MỚI NHẤT CỦA CẢ TRƯỜNG rồi mới lọc còn
    // phần người này được xem. Bộ lọc ấy (`xemDuoc`) chạy trong JavaScript và
    // nó rất chặt: gia đình chỉ thấy bài phạm vi trường, bài của nhóm con
    // mình, hoặc bài của cơ sở con mình. Nên cửa sổ THẬT của một gia đình là
    // 120 chia cho số nhóm đang mở — thêm một cơ sở là cửa sổ của MỌI gia đình
    // ngắn lại, mà nháp chưa công bố cũng chiếm chỗ trong 120 dòng đó.
    //
    // Hỏng theo lịch chứ không hỏng ngay: năm đầu ít nhóm thì không ai nhận
    // ra, và tới lúc nhận ra thì nhà trường đã tin vào tính năng. Gia đình kéo
    // xuống thấy vài tờ rồi hết, không lỗi, không dòng nhắc.
    //
    // Cùng cách chữa với Album (Đ98b): câu SQL là MỘT câu trên một bảng có chỉ
    // mục, phần đắt nằm ở lọc và ở ảnh phía sau. Cắt SAU khi lọc thì số dòng
    // trả về đúng bằng số dòng người này xem được, nên màn hình suy ra "còn
    // nữa hay hết" chỉ bằng cách đếm.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || GIOI_HAN)));

    const rows = db.all('cambridge_bai',
      `SELECT * FROM cambridge_bai ${loai ? 'WHERE loai = ?' : ''}
       ORDER BY COALESCE(NULLIF(tuan, ''), substr(taoLuc, 1, 10)) DESC, taoLuc DESC`,
      loai ? [loai] : []);

    const bai = rows.filter(b => xemDuoc(b, req.user))
      .slice(bo, bo + soLuong)
      .map(b => keml(b, req.user));
    res.json({
      bai,
      loai: [
        { ma: 'cambridge', ten: 'Cambridge' },
        { ma: 'ket-noi', ten: 'Kết nối ở nhà' },
      ],
      duocDang: req.user.role === 'admin',
      // Danh mục để văn phòng dựng ô chọn phạm vi. Chỉ gửi cho người đăng
      // được — danh sách nhóm và cơ sở của cả trường không việc gì phải đi ra
      // màn hình của gia đình.
      ...(req.user.role === 'admin' ? {
        nhom: db.classIdsOf(req.user).map(id => db.findClass(id)).filter(Boolean)
          .map(c => ({ id: c.id, name: c.name })),
        coSo: db.campuses().map(c => ({ id: c.id, name: c.name })),
      } : {}),
    });
  });

  // Ảnh của một bài. ĐI QUA CANH QUYỀN, không phục vụ tĩnh: một tờ Home
  // Connection của nhóm có thể có ảnh các bé đang làm việc.
  app.get('/api/cambridge/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    // Nối chuỗi thay vì nhúng biến vào chuỗi mẫu.
    //
    // Ký tự đại diện của SQL đứng ngay sau một biến nhúng sẽ trùng với dấu
    // hiệu "phần trăm được tính rồi in ra màn hình" mà bộ canh QUY TẮC 4 đi
    // tìm. Ở đây nó không phải phần trăm nào cả — nhưng viết cách khác thì rẻ
    // hơn nhiều so với mở một ngoại lệ cho cả tệp, mà ngoại lệ mở cả tệp thì
    // che luôn những vi phạm thật sau này.
    const mau = '%' + file + '%';
    const chu = db.all('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE anh LIKE ?', [mau])
      .find(b => tachAnh(b.anh).includes(file));
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!xemDuoc(chu, req.user)) return res.status(403).json({ error: 'Không có quyền xem ảnh này' });

    // ĐÂY MỚI LÀ CHỐT CHẶN THẬT CỦA LUẬT ẢNH NHÓM Ở PHÂN HỆ NÀY.
    //
    // Đường này trả về đúng các byte của tấm ảnh. Lọc ở đường liệt kê chỉ làm
    // ảnh không hiện trên màn hình; ai biết tên tệp vẫn tải được thẳng qua đây,
    // mà tên tệp thì không bí mật — nó nằm trong gói JSON gia đình đó đã nhận ở
    // lần xem trước, TRƯỚC khi nhà kia rút đồng ý. Kiểm đồng ý phải đứng TRƯỚC
    // phép kiểm tệp có tồn tại: hỏi ngược thứ tự thì câu "không tìm thấy ảnh"
    // vô tình xác nhận rằng người hỏi đáng lẽ được xem, chỉ là tệp đã mất.
    if (req.user.role === 'parent' && !anhHienVoiGiaDinh(chu)) {
      return res.status(403).json({
        error: 'Ảnh này chưa hiện với gia đình: trong nhóm có bé mà gia đình chưa đồng ý chia sẻ ảnh',
      });
    }
    // Và chốt tương ứng cho Marketing. Cắt ở đường liệt kê là chưa đủ: tên tệp
    // nằm trong gói JSON họ đã nhận ở lần xem trước.
    if (laTruyenThong(req.user) && !anhHienVoiTruyenThong(chu)) {
      return res.status(403).json({ error: LOI_TRUYEN_THONG });
    }
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // =========================================================================
  // ĐĂNG — VIỆC CỦA VĂN PHÒNG
  // =========================================================================
  //
  // Nhà trường nói rõ "văn phòng đăng lên, phụ huynh đọc". Cô không đăng: nội
  // dung Cambridge là chương trình của cả trường, và một tờ gửi nhầm nhóm thì
  // không rút lại được khỏi điện thoại đã đọc.
  //
  // `requireRole` để rộng tới 'teacher' một cách CÓ CHỦ Ý: nếu chặn ngay ở đó
  // thì cô nhận câu "Không có quyền thực hiện" cụt lủn. Hàm này chặn thật, và
  // nói được một câu có ích — kèm chỉ đường sang phần thuộc về cô.
  function chanNeuKhongPhaiVanPhong(req, res) {
    if (req.user.role === 'admin') return false;
    res.status(403).json({
      error: 'Nội dung Cambridge và Kết nối ở nhà do văn phòng đăng. '
        + 'Cô có mục "Cùng con ở nhà" theo tuần ở phân hệ Hành trình học tập.',
    });
    return true;
  }

  function lamSach(req, b, cu) {
    const tieuDe = chuoi(b.tieuDe !== undefined ? b.tieuDe : (cu || {}).tieuDe, TOI_DA_TIEU_DE);
    if (!tieuDe) return { loi: 'Cần một tiêu đề cho bài đăng' };

    const loai = chuoi(b.loai !== undefined ? b.loai : (cu || {}).loai, 20) || 'cambridge';
    if (!LOAI.includes(loai)) return { loi: 'Loại bài đăng không hợp lệ' };

    const phamVi = chuoi(b.phamVi !== undefined ? b.phamVi : (cu || {}).phamVi, 20) || 'truong';
    if (!PHAM_VI.includes(phamVi)) return { loi: 'Phạm vi gửi không hợp lệ' };

    let campusId = '';
    let classId = '';
    if (phamVi === 'coso') {
      campusId = chuoi(b.campusId !== undefined ? b.campusId : (cu || {}).campusId, 40);
      if (!db.findCampus(campusId)) return { loi: 'Chưa chọn cơ sở, hoặc cơ sở không tồn tại' };
      if (!db.canAccessCampus(req.user, campusId)) return { loi: 'Không có quyền đăng cho cơ sở này' };
    }
    if (phamVi === 'nhom') {
      classId = chuoi(b.classId !== undefined ? b.classId : (cu || {}).classId, 40);
      if (!db.findClass(classId)) return { loi: 'Chưa chọn nhóm, hoặc nhóm không tồn tại' };
      if (!db.canAccessClass(req.user, classId)) return { loi: 'Không có quyền đăng cho nhóm này' };
    }
    // GỬI CẢ TRƯỜNG THÌ PHẢI LÀ NGƯỜI CỦA CẢ TRƯỜNG.
    //
    // Quản lý một cơ sở gửi được cho cơ sở mình và các nhóm của mình, nhưng
    // không gửi được cho hai cơ sở kia — cùng luật với thực đơn ở N15.
    if (phamVi === 'truong' && db.phamViCoSo(req.user) !== null) {
      return {
        loi: 'Gửi cho cả trường thì cần tài khoản quản trị toàn hệ thống. '
          + 'Quản lý cơ sở gửi được cho cơ sở mình hoặc cho một nhóm.',
      };
    }

    const tuanRaw = chuoi(b.tuan !== undefined ? b.tuan : (cu || {}).tuan, 10);
    const tuan = tuanRaw ? (NGAY_RE.test(tuanRaw) ? thuHaiCua(tuanRaw) : null) : '';
    if (tuan === null) return { loi: 'Tuần chưa đúng dạng, ví dụ đúng: 2026-09-07' };

    return {
      loai, tieuDe, phamVi, campusId, classId, tuan,
      noiDung: chuoi(b.noiDung !== undefined ? b.noiDung : (cu || {}).noiDung, TOI_DA_NOI_DUNG),
    };
  }

  // Nhận danh sách ảnh dạng data URL, trả { anh } hoặc { loi }.
  function nhanAnh(ds) {
    if (!Array.isArray(ds)) return { anh: null };
    if (ds.length > TOI_DA_ANH) return { loi: `Mỗi bài tối đa ${TOI_DA_ANH} ảnh` };
    const ten = [];
    for (const a of ds) {
      if (!a) continue;
      try { ten.push(uploads.saveDataUrl(a).file); }
      catch (err) { return { loi: err.message || 'Ảnh không hợp lệ' }; }
    }
    return { anh: ten.join('\n') };
  }

  // Đọc ô tích từ thân yêu cầu. KHÔNG GỬI = KHÔNG ĐỤNG TỚI, cùng luật với
  // `luuHoSoBe`: màn hình cũ còn trong bộ nhớ đệm điện thoại không gửi trường
  // này, và nó không được vô tình biến một bài đã đánh dấu thành chưa đánh dấu.
  function ghiCoTich(baiId, b) {
    if (!b || b.anhCoMatBe === undefined) return;
    ghiAnhCoMatBe(baiId, !!b.anhCoMatBe);
  }

  app.post('/api/cambridge', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const s = lamSach(req, req.body || {}, null);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('cam'), ...s, anh: a.anh || '',
      congBoLuc: null, nguoiDang: req.user.id, taoLuc: luc, capNhatLuc: luc,
    };
    db.insert('cambridge_bai', rec);
    ghiCoTich(rec.id, req.body || {});
    db.audit(req.user.id, 'cambridge-tao', rec.id, { loai: rec.loai, phamVi: rec.phamVi });
    res.status(201).json(keml(rec, req.user));
  });

  app.put('/api/cambridge/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const cu = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(cu, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });

    const s = lamSach(req, req.body || {}, cu);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const patch = { ...s, capNhatLuc: new Date().toISOString() };
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });
    if (a.anh !== null) {
      // Ảnh cũ không còn ai trỏ tới thì bỏ tệp đi.
      const giu = new Set(tachAnh(a.anh));
      for (const f of tachAnh(cu.anh)) {
        if (!giu.has(f)) { try { uploads.remove(f); } catch (_) { /* tệp đã mất thì thôi */ } }
      }
      patch.anh = a.anh;
    }

    db.update('cambridge_bai', cu.id, patch);
    db.audit(req.user.id, 'cambridge-sua', cu.id, { phamVi: patch.phamVi });
    ghiCoTich(cu.id, req.body || {});
    res.json(keml(db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [cu.id]), req.user));
  });

  // Công bố là một BƯỚC RIÊNG, không phải hệ quả của việc bấm Lưu.
  app.post('/api/cambridge/:id/cong-bo', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (b.congBoLuc) return res.status(400).json({ error: 'Bài này đã công bố rồi' });
    if (!chuoi(b.noiDung, 10) && !tachAnh(b.anh).length) {
      return res.status(400).json({ error: 'Bài chưa có nội dung hay ảnh nào để gửi tới gia đình' });
    }
    const luc = new Date().toISOString();
    db.update('cambridge_bai', b.id, { congBoLuc: luc, capNhatLuc: luc });
    db.audit(req.user.id, 'cambridge-cong-bo', b.id, { phamVi: b.phamVi });
    res.json({ ok: true, id: b.id, daCongBo: true, congBoLuc: luc });
  });

  // Thu hồi: gỡ khỏi màn hình gia đình, KHÔNG xoá chữ đã viết.
  app.post('/api/cambridge/:id/thu-hoi', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (!b.congBoLuc) return res.status(400).json({ error: 'Bài này chưa công bố' });
    db.update('cambridge_bai', b.id, { congBoLuc: null, capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'cambridge-thu-hoi', b.id, {});
    res.json({ ok: true, id: b.id, daCongBo: false });
  });

  void homNay;
};
