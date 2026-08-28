// Bài canh LUẬT ẢNH NHÓM và ĐỒNG Ý CỦA GIA ĐÌNH.
//
// Chạy bằng:  npm run test:anh-nhom
//
// VÌ SAO CÓ BÀI NÀY
//
// CLAUDE.md viết: "Ảnh nhóm: một ảnh chỉ hiện cho gia đình khác khi MỌI bé
// trong ảnh đều có đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện."
//
// Cho tới trước đợt này, đó là một câu chưa thực thi được — trong mã không có
// trường đồng ý, không có cách biết trong ảnh có ai, và không bài canh nào.
// Bài này tồn tại để câu đó không quay lại thành lời hứa suông.
//
// BA CHỖ PHẢI CANH, VÀ CHỖ THỨ BA MỚI LÀ CHỖ THẬT
//
// Ảnh đi ra khỏi máy chủ bằng ba đường: danh sách album (kèm ảnh bìa), chi tiết
// album, và đường trả BYTE của tấm ảnh. Lọc ở hai đường đầu chỉ làm ảnh không
// hiện trong danh sách — ai biết mã ảnh vẫn tải thẳng được qua đường thứ ba.
// Mà mã ảnh không hề bí mật: nó nằm trong gói JSON mà chính phụ huynh đó đã
// nhận ở lần xem trước, TRƯỚC khi gia đình kia rút lại đồng ý.
//
// BA GIÁ TRỊ, KHÔNG PHẢI HAI
//
// "Chưa thu được giấy của bé An" khác hoàn toàn "gia đình bé An nói không".
// Đầu năm học có hàng chục tờ giấy chưa về. Bài này canh cả hai trạng thái đó
// riêng ra, vì gộp chúng lại là hoặc vu cho gia đình đã từ chối, hoặc coi im
// lặng là đồng ý.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('anh-nhom');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3972), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const dau = await login('hieutruong', mkTam);
await req('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'quantri2026' } });
const A = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;      // cô Mai Anh — nhóm c1 (Chồi 2)
const PH1 = (await login('phuhuynh', '123456')).cookie;     // p1 — mẹ bé s1 (Chồi 2)
const PH2 = (await login('phuhuynh2', '123456')).cookie;    // p2 — bố bé s3 (Chồi 2)

// Album của nhóm Chồi 2 để làm việc trên đó.
const dsAlbum = (await req('GET', '/api/albums', { cookie: GV })).data || [];
const album = dsAlbum.find(a => a.className === 'Chồi 2');
const chiTiet = (await req('GET', `/api/albums/${album.id}`, { cookie: GV })).data;
const ANH = (chiTiet.photos || []).map(p => p.id);

// Đếm số ảnh một người xem được trong album đó.
async function soAnhXemDuoc(cookie) {
  const r = await req('GET', `/api/albums/${album.id}`, { cookie });
  return r.status === 200 ? (r.data.photos || []).length : -1;
}

// ===========================================================================
console.log('\n[1] Dữ liệu mẫu dựng đúng ba trạng thái đồng ý');
{
  const ds = (await req('GET', '/api/admin/students', { cookie: A })).data || [];
  const lay = (id) => (ds.find(b => b.id === id) || {}).dongY || {};
  check('bé s1: gia đình ĐỒNG Ý chia sẻ ảnh', lay('s1').chiaSeGiaDinh === true, lay('s1'));
  check('bé s3: gia đình TỪ CHỐI chia sẻ ảnh', lay('s3').chiaSeGiaDinh === false, lay('s3'));
  check('bé s2: CHƯA TRẢ LỜI — null, không phải false',
    lay('s2').chiaSeGiaDinh === null, lay('s2'));
  check('và ba trạng thái đó là BA giá trị khác nhau, không phải hai',
    new Set([lay('s1').chiaSeGiaDinh, lay('s3').chiaSeGiaDinh, lay('s2').chiaSeGiaDinh]).size === 3);
  check('có ghi ai ký giấy và ký ngày nào', !!lay('s1').nguoiKy && !!lay('s1').ngayKy, lay('s1'));
}

// ===========================================================================
console.log('\n[2] Cô và quản trị thấy hết — giấu ảnh khỏi cô là làm chết cơ chế');
{
  const co = await soAnhXemDuoc(GV);
  check('cô thấy đủ mọi ảnh của nhóm mình', co === ANH.length, [co, ANH.length]);
  const qt = await soAnhXemDuoc(A);
  check('quản trị cũng vậy', qt === ANH.length, [qt, ANH.length]);
  check('và cô nhận được danh sách bé đã gắn thẻ trong từng ảnh',
    (chiTiet.photos || []).every(p => Array.isArray(p.beTrongAnh)), chiTiet.photos?.[0]);
}

// ===========================================================================
console.log('\n[3] Ảnh CHƯA gắn thẻ: nhóm có người từ chối thì tạm ẩn với nhà khác');
{
  // Nhóm Chồi 2 có bé s3 mà gia đình đã nói không. Chưa ảnh nào gắn thẻ.
  const meCuaS1 = await soAnhXemDuoc(PH1);
  check('PHỤ HUYNH KHÔNG THẤY ẢNH CHƯA GẮN THẺ khi nhóm có gia đình từ chối',
    meCuaS1 === 0, meCuaS1);

  const dsCuaMe = (await req('GET', '/api/albums', { cookie: PH1 })).data || [];
  const alMe = dsCuaMe.find(x => x.id === album.id);
  check('ảnh BÌA ngoài danh sách cũng bị ẩn theo — không thì ảnh vẫn hiện to đùng',
    !alMe || !alMe.cover, alMe && alMe.cover);
  check('và số đếm là số ảnh NGƯỜI NÀY xem được, không phải tổng của album',
    !alMe || alMe.photoCount === 0, alMe && alMe.photoCount);

  check('cô được NHẮC vì sao ảnh đang tạm ẩn và cách làm nó hiện lại',
    !!chiTiet.nhacGanThe && /gắn thẻ/.test(chiTiet.nhacGanThe.loiNhac || ''), chiTiet.nhacGanThe);
  check('lời nhắc nói rõ có bao nhiêu ảnh đang tạm ẩn',
    chiTiet.nhacGanThe?.soAnhTamAn === ANH.length, chiTiet.nhacGanThe?.soAnhTamAn);
}

// ===========================================================================
console.log('\n[4] Gắn thẻ rồi thì luật chạy đúng từng tấm một');
{
  // Ảnh 1: chỉ bé s1 (gia đình đồng ý) -> mọi nhà trong nhóm xem được.
  const g1 = await req('PUT', `/api/albums/${album.id}/photos/${ANH[0]}/be`,
    { cookie: GV, body: { studentIds: ['s1'] } });
  check('cô gắn thẻ được', g1.status === 200, g1.data);

  // Ảnh 2: có bé s3 (gia đình TỪ CHỐI) -> chỉ nhà bé s3 xem được.
  await req('PUT', `/api/albums/${album.id}/photos/${ANH[1]}/be`,
    { cookie: GV, body: { studentIds: ['s1', 's3'] } });

  // Ảnh 3: có bé s2... s2 học nhóm khác nên không gắn được. Dùng s5 (đồng ý)
  // và s6 (chưa trả lời) — cùng nhóm Chồi 2.
  await req('PUT', `/api/albums/${album.id}/photos/${ANH[2]}/be`,
    { cookie: GV, body: { studentIds: ['s5', 's6'] } });

  const me1 = (await req('GET', `/api/albums/${album.id}`, { cookie: PH1 })).data;
  const thay1 = (me1.photos || []).map(p => p.id);
  check('ẢNH CHỈ CÓ BÉ ĐÃ ĐỒNG Ý: mẹ bé s1 xem được', thay1.includes(ANH[0]), thay1);
  check('ẢNH CÓ BÉ GIA ĐÌNH TỪ CHỐI: mẹ bé s1 KHÔNG xem được', !thay1.includes(ANH[1]), thay1);
  check('ẢNH CÓ BÉ CHƯA TRẢ LỜI: cũng KHÔNG — im lặng không phải là đồng ý',
    !thay1.includes(ANH[2]), thay1);

  // Nhà của chính bé bị từ chối vẫn xem được ảnh con mình — đó là ảnh của con họ.
  const bo3 = (await req('GET', `/api/albums/${album.id}`, { cookie: PH2 })).data;
  const thay3 = (bo3.photos || []).map(p => p.id);
  check('GIA ĐÌNH CỦA CHÍNH BÉ ĐÓ VẪN XEM ĐƯỢC ẢNH CON MÌNH', thay3.includes(ANH[1]), thay3);
  check('nhưng không vì thế mà thấy ảnh có bé khác chưa đồng ý', !thay3.includes(ANH[2]), thay3);

  check('và phụ huynh KHÔNG nhận được danh sách bé trong ảnh — tên con nhà khác',
    (me1.photos || []).every(p => p.beTrongAnh === undefined), me1.photos?.[0]);
}

// ===========================================================================
console.log('\n[5] CHỐT CHẶN THẬT: đường trả BYTE của tấm ảnh');
{
  // Mã ảnh không bí mật — phụ huynh đã nhận nó ở lần xem trước. Chặn ở danh
  // sách mà không chặn ở đây là chặn hờ.
  const cam = await fetch(`${sv.BASE}/api/albums/${album.id}/photo/${ANH[1]}`, { headers: { cookie: PH1 } });
  check('TẢI THẲNG ẢNH BỊ CẤM BẰNG MÃ ẢNH: bị từ chối', cam.status === 403, cam.status);

  const duoc = await fetch(`${sv.BASE}/api/albums/${album.id}/photo/${ANH[0]}`, { headers: { cookie: PH1 } });
  check('còn ảnh được phép thì tải bình thường', duoc.status === 200 || duoc.status === 404, duoc.status);

  const coTai = await fetch(`${sv.BASE}/api/albums/${album.id}/photo/${ANH[1]}`, { headers: { cookie: GV } });
  check('cô tải được mọi ảnh của nhóm mình', coTai.status === 200 || coTai.status === 404, coTai.status);
}

// ===========================================================================
console.log('\n[6] Gia đình rút lại đồng ý thì ảnh thôi hiện NGAY');
{
  // Quyền rút lại bất cứ lúc nào là quyền theo Nghị định 13/2023. App phải làm
  // được cả chiều đó, không chỉ chiều đồng ý.
  const truoc = (await req('GET', `/api/albums/${album.id}`, { cookie: PH1 })).data;
  check('trước khi rút: mẹ bé s1 còn xem được ảnh đó',
    (truoc.photos || []).some(p => p.id === ANH[0]));

  const rut = await req('PUT', '/api/admin/students/s1/dong-y',
    { cookie: A, body: { chiaSeGiaDinh: false } });
  check('văn phòng ghi được việc rút lại', rut.status === 200 && rut.data?.dongY?.chiaSeGiaDinh === false, rut.data);

  // Ảnh chỉ có bé s1: nhà s1 vẫn xem được (con mình), nhà khác thì không.
  const nhaKhac = (await req('GET', `/api/albums/${album.id}`, { cookie: PH2 })).data;
  check('NHÀ KHÁC THÔI THẤY ẢNH ĐÓ NGAY, không cần khởi động lại',
    !(nhaKhac.photos || []).some(p => p.id === ANH[0]), (nhaKhac.photos || []).map(p => p.id));
  const cam2 = await fetch(`${sv.BASE}/api/albums/${album.id}/photo/${ANH[0]}`, { headers: { cookie: PH2 } });
  check('và tải thẳng bằng mã ảnh cũng bị chặn ngay', cam2.status === 403, cam2.status);

  // Trả lại để phần sau chạy đúng bối cảnh.
  await req('PUT', '/api/admin/students/s1/dong-y', { cookie: A, body: { chiaSeGiaDinh: true } });
}

// ===========================================================================
console.log('\n[7] Ranh giới của đường gắn thẻ và đường ghi đồng ý');
{
  const phGan = await req('PUT', `/api/albums/${album.id}/photos/${ANH[0]}/be`,
    { cookie: PH1, body: { studentIds: [] } });
  check('phụ huynh KHÔNG gắn thẻ được', phGan.status === 403, phGan.status);

  const qtGan = await req('PUT', `/api/albums/${album.id}/photos/${ANH[0]}/be`,
    { cookie: A, body: { studentIds: [] } });
  check('quản trị cũng KHÔNG — quản trị không ở trong lớp, không biết trong ảnh là bé nào',
    qtGan.status === 403, qtGan.status);

  const beLac = await req('PUT', `/api/albums/${album.id}/photos/${ANH[0]}/be`,
    { cookie: GV, body: { studentIds: ['s2'] } });
  check('KHÔNG gắn được bé của nhóm khác vào ảnh', beLac.status === 400, beLac.data);

  const phGhi = await req('PUT', '/api/admin/students/s1/dong-y',
    { cookie: PH1, body: { chiaSeGiaDinh: true } });
  check('phụ huynh KHÔNG tự ghi đồng ý cho mình', phGhi.status === 403, phGhi.status);
  const coGhi = await req('PUT', '/api/admin/students/s1/dong-y',
    { cookie: GV, body: { chiaSeGiaDinh: true } });
  check('cô cũng KHÔNG — đây là giấy tờ, việc của văn phòng', coGhi.status === 403, coGhi.status);
}

// ===========================================================================
console.log('\n[8] Không gửi một mục = không đụng tới mục đó');
{
  await req('PUT', '/api/admin/students/s4/dong-y',
    { cookie: A, body: { hoSoHocTap: true, chiaSeGiaDinh: true, truyenThong: true, nguoiKy: 'Vũ Đình Khoa' } });
  const chiSuaMotMuc = await req('PUT', '/api/admin/students/s4/dong-y',
    { cookie: A, body: { truyenThong: false } });
  const d = chiSuaMotMuc.data?.dongY || {};
  check('sửa mục ③ thì mục ① và ② CÒN NGUYÊN',
    d.hoSoHocTap === true && d.chiaSeGiaDinh === true, d);
  check('và người ký cũng còn nguyên', d.nguoiKy === 'Vũ Đình Khoa', d.nguoiKy);
  check('mục vừa sửa đúng là false', d.truyenThong === false, d.truyenThong);

  const veChuaTraLoi = await req('PUT', '/api/admin/students/s4/dong-y',
    { cookie: A, body: { truyenThong: null } });
  check('gửi null MỚI là đưa về "chưa trả lời" — dùng khi gia đình rút lại',
    veChuaTraLoi.data?.dongY?.truyenThong === null, veChuaTraLoi.data?.dongY);
}

// ===========================================================================
console.log('\n[9] Nhóm KHÔNG có ai từ chối thì mọi thứ y như trước (Nguyên tắc số 1)');
{
  // Nhóm Lá 1 (c2) chưa gia đình nào trả lời gì. Bật cơ chế này lên KHÔNG được
  // làm biến mất một tấm ảnh nào của trường đang dùng.
  const dsLa = (await req('GET', '/api/albums', { cookie: A })).data || [];
  const alLa = dsLa.find(x => x.className === 'Lá 1');
  if (alLa) {
    const cuaQT = (await req('GET', `/api/albums/${alLa.id}`, { cookie: A })).data;
    const phLa = (await login('phuhuynh', '123456')).cookie;   // p1 cũng là mẹ bé s2 ở Lá 1
    const cuaPH = (await req('GET', `/api/albums/${alLa.id}`, { cookie: phLa })).data;
    check('NHÓM CHƯA AI TỪ CHỐI: phụ huynh vẫn xem đủ ảnh như trước khi có cơ chế này',
      (cuaPH.photos || []).length === (cuaQT.photos || []).length,
      [(cuaPH.photos || []).length, (cuaQT.photos || []).length]);
    check('và không có lời nhắc gắn thẻ nào làm phiền cô',
      cuaQT.nhacGanThe === undefined, cuaQT.nhacGanThe);
  } else {
    check('tìm được album nhóm Lá 1 để thử', false, dsLa.map(x => x.className));
  }
}

// ===========================================================================
console.log('\n[9b] GIA ĐÌNH TỰ XEM VÀ TỰ RÚT ĐƯỢC GIẤY ĐỒNG Ý CỦA MÌNH');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Ba ô đồng ý trước đây chỉ ghi được qua đường quản trị, và không một màn
  // hình nào của phụ huynh chạm tới. Gia đình muốn rút phải gọi điện cho văn
  // phòng, và cũng không có chỗ nào tự kiểm mình đã ký gì. Nghị định 13/2023
  // cho chủ thể dữ liệu quyền rút lại — một quyền chỉ thực hiện được qua điện
  // thoại bàn thì trên thực tế là một quyền khó dùng.
  const xem = await req('GET', '/api/dong-y?studentId=s1', { cookie: PH1 });
  check('MẸ BÉ s1 XEM ĐƯỢC GIẤY ĐỒNG Ý CỦA CON MÌNH', xem.status === 200, xem.data);
  check('thấy đủ ba mục', ['hoSoHocTap', 'chiaSeGiaDinh', 'truyenThong']
    .every(k => k in (xem.data?.dongY || {})), xem.data?.dongY);
  check('và biết mình rút lại được', xem.data?.tuRutDuoc === true, xem.data?.tuRutDuoc);

  const trom = await req('GET', '/api/dong-y?studentId=s3', { cookie: PH1 });
  check('KHÔNG xem được giấy của con nhà khác', trom.status === 403, trom.status);

  // ---- Chiều CẤM: gia đình KHÔNG tự đồng ý được ----
  //
  // Đồng ý là một tờ giấy CÓ CHỮ KÝ. Nếu bấm một nút trong app cũng ghi được
  // "đã đồng ý" thì nhà trường có một bản ghi đồng ý mà không chữ ký nào đứng
  // sau — lúc có chuyện thì không ai chứng minh được gia đình đã đồng ý thật.
  const tuDongY = await req('PUT', '/api/dong-y', {
    cookie: PH1, body: { studentId: 's1', truyenThong: true },
  });
  check('GIA ĐÌNH KHÔNG TỰ ĐÁNH DẤU ĐỒNG Ý ĐƯỢC', tuDongY.status === 400, tuDongY.data);
  check('và câu từ chối nói rõ phải ký giấy ở văn phòng',
    /ký giấy/i.test(tuDongY.data?.error || ''), tuDongY.data);

  const daXem = (await req('GET', '/api/dong-y?studentId=s1', { cookie: PH1 })).data;
  check('lời từ chối đó KHÔNG làm đổi gì cả', daXem?.dongY?.truyenThong === false, daXem?.dongY);

  // ---- Chiều CHO PHÉP: rút lại được, và có hiệu lực NGAY ----
  const truocKhiRut = await soAnhXemDuoc(PH1);
  const rut = await req('PUT', '/api/dong-y', {
    cookie: PH1, body: { studentId: 's1', chiaSeGiaDinh: false },
  });
  check('MẸ BÉ s1 TỰ RÚT LẠI ĐƯỢC', rut.status === 200, rut.data);
  check('và giấy ghi lại đúng là đã rút', rut.data?.dongY?.chiaSeGiaDinh === false, rut.data?.dongY);

  // Rút xong thì luật ảnh nhóm phải đổi theo ngay — không cần ai bấm gì thêm.
  const sauKhiRut = await soAnhXemDuoc(PH1);
  check('RÚT XONG LÀ LUẬT ẢNH NHÓM ĐỔI NGAY, không phải chờ ai làm gì',
    sauKhiRut <= truocKhiRut, { truocKhiRut, sauKhiRut });

  // ---- Cô KHÔNG đi qua đường này ----
  const coGiaoRut = await req('PUT', '/api/dong-y', {
    cookie: GV, body: { studentId: 's1', hoSoHocTap: false },
  });
  check('CÔ KHÔNG rút hộ được — đây là quyền của gia đình', coGiaoRut.status === 403, coGiaoRut.status);
  check('và câu từ chối chỉ đúng chỗ văn phòng phải làm',
    /Quản trị/i.test(coGiaoRut.data?.error || ''), coGiaoRut.data);

  // Trả lại trạng thái cũ để mục [10] phía dưới chạy trên nền như trước.
  await req('PUT', '/api/admin/students/s1/dong-y', {
    cookie: A, body: { chiaSeGiaDinh: true },
  });
}

