// Bài canh KẾ HOẠCH CỦA BÉ THEO BA CHƯƠNG TRÌNH — góp ý 06/10, mục 6.
//
// Chạy bằng:  npm run test:ke-hoach-ba-chuong-trinh
//
// Nhà trường: ba tab Montessori & Kỹ năng sống / Cambridge / Thể chất, mỗi tab
// do một cô khác soạn, tab nào cũng có "Lưu nháp" và "Gửi quản lý duyệt"; kho
// bài chia theo lứa 3–4, 4–5, 5–6; quản lý duyệt theo ngày / tháng / năm,
// từng bé hoặc cả nhóm; trả lại bắt buộc ghi lý do và báo về cho cô.
//
// Bài này canh các vế ấy, và canh luôn những thứ KHÔNG được đổi:
//   • trường chưa khai vai cô thì cô phụ trách nhóm vẫn soạn được cả ba phần
//     như trước (Nguyên tắc số 1);
//   • lưu / gửi / duyệt phần này KHÔNG đụng phần của cô khác;
//   • app đời cũ (không gửi `chuongTrinh`) vẫn lưu, gửi, duyệt cả bản được —
//     trừ khi ghi cả bản sẽ đè lên phần đã duyệt;
//   • `kehoachbe_ke.trangThai` gộp đúng cho mọi chỗ đang đọc nó.
import path from 'path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-ba-ct');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanlycs2');
khoaVaoCoSo(DIR, 'quanlycs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4867), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await vao('hieutruong', mk1);
const QL2 = await vao('quanlycs2', mk2);
const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô phụ trách nhóm c1
const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — cũng dạy c1
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ s1

const THANG = HOM_NAY().slice(0, 7);
const NGAY = HOM_NAY();
const nhom = async (cookie = GV) => (await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie })).data || {};
const cuaBe = async (id, cookie = GV) => ((await nhom(cookie)).danhSach || []).find(x => x.studentId === id) || {};
const luu = (cookie, ct, danhSach) => req('PUT', '/api/kehoachbe', { cookie, body: { classId: 'c1', thang: THANG, chuongTrinh: ct, danhSach } });
const keDb = (id) => {
  const db = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const k = db.prepare('SELECT * FROM kehoachbe_ke WHERE id = ?').get(id);
  db.close();
  return k;
};

