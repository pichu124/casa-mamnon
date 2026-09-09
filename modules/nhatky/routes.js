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
// TỪ ĐỢT 2 THEO PHẢN HỒI 07/09: GHI THEO TỪNG BỮA, NGAY LÚC ĂN
//
// Nhà trường: "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày mới làm
// một loạt — tách riêng từng bữa theo thực đơn của nhà trường. Hiện tại đang
// chỉ có bữa trưa." Nên có thêm đường `PUT /api/nhatky/bua`: ghi MỘT bữa cho
// cả nhóm, bữa lấy theo thực đơn NGÀY ĐÓ của bếp cơ sở bé (năm bữa), lưu ở
// bảng phụ `nhatky_bua`. Đường `PUT /api/nhatky` cũ vẫn nguyên — app cũ còn
// trong bộ nhớ điện thoại vẫn dùng — và hai bảng được đồng bộ hai chiều.
//
// QUY TẮC 4 CỦA CLAUDE.md Ở PHÂN HỆ NÀY
//
// Mức ăn ghi theo SUẤT ĂN chứ không theo đứa trẻ: "ăn hết", "khoảng nửa suất",
// "ăn ít". Không quy ra con số nào, không cộng dồn, và không màn hình nào đặt
// các bé cạnh nhau theo mức ăn. Một bé ăn ít ba hôm liền là thông tin cho cô
// và cho gia đình, không phải một chỗ đứng cao thấp so với bạn.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
// Bé nào đang nghỉ có phép hôm nay — xem `lib/nghi-hoc.js` để biết vì sao
// màn này BẮT BUỘC phải hỏi câu đó.
const nghiHoc = require('../../lib/nghi-hoc');
// Báo cho gia đình một bé ngay khi cô ghi xong (Đ137). Không bao giờ ném lỗi.
const tbb = require('../../lib/thong-bao-be');

// Mức ăn hợp lệ. Cố ý là NHÃN CHỮ, không phải số — để là số thì sớm muộn có
// người cộng lại rồi sắp các bé trên dưới nhau.
const MUC_AN = ['het', 'gan-het', 'nua-suat', 'it', 'khong-an'];
const TINH_CHAT = ['binh-thuong', 'hoi-long', 'long', 'tao'];
const TEN_MUC_AN = {
  het: 'Ăn hết', 'gan-het': 'Gần hết', 'nua-suat': 'Khoảng nửa suất', it: 'Ăn ít', 'khong-an': 'Không ăn',
};

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BUA_RE = /^[a-z0-9_-]{1,20}$/;
const TOI_DA_GHI_CHU = 500;
const TOI_DA_SO_LAN = 20;      // trần cho mọi ô đếm — chặn số vô lý gõ nhầm
const TOI_DA_ML = 2000;

function homNay() {
  return ngay.homNay();
}

// Ba bữa của nhật ký ĐỜI CŨ khớp với ba `type` mà màn Thực đơn đang dùng.
// Giữ nguyên: đây là ba cột của `nhatky_ngay`, và là ba bữa mặc định khi hôm
// đó bếp chưa soạn thực đơn.
const BUA = [['anSang', 'breakfast'], ['anTrua', 'lunch'], ['anXe', 'snack']];
const COT_CUA_BUA = { breakfast: 'anSang', lunch: 'anTrua', snack: 'anXe' };

// Năm bữa của thực đơn trường — cùng tên và cùng `type` với `BUA_MAC_DINH` ở
// public/js/views/menu.js, để hai màn của cùng một trường gọi một bữa bằng một
// tên. Chỉ dùng để đặt TÊN khi thực đơn ngày đó thiếu nhãn; bữa nào có trong
// ngày là do thực đơn quyết định, không phải bảng này.
const TEN_BUA = {
  breakfast: 'Bữa sáng',
  snack_sang: 'Bữa phụ sáng',
  lunch: 'Bữa trưa',
  snack: 'Bữa phụ chiều',
  milk: 'Sữa',
};

