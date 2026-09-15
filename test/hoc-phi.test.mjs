// Bài canh PHÂN HỆ HỌC PHÍ.
//
// Chạy bằng:  npm run test:hoc-phi
//
// VÌ SAO ĐẾN GIỜ MỚI CÓ
//
// Học phí là phân hệ mang nguyên từ app 1 sang, và cho tới đợt này nó là phân
// hệ DUY NHẤT không có tệp kiểm thử riêng — bảy phân hệ mầm non đều có. Nó chỉ
// xuất hiện trong `test/tinh-nang.test.mjs` với vai "ví dụ về một tính năng cắm
// thêm", tức chỗ đó canh CƠ CHẾ CẮM THÊM chứ không canh sổ tiền.
//
// ĐÂY LÀ PHÂN HỆ DUY NHẤT GHI SỔ TIỀN CỦA GIA ĐÌNH
//
// Hỏng ở đây không giống hỏng ở chỗ khác. Ghi nhầm một quan sát thì sửa lại là
// xong; ghi nhầm một khoản thu là trường đòi tiền nhà không nợ, hoặc ghi "đã
// nộp" cho nhà chưa nộp. Cả hai đều là chuyện gia đình nhớ rất lâu.
//
// Bài này canh ba việc:
//
//   1. AI ĐƯỢC GHI SỔ TIỀN. Từ đợt Đ42, chỉ văn phòng — không phải cô. Tầng
//      chức vụ đã đặt Kế toán lo học phí và tiền ăn, và đợt Y3 tách rõ "cô
//      chốt suất, kế toán đối chiếu".
//   2. AI ĐỌC ĐƯỢC SỔ TIỀN CỦA NHÀ NÀO. Ranh giới nhà mình ↔ nhà khác, và
//      ranh giới cơ sở.
//   3. MÀN HÌNH KHÔNG ĐƯỢC BÀY NÚT MÀ MÁY CHỦ SẼ TỪ CHỐI.
import fs from 'fs';
import path from 'path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hoc-phi');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi']);

const mkVP = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkKT = taoQuanTri(DIR, 'Kế Toán', 'ketoan');
const mkNS = taoQuanTri(DIR, 'Nhân Sự', 'nhansu');
const mkCS1 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
datChucVu(DIR, 'ketoan', 'ketoan');
datChucVu(DIR, 'nhansu', 'nhansu');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3312), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mkVP);
const KT = await vao('ketoan', mkKT);
const NS = await vao('nhansu', mkNS);
const CS1 = await vao('quanlycs1', mkCS1);
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1, có bé s1
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1 và s2

const khoanMoi = (studentId, noiDung, soTien = 500000) => ({
  studentId, kyThu: 'Tháng 9/2026', noiDung, soTien, hanNop: '2026-09-10',
});

// ===========================================================================
console.log('\n[1] GHI SỔ TIỀN LÀ VIỆC CỦA VĂN PHÒNG, KHÔNG PHẢI CỦA CÔ');
{
  const co = await req('POST', '/api/hocphi', { cookie: GV, body: khoanMoi('s1', 'Cô tự tạo') });
  check('CÔ KHÔNG TẠO ĐƯỢC KHOẢN THU — dù là bé nhóm mình', co.status === 403, co.status);

  const ph = await req('POST', '/api/hocphi', { cookie: PH, body: khoanMoi('s1', 'Nhà tự tạo') });
  check('gia đình cũng không tạo được', ph.status === 403, ph.status);

  const vp = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s1', 'Tiền ăn tháng 9') });
  check('VĂN PHÒNG TẠO ĐƯỢC', vp.status === 201, vp.data);
  check('và khoản mới mặc định là CHƯA NỘP', vp.data?.daNop === false, vp.data?.daNop);

  const coXn = await req('POST', `/api/hocphi/${vp.data.id}/xac-nhan`, { cookie: GV, body: {} });
  check('CÔ KHÔNG XÁC NHẬN ĐƯỢC "đã nhận tiền"', coXn.status === 403, coXn.status);

  // Và lời từ chối không được đổ cho bé — cô bị chặn vì vai, không vì bé.
  check('lời từ chối nói bằng tiếng người, không lộ thuật ngữ',
    typeof coXn.data?.error === 'string' && coXn.data.error.length > 10
    && !/role|forbidden|admin/i.test(coXn.data.error), coXn.data?.error);

  const vpXn = await req('POST', `/api/hocphi/${vp.data.id}/xac-nhan`, { cookie: VP, body: {} });
  check('VĂN PHÒNG XÁC NHẬN ĐƯỢC', vpXn.status === 200, vpXn.data);

  const lai = await req('POST', `/api/hocphi/${vp.data.id}/xac-nhan`, { cookie: VP, body: {} });
  check('xác nhận lần hai bị chặn, không cộng dồn', lai.status === 400, lai.status);
}

