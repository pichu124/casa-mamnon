// Bài canh ALBUM CÔNG KHAI / THEO THẺ, GHI NHANH NHIỀU BÉ, ẢNH HÀNH TRÌNH VỀ
// ALBUM (Đ144 — phản hồi nhà trường 07/09).
//
// Chạy bằng:  npm run test:album-che-do
//
// BA LỜI HỨA, CANH Ở TẦNG DỮ LIỆU:
//
//   1. Album THEO THẺ: gia đình chỉ nhận tấm có con mình được gắn thẻ — ở
//      đường liệt kê, đường chi tiết, VÀ đường trả byte của tấm ảnh. Ảnh chưa
//      gắn thẻ chưa tới nhà nào. Luật đồng ý chia sẻ vẫn đứng trước, không có
//      lối tắt.
//   2. Đăng ảnh xong gia đình được báo: album công khai báo cả nhóm (một tin
//      mỗi ngày), album theo thẻ báo từng nhà khi cô gắn thẻ (một tin mỗi bé
//      mỗi album mỗi ngày — không phải mỗi tấm).
//   3. Ảnh của câu chuyện Hành trình về album: chép sang, gắn thẻ bé, không
//      chép đôi, chỉ vào album của đúng nhóm bé và do cô phụ trách nhóm.
import { thuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('album-che-do');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'thuchup', 'thongbao']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4645), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const GV = (await login('giaovien', '123456')).cookie;      // cô nhóm Chồi 2 (c1)
const GV4 = (await login('giaovien4', '123456')).cookie;    // cô nhóm Nhà trẻ 1 (c4)
const PH1 = (await login('phuhuynh', '123456')).cookie;     // p1 — s1 (c1), s2 (c2); s1 đồng ý chia sẻ
const PH2 = (await login('phuhuynh2', '123456')).cookie;    // p2 — s3 (c1); gia đình s3 NÓI KHÔNG với chia sẻ ảnh
const PH9 = (await login('ph.trang', '123456')).cookie;     // p7 — s9 (c4)

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const anhTho = ['📷', '🎈'];

const danhSach = async (cookie) => (await req('GET', '/api/albums', { cookie })).data || [];
const chiTiet = async (cookie, id) => (await req('GET', `/api/albums/${id}`, { cookie }));
const byteAnh = async (cookie, albumId, photoId) =>
  (await fetch(`${sv.BASE}/api/albums/${albumId}/photo/${photoId}`, { headers: cookie ? { cookie } : {} })).status;
const tinRieng = async (cookie) => ((await req('GET', '/api/notifications/rieng-be', { cookie })).data || []);
const tinNhom = async (cookie) => ((await req('GET', '/api/notifications', { cookie })).data || []);

