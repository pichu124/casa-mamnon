// Bài canh NGÀY NHẬP HỌC LÀ MỐC CỦA GIA ĐÌNH (Đ260l — góp ý 18/11 của văn phòng).
//
// Chạy bằng:  node test/nhap-hoc-moc.test.mjs
//
// Trường: "Ở mục tạo thông tin nhập học cho bé mới cần có thêm ngày nhập học.
// Toàn bộ khảo sát, thông báo trước ngày bé nhập học sẽ không gửi tới phụ
// huynh (trừ khảo sát còn hiệu lực cần phải thực hiện). Phụ huynh mới tạo tài
// khoản vẫn xem lại được thông báo trước đó (thông báo nghỉ 2/9 vẫn còn)."
//
// [A] Văn phòng ghi được ngày nhập học: lúc nhận bé và sửa sau đó; sai ngày,
//     trước ngày sinh, cơ sở khác thì bị chặn.
// [B] Thông báo: gia đình chỉ thấy tin từ ngày bé nhập học — kể cả tin GHIM
//     (quyết định 25/11 của chủ dự án). Nhà có con lớn từ trước vẫn thấy lịch
//     sử. Huy hiệu khớp màn hình. Tin đẩy không tới nhà chưa tới ngày nhập học.
// [C] Khảo sát: khảo sát cũ đã đóng / quá hạn bị ẩn; khảo sát cũ còn hạn vẫn
//     thấy và trả lời được; huy hiệu khớp danh sách.
// [D] Năm học trước: nội dung nhóm cũ cũng tính từ ngày nhập học của bé.
import Database from 'better-sqlite3';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, ngay, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhap-hoc-moc');
sinhDuLieu(DIR);
batPhanHe(DIR, ['namhoccu']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng NH', 'nh_qt');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'nh_vp');
const mkVP2 = taoQuanTri(DIR, 'Văn phòng CS2', 'nh_vp2');
datChucVu(DIR, 'nh_vp', 'vanphong-coso');
datChucVu(DIR, 'nh_vp2', 'vanphong-coso');
khoaVaoCoSo(DIR, 'nh_vp', 'cs1');
khoaVaoCoSo(DIR, 'nh_vp2', 'cs2');

const NGAY_MS = 86400000;
const HOM_NAY = ngay.homNay();
const congNgay = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * NGAY_MS).toISOString().slice(0, 10);
const truocNgay = (n) => new Date(Date.now() - n * NGAY_MS).toISOString();
const D5 = congNgay(HOM_NAY, -5);       // ngày nhập học của bé thứ nhất
const D_TOI = congNgay(HOM_NAY, 7);     // ngày nhập học ở tương lai
const CSDL = path.join(DIR, 'school.db');

