// Bài canh KHỐI THÔNG TIN TRƯỜNG ĐI RA CHO AI (Đ165).
//
// Chạy bằng:  npm run test:khoi-truong
//
// VÌ SAO CÓ BÀI NÀY
//
// `settings.school` là một khối JSON **tự do**: thêm một khoá vào đó chỉ cần
// `db.setSchool({ ...t, khoaMoi: ... })`, và đã có ba chỗ trong app làm đúng
// như vậy — chuyển năm học, email kế toán (Đ161), và khôi phục bản sao lưu.
//
// Trước đợt này `/api/auth/me` trải TRỌN khối ấy ra cho MỌI tài khoản đăng
// nhập: cô, gia đình, bảo vệ cổng, cả bốn chức vụ Cấp 2.
//
// Hôm nay trong khối không có gì bí mật, nên đó KHÔNG phải một chỗ rò đang
// chảy. Nó là một CÁNH CỬA MỞ SẴN. Ngày ai đó cất vào đấy một khoá nhạy cảm —
// một địa chỉ nội bộ, một khoá ký, một ghi chú của ban giám hiệu — thì khoá ấy
// đi thẳng tới điện thoại của vài trăm gia đình ngay lần đăng nhập kế tiếp, và
// KHÔNG một bộ canh nào báo, vì không một dòng mã nào thay đổi. Đó đúng là
// hạng lỗi khó thấy nhất: nó không nằm trong diff của ai cả.
//
// Bài này đóng cửa ấy lại và canh để nó không mở lại:
//
//   [1] Khoá lạ cất vào khối KHÔNG đi ra với bất kỳ vai nào.
//   [2] Mọi khoá đang dùng thật thì VẪN đi ra — Nguyên tắc số 1, màn hình
//       không được mất một chữ nào.
//   [3] Danh sách cho phép nằm trong mã và chỉ liệt kê đúng những khoá ấy.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('khoi-truong');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Quản trị', 'kt_qt');

const CSDL = path.join(DIR, 'school.db');

// Cất một khoá LẠ vào khối, đúng cách mà một đợt làm sau này sẽ cất.
function catKhoaLa() {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare("SELECT value FROM settings WHERE key = 'school'").get();
    const o = JSON.parse(r.value);
    o.ghiChuNoiBo = 'BI-MAT-CUA-BAN-GIAM-HIEU-2026';
    o.khoaKy = 'kk_9f3a21c0';
    conn.prepare("UPDATE settings SET value = ? WHERE key = 'school'").run(JSON.stringify(o));
    return Object.keys(o);
  } finally { conn.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4815), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const khoaTrongKhoi = catKhoaLa();
  check('dựng được tình huống — khối thông tin trường nay CÓ chứa khoá lạ',
    khoaTrongKhoi.includes('ghiChuNoiBo') && khoaTrongKhoi.includes('khoaKy'), khoaTrongKhoi);

  const d = await login('kt_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('kt_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  const me = async (cookie) => (await req('GET', '/api/auth/me', { cookie })).data;

  // =========================================================================
  console.log('\n[1] Khoá lạ KHÔNG đi ra với bất kỳ vai nào');
  {
    for (const [ten, cookie] of [['quản trị', QT], ['cô', GV], ['gia đình', PH]]) {
      const g = await me(cookie);
      const tho = JSON.stringify(g.school || {});
      check(`${ten} — khối thông tin trường KHÔNG mang ghi chú nội bộ`,
        !/ghiChuNoiBo|BI-MAT/.test(tho), tho.slice(0, 200));
      check(`${ten} — và KHÔNG mang khoá ký`,
        !/khoaKy|kk_9f3a21c0/.test(tho), tho.slice(0, 200));
    }

    // Và không đi ra ở BẤT KỲ chỗ nào khác trong cả gói `me`, không riêng
    // khối trường — nếu một đợt sau ghép khối ấy vào chỗ khác thì bài này đỏ.
    const caGoi = JSON.stringify(await me(PH));
    check('cả gói /api/auth/me của gia đình KHÔNG chứa một chữ nào của khoá lạ',
      !/BI-MAT|kk_9f3a21c0/.test(caGoi), caGoi.length);
  }

  // =========================================================================
  console.log('\n[2] Nguyên tắc số 1 — mọi khoá đang dùng thật VẪN đi ra');
  {
    const g = await me(PH);
    const t = g.school || {};
    check('tên trường vẫn có', typeof t.name === 'string' && t.name.length > 0, t.name);
    check('địa chỉ vẫn có', t.address !== undefined, t.address);
    check('điện thoại vẫn có', t.phone !== undefined, t.phone);
    check('email vẫn có', t.email !== undefined, t.email);
    check('năm học hiện tại vẫn có — màn hình dựa vào nó', !!t.currentYear, t.currentYear);
    check('danh sách cơ sở vẫn có — ô chọn bé theo cấp dựa vào nó',
      Array.isArray(t.coSo) && t.coSo.length > 0, (t.coSo || []).length);
    check('và mỗi cơ sở có đủ mã + tên',
      (t.coSo || []).every(c => c.id && c.name), t.coSo);
  }

  // =========================================================================
  console.log('\n[3] Danh sách cho phép nằm trong mã, và nói ra tên từng khoá');
  {
    const src = fs.readFileSync(path.join(GOC, 'routes/auth.js'), 'utf8');
    // Bỏ dòng chú thích trước khi soi: chú thích của bản vá có chép lại nguyên
    // câu cũ để kể vì sao nó sai, và soi cả chú thích thì bài canh bắt nhầm
    // đúng lời giải thích của bản vá.
    const ma = src.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('có hằng danh sách khoá cho phép', /KHOA_TRUONG_CHO_PHEP\s*=/.test(ma), 'auth.js');
    check('và gói me KHÔNG còn trải trọn khối bằng dấu ba chấm',
      !/\{ \.\.\.truong, coSo \}/.test(ma), 'auth.js');

    // Đối chứng: hằng ấy phải liệt kê đủ những khoá mục [2] vừa đòi. Thiếu một
    // cái là màn hình mất một dòng mà mục [2] sẽ bắt được — nhưng nói ra ở đây
    // thì người sửa biết ngay phải thêm vào đâu.
    const khoi = ma.slice(ma.indexOf('KHOA_TRUONG_CHO_PHEP'), ma.indexOf('KHOA_TRUONG_CHO_PHEP') + 400);
    for (const k of ['name', 'address', 'phone', 'email', 'currentYear', 'years', 'emailKeToan']) {
      check(`danh sách có khoá "${k}"`, khoi.includes(`'${k}'`), khoi.slice(0, 200));
    }

    // PHÉP THỬ NGƯỢC — chạy đúng cách lọc trên một khối giả có khoá lạ.
    const CHO_PHEP = ['name', 'address', 'phone', 'email', 'currentYear', 'years', 'emailKeToan'];
    const khoiGia = { name: 'Trường', khoaKy: 'bi-mat', currentYear: '2026-2027' };
    const loc = {};
    for (const k of CHO_PHEP) if (khoiGia[k] !== undefined) loc[k] = khoiGia[k];
    check('phép thử ngược — cách lọc này GIỮ khoá hợp lệ và BỎ khoá lạ',
      loc.name === 'Trường' && loc.currentYear === '2026-2027' && loc.khoaKy === undefined, loc);
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Khối thông tin trường đi ra cho ai (Đ165)');
