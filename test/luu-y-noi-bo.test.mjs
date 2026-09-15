// Bài canh Ô LƯU Ý NỘI BỘ CỦA TRƯỜNG (Đ207 — việc 4).
//
// Chạy bằng:  npm run test:luu-y-noi-bo
//
// Nhà trường: "ô Lưu ý chỉ cơ sở xem, không gửi tới phụ huynh".
//
// CẢ BÀI NÀY LÀ MỘT PHÉP KIỂM PHỦ ĐỊNH — "gia đình KHÔNG thấy" — và phép kiểm
// phủ định là loại dễ xanh rỗng nhất: đo một đường mà ô lưu ý chưa bao giờ
// được ghi thì đường nào cũng "không lộ". Nên mục [1] GHI THẬT một câu mang
// dấu riêng vào ô ấy trước, và mọi mục sau đi tìm ĐÚNG dấu ấy.
//
// VÌ SAO KHÔNG DÙNG LẠI CỘT `attendance.note`: ô ấy mang nhãn "Ghi chú (gia
// đình đọc được)" ngay trên màn của cô và cô đã gõ vào đó những câu viết CHO
// gia đình. Đổi công dụng nó là hai cái sai cùng lúc — câu viết cho gia đình
// biến mất khỏi màn gia đình, và ô ấy từ nay nhận câu KHÔNG dành cho gia đình
// trong khi mọi bản ghi cũ trong đó thì có. Mục [5] ghim cả hai ô cùng lúc để
// ngày ai đó gộp chúng lại thì bài đỏ.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('luu-y-noi-bo');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng L', 'l_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 L', 'l_cs2');
khoaVaoCoSo(DIR, 'l_cs2', 'cs2');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4823), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

// DẤU RIÊNG — chuỗi này chỉ tồn tại trong ô lưu ý nội bộ. Mọi mục sau đi tìm
// đúng nó trong TOÀN BỘ thân trả về, không chỉ ở ô mình đoán trước.
const DAU = 'NOIBO-DAU-RIENG-KHONG-DUOC-LO-RA-NGOAI';
const DAU_GIA_DINH = 'CAU-NAY-GIA-DINH-DOC-DUOC';

// Lùi ngày của một dòng lưu ý về quá khứ — dựng cảnh "ghi cho hôm kia".
function luiNgay(studentId, tuNgay, denNgay) {
  const conn = new Database(CSDL);
  try {
    conn.prepare('UPDATE attendance_luu_y SET ngay = ? WHERE studentId = ? AND ngay = ?')
      .run(denNgay, studentId, tuNgay);
  } finally { conn.close(); }
}

function coDau(x, dau = DAU) {
  return JSON.stringify(x == null ? '' : x).includes(dau);
}

// `taoLogin` trả về CẢ phản hồi, cookie nằm ở `.cookie` — bản đầu của bài này
// truyền thẳng đối tượng vào header và nhận "Chưa đăng nhập" ở mọi lượt gọi.
// `taoQuanTri` TRẢ VỀ mật khẩu tạm nó vừa sinh — dùng đúng nó, chứ bản đầu
// của bài này gõ cứng 'admin123' và nhận 401 ở mọi lượt gọi của hai tài khoản
// quản trị, trong khi mục đối chứng thì lặng lẽ "xanh vì bị chặn".
const qt = (await login('l_qt', mkQT)).cookie;
const co = (await login('giaovien', '123456')).cookie;
const coKhac = (await login('giaovien2', '123456')).cookie;
const cs2 = (await login('l_cs2', mkCS2)).cookie;

// Tìm một phụ huynh của bé s1 để đăng nhập.
function phuHuynhCua(studentId) {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare(
      `SELECT u.username FROM student_parents sp JOIN users u ON u.id = sp.parentId
        WHERE sp.studentId = ? LIMIT 1`).get(studentId);
    return r ? r.username : null;
  } finally { conn.close(); }
}
const tenPH = phuHuynhCua('s1');
const ph = tenPH ? (await login(tenPH, '123456')).cookie : null;

