// Bài canh ĐÓN TRẢ BÉ.
//
// Chạy bằng:  npm run test:don-tra
//
// ĐÂY LÀ PHÂN HỆ AN TOÀN, KHÔNG PHẢI PHÂN HỆ TIỆN LỢI
//
// Sai ở đây là trao một đứa trẻ cho người không được phép. Nên bài này canh
// bốn ranh giới, và cả bốn đều là chuyện "ai được làm gì", không phải chuyện
// màn hình đẹp xấu:
//
//   1. CÔ KHÔNG THÊM ĐƯỢC NGƯỜI ĐƯỢC ĐÓN. Danh sách ai được đón một đứa trẻ
//      là quyết định của GIA ĐÌNH, văn phòng ghi hộ. Một phân hệ cho phép cô
//      tự thêm tên thì chỉ cần MỘT tài khoản cô lộ mật khẩu là có đường hợp
//      thức hoá việc đón trẻ. Mục [2].
//
//   2. UỶ QUYỀN HẾT HẠN HAY ĐÃ HUỶ THÌ KHÔNG GHI SỔ ĐƯỢC BẰNG NÓ — nhưng vẫn
//      phải HIỆN RA cho cô thấy. Lặng lẽ biến mất là lúc người đó đứng ở cổng,
//      cô không thấy gì, rồi phải gọi điện giữa lúc đang trả 20 bé. Mục [4].
//
//   3. SỔ CHÉP LẠI TÊN, không chỉ giữ khoá. Sang năm gia đình gỡ cô giúp việc
//      khỏi danh sách thì sổ tháng Chín vẫn phải nói đúng hôm đó ai đón bé.
//      Mục [5].
//
//   4. ẢNH ĐI QUA CANH QUYỀN. Ảnh khuôn mặt một người trưởng thành gắn với một
//      đứa trẻ cụ thể — biết ai đón bé nào cũng là thông tin về đứa trẻ đó.
//      Mục [7].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY as homNayVN } from './_chung.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('don-tra');
sinhDuLieu(DIR);
batPhanHe(DIR, ['dontra']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4010), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);
const VP3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;     // cô nhóm c1, có bé s1
const GV2 = (await login('giaovien2', '123456')).cookie;   // cô nhóm khác
// Cô Bích Ngọc (t3) phụ trách CẢ c1 lẫn c2 — dữ liệu mẫu dựng sẵn tình huống
// NHIỀU CÔ MỘT NHÓM, thay đổi nền lớn nhất của app 2.
const GV3 = (await login('giaovien3', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;     // mẹ bé s1
const PH2 = (await login('phuhuynh2', '123456')).cookie;   // phụ huynh nhà khác

// Hỏi chung một chỗ với máy chủ (lib/ngay.js), không tự tính bằng giờ UTC —
// xem chú thích ở test/_chung.mjs. Tự tính là bài test đỏ vào buổi tối.
const HOM_NAY = homNayVN();
const dich = (n) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Ảnh PNG 1×1 thật — `lib/uploads` nhận dạng loại ảnh bằng BYTE ĐẦU TỆP chứ
// không tin phần khai báo của trình duyệt, nên chuỗi giả sẽ bị từ chối.
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const hoSo = async (cookie = PH, studentId = 's1') =>
  (await req('GET', `/api/dontra?studentId=${studentId}`, { cookie })).data;

async function beTrenManCong(studentId = 's1', cookie = GV, ngay = HOM_NAY) {
  const r = await req('GET', `/api/dontra/nhom?classId=c1&ngay=${ngay}`, { cookie });
  return (r.data?.danhSach || []).find(x => x.studentId === studentId);
}

// ===========================================================================
console.log('\n[1] Gia đình khai người được đón, kèm ảnh');
{
  const r = await req('POST', '/api/dontra/nguoi', {
    cookie: PH,
    body: { studentId: 's1', hoTen: 'Nguyễn Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0912345678', anh: ANH },
  });
  check('gia đình thêm được', r.status === 201, r.data);
  check('lưu đủ tên và quan hệ', r.data?.hoTen === 'Nguyễn Thị Lan' && r.data?.quanHe === 'Bà ngoại', r.data);
  check('có ảnh đi kèm', /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(r.data?.anh || ''), r.data?.anh);
  check('mặc định là đang dùng', r.data?.dangDung === true, r.data?.dangDung);

  const d = await hoSo();
  check('hồ sơ của bé có người vừa khai', (d.nguoiThuongXuyen || []).some(n => n.id === r.data.id));
  check('và gia đình được phép sửa', d.duocSua === true, d.duocSua);

  const thieuTen = await req('POST', '/api/dontra/nguoi', {
    cookie: PH, body: { studentId: 's1', hoTen: '   ' },
  });
  check('thiếu họ tên thì từ chối', thieuTen.status === 400, thieuTen.status);

  const anhGia = await req('POST', '/api/dontra/nguoi', {
    cookie: PH, body: { studentId: 's1', hoTen: 'Ảnh giả', anh: 'data:image/png;base64,bm90LWFuLWltYWdl' },
  });
  check('tệp không phải ảnh thật thì từ chối', anhGia.status === 400, anhGia.data?.error);
}

// ===========================================================================
console.log('\n[2] RANH GIỚI QUAN TRỌNG NHẤT — cô KHÔNG thêm được người được đón');
{
  const co = await req('POST', '/api/dontra/nguoi', {
    cookie: GV, body: { studentId: 's1', hoTen: 'Người cô tự thêm' },
  });
  check('cô KHÔNG thêm được người được đón', co.status === 403, co.status);
  check('và câu từ chối nói rõ việc đó thuộc về ai',
    /gia đình/i.test(co.data?.error || '') && /văn phòng/i.test(co.data?.error || ''), co.data?.error);
  check('cũng chỉ luôn phần việc của cô, không chỉ nói không',
    /đối chiếu|ghi lại/i.test(co.data?.error || ''), co.data?.error);

  const coUy = await req('POST', '/api/dontra/uyquyen', {
    cookie: GV, body: { studentId: 's1', hoTen: 'Cô tự uỷ quyền', tuNgay: HOM_NAY, denNgay: HOM_NAY },
  });
  check('cô cũng KHÔNG tự tạo uỷ quyền được', coUy.status === 403, coUy.status);

  const d = await hoSo(GV);
  check('nhưng cô ĐỌC được hồ sơ để đối chiếu ở cổng',
    (d.nguoiThuongXuyen || []).length > 0, d.nguoiThuongXuyen?.length);
  check('và màn hình biết là cô không được sửa', d.duocSua === false, d.duocSua);

  // Văn phòng thì ghi hộ được — gia đình tới trường khai, văn phòng nhập.
  const vp = await req('POST', '/api/dontra/nguoi', {
    cookie: VP, body: { studentId: 's1', hoTen: 'Ông nội', quanHe: 'Ông nội' },
  });
  check('văn phòng ghi hộ được', vp.status === 201, vp.data);
}

// ===========================================================================
console.log('\n[3] Phụ huynh chỉ thao tác trên con MÌNH');
{
  const nhaKhac = await req('POST', '/api/dontra/nguoi', {
    cookie: PH2, body: { studentId: 's1', hoTen: 'Người lạ' },
  });
  check('phụ huynh nhà khác KHÔNG thêm được vào hồ sơ bé này', nhaKhac.status === 403, nhaKhac.status);

  const doc = await req('GET', '/api/dontra?studentId=s1', { cookie: PH2 });
  check('và cũng KHÔNG đọc được hồ sơ đón trả của bé đó', doc.status === 403, doc.status);

  const coNhomKhac = await req('GET', '/api/dontra?studentId=s1', { cookie: GV2 });
  check('cô nhóm khác cũng không đọc được', coNhomKhac.status === 403, coNhomKhac.status);
}

// ===========================================================================
console.log('\n[4] Uỷ quyền một lần: ba trạng thái, và cả ba đều PHẢI NÓI RA');
{
  const conHan = await req('POST', '/api/dontra/uyquyen', {
    cookie: PH,
    body: {
      studentId: 's1', hoTen: 'Trần Văn Nam', quanHe: 'Bác hàng xóm',
      tuNgay: HOM_NAY, denNgay: HOM_NAY, lyDo: 'Bố mẹ đi công tác', anh: ANH,
    },
  });
  check('gia đình tạo được uỷ quyền hôm nay', conHan.status === 201, conHan.data);
  check('và nó còn hiệu lực', conHan.data?.trangThai === 'con-hieu-luc', conHan.data?.trangThai);

  const be = await beTrenManCong();
  check('màn cổng của cô hiện uỷ quyền hôm nay',
    (be.uyQuyenHomNay || []).some(u => u.id === conHan.data.id), be.uyQuyenHomNay);

  // Uỷ quyền của NGÀY MAI chưa được nằm ở mục "hôm nay".
  const ngayMai = await req('POST', '/api/dontra/uyquyen', {
    cookie: PH, body: { studentId: 's1', hoTen: 'Người của ngày mai', tuNgay: dich(1), denNgay: dich(1) },
  });
  check('uỷ quyền ngày mai tạo được', ngayMai.status === 201, ngayMai.data);
  check('nhưng chưa nằm ở mục "được đón hôm nay"',
    !(await beTrenManCong()).uyQuyenHomNay.some(u => u.id === ngayMai.data.id));
  check('và hôm sau thì nằm ở đó',
    (await beTrenManCong('s1', GV, dich(1))).uyQuyenHomNay.some(u => u.id === ngayMai.data.id));

  // Huỷ: KHÔNG xoá.
  const huy = await req('POST', `/api/dontra/uyquyen/${ngayMai.data.id}/huy`, { cookie: PH, body: {} });
  check('gia đình huỷ được', huy.status === 200 && huy.data?.trangThai === 'da-huy', huy.data);
  const sauHuy = (await hoSo()).uyQuyen || [];
  check('HUỶ CHỨ KHÔNG XOÁ — vẫn còn trong hồ sơ, kèm trạng thái',
    sauHuy.some(u => u.id === ngayMai.data.id && u.trangThai === 'da-huy'), sauHuy.map(u => u.trangThai));
  const lai = await req('POST', `/api/dontra/uyquyen/${ngayMai.data.id}/huy`, { cookie: PH, body: {} });
  check('huỷ hai lần thì báo đã huỷ rồi', lai.status === 400, lai.status);

  // Cái đã huỷ vẫn phải HIỆN RA ở màn cổng, ở mục riêng.
  const beSau = await beTrenManCong('s1', GV, dich(1));
  check('màn cổng vẫn NÊU RA uỷ quyền không còn hiệu lực, không lặng lẽ giấu đi',
    (beSau.uyQuyenKhongConHieuLuc || []).some(u => u.id === ngayMai.data.id),
    beSau.uyQuyenKhongConHieuLuc);
}

// ===========================================================================
console.log('\n[5] Sổ trả bé — CHÉP LẠI TÊN, không chỉ giữ khoá');
{
  const d = await hoSo();
  const ba = (d.nguoiThuongXuyen || []).find(n => n.hoTen === 'Nguyễn Thị Lan');

  const ph = await req('POST', '/api/dontra/ghi', {
    cookie: PH, body: { studentId: 's1', nguonLoai: 'thuong-xuyen', nguonId: ba.id },
  });
  check('phụ huynh KHÔNG tự ghi sổ trả bé — việc này của cô', ph.status === 403, ph.status);

  const r = await req('POST', '/api/dontra/ghi', {
    cookie: GV,
    body: { studentId: 's1', nguonLoai: 'thuong-xuyen', nguonId: ba.id, luc: '16:30', ghiChu: 'Có đối chiếu ảnh' },
  });
  check('cô ghi được', r.status === 200, r.data);
  check('tên người đón được điền sẵn từ hồ sơ', r.data?.nguoiDon === 'Nguyễn Thị Lan', r.data);
  check('ghi rõ cô nào ghi', !!r.data?.coGhiTen, r.data?.coGhiTen);

  // NGƯNG DÙNG người đó rồi thì sổ cũ vẫn phải nói đúng.
  await req('PUT', `/api/dontra/nguoi/${ba.id}`, { cookie: PH, body: { dangDung: false } });
  const sau = await hoSo();
  const dong = (sau.soGanDay || []).find(g => g.ngay === HOM_NAY);
  check('NGƯNG DÙNG NGƯỜI ĐÓ RỒI, SỔ CŨ VẪN NÓI ĐÚNG AI ĐÓN',
    dong?.nguoiDon === 'Nguyễn Thị Lan', dong);
  check('và người đó vẫn còn trong hồ sơ, chỉ là đã ngưng',
    (sau.nguoiThuongXuyen || []).some(n => n.id === ba.id && n.dangDung === false),
    sau.nguoiThuongXuyen?.map(n => [n.hoTen, n.dangDung]));
  check('màn cổng KHÔNG còn liệt kê người đã ngưng',
    !(await beTrenManCong()).nguoiThuongXuyen.some(n => n.id === ba.id),
    (await beTrenManCong()).nguoiThuongXuyen.map(n => n.hoTen));

  await req('PUT', `/api/dontra/nguoi/${ba.id}`, { cookie: PH, body: { dangDung: true } });
}

// ===========================================================================
console.log('\n[6] Một bé một ngày một dòng — ghi lại thì ĐÈ');
{
  await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', nguonLoai: 'khac', nguoiDon: 'Sửa lại: mẹ đón', luc: '17:00' },
  });
  const d = await hoSo();
  const cua = (d.soGanDay || []).filter(g => g.ngay === HOM_NAY);
  check('CHỈ MỘT dòng cho một ngày', cua.length === 1, cua.length);
  check('và là bản mới nhất', cua[0]?.nguoiDon === 'Sửa lại: mẹ đón', cua[0]);

  const tuongLai = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', ngay: dich(3), nguonLoai: 'khac', nguoiDon: 'Ai đó' },
  });
  check('không ghi sổ cho ngày chưa tới được', tuongLai.status === 400, tuongLai.status);

  const khongTen = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', nguonLoai: 'khac', nguoiDon: '  ' },
  });
  check('chọn "người khác" mà không ghi tên thì từ chối', khongTen.status === 400, khongTen.status);

  const gioSai = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', nguonLoai: 'khac', nguoiDon: 'Ai đó', luc: '25:99' },
  });
  check('giờ vô nghĩa bị từ chối', gioSai.status === 400, gioSai.status);
}

