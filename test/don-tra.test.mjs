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
import Database from 'better-sqlite3';
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

// ===========================================================================
console.log('\n[15] ẢNH LÚC TRẢ BÉ — cùng luật với ảnh "con đã tới lớp" của Điểm danh (Đ125)');
{
  const BE = 's1';
  const tep = (file) => path.join(DIR, 'uploads', file);
  // Có dòng "đã trả" hôm nay để sổ gần đây của gia đình có chỗ gắn ảnh.
  const ghi = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: BE, ngay: HOM_NAY, nguonLoai: 'khac', nguoiDon: 'Mẹ bé', luc: '16:30' },
  });
  check('cô ghi sổ trả bé hôm nay', ghi.status === 200, ghi.data);

  const chup = await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, ngay: HOM_NAY, anh: ANH } });
  check('cô chụp ảnh lúc trả → 201 kèm tên tệp', chup.status === 201 && !!(chup.data && chup.data.file), chup.data);
  const tep1 = chup.data && chup.data.file;
  check('tệp nằm trong kho ảnh của DATA_DIR', !!tep1 && fs.existsSync(tep(tep1)), tep1);

  const be = await beTrenManCong(BE, GV);
  check('màn cổng của cô thấy ảnh lúc trả của bé', !!(be && be.anhTra && be.anhTra.file === tep1), be && be.anhTra);
  const ho = await hoSo(PH, BE);
  const dong = (ho.soGanDay || []).find(g => g.ngay === HOM_NAY);
  check('sổ gần đây của gia đình kèm ảnh đúng ngày', !!dong && dong.anhTra === tep1, dong);
  const khac = (ho.soGanDay || []).filter(g => g.ngay !== HOM_NAY);
  check('những ngày không có ảnh thì anhTra = null, không lây', khac.every(g => g.anhTra === null), khac.slice(0, 2));

  const lay = async (cookie, file = tep1) => {
    const res = await fetch(`${sv.BASE}/api/dontra/anh/${file}`, { headers: cookie ? { cookie } : {} });
    return { status: res.status, kieu: res.headers.get('content-type') || '' };
  };
  const me = await lay(PH);
  check('mẹ bé xem được ảnh, đúng loại ảnh', me.status === 200 && /^image\//.test(me.kieu), me);
  check('cô của nhóm xem được', (await lay(GV)).status === 200);
  check('văn phòng xem được', (await lay(VP)).status === 200);
  check('phụ huynh nhà khác KHÔNG xem được', (await lay(PH2)).status === 403);
  check('cô nhóm khác KHÔNG xem được', (await lay(GV2)).status === 403);
  check('chưa đăng nhập KHÔNG xem được', [401, 403].includes((await lay(null)).status));

  // Chụp lại là THAY: tệp cũ phải bị dọn, không để rác trong kho ảnh.
  const chup2 = await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, ngay: HOM_NAY, anh: ANH } });
  const tep2 = chup2.data && chup2.data.file;
  check('chụp lại → tên tệp mới', chup2.status === 201 && !!tep2 && tep2 !== tep1, [tep1, tep2]);
  check('tệp cũ đã bị xoá khỏi kho', !fs.existsSync(tep(tep1)), tep1);
  check('tệp mới có mặt', fs.existsSync(tep(tep2)), tep2);
  check('ảnh cũ không còn mở được (404)', (await lay(PH, tep1)).status === 404);
  const be2 = await beTrenManCong(BE, GV);
  check('mỗi bé mỗi ngày MỘT tấm — màn cổng trỏ tới tấm mới', !!(be2 && be2.anhTra && be2.anhTra.file === tep2), be2 && be2.anhTra);

  // Ai không được chụp, và cái gì không được nhận.
  check('phụ huynh KHÔNG chụp được (403)',
    (await req('POST', '/api/dontra/anh-tra', { cookie: PH, body: { studentId: BE, anh: ANH } })).status === 403);
  check('cô nhóm khác KHÔNG chụp được (403)',
    (await req('POST', '/api/dontra/anh-tra', { cookie: GV2, body: { studentId: BE, anh: ANH } })).status === 403);
  check('ngày mai → 400',
    (await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, ngay: dich(1), anh: ANH } })).status === 400);
  check('không có ảnh → 400',
    (await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE } })).status === 400);
  const nang = 'data:image/png;base64,' + 'A'.repeat(1300 * 1024);
  const rNang = await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, anh: nang } });
  check('ảnh nặng quá trần → 400 và nói bằng tiếng Việt', rNang.status === 400 && /nặng/.test(rNang.data && rNang.data.error || ''), rNang.data);
  check('bé không tồn tại → 404',
    (await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: 'khong-co', anh: ANH } })).status === 404);

  // Gỡ — chụp nhầm bé thì phải gỡ được ngay.
  check('phụ huynh KHÔNG gỡ được (403)',
    (await req('POST', '/api/dontra/anh-tra/go', { cookie: PH, body: { studentId: BE, ngay: HOM_NAY } })).status === 403);
  const go = await req('POST', '/api/dontra/anh-tra/go', { cookie: GV, body: { studentId: BE, ngay: HOM_NAY } });
  check('cô gỡ được', go.status === 200 && go.data && go.data.ok === true, go.data);
  check('tệp đã bị xoá khỏi kho', !fs.existsSync(tep(tep2)), tep2);
  const be3 = await beTrenManCong(BE, GV);
  check('màn cổng không còn ảnh', !!be3 && be3.anhTra === null, be3 && be3.anhTra);
  check('ảnh đã gỡ mở là 404', (await lay(PH, tep2)).status === 404);
  const goLai = await req('POST', '/api/dontra/anh-tra/go', { cookie: GV, body: { studentId: BE, ngay: HOM_NAY } });
  check('gỡ lần hai không nổ, chỉ báo đã gỡ trước đó', goLai.status === 200 && goLai.data && goLai.data.daGoTruocDo === true, goLai.data);
  check('dòng "đã trả" vẫn còn nguyên — gỡ ảnh không xoá sổ', !!(be3 && be3.daTra && be3.daTra.nguoiDon === 'Mẹ bé'), be3 && be3.daTra);
  // Gỡ rồi chụp lại được — dòng "đã thay bằng trống" không chặn lần chụp sau.
  const chup3 = await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, ngay: HOM_NAY, anh: ANH } });
  check('gỡ rồi chụp lại vẫn được', chup3.status === 201 && !!(chup3.data && chup3.data.file), chup3.data);
  const be4 = await beTrenManCong(BE, GV);
  check('và màn cổng lại có ảnh', !!(be4 && be4.anhTra && be4.anhTra.file === chup3.data.file), be4 && be4.anhTra);
}

