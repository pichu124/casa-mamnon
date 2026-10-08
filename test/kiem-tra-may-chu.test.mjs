// Kiểm thử bộ kiểm tra máy chủ: nó có thật sự bắt được từng thứ nó hứa bắt không.
//
// Chạy bằng:  npm run test:may-chu
//
// Bộ canh mà không ai canh thì cũng chỉ là lời hứa. Mỗi mục kiểm trong
// scripts/kiem-tra-may-chu.js đều được thử theo CẢ HAI chiều: dựng ra tình huống
// hỏng để xem nó có báo không, rồi sửa tình huống đó để xem nó có thôi báo không.
// Chỉ thử một chiều thì không phân biệt được "bắt đúng" với "lúc nào cũng kêu".
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, MAU,
} from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const SCRIPT = path.join(GOC, 'scripts', 'kiem-tra-may-chu.js');

// Chạy bộ kiểm tra, trả về toàn bộ chữ nó in ra và mã thoát.
function chay(dir, { TZ = 'Asia/Ho_Chi_Minh', args = [] } = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, DATA_DIR: dir, TZ },
  });
  return { out: `${r.stdout || ''}${r.stderr || ''}`, ma: r.status };
}

// Đọc trạng thái của đúng một mục kiểm trong bản báo cáo.
function trangThai(out, ten) {
  const dong = out.split('\n').find(l => /[✓✗–]/.test(l) && l.includes(ten));
  if (!dong) return null;
  if (dong.includes('✓ ĐẠT')) return 'ĐẠT';
  if (dong.includes('✗ CẦN SỬA')) return 'CẦN SỬA';
  if (dong.includes('– BỎ QUA')) return 'BỎ QUA';
  return null;
}

const DIR = thuMucTam('may-chu');
fs.mkdirSync(DIR, { recursive: true });
sinhDuLieu(DIR);

// ---------------------------------------------------------------------------
console.log('\n[1] Múi giờ — bắt đúng lỗi đã gặp khi triển khai thật');
{
  const utc = chay(DIR, { TZ: 'UTC' });
  check('máy chủ chạy giờ UTC → CẦN SỬA', trangThai(utc.out, 'Múi giờ máy chủ') === 'CẦN SỬA', trangThai(utc.out, 'Múi giờ máy chủ'));
  check('nói rõ lệch mấy tiếng', /lệch giờ Việt Nam 7 tiếng/.test(utc.out));
  check('chỉ luôn câu lệnh sửa', /timedatectl set-timezone Asia\/Ho_Chi_Minh/.test(utc.out));
  check('nêu đúng hậu quả: lịch sao lưu chạy sai giờ', /Lịch sao lưu .* sẽ chạy sai giờ/.test(utc.out));

  const tokyo = chay(DIR, { TZ: 'Asia/Tokyo' });
  check('múi giờ khác UTC+7 cũng bị bắt (Tokyo)', trangThai(tokyo.out, 'Múi giờ máy chủ') === 'CẦN SỬA');

  const vn = chay(DIR, { TZ: 'Asia/Ho_Chi_Minh' });
  check('đặt đúng giờ Việt Nam → ĐẠT', trangThai(vn.out, 'Múi giờ máy chủ') === 'ĐẠT', trangThai(vn.out, 'Múi giờ máy chủ'));
}

// ---------------------------------------------------------------------------
console.log('\n[2] Vị trí dữ liệu — chặn nguy cơ đẩy hồ sơ trẻ em lên GitHub');
{
  const ngoai = chay(DIR);
  check('dữ liệu ngoài kho mã → ĐẠT', trangThai(ngoai.out, 'Vị trí dữ liệu') === 'ĐẠT', trangThai(ngoai.out, 'Vị trí dữ liệu'));

  const trong = chay(path.join(GOC, 'data'));
  check('dữ liệu nằm trong kho mã → CẦN SỬA', trangThai(trong.out, 'Vị trí dữ liệu') === 'CẦN SỬA', trangThai(trong.out, 'Vị trí dữ liệu'));
  check('cảnh báo nêu đúng rủi ro git add', /git add -A/.test(trong.out));
}

