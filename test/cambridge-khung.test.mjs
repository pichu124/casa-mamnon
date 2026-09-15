// Bài canh CAMBRIDGE THEO MẪU TRƯỜNG GỬI 07/09 (Đ143): Block / Week / lứa tuổi,
// năm ô nội dung, tệp PDF / Word kèm bài, và báo gia đình đúng lứa.
//
// Chạy bằng:  npm run test:cambridge-khung
//
// HAI CHỖ DỄ SAI NHẤT, cả hai đều canh ở đây:
//
//   LỨA TUỔI LỌC Ở TẦNG DỮ LIỆU. Lớp Montessori trộn 3–5 tuổi, nhưng Cambridge
//   chỉ có hai lứa. Tờ của lứa 3–4 tới nhà có bé 4–5 là thư rác — cùng lý do
//   với phạm vi nhóm ở bài canh cũ. Lọc ở màn hình là gia đình vẫn nhận được
//   gói JSON, và tệp kèm bài vẫn tải được.
//
//   TỆP KHÔNG PHỤC VỤ TĨNH. Worksheet thì không có mặt bé, nhưng thư gửi gia
//   đình của một nhóm có thể kể chuyện của nhóm đó. Tải tệp đi qua đúng luật
//   phạm vi của bài, kiểm quyền TRƯỚC khi kiểm tệp có tồn tại.
import { thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge-khung');
sinhDuLieu(DIR);
batPhanHe(DIR, ['cambridge', 'thongbao']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4643), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);
const GV = (await login('giaovien', '123456')).cookie;       // cô nhóm c1
// Dữ liệu mẫu, tính theo luật BA LỨA từ Đ187:
//   s1 (nhóm Chồi, ~4 tuổi rưỡi)  → lứa 4–5
//   s2 (nhóm Lá, vừa tròn 5 tuổi) → lứa 5–6
//   s5 (nhà `ph.lan`, 3 tuổi 10 tháng) → lứa 3–4
//   s9 (nhà `ph.trang`, 14 tháng) → chưa vào chương trình
// Nhà `phuhuynh` có CẢ s1 lẫn s2 nên nó là ca hiếm mà quý: một gia đình có
// con ở HAI lứa khác nhau. Giữ tên biến PH_45 vì s1 vẫn là lứa 4–5.
const PH_45 = (await login('phuhuynh', '123456')).cookie;
const PH_34 = (await login('ph.lan', '123456')).cookie;
const PH_BE = (await login('ph.trang', '123456')).cookie;

const danhSach = async (cookie) => (await req('GET', '/api/cambridge', { cookie })).data || {};
const thay = async (cookie, id) => ((await danhSach(cookie)).bai || []).some(b => b.id === id);

async function dang(body, congBo = true) {
  const r = await req('POST', '/api/cambridge', { cookie: VP, body: { loai: 'cambridge', phamVi: 'truong', ...body } });
  if (r.status !== 201) return r;
  if (congBo) r.congBo = await req('POST', `/api/cambridge/${r.data.id}/cong-bo`, { cookie: VP, body: {} });
  return r;
}

