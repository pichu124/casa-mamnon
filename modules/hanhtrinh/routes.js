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
const ngay2 = require('../../lib/ngay');
const uploads = require('../../lib/uploads');
const tbb = require('../../lib/thong-bao-be');
const fs = require('fs');

// Chép một tệp ảnh đã có thành một tệp MỚI trong kho ảnh.
//
// Đọc lại rồi cho đi qua `uploads.saveDataUrl` thay vì `fs.copyFileSync`: như
// vậy tệp mới được đặt tên theo đúng quy tắc của kho ảnh, và đi qua đủ phép
// kiểm định dạng lẫn dung lượng — không có đường tắt nào bỏ qua chúng.
function chepAnh(file) {
  const duong = uploads.pathOf(file);
  if (!duong || !uploads.exists(file)) return '';
  const buf = fs.readFileSync(duong);
  return uploads.saveDataUrl(`data:${uploads.mimeOf(file)};base64,${buf.toString('base64')}`).file;
}

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

// NHÃN NHÀ TRƯỜNG ĐÃ SỬA, NẾU CÓ (Đ185, Câu 6).
//
// `TRANG_THAI` ở trên là nhãn MẶC ĐỊNH và vẫn là nguồn duy nhất của MÃ. Nhà
// trường sửa chữ thì phần sửa nằm trong `settings`, và hàm này phủ lên. Trường
// chưa sửa gì thì kết quả giống hệt `TRANG_THAI` — không đổi một hành vi nào.
//
// Gọi mỗi lượt yêu cầu chứ không nhớ lại: bộ chữ đổi rất hiếm, mà một bản nhớ
// cũ nằm lại sau khi quản lý vừa đổi chữ thì cô thấy chữ cũ cho tới lần khởi
// động lại — đúng loại lỗi không ai dựng lại được để báo.
const ndg = require('../../lib/nhan-danh-gia');
function trangThaiDangDung(db) {
  return ndg.nhanDangDung(db, TRANG_THAI);
}

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
  return ngay2.homNay();
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

