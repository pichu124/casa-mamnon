// Bài canh: CHỐNG DÒ MẬT KHẨU KHÔNG ĐƯỢC THÀNH ĐƯỜNG LÀM MÁY CHỦ HẾT BỘ NHỚ,
// và CẤP LẠI MẬT KHẨU PHẢI GỠ ĐƯỢC KHOÁ THEO TÊN (Đ261j).
//
// Chạy bằng:  TEST_PORT=7451 node test/chong-do-bo-nho.test.mjs
//
// Bộ đếm lần sai (routes/auth.js) giữ tên đăng nhập làm khoá trong bộ nhớ ít
// nhất 15 phút. Bản Đ261b không giới hạn độ dài tên, thân yêu cầu đăng nhập
// được tới 12 MB, và một địa chỉ được sai tới 100 lần: vài chục lượt gửi tên
// đăng nhập cỡ chục MB là đẩy máy chủ 1 GB tới chết, khởi động lại, lặp lại.
//
//   [1] Tên đăng nhập dài (101 ký tự, 10 KB) → 400 ngay, câu tiếng Việt;
//       100 ký tự vẫn là lượt sai bình thường (401).
//   [2] 110 lượt tên 10 KB từ MỘT địa chỉ không được ghi vào bộ đếm: địa chỉ
//       ấy không bị khoá (trần theo địa chỉ là 100), gia đình gõ đúng vẫn vào.
//   [3] Mật khẩu 10 KB → 400, cũng không được đếm.
//   [4] Thân yêu cầu 1 MB ở /api/auth/* bị từ chối (413) ngay, không được đếm.
//   [5] Đặt / đổi mật khẩu từ chối chuỗi quá dài.
//   [6] Tên bị khoá vì người lạ sai 30 lần: cấp lại mật khẩu là gia đình vào
//       được ngay, từ một địa chỉ chưa từng vào đúng — đúng như câu báo hứa.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 7451);
const DIR = thuMucTam('chong-do-bo-nho');
sinhDuLieu(DIR);
const MK_QT = taoQuanTri(DIR, 'Văn Phòng Thử', 'qt_bo_nho');
daDoiMatKhau(DIR, 'qt_bo_nho');
const { BASE, dung } = await dungMayChu({ port: PORT, dir: DIR });

