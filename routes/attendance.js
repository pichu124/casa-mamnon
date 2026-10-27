// Phân hệ Điểm danh: phụ huynh xem theo tháng, giáo viên điểm danh lớp theo ngày.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
// Hỏi công tắc trước khi đọc bảng của phân hệ khác (modules/README.md).
const modules = require('../lib/modules');
const uploads = require('../lib/uploads');
// Một chỗ duy nhất trả lời "hôm nay bé nào đang nghỉ có phép" (Đ84).
const nghiHoc = require('../lib/nghi-hoc');
const tbb = require('../lib/thong-bao-be');

const STATUSES = ['present', 'late', 'absent_excused', 'absent_unexcused'];
// Hai trạng thái "bé đang ở lớp" — cùng định nghĩa với modules/tienan/routes.js.
const CO_MAT = ['present', 'late'];

// GIỜ NHÀ TRƯỜNG CHỐT ĐỂ RÀ SOÁT (điểm 4, 30/08): "sau 9h bé nào chưa được
// điểm danh mà không xin nghỉ trước đó thì báo đỏ để văn phòng kiểm tra".
//
// Con số này nói về VIỆC CỦA NGƯỜI LỚN chưa làm xong — cô chưa kịp chấm, hoặc
// gia đình chưa kịp báo — chứ không nói gì về đứa trẻ. Chữ trên màn hình phải
// giữ đúng nghĩa đó, và bài canh QUY TẮC 2 giữ nó.
//
// TỪ Đ155 NHÀ TRƯỜNG ĐẶT ĐƯỢC MỐC NÀY (DD-07).
//
// Trường 07/09 nói lại: văn phòng bắt đầu điểm danh từ **8h30**, nên mốc 9h
// ghi cứng làm bảng rà soát im lặng suốt nửa tiếng đúng lúc người ta cần nó
// nhất. Mà giờ đón bé thì mỗi cơ sở một khác, và sang năm học mới còn đổi nữa
// — một con số ghi trong mã nguồn là một con số phải sửa mã mới đổi được.
//
// LƯU THEO PHÚT, KHÔNG THEO GIỜ TRÒN. "8h30" là câu chính nhà trường nói ra;
// làm tròn xuống 8h là sai nửa tiếng, làm tròn lên 9h là đúng chỗ cũ đang sai.
// Dạng "HH:MM" so sánh được thẳng bằng dấu < > vì hai vế đều đủ hai chữ số.
const GIO_RA_SOAT_MAC_DINH = '09:00';
const GIO_RA_SOAT_SOM_NHAT = '06:00';
const GIO_RA_SOAT_MUON_NHAT = '12:00';
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Đọc mốc giờ nhà trường đã đặt. HỎNG THÌ TRẢ MẶC ĐỊNH, không bao giờ ném:
// đây là hàm nằm trên đường đọc của màn Điểm danh — thứ cô mở đầu tiên mỗi
// sáng — nên một dòng cài đặt hỏng không được phép làm cả màn ấy trắng.
function gioRaSoat() {
  try {
    const row = db.first('settings', 'SELECT value FROM settings WHERE key = ?', ['diemdanh']);
    const v = (row && row.value) || {};
    const g = String(v.gioRaSoat || '');
    if (!HHMM_RE.test(g)) return GIO_RA_SOAT_MAC_DINH;
    if (g < GIO_RA_SOAT_SOM_NHAT || g > GIO_RA_SOAT_MUON_NHAT) return GIO_RA_SOAT_MAC_DINH;
    return g;
  } catch (_) {
    return GIO_RA_SOAT_MAC_DINH;
  }
}