// Tệp thử: một PDF tối giản và một "Word" tối giản (ZIP có thư mục word/).
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0, 8, 0]), Buffer.alloc(24, 0), Buffer.from('word/document.xml<w:document/>'), Buffer.alloc(16, 0)]);
const duLieu = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ===========================================================================
console.log('\n[1] Block của chương trình — văn phòng soạn, cô và gia đình đọc');
let BLOCK1;
{
  const co = await req('POST', '/api/cambridge/block', { cookie: GV, body: { ten: 'Block 1' } });
  check('cô KHÔNG tạo được block', co.status === 403, co.status);
  const thieu = await req('POST', '/api/cambridge/block', { cookie: VP, body: { ten: '' } });
  check('thiếu tên thì từ chối và nói rõ', thieu.status === 400 && /tên block/i.test(thieu.data?.error || ''), thieu.data);
  // VÍ DỤ LỨA LẠ PHẢI ĐỔI THEO CHƯƠNG TRÌNH THẬT.
  //
  // Chỗ này từng dùng '5-6' làm ví dụ lứa không hợp lệ. Ngày 15/09 nhà trường
  // xác nhận Cambridge *có tài liệu riêng* cho 5–6 tuổi, nên '5-6' nay là một
  // lứa thật. Giữ nguyên ví dụ cũ là bài canh sẽ đỏ vì chương trình mở rộng
  // đúng hướng — đổi sang một chuỗi thật sự không có trong chương trình.
  const luaLa = await req('POST', '/api/cambridge/block', { cookie: VP, body: { ten: 'Block X', luaTuoi: '6-7' } });
  check('lứa tuổi lạ thì từ chối', luaLa.status === 400, luaLa.data);
  check('và câu từ chối kể đủ ba lứa đang có', /5–6/.test(luaLa.data?.error || ''), luaLa.data);
  const nguoc = await req('POST', '/api/cambridge/block', { cookie: VP, body: { ten: 'Block X', tuNgay: '2026-10-01', denNgay: '2026-09-01' } });
  check('ngày kết thúc trước ngày bắt đầu thì từ chối', nguoc.status === 400, nguoc.data);

  const r = await req('POST', '/api/cambridge/block', {
    cookie: VP,
    body: { ten: 'Block 1', luaTuoi: '3-4', tuNgay: '2026-09-08', denNgay: '2026-10-17', mucTieu: 'Làm quen trường lớp, đếm 1–5', thuTu: 1 },
  });
  check('văn phòng tạo được block', r.status === 201 && r.data?.ten === 'Block 1', r.data);
  BLOCK1 = r.data?.id;
  const sua = await req('PUT', `/api/cambridge/block/${BLOCK1}`, { cookie: VP, body: { mucTieu: 'Làm quen trường lớp, đếm 1–5, hát Tidy Up' } });
  check('sửa được mục tiêu', sua.status === 200 && /Tidy Up/.test(sua.data?.mucTieu || ''), sua.data);
  const b45 = await req('POST', '/api/cambridge/block', { cookie: VP, body: { ten: 'Block 1 (4–5)', luaTuoi: '4-5', thuTu: 2 } });
  check('tạo được block lứa 4–5', b45.status === 201, b45.data);

  const dsVP = (await danhSach(VP)).blocks || [];
  check('văn phòng nhận đủ hai block', dsVP.length === 2, dsVP.map(b => b.ten));
  const dsGV = (await danhSach(GV)).blocks || [];
  check('cô cũng nhận đủ hai — cô cần biết cả hai lứa', dsGV.length === 2, dsGV.map(b => b.ten));
  const ds34 = (await danhSach(PH_34)).blocks || [];
  check('nhà có bé 3–4 chỉ nhận block 3–4', ds34.length === 1 && ds34[0].luaTuoi === '3-4', ds34.map(b => b.ten));
  const ds45 = (await danhSach(PH_45)).blocks || [];
  check('nhà có bé 4–5 chỉ nhận block 4–5', ds45.length === 1 && ds45[0].luaTuoi === '4-5', ds45.map(b => b.ten));
  const dsBe = (await danhSach(PH_BE)).blocks || [];
  check('nhà có bé 14 tháng không nhận block nào', dsBe.length === 0, dsBe.map(b => b.ten));
  const cua = (await danhSach(PH_34)).luaTuoiCuaCon || [];
  check('gia đình được nói rõ con mình thuộc lứa nào', cua.length === 1 && cua[0].luaTuoi === '3-4' && /3–4/.test(cua[0].tenLuaTuoi), cua);
  check('cô KHÔNG nhận trường "lứa của con" — nó là của gia đình', (await danhSach(GV)).luaTuoiCuaCon === undefined);
}

