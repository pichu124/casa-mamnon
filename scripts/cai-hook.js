#!/usr/bin/env node
// Bảo git dùng các móc trong thư mục `.githooks/` của kho mã.
//
// Chạy tự động sau mỗi `npm install` (mục "prepare" trong package.json), nên
// người mới clone về không phải làm gì thêm. Móc nằm trong kho mã nên ai cũng
// có cùng một bộ, khác với `.git/hooks` vốn chỉ nằm ở máy từng người.
//
// Gỡ ra khi cần:  git config --unset core.hooksPath
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');

// Không phải kho git (ví dụ cài từ tarball, hoặc chạy trong Docker) thì thôi,
// không được để việc này làm hỏng `npm install`.
if (!fs.existsSync(path.join(GOC, '.git'))) process.exit(0);

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: GOC });
  // Bảo đảm móc chạy được cả khi kho mã được sao chép qua đường mất quyền thực thi.
  for (const ten of fs.readdirSync(path.join(GOC, '.githooks'))) {
    fs.chmodSync(path.join(GOC, '.githooks', ten), 0o755);
  }
  console.log('Đã bật móc git trong .githooks/ (canh quy định commit riêng).');
} catch (err) {
  console.warn(`Không bật được móc git: ${err.message} — bỏ qua, không ảnh hưởng việc cài đặt.`);
}
