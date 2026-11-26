// Bài canh NHẬP DANH SÁCH CHO TRƯỜNG THẬT (Đ261a — báo cáo kiểm thử 26/11: O1,
// O2, O6, O7, B2, B3, B9).
//
// Chạy bằng:  node test/nhap-danh-sach-that.test.mjs
//
//   [1] O1/L4 — ngày sinh: Excel vùng Việt Nam lưu `24/09/2023`; số kiểu Excel;
//       `12/5/24` đọc NGÀY TRƯỚC. Ngày không có thật / chữ / tương lai / bé quá
//       7 tuổi là LỖI của dòng; ngoài lứa 12 tháng – 6 tuổi là CẢNH BÁO vẫn nhập.
//   [2] cùng hàm cho "Nhận một bé" và "Sửa hồ sơ".
//   [3] B3 — dòng ví dụ của tệp mẫu không bao giờ được nhập.
//   [4] O2a — cột phụ huynh 2 trong tệp nhập; trùng số thì nối như phụ huynh 1.
//   [5] O2b — thêm phụ huynh mà số đã có tài khoản: hỏi rồi NỐI; khác cơ sở thì
//       không lộ tên bé.
//   [6] O7 — tên nhóm gõ lệch dấu được cảnh báo.
//   [7] B2 — chọn cô phụ trách nhóm này không đụng vai của cô ở nhóm khác.
//   [8] B9 — xuất Hồ sơ bé: bé bảo lưu ghi "Bảo lưu từ …".
//   [9] O6 — nhập 300 bé không làm treo máy chủ.
import Database from 'better-sqlite3';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhap-danh-sach-that');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xuatbaocao']);
const mkQT = taoQuanTri(DIR, 'Hiệu trưởng', 'nds_qt');
const mkVP2 = taoQuanTri(DIR, 'Văn phòng CS2', 'nds_vp2');
datChucVu(DIR, 'nds_vp2', 'vanphong-coso');
khoaVaoCoSo(DIR, 'nds_vp2', 'cs2');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7001), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const doc = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const nam = Number(HOM_NAY().slice(0, 4));
const luiThang = (n) => {
  const [y, m, d] = HOM_NAY().split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 - n, Math.min(d, 28)));
  return t.toISOString().slice(0, 10);
};
const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const tep = (cot, hang) => [cot.join(','), ...hang.map(h => h.join(','))].join('\n');
const COT = ['Họ tên', 'Ngày sinh', 'Nhóm', 'Họ tên phụ huynh', 'Điện thoại'];