// ===========================================================================
console.log('\n[7] Uỷ quyền hết hiệu lực thì KHÔNG ghi sổ bằng nó được');
{
  const d = await hoSo();
  const daHuy = (d.uyQuyen || []).find(u => u.trangThai === 'da-huy');
  const r = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', ngay: HOM_NAY, nguonLoai: 'uy-quyen', nguonId: daHuy.id },
  });
  check('ghi sổ bằng uỷ quyền ĐÃ HUỶ thì bị chặn', r.status === 400, r.status);
  check('báo lỗi nói rõ vì sao', /huỷ/i.test(r.data?.error || ''), r.data?.error);
  check('VÀ CHỈ ĐƯỜNG RA: cô vẫn trả bé được, chỉ là phải ghi rõ tên',
    /Người khác/i.test(r.data?.error || ''), r.data?.error);

  const nhaKhac = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: 's1', nguonLoai: 'thuong-xuyen', nguonId: 'khong-co-that' },
  });
  check('gán một người không thuộc hồ sơ bé thì bị chặn', nhaKhac.status === 400, nhaKhac.status);
}

// ===========================================================================
console.log('\n[8] Ảnh đi qua CANH QUYỀN, không phục vụ tĩnh');
{
  const d = await hoSo();
  const coAnh = (d.nguoiThuongXuyen || []).find(n => n.anh);
  check('có một người kèm ảnh để thử', !!coAnh, d.nguoiThuongXuyen?.map(n => n.anh));

  const lay = async (cookie) => {
    const res = await fetch(`${sv.BASE}/api/dontra/anh/${coAnh.anh}`, { headers: cookie ? { cookie } : {} });
    return { status: res.status, kieu: res.headers.get('content-type') || '' };
  };

  const meBe = await lay(PH);
  check('mẹ của bé xem được ảnh', meBe.status === 200, meBe);
  check('và trả về đúng loại ảnh', /^image\//.test(meBe.kieu), meBe.kieu);
  check('cô của nhóm cũng xem được — cô cần ảnh để đối chiếu ở cổng',
    (await lay(GV)).status === 200);

  check('phụ huynh nhà khác KHÔNG xem được', (await lay(PH2)).status === 403);
  check('cô nhóm khác KHÔNG xem được', (await lay(GV2)).status === 403);
  check('người chưa đăng nhập KHÔNG xem được',
    [401, 403].includes((await lay(null)).status), (await lay(null)).status);

  // Tên tệp không thuộc về ai thì 404 — trước cả khi hỏi tệp có tồn tại
  // không, để không ai dò được thư mục ảnh bằng cách so hai loại lỗi.
  const la = await fetch(`${sv.BASE}/api/dontra/anh/${'a'.repeat(32)}.jpg`, { headers: { cookie: PH } });
  check('ảnh không thuộc hồ sơ nào thì 404', la.status === 404, la.status);
  const xau = await fetch(`${sv.BASE}/api/dontra/anh/..%2F..%2Fschool.db`, { headers: { cookie: PH } });
  check('đường dẫn có ../ không đi ra khỏi thư mục ảnh được',
    xau.status === 404 || xau.status === 400, xau.status);
}

// ===========================================================================
console.log('\n[9] Màn CỔNG là của cô và văn phòng — không phải của phụ huynh');
{
  // db.canAccessClass trả true cho phụ huynh với nhóm của con họ, và đúng như
  // vậy cho thông báo hay album. Nhưng màn này là danh sách người được đón của
  // HAI MƯƠI đứa trẻ khác, kèm ảnh và số điện thoại.
  const ph = await req('GET', '/api/dontra/nhom?classId=c1', { cookie: PH });
  check('phụ huynh KHÔNG mở được màn cổng', ph.status === 403, ph.status);

  const coKhac = await req('GET', '/api/dontra/nhom?classId=c1', { cookie: GV2 });
  check('cô nhóm khác cũng không', coKhac.status === 403, coKhac.status);

  const co = await req('GET', '/api/dontra/nhom?classId=c1', { cookie: GV });
  check('cô của nhóm thì mở được', co.status === 200, co.status);
  check('và đếm được đã trả bao nhiêu bé', typeof co.data?.tong?.soDaTra === 'number', co.data?.tong);
}

// ===========================================================================
console.log('\n[10] Trần để một tài khoản bị chiếm không bơm được dữ liệu rác');
{
  const qua = await req('POST', '/api/dontra/uyquyen', {
    cookie: PH, body: { studentId: 's1', hoTen: 'Uỷ quyền dài', tuNgay: HOM_NAY, denNgay: dich(60) },
  });
  check('uỷ quyền "một lần" mà dài 60 ngày thì từ chối', qua.status === 400, qua.status);
  check('và chỉ đường sang danh sách người đón thường xuyên',
    /thường xuyên/i.test(qua.data?.error || ''), qua.data?.error);

  const daQua = await req('POST', '/api/dontra/uyquyen', {
    cookie: PH, body: { studentId: 's1', hoTen: 'Uỷ quyền cũ', tuNgay: dich(-10), denNgay: dich(-5) },
  });
  check('uỷ quyền đã qua thì không tạo mới được', daQua.status === 400, daQua.status);

  const nguoc = await req('POST', '/api/dontra/uyquyen', {
    cookie: PH, body: { studentId: 's1', hoTen: 'Ngược ngày', tuNgay: dich(3), denNgay: dich(1) },
  });
  check('ngày kết thúc trước ngày bắt đầu thì từ chối', nguoc.status === 400, nguoc.status);

  // Bơm cho tới khi chạm trần người được đón.
  let chan = null;
  for (let i = 0; i < 20 && !chan; i++) {
    const r = await req('POST', '/api/dontra/nguoi', {
      cookie: PH, body: { studentId: 's1', hoTen: `Người thứ ${i}` },
    });
    if (r.status === 400) chan = r;
  }
  check('có trần số người được đón mỗi bé', !!chan, chan?.status);
  check('và câu từ chối chỉ cách dọn: bấm "Ngưng dùng"',
    /Ngưng dùng/i.test(chan?.data?.error || ''), chan?.data?.error);
}

// ===========================================================================
console.log('\n[11] Tầng cơ sở vẫn canh ở phân hệ mới');
{
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs2' } });

  const doc = await req('GET', '/api/dontra?studentId=s1', { cookie: VP3 });
  check('quản lý cơ sở 1 KHÔNG đọc được hồ sơ đón trả của bé cơ sở 2', doc.status === 403, doc.status);
  const them = await req('POST', '/api/dontra/nguoi', {
    cookie: VP3, body: { studentId: 's1', hoTen: 'Cơ sở khác thêm' },
  });
  check('và KHÔNG thêm được người được đón', them.status === 403, them.status);
  const cong = await req('GET', '/api/dontra/nhom?classId=c1', { cookie: VP3 });
  check('cũng không mở được màn cổng của nhóm đó', cong.status === 403, cong.status);

  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs1' } });
  const lai = await req('GET', '/api/dontra?studentId=s1', { cookie: VP3 });
  check('trả nhóm về cơ sở 1 thì đọc lại được', lai.status === 200, lai.status);
}

// ===========================================================================
console.log('\n[12] KHÔNG XOÁ — mã nguồn không có đường xoá dữ liệu nào');
{
  const ma = fs.readFileSync(path.join(GOC, 'modules/dontra/routes.js'), 'utf8');
  check('không có đường DELETE nào', !/app\.delete\(/.test(ma));
  check('không gọi db.remove', !/db\.remove\(/.test(ma));
  check('ngưng dùng bằng cờ, không bằng xoá dòng', /dangDung/.test(ma));

  const sql = fs.readFileSync(path.join(GOC, 'modules/dontra/schema.sql'), 'utf8');
  check('lược đồ chỉ CREATE ... IF NOT EXISTS',
    sql.split(';').map(c => c.trim()).filter(Boolean)
      .every(c => /^(--|CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS)/i.test(c.replace(/^--[^\n]*\n/gm, '').trim())),
    sql.split(';').map(c => c.replace(/^--[^\n]*\n/gm, '').trim()).filter(Boolean)[0]?.slice(0, 60));
  check('mọi bảng đều mang tiền tố của phân hệ',
    (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) || []).every(x => /dontra_/.test(x)),
    sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/g));

  // Ảnh CŨ bị thay thì mới được bỏ đi — đó là ghi đè, không phải xoá dữ liệu.
  check('chỉ bỏ tệp ảnh khi người dùng thay bằng ảnh mới',
    /uploads\.remove\(cu\.anh\)/.test(ma));
}

// ===========================================================================
console.log('\n[13] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/dontra', { cookie: VP, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);

  const goi = await req('GET', '/api/dontra?studentId=s1', { cookie: PH });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/dontra', { cookie: VP, body: { enabled: true } });
  const d = await hoSo();
  check('bật lại là chạy tiếp', (d.nguoiThuongXuyen || []).length > 0, d.nguoiThuongXuyen?.length);
  check('VÀ SỔ ĐÓN TRẢ CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
    (d.soGanDay || []).length > 0, d.soGanDay?.length);
}

// ===========================================================================
console.log('\n[+] NHIỀU CÔ MỘT NHÓM — canh chiều CHO PHÉP, không chỉ chiều CẤM');
{
  // Bộ canh của Đón trả bé đi đủ chiều CẤM: cô nhóm khác bị từ chối. Nhưng chiều
  // còn lại thì bỏ trống — CÔ THỨ HAI CỦA CÙNG MỘT NHÓM có làm được không.
  //
  // Đó mới là thay đổi nền lớn nhất của app 2 (app 1 gắn cứng một cô một lớp),
  // và một bộ canh chỉ đo chiều cấm thì vẫn xanh nguyên nếu ngày mai ai đó siết
  // nhầm thành "chỉ cô phụ trách CHÍNH mới làm được" — tức là làm hỏng đúng thứ
  // GĐ 0 đã bỏ ba commit ra để dựng.
  const doc = await req('GET', `/api/dontra/nhom?ngay=${HOM_NAY}&classId=c1`, { cookie: GV3 });
  check('CÔ THỨ HAI MỞ ĐƯỢC SỔ ĐÓN TRẢ CỦA NHÓM CHUNG', doc.status === 200, doc.data);
}

// ===========================================================================
console.log('\n[+] TRẦN THỨ HAI: vòng tạo → ngưng dùng → tạo lại phải có điểm dừng');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Trần "tối đa 12 người được đón" chỉ đếm dòng ĐANG DÙNG. Nhưng "Ngưng dùng"
  // là đường của chính gia đình, nên vòng tạo → ngưng dùng → tạo lại không vấp
  // trần nào. Mỗi vòng ghi thêm một tấm ảnh vào ổ đĩa, và ảnh của dòng đã ngưng
  // thì không có đường nào dọn.
  //
  // Chú thích của trần cũ tự nêu mục đích: "để một tài khoản bị chiếm không thể
  // bơm hàng nghìn dòng vào hồ sơ bé". Mã không làm được đúng điều nó nói.
  // Dọn trước: các mục trên đã tạo đủ người cho bé s1 nên trần THỨ NHẤT (12
  // người đang dùng) chặn ngay từ lần đầu. Ngưng dùng hết để vòng lặp dưới thật
  // sự đi vào trần THỨ HAI — nếu không thì mục này đo nhầm cái trần cũ.
  {
    const ds = await req('GET', '/api/dontra?studentId=s1', { cookie: PH });
    for (const x of (ds.data?.nguoiThuongXuyen || [])) {
      if (x && x.id) await req('PUT', `/api/dontra/nguoi/${x.id}`, { cookie: PH, body: { dangDung: false } });
    }
    const con = await req('GET', '/api/dontra?studentId=s1', { cookie: PH });
    const conDung = (con.data?.nguoiThuongXuyen || []).filter(x => x.dangDung).length;
    check('dọn xong, bé không còn ai "đang dùng" — để đo đúng trần thứ hai',
      conDung === 0, conDung);
  }

  let taoDuoc = 0;
  let chan = null;
  for (let i = 0; i < 30; i++) {
    const r = await req('POST', '/api/dontra/nguoi', {
      cookie: PH, body: { studentId: 's1', hoTen: `Người thử ${i}`, quanHe: 'Bác', dienThoai: '0900000000' },
    });
    if (r.status === 201 || r.status === 200) {
      taoDuoc += 1;
      // Ngưng dùng ngay để không chạm trần "đang dùng" — đúng vòng lặp của lỗi.
      const id = r.data?.id;
      if (id) await req('PUT', `/api/dontra/nguoi/${id}`, { cookie: PH, body: { dangDung: false } });
      continue;
    }
    chan = r;
    break;
  }
  check('VÒNG LẶP CÓ ĐIỂM DỪNG — không tạo được vô hạn', !!chan, `tạo được ${taoDuoc} lần mà chưa bị chặn`);
  check('và dừng lại trong khoảng hợp lý, không phải sau hàng trăm dòng',
    taoDuoc > 0 && taoDuoc <= 25, taoDuoc);
  check('lời từ chối nói bằng tiếng gia đình hiểu, có chỉ đường ra',
    /sửa lại người đã khai|văn phòng/i.test(chan?.data?.error || ''), chan?.data);
}

