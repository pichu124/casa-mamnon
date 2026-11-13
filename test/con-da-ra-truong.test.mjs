// Bài canh QUYỀN CỦA GIA ĐÌNH VỚI CON ĐÃ RỜI TRƯỜNG.
//
// Chạy bằng:  npm run test:con-ra-truong
//
// LUẬT CỦA NHÀ TRƯỜNG
//
// `docs/KE-HOACH.md` mục 6: bé rời trường thì gia đình còn xem hồ sơ **12
// tháng**, sau đó đóng đường xem. Đóng đường xem, KHÔNG xoá dữ liệu — nhà
// trường vẫn phải giữ hồ sơ theo quy định lưu trữ.
//
// VÌ SAO CẦN MỘT BÀI RIÊNG
//
// Trước đợt Đ44, mốc 12 tháng chỉ được cài ở MỘT chỗ: `routes/hocsinh-cu.js`,
// tệp của đúng màn "Hồ sơ con đã ra trường". Còn `db.canAccessStudent` — hàm
// mà MỌI đường đọc dữ liệu bé đều gọi — nhánh phụ huynh chỉ hỏi bảng
// `student_parents`, tức trả `true` mãi mãi.
//
// Nhìn từ giao diện thì luật có vẻ đúng: màn đó đóng đúng hạn. Nhưng gia đình
// gõ thẳng địa chỉ /api/nhatky?studentId=... là đọc được nhật ký ăn ngủ, hồ sơ
// sức khoẻ, sổ đón trả của một đứa trẻ đã rời trường nhiều năm.
//
// MỘT LUẬT QUYỀN NẰM CẠNH MỘT MÀN HÌNH LÀ MỘT LUẬT CHỈ ĐÚNG Ở MÀN HÌNH ĐÓ.
//
// Bài này vì vậy không đi qua màn hình nào. Nó dựng ba trạng thái của cùng một
// bé — đang học, vừa rời trường, rời trường đã lâu — rồi gõ thẳng vào mọi họ
// đường dẫn gác bằng `canAccessStudent`.
import path from 'path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('con-da-ra-truong');
sinhDuLieu(DIR);
// `hocsinhcu` (màn "Hồ sơ con đã ra trường") TẮT SẴN từ Đ5 — nhà trường quyết.
// Bật tường minh ở đây vì mục [7] soi đúng lời từ chối của màn đó: luật quyền
// phải đúng vào lúc nhà trường bật lại, không phải chỉ đúng khi nó đang tắt.
batPhanHe(DIR, ['nhatky', 'hanhtrinh', 'hocphi', 'hocsinhcu',
  // `nhanxet`: mã của phân hệ Nhận xét đã GỠ HẲN ở Đ252. Dòng BẬT cũ vẫn ghi
  // vào đây có chủ ý — bài này đóng vai một máy từng bật nó, và mục [9] canh
  // rằng dòng cài đặt cũ ấy không làm màn "Hồ sơ con đã ra trường" bày lại
  // bảng `remarks` ra cho gia đình.
  'nhanxet']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3313), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const d0 = await login('hieutruong', mkQT);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const QT = (await login('hieutruong', 'quantri2026')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1 (đang học) và s2

// Đặt ngày rời trường bằng cách ghi thẳng vào cơ sở dữ liệu: app không có
// đường nào đặt ngày đó về quá khứ, mà đây đúng là thứ cần thử.
const { default: Database } = await import('better-sqlite3');
function choRoiTruong(studentId, soThangTruoc) {
  const conn = new Database(path.join(DIR, 'school.db'));
  if (soThangTruoc === null) {
    conn.prepare('UPDATE students SET active = 1, leftAt = NULL WHERE id = ?').run(studentId);
  } else {
    const d = new Date(`${HOM_NAY()}T00:00:00Z`);
    d.setMonth(d.getMonth() - soThangTruoc);
    conn.prepare('UPDATE students SET active = 0, leftAt = ? WHERE id = ?')
      .run(d.toISOString().slice(0, 10), studentId);
  }
  conn.close();
}

// Mọi họ đường dẫn gác bằng `canAccessStudent`. Thiếu một họ ở đây là thiếu
// đúng chỗ lỗ hổng lần sau chui qua.
const CAC_DUONG = (id) => [
  ['hồ sơ bé', `/api/students/${id}`],
  ['nhật ký ngày', `/api/nhatky?studentId=${id}`],
  ['hành trình học tập', `/api/hanhtrinh?studentId=${id}`],
  ['hồ sơ sức khoẻ', `/api/health?studentId=${id}`],
  ['học phí', `/api/hocphi?studentId=${id}`],
];

// `GET /api/medicine` KHÔNG nhận `studentId` — nó liệt kê theo phạm vi của
// người gọi (`db.studentIdsOf`, vốn đã lọc bé đang học). Nên đo nó bằng cách
// khác: đơn thuốc của bé đã rời trường phải BIẾN KHỎI danh sách, chứ không
// phải đường dẫn trả về 403. Xếp nhầm nó vào bảng trên là bài đỏ vì lý do sai.


const BE = 's1';

// ===========================================================================
console.log('\n[1] BÉ ĐANG HỌC — gia đình mở được mọi đường (vế khẳng định)');
{
  // Không có mục này thì mọi phép kiểm phủ định bên dưới xanh cả khi mã hỏng
  // tới mức chặn nhầm tất cả mọi người.
  choRoiTruong(BE, null);
  for (const [ten, duong] of CAC_DUONG(BE)) {
    const r = await req('GET', duong, { cookie: PH });
    check(`${ten} — mở được`, r.status === 200, `${r.status} ${JSON.stringify(r.data).slice(0, 90)}`);
  }

  // Gửi một lời dặn thuốc trong lúc bé còn đang học. Không có dòng này thì
  // phép kiểm "đơn thuốc biến khỏi danh sách" ở mục [3] xanh vì danh sách
  // vốn đã rỗng, chứ không vì cửa đã đóng.
  const mai = new Date(Date.parse(`${HOM_NAY()}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const gui = await req('POST', '/api/medicine', { cookie: PH, body: {
    studentId: BE, fromDate: HOM_NAY(), toDate: mai,
    medicines: [{ name: 'Siro ho', dose: '5ml', timing: 'sau bữa trưa' }], note: 'Bé ho nhẹ',
  } });
  check('gia đình gửi được lời dặn thuốc lúc bé còn đang học', gui.status === 200 || gui.status === 201,
    `${gui.status} ${JSON.stringify(gui.data).slice(0, 120)}`);
  const dsThuoc = await req('GET', '/api/medicine', { cookie: PH });
  check('và đơn đó có mặt trong danh sách của gia đình',
    (dsThuoc.data || []).some(x => x.studentId === BE), (dsThuoc.data || []).length);
}

// ===========================================================================
console.log('\n[2] BÉ VỪA RỜI TRƯỜNG 1 THÁNG — vẫn trong hạn, vẫn mở được');
{
  // Lời hứa "còn xem 12 tháng" phải là lời hứa thật, không phải cái cớ để đóng
  // sớm. Đây là vế giữ cho bản vá không siết quá tay.
  choRoiTruong(BE, 1);
  for (const [ten, duong] of CAC_DUONG(BE)) {
    const r = await req('GET', duong, { cookie: PH });
    check(`${ten} — còn trong 12 tháng nên vẫn mở được`, r.status === 200,
      `${r.status} ${JSON.stringify(r.data).slice(0, 90)}`);
  }
}

// ===========================================================================
console.log('\n[3] RỜI TRƯỜNG ĐÃ 2 NĂM — MỌI ĐƯỜNG ĐỀU PHẢI ĐÓNG');
{
  choRoiTruong(BE, 24);
  for (const [ten, duong] of CAC_DUONG(BE)) {
    const r = await req('GET', duong, { cookie: PH });
    check(`${ten} — ĐÓNG`, r.status === 403 || r.status === 404,
      `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  }

  const dsThuoc = await req('GET', '/api/medicine', { cookie: PH });
  check('dặn thuốc — đơn của bé đã rời trường BIẾN KHỎI danh sách của gia đình',
    !(dsThuoc.data || []).some(x => x.studentId === BE),
    (dsThuoc.data || []).map(x => x.studentId));

  // Và không được chặn bằng cách trả về lỗi cho cả nhà: con còn đang học vẫn
  // phải nhìn thấy đơn của mình (mục [5] đo kỹ hơn).
  check('nhưng danh sách vẫn mở bình thường, không trả về lỗi', dsThuoc.status === 200, dsThuoc.status);
}

// ===========================================================================
console.log('\n[4] ĐÓNG ĐƯỜNG XEM KHÔNG PHẢI LÀ XOÁ DỮ LIỆU');
{
  // Nhà trường vẫn phải giữ hồ sơ theo quy định lưu trữ. Nếu bản vá làm quản
  // trị cũng không tra được thì nó vá quá tay, và vá theo hướng mất mát.
  const r = await req('GET', `/api/students/${BE}`, { cookie: QT });
  check('QUẢN TRỊ VẪN MỞ ĐƯỢC hồ sơ bé đã rời trường', r.status === 200,
    `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  check('và hồ sơ đó vẫn còn tên bé, không rỗng',
    typeof r.data?.name === 'string' && r.data.name.length > 1, r.data?.name);

  // Và bằng chứng nặng hơn: đọc thẳng cơ sở dữ liệu. Đường API đóng lại không
  // được kéo theo một dòng nào biến mất khỏi ổ đĩa.
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const conSo = conn.prepare('SELECT COUNT(*) AS n FROM medicine_requests WHERE studentId = ?').get(BE).n;
  const conBe = conn.prepare('SELECT COUNT(*) AS n FROM students WHERE id = ?').get(BE).n;
  conn.close();
  check('DÒNG DỮ LIỆU CỦA BÉ VẪN NẰM NGUYÊN TRÊN Ổ ĐĨA', conBe === 1, conBe);
  check('và đơn dặn thuốc gia đình từng gửi cũng còn nguyên', conSo >= 1, conSo);
}

// ===========================================================================
console.log('\n[5] CON CÒN ĐANG HỌC CỦA CÙNG NHÀ ĐÓ KHÔNG BỊ VẠ LÂY');
{
  // Nhà này có hai con: s1 vừa bị đẩy thành "rời trường 2 năm", s2 vẫn đang
  // học. Một bản vá siết theo tài khoản thay vì theo từng bé sẽ cắt nhầm cả
  // hai — và cắt đúng vào gia đình đang gửi con ở trường.
  for (const [ten, duong] of CAC_DUONG('s2')) {
    const r = await req('GET', duong, { cookie: PH });
    check(`${ten} của con đang học — vẫn mở được`, r.status === 200,
      `${r.status} ${JSON.stringify(r.data).slice(0, 90)}`);
  }
}

// ===========================================================================
console.log('\n[6] LUẬT 12 THÁNG NẰM Ở MỘT CHỖ, VÀ ĐỌC ĐƯỢC TỪ NGOÀI');
{
  const { createRequire } = await import('module');
  const { GOC } = await import('./_chung.mjs');
  const db = createRequire(import.meta.url)(path.join(GOC, 'lib', 'db.js'));

  check('lib/db.js công bố số tháng giữ hồ sơ', db.SO_THANG_GIU_HO_SO === 12, db.SO_THANG_GIU_HO_SO);
  check('và công bố hàm hỏi còn hạn hay không', typeof db.conHanXemHoSo === 'function');

  const luiThang = (n) => { const d = new Date(`${HOM_NAY()}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };
  check('vừa rời trường thì còn hạn', db.conHanXemHoSo(luiThang(1)) === true);
  check('11 tháng vẫn còn hạn', db.conHanXemHoSo(luiThang(11)) === true);
  check('13 tháng thì hết hạn', db.conHanXemHoSo(luiThang(13)) === false);

  // Ô ngày để trống KHÔNG được hiểu là "đã rời trường từ lâu": tự đóng cửa
  // theo một dữ liệu thiếu là cắt nhầm quyền của gia đình đang gửi con.
  check('ngày rời trường để trống thì KHÔNG tự đóng', db.conHanXemHoSo(null) === true);
  check('ngày rời trường hỏng thì cũng KHÔNG tự đóng', db.conHanXemHoSo('không-phải-ngày') === true);
}

// ===========================================================================
console.log('\n[7] TỪ CHỐI THÌ AI CŨNG BỊ TỪ CHỐI, NHƯNG LỜI TỪ CHỐI THÌ KHÁC NHAU');
{
  // Gia đình của chính bé cần biết vì sao và làm gì tiếp. Người lạ gõ trúng mã
  // thì KHÔNG được biết mã đó là một đứa trẻ từng học ở đây.
  const nhaKhac = (await login('phuhuynh2', '123456')).cookie;

  const cuaNhaMinh = await req('GET', `/api/hocsinh-cu/${BE}`, { cookie: PH });
  check('gia đình của bé bị từ chối', cuaNhaMinh.status === 403, cuaNhaMinh.status);
  check('nhưng lời từ chối CHỈ ĐƯỜNG: nói rõ hạn và bảo liên hệ nhà trường',
    /12 tháng/.test(cuaNhaMinh.data?.error || '') && /liên hệ nhà trường/i.test(cuaNhaMinh.data?.error || ''),
    cuaNhaMinh.data?.error);

  const nguoiLa = await req('GET', `/api/hocsinh-cu/${BE}`, { cookie: nhaKhac });
  check('nhà khác cũng bị từ chối', nguoiLa.status === 403, nguoiLa.status);
  check('và lời từ chối của họ KHÔNG hé lộ bé từng học ở đây',
    !/12 tháng/.test(nguoiLa.data?.error || '') && !/rời trường/i.test(nguoiLa.data?.error || ''),
    nguoiLa.data?.error);

  // Hàm quan hệ mới phải có mặt trong `lib/db.js` — nó là thứ giữ cho lời từ
  // chối phân biệt được hai người. Chỉ kiểm CÓ MẶT ở đây: hỏi nó trực tiếp thì
  // tiến trình test lại mở một cơ sở dữ liệu khác với cơ sở dữ liệu của máy
  // chủ, và câu trả lời sẽ vô nghĩa. Hành vi thật đã đo bằng hai phép kiểm
  // ngay trên.
  const { createRequire } = await import('module');
  const { GOC } = await import('./_chung.mjs');
  const db = createRequire(import.meta.url)(path.join(GOC, 'lib', 'db.js'));
  check('lib/db.js công bố hàm hỏi quan hệ cha mẹ – con',
    typeof db.laPhuHuynhCuaBe === 'function');
  check('thiếu tham số thì trả false, không nổ', db.laPhuHuynhCuaBe(null, BE) === false);
}

// ===========================================================================
console.log('\n[8] ALBUM LỚP CŨ VÀ MÀN NĂM HỌC TRƯỚC CŨNG PHẢI THEO MỐC 12 THÁNG');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Đ44/Đ45 gom luật "gia đình còn xem hồ sơ 12 tháng sau khi bé rời trường"
  // về `db.canAccessStudent` và tự nhận đó là "một nguồn sự thật". Nhưng hai
  // họ đường dành riêng cho LỚP CŨ không đi qua hàm đó — chúng đi qua
  // `lsl.lopCuCuaPhuHuynh`, mà câu truy vấn ở đó chỉ hỏi quan hệ
  // `student_parents`. Quan hệ cha mẹ – con thì KHÔNG BAO GIỜ hết hạn.
  //
  // Hậu quả nặng hơn hồ sơ của chính bé đó: album nhóm là ảnh khuôn mặt của
  // CẢ NHÓM, phần lớn các bé trong ảnh vẫn đang học. Và cùng một tài khoản,
  // cùng một phiên: màn "Hồ sơ con đã ra trường" trả 403 kèm câu "chỉ tra cứu
  // được trong 12 tháng", còn màn Album vẫn trả về ảnh — nhà trường nhìn màn
  // thứ nhất sẽ tin là cửa đã đóng.
  //
  // Bộ canh mốc 12 tháng này trước đó chỉ gõ các đường gác bằng
  // `canAccessStudent`, nên nó không thể bắt được lỗ đó. Mục này thêm đúng hai
  // họ còn thiếu, và đo cả BYTE của tấm ảnh chứ không chỉ danh sách.
  const conn = new Database(path.join(DIR, 'school.db'));
  const NHOM_CU = 'c1';

  // Dọn lời TỪ CHỐI chia sẻ trong nhóm này trước.
  //
  // `db.locAnhChoNguoiXem` giấu một tấm ảnh CHƯA GẮN THẺ khỏi phụ huynh nếu
  // trong nhóm có bất kỳ bé nào đã nói KHÔNG (lib/db.js: `if
  // (!beDuocGan.length) return !nhomCoNguoiTuChoi`) — dữ liệu mẫu có đúng một
  // bé như vậy. Không dọn thì đường tải ảnh trả 403 ở CẢ HAI trạng thái, và
  // phép kiểm "rời trường 3 năm thì không tải được byte nào" xanh vì lý do
  // khác hẳn lý do nó nói. Đó đúng là kiểu bài canh rỗng.
  conn.prepare(`UPDATE student_consent SET chiaSeGiaDinh = 1
                WHERE studentId IN (SELECT studentId FROM student_class_periods WHERE classId = ?)
                   OR studentId IN (SELECT id FROM students WHERE classId = ?)`)
    .run(NHOM_CU, NHOM_CU);

  // Dựng một khoảng ĐÃ ĐÓNG cho bé — đúng thứ `lsl.ghiRoiLop` tự ghi khi văn
  // phòng cho bé nghỉ.
  const TU = '2023-08-01', DEN = '2024-05-31', NGAY_ANH = '2024-03-15';
  conn.prepare(`INSERT INTO student_class_periods (id, studentId, classId, tu, den)
                VALUES (?, ?, ?, ?, ?)`).run('scp-test-1', BE, NHOM_CU, TU, DEN);
  conn.close();

  // Cô của nhóm đăng một album có ẢNH THẬT, rồi lùi ngày album vào trong khoảng.
  const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const GV = (await login('giaovien', '123456')).cookie;
  const tao = await req('POST', '/api/albums', { cookie: GV, body: {
    title: 'Trung thu nhóm Chồi 2', photos: [{ dataUrl: ANH, caption: 'Bé rước đèn' }],
  } });
  check('cô đăng được album có ảnh thật để làm phép thử',
    tao.status === 201 && !!tao.data?.id, `${tao.status} ${JSON.stringify(tao.data).slice(0, 120)}`);
  const albumId = tao.data?.id;
  {
    const c2 = new Database(path.join(DIR, 'school.db'));
    c2.prepare('UPDATE albums SET date = ? WHERE id = ?').run(NGAY_ANH, albumId);
    c2.close();
  }
  const anhId = (tao.data?.photos || [])[0]?.id;

  // Đo cả ba trạng thái bằng cùng một bộ câu hỏi.
  async function doLopCu() {
    const ds = await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH });
    const coAlbum = (ds.data || []).some(a => a.id === albumId);
    const chiTiet = await req('GET', `/api/albums/${albumId}`, { cookie: PH });
    const anh = anhId
      ? await req('GET', `/api/albums/${albumId}/photo/${anhId}`, { cookie: PH })
      : { status: 0 };
    const nhc = await req('GET', '/api/namhoccu', { cookie: PH });
    const coNhom = ((nhc.data || {}).khoang || []).some(x => x.classId === NHOM_CU);
    // Và đường chi tiết của chính khoảng đó, không chỉ danh sách.
    const chiTietNhc = await req('GET', '/api/namhoccu/scp-test-1', { cookie: PH });
    return { coAlbum, chiTiet: chiTiet.status, anh: anh.status, coNhom, nhcChiTiet: chiTietNhc.status };
  }

  // (a) VẾ KHẲNG ĐỊNH — bé rời trường 1 tháng thì mọi thứ vẫn mở.
  // Không có vế này thì ba phép kiểm ở (b) xanh cả khi bản vá siết quá tay và
  // cắt luôn gia đình vừa mới chuyển trường tháng trước.
  choRoiTruong(BE, 1);
  const con = await doLopCu();
  check('rời trường 1 tháng — album lớp cũ VẪN có trong danh sách', con.coAlbum, con);
  check('rời trường 1 tháng — VẪN mở được album lớp cũ', con.chiTiet === 200, con);
  check('rời trường 1 tháng — VẪN tải được ảnh trong album đó', con.anh === 200, con);
  check('rời trường 1 tháng — màn Năm học trước VẪN thấy nhóm cũ', con.coNhom, con);
  check('rời trường 1 tháng — VẪN mở được nội dung nhóm cũ đó', con.nhcChiTiet === 200, con);

  // (b) RỜI TRƯỜNG ĐÃ 3 NĂM — cùng mốc với mục [3], mọi cửa phải đóng.
  choRoiTruong(BE, 36);
  const het = await doLopCu();
  check('rời trường 3 năm — album lớp cũ BIẾN KHỎI danh sách', !het.coAlbum, het);
  check('rời trường 3 năm — mở thẳng album lớp cũ bị từ chối', het.chiTiet === 403, het);
  check('rời trường 3 năm — KHÔNG tải được byte nào của ảnh trong album đó',
    het.anh === 403, het);
  check('rời trường 3 năm — màn Năm học trước không còn nhóm cũ', !het.coNhom, het);
  check('rời trường 3 năm — mở thẳng nội dung nhóm cũ cũng không được',
    het.nhcChiTiet === 404, het);

  // (c) VÀ ĐÚNG CÙNG LÚC ĐÓ, màn "Hồ sơ con đã ra trường" cũng đóng — hai màn
  // phải nói cùng một câu chuyện, đó chính là chỗ trước đây lệch nhau.
  const hoSo = await req('GET', `/api/hocsinh-cu/${BE}`, { cookie: PH });
  check('và màn "Hồ sơ con đã ra trường" cũng đóng cùng lúc — hai màn nói cùng một chuyện',
    hoSo.status === 403, hoSo.status);

  // (d) Cô và nhà trường KHÔNG bị vạ lây: album vẫn là của nhóm, cô vẫn mở được.
  const cuaCo = await req('GET', `/api/albums/${albumId}`, { cookie: GV });
  check('cô phụ trách nhóm vẫn mở được album đó — bản vá chỉ đóng đường của gia đình',
    cuaCo.status === 200, cuaCo.status);

  // (e) Dữ liệu KHÔNG bị xoá — đóng đường xem không phải là xoá.
  const conn3 = new Database(path.join(DIR, 'school.db'));
  const conAnh = conn3.prepare('SELECT COUNT(*) c FROM album_photos WHERE albumId = ?').get(albumId).c;
  conn3.close();
  check('ảnh trong album vẫn còn nguyên trong cơ sở dữ liệu', conAnh === 1, conAnh);
}