// ===========================================================================
console.log('\n[1] Album THEO THẺ — gia đình chỉ thấy tấm có con mình, chốt ở cả ba đường');
let AL_THE, P1, P2;
{
  const la = await req('POST', '/api/albums', { cookie: GV, body: { title: 'x', cheDo: 'bi-mat', photos: [{ dataUrl: ANH }] } });
  check('chế độ lạ thì từ chối và nói rõ hai lựa chọn', la.status === 400 && /công khai/.test(la.data?.error || ''), la.data);

  const r = await req('POST', '/api/albums', {
    cookie: GV,
    body: { title: 'Góc làm việc từng bé', cheDo: 'theo-the', photos: [{ dataUrl: ANH, caption: 'Tấm 1' }, { dataUrl: ANH, caption: 'Tấm 2' }] },
  });
  check('cô tạo được album theo thẻ', r.status === 201 && r.data?.cheDo === 'theo-the', r.data);
  AL_THE = r.data.id;
  [P1, P2] = (r.data.photos || []).map(p => p.id);

  const gv = await chiTiet(GV, AL_THE);
  check('cô thấy đủ hai tấm và biết album đang ở chế độ theo thẻ', gv.data?.photos?.length === 2 && gv.data?.cheDo === 'theo-the', gv.data?.cheDo);
  check('danh sách của cô có album, gắn nhãn chế độ', (await danhSach(GV)).some(a => a.id === AL_THE && a.cheDo === 'theo-the'));

  check('CHƯA GẮN THẺ: nhà s1 KHÔNG thấy album trong danh sách', !(await danhSach(PH1)).some(a => a.id === AL_THE));
  const ct0 = await chiTiet(PH1, AL_THE);
  check('mở thẳng bằng mã thì vào được album của nhóm con nhưng KHÔNG có tấm nào', ct0.status === 200 && ct0.data?.photos?.length === 0, ct0.data?.photos);
  check('và được nói rõ vì sao, bằng tiếng của trường', /gắn thẻ/.test(ct0.data?.nhacChoPhuHuynh || ''), ct0.data?.nhacChoPhuHuynh);
  check('byte ảnh cũng KHÔNG tải được dù biết mã', await byteAnh(PH1, AL_THE, P1) === 403);

  const gan = await req('PUT', `/api/albums/${AL_THE}/photos/${P1}/be`, { cookie: GV, body: { studentIds: ['s1'] } });
  check('cô gắn thẻ s1 vào tấm 1', gan.status === 200, gan.data);
  const ct1 = await chiTiet(PH1, AL_THE);
  check('nhà s1 thấy ĐÚNG tấm 1', ct1.data?.photos?.length === 1 && ct1.data.photos[0].id === P1, ct1.data?.photos);
  check('tải được byte tấm 1', await byteAnh(PH1, AL_THE, P1) === 200);
  check('nhưng KHÔNG tải được tấm 2 chưa gắn thẻ', await byteAnh(PH1, AL_THE, P2) === 403);
  const ds1 = await danhSach(PH1);
  const a1 = ds1.find(a => a.id === AL_THE);
  check('danh sách nhà s1 nay có album, đếm 1 ảnh, bìa là tấm 1', !!a1 && a1.photoCount === 1 && a1.cover?.id === P1, a1);
  check('nhà s3 (chưa được gắn) vẫn KHÔNG thấy album', !(await danhSach(PH2)).some(a => a.id === AL_THE));

  // Luật đồng ý vẫn đứng trước: tấm 2 gắn s1 + s3, mà nhà s3 nói không.
  await req('PUT', `/api/albums/${AL_THE}/photos/${P2}/be`, { cookie: GV, body: { studentIds: ['s1', 's3'] } });
  const ct2 = await chiTiet(PH1, AL_THE);
  check('tấm 2 có con mình NHƯNG có bé chưa đồng ý → nhà s1 vẫn chỉ thấy tấm 1', ct2.data?.photos?.length === 1, ct2.data?.photos?.map(p => p.id));
  const ct3 = await chiTiet(PH2, AL_THE);
  check('nhà s3 thấy tấm 2 (con mình + s1 đã đồng ý)', ct3.data?.photos?.length === 1 && ct3.data.photos[0].id === P2, ct3.data?.photos?.map(p => p.id));
  check('và nay nhà s3 có album trong danh sách', (await danhSach(PH2)).some(a => a.id === AL_THE));
}

// ===========================================================================
console.log('\n[2] Gắn thẻ xong gia đình được báo — một tin mỗi bé mỗi album mỗi ngày');
{
  const t1 = (await tinRieng(PH1)).filter(t => t.loai === 'album' && t.hash === `#/albums/${AL_THE}`);
  check('nhà s1 có ĐÚNG MỘT tin dù được gắn ở hai tấm', t1.length === 1, t1.map(t => t.title));
  check('tin nói tên bé và tên album', /Nguyễn Bảo An/.test(t1[0]?.title || '') && /Góc làm việc/.test(t1[0]?.title || ''), t1[0]?.title);
  const t2 = (await tinRieng(PH2)).filter(t => t.loai === 'album');
  check('nhà s3 cũng có một tin', t2.length === 1, t2.map(t => t.title));
  const t9 = (await tinRieng(PH9)).filter(t => t.loai === 'album');
  check('nhà khác không có tin nào', t9.length === 0, t9.length);
  check('album theo thẻ KHÔNG báo cả nhóm', !(await tinNhom(PH2)).some(n => /Góc làm việc/.test(n.title || '')));
}