// ---------------------------------------------------------------------------
console.log('\n[3] Mật khẩu mẫu — chặn trước khi phụ huynh dùng thật');
{
  const truoc = chay(DIR);
  check('dữ liệu mẫu còn mật khẩu "123456" → CẦN SỬA', trangThai(truoc.out, 'Mật khẩu mẫu') === 'CẦN SỬA', trangThai(truoc.out, 'Mật khẩu mẫu'));
  // Số này đi theo data/seed.js nên lấy từ hằng số dùng chung, không ghi cứng:
  // mỗi lần dữ liệu mẫu thêm người là mỗi lần con số ghi cứng ở đây báo đỏ ở
  // một chỗ chẳng liên quan gì tới thứ bài này đang kiểm.
  check(`đếm đúng ${MAU.soTaiKhoan} tài khoản còn dùng mật khẩu mẫu`,
    new RegExp(`${MAU.soTaiKhoan} tài khoản còn dùng`).test(truoc.out),
    truoc.out.match(/\d+ tài khoản còn dùng/)?.[0]);
  check('nêu đích danh tài khoản để biết đường mà sửa', /giaovien/.test(truoc.out) && /phuhuynh/.test(truoc.out));

  // Đổi hết mật khẩu rồi kiểm lại — phải thôi báo.
  const Database = require2('better-sqlite3');
  const password = require2(path.join(GOC, 'lib', 'password.js'));
  const db = new Database(path.join(DIR, 'school.db'));
  db.prepare('UPDATE users SET passwordHash = ?').run(password.hash('MatKhauRieng2026!'));
  db.close();

  const sau = chay(DIR);
  check('đổi hết mật khẩu → ĐẠT', trangThai(sau.out, 'Mật khẩu mẫu') === 'ĐẠT', trangThai(sau.out, 'Mật khẩu mẫu'));
}

// ---------------------------------------------------------------------------
console.log('\n[4] Sao lưu — có chạy không, và có MỞ RA ĐƯỢC không');
{
  const chuaCo = chay(DIR);
  check('chưa từng sao lưu → CẦN SỬA', trangThai(chuaCo.out, 'Bản sao lưu gần nhất') === 'CẦN SỬA');
  check('chưa có bản nào thì bỏ qua phép thử mở', trangThai(chuaCo.out, 'Bản sao lưu mở ra được') === 'BỎ QUA');

  spawnSync(process.execPath, [path.join(GOC, 'scripts', 'backup.js')],
    { cwd: GOC, env: { ...process.env, DATA_DIR: DIR }, stdio: 'ignore' });

  const moi = chay(DIR);
  check('sao lưu xong → ĐẠT', trangThai(moi.out, 'Bản sao lưu gần nhất') === 'ĐẠT', trangThai(moi.out, 'Bản sao lưu gần nhất'));
  check('bản sao lưu thật mở ra được → ĐẠT', trangThai(moi.out, 'Bản sao lưu mở ra được') === 'ĐẠT', trangThai(moi.out, 'Bản sao lưu mở ra được'));

  // Bản sao lưu quá cũ nghĩa là lịch hằng đêm đã chết mà không ai hay.
  const tep = fs.readdirSync(path.join(DIR, 'backups')).find(f => f.endsWith('.db.gz'));
  const duongDan = path.join(DIR, 'backups', tep);
  const cuKy = new Date(Date.now() - 72 * 3600 * 1000);
  fs.utimesSync(duongDan, cuKy, cuKy);
  const cu = chay(DIR);
  check('bản sao lưu quá 48 tiếng → CẦN SỬA', trangThai(cu.out, 'Bản sao lưu gần nhất') === 'CẦN SỬA', trangThai(cu.out, 'Bản sao lưu gần nhất'));
  check('nói rõ nghi ngờ lịch hằng đêm đã ngừng', /lịch sao lưu hằng đêm nhiều khả năng đã ngừng chạy/.test(cu.out));

  // CHÉP SANG MÁY MỚI MÀ KHÔNG GIỮ GIỜ (Đ236): tên tệp nói bản này chụp 72 giờ
  // trước, nhưng giờ sửa tệp là "vừa chép xong". Đọc riêng giờ sửa tệp là báo
  // ĐẠT — che mất đúng chuyện cần thấy: lịch sao lưu ở máy mới chưa chạy lần nào.
  {
    const ngayVN = require2(path.join(GOC, 'lib', 'ngay.js'));
    const moc72 = Date.now() - 72 * 3600 * 1000;
    const tenCu = `school-${ngayVN.ngayCua(moc72).replace(/-/g, '')}-${ngayVN.gioCua(moc72).replace(':', '')}.db.gz`;
    const duongCu = path.join(DIR, 'backups', tenCu);
    fs.renameSync(duongDan, duongCu);
    const vuaChep = new Date();
    fs.utimesSync(duongCu, vuaChep, vuaChep);
    const chep = chay(DIR);
    check('bản sao CHÉP SANG máy mới (tên cũ 72 giờ, giờ sửa tệp mới tinh) → CẦN SỬA, không báo "vừa chụp"',
      trangThai(chep.out, 'Bản sao lưu gần nhất') === 'CẦN SỬA', trangThai(chep.out, 'Bản sao lưu gần nhất'));
    fs.renameSync(duongCu, duongDan);           // trả về như cũ cho các bước dưới
    fs.utimesSync(duongDan, cuKy, cuKy);
  }

  // Bản sao lưu hỏng còn nguy hiểm hơn không có: người ta tưởng mình đang an toàn.
  fs.writeFileSync(duongDan, 'day khong phai tep gzip');
  const hong = chay(DIR);
  check('bản sao lưu hỏng bị phát hiện → CẦN SỬA', trangThai(hong.out, 'Bản sao lưu mở ra được') === 'CẦN SỬA', trangThai(hong.out, 'Bản sao lưu mở ra được'));
  check('nói thẳng: coi như đang không có bản sao lưu nào', /coi như đang không có bản sao lưu nào/.test(hong.out));
}