module.exports = (app, { db, modules }) => {
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
    // Chưa công bố thì nó là nháp của cô, nằm chung số phận với lớp 1 — tức
    // là `doLop1` (chỉ cô đã ghi + quản trị), KHÔNG phải `doLop2`. Bản cũ viết
    // `doLop2` nên câu chuyện đang soạn dở của cô A lộ sang cô B cùng nhóm —
    // trái đúng điều chú thích dài đầu hàm này cảnh báo ("lọt sang cô khác thì
    // mất lòng tin của cô, và cô mất lòng tin thì cô ngừng ghi").
    if (r.congBoLuc || doLop1) {
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
      // Ảnh đã về album nào (Đ144) — chỉ người thấy lớp 1 mới cần biết. Bảng
      // `albums` là của phân hệ Album: hỏi công tắc trước, tắt thì không kể.
      const lk = db.first('hanhtrinh_album', 'SELECT albumId FROM hanhtrinh_album WHERE quanSatId = ?', [r.id]);
      if (lk && albumDangBat()) {
        const al = db.first('albums', 'SELECT id, title FROM albums WHERE id = ?', [lk.albumId]);
        ra.daVeAlbum = al ? { id: al.id, title: al.title } : null;
      }
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
    // CÓ TRANG, KHÔNG CẮT CỤT. Bản cũ LIMIT cứng: hành trình nhiều năm của một
    // bé dừng ở 60 bản mới nhất trên MỌI màn hình, phần đầu đời — đúng phần
    // gia đình muốn xem lại nhất — không còn đường nào mở. `bo` là khoá THÊM
    // BÊN CẠNH: app cũ không gửi thì nhận trang đầu, y như trước.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const rows = db.all('hanhtrinh_quansat',
      `SELECT * FROM hanhtrinh_quansat WHERE studentId = ?
         ${chiCongBo ? 'AND congBoLuc IS NOT NULL' : ''}
       ORDER BY ngay DESC, taoLuc DESC LIMIT ? OFFSET ?`, [studentId, GIOI_HAN_DANH_SACH, bo]);

    res.json({
      // Còn trang sau không — màn hình chỉ cần đếm, không cần đoán.
      conNua: rows.length === GIOI_HAN_DANH_SACH,
      bo,
      be: { id: be.id, hoTen: be.name, avatar: be.avatar, classId: be.classId },
      // CÔ PHẢI BIẾT TRƯỚC KHI GÕ, KHÔNG PHẢI SAU (Đ96).
      //
      // Chốt chặn ở đường ghi là đủ để đúng luật, nhưng chưa đủ để dùng được:
      // cô soạn xong cả một quan sát rồi mới bị từ chối là mất công của cô, và
      // cô sẽ nghĩ app hỏng. Nên đường liệt kê nói luôn từ đầu, để màn hình đặt
      // câu ấy lên trước ô nhập.
      //
      // Gửi cho cô và văn phòng thôi. Gia đình thì đã biết — chính họ vừa gạt
      // ô ấy — và nhắc lại trên màn của con là biến quyết định của người lớn
      // thành một nhãn dán lên đứa trẻ.
      ngungHoSoHocTap: req.user.role === 'parent' ? undefined : db.beNgungHoSoHocTap(be.id),
      trangThai: trangThaiDangDung(db).map(([ma, ten]) => ({ ma, ten })),
      linhVuc: LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      quanSat: rows.map(r => choNguoiXem(r, req.user)).filter(Boolean),
      chuDeTuan: chuDeCuaBe(be, req.user),
      // THÊM MỘT KHOÁ BÊN CẠNH, KHÔNG ĐỔI KHOÁ CŨ.
      //
      // Điện thoại đang giữ bản app cũ vẫn đọc `chuDeTuan` như trước và không
      // hề biết khoá này có mặt. Đổi hình dạng của `chuDeTuan` thì mới là thứ
      // làm trắng màn hình của họ.
      chuDeTuanSau: chuDeCuaBe(be, req.user, tuanSau()),
    });
  });

  // Thứ Hai của tuần kế tiếp.
  function tuanSau() {
    const t = thuHaiCua(homNay());
    return t ? new Date(Date.parse(`${t}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10) : null;
  }

  // Chủ đề của một tuần ở nhóm bé đang học — hiện chung trên màn của gia đình.
  //
  // VÌ SAO GIA ĐÌNH CẦN ĐỌC ĐƯỢC CẢ TUẦN SAU
  //
  // Phần gia đình thật sự dùng trong thẻ này là "Cùng con ở nhà" — một lời rủ
  // chơi 5–10 phút. Nhà chơi được lời rủ ấy vào lúc nào? Cuối tuần. Mà cuối
  // tuần thì tuần hiện tại đã hết, còn tuần sau thì cô đã soạn xong từ thứ Sáu
  // và màn hình này không cho gia đình thấy.
  //
  // Nên thẻ tuần sau chỉ là MỜI, không thay thế: tuần này vẫn đứng trước.
  function chuDeCuaBe(be, user, tuan) {
    if (!be.classId) return null;
    if (!db.canAccessClass(user, be.classId)) return null;
    const moc = tuan || thuHaiCua(homNay());
    if (!moc) return null;
    const c = db.first('hanhtrinh_chude',
      'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?',
      [be.classId, moc]);
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
      trangThai: trangThaiDangDung(db).map(([ma, t]) => ({ ma, ten: t })),
      linhVuc: LINH_VUC.map(([ma, t]) => ({ ma, ten: t })),
      quanSat: rows.map(r => ({
        ...choNguoiXem(r, req.user),
        hoTen: (ten.get(r.studentId) || {}).name || '',
        avatar: (ten.get(r.studentId) || {}).avatar || null,
        daSuyNgam: !!r.suyNgamLuc,
      })),
      ghiNhanhChuaDung: ghiNhanhChuaDung(req.user, ngay, ids),
      // Kèm cờ `ngungHoSoHocTap` cho TỪNG bé — hộp thoại ghi quan sát mở từ
      // màn này cần nói TRƯỚC khi cô gõ (Đ96), mà cờ thì trước đây chỉ đường
      // hành trình của một bé mới có. Tra một lượt cho cả nhóm, không tra lẻ.
      danhSachBe: (() => {
        const ds = db.studentsOf(req.user);
        const ngung = db.dsBeNgungHoSoHocTap(ds.map(s => s.id));
        return ds.map(s => ({
          id: s.id, hoTen: s.name, avatar: s.avatar,
          ngungHoSoHocTap: ngung.has(s.id),
        }));
      })(),
    });
  });

  // Kéo phân hệ Ghi nhanh vào — NHƯNG KHÔNG PHỤ THUỘC VÀO NÓ.
  //
  // Ghi nhanh là một phân hệ cắm thêm khác, trường có thể tắt hoặc gỡ hẳn. Hai
  // chuyện khác nhau, và phải xử lý cả hai:
  //
  //   GỠ HẲN → bảng không còn, câu truy vấn ném lỗi. Bọc lỗi, trả mảng rỗng;
  //   phần còn lại của màn hình chạy y nguyên. Không bọc thì gỡ Ghi nhanh xong
  //   là Hành trình sập theo — đúng thứ Nguyên tắc số 1 cấm.
  //
  //   TẮT TRONG QUẢN TRỊ → bảng vẫn còn nguyên dữ liệu. Không hỏi công tắc thì
  //   nhà trường tắt Ghi nhanh xong VẪN thấy nội dung ghi nhanh chảy ra qua màn
  //   hình này — sai lời hứa "tắt là biến khỏi màn hình" của CLAUDE.md. Chặn ở
  //   HTTP (chanApiDaTat) không đủ, vì đây không đi qua HTTP mà đọc thẳng bảng.
  function ghiNhanhChuaDung(user, ngay, ids) {
    if (!modules || typeof modules.dangBat !== 'function' || !modules.dangBat('thuchup')) return [];
    try {
      const marks = ids.map(() => '?').join(',');
      const cuaCo = user.role === 'teacher' ? user.id : null;
      // LỌC THEO KHOẢNG UTC, KHÔNG CẮT CHUỖI.
      //
      // `substr(taoLuc, 1, 10) = ?` cắt ra ngày theo giờ UTC, trong khi `ngay`
      // là ngày theo giờ Việt Nam. Sáng sớm thì bản Ghi nhanh cô vừa tạo rơi
      // vào ngày hôm trước và biến mất khỏi màn suy ngẫm — đúng lúc cô cần nó.
      const [tu, den] = ngay2.khoangUtcCuaNgay(ngay);
      const rows = db.all('thuchup_ghinhanh',
        `SELECT * FROM thuchup_ghinhanh
         WHERE studentId IN (${marks}) AND taoLuc >= ? AND taoLuc < ?
           AND (? IS NULL OR byTeacherId = ?)
         ORDER BY taoLuc DESC LIMIT 50`, [...ids, tu, den, cuaCo, cuaCo]);
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
    const moc = ngay2.ngayCua(Date.now() - NGAY_COI_LA_LAU * 86400000);
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
  // BẢN GHI NHANH ĐƯỢC CHÉP SANG PHẢI LÀ CỦA CHÍNH CÔ ĐÓ, VÀ CỦA CHÍNH BÉ ĐÓ.
  //
  // `ghiNhanhId` đi vào từ thân yêu cầu. Bản đầu lưu thẳng chuỗi đó xuống mà
  // KHÔNG tra bản Ghi nhanh nào cả — trong khi `ghiNhanhChuaDung` ở trên thì lọc
  // `byTeacherId` rất cẩn thận. Hai chỗ nói hai luật khác nhau về cùng một thứ.
  //
  // Hậu quả: cô A gắn quan sát của mình vào bản Ghi nhanh của cô B, và bản Ghi
  // nhanh đó biến khỏi màn suy ngẫm của cô B (nó bị coi là "đã dùng"). Ghi chú
  // thô của cô B là dữ liệu LỚP 1 — thứ CLAUDE.md nói không bao giờ được lộ.
  // Đây cùng họ với lỗ N24(a).
  //
  // Trả về { loi } hoặc { ban } — `ban` là null khi không chép từ đâu cả.
  function banGhiNhanhChepDuoc(user, ghiNhanhId, studentId) {
    if (!ghiNhanhId) return { ban: null };
    if (!modules || typeof modules.dangBat !== 'function' || !modules.dangBat('thuchup')) {
      return { loi: 'Phân hệ Ghi nhanh đang tắt nên không chép sang được' };
    }
    let ban = null;
    try {
      ban = db.first('thuchup_ghinhanh', 'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [ghiNhanhId]);
    } catch (_) {
      return { loi: 'Phân hệ Ghi nhanh đang tắt nên không chép sang được' };
    }
    if (!ban) return { loi: 'Không tìm thấy bản Ghi nhanh đó' };
    // Cô chỉ chép được bản của CHÍNH MÌNH. Quản trị thì đi theo tầng cơ sở như
    // mọi chỗ khác — `canAccessStudent` bên dưới đã lo phần đó.
    if (user.role === 'teacher' && ban.byTeacherId !== user.id) {
      return { loi: 'Bản Ghi nhanh này là ghi chép riêng của cô khác' };
    }
    if (ban.studentId !== studentId) {
      return { loi: 'Bản Ghi nhanh này là của một bé khác' };
    }
    return { ban };
  }

  // GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP THÌ NGƯNG GHI MỚI (Đ96, ô đồng ý ①).
  //
  // Chỉ chặn đường GHI. Mọi đường ĐỌC, và mọi đường LÀM GIẢM thứ đang hiện
  // (xoá, thu hồi) vẫn chạy như thường: rút đồng ý là ngưng dựng thêm hồ sơ,
  // không phải xoá phần đã có và cũng không phải khoá gia đình khỏi nó.
  //
  // Câu từ chối nói về QUYẾT ĐỊNH CỦA NGƯỜI LỚN, không nói gì về đứa trẻ, và
  // chỉ đường cho cô làm tiếp việc khác — QUY TẮC 2 và QUY TẮC 5.
  function chanNeuNgungHoSo(res, studentId) {
    if (!db.beNgungHoSoHocTap(studentId)) return false;
    res.status(403).json({
      error: 'Gia đình bé này đã dừng phần hồ sơ học tập. '
        + 'Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.',
    });
    return true;
  }

  app.post('/api/hanhtrinh', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const be = db.findStudent(chuoi(b.studentId, 40));
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, be.id)) {
      return res.status(403).json({ error: `Không có quyền ghi hành trình cho bé ${be.name}` });
    }
    if (chanNeuNgungHoSo(res, be.id)) return;
    const ngay = NGAY_RE.test(String(b.ngay || '')) ? b.ngay : homNay();
    if (ngay > homNay()) return res.status(400).json({ error: 'Chưa ghi quan sát cho ngày chưa tới được' });

    const ghiNhanhId = chuoi(b.ghiNhanhId, 80);
    const kt = banGhiNhanhChepDuoc(req.user, ghiNhanhId, be.id);
    if (kt.loi) return res.status(403).json({ error: kt.loi });
    const nguon = kt.ban;

    // Chép chữ sang khi cô không gõ gì thêm. Bản đầu để trống, nên cô bấm vào
    // một bản Ghi nhanh để "chép sang" rồi phải gõ lại từ đầu đúng câu mình
    // vừa viết mười phút trước — nút đó không giúp được gì cả.
    const moTa = chuoi(b.moTa, TOI_DA_MO_TA) || chuoi(nguon && nguon.note, TOI_DA_MO_TA);
    if (!moTa) return res.status(400).json({ error: 'Cô mô tả giúp điều đã thấy ở bé nhé' });

    let anh = '';
    if (b.anh) {
      try { anh = uploads.saveDataUrl(b.anh).file; }
      catch (err) { return res.status(400).json({ error: err.message || 'Ảnh không hợp lệ' }); }
    } else if (nguon && nguon.file) {
      // CHÉP TỆP, KHÔNG DÙNG CHUNG TÊN TỆP.
      //
      // Dùng chung thì hai bản ghi có vòng đời buộc vào nhau: xoá bản Ghi nhanh
      // là ảnh của quan sát trắng theo, mà người xoá không hề biết. Một tấm ảnh
      // vài trăm KB là cái giá rẻ hơn nhiều so với một tấm ảnh biến mất.
      try { anh = chepAnh(nguon.file); } catch (_) { anh = ''; }
    }

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('ht'), studentId: be.id, ngay,
      moTa, anh, ghiNhanhId,
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
    if (chanNeuNgungHoSo(res, cu.studentId)) return;

    const b = req.body || {};
    const patch = { capNhatLuc: new Date().toISOString() };

    // ĐỔI BÉ — ĐƯỜNG LÙI CHO MỘT CÚ BẤM NHẦM.
    //
    // Hộp thoại ghi quan sát từng chọn sẵn bé đầu danh sách, nên cô bấm Lưu mà
    // quên đổi tên bé là quan sát nằm vĩnh viễn trong hành trình của bé khác.
    // Trước đây không có đường lùi nào: đường này không nhận `studentId`, và
    // không phân hệ nào có đường xoá.
    //
    // Phải qua canh quyền HAI LẦN, cho cả bé cũ lẫn bé mới — `duocSua` ở trên
    // đã kiểm bé cũ. Không kiểm bé mới thì đây thành đường chuyển một quan sát
    // sang nhóm mà cô không dạy.
    if (b.studentId !== undefined && b.studentId !== cu.studentId) {
      const beMoi = chuoi(b.studentId, 40);
      if (!beMoi) return res.status(400).json({ error: 'Chưa chọn bé' });
      if (!db.canAccessStudent(req.user, beMoi)) {
        return res.status(403).json({ error: 'Không có quyền ghi quan sát cho bé này' });
      }
      if (!db.findStudent(beMoi)) return res.status(404).json({ error: 'Không tìm thấy bé' });
      // Cùng chốt Đ96 với đường GHI MỚI: chuyển một quan sát SANG một bé mà
      // gia đình đã dừng phần hồ sơ học tập cũng là ghi mới vào hồ sơ của bé
      // đó — không chặn ở đây là đường vòng qua chốt đồng ý.
      if (db.beNgungHoSoHocTap(beMoi)) {
        return res.status(400).json({
          error: 'Gia đình bé này đã dừng phần hồ sơ học tập, nên không chuyển quan sát sang hồ sơ của bé được',
        });
      }
      // Câu chuyện ĐÃ CÔNG BỐ thì gia đình bé cũ đã đọc rồi. Chuyển sang bé
      // khác mà vẫn để nguyên trạng thái công bố là đưa câu chuyện của bé này
      // sang nhà bé kia. Thu hồi trước, cô công bố lại nếu vẫn muốn kể.
      if (cu.congBoLuc) patch.congBoLuc = null;
      patch.studentId = beMoi;
    }

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

    // ---- Lớp 3 ----
    //
    // BẢN ĐÃ CÔNG BỐ THÌ ĐÂY KHÔNG CÒN LÀ NHÁP.
    //
    // Tên cũ của khối này là "Lớp 3, còn là nháp", và giao diện gọi nút là
    // "Lưu nháp" rồi báo "Đã lưu nháp — gia đình chưa đọc được". Cả ba đều SAI
    // khi `congBoLuc` đã có: chữ đi thẳng lên màn hình gia đình.
    //
    // Hai hậu quả, cái thứ hai nặng hơn:
    //   • cô sửa một câu tưởng là nháp, gia đình đọc được ngay;
    //   • và `cungConONha` XOÁ TRẮNG được qua đường này, trong khi đường
    //     `cong-bo` bắt buộc phải có nó (QUY TẮC 5 — mỗi nhận định phải kèm
    //     một việc làm được). Tức là đi vòng qua chính quy tắc ấy.
    //
    // Không cấm sửa: sửa một lỗi chính tả trong câu chuyện đã kể mà bắt cô thu
    // hồi rồi công bố lại là làm phiền cô vì một việc đúng. Chỉ ép ĐÚNG HAI
    // ĐIỀU KIỆN mà `cong-bo` đã ép, để bản đang hiện với gia đình không bao giờ
    // rơi xuống dưới mức mà chính nó phải đạt để được công bố.
    if ((b.cauChuyen !== undefined || b.cungConONha !== undefined) && cu.congBoLuc) {
      const cc = chuoi(b.cauChuyen !== undefined ? b.cauChuyen : cu.cauChuyen, TOI_DA_CAU_CHUYEN);
      const cn = chuoi(b.cungConONha !== undefined ? b.cungConONha : cu.cungConONha, TOI_DA_NGAN);
      if (!cc) {
        return res.status(400).json({
          error: 'Câu chuyện này đang hiện trên màn hình gia đình, nên không để trống được. '
            + 'Muốn gỡ hẳn thì bấm "Thu hồi khỏi màn hình gia đình".',
        });
      }
      if (!cn) {
        return res.status(400).json({
          error: 'Câu chuyện này đang hiện với gia đình, nên vẫn cần gợi ý "cùng con ở nhà". '
            + 'Muốn bỏ hẳn thì thu hồi câu chuyện trước.',
        });
      }
    }
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
  // XOÁ MỘT QUAN SÁT GHI NHẦM
  // =========================================================================
  //
  // VÌ SAO CẦN, VÀ VÌ SAO PHẢI DỌN CẢ ẢNH
  //
  // Đổi bé ở đường trên lo được phần lớn cú bấm nhầm. Nhưng có những bản ghi
  // đúng là RÁC: cô bấm Lưu hai lần, hay ghi vào giữa chừng rồi bỏ. Không có
  // đường xoá thì chúng nằm lại vĩnh viễn trong hành trình của một đứa trẻ.
  //
  // `uploads.remove` được gọi ở dontra, cambridge, thuchup và albums, nhưng
  // KHÔNG hề có trong phân hệ này — nên ảnh của một quan sát không bao giờ được
  // dọn. Ổ đĩa chỉ có tăng, và tấm ảnh khuôn mặt trẻ vẫn nằm đó sau khi bản ghi
  // đã biến mất khỏi màn hình. Đó mới là phần đáng lo, không phải dung lượng.
  app.delete('/api/hanhtrinh/:id', requireRole('teacher', 'admin'), (req, res) => {
    const cu = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy quan sát này' });
    if (!duocSua(req.user, cu)) {
      return res.status(403).json({
        error: 'Đây là ghi chép riêng của cô đã ghi. Xoá thì chỉ chính cô ấy hoặc văn phòng.',
      });
    }

    // Ảnh chỉ được dọn khi KHÔNG bản ghi nào khác còn dùng tới nó. Đường chép
    // từ Ghi nhanh tạo bản ảnh riêng nên bình thường là một-một, nhưng hỏi một
    // câu ở đây rẻ hơn nhiều so với việc xoá mất ảnh của một quan sát khác.
    if (cu.anh) {
      const conAiDung = db.all('hanhtrinh_quansat',
        'SELECT id FROM hanhtrinh_quansat WHERE anh = ? AND id <> ?', [cu.anh, cu.id]).length;
      if (!conAiDung) { try { uploads.remove(cu.anh); } catch (_) {} }
    }

    db.run('DELETE FROM hanhtrinh_quansat WHERE id = ?', [cu.id]);
    db.audit(req.user.id, 'hanhtrinh-xoa', cu.studentId, {
      id: cu.id, ngay: cu.ngay, daCongBo: !!cu.congBoLuc,
    });
    res.json({ ok: true });
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
    if (chanNeuNgungHoSo(res, r.studentId)) return;
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

    // ẢNH VỀ ALBUM (Đ144): cô chọn album của nhóm thì ảnh quan sát được chép
    // sang đó thành một tấm có gắn thẻ bé. Kiểm TRƯỚC khi công bố để lỗi chọn
    // album không để lại một câu chuyện đã công bố mà ảnh chưa về đâu.
    const albumId = chuoi(b.albumId, 40);
    let album = null;
    if (albumId) {
      if (!albumDangBat()) return res.status(400).json({ error: 'Phân hệ Album ảnh đang tắt — công bố mà không lưu về album, hoặc nhờ văn phòng bật lại' });
      if (!r.anh) return res.status(400).json({ error: 'Quan sát này không có ảnh để lưu về album' });
      album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [albumId]);
      if (!album) return res.status(404).json({ error: 'Không tìm thấy album đã chọn' });
      if (!(req.user.role === 'teacher' && db.isTeacherOfClass(req.user.id, album.classId))) {
        return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm của album mới lưu ảnh vào đó được' });
      }
      const be = db.findStudent(r.studentId);
      if (!be || be.classId !== album.classId) {
        return res.status(400).json({ error: 'Album này thuộc nhóm khác với nhóm của bé' });
      }
      const lop = db.findClass(album.classId);
      if (!lop || !lop.active) return res.status(400).json({ error: 'Nhóm của album đã đóng — chọn album của năm nay nhé' });

      // CÂU CHUYỆN CỦA MỘT BÉ KHÔNG ĐƯỢC RƠI VÀO ALBUM CẢ NHÓM ĐỌC ĐƯỢC.
      //
      // Đây là ranh giới LỚP 3 trong bảng ba lớp dữ liệu của CLAUDE.md: câu
      // chuyện kể cho gia đình là của *phụ huynh chính bé đó*, không phải của
      // cả nhóm. Trước bản vá này, ô chọn album mời cô chọn BẤT KỲ album nào
      // của nhóm, và album mặc định là 'cong-khai' — nên một tấm ảnh riêng của
      // bé, kèm chính câu chuyện cô vừa viết làm lời chú thích, hiện ra với mọi
      // gia đình trong nhóm. Ô chọn không cảnh báo một chữ nào.
      //
      // Nhà trường cũng chốt đúng điều này ngày 10/09/2026 (A15): *"Hành trình
      // của bé: giáo viên sẽ tạo album ảnh cho từng bé và CHỈ CHIA SẺ album này
      // cho phụ huynh của bé ấy thôi"*.
      //
      // Chốt đặt ở MÁY CHỦ chứ không chỉ ở ô chọn: ô chọn là để cô khỏi bấm
      // nhầm, còn đây mới là chỗ không ai vòng qua được. Cùng lý do đã ghi ở
      // lib/schema.sql cho luật ảnh nhóm — lọc ở tầng dữ liệu, không che ở
      // giao diện.
      //
      // KHÔNG đụng tới tấm ảnh nào ĐÃ chép sang album công khai trước đây:
      // xoá chúng là mất dữ liệu, và gia đình có thể đã nhìn thấy rồi. Bản vá
      // này chỉ chặn tấm TIẾP THEO.
      const cheDo = db.first('album_che_do',
        'SELECT cheDo FROM album_che_do WHERE albumId = ?', [album.id]);
      if (!cheDo || cheDo.cheDo !== 'theo-the') {
        return res.status(400).json({
          error: 'Album này đang để cả nhóm cùng xem, nên không lưu ảnh của câu chuyện riêng vào đó được. '
            + 'Cô chọn một album ở chế độ "theo thẻ" — ở đó mỗi nhà chỉ thấy ảnh có thẻ con mình.',
        });
      }
    }

    const luc = new Date().toISOString();
    db.update('hanhtrinh_quansat', r.id, {
      cauChuyen, cungConONha: cungCon, congBoLuc: luc, capNhatLuc: luc,
    });
    db.audit(req.user.id, 'hanhtrinh-cong-bo', r.studentId, { id: r.id });
    if (album) luuAnhVeAlbum(r, album, req.user, cauChuyen);
    // Báo gia đình: câu chuyện là của MỘT bé, đi đường thông báo riêng của bé.
    // Cùng một câu chuyện công bố lại trong ngày thì không rung máy lần nữa.
    baoGiaDinhCauChuyen(r, req.user.id);
    const moi = db.first('hanhtrinh_quansat', 'SELECT * FROM hanhtrinh_quansat WHERE id = ?', [r.id]);
    res.json(choNguoiXem(moi, req.user));
  });

  // Chép ảnh của quan sát sang album, gắn thẻ bé, nhớ lại để không chép đôi.
  // Việc phụ: hỏng thì câu chuyện vẫn đã tới gia đình.
  // Album ảnh là phân hệ KHÁC — đọc/ghi bảng của nó phải hỏi công tắc trước
  // (modules/README.md, mục "Đọc bảng của phân hệ KHÁC thì phải hỏi công tắc").
  function albumDangBat() {
    return !!(modules && typeof modules.dangBat === 'function' && modules.dangBat('album'));
  }

  function luuAnhVeAlbum(r, album, user, cauChuyen) {
    if (!albumDangBat()) return null;
    try {
      const daCo = db.first('hanhtrinh_album', 'SELECT * FROM hanhtrinh_album WHERE quanSatId = ?', [r.id]);
      if (daCo) return daCo;
      const file = chepAnh(r.anh);
      if (!file) return null;
      const viTri = db.count('SELECT COUNT(*) FROM album_photos WHERE albumId = ?', [album.id]);
      const photo = { id: db.nextId('ph'), albumId: album.id, file, caption: chuoi(cauChuyen, 200), position: viTri };
      db.tx(() => {
        db.insert('album_photos', photo);
        db.datBeTrongAnh(photo.id, [r.studentId]);
        db.insert('hanhtrinh_album', { quanSatId: r.id, albumId: album.id, photoId: photo.id, ghiLuc: new Date().toISOString() });
      });
      db.audit(user.id, 'hanhtrinh-anh-ve-album', r.studentId, { id: r.id, albumId: album.id });
      return { albumId: album.id, photoId: photo.id };
    } catch (_) {
      return null;
    }
  }

  function baoGiaDinhCauChuyen(r, nguoiTao) {
    try {
      const be = db.findStudent(r.studentId);
      if (!be) return;
      const hash = `#/hanhtrinh/${r.studentId}`;
      const moi = db.first('hanhtrinh_quansat', 'SELECT cauChuyen FROM hanhtrinh_quansat WHERE id = ?', [r.id]) || {};
      const tieuDe = `Câu chuyện về ${be.name}: ${chuoi(moi.cauChuyen, 60)}`.trim().slice(0, 120);
      const [tuUtc, denUtc] = ngay2.khoangUtcCuaNgay(ngay2.homNay());
      const daBao = db.first('thongbao_be',
        "SELECT id FROM thongbao_be WHERE studentId = ? AND loai = 'hanh-trinh' AND tieuDe = ? AND taoLuc >= ? AND taoLuc < ?",
        [be.id, tieuDe, tuUtc, denUtc]);
      if (daBao) return;
      tbb.gui({
        studentId: be.id, loai: 'hanh-trinh', tieuDe,
        noiDung: 'Cô vừa kể một câu chuyện về con và gợi ý một việc làm cùng con ở nhà. Mở Hành trình học tập để đọc.',
        hash, nguoiTao,
      });
    } catch (_) { /* việc phụ */ }
  }

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
