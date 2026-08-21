// Canh các lỗ hổng ĐÃ VÁ không tái phát.
//
// Chạy bằng:  npm run test:lo-hong
//
// Mỗi bài ở đây ứng với một lỗ hổng có thật, đã được tái hiện trước khi vá. Bộ
// kiểm thử cũ KHÔNG bắt được chúng — đó chính là lý do bộ này ra đời. Khi thêm
// một bản vá bảo mật mới, thêm bài canh vào đây thay vì tin rằng lỗ sẽ không
// quay lại.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('lo-hong');
sinhDuLieu(DIR);
const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 3170), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

// Máy chủ thứ hai, cấu hình cho trường hợp đặt máy tại trường (không có proxy).
const DIR2 = thuMucTam('lo-hong-noproxy');
sinhDuLieu(DIR2);
const svNoProxy = await dungMayChu({ port: 3175, dir: DIR2, env: { TRUST_PROXY: '0' } });
const req2 = taoReq(svNoProxy.BASE);

// Gửi một lần đăng nhập sai, có thể kèm địa chỉ giả trong header.
async function saiMatKhau(r, username, gia) {
  const res = await fetch(`${r === req2 ? svNoProxy.BASE : BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(gia ? { 'X-Forwarded-For': gia } : {}) },
    body: JSON.stringify({ username, password: 'sai-mat-khau-hoan-toan' }),
  });
  return res.status;
}

// ===========================================================================
console.log('\n[1] A1 — màn hình đăng nhập không được lộ tài khoản hay mật khẩu');
{
  const r = await fetch(`${BASE}/js/views/login.js`);
  const ma = await r.text();
  check('tải được tệp màn hình đăng nhập', r.ok);
  check('KHÔNG còn chuỗi mật khẩu mẫu trong mã', !/123456/.test(ma), ma.match(/.{0,40}123456.{0,40}/)?.[0]);
  check('KHÔNG còn nút đăng nhập nhanh', !/demo-parent|demo-teacher/.test(ma));
  check('KHÔNG còn khối "Tài khoản dùng thử"', !/Tài khoản dùng thử/.test(ma));
  check('vẫn còn biểu mẫu đăng nhập bình thường', /lg-user/.test(ma) && /lg-pass/.test(ma));

  // Bản dùng cho ứng dụng Android là một bản sao riêng — sửa bản web mà quên bản
  // này thì điện thoại đã cài vẫn hiện nguyên hai nút đó.
  const web = fs.readFileSync(path.join(GOC, 'public/js/views/login.js'), 'utf8');
  const apk = path.join(GOC, 'android/app/src/main/assets/public/js/views/login.js');
  if (fs.existsSync(apk)) {
    check('bản Android khớp đúng bản web', fs.readFileSync(apk, 'utf8') === web);
  } else {
    check('bản Android khớp đúng bản web', true, 'không có thư mục android, bỏ qua');
  }
}

// ===========================================================================
console.log('\n[2] A3 — chống dò mật khẩu không bị vô hiệu bằng header giả');
{
  // Máy chủ đặt tại trường (TRUST_PROXY=0): địa chỉ trong header hoàn toàn bị bỏ
  // qua, nên đổi header kiểu gì cũng vẫn dính khóa cứng theo địa chỉ thật.
  let chan = 0;
  for (let i = 0; i < 14; i++) {
    const st = await saiMatKhau(req2, 'giaovien2', `10.9.9.${i}`);
    if (st === 429) chan++;
  }
  check('TRUST_PROXY=0: đổi header mỗi lần vẫn bị khóa', chan > 0, `số lần bị chặn: ${chan}`);

  const sau = await req2('POST', '/api/auth/login', { body: { username: 'giaovien2', password: '123456' } });
  check('TRUST_PROXY=0: đang khóa thì mật khẩu ĐÚNG cũng không vào được', sau.status === 429, sau.status);
}

// ===========================================================================
console.log('\n[3] A3 — bộ đếm theo TÊN ĐĂNG NHẬP làm chậm việc dò');
{
  // Đây là thứ thật sự bịt lỗ: kẻ dò đổi địa chỉ kiểu gì cũng vẫn phải nhắm vào
  // một tên đăng nhập, nên đánh vào tên là đánh đúng chỗ.
  const batDau = Date.now();
  for (let i = 0; i < 8; i++) await saiMatKhau(req, 'phuhuynh2', `203.0.113.${i}`);
  const donMuc = Date.now() - batDau;
  check('dò 8 lần vào MỘT tên bị làm chậm rõ rệt', donMuc > 3000, `${donMuc} ms`);

  // Đối chứng: cùng số lần thử nhưng rải ra nhiều tên khác nhau thì không chậm —
  // chứng tỏ độ chậm đến từ bộ đếm theo tên, không phải máy chủ vốn đã ì.
  const batDau2 = Date.now();
  for (let i = 0; i < 8; i++) await saiMatKhau(req, `khongtontai${i}`, `198.51.100.${i}`);
  const raiRac = Date.now() - batDau2;
  check('cùng số lần nhưng rải nhiều tên thì KHÔNG bị chậm', raiRac < donMuc / 2, `${raiRac} ms so với ${donMuc} ms`);
}

// ===========================================================================
console.log('\n[4] A3 — làm chậm nhưng KHÔNG khóa được tài khoản người khác');
{
  // Tên đăng nhập của phụ huynh sinh từ số điện thoại nên người ngoài đoán được.
  // Nếu khóa cứng theo tên thì nhập sai vài lần là khóa được phụ huynh khác khỏi
  // app — đổi một lỗ hổng lấy một lỗ hổng khác. Bài này canh điều đó.
  const vao = await login('phuhuynh2', '123456');
  check('bị dò nhiều lần nhưng chủ tài khoản vẫn đăng nhập được', vao.status === 200, vao.status);
  check('phụ huynh khác không hề bị ảnh hưởng', (await login('phuhuynh', '123456')).status === 200);
}

// ===========================================================================
console.log('\n[5] A2 — ba đường ghi của phụ huynh đều có trần');
{
  const PH = (await login('phuhuynh', '123456')).cookie;

  let r = await req('POST', '/api/leave', {
    cookie: PH,
    body: { studentId: 's1', fromDate: '2026-09-10', toDate: '2026-09-10', reason: 'x'.repeat(5000) },
  });
  check('lý do xin nghỉ quá dài → 400', r.status === 400, r.status);
  check('báo lỗi nói rõ giới hạn', /quá dài/i.test(r.data?.error || ''), r.data?.error);

  r = await req('POST', '/api/leave', {
    cookie: PH,
    body: { studentId: 's1', fromDate: '2026-09-10', toDate: '2026-09-10', reason: 'Con bị sốt' },
  });
  check('đơn xin nghỉ bình thường vẫn gửi được', r.status === 201 || r.status === 200, r.status);

  r = await req('POST', '/api/medicine', {
    cookie: PH,
    body: {
      studentId: 's1', fromDate: '2026-09-10', toDate: '2026-09-11',
      medicines: Array.from({ length: 200 }, () => ({ name: 'Paracetamol', dose: '1 viên', timing: 'sau ăn' })),
    },
  });
  check('đơn dặn thuốc 200 dòng → 400', r.status === 400, r.status);

  r = await req('POST', '/api/medicine', {
    cookie: PH,
    body: {
      studentId: 's1', fromDate: '2026-09-10', toDate: '2026-09-11',
      medicines: [{ name: 'A'.repeat(500), dose: 'B'.repeat(500), timing: 'C'.repeat(500) }],
      note: 'N'.repeat(5000),
    },
  });
  check('đơn dặn thuốc hợp lệ nhưng ô quá dài vẫn nhận', r.status === 201 || r.status === 200, r.status);
  check('tên thuốc bị cắt còn 100 ký tự', r.data?.medicines?.[0]?.name?.length === 100, r.data?.medicines?.[0]?.name?.length);
  check('ghi chú bị cắt còn 500 ký tự', r.data?.note?.length === 500, r.data?.note?.length);

  // Tự tạo khảo sát mới thay vì mượn khảo sát trong dữ liệu mẫu — phụ huynh có
  // thể đã trả lời sẵn khảo sát mẫu, và mỗi người chỉ trả lời được một lần.
  const GV = (await login('giaovien', '123456')).cookie;
  const taoSv = await req('POST', '/api/surveys', {
    cookie: GV,
    body: {
      title: 'Khảo sát kiểm thử độ dài',
      deadline: '2027-12-31',
      questions: [{ text: 'Ý kiến của gia đình', type: 'text' }],
    },
  });
  check('tạo được khảo sát để thử', taoSv.status === 201 || taoSv.status === 200, taoSv.data?.error);
  const svId = taoSv.data?.id;

  r = await req('POST', `/api/surveys/${svId}/respond`, {
    cookie: PH, body: { answers: { q1: 'z'.repeat(5000) } },
  });
  check('câu trả lời khảo sát quá dài vẫn nhận', r.status === 200 || r.status === 201, r.data?.error);

  const tra = await req('GET', `/api/surveys/${svId}`, { cookie: GV });
  const daLuu = JSON.stringify(tra.data || '');
  check('câu trả lời KHÔNG lưu nguyên 5000 ký tự', !/z{1001}/.test(daLuu));
  check('câu trả lời bị cắt còn đúng 1000 ký tự', /z{1000}/.test(daLuu));
}

// ===========================================================================
console.log('\n[6] A5 — đổi chủ nhiệm thì giáo viên cũ MẤT quyền với lớp cũ');
{
  const mkTam = spawnSync('node', ['scripts/create-admin.js', 'Hiệu Trưởng', 'ht.lohong'],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } })
    .stdout.match(/Mật khẩu:\s+(\S+)/)?.[1];
  let A = await login('ht.lohong', mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: A.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;

  // Trước khi đổi: cô giaovien (t1) chủ nhiệm lớp c1, đọc được học sinh lớp mình.
  const truoc = await req('GET', '/api/students', { cookie: (await login('giaovien', '123456')).cookie });
  check('trước khi đổi: GVCN đọc được danh sách lớp mình', truoc.status === 200 && truoc.data.length > 0, truoc.data?.length);

  // Quản trị chuyển lớp c1 sang cô giaovien2 (t2).
  const doi = await req('PUT', '/api/admin/classes/c1', { cookie: QT, body: { teacherId: 't2' } });
  check('quản trị đổi được chủ nhiệm lớp → 200', doi.status === 200, doi);

  const sau = await req('GET', '/api/students', { cookie: (await login('giaovien', '123456')).cookie });
  check('SAU khi đổi: cô cũ KHÔNG còn đọc được học sinh lớp cũ',
    sau.status === 200 && sau.data.length === 0, sau.data?.length);

  const conduct = await req('GET', '/api/conduct/class', { cookie: (await login('giaovien', '123456')).cookie });
  check('cô cũ cũng mất quyền ở các phân hệ khác của lớp',
    conduct.status === 403 || (conduct.data?.ranking || []).length === 0, conduct.status);

  const moi = await req('GET', '/api/students', { cookie: (await login('giaovien2', '123456')).cookie });
  check('cô mới nhận được đúng lớp vừa phân công', moi.status === 200 && moi.data.length > 0, moi.data?.length);
}

// ===========================================================================
console.log('\n[7] A5 — tạo lớp kèm chủ nhiệm phải ghi đủ cả hai chiều');
{
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;
  const lop = await req('POST', '/api/admin/classes', {
    cookie: QT, body: { name: 'Lớp 1C', room: 'P105', grade: 1, teacherId: 't1' },
  });
  check('tạo lớp mới kèm chủ nhiệm → 201', lop.status === 201, lop);

  const gv = await req('GET', '/api/admin/teachers', { cookie: QT });
  const t1 = (gv.data || []).find(t => t.id === 't1');
  check('cô được gán nhận đúng lớp mới (không còn "Sĩ số 0")', t1?.classId === lop.data?.id, t1?.classId);

  const nhin = await req('GET', '/api/students', { cookie: (await login('giaovien', '123456')).cookie });
  check('cô đăng nhập vào thấy đúng lớp mới, không lỗi', nhin.status === 200, nhin.status);

  const xau = await req('POST', '/api/admin/classes', {
    cookie: QT, body: { name: 'Lớp 1D', teacherId: 'p1' },
  });
  check('gán một phụ huynh làm chủ nhiệm → 400', xau.status === 400, xau.status);
}

// ===========================================================================
console.log('\n[8] B2 — chạy thật mà cơ sở dữ liệu trống thì DỪNG, không tự tạo trường giả');
{
  const rong = thuMucTam('lo-hong-rong');
  fs.mkdirSync(rong, { recursive: true });
  const r = spawnSync('node', ['server.js'], {
    cwd: GOC, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, DATA_DIR: rong, NODE_ENV: 'production', PORT: '3179' },
  });
  const chu = `${r.stdout || ''}${r.stderr || ''}`;
  check('máy chủ dừng lại với mã lỗi', r.status === 1, r.status);
  check('báo rõ cơ sở dữ liệu đang trống', /trống/i.test(chu));
  check('nói rõ vì sao không tự sinh dữ liệu mẫu', /123456/.test(chu));
  check('chỉ luôn lệnh tạo tài khoản quản trị', /create-admin/.test(chu));

  // Quan trọng: KHÔNG được tạo ra tài khoản mẫu nào.
  const Database = (await import('module')).createRequire(import.meta.url)('better-sqlite3');
  const tep = path.join(rong, 'school.db');
  if (fs.existsSync(tep)) {
    const d = new Database(tep, { readonly: true });
    const n = d.prepare('SELECT COUNT(*) n FROM users').get().n;
    d.close();
    check('KHÔNG tạo ra tài khoản mẫu nào', n === 0, `${n} tài khoản`);
  } else {
    check('KHÔNG tạo ra tài khoản mẫu nào', true, 'chưa tạo tệp cơ sở dữ liệu');
  }
  donThuMucTam(rong);
}

console.log('\n[9] B2 — chế độ phát triển vẫn tự sinh dữ liệu mẫu như cũ');
{
  const dev = thuMucTam('lo-hong-dev');
  fs.mkdirSync(dev, { recursive: true });
  const sv = await dungMayChu({ port: 3178, dir: dev });
  const r = await fetch(`${sv.BASE}/healthz`);
  check('không đặt NODE_ENV=production thì app vẫn chạy bình thường', r.ok);
  const dn = await fetch(`${sv.BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'giaovien', password: '123456' }),
  });
  check('dữ liệu mẫu vẫn được sinh khi phát triển', dn.status === 200, dn.status);
  sv.dung();
  donThuMucTam(dev);
}

