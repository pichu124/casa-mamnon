// Bài canh HÀNH TRÌNH HỌC TẬP — phần hồn của CASA.
//
// Chạy bằng:  npm run test:hanh-trinh
//
// CHỖ DỄ MẤT NHẤT: LÒNG TIN CỦA CÔ GIÁO
//
// CLAUDE.md nói thẳng ranh giới lớp 1 sang phụ huynh là "chỗ dễ rò rỉ nhất và
// cũng là chỗ mất lòng tin của cô giáo nhanh nhất". Vì sao: nháp dở dang được
// phép tồn tại, và chính điều đó làm cô dám ghi. Một dòng "hôm nay bé lại cắn
// bạn, mình chưa hiểu vì sao" là ghi chú nghề nghiệp đang hình thành. Nó lọt
// sang phụ huynh thì mất lòng tin của gia đình; lọt sang cô khác thì cô ngừng
// ghi — mà cô ngừng ghi thì cả GĐ 2 không còn gì.
//
// Nên mục [2] và [3] của bài này là mục quan trọng nhất, và chúng canh cả hai
// chiều: cắt trường dữ liệu, VÀ không rò số lượng bản ghi.
//
// BỐN QUY TẮC GIÁO DỤC ĐỀU CÓ MẶT
//
//   QUY TẮC 1 — mục [1]: quan sát chỉ có mô tả là quan sát HOÀN CHỈNH.
//   QUY TẮC 2 — mục [5] và bộ riêng test/quy-tac-2.test.mjs.
//   QUY TẮC 4 — mục [9]: nhắc nhẹ về bé KHÔNG kèm con số nào.
//   QUY TẮC 5 — mục [4] và [6]: nhận định phải dẫn tới việc làm được.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hanh-trinh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'thuchup']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4020), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);
const VP3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1, có bé s1
const GV3 = (await login('giaovien3', '123456')).cookie;  // cô Bích Ngọc: cũng phụ trách c1
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1
const PH2 = (await login('phuhuynh2', '123456')).cookie;

const HOM_NAY = new Date().toISOString().slice(0, 10);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const hoSo = async (cookie, studentId = 's1') =>
  (await req('GET', `/api/hanhtrinh?studentId=${studentId}`, { cookie })).data;

// ===========================================================================
console.log('\n[1] QUY TẮC 1 — quan sát chỉ có MÔ TẢ đã là quan sát hoàn chỉnh');
{
  const r = await req('POST', '/api/hanhtrinh', {
    cookie: GV,
    body: { studentId: 's1', moTa: 'Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau.', anh: ANH },
  });
  check('ghi được mà KHÔNG cần gắn lĩnh vực hay chọn trạng thái', r.status === 201, r.data);
  check('máy chủ không tự điền lĩnh vực thay cô', !r.data?.linhVuc, r.data?.linhVuc);
  check('cũng không tự điền trạng thái', !r.data?.trangThai, r.data?.trangThai);
  check('có ảnh đi kèm', /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(r.data?.anh || ''), r.data?.anh);
  check('và ghi nhận đây là bản của chính cô', r.data?.cuaToi === true, r.data?.cuaToi);

  const thieu = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: '  ' } });
  check('nhưng bỏ trống mô tả thì từ chối — không có gì để quan sát', thieu.status === 400, thieu.status);

  const phGhi = await req('POST', '/api/hanhtrinh', {
    cookie: PH, body: { studentId: 's1', moTa: 'Phụ huynh tự ghi' },
  });
  check('phụ huynh KHÔNG ghi quan sát — đây là ghi chép nghề nghiệp của cô', phGhi.status === 403, phGhi.status);
}

// ===========================================================================
console.log('\n[2] RANH GIỚI LỚP 1 — ghi chú thô của cô KHÔNG BAO GIỜ lộ sang phụ huynh');
{
  const d = await hoSo(PH);
  check('phụ huynh mở được màn hành trình của con', d?.be?.id === 's1', d?.be);
  check('NHƯNG KHÔNG THẤY BẢN GHI NÀO — vì cô chưa công bố câu chuyện nào',
    (d.quanSat || []).length === 0, (d.quanSat || []).length);

  // Không chỉ cắt trường: KHÔNG RÒ CẢ SỐ LƯỢNG.
  //
  // "Cô đã ghi 12 điều về con tôi nhưng chỉ kể 2" cũng là một thứ không nên rò
  // ra. Nên phụ huynh không nhận về bản ghi chưa công bố, chứ không phải nhận
  // một bản ghi rỗng trường.
  const coCua = await hoSo(GV);
  check('trong khi cô đã ghi thật', (coCua.quanSat || []).length >= 1, (coCua.quanSat || []).length);
  check('cô đọc được mô tả của chính mình', !!(coCua.quanSat || [])[0]?.moTa, coCua.quanSat?.[0]);
}

