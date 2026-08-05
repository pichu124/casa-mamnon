// Phân hệ Xe buýt: tuyến xe đưa đón và nhật ký hành trình.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

module.exports = (app) => {
  // Các tuyến xe liên quan tới người dùng.
  // Phụ huynh: tuyến có con mình (kèm childNames). Giáo viên: tuyến có học sinh lớp mình (kèm classStudentNames).
  app.get('/api/bus', (req, res) => {
    const myIds = db.studentsOf(req.user).map(s => s.id);
    const routes = db.get().busRoutes
      .filter(r => r.studentIds.some(id => myIds.includes(id)))
      .map(r => {
        const names = r.studentIds
          .filter(id => myIds.includes(id))
          .map(id => { const s = db.findStudent(id); return s ? s.name : null; })
          .filter(Boolean);
        return req.user.role === 'parent'
          ? { ...r, childNames: names }
          : { ...r, classStudentNames: names };
      });
    res.json(routes);
  });

  // Giáo viên thêm cập nhật hành trình cho tuyến có học sinh lớp mình.
  app.post('/api/bus/:id/log', requireRole('teacher'), (req, res) => {
    const route = db.get().busRoutes.find(r => r.id === req.params.id);
    if (!route) return res.status(404).json({ error: 'Không tìm thấy tuyến xe' });

    const myIds = db.studentsOf(req.user).map(s => s.id);
    if (!route.studentIds.some(id => myIds.includes(id))) {
      return res.status(403).json({ error: 'Tuyến xe này không có học sinh lớp bạn' });
    }

    const text = String((req.body || {}).text || '').trim();
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cập nhật' });

    const entry = { time: new Date().toISOString(), text };
    route.log.push(entry);
    db.save();
    res.json(entry);
  });
};
