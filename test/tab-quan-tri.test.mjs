// Bài canh DẢI TAB CỦA MÀN QUẢN TRỊ theo chức vụ (L6 — góp ý 20/10, mục 12).
//
// Chạy bằng:  node test/tab-quan-tri.test.mjs
//
// `/api/auth/me` (và gói trả về sau đăng nhập) có thêm `user.tabQuanTri`:
// danh sách mã tab mà tài khoản quản trị ấy thấy, theo bảng ở
// lib/tab-quan-tri.js. Hai điều canh ở đây:
//
//   1. Mỗi chức vụ nhận đúng danh sách tab của mình.
//   2. NGUYÊN TẮC SỐ 1: tệp lib/tab-quan-tri.js hỏng (lỗi cú pháp, ném lỗi lúc
//      chạy, hay bị xoá) thì máy chủ vẫn khởi động, vẫn đăng nhập được, trường
//      mới trả `null` (màn hình vẽ đủ tab như cũ) và mọi trường khác giữ nguyên.
//
// Phần 2 SỬA THẲNG tệp trong kho mã rồi hoàn tác, theo đúng khuôn của
// test/co-lap-loi.test.mjs: móc dọn ở exit, SIGINT, SIGTERM và SIGHUP.
import fs from 'fs';
import path from 'path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const TEP = path.join(GOC, 'lib', 'tab-quan-tri.js');

// --- dọn dẹp: dù bài hỏng giữa chừng cũng phải trả tệp về nguyên trạng.
const capCuu = [];
const hoanTac = () => { while (capCuu.length) { try { capCuu.pop()(); } catch { /* đã dọn */ } } };
process.on('exit', hoanTac);
process.on('SIGINT', () => { hoanTac(); process.exit(1); });
process.on('SIGTERM', () => { hoanTac(); process.exit(1); });
process.on('SIGHUP', () => { hoanTac(); process.exit(1); });
const goc = fs.existsSync(TEP) ? fs.readFileSync(TEP, 'utf8') : null;
capCuu.push(() => {
  if (goc === null) fs.rmSync(TEP, { force: true });
  else fs.writeFileSync(TEP, goc);
});

const DIR = thuMucTam('tab-quan-tri');
sinhDuLieu(DIR);
const NGUOI = [
  // [tên đăng nhập, họ tên, chức vụ, cơ sở]
  ['bgh', 'Hiệu Trưởng', null, null],
  ['bghht', 'Hiệu Trưởng Hai', 'hieu-truong', null],
  ['qlcs1', 'Quản lý CS1', 'quanly-coso', 'cs1'],
  ['khoacs2', 'Quản trị khoá CS2', null, 'cs2'],
  ['vpcs1', 'Văn phòng CS1', 'vanphong-coso', 'cs1'],
  ['nhansu1', 'Nhân sự', 'nhansu', null],
  ['ketoan1', 'Kế toán', 'ketoan', null],
  ['mkt1', 'Marketing', 'marketing', null],
  ['baove1', 'Bảo vệ CS1', 'baove', 'cs1'],
];
const mk = {};
for (const [u, ten, cv, cs] of NGUOI) {
  mk[u] = taoQuanTri(DIR, ten, u);
  if (cs) khoaVaoCoSo(DIR, u, cs);
  if (cv) datChucVu(DIR, u, cv);
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4671), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
for (const [u] of NGUOI) {
  const d = await login(u, mk[u]);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
}

const TAT_CA = ['taikhoan', 'thongtin', 'motngay', 'danhgia', 'coso', 'quantam', 'tinhnang', 'namhoc', 'nhatky'];
const MONG = {
  bgh: TAT_CA,
  bghht: TAT_CA,
  qlcs1: ['taikhoan', 'thongtin', 'motngay', 'danhgia', 'quantam', 'namhoc', 'nhatky'],
  khoacs2: ['taikhoan', 'thongtin', 'motngay', 'danhgia', 'quantam', 'namhoc', 'nhatky'],
  vpcs1: ['taikhoan', 'thongtin', 'motngay', 'quantam', 'nhatky'],
  nhansu1: ['taikhoan', 'thongtin'],
  ketoan1: [],
  mkt1: [],
  baove1: [],
};
const MAT_KHAU = (u) => (mk[u] ? 'quantri2026' : '123456');
const me = async (u) => {
  const l = await login(u, MAT_KHAU(u));
  if (l.status !== 200) return { login: l, me: null };
  return { login: l, me: await req('GET', '/api/auth/me', { cookie: l.cookie }) };
};

