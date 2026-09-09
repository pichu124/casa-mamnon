// Phân hệ Lịch sinh hoạt: trả lịch một ngày của nhóm mà người dùng có quyền xem,
// và cho VĂN PHÒNG (quản trị) soạn lịch cho từng nhóm.
// Phụ huynh: lớp của một trong các con. Giáo viên: nhóm mình phụ trách — XEM.
//
// VĂN PHÒNG SOẠN, CÔ XEM (Đ133). Nhà trường chốt 07/09: "Lịch sinh hoạt do
// văn phòng làm → khoá lại đối với phân quyền giáo viên; bổ sung nút thêm dòng
// vì mỗi lớp có thể một khung giờ khác nhau (lớp Paris cần 13 dòng); tạo thêm
// chức năng copy — một lịch này áp dụng cho những lớp nào".
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
const tb = require('../lib/thong-bao');

// Giới hạn kích thước để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
// 20 mốc, không phải 12: lớp Paris của trường ghi đủ một ngày cần 13 dòng
// (07:30 tới 17:30), và trần 12 là chỗ văn phòng gõ tới dòng thứ 13 thì bị
// từ chối mà không hiểu vì sao.
const TOI_DA_TIET = 20;      // số mốc sinh hoạt tối đa trong một ngày
const TOI_DA_NHOM_CHEP = 50; // số nhóm nhận lịch trong một lần "áp dụng cho nhóm khác"
const TOI_DA_MON = 60;       // độ dài tên môn
const TOI_DA_GIO = 40;       // độ dài khung giờ "07:30 – 08:05"

// Chuẩn hóa danh sách khung giờ trong ngày. Trả về null nếu không hợp lệ.
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

// Chuẩn hóa lịch các thứ trong tuần theo đúng số mốc. Trả về null nếu không hợp lệ.
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
    if (!classId) return res.status(400).json({ error: 'Thiếu mã nhóm (classId)' });

    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });

    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem lịch sinh hoạt của nhóm này' });
    }

    const tt = db.first('timetable', 'SELECT * FROM timetable WHERE classId = ?', [classId]);
    if (!tt) return res.status(404).json({ error: 'Nhóm chưa có lịch sinh hoạt' });

    res.json({
      ...tt,
      className: cls.name,
      ...nl.tomTat(cls.id),
    });
  });

  // Văn phòng soạn lịch cho một nhóm trong phạm vi của mình. Ghi đè cả bản ghi
  // (mỗi lớp một dòng) nên tạo mới và sửa dùng chung một đường.
  //
  // Vẫn nhận vai `teacher` ở tầng vai để trả lời bằng CÂU CỦA TRƯỜNG, không
  // phải "Không có quyền" chung chung: cô bấm vào bản app cũ còn trong bộ nhớ
  // đệm phải đọc được vì sao và phải nhắn ai.
  app.put('/api/timetable/:classId', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.params.classId || '').trim();
    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Lịch sinh hoạt do văn phòng cơ sở soạn cho từng nhóm. Cô xem được nhưng không sửa — cần đổi thì nhắn văn phòng nhé.',
      });
    }
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc cơ sở của tài khoản' });
    }

    const periodTimes = lamSachKhungGio((req.body || {}).periodTimes);
    if (!periodTimes) {
      return res.status(400).json({ error: 'Khung giờ trong ngày chưa hợp lệ. Vui lòng kiểm tra lại.' });
    }
    const days = lamSachCacNgay((req.body || {}).days, periodTimes.length);
    if (!days) {
      return res.status(400).json({ error: 'Lịch các thứ trong tuần chưa hợp lệ. Vui lòng kiểm tra lại.' });
    }

    db.upsert('timetable', { classId, periodTimes, days }, ['classId']);
    db.audit(req.user.id, 'timetable-update', classId, { className: cls.name });
    // Báo gia đình của nhóm (Đ137) — một lần mỗi ngày dù văn phòng sửa nhiều lần.
    tb.guiChoNhom([classId], {
      title: `Lịch sinh hoạt nhóm ${cls.name} vừa được cập nhật`,
      body: 'Văn phòng vừa sửa lịch một ngày ở nhóm. Mở Lịch sinh hoạt để xem.',
      category: 'Khác', createdBy: req.user.id,
    });

    res.json({
      classId, periodTimes, days,
      className: cls.name,
      ...nl.tomTat(cls.id),
    });
  });

  // ÁP DỤNG LỊCH CỦA MỘT NHÓM CHO NHỮNG NHÓM KHÁC (Đ133).
  //
  // Ba nhóm Mầm cùng một khung giờ là chuyện thường; soạn một lần rồi áp cho
  // hai nhóm kia nhanh hơn gõ ba lần. GHI ĐÈ trọn lịch của nhóm đích — đó là
  // ý của nút này — nên màn hình phải hỏi lại trước khi gọi, và máy chủ ghi
  // nhật ký từng nhóm bị đè.
  //
  // Mọi nhóm đích phải nằm trong phạm vi của tài khoản: văn phòng cơ sở 1
  // không áp lịch sang cơ sở 2 dù có gõ đúng mã.
  app.post('/api/timetable/:classId/chep', requireRole('admin'), (req, res) => {
    const classId = String(req.params.classId || '').trim();
    const nguon = db.findClass(classId);
    if (!nguon) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm này không thuộc cơ sở của tài khoản' });
    }
    const tt = db.first('timetable', 'SELECT * FROM timetable WHERE classId = ?', [classId]);
    if (!tt) return res.status(404).json({ error: 'Nhóm này chưa có lịch sinh hoạt để áp dụng' });

    const den = Array.isArray((req.body || {}).denNhom) ? req.body.denNhom.map(x => String(x || '').trim()).filter(Boolean) : [];
    const dich = [...new Set(den)].filter(id => id !== classId);
    if (!dich.length) return res.status(400).json({ error: 'Chưa chọn nhóm nào để áp dụng lịch' });
    if (dich.length > TOI_DA_NHOM_CHEP) {
      return res.status(400).json({ error: `Mỗi lần áp dụng tối đa ${TOI_DA_NHOM_CHEP} nhóm` });
    }
    // Soát TOÀN BỘ trước khi ghi nhóm nào: lỗi ở nhóm thứ ba mà hai nhóm đầu
    // đã bị đè thì màn hình báo lỗi trong khi lịch đã đổi một nửa.
    const cacNhom = [];
    for (const id of dich) {
      const c = db.findClass(id);
      if (!c) return res.status(404).json({ error: `Không tìm thấy nhóm ${id}` });
      if (!db.canAccessClass(req.user, id)) {
        return res.status(403).json({ error: `Nhóm ${c.name} không thuộc cơ sở của tài khoản` });
      }
      cacNhom.push(c);
    }
    db.tx(() => {
      for (const c of cacNhom) {
        db.upsert('timetable', { classId: c.id, periodTimes: tt.periodTimes, days: tt.days }, ['classId']);
        db.audit(req.user.id, 'timetable-chep', c.id, { tuNhom: nguon.name, className: c.name });
      }
    });
    res.json({
      ok: true,
      tuNhom: { id: nguon.id, name: nguon.name },
      daChep: cacNhom.map(c => ({ id: c.id, name: c.name })),
    });
  });
};
