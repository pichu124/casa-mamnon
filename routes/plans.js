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

  // ===========================================================================
  // KẾ HOẠCH GIÁO DỤC CHUNG CẢ TRƯỜNG, SOẠN THEO TUẦN (góp ý 06/10, mục 4)
  // ===========================================================================
  //
  // Trường: *"đây sẽ là kế hoạch chung của toàn trường nên sẽ bỏ nhóm lớp đi …
  // mục này mình sẽ để là soạn kế hoạch tuần, cấu trúc: Tuần 1 tháng 9: Trường
  // của bé — Nội dung học của tuần"*.
  //
  // THÊM BÊN CẠNH, KHÔNG THAY: hai đường kế hoạch tháng ở trên giữ nguyên từng
  // chữ — kế hoạch tháng đã soạn vẫn đọc được ở #/plans.
  //
  // AI ĐỌC: mọi người đã đăng nhập (đây là kế hoạch chung, không phải dữ liệu
  // của một bé nào). AI SOẠN: quản trị phạm vi CẢ TRƯỜNG (ban giám hiệu, quản
  // trị không gắn cơ sở). Quản trị một cơ sở chỉ đọc — sửa bản chung của cả
  // trường là đổi màn hình của hai cơ sở kia mà họ không biết.
  const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TOI_DA_TIEU_DE_TUAN = 150;
  const TOI_DA_NOI_DUNG_TUAN = 4000;
  const TOI_DA_DONG_TUAN = 40;

  // Thứ Hai của tuần chứa ngày `s` (YYYY-MM-DD). Ngày sai dạng → null.
  function thuHaiCua(s) {
    if (!NGAY_RE.test(String(s || ''))) return null;
    const t = Date.parse(`${s}T00:00:00Z`);
    if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== s) return null;
    const thu = (new Date(t).getUTCDay() + 6) % 7;   // 0 = thứ Hai
    return new Date(t - thu * 86400000).toISOString().slice(0, 10);
  }
  function soanDuocTuan(user) {
    return !!user && user.role === 'admin' && !db.phamViCoSo(user);
  }
  function veTuan(r) {
    return r ? { tuan: r.tuan, tieuDe: r.tieuDe || '', noiDung: r.noiDung || '', capNhatLuc: r.capNhatLuc || '' } : null;
  }

  // Kế hoạch của MỘT tuần (mặc định tuần này), kèm hai tuần gần nhất trước /
  // sau CÓ kế hoạch — để màn hình có nút "tuần trước / tuần sau" không dẫn vào
  // một tuần trống.
  app.get('/api/plans/tuan', (req, res) => {
    const tuan = thuHaiCua(req.query.tuan ? String(req.query.tuan) : ngay.homNay());
    if (!tuan) return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-10-05' });
    const r = db.first('edu_plan_tuan',
      "SELECT * FROM edu_plan_tuan WHERE tuan = ? AND campusId = ''", [tuan]);
    const truoc = db.first('edu_plan_tuan',
      "SELECT tuan FROM edu_plan_tuan WHERE tuan < ? AND campusId = '' ORDER BY tuan DESC LIMIT 1", [tuan]);
    const sau = db.first('edu_plan_tuan',
      "SELECT tuan FROM edu_plan_tuan WHERE tuan > ? AND campusId = '' ORDER BY tuan LIMIT 1", [tuan]);
    res.json({
      tuan,
      tuanNay: thuHaiCua(ngay.homNay()),
      keHoach: veTuan(r),
      tuanTruocCo: truoc ? truoc.tuan : null,
      tuanSauCo: sau ? sau.tuan : null,
      duocSoan: soanDuocTuan(req.user),
    });
  });

  app.put('/api/plans/tuan/:tuan', requireRole('admin'), (req, res) => {
    if (!soanDuocTuan(req.user)) {
      return res.status(403).json({
        error: 'Kế hoạch giáo dục chung cả trường do ban giám hiệu soạn. '
          + 'Văn phòng cơ sở xem được ở đây; cần đổi gì thì nhắn ban giám hiệu nhé.',
      });
    }
    const tuan = thuHaiCua(String(req.params.tuan || ''));
    if (!tuan) return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-10-05' });
    const body = req.body || {};
    const tieuDe = String(body.tieuDe || '').trim().slice(0, TOI_DA_TIEU_DE_TUAN);
    if (!tieuDe) return res.status(400).json({ error: 'Cần một tiêu đề, ví dụ: Tuần 1 tháng 9: Trường của bé' });
    const noiDung = String(body.noiDung || '')
      .split(/\r?\n/).map(x => x.trim()).filter(Boolean)
      .slice(0, TOI_DA_DONG_TUAN).join('\n').slice(0, TOI_DA_NOI_DUNG_TUAN);
    const luc = new Date().toISOString();
    const cu = db.first('edu_plan_tuan',
      "SELECT * FROM edu_plan_tuan WHERE tuan = ? AND campusId = ''", [tuan]);
    let id;
    if (cu) {
      id = cu.id;
      db.update('edu_plan_tuan', cu.id, { tieuDe, noiDung, nguoiSoan: req.user.id, capNhatLuc: luc });
    } else {
      id = db.nextId('kht');
      db.insert('edu_plan_tuan', {
        id, tuan, campusId: '', tieuDe, noiDung, nguoiSoan: req.user.id, taoLuc: luc, capNhatLuc: luc,
      });
    }
    db.audit(req.user.id, 'plan-tuan-luu', id, { tuan });
    res.json({ ok: true, keHoach: veTuan(db.first('edu_plan_tuan', 'SELECT * FROM edu_plan_tuan WHERE id = ?', [id])) });
  });
};
