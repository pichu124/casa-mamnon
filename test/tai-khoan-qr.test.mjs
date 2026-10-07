// Bài canh TÀI KHOẢN NHẬN TIỀN, MÃ QR, CÚ PHÁP CHUYỂN KHOẢN (Đ208 — việc 36).
//
// Chạy bằng:  npm run test:tai-khoan-qr
//
// ĐÂY LÀ BẢNG NGUY HIỂM NHẤT CỦA CẢ KHO MÃ VỀ MẶT TIỀN BẠC, và lý do nằm ở
// chỗ nó hỏng IM LẶNG:
//
//   Đổi một chữ số trong số tài khoản là đổi chỗ nhận tiền của TOÀN BỘ phụ
//   huynh. App không nối tới ngân hàng nào, nên không có bước nào kiểm tra
//   hộ — màn hình vẫn dựng một mã QR trông hoàn toàn bình thường cho số sai,
//   và nhìn từ ngoài một tài khoản bị đổi trộm không phân biệt được với một
//   tài khoản đúng. Không ai biết cho tới cuối tháng, khi hai chục nhà bảo đã
//   chuyển rồi mà trường bảo chưa nhận.
//
// Nên bài này canh ba vế, theo đúng thứ tự quan trọng:
//
//   [2] AI ĐỔI ĐƯỢC — chốt chặt nhất phân hệ, kế toán KHÔNG tự đổi được.
//   [3] CHƯA KHAI THÌ KHÔNG DỰNG MÃ — thà nói "chưa có" còn hơn một mã sai.
//   [4] CHUỖI QR ĐÚNG CHUẨN — sai một ô là ngân hàng từ chối hoặc hiểu khác.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tai-khoan-qr');
sinhDuLieu(DIR);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng Q', 'q_ht');
const mkKT = taoQuanTri(DIR, 'Kế Toán Q', 'q_kt');
datChucVu(DIR, 'q_kt', 'ketoan');
batPhanHe(DIR, ['hocphi']);

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4824), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const ht = (await login('q_ht', mkHT)).cookie;
const kt = (await login('q_kt', mkKT)).cookie;
const co = (await login('giaovien', '123456')).cookie;

function phuHuynhCua(studentId) {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare(
      `SELECT u.username FROM student_parents sp JOIN users u ON u.id = sp.parentId
        WHERE sp.studentId = ? LIMIT 1`).get(studentId);
    return r ? r.username : null;
  } finally { conn.close(); }
}
const ph = (await login(phuHuynhCua('s1'), '123456')).cookie;

// Bung ngược chuỗi EMVCo thành cây TLV, để đọc từng ô thay vì dò chuỗi con.
function bungTLV(s) {
  const r = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const t = s.slice(i, i + 2);
    const n = parseInt(s.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(n)) break;
    r[t] = s.slice(i + 4, i + 4 + n);
    i += 4 + n;
  }
  return r;
}

// Rút chuỗi QR ra khỏi SVG: thư viện vẽ hình chứ không in chuỗi, nên bài này
// gọi thẳng bộ dựng chuỗi của app để đọc nội dung, và chỉ dùng SVG để chắc
// rằng màn hình có cái để hiện.
const vietqr = (await import(`file://${path.join(GOC, 'lib/vietqr.js')}`)).default;

let khoanId = null;

