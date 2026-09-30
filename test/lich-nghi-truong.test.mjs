// Bài canh LỊCH NGHỈ CỦA TRƯỜNG (Đ147).
//
// Chạy bằng:  npm run test:lich-nghi-truong
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"cần thêm phần set lịch được ghi nhận là nghỉ có phép để
// hoàn tiền ăn, như nghỉ lễ theo lịch nhà nước, lịch nghỉ hè tết của trường.
// Do đó nếu hôm đó bé k xin nghỉ, k có checkin thì sẽ là nghỉ ko phép."*
//
// Tức là hai câu, và câu thứ hai mới là chỗ dễ làm sai: ngày trường nghỉ thì
// KHÔNG nhà nào phải xin phép, nên nếu app cứ theo luật cũ (không có đơn =
// nghỉ KHÔNG phép) thì cả trường bị ghi nghỉ không phép vào đúng mùng Một Tết,
// và tiền ăn tháng đó tính sai cho mọi nhà.
//
// BA ĐIỀU CỐ Ý, canh ở mục [4], [5], [6]:
//
//   • Đợt nghỉ KHÔNG phải một đơn xin nghỉ. Nó không nằm trong bảng
//     `leave_requests`, không chờ ai duyệt, và không làm số "đơn chờ duyệt"
//     nhúc nhích một đơn vị nào.
//   • Cơ sở để TRỐNG = cả trường. Nghỉ lễ nhà nước là trường hợp thường gặp
//     nhất nên phải là cái dễ nhập nhất; nghỉ riêng một cơ sở thì khai rõ.
//   • Sổ đã chốt rồi thì thêm lịch nghỉ KHÔNG sửa ngược bản ghi cũ. Sửa ngược
//     một quyển sổ kế toán đã chốt là thứ không ai kiểm lại được.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('lich-nghi-truong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh', 'tienan']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4647), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
const QL2 = await vao('quanly2', mkCS2);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const NGAY = HOM_NAY();
// NGÀY HỌC LÀ THỨ HAI ĐẾN THỨ SÁU — và bài này phải tự biết điều đó.
//
// `lib/nghi-hoc.js` chỉ đếm Thứ Hai–Thứ Sáu là ngày trường nghỉ có ảnh hưởng
// tới tiền ăn, và điều đó ĐÚNG: Thứ Bảy không có bữa nào để hoàn. Nhưng các
// mục [7]–[9] trước đợt này đóng cứng "hôm nay + hôm qua = 2 ngày học", nên
// **cả bộ bài đỏ vào mọi Thứ Bảy và Chủ Nhật** — một bài canh hỏng theo đồng
// hồ, và nó đã đỏ thật khi `npm test` chạy sau nửa đêm giờ Việt Nam.
//
// Nay các mục ấy tự dựng lấy ngày mình cần và đo bằng CHÊNH LỆCH, nên chạy
// ngày nào cũng ra một kết quả. Luật "cuối tuần không tính" thành một phép
// kiểm RIÊNG thay vì một giả định ngầm — đo nhiều hơn chứ không ít hơn.
const thuCua = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
const laNgayHoc = (d) => thuCua(d) >= 1 && thuCua(d) <= 5;
const ngayCuaThang = (thang) => {
  const ra = [];
  for (let i = 1; i <= 31; i += 1) {
    const d = `${thang}-${String(i).padStart(2, '0')}`;
    if (new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d) ra.push(d);
  }
  return ra;
};

const ds = async (cookie, q = '') => (await req('GET', `/api/leave/lich-nghi${q}`, { cookie })).data;
const tao = (cookie, body) => req('POST', '/api/leave/lich-nghi', { cookie, body });

