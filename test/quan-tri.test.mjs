// Kiểm thử B2: quản trị và nhập danh sách học sinh từ CSV.
//
// Chạy bằng:  npm run test:quan-tri
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam } from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3500);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('quan-tri');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,250) : ''}`); console.log('  ✗', n, x ?? ''); } };

// Tạo dữ liệu mẫu + tài khoản quản trị trước khi chạy máy chủ
execSync('node data/seed.js --force', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } });
const out = execSync('node scripts/create-admin.js "Nguyễn Văn Hiệu" hieutruong', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString();
const adminPw = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];
console.log('\n[0] Tạo tài khoản quản trị bằng script');
check('script tạo được tài khoản quản trị', !!adminPw, adminPw);

const server = spawn('node', ['server.js'], { cwd: GOC, stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR } });
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} }

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => { const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null }; };

console.log('\n[1] Đăng nhập quản trị và buộc đổi mật khẩu');
let A = await login('hieutruong', adminPw);
check('đăng nhập bằng mật khẩu script cấp', A.status === 200, A.status);
check('bị yêu cầu đổi mật khẩu ngay', A.data?.user?.mustChangePassword === true);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'hieutruong2026' } });
A = await login('hieutruong', 'hieutruong2026');
check('đăng nhập bằng mật khẩu mới', A.status === 200 && A.data.user.role === 'admin', A.data?.user?.role);

console.log('\n[2] Phân quyền trang quản trị');
{
  const T = (await login('giaovien', '123456')).cookie;
  const P = (await login('phuhuynh', '123456')).cookie;
  check('giáo viên KHÔNG vào được → 403', (await req('GET', '/api/admin/overview', { cookie: T })).status === 403);
  check('phụ huynh KHÔNG vào được → 403', (await req('GET', '/api/admin/overview', { cookie: P })).status === 403);
  check('giáo viên KHÔNG nhập được danh sách → 403',
    (await req('POST', '/api/admin/import/commit', { cookie: T, body: { csv: 'x' } })).status === 403);
}

console.log('\n[3] Tổng quan và quản lý lớp');
{
  const r = await req('GET', '/api/admin/overview', { cookie: A.cookie });
  check('xem được tổng quan', r.status === 200 && r.data.counts.students === 8, r.data?.counts);
  const c = await req('POST', '/api/admin/classes', { cookie: A.cookie, body: { name: 'Lớp 1A', room: 'P101', grade: 1 } });
  check('tạo lớp mới → 201', c.status === 201, c.data);
  const up = await req('PUT', `/api/admin/classes/${c.data.id}`, { cookie: A.cookie, body: { room: 'P102' } });
  check('sửa được thông tin lớp', up.status === 200 && up.data.room === 'P102', up.data?.room);
  const gv = await req('POST', '/api/admin/teachers', { cookie: A.cookie, body: { name: 'Lê Thị Hoa', title: 'Cô', phone: '0905123456', classId: c.data.id } });
  check('tạo tài khoản giáo viên kèm mật khẩu', gv.status === 201 && gv.data.temporaryPassword, gv.data);
  check('tên đăng nhập lấy theo số điện thoại', gv.data?.username === '0905123456', gv.data?.username);
  const gvLogin = await login('0905123456', gv.data.temporaryPassword);
  check('giáo viên mới đăng nhập được', gvLogin.status === 200, gvLogin.status);
  check('giáo viên mới bị buộc đổi mật khẩu', gvLogin.data?.user?.mustChangePassword === true);
}

console.log('\n[4] Xem trước khi nhập danh sách (bắt lỗi)');
const CSV = `Mã học sinh,Họ tên,Ngày sinh,Giới tính,Lớp,Địa chỉ,Họ tên phụ huynh,Điện thoại,Email
HS001,Trần Văn An,2018-05-10,Nam,Lớp 2A,"12 Lê Lợi, Q.1",Trần Văn Bình,0911111111,binh@gmail.com
HS002,Trần Thị Bích,2016-03-22,Nữ,Lớp 4B,"12 Lê Lợi, Q.1",Trần Văn Bình,0911111111,binh@gmail.com
HS003,Lê Minh Cường,2018-07-01,Nam,Lớp 2A,45 Trần Phú,Lê Văn Dũng,0922222222,
HS001,Nguyễn Trùng Mã,2018-01-01,Nam,Lớp 2A,,Nguyễn Văn E,0933333333,
,Thiếu Tên Lớp,2018-01-01,Nữ,,,Phạm Thị F,0944444444,
HS005,Hoàng Thiếu PH,2018-01-01,Nam,Lớp 2A,,,,`;
{
  const r = await req('POST', '/api/admin/import/preview', { cookie: A.cookie, body: { csv: CSV } });
  check('đọc được tệp CSV', r.status === 200 && r.data.total === 6, r.data?.total);
  check('phát hiện 3 dòng lỗi', r.data?.loi === 3, r.data?.loi);
  check('nhận diện lớp cần tạo mới', r.data?.lopMoi?.length === 2, r.data?.lopMoi);
  const loiMa = r.data.rows.find(x => x.line === 5);
  check('bắt được mã học sinh trùng trong tệp', loiMa?.loi?.some(e => /lặp/.test(e)), loiMa?.loi);
  const loiLop = r.data.rows.find(x => x.line === 6);
  check('bắt được dòng thiếu lớp', loiLop?.loi?.some(e => /lớp/.test(e)), loiLop?.loi);
  const loiPh = r.data.rows.find(x => x.line === 7);
  check('bắt được dòng thiếu phụ huynh', loiPh?.loi?.some(e => /phụ huynh/.test(e)), loiPh?.loi);
  check('sinh tên đăng nhập từ số điện thoại', r.data.rows[0].username === '0911111111', r.data.rows[0]?.username);
  check('không ghi gì khi mới xem trước',
    (await req('GET', '/api/admin/overview', { cookie: A.cookie })).data.counts.students === 8);
}

console.log('\n[5] Nhập thật');
{
  const r = await req('POST', '/api/admin/import/commit', { cookie: A.cookie, body: { csv: CSV } });
  check('nhập được 3 học sinh hợp lệ', r.status === 200 && r.data.imported === 3, r.data);
  check('bỏ qua đúng 3 dòng lỗi', r.data?.boQua === 3, r.data?.boQua);
  check('trả về danh sách tài khoản để in phiếu', r.data?.taiKhoan?.length === 3, r.data?.taiKhoan?.length);

  const ov = await req('GET', '/api/admin/overview', { cookie: A.cookie });
  check('tổng học sinh tăng lên 11', ov.data.counts.students === 11, ov.data?.counts?.students);
  // Dữ liệu mẫu nay có 3 nhóm (Chồi 2 và Lá 1 ở cơ sở 1, Mầm 1 ở cơ sở 2 — nhóm
  // thứ ba tồn tại để phép thử cách ly giữa hai cơ sở có thật hai cơ sở mà so).
  // Tệp nhập mẫu thêm 3 nhóm nữa, nên tổng là 6.
  check('đã tự tạo 3 nhóm mới', ov.data.counts.classes === 6, ov.data?.counts?.classes);

  // Hai con cùng một phụ huynh (trùng SĐT) phải dùng chung một tài khoản
  const dungChung = r.data.taiKhoan.filter(t => t.username === '0911111111');
  check('hai con cùng nhà dùng chung một tài khoản', dungChung.length === 2, dungChung.length);
  check('con thứ hai không cấp mật khẩu mới',
    dungChung.filter(t => t.matKhau.includes('đã có tài khoản')).length === 1, dungChung.map(t => t.matKhau));

  // Phụ huynh mới đăng nhập được và thấy đúng 2 con
  const pw = dungChung.find(t => !t.matKhau.includes('đã có'))?.matKhau;
  const PH = await login('0911111111', pw);
  check('phụ huynh mới đăng nhập được', PH.status === 200, PH.status);
  check('thấy đúng 2 con của mình', PH.data?.students?.length === 2, PH.data?.students?.map(s => s.name));
  check('phụ huynh mới bị buộc đổi mật khẩu', PH.data?.user?.mustChangePassword === true);
}

console.log('\n[6] Quản lý học sinh');
{
  const list = await req('GET', '/api/admin/students', { cookie: A.cookie });
  check('xem được toàn bộ học sinh', list.status === 200 && list.data.length === 11, list.data?.length);
  const hs = list.data.find(s => s.name === 'Lê Minh Cường');
  check('học sinh có gắn phụ huynh', hs?.parents?.length === 1, hs?.parents);

  const nghi = await req('DELETE', `/api/admin/students/${hs.id}`, { cookie: A.cookie });
  check('cho học sinh nghỉ học → 200', nghi.status === 200);
  const sau = await req('GET', '/api/admin/students', { cookie: A.cookie });
  check('học sinh nghỉ không còn trong danh sách', sau.data.length === 10, sau.data?.length);
  check('nhưng dữ liệu vẫn giữ để tra cứu (không xóa hẳn)',
    (await req('GET', '/api/admin/overview', { cookie: A.cookie })).data.counts.students === 10);
}

console.log('\n[7] Tệp mẫu và nhật ký thao tác');
{
  const tpl = await fetch(BASE + '/api/admin/import/template', { headers: { Cookie: A.cookie } });
  const buf = Buffer.from(await tpl.arrayBuffer());
  check('tải được tệp CSV mẫu', tpl.status === 200 && buf.toString('utf8').includes('Họ tên phụ huynh'), tpl.status);
  // Kiểm tra ở mức byte vì hàm giải mã văn bản của trình duyệt tự bỏ dấu BOM đi.
  check('tệp mẫu có BOM để Excel đọc đúng tiếng Việt',
    buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF, [...buf.slice(0, 3)]);

  const log = await req('GET', '/api/admin/audit', { cookie: A.cookie });
  check('xem được nhật ký thao tác', log.status === 200 && log.data.length > 0, log.data?.length);
  check('nhật ký ghi lại việc nhập danh sách', log.data.some(r => r.action === 'import-students'));
  check('nhật ký ghi lại việc tạo lớp', log.data.some(r => r.action === 'class-create'));
  check('nhật ký nêu rõ ai làm', log.data[0]?.who?.includes('Hiệu'), log.data[0]?.who);
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 500));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