// ===========================================================================
console.log('\n[1b] LỨA THỨ BA 5–6, và chuỗi rỗng mang hai nghĩa ngược nhau');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Nhà trường trả lời ngày 15/09: Cambridge *"có tài liệu riêng"* cho 5–6
  // tuổi. Trước đó mã gộp mọi bé từ 48 tháng trở lên vào lứa 4–5 vì đó là lứa
  // lớn nhất chương trình có — đúng theo lời trường hôm 07/09, nay đã sửa.
  //
  // Đây là loại thay đổi dễ làm hỏng phía KHÔNG ai nhìn: bé 5 tuổi hôm qua còn
  // nhận bài 4–5, hôm nay thì không. Không mất dữ liệu gì, nhưng nếu màn hình
  // im lặng thì gia đình chỉ thấy một khoảng trắng và không hiểu vì sao.
  const b56 = await req('POST', '/api/cambridge/block', {
    cookie: VP, body: { ten: 'Block 1 (5–6)', luaTuoi: '5-6', thuTu: 3 },
  });
  check('LỨA 5–6 NAY LÀ LỨA THẬT — tạo được block cho nó', b56.status === 201, b56.data);

  const dm = await danhSach(VP);
  const maLua = (dm.luaTuoi || []).map(l => l.ma);
  check('ô chọn lúc soạn bài mời đủ ba lứa cộng "mọi lứa"',
    maLua.length === 4 && ['', '3-4', '4-5', '5-6'].every(m => maLua.includes(m)), maLua);

  // Bé vừa tròn 5 tuổi chuyển sang lứa mới.
  const con45 = (await danhSach(PH_45)).luaTuoiCuaCon || [];
  const luaCon = con45.map(c => c.luaTuoi).sort();
  check('MỘT NHÀ CÓ CON Ở HAI LỨA thì được nói đủ cả hai',
    luaCon.length === 2 && luaCon[0] === '4-5' && luaCon[1] === '5-6', con45);
  const ds45 = (await danhSach(PH_45)).blocks || [];
  check('và nhận block của CẢ HAI lứa ấy, không phải chỉ một',
    ds45.length === 2 && ds45.some(b => b.luaTuoi === '4-5') && ds45.some(b => b.luaTuoi === '5-6'),
    ds45.map(b => `${b.ten}/${b.luaTuoi}`));
  check('nhà có bé 3–4 KHÔNG bị kéo thêm block 5–6',
    !((await danhSach(PH_34)).blocks || []).some(b => b.luaTuoi === '5-6'));

  // CHUỖI RỖNG MANG HAI NGHĨA NGƯỢC NHAU.
  //
  // Gắn vào một BÀI thì '' là "dùng cho mọi lứa" — rộng nhất. Gắn vào một BÉ
  // thì '' là "chưa vào chương trình" — chưa có gì. Chỗ trả lứa của con từng
  // viết `TEN_LUA_TUOI[c.luaTuoi] || 'Chưa vào chương trình Cambridge'`, mà
  // `TEN_LUA_TUOI['']` là chuỗi KHÔNG RỖNG nên nhánh `||` không bao giờ chạy:
  // màn hình của nhà có bé 14 tháng nói con mình thuộc "Cả hai lứa" Cambridge.
  //
  // Bài canh cũ chỉ đo bé ấy không nhận block nào — đúng, nhưng không đo CHỮ
  // hiện ra, nên chuyện này nằm im. Đo thẳng vào chữ.
  const conBe = (await danhSach(PH_BE)).luaTuoiCuaCon || [];
  check('nhà có bé 14 tháng vẫn được trả trường "lứa của con"', conBe.length >= 1, conBe);
  check('BÉ CHƯA VÀO CHƯƠNG TRÌNH KHÔNG BAO GIỜ ĐƯỢC GỌI LÀ "mọi lứa"',
    conBe.every(c => !c.luaTuoi && !/mọi lứa|cả hai lứa/i.test(c.tenLuaTuoi || '')),
    conBe.map(c => c.tenLuaTuoi));
  check('mà phải nói đúng: con chưa vào chương trình Cambridge',
    conBe.every(c => /chưa vào chương trình/i.test(c.tenLuaTuoi || '')),
    conBe.map(c => c.tenLuaTuoi));

  // KHÔNG dọn block 5–6 đi: phân hệ không có đường xoá block (chỉ tạo và sửa),
  // mà các mục sau đều đo BÀI chứ không đếm block, nên để lại là an toàn và
  // thật hơn — từ đây trở đi kho dữ liệu của bài canh có đủ ba lứa.
}

