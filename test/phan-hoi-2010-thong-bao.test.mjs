// Bài canh góp ý 20/10 — P1 và P2 ở màn Thông báo.
//
// Chạy bằng:  node test/phan-hoi-2010-thong-bao.test.mjs
//
// P2 — "phụ huynh bé vừa nhập học, vừa được tạo tài khoản, vẫn thấy các thông
//      báo cũ của trường". Gia đình chỉ thấy thông báo từ NGÀY tài khoản của
//      mình được tạo (giờ Việt Nam); thông báo GHIM vẫn hiện. Cô và văn phòng
//      không đổi. Danh sách và huy hiệu chuông dùng CÙNG một mốc.
//
// P1 — "báo có 1 thông báo mà vào không thấy gì". Huy hiệu chuông và màn
//      Thông báo phải nói CÙNG một con số: huy hiệu đếm đúng những tin chưa
//      đọc mà trang đầu của màn hình hiện ra (cùng cửa sổ, cùng bộ lọc), và
//      "Đọc tất cả" đưa huy hiệu về 0.
import Database from 'better-sqlite3';
import path from 'node:path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-thong-bao');
sinhDuLieu(DIR);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng PH2010', 'ph2010_qt');

// ---- Dữ liệu dựng thẳng vào tệp trước khi máy chủ chạy ----
const NGAY_MS = 86400000;
const [dauHomNay] = ngay.khoangUtcCuaNgay(ngay.homNay());
const truocNgay = (n) => new Date(Date.now() - n * NGAY_MS).toISOString();
const HOM_QUA_CUOI_NGAY = new Date(Date.parse(dauHomNay) - 60000).toISOString();
const SANG_NAY = new Date(Date.parse(dauHomNay) + 60000).toISOString();
{
  const csdl = new Database(path.join(DIR, 'school.db'));
  const them = csdl.prepare(`INSERT INTO notifications (id, title, body, category, audience, createdBy, createdAt, pinned)
    VALUES (?, ?, ?, 'Nhà trường', ?, 't2', ?, ?)`);
  them.run('ph_cu_all', 'Thông báo cũ toàn trường', 'cũ', 'all', truocNgay(20), 0);
  them.run('ph_cu_ghim', 'Nội quy đón trả bé (ghim)', 'ghim', 'all', truocNgay(20), 1);
  them.run('ph_cu_c1', 'Thông báo cũ nhóm Chồi 2', 'cũ', 'c1', truocNgay(20), 0);
  them.run('ph_hom_qua', 'Thông báo cuối ngày hôm qua', 'cũ', 'all', HOM_QUA_CUOI_NGAY, 0);
  them.run('ph_sang_nay', 'Thông báo sáng nay', 'mới', 'all', SANG_NAY, 0);
  // Hơn một trang (100 dòng) thông báo nhà trường chưa đọc — đủ để huy hiệu
  // và trang đầu của màn hình lệch nhau nếu chúng không cùng một cửa sổ.
  for (let i = 0; i < 105; i++) {
    them.run(`ph_lo_${i}`, `Thông báo lô ${i}`, 'lô', 'all', truocNgay(30 + i), 0);
  }
  // Hơn 50 tin riêng về bé s1 (mẹ: phuhuynh) — đường /rieng-be chỉ trả 50.
  const themRieng = csdl.prepare(`INSERT INTO thongbao_be (id, studentId, loai, tieuDe, noiDung, hash, nguoiTao, taoLuc)
    VALUES (?, 's1', 'nhatky', ?, '', '', 't1', ?)`);
  for (let i = 0; i < 55; i++) themRieng.run(`tbbph${i}`, `Nhật ký ngày ${i}`, truocNgay(1 + i));
  csdl.close();
}

const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 5241), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

// Trang đầu của màn Thông báo — đúng hai lời gọi mà màn hình phát ra.
async function trangDau(cookie) {
  const truong = await req('GET', '/api/notifications?bo=0&soLuong=100', { cookie });
  const rieng = await req('GET', '/api/notifications/rieng-be', { cookie });
  const ds = [...(truong.data || []), ...(rieng.data || [])];
  return { ds, chuaDoc: ds.filter(n => !n.read).length, ids: new Set(ds.map(n => n.id)) };
}
const huyHieu = async (cookie) => Number((await req('GET', '/api/dashboard/badges', { cookie })).data.thongbao || 0);

