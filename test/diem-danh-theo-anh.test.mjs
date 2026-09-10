// Bài canh ẢNH LÀ ĐIỂM DANH và CHỐT SỔ VẮNG (Đ131).
//
// Chạy bằng:  npm run test:diem-danh-theo-anh
//
// Nhà trường chốt 07/09/2026:
//   "Đã chụp ảnh đến lớp thì auto là có mặt (không cần phải tích chọn). Muốn
//    bỏ phần tích chọn có mặt, muộn, nghỉ phép, nghỉ không phép. Xin nghỉ được
//    duyệt → Nghỉ CP; không xin nghỉ → Nghỉ KP. Mở điểm danh cho cả quản lý +
//    admin cơ sở. Con xin nghỉ đã được duyệt mà vẫn chụp ảnh check-in thì ghi
//    nhận đi học, tính tiền ăn."
//
// BỐN CHỖ ĐÁNG CANH
//
//   1. ẢNH → CÓ MẶT, kể cả đè lên dòng "nghỉ" và đè lên đơn nghỉ đã duyệt —
//      nhưng KHÔNG đổi giờ vào của bé đã có mặt từ trước. Mục [1], [2].
//   2. CHỐT SỔ VẮNG là một chạm của người lớn SAU giờ rà soát, không phải máy
//      tự ghi lúc 7h30 hay nửa đêm: trước giờ thì máy chủ từ chối, ngày khác
//      hôm nay cũng từ chối. Mục [3] — hai nhánh theo giờ chạy, nhánh nào cũng
//      có phép kiểm thật.
//   3. VĂN PHÒNG CƠ SỞ chấm được bé của cơ sở mình, không kèm mã nhóm, và
//      không thấy bé cơ sở khác. Mục [4].
//   4. MÀN HÌNH không còn phơi bốn nút tích trên từng dòng; chữ về bé chưa có
//      dòng nào là chữ xám, không đỏ (QUY TẮC 2). Mục [5].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu, GOC, HOM_NAY, ngay } from './_chung.mjs';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('diem-danh-theo-anh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'dta_qt');
const mkVp = taoQuanTri(DIR, 'Văn phòng cơ sở 1', 'dta_vp');
khoaVaoCoSo(DIR, 'dta_vp', 'cs1');
datChucVu(DIR, 'dta_vp', 'vanphong-coso');
const mkVp2 = taoQuanTri(DIR, 'Văn phòng cơ sở 2', 'dta_vp2');
khoaVaoCoSo(DIR, 'dta_vp2', 'cs2');
datChucVu(DIR, 'dta_vp2', 'vanphong-coso');

const NGAY = HOM_NAY();

// Dữ liệu mẫu đã chấm hôm nay cho nhóm Chồi 2. Bài này cần một buổi sáng CHƯA
// ai chấm gì, và một bé (s4, nhóm Chồi 2) có đơn nghỉ ĐÃ DUYỆT cho hôm nay.
{
  const conn = new Database(path.join(DIR, 'school.db'));
  conn.prepare('DELETE FROM attendance WHERE date = ?').run(NGAY);
  conn.prepare(`INSERT INTO leave_requests (id, studentId, parentId, fromDate, toDate, reason, status, createdAt, reviewedBy, reviewNote)
                VALUES ('lv_dta', 's4', 'p3', ?, ?, 'Con đi khám răng', 'approved', ?, 't1', '')`)
    .run(NGAY, NGAY, new Date().toISOString());
  conn.close();
}

