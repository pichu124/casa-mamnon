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
  GOC, thuMucTam, donThuMucTam, taoBoDem, taoReq, taoLogin, dungMayChu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require2 = createRequire(import.meta.url);
const modules = require2(path.join(GOC, 'lib', 'modules.js'));
modules.napMoRong();

// Năm phân hệ nhà trường đã quyết TẮT. Danh sách này CỐ Ý viết tay ở đây thay
// vì suy từ `defaultEnabled`: suy ra thì bài canh chỉ nói "script làm đúng như
// mã đang viết", còn viết tay thì nó nói "script làm đúng như NHÀ TRƯỜNG đã
// quyết". Đổi quyết định thì phải sửa cả hai chỗ — đó là điều muốn.
// 5 → 6 ở Đ239i (thêm Đón trả bé, phân hệ cắm thêm tắt sẵn). 6 → 4 ở Đ252, hai
// phân hệ rời danh sách vì MÃ của chúng đã gỡ hẳn (chủ dự án duyệt 12/11) —
// không còn gì mang hai mã ấy để mà tắt:
//   • `nhanxet` (Nhận xét hằng ngày): sang một phép kiểm riêng ở mục [5] — cô
//     KHÔNG thấy nó, và không bao giờ nữa;
//   • `dontra` (Đón trả bé): luật "ban-thu KHÔNG bật phân hệ cắm thêm tắt sẵn,
//     và tắt lại dòng bật cũ" thì còn nguyên — mục [8] canh nó bằng một phân
//     hệ dựng tạm.
const PHAI_TAT = ['baocao', 'xebuyt', 'nenep', 'hocsinhcu'];

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
  // 9 → 10 ở Đ152 (thêm phân hệ Nhân sự & chấm công).
  // 10 → 11 ở Đ239c (thêm phân hệ Xuất báo cáo, góp ý 16/10 mục 2).
  // 11 → 10 ở Đ252 (gỡ mã phân hệ Đón trả bé, chủ dự án duyệt 12/11).
  const SO_CAM_THEM = 10;
  const camThem = modules.moRong().map(m => m.key);
  check(`kho mã có đúng ${SO_CAM_THEM} phân hệ cắm thêm`, camThem.length === SO_CAM_THEM, camThem);

  // HỎI TRẠNG THÁI CÓ HIỆU LỰC, KHÔNG HỎI MỖI BẢNG CÀI ĐẶT — cùng bài học đã
  // ghi ở phép kiểm "năm phân hệ phải TẮT" bên dưới, nay áp cho cả chiều BẬT.
  //
  // Từ Đ146 chín phân hệ mầm non `defaultEnabled: true`, nên `ban-thu` không
  // còn ghi dòng nào vào `module_settings` (nó chỉ ghi khi phân hệ đang tắt).
  // Đọc thẳng bảng thì thấy rỗng và kết luận "chưa bật" — sai, chúng đang bật.
  // Điều bàn thử phải bảo đảm là TRẠNG THÁI CÓ HIỆU LỰC, đúng luật máy chủ
  // dùng lúc chạy thật: có dòng thì theo dòng, không thì theo mặc định.
  const batHieuLuc = (k) => {
    if (dong.has(k)) return dong.get(k);
    const m = modules.timTheoKey(k);
    return m ? m.defaultEnabled !== false : false;
  };
  // Trừ những phân hệ cắm thêm nhà trường đã quyết TẮT — chúng được hỏi ở mục
  // [3], theo chiều ngược lại. Từ Đ252 không còn cái nào như thế.
  const chuaBat = camThem.filter(k => !PHAI_TAT.includes(k) && batHieuLuc(k) !== true);
  check('TẤT CẢ phân hệ cắm thêm (trừ cái trường đã tắt) đều bật có hiệu lực trên bàn thử',
    chuaBat.length === 0, chuaBat);
  check(`và đó là đủ ${SO_CAM_THEM} cái — không cái nào đứng ngoài, và không còn Đón trả bé`,
    camThem.filter(k => !PHAI_TAT.includes(k)).length === SO_CAM_THEM && !camThem.includes('dontra'),
    camThem);
  // ĐỐI CHỨNG: phép hỏi trên phải biết nói KHÔNG, nếu không thì dòng trên xanh
  // vì nó luôn trả true chứ không phải vì các phân hệ kia đang bật thật.
  check('đối chứng — phép hỏi này biết nói KHÔNG với một phân hệ đã tắt',
    batHieuLuc('nenep') === false, batHieuLuc('nenep'));
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

  // HỎI TRẠNG THÁI CÓ HIỆU LỰC, KHÔNG HỎI MỖI BẢNG CÀI ĐẶT.
  //
  // `dong.get(k) === true` chỉ đúng khi bảng `module_settings` CÓ dòng cho
  // phân hệ ấy. Bốn trong năm phân hệ này tắt bằng `defaultEnabled: false`
  // trong `lib/modules.js`, tức KHÔNG có dòng nào trong bảng — nên
  // `dong.get(k)` là `undefined`, và phép so `=== true` cho ra false dù thật
  // sự chúng đang bật hay tắt.
  //
  // Nói cách khác: nếu ai đó đổi `defaultEnabled` của Nề nếp thành `true` thì
  // phân hệ xếp hạng trẻ bật lên trên bàn thử cho cô xem, mà phép kiểm "quan
  // trọng nhất của cả bài" này vẫn xanh.
  //
  // Trạng thái CÓ HIỆU LỰC = dòng trong bảng nếu có, không thì mặc định của
  // phân hệ. Đúng luật mà `lib/modules.js` dùng lúc chạy thật.
  const hieuLuc = (k) => {
    if (dong.has(k)) return dong.get(k);
    const m = modules.timTheoKey(k);
    return m ? m.defaultEnabled !== false : false;
  };

  const batNham = PHAI_TAT.filter(k => hieuLuc(k) === true);
  check('không phân hệ nào trong năm cái đó bị bật', batNham.length === 0,
    batNham.map(k => `${k} (bảng: ${dong.get(k)}, mặc định: ${modules.timTheoKey(k)?.defaultEnabled})`));

  // ĐỐI CHỨNG: `hieuLuc` phải biết nói CÓ, nếu không thì dòng trên xanh vì nó
  // luôn trả false chứ không phải vì năm phân hệ kia đang tắt thật.
  check('đối chứng — phép hỏi trạng thái này biết nói CÓ với một phân hệ đang bật',
    ['nhatky', 'hanhtrinh', 'yte'].some(k => hieuLuc(k) === true),
    ['nhatky', 'hanhtrinh', 'yte'].map(k => `${k}=${hieuLuc(k)}`));

  // Và chúng phải thật sự tồn tại — một danh sách gõ sai tên thì phép kiểm
  // trên xanh vì không tìm thấy gì cả.
  const khongCo = PHAI_TAT.filter(k => !modules.timTheoKey(k));
  check('năm mã phân hệ đó đều có thật trong kho mã', khongCo.length === 0, khongCo);

  // Bảng in ra liệt kê các phân hệ TẮT theo quyết định của trường. Đón trả bé
  // không còn là một phân hệ (Đ252), nên không được có mặt ở đó nữa.
  const doanTat = (chu.split('theo quyết định của nhà trường')[1] || '').split('[3/4]')[0];
  check('bảng in ra có đoạn phân hệ TẮT theo quyết định của trường, kể tên Nề nếp',
    /Nề nếp/.test(doanTat), doanTat || chu.slice(0, 1500));
  check('và KHÔNG còn nhắc "Đón trả bé" ở đâu trong bảng in ra', !/Đón trả bé/.test(chu),
    (chu.match(/.{0,80}Đón trả bé.{0,80}/) || [])[0]);
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

  // `dontra` rời danh sách này ở Đ239i: trước đó bàn thử bật nó và bài này
  // đòi cô THẤY nó — nhà trường đã bỏ (lồng vào Điểm danh), và Đ252 gỡ hẳn mã.
  // Nó ở vế "KHÔNG thấy" ngay dưới.
  for (const k of ['nhatky', 'thuchup', 'hanhtrinh']) {
    check(`cô THẤY phân hệ ${k} trên máy chủ bàn thử`, thay.includes(k), thay);
  }
  // ĐỦ CẢ BA CÁI NHÀ TRƯỜNG TẮT MÀ MỞ CHO VAI CÔ, cộng `dontra` — phân hệ đã
  // gỡ mã ở Đ252, cô không được thấy nó dưới bất kỳ hình thức nào (`nhanxet`,
  // cũng gỡ ở Đ252, có phép kiểm riêng của nó trong mục này).
  // `hocsinhcu` thì chỉ mở cho vai phụ huynh (`roles: ['parent']`), nên hỏi
  // bằng cookie của cô là hỏi sai chỗ — nó được hỏi riêng ngay dưới.
  for (const k of ['baocao', 'nenep', 'xebuyt', 'dontra']) {
    check(`và KHÔNG thấy ${k} — thứ nhà trường đã tắt hoặc đã gỡ`, !thay.includes(k), thay);
  }
  // `nhanxet`: mã đã gỡ hẳn ở Đ252, nên hỏi theo cả mã lẫn tên màn cũ.
  check('và KHÔNG thấy nhanxet — mã của nó đã gỡ hẳn khỏi kho',
    !thay.includes('nhanxet') && !(ds.data?.modules || ds.data || []).some(m => m.view === 'remarks')
      && !modules.timTheoKey('nhanxet'), thay);
  check('danh sách PHAI_TAT không lặng lẽ dài thêm mà bài này không hỏi tới',
    PHAI_TAT.length === 4 && PHAI_TAT.includes('hocsinhcu'), PHAI_TAT);

  // `hocsinhcu` chỉ hiện với gia đình, nên phải hỏi bằng tài khoản gia đình.
  const ph = await login('phuhuynh', mk || 'x');
  if (ph.cookie) {
    const dsPh = await req('GET', '/api/modules', { cookie: ph.cookie });
    const thayPh = (dsPh.data?.modules || dsPh.data || []).map(m => m.key);
    check('màn hình của gia đình cũng nhận được danh sách phân hệ',
      Array.isArray(thayPh) && thayPh.length > 0, dsPh.data);
    check('và gia đình KHÔNG thấy hocsinhcu — thứ nhà trường đã tắt',
      !thayPh.includes('hocsinhcu'), thayPh);
  } else {
    check('gia đình đăng nhập được để hỏi phân hệ chỉ dành cho gia đình', false,
      'KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG: tài khoản phụ huynh mẫu không đăng nhập được '
      + 'bằng mật khẩu bàn thử vừa đặt, nên không hỏi được hocsinhcu.');
  }

  sv.dung();
}

