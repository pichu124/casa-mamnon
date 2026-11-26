// Bài canh: NHẬN LẠI BÉ KÈM ĐỔI NHÓM TRONG CÙNG MỘT LƯỢT không được làm gia
// đình mất album của nhóm cũ (Đ261j, ghi nhận của đợt rà Đ261).
//
// Chạy bằng:  TEST_PORT=7455 node test/nhan-lai-doi-nhom.test.mjs
//
// Hồ sơ cũ (có từ trước bảng khoảng học) cho nghỉ trước bản vá thì không có
// khoảng nào. Nhận lại kèm đổi nhóm bằng MỘT lượt PUT: bản trước mở khoảng của
// nhóm mới TRƯỚC (`ghiChuyenLop`), nên lúc `ghiNhanLai` chạy bảng đã "có
// khoảng" và giai đoạn trước lần nghỉ không được dựng lại — gia đình mất album
// và mục "Năm học trước" của nhóm cũ.
//
//   [1] Đối chứng: bé đã nghỉ, chưa có khoảng nào — lưới an toàn cho xem album nhóm cũ.
//   [2] Nhận lại + chuyển nhóm một lượt: vẫn xem album nhóm cũ (chụp trước ngày
//       nghỉ), khoảng nhóm mới mở từ hôm nay, không xem album nhóm cũ sau ngày nghỉ.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, daDoiMatKhau, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-lai-doi-nhom');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng NL', 'nl_qt');
daDoiMatKhau(DIR, 'nl_qt');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7455), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const sql = (cau, ...tham) => {
  const c = new Database(path.join(DIR, 'school.db'));
  try {
    const st = c.prepare(cau);
    return st.reader ? st.all(...tham) : st.run(...tham);
  } finally { c.close(); }
};
const ngayLui = (n) => {
  const d = new Date(`${HOM_NAY()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

try {
  const QT = (await login('nl_qt', mkQT)).cookie;
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1 (Chồi 2)
  const PH = (await login('ph.lan', '123456')).cookie;     // p4 — mẹ bé Khánh Vy (s5, nhóm c1)

  const truoc = await req('POST', '/api/albums', { cookie: GV, body: { title: 'Chồi 2 trước ngày nghỉ', photos: [{ emoji: '🎨' }] } });
  const sau = await req('POST', '/api/albums', { cookie: GV, body: { title: 'Chồi 2 sau ngày nghỉ', photos: [{ emoji: '🍂' }] } });
  check('đối chứng — cô đăng được hai album nhóm Chồi 2', truoc.status === 201 && sau.status === 201);
  sql('UPDATE albums SET date = ? WHERE id = ?', ngayLui(20), truoc.data.id);
  sql('UPDATE albums SET date = ? WHERE id = ?', ngayLui(3), sau.data.id);
  // Hồ sơ cũ: cho nghỉ trước bản vá, không có khoảng nào.
  sql("UPDATE students SET active = 0, leftAt = ? WHERE id = 's5'", ngayLui(10));
  sql("DELETE FROM student_class_periods WHERE studentId = 's5'");
  const albumCuaNha = async () => ((await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH })).data || []).map(a => a.id);

  // =========================================================================
  console.log('\n[1] Đối chứng: bé đã nghỉ, chưa có khoảng — lưới an toàn');
  {
    const ds = await albumCuaNha();
    check('gia đình xem được album Chồi 2 chụp trước ngày nghỉ', ds.includes(truoc.data.id), ds);
  }

  // =========================================================================
  console.log('\n[2] Nhận lại + chuyển sang Lá 1 trong cùng một lượt');
  {
    const r = await req('PUT', '/api/admin/students/s5', { cookie: QT, body: { active: true, classId: 'c2' } });
    check('nhận lại kèm đổi nhóm được', r.status === 200, r);
    const kh = sql("SELECT classId, tu, den FROM student_class_periods WHERE studentId = 's5' ORDER BY tu, rowid");
    const cu = kh.find(k => k.classId === 'c1');
    const moi = kh.find(k => k.classId === 'c2');
    check('có khoảng nhóm cũ Chồi 2, đóng đúng ngày nghỉ', !!cu && cu.den === ngayLui(10), kh);
    check('có khoảng nhóm mới Lá 1, mở từ hôm nay', !!moi && moi.tu === HOM_NAY() && !moi.den, kh);
    check('không có khoảng Chồi 2 nào mở sau ngày nghỉ', kh.filter(k => k.classId === 'c1').every(k => k.den && k.den <= ngayLui(10)), kh);
    const ds = await albumCuaNha();
    check('GIA ĐÌNH VẪN XEM ĐƯỢC ALBUM CHỒI 2 CHỤP TRƯỚC NGÀY NGHỈ', ds.includes(truoc.data.id), ds);
    check('nhưng không xem album Chồi 2 chụp lúc con vắng', !ds.includes(sau.data.id), ds);
    const nhc = (await req('GET', '/api/namhoccu', { cookie: PH })).data?.khoang || [];
    check('mục "Năm học trước" có giai đoạn Chồi 2', nhc.some(k => k.studentId === 's5' && k.classId === 'c1'), nhc);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