try {
  const QT = await vao('nds_qt', mkQT);
  const VP2 = await vao('nds_vp2', mkVP2);

  // =========================================================================
  console.log('\n[1] Ngày sinh trong tệp nhập được chuẩn hoá hoặc báo lỗi rõ ràng');
  {
    const ba = luiThang(40);           // 3 tuổi 4 tháng — trong lứa
    const sauThang = luiThang(6);      // nhỏ hơn 12 tháng
    const hang = [
      ['Bé Một', dmy(ba), 'Chồi 2', 'PH Một', '0970000001'],                    // dòng 2
      ['Bé Hai', '31/02/2024', 'Chồi 2', 'PH Hai', '0970000002'],                // dòng 3
      ['Bé Ba', '2024-13-05', 'Chồi 2', 'PH Ba', '0970000003'],                  // dòng 4
      ['Bé Bốn', '12/5/24', 'Chồi 2', 'PH Bốn', '0970000004'],                   // dòng 5
      ['Bé Năm', 'chưa rõ', 'Chồi 2', 'PH Năm', '0970000005'],                   // dòng 6
      ['Bé Sáu', `${nam + 1}-01-15`, 'Chồi 2', 'PH Sáu', '0970000006'],         // dòng 7
      ['Bé Bảy', '2015-03-02', 'Chồi 2', 'PH Bảy', '0970000007'],                // dòng 8
      ['Bé Tám', '45678', 'Chồi 2', 'PH Tám', '0970000008'],                     // dòng 9
      ['Bé Chín', dmy(sauThang), 'Chồi 2', 'PH Chín', '0970000009'],             // dòng 10
      ['Bé Mười', ba.split('-').reverse().join('-'), 'Chồi 2', 'PH Mười', '0970000010'], // dòng 11
    ];
    const csvText = tep(COT, hang);
    const r = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: csvText } });
    const dong = (n) => (r.data?.rows || []).find(x => x.line === n) || {};
    check('đọc được tệp', r.status === 200, r.data);
    check('24/09/2023 kiểu Việt Nam → YYYY-MM-DD', dong(2).ngaySinh === ba && !dong(2).loi.length, dong(2));
    check('31/02/2024 → lỗi "không có thật"', dong(3).loi?.some(x => x === "ngày sinh '31/02/2024' không có thật"), dong(3).loi);
    check('2024-13-05 → lỗi "không có thật"', dong(4).loi?.some(x => /không có thật/.test(x)), dong(4).loi);
    check('12/5/24 đọc NGÀY TRƯỚC: 12 tháng 5 năm 2024', dong(5).ngaySinh === '2024-05-12' && !dong(5).loi.length, dong(5));
    check('chữ "chưa rõ" → lỗi đọc không được, có ví dụ cách ghi', dong(6).loi?.some(x => /không đọc được.*24\/09\/2023/.test(x)), dong(6).loi);
    check('ngày tương lai → lỗi', dong(7).loi?.some(x => /tương lai/.test(x)), dong(7).loi);
    check('bé 11 tuổi → lỗi', dong(8).loi?.some(x => /11 tuổi/.test(x)), dong(8).loi);
    check('45678 (số ngày Excel) → 2025-01-21', dong(9).ngaySinh === '2025-01-21' && !dong(9).loi.length, dong(9));
    check('bé 6 tháng → cảnh báo, KHÔNG phải lỗi', !dong(10).loi.length && dong(10).canhBao?.some(x => /6 tháng/.test(x)), dong(10));
    check('dd-mm-yyyy cũng đọc được', dong(11).ngaySinh === ba, dong(11));
    check('đếm: 5 dòng lỗi', r.data?.loi === 5, r.data?.loi);
    check('đếm: 1 dòng cảnh báo', r.data?.canhBao === 1, r.data?.canhBao);

    const c = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: csvText } });
    check('nhập được 5 dòng hợp lệ (kể cả dòng cảnh báo)', c.status === 200 && c.data.imported === 5, c.data);
    const dob = (ten) => (doc('SELECT dob FROM students WHERE name = ?', ten)[0] || {}).dob;
    check('cơ sở dữ liệu lưu YYYY-MM-DD', dob('Bé Một') === ba && dob('Bé Bốn') === '2024-05-12' && dob('Bé Tám') === '2025-01-21',
      [dob('Bé Một'), dob('Bé Bốn'), dob('Bé Tám')]);
    check('dòng lỗi không vào hệ thống', !doc("SELECT id FROM students WHERE name IN ('Bé Hai','Bé Ba','Bé Năm','Bé Sáu','Bé Bảy')").length);

    // Nhập lại cùng tệp: dòng 24/09/2023 phải được nhận ra là "đã có".
    const lai = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: csvText } });
    check('nhập lại: bé đã có nhận ra theo ngày sinh đã chuẩn hoá',
      !!(lai.data?.rows || []).find(x => x.line === 2)?.trung, (lai.data?.rows || []).find(x => x.line === 2));
  }

  // =========================================================================
  console.log('\n[2] Nhận một bé và Sửa hồ sơ dùng cùng luật ngày sinh');
  let beSua = null;
  {
    const hong = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé Nhận Sai', classId: 'c1', tenLop: 'Chồi 2', ngaySinh: '31/02/2024', phHoTen: 'PH X', phSdt: '0971111111' },
    });
    check('nhận một bé với 31/02/2024 → 400, câu báo tiếng Việt', hong.status === 400 && /không có thật/.test(hong.data?.error), hong);
    const dung = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé Nhận Đúng', classId: 'c1', tenLop: 'Chồi 2', ngaySinh: '05/03/2023', phHoTen: 'PH Y', phSdt: '0971111112' },
    });
    check('nhận một bé với 05/03/2023 → lưu 2023-03-05', dung.status === 201 && dung.data.dob === '2023-03-05', dung.data);
    beSua = dung.data?.id;
    const nho = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé Nhận Sớm', classId: 'c4', tenLop: 'Nhà trẻ 1', ngaySinh: luiThang(8), phHoTen: 'PH Z', phSdt: '0971111113' },
    });
    check('nhận bé 8 tháng: vẫn nhận, kèm cảnh báo', nho.status === 201 && /8 tháng/.test((nho.data?.canhBao || []).join(' ')), nho.data);

    const s1 = await req('PUT', `/api/admin/students/${beSua}`, { cookie: QT, body: { dob: '24/09/2023' } });
    check('sửa hồ sơ: 24/09/2023 → lưu 2023-09-24', s1.status === 200
      && doc('SELECT dob FROM students WHERE id = ?', beSua)[0].dob === '2023-09-24', [s1.status, s1.data]);
    const s2 = await req('PUT', `/api/admin/students/${beSua}`, { cookie: QT, body: { dob: '31/02/2024' } });
    check('sửa hồ sơ: ngày không có thật → 400', s2.status === 400 && /không có thật/.test(s2.data?.error), s2);
    const s3 = await req('PUT', `/api/admin/students/${beSua}`, { cookie: QT, body: { dob: `${nam + 2}-01-01` } });
    check('sửa hồ sơ: ngày tương lai → 400', s3.status === 400, s3);

    // Bé cũ đã lưu ngày sai từ trước: lưu lại phiếu mà không đụng ô ngày sinh
    // thì vẫn lưu được (không chặn việc chuyển nhóm vì một ô cũ).
    const c = new Database(path.join(DIR, 'school.db'));
    c.prepare("UPDATE students SET dob = 'chưa rõ' WHERE id = ?").run(beSua);
    c.close();
    const s4 = await req('PUT', `/api/admin/students/${beSua}`, { cookie: QT, body: { dob: 'chưa rõ', address: 'Số 1' } });
    check('bé cũ lưu ngày sai: lưu phiếu không đổi ngày sinh vẫn được', s4.status === 200, s4);
  }

  // =========================================================================
  console.log('\n[3] Dòng ví dụ của tệp mẫu không bao giờ được nhập');
  {
    const r = await fetch(`${sv.BASE}/api/admin/import/template`, { headers: { Cookie: QT } });
    const mau = (await r.text()).replace(/^﻿/, '');
    check('tệp mẫu đánh dấu rõ dòng ví dụ', /VI-DU/.test(mau) && /dòng ví dụ/.test(mau), mau.split('\n')[1]);
    check('tệp mẫu có cột phụ huynh 2', /Họ tên phụ huynh 2/.test(mau) && /Điện thoại phụ huynh 2/.test(mau) && /Quan hệ phụ huynh 2/.test(mau),
      mau.split('\n')[0]);
    const chiMau = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: mau } });
    check('tệp mẫu chưa sửa: báo rõ chỉ có dòng ví dụ', chiMau.status === 400 && /dòng ví dụ/.test(chiMau.data?.error), chiMau);
    const them = `${mau.trim()}\n${['', 'Bé Thật Một', '', '', 'Chồi 2', '', '', 'PH Thật', '0972222221'].join(',')}`;
    const p = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: them } });
    check('tệp mẫu + một dòng thật: chỉ đếm dòng thật', p.status === 200 && p.data.total === 1 && p.data.rows.length === 1, p.data);
    check('kèm lời báo đã bỏ qua dòng ví dụ', (p.data?.viDu || []).length === 1, p.data?.viDu);
    const c = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: them } });
    check('nhập thật: chỉ một bé', c.status === 200 && c.data.imported === 1, c.data);
    check('không có bé ví dụ nào trong hệ thống', !doc("SELECT id FROM students WHERE code = 'VI-DU' OR name LIKE '%dòng ví dụ%'").length);
    const motBe = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Nguyễn Văn Mẫu (dòng ví dụ — xoá đi)', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'A', phSdt: '0972222299' },
    });
    check('đường nhận một bé cũng không nhận dòng ví dụ', motBe.status === 400, motBe);
  }

  // =========================================================================
  console.log('\n[4] Tệp nhập có cột phụ huynh thứ hai');
  {
    const cot = [...COT, 'Họ tên phụ huynh 2', 'Điện thoại phụ huynh 2', 'Quan hệ phụ huynh 2'];
    const csvText = tep(cot, [
      ['Bé Anh Cả', dmy(luiThang(50)), 'Lá 1', 'Mẹ Cả', '0973333331', 'Bố Cả', '0973333332', 'Bố'],
      ['Bé Em Út', dmy(luiThang(30)), 'Chồi 2', 'Mẹ Cả', '0973333331', 'Bố Cả', '0973333332', 'Bố'],
      ['Bé Thiếu Số', dmy(luiThang(30)), 'Chồi 2', 'Mẹ Khác', '0973333339', 'Bố Khác', '', ''],
      ['Bé Trùng Số', dmy(luiThang(30)), 'Chồi 2', 'Mẹ Kia', '0973333338', 'Bố Kia', '0973333338', ''],
    ]);
    const p = await req('POST', '/api/admin/import/preview', { cookie: QT, body: { csv: csvText } });
    const dong = (n) => (p.data?.rows || []).find(x => x.line === n) || {};
    check('phụ huynh 2 thiếu số điện thoại → lỗi của dòng', dong(4).loi?.some(x => /phụ huynh 2/.test(x)), dong(4).loi);
    check('phụ huynh 2 trùng số phụ huynh 1 → lỗi của dòng', dong(5).loi?.some(x => /phụ huynh 2/.test(x)), dong(5).loi);
    const c = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: csvText } });
    check('nhập được hai bé', c.status === 200 && c.data.imported === 2, c.data);
    const bo = doc("SELECT id FROM users WHERE role = 'parent' AND phone = '0973333332'");
    check('bố có đúng MỘT tài khoản', bo.length === 1, bo);
    const con = bo.length ? doc('SELECT studentId FROM student_parents WHERE parentId = ?', bo[0].id) : [];
    check('tài khoản của bố nối vào cả hai con', con.length === 2, con);
    check('quan hệ "Bố" được ghi', bo.length && doc('SELECT quanHe FROM quan_he_phu_huynh WHERE parentId = ?', bo[0].id).every(x => x.quanHe === 'Bố'));
    const tkBo = (c.data?.taiKhoan || []).filter(t => t.phuHuynh === 'Bố Cả');
    check('phiếu tài khoản có bố: lần đầu có mật khẩu, lần sau là "đã có tài khoản"',
      tkBo.length === 2 && !tkBo[0].daCoTaiKhoan && tkBo[1].daCoTaiKhoan, tkBo);
  }

  // =========================================================================
  console.log('\n[5] Thêm phụ huynh mà số đã có tài khoản: hỏi rồi nối');
  {
    const be = doc("SELECT id FROM students WHERE name = 'Bé Một'")[0].id;
    // 0912 345 678 là chị Thu Hà (phuhuynh) — mẹ của bé An (Chồi 2) và bé Ngọc (Lá 1).
    const hoi = await req('POST', `/api/admin/students/${be}/phu-huynh`, {
      cookie: QT, body: { name: 'Lê Thị Thu Hà', phone: '0912345678', quanHe: 'Mẹ' },
    });
    check('số đã có tài khoản → 409, chưa ghi gì', hoi.status === 409 && hoi.data?.canXacNhan === true, hoi);
    check('câu hỏi nêu tên chủ tài khoản và tên bé', /Lê Thị Thu Hà/.test(hoi.data?.error) && /Nguyễn Bảo An/.test(hoi.data?.error)
      && /Nối vào bé này\?/.test(hoi.data?.error), hoi.data?.error);
    check('chưa có tài khoản trùng số nào sinh ra',
      doc("SELECT COUNT(*) AS n FROM users WHERE role = 'parent' AND REPLACE(phone, ' ', '') = '0912345678'")[0].n === 1);
    const noi = await req('POST', `/api/admin/students/${be}/phu-huynh`, {
      cookie: QT, body: { name: 'Lê Thị Thu Hà', phone: '0912345678', quanHe: 'Mẹ', xacNhanNoi: true },
    });
    check('xác nhận → nối, không mật khẩu mới', noi.status === 201 && noi.data.daCoTaiKhoan === true && !noi.data.temporaryPassword, noi);
    check('vẫn chỉ một tài khoản', doc("SELECT COUNT(*) AS n FROM users WHERE role = 'parent' AND REPLACE(phone, ' ', '') = '0912345678'")[0].n === 1);
    check('bé được nối vào tài khoản p1', doc('SELECT 1 FROM student_parents WHERE studentId = ? AND parentId = ?', be, 'p1').length === 1);
    const lai = await req('POST', `/api/admin/students/${be}/phu-huynh`, {
      cookie: QT, body: { name: 'Lê Thị Thu Hà', phone: '0912345678', xacNhanNoi: true },
    });
    check('nối lần hai → 400 "đã là phụ huynh của bé"', lai.status === 400, lai);

    // Văn phòng cơ sở 2 thêm phụ huynh cho bé cơ sở 2 bằng số của nhà cơ sở 1.
    const moi = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé Cơ Sở Hai', classId: 'c3', tenLop: 'Mầm 1', phHoTen: 'PH CS2', phSdt: '0974444441' },
    });
    const be2 = moi.data?.id;
    const khac = await req('POST', `/api/admin/students/${be2}/phu-huynh`, {
      cookie: VP2, body: { name: 'Ai đó', phone: '0912 345 678' },
    });
    check('khác cơ sở → 409 không nối được', khac.status === 409 && khac.data?.canXacNhan !== true, khac);
    check('và KHÔNG lộ tên bé, tên chủ tài khoản', !/Bảo An|Ngọc|Thu Hà/.test(JSON.stringify(khac.data)), khac.data);
    check('câu báo chỉ đường liên hệ văn phòng cơ sở kia', /liên hệ văn phòng cơ sở kia/.test(khac.data?.error), khac.data?.error);
    const lach = await req('POST', `/api/admin/students/${be2}/phu-huynh`, {
      cookie: VP2, body: { name: 'Ai đó', phone: '0912345678', xacNhanNoi: true },
    });
    check('khác cơ sở mà gửi thẳng xacNhanNoi → vẫn không nối', lach.status === 409
      && !doc('SELECT 1 FROM student_parents WHERE studentId = ? AND parentId = ?', be2, 'p1').length, lach);
    const moiThat = await req('POST', `/api/admin/students/${be2}/phu-huynh`, {
      cookie: VP2, body: { name: 'Bố CS2', phone: '0974444442' },
    });
    check('số mới thì vẫn tạo tài khoản mới như trước', moiThat.status === 201 && !!moiThat.data.temporaryPassword, moiThat.data);
  }

  // =========================================================================
  console.log('\n[6] Tên nhóm gõ lệch dấu được cảnh báo');
  {
    const p = await req('POST', '/api/admin/import/preview', {
      cookie: QT, body: { csv: tep(COT, [['Bé Lệch', '', 'Choi 2', 'PH L', '0975555551'], ['Bé Mới', '', 'Sen 1', 'PH M', '0975555552']]) },
    });
    check('"Choi 2" giống "Chồi 2" đã có', (p.data?.lopGanGiong || []).some(x => x.moi === 'Choi 2' && x.giong === 'Chồi 2'), p.data?.lopGanGiong);
    check('"Sen 1" không giống nhóm nào → không cảnh báo', !(p.data?.lopGanGiong || []).some(x => x.moi === 'Sen 1'), p.data?.lopGanGiong);
  }

  // =========================================================================
  console.log('\n[7] Chọn cô phụ trách nhóm này không đụng nhóm khác');
  {
    const vai = (lop, co) => (doc('SELECT vaiTro FROM class_teachers WHERE classId = ? AND teacherId = ?', lop, co)[0] || {}).vaiTro;
    check('đối chứng: cô Hương (t2) là cô chính Lá 1', vai('c2', 't2') === 'chinh');
    const r = await req('PUT', '/api/admin/classes/c3/teachers', { cookie: QT, body: { teacherIds: ['t2'], chinhId: 't2' } });
    check('Mầm 1 chọn cô Hương làm cô phụ trách', r.status === 200 && vai('c3', 't2') === 'chinh', r);
    check('Lá 1 VẪN giữ cô Hương là cô chính', vai('c2', 't2') === 'chinh', vai('c2', 't2'));
    const tong = await req('GET', '/api/admin/overview', { cookie: QT });
    const la1 = (tong.data?.classes || []).find(c => c.id === 'c2') || {};
    check('màn tổng quan: Lá 1 vẫn ghi cô Hương', la1.teacherId === 't2' || /Hương/.test(la1.teacherName || ''), la1);

    // Tạo cô mới vào nhóm đã có cô (Mầm 1 có cô Hương): không đụng Lá 1.
    await req('PUT', '/api/admin/classes/c3/teachers', { cookie: QT, body: { teacherIds: ['t2'], chinhId: null } });
    check('đối chứng: Lá 1 vẫn cô Hương', vai('c2', 't2') === 'chinh', vai('c2', 't2'));
    const t = await req('POST', '/api/admin/teachers', { cookie: QT, body: { name: 'Cô Mới Toanh', classId: 'c3' } });
    check('tạo cô mới vào Mầm 1', t.status === 201, t);
    check('Lá 1 vẫn giữ cô Hương là cô chính sau khi tạo cô', vai('c2', 't2') === 'chinh', vai('c2', 't2'));
  }

  // =========================================================================
  console.log('\n[8] Xuất Hồ sơ bé: bé bảo lưu ghi "Bảo lưu từ …"');
  {
    const be = doc("SELECT id FROM students WHERE name = 'Bé Em Út'")[0].id;
    const bl = await req('POST', `/api/admin/students/${be}/bao-luu`, { cookie: QT, body: {} });
    check('đối chứng: bảo lưu được', bl.status === 200, bl);
    const r = await fetch(`${sv.BASE}/api/xuatbaocao/ho-so-be?pham=truong&keCaNghi=1`, { headers: { Cookie: QT } });
    const bang = xlsx.doc(Buffer.from(await r.arrayBuffer()));
    const hang = (bang[0]?.hang || []).find(h => h[1] === 'Bé Em Út') || [];
    const tinhTrang = hang[hang.length - 1];
    check('tình trạng ghi "Bảo lưu từ dd/mm/yyyy"', tinhTrang === `Bảo lưu từ ${dmy(HOM_NAY())}`, tinhTrang);
    const csv = await (await fetch(`${sv.BASE}/api/admin/students/xuat.csv?keCaNghi=1`, { headers: { Cookie: QT } })).text();
    check('tệp danh sách bé CSV cũng ghi đúng như vậy', csv.split('\n').some(d => d.includes('Bé Em Út') && d.includes(`Bảo lưu từ ${dmy(HOM_NAY())}`)));
  }

  // =========================================================================
  console.log('\n[9] Nhập 300 bé không làm treo máy chủ');
  {
    const hang = [];
    for (let i = 0; i < 300; i++) {
      hang.push([`Bé Số ${i}`, dmy(luiThang(30 + (i % 30))), 'Lá 1', `Phụ Huynh Số ${i}`, `098${String(1000000 + i)}`]);
    }
    const csvText = tep(COT, hang);
    let dangNhap = true;
    let tre = 0;
    const doTre = (async () => {
      while (dangNhap) {
        const t0 = Date.now();
        await fetch(`${sv.BASE}/healthz`);
        tre = Math.max(tre, Date.now() - t0);
        await new Promise(r => setTimeout(r, 20));
      }
    })();
    const t0 = Date.now();
    const c = await req('POST', '/api/admin/import/commit', { cookie: QT, body: { csv: csvText } });
    const tong = Date.now() - t0;
    dangNhap = false;
    await doTre;
    console.log(`    (nhập 300 bé mất ${tong} ms; /healthz chờ lâu nhất ${tre} ms)`);
    check('nhập đủ 300 bé', c.status === 200 && c.data.imported === 300, c.data?.error || c.data?.imported);
    check('mật khẩu băm đúng: đăng nhập được bằng mật khẩu trên phiếu',
      (await login(c.data.taiKhoan[299].username, c.data.taiKhoan[299].matKhau)).status === 200);
    check('/healthz không bị chặn quá 300 ms trong lúc nhập', tre < 300, tre);
  }
} catch (err) {
  check('bài chạy không vấp lỗi', false, err.stack || err.message);
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