// ===========================================================================
console.log('\n[3] RANH GIỚI LỚP 1 — cô KHÁC trong cùng nhóm đọc lớp 2, KHÔNG đọc lớp 1');
{
  const cuaToi = (await hoSo(GV)).quanSat[0];
  await req('PUT', `/api/hanhtrinh/${cuaToi.id}`, {
    cookie: GV,
    body: { linhVuc: 'the-chat', trangThai: 'dang-hinh-thanh', oLopLamGi: 'Đặt thêm bộ rót nước ở góc thực hành' },
  });

  const coKhac = await hoSo(GV3);
  const nhin = (coKhac.quanSat || []).find(q => q.id === cuaToi.id);
  check('cô cùng nhóm THẤY bản ghi', !!nhin, (coKhac.quanSat || []).map(q => q.id));
  check('và đọc được NHẬN ĐỊNH CHUYÊN MÔN (lớp 2)',
    nhin?.trangThai === 'dang-hinh-thanh' && nhin?.linhVuc === 'the-chat', nhin);
  check('NHƯNG KHÔNG đọc được ghi chú thô của cô kia (lớp 1)',
    nhin?.moTa === undefined, nhin?.moTa);
  check('cũng không biết tên tệp ảnh', nhin?.anh === undefined, nhin?.anh);
  check('và màn hình biết đây không phải bản của mình', nhin?.cuaToi === false, nhin?.cuaToi);

  const suaCuaNguoiKhac = await req('PUT', `/api/hanhtrinh/${cuaToi.id}`, {
    cookie: GV3, body: { moTa: 'Cô khác sửa' },
  });
  check('cô khác KHÔNG sửa được ghi chép của cô đã ghi', suaCuaNguoiKhac.status === 403, suaCuaNguoiKhac.status);
  check('và câu từ chối giải thích ranh giới, không chỉ nói không',
    /nhận định/i.test(suaCuaNguoiKhac.data?.error || ''), suaCuaNguoiKhac.data?.error);

  const coNhomKhac = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV2 });
  check('cô nhóm khác không mở được hành trình của bé', coNhomKhac.status === 403, coNhomKhac.status);
}

// ===========================================================================
console.log('\n[4] QUY TẮC 5 — nhận định phải dẫn tới việc làm được');
{
  const r = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's4', moTa: 'Bé xếp được tháp năm khối, tự sửa khi tháp nghiêng.' },
  });
  const id = r.data.id;

  const thieu = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV, body: { linhVuc: 'nhan-thuc', trangThai: 'da-vung' },
  });
  check('chọn "Đã vững" mà không ghi việc tiếp theo thì bị từ chối', thieu.status === 400, thieu.status);
  check('câu nhắc nói rõ vì sao, bằng lời của cô',
    /ở lớp cô làm gì tiếp/i.test(thieu.data?.error || ''), thieu.data?.error);

  const du = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV,
    body: { linhVuc: 'nhan-thuc', trangThai: 'da-vung', oLopLamGi: 'Đưa bộ khối lớn hơn cho bé thử' },
  });
  check('có việc tiếp theo thì lưu được', du.status === 200, du.data);
}