// ===========================================================================
console.log('\n[2] CÔ VẪN ĐỌC ĐƯỢC SỔ TIỀN CỦA NHÓM MÌNH — siết ghi, không siết đọc');
{
  // Cắt đường ghi mà cắt luôn đường đọc là cô không trả lời được câu hỏi
  // "nhà em đã nộp chưa cô" ở cổng trường, và gia đình phải gọi lên văn phòng.
  const doc = await req('GET', '/api/hocphi?studentId=s1', { cookie: GV });
  check('cô mở được sổ tiền của bé nhóm mình', doc.status === 200, doc.status);
  check('và thấy khoản văn phòng vừa ghi', (doc.data?.khoan || []).some(k => k.noiDung === 'Tiền ăn tháng 9'),
    (doc.data?.khoan || []).map(k => k.noiDung));

  const nhomKhac = await req('GET', '/api/hocphi?studentId=s1', { cookie: GV2 });
  check('cô nhóm khác KHÔNG mở được', nhomKhac.status === 403, nhomKhac.status);

  const nhaMinh = await req('GET', '/api/hocphi?studentId=s1', { cookie: PH });
  check('gia đình mở được sổ của con mình', nhaMinh.status === 200, nhaMinh.status);
  check('và số tiền đã nộp được trừ đúng', nhaMinh.data?.tongChuaNop === 0, nhaMinh.data?.tongChuaNop);

  const nhaKhac = await req('GET', '/api/hocphi?studentId=s3', { cookie: PH });
  check('gia đình KHÔNG mở được sổ nhà khác', nhaKhac.status === 403, nhaKhac.status);
}

// ===========================================================================
console.log('\n[3] TẦNG CHỨC VỤ — người lo tiền vào được, người khác thì không');
{
  const kt = await req('POST', '/api/hocphi', { cookie: KT, body: khoanMoi('s1', 'Kế toán ghi', 300000) });
  check('KẾ TOÁN ghi được sổ tiền — đúng phần việc của chức vụ này',
    kt.status === 201, kt.data);

  const ns = await req('POST', '/api/hocphi', { cookie: NS, body: khoanMoi('s1', 'Nhân sự ghi') });
  check('NHÂN SỰ không ghi được — tiền không thuộc phần việc', ns.status === 403, ns.status);
  const nsDoc = await req('GET', '/api/hocphi?studentId=s1', { cookie: NS });
  check('và cũng không đọc được sổ tiền', nsDoc.status === 403, nsDoc.status);

  const ktXn = await req('POST', `/api/hocphi/${kt.data.id}/xac-nhan`, { cookie: KT, body: {} });
  check('kế toán xác nhận được đã nhận tiền', ktXn.status === 200, ktXn.data);
}

