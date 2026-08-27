// Phân hệ Xe buýt: tuyến xe đưa đón và nhật ký hành trình.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Danh sách mã học sinh trên một tuyến.
function studentIdsOfRoute(routeId) {
  return db.all('bus_students', 'SELECT studentId FROM bus_students WHERE routeId = ?', [routeId])
    .map(r => r.studentId);
}

module.exports = (app) => {
  // Các tuyến xe liên quan tới người dùng.
  // Phụ huynh: tuyến có con mình (kèm childNames).
  // Giáo viên: tuyến có học sinh lớp mình (kèm classStudentNames).
  app.get('/api/bus', (req, res) => {
    const myIds = db.studentIdsOf(req.user);
    if (!myIds.length) return res.json([]);

    const marks = myIds.map(() => '?').join(',');
    const routes = db.all('bus_routes',
      `SELECT DISTINCT r.* FROM bus_routes r
       JOIN bus_students bs ON bs.routeId = r.id
       WHERE bs.studentId IN (${marks})
       ORDER BY r.name`, myIds);

    const out = routes.map(r => {
      const names = db.all('students',
        `SELECT s.name FROM students s
         JOIN bus_students bs ON bs.studentId = s.id
         WHERE bs.routeId = ? AND s.id IN (${marks})
         ORDER BY s.name`, [r.id, ...myIds]).map(s => s.name);
      const withIds = { ...r, studentIds: studentIdsOfRoute(r.id) };
      return req.user.role === 'parent'
        ? { ...withIds, childNames: names }
        : { ...withIds, classStudentNames: names };
    });
    res.json(out);
  });

  // Giáo viên thêm cập nhật hành trình cho tuyến có học sinh lớp mình.
  app.post('/api/bus/:id/log', requireRole('teacher', 'admin'), (req, res) => {
    const route = db.first('bus_routes', 'SELECT * FROM bus_routes WHERE id = ?', [req.params.id]);
    if (!route) return res.status(404).json({ error: 'Không tìm thấy tuyến xe' });

    const myIds = db.studentIdsOf(req.user);
    const onRoute = myIds.length && db.count(
      `SELECT COUNT(*) FROM bus_students WHERE routeId = ? AND studentId IN (${myIds.map(() => '?').join(',')})`,
      [route.id, ...myIds]);
    if (!onRoute) {
      return res.status(403).json({ error: 'Tuyến xe này không có bé nào trong nhóm cô phụ trách' });
    }

    const text = String((req.body || {}).text || '').trim();
    if (!text) return res.status(400).json({ error: 'Vui lòng nhập nội dung cập nhật' });

    const entry = { time: new Date().toISOString(), text };
    const log = Array.isArray(route.log) ? route.log : [];
    log.push(entry);
    db.update('bus_routes', route.id, { log });
    res.json(entry);
  });
};
