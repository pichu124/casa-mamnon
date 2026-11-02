// Bài canh AI ĐĂNG ẢNH VÀO ALBUM (M1 — chủ dự án chốt phân quyền album).
//
// Chạy bằng:  node test/phan-hoi-2010-album-ai-cung-dang.test.mjs
//
// Nhà trường: văn phòng cơ sở, ban giám hiệu, quản lý cơ sở tạo album và đăng
// ảnh trong phạm vi cơ sở mình; cô nhóm khác cùng cơ sở chỉ góp ảnh vào album
// mà người tạo đã đánh dấu "album chung"; phụ huynh không bao giờ; Marketing
// chỉ xem; gắn thẻ bé vẫn chỉ cô của nhóm; quản trị không xoá ảnh người khác.
//
// Chỗ dễ rò nhất: ảnh do cô NHÓM KHÁC góp vào. Cô ấy không biết bé nào của nhóm
// này đã được gia đình đồng ý chia sẻ, nên ảnh của cô ấy CHƯA GẮN THẺ thì không
// hiện với gia đình nào — kể cả ở nhóm không có nhà nào từ chối — cho tới khi
// cô của nhóm gắn thẻ. Lọc ở máy chủ, cả ở đường trả byte.
//
// Dữ liệu mẫu: c1, c2, c4 ở cơ sở 1; c3 (Mầm 1) ở cơ sở 2. c4 (Nhà trẻ 1) do
// giaovien4 phụ trách (+ cô Emily), KHÔNG có nhà nào từ chối chia sẻ; bé s9 có
// đồng ý chia sẻ. giaovien chỉ dạy c1 → là "cô nhóm khác cùng cơ sở" của c4.
// giaovien.nn2 dạy c3 → cô của cơ sở 2.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, dongNhom, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// ---------------------------------------------------------------------------
console.log('\n[0] Lược đồ: hai bảng mới chỉ CREATE TABLE IF NOT EXISTS, không ALTER');
{
  const sql = fs.readFileSync(path.join(GOC, 'lib', 'schema.sql'), 'utf8')
    .split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = sql.split(';').map(c => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const bang of ['album_anh_nguoi_dang', 'album_gop_anh']) {
    const coTen = cau.filter(c => new RegExp(`\\b${bang}\\b`).test(c));
    check(`${bang}: có đúng một câu CREATE TABLE IF NOT EXISTS`,
      coTen.filter(c => c.startsWith(`CREATE TABLE IF NOT EXISTS ${bang} `)).length === 1, coTen);
    check(`${bang}: mọi câu nhắc tới bảng đều là CREATE … IF NOT EXISTS`,
      coTen.every(c => /^CREATE (TABLE|INDEX) IF NOT EXISTS /.test(c)), coTen);
  }
  check('lược đồ lõi không có câu ALTER / DROP nào', !cau.some(c => /^(ALTER|DROP)\b/i.test(c)));
}

