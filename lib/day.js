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
const { SESSION_TTL } = require('./auth');

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

// ---------------------------------------------------------------------------
// TRẦN SỐ TIN GỬI ĐỒNG THỜI (Đ194, việc 17)
// ---------------------------------------------------------------------------
//
// VÌ SAO PHẢI CÓ TRƯỚC KHI MỞ ĐẨY CHO TIN CẢ NHÓM.
//
// Tới hôm nay đẩy chỉ đi cho tin RIÊNG của một bé, tức mỗi lượt là vài máy của
// bố mẹ bé đó. Việc 16 mở đẩy cho tin CẢ NHÓM và CẢ TRƯỜNG — một thông báo
// toàn trường của trường ba cơ sở là một lượt gửi cho MỌI máy đã đăng ký, và
// `guiChoGiaDinhCuaBe` vốn bắn đi mà không chờ ai. Không có trần thì đó là
// hàng trăm kết nối HTTPS ra ngoài bật lên cùng một nhịp.
//
// Hỏng ra sao: máy chủ hết ổ cắm mạng nên ĐƯỜNG GHI CỦA CÔ cũng nghẽn theo —
// đẩy là việc phụ mà lại kéo việc chính xuống; và dịch vụ đẩy thấy một cụm
// dày thì bắt đầu trả lỗi, mà mã lỗi ấy `guiChoNguoi` ghi thẳng vào cột
// `loiCuoi` của từng dòng, nên màn quản trị hiện một bảng đỏ của những máy
// hoàn toàn bình thường. Cả hai đều diễn ra im lặng.
//
// Trần này KHÔNG bỏ bớt tin nào — nó chỉ xếp hàng. Tin nào cũng đi, chỉ là
// không đi cùng một lúc. Bỏ tin là mất thông báo, thứ Nguyên tắc số 1 cấm.
const TRAN_MAC_DINH = 8;

// HẠN CHỜ CỦA MỘT LƯỢT GỬI (Đ251). Gói `web-push` chỉ ngắt kết nối khi được
// truyền `timeout`. Không có nó, dịch vụ đẩy nhận kết nối rồi im là lượt ấy
// treo mãi và giữ luôn một chỗ trong hàng đợi: đủ tám lượt treo thì không
// thông báo nào đi được nữa cho tới lần khởi động lại, mà không có gì báo.
// Hết hạn thì lượt ấy đi vào nhánh "hỏng" như mọi lỗi mạng khác (ghi `loiCuoi`,
// KHÔNG xoá đăng ký). `test/day-het-gio.test.mjs` canh.
//
// ĐO THẬT: với 15000, một lượt gửi tới máy chủ nhận kết nối rồi im bị ngắt sau
// khoảng 30 GIÂY chứ không phải 15 (đo hai lần độc lập, 1500 → ~3000 ms và
// 15000 → ~30000 ms). Con số dưới đây là tham số đưa cho gói `web-push`, không
// phải lời hứa về thời gian; muốn đổi thì đo lại.
const HAN_CHO_MOI_LUOT = 15000;

function tranDongThoi() {
  const n = Number(process.env.PUSH_TRAN_DONG_THOI);
  if (Number.isFinite(n) && n >= 1 && n <= 64) return Math.floor(n);
  return TRAN_MAC_DINH;
}

let dangChay = 0;
const hangDoi = [];
// Số lượt đã phải xếp hàng — để màn quản trị biết trần có đang chạm hay không.
let daPhaiCho = 0;
// ĐỈNH CAO SỐ LƯỢT CHẠY CÙNG LÚC, ghi ngay trong hàng đợi.
//
// Phải ghi ở ĐÂY chứ không đứng ngoài ngó vào: bản đầu của bài canh đo bằng
// một đồng hồ `setInterval` 1ms, và nó KHÔNG BAO GIỜ thấy đỉnh — mấy chục
// lượt gửi hỏng cùng một nhịp thì lời hứa của chúng là microtask, chạy hết
// TRƯỚC khi bộ hẹn giờ kịp tích một cái. Thử ngược chứng minh: gỡ hẳn trần ra
// mà bài canh vẫn xanh. Một phép đo không bao giờ báo đỏ thì không phải phép
// đo.
//
// Con số này cũng đáng để nhà trường nhìn: đỉnh chạm trần đều đặn nghĩa là
// trần đang là chỗ thắt, chứ không phải đường đẩy chậm.
let dinhCaoDangChay = 0;