try {
  const qtLan1 = await login('ph2010_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtLan1.cookie, body: { newPassword: 'quantri2026' } });
  const qt = await login('ph2010_qt', 'quantri2026');
  const co = await login('giaovien', '123456');     // t1 — nhóm Chồi 2 (c1)
  const ph = await login('phuhuynh', '123456');     // mẹ s1 (Chồi 2) và s2 (Lá 1)

  // =========================================================================
  console.log('\n[P2] Gia đình vừa có tài khoản chỉ thấy thông báo từ ngày tạo tài khoản');
  const nhan = await req('POST', '/api/admin/students', {
    cookie: qt.cookie,
    body: { hoTen: 'Đặng Minh Khang', tenLop: 'Chồi 2', classId: 'c1', phHoTen: 'Đặng Thu Hà', phSdt: '0977123456' },
  });
  check('đối chứng — văn phòng nhận bé mới kèm tài khoản phụ huynh mới', nhan.status === 201 && nhan.data.taiKhoan && !nhan.data.taiKhoan.daCoTaiKhoan, `${nhan.status} ${JSON.stringify(nhan.data)}`);
  const tk = nhan.data.taiKhoan;
  const lan1 = await login(tk.username, tk.matKhau);
  await req('POST', '/api/auth/set-new-password', { cookie: lan1.cookie, body: { newPassword: 'giadinh2026' } });
  const moi = await login(tk.username, 'giadinh2026');

  const tao = await req('POST', '/api/notifications', {
    cookie: co.cookie, body: { title: 'Mai nhóm mình chơi với nước', body: 'Gửi thêm quần áo', audience: 'class', category: 'Nhóm lớp' },
  });
  check('đối chứng — cô gửi được thông báo mới cho nhóm', tao.status === 201, tao.status);

  {
    const t = await trangDau(moi.cookie);
    check('KHÔNG thấy thông báo toàn trường cũ (20 ngày trước)', !t.ids.has('ph_cu_all'));
    check('KHÔNG thấy thông báo cũ của nhóm con mình', !t.ids.has('ph_cu_c1'));
    check('KHÔNG thấy thông báo của hôm qua (23:59)', !t.ids.has('ph_hom_qua'));
    check('KHÔNG thấy lô thông báo cũ nào', ![...t.ids].some(id => /^ph_lo_/.test(id)));
    check('VẪN thấy thông báo GHIM dù đã cũ', t.ids.has('ph_cu_ghim'));
    check('thấy thông báo của ngày tạo tài khoản (sáng nay)', t.ids.has('ph_sang_nay'));
    check('thấy thông báo cô gửi sau khi có tài khoản', t.ids.has(tao.data.id));
    const hh = await huyHieu(moi.cookie);
    check('huy hiệu chuông khớp đúng số tin chưa đọc trên màn hình', hh === t.chuaDoc, { huyHieu: hh, manHinh: t.chuaDoc });
    check('huy hiệu không đếm thông báo cũ', hh <= t.ds.length, { huyHieu: hh, soDong: t.ds.length });
  }
  {
    const t = await trangDau(ph.cookie);
    check('gia đình có tài khoản từ trước (dữ liệu mẫu) vẫn thấy thông báo cũ', t.ids.has('ph_cu_all') && t.ids.has('ph_hom_qua'));
    const tCo = await trangDau(co.cookie);
    check('cô không đổi — vẫn thấy thông báo cũ', tCo.ids.has('ph_cu_all') && tCo.ids.has('ph_cu_c1'));
    const tQt = await trangDau(qt.cookie);
    check('văn phòng không đổi — vẫn thấy thông báo cũ (dù tài khoản vừa tạo hôm nay)', tQt.ids.has('ph_cu_all'));
  }

  // =========================================================================
  console.log('\n[P1] Huy hiệu chuông và trang đầu màn Thông báo cùng một con số');
  {
    const t = await trangDau(ph.cookie);
    check('đối chứng — gia đình có hơn một trang tin chưa đọc', t.chuaDoc >= 100, t.chuaDoc);
    const hh = await huyHieu(ph.cookie);
    check('huy hiệu = số tin chưa đọc trên trang đầu (cùng cửa sổ)', hh === t.chuaDoc, { huyHieu: hh, manHinh: t.chuaDoc });

    // Đọc một tin trên màn hình thì huy hiệu giảm đúng một.
    const motTin = t.ds.find(n => !n.read && n.laRiengBe);
    await req('POST', `/api/notifications/${motTin.id}/read`, { cookie: ph.cookie });
    check('đọc một tin riêng về con → huy hiệu giảm đúng một', await huyHieu(ph.cookie) === hh - 1);

    const r = await req('POST', '/api/notifications/read-all', { cookie: ph.cookie });
    check('đối chứng — "Đọc tất cả" chạy được', r.status === 200, r.status);
    check('"Đọc tất cả" đưa huy hiệu về 0', await huyHieu(ph.cookie) === 0);
    const sau = await trangDau(ph.cookie);
    check('…và màn hình không còn tin chưa đọc', sau.chuaDoc === 0, sau.chuaDoc);
  }
  {
    // Thông báo của chính cô: huy hiệu xưa nay không đếm, nên màn hình cũng
    // không được tô nó là "chưa đọc" — nếu không là có chấm xanh mà chuông im.
    const t = await trangDau(co.cookie);
    const cuaMinh = t.ds.find(n => n.id === tao.data.id);
    check('thông báo cô tự gửi không hiện là "chưa đọc" với chính cô', cuaMinh && cuaMinh.read === true, cuaMinh && cuaMinh.read);
    const hh = await huyHieu(co.cookie);
    check('huy hiệu của cô = số tin chưa đọc trên trang đầu', hh === t.chuaDoc, { huyHieu: hh, manHinh: t.chuaDoc });
    await req('POST', '/api/notifications/read-all', { cookie: co.cookie });
    check('"Đọc tất cả" của cô đưa huy hiệu về 0', await huyHieu(co.cookie) === 0);
  }
} finally {
  donThuMucTam(DIR);
}
tongKet();
