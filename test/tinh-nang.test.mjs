// Kiểm thử hệ thống bật/tắt phân hệ và cắm thêm tính năng mới.
//
// Chạy bằng:  npm run test:tinh-nang
//
// Bài kiểm thử tự dựng máy chủ riêng trên cổng 3700 với một cơ sở dữ liệu tạm,
// nên KHÔNG đụng gì tới dữ liệu thật của trường. Chạy lại bộ này mỗi khi cắm
// thêm một phân hệ mới để chắc chắn phần đang chạy không bị ảnh hưởng.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam, MAU, datChucVu,
} from './_chung.mjs';
const PORT = Number(process.env.TEST_PORT || 3700);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('tinh-nang');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,250) : ''}`); console.log('  ✗', n, x ?? ''); } };

execSync('node data/seed.js --force', {
  cwd: GOC,
  // Tắt dữ liệu mẫu của phân hệ — cùng lý do với `sinhDuLieu` trong
  // test/_chung.mjs: bộ test dựng trên nền phân hệ chưa có dòng nào.
  env: { ...process.env, DATA_DIR: DIR, CASA_SEED_PHAN_HE: '0' },
});
const out = execSync('node scripts/create-admin.js "Hiệu Trưởng" hieutruong', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString();
const adminPw = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];

let server;
async function start() {
  server = spawn('node', ['server.js'], { cwd: GOC, stdio: 'ignore',
    env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR } });
  for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); try { if ((await fetch(BASE + '/healthz')).ok) return; } catch {} }
  throw new Error('máy chủ không khởi động');
}
await start();
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => { const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null }; };

let A = await login('hieutruong', adminPw);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'hieutruong2026' } });
A = await login('hieutruong', 'hieutruong2026');
const T = (await login('giaovien', '123456')).cookie;
const P = (await login('phuhuynh', '123456')).cookie;

console.log('\n[1] Danh sách phân hệ');
{
  const r = await req('GET', '/api/modules', { cookie: P });
  // Con số hạ 14 → 13 khi tắt sẵn "Hồ sơ con đã ra trường" (Đ5): phân hệ đó là
  // của app 1 và màn của nó bày ra học bạ, học kỳ, điểm từng môn cho gia đình.
  // Dữ liệu giữ nguyên, bật lại được — chỉ là không còn nằm trong số mặc định.
  check('phụ huynh lấy được danh sách', r.status === 200 && r.data.length >= 13, r.data?.length);
  check('màn học bạ của app 1 KHÔNG còn bật sẵn cho gia đình',
    !r.data.some(m => m.key === 'hocsinhcu'), r.data.filter(m => m.key === 'hocsinhcu'));
  check('mặc định các phân hệ lõi đều bật', r.data.some(m => m.key === 'diemdanh'));
  // TỪ Đ146 PHÂN HỆ CẮM THÊM MẶC ĐỊNH BẬT.
  //
  // Trước đó cả chín ghi `defaultEnabled: false`: quy ước thừa kế từ ví dụ đầu
  // tiên (`modules/hocphi/`, commit B6 ngày 13/08) khi cơ chế cắm thêm mới dựng
  // và ý là "nhà trường tự chọn dùng phần nào". Nhưng suốt hai buổi trường bấm
  // thử, không ai bật, nên trường mở app ra không thấy Nhật ký, Kế hoạch,
  // Cambridge — rồi hỏi "sao chưa thấy phần chụp ảnh". Chủ dự án chốt bật cả
  // chín. Tắt vẫn tắt được bất cứ lúc nào ở Quản trị → Tính năng, và mục [5]
  // bên dưới vẫn đi đủ đường tắt → API bị chặn → bật → chạy lại.
  check('phân hệ cắm thêm mặc định BẬT nên gia đình thấy ngay',
    r.data.some(m => m.key === 'hocphi'), r.data.map(m => m.key));

  const adm = await req('GET', '/api/admin/modules', { cookie: A.cookie });
  check('quản trị thấy toàn bộ kèm trạng thái', adm.status === 200 && adm.data.length >= 15, adm.data?.length);
  check('quản trị thấy phân hệ cắm thêm kèm trạng thái đang bật',
    adm.data.some(m => m.key === 'hocphi' && m.enabled === true),
    adm.data.filter(m => m.key === 'hocphi'));
  check('và vẫn thấy được phân hệ nhà trường đã TẮT, kèm trạng thái',
    adm.data.some(m => m.key === 'nenep' && m.enabled === false),
    adm.data.filter(m => m.key === 'nenep'));
  check('phân hệ lõi được đánh dấu không thể tắt', adm.data.find(m => m.key === 'hocsinh')?.required === true);
  const ph = await req('GET', '/api/admin/modules', { cookie: P });
  check('phụ huynh KHÔNG xem được trang quản trị phân hệ → 403', ph.status === 403, ph.status);
}

let soBanGhiTruocKhiTat = -1; // dùng lại ở [3] để đối chiếu dữ liệu trước/sau

console.log('\n[2] Tắt một phân hệ — chặn cả API chứ không chỉ giấu giao diện');
{
  const before = await req('GET', '/api/attendance?studentId=s1', { cookie: P });
  check('trước khi tắt: xem điểm danh bình thường', before.status === 200, before.status);
  soBanGhiTruocKhiTat = before.data?.length ?? -1;
  check('có sẵn dữ liệu điểm danh để đối chiếu', soBanGhiTruocKhiTat > 0, soBanGhiTruocKhiTat);

  const off = await req('PUT', '/api/admin/modules/diemdanh', { cookie: A.cookie, body: { enabled: false } });
  check('tắt phân hệ Điểm danh → 200', off.status === 200, off.data);

  const after = await req('GET', '/api/attendance?studentId=s1', { cookie: P });
  check('sau khi tắt: API bị chặn (404)', after.status === 404, after.status);
  check('báo lỗi giải thích rõ cho người dùng', /tắt/.test(after.data?.error || ''), after.data);

  // Ngày là HÔM NAY: từ Đ127 sổ điểm danh chỉ ghi được trong ngày, nên một
  // ngày cố định sẽ bị chặn vì lý do KHÁC với lý do mục này đang đo (phân hệ
  // đang tắt thì mọi đường /api/attendance đều 404).
  const post = await req('POST', '/api/attendance/mark',
    { cookie: T, body: { studentId: 's1', date: new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10), status: 'present' } });
  check('cả đường ghi dữ liệu cũng bị chặn', post.status === 404, post.status);

  const list = await req('GET', '/api/modules', { cookie: P });
  check('phân hệ đã tắt biến khỏi danh sách của người dùng',
    !list.data.some(m => m.key === 'diemdanh'), list.data?.map(m => m.key));

  const khac = await req('GET', '/api/health?studentId=s1', { cookie: P });
  check('các phân hệ khác KHÔNG bị ảnh hưởng', khac.status === 200, khac.status);
  const auth = await req('GET', '/api/auth/me', { cookie: P });
  check('đăng nhập và hệ thống vẫn chạy bình thường', auth.status === 200, auth.status);
}

console.log('\n[3] Bật lại — dữ liệu cũ còn nguyên');
{
  const on = await req('PUT', '/api/admin/modules/diemdanh', { cookie: A.cookie, body: { enabled: true } });
  check('bật lại → 200', on.status === 200);
  const r = await req('GET', '/api/attendance?studentId=s1', { cookie: P });
  check('API dùng lại được ngay', r.status === 200, r.status);
  check('dữ liệu điểm danh cũ vẫn còn nguyên',
    r.data.length === soBanGhiTruocKhiTat, `${r.data?.length} / ${soBanGhiTruocKhiTat}`);
}

console.log('\n[4] Không cho tắt phân hệ lõi');
{
  const r = await req('PUT', '/api/admin/modules/hocsinh', { cookie: A.cookie, body: { enabled: false } });
  check('chặn tắt phân hệ Học sinh → 400', r.status === 400, r.data);
  check('giải thích vì sao không tắt được', /lõi/.test(r.data?.error || ''), r.data);
  const hs = await req('GET', '/api/students', { cookie: P });
  check('phân hệ lõi vẫn chạy', hs.status === 200);

  const la = await req('PUT', '/api/admin/modules/khong-ton-tai', { cookie: A.cookie, body: { enabled: true } });
  check('mã phân hệ không tồn tại → 400', la.status === 400, la.status);
  const boi = await req('PUT', '/api/admin/modules/diemdanh', { cookie: T, body: { enabled: false } });
  check('giáo viên KHÔNG bật/tắt được → 403', boi.status === 403, boi.status);
}

console.log('\n[5] Phân hệ cắm thêm: bật lên là dùng được ngay');
{
  // TỰ TẮT TRƯỚC, KHÔNG DỰA VÀO MẶC ĐỊNH.
  //
  // Mục này canh CƠ CHẾ tắt/bật, không canh giá trị mặc định — nên nó phải tự
  // dựng lấy trạng thái tắt. Bản cũ mượn `defaultEnabled: false` làm điều kiện
  // đầu vào, nên ngày Đ146 đổi mặc định là mục này đỏ, dù cơ chế không hỏng gì.
  const tatTruoc = await req('PUT', '/api/admin/modules/hocphi', { cookie: A.cookie, body: { enabled: false } });
  check('tắt Học phí để dựng điều kiện đầu vào → 200', tatTruoc.status === 200, tatTruoc.data);

  const truoc = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('khi đang tắt: API của phân hệ mới bị chặn', truoc.status === 404, truoc.status);
  const dsTat = await req('GET', '/api/modules', { cookie: P });
  check('và nó biến khỏi màn hình chính của gia đình',
    !dsTat.data.some(m => m.key === 'hocphi'), dsTat.data?.map(m => m.key));

  const on = await req('PUT', '/api/admin/modules/hocphi', { cookie: A.cookie, body: { enabled: true } });
  check('bật phân hệ Học phí → 200', on.status === 200, on.data);

  const sau = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('API của phân hệ mới hoạt động', sau.status === 200, sau.data);
  check('trả về đúng cấu trúc dữ liệu riêng của nó',
    Array.isArray(sau.data?.khoan) && sau.data.tongChuaNop === 0, sau.data);

  const list = await req('GET', '/api/modules', { cookie: P });
  const hp = list.data.find(m => m.key === 'hocphi');
  check('xuất hiện trên màn hình chính của phụ huynh', !!hp, list.data?.map(m => m.key));
  check('kèm đường dẫn tệp giao diện để tải về',
    String(hp?.viewUrl || '').startsWith('/modules/hocphi/view.js'), hp?.viewUrl);
  // DẤU PHIÊN BẢN, KHÔNG PHẢI TRANG TRÍ.
  //
  // `modules/*/view.js` nằm ngoài `public/`, nên quy định "sửa public/ thì tăng
  // VERSION trong sw.js" không với tới nó. Không có dấu này thì điện thoại đã
  // cài app giữ bản màn hình cũ MÃI: service worker trả bản đã lưu trước, và
  // lần nào cũng vậy. Cô báo "sửa rồi mà máy em vẫn thế", không ai đoán ra.
  check('CÓ DẤU PHIÊN BẢN để máy đã cài app không kẹt ở bản cũ',
    /\?v=\d+$/.test(String(hp?.viewUrl || '')), hp?.viewUrl);

  const js = await fetch(BASE + '/modules/hocphi/view.js', { headers: { Cookie: P } });
  check('tải được tệp giao diện của phân hệ mới', js.status === 200, js.status);
  check('tệp giao diện đăng ký đúng tên view', (await js.text()).includes('App.views.hocphi'));
}

console.log('\n[6] Phân hệ mới dùng chung cơ chế phân quyền của phần lõi');
{
  // Mục này canh CƠ CHẾ CẮM THÊM: một phân hệ mới dùng lại đúng hàm kiểm quyền
  // của phần lõi, không tự viết lấy. Nghiệp vụ riêng của sổ tiền nằm ở
  // `test/hoc-phi.test.mjs`.
  //
  // Từ đợt Đ42, ghi sổ tiền là việc của VĂN PHÒNG chứ không phải của cô — nên
  // vai dùng để tạo khoản ở đây đổi từ `T` sang `A.cookie`. Đây là siết chặt
  // chứ không phải nới: phép kiểm "cô tạo được" bên dưới đổi thành "cô KHÔNG
  // tạo được", và ranh giới nhóm vẫn được canh y như cũ bằng vai văn phòng.
  const coTao = await req('POST', '/api/hocphi', { cookie: T,
    body: { studentId: 's1', kyThu: 'x', noiDung: 'y', soTien: 1000 } });
  check('CÔ KHÔNG tạo được khoản thu → 403 (Đ42)', coTao.status === 403, coTao.status);

  const tao = await req('POST', '/api/hocphi', { cookie: A.cookie,
    body: { studentId: 's1', kyThu: 'Tháng 9/2026', noiDung: 'Tiền ăn bán trú', soTien: 500000, hanNop: '2026-09-10' } });
  check('văn phòng tạo được khoản thu → 201', tao.status === 201, tao.data);

  const phTao = await req('POST', '/api/hocphi', { cookie: P,
    body: { studentId: 's1', kyThu: 'x', noiDung: 'y', soTien: 1000 } });
  check('phụ huynh KHÔNG tạo được khoản thu → 403', phTao.status === 403, phTao.status);

  const xemTrom = await req('GET', '/api/hocphi?studentId=s3', { cookie: P });
  check('phụ huynh KHÔNG xem được học phí con nhà khác → 403', xemTrom.status === 403, xemTrom.status);

  // Ranh giới NHÓM vẫn phải được canh — chỗ này mới là cái mục [6] tồn tại vì
  // nó: phân hệ cắm thêm gọi `db.canAccessStudent` của phần lõi chứ không tự
  // nghĩ ra luật riêng. Đo bằng vai cô, trên đường ĐỌC.
  const doc = await req('GET', '/api/hocphi?studentId=s1', { cookie: T });
  check('cô đọc được sổ tiền của bé nhóm mình', doc.status === 200, doc.status);
  const docLopKhac = await req('GET', '/api/hocphi?studentId=s2', { cookie: T });
  check('cô KHÔNG đọc được sổ tiền của bé nhóm khác → 403', docLopKhac.status === 403, docLopKhac.status);

  const xem = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('phụ huynh xem được khoản thu của con mình', xem.data?.khoan?.length === 1, xem.data?.khoan?.length);
  check('tính đúng số tiền còn phải nộp', xem.data?.tongChuaNop === 500000, xem.data?.tongChuaNop);

  const coXn = await req('POST', `/api/hocphi/${tao.data.id}/xac-nhan`, { cookie: T, body: {} });
  check('CÔ KHÔNG xác nhận được đã nhận tiền → 403 (Đ42)', coXn.status === 403, coXn.status);

  const xn = await req('POST', `/api/hocphi/${tao.data.id}/xac-nhan`, { cookie: A.cookie, body: {} });
  check('văn phòng xác nhận đã nhận tiền', xn.status === 200, xn.data);
  const sau = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('sau xác nhận thì hết nợ', sau.data?.tongChuaNop === 0 && sau.data.khoan[0].daNop === true, sau.data);
}

console.log('\n[7] Bảng riêng của phân hệ mới không đụng dữ liệu cũ');
{
  const { default: Database } = await import('better-sqlite3');
  const raw = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const bang = raw.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(r => r.name);
  check('bảng riêng của phân hệ được tạo tự động', bang.includes('hocphi_khoan'), bang.filter(b => b.startsWith('hocphi')));
  check('các bảng lõi vẫn nguyên vẹn',
    ['users', 'students', 'attendance', 'remarks', 'messages'].every(b => bang.includes(b)));
  check('bé không bị mất', raw.prepare('SELECT COUNT(*) c FROM students').get().c === MAU.soBe);
  raw.close();
}

console.log('\n[8] Trạng thái giữ nguyên sau khi khởi động lại máy chủ');
{
  await req('PUT', '/api/admin/modules/xebuyt', { cookie: A.cookie, body: { enabled: false } });
  server.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 1500));
  await start();

  const A2 = await login('hieutruong', 'hieutruong2026');
  const adm = await req('GET', '/api/admin/modules', { cookie: A2.cookie });
  check('phân hệ đã tắt vẫn tắt sau khởi động lại',
    adm.data.find(m => m.key === 'xebuyt')?.enabled === false, adm.data?.find(m => m.key === 'xebuyt'));
  check('phân hệ đã bật vẫn bật', adm.data.find(m => m.key === 'hocphi')?.enabled === true);
  const bus = await req('GET', '/api/bus', { cookie: (await login('phuhuynh', '123456')).cookie });
  check('API của phân hệ tắt vẫn bị chặn', bus.status === 404, bus.status);

  const log = await req('GET', '/api/admin/audit', { cookie: A2.cookie });
  check('nhật ký ghi lại việc bật/tắt tính năng',
    log.data.some(r => r.action === 'module-disable' || r.action === 'module-enable'));
}

console.log('\n[9] Phân hệ hỏng không làm sập ứng dụng');
{
  const xau = path.join(GOC, 'modules', 'loi-thu-nghiem');
  fs.mkdirSync(xau, { recursive: true });
  fs.writeFileSync(`${xau}/module.json`, JSON.stringify({ key: 'loithu', name: 'Phân hệ lỗi', hash: '#/loithu' }));
  fs.writeFileSync(`${xau}/routes.js`, 'module.exports = () => { throw new Error("cố tình hỏng"); };');

  server.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 1500));
  await start();

  const A3 = await login('hieutruong', 'hieutruong2026');
  check('máy chủ vẫn khởi động được dù có phân hệ hỏng', A3.status === 200, A3.status);
  const P3 = (await login('phuhuynh', '123456')).cookie;
  check('người dùng vẫn đăng nhập bình thường', !!P3);
  check('các phân hệ khác vẫn chạy', (await req('GET', '/api/health?studentId=s1', { cookie: P3 })).status === 200);
  const adm = await req('GET', '/api/admin/modules', { cookie: A3.cookie });
  const loi = adm.data.find(m => m.key === 'loithu');
  check('quản trị thấy phân hệ hỏng và lý do', !!loi?.loi, loi);
  const nd = await req('GET', '/api/modules', { cookie: P3 });
  check('phân hệ hỏng không hiện với người dùng', !nd.data.some(m => m.key === 'loithu'));

  fs.rmSync(xau, { recursive: true, force: true });
}

console.log('\n[10] Bốn phân hệ TẮT SẴN, nhưng dữ liệu còn nguyên (N3 · A2)');
{
  // VÌ SAO CÓ MỤC NÀY
  //
  // Nhà trường đã quyết tắt sẵn hai phân hệ này vì chúng xếp trẻ trên dưới
  // nhau — đi ngược QUY TẮC 4. Đây là BƯỚC 1 trong ba bước "bỏ một tính năng"
  // của CLAUDE.md, và cả ba lời hứa của bước đó phải được canh bằng máy, không
  // phải bằng trí nhớ:
  //
  //   1. tắt thật — màn hình biến mất VÀ API bị chặn;
  //   2. DỮ LIỆU GIỮ NGUYÊN, không mất một dòng nào;
  //   3. bật lại được bất cứ lúc nào, và bật xong là chạy như cũ.
  //
  // Thiếu bất kỳ vế nào thì "tắt" đã lặng lẽ biến thành "xóa".
  const ds = (await req('GET', '/api/modules', { cookie: P })).data;
  const co = (k) => ds.some((m) => m.key === k);
  check('phụ huynh KHÔNG thấy ô Nề nếp trên trang chủ', !co('nenep'), ds.map((m) => m.key));
  check('phụ huynh KHÔNG thấy ô Báo cáo trên trang chủ', !co('baocao'), ds.map((m) => m.key));
  check('phụ huynh KHÔNG thấy ô Nhận xét trên trang chủ', !co('nhanxet'), ds.map((m) => m.key));
  check('phụ huynh KHÔNG thấy ô Xe buýt trên trang chủ', !co('xebuyt'), ds.map((m) => m.key));

  // Giấu ô mà vẫn gọi được API thì chưa gọi là tắt.
  check('API Nề nếp bị chặn, không chỉ ẩn biểu tượng',
    (await req('GET', '/api/conduct?studentId=s1', { cookie: P })).status === 404);
  check('API Báo cáo bị chặn, không chỉ ẩn biểu tượng',
    (await req('GET', '/api/reports?studentId=s1', { cookie: P })).status === 404);
  check('API Nhận xét bị chặn, không chỉ ẩn biểu tượng',
    (await req('GET', '/api/remarks?studentId=s1', { cookie: P })).status === 404);
  check('API Xe buýt bị chặn, không chỉ ẩn biểu tượng',
    (await req('GET', '/api/bus', { cookie: P })).status === 404);

  // Các phân hệ khác không được đi theo.
  check('phân hệ khác vẫn bật bình thường', co('diemdanh') && co('yte') && co('album'),
    ds.map((m) => m.key));

  // Quản trị vẫn thấy chúng trong danh sách để bật lại — tắt mà biến mất khỏi
  // cả trang quản trị thì không còn đường quay lại.
  const dsQt = (await req('GET', '/api/admin/modules', { cookie: A.cookie })).data;
  const qt = (k) => dsQt.find((m) => m.key === k);
  check('quản trị VẪN THẤY cả hai trong Quản trị → Tính năng để bật lại',
    !!qt('nenep') && !!qt('baocao'), dsQt.map((m) => m.key));
  check('và thấy đúng trạng thái đang tắt',
    qt('nenep').enabled === false && qt('baocao').enabled === false,
    { nenep: qt('nenep').enabled, baocao: qt('baocao').enabled });

  // LỜI HỨA QUAN TRỌNG NHẤT: dữ liệu không mất.
  const batLai = await req('PUT', '/api/admin/modules/nenep', { cookie: A.cookie, body: { enabled: true } });
  check('bật lại được bằng một lượt bấm', batLai.status === 200, batLai.data);
  const nn = await req('GET', '/api/conduct?studentId=s1', { cookie: P });
  check('bật xong là chạy lại ngay, không cần khởi động lại máy chủ', nn.status === 200, nn.status);
  check('DỮ LIỆU CŨ CÒN NGUYÊN — tắt là ngưng dùng, không phải xóa',
    Array.isArray(nn.data?.records) && nn.data.records.length > 0,
    { so: nn.data?.records?.length });

  // Trả lại trạng thái tắt để mục sau (nếu có) không bị ảnh hưởng.
  await req('PUT', '/api/admin/modules/nenep', { cookie: A.cookie, body: { enabled: false } });
  check('tắt lại được, và lại bị chặn như cũ',
    (await req('GET', '/api/conduct?studentId=s1', { cookie: P })).status === 404);
}

// ===========================================================================
console.log('\n[11] MỌI PHÂN HỆ TRONG THƯ MỤC ĐỀU NẠP ĐƯỢC — không cái nào mang cờ lỗi');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Cơ chế cô lập lỗi nạp từng phân hệ trong một khối bắt lỗi riêng: hỏng một
  // cái thì các cái khác vẫn chạy. Đó là Nguyên tắc số 1 và nó đúng.
  //
  // Nhưng cái giá của nó là SỰ IM LẶNG. Phân hệ hỏng bị gắn cờ `loi`, rồi
  // `lib/modules.js` coi như đang tắt: biểu tượng biến mất khỏi trang chủ, API
  // trả 503. Người của trường thấy y hệt lúc nhà trường chủ động tắt nó.
  //
  // Nghĩa là một lỗi cú pháp trong `modules/<mã>/routes.js` có thể đi qua cả
  // `npm test` mà không bộ nào kêu — vì mọi bộ test phân hệ đều tự bật phân hệ
  // của mình lên, và bộ nào không bật thì không hỏi tới nó bao giờ.
  //
  // Mục này hỏi thẳng máy chủ: trong thư mục `modules/` có bao nhiêu phân hệ,
  // và có cái nào mang cờ lỗi không.
  const thuMuc = fs.readdirSync(path.join(GOC, 'modules'))
    .filter(t => fs.existsSync(path.join(GOC, 'modules', t, 'module.json')));
  const dsQt = (await req('GET', '/api/admin/modules', { cookie: A.cookie })).data || [];

  check('đọc được danh sách phân hệ từ máy chủ', Array.isArray(dsQt) && dsQt.length > 0, dsQt.length);

  // Đối chiếu với THƯ MỤC, không với một danh sách viết tay — nếu không thì
  // thêm phân hệ mới là nó lọt khỏi mục này mà không ai được báo gì.
  const thieu = thuMuc.filter(t => {
    const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules', t, 'module.json'), 'utf8'));
    return !dsQt.some(m => m.key === (mj.key || t));
  });
  check('MỌI PHÂN HỆ CÓ TRONG THƯ MỤC ĐỀU CÓ MẶT TRONG DANH SÁCH',
    thieu.length === 0, thieu);

  // Chỉ xét những phân hệ CÒN TRONG THƯ MỤC. Mục [9] bên trên cố tình dựng một
  // phân hệ hỏng rồi xoá thư mục của nó đi, nhưng máy chủ đang chạy vẫn giữ nó
  // trong bộ nhớ kèm cờ lỗi — đó là hành vi đúng, và lọc theo thư mục thì
  // không phải ghi cứng tên phân hệ thử nào cả.
  const maTrongThuMuc = new Set(thuMuc.map(t => {
    const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules', t, 'module.json'), 'utf8'));
    return mj.key || t;
  }));
  const hong = dsQt.filter(m => m.loi && maTrongThuMuc.has(m.key));
  check('KHÔNG PHÂN HỆ NÀO MANG CỜ LỖI',
    hong.length === 0,
    hong.map(m => `${m.key}: ${m.loi}`));

  // Và chiều còn lại: cờ đó phải thật sự tới được nơi này. Không có phép kiểm
  // này thì hai phép kiểm trên vẫn xanh kể cả khi `loi` không bao giờ được gửi
  // đi — đúng kiểu bài canh luôn đúng.
  check('trường `loi` có thật trong câu trả lời, không phải thứ không tồn tại',
    dsQt.every(m => 'loi' in m), Object.keys(dsQt[0] || {}));

  // Mục [9] bên trên đã dựng một phân hệ hỏng thật và kiểm app không sập. Ở đây
  // chỉ cần chắc rằng nếu điều đó xảy ra thì mục này ĐỎ, chứ không im lặng.
  // Và chắc rằng bộ lọc trên KHÔNG lặng lẽ bỏ qua mọi thứ: phân hệ hỏng của mục
  // [9] vẫn còn trong bộ nhớ máy chủ và vẫn mang cờ lỗi. Nếu nó biến mất luôn
  // thì phép kiểm bên trên đang lọc quá tay và sẽ không bắt được gì nữa.
  check('bộ lọc không quét sạch — phân hệ hỏng của mục [9] vẫn thấy được cờ lỗi',
    dsQt.some(m => m.key === 'loithu' && m.loi), dsQt.map(m => `${m.key}:${m.loi || 'ok'}`));
}

console.log('\n[12] Màn "không mở được" phải nói ĐÚNG lý do, không đoán bừa');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `/api/modules` lọc bằng BỐN điều kiện khác hẳn nhau — nhà trường tắt,
  // ngoài vai trò, ngoài phần việc của chức vụ, phân hệ đang lỗi — rồi trả về
  // đúng một danh sách. Trình duyệt chỉ thấy "không có trong danh sách", nên
  // màn hình báo lỗi từng đoán một lý do duy nhất: *"phân hệ này hiện đang
  // được nhà trường tắt"*.
  //
  // Câu đó sai đúng vào trường hợp hay gặp nhất — gia đình mở một địa chỉ chỉ
  // dành cho trường. Nhà trường không tắt gì cả. Mục này canh cho từng lý do
  // được gọi đúng tên, và canh cả CHIỀU của lý do "ngoài vai".
  await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: true } });
  await req('PUT', '/api/admin/modules/hocsinhcu', { cookie: A.cookie, body: { enabled: true } });

  // TÌNH HUỐNG PHẢI CÒN SỐNG TRƯỚC ĐÃ.
  //
  // Không có hai phép kiểm này thì mọi phép kiểm dưới vẫn xanh kể cả khi phân
  // hệ không bật lên được, hay khi `view` đã đổi tên và chẳng còn khớp gì.
  const dsP = (await req('GET', '/api/modules', { cookie: P })).data || [];
  check('gia đình KHÔNG thấy phân hệ chỉ dành cho trường',
    !dsP.some(m => m.view === 'thuchup'), dsP.map(m => m.view));
  check('nhưng vẫn thấy phần dành cho mình',
    dsP.some(m => m.view === 'hocsinhcu'), dsP.map(m => m.view));

  const r1 = (await req('GET', '/api/modules/vi-sao/thuchup', { cookie: P })).data;
  check('gia đình mở phần của trường → "ngoài vai", KHÔNG phải "nhà trường tắt"',
    r1 && r1.ly === 'ngoai-vai' && r1.danhCho === 'truong', r1);
  check('và kèm tên phân hệ để còn nói được thành câu', !!(r1 && r1.ten), r1);

  // Chiều ngược lại. Nói với cô rằng "phần này chỉ dành cho cô" thì lại sai
  // lần nữa, chỉ là sai theo hướng khác.
  const r2 = (await req('GET', '/api/modules/vi-sao/hocsinhcu', { cookie: T })).data;
  check('cô mở phần của gia đình → nói đúng CHIỀU',
    r2 && r2.ly === 'ngoai-vai' && r2.danhCho === 'gia-dinh', r2);

  // Chiều THỨ BA (Đ140): Học phí dành cho gia đình VÀ văn phòng, cô không có.
  // Bảo cô rằng phần này "chỉ dành cho cô và văn phòng" là sai lần nữa.
  await req('PUT', '/api/admin/modules/hocphi', { cookie: A.cookie, body: { enabled: true } });
  const r2b = (await req('GET', '/api/modules/vi-sao/hocphi', { cookie: T })).data;
  check('cô mở phần của gia đình và văn phòng → chiều "gia-dinh-va-van-phong", không phải "truong"',
    r2b && r2b.ly === 'ngoai-vai' && r2b.danhCho === 'gia-dinh-va-van-phong', r2b);

  // Nhà trường tắt THẬT thì mới được nói là tắt.
  await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: false } });
  const r3 = (await req('GET', '/api/modules/vi-sao/thuchup', { cookie: T })).data;
  check('nhà trường tắt thật → "tắt"', r3 && r3.ly === 'tat', r3);
  const r4 = (await req('GET', '/api/modules/vi-sao/thuchup', { cookie: P })).data;
  check('và "tắt" thắng "ngoài vai" — đó là sự thật lớn hơn', r4 && r4.ly === 'tat', r4);
  await req('PUT', '/api/admin/modules/thuchup', { cookie: A.cookie, body: { enabled: true } });

  const r5 = (await req('GET', '/api/modules/vi-sao/dia-chi-go-nham', { cookie: P })).data;
  check('địa chỉ gõ nhầm → "không có"', r5 && r5.ly === 'khong-co', r5);

  // PHÉP KIỂM NGƯỢC. Không có nó thì cả mục này vẫn xanh kể cả khi hàm luôn
  // trả về một lý do từ chối nào đó cho mọi câu hỏi.
  const r6 = (await req('GET', '/api/modules/vi-sao/thuchup', { cookie: T })).data;
  check('phần cô dùng được → "dùng được"', r6 && r6.ly === 'dung-duoc', r6);

  // Tầng chức vụ là điều kiện thứ tư, và là điều kiện dễ bị bỏ quên nhất vì nó
  // chỉ áp cho vai quản trị. Đặt cuối cùng: gắn chức vụ cho hiệu trưởng xong
  // thì tài khoản đó thôi mở được phần lớn màn quản trị.
  // Dùng `thuchup` chứ không phải một phân hệ bất kỳ: nó vừa được bật ở trên,
  // nên nếu câu trả lời là "tắt" thì đó là lỗi thật, không phải tại chọn nhầm
  // phân hệ đang tắt sẵn.
  datChucVu(DIR, 'hieutruong', 'ketoan');
  const r7 = (await req('GET', '/api/modules/vi-sao/thuchup', { cookie: A.cookie })).data;
  check('ngoài phần việc của chức vụ → "ngoài chức vụ"', r7 && r7.ly === 'ngoai-chuc-vu', r7);
  const r8 = (await req('GET', '/api/modules/vi-sao/hocphi', { cookie: A.cookie })).data;
  check('còn phần trong tay chức vụ đó thì vẫn "dùng được"', r8 && r8.ly === 'dung-duoc', r8);
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 600));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
