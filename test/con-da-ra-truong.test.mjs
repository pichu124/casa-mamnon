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
  taoBoDem, taoReq, taoLogin, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('con-da-ra-truong');
sinhDuLieu(DIR);
// `hocsinhcu` (màn "Hồ sơ con đã ra trường") TẮT SẴN từ Đ5 — nhà trường quyết.
// Bật tường minh ở đây vì mục [7] soi đúng lời từ chối của màn đó: luật quyền
// phải đúng vào lúc nhà trường bật lại, không phải chỉ đúng khi nó đang tắt.
batPhanHe(DIR, ['nhatky', 'hanhtrinh', 'dontra', 'hocphi', 'hocsinhcu']);
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
    const d = new Date();
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
  ['đón trả bé', `/api/dontra?studentId=${id}`],
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
  const mai = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const gui = await req('POST', '/api/medicine', { cookie: PH, body: {
    studentId: BE, fromDate: new Date().toISOString().slice(0, 10), toDate: mai,
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

  const luiThang = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };
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

sv.dung();
donThuMucTam(DIR);
tongKet();
