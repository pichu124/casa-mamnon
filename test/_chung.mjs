// Tiện ích dùng chung cho các bộ kiểm thử.
//
// Mỗi bộ tự dựng một máy chủ riêng, trên một cổng riêng, với một cơ sở dữ liệu
// tạm trong thư mục tạm của hệ điều hành. Nhờ vậy:
//   - chạy được trên bất kỳ máy nào, không cần khởi động sẵn `npm start`;
//   - KHÔNG bao giờ đụng tới dữ liệu thật của trường trong `data/school.db`;
//   - các bộ không giẫm chân nhau, chạy lại bao nhiêu lần cũng cho kết quả như nhau.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Bộ đếm kết quả kèm hàm kiểm tra, dùng chung một kiểu in ra màn hình.
export function taoBoDem() {
  const trangThai = { pass: 0, fail: 0, errs: [] };
  const check = (ten, dung, them) => {
    if (dung) { trangThai.pass++; console.log('  ✓', ten); }
    else {
      trangThai.fail++;
      trangThai.errs.push(`${ten} ${them != null ? JSON.stringify(them).slice(0, 250) : ''}`);
      console.log('  ✗', ten, them ?? '');
    }
  };
  const tongKet = () => {
    console.log(`\n===== PASS: ${trangThai.pass}  FAIL: ${trangThai.fail} =====`);
    if (trangThai.errs.length) {
      console.log('\nLỖI:');
      trangThai.errs.forEach(e => console.log(' ✗', e));
      process.exit(1);
    }
  };
  return { check, tongKet, trangThai };
}

// Thư mục dữ liệu tạm riêng của một bộ kiểm thử, xóa sạch trước khi dùng.
export function thuMucTam(ten) {
  const dir = path.join(os.tmpdir(), `schoolconnect-test-${ten}`);
  fs.rmSync(dir, { recursive: true, force: true });
  return dir;
}

// Sinh dữ liệu mẫu vào cơ sở dữ liệu tạm.
export function sinhDuLieu(dir) {
  execSync(`DATA_DIR=${dir} node data/seed.js --force`, { cwd: GOC, stdio: 'ignore' });
}

// Tạo một tài khoản quản trị và trả về mật khẩu tạm mà script in ra.
export function taoQuanTri(dir, hoTen, tenDangNhap) {
  const out = execSync(
    `DATA_DIR=${dir} node scripts/create-admin.js ${JSON.stringify(hoTen)} ${tenDangNhap}`,
    { cwd: GOC }).toString();
  const mk = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];
  if (!mk) throw new Error('Không đọc được mật khẩu tạm từ scripts/create-admin.js');
  return mk;
}

// Dựng máy chủ và chờ tới khi nó trả lời được. Trả về đối tượng có hàm `dung()`
// và `khoiDongLai()` để thử các tình huống khởi động lại.
export async function dungMayChu({ port, dir, env = {} }) {
  let proc = null;

  async function batDau() {
    proc = spawn('node', ['server.js'], {
      cwd: GOC, stdio: 'ignore',
      env: { ...process.env, PORT: String(port), DATA_DIR: dir, ...env },
    });
    // Không để tiến trình máy chủ giữ bài kiểm thử sống mãi sau khi chạy xong;
    // móc 'exit' bên dưới vẫn tắt nó khi bài kiểm thử kết thúc.
    proc.unref();
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 250));
      try { if ((await fetch(`http://localhost:${port}/healthz`)).ok) return; } catch { /* chưa sẵn sàng */ }
    }
    throw new Error(`Máy chủ không khởi động được trên cổng ${port}`);
  }

  function dung() { try { proc?.kill('SIGKILL'); } catch { /* đã tắt */ } }

  await batDau();
  process.on('exit', dung);
  process.on('SIGINT', () => { dung(); process.exit(1); });

  return {
    BASE: `http://localhost:${port}`,
    dung,
    async khoiDongLai() {
      try { proc?.kill('SIGTERM'); } catch { /* đã tắt */ }
      await new Promise(r => setTimeout(r, 1500));
      await batDau();
    },
  };
}

// Gọi API kèm cookie, trả về { status, data, setCookie }.
export function taoReq(BASE) {
  return async function req(method, duongDan, { body, cookie } = {}) {
    const res = await fetch(BASE + duongDan, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* không phải JSON */ }
    return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
  };
}

// Đăng nhập, trả về kết quả kèm cookie phiên đã tách sẵn.
export function taoLogin(req) {
  return async function login(username, password) {
    const r = await req('POST', '/api/auth/login', { body: { username, password } });
    return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null };
  };
}

// Trình duyệt Playwright dùng sẵn trong môi trường, không phải tải về.
export const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
