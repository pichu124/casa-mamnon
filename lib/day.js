// THÔNG BÁO ĐẨY (Web Push) — đường đẩy thật, để app được phép xin quyền.
//
// Trước đợt này app không có đường đẩy nào, và `test/khong-hua-suong.test.mjs`
// cấm mọi màn hình xin quyền Notification vì thế (bài học A5: hứa sai còn tệ
// hơn thiếu). Nay dựng đủ ba mảnh: khoá VAPID sinh một lần rồi cất trong
// bảng `settings`; đăng ký của từng máy trong `push_dang_ky`; và bộ nghe
// `push` trong public/sw.js hiện thông báo lên máy.
//
// KHÔNG BAO GIỜ NÉM LỖI RA NGOÀI. Đẩy là việc phụ: cô ghi nhật ký xong mà
// đẩy hỏng (mạng máy chủ chặn ra ngoài, gói `web-push` thiếu) thì nhật ký
// vẫn phải lưu và gia đình vẫn thấy chuông trong app. Mọi hàm ở đây nuốt lỗi
// và trả về kết quả gọn để ghi log.
//
// iPhone: chỉ nhận đẩy khi app đã được "Thêm vào màn hình chính" (iOS 16.4+).
// Màn Cài đặt phải nói điều đó, không hứa hơn.
const db = require('./db');

let webpush = null;
try { webpush = require('web-push'); } catch (_) { webpush = null; }

const KHOA_SETTING = 'push-vapid';

// HÒM THƯ LIÊN HỆ GẮN VÀO GÓI ĐẨY — nhà trường cấp ngày 10/09/2026 (A27).
//
// Dịch vụ đẩy của trình duyệt dùng địa chỉ này để liên lạc khi gói đẩy của
// mình có sự cố. Trước đây đây là một địa chỉ tôi TỰ ĐẶT, chưa chắc có thật —
// tức là sự cố đẩy sẽ diễn ra im lặng và không ai biết vì sao gia đình ngừng
// nhận chuông. Nay là hòm thư thật của trường.
const CHU_DE = 'mailto:tuyensinh@cdb.edu.vn';

function coGoiDay() { return !!webpush; }

// Cặp khoá VAPID của trường — sinh một lần, cất trong settings. Đổi khoá là
// mọi đăng ký cũ vô hiệu, nên chỉ sinh khi CHƯA có.
function khoa() {
  if (!webpush) return null;
  const row = db.first('settings', 'SELECT value FROM settings WHERE key = ?', [KHOA_SETTING]);
  const cu = row && row.value && typeof row.value === 'object' ? row.value : null;
  if (cu && cu.publicKey && cu.privateKey) return cu;
  const moi = webpush.generateVAPIDKeys();
  db.upsert('settings', { key: KHOA_SETTING, value: { publicKey: moi.publicKey, privateKey: moi.privateKey } }, ['key']);
  return moi;
}

function khoaCongKhai() {
  const k = khoa();
  return k ? k.publicKey : '';
}

// Ghi nhận một đăng ký của trình duyệt. `sub` là PushSubscription.toJSON().
function dangKy(userId, sub) {
  if (!userId || !sub || typeof sub !== 'object') return { ok: false, loi: 'Thiếu thông tin đăng ký' };
  const endpoint = String(sub.endpoint || '').trim();
  const keys = sub.keys && typeof sub.keys === 'object' ? sub.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth) {
    return { ok: false, loi: 'Đăng ký từ trình duyệt chưa đúng dạng' };
  }
  db.upsert('push_dang_ky', { endpoint, userId, p256dh, auth, taoLuc: new Date().toISOString(), loiCuoi: '' }, ['endpoint']);
  return { ok: true };
}

function huyDangKy(userId, endpoint) {
  const e = String(endpoint || '').trim();
  if (!e) return { ok: false, loi: 'Thiếu endpoint' };
  const r = db.run('DELETE FROM push_dang_ky WHERE endpoint = ? AND userId = ?', [e, userId]);
  return { ok: true, daXoa: r.changes };
}

function soMayCua(userId) {
  return db.count('SELECT COUNT(*) FROM push_dang_ky WHERE userId = ?', [userId]);
}

// ---------------------------------------------------------------------------
// QUẢN TRỊ ĐƯỜNG ĐẨY (Đ157)
// ---------------------------------------------------------------------------

// ĐỔI KHOÁ VAPID.
//
// Trước đợt này khoá sinh MỘT LẦN rồi nằm mãi trong bảng `settings`, và
// `khoa()` chỉ sinh mới khi CHƯA có — nghĩa là khoá lộ ra ngoài (sao lưu bị
// chép đi, một người nghỉ việc còn giữ bản sao) thì không có đường nào trong
// app đổi được. Chỉ còn cách sửa thẳng cơ sở dữ liệu của trường.
//
// ĐỔI KHOÁ LÀ MỌI ĐĂNG KÝ CŨ VÔ HIỆU, và đó không phải tác dụng phụ mà là
// đúng điều cần: khoá cũ không được dùng để đẩy nữa. Nên xoá luôn bảng
// `push_dang_ky` trong cùng một giao dịch — để lại thì máy chủ sẽ đẩy vào
// những địa chỉ chắc chắn hỏng, mỗi lượt một lỗi, cho tới khi dịch vụ đẩy
// trả 410. Người dùng bật lại trên máy của mình là xong.
//
// Trả về số máy phải đăng ký lại, để màn hình nói đúng cái giá của việc này.
function doiKhoa() {
  if (!webpush) return { ok: false, loi: 'Máy chủ chưa có phần gửi thông báo đẩy' };
  try {
    const moi = webpush.generateVAPIDKeys();
    let soMay = 0;
    db.tx(() => {
      soMay = db.count('SELECT COUNT(*) FROM push_dang_ky');
      db.run('DELETE FROM push_dang_ky');
      db.upsert('settings', { key: KHOA_SETTING, value: { publicKey: moi.publicKey, privateKey: moi.privateKey } }, ['key']);
    });
    return { ok: true, soMayPhaiDangKyLai: soMay, publicKey: moi.publicKey };
  } catch (err) {
    return { ok: false, loi: err.message };
  }
}