// ===========================================================================
console.log('\n[3] Album CÔNG KHAI — cả nhóm thấy ngay, cả nhóm được báo một lần');
let AL_CK;
{
  const r = await req('POST', '/api/albums', {
    cookie: GV4,
    body: { title: 'Dã ngoại công viên', photos: [{ dataUrl: ANH }, { dataUrl: ANH }] },
  });
  check('không gửi chế độ = công khai, như mọi album trước đây', r.status === 201 && r.data?.cheDo === 'cong-khai', r.data?.cheDo);
  AL_CK = r.data.id;
  const ct = await chiTiet(PH9, AL_CK);
  check('nhà s9 thấy cả hai tấm mà cô không phải gắn thẻ', ct.data?.photos?.length === 2, ct.data?.photos?.length);
  const tb = (await tinNhom(PH9)).filter(n => /Album mới: Dã ngoại công viên/.test(n.title || ''));
  check('cả nhóm được báo "Album mới"', tb.length === 1 && tb[0].category === 'Nhóm lớp', tb.map(n => n.title));
  check('nhà nhóm khác không nhận tin đó', !(await tinNhom(PH1)).some(n => /Dã ngoại công viên/.test(n.title || '')));

  await req('POST', `/api/albums/${AL_CK}/photos`, { cookie: GV4, body: { photos: [{ dataUrl: ANH }] } });
  await req('POST', `/api/albums/${AL_CK}/photos`, { cookie: GV4, body: { photos: [{ dataUrl: ANH }] } });
  const them = (await tinNhom(PH9)).filter(n => /có thêm ảnh/.test(n.title || ''));
  check('tải thêm hai lô trong ngày chỉ báo MỘT lần', them.length === 1, them.map(n => n.title));
}

