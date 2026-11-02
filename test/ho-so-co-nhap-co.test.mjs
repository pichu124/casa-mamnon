// Bài canh HỒ SƠ CÔ CƠ BẢN và NHẬP CÔ TỪ TỆP (L2 — góp ý 20/10, mục 12).
//
// Chạy bằng:  node test/ho-so-co-nhap-co.test.mjs
//
// Hai việc mới dưới `/api/admin/teachers/...`:
//
//   1. Hồ sơ cô cơ bản (ngày sinh, CCCD, số điện thoại, chỗ ở) đọc và ghi ĐÚNG
//      dòng `nhansu_ho_so` của phân hệ Nhân sự — một nguồn dữ liệu. Danh sách
//      không bao giờ có CCCD và chỗ ở; màn chi tiết có, và mở ra là có nhật ký.
//      Văn phòng cơ sở chỉ xem (chủ dự án chốt 02/11). Tắt Nhân sự là không
//      đọc, không ghi.
//   2. Nhập cô hàng loạt từ CSV, cùng khuôn với nhập bé: tệp hỏng phông bị từ
//      chối, một dòng hỏng thì không ghi gì, dòng trùng mặc định bỏ qua, quản
//      lý cơ sở nhập thì cô thuộc đúng cơ sở của họ, cấp 1 ghi cột Cơ sở mà
//      không ghi Nhóm thì cô vẫn thuộc cơ sở ấy (chủ dự án chốt 02/11).
//
// Mỗi quyền canh cả hai chiều: người được làm thì làm được, người còn lại thì
// không — và "không" phải đúng tới tận cơ sở dữ liệu, không chỉ ở mã trả về.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ho-so-co-nhap-co');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu']);
const mk = {
  bgh: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  ql1: taoQuanTri(DIR, 'Quản lý CS1', 'quanly1'),
  ql2: taoQuanTri(DIR, 'Quản lý CS2', 'quanly2'),
  vp1: taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
  kt: taoQuanTri(DIR, 'Kế toán', 'ketoan1'),
  ql0: taoQuanTri(DIR, 'Quản lý chưa gắn cơ sở', 'quanly0'),
};
khoaVaoCoSo(DIR, 'quanly1', 'cs1'); datChucVu(DIR, 'quanly1', 'quanly-coso');
khoaVaoCoSo(DIR, 'quanly2', 'cs2'); datChucVu(DIR, 'quanly2', 'quanly-coso');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1'); datChucVu(DIR, 'vanphong1', 'vanphong-coso');
datChucVu(DIR, 'nhansu1', 'nhansu');
datChucVu(DIR, 'ketoan1', 'ketoan');
datChucVu(DIR, 'quanly0', 'quanly-coso');   // cố ý KHÔNG khoá cơ sở

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7311), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
function docDb(sql, ...thamSo) {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return d.prepare(sql).all(...thamSo); } finally { d.close(); }
}
const demCo = () => docDb("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'")[0].n;
const coTheoTen = (ten) => docDb("SELECT * FROM users WHERE role = 'teacher' AND name = ?", ten)[0];

const BGH = await vao('hieutruong', mk.bgh);
const QL1 = await vao('quanly1', mk.ql1);
const QL2 = await vao('quanly2', mk.ql2);
const VP1 = await vao('vanphong1', mk.vp1);
const NS = await vao('nhansu1', mk.ns);
const KT = await vao('ketoan1', mk.kt);
const QL0 = await vao('quanly0', mk.ql0);
const GV = (await login('giaovien', '123456')).cookie;   // t1, Chồi 2 — cơ sở 1
const PH = (await login('phuhuynh', '123456')).cookie;

const DS = '/api/admin/teachers/ho-so-co-ban';
const HS = (id) => `/api/admin/teachers/${id}/ho-so-co-ban`;
const ids = (r) => (r.data?.danhSach || []).map(x => x.userId);