try {
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
  const bai = (goc, ten) => (dm.baiHoc || []).find(b => b.gocLinhVuc === goc && (!ten || b.ten === ten));
  const thapHong = bai('giac-quan', 'Tháp hồng');
  const colours = bai('cambridge', 'Colours');
  const animals = bai('cambridge', 'Animals');
  const bongRo = bai('the-chat');

  // =========================================================================
  console.log('\n[1] Ba tab, nhãn "Dạy mới", lứa của từng bé, phần cô soạn được');
  {
    const d = await nhom();
    check('ba tab đúng ba chương trình',
      (d.chuongTrinhTab || []).map(t => t.ma).join(',') === 'chu-nhiem,nuoc-ngoai,the-chat', d.chuongTrinhTab);
    check('nhãn đầu tiên là "Dạy mới" (mã giữ nguyên hoc-moi)',
      (d.nhanBai || [])[0]?.ma === 'hoc-moi' && (d.nhanBai || [])[0]?.ten === 'Dạy mới', d.nhanBai);
    check('ba lứa của kho bài: 3–4, 4–5, 5–6', (d.luaKho || []).map(x => x.ma).join(',') === '3-4,4-5,5-6', d.luaKho);
    check('mỗi bé mang lứa của kho bài ở tháng đang xem',
      (d.danhSach || []).every(x => ['3-4', '4-5', '5-6'].includes(x.lua)), (d.danhSach || []).map(x => x.lua));
    check('trường CHƯA khai vai: cô phụ trách nhóm soạn được cả ba phần như trước',
      (d.ctDuocSua || []).join(',') === 'chu-nhiem,nuoc-ngoai,the-chat' && d.ctCuaToi === 'chu-nhiem', d.ctDuocSua);
  }

  // =========================================================================
  console.log('\n[2] Trường khai vai: t3 là cô nước ngoài của c1 — mỗi cô đúng phần của mình');
  {
    const khai = await req('PUT', '/api/admin/classes/c1/teachers', {
      cookie: QL, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'nuoc-ngoai' } },
    });
    check('ban giám hiệu khai vai', khai.status === 200, khai.status);
    const d1 = await nhom(GV);
    check('cô phụ trách nhóm nay soạn Montessori và Thể chất (chưa ai giữ), KHÔNG soạn Cambridge',
      (d1.ctDuocSua || []).join(',') === 'chu-nhiem,the-chat', d1.ctDuocSua);
    const d3 = await nhom(GV3);
    check('cô nước ngoài soạn đúng phần Cambridge', (d3.ctDuocSua || []).join(',') === 'nuoc-ngoai' && d3.ctCuaToi === 'nuoc-ngoai', d3.ctDuocSua);

    const sai = await luu(GV, 'nuoc-ngoai', [{ studentId: 's1', baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    check('cô phụ trách nhóm ghi phần Cambridge → 403', sai.status === 403, sai.status);
    const sai2 = await luu(GV3, 'chu-nhiem', [{ studentId: 's1', baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    check('cô nước ngoài ghi phần Montessori → 403', sai2.status === 403, sai2.status);
    const lech = await luu(GV, 'chu-nhiem', [{ studentId: 's1', baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    check('bài Cambridge gửi vào tab Montessori → 400', lech.status === 400, lech.status);
  }

  // =========================================================================
  console.log('\n[3] Lưu phần này KHÔNG đụng phần của cô khác');
  let keId;
  {
    const a = await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: null,
      baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }], muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }] }]);
    check('cô phụ trách nhóm lưu nháp phần Montessori', a.status === 200 && a.data.daLuu === 1, a.data);
    const b = await luu(GV3, 'nuoc-ngoai', [{ studentId: 's1', capNhatLucGoc: null,
      baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    check('cô nước ngoài lưu phần Cambridge — mốc của PHẦN mình, không đụng độ với phần kia', b.status === 200 && b.data.daLuu === 1 && !(b.data.xungDot || []).length, b.data);
    let x = await cuaBe('s1');
    keId = x.ke.id;
    check('bản kế hoạch có CẢ HAI phần', x.ke.baiHoc.some(t => t.baiHocId === thapHong.id) && x.ke.baiHoc.some(t => t.baiHocId === colours.id)
      && x.ke.muc.some(m => m.gocLinhVuc === 'toan'), x.ke.baiHoc.map(t => t.ten));
    check('mỗi phần có trạng thái riêng, đều là nháp', x.ke.chuongTrinh['chu-nhiem'].trangThai === 'nhap'
      && x.ke.chuongTrinh['nuoc-ngoai'].trangThai === 'nhap' && x.ke.chuongTrinh['chu-nhiem'].coNoiDung, x.ke.chuongTrinh);

    // Cô Montessori lưu lại phần mình (đổi nhãn) — phần Cambridge còn nguyên.
    const goc = x.ke.chuongTrinh['chu-nhiem'].capNhatLuc;
    const c = await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: goc,
      baiHoc: [{ baiHocId: thapHong.id, nhan: 'on-tap' }], muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }] }]);
    check('lưu lại phần Montessori', c.status === 200 && c.data.daLuu === 1, c.data);
    x = await cuaBe('s1');
    check('phần Cambridge của cô nước ngoài VẪN CÒN', x.ke.baiHoc.some(t => t.baiHocId === colours.id && t.nhan === 'hoc-moi'), x.ke.baiHoc);
    check('phần Montessori đổi đúng nhãn', x.ke.baiHoc.some(t => t.baiHocId === thapHong.id && t.nhan === 'on-tap'), x.ke.baiHoc);
  }

  // =========================================================================
  console.log('\n[4] Gửi duyệt từng phần: Montessori khoá, Cambridge vẫn soạn tiếp được');
  {
    const g = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
    check('cô phụ trách nhóm gửi phần Montessori', g.status === 200 && g.data.daGui === 1, g.data);
    let x = await cuaBe('s1');
    check('phần Montessori chờ duyệt, phần Cambridge vẫn nháp',
      x.ke.chuongTrinh['chu-nhiem'].trangThai === 'cho-duyet' && x.ke.chuongTrinh['nuoc-ngoai'].trangThai === 'nhap', x.ke.chuongTrinh);
    check('trạng thái GỘP của cả bản là "chờ duyệt" (cho mọi chỗ đang đọc cột cũ)', keDb(keId).trangThai === 'cho-duyet', keDb(keId).trangThai);
    const khoa = await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: x.ke.chuongTrinh['chu-nhiem'].capNhatLuc, baiHoc: [] }]);
    check('phần đang chờ duyệt thì khoá', khoa.status === 400, khoa.status);
    const tiep = await luu(GV3, 'nuoc-ngoai', [{ studentId: 's1', capNhatLucGoc: x.ke.chuongTrinh['nuoc-ngoai'].capNhatLuc,
      baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }, { baiHocId: animals.id, nhan: 'mo-rong' }] }]);
    check('cô nước ngoài VẪN soạn tiếp phần Cambridge', tiep.status === 200 && tiep.data.daLuu === 1, tiep.data);
    const cu = await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [] }] } });
    check('app ĐỜI CŨ ghi cả bản đè lên phần đang chờ duyệt → bị chặn', cu.status === 400, cu.status);
    const rut = await req('POST', '/api/kehoachbe/rut-lai', { cookie: GV3, body: { id: keId, chuongTrinh: 'chu-nhiem' } });
    check('cô nước ngoài KHÔNG rút lại được phần Montessori', rut.status === 403, rut.status);
  }

  // =========================================================================
  console.log('\n[5] Màn duyệt theo ngày / tháng / năm — gom theo nhóm, đúng phạm vi cơ sở');
  {
    const ngay = await req('GET', `/api/kehoachbe/cho-duyet?ky=ngay&moc=${NGAY}`, { cookie: QL });
    const ds = ((ngay.data || {}).nhom || []).flatMap(n => n.ds.map(x => ({ ...x, tenNhom: n.tenNhom })));
    check('xem theo NGÀY gửi: thấy đúng phần Montessori của s1', ngay.status === 200
      && ds.some(x => x.keId === keId && x.chuongTrinh === 'chu-nhiem'), ds.map(x => `${x.hoTen}/${x.chuongTrinh}`));
    check('KHÔNG thấy phần Cambridge còn nháp', !ds.some(x => x.keId === keId && x.chuongTrinh === 'nuoc-ngoai'));
    check('mỗi dòng kèm tên nhóm, người gửi, bài đã tích', ds.every(x => x.tenNhom && x.coLapTen) && ds.find(x => x.keId === keId).baiHoc.some(b => b.ten === 'Tháp hồng'), ds[0]);
    const thang = await req('GET', `/api/kehoachbe/cho-duyet?ky=thang&moc=${THANG}`, { cookie: QL });
    check('xem theo THÁNG cũng thấy', (thang.data.nhom || []).some(n => n.ds.some(x => x.keId === keId)), thang.data.tong);
    const nam = await req('GET', `/api/kehoachbe/cho-duyet?ky=nam&moc=${NGAY.slice(0, 4)}`, { cookie: QL });
    check('xem theo NĂM cũng thấy', (nam.data.nhom || []).some(n => n.ds.some(x => x.keId === keId)), nam.data.tong);
    const namKhac = await req('GET', `/api/kehoachbe/cho-duyet?ky=nam&moc=${Number(NGAY.slice(0, 4)) - 3}`, { cookie: QL });
    check('năm khác thì không có', (namKhac.data.nhom || []).length === 0, namKhac.data.tong);
    const cs2 = await req('GET', `/api/kehoachbe/cho-duyet?ky=thang&moc=${THANG}`, { cookie: QL2 });
    check('quản lý CƠ SỞ 2 không thấy bé của cơ sở 1', !(cs2.data.nhom || []).some(n => n.ds.some(x => x.keId === keId)), cs2.data.tong);
    const co = await req('GET', `/api/kehoachbe/cho-duyet?ky=thang&moc=${THANG}`, { cookie: GV });
    check('cô không mở được màn duyệt', co.status === 403, co.status);
  }

  // =========================================================================
  console.log('\n[6] Gửi lại: bắt buộc lý do, cô được báo, huy hiệu nhắc cô');
  {
    const khongLyDo = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'tra-lai', phan: [{ keId, chuongTrinh: 'chu-nhiem' }] } });
    check('gửi lại không ghi lý do → 400', khongLyDo.status === 400, khongLyDo.status);
    const tra = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: {
      quyetDinh: 'tra-lai', yKienDuyet: 'Phần Toán ghi rõ bé dùng giáo cụ nào giúp mình', phan: [{ keId, chuongTrinh: 'chu-nhiem' }] } });
    check('gửi lại một phần kèm lý do', tra.status === 200 && tra.data.so === 1, tra.data);
    check('máy chủ báo về đúng một cô — cô đã gửi', tra.data.daBaoCo === 1, tra.data);
    const x = await cuaBe('s1');
    check('phần Montessori "gửi lại" kèm đúng lý do; phần Cambridge không đổi',
      x.ke.chuongTrinh['chu-nhiem'].trangThai === 'tra-lai' && /giáo cụ/.test(x.ke.chuongTrinh['chu-nhiem'].yKienDuyet)
      && x.ke.chuongTrinh['nuoc-ngoai'].trangThai === 'nhap', x.ke.chuongTrinh);
    const hh = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data || {};
    check('huy hiệu trên ô Kế hoạch của cô: 1 phần bị gửi lại', Number(hh.kehoachbe) === 1, hh);
    const hh3 = (await req('GET', '/api/dashboard/badges', { cookie: GV3 })).data || {};
    check('cô nước ngoài không bị nhắc phần không phải của mình', !hh3.kehoachbe, hh3);
  }

  // =========================================================================
  console.log('\n[7] Gửi lại xong, duyệt từng phần → bản gộp "đã duyệt" khi đủ mọi phần');
  {
    let x = await cuaBe('s1');
    await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: x.ke.chuongTrinh['chu-nhiem'].capNhatLuc,
      baiHoc: [{ baiHocId: thapHong.id, nhan: 'on-tap' }], muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10 bằng chuỗi hạt' }] }]);
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
    const g3 = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV3, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'nuoc-ngoai' } });
    check('cô nước ngoài gửi phần Cambridge', g3.status === 200 && g3.data.daGui === 1, g3.data);
    const d1 = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId, chuongTrinh: 'chu-nhiem' }] } });
    check('duyệt phần Montessori', d1.status === 200 && d1.data.so === 1, d1.data);
    check('còn phần Cambridge chờ → bản gộp vẫn "chờ duyệt"', keDb(keId).trangThai === 'cho-duyet', keDb(keId).trangThai);
    const ph1 = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH });
    check('gia đình CHƯA thấy bài khi bản chưa duyệt đủ', ph1.status === 200 && !JSON.stringify(ph1.data).includes('Tháp hồng'));
    const d2 = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId, chuongTrinh: 'nuoc-ngoai' }] } });
    check('duyệt phần Cambridge', d2.status === 200 && d2.data.so === 1, d2.data);
    check('đủ mọi phần có nội dung → bản gộp "đã duyệt"', keDb(keId).trangThai === 'da-duyet', keDb(keId).trangThai);
    const lai = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId, chuongTrinh: 'nuoc-ngoai' }] } });
    check('duyệt lại phần đã duyệt → 400', lai.status === 400, lai.status);
  }

  // =========================================================================
  console.log('\n[8] Đề xuất sửa MỘT phần: chỉ phần đó mở lại');
  {
    const dx = await req('POST', `/api/kehoachbe/${keId}/de-xuat`, { cookie: GV3, body: { lyDo: 'Bé nghỉ một tuần, dời Animals sang tháng sau', chuongTrinh: 'nuoc-ngoai' } });
    check('cô nước ngoài xin sửa phần Cambridge', dx.status === 201, dx.data);
    const dxId = dx.data.deXuat.id;
    const ok = await req('POST', `/api/kehoachbe/de-xuat/${dxId}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    check('quản lý đồng ý', ok.status === 200, ok.data);
    const x = await cuaBe('s1');
    check('CHỈ phần Cambridge mở lại; phần Montessori vẫn đã duyệt',
      x.ke.chuongTrinh['nuoc-ngoai'].trangThai === 'nhap' && x.ke.chuongTrinh['chu-nhiem'].trangThai === 'da-duyet', x.ke.chuongTrinh);
    const cu = await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [] }] } });
    check('app đời cũ vẫn không ghi cả bản đè lên phần đã duyệt', cu.status === 400, cu.status);
  }

  // =========================================================================
  console.log('\n[9] Duyệt hàng loạt cả nhóm, và người lập không tự duyệt');
  {
    for (const id of ['s3', 's4']) {
      await luu(GV, 'chu-nhiem', [{ studentId: id, capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    }
    const g = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem' } });
    check('gửi duyệt cả nhóm phần Montessori', g.status === 200 && g.data.daGui === 2, g.data);
    const ds = await req('GET', `/api/kehoachbe/cho-duyet?ky=thang&moc=${THANG}`, { cookie: QL });
    const n = (ds.data.nhom || []).find(x => x.classId === 'c1') || { ds: [] };
    const phan = n.ds.filter(x => x.trangThai === 'cho-duyet').map(x => ({ keId: x.keId, chuongTrinh: x.chuongTrinh }));
    check('màn duyệt gom đủ hai bé của nhóm', phan.length === 2, phan);
    const het = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan } });
    check('duyệt cả nhóm một lần', het.status === 200 && het.data.so === 2, het.data);

    await luu(QL, 'the-chat', [{ studentId: 's5', capNhatLucGoc: null, baiHoc: [{ baiHocId: bongRo.id, nhan: 'hoc-moi' }] }]);
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: QL, body: { classId: 'c1', thang: THANG, studentId: 's5', chuongTrinh: 'the-chat' } });
    const k5 = (await cuaBe('s5', QL)).ke;
    const tu = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: k5.id, chuongTrinh: 'the-chat' }] } });
    check('người lập (kể cả quản lý) không tự duyệt phần mình lập', tu.status === 403, tu.status);
  }

  // =========================================================================
  console.log('\n[10] Kho bài theo lứa');
  {
    const them = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'Bảng nhân lứa lớn', lua: ['5-6'] } });
    check('văn phòng thêm bài gắn lứa 5–6', them.status === 200 && (them.data.baiHoc.lua || []).join() === '5-6', them.data);
    const sai = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'Bài lạ', lua: ['7-8'] } });
    check('lứa lạ → 400', sai.status === 400, sai.status);
    const sua = await req('PUT', `/api/kehoachbe/bai-hoc/${them.data.baiHoc.id}`, { cookie: QL, body: { lua: ['4-5', '5-6'] } });
    check('sửa lứa của bài', sua.status === 200 && (sua.data.baiHoc.lua || []).join() === '4-5,5-6', sua.data);
    const coSua = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: GV, body: { gocLinhVuc: 'toan', ten: 'Cô tự thêm', lua: ['3-4'] } });
    check('cô KHÔNG sửa kho bài', coSua.status === 403, coSua.status);
    const dm2 = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
    check('bài cũ không gắn lứa = mọi lứa (lua rỗng), không đổi gì', (dm2.find(b => b.id === thapHong.id) || {}).lua?.length === 0);
  }

  // =========================================================================
  console.log('\n[11] App đời cũ (không gửi chuongTrinh) vẫn chạy trọn vòng trên bản chưa tách');
  {
    const a = await req('PUT', '/api/kehoachbe', { cookie: GV3, body: { classId: 'c1', thang: THANG,
      danhSach: [{ studentId: 's6', muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm tới 5' }] }] } });
    check('lưu cả bản như trước', a.status === 200 && a.data.daLuu === 1, a.data);
    const g = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV3, body: { classId: 'c1', thang: THANG, studentId: 's6' } });
    check('gửi cả bản như trước', g.status === 200 && g.data.daGui === 1, g.data);
    const k6 = (await cuaBe('s6')).ke;
    const d = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', ids: [k6.id] } });
    check('duyệt theo mã kế hoạch (ids) như trước', d.status === 200 && d.data.so === 1, d.data);
    check('bản gộp "đã duyệt"', keDb(k6.id).trangThai === 'da-duyet', keDb(k6.id).trangThai);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
