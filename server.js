// SchoolConnect — Sổ liên lạc điện tử kết nối nhà trường và gia đình.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { attachUser, requireAuth } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

// Mọi API (trừ /api/auth/*) đều yêu cầu đăng nhập.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  requireAuth(req, res, next);
});

// Tự động nạp toàn bộ route trong thư mục routes/.
const routesDir = path.join(__dirname, 'routes');
for (const file of fs.readdirSync(routesDir).sort()) {
  if (!file.endsWith('.js')) continue;
  const mod = require(path.join(routesDir, file));
  if (typeof mod === 'function') mod(app);
}

app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: mọi đường dẫn không phải /api trả về index.html.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Không tìm thấy API' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bắt lỗi tập trung cho API.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

app.listen(PORT, () => {
  console.log(`SchoolConnect đang chạy tại http://localhost:${PORT}`);
});
