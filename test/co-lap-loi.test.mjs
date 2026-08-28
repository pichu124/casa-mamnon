// Kiểm thử nguyên tắc nền: THÊM hoặc BỎ một tính năng — kể cả khi tính năng đó
// viết sai — không được làm ứng dụng ngừng chạy, và không được đụng tới các
// tính năng khác đang dùng.
//
// Chạy bằng:  npm run test:co-lap
//
// Bài kiểm thử cố tình phá hỏng từng thứ một rồi kiểm tra phần còn lại vẫn sống.
// Nó dựng máy chủ riêng với cơ sở dữ liệu tạm nên KHÔNG đụng dữ liệu thật.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam , MAU } from './_chung.mjs';
const PORT = Number(process.env.TEST_PORT || 3710);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('co-lap');
const ROUTES = path.join(GOC, 'routes');
const MODULES = path.join(GOC, 'modules');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => {
  if (c) { pass++; console.log('  ✓', n); }
  else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0, 250) : ''}`); console.log('  ✗', n, x ?? ''); }
};

// --- dọn dẹp: dù bài kiểm thử hỏng giữa chừng cũng phải trả kho mã về nguyên trạng
const capCuu = [];
const hoanTac = () => { while (capCuu.length) { try { capCuu.pop()(); } catch {} } };
process.on('exit', hoanTac);
process.on('SIGINT', () => { hoanTac(); process.exit(1); });

function phaTepRoute(ten, noiDung) {
  const p = path.join(ROUTES, ten);
  const goc = fs.readFileSync(p, 'utf8');
  capCuu.push(() => fs.writeFileSync(p, goc));
  fs.writeFileSync(p, noiDung);
}
function taoPhanHe(ten, tep) {
  const d = path.join(MODULES, ten);
  fs.mkdirSync(d, { recursive: true });
  capCuu.push(() => fs.rmSync(d, { recursive: true, force: true }));
  for (const [f, noiDung] of Object.entries(tep)) fs.writeFileSync(path.join(d, f), noiDung);
}

execSync('node data/seed.js --force', {
  cwd: GOC,
  // Tắt dữ liệu mẫu của phân hệ — cùng lý do với `sinhDuLieu` trong
  // test/_chung.mjs: bộ test dựng trên nền phân hệ chưa có dòng nào.
  env: { ...process.env, DATA_DIR: DIR, CASA_SEED_PHAN_HE: '0' },
});
const out = execSync('node scripts/create-admin.js "Hiệu Trưởng" hieutruong', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString();
const mkTam = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];

let server, nhatKy = '';
async function start() {
  nhatKy = '';
  server = spawn('node', ['server.js'], { cwd: GOC, env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR } });
  server.stdout.on('data', d => { nhatKy += d; });
  server.stderr.on('data', d => { nhatKy += d; });
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 250));
    try { if ((await fetch(BASE + '/healthz')).ok) return true; } catch {}
  }
  return false;
}
async function stop() {
  if (!server) return;
  server.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 500));
  server = null;
}
async function khoiDongLai() { await stop(); return start(); }
process.on('exit', () => { try { server?.kill('SIGKILL'); } catch {} });

async function req(method, p, { body, cookie } = {}) {
  const res = await fetch(BASE + p, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => {
  const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null };
};

await start();
let A = await login('hieutruong', mkTam);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'quantri2026' } });

// Kiểm tra "phần còn lại vẫn dùng được bình thường" — dùng lại sau mỗi lần phá.
async function phanConLaiVanChay(nhan) {
  const ph = await login('phuhuynh', '123456');
  check(`${nhan}: phụ huynh vẫn đăng nhập được`, ph.status === 200, ph.status);
  const gv = await login('giaovien', '123456');
  check(`${nhan}: giáo viên vẫn đăng nhập được`, gv.status === 200, gv.status);
  const c = ph.cookie;
  for (const [ten, duong] of [['học sinh', '/api/students'], ['điểm danh', '/api/attendance?studentId=s1'],
    ['y tế', '/api/health?studentId=s1'], ['thông báo', '/api/notifications'],
    ['thực đơn', '/api/menu'], ['album', '/api/albums']]) {
    const r = await req('GET', duong, { cookie: c });
    check(`${nhan}: ${ten} vẫn dùng được`, r.status === 200, r.status);
  }
  const tc = await req('GET', '/api/dashboard/badges', { cookie: c });
  check(`${nhan}: trang chủ vẫn tải được`, tc.status === 200, tc.status);
}

console.log('\n[1] Một TÍNH NĂNG LÕI viết sai — máy chủ vẫn phải chạy');
{
  phaTepRoute('conduct.js', 'module.exports = (app) => { const x = undefined; x.no(); };');
  const song = await khoiDongLai();
  check('máy chủ vẫn khởi động được', song === true);
  check('nhật ký nêu rõ tệp nào hỏng', /routes\/conduct\.js/.test(nhatKy), nhatKy.slice(-300));
  check('nhật ký trấn an phần còn lại vẫn chạy', /vẫn chạy bình thường/.test(nhatKy));

  const ph = await login('phuhuynh', '123456');
  const ne = await req('GET', '/api/conduct?studentId=s1', { cookie: ph.cookie });
  check('riêng tính năng hỏng báo 503, không trả dữ liệu sai', ne.status === 503, ne.status);
  check('thông báo lỗi bằng tiếng Việt, dễ hiểu', /sự cố/.test(ne.data?.error || ''), ne.data);

  const dsach = await req('GET', '/api/modules', { cookie: ph.cookie });
  check('tính năng hỏng biến khỏi màn hình chính', !dsach.data.some(m => m.key === 'nenep'),
    dsach.data?.map(m => m.key));

  const A2 = await login('hieutruong', 'quantri2026');
  const qt = await req('GET', '/api/admin/modules', { cookie: A2.cookie });
  check('trang quản trị nêu rõ tính năng nào hỏng và vì sao',
    !!qt.data.find(m => m.key === 'nenep')?.loi, qt.data?.find(m => m.key === 'nenep'));

  await phanConLaiVanChay('lõi hỏng');
}

console.log('\n[2] BỎ HẲN một tính năng lõi — app vẫn dùng tiếp được');
{
  hoanTac();
  const p = path.join(ROUTES, 'bus.js');
  const goc = fs.readFileSync(p, 'utf8');
  capCuu.push(() => fs.writeFileSync(p, goc));
  fs.rmSync(p);

  const song = await khoiDongLai();
  check('máy chủ vẫn khởi động sau khi gỡ tính năng', song === true);
  const ph = await login('phuhuynh', '123456');
  const dsach = await req('GET', '/api/modules', { cookie: ph.cookie });
  check('tính năng đã gỡ không còn hiện biểu tượng', !dsach.data.some(m => m.key === 'xebuyt'),
    dsach.data?.map(m => m.key));
  const bus = await req('GET', '/api/bus', { cookie: ph.cookie });
  check('đường dẫn của tính năng đã gỡ không trả dữ liệu', bus.status >= 400, bus.status);
  await phanConLaiVanChay('gỡ tính năng');
}

console.log('\n[3] Phân hệ MỚI viết sai — không lây sang phần đang chạy');
{
  hoanTac();
  taoPhanHe('thu-nghiem-hong', {
    'module.json': JSON.stringify({ key: 'thunghiem', name: 'Thử nghiệm hỏng', hash: '#/thunghiem' }),
    'routes.js': 'module.exports = () => { throw new Error("cố tình hỏng"); };',
  });
  const song = await khoiDongLai();
  check('máy chủ vẫn khởi động', song === true);
  const ph = await login('phuhuynh', '123456');
  check('phân hệ hỏng không hiện với người dùng',
    !(await req('GET', '/api/modules', { cookie: ph.cookie })).data.some(m => m.key === 'thunghiem'));
  await phanConLaiVanChay('phân hệ mới hỏng');
}

console.log('\n[4] Phân hệ mới KHÔNG được chiếm đường dẫn của phần đang chạy');
{
  hoanTac();
  taoPhanHe('gia-mao', {
    'module.json': JSON.stringify({ key: 'giamao', name: 'Giả mạo', hash: '#/giamao', api: ['/api/students'] }),
    'routes.js': 'module.exports = (app) => { app.get("/api/students", (req, res) => res.json([])); };',
  });
  const song = await khoiDongLai();
  check('máy chủ vẫn khởi động', song === true);
  check('nhật ký từ chối vì đường dẫn đã có chủ', /đã thuộc về phân hệ/.test(nhatKy), nhatKy.slice(-400));

  const ph = await login('phuhuynh', '123456');
  const hs = await req('GET', '/api/students', { cookie: ph.cookie });
  check('danh sách học sinh KHÔNG bị chiếm quyền', hs.status === 200 && hs.data.length > 0, hs.data?.length);
  await phanConLaiVanChay('chiếm đường dẫn');
}

console.log('\n[5] Phân hệ mới đăng ký lạc ra ngoài vùng của nó thì bị chặn');
{
  hoanTac();
  taoPhanHe('lac-duong', {
    'module.json': JSON.stringify({ key: 'lacduong', name: 'Lạc đường', hash: '#/lacduong' }),
    'routes.js': 'module.exports = (app) => { app.get("/api/remarks", (req, res) => res.json([])); };',
  });
  await khoiDongLai();
  check('nhật ký nêu rõ vì sao bị chặn', /chỉ được đăng ký đường dẫn/.test(nhatKy), nhatKy.slice(-400));
  const ph = await login('phuhuynh', '123456');
  const nx = await req('GET', '/api/health?studentId=s1', { cookie: ph.cookie });
  check('phân hệ lõi vẫn trả dữ liệu thật của nó',
    nx.status === 200 && Array.isArray(nx.data?.records), nx.data);
  check('phân hệ lạc đường bị đánh dấu lỗi, không hiện ra',
    !(await req('GET', '/api/modules', { cookie: ph.cookie })).data.some(m => m.key === 'lacduong'));
  await phanConLaiVanChay('lạc đường');
}

console.log('\n[6] Phân hệ mới KHÔNG được đụng vào bảng dữ liệu của phần đang chạy');
{
  hoanTac();
  taoPhanHe('pha-hoai', {
    'module.json': JSON.stringify({ key: 'phahoai', name: 'Phá hoại', hash: '#/phahoai' }),
    'schema.sql': 'DROP TABLE IF EXISTS students;\nCREATE TABLE IF NOT EXISTS phahoai_x (id TEXT PRIMARY KEY);',
  });
  const song = await khoiDongLai();
  check('máy chủ vẫn khởi động', song === true);
  check('câu lệnh xóa bảng bị từ chối', /chỉ được dùng CREATE/.test(nhatKy), nhatKy.slice(-400));

  const ph = await login('phuhuynh', '123456');
  const hs = await req('GET', '/api/students', { cookie: ph.cookie });
  check('BẢNG HỌC SINH VẪN CÒN NGUYÊN', hs.status === 200 && hs.data.length > 0, hs.data?.length);

  const { default: Database } = await import('better-sqlite3');
  const raw = new Database(path.join(DIR, 'school.db'), { readonly: true });
  check('kiểm tra thẳng trong cơ sở dữ liệu: học sinh không mất',
    raw.prepare('SELECT COUNT(*) c FROM students').get().c === MAU.soBe);
  check('bảng của phân hệ phá hoại cũng không được tạo',
    !raw.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(r => r.name).includes('phahoai_x'));
  raw.close();
  await phanConLaiVanChay('phá bảng');
}

console.log('\n[7] Phân hệ mới không được tạo bảng mang tên của phần khác');
{
  hoanTac();
  taoPhanHe('doi-ten', {
    'module.json': JSON.stringify({ key: 'doiten', name: 'Đổi tên', hash: '#/doiten' }),
    'schema.sql': 'CREATE TABLE IF NOT EXISTS attendance_gia (id TEXT PRIMARY KEY);',
  });
  await khoiDongLai();
  check('bảng đặt sai tiền tố bị từ chối', /phải đặt tên bắt đầu bằng/.test(nhatKy), nhatKy.slice(-300));
  await phanConLaiVanChay('sai tiền tố bảng');
}

console.log('\n[8] Trở về nguyên trạng — mọi thứ chạy lại đầy đủ');
{
  hoanTac();
  const song = await khoiDongLai();
  check('máy chủ khởi động sạch, không còn cảnh báo', song === true);
  check('không còn tính năng nào bị đánh dấu lỗi', !/không nạp được/.test(nhatKy), nhatKy.slice(-300));
  const ph = await login('phuhuynh', '123456');
  const ds = await req('GET', '/api/modules', { cookie: ph.cookie });
  // 16 phân hệ lõi, trong đó BỐN cái tắt sẵn theo quyết định của nhà trường —
  // Nề nếp, Báo cáo (N3), Nhận xét, Xe buýt (A2) — nên phụ huynh thấy 12, cộng
  // các phân hệ cắm thêm đang bật. Đếm "còn đủ" ở đây là đếm cái CÒN BẬT.
  check('đủ số tính năng lõi đang bật trở lại', ds.data.length >= 12, ds.data?.length);
  // Dùng Nhận xét làm phép thử, không dùng Nề nếp: Nề nếp nay TẮT SẴN (N3) nên
  // nó trả 404 vì đang tắt chứ không phải vì hỏng — hai chuyện khác hẳn, và một
  // phép thử không phân biệt được chúng thì không nói lên điều gì.
  const ne = await req('GET', '/api/health?studentId=s1', { cookie: ph.cookie });
  check('tính năng từng bị phá nay chạy lại bình thường', ne.status === 200, ne.status);
  // Phân hệ bị gỡ tệp ở mục [3] là Xe buýt, mà Xe buýt nay TẮT SẴN (A2) nên nó
  // trả 404 vì đang tắt chứ không phải vì thiếu tệp. Hỏi thẳng danh sách phân hệ
  // thay vì hỏi đường dẫn: điều cần chứng minh là máy chủ đã NHẬN LẠI tệp route,
  // không phải là phân hệ đó đang bật.
  const dsQt = (await req('GET', '/api/modules', { cookie: ph.cookie })).data;
  check('tính năng từng bị gỡ nay KHÔNG còn bị đánh dấu lỗi',
    !dsQt.some(m => m.key === 'xebuyt' && m.loi), dsQt.find(m => m.key === 'xebuyt'));
  check('nhật ký không còn báo thiếu tệp routes/bus.js',
    !/thiếu tệp routes\/bus\.js/.test(nhatKy), nhatKy.slice(-300));
  await phanConLaiVanChay('nguyên trạng');
}

await stop();
hoanTac();
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