// ===========================================================================
console.log('\n[5] QUY TẮC 2 — "Chưa quan sát thấy" là một lựa chọn BÌNH THƯỜNG');
{
  const r = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's5', moTa: 'Giờ chơi ngoài trời, bé đứng xem các bạn leo thang dây.' },
  });
  const id = r.data.id;

  // Hai trạng thái "chưa" KHÔNG kéo theo nghĩa vụ QUY TẮC 5: chưa có gì để làm
  // tiếp, mà ép cô nghĩ ra một việc cho thứ chưa xảy ra là biến quy tắc thành
  // thủ tục giấy tờ.
  const chua = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV, body: { linhVuc: 'the-chat', trangThai: 'chua-quan-sat-thay' },
  });
  check('chọn "Chưa quan sát thấy" mà không cần ghi thêm gì', chua.status === 200, chua.data);
  check('và nó được lưu lại hẳn hoi, không bị coi là bỏ trống',
    chua.data?.trangThai === 'chua-quan-sat-thay', chua.data?.trangThai);

  const chuaDay = await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { trangThai: 'chua-day' } });
  check('"Chưa dạy" cũng vậy', chuaDay.status === 200, chuaDay.data);

  const bay = await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { trangThai: 'gioi' } });
  check('trạng thái không có trong danh sách thì bị từ chối', bay.status === 400, bay.status);

  const d = await hoSo(GV, 's5');
  check('máy chủ trả về đủ NĂM trạng thái để màn hình dựng ô chọn',
    (d.trangThai || []).length === 5, (d.trangThai || []).map(x => x.ma));
  check('và đúng năm cái bản kế hoạch đã chốt',
    (d.trangThai || []).map(x => x.ma).join(',')
      === 'chua-day,chua-quan-sat-thay,dang-hinh-thanh,da-vung,vuot-troi',
    (d.trangThai || []).map(x => x.ma));
}