// ===========================================================================
console.log('\n[10] A7 — không view nào nhét dữ liệu người dùng vào thuộc tính sự kiện');
{
  // Bài quét tĩnh. Lý do: UI.esc đổi dấu nháy đơn thành &#39;, đúng cho nội dung
  // HTML nhưng KHÔNG đủ trong tham số chuỗi của onclick — trình duyệt giải mã
  // thực thể trước rồi mới đưa cho JS, nên dấu nháy thoát ra và chạy được mã.
  // Chỉ mã định danh do hệ thống sinh mới an toàn để đặt vào đó.
  // Danh sách trắng: chỉ những biểu thức mà giá trị KHÔNG do người dùng gõ ra.
  //   id/…Id      — mã do db.nextId() sinh, chỉ gồm chữ và số
  //   k           — khóa lặp qua bảng hằng số viết thẳng trong mã (tên tab, mã trạng thái)
  //   dateStr     — chuỗi ngày do chính giao diện dựng
  //   namMoi      — năm học, máy chủ đã ép về đúng dạng YYYY-YYYY trước khi trả
  // Thêm tên mới vào đây thì phải tự kiểm chứng giá trị đó không bao giờ chứa
  // dấu nháy do người dùng nhập — đừng nới lỏng chỉ để bài kiểm thử hết đỏ.
  const AN_TOAN = /(^|\.)(id|Id|ID|userId|classId|studentId|key|k|date|dateStr|hash|status|term|year|namMoi|month|week|type)$/;
  const thuMuc = [path.join(GOC, 'public/js/views')];
  const modDir = path.join(GOC, 'modules');
  if (fs.existsSync(modDir)) {
    for (const m of fs.readdirSync(modDir)) {
      const p = path.join(modDir, m);
      if (fs.statSync(p).isDirectory()) thuMuc.push(p);
    }
  }
  const viPham = [];
  for (const d of thuMuc) {
    for (const f of fs.readdirSync(d).filter(x => x.endsWith('.js'))) {
      const ma = fs.readFileSync(path.join(d, f), 'utf8');
      for (const m of ma.matchAll(/\bon(?:click|change|input|submit|focus|blur|keyup|keydown)="([^"]*)"/g)) {
        for (const t of m[1].matchAll(/'[^']*\$\{([^}]*)\}[^']*'/g)) {
          const bieuThuc = t[1].replace(/UI\.esc\(|\)\s*$/g, '').trim();
          if (!AN_TOAN.test(bieuThuc)) viPham.push(`${f}: ${bieuThuc}`);
        }
      }
    }
  }
  check('không view nào đặt dữ liệu người dùng vào tham số chuỗi của onclick',
    viPham.length === 0, viPham.join(' | '));

  const acc = fs.readFileSync(path.join(GOC, 'public/js/views/accounts.js'), 'utf8');
  check('accounts.js KHÔNG truyền tên phụ huynh vào onclick', !/accounts\.reset\('[^']*',\s*'/.test(acc));
  const adm = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
  check('admin.js KHÔNG truyền tên lớp vào onclick', !/xemLop\('[^']*',\s*'/.test(adm));
}

