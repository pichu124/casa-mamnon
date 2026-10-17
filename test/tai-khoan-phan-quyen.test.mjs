// Bài canh TÀI KHOẢN & PHÂN QUYỀN (Đ239d1 — góp ý của trường 16/10, mục 5).
//
// Chạy bằng:  npm run test:tai-khoan-phan-quyen
//
// Trường nói: "Giám đốc sẽ tạo tài khoản cho cấp 2 và quản lý cơ sở. Quản lý
// cơ sở lập tài khoản, phân quyền cho giáo viên vào từng lớp và điều chuyển
// giáo viên từ lớp này qua lớp khác."
//
// Ba việc mới, mỗi việc canh cả hai chiều — làm ĐƯỢC cho đúng người, và KHÔNG
// làm được cho mọi người còn lại:
//
//   1. POST /api/admin/managers — ban giám hiệu tạo tài khoản quản trị kèm
//      chức vụ (và cơ sở, với chức vụ Cấp 3). Tài khoản quản trị KHÔNG chức vụ
//      là toàn quyền, nên đường này không bao giờ được để lại một tài khoản như
//      thế, kể cả khi bị từ chối giữa chừng.
//   2. Cô do quản lý cơ sở tạo mà chưa gán nhóm thì quản lý ấy vẫn thấy lại và
//      phân vào nhóm được — trước đây cô "mất" khỏi danh sách ngay khi tạo xong.
//      Quản lý cơ sở KHÁC thì vẫn không thấy, không đụng được.
//   3. POST /api/admin/teachers/:id/chuyen-nhom — chuyển cô một bước, giữ vai.
//
// Phần 2 (Đ239d2) — việc của VĂN PHÒNG CƠ SỞ: "tạo tài khoản cho phụ huynh và
// điều chuyển học sinh chuyển lớp, nghỉ học bảo lưu và nhập thông tin đầy đủ":
//
//   4. POST /api/admin/students/:id/phu-huynh — thêm phụ huynh cho bé đã có.
//      LUÔN là tài khoản mới: gắn theo số điện thoại trùng là cho người lạ xem
//      con nhà khác.
//   5. POST /api/admin/students/:id/bao-luu — nghỉ học bảo lưu, cùng hiệu ứng
//      với "Cho nghỉ"; "Nhận lại" (PUT {active:true}) là đi học lại.
//   6. Nhận bé nhập đủ thông tin, kể cả phụ huynh thứ hai — văn phòng NHẬP được,
//      nhưng SỬA nhân thân sau đó thì vẫn không (luật 07/09 giữ nguyên).
//   7. Quản lý cơ sở cấp lại mật khẩu cho cô mình tạo mà chưa phân nhóm.
import path from 'path';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, HOM_NAY, dongNhom,
} from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const Database = require_('better-sqlite3');

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tai-khoan-phan-quyen');
sinhDuLieu(DIR);

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
// Ban giám hiệu KHAI chức vụ "hieu-truong" tường minh — cũng là Cấp 1.
const mkBGH2 = taoQuanTri(DIR, 'Phó Hiệu Trưởng', 'phohieutruong');
datChucVu(DIR, 'phohieutruong', 'hieu-truong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4887), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Đếm thẳng trong cơ sở dữ liệu, không qua API: "không tạo tài khoản nào" phải
// đúng cho MỌI vai, kể cả tài khoản không hiện trong danh sách nào.
function demTaiKhoan() {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return d.prepare('SELECT COUNT(*) AS n FROM users').get().n; } finally { d.close(); }
}
function coTenDangNhap(u) {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return !!d.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(u); } finally { d.close(); }
}
function docDb(sql, ...thamSo) {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return d.prepare(sql).all(...thamSo); } finally { d.close(); }
}

const BGH = await vao('hieutruong', mkBGH);
const BGH2 = await vao('phohieutruong', mkBGH2);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

// ===========================================================================
console.log('\n[1] Ban giám hiệu tạo tài khoản quản trị kèm chức vụ');
const tao = (cookie, body) => req('POST', '/api/admin/managers', { cookie, body });

const rQL1 = await tao(BGH, { name: 'Quản Lý CS1', username: 'quanly.cs1', chucVu: 'quanly-coso', campusId: 'cs1' });
check('tạo được Quản lý cơ sở gắn Cơ sở 1', rQL1.status === 201, rQL1.data);
check('trả mật khẩu tạm MỘT lần, kèm tên đăng nhập',
  typeof rQL1.data?.temporaryPassword === 'string' && rQL1.data.temporaryPassword.length >= 8
    && rQL1.data?.username === 'quanly.cs1', rQL1.data);

const rQL2 = await tao(BGH, { name: 'Quản Lý CS2', username: 'quanly.cs2', chucVu: 'quanly-coso', campusId: 'cs2' });
check('tạo được Quản lý cơ sở gắn Cơ sở 2', rQL2.status === 201, rQL2.data);

const rNS = await tao(BGH, { name: 'Chị Nhân Sự', username: 'nhansu.moi', chucVu: 'nhansu' });
check('tạo được Nhân sự (Cấp 2) không cần cơ sở', rNS.status === 201, rNS.data);

const rVP = await tao(BGH2, { name: 'Văn Phòng CS1', username: 'vanphong.cs1', chucVu: 'vanphong-coso', campusId: 'cs1' });
check('ban giám hiệu mang chức vụ "Ban giám hiệu" tường minh cũng tạo được', rVP.status === 201, rVP.data);

const ds = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
const dong = (u) => ds.find(x => x.username === u) || {};
check('danh sách quản trị có Quản lý CS1 đúng chức vụ và cơ sở',
  dong('quanly.cs1').chucVu === 'quanly-coso' && dong('quanly.cs1').campusId === 'cs1', dong('quanly.cs1'));
check('Nhân sự mới KHÔNG bị gắn cơ sở nào',
  dong('nhansu.moi').chucVu === 'nhansu' && !dong('nhansu.moi').campusId, dong('nhansu.moi'));

const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
const nkTao = nk.filter(r => r.action === 'admin-create' && r.target === rQL1.data?.id);
check('Nhật ký ghi "Tạo tài khoản quản trị" cho đúng tài khoản mới', nkTao.length === 1, nkTao);
check('và Nhật ký KHÔNG chứa mật khẩu tạm',
  !JSON.stringify(nk).includes(rQL1.data?.temporaryPassword || '@@'), nkTao);

// ---- đăng nhập được bằng mật khẩu tạm, và bị buộc đổi ----
const vaoTam = await login('quanly.cs1', rQL1.data?.temporaryPassword);
check('đăng nhập được bằng mật khẩu tạm', vaoTam.status === 200 && !!vaoTam.cookie, vaoTam.status);
check('và bị buộc đặt mật khẩu mới ở lần đầu', vaoTam.data?.user?.mustChangePassword === true, vaoTam.data?.user);
check('chức vụ và cơ sở có hiệu lực ngay từ lần đăng nhập đầu',
  vaoTam.data?.user?.chucVu === 'quanly-coso' && vaoTam.data?.user?.coSo === 'cs1', vaoTam.data?.user);

const QL1 = await vao('quanly.cs1', rQL1.data?.temporaryPassword);
const QL2 = await vao('quanly.cs2', rQL2.data?.temporaryPassword);
const NS = await vao('nhansu.moi', rNS.data?.temporaryPassword);
const VP = await vao('vanphong.cs1', rVP.data?.temporaryPassword);

