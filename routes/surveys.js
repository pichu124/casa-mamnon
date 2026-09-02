// Phân hệ Khảo sát: giáo viên tạo / đóng khảo sát, phụ huynh trả lời.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOI_DA_CAU_TRA_LOI = 1000;

// Khảo sát có hiển thị với người dùng này không (theo phạm vi gửi).
function visibleTo(user, sv) {
  return sv.audience === 'all' || db.classIdsOf(user).includes(sv.audience);
}

// Câu trả lời của một khảo sát, đọc từ bảng riêng.
function responsesOf(surveyId) {
  return db.all('survey_responses',
    'SELECT * FROM survey_responses WHERE surveyId = ? ORDER BY submittedAt', [surveyId]);
}

function parentName(userId) {
  const p = db.findUser(userId);
  return p ? `${p.title} ${p.name}` : 'Phụ huynh';
}

// AI ĐƯỢC ĐỌC CÂU TRẢ LỜI CỦA GIA ĐÌNH NÀO.
//
// Khảo sát toàn trường (`audience: 'all'` — mặc định, và là toàn bộ khảo sát
// trước Đ119) đi tới cả ba cơ sở. Điều đó tự nó chưa phải lỗ hổng — nhưng chỗ
// đọc kết quả thì trả về `respondents` (TÊN từng phụ huynh đã trả lời) và,
// với câu hỏi mở, cả CÂU CHỮ họ viết kèm tên. Cô nhóm Chồi 2 mở một khảo sát
// toàn trường ra là đọc được ý kiến của phụ huynh cả trường, gồm hai cơ sở cô
// không làm việc.
//
// Ý kiến phụ huynh gửi cho nhà trường thường là chuyện riêng: hoàn cảnh gia
// đình, lý do xin nghỉ, phàn nàn về một cô cụ thể. Gửi cho trường không có
// nghĩa là gửi cho ba mươi người.
//
// Luật: chỉ đọc câu trả lời của gia đình có con trong PHẠM VI của mình.
//   • cô     → nhóm cô đang phụ trách;
//   • Cấp 3  → mọi nhóm của cơ sở mình;
//   • Cấp 1  → cả trường, KHÔNG lọc (`phamViCoSo` trả null).
//
// VÌ SAO CẤP 1 KHÔNG LỌC, chứ không phải "lọc theo classIdsOf cho gọn": lọc
// theo nhóm là lọc theo bé ĐANG HỌC. Một gia đình đã cho con nghỉ vẫn còn câu
// trả lời trong bảng, và với ban giám hiệu thì câu ấy vẫn phải đọc được —
// khảo sát cuối năm mà mất phiếu của những nhà đã chuyển trường là mất đúng
// phần đáng đọc nhất.
function locTheoPhamVi(user, responses) {
  if (!user) return [];
  if (user.role === 'admin' && !db.phamViCoSo(user)) return responses;

  const nhom = db.classIdsOf(user);
  if (!nhom.length) return [];
  const duoc = new Set();
  for (const lo of chiaLo([...new Set(responses.map(r => r.userId).filter(Boolean))])) {
    const mp = lo.map(() => '?').join(',');
    const mn = nhom.map(() => '?').join(',');
    for (const r of db.all('students',
      `SELECT DISTINCT sp.parentId AS parentId FROM students s
         JOIN student_parents sp ON sp.studentId = s.id
        WHERE sp.parentId IN (${mp}) AND s.classId IN (${mn}) AND s.active = 1`,
      [...lo, ...nhom])) {
      duoc.add(r.parentId);
    }
  }
  return responses.filter(r => duoc.has(r.userId));
}

// SQLite chặn ở 999 tham số một câu; chia lô để một khảo sát 600 phiếu không
// làm nổ câu truy vấn. Chép tại chỗ chứ không gọi sang `lib/db.js` — hàm ở đó
// không xuất ra, và đây là bốn dòng.
function chiaLo(ds, coLo = 400) {
  const ra = [];
  for (let i = 0; i < ds.length; i += coLo) ra.push(ds.slice(i, i + coLo));
  return ra;
}