// ===========================================================================
console.log('\n[6] LỚP 3 — cô CHỦ ĐỘNG công bố, và phải kèm việc cùng con ở nhà');
{
  const cuaToi = (await hoSo(GV)).quanSat.find(q => q.studentId === 's1');

  const chuaViet = await req('POST', `/api/hanhtrinh/${cuaToi.id}/cong-bo`, { cookie: GV, body: {} });
  check('chưa viết câu chuyện thì chưa công bố được', chuaViet.status === 400, chuaViet.status);

  const thieuNha = await req('POST', `/api/hanhtrinh/${cuaToi.id}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay Bin tự xúc hết bát cơm ạ.' },
  });
  check('QUY TẮC 5 — thiếu "cùng con ở nhà" thì chưa công bố được', thieuNha.status === 400, thieuNha.status);
  check('và lời nhắc mô tả đúng loại việc cần gợi ý',
    /5 tới 10 phút|đồ có sẵn|không cần màn hình/i.test(thieuNha.data?.error || ''), thieuNha.data?.error);

  // Nháp thì KHÔNG ai đọc được, kể cả khi đã gõ xong.
  await req('PUT', `/api/hanhtrinh/${cuaToi.id}`, {
    cookie: GV, body: { cauChuyen: 'Bản nháp chưa công bố', cungConONha: 'Nháp' },
  });
  check('CÂU CHUYỆN CÒN LÀ NHÁP THÌ PHỤ HUYNH VẪN KHÔNG THẤY',
    ((await hoSo(PH)).quanSat || []).length === 0, (await hoSo(PH)).quanSat);

  const ok = await req('POST', `/api/hanhtrinh/${cuaToi.id}/cong-bo`, {
    cookie: GV,
    body: {
      cauChuyen: 'Hôm nay Bin tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau ạ.',
      cungConONha: 'Tối nay bố mẹ để con tự rót nước vào cốc — 5 phút, dùng luôn ca nước trên bàn.',
    },
  });
  check('đủ hai phần thì công bố được', ok.status === 200 && ok.data?.daCongBo === true, ok.data);

  const d = await hoSo(PH);
  const q = (d.quanSat || [])[0];
  check('gia đình đọc được câu chuyện', /tự xúc hết bát cơm/.test(q?.cauChuyen || ''), q);
  check('và đọc được gợi ý cùng con ở nhà', /rót nước/.test(q?.cungConONha || ''), q);
  check('NHƯNG VẪN KHÔNG ĐỌC ĐƯỢC ghi chú thô của cô', q?.moTa === undefined, q?.moTa);
  check('không đọc được nhận định chuyên môn', q?.trangThai === undefined, q?.trangThai);
  check('và không đọc được minh chứng', q?.minhChung === undefined, q?.minhChung);

  const nhaKhac = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH2 });
  check('phụ huynh nhà khác không mở được hành trình bé này', nhaKhac.status === 403, nhaKhac.status);

  // Thu hồi: gỡ khỏi màn của gia đình, KHÔNG xoá chữ cô đã viết.
  const thu = await req('POST', `/api/hanhtrinh/${cuaToi.id}/thu-hoi`, { cookie: GV, body: {} });
  check('thu hồi được', thu.status === 200, thu.data);
  check('gia đình không còn thấy nữa', ((await hoSo(PH)).quanSat || []).length === 0);
  check('nhưng chữ cô viết CÒN NGUYÊN — thu hồi không phải xoá',
    /tự xúc hết bát cơm/.test(((await hoSo(GV)).quanSat.find(x => x.id === cuaToi.id) || {}).cauChuyen || ''));

  await req('POST', `/api/hanhtrinh/${cuaToi.id}/cong-bo`, { cookie: GV, body: {} });
  check('công bố lại được ngay, không phải gõ lại', ((await hoSo(PH)).quanSat || []).length === 1);
}

// ===========================================================================
console.log('\n[7] Ảnh là tư liệu LỚP 1 — công bố câu chuyện không mở ảnh ra theo');
{
  const q = (await hoSo(GV)).quanSat.find(x => x.anh);
  check('có một quan sát kèm ảnh để thử', !!q, q);

  const lay = async (cookie) => {
    const res = await fetch(`${sv.BASE}/api/hanhtrinh/anh/${q.anh}`, { headers: cookie ? { cookie } : {} });
    return res.status;
  };
  check('cô đã ghi xem được ảnh của mình', await lay(GV) === 200);
  check('văn phòng xem được', await lay(VP) === 200);
  check('CÔ CÙNG NHÓM KHÔNG xem được — ảnh nằm trong ghi chép riêng', await lay(GV3) === 403);
  check('PHỤ HUYNH KHÔNG xem được, kể cả khi câu chuyện đã công bố', await lay(PH) === 403);
  check('người chưa đăng nhập cũng không', [401, 403].includes(await lay(null)));

  const la = await fetch(`${sv.BASE}/api/hanhtrinh/anh/${'b'.repeat(32)}.jpg`, { headers: { cookie: GV } });
  check('ảnh không thuộc quan sát nào thì 404', la.status === 404, la.status);
}

// ===========================================================================
console.log('\n[8] Suy ngẫm cuối ngày — và chỉ tiêu 3 phút đo được bằng số');
{
  const d = (await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV })).data;
  check('cô mở được màn suy ngẫm', Array.isArray(d.quanSat), d);
  check('màn này chỉ có quan sát của CHÍNH cô',
    (d.quanSat || []).every(q => q.cuaToi === true), (d.quanSat || []).map(q => q.cuaToi));
  check('và kèm sẵn danh sách bé để cô khỏi phải mở màn khác',
    (d.danhSachBe || []).length > 0, d.danhSachBe?.length);
  check('phân biệt được cái nào đã suy ngẫm rồi',
    (d.quanSat || []).some(q => q.daSuyNgam === true), (d.quanSat || []).map(q => q.daSuyNgam));

  const cuaCoKhac = (await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV3 })).data;
  check('cô khác không thấy quan sát của cô này trong màn suy ngẫm của mình',
    !(cuaCoKhac.quanSat || []).some(q => (d.quanSat || []).some(x => x.id === q.id)),
    (cuaCoKhac.quanSat || []).length);

  // Bản kế hoạch đặt chỉ tiêu "suy ngẫm <= 3 phút một quan sát" và nói rõ là có
  // bài test canh. Không đo được thì chỉ tiêu chỉ là lời hứa.
  const moi = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'Bé rủ bạn cùng dọn đồ chơi.' },
  });
  await req('PUT', `/api/hanhtrinh/${moi.data.id}`, {
    cookie: GV,
    body: { linhVuc: 'tinh-cam-xa-hoi', trangThai: 'dang-hinh-thanh', oLopLamGi: 'Giao bé việc gọi bạn dọn góc sách', giaySuyNgam: 42.5 },
  });
  const ma = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('máy chủ có cột lưu số giây suy ngẫm', /giaySuyNgam/.test(ma));
  const sql = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/schema.sql'), 'utf8');
  check('và cột đó nằm trong lược đồ', /giaySuyNgam\s+REAL/.test(sql));
  const view = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('màn hình thật sự bấm giờ, không để máy chủ nhận số bịa',
    /_batDauSuyNgam\s*=\s*Date\.now\(\)/.test(view) && /giaySuyNgam: giay/.test(view));
}

// ===========================================================================
console.log('\n[9] QUY TẮC 4 — nhắc nhẹ về bé KHÔNG kèm con số nào');
{
  const d = (await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: GV })).data;
  check('cô mở được lời nhắc', Array.isArray(d.be), d);
  check('mỗi bé CHỈ có tên, không có con số nào kèm theo',
    (d.be || []).every(b => Object.keys(b).sort().join(',') === 'avatar,hoTen,studentId'),
    (d.be || [])[0]);
  check('và danh sách xếp theo TÊN, không theo số quan sát',
    (d.be || []).map(b => b.hoTen).join('|')
      === (d.be || []).map(b => b.hoTen).sort((a, b) => String(a).localeCompare(String(b), 'vi')).join('|'),
    (d.be || []).map(b => b.hoTen));

  const ph = await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: PH });
  check('phụ huynh KHÔNG mở được lời nhắc này — nó là việc của cô', ph.status === 403, ph.status);

  const ma = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('máy chủ không có chỗ nào đếm số quan sát của một bé rồi trả ra',
    !/COUNT\(\*\)[\s\S]{0,80}GROUP BY studentId/i.test(ma));
  const view = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('màn hình nói rõ đây là lời nhắc cho CÔ, không phải nhận định về bé',
    /không phải nhận định gì về bé/.test(view));
}

// ===========================================================================
console.log('\n[10] Chủ đề tuần — soạn được, chép được tuần trước, không ghi đè');
{
  const luu = await req('PUT', '/api/hanhtrinh/chu-de', {
    cookie: GV,
    body: {
      classId: 'c1', chuDe: 'Nước và những thứ nổi',
      moTa: 'Cả tuần lớp chơi với chậu nước.',
      cungConONha: 'Cho con thả thìa, nắp chai, lá cây vào chậu nước xem cái nào nổi.',
    },
  });
  check('cô soạn được chủ đề tuần', luu.status === 200, luu.data);
  check('lưu đúng tên chủ đề', luu.data?.chuDe === 'Nước và những thứ nổi', luu.data);

  const thieu = await req('PUT', '/api/hanhtrinh/chu-de', { cookie: GV, body: { classId: 'c1', chuDe: '  ' } });
  check('chủ đề không tên thì từ chối', thieu.status === 400, thieu.status);

  const nhomKhac = await req('PUT', '/api/hanhtrinh/chu-de', {
    cookie: GV2, body: { classId: 'c1', chuDe: 'Cô nhóm khác soạn' },
  });
  check('cô nhóm khác không soạn được', nhomKhac.status === 403, nhomKhac.status);

  const de = await req('POST', '/api/hanhtrinh/chu-de/chep-tuan-truoc', { cookie: GV, body: { classId: 'c1' } });
  check('tuần này đã có chủ đề thì KHÔNG chép đè lên', de.status === 400, de.status);
  check('và nói rõ vì sao, chỉ cách sửa', /sửa trực tiếp/i.test(de.data?.error || ''), de.data?.error);

  // Chép sang tuần sau thì được.
  const tuanSau = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const chep = await req('POST', '/api/hanhtrinh/chu-de/chep-tuan-truoc', {
    cookie: GV, body: { classId: 'c1', tuan: tuanSau },
  });
  check('chép sang tuần chưa soạn thì được', chep.status === 200, chep.data);
  const sau = (await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${tuanSau}`, { cookie: GV })).data;
  check('và chép đúng nội dung, kể cả phần cùng con ở nhà',
    sau.chuDe?.chuDe === 'Nước và những thứ nổi' && /thả thìa/.test(sau.chuDe?.cungConONha || ''), sau.chuDe);

  // ĐĂNG KÝ TRƯỚC `/:id` — canh để không ai xếp lại thứ tự rồi hỏng lặng lẽ.
  //
  // Bản đầu của phân hệ này đặt khối chủ đề tuần xuống dưới, nên
  // `PUT /api/hanhtrinh/chu-de` rơi vào `PUT /api/hanhtrinh/:id` với :id là
  // chuỗi "chu-de", và cô soạn chủ đề xong nhận câu "Không tìm thấy quan sát
  // này" — một lỗi không đọc ra được nguyên nhân từ thông báo.
  const maNguon = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('đường chủ đề tuần đăng ký TRƯỚC mọi đường có /:id',
    maNguon.indexOf("'/api/hanhtrinh/chu-de'") < maNguon.indexOf("'/api/hanhtrinh/:id'")
    && maNguon.indexOf("'/api/hanhtrinh/chu-de'") > -1,
    { chuDe: maNguon.indexOf("'/api/hanhtrinh/chu-de'"), id: maNguon.indexOf("'/api/hanhtrinh/:id'") });

  const ph = (await hoSo(PH)).chuDeTuan;
  check('gia đình đọc được chủ đề tuần của nhóm con', ph?.chuDe === 'Nước và những thứ nổi', ph);
  check('kèm gợi ý cùng con ở nhà', /thả thìa/.test(ph?.cungConONha || ''), ph);
}