console.log('\n[1] Cô ghi được ô lưu ý, và ô ấy KHÁC ô ghi chú gia đình đọc được');
{
  // Ô "gia đình đọc được" đi qua đường điểm danh cũ — không đổi một chữ.
  let r = await req('POST', '/api/attendance/mark',
    { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present', note: DAU_GIA_DINH } });
  check('ô ghi chú cũ vẫn ghi được y như trước', r.status === 200 && r.data.note === DAU_GIA_DINH,
    r.data?.error || r.data?.note);

  r = await req('PUT', '/api/attendance/luu-y',
    { cookie: co, body: { studentId: 's1', ngay: NGAY, luuY: DAU } });
  check('cô ghi được ô lưu ý nội bộ', r.status === 200 && r.data.luuY && r.data.luuY.luuY === DAU,
    r.data?.error || JSON.stringify(r.data?.luuY));
  check('ô lưu ý trả kèm TÊN người ghi — cái giá của việc cho ghi ngoài ngày',
    !!(r.data.luuY && r.data.luuY.nguoiGhi), r.data?.luuY?.nguoiGhi);

  // ĐỐI CHỨNG: hai ô là HAI ô, không phải một ô bị đổi tên.
  const so = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: co });
  const dong = (so.data.students || []).find(x => x.student.id === 's1');
  check('sổ của cô mang CẢ HAI ô, mỗi ô một chỗ',
    !!dong && dong.record.note === DAU_GIA_DINH && dong.luuY && dong.luuY.luuY === DAU,
    JSON.stringify({ note: dong?.record?.note, luuY: dong?.luuY?.luuY }));
  check('ghi ô lưu ý KHÔNG đụng vào ô ghi chú cũ', dong.record.note === DAU_GIA_DINH, dong?.record?.note);
}

console.log('\n[2] GIA ĐÌNH: không một đường nào trả ra ô lưu ý — mục quan trọng nhất');
if (!ph) {
  check('tìm được phụ huynh của bé s1 để đăng nhập', false, 'không tìm thấy');
} else {
  // (a) Đường gia đình đọc lịch điểm danh của con — chỗ nguy nhất, vì nó chạy
  // `SELECT * FROM attendance`. Một cột mới trên bảng ấy là lọt ngay.
  let r = await req('GET', `/api/attendance?studentId=s1&month=${THANG}`, { cookie: ph });
  check('gia đình đọc được lịch điểm danh của con (đối chứng — đường này SỐNG)',
    r.status === 200 && Array.isArray(r.data) && r.data.length >= 1, r.status);
  check('…và đường ấy MANG ô ghi chú gia đình đọc được (đối chứng thứ hai)',
    coDau(r.data, DAU_GIA_DINH), 'không thấy dấu gia đình');
  check('GIA ĐÌNH KHÔNG THẤY Ô LƯU Ý ở lịch điểm danh của con', !coDau(r.data), 'LỘ RỒI');

  // (b) Gia đình gọi thẳng hai đường của trường.
  r = await req('GET', `/api/attendance/luu-y?studentId=s1&thang=${THANG}`, { cookie: ph });
  check('gia đình bị chặn ở đường đọc lưu ý (403)', r.status === 403, r.status);
  check('…và câu từ chối không kèm nội dung ô', !coDau(r.data), 'LỘ RỒI');

  r = await req('PUT', '/api/attendance/luu-y',
    { cookie: ph, body: { studentId: 's1', ngay: NGAY, luuY: 'gia đình tự ghi' } });
  check('gia đình KHÔNG ghi được ô lưu ý (403)', r.status === 403, r.status);

  r = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: ph });
  check('gia đình bị chặn ở sổ cả nhóm của cô', r.status === 403, r.status);

  // (c) Quét RỘNG: mọi đường gia đình mở được trong một ngày bình thường.
  const duong = [
    `/api/attendance?studentId=s1&month=${THANG}`,
    '/api/dashboard',
    '/api/students',
    '/api/thong-bao-be',
    `/api/remarks?studentId=s1`,
    `/api/health?studentId=s1`,
    `/api/attendance/anh?studentId=s1&date=${NGAY}`,
  ];
  let loLot = null;
  for (const d of duong) {
    const x = await req('GET', d, { cookie: ph });
    if (coDau(x.data)) { loLot = d; break; }
  }
  check('quét 7 đường gia đình mở được: không đường nào mang dấu ấy', loLot === null, loLot);
}

