// NHẬT KÝ NGÀY — ăn, ngủ, vệ sinh, thay bỉm, bú bình.
//
// Đây là trang sổ giấy mà gia đình đọc mỗi chiều. Mục tiêu số một của cả app
// là thay được quyển sổ đó, nên phân hệ này là phân hệ quyết định.
//
// HAI ĐIỀU QUYẾT ĐỊNH CÔ CÓ DÙNG HAY KHÔNG
//
// 1. GHI CẢ NHÓM MỘT LƯỢT. Cô có 20 bé và khoảng 10 phút cuối giờ. Bắt cô mở
//    20 màn hình rồi bấm lưu 20 lần là bảo đảm cô quay lại quyển sổ giấy —
//    ở đó cô viết một dòng "cả lớp ngủ 11h30–14h" là xong. Nên đường ghi nhận
//    MỘT MẢNG bản ghi và lưu trong một giao dịch.
//
// 2. KHÔNG BẮT ĐIỀN ĐỦ. Ô nào cô không kịp ghi thì để trống, và trống nghĩa là
//    "cô chưa ghi", không phải "bé không ăn". Máy chủ không bao giờ tự điền
//    thay, và màn hình gia đình phải nói đúng chữ "chưa ghi".
//
// QUY TẮC 4 CỦA CLAUDE.md Ở PHÂN HỆ NÀY
//
// Mức ăn ghi theo SUẤT ĂN chứ không theo đứa trẻ: "ăn hết", "khoảng nửa suất",
// "ăn ít". Không quy ra con số nào, không cộng dồn, và không màn hình nào đặt
// các bé cạnh nhau theo mức ăn. Một bé ăn ít ba hôm liền là thông tin cho cô
// và cho gia đình, không phải một chỗ đứng cao thấp so với bạn.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');

// Mức ăn hợp lệ. Cố ý là NHÃN CHỮ, không phải số — để là số thì sớm muộn có
// người cộng lại rồi sắp các bé trên dưới nhau.
const MUC_AN = ['het', 'gan-het', 'nua-suat', 'it', 'khong-an'];
const TINH_CHAT = ['binh-thuong', 'hoi-long', 'long', 'tao'];

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TOI_DA_GHI_CHU = 500;
const TOI_DA_SO_LAN = 20;      // trần cho mọi ô đếm — chặn số vô lý gõ nhầm
const TOI_DA_ML = 2000;

function homNay() {
  return ngay.homNay();
}

// Ba bữa của nhật ký khớp với ba `type` mà màn Thực đơn đang dùng.
const BUA = [['anSang', 'breakfast'], ['anTrua', 'lunch'], ['anXe', 'snack']];

// KHUNG GIỜ NGỦ TRƯA — cô CHỌN, không gõ.
//
// Nhà trường nói rõ: "thời gian ngủ từ 12h đến 2h chiều, lựa trong khung đó sao
// cho giáo viên chọn tiện nhất". Hai ô nhập giờ tự do bắt cô gõ bốn chữ số hai
// lần cho mỗi bé — với nhóm 20 bé là 160 lần gõ mỗi ngày.
//
// Khung rộng hơn 12h–14h một chút ở hai đầu: bé ngủ sớm hay dậy muộn là chuyện
// thường, và ô chọn thiếu mất giờ cô cần là cô lại quay về gõ tay.
const GIO_NGU = [];
for (let phut = 10 * 60 + 30; phut <= 15 * 60 + 30; phut += 15) {
  GIO_NGU.push(`${String(Math.floor(phut / 60)).padStart(2, '0')}:${String(phut % 60).padStart(2, '0')}`);
}