// ===========================================================================
console.log('\n[8] MÁY THỬ DỰNG TRƯỚC Đ239: chạy lại ban-thu thì phân hệ tắt sẵn được TẮT lại, dữ liệu Đón trả bé còn nguyên');
{
  // HAI CHUYỆN CỦA MỘT MÁY THỬ CŨ, nay tách đôi vì Đ252 gỡ mã Đón trả bé:
  //
  //   a. Máy ấy còn dòng "dontra bật" và bảng `dontra_*` có dòng. Mã phân hệ
  //      không còn, nên `ban-thu` không biết tới nó nữa — nhưng chạy lại thì
  //      không được vấp, và không được đụng một dòng dữ liệu nào.
  //   b. Luật Đ239i: phân hệ cắm thêm `defaultEnabled: false` mà còn dòng "bật"
  //      cũ thì chạy lại `ban-thu` phải TẮT lại. Đón trả bé từng là mẫu duy
  //      nhất của luật này; không còn phân hệ cắm thêm tắt sẵn nào trong kho,
  //      nên bài dựng TẠM một phân hệ như thế trong `modules/` rồi gỡ ngay.
  const TAM = 'zzbanthutatsan';
  const thuMucTamPhanHe = path.join(GOC, 'modules', TAM);
  const goTam = () => fs.rmSync(thuMucTamPhanHe, { recursive: true, force: true });
  process.on('exit', goTam);
  process.on('SIGINT', () => { goTam(); process.exit(1); });
  process.on('SIGTERM', () => { goTam(); process.exit(1); });

  batPhanHe(DIR, ['dontra', TAM]);
  const ghi = new Database(path.join(DIR, 'school.db'));
  const beId = ghi.prepare('SELECT id FROM students ORDER BY id LIMIT 1').get()?.id;
  // Câu CREATE chép từ `modules/dontra/schema.sql` tại lúc gỡ — máy cũ có sẵn
  // bảng này, máy dựng mới thì không.
  ghi.exec(`CREATE TABLE IF NOT EXISTS dontra_nguoi (
    id TEXT PRIMARY KEY, studentId TEXT NOT NULL, hoTen TEXT NOT NULL,
    quanHe TEXT NOT NULL DEFAULT '', dienThoai TEXT NOT NULL DEFAULT '', anh TEXT NOT NULL DEFAULT '',
    ghiChu TEXT NOT NULL DEFAULT '', dangDung INTEGER NOT NULL DEFAULT 1,
    nguoiTao TEXT, taoLuc TEXT, capNhatLuc TEXT)`);
  ghi.prepare(`INSERT INTO dontra_nguoi (id, studentId, hoTen, quanHe, dangDung, taoLuc)
               VALUES ('d239i-ba-ngoai', ?, 'Bà ngoại (bàn thử)', 'Bà ngoại', 1, ?)`)
    .run(beId, new Date().toISOString());
  const bangDontra = ghi.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'dontra\\_%' ESCAPE '\\'")
    .all().map(x => x.name);
  const demBang = (conn) => Object.fromEntries(
    bangDontra.map(b => [b, conn.prepare(`SELECT COUNT(*) AS n FROM "${b}"`).get().n]));
  const truoc = demBang(ghi);
  const dongTruoc = new Map(ghi.prepare('SELECT moduleKey, enabled FROM module_settings').all()
    .map(x => [x.moduleKey, x.enabled]));
  ghi.close();
  check('dựng được tình huống: có dòng "dontra bật", dòng bật của phân hệ tạm, và một người đón trong sổ',
    dongTruoc.get('dontra') === 1 && dongTruoc.get(TAM) === 1 && truoc.dontra_nguoi === 1,
    { dontra: dongTruoc.get('dontra'), tam: dongTruoc.get(TAM), truoc });

  let lai;
  try {
    fs.mkdirSync(thuMucTamPhanHe, { recursive: true });
    fs.writeFileSync(path.join(thuMucTamPhanHe, 'module.json'), JSON.stringify({
      key: TAM, name: 'Phân hệ thử tắt sẵn', api: [`/api/${TAM}`], roles: ['admin'], defaultEnabled: false,
    }));
    lai = chay('--thu-muc', DIR, '--khong-chay');
  } finally {
    goTam();
  }
  const chuLai = lai.stdout + lai.stderr;
  check('đã gỡ phân hệ tạm khỏi modules/', !fs.existsSync(thuMucTamPhanHe));
  check('chạy lại ban-thu (không --lam-lai) xong không lỗi', lai.status === 0, chuLai.slice(-500));
  check('và giữ nguyên dữ liệu, không sinh lại', /giữ nguyên dữ liệu/.test(chuLai), chuLai.slice(0, 600));

  const doc = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const dong = new Map(doc.prepare('SELECT moduleKey, enabled FROM module_settings').all()
    .map(x => [x.moduleKey, !!x.enabled]));
  const sau = demBang(doc);
  const baNgoai = doc.prepare("SELECT hoTen, dangDung FROM dontra_nguoi WHERE id = 'd239i-ba-ngoai'").get();
  doc.close();
  const hieuLuc = (k) => {
    if (dong.has(k)) return dong.get(k);
    const m = modules.timTheoKey(k);
    return m ? m.defaultEnabled !== false : false;
  };

  check('PHÂN HỆ CẮM THÊM TẮT SẴN ĐƯỢC TẮT LẠI — dòng "bật" cũ đã được ghi thành "tắt"',
    dong.get(TAM) === false, `bảng: ${dong.get(TAM)}`);
  check('đối chứng — phân hệ mặc định bật (Nhật ký ngày) vẫn BẬT',
    hieuLuc('nhatky') === true, `nhatky=${hieuLuc('nhatky')}`);
  check('bảng in ra của lần chạy lại kể phân hệ ấy trong số TẮT theo quyết định của trường',
    /Phân hệ thử tắt sẵn/.test((chuLai.split('theo quyết định của nhà trường')[1] || '').split('[3/4]')[0]),
    chuLai.slice(0, 1500));
  check('DỮ LIỆU ĐÓN TRẢ CÒN NGUYÊN — gỡ mã là ngưng dùng, không phải xoá',
    JSON.stringify(sau) === JSON.stringify(truoc), { truoc, sau });
  check('và đúng người đón vừa ghi vẫn ở đó, vẫn đang dùng',
    baNgoai?.hoTen === 'Bà ngoại (bàn thử)' && baNgoai?.dangDung === 1, baNgoai);
  check('bảng in ra KHÔNG kể "Đón trả bé" — phân hệ không còn, dù máy cũ còn dòng "bật"',
    !/Đón trả bé/.test(chuLai), (chuLai.match(/.{0,80}Đón trả bé.{0,80}/) || [])[0]);
}

donThuMucTam(DIR);
tongKet();
