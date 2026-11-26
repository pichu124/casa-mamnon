// Bài canh MÁY CHỦ cho góp ý "phụ huynh bổ sung liên hệ khẩn cấp, nhà trường
// xác nhận" (Đ260j).
//
// Chạy bằng:  node test/phan-hoi-1811-lien-he-khan.test.mjs
//
// Trường (18/11): "Cho phụ huynh quyền bổ sung liên hệ khẩn cấp, nhưng khi phụ
// huynh thêm vào thì cần nhà trường xác nhận để add thêm vào."
//
//   1. Gia đình đề xuất cho CON MÌNH: kiểm họ tên, số điện thoại Việt Nam, tối
//      đa 5 đề xuất đang chờ; phụ huynh bé khác 403. Đề xuất KHÔNG vào hồ sơ.
//   2. Chuông: văn phòng + quản lý cơ sở của bé, ban giám hiệu, cô của nhóm —
//      không ai ở cơ sở khác, không phụ huynh; không số điện thoại trong chuông.
//   3. Ai xem được: gia đình chỉ thấy đề xuất của chính mình; cô và văn phòng
//      cơ sở của bé thấy; văn phòng cơ sở khác 403.
//   4. Ai thêm được: quản lý cơ sở / ban giám hiệu (luật sửa nhân thân Đ168).
//      Văn phòng cơ sở và cô 403; quản lý cơ sở khác 403.
//   5. Thêm vào hồ sơ = NỐI: liên hệ cũ còn nguyên (cả ghi chú); gia đình được
//      báo; xét lần hai 400.
//   6. Không thêm (kèm lý do): hồ sơ không đổi; gia đình thấy lý do; được báo.
//   7. Huỷ: chỉ người gửi, chỉ khi đang chờ.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 5351);
const DIR = thuMucTam('phan-hoi-1811-lien-he-khan');
sinhDuLieu(DIR);
const mk = {
  ql: taoQuanTri(DIR, 'Quản lý cơ sở 1', 'lh_ql'),
  vp: taoQuanTri(DIR, 'Văn phòng cơ sở 1', 'lh_vp'),
  ql2: taoQuanTri(DIR, 'Quản lý cơ sở 2', 'lh_ql2'),
  vp2: taoQuanTri(DIR, 'Văn phòng cơ sở 2', 'lh_vp2'),
  bgh: taoQuanTri(DIR, 'Ban giám hiệu', 'lh_bgh'),
};
datChucVu(DIR, 'lh_ql', 'quanly-coso'); khoaVaoCoSo(DIR, 'lh_ql', 'cs1');
datChucVu(DIR, 'lh_vp', 'vanphong-coso'); khoaVaoCoSo(DIR, 'lh_vp', 'cs1');
datChucVu(DIR, 'lh_ql2', 'quanly-coso'); khoaVaoCoSo(DIR, 'lh_ql2', 'cs2');
datChucVu(DIR, 'lh_vp2', 'vanphong-coso'); khoaVaoCoSo(DIR, 'lh_vp2', 'cs2');
datChucVu(DIR, 'lh_bgh', 'hieu-truong');
const CSDL = path.join(DIR, 'school.db');

