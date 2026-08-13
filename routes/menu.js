// Phân hệ Thực đơn bán trú: xem thực đơn tuần này / tuần sau (cả phụ huynh và giáo viên).
const db = require('../lib/db');

// YYYY-MM-DD theo giờ máy chủ.
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = (app) => {
  // Thực đơn theo tuần: ?week=0 (tuần này, mặc định) | 1 (tuần sau).
  app.get('/api/menu', (req, res) => {
    const week = req.query.week === '1' ? 1 : 0;
    const now = new Date();
    // Thứ Hai của tuần cần xem, tính theo giờ máy chủ (T7/CN vẫn thuộc tuần bắt đầu từ T2 trước đó).
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + week * 7);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const from = fmt(monday), to = fmt(friday);
    const menus = db.all('menus',
      'SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date', [from, to]);
    res.json({ week, from, to, menus });
  });
};