// ===========================================================================
console.log('\n[11] A4 — đổi chủ nhiệm ghi đủ hai chiều, không để lớp có chủ nhiệm ma');
{
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;
  // Đưa lớp c1 về cô t1 cho sạch trạng thái, rồi chuyển t2 (đang chủ nhiệm c2) sang c1.
  await req('PUT', '/api/admin/classes/c1', { cookie: QT, body: { teacherId: 't1' } });
  await req('PUT', '/api/admin/classes/c2', { cookie: QT, body: { teacherId: 't2' } });
  await req('PUT', '/api/admin/classes/c1', { cookie: QT, body: { teacherId: 't2' } });

  const ov = await req('GET', '/api/admin/overview', { cookie: QT });
  const c1 = ov.data.classes.find(c => c.id === 'c1');
  const c2 = ov.data.classes.find(c => c.id === 'c2');
  check('lớp mới nhận đúng cô vừa chuyển sang', c1?.teacherId === 't2', c1?.teacherId);
  check('lớp CŨ của cô đó không còn mang tên cô nữa', !c2?.teacherId, c2?.teacherId);
  check('không cô nào là chủ nhiệm của hai lớp cùng lúc',
    new Set(ov.data.classes.filter(c => c.teacherId).map(c => c.teacherId)).size
      === ov.data.classes.filter(c => c.teacherId).length);

  const nhin = await req('GET', '/api/students', { cookie: (await login('giaovien2', '123456')).cookie });
  check('cô chỉ thấy đúng một lớp — lớp mới', nhin.status === 200 && nhin.data.every(s => s.classId === 'c1'), nhin.data?.length);

  const r = await req('PUT', '/api/admin/classes/c1', { cookie: QT, body: { name: '   ' } });
  check('sửa lớp với tên rỗng → 400', r.status === 400, r.status);
  const van = await req('GET', '/api/admin/overview', { cookie: QT });
  check('bị chặn thì tên lớp cũ còn nguyên',
    van.data.classes.find(c => c.id === 'c1')?.name === 'Lớp 3A', van.data.classes.find(c => c.id === 'c1')?.name);
}

