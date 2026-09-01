// ĐƯỜNG DẪN VIẾT HOA KHÔNG ĐƯỢC ĐI VÒNG QUA CHỐT CHẶN.
//
// Express mặc định khớp route KHÔNG phân biệt hoa/thường: gõ `/API/students`
// thì route `/api/students/...` vẫn chạy. Nhưng hai chốt chặn đứng trước route
// — `chanApiDaTat` (phân hệ đã tắt) và `chanApiNgoaiChucVu` (danh sách cho
// phép của chức vụ) — lại so `req.path` nguyên bản với tiền tố chữ thường.
// Trước bản vá, đổi MỘT chữ hoa trong địa chỉ là:
//
//   • tài khoản Kế toán (chỉ được Học phí + Tiền ăn) mở được hồ sơ bé;
//   • API của phân hệ nhà trường ĐÃ TẮT vẫn chạy như đang bật;
//   • trả lời của `/API/...` thiếu header `Cache-Control: no-store`.
//
// Bộ này canh cả ba, và canh thêm chiều ngược: đường viết thường vẫn hoạt động
// y như cũ (không được "sửa lỗ" bằng cách chặn nhầm người dùng thật).
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu,
} from './_chung.mjs';

const DIR = thuMucTam('duong-hoa-thuong');
sinhDuLieu(DIR);

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkKT = taoQuanTri(DIR, 'Chị Kế Toán', 'ketoan');
datChucVu(DIR, 'ketoan', 'ketoan');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4100), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

console.log('\n[1] CHỨC VỤ — viết hoa không mở được đường ngoài danh sách cho phép');
{
  const kt = await login('ketoan', mkKT);
  check('kế toán đăng nhập được', kt.status === 200, kt.status);

  const thuong = await req('GET', '/api/students', { cookie: kt.cookie });
  check('đường viết thường ngoài danh sách → 403', thuong.status === 403, thuong.status);

  const hoa = await req('GET', '/API/students', { cookie: kt.cookie });
  check('đường viết HOA ngoài danh sách → cũng phải bị chặn, không được trả dữ liệu',
    hoa.status === 403,
    { status: hoa.status, data: Array.isArray(hoa.data) ? `lộ ${hoa.data.length} bé` : undefined });

  const tron = await req('GET', '/Api/StuDents', { cookie: kt.cookie });
  check('trộn hoa thường cũng bị chặn', tron.status === 403, tron.status);

  const duocPhep = await req('GET', '/api/hocphi', { cookie: kt.cookie });
  const duocPhepHoa = await req('GET', '/API/hocphi', { cookie: kt.cookie });
  check('đường TRONG danh sách viết thường không bị chốt chức vụ chặn',
    duocPhep.status !== 403, duocPhep.status);
  check('đường TRONG danh sách viết hoa đi y như viết thường (không chặn nhầm)',
    duocPhepHoa.status === duocPhep.status,
    { hoa: duocPhepHoa.status, thuong: duocPhep.status });
}

console.log('\n[2] PHÂN HỆ ĐÃ TẮT — viết hoa không làm phân hệ sống lại');
{
  // Phân hệ mầm non mặc định TẮT (Nhật ký ngày là một). Ban giám hiệu — không
  // bị danh sách chức vụ giới hạn — vẫn không được mở API của phân hệ đang tắt.
  const bgh = await login('hieutruong', mkBGH);
  check('ban giám hiệu đăng nhập được', bgh.status === 200, bgh.status);

  const thuong = await req('GET', '/api/nhatky/homnay', { cookie: bgh.cookie });
  check('phân hệ tắt, đường viết thường → 404', thuong.status === 404, thuong.status);

  const hoa = await req('GET', '/API/nhatky/homnay', { cookie: bgh.cookie });
  check('phân hệ tắt, đường viết HOA → cũng phải 404, không được chạy route',
    hoa.status === 404, hoa.status);
}

console.log('\n[3] NO-STORE — trả lời của /API/... cũng không được để proxy cache');
{
  const bgh = await login('hieutruong', mkBGH);
  const res = await fetch(`${sv.BASE}/API/dashboard/badges`, {
    headers: { Cookie: bgh.cookie },
  });
  check('/API/dashboard/badges có Cache-Control: no-store',
    (res.headers.get('cache-control') || '') === 'no-store', res.headers.get('cache-control'));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
