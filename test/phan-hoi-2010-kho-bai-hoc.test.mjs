// Bài canh KHO BÀI HỌC của Kế hoạch của bé — lĩnh vực con và kho nhà trẻ.
//
// Chạy bằng:  node test/phan-hoi-2010-kho-bai-hoc.test.mjs
//
//   [A] CSDL MỚI: bộ mặc định nạp kèm lĩnh vực con (Cambridge chia ba mục,
//       Thể chất chia vận động thô / tinh) và kho nhà trẻ gắn lứa 0–3.
//   [B] LỨA CỦA TỪNG BÉ: bé dưới 36 tháng dùng kho nhà trẻ; nhóm đã khai thì
//       lời khai thắng ngày sinh.
//   [C] QUYỀN VÀ KIỂM TRA: cô không sửa kho; lĩnh vực con phải thuộc đúng góc.
//   [D] BẢNG LĨNH VỰC CON HỎNG GIỮA CHỪNG: màn hình vẫn đọc được.
//   [E] CSDL ĐANG CHẠY (Nguyên tắc số 1): dòng cũ không bị sửa, kho nhà trẻ
//       nạp đúng một lần, khởi động lại không nhân đôi, bài đã ẩn không sống
//       lại, kế hoạch cũ vẫn hiện đúng tên bài.
//   [F] SẮP XẾP BÀI (N5): văn phòng xếp lại một khối (góc + lĩnh vực con); danh
//       sách phải khớp đúng khối, kể cả bài đã ẩn; khối khác không bị xáo.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY,
} from './_chung.mjs';
import Database from 'better-sqlite3';
import path from 'path';

const { check, tongKet } = taoBoDem();
const THANG = HOM_NAY().slice(0, 7);
const MAU_GIAO = '3-4,4-5,5-6';
const NHA_TRE = {
  'toan': ['Hộp thả hình khối', 'Xếp vòng theo cột', 'Đếm cùng cô 1–3', 'Phân loại to – nhỏ'],
  'tieng-viet': ['Gọi tên đồ vật thật', 'Giỏ đồ vật – tranh', 'Đồng dao', 'Xem sách tranh cùng cô'],
  'thuc-hanh-cuoc-song': ['Tự cầm cốc', 'Tự xúc ăn', 'Cất giày lên kệ', 'Mở – đóng nắp hộp'],
  'giac-quan': ['Giỏ kho báu', 'Hộp bóng vật thật', 'Lắc hộp âm thanh', 'Xếp tháp 3 khối'],
  'van-hoa': ['Tranh con vật quen thuộc', 'Tưới cây cùng cô', 'Ngắm trời nắng, trời mưa', 'Hát về gia đình'],
  'cambridge': ['Hello song', 'Animal sounds', 'Head shoulders knees and toes', 'Numbers 1–3', 'Bye-bye song'],
  'the-chat': ['Bò qua đường hầm', 'Đi men theo ghế', 'Đá bóng', 'Leo bậc thấp',
    'Bỏ hạt to vào lọ', 'Xé giấy', 'Nặn đất mềm', 'Xâu vòng to'],
};
const SO_NHA_TRE = Object.values(NHA_TRE).flat().length;

function csdl(dir, viec) {
  const c = new Database(path.join(dir, 'school.db'));
  try { return viec(c); } finally { c.close(); }
}

async function moMayChu(dir, port) {
  const sv = await dungMayChu({ port, dir });
  const req = taoReq(sv.BASE);
  const login = taoLogin(req);
  return { sv, req, login };
}