const DIR = thuMucTam('ph2010-album-ai-cung-dang');
sinhDuLieu(DIR);
batPhanHe(DIR, ['album']);
const mkBGH = taoQuanTri(DIR, 'Ban Giám Hiệu', 'aa_bgh');
datChucVu(DIR, 'aa_bgh', 'hieu-truong');
const mkQL = taoQuanTri(DIR, 'Quản Lý Cơ Sở 1', 'aa_ql');
khoaVaoCoSo(DIR, 'aa_ql', 'cs1');
datChucVu(DIR, 'aa_ql', 'quanly-coso');
const mkVP = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 1', 'aa_vp');
khoaVaoCoSo(DIR, 'aa_vp', 'cs1');
datChucVu(DIR, 'aa_vp', 'vanphong-coso');
const mkMK = taoQuanTri(DIR, 'Marketing', 'aa_mk');
datChucVu(DIR, 'aa_mk', 'marketing');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7291), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function vao(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const BGH = await vao('aa_bgh', mkBGH);
  const QL = await vao('aa_ql', mkQL);
  const VP = await vao('aa_vp', mkVP);
  const MK = await vao('aa_mk', mkMK);
  const GV4 = (await login('giaovien4', '123456')).cookie;     // cô của c4 (cơ sở 1)
  const GV1 = (await login('giaovien', '123456')).cookie;      // cô c1 — nhóm khác, cùng cơ sở 1
  const GV2 = (await login('giaovien2', '123456')).cookie;     // cô c2 (cơ sở 1)
  const GVCS2 = (await login('giaovien.nn2', '123456')).cookie; // cô Mầm 1 — cơ sở 2
  const PH7 = (await login('ph.trang', '123456')).cookie;      // nhà bé s9 (c4)
  const PH8 = (await login('ph.duy', '123456')).cookie;        // nhà bé s10 (c4)
  const PH1 = (await login('phuhuynh', '123456')).cookie;
  check('đối chứng — đăng nhập đủ các vai', [BGH, QL, VP, MK, GV4, GV1, GV2, GVCS2, PH7, PH8, PH1].every(Boolean));

  const chiTiet = (cookie, id) => req('GET', `/api/albums/${id}`, { cookie });
  const anhCua = async (cookie, id) => ((await chiTiet(cookie, id)).data?.photos || []).map(p => p.id);
  const taoAlbum = (cookie, body) => req('POST', '/api/albums', { cookie, body: { photos: [{ dataUrl: ANH }], ...body } });
  const themAnh = (cookie, id) => req('POST', `/api/albums/${id}/photos`, { cookie, body: { photos: [{ dataUrl: ANH }] } });

  // =========================================================================
  console.log('\n[1] Ai tạo được album, cho nhóm nào');
  {
    const vp = (await req('GET', '/api/albums/tao-duoc', { cookie: VP })).data || {};
    const ids = (vp.nhom || []).map(n => n.id).sort();
    check('văn phòng cơ sở 1: tạo được, đúng ba nhóm của cơ sở 1',
      vp.taoDuoc === true && ids.join(',') === 'c1,c2,c4', vp);
    check('mỗi nhóm có tên để màn hình dựng ô chọn',
      (vp.nhom || []).length > 0 && vp.nhom.every(n => n.id && n.name), vp.nhom);
    const bgh = (await req('GET', '/api/albums/tao-duoc', { cookie: BGH })).data || {};
    check('ban giám hiệu: mọi nhóm đang mở, kể cả cơ sở 2',
      bgh.taoDuoc === true && (bgh.nhom || []).some(n => n.id === 'c3'), bgh);
    const mk = (await req('GET', '/api/albums/tao-duoc', { cookie: MK })).data || {};
    check('Marketing: không tạo được', mk.taoDuoc === false && (mk.nhom || []).length === 0, mk);
    const ph = (await req('GET', '/api/albums/tao-duoc', { cookie: PH1 })).data || {};
    check('phụ huynh: không tạo được', ph.taoDuoc === false && (ph.nhom || []).length === 0, ph);
    const gv = (await req('GET', '/api/albums/tao-duoc', { cookie: GV1 })).data || {};
    check('cô: chỉ nhóm mình phụ trách',
      gv.taoDuoc === true && (gv.nhom || []).map(n => n.id).join(',') === 'c1', gv);
  }

  // =========================================================================
  console.log('\n[2] Văn phòng / quản lý cơ sở 1 tạo album và đăng ảnh cho nhóm cơ sở 1');
  let AL_VP = '';
  {
    const r = await taoAlbum(VP, { title: 'Buổi chào cờ đầu tuần', classId: 'c4' });
    check('văn phòng tạo album cho Nhà trẻ 1 (cơ sở 1) → 201', r.status === 201 && r.data?.classId === 'c4', r.data);
    AL_VP = r.data?.id;
    const them = await themAnh(VP, AL_VP);
    check('văn phòng thêm ảnh vào album đó → 201', them.status === 201, them.data);
    check('album có hai tấm', (await anhCua(VP, AL_VP)).length === 2);

    const tb = ((await req('GET', '/api/notifications', { cookie: PH8 })).data || [])
      .find(n => n.title === 'Album mới: Buổi chào cờ đầu tuần');
    check('gia đình nhóm nhận tin, nói đúng là NHÀ TRƯỜNG đăng (không phải "Cô")',
      !!tb && /^Nhà trường vừa đăng/.test(tb.body || ''), tb);

    const ql = await taoAlbum(QL, { title: 'Ngày hội gia đình', classId: 'c1' });
    check('quản lý cơ sở 1 tạo album cho Chồi 2 → 201', ql.status === 201 && ql.data?.classId === 'c1', ql.data);
    const qlThem = await themAnh(QL, ql.data?.id);
    check('quản lý cơ sở 1 thêm ảnh → 201', qlThem.status === 201, qlThem.data);

    const cs2 = await taoAlbum(VP, { title: 'Sang cơ sở 2', classId: 'c3' });
    check('văn phòng cơ sở 1 tạo album cho nhóm cơ sở 2 → 403', cs2.status === 403, cs2.data);
    const thieu = await taoAlbum(VP, { title: 'Không chọn nhóm' });
    check('không chọn nhóm khi phạm vi có nhiều nhóm → 400', thieu.status === 400, thieu.data);
    check('câu báo lỗi nói rõ phải chọn nhóm lớp', /chọn nhóm/.test(thieu.data?.error || ''), thieu.data);

    const bgh = await taoAlbum(BGH, { title: 'Mầm 1 đi dã ngoại', classId: 'c3' });
    check('ban giám hiệu tạo album cho nhóm bất kỳ (Mầm 1, cơ sở 2) → 201', bgh.status === 201, bgh.data);

    const ph = await taoAlbum(PH1, { title: 'Ảnh nhà mình', classId: 'c1' });
    check('phụ huynh không tạo được album → 403', ph.status === 403, ph.status);

    const gv = await taoAlbum(GV1, { title: 'Chồi 2 làm bánh' });
    check('đối chứng — cô vẫn tạo album cho nhóm mình như cũ', gv.status === 201 && gv.data?.classId === 'c1', gv.data);
    const gvSai = await taoAlbum(GV1, { title: 'Nhóm người khác', classId: 'c4' });
    check('cô KHÔNG tạo album cho nhóm mình không dạy', gvSai.status === 400 || gvSai.status === 403, gvSai.status);
  }

  // =========================================================================
  console.log('\n[3] Marketing chỉ xem');
  {
    const tao = await taoAlbum(MK, { title: 'Tuyển sinh', classId: 'c4' });
    check('Marketing tạo album → 403', tao.status === 403, tao.status);
    const them = await themAnh(MK, AL_VP);
    check('Marketing thêm ảnh → 403', them.status === 403, them.status);
    const motAnh = (await anhCua(VP, AL_VP))[0];
    const xoa = await req('DELETE', `/api/albums/${AL_VP}/photos/${motAnh}`, { cookie: MK });
    check('Marketing xoá ảnh → 403', xoa.status === 403, xoa.status);
    const cd = await req('PUT', `/api/albums/${AL_VP}/che-do`, { cookie: MK, body: { cheDo: 'theo-the' } });
    check('Marketing đặt phạm vi album → 403', cd.status === 403, cd.status);
    const nha = await req('GET', `/api/albums/${AL_VP}/nha`, { cookie: MK });
    check('Marketing đọc danh sách nhà được chọn → 403', nha.status === 403, nha.status);
    const gop = await req('PUT', `/api/albums/${AL_VP}/gop-anh`, { cookie: MK, body: { mo: true } });
    check('Marketing bật album chung → 403', gop.status === 403, gop.status);
    check('ảnh vẫn còn đủ', (await anhCua(VP, AL_VP)).includes(motAnh));
  }

  // =========================================================================
  console.log('\n[4] Cô nhóm khác cùng cơ sở: chỉ góp vào album chung');
  let AL4 = '';
  let ANH_CO4 = '';
  let ANH_KHACH = '';
  {
    const r = await taoAlbum(GV4, { title: 'Bé chơi cát', description: 'Các bé xúc cát vào xô.' });
    check('đối chứng — cô c4 tạo album', r.status === 201 && r.data?.classId === 'c4', r.data);
    AL4 = r.data?.id;
    ANH_CO4 = r.data?.photos?.[0]?.id;

    check('album thường: cô nhóm khác KHÔNG mở được → 403', (await chiTiet(GV1, AL4)).status === 403);
    check('album thường: cô nhóm khác KHÔNG thêm ảnh → 403', (await themAnh(GV1, AL4)).status === 403);
    check('album thường không nằm trong danh sách của cô nhóm khác',
      !((await req('GET', '/api/albums', { cookie: GV1 })).data || []).some(a => a.id === AL4));

    const ct4 = (await chiTiet(GV4, AL4)).data || {};
    check('cô c4: đủ quyền trên album của mình',
      ct4.canEdit === true && ct4.themAnhDuoc === true && ct4.ganTheDuoc === true
      && ct4.doiCheDoDuoc === true && ct4.gopAnhDuoc === true && ct4.laAlbumChung === false, ct4);

    const gopSai = await req('PUT', `/api/albums/${AL4}/gop-anh`, { cookie: GV1, body: { mo: true } });
    check('cô nhóm khác không tự bật album chung → 403', gopSai.status === 403, gopSai.status);
    const bat = await req('PUT', `/api/albums/${AL4}/gop-anh`, { cookie: GV4, body: { mo: true } });
    check('cô c4 bật "album chung" → 200', bat.status === 200 && bat.data?.laAlbumChung === true, bat.data);

    const ds = ((await req('GET', '/api/albums', { cookie: GV1 })).data || []).find(a => a.id === AL4);
    check('album chung hiện trong danh sách của cô cùng cơ sở, có cờ laAlbumChung',
      !!ds && ds.laAlbumChung === true, ds);
    check('và không bị xếp vào "nhóm cũ"', !!ds && ds.lopCuCuaCon === false && ds.lopDaDong === false, ds);

    const ct1 = await chiTiet(GV1, AL4);
    check('cô cùng cơ sở mở được album chung', ct1.status === 200 && ct1.data?.laAlbumChung === true, ct1.data);
    check('được thêm ảnh, KHÔNG được gắn thẻ / đổi phạm vi / bật tắt album chung',
      ct1.data?.themAnhDuoc === true && ct1.data?.ganTheDuoc === false
      && ct1.data?.doiCheDoDuoc === false && ct1.data?.gopAnhDuoc === false && ct1.data?.canEdit === false, ct1.data);
    const them = await themAnh(GV1, AL4);
    check('cô cùng cơ sở thêm ảnh vào album chung → 201', them.status === 201, them.data);
    ANH_KHACH = them.data?.photos?.[0]?.id;

    check('cô cơ sở 2 vẫn KHÔNG mở được → 403', (await chiTiet(GVCS2, AL4)).status === 403);
    check('cô cơ sở 2 vẫn KHÔNG thêm ảnh → 403', (await themAnh(GVCS2, AL4)).status === 403);
    check('album chung không nằm trong danh sách cô cơ sở 2',
      !((await req('GET', '/api/albums', { cookie: GVCS2 })).data || []).some(a => a.id === AL4));
  }

  // =========================================================================
  console.log('\n[5] Ảnh cô nhóm khác góp: ẩn với gia đình cho tới khi cô của nhóm gắn thẻ');
  {
    check('đối chứng — nhóm c4 không có nhà từ chối: ảnh chưa gắn thẻ của cô c4 hiện với gia đình',
      (await anhCua(PH8, AL4)).includes(ANH_CO4));
    check('ảnh cô nhóm khác góp, chưa gắn thẻ: gia đình KHÔNG thấy',
      !(await anhCua(PH8, AL4)).includes(ANH_KHACH));
    const ds = ((await req('GET', '/api/albums', { cookie: PH8 })).data || []).find(a => a.id === AL4);
    check('số ảnh ngoài danh sách cũng không đếm tấm đó', !!ds && ds.photoCount === 1, ds);
    const byte = await req('GET', `/api/albums/${AL4}/photo/${ANH_KHACH}`, { cookie: PH8 });
    check('đường trả byte: gia đình tải thẳng tấm đó → 403', byte.status === 403, byte.status);
    check('cô c4 vẫn thấy tấm đó để gắn thẻ', (await anhCua(GV4, AL4)).includes(ANH_KHACH));
    const nhac = (await chiTiet(GV4, AL4)).data?.nhacGanThe;
    check('cô c4 được nhắc có ảnh đang tạm ẩn vì chưa gắn thẻ', nhac?.soAnhTamAn === 1, nhac);

    const ganKhach = await req('PUT', `/api/albums/${AL4}/photos/${ANH_KHACH}/be`, { cookie: GV1, body: { studentIds: ['s9'] } });
    check('cô nhóm khác KHÔNG gắn thẻ được → 403', ganKhach.status === 403, ganKhach.status);
    const ganVP = await req('PUT', `/api/albums/${AL4}/photos/${ANH_KHACH}/be`, { cookie: VP, body: { studentIds: ['s9'] } });
    check('văn phòng KHÔNG gắn thẻ được → 403', ganVP.status === 403, ganVP.status);

    const gan = await req('PUT', `/api/albums/${AL4}/photos/${ANH_KHACH}/be`, { cookie: GV4, body: { studentIds: ['s9'] } });
    check('cô c4 gắn thẻ bé s9 (có đồng ý chia sẻ) → 200', gan.status === 200, gan.data);

    // Cô c4 chỉ gắn được bé nhóm mình. Bé nhóm của CÔ GÓP ẢNH có mặt trong ảnh
    // thì không ai gắn được — nên nhóm của cô góp có nhà từ chối chia sẻ thì
    // tấm ấy vẫn ẩn với gia đình dù đã gắn thẻ (dữ liệu mẫu: nhóm của cô c1 có).
    const CSDL = path.join(DIR, 'school.db');
    const c = new Database(CSDL);
    const tuChoi = c.prepare(`SELECT sc.studentId FROM student_consent sc
        JOIN students s ON s.id = sc.studentId
        JOIN class_teachers ct ON ct.classId = s.classId
        JOIN users u ON u.id = ct.teacherId
       WHERE u.username = 'giaovien' AND s.classId <> 'c4' AND s.active = 1 AND sc.chiaSeGiaDinh = 0`)
      .all().map(r => r.studentId);
    c.close();
    check('đối chứng — nhóm của cô góp ảnh có nhà từ chối chia sẻ', tuChoi.length > 0, tuChoi);
    check('đã gắn thẻ nhưng nhóm cô góp có nhà từ chối: gia đình bé s9 vẫn KHÔNG thấy',
      !(await anhCua(PH7, AL4)).includes(ANH_KHACH));
    const byteAn = await req('GET', `/api/albums/${AL4}/photo/${ANH_KHACH}`, { cookie: PH8 });
    check('đường trả byte cũng chặn → 403', byteAn.status === 403, byteAn.status);
    const nhacGop = (await chiTiet(GV4, AL4)).data?.nhacGanThe;
    check('cô c4 được nói rõ vì sao tấm đã gắn thẻ vẫn ẩn',
      /nhóm của cô góp ảnh/.test(nhacGop?.loiNhac || ''), nhacGop);

    // Nhà ấy đổi ý, đồng ý chia sẻ → tấm ảnh hiện. Trả lại như cũ ngay sau đó
    // để các mục sau đo trên đúng dữ liệu mẫu.
    const doi = (v) => {
      const d = new Database(CSDL);
      const st = d.prepare('UPDATE student_consent SET chiaSeGiaDinh = ? WHERE studentId = ?');
      for (const id of tuChoi) st.run(v, id);
      d.close();
    };
    doi(1);
    check('nhóm cô góp không còn nhà từ chối: gia đình bé s9 thấy', (await anhCua(PH7, AL4)).includes(ANH_KHACH));
    check('và gia đình khác trong nhóm cũng thấy (mọi bé trong ảnh đều đồng ý)',
      (await anhCua(PH8, AL4)).includes(ANH_KHACH));
    const byte2 = await req('GET', `/api/albums/${AL4}/photo/${ANH_KHACH}`, { cookie: PH8 });
    check('đường trả byte mở theo', byte2.status === 200, byte2.status);
    doi(0);

    // Tên bé và việc nhà bé có đồng ý chia sẻ ảnh hay không chỉ dành cho người
    // gắn thẻ được. Cô nhóm khác góp ảnh vào album chung chỉ biết tấm ảnh đã
    // có bé được gắn — không biết bé nào, càng không biết nhà nào từ chối.
    const theKhach = ((await chiTiet(GV1, AL4)).data?.photos || []).find(p => p.id === ANH_KHACH) || {};
    check('cô nhóm khác: biết tấm ảnh đã có bé được gắn',
      (theKhach.beTrongAnh || []).length === 1, theKhach.beTrongAnh);
    check('cô nhóm khác: KHÔNG thấy tên bé, KHÔNG thấy nhà bé có đồng ý chia sẻ hay không',
      (theKhach.beTrongAnh || []).every(b => b.name === undefined && b.dongYChiaSe === undefined), theKhach.beTrongAnh);
    const theVP = ((await chiTiet(VP, AL4)).data?.photos || []).find(p => p.id === ANH_KHACH) || {};
    check('văn phòng (không gắn thẻ được): cũng không thấy tình trạng đồng ý',
      (theVP.beTrongAnh || []).every(b => b.dongYChiaSe === undefined), theVP.beTrongAnh);
    const theCo4 = ((await chiTiet(GV4, AL4)).data?.photos || []).find(p => p.id === ANH_KHACH) || {};
    check('đối chứng — cô c4 (gắn thẻ được) vẫn thấy tên bé và tình trạng đồng ý',
      (theCo4.beTrongAnh || []).some(b => b.id === 's9' && !!b.name && b.dongYChiaSe !== undefined), theCo4.beTrongAnh);
  }

  // =========================================================================
  console.log('\n[6] Xoá một tấm: người đăng xoá ảnh của mình, không xoá ảnh người khác');
  {
    const them = await themAnh(GV1, AL4);
    const cuaMinh = them.data?.photos?.[0]?.id;
    const ct = (await chiTiet(GV1, AL4)).data || {};
    const co = (id) => (ct.photos || []).find(p => p.id === id) || {};
    check('chi tiết báo đúng tấm nào xoá được',
      co(cuaMinh).xoaDuoc === true && co(ANH_CO4).xoaDuoc === false, (ct.photos || []).map(p => [p.id, p.xoaDuoc]));
    const xoaCo = await req('DELETE', `/api/albums/${AL4}/photos/${ANH_CO4}`, { cookie: GV1 });
    check('cô nhóm khác xoá ảnh của cô c4 → 403', xoaCo.status === 403, xoaCo.status);
    const xoaMinh = await req('DELETE', `/api/albums/${AL4}/photos/${cuaMinh}`, { cookie: GV1 });
    check('cô nhóm khác xoá ảnh CỦA MÌNH → 200', xoaMinh.status === 200, xoaMinh.data);

    const xoaVP = await req('DELETE', `/api/albums/${AL4}/photos/${ANH_CO4}`, { cookie: VP });
    check('văn phòng xoá ảnh của cô → 403 (không xoá hộ ảnh người khác)', xoaVP.status === 403, xoaVP.status);
    const xoaBGH = await req('DELETE', `/api/albums/${AL4}/photos/${ANH_CO4}`, { cookie: BGH });
    check('ban giám hiệu xoá ảnh của cô → 403', xoaBGH.status === 403, xoaBGH.status);
    const anhVP = (await anhCua(VP, AL_VP))[1];
    const vpXoaMinh = await req('DELETE', `/api/albums/${AL_VP}/photos/${anhVP}`, { cookie: VP });
    check('văn phòng xoá ảnh mình đăng → 200', vpXoaMinh.status === 200, vpXoaMinh.data);

    // Ảnh cũ (trước khi có sổ người đăng) — chỉ cô của nhóm.
    const cu = ((await chiTiet(GV1, 'al1')).data?.photos || [])[0]?.id;
    const vpCu = await req('DELETE', `/api/albums/al1/photos/${cu}`, { cookie: VP });
    check('ảnh cũ chưa có người đăng: văn phòng xoá → 403', vpCu.status === 403, vpCu.status);
    check('cô của nhóm vẫn thấy nút xoá trên ảnh cũ',
      ((await chiTiet(GV1, 'al1')).data?.photos || [])[0]?.xoaDuoc === true);
    check('ảnh chụp có đủ', (await anhCua(GV4, AL4)).includes(ANH_CO4));
  }

  // =========================================================================
  console.log('\n[7] Xoá cả album: người tạo xoá album của mình');
  {
    const ql = await taoAlbum(QL, { title: 'Album của quản lý', classId: 'c4' });
    const vpXoaQL = await req('DELETE', `/api/albums/${ql.data?.id}`, { cookie: VP });
    check('văn phòng xoá album của quản lý → 403', vpXoaQL.status === 403, vpXoaQL.status);
    const vpXoaCo = await req('DELETE', `/api/albums/${AL4}`, { cookie: VP });
    check('văn phòng xoá album của cô → 403', vpXoaCo.status === 403, vpXoaCo.status);
    check('album của cô còn nguyên', (await chiTiet(GV4, AL4)).status === 200);
    check('chi tiết báo văn phòng xoá được album mình tạo', (await chiTiet(VP, AL_VP)).data?.canXoa === true);
    check('và không xoá được album của cô', (await chiTiet(VP, AL4)).data?.canXoa === false);
    // Album văn phòng tạo mà cô của nhóm đã đăng ảnh vào: xoá album là xoá
    // luôn ảnh của cô — quản trị không xoá hộ ảnh người khác, nên chặn.
    const coAnhCo = await taoAlbum(VP, { title: 'Trung thu', classId: 'c4' });
    const anhCuaCo = (await themAnh(GV4, coAnhCo.data?.id)).data?.photos?.[0]?.id;
    check('đối chứng — cô c4 đăng được ảnh vào album văn phòng tạo', !!anhCuaCo);
    check('chi tiết báo văn phòng KHÔNG xoá được album có ảnh của cô',
      (await chiTiet(VP, coAnhCo.data?.id)).data?.canXoa === false);
    const vpXoaCoAnh = await req('DELETE', `/api/albums/${coAnhCo.data?.id}`, { cookie: VP });
    check('văn phòng xoá album mình tạo nhưng có ảnh của cô → 403', vpXoaCoAnh.status === 403, vpXoaCoAnh.status);
    check('ảnh của cô còn nguyên', (await anhCua(GV4, coAnhCo.data?.id)).includes(anhCuaCo));

    const vpXoa = await req('DELETE', `/api/albums/${AL_VP}`, { cookie: VP });
    check('văn phòng xoá album mình tạo (toàn ảnh của mình) → 200', vpXoa.status === 200, vpXoa.data);
    check('album đã biến mất', (await chiTiet(BGH, AL_VP)).status === 404);
  }

  // =========================================================================
  console.log('\n[8] Tắt album chung là đóng lại với cô nhóm khác');
  {
    const tat = await req('PUT', `/api/albums/${AL4}/gop-anh`, { cookie: GV4, body: { mo: false } });
    check('cô c4 tắt album chung → 200', tat.status === 200 && tat.data?.laAlbumChung === false, tat.data);
    check('cô nhóm khác không mở được nữa', (await chiTiet(GV1, AL4)).status === 403);
    check('và không thêm ảnh được nữa', (await themAnh(GV1, AL4)).status === 403);
    check('ảnh đã góp vẫn còn trong album (tắt không xoá dữ liệu)', (await anhCua(GV4, AL4)).includes(ANH_KHACH));
  }

  // =========================================================================
  console.log('\n[9] Nhóm đã đóng: không ai đăng thêm');
  {
    const r = await taoAlbum(GV2, { title: 'Lá 1 cuối năm' });
    const AL2 = r.data?.id;
    check('đối chứng — cô c2 tạo album', r.status === 201, r.data);
    const bat = await req('PUT', `/api/albums/${AL2}/gop-anh`, { cookie: GV2, body: { mo: true } });
    check('đối chứng — bật album chung', bat.status === 200, bat.data);
    check('đối chứng — trước khi đóng, cô nhóm khác thêm được', (await themAnh(GV1, AL2)).status === 201);
    dongNhom(DIR, 'c2');
    for (const [ten, ck] of [['cô của nhóm', GV2], ['văn phòng', VP], ['ban giám hiệu', BGH],
      ['quản lý cơ sở', QL], ['cô nhóm khác (album chung)', GV1]]) {
      const t = await themAnh(ck, AL2);
      check(`${ten} → 400`, t.status === 400, `${t.status} ${t.data?.error || ''}`);
    }
    check('Marketing vẫn 403', (await themAnh(MK, AL2)).status === 403);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
