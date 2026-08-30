// Bài canh XIN NGHỈ HỌC — ai duyệt, và hoàn tiền ăn.
//
// Chạy bằng:  npm run test:nghi-hoc
//
// VÌ SAO CÓ BÀI NÀY
//
// Y2 đổi một thứ đã chạy: trước đây CÔ duyệt đơn nghỉ, nay VĂN PHÒNG duyệt.
// Nhà trường yêu cầu như vậy, và lý do rất thực tế — duyệt một đơn nghỉ ở mầm
// non kéo theo tiền ăn của tháng đó, mà tiền thì cô không cầm và không đối
// chiếu. Bắt cô quyết là bắt cô chịu trách nhiệm về thứ cô không nắm.
//
// Đổi quyền của một tính năng ĐANG CHẠY là việc dễ đi kèm hai kiểu hỏng, và
// bài này canh cả hai:
//
//   1. SIẾT HỤT. Chặn ở màn hình mà quên chặn ở đường API — cô không thấy nút
//      nữa nhưng gọi thẳng đường dẫn vẫn duyệt được. Mục [1] và [2].
//
//   2. SIẾT LẠM. Chặn luôn cả phần cô VẪN PHẢI CÓ: đọc đơn của nhóm mình để
//      biết hôm nào bé vắng. Cắt mất phần đó là cô mất một thứ đang dùng hằng
//      ngày, đúng thứ Nguyên tắc số 1 cấm. Mục [3].
//
// BA GIÁ TRỊ CỦA TIỀN ĂN
//
// "Có hoàn", "không hoàn", và "văn phòng chưa quyết" là ba chuyện khác nhau.
// Gộp hai cái sau vào một là gia đình đọc ra "trường không hoàn tiền" trong
// khi thật ra chưa ai xem tới đơn. Mục [5] canh chỗ đó.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nghi-hoc');
sinhDuLieu(DIR);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3982), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);      // văn phòng toàn hệ thống (Cấp 1)
const VP3 = await vao('quanlycs1', mk3);      // văn phòng cơ sở 1 (Cấp 3)
const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1
const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1

// Gửi một đơn mới, trả về id. Mỗi mục tự dựng đơn của mình để các mục không
// giẫm chân nhau khi chạy lại.
let dem = 0;
async function guiDon(tu, den, lyDo = 'Con bị sốt nhẹ, gia đình xin cho con ở nhà') {
  dem += 1;
  const r = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: tu, toDate: den, reason: `${lyDo} (${dem})` },
  });
  return r.data?.id;
}
async function donCuaVP(id) {
  const ds = (await req('GET', '/api/leave', { cookie: VP })).data || [];
  return ds.find(l => l.id === id);
}

