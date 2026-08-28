// Phân hệ Y tế học đường: hồ sơ sức khỏe của học sinh, giáo viên thêm ghi nhận mới.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

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
    const records = st.ganDauDaSua(BANG, db.all('health',
      `SELECT * FROM health WHERE studentId = ? AND ${st.dieuKienConHien(BANG, 'id')}
       ORDER BY date DESC, rowid DESC`, [studentId]))
      .map(r => ({ ...r, coTheSua: coTheSuaYTe(req.user, studentId) }));
    const latestCheckup = records.find(r => r.type === 'checkup') || null;
    res.json({ records, latestCheckup });
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
    }
    db.insert('health', rec);
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
