// Bài canh GẮN THẺ NHIỀU ẢNH và ĐỔI CHẾ ĐỘ ALBUM (Đ153).
//
// Chạy bằng:  npm run test:gan-the-doi-che-do
//
// HAI MÓN NỢ SỔ `docs/VIEC-CON-LAI.md` ĐÃ CHỈ RA
//
//   AL-01 — GẮN THẺ NHIỀU ẢNH MỘT LƯỢT. Đây không phải một tiện ích thêm cho
//   vui: nó là THỨ TÔI ĐÃ HỨA VỚI NHÀ TRƯỜNG khi từ chối nhận diện khuôn mặt.
//   Trường xin app tự nhận mặt bé trong ảnh; tôi từ chối vì đó là dữ liệu sinh
//   trắc của trẻ dưới 6 tuổi, và đề nghị thay bằng "gắn thẻ nhanh nhiều bé một
//   lúc". Trường đồng ý. Một lời hứa đổi lấy một lời từ chối mà không làm thì
//   lời từ chối kia thành ra chỉ là lời từ chối.
//
//   ĐỔI CHẾ ĐỘ ALBUM. Chế độ trước nay chỉ ghi được đúng một lần lúc lập
//   album. Cô chọn nhầm "Cả nhóm" cho album đáng lẽ theo thẻ thì chỉ còn cách
//   xoá cả album rồi đăng lại — mất hết ảnh, mất hết thẻ, và gia đình nhận lại
//   một loạt tin báo cho ảnh cũ.
//
// HAI ĐIỀU CANH KỸ NHẤT:
//
//   1. CỘNG THÊM, KHÔNG GHI ĐÈ — mục [2]. Cô đang quét qua nhiều ảnh và nói
//      "trong mấy tấm này có bé A", chứ không nói "mấy tấm này CHỈ có A". Ghi
//      đè là xoá mất thẻ cô đã gắn trước đó, mà không có gì báo.
//   2. LUẬT ĐỒNG Ý CHIA SẺ KHÔNG BỊ NỚI — mục [5]. Đổi chế độ chỉ đổi việc
//      "album này lọc theo thẻ hay không"; một tấm có bé mà gia đình chưa đồng
//      ý chia sẻ thì vẫn ẩn với nhà khác, dù album ở chế độ nào.
import Database from 'better-sqlite3';
import path from 'node:path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, MAU,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('gan-the-doi-che-do');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4652), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const GV = (await login('giaovien', '123456')).cookie;
const GV2 = (await login('giaovien2', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Bé của nhóm c1 để gắn thẻ.
const conn0 = new Database(path.join(DIR, 'school.db'));
const BE = conn0.prepare("SELECT id, name FROM students WHERE classId = 'c1' AND active = 1 ORDER BY name").all();
conn0.close();

let AL; let ANH_IDS = [];
// ===========================================================================
console.log('\n[1] Dựng một album ba ảnh để có cái mà gắn');
{
  const r = await req('POST', '/api/albums', {
    cookie: GV,
    body: {
      title: 'Buổi hoạt động ngoài trời', description: 'Bài canh Đ153',
      cheDo: 'cong-khai',
      photos: [{ dataUrl: ANH, caption: 'a' }, { dataUrl: ANH, caption: 'b' }, { dataUrl: ANH, caption: 'c' }],
    },
  });
  check('cô lập được album ba ảnh', r.status === 201, r.data?.error || r.status);
  AL = r.data.id;
  const d = await req('GET', `/api/albums/${AL}`, { cookie: GV });
  ANH_IDS = (d.data.photos || []).map(p => p.id);
  check('đủ ba ảnh', ANH_IDS.length === 3, ANH_IDS.length);
  check('đối chứng — nhóm có ít nhất hai bé để gắn', BE.length >= 2, BE.length);
}

// ===========================================================================
console.log('\n[2] Gắn nhiều ảnh một lượt — CỘNG THÊM, không ghi đè');
{
  // Gắn bé thứ nhất vào riêng ảnh đầu, bằng đường gắn MỘT ảnh.
  await req('PUT', `/api/albums/${AL}/photos/${ANH_IDS[0]}/be`, {
    cookie: GV, body: { studentIds: [BE[0].id] },
  });

  // Rồi gắn bé thứ HAI vào cả ba ảnh, bằng đường mới.
  const r = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: GV, body: { photoIds: ANH_IDS, studentIds: [BE[1].id] },
  });
  check('gắn được một lượt', r.status === 200, r.data);
  check('máy nói rõ đã gắn mấy bé vào mấy ảnh',
    r.data.soAnh === 3 && r.data.soBe === 1, r.data);

  const d = await req('GET', `/api/albums/${AL}`, { cookie: GV });
  const theo = new Map((d.data.photos || []).map(p => [p.id, (p.beTrongAnh || []).map(b => b.id).sort()]));
  check('ẢNH ĐẦU GIỮ NGUYÊN thẻ cũ VÀ có thêm thẻ mới — cộng thêm, không ghi đè',
    (theo.get(ANH_IDS[0]) || []).length === 2
      && theo.get(ANH_IDS[0]).includes(BE[0].id) && theo.get(ANH_IDS[0]).includes(BE[1].id),
    theo.get(ANH_IDS[0]));
  check('hai ảnh còn lại có đúng bé vừa gắn',
    (theo.get(ANH_IDS[1]) || []).join() === BE[1].id
      && (theo.get(ANH_IDS[2]) || []).join() === BE[1].id,
    [theo.get(ANH_IDS[1]), theo.get(ANH_IDS[2])]);

  // Gắn lại đúng bé ấy lần nữa: không nhân đôi thẻ, và không báo lại gia đình.
  const lai = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: GV, body: { photoIds: ANH_IDS, studentIds: [BE[1].id] },
  });
  check('gắn lại lần hai KHÔNG báo thêm cho gia đình nào', lai.data.soBeMoiDuocBao === 0, lai.data);
  const d2 = await req('GET', `/api/albums/${AL}`, { cookie: GV });
  const lan2 = (d2.data.photos || []).find(p => p.id === ANH_IDS[1]);
  check('và không nhân đôi thẻ', (lan2.beTrongAnh || []).length === 1, lan2.beTrongAnh);
}

