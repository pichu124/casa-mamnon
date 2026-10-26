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
// Video (Đ242B) đi qua `saveVideoDataUrl` theo đúng lý do ấy.
function chepAnh(file) {
  const duong = uploads.pathOf(file);
  if (!duong || !uploads.exists(file)) return '';
  const buf = fs.readFileSync(duong);
  const dataUrl = `data:${uploads.mimeOf(file)};base64,${buf.toString('base64')}`;
  return (uploads.laVideo(file) ? uploads.saveVideoDataUrl(dataUrl) : uploads.saveDataUrl(dataUrl)).file;
}

// Ảnh hoặc video lớp 1 cô gửi lên (Đ242B, B4). Một ghi chép một tệp. Trả về
// { file } (rỗng khi không gửi gì) hoặc { loi } để trả 400.
function luuTepLop1(b) {
  if (b.anh && b.video) return { loi: 'Mỗi ghi chép kèm một tấm ảnh hoặc một đoạn video thôi nhé' };
  try {
    if (b.video) return { file: uploads.saveVideoDataUrl(b.video).file };
    if (b.anh) return { file: uploads.saveDataUrl(b.anh).file };
  } catch (err) {
    return { loi: err.message || 'Tệp không hợp lệ' };
  }
  return { file: '' };
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
// Ba nhóm cô — chủ nhiệm (Montessori) / nước ngoài (Cambridge) / thể chất
// (Thể chất chuyên sâu). Sổ quan sát chia ba tab theo đây (Đ195, việc 24).
const nhomCo = require('../../lib/nhom-co');
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

// GÓC CỦA "KẾ HOẠCH CỦA BÉ" VÀ CHƯƠNG TRÌNH CỦA TỪNG GÓC (góp ý 06/10, mục 7).
//
// Tab "Kế hoạch của bé" của Hành trình đọc bài từ phân hệ Kế hoạch — mà bài ở
// đó mang mã GÓC của lớp Montessori (toan, giac-quan…), khác năm lĩnh vực phát
// triển ở trên. Trước đợt này màn gia đình tra tên góc trong `LINH_VUC` nên
// hiện ra mã trần ("toan"). CHÉP LẠI bản đồ, không gọi sang phân hệ kia (hai
// phân hệ cắm thêm không phụ thuộc nhau); `test/chuong-trinh-ba-nhom.test.mjs`
// đối chiếu bản chép này với hai bản ở Kế hoạch và Báo cáo.
const GOC_KE_HOACH = [
  ['toan', 'Toán'],
  ['tieng-viet', 'Tiếng Việt'],
  ['cambridge', 'Tiếng Anh (Cambridge)'],
  ['thuc-hanh-cuoc-song', 'Thực hành cuộc sống'],
  ['giac-quan', 'Giác quan'],
  ['van-hoa', 'Văn hoá'],
  ['the-chat', 'Thể chất'],
];
const CHUONG_TRINH_CUA_GOC = {
  'toan': 'chu-nhiem',
  'tieng-viet': 'chu-nhiem',
  'thuc-hanh-cuoc-song': 'chu-nhiem',
  'giac-quan': 'chu-nhiem',
  'van-hoa': 'chu-nhiem',
  'cambridge': 'nuoc-ngoai',
  'the-chat': 'the-chat',
};
function chuongTrinhCuaGoc(ma) {
  return CHUONG_TRINH_CUA_GOC[String(ma || '')] || 'chu-nhiem';
}

const TOI_DA_MO_TA = 1000;
const TOI_DA_CAU_CHUYEN = 3000;
const TOI_DA_NGAN = 500;
const GIOI_HAN_DANH_SACH = 60;
// Bé lâu chưa có ghi chép nào — số ngày để coi là "lâu". Chỉ dùng cho một lời
// nhắc nhẹ với cô, không bao giờ là một con số về đứa trẻ.
//
// HAI NGÀY, THEO ĐÚNG LỜI NHÀ TRƯỜNG NGÀY 15/09 (Đ189, Câu 8): *"sau 2 ngày mà
// các GV k ghi quan sát hoặc up ảnh của cháu sẽ có thông báo còn mấy cháu chưa
// cập nhật"*. Trước đó là 14 ngày — một lời nhắc hai tuần một lần thì tới lúc
// nó hiện ra, tuần đã trôi qua rồi.
//
// CON SỐ NÀY LÀ MỐC NHẮC CỦA CÔ, KHÔNG PHẢI CHỈ TIÊU VỀ BÉ. Nhà trường cũng
// nói mỗi bé mỗi tuần nên có ít nhất ba quan sát, mỗi chương trình một. Đó là
// khối lượng công việc trường tự đặt cho mình, và nó CỐ Ý không được dựng
// thành một con số đếm trên màn hình: đếm số quan sát của từng bé là biến lời
// nhắc thành bảng so bì giữa các bé và giữa các cô, đúng thứ QUY TẮC 2 cấm và
// `test/quy-tac-2.test.mjs` canh bằng máy. Nên chỗ này vẫn chỉ trả về TÊN.
const NGAY_COI_LA_LAU = 2;

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
      ra.laVideo = uploads.laVideo(r.anh);
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

  // =========================================================================
  // QUAN SÁT NÀY THUỘC CHƯƠNG TRÌNH NÀO (Đ195, việc 24)
  // =========================================================================
  //
  // Nhà trường (Câu 11): ba nhóm cô, và "3 vị trí này sẽ giúp lên kế hoạch và
  // đánh giá -> báo cáo học tập cho từng trẻ". Nên sổ quan sát của một bé chia
  // ba tab theo ba nhóm ấy.
  //
  // BA NẤC, ĐI ĐÚNG THỨ TỰ NÀY:
  //
  //   1. Dòng đã ghi trong `hanhtrinh_quansat_nhom` — nguồn thật, ghi lúc cô
  //      bấm Lưu. Vai của cô đổi về sau KHÔNG làm quan sát cũ nhảy tab.
  //   2. Chưa có dòng (quan sát ghi trước đợt này) thì suy từ vai hiện thời.
  //   3. Không suy được thì về mặc định — chủ nhiệm.
  //
  // Nhờ nấc 2 và 3 mà ngày bảng phụ ra đời không một quan sát nào biến mất
  // khỏi màn hình: mọi quan sát cũ vẫn có tab để đứng.
  function nhomCuaQuanSat(r, classId) {
    if (!r) return nhomCo.MAC_DINH;
    try {
      const d = db.first('hanhtrinh_quansat_nhom',
        'SELECT nhom FROM hanhtrinh_quansat_nhom WHERE quanSatId = ?', [r.id]);
      if (d && nhomCo.hopLe(d.nhom)) return d.nhom;
    } catch (_) { /* bảng chưa có thì xuống nấc dưới */ }
    return nhomCo.nhomCua(db, classId || null, r.coGhi);
  }

  // Ghi nhóm cho một quan sát vừa tạo. Không bao giờ ném: thiếu dòng này thì
  // quan sát rơi về nấc 2 ở trên, tức vẫn hiện đúng chỗ hôm nay — chỉ mất
  // tính bền khi vai của cô đổi về sau. Mất một chút bền không đáng để làm
  // hỏng cả lượt ghi của cô.
  function ghiNhomChoQuanSat(quanSatId, classId, teacherId) {
    try {
      const ma = nhomCo.nhomCua(db, classId || null, teacherId);
      db.upsert('hanhtrinh_quansat_nhom', { quanSatId, nhom: ma }, ['quanSatId']);
      return ma;
    } catch (_) {
      return nhomCo.MAC_DINH;
    }
  }

  // CHƯƠNG TRÌNH CÔ ĐƯỢC GẮN QUAN SÁT VÀO, ở nhóm của một bé (góp ý 06/10,
  // mục 7: "tag tên học sinh, vào chương trình cụ thể"). Cùng luật với Kế
  // hoạch của bé: vai của cô ở nhóm đó; phần nhóm CHƯA khai cô nào giữ thì cô
  // phụ trách nhóm ghi thay. Văn phòng ghi được mọi phần.
  function nhomDuocGhi(user, classId) {
    if (user.role === 'admin') return nhomCo.NHOM.map(x => x[0]);
    const cua = nhomCo.nhomCua(db, classId || null, user.id);
    const ds = [cua];
    if (cua === nhomCo.MAC_DINH) {
      const daKhai = new Set(Object.values(nhomCo.nhomTheoLop(db, classId)));
      for (const [ma] of nhomCo.NHOM) if (ma !== cua && !daKhai.has(ma)) ds.push(ma);
    }
    return ds;
  }
  // Ghi nhóm do cô CHỌN (đã kiểm quyền) — không chọn thì như cũ, theo vai.
  function ghiNhomDaChon(quanSatId, classId, user, chon) {
    if (!chon) return ghiNhomChoQuanSat(quanSatId, classId, user.id);
    try {
      db.upsert('hanhtrinh_quansat_nhom', { quanSatId, nhom: chon }, ['quanSatId']);
      return chon;
    } catch (_) {
      return ghiNhomChoQuanSat(quanSatId, classId, user.id);
    }
  }
  function docNhomChon(res, user, classId, v) {
    const chon = chuoi(v, 20);
    if (!chon) return '';
    if (!nhomCo.hopLe(chon)) { res.status(400).json({ error: 'Chương trình chưa hợp lệ' }); return null; }
    if (!nhomDuocGhi(user, classId).includes(chon)) {
      res.status(403).json({ error: `Phần ${nhomCo.CHUONG_TRINH[chon]} do ${(nhomCo.TEN_NHOM[chon] || '').toLowerCase()} của nhóm ghi` });
      return null;
    }
    return chon;
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
  // ---- BÀI HỌC THÁNG NÀY, LỒNG TỪ "KẾ HOẠCH CỦA BÉ" (Đ191, Câu 1) ----
  //
  // Nhà trường 15/09: *"kế hoạch của từng bé sẽ được lồng ghép tiếp vào trong
  // thư mục 'hành trình của bé để cả PH và giáo viên' có thể nhìn lại trong
  // tháng này các bài dạy triển khai cho con là gì"*.
  //
  // CHỈ TÊN BÀI, TUYỆT ĐỐI KHÔNG KÈM CỘT NHÌN LẠI. Đây là chỗ câu hỏi số 1 đã
  // nêu trước khi làm: mở phần kế hoạch cho gia đình là bày ra trước mắt bố mẹ
  // những mục cô đã đánh "Chưa quan sát thấy" / "Chưa dạy", biến chúng thành
  // khoảng trống cần lấp — đúng điều QUY TẮC 2 cấm. Thứ trường thật sự xin là
  // *"các bài dạy triển khai cho con là gì"*, tức DANH SÁCH BÀI, không phải
  // bảng đánh giá. Nên `ketQua` và `nhanXet` KHÔNG bao giờ đi ra cho gia đình.
  //
  // GIA ĐÌNH CHỈ THẤY KẾ HOẠCH ĐÃ DUYỆT. Bản `nhap` / `cho-duyet` là công việc
  // cô đang làm dở — dữ liệu LỚP 1 trong bảng ba lớp của CLAUDE.md, thứ "không
  // bao giờ được lộ sang phụ huynh". Cô và quản lý thì thấy mọi trạng thái.
  //
  // ĐỌC BẢNG CỦA PHÂN HỆ KHÁC THÌ PHẢI HỎI PHÂN HỆ ẤY CÓ ĐANG BẬT KHÔNG.
  // Trường tắt Kế hoạch của bé mà đây vẫn đọc bảng của nó là một đường vòng
  // qua chốt chặn — tắt một phân hệ phải chặn được cả dữ liệu, không chỉ giấu
  // biểu tượng. Tắt thì trả về mảng RỖNG, không báo lỗi: thiếu danh sách bài
  // không làm hỏng màn hành trình, phần còn lại vẫn đọc được bình thường.
  function baiThangNayCuaBe(be, user) {
    if (!modules || typeof modules.dangBat !== 'function' || !modules.dangBat('kehoachbe')) return [];
    const chiDaDuyet = user.role === 'parent';
    try {
      const ke = db.first('kehoachbe_ke',
        'SELECT id, trangThai FROM kehoachbe_ke WHERE studentId = ? AND thang = ?',
        [be.id, ngay2.thangNay()]);
      if (!ke) return [];
      // DUYỆT THEO TỪNG CHƯƠNG TRÌNH (góp ý 06/10, mục 6): bản đã tách thì gia
      // đình thấy bài của ĐÚNG những phần đã duyệt; bản đời cũ thì cả bản phải
      // đã duyệt, như trước.
      let phanDaDuyet = null;
      if (chiDaDuyet) {
        let dong = [];
        try {
          dong = db.all('kehoachbe_ke_ct', 'SELECT chuongTrinh, trangThai FROM kehoachbe_ke_ct WHERE keId = ?', [ke.id]);
        } catch (_) { dong = []; }
        if (dong.length) phanDaDuyet = new Set(dong.filter(r => r.trangThai === 'da-duyet').map(r => r.chuongTrinh));
        else if (ke.trangThai !== 'da-duyet') return [];
      }
      return db.all('kehoachbe_muc_bai',
        `SELECT b.ten AS ten, b.gocLinhVuc AS gocLinhVuc, mb.nhan AS nhan
           FROM kehoachbe_muc_bai mb
           JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
          WHERE mb.keId = ?
          ORDER BY b.gocLinhVuc, b.thuTu, mb.rowid`, [ke.id])
        .filter(r => !phanDaDuyet || phanDaDuyet.has(chuongTrinhCuaGoc(r.gocLinhVuc)))
        // Dựng lại từng ô một thay vì trả thẳng hàng truy vấn: câu SELECT trên
        // hôm nay không lấy `ketQua`, nhưng người sửa sau có thể thêm `mb.*`
        // vào cho tiện mà không nhớ ra rằng gói này đi thẳng ra màn gia đình.
        .map(r => ({ ten: r.ten, gocLinhVuc: r.gocLinhVuc, nhan: r.nhan }));
    } catch (_) {
      return [];
    }
  }

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
      // Phần chương trình người này ghi được ở nhóm của bé (góp ý 16/10, mục
      // 6) — để tab chương trình của cô nói trước "phần này do cô khác ghi"
      // thay vì để cô gõ xong mới nhận 403. Cùng luật với đường ghi; chốt chặn
      // vẫn ở đường ghi. Gia đình không nhận khoá này.
      nhomDuocGhi: req.user.role === 'parent' ? undefined : nhomDuocGhi(req.user, be.classId),
      trangThai: trangThaiDangDung(db).map(([ma, ten]) => ({ ma, ten })),
      linhVuc: LINH_VUC.map(([ma, ten]) => ({ ma, ten })),
      // BA TAB THEO BA NHÓM CÔ (Đ195, việc 24).
      //
      // Máy chủ khai cả danh sách tab lẫn số quan sát của từng tab, để màn
      // hình không phải tự kể tên ba nhóm ra lần nữa — hai chỗ cùng nói một
      // chuyện thì sẽ trôi khỏi nhau, đúng bài học của `lib/nhom-co.js`.
      //
      // ĐẾM TRÊN CHÍNH DANH SÁCH NGƯỜI NÀY XEM ĐƯỢC, không đếm trên bảng:
      // gia đình chỉ nhận câu chuyện đã công bố, mà một con số đếm cả nháp là
      // rò ra "cô đã ghi 12 điều nhưng chỉ kể 2".
      nhomCoTab: nhomCo.NHOM.map(([ma, ten, chuongTrinh]) => ({
        ma, ten, chuongTrinh,
        soQuanSat: rows.filter(r => nhomCuaQuanSat(r, be.classId) === ma).length,
      })),
      quanSat: rows.map((r) => {
        const x = choNguoiXem(r, req.user);
        if (!x) return null;
        const ma = nhomCuaQuanSat(r, be.classId);
        return { ...x, nhomCo: ma, tenNhomCo: nhomCo.TEN_NHOM[ma] || '' };
      }).filter(Boolean),
      chuDeTuan: chuDeCuaBe(be, req.user),
      // BÀI HỌC THÁNG NÀY, LẤY TỪ KẾ HOẠCH CỦA BÉ (Đ191, Câu 1). Xem
      // `baiThangNayCuaBe` ngay dưới để biết vì sao chỉ có TÊN BÀI.
      baiThangNay: baiThangNayCuaBe(be, req.user),
      // Tên góc của kế hoạch và chương trình của từng góc, để màn hình chia bài
      // theo ba chương trình mà không phải nhét thêm khoá vào từng bài (gói bài
      // gửi gia đình giữ đúng ba khoá: tên, góc, nhãn).
      gocKeHoach: GOC_KE_HOACH.map(([ma, ten]) => ({ ma, ten, chuongTrinh: chuongTrinhCuaGoc(ma) })),
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
        // `classId`: màn bốn tab cho cô nhiều nhóm / văn phòng chọn nhóm rồi chọn bé (16/10, mục 6).
        return ds.map(s => ({
          id: s.id, hoTen: s.name, avatar: s.avatar, classId: s.classId,
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
    if (!chu) {
      // Ảnh của một NHÁP CHƯA GẮN BÉ: chỉ cô đã ghi mở được (lớp 1).
      let nhap = null;
      try { nhap = db.first('hanhtrinh_nhap', 'SELECT * FROM hanhtrinh_nhap WHERE anh = ?', [file]); } catch (_) { nhap = null; }
      if (!nhap || !file) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
      if (nhap.coGhi !== req.user.id) return res.status(403).json({ error: 'Ảnh trong ghi chép riêng của cô' });
      const dn = uploads.pathOf(file);
      if (!dn || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
      res.setHeader('Content-Type', uploads.mimeOf(file));
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.sendFile(dn);
    }
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
    const dsHs = db.studentsOf(req.user);

    // THEO CHƯƠNG TRÌNH CỦA CÔ (góp ý 06/10, mục 8): *"Mỗi giáo viên của từng
    // chương trình bắt buộc phải đăng ít nhất 1 ảnh hoặc 1 quan sát về mỗi bé
    // trong 1 tuần"*. Cô nước ngoài không được "xong việc" nhờ quan sát của cô
    // phụ trách nhóm — nên với CÔ, chỉ tính quan sát cùng chương trình với vai
    // của cô ở nhóm của bé, cộng ảnh Ghi nhanh chính cô chụp. Văn phòng thì vẫn
    // nhìn chung như trước. Trường chưa khai vai thì mọi cô là cô phụ trách
    // nhóm và mọi quan sát cũ cũng thuộc chương trình ấy — y như trước.
    const laCo = req.user.role === 'teacher';
    const ctCuaBe = new Map(dsHs.map(s => [s.id, laCo ? nhomCo.nhomCua(db, s.classId, req.user.id) : null]));
    const lopCuaBe = new Map(dsHs.map(s => [s.id, s.classId]));
    const daCo = (tuNgay, tuLuc) => {
      const co = new Set();
      for (const r of db.all('hanhtrinh_quansat',
        `SELECT id, studentId, coGhi FROM hanhtrinh_quansat WHERE ngay >= ? AND studentId IN (${marks})`, [tuNgay, ...ids])) {
        if (!laCo || nhomCuaQuanSat(r, lopCuaBe.get(r.studentId)) === ctCuaBe.get(r.studentId)) co.add(r.studentId);
      }
      if (laCo && modules && typeof modules.dangBat === 'function' && modules.dangBat('thuchup')) {
        try {
          for (const r of db.all('thuchup_ghinhanh',
            `SELECT DISTINCT studentId FROM thuchup_ghinhanh WHERE byTeacherId = ? AND taoLuc >= ? AND studentId IN (${marks})`,
            [req.user.id, tuLuc, ...ids])) co.add(r.studentId);
        } catch (_) { /* phân hệ Ghi nhanh chưa có bảng */ }
      }
      return co;
    };
    // Mốc giờ của Ghi nhanh là UTC (`taoLuc` ISO): ghép "T00:00:00" vào ngày
    // giờ Việt Nam là lệch 7 tiếng — ảnh chụp trước 7h sáng ngày đầu không được
    // tính (vòng rà Đ232). Đổi đúng 0h giờ Việt Nam ra UTC như chỗ khác trong tệp.
    const lucDau = (ngayVn) => ngay2.khoangUtcCuaNgay(ngayVn)[0];
    const coGanDay = daCo(moc, lucDau(moc));
    const be = dsHs
      .filter(s => !coGanDay.has(s.id))
      .map(s => ({ studentId: s.id, hoTen: s.name, avatar: s.avatar }))
      .sort((a, b) => String(a.hoTen).localeCompare(String(b.hoTen), 'vi'));
    // TUẦN NÀY (từ thứ Hai): bé nào chương trình của cô CHƯA có ảnh hay quan
    // sát nào. Chỉ TÊN, xếp theo tên — đây là việc của cô, không phải con số
    // về bé (QUY TẮC 2 và 4).
    const thuHai = thuHaiCua(homNay()) || homNay();
    const coTuan = daCo(thuHai, lucDau(thuHai));
    const tuanNay = dsHs
      .filter(s => !coTuan.has(s.id))
      .map(s => ({ studentId: s.id, hoTen: s.name, avatar: s.avatar }))
      .sort((a, b) => String(a.hoTen).localeCompare(String(b.hoTen), 'vi'));
    res.json({
      be,
      soNgay: NGAY_COI_LA_LAU,
      tuanNay,
      tuTuan: thuHai,
      // Cô dạy nhiều nhóm có thể mang nhiều vai — kể đủ, không lấy vai đầu.
      chuongTrinh: laCo ? [...new Set(dsHs.map(x => nhomCo.CHUONG_TRINH[ctCuaBe.get(x.id)]).filter(Boolean))].join(' và ') : '',
      loiKhuyen: 'Cô ghi rải đều trong tuần giúp nhé — dồn vào cuối tuần thì '
        + 'khoảnh khắc của các con đã qua mất rồi.',
    });
  });

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
    // B5 (20/10): một tấm ảnh hay một đoạn video đã là điều cô thấy — chữ để
    // sau cũng được. Trống cả hai thì không có gì để ghi.
    const thieuCaHai = () => res.status(400).json({ error: 'Cô mô tả giúp điều đã thấy ở bé, hoặc kèm một tấm ảnh hay đoạn video nhé' });
    if (!moTa && !b.anh && !b.video && !(nguon && nguon.file)) return thieuCaHai();
    // Chương trình cô chọn gắn quan sát vào (góp ý 06/10, mục 7–8). Không
    // gửi = theo vai của cô như trước.
    const nhomChon = docNhomChon(res, req.user, be.classId, b.nhom);
    if (nhomChon === null) return;

    let anh = '';
    if (b.anh || b.video) {
      const t = luuTepLop1(b);
      if (t.loi) return res.status(400).json({ error: t.loi });
      anh = t.file;
    } else if (nguon && nguon.file) {
      // CHÉP TỆP, KHÔNG DÙNG CHUNG TÊN TỆP.
      //
      // Dùng chung thì hai bản ghi có vòng đời buộc vào nhau: xoá bản Ghi nhanh
      // là ảnh của quan sát trắng theo, mà người xoá không hề biết. Một tấm ảnh
      // vài trăm KB là cái giá rẻ hơn nhiều so với một tấm ảnh biến mất.
      try { anh = chepAnh(nguon.file); } catch (_) { anh = ''; }
    }
    // Ghi nhanh chỉ có ảnh mà tệp đã mất thì không còn gì để ghi.
    if (!moTa && !anh) return thieuCaHai();

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
    // Đóng dấu chương trình NGAY LÚC GHI (Đ195, việc 24) — xem chú thích ở
    // `nhomCuaQuanSat` để biết vì sao không suy ra lúc đọc.
    const nhom = ghiNhomDaChon(rec.id, be.classId, req.user, nhomChon);
    db.audit(req.user.id, 'hanhtrinh-quan-sat', be.id, { ngay, coAnh: !!anh, nhom });
    res.status(201).json({ ...choNguoiXem(rec, req.user), nhomCo: nhom, tenNhomCo: nhomCo.TEN_NHOM[nhom] || '' });
  });

  // ===========================================================================
  // NHÁP CHƯA GẮN BÉ (góp ý 06/10, mục 7) — LỚP 1, CHỈ CÔ ĐÃ GHI
  // ===========================================================================
  const TOI_DA_NHAP_MOI_CO = 200;
  function goiNhap(r) {
    return { id: r.id, moTa: r.moTa, coAnh: !!r.anh, anh: r.anh || '', laVideo: uploads.laVideo(r.anh), nhom: r.nhom || '',
      tenChuongTrinh: nhomCo.CHUONG_TRINH[r.nhom] || '', taoLuc: r.taoLuc };
  }
  // PHẠM VI SUY RA TỪ CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP, NGAY TRONG CÂU TRUY VẤN:
  // nháp của cô khác không đọc ra được, và cũng không lộ là có tồn tại (404,
  // không phải 403). Kể cả văn phòng — nháp chưa gắn bé là ghi chép riêng của
  // đúng một người.
  function nhapCuaToi(req, res) {
    let r = null;
    try {
      r = db.first('hanhtrinh_nhap', 'SELECT * FROM hanhtrinh_nhap WHERE coGhi = ? AND id = ?',
        [req.user.id, chuoi(req.params.id, 40)]);
    } catch (_) { r = null; }
    if (!r) { res.status(404).json({ error: 'Không tìm thấy bản nháp này' }); return null; }
    return r;
  }

  app.get('/api/hanhtrinh/nhap', requireRole('teacher', 'admin'), (req, res) => {
    let ds = [];
    try {
      ds = db.all('hanhtrinh_nhap', 'SELECT * FROM hanhtrinh_nhap WHERE coGhi = ? ORDER BY taoLuc DESC LIMIT ?',
        [req.user.id, TOI_DA_NHAP_MOI_CO]);
    } catch (_) { ds = []; }
    res.json({ nhap: ds.map(goiNhap), chuongTrinh: nhomCo.NHOM.map(([ma, ten, ct]) => ({ ma, ten, chuongTrinh: ct })) });
  });

  app.post('/api/hanhtrinh/nhap', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const moTa = chuoi(b.moTa, TOI_DA_MO_TA);
    if (!moTa && !b.anh && !b.video) return res.status(400).json({ error: 'Cô ghi một dòng hoặc chọn một tấm ảnh, đoạn video nhé' });
    const nhom = chuoi(b.nhom, 20);
    if (nhom && !nhomCo.hopLe(nhom)) return res.status(400).json({ error: 'Chương trình chưa hợp lệ' });
    const soNhap = db.count('SELECT COUNT(*) AS n FROM hanhtrinh_nhap WHERE coGhi = ?', [req.user.id]);
    if (soNhap >= TOI_DA_NHAP_MOI_CO) {
      return res.status(400).json({ error: 'Cô đang có nhiều nháp chưa gắn bé quá — gắn bé hoặc bỏ bớt rồi ghi tiếp nhé' });
    }
    const t = luuTepLop1(b);
    if (t.loi) return res.status(400).json({ error: t.loi });
    const anh = t.file;
    const luc = new Date().toISOString();
    const rec = { id: db.nextId('htn'), coGhi: req.user.id, moTa, anh, nhom, taoLuc: luc, capNhatLuc: luc };
    db.insert('hanhtrinh_nhap', rec);
    db.audit(req.user.id, 'hanhtrinh-nhap', null, { coAnh: !!anh, nhom: nhom || undefined });
    res.status(201).json({ ok: true, nhap: goiNhap(rec) });
  });

  // GẮN BÉ + CHƯƠNG TRÌNH: nháp thành một quan sát lớp 1 bình thường của bé,
  // đi tiếp đúng luồng cũ (suy ngẫm → kể cho gia đình). Nháp được gỡ khỏi
  // bảng nháp trong cùng giao dịch — không có hai bản của cùng một ghi chép.
  app.post('/api/hanhtrinh/nhap/:id/gan', requireRole('teacher', 'admin'), (req, res) => {
    const r = nhapCuaToi(req, res);
    if (!r) return;
    const b = req.body || {};
    const be = db.findStudent(chuoi(b.studentId, 40));
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, be.id)) {
      return res.status(403).json({ error: `Không có quyền ghi hành trình cho bé ${be.name}` });
    }
    if (chanNeuNgungHoSo(res, be.id)) return;
    const nhomChon = docNhomChon(res, req.user, be.classId, b.nhom !== undefined ? b.nhom : r.nhom);
    if (nhomChon === null) return;
    const moTa = chuoi(b.moTa, TOI_DA_MO_TA) || r.moTa;
    if (!moTa && !r.anh) return res.status(400).json({ error: 'Cô mô tả giúp điều đã thấy ở bé nhé' });
    const ngayGhi = String(ngay2.ngayCua(Date.parse(r.taoLuc) || Date.now()));
    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('ht'), studentId: be.id, ngay: ngayGhi > homNay() ? homNay() : ngayGhi,
      moTa, anh: r.anh || '', ghiNhanhId: '',
      linhVuc: '', trangThai: '', minhChung: '', oLopLamGi: '',
      suyNgamLuc: null, giaySuyNgam: null,
      cauChuyen: '', cungConONha: '', congBoLuc: null,
      coGhi: req.user.id, taoLuc: r.taoLuc || luc, capNhatLuc: luc,
    };
    let nhom = '';
    db.tx(() => {
      db.insert('hanhtrinh_quansat', rec);
      nhom = ghiNhomDaChon(rec.id, be.classId, req.user, nhomChon);
      db.run('DELETE FROM hanhtrinh_nhap WHERE id = ?', [r.id]);
    });
    db.audit(req.user.id, 'hanhtrinh-nhap-gan', be.id, { nhapId: r.id, quanSatId: rec.id, nhom });
    res.status(201).json({ ...choNguoiXem(rec, req.user), nhomCo: nhom, tenNhomCo: nhomCo.TEN_NHOM[nhom] || '' });
  });

  // NHÁP QUÁ 30 NGÀY CHƯA GẮN BÉ THÌ TỰ BỎ, KỂ CẢ ẢNH (chủ dự án chốt 07/10).
  //
  // Nháp có thể mang ảnh khuôn mặt trẻ mà chưa thuộc hồ sơ bé nào — để lâu là
  // giữ dữ liệu nhạy cảm không ai dùng. Đồng hồ định giờ (mỗi 15 phút) bỏ dòng
  // nháp và tệp ảnh của nó; ảnh chỉ bị xoá khi KHÔNG quan sát nào đang dùng
  // đúng tệp ấy. Phân hệ đang TẮT thì không dọn: tắt một phân hệ là dữ liệu của
  // nó giữ nguyên (CLAUDE.md), bật lại cô vẫn thấy nháp của mình.
  const NGAY_GIU_NHAP = 30;
  function donNhapCu() {
    if (!modules || typeof modules.dangBat !== 'function' || !modules.dangBat('hanhtrinh')) return 0;
    const moc = new Date(Date.now() - NGAY_GIU_NHAP * 86400000).toISOString();
    let ds = [];
    try {
      ds = db.all('hanhtrinh_nhap', 'SELECT id, anh FROM hanhtrinh_nhap WHERE taoLuc < ? LIMIT 500', [moc]);
    } catch (_) { return 0; }
    for (const r of ds) {
      db.run('DELETE FROM hanhtrinh_nhap WHERE id = ?', [r.id]);
      if (r.anh && !db.first('hanhtrinh_quansat', 'SELECT id FROM hanhtrinh_quansat WHERE anh = ?', [r.anh])) {
        uploads.remove(r.anh);
      }
    }
    return ds.length;
  }
  require('../../lib/hen-gio').dangKy('hanhtrinh:don-nhap-cu', donNhapCu);

  // Bỏ một nháp ghi nhầm. Đây là ghi chép của chính cô, chưa gắn bé nào và
  // chưa ai khác đọc — bỏ hẳn, không cần giữ vết.
  app.delete('/api/hanhtrinh/nhap/:id', requireRole('teacher', 'admin'), (req, res) => {
    let r = null;
    try {
      r = db.first('hanhtrinh_nhap', 'SELECT * FROM hanhtrinh_nhap WHERE coGhi = ? AND id = ?',
        [req.user.id, chuoi(req.params.id, 40)]);
    } catch (_) { r = null; }
    if (!r) return res.status(404).json({ error: 'Không tìm thấy bản nháp này' });
    db.run('DELETE FROM hanhtrinh_nhap WHERE id = ? AND coGhi = ?', [r.id, req.user.id]);
    // Bỏ nháp là bỏ cả ẢNH — ảnh khuôn mặt trẻ chưa thuộc hồ sơ bé nào, và
    // xoá dòng rồi thì việc dọn 30 ngày không còn thấy tệp này nữa (vòng rà
    // Đ232). Ảnh mà một quan sát đang dùng thì giữ, cùng luật với việc dọn.
    if (r.anh && !db.first('hanhtrinh_quansat', 'SELECT id FROM hanhtrinh_quansat WHERE anh = ?', [r.anh])) {
      try { uploads.remove(r.anh); } catch (_) { /* tệp đã không còn */ }
    }
    db.audit(req.user.id, 'hanhtrinh-nhap-bo', null, { nhapId: r.id });
    res.json({ ok: true });
  });

  // ===========================================================================
  // "HÌNH ẢNH GHI NHANH" — MỌI THỨ CÔ ĐÃ GHI MÀ CHƯA KỂ (Đ242B, B1/B7)
  // ===========================================================================
  //
  // Ba nguồn, một danh sách: nháp chưa gắn bé, quan sát chưa kể cho gia đình,
  // và Ghi nhanh chưa chép sang. KHÔNG lọc ngày: mục chưa kể thì còn nằm đó
  // tới khi cô kể hoặc bỏ — lọc theo ngày là để nó lặng lẽ trôi mất.
  //
  // CHỈ CỦA NGƯỜI ĐANG ĐĂNG NHẬP, kể cả văn phòng: cả ba nguồn đều là lớp 1.
  const TOI_DA_CHO_KE = 200;
  const tepLop1 = (file) => (file ? `/api/hanhtrinh/anh/${file}` : '');

  // { quanSatId → nhóm đã đóng dấu lúc ghi } cho cả danh sách một lượt.
  function nhomDaGhiCua(qsIds) {
    const ra = new Map();
    if (!qsIds.length) return ra;
    try {
      for (const d of db.all('hanhtrinh_quansat_nhom',
        `SELECT quanSatId, nhom FROM hanhtrinh_quansat_nhom WHERE quanSatId IN (${qsIds.map(() => '?').join(',')})`, qsIds)) {
        if (nhomCo.hopLe(d.nhom)) ra.set(d.quanSatId, d.nhom);
      }
    } catch (_) { /* bảng chưa có thì suy từ vai, như nhomCuaQuanSat */ }
    return ra;
  }

  app.get('/api/hanhtrinh/cho-ke', requireRole('teacher', 'admin'), (req, res) => {
    const me = req.user.id;
    const beTheoMa = new Map(db.studentsOf(req.user).map(s => [s.id, s]));
    const ids = db.studentIdsOf(req.user);
    const muc = [];

    let nhap = [];
    try {
      nhap = db.all('hanhtrinh_nhap', 'SELECT * FROM hanhtrinh_nhap WHERE coGhi = ? ORDER BY taoLuc DESC LIMIT ?',
        [me, TOI_DA_CHO_KE]);
    } catch (_) { nhap = []; }
    for (const r of nhap) {
      muc.push({
        nguon: 'nhap', id: r.id, studentId: null, hoTen: '', moTa: r.moTa || '',
        coTep: !!r.anh, laVideo: uploads.laVideo(r.anh), tepUrl: tepLop1(r.anh),
        nhom: r.nhom || '', goc: '', taoLuc: r.taoLuc,
      });
    }

    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      const qs = db.all('hanhtrinh_quansat',
        `SELECT * FROM hanhtrinh_quansat
          WHERE coGhi = ? AND congBoLuc IS NULL AND studentId IN (${marks})
          ORDER BY taoLuc DESC LIMIT ?`, [me, ...ids, TOI_DA_CHO_KE]);
      const nhomDaGhi = nhomDaGhiCua(qs.map(r => r.id));
      for (const r of qs) {
        const be = beTheoMa.get(r.studentId) || {};
        muc.push({
          nguon: 'quansat', id: r.id, studentId: r.studentId, hoTen: be.name || '', moTa: r.moTa || '',
          coTep: !!r.anh, laVideo: uploads.laVideo(r.anh), tepUrl: tepLop1(r.anh),
          nhom: nhomDaGhi.get(r.id) || nhomCo.nhomCua(db, be.classId || null, r.coGhi), goc: '',
          // Câu chuyện cô soạn dở (nháp lớp 3 của chính cô) — để hộp hoàn
          // thiện mở ra đúng chữ cô đã gõ.
          cauChuyen: r.cauChuyen || '', cungConONha: r.cungConONha || '',
          taoLuc: r.taoLuc,
        });
      }

      // Ghi nhanh là phân hệ KHÁC: hỏi công tắc, bọc lỗi (xem ghiNhanhChuaDung).
      if (modules && typeof modules.dangBat === 'function' && modules.dangBat('thuchup')) {
        try {
          const gn = db.all('thuchup_ghinhanh',
            `SELECT * FROM thuchup_ghinhanh
              WHERE byTeacherId = ? AND studentId IN (${marks})
                AND id NOT IN (SELECT ghiNhanhId FROM hanhtrinh_quansat WHERE ghiNhanhId <> '')
              ORDER BY taoLuc DESC LIMIT ?`, [me, ...ids, TOI_DA_CHO_KE]);
          for (const r of gn) {
            muc.push({
              nguon: 'ghinhanh', id: r.id, studentId: r.studentId, hoTen: (beTheoMa.get(r.studentId) || {}).name || '',
              moTa: r.note || '', coTep: !!r.file, laVideo: uploads.laVideo(r.file),
              tepUrl: r.file ? `/api/thuchup/anh/${r.id}` : '', nhom: '', goc: '', taoLuc: r.taoLuc,
            });
          }
        } catch (_) { /* phân hệ Ghi nhanh đã gỡ — hai nguồn kia vẫn đủ */ }
      }
    }

    muc.sort((a, b) => String(b.taoLuc || '').localeCompare(String(a.taoLuc || '')));
    res.json({
      muc,
      toiDaVideo: uploads.MAX_VIDEO_BYTES,
      chuongTrinh: nhomCo.NHOM.map(([ma, ten, ct]) => ({ ma, ten, chuongTrinh: ct })),
    });
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
  // =========================================================================
  // KHỐI KẾ HOẠCH CHUNG TUẦN — phần THÊM của chủ đề (Đ201, việc 44)
  // =========================================================================
  //
  // Nhà trường muốn ở đầu Lịch sinh hoạt có một khối *"kế hoạch chung tuần
  // này"*: chủ đề, bài hát, Casa talkshow, lời nhắc gia đình, đường dẫn video,
  // tệp PDF/Word. Chủ đề đã có từ Đ141; đợt này thêm năm phần còn lại.
  //
  // THÊM BÊN CẠNH, KHÔNG SỬA CÁI ĐANG CHẠY. Bảng `hanhtrinh_chude` không bị
  // chạm một cột nào, đường `PUT /api/hanhtrinh/chu-de` vẫn nhận đúng những
  // gì nó nhận hôm qua, và một tuần chỉ có chủ đề vẫn hiện y như cũ. Lý do
  // đầy đủ ở đầu khối `hanhtrinh_chude_them` trong schema.sql.
  //
  // AI SOẠN: giữ nguyên `teacher, admin` như trước. Nhà trường xin THÊM quyền
  // cho văn phòng, mà văn phòng đã là vai `admin` nên họ soạn được sẵn rồi —
  // không phải lấy đi của ai. Nhắc ra đây vì đợt Đ198 vừa chuyển kế hoạch
  // chung về văn phòng, và đọc lướt rất dễ tưởng chỗ này cũng phải cắt của cô.
  const TOI_DA_TEP_TUAN_CHUDE = 5;
  const TOI_DA_TEN_TEP = 120;
  const LOAI_TEP_CHUDE = ['pdf', 'docx', 'anh'];

  // ĐƯỜNG DẪN NGƯỜI KHÁC BẤM VÀO — CHỈ NHẬN http/https.
  //
  // Ô này do cô hoặc văn phòng gõ, rồi màn hình của GIA ĐÌNH dựng thành một
  // thẻ bấm được. Một chuỗi `javascript:...` lọt vào đó là mã chạy trong phiên
  // của người bấm. Lọc Ở MÁY CHỦ chứ không chỉ ở màn hình: màn hình là thứ
  // người ta bỏ qua được, đường API thì không.
  //
  // Không nhận thì trả về rỗng chứ không từ chối cả lượt ghi — cô gõ nhầm một
  // đường dẫn không được làm mất cả bài hát lẫn lời nhắc vừa soạn.
  function duongDanAnToan(v) {
    const t = chuoi(v, 500);
    if (!t) return '';
    return /^https?:\/\//i.test(t) ? t : '';
  }

  function themCua(classId, tuan) {
    try {
      return db.first('hanhtrinh_chude_them',
        'SELECT * FROM hanhtrinh_chude_them WHERE classId = ? AND tuan = ?', [classId, tuan]) || null;
    } catch (_) { return null; }
  }
  // Danh sách tệp của một tuần. KHÔNG trả `file` ra ngoài — tên tệp thật trong
  // kho là thứ chỉ máy chủ cần biết; in ra là mời người ta thử đoán tệp khác.
  function tepCuaTuan(classId, tuan) {
    try {
      return db.all('hanhtrinh_chude_tep',
        `SELECT id, tenGoc, bytes, loai, taoLuc FROM hanhtrinh_chude_tep
         WHERE classId = ? AND tuan = ? ORDER BY rowid`, [classId, tuan]);
    } catch (_) { return []; }
  }
  // Gói phần thêm về đúng hình dạng màn hình đọc. KHÔNG CÓ DÒNG thì mọi ô là
  // chuỗi rỗng, không phải `null` — màn hình khỏi phải phòng hai kiểu trống.
  function goiThem(t) {
    return {
      baiHat: (t && t.baiHat) || '',
      linkBaiHat: (t && t.linkBaiHat) || '',
      talkshow: (t && t.talkshow) || '',
      linkTalkshow: (t && t.linkTalkshow) || '',
      nhacGiaDinh: (t && t.nhacGiaDinh) || '',
    };
  }
  // Có gì để hiện không — dùng cho khối ở đầu Lịch sinh hoạt.
  function themCoGi(g) {
    return !!(g.baiHat || g.linkBaiHat || g.talkshow || g.linkTalkshow || g.nhacGiaDinh);
  }
  // Ghi phần thêm. Chỉ chạm những ô người gửi CÓ gửi lên: một bản giao diện
  // đời cũ không biết tới năm ô này vẫn sửa được chủ đề mà không xoá mất phần
  // thêm cô đã soạn từ màn mới.
  function ghiThem(classId, tuan, b, userId) {
    const co = ['baiHat', 'linkBaiHat', 'talkshow', 'linkTalkshow', 'nhacGiaDinh']
      .some(k => Object.prototype.hasOwnProperty.call(b, k));
    if (!co) return;
    const cu = themCua(classId, tuan);
    const luc = new Date().toISOString();
    const rec = {
      baiHat: Object.prototype.hasOwnProperty.call(b, 'baiHat')
        ? chuoi(b.baiHat, 200) : ((cu && cu.baiHat) || ''),
      linkBaiHat: Object.prototype.hasOwnProperty.call(b, 'linkBaiHat')
        ? duongDanAnToan(b.linkBaiHat) : ((cu && cu.linkBaiHat) || ''),
      talkshow: Object.prototype.hasOwnProperty.call(b, 'talkshow')
        ? chuoi(b.talkshow, 200) : ((cu && cu.talkshow) || ''),
      linkTalkshow: Object.prototype.hasOwnProperty.call(b, 'linkTalkshow')
        ? duongDanAnToan(b.linkTalkshow) : ((cu && cu.linkTalkshow) || ''),
      nhacGiaDinh: Object.prototype.hasOwnProperty.call(b, 'nhacGiaDinh')
        ? chuoi(b.nhacGiaDinh, TOI_DA_MO_TA) : ((cu && cu.nhacGiaDinh) || ''),
      coGhi: userId, capNhatLuc: luc,
    };
    if (cu) db.update('hanhtrinh_chude_them', cu.id, rec);
    else db.insert('hanhtrinh_chude_them', { id: db.nextId('htt'), classId, tuan, ...rec, taoLuc: luc });
  }

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
    // `them` và `tep` là hai khoá THÊM VÀO, không đổi khoá nào đang có:
    // màn hình đời cũ đọc `chuDe`/`tuanTruoc` vẫn chạy y như hôm qua.
    const them = goiThem(themCua(classId, tuan));
    res.json({
      classId, tuan,
      chuDe: nay || null,
      tuanTruoc: truoc ? { tuan: truoc.tuan, chuDe: truoc.chuDe } : null,
      duocSoan: req.user.role === 'teacher' || req.user.role === 'admin',
      them,
      coKhoiChung: !!(nay || themCoGi(them) || tepCuaTuan(classId, tuan).length),
      tep: tepCuaTuan(classId, tuan),
      toiDaTep: TOI_DA_TEP_TUAN_CHUDE,
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

    ghiThem(classId, tuan, b, req.user.id);

    db.audit(req.user.id, 'hanhtrinh-chu-de', classId, { tuan });
    res.json({
      ...db.first('hanhtrinh_chude',
        'SELECT * FROM hanhtrinh_chude WHERE classId = ? AND tuan = ?', [classId, tuan]),
      them: goiThem(themCua(classId, tuan)),
    });
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
    // CHÉP CẢ PHẦN THÊM. Chép chủ đề mà bỏ lại bài hát với lời nhắc thì nút
    // "chép tuần trước" chỉ đỡ cho cô đúng một ô, còn năm ô kia vẫn phải gõ
    // lại — mà đó mới là phần dài.
    const themTruoc = themCua(classId, truoc.tuan);
    if (themTruoc) {
      db.insert('hanhtrinh_chude_them', {
        id: db.nextId('htt'), classId, tuan,
        baiHat: themTruoc.baiHat, linkBaiHat: themTruoc.linkBaiHat,
        talkshow: themTruoc.talkshow, linkTalkshow: themTruoc.linkTalkshow,
        nhacGiaDinh: themTruoc.nhacGiaDinh,
        coGhi: req.user.id, taoLuc: luc, capNhatLuc: luc,
      });
    }
    // TỆP THÌ KHÔNG CHÉP — cố ý. Một tệp là một bản kế hoạch của ĐÚNG tuần đó;
    // chép sang tuần mới là gia đình mở ra thấy lịch của tuần trước mà không
    // có gì báo. Chỗ này thà để trống còn hơn để sai.
    db.audit(req.user.id, 'hanhtrinh-chu-de-chep', classId, { tuan, tuNhap: truoc.tuan });
    res.json({ ok: true, tuan, chepTu: truoc.tuan, chepThem: !!themTruoc });
  });

  // =========================================================================
  // TỆP ĐÍNH KÈM CỦA TUẦN (Đ201, việc 44)
  // =========================================================================
  //
  // Cùng khuôn với tệp thực đơn (Đ160): hai kho khác nhau, chọn theo BYTE ĐẦU
  // TỆP chứ không theo lời khai của trình duyệt, và đường tải ĐI QUA CANH
  // QUYỀN chứ không phục vụ tĩnh.
  //
  // Khác một chỗ đáng kể: tệp thực đơn thuộc về một CƠ SỞ, tệp ở đây thuộc về
  // một NHÓM LỚP. Nên chốt chặn là `db.canAccessClass` — gia đình nhóm khác
  // không mở được kể cả khi đoán trúng mã tệp.
  app.post('/api/hanhtrinh/chu-de/tep', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = chuoi(b.classId, 40);
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền treo tệp cho nhóm này' });
    }
    const tuan = thuHaiCua(NGAY_RE.test(String(b.tuan || '')) ? b.tuan : homNay());
    if (!tuan) return res.status(400).json({ error: 'Tuần chưa đúng dạng' });

    const dangCo = tepCuaTuan(classId, tuan).length;
    if (dangCo >= TOI_DA_TEP_TUAN_CHUDE) {
      return res.status(400).json({
        error: `Mỗi tuần treo tối đa ${TOI_DA_TEP_TUAN_CHUDE} tệp. Xoá bớt tệp cũ rồi tải lại nhé.`,
      });
    }

    const dataUrl = String(b.dataUrl || '');
    if (!dataUrl.startsWith('data:')) return res.status(400).json({ error: 'Chưa chọn tệp nào' });

    let luu = null;
    let loai = '';
    try {
      const r = uploads.saveTaiLieuDataUrl(dataUrl);
      luu = r; loai = r.ext;
    } catch (_) {
      try {
        const r = uploads.saveDataUrl(dataUrl);
        luu = r; loai = 'anh';
      } catch (err) {
        return res.status(400).json({
          error: 'Tệp này app chưa nhận được. Nhận ảnh chụp, PDF hoặc Word.',
        });
      }
    }
    if (!LOAI_TEP_CHUDE.includes(loai)) {
      try { if (loai === 'anh') uploads.remove(luu.file); else uploads.removeTaiLieu(luu.file); } catch (_) { /* dọn là việc phụ */ }
      return res.status(400).json({ error: 'Loại tệp này app chưa nhận được' });
    }

    const rec = {
      id: db.nextId('htep'), classId, tuan, file: luu.file,
      tenGoc: chuoi(b.ten, TOI_DA_TEN_TEP) || `Kế hoạch tuần ${tuan}`,
      bytes: Number(luu.bytes) || 0, loai,
      nguoiTai: req.user.id, taoLuc: new Date().toISOString(),
    };
    db.insert('hanhtrinh_chude_tep', rec);
    db.audit(req.user.id, 'hanhtrinh-chu-de-tep-them', rec.id, { classId, tuan, loai });
    res.status(201).json({ ok: true, tep: tepCuaTuan(classId, tuan) });
  });

  app.delete('/api/hanhtrinh/chu-de/tep/:id', requireRole('teacher', 'admin'), (req, res) => {
    const t = db.first('hanhtrinh_chude_tep',
      'SELECT * FROM hanhtrinh_chude_tep WHERE id = ?', [String(req.params.id || '')]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp này' });
    if (!db.canAccessClass(req.user, t.classId)) {
      return res.status(403).json({ error: 'Tệp này thuộc nhóm khác' });
    }
    db.remove('hanhtrinh_chude_tep', t.id);
    // Dọn tệp trong kho là VIỆC PHỤ: dòng đã xoá rồi thì không ai mở được nữa,
    // còn kho mồ côi một tệp thì lần dọn sau nhặt.
    try {
      if (t.loai === 'anh') uploads.remove(t.file);
      else uploads.removeTaiLieu(t.file);
    } catch (_) { /* tệp đã mất thì thôi */ }
    db.audit(req.user.id, 'hanhtrinh-chu-de-tep-xoa', t.id, { classId: t.classId, tuan: t.tuan });
    res.json({ ok: true, tep: tepCuaTuan(t.classId, t.tuan) });
  });

  // Tải một tệp. Gia đình của bé trong nhóm đọc được — đây là kế hoạch tuần
  // của con họ; `canAccessClass` đã lo đúng vế ấy cho cả bốn vai.
  app.get('/api/hanhtrinh/chu-de/tep/:id', (req, res) => {
    const t = db.first('hanhtrinh_chude_tep',
      'SELECT * FROM hanhtrinh_chude_tep WHERE id = ?', [String(req.params.id || '')]);
    if (!t) return res.status(404).json({ error: 'Không tìm thấy tệp này' });
    if (!db.canAccessClass(req.user, t.classId)) {
      return res.status(403).json({ error: 'Tệp này thuộc nhóm khác' });
    }
    const duong = t.loai === 'anh' ? uploads.pathOf(t.file) : uploads.pathOfTaiLieu(t.file);
    const con = t.loai === 'anh' ? uploads.exists(t.file) : uploads.existsTaiLieu(t.file);
    if (!duong || !con) return res.status(404).json({ error: 'Tệp không còn trên máy chủ' });
    res.setHeader('Content-Type', t.loai === 'anh' ? uploads.mimeOf(t.file) : uploads.mimeOfTaiLieu(t.file));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(t.tenGoc)}`);
    fs.createReadStream(duong).pipe(res);
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
      // Có ảnh hay video thì chữ được để trống (B5) — tệp đã là điều cô thấy.
      if (!m && !cu.anh) return res.status(400).json({ error: 'Phần mô tả không được để trống' });
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
      // Cô: đúng nhóm mình phụ trách. Quản trị (góp ý 20/10, B6): nhóm thuộc
      // phạm vi của mình — `canAccessClass` đã siết theo cơ sở, giống
      // `datDuocCheDo` ở routes/albums.js.
      const luuDuoc = req.user.role === 'teacher'
        ? db.isTeacherOfClass(req.user.id, album.classId)
        : req.user.role === 'admin' && db.canAccessClass(req.user, album.classId);
      if (!luuDuoc) {
        return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm của album, hoặc văn phòng / ban giám hiệu phụ trách nhóm đó, mới lưu ảnh vào album được' });
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