// ===========================================================================
console.log('\n[12] C1 — tệp danh sách lưu sai bảng mã bị chặn ở CẢ HAI đường');
{
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;
  const FFFD = String.fromCharCode(0xFFFD);
  const NUL = String.fromCharCode(0);
  const sach = 'Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại\nTrần Văn An,2018-05-01,Lớp 2A,Trần Văn Bố,0900000001';
  const hong = `Ho ten,Ngay sinh,Lop,Ho ten phu huynh,Dien thoai\nTr${FFFD}n V${FFFD}n An,2018-05-01,Lop 2A,Tr${FFFD}n B,0900000001`;
  const utf16 = `H${NUL}o${NUL} ${NUL}t${NUL}e${NUL}n${NUL}`;

  let r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: hong } });
  check('xem trước tệp hỏng phông → 400', r.status === 400, r.status);
  check('báo lỗi nói rõ là lỗi phông chữ', /phông chữ/i.test(r.data?.error || ''), r.data?.error);
  check('báo lỗi chỉ đúng cách sửa trong Excel', /UTF-8/.test(r.data?.error || ''));
  check('báo lỗi trích được dòng hỏng để người dùng đối chiếu', /dòng \d+/.test(r.data?.error || ''));

  r = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: hong } });
  check('ghi thẳng bỏ qua bước xem trước cũng bị chặn → 400', r.status === 400, r.status);

  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: utf16 } });
  check('tệp UTF-16 thiếu BOM cũng bị chặn → 400', r.status === 400, r.status);

  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: sach } });
  check('tệp UTF-8 đúng chuẩn vẫn xem trước được bình thường', r.status === 200, r.data?.error);

  // Bộ lọc chạy trước ở trình duyệt cũng phải nhận đúng hai ký tự đó và KHÔNG
  // nhận nhầm dấu cách. Bản đầu tiên gõ thẳng ký tự vào lớp ký tự, byte 0 lặng
  // lẽ biến thành dấu cách, và mọi tệp thật đều bị chặn ngay tại máy người dùng
  // — máy chủ không hề biết vì tệp không bao giờ được gửi lên.
  const nguon = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
  const bieuThuc = (nguon.match(/_hongBangMa:\s*\/\[(.*?)\]\//) || [])[1];
  check('giao diện có bộ lọc bảng mã riêng', !!bieuThuc, bieuThuc);
  check('bộ lọc KHÔNG coi dấu cách là ký tự hỏng (đã từng chặn nhầm mọi tệp thật)',
    !bieuThuc.includes(String.fromCharCode(32)), JSON.stringify(bieuThuc));
  check('bộ lọc nhận U+FFFD', /uFFFD|�/i.test(bieuThuc || ''), bieuThuc);
  check('bộ lọc nhận byte 0', /u0000/i.test(bieuThuc || ''), bieuThuc);

  // Chạy thử chính biểu thức đó trên một tệp sạch có dấu cách.
  const loc = new RegExp(bieuThuc ? `[${bieuThuc}]` : '$^');
  check('bộ lọc cho tệp sạch đi qua', !loc.test(sach));
  check('bộ lọc chặn tệp hỏng dấu', loc.test(hong));
  check('bộ lọc chặn tệp có byte 0', loc.test(utf16));
}

// ===========================================================================
console.log('\n[13] A6a — sửa hồ sơ học sinh và cho nghỉ học mà KHÔNG mất dữ liệu');
{
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;
  const goc = (await req('GET', '/api/students/s4', { cookie: QT })).data;
  check('lấy được hồ sơ học sinh để đối chiếu', goc?.id === 's4', goc?.id);

  // -- Tên rỗng: em sẽ biến thành một dòng trống trong mọi danh sách.
  let r = await req('PUT', '/api/admin/students/s4', { cookie: QT, body: { name: '   ' } });
  check('sửa học sinh với tên rỗng → 400', r.status === 400, r.status);
  check('bị chặn thì tên cũ còn nguyên',
    (await req('GET', '/api/students/s4', { cookie: QT })).data?.name === goc.name);

  // -- Trùng mã: hai em khác nhau trông như một khi đối chiếu với sổ giấy.
  const s3 = (await req('GET', '/api/students/s3', { cookie: QT })).data;
  r = await req('PUT', '/api/admin/students/s4', { cookie: QT, body: { code: s3.code } });
  check('sửa học sinh với mã trùng em khác → 400', r.status === 400, r.status);
  check('báo lỗi nói rõ mã đang thuộc về ai', new RegExp(s3.name).test(r.data?.error || ''), r.data?.error);
  check('bị chặn thì mã cũ còn nguyên',
    (await req('GET', '/api/students/s4', { cookie: QT })).data?.code === goc.code);

  // -- Sửa hợp lệ vẫn phải chạy.
  r = await req('PUT', '/api/admin/students/s4', { cookie: QT, body: { name: 'Vũ Đức Anh (đã sửa)', address: '99 Thử Nghiệm' } });
  check('sửa hợp lệ → 200', r.status === 200, r.status);
  check('tên mới đã được lưu', r.data?.name === 'Vũ Đức Anh (đã sửa)', r.data?.name);
  check('mã học sinh không bị xóa oan khi không gửi lên', r.data?.code === goc.code, r.data?.code);

  // -- Cho nghỉ học: đánh dấu, KHÔNG xóa.
  const truoc = (await req('GET', '/api/remarks?studentId=s4', { cookie: QT })).data;
  r = await req('DELETE', '/api/admin/students/s4', { cookie: QT });
  check('cho nghỉ học → 200', r.status === 200, r.status);

  const macDinh = (await req('GET', '/api/admin/students?classId=c1', { cookie: QT })).data;
  check('em đã nghỉ biến khỏi danh sách mặc định', !macDinh.some(s => s.id === 's4'));

  const keCa = (await req('GET', '/api/admin/students?classId=c1&keCaNghi=1', { cookie: QT })).data;
  const trongDs = keCa.find(s => s.id === 's4');
  check('nhưng vẫn tìm lại được bằng ?keCaNghi=1', !!trongDs);
  check('và được đánh dấu là đã nghỉ', trongDs && !trongDs.active, trongDs?.active);
  check('có ghi lại ngày nghỉ', /^\d{4}-\d{2}-\d{2}$/.test(trongDs?.leftAt || ''), trongDs?.leftAt);

  const hoSo = await req('GET', '/api/students/s4', { cookie: QT });
  check('HỒ SƠ CỦA EM KHÔNG BỊ XÓA', hoSo.status === 200 && hoSo.data?.id === 's4', hoSo.status);
  const sau = (await req('GET', '/api/remarks?studentId=s4', { cookie: QT })).data;
  check('SỔ LIÊN LẠC CŨ CỦA EM CÒN NGUYÊN',
    Array.isArray(sau) && sau.length === (truoc || []).length, `${truoc?.length} → ${sau?.length}`);

  // -- Nhận lại em bấm nhầm.
  r = await req('PUT', '/api/admin/students/s4', { cookie: QT, body: { active: true } });
  check('nhận lại học sinh → 200', r.status === 200, r.status);
  const lai = (await req('GET', '/api/admin/students?classId=c1', { cookie: QT })).data;
  check('em trở lại danh sách đang học', lai.some(s => s.id === 's4'));
  check('ngày nghỉ được xóa để hồ sơ không mâu thuẫn',
    !(await req('GET', '/api/students/s4', { cookie: QT })).data?.leftAt);

  // -- Giáo viên không được đụng vào.
  const GV = (await login('giaovien2', '123456')).cookie;
  check('giáo viên KHÔNG sửa được hồ sơ học sinh',
    (await req('PUT', '/api/admin/students/s4', { cookie: GV, body: { name: 'Đổi trộm' } })).status === 403);
  check('giáo viên KHÔNG cho học sinh nghỉ học được',
    (await req('DELETE', '/api/admin/students/s4', { cookie: GV })).status === 403);

  // Trả lại như cũ để các bài sau (nếu có) không phụ thuộc thứ tự chạy.
  await req('PUT', '/api/admin/students/s4', { cookie: QT, body: { name: goc.name, address: goc.address || '' } });
}

// ===========================================================================
console.log('\n[14] A6b — nhập lại cùng một tệp KHÔNG được nhân đôi cả trường');
{
  const QT = (await login('ht.lohong', 'quantri2026')).cookie;
  const dem = async () => (await req('GET', '/api/admin/overview', { cookie: QT })).data.counts.students;

  const TEP = `Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại
Lý Thị Mai,2018-02-14,Lớp Trùng,Lý Văn Cha,0977000001
Ngô Văn Nam,2018-06-20,Lớp Trùng,Ngô Thị Mẹ,0977000002`;

  const truoc = await dem();
  let r = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: TEP } });
  check('nhập lần đầu → 2 em', r.status === 200 && r.data.imported === 2, r.data);
  check('lần đầu không có em nào bị coi là trùng', r.data?.boQuaTrung === 0, r.data?.boQuaTrung);
  check('sĩ số tăng đúng 2', (await dem()) === truoc + 2);

  // -- Xem trước lần hai: phải báo trùng, và KHÔNG được tính vào `loi`.
  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: TEP } });
  check('xem trước lần hai vẫn đọc được tệp', r.status === 200, r.status);
  check('đếm đúng 2 em đã có trong hệ thống', r.data?.trung === 2, r.data?.trung);
  check('KHÔNG gộp vào số dòng lỗi (số cũ phải giữ nguyên ý nghĩa)', r.data?.loi === 0, r.data?.loi);
  check('tổng số dòng vẫn là 2', r.data?.total === 2, r.data?.total);
  check('mỗi dòng nói rõ trùng ở đâu',
    r.data.rows.every(x => /đã có trong hệ thống/.test(x.trung || '')), r.data.rows.map(x => x.trung));

  // -- Ghi thật lần hai: mặc định BỎ QUA, không nhân đôi.
  const truocLan2 = await dem();
  r = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: TEP } });
  check('nhập lại toàn bộ tệp cũ → 400 vì không còn gì để nhập', r.status === 400, r.status);
  check('báo lỗi nói rõ là do đã có sẵn', /đã có trong hệ thống/.test(r.data?.error || ''), r.data?.error);
  check('SĨ SỐ KHÔNG ĐỔI — không nhân đôi cả trường', (await dem()) === truocLan2, await dem());

  // -- Tệp cũ có thêm em mới: em mới vẫn phải vào được.
  const THEM = `${TEP}\nHồ Bảo Long,2018-09-09,Lớp Trùng,Hồ Văn Ba,0977000003`;
  r = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: THEM } });
  check('tệp cũ thêm 1 em mới → chỉ nhập đúng em mới', r.status === 200 && r.data.imported === 1, r.data);
  check('và nói rõ đã bỏ qua 2 em có sẵn', r.data?.boQuaTrung === 2, r.data?.boQuaTrung);
  check('sĩ số tăng đúng 1', (await dem()) === truocLan2 + 1);

  // -- Trùng ngay trong một tệp cũng phải bắt được.
  const TRONG_TEP = `Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại
Đinh Song Sinh,2019-01-01,Lớp Trùng,Đinh Văn Cha,0977000004
Đinh Song Sinh,2019-01-01,Lớp Trùng,Đinh Văn Cha,0977000004`;
  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: TRONG_TEP } });
  check('bắt được hai dòng giống nhau trong cùng một tệp', r.data?.trung === 1, r.data?.trung);
  check('chỉ ra đúng dòng bị lặp', /dòng 2/.test(r.data.rows[1]?.trung || ''), r.data.rows[1]?.trung);

  // -- Khác ngày sinh thì là hai em khác nhau, không được coi là trùng.
  const KHAC = `Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại
Lý Thị Mai,2019-02-14,Lớp Trùng,Lý Văn Cha,0977000001`;
  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: KHAC } });
  check('cùng tên cùng lớp nhưng khác ngày sinh → KHÔNG coi là trùng', r.data?.trung === 0, r.data?.trung);

  // -- Ngày sinh gõ kiểu Việt Nam vẫn nhận ra là cùng một em.
  const VN = `Họ tên,Ngày sinh,Lớp,Họ tên phụ huynh,Điện thoại
Lý Thị Mai,14/02/2018,Lớp Trùng,Lý Văn Cha,0977000001`;
  r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: VN } });
  check('ngày sinh gõ 14/02/2018 vẫn khớp với 2018-02-14 đã lưu', r.data?.trung === 1, r.data?.trung);

  // -- Quản trị vẫn phải có quyền nói "đúng, trường tôi có hai em như thế".
  const truocEp = await dem();
  r = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: TEP, nhapCaTrung: true } });
  check('quản trị chủ động chọn nhập cả em trùng → vẫn nhập được', r.status === 200 && r.data.imported === 2, r.data);
  check('lúc đó sĩ số mới tăng', (await dem()) === truocEp + 2);
}

