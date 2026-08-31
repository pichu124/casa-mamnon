// Kiểm thử bảo mật giai đoạn 4: băm mật khẩu, phiên bền vững, chống dò, header.
// Tự chạy máy chủ riêng trên cổng 3200 với thư mục dữ liệu sạch, nên chạy lại
// bao nhiêu lần cũng cho kết quả như nhau và không đụng tới dữ liệu đang dùng.
//
// Chạy bằng:  npm run test:bao-mat
import fs from 'fs';
import { spawn } from 'child_process';
import { GOC, thuMucTam, donThuMucTam } from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3200);
const BASE = `http://localhost:${PORT}`;
const TEST_DIR = thuMucTam('bao-mat');
const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: TEST_DIR };

async function startServer() {
  const proc = spawn('node', ['server.js'], { cwd: GOC, env: ENV, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 250));
    try { if ((await fetch(BASE + '/healthz')).ok) return proc; } catch {}
  }
  throw new Error('Máy chủ thử không khởi động được');
}
let server = await startServer();
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0, 220) : ''}`); console.log('  ✗', n, x ?? ''); } };

async function req(method, path, { body, cookie, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => {
  const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null };
};

console.log('\n[1] Mật khẩu được băm, không lưu dạng đọc được');
{
  // Mở thẳng cơ sở dữ liệu ở chế độ chỉ đọc để xem mật khẩu được lưu thế nào.
  const { default: Database } = await import('better-sqlite3');
  const raw = new Database(`${TEST_DIR}/school.db`, { readonly: true });
  const users = raw.prepare('SELECT username, passwordHash FROM users').all();
  check('có đủ tài khoản trong cơ sở dữ liệu', users.length >= 8, users.length);
  check('mọi tài khoản đều được băm bằng scrypt',
    users.every(u => String(u.passwordHash).startsWith('scrypt$16384$')), users.length);
  check('không tài khoản nào lưu mật khẩu đọc được',
    users.every(u => !String(u.passwordHash).includes('123456')));
  const cols = raw.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  check('bảng người dùng không có cột lưu mật khẩu thô', !cols.includes('password'), cols.join(','));
  raw.close();
}

console.log('\n[2] Đăng nhập bằng mật khẩu đã băm');
{
  const ok = await login('phuhuynh', '123456');
  check('đăng nhập đúng mật khẩu → 200', ok.status === 200, ok.status);
  check('phản hồi KHÔNG chứa passwordHash', ok.data && !('passwordHash' in ok.data.user) && !('password' in ok.data.user), Object.keys(ok.data?.user || {}));
  const bad = await req('POST', '/api/auth/login', { body: { username: 'phuhuynh', password: 'sai-mat-khau' } });
  check('sai mật khẩu → 401', bad.status === 401, bad.status);
  check('thông báo lỗi không tiết lộ tài khoản có thật', /Sai tên đăng nhập hoặc mật khẩu/.test(bad.data?.error || ''), bad.data);
}

console.log('\n[3] Cookie phiên an toàn');
{
  const r = await login('giaovien', '123456');
  check('cookie có HttpOnly (JS không đọc được)', /HttpOnly/i.test(r.setCookie || ''), r.setCookie);
  check('cookie có SameSite=Lax (chống CSRF cơ bản)', /SameSite=Lax/i.test(r.setCookie || ''));
  check('cookie có hạn dùng 7 ngày', /Max-Age=604800/.test(r.setCookie || ''));
  check('qua HTTP nội bộ KHÔNG gắn Secure (để dùng LAN được)', !/Secure/i.test(r.setCookie || ''));
  // Giả lập truy cập qua HTTPS sau reverse proxy
  const https = await req('POST', '/api/auth/login', {
    body: { username: 'giaovien', password: '123456' },
    headers: { 'X-Forwarded-Proto': 'https' },
  });
  check('qua HTTPS thì cookie có gắn Secure', /Secure/i.test(https.setCookie || ''), https.setCookie);
  check('qua HTTPS có header HSTS', !!https.headers.get('strict-transport-security'));
}

console.log('\n[4] Header bảo mật');
{
  const r = await fetch(BASE + '/');
  check('X-Content-Type-Options: nosniff', r.headers.get('x-content-type-options') === 'nosniff');
  check('X-Frame-Options: DENY (chống nhúng trang lạ)', r.headers.get('x-frame-options') === 'DENY');
  check('có Content-Security-Policy', (r.headers.get('content-security-policy') || '').includes("default-src 'self'"));
  check('CSP chặn nhúng iframe (frame-ancestors none)', (r.headers.get('content-security-policy') || '').includes("frame-ancestors 'none'"));
  check('không lộ Express qua X-Powered-By', !r.headers.get('x-powered-by'));
  const api = await fetch(BASE + '/api/auth/me');
  check('API có Cache-Control: no-store (không lưu dữ liệu riêng tư)', api.headers.get('cache-control') === 'no-store');
}

console.log('\n[5] Đổi mật khẩu');
{
  const s = await login('ph.tuan', '123456');
  const weak = await req('POST', '/api/auth/change-password', { cookie: s.cookie, body: { currentPassword: '123456', newPassword: 'abc' } });
  check('từ chối mật khẩu quá ngắn', weak.status === 400, weak.data);
  const noDigit = await req('POST', '/api/auth/change-password', { cookie: s.cookie, body: { currentPassword: '123456', newPassword: 'chionchuthoi' } });
  check('từ chối mật khẩu không có chữ số', noDigit.status === 400, noDigit.data);
  const wrongCur = await req('POST', '/api/auth/change-password', { cookie: s.cookie, body: { currentPassword: 'sai', newPassword: 'truong2026' } });
  check('từ chối khi mật khẩu hiện tại sai', wrongCur.status === 400, wrongCur.data);

  // Phiên thứ hai để kiểm tra việc đăng xuất thiết bị khác
  const other = await login('ph.tuan', '123456');
  const okChange = await req('POST', '/api/auth/change-password', { cookie: s.cookie, body: { currentPassword: '123456', newPassword: 'truong2026' } });
  check('đổi mật khẩu hợp lệ → 200', okChange.status === 200, okChange.data);

  const oldPw = await req('POST', '/api/auth/login', { body: { username: 'ph.tuan', password: '123456' } });
  check('mật khẩu cũ không dùng được nữa', oldPw.status === 401, oldPw.status);
  const newPw = await login('ph.tuan', 'truong2026');
  check('mật khẩu mới đăng nhập được', newPw.status === 200, newPw.status);

  const otherAfter = await req('GET', '/api/auth/me', { cookie: other.cookie });
  check('thiết bị khác bị đăng xuất sau khi đổi', otherAfter.status === 401, otherAfter.status);
  const meAfter = await req('GET', '/api/auth/me', { cookie: s.cookie });
  check('thiết bị vừa đổi vẫn giữ đăng nhập', meAfter.status === 200, meAfter.status);

}

console.log('\n[7] Health check — mở cho bộ theo dõi, KÍN với người lạ');
{
  // Đường này bắt buộc phải mở cho người chưa đăng nhập: `render.yaml` dùng nó
  // làm `healthCheckPath`, `Dockerfile` dùng làm HEALTHCHECK. Nhưng bộ theo dõi
  // chỉ đọc MÃ TRẢ VỀ, không đọc phần thân.
  //
  // Bản trước trả luôn `uptime` và `sessions` cho bất kỳ ai hỏi — và bài này
  // khẳng định điều đó là ĐÚNG. Khi app ra Internet, mỗi lượt quét cổng đọc
  // được máy chủ vừa khởi động lại lúc nào, còn `sessions` thì nhích lên nhích
  // xuống theo từng lần cô hay phụ huynh đăng nhập. Không có dữ liệu của bé nào
  // ở đây, nhưng đó là thông tin vận hành của trường, rơi ra miễn phí.
  const r = await req('GET', '/healthz');
  check('/healthz trả 200 cho người chưa đăng nhập (bộ theo dõi cần đúng cái này)',
    r.status === 200 && r.data?.ok === true, r.data);
  check('KHÔNG lộ uptime cho người lạ', r.data?.uptime === undefined, r.data);
  check('KHÔNG lộ số phiên đang mở cho người lạ', r.data?.sessions === undefined, r.data);

  // Phụ huynh và cô cũng không cần biết — chỉ quản trị mới cần để chẩn đoán.
  const ph = await login('phuhuynh', '123456');
  const rPh = await req('GET', '/healthz', { cookie: ph.cookie });
  check('phụ huynh đăng nhập rồi cũng không thấy thông tin vận hành',
    rPh.data?.uptime === undefined && rPh.data?.sessions === undefined, rPh.data);
}

console.log('\n[8] Phiên và dữ liệu sống sót qua khởi động lại máy chủ');
{
  const s = await login('phuhuynh2', '123456');
  check('đăng nhập trước khi khởi động lại', s.status === 200, s.status);

  // Tạo một bản ghi ngay trước khi tắt, để kiểm tra dữ liệu có kịp lưu không.
  const made = await req('POST', '/api/leave', {
    cookie: s.cookie,
    body: { studentId: 's3', fromDate: '2026-09-01', toDate: '2026-09-01', reason: 'Kiểm tra lưu dữ liệu khi tắt máy chủ' },
  });
  check('tạo được bản ghi mới', made.status === 200 || made.status === 201, made.status);

  // Tắt êm bằng SIGTERM — đúng tín hiệu Render/Railway gửi khi deploy lại.
  server.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 1500));
  server = await startServer();

  const after = await req('GET', '/api/auth/me', { cookie: s.cookie });
  check('sau khi khởi động lại vẫn còn đăng nhập', after.status === 200, after.status);
  check('đúng người dùng cũ', after.data?.user?.username === 'phuhuynh2', after.data?.user?.username);

  const leaves = await req('GET', '/api/leave', { cookie: s.cookie });
  const kept = Array.isArray(leaves.data) && leaves.data.some(l => /Kiểm tra lưu dữ liệu/.test(l.reason || ''));
  check('bản ghi tạo trước khi tắt không bị mất', kept, leaves.data?.length);
}

// Để cuối cùng: phần này khóa địa chỉ IP nên sẽ chặn mọi lần đăng nhập sau đó.
console.log('\n[9] Chống dò mật khẩu');
{
  let lockedAt = 0;
  for (let i = 1; i <= 12; i++) {
    const r = await req('POST', '/api/auth/login', { body: { username: 'ph.lan', password: `sai-${i}` } });
    if (r.status === 429) { lockedAt = i; break; }
  }
  check('bị khóa sau nhiều lần sai liên tiếp', lockedAt > 0 && lockedAt <= 10, `khóa ở lần thứ ${lockedAt}`);
  const blocked = await req('POST', '/api/auth/login', { body: { username: 'ph.lan', password: '123456' } });
  check('khi đang khóa thì mật khẩu ĐÚNG cũng bị chặn', blocked.status === 429, blocked.status);
  check('thông báo khóa bằng tiếng Việt, có nêu thời gian', /phút/.test(blocked.data?.error || ''), blocked.data);
}

console.log('\n[+] /modules CHỈ ĐƯỢC PHỤC VỤ view.js — mã nguồn và lược đồ không được tải về');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `server.js` chặn bằng `setHeaders(res, filePath) { if (!filePath.endsWith('view.js'))
  // res.status(404); }`. Nhưng `setHeaders` chạy TRƯỚC khi luồng tệp được mở —
  // send gọi `setHeader()` rồi mới `stream()` — nên nó chỉ đổi con số ở dòng
  // đầu, THÂN TỆP VẪN GỬI ĐI ĐỦ. Mã 404 làm chuyện này khó thấy chứ không chặn
  // được gì.
  //
  // `schema.sql` lộ toàn bộ tên bảng và tên cột; `routes.js` lộ đúng chỗ nào
  // canh quyền và canh bằng gì. Đây là bản đồ cho người muốn tìm lỗ tiếp theo.
  const doc = async (duong, cookie) => {
    const r = await fetch(BASE + duong, { headers: cookie ? { Cookie: cookie } : {} });
    return { status: r.status, than: await r.text() };
  };

  // VẾ KHẲNG ĐỊNH TRƯỚC: view.js PHẢI tải về được, nếu không cả app hỏng.
  const view = await doc('/modules/thuchup/view.js');
  check('view.js của phân hệ vẫn tải về được bình thường',
    view.status === 200 && view.than.includes('App.views'), `${view.status} ${view.than.slice(0, 80)}`);

  for (const tep of ['routes.js', 'schema.sql', 'module.json']) {
    const r = await doc(`/modules/thuchup/${tep}`);
    check(`/modules/thuchup/${tep} → 404`, r.status === 404, r.status);
    // ĐÂY MỚI LÀ PHÉP KIỂM THẬT: đo THÂN phản hồi, không đo con số ở dòng đầu.
    check(`và KHÔNG gửi kèm nội dung tệp ${tep}`,
      r.than.length < 200 && !/db\.all|CREATE TABLE|"key"/.test(r.than),
      `${r.than.length} byte: ${r.than.slice(0, 120)}`);
  }

  // Và chưa đăng nhập cũng vậy — đây là đường tĩnh, không qua tầng phiên.
  const chuaDangNhap = await doc('/modules/hanhtrinh/schema.sql');
  check('chưa đăng nhập cũng không tải được lược đồ của phân hệ',
    chuaDangNhap.status === 404 && !/CREATE TABLE/.test(chuaDangNhap.than),
    `${chuaDangNhap.status} ${chuaDangNhap.than.slice(0, 120)}`);
}