// ===========================================================================
console.log('\n[4] Ảnh của câu chuyện Hành trình về album — chép sang, gắn thẻ bé, không chép đôi');
{
  const qs = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'An tự rót nước vào ly, tràn một chút rồi tự lau.', anh: ANH },
  });
  check('cô ghi được quan sát có ảnh', qs.status === 201 && !!qs.data?.anh, qs.data);
  const Q = qs.data.id;
  const truoc = (await chiTiet(GV, AL_THE)).data.photos.length;

  const saiNhom = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay An tự rót nước.', cungConONha: 'Tối nay để con tự rót nước.', albumId: AL_CK },
  });
  check('album của NHÓM KHÁC thì từ chối (cô không phụ trách nhóm đó)', saiNhom.status === 403, saiNhom.data);
  const laAlbum = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay An tự rót nước.', cungConONha: 'Tối nay để con tự rót nước.', albumId: 'al_khong_co' },
  });
  check('album không tồn tại thì 404, và CHƯA công bố', laAlbum.status === 404, laAlbum.data);

  const cb = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay An tự rót nước.', cungConONha: 'Tối nay để con tự rót nước.', albumId: AL_THE },
  });
  check('công bố kèm album thì được', cb.status === 200 && cb.data?.daCongBo === true, cb.data);
  check('câu trả lời cho cô biết ảnh đã về album nào', cb.data?.daVeAlbum?.id === AL_THE && /Góc làm việc/.test(cb.data?.daVeAlbum?.title || ''), cb.data?.daVeAlbum);
  const sau = (await chiTiet(GV, AL_THE)).data;
  check('album có thêm đúng một tấm', sau.photos.length === truoc + 1, { truoc, sau: sau.photos.length });
  const tamMoi = sau.photos[sau.photos.length - 1];
  check('tấm mới ĐÃ GẮN THẺ bé, chú thích là câu chuyện', (tamMoi.beTrongAnh || []).some(b => b.id === 's1') && /rót nước/.test(tamMoi.caption || ''), tamMoi);
  check('tấm mới là tệp CHÉP, không dùng chung tên với ảnh quan sát', tamMoi.file && tamMoi.file !== qs.data.anh, { moi: tamMoi.file, goc: qs.data.anh });
  check('nhà s1 thấy tấm mới trong album theo thẻ', (await chiTiet(PH1, AL_THE)).data.photos.some(p => p.id === tamMoi.id));
  check('gia đình xem được byte ảnh của tấm mới', await byteAnh(PH1, AL_THE, tamMoi.id) === 200);

  await req('POST', `/api/hanhtrinh/${Q}/thu-hoi`, { cookie: GV, body: {} });
  const lai = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Hôm nay An tự rót nước.', cungConONha: 'Tối nay để con tự rót nước.', albumId: AL_THE },
  });
  check('công bố lại KHÔNG chép đôi', lai.status === 200 && (await chiTiet(GV, AL_THE)).data.photos.length === truoc + 1);

  const khongAnh = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Chỉ chữ, không ảnh' } });
  const cbKhongAnh = await req('POST', `/api/hanhtrinh/${khongAnh.data.id}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'x', cungConONha: 'y', albumId: AL_THE },
  });
  check('quan sát không có ảnh mà chọn album thì từ chối, nói rõ', cbKhongAnh.status === 400 && /không có ảnh/.test(cbKhongAnh.data?.error || ''), cbKhongAnh.data);
  const cbKhongAlbum = await req('POST', `/api/hanhtrinh/${khongAnh.data.id}/cong-bo`, {
    cookie: GV, body: { cauChuyen: 'Câu chuyện chỉ chữ.', cungConONha: 'Cùng con kể lại.' },
  });
  check('không chọn album thì công bố y như trước', cbKhongAlbum.status === 200 && cbKhongAlbum.data?.daVeAlbum === undefined, cbKhongAlbum.data);

  const ht = (await tinRieng(PH1)).filter(t => t.loai === 'hanh-trinh');
  check('gia đình được báo khi cô kể chuyện — mỗi câu chuyện một tin, công bố lại không lặp',
    ht.length === 2 && ht.every(t => /Câu chuyện về Nguyễn Bảo An/.test(t.title || '')) && ht.every(t => t.hash === '#/hanhtrinh/s1'),
    ht.map(t => t.title));
}

// ===========================================================================
console.log('\n[4b] CÂU CHUYỆN CỦA MỘT BÉ KHÔNG RƠI VÀO ALBUM CẢ NHÓM ĐỌC ĐƯỢC');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Đây là ranh giới LỚP 3 trong bảng ba lớp dữ liệu của CLAUDE.md: câu chuyện
  // kể cho gia đình là của *phụ huynh chính bé đó*. Trước bản vá, ô chọn album
  // mời cô chọn BẤT KỲ album nào của nhóm, mà album mặc định là 'cong-khai' —
  // nên một tấm ảnh riêng của bé, kèm chính câu chuyện cô vừa viết làm lời chú
  // thích, hiện ra với mọi gia đình trong nhóm. Ô chọn không cảnh báo gì cả.
  //
  // Mục [4] ở trên có một phép kiểm album công khai, nhưng album đó thuộc NHÓM
  // KHÁC nên nó dừng ở chốt "cô không phụ trách nhóm đó" (403) — chốt chế độ
  // không bao giờ được chạm tới. Mục này dựng đúng cảnh nguy hiểm: album công
  // khai CỦA CHÍNH NHÓM MÌNH, cô có đủ quyền, bé đúng nhóm.
  const alCK1 = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Ảnh chung nhóm Chồi 2', photos: [{ dataUrl: ANH }] },
  });
  check('cô tạo được một album CÔNG KHAI của chính nhóm mình',
    alCK1.status === 201 && alCK1.data?.cheDo === 'cong-khai', alCK1.data?.cheDo);
  const AL_CK1 = alCK1.data.id;
  const truocCK = (await chiTiet(GV, AL_CK1)).data.photos.length;

  const qs2 = await req('POST', '/api/hanhtrinh', {
    cookie: GV, body: { studentId: 's1', moTa: 'An ngồi lâu với bộ ghép hình.', anh: ANH },
  });
  const Q2 = qs2.data.id;

  const vaoCK = await req('POST', `/api/hanhtrinh/${Q2}/cong-bo`, {
    cookie: GV,
    body: { cauChuyen: 'Chuyện riêng của An.', cungConONha: 'Tối nay ghép hình cùng con.', albumId: AL_CK1 },
  });
  check('ALBUM CÔNG KHAI CỦA CHÍNH NHÓM MÌNH THÌ BỊ TỪ CHỐI',
    vaoCK.status === 400, `${vaoCK.status} ${vaoCK.data?.error || ''}`);
  check('và lời từ chối chỉ đúng đường ra: chọn album theo thẻ',
    /theo thẻ/i.test(vaoCK.data?.error || ''), vaoCK.data?.error);
  check('KHÔNG một tấm nào lọt vào album công khai',
    (await chiTiet(GV, AL_CK1)).data.photos.length === truocCK, truocCK);

  // Và chốt phải chặn THẬT — không phải chỉ từ chối rồi vẫn công bố.
  const conNhap = await req('GET', `/api/hanhtrinh?studentId=s1`, { cookie: GV });
  const ban = (conNhap.data?.quanSat || conNhap.data || []).find(x => x.id === Q2);
  check('câu chuyện cũng CHƯA được công bố — kiểm trước khi ghi, không ghi rồi mới kiểm',
    !ban?.daCongBo && !ban?.congBoLuc, ban && { daCongBo: ban.daCongBo, congBoLuc: ban.congBoLuc });

  // ĐỐI CHỨNG: cùng quan sát ấy, album THEO THẺ thì vào bình thường.
  const vaoThe = await req('POST', `/api/hanhtrinh/${Q2}/cong-bo`, {
    cookie: GV,
    body: { cauChuyen: 'Chuyện riêng của An.', cungConONha: 'Tối nay ghép hình cùng con.', albumId: AL_THE },
  });
  check('đối chứng — album THEO THẺ thì vẫn lưu được như trước',
    vaoThe.status === 200 && vaoThe.data?.daVeAlbum?.id === AL_THE, vaoThe.data?.daVeAlbum);

  // Ô CHỌN Ở MÀN CỦA CÔ CŨNG KHÔNG ĐƯỢC MỜI ALBUM CÔNG KHAI.
  // Chốt thật nằm ở máy chủ, nhưng mời rồi mới từ chối là bắt cô gõ lại.
  const hv = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('ô chọn album chỉ lọc lấy album theo thẻ',
    /cheDo === 'theo-the'/.test(hv), hv.includes('cheDo'));
  check('và nói cho cô biết phải làm gì khi nhóm chưa có album theo thẻ nào',
    /chưa có album nào ở chế độ/.test(hv));
}

// ===========================================================================
console.log('\n[5] Canh tĩnh: lược đồ chỉ thêm, chốt ở đường byte, Ghi nhanh nhiều bé');
{
  const core = fs.readFileSync(path.join(GOC, 'lib/schema.sql'), 'utf8');
  check('lib/schema.sql chỉ THÊM bảng album_che_do, không ALTER bảng albums',
    /CREATE TABLE IF NOT EXISTS album_che_do \(/.test(core) && !/ALTER TABLE albums/.test(core));
  const htSql = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/schema.sql'), 'utf8');
  const cau = htSql.replace(/--[^\n]*/g, '').split(';').map(c => c.trim()).filter(Boolean);
  check('lược đồ hành trình vẫn chỉ CREATE ... IF NOT EXISTS, bảng mới mang tiền tố',
    cau.every(c => /^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(c)) && /CREATE TABLE IF NOT EXISTS hanhtrinh_album/.test(htSql));

  const rt = fs.readFileSync(path.join(GOC, 'routes/albums.js'), 'utf8');
  const byteRoute = rt.slice(rt.indexOf("app.get('/api/albums/:id/photo/:photoId'"), rt.indexOf("app.post('/api/albums'"));
  check('đường trả byte kiểm THEO THẺ sau luật đồng ý và TRƯỚC khi kiểm tệp',
    byteRoute.indexOf('locAnhChoNguoiXem([photo]') < byteRoute.indexOf('locTheoThe([photo]') && byteRoute.indexOf('locTheoThe([photo]') < byteRoute.indexOf('!photo.file'));
  check('bộ lọc theo thẻ chạy SAU luật đồng ý, không thay nó', /locTheoThe\(quaDongY/.test(rt));
  check('thẻ tra theo lô ở đường liệt kê (beTrongCacAnh), không tra từng tấm', /beTrongCacAnh\(idsTheoThe\)/.test(rt));
  check('báo gia đình đi qua lib/thong-bao-be và lib/thong-bao, không ghi thẳng bảng', /tbb\.gui\(/.test(rt) && /tb\.guiChoNhom\(/.test(rt) && !/insert\('notifications'/.test(rt) && !/insert\('thongbao_be'/.test(rt));

  // Quy xuống dòng về '\n': mẫu tìm ở dưới có '\n' bên trong, máy Windows tải mã
  // về có thể mang CRLF và khi đó không tìm thấy.
  const htRt = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8').replace(/\r\n/g, '\n');
  // Đ242B — chủ dự án quyết 26/10 (B7, mặc định 3): ảnh về album gắn thẻ bé
  // chính VÀ mọi bé cô chọn là có mặt trong ảnh, để luật album theo thẻ và
  // luật đồng ý ảnh nhóm biết trong ảnh có ai. Bé chính vẫn luôn được gắn.
  check('ảnh về album gắn thẻ bé chính và mọi bé có mặt qua db.datBeTrongAnh, chép tệp bằng chepAnh', /db\.datBeTrongAnh\(photo\.id, \[r\.studentId, \.\.\.beCoMat\]\)/.test(htRt) && /const file = chepAnh\(r\.anh\)/.test(htRt));
  {
    // Cả hai mốc phải TÌM THẤY rồi mới so thứ tự: mốc kiểm quyền biến mất thì
    // indexOf ra -1, và -1 nhỏ hơn mọi vị trí — phép so cũ vẫn xanh đúng lúc
    // chốt quyền bị gỡ.
    const kiemQuyen = htRt.indexOf("Chỉ cô phụ trách nhóm của album");
    const congBo = htRt.indexOf("congBoLuc: luc, capNhatLuc: luc,\n    });\n    db.audit(req.user.id, 'hanhtrinh-cong-bo'");
    check('kiểm album đứng TRƯỚC câu UPDATE công bố',
      kiemQuyen >= 0 && congBo >= 0 && kiemQuyen < congBo, { kiemQuyen, congBo });
  }

  const tc = fs.readFileSync(path.join(GOC, 'modules/thuchup/view.js'), 'utf8');
  check('Ghi nhanh chọn được NHIỀU bé (tập _beChon) và mỗi bé một bản ghi, một mã',
    /_beChon = new Set/.test(tc) && /cacBe\.map\(studentId => \(\{\s*id: this\.maMoi\(\)/.test(tc));
  check('không bao giờ về rỗng — bỏ chọn bé cuối cùng thì giữ nguyên', /this\._beChon\.size > 1\) this\._beChon\.delete/.test(tc));
  check('lưu vào máy TRƯỚC cho từng bản ghi (mất mạng vẫn không mất bài)', /for \(const r of recs\) await this\.luuVaoMay\(r\)/.test(tc));

  const av = fs.readFileSync(path.join(GOC, 'public/js/views/albums.js'), 'utf8');
  check('màn tạo album có ô chọn chế độ, gửi lên máy chủ', /id="al-che-do"/.test(av) && /cheDo, photos: first/.test(av));
  check('không có "học sinh" trên màn', !/học sinh/i.test(av) && !/học sinh/i.test(tc));
  const hv = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  // Đ242B: hộp hoàn thiện nhận cả video và mục Ghi nhanh, nên điều kiện là
  // "có tệp" (`coTep`) thay cho "có ảnh" (`anh`).
  check('hộp kể chuyện có ô chọn album, chỉ khi quan sát có ảnh', /id="ht-album"/.test(hv) && /q\.coTep && !q\.daVeAlbum/.test(hv));
}

await sv.dung();
tongKet();