// "08:30" → "8h30", "09:00" → "9h". Màn hình viết "chốt lúc 8h30", không viết
// "chốt lúc 08:30 giờ" — đây là chữ cho cô đọc, không phải một mốc thời gian
// trong nhật ký máy.
function gioRaSoatChu(g = gioRaSoat()) {
  const [h, m] = String(g).split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

// SỔ ĐIỂM DANH CHỈ GHI VÀ SỬA ĐƯỢC TRONG CHÍNH NGÀY HÔM ĐÓ (Đ127).
//
// Nhà trường yêu cầu 04/09: "điểm danh hôm nào chỉ được điểm danh ngày hôm đó,
// chỉ được chỉnh sửa ngày hôm đó chứ không được điểm danh hay chỉnh sửa ngày
// khác".
//
// Đây là luật của SỔ, không phải một mẹo giao diện, nên nó phải nằm ở máy chủ:
// điện thoại đã cài app còn giữ bản giao diện cũ trong bộ nhớ đệm, và bản cũ
// vẫn gửi được ngày bất kỳ.
//
// VÌ SAO ĐÚNG: sổ điểm danh là căn cứ cho suất ăn, cho tiền ăn cuối tháng, và
// là thứ gia đình đọc để biết hôm qua con có tới lớp không. Sửa được ngày cũ
// nghĩa là con số đã chốt đổi sau lưng mọi người — không ai được báo, và không
// có đường nào lần lại. Ghi trước cho ngày mai thì còn vô lý hơn: chưa xảy ra.
//
// XEM LẠI THÌ KHÔNG CHẶN. Cô và văn phòng vẫn mở được mọi ngày để đối chiếu;
// chỉ đường GHI mới khoá. Câu từ chối phải nói rõ đang khoá vì lý do gì, và
// nói bằng tiếng của trường.
function chanNgoaiNgay(res, ngayGhi, viec) {
  const hn = todayStr();
  if (ngayGhi === hn) return false;
  res.status(400).json({
    error: `Sổ điểm danh chỉ ${viec} được trong chính ngày hôm đó. `
      + `Ngày ${ngayGhi} ${ngayGhi > hn ? 'chưa tới' : 'đã khoá'} — cô vẫn xem lại được, nhưng không sửa nữa.`,
    ngayKhoa: ngayGhi,
    homNay: hn,
  });
  return true;
}

// ===========================================================================
// Ô LƯU Ý CỦA TRƯỜNG — CHỈ TRƯỜNG ĐỌC (Đ207, việc 4)
// ===========================================================================
//
// Nhà trường: "ô Lưu ý chỉ cơ sở xem, không gửi tới phụ huynh".
//
// Ô "Ghi chú (gia đình đọc được)" đang có KHÔNG đổi công dụng — xem chú thích
// dài ở `lib/schema.sql`. Đây là ô THỨ HAI, nằm ở bảng riêng.
//
// CHỖ AN TOÀN Ở ĐÂY DO HÌNH DẠNG DỮ LIỆU GIỮ, KHÔNG DO TRÍ NHỚ NGƯỜI VIẾT MÃ.
// `GET /api/attendance` — đường gia đình đọc lịch điểm danh của con — chạy
// `SELECT * FROM attendance`. Nếu ô này là một cột của bảng ấy thì nó lọt ra
// ngay ngày đầu, không cần ai viết sai một dòng nào. Ở bảng riêng thì muốn lộ
// phải có người cố ý viết một câu JOIN mới, và bài canh đọc thẳng đường của
// gia đình để bắt đúng lúc đó.
const TOI_DA_LUU_Y = 1000;

// GHI CHÚ GIA ĐÌNH ĐỌC ĐƯỢC CỦA LƯỢT VÀO / RA (Đ242D). Trường `ghiChu` trong
// thân yêu cầu là TUỲ CHỌN: app đời cũ không gửi thì không đụng gì cả. Gửi
// chuỗi (kể cả rỗng) nghĩa là cô đã nhìn ô ấy trên màn "Xem lại" và chốt nó.
const TOI_DA_GHI_CHU = 1000;
function ghiChuTuThan(b) {
  if (!b || typeof b.ghiChu !== 'string') return null;
  return b.ghiChu.trim().slice(0, TOI_DA_GHI_CHU);
}

// Ô này không đi ra ngoài phạm vi trường nên trả đủ "ai ghi, lúc nào" — chính
// hai thứ ấy là cái giá của việc cho ghi ngoài ngày.
function luuYRaNgoai(x) {
  if (!x || !x.luuY) return null;
  const u = x.nguoiGhi ? db.findUser(x.nguoiGhi) : null;
  return {
    luuY: x.luuY,
    nguoiGhi: u ? `${u.title || ''} ${u.name}`.trim() : '',
    capNhatLuc: x.capNhatLuc || '',
  };
}

// Ảnh điểm danh: nhỏ hơn ảnh album nhiều. Đây là một khung hình "con đã tới
// lớp", không phải ảnh để phóng to xem.
const TOI_DA_ANH_BYTE = 900 * 1024;

// ẢNH ĐẾN LỚP LÀ ĐIỂM DANH (Đ131).
//
// Nhà trường chốt 07/09: "Đã chụp ảnh đến lớp thì auto là có mặt, không cần
// phải tích chọn lằng nhằng". Trước đợt này ảnh và dòng điểm danh là hai việc
// rời nhau: cô chụp xong vẫn phải bấm thêm "Có mặt", quên là gia đình thấy ảnh
// con ở lớp mà sổ ghi "cô chưa chấm".
//
// LUẬT: chụp ảnh → dòng điểm danh thành "có mặt", giờ vào = giờ chụp. Kể cả
// khi hôm đó đã ghi "nghỉ" — nhà trường nói rõ: "con xin nghỉ trước đó, đã
// được duyệt, nhưng hôm đó vẫn chụp ảnh check-in thì ghi nhận đi học, tính
// tiền ăn". Bé ĐÃ có mặt rồi thì giữ nguyên giờ vào đầu tiên: chụp lại tấm
// ảnh đẹp hơn lúc 8h không được đổi giờ đến lớp thành 8h.
function ghiCoMatTheoAnh(studentId, date, userId) {
  const cu = db.first('attendance',
    'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, date]);
  if (cu && CO_MAT.includes(cu.status)) return cu;
  const rec = cu || {
    id: db.nextId('att'), studentId, date,
    status: 'present', checkIn: null, checkOut: null, note: '', markedBy: userId,
  };
  // Dòng "nghỉ" do việc tự động ghi theo đơn (Đ242E, markedBy 'tu-dong:don-nghi')
  // mang ghi chú "Theo đơn xin nghỉ đã duyệt…" — bé đã tới lớp thì câu ấy sai,
  // mà ô ghi chú này gia đình đọc được. Ghi chú do cô gõ thì giữ nguyên.
  if (cu && cu.markedBy === 'tu-dong:don-nghi') rec.note = '';
  rec.status = 'present';
  rec.checkIn = nowTime();
  rec.markedBy = userId;
  db.upsert('attendance', rec, ['studentId', 'date']);
  return rec;
}

function pad(n) { return String(n).padStart(2, '0'); }
function currentMonth() {
  return ngay.thangNay();
}
function todayStr() {
  return ngay.homNay();
}
function nowTime() {
  return ngay.bayGio();
}

module.exports = (app) => {
  // ------------------------------------------------------------------------
  // MỐC GIỜ RÀ SOÁT — nhà trường tự đặt (Đ155, DD-07)
  // ------------------------------------------------------------------------
  //
  // Đọc: cô và văn phòng đều được, vì chính họ là người nhìn bảng rà soát và
  // cần biết nó chốt lúc mấy giờ. Ghi: chỉ quản trị — đây là nếp làm việc của
  // cả trường, không phải tuỳ chọn của từng người.
  app.get('/api/attendance/cai-dat', requireRole('teacher', 'admin'), (req, res) => {
    const g = gioRaSoat();
    res.json({
      gioRaSoat: g,
      gioRaSoatChu: gioRaSoatChu(g),
      macDinh: GIO_RA_SOAT_MAC_DINH,
      somNhat: GIO_RA_SOAT_SOM_NHAT,
      muonNhat: GIO_RA_SOAT_MUON_NHAT,
      // "Sửa được không" phải hỏi ĐÚNG chốt chặn mà PUT bên dưới dùng, không
      // hỏi lại vai — chức vụ Bảo vệ cổng cũng là `role: admin` (Đ156).
      suaDuoc: db.datNepDuoc(req.user),
    });
  });

  app.put('/api/attendance/cai-dat', requireRole('admin'), (req, res) => {
    // BẢO VỆ CỔNG KHÔNG ĐẶT NẾP LÀM VIỆC CỦA CẢ TRƯỜNG (Đ156).
    //
    // Chức vụ "Bảo vệ cổng" có `/api/attendance` trong danh sách cho phép —
    // đúng phần việc của họ — nhưng mốc rà soát thì không phải việc của người
    // đứng cổng. Chặn ở CHÍNH ĐƯỜNG DẪN ẤY chứ không cắt nhỏ danh sách chức
    // vụ: cắt nhỏ thì mỗi đường `/api/attendance/...` thêm sau này lại lọt ra
    // ngoài mà không ai nhận ra.
    if (!db.datNepDuoc(req.user)) {
      return res.status(403).json({
        error: 'Mốc giờ rà soát là nếp làm việc của cả trường, do văn phòng '
          + 'hoặc ban giám hiệu đặt. Phần việc ở cổng không đổi mốc này.',
      });
    }
    const g = String(((req.body || {}).gioRaSoat) || '').trim();
    if (!HHMM_RE.test(g)) {
      return res.status(400).json({ error: 'Giờ chưa đúng dạng, ví dụ đúng: 08:30' });
    }
    // TRẦN TRÊN VÀ TRẦN DƯỚI, VÀ NÓI RÕ VÌ SAO.
    //
    // Đặt 5h sáng thì bảng rà soát kêu đỏ từ trước lúc cô tới trường; đặt 4h
    // chiều thì nó chỉ kêu khi cả buổi đã trôi qua, tức là không còn ai kịp
    // gọi cho gia đình nữa. Cả hai đều biến bảng ấy thành thứ người ta tắt đi.
    if (g < GIO_RA_SOAT_SOM_NHAT || g > GIO_RA_SOAT_MUON_NHAT) {
      return res.status(400).json({
        error: `Mốc rà soát đặt trong khoảng ${gioRaSoatChu(GIO_RA_SOAT_SOM_NHAT)} `
          + `– ${gioRaSoatChu(GIO_RA_SOAT_MUON_NHAT)} thôi nhé: sớm quá thì bảng kêu `
          + 'từ lúc cô chưa tới trường, muộn quá thì gọi cho gia đình không còn kịp.',
      });
    }
    const truoc = gioRaSoat();
    const cu = db.first('settings', 'SELECT value FROM settings WHERE key = ?', ['diemdanh']);
    db.upsert('settings', { key: 'diemdanh', value: { ...((cu && cu.value) || {}), gioRaSoat: g } }, ['key']);
    db.audit(req.user.id, 'diemdanh-gio-ra-soat', null, { truoc, sau: g });
    res.json({ ok: true, gioRaSoat: g, gioRaSoatChu: gioRaSoatChu(g) });
  });

  // Bản ghi điểm danh của một học sinh trong tháng (mặc định: tháng hiện tại).
  app.get('/api/attendance', (req, res) => {
    const studentId = req.query.studentId;
    const month = req.query.month || currentMonth();
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem điểm danh của bé này' });
    }
    res.json(db.all('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date LIKE ? ORDER BY date',
      [studentId, `${month}-%`]));
  });

  // Giáo viên: toàn bộ học sinh lớp chủ nhiệm kèm bản ghi điểm danh của một ngày.
  app.get('/api/attendance/class', requireRole('teacher', 'admin'), (req, res) => {
    const date = req.query.date || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    // Cô phụ trách nhiều nhóm thì sổ điểm danh phải mở được TỪNG nhóm, chứ
    // không dồn trẻ hai nhóm vào một danh sách. Không truyền `classId` thì giữ
    // nguyên hành vi cũ: toàn bộ trẻ cô được xem.
    const locNhom = String(req.query.classId || '');
    if (locNhom && !db.canAccessClass(req.user, locNhom)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc nhóm cô phụ trách' });
    }
    const students = locNhom
      ? db.studentsOf(req.user).filter(s => s.classId === locNhom)
      : db.studentsOf(req.user);
    // Lấy một lần toàn bộ bản ghi trong ngày rồi ghép, thay vì tra từng em.
    const ids = students.map(s => s.id);
    const byStudent = new Map();
    const donNghi = new Map();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      const rows = db.all('attendance',
        `SELECT * FROM attendance WHERE date = ? AND studentId IN (${marks})`,
        [date, ...ids]);
      for (const r of rows) byStudent.set(r.studentId, r);

      // Cho sổ điểm danh BIẾT em nào đã có đơn nghỉ được duyệt trong ngày.
      //
      // Trước đây cô duyệt đơn xong mà sổ điểm danh không hay biết gì, vẫn cho
      // chấm "Nghỉ không phép" đúng vào ngày đơn đã duyệt — cùng một việc phải
      // nhập hai lần, và chỉ cần quên là phụ huynh thấy chữ đỏ "Nghỉ không phép"
      // cho con mình dù cô đã duyệt đơn.
      //
      // Đường này chỉ THÊM THÔNG TIN. Việc tự ghi sổ theo đơn đã duyệt nằm ở
      // routes/leave.js (góp ý 20/10, D4): chỉ đơn duyệt TỪNG NGÀY, bỏ qua cuối
      // tuần và ngày trường nghỉ, không bao giờ đè dòng đã có.
      // Nhà trường tắt Xin phép thì sổ đơn nghỉ không còn ai cập nhật. Đọc
      // tiếp là gắn nhãn "có đơn nghỉ" cho bé theo một cuốn sổ đã ngưng — cùng
      // hạng lỗi với Đ46, chỉ khác chỗ.
      const donHopLe = modules.dangBat('xinphep') ? db.all('leave_requests',
        `SELECT * FROM leave_requests WHERE status = 'approved' AND fromDate <= ? AND toDate >= ?
           AND studentId IN (${marks})`, [date, date, ...ids]) : [];
      for (const d of donHopLe) {
        donNghi.set(d.studentId, { id: d.id, fromDate: d.fromDate, toDate: d.toDate, reason: d.reason });
      }
    }
    // Ô LƯU Ý NỘI BỘ của đúng ngày đang xem (Đ207), lấy một lượt cho cả nhóm.
    // Đường này chỉ vai teacher/admin vào được — xem chú thích ở khối lưu ý
    // bên dưới về việc vì sao nó KHÔNG có mặt ở đường của gia đình.
    const luuY = new Map();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const x of db.all('attendance_luu_y',
        `SELECT studentId, luuY, nguoiGhi, capNhatLuc FROM attendance_luu_y
          WHERE ngay = ? AND studentId IN (${marks})`, [date, ...ids])) {
        if (x.luuY) luuY.set(x.studentId, x);
      }
    }

    // Ảnh điểm danh của đúng ngày đang xem, lấy một lượt cho cả nhóm.
    const anh = new Map();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const a of db.all('attendance_photo',
        `SELECT studentId, file, taoLuc FROM attendance_photo
          WHERE date = ? AND studentId IN (${marks})`, [date, ...ids])) {
        anh.set(a.studentId, { file: a.file, taoLuc: a.taoLuc });
      }
    }

    // Ảnh lúc trả bé của đúng ngày ấy (Đ210) — lõi và phân hệ gộp lại.
    const anhVe = anhVeCuaNgay(ids, date);
    // Ghi chú gia đình đọc được của lượt ra về (Đ242D).
    const ghiChuVe = new Map();
    if (ids.length) {
      for (const x of db.all('attendance_ghi_chu_ve',
        `SELECT studentId, ghiChu FROM attendance_ghi_chu_ve
          WHERE date = ? AND studentId IN (${ids.map(() => '?').join(',')})`, [date, ...ids])) {
        if (x.ghiChu) ghiChuVe.set(x.studentId, x.ghiChu);
      }
    }

    // Tên nhóm của từng bé — văn phòng mở màn này KHÔNG kèm mã nhóm (máy chủ
    // tự cắt theo phạm vi), nên bé của cả cơ sở về một danh sách và màn hình
    // cần biết bé nào thuộc nhóm nào để xếp theo nhóm. Tra một lần mỗi nhóm.
    const tenNhom = new Map();
    for (const s of students) {
      if (s.classId && !tenNhom.has(s.classId)) {
        const c = db.findClass(s.classId);
        tenNhom.set(s.classId, c ? c.name : '');
      }
    }
    // HÔM NAY TRƯỜNG CÓ NGHỈ KHÔNG (Đ147) — để màn hình nói trước, chứ không
    // để cô chấm xong hai chục bé rồi mới biết hôm nay trường đóng cửa.
    //
    // Xem MỘT nhóm thì hỏi theo cơ sở của nhóm ấy. Xem gộp nhiều nhóm (văn
    // phòng) thì hỏi bằng chuỗi rỗng — CHỈ đợt nghỉ cả trường: một đợt nghỉ
    // riêng của cơ sở 2 không áp cho danh sách đang trộn cả ba cơ sở, và nói
    // rằng nó áp là sai với hai phần ba số bé trên màn.
    //
    // CÔ MỘT NHÓM KHÔNG KÈM MÃ NHÓM (L38, 27/10): cô chỉ phụ trách một nhóm thì
    // màn hình không gửi `classId`, và bản cũ rơi xuống nhánh "gộp nhiều nhóm"
    // — chỉ hỏi đợt nghỉ cả trường. Cơ sở của cô nghỉ thì thẻ "Hôm nay trường
    // nghỉ" không hiện, trong khi Trang chủ của chính cô đã nói trường nghỉ.
    // Mọi bé trên màn cùng MỘT cơ sở thì hỏi theo cơ sở ấy; trộn từ hai cơ sở
    // trở lên thì giữ nguyên cách cũ.
    let csCuaDanhSach = '';
    {
      // Tra cơ sở MỘT lần cho mỗi nhóm, không phải cho mỗi bé — danh sách cả
      // trường là vài trăm bé nhưng chỉ vài chục nhóm.
      const nhom = new Set(students.map(s => s.classId || ''));
      const cs = new Set([...nhom].map(c => (c && db.campusOfClass(c)) || ''));
      if (cs.size === 1) csCuaDanhSach = [...cs][0];
    }
    const csXem = locNhom
      ? (db.campusOfClass(locNhom) || '')
      : (db.phamViCoSo(req.user) || csCuaDanhSach || '');
    const dotNghi = nghiHoc.ngayTruongNghi(date, csXem);

    res.json({
      date,
      truongNghi: dotNghi
        ? { ten: dotNghi.ten, loai: dotNghi.loai, tuNgay: dotNghi.tuNgay, denNgay: dotNghi.denNgay }
        : null,
      // Các nhóm cô đang phụ trách, để màn hình dựng được ô chọn nhóm. Cô chỉ
      // có một nhóm thì mảng này một phần tử và giao diện không hiện ô chọn.
      nhom: nl.nhomCuaCo(req.user.id),
      dangXemNhom: locNhom || null,
      gioRaSoat: gioRaSoat(),
      gioRaSoatChu: gioRaSoatChu(),
      students: students.map(s => ({
        student: {
          id: s.id, name: s.name, code: s.code, avatar: s.avatar,
          classId: s.classId || null, className: tenNhom.get(s.classId) || '',
        },
        record: byStudent.get(s.id) || null,
        donNghiDaDuyet: donNghi.get(s.id) || null,
        anhDenLop: anh.get(s.id) || null,
        anhVeNha: anhVe.get(s.id) || null,
        luuY: luuYRaNgoai(luuY.get(s.id)),
        ghiChuVe: ghiChuVe.get(s.id) || '',
      })),
    });
  });

  // ---- Ô lưu ý nội bộ: đọc và ghi. Xem khối chú thích Đ207 ở đầu tệp. ----
  //
  // KHÔNG KHOÁ NGOÀI NGÀY, khác hẳn sổ điểm danh ngay bên cạnh — và đó là cả
  // lý do ô này tồn tại. Sổ điểm danh khoá vì nó là chứng từ bé có mặt hay
  // không; ô này là chỗ trường ghi thứ BIẾT ĐƯỢC SAU, thường vài hôm sau khi
  // gia đình gọi lại. Khoá theo ngày là bịt đúng lúc nó cần dùng.
  //
  // Bù lại: ghi rõ ai viết, lúc nào, và có vết trong Nhật ký thao tác. Và ô
  // này KHÔNG chạm `status` / `checkIn` / `checkOut` — nó không phải lối vòng
  // để sửa một ngày điểm danh đã khoá.
  app.put('/api/attendance/luu-y', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '').trim();
    const ngay = String(b.ngay || '').trim();
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (ngay > todayStr()) return res.status(400).json({ error: 'Chưa ghi lưu ý cho ngày chưa tới được' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    const luuY = String(b.luuY == null ? '' : b.luuY).trim().slice(0, TOI_DA_LUU_Y);

    // XOÁ Ô CHỨ KHÔNG XOÁ NGÀY: gõ rỗng nghĩa là "bỏ lưu ý này đi", và lúc ấy
    // bỏ hẳn dòng là đúng — một dòng rỗng ở lại thì màn hình của cô hiện một ô
    // trống trông như đang có gì đó chưa đọc.
    if (!luuY) {
      db.run('DELETE FROM attendance_luu_y WHERE studentId = ? AND ngay = ?', [studentId, ngay]);
      db.audit(req.user.id, 'diemdanh-luu-y-go', studentId, { ngay });
      return res.json({ ok: true, luuY: null });
    }

    db.upsert('attendance_luu_y', {
      studentId, ngay, luuY,
      nguoiGhi: req.user.id,
      capNhatLuc: new Date().toISOString(),
    }, ['studentId', 'ngay']);
    // Nhật ký CỐ Ý không chép nội dung ô lưu ý vào đây: màn Nhật ký thao tác
    // mở rộng hơn nhóm người được đọc ô này. Ghi lại việc đã xảy ra là đủ.
    db.audit(req.user.id, 'diemdanh-luu-y', studentId, { ngay, soKyTu: luuY.length });
    const x = db.first('attendance_luu_y',
      'SELECT studentId, luuY, nguoiGhi, capNhatLuc FROM attendance_luu_y WHERE studentId = ? AND ngay = ?',
      [studentId, ngay]);
    res.json({ ok: true, luuY: luuYRaNgoai(x) });
  });

  // Cả tháng của MỘT bé — để văn phòng đọc lại khi gia đình gọi lên hỏi.
  app.get('/api/attendance/luu-y', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = String(req.query.studentId || '').trim();
    const thang = String(req.query.thang || currentMonth());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}$/.test(thang)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    const ds = db.all('attendance_luu_y',
      `SELECT studentId, ngay, luuY, nguoiGhi, capNhatLuc FROM attendance_luu_y
        WHERE studentId = ? AND ngay LIKE ? ORDER BY ngay DESC`, [studentId, `${thang}-%`]);
    res.json(ds.map(x => ({ ngay: x.ngay, ...luuYRaNgoai(x) })).filter(x => x.luuY));
  });

  // Giáo viên điểm danh một học sinh: ghi đè bản ghi của đúng ngày đó.
  app.post('/api/attendance/mark', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, status, note } = req.body || {};
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Thiếu thông tin điểm danh' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    }
    if (chanNgoaiNgay(res, String(date), 'ghi và sửa')) return;
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }

    const existing = db.first('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, date]);

    const rec = existing || {
      id: db.nextId('att'), studentId, date,
      status, checkIn: null, checkOut: null, note: '', markedBy: req.user.id,
    };
    rec.status = status;
    if (typeof note === 'string') rec.note = note;
    if (status === 'present' && !rec.checkIn) rec.checkIn = nowTime();
    if (status === 'absent_excused' || status === 'absent_unexcused') {
      rec.checkIn = null;
      rec.checkOut = null;
    }
    rec.markedBy = req.user.id;

    db.upsert('attendance', rec, ['studentId', 'date']);
    res.json(rec);
  });

  // Điểm danh cả lớp trong một lượt.
  //
  // Đường dẫn RIÊNG, không đụng vào /mark: giao diện cũ còn trong bộ nhớ đệm của
  // điện thoại đã cài app vẫn gọi /mark từng em, và hai bộ kiểm thử cũng gọi
  // đường đó. Thêm bên cạnh thì cả hai bản đều chạy.
  //
  // Mặc định CHỈ ghi cho em CHƯA điểm danh. Cô thường đánh dấu vài em nghỉ trước
  // rồi mới bấm "cả lớp có mặt" cho phần còn lại — ghi đè hết là xóa mất đúng
  // phần cô vừa nhập tay, mà app không có đường hoàn tác.
  app.post('/api/attendance/mark-all', requireRole('teacher', 'admin'), (req, res) => {
    const { date, status, ghiDe } = req.body || {};
    const ngay = String(date || '');
    const trangThai = String(status || 'present');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (!STATUSES.includes(trangThai)) {
      return res.status(400).json({ error: 'Trạng thái điểm danh không hợp lệ' });
    }
    if (chanNgoaiNgay(res, ngay, 'ghi và sửa')) return;

    // Quản trị phải nói rõ nhóm nào; cô thì lấy nhóm mình phụ trách — và cũng
    // phải nói rõ khi cô đang phụ trách nhiều nhóm.
    const classId = String((req.body || {}).classId || '')
      || nl.nhomDangThaoTac(req.user, null);
    if (!classId) return res.status(400).json({ error: 'Thiếu mã nhóm cần điểm danh' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc nhóm cô phụ trách' });
    }

    const students = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    if (!students.length) return res.status(400).json({ error: 'Nhóm chưa có bé nào' });

    // Soát quyền cho TỪNG em trước khi mở giao dịch: nếu để trong giao dịch mà
    // dừng giữa chừng thì một phần đã ghi, một phần chưa, và cô không biết.
    for (const s of students) {
      if (!db.canAccessStudent(req.user, s.id)) {
        return res.status(403).json({ error: 'Có bé không thuộc nhóm cô phụ trách' });
      }
    }

    const daCo = new Map();
    for (const r of db.all('attendance',
      `SELECT * FROM attendance WHERE date = ? AND studentId IN (${students.map(() => '?').join(',')})`,
      [ngay, ...students.map(s => s.id)])) daCo.set(r.studentId, r);

    let soDaGhi = 0;
    let soGiuNguyen = 0;
    db.tx(() => {
      for (const s of students) {
        const cu = daCo.get(s.id);
        if (cu && !ghiDe) { soGiuNguyen += 1; continue; }
        const rec = cu || {
          id: db.nextId('att'), studentId: s.id, date: ngay,
          status: trangThai, checkIn: null, checkOut: null, note: '', markedBy: req.user.id,
        };
        rec.status = trangThai;
        // Giữ đúng quy tắc giờ vào/ra của đường ghi từng em.
        if (trangThai === 'present' && !rec.checkIn) rec.checkIn = nowTime();
        if (trangThai === 'absent_excused' || trangThai === 'absent_unexcused') {
          rec.checkIn = null;
          rec.checkOut = null;
        }
        rec.markedBy = req.user.id;
        db.upsert('attendance', rec, ['studentId', 'date']);
        soDaGhi += 1;
      }
    });

    res.json({ ok: true, date: ngay, status: trangThai, soDaGhi, soGiuNguyen });
  });

  // =========================================================================
  // ẢNH ĐIỂM DANH — "con đã tới lớp rồi"
  // =========================================================================
  //
  // Nhà trường đặt việc này ở điểm 4: gia đình muốn thấy MẶT con ở lớp chứ
  // không chỉ một dòng chữ "có mặt". Một khung hình lúc 7h40 trả lời được câu
  // hỏi mà cả buổi sáng của một người mẹ đang treo ở đó.

  // Cô gắn ảnh cho một bé trong một ngày.
  app.post('/api/attendance/anh', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, anh } = req.body || {};
    const ngayGhi = String(date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayGhi)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    // Ảnh "con đã tới lớp" là một phần của dòng điểm danh ngày đó, nên theo
    // đúng luật của dòng ấy: chỉ gắn được trong ngày (Đ127).
    if (chanNgoaiNgay(res, ngayGhi, 'gắn ảnh')) return;
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (!anh || typeof anh !== 'string') {
      return res.status(400).json({ error: 'Chưa chọn ảnh' });
    }
    // MÀN HÌNH NÓI RÕ Ý ĐỊNH (vòng rà Đ232). Chạm vào bé để chụp "lần 1" gửi
    // `yDinh: 'toi-lop'`. Máy ở cổng mở từ sáng không tự làm mới: bé đã được
    // máy khác chụp ảnh tới lớp mà màn này vẫn thấy "chưa có mặt", và lần chạm
    // buổi chiều lại thay mất ảnh sáng. Gặp đúng cảnh ấy thì trả 409 để màn
    // hình hỏi lại — không âm thầm thay ảnh. Không có `yDinh` (app đời cũ, nút
    // "Chụp lại ảnh tới lớp") thì như cũ.
    if ((req.body || {}).yDinh === 'toi-lop') {
      const daCoAnh = db.first('attendance_photo',
        'SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
      const dongNay = db.first('attendance',
        'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
      if (daCoAnh && dongNay && CO_MAT.includes(dongNay.status)) {
        return res.status(409).json({
          error: `Bé đã có ảnh tới lớp${dongNay.checkIn ? ` lúc ${dongNay.checkIn}` : ''} (máy khác vừa chụp).`,
          daCoAnhToiLop: true, record: dongNay,
        });
      }
    }

    // Trần riêng của ảnh điểm danh, SIẾT trước khi gọi kho ảnh.
    //
    // `uploads.saveDataUrl` có trần chung cho cả app và không nhận tham số —
    // nó là tệp nền dùng chung, thêm tham số vào đó là đổi khế ước của một
    // thứ cả app đang dựa vào. Nên phần siết thêm nằm ở đây, chỗ biết rõ ảnh
    // này để làm gì.
    const phay = anh.indexOf(',');
    if (phay >= 0 && (anh.length - phay - 1) * 0.75 > TOI_DA_ANH_BYTE) {
      return res.status(400).json({
        error: 'Ảnh điểm danh nặng quá, cô chụp lại một khung hình nhỏ hơn nhé',
      });
    }

    let luu;
    try {
      luu = uploads.saveDataUrl(anh);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Ảnh chưa gửi lên được' });
    }

    // Ảnh cũ của đúng ngày đó phải được DỌN, không để lại rác trong kho.
    // Chụp lại vài lần trong một buổi sáng là chuyện thường; mỗi lần bỏ lại
    // một tệp là kho ảnh của trường phình lên vì những khung hình không ai xem.
    const cu = db.first('attendance_photo',
      'SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    db.upsert('attendance_photo', {
      studentId, date: ngayGhi, file: luu.file,
      taoLuc: nowTime(), byUserId: req.user.id,
    }, ['studentId', 'date']);
    if (cu && cu.file && cu.file !== luu.file) uploads.remove(cu.file);

    // TÊN HÀNH ĐỘNG CỐ Ý ĐẶT THEO VIỆC, KHÔNG THEO TÊN MÀN HÌNH.
    //
    // `test:quy-tac-4` bắt theo tên trường dữ liệu, và mẫu của nó có một từ mà
    // tên viết-không-dấu của màn hình này khớp trúng — dấu gạch ngang là ranh
    // giới từ. Bộ canh không sai: chữ đã bỏ dấu thì nó không có cách nào phân
    // biệt hai nghĩa. Đặt tên theo việc thì vừa không phải xin ngoại lệ cho một
    // bộ canh bất khả xâm phạm, vừa nói đúng hơn cái vừa xảy ra.
    //
    // (Chú thích này cũng tránh viết ra từ ấy — bộ canh quét cả chú thích, và
    // đó là chủ ý: một bộ canh có ngoại lệ "trong chú thích thì không tính" là
    // một bộ canh có lỗ. Bản đầu của chính đoạn này đã bị bắt vì lý do đó.)
    db.audit(req.user.id, 'anh-toi-lop', studentId, { date: ngayGhi });
    // Ảnh đã vào kho thì bé là có mặt — xem `ghiCoMatTheoAnh`.
    const record = ghiCoMatTheoAnh(studentId, ngayGhi, req.user.id);
    // Ghi chú lượt vào lớp là ô "Ghi chú (gia đình đọc được)" của chính dòng ấy.
    const ghiChu = ghiChuTuThan(req.body);
    if (ghiChu !== null) {
      db.update('attendance', record.id, { note: ghiChu });
      record.note = ghiChu;
    }
    // BÁO GIA ĐÌNH NGAY (Đ137): "muốn ảnh điểm danh được gửi về thông báo cho
    // phụ huynh, khi ở trường check-in tự động gửi thông báo về chứ không
    // phải vào mục điểm danh mới nhìn được". Chỉ báo khi CÓ MẶT MỚI được ghi
    // hoặc ảnh đầu tiên trong ngày — chụp lại tấm thứ hai không báo lần nữa.
    if (!cu) {
      const be = db.findStudent(studentId);
      tbb.gui({
        studentId, loai: 'toi-lop', nguoiTao: req.user.id,
        tieuDe: `${be ? be.name : 'Con'} đã tới lớp lúc ${record.checkIn || nowTime()}`,
        noiDung: 'Cô đã chụp ảnh con tới lớp. Bấm để xem.',
        hash: '#/attendance',
      });
    }
    res.status(201).json({ ok: true, studentId, date: ngayGhi, file: luu.file, record });
  });

  // Gỡ ảnh — chụp nhầm bé thì phải gỡ được ngay (bài học Đ15).
  app.delete('/api/attendance/anh', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = String(req.query.studentId || '');
    const ngayGhi = String(req.query.date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (chanNgoaiNgay(res, ngayGhi, 'gỡ ảnh')) return;
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const cu = db.first('attendance_photo',
      'SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (!cu) return res.json({ ok: true, daGoTruocDo: true });
    db.run('DELETE FROM attendance_photo WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (cu.file) uploads.remove(cu.file);
    db.audit(req.user.id, 'go-anh-toi-lop', studentId, { date: ngayGhi });
    res.json({ ok: true });
  });

  // Gia đình xem ảnh con mình theo tháng.
  //
  // CHỐT CHẶN "CHỈ NHÀ MÌNH" LÀ `canAccessStudent`, VÀ ĐƯỜNG NÀY CHỈ NHẬN MỘT
  // MÃ BÉ. Không có đường dẫn nào trả về ảnh điểm danh của nhiều bé cho một
  // gia đình, nên không có chỗ nào để một ảnh đi lạc sang nhà khác.
  app.get('/api/attendance/anh', (req, res) => {
    const studentId = String(req.query.studentId || '');
    const thang = String(req.query.month || currentMonth());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}$/.test(thang)) {
      return res.status(400).json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh điểm danh của bé này' });
    }
    // ẢNH LÚC TRẢ BÉ ĐI CÙNG, Ở MỘT KHOÁ RIÊNG (Đ210, việc 1 + 2).
    //
    // Thêm khoá `anhVe` chứ KHÔNG trộn vào mảng `anh` đang có: màn hình đời cũ
    // còn trong máy điện thoại đã cài app đọc `anh` và dựng chú thích "con đã
    // tới lớp" cho từng tấm. Trộn ảnh chiều vào đó là gia đình mở app cũ ra
    // thấy ảnh lúc về mang chú thích lúc tới — sai mà không có gì báo.
    let anhVe = [];
    try {
      if (!modules.dangBat('dontra')) throw new Error('dontra dang tat');
      anhVe = db.all('dontra_anh_tra',
        `SELECT ngay AS date, file, taoLuc FROM dontra_anh_tra
          WHERE studentId = ? AND ngay LIKE ? AND file <> ''`, [studentId, `${thang}-%`]);
    } catch (_) { /* phân hệ chưa từng bật */ }
    const theoNgay = new Map(anhVe.map(x => [x.date, x]));
    for (const x of db.all('attendance_anh_ve',
      `SELECT date, file, taoLuc FROM attendance_anh_ve
        WHERE studentId = ? AND date LIKE ?`, [studentId, `${thang}-%`])) {
      // Dòng lõi ghi sau thì đè lên; `file` rỗng nghĩa là cô đã gỡ ảnh ấy.
      if (x.file) theoNgay.set(x.date, x); else theoNgay.delete(x.date);
    }

    res.json({
      studentId, month: thang,
      anh: db.all('attendance_photo',
        `SELECT date, file, taoLuc FROM attendance_photo
          WHERE studentId = ? AND date LIKE ? ORDER BY date DESC`, [studentId, `${thang}-%`]),
      anhVe: [...theoNgay.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))),
      // Khoá riêng, thêm sau (Đ242D): ghi chú gia đình đọc được của lượt ra về.
      // Ghi chú lượt vào lớp đã đi theo dòng điểm danh (`note`).
      ghiChuVe: db.all('attendance_ghi_chu_ve',
        `SELECT date, ghiChu FROM attendance_ghi_chu_ve
          WHERE studentId = ? AND date LIKE ? AND ghiChu <> '' ORDER BY date DESC`, [studentId, `${thang}-%`]),
    });
  });

  // BYTE CỦA TẤM ẢNH — ĐI QUA CANH QUYỀN, KHÔNG PHỤC VỤ TĨNH.
  //
  // Bản đầu của đợt này quên hẳn đường dẫn này: hai màn hình trỏ thẳng vào
  // `/uploads/<tên tệp>`, mà máy chủ KHÔNG hề gắn đường tĩnh nào tên `/uploads`
  // — tệp ảnh nằm ở `DATA_DIR/uploads`, ngoài `public/`. Kết quả: mọi yêu cầu
  // ảnh rơi vào lớp đỡ của trang đơn và nhận về `index.html` kèm
  // `Content-Type: text/html`. Nghĩa là ô ảnh vỡ ở CẢ hai màn, trong khi màn
  // của cô vẫn in dòng "Gia đình đã thấy ảnh". Đo bằng HTTP thật trên bàn thử
  // 31/08: tải lên trả 201, tải về trả 200 + text/html + 2977 byte.
  //
  // CÁCH VÁ NHANH NHẤT LÀ CÁCH SAI. Gắn thư mục ảnh thành đường tĩnh là xong
  // trong ba giây — và là mở TOÀN BỘ thư mục ảnh cho bất kỳ ai biết một tên
  // tệp. (Chú thích này cố ý KHÔNG viết ra nguyên văn lệnh ấy: bộ canh
  // `test:anh-canh-quyen` quét cả chú thích, và nó đúng khi làm vậy — một bộ
  // canh có ngoại lệ "trong chú thích thì không tính" là một bộ canh có lỗ.) Thư
  // mục đó dùng chung cho ảnh album, ảnh Cambridge, ảnh người được đón, ảnh
  // quan sát Hành trình và ảnh Ghi nhanh. Tên tệp không phải bí mật: nó nằm
  // sẵn trong gói JSON mà mọi gia đình đã nhận. Một dòng đó đi vòng qua
  // `db.locAnhChoNguoiXem`, `db.canAccessStudent` và luật ảnh nhóm cùng lúc.
  //
  // Nên đường này hỏi chủ ảnh trước, y hệt `modules/dontra/routes.js`.
  app.get('/api/attendance/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    // BA BẢNG, MỘT ĐƯỜNG ĐỌC (Đ210, việc 2).
    //
    // `attendance_photo` là ảnh tới lớp. `attendance_anh_ve` là ảnh lúc trả bé
    // do lõi ghi từ đợt này. `dontra_anh_tra` là ảnh trả bé phân hệ đã ghi
    // TRƯỚC đợt này — tra nốt bảng ấy là lý do những tấm cũ vẫn mở ra xem
    // được, chứ không biến mất khỏi sổ của gia đình vào đúng ngày cập nhật.
    const chu = db.first('attendance_photo',
      'SELECT studentId FROM attendance_photo WHERE file = ?', [file])
      || db.first('attendance_anh_ve',
        'SELECT studentId FROM attendance_anh_ve WHERE file = ?', [file])
      || anhVeDoiCu(file);
    // Không ai nhận tấm ảnh này thì trả 404 NGAY, trước cả khi hỏi tệp có tồn
    // tại trên đĩa không — để không ai dò được thư mục ảnh bằng cách so hai
    // loại lỗi khác nhau.
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!db.canAccessStudent(req.user, chu.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh của bé này' });
    }
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // =========================================================================
  // GIỜ RA VỀ VÀ ẢNH LÚC TRẢ BÉ — MỘT DÒNG VÀO/RA (Đ210, việc 1 + 2)
  // =========================================================================
  //
  // Nhà trường xin gộp hai tab Đón bé / Trả bé về MỘT dòng, và chuyển ảnh trả
  // bé vào phần lõi. Xem chú thích dài ở `attendance_anh_ve` trong
  // `lib/schema.sql` về cái giá của việc vào lõi.
  //
  // CỘT `checkOut` ĐÃ CÓ TỪ ĐẦU MÀ CHƯA MỘT ĐƯỜNG NÀO GHI VÀO NÓ. Ba màn hình
  // đang dựng chữ "Ra về ${record.checkOut}" từ nó, nên suốt từ ngày đầu tới
  // giờ chỗ ấy luôn rỗng và không ai thấy gì sai — màn hình chỉ đơn giản không
  // hiện dòng đó. Đây là đường ghi còn thiếu.
  //
  // ĐỌC BẢNG CŨ CHỨ KHÔNG DỜI BẢNG CŨ. Ảnh trả bé phân hệ đã ghi trước đợt này
  // ở lại nguyên chỗ của nó.
  //
  // HỎI CÔNG TẮC TRƯỚC KHI ĐỌC BẢNG CỦA PHÂN HỆ — bước hay quên nhất của kho
  // mã này, đã quên ba lần và có hẳn một bộ canh riêng (`test:doc-cheo`). Bản
  // đầu của khối này quên đúng lần thứ tư, và bộ canh bắt được ngay.
  //
  // Không phải chuyện hình thức: nhà trường TẮT phân hệ Đón trả bé mà lõi vẫn
  // dọn ảnh cũ của nó ra màn hình thì tắt một phân hệ chỉ còn là giấu cái biểu
  // tượng, không chặn được dữ liệu — đúng thứ Đ46 đã vấp.
  function anhVeDoiCu(file) {
    if (!modules.dangBat('dontra')) return null;
    try {
      return db.first('dontra_anh_tra',
        'SELECT studentId FROM dontra_anh_tra WHERE file = ?', [String(file || '')]);
    } catch (_) { return null; }   // phân hệ chưa từng bật thì chưa có bảng
  }

  function ghiChuVeCua(studentId, ngayXem) {
    const x = db.first('attendance_ghi_chu_ve',
      'SELECT ghiChu FROM attendance_ghi_chu_ve WHERE studentId = ? AND date = ?', [studentId, ngayXem]);
    return (x && x.ghiChu) || '';
  }

  // Ảnh trả bé của một ngày cho cả nhóm — lõi trước, phân hệ sau.
  function anhVeCuaNgay(ids, ngayXem) {
    const ra = new Map();
    if (!ids.length) return ra;
    const dau = ids.map(() => '?').join(',');
    // Phân hệ đang tắt thì KHÔNG đọc bảng của nó — xem chú thích ở `anhVeDoiCu`.
    try {
      if (!modules.dangBat('dontra')) throw new Error('dontra dang tat');
      for (const a of db.all('dontra_anh_tra',
        `SELECT studentId, file, taoLuc FROM dontra_anh_tra
          WHERE ngay = ? AND studentId IN (${dau})`, [ngayXem, ...ids])) {
        if (a.file) ra.set(a.studentId, { file: a.file, taoLuc: a.taoLuc });
      }
    } catch (_) { /* phân hệ chưa từng bật */ }
    // Lõi ghi sau nên ĐÈ LÊN bản của phân hệ: cùng một bé cùng một ngày thì
    // tấm mới nhất là tấm đúng.
    for (const a of db.all('attendance_anh_ve',
      `SELECT studentId, file, taoLuc FROM attendance_anh_ve
        WHERE date = ? AND studentId IN (${dau})`, [ngayXem, ...ids])) {
      if (a.file) ra.set(a.studentId, { file: a.file, taoLuc: a.taoLuc });
    }
    return ra;
  }

  // Cô ghi bé đã ra về: giờ ra, kèm ảnh nếu có chụp.
  //
  // KHÔNG TỰ ĐỔI TRẠNG THÁI ĐIỂM DANH. Bé nghỉ mà bấm nhầm nút ra về thì dòng
  // "Nghỉ có phép" phải ở nguyên — giờ ra là một sự kiện trong ngày, không
  // phải một phép ghi đè lên việc bé có đi học hay không.
  app.post('/api/attendance/ra-ve', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    const ngayGhi = String(b.date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayGhi)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    // Cùng luật khoá ngày với chính dòng điểm danh ấy (Đ127).
    if (chanNgoaiNgay(res, ngayGhi, 'ghi giờ ra về')) return;
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }

    const cu = db.first('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (!cu) {
      return res.status(400).json({
        error: 'Bé này chưa có dòng điểm danh hôm nay, nên chưa ghi giờ ra về được. '
          + 'Cô chấm điểm danh hoặc chụp ảnh con tới lớp trước nhé.',
      });
    }

    let anhMoi = null;
    if (b.anh) {
      if (typeof b.anh !== 'string') return res.status(400).json({ error: 'Ảnh chưa gửi lên được' });
      const phay = b.anh.indexOf(',');
      if (phay >= 0 && (b.anh.length - phay - 1) * 0.75 > TOI_DA_ANH_BYTE) {
        return res.status(400).json({ error: 'Ảnh nặng quá, cô chụp lại một khung hình nhỏ hơn nhé' });
      }
      try { anhMoi = uploads.saveDataUrl(b.anh); }
      catch (err) { return res.status(400).json({ error: err.message || 'Ảnh chưa gửi lên được' }); }
    }

    const gio = /^\d{2}:\d{2}$/.test(String(b.gio || '')) ? String(b.gio) : nowTime().slice(0, 5);
    db.update('attendance', cu.id, { checkOut: gio });
    if (anhMoi) {
      const anhCu = db.first('attendance_anh_ve',
        'SELECT file FROM attendance_anh_ve WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
      db.upsert('attendance_anh_ve', {
        studentId, date: ngayGhi, file: anhMoi.file,
        taoLuc: nowTime(), byUserId: req.user.id,
      }, ['studentId', 'date']);
      // Dọn tệp cũ, cùng lý do đã ghi ở ảnh tới lớp: chụp lại vài lần là
      // chuyện thường, mỗi lần bỏ lại một tệp là kho ảnh phình lên.
      if (anhCu && anhCu.file && anhCu.file !== anhMoi.file) uploads.remove(anhCu.file);
    }
    const ghiChu = ghiChuTuThan(b);
    if (ghiChu !== null) {
      db.upsert('attendance_ghi_chu_ve', {
        studentId, date: ngayGhi, ghiChu, nguoiGhi: req.user.id, capNhatLuc: new Date().toISOString(),
      }, ['studentId', 'date']);
    }
    db.audit(req.user.id, 'ghi-gio-ra-ve', studentId, { date: ngayGhi, gio, coAnh: !!anhMoi });

    // Báo gia đình — cùng lối với ảnh tới lớp.
    if (anhMoi) {
      tbb.gui({ studentId, loai: 'diemdanh', nguoiTao: req.user.id,
        tieuDe: 'Con đã được đón về',
        noiDung: `Cô đã trao con lúc ${gio}. Gia đình xem ảnh trong Điểm danh nhé.`,
        // Mở thẳng hộp của ngày ấy, đúng bé ấy (Đ239h, Đ239-vá4): tin đẩy chạm
        // vào chỉ mở địa chỉ, nên nhà hai con phải có mã bé trong địa chỉ. App
        // đời cũ bỏ qua phần ngày và mã, mở lịch tháng như trước.
        hash: `#/attendance/${ngayGhi}/${studentId}` });
    }
    res.json({
      ok: true, date: ngayGhi, gio,
      anh: anhMoi ? { file: anhMoi.file } : null,
      record: db.first('attendance', 'SELECT * FROM attendance WHERE id = ?', [cu.id]),
      ghiChuVe: ghiChuVeCua(studentId, ngayGhi),
    });
  });

  // Gỡ giờ ra về (bấm nhầm bé). Ảnh gỡ theo, dòng điểm danh ở nguyên.
  app.post('/api/attendance/ra-ve/go', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    const ngayGhi = String(b.date || todayStr());
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (chanNgoaiNgay(res, ngayGhi, 'gỡ giờ ra về')) return;
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    const cu = db.first('attendance',
      'SELECT * FROM attendance WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (cu) db.update('attendance', cu.id, { checkOut: null });
    const anhCu = db.first('attendance_anh_ve',
      'SELECT file FROM attendance_anh_ve WHERE studentId = ? AND date = ?', [studentId, ngayGhi]);
    if (anhCu) {
      // DÒNG Ở LẠI LÀM VẾT, TỆP ẢNH THÌ KHÔNG — cùng luật đã ghi ở phân hệ.
      db.upsert('attendance_anh_ve', {
        studentId, date: ngayGhi, file: '', taoLuc: nowTime(), byUserId: req.user.id,
      }, ['studentId', 'date']);
      if (anhCu.file) uploads.remove(anhCu.file);
    }
    // Ghi chú của lượt ra về bấm nhầm đi theo giờ ra; dòng ở lại làm vết.
    if (ghiChuVeCua(studentId, ngayGhi)) {
      db.upsert('attendance_ghi_chu_ve', {
        studentId, date: ngayGhi, ghiChu: '', nguoiGhi: req.user.id, capNhatLuc: new Date().toISOString(),
      }, ['studentId', 'date']);
    }
    db.audit(req.user.id, 'go-gio-ra-ve', studentId, { date: ngayGhi });
    res.json({ ok: true });
  });

  // =========================================================================
  // BẢNG RÀ SOÁT SAU 9 GIỜ
  // =========================================================================
  //
  // Nhà trường: "sau 9h bé nào chưa được điểm danh mà không xin nghỉ trước đó
  // thì báo đỏ để văn phòng kiểm tra lại sơ sót, hay con nghỉ, để liên lạc với
  // phụ huynh xác nhận".
  //
  // HAI ĐIỀU PHẢI GIỮ ĐÚNG
  //
  //   1. MÀU ĐỎ Ở ĐÂY LÀ VIỆC CỦA NGƯỜI LỚN CHƯA XONG, không phải một lời nào
  //      về đứa trẻ. Cô chưa kịp chấm, hoặc gia đình chưa kịp báo. QUY TẮC 2
  //      cấm trình bày "chưa" của một đứa trẻ như thất bại — chỗ này không nói
  //      gì về đứa trẻ cả, và chữ trên màn hình phải giữ đúng như vậy.
  //
  //   2. BÉ ĐÃ CÓ ĐƠN NGHỈ ĐƯỢC DUYỆT THÌ KHÔNG NẰM TRONG DANH SÁCH. Nếu không
  //      thì mỗi sáng văn phòng lại gọi điện hỏi một gia đình đã báo nghỉ từ
  //      hôm trước — vài lần như thế là cả bảng rà soát bị bỏ qua. Cùng bài
  //      học với Đ84, và dùng chung đúng `lib/nghi-hoc.js`.
  // CHỐT SỔ VẮNG SAU GIỜ RÀ SOÁT (Đ131).
  //
  // Nhà trường muốn bỏ hẳn bốn nút tích và đổi luật: "chụp ảnh → có mặt; xin
  // nghỉ được duyệt → Nghỉ có phép; không xin nghỉ → Nghỉ không phép". Hai vế
  // sau KHÔNG được để máy tự ghi lúc nửa đêm hay lúc 7h30 — máy ảnh hỏng, bé
  // tới lúc 9h05, mạng cổng trường rớt là ba chuyện có thật, và một dòng "Nghỉ
  // không phép" tự sinh là thứ gia đình đọc thấy trước khi ai kịp gọi.
  //
  // Nên đây là MỘT CHẠM CỦA NGƯỜI LỚN, sau giờ rà soát, sau khi văn phòng đã
  // gọi xác nhận: mọi bé của phạm vi mà chưa có dòng điểm danh sẽ được ghi một
  // lượt — có đơn được duyệt thì "Nghỉ có phép", không thì "Nghỉ không phép".
  // Bé đã có dòng (kể cả có mặt nhờ ảnh) giữ nguyên. Chụp ảnh SAU khi chốt vẫn
  // đè lại thành có mặt, đúng luật của `ghiCoMatTheoAnh`.
  //
  // Chỉ chốt được ĐÚNG HÔM NAY (Đ127) và chỉ SAU giờ rà soát: chốt lúc 7h30 là
  // ghi vắng cho cả nhóm đang trên đường tới trường.
  app.post('/api/attendance/chot-vang', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = String((req.body || {}).date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    if (chanNgoaiNgay(res, ngay, 'chốt')) return;
    // CHỐT SỔ VẮNG LÀ MỘT QUYẾT ĐỊNH CỦA SỔ, KHÔNG PHẢI VIỆC Ở CỔNG (Đ156).
    //
    // Một lần bấm ghi "nghỉ" cho MỌI bé chưa có dòng điểm danh hôm đó. Đó là
    // căn cứ cho suất ăn, cho tiền ăn cuối tháng, và là thứ gia đình đọc để
    // biết hôm nay con có tới lớp không — thuộc về người cầm sổ, không thuộc
    // về chiếc máy dùng chung đặt ngoài cổng. Cùng lý do và cùng chỗ chặn với
    // `PUT /api/attendance/cai-dat` bên trên.
    //
    // Hỏi `role === 'admin'` trước, có chủ ý: CÔ vẫn chốt sổ nhóm mình được y
    // như trước (Đ131) — tầng chức vụ chỉ nói về tài khoản quản trị, và
    // `datNepDuoc` trả false cho mọi vai khác. Bỏ vế này là lấy mất của cô một
    // việc cô vẫn đang làm hằng ngày.
    if (req.user.role === 'admin' && !db.datNepDuoc(req.user)) {
      return res.status(403).json({
        error: 'Chốt sổ vắng là việc của văn phòng hoặc ban giám hiệu — một lần '
          + 'bấm là ghi nghỉ cho mọi bé chưa được chấm. Ở cổng thì chụp ảnh và '
          + 'chấm từng bé thôi nhé.',
      });
    }
    // QUYỀN HỎI TRƯỚC GIỜ. Hỏi giờ trước thì lúc 7h sáng, cô nhóm khác gõ nhầm
    // mã nhóm nhận câu "chưa tới giờ" thay vì "không phải nhóm của cô" — câu
    // đúng phải là câu thứ hai, bất kể mấy giờ.
    const locNhom = String((req.body || {}).classId || '');
    if (locNhom && !db.canAccessClass(req.user, locNhom)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc phạm vi của tài khoản' });
    }
    const mocRaSoat = gioRaSoat();
    if (String(nowTime()).slice(0, 5) < mocRaSoat) {
      return res.status(400).json({
        error: `Chốt sổ vắng chỉ làm được sau ${gioRaSoatChu(mocRaSoat)} — trước đó các cô vẫn đang đón bé.`,
        gioRaSoat: mocRaSoat,
        gioRaSoatChu: gioRaSoatChu(mocRaSoat),
      });
    }
    const students = locNhom
      ? db.studentsOf(req.user).filter(s => s.classId === locNhom)
      : db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.status(400).json({ error: 'Phạm vi này chưa có bé nào' });

    const daCham = new Set();
    const marks = ids.map(() => '?').join(',');
    for (const r of db.all('attendance',
      `SELECT studentId FROM attendance WHERE date = ? AND studentId IN (${marks})`,
      [ngay, ...ids])) daCham.add(r.studentId);
    const dangNghi = nghiHoc.nghiCoPhep(ids, ngay);

    // NGÀY TRƯỜNG NGHỈ THÌ KHÔNG NHÀ NÀO PHẢI XIN PHÉP (Đ147).
    //
    // Đây là nửa sau của yêu cầu nhà trường, và là nửa dễ làm sai. Luật cũ nói:
    // không có đơn, không có ảnh đến lớp → nghỉ KHÔNG phép. Đúng cho một ngày
    // thường. Nhưng đúng vào mùng Một Tết thì cả ba trăm bé bị ghi nghỉ không
    // phép — trong sổ của cô, trên màn hình của gia đình, và trong cột tiền ăn
    // cuối tháng của mọi nhà cùng một lúc.
    //
    // Hỏi theo CƠ SỞ CỦA TỪNG NHÓM chứ không hỏi một lần cho cả lượt chốt: văn
    // phòng chốt gộp thì danh sách có bé của nhiều cơ sở, mà một đợt nghỉ có
    // thể chỉ áp cho một cơ sở (sửa chữa, mất nước).
    const dotCuaNhom = nghiHoc.dotNghiTheoNhom(ngay);

    const daGhi = [];
    const tenDot = new Set();
    db.tx(() => {
      for (const s of students) {
        if (daCham.has(s.id)) continue;
        const dot = dotCuaNhom(s.classId);
        if (dot) tenDot.add(dot.ten);
        const status = (dangNghi.get(s.id) || dot) ? 'absent_excused' : 'absent_unexcused';
        db.insert('attendance', {
          id: db.nextId('att'), studentId: s.id, date: ngay,
          status, checkIn: null, checkOut: null,
          // Ghi luôn VÌ SAO vào chính dòng đó. Gia đình mở lịch tháng ra sẽ đọc
          // được "Trường nghỉ: Nghỉ giỗ Tổ" thay vì một chữ "nghỉ có phép"
          // không ai giải thích, và cô cũng không phải nhớ hộ sang tháng sau.
          note: dot && !dangNghi.get(s.id) ? `Trường nghỉ: ${dot.ten}` : '',
          markedBy: req.user.id,
        });
        daGhi.push({ studentId: s.id, hoTen: s.name, status });
      }
    });
    const soNghiCoPhep = daGhi.filter(x => x.status === 'absent_excused').length;
    // Câu này đi thẳng ra màn hình của người vừa bấm nút, nên nó nói VIỆC ĐÃ
    // XẢY RA, không nói gì về đứa trẻ nào.
    const lyDo = tenDot.size
      ? `Hôm nay trường nghỉ (${[...tenDot].join(', ')}) nên các bé chưa có dòng `
        + 'được ghi là NGHỈ CÓ PHÉP, gia đình không phải xin phép.'
      : '';
    db.audit(req.user.id, 'chot-vang', locNhom || null, {
      date: ngay, soNghiCoPhep, soNghiKhongPhep: daGhi.length - soNghiCoPhep,
      truongNghi: [...tenDot],
    });
    res.json({
      ok: true, date: ngay,
      soDaCoTruoc: daCham.size,
      soNghiCoPhep,
      soNghiKhongPhep: daGhi.length - soNghiCoPhep,
      lyDo,
      danhSach: daGhi,
    });
  });

  app.get('/api/attendance/ra-soat', requireRole('teacher', 'admin'), (req, res) => {
    const date = String(req.query.date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    }
    const locNhom = String(req.query.classId || '');
    if (locNhom && !db.canAccessClass(req.user, locNhom)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc phạm vi của tài khoản' });
    }
    const students = locNhom
      ? db.studentsOf(req.user).filter(s => s.classId === locNhom)
      : db.studentsOf(req.user);

    const ids = students.map(s => s.id);
    const daCham = new Set();
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      for (const r of db.all('attendance',
        `SELECT studentId FROM attendance WHERE date = ? AND studentId IN (${marks})`,
        [date, ...ids])) daCham.add(r.studentId);
    }
    const dangNghi = nghiHoc.nghiCoPhep(ids, date);

    // ĐÃ QUA GIỜ RÀ SOÁT CHƯA — chỉ có nghĩa với NGÀY HÔM NAY.
    //
    // Xem lại một ngày đã qua thì bảng rà soát luôn có nghĩa: buổi sáng ấy đã
    // trôi qua từ lâu. Còn hôm nay lúc 7h30 mà đã kêu "chưa điểm danh" thì
    // bảng này kêu suốt cả tiếng rưỡi đầu giờ, và người ta tắt nó đi.
    const homNay = todayStr();
    const mocRaSoat = gioRaSoat();
    const quaGio = date < homNay || (date === homNay && String(nowTime()).slice(0, 5) >= mocRaSoat);

    // NGÀY TRƯỜNG NGHỈ KHÔNG PHẢI NGÀY "CHƯA ĐIỂM DANH" (góp ý 20/10, D5).
    //
    // Cả trường (hoặc cả cơ sở) đóng cửa thì không bé nào phải điểm danh,
    // nên bảng gọi xác nhận không được liệt kê cả trăm bé đúng ngày Tết. Hỏi
    // theo cơ sở của TỪNG NHÓM, cùng cách với chốt sổ vắng bên trên.
    const truongNghi = nghiHoc.dotNghiTheoNhom(date);
    const chuaCham = students.filter(s => !daCham.has(s.id) && !dangNghi.get(s.id));
    const canRaSoat = chuaCham
      .filter(s => !truongNghi(s.classId))
      .map(s => ({ studentId: s.id, hoTen: s.name, avatar: s.avatar, classId: s.classId }));

    res.json({
      date, gioRaSoat: mocRaSoat, gioRaSoatChu: gioRaSoatChu(mocRaSoat), quaGio,
      // Người này có được đặt mốc giờ và chốt sổ vắng không (Đ156).
      //
      // Máy chủ nói ra, màn hình chỉ nghe theo: không có trường này thì màn
      // Điểm danh phải tự đoán bằng cách kể tên chức vụ ra ở phía trình duyệt
      // — mà mỗi lần bảng chức vụ đổi là màn hình lại nói sai một chỗ.
      datNepDuoc: db.datNepDuoc(req.user) || req.user.role !== 'admin',
      soCanRaSoat: quaGio ? canRaSoat.length : 0,
      danhSach: quaGio ? canRaSoat : [],
      // Trả về cả số bé đã có đơn nghỉ được duyệt, để văn phòng thấy vì sao
      // danh sách ngắn hơn mình tưởng và không đi tìm nhầm.
      soDaCoDonNghi: [...dangNghi.keys()].filter(id => !daCham.has(id)).length,
      // Số bé chưa có dòng mà hôm ấy trường (cơ sở) nghỉ — không cần gọi.
      soTruongNghi: chuaCham.length - canRaSoat.length,
    });
  });

  // =========================================================================
  // CHẤM CÔNG CÔ VÀ NHÂN VIÊN BẰNG ẢNH Ở CỔNG (góp ý 06/10, mục 2)
  // =========================================================================
  //
  // Trường: *"Giáo viên (click vào sẽ ra danh sách giáo viên, nhân viên cần
  // điểm danh ở cơ sở đó) … khi điểm danh ai sẽ click vào sau đó sẽ chụp để
  // checkin; ở dưới mỗi tên sẽ hiện thời gian checkin; chụp lần 2 sẽ tự động
  // được ghi nhận là ra về"*. Chủ dự án chốt 06/10: chụp ảnh như với bé.
  //
  // BA ĐIỀU CỐ Ý:
  //   • Người chụp (bảo vệ, văn phòng, quản lý cơ sở) thấy TÊN VÀ GIỜ, không
  //     thấy ảnh, không thấy hồ sơ. Ảnh khuôn mặt người lớn chỉ Nhân sự, Ban
  //     giám hiệu, quản lý ĐÚNG cơ sở và chính người ấy mở được — qua
  //     `/api/nhansu/anh-cham-cong`, không qua đường này.
  //   • Danh sách cắt theo CƠ SỞ: cô có nhóm ở cơ sở ấy, nhân viên được gắn
  //     vào cơ sở ấy. Tài khoản cả trường thấy mọi người.
  //   • Chỉ HÔM NAY. Ảnh lần một là giờ vào, lần hai là giờ ra, lần ba bị từ
  //     chối — sửa giờ công ngày cũ là việc của Nhân sự ở màn Chấm công.
  const CHUC_VU_CHUP_CONG = ['baove', 'vanphong-coso', 'quanly-coso', 'hieu-truong', 'nhansu'];
  function chupCongDuoc(user) {
    if (!user || user.role !== 'admin') return false;
    const cv = db.chucVu(user);
    return !cv || CHUC_VU_CHUP_CONG.includes(cv);
  }
  function coSoCuaNguoi(u) {
    const r = db.first('user_campus', 'SELECT campusId FROM user_campus WHERE userId = ?', [u.id]);
    if (r) return r.campusId;
    const c = db.first('class_teachers',
      `SELECT cc.campusId FROM class_teachers ct JOIN class_campus cc ON cc.classId = ct.classId
       JOIN classes c ON c.id = ct.classId AND c.active = 1
       WHERE ct.teacherId = ? ORDER BY ct.vaiTro = 'chinh' DESC LIMIT 1`, [u.id]);
    return c ? c.campusId : '';
  }
  function nhanVienTrongPhamVi(user) {
    const ds = db.all('users',
      "SELECT id, name, title, avatar, role FROM users WHERE active = 1 AND role IN ('teacher', 'admin') ORDER BY name");
    const khoa = db.phamViCoSo(user);
    if (!khoa) return ds;
    // Chỉ nhóm ĐANG MỞ: chuyển năm học giữ lại dòng phân công của nhóm đã
    // đóng (lib/db.js lọc đúng như vậy ở classIdsOfTeacher). Không lọc thì cô
    // đã chuyển cơ sở vẫn nằm ở cổng cơ sở cũ, và ảnh công của cô ghi nhầm cơ
    // sở cũ — đúng trường dữ liệu Nhân sự dùng để cắt quyền xem (vòng rà Đ232).
    const coCo = new Set(db.all('class_teachers',
      `SELECT DISTINCT ct.teacherId AS id FROM class_teachers ct
       JOIN class_campus cc ON cc.classId = ct.classId
       JOIN classes c ON c.id = ct.classId AND c.active = 1 WHERE cc.campusId = ?`, [khoa]).map(r => r.id));
    const coNv = new Set(db.all('user_campus',
      'SELECT userId AS id FROM user_campus WHERE campusId = ?', [khoa]).map(r => r.id));
    return ds.filter(u => coCo.has(u.id) || coNv.has(u.id));
  }
  function dongCong(userId, ngayXem) {
    return db.first('staff_checkin', 'SELECT * FROM staff_checkin WHERE userId = ? AND ngay = ?', [userId, ngayXem]);
  }

  // GIỮ ẢNH CHẤM CÔNG 90 NGÀY, GIỜ VÀO / RA GIỮ MÃI (chủ dự án chốt 07/10).
  //
  // Ảnh khuôn mặt người lớn là dữ liệu nhạy cảm theo Nghị định 13; giữ lâu hơn
  // mức cần để đối chiếu công là giữ rủi ro mà không được gì. Đồng hồ định giờ
  // (lib/hen-gio.js, mỗi 15 phút) xoá TỆP ẢNH của những ngày quá 90 ngày và
  // để trống cột ảnh; dòng công — ngày, giờ vào, giờ ra, ai chụp — còn nguyên.
  // Bản sao lưu cũ vẫn giữ ảnh theo lịch dọn của chính nó.
  const NGAY_GIU_ANH_CONG = 90;
  function donAnhChamCong() {
    const moc = ngay.ngayCua(Date.now() - NGAY_GIU_ANH_CONG * 86400000);
    const ds = db.all('staff_checkin',
      `SELECT id, anhVao, anhRa FROM staff_checkin
        WHERE ngay < ? AND (COALESCE(anhVao, '') != '' OR COALESCE(anhRa, '') != '') LIMIT 500`, [moc]);
    for (const r of ds) {
      if (r.anhVao) uploads.remove(r.anhVao);
      if (r.anhRa) uploads.remove(r.anhRa);
      db.update('staff_checkin', r.id, { anhVao: '', anhRa: '' });
    }
    return ds.length;
  }
  require('../lib/hen-gio').dangKy('diemdanh:don-anh-cham-cong', donAnhChamCong);
  // Nhân sự đang bật thì chép giờ sang bảng công — chỉ điền ô CÒN TRỐNG, không
  // đè giờ Nhân sự đã sửa tay, không đổi loại ngày công đã ghi.
  function chepSangNhanSu(userId, ngayGhi, phan, gio, nguoi) {
    if (!modules.dangBat('nhansu')) return;
    try {
      const cu = db.first('nhansu_cham_cong', 'SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [userId, ngayGhi]);
      const cot = phan === 'ra' ? 'gioRa' : 'gioVao';
      if (!cu) {
        db.upsert('nhansu_cham_cong', {
          userId, ngay: ngayGhi, loai: 'di-lam', gioVao: phan === 'vao' ? gio : '', gioRa: phan === 'ra' ? gio : '',
          ghiChu: 'Chụp ảnh ở cổng', nguoiGhi: nguoi, capNhatLuc: new Date().toISOString(),
        }, ['userId', 'ngay']);
      } else if (!cu[cot]) {
        db.run(`UPDATE nhansu_cham_cong SET ${cot} = ?, capNhatLuc = ? WHERE userId = ? AND ngay = ?`,
          [gio, new Date().toISOString(), userId, ngayGhi]);
      }
    } catch (_) { /* phân hệ Nhân sự hỏng thì không làm hỏng việc chấm ở cổng */ }
  }

  // GỠ MỘT LẦN CHỤP THÌ GỠ CẢ BẢN ĐÃ CHÉP SANG BẢNG CÔNG (vòng rà Đ232).
  // Không thế thì chụp nhầm cô Lan rồi gỡ, bảng công và tệp xuất cho kế toán
  // vẫn tính cô Lan một công. Chỉ gỡ đúng thứ CỔNG đã ghi: dòng mang ghi chú
  // "Chụp ảnh ở cổng", loại đi làm, ô giờ còn đúng giờ vừa gỡ — Nhân sự đã sửa
  // tay thì không đụng. Dòng do cổng tạo mà hết cả giờ vào lẫn giờ ra thì bỏ.
  function hoanNhanSu(userId, ngayGhi, phan, gio) {
    if (!gio || !modules.dangBat('nhansu')) return;
    try {
      const cu = db.first('nhansu_cham_cong', 'SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [userId, ngayGhi]);
      if (!cu || cu.ghiChu !== 'Chụp ảnh ở cổng' || cu.loai !== 'di-lam') return;
      const cot = phan === 'ra' ? 'gioRa' : 'gioVao';
      if (cu[cot] !== gio) return;
      const con = { gioVao: cu.gioVao || '', gioRa: cu.gioRa || '', [cot]: '' };
      if (!con.gioVao && !con.gioRa) {
        db.run('DELETE FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [userId, ngayGhi]);
      } else {
        db.run(`UPDATE nhansu_cham_cong SET ${cot} = '', capNhatLuc = ? WHERE userId = ? AND ngay = ?`,
          [new Date().toISOString(), userId, ngayGhi]);
      }
    } catch (_) { /* phân hệ Nhân sự hỏng thì không làm hỏng việc gỡ ở cổng */ }
  }

  app.get('/api/attendance/nhan-vien', requireRole('admin'), (req, res) => {
    if (!chupCongDuoc(req.user)) return res.status(403).json({ error: 'Tài khoản này không chấm công ở cổng' });
    const ngayXem = String(req.query.date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayXem)) return res.status(400).json({ error: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' });
    const ds = nhanVienTrongPhamVi(req.user).map(u => {
      const c = dongCong(u.id, ngayXem) || {};
      return {
        userId: u.id, hoTen: u.name, title: u.title || '', avatar: u.avatar,
        vai: u.role === 'teacher' ? 'Cô' : 'Nhân viên',
        gioVao: c.gioVao || '', gioRa: c.gioRa || '', coAnhVao: !!c.anhVao, coAnhRa: !!c.anhRa,
      };
    });
    res.json({ date: ngayXem, homNay: ngayXem === todayStr(), danhSach: ds });
  });

  app.post('/api/attendance/nhan-vien/anh', requireRole('admin'), (req, res) => {
    if (!chupCongDuoc(req.user)) return res.status(403).json({ error: 'Tài khoản này không chấm công ở cổng' });
    const { userId, anh } = req.body || {};
    const ngayGhi = todayStr();
    const u = userId ? db.findUser(String(userId)) : null;
    if (!u || !nhanVienTrongPhamVi(req.user).some(x => x.id === u.id)) {
      return res.status(404).json({ error: 'Không tìm thấy người này trong danh sách của cơ sở' });
    }
    if (!anh || typeof anh !== 'string') return res.status(400).json({ error: 'Chưa chọn ảnh' });
    const phay = anh.indexOf(',');
    if (phay >= 0 && (anh.length - phay - 1) * 0.75 > TOI_DA_ANH_BYTE) {
      return res.status(400).json({ error: 'Ảnh nặng quá, chụp lại một khung hình nhỏ hơn nhé' });
    }
    const cu = dongCong(u.id, ngayGhi);
    if (cu && cu.gioVao && cu.gioRa) {
      return res.status(400).json({
        error: `Hôm nay đã ghi đủ giờ vào (${cu.gioVao}) và giờ ra (${cu.gioRa}). Cần sửa thì nhờ Nhân sự ở màn Chấm công.`,
      });
    }
    let luu;
    try { luu = uploads.saveDataUrl(anh); } catch (err) {
      return res.status(400).json({ error: err.message || 'Ảnh chưa gửi lên được' });
    }
    const gio = String(nowTime()).slice(0, 5);
    const phan = cu && cu.gioVao ? 'ra' : 'vao';
    const luc = new Date().toISOString();
    if (!cu) {
      db.insert('staff_checkin', {
        id: db.nextId('ccn'), userId: u.id, ngay: ngayGhi, gioVao: gio, anhVao: luu.file,
        // Cơ sở của CỔNG chụp (người bấm khoá vào một cơ sở) trước, rồi mới tới
        // cơ sở của người được chụp — đó mới là nơi người ấy thật sự đi qua.
        campusId: db.phamViCoSo(req.user) || coSoCuaNguoi(u), nguoiChupVao: req.user.id, capNhatLuc: luc,
      });
    } else if (phan === 'vao') {
      db.update('staff_checkin', cu.id, { gioVao: gio, anhVao: luu.file, nguoiChupVao: req.user.id, capNhatLuc: luc });
    } else {
      db.update('staff_checkin', cu.id, { gioRa: gio, anhRa: luu.file, nguoiChupRa: req.user.id, capNhatLuc: luc });
    }
    db.audit(req.user.id, phan === 'vao' ? 'cong-anh-vao' : 'cong-anh-ra', u.id, { ngay: ngayGhi, gio });
    chepSangNhanSu(u.id, ngayGhi, phan, gio, req.user.id);
    const c = dongCong(u.id, ngayGhi);
    res.status(201).json({ ok: true, userId: u.id, phan, gioVao: c.gioVao, gioRa: c.gioRa });
  });

  // Gỡ lần chụp gần nhất của HÔM NAY — chụp nhầm người là phải gỡ được ngay.
  // Gỡ giờ ra trước; còn giờ ra thì không gỡ được giờ vào.
  app.post('/api/attendance/nhan-vien/go', requireRole('admin'), (req, res) => {
    if (!chupCongDuoc(req.user)) return res.status(403).json({ error: 'Tài khoản này không chấm công ở cổng' });
    const userId = String((req.body || {}).userId || '');
    if (!nhanVienTrongPhamVi(req.user).some(x => x.id === userId)) {
      return res.status(404).json({ error: 'Không tìm thấy người này trong danh sách của cơ sở' });
    }
    const ngayGhi = todayStr();
    const cu = dongCong(userId, ngayGhi);
    if (!cu || !cu.gioVao) return res.status(400).json({ error: 'Hôm nay chưa có lần chụp nào để gỡ' });
    const luc = new Date().toISOString();
    if (cu.gioRa) {
      db.update('staff_checkin', cu.id, { gioRa: '', anhRa: '', nguoiChupRa: null, capNhatLuc: luc });
      if (cu.anhRa) uploads.remove(cu.anhRa);
      hoanNhanSu(userId, ngayGhi, 'ra', cu.gioRa);
      db.audit(req.user.id, 'cong-anh-go', userId, { ngay: ngayGhi, phan: 'ra' });
      return res.json({ ok: true, daGo: 'ra' });
    }
    db.run('DELETE FROM staff_checkin WHERE id = ?', [cu.id]);
    if (cu.anhVao) uploads.remove(cu.anhVao);
    hoanNhanSu(userId, ngayGhi, 'vao', cu.gioVao);
    db.audit(req.user.id, 'cong-anh-go', userId, { ngay: ngayGhi, phan: 'vao' });
    res.json({ ok: true, daGo: 'vao' });
  });
};