const cs = (await req('GET', '/api/admin/campuses', { cookie: QL1 })).data || [];
check('Quản lý CS1 mới chỉ thấy Cơ sở 1', cs.length === 1 && cs[0].id === 'cs1', cs.map(c => c.id));
const ov = (await req('GET', '/api/admin/overview', { cookie: QL1 })).data || {};
const maNhom = (ov.classes || []).map(c => c.id);
check('và chỉ thấy nhóm của Cơ sở 1 (không có Mầm 1 của Cơ sở 2)',
  maNhom.length > 0 && !maNhom.includes('c3'), maNhom);
check('Nhân sự mới KHÔNG mở được hồ sơ bé — chức vụ Cấp 2 có hiệu lực ngay',
  (await req('GET', '/api/students', { cookie: NS })).status === 403);
check('nhưng mở được danh sách cô — đúng phần việc của Nhân sự',
  (await req('GET', '/api/admin/teachers', { cookie: NS })).status === 200);

// ===========================================================================
console.log('\n[2] Những lượt tạo bị từ chối KHÔNG để lại tài khoản nào');
{
  const truoc = demTaiKhoan();

  const ht = await tao(BGH, { name: 'Hiệu Trưởng Mới', username: 'ht.moi', chucVu: 'hieu-truong' });
  check('KHÔNG tạo được tài khoản Ban giám hiệu trên màn hình', ht.status === 400 || ht.status === 403, ht.status);
  check('và câu từ chối chỉ đúng lối: lệnh trên máy chủ', /máy chủ/i.test(ht.data?.error || ''), ht.data);

  const trong = await tao(BGH, { name: 'Không Chức Vụ', username: 'khong.chuc.vu' });
  check('KHÔNG tạo được tài khoản quản trị thiếu chức vụ (= toàn quyền)', trong.status === 400, trong.status);

  const la = await tao(BGH, { name: 'Chức Vụ Lạ', username: 'chuc.vu.la', chucVu: 'giam-doc' });
  check('chức vụ không có trong danh mục → 400', la.status === 400, la.status);

  const thieuCs = await tao(BGH, { name: 'Quản Lý Thiếu', username: 'quanly.thieu', chucVu: 'quanly-coso' });
  check('chức vụ Cấp 3 thiếu cơ sở → 400', thieuCs.status === 400, thieuCs.status);
  check('và câu từ chối nói phải chọn cơ sở', /cơ sở/i.test(thieuCs.data?.error || ''), thieuCs.data);
  const bvThieu = await tao(BGH, { name: 'Bảo Vệ Thiếu', username: 'baove.thieu', chucVu: 'baove' });
  check('bảo vệ cổng (cũng Cấp 3) thiếu cơ sở → 400', bvThieu.status === 400, bvThieu.status);

  const csLa = await tao(BGH, { name: 'Quản Lý Lạc', username: 'quanly.lac', chucVu: 'quanly-coso', campusId: 'cs-khong-co' });
  check('cơ sở không tồn tại → 400', csLa.status === 400, csLa.status);

  const ns = await tao(BGH, { name: 'Nhân Sự CS1', username: 'nhansu.cs1', chucVu: 'nhansu', campusId: 'cs1' });
  check('Cấp 2 (cả trường) KHÔNG gắn vào một cơ sở → 400', ns.status === 400, ns.status);

  const trung = await tao(BGH, { name: 'Trùng Tên', username: 'giaovien', chucVu: 'nhansu' });
  check('trùng tên đăng nhập đang có → 409', trung.status === 409, trung.status);
  const trungHoa = await tao(BGH, { name: 'Trùng Hoa', username: 'QuanLy.CS1', chucVu: 'nhansu' });
  check('trùng khi chỉ khác chữ hoa/thường → 409', trungHoa.status === 409, trungHoa.status);
  const sai = await tao(BGH, { name: 'Sai Dạng', username: 'có dấu', chucVu: 'nhansu' });
  check('tên đăng nhập sai dạng → 400', sai.status === 400, sai.status);
  const khongTen = await tao(BGH, { name: '  ', username: 'khong.ten', chucVu: 'nhansu' });
  check('thiếu họ tên → 400', khongTen.status === 400, khongTen.status);

  check('không lượt nào ở trên để lại MỘT tài khoản', demTaiKhoan() === truoc, [truoc, demTaiKhoan()]);
  check('không có tài khoản "quanly.thieu" lơ lửng không chức vụ', !coTenDangNhap('quanly.thieu'));
  check('không có tài khoản "ht.moi"', !coTenDangNhap('ht.moi'));
  check('không lượt nào trả về mật khẩu tạm',
    [ht, trong, la, thieuCs, bvThieu, csLa, ns, trung, trungHoa, sai, khongTen].every(r => !r.data?.temporaryPassword));
}

// ===========================================================================
console.log('\n[3] Ngoài ban giám hiệu thì KHÔNG ai tạo được tài khoản quản trị');
{
  const truoc = demTaiKhoan();
  const thu = [['quản lý cơ sở', QL1], ['văn phòng cơ sở', VP], ['nhân sự', NS], ['cô', GV], ['phụ huynh', PH]];
  for (const [i, [ten, ck]] of thu.entries()) {
    const r = await tao(ck, { name: `Do ${ten} tạo`, username: `tu.tao${i}`, chucVu: 'baove', campusId: 'cs1' });
    check(`${ten} gọi POST /api/admin/managers → 403`, r.status === 403, r.status);
    check(`và ${ten} không nhận được mật khẩu tạm nào`, !r.data?.temporaryPassword);
  }
  check('không lượt nào ở trên tạo ra tài khoản', demTaiKhoan() === truoc, [truoc, demTaiKhoan()]);
}

// ===========================================================================
console.log('\n[4] Quản lý cơ sở tạo cô chưa gán nhóm — KHÔNG được để cô "mất"');
let idCoMoi = null;
{
  const r = await req('POST', '/api/admin/teachers', { cookie: QL1, body: { name: 'Đỗ Thị Mới', phone: '0901234567' } });
  check('quản lý CS1 tạo được cô chưa gán nhóm', r.status === 201, r.data);
  idCoMoi = r.data?.id;

  const cua1 = (await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || [];
  check('QUẢN LÝ CS1 THẤY LẠI CÔ VỪA TẠO trong danh sách cô', cua1.some(t => t.id === idCoMoi), cua1.map(t => t.name));

  const cua2 = (await req('GET', '/api/admin/teachers', { cookie: QL2 })).data || [];
  check('quản lý CS2 KHÔNG thấy cô của Cơ sở 1', !cua2.some(t => t.id === idCoMoi), cua2.map(t => t.name));

  const lan = await req('PUT', '/api/admin/classes/c3/teachers', { cookie: QL2, body: { teacherIds: [idCoMoi] } });
  check('quản lý CS2 KHÔNG phân được cô của Cơ sở 1 vào nhóm mình', lan.status === 404, lan.status);
  const vanTrong = ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || []).find(t => t.id === idCoMoi);
  check('và cô ấy vẫn chưa thuộc nhóm nào', (vanTrong?.classIds || []).length === 0, vanTrong?.classIds);

  // Cô do ban giám hiệu tạo mà chưa gán nhóm vẫn chưa thuộc cơ sở nào — như cũ.
  const bgh = await req('POST', '/api/admin/teachers', { cookie: BGH, body: { name: 'Cô Của Ban Giám Hiệu' } });
  const cua1b = (await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || [];
  check('cô do ban giám hiệu tạo chưa gán nhóm thì quản lý cơ sở vẫn KHÔNG thấy (như cũ)',
    bgh.status === 201 && !cua1b.some(t => t.id === bgh.data?.id), bgh.status);
  check('ban giám hiệu thấy cả hai cô chưa gán nhóm',
    ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || [])
      .filter(t => [idCoMoi, bgh.data?.id].includes(t.id)).length === 2);

  // Phân vào nhóm của chính cơ sở mình, giữ nguyên hai cô đang dạy Chồi 2.
  const ganC1 = await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: QL1, body: { teacherIds: ['t1', 't3', idCoMoi], chinhId: 't1', nhom: { [idCoMoi]: 'nuoc-ngoai' } },
  });
  check('quản lý CS1 phân được cô mới vào Chồi 2 kèm vai "Cô nước ngoài"', ganC1.status === 200, ganC1.data);
  const sauGan = ((await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || []).find(t => t.id === idCoMoi);
  check('cô mới nay dạy Chồi 2', (sauGan?.classIds || []).includes('c1'), sauGan?.classIds);
}