{
  const c = new Database(CSDL);
  const tb = c.prepare(`INSERT INTO notifications (id, title, body, category, audience, createdBy, createdAt, pinned)
    VALUES (?, ?, ?, 'Nhà trường', ?, 't2', ?, ?)`);
  tb.run('nh_cu_all', 'Thông báo cũ toàn trường', 'cũ', 'all', truocNgay(20), 0);
  tb.run('nh_cu_ghim', 'Lịch nghỉ lễ 2/9 (ghim)', 'ghim', 'all', truocNgay(20), 1);
  tb.run('nh_10_c1', 'Tin nhóm Chồi 2 trước ngày nhập học', 'cũ', 'c1', truocNgay(10), 0);
  tb.run('nh_3_c1', 'Tin nhóm Chồi 2 sau ngày nhập học', 'mới', 'c1', truocNgay(3), 0);
  const ks = c.prepare(`INSERT INTO surveys (id, title, description, createdBy, createdAt, deadline, audience, status, questions)
    VALUES (?, ?, '', 't1', ?, ?, 'c1', ?, ?)`);
  const cau = JSON.stringify([{ id: 'q1', type: 'choice', text: 'Gia đình tham gia chứ?', options: ['Có', 'Không'] }]);
  ks.run('ks_cu_dong', 'Khảo sát cũ đã đóng', truocNgay(20), congNgay(HOM_NAY, -15), 'closed', cau);
  ks.run('ks_cu_qua_han', 'Khảo sát cũ đã quá hạn', truocNgay(20), congNgay(HOM_NAY, -1), 'open', cau);
  ks.run('ks_cu_con_han', 'Khảo sát cũ còn hạn', truocNgay(20), congNgay(HOM_NAY, 5), 'open', cau);
  ks.run('ks_moi', 'Khảo sát sau ngày nhập học', truocNgay(3), congNgay(HOM_NAY, 5), 'open', cau);
  // [D] Một khoảng nhóm cũ đã khép của bé s1 (mẹ: phuhuynh), kèm thông báo và
  // khảo sát của nhóm cũ ở hai bên ngày nhập học sẽ ghi cho bé.
  c.prepare(`INSERT INTO student_class_periods (id, studentId, classId, tu, den)
             VALUES ('scp-nh', 's1', 'c_cu_nh', '2025-09-01', '2026-05-31')`).run();
  tb.run('nh_cu_truoc', 'Nhóm cũ — trước ngày nhập học', 'cũ', 'c_cu_nh', '2025-10-01T03:00:00.000Z', 0);
  tb.run('nh_cu_sau', 'Nhóm cũ — sau ngày nhập học', 'cũ', 'c_cu_nh', '2026-03-01T03:00:00.000Z', 0);
  // Hai tin sát mép, so theo NGÀY VIỆT NAM: 01:00 sáng 01/01/2026 giờ VN (vẫn là
  // 31/12 theo UTC) và 01:00 sáng 01/06/2026 giờ VN (vẫn là 31/05 theo UTC).
  tb.run('nh_cu_mep_vao', 'Nhóm cũ — rạng sáng ngày nhập học', 'cũ', 'c_cu_nh', '2025-12-31T18:00:00.000Z', 0);
  tb.run('nh_cu_mep_ra', 'Nhóm cũ — rạng sáng sau ngày rời nhóm', 'cũ', 'c_cu_nh', '2026-05-31T18:00:00.000Z', 0);
  c.prepare(`INSERT INTO surveys (id, title, description, createdBy, createdAt, deadline, audience, status, questions)
    VALUES (?, ?, '', 't1', ?, '2026-05-01', 'c_cu_nh', 'closed', ?)`)
    .run('ks_nhomcu_truoc', 'Khảo sát nhóm cũ — trước', '2025-10-01T03:00:00.000Z', cau);
  c.close();
}

function docDb(sql, ...p) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...p); } finally { c.close(); }
}
function ghiDb(sql, ...p) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...p); } finally { c.close(); }
}

const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 5201), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

async function vaoQuanTri(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
async function vaoGiaDinh(tk) {
  const d = await login(tk.username, tk.matKhau);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'giadinh2026' } });
  return (await login(tk.username, 'giadinh2026')).cookie;
}
async function trangDau(cookie) {
  const truong = await req('GET', '/api/notifications?bo=0&soLuong=100', { cookie });
  const rieng = await req('GET', '/api/notifications/rieng-be', { cookie });
  const ds = [...(truong.data || []), ...(rieng.data || [])];
  return { truong: truong.data || [], chuaDoc: ds.filter(n => !n.read).length, ids: new Set(ds.map(n => n.id)) };
}
const huyHieu = async (cookie) => (await req('GET', '/api/dashboard/badges', { cookie })).data || {};
const beTrongDs = async (cookie, classId, id) =>
  ((await req('GET', `/api/admin/students?classId=${classId}&keCaNghi=1`, { cookie })).data || []).find(s => s.id === id);