console.log('\n[1] Chưa khai gì: màn của gia đình nói CHƯA CÓ, không dựng mã nào');
{
  // Tạo một khoản thu để có thứ mà chuyển khoản.
  let r = await req('POST', '/api/hocphi', {
    cookie: ht,
    body: { studentId: 's1', noiDung: 'Học phí tháng 9', soTien: 2500000, kyThu: 'Tháng 9/2026', hanNop: '2026-09-25' },
  });
  check('đối chứng — tạo được một khoản thu để mà chuyển', r.status === 200 || r.status === 201,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  khoanId = r.data && (r.data.id || (r.data.khoan && r.data.khoan.id));
  check('đối chứng — có mã khoản thu', !!khoanId, khoanId);

  r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('CHƯA KHAI THÌ KHÔNG DỰNG MÃ — nói thẳng là chưa có', r.status === 200 && r.data.coTaiKhoan === false,
    JSON.stringify(r.data).slice(0, 160));
  check('…và câu nói ra bằng tiếng của trường, chỉ gia đình đi hỏi văn phòng',
    /văn phòng/i.test(String(r.data.loiNhan || '')), r.data?.loiNhan);
  check('…và KHÔNG kèm một mã QR nào', !r.data.qrSvg && !r.data.soTaiKhoan, JSON.stringify(r.data).slice(0, 120));
}

console.log('\n[2] AI ĐỔI ĐƯỢC TÀI KHOẢN — chốt chặt nhất phân hệ');
{
  const dong = {
    campusId: '', maNganHang: '970436', soTaiKhoan: '0123456789',
    chuTaiKhoan: 'TRUONG MAM NON CASA', cuPhap: '{MA_BE} {TEN_BE} {TEN_KHOAN}', daDoiChieu: true,
  };

  // KẾ TOÁN SOẠN ĐƯỢC BIỂU PHÍ NHƯNG KHÔNG TỰ ĐỔI ĐƯỢC CHỖ TIỀN CHẠY VỀ.
  let r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: kt, body: dong });
  check('KẾ TOÁN KHÔNG đổi được tài khoản nhận tiền (403)', r.status === 403, r.status);
  check('…và câu từ chối nói rõ vì sao, không chỉ "không có quyền"',
    /ban giám hiệu/i.test(String(r.data?.error || '')), r.data?.error);

  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: co, body: dong });
  check('cô cũng không đổi được', r.status === 403, r.status);
  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ph, body: dong });
  check('gia đình cũng không đổi được', r.status === 403, r.status);
  r = await req('GET', '/api/hocphi/tai-khoan', { cookie: ph });
  check('gia đình không đọc được màn khai tài khoản', r.status === 403, r.status);

  // BẮT XÁC NHẬN ĐÃ ĐỐI CHIẾU — vế duy nhất còn lại khi app không hỏi được ngân hàng.
  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ht, body: { ...dong, daDoiChieu: false } });
  check('CHƯA TÍCH "đã đối chiếu" thì KHÔNG lưu, kể cả hiệu trưởng', r.status === 400, r.status);
  check('…và câu từ chối nói rõ hậu quả của việc gõ nhầm',
    /sang chỗ khác|không có gì báo/i.test(String(r.data?.error || '')), r.data?.error);

  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ht, body: { ...dong, maNganHang: '97043' } });
  check('mã ngân hàng không đủ 6 số → 400', r.status === 400, r.status);
  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ht, body: { ...dong, soTaiKhoan: 'ab' } });
  check('số tài khoản quá ngắn → 400', r.status === 400, r.status);
  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ht, body: { ...dong, chuTaiKhoan: '' } });
  check('thiếu tên chủ tài khoản → 400 (màn của gia đình in tên này để đối chiếu)',
    r.status === 400, r.status);

  // ĐỐI CHỨNG: hiệu trưởng khai đủ thì LƯU ĐƯỢC — kẻo cả mục này chỉ là "400 với mọi thứ".
  r = await req('PUT', '/api/hocphi/tai-khoan', { cookie: ht, body: dong });
  check('đối chứng — HIỆU TRƯỞNG khai đủ thì lưu được', r.status === 200 && r.data.ok === true,
    `${r.status} ${r.data?.error || ''}`);
  check('…và máy đọc lại đúng tên ngân hàng từ mã để người khai nhìn bằng mắt',
    r.data.tenTheoMa === 'Vietcombank', r.data?.tenTheoMa);
}

