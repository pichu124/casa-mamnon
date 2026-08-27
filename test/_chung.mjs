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
// Có retry vì trên Windows tệp của lần chạy trước có thể còn bị giữ thêm một nhịp.
export function thuMucTam(ten) {
  const dir = path.join(os.tmpdir(), `schoolconnect-test-${ten}`);
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  return dir;
}

// Dọn thư mục tạm ở CUỐI bài. Trên Windows, máy chủ thử vừa bị tắt có thể còn
// giữ tệp .db thêm một lát và hệ điều hành sẽ từ chối xóa (EBUSY) — khác Linux.
// Xóa không được thì bỏ qua: thuMucTam() của lần chạy sau sẽ dọn nốt. Đừng để
// việc đổ rác làm đỏ một bài kiểm thử đã đạt.
export function donThuMucTam(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch { /* Windows còn giữ tệp — lần chạy sau dọn */ }
}

// Sinh dữ liệu mẫu vào cơ sở dữ liệu tạm.
export function sinhDuLieu(dir) {
  // Truyền DATA_DIR qua tham số env, KHÔNG viết vào chuỗi lệnh: cú pháp
  // `TEN_BIEN=... lệnh` chỉ shell của Linux/Mac hiểu, trên Windows sẽ lỗi ngay.
  execSync('node data/seed.js --force', { cwd: GOC, stdio: 'ignore', env: { ...process.env, DATA_DIR: dir } });
}

// Bật sẵn một vài phân hệ trong cơ sở dữ liệu tạm, TRƯỚC khi dựng máy chủ.
//
// VÌ SAO CẦN
//
// "Nề nếp" và "Báo cáo" nay TẮT SẴN (nhà trường quyết ở N3 — chúng xếp hạng
// trẻ, đi ngược QUY TẮC 4). Nhưng vài bộ kiểm thử vẫn phải soi đúng hai phân hệ
// đó: chúng canh những lỗ hổng đã vá bên trong, và những lỗ hổng ấy không biến
// mất chỉ vì phân hệ đang tắt — nhà trường bật lại là chúng quay về.
//
// Nên các bộ đó BẬT TƯỜNG MINH phân hệ mình cần, thay vì dựa vào mặc định. Viết
// thẳng vào bảng cài đặt trước khi máy chủ chạy: không cần tài khoản quản trị,
// và bài kiểm thử nói rõ nó đang dựng tình huống gì.
export function batPhanHe(dir, cacKhoa) {
  const lenh = cacKhoa
    .map((k) => `INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt) `
      + `VALUES ('${k}', 1, '');`)
    .join(' ');
  execSync(`node -e ${JSON.stringify(
    `const D=require('better-sqlite3');const db=new D(process.argv[1]);db.exec(${JSON.stringify(lenh)});db.close();`
  )} ${JSON.stringify(path.join(dir, 'school.db'))}`, { cwd: GOC, stdio: 'ignore' });
}

// Tạo một tài khoản quản trị và trả về mật khẩu tạm mà script in ra.
export function taoQuanTri(dir, hoTen, tenDangNhap) {
  const out = execSync(
    `node scripts/create-admin.js ${JSON.stringify(hoTen)} ${tenDangNhap}`,
    { cwd: GOC, env: { ...process.env, DATA_DIR: dir } }).toString();
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

// Trình duyệt cho các bài kiểm thử giao diện. Thứ tự tìm:
//   1. CHROMIUM_PATH nếu người chạy chỉ định;
//   2. bản cài sẵn của môi trường CI (chỉ tồn tại trên Linux);
//   3. undefined — để Playwright tự dùng trình duyệt nó tải về lúc npm install,
//      đây là đường đi trên máy Windows của trường.
export const CHROMIUM = process.env.CHROMIUM_PATH
  || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// Banner mời bật thông báo là một lớp phủ cố định ở đáy màn hình. Nó che mất nút
// mà bài kiểm thử định bấm, và che chỗ nào thì tùy kích thước cửa sổ — chạy trên
// máy này qua, chạy trên máy khác lại đỏ. Tắt nó đi ngay từ đầu để bài kiểm thử
// chỉ đo đúng thứ nó định đo. Bản thân banner không có bài kiểm thử nào.
export async function tatBannerThongBao(ctx) {
  await ctx.addInitScript(() => {
    try { localStorage.setItem('pushBannerDismissed', '1'); } catch { /* chưa có localStorage */ }
  });
  return ctx;
}