// ---------------------------------------------------------------------------
console.log('\n[5] Lịch sao lưu tự động và dung lượng đĩa');
{
  const r = chay(DIR);
  check('máy không có lịch sao lưu → CẦN SỬA', trangThai(r.out, 'Lịch sao lưu tự động') === 'CẦN SỬA', trangThai(r.out, 'Lịch sao lưu tự động'));
  // CHỖ TRA CỨU PHẢI LÀ TÀI LIỆU CỦA APP NÀY.
  //
  // Bản trước chốt `docs/QUY-TRINH-TRIEN-KHAI.docx` — tài liệu của APP 1, và
  // là một tệp .docx không có trong kho mã app 2. Người vận hành đọc dòng gợi
  // ý đó rồi đi tìm một tệp không tồn tại, ngay lúc bộ soát vừa nói "không tìm
  // thấy lịch sao lưu nào". Bài canh thì vẫn xanh, vì nó chốt đúng cái chuỗi
  // sai ấy.
  check('chỉ đúng chỗ tra cứu cách đặt lịch — runbook của app 2',
    /docs\/TRIEN-KHAI\.md/.test(r.out), r.out.match(/Xem mục[^\n]*/));
  check('và chỗ đó có thật trong kho mã',
    fs.existsSync(path.join(GOC, 'docs', 'TRIEN-KHAI.md')));
  check('đọc được dung lượng đĩa', trangThai(r.out, 'Dung lượng đĩa') === 'ĐẠT', trangThai(r.out, 'Dung lượng đĩa'));
}

// ---------------------------------------------------------------------------
console.log('\n[6] Chứng chỉ HTTPS');
{
  const khong = chay(DIR);
  check('không truyền tên miền → BỎ QUA, không tự bịa', trangThai(khong.out, 'Chứng chỉ HTTPS') === 'BỎ QUA');

  // Tên miền không tồn tại: phải báo không kết nối được, KHÔNG được báo "đạt".
  const bay = chay(DIR, { args: ['--ten-mien=khong-ton-tai.casa-school-kiem-thu.invalid'] });
  check('tên miền không kết nối được → CẦN SỬA', trangThai(bay.out, 'Chứng chỉ HTTPS') === 'CẦN SỬA', trangThai(bay.out, 'Chứng chỉ HTTPS'));
}

// ---------------------------------------------------------------------------
console.log('\n[7] Bản thân bộ kiểm không được gây tác dụng phụ');
{
  // Một bộ KIỂM TRA không được phép tạo ra thứ nó đang đi kiểm. Nếu nó tự tạo
  // cơ sở dữ liệu thì lần chạy đầu ở máy chủ sai DATA_DIR sẽ luôn báo "đạt".
  const rong = thuMucTam('may-chu-rong');
  fs.mkdirSync(rong, { recursive: true });
  const r = chay(rong);
  check('thư mục rỗng: KHÔNG tự tạo school.db', !fs.existsSync(path.join(rong, 'school.db')));
  check('thư mục rỗng: báo thiếu cơ sở dữ liệu', trangThai(r.out, 'Cơ sở dữ liệu') === 'CẦN SỬA', trangThai(r.out, 'Cơ sở dữ liệu'));
  check('thiếu CSDL thì bỏ qua phép kiểm mật khẩu, không nổ', trangThai(r.out, 'Mật khẩu mẫu') === 'BỎ QUA');
  check('vẫn in trọn bản báo cáo dù có mục hỏng', /mục đạt, .* mục cần sửa/.test(r.out));
  donThuMucTam(rong);
}