// ===========================================================================
console.log('\n[9] NHẬN XÉT ĐÃ GỠ HẲN — MÀN NÀY KHÔNG CÒN BÀY BẢNG `remarks` RA NỮA');
{
  // MỤC NÀY TỪNG CANH GÌ, VÀ VÌ SAO NAY ĐỔI CHIỀU (Đ252)
  //
  // Trước Đ252, màn "Hồ sơ con đã ra trường" đọc thẳng bảng `remarks`, và mục
  // này canh một lỗ đã vá ở đó: cô bấm Thu hồi một nhận xét ghi nhầm sang bé
  // khác, màn Nhận xét sạch, mà gia đình mở màn này thì dòng đó vẫn nằm nguyên
  // (Nghị định 13/2023 cho cha mẹ quyền yêu cầu chỉnh sửa và xoá dữ liệu cá
  // nhân của con — nhà trường làm đúng thao tác, app mới là chỗ không làm).
  //
  // Đ252 gỡ hẳn mã của phân hệ Nhận xét (chủ dự án duyệt 12/11), giữ nguyên
  // bảng. Không còn đường nào để cô ghi, sửa hay thu hồi, nên lỗ cũ không còn
  // hình dạng để quay lại — nhưng điều nó bảo vệ thì vẫn phải canh, và nay
  // chặt hơn: màn này KHÔNG được bày ra MỘT dòng nào của bảng `remarks`, dòng
  // đã thu hồi hay chưa cũng vậy, kể cả trên máy mà dòng cài đặt cũ còn ghi
  // phân hệ đang BẬT (đầu tệp). Dựng đúng cái máy cũ đó: hai dòng nhận xét
  // của bé nằm sẵn trong bảng, một dòng mang cờ thu hồi.
  choRoiTruong(BE, 1);            // kéo bé về trong hạn 12 tháng để mở được màn
  const GV9 = (await login('giaovien', '123456')).cookie;
  {
    const conn = new Database(path.join(DIR, 'school.db'));
    const them = conn.prepare(
      'INSERT INTO remarks (id, studentId, teacherId, date, content, rating, parentSeen) VALUES (?, ?, ?, ?, ?, ?, 0)');
    them.run('rm9_giu', BE, 't1', '2026-08-20', 'Hôm nay con tự xúc ăn hết bát cơm.', 'good');
    them.run('rm9_go', BE, 't1', '2026-08-21', 'Dòng này cô bấm nhầm sang bé khác.', 'good');
    conn.prepare(
      `INSERT INTO record_edits (bang, recordId, thuHoi, thuHoiLuc, thuHoiBoi)
       VALUES ('remarks', 'rm9_go', 1, '2026-08-21T09:00:00.000Z', 't1')`).run();
    conn.close();
  }

  // Đường cũ của phân hệ: hết với mọi vai, dù bảng cài đặt còn ghi BẬT.
  for (const [vai, cookie] of [['gia đình', PH], ['cô', GV9], ['quản trị', QT]]) {
    const goi = [
      await req('GET', `/api/remarks?studentId=${BE}`, { cookie }),
      await req('POST', '/api/remarks', { cookie, body: { studentId: BE, content: 'thử ghi', rating: 'good' } }),
      await req('PUT', '/api/remarks/rm9_giu', { cookie, body: { content: 'thử sửa' } }),
      await req('DELETE', '/api/remarks/rm9_giu', { cookie }),
    ];
    check(`${vai}: đọc / ghi / sửa / thu hồi nhận xét qua đường cũ đều 404`,
      goi.every(x => x.status === 404), goi.map(x => x.status));
  }

  // VÀ ĐÂY LÀ ĐIỀU MỤC NÀY ĐI TÌM.
  const hoSo = await req('GET', `/api/hocsinh-cu/${BE}`, { cookie: PH });
  check('gia đình mở được màn hồ sơ con đã ra trường', hoSo.status === 200, hoSo.status);
  check('MÀN HỒ SƠ CŨ: dòng cô đã thu hồi KHÔNG hiện với gia đình',
    !JSON.stringify(hoSo.data || {}).includes('rm9_go'), hoSo.data?.nhanXet);
  check('và dòng chưa thu hồi cũng không — bảng của tính năng đã gỡ không chảy ra màn khác',
    !JSON.stringify(hoSo.data || {}).includes('rm9_giu')
      && !JSON.stringify(hoSo.data || {}).includes('tự xúc ăn hết bát cơm'), hoSo.data?.nhanXet);
  // Trường `nhanXet` Ở LẠI trong câu trả lời, là một MẢNG RỖNG: màn hình (cả
  // bản đang nằm trong điện thoại đã cài app) đọc thẳng `d.nhanXet.length`, bỏ
  // trường đi là màn hồ sơ hỏng ở đúng dòng đó.
  check('câu trả lời vẫn giữ trường `nhanXet`, là mảng rỗng — màn hình cũ không vỡ',
    Array.isArray(hoSo.data?.nhanXet) && hoSo.data.nhanXet.length === 0, hoSo.data?.nhanXet);
  // Không gỡ quá tay: phần còn lại của hồ sơ vẫn đủ hình dạng như trước.
  const cc = hoSo.data?.chuyenCan || {};
  check('phần còn lại của hồ sơ không đổi hình dạng — bé, lời cô theo năm, chuyên cần',
    hoSo.data?.student?.id === BE && typeof hoSo.data.student.name === 'string'
      && Array.isArray(hoSo.data.baoCao)
      && ['tong', 'coMat', 'muon', 'vang'].every(k => typeof cc[k] === 'number')
      && Object.keys(hoSo.data).sort().join(',') === 'baoCao,chuyenCan,nhanXet,student',
    hoSo.data && Object.keys(hoSo.data));

  // GỠ MÃ, KHÔNG GỠ DỮ LIỆU. Vế này giữ cho việc gỡ không lặng lẽ biến thành
  // một đường xoá dữ liệu — đúng thứ Nguyên tắc số 1 cấm.
  const conn9 = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const conDong = conn9.prepare("SELECT id FROM remarks WHERE id IN ('rm9_giu', 'rm9_go') ORDER BY id").all().map(r => r.id);
  const conCo = conn9.prepare("SELECT thuHoi FROM record_edits WHERE bang = 'remarks' AND recordId = 'rm9_go'").get();
  conn9.close();
  check('cả hai dòng nhận xét VẪN NẰM NGUYÊN trên ổ đĩa sau mọi lời gọi ở trên',
    conDong.join(',') === 'rm9_giu,rm9_go', conDong);
  check('và cờ thu hồi của cô cũng còn nguyên', conCo?.thuHoi === 1, conCo);
}

