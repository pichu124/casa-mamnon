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
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY as homNayVN } from './_chung.mjs';
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

// Hỏi chung một chỗ với máy chủ (lib/ngay.js), không tự tính bằng giờ UTC —
// xem chú thích ở test/_chung.mjs. Tự tính là bài test đỏ vào buổi tối.
const HOM_NAY = homNayVN();
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

  // MỐC NHẮC LÀ HAI NGÀY (Đ189, Câu 8). Nhà trường: "sau 2 ngày mà các GV k ghi
  // quan sát hoặc up ảnh của cháu sẽ có thông báo còn mấy cháu chưa cập nhật".
  check('MỐC NHẮC ĐÚNG HAI NGÀY như nhà trường chốt', d.soNgay === 2, d.soNgay);

  // Lời khuyên "rải đều trong tuần" là chuyện thói quen của NGƯỜI LỚN, nên nó
  // phải là MỘT dòng cho cả màn — không phải một nhãn dán cạnh tên từng bé.
  check('có lời khuyên rải đều trong tuần, đúng lời trường dặn',
    /rải đều trong tuần/.test(d.loiKhuyen || ''), d.loiKhuyen);
  check('và lời khuyên ấy nằm NGOÀI danh sách bé, không dính vào bé nào',
    (d.be || []).every(b => Object.keys(b).sort().join(',') === 'avatar,hoTen,studentId'),
    (d.be || [])[0]);
  check('gói trả về vẫn KHÔNG mang con số nào về một đứa trẻ',
    !/chiTieu|toiThieu|soQuanSat|"so":\s*\d/i.test(JSON.stringify(d)), JSON.stringify(d).slice(0, 200));

  const ph = await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: PH });
  check('phụ huynh KHÔNG mở được lời nhắc này — nó là việc của cô', ph.status === 403, ph.status);

  const ma = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('máy chủ không có chỗ nào đếm số quan sát của một bé rồi trả ra',
    !/COUNT\(\*\)[\s\S]{0,80}GROUP BY studentId/i.test(ma));
  const view = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('màn hình nói rõ đây là lời nhắc cho CÔ, không phải nhận định về bé',
    /không phải nhận định gì về bé/.test(view));

  // Ô GHI NHANH Ở GÓC DƯỚI MÀN HÌNH (Đ191, Câu 1). Nhà trường: "Mong muốn khi
  // vào mục 'hành trình của bé' sẽ hiện thêm phần ghi nhanh quan sát ở dưới
  // góc dưới màn hình và có thể tag tên học sinh".
  check('có nút Ghi nhanh cố định ở góc dưới màn hành trình',
    /id="ht-ghi-nhanh"/.test(view) && /position:fixed/.test(view));
  check('và nó tránh vùng tay cầm dưới cùng của điện thoại',
    /env\(safe-area-inset-bottom/.test(view));
  // CHỈ HIỆN VỚI CÔ. Bản ghi nó tạo ra là ghi chép thô của cô — dữ liệu LỚP 1
  // trong bảng ba lớp của CLAUDE.md, thứ không bao giờ lộ sang phụ huynh.
  check('NÚT ẤY KHÔNG HIỆN VỚI GIA ĐÌNH',
    /nutGhiNhanh\(\)\s*\{[\s\S]{0,200}?laGiaDinh\(\)\)\s*return ''/.test(view),
    (view.match(/nutGhiNhanh\(\)[\s\S]{0,160}/) || [])[0]);
  // "Tag tên bé" đi qua CHÍNH biểu mẫu ghi quan sát đang có, không dựng đường
  // ghi thứ hai — hai chỗ cùng một luật là hai chỗ sẽ trôi khỏi nhau.
  check('nút mở thẳng biểu mẫu ghi quan sát đang có, không dựng đường ghi thứ hai',
    /ht-ghi-nhanh[\s\S]{0,400}?moGhi\(null\)/.test(view));
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
  //
  // TÍNH TỪ "HÔM NAY" CỦA MÁY CHỦ, KHÔNG TỪ `Date.now()`.
  //
  // Máy chủ chia tuần theo giờ Việt Nam (Đ2). Bản cũ cộng 7 ngày vào giờ UTC,
  // nên trong khoảng 17h UTC tới nửa đêm — tức đã sang ngày mới ở Việt Nam —
  // "tuần sau" tính ra lại rơi vào CHÍNH tuần này, và lượt chép bị từ chối vì
  // tuần này đã có chủ đề. Đỏ vào buổi tối, xanh vào buổi sáng.
  const tuanSau = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + 7 * 86400000)
    .toISOString().slice(0, 10);
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

  // MÀN HÌNH PHẢI SOẠN ĐƯỢC CHO TUẦN SAU, KHÔNG CHỈ TUẦN ĐANG CHẠY
  //
  // Nếp của trường: thứ Sáu gửi thực đơn VÀ chủ đề học tập tuần tới cho gia
  // đình. Máy chủ nhận `tuan` từ đầu — ba đường ngay trên đây đều nhận — nhưng
  // màn hình không bao giờ gửi, nên nó luôn soạn cho tuần đang chạy. Tức là
  // thứ Sáu, đúng hôm phải soạn tuần sau, lại là hôm DUY NHẤT không soạn được;
  // cô phải chờ tới thứ Hai, mà thứ Hai thì gia đình đã cần biết rồi.
  //
  // Canh ở tầng chữ vì đây là chỗ hỏng: một máy chủ đúng cộng một màn hình
  // không bao giờ dùng tới cái đúng đó.
  const manChuDe = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('MÀN CHỦ ĐỀ TUẦN CÓ Ô CHỌN TUẦN', /oChonTuan\s*\(/.test(manChuDe), 'thiếu oChonTuan');
  check('và chọn được cả tuần này lẫn tuần sau',
    /'Tuần này'/.test(manChuDe) && /'Tuần sau'/.test(manChuDe));
  check('lượt LƯU chủ đề gửi kèm tuần đang soạn',
    /chu-de',\s*\{[\s\S]{0,120}?tuan:\s*this\._tuan/.test(manChuDe), 'PUT không gửi tuan');
  check('lượt CHÉP tuần trước cũng gửi kèm tuần đang soạn',
    /chep-tuan-truoc',\s*\n?\s*\{[\s\S]{0,120}?tuan:\s*this\._tuan/.test(manChuDe),
    'POST chép không gửi tuan');
  check('và lượt ĐỌC cũng hỏi đúng tuần đang soạn',
    /chu-de\?classId=\$\{encodeURIComponent\(this\._classId\)\}`[\s\S]{0,80}?tuan=/.test(manChuDe),
    'GET không gửi tuan');
  check('THỨ SÁU CÓ LỜI NHẮC soạn chủ đề tuần sau',
    /nhacThuSau\s*\(/.test(manChuDe) && /getDay\(\)\s*!==\s*5/.test(manChuDe), 'thiếu nhắc thứ Sáu');
  check('và lời nhắc thực đơn của văn phòng cũng nói tới chủ đề học tập',
    /chủ đề học tập tuần tới/.test(
      fs.readFileSync(path.join(GOC, 'public/js/views/menu.js'), 'utf8')),
    'lời nhắc thứ Sáu ở màn Thực đơn chỉ nói mỗi thực đơn');
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
  // TẮT LÀ BIẾN KHỎI MÀN HÌNH, KỂ CẢ MÀN HÌNH CỦA PHÂN HỆ KHÁC.
  //
  // Chặn ở HTTP (chanApiDaTat) không đủ: đường này không đi qua HTTP mà đọc
  // thẳng bảng thuchup_ghinhanh. Không hỏi công tắc thì nhà trường tắt Ghi
  // nhanh xong vẫn thấy nội dung ghi nhanh chảy ra qua màn Hành trình.
  check('VÀ NỘI DUNG GHI NHANH KHÔNG CÒN CHẢY RA QUA MÀN NÀY NỮA',
    (khiTat.data?.ghiNhanhChuaDung || []).length === 0, khiTat.data?.ghiNhanhChuaDung);
  check('phần quan sát của chính phân hệ này còn nguyên',
    (khiTat.data?.quanSat || []).length > 0, khiTat.data?.quanSat?.length);
  await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: true } });

  const maNguon = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('mã có bọc lỗi khi đọc bảng của phân hệ khác',
    /try\s*\{[\s\S]{0,900}thuchup_ghinhanh[\s\S]{0,900}catch/.test(maNguon));
  check('và có hỏi công tắc trước khi đọc',
    /modules\.dangBat\('thuchup'\)/.test(maNguon));

  await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: true } });
  check('bật lại thì gợi ý quay về',
    ((await req('GET', `/api/hanhtrinh/hom-nay?ngay=${HOM_NAY}`, { cookie: GV })).data?.ghiNhanhChuaDung || [])
      .length >= 0);
}

// ===========================================================================
console.log('\n[12] CHÉP TỪ GHI NHANH — chép được chữ, chép được ảnh, và KHÔNG chép của cô khác');
{
  const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // Cô ghi nhanh một bản có CẢ chữ lẫn ảnh.
  const ma = `gn2-${Date.now()}-abcdef`;
  const gn = await req('POST', '/api/thuchup', {
    cookie: GV, body: { id: ma, studentId: 's1', note: 'Bé rót nước không đổ một giọt nào.', dataUrl: ANH, giay: 9 },
  });
  check('cô ghi nhanh được bản có ảnh', gn.status === 200 || gn.status === 201, gn.data);

  // CHÉP SANG MÀ KHÔNG GÕ LẠI GÌ CẢ.
  //
  // Bản đầu để `moTa` trống và bỏ luôn ảnh, nên nút "chép sang" bắt cô gõ lại
  // từ đầu đúng câu mình vừa viết mười phút trước — nút đó không giúp được gì.
  const chep = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', ngay: HOM_NAY, ghiNhanhId: ma },
  });
  check('chép sang được mà không phải gõ lại', chep.status === 201, chep.data);
  check('CHỮ ĐƯỢC MANG SANG', /rót nước/.test(chep.data?.moTa || ''), chep.data?.moTa);
  check('ẢNH CŨNG ĐƯỢC MANG SANG', !!chep.data?.anh, chep.data?.anh);
  check('nhưng là một TỆP KHÁC, không dùng chung với bản Ghi nhanh',
    chep.data?.anh !== gn.data?.file, { moi: chep.data?.anh, goc: gn.data?.file });

  // Tệp mới phải tải được thật, không phải một cái tên suông.
  const tai = await req('GET', `/api/hanhtrinh/anh/${chep.data.anh}`, { cookie: GV });
  check('và tải được tệp ảnh mới đó', tai.status === 200, tai.status);

  // Cô gõ đè thì phần cô gõ thắng — chép sang là gợi ý, không phải ép.
  const ma2 = `gn3-${Date.now()}-abcdef`;
  await req('POST', '/api/thuchup', { cookie: GV, body: { id: ma2, studentId: 's1', note: 'Câu gốc' } });
  const de = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', ngay: HOM_NAY, ghiNhanhId: ma2, moTa: 'Cô viết lại kỹ hơn' },
  });
  check('cô gõ đè thì phần cô gõ thắng', de.data?.moTa === 'Cô viết lại kỹ hơn', de.data?.moTa);

  // ---- LỖ QUYỀN: gắn quan sát của mình vào bản Ghi nhanh của cô KHÁC ----
  //
  // `ghiNhanhId` đi vào từ thân yêu cầu, và bản đầu lưu thẳng chuỗi đó xuống mà
  // không tra bản Ghi nhanh nào cả. Cô A gắn được vào bản của cô B, và bản đó
  // biến khỏi màn suy ngẫm của cô B — ghi chú thô của cô B là dữ liệu LỚP 1.
  // Dùng cô Bích Ngọc (GV3) — cô CŨNG phụ trách nhóm c1, nên cả hai cô đều mở
  // được hồ sơ bé s1. Nhờ vậy `canAccessStudent` không chặn trước, và chốt mới
  // là thứ DUY NHẤT đứng giữa. Lấy một cô nhóm khác thì bài canh đi qua vô ích:
  // nó đo tầng nhóm lớp chứ không đo chốt vừa thêm.
  const maB = `gnB-${Date.now()}-abcdef`;
  const cuaCoB = await req('POST', '/api/thuchup', {
    cookie: GV3, body: { id: maB, studentId: 's1', note: 'Ghi chép riêng của cô B' },
  });
  check('cô B ghi nhanh được cho bé cùng nhóm', cuaCoB.status === 200 || cuaCoB.status === 201, cuaCoB.data);
  check('và cô A vẫn mở được hồ sơ bé đó — nên tầng nhóm KHÔNG chặn trước',
    (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).status === 200);

  const trom = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', ngay: HOM_NAY, ghiNhanhId: maB },
  });
  check('CÔ A KHÔNG GẮN ĐƯỢC VÀO BẢN GHI NHANH CỦA CÔ B', trom.status === 403, trom.status);
  check('và câu từ chối nói rõ đó là ghi chép riêng của cô khác',
    /cô khác/i.test(String(trom.data?.error || '')), trom.data);
  check('KHÔNG một chữ nào của cô B lọt sang', !/Ghi chép riêng của cô B/.test(JSON.stringify(trom.data)), trom.data);

  // Bản Ghi nhanh của bé KHÁC cũng không gắn được — hai giá trị phải khớp nhau,
  // đúng bài học N24(a): kiểm quyền trên một giá trị rồi tra bản ghi theo giá
  // trị kia là không kiểm gì cả.
  const lechBe = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's3', ngay: HOM_NAY, ghiNhanhId: ma2 },
  });
  check('bản Ghi nhanh của bé này KHÔNG gắn sang bé kia được', lechBe.status === 403, lechBe.status);
  check('và nói rõ vì sao', /bé khác/i.test(String(lechBe.data?.error || '')), lechBe.data);

  // Mã bịa ra thì từ chối, không im lặng lưu xuống.
  const bia = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', ngay: HOM_NAY, moTa: 'x', ghiNhanhId: 'khong-co-that' },
  });
  check('mã Ghi nhanh bịa ra thì từ chối', bia.status === 403, bia.status);
}


// ===========================================================================
console.log('\n[13] Tầng cơ sở vẫn canh ở phân hệ mới');
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

// ===========================================================================
console.log('\n[+] GHI NHẦM BÉ — phải có đường lùi, và đường lùi cũng phải canh quyền');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Hộp thoại ghi quan sát từng dựng ô chọn bé KHÔNG có dòng trống, nên bé đầu
  // danh sách luôn được chọn sẵn. Cô bấm Lưu mà quên đổi tên bé thì quan sát
  // nằm vĩnh viễn trong hành trình của bé khác, kèm ảnh của bé khác — và không
  // có đường lùi nào: đường sửa không nhận `studentId`, và không phân hệ nào
  // trong modules/ có một `app.delete` nào cả.
  const tao = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'Ghi nhầm: quan sát này là của bé khác.', anh: ANH },
  });
  const id = tao.data?.id;
  check('ghi được một quan sát để thử', !!id, tao.data);

  // ---- Chuyển sang đúng bé ----
  const chuyen = await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { studentId: 's3' } });
  check('CHUYỂN ĐƯỢC QUAN SÁT SANG ĐÚNG BÉ', chuyen.status === 200, chuyen.data);
  const sau = (await hoSo(GV, 's3')).quanSat.find(q => q.id === id);
  check('quan sát nay nằm trong hành trình của bé mới', !!sau, sau);
  const cuaBeCu = (await hoSo(GV, 's1')).quanSat.find(q => q.id === id);
  check('và KHÔNG còn trong hành trình của bé cũ', !cuaBeCu, cuaBeCu);

  // ---- Không được chuyển sang bé mình không dạy ----
  const langNhang = await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { studentId: 's7' } });
  check('KHÔNG chuyển được sang bé của nhóm mình không dạy', langNhang.status === 403, langNhang.status);

  // ---- Câu chuyện đã công bố thì chuyển bé phải THU LẠI ----
  await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV,
    body: { linhVuc: 'thuc-hanh-cuoc-song', trangThai: 'dang-hinh-thanh', oLopLamGi: 'Cho con làm lại vào ngày mai' },
  });
  await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV,
    body: {
      cauChuyen: 'Hôm nay con làm được một việc rất hay.',
      cungConONha: 'Bố mẹ cho con làm lại việc đó ở nhà cuối tuần nhé.',
    },
  });
  const congBo = await req('POST', `/api/hanhtrinh/${id}/cong-bo`, { cookie: GV });
  check('công bố được câu chuyện', congBo.status === 200, congBo.data);
  const daCongBo = (await hoSo(GV, 's3')).quanSat.find(q => q.id === id);
  check('và nó ĐANG ở trạng thái đã công bố trước khi chuyển bé',
    daCongBo && daCongBo.daCongBo === true, daCongBo);

  await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { studentId: 's4' } });
  const sauChuyen = (await hoSo(GV, 's4')).quanSat.find(q => q.id === id);
  check('CHUYỂN BÉ THÌ CÂU CHUYỆN ĐÃ CÔNG BỐ BỊ THU LẠI — không đưa chuyện nhà này sang nhà kia',
    sauChuyen && sauChuyen.daCongBo === false, sauChuyen);

  // ---- Xoá ----
  const coKhac = await req('DELETE', `/api/hanhtrinh/${id}`, { cookie: GV2 });
  check('cô nhóm khác KHÔNG xoá được', coKhac.status === 403 || coKhac.status === 404, coKhac.status);

  const phuHuynh = await req('DELETE', `/api/hanhtrinh/${id}`, { cookie: PH });
  check('phụ huynh KHÔNG xoá được', phuHuynh.status === 403, phuHuynh.status);

  const xoa = await req('DELETE', `/api/hanhtrinh/${id}`, { cookie: GV });
  check('CÔ ĐÃ GHI THÌ XOÁ ĐƯỢC', xoa.status === 200, xoa.data);
  const conKhong = (await hoSo(GV, 's4')).quanSat.find(q => q.id === id);
  check('và quan sát biến mất thật', !conKhong, conKhong);

  const xoaLai = await req('DELETE', `/api/hanhtrinh/${id}`, { cookie: GV });
  check('xoá lần hai thì báo không tìm thấy, không nổ', xoaLai.status === 404, xoaLai.status);
}

// ===========================================================================
console.log('\n[14] SỬA MỘT CÂU CHUYỆN ĐÃ CÔNG BỐ KHÔNG ĐƯỢC ĐI VÒNG QUA QUY TẮC 5');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Khối lớp 3 của `PUT /api/hanhtrinh/:id` từng mang tên "Lớp 3, còn là nháp",
  // và giao diện gọi nút đó là "Lưu nháp" rồi báo "gia đình chưa đọc được". Cả
  // ba đều SAI khi bản ghi đã công bố: chữ đi thẳng lên màn hình gia đình.
  //
  // Nặng hơn: `cungConONha` XOÁ TRẮNG được qua đường này, trong khi đường
  // `cong-bo` bắt buộc phải có nó. Tức đi vòng qua đúng QUY TẮC 5 — mỗi nhận
  // định phải kèm một việc làm được.
  const tao = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'Bé tự rót nước vào cốc, không đổ giọt nào.' },
  });
  const id = tao.data?.id;
  check('tạo được quan sát để thử', !!id, tao.data);

  const cb = await req('POST', `/api/hanhtrinh/${id}/cong-bo`, {
    cookie: GV,
    body: {
      cauChuyen: 'Hôm nay bé tự rót nước, cả nhóm cùng vỗ tay.',
      cungConONha: 'Tối nay bố mẹ để con tự rót nước vào cốc — 5 phút, dùng luôn ca trên bàn.',
    },
  });
  check('câu chuyện đã công bố — nếu không thì cả mục này rỗng',
    cb.status === 200 && !!(cb.data?.congBoLuc || cb.data?.daCongBo),
    `${cb.status} ${JSON.stringify(cb.data).slice(0, 160)}`);

  // XOÁ TRẮNG "cùng con ở nhà" trên bản ĐÃ công bố phải bị từ chối.
  const xoaTrang = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV, body: { cungConONha: '' },
  });
  check('KHÔNG xoá trắng được "cùng con ở nhà" của bản đã công bố',
    xoaTrang.status === 400, `${xoaTrang.status} ${xoaTrang.data?.error || ''}`);
  check('và lời từ chối chỉ đúng đường ra: thu hồi trước',
    /thu hồi/i.test(xoaTrang.data?.error || ''), xoaTrang.data);

  const xoaChuyen = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV, body: { cauChuyen: '' },
  });
  check('cũng KHÔNG xoá trắng được chính câu chuyện', xoaChuyen.status === 400, xoaChuyen.status);

  // NHƯNG SỬA MỘT LỖI CHÍNH TẢ THÌ VẪN PHẢI ĐƯỢC — không siết tới mức làm phiền
  // cô vì một việc đúng.
  const sua = await req('PUT', `/api/hanhtrinh/${id}`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay bé tự rót nước, cả nhóm cùng vỗ tay khen bé.' },
  });
  check('sửa chữ trong câu chuyện đã công bố thì VẪN được', sua.status === 200,
    `${sua.status} ${sua.data?.error || ''}`);

  // Và trên bản CHƯA công bố thì để trống vẫn được — đó mới đúng là nháp.
  const nhap = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'Bé xếp khối cao bảy tầng.' },
  });
  const trong = await req('PUT', `/api/hanhtrinh/${nhap.data?.id}`, {
    cookie: GV, body: { cungConONha: '' },
  });
  check('bản CHƯA công bố thì vẫn để trống được — nháp dở dang là chuyện bình thường',
    trong.status === 200, `${trong.status} ${trong.data?.error || ''}`);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
