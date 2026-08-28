// Bài canh CAMBRIDGE & KẾT NỐI Ở NHÀ.
//
// Chạy bằng:  npm run test:cambridge
//
// PHÂN HỆ NÀY CHỦ YẾU LÀ MỘT BÀI TOÁN PHẠM VI
//
// Nội dung thì đơn giản. Chỗ khó là AI ĐỌC ĐƯỢC BÀI NÀO, và sai ở đó có hai
// kiểu, cả hai đều tệ theo cách khác nhau:
//
//   GỬI THIẾU — gia đình nhóm Lá 1 không thấy tờ của chính nhóm mình. Họ không
//   biết mình đang thiếu nên không ai báo, và văn phòng tưởng đã gửi rồi.
//
//   GỬI THỪA — tờ của nhóm Lá 1 hiện cho gia đình nhóm nhà trẻ. Nhìn thì vô
//   hại, nhưng đó là thư rác, và thư rác làm gia đình ngừng đọc MỌI THỨ khác,
//   kể cả thông báo thật sự quan trọng.
//
// Nên mục [3] đi đủ BA MỨC PHẠM VI nhân BA LOẠI NGƯỜI ĐỌC, canh cả hai chiều
// thấy và không thấy.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge');
sinhDuLieu(DIR);
batPhanHe(DIR, ['cambridge']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS2', 'quanlycs2');
khoaVaoCoSo(DIR, 'quanlycs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4050), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);      // Cấp 1 — cả trường
const VP2 = await vao('quanlycs2', mk3);      // Cấp 3 — chỉ cơ sở 2
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2
// CHỌN GIA ĐÌNH CHO ĐÚNG. Dữ liệu mẫu cho `phuhuynh` (p1) hai con ở HAI nhóm
// (s1 ở c1, s2 ở c2) và `phuhuynh2` (p2) một con ở c1 — nên cả hai đều thấy
// bài của c1 một cách hợp lệ. Muốn thử "gia đình nhóm khác" thì phải lấy một
// nhà không có con nào ở nhóm đang xét: p7 chỉ có bé s9 ở nhóm Nhà trẻ 1 (c4).
const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — con ở c1 và c2
const PH_NHA_TRE = (await login('ph.trang', '123456')).cookie;  // p7 — chỉ có con ở c4

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const danhSach = async (cookie, loai = '') =>
  ((await req('GET', `/api/cambridge${loai ? `?loai=${loai}` : ''}`, { cookie })).data?.bai || []);
const thay = async (cookie, id) => (await danhSach(cookie)).some(b => b.id === id);

async function dang(body, cookie = VP, congBo = true) {
  const r = await req('POST', '/api/cambridge', { cookie, body });
  if (r.status !== 201) return r;
  if (congBo) await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie, body: {} });
  return r;
}

// Nhóm c1 ở cơ sở 1, c2 chuyển sang cơ sở 2 để có hai cơ sở thật.
await req('PUT', '/api/admin/classes/c2/campus', { cookie: VP, body: { campusId: 'cs2' } });

// ===========================================================================
console.log('\n[1] Văn phòng đăng, cô và gia đình chỉ đọc');
{
  const r = await req('POST', '/api/cambridge', {
    cookie: VP,
    body: { loai: 'cambridge', tieuDe: 'Chủ điểm Animals', noiDung: 'Tuần này lớp học tên các con vật.', phamVi: 'truong' },
  });
  check('văn phòng đăng được', r.status === 201, r.data);
  check('bài mới mặc định là NHÁP, chưa gửi gia đình', r.data?.daCongBo === false, r.data?.daCongBo);

  const co = await req('POST', '/api/cambridge', {
    cookie: GV, body: { tieuDe: 'Cô tự đăng', phamVi: 'truong' },
  });
  check('CÔ KHÔNG đăng được', co.status === 403, co.status);
  check('và câu từ chối chỉ đường sang phần thuộc về cô',
    /Cùng con ở nhà/i.test(co.data?.error || ''), co.data?.error);

  const ph = await req('POST', '/api/cambridge', {
    cookie: PH, body: { tieuDe: 'Phụ huynh tự đăng', phamVi: 'truong' },
  });
  check('phụ huynh cũng không', ph.status === 403, ph.status);

  check('NHÁP THÌ GIA ĐÌNH CHƯA ĐỌC ĐƯỢC', !(await thay(PH, r.data.id)));
  check('cô cũng chưa', !(await thay(GV, r.data.id)));
  check('nhưng văn phòng thấy nháp của mình', await thay(VP, r.data.id));

  const cb = await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
  check('công bố được', cb.status === 200 && cb.data?.daCongBo === true, cb.data);
  check('công bố rồi thì gia đình đọc được', await thay(PH, r.data.id));

  const lai = await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
  check('công bố hai lần thì báo đã công bố rồi', lai.status === 400, lai.status);

  const thu = await req('POST', `/api/cambridge/${r.data.id}/thu-hoi`, { cookie: VP, body: {} });
  check('thu hồi được', thu.status === 200, thu.data);
  check('gia đình không còn thấy', !(await thay(PH, r.data.id)));
  check('nhưng chữ đã viết CÒN NGUYÊN — thu hồi không phải xoá',
    (await danhSach(VP)).some(b => b.id === r.data.id && /tên các con vật/.test(b.noiDung || '')));
  await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
}