async function vaoQuanTri(req, login, u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// ===========================================================================
// [A]–[D] CSDL MỚI
// ===========================================================================
{
  const DIR = thuMucTam('phan-hoi-2010-kho-bai-hoc');
  sinhDuLieu(DIR);
  batPhanHe(DIR, ['kehoachbe']);
  const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'kbh2010_ht');
  const { sv, req, login } = await moMayChu(DIR, Number(process.env.TEST_PORT || 3874));
  try {
    const QL = await vaoQuanTri(req, login, 'kbh2010_ht', mk);
    const GV = (await login('giaovien', '123456')).cookie;

    console.log('\n[A] CSDL mới — lĩnh vực con và kho nhà trẻ');
    const d = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
    const ds = d.baiHoc || [];
    const bai = (goc, ten) => ds.find(b => b.gocLinhVuc === goc && b.ten === ten);
    const lvc = d.linhVucCon || [];
    check('máy chủ khai sáu lĩnh vực con kèm góc cha và lứa mặc định',
      lvc.map(x => `${x.ma}:${x.gocLinhVuc}`).join(',')
        === 'cam-giao-tiep:cambridge,cam-toan:cambridge,cam-kham-pha:cambridge,tieng-anh:cambridge,van-dong-tho:the-chat,van-dong-tinh:the-chat'
        && lvc.every(x => typeof x.ten === 'string' && x.ten && 'lua' in x), lvc);
    check('kho lứa có nhà trẻ đứng đầu, đánh dấu lứa mặc định',
      (d.luaKho || []).map(x => `${x.ma}:${x.macDinh}`).join(',') === '0-3:false,3-4:true,4-5:true,5-6:true', d.luaKho);
    const colours = bai('cambridge', 'Colours');
    check('Colours thuộc "Communication and Language", dùng cho mẫu giáo',
      colours && colours.linhVucCon === 'cam-giao-tiep' && colours.luaApDung.join(',') === MAU_GIAO, colours);
    const hello = bai('cambridge', 'Hello song');
    check('bài Tiếng Anh nhà trẻ chỉ dùng cho lứa 0–3',
      hello && hello.linhVucCon === 'tieng-anh' && hello.luaApDung.join(',') === '0-3', hello);
    const thapHong = bai('giac-quan', 'Tháp hồng');
    check('Tháp hồng vẫn không gắn lứa và không có lĩnh vực con',
      thapHong && thapHong.lua.length === 0 && thapHong.linhVucCon === '' && thapHong.luaApDung.join(',') === MAU_GIAO, thapHong);
    check('bài vận động tinh có mục riêng',
      (bai('the-chat', 'Xé giấy') || {}).linhVucCon === 'van-dong-tinh', bai('the-chat', 'Xé giấy'));
    const thieu = Object.entries(NHA_TRE).flatMap(([g, ten]) => ten.filter(t => ds.filter(b => b.gocLinhVuc === g && b.ten === t).length !== 1));
    check('mỗi bài nhà trẻ có đúng một dòng, đúng góc', thieu.length === 0, thieu);
    check('mọi bài nhà trẻ gắn lứa 0–3',
      Object.entries(NHA_TRE).every(([g, ten]) => ten.every(t => (bai(g, t) || {}).luaApDung?.join(',') === '0-3')));

    console.log('\n[B] Lứa kho bài của từng bé');
    const luaCua = async (classId) => Object.fromEntries((((await req('GET',
      `/api/kehoachbe?classId=${classId}&thang=${THANG}`, { cookie: QL })).data || {}).danhSach || []).map(x => [x.studentId, x.lua]));
    let c4 = await luaCua('c4');
    check('bé ~14 tháng (s9) dùng kho nhà trẻ', c4.s9 === '0-3', c4);
    check('bé ~38 tháng (s11) dùng kho 3–4', c4.s11 === '3-4', c4);
    const khai = (lua) => req('PUT', '/api/admin/classes/c4/lua-tuoi', { cookie: QL, body: { lua } });
    check('khai nhóm c4 là nhà trẻ', (await khai('nha-tre')).status === 200);
    c4 = await luaCua('c4');
    check('nhóm khai nhà trẻ: bé 38 tháng cũng dùng kho nhà trẻ', c4.s11 === '0-3' && c4.s9 === '0-3', c4);
    check('khai nhóm c4 là mẫu giáo', (await khai('mau-giao')).status === 200);
    c4 = await luaCua('c4');
    check('nhóm khai mẫu giáo: bé 14 tháng dùng kho 3–4', c4.s9 === '3-4' && c4.s11 === '3-4', c4);
    await khai('');
    const c1 = await luaCua('c1');
    check('nhóm Chồi không đổi: mọi bé vẫn ở kho mẫu giáo',
      Object.values(c1).length > 0 && Object.values(c1).every(l => MAU_GIAO.split(',').includes(l)), c1);

    console.log('\n[C] Quyền và kiểm tra lĩnh vực con');
    const coThem = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: GV, body: { gocLinhVuc: 'cambridge', ten: 'Cô thêm', linhVucCon: 'cam-toan' } });
    check('cô gửi lĩnh vực con khi thêm bài → 403', coThem.status === 403, coThem.status);
    const coSua = await req('PUT', `/api/kehoachbe/bai-hoc/${colours.id}`, { cookie: GV, body: { linhVucCon: 'cam-toan' } });
    check('cô gửi lĩnh vực con khi sửa bài → 403', coSua.status === 403, coSua.status);
    const lechGoc = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'Lệch góc', linhVucCon: 'cam-toan' } });
    check('lĩnh vực con của góc khác → 400', lechGoc.status === 400, lechGoc.status);
    const la = await req('PUT', `/api/kehoachbe/bai-hoc/${colours.id}`, { cookie: QL, body: { linhVucCon: 'khong-co' } });
    check('lĩnh vực con lạ → 400', la.status === 400, la.status);
    const them = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'cambridge', ten: 'Big numbers', linhVucCon: 'cam-toan' } });
    check('văn phòng thêm bài vào "Maths"',
      them.status === 200 && them.data.baiHoc.linhVucCon === 'cam-toan' && them.data.baiHoc.luaApDung.join(',') === MAU_GIAO, them.data);
    const doiGoc = await req('PUT', `/api/kehoachbe/bai-hoc/${them.data.baiHoc.id}`, { cookie: QL, body: { gocLinhVuc: 'toan' } });
    check('đổi sang góc khác mà không gửi lĩnh vực con: mục cũ không hợp thì bỏ',
      doiGoc.status === 200 && doiGoc.data.baiHoc.linhVucCon === '' && doiGoc.data.baiHoc.gocLinhVuc === 'toan', doiGoc.data);
    const boMuc = await req('PUT', `/api/kehoachbe/bai-hoc/${colours.id}`, { cookie: QL, body: { linhVucCon: '' } });
    check('gửi lĩnh vực con rỗng = chưa xếp mục', boMuc.status === 200 && boMuc.data.baiHoc.linhVucCon === '', boMuc.data);
    await req('PUT', `/api/kehoachbe/bai-hoc/${colours.id}`, { cookie: QL, body: { linhVucCon: 'cam-giao-tiep' } });
    const nt = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'Bài nhà trẻ mới', lua: ['0-3'] } });
    check('văn phòng gắn được lứa nhà trẻ', nt.status === 200 && nt.data.baiHoc.lua.join(',') === '0-3', nt.data);
    const luaLa = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'x', lua: ['7-8'] } });
    check('lứa lạ → 400, lời báo kể đủ bốn lứa',
      luaLa.status === 400 && /nhà trẻ/i.test(luaLa.data.error) && /3–4/.test(luaLa.data.error) && /5–6/.test(luaLa.data.error), luaLa.data);

    console.log('\n[D] Bảng lĩnh vực con hỏng giữa lúc chạy');
    csdl(DIR, c => c.exec('ALTER TABLE kehoachbe_baihoc_con RENAME TO kehoachbe_baihoc_con_tam'));
    const hong = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('danh mục vẫn đọc được (200)', hong.status === 200 && (hong.data.baiHoc || []).length > 0, hong.status);
    const hongNhom = await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV });
    check('màn chính của cô vẫn đọc được (200)', hongNhom.status === 200, hongNhom.status);
    csdl(DIR, c => c.exec('ALTER TABLE kehoachbe_baihoc_con_tam RENAME TO kehoachbe_baihoc_con'));
    const lanhLai = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc || [];
    check('bảng về lại thì mục hiện lại',
      (lanhLai.find(b => b.id === colours.id) || {}).linhVucCon === 'cam-giao-tiep');

    console.log('\n[F] Sắp xếp bài trong kho (N5)');
    const PH = (await login('phuhuynh', '123456')).cookie;
    const kho = async () => ((await req('GET', '/api/kehoachbe/bai-hoc?tatCa=1', { cookie: QL })).data || {}).baiHoc || [];
    const cuaGoc = (dsBai, goc) => dsBai.filter(b => b.gocLinhVuc === goc);
    const khoi = (dsBai, goc, con) => cuaGoc(dsBai, goc).filter(b => b.linhVucCon === con).map(b => b.id);
    const xep = (cookie, body) => req('POST', '/api/kehoachbe/bai-hoc/sap-xep', { cookie, body });

    const bangTru = bai('toan', 'Bảng trừ');
    await req('PUT', `/api/kehoachbe/bai-hoc/${bangTru.id}`, { cookie: QL, body: { active: false } });
    const toan = khoi(await kho(), 'toan', '');
    check('góc Toán có bài đã ẩn trong khối "chưa xếp mục"', toan.length > 5 && toan.includes(bangTru.id), toan.length);

    const thieuMot = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: toan.slice(1).reverse() });
    check('thiếu một bài (kể cả bài đã ẩn) → 409, lời báo bảo cô tải lại',
      thieuMot.status === 409 && thieuMot.data.error === 'Kho bài vừa có người sửa, cô tải lại rồi xếp lại', thieuMot);
    const boAn = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: toan.filter(id => id !== bangTru.id) });
    check('bỏ sót bài đã ẩn cũng là 409', boAn.status === 409, boAn.status);
    const lapLai = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: [...toan.slice(1), toan[1]] });
    check('một bài lặp hai lần thay cho bài khác → 409', lapLai.status === 409, lapLai.status);
    check('sau các lần 409: thứ tự Toán không đổi', JSON.stringify(khoi(await kho(), 'toan', '')) === JSON.stringify(toan));

    const lanGoc = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: [...toan, colours.id] });
    check('có bài của góc khác → 400', lanGoc.status === 400, lanGoc);
    const conLech = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: 'cam-toan', ids: toan });
    check('lĩnh vực con không thuộc góc → 400', conLech.status === 400, conLech.status);
    const gocLa = await xep(QL, { gocLinhVuc: 'khong-co', linhVucCon: '', ids: toan });
    check('góc lạ → 400', gocLa.status === 400, gocLa.status);
    const khongMang = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: 'abc' });
    check('ids không phải danh sách → 400', khongMang.status === 400, khongMang.status);

    const dao = toan.slice().reverse();
    const coXep = await xep(GV, { gocLinhVuc: 'toan', linhVucCon: '', ids: dao });
    check('cô sắp xếp kho → 403', coXep.status === 403, coXep.status);
    const phXep = await xep(PH, { gocLinhVuc: 'toan', linhVucCon: '', ids: dao });
    check('phụ huynh sắp xếp kho → 403', phXep.status === 403, phXep.status);
    check('sau 403: thứ tự Toán không đổi', JSON.stringify(khoi(await kho(), 'toan', '')) === JSON.stringify(toan));

    const daoToan = await xep(QL, { gocLinhVuc: 'toan', linhVucCon: '', ids: dao });
    check('văn phòng đảo ngược khối Toán → 200', daoToan.status === 200, daoToan);
    const sauDao = cuaGoc(await kho(), 'toan');
    check('đọc lại: thứ tự Toán đúng như vừa xếp', JSON.stringify(sauDao.map(b => b.id)) === JSON.stringify(dao), sauDao.map(b => b.ten));
    check('thứ tự đánh lại liền 0..N-1', sauDao.every((b, i) => b.thuTu === i), sauDao.map(b => b.thuTu));
    const coThay = cuaGoc(((await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {}).baiHoc || [], 'toan').map(b => b.id);
    check('cô thấy đúng thứ tự mới (bài ẩn không hiện)',
      JSON.stringify(coThay) === JSON.stringify(dao.filter(id => id !== bangTru.id)), coThay.length);

    const cam = await kho();
    const camKhoi = (dsBai) => Object.fromEntries(['cam-giao-tiep', 'cam-toan', 'cam-kham-pha', 'tieng-anh', '']
      .map(c => [c, khoi(dsBai, 'cambridge', c)]));
    const truocCam = camKhoi(cam);
    check('Cambridge có đủ ba khối mẫu giáo để thử', truocCam['cam-toan'].length >= 3
      && truocCam['cam-giao-tiep'].length >= 3 && truocCam['cam-kham-pha'].length >= 3, truocCam);
    const sai = await xep(QL, { gocLinhVuc: 'cambridge', linhVucCon: '', ids: truocCam['cam-toan'] });
    check('gửi khối Maths dưới tên khối "chưa xếp mục" → 409', sai.status === 409, sai.status);
    const daoMaths = truocCam['cam-toan'].slice().reverse();
    const xepMaths = await xep(QL, { gocLinhVuc: 'cambridge', linhVucCon: 'cam-toan', ids: daoMaths });
    check('văn phòng đảo ngược khối Maths → 200', xepMaths.status === 200, xepMaths);
    const sauCam = await kho();
    const sauKhoi = camKhoi(sauCam);
    check('Maths đúng thứ tự mới', JSON.stringify(sauKhoi['cam-toan']) === JSON.stringify(daoMaths), sauKhoi['cam-toan']);
    check('hai khối Cambridge kia không bị xáo',
      JSON.stringify(sauKhoi['cam-giao-tiep']) === JSON.stringify(truocCam['cam-giao-tiep'])
        && JSON.stringify(sauKhoi['cam-kham-pha']) === JSON.stringify(truocCam['cam-kham-pha'])
        && JSON.stringify(sauKhoi['tieng-anh']) === JSON.stringify(truocCam['tieng-anh']), sauKhoi);
    const thuTuKhoi = ['cam-giao-tiep', 'cam-toan', 'cam-kham-pha', 'tieng-anh', ''];
    const camTheoThuTu = cuaGoc(sauCam, 'cambridge');
    check('cả góc đánh số theo khối (thứ tự lĩnh vực con, "chưa xếp" cuối), liền 0..N-1',
      camTheoThuTu.every((b, i) => b.thuTu === i)
        && camTheoThuTu.every((b, i) => i === 0 || thuTuKhoi.indexOf(camTheoThuTu[i - 1].linhVucCon) <= thuTuKhoi.indexOf(b.linhVucCon)),
      camTheoThuTu.map(b => `${b.thuTu}:${b.linhVucCon}`));
    check('góc Toán không bị đụng khi xếp Cambridge',
      JSON.stringify(cuaGoc(sauCam, 'toan').map(b => b.id)) === JSON.stringify(dao));

    const nhatKy = csdl(DIR, c => c.prepare(
      "SELECT target, userId FROM audit_log WHERE action = 'kehoachbe-sap-xep-bai' ORDER BY at").all());
    check('nhật ký thao tác ghi hai lần xếp thành công, đúng góc',
      nhatKy.length === 2 && nhatKy[0].target === 'toan' && nhatKy[1].target === 'cambridge', nhatKy);
  } finally {
    sv.dung();
    donThuMucTam(DIR);
  }
}

