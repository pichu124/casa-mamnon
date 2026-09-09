// THÔNG BÁO ĐẨY — đăng ký máy, khoá công khai, gửi thử (Đ137).
//
// Việc gửi thật nằm ở lib/day.js và được gọi từ lib/thong-bao-be.js mỗi khi
// có thông báo riêng cho một bé. Ở đây chỉ là phần trình duyệt nói chuyện với
// máy chủ: "đây là địa chỉ đẩy của máy tôi", "xoá địa chỉ này đi", "gửi thử
// một cái xem máy có nhận không".
const day = require('../lib/day');

module.exports = (app) => {
  app.get('/api/push/trang-thai', (req, res) => {
    res.json({ coGoiDay: day.coGoiDay(), soMay: day.soMayCua(req.user.id) });
  });

  app.get('/api/push/khoa-cong-khai', (req, res) => {
    const khoa = day.khoaCongKhai();
    if (!khoa) {
      return res.status(503).json({ error: 'Máy chủ chưa có phần gửi thông báo đẩy — nhờ nhà trường kiểm tra cài đặt.' });
    }
    res.json({ khoa });
  });

  app.post('/api/push/dang-ky', (req, res) => {
    const r = day.dangKy(req.user.id, (req.body || {}).subscription);
    if (!r.ok) return res.status(400).json({ error: r.loi });
    res.json({ ok: true, soMay: day.soMayCua(req.user.id) });
  });

  app.delete('/api/push/dang-ky', (req, res) => {
    const r = day.huyDangKy(req.user.id, (req.body || {}).endpoint || req.query.endpoint);
    if (!r.ok) return res.status(400).json({ error: r.loi });
    res.json({ ok: true, soMay: day.soMayCua(req.user.id) });
  });

  // Gửi thử tới chính máy của người bấm — để biết đường đẩy có thông không.
  app.post('/api/push/thu', async (req, res) => {
    if (!day.coGoiDay()) {
      return res.status(503).json({ error: 'Máy chủ chưa có phần gửi thông báo đẩy' });
    }
    const r = await day.guiChoNguoi(req.user.id, {
      tieuDe: 'CASA Mầm non',
      noiDung: 'Thông báo thử — máy này đã nhận được. Từ giờ có tin về con là máy sẽ báo.',
      hash: '#/settings',
    });
    res.json({ ok: true, ...r });
  });
};
