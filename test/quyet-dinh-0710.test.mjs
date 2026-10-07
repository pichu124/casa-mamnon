// Bài canh BỐN QUYẾT ĐỊNH CỦA CHỦ DỰ ÁN NGÀY 07/10 (Đ231).
//
// Chạy bằng:  npm run test:quyet-dinh-0710
//
// Sau góp ý 06/10 còn bốn việc chờ chủ dự án chốt. Chốt ngày 07/10:
//
//   1. ẢNH CHẤM CÔNG của cô và nhân viên giữ 90 ngày; GIỜ VÀO / RA giữ mãi.
//   2. NHÁP CHƯA GẮN BÉ (có thể kèm ảnh) quá 30 ngày thì tự bỏ.
//   3. Ô "Dán bảng từ Excel" ở Thực đơn bỏ — dùng tải tệp thôi. Phần đó có
//      bài riêng (`thuc-don-tep`, `bien-soan-giao-dien`, `phan-hoi-0709`).
//   4. Chữ quy ước M/S/W/N/NA dùng cả trong BÁO CÁO THÁNG gửi gia đình.
//
// Hai việc dọn đầu tiên XÓA ẢNH THẬT, nên bài này đo kỹ cái gì KHÔNG được
// mất: giờ vào/ra, ảnh còn trong hạn, ảnh mà một quan sát của bé đang dùng,
// và nháp của phân hệ đang TẮT (Nguyên tắc số 1: tắt là ngưng dùng, không
// phải xóa dữ liệu). Việc dọn chạy theo giờ hẹn — lượt đầu ngay lúc máy chủ
// khởi động — nên bài kiểm thử khởi động lại máy chủ để gọi nó.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, tatPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('quyet-dinh-0710');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu', 'diemdanh', 'hanhtrinh', 'kehoachbe', 'baocaohoctap']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkBv = taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1');
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4875), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const csdl = (fn) => {
  const c = new Database(path.join(DIR, 'school.db'));
  try { return fn(c); } finally { c.close(); }
};
const conAnh = (file) => !!file && fs.existsSync(path.join(DIR, 'uploads', file));
const ngayTruoc = (n) => new Date(Date.parse(`${HOM_NAY()}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const lucTruoc = (n) => new Date(Date.now() - n * 86400000).toISOString();

try {
  const QT = await vao('hieutruong', mkQt);
  const BV = await vao('baove1', mkBv);
  const GV = (await login('giaovien', '123456')).cookie;    // t1, nhóm c1
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2

  // =========================================================================
  console.log('\n[1] Ảnh chấm công: quá 90 ngày thì bỏ ảnh, GIỜ VÀO / RA giữ mãi');
  {
    // Chấm vào + ra cho hai cô hôm nay, rồi lùi ngày của hai bản ghi.
    for (const u of ['t1', 't2']) {
      await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: u, anh: PNG } });
      await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: u, anh: PNG } });
    }
    const truoc = csdl(c => c.prepare("SELECT * FROM staff_checkin WHERE userId IN ('t1', 't2') ORDER BY userId").all());
    check('đối chứng — hai cô đều có ảnh vào và ra, file nằm trên đĩa',
      truoc.length === 2 && truoc.every(r => conAnh(r.anhVao) && conAnh(r.anhRa) && r.gioVao && r.gioRa), truoc);
    csdl(c => {
      c.prepare("UPDATE staff_checkin SET ngay = ? WHERE userId = 't1'").run(ngayTruoc(91));
      c.prepare("UPDATE staff_checkin SET ngay = ? WHERE userId = 't2'").run(ngayTruoc(89));
    });
    await sv.khoiDongLai();
    const sau = csdl(c => c.prepare("SELECT * FROM staff_checkin WHERE userId IN ('t1', 't2') ORDER BY userId").all());
    const [t1, t2] = sau;
    const cu = truoc[0];
    check('bản ghi 91 ngày trước: ảnh vào và ra đã bỏ', t1.anhVao === '' && t1.anhRa === '', t1);
    check('… và FILE ẢNH cũng đã xóa khỏi đĩa', !conAnh(cu.anhVao) && !conAnh(cu.anhRa));
    check('… nhưng GIỜ VÀO / GIỜ RA giữ nguyên', t1.gioVao === cu.gioVao && t1.gioRa === cu.gioRa, { t1, cu });
    check('bản ghi 89 ngày trước còn đủ ảnh — chưa tới hạn', conAnh(t2.anhVao) && conAnh(t2.anhRa) && t2.anhVao === truoc[1].anhVao, t2);
    const ds = await req('GET', `/api/attendance/nhan-vien?ngay=${ngayTruoc(91)}`, { cookie: BV });
    check('danh sách chấm công vẫn mở được sau khi dọn', ds.status === 200, ds.status);
    const mo = await req('GET', `/api/nhansu/anh-cham-cong/${encodeURIComponent(cu.anhVao)}`, { cookie: QT });
    check('đường mở ảnh của Nhân sự trả "không có" cho ảnh đã bỏ, không sập', [404, 410].includes(mo.status), mo.status);
  }

  // =========================================================================
  console.log('\n[2] Nháp chưa gắn bé: quá 30 ngày thì tự bỏ, kể cả ảnh');
  {
    const tao = async (cookie, body) => (await req('POST', '/api/hanhtrinh/nhap', { cookie, body })).data?.nhap || {};
    const A = await tao(GV, { moTa: 'Nháp cũ có ảnh', anh: PNG });
    const B = await tao(GV, { moTa: 'Nháp cũ không ảnh' });
    const C = await tao(GV, { moTa: 'Nháp mới có ảnh', anh: PNG });
    const D = await tao(GV2, { moTa: 'Nháp 29 ngày của cô khác', anh: PNG });
    // Một nháp được GẮN BÉ: ảnh của nó thành ảnh của một quan sát. Dựng thêm
    // một dòng nháp cũ trỏ cùng tấm ảnh — dọn nháp không được kéo theo ảnh
    // mà hồ sơ của bé đang dùng.
    const E = await tao(GV, { moTa: 'Nháp đem gắn bé', anh: PNG });
    const gan = await req('POST', `/api/hanhtrinh/nhap/${E.id}/gan`, { cookie: GV, body: { studentId: 's1' } });
    check('đối chứng — gắn bé được một nháp có ảnh', gan.status === 200 || gan.status === 201, gan.data);
    const dong = csdl(c => c.prepare('SELECT id, anh FROM hanhtrinh_nhap').all());
    const anhCua = (id) => (dong.find(r => r.id === id) || {}).anh || '';
    const anhQS = csdl(c => (c.prepare("SELECT anh FROM hanhtrinh_quansat WHERE moTa LIKE '%Nháp đem gắn bé%'").get() || {}).anh || '');
    check('đối chứng — bốn nháp còn đó, ảnh nằm trên đĩa, quan sát mang ảnh của nháp đã gắn',
      dong.length === 4 && conAnh(anhCua(A.id)) && conAnh(anhCua(C.id)) && conAnh(anhCua(D.id)) && conAnh(anhQS), { dong, anhQS });
    csdl(c => {
      const lui = c.prepare('UPDATE hanhtrinh_nhap SET taoLuc = ? WHERE id = ?');
      lui.run(lucTruoc(31), A.id);
      lui.run(lucTruoc(40), B.id);
      lui.run(lucTruoc(29), D.id);
      c.prepare('INSERT INTO hanhtrinh_nhap (id, coGhi, moTa, anh, nhom, taoLuc) VALUES (?, ?, ?, ?, ?, ?)')
        .run('htn-thu-chung-anh', 't1', 'Nháp cũ trỏ ảnh của quan sát', anhQS, '', lucTruoc(60));
    });
    const anhA = anhCua(A.id);

    // Phân hệ Hành trình đang TẮT: việc dọn không chạm vào gì.
    tatPhanHe(DIR, ['hanhtrinh']);
    await sv.khoiDongLai();
    const khiTat = csdl(c => c.prepare('SELECT id FROM hanhtrinh_nhap').all().map(r => r.id));
    check('phân hệ đang TẮT: không nháp nào bị bỏ, ảnh còn nguyên',
      khiTat.length === 5 && khiTat.includes(A.id) && khiTat.includes(B.id) && conAnh(anhA), khiTat);
    const dangNhap = await login('giaovien', '123456');
    check('… và app vẫn đăng nhập được', !!dangNhap.cookie);

    batPhanHe(DIR, ['hanhtrinh']);
    await sv.khoiDongLai();
    const con = csdl(c => c.prepare('SELECT id FROM hanhtrinh_nhap').all().map(r => r.id));
    check('nháp 31 ngày có ảnh: đã bỏ, file ảnh cũng xóa', !con.includes(A.id) && !conAnh(anhA), con);
    check('nháp 40 ngày không ảnh: đã bỏ', !con.includes(B.id), con);
    check('nháp mới và nháp 29 ngày (của cô khác) còn nguyên, ảnh còn trên đĩa',
      con.includes(C.id) && con.includes(D.id) && conAnh(anhCua(C.id)) && conAnh(anhCua(D.id)), con);
    check('dòng nháp cũ trỏ ảnh của quan sát: dòng bỏ, nhưng ẢNH CỦA QUAN SÁT VẪN CÒN',
      !con.includes('htn-thu-chung-anh') && conAnh(anhQS));
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data || {};
    check('quan sát đã gắn bé vẫn đọc được, vẫn mang ảnh',
      (ht.quanSat || []).some(q => /Nháp đem gắn bé/.test(q.moTa || '') && q.anh === anhQS), (ht.quanSat || []).length);
    const ds = (await req('GET', '/api/hanhtrinh/nhap', { cookie: GV })).data || {};
    const danhSach = ds.nhap || ds.danhSach || ds;
    check('danh sách nháp của cô còn đúng nháp mới', Array.isArray(danhSach)
      && danhSach.length === 1 && danhSach[0].id === C.id, ds);
  }

  // =========================================================================
  console.log('\n[3] Báo cáo tháng điền sẵn: mang chữ quy ước M/S/W/N/NA kèm một dòng chú giải');
  {
    const THANG = HOM_NAY().slice(0, 7);
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
    const bai = (ten) => dm.find(b => b.ten === ten);
    const [thapHong, cauThang, rotNuoc] = [bai('Tháp hồng'), bai('Cầu thang nâu'), bai('Rót nước')];
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{
      studentId: 's1',
      baiHoc: [
        { baiHocId: thapHong.id, nhan: 'hoc-moi' },
        { baiHocId: cauThang.id, nhan: 'hoc-moi' },
        { baiHocId: rotNuoc.id, nhan: 'on-tap' },
      ] }] } });
    const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === 's1').ke;
    const dong = (id) => ke.baiHoc.find(b => b.baiHocId === id).id;
    const nl = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: [
      { id: dong(thapHong.id), mucDo: 'da-vung', tiepTuc: '' },
      { id: dong(cauThang.id), mucDo: 'chua-quan-sat-thay', tiepTuc: '' },
      { id: dong(rotNuoc.id), mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' },
    ] } });
    check('đối chứng — cô nhìn lại ba bài bằng chữ quy ước', nl.status === 200, nl.data);

    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'thang', ten: 'Báo cáo tháng (thử chữ)', tuThang: 0, denThang: 72,
      dong: [
        { nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' },
        { nhom: 'II. NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'chu', gocLinhVuc: 'thuc-hanh-cuoc-song' },
      ] } });
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: mau.data.mau.id, tuNgay: `${THANG}-01`, denNgay: HOM_NAY() } });
    check('cô mở được bản báo cáo tháng', tao.status === 201 && tao.data.ban, tao.data);
    const o = (goc) => ((tao.data.ban || {}).dong || []).find(d => d.gocLinhVuc === goc)?.chu || '';
    const gq = o('giac-quan');
    const th = o('thuc-hanh-cuoc-song');
    check('mỗi bài mang chữ của mình ngay ở dòng "Bài học tháng này"',
      /Tháp hồng \(học mới · S\)/.test(gq) && /Cầu thang nâu \(học mới · N\)/.test(gq), gq);
    check('bài mức N (chưa quan sát thấy) KHÔNG bị xếp vào "Đã thấy" hay "Tiếp tục"',
      !/(Đã thấy con làm được|Tiếp tục cùng con):[^\n]*Cầu thang nâu/.test(gq), gq);
    check('ô Giác quan có MỘT dòng chú giải đúng các chữ đã dùng, xếp từ cao xuống',
      (gq.match(/Chữ quy ước:/g) || []).length === 1 && /Chữ quy ước: S = đã vững, N = chưa quan sát thấy\./.test(gq), gq);
    check('bài "tiếp tục" nói rõ tháng sau làm gì', /Tiếp tục cùng con: Rót nước \(tháng sau ôn tập\)/.test(th)
      && /Rót nước \(ôn tập · W\)/.test(th) && /Chữ quy ước: W = đang hình thành\./.test(th), th);
    check('không phần trăm, không điểm số (QUY TẮC 4)', !/%|điểm/i.test(gq + th));
    check('chú giải không gọi "N" là thất bại (QUY TẮC 2)', !/chưa đạt|không làm được|yếu|kém/i.test(gq + th));
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