// Dữ liệu mẫu VỐN đã có đơn chờ duyệt của gia đình. Thứ mục [4] canh là "đặt
// lịch nghỉ có đẻ thêm đơn nào không", nên phải đo bằng CHÊNH LỆCH — chốt cứng
// một con số tuyệt đối là bài đỏ mỗi lần ai đó thêm một đơn vào dữ liệu mẫu,
// mà đỏ vì lý do chẳng liên quan gì tới lịch nghỉ.
const DON_CHO_TRUOC = ((await req('GET', '/api/leave', { cookie: QT })).data || [])
  .filter(l => l.status === 'pending').length;

// ===========================================================================
console.log('\n[1] Văn phòng đặt đợt nghỉ, ai cũng đọc được');
let DOT_TET;
{
  const co = await tao(GV, { ten: 'Cô thử đặt', tuNgay: NGAY, denNgay: NGAY });
  check('CÔ không đặt được lịch nghỉ của trường', co.status === 403, co.status);
  const ph = await tao(PH, { ten: 'Nhà thử đặt', tuNgay: NGAY, denNgay: NGAY });
  check('gia đình cũng không', ph.status === 403, ph.status);

  const thieu = await tao(QT, { ten: '', tuNgay: NGAY, denNgay: NGAY });
  check('thiếu tên đợt nghỉ thì từ chối và nói rõ',
    thieu.status === 400 && /tên/i.test(thieu.data?.error || ''), thieu.data);
  const nguoc = await tao(QT, { ten: 'Ngược', tuNgay: '2026-02-20', denNgay: '2026-02-10' });
  check('ngày kết thúc trước ngày bắt đầu thì từ chối', nguoc.status === 400, nguoc.data);
  const laNgay = await tao(QT, { ten: 'Sai dạng', tuNgay: '20/02/2026', denNgay: '2026-02-21' });
  check('ngày sai dạng thì từ chối', laNgay.status === 400, laNgay.data);

  const r = await tao(QT, {
    ten: 'Nghỉ Tết Nguyên đán', tuNgay: '2026-02-14', denNgay: '2026-02-22', loai: 'tet',
  });
  check('văn phòng đặt được đợt nghỉ', r.status === 201, r.data);
  DOT_TET = r.data?.dot?.id;
  check('mặc định CÓ hoàn tiền ăn — đó là lý do trường xin phần này',
    r.data?.dot?.hoanTienAn === 'co', r.data?.dot?.hoanTienAn);
  check('mặc định áp cho CẢ TRƯỜNG khi không khai cơ sở',
    r.data?.dot?.campusId === '', r.data?.dot?.campusId);

  check('cô đọc được lịch nghỉ', (await ds(GV))?.dot?.some(d => d.id === DOT_TET));
  check('gia đình cũng đọc được — để biết vì sao mai không phải đưa con đi',
    (await ds(PH))?.dot?.some(d => d.id === DOT_TET));
  check('cô và gia đình KHÔNG được mời sửa', (await ds(GV))?.duocSua === false, (await ds(GV))?.duocSua);
  check('văn phòng thì được', (await ds(QT))?.duocSua === true);
}

