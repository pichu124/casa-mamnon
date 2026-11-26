// Bài canh: MẬT KHẨU TẠM CHỈ ĐỂ ĐẶT MẬT KHẨU RIÊNG — MÁY CHỦ CHẶN, KHÔNG CHỈ MÀN HÌNH (Đ261b, lỗi O5).
//
// Chạy bằng:  TEST_PORT=7061 node test/mat-khau-tam-chan-api.test.mjs
//
// Mật khẩu tạm do trường cấp (in trên giấy, đọc qua điện thoại, đưa ở buổi
// họp) trước đây mở được MỌI API: kiểm thử thay trường gọi `/api/students/:id`,
// `/api/albums`, `/api/health` bằng tài khoản gia đình còn `mustChangePassword`
// — đều 200. Chỉ màn hình (`public/js/app.js`) bắt đổi mật khẩu; ai nhặt được
// tờ giấy và gọi thẳng API là xem được hồ sơ bé.
//
// Nay máy chủ chỉ mở cho tài khoản ấy đúng những gì cần để đặt mật khẩu riêng:
// /api/auth/* (biết mình là ai, đặt mật khẩu mới, đăng xuất) và danh sách phân
// hệ (giao diện nạp ngay khi đăng nhập). Mọi đường khác 403 kèm câu tiếng Việt.
// Bài canh cả luồng cài mới: tài khoản quản trị đầu tiên tạo bằng
// `create-admin` vẫn đăng nhập, đặt mật khẩu, rồi dùng được Quản trị.
import path from 'path';
import { execFileSync } from 'child_process';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('mat-khau-tam-chan-api');
sinhDuLieu(DIR);
// Gia đình mẫu `phuhuynh` (bé s1) đang dùng mật khẩu tạm, như vừa được cấp.
execFileSync('node', ['-e', `
  const D = require('better-sqlite3');
  const db = new D(process.argv[1]);
  db.prepare("UPDATE users SET mustChangePassword = 1 WHERE username = 'phuhuynh'").run();
  db.close();
`, path.join(DIR, 'school.db')], { cwd: GOC });
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng Mới', 'qt_dau_tien');
const mkQT2 = taoQuanTri(DIR, 'Văn Phòng Trường', 'qt_hai');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7061), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const CHAN = ['/api/students/s1', '/api/students', '/api/albums', '/api/health', '/api/attendance?studentId=s1',
  '/api/dashboard/badges', '/api/notifications', '/API/STUDENTS/s1'];

// ===========================================================================
console.log('\n[1] Gia đình còn mật khẩu tạm: chỉ đặt được mật khẩu, không xem được gì khác');
{
  const vao = await login('phuhuynh', '123456');
  check('đăng nhập được bằng mật khẩu tạm', vao.status === 200, vao.status);
  check('máy chủ báo phải đặt mật khẩu mới', vao.data?.user?.mustChangePassword === true, vao.data?.user?.mustChangePassword);
  const ck = vao.cookie;

  const me = await req('GET', '/api/auth/me', { cookie: ck });
  check('/api/auth/me vẫn trả lời (giao diện cần để hiện màn đặt mật khẩu)', me.status === 200, me.status);
  const mods = await req('GET', '/api/modules', { cookie: ck });
  check('/api/modules vẫn trả lời (giao diện nạp ngay lúc đăng nhập)', mods.status === 200 && Array.isArray(mods.data), mods.status);

  for (const d of CHAN) {
    const r = await req('GET', d, { cookie: ck });
    check(`${d} → 403`, r.status === 403, r.status);
  }
  const r = await req('GET', '/api/students/s1', { cookie: ck });
  check('câu báo tiếng Việt, nói phải đặt mật khẩu mới', /đặt mật khẩu/i.test(r.data?.error || ''), r.data);
  check('không lộ dữ liệu của bé trong câu trả lời', !r.data?.name && !r.data?.id, r.data);
  const ghi = await req('POST', '/api/leave', {
    cookie: ck, body: { studentId: 's1', fromDate: '2026-12-01', toDate: '2026-12-01', reason: 'thử' },
  });
  check('đường GHI cũng bị chặn (POST /api/leave → 403)', ghi.status === 403, ghi.status);

  // Đặt mật khẩu riêng xong thì mở hết, không phải đăng nhập lại.
  const dat = await req('POST', '/api/auth/set-new-password', { cookie: ck, body: { newPassword: 'giadinh2026' } });
  check('đặt được mật khẩu mới', dat.status === 200, dat.data);
  const sau = await req('GET', '/api/students/s1', { cookie: ck });
  check('đặt xong: /api/students/s1 → 200, đúng bé của mình', sau.status === 200 && sau.data?.id === 's1', sau.status);
  check('đặt xong: /api/albums → 200', (await req('GET', '/api/albums', { cookie: ck })).status === 200);
}

// ===========================================================================
console.log('\n[2] Đăng xuất được khi còn mật khẩu tạm');
{
  const vao = await login('qt_dau_tien', mkQT);
  check('quản trị đầu tiên (create-admin) đăng nhập được', vao.status === 200 && vao.data?.user?.mustChangePassword === true, vao.data?.user);
  const ra = await req('POST', '/api/auth/logout', { cookie: vao.cookie });
  check('đăng xuất được', ra.status === 200, ra.status);
  check('sau đăng xuất phiên hết dùng được', (await req('GET', '/api/auth/me', { cookie: vao.cookie })).status === 401);
}

