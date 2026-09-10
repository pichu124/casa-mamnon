// Phân hệ Album ảnh: giáo viên đăng album cho lớp, phụ huynh xem album lớp của con.
//
// Ảnh có hai dạng cùng tồn tại:
//   - Ảnh thật do giáo viên tải lên  → { id, file, caption }
//   - Ảnh minh họa bằng emoji (dữ liệu cũ) → { id, emoji, g: [màu1, màu2], caption }
const fs = require('fs');
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const uploads = require('../lib/uploads');
const { requireRole } = require('../lib/auth');
const lsl = require('../lib/lich-su-lop');
const nl = require('../lib/nhom-lop');
const tb = require('../lib/thong-bao');
const tbb = require('../lib/thong-bao-be');

// HAI CHẾ ĐỘ ALBUM (Đ144) — xem chú thích bảng `album_che_do` trong lib/schema.sql.
//   'cong-khai' — mọi gia đình trong nhóm thấy (vẫn qua luật đồng ý chia sẻ).
//   'theo-the'  — gia đình chỉ thấy tấm có con mình được gắn thẻ.
// Không có dòng = 'cong-khai' = đúng cách mọi album đang có đang hiện.
const CHE_DO = ['cong-khai', 'theo-the'];

// Bảng cặp màu gradient pastel cho ảnh minh họa bằng emoji.
const GRADIENTS = [
  ['#ff9a9e', '#fad0c4'],
  ['#a18cd1', '#fbc2eb'],
  ['#84fab0', '#8fd3f4'],
  ['#ffecd2', '#fcb69f'],
  ['#89f7fe', '#66a6ff'],
  ['#d4fc79', '#96e6a1'],
  ['#a1c4fd', '#c2e9fb'],
  ['#fccb90', '#d57eeb'],
];

const MAX_PHOTOS_PER_ALBUM = 60;

function todayStr() {
  return ngay.homNay();
}

// Dựng bản ghi ảnh từ dữ liệu trình duyệt gửi lên.
// Ưu tiên ảnh thật; không có ảnh thì quay về emoji minh họa như trước.
function buildPhoto(input, index) {
  const p = input || {};
  const caption = String(p.caption || '').trim().slice(0, 200);
  // VIDEO LƯU THÀNH MỘT DÒNG Y NHƯ ẢNH — và đó là cả thiết kế.
  //
  // Một đoạn video quay cả nhóm còn lộ nhiều hơn một tấm ảnh: có mặt, có
  // giọng, có tên các bé gọi nhau. Nên nó KHÔNG được có một đường đi riêng.
  //
  // Cùng bảng `album_photos`, cùng cột `file`, cùng bảng gắn thẻ bé
  // `photo_students` → nó đi qua đúng `locAnhChoNguoiXem` mà ảnh đang đi qua.
  // Không phải "cũng có kiểm tra tương tự": là CÙNG MỘT ĐƯỜNG, nên không có
  // chỗ nào để hai đường trôi khỏi nhau.
  //
  // Màn hình phân biệt ảnh với video bằng phần mở rộng của tên tệp
  // (`uploads.laVideo`), không cần thêm cột nào.
  if (p.video) {
    const { file } = uploads.saveVideoDataUrl(p.video); // ném lỗi nếu không phải video
    return { id: db.nextId('ph'), file, caption };
  }
  if (p.dataUrl) {
    const { file } = uploads.saveDataUrl(p.dataUrl); // ném lỗi nếu ảnh không hợp lệ
    return { id: db.nextId('ph'), file, caption };
  }
  return {
    id: db.nextId('ph'),
    emoji: String(p.emoji || '').trim() || '📷',
    g: GRADIENTS[index % GRADIENTS.length],
    caption,
  };
}

// Ảnh của một album, theo đúng thứ tự hiển thị.
function photosOf(albumId) {
  return db.all('album_photos',
    'SELECT * FROM album_photos WHERE albumId = ? ORDER BY position, rowid', [albumId]);
}

// Ảnh của NHIỀU album một lượt — một câu thay vì một câu mỗi album.
//
// GIỮ NGUYÊN `position, rowid`. Ảnh bìa của mỗi album chính là phần tử [0] sau
// khi lọc, nên xếp thiếu tiêu chí phụ là bìa của mọi album đổi tấm — không bài
// canh nào bắt được, nhưng cô mở ra là thấy ngay.
function photosOfNhieu(albumIds) {
  const ra = new Map();
  const sach = [...new Set((albumIds || []).filter(Boolean))];
  for (const id of sach) ra.set(id, []);
  if (!sach.length) return ra;
  const marks = sach.map(() => '?').join(',');
  for (const p of db.all('album_photos',
    `SELECT * FROM album_photos WHERE albumId IN (${marks}) ORDER BY albumId, position, rowid`,
    sach)) {
    ra.get(p.albumId).push(p);
  }
  return ra;
}

// Xóa tệp ảnh khỏi đĩa (ảnh emoji thì không có tệp nào để xóa).
function removeFiles(photos) {
  for (const p of photos || []) {
    if (p && p.file) uploads.remove(p.file);
  }
}