console.log('\n[3] Giữ vết mọi lần đổi — "tháng trước tiền chạy vào số nào, ai đặt"');
{
  let r = await req('PUT', '/api/hocphi/tai-khoan', {
    cookie: ht,
    body: {
      campusId: '', maNganHang: '970415', soTaiKhoan: '9998887776',
      chuTaiKhoan: 'TRUONG MAM NON CASA', cuPhap: '{MA_BE} {TEN_KHOAN}', daDoiChieu: true,
    },
  });
  check('đổi sang tài khoản thứ hai được', r.status === 200, r.data?.error);

  const conn = new Database(CSDL);
  const su = conn.prepare('SELECT * FROM hocphi_taikhoan_su ORDER BY doiLuc').all();
  const hienTai = conn.prepare("SELECT * FROM hocphi_taikhoan WHERE campusId = ''").get();
  conn.close();
  check('SỔ GHI GIỮ CẢ HAI LẦN ĐỔI, không ghi đè mất dấu', su.length === 2, su.length);
  check('…và số cũ vẫn đọc được trong sổ', su.some(x => x.soTaiKhoan === '0123456789'),
    su.map(x => x.soTaiKhoan).join(', '));
  check('…mỗi lần đều có tên người đổi', su.every(x => !!x.nguoiDoi), JSON.stringify(su.map(x => x.nguoiDoi)));
  check('dòng đang dùng là số MỚI', hienTai.soTaiKhoan === '9998887776', hienTai?.soTaiKhoan);

  // NHẬT KÝ KHÔNG CHÉP ĐỦ SỐ TÀI KHOẢN — bốn số cuối là đủ để đối chiếu.
  const c2 = new Database(CSDL);
  const nk = c2.prepare("SELECT * FROM audit_log WHERE action = 'hocphi-doi-tai-khoan'").all();
  c2.close();
  check('Nhật ký có ghi lại việc đổi tài khoản', nk.length === 2, nk.length);
  check('…nhưng KHÔNG chép đủ số tài khoản vào Nhật ký, chỉ bốn số cuối',
    nk.every(x => !String(x.meta || '').includes('9998887776')), JSON.stringify(nk[1]?.meta || '').slice(0, 120));
}

console.log('\n[4] Chuỗi QR đúng chuẩn VietQR/EMVCo — sai một ô là ngân hàng hiểu khác');
{
  check('CRC-16/CCITT-FALSE đúng theo véc-tơ chuẩn ("123456789" → 29B1)',
    vietqr.crc16('123456789') === '29B1', vietqr.crc16('123456789'));

  const chuoi = vietqr.payload({
    maNganHang: '970436', soTaiKhoan: '0123456789', soTien: 2500000, noiDung: 'MN001 Nguyen Bao An',
  });
  const t = bungTLV(chuoi);
  check('ô 00 = 01 (khuôn payload)', t['00'] === '01', t['00']);
  check('ô 01 = 12 khi CÓ số tiền (mã dùng một lần)', t['01'] === '12', t['01']);
  check('ô 53 = 704 (đồng Việt Nam)', t['53'] === '704', t['53']);
  check('ô 54 mang đúng số tiền', t['54'] === '2500000', t['54']);
  check('ô 58 = VN', t['58'] === 'VN', t['58']);
  const m38 = bungTLV(t['38'] || '');
  check('ô 38.00 = A000000727 (mã VietQR)', m38['00'] === 'A000000727', m38['00']);
  check('ô 38.02 = QRIBFTTA (chuyển tới TÀI KHOẢN)', m38['02'] === 'QRIBFTTA', m38['02']);
  const th = bungTLV(m38['01'] || '');
  check('mã ngân hàng và số tài khoản nằm đúng ô', th['00'] === '970436' && th['01'] === '0123456789',
    `${th['00']} / ${th['01']}`);
  check('nội dung chuyển khoản nằm ở ô 62.08', bungTLV(t['62'] || '')['08'] === 'MN001 Nguyen Bao An',
    bungTLV(t['62'] || '')['08']);
  check('CRC ở cuối chuỗi khớp với phần trước nó',
    vietqr.crc16(chuoi.slice(0, -4)) === chuoi.slice(-4), chuoi.slice(-4));

  // Không có số tiền → mã TĨNH, cố ý cho phép: gia đình nộp gộp nhiều khoản
  // là chuyện thường, một mã khoá cứng số tiền lại cản đúng lúc đó.
  const t2 = bungTLV(vietqr.payload({ maNganHang: '970436', soTaiKhoan: '0123456789' }));
  check('không số tiền → ô 01 = 11 (mã dùng lại) và KHÔNG có ô 54',
    t2['01'] === '11' && !('54' in t2), `${t2['01']} / ${'54' in t2}`);

  check('bỏ dấu tiếng Việt trước khi đưa vào mã — ngân hàng đọc theo ASCII',
    vietqr.boDauASCII('Nguyễn Bảo Ân — Đức') === 'Nguyen Bao An Duc',
    vietqr.boDauASCII('Nguyễn Bảo Ân — Đức'));
  let nem = null;
  try { vietqr.payload({ maNganHang: 'abc', soTaiKhoan: '0123456789' }); } catch (e) { nem = e.message; }
  check('mã ngân hàng sai thì NÉM LỖI chứ không dựng một mã hỏng', !!nem, nem);
}

