// Phân hệ Khảo sát: giáo viên tạo / đóng khảo sát, phụ huynh trả lời.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Các lớp liên quan tới người dùng (giáo viên: lớp chủ nhiệm; phụ huynh: lớp của các con).
function classIdsOf(user) {
  if (user.role === 'teacher') return [user.classId];
  return [...new Set(db.studentsOf(user).map(s => s.classId))];
}

// Khảo sát có hiển thị với người dùng này không (theo audience).
function visibleTo(user, sv) {
  return sv.audience === 'all' || classIdsOf(user).includes(sv.audience);
}

function parentName(userId) {
  const p = db.findUser(userId);
  return p ? `${p.title} ${p.name}` : 'Phụ huynh';
}

function summary(sv, user) {
  return {
    id: sv.id,
    title: sv.title,
    description: sv.description,
    deadline: sv.deadline,
    status: sv.status,
    questionCount: sv.questions.length,
    responseCount: sv.responses.length,
    answered: sv.responses.some(r => r.userId === user.id),
  };
}

module.exports = (app) => {
  // Danh sách khảo sát người dùng được xem (không kèm chi tiết phản hồi).
  app.get('/api/surveys', (req, res) => {
    const list = db.get().surveys
      .filter(sv => visibleTo(req.user, sv))
      .slice()
      .sort((a, b) => {
        const pa = a.status === 'open' ? 0 : 1;
        const pb = b.status === 'open' ? 0 : 1;
        if (pa !== pb) return pa - pb;               // đang mở lên trước
        return String(b.createdAt).localeCompare(String(a.createdAt)); // rồi mới nhất
      })
      .map(sv => summary(sv, req.user));
    res.json(list);
  });

  // Chi tiết một khảo sát.
  // Phụ huynh: câu hỏi + câu trả lời của mình (nếu có).
  // Giáo viên: câu hỏi + kết quả tổng hợp + danh sách phụ huynh đã trả lời.
  app.get('/api/surveys/:id', (req, res) => {
    const sv = db.get().surveys.find(x => x.id === req.params.id);
    if (!sv || !visibleTo(req.user, sv)) {
      return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    }
    const base = { ...summary(sv, req.user), createdAt: sv.createdAt, questions: sv.questions };

    if (req.user.role === 'parent') {
      const mine = sv.responses.find(r => r.userId === req.user.id) || null;
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
          count: sv.responses.filter(r => r.answers && r.answers[q.id] === opt).length,
        }));
        return { questionId: q.id, text: q.text, type: q.type, counts };
      }
      const answers = sv.responses
        .filter(r => r.answers && String(r.answers[q.id] || '').trim())
        .map(r => ({ answer: String(r.answers[q.id]), parentName: parentName(r.userId) }));
      return { questionId: q.id, text: q.text, type: q.type, answers };
    });
    res.json({
      ...base,
      results,
      respondents: sv.responses.map(r => parentName(r.userId)),
      createdByMe: sv.createdBy === req.user.id,
    });
  });

  // Phụ huynh gửi câu trả lời (mỗi phụ huynh chỉ trả lời một lần).
  app.post('/api/surveys/:id/respond', requireRole('parent'), (req, res) => {
    const sv = db.get().surveys.find(x => x.id === req.params.id);
    if (!sv || !visibleTo(req.user, sv)) {
      return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    }
    if (sv.status !== 'open') {
      return res.status(400).json({ error: 'Khảo sát đã kết thúc, không thể gửi câu trả lời' });
    }
    if (sv.responses.some(r => r.userId === req.user.id)) {
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
      answers[q.id] = String(val).trim();
    }
    for (const q of sv.questions) {
      if (q.type === 'choice' && !answers[q.id]) {
        return res.status(400).json({ error: 'Vui lòng trả lời đầy đủ các câu trắc nghiệm' });
      }
    }
    const firstChild = db.studentsOf(req.user)[0];
    sv.responses.push({
      userId: req.user.id,
      studentId: firstChild ? firstChild.id : null,
      submittedAt: new Date().toISOString(),
      answers,
    });
    db.save();
    res.status(201).json({ ok: true });
  });

  // Giáo viên tạo khảo sát mới (gửi tới toàn trường).
  app.post('/api/surveys', requireRole('teacher'), (req, res) => {
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
      responses: [],
    };
    db.get().surveys.push(rec);
    db.save();
    res.status(201).json(summary(rec, req.user));
  });

  // Người tạo khảo sát đóng khảo sát.
  app.post('/api/surveys/:id/close', requireRole('teacher'), (req, res) => {
    const sv = db.get().surveys.find(x => x.id === req.params.id);
    if (!sv) return res.status(404).json({ error: 'Không tìm thấy khảo sát' });
    if (sv.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ người tạo khảo sát mới được đóng khảo sát này' });
    }
    if (sv.status !== 'open') {
      return res.status(400).json({ error: 'Khảo sát đã được đóng trước đó' });
    }
    sv.status = 'closed';
    db.save();
    res.json({ ok: true, status: sv.status });
  });
};