// ===========================================================================
console.log('\n[+] THÔNG BÁO ĐÃ THU HỒI KHÔNG ĐƯỢC SỐNG LẠI Ở MÀN "NĂM HỌC TRƯỚC"');
{
  const NHOM_CU_TB = 'c1';
  // Cô bấm Thu hồi một thông báo gửi nhầm cho cả nhóm; nó biến khỏi màn Thông
  // báo (routes/notifications.js lọc đúng) nên cô và văn phòng tin là xong.
  // Tới lần chuyển năm học kế tiếp, khoảng lớp khép lại và phân hệ "Năm học
  // trước" — bật sẵn cho MỌI gia đình — in lại đúng dòng đó kèm tên người gửi,
  // mà không nút thu hồi nào chạm tới được nữa vì khoảng đã đóng.
  //
  // Thu hồi là lời hứa "cái này gia đình sẽ không đọc nữa". Giữ lời hứa ở một
  // màn rồi phá nó ở màn khác thì tệ hơn không hứa.
  // Thông báo cho MỘT nhóm chỉ cô phụ trách nhóm ấy gửi được (`audience:
  // 'class'` suy nhóm từ chính tài khoản cô), nên phải đăng nhập cô của c1.
  const GV1 = (await login('giaovien', '123456')).cookie;
  const tao = await req('POST', '/api/notifications', {
    cookie: GV1,
    body: {
      title: 'Gửi nhầm — nhắc đóng học phí nhóm khác',
      body: 'Dòng này lẽ ra không tới nhóm này.',
      category: 'Lớp học',
      audience: 'class',
      classId: NHOM_CU_TB,
    },
  });
  check('dựng được một thông báo cho nhóm cũ', tao.status === 200 || tao.status === 201,
    `${tao.status} ${JSON.stringify(tao.data).slice(0, 120)}`);
  const tbId = tao.data?.id;

  // Lùi ngày gửi vào TRONG khoảng bé còn học nhóm đó (2023-08-01 → 2024-05-31).
  // Màn "Năm học trước" chỉ in những gì rơi vào đúng khoảng ấy, mà app không có
  // đường nào đặt ngày gửi về quá khứ — ghi thẳng vào bảng, cùng cách đã dùng
  // cho ngày rời trường ở đầu tệp này.
  {
    const c3 = new Database(path.join(DIR, 'school.db'));
    c3.prepare('UPDATE notifications SET createdAt = ? WHERE id = ?')
      .run('2024-03-20T08:00:00.000Z', tbId);
    c3.close();
  }

  // Đối chứng: chưa thu hồi thì gia đình PHẢI thấy nó ở màn Năm học trước.
  // Không có vế này thì phép kiểm dưới xanh cả khi màn ấy hỏng hẳn.
  choRoiTruong(BE, 1);
  const truoc = await req('GET', '/api/namhoccu/scp-test-1', { cookie: PH });
  check('chưa thu hồi thì màn Năm học trước CÓ thấy thông báo đó',
    (truoc.data?.thongBao || []).some(x => x.id === tbId),
    (truoc.data?.thongBao || []).map(x => x.id));

  const thu = await req('DELETE', `/api/notifications/${tbId}`, { cookie: GV1 });
  check('thu hồi được thông báo', thu.status === 200, `${thu.status} ${JSON.stringify(thu.data)}`);

  const sau = await req('GET', '/api/namhoccu/scp-test-1', { cookie: PH });
  check('THU HỒI RỒI THÌ MÀN NĂM HỌC TRƯỚC KHÔNG CÒN IN NÓ RA NỮA',
    !(sau.data?.thongBao || []).some(x => x.id === tbId),
    (sau.data?.thongBao || []).map(x => `${x.id}:${x.title}`));
  check('và phần còn lại của màn đó vẫn dựng bình thường',
    sau.status === 200 && Array.isArray(sau.data?.thongBao), sau.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
