#!/usr/bin/env node
// Kiểm tra một BẢN CÀI ĐẶT ĐANG CHẠY của SchoolConnect.
//
//   DATA_DIR=/var/lib/schoolconnect npm run kiem-tra-may-chu
//   DATA_DIR=/var/lib/schoolconnect npm run kiem-tra-may-chu -- --ten-mien=lienlac.truong.vn
//
// VÌ SAO CẦN BỘ NÀY, TRONG KHI ĐÃ CÓ 760 BÀI KIỂM THỬ
//
// Toàn bộ 760 bài chạy trên máy tạm với cơ sở dữ liệu tạm. Chúng canh phần mã
// có đúng không — và canh rất kỹ. Nhưng chúng KHÔNG nhìn thấy máy chủ thật.
//
// Một máy chủ đặt sai múi giờ, chưa hề sao lưu lần nào, để dữ liệu ngay trong
// thư mục mã nguồn, và cả 8 tài khoản vẫn dùng mật khẩu "123456" — vẫn xanh đủ
// 760 bài. Những lỗi ấy không nằm trong mã, chúng nằm ở khoảng cách giữa tài
// liệu và việc thực sự làm trên máy.
//
// Bộ này bịt đúng khoảng cách đó. Nó CHỈ BÁO, KHÔNG TỰ SỬA — mỗi mục hỏng đều
// in kèm câu lệnh khắc phục để người phụ trách ở trường tự làm được.
//
// Chạy ở hai thời điểm: ngay sau khi dựng xong máy chủ (bảng kiểm Giai đoạn 3),
// và định kỳ hằng tháng.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const tls = require('tls');
const { execFileSync } = require('child_process');