// ===========================================================================
console.log('\n[15] B4 — "Cả lớp có mặt" KHÔNG được xóa những em cô vừa đánh dấu nghỉ');
{
  // Dùng giaovien2: bài [11] đã chuyển cô sang chủ nhiệm lớp c1, còn giaovien cũ
  // bị gỡ khỏi lớp — chính là thứ bài [11] canh.
  const GV = (await login('giaovien2', '123456')).cookie;
  const NGAY = '2026-10-15';
  const lop = async () => (await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: GV })).data;

  const dau = await lop();
  check('lấy được danh sách lớp để điểm danh', dau?.students?.length > 0, dau?.students?.length);
  const siSo = dau.students.length;
  const em1 = dau.students[0].student.id;
  const em2 = dau.students[1].student.id;

  // Cô đánh dấu hai em nghỉ trước — đúng thói quen thật.
  await req('POST', '/api/attendance/mark', { cookie: GV, body: { studentId: em1, date: NGAY, status: 'absent_excused' } });
  await req('POST', '/api/attendance/mark', { cookie: GV, body: { studentId: em2, date: NGAY, status: 'absent_unexcused' } });

  let r = await req('POST', '/api/attendance/mark-all', { cookie: GV, body: { date: NGAY, status: 'present' } });
  check('điểm danh cả lớp một lượt → 200', r.status === 200, r.data);
  check('chỉ ghi cho những em CHƯA điểm danh', r.data?.soDaGhi === siSo - 2, r.data?.soDaGhi);
  check('nói rõ đã giữ nguyên bao nhiêu em', r.data?.soGiuNguyen === 2, r.data?.soGiuNguyen);

  const sau = await lop();
  const tra = id => sau.students.find(x => x.student.id === id)?.record;
  check('EM NGHỈ CÓ PHÉP VẪN LÀ NGHỈ CÓ PHÉP', tra(em1)?.status === 'absent_excused', tra(em1)?.status);
  check('EM NGHỈ KHÔNG PHÉP VẪN LÀ NGHỈ KHÔNG PHÉP', tra(em2)?.status === 'absent_unexcused', tra(em2)?.status);
  check('những em còn lại đều đã có mặt',
    sau.students.filter(x => x.record?.status === 'present').length === siSo - 2);
  check('cả lớp không còn ai chưa điểm danh', sau.students.every(x => x.record));
  check('em có mặt được ghi giờ vào lớp',
    /^\d{2}:\d{2}$/.test(sau.students.find(x => x.record?.status === 'present')?.record?.checkIn || ''));
  check('em nghỉ KHÔNG bị gán giờ vào lớp', !tra(em1)?.checkIn, tra(em1)?.checkIn);

  // Chạy lại lần nữa: không còn gì để ghi, và vẫn không phá dữ liệu cũ.
  r = await req('POST', '/api/attendance/mark-all', { cookie: GV, body: { date: NGAY, status: 'present' } });
  check('bấm lại lần nữa thì không ghi thêm gì', r.data?.soDaGhi === 0, r.data?.soDaGhi);
  check('và vẫn giữ nguyên hai em nghỉ',
    (await lop()).students.find(x => x.student.id === em1)?.record?.status === 'absent_excused');

  // Chỉ khi cô CHỦ ĐỘNG chọn ghi đè thì mới ghi đè.
  r = await req('POST', '/api/attendance/mark-all', { cookie: GV, body: { date: NGAY, status: 'present', ghiDe: true } });
  check('chọn ghi đè thì mới ghi lại cả lớp', r.data?.soDaGhi === siSo, r.data?.soDaGhi);
  check('lúc đó em nghỉ mới đổi thành có mặt',
    (await lop()).students.find(x => x.student.id === em1)?.record?.status === 'present');

  // Phân quyền và đầu vào.
  check('ngày sai định dạng → 400',
    (await req('POST', '/api/attendance/mark-all', { cookie: GV, body: { date: '15/10/2026' } })).status === 400);
  check('trạng thái lạ → 400',
    (await req('POST', '/api/attendance/mark-all', { cookie: GV, body: { date: NGAY, status: 'nghi-choi' } })).status === 400);
  const PH = (await login('phuhuynh', '123456')).cookie;
  check('phụ huynh KHÔNG điểm danh cả lớp được',
    (await req('POST', '/api/attendance/mark-all', { cookie: PH, body: { date: NGAY } })).status === 403);
  // giaovien (cô cũ) đã bị gỡ khỏi c1 ở bài [11] — cô không được điểm danh hộ nữa.
  const GV_CU = (await login('giaovien', '123456')).cookie;
  const rCu = await req('POST', '/api/attendance/mark-all', { cookie: GV_CU, body: { date: NGAY, classId: 'c1' } });
  check('cô đã chuyển lớp KHÔNG điểm danh hộ lớp cũ được', rCu.status === 403 || rCu.status === 400, rCu.status);

  // Đường ghi từng em vẫn nguyên vẹn — bản giao diện cũ trong máy điện thoại đã
  // cài app vẫn gọi đường này.
  check('đường điểm danh từng em vẫn chạy như cũ',
    (await req('POST', '/api/attendance/mark', { cookie: GV, body: { studentId: em1, date: NGAY, status: 'late' } })).status === 200);
}

