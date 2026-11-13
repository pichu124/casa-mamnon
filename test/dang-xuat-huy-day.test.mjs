// Bài canh: ĐĂNG XUẤT THÌ MÁY ĐÓ THÔI NHẬN THÔNG BÁO ĐẨY, và tài khoản đã
// khoá thì không nhận đẩy nữa.
//
// Chạy bằng:  node test/dang-xuat-huy-day.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ252, chủ dự án duyệt 12/11/2026)
//
// Đăng ký đẩy (bảng `push_dang_ky`) gắn với TÀI KHOẢN chứ không gắn với phiên
// đăng nhập. Bản cũ lúc đăng xuất chỉ xoá phiên, nên máy đã đăng xuất — hay
// máy mượn của người khác — vẫn hiện tiêu đề và nội dung tin về bé lên màn
// hình khoá. Và `guiChoNguoi` gửi cho mọi máy của một tài khoản mà không hỏi
// tài khoản ấy còn hoạt động không: cô nghỉ việc, tài khoản đã khoá, điện
// thoại vẫn kêu.
//
// Phần giao diện (app có gửi kèm địa chỉ đẩy của máy khi bấm Đăng xuất hay
// không) nằm ở `test/dang-xuat-huy-day-giao-dien.test.mjs`.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dang-xuat-huy-day');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4783), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// Đọc thẳng bảng: thứ đang canh là dòng nào CÒN, dòng nào MẤT.
function dangKyCua(userId) {
  const conn = new Database(CSDL, { readonly: true });
  try {
    return conn.prepare('SELECT endpoint FROM push_dang_ky WHERE userId = ? ORDER BY endpoint').all(userId)
      .map(r => r.endpoint);
  } finally { conn.close(); }
}
const dangKyMay = (cookie, endpoint) => req('POST', '/api/push/dang-ky', {
  cookie, body: { subscription: { endpoint, keys: { p256dh: 'khoa-thu', auth: 'khoa-thu' } } },
});

const E1 = 'https://day.example.invalid/ha-may-1';
const E2 = 'https://day.example.invalid/ha-may-2';
const E3 = 'https://day.example.invalid/ha-may-3';
const EK = 'https://day.example.invalid/nguoi-khac';