// ===========================================================================
console.log('\n[5] Chuyển cô từ nhóm này sang nhóm khác — một bước, giữ vai');
const chuyen = (cookie, id, body) => req('POST', `/api/admin/teachers/${id}/chuyen-nhom`, { cookie, body });
const nhomCua = async (classId) => ((((await req('GET', '/api/admin/overview', { cookie: BGH })).data || {}).classes || [])
  .find(c => c.id === classId) || {});
{
  const vp = await chuyen(VP, idCoMoi, { tuNhom: 'c1', denNhom: 'c4' });
  check('văn phòng cơ sở KHÔNG chuyển được cô', vp.status === 403, vp.status);
  const ns = await chuyen(NS, idCoMoi, { tuNhom: 'c1', denNhom: 'c4' });
  check('nhân sự KHÔNG chuyển được cô (không phân công cô vào nhóm)', ns.status === 403, ns.status);
  const gv = await chuyen(GV, idCoMoi, { tuNhom: 'c1', denNhom: 'c4' });
  check('cô KHÔNG tự chuyển được', gv.status === 403, gv.status);
  const sang2 = await chuyen(QL1, idCoMoi, { tuNhom: 'c1', denNhom: 'c3' });
  check('quản lý CS1 KHÔNG chuyển được cô sang nhóm của Cơ sở 2', sang2.status === 404 || sang2.status === 403, sang2.status);
  const tu2 = await chuyen(QL2, idCoMoi, { tuNhom: 'c1', denNhom: 'c3' });
  check('quản lý CS2 KHÔNG kéo được cô của Cơ sở 1 sang', tu2.status === 404 || tu2.status === 403, tu2.status);
  const trung = await chuyen(QL1, idCoMoi, { tuNhom: 'c1', denNhom: 'c1' });
  check('nhóm đi trùng nhóm đến → 400', trung.status === 400, trung.status);
  const khongDay = await chuyen(QL1, idCoMoi, { tuNhom: 'c2', denNhom: 'c4' });
  check('cô không dạy nhóm đi → 400', khongDay.status === 400, khongDay.status);

  const conO = ((await nhomCua('c1')).teachers || []).map(t => t.id);
  check('sau mọi lượt bị từ chối, cô vẫn ở đúng Chồi 2', conO.includes(idCoMoi), conO);

  const ok = await chuyen(QL1, idCoMoi, { tuNhom: 'c1', denNhom: 'c4' });
  check('quản lý CS1 chuyển cô từ Chồi 2 sang Nhà trẻ 1', ok.status === 200, ok.data);
  const c1 = await nhomCua('c1');
  const c4 = await nhomCua('c4');
  check('cô KHÔNG còn ở Chồi 2', !(c1.teachers || []).some(t => t.id === idCoMoi), (c1.teachers || []).map(t => t.id));
  check('hai cô đang dạy Chồi 2 vẫn nguyên, cô chính giữ nguyên',
    ['t1', 't3'].every(id => (c1.teachers || []).some(t => t.id === id)) && c1.teacherId === 't1',
    { co: (c1.teachers || []).map(t => t.id), chinh: c1.teacherId });
  const oC4 = (c4.teachers || []).find(t => t.id === idCoMoi);
  check('cô có mặt ở Nhà trẻ 1', !!oC4, (c4.teachers || []).map(t => t.id));
  check('VÀ GIỮ VAI "Cô nước ngoài" ở nhóm mới', oC4?.nhomCo === 'nuoc-ngoai', oC4);
  check('cô đang dạy Nhà trẻ 1 vẫn là cô chính', c4.teacherId === 't4', c4.teacherId);
  const sauChuyen = ((await req('GET', '/api/admin/teachers', { cookie: QL1 })).data || []).find(t => t.id === idCoMoi);
  check('danh sách cô nói đúng: chỉ còn Nhà trẻ 1', JSON.stringify(sauChuyen?.classIds) === '["c4"]', sauChuyen?.classIds);

  const nkc = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
  check('Nhật ký ghi lượt chuyển cô', nkc.some(r => r.action === 'co-chuyen-nhom' && r.target === idCoMoi),
    nkc.slice(0, 3).map(r => r.action));

  // CÔ DẠY CẢ HAI CƠ SỞ: quản lý một cơ sở không được đổi phân công của cô ấy.
  await req('PUT', '/api/admin/classes/c3/teachers', { cookie: BGH, body: { teacherIds: ['t2'], chinhId: 't2' } });
  const cheo = await chuyen(QL1, 't2', { tuNhom: 'c2', denNhom: 'c4' });
  check('quản lý CS1 KHÔNG chuyển được cô đang dạy cả Cơ sở 2', cheo.status === 403, cheo.status);
  check('và câu từ chối nói rõ vì sao', /cơ sở khác/i.test(cheo.data?.error || ''), cheo.data);
  const t2 = ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || []).find(t => t.id === 't2');
  check('cô ấy không mất nhóm nào', ['c2', 'c3'].every(id => (t2?.classIds || []).includes(id)), t2?.classIds);

  const bgh = await chuyen(BGH, 't2', { tuNhom: 'c3', denNhom: 'c4' });
  check('ban giám hiệu (cả trường) thì chuyển được', bgh.status === 200, bgh.data);
}

