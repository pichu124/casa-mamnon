// Bài canh LỆNH DỰNG BÀN THỬ (`npm run ban-thu`).
//
// Chạy bằng:  npm run test:ban-thu
//
// VÌ SAO BÀI NÀY ĐÁNG GIÁ HƠN VẺ NGOÀI CỦA NÓ
//
// `scripts/ban-thu.js` là loại tệp HỎNG MÀ TRÔNG VẪN HỢP LÝ: nó in ra một bảng
// đẹp đẽ rồi khởi động máy chủ, và người tổ chức buổi thử không có cách nào
// biết là nó vừa dựng sai. Bản đầu của chính tệp đó hỏng HAI lần liên tiếp,
// mỗi lần theo một kiểu khác nhau, và cả hai lần đều "chạy xong không lỗi":
//
//   1. Quên gọi `modules.napMoRong()` → các phân hệ mầm non không có mặt trong
//      `tatCa()`, vòng lặp bật không tìm thấy gì, và bàn thử im lặng dựng ra
//      đúng cái app mà nó sinh ra để tránh.
//   2. Lọc bằng `!m.core` → phân hệ lõi KHÔNG có trường `core`, nên điều kiện
//      đó đúng với cả 26 và bàn thử bật luôn Nhận xét, Báo cáo, Xe buýt, Nề
//      nếp. Bốn thứ nhà trường đã quyết TẮT, trong đó hai cái là món nợ N3 mà
//      QUY TẮC 4 đang canh.
//
// Nên bài này KHÔNG đọc những gì script in ra để kết luận nó chạy đúng. Nó mở
// thẳng cơ sở dữ liệu bàn thử, rồi dựng máy chủ trên đúng thư mục đó và hỏi
// máy chủ xem cô nhìn thấy gì.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import Database from 'better-sqlite3';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, taoBoDem, taoReq, taoLogin, dungMayChu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require2 = createRequire(import.meta.url);
const modules = require2(path.join(GOC, 'lib', 'modules.js'));
modules.napMoRong();

// Năm phân hệ nhà trường đã quyết TẮT. Danh sách này CỐ Ý viết tay ở đây thay
// vì suy từ `defaultEnabled`: suy ra thì bài canh chỉ nói "script làm đúng như
// mã đang viết", còn viết tay thì nó nói "script làm đúng như NHÀ TRƯỜNG đã
// quyết". Đổi quyết định thì phải sửa cả hai chỗ — đó là điều muốn.
const PHAI_TAT = ['nhanxet', 'baocao', 'xebuyt', 'nenep', 'hocsinhcu'];

const DIR = thuMucTam('ban-thu');
const chay = (...a) => spawnSync('node', [path.join(GOC, 'scripts', 'ban-thu.js'), ...a],
  { cwd: GOC, encoding: 'utf8', env: { ...process.env, NODE_ENV: '' } });

// ===========================================================================
console.log('\n[1] Dựng bàn thử: chạy xong, và dựng ra đủ thứ cần');
const r = chay('--thu-muc', DIR, '--lam-lai', '--khong-chay');
const chu = r.stdout + r.stderr;
check('lệnh chạy xong không lỗi', r.status === 0, chu.slice(-500));
check('có sinh dữ liệu mẫu', fs.existsSync(path.join(DIR, 'school.db')), fs.readdirSync(DIR));

// ===========================================================================
console.log('\n[2] ĐỦ CÁC PHÂN HỆ MẦM NON PHẢI BẬT — đọc thẳng cơ sở dữ liệu');
{
  // Đây là phép kiểm bắt được lỗi thứ nhất. Nó KHÔNG đọc chữ script in ra.
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const dong = new Map(conn.prepare('SELECT moduleKey, enabled FROM module_settings').all()
    .map(x => [x.moduleKey, !!x.enabled]));
  conn.close();

  // SỐ PHÂN HỆ CẮM THÊM — con số này ĐI LÊN mỗi lần trường đặt thêm một phần.
  //
  // Ghi cứng "tám" ở đây là đúng lúc viết, và nó đã sai ngay lần thêm phân hệ
  // tiếp theo (Báo cáo học tập). Nhưng KHÔNG bỏ hẳn phép đếm: bàn thử tồn tại
  // để cô nhìn đúng app trường sẽ dùng, nên một phân hệ mới lặng lẽ không được
  // bật là đúng thứ bài này sinh ra để bắt. Nên giữ con số, và ghi ngay cạnh
  // rằng sửa nó là việc bình thường — khác hẳn với việc nới một bộ canh.
  const SO_CAM_THEM = 9;
  const camThem = modules.moRong().map(m => m.key);
  check(`kho mã có đúng ${SO_CAM_THEM} phân hệ cắm thêm`, camThem.length === SO_CAM_THEM, camThem);

  const chuaBat = camThem.filter(k => dong.get(k) !== true);
  check('TẤT CẢ đều được bật trong cơ sở dữ liệu bàn thử', chuaBat.length === 0, chuaBat);
}

