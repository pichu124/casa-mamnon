// Bài canh THẺ "CÔ ĐI LÀM HÔM NAY THEO ẢNH CHỤP Ở CỔNG" của màn Tổng quan ngày
// (L3 — góp ý 20/10, mục 12).
//
// Chạy bằng:  node test/tong-quan-ngay-cong.test.mjs
//
// `/api/admin/mot-ngay` có thêm `coTheoCong`, đứng CẠNH `co` (bảng công của
// Nhân sự) chứ không thay nó. Bốn điều canh ở đây:
//
//   1. Đếm đúng giờ vào / giờ ra chụp ở cổng trong ngày, theo đúng tập cô mà
//      thẻ `co` đếm — hai thẻ phải cùng ra một tổng số cô.
//   2. Quản lý cơ sở 2 không thấy cô cơ sở 1, và ngược lại.
//   3. Tắt Điểm danh thì `coTheoCong` là `null` (không có sổ để đếm), không
//      phải 0; còn `co` vẫn y như cũ.
//   4. Chỉ tên và giờ — không ảnh, không số điện thoại.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tong-quan-ngay-cong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['diemdanh', 'nhansu']);
const mk = {
  bgh: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  ql1: taoQuanTri(DIR, 'Quản lý CS1', 'quanly1'),
  ql2: taoQuanTri(DIR, 'Quản lý CS2', 'quanly2'),
  vp1: taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1'),
  bv1: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'quanly1', 'cs1'); datChucVu(DIR, 'quanly1', 'quanly-coso');
khoaVaoCoSo(DIR, 'quanly2', 'cs2'); datChucVu(DIR, 'quanly2', 'quanly-coso');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1'); datChucVu(DIR, 'vanphong1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7313), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const BGH = await vao('hieutruong', mk.bgh);
const QL1 = await vao('quanly1', mk.ql1);
const QL2 = await vao('quanly2', mk.ql2);
const VP1 = await vao('vanphong1', mk.vp1);
const BV1 = await vao('baove1', mk.bv1);
const NS = await vao('nhansu1', mk.ns);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const motNgay = async (ck) => req('GET', '/api/admin/mot-ngay', { cookie: ck });
const dongCua = (d, id) => ((d?.coTheoCong?.danhSach) || []).find(x => x.userId === id);
const idCua = (d) => ((d?.coTheoCong?.danhSach) || []).map(x => x.userId);