const doc = (sql, ...thamSo) => {
  const c = new Database(CSDL, { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const maCua = (ten) => doc('SELECT id FROM users WHERE username = ?', ten)[0].id;
const lienHe = (sid) => doc('SELECT hoTen, quanHe, dienThoai, ghiChu FROM student_emergency_contacts WHERE studentId = ? ORDER BY taoLuc, rowid', sid);
const chuongNv = () => doc("SELECT userId, tieuDe, noiDung, hash, soLan FROM thongbao_nv WHERE loai = 'lien-he-khan'");
const chuongBe = (sid) => doc("SELECT tieuDe, noiDung, hash FROM thongbao_be WHERE studentId = ? AND loai = 'lien-he-khan' ORDER BY taoLuc", sid);

let sv = null;
try {
  sv = await dungMayChu({ port: PORT, dir: DIR });
  const req = taoReq(sv.BASE);
  const login = taoLogin(req);
  const vao = async (ten, matKhau = '123456') => (await login(ten, matKhau)).cookie;
  const vaoQT = async (ten) => {
    const d = await login(ten, mk[ten.replace('lh_', '')]);
    await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
    return (await login(ten, 'quantri2026')).cookie;
  };
  const PH1 = await vao('phuhuynh');      // mẹ của s1, s2
  const PH2 = await vao('phuhuynh2');     // bố của s3 (cùng nhóm c1)
  const CO = await vao('giaovien');       // cô nhóm c1
  const CO_KHAC = await vao('giaovien4'); // cô nhóm c4
  const QL = await vaoQT('lh_ql');
  const VP = await vaoQT('lh_vp');
  const QL2 = await vaoQT('lh_ql2');
  const VP2 = await vaoQT('lh_vp2');
  const BGH = await vaoQT('lh_bgh');
  const cuS1 = lienHe('s1');
  check('dựng được tình huống: s1 đã có một liên hệ khẩn cấp kèm ghi chú',
    cuS1.length === 1 && cuS1[0].ghiChu !== '', cuS1);

  // =========================================================================
  console.log('\n[1] Gia đình đề xuất cho con mình — kiểm dữ liệu, giới hạn, quyền');
  const deXuat = (cookie, sid, body) => req('POST', `/api/students/${sid}/lien-he-de-xuat`, { cookie, body });
  {
    const r = await deXuat(PH1, 's1', { ten: 'Ông Nguyễn Văn Tư', quanHe: 'Ông nội', sdt: '0912 345 001', ghiChu: 'Ở gần trường' });
    check('phụ huynh của s1 đề xuất được', r.status === 200 && r.data?.trangThai === 'cho', r.data);
    check('số điện thoại được chuẩn hoá (bỏ dấu cách)', r.data?.sdt === '0912345001', r.data?.sdt);
    check('đề xuất CHƯA vào hồ sơ của bé', JSON.stringify(lienHe('s1')) === JSON.stringify(cuS1), lienHe('s1'));

    const khac = await deXuat(PH2, 's1', { ten: 'Người lạ', sdt: '0912345002' });
    check('phụ huynh bé khác → 403', khac.status === 403, khac);
    const co = await deXuat(CO, 's1', { ten: 'Người lạ', sdt: '0912345002' });
    check('cô không gửi đề xuất thay gia đình → 403', co.status === 403, co);

    const thieuTen = await deXuat(PH1, 's1', { ten: '  ', sdt: '0912345003' });
    check('thiếu họ tên → 400', thieuTen.status === 400 && /họ tên/.test(thieuTen.data?.error), thieuTen.data);
    for (const sai of ['', '12345', '0912 345', '091234500312', 'abc0912345678', '1912345678']) {
      const x = await deXuat(PH1, 's1', { ten: 'Bà Lan', sdt: sai });
      check(`số sai dạng "${sai}" → 400`, x.status === 400 && /Số điện thoại/.test(x.data?.error), x.data);
    }
    const dau84 = await deXuat(PH1, 's2', { ten: 'Cô Út', quanHe: 'Dì', sdt: '+84 909 000 111' });
    check('+84 đầu số được nhận, lưu thành 0…', dau84.status === 200 && dau84.data?.sdt === '0909000111', dau84.data);

    const trungHoSo = await deXuat(PH1, 's1', { ten: 'Bà Lan', sdt: cuS1[0].dienThoai });
    check('số đã có trong hồ sơ → 400', trungHoSo.status === 400 && /đã có/.test(trungHoSo.data?.error), trungHoSo.data);
    const trungCho = await deXuat(PH1, 's1', { ten: 'Ông Tư', sdt: '0912345001' });
    check('số đang chờ xác nhận → 400', trungCho.status === 400 && /đang chờ/.test(trungCho.data?.error), trungCho.data);

    for (let i = 2; i <= 5; i++) {
      const x = await deXuat(PH1, 's1', { ten: `Người thứ ${i}`, sdt: `091234500${i + 3}` });
      check(`đề xuất thứ ${i} được nhận`, x.status === 200, x.data);
    }
    const qua = await deXuat(PH1, 's1', { ten: 'Người thứ 6', sdt: '0912345099' });
    check('quá 5 đề xuất đang chờ của một bé → 400', qua.status === 400 && /5 người/.test(qua.data?.error), qua.data);
    check('nhật ký thao tác ghi việc đề xuất',
      doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'lien-he-khan-de-xuat'")[0].n === 6);
  }

  // =========================================================================
  console.log('\n[2] Chuông của nhà trường — đúng người, không số điện thoại');
  {
    const ds = chuongNv();
    const nhan = new Set(ds.map(r => r.userId));
    for (const [ten, can] of [['lh_ql', true], ['lh_vp', true], ['lh_bgh', true], ['giaovien', true],
      ['lh_ql2', false], ['lh_vp2', false], ['giaovien4', false]]) {
      check(`${ten} ${can ? 'nhận' : 'KHÔNG nhận'} chuông`, nhan.has(maCua(ten)) === can, [...nhan]);
    }
    check('không phụ huynh nào nhận chuông nhân viên', !nhan.has(maCua('phuhuynh')) && !nhan.has(maCua('phuhuynh2')));
    const cuaQl = ds.filter(r => r.userId === maCua('lh_ql'));
    check('5 đề xuất của s1 gộp vào MỘT dòng chưa đọc, đếm số lần (cộng 1 dòng của s2)',
      cuaQl.length === 2 && cuaQl.some(r => r.soLan === 5 && /5 người liên hệ khẩn cấp cho bé Nguyễn Bảo An/.test(r.tieuDe)), cuaQl);
    check('chuông của nhà trường mở thẳng thẻ chờ xác nhận', cuaQl.every(r => r.hash === '#/admin/thongtin/nhom'), cuaQl);
    check('chuông của cô mở hồ sơ bé', ds.filter(r => r.userId === maCua('giaovien')).every(r => r.hash === '#/student'));
    check('không dòng chuông nào chứa số điện thoại hay tên người được đề xuất',
      ds.every(r => !/\d{6,}|0912|Ông Nguyễn Văn Tư/.test(`${r.tieuDe} ${r.noiDung}`)), ds);
    check('gia đình CHƯA nhận tin kết quả nào', chuongBe('s1').length === 0);
  }

  // =========================================================================
  console.log('\n[3] Ai xem được đề xuất của bé');
  const xem = (cookie, sid) => req('GET', `/api/students/${sid}/lien-he-de-xuat`, { cookie });
  let maOngTu = null;
  {
    const ph = await xem(PH1, 's1');
    check('gia đình thấy 5 đề xuất đang chờ của mình', ph.status === 200 && ph.data.danhSach.length === 5, ph.data);
    maOngTu = ph.data.danhSach.find(x => x.ten === 'Ông Nguyễn Văn Tư')?.id;
    check('gia đình không có quyền xét', ph.data.duocXet === false);
    check('phụ huynh bé khác xem → 403', (await xem(PH2, 's1')).status === 403);
    const co = await xem(CO, 's1');
    check('cô của nhóm xem được, kèm số và người đề xuất',
      co.status === 200 && co.data.danhSach.length === 5 && co.data.danhSach[0].sdt && co.data.danhSach[0].nguoiDeXuat, co.data);
    check('cô không có quyền xét', co.data.duocXet === false);
    check('cô nhóm khác → 403', (await xem(CO_KHAC, 's1')).status === 403);
    check('văn phòng cơ sở của bé xem được', (await xem(VP, 's1')).data?.danhSach?.length === 5);
    check('văn phòng cơ sở khác xem → 403', (await xem(VP2, 's1')).status === 403);
    check('quản lý cơ sở của bé: có quyền xét', (await xem(QL, 's1')).data?.duocXet === true);

    const gomVp = await req('GET', '/api/students/lien-he-de-xuat/cho', { cookie: VP });
    check('danh sách gom của văn phòng cơ sở 1: 6 đề xuất, kèm tên bé, không quyền xét',
      gomVp.status === 200 && gomVp.data.danhSach.length === 6 && gomVp.data.danhSach[0].tenBe && gomVp.data.duocXet === false, gomVp.data);
    const gomVp2 = await req('GET', '/api/students/lien-he-de-xuat/cho', { cookie: VP2 });
    check('danh sách gom của văn phòng cơ sở 2: rỗng (không lộ bé cơ sở 1)',
      gomVp2.status === 200 && gomVp2.data.danhSach.length === 0, gomVp2.data);
    check('phụ huynh gọi danh sách gom → 403', (await req('GET', '/api/students/lien-he-de-xuat/cho', { cookie: PH1 })).status === 403);
    check('cô gọi danh sách gom → 403', (await req('GET', '/api/students/lien-he-de-xuat/cho', { cookie: CO })).status === 403);
  }

  // =========================================================================
  console.log('\n[4] Ai thêm được vào hồ sơ');
  const them = (cookie, id) => req('POST', `/api/students/lien-he-de-xuat/${id}/them`, { cookie, body: {} });
  const khongThem = (cookie, id, lyDo) => req('POST', `/api/students/lien-he-de-xuat/${id}/khong-them`, { cookie, body: { lyDo } });
  {
    const vp = await them(VP, maOngTu);
    check('văn phòng cơ sở (không sửa được nhân thân) → 403, câu báo nói ai làm',
      vp.status === 403 && /quản lý cơ sở/.test(vp.data?.error), vp.data);
    check('văn phòng cơ sở "Không thêm" cũng 403', (await khongThem(VP, maOngTu, 'x')).status === 403);
    check('cô → 403', (await them(CO, maOngTu)).status === 403);
    check('phụ huynh tự duyệt → 403', (await them(PH1, maOngTu)).status === 403);
    check('quản lý cơ sở khác → 403', (await them(QL2, maOngTu)).status === 403);
    check('văn phòng cơ sở khác → 403', (await them(VP2, maOngTu)).status === 403);
    check('mã đề xuất không có → 404', (await them(QL, 'lhkdx_khong_co')).status === 404);
    check('hồ sơ vẫn chưa đổi', JSON.stringify(lienHe('s1')) === JSON.stringify(cuS1));
  }

  // =========================================================================
  console.log('\n[5] Thêm vào hồ sơ = NỐI, không mất liên hệ cũ');
  {
    const r = await them(QL, maOngTu);
    check('quản lý cơ sở thêm được', r.status === 200 && r.data?.ok, r.data);
    const sau = lienHe('s1');
    check('hồ sơ có 2 người: người cũ đứng đầu, nguyên họ tên, số và GHI CHÚ',
      sau.length === 2 && JSON.stringify(sau[0]) === JSON.stringify(cuS1[0]), sau);
    check('người mới có đủ quan hệ, số, ghi chú gia đình ghi',
      sau[1]?.hoTen === 'Ông Nguyễn Văn Tư' && sau[1].quanHe === 'Ông nội' && sau[1].dienThoai === '0912345001'
      && sau[1].ghiChu === 'Ở gần trường', sau[1]);
    check('hồ sơ bé (đường cũ) trả cả hai người cho gia đình',
      (await req('GET', '/api/students/s1', { cookie: PH1 })).data?.lienHeKhanCap?.length === 2);
    check('xét lần hai → 400', (await them(QL, maOngTu)).status === 400);
    check('đề xuất đã thêm thôi hiện ở danh sách chờ của gia đình',
      !(await xem(PH1, 's1')).data.danhSach.some(x => x.id === maOngTu));
    const tin = chuongBe('s1');
    check('gia đình được báo "Nhà trường đã thêm … vào liên hệ khẩn cấp của bé …"',
      tin.length === 1 && tin[0].tieuDe === 'Nhà trường đã thêm Ông Nguyễn Văn Tư vào liên hệ khẩn cấp của bé Nguyễn Bảo An', tin);
    check('tin của gia đình không mang số điện thoại', !/0912/.test(`${tin[0]?.tieuDe} ${tin[0]?.noiDung}`));
    check('nhật ký thao tác ghi người thêm',
      doc("SELECT userId FROM audit_log WHERE action = 'lien-he-khan-them'")[0]?.userId === maCua('lh_ql'));

    // Ban giám hiệu (Cấp 1) cũng xét được.
    const ds = (await xem(BGH, 's1')).data.danhSach;
    const r2 = await them(BGH, ds.find(x => x.ten === 'Người thứ 2').id);
    check('ban giám hiệu thêm được; hồ sơ thành 3 người, hai người trước giữ nguyên',
      r2.status === 200 && lienHe('s1').length === 3 && JSON.stringify(lienHe('s1').slice(0, 2)) === JSON.stringify(sau), lienHe('s1'));
  }

  // =========================================================================
  console.log('\n[6] Không thêm — kèm lý do');
  {
    const ds = (await xem(QL, 's1')).data.danhSach;
    const id = ds.find(x => x.ten === 'Người thứ 3').id;
    const truoc = lienHe('s1');
    const r = await khongThem(QL, id, 'Xin gia đình ghi đủ họ tên người này');
    check('quản lý cơ sở "Không thêm" được', r.status === 200, r.data);
    check('hồ sơ không đổi', JSON.stringify(lienHe('s1')) === JSON.stringify(truoc));
    const ph = (await xem(PH1, 's1')).data.danhSach.find(x => x.id === id);
    check('gia đình thấy đề xuất bị từ chối kèm lý do',
      ph?.trangThai === 'tu-choi' && ph.lyDo === 'Xin gia đình ghi đủ họ tên người này', ph);
    check('văn phòng không còn thấy nó trong danh sách chờ', !(await xem(VP, 's1')).data.danhSach.some(x => x.id === id));
    const tin = chuongBe('s1').at(-1);
    check('gia đình được báo "chưa thêm", nội dung là lý do',
      tin?.tieuDe === 'Nhà trường chưa thêm Người thứ 3 vào liên hệ khẩn cấp của bé Nguyễn Bảo An'
      && tin.noiDung === 'Xin gia đình ghi đủ họ tên người này', tin);
    check('xét lại đề xuất đã từ chối → 400', (await them(QL, id)).status === 400);
  }

  // =========================================================================
  console.log('\n[7] Huỷ — chỉ người gửi, chỉ khi đang chờ');
  {
    const ds = (await xem(PH1, 's1')).data.danhSach;
    const id = ds.find(x => x.ten === 'Người thứ 4').id;
    const huy = (cookie, ma) => req('POST', `/api/students/lien-he-de-xuat/${ma}/huy`, { cookie, body: {} });
    check('phụ huynh khác huỷ → 404 (không lộ là có)', (await huy(PH2, id)).status === 404);
    check('quản lý cơ sở không huỷ hộ → 404', (await huy(QL, id)).status === 404);
    check('người gửi huỷ được', (await huy(PH1, id)).status === 200);
    check('đã huỷ thì thôi hiện ở cả gia đình lẫn nhà trường',
      !(await xem(PH1, 's1')).data.danhSach.some(x => x.id === id) && !(await xem(QL, 's1')).data.danhSach.some(x => x.id === id));
    check('xét đề xuất đã huỷ → 400', (await them(QL, id)).status === 400);
    check('huỷ đề xuất đã được thêm → 400', (await huy(PH1, maOngTu)).status === 400);
    check('huỷ xong thì gửi đề xuất mới được (còn 2 đang chờ)',
      (await deXuat(PH1, 's1', { ten: 'Người thứ 6', sdt: '0912345099' })).status === 200);
  }
} finally {
  sv?.dung();
  donThuMucTam(DIR);
}
tongKet();