// ---------------------------------------------------------------------------
console.log('\n[8] Mã thoát và bảng tổng kết');
{
  const r = chay(DIR);
  check('có mục cần sửa → thoát mã 1 (để lịch tự động biết mà báo)', r.ma === 1, r.ma);

  const soDat = (r.out.match(/✓ ĐẠT/g) || []).length;
  const soHong = (r.out.match(/✗ CẦN SỬA/g) || []).length;
  const tong = r.out.match(/(\d+) mục đạt, (\d+) mục cần sửa/);
  check('dòng tổng kết đếm đúng số mục đạt', tong && Number(tong[1]) === soDat, tong?.[0]);
  check('dòng tổng kết đếm đúng số mục cần sửa', tong && Number(tong[2]) === soHong, tong?.[0]);
  check('nói rõ app vẫn đang chạy bình thường, không dọa người dùng', /vẫn đang phục vụ bình thường/.test(r.out));
}

// ---------------------------------------------------------------------------
console.log('\n[9] Mục nào CHẶN máy chủ bật lại thì phải nói thẳng ra');
{
  // Câu trấn an "các mục trên không làm app ngừng chạy" đúng cho tới khi có
  // chốt chặn N5. Từ đó, hai mục — dữ liệu nằm trong kho mã, và cơ sở dữ liệu
  // trống — khiến máy chủ DỪNG ngay khi bật lại ở chế độ thật.
  //
  // Cái bẫy nằm ở chỗ máy đang chạy thì vẫn chạy: nó qua cửa đó từ lần khởi
  // động trước. Nên câu trấn an cũ nghe vẫn đúng, cho tới lần bật lại tới —
  // thường rơi vào lúc cập nhật app hoặc lúc máy vừa mất điện bật lại.
  const rong = thuMucTam('may-chu-chan');
  fs.mkdirSync(rong, { recursive: true });
  const r = chay(rong);
  check('có mục chặn khởi động → in khối cảnh báo riêng',
    /MÁY CHỦ SẼ KHÔNG BẬT LẠI ĐƯỢC/.test(r.out), r.out.slice(-600));
  check('nêu đích danh mục đang chặn', /• Cơ sở dữ liệu/.test(r.out), r.out.slice(-600));
  check('giải thích vì sao máy đang chạy vẫn chạy — chỗ dễ hiểu nhầm nhất',
    /đã qua được cửa này/.test(r.out), r.out.slice(-600));
  check('nói rõ lần bật lại tới mới là lúc vỡ',
    /lúc cập nhật app|mất điện bật lại/.test(r.out), r.out.slice(-600));
  check('KHÔNG còn câu "không làm app ngừng chạy" khi thực tế là có',
    !/không làm app ngừng chạy/.test(r.out), r.out.slice(-600));
  donThuMucTam(rong);

  // Chiều ngược lại: chỉ có mục thường thì vẫn giữ giọng trấn an như cũ, không
  // dọa người vận hành bằng khối ⛔ cho một chuyện chưa tới mức đó.
  const r2 = chay(DIR);
  check('không có mục chặn → không in khối ⛔',
    !/MÁY CHỦ SẼ KHÔNG BẬT LẠI ĐƯỢC/.test(r2.out), r2.out.slice(-400));
  check('không có mục chặn → vẫn nói app đang chạy bình thường',
    /vẫn đang phục vụ bình thường/.test(r2.out), r2.out.slice(-400));
}

// ---------------------------------------------------------------------------
console.log('\n[10] Không ghi cứng số bài kiểm thử vào chú thích');
{
  // Bản trước mở đầu bằng "TRONG KHI ĐÃ CÓ 760 BÀI KIỂM THỬ". Con số đó sai
  // ngay từ lần thêm bài kiểm thử kế tiếp, và một câu chú thích sai làm người
  // đọc hết tin cả phần còn lại. Con số thật ghi ở docs/TIEN-DO.md, một chỗ.
  const chu = fs.readFileSync(SCRIPT, 'utf8');
  const soCung = chu.match(/\d{3,4}\s*(BÀI KIỂM THỬ|bài kiểm thử|bài)/g) || [];
  check('không có con số bài kiểm thử ghi cứng trong script', soCung.length === 0, soCung);
  check('có chỉ chỗ tra con số thật', /TIEN-DO\.md/.test(chu));
}