// ===========================================================================
console.log('\n[2] Lọc theo khoảng, và sửa / xoá');
{
  await tao(QT, { ten: 'Nghỉ hè', tuNgay: '2026-06-01', denNgay: '2026-07-31', loai: 'he' });
  const thang2 = await ds(QT, '?tu=2026-02-01&den=2026-02-28');
  check('lọc theo khoảng chỉ ra đợt chạm khoảng đó',
    thang2.dot.length === 1 && thang2.dot[0].id === DOT_TET, thang2.dot.map(d => d.ten));

  const sua = await req('PUT', `/api/leave/lich-nghi/${DOT_TET}`, {
    cookie: QT, body: { ten: 'Nghỉ Tết Bính Ngọ', hoanTienAn: 'khong' },
  });
  check('sửa được tên và cờ hoàn tiền',
    sua.status === 200 && sua.data?.dot?.ten === 'Nghỉ Tết Bính Ngọ' && sua.data?.dot?.hoanTienAn === 'khong', sua.data);
  await req('PUT', `/api/leave/lich-nghi/${DOT_TET}`, { cookie: QT, body: { hoanTienAn: 'co' } });

  const coSua = await req('PUT', `/api/leave/lich-nghi/${DOT_TET}`, { cookie: GV, body: { ten: 'x' } });
  check('cô KHÔNG sửa được', coSua.status === 403, coSua.status);
  const la = await req('PUT', '/api/leave/lich-nghi/khong-co', { cookie: QT, body: { ten: 'x' } });
  check('mã lạ thì 404, không nổ', la.status === 404, la.status);

  const bo = await tao(QT, { ten: 'Đặt nhầm', tuNgay: '2026-09-30', denNgay: '2026-09-30' });
  const xoaCo = await req('DELETE', `/api/leave/lich-nghi/${bo.data.dot.id}`, { cookie: GV });
  check('cô KHÔNG xoá được', xoaCo.status === 403, xoaCo.status);
  const xoa = await req('DELETE', `/api/leave/lich-nghi/${bo.data.dot.id}`, { cookie: QT });
  check('văn phòng xoá được đợt đặt nhầm', xoa.status === 200, xoa.data);
  check('xoá rồi thì biến khỏi danh sách',
    !(await ds(QT))?.dot?.some(d => d.id === bo.data.dot.id));
}

// ===========================================================================
console.log('\n[3] Quản lý CƠ SỞ chỉ đặt được cho cơ sở mình');
{
  const caTruong = await tao(QL2, { ten: 'CS2 đặt cả trường', tuNgay: '2026-03-02', denNgay: '2026-03-02' });
  check('quản lý một cơ sở KHÔNG đặt được đợt nghỉ cho CẢ TRƯỜNG', caTruong.status === 400, caTruong.data);
  check('và câu từ chối chỉ rõ họ đặt được cho ai',
    /cơ sở/i.test(caTruong.data?.error || ''), caTruong.data?.error);

  const khac = await tao(QL2, { ten: 'CS2 đặt hộ CS1', tuNgay: '2026-03-03', denNgay: '2026-03-03', campusId: 'cs1' });
  check('cũng KHÔNG đặt được cho cơ sở khác', khac.status === 403, khac.data);

  const cuaMinh = await tao(QL2, { ten: 'CS2 sửa chữa', tuNgay: '2026-03-04', denNgay: '2026-03-04', campusId: 'cs2' });
  check('nhưng đặt được cho cơ sở của mình', cuaMinh.status === 201, cuaMinh.data);
}

// ===========================================================================
console.log('\n[4] Đợt nghỉ KHÔNG phải một đơn xin nghỉ');
{
  const don = await req('GET', '/api/leave', { cookie: QT });
  const cho = (don.data || []).filter(l => l.status === 'pending');
  check('đặt bốn đợt nghỉ rồi mà số đơn chờ duyệt KHÔNG nhúc nhích',
    cho.length === DON_CHO_TRUOC, { truoc: DON_CHO_TRUOC, sau: cho.length });
  check('và không đơn nào mang tên đợt nghỉ',
    !(don.data || []).some(l => /Tết Bính Ngọ|Nghỉ hè/.test(l.reason || '')), don.data?.length);
}

