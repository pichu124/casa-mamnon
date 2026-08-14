// Kiểm thử lưới an toàn cuối cho lỗi bất đồng bộ.
//
// Chạy bằng:  npm run test:luoi-an-toan
//
// Cô lập lỗi ở tầng nạp phân hệ và tầng xử lý yêu cầu không đỡ được lỗi nổ ra
// TRONG setTimeout hay trong promise bị bỏ quên — trước khi có lưới này, một
// dòng viết ẩu trong một phân hệ cắm thêm giết cả tiến trình, cả trường mất app.
//
// Ba điều phải đúng:
//   1. Promise bị từ chối không ai bắt → app CHẠY TIẾP, chỉ ghi log.
//   2. Lỗi ném đồng bộ không ai bắt → app DỪNG có chủ ý, mã thoát 1, log nêu rõ
//      vì sao và nói trình giám sát sẽ bật lại.
//   3. Bật lại (mô phỏng trình giám sát) → dữ liệu còn nguyên, đăng nhập được.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GOC, taoBoDem, thuMucTam, sinhDuLieu } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 3760);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('luoi-an-toan');
sinhDuLieu(DIR);

// --- Cắm một phân hệ cố tình gây cả hai loại lỗi ---------------------------
const THU_MUC_NO = path.join(GOC, 'modules', 'luoi-an-toan-thu');
fs.mkdirSync(THU_MUC_NO, { recursive: true });
fs.writeFileSync(path.join(THU_MUC_NO, 'module.json'), JSON.stringify({
  key: 'luoithu', name: 'Thử lưới an toàn', hash: '#/luoithu',
  api: ['/api/luoithu'], defaultEnabled: true,
}));
fs.writeFileSync(path.join(THU_MUC_NO, 'routes.js'), `
module.exports = (app) => {
  // Promise bị từ chối, không .catch, không await — giá trị lỗi bị bỏ quên.
  app.get('/api/luoithu/promise', (req, res) => {
    Promise.reject(new Error('promise bị bỏ quên trong phân hệ thử'));
    res.json({ ok: true });
  });
  // Lỗi ném đồng bộ trong setTimeout — nổ SAU khi đã trả lời, ngoài mọi middleware.
  app.get('/api/luoithu/no', (req, res) => {
    setTimeout(() => { throw new Error('nổ đồng bộ trong phân hệ thử'); }, 100);
    res.json({ ok: true });
  });
};
`);
const donDep = () => fs.rmSync(THU_MUC_NO, { recursive: true, force: true });
process.on('exit', donDep);
process.on('SIGINT', () => { donDep(); process.exit(1); });

// --- Máy chủ có ghi log ra tệp để soi được lời giải thích -------------------
const LOG = path.join(DIR, 'server.log');
let proc = null, maThoat = null;

async function batDau() {
  maThoat = null;
  const ra = fs.openSync(LOG, 'a');
  proc = spawn('node', ['server.js'], {
    cwd: GOC, stdio: ['ignore', ra, ra],
    env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR },
  });
  proc.on('exit', (code) => { maThoat = code; });
  proc.unref();
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 250));
    try { if ((await fetch(BASE + '/healthz')).ok) return; } catch { /* chưa sẵn sàng */ }
  }
  throw new Error('máy chủ không khởi động được');
}
process.on('exit', () => { try { proc?.kill('SIGKILL'); } catch { /* đã tắt */ } });
await batDau();

const login = async () => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'phuhuynh', password: '123456' }),
  });
  return r.headers.get('set-cookie')?.split(';')[0];
};
const doiLog = () => fs.readFileSync(LOG, 'utf8');

console.log('\n[1] Promise bị bỏ quên → app chạy tiếp, chỉ ghi log');
{
  const P = await login();
  const r = await fetch(BASE + '/api/luoithu/promise', { headers: { Cookie: P } });
  check('yêu cầu gây lỗi vẫn được trả lời', r.status === 200, r.status);
  await new Promise(r2 => setTimeout(r2, 800));

  check('tiến trình VẪN SỐNG', maThoat === null, maThoat);
  const song = await fetch(BASE + '/healthz').then(x => x.ok).catch(() => false);
  check('máy chủ vẫn trả lời', song);
  const khac = await fetch(BASE + '/api/remarks?studentId=s1', { headers: { Cookie: P } });
  check('các phân hệ khác vẫn dùng bình thường', khac.status === 200, khac.status);

  const log = doiLog();
  check('log nêu rõ có promise bị bỏ quên', /promise bị từ chối/i.test(log));
  check('log chép lại đúng lỗi để lần ra phân hệ', /promise bị bỏ quên trong phân hệ thử/.test(log));
  check('log nói rõ app vẫn chạy tiếp', /vẫn chạy tiếp/i.test(log));
}

console.log('\n[2] Lỗi ném đồng bộ → dừng có chủ ý, không chết câm lặng');
{
  const P = await login();
  const r = await fetch(BASE + '/api/luoithu/no', { headers: { Cookie: P } });
  check('yêu cầu gây lỗi vẫn được trả lời trước khi nổ', r.status === 200, r.status);

  // Chờ tiến trình thoát — tối đa 5 giây.
  for (let i = 0; i < 20 && maThoat === null; i++) await new Promise(r2 => setTimeout(r2, 250));
  check('tiến trình dừng lại (không chạy tiếp với trạng thái hỏng)', maThoat !== null);
  check('mã thoát 1 để trình giám sát biết là sự cố', maThoat === 1, maThoat);

  const log = doiLog();
  check('log giải thích vì sao phải dừng', /phải dừng để tránh ghi dữ liệu sai/i.test(log));
  check('log chép lại đúng lỗi gây dừng', /nổ đồng bộ trong phân hệ thử/.test(log));
  check('log nói trình giám sát sẽ bật lại', /khởi động lại/i.test(log));
  check('log chỉ cách lần ra phân hệ gây lỗi', /phân hệ nào gây ra/i.test(log));
}

console.log('\n[3] Bật lại như trình giám sát làm → dữ liệu còn nguyên');
{
  await batDau();
  const P = await login();
  check('đăng nhập lại được ngay', !!P);
  const hs = await fetch(BASE + '/api/students', { headers: { Cookie: P } });
  const ds = await hs.json();
  check('danh sách học sinh còn nguyên', hs.status === 200 && ds.length >= 1, ds.length);
  const dd = await fetch(BASE + '/api/attendance?studentId=s1', { headers: { Cookie: P } });
  check('dữ liệu điểm danh còn nguyên', dd.status === 200 && (await dd.json()).length > 0);
  proc.kill('SIGTERM');
}

tongKet();
