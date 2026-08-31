// Kiểm thử B5: chuyển năm học, lên lớp, ra trường.
//
// Chạy bằng:  npm run test:nam-hoc
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam, batPhanHe, dongNhom, MAU,
} from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3600);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('nam-hoc');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0,250) : ''}`); console.log('  ✗', n, x ?? ''); } };

execSync('node data/seed.js --force', {
  cwd: GOC,
  // Tắt dữ liệu mẫu của phân hệ — cùng lý do với `sinhDuLieu` trong
  // test/_chung.mjs: bộ test dựng trên nền phân hệ chưa có dòng nào.
  env: { ...process.env, DATA_DIR: DIR, CASA_SEED_PHAN_HE: '0' },
});
// Bài này dùng Nhận xét làm bằng chứng "dữ liệu cũ KHÔNG mất khi chuyển năm".
// Nhận xét nay tắt sẵn (A2), nhưng dữ liệu của nó vẫn còn nguyên — đó chính là
// điều đang cần chứng minh. Bật tường minh để hỏi được nó.
batPhanHe(DIR, ['nhanxet']);
const out = execSync('node scripts/create-admin.js "Hiệu Trưởng" hieutruong', { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString();
const adminPw = (out.match(/Mật khẩu:\s+(\S+)/) || [])[1];

const server = spawn('node', ['server.js'], { cwd: GOC, stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR } });
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} }

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}
const login = async (u, p) => { const r = await req('POST', '/api/auth/login', { body: { username: u, password: p } });
  return { ...r, cookie: r.setCookie ? r.setCookie.split(';')[0] : null }; };

let A = await login("hieutruong", adminPw);
await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'hieutruong2026' } });
A = await login("hieutruong", "hieutruong2026");

console.log('\n[1] Xem trước việc chuyển năm học');
let namMoi;
{
  const r = await req('GET', '/api/schoolyear/preview', { cookie: A.cookie });
  check('xem trước được', r.status === 200, r.status);
  namMoi = r.data.namMoi;
  check('tính đúng năm học kế tiếp', /^\d{4}-\d{4}$/.test(namMoi) && namMoi !== r.data.namHienTai, { cu: r.data.namHienTai, moi: namMoi });

  // Mầm non đi theo BẬC (Nhà trẻ → Mầm → Chồi → Lá), không theo số cuối tên
  // nhóm. Số "2" trong "Chồi 2" là nhóm song song thứ mấy, nên nó phải đi theo
  // bé sang bậc mới: Chồi 2 → Lá 2. Hết bậc Lá là bé vào lớp 1.
  const choi2 = r.data.buoc.find(b => b.tenHienTai === 'Chồi 2');
  check('Chồi 2 sẽ lên Lá 2 — theo bậc, không tăng số', choi2?.tenLopMoi === 'Lá 2', choi2);
  check('Chồi 2 không phải bậc cuối', choi2?.raTruong === false);
  const la1 = r.data.buoc.find(b => b.tenHienTai === 'Lá 1');
  check('Lá 1 là bậc cuối — các bé vào lớp 1', la1?.raTruong === true, la1);
  check('đếm đúng số bé lên nhóm trên', r.data.tongLenLop === MAU.soBe - MAU.soBeNhomLa1, r.data.tongLenLop);
  check('đếm đúng số bé ra trường', r.data.tongRaTruong === MAU.soBeNhomLa1, r.data.tongRaTruong);
  check('xem trước KHÔNG thay đổi dữ liệu',
    (await req('GET', '/api/admin/overview', { cookie: A.cookie })).data.counts.students === MAU.soBe);
}

console.log('\n[2] Phân quyền');
{
  const T = (await login('giaovien', '123456')).cookie;
  check('giáo viên KHÔNG xem trước được → 403', (await req('GET', '/api/schoolyear/preview', { cookie: T })).status === 403);
  check('giáo viên KHÔNG chuyển năm học được → 403',
    (await req('POST', '/api/schoolyear/promote', { cookie: T, body: {} })).status === 403);
}

console.log('\n[3] Thực hiện chuyển năm học');
{
  const truoc = await req('GET', '/api/admin/students', { cookie: A.cookie });
  const anTruoc = truoc.data.find(s => s.name === 'Nguyễn Bảo An');
  check('bé An đang học nhóm Chồi 2', anTruoc?.className === 'Chồi 2', anTruoc?.className);

  const r = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi, khoiToiDa: 5 } });
  check('chuyển năm học thành công', r.status === 200, r.data);
  check('bé lên nhóm trên đúng số đã xem trước', r.data?.lenLop === MAU.soBe - MAU.soBeNhomLa1, r.data?.lenLop);
  check('bé ra trường đúng số đã xem trước', r.data?.raTruong === MAU.soBeNhomLa1, r.data?.raTruong);
  check('tạo lớp mới cho năm sau', r.data?.lopTao >= 1, r.data?.lopTao);

  const sau = await req('GET', '/api/admin/students', { cookie: A.cookie });
  const anSau = sau.data.find(s => s.name === 'Nguyễn Bảo An');
  check('bé An đã lên nhóm Lá 2', anSau?.className === 'Lá 2', anSau?.className);
  check('còn đúng số bé chưa ra trường', sau.data.length === MAU.soBe - MAU.soBeNhomLa1, sau.data.length);

  const ov = await req('GET', '/api/admin/overview', { cookie: A.cookie });
  check('năm học của trường đã cập nhật', ov.data.school.currentYear === namMoi, ov.data?.school?.currentYear);
  check('năm mới được thêm vào danh sách năm học', ov.data.school.years.includes(namMoi));
  check('các lớp cũ đã đóng, chỉ còn lớp năm mới',
    ov.data.classes.every(c => c.year === namMoi), ov.data.classes.map(c => `${c.name}:${c.year}`));
  check('giáo viên chờ phân công lại chủ nhiệm',
    ov.data.classes.every(c => !c.teacherName), ov.data.classes.map(c => c.teacherName));
}

console.log('\n[4] Học sinh ra trường vẫn tra cứu được');
{
  const r = await req('GET', '/api/schoolyear/alumni', { cookie: A.cookie });
  check('xem được danh sách đã ra trường', r.status === 200 && r.data.length === 3, r.data?.length);
  const nam = r.data.find(s => s.name === 'Nguyễn Bảo Nam');
  check('có ngày rời trường', !!nam?.leftAt, nam?.leftAt);
  check('vẫn giữ liên kết phụ huynh', nam?.parentIds?.length === 1, nam?.parentIds);
}

console.log('\n[5] Dữ liệu học tập năm cũ không mất');
{
  const T2 = (await login('giaovien', '123456')).cookie;
  const me = await req('GET', '/api/auth/me', { cookie: T2 });
  check('giáo viên đăng nhập bình thường sau khi chuyển năm', me.status === 200, me.status);

  const P = (await login('phuhuynh', '123456')).cookie;
  const meP = await req('GET', '/api/auth/me', { cookie: P });
  check('phụ huynh chỉ còn thấy con đang học', meP.data?.students?.length === 1, meP.data?.students?.map(s => s.name));
  const con = meP.data.students[0];
  const att = await req('GET', `/api/attendance?studentId=${con.id}`, { cookie: P });
  check('điểm danh của con vẫn xem được', att.status === 200, att.status);
  const rm = await req('GET', `/api/remarks?studentId=${con.id}`, { cookie: P });
  check('nhận xét cũ vẫn còn', rm.status === 200 && rm.data.length > 0, rm.data?.length);
}

console.log('\n[6] Không cho chuyển trùng năm');
{
  const r = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi } });
  check('chặn chuyển sang chính năm hiện tại', r.status === 400, r.data);
  const bad = await req('POST', '/api/schoolyear/promote', { cookie: A.cookie, body: { namMoi: '2027' } });
  check('chặn định dạng năm sai', bad.status === 400, bad.data);
  const log = await req('GET', '/api/admin/audit', { cookie: A.cookie });
  check('nhật ký ghi lại việc chuyển năm học', log.data.some(x => x.action === 'schoolyear-promote'));
}

console.log('\n[7] QUYỀN CỦA CÔ TRÊN NHÓM ĐÃ ĐÓNG — cắt thật, nhưng KHÔNG xoá dữ liệu');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Sau khi chuyển năm học, nhóm cũ bị đóng nhưng dòng trong bảng phân công
  // `class_teachers` được GIỮ LẠI — để còn nhận ra "cô từng phụ trách nhóm này"
  // khi mở lại album năm cũ. Quyền đọc hồ sơ trẻ thì bị cắt bằng bộ lọc
  // `c.active = 1` trong `classIdsOfTeacher` (lib/db.js).
  //
  // Cả hai điều trên trước nay chỉ được ghi trong CHÚ THÍCH. Không bài nào chạy
  // chuyển năm thật rồi hỏi lại. Mà đây là hai vế kéo ngược nhau: siết quá thì
  // mất album năm cũ, lỏng quá thì cô giữ nguyên quyền đọc hồ sơ của một nhóm
  // đã đóng — và mỗi năm học lại chồng thêm một lớp cô như vậy.
  //
  // Mô hình nhiều-cô-một-nhóm làm chỗ này nặng hơn app 1: ở app 1 quyền nằm ở
  // một cột `users.classId` bị gỡ khi chuyển năm; ở đây quyền nằm ở một BẢNG
  // không bị gỡ, nên nó chỉ đúng chừng nào bộ lọc kia còn nguyên.
  const T3 = (await login('giaovien', '123456')).cookie;

  // Chiều CẮT: cô không còn với tới bé của nhóm cũ.
  const dsBe = await req('GET', '/api/students', { cookie: T3 });
  check('cô mở được màn danh sách bé, không bị lỗi', dsBe.status === 200, dsBe.status);
  check('CÔ KHÔNG CÒN THẤY BÉ NÀO CỦA NHÓM ĐÃ ĐÓNG',
    (dsBe.data || []).length === 0,
    (dsBe.data || []).map(b => `${b.name}:${b.className || '-'}`));

  // Và không lách được bằng cách gọi thẳng theo mã bé.
  const beCu = (await req('GET', '/api/admin/students', { cookie: A.cookie })).data[0];
  check('có bé của năm mới để thử', !!beCu, beCu);
  const moThang = await req('GET', `/api/attendance?studentId=${beCu.id}`, { cookie: T3 });
  check('và KHÔNG lách được bằng cách gọi thẳng theo mã bé',
    moThang.status === 403, moThang.status);

  // DỰNG ĐÚNG TÌNH HUỐNG NGUY HIỂM, KHÔNG DỰA VÀO MAY MẮN.
  //
  // Hai phép kiểm trên xanh cả khi bộ lọc `c.active = 1` bị gỡ — vì chuyển năm
  // đã dời hết bé sang nhóm mới, nên nhóm đã đóng RỖNG và không có gì để lộ.
  // Xanh vì không có dữ liệu thì không phải là xanh vì có chốt chặn.
  //
  // Nên dựng thẳng cảnh đáng sợ: một nhóm CÓ BÉ rồi mới bị đóng. Ngoài đời đó
  // là nhóm giải thể giữa năm, hoặc nhóm đóng nhầm rồi chưa kịp mở lại.
  {
    const lopThu = (await req('POST', '/api/admin/classes',
      { cookie: A.cookie, body: { name: 'Nhóm thử đóng', grade: 1 } })).data;
    const dsCo0 = (await req('GET', '/api/admin/teachers', { cookie: A.cookie })).data || [];
    const idCo0 = (dsCo0.find(u => u.username === 'giaovien') || {}).id;
    await req('PUT', `/api/admin/classes/${lopThu.id}/teachers`,
      { cookie: A.cookie, body: { teacherIds: [idCo0], chinhId: idCo0 } });
    await req('PUT', `/api/admin/students/${beCu.id}`,
      { cookie: A.cookie, body: { classId: lopThu.id } });

    const truocKhiDong = await req('GET', '/api/students', { cookie: (await login('giaovien', '123456')).cookie });
    check('trước khi đóng, cô THẤY bé của nhóm mình — nếu không thì phép kiểm sau vô nghĩa',
      (truocKhiDong.data || []).some(b => b.id === beCu.id),
      (truocKhiDong.data || []).map(b => b.id));

    dongNhom(DIR, lopThu.id);
    const T3b = (await login('giaovien', '123456')).cookie;
    const sauKhiDong = await req('GET', '/api/students', { cookie: T3b });
    check('ĐÓNG NHÓM LÀ CẮT QUYỀN NGAY, dù nhóm đó VẪN CÒN BÉ',
      !(sauKhiDong.data || []).some(b => b.id === beCu.id),
      (sauKhiDong.data || []).map(b => `${b.name}:${b.classId}`));
    check('và cũng không lách được bằng cách gọi thẳng theo mã bé',
      (await req('GET', `/api/attendance?studentId=${beCu.id}`, { cookie: T3b })).status === 403);

    // Trả bé về nhóm cũ để mục sau đo trên nền như thường.
    await req('PUT', `/api/admin/students/${beCu.id}`,
      { cookie: A.cookie, body: { classId: beCu.classId } });
  }

  // Chiều GIỮ: bảng phân công KHÔNG bị xoá. Đây là "tắt là ngưng dùng, không
  // phải xoá" của Nguyên tắc số 1, áp cho phân công cô.
  const { default: Db } = await import('better-sqlite3');
  const cn = new Db(`${DIR}/school.db`, { readonly: true });
  const soPhanCong = cn.prepare('SELECT COUNT(*) n FROM class_teachers').get().n;
  const coCu = cn.prepare(
    `SELECT COUNT(*) n FROM class_teachers ct JOIN classes c ON c.id = ct.classId
     WHERE c.active = 0`).get().n;
  cn.close();
  check('BẢNG PHÂN CÔNG KHÔNG BỊ XOÁ khi chuyển năm', soPhanCong > 0, soPhanCong);
  check('và vẫn còn dòng trỏ vào nhóm ĐÃ ĐÓNG — đó là thứ nhận ra "cô từng phụ trách"',
    coCu > 0, coCu);

  // Chiều CHO PHÉP: phân công cô vào nhóm năm mới thì quyền quay lại ngay.
  // Chọn nhóm CÓ BÉ, không lấy đại nhóm đầu danh sách: sau khi chuyển năm có cả
  // nhóm mới chưa bé nào, và phân công cô vào đúng nhóm rỗng thì phép kiểm dưới
  // đây đỏ vì lý do chẳng liên quan gì tới quyền.
  const dsAd = (await req('GET', '/api/admin/students', { cookie: A.cookie })).data || [];
  const lopCoBe = dsAd.find(b => b.classId)?.classId;
  const lopMoi = ((await req('GET', '/api/admin/overview', { cookie: A.cookie })).data.classes || [])
    .find(c => c.id === lopCoBe);
  const dsCo = (await req('GET', '/api/admin/teachers', { cookie: A.cookie })).data || [];
  const idCo = (dsCo.find(u => u.username === 'giaovien') || {}).id;
  check('tìm được cô và nhóm của năm mới để phân công lại', !!idCo && !!lopMoi, { idCo, lopMoi: lopMoi?.id });
  const gan = await req('PUT', `/api/admin/classes/${lopMoi.id}/teachers`,
    { cookie: A.cookie, body: { teacherIds: [idCo], chinhId: idCo } });
  check('phân công lại cô vào nhóm năm mới → 200', gan.status === 200, gan.data);

  const T4 = (await login('giaovien', '123456')).cookie;
  const dsBe2 = await req('GET', '/api/students', { cookie: T4 });
  check('PHÂN CÔNG LẠI LÀ QUYỀN QUAY VỀ NGAY, không phải chờ khởi động lại',
    (dsBe2.data || []).length > 0, (dsBe2.data || []).length);
  check('và chỉ thấy bé của đúng nhóm vừa được phân công',
    (dsBe2.data || []).every(b => b.classId === lopMoi.id),
    (dsBe2.data || []).map(b => b.classId));
}

// ===========================================================================
console.log('\n[+] LỊCH SỬ NHÓM QUA CÁC NĂM — có màn hình đọc, không phải bảng chỉ ghi');
{
  // Bảng lịch sử nhóm được ghi mỗi lần chuyển năm học. Trước đợt này KHÔNG màn
  // hình nào đọc nó: một bảng chỉ ghi mà không ai nhìn thì hỏng lúc nào cũng
  // không biết, và tới lúc thật sự cần tra lại một bé đã ra trường thì đã muộn.
  //
  // Hai vế phải cùng đúng: đường đọc trả về đủ các năm, VÀ có màn hình gọi nó.
  const be = 's1';
  const ls = await req('GET', `/api/schoolyear/lich-su-lop?studentId=${be}`, { cookie: A.cookie });
  check('đường đọc lịch sử nhóm trả lời được', ls.status === 200, ls.status);
  check('BÉ ĐÃ QUA HAI LẦN CHUYỂN NĂM THÌ CÓ NHIỀU HƠN MỘT KHOẢNG',
    (ls.data || []).length >= 2, (ls.data || []).map(k => `${k.year}:${k.className}`));
  check('mỗi khoảng đều có năm học và tên nhóm để màn hình dựng được',
    (ls.data || []).every(k => k.year && k.className),
    (ls.data || []).filter(k => !k.year || !k.className));
  check('đúng MỘT khoảng đang mở — năm hiện hành',
    (ls.data || []).filter(k => k.hienTai).length === 1,
    (ls.data || []).map(k => `${k.year}:${k.hienTai ? 'mở' : 'đóng'}`));

  const manHinh = fs.readFileSync(`${GOC}/public/js/views/student.js`, 'utf8');
  check('CÓ MÀN HÌNH GỌI ĐƯỜNG NÀY — hồ sơ của bé',
    manHinh.includes('/api/schoolyear/lich-su-lop'),
    'Không thấy chuỗi "/api/schoolyear/lich-su-lop" trong public/js/views/student.js');
  check('và gọi kèm mã của bé, không gọi trống',
    /lich-su-lop\?studentId=/.test(manHinh));
  // Cả gia đình lẫn cô đều mở được — hai chỗ, không phải một.
  check('cả ô hồ sơ bé của cô cũng dựng khối này',
    (manHinh.match(/theLichSuNhom\(lichSu\)/g) || []).length === 2,
    (manHinh.match(/theLichSuNhom\(lichSu\)/g) || []).length);
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 500));
donThuMucTam(DIR);
console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