// ===========================================================================
console.log('\n[2] Bài rỗng thì không gửi được tới gia đình');
{
  const r = await req('POST', '/api/cambridge', {
    cookie: VP, body: { tieuDe: 'Bài chưa có gì', phamVi: 'truong' },
  });
  const cb = await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
  check('bài không có nội dung lẫn ảnh thì chưa công bố được', cb.status === 400, cb.status);
  check('và nói rõ vì sao', /nội dung hay ảnh/i.test(cb.data?.error || ''), cb.data?.error);

  const thieuTen = await req('POST', '/api/cambridge', { cookie: VP, body: { tieuDe: '  ', phamVi: 'truong' } });
  check('bài không tiêu đề thì không tạo được', thieuTen.status === 400, thieuTen.status);

  const loaiLa = await req('POST', '/api/cambridge', {
    cookie: VP, body: { tieuDe: 'x', loai: 'linh-tinh', phamVi: 'truong' },
  });
  check('loại bài lạ thì từ chối', loaiLa.status === 400, loaiLa.status);
}

// ===========================================================================
console.log('\n[3] BA MỨC PHẠM VI nhân BA LOẠI NGƯỜI ĐỌC');
{
  const caTruong = await dang({ tieuDe: 'CẢ TRƯỜNG', noiDung: 'Ai cũng đọc được', phamVi: 'truong' });
  const coSo1 = await dang({ tieuDe: 'CƠ SỞ 1', noiDung: 'Chỉ cơ sở 1', phamVi: 'coso', campusId: 'cs1' });
  const nhomC1 = await dang({ tieuDe: 'NHÓM C1', noiDung: 'Chỉ nhóm c1', phamVi: 'nhom', classId: 'c1' });
  const nhomC2 = await dang({ tieuDe: 'NHÓM C2', noiDung: 'Chỉ nhóm c2', phamVi: 'nhom', classId: 'c2' });
  const nhaTre = await dang({ tieuDe: 'NHÓM NHÀ TRẺ', noiDung: 'Chỉ nhóm c4', phamVi: 'nhom', classId: 'c4' });
  check('đăng đủ năm bài để thử',
    [caTruong, coSo1, nhomC1, nhomC2, nhaTre].every(r => r.status === 201),
    [caTruong, coSo1, nhomC1, nhomC2, nhaTre].map(r => r.status));

  // --- Gia đình bé s1, nhóm c1, cơ sở 1 ---
  check('gia đình THẤY bài cả trường', await thay(PH, caTruong.data.id));
  check('gia đình THẤY bài của cơ sở mình', await thay(PH, coSo1.data.id));
  check('gia đình THẤY bài của nhóm con mình', await thay(PH, nhomC1.data.id));
  check('gia đình có con ở c2 nữa thì THẤY luôn bài của c2 — đúng, một nhà có thể có hai nhóm',
    await thay(PH, nhomC2.data.id));
  check('GIA ĐÌNH KHÔNG THẤY bài của nhóm không có con mình — đây là chỗ sinh ra thư rác',
    !(await thay(PH, nhaTre.data.id)));
  check('và chiều ngược lại: gia đình nhà trẻ KHÔNG thấy bài của nhóm c1',
    !(await thay(PH_NHA_TRE, nhomC1.data.id)));
  check('nhưng THẤY bài của nhóm con mình', await thay(PH_NHA_TRE, nhaTre.data.id));
  check('và vẫn THẤY bài cả trường', await thay(PH_NHA_TRE, caTruong.data.id));

  // --- Cô nhóm c2, nay thuộc cơ sở 2 ---
  check('cô nhóm c2 thấy bài cả trường', await thay(GV2, caTruong.data.id));
  check('cô nhóm c2 KHÔNG thấy bài của cơ sở 1', !(await thay(GV2, coSo1.data.id)));
  check('cô nhóm c2 KHÔNG thấy bài của nhóm c1', !(await thay(GV2, nhomC1.data.id)));
  check('nhưng THẤY bài của nhóm mình', await thay(GV2, nhomC2.data.id));

  // --- Quản lý cơ sở 2 (Cấp 3) ---
  check('quản lý cơ sở 2 thấy bài cả trường', await thay(VP2, caTruong.data.id));
  check('quản lý cơ sở 2 KHÔNG thấy bài của cơ sở 1', !(await thay(VP2, coSo1.data.id)));
  check('quản lý cơ sở 2 KHÔNG thấy bài của nhóm thuộc cơ sở 1', !(await thay(VP2, nhomC1.data.id)));
  check('nhưng THẤY bài của nhóm thuộc cơ sở mình', await thay(VP2, nhomC2.data.id));

  // --- Quản trị Cấp 1 thấy hết ---
  check('quản trị toàn hệ thống thấy tất cả',
    (await Promise.all([caTruong, coSo1, nhomC1, nhomC2].map(r => thay(VP, r.data.id)))).every(Boolean));
}