// ===========================================================================
console.log('\n[2] Khung theo mẫu: Block / tuần / lứa / năm ô nội dung');
let BAI34;
{
  const r = await dang({
    tieuDe: 'Block 1, Week 1 — Let’s Explore', noiDung: 'Welcome to the school!',
    khung: { blockId: BLOCK1, tuanSo: 1, luaTuoi: '3-4', monHoc: 'Let’s Explore', chuDe: 'My school', tuVung: 'classroom, teacher', songChant: 'Tidy Up song', ketNoiONha: 'Hỏi con về lớp học mới' },
  });
  check('đăng được bài kèm khung', r.status === 201, r.data);
  BAI34 = r.data?.id;
  const k = r.data?.khung || {};
  check('khung trả về đủ năm ô và tên block', k.blockTen === 'Block 1' && k.tuanSo === 1 && k.monHoc === 'Let’s Explore' && k.ketNoiONha === 'Hỏi con về lớp học mới', k);
  check('kèm tên lứa để màn hình khỏi tự dịch', /3–4/.test(k.tenLuaTuoi || ''), k.tenLuaTuoi);

  const suaKhac = await req('PUT', `/api/cambridge/${BAI34}`, { cookie: VP, body: { noiDung: 'Welcome to the school! Đã sửa.' } });
  check('sửa bài mà KHÔNG gửi khung thì khung giữ nguyên', suaKhac.status === 200 && suaKhac.data?.khung?.tuVung === 'classroom, teacher', suaKhac.data?.khung);
  const blockLa = await req('PUT', `/api/cambridge/${BAI34}`, { cookie: VP, body: { khung: { blockId: 'khong-co', luaTuoi: '3-4' } } });
  check('block không tồn tại thì từ chối', blockLa.status === 400, blockLa.data);
  const tuanLa = await req('PUT', `/api/cambridge/${BAI34}`, { cookie: VP, body: { khung: { blockId: BLOCK1, tuanSo: 99, luaTuoi: '3-4' } } });
  check('số tuần vô lý thì từ chối', tuanLa.status === 400, tuanLa.data);
  const luaLa = await req('PUT', `/api/cambridge/${BAI34}`, { cookie: VP, body: { khung: { luaTuoi: '2-3' } } });
  check('lứa tuổi lạ thì từ chối', luaLa.status === 400, luaLa.data);
  const cu = await dang({ tieuDe: 'Bài kiểu cũ, không khung', noiDung: 'x' });
  check('bài không gửi khung vẫn đăng được y như trước, khung = null', cu.status === 201 && cu.data?.khung === null, cu.data?.khung);
}

// ===========================================================================
console.log('\n[3] LỨA TUỔI LỌC Ở TẦNG DỮ LIỆU — gia đình chỉ nhận bài của lứa con mình');
let BAI45, BAICHUNG;
{
  BAI45 = (await dang({ tieuDe: 'Block 1, Week 1 (4–5)', noiDung: 'Numbers to ten', khung: { luaTuoi: '4-5' } })).data.id;
  BAICHUNG = (await dang({ tieuDe: 'Thư chung cả trường', noiDung: 'Lịch dã ngoại', khung: { luaTuoi: '' } })).data.id;

  check('nhà bé 3–4 THẤY bài 3–4', await thay(PH_34, BAI34));
  check('nhà bé 3–4 KHÔNG thấy bài 4–5', !(await thay(PH_34, BAI45)));
  check('nhà bé 3–4 thấy bài cho cả hai lứa', await thay(PH_34, BAICHUNG));
  check('nhà bé 4–5 THẤY bài 4–5', await thay(PH_45, BAI45));
  check('nhà bé 4–5 KHÔNG thấy bài 3–4 — đây là chỗ sinh ra thư rác', !(await thay(PH_45, BAI34)));
  check('nhà bé 14 tháng chỉ thấy bài chung', !(await thay(PH_BE, BAI34)) && !(await thay(PH_BE, BAI45)) && await thay(PH_BE, BAICHUNG));
  check('cô thấy cả ba', await thay(GV, BAI34) && await thay(GV, BAI45) && await thay(GV, BAICHUNG));
  check('văn phòng thấy cả ba', await thay(VP, BAI34) && await thay(VP, BAI45) && await thay(VP, BAICHUNG));
}