try {
  const QT = await vaoQuanTri('nh_qt', mkQT);
  const VP = await vaoQuanTri('nh_vp', mkVP);
  const VP2 = await vaoQuanTri('nh_vp2', mkVP2);
  const CO = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[A] Văn phòng ghi ngày nhập học');
  const nhan1 = await req('POST', '/api/admin/students', {
    cookie: VP,
    body: { hoTen: 'Lê Minh Khoa', classId: 'c1', tenLop: 'Chồi 2', ngaySinh: '2022-03-04',
      phHoTen: 'Lê Thu Trang', phSdt: '0977000111', ngayNhapHoc: D5 },
  });
  check('văn phòng cơ sở nhận bé kèm ngày nhập học → 201', nhan1.status === 201, `${nhan1.status} ${JSON.stringify(nhan1.data)}`);
  const be1 = nhan1.data.id;
  check('danh sách bé của Quản trị trả đúng ngày nhập học', (await beTrongDs(QT, 'c1', be1))?.ngayNhapHoc === D5);
  check('bé chưa ghi ngày nhập học thì ô này là null', (await beTrongDs(QT, 'c1', 's1'))?.ngayNhapHoc === null);

  const soBeTruoc = docDb("SELECT COUNT(*) AS n FROM students WHERE name = 'Bé Ngày Sai'")[0].n;
  const sai = await req('POST', '/api/admin/students', {
    cookie: QT, body: { hoTen: 'Bé Ngày Sai', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'A', phSdt: '0977000222', ngayNhapHoc: '2026-02-30' },
  });
  check('ngày nhập học không có thật → 400, câu báo tiếng Việt', sai.status === 400 && /Ngày nhập học/.test(sai.data?.error || ''), `${sai.status} ${JSON.stringify(sai.data)}`);
  const truocSinh = await req('POST', '/api/admin/students', {
    cookie: QT, body: { hoTen: 'Bé Ngày Sai', classId: 'c1', tenLop: 'Chồi 2', ngaySinh: '2023-01-10', phHoTen: 'A', phSdt: '0977000222', ngayNhapHoc: '2022-12-01' },
  });
  check('ngày nhập học trước ngày sinh → 400', truocSinh.status === 400, truocSinh.status);
  check('…và không để lại hồ sơ bé nửa vời', docDb("SELECT COUNT(*) AS n FROM students WHERE name = 'Bé Ngày Sai'")[0].n === soBeTruoc);
  check('…cũng không để lại tài khoản phụ huynh', docDb("SELECT COUNT(*) AS n FROM users WHERE phone = '0977000222'")[0].n === 0);

  const D10 = congNgay(HOM_NAY, -10);
  const vpSua = await req('PUT', '/api/admin/students/s3/nhap-hoc', { cookie: VP, body: { ngayNhapHoc: D10 } });
  check('văn phòng cơ sở SỬA được ngày nhập học (việc hành chính, không phải nhân thân)', vpSua.status === 200 && vpSua.data?.ngayNhapHoc === D10, `${vpSua.status} ${JSON.stringify(vpSua.data)}`);
  check('…danh sách trả đúng ngày mới', (await beTrongDs(VP, 'c1', 's3'))?.ngayNhapHoc === D10);
  check('…có dòng nhật ký thao tác', docDb("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'student-nhap-hoc' AND target = 's3'")[0].n === 1);
  const vp2 = await req('PUT', '/api/admin/students/s3/nhap-hoc', { cookie: VP2, body: { ngayNhapHoc: D5 } });
  // Bé của cơ sở khác trả 404 như không có — cùng luật `khongThuocCoSo` của
  // mọi đường Quản trị, không để lộ là bé có thật.
  check('văn phòng CƠ SỞ KHÁC bị chặn (404 như không có)', vp2.status === 404, vp2.status);
  const coSua = await req('PUT', '/api/admin/students/s3/nhap-hoc', { cookie: CO, body: { ngayNhapHoc: D5 } });
  check('cô không sửa được → 403', coSua.status === 403, coSua.status);
  const phSua = await req('PUT', '/api/admin/students/s1/nhap-hoc', { cookie: PH, body: { ngayNhapHoc: D5 } });
  check('phụ huynh không sửa được → 403', phSua.status === 403, phSua.status);
  check('…ngày nhập học không đổi sau ba lượt bị chặn', (await beTrongDs(QT, 'c1', 's3'))?.ngayNhapHoc === D10);
  const xa = await req('PUT', '/api/admin/students/s3/nhap-hoc', { cookie: VP, body: { ngayNhapHoc: congNgay(HOM_NAY, 400) } });
  check('ngày nhập học quá một năm tới → 400', xa.status === 400, xa.status);
  const khongCo = await req('PUT', '/api/admin/students/khong-co/nhap-hoc', { cookie: QT, body: { ngayNhapHoc: D5 } });
  check('bé không có → 404', khongCo.status === 404, khongCo.status);
  const xoa = await req('PUT', '/api/admin/students/s3/nhap-hoc', { cookie: VP, body: { ngayNhapHoc: '' } });
  check('để trống = bỏ ngày nhập học → 200', xoa.status === 200 && xoa.data?.ngayNhapHoc === null, `${xoa.status} ${JSON.stringify(xoa.data)}`);
  check('…danh sách trả null', (await beTrongDs(QT, 'c1', 's3'))?.ngayNhapHoc === null);

  // =========================================================================
  console.log('\n[B] Thông báo tính từ ngày nhập học');
  const F1 = await vaoGiaDinh(nhan1.data.taiKhoan);
  const nhan2 = await req('POST', '/api/admin/students', {
    cookie: QT,
    body: { hoTen: 'Trần Gia Bảo', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'Trần Thu Hà', phSdt: '0977000333', ngayNhapHoc: D_TOI },
  });
  check('đối chứng — nhận bé nhập học tuần sau', nhan2.status === 201, nhan2.status);
  const F2 = await vaoGiaDinh(nhan2.data.taiKhoan);
  const tao = await req('POST', '/api/notifications', {
    cookie: CO, body: { title: 'Mai nhóm mình chơi với nước', body: 'Gửi thêm quần áo', audience: 'class', category: 'Nhóm lớp' },
  });
  check('đối chứng — cô gửi được thông báo hôm nay', tao.status === 201, tao.status);
  {
    const t = await trangDau(F1);
    check('nhà nhập học 5 ngày trước KHÔNG thấy tin của nhóm trước ngày đó', !t.ids.has('nh_10_c1'));
    check('KHÔNG thấy tin toàn trường cũ', !t.ids.has('nh_cu_all'));
    check('KHÔNG thấy tin GHIM tạo trước ngày nhập học (tin nghỉ 2/9)', !t.ids.has('nh_cu_ghim'));
    check('THẤY tin tạo sau ngày nhập học — dù trước ngày có tài khoản', t.ids.has('nh_3_c1'));
    check('thấy tin cô gửi hôm nay', t.ids.has(tao.data.id));
    const hh = Number((await huyHieu(F1)).thongbao || 0);
    check('huy hiệu chuông = số tin chưa đọc trên màn hình', hh === t.chuaDoc, { huyHieu: hh, manHinh: t.chuaDoc });
  }
  {
    const t = await trangDau(F2);
    check('nhà nhập học TUẦN SAU chưa thấy thông báo nhà trường nào, kể cả tin hôm nay', t.truong.length === 0, t.truong.map(n => n.id));
    const hh = Number((await huyHieu(F2)).thongbao || 0);
    check('…và huy hiệu chuông không báo số', hh === t.chuaDoc && hh === 0, hh);
  }
  {
    const t = await trangDau(PH);
    check('nhà có tài khoản từ trước (dữ liệu mẫu) vẫn thấy lịch sử và tin ghim', t.ids.has('nh_cu_all') && t.ids.has('nh_cu_ghim') && t.ids.has('nh_10_c1'));
    const em = await req('POST', '/api/admin/students', {
      cookie: QT,
      body: { hoTen: 'Nguyễn Bảo Em', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'Mẹ An', phSdt: docDb("SELECT phone FROM users WHERE username = 'phuhuynh'")[0].phone, ngayNhapHoc: D_TOI },
    });
    check('đối chứng — nhận em của bé An vào cùng tài khoản phụ huynh', em.status === 201 && em.data.taiKhoan?.daCoTaiKhoan === true, `${em.status} ${JSON.stringify(em.data?.taiKhoan)}`);
    const sau = await trangDau(PH);
    check('nhà có con lớn từ trước, thêm em nhập học tuần sau → vẫn thấy lịch sử', sau.ids.has('nh_cu_all') && sau.ids.has('nh_10_c1'));
    // Con lớn ra trường / nghỉ học thì mốc KHÔNG được nhảy lên ngày nhập học
    // của em: nhà sẽ mất những tin đã đọc. Mốc tính trên mọi bé từng gắn với
    // tài khoản, không chỉ bé đang học.
    // Nhà mẫu có hai con (s1, s2): cho cả hai nghỉ, chỉ còn em vừa nhận.
    ghiDb("UPDATE students SET active = 0 WHERE id IN ('s1', 's2')");
    const conLonNghi = await trangDau(PH);
    check('con lớn nghỉ học, em nhập học tuần sau → nhà vẫn thấy lịch sử đã đọc',
      conLonNghi.ids.has('nh_cu_all') && conLonNghi.ids.has('nh_10_c1'), [...conLonNghi.ids]);
    ghiDb("UPDATE students SET active = 1 WHERE id IN ('s1', 's2')");
    const tCo = await trangDau(CO);
    check('cô không đổi — vẫn thấy tin cũ', tCo.ids.has('nh_cu_all') && tCo.ids.has('nh_10_c1'));
  }
  {
    // Tin đẩy: cùng luật với danh sách. Đăng ký máy giả, hỏi thẳng hàm chọn
    // người nhận ở một tiến trình riêng (cùng cách test/day-tin-nhom).
    const id = (u) => docDb('SELECT id FROM users WHERE username = ?', u)[0].id;
    const f1 = id(nhan1.data.taiKhoan.username), f2 = id(nhan2.data.taiKhoan.username), p1 = id('phuhuynh');
    for (const [u, ep] of [[f1, 'ep-f1'], [f2, 'ep-f2'], [p1, 'ep-p1']]) {
      ghiDb(`INSERT OR REPLACE INTO push_dang_ky (endpoint, userId, p256dh, auth, taoLuc, loiCuoi)
             VALUES (?, ?, 'k', 'a', ?, '')`, ep, u, new Date().toISOString());
    }
    const hoi = (aud) => JSON.parse(execFileSync(process.execPath, ['-e',
      `process.stdout.write(JSON.stringify(require('./lib/thong-bao').nguoiNhanCua(${JSON.stringify(aud)})))`],
    { cwd: GOC, env: { ...process.env, DATA_DIR: DIR } }).toString());
    const nhom = hoi('c1');
    const tatCa = hoi('all');
    check('tin đẩy của nhóm tới nhà đã nhập học', nhom.includes(f1), nhom);
    check('tin đẩy của nhóm KHÔNG tới nhà chưa tới ngày nhập học', !nhom.includes(f2), nhom);
    check('tin đẩy toàn trường cũng KHÔNG tới nhà chưa tới ngày nhập học', !tatCa.includes(f2) && tatCa.includes(f1), tatCa);
    check('nhà có con lớn đang học vẫn nhận, dù em nhập học tuần sau', nhom.includes(p1) && tatCa.includes(p1));
  }

  // =========================================================================
  console.log('\n[C] Khảo sát tính từ ngày nhập học, trừ khảo sát còn hiệu lực');
  {
    const ds = (await req('GET', '/api/surveys', { cookie: F1 })).data || [];
    const co = new Set(ds.map(s => s.id));
    check('KHÔNG thấy khảo sát cũ đã đóng', !co.has('ks_cu_dong'));
    check('KHÔNG thấy khảo sát cũ đã quá hạn', !co.has('ks_cu_qua_han'));
    check('THẤY khảo sát cũ còn hạn', co.has('ks_cu_con_han'));
    check('thấy khảo sát tạo sau ngày nhập học', co.has('ks_moi'));
    check('mở khảo sát cũ đã đóng bằng mã → 404', (await req('GET', '/api/surveys/ks_cu_dong', { cookie: F1 })).status === 404);
    const hh = Number((await huyHieu(F1)).khaosat || 0);
    const choTraLoi = ds.filter(s => s.status === 'open' && !s.answered).length;
    check('huy hiệu khảo sát = số khảo sát đang chờ trả lời trên danh sách', hh === choTraLoi, { huyHieu: hh, danhSach: choTraLoi });
    const tl = await req('POST', '/api/surveys/ks_cu_con_han/respond', { cookie: F1, body: { answers: { q1: 'Có' } } });
    check('trả lời được khảo sát cũ còn hạn', tl.status === 200 || tl.status === 201, `${tl.status} ${JSON.stringify(tl.data)}`);
    const tlCu = await req('POST', '/api/surveys/ks_cu_qua_han/respond', { cookie: F1, body: { answers: { q1: 'Có' } } });
    check('khảo sát cũ đã quá hạn không trả lời được', tlCu.status === 404, tlCu.status);
    const hh2 = Number((await huyHieu(F1)).khaosat || 0);
    check('trả lời xong thì huy hiệu giảm đúng một', hh2 === hh - 1, { truoc: hh, sau: hh2 });

    const ds2 = (await req('GET', '/api/surveys', { cookie: F2 })).data || [];
    const co2 = new Set(ds2.map(s => s.id));
    check('nhà nhập học tuần sau vẫn thấy khảo sát còn hạn (phải làm trước khi vào)', co2.has('ks_cu_con_han') && co2.has('ks_moi'));
    check('…nhưng không thấy khảo sát cũ đã đóng', !co2.has('ks_cu_dong'));
    const dsPH = new Set(((await req('GET', '/api/surveys', { cookie: PH })).data || []).map(s => s.id));
    check('nhà có tài khoản từ trước vẫn thấy khảo sát cũ đã đóng', dsPH.has('ks_cu_dong'));
  }

  // =========================================================================
  console.log('\n[D] Năm học trước cũng tính từ ngày nhập học của bé');
  {
    const xem = async () => {
      const r = await req('GET', '/api/namhoccu/scp-nh', { cookie: PH });
      return { status: r.status, tb: new Set((r.data?.thongBao || []).map(n => n.id)), ks: new Set((r.data?.khaoSat || []).map(s => s.id)) };
    };
    const truoc = await xem();
    check('đối chứng — chưa ghi ngày nhập học thì thấy cả hai tin của nhóm cũ',
      truoc.status === 200 && truoc.tb.has('nh_cu_truoc') && truoc.tb.has('nh_cu_sau') && truoc.ks.has('ks_nhomcu_truoc'), truoc);
    const ghi = await req('PUT', '/api/admin/students/s1/nhap-hoc', { cookie: QT, body: { ngayNhapHoc: '2026-01-01' } });
    check('đối chứng — ghi ngày nhập học cho bé An', ghi.status === 200, ghi.status);
    const sau = await xem();
    check('tin nhóm cũ trước ngày nhập học bị ẩn', !sau.tb.has('nh_cu_truoc'));
    check('khảo sát nhóm cũ trước ngày nhập học bị ẩn', !sau.ks.has('ks_nhomcu_truoc'));
    check('tin nhóm cũ sau ngày nhập học vẫn còn', sau.tb.has('nh_cu_sau'));
    check('tin lúc 01:00 sáng ngày nhập học (giờ VN) vẫn còn', sau.tb.has('nh_cu_mep_vao'));
    check('tin lúc 01:00 sáng hôm sau ngày rời nhóm (giờ VN) bị ẩn', !sau.tb.has('nh_cu_mep_ra'));
  }
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  donThuMucTam(DIR);
}
tongKet();