// ===========================================================================
console.log('\n[4] Quản lý MỘT cơ sở không gửi được cho cả trường');
{
  const caTruong = await req('POST', '/api/cambridge', {
    cookie: VP2, body: { tieuDe: 'Cấp 3 gửi cả trường', noiDung: 'x', phamVi: 'truong' },
  });
  check('quản lý một cơ sở KHÔNG gửi được cho cả trường', caTruong.status === 400, caTruong.status);
  check('và câu từ chối chỉ rõ họ gửi được cho ai',
    /cơ sở mình|một nhóm/i.test(caTruong.data?.error || ''), caTruong.data?.error);

  const coSoKhac = await req('POST', '/api/cambridge', {
    cookie: VP2, body: { tieuDe: 'Cấp 3 gửi cơ sở khác', noiDung: 'x', phamVi: 'coso', campusId: 'cs1' },
  });
  check('cũng KHÔNG gửi được cho cơ sở khác', coSoKhac.status === 400, coSoKhac.status);

  const nhomKhac = await req('POST', '/api/cambridge', {
    cookie: VP2, body: { tieuDe: 'Cấp 3 gửi nhóm cơ sở khác', noiDung: 'x', phamVi: 'nhom', classId: 'c1' },
  });
  check('và KHÔNG gửi được cho nhóm của cơ sở khác', nhomKhac.status === 400, nhomKhac.status);

  const cuaMinh = await req('POST', '/api/cambridge', {
    cookie: VP2, body: { tieuDe: 'Cấp 3 gửi cơ sở mình', noiDung: 'x', phamVi: 'coso', campusId: 'cs2' },
  });
  check('nhưng gửi được cho cơ sở của mình', cuaMinh.status === 201, cuaMinh.data);

  const thieuCoSo = await req('POST', '/api/cambridge', {
    cookie: VP, body: { tieuDe: 'x', noiDung: 'x', phamVi: 'coso' },
  });
  check('chọn phạm vi cơ sở mà không chọn cơ sở nào thì từ chối', thieuCoSo.status === 400, thieuCoSo.status);
}