// Các cột của `nhatky_ngay` mà màn hình được ghi. Đường PUT cũ nhận thêm
// `truong: [...]` để chỉ ghi MỘT NHÓM cột (một bước của màn cô) — tên ngoài
// danh sách này thì từ chối.
const TRUONG_NGAY = ['anSang', 'anTrua', 'anXe', 'anGhiChu', 'nguTuLuc', 'nguDenLuc', 'nguGhiChu',
  'veSinhSoLan', 'veSinhTinhChat', 'bimSoLan', 'buBinhSoLan', 'buBinhMl', 'ghiChu'];

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
// Bé có thuộc lứa nhà trẻ (dưới 36 tháng) VÀO MỘT NGÀY CỤ THỂ không.
//
// `tinhDenNgay` mặc định là hôm nay — đúng cho màn hình đang ghi hôm nay.
// Nhưng đường SỬA nhật ký của một NGÀY CŨ phải hỏi theo đúng ngày đó: bé vừa
// qua mốc 36 tháng tuần này mà cô mở lại nhật ký tháng trước để sửa một chữ,
// hỏi theo hôm nay là số thay bỉm / bú bình đã ghi của ngày cũ bị xoá âm thầm.
function laNhaTre(dob, tinhDenNgay) {
  if (!NGAY_RE.test(String(dob || ''))) return false;
  const sinh = new Date(`${dob}T00:00:00Z`);
  const moc = NGAY_RE.test(String(tinhDenNgay || ''))
    ? new Date(`${tinhDenNgay}T00:00:00Z`)
    : new Date();
  if (Number.isNaN(sinh.getTime()) || Number.isNaN(moc.getTime()) || sinh > moc) return false;
  let thang = (moc.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (moc.getUTCMonth() - sinh.getUTCMonth());
  if (moc.getUTCDate() < sinh.getUTCDate()) thang -= 1;
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

  function keml(be, hang, nghi, ngayXem) {
    return {
      studentId: be.id,
      hoTen: be.name,
      avatar: be.avatar,
      // Tính theo NGÀY ĐANG XEM: PUT đã giữ số thay bỉm của ngày cũ (Đ118g),
      // nhưng màn cô chỉ VẼ ba ô nhà trẻ khi cờ này bật — cờ tính theo hôm
      // nay thì bé vừa qua 36 tháng mở nhật ký tuần trước ra không thấy ô,
      // sửa một chữ ghi chú rồi bấm Lưu là số cũ bay theo đường khác.
      laNhaTre: laNhaTre(be.dob, ngayXem),
      // HÔM NAY BÉ CÓ Ở LỚP KHÔNG.
      //
      // Trước đợt này màn hình không hề biết, nên bé nghỉ có phép nằm lẫn giữa
      // các bạn còn lại và ăn trọn một cú "áp cả nhóm": gia đình đọc được
      // "ăn hết bát cơm, ngủ 11h30–14h" về đúng ngày con nằm nhà. Xem chú
      // thích dài ở `lib/nghi-hoc.js`.
      //
      // `null` = bé đi học bình thường. Màn hình phân biệt được "bé nghỉ" với
      // "cô chưa ghi", hai chuyện khác hẳn nhau.
      nghiPhep: nghi || null,
      ...(hang || {}),
      // `daGhi` để màn hình phân biệt "cô chưa mở tới bé này" với "cô đã ghi
      // và hôm nay bé không ăn gì". Hai chuyện khác hẳn nhau.
      daGhi: !!hang,
    };
  }

  // Ghép TỪNG BỮA của một bé trong một ngày: danh sách bữa của ngày đó (theo
  // thực đơn) × dòng đã ghi ở `nhatky_bua`.
  //
  // Bữa nào chưa có dòng riêng thì nhìn sang cột cũ của `nhatky_ngay` (ba bữa
  // sáng / trưa / xế) — dữ liệu ghi bằng app đời cũ, hay dữ liệu mẫu, vẫn hiện
  // đúng chỗ. Không có gì cả thì `muc` rỗng = "cô chưa ghi".
  function ghepBua(dsBua, hang, theoBua) {
    return dsBua.map(b => {
      const r = theoBua && theoBua.get(b.bua);
      const cot = COT_CUA_BUA[b.bua];
      return {
        ...b,
        muc: r ? r.muc : ((cot && hang && hang[cot]) || ''),
        ghiChu: r ? r.ghiChu : '',
        capNhatLuc: r ? (r.capNhatLuc || '') : '',
        nguoiGhi: r ? r.nguoiGhi : null,
      };
    });
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
      // Cơ sở suy từ NHÓM BÉ ĐANG HỌC, không hỏi người đang xem: mẹ bé có thể
      // có hai con ở hai cơ sở, nên câu hỏi đúng luôn là "bé này ăn bếp nào".
      const campusId = db.campusOfClass(be.classId);
      const banGhi = thucDonKhoang(tu, den, campusId);
      // Từng bữa đã ghi trong khoảng, gom theo ngày.
      const buaTheoNgay = new Map();
      for (const r of db.all('nhatky_bua',
        'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay BETWEEN ? AND ?', [studentId, tu, den])) {
        if (!buaTheoNgay.has(r.ngay)) buaTheoNgay.set(r.ngay, new Map());
        buaTheoNgay.get(r.ngay).set(r.bua, r);
      }
      return res.json({
        // Khoảng nhiều ngày: bé là nhà trẻ ở ĐẦU khoảng thì phần thay bỉm /
        // bú bình của những ngày đó vẫn phải hiện với gia đình.
        be: { id: be.id, hoTen: be.name, laNhaTre: laNhaTre(be.dob, tu) },
        ngayCo: rows.map(r => ({
          ...r,
          nguoiGhiTen: tenNguoiGhi(r.nguoiGhi),
          thucDon: banGhi.has(r.ngay) ? gomBua(banGhi.get(r.ngay)) : null,
          // NĂM BỮA THEO THỰC ĐƠN NGÀY ĐÓ, kèm tên món và mức bé ăn — gia đình
          // đọc "Bữa phụ sáng · Sữa chua nếp cẩm · Ăn hết" thành một dòng.
          buaAn: ghepBua(danhSachBua(banGhi.get(r.ngay) || null), r, buaTheoNgay.get(r.ngay)),
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

    const dangNghi = nghiHoc.nghiCoPhep(dsBe.map(b => b.id), ngay);

    const marks = dsBe.map(() => '?').join(',');
    const daCo = new Map();
    for (const r of db.all('nhatky_ngay',
      `SELECT * FROM nhatky_ngay WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
      daCo.set(r.studentId, r);
    }
    const buaDaCo = new Map();
    for (const r of db.all('nhatky_bua',
      `SELECT * FROM nhatky_bua WHERE ngay = ? AND studentId IN (${marks})`, [ngay, ...dsBe.map(b => b.id)])) {
      if (!buaDaCo.has(r.studentId)) buaDaCo.set(r.studentId, new Map());
      buaDaCo.get(r.studentId).set(r.bua, r);
    }
    const campusId = db.campusOfClass(classId);
    const banGhiTD = banGhiThucDon(ngay, campusId);
    const dsBua = danhSachBua(banGhiTD);
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
      // Vẫn hình dạng đời cũ: phần Thực đơn đang bật mà hôm đó chưa soạn thì ba
      // ô null (không phải lỗi); phần Thực đơn tắt thì cả khối null.
      thucDon: thucDonBat() ? gomBua(banGhiTD) : null,
      // Các bữa của NGÀY ĐÓ theo thực đơn bếp cơ sở — màn cô dựng dải bước từ
      // đây, không tự đoán hôm nay có mấy bữa.
      buaAn: dsBua,
      khungGioNgu: GIO_NGU,
      danhSach: dsBe.map(b => ({
        ...keml(b, daCo.get(b.id), dangNghi.get(b.id), ngay),
        buaAn: ghepBua(dsBua, daCo.get(b.id), buaDaCo.get(b.id)),
      })),
    });
  });

  // NHẬT KÝ NGÀY CÓ DÙNG VỚI NGƯỜI NÀY KHÔNG.
  //
  // Nhà trường 07/09: "Nhật ký ngày sẽ được tự động bỏ đi với các bạn không
  // phải lớp nhà trẻ." Trang chủ hỏi đường này trước khi vẽ ô (module.json
  // khai `dieuKienHien`), nên cô nhóm Lá không thấy một ô mà cô không dùng.
  //
  // Vẫn theo NGÀY SINH từng bé, không theo tên nhóm — lý do ở `laNhaTre`:
  //   • cô: ít nhất một bé nhà trẻ trong (các) nhóm cô phụ trách;
  //   • gia đình: ít nhất một con là nhà trẻ;
  //   • văn phòng: luôn hiện — văn phòng nhìn cả trường, có nhóm nhà trẻ.
  // Chỉ ẨN Ô, không chặn API: đường /api/nhatky vẫn trả lời cho mọi người có
  // quyền, để dữ liệu đã ghi không bao giờ thành "không đọc được".
  app.get('/api/nhatky/pham-vi', (req, res) => {
    if (req.user.role === 'admin') return res.json({ hien: true });
    const ds = db.studentsOf(req.user) || [];
    res.json({ hien: ds.some(b => laNhaTre(b.dob)) });
  });

  // Một bản ghi thực đơn → đúng ba ô ăn của nhật ký (hình dạng đời cũ, màn gia
  // đình đời cũ còn đọc).
  function gomBua(m) {
    const buaAn = (m && Array.isArray(m.meals)) ? m.meals : [];
    const ra = {};
    for (const [o, kieu] of BUA) {
      const b = buaAn.find(x => x && x.type === kieu);
      ra[o] = b ? { ten: b.label || '', gio: b.time || '', mon: b.items || [] } : null;
    }
    return ra;
  }

  // Một bản ghi thực đơn → DANH SÁCH BỮA của ngày đó, theo đúng thứ tự bếp soạn.
  //
  // Không có thực đơn (bếp chưa soạn, hay phần Thực đơn đang tắt) thì về ba
  // bữa mặc định sáng / trưa / xế — đúng ba cột của `nhatky_ngay`, để cô vẫn
  // ghi được và không mất một bữa nào so với trước.
  //
  // Bữa trùng `type` thì giữ bữa đầu: bảng `nhatky_bua` khoá (bé, ngày, bữa)
  // nên hai bữa cùng mã là hai dòng đè nhau.
  function danhSachBua(m) {
    const meals = (m && Array.isArray(m.meals)) ? m.meals : [];
    const ra = [];
    const daCo = new Set();
    for (const x of meals) {
      const kieu = String((x && x.type) || '').trim();
      if (!BUA_RE.test(kieu) || daCo.has(kieu)) continue;
      daCo.add(kieu);
      ra.push({
        bua: kieu,
        ten: String((x && x.label) || '').trim() || TEN_BUA[kieu] || 'Bữa ăn',
        gio: String((x && x.time) || '').trim(),
        mon: Array.isArray(x.items) ? x.items.map(String) : [],
      });
    }
    if (ra.length) return ra;
    return BUA.map(([, kieu]) => ({ bua: kieu, ten: TEN_BUA[kieu], gio: '', mon: [] }));
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

  // THỰC ĐƠN PHẢI LÀ BẾP CỦA CHÍNH CƠ SỞ BÉ ĐANG HỌC.
  //
  // Nhà trường chốt ngày 30/08: ba cơ sở nấu riêng bếp. Đợt Đ91 tách dữ liệu ra
  // bảng phụ `menu_campus`, và luật đọc là: dòng RIÊNG của cơ sở thắng, ngày
  // nào cơ sở chưa soạn riêng thì lấy bản dùng chung ở `menus`.
  //
  // Nhật ký ngày bỏ sót luật đó — nó chỉ đọc `menus`. Hậu quả không hiện ra ở
  // đâu cả: bé ở cơ sở 2 có nhật ký ghi kèm món của một cái bếp khác, mỗi ngày,
  // cho cả nhóm, và gia đình đọc thấy con "ăn hết" một món trường không hề nấu.
  // Đúng chỗ nhà trường muốn khỏi phải gõ tay lại thì lại thành chỗ hai màn
  // hình của cùng một trường nói hai chuyện khác nhau về cùng một bữa ăn.
  //
  // CHÉP LUẬT CHỨ KHÔNG GỌI SANG `routes/menu.js`: phân hệ không được phụ thuộc
  // vào việc tệp lõi ấy còn hay mất. Gỡ Thực đơn đi thì Nhật ký vẫn phải khởi
  // động được — đó là Nguyên tắc số 1.
  //
  // `campusId` rỗng (nhóm chưa gắn cơ sở, hoặc trường một bếp) thì đi đúng
  // đường cũ, không đổi một chữ nào so với trước.
  function banGhiThucDon(ngay, campusId) {
    if (!thucDonBat()) return null;
    const rieng = campusId
      ? db.first('menu_campus',
        'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, ngay])
      : null;
    return rieng || db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngay]) || null;
  }

  // Cả khoảng ngày trong MỘT câu truy vấn — gia đình xem hai tuần một lần mở.
  //
  // Hai câu, không phải một: nạp bản dùng chung trước rồi để bản riêng của bếp
  // GHI ĐÈ lên đúng những ngày cơ sở đã soạn. Ngược thứ tự này là cơ sở đã soạn
  // riêng lại thấy món dùng chung.
  //
  // Trả về BẢN GHI thực đơn theo ngày; người gọi tự chọn `gomBua` (ba ô đời
  // cũ) hay `danhSachBua` (năm bữa).
  function thucDonKhoang(tu, den, campusId) {
    const ra = new Map();
    if (!thucDonBat()) return ra;
    for (const m of db.all('menus',
      'SELECT * FROM menus WHERE date BETWEEN ? AND ?', [tu, den])) {
      ra.set(m.date, m);
    }
    if (campusId) {
      for (const m of db.all('menu_campus',
        'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ?',
        [campusId, tu, den])) {
        ra.set(m.date, m);
      }
    }
    return ra;
  }

  function tenNguoiGhi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // Ghi một bữa vào `nhatky_bua` cho một bé. Trả về true nếu có gì THẬT SỰ đổi
  // — người gọi dùng để biết có đáng báo gia đình không.
  function ghiBua(be, ngay, bua, muc, ghiChu, nguoiGhi, luc) {
    const cu = db.first('nhatky_bua',
      'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay = ? AND bua = ?', [be.id, ngay, bua]);
    if (cu) {
      if (cu.muc === muc && cu.ghiChu === ghiChu) return false;
      db.update('nhatky_bua', cu.id, { muc, ghiChu, nguoiGhi, capNhatLuc: luc });
      return true;
    }
    if (!muc && !ghiChu) return false;   // chưa ghi gì thì không sinh dòng trống
    db.insert('nhatky_bua', {
      id: db.nextId('nkb'), studentId: be.id, ngay, bua, muc, ghiChu, nguoiGhi, capNhatLuc: luc,
    });
    return true;
  }

  // ĐỒNG BỘ NGƯỢC một bữa vào cột cũ của `nhatky_ngay`.
  //
  // Màn gia đình đời cũ đọc ba cột anSang/anTrua/anXe; app đời cũ của cô cũng
  // ghi vào đó. Không đồng bộ thì cùng một bữa trưa có hai câu trả lời tuỳ
  // màn — đúng thứ Nguyên tắc số 1 cấm. Bữa không có cột cũ (phụ sáng, sữa)
  // thì chỉ bảo đảm ngày đó CÓ DÒNG, để màn gia đình đời cũ vẫn thấy ngày đó
  // trong danh sách và trang chủ vẫn đếm "đã ghi nhật ký".
  function dongBoCotCu(be, ngay, bua, muc, nguoiGhi, luc) {
    const cot = COT_CUA_BUA[bua];
    const cu = db.first('nhatky_ngay',
      'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
    const rec = { nguoiGhi, capNhatLuc: luc };
    if (cot) rec[cot] = muc;
    if (cu) {
      if (!cot || cu[cot] === muc) return;   // không có gì mới thì đừng đổi dấu thời gian
      db.update('nhatky_ngay', cu.id, rec);
      return;
    }
    db.insert('nhatky_ngay', { id: db.nextId('nk'), studentId: be.id, ngay, ...rec });
  }

  // Tiêu đề tin báo cho gia đình theo bước cô vừa ghi.
  function tieuDeBuoc(truong, tenBe) {
    const ds = Array.isArray(truong) ? truong : [];
    const chi = (nhom) => ds.length && ds.every(k => nhom.includes(k));
    if (chi(['nguTuLuc', 'nguDenLuc', 'nguGhiChu'])) return `Giấc trưa của ${tenBe} đã được cô ghi`;
    if (chi(['veSinhSoLan', 'veSinhTinhChat', 'bimSoLan', 'buBinhSoLan', 'buBinhMl'])) {
      return `Vệ sinh, bỉm, sữa của ${tenBe} đã được cô ghi`;
    }
    if (chi(['ghiChu', 'anGhiChu'])) return `Cô có lời nhắn về ${tenBe} hôm nay`;
    return `Nhật ký ngày của ${tenBe} đã được cô ghi`;
  }

  // Cô ghi nhật ký — CẢ NHÓM MỘT LƯỢT.
  //
  // Nhận một mảng, lưu trong MỘT giao dịch: nửa chừng lỗi thì không để lại một
  // nhóm ghi được nửa số bé, mà gia đình nửa còn lại thì đọc thấy trống trơn
  // và tưởng con mình bị bỏ quên.
  //
  // `truong: [...]` (tuỳ chọn, từ đợt 2): chỉ ghi các cột được kể tên — một
  // BƯỚC của màn cô (ngủ trưa, vệ sinh · bỉm, ghi chú). Không gửi thì ghi đủ
  // mọi cột như trước, để app đời cũ còn trong bộ nhớ điện thoại vẫn lưu được.
  app.put('/api/nhatky', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = NGAY_RE.test(String((req.body || {}).ngay || '')) ? req.body.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    }
    const ban = (req.body || {}).danhSach;
    if (!Array.isArray(ban) || !ban.length) {
      return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    }
    let truong = null;
    if ((req.body || {}).truong !== undefined) {
      truong = Array.isArray(req.body.truong) ? req.body.truong.map(String) : [];
      if (!truong.length || truong.some(k => !TRUONG_NGAY.includes(k))) {
        return res.status(400).json({ error: 'Bước cần ghi chưa hợp lệ' });
      }
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
      // Tính tuổi theo NGÀY CỦA BẢN GHI, không theo hôm nay: sửa nhật ký ngày
      // cũ sau khi bé qua mốc 36 tháng không được xoá số đã ghi của ngày đó.
      if (!laNhaTre(be.dob, ngay)) { s.bimSoLan = null; s.buBinhSoLan = null; s.buBinhMl = null; }
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
    const dangNghiKhiGhi = nghiHoc.nghiCoPhep(sach.map(x => x.be.id), ngay);
    const luc = new Date().toISOString();
    const xungDot = [];
    const daDoi = [];     // bé có gì THẬT SỰ mới — chỉ các bé này được báo gia đình
    let daGhi = 0;
    db.tx(() => {
      for (const { be, s, goc } of sach) {
        const cu = db.first('nhatky_ngay',
          'SELECT * FROM nhatky_ngay WHERE studentId = ? AND ngay = ?', [be.id, ngay]);
        if (goc !== undefined && cu && String(cu.capNhatLuc || '') !== String(goc || '')) {
          xungDot.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        // Chỉ một bước: lấy đúng các cột của bước đó, phần còn lại giữ nguyên.
        const phan = truong ? Object.fromEntries(truong.map(k => [k, s[k]])) : s;
        // So theo CHỮ: null của cột số và '' của cột chữ đều là "chưa ghi".
        const chuan = (v) => (v === null || v === undefined ? '' : String(v));
        const coMoi = !cu || Object.keys(phan).some(k => chuan(cu[k]) !== chuan(phan[k]));
        const rec = { ...phan, studentId: be.id, ngay, nguoiGhi: req.user.id, capNhatLuc: luc };
        if (cu) db.update('nhatky_ngay', cu.id, rec);
        else db.insert('nhatky_ngay', { id: db.nextId('nk'), ...rec });
        // Đồng bộ XUÔI sang bảng từng bữa: ba cột sáng / trưa / xế vừa ghi là ba
        // bữa breakfast / lunch / snack — màn cô đời mới đọc từ đó.
        for (const [cot, kieu] of BUA) {
          if (Object.prototype.hasOwnProperty.call(phan, cot)) {
            ghiBua(be, ngay, kieu, phan[cot] || '', '', req.user.id, luc);
          }
        }
        if (coMoi) daDoi.push(be);
        daGhi += 1;
      }
    });
    // GHI CHO BÉ ĐANG NGHỈ CÓ PHÉP: NÓI RA, KHÔNG CHẶN.
    //
    // Chặn là sai: bé có thể vẫn tới lớp dù nhà đã xin nghỉ, và cô có thể đang
    // sửa lại một dòng ghi nhầm. Đây cùng một lý lẽ với khung giờ ngủ — khung
    // là để bấm nhanh, không phải hàng rào.
    //
    // Nhưng im lặng cũng sai, và sai nặng hơn: cú "áp cả nhóm" điền cho MỌI ô
    // đang hiện, nên bé nghỉ ăn trọn cú đó mà không ai để ý. Nói ra là đủ để cô
    // nhìn lại một giây.
    const nhacNghi = [];
    for (const { be } of sach) {
      const n = dangNghiKhiGhi.get(be.id);
      if (n) nhacNghi.push({ studentId: be.id, hoTen: be.name, lyDo: n.reason });
    }

    // BÁO GIA ĐÌNH — MỘT LẦN LƯU, TỐI ĐA MỘT TIN MỖI BÉ, và chỉ bé có gì mới.
    // Cô bấm Lưu lại để sửa một bé thì mười chín gia đình còn lại không nhận
    // thêm một tin y hệt.
    for (const be of daDoi) {
      tbb.gui({
        studentId: be.id,
        loai: 'nhatky',
        tieuDe: tieuDeBuoc(truong, be.name),
        noiDung: 'Mở Nhật ký ngày để xem cô ghi gì hôm nay.',
        hash: '#/nhatky',
        nguoiTao: req.user.id,
      });
    }

    db.audit(req.user.id, 'nhatky-ghi', null, {
      ngay, soBe: daGhi, xungDot: xungDot.length, nghiPhep: nhacNghi.length,
      ...(truong ? { truong } : {}),
    });
    res.json({
      ok: true,
      ngay,
      daGhi,
      daBao: daDoi.length,
      xungDot,
      nhacNghi,
      ...(nhacNghi.length ? {
        nhacNghiChu: `${nhacNghi.length} bé đã có đơn nghỉ được duyệt cho hôm nay `
          + `(${nhacNghi.map(x => x.hoTen).join(', ')}). Cô xem lại giúp — `
          + 'gia đình sẽ đọc đúng dòng này về ngày con ở nhà.',
      } : {}),
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì cô khác vừa ghi nhật ký cho các bé đó `
          + 'trong lúc màn hình của cô đang mở. Cô mở lại màn này để thấy phần các cô đã ghi, '
          + 'rồi điền tiếp phần của mình nhé — không mất gì cả.',
      } : {}),
    });
  });

  // CÔ GHI MỘT BỮA CHO CẢ NHÓM — ngay sau bữa đó, không đợi cuối ngày.
  //
  // Thân: { classId, ngay, bua, danhSach: [{ studentId, muc, ghiChu, capNhatLucGoc? }] }
  //
  // Cùng luật với PUT /api/nhatky: kiểm hết rồi mới ghi, một giao dịch, hai cô
  // cùng ghi thì người sau không xoá người trước (so `capNhatLucGoc` với dấu
  // thời gian của ĐÚNG DÒNG BỮA ĐÓ), bé nghỉ có phép thì nhắc chứ không chặn.
  //
  // `bua` phải là một bữa CÓ TRONG thực đơn ngày đó của bếp cơ sở nhóm (không
  // có thực đơn thì ba bữa mặc định). Ghi một bữa bếp không nấu là ghi vào
  // một thứ không tồn tại, và gia đình đọc thấy con "ăn hết" một bữa không có.
  app.put('/api/nhatky/bua', requireRole('teacher', 'admin'), (req, res) => {
    const body = req.body || {};
    const ngay = NGAY_RE.test(String(body.ngay || '')) ? body.ngay : homNay();
    if (ngay > homNay()) {
      return res.status(400).json({ error: 'Chưa ghi nhật ký cho ngày chưa tới được' });
    }
    const classId = String(body.classId || '');
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (req.user.role === 'parent' || !db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền ghi nhật ký cho nhóm này' });
    }
    const bua = String(body.bua || '').trim();
    const dsBua = danhSachBua(banGhiThucDon(ngay, db.campusOfClass(classId)));
    const buaChon = dsBua.find(b => b.bua === bua);
    if (!buaChon) {
      return res.status(400).json({ error: 'Bữa này không có trong thực đơn của ngày đó' });
    }
    const ban = body.danhSach;
    if (!Array.isArray(ban) || !ban.length) {
      return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    }

    const sach = [];
    for (const x of ban) {
      const be = db.findStudent(x && x.studentId);
      if (!be) return res.status(404).json({ error: 'Danh sách có bé không tồn tại' });
      if (be.classId !== classId || !db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi nhật ký cho bé ${be.name}` });
      }
      const muc = String((x && x.muc) || '').trim();
      if (muc && !MUC_AN.includes(muc)) {
        return res.status(400).json({ error: `${be.name}: mức ăn "${muc}" không hợp lệ` });
      }
      const ghiChu = String((x && x.ghiChu) || '').trim().slice(0, TOI_DA_GHI_CHU);
      const goc = x && Object.prototype.hasOwnProperty.call(x, 'capNhatLucGoc')
        ? x.capNhatLucGoc : undefined;
      sach.push({ be, muc, ghiChu, goc });
    }

    const dangNghiKhiGhi = nghiHoc.nghiCoPhep(sach.map(x => x.be.id), ngay);
    const luc = new Date().toISOString();
    const xungDot = [];
    const daDoi = [];
    let daGhi = 0;
    db.tx(() => {
      for (const { be, muc, ghiChu, goc } of sach) {
        const cu = db.first('nhatky_bua',
          'SELECT * FROM nhatky_bua WHERE studentId = ? AND ngay = ? AND bua = ?', [be.id, ngay, bua]);
        if (goc !== undefined && cu && String(cu.capNhatLuc || '') !== String(goc || '')) {
          xungDot.push({ studentId: be.id, hoTen: be.name });
          continue;
        }
        if (ghiBua(be, ngay, bua, muc, ghiChu, req.user.id, luc)) {
          dongBoCotCu(be, ngay, bua, muc, req.user.id, luc);
          daDoi.push(be);
        }
        daGhi += 1;
      }
    });

    const nhacNghi = [];
    for (const { be } of sach) {
      const n = dangNghiKhiGhi.get(be.id);
      if (n) nhacNghi.push({ studentId: be.id, hoTen: be.name, lyDo: n.reason });
    }

    // Báo gia đình từng bé vừa ghi: "Bữa trưa của An đã được cô ghi". Một lần
    // lưu = tối đa một tin mỗi bé; bé không có gì mới thì không có tin.
    for (const be of daDoi) {
      const x = sach.find(y => y.be.id === be.id) || {};
      const dong = [TEN_MUC_AN[x.muc] || '', x.ghiChu || ''].filter(Boolean).join(' · ');
      tbb.gui({
        studentId: be.id,
        loai: 'nhatky',
        tieuDe: `${buaChon.ten} của ${be.name} đã được cô ghi`,
        noiDung: dong || 'Mở Nhật ký ngày để xem chi tiết.',
        hash: '#/nhatky',
        nguoiTao: req.user.id,
      });
    }

    db.audit(req.user.id, 'nhatky-ghi-bua', null, {
      ngay, bua, soBe: daGhi, xungDot: xungDot.length, nghiPhep: nhacNghi.length,
    });
    res.json({
      ok: true,
      ngay,
      bua,
      daGhi,
      daBao: daDoi.length,
      xungDot,
      nhacNghi,
      ...(nhacNghi.length ? {
        nhacNghiChu: `${nhacNghi.length} bé đã có đơn nghỉ được duyệt cho hôm nay `
          + `(${nhacNghi.map(x => x.hoTen).join(', ')}). Cô xem lại giúp — `
          + 'gia đình sẽ đọc đúng dòng này về ngày con ở nhà.',
      } : {}),
      ...(xungDot.length ? {
        nhac: `${xungDot.length} bé chưa lưu được vì cô khác vừa ghi bữa này cho các bé đó `
          + 'trong lúc màn hình của cô đang mở. Cô mở lại màn này để thấy phần các cô đã ghi, '
          + 'rồi điền tiếp phần của mình nhé — không mất gì cả.',
      } : {}),
    });
  });
};
