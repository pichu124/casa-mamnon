// Phân hệ Báo cáo học tập: kết quả từng học kỳ của học sinh.
// Phụ huynh xem; GVCN/quản trị soạn. Chuyên cần KHÔNG nhập tay mà tự tính
// từ dữ liệu điểm danh của đúng học kỳ đó — nhập tay dễ lệch với sổ điểm danh.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Giới hạn để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
const TOI_DA_MON = 15;
const TOI_DA_TEN_MON = 40;
const TOI_DA_DANH_GIA = 40;
const TOI_DA_NX_MON = 200;
const TOI_DA_HANH_KIEM = 30;
const TOI_DA_TONG_QUAT = 120;
const TOI_DA_NHAN_XET = 1000;

// Khoảng ngày của một học kỳ trong năm học "YYYY-YYYY":
// HK1 = 01/08 → 31/12 năm đầu; HK2 = 01/01 → 31/07 năm sau.
function khoangHocKy(term, year) {
  const [namDau, namSau] = year.split('-').map(Number);
  return term === 1
    ? { tu: `${namDau}-08-01`, den: `${namDau}-12-31` }
    : { tu: `${namSau}-01-01`, den: `${namSau}-07-31` };
}

// Đếm chuyên cần của học sinh trong một học kỳ từ bảng điểm danh.
function tinhChuyenCan(studentId, term, year) {
  const { tu, den } = khoangHocKy(term, year);
  const rows = db.all('attendance',
    'SELECT status FROM attendance WHERE studentId = ? AND date BETWEEN ? AND ?', [studentId, tu, den]);
  return {
    present: rows.filter(r => r.status === 'present').length,
    late: rows.filter(r => r.status === 'late').length,
    absent: rows.filter(r => r.status === 'absent_excused' || r.status === 'absent_unexcused').length,
  };
}

// Chuẩn hóa bảng điểm các môn. Trả về null nếu không hợp lệ.
function lamSachMon(subjects) {
  if (!Array.isArray(subjects) || !subjects.length || subjects.length > TOI_DA_MON) return null;
  const out = [];
  for (const sb of subjects) {
    const o = sb && typeof sb === 'object' ? sb : {};
    const name = String(o.name || '').trim().slice(0, TOI_DA_TEN_MON);
    if (!name) return null; // môn phải có tên
    let score = null;
    if (o.score !== undefined && o.score !== null && String(o.score).trim() !== '') {
      score = Number(o.score);
      if (!Number.isFinite(score) || score < 0 || score > 10) return null; // điểm thang 10
      score = Math.round(score * 10) / 10;
    }
    out.push({
      name,
      score,
      level: String(o.level || '').trim().slice(0, TOI_DA_DANH_GIA),
      comment: String(o.comment || '').trim().slice(0, TOI_DA_NX_MON),
    });
  }
  return out;
}

module.exports = (app) => {
  // Danh sách báo cáo học tập của một học sinh, sắp theo học kỳ.
  app.get('/api/reports', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    res.json(db.all('reports',
      'SELECT * FROM reports WHERE studentId = ? ORDER BY year, term', [studentId]));
  });

  // GVCN soạn báo cáo học kỳ cho học sinh lớp mình; quản trị cho học sinh bất kỳ.
  // Mỗi học sinh mỗi học kỳ một bản: đã có thì ghi đè, chưa có thì tạo mới.
  app.put('/api/reports/:studentId', requireRole('teacher', 'admin'), (req, res) => {
    const studentId = String(req.params.studentId || '').trim();
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền soạn báo cáo cho bé này' });
    }

    const body = req.body || {};
    const term = Number(body.term);
    if (term !== 1 && term !== 2) {
      return res.status(400).json({ error: 'Học kỳ chưa hợp lệ (1 hoặc 2)' });
    }
    const year = String(body.year || '').trim();
    const mYear = year.match(/^(\d{4})-(\d{4})$/);
    if (!mYear || Number(mYear[2]) !== Number(mYear[1]) + 1) {
      return res.status(400).json({ error: 'Năm học chưa hợp lệ, ví dụ đúng: 2026-2027' });
    }
    const subjects = lamSachMon(body.subjects);
    if (!subjects) {
      return res.status(400).json({ error: 'Bảng điểm các môn chưa hợp lệ. Mỗi môn cần có tên, điểm theo thang 10.' });
    }
    const conduct = String(body.conduct || '').trim().slice(0, TOI_DA_HANH_KIEM);
    if (!conduct) return res.status(400).json({ error: 'Vui lòng chọn hạnh kiểm' });
    const overall = String(body.overall || '').trim().slice(0, TOI_DA_TONG_QUAT);
    if (!overall) return res.status(400).json({ error: 'Vui lòng nhập đánh giá chung' });
    const teacherComment = String(body.teacherComment || '').trim().slice(0, TOI_DA_NHAN_XET);

    const termLabel = `Học kỳ ${term} (${year})`;
    const attendanceSummary = tinhChuyenCan(studentId, term, year);

    const cu = db.first('reports',
      'SELECT * FROM reports WHERE studentId = ? AND term = ?', [studentId, termLabel]);
    let rec;
    if (cu) {
      rec = { ...cu, year, subjects, conduct, overall, attendanceSummary, teacherComment };
      db.update('reports', cu.id, { year, subjects, conduct, overall, attendanceSummary, teacherComment });
    } else {
      rec = { id: db.nextId('rp'), studentId, term: termLabel, year, subjects, conduct, overall, attendanceSummary, teacherComment };
      db.insert('reports', rec);
    }
    db.audit(req.user.id, 'report-update', rec.id, { studentId, term: termLabel });
    res.json(rec);
  });
};