// Danh sách máy đã đăng ký, cho màn Quản trị.
//
// KHÔNG TRẢ VỀ `endpoint` ĐẦY ĐỦ. Chuỗi đó là địa chỉ đẩy riêng của đúng một
// trình duyệt: ai cầm được nó cùng với khoá riêng thì đẩy thông báo vào máy
// đó. In nguyên ra một màn hình quản trị là để nó nằm trong ảnh chụp màn
// hình, trong nhật ký trình duyệt, trong bản sao lưu của máy tính văn phòng.
// Chỉ trả TÊN DỊCH VỤ (Google, Apple, Mozilla…) — đủ để đoán máy đó là gì mà
// không đủ để đẩy vào.
function danhSachDangKy({ soLuong = 200 } = {}) {
  try {
    const rows = db.all('push_dang_ky',
      `SELECT p.endpoint AS endpoint, p.userId AS userId, p.taoLuc AS taoLuc, p.loiCuoi AS loiCuoi,
              u.name AS hoTen, u.role AS vai, u.username AS tenDangNhap
         FROM push_dang_ky p LEFT JOIN users u ON u.id = p.userId
        ORDER BY p.taoLuc DESC LIMIT ${Number(soLuong) || 200}`);
    return rows.map(r => ({
      userId: r.userId,
      hoTen: r.hoTen || '(tài khoản đã xoá)',
      tenDangNhap: r.tenDangNhap || '',
      vai: r.vai || '',
      dichVu: tenDichVu(r.endpoint),
      taoLuc: r.taoLuc || '',
      loiCuoi: r.loiCuoi || '',
    }));
  } catch (_) {
    return [];
  }
}

// "https://fcm.googleapis.com/fcm/send/abc…" → "fcm.googleapis.com".
function tenDichVu(endpoint) {
  try { return new URL(String(endpoint)).host; } catch (_) { return ''; }
}

// Gỡ mọi máy của một người — dùng khi họ nghỉ việc, hoặc mất điện thoại.
function xoaDangKyCua(userId) {
  if (!userId) return { ok: false, loi: 'Thiếu mã tài khoản' };
  try {
    const r = db.run('DELETE FROM push_dang_ky WHERE userId = ?', [userId]);
    return { ok: true, daXoa: r.changes };
  } catch (err) {
    return { ok: false, loi: err.message };
  }
}

// Đẩy một gói tới MỌI máy của một người. Máy nào trả 404/410 (đăng ký đã
// hết) thì xoá dòng, để không đẩy vào khoảng không mãi.
async function guiChoNguoi(userId, goi) {
  if (!webpush || !userId) return { guiDuoc: 0, hong: 0 };
  const k = khoa();
  if (!k) return { guiDuoc: 0, hong: 0 };
  const ds = db.all('push_dang_ky', 'SELECT * FROM push_dang_ky WHERE userId = ?', [userId]);
  let guiDuoc = 0, hong = 0;
  const than = JSON.stringify({
    tieuDe: String(goi.tieuDe || 'CASA Mầm non').slice(0, 120),
    noiDung: String(goi.noiDung || '').slice(0, 300),
    hash: String(goi.hash || '#/'),
  });
  for (const d of ds) {
    try {
      await webpush.sendNotification(
        { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
        than,
        { vapidDetails: { subject: CHU_DE, publicKey: k.publicKey, privateKey: k.privateKey }, TTL: 6 * 3600 });
      guiDuoc += 1;
    } catch (err) {
      hong += 1;
      const ma = err && err.statusCode;
      if (ma === 404 || ma === 410) {
        db.run('DELETE FROM push_dang_ky WHERE endpoint = ?', [d.endpoint]);
      } else {
        try { db.run('UPDATE push_dang_ky SET loiCuoi = ? WHERE endpoint = ?', [String(ma || (err && err.message) || 'loi').slice(0, 200), d.endpoint]); } catch (_) {}
      }
    }
  }
  return { guiDuoc, hong };
}

// Đẩy tới bố mẹ của một bé. Không chờ kết quả — chỗ gọi là đường ghi của cô,
// không được đứng chờ máy chủ của Google/Apple trả lời.
function guiChoGiaDinhCuaBe(studentId, goi) {
  if (!webpush || !studentId) return;
  let phuHuynh = [];
  try {
    phuHuynh = db.all('student_parents', 'SELECT parentId FROM student_parents WHERE studentId = ?', [studentId]);
  } catch (_) { return; }
  for (const p of phuHuynh) {
    guiChoNguoi(p.parentId, goi).catch(() => {});
  }
}

module.exports = {
  coGoiDay, khoaCongKhai, dangKy, huyDangKy, soMayCua, guiChoNguoi, guiChoGiaDinhCuaBe,
  doiKhoa, danhSachDangKy, xoaDangKyCua,
};
