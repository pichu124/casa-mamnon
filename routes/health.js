// Phân hệ Y tế học đường: hồ sơ sức khỏe của học sinh, giáo viên thêm ghi nhận mới.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');
const tbb = require('../lib/thong-bao-be');
const csv = require('../lib/csv');

// Ô CSV bắt đầu bằng = + - @ là CÔNG THỨC khi mở bằng Excel, không phải chữ.
// Cùng bản vá đã dùng ở danh sách bé và ở bảng tiền ăn.
const DAU_CONG_THUC_YT = /^[=+\-@\t\r]/;
function khoaCongThucYTe(hang) {
  const ra = {};
  for (const [k, v] of Object.entries(hang)) {
    const t = v == null ? '' : String(v);
    ra[k] = DAU_CONG_THUC_YT.test(t) ? `'${t}` : t;
  }
  return ra;
}

// HAI DANH SÁCH, KHÔNG PHẢI MỘT — nhà trường chốt 10/09/2026 (A6): "Trường
// không cần dùng tới tiêm chủng -> bỏ đi".
//
// Bỏ một tính năng là NGƯNG DÙNG NÓ, không phải xoá dữ liệu của nó
// (CLAUDE.md, "Bỏ một tính năng"). Nên:
//
//   • TYPES_DOC — mọi loại ĐỌC ĐƯỢC và SỬA ĐƯỢC. Vẫn có 'vaccination' để bản
//     ghi tiêm chủng cũ còn nguyên nhãn, còn màu, còn sửa được tiêu đề và ngày.
//     Bỏ nó khỏi đây là hồ sơ cũ của bé hiện ra mã máy trên màn phụ huynh.
//   • TYPES_GHI — loại được TẠO MỚI. Không còn 'vaccination'.
//
// `TYPES` giữ nguyên tên và nguyên nội dung cho mọi chỗ đang đọc — chỉ THÊM
// hai hằng bên cạnh, không đổi thứ đang có.
const TYPES = ['checkup', 'vaccination', 'incident'];
const TYPES_DOC = TYPES;
const TYPES_GHI = ['checkup', 'incident'];
const BANG = 'health';
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Bảng `health` không lưu ai là người ghi, nên không nhận ra "chủ bản ghi" được.
// Thay vào đó: quản trị, hoặc giáo viên đang có quyền với chính em đó — tức là
// cô chủ nhiệm hiện tại. Cô đã chuyển lớp thì không sửa được hồ sơ lớp cũ nữa,
// đúng như phần còn lại của app.
function coTheSuaYTe(user, studentId) {
  if (!user || !db.canAccessStudent(user, studentId)) return false;
  return user.role === 'admin' || user.role === 'teacher';
}

// CÔ CHỈ SỬA ĐƯỢC GHI NHẬN TRONG CHÍNH NGÀY GÕ VÀO MÁY (Đ205, việc 10).
//
// Nhà trường xin siết quyền sửa. Hai chỗ phải cẩn thận, cả hai đã nằm sẵn
// thành chú thích trong tệp này từ trước — và cả hai đều là lý do KHÔNG khoá
// theo `date`:
//
//   • `date` là NGÀY KHÁM, không phải ngày cô gõ. App cố ý cho nhập BÙ kết
//     quả khám của trạm y tế làm cách đó vài tuần. Khoá theo ngày khám là bản
//     ghi vừa gõ xong đã không sửa được, gõ nhầm một chữ số cũng phải đi nhờ.
//   • Đường THU HỒI sinh ra chính là để hiệu trưởng gỡ một ghi nhận bấm nhầm
//     sang bé khác — thứ chỉ lộ ra sau vài ngày. Nên nó KHÔNG bị khoá theo
//     ngày, chỉ bị siết theo VAI.
//
// Vậy: khoá theo ngày GÕ, và chỉ khoá với vai `teacher`. Văn phòng và ban
// giám hiệu sửa được như cũ — đó đúng là đường thoát mà câu từ chối chỉ tới.
function ngayGhiCua(h) {
  try {
    const r = db.first('health_ghi_luc',
      'SELECT luc, ngayGhi FROM health_ghi_luc WHERE healthId = ?', [h.id]);
    if (r && r.ngayGhi) return r.ngayGhi;
    // Dòng ghi trước khi có cột `ngayGhi`: đổi dấu thời gian sang NGÀY THEO
    // GIỜ VIỆT NAM. Cắt mười ký tự đầu của chuỗi ISO là sai bảy tiếng mỗi
    // ngày — xem chú thích ở `lib/schema.sql`.
    if (r && r.luc) return ngay.ngayCua(Date.parse(r.luc));
  } catch (_) { /* bảng chưa có thì lùi về ngày khám */ }
  return String(h.date || '').slice(0, 10);
}