// ===========================================================================
console.log('\n[6] Tab "Tài khoản" vẽ nút theo lời máy chủ — và lời ấy khớp với chốt thật');
{
  // `quyenTaiKhoan` chỉ là chỉ đường cho màn hình. Mục này canh nó KHÔNG nói
  // khác các đường thật: cờ bật mà đường từ chối là nút bấm ra lỗi; cờ tắt mà
  // đường nhận là việc của người ta biến khỏi màn hình.
  const quyen = async (ck) => ((await req('GET', '/api/admin/overview', { cookie: ck })).data || {}).quyenTaiKhoan || {};
  const qBGH = await quyen(BGH);
  const qQL = await quyen(QL1);
  const qVP = await quyen(VP);
  const qNS = await quyen(NS);
  check('ban giám hiệu: mọi việc về tài khoản',
    qBGH.taoQuanTri && qBGH.taoCo && qBGH.phanCongCo && qBGH.capLaiMatKhau && qBGH.nhanBe && !qBGH.motCoSo, qBGH);
  check('quản lý cơ sở: KHÔNG tạo quản trị; tạo cô, phân công cô, cấp lại mật khẩu, nhận bé',
    !qQL.taoQuanTri && qQL.taoCo && qQL.phanCongCo && qQL.capLaiMatKhau && qQL.nhanBe && qQL.motCoSo, qQL);
  check('văn phòng cơ sở: chỉ nhận bé (tạo tài khoản gia đình)',
    !qVP.taoQuanTri && !qVP.taoCo && !qVP.phanCongCo && !qVP.capLaiMatKhau && qVP.nhanBe, qVP);
  check('nhân sự: tạo cô và cấp lại mật khẩu cô, KHÔNG phân công, KHÔNG nhận bé',
    !qNS.taoQuanTri && qNS.taoCo && !qNS.phanCongCo && qNS.capLaiMatKhau && !qNS.nhanBe, qNS);

  // Đối chiếu với đường thật cho từng ô bị TẮT — chiều dễ nói dối nhất.
  check('văn phòng: cờ tạo cô tắt và đường tạo cô thật sự từ chối',
    (await req('POST', '/api/admin/teachers', { cookie: VP, body: { name: 'Cô Thử VP' } })).status === 403);
  check('văn phòng: cờ cấp lại mật khẩu tắt và đường ấy thật sự từ chối',
    (await req('POST', `/api/accounts/${idCoMoi}/reset-password`, { cookie: VP })).status === 403);
  check('nhân sự: cờ nhận bé tắt và đường nhận bé thật sự từ chối',
    (await req('POST', '/api/admin/students', { cookie: NS, body: { hoTen: 'Bé Thử', classId: 'c1' } })).status === 403);
  // Và một ô BẬT có điều kiện: quản lý cơ sở cấp lại được cho cô có nhóm ở cơ sở mình.
  const capLai = await req('POST', `/api/accounts/${idCoMoi}/reset-password`, { cookie: QL1 });
  check('quản lý cơ sở cấp lại được mật khẩu cho cô đang dạy nhóm của cơ sở mình',
    capLai.status === 200 && !!capLai.data?.temporaryPassword, capLai.status);
}

// ===========================================================================
// PHẦN 2 (Đ239d2) — VIỆC CỦA VĂN PHÒNG CƠ SỞ
// ===========================================================================
const rVP2 = await tao(BGH, { name: 'Văn Phòng CS2', username: 'vanphong.cs2', chucVu: 'vanphong-coso', campusId: 'cs2' });
const VP2 = await vao('vanphong.cs2', rVP2.data?.temporaryPassword);
const MAT_KHAU_TAM = /^[a-z]{5}[2-9]{3}$/;
// Không đọc được danh sách thì trả một dấu lỗi, KHÔNG trả mảng rỗng: rỗng làm
// mọi phép "không thấy bé X" xanh mà không thử gì.
const beCua = async (ck) => {
  const r = await req('GET', '/api/students', { cookie: ck });
  return Array.isArray(r.data) ? r.data.map(s => s.id).sort() : [`(lỗi ${r.status})`];
};
const hoSoNhom = async (ck, classId, keCaNghi = false) => (await req('GET',
  `/api/admin/students?classId=${classId}${keCaNghi ? '&keCaNghi=1' : ''}`, { cookie: ck })).data || [];
async function vaoPhuHuynhMoi(username, matKhauTam) {
  const d = await login(username, matKhauTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'giadinh2026' } });
  return { lanDau: d, cookie: (await login(username, 'giadinh2026')).cookie };
}

// ===========================================================================
console.log('\n[7] Văn phòng thêm phụ huynh thứ hai cho một bé đã có');
{
  const them = (ck, sid, body) => req('POST', `/api/admin/students/${sid}/phu-huynh`, { cookie: ck, body });
  const r = await them(VP, 's3', { name: 'Trần Thị Thu', phone: '0977 000 111', quanHe: 'Mẹ', email: 'thu@example.vn' });
  check('văn phòng thêm được phụ huynh cho bé Gia Hân → 201', r.status === 201, r.data);
  check('trả tên đăng nhập và mật khẩu tạm MỘT lần',
    !!r.data?.username && MAT_KHAU_TAM.test(r.data?.temporaryPassword || ''), r.data);
  check('tài khoản mới, không phải tài khoản của phụ huynh đang có', r.data?.id && r.data.id !== 'p2', r.data?.id);

  const ph = await vaoPhuHuynhMoi(r.data?.username, r.data?.temporaryPassword);
  check('phụ huynh mới đăng nhập được bằng mật khẩu tạm', ph.lanDau.status === 200, ph.lanDau.status);
  check('và bị buộc đổi mật khẩu ở lần đầu', ph.lanDau.data?.user?.mustChangePassword === true, ph.lanDau.data?.user);
  check('PHỤ HUYNH MỚI THẤY ĐÚNG MỘT BÉ: bé Gia Hân', JSON.stringify(await beCua(ph.cookie)) === '["s3"]',
    await beCua(ph.cookie));
  check('mở được hồ sơ bé Gia Hân', (await req('GET', '/api/students/s3', { cookie: ph.cookie })).status === 200);
  check('KHÔNG mở được hồ sơ bé khác cùng nhóm (canAccessStudent)',
    (await req('GET', '/api/students/s4', { cookie: ph.cookie })).status === 403);
  check('KHÔNG mở được hồ sơ sức khoẻ bé khác',
    (await req('GET', '/api/health?studentId=s1', { cookie: ph.cookie })).status === 403);
  check('phụ huynh đang có của bé vẫn thấy bé như cũ',
    (await beCua((await login('phuhuynh2', '123456')).cookie)).includes('s3'));

  const s3 = (await hoSoNhom(VP, 'c1')).find(s => s.id === 's3') || {};
  const moi = (s3.parents || []).find(p => p.id === r.data?.id);
  check('hồ sơ bé liệt kê hai phụ huynh', (s3.parents || []).length === 2, (s3.parents || []).map(p => p.name));
  check('phụ huynh mới mang đúng quan hệ "Mẹ" và số điện thoại', moi?.quanHe === 'Mẹ' && moi?.phone === '0977 000 111', moi);
  check('thẻ "hồ sơ chưa đủ" thôi đòi bố mẹ cho bé này', !(s3.thieuHoSo || []).includes('bo-me'), s3.thieuHoSo);
  check('email phụ huynh được lưu',
    docDb('SELECT email FROM users WHERE id = ?', r.data?.id)[0]?.email === 'thu@example.vn');

  const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
  check('Nhật ký ghi lượt thêm phụ huynh', nk.some(x => x.action === 'phu-huynh-them' && x.target === 's3'),
    nk.slice(0, 3).map(x => x.action));
  check('và Nhật ký KHÔNG chứa mật khẩu tạm', !JSON.stringify(nk).includes(r.data?.temporaryPassword || '@@'));

  // TRÙNG SỐ ĐIỆN THOẠI KHÔNG ĐƯỢC NỐI VÀO TÀI KHOẢN CÓ SẴN.
  const trung = await them(VP, 's4', { name: 'Người Gõ Trùng Số', phone: '0912 345 678' });
  check('trùng số với một phụ huynh đang có vẫn tạo TÀI KHOẢN MỚI', trung.status === 201 && trung.data?.id !== 'p1', trung.data);
  const cuaPH = await beCua(PH);
  check('và phụ huynh mang số đó KHÔNG được thấy bé Đức Anh (vẫn thấy con mình)',
    cuaPH.includes('s1') && !cuaPH.includes('s4'), cuaPH);

  const truoc = demTaiKhoan();
  const vp2 = await them(VP2, 's3', { name: 'Người Cơ Sở 2', phone: '0977 000 222' });
  check('văn phòng CƠ SỞ KHÁC → 404', vp2.status === 404, vp2.status);
  const ql2 = await them(QL2, 's3', { name: 'Người Cơ Sở 2', phone: '0977 000 222' });
  check('quản lý CƠ SỞ KHÁC → 404', ql2.status === 404, ql2.status);
  for (const [ten, ck] of [['cô', GV], ['phụ huynh', PH], ['nhân sự', NS]]) {
    const x = await them(ck, 's3', { name: `Do ${ten} thêm`, phone: '0977 000 333' });
    check(`${ten} → 403`, x.status === 403, x.status);
  }
  check('thiếu họ tên → 400', (await them(VP, 's3', { name: ' ', phone: '0977 000 444' })).status === 400);
  check('thiếu số điện thoại → 400', (await them(VP, 's3', { name: 'Không Có Số' })).status === 400);
  check('bé không tồn tại → 404', (await them(VP, 's-khong-co', { name: 'Ai Đó', phone: '0977 000 555' })).status === 404);
  check('không lượt bị từ chối nào để lại tài khoản', demTaiKhoan() === truoc, [truoc, demTaiKhoan()]);

  // GIỚI HẠN 4 PHỤ HUYNH MỖI BÉ — quản lý cơ sở và ban giám hiệu cũng làm được.
  const ba = await them(QL1, 's3', { name: 'Phạm Văn Ông', phone: '0977 000 666', quanHe: 'Ông nội' });
  check('quản lý cơ sở thêm được phụ huynh thứ ba', ba.status === 201, ba.status);
  const bon = await them(BGH, 's3', { name: 'Phạm Thị Bà', phone: '0977 000 777', quanHe: 'Bà nội' });
  check('ban giám hiệu thêm được phụ huynh thứ tư', bon.status === 201, bon.status);
  const truoc5 = demTaiKhoan();
  const nam = await them(VP, 's3', { name: 'Người Thứ Năm', phone: '0977 000 888' });
  check('phụ huynh thứ năm → 400', nam.status === 400, nam.status);
  check('câu từ chối nói rõ giới hạn 4', /4/.test(nam.data?.error || ''), nam.data);
  check('và không tạo tài khoản nào', demTaiKhoan() === truoc5, [truoc5, demTaiKhoan()]);
}