// Bé này có cần ghi thay bỉm và bú bình không.
//
// Quyết định theo NGÀY SINH, không theo tên nhóm: trường nhận bé từ 12 tháng,
// và một bé 20 tháng có thể đang học nhóm mà phần lớn các bạn đã 3 tuổi. Đi
// theo tên nhóm là bỏ sót đúng bé cần nhất.
//
// Mốc 36 tháng là mốc trường dùng để tách nhà trẻ với mẫu giáo. Bé quanh mốc
// đó thì cô vẫn ghi được — ô hiện ra, cô để trống nếu không cần.
function laNhaTre(dob) {
  if (!NGAY_RE.test(String(dob || ''))) return false;
  const sinh = new Date(`${dob}T00:00:00Z`);
  const nay = new Date();
  if (Number.isNaN(sinh.getTime()) || sinh > nay) return false;
  let thang = (nay.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (nay.getUTCMonth() - sinh.getUTCMonth());
  if (nay.getUTCDate() < sinh.getUTCDate()) thang -= 1;
  return thang < 36;
}

module.exports = (app, { db, modules }) => {
  // Làm sạch một bản ghi người dùng gửi lên.
  //
  // Trả về { loi } nếu có gì không hợp lệ. Từ chối chứ không tự sửa: một ô số
  // lần vệ sinh gõ nhầm thành 200 mà máy tự cắt về 20 thì gia đình đọc được
  // một con số không ai từng gõ.
  function lamSach(x) {
    const ra = {};
    for (const k of ['anSang', 'anTrua', 'anXe']) {
      const v = String(x[k] || '').trim();
      if (v && !MUC_AN.includes(v)) return { loi: `Mức ăn "${v}" không hợp lệ` };
      ra[k] = v;
    }
    // Vẫn nhận MỌI giờ hợp lệ, không chỉ giờ trong khung chọn sẵn.
    //
    // Khung GIO_NGU là thứ giúp cô bấm nhanh, không phải hàng rào. Bé ngủ 09:50
    // vì sáng đó mệt là chuyện có thật, và app từ chối ghi điều đã xảy ra thì
    // cô quay lại quyển sổ giấy — ở đó cô viết được mọi thứ.
    for (const k of ['nguTuLuc', 'nguDenLuc']) {
      const v = String(x[k] || '').trim();
      if (v && !GIO_RE.test(v)) return { loi: 'Giờ ngủ phải có dạng 11:30' };
      ra[k] = v;
    }
    if (ra.nguTuLuc && ra.nguDenLuc && ra.nguDenLuc <= ra.nguTuLuc) {
      return { loi: 'Giờ dậy phải sau giờ ngủ' };
    }
    const tc = String(x.veSinhTinhChat || '').trim();
    if (tc && !TINH_CHAT.includes(tc)) return { loi: 'Tình trạng vệ sinh không hợp lệ' };
    ra.veSinhTinhChat = tc;

    for (const [k, tran] of [['veSinhSoLan', TOI_DA_SO_LAN], ['bimSoLan', TOI_DA_SO_LAN],
      ['buBinhSoLan', TOI_DA_SO_LAN], ['buBinhMl', TOI_DA_ML]]) {
      // Trống khác 0. "Cô chưa ghi" khác "không lần nào".
      if (x[k] === undefined || x[k] === null || x[k] === '') { ra[k] = null; continue; }
      const n = Number(x[k]);
      if (!Number.isInteger(n) || n < 0 || n > tran) {
        return { loi: `Con số ở ô "${k}" chưa hợp lệ (0 đến ${tran})` };
      }
      ra[k] = n;
    }
    for (const k of ['anGhiChu', 'nguGhiChu', 'ghiChu']) {
      ra[k] = String(x[k] || '').trim().slice(0, TOI_DA_GHI_CHU);
    }
    return ra;
  }

  function keml(be, hang) {
    return {
      studentId: be.id,
      hoTen: be.name,
      avatar: be.avatar,
      laNhaTre: laNhaTre(be.dob),
      ...(hang || {}),
      // `daGhi` để màn hình phân biệt "cô chưa mở tới bé này" với "cô đã ghi
      // và hôm nay bé không ăn gì". Hai chuyện khác hẳn nhau.
      daGhi: !!hang,
    };
  }

  // Đọc nhật ký.
  //
  //   ?classId=&ngay=      cô xem cả nhóm một ngày
  //   ?studentId=&tu=&den= gia đình xem con mình một khoảng ngày
  app.get('/api/nhatky', (req, res) => {
    const { classId, studentId } = req.query;
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();

    if (studentId) {
      if (!db.canAccessStudent(req.user, studentId)) {
        return res.status(403).json({ error: 'Không có quyền xem nhật ký của bé này' });
      }
      const be = db.findStudent(studentId);
      if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
      const tu = NGAY_RE.test(String(req.query.tu || '')) ? req.query.tu : ngay;
      const den = NGAY_RE.test(String(req.query.den || '')) ? req.query.den : ngay;
      const rows = db.all('nhatky_ngay',
        'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay BETWEEN ? AND ? ORDER BY ngay DESC',
        [studentId, tu, den]);
      // Gia đình cũng thấy hôm đó trường cho ăn món gì — ngay cạnh dòng bé ăn
      // được bao nhiêu. Không có phần này thì cô phải gõ lại tên món vào ô ghi
      // chú cho từng bé, đúng thứ nhà trường bảo là mất công.
      const td = thucDonKhoang(tu, den);
      return res.json({
        be: { id: be.id, hoTen: be.name, laNhaTre: laNhaTre(be.dob) },
        ngayCo: rows.map(r => ({
          ...r,
          nguoiGhiTen: tenNguoiGhi(r.nguoiGhi),
          thucDon: td.get(r.ngay) || null,
        })),
      });
    }

    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm hoặc chọn bé' });

    // MÀN CẢ NHÓM CHỈ DÀNH CHO CÔ VÀ VĂN PHÒNG — KHÔNG CHO PHỤ HUYNH.
    //
    // `db.canAccessClass` trả true cho phụ huynh với nhóm của con họ, và đúng
    // là như vậy cho thông báo hay album — những thứ vốn dành cho cả nhóm.
    // Nhưng nhật ký ngày thì khác hẳn: nó là chuyện đi vệ sinh, thay bỉm, ăn
    // uống của TỪNG ĐỨA TRẺ. Dùng lại canAccessClass ở đây là mở nguyên trang
    // sổ của 20 bé cho bố mẹ của một bé.
    //
    // Phụ huynh có đường riêng: ?studentId= — và đường đó đi qua
    // db.canAccessStudent, tức chỉ con mình.
    if (req.user.role === 'parent') {
      return res.status(403).json({
        error: 'Gia đình xem nhật ký của con mình, không xem được cả nhóm',
      });
    }
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem nhật ký của nhóm này' });
    }
    const dsBe = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    if (!dsBe.length) return res.json({ ngay, danhSach: [] });

    const marks = dsBe.map(() => '?').join(',');
    const daCo = new Map();
    for (const r of db.all('nhatky_ngay',
      `SELECT * FROM nhatky_ngay WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
      daCo.set(r.studentId, r);
    }
    res.json({
      ngay,
      classId,
      // THỰC ĐƠN CỦA ĐÚNG NGÀY ĐÓ, GỬI KÈM LUÔN.
      //
      // Nhà trường yêu cầu thẳng: "link luôn với thực đơn từng ngày, tránh phải
      // gõ tay lại". Không có phần này thì cô phải nhớ hôm nay ăn món gì rồi tự
      // gõ vào ô ghi chú — vừa mất thời gian, vừa là chỗ hai màn hình của cùng
      // một trường nói hai chuyện khác nhau về cùng một bữa ăn.
      //
      // Chỉ ĐỌC thực đơn, không sửa: thực đơn là của cả trường, do văn phòng
      // soạn. Cô ghi bé ăn được bao nhiêu phần của bữa đó, thế thôi.
      thucDon: thucDonCuaNgay(ngay),
      khungGioNgu: GIO_NGU,
      danhSach: dsBe.map(b => keml(b, daCo.get(b.id))),
    });
  });

  // Một bản ghi thực đơn → đúng ba ô ăn của nhật ký.
  function gomBua(m) {
    const buaAn = (m && Array.isArray(m.meals)) ? m.meals : [];
    const ra = {};
    for (const [o, kieu] of BUA) {
      const b = buaAn.find(x => x && x.type === kieu);
      ra[o] = b ? { ten: b.label || '', gio: b.time || '', mon: b.items || [] } : null;
    }
    return ra;
  }

  // TẮT THỰC ĐƠN LÀ TẮT Ở MỌI MÀN HÌNH, KỂ CẢ MÀN HÌNH NÀY.
  //
  // Quy trình "bỏ một tính năng" của CLAUDE.md hứa rằng tắt trong Quản trị →
  // Tính năng thì nó "biến khỏi màn hình". Nhật ký đọc thẳng bảng `menus` nên
  // nếu không hỏi công tắc, trường tắt Thực đơn xong vẫn thấy thực đơn cũ hiện
  // ra ở đây — vừa sai lời hứa, vừa là dữ liệu không còn ai cập nhật.
  //
  // Trả `null` chứ không phải object rỗng: màn hình cần phân biệt "trường không
  // dùng phần thực đơn" với "hôm đó chưa ai soạn thực đơn".
  function thucDonBat() {
    return !!(modules && typeof modules.dangBat === 'function' && modules.dangBat('thucdon'));
  }

  function thucDonCuaNgay(ngay) {
    if (!thucDonBat()) return null;
    return gomBua(db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngay]));
  }

  // Cả khoảng ngày trong MỘT câu truy vấn — gia đình xem hai tuần một lần mở.
  function thucDonKhoang(tu, den) {
    const ra = new Map();
    if (!thucDonBat()) return ra;
    for (const m of db.all('menus',
      'SELECT * FROM menus WHERE date BETWEEN ? AND ?', [tu, den])) {
      ra.set(m.date, gomBua(m));
    }
    return ra;
  }

  function tenNguoiGhi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // Cô ghi nhật ký — CẢ NHÓM MỘT LƯỢT.
  //
  // Nhận một mảng, lưu trong MỘT giao dịch: nửa chừng lỗi thì không để lại một
  // nhóm ghi được nửa số bé, mà gia đình nửa còn lại thì đọc thấy trống trơn
  // và tưởng con mình bị bỏ quên.
  app.put('/api/nhatky', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = NGAY_RE.test(String((req.body || {}).ngay || '')) ? req.body.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    }
    const ban = (req.body || {}).danhSach;
    if (!Array.isArray(ban) || !ban.length) {
      return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    }

    // Kiểm quyền và kiểm dữ liệu cho TOÀN BỘ danh sách trước khi ghi dòng nào.
    const sach = [];
    for (const x of ban) {
      const be = db.findStudent(x && x.studentId);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi nhật ký cho bé ${be.name}` });
      }
      const s = lamSach(x);
      if (s.loi) return res.status(400).json({ error: `${be.name}: ${s.loi}` });
      // Dấu thời gian bản ghi lúc màn hình NẠP VỀ. `undefined` = app cũ không
      // gửi, khi đó ghi như trước.
      const goc = x && Object.prototype.hasOwnProperty.call(x, 'capNhatLucGoc')
        ? x.capNhatLucGoc : undefined;
      // Ô của nhóm nhà trẻ không nhận cho bé lớn — tránh dữ liệu vô nghĩa lọt
      // vào rồi màn hình gia đình hiện "thay bỉm 3 lần" cho một bé 5 tuổi.
      if (!laNhaTre(be.dob)) { s.bimSoLan = null; s.buBinhSoLan = null; s.buBinhMl = null; }
      sach.push({ be, s, goc });
    }

    // HAI CÔ CÙNG GHI MỘT NHÓM — NGƯỜI LƯU SAU KHÔNG ĐƯỢC XOÁ NGƯỜI LƯU TRƯỚC.
    //
    // Mô hình mầm non là NHIỀU CÔ MỘT NHÓM (G0.4), và cách chia việc tự nhiên
    // nhất cuối giờ là hai cô cùng mở màn rồi chia nhau ("chị điền phần ăn, em
    // điền phần ngủ"). Màn hình gửi lên MỌI ô của MỌI bé đang có trên màn, mà
    // `lamSach` luôn trả về đủ mọi cột — ô cô không gõ thì thành chuỗi rỗng.
    // Nên trước bản vá này, cô bấm Lưu sau ghi đè trọn bản ghi bằng ảnh chụp
    // màn hình CŨ của mình: phần cô kia vừa ghi biến mất, im lặng, và máy chủ
    // vẫn trả về "Đã lưu".
    //
    // `docs/QUYET-DINH-TU-CHOT.md` mục 24 đã gọi đúng tên kiểu mất dữ liệu này
    // — "lấy bản cũ của cô A ghi chồng lên bản mới của cô B... Đây đúng là kiểu
    // mất dữ liệu mà Nguyên tắc số 1 cấm" — nhưng lúc đó chỉ bịt đường NHÁP.
    // Đường thường, màn hình đang mở, thì vẫn hở.
    //
    // CÁCH VÁ: màn hình gửi kèm `capNhatLucGoc` — dấu thời gian của bản ghi lúc
    // nó NẠP VỀ. Bản trên máy chủ đã đổi từ lúc đó thì bỏ qua ĐÚNG BÉ ĐÓ và nói
    // ra, các bé khác vẫn lưu bình thường. Cô đọc được câu "3 bé chưa lưu vì cô
    // khác vừa ghi" rồi mở lại màn là thấy đủ.
    //
    // KHÔNG gửi trường đó thì ghi như cũ: bản app cũ còn trong bộ nhớ điện
    // thoại vẫn phải lưu được, đúng Nguyên tắc số 1.
    const luc = new Date().toISOString();
    const xungDot = [];
    let daGhi = 0;
    db.tx(() => {
      for (const { be, s, goc } of sach) {
        const cu = db.first('nhatky_ngay',
          'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
        if (goc !== undefined && cu && String(cu.capNhatLuc || '') !== String(goc || '')) {
          xungDot.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        const rec = { ...s, studentId: be.id, ngay, nguoiGhi: req.user.id, capNhatLuc: luc };
        if (cu) db.update('nhatky_ngay', cu.id, rec);
        else db.insert('nhatky_ngay', { id: db.nextId('nk'), ...rec });
        daGhi += 1;
      }
    });
    db.audit(req.user.id, 'nhatky-ghi', null, { ngay, soBe: daGhi, xungDot: xungDot.length });
    res.json({
      ok: true,
      ngay,
      daGhi,
      xungDot,
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì cô khác vừa ghi nhật ký cho các bé đó `
          + 'trong lúc màn hình của cô đang mở. Cô mở lại màn này để thấy phần các cô đã ghi, '
          + 'rồi điền tiếp phần của mình nhé — không mất gì cả.',
      } : {}),
    });
  });
};