try {
  // =========================================================================
  console.log('\n[1] Một người đăng nhập trên hai máy, mỗi máy bật thông báo qua đường đăng ký thật');
  const may1 = await login('phuhuynh', '123456');
  const may2 = await login('phuhuynh', '123456');
  const khac = await login('phuhuynh2', '123456');
  const HA = may1.data.user.id;
  const BAO = khac.data.user.id;
  {
    const a = await dangKyMay(may1.cookie, E1);
    const b = await dangKyMay(may2.cookie, E2);
    const c = await dangKyMay(khac.cookie, EK);
    check('ba lượt đăng ký đều 200', a.status === 200 && b.status === 200 && c.status === 200, [a.status, b.status, c.status]);
    check('tài khoản thứ nhất có đúng hai máy', JSON.stringify(dangKyCua(HA)) === JSON.stringify([E1, E2]), dangKyCua(HA));
    check('tài khoản thứ hai có đúng một máy', JSON.stringify(dangKyCua(BAO)) === JSON.stringify([EK]), dangKyCua(BAO));
  }

  // =========================================================================
  console.log('\n[2] Đăng xuất máy 1 kèm địa chỉ đẩy của máy 1 → chỉ máy 1 thôi nhận');
  {
    const r = await req('POST', '/api/auth/logout', { cookie: may1.cookie, body: { endpoint: E1 } });
    check('đăng xuất → 200', r.status === 200, r.status);
    check('câu trả lời giữ nguyên hình dạng { ok: true }', JSON.stringify(r.data) === '{"ok":true}', r.data);
    check('cookie phiên bị xoá như cũ', /session=;/.test(r.setCookie || '') && /Max-Age=0/.test(r.setCookie || ''), r.setCookie);
    check('đăng ký đẩy của MÁY 1 đã bị xoá, máy 2 còn nguyên',
      JSON.stringify(dangKyCua(HA)) === JSON.stringify([E2]), dangKyCua(HA));
    check('đăng ký của người khác không bị đụng', JSON.stringify(dangKyCua(BAO)) === JSON.stringify([EK]), dangKyCua(BAO));
    const me1 = await req('GET', '/api/auth/me', { cookie: may1.cookie });
    const me2 = await req('GET', '/api/auth/me', { cookie: may2.cookie });
    check('máy 1 đã hết phiên', me1.status === 401, me1.status);
    check('máy 2 vẫn đang đăng nhập', me2.status === 200, me2.status);
    const tt = await req('GET', '/api/push/trang-thai', { cookie: may2.cookie });
    check('máy chủ báo tài khoản còn đúng một máy đang bật', tt.data?.soMay === 1, tt.data);
  }

  // =========================================================================
  console.log('\n[3] Đăng xuất kèm địa chỉ đẩy của NGƯỜI KHÁC → không xoá được');
  {
    const r = await req('POST', '/api/auth/logout', { cookie: may2.cookie, body: { endpoint: EK } });
    check('đăng xuất vẫn 200 { ok: true }', r.status === 200 && JSON.stringify(r.data) === '{"ok":true}', r);
    check('đăng ký của người khác CÒN NGUYÊN', JSON.stringify(dangKyCua(BAO)) === JSON.stringify([EK]), dangKyCua(BAO));
    check('máy 2 của chính mình không gửi địa chỉ nên cũng còn nguyên',
      JSON.stringify(dangKyCua(HA)) === JSON.stringify([E2]), dangKyCua(HA));
    const me2 = await req('GET', '/api/auth/me', { cookie: may2.cookie });
    check('và phiên của máy 2 đã hết', me2.status === 401, me2.status);
  }

  // =========================================================================
  console.log('\n[4] Không kèm địa chỉ đẩy → đăng xuất y như cũ (điện thoại còn chạy vỏ app đời trước)');
  {
    const may3 = await login('phuhuynh', '123456');
    await dangKyMay(may3.cookie, E3);
    const truoc = dangKyCua(HA);
    check('trước khi đăng xuất tài khoản có hai máy (máy 2, máy 3)',
      JSON.stringify(truoc) === JSON.stringify([E2, E3]), truoc);

    // Chưa đăng nhập mà gửi địa chỉ đẩy: không được xoá gì của ai.
    const la = await req('POST', '/api/auth/logout', { body: { endpoint: E3 } });
    check('người chưa đăng nhập gọi đăng xuất kèm địa chỉ → 200, không xoá gì',
      la.status === 200 && JSON.stringify(dangKyCua(HA)) === JSON.stringify([E2, E3]), dangKyCua(HA));

    // Thứ gửi lên không phải một chuỗi thì bỏ qua, không được làm hỏng đăng xuất.
    const may4 = await login('phuhuynh', '123456');
    const sai = await req('POST', '/api/auth/logout', { cookie: may4.cookie, body: { endpoint: { $ne: '' } } });
    check('địa chỉ đẩy sai kiểu → vẫn đăng xuất 200, không xoá gì',
      sai.status === 200 && JSON.stringify(dangKyCua(HA)) === JSON.stringify([E2, E3]), { status: sai.status, con: dangKyCua(HA) });

    const r = await req('POST', '/api/auth/logout', { cookie: may3.cookie });
    check('đăng xuất không có thân yêu cầu → 200 { ok: true }', r.status === 200 && JSON.stringify(r.data) === '{"ok":true}', r);
    check('không gửi địa chỉ thì không đăng ký nào bị xoá', JSON.stringify(dangKyCua(HA)) === JSON.stringify([E2, E3]), dangKyCua(HA));
    const me3 = await req('GET', '/api/auth/me', { cookie: may3.cookie });
    check('phiên vẫn bị xoá như cũ', me3.status === 401, me3.status);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

// ===========================================================================
// Đường GỬI. Chạy ngoài tiến trình này: `lib/db.js` mở cơ sở dữ liệu theo
// DATA_DIR ngay lúc được nạp. Gói `web-push` bị thay bằng bản ghi lại lời gọi
// — cùng cách với `test/day-het-gio.test.mjs` — nên không có gì đi ra mạng.
const DIR2 = thuMucTam('dang-xuat-huy-day-gui');
sinhDuLieu(DIR2);
const ra = execFileSync('node', ['-e', `
  const webpush = require('web-push');
  let thay = [];
  webpush.sendNotification = (sub) => { thay.push(sub.endpoint); return Promise.resolve({ statusCode: 201 }); };
  const db = require('./lib/db');
  const day = require('./lib/day');
  const goi = { tieuDe: 'Thử', noiDung: 'Thử', hash: '#/' };
  const dk = (id, ten) => day.dangKy(id, { endpoint: 'https://day.example.invalid/' + ten, keys: { p256dh: 'k', auth: 'k' } });
  // Các đường gửi hàng loạt không chờ ai — đợi tới khi hàng đợi rỗng hẳn.
  const lang = async () => {
    for (let i = 0; i < 200; i++) {
      await new Promise(r => setTimeout(r, 10));
      const t = day.trangThaiHangDoi();
      if (!t.dangChay && !t.dangCho) return;
    }
  };
  const lay = () => { const r = thay.slice().sort(); thay = []; return r; };
  const soDong = (id) => db.count('SELECT COUNT(*) FROM push_dang_ky WHERE userId = ?', [id]);
  (async () => {
    const kq = {};
    // p1 là bố mẹ của bé s1 (hai máy), p2 là bố mẹ của bé s3 (một máy).
    // Cả hai đang đăng nhập: từ Đ255, người không còn phiên nào thì máy của họ
    // thôi nhận tin về bé (test/het-phien-thoi-day.test.mjs canh riêng).
    const auth = require('./lib/auth');
    auth.createSession('p1'); auth.createSession('p2');
    dk('p1', 'p1-a'); dk('p1', 'p1-b'); dk('p2', 'p2-a');

    kq.dangMo = await day.guiChoNguoi('p1', goi); kq.dangMoGoi = lay();

    db.update('users', 'p1', { active: false });
    kq.daKhoa = await day.guiChoNguoi('p1', goi); kq.daKhoaGoi = lay();
    kq.soDongSauKhoa = soDong('p1');

    kq.nhieuNguoi = day.guiChoNhieuNguoi(['p1', 'p2'], goi); await lang(); kq.nhieuNguoiGoi = lay();
    day.guiChoGiaDinhCuaBe('s1', goi); await lang(); kq.beCuaNguoiKhoaGoi = lay();
    day.guiChoGiaDinhCuaBe('s3', goi); await lang(); kq.beCuaNguoiMoGoi = lay();

    db.update('users', 'p1', { active: true });
    kq.moLai = await day.guiChoNguoi('p1', goi); kq.moLaiGoi = lay();

    process.stdout.write(JSON.stringify(kq));
    db.close();
  })();
`], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR2 } });
const kq = JSON.parse(ra);
const A = 'https://day.example.invalid/p1-a';
const B = 'https://day.example.invalid/p1-b';
const C = 'https://day.example.invalid/p2-a';
const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n[5] Tài khoản đang hoạt động: mỗi máy nhận đúng một lượt');
{
  check('gọi dịch vụ đẩy đúng một lần cho mỗi máy', bang(kq.dangMoGoi, [A, B]), kq.dangMoGoi);
  check('và báo gửi được hai', kq.dangMo.guiDuoc === 2 && kq.dangMo.hong === 0, kq.dangMo);
}