// ===========================================================================
console.log('\n[3] Từ chối đúng chỗ');
{
  const co2 = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: GV2, body: { photoIds: ANH_IDS, studentIds: [BE[0].id] },
  });
  check('CÔ NHÓM KHÁC không gắn được', co2.status === 403, co2.status);
  const ph = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: PH, body: { photoIds: ANH_IDS, studentIds: [BE[0].id] },
  });
  check('gia đình cũng không', ph.status === 403, ph.status);

  for (const [ten, than] of [
    ['thiếu danh sách ảnh', { studentIds: [BE[0].id] }],
    ['thiếu danh sách bé', { photoIds: ANH_IDS }],
    ['danh sách ảnh rỗng', { photoIds: [], studentIds: [BE[0].id] }],
    ['danh sách bé rỗng', { photoIds: ANH_IDS, studentIds: [] }],
  ]) {
    const r = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, { cookie: GV, body: than });
    check(`${ten} → từ chối`, r.status === 400, r.status);
  }
  const anhLa = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: GV, body: { photoIds: [...ANH_IDS, 'anh-khong-co'], studentIds: [BE[0].id] },
  });
  check('ảnh không thuộc album này → từ chối', anhLa.status === 400, anhLa.data);
  const beLa = await req('PUT', `/api/albums/${AL}/gan-the-nhieu-anh`, {
    cookie: GV, body: { photoIds: ANH_IDS, studentIds: ['s7'] },
  });
  check('bé không thuộc nhóm của album → từ chối', beLa.status === 400, beLa.data);
}

// ===========================================================================
console.log('\n[4] Đổi chế độ album sau khi đã tạo');
{
  const d0 = await req('GET', `/api/albums/${AL}`, { cookie: GV });
  check('đối chứng — album đang là công khai', d0.data.cheDo === 'cong-khai', d0.data.cheDo);

  const hep = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV, body: { cheDo: 'theo-the' } });
  check('đổi sang THEO THẺ được', hep.status === 200 && hep.data.cheDo === 'theo-the', hep.data);
  check('và máy nói rõ đây là chiều HẸP LẠI', hep.data.doiGi === 'hep-lai', hep.data);

  const d1 = await req('GET', `/api/albums/${AL}`, { cookie: GV });
  check('mở lại album thấy chế độ mới', d1.data.cheDo === 'theo-the', d1.data.cheDo);
  check('ẢNH VÀ THẺ VẪN NGUYÊN — đổi chế độ không đụng tới ảnh',
    (d1.data.photos || []).length === 3, (d1.data.photos || []).length);

  const mo = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV, body: { cheDo: 'cong-khai' } });
  check('đổi ngược lại cũng được', mo.status === 200, mo.data);
  check('và máy nói rõ đây là chiều MỞ RỘNG — màn hình phải hỏi lại cô một câu',
    mo.data.doiGi === 'mo-rong', mo.data);
  const y = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV, body: { cheDo: 'cong-khai' } });
  check('đổi sang chính chế độ đang có thì báo không đổi gì', y.data.doiGi === 'khong-doi', y.data);

  const la = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV, body: { cheDo: 'ai-cung-xem' } });
  check('chế độ lạ → từ chối', la.status === 400, la.data);
  const co2 = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV2, body: { cheDo: 'theo-the' } });
  check('cô nhóm khác KHÔNG đổi được', co2.status === 403, co2.status);
  const ph = await req('PUT', `/api/albums/${AL}/che-do`, { cookie: PH, body: { cheDo: 'theo-the' } });
  check('gia đình cũng không', ph.status === 403, ph.status);
}

// ===========================================================================
console.log('\n[5] Đổi chế độ KHÔNG nới luật đồng ý chia sẻ');
{
  // Cho một nhà từ chối chia sẻ ảnh, rồi đưa album về công khai. Ảnh có bé đó
  // vẫn phải ẩn với nhà khác — chế độ album và luật đồng ý là hai lớp khác nhau.
  const conn = new Database(path.join(DIR, 'school.db'));
  conn.prepare(`INSERT OR REPLACE INTO student_consent
                  (studentId, hoSoHocTap, chiaSeGiaDinh, truyenThong, capNhatLuc)
                VALUES (?, 1, 0, 0, ?)`).run(BE[1].id, new Date().toISOString());
  conn.close();

  await req('PUT', `/api/albums/${AL}/che-do`, { cookie: GV, body: { cheDo: 'cong-khai' } });
  const d = await req('GET', `/api/albums/${AL}`, { cookie: PH });
  const coBeTuChoi = (d.data.photos || []).some(p => (p.beTrongAnh || []).some(b => b.id === BE[1].id));
  check('gia đình khác KHÔNG thấy ảnh có bé chưa đồng ý chia sẻ, dù album công khai',
    !coBeTuChoi, (d.data.photos || []).length);
  check('cô thì vẫn thấy đủ ba ảnh',
    ((await req('GET', `/api/albums/${AL}`, { cookie: GV })).data.photos || []).length === 3);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Gắn thẻ nhiều ảnh & đổi chế độ album');