async function phaTep(noiDung) {
  if (noiDung === null) fs.rmSync(TEP, { force: true });
  else fs.writeFileSync(TEP, noiDung);
  await sv.khoiDongLai();
}

try {
  // =========================================================================
  console.log('\n[1] Mỗi chức vụ nhận đúng danh sách tab');
  for (const [u, mong] of Object.entries(MONG)) {
    const { login: l, me: m } = await me(u);
    check(`${u}: đăng nhập được`, l.status === 200, l.status);
    check(`${u}: gói đăng nhập có đúng tab`, JSON.stringify(l.data?.user?.tabQuanTri) === JSON.stringify(mong),
      l.data?.user?.tabQuanTri);
    check(`${u}: /api/auth/me có đúng tab`, JSON.stringify(m?.data?.user?.tabQuanTri) === JSON.stringify(mong),
      m?.data?.user?.tabQuanTri);
  }
  for (const u of ['giaovien', 'phuhuynh']) {
    const { me: m } = await me(u);
    check(`${u}: không phải quản trị nên tabQuanTri là null`, m?.status === 200 && m.data.user.tabQuanTri === null,
      m?.data?.user?.tabQuanTri);
  }

  // =========================================================================
  console.log('\n[2] Tệp lib/tab-quan-tri.js hỏng — đăng nhập vẫn chạy');
  const HONG = [
    ['lỗi cú pháp', 'module.exports = {{{ hỏng có chủ ý'],
    ['ném lỗi lúc chạy', "module.exports = { tabQuanTri() { throw new Error('hỏng có chủ ý'); } };"],
    ['bị xoá khỏi kho mã', null],
  ];
  for (const [kieu, noiDung] of HONG) {
    await phaTep(noiDung);
    const { login: l, me: m } = await me('bgh');
    check(`${kieu}: máy chủ vẫn lên và ban giám hiệu đăng nhập được`, l.status === 200 && !!l.cookie, l.status);
    check(`${kieu}: /api/auth/me trả 200`, m?.status === 200, m?.status);
    check(`${kieu}: tabQuanTri là null (màn hình vẽ đủ tab như cũ)`, m?.data?.user?.tabQuanTri === null,
      m?.data?.user?.tabQuanTri);
    check(`${kieu}: các trường khác của gói vẫn đủ`,
      m?.data?.user?.username === 'bgh' && m.data.user.chucVu === null && Array.isArray(m.data.students)
        && m.data.students.length > 0 && Array.isArray(m.data.classes) && !!m.data.school,
      m?.data && Object.keys(m.data));
    const ov = await req('GET', '/api/admin/overview', { cookie: l.cookie });
    check(`${kieu}: màn Quản trị vẫn đọc được số liệu`, ov.status === 200, ov.status);
    const gv = await me('giaovien');
    check(`${kieu}: cô vẫn đăng nhập được`, gv.login.status === 200 && gv.me?.status === 200, gv.login.status);
  }

  // Đối chứng: trả tệp về nguyên trạng thì tab quay lại — phép thử ở trên có nghĩa.
  hoanTac();
  await sv.khoiDongLai();
  const lai = await me('qlcs1');
  check('đối chứng — trả tệp về thì quản lý cơ sở lại nhận đúng tab',
    JSON.stringify(lai.me?.data?.user?.tabQuanTri) === JSON.stringify(MONG.qlcs1), lai.me?.data?.user?.tabQuanTri);
} finally {
  hoanTac();
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Dải tab màn Quản trị theo chức vụ');