// ===========================================================================
// [E] CSDL ĐANG CHẠY TỪ TRƯỚC
// ===========================================================================
{
  const DIR = thuMucTam('phan-hoi-2010-kho-bai-hoc-cu');
  sinhDuLieu(DIR);
  batPhanHe(DIR, ['kehoachbe']);
  const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'kbh2010_ht2');

  // Dựng lại đúng hình dạng của một CSDL đang chạy trước thay đổi này: hai
  // bảng mới chưa có, danh mục đã nạp theo kiểu cũ, có bài văn phòng tự thêm,
  // có bài đã ẩn, và một kế hoạch đã tích Colours.
  const BAI_CU = [
    ['khbh_c1', 'toan', 'Gậy số', 0, 1], ['khbh_c2', 'toan', 'Số nhám', 1, 1],
    ['khbh_c3', 'cambridge', 'Colours', 0, 1], ['khbh_c4', 'cambridge', 'Animals', 1, 1],
    ['khbh_c5', 'cambridge', 'Phonics', 2, 1], ['khbh_c6', 'giac-quan', 'Tháp hồng', 0, 1],
    ['khbh_c7', 'the-chat', 'Đi theo vạch', 0, 1], ['khbh_c8', 'van-hoa', 'Cờ các nước', 0, 0],
  ];
  csdl(DIR, c => {
    // Ba bảng đúng như lược đồ trước thay đổi này; máy chủ tự dựng phần còn lại.
    c.exec(`
      CREATE TABLE IF NOT EXISTS kehoachbe_ke (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, classId TEXT NOT NULL,
        thang TEXT NOT NULL, trangThai TEXT NOT NULL DEFAULT 'nhap', coLap TEXT, lapLuc TEXT, guiLuc TEXT,
        nguoiDuyet TEXT, duyetLuc TEXT, yKienDuyet TEXT NOT NULL DEFAULT '', capNhatLuc TEXT);
      CREATE TABLE IF NOT EXISTS kehoachbe_baihoc (id TEXT PRIMARY KEY, gocLinhVuc TEXT NOT NULL, ten TEXT NOT NULL,
        moTa TEXT NOT NULL DEFAULT '', thuTu INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
        nguoiTao TEXT, taoLuc TEXT);
      CREATE TABLE IF NOT EXISTS kehoachbe_muc_bai (id TEXT PRIMARY KEY, keId TEXT NOT NULL, baiHocId TEXT NOT NULL,
        nhan TEXT NOT NULL DEFAULT 'hoc-moi', ketQua TEXT NOT NULL DEFAULT '', nhanXet TEXT NOT NULL DEFAULT '',
        tiepTucThangSau INTEGER NOT NULL DEFAULT 0, capNhatLuc TEXT);`);
    const ins = c.prepare('INSERT INTO kehoachbe_baihoc (id, gocLinhVuc, ten, moTa, thuTu, active, nguoiTao, taoLuc) VALUES (?, ?, ?, \'\', ?, ?, NULL, ?)');
    for (const [id, g, t, tt, a] of BAI_CU) ins.run(id, g, t, tt, a, '2026-09-10T00:00:00.000Z');
    c.prepare(`INSERT INTO kehoachbe_ke (id, studentId, classId, thang, trangThai, coLap, yKienDuyet)
               VALUES ('kb_cu1', 's1', 'c1', ?, 'da-duyet', 't1', '')`).run(THANG);
    c.prepare(`INSERT INTO kehoachbe_muc_bai (id, keId, baiHocId, nhan) VALUES ('kmb_cu1', 'kb_cu1', 'khbh_c3', 'hoc-moi')`).run();
  });
  const chup = () => csdl(DIR, c => c.prepare(
    `SELECT id, gocLinhVuc, ten, thuTu, active FROM kehoachbe_baihoc WHERE id LIKE 'khbh_c%' ORDER BY id`).all());
  const truoc = JSON.stringify(chup());
  const demNhaTre = () => csdl(DIR, c => c.prepare(
    `SELECT COUNT(*) AS n FROM kehoachbe_baihoc WHERE ten IN (${Object.values(NHA_TRE).flat().map(() => '?').join(',')})`)
    .get(...Object.values(NHA_TRE).flat()).n);

  const { sv, req, login } = await moMayChu(DIR, Number(process.env.TEST_PORT_2 || 3875));
  try {
    const QL = await vaoQuanTri(req, login, 'kbh2010_ht2', mk);
    let GV = (await login('giaovien', '123456')).cookie;

    console.log('\n[E] CSDL đang chạy — không sửa dòng cũ, nạp kho nhà trẻ đúng một lần');
    const d = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
    const ds = d.baiHoc || [];
    check('mã, góc, tên, thứ tự, ẩn/hiện của mọi dòng cũ giữ nguyên', JSON.stringify(chup()) === truoc, chup());
    check('bài cũ chưa xếp mục (linhVucCon rỗng), kể cả Colours',
      ds.filter(b => b.id.startsWith('khbh_c')).every(b => b.linhVucCon === ''), ds.filter(b => b.id.startsWith('khbh_c')));
    check('bộ mặc định KHÔNG nạp chồng lên danh mục cũ',
      !ds.some(b => b.ten === 'Hộp con quay') && ds.filter(b => b.ten === 'Colours').length === 1);
    check(`kho nhà trẻ nạp đúng một lần (${SO_NHA_TRE} bài)`, demNhaTre() === SO_NHA_TRE, demNhaTre());
    const hello = ds.find(b => b.ten === 'Hello song');
    check('bài nhà trẻ mới mang lứa 0–3 và lĩnh vực con',
      hello && hello.linhVucCon === 'tieng-anh' && hello.luaApDung.join(',') === '0-3' && hello.nguoiTao === null, hello);
    const hopTha = ds.find(b => b.ten === 'Hộp thả hình khối');
    check('bài nhà trẻ xếp sau bài cũ của góc', hopTha && hopTha.thuTu > 1, hopTha);
    const k = (((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data || {}).danhSach || [])
      .find(x => x.studentId === 's1');
    check('kế hoạch cũ vẫn hiện đúng tên bài đã tích',
      ((k && k.ke && k.ke.baiHoc) || []).some(b => b.baiHocId === 'khbh_c3' && b.ten === 'Colours'), k && k.ke);

    const an = await req('PUT', `/api/kehoachbe/bai-hoc/${hopTha.id}`, { cookie: QL, body: { active: false } });
    check('văn phòng ẩn một bài nhà trẻ', an.status === 200 && an.data.baiHoc.active === false, an.data);

    await sv.khoiDongLai();
    GV = (await login('giaovien', '123456')).cookie;
    const lai = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
    check('khởi động lại: không nhân đôi kho nhà trẻ', demNhaTre() === SO_NHA_TRE, demNhaTre());
    check('khởi động lại: bài nhà trẻ đã ẩn KHÔNG sống lại',
      !(lai.baiHoc || []).some(b => b.id === hopTha.id)
        && csdl(DIR, c => c.prepare('SELECT active FROM kehoachbe_baihoc WHERE id = ?').get(hopTha.id).active) === 0);
    check('khởi động lại: dòng cũ vẫn nguyên', JSON.stringify(chup()) === truoc, chup());
  } finally {
    sv.dung();
    donThuMucTam(DIR);
  }
}

tongKet();
