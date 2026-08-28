// HÀNH TRÌNH HỌC TẬP — phần làm app này khác một phần mềm quản lý học sinh.
//
// Phân hệ này hiện thực bốn trong năm QUY TẮC giáo dục của CLAUDE.md, và mỗi
// quy tắc để lại dấu vết cụ thể trong mã dưới đây:
//
//   QUY TẮC 1 (quan sát khác đánh giá). Cô ghi được một quan sát mà KHÔNG gắn
//   lĩnh vực, KHÔNG chọn trạng thái. Đó là bản ghi hoàn chỉnh, không phải bản
//   ghi dở. Gắn lĩnh vực là một bước RIÊNG, làm sau, có thể không làm.
//
//   QUY TẮC 2 (chưa quan sát thấy khác không làm được). Máy chủ không bao giờ
//   đếm số quan sát của một bé rồi trả về như một con số thiếu hụt, không xếp
//   các bé theo số quan sát, và không có chỉ tiêu số quan sát nào.
//
//   QUY TẮC 4 (xem CLAUDE.md). Năm trạng thái lưu bằng NHÃN CHỮ, không phải số
//   1-5. Không có đường nào cộng dồn hay quy trạng thái ra con số, và không màn
//   hình nào đặt các bé cạnh nhau theo một con số.
//
//   QUY TẮC 5 (đánh giá phải dẫn tới hành động). Chọn một trong ba trạng thái
//   ĐÃ QUAN SÁT THẤY thì phải ghi "ở lớp cô làm gì tiếp"; công bố câu chuyện
//   cho gia đình thì phải có "cùng con ở nhà".
//
// QUY TẮC 3 (AI gợi ý khác cô quyết định) chưa có đất ở đây vì phân hệ này
// chưa gọi AI. Điều kiện bật AI nằm ở docs/KE-HOACH.md mục 6.
const { requireRole } = require('../../lib/auth');
const uploads = require('../../lib/uploads');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// NĂM TRẠNG THÁI ĐÁNH GIÁ — tên tiếng Việt lấy từ docs/KE-HOACH.md.
//
// Bản kế hoạch ghi rõ đây là ĐỀ XUẤT, trường duyệt (việc số 4 của trường). Nên
// chúng nằm gọn ở một chỗ để đổi tên là đổi một dòng.
//
// KHÔNG ĐÁNH SỐ. Danh sách này có thứ tự để hiện ra màn hình theo thứ tự tự
// nhiên, nhưng vị trí trong mảng KHÔNG BAO GIỜ được dùng như một con số.
const TRANG_THAI = [
  ['chua-day', 'Chưa dạy'],
  ['chua-quan-sat-thay', 'Chưa quan sát thấy'],
  ['dang-hinh-thanh', 'Đang hình thành'],
  ['da-vung', 'Đã vững'],
  ['vuot-troi', 'Vượt trội'],
];
const MA_TRANG_THAI = TRANG_THAI.map(x => x[0]);

// Ba trạng thái nghĩa là CÔ ĐÃ THẤY BÉ LÀM. Chỉ ba cái này mới kéo theo nghĩa
// vụ của QUY TẮC 5 — hai cái đầu là "chưa tới lượt", ép cô nghĩ ra việc phải
// làm cho một thứ chưa xảy ra là biến quy tắc thành thủ tục.
const DA_QUAN_SAT_THAY = ['dang-hinh-thanh', 'da-vung', 'vuot-troi'];

// Năm lĩnh vực phát triển của Chương trình Giáo dục mầm non. Cũng là đề xuất,
// trường duyệt.
const LINH_VUC = [
  ['the-chat', 'Thể chất'],
  ['nhan-thuc', 'Nhận thức'],
  ['ngon-ngu', 'Ngôn ngữ'],
  ['tinh-cam-xa-hoi', 'Tình cảm và kỹ năng xã hội'],
  ['tham-my', 'Thẩm mỹ'],
];
const MA_LINH_VUC = LINH_VUC.map(x => x[0]);

