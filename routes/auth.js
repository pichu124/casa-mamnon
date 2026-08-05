// Đăng nhập / đăng xuất / thông tin phiên hiện tại.
const db = require('../lib/db');
const { createSession, destroySession } = require('../lib/auth');

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// Gói dữ liệu trả về sau đăng nhập: người dùng + học sinh liên quan + lớp + trường.
function mePayload(user) {
  const data = db.get();
  const students = db.studentsOf(user).map(s => {
    const cls = db.findClass(s.classId);
    const teacher = cls ? db.findUser(cls.teacherId) : null;
    return {
      ...s,
      className: cls ? cls.name : '',
      teacherName: teacher ? `${teacher.title} ${teacher.name}` : '',
      teacherId: teacher ? teacher.id : null,
    };
  });
  return {
    user: publicUser(user),
    students,
    classes: data.classes,
    school: data.school,
  };
}

module.exports = (app) => {
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const user = db.get().users.find(u => u.username === String(username || '').trim().toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = createSession(user.id);
    res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`);
    res.json(mePayload(user));
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) destroySession(req.sessionToken);
    res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    res.json(mePayload(req.user));
  });
};

module.exports.mePayload = mePayload;
module.exports.publicUser = publicUser;