// ===========================================================================
console.log('\n[17] B5 — sổ điểm danh phải BIẾT em nào đã có đơn nghỉ được duyệt');
{
  const GV = (await login('giaovien2', '123456')).cookie;   // chủ nhiệm c1 sau bài [11]
  const PH = (await login('phuhuynh', '123456')).cookie;
  const NGAY = '2026-11-03';

  const lop = async () => (await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: GV })).data;
  const dau = await lop();
  check('trường mới có mặt trong danh sách điểm danh',
    dau.students.every(x => 'donNghiDaDuyet' in x), Object.keys(dau.students[0] || {}));
  check('chưa có đơn thì trường đó rỗng', dau.students.every(x => x.donNghiDaDuyet === null));

  // Phụ huynh gửi đơn cho một em của lớp này, cô duyệt. Phải chọn đúng con của
  // CHÍNH phụ huynh đó, không phải em đầu danh sách lớp.
  const conCuaPh = (await req('GET', '/api/students', { cookie: PH })).data.map(x => x.id);
  const em = dau.students.map(x => x.student.id).find(id => conCuaPh.includes(id));
  check('tìm được một con của phụ huynh trong lớp này để thử', !!em, { conCuaPh, em });
  const don = await req('POST', '/api/leave', {
    cookie: PH,
    body: { studentId: em, fromDate: '2026-11-02', toDate: '2026-11-04', reason: 'Con về quê giỗ ông' },
  });
  const donId = don.data?.id;
  check('phụ huynh gửi được đơn', don.status === 201 || don.status === 200, don.data?.error);

  check('đơn CHỜ duyệt thì sổ điểm danh chưa hiện gì',
    (await lop()).students.find(x => x.student.id === em)?.donNghiDaDuyet === null);

  const duyet = await req('POST', `/api/leave/${donId}/review`, { cookie: GV, body: { status: 'approved' } });
  check('cô duyệt được đơn', duyet.status === 200, duyet.data?.error);

  const sau = (await lop()).students.find(x => x.student.id === em);
  check('DUYỆT XONG THÌ SỔ ĐIỂM DANH BIẾT NGAY', !!sau?.donNghiDaDuyet, sau?.donNghiDaDuyet);
  check('kèm khoảng ngày để cô đối chiếu',
    sau?.donNghiDaDuyet?.fromDate === '2026-11-02' && sau?.donNghiDaDuyet?.toDate === '2026-11-04',
    sau?.donNghiDaDuyet);
  check('kèm lý do để cô khỏi phải mở màn khác', /giỗ ông/.test(sau?.donNghiDaDuyet?.reason || ''));
  check('các em khác không bị gắn nhầm đơn',
    (await lop()).students.filter(x => x.donNghiDaDuyet).length === 1);

  // Ngày ngoài khoảng đơn thì không hiện.
  const ngoai = (await req('GET', '/api/attendance/class?date=2026-11-05', { cookie: GV })).data;
  check('ngày ngoài khoảng của đơn thì KHÔNG hiện', ngoai.students.every(x => !x.donNghiDaDuyet));
  const trong = (await req('GET', '/api/attendance/class?date=2026-11-04', { cookie: GV })).data;
  check('ngày cuối của đơn vẫn tính là trong khoảng',
    !!trong.students.find(x => x.student.id === em)?.donNghiDaDuyet);

  // Đơn bị TỪ CHỐI thì không được hiện — nếu không cô sẽ chấm nhầm thành có phép.
  const don2 = await req('POST', '/api/leave', {
    cookie: PH,
    body: { studentId: em, fromDate: '2026-12-01', toDate: '2026-12-01', reason: 'Xin nghỉ đi chơi' },
  });
  await req('POST', `/api/leave/${don2.data.id}/review`, { cookie: GV, body: { status: 'rejected' } });
  const tuChoi = (await req('GET', '/api/attendance/class?date=2026-12-01', { cookie: GV })).data;
  check('đơn bị TỪ CHỐI thì KHÔNG hiện trên sổ điểm danh',
    tuChoi.students.every(x => !x.donNghiDaDuyet));

  // Bản vá chỉ THÊM thông tin, tuyệt đối không tự sinh bản ghi điểm danh.
  check('duyệt đơn KHÔNG tự sinh bản ghi điểm danh (hệ thống chưa biết ngày nghỉ lễ)',
    (await lop()).students.every(x => !x.record), (await lop()).filter);
}