// ---------------------------------------------------------------------------
// Album của lớp ĐÃ ĐÓNG
//
// Quyền xem album đi qua danh sách lớp ĐANG MỞ, nên ngay khi bấm "Chuyển năm
// học" toàn bộ album của năm cũ rơi khỏi tầm với của MỌI vai — kể cả quản trị.
// Ảnh vẫn nằm nguyên trong cơ sở dữ liệu và trên ổ đĩa, chỉ là không ai xem
// được, và cũng không ai xóa được nên ổ đĩa cứ đầy dần.
//
// Mở lại cho ba vai, và chỉ với lớp đã đóng:
//   • quản trị — để nhà trường lấy lại được ảnh cũ và dọn được ổ đĩa;
//   • cô TỪNG phụ trách nhóm đó. Lúc chuyển năm, dòng trong `class_teachers`
//     được giữ nguyên (nhóm chỉ bị đánh dấu đã đóng), nên vẫn nhận ra được là ai
//     — và nhận ra được CẢ 2–3 cô của nhóm, không riêng cô phụ trách chính;
//   • phụ huynh — nhưng CHỈ phần ảnh chụp trong đúng khoảng con còn học lớp đó.
//
// Vế cuối là điều kiện bắt buộc, không phải chi tiết làm cho đẹp: album chứa mặt
// nhiều trẻ khác. Mở cả lớp cũ thì một em chuyển đi tháng 10 vẫn xem được ảnh
// chụp tháng 12, tức gia đình đó xem được ảnh các bạn sau khi con mình đã rời
// lớp. `lib/lich-su-lop.js` giữ đúng khoảng đó.
//
// CỐ Ý KHÔNG nới `db.classIdsOf`. Hàm đó đang được 8 chỗ dùng — điểm danh, huy
// hiệu trang chủ, thông báo, khảo sát, kế hoạch, thời khóa biểu, album. Nới nó
// ra là đổi hành vi cả 8 chỗ trong một lần đẩy.
// ---------------------------------------------------------------------------
function lopDaDong(classId) {
  const lop = classId ? db.findClass(classId) : null;
  return lop && !lop.active ? lop : null;
}
// Ai còn "giữ" một nhóm ĐÃ ĐÓNG: cô từng phụ trách nhóm đó, và quản trị.
//
// QUẢN TRỊ CẤP 3 CHỈ GIỮ NHÓM CŨ CỦA CƠ SỞ MÌNH (N15).
//
// Chỗ này từng là lỗ rò nặng nhất còn sót lại sau khi vá routes/admin.js, và
// nó nặng vì ba lẽ cộng lại:
//
//   • Nội dung là ẢNH KHUÔN MẶT TRẺ — nhóm dữ liệu nhạy cảm nhất của app.
//   • Hàm này cũng quyết định quyền XOÁ (xoaDuocAlbum bên dưới), nên không chỉ
//     là đọc trộm mà là XOÁ MẤT dữ liệu của cơ sở khác.
//   • Nó chỉ mở ra với nhóm ĐÃ ĐÓNG, mà sau mỗi lần chuyển năm học thì mọi
//     nhóm của năm cũ, ở CẢ BA CƠ SỞ, đều đã đóng. Tức là hết năm đầu tiên là
//     gần như toàn bộ album của trường rơi vào diện này — lỗ rò lớn dần theo
//     thời gian, đúng kiểu không ai để ý.
//
// Đã dựng lại được trước khi vá: quản lý cơ sở 1 liệt kê, mở (4 ảnh) và XOÁ
// được album của nhóm đã đóng thuộc cơ sở 2.
function laNguoiGiuLopCu(user, lop) {
  if (!lop) return false;
  if (user.role === 'admin') {
    const pham = db.phamViCoSo(user);
    return pham === null || db.campusOfClass(lop.id) === pham;
  }
  return user.role === 'teacher' && db.isTeacherOfClass(user.id, lop.id);
}
function xemDuocAlbum(user, classId, ngayAlbum) {
  if (db.canAccessClass(user, classId)) return true;
  if (laNguoiGiuLopCu(user, lopDaDong(classId))) return true;
  // Phụ huynh: chỉ ảnh chụp trong ĐÚNG khoảng con còn học lớp đó.
  //
  // Mở cả lớp cũ thì một em chuyển đi tháng 10 vẫn xem được ảnh chụp tháng 12,
  // trong khi album có mặt nhiều trẻ khác. Ngày của album là mốc so sánh.
  return lsl.xemDuocNoiDungLopCu(user, classId, ngayAlbum);
}
function xoaDuocAlbum(user, classId) {
  // Cô của nhóm đang mở — giữ nguyên đường cũ, chỉ đổi cách hỏi "có phải cô của
  // nhóm này không" từ một cột sang bảng nhiều cô.
  if (user.role === 'teacher' && db.isTeacherOfClass(user.id, classId)) return true;
  return laNguoiGiuLopCu(user, lopDaDong(classId));
}

// Ghép danh sách bé được gắn thẻ vào một tấm ảnh.
//
// Chỉ cô và quản trị nhận được danh sách này. Với phụ huynh, "trong ảnh còn có
// bé nào" không phải việc của họ — biết tên và mã của con nhà khác trong một
// tấm ảnh là chính thứ mà đồng ý chia sẻ đang bảo vệ.
function ganThemDanhSachBe(anh, user) {
  if (!user || user.role === 'parent') return anh;
  const ids = db.beTrongAnh(anh.id);
  return {
    ...anh,
    beTrongAnh: ids.map(id => {
      const b = db.findStudent(id);
      return b ? { id: b.id, name: b.name, dongYChiaSe: db.dongYCuaBe(b.id).chiaSeGiaDinh } : null;
    }).filter(Boolean),
  };
}

// Lời nhắc cho PHỤ HUYNH khi có ảnh đang chờ cô gắn thẻ.
//
// Không có dòng này thì phụ huynh mở album ra thấy trống trơn và kết luận app
// hỏng — hoặc tệ hơn, kết luận cô không chụp ảnh con mình. Nói thật lý do vừa
// đúng, vừa giữ được lòng tin, vừa là cách phụ huynh nhắc cô nhanh nhất.
//
// KHÔNG nói nhà nào từ chối. Đó là chuyện riêng của gia đình đó.
function nhacChoPhuHuynh(tatCaAnh, anhXemDuoc, classId) {
  const con = (tatCaAnh || []).length - (anhXemDuoc || []).length;
  // Phải hỏi bản TỪNG HỌC — cùng bản mà bộ lọc ảnh đang dùng. Hỏi bản chỉ nhìn
  // hiện tại thì sau chuyển năm học, ảnh của album năm cũ vẫn bị ẩn (bộ lọc
  // nhớ lời từ chối của bé đã rời nhóm) nhưng lời giải thích thì im bặt —
  // phụ huynh thấy album vơi đi mà không một dòng nói vì sao.
  if (con <= 0 || !db.coBeTuChoiChiaSeTungHoc(classId)) return {};
  return {
    nhacChoPhuHuynh: `Album này còn ${con} ảnh chưa hiện với gia đình. `
      + 'Trong nhóm có bé mà gia đình chưa đồng ý chia sẻ ảnh, nên cô cần đánh dấu '
      + 'bé nào có trong từng tấm trước khi ảnh hiện ra. Gia đình nhắn cô một câu là được ạ.',
  };
}

