// Bài canh: TÀI KHOẢN CÒN MẬT KHẨU TẠM KHÔNG ĐỌC ĐƯỢC HỒ SƠ BÉ QUA /api/auth (Đ261j, O5).
//
// Chạy bằng:  TEST_PORT=7452 node test/mat-khau-tam-goi-toi-thieu.test.mjs
//
// Đ261b chặn mọi API (trừ /api/auth/* và GET /api/modules) cho tài khoản còn
// mật khẩu tạm. Nhưng chính câu trả lời của lượt đăng nhập và của
// /api/auth/me mang theo danh sách bé (tên, ngày sinh, địa chỉ, nhóm máu, dị
// ứng), danh sách cô và mọi nhóm của trường — ai nhặt được tờ giấy mật khẩu tạm
// là đọc được. Nay khi còn mật khẩu tạm, gói ấy chỉ đủ để vẽ màn đặt mật khẩu;
// đặt xong thì /api/auth/me trả đủ như cũ.
//
//   [1] Gia đình: mật khẩu tạm → không bé, không nhóm; đặt xong → đủ.
//   [2] Cô: mật khẩu tạm → không nhóm của cô, không bé; đặt xong → đủ.
//   [3] Quản trị mới (create-admin): không bé, không tab Quản trị; đặt xong → đủ.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoBoDem, taoReq, taoLogin }
  from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('mat-khau-tam-goi');
sinhDuLieu(DIR);
const MK_VP = taoQuanTri(DIR, 'Văn Phòng Thử', 'qt_goi_vp');
daDoiMatKhau(DIR, 'qt_goi_vp');
const MK_MOI = taoQuanTri(DIR, 'Hiệu Trưởng Mới', 'qt_goi_moi');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7452), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// Những thứ về bé tuyệt đối không được có trong gói của mật khẩu tạm.
const BI_MAT = ['Nguyễn Bảo An', 'Nguyễn Bảo Nam', '12 Hoa Phượng', 'Tôm, cua'];
const lo = (goi) => BI_MAT.filter(x => JSON.stringify(goi || {}).includes(x));

function goiToiThieu(ten, goi) {
  check(`${ten}: user.mustChangePassword = true`, goi?.user?.mustChangePassword === true || goi?.user?.mustChangePassword === 1,
    goi?.user);
  check(`${ten}: không có bé nào`, Array.isArray(goi?.students) && goi.students.length === 0, (goi?.students || []).length);
  check(`${ten}: không có nhóm nào`, Array.isArray(goi?.classes) && goi.classes.length === 0, (goi?.classes || []).length);
  check(`${ten}: không có nhóm của cô`, (goi?.user?.nhomCuaCo || []).length === 0 && (goi?.user?.classIds || []).length === 0,
    goi?.user?.nhomCuaCo);
  check(`${ten}: không lộ tên, địa chỉ, dị ứng của bé`, lo(goi).length === 0, lo(goi));
  check(`${ten}: vẫn có tên hiển thị và vai để vẽ màn đặt mật khẩu`, !!goi?.user?.name && !!goi?.user?.role, goi?.user);
}

async function capLai(id) {
  const vp = await login('qt_goi_vp', MK_VP);
  const r = await req('POST', `/api/accounts/${id}/reset-password`, { cookie: vp.cookie });
  return r.data?.temporaryPassword;
}

try {
  // =========================================================================
  console.log('\n[1] Gia đình dùng mật khẩu tạm');
  {
    const tam = await capLai('p1');
    const l = await login('phuhuynh', tam);
    check('đăng nhập được bằng mật khẩu tạm', l.status === 200, l.status);
    goiToiThieu('gói đăng nhập', l.data);
    const me = await req('GET', '/api/auth/me', { cookie: l.cookie });
    goiToiThieu('/api/auth/me', me.data);
    check('không lộ số điện thoại, email của tài khoản', !('phone' in (me.data?.user || {})) && !('email' in (me.data?.user || {})),
      me.data?.user);

    const dat = await req('POST', '/api/auth/set-new-password', { cookie: l.cookie, body: { newPassword: 'giadinh2026' } });
    check('đặt mật khẩu mới được', dat.status === 200, dat);
    const me2 = await req('GET', '/api/auth/me', { cookie: l.cookie });
    const ten = (me2.data?.students || []).map(s => s.name);
    check('đặt xong: /me có đủ hai bé', ten.includes('Nguyễn Bảo An') && ten.includes('Nguyễn Bảo Nam'), ten);
    check('đặt xong: có danh sách nhóm của trường', (me2.data?.classes || []).length > 0);
    check('đặt xong: hồ sơ bé đủ như cũ (địa chỉ)', (me2.data?.students || []).some(s => s.address === '12 Hoa Phượng, Q. Phú Nhuận'));
  }

  // =========================================================================
  console.log('\n[2] Cô dùng mật khẩu tạm');
  {
    const tam = await capLai('t1');
    const l = await login('giaovien', tam);
    check('đăng nhập được bằng mật khẩu tạm', l.status === 200, l.status);
    goiToiThieu('gói đăng nhập của cô', l.data);
    const dat = await req('POST', '/api/auth/set-new-password', { cookie: l.cookie, body: { newPassword: 'coGiao2026' } });
    check('đặt mật khẩu mới được', dat.status === 200, dat);
    const me = await req('GET', '/api/auth/me', { cookie: l.cookie });
    check('đặt xong: cô có nhóm của mình', (me.data?.user?.nhomCuaCo || []).length > 0 && (me.data?.user?.classIds || []).length > 0,
      me.data?.user?.nhomCuaCo);
    check('đặt xong: có bé của nhóm', (me.data?.students || []).length > 0);
  }

  // =========================================================================
  console.log('\n[3] Quản trị mới tạo bằng create-admin');
  {
    const l = await login('qt_goi_moi', MK_MOI);
    check('đăng nhập được', l.status === 200, l.status);
    goiToiThieu('gói của quản trị mới', l.data);
    check('chưa có tab Quản trị', !l.data?.user?.tabQuanTri, l.data?.user?.tabQuanTri);
    const dat = await req('POST', '/api/auth/set-new-password', { cookie: l.cookie, body: { newPassword: 'quantri2026' } });
    check('đặt mật khẩu mới được', dat.status === 200, dat);
    const me = await req('GET', '/api/auth/me', { cookie: l.cookie });
    check('đặt xong: thấy bé của trường', (me.data?.students || []).length > 0);
    check('đặt xong: có tab Quản trị', Array.isArray(me.data?.user?.tabQuanTri) && me.data.user.tabQuanTri.length > 0,
      me.data?.user?.tabQuanTri);
    check('đặt xong: mustChangePassword đã tắt', !me.data?.user?.mustChangePassword, me.data?.user?.mustChangePassword);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