// Trả về câu từ chối, hoặc null nếu được sửa.
function loiQuaNgay(user, h) {
  if (!user || user.role !== 'teacher') return null;
  const ngayGhi = ngayGhiCua(h);
  if (ngayGhi === ngay.homNay()) return null;
  return 'Ghi nhận này cô ghi hôm ' + ngayGhi + ', nên hôm nay cô không sửa được nữa. '
    + 'Cần sửa thì nhắn văn phòng nhà trường giúp cô nhé — sổ sức khoẻ của bé là chỗ '
    + 'nhà trường phải trả lời được "ai ghi, ghi hôm nào".';
}

// Ghi lại NGÀY GÕ cho một bản ghi vừa tạo. Việc phụ: hỏng thì bản ghi vẫn vào,
// chỉ là nó lùi về khoá theo ngày khám.
function ghiLuc(id, userId) {
  try {
    db.insert('health_ghi_luc', {
      healthId: id,
      luc: new Date().toISOString(),
      ngayGhi: ngay.homNay(),          // NGÀY THEO GIỜ VIỆT NAM
      nguoiGhi: userId,
    });
  } catch (_) { /* không chặn đường ghi vì một dòng phụ */ }
}

function todayStr() {
  return ngay.homNay();
}

// Chữ do y tế trường gõ. Cắt độ dài, không tự đổi nội dung.
//
// QUY TẮC 4 VÀ Ô "ĐÁNH GIÁ THỂ TRẠNG"
//
// Đây là NHẬN ĐỊNH CỦA NGƯỜI KHÁM, không phải con số app tính ra. App tuyệt đối
// không được tự suy nó từ chiều cao và cân nặng rồi ghi vào — làm thế là app tự
// đem một đứa trẻ ra đặt cạnh một cái chuẩn theo tuổi, đúng thứ QUY TẮC 4 cấm,
// và cũng
// là AI-thay-người ở dạng thô sơ nhất (QUY TẮC 3). Bài test canh đúng điều đó:
// gửi chiều cao + cân nặng mà KHÔNG gửi ô này thì ô này phải ở nguyên trống.
const TOI_DA_O_Y_TE = 200;
function chuoiYTe(v) {
  return String(v == null ? '' : v).trim().slice(0, TOI_DA_O_Y_TE);
}

