// Phân hệ Thời khóa biểu: trả TKB của lớp mà người dùng có quyền xem,
// và cho giáo viên chủ nhiệm / quản trị cập nhật TKB của lớp.
// Phụ huynh: lớp của một trong các con. Giáo viên: lớp chủ nhiệm.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');

// Giới hạn kích thước để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
const TOI_DA_TIET = 12;      // số tiết mỗi ngày
const TOI_DA_MON = 60;       // độ dài tên môn
const TOI_DA_GIO = 40;       // độ dài khung giờ "07:30 – 08:05"

// Chuẩn hóa danh sách khung giờ tiết học. Trả về null nếu không hợp lệ.
function lamSachKhungGio(periodTimes) {
  if (!Array.isArray(periodTimes) || !periodTimes.length || periodTimes.length > TOI_DA_TIET) return null;
  return periodTimes.map((pt, i) => {
    const o = pt && typeof pt === 'object' ? pt : {};
    return {
      p: String(o.p ?? i + 1).trim().slice(0, 6) || String(i + 1),
      time: String(o.time || '').trim().slice(0, TOI_DA_GIO),
    };
  });
}

// Chuẩn hóa lịch các thứ trong tuần theo đúng số tiết. Trả về null nếu không hợp lệ.
function lamSachCacNgay(days, soTiet) {
  if (!days || typeof days !== 'object' || Array.isArray(days)) return null;
  const out = {};
  for (let d = 1; d <= 5; d++) {
    const mang = days[d] ?? days[String(d)];
    if (mang !== undefined && !Array.isArray(mang)) return null;
    const dsMon = (mang || []).slice(0, soTiet)
      .map(m => String(m ?? '').trim().slice(0, TOI_DA_MON) || '—');
    while (dsMon.length < soTiet) dsMon.push('—');
    out[String(d)] = dsMon;
  }
  return out;
}

module.exports = (app) => {
  app.get('/api/timetable', (req, res) => {
    const classId = String(req.query.classId || '').trim();
    if (!classId) return res.status(400).json({ error: 'Thiếu mã lớp (classId)' });

    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });

    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem thời khóa biểu của lớp này' });
    }

    const tt = db.first('timetable', 'SELECT * FROM timetable WHERE classId = ?', [classId]);
    if (!tt) return res.status(404).json({ error: 'Lớp chưa có thời khóa biểu' });

    res.json({
      ...tt,
      className: cls.name,
      ...nl.tomTat(cls.id),
    });
  });

  // Giáo viên chủ nhiệm cập nhật TKB lớp mình; quản trị cập nhật lớp bất kỳ.
  // Ghi đè cả bản ghi (mỗi lớp một dòng) nên tạo mới và sửa dùng chung một đường.
  app.put('/api/timetable/:classId', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.params.classId || '').trim();
    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });

    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Chỉ cô phụ trách nhóm mới được sửa thời khóa biểu của nhóm này' });
    }

    const periodTimes = lamSachKhungGio((req.body || {}).periodTimes);
    if (!periodTimes) {
      return res.status(400).json({ error: 'Khung giờ tiết học chưa hợp lệ. Vui lòng kiểm tra lại.' });
    }
    const days = lamSachCacNgay((req.body || {}).days, periodTimes.length);
    if (!days) {
      return res.status(400).json({ error: 'Lịch các thứ trong tuần chưa hợp lệ. Vui lòng kiểm tra lại.' });
    }

    db.upsert('timetable', { classId, periodTimes, days }, ['classId']);
    db.audit(req.user.id, 'timetable-update', classId, { className: cls.name });

    res.json({
      classId, periodTimes, days,
      className: cls.name,
      ...nl.tomTat(cls.id),
    });
  });
};