const TOI_DA_MO_TA = 1000;
const TOI_DA_CAU_CHUYEN = 3000;
const TOI_DA_NGAN = 500;
const GIOI_HAN_DANH_SACH = 60;
// Bé lâu chưa có ghi chép nào — số ngày để coi là "lâu". Chỉ dùng cho một lời
// nhắc nhẹ với cô, không bao giờ là một con số về đứa trẻ.
const NGAY_COI_LA_LAU = 14;

function homNay() {
  return new Date().toISOString().slice(0, 10);
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

// Ngày thứ Hai của tuần chứa `ngay`, dạng YYYY-MM-DD.
function thuHaiCua(ngay) {
  const t = Date.parse(`${ngay}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const lui = (d.getUTCDay() + 6) % 7;
  return new Date(t - lui * 86400000).toISOString().slice(0, 10);
}

module.exports = (app, { db }) => {
  // =========================================================================
  // BA LỚP DỮ LIỆU — MỘT CHỖ LỌC DUY NHẤT
  // =========================================================================
  //
  // Mọi đường trả một bản ghi quan sát ra ngoài đều đi qua hàm này. Có đúng một
  // chỗ để đọc kỹ, và đúng một chỗ để canh bằng bài test.
  //
  // Vì sao lớp 1 chặt tới mức "chỉ cô đã ghi":
  //
  //   Nháp dở dang được phép tồn tại — đó là điều làm cô dám ghi. Một dòng
  //   "hôm nay bé lại cắn bạn, mình chưa hiểu vì sao" là ghi chú nghề nghiệp
  //   đang hình thành, chưa phải nhận định. Nó lọt sang phụ huynh thì mất lòng
  //   tin của gia đình; lọt sang cô khác thì mất lòng tin của cô — và cô mất
  //   lòng tin thì cô ngừng ghi, mà cô ngừng ghi thì cả GĐ 2 không còn gì.
  //
  // Trước G0.4 điều này đúng một cách TÌNH CỜ vì app 1 gắn một cô một lớp. Nhóm
  // mầm non có 2-3 cô nên sự trùng khớp đó đã biến mất — phải chặn tường minh.
  function choNguoiXem(r, user) {
    if (!r || !user) return null;
    const laCoDaGhi = user.role === 'teacher' && r.coGhi === user.id;
    const doLop2 = user.role === 'admin' || user.role === 'teacher';
    const doLop1 = user.role === 'admin' || laCoDaGhi;

    const ra = {
      id: r.id,
      studentId: r.studentId,
      ngay: r.ngay,
      taoLuc: r.taoLuc,
      daCongBo: !!r.congBoLuc,
      congBoLuc: r.congBoLuc || null,
      cuaToi: laCoDaGhi,
    };

    // LỚP 3 — ai xem được bản ghi này cũng đọc được câu chuyện ĐÃ CÔNG BỐ.
    // Chưa công bố thì nó là nháp của cô, nằm chung số phận với lớp 1.
    if (r.congBoLuc || doLop2) {
      ra.cauChuyen = r.cauChuyen || '';
      ra.cungConONha = r.cungConONha || '';
    }
    // LỚP 2
    if (doLop2) {
      ra.linhVuc = r.linhVuc || '';
      ra.trangThai = r.trangThai || '';
      ra.minhChung = r.minhChung || '';
      ra.oLopLamGi = r.oLopLamGi || '';
      ra.suyNgamLuc = r.suyNgamLuc || null;
      ra.coGhiTen = tenNguoi(r.coGhi);
    }
    // LỚP 1
    if (doLop1) {
      ra.moTa = r.moTa || '';
      ra.anh = r.anh || '';
      ra.ghiNhanhId = r.ghiNhanhId || '';
    }
    return ra;
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // Cô chỉ SỬA được quan sát của chính mình. Quản trị sửa được để còn gỡ khi có
  // khiếu nại — nhưng mọi lần sửa đều vào Nhật ký thao tác.
  function duocSua(user, r) {
    if (!user || !r) return false;
    if (!db.canAccessStudent(user, r.studentId)) return false;
    if (user.role === 'admin') return true;
    return user.role === 'teacher' && r.coGhi === user.id;
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================

  // Hành trình của MỘT bé.
  app.get('/api/hanhtrinh', (req, res) => {
    const studentId = chuoi(req.query.studentId, 40);
    if (!studentId) return res.status(400).json({ error: 'Cần chọn bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem hành trình học tập của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });

    // PHỤ HUYNH CHỈ NHẬN CÂU CHUYỆN ĐÃ CÔNG BỐ — lọc ngay trong câu truy vấn.
    //
    // Lọc ở tầng dữ liệu chứ không dựa vào `choNguoiXem` cắt trường: cắt trường
    // vẫn để lọt SỐ LƯỢNG bản ghi, mà "cô đã ghi 12 điều về con tôi nhưng chỉ
    // kể 2" cũng là một thứ không nên rò ra.
    const chiCongBo = req.user.role === 'parent';
    const rows = db.all('hanhtrinh_quansat',
      `SELECT * FROM hanhtrinh_quansat WHERE studentId = ?
         ${chiCongBo ? 'AND congBoLuc IS NOT NULL' : ''}
       ORDER BY ngay DESC, taoLuc DESC LIMIT ?`, [studentId, GIOI_HAN_DANH_SACH]);

    res.json({
      be: { id: be.id, hoTen: be.name, avatar: be.avatar, classId: be.classId },
      trangThai: TRANG_THAI.map(([ma, ten]) => ({ ma, ten })),
      linhVuc: LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      quanSat: rows.map(r => choNguoiXem(r, req.user)).filter(Boolean),
      chuDeTuan: chuDeCuaBe(be, req.user),
    });
  });

  // Chủ đề tuần này của nhóm bé đang học — hiện chung trên màn của gia đình.
  function chuDeCuaBe(be, user) {
    if (!be.classId) return null;
    if (!db.canAccessClass(user, be.classId)) return null;
    const c = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?',
      [be.classId, thuHaiCua(homNay())]);
    return c || null;
  }

  // MÀN SUY NGẪM CUỐI NGÀY của cô.
  //
  // Chỉ tiêu của bản kế hoạch: MỘT QUAN SÁT TRONG 3 PHÚT. Nên màn này đưa sẵn
  // mọi thứ cô cần: quan sát hôm nay của chính cô, cộng những lần Ghi nhanh
  // chưa được kéo vào hành trình.
  app.get('/api/hanhtrinh/hom-nay', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json({ ngay, quanSat: [], ghiNhanhChuaDung: [] });

    const marks = ids.map(() => '?').join(',');
    // Cô chỉ suy ngẫm trên quan sát của CHÍNH MÌNH (lớp 1 là của cô).
    const cuaCo = req.user.role === 'teacher' ? req.user.id : null;
    const rows = db.all('hanhtrinh_quansat',
      `SELECT * FROM hanhtrinh_quansat
       WHERE ngay = ? AND studentId IN (${marks}) AND (? IS NULL OR coGhi = ?)
       ORDER BY taoLuc`, [ngay, ...ids, cuaCo, cuaCo]);

    const ten = new Map(db.studentsOf(req.user).map(s => [s.id, s]));
    res.json({
      ngay,
      trangThai: TRANG_THAI.map(([ma, t]) => ({ ma, ten: t })),
      linhVuc: LINH_VUC.map(([ma, t]) => ({ ma, ten: t })),
      quanSat: rows.map(r => ({
        ...choNguoiXem(r, req.user),
        hoTen: (ten.get(r.studentId) || {}).name || '',
        avatar: (ten.get(r.studentId) || {}).avatar || null,
        daSuyNgam: !!r.suyNgamLuc,
      })),
      ghiNhanhChuaDung: ghiNhanhChuaDung(req.user, ngay, ids),
      danhSachBe: db.studentsOf(req.user).map(s => ({ id: s.id, hoTen: s.name, avatar: s.avatar })),
    });
  });

  // Kéo phân hệ Ghi nhanh vào — NHƯNG KHÔNG PHỤ THUỘC VÀO NÓ.
  //
  // Ghi nhanh là một phân hệ cắm thêm khác, trường có thể tắt hoặc gỡ hẳn. Đọc
  // thẳng bảng của nó mà không bọc lỗi thì gỡ Ghi nhanh xong là Hành trình học
  // tập sập theo — đúng thứ Nguyên tắc số 1 cấm. Hỏng thì trả mảng rỗng, phần
  // còn lại của màn hình chạy y nguyên.
  function ghiNhanhChuaDung(user, ngay, ids) {
    try {
      const marks = ids.map(() => '?').join(',');
      const cuaCo = user.role === 'teacher' ? user.id : null;
      const rows = db.all('thuchup_ghinhanh',
        `SELECT * FROM thuchup_ghinhanh
         WHERE studentId IN (${marks}) AND substr(taoLuc, 1, 10) = ?
           AND (? IS NULL OR byTeacherId = ?)
         ORDER BY taoLuc DESC LIMIT 50`, [...ids, ngay, cuaCo, cuaCo]);
      const daDung = new Set(db.all('hanhtrinh_quansat',
        'SELECT ghiNhanhId FROM hanhtrinh_quansat WHERE ngay = ?', [ngay])
        .map(x => x.ghiNhanhId).filter(Boolean));
      return rows.filter(r => !daDung.has(r.id))
        .map(r => ({ id: r.id, studentId: r.studentId, note: r.note || '', taoLuc: r.taoLuc, coAnh: !!r.file }));
    } catch (_) {
      // Trường chưa bật hoặc đã gỡ phân hệ Ghi nhanh — không sao cả.
      return [];
    }
  }

  // Ảnh của một quan sát. Đây là ẢNH LỚP 1 nên đi theo luật lớp 1: chỉ cô đã
  // ghi và quản trị. Phụ huynh KHÔNG xem được kể cả khi câu chuyện đã công bố —
  // câu chuyện là chữ cô viết cho gia đình, còn ảnh gốc là tư liệu của cô.
  app.get('/api/hanhtrinh/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    const chu = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE anh = ?', [file]);
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!db.canAccessStudent(req.user, chu.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    const laCoDaGhi = req.user.role === 'teacher' && chu.coGhi === req.user.id;
    if (req.user.role !== 'admin' && !laCoDaGhi) {
      return res.status(403).json({ error: 'Ảnh trong ghi chép riêng của cô' });
    }
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // GỢI Ý, KHÔNG PHẢI BẢNG THEO DÕI.
  //
  // Bản kế hoạch nói thẳng: "không chỉ tiêu số quan sát; bé đáng chú ý CHỈ GỢI
  // Ý". Nên đường này trả về TÊN BÉ và không gì khác — không con số, không thứ
  // tự theo số quan sát, không ngày cuối cùng. Có số là có người so bé này với
  // bé kia, và có thứ tự là có một cách sắp bé này trên bé nọ.
  app.get('/api/hanhtrinh/nhac-nhe', requireRole('teacher', 'admin'), (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json({ be: [] });
    const moc = new Date(Date.now() - NGAY_COI_LA_LAU * 86400000).toISOString().slice(0, 10);
    const marks = ids.map(() => '?').join(',');
    const coGanDay = new Set(db.all('hanhtrinh_quansat',
      `SELECT DISTINCT studentId FROM hanhtrinh_quansat
       WHERE ngay >= ? AND studentId IN (${marks})`, [moc, ...ids]).map(x => x.studentId));
    const be = db.studentsOf(req.user)
      .filter(s => !coGanDay.has(s.id))
      .map(s => ({ studentId: s.id, hoTen: s.name, avatar: s.avatar }))
      .sort((a, b) => String(a.hoTen).localeCompare(String(b.hoTen), 'vi'));
    res.json({ be, soNgay: NGAY_COI_LA_LAU });
  });

  // =========================================================================
  // GHI — LỚP 1
  // =========================================================================
  app.post('/api/hanhtrinh', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const be = db.findStudent(chuoi(b.studentId, 40));
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, be.id)) {
      return res.status(403).json({ error: `Không có quyền ghi hành trình cho bé ${be.name}` });
    }
    const ngay = NGAY_RE.test(String(b.ngay || '')) ? b.ngay : homNay();
    if (ngay > homNay()) return res.status(400).json({ error: 'Chưa ghi quan sát cho ngày chưa tới được' });

    const moTa = chuoi(b.moTa, TOI_DA_MO_TA);
    if (!moTa) return res.status(400).json({ error: 'Cô mô tả giúp điều đã thấy ở bé nhé' });

    let anh = '';
    if (b.anh) {
      try { anh = uploads.saveDataUrl(b.anh).file; }
      catch (err) { return res.status(400).json({ error: err.message || 'Ảnh không hợp lệ' }); }
    }

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('ht'), studentId: be.id, ngay,
      moTa, anh, ghiNhanhId: chuoi(b.ghiNhanhId, 80),
      linhVuc: '', trangThai: '', minhChung: '', oLopLamGi: '',
      suyNgamLuc: null, giaySuyNgam: null,
      cauChuyen: '', cungConONha: '', congBoLuc: null,
      coGhi: req.user.id, taoLuc: luc, capNhatLuc: luc,
    };
    db.insert('hanhtrinh_quansat', rec);
    db.audit(req.user.id, 'hanhtrinh-quan-sat', be.id, { ngay, coAnh: !!anh });
    res.status(201).json(choNguoiXem(rec, req.user));
  });

  // =========================================================================
  // CHỦ ĐỀ TUẦN
  //
  // ĐĂNG KÝ TRƯỚC MỌI ĐƯỜNG CÓ `/:id`.
  //
  // Express khớp đường dẫn theo THỨ TỰ ĐĂNG KÝ. Để khối này xuống dưới thì
  // `PUT /api/hanhtrinh/chu-de` rơi vào `PUT /api/hanhtrinh/:id` với :id là
  // chuỗi "chu-de", và cô soạn chủ đề xong nhận được câu "Không tìm thấy quan
  // sát này" — một lỗi không đọc ra được nguyên nhân từ thông báo.
  //
  // Bài test canh đúng điều này để không ai xếp lại thứ tự rồi hỏng lặng lẽ.
  // =========================================================================
  // =========================================================================
  // CHỦ ĐỀ TUẦN
  // =========================================================================
  app.get('/api/hanhtrinh/chu-de', (req, res) => {
    const classId = chuoi(req.query.classId, 40);
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem chủ đề của nhóm này' });
    }
    const tuan = thuHaiCua(NGAY_RE.test(String(req.query.tuan || '')) ? req.query.tuan : homNay());
    const nay = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?', [classId, tuan]);
    const truoc = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan < ? ORDER BY tuan DESC LIMIT 1',
      [classId, tuan]);
    res.json({
      classId, tuan,
      chuDe: nay || null,
      tuanTruoc: truoc ? { tuan: truoc.tuan, chuDe: truoc.chuDe } : null,
      duocSoan: req.user.role === 'teacher' || req.user.role === 'admin',
    });
  });

  app.put('/api/hanhtrinh/chu-de', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn chủ đề cho nhóm này' });
    }
    const tuan = thuHaiCua(NGAY_RE.test(String(b.tuan || '')) ? b.tuan : homNay());
    if (!tuan) return res.status(400).json({ error: 'Tuần chưa đúng dạng' });
    const chuDe = chuoi(b.chuDe, 200);
    if (!chuDe) return res.status(400).json({ error: 'Cô đặt tên chủ đề cho tuần này nhé' });

    const rec = {
      classId, tuan, chuDe,
      moTa: chuoi(b.moTa, TOI_DA_MO_TA),
      cungConONha: chuoi(b.cungConONha, TOI_DA_MO_TA),
      coGhi: req.user.id, capNhatLuc: new Date().toISOString(),
    };
    const cu = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?', [classId, tuan]);
    if (cu) db.update('hanhtrinh_chude', cu.id, rec);
    else db.insert('hanhtrinh_chude', { id: db.nextId('htc'), ...rec, taoLuc: rec.capNhatLuc });

    db.audit(req.user.id, 'hanhtrinh-chu-de', classId, { tuan });
    res.json(db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?', [classId, tuan]));
  });

  // Chép chủ đề tuần liền trước sang tuần đang soạn — bài học B9 của app 1.
  // KHÔNG ghi đè tuần đã soạn: cô bấm nhầm thì mất cả buổi soạn.
  app.post('/api/hanhtrinh/chu-de/chep-tuan-truoc', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền soạn chủ đề cho nhóm này' });
    }
    const tuan = thuHaiCua(NGAY_RE.test(String(b.tuan || '')) ? b.tuan : homNay());
    if (db.first('hanhtrinh_chude', 'SELECT id FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?', [classId, tuan])) {
      return res.status(400).json({ error: 'Tuần này đã có chủ đề rồi — sửa trực tiếp giúp cô nhé' });
    }
    const truoc = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan < ? ORDER BY tuan DESC LIMIT 1',
      [classId, tuan]);
    if (!truoc) return res.status(400).json({ error: 'Chưa có tuần nào trước đó để chép' });

    const luc = new Date().toISOString();
    db.insert('hanhtrinh_chude', {
      id: db.nextId('htc'), classId, tuan,
      chuDe: truoc.chuDe, moTa: truoc.moTa, cungConONha: truoc.cungConONha,
      coGhi: req.user.id, taoLuc: luc, capNhatLuc: luc,
    });
    db.audit(req.user.id, 'hanhtrinh-chu-de-chep', classId, { tuan, tuNhap: truoc.tuan });
    res.json({ ok: true, tuan, chepTu: truoc.tuan });
  });

  // =========================================================================
  // GHI — LỚP 2 (suy ngẫm) và LỚP 3 (soạn câu chuyện, còn là nháp)
  // =========================================================================
  app.put('/api/hanhtrinh/:id', requireRole('teacher', 'admin'), (req, res) => {
    const cu = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy quan sát này' });
    if (!duocSua(req.user, cu)) {
      return res.status(403).json({
        error: 'Đây là ghi chép riêng của cô đã ghi. Cô khác đọc được phần nhận định, '
          + 'nhưng sửa thì chỉ chính cô ấy hoặc văn phòng.',
      });
    }

    const b = req.body || {};
    const patch = { capNhatLuc: new Date().toISOString() };

    if (b.moTa !== undefined) {
      const m = chuoi(b.moTa, TOI_DA_MO_TA);
      if (!m) return res.status(400).json({ error: 'Phần mô tả không được để trống' });
      patch.moTa = m;
    }

    // ---- Lớp 2 ----
    const coDungLop2 = ['linhVuc', 'trangThai', 'minhChung', 'oLopLamGi'].some(k => b[k] !== undefined);
    if (coDungLop2) {
      const lv = chuoi(b.linhVuc !== undefined ? b.linhVuc : cu.linhVuc, 40);
      if (lv && !MA_LINH_VUC.includes(lv)) return res.status(400).json({ error: 'Lĩnh vực phát triển không hợp lệ' });
      const tt = chuoi(b.trangThai !== undefined ? b.trangThai : cu.trangThai, 40);
      if (tt && !MA_TRANG_THAI.includes(tt)) return res.status(400).json({ error: 'Trạng thái đánh giá không hợp lệ' });
      const oLop = chuoi(b.oLopLamGi !== undefined ? b.oLopLamGi : cu.oLopLamGi, TOI_DA_NGAN);

      // QUY TẮC 5 — ĐÁNH GIÁ PHẢI DẪN TỚI HÀNH ĐỘNG.
      //
      // Chỉ ép khi cô nói ĐÃ THẤY BÉ LÀM. Với "Chưa dạy" và "Chưa quan sát
      // thấy" thì chưa có gì để hành động, mà ép cô nghĩ ra một việc cho thứ
      // chưa xảy ra là biến quy tắc thành thủ tục giấy tờ.
      if (DA_QUAN_SAT_THAY.includes(tt) && !oLop) {
        return res.status(400).json({
          error: 'Cô ghi thêm một dòng "ở lớp cô làm gì tiếp" giúp nhé — một nhận định '
            + 'không kèm việc làm được thì tháng sau đọc lại không dùng được vào đâu.',
        });
      }
      patch.linhVuc = lv;
      patch.trangThai = tt;
      patch.oLopLamGi = oLop;
      if (b.minhChung !== undefined) patch.minhChung = chuoi(b.minhChung, TOI_DA_NGAN);
      patch.suyNgamLuc = new Date().toISOString();
      // Đo chỉ tiêu "suy ngẫm một quan sát <= 3 phút" bằng số thật, không đoán.
      const giay = Number(b.giaySuyNgam);
      if (Number.isFinite(giay) && giay >= 0 && giay < 24 * 3600) patch.giaySuyNgam = giay;
    }

    // ---- Lớp 3, còn là nháp ----
    if (b.cauChuyen !== undefined) patch.cauChuyen = chuoi(b.cauChuyen, TOI_DA_CAU_CHUYEN);
    if (b.cungConONha !== undefined) patch.cungConONha = chuoi(b.cungConONha, TOI_DA_NGAN);

    db.update('hanhtrinh_quansat', cu.id, patch);
    db.audit(req.user.id, 'hanhtrinh-suy-ngam', cu.studentId, {
      id: cu.id, trangThai: patch.trangThai, giay: patch.giaySuyNgam,
    });
    const moi = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [cu.id]);
    res.json(choNguoiXem(moi, req.user));
  });

  // =========================================================================
  // CÔNG BỐ CHO GIA ĐÌNH — bước cô CHỦ ĐỘNG làm, không bao giờ tự động
  // =========================================================================
  app.post('/api/hanhtrinh/:id/cong-bo', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy quan sát này' });
    if (!duocSua(req.user, r)) {
      return res.status(403).json({ error: 'Chỉ cô đã ghi hoặc văn phòng mới công bố được' });
    }
    const b = req.body || {};
    const cauChuyen = chuoi(b.cauChuyen !== undefined ? b.cauChuyen : r.cauChuyen, TOI_DA_CAU_CHUYEN);
    const cungCon = chuoi(b.cungConONha !== undefined ? b.cungConONha : r.cungConONha, TOI_DA_NGAN);

    if (!cauChuyen) {
      return res.status(400).json({ error: 'Cô viết câu chuyện gửi gia đình trước khi công bố nhé' });
    }
    // QUY TẮC 5 phía gia đình. Một câu chuyện hay mà gia đình đọc xong không
    // biết làm gì tiếp thì mới là nửa việc.
    if (!cungCon) {
      return res.status(400).json({
        error: 'Cô gợi ý giúp gia đình một việc "cùng con ở nhà" nhé — 5 tới 10 phút, '
          + 'đồ có sẵn trong nhà, không cần màn hình.',
      });
    }

    const luc = new Date().toISOString();
    db.update('hanhtrinh_quansat', r.id, {
      cauChuyen, cungConONha: cungCon, congBoLuc: luc, capNhatLuc: luc,
    });
    db.audit(req.user.id, 'hanhtrinh-cong-bo', r.studentId, { id: r.id });
    const moi = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [r.id]);
    res.json(choNguoiXem(moi, req.user));
  });

  // Thu hồi: gỡ khỏi màn hình của gia đình, KHÔNG xoá chữ cô đã viết.
  app.post('/api/hanhtrinh/:id/thu-hoi', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy quan sát này' });
    if (!duocSua(req.user, r)) return res.status(403).json({ error: 'Không có quyền thu hồi' });
    if (!r.congBoLuc) return res.status(400).json({ error: 'Câu chuyện này chưa công bố' });
    db.update('hanhtrinh_quansat', r.id, { congBoLuc: null, capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'hanhtrinh-thu-hoi', r.studentId, { id: r.id });
    res.json({ ok: true, id: r.id, daCongBo: false });
  });
};
