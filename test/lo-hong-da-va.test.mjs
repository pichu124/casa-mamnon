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
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin } from './_chung.mjs';

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

dung();
svNoProxy.dung();
donThuMucTam(DIR);
donThuMucTam(DIR2);
tongKet();
