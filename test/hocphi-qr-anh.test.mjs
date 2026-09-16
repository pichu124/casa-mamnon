// Bài canh ẢNH MÃ QR DO NHÀ TRƯỜNG TỰ TẢI LÊN (Đ214).
//
// Chạy bằng:  npm run test:hocphi-qr-anh
//
// VÌ SAO CÓ ĐƯỜNG NÀY. Mã app tự dựng theo chuẩn VietQR không phủ hết mọi
// ngân hàng lẫn mọi ví. Trường nào đã có sẵn tấm QR in ở quầy thì tải thẳng
// tấm đó lên là chắc nhất — nó là tấm trường đã tự quét thử.
//
// VÌ SAO NÓ NGUY HIỂM NGANG ĐƯỜNG ĐỔI SỐ TÀI KHOẢN, và bài này canh theo đúng
// thứ tự ấy:
//
//   Tải nhầm một tấm QR là đổi chỗ nhận tiền của TOÀN BỘ phụ huynh, và đổi
//   một cách im lặng. App KHÔNG ĐỌC ĐƯỢC nội dung bên trong tấm ảnh — với máy
//   chủ nó chỉ là mấy chục nghìn byte hình. Không có bước nào kiểm hộ, kể cả
//   phép kiểm chuỗi EMVCo mà đường số tài khoản còn có.
//
// Nên bài này canh năm vế:
//
//   [2] AI TẢI ĐƯỢC — hỏi `duyetBieuPhiDuoc`, kế toán KHÔNG tự tải được.
//   [3] BẮT XÁC NHẬN ĐÃ QUÉT THỬ — vế duy nhất còn lại khi máy không đọc được.
//   [4] GIA ĐÌNH THẤY ĐÚNG TẤM ẤY, và màn NÓI RA rằng nó thiếu số tiền + nội dung.
//   [5] AI XEM ĐƯỢC TẤM ẢNH — nhà khác không lấy được bằng cách gõ mã khoản thu.
//   [6] GỠ ẢNH THÌ QUAY VỀ MÃ TỰ DỰNG, không phải mất luôn chuyển khoản.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hocphi-qr-anh');
sinhDuLieu(DIR);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng R', 'r_ht');
const mkKT = taoQuanTri(DIR, 'Kế Toán R', 'r_kt');
datChucVu(DIR, 'r_kt', 'ketoan');
batPhanHe(DIR, ['hocphi']);

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4831), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const ht = (await login('r_ht', mkHT)).cookie;
const kt = (await login('r_kt', mkKT)).cookie;
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

// MỘT TẤM PNG THẬT, 1x1 điểm ảnh. Phải là ảnh thật vì `lib/uploads.js` đọc
// mấy byte đầu để nhận dạng — một chuỗi base64 bịa ra sẽ bị chặn ở đó, và bài
// canh sẽ đo nhầm sang phép kiểm định dạng thay vì phép kiểm quyền.
const PNG_1x1 = 'data:image/png;base64,'
  + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let khoanId = null;
let khoanNhaKhac = null;