console.log('\n[6] Tài khoản đã khoá: không gọi dịch vụ đẩy, nhưng đăng ký còn nguyên');
{
  check('gửi cho đúng người đã khoá → KHÔNG lượt nào đi', bang(kq.daKhoaGoi, []), kq.daKhoaGoi);
  check('kết quả báo 0 gửi được, 0 hỏng', kq.daKhoa.guiDuoc === 0 && kq.daKhoa.hong === 0, kq.daKhoa);
  check('đăng ký của người đã khoá KHÔNG bị xoá (mở lại là nhận lại)', kq.soDongSauKhoa === 2, kq.soDongSauKhoa);
  check('gửi hàng loạt: chỉ máy của người còn hoạt động nhận', bang(kq.nhieuNguoiGoi, [C]), kq.nhieuNguoiGoi);
  check('gửi hàng loạt vẫn trả về số người đã xếp hàng như cũ', kq.nhieuNguoi === 2, kq.nhieuNguoi);
  check('tin về bé có bố mẹ đã khoá tài khoản → không lượt nào đi', bang(kq.beCuaNguoiKhoaGoi, []), kq.beCuaNguoiKhoaGoi);
  check('tin về bé có bố mẹ còn hoạt động → vẫn đi', bang(kq.beCuaNguoiMoGoi, [C]), kq.beCuaNguoiMoGoi);
}

console.log('\n[7] Mở lại tài khoản thì nhận lại, không phải bật lại trên từng máy');
{
  check('mở lại → cả hai máy lại nhận', bang(kq.moLaiGoi, [A, B]) && kq.moLai.guiDuoc === 2, { goi: kq.moLaiGoi, kq: kq.moLai });
}

donThuMucTam(DIR2);
tongKet();
