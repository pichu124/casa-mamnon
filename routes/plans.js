// Phân hệ Kế hoạch giáo dục tháng của lớp: phụ huynh xem, GVCN/quản trị soạn.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');

// Giới hạn để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
const TOI_DA_CHU_DE = 120;
const TOI_DA_MUC_TIEU = 15;   // số mục tiêu
const TOI_DA_MOT_MUC = 200;   // độ dài một mục tiêu
const TOI_DA_TUAN = 6;        // tháng nhiều nhất cũng chỉ 6 tuần học
const TOI_DA_TRONG_TAM = 120;
const TOI_DA_HOAT_DONG = 500;
const TOI_DA_LOI_NHAN = 500;

// Chuẩn hóa danh sách mục tiêu. Trả về null nếu không hợp lệ.
function lamSachMucTieu(goals) {
  if (goals === undefined || goals === null) return [];
  if (!Array.isArray(goals)) return null;
  return goals
    .map(g => String(g ?? '').trim().slice(0, TOI_DA_MOT_MUC))
    .filter(Boolean)
    .slice(0, TOI_DA_MUC_TIEU);
}

// Chuẩn hóa kế hoạch tuần; bỏ tuần bỏ trống hẳn. Trả về null nếu không hợp lệ.
function lamSachTuan(weeks) {
  if (weeks === undefined || weeks === null) return [];
  if (!Array.isArray(weeks)) return null;
  return weeks.slice(0, TOI_DA_TUAN)
    .map((w, i) => {
      const o = w && typeof w === 'object' ? w : {};
      return {
        week: Number.isInteger(o.week) && o.week >= 1 && o.week <= TOI_DA_TUAN ? o.week : i + 1,
        focus: String(o.focus || '').trim().slice(0, TOI_DA_TRONG_TAM),
        activities: String(o.activities || '').trim().slice(0, TOI_DA_HOAT_DONG),
      };
    })
    .filter(w => w.focus || w.activities);
}

// Ghép thêm tên lớp + tên GVCN cho một kế hoạch.
function decorate(p) {
  const cls = db.findClass(p.classId);
  return {
    ...p,
    className: cls ? cls.name : '',
    ...nl.tomTat(p.classId),
  };
}

module.exports = (app) => {
  // Kế hoạch giáo dục của một lớp: trả về kế hoạch tháng hiện tại (plan)
  // kèm toàn bộ kế hoạch của lớp (plans, mới nhất trước).
  app.get('/api/plans', (req, res) => {
    const classId = String(req.query.classId || '');
    if (!classId) return res.status(400).json({ error: 'Thiếu mã nhóm' });
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem kế hoạch của nhóm này' });
    }
    // "Tháng này" theo giờ Việt Nam, không theo giờ của máy chủ (Đ2).
    const [nam, thang] = ngay.thangNay().split('-').map(Number);
    const plans = db.all('edu_plans',
      'SELECT * FROM edu_plans WHERE classId = ? ORDER BY year DESC, month DESC', [classId])
      .map(decorate);
    const plan = plans.find(p => p.month === thang && p.year === nam) || null;

    // KẾ HOẠCH THÁNG SAU CŨNG PHẢI CÓ ĐƯỜNG RA MÀN HÌNH
    //
    // Cô soạn kế hoạch tháng 9 vào cuối tháng 8 — đó là cách duy nhất soạn
    // kịp. Trước đợt này câu trả lời chỉ có `plan` của ĐÚNG tháng hiện tại,
    // nên bản vừa soạn xong biến mất khỏi màn hình và chỗ đó ghi "Chưa có kế
    // hoạch giáo dục cho tháng này". Cô không phân biệt được "app chưa lưu"
    // với "app lưu rồi nhưng chưa tới lúc hiện", nên soạn lại lần nữa.
    //
    // THÊM một khoá mới bên cạnh, KHÔNG đổi ý nghĩa của `plan` — màn hình cũ
    // và mọi bài kiểm thử đang dựa vào nó vẫn chạy y như trước.
    const sapToi = plans
      .filter(p => p.year > nam || (p.year === nam && p.month > thang))
      .sort((a, b) => a.year - b.year || a.month - b.month)[0] || null;

    res.json({ plan, planSapToi: sapToi, plans });
  });

  // VĂN PHÒNG SOẠN KẾ HOẠCH CHUNG, CÔ THÔI SOẠN (Đ198, việc 42).
  //
  // Nhà trường (A24): *"Cái này do VĂN PHÒNG làm cho bớt việc của cô"*. Đ180 đã
  // mở đường cho văn phòng vào được màn này; đây là nửa còn lại — đóng đường
  // của cô lại.
  //
  // ĐÂY LÀ LẤY ĐI MỘT THỨ ĐANG CHẠY, nên phải nói rõ vì sao nó vẫn đúng: cô
  // KHÔNG mất chỗ nào để soạn cho bé. Kế hoạch của TỪNG BÉ (`modules/kehoachbe`)
  // vẫn là của cô và không đụng tới một dòng — trường chỉ chuyển phần kế hoạch
  // CẢ NHÓM sang văn phòng, đúng như họ nói, để cô đỡ việc giấy tờ.
  //
  // CÂU TỪ CHỐI NÓI RA CHỖ CÔ VẪN LÀM ĐƯỢC. Một lời từ chối cụt lủn là chỗ cô
  // nghĩ app hỏng rồi quay về sổ giấy — bài học đã ghi ở Đ168.
  app.put('/api/plans/:classId/:year/:month', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.params.classId || '').trim();
    if (!db.findClass(classId)) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (req.user.role === 'teacher') {
      return res.status(403).json({
        error: 'Kế hoạch giáo dục của cả nhóm nay do văn phòng nhà trường soạn, cho bớt việc của cô. '
          + 'Kế hoạch của từng bé thì vẫn là của cô như trước nhé.',
      });
    }
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc phạm vi của tài khoản' });
    }

    const year = Number(req.params.year), month = Number(req.params.month);
    if (!Number.isInteger(year) || year < 2020 || year > 2100
      || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Tháng hoặc năm chưa hợp lệ' });
    }

    const body = req.body || {};
    const theme = String(body.theme || '').trim().slice(0, TOI_DA_CHU_DE);
    if (!theme) return res.status(400).json({ error: 'Vui lòng nhập chủ đề của tháng' });
    const goals = lamSachMucTieu(body.goals);
    if (!goals) return res.status(400).json({ error: 'Danh sách mục tiêu chưa hợp lệ' });
    const weeks = lamSachTuan(body.weeks);
    if (!weeks) return res.status(400).json({ error: 'Kế hoạch tuần chưa hợp lệ' });
    const note = String(body.note || '').trim().slice(0, TOI_DA_LOI_NHAN);

    const cu = db.first('edu_plans',
      'SELECT * FROM edu_plans WHERE classId = ? AND year = ? AND month = ?', [classId, year, month]);
    let rec;
    if (cu) {
      rec = { ...cu, theme, goals, weeks, note, createdBy: req.user.id };
      db.update('edu_plans', cu.id, { theme, goals, weeks, note, createdBy: req.user.id });
    } else {
      rec = { id: db.nextId('plan'), classId, month, year, theme, goals, weeks, note, createdBy: req.user.id };
      db.insert('edu_plans', rec);
    }
    db.audit(req.user.id, 'plan-update', rec.id, { classId, year, month });
    res.json(decorate(rec));
  });
};