// ---------------------------------------------------------------------------
console.log('\n[11] "N tài khoản mật khẩu 123456" — bốn chỗ cảnh báo phải nói ĐÚNG N');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Bốn chỗ trong kho mã cảnh báo về mật khẩu mẫu, và cả bốn đều gắn kèm một
  // con số. Trước đợt này chúng nói 8, 9, 9 và 9 — trong khi dữ liệu mẫu sinh
  // ra 13 tài khoản. Con số đó lệch lại từ thời app 1 và không ai canh.
  //
  // Nó không phải chuyện thẩm mỹ. Người vận hành đọc "9 tài khoản", đổi mật
  // khẩu cho 9 tài khoản mình nhớ mặt, rồi tin là đã xong — trong khi bốn tài
  // khoản nữa vẫn dùng "123456" trên một máy chủ mở ra Internet, kèm hồ sơ và
  // ảnh khuôn mặt trẻ dưới 6 tuổi.
  //
  // Chua hơn nữa: `scripts/kiem-tra-may-chu.js` mở đầu bằng đúng bài học "một
  // con số ghi cứng thì sai ngay từ lần sau" — rồi ghi cứng con số này ba dòng
  // dưới. Nên lần này con số được canh bằng máy, không bằng lời hứa.
  const NOI = [
    'server.js',
    'render.yaml',
    'scripts/kiem-tra-may-chu.js',
    'docs/PHEP-THU-DIEN-THOAI.md',
    'docs/TRIEN-KHAI.md',
  ];

  // CÂU BỊ NGẮT DÒNG VẪN PHẢI BỊ SOI.
  //
  // Bản đầu dò thẳng trên nội dung thô, nên câu "…kèm 9 tài\n# khoản dùng
  // chung…" trong `render.yaml` KHÔNG khớp mẫu: giữa "tài" và "khoản" có một
  // dấu `#` mở đầu dòng chú thích. Con số 9 nằm đó suốt từ lúc dữ liệu mẫu lên
  // 13 tài khoản, và bài canh này vẫn xanh — vì cùng tệp còn một câu KHÁC nói
  // đúng 13, và chỉ cần một câu khớp là vòng lặp coi như đã soi tới tệp.
  //
  // Gộp dòng lại trước khi dò: bỏ tiền tố chú thích (`#`, `//`, `*`) ở đầu
  // dòng rồi thay mọi khoảng trắng liên tiếp bằng một dấu cách.
  const gopDong = (s) => s
    .split('\n').map(d => d.replace(/^\s*(#|\/\/|\*)\s?/, '')).join(' ')
    .replace(/\s+/g, ' ');

  const lech = [];
  let daTim = 0;
  for (const f of NOI) {
    const noiDung = gopDong(fs.readFileSync(path.join(GOC, f), 'utf8'));
    const gap = noiDung.match(/(\d+)\s+tài khoản/g) || [];
    if (!gap.length) { lech.push(`${f}: không còn câu cảnh báo nào`); continue; }
    daTim += gap.length;
    for (const g of gap) {
      const n = Number(g.match(/\d+/)[0]);
      if (n !== MAU.soTaiKhoan) lech.push(`${f}: "${g}" — đúng phải là ${MAU.soTaiKhoan}`);
    }
  }
  check(`cả ${NOI.length} chỗ đều nói đúng ${MAU.soTaiKhoan} tài khoản`, lech.length === 0, lech);
  // Vế khẳng định: nếu ngày mai ai đó bỏ hẳn mấy câu cảnh báo đó đi thì vòng
  // lặp trên chạy qua và không tìm thấy gì — mục này phải đỏ, không phải xanh.
  check(`và ${NOI.length} câu cảnh báo đó vẫn còn trong kho mã`, daTim >= NOI.length, daTim);

  // Con số dùng chung phải khớp với dữ liệu mẫu THẬT, không phải một hằng số
  // hai bên cùng chép sai. Đếm thẳng trên cơ sở dữ liệu vừa sinh ra.
  const Database2 = require2('better-sqlite3');
  const conn = new Database2(path.join(DIR, 'school.db'), { readonly: true });
  const thuc = conn.prepare("SELECT COUNT(*) n FROM users WHERE role IN ('teacher','parent')").get().n;
  conn.close();
  check(`và ${MAU.soTaiKhoan} đúng là số tài khoản dữ liệu mẫu sinh ra`,
    thuc === MAU.soTaiKhoan, [thuc, MAU.soTaiKhoan]);
}

// ---------------------------------------------------------------------------
console.log('\n[12] TÀI LIỆU KHÔNG ĐƯỢC CHỈ NGƯỜI VẬN HÀNH VÀO MỘT THƯ MỤC DỮ LIỆU KHÁC');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Một đường dẫn sai trong tài liệu KHÔNG làm người vận hành gặp lỗi. Nó làm
  // script mở một cơ sở dữ liệu TRỐNG rồi báo "mọi thứ đều sạch" — và người ta
  // đóng máy về nhà, tin rằng trường đang được sao lưu.
  //
  // Trấn an sai còn tệ hơn báo lỗi. Đây đúng là món nợ N14: `scripts/` đã đổi
  // sang `/var/lib/casa-mamnon` còn `docs/` vẫn ghi `/var/lib/schoolconnect`
  // của app 1.
  //
  // Thư mục chuẩn ĐO TỪ `scripts/`, không ghi cứng ở đây — ghi cứng thì bài này
  // chỉ nói "tài liệu khớp với một con số tôi tự đặt".
  const scripts = fs.readdirSync(path.join(GOC, 'scripts'))
    .filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(GOC, 'scripts', f), 'utf8')).join('\n');
  const dem = new Map();
  for (const m of scripts.matchAll(/DATA_DIR=(\/[\w./-]+)/g)) {
    dem.set(m[1], (dem.get(m[1]) || 0) + 1);
  }
  const CHUAN = [...dem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  check('đọc được thư mục dữ liệu chuẩn từ scripts/', !!CHUAN, [...dem.entries()]);
  check('và nó là thư mục của app 2, không phải của app 1',
    CHUAN === '/var/lib/casa-mamnon', CHUAN);

  // MIỄN TRỪ BẰNG DANH SÁCH GHI TAY, KHÔNG BẰNG CỜ TRONG TỆP.
  //
  // Bản đầu miễn trừ mọi tệp có dán cờ "viết cho app 1". Phép thử ngược cho
  // thấy nó vô dụng đúng ở chỗ cần nhất: `docs/SAO-LUU.md` vừa được sửa đường
  // dẫn sang app 2 nhưng VẪN mang cờ đó (phần còn lại của tệp thật sự chưa cập
  // nhật), nên trả đường dẫn về `/var/lib/schoolconnect` mà bài canh vẫn xanh.
  //
  // Danh sách ghi tay thì thêm một tệp vào là một QUYẾT ĐỊNH, và người thêm
  // phải viết ra lý do. Đó chính là điều muốn.
  const MIEN_TRU = {
    // Nhật ký dựng máy chủ thử của app 1 trên Oracle Cloud. Toàn bộ tệp là
    // lịch sử của app 1; cờ ở đầu tệp đã chỉ sang docs/TRIEN-KHAI.md cho app 2.
    'MAY-CHU-THU-ORACLE.md': true,
  };

  const xau = [];
  for (const f of fs.readdirSync(path.join(GOC, 'docs')).filter(x => x.endsWith('.md'))) {
    const noiDung = fs.readFileSync(path.join(GOC, 'docs', f), 'utf8');
    const coCo = MIEN_TRU[f] === true;
    for (const m of noiDung.matchAll(/DATA_DIR=(\/[\w./-]+)/g)) {
      const d = m[1];
      if (d === CHUAN) continue;
      if (d.startsWith('/tmp/')) continue;                 // ví dụ chạy thử
      if (d === '/data') continue;                          // ổ đĩa của Render
      if (coCo) continue;                                   // tệp trong danh sách miễn trừ
      xau.push(`${f}: DATA_DIR=${d}`);
    }
  }
  check('không tài liệu nào chỉ vào một thư mục dữ liệu khác',
    xau.length === 0, xau);

  // Danh sách miễn trừ phải trỏ vào tệp CÓ THẬT, và tệp đó phải thật sự chứa
  // đường dẫn cũ — không thì nó chỉ là một dòng chết làm bài canh trông chặt
  // hơn thực tế.
  for (const f of Object.keys(MIEN_TRU)) {
    const duong = path.join(GOC, 'docs', f);
    check(`tệp miễn trừ ${f} có thật`, fs.existsSync(duong));
    check(`và nó thật sự còn đường dẫn cũ để mà cần miễn trừ`,
      fs.existsSync(duong) && /DATA_DIR=\/var\/lib\/(?!casa-mamnon)/.test(fs.readFileSync(duong, 'utf8')));
  }

  // VẾ KHẲNG ĐỊNH. Thiếu nó thì phép kiểm trên xanh cả khi tài liệu triển khai
  // không hề nhắc tới thư mục dữ liệu — tức xanh vì không có gì để tìm.
  const trienKhai = fs.readFileSync(path.join(GOC, 'docs', 'TRIEN-KHAI.md'), 'utf8');
  check('tài liệu triển khai CÓ nêu thư mục dữ liệu chuẩn',
    trienKhai.includes(CHUAN), CHUAN);

  // Và hai kịch bản phải cùng có mặt: viết sẵn cả hai là chủ ý, không phải sót.
  check('tài liệu triển khai có kịch bản VPS', /\[A\]\s*VPS/.test(trienKhai));
  check('và kịch bản Render', /\[B\]\s*Render/.test(trienKhai));
  check('kèm lời dặn xoá nửa không dùng sau khi chốt',
    /XOÁ HẲN nửa không dùng/.test(trienKhai));
  check('và nói rõ bước nào CHƯA ai chạy thử', /chưa ai chạy thử|Chưa ai đi hết đường này/i.test(trienKhai));
}