module.exports = (app) => {
  // Hồ sơ y tế của một học sinh: danh sách ghi nhận (mới nhất trước)
  // + lần khám định kỳ gần nhất để hiển thị chỉ số.
  app.get('/api/health', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem hồ sơ y tế của bé này' });
    }
    // Cùng ngày thì bản ghi thêm sau lên trước (rowid tăng dần theo thứ tự thêm).
    // Hỏi quyền sửa MỘT lần — cùng một bé cho mọi bản ghi. Bản cũ gọi
    // `coTheSuaYTe` (bên trong lại hỏi canAccessStudent) cho TỪNG dòng: mở hồ
    // sơ nhiều năm của một bé là chừng ấy truy vấn quyền thừa, cùng một câu.
    const suaDuoc = coTheSuaYTe(req.user, studentId);
    const records = st.ganDauDaSua(BANG, db.all('health',
      `SELECT * FROM health WHERE studentId = ? AND ${st.dieuKienConHien(BANG, 'id')}
       ORDER BY date DESC, rowid DESC`, [studentId]))
      .map(r => ({ ...r, coTheSua: suaDuoc }));
    const latestCheckup = records.find(r => r.type === 'checkup') || null;
    // LỊCH SỬ CÂN ĐO (Đ138). Nhà trường 07/09: "Sức khoẻ: bổ sung thêm có thể
    // xem lại các thời gian cân đo khác". Chỉ những lần có số, mới nhất trước.
    // KHÔNG kèm chênh lệch, không kèm "so với tháng trước tăng x" — con số của
    // từng lần là đủ, gia đình tự đọc (QUY TẮC 4: app không phán về bé).
    const lichSuCanDo = records
      .filter(r => r.type === 'checkup' && (Number.isFinite(r.height) || Number.isFinite(r.weight)))
      .map(r => ({ id: r.id, date: r.date, height: r.height ?? null, weight: r.weight ?? null, title: r.title }));
    res.json({ records, latestCheckup, lichSuCanDo });
  });

  // BẢNG CÂN ĐO CẢ NHÓM THEO THÁNG (Đ138).
  //
  // Nhà trường 07/09: "Giao diện hơi khó nhìn. Nên để theo cấu trúc cơ sở →
  // lớp, xong hiện một loạt danh sách bé của lớp thể hiện được cân nặng, chiều
  // cao cả lớp, có ô tháng để chọn xem lại; bấm vào từng bạn xem chi tiết."
  //
  // Mỗi bé hai cột: LẦN ĐO TRONG THÁNG ĐANG XEM (không có thì nói "chưa đo
  // tháng này" — chữ về việc của người lớn) và lần đo GẦN NHẤT bất kể tháng.
  // Không cột nào so bé với bé, không trung bình nhóm, không xếp theo số đo
  // — xếp theo tên (QUY TẮC 4).
  app.get('/api/health/nhom', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.query.classId || '').trim();
    if (!classId) return res.status(400).json({ error: 'Thiếu mã nhóm' });
    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
    }
    const thang = /^\d{4}-\d{2}$/.test(String(req.query.thang || '')) ? String(req.query.thang) : ngay.thangNay();
    const dsBe = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    if (!dsBe.length) return res.json({ classId, className: cls.name, thang, danhSach: [] });

    const marks = dsBe.map(() => '?').join(',');
    // Mọi lần cân đo còn hiện (chưa thu hồi) của cả nhóm, một câu truy vấn.
    const rows = db.all('health',
      `SELECT id, studentId, date, height, weight FROM health
        WHERE type = 'checkup' AND studentId IN (${marks})
          AND (height IS NOT NULL OR weight IS NOT NULL)
          AND ${st.dieuKienConHien(BANG, 'id')}
        ORDER BY date DESC, rowid DESC`, dsBe.map(b => b.id));
    const trongThang = new Map();
    const ganNhat = new Map();
    for (const r of rows) {
      if (!ganNhat.has(r.studentId)) ganNhat.set(r.studentId, r);
      if (r.date.slice(0, 7) === thang && !trongThang.has(r.studentId)) trongThang.set(r.studentId, r);
    }
    const gon = r => r ? { id: r.id, date: r.date, height: r.height ?? null, weight: r.weight ?? null } : null;
    res.json({
      classId, className: cls.name, thang,
      danhSach: dsBe.map(b => ({
        studentId: b.id, hoTen: b.name, avatar: b.avatar, dob: b.dob,
        doTrongThang: gon(trongThang.get(b.id)),
        doGanNhat: gon(ganNhat.get(b.id)),
      })),
    });
  });

  // NHẬP CÂN ĐO CẢ NHÓM MỘT LƯỢT (Đ138).
  //
  // "Cân đo hàng tháng do GV thực hiện trước mùng 5 hàng tháng. Để tiện thì
  // sổ hết một loạt danh sách bé, GV điền chiều cao, cân nặng là xong."
  //
  // Kiểm TOÀN BỘ trước khi ghi dòng nào: một bé gõ nhầm 170 cm thì cả lượt
  // dừng và nói rõ bé nào, không để nửa nhóm đã ghi nửa chưa. Cùng ngày cùng
  // bé đã có dòng cân đo tháng thì SỬA dòng đó, không tạo dòng thứ hai.
  app.post('/api/health/can-do-nhom', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = String(b.classId || '').trim();
    const cls = classId ? db.findClass(classId) : null;
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
    }
    const date = NGAY_RE.test(String(b.date || '')) ? String(b.date) : todayStr();
    if (date > todayStr()) return res.status(400).json({ error: 'Chưa ghi cân đo cho ngày chưa tới được' });
    const ds = Array.isArray(b.danhSach) ? b.danhSach : [];
    if (!ds.length) return res.status(400).json({ error: 'Chưa có bé nào để ghi' });
    const ra = ghiCanDoNhom(req, classId, date, ds);
    if (ra.loi) return res.status(ra.ma || 400).json({ error: ra.loi });
    db.audit(req.user.id, 'health-can-do-nhom', classId, { date, ...ra.dem });
    return res.json({ ok: true, date, ...ra.dem });
  });

  // THÂN CHUNG CỦA HAI ĐƯỜNG GHI CÂN ĐO: màn hình và tệp.
  //
  // Tách ra thành hàm chứ không chép sang đường nạp tệp. Hai bản của cùng một
  // luật là hai bản sẽ trôi khỏi nhau — và chỗ trôi ở đây là luật "đã có thì
  // sửa, chưa có thì thêm", thứ quyết định một bé có hai dòng cân đo cùng
  // tháng hay một dòng.
  //
  // Trả về { loi, ma } hoặc { dem: { daThem, daSua, soBe } }.
  function ghiCanDoNhom(req, classId, date, ds) {
    const tieuDe = `Cân đo tháng ${date.slice(5, 7)}/${date.slice(0, 4)}`;
    const sach = [];
    for (const x of ds) {
      const be = db.findStudent(x && x.studentId);
      if (!be || be.classId !== classId) return { loi: 'Danh sách có bé không thuộc nhóm này' };
      if (!db.canAccessStudent(req.user, be.id)) {
        return { loi: `Không có quyền ghi cho bé ${be.name}`, ma: 403 };
      }
      const h = x.height === '' || x.height === undefined || x.height === null ? null : Number(x.height);
      const w = x.weight === '' || x.weight === undefined || x.weight === null ? null : Number(x.weight);
      if (h === null && w === null) continue;   // dòng bỏ trống: bỏ qua, không tạo dòng rỗng
      for (const [cot, v] of [['height', h], ['weight', w]]) {
        const loi = loiCanDo(cot, v);
        if (loi) return { loi: `${be.name}: ${loi}` };
      }
      sach.push({ be, h: Number.isFinite(h) && h > 0 ? h : null, w: Number.isFinite(w) && w > 0 ? w : null });
    }
    if (!sach.length) return { loi: 'Chưa có số đo nào để ghi — cô điền ít nhất một bé nhé' };

    let daThem = 0, daSua = 0;
    db.tx(() => {
      for (const x of sach) {
        const { be, h, w } = x;
        const cu = db.first('health',
          `SELECT * FROM health WHERE studentId = ? AND date = ? AND type = 'checkup' AND title = ?
             AND ${st.dieuKienConHien(BANG, 'id')} ORDER BY rowid DESC`, [be.id, date, tieuDe]);
        if (cu) {
          db.update('health', cu.id, { height: h, weight: w });
          x.healthId = cu.id;
          daSua += 1;
        } else {
          const idMoi = db.nextId('ht');
          db.insert('health', { id: idMoi, studentId: be.id, date, type: 'checkup', title: tieuDe, detail: '', height: h, weight: w });
          ghiLuc(idMoi, req.user.id);
          x.healthId = idMoi;
          daThem += 1;
        }
      }
    });
    // Báo gia đình từng bé (Đ137) — một tin mỗi bé mỗi lượt lưu.
    //
    // Chữ của tin chung chung, không chép số đo nào, nhưng nó nói "số đo đã có
    // trong Sức khoẻ của bé". Thu hồi dòng ấy (nạp tệp lệch dòng là ghi số của
    // bé này sang bé kia) mà tin còn đó thì nó chỉ tới một thứ không còn, và
    // số chưa đọc vẫn đếm nó — nên tin cũng mang `nguon` (Đ239q). Mỗi lượt lưu
    // ghi hoặc sửa ĐÚNG MỘT dòng cho mỗi bé, nên mỗi tin có đúng một nguồn; hai
    // lượt lưu cùng ngày là hai tin trỏ về cùng một dòng, và bảng nguồn cho
    // phép thế. Ngày nào một tin phải phủ nhiều dòng thì bảng một-nguồn-một-tin
    // không còn vừa: tách tin theo dòng, đừng chọn bừa một dòng làm nguồn.
    for (const { be, healthId } of sach) {
      tbb.gui({ studentId: be.id, loai: 'suc-khoe', nguoiTao: req.user.id,
        tieuDe: `Cô vừa ghi cân đo của ${be.name}`,
        noiDung: `Số đo ngày ${date.slice(8, 10)}/${date.slice(5, 7)} đã có trong Sức khoẻ của bé.`,
        hash: '#/health',
        nguon: { bang: BANG, recordId: healthId } });
    }
    return { dem: { daThem, daSua, soBe: sach.length } };
  }

  // CHẶN SỐ GÕ NHẦM — NHƯNG CHỈ SỐ GÕ NHẦM.
  //
  // Bản cũ chỉ kiểm `> 0`, không có trần trên. Gõ nhầm 170 cm cho một bé 3 tuổi
  // (thừa một số 0, hay gõ chiều cao của mẹ) được nhận và lưu im lặng, rồi nằm
  // trong hồ sơ sức khoẻ của bé đó mãi.
  //
  // Khoảng dưới đây CỐ Ý RỘNG HẾT MỨC. Nó chỉ bắt thứ chắc chắn là gõ nhầm,
  // không phán gì về đứa trẻ — QUY TẮC 4 cấm app đem bé đặt cạnh một cái chuẩn