const GOC = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(GOC, 'data');
const DB_FILE = path.join(DATA_DIR, 'school.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const args = process.argv.slice(2);
const tenMien = (args.find(a => a.startsWith('--ten-mien=')) || '').split('=')[1] || process.env.PUBLIC_DOMAIN || '';

// ---------------------------------------------------------------------------
// Thu thập kết quả. Mỗi mục kiểm chạy trong khối bắt lỗi riêng: một mục hỏng
// không được làm cả bản báo cáo tắt ngóm, vì đúng lúc máy chủ có vấn đề là lúc
// người ta cần đọc các mục còn lại nhất.
// ---------------------------------------------------------------------------
const ketQua = [];
const dat = (ten, chiTiet) => ketQua.push({ trangThai: 'ĐẠT', ten, chiTiet });
const canSua = (ten, chiTiet, cach) => ketQua.push({ trangThai: 'CẦN SỬA', ten, chiTiet, cach });
const boQua = (ten, chiTiet) => ketQua.push({ trangThai: 'BỎ QUA', ten, chiTiet });

function kiem(ten, fn) {
  try { fn(); }
  catch (err) {
    ketQua.push({ trangThai: 'CẦN SỬA', ten, chiTiet: `không kiểm được: ${err.message}`,
      cach: 'Bản thân phép kiểm này lỗi — báo người viết phần mềm.' });
  }
}

// Chạy một lệnh hệ điều hành, trả về chuỗi hoặc null nếu máy không có lệnh đó.
function chay(lenh, thamSo) {
  try { return execFileSync(lenh, thamSo, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
}

// ---------------------------------------------------------------------------
// 1. Múi giờ
// ---------------------------------------------------------------------------
kiem('Múi giờ máy chủ', () => {
  const lech = -new Date().getTimezoneOffset(); // phút, UTC+7 → 420
  const ten = Intl.DateTimeFormat().resolvedOptions().timeZone || '(không rõ)';
  const gioHienTai = new Date().toLocaleString('vi-VN');
  if (lech === 420) {
    dat('Múi giờ máy chủ', `${ten} (UTC+7) — bây giờ là ${gioHienTai}`);
    return;
  }
  const dau = lech >= 0 ? '+' : '-';
  canSua('Múi giờ máy chủ',
    `đang là ${ten} (UTC${dau}${Math.abs(lech) / 60}), lệch giờ Việt Nam ${(420 - lech) / 60} tiếng. ` +
    'Lịch sao lưu "2 giờ sáng" sẽ chạy sai giờ, và mọi dấu thời gian trong nhật ký đều lệch.',
    os.platform() === 'win32'
      ? 'Cài đặt Windows → Thời gian và ngôn ngữ → chọn múi giờ (UTC+07:00) Hà Nội.'
      : 'sudo timedatectl set-timezone Asia/Ho_Chi_Minh');
});

// ---------------------------------------------------------------------------
// 2. Dữ liệu nằm ngoài kho mã
// ---------------------------------------------------------------------------
kiem('Vị trí dữ liệu', () => {
  const trongKhoMa = !path.relative(GOC, DATA_DIR).startsWith('..');
  const coGit = fs.existsSync(path.join(GOC, '.git'));
  if (!trongKhoMa) {
    dat('Vị trí dữ liệu', `${DATA_DIR} — nằm ngoài kho mã, an toàn khi cập nhật bằng git pull`);
  } else if (!coGit) {
    boQua('Vị trí dữ liệu', `${DATA_DIR} nằm trong thư mục app, nhưng đây không phải kho git nên rủi ro thấp`);
  } else {
    canSua('Vị trí dữ liệu',
      `${DATA_DIR} nằm TRONG kho mã. Một lần "git add -A" theo thói quen là hồ sơ của bé lên GitHub.`,
      'Chuyển dữ liệu ra ngoài rồi khởi động lại với DATA_DIR trỏ tới chỗ mới ' +
      '(Linux: /var/lib/schoolconnect — Windows: C:\\SchoolConnectData).');
  }
});

// ---------------------------------------------------------------------------
// 3. Cơ sở dữ liệu mở được + mật khẩu mẫu
//
// Mở ở chế độ chỉ đọc và bắt buộc tệp phải có sẵn: một bộ KIỂM TRA không được
// phép tạo ra thứ nó đang đi kiểm.
// ---------------------------------------------------------------------------
let sqlite = null;
kiem('Cơ sở dữ liệu', () => {
  if (!fs.existsSync(DB_FILE)) {
    canSua('Cơ sở dữ liệu', `không thấy tệp ${DB_FILE}`,
      'Kiểm lại DATA_DIR có trỏ đúng thư mục dữ liệu của máy chủ này không.');
    return;
  }
  const Database = require('better-sqlite3');
  sqlite = new Database(DB_FILE, { readonly: true, fileMustExist: true });
  const soHs = sqlite.prepare('SELECT COUNT(*) n FROM students WHERE active = 1').get().n;
  const soNd = sqlite.prepare('SELECT COUNT(*) n FROM users WHERE active = 1').get().n;
  const mb = (fs.statSync(DB_FILE).size / 1024 / 1024).toFixed(1);
  dat('Cơ sở dữ liệu', `mở được — ${soHs} bé, ${soNd} người dùng, ${mb} MB`);
});

kiem('Mật khẩu mẫu', () => {
  if (!sqlite) { boQua('Mật khẩu mẫu', 'chưa mở được cơ sở dữ liệu'); return; }
  const password = require('../lib/password');
  const mau = process.env.DEMO_PASSWORD || '123456';
  const yeu = sqlite.prepare('SELECT id, username, passwordHash FROM users WHERE active = 1').all()
    .filter(u => { try { return password.verify(mau, u.passwordHash); } catch { return false; } });
  if (!yeu.length) {
    dat('Mật khẩu mẫu', 'không còn tài khoản nào dùng mật khẩu mẫu');
    return;
  }
  canSua('Mật khẩu mẫu',
    `${yeu.length} tài khoản còn dùng "${mau}": ${yeu.map(u => u.username).join(', ')}`,
    'Đăng nhập từng tài khoản rồi đổi trong Cài đặt → Đổi mật khẩu. ' +
    'Hoặc quản trị cấp lại mật khẩu tạm trong Quản trị → Tài khoản.');
});

// ---------------------------------------------------------------------------
// 3b. Hai cột chủ nhiệm đời cũ có còn khớp nhau không
//
// Từ G0.4, quyền đọc hồ sơ trẻ KHÔNG còn đi theo hai cột này nữa mà đi theo bảng
// `class_teachers` (xem mục 3c). Hai cột `classes.teacherId` và `users.classId`
// vẫn được ghi làm gương, và phần chuyển đổi lúc khởi động dựng lại bảng mới từ
// chính chúng khi khôi phục từ bản sao lưu đời cũ — nên chúng lệch nhau vẫn là
// chuyện phải sửa, chỉ khác là hậu quả bây giờ nằm ở đường khôi phục.
// ---------------------------------------------------------------------------
kiem('Hai cột phân công đời cũ', () => {
  if (!sqlite) { boQua('Hai cột phân công đời cũ', 'chưa mở được cơ sở dữ liệu'); return; }
  const thua = sqlite.prepare(
    `SELECT u.id, u.name FROM users u
     LEFT JOIN classes c ON c.id = u.classId
     WHERE u.role = 'teacher' AND u.classId IS NOT NULL
       AND (c.id IS NULL OR c.teacherId IS NOT u.id)`).all();
  const thieu = sqlite.prepare(
    `SELECT c.id, c.name FROM classes c
     LEFT JOIN users u ON u.id = c.teacherId
     WHERE c.teacherId IS NOT NULL AND (u.id IS NULL OR u.classId IS NOT c.id)`).all();
  if (!thua.length && !thieu.length) {
    dat('Hai cột phân công đời cũ', 'khớp nhau — phần chuyển đổi lúc khởi động dựng lại đúng');
    return;
  }
  const phan = [];
  if (thua.length) phan.push(`${thua.length} cô còn gắn với nhóm không còn là của mình (${thua.map(t => t.name).join(', ')})`);
  if (thieu.length) phan.push(`${thieu.length} nhóm ghi tên cô nhưng cô không nhận được nhóm (${thieu.map(c => c.name).join(', ')})`);
  canSua('Hai cột phân công đời cũ', phan.join('; '),
    `DATA_DIR=${DATA_DIR} npm run sua-quyen-chu-nhiem   (xem trước; thêm -- --sua để sửa thật)`);
});

// ---------------------------------------------------------------------------
// 3c. Nhóm lớp đang mở đã có cô phụ trách chưa
//
// Đây mới là chỗ quyết định quyền từ G0.4: cô đọc được hồ sơ trẻ của những nhóm
// có tên cô trong `class_teachers`. Nhóm đang mở mà bảng này trống thì cô đăng
// nhập vào thấy "Nhóm chưa có bé nào" — không điểm danh, không nhận xét, không
// nhắn tin với gia đình được, và không có gì báo cho ai biết.
// ---------------------------------------------------------------------------
kiem('Cô phụ trách nhóm lớp', () => {
  if (!sqlite) { boQua('Cô phụ trách nhóm lớp', 'chưa mở được cơ sở dữ liệu'); return; }
  const trong = sqlite.prepare(
    `SELECT c.id, c.name FROM classes c
     WHERE c.active = 1
       AND NOT EXISTS (
         SELECT 1 FROM class_teachers ct JOIN users u ON u.id = ct.teacherId
         WHERE ct.classId = c.id AND u.active = 1)
     ORDER BY c.name`).all();
  if (!trong.length) {
    dat('Cô phụ trách nhóm lớp', 'nhóm lớp nào đang mở cũng có cô phụ trách');
    return;
  }
  canSua('Cô phụ trách nhóm lớp',
    `${trong.length} nhóm lớp đang mở chưa có cô nào phụ trách (${trong.map(c => c.name).join(', ')})`,
    'Vào Quản trị → Lớp, bấm Sửa ở dòng nhóm được tô đỏ rồi chọn cô phụ trách.');
});

// ---------------------------------------------------------------------------
// 4. Có lịch sao lưu tự động không
// ---------------------------------------------------------------------------
kiem('Lịch sao lưu tự động', () => {
  const nguon = [];
  const timer = chay('systemctl', ['list-timers', '--all', '--no-pager']);
  if (timer && /schoolconnect.*backup|backup.*schoolconnect/i.test(timer)) nguon.push('systemd timer');
  const cron = chay('crontab', ['-l']);
  if (cron && /npm run backup|scripts\/backup\.js/i.test(cron)) nguon.push('cron');
  const task = chay('schtasks', ['/Query', '/TN', 'SchoolConnect-SaoLuu']);
  if (task) nguon.push('Task Scheduler');

  if (nguon.length) {
    dat('Lịch sao lưu tự động', `đã đặt qua ${nguon.join(' và ')}`);
    return;
  }
  canSua('Lịch sao lưu tự động', 'không tìm thấy lịch sao lưu nào',
    'Xem mục 4.2 trong docs/QUY-TRINH-TRIEN-KHAI.docx để đặt lịch chạy hằng đêm.');
});

// ---------------------------------------------------------------------------
// 5. Bản sao lưu gần nhất — có mới không, và có MỞ RA ĐƯỢC không
// ---------------------------------------------------------------------------
kiem('Bản sao lưu gần nhất', () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    canSua('Bản sao lưu gần nhất', `chưa có thư mục ${BACKUP_DIR} — chưa từng sao lưu lần nào`,
      `DATA_DIR=${DATA_DIR} npm run backup`);
    return;
  }
  const ds = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db.gz'))
    .map(f => ({ f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!ds.length) {
    canSua('Bản sao lưu gần nhất', 'thư mục sao lưu rỗng',
      `DATA_DIR=${DATA_DIR} npm run backup`);
    return;
  }
  const gioTuoi = (Date.now() - ds[0].mtime) / 3600000;
  const moTa = `${ds[0].f} (${ds.length} bản, bản mới nhất cách đây ${gioTuoi.toFixed(1)} giờ)`;
  if (gioTuoi > 48) {
    canSua('Bản sao lưu gần nhất',
      `${moTa} — quá 48 tiếng, lịch sao lưu hằng đêm nhiều khả năng đã ngừng chạy`,
      'Kiểm lịch sao lưu ở mục trên, và xem nhật ký /home/<tài khoản>/backup.log.');
  } else {
    dat('Bản sao lưu gần nhất', moTa);
  }
});

kiem('Bản sao lưu mở ra được', () => {
  if (!fs.existsSync(BACKUP_DIR) || !fs.readdirSync(BACKUP_DIR).some(f => f.endsWith('.db.gz'))) {
    boQua('Bản sao lưu mở ra được', 'chưa có bản sao lưu nào để thử');
    return;
  }
  try {
    execFileSync(process.execPath, [path.join(GOC, 'scripts', 'restore.js'), '--kiem-tra'],
      { cwd: GOC, env: { ...process.env, DATA_DIR }, stdio: ['ignore', 'pipe', 'pipe'] });
    dat('Bản sao lưu mở ra được', 'giải nén và đọc thử thành công — bản sao dùng được thật');
  } catch (err) {
    canSua('Bản sao lưu mở ra được',
      'bản sao lưu mới nhất KHÔNG mở được — coi như đang không có bản sao lưu nào',
      `Chạy "DATA_DIR=${DATA_DIR} npm run restore:check" để xem lỗi cụ thể, rồi sao lưu lại ngay.`);
  }
});

// ---------------------------------------------------------------------------
// 6. Đĩa còn trống
// ---------------------------------------------------------------------------
kiem('Dung lượng đĩa', () => {
  if (typeof fs.statfsSync !== 'function') {
    boQua('Dung lượng đĩa', 'phiên bản Node không hỗ trợ đọc dung lượng đĩa');
    return;
  }
  const st = fs.statfsSync(DATA_DIR);
  const trongGb = (st.bavail * st.bsize) / 1024 ** 3;
  const tongGb = (st.blocks * st.bsize) / 1024 ** 3;
  const moTa = `còn trống ${trongGb.toFixed(1)} GB / ${tongGb.toFixed(1)} GB`;
  if (trongGb < 2) {
    canSua('Dung lượng đĩa', `${moTa} — sắp đầy, album ảnh và bản sao lưu sẽ ghi hỏng`,
      'Xóa bớt bản sao lưu cũ trong thư mục backups, hoặc nâng dung lượng ổ đĩa.');
  } else {
    dat('Dung lượng đĩa', moTa);
  }
});

// ---------------------------------------------------------------------------
// 7. Chứng chỉ HTTPS (chỉ khi có truyền tên miền)
// ---------------------------------------------------------------------------
function kiemChungChi(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return resolve({ loi: 'không đọc được chứng chỉ' });
      resolve({ conLai: (new Date(cert.valid_to).getTime() - Date.now()) / 86400000, capBoi: (cert.issuer && cert.issuer.O) || '' });
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ loi: 'quá hạn chờ 8 giây' }); });
    socket.on('error', (e) => resolve({ loi: e.message }));
  });
}