// Khảo sát đang mở luôn nằm đầu danh sách, nên trần này cắt phần đuôi lịch sử
// chứ không cắt việc đang cần làm.
const GIOI_HAN_DANH_SACH = 100;

// Tên nhóm của một khảo sát theo nhóm — để màn hình ghi rõ "khảo sát của
// nhóm nào" thay vì bắt người đọc đoán. `findClass` chứ không phải
// `db.classes()`: nhóm đã đóng sau chuyển năm vẫn phải hiện được tên trên
// khảo sát cũ của nó.
function tenNhomCua(audience) {
  if (!audience || audience === 'all') return '';
  const c = db.findClass(audience);
  return c ? c.name : '';
}

function summary(sv, user, responses) {
  const list = responses || responsesOf(sv.id);
  return {
    id: sv.id,
    title: sv.title,
    description: sv.description,
    deadline: sv.deadline,
    status: sv.status,
    audience: sv.audience,
    tenNhom: tenNhomCua(sv.audience),
    questionCount: (sv.questions || []).length,
    responseCount: list.length,
    answered: list.some(r => r.userId === user.id),
  };
}

module.exports = (app) => {
  // Danh sách khảo sát người dùng được xem (không kèm chi tiết phản hồi).
  app.get('/api/surveys', (req, res) => {
    // ĐẾM BẰNG HAI CÂU TỔNG HỢP, KHÔNG NẠP TỪNG PHIẾU CỦA TỪNG KHẢO SÁT.
    //
    // `summary()` chỉ cần hai con số: tổng số phiếu, và người này đã trả lời
    // chưa. Nhưng nó gọi `responsesOf(sv.id)` cho TỪNG khảo sát, mà hàm đó nạp
    // TOÀN BỘ phiếu — cả nội dung câu trả lời — chỉ để lấy `.length` và một
    // phép `.some()`. Với 3 cơ sở, mỗi năm vài chục khảo sát, mỗi khảo sát vài
    // trăm phiếu, thì một lần gia đình mở màn Khảo sát là nạp hàng chục nghìn
    // dòng vào bộ nhớ rồi vứt đi gần hết.
    //
    // Hai câu dưới chạy MỘT lần cho cả danh sách và chỉ mang về đúng hai con số.
    const dem = new Map(db.all('survey_responses',
      'SELECT surveyId, COUNT(*) AS n FROM survey_responses GROUP BY surveyId')
      .map(r => [r.surveyId, r.n]));
    const daTraLoi = new Set(db.all('survey_responses',
      'SELECT surveyId FROM survey_responses WHERE userId = ?', [req.user.id])
      .map(r => r.surveyId));

    // Đang mở lên trước, rồi mới nhất trước.
    //
    // VÀ CÓ TRẦN: bảng này chỉ dài thêm theo mỗi năm học, không bao giờ ngắn
    // đi. Không có trần thì sang năm thứ ba màn hình gia đình phải tải về cả
    // lịch sử khảo sát của trường.
    const list = db.all('surveys',
      `SELECT * FROM surveys ORDER BY (status = 'open') DESC, createdAt DESC LIMIT ?`,
      [GIOI_HAN_DANH_SACH])
      .filter(sv => visibleTo(req.user, sv))
      .map(sv => ({
        id: sv.id,
        title: sv.title,
        description: sv.description,
        deadline: sv.deadline,
        status: sv.status,
        audience: sv.audience,
        tenNhom: tenNhomCua(sv.audience),
        questionCount: (sv.questions || []).length,
        responseCount: dem.get(sv.id) || 0,
        answered: daTraLoi.has(sv.id),
      }));
    res.json(list);
  });

  // Chi tiết một khảo sát.
  // Phụ huynh: câu hỏi + câu trả lời của mình (nếu có).
  // Giáo viên: câu hỏi + kết quả tổng hợp + danh sách phụ huynh đã trả lời.
  app.get('/api/surveys/:id', (req, res) => {
    const sv = db.first('surveys', 'SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!sv || !visibleTo(req.user, sv)) {
      return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    }
    const responses = responsesOf(sv.id);
    const base = { ...summary(sv, req.user, responses), createdAt: sv.createdAt, questions: sv.questions };

    if (req.user.role === 'parent') {
      const mine = responses.find(r => r.userId === req.user.id) || null;
      return res.json({
        ...base,
        myResponse: mine ? { submittedAt: mine.submittedAt, answers: mine.answers } : null,
      });
    }

    // Giáo viên và văn phòng: tổng hợp kết quả — nhưng CHỈ của gia đình trong
    // phạm vi mình. Xem khối chú thích ở `locTheoPhamVi`.
    const cuaToi = locTheoPhamVi(req.user, responses);
    const results = sv.questions.map(q => {
      if (q.type === 'choice') {
        const counts = (q.options || []).map(opt => ({
          option: opt,
          count: cuaToi.filter(r => r.answers && r.answers[q.id] === opt).length,
        }));
        return { questionId: q.id, text: q.text, type: q.type, counts };
      }
      const answers = cuaToi
        .filter(r => r.answers && String(r.answers[q.id] || '').trim())
        .map(r => ({ answer: String(r.answers[q.id]), parentName: parentName(r.userId) }));
      return { questionId: q.id, text: q.text, type: q.type, answers };
    });
    res.json({
      ...base,
      results,
      respondents: cuaToi.map(r => parentName(r.userId)),
      // Số phiếu TRONG PHẠM VI mình, đứng bên cạnh `responseCount` của cả
      // trường. Thiếu con số này thì cô nhìn "12 phiếu" ở đầu màn rồi đếm được
      // 4 tên ở dưới, và tưởng app mất phiếu.
      soPhieuTrongPhamVi: cuaToi.length,
      createdByMe: sv.createdBy === req.user.id,
    });
  });

  // Phụ huynh gửi câu trả lời (mỗi phụ huynh chỉ trả lời một lần).
  app.post('/api/surveys/:id/respond', requireRole('parent'), (req, res) => {
    const sv = db.first('surveys', 'SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!sv || !visibleTo(req.user, sv)) {
      return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    }
    if (sv.status !== 'open') {
      return res.status(400).json({ error: 'Khảo sát đã kết thúc, không thể gửi câu trả lời' });
    }
    const daTraLoi = db.count(
      'SELECT COUNT(*) FROM survey_responses WHERE surveyId = ? AND userId = ?', [sv.id, req.user.id]);
    if (daTraLoi) {
      return res.status(400).json({ error: 'Bạn đã trả lời khảo sát này rồi' });
    }
    const raw = (req.body && req.body.answers) || {};
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return res.status(400).json({ error: 'Câu trả lời không hợp lệ' });
    }
    const answers = {};
    for (const q of sv.questions) {
      const val = raw[q.id];
      if (val === undefined || val === null || String(val).trim() === '') continue;
      if (q.type === 'choice' && !(q.options || []).includes(String(val))) {
        return res.status(400).json({ error: 'Lựa chọn không hợp lệ' });
      }
      // Cắt độ dài: đây là đường mà PHỤ HUYNH gọi được. Nhẹ hơn Xin nghỉ và Dặn
      // thuốc vì mỗi người chỉ trả lời được một lần, nhưng vẫn phải chặn.
      answers[q.id] = String(val).trim().slice(0, TOI_DA_CAU_TRA_LOI);
    }
    for (const q of sv.questions) {
      if (q.type === 'choice' && !answers[q.id]) {
        return res.status(400).json({ error: 'Vui lòng trả lời đầy đủ các câu trắc nghiệm' });
      }
    }
    const firstChild = db.studentsOf(req.user)[0];
    db.insert('survey_responses', {
      id: db.nextId('sr'),
      surveyId: sv.id,
      userId: req.user.id,
      studentId: firstChild ? firstChild.id : null,
      submittedAt: new Date().toISOString(),
      answers,
    });
    res.status(201).json({ ok: true });
  });

  // Cô hoặc văn phòng tạo khảo sát mới — gửi toàn trường hoặc riêng một nhóm.
  app.post('/api/surveys', requireRole('teacher', 'admin'), (req, res) => {
    const { title, description, deadline, questions, audience } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề khảo sát' });
    }

    // PHẠM VI GỬI — cùng luật, gần như cùng chữ với POST /api/notifications:
    // 'all' là toàn trường, 'class' là một nhóm (cô chỉ gửi được nhóm mình,
    // văn phòng gửi được nhóm trong cơ sở của mình qua canAccessClass).
    // App đời cũ KHÔNG gửi trường này thì giữ đúng nghĩa cũ: toàn trường.
    // Tầng đọc không phải sửa gì — `visibleTo` và bộ đếm huy hiệu đã lọc theo
    // cột `audience` từ trước, chỉ có đường tạo là chưa bao giờ ghi gì khác
    // 'all' vào đó.
    const phamVi = audience === undefined ? 'all' : audience;
    if (phamVi !== 'all' && phamVi !== 'class') {
      return res.status(400).json({ error: 'Phạm vi gửi không hợp lệ' });
    }
    let nhomNhan = '';
    if (phamVi === 'class') {
      if (req.user.role === 'admin') {
        nhomNhan = String((req.body || {}).classId || '');
        if (!nhomNhan || !db.findClass(nhomNhan)) {
          return res.status(400).json({ error: 'Vui lòng chọn nhóm nhận khảo sát' });
        }
        if (!db.canAccessClass(req.user, nhomNhan)) {
          return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
        }
      } else {
        const nhomCuaCo = nl.nhomCuaCo(req.user.id);
        nhomNhan = nl.nhomDangThaoTac(req.user, (req.body || {}).classId);
        if (!nhomNhan) {
          return res.status(400).json({
            error: nhomCuaCo.length > 1
              ? 'Cô đang phụ trách nhiều nhóm — vui lòng chọn nhóm nhận khảo sát'
              : 'Tài khoản chưa gắn với nhóm lớp nào',
          });
        }
      }
    }
    if (!DATE_RE.test(String(deadline || ''))) {
      return res.status(400).json({ error: 'Hạn trả lời không hợp lệ' });
    }
    if (!Array.isArray(questions) || questions.length < 1) {
      return res.status(400).json({ error: 'Khảo sát cần ít nhất 1 câu hỏi' });
    }
    const qs = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] || {};
      const text = String(q.text || '').trim();
      if (!text) return res.status(400).json({ error: `Vui lòng nhập nội dung câu hỏi ${i + 1}` });
      if (q.type !== 'choice' && q.type !== 'text') {
        return res.status(400).json({ error: `Loại câu hỏi ${i + 1} không hợp lệ` });
      }
      const item = { id: `q${i + 1}`, text, type: q.type };
      if (q.type === 'choice') {
        const options = (Array.isArray(q.options) ? q.options : String(q.options || '').split(','))
          .map(o => String(o).trim())
          .filter(Boolean);
        if (options.length < 2) {
          return res.status(400).json({ error: `Câu hỏi ${i + 1}: câu trắc nghiệm cần ít nhất 2 lựa chọn` });
        }
        item.options = options;
      }
      qs.push(item);
    }
    const rec = {
      id: db.nextId('sv'),
      title: String(title).trim(),
      description: String(description || '').trim(),
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      deadline,
      audience: phamVi === 'class' ? nhomNhan : 'all',
      status: 'open',
      questions: qs,
    };
    db.insert('surveys', rec);
    db.audit(req.user.id, 'survey-create', rec.id, { audience: rec.audience });
    res.status(201).json(summary(rec, req.user, []));
  });

  // Người tạo hoặc quản trị đóng khảo sát.
  //
  // Bản cũ chỉ cho ĐÚNG người tạo — cô nghỉ việc thì khảo sát của cô mở vĩnh
  // viễn (không có hạn tự đóng), quản trị cũng bó tay. Cùng luật với sửa/thu
  // hồi thông báo: người tạo, hoặc quản trị.
  app.post('/api/surveys/:id/close', requireRole('teacher', 'admin'), (req, res) => {
    const sv = db.first('surveys', 'SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!sv) return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    if (sv.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ người tạo khảo sát hoặc quản trị mới đóng được khảo sát này' });
    }
    if (sv.status !== 'open') {
      return res.status(400).json({ error: 'Khảo sát đã được đóng trước đó' });
    }
    db.update('surveys', sv.id, { status: 'closed' });
    res.json({ ok: true, status: 'closed' });
  });
};