console.log('\n[5] Gia đình: nhận đủ thông tin để ĐỐI CHIẾU BẰNG MẮT trước khi bấm');
{
  let r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('gia đình đọc được cách chuyển khoản cho khoản của con mình', r.status === 200 && r.data.coTaiKhoan === true,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  // MỘT MÃ QR LÀ MỘT HÌNH VUÔNG ĐEN TRẮNG — người quét không đọc được gì trong
  // đó. Không in số tài khoản và tên chủ tài khoản ra chữ thì không gia đình
  // nào phát hiện được rằng số đã bị đổi.
  check('CÓ số tài khoản bằng CHỮ để đối chiếu', r.data.soTaiKhoan === '9998887776', r.data.soTaiKhoan);
  check('CÓ tên chủ tài khoản bằng CHỮ', /CASA/.test(String(r.data.chuTaiKhoan || '')), r.data.chuTaiKhoan);
  check('CÓ tên ngân hàng', /VietinBank/i.test(String(r.data.tenNganHang || '')), r.data.tenNganHang);
  check('có mã QR dựng sẵn để quét', typeof r.data.qrSvg === 'string' && r.data.qrSvg.includes('<svg'),
    String(r.data.qrSvg).slice(0, 40));

  // CÚ PHÁP LÀ KHUÔN, và chuỗi trả ra phải ĐÃ BỎ DẤU — đúng thứ nằm trong mã,
  // để gia đình gõ tay cũng ra đúng chuỗi ấy.
  check('cú pháp đã thay mã bé thật vào khuôn', /Hoc phi thang 9/i.test(String(r.data.cuPhap || '')),
    r.data.cuPhap);
  check('cú pháp KHÔNG còn dấu tiếng Việt', !/[àáãạảăâèéêìíòóôõơùúưỳýđ]/i.test(String(r.data.cuPhap || '')),
    r.data.cuPhap);

  r = await req('GET', '/api/hocphi/chuyen-khoan?khoanId=khong-co-that', { cookie: ph });
  check('mã khoản lạ → 404', r.status === 404, r.status);
}

console.log('\n[6] Phạm vi: nhà này không xem được cách nộp của nhà khác');
{
  // BÉ "NHÀ KHÁC" PHẢI THẬT SỰ LÀ NHÀ KHÁC, VÀ BÀI NÀY TỰ ĐI TÌM LẤY.
  //
  // Bản đầu chọn bừa bé s2 rồi báo đỏ với mã 200 — đọc lại dữ liệu mẫu thì
  // `phuhuynh` là bố mẹ của CẢ s1 lẫn s2, nên 200 là ĐÚNG: một nhà hai con.
  // Gõ cứng một mã bé vào phép kiểm phạm vi là chỗ bài canh nói dối theo cả
  // hai chiều — hoặc đỏ oan như lần này, hoặc ngày mai dữ liệu mẫu đổi thì
  // xanh oan mà không ai biết. Nên tra thẳng cơ sở dữ liệu tìm một bé mà tài
  // khoản này KHÔNG phải người nhà, rồi đòi chính điều đó thành một phép kiểm.
  const conn = new Database(CSDL);
  const cuaToi = new Set(conn.prepare(
    `SELECT sp.studentId FROM student_parents sp JOIN users u ON u.id = sp.parentId
      WHERE u.username = ?`).all(phuHuynhCua('s1') ? 'phuhuynh' : '').map(x => x.studentId));
  const beKhac = conn.prepare('SELECT id FROM students WHERE active = 1').all()
    .map(x => x.id).find(id => !cuaToi.has(id));
  conn.close();
  check('đối chứng — tìm được một bé KHÔNG thuộc nhà đang đăng nhập',
    !!beKhac && !cuaToi.has(beKhac), `${beKhac} / nhà này có ${[...cuaToi].join(',')}`);

  const r0 = await req('POST', '/api/hocphi', {
    cookie: ht,
    body: { studentId: beKhac, noiDung: 'Học phí tháng 9', soTien: 2500000, kyThu: 'Tháng 9/2026', hanNop: '2026-09-25' },
  });
  const idKhac = r0.data && (r0.data.id || (r0.data.khoan && r0.data.khoan.id));
  check('đối chứng — tạo được khoản cho bé nhà khác', !!idKhac, `${r0.status}`);
  const r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(idKhac)}`, { cookie: ph });
  check('GIA ĐÌNH NHÀ KHÁC bị chặn (403)', r.status === 403, r.status);
  check('…và câu từ chối không kèm số tài khoản nào',
    !JSON.stringify(r.data).includes('9998887776'), JSON.stringify(r.data).slice(0, 120));

  // ĐỐI CHỨNG NGƯỢC CHIỀU: con THỨ HAI của chính nhà ấy thì vẫn đọc được —
  // kẻo phép kiểm trên xanh chỉ vì đường này chặn tất cả mọi người.
  const conCuaToi = [...cuaToi].find(x => x !== 's1');
  if (conCuaToi) {
    const r2 = await req('POST', '/api/hocphi', {
      cookie: ht,
      body: { studentId: conCuaToi, noiDung: 'Học phí tháng 9', soTien: 1500000, kyThu: 'Tháng 9/2026', hanNop: '2026-09-25' },
    });
    const id2 = r2.data && (r2.data.id || (r2.data.khoan && r2.data.khoan.id));
    const r3 = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(id2)}`, { cookie: ph });
    check('đối chứng — CON THỨ HAI của chính nhà ấy thì vẫn đọc được',
      r3.status === 200 && r3.data.coTaiKhoan === true, `${r3.status}`);
  } else {
    check('đối chứng — nhà đang đăng nhập có con thứ hai để đo chiều ngược', false, 'không có');
  }
}

console.log('\n[7] Mã nguồn: danh sách ngân hàng là GỢI Ý, không phải nguồn sự thật');
{
  const lib = fs.readFileSync(path.join(GOC, 'lib/vietqr.js'), 'utf8');
  check('tệp nói rõ app KHÔNG kiểm tra được một số tài khoản',
    /KHÔNG THỂ KIỂM TRA MỘT SỐ TÀI KHOẢN/.test(lib), 'thiếu lời cảnh báo');
  check('mã ngân hàng ngoài danh sách vẫn gõ thẳng được (chỉ đòi 6 chữ số)',
    vietqr.hopLeMa('123456') === true && vietqr.hopLeMa('12345') === false, '');
  check('mã không nhận ra thì nói thẳng là không nhận ra, không im lặng',
    vietqr.tenNganHang('123456') === '' && vietqr.tenNganHang('970436') === 'Vietcombank', '');
}

tongKet(sv);