// ===========================================================================
console.log('\n[5] Ảnh đi qua canh quyền, không phục vụ tĩnh');
{
  const r = await dang({
    tieuDe: 'Bài có ảnh của nhóm c1', noiDung: 'x', phamVi: 'nhom', classId: 'c1', anh: [ANH, ANH],
  });
  check('đăng được bài kèm hai ảnh', r.status === 201 && (r.data?.anh || []).length === 2, r.data?.anh);

  const file = r.data.anh[0];
  const lay = async (cookie) => {
    const res = await fetch(`${sv.BASE}/api/cambridge/anh/${file}`, { headers: cookie ? { cookie } : {} });
    return res.status;
  };
  // Dữ liệu mẫu có bé s3 ở nhóm c1 mà gia đình đã NÓI KHÔNG với chia sẻ ảnh
  // (data/seed.js:622), nên bài của c1 mặc định giữ ảnh lại với gia đình —
  // xem mục [10]. Ở đây chỉ canh phần PHẠM VI, nên nói rõ ô tích để tách hai
  // luật ra khỏi nhau: bài này ảnh không có mặt bé.
  await req('PUT', `/api/cambridge/${r.data.id}`, { cookie: VP, body: { anhCoMatBe: false } });
  check('gia đình của nhóm đó xem được ảnh', await lay(PH) === 200);
  check('cô của nhóm đó xem được', await lay(GV) === 200);
  check('GIA ĐÌNH NHÓM KHÁC KHÔNG xem được', await lay(PH_NHA_TRE) === 403);
  check('cô nhóm khác KHÔNG xem được', await lay(GV2) === 403);
  check('người chưa đăng nhập cũng không', [401, 403].includes(await lay(null)));

  const la = await fetch(`${sv.BASE}/api/cambridge/anh/${'c'.repeat(32)}.jpg`, { headers: { cookie: VP } });
  check('ảnh không thuộc bài nào thì 404', la.status === 404, la.status);

  const qua = await req('POST', '/api/cambridge', {
    cookie: VP, body: { tieuDe: 'Quá nhiều ảnh', phamVi: 'truong', anh: Array(9).fill(ANH) },
  });
  check('quá số ảnh cho phép thì từ chối', qua.status === 400, qua.status);
}

// ===========================================================================
console.log('\n[6] Sửa bài, và lọc theo loại');
{
  const r = await dang({ loai: 'ket-noi', tieuDe: 'Kết nối tuần này', noiDung: 'Gợi ý làm cùng con', phamVi: 'truong' });
  const sua = await req('PUT', `/api/cambridge/${r.data.id}`, {
    cookie: VP, body: { noiDung: 'Đã sửa nội dung' },
  });
  check('sửa được', sua.status === 200 && /Đã sửa/.test(sua.data?.noiDung || ''), sua.data);
  check('sửa mà không gửi tiêu đề thì giữ nguyên tiêu đề cũ',
    sua.data?.tieuDe === 'Kết nối tuần này', sua.data?.tieuDe);

  const chiKetNoi = await danhSach(PH, 'ket-noi');
  check('lọc theo loại "Kết nối ở nhà" chỉ ra bài đúng loại',
    chiKetNoi.length > 0 && chiKetNoi.every(b => b.loai === 'ket-noi'),
    chiKetNoi.map(b => b.loai));
  const chiCam = await danhSach(PH, 'cambridge');
  check('lọc theo loại "Cambridge" cũng vậy',
    chiCam.length > 0 && chiCam.every(b => b.loai === 'cambridge'), chiCam.map(b => b.loai));

  const coSua = await req('PUT', `/api/cambridge/${r.data.id}`, { cookie: GV, body: { noiDung: 'cô sửa' } });
  check('cô KHÔNG sửa được bài của văn phòng', coSua.status === 403, coSua.status);
}

// ===========================================================================
console.log('\n[7] Danh mục nhóm và cơ sở KHÔNG đi ra màn hình gia đình');
{
  const phD = (await req('GET', '/api/cambridge', { cookie: PH })).data;
  check('gia đình không nhận danh sách nhóm của cả trường', phD.nhom === undefined, phD.nhom);
  check('cũng không nhận danh sách cơ sở', phD.coSo === undefined, phD.coSo);
  check('và màn hình biết mình không được đăng', phD.duocDang === false, phD.duocDang);

  const vpD = (await req('GET', '/api/cambridge', { cookie: VP })).data;
  check('văn phòng thì nhận đủ để dựng ô chọn',
    Array.isArray(vpD.nhom) && Array.isArray(vpD.coSo), { nhom: vpD.nhom?.length, coSo: vpD.coSo?.length });
}

// ===========================================================================
console.log('\n[8] Lược đồ để RỘNG vì nhà trường chưa chốt nội dung');
{
  const sql = fs.readFileSync(path.join(GOC, 'modules/cambridge/schema.sql'), 'utf8');
  // BỎ CHÚ THÍCH TRƯỚC RỒI MỚI TÁCH CÂU. Tách theo dấu chấm phẩy trước thì một
  // dấu ';' nằm trong chú thích tiếng Việt sẽ cắt câu lệnh làm đôi, và bài test
  // báo đỏ một chỗ không hề sai.
  const cauLenh = sql.replace(/--[^\n]*/g, '').split(';').map(c => c.trim()).filter(Boolean);
  check('chỉ CREATE ... IF NOT EXISTS',
    cauLenh.every(c => /^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(c)),
    cauLenh.find(c => !/^CREATE/i.test(c))?.slice(0, 80));
  check('mọi bảng mang tiền tố phân hệ',
    (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) || []).every(x => /cambridge_/.test(x)));
  check('không khoá cứng thành các ô riêng của một mẫu chưa có',
    !/tuVung|chuDiem|baiHat|videoUrl/i.test(sql), sql.slice(0, 100));
  check('có nói rõ vì sao để rộng', /chưa chốt nội dung/i.test(sql));
}