// ===========================================================================
console.log('\n[16] B6 — album của lớp đã đóng phải lấy lại được sau khi chuyển năm học');
{
  // Máy chủ riêng: bài này CHUYỂN NĂM HỌC, một việc không hoàn tác được, nên
  // không dùng chung cơ sở dữ liệu với các bài trên.
  const DIR3 = thuMucTam('lo-hong-namcu');
  sinhDuLieu(DIR3);
  const mkTam = taoQuanTri(DIR3, 'Hiệu Trưởng', 'ht.namcu');
  const sv = await dungMayChu({ port: 3176, dir: DIR3 });
  const r3 = taoReq(sv.BASE);
  const dn3 = taoLogin(r3);
  const dau = await dn3('ht.namcu', mkTam);
  await r3('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'quantri2026' } });
  const A = (await dn3('ht.namcu', 'quantri2026')).cookie;

  const PH = (await dn3('phuhuynh', '123456')).cookie;
  const GV1 = (await dn3('giaovien', '123456')).cookie;      // chủ nhiệm Lớp 3A
  const GV2 = (await dn3('giaovien2', '123456')).cookie;     // chủ nhiệm Lớp 5B

  const truoc = await r3('GET', '/api/albums', { cookie: PH });
  check('trước khi chuyển năm, phụ huynh thấy album', truoc.data.length > 0, truoc.data.length);
  const cua3A = (await r3('GET', '/api/albums', { cookie: GV1 })).data;
  check('cô chủ nhiệm cũng thấy album lớp mình', cua3A.length > 0, cua3A.length);
  const alb = cua3A[0];

  // -- Chuyển năm học: đây là lúc album rơi khỏi tầm với.
  const ch = await r3('POST', '/api/schoolyear/promote', { cookie: A, body: { namMoi: '2027-2028' } });
  check('chuyển được năm học', ch.status === 200, ch.data);

  check('PHỤ HUYNH mất album như cũ (chưa mở, cố ý)',
    (await r3('GET', '/api/albums', { cookie: PH })).data.length === 0);
  check('phụ huynh mở thẳng album cũ vẫn bị từ chối',
    (await r3('GET', `/api/albums/${alb.id}`, { cookie: PH })).status === 403);
  check('phụ huynh hỏi kèm lớp cũ cũng KHÔNG được mở thêm gì',
    (await r3('GET', '/api/albums?keCaLopCu=1', { cookie: PH })).data.length === 0);

  check('danh sách MẶC ĐỊNH của quản trị không đổi (vẫn không kèm lớp cũ)',
    (await r3('GET', '/api/albums', { cookie: A })).data.length === 0);

  // -- Đây là bản vá.
  const keCa = await r3('GET', '/api/albums?keCaLopCu=1', { cookie: A });
  check('QUẢN TRỊ HỎI KÈM LỚP CŨ THÌ THẤY LẠI ALBUM', keCa.data.length > 0, keCa.data.length);
  check('album cũ được đánh dấu là lớp đã đóng', keCa.data.every(x => x.lopDaDong));
  check('và kèm năm học để phân biệt', keCa.data.every(x => /^\d{4}-\d{4}$/.test(x.namHoc || '')),
    keCa.data[0]?.namHoc);

  const ct = await r3('GET', `/api/albums/${alb.id}`, { cookie: A });
  check('QUẢN TRỊ MỞ ĐƯỢC ALBUM CŨ', ct.status === 200, ct.status);
  check('có nút xóa để dọn ổ đĩa', ct.data?.canXoa === true, ct.data?.canXoa);
  check('nhưng KHÔNG cho đăng thêm ảnh vào lớp đã đóng', ct.data?.canEdit === false, ct.data?.canEdit);

  const anh = (ct.data.photos || []).find(p => p.file);
  if (anh) {
    const ra = await fetch(`${sv.BASE}/api/albums/${alb.id}/photo/${anh.id}`, { headers: { Cookie: A } });
    check('xem lại được tệp ảnh cũ', ra.status === 200, ra.status);
  } else {
    check('xem lại được tệp ảnh cũ', true, 'album mẫu dùng ảnh emoji, không có tệp');
  }

  // -- Cô TỪNG chủ nhiệm lớp đó cũng lấy lại được; cô lớp khác thì không.
  const cuaCo = await r3('GET', '/api/albums?keCaLopCu=1', { cookie: GV1 });
  check('cô TỪNG chủ nhiệm vẫn lấy lại được album lớp cũ', cuaCo.data.length > 0, cuaCo.data.length);
  check('cô lớp KHÁC không lấy được album lớp không phải của mình',
    (await r3('GET', '/api/albums?keCaLopCu=1', { cookie: GV2 })).data.every(x => x.className !== alb.className));
  check('cô lớp khác mở thẳng cũng bị từ chối',
    (await r3('GET', `/api/albums/${alb.id}`, { cookie: GV2 })).status === 403);

  // -- Xóa được để ổ đĩa không tích ảnh không ai xem.
  const xoa = await r3('DELETE', `/api/albums/${alb.id}`, { cookie: A });
  check('QUẢN TRỊ XÓA ĐƯỢC ALBUM CŨ', xoa.status === 200, xoa.data);
  check('xóa xong thì biến khỏi danh sách',
    !(await r3('GET', '/api/albums?keCaLopCu=1', { cookie: A })).data.some(x => x.id === alb.id));

  sv.dung();
  donThuMucTam(DIR3);
}

dung();
svNoProxy.dung();
donThuMucTam(DIR);
donThuMucTam(DIR2);
tongKet();
