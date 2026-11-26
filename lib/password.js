// Băm mật khẩu bằng scrypt của Node (không cần thư viện ngoài).
// scrypt là thuật toán chống dò tìm bằng GPU, được khuyến nghị cho mật khẩu.
const crypto = require('crypto');

const N = 16384;      // độ khó CPU/bộ nhớ (~60ms mỗi lần băm)
const R = 8;
const P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

// Chuỗi kết quả: scrypt$N$r$p$<muối base64>$<băm base64>
function hash(plain) {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = crypto.scryptSync(String(plain), salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

// Như `hash` nhưng KHÔNG chặn máy chủ: scrypt chạy ở luồng nền của Node. Dùng
// khi phải băm nhiều mật khẩu một lượt (nhập danh sách 300 bé) — `hash` đồng bộ
// ~60 ms mỗi lần, 300 lần là cả máy chủ đứng hơn chục giây. Cùng định dạng kết quả.
function hashAsync(plain) {
  const salt = crypto.randomBytes(SALT_LEN);
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(plain), salt, KEY_LEN, { N, r: R, p: P }, (err, key) => {
      if (err) return reject(err);
      resolve(`scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`);
    });
  });
}

// So sánh theo thời gian hằng số để không lộ thông tin qua thời gian phản hồi.
function verify(plain, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    const actual = crypto.scryptSync(String(plain), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
}

// Bản bất đồng bộ của `verify`, cùng kết quả (Đ261b). `scryptSync` giữ cả máy
// chủ đứng yên ~45 ms mỗi lần; `crypto.scrypt` băm ở luồng phụ nên trong lúc
// đó máy chủ vẫn trả lời người khác. Dùng ở đường đăng nhập và phép soát mật
// khẩu mẫu lúc khởi động — hai chỗ băm nhiều nhất.
function verifyAsync(plain, stored) {
  if (typeof stored !== 'string') return Promise.resolve(false);
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return Promise.resolve(false);
  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  if (!expected.length) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      crypto.scrypt(String(plain), salt, expected.length, {
        N: Number(n), r: Number(r), p: Number(p),
      }, (err, actual) => {
        resolve(!err && crypto.timingSafeEqual(expected, actual));
      });
    } catch (_) {
      resolve(false);
    }
  });
}

function isHashed(value) {
  return typeof value === 'string' && value.startsWith('scrypt$');
}

// Quy tắc mật khẩu khi người dùng tự đổi. Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
function checkStrength(plain) {
  const s = String(plain || '');
  if (s.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (!/[a-zA-Z]/.test(s)) return 'Mật khẩu cần có ít nhất một chữ cái';
  if (!/[0-9]/.test(s)) return 'Mật khẩu cần có ít nhất một chữ số';
  if (/^\s|\s$/.test(s)) return 'Mật khẩu không được bắt đầu hoặc kết thúc bằng dấu cách';
  const WEAK = ['12345678', 'password', 'matkhau', 'qwertyui', '11111111', 'abc12345'];
  if (WEAK.includes(s.toLowerCase())) return 'Mật khẩu này quá phổ biến, vui lòng chọn mật khẩu khác';
  return null;
}

module.exports = { hash, hashAsync, verify, verifyAsync, isHashed, checkStrength };