// ===========================================================================
console.log('\n[4] Tệp PDF / Word kèm bài — đi qua canh quyền, không phục vụ tĩnh');
{
  const co = await req('POST', `/api/cambridge/${BAI34}/tep`, { cookie: GV, body: { tep: [{ ten: 'a.pdf', dataUrl: duLieu(PDF, 'application/pdf') }] } });
  check('cô KHÔNG thêm được tệp', co.status === 403, co.status);

  const r = await req('POST', `/api/cambridge/${BAI34}/tep`, {
    cookie: VP,
    body: { tep: [{ ten: 'Worksheet tuần 1.pdf', dataUrl: duLieu(PDF, 'application/pdf') }] },
  });
  check('văn phòng gửi được PDF', r.status === 201 && (r.data?.tep || []).length === 1, r.data);
  const tepPdf = (r.data?.tep || [])[0] || {};
  check('tệp giữ tên cô đặt, có loại và dung lượng', tepPdf.tenGoc === 'Worksheet tuần 1.pdf' && tepPdf.loai === 'pdf' && tepPdf.bytes === PDF.length, tepPdf);

  const w = await req('POST', `/api/cambridge/${BAI34}/tep`, {
    cookie: VP,
    body: { tep: [{ ten: 'Letter for parents', dataUrl: duLieu(DOCX, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') }] },
  });
  check('gửi được Word', w.status === 201 && (w.data?.tep || []).length === 2, w.data);
  const tepDocx = (w.data?.tep || []).find(t => t.loai === 'docx') || {};
  check('tên không có đuôi thì tự thêm .docx để tải về mở được', tepDocx.tenGoc === 'Letter for parents.docx', tepDocx.tenGoc);

  const anh = await req('POST', `/api/cambridge/${BAI34}/tep`, { cookie: VP, body: { tep: [{ ten: 'x.pdf', dataUrl: PNG }] } });
  check('ẢNH đổi tên thành .pdf thì từ chối — đọc byte, không tin tên', anh.status === 400 && /PDF hoặc Word/.test(anh.data?.error || ''), anh.data);
  const zipThuong = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40, 1)]);
  const zip = await req('POST', `/api/cambridge/${BAI34}/tep`, { cookie: VP, body: { tep: [{ ten: 'x.docx', dataUrl: duLieu(zipThuong, 'application/zip') }] } });
  check('ZIP thường đổi đuôi .docx cũng từ chối', zip.status === 400, zip.data);
  const nhieu = await req('POST', `/api/cambridge/${BAI34}/tep`, { cookie: VP, body: { tep: Array(3).fill({ ten: 'a.pdf', dataUrl: duLieu(PDF, 'application/pdf') }) } });
  check('quá bốn tệp một bài thì từ chối', nhieu.status === 400 && /tối đa 4/.test(nhieu.data?.error || ''), nhieu.data);

  const tai = async (cookie, id) => {
    const res = await fetch(`${sv.BASE}/api/cambridge/tep/${id}`, { headers: cookie ? { cookie } : {} });
    return { status: res.status, type: res.headers.get('content-type') || '', dis: res.headers.get('content-disposition') || '' };
  };
  const t34 = await tai(PH_34, tepPdf.id);
  check('nhà bé 3–4 tải được tệp của bài 3–4', t34.status === 200, t34);
  check('đúng kiểu PDF và mang tên cô đặt', /application\/pdf/.test(t34.type) && /Worksheet/.test(decodeURIComponent(t34.dis)), t34);
  const t45 = await tai(PH_45, tepPdf.id);
  check('NHÀ BÉ 4–5 KHÔNG TẢI ĐƯỢC TỆP CỦA BÀI 3–4 dù biết mã tệp', t45.status === 403, t45.status);
  check('và câu từ chối nói tiếng của trường', /lứa tuổi/.test((await req('GET', `/api/cambridge/tep/${tepPdf.id}`, { cookie: PH_45 })).data?.error || ''));
  check('cô tải được', (await tai(GV, tepPdf.id)).status === 200);
  check('chưa đăng nhập thì không', [401, 403].includes((await tai(null, tepPdf.id)).status));
  const la = await tai(VP, 'ctp_khong_co');
  check('mã tệp lạ thì 404', la.status === 404, la.status);

  // Bài NHÁP: gia đình không tải được tệp, dù đúng lứa.
  const nhap = await dang({ tieuDe: 'Nháp 3–4', noiDung: 'x', khung: { luaTuoi: '3-4' } }, false);
  const tn = await req('POST', `/api/cambridge/${nhap.data.id}/tep`, { cookie: VP, body: { tep: [{ ten: 'n.pdf', dataUrl: duLieu(PDF, 'application/pdf') }] } });
  check('tệp của bài NHÁP: gia đình không tải được', (await tai(PH_34, tn.data.tep[0].id)).status === 403);

  // Gỡ tệp: dòng mất và tệp trên đĩa cũng mất.
  const uploadsDir = path.join(DIR, 'uploads');
  const truoc = fs.readdirSync(uploadsDir).filter(f => /\.(pdf|docx)$/.test(f)).length;
  const xoa = await req('DELETE', `/api/cambridge/${BAI34}/tep/${tepDocx.id}`, { cookie: VP });
  check('văn phòng gỡ được tệp', xoa.status === 200 && (xoa.data?.tep || []).length === 1, xoa.data);
  const sau = fs.readdirSync(uploadsDir).filter(f => /\.(pdf|docx)$/.test(f)).length;
  check('tệp trên đĩa được dọn theo', sau === truoc - 1, { truoc, sau });
  check('gỡ rồi thì tải về 404', (await tai(VP, tepDocx.id)).status === 404);
  check('cô không gỡ được tệp', (await req('DELETE', `/api/cambridge/${BAI34}/tep/${tepPdf.id}`, { cookie: GV })).status === 403);
}

// ===========================================================================
console.log('\n[5] Công bố thì gia đình được báo — ĐÚNG LỨA, qua thông báo riêng của bé');
{
  const r = await dang({ tieuDe: 'Block 1, Week 2 (3–4)', noiDung: 'Numbers one to five', khung: { blockId: BLOCK1, tuanSo: 2, luaTuoi: '3-4' } });
  check('công bố xong nói số gia đình đã báo', r.congBo?.status === 200 && Number.isInteger(r.congBo?.data?.soGiaDinhDuocBao), r.congBo?.data);
  // Dữ liệu mẫu có đúng hai bé lứa 3–4 còn học: s5 (Chồi 2) và s11 (Nhà trẻ 1).
  check('đúng hai gia đình bé 3–4 được báo — không rung điện thoại nhà 4–5', r.congBo?.data?.soGiaDinhDuocBao === 2, r.congBo?.data?.soGiaDinhDuocBao);

  const tin = async (cookie) => ((await req('GET', '/api/notifications/rieng-be', { cookie })).data?.list || (await req('GET', '/api/notifications/rieng-be', { cookie })).data || []);
  const c34 = await tin(PH_34);
  const co34 = (Array.isArray(c34) ? c34 : []).find(t => /Week 2 \(3–4\)/.test(t.title || t.tieuDe || ''));
  check('nhà bé 3–4 có tin riêng của bé, loại cambridge, trỏ về màn Cambridge', !!co34 && co34.loai === 'cambridge' && /#\/cambridge/.test(co34.hash || ''), co34);
  const c45 = await tin(PH_45);
  check('nhà bé 4–5 KHÔNG có tin đó', !(Array.isArray(c45) ? c45 : []).some(t => /Week 2 \(3–4\)/.test(t.title || t.tieuDe || '')));

  const chung = await dang({ tieuDe: 'Thư cả trường tuần 3', noiDung: 'x' });
  check('bài cho cả hai lứa báo mọi bé đang học trong phạm vi', chung.congBo?.data?.soGiaDinhDuocBao >= 10, chung.congBo?.data?.soGiaDinhDuocBao);
}

// ===========================================================================
console.log('\n[6] Canh tĩnh: lược đồ chỉ thêm, kho tệp tách riêng khỏi kho ảnh, màn hình bọc UI.esc');
{
  const sql = fs.readFileSync(path.join(GOC, 'modules/cambridge/schema.sql'), 'utf8');
  const cau = sql.replace(/--[^\n]*/g, '').split(';').map(c => c.trim()).filter(Boolean);
  check('lược đồ vẫn chỉ CREATE ... IF NOT EXISTS', cau.every(c => /^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(c)));
  check('ba bảng mới đều mang tiền tố cambridge_',
    ['cambridge_block', 'cambridge_bai_khung', 'cambridge_tep'].every(t => sql.includes(`CREATE TABLE IF NOT EXISTS ${t} (`)));

  const up = fs.readFileSync(path.join(GOC, 'lib/uploads.js'), 'utf8');
  check('lib/uploads.js: bộ tên tệp ẢNH không nới ra nhận .pdf',
    /const SAFE_NAME = \/\^\[a-f0-9\]\{32\}\\\.\(jpg\|png\|webp\|mp4\|webm\)\$\//.test(up));
  check('tài liệu có bộ tên tệp riêng, chỉ pdf và docx', /SAFE_NAME_TAI_LIEU = \/\^\[a-f0-9\]\{32\}\\\.\(pdf\|docx\)\$\//.test(up));
  check('Word kiểm cả chữ ký ZIP lẫn thư mục word/', /b\.includes\('word\/'\)/.test(up));
  check('trần tài liệu bằng trần video (thân yêu cầu 12 MB)', /MAX_TAI_LIEU_BYTES = 8 \* 1024 \* 1024/.test(up));

  const rt = fs.readFileSync(path.join(GOC, 'modules/cambridge/routes.js'), 'utf8');
  const taiTep = rt.slice(rt.indexOf("app.get('/api/cambridge/tep/:tepId'"));
  check('đường tải tệp kiểm quyền TRƯỚC khi kiểm tệp có tồn tại',
    taiTep.indexOf('xemDuoc(chu, req.user)') < taiTep.indexOf('existsTaiLieu'));
  check('và kiểm cả lứa tuổi ở đường tải tệp, không chỉ ở đường liệt kê',
    taiTep.indexOf('hopLua(') > -1 && taiTep.indexOf('hopLua(') < taiTep.indexOf('existsTaiLieu'));
  check('công bố báo gia đình qua lib/thong-bao-be, không ghi thẳng bảng', /tbb\.gui\(/.test(rt) && !/insert\('thongbao_be'/.test(rt));
  check('lứa tuổi tính từ ngày sinh, chú thích nói rõ đây không phải nhận định về bé (QUY TẮC 4)',
    /function luaTuoiCuaBe/.test(rt) && /không phải một nhận\s*\n?\s*\/\/ định về bé|không phải một nhận định về bé/.test(rt));

  const view = fs.readFileSync(path.join(GOC, 'modules/cambridge/view.js'), 'utf8');
  check('màn soạn có đủ ô Block, tuần, lứa, hoạt động, chủ đề, từ vựng, song/chant, kết nối ở nhà, tệp',
    ['cam-block', 'cam-tuan-so', 'cam-lua', 'cam-mon', 'cam-chu-de', 'cam-tu-vung', 'cam-song', 'cam-ket-noi', 'cam-tep'].every(id => view.includes(`id="${id}"`)));
  check('tệp gửi từng cái một sau khi bài có mã', /tep: \[t\]/.test(view));
  check('tên tệp và nội dung khung đều bọc UI.esc', /UI\.esc\(t\.tenGoc\)/.test(view) && /UI\.esc\(gt\)/.test(view));
  check('màn có khối block với mục tiêu và thời gian áp dụng', /khoiBlock\(/.test(view) && /Áp dụng/.test(view));
  check('không có "học sinh" trên màn', !/học sinh/i.test(view));
}

await sv.dung();
tongKet();
