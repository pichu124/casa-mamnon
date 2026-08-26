// Phân hệ THỬ NGHIỆM của GĐ 0 — phép thử quyết định của cả dự án.
//
// Câu hỏi cần trả lời: cô giáo cầm chính điện thoại của mình, có ghi lại được
// một khoảnh khắc của bé trong dưới 20 giây không, kể cả khi lớp mất sóng?
//
// Nếu câu trả lời là không thì GĐ 2 (hành trình học tập) mất chỗ đứng và kế
// hoạch phải sửa — nên phần này làm trước, đo bằng số, không đoán.
//
// Đây KHÔNG phải bản dùng thật. Bản dùng thật của GĐ 2 sẽ có ba lớp dữ liệu,
// gắn lĩnh vực phát triển, và bước suy ngẫm cuối ngày.
const fs = require('fs');

module.exports = (app, { db }) => {
  const { requireRole } = require('../../lib/auth');
  const uploads = require('../../lib/uploads');

  // Mã do máy của cô sinh (crypto.randomUUID). Chấp nhận rộng hơn UUID một chút
  // để trình duyệt cũ dùng mã dự phòng vẫn gửi được.
  const MA_RE = /^[a-z0-9][a-z0-9-]{7,63}$/i;
  const MAX_NOTE = 500;
  const GIOI_HAN = 50;

  function nowIso() {
    return new Date().toISOString();
  }

  // LỚP DỮ LIỆU 1 — ghi chú thô của cô: chỉ chính cô đã ghi đọc được, cộng quản
  // trị khi cần (CLAUDE.md, "Ba lớp dữ liệu của một quan sát").
  //
  // Trước G0.4 điều này đúng một cách TÌNH CỜ: app 1 gắn một cô một lớp, nên
  // `db.canAccessStudent` cũng vừa đúng là "chỉ cô đã ghi". Nhóm mầm non có 2–3
  // cô cùng phụ trách thì sự trùng khớp đó biến mất — không chặn thêm ở đây là
  // nháp dở dang của cô này hiện thẳng ra cho cô kia đọc. Đó là chỗ mất lòng tin
  // của cô giáo nhanh nhất, nên chặn ở tầng dữ liệu chứ không che ở giao diện.
  function chiCuaChinhCo(user) {
    return user.role === 'teacher' ? user.id : null;
  }

  // Danh sách ghi nhanh gần đây của các bé cô đang phụ trách.
  app.get('/api/thuchup', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ ghiNhan: [], soBe: 0 });

    const marks = ids.map(() => '?').join(',');
    const byId = new Map(students.map(s => [s.id, s]));
    const cuaCo = chiCuaChinhCo(req.user);
    const rows = db.all('thuchup_ghinhanh',
      `SELECT * FROM thuchup_ghinhanh WHERE studentId IN (${marks})
         AND (? IS NULL OR byTeacherId = ?)
       ORDER BY taoLuc DESC LIMIT ?`, [...ids, cuaCo, cuaCo, GIOI_HAN]);

    res.json({
      soBe: ids.length,
      ghiNhan: rows.map(r => ({
        ...r,
        tenBe: byId.get(r.studentId)?.name || '',
        ngoaiTuyen: !!r.ngoaiTuyen,
      })),
    });
  });

  // Ghi nhận mới.
  //
  // BẤT BIẾN THEO MÃ: gửi lại đúng một mã thì KHÔNG tạo bản ghi thứ hai, mà trả
  // lại bản cũ kèm cờ trungLap. Điện thoại gửi xong nhưng mất sóng trước khi
  // nhận được trả lời sẽ gửi lại — không có chỗ này thì mỗi lần mất sóng là một
  // bản ghi nhân đôi, và cô sẽ không tin app nữa.
  app.post('/api/thuchup', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const id = String(b.id || '');
    if (!MA_RE.test(id)) {
      return res.status(400).json({ error: 'Mã ghi nhận không hợp lệ' });
    }
    if (!b.studentId || !db.canAccessStudent(req.user, b.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm lớp của bạn' });
    }

    const daCo = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [id]);
    if (daCo) return res.json({ ...daCo, ngoaiTuyen: !!daCo.ngoaiTuyen, trungLap: true });

    const note = String(b.note || '').trim().slice(0, MAX_NOTE);
    if (!note && !b.dataUrl) {
      return res.status(400).json({ error: 'Cần ít nhất một ảnh hoặc một dòng ghi chú' });
    }

    let file = null;
    if (b.dataUrl) {
      try {
        file = uploads.saveDataUrl(b.dataUrl).file;
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Ảnh không hợp lệ' });
      }
    }

    const soGiay = Number(b.giay);
    const cho = Number(b.choBaoLau);
    const record = {
      id,
      studentId: b.studentId,
      file,
      note,
      giay: Number.isFinite(soGiay) ? Math.round(soGiay * 10) / 10 : null,
      ngoaiTuyen: b.ngoaiTuyen ? 1 : 0,
      choBaoLau: Number.isFinite(cho) ? Math.round(cho * 10) / 10 : null,
      taoLuc: String(b.taoLuc || '').slice(0, 40) || nowIso(),
      nhanLuc: nowIso(),
      byTeacherId: req.user.id,
    };

    try {
      db.insert('thuchup_ghinhanh', record);
    } catch (err) {
      // Hai lần gửi cùng lúc từ hai tab: bản thứ hai đụng khoá chính. Đọc lại
      // bản đã có và trả về như trường hợp trùng, thay vì báo lỗi cho cô.
      const lai = db.first('thuchup_ghinhanh',
        'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [id]);
      if (!lai) throw err;
      if (file) uploads.remove(file);
      return res.json({ ...lai, ngoaiTuyen: !!lai.ngoaiTuyen, trungLap: true });
    }

    res.json({ ...record, ngoaiTuyen: !!record.ngoaiTuyen, trungLap: false });
  });

  // Trả về tệp ảnh. Đi qua đây thay vì để lộ thư mục ảnh, để mỗi lượt xem đều
  // được kiểm tra quyền trên chính bé trong ảnh.
  app.get('/api/thuchup/anh/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [req.params.id]);
    if (!r || !r.file) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    if (req.user.role === 'teacher' && r.byTeacherId !== req.user.id) {
      return res.status(403).json({ error: 'Đây là bản nháp của cô khác' });
    }

    const filePath = uploads.pathOf(r.file);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tệp ảnh không còn trên máy chủ' });
    }
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', uploads.mimeOf(r.file));
    res.sendFile(filePath);
  });

  // Số liệu của phép thử: bao nhiêu lần ghi, nhanh nhất/chậm nhất bao lâu.
  // Đây chính là bằng chứng để quyết định đi tiếp hay dừng lại bàn.
  app.get('/api/thuchup/ket-qua', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ soLan: 0 });

    const marks = ids.map(() => '?').join(',');
    const cuaCo = chiCuaChinhCo(req.user);
    const rows = db.all('thuchup_ghinhanh',
      `SELECT giay, ngoaiTuyen FROM thuchup_ghinhanh
       WHERE studentId IN (${marks}) AND giay IS NOT NULL
         AND (? IS NULL OR byTeacherId = ?)`, [...ids, cuaCo, cuaCo]);
    if (!rows.length) return res.json({ soLan: 0 });

    const giay = rows.map(r => Number(r.giay)).sort((a, b) => a - b);
    const giua = giay.length % 2
      ? giay[(giay.length - 1) / 2]
      : (giay[giay.length / 2 - 1] + giay[giay.length / 2]) / 2;

    res.json({
      soLan: giay.length,
      nhanhNhat: giay[0],
      chamNhat: giay[giay.length - 1],
      trungVi: Math.round(giua * 10) / 10,
      duoi20Giay: giay.filter(g => g < 20).length,
      soLanNgoaiTuyen: rows.filter(r => r.ngoaiTuyen).length,
    });
  });
};