console.log('\n[1] Dựng sẵn khoản thu để có thứ mà chuyển khoản');
{
  let r = await req('POST', '/api/hocphi', {
    cookie: ht,
    body: { studentId: 's1', noiDung: 'Học phí tháng 9', soTien: 2500000, kyThu: 'Tháng 9/2026', hanNop: '2026-09-25' },
  });
  check('đối chứng — tạo được khoản thu cho bé s1', r.status === 200 || r.status === 201,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  khoanId = r.data && (r.data.id || (r.data.khoan && r.data.khoan.id));
  check('đối chứng — có mã khoản thu', !!khoanId, khoanId);

  // Một khoản của NHÀ KHÁC, để mục [5] đo được vế "nhà này không xem của nhà kia".
  // Tìm một bé mà phụ huynh của s1 KHÔNG phải cha mẹ — ở dữ liệu mẫu, một tài
  // khoản phụ huynh có thể là cha mẹ của nhiều bé, nên phải hỏi bằng dữ liệu.
  const conn = new Database(CSDL);
  const phS1 = conn.prepare(
    'SELECT parentId FROM student_parents WHERE studentId = ? LIMIT 1').get('s1');
  const beKhac = conn.prepare(
    `SELECT sp.studentId FROM student_parents sp
      WHERE sp.parentId <> ?
        AND sp.studentId NOT IN (SELECT studentId FROM student_parents WHERE parentId = ?)
      LIMIT 1`).get(phS1.parentId, phS1.parentId);
  conn.close();
  check('đối chứng — tìm được một bé KHÔNG cùng nhà với s1', !!beKhac, beKhac && beKhac.studentId);

  r = await req('POST', '/api/hocphi', {
    cookie: ht,
    body: { studentId: beKhac.studentId, noiDung: 'Học phí tháng 9', soTien: 2000000, kyThu: 'Tháng 9/2026', hanNop: '2026-09-25' },
  });
  khoanNhaKhac = r.data && (r.data.id || (r.data.khoan && r.data.khoan.id));
  check('đối chứng — có khoản thu của nhà khác', !!khoanNhaKhac, khoanNhaKhac);
}

const ph = (await login(phuHuynhCua('s1'), '123456')).cookie;

console.log('\n[2] AI TẢI ĐƯỢC ẢNH QR — cùng một chốt với đường đổi số tài khoản');
{
  const than = { campusId: '', anh: PNG_1x1, tenGoc: 'qr.png', daQuetThu: true };

  let r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', { cookie: kt, body: than });
  check('KẾ TOÁN KHÔNG tải được ảnh QR (403)', r.status === 403, r.status);
  check('…và câu từ chối nói rõ vì sao, không chỉ "không có quyền"',
    /ban giám hiệu/i.test(String(r.data?.error || '')), r.data?.error);

  r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', { cookie: co, body: than });
  check('cô cũng không tải được', r.status === 403, r.status);
  r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', { cookie: ph, body: than });
  check('gia đình cũng không tải được', r.status === 403, r.status);

  r = await req('DELETE', '/api/hocphi/tai-khoan/qr-anh?campusId=', { cookie: kt });
  check('KẾ TOÁN cũng không GỠ được ảnh QR (403)', r.status === 403, r.status);
}

console.log('\n[3] BẮT XÁC NHẬN ĐÃ QUÉT THỬ — máy không đọc được bên trong tấm ảnh');
{
  let r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', {
    cookie: ht, body: { campusId: '', anh: PNG_1x1, daQuetThu: false },
  });
  check('CHƯA TÍCH "đã quét thử" thì KHÔNG lưu, kể cả hiệu trưởng', r.status === 400, r.status);
  check('…và câu từ chối nói rõ hậu quả của việc tải nhầm',
    /sang chỗ khác|không có gì báo/i.test(String(r.data?.error || '')), r.data?.error);

  r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', {
    cookie: ht, body: { campusId: '', anh: 'data:text/plain;base64,aGVsbG8=', daQuetThu: true },
  });
  check('tệp KHÔNG phải ảnh thì bị chặn → 400', r.status === 400, r.status);

  r = await req('POST', '/api/hocphi/tai-khoan/qr-anh', {
    cookie: ht, body: { campusId: '', anh: PNG_1x1, tenGoc: 'qr.png', daQuetThu: true },
  });
  check('HIỆU TRƯỞNG TẢI ĐƯỢC khi đã tích xác nhận', r.status === 200 && r.data.coAnh === true,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
}

