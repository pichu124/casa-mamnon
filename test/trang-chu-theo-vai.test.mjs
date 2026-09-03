// Bài canh TRANG CHỦ THEO VAI (Đ124) — phần máy chủ.
//
// Chạy bằng:  npm run test:trang-chu-theo-vai
//
// Ba đường mới và hai vế mở rộng:
//   • GET /api/dashboard/hom-nay?classId=   — một nhóm, hôm nay, từng bé + số đếm
//   • GET /api/dashboard/tong-quan          — cơ sở → nhóm → số đếm (quản trị)
//   • /api/auth/me                          — kèm cơ sở, chức vụ, quyền mở hồ sơ bé
//   • /api/notifications, /api/surveys      — mỗi dòng nói rõ gửi cho ai
//
// VÌ SAO BÀI NÀY SOI KỸ PHÂN QUYỀN HƠN SOI CON SỐ
//
// Hai đường "hôm nay" gom tên bé + trạng thái điểm danh + thuốc + đơn nghỉ về
// MỘT chỗ. Đó là chỗ tiện nhất cho cô, và cũng là chỗ rò dữ liệu tiện nhất nếu
// quên hỏi quyền: cô nhóm này nhìn thấy nhóm kia, văn phòng cơ sở 2 nhìn thấy
// cơ sở 1, Nhân sự (chức vụ không mở hồ sơ bé) nhìn thấy tên và tình trạng
// từng bé. Mỗi vế đó là một phép kiểm dưới đây.
//
// Con số thì đo bằng HIỆU SỐ (trước / sau khi chấm một bé), không ghi cứng —
// dữ liệu mẫu có thể đã có dòng điểm danh hôm nay, và bài này không được đỏ
// theo lịch.
import {
  thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY, MAU,
} from './_chung.mjs';

const DIR = thuMucTam('trang-chu-theo-vai');
sinhDuLieu(DIR);   // phân hệ mở rộng TẮT → vế nhật ký / đón trả phải là null, không phải 0
const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản Lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');
const mkNS = taoQuanTri(DIR, 'Chị Nhân Sự', 'nhansu1');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4160), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

const bgh = await login('hieutruong', mkBGH);
const qlCS2 = await login('quanly2', mkCS2);
const ns = await login('nhansu1', mkNS);
const gv = await login('giaovien', '123456');    // cô t1 — nhóm c1 (Chồi 2)
const gv3 = await login('giaovien3', '123456');  // cô t3 — phụ hai nhóm c1 + c2
const ph = await login('phuhuynh', '123456');
const homNay = HOM_NAY();

const homNayCua = (cookie, classId) =>
  req('GET', `/api/dashboard/hom-nay${classId ? `?classId=${classId}` : ''}`, { cookie });

// ===========================================================================
console.log('\n[1] Cô một nhóm: /hom-nay không cần chọn nhóm, trả đúng nhóm mình');
{
  const r = await homNayCua(gv.cookie);
  check('200', r.status === 200, r.data);
  check('đúng nhóm Chồi 2 của cô', r.data && r.data.nhom && r.data.nhom.name === 'Chồi 2', r.data && r.data.nhom);
  check('nhóm biết mình thuộc cơ sở nào', r.data && r.data.nhom.coSo && r.data.nhom.coSo.id === 'cs1', r.data && r.data.nhom);
  check(`đủ ${MAU.soBeNhomChoi2} bé của nhóm`, r.data && r.data.be.length === MAU.soBeNhomChoi2, r.data && r.data.be.length);
  check('số đếm khớp danh sách', r.data && r.data.dem.soBe === r.data.be.length);
  check('ngày là hôm nay theo giờ Việt Nam', r.data && r.data.ngay === homNay, r.data && r.data.ngay);
  check('có tên cô phụ trách', r.data && r.data.co.some(c => c.name), r.data && r.data.co);
  const be = r.data ? r.data.be[0] : null;
  check('mỗi bé có đủ các ô trạng thái việc', be && ['diemDanh', 'nghiCoPhep', 'donCho', 'thuoc', 'nhatKy', 'daTra']
    .every(k => k in be), be);
  check('phân hệ nhật ký TẮT → vế nhật ký là null, không phải 0',
    r.data && r.data.phanHe.nhatky === false && r.data.dem.nhatKyDaGhi === null && be.nhatKy === null,
    r.data && { ph: r.data.phanHe, dem: r.data.dem.nhatKyDaGhi, be: be.nhatKy });
  check('phân hệ đón trả TẮT → vế đón trả là null',
    r.data && r.data.dem.daTra === null && be.daTra === null);
  const chuaCo = r.data ? r.data.be.filter(b => !b.diemDanh).length : 0;
  check('"chưa điểm danh" đếm đúng số bé chưa có dòng', r.data && r.data.dem.chuaDiemDanh === chuaCo,
    r.data && [r.data.dem.chuaDiemDanh, chuaCo]);
}

