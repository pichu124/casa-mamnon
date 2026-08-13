// API cho việc bật/tắt phân hệ.
const modules = require('../lib/modules');
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

module.exports = (app) => {
  // Danh sách phân hệ mà người dùng hiện tại được dùng — giao diện dựa vào đây
  // để vẽ lưới biểu tượng và chặn đường dẫn của phân hệ đã tắt.
  app.get('/api/modules', (req, res) => {
    res.json(modules.choNguoiDung(req.user));
  });

  // Quản trị xem toàn bộ phân hệ kèm trạng thái.
  app.get('/api/admin/modules', requireRole('admin'), (req, res) => {
    res.json(modules.choQuanTri());
  });

  // Bật hoặc tắt một phân hệ.
  app.put('/api/admin/modules/:key', requireRole('admin'), (req, res) => {
    const bat = !!(req.body || {}).enabled;
    try {
      modules.datTrangThai(req.params.key, bat);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const m = modules.timTheoKey(req.params.key);
    db.audit(req.user.id, bat ? 'module-enable' : 'module-disable', req.params.key, { name: m.name });
    res.json({
      ok: true,
      key: req.params.key,
      enabled: bat,
      message: `Đã ${bat ? 'bật' : 'tắt'} phân hệ "${m.name}". ` +
        'Người dùng sẽ thấy thay đổi ngay ở lần mở màn hình chính tiếp theo.',
    });
  });
};