function chayTiep() {
  while (dangChay < tranDongThoi() && hangDoi.length) {
    const viec = hangDoi.shift();
    dangChay += 1;
    if (dangChay > dinhCaoDangChay) dinhCaoDangChay = dangChay;
    Promise.resolve()
      .then(viec.fn)
      .then(viec.xong, viec.hong)
      .then(() => { dangChay -= 1; chayTiep(); });
  }
}

// Chạy `fn` khi còn chỗ dưới trần. Trả về lời hứa của chính `fn`.
//
// TÊN HÀM NÀY ĐƯỢC CHỌN CÓ LÝ DO, đừng đổi lại cho "tự nhiên" hơn.
//
// Tên đầu tiên của nó ghép hai chữ "đứng chờ tới lượt" viết không dấu, và
// chuỗi ấy trùng khít với một dấu hiệu mà bộ canh QUY TẮC 4 đi tìm: cách sắp
// trẻ trên dưới nhau. Bỏ dấu thì hai nghĩa hoàn toàn khác nhau ấy viết giống
// hệt nhau, mà bộ canh quét chữ chứ không đọc được ý định.
//
// Nó báo đỏ đúng tệp này ngay lần đầu. Cách xử lý là ĐỔI TÊN, không phải thêm
// một dòng ngoại lệ vào bộ canh: ngoại lệ là một lỗ nhìn ra mãi mãi, còn đổi
// tên mất đúng một phút. Cùng lối xử lý đã dùng ở `lib/nhan-danh-gia.js`.
function xepLuot(fn) {
  return new Promise((xong, hong) => {
    hangDoi.push({ fn, xong, hong });
    if (hangDoi.length > 1 || dangChay >= tranDongThoi()) daPhaiCho += 1;
    chayTiep();
  });
}

// Cho màn quản trị và bài canh nhìn vào: trần là bao nhiêu, đang chạy mấy
// lượt, còn mấy lượt đứng chờ.
function trangThaiHangDoi() {
  return { tran: tranDongThoi(), dangChay, dangCho: hangDoi.length, daPhaiCho, dinhCao: dinhCaoDangChay };
}

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
//
// `phienTaoLuc` (Đ255) là `sessions.createdAt` của phiên đang bấm "Bật trên
// máy này": đăng ký được nối với phiên ấy, và phiên hết thì máy thôi nhận tin
// về bé — xem `guiChoNguoi`. Không truyền thì đăng ký KHÔNG nối với phiên nào
// (gỡ cả dòng nối cũ của địa chỉ này nếu có) và được xử như đăng ký có từ
// trước Đ255: nhận tin chừng nào người ấy còn một phiên chưa hết hạn.
function dangKy(userId, sub, phienTaoLuc = null) {
  if (!userId || !sub || typeof sub !== 'object') return { ok: false, loi: 'Thiếu thông tin đăng ký' };
  const endpoint = String(sub.endpoint || '').trim();
  const keys = sub.keys && typeof sub.keys === 'object' ? sub.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth) {
    return { ok: false, loi: 'Đăng ký từ trình duyệt chưa đúng dạng' };
  }
  const moc = Number(phienTaoLuc);
  db.tx(() => {
    db.upsert('push_dang_ky', { endpoint, userId, p256dh, auth, taoLuc: new Date().toISOString(), loiCuoi: '' }, ['endpoint']);
    if (moc > 0) db.upsert('push_dang_ky_phien', { endpoint, phienTaoLuc: moc, daNhac: 0 }, ['endpoint']);
    else db.run('DELETE FROM push_dang_ky_phien WHERE endpoint = ?', [endpoint]);
  });
  return { ok: true };
}