// ===========================================================================
console.log('\n[2] Chấm một bé thì hôm nay đổi theo — đo bằng hiệu số');
{
  const truoc = (await homNayCua(gv.cookie)).data;
  const be = truoc.be.find(b => !b.diemDanh) || truoc.be[0];
  const r = await req('POST', '/api/attendance/mark',
    { cookie: gv.cookie, body: { studentId: be.id, date: homNay, status: 'present' } });
  check('chấm có mặt được', r.status === 200 || r.status === 201, r.data);
  const sau = (await homNayCua(gv.cookie)).data;
  const beSau = sau.be.find(b => b.id === be.id);
  check('bé đó nay là "present"', beSau && beSau.diemDanh === 'present', beSau);
  const themCoMat = be.diemDanh === 'present' ? 0 : 1;
  const botChua = be.diemDanh ? 0 : 1;
  check('có mặt tăng đúng một', sau.dem.coMat === truoc.dem.coMat + themCoMat, [truoc.dem.coMat, sau.dem.coMat]);
  check('chưa điểm danh giảm đúng một', sau.dem.chuaDiemDanh === truoc.dem.chuaDiemDanh - botChua,
    [truoc.dem.chuaDiemDanh, sau.dem.chuaDiemDanh]);
  check('tổng bé không đổi', sau.dem.soBe === truoc.dem.soBe);
}

// ===========================================================================
console.log('\n[3] Phân quyền của /hom-nay');
{
  const khac = await homNayCua(gv.cookie, 'c2');
  check('cô nhóm c1 hỏi nhóm c2 → 403', khac.status === 403, khac.status);
  const phu1 = await homNayCua(gv3.cookie, 'c1');
  const phu2 = await homNayCua(gv3.cookie, 'c2');
  check('cô phụ hai nhóm mở được cả hai', phu1.status === 200 && phu2.status === 200, [phu1.status, phu2.status]);
  const nhieu = await homNayCua(gv3.cookie);
  check('cô hai nhóm mà không nói nhóm nào → 400 (không tự đoán)', nhieu.status === 400, nhieu.status);
  const gd = await homNayCua(ph.cookie, 'c1');
  check('phụ huynh → 403', gd.status === 403, gd.status);
  const ma = await homNayCua(gv.cookie, 'khong-co');
  check('nhóm không tồn tại → không lộ gì (403/404)', ma.status === 403 || ma.status === 404, ma.status);
  const khong = await req('GET', '/api/dashboard/hom-nay?classId=c1');
  check('chưa đăng nhập → 401', khong.status === 401, khong.status);
}

// ===========================================================================
console.log('\n[4] Ban giám hiệu: /tong-quan thấy cả trường theo cơ sở → nhóm');
{
  const r = await req('GET', '/api/dashboard/tong-quan', { cookie: bgh.cookie });
  check('200', r.status === 200, r.data);
  const d = r.data || {};
  const ten = (d.coSo || []).map(c => c.name);
  check('liệt kê đủ ba cơ sở', ten.length === 3, ten);
  const cs1 = (d.coSo || []).find(c => c.id === 'cs1') || { nhom: [] };
  const cs2 = (d.coSo || []).find(c => c.id === 'cs2') || { nhom: [] };
  check('cơ sở 1 có ba nhóm', cs1.nhom.length === 3, cs1.nhom.map(n => n.name));
  check(`cơ sở 1 có ${MAU.soBeCoSo1} bé`, cs1.dem && cs1.dem.soBe === MAU.soBeCoSo1, cs1.dem);
  check('cơ sở 2 có nhóm Mầm 1 trống (0 bé) — vẫn hiện, không giấu',
    cs2.nhom.length === 1 && cs2.nhom[0].soBe === 0, cs2.nhom);
  check('mỗi nhóm có tên cô chính', cs1.nhom.every(n => 'coChinh' in n), cs1.nhom[0]);
  check(`tổng ${MAU.soBe} bé, ${MAU.soNhom} nhóm`, d.tong && d.tong.soBe === MAU.soBe && d.tong.soNhom === MAU.soNhom, d.tong);
  check('không có nhóm rơi ngoài cơ sở', Array.isArray(d.khongCoSo) && d.khongCoSo.length === 0, d.khongCoSo);
  check('ban giám hiệu được xem từng bé', d.xemTungBe === true);
  const choi2 = cs1.nhom.find(n => n.id === 'c1');
  check('số đếm nhóm Chồi 2 khớp /hom-nay của chính nhóm đó',
    choi2 && choi2.coMat === (await homNayCua(bgh.cookie, 'c1')).data.dem.coMat, choi2);
  const hn = await homNayCua(bgh.cookie, 'c4');
  check('ban giám hiệu mở được /hom-nay của mọi nhóm', hn.status === 200, hn.status);
}