// ===========================================================================
console.log('\n[1] CÔ KHÔNG DUYỆT ĐƠN NỮA — chặn ở đường API, không chỉ giấu nút');
{
  const id = await guiDon('2027-03-01', '2027-03-01');
  check('phụ huynh gửi được đơn', !!id, id);

  const co = await req('POST', `/api/leave/${id}/review`, {
    cookie: GV, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  check('cô gọi thẳng đường duyệt vẫn bị chặn', co.status === 403, co.status);
  check('và câu từ chối nói rõ ai duyệt, không phải "Không có quyền thực hiện"',
    /văn phòng/i.test(co.data?.error || ''), co.data?.error);

  const sau = await donCuaVP(id);
  check('bấm hụt không làm đơn đổi trạng thái', sau?.status === 'pending', sau?.status);

  // Chặn ở màn hình cũng phải có — nhưng chỉ chặn ở đó thì chưa đủ, nên nó
  // đứng sau chứ không thay cho hai dòng trên.
  const view = fs.readFileSync(path.join(GOC, 'public/js/views/leave.js'), 'utf8');
  check('màn hình chỉ hiện nút Duyệt cho văn phòng',
    /laVanPhong\(\)\s*\?/.test(view) && /role === 'admin'/.test(view));
}

// ===========================================================================
console.log('\n[2] Phụ huynh cũng không tự duyệt đơn của mình');
{
  const id = await guiDon('2027-03-02', '2027-03-02');
  const r = await req('POST', `/api/leave/${id}/review`, {
    cookie: PH, body: { status: 'approved', hoanTienAn: 'co' },
  });
  check('phụ huynh gọi đường duyệt bị chặn', r.status === 403, r.status);
}

// ===========================================================================
console.log('\n[3] Nhưng cô VẪN ĐỌC ĐƯỢC đơn của nhóm mình — siết quyền duyệt, không cắt quyền đọc');
{
  const id = await guiDon('2027-03-03', '2027-03-03', 'Con đi khám răng');
  const ds = (await req('GET', '/api/leave', { cookie: GV })).data || [];
  const thay = ds.find(l => l.id === id);
  check('cô thấy đơn mới trong danh sách của nhóm mình', !!thay, ds.length);
  check('kèm đủ khoảng ngày để cô biết hôm nào bé vắng',
    thay?.fromDate === '2027-03-03' && thay?.toDate === '2027-03-03', thay);
  check('và kèm lý do', /khám răng/.test(thay?.reason || ''), thay?.reason);
}

// ===========================================================================
console.log('\n[4] Văn phòng duyệt thì PHẢI chốt luôn tiền ăn');
{
  const id = await guiDon('2027-03-08', '2027-03-08');

  const thieu = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved' },
  });
  check('duyệt mà không nói gì về tiền ăn thì bị từ chối', thieu.status === 400, thieu.status);
  check('báo lỗi nói rõ thiếu gì', /tiền ăn/i.test(thieu.data?.error || ''), thieu.data?.error);

  const bay = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co-le' },
  });
  check('giá trị lạ cũng bị từ chối', bay.status === 400, bay.status);

  const sau = await donCuaVP(id);
  check('sau hai lần bấm hụt, đơn VẪN ở trạng thái chờ — không nửa vời',
    sau?.status === 'pending' && sau?.hoanTien === null, { s: sau?.status, h: sau?.hoanTien });

  const ok = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 1, ghiChuHoan: 'Đã báo bếp cắt suất' },
  });
  check('nói rõ tiền ăn thì duyệt được', ok.status === 200, ok.data?.error);
  check('trả về luôn phần tiền ăn để màn hình khỏi gọi lại',
    ok.data?.hoanTien?.hoanTienAn === 'co' && ok.data?.hoanTien?.soNgay === 1, ok.data?.hoanTien);
  check('và ghi chú nội bộ được giữ', /cắt suất/.test(ok.data?.hoanTien?.ghiChu || ''), ok.data?.hoanTien);
}