async function goi(duong, body, { ip = '203.0.113.1', cookie } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': ip };
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(`${BASE}${duong}`, {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch { /* không phải JSON */ }
  const sc = r.headers.get('set-cookie');
  return { status: r.status, data, cookie: sc ? sc.split(';')[0] : null };
}
const dangNhap = (ip, username, password) => goi('/api/auth/login', { username, password }, { ip });
const MOT_MB = 'a'.repeat(1024 * 1024);
const MUOI_KB = 'a'.repeat(10 * 1024);

try {
  // =========================================================================
  console.log('\n[1] Tên đăng nhập dài bị từ chối ngay');
  {
    const bd = Date.now();
    const r = await dangNhap('203.0.113.1', MUOI_KB, 'gi-cung-duoc');
    const ms = Date.now() - bd;
    check('tên 10 KB: trả 400, không phải 401/429', r.status === 400, r.status);
    check('câu báo tiếng Việt nói rõ là dài quá', /dài quá/.test(r.data?.error || ''), r.data);
    check('trả lời nhanh (dưới 1 giây)', ms < 1000, ms);
    check('tên 101 ký tự: 400', (await dangNhap('203.0.113.1', 'b'.repeat(101), 'x')).status === 400);
    check('tên 100 ký tự: vẫn là lượt sai bình thường (401)',
      (await dangNhap('203.0.113.1', 'b'.repeat(100), 'x')).status === 401);
  }

  // =========================================================================
  console.log('\n[2] 110 lượt tên dài từ MỘT địa chỉ không được ghi vào bộ đếm');
  {
    const IP = '203.0.113.2';
    const ketQua = [];
    for (let i = 0; i < 110; i++) {
      // Tên khác nhau mỗi lượt: bản cũ thì mỗi lượt là hai khoá MỚI cỡ 1 MB.
      ketQua.push((await dangNhap(IP, `${i}-${MUOI_KB}`, 'sai')).status);
    }
    check('cả 110 lượt đều 400', ketQua.every(s => s === 400), [...new Set(ketQua)]);
    const sai = await dangNhap(IP, 'giadinh-khong-co', 'sai-mat-khau');
    check('lượt sai bình thường sau đó vẫn là 401 — địa chỉ chưa bị khoá', sai.status === 401, sai.status);
    const dung = await dangNhap(IP, 'ph.lan', '123456');
    check('gia đình gõ đúng từ địa chỉ ấy vẫn vào được', dung.status === 200, dung.status);
  }

  // =========================================================================
  console.log('\n[3] Mật khẩu 10 KB bị từ chối, không được đếm');
  {
    const IP = '203.0.113.3';
    const r = await dangNhap(IP, 'ph.huong', MUOI_KB);
    check('trả 400', r.status === 400, r.status);
    // Sai thường 5 lần là khoá cặp; nếu lượt dài đã bị đếm thì lần thứ 5 đã 429.
    const lan = [];
    for (let i = 0; i < 4; i++) lan.push((await dangNhap(IP, 'ph.huong', `sai-${i}`)).status);
    check('bốn lượt sai thường sau đó vẫn là 401 (lượt dài không bị đếm)', lan.every(s => s === 401), lan);
    check('gõ đúng vẫn vào được', (await dangNhap(IP, 'ph.huong', '123456')).status === 200);
  }

  // =========================================================================
  console.log('\n[4] Thân yêu cầu lớn ở /api/auth/* bị từ chối');
  {
    const IP = '203.0.113.4';
    const ketQua = [];
    const bd = Date.now();
    for (let i = 0; i < 30; i++) ketQua.push((await dangNhap(IP, `${i}-${MOT_MB}`, 'sai')).status);
    check('30 lượt tên 1 MB ở đường đăng nhập → 413', ketQua.every(s => s === 413), [...new Set(ketQua)]);
    check('trả lời nhanh (30 lượt dưới 10 giây)', Date.now() - bd < 10000, Date.now() - bd);
    const lan = [];
    for (let i = 0; i < 4; i++) lan.push((await dangNhap(IP, 'phuhuynh', `sai-${i}`)).status);
    check('lượt sai thường sau đó vẫn 401 (lượt bị 413 không được đếm)', lan.every(s => s === 401), lan);
    const nho = await dangNhap(IP, 'phuhuynh', '123456');
    check('thân bình thường vẫn đăng nhập được', nho.status === 200, nho.status);
  }

  // =========================================================================
  console.log('\n[5] Đặt / đổi mật khẩu từ chối chuỗi quá dài');
  {
    const p = await dangNhap('203.0.113.5', 'phuhuynh', '123456');
    const dai = 'a1'.repeat(150); // 300 ký tự
    const doi = await goi('/api/auth/change-password', { currentPassword: '123456', newPassword: dai },
      { ip: '203.0.113.5', cookie: p.cookie });
    check('đổi mật khẩu: mật khẩu mới 300 ký tự → 400, câu tiếng Việt', doi.status === 400 && /dài quá/.test(doi.data?.error || ''),
      doi);
    const doi2 = await goi('/api/auth/change-password', { currentPassword: 'a'.repeat(5000), newPassword: 'matkhau2026' },
      { ip: '203.0.113.5', cookie: p.cookie });
    check('đổi mật khẩu: mật khẩu hiện tại quá dài → 400', doi2.status === 400, doi2);
    check('mật khẩu cũ vẫn dùng được (không đổi gì)', (await dangNhap('203.0.113.5', 'phuhuynh', '123456')).status === 200);

    const qt = await dangNhap('203.0.113.5', 'qt_bo_nho', MK_QT);
    const cap = await goi('/api/accounts/p1/reset-password', {}, { ip: '203.0.113.5', cookie: qt.cookie });
    const tam = await dangNhap('203.0.113.5', 'phuhuynh', cap.data?.temporaryPassword);
    const dat = await goi('/api/auth/set-new-password', { newPassword: dai }, { ip: '203.0.113.5', cookie: tam.cookie });
    check('đặt mật khẩu mới 300 ký tự → 400, câu tiếng Việt', dat.status === 400 && /dài quá/.test(dat.data?.error || ''), dat);
    const datDung = await goi('/api/auth/set-new-password', { newPassword: 'giadinh2026' }, { ip: '203.0.113.5', cookie: tam.cookie });
    check('mật khẩu độ dài bình thường đặt được', datDung.status === 200, datDung);
  }

  // =========================================================================
  console.log('\n[6] Tên bị khoá vì người lạ sai 30 lần: cấp lại mật khẩu là gia đình vào được');
  {
    // 30 lượt sai từ 30 địa chỉ khác nhau, gửi song song (mỗi lượt sau lần
    // thứ 3 phải chờ chậm dần — gửi lần lượt thì mất vài phút).
    await Promise.all(Array.from({ length: 30 }, (_, i) => dangNhap(`198.51.100.${i + 1}`, 'ph.lan', `sai-${i}`)));
    const bi = await dangNhap('192.0.2.77', 'ph.lan', '123456');
    check('đối chứng — tên ph.lan bị khoá theo tên (429) từ địa chỉ lạ', bi.status === 429, bi);
    check('câu báo mời nhờ cô cấp lại mật khẩu', /cấp lại mật khẩu/.test(bi.data?.error || ''), bi.data);

    const qt = await dangNhap('203.0.113.6', 'qt_bo_nho', MK_QT);
    const cap = await goi('/api/accounts/p4/reset-password', {}, { ip: '203.0.113.6', cookie: qt.cookie });
    check('văn phòng cấp lại được mật khẩu', cap.status === 200 && !!cap.data?.temporaryPassword, cap);
    const vao = await dangNhap('192.0.2.77', 'ph.lan', cap.data?.temporaryPassword);
    check('gia đình vào được ngay bằng mật khẩu tạm, từ địa chỉ chưa từng vào đúng', vao.status === 200, vao);
    // Một kẻ trong 30 địa chỉ ấy cũng không được hưởng lợi: khoá theo cặp
    // của hắn đã bị gỡ, nhưng trần theo tên lại đếm từ đầu.
    const ke = await dangNhap('198.51.100.1', 'ph.lan', 'sai-tiep');
    check('lượt sai tiếp sau khi cấp lại là 401 thường', ke.status === 401, ke.status);
  }
} finally {
  dung();
  donThuMucTam(DIR);
}
tongKet();