// ===========================================================================
console.log('\n[10] CHUYỂN NĂM HỌC KHÔNG ĐƯỢC LÀM LỜI TỪ CHỐI HẾT HIỆU LỰC');
{
  // ĐÂY LÀ MỤC ĐÁNG GIÁ NHẤT CỦA CẢ TỆP, VÌ NÓ CANH MỘT THỨ TỰ HẾT HẠN.
  //
  // Luật ảnh nhóm với ảnh CHƯA GẮN THẺ quyết định bằng câu hỏi "nhóm này có bé
  // nào từ chối chưa". Câu hỏi đó trước đây hỏi bằng hai điều kiện đều nói về
  // HIỆN TẠI: bé còn ở nhóm này không, và bé còn đang học không. Cả hai đều hết
  // đúng ngay sau khi chuyển năm học.
  //
  // Mà album năm cũ thì vẫn còn, và gia đình vẫn xem lại được qua màn "Năm học
  // trước". Nên những tấm ảnh từng bị ẩn sẽ HIỆN TRỞ LẠI — không ai bấm gì,
  // không ai rút lời từ chối, nó tự hết hiệu lực theo lịch nhà trường.
  //
  // Bài này đi đúng chuỗi sự việc đó một lượt.
  const ANH_THAT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const tao = await req('POST', '/api/albums', {
    cookie: GV,
    body: {
      title: 'Tuần lễ chơi với nước', classId: 'c1',
      photos: [{ dataUrl: ANH_THAT, caption: 'Cả nhóm nghịch nước ngoài sân' }],
    },
  });
  check('cô tạo được album mới của nhóm Chồi 2', tao.status === 200 || tao.status === 201, tao.data);
  const albumMoi = tao.data && (tao.data.id || (tao.data.album && tao.data.album.id));
  check('lấy được mã album vừa tạo', !!albumMoi, tao.data);

  // TRƯỚC khi chuyển năm: ảnh chưa gắn thẻ, nhóm có bé s3 từ chối → phải ẩn.
  const truoc = await req('GET', `/api/albums/${albumMoi}`, { cookie: PH1 });
  const anhTruoc = (truoc.data?.photos || []).length;
  check('TRƯỚC chuyển năm: mẹ bé s1 KHÔNG thấy ảnh chưa gắn thẻ', anhTruoc === 0, anhTruoc);

  // Chuyển năm học. Bé s3 sang nhóm mới, nhóm Chồi 2 đóng lại.
  const ch = await req('POST', '/api/schoolyear/promote', { cookie: A, body: { namMoi: '2027-2028' } });
  check('chuyển được năm học', ch.status === 200, ch.data);

  const beS3 = (await req('GET', '/api/admin/students', { cookie: A })).data
    ?.find(b => b.id === 's3');
  check('bé s3 ĐÃ RỜI nhóm Chồi 2 — tình huống của lỗi này đã dựng xong',
    !!beS3 && beS3.classId !== 'c1', beS3 && beS3.classId);

  // SAU khi chuyển năm: gia đình vẫn xem lại được album cũ...
  const dsCu = (await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH1 })).data || [];
  const alCu = dsCu.find(x => x.id === albumMoi);
  check('gia đình vẫn tìm lại được album của năm cũ', !!alCu, dsCu.map(x => x.title));

  // ...và ĐÂY LÀ PHÉP KIỂM CHÍNH.
  const sau = await req('GET', `/api/albums/${albumMoi}`, { cookie: PH1 });
  const anhSau = (sau.data?.photos || []).length;
  check('SAU CHUYỂN NĂM: ẢNH CHƯA GẮN THẺ VẪN PHẢI ẨN — lời từ chối không hết hạn theo năm học',
    anhSau === 0, { status: sau.status, anhSau });
  check('và ảnh bìa ngoài danh sách cũng vẫn ẩn', !alCu || !alCu.cover, alCu && alCu.cover);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
