// Phân hệ Nề nếp: tuyên dương / nhắc nhở và điểm thi đua.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

const BANG = 'conduct';
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Ngày hôm nay theo giờ địa phương, định dạng YYYY-MM-DD (khớp seed).
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Bản ghi nề nếp của một học sinh (mới nhất trước) + tổng điểm.
  app.get('/api/conduct', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    // CỐ Ý KHÔNG giới hạn danh sách này. Hai ô "Tuyên dương" và "Nhắc nhở" trên
    // màn hình phụ huynh đếm ngay trên mảng records, nên cắt bớt ở đây sẽ làm hai
    // con số đó SAI mà không có lỗi nào báo. Đo thật: dữ liệu 5 năm của một em
    // chỉ khoảng 29 KB — không có vấn đề gì để phải cắt.
    const records = db.all('conduct',
      `SELECT * FROM conduct WHERE studentId = ? AND ${st.dieuKienConHien(BANG, 'id')}
       ORDER BY date DESC`, [studentId]);
    // Tổng điểm phải TRỪ luôn bản ghi đã thu hồi. Thu hồi một "nhắc nhở" mà điểm
    // vẫn bị trừ thì việc thu hồi chẳng còn nghĩa gì với gia đình.
    const totalPoints = db.count(
      `SELECT COALESCE(SUM(points), 0) FROM conduct
       WHERE studentId = ? AND ${st.dieuKienConHien(BANG, 'id')}`, [studentId]);
    res.json({ records: st.ganDauDaSua(BANG, records), totalPoints });
  });

  // Toàn cảnh lớp (giáo viên): ghi nhận gần đây + bảng xếp hạng thi đua.
  app.get('/api/conduct/class', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ recent: [], ranking: [] });
    const marks = ids.map(() => '?').join(',');
    const byId = new Map(students.map(s => [s.id, s]));

    // Giới hạn số ghi nhận gửi về.
    //
    // Học sinh mang lịch sử nề nếp qua từng năm nên màn này nặng thêm mỗi năm mà
    // hôm nay chưa có triệu chứng gì (đo được: 2 năm ~1,9 giây, 5 năm ~4,7 giây
    // trên điện thoại tầm trung qua 4G). Cô chỉ cần vài tuần gần nhất.
    //
    // Bảng xếp hạng bên dưới KHÔNG bị ảnh hưởng: tổng điểm do cơ sở dữ liệu cộng
    // bằng SUM trên toàn bộ bảng, không cộng trên danh sách đã cắt này.
    const MAC_DINH = 50;
    const gioiHan = Math.min(Math.max(Number(req.query.gioiHan) || MAC_DINH, 1), 500);
    const conHien = st.dieuKienConHien(BANG, 'id');
    const tongGhiNhan = db.count(
      `SELECT COUNT(*) FROM conduct WHERE studentId IN (${marks}) AND ${conHien}`, ids);
    const recent = st.ganDauDaSua(BANG, db.all('conduct',
      `SELECT * FROM conduct WHERE studentId IN (${marks}) AND ${conHien}
       ORDER BY date DESC, rowid DESC LIMIT ?`, [...ids, gioiHan]))
      .map(c => ({
        ...c,
        studentName: byId.get(c.studentId)?.name || '',
        coTheSua: st.laChuBanGhi(req.user, c.byTeacherId),
      }));

    // Tổng điểm từng em do cơ sở dữ liệu cộng, không phải duyệt mảng trong bộ nhớ.
    const sums = new Map(db.all('conduct',
      `SELECT studentId, COALESCE(SUM(points), 0) AS points FROM conduct
       WHERE studentId IN (${marks}) AND ${conHien} GROUP BY studentId`, ids)
      .map(r => [r.studentId, Number(r.points)]));

    const ranking = students
      .map(s => ({
        studentId: s.id,
        studentName: s.name,
        avatar: s.avatar,
        points: sums.get(s.id) || 0,
      }))
      .sort((a, b) => b.points - a.points);

    res.json({ recent, ranking, tongGhiNhan, gioiHan });
  });

  // Giáo viên ghi nhận tuyên dương / nhắc nhở cho học sinh lớp mình.
  app.post('/api/conduct', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, type, title, content, points } = req.body || {};
    if (!studentId || !db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm của cô' });
    }
    if (!['praise', 'reminder'].includes(type)) {
      return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
    }
    if (!String(title || '').trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề' });
    }
    const pts = Number(points);
    if (!Number.isFinite(pts)) {
      return res.status(400).json({ error: 'Điểm phải là một số' });
    }

    // Nhận ngày do người nhập chọn, mặc định hôm nay. Ép cứng ngày hôm nay thì
    // không ghi lùi được một sự việc xảy ra hôm trước mà cô chưa kịp nhập.
    const ngay = NGAY_RE.test(String(req.body.date || '')) ? String(req.body.date) : todayStr();

    const record = {
      id: db.nextId('cd'),
      studentId,
      date: ngay,
      type,
      title: String(title).trim(),
      content: String(content || '').trim(),
      points: pts,
      byTeacherId: req.user.id,
    };
    db.insert('conduct', record);
    res.json(record);
  });

  // Sửa lại một ghi nhận. Chỉ người đã ghi hoặc quản trị.
  app.put('/api/conduct/:id', requireRole('teacher', 'admin'), (req, res) => {
    const c = db.first('conduct', 'SELECT * FROM conduct WHERE id = ?', [req.params.id]);
    if (!c || st.daThuHoi(BANG, c.id)) return res.status(404).json({ error: 'Không tìm thấy ghi nhận' });
    if (!db.canAccessStudent(req.user, c.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm của cô' });
    }
    if (!st.laChuBanGhi(req.user, c.byTeacherId)) {
      return res.status(403).json({ error: 'Chỉ người đã ghi nhận hoặc quản trị mới sửa được' });
    }
    const patch = {};
    if (req.body.type !== undefined) {
      if (!['praise', 'reminder'].includes(req.body.type)) {
        return res.status(400).json({ error: 'Loại ghi nhận không hợp lệ' });
      }
      patch.type = req.body.type;
    }
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề' });
      patch.title = String(req.body.title).trim();
    }
    if (req.body.content !== undefined) patch.content = String(req.body.content || '').trim();
    if (req.body.points !== undefined) {
      const pts = Number(req.body.points);
      if (!Number.isFinite(pts)) return res.status(400).json({ error: 'Điểm phải là một số' });
      patch.points = pts;
    }
    if (req.body.date !== undefined) {
      if (!NGAY_RE.test(String(req.body.date))) return res.status(400).json({ error: 'Ngày ghi nhận không hợp lệ' });
      patch.date = String(req.body.date);
    }
    db.update('conduct', c.id, patch);
    st.ghiDaSua(BANG, c.id, req.user.id);
    db.audit(req.user.id, 'conduct-update', c.id, patch);
    res.json({ ...db.first('conduct', 'SELECT * FROM conduct WHERE id = ?', [c.id]), daSua: true });
  });

  // Thu hồi một ghi nhận: ẩn khỏi hồ sơ của em và trừ khỏi điểm thi đua,
  // KHÔNG xóa dữ liệu.
  app.delete('/api/conduct/:id', requireRole('teacher', 'admin'), (req, res) => {
    const c = db.first('conduct', 'SELECT * FROM conduct WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy ghi nhận' });
    if (!db.canAccessStudent(req.user, c.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm của cô' });
    }
    if (!st.laChuBanGhi(req.user, c.byTeacherId)) {
      return res.status(403).json({ error: 'Chỉ người đã ghi nhận hoặc quản trị mới thu hồi được' });
    }
    st.ghiThuHoi(BANG, c.id, req.user.id);
    db.audit(req.user.id, 'conduct-withdraw', c.id, { title: c.title, studentId: c.studentId });
    res.json({ ok: true });
  });
};