console.log('\n[3] Ô lưu ý ghi được cho NGÀY ĐÃ KHOÁ — khác hẳn sổ điểm danh bên cạnh');
{
  // Sổ điểm danh khoá ngoài ngày (Đ127). Đối chứng trước, để chắc luật cũ còn.
  let r = await req('POST', '/api/attendance/mark',
    { cookie: co, body: { studentId: 's3', date: '2026-09-01', status: 'present' } });
  check('đối chứng — sổ điểm danh VẪN khoá ngoài ngày (400)', r.status === 400, r.status);

  // Chụp lại dòng điểm danh của ngày ấy TRƯỚC khi ghi lưu ý.
  const truoc = (() => {
    const c = new Database(CSDL);
    try {
      return JSON.stringify(c.prepare('SELECT * FROM attendance WHERE studentId = ? AND date = ?')
        .get('s3', '2026-09-01') || null);
    } finally { c.close(); }
  })();
  check('đối chứng — ngày ấy ĐÃ CÓ sẵn một dòng điểm danh để mà so', truoc !== 'null', truoc);

  // Ô lưu ý thì không: nó là chỗ ghi thứ BIẾT ĐƯỢC SAU, thường vài hôm sau khi
  // gia đình gọi lại. Khoá nó theo ngày là bịt đúng lúc nó cần dùng.
  r = await req('PUT', '/api/attendance/luu-y',
    { cookie: co, body: { studentId: 's3', ngay: '2026-09-01', luuY: 'mẹ bé gọi lại hôm nay hỏi về hôm 01/09' } });
  check('nhưng ô lưu ý GHI ĐƯỢC cho ngày đã khoá', r.status === 200, r.data?.error);

  // Và nó KHÔNG phải lối vòng để sửa sổ điểm danh đã khoá.
  //
  // ĐO BẰNG TRƯỚC/SAU, KHÔNG BẰNG "không có dòng nào". Dữ liệu mẫu ĐÃ CÓ sẵn
  // một dòng điểm danh của bé s3 ngày 01/09 — bản đầu của bài này đòi `!att`
  // và đỏ, nhưng nó đỏ vì đo nhầm thứ: câu hỏi thật là "lượt ghi lưu ý có
  // ĐỘNG vào dòng ấy không", chứ không phải "có dòng nào không".
  const doc = () => {
    const c = new Database(CSDL);
    try {
      return JSON.stringify(c.prepare('SELECT * FROM attendance WHERE studentId = ? AND date = ?')
        .get('s3', '2026-09-01') || null);
    } finally { c.close(); }
  };
  const sau = doc();
  check('dòng điểm danh của ngày ấy y NGUYÊN — ô lưu ý không phải lối vòng sửa sổ đã khoá',
    sau === truoc, `trước ${truoc} / sau ${sau}`);

  r = await req('PUT', '/api/attendance/luu-y',
    { cookie: co, body: { studentId: 's3', ngay: '2099-01-01', luuY: 'ngày chưa tới' } });
  check('ngày chưa tới thì vẫn từ chối (400)', r.status === 400, r.status);
}

