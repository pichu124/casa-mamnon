// Bài canh: NHẬP TỆP / NHẬN MỘT BÉ KHÔNG ĐƯỢC LẶNG LẼ NỐI BÉ VÀO TÀI KHOẢN CỦA NHÀ CƠ SỞ KHÁC (Đ261j).
//
// Chạy bằng:  TEST_PORT=7454 node test/nhap-tep-so-da-co.test.mjs
//
// Nhập tệp nối phụ huynh theo số điện thoại (nhà hai con một tài khoản). Bản
// Đ261a nối cả cột "Điện thoại phụ huynh 2", và cả hai cột đều nối không hỏi,
// không soát cơ sở: văn phòng cơ sở 2 gõ trùng hay gõ nhầm số một nhà cơ sở 1
// là bé mới nối vào nhà ấy — người lạ thấy ảnh và sức khoẻ của bé, còn phiếu
// tài khoản lộ họ tên, tên đăng nhập của nhà kia cho văn phòng cơ sở 2.
// Đường thêm phụ huynh (`POST …/phu-huynh`) đã có chốt: chỉ nối khi người làm
// có quyền với MỌI con đang học của tài khoản ấy. Nay nhập tệp và Nhận một bé
// cùng chốt đó.
//
//   [1] Cơ sở 2 nhập số của nhà cơ sở 1 (cột phụ huynh 1): dòng lỗi, không lộ tên, không nối.
//   [2] Như trên ở cột phụ huynh 2; dòng khác trong tệp vẫn nhập.
//   [3] Cùng cơ sở: xem trước báo "số này đã có tài khoản — sẽ nối", nhập thì nối.
//   [4] Nhận một bé: cùng luật.
import Database from 'better-sqlite3';
import path from 'node:path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoBoDem, taoReq, taoLogin,
  khoaVaoCoSo, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhap-tep-so-da-co');
sinhDuLieu(DIR);
const mk = {};
for (const [u, cs] of [['ntc_vp1', 'cs1'], ['ntc_vp2', 'cs2']]) {
  mk[u] = taoQuanTri(DIR, `Văn phòng ${cs}`, u);
  daDoiMatKhau(DIR, u);
  datChucVu(DIR, u, 'vanphong-coso');
  khoaVaoCoSo(DIR, u, cs);
}
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7454), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const doc = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const conCua = (parentId) => doc('SELECT studentId FROM student_parents WHERE parentId = ? ORDER BY studentId', parentId)
  .map(r => r.studentId);
const luiThang = (n) => {
  const [y, m, d] = HOM_NAY().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - n, Math.min(d, 28))).toISOString().slice(0, 10);
};
const NS = luiThang(40);
const tep = (cot, hang) => [cot.join(','), ...hang.map(h => h.join(','))].join('\n');
const COT = ['Họ tên', 'Ngày sinh', 'Nhóm', 'Họ tên phụ huynh', 'Điện thoại', 'Họ tên phụ huynh 2', 'Điện thoại phụ huynh 2'];
// Nhà cơ sở 1: chị Thu Hà (p1, phuhuynh), số 0912 345 678, con là bé An (Chồi 2) và bé Nam (Lá 1).
// Anh Quốc Bảo (p2, phuhuynh2), số 0987 654 321, con là bé Hân (Chồi 2).
const LO = ['Lê Thị Thu Hà', 'phuhuynh', 'Nguyễn Bảo An', 'Nguyễn Bảo Nam', 'Phạm Quốc Bảo', 'Phạm Gia Hân'];
const lo = (x) => LO.filter(t => JSON.stringify(x || {}).includes(t));
const P1_TRUOC = conCua('p1');
const P2_TRUOC = conCua('p2');

