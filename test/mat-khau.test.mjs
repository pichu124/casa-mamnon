// Kiểm thử B3: cấp lại mật khẩu khi phụ huynh quên.
//
// Chạy bằng:  npm run test:mat-khau
import fs from 'fs';
import { spawn } from 'child_process';
import { GOC, thuMucTam, donThuMucTam } from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3400);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('mat-khau');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,200) : ''}`); console.log('  ✗', n, x ?? ''); } };

const server = spawn('node', ['server.js'], { cwd: GOC, stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR } });
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} }

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => { const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null }; };

console.log('\n[1] Giáo viên xem danh sách phụ huynh lớp mình');
const T = (await login('giaovien', '123456')).cookie;
const P_before = await login('phuhuynh', '123456');
{
  const r = await req('GET', '/api/accounts/parents', { cookie: T });
  check('lấy được danh sách phụ huynh', r.status === 200 && r.data.length > 0, r.data?.length);
  check('kèm tên con để nhận diện', r.data.every(p => Array.isArray(p.children) && p.children.length), r.data?.[0]);
  const parent = await login('phuhuynh', '123456');
  const rp = await req('GET', '/api/accounts/parents', { cookie: parent.cookie });
  check('phụ huynh KHÔNG xem được danh sách này', rp.status === 403, rp.status);
}

console.log('\n[2] Cấp mật khẩu tạm');
let tempPw;
{
  const r = await req('POST', '/api/accounts/p1/reset-password', { cookie: T });
  check('cấp được mật khẩu tạm → 200', r.status === 200, r.data);
  tempPw = r.data?.temporaryPassword;
  check('mật khẩu tạm có 8 ký tự dễ đọc', /^[a-z]{5}[2-9]{3}$/.test(tempPw || ''), tempPw);
  check('trả kèm tên đăng nhập', r.data?.username === 'phuhuynh', r.data?.username);

  const old = await req('GET', '/api/auth/me', { cookie: P_before.cookie });
  check('phụ huynh bị đăng xuất khỏi thiết bị cũ', old.status === 401, old.status);
  const oldPw = await req('POST', '/api/auth/login', { body: { username: 'phuhuynh', password: '123456' } });
  check('mật khẩu cũ không dùng được nữa', oldPw.status === 401, oldPw.status);
}

console.log('\n[3] Đăng nhập bằng mật khẩu tạm và buộc đổi');
let P;
{
  P = await login('phuhuynh', tempPw);
  check('đăng nhập bằng mật khẩu tạm → 200', P.status === 200, P.status);
  check('hệ thống báo cần đổi mật khẩu', P.data?.user?.mustChangePassword === true, P.data?.user?.mustChangePassword);

  const weak = await req('POST', '/api/auth/set-new-password', { cookie: P.cookie, body: { newPassword: 'abc' } });
  check('từ chối mật khẩu quá ngắn', weak.status === 400, weak.data);
  const same = await req('POST', '/api/auth/set-new-password', { cookie: P.cookie, body: { newPassword: tempPw } });
  check('từ chối đặt lại đúng mật khẩu tạm', same.status === 400, same.data);

  const ok = await req('POST', '/api/auth/set-new-password', { cookie: P.cookie, body: { newPassword: 'giadinh2026' } });
  check('đặt mật khẩu mới hợp lệ → 200', ok.status === 200, ok.data);

  const me = await req('GET', '/api/auth/me', { cookie: P.cookie });
  check('vẫn đăng nhập sau khi đổi', me.status === 200, me.status);
  check('cờ cần đổi mật khẩu đã tắt', me.data?.user?.mustChangePassword === false, me.data?.user?.mustChangePassword);

  const again = await req('POST', '/api/auth/set-new-password', { cookie: P.cookie, body: { newPassword: 'khac2026nhe' } });
  check('không đổi tiếp được khi không còn ở trạng thái tạm', again.status === 400, again.status);

  const newLogin = await login('phuhuynh', 'giadinh2026');
  check('đăng nhập bằng mật khẩu mới', newLogin.status === 200, newLogin.status);
  check('mật khẩu tạm hết hiệu lực', (await req('POST', '/api/auth/login', { body: { username: 'phuhuynh', password: tempPw } })).status === 401);
}

console.log('\n[4] Phân quyền cấp lại mật khẩu');
{
  const T2 = (await login('giaovien2', '123456')).cookie;   // chủ nhiệm lớp 5B
  const r = await req('POST', '/api/accounts/p2/reset-password', { cookie: T2 });
  check('giáo viên lớp khác KHÔNG cấp được → 403', r.status === 403, r.status);

  const self = await req('POST', '/api/accounts/t1/reset-password', { cookie: T });
  check('không tự cấp lại cho chính mình → 403', self.status === 403, self.status);

  const toTeacher = await req('POST', '/api/accounts/t2/reset-password', { cookie: T });
  check('giáo viên KHÔNG cấp được cho giáo viên khác → 403', toTeacher.status === 403, toTeacher.status);

  const parentTry = await req('POST', '/api/accounts/p2/reset-password', { cookie: (await login('phuhuynh2','123456')).cookie });
  check('phụ huynh KHÔNG cấp được cho ai → 403', parentTry.status === 403, parentTry.status);

  const missing = await req('POST', '/api/accounts/khong-ton-tai/reset-password', { cookie: T });
  check('tài khoản không tồn tại → 404', missing.status === 404, missing.status);
}

console.log('\n[5] Nhật ký cấp lại mật khẩu');
{
  const r = await req('GET', '/api/accounts/reset-log', { cookie: T });
  check('ghi lại lượt cấp mật khẩu', r.status === 200 && r.data.length >= 1, r.data?.length);
  check('nhật ký nêu rõ cấp cho ai', r.data?.[0]?.targetUsername === 'phuhuynh', r.data?.[0]);
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 500));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
