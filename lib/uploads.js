// Lưu trữ ảnh do giáo viên tải lên.
//
// Ảnh nằm trong DATA_DIR/uploads nên khi triển khai chỉ cần gắn một ổ đĩa vào
// DATA_DIR là cả dữ liệu lẫn ảnh đều được giữ lại qua các lần cập nhật.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const UPLOAD_DIR = path.join(db.DATA_DIR, 'uploads');
const MAX_BYTES = 6 * 1024 * 1024; // 6MB mỗi ảnh sau khi trình duyệt đã nén

// Nhận dạng loại ảnh bằng vài byte đầu tệp thay vì tin vào phần khai báo của
// trình duyệt — tránh việc tệp thực thi được đổi tên thành .jpg rồi tải lên.
const SIGNATURES = [
  { ext: 'jpg', mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'webp', mime: 'image/webp',
    test: b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

function detect(buf) {
  return SIGNATURES.find(s => buf.length > 12 && s.test(buf)) || null;
}

// Chỉ chấp nhận tên tệp do chính hệ thống sinh ra, chặn mọi mưu toan đi ra
// ngoài thư mục ảnh bằng dấu ../ hay đường dẫn tuyệt đối.
const SAFE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

function pathOf(file) {
  if (typeof file !== 'string' || !SAFE_NAME.test(file)) return null;
  return path.join(UPLOAD_DIR, file);
}

function mimeOf(file) {
  const ext = String(file).split('.').pop();
  const sig = SIGNATURES.find(s => s.ext === ext);
  return sig ? sig.mime : 'application/octet-stream';
}

// Nhận chuỗi data URL từ trình duyệt (data:image/jpeg;base64,...) và ghi thành tệp.
// Trả về { file, bytes } hoặc ném lỗi có thông báo tiếng Việt.
function saveDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Ảnh không hợp lệ');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Ảnh không hợp lệ');

  const base64 = dataUrl.slice(comma + 1);
  // Ước lượng dung lượng trước khi giải mã để không tốn bộ nhớ với tệp quá lớn.
  if (base64.length * 0.75 > MAX_BYTES) {
    throw new Error('Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn');
  }

  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch (_) {
    throw new Error('Ảnh không hợp lệ');
  }
  if (!buf.length) throw new Error('Ảnh rỗng');
  if (buf.length > MAX_BYTES) throw new Error('Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn');

  const sig = detect(buf);
  if (!sig) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${crypto.randomBytes(16).toString('hex')}.${sig.ext}`;
  const tmp = path.join(UPLOAD_DIR, `.${file}.tmp`);
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(UPLOAD_DIR, file));
  return { file, bytes: buf.length };
}

function remove(file) {
  const p = pathOf(file);
  if (!p) return false;
  try { fs.unlinkSync(p); return true; } catch (_) { return false; }
}

function exists(file) {
  const p = pathOf(file);
  return !!p && fs.existsSync(p);
}

module.exports = { saveDataUrl, remove, exists, pathOf, mimeOf, UPLOAD_DIR, MAX_BYTES };