// ===========================================================================
console.log('\n[+] MÁY DÙNG CHUNG: đăng xuất rồi người khác vào, KHÔNG được thấy album của người trước');
{
  // App.logout() CỐ Ý không tải lại trang (xem chú thích ở public/js/app.js),
  // nên mọi màn hình là một đối tượng sống suốt vòng đời trang. Màn Album giữ
  // phần đã tải trong `_daTai` để làm nút "Xem album cũ hơn". Máy tính dùng
  // chung ở phòng hành chính là chuyện thường ở trường.
  //
  // Chỗ vỡ nằm ở đúng đường ấy: nút "xem cũ hơn" đặt `_giuTrang = true` RỒI mới
  // gọi App.route(). Phiên bị đổi đúng giữa hai bước đó thì phần cũ được giữ
  // lại và trộn vào danh sách của người mới. Ảnh khuôn mặt trẻ thì không có
  // "xác suất thấp" nào là chấp nhận được.
  //
  // Bài này CHẠY THẬT mã của màn hình trong một hộp cách ly, không dò chữ:
  // nạp public/js/views/albums.js với App/API/UI giả, rồi dựng lại đúng cảnh đó.
  const vm = await import('node:vm');
  const nguon = fs.readFileSync(`${GOC}/public/js/views/albums.js`, 'utf8');

  // UI giả: hàm nào cũng trả chuỗi rỗng, đủ để renderList chạy hết.
  const UI = new Proxy({}, { get: () => (() => '') });
  let traVe = [];                      // album mà "máy chủ" trả về cho lượt tải
  const API = { get: async () => traVe };
  const document = { getElementById: () => null };
  const App = { views: {}, state: { user: null }, route: () => {} };
  const hop = { App, API, UI, document, console };
  vm.createContext(hop);
  vm.runInContext(nguon, hop);
  const man = App.views.albums;
  check('nạp được mã màn Album vào hộp cách ly', !!man && typeof man.renderList === 'function');

  // Cô Lan đăng nhập, xem album, rồi bấm "xem cũ hơn" — `_giuTrang` bật lên.
  App.state.user = { id: 't1', role: 'parent' };
  traVe = [{ id: 'al-cua-co-lan', name: 'Ảnh nhóm Chồi 2', photos: [] }];
  await man.renderList({ innerHTML: '' });
  check('người thứ nhất tải được album của mình', man._daTai.length === 1, man._daTai.length);
  man._giuTrang = true;   // đúng trạng thái sau khi bấm "Xem album cũ hơn"

  // Đăng xuất, người khác đăng nhập trên cùng máy, và App.route() chạy tiếp.
  App.state.user = { id: 'p9', role: 'parent' };
  traVe = [{ id: 'al-cua-nha-khac', name: 'Ảnh nhóm Lá 1', photos: [] }];
  await man.renderList({ innerHTML: '' });

  const con = man._daTai.map(a => a.id);
  check('NGƯỜI MỚI KHÔNG THẤY ALBUM CỦA NGƯỜI TRƯỚC',
    !con.includes('al-cua-co-lan'), con);
  check('và vẫn thấy đúng album của mình', con.includes('al-cua-nha-khac'), con);
  check('phần đã tải nay ghi rõ là của ai', man._cuaAi === 'p9', man._cuaAi);

  // Cùng một người thì nút "xem cũ hơn" phải CÒN CHẠY — vá lỗ không được làm
  // hỏng việc đang chạy.
  traVe = [{ id: 'al-trang-hai', name: 'Album cũ hơn', photos: [] }];
  await man.taiThem();            // đúng việc nút "Xem album cũ hơn" làm
  man._giuTrang = true;           // rồi mới vẽ lại màn
  await man.renderList({ innerHTML: '' });
  check('CÙNG MỘT NGƯỜI thì "xem album cũ hơn" vẫn cộng dồn như cũ',
    man._daTai.map(a => a.id).join(',') === 'al-cua-nha-khac,al-trang-hai',
    man._daTai.map(a => a.id));
}

server.kill('SIGTERM');
donThuMucTam(TEST_DIR);

console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