// NỐI LẠI một đăng ký ĐÃ CÓ với phiên đăng nhập hiện tại (Đ255).
//
// App gọi mỗi lần mở và sau mỗi lần đăng nhập, kèm địa chỉ đẩy mà trình duyệt
// đang giữ. Nhờ vậy gia đình đăng nhập lại sau 30 ngày là nhận tin tiếp,
// không phải vào Cài đặt bấm Bật lần nữa.
//
// KHÔNG BAO GIỜ TẠO dòng `push_dang_ky`, và chỉ nối khi dòng ấy thuộc ĐÚNG
// người đang đăng nhập. Hai ca phải trả `conDangKy: false` mà không ghi gì:
// người KHÁC đăng nhập trên máy đó (dòng thuộc người cũ — họ phải tự bấm Bật),
// và dòng đã bị xoá (đăng xuất, đổi khoá, quản trị gỡ máy — phải tự bật lại).
function noiLaiPhien(userId, endpoint, phienTaoLuc) {
  const e = typeof endpoint === 'string' ? endpoint.trim() : '';
  const moc = Number(phienTaoLuc);
  if (!userId || !e || !(moc > 0)) return { conDangKy: false };
  try {
    const co = db.first('push_dang_ky', 'SELECT endpoint FROM push_dang_ky WHERE endpoint = ? AND userId = ?', [e, userId]);
    if (!co) return { conDangKy: false };
    db.upsert('push_dang_ky_phien', { endpoint: e, phienTaoLuc: moc, daNhac: 0 }, ['endpoint']);
    return { conDangKy: true };
  } catch (_) {
    return { conDangKy: false };
  }
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

// TIN NHẮC CHUNG cho máy mà phiên đăng nhập đã hết (Đ255). Không tên bé,
// không nội dung — máy ấy có thể đã sang tay người khác. Khoá gộp cố định:
// lỡ có hai tin nhắc tới cùng một máy thì màn hình chờ vẫn chỉ hiện một.
const THAN_NHAC = JSON.stringify({
  tieuDe: 'CASA Mầm non',
  noiDung: 'Có tin mới từ nhà trường. Mở app và đăng nhập lại để xem và tiếp tục nhận thông báo.',
  hash: '#/',
  gop: 'nhac-dang-nhap-lai',
});

// Giữ lượt nhắc của một máy: `true` cho ĐÚNG MỘT bên gọi, và cờ `daNhac` đã
// bật TRƯỚC khi tin nhắc đi — hai lượt gửi sát nhau không thành hai tin nhắc.
// Đăng ký có từ trước Đ255 chưa có dòng nối thì dòng được tạo ở đây, mốc 0
// (không phiên nào mang mốc 0, nên máy im cho tới khi được nối lại).
function giuLuotNhac(endpoint) {
  try {
    return db.run(
      `INSERT INTO push_dang_ky_phien (endpoint, phienTaoLuc, daNhac) VALUES (?, 0, 1)
       ON CONFLICT (endpoint) DO UPDATE SET daNhac = 1 WHERE push_dang_ky_phien.daNhac = 0`, [endpoint]).changes === 1;
  } catch (_) {
    return false;
  }
}

// Đẩy một gói tới MỌI máy của một người. Máy nào trả 404/410 (đăng ký đã
// hết) thì xoá dòng, để không đẩy vào khoảng không mãi.
//
// MÁY MÀ PHIÊN ĐĂNG NHẬP ĐÃ HẾT THÌ KHÔNG NHẬN TIN VỀ BÉ (Đ255). Phiên hết
// hạn cố định sau 30 ngày, hoặc bị huỷ khi đổi / đặt lại mật khẩu; bản cũ vẫn
// gửi tiêu đề và nội dung tin tới máy ấy — điện thoại đã cho người khác, đã
// mất. Mỗi máy rơi vào một trong ba loại:
//
//   còn phiên            → tin thật;
//   hết phiên, chưa nhắc → ĐÚNG MỘT tin nhắc chung (`THAN_NHAC`);
//   hết phiên, đã nhắc   → không gửi gì, cho tới khi `noiLaiPhien` / `dangKy`.
//
// Vì sao nhắc chứ không im hẳn: MỌI gia đình cứ 30 ngày hết phiên một lần, im
// thì họ không bao giờ biết phải mở app — hỏng luôn chức năng thông báo.
//
// "Còn phiên" = có dòng `sessions` của đúng người ấy, chưa quá `SESSION_TTL`
// (cùng phép so với `attachUser`), mang mốc `createdAt` mà đăng ký đã nối. Đăng
// ký có từ trước Đ255 chưa nối phiên nào: còn phiên chừng nào người ấy còn MỘT
// phiên bất kỳ chưa hết hạn. Tất cả nằm trong câu hỏi lấy danh sách máy.
//
// `guiDuoc` là số máy nhận được TIN THẬT — tin nhắc KHÔNG tính: nút "Gửi thử"
// đọc con số này để nói "máy sẽ báo", và một tin nhắc tới máy khác không phải
// điều đó. Tin nhắc gửi hỏng thì tính vào `hong` như mọi lượt hỏng, và trả lại
// lượt nhắc để tin sau thử lại (máy chưa nhận được gì thì chưa được phép im).
//
// TÀI KHOẢN ĐÃ KHOÁ THÌ KHÔNG NHẬN ĐẨY (Đ252). Cô nghỉ việc, gia đình thôi
// học: tài khoản bị khoá nhưng điện thoại của họ vẫn còn đăng ký, và bản cũ
// vẫn gửi tiêu đề cùng nội dung tin về bé tới đó. Lọc ngay trong câu hỏi lấy
// danh sách máy (ghép với `users.active`) nên không thêm câu SQL nào cho đường
// gửi hàng loạt. KHÔNG xoá đăng ký của họ: mở lại tài khoản là nhận lại.
async function guiChoNguoi(userId, goi) {
  if (!webpush || !userId) return { guiDuoc: 0, hong: 0 };
  const k = khoa();
  if (!k) return { guiDuoc: 0, hong: 0 };
  const ds = db.all('push_dang_ky',
    `SELECT p.*, n.daNhac AS daNhac,
            EXISTS (SELECT 1 FROM sessions s
                     WHERE s.userId = p.userId AND s.createdAt > ?
                       AND (n.endpoint IS NULL OR s.createdAt = n.phienTaoLuc)) AS conPhien
       FROM push_dang_ky p JOIN users u ON u.id = p.userId
       LEFT JOIN push_dang_ky_phien n ON n.endpoint = p.endpoint
      WHERE p.userId = ? AND u.active = 1`, [Date.now() - SESSION_TTL, userId]);
  let guiDuoc = 0, hong = 0;
  const than = JSON.stringify({
    tieuDe: String(goi.tieuDe || 'CASA Mầm non').slice(0, 120),
    noiDung: String(goi.noiDung || '').slice(0, 300),
    hash: String(goi.hash || '#/'),
    // KHOÁ GỘP (Đ194, việc 18) — xem chú thích dài ở `khoaGop` bên dưới.
    gop: khoaGop(goi),
  });
  // BẮN CẢ MẤY MÁY CỦA MỘT NGƯỜI CÙNG LÚC, rồi để HÀNG ĐỢI giữ trần.
  //
  // Bản đầu của đợt này `await` từng máy một trong vòng lặp. Nó chạy đúng,
  // nhưng nó vô hiệu hoá chính cái trần vừa dựng: xếp hàng từng lượt một thì
  // lúc nào cũng chỉ có MỘT lượt đang chạy, dù trần là tám. Bài canh mục [3]
  // bắt được đúng chỗ này — phép đo "đỉnh cao không vượt trần" xanh trong khi
  // hàng đợi chưa bao giờ chạy tới trần, tức một phép đo rỗng.
  //
  // Mấy máy của một người là mấy việc độc lập: điện thoại của mẹ hỏng không
  // phải lý do để điện thoại của bố nhận chậm hơn. Nên gom vào `Promise.all`
  // và để hàng đợi quyết bao nhiêu lượt chạy cùng lúc — đó đúng là việc của
  // nó.
  //
  // Chia loại và giữ lượt nhắc NGAY Ở ĐÂY, trước mọi `await`: lượt gửi thứ
  // hai chạy tới thì đã thấy cờ `daNhac` bật.
  const viec = [];
  for (const d of ds) {
    if (d.conPhien) viec.push({ d, nhac: false });
    else if (!d.daNhac && giuLuotNhac(d.endpoint)) viec.push({ d, nhac: true });
  }
  await Promise.all(viec.map(({ d, nhac }) => xepLuot(() => webpush.sendNotification(
    { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
    nhac ? THAN_NHAC : than,
    { vapidDetails: { subject: CHU_DE, publicKey: k.publicKey, privateKey: k.privateKey }, TTL: 6 * 3600, timeout: HAN_CHO_MOI_LUOT }))
    .then(() => { if (!nhac) guiDuoc += 1; })
    .catch((err) => {
      hong += 1;
      const ma = err && err.statusCode;
      if (ma === 404 || ma === 410) {
        try { db.run('DELETE FROM push_dang_ky WHERE endpoint = ?', [d.endpoint]); } catch (_) {}
      } else {
        try { db.run('UPDATE push_dang_ky SET loiCuoi = ? WHERE endpoint = ?', [String(ma || (err && err.message) || 'loi').slice(0, 200), d.endpoint]); } catch (_) {}
        if (nhac) {
          try { db.run('UPDATE push_dang_ky_phien SET daNhac = 0 WHERE endpoint = ?', [d.endpoint]); } catch (_) {}
        }
      }
    })));
  return { guiDuoc, hong };
}

// KHOÁ GỘP — thứ quyết định tin mới có ĂN MẤT tin cũ trên màn hình chờ không
// (Đ194, việc 18).
//
// `public/sw.js` đưa chuỗi này vào `tag` của thông báo. Trình duyệt coi hai
// thông báo cùng `tag` là MỘT: cái sau thay chỗ cái trước, cái trước biến mất
// khỏi màn hình chờ mà không ai bấm gì.
//
// LỖI ĐANG CÓ: `sw.js` lấy thẳng `hash` làm `tag`. Mọi thông báo nhà trường
// đều mở cùng một màn, nên chúng cùng `tag` — trường gửi ba tin trong buổi
// sáng thì gia đình chỉ còn thấy tin thứ ba. Hai tin đầu mất, im lặng, và
// trong app thì cả ba vẫn nằm đó nên không ai đối chiếu ra.
//
// LUẬT MỚI, VÀ CHIỀU MẶC ĐỊNH ĐẢO LẠI: không khai `gop` thì mỗi tin một khoá
// RIÊNG, tức xếp chồng. Gộp là thứ phải XIN, không phải thứ tự có. Lý do:
// xếp chồng thì tệ nhất là gia đình thấy nhiều chuông hơn mong muốn — phiền
// nhưng đọc được; còn gộp nhầm là MẤT một thông báo của trường, và đó là thứ
// Nguyên tắc số 1 cấm.
//
// Chỗ nào thật sự cần gộp thì khai một khoá ỔN ĐỊNH: nhật ký của một bé được
// cô sửa năm lần trong buổi chiều là năm lượt đẩy cho cùng một chuyện, và ở
// đó gộp mới đúng.
let demGop = 0;
function khoaGop(goi) {
  const xin = String((goi && goi.gop) || '').trim().slice(0, 80);
  if (xin) return xin;
  demGop += 1;
  return `rieng-${Date.now().toString(36)}-${demGop}`;
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

// Đẩy một gói cho NHIỀU người một lượt (Đ194, việc 16).
//
// Đây là đường mà tin CẢ NHÓM và CẢ TRƯỜNG đi qua. Không chờ kết quả, vì chỗ
// gọi là đường ghi của cô hay của văn phòng; trần số tin gửi đồng thời nằm
// sẵn trong `guiChoNguoi`, nên gọi hàm này cho ba trăm người cũng không bật
// lên ba trăm kết nối.
//
// Trả về SỐ NGƯỜI đã xếp vào hàng, không phải số máy nhận được — số sau chỉ
// biết khi dịch vụ đẩy trả lời, mà chỗ gọi thì không đứng chờ.
function guiChoNhieuNguoi(userIds, goi) {
  if (!webpush) return 0;
  const ds = [...new Set((userIds || []).filter(Boolean))];
  for (const id of ds) {
    try { guiChoNguoi(id, goi).catch(() => {}); } catch (_) { /* đẩy là việc phụ */ }
  }
  return ds.length;
}

module.exports = {
  coGoiDay, khoaCongKhai, dangKy, noiLaiPhien, huyDangKy, soMayCua, guiChoNguoi, guiChoGiaDinhCuaBe,
  guiChoNhieuNguoi, doiKhoa, danhSachDangKy, xoaDangKyCua, trangThaiHangDoi,
};