// ===========================================================================
console.log('\n[3] NĂM PHÂN HỆ NHÀ TRƯỜNG ĐÃ TẮT PHẢI VẪN TẮT');
{
  // Đây là phép kiểm bắt được lỗi thứ hai — và là phép kiểm quan trọng nhất
  // của cả bài. Bật nhầm Nhận xét và Báo cáo trong buổi thử là đưa cho cô xem
  // đúng thứ app này tồn tại để KHÔNG làm: xếp hạng trẻ.
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const dong = new Map(conn.prepare('SELECT moduleKey, enabled FROM module_settings').all()
    .map(x => [x.moduleKey, !!x.enabled]));
  conn.close();

  const batNham = PHAI_TAT.filter(k => dong.get(k) === true);
  check('không phân hệ nào trong năm cái đó bị bật', batNham.length === 0, batNham);

  // Và chúng phải thật sự tồn tại — một danh sách gõ sai tên thì phép kiểm
  // trên xanh vì không tìm thấy gì cả.
  const khongCo = PHAI_TAT.filter(k => !modules.timTheoKey(k));
  check('năm mã phân hệ đó đều có thật trong kho mã', khongCo.length === 0, khongCo);
}

// ===========================================================================
console.log('\n[4] MẬT KHẨU MẪU PHẢI ĐƯỢC ĐỔI — buổi thử hay chạy qua đường hầm công khai');
{
  const password = require2(path.join(GOC, 'lib', 'password.js'));
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const ds = conn.prepare("SELECT username, passwordHash, role FROM users WHERE role IN ('teacher','parent')").all();
  const qt = conn.prepare("SELECT * FROM users WHERE role = 'admin'").all();
  conn.close();

  check('dữ liệu mẫu có tài khoản cô và gia đình', ds.length > 0, ds.length);
  const con123 = ds.filter(u => password.verify('123456', u.passwordHash)).map(u => u.username);
  check('KHÔNG tài khoản nào còn dùng "123456"', con123.length === 0, con123);
  check('có tài khoản quản trị cho buổi thử', qt.length >= 1, qt.map(u => u.username));
  check('và quản trị bị buộc đổi mật khẩu khi đăng nhập',
    qt.every(u => u.mustChangePassword), qt.map(u => u.mustChangePassword));
}

// ===========================================================================
console.log('\n[4b] BÀN THỬ PHẢI CÓ ĐỦ BA CẤP, KHÔNG CHỈ BAN GIÁM HIỆU');
{
  // Tầng phân quyền chia người của trường làm ba cấp. Bàn thử trước đợt này
  // chỉ dựng MỘT tài khoản Cấp 1, nên suốt các buổi thử không ai bấm thử hai
  // cấp còn lại — mà đó lại là chỗ dễ sai nhất: sai kiểu "thấy quá nhiều" thì
  // màn hình vẫn chạy trơn, không có gì báo, và người thử cũng không có cách
  // nào nhận ra.
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const cv = new Map(conn.prepare(
    `SELECT u.username AS u, c.chucVu AS c FROM user_chucvu c
       JOIN users u ON u.id = c.userId`).all().map(r => [r.u, r.c]));
  const coSo = new Map(conn.prepare(
    `SELECT u.username AS u, k.campusId AS cs FROM user_campus k
       JOIN users u ON u.id = k.userId`).all().map(r => [r.u, r.cs]));
  conn.close();

  // Viết tay như danh sách phân hệ đã tắt ở trên: bài canh phải nói "bàn thử
  // dựng đúng những vai NHÀ TRƯỜNG có", không phải "dựng đúng như mã đang viết".
  const CAN_CO = [
    ['vanphong1', 'vanphong-coso'],
    ['nhansu', 'nhansu'],
    ['ketoan', 'ketoan'],
    ['marketing', 'marketing'],
  ];
  const thieu = CAN_CO.filter(([ten, ma]) => cv.get(ten) !== ma);
  check('BÀN THỬ DỰNG ĐỦ TÀI KHOẢN CẤP 2 VÀ CẤP 3',
    thieu.length === 0, thieu.map(([t, m]) => `${t} cần ${m}, thực tế ${cv.get(t) || '(không có)'}`));
  check('và văn phòng cơ sở bị KHOÁ VÀO một cơ sở — nếu không thì nó là Cấp 1 trá hình',
    coSo.get('vanphong1') === 'cs1', coSo.get('vanphong1') || '(không khoá)');
  check('còn ba vai Cấp 2 thì KHÔNG khoá cơ sở — họ làm việc trên cả trường',
    ['nhansu', 'ketoan', 'marketing'].every(t => !coSo.get(t)),
    ['nhansu', 'ketoan', 'marketing'].map(t => `${t}:${coSo.get(t) || '-'}`));

  // Và bảng in ra phải nói cho người tổ chức biết bốn tài khoản đó tồn tại.
  // Dựng ra mà không in thì cũng như không dựng.
  for (const [ten] of CAN_CO) {
    check(`bảng tài khoản in ra có ${ten}`, new RegExp(`\\b${ten}\\b`).test(chu), false);
  }
}