try {
  // =========================================================================
  console.log('\n[1] Chưa ai chụp ở cổng');
  {
    const r = await motNgay(BGH);
    check('ban giám hiệu mở được màn', r.status === 200, r.status);
    const c = r.data?.coTheoCong;
    check('có thẻ coTheoCong', !!c && typeof c === 'object', c);
    check('trường cũ "co" vẫn còn, đủ bốn khoá cũ',
      !!r.data?.co && ['tong', 'diLam', 'nghi', 'chuaCham'].every(k => k in r.data.co), r.data?.co);
    check('hai thẻ cùng một tổng số cô', c?.tong === r.data?.co?.tong && c?.tong > 0, { theoCong: c?.tong, co: r.data?.co?.tong });
    check('chưa ai vào: daVao 0, daRa 0, chuaVao = tổng',
      c?.daVao === 0 && c?.daRa === 0 && c?.chuaVao === c?.tong, c);
  }

  // =========================================================================
  console.log('\n[2] Bảo vệ chụp ở cổng, màn đếm đúng');
  {
    const chup = async (userId) => req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV1, body: { userId, anh: PNG } });
    const v1 = await chup('t1');
    const r1 = await chup('t1');
    const v2 = await chup('t2');
    check('chụp được: t1 vào, t1 ra, t2 vào',
      v1.status === 201 && v1.data?.phan === 'vao' && r1.data?.phan === 'ra' && v2.data?.phan === 'vao',
      [v1.data, r1.data, v2.data]);

    const d = (await motNgay(BGH)).data;
    const c = d?.coTheoCong || {};
    check('daVao = 2 (t1, t2)', c.daVao === 2, c);
    check('daRa = 1 (t1)', c.daRa === 1, c);
    check('chuaVao = tổng − 2', c.chuaVao === c.tong - 2, c);
    const t1 = dongCua(d, 't1') || {};
    const t2 = dongCua(d, 't2') || {};
    check('t1 có giờ vào và giờ ra dạng HH:MM', /^\d{2}:\d{2}$/.test(t1.gioVao) && /^\d{2}:\d{2}$/.test(t1.gioRa), t1);
    check('t2 có giờ vào, chưa có giờ ra', /^\d{2}:\d{2}$/.test(t2.gioVao) && t2.gioRa === '', t2);
    check('mỗi dòng có tên cô', /Mai Anh/.test(t1.hoTen || ''), t1);
    check('t6 (cơ sở 2) có trong danh sách của ban giám hiệu, chưa vào', (dongCua(d, 't6') || {}).gioVao === '', dongCua(d, 't6'));
    check('mỗi dòng CHỈ có mã, tên, giờ vào, giờ ra — không ảnh, không số điện thoại',
      (c.danhSach || []).length > 0 && c.danhSach.every(x => Object.keys(x).sort().join() === 'gioRa,gioVao,hoTen,userId'),
      (c.danhSach || [])[0]);
    const tho = JSON.stringify(c);
    check('không phần trăm hay tỉ lệ nào', !/phanTram|tiLe|percent|ratio/i.test(tho) && !/\d\s*%/.test(tho));
    check('hai thẻ vẫn cùng tổng số cô', c.tong === d?.co?.tong, { theoCong: c.tong, co: d?.co?.tong });
  }

  // =========================================================================
  console.log('\n[3] Mỗi cơ sở chỉ thấy cô của mình');
  {
    const q1 = (await motNgay(QL1)).data;
    check('quản lý cơ sở 1 thấy t1, t2, KHÔNG thấy t6',
      idCua(q1).includes('t1') && idCua(q1).includes('t2') && !idCua(q1).includes('t6'), idCua(q1));
    check('quản lý cơ sở 1: daVao 2, daRa 1', q1?.coTheoCong?.daVao === 2 && q1?.coTheoCong?.daRa === 1, q1?.coTheoCong);
    check('quản lý cơ sở 1: hai thẻ cùng tổng số cô', q1?.coTheoCong?.tong === q1?.co?.tong, [q1?.coTheoCong?.tong, q1?.co?.tong]);

    const q2 = (await motNgay(QL2)).data;
    check('quản lý cơ sở 2 thấy t6, KHÔNG thấy cô cơ sở 1',
      idCua(q2).includes('t6') && !idCua(q2).some(id => ['t1', 't2', 't3', 't4'].includes(id)), idCua(q2));
    check('quản lý cơ sở 2: chưa ai vào, không lộ giờ của cơ sở 1',
      q2?.coTheoCong?.daVao === 0 && !JSON.stringify(q2?.coTheoCong).includes('Mai Anh'), q2?.coTheoCong);

    const v = (await motNgay(VP1)).data;
    check('văn phòng cơ sở 1 thấy thẻ, đúng như quản lý cơ sở 1',
      !!v?.coTheoCong && v.coTheoCong.tong === q1?.coTheoCong?.tong && v.coTheoCong.daVao === 2, v?.coTheoCong);

    const ns = await motNgay(NS);
    check('Nhân sự gọi màn Tổng quan ngày → 403', ns.status === 403, ns.status);
    const bv = await motNgay(BV1);
    check('Bảo vệ gọi màn Tổng quan ngày → 403', bv.status === 403, bv.status);
  }

  // =========================================================================
  console.log('\n[4] Tắt Điểm danh: coTheoCong là null, "co" giữ nguyên');
  {
    const truoc = (await motNgay(BGH)).data;
    const tat = await req('PUT', '/api/admin/modules/diemdanh', { cookie: BGH, body: { enabled: false } });
    check('ban giám hiệu tắt được Điểm danh', tat.status === 200, tat.data);
    const d = (await motNgay(BGH)).data;
    check('coTheoCong là null, không phải 0', d && d.coTheoCong === null, d?.coTheoCong);
    check('"co" (bảng công Nhân sự) không đổi',
      JSON.stringify(d?.co) === JSON.stringify(truoc?.co), { truoc: truoc?.co, sau: d?.co });
    const q1 = (await motNgay(QL1)).data;
    check('quản lý cơ sở cũng nhận null', q1 && q1.coTheoCong === null, q1?.coTheoCong);
    await req('PUT', '/api/admin/modules/diemdanh', { cookie: BGH, body: { enabled: true } });
    const lai = (await motNgay(BGH)).data;
    check('bật lại thì số đếm quay về, dữ liệu không mất', lai?.coTheoCong?.daVao === 2, lai?.coTheoCong);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet('Tổng quan ngày: cô đi làm theo ảnh ở cổng');