console.log('\n[4] Phạm vi: cô nhóm khác và quản lý cơ sở khác không đọc được');
{
  let r = await req('PUT', '/api/attendance/luu-y',
    { cookie: coKhac, body: { studentId: 's1', ngay: NGAY, luuY: 'cô nhóm khác ghi' } });
  check('cô nhóm khác KHÔNG ghi được lưu ý cho bé không phải nhóm mình (403)', r.status === 403, r.status);

  r = await req('GET', `/api/attendance/luu-y?studentId=s1&thang=${THANG}`, { cookie: coKhac });
  check('cô nhóm khác KHÔNG đọc được (403)', r.status === 403, r.status);
  check('…và không lộ nội dung trong câu từ chối', !coDau(r.data), 'LỘ RỒI');

  // Quản lý cơ sở 2: bé s1 thuộc cơ sở 1.
  r = await req('GET', `/api/attendance/luu-y?studentId=s1&thang=${THANG}`, { cookie: cs2 });
  check('quản lý cơ sở KHÁC không đọc được lưu ý của bé cơ sở 1 (403)', r.status === 403, r.status);

  r = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: cs2 });
  check('…và sổ cả nhóm của họ không mang dấu ấy', !coDau(r.data), 'LỘ RỒI');

  // ĐỐI CHỨNG: đúng người thì đọc được — kẻo cả mục này chỉ là "403 với mọi ai".
  r = await req('GET', `/api/attendance/luu-y?studentId=s1&thang=${THANG}`, { cookie: qt });
  check('đối chứng — hiệu trưởng ĐỌC ĐƯỢC ô lưu ý ấy',
    r.status === 200 && coDau(r.data), r.status);
  check('…và bản đọc cả tháng nói rõ ngày nào', r.status === 200 && r.data.some(x => x.ngay === NGAY),
    JSON.stringify(r.data?.map?.(x => x.ngay)));
}

console.log('\n[5] Gỡ ô lưu ý: mất ô, KHÔNG mất ô ghi chú gia đình và không mất dòng điểm danh');
{
  let r = await req('PUT', '/api/attendance/luu-y',
    { cookie: co, body: { studentId: 's1', ngay: NGAY, luuY: '' } });
  check('gõ rỗng = gỡ lưu ý', r.status === 200 && r.data.luuY === null, JSON.stringify(r.data));

  const so = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: co });
  const dong = (so.data.students || []).find(x => x.student.id === 's1');
  check('sổ của cô hết dấu ấy', !coDau(so.data), 'LỘ RỒI');
  check('NHƯNG ô ghi chú gia đình đọc được VẪN NGUYÊN — gỡ ô này không đụng ô kia',
    !!dong && dong.record.note === DAU_GIA_DINH, dong?.record?.note);
  check('và dòng điểm danh vẫn còn đủ', !!dong && dong.record.status === 'present', dong?.record?.status);

  const conn = new Database(CSDL);
  const con = conn.prepare('SELECT COUNT(*) c FROM attendance_luu_y WHERE studentId = ? AND ngay = ?')
    .get('s1', NGAY).c;
  conn.close();
  check('dòng rỗng KHÔNG ở lại làm một ô trống trông như chưa đọc', con === 0, con);
}

console.log('\n[6] Mã nguồn: ô lưu ý không được nằm trên bảng attendance');
{
  const fs = await import('node:fs');
  const schema = fs.readFileSync(new URL('../lib/schema.sql', import.meta.url), 'utf8');
  const khoiAtt = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS attendance ('));
  const hetKhoi = khoiAtt.slice(0, khoiAtt.indexOf(');'));
  check('bảng attendance KHÔNG có cột nào tên luuY — nếu có, đường của gia đình '
    + 'chạy SELECT * là lộ ngay ngày đầu', !/luuY/i.test(hetKhoi), hetKhoi.slice(0, 200));

  const rt = fs.readFileSync(new URL('../routes/attendance.js', import.meta.url), 'utf8');
  // Đường của gia đình là khối bắt đầu ở `app.get('/api/attendance', ` — cắt
  // tới `app.get('/api/attendance/class'` là trọn thân nó.
  const dau = rt.indexOf("app.get('/api/attendance', ");
  const cuoi = rt.indexOf("app.get('/api/attendance/class'");
  check('cắt được đúng thân đường của gia đình để soi', dau > 0 && cuoi > dau, `${dau}/${cuoi}`);
  const than = rt.slice(dau, cuoi);
  check('thân đường của gia đình KHÔNG nhắc tới bảng attendance_luu_y',
    !than.includes('attendance_luu_y'), 'có nhắc — đọc lại');
}

tongKet(sv);