// ===========================================================================
console.log('\n[5] HAI CHỐT CHẶN AN TOÀN');
{
  const that = spawnSync('node', [path.join(GOC, 'scripts', 'ban-thu.js'), '--thu-muc', DIR],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } });
  check('chạy ở chế độ THẬT thì từ chối', that.status !== 0, that.status);
  check('và nói rõ vì sao', /chế độ thật|NODE_ENV/.test(that.stdout + that.stderr),
    (that.stdout + that.stderr).slice(0, 300));

  const trong = chay('--thu-muc', path.join(GOC, 'data', 'ban-thu-sai-cho'), '--khong-chay');
  check('thư mục bàn thử nằm TRONG kho mã thì từ chối', trong.status !== 0, trong.status);
  check('và nhắc rằng bàn thử có ảnh của trẻ',
    /ảnh của trẻ|ngoài kho mã/.test(trong.stdout + trong.stderr),
    (trong.stdout + trong.stderr).slice(0, 300));
  check('và KHÔNG tạo ra thư mục đó', !fs.existsSync(path.join(GOC, 'data', 'ban-thu-sai-cho')));
}

// ===========================================================================
console.log('\n[6] LỜI NHẮC HTTPS phải có mặt — đây là chỗ buổi thử hay ghi sai kết quả');
{
  // Không có HTTPS thì không có service worker, tức Lời hứa 2 của phiếu thử
  // KHÔNG ĐO ĐƯỢC. Ghi "trượt" vào phiếu lúc đó là ghi sai, và một kết quả sai
  // còn tệ hơn một ô để trống — nó làm nhà trường tin app không giữ được dữ
  // liệu lúc mất mạng, trong khi chưa ai thử điều đó.
  check('có cảnh báo về HTTPS', /HTTPS/.test(chu), chu.slice(-1200, -600));
  check('nói rõ hậu quả: không cài được app, không mở được lúc mất mạng',
    /không cài được app|mất mạng/.test(chu));
  check('và dạy đúng cách ghi phiếu: "không đo được", KHÔNG phải "trượt"',
    /không đo được/.test(chu));
  check('kèm lệnh mở đường hầm HTTPS', /cloudflared tunnel/.test(chu));
  check('chỉ đúng chỗ phiếu thử', /PHEP-THU-DIEN-THOAI\.md/.test(chu));
  check('và chỉ cách dọn sau buổi thử', /rm -rf/.test(chu));
}

// ===========================================================================
console.log('\n[7] MÁY CHỦ DỰNG TRÊN BÀN THỬ: cô nhìn thấy đúng app trường sẽ dùng');
{
  // Vế cuối, và là vế duy nhất đi qua máy chủ thật. Mọi phép kiểm trên đọc cơ
  // sở dữ liệu; phép kiểm này hỏi ĐÚNG CÂU mà màn hình của cô hỏi.
  const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3421), dir: DIR });
  const req = taoReq(sv.BASE);
  const login = taoLogin(req);

  // Mật khẩu mẫu đã bị đổi, nên lấy mật khẩu mới từ chính chữ script in ra —
  // đúng cách người tổ chức buổi thử sẽ làm.
  const mk = (chu.match(/giaovien \/ (\S+)/) || [])[1];
  check('đọc được mật khẩu mới từ bảng script in ra', !!mk, mk);

  const d = await login('giaovien', mk || 'x');
  check('CÔ ĐĂNG NHẬP ĐƯỢC bằng mật khẩu mới', !!d.cookie, d.status);

  const ds = await req('GET', '/api/modules', { cookie: d.cookie });
  const thay = (ds.data?.modules || ds.data || []).map(m => m.key);
  check('màn hình của cô nhận được danh sách phân hệ', Array.isArray(thay) && thay.length > 0, ds.data);

  for (const k of ['nhatky', 'thuchup', 'dontra', 'hanhtrinh']) {
    check(`cô THẤY phân hệ ${k} trên máy chủ bàn thử`, thay.includes(k), thay);
  }
  for (const k of ['nhanxet', 'baocao', 'nenep']) {
    check(`và KHÔNG thấy ${k} — thứ nhà trường đã tắt`, !thay.includes(k), thay);
  }

  sv.dung();
}

donThuMucTam(DIR);
tongKet();
