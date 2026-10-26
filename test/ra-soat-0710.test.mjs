// Bài canh VÒNG RÀ ĐỐI KHÁNG ĐỢT Đ222–Đ231 (Đ232) — phần máy chủ.
//
// Chạy bằng:  npm run test:ra-soat-0710
//
// Đợt góp ý 06/10 (Đ222–Đ231) xanh đủ hai bộ kiểm thử, rồi một vòng rà đối
// kháng — bảy lăng kính tìm, hai người phản bác — bắt thêm 27 lỗi thật. Mỗi
// mục dưới đây dựng lại ĐÚNG cảnh của một lỗi rồi đòi kết quả đúng; phần chỉ
// trình duyệt thấy được nằm ở `ra-soat-0710-giao-dien`.
//
// Đáng nhớ: phần lớn các lỗi nằm ở chỗ màn hình gọi máy chủ KHÁC cách bài
// kiểm thử gọi — gửi mọi bài kể cả bài cô không chạm, không gửi khoá nào đó,
// màn mở từ sáng chưa làm mới. Nên các mục ở đây gọi API theo ĐÚNG hình dạng
// màn hình gửi, không theo hình dạng dễ viết nhất.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY, GOC, goCoNuocNgoaiMau,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const xlsx = require(path.join(GOC, 'lib', 'xlsx.js'));

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ra-soat-0710');
sinhDuLieu(DIR);
// Đ242F — F6b: dữ liệu mẫu nay có cô nước ngoài khai vai ở mọi nhóm. Bài này
// canh ca "trường CHƯA khai vai" (cô phụ trách soạn cả ba phần), nên gỡ đi.
goCoNuocNgoaiMau(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh', 'thuchup', 'nhatky', 'xinphep', 'nhansu', 'diemdanh']);
const mk = {
  qt: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  bv: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  bv2: taoQuanTri(DIR, 'Bảo vệ CS2', 'baove2'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
  ns2: taoQuanTri(DIR, 'Nhân sự CS2', 'nhansu2'),
};
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
khoaVaoCoSo(DIR, 'baove2', 'cs2'); datChucVu(DIR, 'baove2', 'baove');
datChucVu(DIR, 'nhansu1', 'nhansu');
khoaVaoCoSo(DIR, 'nhansu2', 'cs2'); datChucVu(DIR, 'nhansu2', 'nhansu');

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
// Nhật ký: một ngày KHÔNG có dòng mẫu nào (cùng cách bài nhat-ky-gui làm).
const NGAY_NK = new Date(Date.parse(`${HOM}T00:00:00Z`) - 20 * 86400000).toISOString().slice(0, 10);
const csdl = (fn) => { const c = new Database(path.join(DIR, 'school.db')); try { return fn(c); } finally { c.close(); } };
csdl(c => {
  // Điểm danh: bé s1 hôm nay chưa có dòng nào.
  c.prepare('DELETE FROM attendance WHERE date = ? AND studentId = ?').run(HOM, 's1');
  c.prepare('DELETE FROM attendance_photo WHERE date = ? AND studentId = ?').run(HOM, 's1');
  // Chuyển năm học: nhóm Lá 1 (c2, cơ sở 1) đã đóng; cô t2 năm nay ở Mầm 1 (c3, cơ sở 2).
  c.prepare('UPDATE classes SET active = 0 WHERE id = ?').run('c2');
  c.prepare("INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro, ganLuc) VALUES ('c3', 't2', 'chinh', ?)")
    .run(new Date().toISOString());
  // Nhật ký: bé s10 có đơn nghỉ đã duyệt đúng ngày ghi.
  c.prepare(`INSERT INTO leave_requests (id, studentId, parentId, fromDate, toDate, reason, status, createdAt, reviewedBy, reviewNote)
             VALUES ('lv_rs', 's10', 'p8', ?, ?, 'Sốt', 'approved', ?, 't4', '')`).run(NGAY_NK, NGAY_NK, new Date().toISOString());
});

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4879), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const conAnh = (f) => !!f && fs.existsSync(path.join(DIR, 'uploads', f));
const thangTruoc = (() => { const [y, m] = THANG.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();

try {
  const QL = await vao('hieutruong', mk.qt);
  const BV = await vao('baove1', mk.bv);
  const BV2 = await vao('baove2', mk.bv2);
  const NS = await vao('nhansu1', mk.ns);
  const NS2 = await vao('nhansu2', mk.ns2);
  const GV = (await login('giaovien', '123456')).cookie;     // t1, nhóm c1
  const GV_NT = (await login('giaovien4', '123456')).cookie; // t4, nhóm c4
  const PH_NT = (await login('ph.trang', '123456')).cookie;  // mẹ s9

  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
  const bai = (ten) => dm.find(b => b.ten === ten);
  const [thapHong, rotNuoc, colours, animals] = [bai('Tháp hồng'), bai('Rót nước'), bai('Colours'), bai('Animals')];
  const nhom = async (thang = THANG) => (await req('GET', `/api/kehoachbe?classId=c1&thang=${thang}`, { cookie: GV })).data || {};
  const cuaBe = async (id, thang = THANG) => ((await nhom(thang)).danhSach || []).find(x => x.studentId === id) || {};
  const luu = (ct, danhSach, thang = THANG, cookie = GV) =>
    req('PUT', '/api/kehoachbe', { cookie, body: { classId: 'c1', thang, chuongTrinh: ct, danhSach } });
  const guiDuyet = (id, ct) => req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: id, chuongTrinh: ct } });
  const duyet = (keId, ct, quyetDinh = 'da-duyet', yKienDuyet) =>
    req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh, yKienDuyet, phan: [{ keId, chuongTrinh: ct }] } });
  const dongBai = (ke, baiHocId) => (ke.baiHoc || []).find(b => b.baiHocId === baiHocId) || {};

  // =========================================================================
  console.log('\n[1] Kế hoạch: lưu nhìn lại theo dạng màn Hành trình KHÔNG xoá ghi chú, KHÔNG xoá kết luận đời cũ');
  {
    await luu('chu-nhiem', [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [
      { baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'on-tap' }] }]);
    let ke = (await cuaBe('s1')).ke;
    // Nhìn lại kiểu ĐỜI CŨ: kết luận hai mức + ghi chú, chưa có mức độ.
    const cu = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: [
      { id: dongBai(ke, thapHong.id).id, ketQua: 'da-thay', nhanXet: 'Xếp đúng 10 khối' },
      { id: dongBai(ke, rotNuoc.id).id, ketQua: 'tiep-tuc', nhanXet: 'Tự rót được nửa cốc' }] } });
    check('đối chứng — nhìn lại đời cũ lưu được', cu.status === 200, cu.data);
    // Đúng hình dạng tab Kế hoạch của Hành trình gửi: MỌI bài, không có nhanXet.
    ke = (await cuaBe('s1')).ke;
    const ht = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: [
      { id: dongBai(ke, thapHong.id).id, mucDo: 'vuot-troi', tiepTuc: '' },
      { id: dongBai(ke, rotNuoc.id).id, mucDo: '', tiepTuc: '' }] } });
    ke = (await cuaBe('s1')).ke;
    const th = dongBai(ke, thapHong.id);
    const rn = dongBai(ke, rotNuoc.id);
    check('lưu từ tab Hành trình: 200, mức độ mới được ghi', ht.status === 200 && th.mucDo === 'vuot-troi', { s: ht.status, th });
    check('ghi chú của CẢ HAI bài còn nguyên (màn không gửi ô ghi chú)',
      th.nhanXet === 'Xếp đúng 10 khối' && rn.nhanXet === 'Tự rót được nửa cốc', { th: th.nhanXet, rn: rn.nhanXet });
    check('bài cô KHÔNG chọn mức (ô trống) giữ kết luận đời cũ "tiếp tục cùng con" và việc tháng sau',
      rn.ketQua === 'tiep-tuc' && rn.tiepTucThangSau === true, rn);
    // Bài ĐÃ có mức độ mà cô xoá về trống thì vẫn xoá được như trước.
    const xoa = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: [
      { id: th.id, mucDo: '', tiepTuc: '' }] } });
    const th2 = dongBai((await cuaBe('s1')).ke, thapHong.id);
    check('bài đã có mức độ, cô xoá về trống → mức độ và kết luận suy ra đều trống', xoa.status === 200 && !th2.mucDo && !th2.ketQua, th2);
  }

  // =========================================================================
  console.log('\n[2] Kế hoạch: gợi ý tháng sau vẫn có cho phần CHƯA AI SOẠN dù phần khác đã lưu');
  {
    await luu('nuoc-ngoai', [{ studentId: 's5', capNhatLucGoc: null, baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }], thangTruoc);
    const keTruoc = (await cuaBe('s5', thangTruoc)).ke;
    if (keTruoc) {
      await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: keTruoc.id, baiHoc: [
        { id: dongBai(keTruoc, colours.id).id, mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' }] } });
    }
    await luu('chu-nhiem', [{ studentId: 's5', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    const x = await cuaBe('s5');
    check('đối chứng — bé đã có bản tháng này (phần Montessori), phần Cambridge còn trống',
      !!x.ke && x.ke.chuongTrinh['nuoc-ngoai'].coNoiDung === false, x.ke && x.ke.chuongTrinh);
    check('máy chủ VẪN gửi gợi ý từ tháng trước cho phần còn trống (khoá mới goiYPhanTrong)', !!x.goiYPhanTrong, x.goiYPhanTrong);
    check('khoá cũ goiY giữ nghĩa cũ: đã có bản thì null', x.goiY === null, x.goiY);
    if (keTruoc) {
      check('gợi ý mang "Colours" đúng nhãn ôn tập cô chọn',
        ((x.goiYPhanTrong && x.goiYPhanTrong.baiHoc) || []).some(b => b.baiHocId === colours.id && b.nhan === 'on-tap'), x.goiYPhanTrong);
    }
  }

  // =========================================================================
  console.log('\n[3] Kế hoạch: app đời cũ "Đặt cả nhóm" không chèn bài vào phần ĐÃ DUYỆT');
  {
    await luu('nuoc-ngoai', [{ studentId: 's3', capNhatLucGoc: null, baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    await guiDuyet('s3', 'nuoc-ngoai');
    let ke = (await cuaBe('s3')).ke;
    await duyet(ke.id, 'nuoc-ngoai');
    await luu('chu-nhiem', [{ studentId: 's3', baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    ke = (await cuaBe('s3')).ke;
    check('đối chứng — phần Cambridge đã duyệt, phần Montessori nháp, bản gộp "nháp"',
      ke.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet' && ke.trangThai === 'nhap', ke.chuongTrinh);
    const r = await req('POST', '/api/kehoachbe/dat-ca-nhom', { cookie: GV, body: {
      classId: 'c1', thang: THANG, baiHoc: [{ baiHocId: animals.id, nhan: 'hoc-moi' }] } });
    const sau = (await cuaBe('s3')).ke;
    const camb = (sau.baiHoc || []).filter(b => b.gocLinhVuc === 'cambridge').map(b => b.ten);
    check('đặt cả nhóm (app đời cũ) bỏ qua bé có phần đã duyệt', r.status === 200 && r.data.boQua >= 1, r.data);
    check('phần Cambridge đã duyệt của s3 KHÔNG có thêm "Animals"', camb.join(',') === 'Colours', camb);
  }

  // =========================================================================
  console.log('\n[4] Kế hoạch: phần bị gửi lại mà cô bỏ hết nội dung → về nháp, huy hiệu về 0');
  {
    await luu('chu-nhiem', [{ studentId: 's4', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    await guiDuyet('s4', 'chu-nhiem');
    const ke = (await cuaBe('s4')).ke;
    await duyet(ke.id, 'chu-nhiem', 'tra-lai', 'Tháng này bé không học phần này, cô bỏ đi nhé');
    const hh1 = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data || {};
    check('đối chứng — huy hiệu Kế hoạch của cô: có phần bị gửi lại', Number(hh1.kehoachbe) >= 1, hh1);
    const bo = await luu('chu-nhiem', [{ studentId: 's4', baiHoc: [], muc: [] }]);
    const sau = (await cuaBe('s4')).ke;
    check('cô bỏ hết nội dung phần ấy và lưu: 200', bo.status === 200, bo.data);
    check('phần ấy về "nháp", bản gộp không kẹt "gửi lại"',
      sau.chuongTrinh['chu-nhiem'].trangThai === 'nhap' && sau.trangThai !== 'tra-lai', { p: sau.chuongTrinh['chu-nhiem'], gop: sau.trangThai });
    const hh2 = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data || {};
    check('huy hiệu Kế hoạch của cô về 0', !Number(hh2.kehoachbe), hh2);
  }

  // =========================================================================
  console.log('\n[5] Kế hoạch: đề xuất sửa theo TỪNG chương trình');
  {
    await luu('chu-nhiem', [{ studentId: 's6', baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    await luu('nuoc-ngoai', [{ studentId: 's6', baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    await guiDuyet('s6', 'chu-nhiem');
    await guiDuyet('s6', 'nuoc-ngoai');
    const ke = (await cuaBe('s6')).ke;
    await duyet(ke.id, 'chu-nhiem');
    await duyet(ke.id, 'nuoc-ngoai');
    const a = await req('POST', `/api/kehoachbe/${ke.id}/de-xuat`, { cookie: GV, body: { lyDo: 'Đổi Tháp hồng sang Cầu thang nâu', chuongTrinh: 'chu-nhiem' } });
    const b = await req('POST', `/api/kehoachbe/${ke.id}/de-xuat`, { cookie: GV, body: { lyDo: 'Dời Colours sang tháng sau', chuongTrinh: 'nuoc-ngoai' } });
    const c = await req('POST', `/api/kehoachbe/${ke.id}/de-xuat`, { cookie: GV, body: { lyDo: 'Thêm một bài', chuongTrinh: 'chu-nhiem' } });
    const cu = await req('POST', `/api/kehoachbe/${ke.id}/de-xuat`, { cookie: GV, body: { lyDo: 'App đời cũ' } });
    check('đề xuất phần Montessori: 201', a.status === 201, a.data);
    check('đề xuất phần Cambridge KHÔNG bị đề xuất Montessori chặn: 201', b.status === 201, b.data);
    check('đề xuất thứ hai cho CÙNG phần vẫn bị chặn: 400', c.status === 400, c.status);
    check('app đời cũ (cả bản) vẫn bị chặn khi có đề xuất đang chờ: 400', cu.status === 400, cu.status);
    const k = (await cuaBe('s6')).ke;
    const dx = k.deXuatTheoCt || {};
    check('mỗi tab thấy đúng đề xuất của phần mình; phần không đề xuất thì không có gì',
      /Tháp hồng/.test(dx['chu-nhiem']?.lyDo || '') && /Colours/.test(dx['nuoc-ngoai']?.lyDo || '') && dx['the-chat'] === null, dx);
    check('khoá cũ `deXuat` vẫn còn cho app đời cũ', !!k.deXuat && k.deXuat.trangThai === 'cho-duyet', k.deXuat);
  }

  // =========================================================================
  console.log('\n[6] Hành trình: bỏ nháp chưa gắn bé là bỏ cả ẢNH; lời nhắc tính đúng 0h giờ Việt Nam');
  {
    const n = (await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: 'Chụp nhầm', anh: PNG } })).data?.nhap || {};
    const file = csdl(c => (c.prepare('SELECT anh FROM hanhtrinh_nhap WHERE id = ?').get(n.id) || {}).anh);
    check('đối chứng — nháp có ảnh, tệp nằm trên đĩa', conAnh(file), file);
    const bo = await req('DELETE', `/api/hanhtrinh/nhap/${n.id}`, { cookie: GV });
    check('bỏ nháp: 200 và tệp ảnh đã xoá khỏi đĩa', bo.status === 200 && !conAnh(file), { s: bo.status, con: conAnh(file) });

    const truoc = (await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: GV })).data || {};
    const be = (truoc.tuanNay || [])[0];
    check('đối chứng — có một bé trong danh sách "tuần này" của cô', !!be && /^\d{4}-\d{2}-\d{2}$/.test(truoc.tuTuan || ''), truoc);
    if (be) {
      // Ghi nhanh lúc 06:00 sáng thứ Hai giờ Việt Nam = 23:00 Chủ nhật giờ UTC.
      const luc = new Date(Date.parse(`${truoc.tuTuan}T06:00:00+07:00`)).toISOString();
      csdl(c => c.prepare(`INSERT INTO thuchup_ghinhanh (id, studentId, file, note, giay, ngoaiTuyen, choBaoLau, taoLuc, nhanLuc, byTeacherId)
                           VALUES ('gn_rs', ?, NULL, 'sáng sớm', 5, 0, 0, ?, ?, 't1')`).run(be.studentId, luc, luc));
      const sau = (await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: GV })).data || {};
      check('ảnh Ghi nhanh chụp 6 giờ sáng thứ Hai được tính cho tuần này', !(sau.tuanNay || []).some(x => x.studentId === be.studentId),
        { luc, con: (sau.tuanNay || []).map(x => x.studentId) });
    }
  }

  // =========================================================================
  console.log('\n[7] Nhật ký: phần đã gửi mà cô bỏ hết → gửi lần nữa là GỠ bản gia đình đang đọc');
  {
    const nhomNK = async () => (await req('GET', `/api/nhatky?classId=c4&ngay=${NGAY_NK}`, { cookie: GV_NT })).data || {};
    const guiCua = async (id, ph) => (((await nhomNK()).danhSach || []).find(b => b.studentId === id)?.gui || {})[ph] || {};
    const meDoc = async () => ((await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY_NK}&den=${NGAY_NK}`, { cookie: PH_NT })).data || {}).ngayCo || [];
    await req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: NGAY_NK, truong: ['nguTuLuc', 'nguDenLuc'],
      danhSach: [{ studentId: 's9', nguTuLuc: '11:30', nguDenLuc: '14:00' }] } });
    await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY_NK, phan: 'ngu', studentIds: ['s9'] } });
    check('đối chứng — gia đình đọc được giấc trưa đã gửi', (await meDoc()).some(n => n.nguTuLuc === '11:30'));
    await req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: NGAY_NK, truong: ['nguTuLuc', 'nguDenLuc'],
      danhSach: [{ studentId: 's9', nguTuLuc: '', nguDenLuc: '' }] } });
    const g = await guiCua('s9', 'ngu');
    check('màn của cô biết gia đình còn đọc bản cũ (canGo, chờ gửi)', g.canGo === true && g.chuaGui === true, g);
    const r = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY_NK, phan: 'ngu', studentIds: ['s9'] } });
    check('gửi lần nữa: bé nằm trong danh sách đã gỡ, không nằm trong "chưa ghi"',
      r.status === 200 && (r.data.daGo || []).some(x => x.studentId === 's9') && !(r.data.chuaGhi || []).some(x => x.studentId === 's9'), r.data);
    check('gia đình KHÔNG còn đọc giấc trưa ghi nhầm', !(await meDoc()).some(n => n.nguTuLuc === '11:30'), await meDoc());
    const g2 = await guiCua('s9', 'ngu');
    check('gỡ xong thì hết "chờ gửi"', !g2.canGo && !g2.chuaGui, g2);
  }

  // =========================================================================
  console.log('\n[8] Nhật ký: ghi giờ vệ sinh cho bé có đơn nghỉ hôm ấy thì NÓI RA');
  {
    const r = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY_NK, studentIds: ['s9', 's10'], luc: '10:00', loai: 'di-ve-sinh' } });
    check('ghi được cho cả hai bé', r.status === 200 && r.data.daGhi === 2, r.data);
    check('máy chủ nhắc đúng bé s10 đang có đơn nghỉ', (r.data.nhacNghi || []).map(x => x.studentId).join(',') === 's10' && /đơn nghỉ/.test(r.data.nhacNghiChu || ''), r.data);
  }

  // =========================================================================
  console.log('\n[9] Điểm danh: chụp "lần 1" trên màn đã cũ KHÔNG âm thầm thay ảnh tới lớp');
  {
    const a = await req('POST', '/api/attendance/anh', { cookie: GV, body: { studentId: 's1', date: HOM, anh: PNG, yDinh: 'toi-lop' } });
    check('lần chụp đầu (có ý định "tới lớp"): 201', a.status === 201, a.data);
    const b = await req('POST', '/api/attendance/anh', { cookie: GV, body: { studentId: 's1', date: HOM, anh: PNG, yDinh: 'toi-lop' } });
    check('bé đã có ảnh tới lớp mà màn vẫn gửi ý định "tới lớp": 409, nói rõ', b.status === 409 && b.data.daCoAnhToiLop === true && /đã có ảnh tới lớp/.test(b.data.error || ''), b);
    const f = csdl(c => (c.prepare('SELECT file FROM attendance_photo WHERE studentId = ? AND date = ?').get('s1', HOM) || {}).file);
    check('ảnh sáng còn nguyên trong sổ và trên đĩa', f === a.data.file && conAnh(f), { f, a: a.data.file });
    const c = await req('POST', '/api/attendance/anh', { cookie: GV, body: { studentId: 's1', date: HOM, anh: PNG } });
    check('không gửi ý định (app đời cũ, chụp lại) thì như cũ: 201 và thay ảnh', c.status === 201 && c.data.file !== a.data.file, c.status);
  }

  // =========================================================================
  console.log('\n[10] Chấm công cô: gỡ lần chụp nhầm gỡ cả bản đã chép sang Nhân sự; nhóm đã đóng; cơ sở của cổng');
  {
    const ccNs = (u) => csdl(c => c.prepare('SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?').get(u, HOM));
    await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
    check('đối chứng — chụp ở cổng tạo dòng công bên Nhân sự', !!ccNs('t1') && ccNs('t1').ghiChu === 'Chụp ảnh ở cổng', ccNs('t1'));
    const go = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't1' } });
    check('gỡ lần chụp nhầm: dòng công bên Nhân sự cũng không còn', go.status === 200 && !ccNs('t1'), ccNs('t1'));
    await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
    await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
    const go2 = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't1' } });
    const sau = ccNs('t1') || {};
    check('gỡ giờ RA nhầm: bên Nhân sự mất giờ ra, giữ giờ vào', go2.data?.daGo === 'ra' && sau.gioRa === '' && !!sau.gioVao, sau);

    const ds = async (cookie) => ((await req('GET', '/api/attendance/nhan-vien', { cookie })).data?.danhSach || []).map(x => x.userId);
    check('cô đã chuyển sang cơ sở 2 KHÔNG còn ở cổng cơ sở 1 (nhóm cũ đã đóng)', !(await ds(BV)).includes('t2'), await ds(BV));
    check('và có mặt ở cổng cơ sở 2', (await ds(BV2)).includes('t2'), await ds(BV2));
    await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV2, body: { userId: 't2', anh: PNG } });
    const cs = csdl(c => (c.prepare('SELECT campusId FROM staff_checkin WHERE userId = ? AND ngay = ?').get('t2', HOM) || {}).campusId);
    check('ảnh công ghi CƠ SỞ CỦA CỔNG đã chụp (cơ sở 2)', cs === 'cs2', cs);
  }

  // =========================================================================
  console.log('\n[11] Nhân sự: ảnh chấm công mở được từ màn — đúng người, đúng cơ sở');
  {
    const ngayCua = (d, u) => (((d.danhSach || []).find(x => x.userId === u) || {}).ngay || []).find(n => n.ngay === HOM) || {};
    const ns = (await req('GET', `/api/nhansu/cham-cong?thang=${THANG}`, { cookie: NS })).data || {};
    const t1 = ngayCua(ns, 't1');
    check('Nhân sự cả trường: ngày hôm nay của cô t1 có tên ảnh vào', !!t1.anhVao, t1);
    const mo = await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/${encodeURIComponent(t1.anhVao || 'x')}`, { headers: { Cookie: NS } });
    check('và mở được ảnh ấy', mo.status === 200, mo.status);
    const ns2 = (await req('GET', `/api/nhansu/cham-cong?thang=${THANG}`, { cookie: NS2 })).data || {};
    check('Nhân sự khoá cơ sở 2 KHÔNG nhận tên ảnh chụp ở cơ sở 1', !ngayCua(ns2, 't1').anhVao, ngayCua(ns2, 't1'));
    check('nhưng nhận ảnh của cổng cơ sở 2', !!ngayCua(ns2, 't2').anhVao, ngayCua(ns2, 't2'));
    const toi = (await req('GET', `/api/nhansu/cham-cong/toi?thang=${THANG}`, { cookie: GV })).data || {};
    const homNay = ((toi.cuaToi || {}).ngay || []).find(n => n.ngay === HOM) || {};
    const moToi = await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/${encodeURIComponent(homNay.anhVao || 'x')}/toi`, { headers: { Cookie: GV } });
    check('chính cô thấy và mở được ảnh của mình', !!homNay.anhVao && moToi.status === 200, { homNay, s: moToi.status });
    const csv = await fetch(`${sv.BASE}/api/nhansu/cham-cong.csv?thang=${THANG}`, { headers: { Cookie: NS } });
    check('tệp CSV xuất cho kế toán KHÔNG mang tên tệp ảnh', !/\.(png|jpe?g|webp)/i.test(await csv.text()));
  }

  // =========================================================================
  console.log('\n[12] Thực đơn Excel: nạp lại tệp mẫu không xoá bữa tệp không chứa được; cột trùng có lời nhắc');
  {
    const [y, m] = HOM.split('-').map(Number);
    const tg = new Date(Date.UTC(y, m - 1 + 3, 1));
    const thangTD = tg.toISOString().slice(0, 7);
    const ngayHoc = [];
    for (let d = 1; ngayHoc.length < 2; d++) {
      const t = new Date(Date.UTC(tg.getUTCFullYear(), tg.getUTCMonth(), d));
      if (t.getUTCDay() !== 0 && t.getUTCDay() !== 6) ngayHoc.push(t.toISOString().slice(0, 10));
    }
    const [A, B] = ngayHoc;
    const bua = (lunch) => [
      { type: 'breakfast', label: 'Bữa sáng', time: '07:30', items: ['Cháo thịt'] },
      { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: lunch },
      { type: 'milk', label: 'Sữa Vinamilk', time: '15:30', items: ['Sữa Vinamilk'] },
      { type: 'milk', label: 'Sữa chua', time: '15:45', items: ['Sữa chua Ba Vì'] },
      { type: 'other', label: 'Tráng miệng', time: '12:00', items: ['Dưa hấu'] },
    ];
    const dat = await req('PUT', '/api/menu/tuan', { cookie: QL, body: { ngay: [{ date: A, meals: bua(['Cơm', 'Cá kho']) }, { date: B, meals: bua(['Cơm', 'Cá kho']) }] } });
    check('đối chứng — hai ngày có năm bữa, gồm "Tráng miệng" và hai bữa sữa', dat.status === 200, dat.data);
    const tai = await fetch(`${sv.BASE}/api/menu/mau-excel?thang=${thangTD}`, { headers: { Cookie: QL } });
    const hang = xlsx.doc(Buffer.from(await tai.arrayBuffer()))[0].hang;
    const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
    const iB = hang.findIndex(h => h && h[0] === ddmm(B));
    const iLunch = hang[0].indexOf('Bữa trưa');
    hang[iB][iLunch] = 'Cơm\nGà rim';
    const tep = (h) => `data:application/octet-stream;base64,${xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: h }]).toString('base64')}`;
    const xem = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: tep(hang) } });
    const nA = (xem.data.ngay || []).find(n => n.date === A) || {};
    const nB = (xem.data.ngay || []).find(n => n.date === B) || {};
    check('xem trước: ngày không sửa được đánh dấu "không đổi"', nA.khongDoi === true, nA);
    check('xem trước: ngày có sửa nói rõ giữ nguyên "Sữa chua" và "Tráng miệng"',
      nB.khongDoi === false && (nB.giuBua || []).includes('Sữa chua') && (nB.giuBua || []).includes('Tráng miệng'), nB);
    const luu2 = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: tep(hang), luu: true } });
    const mealsCua = (d) => csdl(c => JSON.parse((c.prepare('SELECT meals FROM menus WHERE date = ?').get(d) || {}).meals || '[]'));
    const mA = mealsCua(A); const mB = mealsCua(B);
    check('lưu: 200, ghi đúng MỘT ngày, một ngày không đổi', luu2.status === 200 && luu2.data.daGhi === 1 && luu2.data.khongDoi === 1, luu2.data);
    check('ngày không sửa còn đủ năm bữa', mA.length === 5 && mA.some(x => x.label === 'Tráng miệng') && mA.some(x => x.label === 'Sữa chua'), mA.map(x => x.label));
    check('ngày có sửa: bữa trưa mới, "Tráng miệng" và "Sữa chua" còn nguyên',
      (mB.find(x => x.type === 'lunch') || {}).items?.join(',') === 'Cơm,Gà rim'
      && mB.some(x => x.label === 'Tráng miệng' && x.items[0] === 'Dưa hấu') && mB.some(x => x.label === 'Sữa chua'), mB);

    const them = hang.map((h, i) => (i === 0 ? [...h, 'Sữa chua'] : (h ? [...h] : h)));
    const xem2 = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: tep(them) } });
    check('cột thêm vào trùng loại bữa ("Sữa chua" cạnh "Sữa Vinamilk") có lời nhắc, không bị bỏ im lặng',
      (xem2.data.canhBao || []).some(c => /Sữa chua/.test(c) && /trùng bữa/.test(c)), xem2.data.canhBao);
  }

  // =========================================================================
  console.log('\n[13] Đọc Excel: ô gộp DỌC chép giá trị xuống mọi ngày của vùng gộp');
  {
    const zip = (tep) => {
      const dau = []; const muc = []; let viTri = 0;
      for (const [ten, noiDung] of tep) {
        const tenB = Buffer.from(ten); const b = Buffer.from(noiDung); const crc = zlib.crc32(b) >>> 0;
        const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14);
        h.writeUInt32LE(b.length, 18); h.writeUInt32LE(b.length, 22); h.writeUInt16LE(tenB.length, 26);
        dau.push(h, tenB, b);
        const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6);
        c.writeUInt32LE(crc, 16); c.writeUInt32LE(b.length, 20); c.writeUInt32LE(b.length, 24); c.writeUInt16LE(tenB.length, 28);
        c.writeUInt32LE(viTri, 42);
        muc.push(c, tenB);
        viTri += 30 + tenB.length + b.length;
      }
      const cd = Buffer.concat(muc);
      const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(tep.length, 8); e.writeUInt16LE(tep.length, 10);
      e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(viTri, 16);
      return Buffer.concat([...dau, cd, e]);
    };
    const o = (r, v) => `<c r="${r}" t="inlineStr"><is><t>${v}</t></is></c>`;
    const sheet = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
      + `<row r="1">${o('A1', 'Ngày')}${o('B1', 'Sữa')}${o('C1', 'Trưa')}</row>`
      + `<row r="2">${o('A2', '01/06')}${o('B2', 'Sữa 180ml')}${o('C2', 'Cơm')}</row>`
      + `<row r="3">${o('A3', '02/06')}${o('C3', 'Phở')}</row>`
      + `<row r="4">${o('A4', '03/06')}${o('C4', 'Bún')}</row>`
      + '</sheetData><mergeCells count="2"><mergeCell ref="B2:B4"/><mergeCell ref="A1:A1"/></mergeCells></worksheet>';
    const buf = zip([
      ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'],
      ['xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns:r="r"><sheets><sheet name="T" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', sheet],
    ]);
    const h = xlsx.doc(buf)[0].hang;
    check('ba ngày đều có "Sữa 180ml" từ một ô gộp B2:B4', [1, 2, 3].every(r => h[r][1] === 'Sữa 180ml'), h);
    check('ô không gộp giữ nguyên giá trị của mình', h[2][2] === 'Phở' && h[3][2] === 'Bún', h);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