// ===========================================================================
console.log('\n[5] Quản lý bị KHOÁ vào cơ sở 2: chỉ thấy cơ sở 2');
{
  const r = await req('GET', '/api/dashboard/tong-quan', { cookie: qlCS2.cookie });
  check('200', r.status === 200, r.data);
  const d = r.data || {};
  check('chỉ một cơ sở, là cs2', d.coSo && d.coSo.length === 1 && d.coSo[0].id === 'cs2', d.coSo && d.coSo.map(c => c.id));
  check('tổng bé = 0 (cơ sở 2 chưa có bé)', d.tong && d.tong.soBe === 0, d.tong);
  const c1 = await homNayCua(qlCS2.cookie, 'c1');
  check('hỏi nhóm của cơ sở 1 → 403', c1.status === 403, c1.status);
  const c3 = await homNayCua(qlCS2.cookie, 'c3');
  check('hỏi nhóm của cơ sở mình → 200', c3.status === 200, c3.status);
}

// ===========================================================================
console.log('\n[6] Nhân sự — chức vụ KHÔNG mở hồ sơ bé');
{
  const tq = await req('GET', '/api/dashboard/tong-quan', { cookie: ns.cookie });
  check('vẫn xem được cây cơ sở → nhóm (số đếm, không tên bé)', tq.status === 200, tq.data);
  check('và được báo là KHÔNG xem từng bé', tq.data && tq.data.xemTungBe === false, tq.data && tq.data.xemTungBe);
  check('cây không chứa tên bé nào', tq.data && !JSON.stringify(tq.data).includes('Nguyễn Bảo An'));
  const hn = await homNayCua(ns.cookie, 'c1');
  check('/hom-nay (có tên + tình trạng từng bé) → 403', hn.status === 403, hn.status);
  const ph2 = await req('GET', '/api/dashboard/tong-quan', { cookie: ph.cookie });
  check('phụ huynh → 403', ph2.status === 403, ph2.status);
  const gvTq = await req('GET', '/api/dashboard/tong-quan', { cookie: gv.cookie });
  check('cô → 403 (cây cả trường là việc của văn phòng)', gvTq.status === 403, gvTq.status);
}

// ===========================================================================
console.log('\n[7] Gói /me: cơ sở, chức vụ, quyền mở hồ sơ bé');
{
  const me = (await req('GET', '/api/auth/me', { cookie: bgh.cookie })).data;
  check('school.coSo liệt kê ba cơ sở có tên', me && me.school && Array.isArray(me.school.coSo)
    && me.school.coSo.length === 3 && me.school.coSo.every(c => c.id && c.name), me && me.school && me.school.coSo);
  check('ban giám hiệu: moHoSoBe = true', me && me.user.moHoSoBe === true, me && me.user.moHoSoBe);
  const meNs = (await req('GET', '/api/auth/me', { cookie: ns.cookie })).data;
  check('nhân sự: chucVu = "nhansu", moHoSoBe = false',
    meNs && meNs.user.chucVu === 'nhansu' && meNs.user.moHoSoBe === false, meNs && meNs.user);
  const meGv = (await req('GET', '/api/auth/me', { cookie: gv.cookie })).data;
  check('cô: moHoSoBe = true, chucVu = null', meGv && meGv.user.moHoSoBe === true && meGv.user.chucVu === null, meGv && meGv.user);
  check('các trường cũ của me còn nguyên (students, classes, school.currentYear)',
    me && Array.isArray(me.students) && Array.isArray(me.classes) && me.school.currentYear, me && Object.keys(me));
}

