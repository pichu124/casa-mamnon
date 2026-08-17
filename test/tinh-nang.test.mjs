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
import { GOC, thuMucTam, donThuMucTam } from './_chung.mjs';
const PORT = Number(process.env.TEST_PORT || 3700);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('tinh-nang');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,250) : ''}`); console.log('  ✗', n, x ?? ''); } };

execSync('node data/seed.js --force', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } });
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
  check('phụ huynh lấy được danh sách', r.status === 200 && r.data.length >= 14, r.data?.length);
  check('mặc định các phân hệ lõi đều bật', r.data.some(m => m.key === 'diemdanh'));
  check('phân hệ cắm thêm mặc định TẮT nên không xuất hiện',
    !r.data.some(m => m.key === 'hocphi'), r.data.filter(m => m.key === 'hocphi'));

  const adm = await req('GET', '/api/admin/modules', { cookie: A.cookie });
  check('quản trị thấy toàn bộ kèm trạng thái', adm.status === 200 && adm.data.length >= 15, adm.data?.length);
  check('quản trị thấy cả phân hệ đang tắt', adm.data.some(m => m.key === 'hocphi' && m.enabled === false));
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

  const post = await req('POST', '/api/attendance/mark', { cookie: T, body: { studentId: 's1', date: '2026-08-13', status: 'present' } });
  check('cả đường ghi dữ liệu cũng bị chặn', post.status === 404, post.status);

  const list = await req('GET', '/api/modules', { cookie: P });
  check('phân hệ đã tắt biến khỏi danh sách của người dùng',
    !list.data.some(m => m.key === 'diemdanh'), list.data?.map(m => m.key));

  const khac = await req('GET', '/api/remarks?studentId=s1', { cookie: P });
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
  const truoc = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('khi đang tắt: API của phân hệ mới bị chặn', truoc.status === 404, truoc.status);

  const on = await req('PUT', '/api/admin/modules/hocphi', { cookie: A.cookie, body: { enabled: true } });
  check('bật phân hệ Học phí → 200', on.status === 200, on.data);

  const sau = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('API của phân hệ mới hoạt động', sau.status === 200, sau.data);
  check('trả về đúng cấu trúc dữ liệu riêng của nó',
    Array.isArray(sau.data?.khoan) && sau.data.tongChuaNop === 0, sau.data);

  const list = await req('GET', '/api/modules', { cookie: P });
  const hp = list.data.find(m => m.key === 'hocphi');
  check('xuất hiện trên màn hình chính của phụ huynh', !!hp, list.data?.map(m => m.key));
  check('kèm đường dẫn tệp giao diện để tải về', hp?.viewUrl === '/modules/hocphi/view.js', hp?.viewUrl);

  const js = await fetch(BASE + '/modules/hocphi/view.js', { headers: { Cookie: P } });
  check('tải được tệp giao diện của phân hệ mới', js.status === 200, js.status);
  check('tệp giao diện đăng ký đúng tên view', (await js.text()).includes('App.views.hocphi'));
}

console.log('\n[6] Phân hệ mới dùng chung cơ chế phân quyền của phần lõi');
{
  const tao = await req('POST', '/api/hocphi', { cookie: T,
    body: { studentId: 's1', kyThu: 'Tháng 9/2026', noiDung: 'Tiền ăn bán trú', soTien: 500000, hanNop: '2026-09-10' } });
  check('giáo viên tạo được khoản thu → 201', tao.status === 201, tao.data);

  const lopKhac = await req('POST', '/api/hocphi', { cookie: T,
    body: { studentId: 's2', kyThu: 'x', noiDung: 'y', soTien: 1000 } });
  check('KHÔNG tạo được cho học sinh lớp khác → 403', lopKhac.status === 403, lopKhac.status);

  const phTao = await req('POST', '/api/hocphi', { cookie: P,
    body: { studentId: 's1', kyThu: 'x', noiDung: 'y', soTien: 1000 } });
  check('phụ huynh KHÔNG tạo được khoản thu → 403', phTao.status === 403, phTao.status);

  const xemTrom = await req('GET', '/api/hocphi?studentId=s3', { cookie: P });
  check('phụ huynh KHÔNG xem được học phí con nhà khác → 403', xemTrom.status === 403, xemTrom.status);

  const xem = await req('GET', '/api/hocphi?studentId=s1', { cookie: P });
  check('phụ huynh xem được khoản thu của con mình', xem.data?.khoan?.length === 1, xem.data?.khoan?.length);
  check('tính đúng số tiền còn phải nộp', xem.data?.tongChuaNop === 500000, xem.data?.tongChuaNop);

  const xn = await req('POST', `/api/hocphi/${tao.data.id}/xac-nhan`, { cookie: T, body: {} });
  check('giáo viên xác nhận đã nhận tiền', xn.status === 200, xn.data);
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
  check('học sinh không bị mất', raw.prepare('SELECT COUNT(*) c FROM students').get().c === 8);
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
  check('các phân hệ khác vẫn chạy', (await req('GET', '/api/remarks?studentId=s1', { cookie: P3 })).status === 200);
  const adm = await req('GET', '/api/admin/modules', { cookie: A3.cookie });
  const loi = adm.data.find(m => m.key === 'loithu');
  check('quản trị thấy phân hệ hỏng và lý do', !!loi?.loi, loi);
  const nd = await req('GET', '/api/modules', { cookie: P3 });
  check('phân hệ hỏng không hiện với người dùng', !nd.data.some(m => m.key === 'loithu'));

  fs.rmSync(xau, { recursive: true, force: true });
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 600));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
