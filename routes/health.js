// Phân hệ Y tế học đường: hồ sơ sức khỏe của học sinh, giáo viên thêm ghi nhận mới.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');
const tbb = require('../lib/thong-bao-be');

const TYPES = ['checkup', 'vaccination', 'incident'];
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

function todayStr() {
  return ngay.homNay();
}

// Chữ do y tế trường gõ. Cắt độ dài, không tự đổi nội dung.
//
// QUY TẮC 4 VÀ Ô "ĐÁNH GIÁ THỂ TRẠNG"
//
// Đây là NHẬN ĐỊNH CỦA NGƯỜI KHÁM, không phải con số app tính ra. App tuyệt đối
// không được tự suy nó từ chiều cao và cân nặng rồi ghi vào — làm thế là app tự
// xếp một đứa trẻ so với "chuẩn của độ tuổi", đúng thứ QUY TẮC 4 cấm, và cũng
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

    const tieuDe = `Cân đo tháng ${date.slice(5, 7)}/${date.slice(0, 4)}`;
    const sach = [];
    for (const x of ds) {
      const be = db.findStudent(x && x.studentId);
      if (!be || be.classId !== classId) return res.status(400).json({ error: 'Danh sách có bé không thuộc nhóm này' });
      if (!db.canAccessStudent(req.user, be.id)) {
        return res.status(403).json({ error: `Không có quyền ghi cho bé ${be.name}` });
      }
      const h = x.height === '' || x.height === undefined || x.height === null ? null : Number(x.height);
      const w = x.weight === '' || x.weight === undefined || x.weight === null ? null : Number(x.weight);
      if (h === null && w === null) continue;   // dòng bỏ trống: bỏ qua, không tạo dòng rỗng
      for (const [cot, v] of [['height', h], ['weight', w]]) {
        const loi = loiCanDo(cot, v);
        if (loi) return res.status(400).json({ error: `${be.name}: ${loi}` });
      }
      sach.push({ be, h: Number.isFinite(h) && h > 0 ? h : null, w: Number.isFinite(w) && w > 0 ? w : null });
    }
    if (!sach.length) return res.status(400).json({ error: 'Chưa có số đo nào để ghi — cô điền ít nhất một bé nhé' });

    let daThem = 0, daSua = 0;
    db.tx(() => {
      for (const { be, h, w } of sach) {
        const cu = db.first('health',
          `SELECT * FROM health WHERE studentId = ? AND date = ? AND type = 'checkup' AND title = ?
             AND ${st.dieuKienConHien(BANG, 'id')} ORDER BY rowid DESC`, [be.id, date, tieuDe]);
        if (cu) {
          db.update('health', cu.id, { height: h, weight: w });
          daSua += 1;
        } else {
          db.insert('health', { id: db.nextId('ht'), studentId: be.id, date, type: 'checkup', title: tieuDe, detail: '', height: h, weight: w });
          daThem += 1;
        }
      }
    });
    db.audit(req.user.id, 'health-can-do-nhom', classId, { date, daThem, daSua });
    // Báo gia đình từng bé (Đ137) — một tin mỗi bé mỗi lượt lưu.
    for (const { be } of sach) {
      tbb.gui({ studentId: be.id, loai: 'suc-khoe', nguoiTao: req.user.id,
        tieuDe: `Cô vừa ghi cân đo của ${be.name}`,
        noiDung: `Số đo ngày ${date.slice(8, 10)}/${date.slice(5, 7)} đã có trong Sức khoẻ của bé.`,
        hash: '#/health' });
    }
    res.json({ ok: true, date, daThem, daSua, soBe: sach.length });
  });

  // CHẶN SỐ GÕ NHẦM — NHƯNG CHỈ SỐ GÕ NHẦM.
  //
  // Bản cũ chỉ kiểm `> 0`, không có trần trên. Gõ nhầm 170 cm cho một bé 3 tuổi
  // (thừa một số 0, hay gõ chiều cao của mẹ) được nhận và lưu im lặng, rồi nằm
  // trong hồ sơ sức khoẻ của bé đó mãi.
  //
  // Khoảng dưới đây CỐ Ý RỘNG HẾT MỨC. Nó chỉ bắt thứ chắc chắn là gõ nhầm,
  // không phán gì về đứa trẻ — QUY TẮC 4 cấm app so bé với "chuẩn của độ tuổi",
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
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
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
    // Báo gia đình (Đ137): cân đo, khám hay sự cố đều là chuyện gia đình muốn
    // biết ngay — nhất là sự cố.
    {
      const be = db.findStudent(studentId);
      tbb.gui({ studentId, loai: 'suc-khoe', nguoiTao: req.user.id,
        tieuDe: type === 'incident'
          ? `Cô ghi một sự cố y tế của ${be ? be.name : 'con'}`
          : `Cô vừa ghi ${type === 'checkup' ? 'khám / cân đo' : 'sức khoẻ'} của ${be ? be.name : 'con'}`,
        noiDung: rec.title, hash: '#/health' });
    }
    res.status(201).json(rec);
  });

  // Sửa lại một ghi nhận y tế.
  app.put('/api/health/:id', requireRole('teacher', 'admin'), (req, res) => {
    const h = db.first('health', 'SELECT * FROM health WHERE id = ?', [req.params.id]);
    if (!h || st.daThuHoi(BANG, h.id)) return res.status(404).json({ error: 'Không tìm thấy ghi nhận' });
    if (!coTheSuaYTe(req.user, h.studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa ghi nhận của bé này' });
    }
    const patch = {};
    if (req.body.type !== undefined) {
      if (!TYPES.includes(req.body.type)) return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
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
    st.ghiThuHoi(BANG, h.id, req.user.id);
    db.audit(req.user.id, 'health-withdraw', h.id, { title: h.title, studentId: h.studentId });
    res.json({ ok: true });
  });
};