// ===========================================================================
console.log('\n[8] Nghỉ học bảo lưu — cùng hiệu ứng với "Cho nghỉ", rồi đi học lại');
{
  const baoLuu = (ck, sid, body) => req('POST', `/api/admin/students/${sid}/bao-luu`, { cookie: ck, body });
  const homNay = HOM_NAY();
  const quayLai = `${Number(homNay.slice(0, 4)) + 1}-01`;
  const diemDanhS6 = () => docDb('SELECT COUNT(*) AS n FROM attendance WHERE studentId = ?', 's6')[0].n;
  const soDiemDanh = diemDanhS6();
  check('đối chứng — bé Gia Bảo có sẵn dữ liệu điểm danh cũ', soDiemDanh > 0, soDiemDanh);

  check('cô → 403', (await baoLuu(GV, 's6', {})).status === 403);
  check('văn phòng cơ sở khác → 404', (await baoLuu(VP2, 's6', {})).status === 404);
  check('tháng dự kiến quay lại sai dạng → 400', (await baoLuu(VP, 's6', { duKienQuayLai: 'tháng sau' })).status === 400);
  check('ngày bắt đầu bảo lưu ở tương lai → 400',
    (await baoLuu(VP, 's6', { tuNgay: `${Number(homNay.slice(0, 4)) + 1}-01-05` })).status === 400);
  check('sau các lượt bị từ chối bé vẫn đang học', (await hoSoNhom(BGH, 'c1')).some(s => s.id === 's6'));

  const r = await baoLuu(VP, 's6', { tuNgay: homNay, duKienQuayLai: quayLai, lyDo: 'Gia đình về quê một thời gian' });
  check('văn phòng cho bé Gia Bảo nghỉ học bảo lưu → 200', r.status === 200, r.data);
  check('bé ra khỏi danh sách đang học của nhóm', !(await hoSoNhom(BGH, 'c1')).some(s => s.id === 's6'));
  const so = (await req('GET', `/api/attendance/class?classId=c1&date=${homNay}`, { cookie: GV })).data;
  const trongSo = ((so || {}).students || []).map(x => x.student.id);
  check('bé ra khỏi sổ điểm danh hôm nay của cô (các bé khác vẫn còn)',
    trongSo.includes('s1') && !trongSo.includes('s6'), trongSo);
  const cuaCo = await beCua(GV);
  check('cô thôi thấy bé trong danh sách bé của mình', cuaCo.includes('s1') && !cuaCo.includes('s6'), cuaCo);
  check('DỮ LIỆU CŨ CÒN NGUYÊN — điểm danh cũ không mất dòng nào', diemDanhS6() === soDiemDanh, [soDiemDanh, diemDanhS6()]);
  check('hồ sơ bé còn trong cơ sở dữ liệu', docDb('SELECT id FROM students WHERE id = ?', 's6').length === 1);

  // Nghỉ hẳn một bé khác bằng đường cũ, để so hai kiểu nghỉ.
  check('cho nghỉ hẳn bé Khánh Vy bằng đường cũ', (await req('DELETE', '/api/admin/students/s5', { cookie: VP })).status === 200);
  const daNghi = await hoSoNhom(VP, 'c1', true);
  const s6 = daNghi.find(s => s.id === 's6') || {};
  const s5 = daNghi.find(s => s.id === 's5') || {};
  check('danh sách đã nghỉ có nhãn bảo lưu cho bé Gia Bảo',
    s6.baoLuu?.tuNgay === homNay && s6.baoLuu?.duKienQuayLai === quayLai && /về quê/.test(s6.baoLuu?.lyDo || ''), s6.baoLuu);
  check('bé nghỉ hẳn KHÔNG mang nhãn bảo lưu', s5.active === false && !s5.baoLuu, s5.baoLuu);
  check('bé đang nghỉ thì không bảo lưu thêm lần nữa → 400', (await baoLuu(VP, 's5', {})).status === 400);

  // Gia đình của bé bảo lưu thấy ĐÚNG như gia đình của bé nghỉ hẳn — không luật mới.
  const giaDinhBaoLuu = (await login('ph.minh', '123456')).cookie;
  const giaDinhNghi = (await login('ph.lan', '123456')).cookie;
  const nhin = async (ck, sid) => [
    (await beCua(ck)).includes(sid),
    (await req('GET', `/api/students/${sid}`, { cookie: ck })).status,
  ];
  check('gia đình bé bảo lưu và gia đình bé nghỉ hẳn thấy y như nhau',
    JSON.stringify(await nhin(giaDinhBaoLuu, 's6')) === JSON.stringify(await nhin(giaDinhNghi, 's5')),
    [await nhin(giaDinhBaoLuu, 's6'), await nhin(giaDinhNghi, 's5')]);

  const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
  check('Nhật ký ghi lượt bảo lưu', nk.some(x => x.action === 'student-bao-luu' && x.target === 's6'));

  // ĐI HỌC LẠI = đúng đường "Nhận lại" đang có.
  const lai = await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
  check('văn phòng cho bé đi học lại → 200', lai.status === 200, lai.status);
  check('bé trở lại danh sách đang học của nhóm', (await hoSoNhom(BGH, 'c1')).some(s => s.id === 's6'));
  check('cô thấy lại bé', (await beCua(GV)).includes('s6'));
  check('dòng bảo lưu đã hết', docDb('SELECT * FROM hoc_sinh_bao_luu WHERE studentId = ?', 's6').length === 0);
  check('và hồ sơ không còn nhãn bảo lưu', !((await hoSoNhom(BGH, 'c1')).find(s => s.id === 's6') || {}).baoLuu);
  check('điểm danh cũ vẫn đủ sau khi đi học lại', diemDanhS6() === soDiemDanh);
  check('nhận lại bé nghỉ hẳn vẫn chạy như cũ',
    (await req('PUT', '/api/admin/students/s5', { cookie: VP, body: { active: true } })).status === 200);
}