console.log('\n[4] GIA ĐÌNH THẤY ĐÚNG TẤM ẢNH, và màn NÓI RA rằng nó thiếu gì');
{
  // Lúc này trường CHƯA khai số tài khoản — trước Đ214 màn này trả
  // `coTaiKhoan: false`. Có ảnh rồi thì phải hiện được.
  let r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('CÓ ẢNH THÌ HIỆN ĐƯỢC, dù trường chưa khai số tài khoản',
    r.status === 200 && r.data.coTaiKhoan === true, `${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  check('…và trả về đường dẫn tới đúng tấm ảnh ấy',
    typeof r.data.qrAnhUrl === 'string' && r.data.qrAnhUrl.includes('qr-anh'), r.data?.qrAnhUrl);
  check('…đường dẫn đi kèm MÃ KHOẢN THU, không phải mã cơ sở — để gác đúng bằng quyền của bé',
    String(r.data.qrAnhUrl || '').includes('khoanId='), r.data?.qrAnhUrl);

  // VẾ QUAN TRỌNG NHẤT CỦA MỤC NÀY. Một tấm ảnh dùng chung cho mọi bé thì
  // không mang được số tiền và nội dung của riêng bé nào. Thiếu cờ này là màn
  // hình không có cách nào biết mà nói ra, và gia đình quét xong tưởng đã đủ.
  check('MÀN HÌNH ĐƯỢC BÁO LÀ TẤM NÀY CHƯA CÓ SỐ TIỀN VÀ NỘI DUNG (qrTuDien = false)',
    r.data.qrTuDien === false, r.data?.qrTuDien);

  // Và cú pháp vẫn phải trả về, vì đó là thứ gia đình phải tự gõ.
  check('…nhưng CÚ PHÁP vẫn trả về để gia đình gõ tay', !!String(r.data.cuPhap || '').trim(), r.data?.cuPhap);

  // Gọi thẳng `fetch` vì cần đọc TIÊU ĐỀ, mà `taoReq` cố ý chỉ trả về
  // { status, data, setCookie }. Nới bộ trợ giúp dùng chung chỉ vì một bài
  // canh là đổi thứ mà hơn trăm bài khác đang dựa vào.
  const raw = await fetch(`${sv.BASE}/api/hocphi/qr-anh?khoanId=${encodeURIComponent(khoanId)}`,
    { headers: { Cookie: ph } });
  const than = Buffer.from(await raw.arrayBuffer());
  check('GIA ĐÌNH TẢI ĐƯỢC TẤM ẢNH THẬT', raw.status === 200, raw.status);
  check('…và máy chủ trả đúng kiểu ảnh, không phải JSON',
    /^image\//.test(String(raw.headers.get('content-type') || '')), raw.headers.get('content-type'));
  check('…và KHÔNG cho proxy nhớ hộ (ảnh của trường, không phải ảnh công khai)',
    /private/.test(String(raw.headers.get('cache-control') || '')), raw.headers.get('cache-control'));
  // ĐÚNG TẤM ẢNH, KHÔNG PHẢI MỘT TỆP RỖNG: bốn byte đầu của mọi tệp PNG.
  check('…và byte trả về đúng là một tệp PNG, không phải tệp rỗng',
    than.length > 8 && than.slice(1, 4).toString() === 'PNG', `${than.length} byte`);
}

console.log('\n[5] AI XEM ĐƯỢC TẤM ẢNH — gõ mã khoản thu của nhà khác thì không ra');
{
  let r = await req('GET', `/api/hocphi/qr-anh?khoanId=${encodeURIComponent(khoanNhaKhac)}`, { cookie: ph });
  check('NHÀ NÀY KHÔNG lấy được qua mã khoản thu của NHÀ KHÁC (403)', r.status === 403, r.status);

  // ĐỐI CHỨNG NGƯỢC: đúng khoản của nhà mình thì vẫn lấy được. Không có vế này
  // thì một bản vá chặn sạch mọi người cũng làm bài trên xanh.
  r = await req('GET', `/api/hocphi/qr-anh?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('ĐỐI CHỨNG NGƯỢC — đúng khoản của nhà mình thì vẫn lấy được', r.status === 200, r.status);

  // Gia đình cố đi cửa của nhà trường.
  r = await req('GET', '/api/hocphi/qr-anh?campusId=', { cookie: ph });
  check('GIA ĐÌNH KHÔNG đi được cửa tra theo mã cơ sở (403)', r.status === 403, r.status);

  r = await req('GET', '/api/hocphi/qr-anh?campusId=', { cookie: ht });
  check('nhà trường thì xem lại được tấm mình vừa tải', r.status === 200, r.status);

  r = await req('GET', '/api/hocphi/tai-khoan', { cookie: ht });
  const dong = (r.data?.danhSach || []).find(x => (x.campusId || '') === '');
  check('MÀN QUẢN TRỊ CÓ DÒNG ĐỂ XEM VÀ GỠ, dù trường chưa khai số tài khoản', !!dong,
    JSON.stringify(r.data?.danhSach || []).slice(0, 160));
  check('…và dòng ấy nói rõ là đang dùng ảnh QR', dong && dong.coAnhQr === true, dong?.coAnhQr);
}

console.log('\n[6] GỠ ẢNH THÌ QUAY VỀ MÃ TỰ DỰNG, không phải mất luôn chuyển khoản');
{
  // Khai số tài khoản trước, để đo được vế "quay về" chứ không phải vế "mất hẳn".
  let r = await req('PUT', '/api/hocphi/tai-khoan', {
    cookie: ht,
    body: {
      campusId: '', maNganHang: '970436', soTaiKhoan: '0123456789',
      chuTaiKhoan: 'TRUONG MAM NON CASA', cuPhap: '{MA_BE} {TEN_BE}', daDoiChieu: true,
    },
  });
  check('đối chứng — khai được số tài khoản', r.status === 200, r.status);

  // CÒN ẢNH THÌ ẢNH VẪN THẮNG. Trường đã cố ý tải tấm của mình lên thì app
  // không được tự ý quay về mã nó tự dựng.
  r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('CÓ CẢ HAI THÌ ẢNH CỦA TRƯỜNG THẮNG', !!r.data.qrAnhUrl, r.data?.qrAnhUrl);
  check('…và app KHÔNG dựng thêm một mã thứ hai cho màn hình phải chọn',
    !r.data.qrSvg, typeof r.data?.qrSvg);

  r = await req('DELETE', '/api/hocphi/tai-khoan/qr-anh?campusId=', { cookie: ht });
  check('hiệu trưởng gỡ được ảnh', r.status === 200 && r.data.coAnh === false,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);

  r = await req('GET', `/api/hocphi/chuyen-khoan?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('GỠ RỒI THÌ QUAY VỀ MÃ APP TỰ DỰNG, chuyển khoản không mất',
    r.status === 200 && r.data.coTaiKhoan === true && !r.data.qrAnhUrl && !!r.data.qrSvg,
    JSON.stringify({ co: r.data?.coTaiKhoan, anh: r.data?.qrAnhUrl, svg: !!r.data?.qrSvg }));
  check('…và mã tự dựng lại MANG SẴN số tiền và nội dung (qrTuDien = true)',
    r.data.qrTuDien === true, r.data?.qrTuDien);

  r = await req('GET', `/api/hocphi/qr-anh?khoanId=${encodeURIComponent(khoanId)}`, { cookie: ph });
  check('gỡ rồi thì đường ảnh trả 404, không trả tấm cũ', r.status === 404, r.status);

  r = await req('DELETE', '/api/hocphi/tai-khoan/qr-anh?campusId=', { cookie: ht });
  check('gỡ lần nữa thì báo chưa có gì để gỡ (404), không sập', r.status === 404, r.status);
}

console.log('\n[7] SỔ GHI — đổi chỗ tiền chạy về thì phải còn vết');
{
  const conn = new Database(CSDL);
  const su = conn.prepare('SELECT viec FROM hocphi_qr_anh_su ORDER BY taiLuc').all();
  conn.close();
  check('mọi lần tải lên và gỡ xuống đều vào sổ', su.length >= 2, su.map(x => x.viec).join(','));
  check('…và sổ phân biệt được tải lên với gỡ xuống',
    su.some(x => x.viec === 'tai-len') && su.some(x => x.viec === 'go-xuong'),
    su.map(x => x.viec).join(','));
}

sv.dung();
tongKet();