try {
  // =========================================================================
  console.log('\n[1] Danh sách hồ sơ cô: ai mở được, thấy cô nào');
  {
    // Quản lý cơ sở chưa gắn cơ sở nào: phạm vi rơi về cả trường — không được
    // vì thế mà đọc CCCD của cô cả ba cơ sở.
    const q0 = await req('GET', DS, { cookie: QL0 });
    check('quản lý cơ sở CHƯA gắn cơ sở → 403 ở danh sách', q0.status === 403, q0.status);
    const q0ct = await req('GET', HS(coTheoTen('Nguyễn Thị Mai Anh')?.id || 't1'), { cookie: QL0 });
    check('… và 403 ở màn chi tiết (không lộ CCCD)', q0ct.status === 403 && !JSON.stringify(q0ct.data || {}).includes('cccd'), q0ct.status);
    const q0sua = await req('PUT', HS('t1'), { cookie: QL0, body: { dienThoai: '0900000000' } });
    check('… và 403 khi sửa', q0sua.status === 403, q0sua.status);
    const bgh = await req('GET', DS, { cookie: BGH });
    check('ban giám hiệu mở được danh sách', bgh.status === 200, bgh.status);
    check('ban giám hiệu thấy cô cả hai cơ sở (t1 cơ sở 1, t6 cơ sở 2)',
      ids(bgh).includes('t1') && ids(bgh).includes('t6'), ids(bgh));
    check('danh sách không có phụ huynh hay tài khoản quản trị',
      ids(bgh).length > 0 && ids(bgh).every(id => /^t/.test(id)), ids(bgh));
    check('ban giám hiệu được báo là sửa được', bgh.data?.suaDuoc === true, bgh.data?.suaDuoc);

    const ql1 = await req('GET', DS, { cookie: QL1 });
    check('quản lý cơ sở 1 thấy cô cơ sở 1, KHÔNG thấy cô cơ sở 2',
      ql1.status === 200 && ids(ql1).includes('t1') && !ids(ql1).includes('t6'), ids(ql1));
    const ql2 = await req('GET', DS, { cookie: QL2 });
    check('quản lý cơ sở 2 thấy cô cơ sở 2, KHÔNG thấy cô cơ sở 1',
      ql2.status === 200 && ids(ql2).includes('t6') && !ids(ql2).includes('t1'), ids(ql2));
    const vp = await req('GET', DS, { cookie: VP1 });
    check('văn phòng cơ sở 1 xem được, chỉ cô cơ sở 1',
      vp.status === 200 && ids(vp).includes('t1') && !ids(vp).includes('t6'), ids(vp));
    check('văn phòng được báo là KHÔNG sửa được', vp.data?.suaDuoc === false, vp.data?.suaDuoc);
    const ns = await req('GET', DS, { cookie: NS });
    check('Nhân sự thấy cô cả trường',
      ns.status === 200 && ids(ns).includes('t1') && ids(ns).includes('t6'), ids(ns));

    for (const [ten, ck] of [['Kế toán', KT], ['cô', GV], ['phụ huynh', PH]]) {
      const r = await req('GET', DS, { cookie: ck });
      check(`${ten} KHÔNG mở được danh sách hồ sơ cô`, r.status === 403, r.status);
    }
  }

  // =========================================================================
  console.log('\n[2] Sửa hồ sơ: ghi đúng dòng của Nhân sự, đúng người được sửa');
  {
    const ghi = await req('PUT', HS('t1'), {
      cookie: BGH,
      body: { ngaySinh: '1990-05-12', cccd: '012345678901', dienThoai: '0903 111 222', choO: '12 Hoa Sứ, Phú Nhuận' },
    });
    check('ban giám hiệu sửa được hồ sơ cô t1', ghi.status === 200, ghi.data);
    const dong = docDb('SELECT * FROM nhansu_ho_so WHERE userId = ?', 't1')[0] || {};
    check('ghi vào đúng dòng nhansu_ho_so (một nguồn dữ liệu)',
      dong.ngaySinh === '1990-05-12' && dong.cccd === '012345678901'
        && dong.dienThoai === '0903 111 222' && dong.choO === '12 Hoa Sứ, Phú Nhuận', dong);
    const qua = await req('GET', '/api/nhansu/ho-so/t1', { cookie: BGH });
    check('màn Nhân sự đọc ra đúng con số vừa ghi', qua.data?.hoSo?.cccd === '012345678901', qua.data?.hoSo);

    const demXem = async () => ((await req('GET', '/api/admin/audit', { cookie: BGH })).data || [])
      .filter(r => r.action === 'nhansu-xem-ho-so' && r.target === 't1').length;
    const xemTruoc = await demXem();
    const ct = await req('GET', HS('t1'), { cookie: BGH });
    check('màn chi tiết trả đủ bốn ô',
      ct.status === 200 && ct.data?.ngaySinh === '1990-05-12' && ct.data?.cccd === '012345678901'
        && ct.data?.dienThoai === '0903 111 222' && ct.data?.choO === '12 Hoa Sứ, Phú Nhuận', ct.data);
    check('màn chi tiết có tên cô', /Mai Anh/.test(ct.data?.hoTen || ''), ct.data?.hoTen);

    const ds = await req('GET', DS, { cookie: BGH });
    const t1 = (ds.data?.danhSach || []).find(x => x.userId === 't1') || {};
    check('danh sách có ngày sinh của t1', t1.ngaySinh === '1990-05-12', t1);
    const tho = JSON.stringify(ds.data);
    check('danh sách KHÔNG BAO GIỜ có CCCD hay chỗ ở',
      ds.status === 200 && !/cccd|choO/i.test(tho) && !tho.includes('012345678901') && !tho.includes('Hoa Sứ'), tho.slice(0, 200));

    check('mở màn chi tiết thì có thêm đúng một dòng nhật ký "nhansu-xem-ho-so" cho cô ấy',
      (await demXem()) === xemTruoc + 1, { truoc: xemTruoc });
    const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
    check('nhật ký KHÔNG chứa số CCCD', !JSON.stringify(nk).includes('012345678901'));

    const ql1 = await req('PUT', HS('t1'), { cookie: QL1, body: { choO: '30 Phan Xích Long' } });
    check('quản lý cơ sở 1 sửa được cô cơ sở mình', ql1.status === 200, ql1.data);
    const sau = docDb('SELECT * FROM nhansu_ho_so WHERE userId = ?', 't1')[0] || {};
    check('chỉ ô được gửi bị đổi, ô khác giữ nguyên',
      sau.choO === '30 Phan Xích Long' && sau.cccd === '012345678901' && sau.ngaySinh === '1990-05-12', sau);

    const ngoai = await req('PUT', HS('t6'), { cookie: QL1, body: { choO: 'Sửa lén' } });
    check('quản lý cơ sở 1 KHÔNG sửa được cô cơ sở 2 (404, không lộ sự tồn tại)', ngoai.status === 404, ngoai.status);
    const xemNgoai = await req('GET', HS('t6'), { cookie: QL1 });
    check('và không mở được màn chi tiết của cô ấy', xemNgoai.status === 404, xemNgoai.status);
    check('không có dòng nào được ghi cho t6', !docDb('SELECT 1 FROM nhansu_ho_so WHERE userId = ?', 't6').length);

    const vpXem = await req('GET', HS('t1'), { cookie: VP1 });
    check('văn phòng cơ sở 1 xem được chi tiết cô cơ sở mình', vpXem.status === 200 && vpXem.data?.choO === '30 Phan Xích Long', vpXem.data);
    const vpSua = await req('PUT', HS('t1'), { cookie: VP1, body: { choO: 'VP sửa' } });
    check('văn phòng KHÔNG sửa được (chỉ xem)', vpSua.status === 403, vpSua.status);
    check('và dữ liệu giữ nguyên',
      (docDb('SELECT choO FROM nhansu_ho_so WHERE userId = ?', 't1')[0] || {}).choO === '30 Phan Xích Long');

    const ns = await req('PUT', HS('t6'), { cookie: NS, body: { cccd: '987654321' } });
    check('Nhân sự sửa được cô bất kỳ cơ sở nào (CCCD 9 số được nhận)', ns.status === 200, ns.data);

    for (const [ten, ck] of [['Kế toán', KT], ['cô', GV]]) {
      const r = await req('PUT', HS('t1'), { cookie: ck, body: { choO: 'x' } });
      check(`${ten} KHÔNG sửa được`, r.status === 403, r.status);
    }

    const sai = [
      [{ ngaySinh: '12/13/1990' }, 'ngày sinh sai dạng'],
      [{ ngaySinh: '1990-02-30' }, 'ngày sinh không có thật'],
      [{ cccd: '12345' }, 'CCCD 5 số'],
      [{ cccd: '0123456789012' }, 'CCCD 13 số'],
      [{ cccd: '01234567890a' }, 'CCCD có chữ'],
    ];
    for (const [body, ten] of sai) {
      const r = await req('PUT', HS('t1'), { cookie: BGH, body });
      check(`từ chối ${ten} (400, câu tiếng Việt)`, r.status === 400 && /[à-ỹ]/i.test(r.data?.error || ''), r.data);
    }
    check('lượt bị từ chối không làm đổi gì',
      (docDb('SELECT cccd FROM nhansu_ho_so WHERE userId = ?', 't1')[0] || {}).cccd === '012345678901');

    const ph = await req('PUT', HS('p1'), { cookie: BGH, body: { choO: 'x' } });
    check('mã của phụ huynh → 404', ph.status === 404, ph.status);
  }

  // =========================================================================
  console.log('\n[3] Tệp mẫu nhập cô');
  {
    const tai = async (ck) => {
      const r = await fetch(`${sv.BASE}/api/admin/teachers/nhap/mau`, { headers: { Cookie: ck } });
      return { status: r.status, text: await r.text() };
    };
    const bgh = await tai(BGH);
    check('ban giám hiệu tải được tệp mẫu', bgh.status === 200, bgh.status);
    const dau = bgh.text.replace(/^﻿/, '').split(/\r?\n/)[0];
    check('tệp mẫu có các cột Họ tên, Điện thoại, Cơ sở, Nhóm, Vai',
      ['Họ tên', 'Điện thoại', 'Cơ sở', 'Nhóm', 'Vai'].every(c => dau.includes(c)), dau);
    const ql2 = await tai(QL2);
    check('tệp mẫu của quản lý cơ sở 2 điền sẵn tên cơ sở của họ',
      ql2.status === 200 && ql2.text.includes('Cơ sở 2'), ql2.text.slice(0, 300));
    const vp = await tai(VP1);
    check('văn phòng KHÔNG tải tệp mẫu nhập cô', vp.status === 403, vp.status);
  }

  // =========================================================================
  console.log('\n[4] Ban giám hiệu nhập cô: vai, cơ sở, dòng trùng');
  const DAU = 'Họ tên,Điện thoại,Email,Ngày sinh,CCCD,Cơ sở,Nhóm,Vai';
  {
    const tep = [DAU,
      'Cô Nhập Một,0911 000 001,,,,Cơ sở 1,Chồi 2,Cambridge',
      'Cô Nhập Hai,0911000002,,,,Cơ sở 2,,',
      'Cô Trùng Số,0903.111.222,,,,Cơ sở 1,,',
      'Cô Nhập Bốn,0911000004,,15/03/1992,001234567,Cơ sở 1,Lá 1,P.E',
    ].join('\n');
    const truoc = demCo();
    const xem = await req('POST', '/api/admin/teachers/nhap/xem-truoc', { cookie: BGH, body: { csv: tep } });
    check('xem trước được', xem.status === 200, xem.data);
    check('bốn dòng, không dòng lỗi, một dòng trùng',
      xem.data?.total === 4 && xem.data?.loi === 0 && xem.data?.trung === 1, xem.data);
    const dongTrung = (xem.data?.rows || []).find(r => r.hoTen === 'Cô Trùng Số') || {};
    check('dòng trùng số điện thoại (đã chuẩn hoá) với cô đang làm được đánh dấu', !!dongTrung.trung, dongTrung);
    check('xem trước KHÔNG ghi gì', demCo() === truoc, demCo());

    const ghi = await req('POST', '/api/admin/teachers/nhap/ghi', { cookie: BGH, body: { csv: tep } });
    check('ghi được', ghi.status === 200, ghi.data);
    check('nhập 3, bỏ qua 1 dòng trùng', ghi.data?.imported === 3 && ghi.data?.boQuaTrung === 1, ghi.data);
    check('đúng 3 tài khoản cô mới trong cơ sở dữ liệu', demCo() === truoc + 3, demCo() - truoc);
    check('không tạo tài khoản cho dòng trùng', !coTheoTen('Cô Trùng Số'));
    const tk = ghi.data?.taiKhoan || [];
    check('phiếu có tên đăng nhập và mật khẩu tạm cho mỗi cô mới',
      tk.length === 3 && tk.every(x => x.username && x.matKhau && x.matKhau.length >= 8), tk);

    const mot = coTheoTen('Cô Nhập Một');
    const bon = coTheoTen('Cô Nhập Bốn');
    const hai = coTheoTen('Cô Nhập Hai');
    check('Cô Nhập Một vào nhóm Chồi 2',
      !!mot && docDb('SELECT 1 FROM class_teachers WHERE classId = ? AND teacherId = ?', 'c1', mot.id).length === 1);
    check('vai "Cambridge" → cô nước ngoài',
      (docDb('SELECT nhom FROM class_teacher_nhom WHERE classId = ? AND teacherId = ?', 'c1', mot?.id)[0] || {}).nhom === 'nuoc-ngoai');
    check('vai "P.E" → cô thể chất ở nhóm Lá 1',
      (docDb('SELECT nhom FROM class_teacher_nhom WHERE classId = ? AND teacherId = ?', 'c2', bon?.id)[0] || {}).nhom === 'the-chat');
    check('nhóm đã có cô thì cô mới là cô phụ, không đè cô chính',
      (docDb('SELECT vaiTro FROM class_teachers WHERE classId = ? AND teacherId = ?', 'c1', mot?.id)[0] || {}).vaiTro === 'phu');
    const hsBon = docDb('SELECT * FROM nhansu_ho_so WHERE userId = ?', bon?.id)[0] || {};
    check('ngày sinh (dd/mm/yyyy) và CCCD ghi vào hồ sơ Nhân sự',
      hsBon.ngaySinh === '1992-03-15' && hsBon.cccd === '001234567', hsBon);
    check('Cô Nhập Hai không có nhóm', !!hai && !docDb('SELECT 1 FROM class_teachers WHERE teacherId = ?', hai.id).length);
    check('nhưng thuộc Cơ sở 2 (chủ dự án chốt 02/11)',
      (docDb('SELECT campusId FROM giao_vien_co_so WHERE userId = ?', hai?.id)[0] || {}).campusId === 'cs2');
    const dsQL2 = (await req('GET', '/api/admin/teachers', { cookie: QL2 })).data || [];
    check('quản lý cơ sở 2 thấy Cô Nhập Hai để phân nhóm', dsQL2.some(x => x.id === hai?.id), dsQL2.map(x => x.id));
    const dsQL1 = (await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || [];
    check('quản lý cơ sở 1 KHÔNG thấy Cô Nhập Hai', !dsQL1.some(x => x.id === hai?.id));

    const tkMot = tk.find(x => x.hoTen === 'Cô Nhập Một') || {};
    const dn = await login(tkMot.username, tkMot.matKhau);
    check('cô mới đăng nhập được bằng mật khẩu tạm và bị buộc đổi',
      dn.status === 200 && dn.data?.user?.mustChangePassword === true, dn.data);

    const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
    check('nhật ký có "import-teachers"', nk.some(r => r.action === 'import-teachers'), nk.slice(0, 3));
    check('nhật ký KHÔNG chứa mật khẩu tạm hay CCCD',
      !tk.some(x => JSON.stringify(nk).includes(x.matKhau)) && !JSON.stringify(nk).includes('001234567'));

    // Trùng CCCD với cô đang làm, và trùng ngay trong tệp.
    const tep2 = [DAU,
      'Cô Trùng CCCD,0911000099,,,001 234 567,Cơ sở 1,,',
      'Cô Trong Tệp A,0911000050,,,,Cơ sở 1,,',
      'Cô Trong Tệp B,0911 000 050,,,,Cơ sở 1,,',
    ].join('\n');
    const xem2 = await req('POST', '/api/admin/teachers/nhap/xem-truoc', { cookie: BGH, body: { csv: tep2 } });
    const r2 = xem2.data?.rows || [];
    check('trùng CCCD với cô đang làm → dòng trùng', !!(r2.find(r => r.hoTen === 'Cô Trùng CCCD') || {}).trung, r2);
    check('dòng thứ hai cùng số trong tệp → dòng trùng',
      !(r2.find(r => r.hoTen === 'Cô Trong Tệp A') || {}).trung && !!(r2.find(r => r.hoTen === 'Cô Trong Tệp B') || {}).trung, r2);

    const caTrung = await req('POST', '/api/admin/teachers/nhap/ghi',
      { cookie: BGH, body: { csv: [DAU, 'Cô Trùng Số,0903111222,,,,Cơ sở 1,,'].join('\n'), nhapCaTrung: true } });
    check('cờ nhapCaTrung thì dòng trùng vẫn nhập', caTrung.status === 200 && caTrung.data?.imported === 1, caTrung.data);
  }

  // =========================================================================
  console.log('\n[5] Tệp hỏng, dòng hỏng: không ghi gì');
  {
    const FFFD = String.fromCharCode(0xFFFD);
    const hong = `${DAU}\nC${FFFD} Nh${FFFD}p,0911000111,,,,,,`;
    for (const duong of ['xem-truoc', 'ghi']) {
      const r = await req('POST', `/api/admin/teachers/nhap/${duong}`, { cookie: BGH, body: { csv: hong } });
      check(`tệp hỏng phông bị từ chối ở ${duong}`, r.status === 400 && /phông chữ/.test(r.data?.error || ''), r.data);
    }

    const truoc = demCo();
    const motHong = [DAU,
      'Cô Lành Lặn,0911000201,,,,Cơ sở 1,,',
      ',0911000202,,,,Cơ sở 1,,',
    ].join('\n');
    const r = await req('POST', '/api/admin/teachers/nhap/ghi', { cookie: BGH, body: { csv: motHong } });
    check('một dòng thiếu họ tên → cả tệp bị từ chối', r.status === 400, r.data);
    check('và KHÔNG có tài khoản nào được tạo, kể cả dòng lành', demCo() === truoc && !coTheoTen('Cô Lành Lặn'));

    const xem = await req('POST', '/api/admin/teachers/nhap/xem-truoc', {
      cookie: BGH,
      body: { csv: [DAU,
        'Cô Vai Lạ,0911000301,,,,Cơ sở 1,Chồi 2,Hiệu phó',
        'Cô CCCD Sai,0911000302,,,12345,Cơ sở 1,,',
        'Cô Ngày Sai,0911000303,,1992-02-30,,Cơ sở 1,,',
        'Cô Cơ Sở Lạ,0911000304,,,,Cơ sở 9,,',
        'Cô Nhóm Lạ,0911000305,,,,Cơ sở 1,Nhóm Không Có,',
        'Cô Vai Không Nhóm,0911000306,,,,Cơ sở 1,,Cambridge',
      ].join('\n') },
    });
    const loiCua = (ten) => ((xem.data?.rows || []).find(x => x.hoTen === ten) || {}).loi || [];
    for (const ten of ['Cô Vai Lạ', 'Cô CCCD Sai', 'Cô Ngày Sai', 'Cô Cơ Sở Lạ', 'Cô Nhóm Lạ', 'Cô Vai Không Nhóm']) {
      check(`${ten} → dòng lỗi có câu giải thích`, loiCua(ten).length > 0, xem.data?.rows?.find(x => x.hoTen === ten));
    }
  }

  // =========================================================================
  console.log('\n[6] Quản lý cơ sở nhập: cơ sở bị ép đúng với họ');
  {
    const r = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: QL1, body: { csv: [DAU, 'Cô Của QL1,0911000401,,,,,,'].join('\n') },
    });
    check('quản lý cơ sở 1 nhập được cô không ghi cơ sở', r.status === 200 && r.data?.imported === 1, r.data);
    const co = coTheoTen('Cô Của QL1');
    check('cô ấy thuộc Cơ sở 1',
      (docDb('SELECT campusId FROM giao_vien_co_so WHERE userId = ?', co?.id)[0] || {}).campusId === 'cs1');
    const ds = (await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || [];
    check('và hiện trong danh sách cô của quản lý cơ sở 1', ds.some(x => x.id === co?.id));

    const xem = await req('POST', '/api/admin/teachers/nhap/xem-truoc', {
      cookie: QL1,
      body: { csv: [DAU, 'Cô Sang CS2,0911000402,,,,Cơ sở 2,,', 'Cô Nhóm CS2,0911000403,,,,,Mầm 1,'].join('\n') },
    });
    const rows = xem.data?.rows || [];
    check('ghi Cơ sở 2 → dòng lỗi', ((rows.find(x => x.hoTen === 'Cô Sang CS2') || {}).loi || []).length > 0, rows);
    check('nhóm của cơ sở 2 → dòng lỗi', ((rows.find(x => x.hoTen === 'Cô Nhóm CS2') || {}).loi || []).length > 0, rows);
    const ghi = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: QL1, body: { csv: [DAU, 'Cô Sang CS2,0911000402,,,,Cơ sở 2,,'].join('\n') },
    });
    check('ghi thử vẫn bị từ chối, không tạo tài khoản', ghi.status === 400 && !coTheoTen('Cô Sang CS2'), ghi.data);

    const nhom = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: QL1, body: { csv: [DAU, 'Cô Nhóm QL1,0911000404,,,,,Nhà trẻ 1,'].join('\n') },
    });
    const cn = coTheoTen('Cô Nhóm QL1');
    check('quản lý cơ sở 1 nhập cô vào nhóm của cơ sở mình',
      nhom.status === 200 && !!cn && docDb('SELECT 1 FROM class_teachers WHERE classId = ? AND teacherId = ?', 'c4', cn.id).length === 1,
      nhom.data);
  }

  // =========================================================================
  console.log('\n[7] Nhân sự nhập được nhưng không phân nhóm; văn phòng không nhập');
  {
    const coNhom = await req('POST', '/api/admin/teachers/nhap/xem-truoc', {
      cookie: NS, body: { csv: [DAU, 'Cô NS Có Nhóm,0911000501,,,,Cơ sở 1,Chồi 2,'].join('\n') },
    });
    check('Nhân sự gửi tệp có cột Nhóm → 403', coNhom.status === 403, coNhom.data);
    const truoc = demCo();
    const coNhomGhi = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: NS, body: { csv: [DAU, 'Cô NS Có Nhóm,0911000501,,,,Cơ sở 1,Chồi 2,'].join('\n') },
    });
    check('và ghi cũng 403, không tạo gì', coNhomGhi.status === 403 && demCo() === truoc, coNhomGhi.data);

    const ok = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: NS, body: { csv: [DAU, 'Cô Của NS,0911000502,,,,Cơ sở 1,,'].join('\n') },
    });
    check('Nhân sự nhập được cô không phân nhóm', ok.status === 200 && ok.data?.imported === 1, ok.data);

    for (const duong of ['xem-truoc', 'ghi']) {
      const r = await req('POST', `/api/admin/teachers/nhap/${duong}`, {
        cookie: VP1, body: { csv: [DAU, 'Cô Của VP,0911000601,,,,,,'].join('\n') },
      });
      check(`văn phòng KHÔNG nhập cô (${duong} → 403)`, r.status === 403, r.status);
    }
    check('không có tài khoản nào do văn phòng tạo', !coTheoTen('Cô Của VP'));
    const kt = await req('POST', '/api/admin/teachers/nhap/xem-truoc', {
      cookie: KT, body: { csv: [DAU, 'Cô Của KT,0911000701,,,,,,'].join('\n') },
    });
    check('Kế toán KHÔNG nhập cô', kt.status === 403, kt.status);
  }

  // =========================================================================
  console.log('\n[8] Tắt Nhân sự: hồ sơ cô không đọc, không ghi');
  {
    const tat = await req('PUT', '/api/admin/modules/nhansu', { cookie: BGH, body: { enabled: false } });
    check('ban giám hiệu tắt được phân hệ Nhân sự', tat.status === 200, tat.data);
    const ds = await req('GET', DS, { cookie: BGH });
    check('danh sách báo phần hồ sơ đang tắt',
      ds.status === 404 && /tắt cùng phân hệ Nhân sự/.test(ds.data?.error || ''), ds.data);
    const ct = await req('GET', HS('t1'), { cookie: BGH });
    check('màn chi tiết cũng không mở', ct.status === 404 && !JSON.stringify(ct.data).includes('012345678901'), ct.data);
    const ghi = await req('PUT', HS('t1'), { cookie: BGH, body: { choO: 'Ghi khi tắt' } });
    check('không ghi được', ghi.status === 404, ghi.status);
    check('dữ liệu cũ còn nguyên, không bị ghi đè',
      (docDb('SELECT choO FROM nhansu_ho_so WHERE userId = ?', 't1')[0] || {}).choO === '30 Phan Xích Long');

    const nhap = await req('POST', '/api/admin/teachers/nhap/xem-truoc', {
      cookie: BGH, body: { csv: [DAU, 'Cô Khi Tắt,0911000801,,1990-01-01,,Cơ sở 1,,'].join('\n') },
    });
    const dong = (nhap.data?.rows || [])[0] || {};
    check('nhập cô có ngày sinh khi Nhân sự tắt → dòng lỗi, không lặng lẽ bỏ ngày sinh',
      nhap.status === 200 && (dong.loi || []).length > 0, nhap.data);
    const khongHs = await req('POST', '/api/admin/teachers/nhap/ghi', {
      cookie: BGH, body: { csv: [DAU, 'Cô Khi Tắt,0911000801,,,,Cơ sở 1,,'].join('\n') },
    });
    check('nhập cô không kèm hồ sơ vẫn được khi Nhân sự tắt', khongHs.status === 200 && khongHs.data?.imported === 1, khongHs.data);
    await req('PUT', '/api/admin/modules/nhansu', { cookie: BGH, body: { enabled: true } });
  }

  // =========================================================================
  console.log('\n[9] Cờ quyền ở tab Tài khoản');
  {
    const q = async (ck) => ((await req('GET', '/api/admin/overview', { cookie: ck })).data || {}).quyenTaiKhoan || {};
    const qB = await q(BGH); const qQ = await q(QL1); const qV = await q(VP1); const qN = await q(NS);
    check('ban giám hiệu: cấp lại cho phụ huynh, đổi chức vụ', qB.capLaiPhuHuynh === true && qB.doiChucVu === true, qB);
    check('quản lý cơ sở: cấp lại cho phụ huynh, KHÔNG đổi chức vụ', qQ.capLaiPhuHuynh === true && qQ.doiChucVu === false, qQ);
    check('văn phòng: KHÔNG cấp lại cho cô, KHÔNG đổi chức vụ', qV.capLaiMatKhau === false && qV.doiChucVu === false, qV);
    check('Nhân sự: cấp lại cho cô, KHÔNG cho phụ huynh, KHÔNG đổi chức vụ',
      qN.capLaiMatKhau === true && qN.capLaiPhuHuynh === false && qN.doiChucVu === false, qN);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Hồ sơ cô cơ bản và nhập cô từ tệp');