// ===========================================================================
console.log('\n[8b] Bé đang bảo lưu chốt nghỉ hẳn — hết nhãn "Bảo lưu", giữ ngày nghỉ (Đ239-vá3)');
{
  const thoi = (ck, sid) => req('POST', `/api/admin/students/${sid}/thoi-bao-luu`, { cookie: ck });
  const baoLuu = (ck, sid) => req('POST', `/api/admin/students/${sid}/bao-luu`, { cookie: ck, body: { lyDo: 'Ốm dài ngày' } });
  const dongBL = (sid) => docDb('SELECT * FROM hoc_sinh_bao_luu WHERE studentId = ?', sid);
  const beNghi = async (sid) => (await hoSoNhom(BGH, 'c1', true)).find(s => s.id === sid) || {};
  const ghiDb = (sql, ...thamSo) => {
    const d = new Database(path.join(DIR, 'school.db'), { fileMustExist: true });
    try { d.prepare(sql).run(...thamSo); } finally { d.close(); }
  };
  // Bé bảo lưu từ đầu tháng 9 năm trước — ngày nghỉ khác hẳn hôm nay, để thấy được nó không bị đổi.
  const ngayNghi = `${Number(HOM_NAY().slice(0, 4)) - 1}-09-01`;

  check('(đối chứng) văn phòng ghi bảo lưu cho bé Gia Bảo', (await baoLuu(VP, 's6')).status === 200);
  ghiDb('UPDATE students SET leftAt = ? WHERE id = ?', ngayNghi, 's6');
  check('(đối chứng) bé mang nhãn bảo lưu, ngày nghỉ là ngày cũ',
    !!(await beNghi('s6')).baoLuu && (await beNghi('s6')).leftAt === ngayNghi, await beNghi('s6'));

  check('cô → 403', (await thoi(GV, 's6')).status === 403);
  check('phụ huynh → 403', (await thoi(PH, 's6')).status === 403);
  check('nhân sự (không mở hồ sơ bé) → 403', (await thoi(NS, 's6')).status === 403);
  check('văn phòng cơ sở khác → 404', (await thoi(VP2, 's6')).status === 404);
  check('quản lý cơ sở khác → 404', (await thoi(QL2, 's6')).status === 404);
  check('sau các lượt bị từ chối bé vẫn bảo lưu', dongBL('s6').length === 1);

  const r = await thoi(VP, 's6');
  check('văn phòng bấm "Thôi bảo lưu, nghỉ hẳn" → 200', r.status === 200, r.data);
  const sau = await beNghi('s6');
  check('HẾT NHÃN BẢO LƯU', !sau.baoLuu && dongBL('s6').length === 0, sau.baoLuu);
  check('bé vẫn nghỉ học', sau.active === false && !(await hoSoNhom(BGH, 'c1')).some(s => s.id === 's6'), sau.active);
  check('NGÀY NGHỈ GIỮ NGUYÊN', sau.leftAt === ngayNghi, sau.leftAt);
  const nk = (await req('GET', '/api/admin/audit', { cookie: BGH })).data || [];
  check('Nhật ký ghi lượt thôi bảo lưu', nk.some(x => x.action === 'student-thoi-bao-luu' && x.target === 's6'),
    nk.slice(0, 3).map(x => x.action));
  check('bé không còn bảo lưu → bấm lần nữa 400', (await thoi(VP, 's6')).status === 400);
  check('bé đang học → 400', (await thoi(VP, 's1')).status === 400);

  // Hai đường "nghỉ hẳn" cũ, nếu gọi trên bé đang bảo lưu, cũng không để nhãn bảo lưu sót lại.
  await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
  check('(đối chứng) bảo lưu lại', (await baoLuu(VP, 's6')).status === 200 && dongBL('s6').length === 1);
  check('"Cho nghỉ" (DELETE) trên bé đang bảo lưu → 200', (await req('DELETE', '/api/admin/students/s6', { cookie: VP })).status === 200);
  check('và hết nhãn bảo lưu, bé vẫn nghỉ', !(await beNghi('s6')).baoLuu && (await beNghi('s6')).active === false, await beNghi('s6'));
  await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
  check('(đối chứng) bảo lưu lại lần nữa', (await baoLuu(VP, 's6')).status === 200 && dongBL('s6').length === 1);
  check('PUT {active:false} trên bé đang bảo lưu → 200',
    (await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: false } })).status === 200);
  check('và hết nhãn bảo lưu, bé vẫn nghỉ', !(await beNghi('s6')).baoLuu && (await beNghi('s6')).active === false, await beNghi('s6'));
  check('"Cho nghỉ" trên bé đang học vẫn như cũ',
    (await req('DELETE', '/api/admin/students/s5', { cookie: VP })).status === 200 && (await beNghi('s5')).active === false);
  await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
  await req('PUT', '/api/admin/students/s5', { cookie: VP, body: { active: true } });
}

