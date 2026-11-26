// Bài canh CHUÔNG CỦA CÔ, VĂN PHÒNG VÀ QUẢN LÝ (Đ260c).
//
// Chạy bằng:  node test/thong-bao-nv.test.mjs   (TEST_PORT đổi được cổng)
//
// Nhà trường 18/11: gia đình xin nghỉ cho con mà cô và văn phòng không được
// báo ở chuông, chỉ thấy ở màn Xin phép. Mọi việc gia đình → cô và quản lý ↔
// cô phải hiện ở chuông và làm sáng ô của màn có việc đó.
//
// CHỖ ĐÁNG CANH NHẤT LÀ NGƯỜI NHẬN, không phải việc có dòng hay không:
//   • đúng cô của nhóm (dặn thuốc không tới cô thể chất, tin kênh cô phụ
//     trách không tới cô nước ngoài), đúng văn phòng của cơ sở, không ai của
//     cơ sở khác, không ban giám hiệu Cấp 1 (người điều phối chốt 25/11);
//   • không một dòng nào cho phụ huynh;
//   • không chép lý do nghỉ, tên thuốc, chữ tin nhắn (màn khoá điện thoại).
import path from 'path';
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('thong-bao-nv');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'baocaohoctap']);
const CSDL = path.join(DIR, 'school.db');