// ===========================================================================
console.log('\n[4] TẦNG CƠ SỞ — Cấp 3 không ghi sổ tiền cho bé cơ sở khác');
{
  // Dữ liệu mẫu để nhóm Mầm 1 (c3, cơ sở 2) KHÔNG có bé nào — nó tồn tại để
  // phép thử "cơ sở A không thấy cơ sở B" có chỗ đứng. Nên phải tự chuyển một
  // bé sang đó, bằng đúng đường văn phòng dùng, rồi mới đo được.
  const chuyen = await req('PUT', '/api/admin/students/s5', { cookie: VP, body: { classId: 'c3' } });
  check('chuyển được một bé sang nhóm của cơ sở 2 để dựng tình huống',
    chuyen.status === 200, `${chuyen.status} ${JSON.stringify(chuyen.data)}`);

  // Vế khẳng định TRƯỚC: chứng minh bé đó có thật và văn phòng Cấp 1 ghi được
  // sổ tiền cho bé. Thiếu vế này thì phép kiểm dưới xanh cả khi mã bị hỏng tới
  // mức không ai ghi được cho ai.
  const cap1 = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s5', 'Cấp 1 ghi cho bé cơ sở 2') });
  check('văn phòng Cấp 1 ghi được sổ tiền cho bé cơ sở 2', cap1.status === 201, cap1.data);

  const lan = await req('POST', '/api/hocphi', { cookie: CS1, body: khoanMoi('s5', 'Cấp 3 ghi lấn') });
  check('QUẢN LÝ CƠ SỞ 1 KHÔNG GHI ĐƯỢC SỔ TIỀN CHO BÉ CƠ SỞ 2',
    lan.status === 403 || lan.status === 404, `${lan.status} ${JSON.stringify(lan.data)}`);

  const docLan = await req('GET', '/api/hocphi?studentId=s5', { cookie: CS1 });
  check('và cũng không ĐỌC được sổ tiền của bé đó',
    docLan.status === 403 || docLan.status === 404, docLan.status);

  // Chiều cho phép: bé của chính cơ sở mình thì ghi được. Thiếu vế này thì
  // phép kiểm trên xanh cả khi tầng cơ sở chặn nhầm tất cả mọi người.
  const trongPhamVi = await req('POST', '/api/hocphi', { cookie: CS1, body: khoanMoi('s1', 'Cấp 3 ghi đúng cơ sở') });
  check('nhưng bé của chính cơ sở mình thì ghi được bình thường',
    trongPhamVi.status === 201, `${trongPhamVi.status} ${JSON.stringify(trongPhamVi.data)}`);
}

// ===========================================================================
console.log('\n[5] SỐ TIỀN PHẢI LÀ SỐ TIỀN');
{
  const am = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s1', 'Số âm', -1000) });
  check('số tiền âm bị từ chối', am.status === 400, am.status);
  const khong = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s1', 'Số không', 0) });
  check('số tiền bằng 0 bị từ chối', khong.status === 400, khong.status);
  const chu = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s1', 'Không phải số', 'nhiều lắm') });
  check('chữ thay cho số bị từ chối', chu.status === 400, chu.status);

  const thieu = await req('POST', '/api/hocphi', { cookie: VP, body: { studentId: 's1', soTien: 1000 } });
  check('thiếu kỳ thu và nội dung thì bị từ chối', thieu.status === 400, thieu.status);

  const le = await req('POST', '/api/hocphi', { cookie: VP, body: khoanMoi('s1', 'Số lẻ', 500000.7) });
  check('số lẻ được làm tròn về đồng, không lưu số thập phân',
    le.status === 201 && Number.isInteger(le.data?.soTien), le.data?.soTien);
}