// ===========================================================================
// Bảo lưu GHI LÙI ngày (bé đã thôi đến lớp từ mấy hôm trước) rồi gia đình báo
// không quay lại: ngày nghỉ đang là hôm bấm Bảo lưu, muộn hơn ngày bắt đầu bảo
// lưu. Giữ nguyên ngày ấy thì tệp Xuất báo cáo đổi "Bảo lưu từ <ngày bắt đầu>"
// thành "Nghỉ từ <hôm bấm>" và đếm mấy ngày ở giữa là "Chưa điểm danh".
console.log('\n[8c] Thôi bảo lưu một bảo lưu ghi lùi ngày — bé tính là nghỉ từ ngày bắt đầu bảo lưu (Đ239-vá4)');
{
  const thoi = (ck, sid) => req('POST', `/api/admin/students/${sid}/thoi-bao-luu`, { cookie: ck });
  const baoLuu = (ck, sid, body) => req('POST', `/api/admin/students/${sid}/bao-luu`, { cookie: ck, body });
  const ngayNghiCua = (sid) => (docDb('SELECT leftAt FROM students WHERE id = ?', sid)[0] || {}).leftAt;
  const homNay = HOM_NAY();
  const lui = (n) => new Date(Date.parse(`${homNay}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
  const dmy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  // Số ngày thứ Hai – thứ Sáu trong [tu, truoc).
  const soNgayThuong = (tu, truoc) => {
    let n = 0;
    for (let t = Date.parse(`${tu}T00:00:00Z`); t < Date.parse(`${truoc}T00:00:00Z`); t += 86400000) {
      if ([1, 2, 3, 4, 5].includes(new Date(t).getUTCDay())) n += 1;
    }
    return n;
  };
  const tuNgay = lui(5);
  // Một bé nhóm c1 nhận từ lâu và CHƯA có dòng điểm danh nào: mọi ngày thường
  // trước ngày nghỉ đều là "Chưa điểm danh", nên đếm sai một ngày là thấy ngay.
  {
    const d = new Database(path.join(DIR, 'school.db'), { fileMustExist: true });
    try {
      d.prepare(`INSERT INTO students (id, code, name, dob, gender, classId, active, leftAt, createdAt)
        VALUES ('sgl', 'MNGL', 'Bé Ghi Lùi', '2022-02-02', 'Nữ', 'c1', 1, NULL, ?)`).run(`${lui(400)}T00:00:00.000Z`);
    } finally { d.close(); }
  }
  const xlsx = require_(path.join(GOC, 'lib', 'xlsx.js'));
  const tongHop = async (tu) => {
    const r = await fetch(`${sv.BASE}/api/xuatbaocao/diemdanh-be?pham=nhom&classId=c1&tu=${tu}&den=${homNay}&kieu=trangthai`,
      { headers: { Cookie: BGH } });
    if (r.status !== 200) return { status: r.status };
    const hang = (xlsx.doc(Buffer.from(await r.arrayBuffer()))[0] || { hang: [] }).hang;
    const tieuDe = hang[0] || [];
    const dong = hang.find(h => h && h[1] === 'Bé Ghi Lùi') || [];
    return { status: 200, chua: dong[tieuDe.indexOf('Chưa điểm danh')], ghiChu: dong[tieuDe.indexOf('Ghi chú')] };
  };

  const bl = await baoLuu(VP, 'sgl', { tuNgay, lyDo: 'Ốm dài ngày' });
  check('(đối chứng) văn phòng ghi bảo lưu lùi 5 ngày → 200', bl.status === 200, bl.data);
  check('(đối chứng) ngày nghỉ là hôm bấm, muộn hơn ngày bắt đầu bảo lưu',
    ngayNghiCua('sgl') === homNay && (docDb('SELECT tuNgay FROM hoc_sinh_bao_luu WHERE studentId = ?', 'sgl')[0] || {}).tuNgay === tuNgay,
    ngayNghiCua('sgl'));
  check('(đối chứng) khoảng từ ngày bắt đầu bảo lưu tới hôm nay có ngày thường để đếm', soNgayThuong(tuNgay, homNay) > 0);

  const r = await thoi(VP, 'sgl');
  check('thôi bảo lưu → 200', r.status === 200, r.data);
  check('NGÀY NGHỈ LÙI VỀ NGÀY BẮT ĐẦU BẢO LƯU', ngayNghiCua('sgl') === tuNgay, [ngayNghiCua('sgl'), tuNgay]);
  check('bé vẫn nghỉ, hết nhãn bảo lưu',
    docDb('SELECT active FROM students WHERE id = ?', 'sgl')[0].active === 0
      && docDb('SELECT * FROM hoc_sinh_bao_luu WHERE studentId = ?', 'sgl').length === 0);

  const sau = await tongHop(tuNgay);
  check(`xuất điểm danh sau khi thôi: ghi chú "Nghỉ từ ${dmy(tuNgay)}"`,
    sau.status === 200 && sau.ghiChu === `Nghỉ từ ${dmy(tuNgay)}`, sau);
  check('…và không đếm "Chưa điểm danh" từ ngày bắt đầu bảo lưu', sau.chua === '0', sau);
  const rong = await tongHop(lui(12));
  check('khoảng bắt đầu sớm hơn: chỉ ngày thường TRƯỚC ngày bắt đầu bảo lưu là "Chưa điểm danh"',
    rong.status === 200 && rong.chua === String(soNgayThuong(lui(12), tuNgay)), [rong, soNgayThuong(lui(12), tuNgay)]);

  // Bảo lưu KHÔNG ghi lùi: ngày nghỉ đã là ngày bắt đầu bảo lưu, giữ nguyên.
  check('(đối chứng) bảo lưu bé Gia Bảo từ hôm nay', (await baoLuu(VP, 's6', {})).status === 200 && ngayNghiCua('s6') === homNay);
  check('thôi bảo lưu không ghi lùi → 200', (await thoi(VP, 's6')).status === 200);
  check('…ngày nghỉ giữ nguyên', ngayNghiCua('s6') === homNay, ngayNghiCua('s6'));
  await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
}

// ===========================================================================
console.log('\n[9] Văn phòng nhận bé nhập ĐỦ thông tin, kể cả phụ huynh thứ hai');
{
  const truoc = demTaiKhoan();
  const goi = {
    hoTen: 'Trần Minh Khang', classId: 'c1', tenLop: 'Chồi 2', ngaySinh: '2023-05-01', gioiTinh: 'Nam',
    phHoTen: 'Trần Văn Bố', phSdt: '0966 111 222', phEmail: 'bo.khang@example.vn', phQuanHe: 'Bố',
    diaChi: '1 Ngõ Thử', danToc: 'Tày', nhomMau: 'A', soDinhDanh: '001223000111',
    tienSuBenh: 'Dị ứng tôm', lienHeKhanCap: [{ hoTen: 'Trần Thị Bà', quanHe: 'Bà nội', dienThoai: '0909 000 111' }],
    phuHuynh2: { name: 'Nguyễn Thị Mẹ', phone: '0966 333 444', quanHe: 'Mẹ' },
  };
  const thieuSo = await req('POST', '/api/admin/students', {
    cookie: VP, body: { ...goi, phuHuynh2: { name: 'Mẹ Không Số' } },
  });
  check('phụ huynh thứ hai thiếu số điện thoại → 400, và nói đúng ô thiếu',
    thieuSo.status === 400 && /thứ hai.*số điện thoại/i.test(thieuSo.data?.error || ''), thieuSo.data);
  const trungSo = await req('POST', '/api/admin/students', {
    cookie: VP, body: { ...goi, phuHuynh2: { name: 'Mẹ Trùng Số', phone: '0966111222' } },
  });
  check('phụ huynh thứ hai trùng số với phụ huynh thứ nhất → 400',
    trungSo.status === 400 && /trùng/i.test(trungSo.data?.error || ''), trungSo.data);
  check('hai lượt bị từ chối không tạo bé nào, không tạo tài khoản nào',
    demTaiKhoan() === truoc && !docDb('SELECT id FROM students WHERE name = ?', 'Trần Minh Khang').length);

  const r = await req('POST', '/api/admin/students', { cookie: VP, body: goi });
  check('văn phòng nhận bé đủ thông tin → 201', r.status === 201, r.data);
  check('trả mật khẩu tạm của phụ huynh thứ nhất', MAT_KHAU_TAM.test(r.data?.taiKhoan?.matKhau || ''), r.data?.taiKhoan);
  const tk2 = r.data?.taiKhoanPhuHuynh2;
  check('VÀ của phụ huynh thứ hai, cùng lúc', !!tk2?.username && MAT_KHAU_TAM.test(tk2?.matKhau || ''), tk2);
  check('tạo đúng hai tài khoản', demTaiKhoan() === truoc + 2, [truoc, demTaiKhoan()]);

  const be = (await hoSoNhom(VP, 'c1')).find(s => s.id === r.data?.id) || {};
  check('dân tộc và nhóm máu được lưu', be.ethnicity === 'Tày' && be.bloodType === 'A', [be.ethnicity, be.bloodType]);
  check('số định danh và tiền sử bệnh được lưu', be.soDinhDanh === '001223000111' && be.tienSuBenh === 'Dị ứng tôm',
    [be.soDinhDanh, be.tienSuBenh]);
  check('liên hệ khẩn cấp được lưu',
    (be.lienHeKhanCap || []).length === 1 && be.lienHeKhanCap[0].hoTen === 'Trần Thị Bà' && be.lienHeKhanCap[0].quanHe === 'Bà nội',
    be.lienHeKhanCap);
  const quanHe = (be.parents || []).map(p => p.quanHe).sort();
  check('bé có hai phụ huynh, mang đúng quan hệ Bố và Mẹ', JSON.stringify(quanHe) === '["Bố","Mẹ"]', be.parents);
  check('hồ sơ đủ ngay từ lúc nhận — không còn món nào phải đòi', (be.thieuHoSo || []).length === 0, be.thieuHoSo);
  check('email phụ huynh thứ nhất được lưu',
    docDb("SELECT email FROM users WHERE role = 'parent' AND name = ?", 'Trần Văn Bố')[0]?.email === 'bo.khang@example.vn');

  const me = await vaoPhuHuynhMoi(tk2?.username, tk2?.matKhau);
  check('phụ huynh thứ hai đăng nhập và thấy đúng bé vừa nhận', JSON.stringify(await beCua(me.cookie)) === JSON.stringify([r.data?.id]),
    await beCua(me.cookie));

  // ĐỐI CHỨNG LUẬT CŨ: nhập được, nhưng SỬA nhân thân sau đó thì không.
  for (const [k, v] of [['ethnicity', 'Kinh'], ['soDinhDanh', '009999999999'], ['name', 'Tên Khác']]) {
    const sua = await req('PUT', `/api/admin/students/${r.data?.id}`, { cookie: VP, body: { [k]: v } });
    check(`văn phòng SỬA "${k}" sau khi nhận → vẫn 403`, sua.status === 403, sua.status);
  }
  const ql = await req('PUT', `/api/admin/students/${r.data?.id}`, { cookie: QL1, body: { ethnicity: 'Kinh' } });
  check('quản lý cơ sở thì sửa được như cũ', ql.status === 200, ql.status);
}

// ===========================================================================
console.log('\n[10] Quản lý cơ sở cấp lại mật khẩu cho cô mình tạo mà chưa phân nhóm');
{
  const capLai = (ck, id) => req('POST', `/api/accounts/${id}/reset-password`, { cookie: ck });
  const co = await req('POST', '/api/admin/teachers', { cookie: QL1, body: { name: 'Cô Chưa Có Nhóm' } });
  check('quản lý CS1 tạo cô chưa gán nhóm', co.status === 201, co.status);
  const ok = await capLai(QL1, co.data?.id);
  check('QUẢN LÝ CS1 CẤP LẠI ĐƯỢC mật khẩu cho cô ấy', ok.status === 200 && MAT_KHAU_TAM.test(ok.data?.temporaryPassword || ''),
    ok.status);
  check('quản lý CƠ SỞ KHÁC thì không', (await capLai(QL2, co.data?.id)).status === 403);
  check('văn phòng cơ sở thì không (như cũ)', (await capLai(VP, co.data?.id)).status === 403);

  const coBgh = await req('POST', '/api/admin/teachers', { cookie: BGH, body: { name: 'Cô Ban Giám Hiệu Tạo' } });
  check('cô chưa nhóm do ban giám hiệu tạo: quản lý cơ sở vẫn KHÔNG cấp lại được (như cũ)',
    (await capLai(QL1, coBgh.data?.id)).status === 403);

  // Cô đã có nhóm thì nhóm mới là sự thật: phân sang cơ sở 2 là QL1 hết quyền.
  await req('PUT', '/api/admin/classes/c3/teachers', { cookie: BGH, body: { teacherIds: [co.data?.id], chinhId: co.data?.id } });
  check('cô được phân sang nhóm Cơ sở 2 thì quản lý CS1 hết cấp lại được',
    (await capLai(QL1, co.data?.id)).status === 403);
  check('và quản lý CS2 cấp lại được', (await capLai(QL2, co.data?.id)).status === 200);

  // Đ239-vá3: chuyển năm học đóng nhóm Cơ sở 2 của cô. Cô không còn nhóm ĐANG
  // MỞ nào, nhưng đã TỪNG được phân nhóm — dòng "do quản lý CS1 tạo" không được
  // sống lại: quản lý CS1 từng thấy lại cô, cấp lại mật khẩu, kéo cô về nhóm mình.
  dongNhom(DIR, 'c3');
  const moiDs = async (ck) => ((await req('GET', '/api/admin/teachers', { cookie: ck })).data || []).map(t => t.id);
  const bghThay = ((await req('GET', '/api/admin/teachers', { cookie: BGH })).data || []).find(t => t.id === co.data?.id);
  check('(đối chứng) nhóm Cơ sở 2 đã đóng: cô không còn nhóm đang mở, ban giám hiệu vẫn thấy cô',
    !!bghThay && (bghThay.classIds || []).length === 0, bghThay);
  check('QUẢN LÝ CS1 KHÔNG thấy lại cô trong danh sách cô', !(await moiDs(QL1)).includes(co.data?.id), await moiDs(QL1));
  const capLaiSau = await capLai(QL1, co.data?.id);
  check('quản lý CS1 KHÔNG cấp lại được mật khẩu cho cô', [403, 404].includes(capLaiSau.status), capLaiSau.status);
  const coC1 = docDb('SELECT teacherId FROM class_teachers WHERE classId = ?', 'c1').map(r => r.teacherId);
  const keo = await req('PUT', '/api/admin/classes/c1/teachers', { cookie: QL1, body: { teacherIds: [...coC1, co.data?.id] } });
  check('quản lý CS1 KHÔNG kéo được cô vào nhóm của mình → 404', keo.status === 404, keo.status);
  check('và cô không có dòng phân công nào ở Chồi 2',
    !docDb('SELECT teacherId FROM class_teachers WHERE classId = ?', 'c1').some(r => r.teacherId === co.data?.id));
  check('quản lý CS2 cũng không còn thấy cô (nhóm của cô đã đóng)', !(await moiDs(QL2)).includes(co.data?.id));
  check('ban giám hiệu vẫn cấp lại được mật khẩu cho cô', (await capLai(BGH, co.data?.id)).status === 200);

  // Cô MỚI do quản lý CS1 tạo, chưa từng có nhóm: vẫn thấy và cấp lại được (Đ239d1/d2).
  const coMoi2 = await req('POST', '/api/admin/teachers', { cookie: QL1, body: { name: 'Cô Mới Sau Năm Học' } });
  check('cô mới tạo chưa nhóm: quản lý CS1 vẫn thấy', coMoi2.status === 201 && (await moiDs(QL1)).includes(coMoi2.data?.id), coMoi2.status);
  check('và vẫn cấp lại được mật khẩu', (await capLai(QL1, coMoi2.data?.id)).status === 200);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
