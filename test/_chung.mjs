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
import { spawn, execSync, execFileSync } from 'child_process';

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
  chayTrenCsdl(dir, `
    const bat = db.prepare('INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt) VALUES (?, 1, ?)');
    for (const k of process.argv.slice(2)) bat.run(k, new Date().toISOString());
  `, cacKhoa);
}

// Khoá một tài khoản vào một cơ sở (biến quản trị Cấp 1 thành Cấp 3).
//
// Nhận TÊN ĐĂNG NHẬP chứ không nhận mã: `taoQuanTri` sinh mã ngẫu nhiên, còn
// tên đăng nhập là thứ bài kiểm thử tự đặt và biết chắc.
//
// Viết thẳng vào bảng, TRƯỚC khi dựng máy chủ. Màn hình để nhà trường làm việc
// này chưa có — nó thuộc đợt sau — nhưng đường quyền thì đã phải đúng ngay từ
// bây giờ, và bài kiểm thử không được chờ màn hình mới canh được đường quyền.
export function khoaVaoCoSo(dir, tenDangNhap, campusId) {
  chayTrenCsdl(dir, `
    const u = db.prepare('SELECT id FROM users WHERE username = ?').get(process.argv[2]);
    if (!u) throw new Error('Không có tài khoản ' + process.argv[2]);
    db.prepare('INSERT OR REPLACE INTO user_campus (userId, campusId, ganLuc) VALUES (?, ?, ?)')
      .run(u.id, process.argv[3], new Date().toISOString());
  `, [tenDangNhap, campusId]);
}

// Gắn thêm một phụ huynh nữa cho một bé.
//
// Dữ liệu mẫu cho mỗi bé đúng MỘT phụ huynh, nên tình huống "bé có cả bố lẫn
// mẹ" không tự có. Mà đó lại đúng là tình huống nhà trường yêu cầu (*bắt buộc
// có cả bố/mẹ*) và là chỗ ranh giới dữ liệu dễ rò nhất: hai người cùng mở được
// một hồ sơ, nên thứ gì của riêng một người phải được cắt ra khỏi hồ sơ chung.
//
// Viết thẳng vào bảng, TRƯỚC khi dựng máy chủ — chưa có màn hình nào làm việc
// này, và bài kiểm thử không được chờ màn hình mới canh được ranh giới.
export function ganPhuHuynh(dir, studentId, parentId) {
  chayTrenCsdl(dir, `
    db.prepare('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)')
      .run(process.argv[2], process.argv[3]);
  `, [studentId, parentId]);
}

// Chạy một đoạn mã ngắn trên cơ sở dữ liệu tạm, ngoài tiến trình bài kiểm thử.
//
// Dùng `execFileSync` chứ KHÔNG dựng chuỗi lệnh cho shell: đoạn mã nhiều dòng đi
// qua shell sẽ bị nuốt mất xuống dòng và Node báo "Invalid or unexpected token"
// — một lỗi khó đọc, xảy ra ở chỗ chẳng liên quan gì tới thứ đang kiểm.
//
// Chạy ngoài tiến trình vì `lib/db.js` giữ một kết nối mở suốt vòng đời tiến
// trình; mở thêm một kết nối ghi trong cùng tiến trình là tự chuốc SQLITE_BUSY.
function chayTrenCsdl(dir, ma, doiSo = []) {
  // Với `node -e`, `process.argv[1]` là THAM SỐ ĐẦU TIÊN (không phải tên tệp).
  // Đếm lệch một chỗ ở đây là mở nhầm một tệp không tồn tại rồi TẠO MỚI nó —
  // SQLite không báo lỗi khi mở, chỉ báo "no such table" ở câu sau, và để lại
  // một tệp cơ sở dữ liệu lạc ngay giữa kho mã.
  execFileSync('node', ['-e', `const D = require('better-sqlite3');
    const db = new D(process.argv[1]);
    ${ma}
    db.close();`, path.join(dir, 'school.db'), ...doiSo], { cwd: GOC, stdio: 'inherit' });
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

  // Cổng đã có người trả lời TRƯỚC khi ta dựng gì cả thì phải dừng ngay.
  //
  // ĐÂY LÀ CHỖ MỘT BÀI KIỂM THỬ CÓ THỂ NÓI DỐI MÀ KHÔNG AI BIẾT
  //
  // Hai bộ kiểm thử cùng đặt một số cổng, hoặc một máy chủ thử của lần chạy
  // trước còn sót lại: tiến trình `node server.js` mới sinh ra sẽ chết lặng lẽ
  // vì cổng đã bị chiếm (stdio bị nuốt, không ai thấy lỗi), rồi vòng chờ bên
  // dưới hỏi /healthz và NGƯỜI CŨ trả lời "ổn". Từ giây đó trở đi cả bài kiểm
  // thử chạy trên một cơ sở dữ liệu khác — có khi là tệp đã bị xóa mà tiến
  // trình cũ còn giữ. Kết quả xanh hay đỏ đều vô nghĩa, và mất rất lâu mới lần
  // ra vì mọi thứ trông như đang chạy bình thường.
  //
  // Chết to còn hơn xanh giả.
  try {
    const cu = await fetch(`http://localhost:${port}/healthz`, { signal: AbortSignal.timeout(2000) });
    if (cu.ok) {
      throw new Error(
        `Cổng ${port} đã có máy chủ khác đang trả lời.\n` +
        '  Bài kiểm thử này sẽ chạy nhầm trên dữ liệu của máy chủ đó.\n' +
        '  Thường là do hai bộ kiểm thử dùng chung một số cổng, hoặc một lần\n' +
        '  chạy trước chưa tắt hẳn. Đặt TEST_PORT khác rồi chạy lại.');
    }
  } catch (err) {
    // Không ai trả lời là đúng như mong đợi — chỉ ném lại lời cảnh báo của ta.
    if (/đã có máy chủ khác/.test(err.message)) throw err;
  }

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