// Nhóm A = c1 (cơ sở 1): t1 cô phụ trách, t5 cô nước ngoài (dữ liệu mẫu), t3
// khai thành cô thể chất. Nhóm B = c4: t4. t2 ở c2.
{
  const c = new Database(CSDL);
  c.prepare("INSERT OR REPLACE INTO class_teacher_nhom (classId, teacherId, nhom) VALUES ('c1', 't3', 'the-chat')").run();
  c.close();
}
const TK = [
  ['nv_ht', 'Hiệu Trưởng NV', null, null],
  ['nv_vpa', 'Văn Phòng A', 'vanphong-coso', 'cs1'],
  ['nv_vpb', 'Văn Phòng B', 'vanphong-coso', 'cs2'],
  ['nv_qla', 'Quản Lý A', 'quanly-coso', 'cs1'],
  ['nv_qlb', 'Quản Lý B', 'quanly-coso', 'cs2'],
  ['nv_kt', 'Kế Toán A', 'ketoan', 'cs1'],
];
const mk = {};
for (const [ten, hoTen, cv, cs] of TK) {
  mk[ten] = taoQuanTri(DIR, hoTen, ten);
  if (cv) datChucVu(DIR, ten, cv);
  if (cs) khoaVaoCoSo(DIR, ten, cs);
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5200), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u) {
  const d = await login(u, mk[u]);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const docCsdl = (sql, ...ts) => {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
};
const ghiCsdl = (sql, ...ts) => {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
};
const idCua = (username) => docCsdl('SELECT id FROM users WHERE username = ?', username)[0].id;
const dongCua = (userId, loai) => docCsdl('SELECT * FROM thongbao_nv WHERE userId = ? AND loai = ?', userId, loai);
const rieng = async (cookie) => (await req('GET', '/api/notifications/rieng-nv', { cookie })).data;
const badges = async (cookie) => (await req('GET', '/api/dashboard/badges', { cookie })).data || {};

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const NGAY_MAI = new Date(Date.parse(`${HOM}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

try {
  const C = {};
  for (const [ten] of TK) C[ten] = await vao(ten);
  for (const u of ['giaovien', 'giaovien2', 'giaovien3', 'giaovien4', 'giaovien.nn', 'phuhuynh', 'phuhuynh2', 'ph.tuan', 'ph.huong']) {
    C[u] = (await login(u, '123456')).cookie;
  }
  const ID = Object.fromEntries([...TK.map(t => t[0]), 'giaovien', 'giaovien2', 'giaovien3', 'giaovien4', 'giaovien.nn', 'phuhuynh', 'ph.huong']
    .map(u => [u, idCua(u)]));
  const NHAN_DU = ['giaovien', 'giaovien.nn', 'giaovien3', 'nv_vpa', 'nv_qla'];
  const KHONG_NHAN = ['giaovien2', 'giaovien4', 'nv_vpb', 'nv_qlb', 'nv_kt', 'nv_ht', 'phuhuynh', 'ph.huong'];

  // =========================================================================
  console.log('\n[1] Gia đình xin nghỉ cho bé: cả nhóm cô và văn phòng của cơ sở có MỘT dòng');
  let donId;
  {
    const r = await req('POST', '/api/leave', { cookie: C.phuhuynh, body: {
      studentId: 's1', fromDate: HOM, toDate: NGAY_MAI, reason: 'LYDO-BI-MAT con sốt' } });
    check('đối chứng — gia đình gửi được đơn', r.status === 201, r.status);
    donId = r.data && r.data.id;
    for (const u of NHAN_DU) {
      const d = dongCua(ID[u], 'xin-nghi');
      check(`${u}: có đúng 1 dòng xin nghỉ`, d.length === 1, d.length);
    }
    for (const u of KHONG_NHAN) {
      check(`${u}: không có dòng nào`, dongCua(ID[u], 'xin-nghi').length === 0);
    }
    const d = dongCua(ID.giaovien, 'xin-nghi')[0] || {};
    check('dòng nói tên bé và mở màn Xin phép', /Nguyễn Bảo An/.test(d.tieuDe) && d.hash === '#/leave' && d.man === 'leave', d);
    check('dòng KHÔNG chép lý do nghỉ', !/LYDO-BI-MAT|sốt/.test(`${d.tieuDe} ${d.noiDung}`), d);
    const ds = await rieng(C.giaovien);
    check('cô đọc được dòng qua /rieng-nv, kèm tên bé', Array.isArray(ds) && ds.some(x => x.laRiengNv && x.loai === 'xin-nghi' && x.tenBe === 'Nguyễn Bảo An' && !x.read), ds);
    const ph = await req('GET', '/api/notifications/rieng-nv', { cookie: C.phuhuynh });
    check('phụ huynh gọi /rieng-nv nhận mảng rỗng', ph.status === 200 && Array.isArray(ph.data) && ph.data.length === 0, ph);
    check('không có dòng thongbao_nv nào của một tài khoản phụ huynh',
      docCsdl("SELECT COUNT(*) AS n FROM thongbao_nv t JOIN users u ON u.id = t.userId WHERE u.role = 'parent'")[0].n === 0);
  }

  // =========================================================================
  console.log('\n[2] Dặn thuốc: cô phụ trách, cô nước ngoài, văn phòng — KHÔNG cô thể chất');
  {
    const r = await req('POST', '/api/medicine', { cookie: C.phuhuynh, body: {
      studentId: 's1', fromDate: HOM, toDate: HOM, medicines: [{ name: 'THUOC-BI-MAT', dose: '5ml', timing: 'sau ăn trưa' }], note: '' } });
    check('đối chứng — gia đình dặn thuốc được', r.status === 201, r.status);
    for (const u of ['giaovien', 'giaovien.nn', 'nv_vpa', 'nv_qla']) {
      check(`${u}: có đúng 1 dòng dặn thuốc`, dongCua(ID[u], 'dan-thuoc').length === 1, dongCua(ID[u], 'dan-thuoc').length);
    }
    for (const u of ['giaovien3', ...KHONG_NHAN]) {
      check(`${u}: không có dòng dặn thuốc`, dongCua(ID[u], 'dan-thuoc').length === 0);
    }
    const d = dongCua(ID.giaovien, 'dan-thuoc')[0] || {};
    check('dòng KHÔNG chép tên thuốc, mở màn Dặn thuốc', !/THUOC-BI-MAT|5ml/.test(`${d.tieuDe} ${d.noiDung}`) && d.hash === '#/medicine', d);
    check('đối chứng — dòng nói số loại thuốc', /1 loại thuốc/.test(d.noiDung), d.noiDung);
  }

  // =========================================================================
  console.log('\n[3] Gia đình nhắn cô: một dòng gộp cho cả cuộc, mở cuộc là đã đọc');
  {
    const mo = await req('POST', '/api/messages/start', { cookie: C.phuhuynh, body: { kenh: 'nhom', studentId: 's1' } });
    check('đối chứng — mở kênh cô phụ trách', mo.status === 200 && mo.data.id, mo);
    const cv = mo.data.id;
    for (const t of ['TIN-BI-MAT mot', 'TIN-BI-MAT hai']) {
      const g = await req('POST', `/api/messages/${cv}`, { cookie: C.phuhuynh, body: { text: t } });
      check('đối chứng — gia đình nhắn được', g.status === 200, g.status);
    }
    const d = dongCua(ID.giaovien, 'tin-nhan');
    check('cô phụ trách: MỘT dòng, soLan = 2', d.length === 1 && d[0].soLan === 2 && !d[0].docLuc, d);
    check('dòng KHÔNG chép chữ tin nhắn', d[0] && !/TIN-BI-MAT/.test(`${d[0].tieuDe} ${d[0].noiDung}`), d[0]);
    for (const u of ['giaovien3', 'giaovien.nn', 'giaovien4', 'nv_vpa']) {
      check(`${u}: không có dòng tin nhắn của kênh cô phụ trách`, dongCua(ID[u], 'tin-nhan').length === 0);
    }
    const da = await req('GET', '/api/notifications/rieng-nv/da-xem', { cookie: C.giaovien });
    check('đối chứng — /da-xem chỉ nhận POST', da.status === 404 || da.status === 405, da.status);
    await req('POST', '/api/notifications/rieng-nv/da-xem', { cookie: C.giaovien, body: { man: 'messages' } });
    check('mở danh sách tin nhắn CHƯA tính là đọc dòng tin (phải mở đúng cuộc)', !dongCua(ID.giaovien, 'tin-nhan')[0].docLuc);
    await req('GET', `/api/messages/${cv}`, { cookie: C.giaovien });
    check('cô mở đúng cuộc → dòng thành đã đọc', !!dongCua(ID.giaovien, 'tin-nhan')[0].docLuc);

    const vp = await req('POST', '/api/messages/start', { cookie: C.phuhuynh, body: { kenh: 'vanphong', studentId: 's1' } });
    check('đối chứng — mở hộp thư văn phòng', vp.status === 200 && vp.data.id, vp);
    await req('POST', `/api/messages/${vp.data.id}`, { cookie: C.phuhuynh, body: { text: 'TIN-BI-MAT van phong' } });
    check('văn phòng cơ sở 1: có dòng', dongCua(ID.nv_vpa, 'tin-nhan').length === 1);
    check('quản lý cơ sở 1: có dòng', dongCua(ID.nv_qla, 'tin-nhan').length === 1);
    for (const u of ['nv_vpb', 'nv_qlb', 'nv_kt', 'nv_ht']) {
      check(`${u}: không có dòng tin văn phòng`, dongCua(ID[u], 'tin-nhan').length === 0);
    }
    check('cô phụ trách không nhận tin của hộp thư văn phòng', dongCua(ID.giaovien, 'tin-nhan').length === 1);

    // Phòng chung nhiều gia đình KHÔNG ghi chuông (người điều phối 25/11).
    const truoc = docCsdl("SELECT COUNT(*) AS n FROM thongbao_nv WHERE loai = 'tin-nhan'")[0].n;
    const phong = docCsdl("SELECT c.id FROM conversations c JOIN conversation_members m ON m.conversationId = c.id WHERE c.type = 'group' AND m.userId = ?", ID.phuhuynh)[0];
    if (phong) {
      const g = await req('POST', `/api/messages/${phong.id}`, { cookie: C.phuhuynh, body: { text: 'chào cả nhóm' } });
      check('đối chứng — gia đình nhắn được vào phòng chung', g.status === 200, g.status);
      check('phòng chung: không ghi dòng chuông nào',
        docCsdl("SELECT COUNT(*) AS n FROM thongbao_nv WHERE loai = 'tin-nhan'")[0].n === truoc);
    } else {
      check('đối chứng — dữ liệu mẫu có phòng chung gia đình tham gia', false, 'không thấy phòng chung');
    }
  }

  // =========================================================================
  console.log('\n[4] Ba gia đình trả lời khảo sát: người tạo có MỘT dòng, soLan = 3');
  let ksId;
  {
    const t = await req('POST', '/api/surveys', { cookie: C.giaovien, body: {
      title: 'Giờ đón bé', deadline: NGAY_MAI, audience: 'class', classId: 'c1',
      questions: [{ type: 'choice', text: 'Giờ nào tiện?', options: ['16h', '17h'] }] } });
    check('đối chứng — cô tạo khảo sát', t.status === 201 && t.data.id, t);
    ksId = t.data.id;
    for (const u of ['phuhuynh', 'phuhuynh2', 'ph.tuan']) {
      const r = await req('POST', `/api/surveys/${ksId}/respond`, { cookie: C[u], body: { answers: { q1: '16h' } } });
      check(`đối chứng — ${u} trả lời`, r.status === 201, r.status);
    }
    const d = dongCua(ID.giaovien, 'khao-sat');
    check('người tạo: MỘT dòng, soLan = 3', d.length === 1 && d[0].soLan === 3, d);
    check('tiêu đề nói "3 gia đình"', d[0] && /3 gia đình/.test(d[0].tieuDe), d[0] && d[0].tieuDe);
    check('cô khác của nhóm không có dòng khảo sát', dongCua(ID['giaovien.nn'], 'khao-sat').length === 0);
  }

  // =========================================================================
  console.log('\n[5] Kế hoạch của bé: quản lý ↔ cô');
  {
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: C.giaovien })).data || {};
    const thapHong = (dm.baiHoc || []).find(b => b.ten === 'Tháp hồng');
    const luu = await req('PUT', '/api/kehoachbe', { cookie: C.giaovien, body: {
      classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem',
      danhSach: [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] } });
    check('đối chứng — cô lưu kế hoạch', luu.status === 200, luu.data);
    const guiDuyet = () => req('POST', '/api/kehoachbe/gui-duyet', { cookie: C.giaovien, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
    const g = await guiDuyet();
    check('đối chứng — cô gửi duyệt', g.status === 200 && g.data.daGui === 1, g.data);
    check('quản lý cơ sở 1: có dòng kế hoạch chờ duyệt', dongCua(ID.nv_qla, 'ke-hoach-gui').length === 1);
    check('ban giám hiệu: có dòng (việc chờ duyệt như trước)', dongCua(ID.nv_ht, 'ke-hoach-gui').length === 1);
    check('quản lý cơ sở 2 và văn phòng: không', dongCua(ID.nv_qlb, 'ke-hoach-gui').length === 0 && dongCua(ID.nv_vpa, 'ke-hoach-gui').length === 0);

    const keId = (((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: C.giaovien })).data.danhSach || [])
      .find(x => x.studentId === 's1') || {}).ke.id;
    const tra = await req('POST', '/api/kehoachbe/duyet', { cookie: C.nv_qla, body: {
      quyetDinh: 'tra-lai', yKienDuyet: 'Thêm một bài đếm', phan: [{ keId, chuongTrinh: 'chu-nhiem' }] } });
    check('đối chứng — quản lý gửi lại', tra.status === 200, tra.data);
    check('cô lập: có dòng "được gửi lại"', dongCua(ID.giaovien, 'ke-hoach-tra-lai').length === 1);
    check('cô khác không có', dongCua(ID['giaovien.nn'], 'ke-hoach-tra-lai').length === 0);
    await guiDuyet();
    const duyet = await req('POST', '/api/kehoachbe/duyet', { cookie: C.nv_qla, body: {
      quyetDinh: 'da-duyet', phan: [{ keId, chuongTrinh: 'chu-nhiem' }] } });
    check('đối chứng — quản lý duyệt', duyet.status === 200 && duyet.data.daBaoCo === 1, duyet.data);
    check('cô lập: có dòng "đã được duyệt"', dongCua(ID.giaovien, 'ke-hoach-duyet').length === 1);

    const dx = await req('POST', `/api/kehoachbe/${keId}/de-xuat`, { cookie: C.giaovien, body: { chuongTrinh: 'chu-nhiem', lyDo: 'Bé cần ôn lại' } });
    check('đối chứng — cô gửi đề xuất sửa', dx.status === 201, dx.data);
    check('quản lý cơ sở 1: có dòng đề xuất', dongCua(ID.nv_qla, 'de-xuat').length === 1);
    check('quản lý cơ sở 2: không', dongCua(ID.nv_qlb, 'de-xuat').length === 0);
    const dxId = dx.data.deXuat.id;
    const q = await req('POST', `/api/kehoachbe/de-xuat/${dxId}/duyet`, { cookie: C.nv_qla, body: { quyetDinh: 'da-duyet' } });
    check('đối chứng — quản lý đồng ý đề xuất', q.status === 200, q.data);
    check('cô đề xuất: có dòng kết quả', dongCua(ID.giaovien, 'de-xuat-quyet').length === 1);
  }

  // =========================================================================
  console.log('\n[6] Báo cáo học tập: gửi, gửi lại, duyệt — đúng người nhận');
  {
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: C.nv_ht, body: {
      loai: 'hocky', ten: 'Báo cáo thử NV', tuThang: 0, denThang: 72,
      dong: [{ nhom: 'I', tieuDe: 'Ghi chú', kieu: 'chu' }] } });
    check('đối chứng — tạo mẫu', mau.status === 201 || mau.status === 200, mau.data);
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: C.giaovien, body: {
      studentId: 's1', mauId: mau.data.mau.id, tuNgay: `${THANG}-01`, denNgay: HOM } });
    check('đối chứng — cô mở bản', tao.status === 201, tao.data);
    const ban = tao.data.ban;
    await req('PUT', `/api/baocaohoctap/ban/${ban.id}`, { cookie: C.giaovien, body: { o: [{ dongId: ban.dong[0].dongId || ban.dong[0].id, chu: 'Con thích xếp khối' }] } });
    const gui = () => req('POST', `/api/baocaohoctap/ban/${ban.id}/gui`, { cookie: C.giaovien });
    const g = await gui();
    check('đối chứng — cô gửi duyệt báo cáo', g.status === 200 && g.data.choDuyet === true, g.data);
    check('quản lý cơ sở 1: có dòng báo cáo chờ duyệt', dongCua(ID.nv_qla, 'bao-cao-gui').length === 1);
    check('quản lý cơ sở 2: không', dongCua(ID.nv_qlb, 'bao-cao-gui').length === 0);
    const tra = await req('POST', `/api/baocaohoctap/ban/${ban.id}/duyet`, { cookie: C.nv_qla, body: { quyetDinh: 'tu-choi', yKien: 'Kể thêm một việc' } });
    check('đối chứng — quản lý gửi lại', tra.status === 200, tra.data);
    check('cô gửi: có dòng "được gửi lại"', dongCua(ID.giaovien, 'bao-cao-tra-lai').length === 1);
    await gui();
    const duyet = await req('POST', `/api/baocaohoctap/ban/${ban.id}/duyet`, { cookie: C.nv_qla, body: { ngayCongBo: HOM } });
    check('đối chứng — quản lý duyệt', duyet.status === 200, duyet.data);
    check('cô gửi: có dòng "đã được duyệt"', dongCua(ID.giaovien, 'bao-cao-duyet').length === 1);
    check('cô khác của nhóm không có dòng báo cáo', dongCua(ID['giaovien.nn'], 'bao-cao-duyet').length === 0
      && dongCua(ID['giaovien.nn'], 'bao-cao-tra-lai').length === 0);
  }

  // =========================================================================
  console.log('\n[7] Đếm và đọc: chuông, ô của từng màn, đọc một / đọc tất cả / mở màn');
  {
    const ds = await rieng(C.giaovien);
    const chua = ds.filter(x => !x.read).length;
    const truongChua = ((await req('GET', '/api/notifications', { cookie: C.giaovien })).data || []).filter(n => !n.read).length;
    const b = await badges(C.giaovien);
    check('chuông của cô = tin trường chưa đọc + dòng riêng chưa đọc', b.thongbao === truongChua + chua && chua > 0, { b: b.thongbao, truongChua, chua });
    check('ô Khảo sát của người tạo có số', b.khaosat >= 1, b);
    check('ô Xin phép có số', b.xinphep >= 1, b);

    const cuaNguoiKhac = dongCua(ID.nv_vpa, 'xin-nghi')[0];
    const lan = await req('POST', `/api/notifications/${cuaNguoiKhac.id}/read`, { cookie: C.giaovien });
    check('đọc dòng của NGƯỜI KHÁC → 404', lan.status === 404, lan.status);
    check('và dòng ấy vẫn chưa đọc', !dongCua(ID.nv_vpa, 'xin-nghi')[0].docLuc);

    const motDong = ds.find(x => x.loai === 'dan-thuoc');
    const r1 = await req('POST', `/api/notifications/${motDong.id}/read`, { cookie: C.giaovien });
    check('đọc một dòng của mình', r1.status === 200 && !!dongCua(ID.giaovien, 'dan-thuoc')[0].docLuc, r1.status);
    check('chuông giảm đúng 1', (await badges(C.giaovien)).thongbao === b.thongbao - 1);

    const x = await req('POST', '/api/notifications/rieng-nv/da-xem', { cookie: C.giaovien, body: { man: 'surveys' } });
    check('mở màn Khảo sát → dòng khảo sát đã đọc', x.status === 200 && !!dongCua(ID.giaovien, 'khao-sat')[0].docLuc, x);
    check('và ô Khảo sát hết số', !(await badges(C.giaovien)).khaosat);

    const all = await req('POST', '/api/notifications/read-all', { cookie: C.giaovien });
    check('đọc tất cả → không còn dòng riêng chưa đọc', all.status === 200 && (await rieng(C.giaovien)).every(n => n.read));

    // Cô bị gỡ khỏi nhóm: dòng cũ ẩn, không còn được đếm.
    const truocGo = (await rieng(C['giaovien.nn'])).filter(n => n.studentId === 's1');
    check('đối chứng — cô nước ngoài đang thấy dòng về s1', truocGo.length >= 2, truocGo.length);
    ghiCsdl("DELETE FROM class_teachers WHERE classId = 'c1' AND teacherId = 't5'");
    const sauGo = await rieng(C['giaovien.nn']);
    check('gỡ khỏi nhóm → dòng về bé của nhóm cũ ẩn', !sauGo.some(n => n.studentId === 's1'), sauGo);
    const bNn = await badges(C['giaovien.nn']);
    check('và chuông không đếm chúng', bNn.thongbao === ((await req('GET', '/api/notifications', { cookie: C['giaovien.nn'] })).data || []).filter(n => !n.read).length + sauGo.filter(n => !n.read).length, bNn);
    check('dữ liệu vẫn còn nguyên trong bảng (ẩn, không xoá)', dongCua(ID['giaovien.nn'], 'xin-nghi').length === 1);
  }

  // =========================================================================
  console.log('\n[8] Phía gia đình: văn phòng duyệt đơn, cô nhận thuốc');
  {
    const r = await req('POST', `/api/leave/${donId}/review`, { cookie: C.nv_vpa, body: {
      status: 'approved', hoanTienAn: 'co', soNgayHoan: 1, ghiChuHoan: 'GHICHU-NOI-BO', reviewNote: 'Chúc bé mau khoẻ' } });
    check('đối chứng — văn phòng duyệt đơn', r.status === 200, r.data);
    const tbb = (await req('GET', '/api/notifications/rieng-be', { cookie: C.phuhuynh })).data || [];
    const t = tbb.find(n => n.loai === 'xin-nghi');
    check('gia đình bé: có tin "đã duyệt đơn xin nghỉ"', t && /đã duyệt đơn xin nghỉ/.test(t.title) && t.hash === '#/leave', tbb.map(n => n.title));
    check('tin KHÔNG lộ ghi chú nội bộ về tiền ăn', !JSON.stringify(tbb).includes('GHICHU-NOI-BO'));
    const ph2 = (await req('GET', '/api/notifications/rieng-be', { cookie: C['ph.huong'] })).data || [];
    check('gia đình khác: không có', !ph2.some(n => n.loai === 'xin-nghi'));
    for (const u of ['giaovien', 'giaovien3']) {
      const d = dongCua(ID[u], 'xin-nghi-ket-qua');
      check(`${u}: có dòng báo kết quả duyệt`, d.length === 1 && /đã duyệt/.test(d[0].tieuDe) && !/GHICHU-NOI-BO|mau khoẻ/.test(d[0].noiDung), d);
    }
    check('văn phòng vừa duyệt không tự nhận dòng kết quả', dongCua(ID.nv_vpa, 'xin-nghi-ket-qua').length === 0);

    const thuoc = ((await req('GET', '/api/medicine', { cookie: C.giaovien })).data || []).find(m => m.studentId === 's1' && m.status === 'pending');
    const n = await req('POST', `/api/medicine/${thuoc.id}/confirm`, { cookie: C.giaovien });
    check('đối chứng — cô nhận thuốc', n.status === 200, n.status);
    const tbb2 = (await req('GET', '/api/notifications/rieng-be', { cookie: C.phuhuynh })).data || [];
    check('gia đình bé: có tin "cô đã nhận thuốc"', tbb2.some(x => x.loai === 'dan-thuoc' && /đã nhận thuốc/.test(x.title)), tbb2.map(x => x.title));
    check('tin không chép tên thuốc', !JSON.stringify(tbb2).includes('THUOC-BI-MAT'));
  }

  // =========================================================================
  console.log('\n[9] Phân hệ tắt thì không ghi; gọi vô nghĩa thì trả 0, không ném');
  {
    const tat = await req('PUT', '/api/admin/modules/kehoachbe', { cookie: C.nv_ht, body: { enabled: false } });
    check('đối chứng — tắt phân hệ Kế hoạch của bé', tat.status === 200, tat.status);
    const ra = execFileSync('node', ['-e', `
      const modules = require('./lib/modules');
      modules.napMoRong();
      const tbnv = require('./lib/thong-bao-nv');
      const doiChung = {
        coPhanHe: !!modules.timTheoKey('kehoachbe'), dangBat: modules.dangBat('kehoachbe'),
        loiLoi: tbnv.gui({ toi: { userIds: ['t1'] }, loai: 'xin-nghi', tieuDe: 'đối chứng', hash: '#/leave' }),
      };
      const kq = [doiChung,
        tbnv.gui({ toi: { userIds: ['t1'] }, loai: 'ke-hoach-duyet', tieuDe: 'thử', hash: '#/kehoachbe' }),
        tbnv.gui(),
        tbnv.gui({ toi: null, loai: 'xin-nghi', tieuDe: 'x' }),
        tbnv.gui({ toi: { coCuaBe: 'khong-co' }, loai: 'xin-nghi', tieuDe: 'x' }),
        tbnv.gui({ toi: { userIds: ['p1'] }, loai: 'xin-nghi', tieuDe: 'x', hash: '#/leave' }),
        tbnv.gui({ toi: { userIds: ['t1'] }, loai: 'khong-co-loai-nay', tieuDe: 'x' }),
      ];
      require('fs').writeSync(1, JSON.stringify(kq));
      process.exit(0);
    `], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
    const kq = JSON.parse(ra.trim().split('\n').pop());
    const [dc, ...con] = kq;
    check('đối chứng — phân hệ có trong sổ, đang tắt; loại lõi vẫn ghi được', dc.coPhanHe && dc.dangBat === false && dc.loiLoi === 1, dc);
    check('phân hệ tắt → gui trả 0', con[0] === 0, kq);
    check('tham số vô nghĩa → 0, không ném', con.slice(1).every(n => n === 0), kq);
    check('gửi thẳng cho phụ huynh bị lọc bỏ', docCsdl("SELECT COUNT(*) AS n FROM thongbao_nv WHERE userId = 'p1'")[0].n === 0);
  }
} catch (err) {
  check('bài chạy không lỗi', false, err.stack || err.message);
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