try {
  const VP1 = (await login('ntc_vp1', mk.ntc_vp1)).cookie;
  const VP2 = (await login('ntc_vp2', mk.ntc_vp2)).cookie;

  // =========================================================================
  console.log('\n[1] Cơ sở 2 nhập số của nhà cơ sở 1 ở cột phụ huynh 1');
  {
    const csvText = tep(COT, [['Bé Lạ Một', NS, 'Mầm 1', 'Mẹ Gõ Nhầm', '0912 345 678', '', '']]);
    const p = await req('POST', '/api/admin/import/preview', { cookie: VP2, body: { csv: csvText } });
    const dong = (p.data?.rows || [])[0] || {};
    check('xem trước: dòng có lỗi', p.status === 200 && (dong.loi || []).length > 0, dong.loi);
    check('câu lỗi nói số đã là tài khoản của gia đình cơ sở khác, mời liên hệ văn phòng cơ sở đó',
      (dong.loi || []).some(x => /0912 345 678/.test(x) && /cơ sở khác/.test(x) && /văn phòng cơ sở đó/.test(x)), dong.loi);
    check('xem trước không lộ tên, tên đăng nhập của nhà kia', lo(p.data).length === 0, lo(p.data));
    const c = await req('POST', '/api/admin/import/commit', { cookie: VP2, body: { csv: csvText } });
    check('ghi thật: không có dòng nào hợp lệ (400)', c.status === 400, c);
    check('ghi thật không lộ tên nhà kia', lo(c.data).length === 0, lo(c.data));
    check('không bé nào nối thêm vào tài khoản p1', JSON.stringify(conCua('p1')) === JSON.stringify(P1_TRUOC), conCua('p1'));
    check('không tạo bé "Bé Lạ Một"', doc("SELECT id FROM students WHERE name = 'Bé Lạ Một'").length === 0);
  }

  // =========================================================================
  console.log('\n[2] Cơ sở 2 nhập số của nhà cơ sở 1 ở cột phụ huynh 2');
  {
    const csvText = tep(COT, [
      ['Bé Lạ Hai', NS, 'Mầm 1', 'Mẹ Bé Lạ Hai', '0975550001', 'Bố Gõ Nhầm', '0912345678'],
      ['Bé Đúng Ba', NS, 'Mầm 1', 'Mẹ Bé Ba', '0975550002', '', ''],
    ]);
    const p = await req('POST', '/api/admin/import/preview', { cookie: VP2, body: { csv: csvText } });
    const dong = (n) => (p.data?.rows || []).find(x => x.line === n) || {};
    check('dòng có số trùng ở cột phụ huynh 2 bị lỗi', (dong(2).loi || []).some(x => /phụ huynh 2/.test(x) && /cơ sở khác/.test(x)),
      dong(2).loi);
    check('dòng kia không lỗi', (dong(3).loi || []).length === 0, dong(3).loi);
    check('xem trước không lộ tên nhà kia', lo(p.data).length === 0, lo(p.data));
    const c = await req('POST', '/api/admin/import/commit', { cookie: VP2, body: { csv: csvText } });
    check('ghi thật: nhập đúng một bé, bỏ dòng lỗi', c.status === 200 && c.data?.imported === 1, c.data);
    check('phiếu tài khoản không lộ tên nhà kia', lo(c.data).length === 0, lo(c.data));
    check('không bé nào nối thêm vào tài khoản p1', JSON.stringify(conCua('p1')) === JSON.stringify(P1_TRUOC), conCua('p1'));
    check('không tạo bé "Bé Lạ Hai"', doc("SELECT id FROM students WHERE name = 'Bé Lạ Hai'").length === 0);
  }

  // =========================================================================
  console.log('\n[3] Cùng cơ sở: xem trước báo rõ, nhập thì nối');
  {
    const csvText = tep(COT, [
      ['Bé Em Nhà Hà', NS, 'Chồi 2', 'Lê Thị Thu Hà', '0912345678', 'Phạm Quốc Bảo', '0987.654.321'],
    ]);
    const p = await req('POST', '/api/admin/import/preview', { cookie: VP1, body: { csv: csvText } });
    const dong = (p.data?.rows || [])[0] || {};
    check('không lỗi', (dong.loi || []).length === 0, dong.loi);
    const cb = (dong.canhBao || []).join(' | ');
    check('cảnh báo: số phụ huynh 1 đã có tài khoản — sẽ nối', /0912345678/.test(cb) && /đã có tài khoản/.test(cb) && /sẽ được nối/.test(cb), cb);
    check('cảnh báo: số phụ huynh 2 đã có tài khoản — sẽ nối', /0987\.654\.321/.test(cb) && /phụ huynh 2/.test(cb), cb);
    check('xem trước đếm dòng này vào "cần xem lại"', p.data?.canhBao === 1, p.data?.canhBao);
    const c = await req('POST', '/api/admin/import/commit', { cookie: VP1, body: { csv: csvText } });
    check('ghi thật: nhập một bé', c.status === 200 && c.data?.imported === 1, c.data);
    const be = doc("SELECT id FROM students WHERE name = 'Bé Em Nhà Hà'")[0]?.id;
    check('bé mới nối vào tài khoản p1', !!be && conCua('p1').includes(be), conCua('p1'));
    check('bé mới nối vào tài khoản p2', !!be && conCua('p2').includes(be), conCua('p2'));
    check('không tạo tài khoản trùng số', doc("SELECT COUNT(*) AS n FROM users WHERE role = 'parent' AND REPLACE(phone, ' ', '') = '0912345678'")[0].n === 1);
    check('phiếu ghi "đã có tài khoản từ trước"', (c.data?.taiKhoan || []).length === 2 && c.data.taiKhoan.every(t => t.daCoTaiKhoan), c.data?.taiKhoan);
  }

  // =========================================================================
  console.log('\n[4] Nhận một bé: cùng luật');
  {
    const P1 = conCua('p1');
    const khac = await req('POST', '/api/admin/students', {
      cookie: VP2, body: { hoTen: 'Bé Lạ Bốn', classId: 'c3', tenLop: 'Mầm 1', phHoTen: 'Mẹ Gõ Nhầm', phSdt: '0912 345 678' },
    });
    check('cơ sở 2 nhận bé với số nhà cơ sở 1 → 400', khac.status === 400, khac);
    check('câu báo nói cơ sở khác, không lộ tên', /cơ sở khác/.test(khac.data?.error || '') && lo(khac.data).length === 0, khac.data);
    check('không tạo bé, không nối', doc("SELECT id FROM students WHERE name = 'Bé Lạ Bốn'").length === 0
      && JSON.stringify(conCua('p1')) === JSON.stringify(P1));
    const cung = await req('POST', '/api/admin/students', {
      cookie: VP1, body: { hoTen: 'Bé Út Nhà Hà', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'Lê Thị Thu Hà', phSdt: '0912 345 678' },
    });
    check('cùng cơ sở → 201 nối vào tài khoản có sẵn', cung.status === 201 && cung.data?.taiKhoan?.daCoTaiKhoan === true, cung.data);
    check('bé mới nối vào p1', conCua('p1').includes(cung.data?.id), conCua('p1'));
    check('kèm cảnh báo đã nối vào tài khoản có sẵn', (cung.data?.canhBao || []).some(x => /đã có tài khoản/.test(x)), cung.data?.canhBao);
  }

  // =========================================================================
  console.log('\n[5] Đối chứng: nhà p2 không bị đụng ngoài lượt nhập cùng cơ sở');
  check('p2 chỉ thêm đúng một bé', conCua('p2').length === P2_TRUOC.length + 1, conCua('p2'));
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