// ===========================================================================
console.log('\n[5] CHỐT SỔ VẮNG ngày trường nghỉ → cả nhóm là nghỉ CÓ PHÉP');
{
  await tao(QT, { ten: 'Nghỉ giỗ Tổ', tuNgay: NGAY, denNgay: NGAY, loai: 'le' });

  // Dữ liệu mẫu đã chấm sẵn hôm nay cho cả nhóm, nên không còn bé nào để chốt.
  // Dọn sổ của nhóm Chồi 2 để mục này có việc thật mà đo — máy chủ KHÔNG có
  // đường xoá một dòng điểm danh, đúng như thiết kế, nên xoá thẳng trong kho.
  {
    const conn = new Database(path.join(DIR, 'school.db'));
    conn.prepare(`DELETE FROM attendance WHERE date = ?
                    AND studentId IN (SELECT id FROM students WHERE classId = 'c1')`).run(NGAY);
    conn.prepare(`DELETE FROM attendance_photo WHERE date = ?
                    AND studentId IN (SELECT id FROM students WHERE classId = 'c1')`).run(NGAY);
    conn.close();
  }

  const soDon = await req('GET', '/api/attendance/class?date=' + NGAY, { cookie: GV });
  check('đối chứng — mở được sổ điểm danh hôm nay', soDon.status === 200, soDon.status);
  check('MÀN ĐIỂM DANH NÓI RÕ HÔM NAY TRƯỜNG NGHỈ, để cô khỏi chấm nhầm',
    !!soDon.data?.truongNghi && /giỗ Tổ/i.test(soDon.data.truongNghi.ten || ''), soDon.data?.truongNghi);

  // Chốt sổ vắng chỉ làm được sau 9 giờ (Đ127). Bài này chạy bất kỳ giờ nào
  // trong ngày nên phải rẽ hai nhánh — cùng cách với test/diem-danh-theo-anh.
  const gioVN = Number(String(ngay.bayGio()).slice(0, 2));
  const chot = await req('POST', '/api/attendance/chot-vang', { cookie: QT, body: { date: NGAY, classId: 'c1' } });
  if (gioVN < 9) {
    console.log(`  (giờ Việt Nam hiện là ${ngay.bayGio()} — nhánh TRƯỚC giờ rà soát)`);
    check('trước 9 giờ thì máy chủ vẫn TỪ CHỐI chốt, lịch nghỉ không nới luật đó',
      chot.status === 400 && /sau 9h/.test(chot.data?.error || ''), chot.data);
  } else {
    console.log(`  (giờ Việt Nam hiện là ${ngay.bayGio()} — nhánh SAU giờ rà soát)`);
    check('chốt sổ được', chot.status === 200, chot.data);
    check('MỌI bé chưa có dòng đều thành nghỉ CÓ PHÉP, không phải không phép',
      chot.data?.soNghiKhongPhep === 0 && chot.data?.soNghiCoPhep > 0,
      { coPhep: chot.data?.soNghiCoPhep, khongPhep: chot.data?.soNghiKhongPhep });
    check('và nói rõ vì sao: vì hôm nay trường nghỉ',
      /trường nghỉ/i.test(chot.data?.lyDo || ''), chot.data?.lyDo);
  }
}

// ===========================================================================
console.log('\n[6] Sổ đã chốt rồi thì thêm lịch nghỉ KHÔNG sửa ngược bản ghi cũ');
{
  const homQua = new Date(Date.parse(`${NGAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  // Ghi tay một dòng nghỉ KHÔNG phép của hôm qua, rồi mới đặt lịch nghỉ đè lên.
  //
  // Ghi THẲNG VÀO KHO chứ không qua `/api/attendance/mark`: từ Đ127, sổ điểm
  // danh chỉ ghi và sửa được trong chính ngày hôm đó, nên máy chủ từ chối mọi
  // yêu cầu ghi cho hôm qua — đúng như thiết kế. Đây là dựng bối cảnh "sổ đã
  // chốt từ hôm qua", không phải thao tác mà người dùng làm được.
  {
    const conn = new Database(path.join(DIR, 'school.db'));
    conn.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s1', homQua);
    conn.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                  VALUES (?, 's1', ?, 'absent_unexcused', NULL, NULL, '', 'u_test')`)
      .run(`att_cu_${homQua}`, homQua);
    conn.close();
  }
  await tao(QT, { ten: 'Nghỉ bù hôm qua', tuNgay: homQua, denNgay: homQua, loai: 'le' });
  const sau = await req('GET', `/api/attendance?studentId=s1`, { cookie: QT });
  const dong = (sau.data || []).find(x => x.date === homQua);
  check('dòng đã ghi hôm qua GIỮ NGUYÊN nghỉ không phép — không tự sửa ngược',
    dong && dong.status === 'absent_unexcused', dong);
}