// ===========================================================================
console.log('\n[11] Nối với Ghi nhanh — nhưng KHÔNG phụ thuộc vào nó');
{
  const ma = `gn-${Date.now()}-abcdef`;
  const gn = await req('POST', '/api/thuchup', {
    cookie: GV, body: { id: ma, studentId: 's1', note: 'Bé ngồi rất lâu với bộ ghép hình.', giay: 12 },
  });
  check('cô ghi nhanh được', gn.status === 200 || gn.status === 201, gn.data);

  const d = (await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV })).data;
  check('màn suy ngẫm kéo được Ghi nhanh chưa dùng vào',
    (d.ghiNhanhChuaDung || []).some(g => g.id === ma), (d.ghiNhanhChuaDung || []).map(g => g.id));

  await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'Bé ngồi rất lâu với bộ ghép hình.', ghiNhanhId: ma },
  });
  const sau = (await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV })).data;
  check('dùng rồi thì không gợi ý lại nữa',
    !(sau.ghiNhanhChuaDung || []).some(g => g.id === ma), (sau.ghiNhanhChuaDung || []).map(g => g.id));

  // NGUYÊN TẮC SỐ 1: tắt phân hệ Ghi nhanh thì Hành trình học tập VẪN CHẠY.
  await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: false } });
  const khiTat = await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV });
  check('TẮT GHI NHANH ĐI THÌ HÀNH TRÌNH VẪN MỞ ĐƯỢC', khiTat.status === 200, khiTat.status);
  check('chỉ là không còn gợi ý nào từ Ghi nhanh nữa',
    Array.isArray(khiTat.data?.ghiNhanhChuaDung), khiTat.data?.ghiNhanhChuaDung);
  check('phần quan sát của chính phân hệ này còn nguyên',
    (khiTat.data?.quanSat || []).length > 0, khiTat.data?.quanSat?.length);
  await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: true } });

  const maNguon = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('mã có bọc lỗi khi đọc bảng của phân hệ khác',
    /try\s*\{[\s\S]{0,900}thuchup_ghinhanh[\s\S]{0,900}catch/.test(maNguon));
}

// ===========================================================================
console.log('\n[12] Tầng cơ sở vẫn canh ở phân hệ mới');
{
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs2' } });
  const doc = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: VP3 });
  check('quản lý cơ sở 1 KHÔNG đọc được hành trình bé của cơ sở 2', doc.status === 403, doc.status);
  const cd = await req('PUT', '/api/hanhtrinh/chu-de', {
    cookie: VP3, body: { classId: 'c1', chuDe: 'Cơ sở khác soạn' },
  });
  check('và KHÔNG soạn được chủ đề cho nhóm đó', cd.status === 403, cd.status);
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: VP, body: { campusId: 'cs1' } });
  check('trả về cơ sở 1 thì đọc lại được',
    (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: VP3 })).status === 200);
}

// ===========================================================================
console.log('\n[13] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: VP, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);
  const goi = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: VP, body: { enabled: true } });
  const d = await hoSo(GV);
  check('bật lại là chạy tiếp', (d.quanSat || []).length > 0, d.quanSat?.length);
  check('VÀ CÂU CHUYỆN ĐÃ CÔNG BỐ CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
    ((await hoSo(PH)).quanSat || []).length > 0);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
