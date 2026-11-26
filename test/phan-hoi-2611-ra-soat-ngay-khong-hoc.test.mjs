// Bài canh máy chủ: bảng rà soát điểm danh không liệt kê bé "chưa điểm danh"
// vào ngày không học (Đ261i, rủi ro (c) trong báo cáo Đ261d).
//
// Chạy bằng:  node test/phan-hoi-2611-ra-soat-ngay-khong-hoc.test.mjs
//
// Văn phòng mở màn Điểm danh vào thứ Bảy, Chủ nhật thì từng thấy "Cần gọi xác
// nhận: N bé", vì máy chủ chỉ bỏ ngày trường nghỉ, không bỏ cuối tuần. Cả app
// coi thứ Hai – thứ Sáu là ngày học (đơn xin nghỉ, lịch nghỉ, màn của cô).
// Ngày thường đã qua thì GIỮ NGUYÊN: văn phòng xem lại vẫn thấy danh sách.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('2611-ra-soat-ngay-khong-hoc');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const HOM = HOM_NAY();
const ngayCach = (n) => new Date(Date.parse(`${HOM}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const thuCua = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
function ngayTruoc(thu, tu = 7) {
  for (let n = tu; ; n++) if (thuCua(ngayCach(-n)) === thu) return ngayCach(-n);
}
const THU_BAY = ngayTruoc(6);
const CHU_NHAT = ngayTruoc(0);
const THU_HAI = ngayTruoc(1);       // ngày thường đã qua — đối chứng
const THU_BA_NGHI = ngayTruoc(2);   // ngày thường đã qua, trường nghỉ

{
  const c = new Database(path.join(DIR, 'school.db'));
  const xoa = c.prepare('DELETE FROM attendance WHERE date = ?');
  for (const d of [THU_BAY, CHU_NHAT, THU_HAI, THU_BA_NGHI]) xoa.run(d);
  c.prepare(`INSERT INTO lich_nghi_truong (id, ten, tuNgay, denNgay, loai, campusId, hoanTienAn, ghiChu, taoLuc)
             VALUES ('lnt_rs', 'Nghỉ thử', ?, ?, 'khac', '', 'co', '', ?)`)
    .run(THU_BA_NGHI, THU_BA_NGHI, new Date().toISOString());
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7410), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d = await login('hieutruong', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('hieutruong', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;
  const raSoat = async (cookie, ngay) => (await req('GET', `/api/attendance/ra-soat?date=${ngay}`, { cookie })).data || {};

  console.log(`\n[1] Đối chứng — thứ Hai đã qua (${THU_HAI}), không ai chấm`);
  const thuHai = await raSoat(QT, THU_HAI);
  check('văn phòng vẫn thấy danh sách cần gọi (hành vi cũ giữ nguyên)',
    thuHai.quaGio === true && thuHai.danhSach.length > 0 && thuHai.soCanRaSoat === thuHai.danhSach.length, thuHai);
  check('và máy chủ nói đó là ngày học', thuHai.ngayKhongHoc === null, thuHai.ngayKhongHoc);

  for (const [ten, ngay] of [['thứ Bảy', THU_BAY], ['Chủ nhật', CHU_NHAT]]) {
    console.log(`\n[2] ${ten} đã qua (${ngay}), không ai chấm`);
    const r = await raSoat(QT, ngay);
    check(`${ten}: danh sách cần gọi rỗng, số cần rà soát là 0`,
      Array.isArray(r.danhSach) && r.danhSach.length === 0 && r.soCanRaSoat === 0, r);
    check(`${ten}: máy chủ nói rõ đó là ngày không học`, r.ngayKhongHoc === 'cuoi-tuan', r.ngayKhongHoc);
    const co = await raSoat(GV, ngay);
    check(`${ten}: cô cũng nhận danh sách rỗng`, co.danhSach.length === 0 && co.soCanRaSoat === 0, co);
  }

  console.log(`\n[3] Ngày trường nghỉ (${THU_BA_NGHI})`);
  const nghi = await raSoat(QT, THU_BA_NGHI);
  check('danh sách cần gọi rỗng, bé được đếm vào "nghỉ theo lịch của trường"',
    nghi.danhSach.length === 0 && nghi.soCanRaSoat === 0 && nghi.soTruongNghi > 0, nghi);
  check('máy chủ nói đó là ngày trường nghỉ', nghi.ngayKhongHoc === 'truong-nghi', nghi.ngayKhongHoc);
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