// ===========================================================================
console.log('\n[9] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const truoc = (await danhSach(VP)).length;
  const tat = await req('PUT', '/api/admin/modules/cambridge', { cookie: VP, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);
  const goi = await req('GET', '/api/cambridge', { cookie: PH });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/cambridge', { cookie: VP, body: { enabled: true } });
  check('bật lại là chạy tiếp, và bài viết còn nguyên',
    (await danhSach(VP)).length === truoc, { truoc, sau: (await danhSach(VP)).length });
}

// ===========================================================================
console.log('\n[10] ẢNH CỦA BÀI PHẢI ĐI QUA LUẬT ẢNH NHÓM');
{
  // Bản đầu của phân hệ này chỉ hỏi PHẠM VI rồi trả thẳng các byte của tấm
  // ảnh. Phạm vi trả lời câu "ai đọc được BÀI này"; luật ảnh nhóm trả lời một
  // câu khác hẳn — "ảnh của con nhà này có được sang nhà khác không".
  //
  // Dữ liệu mẫu đã có sẵn tình huống thật: bé s3 ở nhóm c1, gia đình ghi rõ
  // "xin không đăng ảnh con lên nhóm chung" (data/seed.js:622).
  const r = await dang({
    loai: 'ket-noi', tieuDe: 'Tuần này nhóm mình gấp khăn',
    noiDung: 'Vài tấm hình các bé đang làm việc.', phamVi: 'nhom', classId: 'c1', anh: [ANH],
  });
  check('đăng được bài có ảnh', r.status === 201, r.data);
  const baiId = r.data.id;
  const tenAnh = (r.data.anh || [])[0];
  check('bài có đúng một tấm ảnh', !!tenAnh, r.data.anh);

  const anhCua = async (cookie) => {
    const b = (await danhSach(cookie)).find(x => x.id === baiId);
    return (b && b.anh) || [];
  };
  const tai = async (cookie) => (await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie })).status;

  // MẶC ĐỊNH LÀ PHÍA ĐÓNG. Không tích gì cả thì app coi như trong ảnh có bé,
  // và trong nhóm có nhà nói không, nên ảnh giữ lại với gia đình.
  check('mặc định coi như ảnh CÓ mặt bé', r.data.anhCoMatBe === true, r.data.anhCoMatBe);
  check('nên ảnh tạm ẩn với gia đình', (await anhCua(PH)).length === 0, await anhCua(PH));

  // ĐÂY MỚI LÀ CHỐT CHẶN THẬT. Lọc ở đường liệt kê chỉ làm ảnh không hiện trên
  // màn hình; ai biết tên tệp vẫn tải thẳng được — mà tên tệp thì gia đình đó
  // đã nhận ở lần xem TRƯỚC, trước khi nhà kia rút đồng ý.
  const byte = await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie: PH });
  check('VÀ KHÔNG TẢI ĐƯỢC TỆP ẢNH DÙ BIẾT TÊN TỆP', byte.status === 403, byte.status);
  check('câu từ chối nói tiếng của trường, không lộ thuật ngữ',
    /chưa đồng ý chia sẻ/i.test(String(byte.data?.error || '')), byte.data);

  // Cô và văn phòng vẫn thấy — họ là người đăng, giấu ảnh khỏi họ thì không ai
  // sửa được bài.
  check('cô vẫn thấy ảnh', (await anhCua(GV)).length === 1, await anhCua(GV));
  check('văn phòng vẫn thấy ảnh', (await anhCua(VP)).length === 1, await anhCua(VP));
  check('văn phòng tải được tệp ảnh', (await tai(VP)) === 200);

  // Và màn hình của họ phải NÓI RÕ vì sao, kèm cách làm nó hiện lại. Ẩn mà
  // không giải thích là chỗ cô mất lòng tin vào app nhanh nhất.
  const baiVP = (await danhSach(VP)).find(x => x.id === baiId);
  check('màn của văn phòng nói rõ ảnh đang tạm ẩn', !!baiVP.nhacAnhTamAn, Object.keys(baiVP));
  check('và nói luôn cách làm ảnh hiện lại',
    /không có mặt bé/i.test(baiVP.nhacAnhTamAn || ''), baiVP.nhacAnhTamAn);
  const baiPH = (await danhSach(PH)).find(x => x.id === baiId);
  check('nhưng KHÔNG kể chuyện nội bộ đó cho gia đình', !baiPH.nhacAnhTamAn, Object.keys(baiPH));
  check('và không lộ cả trạng thái ô tích cho gia đình',
    baiPH.anhCoMatBe === undefined, baiPH.anhCoMatBe);

  // ĐƯỜNG RA. Không có nó thì luật này không phải "tạm ẩn" mà là gỡ bỏ tính
  // năng: một nhà nói không là mọi ảnh Cambridge chết vĩnh viễn.
  const tich = await req('PUT', `/api/cambridge/${baiId}`, { cookie: VP, body: { anhCoMatBe: false } });
  check('văn phòng tích được ô "ảnh không có mặt bé"', tich.data?.anhCoMatBe === false, tich.data?.anhCoMatBe);
  check('tích xong thì ảnh hiện với gia đình', (await anhCua(PH)).length === 1, await anhCua(PH));
  check('và tải được tệp ảnh', (await tai(PH)) === 200);

  // Bỏ tích là quay lại phía đóng ngay, không phải làm gì thêm.
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: VP, body: { anhCoMatBe: true } });
  check('bỏ tích thì ảnh đóng lại ngay', (await anhCua(PH)).length === 0, await anhCua(PH));

  // KHÔNG GỬI TRƯỜNG NÀY = KHÔNG ĐỤNG TỚI. Màn hình cũ còn trong bộ nhớ đệm
  // điện thoại không biết ô tích này; nó sửa tiêu đề mà không được vô tình
  // lật ngược quyết định đã ghi.
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: VP, body: { anhCoMatBe: false } });
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: VP, body: { tieuDe: 'Đổi mỗi tiêu đề' } });
  const sauKhiSuaTen = (await danhSach(VP)).find(x => x.id === baiId);
  check('màn hình cũ sửa tiêu đề KHÔNG lật ngược ô tích',
    sauKhiSuaTen.anhCoMatBe === false, sauKhiSuaTen.anhCoMatBe);

  // Bé được gia đình đồng ý lại thì ảnh CÓ mặt bé cũng hiện lại.
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: VP, body: { anhCoMatBe: true } });
  await req('PUT', '/api/admin/students/s3/dong-y', { cookie: VP, body: { chiaSeGiaDinh: true } });
  check('cả nhóm đồng ý thì ảnh có mặt bé cũng hiện', (await anhCua(PH)).length === 1, await anhCua(PH));
  await req('PUT', '/api/admin/students/s3/dong-y', { cookie: VP, body: { chiaSeGiaDinh: false } });

  // Bài CẢ TRƯỜNG kèm ảnh trẻ chính là thứ mà lời từ chối đó cấm, nên nó cũng
  // phải đóng — dù nhà nói không nằm ở một nhóm khác hẳn.
  const rt = await dang({ loai: 'cambridge', tieuDe: 'Hội chợ cuối năm', phamVi: 'truong', anh: [ANH] });
  const anhTruong = async (cookie) => {
    const b = (await danhSach(cookie)).find(x => x.id === rt.data.id);
    return (b && b.anh) || [];
  };
  check('bài cả trường cũng giữ ảnh lại khi trong trường có nhà nói không',
    (await anhTruong(PH_NHA_TRE)).length === 0, await anhTruong(PH_NHA_TRE));
  check('nhưng CHỮ thì vẫn tới gia đình — chỉ ảnh bị giữ lại',
    !!(await danhSach(PH_NHA_TRE)).find(x => x.id === rt.data.id));

  // Bài KHÔNG có ảnh thì không bao giờ mang lời nhắc — nhắc thừa cũng là nhiễu.
  const rk = await dang({ loai: 'cambridge', tieuDe: 'Chỉ có chữ', noiDung: 'Không kèm ảnh nào.', phamVi: 'nhom', classId: 'c1' });
  const baiKhongAnh = (await danhSach(VP)).find(x => x.id === rk.data.id);
  check('bài không ảnh thì không có lời nhắc thừa', !baiKhongAnh.nhacAnhTamAn, baiKhongAnh.nhacAnhTamAn);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