// ---------------------------------------------------------------------------
console.log('\n[8] Kho ảnh — cảnh báo SỚM, trước khi đĩa kịp đầy');
{
  // PHÉP TÍNH THỬ BẰNG SỐ, KHÔNG BẰNG Ổ ĐĨA THẬT.
  //
  // Xếp loại phụ thuộc dung lượng đĩa; máy người này 250 GB, máy chạy CI có
  // thể 40 GB. Dựng thư mục ảnh thật rồi đọc chữ in ra là để bài canh cho hai
  // kết quả khác nhau trên hai máy — đúng kiểu đỏ ngẫu nhiên đã phải đi vá bốn
  // lần ở Đ92 và Đ116. Nên phần tính nằm ở `lib/kho-anh.js` và thử thẳng ở đây.
  const kho = require2(path.join(GOC, 'lib', 'kho-anh.js'));
  const GB = 1024 ** 3;

  check('chưa có tấm ảnh nào → BỎ QUA, không bịa ra con số',
    kho.xepLoaiKhoAnh({ soTep: 0, byte: 0, soNgay: 0, trongByte: 100 * GB, tongByte: 200 * GB }).trangThai === 'BỎ QUA');

  // Máy vừa dựng: vài tấm ảnh, chưa đủ để đoán ngày đầy đĩa.
  const moi = kho.xepLoaiKhoAnh({ soTep: 12, byte: 3 * 1024 ** 2, soNgay: 2, trongByte: 100 * GB, tongByte: 200 * GB });
  check('mới có vài tấm → ĐẠT và NÓI RÕ là chưa đoán được',
    moi.trangThai === 'ĐẠT' && /chưa đủ dữ liệu để đoán/.test(moi.moTa), moi);

  // Đủ ảnh nhưng mới hai tuần đầu: vẫn chưa đoán, vì mẫu quá ngắn.
  const ngan = kho.xepLoaiKhoAnh({ soTep: 5000, byte: 2 * GB, soNgay: 3, trongByte: 100 * GB, tongByte: 200 * GB });
  check('nhiều ảnh nhưng mới vài ngày → vẫn không đoán',
    /chưa đủ dữ liệu để đoán/.test(ngan.moTa), ngan);

  // Trường chạy đều: 30 GB ảnh trong 300 ngày = 100 MB/ngày, còn trống 100 GB.
  const binhThuong = kho.xepLoaiKhoAnh({ soTep: 60000, byte: 30 * GB, soNgay: 300, trongByte: 100 * GB, tongByte: 200 * GB });
  check('trường chạy đều, đĩa còn rộng → ĐẠT', binhThuong.trangThai === 'ĐẠT', binhThuong);
  check('và nói rõ tốc độ tăng mỗi ngày', /tăng ~\d+ MB\/ngày/.test(binhThuong.moTa), binhThuong.moTa);
  check('cùng một mốc thời gian đọc được', /hơn một năm nữa mới đầy|đầy sau khoảng \d+ tháng/.test(binhThuong.moTa), binhThuong.moTa);

  // SẮP ĐẦY: 40 GB trong 200 ngày = 200 MB/ngày, chỉ còn trống 20 GB → ~100 ngày.
  const sapDay = kho.xepLoaiKhoAnh({ soTep: 80000, byte: 40 * GB, soNgay: 200, trongByte: 20 * GB, tongByte: 200 * GB });
  check('sắp đầy trong vòng 6 tháng → CẦN SỬA', sapDay.trangThai === 'CẦN SỬA', sapDay);
  check('cách sửa là nâng đĩa với nhà cung cấp', /Nâng dung lượng đĩa/.test(sapDay.cach), sapDay.cach);
  check('và nói đúng hậu quả: đầy đĩa là HỎNG CƠ SỞ DỮ LIỆU, không chỉ mất ảnh',
    /ghi hỏng cơ sở dữ liệu/.test(sapDay.cach), sapDay.cach);

  // TỚI MỐC KHO NGOÀI: ảnh chiếm 65% đĩa nhưng còn lâu mới đầy (tăng chậm).
  const khoNgoai = kho.xepLoaiKhoAnh({ soTep: 200000, byte: 130 * GB, soNgay: 1200, trongByte: 60 * GB, tongByte: 200 * GB });
  check('ảnh chiếm quá 60% đĩa → CẦN SỬA dù chưa sắp đầy', khoNgoai.trangThai === 'CẦN SỬA', khoNgoai);
  check('chỉ sang mục N25 của TIEN-DO, không bắt đoán mò',
    /N25/.test(khoNgoai.cach) && /docs\/TIEN-DO\.md/.test(khoNgoai.cach), khoNgoai.cach);
  check('và nói rõ việc này phải sửa mã, mất vài ngày',
    /sửa mã|vài ngày/.test(khoNgoai.cach), khoNgoai.cach);
  check('mục N25 có thật trong TIEN-DO',
    fs.readFileSync(path.join(GOC, 'docs', 'TIEN-DO.md'), 'utf8').includes("N25"));

  // THỨ TỰ ƯU TIÊN: vừa sắp đầy vừa quá 60% thì phải báo chuyện NÂNG ĐĨA trước,
  // vì kho ngoài mất vài ngày mà đĩa thì đầy trước đó.
  const caHai = kho.xepLoaiKhoAnh({ soTep: 200000, byte: 130 * GB, soNgay: 200, trongByte: 20 * GB, tongByte: 200 * GB });
  check('vừa sắp đầy vừa quá 60% → ưu tiên báo nâng đĩa', /Nâng dung lượng đĩa/.test(caHai.cach), caHai.cach);

  // Đo thư mục thật: tệp thưa nên không tốn chỗ trên đĩa của máy chạy bài này.
  const thuMucAnh = path.join(DIR, 'uploads-thu');
  fs.mkdirSync(thuMucAnh, { recursive: true });
  fs.mkdirSync(path.join(thuMucAnh, 'con'), { recursive: true });
  for (let i = 0; i < 6; i++) {
    const f = path.join(thuMucAnh, i < 4 ? `a${i}.jpg` : path.join('con', `b${i}.jpg`));
    const fd = fs.openSync(f, 'w');
    fs.ftruncateSync(fd, 4 * 1024 * 1024);
    fs.closeSync(fd);
    const t = (Date.now() - (30 - i * 5) * 86400000) / 1000;
    fs.utimesSync(f, t, t);
  }
  const doThat = kho.doKhoAnh(thuMucAnh);
  check('đếm đủ tệp, kể cả trong thư mục con', doThat.soTep === 6, doThat.soTep);
  check('cộng đúng dung lượng', doThat.byte === 6 * 4 * 1024 * 1024, doThat.byte);
  check('đọc được khoảng thời gian từ mốc của chính các tệp — không cần lưu lịch sử',
    doThat.soNgay > 24 && doThat.soNgay < 26, doThat.soNgay);
  check('thư mục không tồn tại thì trả 0, không nổ',
    kho.doKhoAnh(path.join(DIR, 'khong-co-thu-muc-nay')).soTep === 0);

  // Và bộ soát thật có in mục này ra.
  const r = chay(DIR);
  check('bộ soát máy chủ có mục "Kho ảnh của trường"', /Kho ảnh của trường/.test(r.out), r.out.slice(0, 200));
}

donThuMucTam(DIR);
tongKet();