// ===========================================================================
// Bảng tiền ăn tháng gộp CẢ TRƯỜNG (đường `/api/tienan/thang` không nhận lọc
// nhóm), nên phải soi ĐÚNG MỘT BÉ đã biết rõ hoàn cảnh thay vì lấy dòng đầu
// danh sách: dòng đầu là bé đứng đầu bảng chữ cái của cả trường, đổi theo dữ
// liệu mẫu, và có thể nằm ở nhóm mà mục [5] không đụng tới.
//
// Bé s1 — nhóm Chồi 2 (cơ sở 1). Trong tháng này bé có đúng hai ngày trường
// nghỉ: hôm nay (mục [5], đã chốt thành nghỉ có phép) và hôm qua (mục [6], ghi
// tay nghỉ không phép). Không ngày nào bé CÓ MẶT, nên cả hai đều được hoàn.
const beCuaBang = async () => {
  const r = await req('GET', `/api/tienan/thang?thang=${NGAY.slice(0, 7)}`, { cookie: QT });
  return { r, be: (r.data?.danhSach || []).find(x => x.studentId === 's1') };
};

// HAI NGÀY HỌC VÀ MỘT NGÀY CUỐI TUẦN, do chính bài này chọn ra trong tháng —
// không mượn "hôm nay" và "hôm qua" nữa, vì hai ngày ấy rơi vào thứ mấy là do
// đồng hồ quyết định chứ không do bài canh quyết định.
const NGAY_THANG = ngayCuaThang(NGAY.slice(0, 7));
const HOM_QUA = new Date(Date.parse(`${NGAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

// PHẢI LOẠI HÔM NAY VÀ HÔM QUA RA, và đây là chỗ bài này từng đỏ theo LỊCH.
//
// Mục [5] đã biến HÔM NAY thành ngày trường nghỉ cho bé s1, mục [6] làm tương
// tự với HÔM QUA. Mục [7] đo bằng CHÊNH LỆCH: đặt thêm hai đợt nghỉ rồi đòi số
// ngày trường nghỉ tăng đúng hai. Đặt trúng một ngày ĐÃ là ngày nghỉ thì số
// không đổi, và phép kiểm đỏ — dù mã chạy hoàn toàn đúng.
//
// Chuyện đó xảy ra đúng vào những ngày CUỐI THÁNG: khi hôm nay là ngày học cuối
// cùng của tháng thì "hai ngày học cuối tháng" CHÍNH LÀ hôm nay và hôm qua.
// Bắt được ngày 30/09/2026 — ngày học cuối của tháng 9. Xanh suốt 29 ngày rồi
// đỏ đúng một ngày là kiểu sai nguy hiểm nhất: ai gặp cũng nghĩ "chạy lại là
// xanh". Cùng họ với mục 19 và 20 của docs/QUYET-DINH-TU-CHOT.md.
const NGAY_HOC = NGAY_THANG.filter(d => laNgayHoc(d) && d !== NGAY && d !== HOM_QUA);
const NGAY_CUOI_TUAN = NGAY_THANG.filter(d => !laNgayHoc(d));
// LẤY NGÀY HỌC CUỐI THÁNG, không lấy đầu tháng: dữ liệu mẫu đã chấm điểm danh
// cho những ngày đầu tháng, mà bé CÓ MẶT đúng ngày trường nghỉ thì cố ý KHÔNG
// được hoàn — đo trên những ngày ấy là đo lẫn hai thứ vào nhau.
const HOC_A = NGAY_HOC[NGAY_HOC.length - 2];
const HOC_B = NGAY_HOC[NGAY_HOC.length - 1];
const CUOI_TUAN = NGAY_CUOI_TUAN[NGAY_CUOI_TUAN.length - 1];

// DỰNG NỀN CHO CẢ BA MỤC DƯỚI ĐÂY — và đây là chỗ bài này từng đỏ theo LỊCH.
//
// `data/seed.js` chấm điểm danh cho 20 NGÀY HỌC GẦN NHẤT của MỌI bé. Vào những
// ngày cuối tháng, gần như mọi ngày học trong tháng đều nằm trong 20 ngày ấy —
// nên s1 và s2 CÓ MẶT sẵn ở HOC_A và HOC_B. Mà bé có mặt đúng ngày trường nghỉ
// thì cố ý KHÔNG được hoàn, nên ba mục dưới đo ra toàn số không đổi và báo đỏ,
// trong khi mã tính tiền ăn hoàn toàn đúng.
//
// Chú thích cũ ở đây ghi "không ngày nào bé CÓ MẶT" như một điều hiển nhiên.
// Điều đó đúng khi HOC_A/HOC_B còn là ngày chưa ai chấm — và hết đúng vào cuối
// tháng. Nay bài TỰ DỰNG lấy cái nền ấy thay vì trông chờ vào dữ liệu mẫu.
{
  const conn = new Database(path.join(DIR, 'school.db'));
  conn.prepare('DELETE FROM attendance WHERE studentId IN (?, ?) AND date IN (?, ?)')
    .run('s1', 's2', HOC_A, HOC_B);
  conn.close();
}

console.log('\n[7] Bảng tiền ăn tháng cộng ngày trường nghỉ vào ngày được hoàn');
{
  const { r, be } = await beCuaBang();
  check('mở được bảng tiền ăn tháng này', r.status === 200, r.data?.error || r.status);
  check('tìm được bé s1 trong bảng', !!be, (r.data?.danhSach || []).length);
  check('bảng có cột số ngày TRƯỜNG NGHỈ', be && typeof be.soNgayTruongNghi === 'number', be);
  check('dựng được hai NGÀY HỌC và một ngày CUỐI TUẦN có thật trong tháng',
    !!HOC_A && !!HOC_B && !!CUOI_TUAN, { HOC_A, HOC_B, CUOI_TUAN });
  // ĐIỀU KIỆN TIÊN QUYẾT NÓI THẲNG RA. Không có phép kiểm này thì ngày nào hai
  // ngày ấy trùng hôm nay/hôm qua, bài sẽ đỏ ở phép kiểm BÊN DƯỚI — và người
  // đọc đi tìm lỗi trong mã tính tiền ăn, chứ không ngờ tới chỗ dựng ngày.
  check('và hai ngày ấy KHÔNG trùng hôm nay / hôm qua — hai ngày mục [5] và [6] đã dùng',
    HOC_A !== NGAY && HOC_A !== HOM_QUA && HOC_B !== NGAY && HOC_B !== HOM_QUA,
    { homNay: NGAY, homQua: HOM_QUA, HOC_A, HOC_B });

  // ĐO BẰNG CHÊNH LỆCH. Các mục trước đã đặt vài đợt nghỉ rồi, và số ngày học
  // trong đó thay đổi theo hôm nay là thứ mấy — chốt cứng một con số tuyệt đối
  // ở đây là chính cái đã làm cả bộ bài đỏ vào cuối tuần.
  const truoc = be.soNgayTruongNghi;
  const truocHoan = be.soNgayTruongNghiHoan;
  await tao(QT, { ten: 'Nghỉ thử ngày học A', tuNgay: HOC_A, denNgay: HOC_A, loai: 'le' });
  await tao(QT, { ten: 'Nghỉ thử ngày học B', tuNgay: HOC_B, denNgay: HOC_B, loai: 'le' });
  const { be: sau } = await beCuaBang();
  check('HAI NGÀY HỌC trường nghỉ được cộng thêm đúng hai',
    sau.soNgayTruongNghi === truoc + 2, { truoc, sau: sau.soNgayTruongNghi });
  check('và cả hai đều vào số ngày ĐƯỢC HOÀN của bé này',
    sau.soNgayTruongNghiHoan === truocHoan + 2,
    { truoc: truocHoan, sau: sau.soNgayTruongNghiHoan });

  // LUẬT CUỐI TUẦN THÀNH MỘT PHÉP KIỂM RIÊNG, không còn là giả định ngầm.
  //
  // Thứ Bảy không có bữa nào ở trường, nên một đợt nghỉ rơi đúng Thứ Bảy KHÔNG
  // được cộng vào ngày hoàn — hoàn thì là trả tiền cho một bữa chưa từng nấu.
  await tao(QT, { ten: 'Nghỉ thử đúng cuối tuần', tuNgay: CUOI_TUAN, denNgay: CUOI_TUAN, loai: 'le' });
  const { be: sauCT } = await beCuaBang();
  check(`ĐỢT NGHỈ RƠI ĐÚNG CUỐI TUẦN (${CUOI_TUAN}) KHÔNG được tính là ngày trường nghỉ`,
    sauCT.soNgayTruongNghi === sau.soNgayTruongNghi,
    { truocCuoiTuan: sau.soNgayTruongNghi, sau: sauCT.soNgayTruongNghi });
  check('và cũng KHÔNG vào số ngày được hoàn — hoàn thì là trả tiền cho bữa chưa nấu',
    sauCT.soNgayTruongNghiHoan === sau.soNgayTruongNghiHoan,
    { truocCuoiTuan: sau.soNgayTruongNghiHoan, sau: sauCT.soNgayTruongNghiHoan });

  check('số ngày hoàn tiền ăn cộng đủ phần trường nghỉ',
    sauCT.soNgayHoanTienAn >= sauCT.soNgayTruongNghiHoan,
    { hoan: sauCT.soNgayHoanTienAn, nghiHoan: sauCT.soNgayTruongNghiHoan });
  check('bảng kể tên các đợt nghỉ của tháng, không chỉ một con số',
    (r.data?.dotTruongNghi || []).some(x => /giỗ Tổ/i.test(x.ten)), r.data?.dotTruongNghi);
}

// ===========================================================================
console.log('\n[8] Đợt nghỉ ghi "không hoàn tiền" thì KHÔNG cộng vào ngày hoàn');
{
  // Đo trên đợt nghỉ nằm trên MỘT NGÀY HỌC do bài này tự dựng, không đo trên
  // đợt "hôm nay": hôm nay rơi vào thứ mấy là do đồng hồ quyết định, và nếu nó
  // rơi vào Thứ Bảy thì phép trừ dưới đây chẳng đo được gì.
  const truocCa = (await beCuaBang()).be;
  const truoc = truocCa.soNgayHoanTienAn;
  const d = (await ds(QT)).dot.find(x => x.ten === 'Nghỉ thử ngày học A');
  check('tìm được đợt nghỉ nằm trên một ngày học để đo', !!d, d);
  await req('PUT', `/api/leave/lich-nghi/${d.id}`, { cookie: QT, body: { hoanTienAn: 'khong' } });
  const { be: sau } = await beCuaBang();
  check('đổi sang "không hoàn" thì số ngày hoàn GIẢM đúng một ngày',
    sau.soNgayHoanTienAn === truoc - 1, { truoc, sau: sau.soNgayHoanTienAn });
  check('nhưng vẫn đếm là ngày trường nghỉ — trường vẫn nghỉ thật',
    sau.soNgayTruongNghi === truocCa.soNgayTruongNghi,
    { truoc: truocCa.soNgayTruongNghi, sau: sau.soNgayTruongNghi });
}

// ===========================================================================
console.log('\n[9] Bé VẪN TỚI TRƯỜNG đúng ngày trường nghỉ thì không hoàn tiền ngày ấy');
{
  // Bật lại hoàn tiền cho đợt hôm nay TRƯỚC, để hai lần đo dưới đây chỉ khác
  // nhau đúng một điều: bé s2 có tới trường hôm nay hay không.
  const d = (await ds(QT)).dot.find(x => x.ten === 'Nghỉ thử ngày học A');
  await req('PUT', `/api/leave/lich-nghi/${d.id}`, { cookie: QT, body: { hoanTienAn: 'co' } });

  // Đo bằng CHÊNH LỆCH của chính bé s2, không chốt cứng một con số: dữ liệu
  // mẫu đã chấm sẵn cho bé những ngày trước đó, và số ngày ấy không phải thứ
  // mục này đang canh.
  const doS2 = async () => (await req('GET', `/api/tienan/thang?thang=${NGAY.slice(0, 7)}`,
    { cookie: QT })).data?.danhSach?.find(x => x.studentId === 's2');

  const truoc = await doS2();
  check('đối chứng — bé s2 có ít nhất hai ngày trường nghỉ để mà trừ đi một',
    (truoc?.soNgayTruongNghiHoan || 0) >= 2, truoc?.soNgayTruongNghiHoan);

  // Bé s2 cùng nhóm Chồi 2. Ghi bé CÓ MẶT đúng NGÀY HỌC mà trường nghỉ — đúng
  // cảnh nhà không nghỉ được nên vẫn gửi con, hoặc văn phòng đặt lịch nghỉ lùi
  // lại sau khi sổ điểm danh đã ghi xong.
  //
  // Ghi thẳng vào sổ chứ không qua `/api/attendance/mark`: đường ấy CỐ Ý chỉ
  // ghi được trong chính ngày hôm đó (Đ127), mà ngày học ta cần đo thì không
  // phải hôm nay. Cùng cách mục [6] đã dùng.
  {
    const conn = new Database(path.join(DIR, 'school.db'));
    // Không cần DELETE nữa — nền ở trên đã xoá sạch hai ngày này của s2.
    conn.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                  VALUES (?, 's2', ?, 'present', NULL, NULL, '', 'u_test')`)
      .run(`att_hoc_${HOC_A}`, HOC_A);
    conn.close();
  }
  const kt = await req('GET', `/api/attendance?studentId=s2`, { cookie: QT });
  check('đối chứng — sổ đã ghi bé s2 CÓ MẶT đúng ngày học ấy',
    (kt.data || []).some(x => x.date === HOC_A && x.status === 'present'), HOC_A);

  const sau = await doS2();
  check('BÉ ĐÃ ĂN Ở TRƯỜNG HÔM NAY thì BỚT đúng một ngày được hoàn',
    sau.soNgayTruongNghiHoan === truoc.soNgayTruongNghiHoan - 1,
    { truoc: truoc.soNgayTruongNghiHoan, sau: sau.soNgayTruongNghiHoan });
  check('và số ngày hoàn tiền ăn của bé cũng bớt đúng một ngày',
    sau.soNgayHoanTienAn === truoc.soNgayHoanTienAn - 1,
    { truoc: truoc.soNgayHoanTienAn, sau: sau.soNgayHoanTienAn });
  check('nhưng TRƯỜNG vẫn nghỉ đủ số ngày ấy — bé đi học không làm trường mở cửa lại',
    sau.soNgayTruongNghi === truoc.soNgayTruongNghi,
    { truoc: truoc.soNgayTruongNghi, sau: sau.soNgayTruongNghi });

  const s1 = (await req('GET', `/api/tienan/thang?thang=${NGAY.slice(0, 7)}`, { cookie: QT }))
    .data?.danhSach?.find(x => x.studentId === 's1');
  check('bé s1 nghỉ ở nhà thì KHÔNG bị ảnh hưởng, vẫn được hoàn ĐỦ mọi ngày trường nghỉ',
    s1?.soNgayTruongNghiHoan === s1?.soNgayTruongNghi,
    { hoan: s1?.soNgayTruongNghiHoan, nghi: s1?.soNgayTruongNghi });
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Lịch nghỉ của trường');
