// Phân hệ Nhận xét hằng ngày: giáo viên gửi nhận xét, phụ huynh theo dõi.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

const BANG = 'remarks';

const RATINGS = ['great', 'good', 'needs_effort'];
// Mức điền vào khi màn hình KHÔNG gửi gì — xem chú thích dài ở đường POST.
// Chọn mức GIỮA vì đó đúng là mức bản giao diện cũ đã dùng làm phương án lùi
// khi bản ghi không có mức, nên không bản ghi nào đổi nghĩa.
const MUC_MAC_DINH = 'good';

function todayStr() {
  return ngay.homNay();
}

module.exports = (app) => {
  // Nhận xét của một học sinh, mới nhất trước.
  // Phụ huynh xem xong sẽ được đánh dấu đã xem (parentSeen=true) nhưng
  // response giữ giá trị CŨ để giao diện biết nhận xét nào là mới.
  app.get('/api/remarks', (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    const list = st.ganDauDaSua(BANG, db.all('remarks',
      `SELECT * FROM remarks WHERE studentId = ? AND ${st.dieuKienConHien(BANG, 'id')}
       ORDER BY date DESC, id DESC`, [studentId]));

    // Giữ giá trị parentSeen CŨ trong dữ liệu trả về để giao diện biết nhận xét
    // nào là mới, rồi mới đánh dấu đã xem.
    const out = list.map(r => {
      const t = r.teacherId ? db.findUser(r.teacherId) : null;
      return {
        ...r,
        teacherName: t ? `${t.title} ${t.name}` : '',
        coTheSua: st.laChuBanGhi(req.user, r.teacherId),
      };
    });

    if (req.user.role === 'parent') {
      db.run('UPDATE remarks SET parentSeen = 1 WHERE studentId = ? AND parentSeen = 0', [studentId]);
    }
    res.json(out);
  });

  // Giáo viên: nhận xét gần đây của cả lớp chủ nhiệm.
  app.get('/api/remarks/class', requireRole('teacher', 'admin'), (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const list = st.ganDauDaSua(BANG, db.all('remarks',
      `SELECT * FROM remarks WHERE studentId IN (${ids.map(() => '?').join(',')})
         AND ${st.dieuKienConHien(BANG, 'id')}
       ORDER BY date DESC, id DESC LIMIT 30`, ids))
      .map(r => {
        const s = db.findStudent(r.studentId);
        return {
          ...r,
          studentName: s ? s.name : '',
          studentAvatar: s ? s.avatar : null,
          coTheSua: st.laChuBanGhi(req.user, r.teacherId),
        };
      });
    res.json(list);
  });

  // Giáo viên viết nhận xét mới cho học sinh trong lớp.
  app.post('/api/remarks', requireRole('teacher', 'admin'), (req, res) => {
    const { studentId, date, content, rating, skills } = req.body || {};
    if (!studentId) return res.status(400).json({ error: 'Vui lòng chọn bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    const text = String(content || '').trim();
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung nhận xét' });
    // MỨC ĐÁNH GIÁ THÔI LÀ Ô BẮT BUỘC (Đ203, việc 47).
    //
    // Bộ ba bậc cũ đã gỡ khỏi mọi màn hình: QUY TẮC 4 của CLAUDE.md cấm đặt
    // trẻ trên dưới nhau ở bất kỳ chỗ nào cô hoặc phụ huynh nhìn thấy. Màn
    // hình nay không gửi `rating` nữa.
    //
    // VÌ SAO KHÔNG XOÁ LUÔN CỘT: nhận xét cô đã viết từ trước đều mang một mức,
    // và bỏ một tính năng là ngưng dùng nó chứ không xoá dữ liệu của nó
    // (Nguyên tắc số 1). Cột ở lại làm chứng từ, không màn nào dựng nó thành
    // một cái bậc nữa.
    //
    // NỚI RA CHỨ KHÔNG SIẾT LẠI: điện thoại còn giữ bản app cũ VẪN gửi `rating`
    // và vẫn ghi được y như hôm qua; chỉ có lượt gửi THIẾU nó là thôi bị từ
    // chối. Không một chỗ gọi nào đang chạy bị hỏng vì dòng này.
    const mucCu = rating === undefined || rating === null || rating === ''
      ? MUC_MAC_DINH
      : rating;
    if (!RATINGS.includes(mucCu)) return res.status(400).json({ error: 'Mức đánh giá không hợp lệ' });

    let skillList = [];
    if (Array.isArray(skills)) skillList = skills;
    else if (typeof skills === 'string') skillList = skills.split(',');
    skillList = skillList.map(s => String(s).trim()).filter(Boolean);

    const rec = {
      id: db.nextId('rm'),
      studentId,
      teacherId: req.user.id,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? date : todayStr(),
      content: text,
      rating: mucCu,
      skills: skillList,
      parentSeen: false,
    };
    db.insert('remarks', rec);
    res.json(rec);
  });

  // Sửa lại một nhận xét. Chỉ cô đã viết hoặc quản trị.
  app.put('/api/remarks/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('remarks', 'SELECT * FROM remarks WHERE id = ?', [req.params.id]);
    if (!r || st.daThuHoi(BANG, r.id)) return res.status(404).json({ error: 'Không tìm thấy nhận xét' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    if (!st.laChuBanGhi(req.user, r.teacherId)) {
      return res.status(403).json({ error: 'Chỉ cô đã viết hoặc quản trị mới sửa được nhận xét này' });
    }
    const patch = {};
    if (req.body.content !== undefined) {
      const text = String(req.body.content).trim();
      if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung nhận xét' });
      patch.content = text;
    }
    if (req.body.rating !== undefined) {
      if (!RATINGS.includes(req.body.rating)) return res.status(400).json({ error: 'Mức đánh giá không hợp lệ' });
      patch.rating = req.body.rating;
    }
    if (req.body.date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.date))) {
        return res.status(400).json({ error: 'Ngày nhận xét không hợp lệ' });
      }
      patch.date = String(req.body.date);
    }
    if (req.body.skills !== undefined) {
      const raw = Array.isArray(req.body.skills)
        ? req.body.skills
        : String(req.body.skills || '').split(',');
      patch.skills = raw.map(x => String(x).trim()).filter(Boolean);
    }
    // Sửa xong thì phụ huynh phải được báo lại: nội dung đã khác đi.
    patch.parentSeen = false;
    db.update('remarks', r.id, patch);
    st.ghiDaSua(BANG, r.id, req.user.id);
    db.audit(req.user.id, 'remark-update', r.id, { studentId: r.studentId });
    res.json({ ...db.first('remarks', 'SELECT * FROM remarks WHERE id = ?', [r.id]), daSua: true });
  });

  // Thu hồi một nhận xét: ẩn khỏi sổ liên lạc, KHÔNG xóa dữ liệu.
  app.delete('/api/remarks/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('remarks', 'SELECT * FROM remarks WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy nhận xét' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    if (!st.laChuBanGhi(req.user, r.teacherId)) {
      return res.status(403).json({ error: 'Chỉ cô đã viết hoặc quản trị mới thu hồi được nhận xét này' });
    }
    st.ghiThuHoi(BANG, r.id, req.user.id);
    db.audit(req.user.id, 'remark-withdraw', r.id, { studentId: r.studentId });
    res.json({ ok: true });
  });
};
