// Bài canh: KHỞI ĐỘNG LẠI MÁY CHỦ KHÔNG ĐƯỢC LÀM CẢ TRƯỜNG ĐỨNG HÌNH.
//
// Chạy bằng:  node test/khoi-dong-khong-treo.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ251, đợt soát toàn kho 12/11)
//
// Ở chế độ chạy thật, `server.js` soát xem còn tài khoản nào dùng mật khẩu mẫu
// hay không. Phép soát ấy băm thử mật khẩu mẫu với TỪNG tài khoản, mà mỗi lần
// băm là khoảng 40 mili-giây và chặn cả tiến trình (scrypt đồng bộ). Bản cũ
// làm một mạch ngay sau khi mở cổng: trong suốt lúc đó máy chủ đã nhận kết
// nối nhưng không trả lời ai.
//
// Với mười mấy tài khoản mẫu thì không ai thấy. Với một trường ~300 bé (~640
// tài khoản) là chừng nửa phút im lặng sau MỖI lần cập nhật và mỗi lần dịch vụ
// tự bật lại — đúng lúc cô đang điểm danh thì màn hình quay mãi.
//
// ĐO THỨ TỰ, KHÔNG ĐO TỐC ĐỘ. Bài không hỏi "mất mấy giây" (đỏ ngẫu nhiên theo
// máy), mà hỏi: máy chủ có trả lời được một yêu cầu TRƯỚC KHI soát xong không.
// Bản cũ không bao giờ làm được điều đó, máy nhanh hay chậm cũng vậy.
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { GOC, taoBoDem, thuMucTam, donThuMucTam, sinhDuLieu } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 7331);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('khoi-dong-khong-treo');
const SO_THEM = 60;

sinhDuLieu(DIR);

// Thêm 60 tài khoản mang CÙNG chuỗi băm của một tài khoản mẫu: không tốn công
// băm lúc dựng, nhưng máy chủ vẫn phải băm thử từng cái khi soát.
const tongTaiKhoan = Number(execFileSync('node', ['-e', `
  const D = require('better-sqlite3');
  const db = new D(process.argv[1]);
  const mau = db.prepare("SELECT * FROM users WHERE role = 'parent' ORDER BY id LIMIT 1").get();
  const cot = Object.keys(mau);
  const them = db.prepare('INSERT INTO users (' + cot.join(', ') + ') VALUES (' + cot.map(() => '?').join(', ') + ')');
  db.transaction(() => {
    for (let i = 0; i < Number(process.argv[2]); i++) {
      const dong = { ...mau, id: 'kd' + i, username: 'khoidong' + i, name: 'Tài khoản thử ' + i };
      them.run(cot.map(c => dong[c]));
    }
  })();
  process.stdout.write(String(db.prepare('SELECT COUNT(*) AS n FROM users').get().n));
  db.close();
`, path.join(DIR, 'school.db'), String(SO_THEM)], { cwd: GOC, encoding: 'utf8' }));

// Cổng phải trống — xem lời dặn ở `dungMayChu` của _chung.mjs.
try {
  const cu = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(1500) });
  if (cu.ok) {
    console.error(`Cổng ${PORT} đã có máy chủ khác đang trả lời. Đặt TEST_PORT khác rồi chạy lại.`);
    process.exit(1);
  }
} catch { /* không ai trả lời là đúng */ }

const moc = { dangChay: 0, traLoi: 0, canhBao: 0 };
let nhatKy = '';
const proc = spawn('node', ['server.js'], {
  cwd: GOC,
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR, NODE_ENV: 'production', HEN_GIO_PHUT: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const tatMayChu = () => { try { proc.kill('SIGKILL'); } catch { /* đã tắt */ } };
process.on('exit', tatMayChu);
for (const dong of [proc.stdout, proc.stderr]) {
  // Giải mã theo DÒNG CHẢY, không theo từng mẩu: một mẩu cắt ngang chữ có dấu
  // ("Ả" trong "CẢNH BÁO") mà đổi thẳng ra chuỗi thì chữ ấy hỏng và mẫu tìm
  // bên dưới không bao giờ khớp — bài đỏ ngẫu nhiên.
  dong.setEncoding('utf8');
  dong.on('data', (d) => {
    nhatKy += String(d);
    if (!moc.dangChay && /đang chạy tại/.test(nhatKy)) moc.dangChay = Date.now();
    if (!moc.canhBao && /CẢNH BÁO BẢO MẬT/.test(nhatKy)) moc.canhBao = Date.now();
  });
}

// Hỏi /healthz liên tục từ lúc dựng, ghi lại lần ĐẦU TIÊN có câu trả lời.
const hetGio = Date.now() + 60000;
while (Date.now() < hetGio && !(moc.traLoi && moc.canhBao)) {
  if (!moc.traLoi) {
    try {
      const r = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) moc.traLoi = Date.now();
    } catch { /* chưa sẵn sàng, hoặc đang bị chặn */ }
  }
  await new Promise(r => setTimeout(r, 25));
}
tatMayChu();

// ===========================================================================
console.log('\n[1] Máy chủ chạy thật khởi động được và vẫn soát mật khẩu mẫu');
{
  check('máy chủ báo đang chạy', moc.dangChay > 0, nhatKy.slice(-300));
  check('máy chủ trả lời /healthz', moc.traLoi > 0);
  check('lời cảnh báo mật khẩu mẫu VẪN được in ra', moc.canhBao > 0, nhatKy.slice(-300));
  // Không chạy trong khoảng không: phải thật sự có cả đống tài khoản để soát,
  // và phép soát phải đếm ĐỦ — sửa cho nhanh mà đếm thiếu là sửa hỏng.
  const m = nhatKy.match(/CẢNH BÁO BẢO MẬT: (\d+) tài khoản/);
  check(`có hơn ${SO_THEM} tài khoản để soát`, tongTaiKhoan > SO_THEM, tongTaiKhoan);
  check('đếm ĐỦ mọi tài khoản còn dùng mật khẩu mẫu',
    !!m && Number(m[1]) === tongTaiKhoan, { inRa: m && m[1], trongCsdl: tongTaiKhoan });
}

// ===========================================================================
console.log('\n[2] Trong lúc soát, máy chủ VẪN trả lời');
{
  check('trả lời được một yêu cầu TRƯỚC KHI soát xong',
    moc.traLoi > 0 && moc.canhBao > 0 && moc.traLoi < moc.canhBao,
    { traLoiSauKhiChay: moc.traLoi - moc.dangChay, soatXongSauKhiChay: moc.canhBao - moc.dangChay });
}

// ===========================================================================
console.log('\n[3] Mã nguồn không còn băm một mạch trong lúc đã mở cổng');
{
  const ma = fs.readFileSync(path.join(GOC, 'server.js'), 'utf8');
  const ham = ma.slice(ma.indexOf('function warnDefaultPasswords'), ma.indexOf('// Cơ sở dữ liệu trống'));
  check('tìm thấy hàm soát mật khẩu mẫu', ham.length > 200, ham.length);
  check('không còn lọc cả danh sách bằng password.verify trong một nhịp',
    !/\.filter\([^)]*password\.verify/.test(ham));
  check('có nhả vòng lặp sự kiện giữa các lần băm', /setImmediate\(/.test(ham));
}

donThuMucTam(DIR);
tongKet();