// ===========================================================================
console.log('\n[5] BA GIÁ TRỊ: có hoàn / không hoàn / văn phòng chưa quyết');
{
  const choDuyet = await guiDon('2027-03-09', '2027-03-09');
  const a = await donCuaVP(choDuyet);
  check('đơn chưa duyệt: phần tiền ăn là RỖNG, không phải "không hoàn"',
    a?.hoanTien === null, a?.hoanTien);

  const khong = await guiDon('2027-03-10', '2027-03-10');
  await req('POST', `/api/leave/${khong}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  const b = await donCuaVP(khong);
  check('đã quyết KHÔNG hoàn: có hàng, ghi rõ "khong"',
    b?.hoanTien?.hoanTienAn === 'khong', b?.hoanTien);
  check('và không kèm số ngày — không hoàn thì không có ngày nào',
    b?.hoanTien?.soNgay === null, b?.hoanTien);

  const tuChoi = await guiDon('2027-03-11', '2027-03-11');
  await req('POST', `/api/leave/${tuChoi}/review`, { cookie: VP, body: { status: 'rejected' } });
  const c = await donCuaVP(tuChoi);
  check('đơn bị TỪ CHỐI không cần nói gì về tiền ăn — bé vẫn đi học',
    c?.status === 'rejected' && c?.hoanTien === null, { s: c?.status, h: c?.hoanTien });
}

// ===========================================================================
console.log('\n[6] Số ngày hoàn: gợi ý sẵn, nhưng văn phòng vẫn là người chốt');
{
  // 2027-03-15 là thứ Hai. Đơn thứ Hai → Chủ nhật là 7 ngày dương lịch, trong
  // đó 5 ngày rơi vào thứ Hai–thứ Sáu.
  const id = await guiDon('2027-03-15', '2027-03-21');
  const truoc = await donCuaVP(id);
  check('máy chủ nói đơn dài mấy ngày', truoc?.soNgayTrongDon === 7, truoc?.soNgayTrongDon);
  check('và gợi ý số ngày đi học trong đơn (thứ Hai–thứ Sáu)',
    truoc?.soNgayHocDeXuat === 5, truoc?.soNgayHocDeXuat);

  const qua = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 8 },
  });
  check('hoàn nhiều ngày hơn đơn xin nghỉ thì bị từ chối', qua.status === 400, qua.status);

  const le = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 2.5 },
  });
  check('số lẻ cũng bị từ chối', le.status === 400, le.status);

  // GỢI Ý CHỈ LÀ GỢI Ý. Nghỉ lễ, ngày trường có việc riêng, hay tuần trường mở
  // cửa thứ Bảy thì app không biết — văn phòng sửa lại được, và con số văn
  // phòng gõ mới là con số được lưu.
  const ok = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 6 },
  });
  check('văn phòng gõ khác con số gợi ý thì app nghe theo văn phòng',
    ok.status === 200 && ok.data?.hoanTien?.soNgay === 6, ok.data?.hoanTien);
}

// ===========================================================================
console.log('\n[7] Bỏ trống số ngày thì lấy con số gợi ý — bấm một nhát là xong');
{
  const id = await guiDon('2027-03-22', '2027-03-26');   // thứ Hai đến thứ Sáu
  const r = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co' },
  });
  check('duyệt được mà không phải gõ số ngày', r.status === 200, r.data?.error);
  check('và số ngày lưu xuống đúng bằng con số gợi ý',
    r.data?.hoanTien?.soNgay === 5, r.data?.hoanTien);
}

// ===========================================================================
console.log('\n[8] Duyệt hai lần không được, và duyệt hụt không để lại nửa bản ghi');
{
  const id = await guiDon('2027-03-29', '2027-03-29');
  await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 1 },
  });
  const lai = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'rejected' },
  });
  check('đơn đã xử lý thì không duyệt lại được', lai.status === 400, lai.status);
  const sau = await donCuaVP(id);
  check('và phần tiền ăn của lần duyệt đầu còn nguyên',
    sau?.status === 'approved' && sau?.hoanTien?.soNgay === 1, sau?.hoanTien);
}

// ===========================================================================
console.log('\n[9] Gia đình đọc được kết quả tiền ăn của chính con mình');
{
  const id = await guiDon('2027-04-05', '2027-04-06');
  await req('POST', `/api/leave/${id}/review`, {
    cookie: VP,
    body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 2, ghiChuHoan: 'Ghi chú nội bộ của văn phòng' },
  });
  const ds = (await req('GET', '/api/leave', { cookie: PH })).data || [];
  const don = ds.find(l => l.id === id);
  check('phụ huynh thấy đơn đã duyệt', don?.status === 'approved', don?.status);
  check('và thấy trường có hoàn tiền ăn mấy ngày',
    don?.hoanTien?.hoanTienAn === 'co' && don?.hoanTien?.soNgay === 2, don?.hoanTien);

  // Màn hình phải NÓI THÀNH CÂU, không bắt gia đình đọc mã 'co' / 'khong'.
  const view = fs.readFileSync(path.join(GOC, 'public/js/views/leave.js'), 'utf8');
  check('màn hình đổi mã thành câu tiếng Việt', /Hoàn tiền ăn|Không hoàn tiền ăn/.test(view));
  check('và có câu riêng cho trường hợp văn phòng CHƯA ghi',
    /chưa ghi phần tiền ăn/.test(view));
}

// ===========================================================================
console.log('\n[10] Tầng cơ sở: văn phòng cơ sở 1 không duyệt đơn của cơ sở 2');
{
  // Chuyển nhóm c1 (bé s1) sang cơ sở 2, rồi thử bằng tài khoản Cấp 3 của cơ sở 1.
  const id = await guiDon('2027-04-12', '2027-04-12');
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs2' } });

  const r = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP3, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  check('quản lý cơ sở 1 KHÔNG duyệt được đơn của bé cơ sở 2', r.status === 403, r.status);

  const ds = (await req('GET', '/api/leave', { cookie: VP3 })).data || [];
  check('và cũng không thấy đơn đó trong danh sách của mình',
    !ds.some(l => l.id === id), ds.length);

  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs1' } });
  const lai = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP3, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  check('trả nhóm về cơ sở 1 thì quản lý cơ sở 1 duyệt được', lai.status === 200, lai.data?.error);
}

// ===========================================================================
console.log('\n[11] Lược đồ: bảng tiền ăn là bảng RIÊNG, không đụng bảng đơn nghỉ');
{
  // Nền này dùng chung với app 1 đang chạy thật. Thêm cột vào `leave_requests`
  // là một câu ALTER trên bảng đang có dữ liệu — thứ lược đồ lõi cấm.
  const sql = fs.readFileSync(path.join(GOC, 'lib/schema.sql'), 'utf8');
  check('có bảng leave_refund riêng', /CREATE TABLE IF NOT EXISTS leave_refund/.test(sql));
  check('lược đồ lõi vẫn không có câu ALTER TABLE nào chạy thật',
    !sql.split('\n').some(d => /^\s*ALTER\s+TABLE/i.test(d)));
  check('bảng đơn nghỉ giữ nguyên các cột cũ',
    /leave_requests[\s\S]*?reviewNote\s+TEXT/.test(sql));

  // Xoá đơn thì phần tiền ăn đi theo, không để lại hàng mồ côi.
  check('khoá ngoại có ON DELETE CASCADE',
    /leave_refund[\s\S]*?REFERENCES leave_requests\(id\) ON DELETE CASCADE/.test(sql));
}

// ===========================================================================
console.log('\n[+] TRẦN KHOẢNG NGÀY — gõ nhầm năm không được cắt suất ăn của bé cả năm');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Đơn xin nghỉ chỉ kiểm dạng ngày và thứ tự hai ngày, không kiểm ĐỘ DÀI. Mà
  // đơn đã duyệt kéo theo hai thứ có thật ngoài đời: bé bị đánh dấu nghỉ suốt
  // khoảng đó ở màn Điểm danh, và màn Báo ăn gợi ý cho văn phòng HOÀN TIỀN ĂN
  // đúng số ngày ấy. Gõ nhầm một chữ số ở ô năm là hơn hai trăm ngày.
  const homNay = new Date().toISOString().slice(0, 10);
  const namSau = `${Number(homNay.slice(0, 4)) + 1}${homNay.slice(4)}`;

  const quaDai = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: homNay, toDate: namSau, reason: 'Gõ nhầm năm' },
  });
  check('đơn nghỉ dài cả năm bị TỪ CHỐI', quaDai.status === 400, `${quaDai.status} ${quaDai.data?.error || ''}`);
  check('và lời từ chối chỉ đúng chỗ gia đình cần xem lại',
    /năm ở hai ô ngày|kiểm lại năm/i.test(quaDai.data?.error || ''), quaDai.data);

  // VẾ KHẲNG ĐỊNH: một đợt nghỉ dài THẬT vẫn phải gửi được, nếu không là siết
  // quá tay và bài này sẽ xanh cả khi app từ chối mọi đơn.
  const d = new Date(`${homNay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  const motThang = d.toISOString().slice(0, 10);
  const daiThat = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: homNay, toDate: motThang, reason: 'Bé mổ ruột thừa, nghỉ một tháng' },
  });
  check('nghỉ một tháng — vẫn gửi được bình thường',
    daiThat.status === 200 || daiThat.status === 201,
    `${daiThat.status} ${daiThat.data?.error || ''}`);

  const motNgay = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: homNay, toDate: homNay, reason: 'Bé sốt nhẹ' },
  });
  check('nghỉ một ngày — vẫn gửi được bình thường',
    motNgay.status === 200 || motNgay.status === 201, motNgay.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
