// Bài canh TẦNG CƠ SỞ Ở CÁC ĐƯỜNG QUẢN TRỊ (N15).
//
// Chạy bằng:  npm run test:co-so-quan-tri
//
// VÌ SAO CÓ BÀI NÀY, KHI ĐÃ CÓ test/co-so.test.mjs
//
// `test:co-so` canh tầng cơ sở ở các đường LÀM VIỆC HÀNG NGÀY — thứ cô và phụ
// huynh đi qua. Nó xanh suốt, mà lỗ hổng vẫn ở đó: `routes/admin.js` hỏi THẲNG
// bảng `students`, `classes`, `users` bằng db.all/db.first, nên đi vòng qua cả
// ba hàm đã canh (`db.studentsOf`, `db.canAccessStudent`, `db.classIdsOf`).
//
// Hậu quả đo được, trước khi vá: quản trị Cấp 3 của cơ sở 1 gọi
// GET /api/admin/students nhận đủ 8 bé của cả hai cơ sở — KÈM SỐ ĐỊNH DANH VÀ
// TIỀN SỬ BỆNH; PUT và DELETE trên bé của cơ sở khác đều trả 200. Trong khi
// GET /api/students/:id ngay cạnh trả đúng 403.
//
// VÀ MỘT LỖI NẶNG HƠN TẤT CẢ NHỮNG THỨ TRÊN
//
// POST /api/accounts/:id/reset-password trả THẲNG mật khẩu tạm về cho người
// bấm — phải thế, vì cô đọc nó qua điện thoại cho phụ huynh. Cộng với luật cũ
// "quản trị thì cấp lại được cho mọi người", một tài khoản Cấp 3 chỉ cần ba
// lời gọi để thành Cấp 1: xem danh sách quản trị, cấp lại mật khẩu cho tài
// khoản Cấp 1, đăng nhập bằng chính mật khẩu vừa nhận. Đã dựng lại được và
// thành công. Mọi chốt chặn khác của tầng cơ sở đều vô nghĩa khi lối này còn
// mở, nên mục [5] là mục quan trọng nhất của cả bài.
//
// MỤC [7] LÀ MỤC KHÔNG ĐƯỢC BỎ
//
// Nó không thử một tình huống nào cả — nó ĐỌC MÃ NGUỒN và bắt mọi đường trong
// routes/admin.js phải đi qua một trong các hàm canh. Thêm một đường mới mà
// quên canh thì bài này đỏ ngay, kể cả khi chưa ai kịp nghĩ ra tình huống để
// thử. Đó là cách duy nhất để lỗ hổng này không mọc lại sau vài tháng.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo, dongNhom } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('co-so-quan-tri');
sinhDuLieu(DIR);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');     // Cấp 1
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');      // Cấp 3, cơ sở 1
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3957), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, mkTam) {
  const d = await login(u, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const C3 = await vao('quanlycs1', mk3);

// Dựng bối cảnh hai cơ sở có bé thật: nhóm Lá 1 (c2) sang cơ sở 2.
// s2, s7, s8 học Lá 1 -> thuộc cơ sở 2. s1, s3, s4, s5, s6 học Chồi 2 -> cơ sở 1.
await req('PUT', '/api/admin/classes/c2/campus', { cookie: C1, body: { campusId: 'cs2' } });

// ===========================================================================
console.log('\n[1] Đọc: quản lý cơ sở chỉ thấy bé của cơ sở mình');
{
  const cua3 = await req('GET', '/api/admin/students', { cookie: C3 });
  const ten = (cua3.data || []).map(s => s.name);
  check('danh sách bé của Cấp 3 không rỗng', ten.length > 0, ten.length);
  check('KHÔNG có bé nào của cơ sở 2 trong danh sách',
    !ten.some(t => ['Nguyễn Bảo Nam', 'Bùi Minh Thư', 'Vũ Hải Đăng'].includes(t)), ten);
  check('KHÔNG số định danh nào của cơ sở khác lọt ra',
    !JSON.stringify(cua3.data || []).includes('079321005678'));
  check('KHÔNG tiền sử bệnh nào của cơ sở khác lọt ra',
    !/tôm cua/i.test(JSON.stringify(cua3.data || [])));

  const cua1 = await req('GET', '/api/admin/students', { cookie: C1 });
  check('CẤP 1 VẪN THẤY CẢ TRƯỜNG — tầng cơ sở không lấy bớt quyền cũ',
    (cua1.data || []).length > (cua3.data || []).length,
    [(cua1.data || []).length, (cua3.data || []).length]);

  // Hỏi thẳng theo classId của cơ sở khác cũng không được.
  const hoiThang = await req('GET', '/api/admin/students?classId=c2', { cookie: C3 });
  check('hỏi thẳng bằng mã nhóm của cơ sở khác thì trả về rỗng',
    (hoiThang.data || []).length === 0, hoiThang.data);
}

// ===========================================================================
console.log('\n[2] Ghi: không sửa, không cho nghỉ học bé của cơ sở khác');
{
  const sua = await req('PUT', '/api/admin/students/s2', { cookie: C3, body: { name: 'Bị sửa trộm' } });
  check('CẤP 3 KHÔNG SỬA ĐƯỢC hồ sơ bé cơ sở khác', sua.status === 404, sua.status);

  const conNguyen = await req('GET', '/api/students/s2', { cookie: C1 });
  check('và tên bé đó còn nguyên', conNguyen.data?.name === 'Nguyễn Bảo Nam', conNguyen.data?.name);

  const xoa = await req('DELETE', '/api/admin/students/s2', { cookie: C3 });
  check('CẤP 3 KHÔNG CHO NGHỈ HỌC ĐƯỢC bé cơ sở khác', xoa.status === 404, xoa.status);
  check('và bé đó vẫn đang học',
    (await req('GET', '/api/students/s2', { cookie: C1 })).data?.active !== false);

  // Nhưng bé của chính mình thì vẫn làm việc bình thường.
  const cuaMinh = await req('PUT', '/api/admin/students/s1', { cookie: C3, body: { name: 'Nguyễn Bảo An' } });
  check('bé của cơ sở mình thì sửa bình thường', cuaMinh.status === 200, cuaMinh.status);

  // Số CCCD của phụ huynh cơ sở khác cũng không chạm được (N16 đi qua N15).
  const cccd = await req('PUT', '/api/admin/parents/p6/cccd', { cookie: C3, body: { soCccd: '1' } });
  check('KHÔNG ghi được số CCCD của phụ huynh cơ sở khác', cccd.status === 404, cccd.status);
}

// ===========================================================================
console.log('\n[3] Nhóm lớp và cô: cùng ranh giới');
{
  const suaNhom = await req('PUT', '/api/admin/classes/c2', { cookie: C3, body: { name: 'Đổi trộm' } });
  check('KHÔNG sửa được nhóm của cơ sở khác', suaNhom.status === 404, suaNhom.status);

  const ganCo = await req('PUT', '/api/admin/classes/c2/teachers', { cookie: C3, body: { teacherIds: [] } });
  check('KHÔNG phân công cô cho nhóm của cơ sở khác', ganCo.status === 404, ganCo.status);

  const chuyen = await req('PUT', '/api/admin/classes/c1/campus', { cookie: C3, body: { campusId: 'cs2' } });
  check('KHÔNG chuyển được nhóm sang cơ sở khác — đó là vẽ lại ranh giới',
    chuyen.status === 403, chuyen.status);

  // NHÓM MỚI DO CẤP 3 TẠO PHẢI VÀO NGAY CƠ SỞ CỦA HỌ.
  // Không thế thì chính người vừa tạo cũng không thấy lại nhóm mình vừa tạo.
  const tao = await req('POST', '/api/admin/classes', { cookie: C3, body: { name: 'Nhà trẻ 1' } });
  check('Cấp 3 tạo được nhóm mới', tao.status === 201, tao.data);
  const ov = await req('GET', '/api/admin/overview', { cookie: C3 });
  const moi = (ov.data?.classes || []).find(c => c.name === 'Nhà trẻ 1');
  check('NHÓM VỪA TẠO HIỆN NGAY TRÊN MÀN HÌNH CỦA CHÍNH NGƯỜI TẠO', !!moi, ov.data?.classes?.map(c => c.name));
  check('và nó thuộc đúng cơ sở của người tạo', moi?.campusId === 'cs1', moi?.campusId);

  // Danh sách cô cũng theo cơ sở.
  const co3 = await req('GET', '/api/admin/teachers', { cookie: C3 });
  const co1 = await req('GET', '/api/admin/teachers', { cookie: C1 });
  check('Cấp 3 chỉ thấy cô của cơ sở mình', (co3.data || []).length < (co1.data || []).length,
    [(co3.data || []).length, (co1.data || []).length]);

  const taoCo = await req('POST', '/api/admin/teachers', {
    cookie: C3, body: { name: 'Cô Thử Nghiệm', classId: 'c2' },
  });
  check('KHÔNG tạo được cô rồi gắn thẳng vào nhóm của cơ sở khác', taoCo.status === 404, taoCo.status);
}

// ===========================================================================
console.log('\n[4] Màn Tổng quan nói SỐ CỦA CƠ SỞ MÌNH, không phải số toàn trường');
{
  const ov3 = await req('GET', '/api/admin/overview', { cookie: C3 });
  const ov1 = await req('GET', '/api/admin/overview', { cookie: C1 });
  check('số bé của Cấp 3 nhỏ hơn số bé toàn trường',
    ov3.data.counts.students < ov1.data.counts.students,
    [ov3.data.counts.students, ov1.data.counts.students]);
  check('số nhóm cũng vậy', ov3.data.counts.classes < ov1.data.counts.classes,
    [ov3.data.counts.classes, ov1.data.counts.classes]);
  check('danh sách nhóm không chứa nhóm của cơ sở khác',
    !(ov3.data.classes || []).some(c => c.id === 'c2'), (ov3.data.classes || []).map(c => c.id));
  check('nhưng VẪN thấy danh sách cơ sở — cần biết mình đang ở đâu',
    (ov3.data.campuses || []).length === 3, (ov3.data.campuses || []).length);
}

// ===========================================================================
console.log('\n[5] LỐI LEO THANG QUYỀN — mục quan trọng nhất của cả bài');
{
  const ds = await req('GET', '/api/admin/managers', { cookie: C3 });
  const ht = (ds.data || []).find(u => u.username === 'hieutruong');
  check('tìm thấy tài khoản Cấp 1 để thử', !!ht, ds.data);

  const cuop = await req('POST', `/api/accounts/${ht.id}/reset-password`, { cookie: C3 });
  check('CẤP 3 KHÔNG ĐẶT LẠI ĐƯỢC MẬT KHẨU CỦA CẤP 1', cuop.status === 403, cuop.status);
  check('và máy chủ KHÔNG trả về mật khẩu tạm nào',
    !cuop.data?.temporaryPassword, cuop.data?.temporaryPassword);
  check('tài khoản Cấp 1 vẫn đăng nhập được bằng mật khẩu cũ',
    !!(await login('hieutruong', 'quantri2026')).cookie);

  // Cả tài khoản quản trị Cấp 3 khác cũng không — chiếm được là chiếm cả cơ sở.
  const themC3 = taoQuanTri(DIR, 'Quản lý CS2', 'quanlycs2');
  void themC3;   // chỉ cần tài khoản tồn tại
  const ds2 = await req('GET', '/api/admin/managers', { cookie: C3 });
  const khac = (ds2.data || []).find(u => u.username === 'quanlycs2');
  if (khac) {
    const cuop2 = await req('POST', `/api/accounts/${khac.id}/reset-password`, { cookie: C3 });
    check('CẤP 3 KHÔNG ĐẶT LẠI MẬT KHẨU CỦA MỘT QUẢN TRỊ NÀO KHÁC', cuop2.status === 403, cuop2.status);
  }

  // Phụ huynh của cơ sở khác cũng không.
  const phKhac = await req('POST', '/api/accounts/p6/reset-password', { cookie: C3 });
  check('CẤP 3 KHÔNG ĐẶT LẠI MẬT KHẨU PHỤ HUYNH CỦA CƠ SỞ KHÁC', phKhac.status === 403, phKhac.status);

  // Nhưng phụ huynh CỦA CƠ SỞ MÌNH thì vẫn giúp được — đó là việc của họ.
  const phMinh = await req('POST', '/api/accounts/p2/reset-password', { cookie: C3 });
  check('phụ huynh của cơ sở mình thì vẫn cấp lại được — không cắt mất việc của họ',
    phMinh.status === 200, phMinh.status);

  // Và Cấp 1 vẫn làm được mọi thứ như trước.
  const c1Lam = await req('POST', '/api/accounts/p6/reset-password', { cookie: C1 });
  check('CẤP 1 VẪN CẤP LẠI ĐƯỢC CHO MỌI NGƯỜI', c1Lam.status === 200, c1Lam.status);
}

// ===========================================================================
console.log('\n[6] Việc ảnh hưởng CẢ BA CƠ SỞ thì chỉ Cấp 1 làm được');
{
  const themCs = await req('POST', '/api/admin/campuses', { cookie: C3, body: { name: 'Cơ sở 4' } });
  check('Cấp 3 KHÔNG thêm được cơ sở mới', themCs.status === 403, themCs.status);

  // Đóng cơ sở là lối leo thang bằng cách PHÁ SẬP hàng rào: `campuses` không
  // còn dòng nào đang hoạt động thì db.coTangCoSo() trả false và mọi Cấp 3
  // lập tức thành Cấp 1.
  const dong = await req('PUT', '/api/admin/campuses/cs1', { cookie: C3, body: { active: false } });
  check('CẤP 3 KHÔNG ĐÓNG ĐƯỢC CƠ SỞ — kể cả cơ sở của chính mình', dong.status === 403, dong.status);
  const dsCs = (await req('GET', '/api/admin/campuses', { cookie: C1 })).data;
  check('và cơ sở đó vẫn đang hoạt động',
    Array.isArray(dsCs) && dsCs.find(c => c.id === 'cs1')?.active === true, dsCs);

  const nam = await req('POST', '/api/schoolyear/promote', { cookie: C3, body: { namMoi: '2030-2031' } });
  check('Cấp 3 KHÔNG chuyển được năm học cho cả trường', nam.status === 403, nam.status);

  const tat = await req('PUT', '/api/admin/modules/danthuoc', { cookie: C3, body: { enabled: false } });
  check('Cấp 3 KHÔNG tắt được một phân hệ của cả hệ thống', tat.status === 403, tat.status);
  const dsPh = (await req('GET', '/api/admin/modules', { cookie: C1 })).data;
  check('và phân hệ đó vẫn đang bật',
    Array.isArray(dsPh) && dsPh.some(m => m.key === 'danthuoc' && m.enabled), dsPh);

  const td = await req('PUT', '/api/menu/2026-09-07', { cookie: C3, body: { meals: [{ label: 'Bữa trưa' }] } });
  check('Cấp 3 KHÔNG soạn được thực đơn dùng chung', td.status === 403, td.status);

  // Cấp 1 vẫn làm được tất cả những việc trên.
  check('CẤP 1 vẫn thêm được cơ sở',
    (await req('POST', '/api/admin/campuses', { cookie: C1, body: { name: 'Cơ sở 4' } })).status === 200);
  check('CẤP 1 vẫn soạn được thực đơn',
    (await req('PUT', '/api/menu/2026-09-07', { cookie: C1, body: { meals: [{ label: 'Bữa trưa' }] } })).status === 200);
}

// ===========================================================================
console.log('\n[7] MỌI đường trong routes/admin.js phải đi qua một hàm canh');
{
  // Bài kiểm thử theo tình huống chỉ bắt được thứ ta nghĩ ra để thử. Mục này
  // đọc thẳng mã nguồn, nên nó bắt được cả đường mới thêm ngày mai.
  const ma = fs.readFileSync(path.join(GOC, 'routes/admin.js'), 'utf8');

  // Cắt tệp thành từng khối theo `app.<method>(`.
  const khoi = [];
  const re = /app\.(get|post|put|delete|patch)\((['"`])(\/api\/[^'"`]+)\2/g;
  let m;
  const moc = [];
  while ((m = re.exec(ma))) moc.push({ i: m.index, method: m[1].toUpperCase(), duong: m[3] });
  for (let k = 0; k < moc.length; k++) {
    khoi.push({ ...moc[k], than: ma.slice(moc[k].i, k + 1 < moc.length ? moc[k + 1].i : ma.length) });
  }
  check('tìm thấy các đường quản trị để soi', khoi.length >= 18, khoi.length);

  // Tên các hàm canh. Một đường hợp lệ phải nhắc tới ít nhất một trong số này.
  const HAM_CANH = ['phamViNhom', 'duocChamNhom', 'duocChamBe', 'coConTrongPhamVi',
    'chanNeuChiMotCoSo', 'phamViCoSo'];

  // Những đường CỐ Ý không canh, kèm lý do. Danh sách này là chỗ để giải trình,
  // không phải chỗ để giấu đường mới cho khỏi phiền.
  const MIEN = {
    'GET /api/admin/campuses': 'chỉ tên và địa chỉ toà nhà, Cấp 3 cần biết mình ở đâu',
    'GET /api/admin/managers': 'danh sách tài khoản quản trị, không có dữ liệu của bé',
    'GET /api/admin/import/template': 'tệp mẫu rỗng, không đọc dữ liệu nào',
  };

  const quen = [];
  for (const k of khoi) {
    const ten = `${k.method} ${k.duong}`;
    if (MIEN[ten]) continue;
    if (!HAM_CANH.some(h => k.than.includes(h))) quen.push(ten);
  }
  check('KHÔNG ĐƯỜNG NÀO QUÊN CANH TẦNG CƠ SỞ', quen.length === 0, quen);

  // Danh sách miễn không được phình ra trong im lặng.
  check('danh sách đường được miễn vẫn đúng 3 mục — thêm mục mới phải có lý do',
    Object.keys(MIEN).length === 3, Object.keys(MIEN));

  // Và mỗi đường được miễn phải thật sự còn tồn tại, để danh sách không mục ruỗng.
  const tenThat = new Set(khoi.map(k => `${k.method} ${k.duong}`));
  check('mọi đường trong danh sách miễn đều còn tồn tại thật',
    Object.keys(MIEN).every(t => tenThat.has(t)),
    Object.keys(MIEN).filter(t => !tenThat.has(t)));
}

// ===========================================================================
console.log('\n[8] Nhật ký thao tác: ghi được, và Cấp 3 chỉ thấy việc của mình');
{
  // Bốn đường về cơ sở từng gọi audit() lệch tham số và bị nuốt lỗi im lặng.
  const nk = await req('GET', '/api/admin/audit', { cookie: C1 });
  const cacViec = new Set((nk.data || []).map(r => r.action));
  check('nhật ký GHI ĐƯỢC thao tác chuyển nhóm sang cơ sở khác',
    cacViec.has('class-campus'), [...cacViec]);
  check('và thao tác tạo cơ sở mới', cacViec.has('campus-create'), [...cacViec]);
  check('mỗi dòng đều biết ai làm', (nk.data || []).every(r => r.who && r.who !== '(không rõ)'),
    (nk.data || []).filter(r => !r.who || r.who === '(không rõ)').slice(0, 3));

  const nk3 = await req('GET', '/api/admin/audit', { cookie: C3 });
  const nguoiKhac = (nk3.data || []).filter(r => !/Quản lý CS1/.test(r.who || ''));
  check('CẤP 3 CHỈ THẤY VIỆC CỦA CHÍNH MÌNH trong nhật ký',
    nguoiKhac.length === 0, nguoiKhac.slice(0, 3));
}

// ===========================================================================
console.log('\n[9] Album của nhóm ĐÃ ĐÓNG — ảnh khuôn mặt trẻ, và quyền XOÁ');
{
  // Sau mỗi lần chuyển năm học, MỌI nhóm của năm cũ ở CẢ BA CƠ SỞ đều đã đóng.
  // Nếu quản trị Cấp 3 "giữ" mọi nhóm đã đóng thì hết năm đầu tiên là gần như
  // toàn bộ album của trường lọt sang tay quản lý một cơ sở — lỗ rò lớn dần
  // theo thời gian, đúng kiểu không ai để ý.
  dongNhom(DIR, 'c2');

  const ds = await req('GET', '/api/albums?keCaLopCu=1', { cookie: C3 });
  const cuaCsKhac = (ds.data || []).filter(a => a.classId === 'c2');
  check('CẤP 3 KHÔNG THẤY ALBUM NHÓM ĐÃ ĐÓNG CỦA CƠ SỞ KHÁC',
    cuaCsKhac.length === 0, (ds.data || []).map(a => `${a.classId}:${a.title}`));

  // Cấp 1 vẫn giữ mọi nhóm cũ — không cắt bớt quyền cũ của ai.
  const cua1 = await req('GET', '/api/albums?keCaLopCu=1', { cookie: C1 });
  const c2Cua1 = (cua1.data || []).filter(a => a.classId === 'c2');
  check('CẤP 1 vẫn thấy album nhóm cũ của mọi cơ sở', c2Cua1.length > 0, (cua1.data || []).length);

  // Mở thẳng theo mã và XOÁ — hai đường nguy hiểm nhất, phải chặn cả hai.
  if (c2Cua1.length) {
    const id = c2Cua1[0].id;
    const mo = await req('GET', `/api/albums/${id}`, { cookie: C3 });
    check('KHÔNG mở được album đó dù biết mã', mo.status === 403 || mo.status === 404, mo.status);
    const xoa = await req('DELETE', `/api/albums/${id}`, { cookie: C3 });
    check('VÀ KHÔNG XOÁ ĐƯỢC NÓ — đây là mất dữ liệu, không chỉ là đọc trộm',
      xoa.status === 403 || xoa.status === 404, xoa.status);
    check('album vẫn còn nguyên sau khi bị thử xoá',
      (await req('GET', `/api/albums/${id}`, { cookie: C1 })).status === 200);
  }
}

// ===========================================================================
console.log('\n[10] Quét MỌI đường của app: không dấu vết nào của cơ sở khác');
{
  // Mục [7] soi mã nguồn của routes/admin.js. Mục này đi từ hướng ngược lại:
  // gọi thật mọi đường mà vai quản trị với tới được, rồi tìm dấu vết của cơ sở
  // 2 trong câu trả lời. Vai admin đi qua rất nhiều đường KHÔNG nằm trong
  // admin.js, và chính chỗ đó là nơi lỗ rò album đã nằm im.
  const DAU_VET = [
    ['tên bé cơ sở khác', /Nguyễn Bảo Nam|Bùi Minh Thư|Vũ Hải Đăng/],
    ['tên nhóm cơ sở khác', /Lá 1/],
    ['số định danh cơ sở khác', /079321005678/],
    ['tiền sử bệnh cơ sở khác', /tôm cua/i],
  ];
  const DUONG = [
    'GET /api/students', 'GET /api/students/s2',
    'GET /api/health?studentId=s2', 'GET /api/attendance?classId=c2&date=2026-08-27',
    'GET /api/leave', 'GET /api/medicine', 'GET /api/notifications',
    'GET /api/messages', 'GET /api/albums', 'GET /api/albums?keCaLopCu=1',
    'GET /api/surveys', 'GET /api/plans?classId=c2', 'GET /api/timetable?classId=c2',
    'GET /api/accounts/parents', 'GET /api/schoolyear/alumni',
    'GET /api/hocsinh-cu', 'GET /api/namhoccu',
    'GET /api/admin/students', 'GET /api/admin/students?classId=c2',
    'GET /api/admin/teachers', 'GET /api/admin/overview', 'GET /api/admin/audit',
  ];
  const ro = [];
  for (const d of DUONG) {
    const [m, u] = d.split(' ');
    const r = await req(m, u, { cookie: C3 });
    const chuoi = JSON.stringify(r.data ?? '');
    for (const [ten, re] of DAU_VET) if (re.test(chuoi)) ro.push(`${d} -> ${ten}`);
  }
  check(`quét ${DUONG.length} đường, KHÔNG đường nào để lọt dấu vết cơ sở khác`,
    ro.length === 0, ro);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
