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
const CHU_DE = 'mailto:lienhe@casamamnon.edu.vn';

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

module.exports = { coGoiDay, khoaCongKhai, dangKy, huyDangKy, soMayCua, guiChoNguoi, guiChoGiaDinhCuaBe };