// Lời nhắc cho cô: nhóm này có gia đình nói không, và còn bao nhiêu ảnh chưa
// gắn thẻ đang tạm ẩn với các gia đình khác.
//
// Trả về object rỗng khi không có gì phải nhắc, để màn hình cũ không đổi một
// chữ nào ở trường hợp thường gặp nhất.
function nhacGanThe(tatCaAnh, classId) {
  if (!db.coBeTuChoiChiaSe(classId)) return {};
  const chuaGan = (tatCaAnh || []).filter(a => !db.beTrongAnh(a.id).length);
  if (!chuaGan.length) return {};
  return {
    nhacGanThe: {
      soAnhTamAn: chuaGan.length,
      loiNhac: `Nhóm này có gia đình chưa đồng ý cho ảnh của con hiện với các nhà khác. `
        + `${chuaGan.length} ảnh chưa gắn thẻ bé nên đang tạm ẩn với gia đình khác. `
        + `Cô gắn thẻ bé vào ảnh là ảnh hiện lại ngay với những nhà được phép xem.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Chế độ album và bộ lọc THEO THẺ (Đ144)
// ---------------------------------------------------------------------------
function cheDoCua(albumId) {
  const r = db.first('album_che_do', 'SELECT cheDo FROM album_che_do WHERE albumId = ?', [albumId]);
  return r && CHE_DO.includes(r.cheDo) ? r.cheDo : 'cong-khai';
}
function cheDoCuaNhieu(albumIds) {
  const ra = new Map();
  const sach = [...new Set((albumIds || []).filter(Boolean))];
  for (const id of sach) ra.set(id, 'cong-khai');
  if (!sach.length) return ra;
  const marks = sach.map(() => '?').join(',');
  for (const r of db.all('album_che_do', `SELECT albumId, cheDo FROM album_che_do WHERE albumId IN (${marks})`, sach)) {
    if (CHE_DO.includes(r.cheDo)) ra.set(r.albumId, r.cheDo);
  }
  return ra;
}
function ghiCheDo(albumId, cheDo) {
  db.run(`INSERT INTO album_che_do (albumId, cheDo, ghiLuc) VALUES (?, ?, ?)
          ON CONFLICT(albumId) DO UPDATE SET cheDo = excluded.cheDo, ghiLuc = excluded.ghiLuc`,
  [albumId, cheDo, new Date().toISOString()]);
}

// Album THEO THẺ với gia đình: giữ lại đúng những tấm có con mình được gắn.
// Chạy SAU luật đồng ý chia sẻ, không thay nó — một tấm có con mình và một bé
// khác chưa đồng ý thì vẫn ẩn như trước. Cô và văn phòng thấy hết.
//
// `beTrongAnh` được truyền vào (đã tra theo lô) để đường liệt kê không tra một
// câu cho mỗi tấm ảnh — đúng bài học của Đ98.
function locTheoThe(photos, user, cheDo, beTrongAnh) {
  if (!user || user.role !== 'parent' || cheDo !== 'theo-the') return photos || [];
  const conMinh = new Set(db.studentIdsCuaPhuHuynh(user.id));
  return (photos || []).filter(p => (beTrongAnh.get(p.id) || []).some(id => conMinh.has(id)));
}

// Báo gia đình từng bé vừa được gắn thẻ — MỘT tin mỗi bé mỗi album mỗi ngày,
// không phải một tin cho mỗi tấm ảnh cô gắn (gắn 30 tấm là 30 lần rung máy).
function baoBeDuocGanThe(album, studentIds, nguoiTao) {
  try {
    const hash = `#/albums/${album.id}`;
    const [tuUtc, denUtc] = ngay.khoangUtcCuaNgay(ngay.homNay());
    for (const id of studentIds || []) {
      const be = db.findStudent(id);
      if (!be) continue;
      const daBao = db.first('thongbao_be',
        'SELECT id FROM thongbao_be WHERE studentId = ? AND hash = ? AND taoLuc >= ? AND taoLuc < ?',
        [be.id, hash, tuUtc, denUtc]);
      if (daBao) continue;
      tbb.gui({
        studentId: be.id, loai: 'album',
        tieuDe: `Có ảnh mới của ${be.name} trong album "${album.title}"`,
        noiDung: 'Cô vừa gắn thẻ con vào ảnh. Mở Album ảnh để xem.',
        hash, nguoiTao,
      });
    }
  } catch (_) { /* việc phụ */ }
}

// Album CÔNG KHAI: báo cả nhóm khi có album mới hay có thêm ảnh. `guiChoNhom`
// tự chống lặp cùng tiêu đề trong ngày, nên cô tải ba lô ảnh cũng chỉ một tin.
function baoNhomAlbum(album, tieuDe, noiDung, nguoiTao) {
  try {
    tb.guiChoNhom([album.classId], { title: tieuDe, body: noiDung, category: 'Nhóm lớp', createdBy: nguoiTao });
  } catch (_) { /* việc phụ */ }
}

// LỌC ẢNH — THÊM MỘT NẤC CHO CHỨC VỤ MARKETING.
//
// Luật ảnh nhóm (`db.locAnhChoNguoiXem`) trả lời câu hỏi "gia đình này có được
// nhìn tấm ảnh này không". Marketing hỏi một câu khác hẳn: "tấm ảnh này có được
// mang ra ngoài trường không". Giấy đồng ý của trường tách riêng hai ô, và ô
// truyền thông MẶC ĐỊNH KHÔNG TÍCH — nên câu trả lời cũng phải khác.
//
// Ba đường đọc ảnh ở dưới đều gọi hàm này thay vì gọi thẳng `db.locAnhChoNguoiXem`,
// kể cả đường trả về đúng các byte của tấm ảnh. Lọc thiếu ở đường đó thì hai
// đường kia chỉ là giấu biểu tượng đi.
function locAnhChoNguoiXem(photos, user, classId) {
  const thay = db.locAnhChoNguoiXem(photos, user, classId);
  if (db.chucVu(user) !== 'marketing') return thay;
  return db.locAnhChoTruyenThong(thay);
}

// BẢN LÔ CỦA CHÍNH HÀM TRÊN — dùng cho ĐƯỜNG LIỆT KÊ, nơi có nhiều album một
// lượt. Vẫn phải áp `locAnhChoTruyenThong` cho chức vụ Marketing: quên vế đó là
// mở lại đúng cái lỗ mà lớp bọc này sinh ra để bịt.
//
// `nhom` là { classId → [ảnh] }, trả về cùng hình dạng.
function locAnhChoNguoiXemNhieuNhom(nhom, user) {
  const thay = db.locAnhChoNguoiXemNhieuNhom(nhom, user);
  if (db.chucVu(user) !== 'marketing') return thay;
  const ra = {};
  // Bản LÔ, không phải bản từng dòng: Marketing thấy album TOÀN TRƯỜNG, mà
  // `locAnhChoTruyenThong` hỏi hai câu cho mỗi ảnh + một câu cho mỗi bé —
  // đúng cái N+1 mà Đ98 vừa dọn ở tầng dưới, tái sinh ngay tầng trên.
  for (const k of Object.keys(thay)) ra[k] = db.locAnhChoTruyenThongNhieuAnh(thay[k]);
  return ra;
}

// Marketing CHỈ ĐỌC ảnh. Đăng ảnh vào album của một nhóm là việc của cô — cô
// mới biết hôm đó có bé nào vắng, bé nào gia đình vừa rút đồng ý. Xoá thì càng
// không: ảnh xoá rồi không lấy lại được, mà đây là kỷ niệm của gia đình.
//
// CHỈ GẮN Ở HAI ĐƯỜNG, KHÔNG PHẢI BỐN. Thêm ảnh và xoá một tấm ảnh vốn đã chỉ
// dành cho CÔ ĐANG DẠY nhóm, nên mọi tài khoản quản trị — Marketing gồm cả —
// đã nhận 403 ở đó từ trước. Gắn thêm chốt vào hai đường ấy trông thì cẩn thận,
// nhưng nó không bao giờ chạy, và một chốt không bao giờ chạy là một lời hứa
// không ai kiểm được. Hai chỗ nó thật sự đỡ được:
//
//   • TẠO ALBUM — luật cũ trả 400 "Tài khoản chưa gắn với nhóm lớp nào", một
//     câu sai sự thật với Marketing và không nói được họ phải làm gì.
//   • XOÁ CẢ ALBUM của nhóm ĐÃ ĐÓNG — chỗ này thì hở thật: `xoaDuocAlbum` cho
//     quản trị không khoá cơ sở xoá album của mọi nhóm đã đóng, mà sau mỗi lần
//     chuyển năm học thì gần như toàn bộ album của trường đều đã đóng.
function chanNeuChiXemAnh(req, res) {
  if (db.chucVu(req.user) !== 'marketing') return false;
  res.status(403).json({
    error: 'Tài khoản Marketing chỉ xem ảnh, không đăng và không xoá ảnh của nhóm. '
      + 'Xin nhờ cô phụ trách nhóm hoặc văn phòng.',
  });
  return true;
}

// Mỗi lượt trả về bao nhiêu album, và trần cho lượt hỏi tự đặt số.
const MOI_TRANG = 60;
const TRANG_TOI_DA = 200;

module.exports = (app) => {
  // Danh sách album các lớp liên quan, mới nhất trước (không kèm toàn bộ ảnh).
  app.get('/api/albums', (req, res) => {
    const classIds = db.classIdsOf(req.user);

    // Lớp đã đóng chỉ hiện khi được HỎI, để danh sách mặc định không đổi một chữ
    // nào so với trước: phụ huynh và giáo viên đang dạy vẫn thấy đúng những gì
    // họ vẫn thấy.
    const keCaLopCu = String(req.query.keCaLopCu || '') === '1';
    const lopCu = keCaLopCu
      ? db.all('classes', 'SELECT * FROM classes WHERE active = 0')
        .filter(c => laNguoiGiuLopCu(req.user, c))
        .map(c => c.id)
      : [];

    // Khoảng con từng học ở các lớp đã đóng — chỉ dùng cho phụ huynh.
    const khoangCu = keCaLopCu ? lsl.lopCuCuaPhuHuynh(req.user) : [];

    const tatCa = [...new Set([...classIds, ...lopCu, ...khoangCu.map(k => k.classId)])];
    if (!tatCa.length) return res.json([]);
    const marks = tatCa.map(() => '?').join(',');

    // CÙNG LUẬT VỚI `xemDuocAlbum`, NHƯNG TÍNH SẴN MỘT LẦN CHO CẢ DANH SÁCH.
    //
    // `xemDuocAlbum` hỏi `canAccessClass` — mà hàm đó chạy `classIdsOf` MỖI
    // LẦN gọi — cho TỪNG album, TRƯỚC khi cắt trang. Toàn bộ album của vài năm
    // học nhân với một lượt truy vấn quyền mỗi dòng là đúng hình dạng N+1 mà
    // Đ98 vừa dọn ở tầng ảnh. Ba nguồn quyền dưới đây đã nằm sẵn trong tay
    // (classIds, lopCu, khoangCu) — chỉ việc tra tập, không hỏi lại ai.
    const nhomDangMo = new Set(classIds);
    const lopCuSet = new Set(lopCu);
    const khoangTheoLop = new Map();
    for (const k of khoangCu) {
      if (!khoangTheoLop.has(k.classId)) khoangTheoLop.set(k.classId, []);
      khoangTheoLop.get(k.classId).push(k);
    }
    const xemNhanh = (a) => nhomDangMo.has(a.classId) || lopCuSet.has(a.classId)
      || (khoangTheoLop.get(a.classId) || [])
        .some(k => !a.date || (String(a.date) >= k.tu && String(a.date) <= k.den));

    const daLocTheoKhoang = db.all('albums',
      `SELECT * FROM albums WHERE classId IN (${marks}) ORDER BY date DESC, rowid DESC`, tatCa)
      // Lọc lại lần nữa theo khoảng: câu truy vấn trên lấy theo LỚP, còn phụ
      // huynh chỉ được xem phần ảnh chụp trong đúng khoảng con còn ở lớp đó.
      .filter(xemNhanh);

    // CẮT CỬA SỔ TRƯỚC KHI ĐỘNG TỚI ẢNH.
    //
    // Câu trên là MỘT câu, chạy trên bảng `albums` — bảng nhỏ, có chỉ mục, và
    // một năm học của cả trường cũng chỉ vài trăm dòng. Phần đắt nằm ở dưới:
    // mỗi album kéo theo ảnh của nó, mỗi ảnh kéo theo thẻ bé, mỗi bé kéo theo
    // giấy đồng ý. Đ98 gom ba tầng ấy lại thành tra theo lô, nhưng khối lượng
    // vẫn lớn dần theo số năm nhà trường dùng app, và không có gì chặn.
    //
    // Nên cắt ở ĐÂY — sau khi lọc quyền, trước khi hỏi ảnh. Cắt sau khi lọc
    // thì số dòng trả về là số dòng người này THẬT SỰ xem được, nên màn hình
    // suy ra "còn nữa hay hết" chỉ bằng cách đếm: nhận đủ `soLuong` thì còn,
    // nhận ít hơn thì hết. Cắt trước khi lọc là con số ấy nói dối.
    //
    // Câu trả lời vẫn là một MẢNG như cũ, không đổi hình dạng: điện thoại đang
    // giữ bản app cũ trong bộ nhớ đệm vẫn chạy y như trước, chỉ là danh sách
    // dừng ở trang đầu.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || MOI_TRANG)));
    const albums = daLocTheoKhoang.slice(bo, bo + soLuong);

    // MỘT LƯỢT TRA CHO CẢ DANH SÁCH, thay vì một lượt cho mỗi album rồi một
    // lượt cho mỗi tấm ảnh rồi một lượt cho mỗi bé được gắn thẻ. Đo trên dữ
    // liệu quy mô một năm học, đường này từng tốn 8.218 câu truy vấn.
    const anhTheoAlbum = photosOfNhieu(albums.map(a => a.id));
    const theoNhom = {};
    for (const a of albums) {
      (theoNhom[a.classId] = theoNhom[a.classId] || []).push(...(anhTheoAlbum.get(a.id) || []));
    }
    const daLoc = locAnhChoNguoiXemNhieuNhom(theoNhom, req.user);
    const xemDuocTheoAlbum = new Map();
    for (const c of Object.keys(daLoc)) {
      const cho = new Set((daLoc[c] || []).map(x => x.id));
      for (const a of albums) {
        if (a.classId !== c) continue;
        xemDuocTheoAlbum.set(a.id, (anhTheoAlbum.get(a.id) || []).filter(x => cho.has(x.id)));
      }
    }
    // Album THEO THẺ (Đ144): gia đình chỉ giữ tấm có con mình. Tra thẻ một
    // lượt cho cả trang, không tra từng tấm.
    const cheDoTheoAlbum = cheDoCuaNhieu(albums.map(a => a.id));
    if (req.user.role === 'parent' && [...cheDoTheoAlbum.values()].some(x => x === 'theo-the')) {
      const idsTheoThe = albums.filter(a => cheDoTheoAlbum.get(a.id) === 'theo-the')
        .flatMap(a => (xemDuocTheoAlbum.get(a.id) || []).map(x => x.id));
      const theBe = db.beTrongCacAnh(idsTheoThe);
      for (const a of albums) {
        if (cheDoTheoAlbum.get(a.id) !== 'theo-the') continue;
        xemDuocTheoAlbum.set(a.id, locTheoThe(xemDuocTheoAlbum.get(a.id) || [], req.user, 'theo-the', theBe));
      }
    }

    // Một lượt tra lớp cho mỗi NHÓM khác nhau, không phải mỗi album.
    const lopTheoId = new Map();
    for (const a of albums) {
      if (!lopTheoId.has(a.classId)) lopTheoId.set(a.classId, db.findClass(a.classId));
    }
    const list = albums.map(a => {
      const cls = lopTheoId.get(a.classId);
      return {
        ...a,
        className: cls ? cls.name : '',
        // Để giao diện tách được "album năm nay" và "album các năm trước".
        //
        // Hai cờ khác nhau: `lopDaDong` là LỚP đã đóng (sau khi chuyển năm),
        // còn `lopCuCuaCon` là con đã RỜI lớp đó — kể cả khi lớp vẫn đang mở,
        // ví dụ em chuyển lớp giữa năm. Với phụ huynh thì cờ thứ hai mới đúng
        // là thứ cần tách ra.
        lopDaDong: !!(cls && !cls.active),
        // Cùng câu hỏi `canAccessClass` nhưng tra tập đã tính sẵn ở trên.
        lopCuCuaCon: !nhomDangMo.has(a.classId),
        namHoc: cls ? cls.year || '' : '',
        cheDo: cheDoTheoAlbum.get(a.id) || 'cong-khai',
        // Ảnh bìa cũng là một tấm ảnh, nên cũng phải qua lọc — nếu không thì
        // ảnh bị ẩn bên trong vẫn hiện ngay ngoài danh sách, to bằng nửa màn
        // hình. Và số đếm phải là số ảnh NGƯỜI NÀY xem được, không phải tổng.
        ...(() => {
          const xemDuoc = xemDuocTheoAlbum.get(a.id) || [];
          return { photoCount: xemDuoc.length, cover: xemDuoc[0] || null };
        })(),
      };
    });
    // Album theo thẻ mà nhà này chưa có tấm nào thì KHÔNG hiện trong danh sách
    // của gia đình: đó là album của nhà khác. Cô và văn phòng vẫn thấy đủ.
    res.json(req.user.role === 'parent'
      ? list.filter(a => a.cheDo !== 'theo-the' || a.photoCount > 0)
      : list);
  });

  // Chi tiết đầy đủ một album.
  app.get('/api/albums/:id', (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!xemDuocAlbum(req.user, album.classId, album.date)) {
      return res.status(403).json({ error: 'Không có quyền xem album này' });
    }
    // LỌC Ở TẦNG DỮ LIỆU. Phụ huynh chỉ nhận về những ảnh mình được xem —
    // không phải nhận hết rồi giao diện che bớt.
    const tatCaAnh = photosOf(album.id);
    const cheDo = cheDoCua(album.id);
    const quaDongY = locAnhChoNguoiXem(tatCaAnh, req.user, album.classId);
    album.photos = locTheoThe(quaDongY, req.user, cheDo, db.beTrongCacAnh(quaDongY.map(x => x.id)))
      .map(a => ganThemDanhSachBe(a, req.user));
    album.cheDo = cheDo;
    const cls = db.findClass(album.classId);
    const author = album.createdBy ? db.findUser(album.createdBy) : null;
    res.json({
      ...album,
      className: cls ? cls.name : '',
      namHoc: cls ? cls.year || '' : '',
      lopDaDong: !!(cls && !cls.active),
      authorName: author ? `${author.title} ${author.name}` : '',
      // canEdit = thêm/xóa ảnh, chỉ cô đang dạy lớp đó. Giữ nguyên nghĩa cũ:
      // lớp đã đóng thì không đăng thêm ảnh nữa.
      canEdit: req.user.role === 'teacher' && db.isTeacherOfClass(req.user.id, album.classId),
      canXoa: xoaDuocAlbum(req.user, album.classId),
      // Cô cần biết ảnh nào đang tạm ẩn với gia đình khác và VÌ SAO. Ẩn mà
      // không giải thích là chỗ cô mất lòng tin vào app nhanh nhất.
      ...(req.user.role === 'parent'
        ? (cheDo === 'theo-the'
          ? { nhacChoPhuHuynh: 'Album này cô gắn thẻ từng bé: gia đình chỉ thấy những tấm có con mình. Ảnh cô chưa gắn thẻ thì chưa hiện với nhà nào.' }
          : nhacChoPhuHuynh(tatCaAnh, album.photos, album.classId))
        : nhacGanThe(tatCaAnh, album.classId)),
    });
  });

  // Trả về tệp ảnh. Đi qua đây thay vì để lộ thư mục ảnh ra ngoài, để mỗi lượt
  // xem đều được kiểm tra người dùng có thuộc lớp của album hay không.
  app.get('/api/albums/:id/photo/:photoId', (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!xemDuocAlbum(req.user, album.classId, album.date)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    const photo = db.first('album_photos',
      'SELECT * FROM album_photos WHERE id = ? AND albumId = ?', [req.params.photoId, album.id]);
    if (!photo) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    // ĐÂY MỚI LÀ CHỐT CHẶN THẬT SỰ CỦA LUẬT ẢNH NHÓM.
    //
    // Đường này trả về đúng các byte của tấm ảnh. Lọc ở hai đường trên chỉ làm
    // ảnh không hiện trong danh sách; ai biết mã ảnh vẫn tải được thẳng qua
    // đây. Mã ảnh thì không bí mật — nó nằm trong gói JSON của album mà chính
    // phụ huynh đó nhận được ở lần xem trước, trước khi gia đình kia rút đồng ý.
    // Kiểm đồng ý TRƯỚC khi kiểm tệp có tồn tại: hỏi hai câu theo thứ tự ngược
    // lại thì câu trả lời "không tìm thấy ảnh" vô tình xác nhận rằng người hỏi
    // đáng lẽ được xem, chỉ là tệp đã mất.
    if (!locAnhChoNguoiXem([photo], req.user, album.classId).length) {
      return res.status(403).json({ error: 'Ảnh này có bé mà gia đình chưa đồng ý chia sẻ' });
    }
    // Album theo thẻ: chốt ở đường trả byte, cùng lý do với luật đồng ý.
    if (!locTheoThe([photo], req.user, cheDoCua(album.id), db.beTrongCacAnh([photo.id])).length) {
      return res.status(403).json({ error: 'Ảnh này chưa gắn thẻ con mình' });
    }
    if (!photo.file) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    const filePath = uploads.pathOf(photo.file);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tệp ảnh không còn trên máy chủ' });
    }

    // Ảnh không bao giờ đổi nội dung nên cho trình duyệt giữ lại lâu; đặt private
    // để proxy dùng chung không lưu ảnh của lớp.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', uploads.mimeOf(photo.file));
    res.sendFile(filePath);
  });

  // Giáo viên tạo album mới cho lớp chủ nhiệm.
  app.post('/api/albums', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuChiXemAnh(req, res)) return;
    const { title, description, photos } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên album' });
    }
    if (!Array.isArray(photos) || photos.length < 1) {
      return res.status(400).json({ error: 'Album cần có ít nhất 1 ảnh' });
    }
    if (photos.length > MAX_PHOTOS_PER_ALBUM) {
      return res.status(400).json({ error: `Mỗi album tối đa ${MAX_PHOTOS_PER_ALBUM} ảnh` });
    }
    // Cô phụ trách nhiều nhóm phải nói rõ album thuộc nhóm nào. Cô một nhóm
    // thì không phải chọn gì — đúng số thao tác như trước.
    const nhomAlbum = nl.nhomDangThaoTac(req.user, (req.body || {}).classId);
    if (!nhomAlbum) {
      return res.status(400).json({
        error: nl.nhomCuaCo(req.user.id).length > 1
          ? 'Cô đang phụ trách nhiều nhóm — vui lòng chọn nhóm cho album này'
          : 'Tài khoản chưa gắn với nhóm lớp nào',
      });
    }

    // Gom từng ảnh đã LƯU XUỐNG ĐĨA vào một danh sách, để thất bại giữa chừng
    // — ảnh thứ 5 không hợp lệ, hay giao dịch ghi lỗi — còn biết đường dọn.
    // Bản cũ trả 400 rồi thôi: các tệp của ảnh 1–4 nằm lại vĩnh viễn trong
    // uploads/, không dòng nào trong cơ sở dữ liệu trỏ tới, không ai dọn.
    // Chế độ album (Đ144). Không gửi = công khai, như mọi album trước đây.
    const cheDoXin = String((req.body || {}).cheDo || 'cong-khai');
    if (!CHE_DO.includes(cheDoXin)) {
      return res.status(400).json({ error: 'Chế độ album chỉ có "công khai cả nhóm" hoặc "theo thẻ từng bé"' });
    }
    const built = [];
    const rec = {
      id: db.nextId('al'),
      classId: nhomAlbum,
      title: String(title).trim(),
      date: todayStr(),
      description: String(description || '').trim(),
      createdBy: req.user.id,
    };
    try {
      photos.forEach((p, i) => built.push(buildPhoto(p, i)));
      db.tx(() => {
        db.insert('albums', rec);
        built.forEach((p, i) => db.insert('album_photos', { ...p, albumId: rec.id, position: i }));
        if (cheDoXin !== 'cong-khai') ghiCheDo(rec.id, cheDoXin);
      });
    } catch (err) {
      removeFiles(built);
      return res.status(400).json({ error: err.message });
    }
    // Công khai thì báo cả nhóm ngay. Theo thẻ thì báo từng nhà khi cô gắn thẻ.
    if (cheDoXin === 'cong-khai') {
      baoNhomAlbum(rec, `Album mới: ${rec.title}`,
        `Cô vừa đăng ${built.length} ảnh của nhóm. Mở Album ảnh để xem.`, req.user.id);
    }
    res.status(201).json({ ...rec, cheDo: cheDoXin, photos: built });
  });

  // Thêm ảnh vào album đã có.
  app.post('/api/albums/:id/photos', requireRole('teacher', 'admin'), (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!(req.user.role === 'teacher' && db.isTeacherOfClass(req.user.id, album.classId))) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới thêm được ảnh' });
    }
    // NHÓM ĐÃ ĐÓNG THÌ ALBUM CHỈ ĐỂ XEM LẠI, KHÔNG ĐĂNG THÊM.
    //
    // `isTeacherOfClass` cố ý giữ cả dòng của nhóm đã đóng (để cô còn mở album
    // năm cũ), nên một mình nó không nói được "nhóm còn hoạt động không".
    // Chính màn chi tiết đã hứa điều này trong cờ `canEdit` ("lớp đã đóng thì
    // không đăng thêm ảnh nữa") — đây là chốt giữ lời hứa đó ở tầng API.
    const lopCuaAlbum = db.findClass(album.classId);
    if (!lopCuaAlbum || !lopCuaAlbum.active) {
      return res.status(400).json({ error: 'Nhóm đã đóng sau chuyển năm học — album năm cũ chỉ để xem lại, không đăng thêm ảnh' });
    }
    const { photos } = req.body || {};
    if (!Array.isArray(photos) || !photos.length) {
      return res.status(400).json({ error: 'Chưa chọn ảnh hay video nào' });
    }
    const dangCo = db.count('SELECT COUNT(*) FROM album_photos WHERE albumId = ?', [album.id]);
    if (dangCo + photos.length > MAX_PHOTOS_PER_ALBUM) {
      return res.status(400).json({ error: `Mỗi album tối đa ${MAX_PHOTOS_PER_ALBUM} ảnh` });
    }

    // Cùng lối dọn dở dang với đường tạo album ở trên: tệp đã ghi xuống đĩa
    // mà không vào được cơ sở dữ liệu thì phải gỡ đi, không để mồ côi.
    const built = [];
    try {
      photos.forEach((p, i) => built.push(buildPhoto(p, dangCo + i)));
      db.tx(() => {
        built.forEach((p, i) => db.insert('album_photos', { ...p, albumId: album.id, position: dangCo + i }));
      });
    } catch (err) {
      removeFiles(built);
      return res.status(400).json({ error: err.message });
    }
    if (cheDoCua(album.id) === 'cong-khai') {
      baoNhomAlbum(album, `Album "${album.title}" có thêm ảnh`,
        'Cô vừa đăng thêm ảnh của nhóm. Mở Album ảnh để xem.', req.user.id);
    }
    // Nhắc NGAY LÚC ĐĂNG, không đợi cô mở lại album.
    //
    // Lúc vừa chụp xong là lúc duy nhất cô còn nhớ chắc trong ảnh là bé nào.
    // Để tới hôm sau mới nhắc thì cô phải ngồi đoán lại 30 tấm, và đoán sai
    // thì chính cơ chế bảo vệ này thành ra sai chỗ.
    res.status(201).json({
      added: built.length,
      photos: built,
      ...(db.coBeTuChoiChiaSe(album.classId) ? {
        nhacGanThe: {
          soAnhTamAn: built.length,
          loiNhac: 'Nhóm này có gia đình chưa đồng ý cho ảnh của con hiện với các nhà khác, '
            + 'nên ảnh vừa đăng đang tạm ẩn với gia đình khác. Cô bấm vào từng ảnh để gắn '
            + 'thẻ bé — làm ngay bây giờ là nhanh nhất, vì cô còn nhớ trong ảnh là bé nào.',
        },
      } : {}),
    });
  });

  // Cô gắn thẻ bé vào một tấm ảnh — đặt TOÀN BỘ danh sách một lượt.
  //
  // Gắn thẻ là thứ quyết định ảnh hiện với nhà nào, nên nó là quyền của CÔ ĐANG
  // DẠY nhóm đó, giống hệt quyền thêm ảnh. Quản trị không gắn thay: quản trị
  // không ở trong lớp và không biết trong ảnh là bé nào.
  //
  // Chỉ nhận bé ĐANG HỌC nhóm của album. Gắn một bé nhóm khác vào ảnh là vừa
  // sai sự thật, vừa mở đường cho ảnh hiện sang gia đình của nhóm đó.
  app.put('/api/albums/:id/photos/:photoId/be', requireRole('teacher'), (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!db.isTeacherOfClass(req.user.id, album.classId)) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới gắn thẻ được' });
    }
    const photo = db.first('album_photos',
      'SELECT * FROM album_photos WHERE id = ? AND albumId = ?', [req.params.photoId, album.id]);
    if (!photo) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    const xin = (req.body || {}).studentIds;
    if (!Array.isArray(xin)) return res.status(400).json({ error: 'Thiếu danh sách bé' });

    // Bé ĐANG học nhóm, CỘNG bé TỪNG học nhóm (sổ student_class_periods).
    //
    // Chỉ nhận bé đang học thì nhóm ĐÃ ĐÓNG có danh sách rỗng — mọi bé của nó
    // đã sang nhóm mới hoặc ra trường — tức là ảnh chưa gắn thẻ của album năm
    // cũ bị ẩn VĨNH VIỄN với gia đình (khi trong nhóm có người từ chối) mà
    // không còn đường nào gắn thẻ cho nó hiện lại. Bé từng học là đúng những
    // gương mặt có thể có trong ảnh của album đó, nên nhận cả họ; bé chưa bao
    // giờ thuộc nhóm thì vẫn bị từ chối như cũ.
    const trongNhom = new Set(db.all('students',
      'SELECT id FROM students WHERE classId = ? AND active = 1', [album.classId]).map(b => b.id));
    for (const r of db.all('student_class_periods',
      'SELECT DISTINCT studentId FROM student_class_periods WHERE classId = ?', [album.classId])) {
      trongNhom.add(r.studentId);
    }
    const lac = xin.filter(id => !trongNhom.has(id));
    if (lac.length) {
      return res.status(400).json({ error: 'Danh sách có bé không thuộc nhóm của album này' });
    }

    const truoc = new Set(db.beTrongAnh(photo.id));
    const daGan = db.datBeTrongAnh(photo.id, xin);
    db.audit(req.user.id, 'photo-tag', photo.id, { albumId: album.id, soBe: daGan.length });
    // Báo gia đình bé VỪA được gắn (không báo lại bé đã có thẻ từ trước).
    baoBeDuocGanThe(album, daGan.filter(id => !truoc.has(id)), req.user.id);
    res.json({ photoId: photo.id, studentIds: daGan });
  });

  // ĐỔI CHẾ ĐỘ ALBUM SAU KHI ĐÃ TẠO (Đ153).
  //
  // Trước đợt này chế độ chỉ ghi được đúng một lần lúc lập album, và không có
  // đường nào đổi lại. Cô chọn nhầm "Cả nhóm" cho một album đáng lẽ theo thẻ
  // thì chỉ còn cách XOÁ CẢ ALBUM rồi đăng lại — tức là mất hết ảnh, mất hết
  // thẻ đã gắn, và gia đình nhận lại một loạt tin báo cho ảnh cũ.
  //
  // MỘT CHIỀU AN TOÀN, MỘT CHIỀU PHẢI NÓI TRƯỚC:
  //
  //   công khai → theo thẻ  = HẸP LẠI. Ảnh đang hiện với cả nhóm nay chỉ còn
  //       hiện với nhà có con được gắn thẻ. Không ai thấy thêm thứ gì.
  //   theo thẻ → công khai  = MỞ RỘNG. Mọi gia đình trong nhóm bỗng thấy những
  //       tấm trước đó chỉ vài nhà thấy. Vẫn qua luật đồng ý chia sẻ như cũ,
  //       nhưng đây là một quyết định thật, nên câu trả lời nói rõ điều đó ra
  //       để màn hình hỏi lại cô một câu trước khi đổi.
  //
  // KHÔNG báo lại gia đình khi đổi chiều mở rộng: tin báo của album đi theo
  // việc CÓ ẢNH MỚI và việc GẮN THẺ, và bắn thêm một loạt tin cho ảnh cũ chỉ
  // vì cô sửa một ô chọn là làm phiền hai chục nhà vì một thao tác sửa lỗi.
  app.put('/api/albums/:id/che-do', requireRole('teacher'), (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!db.isTeacherOfClass(req.user.id, album.classId)) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới đổi được chế độ album' });
    }
    const moi2 = String((req.body || {}).cheDo || '');
    if (!CHE_DO.includes(moi2)) {
      return res.status(400).json({ error: 'Chế độ album chưa hợp lệ' });
    }
    const cu = cheDoCua(album.id);
    if (cu === moi2) return res.json({ cheDo: cu, doiGi: 'khong-doi' });
    ghiCheDo(album.id, moi2);
    db.audit(req.user.id, 'album-doi-che-do', album.id, { tu: cu, sang: moi2 });
    res.json({
      cheDo: moi2,
      doiGi: moi2 === 'cong-khai' ? 'mo-rong' : 'hep-lai',
    });
  });

  // GẮN THẺ NHIỀU ẢNH MỘT LƯỢT (Đ153 / AL-01).
  //
  // Đây là THỨ TÔI ĐÃ HỨA VỚI NHÀ TRƯỜNG khi từ chối nhận diện khuôn mặt.
  // Trường xin app tự nhận mặt bé trong ảnh; tôi từ chối vì đó là dữ liệu sinh
  // trắc của trẻ dưới 6 tuổi (N18, CLAUDE.md, Nghị định 13/2023), và đề nghị
  // thay bằng "gắn thẻ nhanh nhiều bé một lúc". Trường đồng ý — *"ok k hỗ trợ
  // được thôi"*. Một lời hứa đổi lấy một lời từ chối thì phải được làm cho
  // xong, nếu không thì lời từ chối kia thành ra chỉ là lời từ chối.
  //
  // VÌ SAO CÔ CẦN NÓ: cô chụp hai chục tấm trong một buổi hoạt động, và trong
  // đó có mười tấm cùng một nhóm bốn bé chơi với nhau. Gắn từng ảnh một là bốn
  // chục lần bấm cho mười tấm; gắn một lượt là bốn lần.
  //
  // CỘNG THÊM, KHÔNG GHI ĐÈ. Đường gắn một ảnh (`PUT .../be`) đặt LẠI trọn danh
  // sách — đúng cho màn sửa thẻ của một tấm. Ở đây thì ngược: cô đang quét qua
  // nhiều ảnh và nói "trong mấy tấm này có bé A và bé B", chứ không nói "mấy
  // tấm này CHỈ có A và B". Ghi đè ở đây là xoá mất thẻ cô đã gắn trước đó cho
  // từng tấm, mà không có gì báo.
  app.put('/api/albums/:id/gan-the-nhieu-anh', requireRole('teacher'), (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!db.isTeacherOfClass(req.user.id, album.classId)) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới gắn thẻ được' });
    }
    const than = req.body || {};
    const anhXin = Array.isArray(than.photoIds) ? than.photoIds : null;
    const beXin = Array.isArray(than.studentIds) ? than.studentIds : null;
    if (!anhXin || !beXin) {
      return res.status(400).json({ error: 'Thiếu danh sách ảnh hoặc danh sách bé' });
    }
    if (!anhXin.length) return res.status(400).json({ error: 'Cô chọn ít nhất một ảnh nhé' });
    if (!beXin.length) return res.status(400).json({ error: 'Cô chọn ít nhất một bé nhé' });
    // Trần một lượt: một album của trường mầm non hiếm khi quá con số này, và
    // không có trần thì một lời gọi ghi được hàng nghìn dòng trong một giao dịch.
    if (anhXin.length > 200) {
      return res.status(400).json({ error: 'Mỗi lượt gắn tối đa 200 ảnh — cô chia làm hai lượt giúp nhé' });
    }

    // Cùng luật với đường gắn một ảnh: bé ĐANG học nhóm, cộng bé TỪNG học nhóm.
    const trongNhom = new Set(db.all('students',
      'SELECT id FROM students WHERE classId = ? AND active = 1', [album.classId]).map(b => b.id));
    for (const r of db.all('student_class_periods',
      'SELECT DISTINCT studentId FROM student_class_periods WHERE classId = ?', [album.classId])) {
      trongNhom.add(r.studentId);
    }
    if (beXin.some(id => !trongNhom.has(id))) {
      return res.status(400).json({ error: 'Danh sách có bé không thuộc nhóm của album này' });
    }

    const marks = anhXin.map(() => '?').join(',');
    const anh = db.all('album_photos',
      `SELECT id FROM album_photos WHERE albumId = ? AND id IN (${marks})`, [album.id, ...anhXin]);
    if (anh.length !== anhXin.length) {
      return res.status(400).json({ error: 'Có ảnh không thuộc album này' });
    }

    // Bé nào VỪA được gắn thẻ lần đầu trong cả lượt — chỉ họ mới được báo. Gom
    // trước rồi báo MỘT lần cho mỗi bé: cô gắn bé An vào mười tấm thì gia đình
    // bé An nhận đúng một tin, không phải mười.
    const moi = new Set();
    db.tx(() => {
      for (const a of anh) {
        const truoc = new Set(db.beTrongAnh(a.id));
        const gop = [...new Set([...truoc, ...beXin])];
        db.datBeTrongAnh(a.id, gop);
        for (const id of beXin) if (!truoc.has(id)) moi.add(id);
      }
    });
    db.audit(req.user.id, 'photo-tag-nhieu', album.id, { soAnh: anh.length, soBe: beXin.length });
    baoBeDuocGanThe(album, [...moi], req.user.id);
    res.json({ soAnh: anh.length, soBe: beXin.length, soBeMoiDuocBao: moi.size });
  });

  // Xóa một ảnh khỏi album.
  app.delete('/api/albums/:id/photos/:photoId', requireRole('teacher', 'admin'), (req, res) => {
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!(req.user.role === 'teacher' && db.isTeacherOfClass(req.user.id, album.classId))) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới xóa được ảnh' });
    }
    const photo = db.first('album_photos',
      'SELECT * FROM album_photos WHERE id = ? AND albumId = ?', [req.params.photoId, album.id]);
    if (!photo) return res.status(404).json({ error: 'Không tìm thấy ảnh' });

    db.remove('album_photos', photo.id);
    removeFiles([photo]);
    res.json({ ok: true, remaining: db.count('SELECT COUNT(*) FROM album_photos WHERE albumId = ?', [album.id]) });
  });

  // Xóa cả album kèm toàn bộ ảnh của nó.
  app.delete('/api/albums/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuChiXemAnh(req, res)) return;
    const album = db.first('albums', 'SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Không tìm thấy album' });
    if (!xoaDuocAlbum(req.user, album.classId)) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm hoặc quản trị mới xóa được album' });
    }
    const photos = photosOf(album.id);
    db.remove('albums', album.id);   // ảnh trong bảng con tự xóa theo ràng buộc khóa ngoại
    removeFiles(photos);
    db.audit(req.user.id, 'album-delete', album.id, { title: album.title });
    res.json({ ok: true });
  });
};