const { BASE, dung } = await dungMayChu({ port: 4613, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const dongCua = async (cookie, studentId, classId = 'c1') => {
  const r = await req('GET', `/api/attendance/class?date=${NGAY}&classId=${classId}`, { cookie });
  return (r.data && r.data.students || []).find(x => x.student.id === studentId) || null;
};

try {
  const qt = await login('dta_qt', mkQt);
  const vp = await login('dta_vp', mkVp);
  const vp2 = await login('dta_vp2', mkVp2);
  const co = await login('giaovien', '123456');
  const co4 = await login('giaovien4', '123456');
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Chụp ảnh là có mặt — không phải bấm thêm gì');
  {
    const truoc = await dongCua(co.cookie, 's1');
    check('đối chứng — sáng nay bé chưa có dòng điểm danh nào', truoc && truoc.record === null, JSON.stringify(truoc && truoc.record));

    const r = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's1', date: NGAY, anh: ANH } });
    check('gắn ảnh vẫn trả 201 như trước', r.status === 201, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
    check('và trả kèm DÒNG ĐIỂM DANH vừa ghi', !!(r.data && r.data.record), JSON.stringify(r.data).slice(0, 160));
    check('dòng đó là "có mặt"', r.data.record && r.data.record.status === 'present', r.data.record && r.data.record.status);
    check('giờ vào là giờ chụp, dạng HH:MM', /^\d{2}:\d{2}$/.test(String(r.data.record && r.data.record.checkIn)), r.data.record && r.data.record.checkIn);
    const gioDau = r.data.record.checkIn;

    const sau = await dongCua(co.cookie, 's1');
    check('sổ điểm danh của cô thấy dòng có mặt', sau && sau.record && sau.record.status === 'present', JSON.stringify(sau && sau.record));
    check('kèm ảnh vừa gắn', !!(sau && sau.anhDenLop && sau.anhDenLop.file), JSON.stringify(sau && sau.anhDenLop));
    check('gia đình mở lịch tháng thấy ngay hôm nay là có mặt', (await (async () => {
      const g = await req('GET', `/api/attendance?studentId=s1&month=${NGAY.slice(0, 7)}`, { cookie: ph.cookie });
      return (g.data || []).some(x => x.date === NGAY && x.status === 'present');
    })()));

    // Chụp lại tấm đẹp hơn: ảnh đổi, giờ vào GIỮ NGUYÊN.
    const r2 = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's1', date: NGAY, anh: ANH } });
    check('chụp lại vẫn được', r2.status === 201, `${r2.status}`);
    check('giờ vào KHÔNG đổi theo tấm ảnh sau', r2.data.record && r2.data.record.checkIn === gioDau, `${gioDau} → ${r2.data.record && r2.data.record.checkIn}`);
  }

  // =========================================================================
  console.log('\n[2] Ảnh đè lên "nghỉ" — bé tới lớp thì là tới lớp, tính suất ăn');
  {
    // 2a. Cô lỡ ghi "nghỉ không phép" rồi bé tới muộn, bảo vệ chụp ảnh.
    const kp = await req('POST', '/api/attendance/mark', { cookie: co.cookie, body: { studentId: 's3', date: NGAY, status: 'absent_unexcused' } });
    check('đối chứng — ghi được "nghỉ không phép" cho s3', kp.status === 200 && kp.data.status === 'absent_unexcused', `${kp.status}`);
    const anh3 = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's3', date: NGAY, anh: ANH } });
    check('ảnh đè "nghỉ không phép" thành có mặt', anh3.status === 201 && anh3.data.record.status === 'present', JSON.stringify(anh3.data && anh3.data.record));
    check('và có giờ vào', /^\d{2}:\d{2}$/.test(String(anh3.data.record && anh3.data.record.checkIn)), anh3.data.record && anh3.data.record.checkIn);

    // 2b. Bé có đơn nghỉ ĐÃ DUYỆT nhưng sáng vẫn tới — nhà trường: "ghi nhận
    // đi học, tính tiền ăn".
    const s4 = await dongCua(co.cookie, 's4');
    check('đối chứng — s4 có đơn nghỉ đã duyệt hôm nay và chưa có dòng', s4 && s4.donNghiDaDuyet && s4.record === null, JSON.stringify(s4 && { don: s4.donNghiDaDuyet, rec: s4.record }));
    const anh4 = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's4', date: NGAY, anh: ANH } });
    check('ảnh → có mặt dù đã có đơn nghỉ được duyệt', anh4.status === 201 && anh4.data.record.status === 'present', JSON.stringify(anh4.data && anh4.data.record));
    const ba = await req('GET', `/api/tienan/bao-an?classId=c1&ngay=${NGAY}`, { cookie: co.cookie });
    if (ba.status === 200) {
      const nhom = (ba.data.nhom || [])[0] || {};
      check('bếp KHÔNG trừ suất của s4 nữa — điểm danh thắng đơn nghỉ', !(nhom.khongAn || []).some(x => x.studentId === 's4'), JSON.stringify(nhom.khongAn));
    } else {
      check('phân hệ Báo ăn đang tắt trong bài này — bỏ qua phép so suất ăn', ba.status === 404, `${ba.status}`);
    }

    // Trả s4 về trạng thái "chưa có dòng" để mục [3] còn có bé có đơn mà chưa
    // chấm. Xoá thẳng trong kho — máy chủ không có đường xoá dòng điểm danh,
    // đúng như thiết kế.
    const conn = new Database(path.join(DIR, 'school.db'));
    conn.prepare("DELETE FROM attendance WHERE studentId = 's4' AND date = ?").run(NGAY);
    conn.prepare("DELETE FROM attendance_photo WHERE studentId = 's4' AND date = ?").run(NGAY);
    conn.close();
  }

  // =========================================================================
  console.log('\n[3] Chốt sổ vắng — một chạm của người lớn, sau giờ rà soát, chỉ hôm nay');
  {
    const homQua = new Date(Date.parse(`${NGAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const cu = await req('POST', '/api/attendance/chot-vang', { cookie: co.cookie, body: { date: homQua, classId: 'c1' } });
    check('ngày đã qua thì KHÔNG chốt được (Đ127)', cu.status === 400 && /đã khoá/.test(cu.data.error || ''), `${cu.status} ${cu.data && cu.data.error}`);
    const phThu = await req('POST', '/api/attendance/chot-vang', { cookie: ph.cookie, body: { date: NGAY } });
    check('gia đình KHÔNG chốt được', phThu.status === 403, `${phThu.status}`);
    const lac = await req('POST', '/api/attendance/chot-vang', { cookie: co4.cookie, body: { date: NGAY, classId: 'c1' } });
    check('cô nhóm khác KHÔNG chốt được nhóm Chồi 2', lac.status === 403, `${lac.status}`);

    const gioVN = Number(String(ngay.bayGio()).slice(0, 2));
    const r = await req('POST', '/api/attendance/chot-vang', { cookie: co.cookie, body: { date: NGAY, classId: 'c1' } });
    if (gioVN < 9) {
      console.log(`  (giờ Việt Nam hiện là ${ngay.bayGio()} — nhánh TRƯỚC giờ rà soát)`);
      check('trước 9 giờ thì máy chủ TỪ CHỐI chốt', r.status === 400 && /sau 9h/.test(r.data.error || ''), `${r.status} ${r.data && r.data.error}`);
      check('và nói rõ giờ chốt', r.data.gioRaSoat === '09:00' && r.data.gioRaSoatChu === '9h',
        { g: r.data.gioRaSoat, c: r.data.gioRaSoatChu });
      const s5 = await dongCua(co.cookie, 's5');
      check('không bé nào bị ghi vắng', s5 && s5.record === null, JSON.stringify(s5 && s5.record));
    } else {
      console.log(`  (giờ Việt Nam hiện là ${ngay.bayGio()} — nhánh SAU giờ rà soát)`);
      check('sau 9 giờ thì chốt được', r.status === 200 && r.data.ok === true, `${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
      // Chồi 2 có 5 bé: s1 và s3 đã có mặt nhờ ảnh; s4 có đơn; s5, s6 chưa gì.
      check('bé đã có dòng (s1, s3) được giữ nguyên — đếm đúng 2', r.data.soDaCoTruoc === 2, r.data.soDaCoTruoc);
      check('bé có đơn nghỉ được duyệt → Nghỉ có phép, đúng 1 bé', r.data.soNghiCoPhep === 1, r.data.soNghiCoPhep);
      check('bé không đơn, không ảnh → Nghỉ không phép, đúng 2 bé', r.data.soNghiKhongPhep === 2, r.data.soNghiKhongPhep);
      const s4 = await dongCua(co.cookie, 's4');
      check('s4 (có đơn) thành "nghỉ có phép"', s4 && s4.record && s4.record.status === 'absent_excused', JSON.stringify(s4 && s4.record));
      const s5 = await dongCua(co.cookie, 's5');
      check('s5 (không đơn) thành "nghỉ không phép"', s5 && s5.record && s5.record.status === 'absent_unexcused', JSON.stringify(s5 && s5.record));
      const s1 = await dongCua(co.cookie, 's1');
      check('s1 vẫn "có mặt", không bị chốt đè', s1 && s1.record && s1.record.status === 'present', JSON.stringify(s1 && s1.record));
      const lai = await req('POST', '/api/attendance/chot-vang', { cookie: co.cookie, body: { date: NGAY, classId: 'c1' } });
      check('chốt lần hai không ghi thêm gì', lai.status === 200 && lai.data.soNghiCoPhep === 0 && lai.data.soNghiKhongPhep === 0, JSON.stringify(lai.data));
      // Bé tới muộn SAU khi chốt: ảnh vẫn đè lại thành có mặt.
      const muon = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's5', date: NGAY, anh: ANH } });
      check('chốt rồi mà bé tới, chụp ảnh → có mặt', muon.status === 201 && muon.data.record.status === 'present', JSON.stringify(muon.data && muon.data.record));
      const rs = await req('GET', `/api/attendance/ra-soat?date=${NGAY}&classId=c1`, { cookie: co.cookie });
      check('bảng rà soát sau khi chốt không còn ai cần gọi', rs.status === 200 && rs.data.soCanRaSoat === 0, JSON.stringify(rs.data));
    }
  }

  // =========================================================================
  console.log('\n[4] Văn phòng cơ sở chấm được bé của cơ sở mình — không kèm mã nhóm');
  {
    const ds = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: vp.cookie });
    check('văn phòng mở được sổ của cả cơ sở, không cần mã nhóm', ds.status === 200 && (ds.data.students || []).length > 0, `${ds.status}`);
    const ten = new Set((ds.data.students || []).map(x => x.student.className));
    check('mỗi bé mang tên nhóm để màn hình xếp theo nhóm', (ds.data.students || []).every(x => x.student.classId && x.student.className), [...ten]);
    check('thấy đủ ba nhóm của cơ sở 1', ['Chồi 2', 'Lá 1', 'Nhà trẻ 1'].every(t => ten.has(t)), [...ten]);
    const ids = new Set((ds.data.students || []).map(x => x.student.id));
    check('bé cơ sở 1 có trong danh sách', ids.has('s2') && ids.has('s9'), [...ids]);

    const anhVp = await req('POST', '/api/attendance/anh', { cookie: vp.cookie, body: { studentId: 's2', date: NGAY, anh: ANH } });
    check('văn phòng cơ sở 1 chụp được ảnh cho bé cơ sở 1 → có mặt', anhVp.status === 201 && anhVp.data.record.status === 'present', `${anhVp.status} ${JSON.stringify(anhVp.data).slice(0, 120)}`);
    const anhVp2 = await req('POST', '/api/attendance/anh', { cookie: vp2.cookie, body: { studentId: 's2', date: NGAY, anh: ANH } });
    check('văn phòng cơ sở 2 KHÔNG chấm được bé cơ sở 1', anhVp2.status === 403, `${anhVp2.status}`);
    const chotVp2 = await req('POST', '/api/attendance/chot-vang', { cookie: vp2.cookie, body: { date: NGAY, classId: 'c2' } });
    check('văn phòng cơ sở 2 KHÔNG chốt được nhóm của cơ sở 1', chotVp2.status === 403, `${chotVp2.status}`);
    const qtDs = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: qt.cookie });
    check('Cấp 1 vẫn mở được sổ cả trường', qtDs.status === 200 && (qtDs.data.students || []).length >= (ds.data.students || []).length, `${qtDs.status}`);
  }

  // =========================================================================
  console.log('\n[5] Màn hình: ảnh là nút chính, bốn nút tích rút vào "Sửa", chữ xám cho việc chưa làm');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8');
    const dong = (v.match(/  rosterRow\(\{ student: s, record, donNghiDaDuyet, anhDenLop \}\) \{[\s\S]*?\n  \},/) || [''])[0];
    check('đối chứng — tìm được dòng bé', dong.length > 400, dong.length);
    check('dòng bé KHÔNG còn vẽ bốn nút tích từ STATUS_KEYS', !/STATUS_KEYS\.map/.test(dong), 'còn STATUS_KEYS.map');
    check('có nút "Chụp ảnh con tới lớp" và nút "Sửa"', /Chụp ảnh con tới lớp/.test(dong) && />Sửa</.test(dong));
    check('bé chưa có dòng → huy hiệu XÁM "Chưa có ảnh đến lớp", không đỏ',
      /badge gray">Chưa có ảnh đến lớp/.test(v) && !/badge red">Chưa/.test(v));
    check('hộp Sửa không còn mời chọn "Đến muộn"', /suaDiemDanh\(studentId\)[\s\S]*?const lua = \[\['present'[^\n]*\]\];/.test(v) && !/\['late',/.test(v));
    check('màn văn phòng dựng sổ cả cơ sở theo nhóm', /theDiemDanhCoSo\(so\)/.test(v) && /<details class="card"/.test(v));
    check('có nút chốt sổ vắng cho cả cô lẫn văn phòng', (v.match(/nutChotVang\(/g) || []).length >= 3, (v.match(/nutChotVang\(/g) || []).length);
    check('nhắc "gọi xác nhận xong" TRƯỚC khi chốt — chốt không thay cho cuộc gọi', /Gọi xác nhận xong/.test(v));
    check('gia đình: ô "Muộn" chỉ hiện khi có dữ liệu cũ', /k !== 'late' \|\| counts\.late > 0/.test(v));
    check('gia đình: có dòng số ngày ăn ở trường để đối chiếu tiền ăn', /Số ngày con ăn ở trường tháng này/.test(v));
    const rt = fs.readFileSync(path.join(GOC, 'routes/attendance.js'), 'utf8');
    // Từ Đ155 mốc giờ là thứ nhà trường đặt, không còn là hằng số trong mã.
    // Canh đúng tính chất cũ (chốt sổ từ chối khi chưa tới mốc) qua cửa mới.
    check('máy chủ: chốt sổ từ chối trước giờ rà soát',
      /nowTime\(\)\)\.slice\(0, 5\) < mocRaSoat/.test(rt));
    check('và mốc giờ ấy đọc từ cài đặt của trường, không ghi cứng trong mã',
      /function gioRaSoat\(\)/.test(rt) && /'diemdanh'/.test(rt) && !/const GIO_RA_SOAT = 9/.test(rt));
    check('máy chủ: chốt sổ đi qua khoá ngày (Đ127)', /chanNgoaiNgay\(res, ngay, 'chốt'\)/.test(rt));
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Ảnh là điểm danh, chốt sổ vắng');