async function main() {
  if (tenMien) {
    const kq = await kiemChungChi(tenMien);
    if (kq.loi) {
      canSua('Chứng chỉ HTTPS', `không kết nối được tới ${tenMien}: ${kq.loi}`,
        'Kiểm tên miền còn trỏ đúng IP máy chủ không, và "systemctl status caddy".');
    } else if (kq.conLai < 10) {
      canSua('Chứng chỉ HTTPS', `${tenMien} — chứng chỉ chỉ còn ${kq.conLai.toFixed(0)} ngày`,
        'Caddy lẽ ra tự gia hạn. Xem "journalctl -u caddy -n 50" tìm nguyên nhân.');
    } else {
      dat('Chứng chỉ HTTPS', `${tenMien} — còn ${kq.conLai.toFixed(0)} ngày${kq.capBoi ? `, cấp bởi ${kq.capBoi}` : ''}`);
    }
  } else {
    boQua('Chứng chỉ HTTPS', 'chưa truyền tên miền — thêm --ten-mien=lienlac.truong.vn để kiểm');
  }

  // -------------------------------------------------------------------------
  // In báo cáo
  // -------------------------------------------------------------------------
  const rong = Math.max(...ketQua.map(k => k.ten.length));
  console.log(`\nKIỂM TRA MÁY CHỦ SCHOOLCONNECT — ${new Date().toLocaleString('vi-VN')}`);
  console.log(`Thư mục dữ liệu: ${DATA_DIR}\n`);
  for (const k of ketQua) {
    const nhan = k.trangThai === 'ĐẠT' ? '  ✓ ĐẠT     ' : (k.trangThai === 'CẦN SỬA' ? '  ✗ CẦN SỬA ' : '  – BỎ QUA  ');
    console.log(`${nhan}${k.ten.padEnd(rong)}  ${k.chiTiet}`);
    if (k.cach) console.log(`${' '.repeat(14 + rong)}  → ${k.cach}`);
  }

  const hong = ketQua.filter(k => k.trangThai === 'CẦN SỬA');
  const soDat = ketQua.filter(k => k.trangThai === 'ĐẠT').length;
  console.log(`\n${soDat} mục đạt, ${hong.length} mục cần sửa.`);
  if (hong.length) {
    console.log('\nMáy chủ vẫn đang phục vụ bình thường — các mục trên không làm app ngừng chạy,');
    console.log('nhưng để lâu thì đúng lúc cần đến mới phát hiện đã muộn. Sửa sớm cho yên tâm.\n');
  } else {
    console.log('Máy chủ đang ở trạng thái tốt. Nên chạy lại bộ kiểm này mỗi tháng một lần.\n');
  }
  try { if (sqlite) sqlite.close(); } catch { /* đóng được thì tốt, không thì thôi */ }
  process.exit(hong.length ? 1 : 0);
}

main();