// theo tuổi,
  // và một trần hẹp theo tuổi chính là làm đúng thứ bị cấm. 40–160 cm và 2–60 kg
  // phủ trọn mọi bé 12 tháng – 6 tuổi có thật, kể cả bé nhẹ cân hay cao lớn
  // khác thường.
  //
  // Câu từ chối cũng nói về CHỮ SỐ, không nói về bé.
  const KHOANG = {
    height: { min: 40, max: 160, ten: 'Chiều cao', donVi: 'cm' },
    weight: { min: 2, max: 60, ten: 'Cân nặng', donVi: 'kg' },
  };

  function loiCanDo(cot, giaTri) {
    if (giaTri === undefined || giaTri === null || giaTri === '') return null;
    const n = Number(giaTri);
    const k = KHOANG[cot];
    if (!Number.isFinite(n)) return `${k.ten} phải là một con số.`;
    if (n <= 0) return null;                    // 0 hoặc âm: giữ nếp cũ, bỏ qua
    if (n < k.min || n > k.max) {
      return `${k.ten} ${n} ${k.donVi} nằm ngoài khoảng nhập được (${k.min}–${k.max} ${k.donVi}). `
        + 'Thường là gõ nhầm một chữ số — cô kiểm lại giúp nhé.';
    }
    return null;
  }

  // Giáo viên thêm ghi nhận y tế cho học sinh lớp mình.
  app.post('/api/health', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, type, title, detail, height, weight } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền thêm ghi nhận cho bé này' });
    }
    // Ghi MỚI thì theo TYPES_GHI. Câu từ chối nói bằng tiếng của trường chứ
    // không phải "không hợp lệ": điện thoại đã cài app còn giữ bản giao diện cũ
    // trong bộ nhớ đệm, và bản cũ vẫn gửi được 'vaccination' — cô cần đọc hiểu
    // ngay phải bấm gì thay thế.
    if (!TYPES_GHI.includes(type)) {
      return res.status(400).json({
        error: TYPES_DOC.includes(type)
          ? 'Trường mình không ghi tiêm chủng nữa. Cô chọn Khám / cân đo hoặc Sự cố giúp nhé.'
          : 'Loại ghi nhận không hợp lệ',
      });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề ghi nhận' });
    }
    // Nhận ngày do người nhập chọn, mặc định hôm nay. Ép cứng hôm nay thì không
    // nhập lùi được kết quả khám định kỳ hay đợt tiêm chủng của trạm y tế làm
    // cách đó vài tuần — đúng việc mà nhà trường phải làm mỗi năm.
    const ngay = NGAY_RE.test(String((req.body || {}).date || '')) ? String(req.body.date) : todayStr();

    const rec = {
      id: db.nextId('ht'),
      studentId,
      date: ngay,
      type,
      title: String(title).trim(),
      detail: String(detail || '').trim(),
    };
    if (type === 'checkup') {
      for (const [cot, v] of [['height', height], ['weight', weight]]) {
        const loi = loiCanDo(cot, v);
        if (loi) return res.status(400).json({ error: loi });
      }
      const h = Number(height), w = Number(weight);
      if (Number.isFinite(h) && h > 0) rec.height = h;
      if (Number.isFinite(w) && w > 0) rec.weight = w;
      // HAI Ô NÀY TỪNG LÀ Ô CHẾT: màn hình hiện chúng, máy chủ không nhận.
      //
      // Cột `vision` và `bmiNote` có sẵn trong `lib/schema.sql` và màn hồ sơ
      // sức khoẻ đã in ra từ lâu, nhưng không đường nào ghi được — nghĩa là
      // chúng chỉ có giá trị nếu nhập từ kho dữ liệu cũ. Y tế trường khám xong
      // không nhập được đúng thứ mình vừa đo là chuyện họ sẽ hỏi ngay.
      rec.vision = chuoiYTe(req.body.vision);
      rec.bmiNote = chuoiYTe(req.body.bmiNote);
    }
    db.insert('health', rec);
    ghiLuc(rec.id, req.user.id);
    // Báo gia đình (Đ137): cân đo, khám hay sự cố đều là chuyện gia đình muốn
    // biết ngay — nhất là sự cố.
    {
      const be = db.findStudent(studentId);
      tbb.gui({ studentId, loai: 'suc-khoe', nguoiTao: req.user.id,
        tieuDe: type === 'incident'
          ? `Cô ghi một sự cố y tế của ${be ? be.name : 'con'}`
          : `Cô vừa ghi ${type === 'checkup' ? 'khám / cân đo' : 'sức khoẻ'} của ${be ? be.name : 'con'}`,
        noiDung: rec.title, hash: '#/health',
        // Dòng chuông chép tiêu đề của ghi nhận, nên thu hồi ghi nhận (ca "sốt,
        // nghi tay chân miệng" bấm nhầm sang bé khác) thì dòng chuông cũng thôi
        // đi ra khỏi máy chủ (Đ239q, lib/thong-bao-be.js).
        nguon: { bang: BANG, recordId: rec.id } });
    }
    res.status(201).json(rec);
  });

  // =========================================================================
  // TỆP CÂN ĐO — TẢI MẪU VỀ, ĐIỀN NGOÀI GIỜ, RỒI NẠP CẢ NHÓM (Đ205, việc 11)
  // =========================================================================
  //
  // Bốn việc nhà trường xin cho mảng cân đo thì ba đã có: gợi ý mờ theo tuổi,
  // nhập cả nhóm một lượt ngay trên màn, xem lại các tháng trước. Còn đúng
  // phần tệp — và nó có lý do thật, không phải cho đủ bộ: hôm cân đo cả trường
  // thì cô đứng ở phòng y tế với cái cân, không cầm điện thoại, và người gõ
  // vào máy là một người khác vào buổi tối.
  //
  // NẠP TỆP ĐI QUA ĐÚNG ĐƯỜNG GHI CỦA MÀN HÌNH, không dựng đường thứ hai.
  // Cùng `loiCanDo`, cùng luật "đã có thì sửa, chưa có thì thêm", cùng lượt báo
  // gia đình. Một đường nạp tệp tự ghi thẳng vào bảng là chỗ mọi luật vừa dựng
  // bị đi vòng qua — và nó sẽ đi vòng lặng lẽ, vì không ai nhìn màn hình lúc
  // nạp một tệp 30 dòng.
  const COT_TEP = ['Mã của bé', 'Họ và tên', 'Nhóm lớp', 'Chiều cao (cm)', 'Cân nặng (kg)'];

  app.get('/api/health/mau-can-do.csv', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.query.classId || '').trim();
    const cls = classId ? db.findClass(classId) : null;
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
    }
    // ĐIỀN SẴN TÊN BÉ, ĐỂ TRỐNG HAI Ô SỐ.
    //
    // Mẫu rỗng thì người gõ phải tự chép tên 30 bé sang, và chép tay tên trẻ là
    // chỗ sinh ra dòng "Nguyễn Bảo An" thứ hai không khớp bé nào. Điền sẵn thì
    // lượt nạp chỉ còn việc đọc hai con số.
    const ds = db.all('students',
      'SELECT id, code, name FROM students WHERE classId = ? AND active = 1 ORDER BY name COLLATE NOCASE',
      [classId]);
    const hang = ds.map(b => khoaCongThucYTe({
      'Mã của bé': b.code || b.id,
      'Họ và tên': b.name,
      'Nhóm lớp': cls.name,
      'Chiều cao (cm)': '',
      'Cân nặng (kg)': '',
    }));
    db.audit(req.user.id, 'health-tai-mau-can-do', classId, { soBe: hang.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="mau-can-do-${classId}.csv"`);
    res.send(csv.stringify(COT_TEP, hang));
  });

  app.post('/api/health/nap-can-do', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const classId = String(b.classId || '').trim();
    const cls = classId ? db.findClass(classId) : null;
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
    }
    const date = NGAY_RE.test(String(b.date || '')) ? String(b.date) : todayStr();
    if (date > todayStr()) return res.status(400).json({ error: 'Chưa ghi cân đo cho ngày chưa tới được' });

    const text = String(b.text || '');
    if (!text.trim()) return res.status(400).json({ error: 'Chưa có nội dung tệp nào' });
    // `kiemTraBangMa` trả về một OBJECT `{ ok }`, không phải chuỗi lỗi — bản
    // đầu của đường này viết `if (loiBangMa)` nên lượt nạp nào cũng bị từ chối
    // với câu lỗi là `{"ok":true}`. Bài canh bắt ngay ở lượt chạy đầu tiên.
    const bangMa = csv.kiemTraBangMa(text);
    if (!bangMa.ok) {
      return res.status(400).json({
        error: 'Tệp bị lỗi phông chữ tiếng Việt: chữ có dấu đã biến thành ký tự lạ '
          + `(dòng ${bangMa.dongDau}: "${bangMa.viDu}"). Xin mở lại tệp bằng Excel, chọn `
          + 'Tệp → Lưu dưới dạng → kiểu "CSV UTF-8 (Comma delimited) (*.csv)", rồi tải lên lần nữa.',
      });
    }

    let rows = [];
    try { rows = (csv.parse(text) || {}).rows || []; }
    catch (err) { return res.status(400).json({ error: 'Không đọc được tệp này. Tệp phải là CSV xuất từ Excel.' }); }
    if (!rows.length) return res.status(400).json({ error: 'Tệp không có dòng nào' });

    // TRA BÉ THEO MÃ TRƯỚC, TÊN SAU — và tên TRÙNG thì TỪ CHỐI cả mẻ.
    //
    // Trùng họ tên trong tiếng Việt là chuyện thường, và chính app đã thừa nhận
    // điều đó ở đường nhận bé. Ghi nhầm chiều cao của bé này sang bé kia thì
    // không ai đọc ra được: hai con số đều hợp lệ, hồ sơ đều có số. Nên chỗ
    // nào máy không chắc là dừng lại hỏi, không đoán.
    const dsBe = db.all('students',
      'SELECT id, code, name FROM students WHERE classId = ? AND active = 1', [classId]);
    const theoMa = new Map(dsBe.filter(x => x.code).map(x => [String(x.code).trim().toLowerCase(), x]));
    const demTen = new Map();
    for (const x of dsBe) {
      const k = csv.boDau(String(x.name)).trim().toLowerCase();
      demTen.set(k, (demTen.get(k) || 0) + 1);
    }
    const theoTen = new Map(dsBe.map(x => [csv.boDau(String(x.name)).trim().toLowerCase(), x]));

    const danhSach = [];
    const boQua = [];
    for (const [i, r] of rows.entries()) {
      const dong = i + 2;                       // +1 dòng tiêu đề, +1 để đếm từ 1
      const ma = String(r['Mã của bé'] || '').trim().toLowerCase();
      const ten = String(r['Họ và tên'] || '').trim();
      const be = (ma && theoMa.get(ma)) || null;
      let chon = be;
      if (!chon && ten) {
        const k = csv.boDau(ten).trim().toLowerCase();
        if ((demTen.get(k) || 0) > 1) {
          return res.status(400).json({
            error: `Dòng ${dong}: nhóm có hơn một bé tên "${ten}", nên máy không biết là bé nào. `
              + 'Điền thêm cột "Mã của bé" cho dòng này rồi nạp lại giúp cô nhé.',
          });
        }
        chon = theoTen.get(k) || null;
      }
      if (!chon) {
        if (!ma && !ten) continue;              // dòng trắng cuối tệp
        return res.status(400).json({
          error: `Dòng ${dong}: không tìm thấy bé "${ten || ma}" trong nhóm ${cls.name}. `
            + 'Tệp có phải của đúng nhóm này không ạ?',
        });
      }
      if (!db.canAccessStudent(req.user, chon.id)) {
        return res.status(403).json({ error: `Không có quyền ghi cho bé ${chon.name}` });
      }
      const h = String(r['Chiều cao (cm)'] ?? '').trim().replace(',', '.');
      const w = String(r['Cân nặng (kg)'] ?? '').trim().replace(',', '.');
      if (!h && !w) { boQua.push(chon.name); continue; }
      for (const [cot, v] of [['height', h], ['weight', w]]) {
        if (!v) continue;
        const loi = loiCanDo(cot, v);
        if (loi) return res.status(400).json({ error: `Dòng ${dong} — ${chon.name}: ${loi}` });
      }
      danhSach.push({ studentId: chon.id, height: h || '', weight: w || '' });
    }
    if (!danhSach.length) {
      return res.status(400).json({ error: 'Tệp không có số đo nào — mọi dòng đều để trống hai ô số.' });
    }

    // ĐI QUA ĐÚNG HÀM ĐÃ DỰNG ĐƯỜNG GHI CỦA MÀN HÌNH. Xem chú thích đầu khối.
    const ra = ghiCanDoNhom(req, classId, date, danhSach);
    if (ra.loi) return res.status(ra.ma || 400).json({ error: ra.loi });
    db.audit(req.user.id, 'health-nap-can-do', classId, { date, soDong: rows.length, ...ra.dem });
    res.json({ ok: true, date, ...ra.dem, boQua });
  });

  // Sửa lại một ghi nhận y tế.
  app.put('/api/health/:id', requireRole('teacher', 'admin'), (req, res) => {
    const h = db.first('health', 'SELECT * FROM health WHERE id = ?', [req.params.id]);
    if (!h || st.daThuHoi(BANG, h.id)) return res.status(404).json({ error: 'Không tìm thấy ghi nhận' });
    if (!coTheSuaYTe(req.user, h.studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa ghi nhận của bé này' });
    }
    const quaNgay = loiQuaNgay(req.user, h);
    if (quaNgay) return res.status(403).json({ error: quaNgay });
    const patch = {};
    // Đường SỬA dùng TYPES_DOC, không phải TYPES_GHI: bản ghi tiêm chủng CŨ
    // phải sửa được tiêu đề, chi tiết và ngày. Nhưng không được BIẾN một bản
    // ghi khác THÀNH tiêm chủng — đó chính là lối vòng mà màn hình vừa bịt.
    if (req.body.type !== undefined) {
      if (!TYPES_DOC.includes(req.body.type)) return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
      if (req.body.type !== h.type && !TYPES_GHI.includes(req.body.type)) {
        return res.status(400).json({ error: 'Trường mình không ghi tiêm chủng nữa, nên không đổi ghi nhận này sang loại đó được.' });
      }
      patch.type = req.body.type;
    }
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề ghi nhận' });
      patch.title = String(req.body.title).trim();
    }
    if (req.body.detail !== undefined) patch.detail = String(req.body.detail || '').trim();
    if (req.body.date !== undefined) {
      if (!NGAY_RE.test(String(req.body.date))) return res.status(400).json({ error: 'Ngày ghi nhận không hợp lệ' });
      patch.date = String(req.body.date);
    }
    for (const [k, v] of [['height', req.body.height], ['weight', req.body.weight]]) {
      if (v === undefined) continue;
      const loi = loiCanDo(k, v);
      if (loi) return res.status(400).json({ error: loi });
      const n = Number(v);
      patch[k] = Number.isFinite(n) && n > 0 ? n : null;
    }
    for (const k of ['vision', 'bmiNote']) {
      if (req.body[k] !== undefined) patch[k] = chuoiYTe(req.body[k]);
    }
    db.update('health', h.id, patch);
    st.ghiDaSua(BANG, h.id, req.user.id);
    db.audit(req.user.id, 'health-update', h.id, patch);
    res.json({ ...db.first('health', 'SELECT * FROM health WHERE id = ?', [h.id]), daSua: true });
  });

  // Thu hồi một ghi nhận y tế: ẩn khỏi hồ sơ của em, KHÔNG xóa dữ liệu.
  // Đây là đường mà hiệu trưởng cần khi một ghi nhận kiểu "sốt, nghi tay chân
  // miệng" bị bấm nhầm sang học sinh khác.
  app.delete('/api/health/:id', requireRole('teacher', 'admin'), (req, res) => {
    const h = db.first('health', 'SELECT * FROM health WHERE id = ?', [req.params.id]);
    if (!h) return res.status(404).json({ error: 'Không tìm thấy ghi nhận' });
    if (!coTheSuaYTe(req.user, h.studentId)) {
      return res.status(403).json({ error: 'Không có quyền thu hồi ghi nhận của bé này' });
    }
    // THU HỒI KHÔNG KHOÁ THEO NGÀY, nhưng ngoài ngày thì chỉ nhà trường làm.
    //
    // Đường này sinh ra để gỡ một ghi nhận kiểu "sốt, nghi tay chân miệng" bấm
    // nhầm sang bé khác — thứ thường chỉ lộ ra sau vài ngày, khi gia đình bé
    // kia đọc thấy. Khoá nó theo ngày là bịt đúng đường sửa sai duy nhất.
    if (loiQuaNgay(req.user, h)) {
      return res.status(403).json({
        error: 'Ghi nhận này ghi hôm ' + ngayGhiCua(h) + ' nên cô không tự thu hồi được nữa. '
          + 'Nhắn văn phòng giúp cô nhé — phần đã ghi vẫn giữ nguyên, không mất đi đâu cả.',
      });
    }
    // Dòng chuông `thongbao_be` báo ghi nhận này cho gia đình KHÔNG cần đụng
    // tới ở đây: nó được ghi kèm `nguon` trỏ về ghi nhận, và lib/thong-bao-be.js
    // lọc theo chính vết `record_edits` mà dòng dưới ghi (Đ239q).
    st.ghiThuHoi(BANG, h.id, req.user.id);
    db.audit(req.user.id, 'health-withdraw', h.id, { title: h.title, studentId: h.studentId });
    res.json({ ok: true });
  });
};
