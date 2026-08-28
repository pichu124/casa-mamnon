// Kiểm thử B5: chuyển năm học, lên lớp, ra trường.
//
// Chạy bằng:  npm run test:nam-hoc
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam, batPhanHe, MAU,
} from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3600);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('nam-hoc');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,250) : ''}`); console.log('  ✗', n, x ?? ''); } };

execSync('node data/seed.js --force', {
  cwd: GOC,
  // Tắt dữ liệu mẫu của phân hệ — cùng lý do với `sinhDuLieu` trong
  // test/_chung.mjs: bộ test dựng trên nền phân hệ chưa có dòng nào.
  env: { ...process.env, DATA_DIR: DIR, CASA_SEED_PHAN_HE: '0' },
});
// Bài này dùng Nhận xét làm bằng chứng "dữ liệu cũ KHÔNG mất khi chuyển năm".
// Nhận xét nay tắt sẵn (A2), nhưng dữ liệu của nó vẫn còn nguyên — đó chính là
// điều đang cần chứng minh. Bật tường minh để hỏi được nó.
batPhanHe(DIR, ['nhanxet']);
const out = execSync('node scripts/create-admin.js "Hiệu Trưởng" hieutruong', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString();
const adminPw = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];

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

let A = await login("hieutruong", adminPw);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'hieutruong2026' } });
A = await login("hieutruong", "hieutruong2026");

console.log('\n[1] Xem trước việc chuyển năm học');
let namMoi;
{
  const r = await req('GET', '/api/schoolyear/preview', { cookie: A.cookie });
  check('xem trước được', r.status === 200, r.status);
  namMoi = r.data.namMoi;
  check('tính đúng năm học kế tiếp', /^\d{4}-\d{4}$/.test(namMoi) && namMoi !== r.data.namHienTai, { cu: r.data.namHienTai, moi: namMoi });

  // Mầm non đi theo BẬC (Nhà trẻ → Mầm → Chồi → Lá), không theo số cuối tên
  // nhóm. Số "2" trong "Chồi 2" là nhóm song song thứ mấy, nên nó phải đi theo
  // bé sang bậc mới: Chồi 2 → Lá 2. Hết bậc Lá là bé vào lớp 1.
  const choi2 = r.data.buoc.find(b => b.tenHienTai === 'Chồi 2');
  check('Chồi 2 sẽ lên Lá 2 — theo bậc, không tăng số', choi2?.tenLopMoi === 'Lá 2', choi2);
  check('Chồi 2 không phải bậc cuối', choi2?.raTruong === false);
  const la1 = r.data.buoc.find(b => b.tenHienTai === 'Lá 1');
  check('Lá 1 là bậc cuối — các bé vào lớp 1', la1?.raTruong === true, la1);
  check('đếm đúng số bé lên nhóm trên', r.data.tongLenLop === MAU.soBe - MAU.soBeNhomLa1, r.data.tongLenLop);
  check('đếm đúng số bé ra trường', r.data.tongRaTruong === MAU.soBeNhomLa1, r.data.tongRaTruong);
  check('xem trước KHÔNG thay đổi dữ liệu',
    (await req('GET', '/api/admin/overview', { cookie: A.cookie })).data.counts.students === MAU.soBe);
}

console.log('\n[2] Phân quyền');
{
  const T = (await login('giaovien', '123456')).cookie;
  check('giáo viên KHÔNG xem trước được → 403', (await req('GET', '/api/schoolyear/preview', { cookie: T })).status === 403);
  check('giáo viên KHÔNG chuyển năm học được → 403',
    (await req('POST', '/api/schoolyear/promote', { cookie: T, body: {} })).status === 403);
}

console.log('\n[3] Thực hiện chuyển năm học');
{
  const truoc = await req('GET', '/api/admin/students', { cookie: A.cookie });
  const anTruoc = truoc.data.find(s => s.name === 'Nguyễn Bảo An');
  check('bé An đang học nhóm Chồi 2', anTruoc?.className === 'Chồi 2', anTruoc?.className);

  const r = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi, khoiToiDa: 5 } });
  check('chuyển năm học thành công', r.status === 200, r.data);
  check('bé lên nhóm trên đúng số đã xem trước', r.data?.lenLop === MAU.soBe - MAU.soBeNhomLa1, r.data?.lenLop);
  check('bé ra trường đúng số đã xem trước', r.data?.raTruong === MAU.soBeNhomLa1, r.data?.raTruong);
  check('tạo lớp mới cho năm sau', r.data?.lopTao >= 1, r.data?.lopTao);

  const sau = await req('GET', '/api/admin/students', { cookie: A.cookie });
  const anSau = sau.data.find(s => s.name === 'Nguyễn Bảo An');
  check('bé An đã lên nhóm Lá 2', anSau?.className === 'Lá 2', anSau?.className);
  check('còn đúng số bé chưa ra trường', sau.data.length === MAU.soBe - MAU.soBeNhomLa1, sau.data.length);

  const ov = await req('GET', '/api/admin/overview', { cookie: A.cookie });
  check('năm học của trường đã cập nhật', ov.data.school.currentYear === namMoi, ov.data?.school?.currentYear);
  check('năm mới được thêm vào danh sách năm học', ov.data.school.years.includes(namMoi));
  check('các lớp cũ đã đóng, chỉ còn lớp năm mới',
    ov.data.classes.every(c => c.year === namMoi), ov.data.classes.map(c => `${c.name}:${c.year}`));
  check('giáo viên chờ phân công lại chủ nhiệm',
    ov.data.classes.every(c => !c.teacherName), ov.data.classes.map(c => c.teacherName));
}

console.log('\n[4] Học sinh ra trường vẫn tra cứu được');
{
  const r = await req('GET', '/api/schoolyear/alumni', { cookie: A.cookie });
  check('xem được danh sách đã ra trường', r.status === 200 && r.data.length === 3, r.data?.length);
  const nam = r.data.find(s => s.name === 'Nguyễn Bảo Nam');
  check('có ngày rời trường', !!nam?.leftAt, nam?.leftAt);
  check('vẫn giữ liên kết phụ huynh', nam?.parentIds?.length === 1, nam?.parentIds);
}

console.log('\n[5] Dữ liệu học tập năm cũ không mất');
{
  const T2 = (await login('giaovien', '123456')).cookie;
  const me = await req('GET', '/api/auth/me', { cookie: T2 });
  check('giáo viên đăng nhập bình thường sau khi chuyển năm', me.status === 200, me.status);

  const P = (await login('phuhuynh', '123456')).cookie;
  const meP = await req('GET', '/api/auth/me', { cookie: P });
  check('phụ huynh chỉ còn thấy con đang học', meP.data?.students?.length === 1, meP.data?.students?.map(s => s.name));
  const con = meP.data.students[0];
  const att = await req('GET', `/api/attendance?studentId=${con.id}`, { cookie: P });
  check('điểm danh của con vẫn xem được', att.status === 200, att.status);
  const rm = await req('GET', `/api/remarks?studentId=${con.id}`, { cookie: P });
  check('nhận xét cũ vẫn còn', rm.status === 200 && rm.data.length > 0, rm.data?.length);
}

console.log('\n[6] Không cho chuyển trùng năm');
{
  const r = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi } });
  check('chặn chuyển sang chính năm hiện tại', r.status === 400, r.data);
  const bad = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi: '2027' } });
  check('chặn định dạng năm sai', bad.status === 400, bad.data);
  const log = await req('GET', '/api/admin/audit', { cookie: A.cookie });
  check('nhật ký ghi lại việc chuyển năm học', log.data.some(x => x.action === 'schoolyear-promote'));
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 500));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