// ===========================================================================
console.log('\n[3] Luồng cài mới: quản trị đầu tiên đặt mật khẩu rồi dùng được Quản trị');
{
  const vao = await login('qt_dau_tien', mkQT);
  const ck = vao.cookie;
  const truoc = await req('GET', '/api/admin/campuses', { cookie: ck });
  check('trước khi đặt mật khẩu: /api/admin/campuses → 403', truoc.status === 403, truoc.status);
  const dat = await req('POST', '/api/auth/set-new-password', { cookie: ck, body: { newPassword: 'quantri2026' } });
  check('đặt được mật khẩu mới', dat.status === 200, dat.data);
  const sau = await req('GET', '/api/admin/campuses', { cookie: ck });
  check('sau khi đặt: /api/admin/campuses → 200', sau.status === 200, sau.status);
  const lai = await login('qt_dau_tien', 'quantri2026');
  check('đăng nhập lại bằng mật khẩu mới, không còn bị bắt đổi',
    lai.status === 200 && lai.data?.user?.mustChangePassword === false, lai.data?.user?.mustChangePassword);
}

// ===========================================================================
console.log('\n[4] Tài khoản không còn mật khẩu tạm: không đổi gì');
{
  const co = await login('giaovien', '123456');
  check('cô đăng nhập được', co.status === 200 && co.data?.user?.mustChangePassword === false);
  check('cô gọi /api/students → 200', (await req('GET', '/api/students', { cookie: co.cookie })).status === 200);
  check('chưa đăng nhập vẫn là 401, không phải 403', (await req('GET', '/api/students')).status === 401);
}

// ===========================================================================
console.log('\n[5] Gia đình được trường cấp lại mật khẩu: chưa đặt thì chỉ thấy màn đặt mật khẩu; đặt xong dùng như cũ');
{
  daDoiMatKhau(DIR, 'qt_hai');
  const qt = await login('qt_hai', mkQT2);
  const cap = await req('POST', '/api/accounts/p2/reset-password', { cookie: qt.cookie });
  check('quản trị cấp mật khẩu tạm cho gia đình phuhuynh2', cap.status === 200 && !!cap.data?.temporaryPassword, cap.data);

  const vao = await login('phuhuynh2', cap.data?.temporaryPassword);
  const ck = vao.cookie;
  check('gia đình đăng nhập bằng mật khẩu tạm, máy chủ báo phải đặt mật khẩu',
    vao.status === 200 && vao.data?.user?.mustChangePassword === true, vao.data?.user);

  // Tệp tĩnh và /healthz không nằm sau /api: phải mở được, kể cả khi trình
  // duyệt đang gửi kèm phiên mật khẩu tạm (service worker tải vỏ app lúc này).
  for (const d of ['/healthz', '/sw.js', '/js/app.js', '/js/views/setpassword.js', '/']) {
    const r = await fetch(sv.BASE + d, { headers: { Cookie: ck } });
    check(`${d} → 200 dù phiên còn mật khẩu tạm`, r.status === 200, r.status);
  }
  const dk = { subscription: { endpoint: 'https://day.example.invalid/may-gia-dinh-2', keys: { p256dh: 'k', auth: 'k' } } };
  check('chưa đặt mật khẩu: bật thông báo đẩy → 403',
    (await req('POST', '/api/push/dang-ky', { cookie: ck, body: dk })).status === 403);
  check('chưa đặt mật khẩu: trang chủ (/api/dashboard/badges) → 403',
    (await req('GET', '/api/dashboard/badges', { cookie: ck })).status === 403);

  const dat = await req('POST', '/api/auth/set-new-password', { cookie: ck, body: { newPassword: 'giadinh2027' } });
  check('đặt được mật khẩu mới', dat.status === 200, dat.data);
  const me = await req('GET', '/api/auth/me', { cookie: ck });
  check('cùng phiên đó: /api/auth/me báo không còn phải đổi', me.status === 200 && me.data?.user?.mustChangePassword === false, me.data?.user);
  const be = await req('GET', '/api/students', { cookie: ck });
  check('trang chủ gia đình: /api/students → 200, chỉ bé của nhà mình',
    be.status === 200 && Array.isArray(be.data) && be.data.length > 0 && be.data.every(s => s.id !== 's1'), be.data);
  check('trang chủ gia đình: /api/dashboard/badges → 200', (await req('GET', '/api/dashboard/badges', { cookie: ck })).status === 200);
  const bat = await req('POST', '/api/push/dang-ky', { cookie: ck, body: dk });
  check('đặt xong: bật thông báo đẩy → 200', bat.status === 200 && bat.data?.ok === true, bat.data);
  const dongBo = await req('POST', '/api/push/dong-bo', { cookie: ck, body: { endpoint: dk.subscription.endpoint } });
  check('đặt xong: nối đăng ký đẩy với phiên đang dùng → còn đăng ký', dongBo.status === 200 && dongBo.data?.conDangKy === true, dongBo.data);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