// ===========================================================================
console.log('\n[8] Thông báo và khảo sát nói rõ gửi cho ai');
{
  const t1 = await req('POST', '/api/notifications', { cookie: gv.cookie,
    body: { title: 'Mai nhóm mình chơi với nước', body: 'Gửi thêm quần áo', category: 'Nhóm lớp', audience: 'class' } });
  const t2 = await req('POST', '/api/notifications', { cookie: bgh.cookie,
    body: { title: 'Nghỉ lễ', body: 'Toàn trường nghỉ', category: 'Nhà trường', audience: 'all' } });
  check('tạo được hai thông báo mẫu', t1.status === 201 && t2.status === 201, [t1.status, t2.status]);
  const ds = (await req('GET', '/api/notifications', { cookie: ph.cookie })).data || [];
  const nhom = ds.find(n => n.title === 'Mai nhóm mình chơi với nước');
  const truong = ds.find(n => n.title === 'Nghỉ lễ');
  check('thông báo nhóm: tenNhom = Chồi 2, tenCoSo = Cơ sở 1, toanTruong = false',
    nhom && nhom.toanTruong === false && nhom.tenNhom === 'Chồi 2' && nhom.tenCoSo === 'Cơ sở 1', nhom);
  check('thông báo toàn trường: toanTruong = true, không tên nhóm',
    truong && truong.toanTruong === true && truong.tenNhom === '' && truong.tenCoSo === '', truong);

  const ks = await req('POST', '/api/surveys', { cookie: gv.cookie, body: {
    title: 'Dã ngoại nhóm mình', description: '', deadline: '2030-01-01', audience: 'class',
    questions: [{ text: 'Nhà mình đi được không?', type: 'choice', options: ['Có', 'Không'] }],
  } });
  check('tạo được khảo sát nhóm', ks.status === 201, ks.data);
  const dsKs = (await req('GET', '/api/surveys', { cookie: ph.cookie })).data || [];
  const k = dsKs.find(s => s.title === 'Dã ngoại nhóm mình');
  check('khảo sát nhóm mang tenNhom + tenCoSo', k && k.tenNhom === 'Chồi 2' && k.tenCoSo === 'Cơ sở 1', k);
  const chiTiet = (await req('GET', `/api/surveys/${ks.data.id}`, { cookie: gv.cookie })).data;
  check('chi tiết khảo sát cũng mang tenCoSo', chiTiet && chiTiet.tenCoSo === 'Cơ sở 1', chiTiet && chiTiet.tenCoSo);
}

sv.dung();

// ===========================================================================
console.log('\n[9] Bật phân hệ mầm non: vế nhật ký / đón trả là SỐ, không còn null');
{
  const DIR2 = thuMucTam('trang-chu-theo-vai-phan-he');
  sinhDuLieu(DIR2, { phanHe: true });
  batPhanHe(DIR2, ['nhatky', 'dontra', 'thuchup']);
  const sv2 = await dungMayChu({ port: Number(process.env.TEST_PORT || 4160) + 1, dir: DIR2 });
  const req2 = taoReq(sv2.BASE);
  const login2 = taoLogin(req2);
  const co = await login2('giaovien', '123456');
  const r = await req2('GET', '/api/dashboard/hom-nay?classId=c1', { cookie: co.cookie });
  check('200', r.status === 200, r.data);
  const d = r.data || { dem: {}, phanHe: {}, be: [] };
  check('phanHe.nhatky = true', d.phanHe.nhatky === true, d.phanHe);
  check('nhatKyDaGhi là số (0 hoặc hơn), không phải null', typeof d.dem.nhatKyDaGhi === 'number', d.dem);
  check('daTra là số, không phải null', typeof d.dem.daTra === 'number', d.dem);
  check('từng bé: nhatKy / daTra là boolean', d.be.every(b => typeof b.nhatKy === 'boolean' && typeof b.daTra === 'boolean'), d.be[0]);
  sv2.dung();
}

tongKet();