// ===========================================================================
console.log('\n[6] MÁY CHỦ KHÔNG CÒN ĐƯỜNG GHI NÀO MỞ CHO VAI CÔ');
{
  // ĐÂY LÀ PHÉP KIỂM TRÊN MÃ NGUỒN, VÀ NÓ CHỈ CANH ĐƯỢC MÁY CHỦ.
  //
  // Bản đầu của mục này còn dò cả `modules/hocphi/view.js` bằng biểu thức để
  // xem nút "Tạo khoản" có bị khoá theo vai không. Phép thử ngược cho thấy nó
  // VÔ DỤNG: đổi `laVanPhong` thành "ai cũng là văn phòng" thì mã vẫn khớp mẫu
  // và bài vẫn xanh. Dò hình dạng của mã không phải là đo hành vi của màn hình.
  //
  // Phép kiểm thật cho màn hình nằm ở `test/bien-soan-phan-he.test.mjs` mục
  // [8]: đăng nhập bằng tài khoản cô trên trình duyệt thật rồi ĐẾM nút.
  // Đếm trên MÃ, không đếm trên chú thích: chú thích của phân hệ có nhắc lại
  // `requireRole('admin')` để giải thích chốt chặn, và đếm cả nó thì bản kiểm
  // kê lệch đúng một mà không ai hiểu vì sao.
  const routesTho = fs.readFileSync(path.join(GOC, 'modules', 'hocphi', 'routes.js'), 'utf8');
  const routes = routesTho.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
  // BẢN KIỂM KÊ, cập nhật ở Đ163 (4 → 6) rồi ở Đ169 (6 → 10).
  //
  // Bốn đường cũ: tạo khoản, xác nhận đã nộp, thu hồi khoản tạo nhầm, huỷ xác
  // nhận nhầm (hai đường sau thêm ở Đ118 — sửa sổ tiền càng phải là việc của
  // văn phòng). Đ163 thêm hai: ghi sổ hàng loạt cho cả nhóm, và bảng sổ tiền
  // nhìn nhiều bé. Đ169 thêm bốn đường ưu đãi: xem của một bé, đặt, gỡ, và
  // bảng theo dõi. Mọi đường đều đòi vai, và bốn đường QUYẾT ĐỊNH VỀ TIỀN (ghi
  // sổ một bé, ghi sổ hàng loạt, đặt ưu đãi, gỡ ưu đãi) còn đòi thêm
  // `db.taoKhoanThuDuoc`.
  //
  // CHỖ YẾU CỦA CHÍNH PHÉP ĐẾM NÀY, ghi lại để người sau biết: đếm số lần
  // `requireRole` xuất hiện thì chỉ đỏ khi ai đó thêm một đường CÓ chốt chặn —
  // tức đúng trường hợp vô hại. Thêm một đường ghi QUÊN chốt chặn thì con số
  // không đổi và bài này vẫn xanh, mà đó mới là trường hợp nguy hiểm. Phép
  // kiểm đúng chiều nằm ở `test/hoc-phi-ghi-so.test.mjs` mục [8]: nó soi TỪNG
  // đường ghi trong tệp và đòi mỗi đường phải có chốt chặn, kèm phép thử ngược.
  // Đ199 thêm đường thứ MƯỜI MỘT: chạy tay bộ quét hạn nộp
  // (`POST /api/hocphi/quet-han-nop`), cũng đòi vai và còn đòi thêm
  // `db.taoKhoanThuDuoc`. Con số ở đây là một cái bẫy chuông — nó kêu khi có
  // người thêm đường mới, đúng như nó vừa kêu — nên chỉnh lại con số thì phải
  // kèm lý do, không chỉnh lặng lẽ.
  check('cả MƯỜI MỘT đường của phân hệ đều đòi vai văn phòng',
    (routes.match(/requireRole\('admin'\)/g) || []).length === 11,
    (routes.match(/requireRole\([^)]*\)/g) || []));
  check('KHÔNG còn đường ghi nào mở cho vai cô',
    !/requireRole\('teacher'/.test(routes));
}

// ===========================================================================
console.log('\n[7] TẮT PHÂN HỆ THÌ SỔ TIỀN KHÔNG MẤT');
{
  const truoc = (await req('GET', '/api/hocphi?studentId=s1', { cookie: VP })).data?.khoan?.length || 0;
  check('trước khi tắt có sẵn vài khoản để kiểm', truoc >= 2, truoc);

  const tat = await req('PUT', '/api/admin/modules/hocphi', { cookie: VP, body: { enabled: false } });
  check('tắt được phân hệ', tat.status === 200, tat.data);
  const khiTat = await req('GET', '/api/hocphi?studentId=s1', { cookie: VP });
  check('tắt rồi thì đường API đóng lại', khiTat.status === 404, khiTat.status);

  const bat = await req('PUT', '/api/admin/modules/hocphi', { cookie: VP, body: { enabled: true } });
  check('bật lại được', bat.status === 200, bat.data);
  const sau = (await req('GET', '/api/hocphi?studentId=s1', { cookie: VP })).data?.khoan?.length || 0;
  check('BẬT LẠI THÌ SỔ TIỀN CÒN NGUYÊN — không mất một khoản nào',
    sau === truoc, `${truoc} → ${sau}`);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
