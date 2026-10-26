// Ngày trường nghỉ (lịch nghỉ của trường) KHÔNG phải ngày "chưa điểm danh" —
// trang chủ của cô, huy hiệu Điểm danh, "Hôm nay theo cơ sở" và màn "Một ngày"
// của văn phòng. Cùng luật với bảng rà soát của văn phòng (Đ242E, D5).
//
// Chạy bằng:  node test/phan-hoi-2010-ngay-nghi-trang-chu.test.mjs
//
// Dữ liệu mẫu: nhóm Chồi 2 (c1, cô `giaovien`) ở cơ sở 1; nhóm Mầm 1 (c3) ở cơ
// sở 2 không có bé, nên bài thêm một bé vào đó để màn "Một ngày" có hai cơ sở
// mà so. Sổ điểm danh hôm nay được dọn trước để mọi bé đều chưa có dòng.
//
//   [1] Ngày thường: đếm như cũ.
//   [2] Chỉ CƠ SỞ 2 nghỉ: nhóm của cô (cơ sở 1) vẫn đếm bình thường; màn
//       "Một ngày" chỉ thôi đếm bé của cơ sở 2.
//   [3] CƠ SỞ 1 nghỉ: trang chủ cô không đếm bé nào là chưa điểm danh và nói
//       tên ngày nghỉ; bé của cơ sở 2 (không nghỉ) vẫn được đếm.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ngay-nghi-trang-chu');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const NGAY = HOM_NAY();
{
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare('DELETE FROM attendance WHERE date = ?').run(NGAY);
  c.prepare(`INSERT INTO students (id, name, dob, classId, active)
    VALUES ('s_cs2', 'Bé Cơ Sở Hai', '2022-05-05', 'c3', 1)`).run();
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7211), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mkQT);
const GV = (await login('giaovien', '123456')).cookie;

