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
import path from 'path';
import { createRequire } from 'module';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu,
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

sv.dung();
donThuMucTam(DIR);
tongKet();