// ===========================================================================
// MỐC NGÀY NẰM TRONG CÂU TRUY VẤN — VÀ MÀN CỔNG KHÔNG ĐƯỢC ĐỔI MỘT DÒNG NÀO.
//
// Màn cổng trước đây nạp TOÀN BỘ lịch sử uỷ quyền của từng bé rồi vứt gần hết
// bằng JavaScript. Mỗi năm học trôi qua nó nặng thêm đúng bằng số lần các nhà
// nhờ người đón hộ — mà uỷ quyền một lần chính là thứ nhà trường muốn gia đình
// dùng thường xuyên. Đo được: nhét 750 dòng đã hết hạn vào nhóm c1 làm mười
// lượt mở màn cổng chậm gần gấp ba, trong khi số dòng HIỆN RA vẫn là 0.
//
// Đẩy mốc ngày vào câu truy vấn là việc một dòng. Chỗ NGUY HIỂM là làm quá
// tay: đây là màn an toàn, sai một điều kiện ngày là cô không thấy một uỷ
// quyền đang có hiệu lực rồi trả bé cho người không được phép — hoặc ngược
// lại, không trả bé cho người có quyền trong khi phụ huynh đang đợi ngoài
// cổng. Nên mục này dựng ĐỦ TÁM ca, phủ mọi trạng thái `trangThaiUyQuyen`
// sinh ra, rồi soi từng mục một.
console.log('\n[14] MỐC NGÀY NẰM TRONG CÂU TRUY VẤN — màn cổng không đổi một dòng');
{
  // Uỷ quyền ĐÃ QUA thì đường API từ chối tạo ("Uỷ quyền đã qua thì không tạo
  // mới được nữa") — đúng như nó nên thế. Nên ba ca hết hạn phải viết thẳng
  // vào bảng, ngoài tiến trình, đúng nếp `chayTrenCsdl` của test/_chung.mjs.
  const ghiThang = (rows) => execFileSync('node', ['-e', `
    const D = require('better-sqlite3');
    const db = new D(process.argv[1]);
    const them = db.prepare('INSERT INTO dontra_uyquyen (id, studentId, hoTen, quanHe, dienThoai, anh, tuNgay, denNgay, lyDo, huyLuc, huyBoi, nguoiTao, taoLuc) VALUES (@id, @studentId, @hoTen, @quanHe, @dienThoai, @anh, @tuNgay, @denNgay, @lyDo, @huyLuc, @huyBoi, @nguoiTao, @taoLuc)');
    const nhieu = db.transaction((ds) => { for (const r of ds) them.run(r); });
    nhieu(JSON.parse(process.argv[2]));
    db.close();
  `, path.join(DIR, 'school.db'), JSON.stringify(rows)], { cwd: GOC, stdio: 'inherit' });

  const BE = 's3';   // cùng nhóm c1, nhà khác — không đụng dữ liệu mục [4]
  const luc = new Date().toISOString();
  const thang = (id, hoTen, tuNgay, denNgay, huyLuc = null) => ({
    id, studentId: BE, hoTen, quanHe: 'Bác', dienThoai: '', anh: '',
    tuNgay, denNgay, lyDo: '', huyLuc, huyBoi: huyLuc ? 'p2' : null,
    nguoiTao: 'p2', taoLuc: luc,
  });

  ghiThang([
    // Ba ca ĐÃ QUA — đường API không tạo được.
    thang('uq-het-2n', 'het-han-2n', dich(-3), dich(-2)),
    thang('uq-het-8n', 'het-han-8n', dich(-9), dich(-8)),
    thang('uq-huy-cu', 'huy-rat-cu', dich(-40), dich(-30), luc),
  ]);

  // Năm ca còn lại đi qua đúng đường gia đình dùng thật.
  const tao = async (hoTen, tuNgay, denNgay) => {
    const r = await req('POST', '/api/dontra/uyquyen', {
      cookie: PH2, body: { studentId: BE, hoTen, tuNgay, denNgay },
    });
    check(`dựng được ca "${hoTen}"`, r.status === 201, { status: r.status, data: r.data });
    return r.data?.id;
  };
  await tao('con-hieu-luc', dich(-1), dich(1));
  await tao('bat-dau-homnay', HOM_NAY, HOM_NAY);
  await tao('chua-toi', dich(3), dich(4));
  const huyNgayMai = await tao('huy-ngay-mai', dich(3), dich(4));
  const huyTrongHan = await tao('huy-trong-han', dich(-1), dich(1));
  for (const id of [huyNgayMai, huyTrongHan]) {
    const h = await req('POST', `/api/dontra/uyquyen/${id}/huy`, { cookie: PH2, body: {} });
    check('huỷ được để dựng ca đã huỷ', h.status === 200, h.status);
  }

  const be = await beTrenManCong(BE, GV);
  const homNay = (be.uyQuyenHomNay || []).map(u => u.hoTen).sort();
  const het = (be.uyQuyenKhongConHieuLuc || []).map(u => u.hoTen).sort();

  check('ĐƯỢC ĐÓN HÔM NAY: đúng hai uỷ quyền còn hiệu lực',
    homNay.join('|') === 'bat-dau-homnay|con-hieu-luc', homNay);

  // Ba phép kiểm dưới là ba mép của mốc ngày. Đây là chỗ bản vá dễ sai nhất.
  check('uỷ quyền VỪA HẾT HẠN vẫn hiện ra — người đó có thể đang đứng ở cổng',
    het.includes('het-han-2n'), het);
  check('uỷ quyền hết hạn 8 ngày thì thôi — quá mốc bảy ngày',
    !het.includes('het-han-8n'), het);
  check('uỷ quyền ĐÃ HUỶ CỦA NGÀY MAI vẫn hiện ra',
    het.includes('huy-ngay-mai'), het);
  check('uỷ quyền đã huỷ trong hạn cũng hiện ra',
    het.includes('huy-trong-han'), het);
  check('uỷ quyền đã huỷ RẤT CŨ thì thôi', !het.includes('huy-rat-cu'), het);
  check('uỷ quyền CHƯA TỚI không nằm ở màn cổng — cả hai mục',
    !homNay.includes('chua-toi') && !het.includes('chua-toi'), { homNay, het });
  check('tổng cộng đúng ba dòng ở mục không còn hiệu lực', het.length === 3, het);

  // ĐỐI CHỨNG QUAN TRỌNG NHẤT: nhét thật nhiều lịch sử cũ vào rồi hỏi lại —
  // hai danh sách phải GIỐNG HỆT. Nếu mốc ngày không nằm trong câu truy vấn
  // thì mấy trăm dòng này vẫn được nạp lên, và bất kỳ chỗ nào lọc sai cũng lộ.
  const cuKy = [];
  for (let i = 0; i < 200; i++) {
    cuKy.push(thang(`uq-cu-${i}`, `cu-${i}`, dich(-60 - i), dich(-50 - i)));
  }
  ghiThang(cuKy);

  const be2 = await beTrenManCong(BE, GV);
  check('THÊM 200 UỶ QUYỀN CŨ: mục được đón hôm nay không đổi',
    (be2.uyQuyenHomNay || []).map(u => u.hoTen).sort().join('|') === homNay.join('|'),
    be2.uyQuyenHomNay);
  check('và mục không còn hiệu lực cũng không đổi',
    (be2.uyQuyenKhongConHieuLuc || []).map(u => u.hoTen).sort().join('|') === het.join('|'),
    be2.uyQuyenKhongConHieuLuc);

  // Hồ sơ MỘT bé thì vẫn giữ trọn lịch sử — đường đó cố ý không cắt.
  const ho = await hoSo(PH2, BE);
  check('hồ sơ một bé VẪN giữ đủ lịch sử uỷ quyền, không bị cắt lây',
    (ho.uyQuyen || []).length >= 200, (ho.uyQuyen || []).length);

  // Và người đã ngưng dùng vẫn không lọt vào màn cổng — điều kiện `dangDung`
  // phải sống sót qua lần gom câu truy vấn này.
  const themNguoi = await req('POST', '/api/dontra/nguoi', {
    cookie: PH2, body: { studentId: BE, hoTen: 'Người sẽ ngưng dùng', quanHe: 'Bác' },
  });
  check('khai được người để thử', themNguoi.status === 201, themNguoi.status);
  await req('PUT', `/api/dontra/nguoi/${themNguoi.data.id}`, { cookie: PH2, body: { dangDung: false } });
  const be3 = await beTrenManCong(BE, GV);
  check('màn cổng KHÔNG liệt kê người gia đình đã ngưng dùng',
    !(be3.nguoiThuongXuyen || []).some(n => n.hoTen === 'Người sẽ ngưng dùng'),
    (be3.nguoiThuongXuyen || []).map(n => n.hoTen));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