// ===========================================================================
console.log('\n[16] MỘT NGÀY HAI PHẦN — sổ trả bé theo tháng cho lịch Điểm danh, và ranh giới lõi ↔ phân hệ (Đ126)');
{
  const BE = 's1';
  const thangNay = HOM_NAY.slice(0, 7);
  // Một dòng ở THÁNG TRƯỚC để chứng minh đường mới lọc đúng tháng (soGanDay
  // thì không lọc — đó là lý do đường này tồn tại).
  const [y, m] = thangNay.split('-').map(Number);
  const thangTruoc = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
  const ngayCu = `${thangTruoc}-10`;
  // DÒNG CỦA THÁNG TRƯỚC GHI THẲNG VÀO BẢNG.
  //
  // Từ Đ127b, `POST /api/dontra/ghi` chỉ nhận đúng ngày hôm nay. Mục này đo
  // chuyện KHÁC: sổ theo tháng có lọc đúng tháng không. Nên tình huống dựng
  // thẳng vào bảng, còn luật ngày thì có mục [17] canh riêng ngay dưới.
  {
    const conn = new Database(path.join(DIR, 'school.db'));
    conn.prepare(`INSERT INTO dontra_ghi (id, studentId, ngay, luc, nguoiDon, nguonLoai, nguonId, ghiChu, coGhi, capNhatLuc)
      VALUES ('dtg_thu_cu', ?, ?, '16:10', 'Bà nội', 'khac', '', '', NULL, ?)
      ON CONFLICT(studentId, ngay) DO UPDATE SET nguoiDon = excluded.nguoiDon`)
      .run(BE, ngayCu, `${ngayCu}T09:10:00.000Z`);
    conn.close();
  }
  check('dựng được một dòng của tháng trước để thử phép lọc tháng',
    (await req('GET', `/api/dontra/so?studentId=${BE}&thang=${thangTruoc}`, { cookie: PH })).status === 200);

  const so = async (cookie, q) => req('GET', `/api/dontra/so?${q}`, { cookie });
  const me = await so(PH, `studentId=${BE}&thang=${thangNay}`);
  check('mẹ bé xem được sổ trả bé của tháng này', me.status === 200 && Array.isArray(me.data && me.data.so), me.data);
  const dongNay = (me.data.so || []).find(g => g.ngay === HOM_NAY);
  check('có dòng hôm nay, đúng người đón, kèm tên cô và ảnh lúc trả',
    !!dongNay && dongNay.nguoiDon === 'Mẹ bé' && !!dongNay.coGhiTen && typeof dongNay.anhTra === 'string' && dongNay.anhTra.length > 0,
    dongNay);
  check('mọi dòng đều thuộc đúng tháng hỏi', (me.data.so || []).every(g => g.ngay.startsWith(`${thangNay}-`)), me.data.so);
  check('dòng tháng trước KHÔNG lẫn vào', !(me.data.so || []).some(g => g.ngay === ngayCu));
  const cu = await so(PH, `studentId=${BE}&thang=${thangTruoc}`);
  check('hỏi tháng trước thì thấy dòng "Bà nội", không có ảnh',
    cu.status === 200 && (cu.data.so || []).some(g => g.ngay === ngayCu && g.nguoiDon === 'Bà nội' && g.anhTra === null), cu.data);
  const macDinh = await so(PH, `studentId=${BE}`);
  check('không nói tháng thì mặc định tháng này', macDinh.status === 200 && macDinh.data.thang === thangNay, macDinh.data && macDinh.data.thang);

  check('cô của nhóm xem được', (await so(GV, `studentId=${BE}&thang=${thangNay}`)).status === 200);
  check('văn phòng xem được', (await so(VP, `studentId=${BE}&thang=${thangNay}`)).status === 200);
  check('phụ huynh nhà khác KHÔNG xem được (403)', (await so(PH2, `studentId=${BE}&thang=${thangNay}`)).status === 403);
  check('cô nhóm khác KHÔNG xem được (403)', (await so(GV2, `studentId=${BE}&thang=${thangNay}`)).status === 403);
  check('thiếu mã bé → 400', (await so(PH, `thang=${thangNay}`)).status === 400);
  const saiThang = await so(PH, `studentId=${BE}&thang=9-2026`);
  check('tháng sai dạng → 400 và nói tiếng Việt',
    saiThang.status === 400 && /tháng/i.test((saiThang.data && saiThang.data.error) || ''), saiThang.data);

  // Tắt phân hệ thì đường mới cũng bị chặn như mọi đường /api/dontra khác.
  await req('PUT', '/api/admin/modules/dontra', { cookie: VP, body: { enabled: false } });
  check('tắt Đón trả bé → sổ theo tháng 404', (await so(PH, `studentId=${BE}&thang=${thangNay}`)).status === 404);
  await req('PUT', '/api/admin/modules/dontra', { cookie: VP, body: { enabled: true } });
  check('bật lại → 200', (await so(PH, `studentId=${BE}&thang=${thangNay}`)).status === 200);

  // Ô "Đón trả bé" KHÔNG còn gấp vào Điểm danh (Đ210, việc 1 + 3).
  //
  // ĐỔI CHIỀU, KHÔNG BỎ PHÉP KIỂM. Đ126 gấp ô này vào màn Điểm danh vì lúc ấy
  // màn Điểm danh có hẳn một tab "Trả bé" do phân hệ vẽ. Đ210 gộp hai tab về
  // một dòng Vào/Ra và bỏ tab ấy đi — nên nếu vẫn gấp thì cô MẤT HẲN lối vào
  // sổ đón trả: ô bị ẩn khỏi trang chủ mà màn Điểm danh thì không còn vẽ nó
  // nữa. Đó đúng là kiểu hỏng Nguyên tắc số 1 cấm, và nó im lặng.
  //
  // Nên phép kiểm nay đo điều ngược lại, và đo CẢ HAI VẾ: cờ đã gỡ, VÀ cô
  // thật sự thấy lại ô trên danh sách phân hệ của mình.
  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/dontra/module.json'), 'utf8'));
  check('module.json KHÔNG còn khai gopVao — màn Điểm danh không vẽ sổ trả bé nữa',
    mj.gopVao === undefined || mj.gopVao === null, mj.gopVao);
  const dsCo = await req('GET', '/api/modules', { cookie: GV });
  const dtCo = (dsCo.data || []).find(x => x.key === 'dontra');
  check('CÔ VẪN THẤY phân hệ Đón trả bé trong danh sách của mình', !!dtCo, dtCo);
  check('…và không còn cờ gấp, nên trang chủ vẽ ô cho cô bấm vào',
    !!dtCo && !dtCo.gopVao, dtCo && dtCo.gopVao);
  const dsPH = await req('GET', '/api/modules', { cookie: PH });
  const dtPH = (dsPH.data || []).find(x => x.key === 'dontra');
  check('gia đình vẫn thấy phân hệ như cũ', !!dtPH && !dtPH.gopVao, dtPH);
  // HÌNH DẠNG của cờ, không phải DANH SÁCH ai đang gấp.
  //
  // Bản đầu viết là "mọi phân hệ trừ `dontra` phải có gopVao === null" — đọc thì
  // xuôi, nhưng nó chốt cứng rằng chỉ MỘT phân hệ được gấp, mà đó không phải
  // điều mục này canh. Đ148 gấp thêm Kế hoạch giáo dục vào màn Lịch sinh hoạt
  // và bài đỏ ngay, dù không có gì hỏng cả.
  //
  // Điều thật sự phải canh là điều tên phép kiểm đã nói: KHÔNG được `undefined`.
  // Máy chủ chỉ truyền cờ qua, nên `undefined` sẽ biến mất khi đóng gói JSON và
  // trình duyệt nhận về một khoá không tồn tại — khác hẳn `null` ("có hỏi, và
  // câu trả lời là không gấp"). Bản dưới đây canh đúng chỗ đó, và canh chặt hơn
  // bản cũ: cờ khác null thì phải đủ hình dạng { view, vai[] }, chứ không phải
  // một object nửa vời mà trang chủ lặng lẽ bỏ qua.
  const dsHS = await req('GET', '/api/modules', { cookie: GV });
  const coHongDang = (dsHS.data || []).filter(x => !(x.gopVao === null
    || (x.gopVao && typeof x.gopVao.view === 'string' && x.gopVao.view
        && Array.isArray(x.gopVao.vai) && x.gopVao.vai.length)));
  check('cờ gopVao luôn là null hoặc { view, vai[] } đầy đủ — không bao giờ undefined',
    coHongDang.length === 0, coHongDang.map(x => [x.key, x.gopVao]));
  check('mọi phân hệ đều CÓ khoá gopVao trong câu trả lời',
    (dsHS.data || []).every(x => 'gopVao' in x), (dsHS.data || []).filter(x => !('gopVao' in x)).map(x => x.key));

  // RANH GIỚI LÕI ↔ PHÂN HỆ, canh bằng máy: màn Điểm danh chỉ chạm phân hệ ở
  // ĐÚNG MỘT chỗ và không gọi thẳng API của nó; phân hệ không đọc màn lõi.
  const boChuThich = (v) => v.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const dd = boChuThich(fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8'));
  check('attendance.js nhắc tới App.views.dontra ĐÚNG MỘT lần (ngoài chú thích)',
    (dd.match(/App\.views\.dontra/g) || []).length === 1, (dd.match(/App\.views\.dontra/g) || []).length);
  check('attendance.js KHÔNG gọi thẳng đường /api/dontra nào', !/['"`]\/api\/dontra/.test(dd));
  check('attendance.js canh cả ba lớp: tắt (moduleEnabled), thiếu hàm (typeof), lỗi khi gọi (catch)',
    /moduleEnabled\('dontra'\)/.test(dd) && /typeof v\[t\] === 'function'/.test(dd) && /catch \(e\)/.test(dd));
  const vw = boChuThich(fs.readFileSync(path.join(GOC, 'modules/dontra/view.js'), 'utf8'));
  check('modules/dontra/view.js KHÔNG đọc App.views.attendance (phân hệ không dựa vào màn lõi)',
    !/App\.views\.attendance/.test(vw));
  check('phân hệ không tự gọi API Điểm danh — chỉ vẽ đường ảnh được đưa', !/\/api\/attendance/.test(vw));
  for (const ten of ['veTraBe', 'napSoThang', 'htmlTraBeCuaNgay', 'chuTraBeNgan', 'gioTraBe']) {
    check(`phân hệ có hàm ${ten} mà Điểm danh gọi`, new RegExp(`\\b${ten}\\(`).test(vw));
  }
  check('nhãn bé còn chờ đón là "Còn ở lớp" màu xám — không cam, không đỏ (QUY TẮC 2)',
    /badge\('Còn ở lớp', 'gray'\)/.test(vw) && !/Chưa trả/.test(vw));
}

// ===========================================================================
console.log('\n[17] SỔ ĐÓN TRẢ CHỈ GHI VÀ SỬA ĐƯỢC TRONG CHÍNH NGÀY HÔM ĐÓ (Đ127b)');
{
  const BE = 's1';
  // Nhà trường chốt 04/09, cùng luật với sổ điểm danh. Ở cuốn sổ này lý do còn
  // nặng hơn: mỗi dòng nói trường đã trao một đứa trẻ cho ai, và đó là chứng
  // cứ duy nhất khi có tranh chấp.
  for (const [ten, ngay] of [['hôm qua', dich(-1)], ['ngày mai', dich(1)], ['tháng trước', dich(-31)]]) {
    const ghi = await req('POST', '/api/dontra/ghi',
      { cookie: GV, body: { studentId: BE, ngay, nguonLoai: 'khac', nguoiDon: 'Mẹ bé', luc: '16:30' } });
    check(`KHÔNG ghi sổ trả bé cho ${ten} (${ngay})`, ghi.status === 400, `${ghi.status} ${JSON.stringify(ghi.data).slice(0, 120)}`);
    check(`câu từ chối ${ten} nói bằng tiếng của trường, nêu rõ ngày`,
      /chỉ ghi và sửa được trong chính ngày hôm đó/.test(ghi.data?.error || '')
        && (ghi.data?.error || '').includes(ngay), ghi.data?.error);
    const chup = await req('POST', '/api/dontra/anh-tra', { cookie: GV, body: { studentId: BE, ngay, anh: ANH } });
    check(`KHÔNG gắn được ảnh lúc trả cho ${ten}`, chup.status === 400, chup.status);
    const go = await req('POST', '/api/dontra/anh-tra/go', { cookie: GV, body: { studentId: BE, ngay } });
    check(`KHÔNG gỡ được ảnh lúc trả của ${ten}`, go.status === 400, go.status);
  }
  // Văn phòng cũng không có ngoại lệ — luật là của cuốn sổ, không của vai.
  const vp = await req('POST', '/api/dontra/ghi',
    { cookie: VP, body: { studentId: BE, ngay: dich(-1), nguonLoai: 'khac', nguoiDon: 'Mẹ bé' } });
  check('văn phòng cũng KHÔNG sửa được sổ của ngày đã qua', vp.status === 400, vp.status);

  // XEM LẠI THÌ KHÔNG CHẶN — khoá là khoá đường ghi, không phải khoá cuốn sổ.
  const xemNhom = await req('GET', `/api/dontra/nhom?classId=c1&ngay=${dich(-1)}`, { cookie: GV });
  check('màn cổng vẫn mở được ngày đã qua để xem lại', xemNhom.status === 200, xemNhom.status);
  const xemSo = await req('GET', `/api/dontra/so?studentId=${BE}&thang=${HOM_NAY.slice(0, 7)}`, { cookie: PH });
  check('gia đình vẫn tra được sổ theo tháng', xemSo.status === 200, xemSo.status);

  // Hồ sơ của GIA ĐÌNH thì KHÔNG dính luật ngày: người được đón và uỷ quyền
  // một lần không gắn với một ngày nào, và uỷ quyền vốn là khai TRƯỚC.
  // Bé s2 — con thứ hai của cùng nhà: bé s1 đã bị mục [10] bơm đầy tới trần
  // người đón, nên dùng nó ở đây là đo nhầm cái trần đó.
  const BE2 = 's2';
  const nguoiMoi = await req('POST', '/api/dontra/nguoi',
    { cookie: PH, body: { studentId: BE2, hoTen: 'Bác Tư hàng xóm', quanHe: 'Hàng xóm' } });
  check('gia đình vẫn khai thêm được người đón thường xuyên', nguoiMoi.status === 201,
    `${nguoiMoi.status} ${JSON.stringify(nguoiMoi.data).slice(0, 120)}`);
  const uyMoi = await req('POST', '/api/dontra/uyquyen',
    { cookie: PH, body: { studentId: BE2, hoTen: 'Chú Năm', tuNgay: dich(1), denNgay: dich(2), lyDo: 'Bố mẹ đi công tác' } });
  check('gia đình vẫn uỷ quyền TRƯỚC cho ngày mai được', uyMoi.status === 201, uyMoi.status);
}

// ===========================================================================
console.log('\n[18] TRẢ BÉ CHỈ BẰNG MỘT TẤM ẢNH — cô không phải gõ tên (Đ128)');
{
  const BE = 's3';   // bé chưa dính tới các mục trên, để đếm cho sạch
  const tep = (file) => path.join(DIR, 'uploads', file);
  const soCua = async (studentId = BE, cookie = GV) =>
    (await req('GET', `/api/dontra/nhom?classId=c1&ngay=${HOM_NAY}`, { cookie }))
      .data?.danhSach?.find(x => x.studentId === studentId);

  const truoc = await soCua();
  check('đối chứng — bé này chưa có dòng trả nào hôm nay', !truoc?.daTra, truoc?.daTra);

  const r = await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: BE, anh: ANH } });
  check('MỘT LỜI GỌI: chụp ảnh là ghi sổ luôn → 201', r.status === 201, `${r.status} ${JSON.stringify(r.data).slice(0, 140)}`);
  check('trả về tên tệp ảnh', !!(r.data && r.data.file), r.data);
  check('và ghi nguồn là "anh" — sổ nói đúng thứ đã xảy ra', r.data?.nguonLoai === 'anh', r.data?.nguonLoai);
  check('ô người đón KHÔNG để trống, mà nói rõ xác nhận bằng ảnh',
    /ảnh/i.test(r.data?.nguoiDon || ''), r.data?.nguoiDon);
  check('giờ trả được ghi tự động theo giờ Việt Nam', /^\d{2}:\d{2}$/.test(r.data?.luc || ''), r.data?.luc);
  check('tệp ảnh nằm trong kho', fs.existsSync(tep(r.data.file)), r.data.file);

  const sau = await soCua();
  check('màn cổng thấy bé đã trả', !!sau?.daTra, sau?.daTra);
  check('và thấy ảnh lúc trả', sau?.anhTra?.file === r.data.file, sau?.anhTra);

  const ho = await hoSo(PH2, BE);
  check('gia đình của bé đó thấy dòng trong sổ',
    (ho.soGanDay || []).some(g => g.ngay === HOM_NAY && g.nguonLoai === 'anh'),
    (ho.soGanDay || []).slice(0, 2));

  // CHỤP LẠI: thay ảnh, KHÔNG sinh dòng thứ hai, và tệp cũ được dọn.
  const lai = await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: BE, anh: ANH } });
  check('chụp lại → tên tệp mới', lai.status === 201 && lai.data.file !== r.data.file, [r.data.file, lai.data.file]);
  check('tệp cũ đã bị dọn khỏi kho', !fs.existsSync(tep(r.data.file)), r.data.file);
  const hoLai = await hoSo(PH2, BE);
  check('vẫn CHỈ MỘT dòng cho ngày đó', (hoLai.soGanDay || []).filter(g => g.ngay === HOM_NAY).length === 1);

  // ĐƯỜNG GÕ TÊN VẪN CÒN, và tên cô đã ghi rõ thì chụp thêm KHÔNG xoá mất.
  const ghiTen = await req('POST', '/api/dontra/ghi', {
    cookie: GV, body: { studentId: BE, nguonLoai: 'khac', nguoiDon: 'Bà ngoại bé', luc: '16:40' },
  });
  check('cô vẫn ghi rõ tên người đón được khi cần', ghiTen.status === 200, ghiTen.status);
  const themAnh = await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: BE, anh: ANH } });
  check('chụp thêm một tấm sau khi đã ghi tên → vẫn 201', themAnh.status === 201, themAnh.status);
  check('TÊN CÔ ĐÃ GHI RÕ KHÔNG BỊ THAY BẰNG NHÃN ẢNH',
    themAnh.data?.nguoiDon === 'Bà ngoại bé' && themAnh.data?.nguonLoai === 'khac', themAnh.data);

  // Phân quyền và đầu vào — cùng luật với mọi đường ghi khác của phân hệ.
  check('phụ huynh KHÔNG dùng được đường này (403)',
    (await req('POST', '/api/dontra/tra-bang-anh', { cookie: PH, body: { studentId: BE, anh: ANH } })).status === 403);
  check('cô nhóm khác KHÔNG dùng được (403)',
    (await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV2, body: { studentId: BE, anh: ANH } })).status === 403);
  check('không có ảnh → 400',
    (await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: BE } })).status === 400);
  check('bé không tồn tại → 404',
    (await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: 'khong-co', anh: ANH } })).status === 404);
  const nang = 'data:image/png;base64,' + 'A'.repeat(1300 * 1024);
  const rNang = await req('POST', '/api/dontra/tra-bang-anh', { cookie: GV, body: { studentId: BE, anh: nang } });
  check('ảnh nặng quá trần → 400, nói bằng tiếng của trường',
    rNang.status === 400 && /nặng/.test(rNang.data?.error || ''), rNang.data);
  const ngayCu = await req('POST', '/api/dontra/tra-bang-anh',
    { cookie: GV, body: { studentId: BE, ngay: dich(-1), anh: ANH } });
  check('ngày đã khoá thì đường nhanh cũng bị chặn (Đ127b)', ngayCu.status === 400, ngayCu.status);
  check('và không để lại tấm ảnh mồ côi nào trong kho',
    !(ngayCu.data && ngayCu.data.file), ngayCu.data);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