const homNayCo = async () => (await req('GET', '/api/dashboard/hom-nay?classId=c1', { cookie: GV })).data;
const huyHieuCo = async () => (await req('GET', '/api/dashboard/badges', { cookie: GV })).data;
const motNgay = async () => (await req('GET', `/api/admin/mot-ngay?ngay=${NGAY}`, { cookie: VP })).data;
const tongQuan = async () => (await req('GET', '/api/dashboard/tong-quan', { cookie: VP })).data;
const chuaChamCoSo = (d, cs) => ((d?.theoCoSo || []).find(x => x.campusId === cs) || {}).chuaCham;
const nhomTrongTongQuan = (d, id) => (d?.coSo || []).flatMap(c => c.nhom).find(n => n.id === id) || {};
const datNghi = async (ten, campusId) => {
  const r = await req('POST', '/api/leave/lich-nghi', {
    cookie: VP, body: { ten, tuNgay: NGAY, denNgay: NGAY, loai: 'le', campusId },
  });
  if (r.status !== 201) throw new Error(`Không đặt được đợt nghỉ: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.dot.id;
};

// ===========================================================================
console.log('\n[1] Ngày thường: mọi bé chưa có dòng đều là "chưa điểm danh"');
const SO_BE_C1 = (await homNayCo())?.dem?.soBe;
const TONG_BE = (await motNgay())?.be?.dangHoc;
{
  const d = await homNayCo();
  check('nhóm Chồi 2 có bé', SO_BE_C1 > 0, SO_BE_C1);
  check('trang chủ cô: chưa điểm danh = số bé', d?.dem?.chuaDiemDanh === SO_BE_C1, d?.dem);
  check('trang chủ cô: không có dòng trường nghỉ', d?.truongNghi === null, d?.truongNghi);
  check('huy hiệu Điểm danh của cô = số bé chưa chấm', (await huyHieuCo())?.diemdanh === SO_BE_C1);
  const m = await motNgay();
  check('Một ngày: chưa chấm = mọi bé', m?.be?.chuaCham === TONG_BE, m?.be);
  check('Một ngày: cơ sở 2 có 1 bé chưa chấm', chuaChamCoSo(m, 'cs2') === 1, m?.theoCoSo);
}

// ===========================================================================
console.log('\n[2] Chỉ cơ sở 2 nghỉ: nhóm ở cơ sở 1 vẫn đếm bình thường');
const DOT_CS2 = await datNghi('Sửa chữa cơ sở 2', 'cs2');
{
  const d = await homNayCo();
  check('trang chủ cô (cơ sở 1): vẫn đếm đủ chưa điểm danh', d?.dem?.chuaDiemDanh === SO_BE_C1, d?.dem);
  check('trang chủ cô (cơ sở 1): không báo trường nghỉ', d?.truongNghi === null, d?.truongNghi);
  check('huy hiệu Điểm danh của cô vẫn như cũ', (await huyHieuCo())?.diemdanh === SO_BE_C1);
  const m = await motNgay();
  check('Một ngày: bé cơ sở 2 không còn là chưa chấm', chuaChamCoSo(m, 'cs2') === 0, m?.theoCoSo);
  check('Một ngày: bé cơ sở 1 vẫn đếm', chuaChamCoSo(m, 'cs1') === TONG_BE - 1, m?.theoCoSo);
  check('Một ngày: tổng chưa chấm bớt đúng 1 bé', m?.be?.chuaCham === TONG_BE - 1, m?.be);
}
await req('DELETE', `/api/leave/lich-nghi/${DOT_CS2}`, { cookie: VP });

// ===========================================================================
console.log('\n[3] Cơ sở 1 nghỉ Tết: không bé nào của cơ sở 1 là "chưa điểm danh"');
await datNghi('Nghỉ Tết Nguyên đán', 'cs1');
{
  const d = await homNayCo();
  check('trang chủ cô: chưa điểm danh = 0', d?.dem?.chuaDiemDanh === 0, d?.dem);
  check('trang chủ cô: vẫn đủ số bé (không ẩn bé nào)', d?.dem?.soBe === SO_BE_C1, d?.dem);
  check('trang chủ cô: trả tên ngày nghỉ', d?.truongNghi?.ten === 'Nghỉ Tết Nguyên đán', d?.truongNghi);
  check('huy hiệu Điểm danh của cô = 0', (await huyHieuCo())?.diemdanh === 0, await huyHieuCo());
  const tq = await tongQuan();
  check('Hôm nay theo cơ sở: nhóm Chồi 2 không còn bé chưa chấm',
    nhomTrongTongQuan(tq, 'c1').chuaDiemDanh === 0, nhomTrongTongQuan(tq, 'c1'));
  check('Hôm nay theo cơ sở: nhóm Mầm 1 (cơ sở 2) vẫn đếm',
    nhomTrongTongQuan(tq, 'c3').chuaDiemDanh === 1, nhomTrongTongQuan(tq, 'c3'));
  const m = await motNgay();
  check('Một ngày: chưa chấm chỉ còn bé của cơ sở 2', m?.be?.chuaCham === 1, m?.be);
  check('Một ngày: cơ sở 1 không có bé chưa chấm', chuaChamCoSo(m, 'cs1') === 0, m?.theoCoSo);
  check('Một ngày: cơ sở 2 vẫn 1 bé chưa chấm', chuaChamCoSo(m, 'cs2') === 1, m?.theoCoSo);
  check('Một ngày: dải báo trường nghỉ vẫn có', m?.truongNghi?.ten === 'Nghỉ Tết Nguyên đán', m?.truongNghi);
}

// Cô vẫn ghi được ngày nghỉ (bé được gửi trực): dòng đã ghi vẫn đếm như thường.
{
  const r = await req('POST', '/api/attendance/mark', {
    cookie: GV, body: { studentId: 's1', date: NGAY, status: 'present' },
  });
  const d = await homNayCo();
  check('bé được cô ghi có mặt ngày nghỉ vẫn đếm có mặt', r.status < 300 && d?.dem?.coMat === 1, { st: r.status, dem: d?.dem });
}

sv.dung();
donThuMucTam(DIR);
tongKet();
