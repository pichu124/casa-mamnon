// Phân hệ Khảo sát: giáo viên tạo / đóng khảo sát, phụ huynh trả lời.
const db = require('../lib/db');
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

// Khảo sát đang mở luôn nằm đầu danh sách, nên trần này cắt phần đuôi lịch sử
// chứ không cắt việc đang cần làm.
const GIOI_HAN_DANH_SACH = 100;

function summary(sv, user, responses) {
  const list = responses || responsesOf(sv.id);
  return {
    id: sv.id,
    title: sv.title,
    description: sv.description,
    deadline: sv.deadline,
    status: sv.status,
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

    // Giáo viên: tổng hợp kết quả theo từng câu hỏi.
    const results = sv.questions.map(q => {
      if (q.type === 'choice') {
        const counts = (q.options || []).map(opt => ({
          option: opt,
          count: responses.filter(r => r.answers && r.answers[q.id] === opt).length,
        }));
        return { questionId: q.id, text: q.text, type: q.type, counts };
      }
      const answers = responses
        .filter(r => r.answers && String(r.answers[q.id] || '').trim())
        .map(r => ({ answer: String(r.answers[q.id]), parentName: parentName(r.userId) }));
      return { questionId: q.id, text: q.text, type: q.type, answers };
    });
    res.json({
      ...base,
      results,
      respondents: responses.map(r => parentName(r.userId)),
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

  // Giáo viên tạo khảo sát mới (gửi tới toàn trường).
  app.post('/api/surveys', requireRole('teacher', 'admin'), (req, res) => {
    const { title, description, deadline, questions } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề khảo sát' });
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
      audience: 'all',
      status: 'open',
      questions: qs,
    };
    db.insert('surveys', rec);
    res.status(201).json(summary(rec, req.user, []));
  });

  // Người tạo khảo sát đóng khảo sát.
  app.post('/api/surveys/:id/close', requireRole('teacher', 'admin'), (req, res) => {
    const sv = db.first('surveys', 'SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!sv) return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    if (sv.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ người tạo khảo sát mới được đóng khảo sát này' });
    }
    if (sv.status !== 'open') {
      return res.status(400).json({ error: 'Khảo sát đã được đóng trước đó' });
    }
    db.update('surveys', sv.id, { status: 'closed' });
    res.json({ ok: true, status: 'closed' });
  });
};
