// Bài canh KẾ HOẠCH CỦA BÉ — góp ý 18/11 (Đ260h), phía máy chủ.
//
// Chạy bằng:  node test/phan-hoi-1811-ke-hoach.test.mjs
//
// Bốn việc trường nêu:
//   [1] Quản lý đã duyệt mà gia đình không thấy gì: bản chỉ có "Việc khác"
//       (mục chữ, không bài từ kho) trước đây không đi ra màn gia đình.
//       Chủ dự án 25/11: mục "Việc khác" của bản đã duyệt hiện cho gia đình.
//   [2] Cô nước ngoài: bài Cambridge mang mục con (Maths, Let's Explore…) để
//       màn hình chia theo từng lĩnh vực như phần Montessori.
//   [3] "Đề xuất sửa" mang cả BẢN MỚI; quản lý đồng ý là bản mới thay bản đã
//       duyệt, phần nhìn lại của bài còn giữ đi theo bài.
//   [4] Hiệu trưởng tắt Maths / Let's Explore trong kho bài cho một cơ sở.
import path from 'path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-ke-hoach');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkHT2 = taoQuanTri(DIR, 'Hiệu Trưởng CS2', 'ht.cs2');
datChucVu(DIR, 'ht.cs2', 'hieu-truong');
khoaVaoCoSo(DIR, 'ht.cs2', 'cs2');
const mkQLCS = taoQuanTri(DIR, 'Quản Lý CS1', 'ql.cs1');
datChucVu(DIR, 'ql.cs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'ql.cs1', 'cs1');
const mkVP = taoQuanTri(DIR, 'Văn Phòng CS1', 'vp.cs1');
datChucVu(DIR, 'vp.cs1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vp.cs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5410), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await vao('hieutruong', mkHT);
const HT2 = await vao('ht.cs2', mkHT2);
const QLCS = await vao('ql.cs1', mkQLCS);
const VP = await vao('vp.cs1', mkVP);
const GV = (await login('giaovien', '123456')).cookie;       // t1 — cô phụ trách nhóm c1 (Montessori)
const NN = (await login('giaovien.nn', '123456')).cookie;    // t5 — cô nước ngoài của c1 (Cambridge)
const PH = (await login('phuhuynh', '123456')).cookie;       // mẹ bé s1

const THANG = HOM_NAY().slice(0, 7);
const [Y, M] = THANG.split('-').map(Number);
const THANG_TRUOC = new Date(Date.UTC(Y, M - 2, 1)).toISOString().slice(0, 7);
const nhom = async (cookie = GV, classId = 'c1', thang = THANG) =>
  (await req('GET', `/api/kehoachbe?classId=${classId}&thang=${thang}`, { cookie })).data || {};
const cuaBe = async (id, cookie = GV) => ((await nhom(cookie)).danhSach || []).find(x => x.studentId === id) || {};
const luu = (cookie, ct, danhSach, thang = THANG) =>
  req('PUT', '/api/kehoachbe', { cookie, body: { classId: 'c1', thang, chuongTrinh: ct, danhSach } });
const guiVaDuyet = async (cookie, ct, sid) => {
  await req('POST', '/api/kehoachbe/gui-duyet', { cookie, body: { classId: 'c1', thang: THANG, studentId: sid, chuongTrinh: ct } });
  const k = (await cuaBe(sid)).ke;
  return req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: k.id, chuongTrinh: ct }] } });
};
const giaDinh = async () => (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {};
const sql = (cau, ...tham) => {
  const db = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return db.prepare(cau).all(...tham); } finally { db.close(); }
};
const ghi = (cau, ...tham) => {
  const db = new Database(path.join(DIR, 'school.db'));
  try { db.prepare(cau).run(...tham); } finally { db.close(); }
};

try {
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
  const bai = (goc, ten) => (dm.baiHoc || []).find(b => b.gocLinhVuc === goc && b.ten === ten);
  const shapes = bai('cambridge', 'Shapes');            // Maths
  const patterns = bai('cambridge', 'Patterns');        // Maths
  const numbers = bai('cambridge', 'Numbers 1–10');     // Maths
  const bigSmall = bai('cambridge', 'Big and small');   // Maths
  const animals = bai('cambridge', 'Animals');          // Let's Explore
  const weather = bai('cambridge', 'Weather');          // Let's Explore
  const colours = bai('cambridge', 'Colours');          // Communication and Language
  const thapHong = bai('giac-quan', 'Tháp hồng');
  check('đối chứng — kho có đủ bài dùng trong bài này',
    [shapes, patterns, numbers, bigSmall, animals, weather, colours, thapHong].every(Boolean));

  // =========================================================================
  console.log('\n[1] Bản đã duyệt chỉ có "Việc khác": gia đình vẫn thấy; phần còn nháp thì không');
  {
    const r1 = await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: null,
      muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10 bằng chuỗi hạt' }] }]);
    check('cô Montessori lưu một bản chỉ có mục chữ', r1.status === 200 && r1.data.daLuu === 1, r1.data);
    const d1 = await guiVaDuyet(GV, 'chu-nhiem', 's1');
    check('quản lý duyệt phần Montessori', d1.status === 200, d1.data);
    const r2 = await luu(NN, 'nuoc-ngoai', [{ studentId: 's1', capNhatLucGoc: null,
      muc: [{ gocLinhVuc: 'cambridge', noiDung: 'Hát bài Hello mỗi sáng' }] }]);
    check('cô nước ngoài lưu nháp phần Cambridge (chưa gửi)', r2.status === 200, r2.data);

    // Phần nhìn lại của mục — thứ KHÔNG bao giờ được đi ra cho gia đình.
    const k = (await cuaBe('s1')).ke;
    const mucToan = (k.muc || []).find(m => m.gocLinhVuc === 'toan');
    const nl = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: k.id,
      muc: [{ id: mucToan.id, ketQua: 'chua-quan-sat-thay', nhanXet: 'ghi chú riêng của cô', tiepTucThangSau: true }] } });
    check('cô ghi phần nhìn lại cho mục chữ', nl.status === 200, nl.data);

    const d = await giaDinh();
    const ten = (d.baiThangNay || []).map(b => b.ten);
    check('GIA ĐÌNH THẤY mục "Việc khác" của phần đã duyệt', ten.includes('Đếm hạt tới 10 bằng chuỗi hạt'), ten);
    check('và KHÔNG thấy mục của phần Cambridge còn nháp', !ten.includes('Hát bài Hello mỗi sáng'), ten);
    check('baiThangNay vẫn đúng ba khoá: tên, góc, nhãn (bài canh Đ191)',
      (d.baiThangNay || []).length > 0
      && d.baiThangNay.every(b => Object.keys(b).sort().join(',') === 'gocLinhVuc,nhan,ten'), d.baiThangNay);
    check('baiThangNayTheoMuc: đúng bốn khoá tên, góc, mục con, nhãn',
      (d.baiThangNayTheoMuc || []).length === d.baiThangNay.length
      && d.baiThangNayTheoMuc.every(b => Object.keys(b).sort().join(',') === 'gocLinhVuc,linhVucCon,nhan,ten'), d.baiThangNayTheoMuc);
    const goi = JSON.stringify([d.baiThangNay, d.baiThangNayTheoMuc]);
    check('gói gửi gia đình không mang ketQua / nhanXet / mucDo / "Chưa quan sát thấy"',
      !/ketQua|nhanXet|mucDo|tiepTuc|Chưa quan sát thấy|chua-quan-sat-thay|ghi chú riêng/.test(goi), goi.slice(0, 300));
    check('máy chủ khai các mục con của kế hoạch (Maths thuộc Cambridge)',
      (d.linhVucConKeHoach || []).some(c => c.ma === 'cam-toan' && c.ten === 'Maths' && c.gocLinhVuc === 'cambridge'), d.linhVucConKeHoach);
    const co = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: NN })).data || {};
    check('cô (không phải gia đình) thấy cả mục còn nháp', (co.baiThangNay || []).some(b => b.ten === 'Hát bài Hello mỗi sáng'));
  }

  // =========================================================================
  console.log('\n[2] Bài Cambridge mang mục con để màn hình chia theo lĩnh vực');
  {
    const r = await luu(NN, 'nuoc-ngoai', [{ studentId: 's1', capNhatLucGoc: (await cuaBe('s1')).ke.chuongTrinh['nuoc-ngoai'].capNhatLuc,
      muc: [],
      baiHoc: [{ baiHocId: shapes.id, nhan: 'hoc-moi' }, { baiHocId: animals.id, nhan: 'hoc-moi' }, { baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    check('cô nước ngoài tích ba bài Cambridge', r.status === 200 && r.data.daLuu === 1, r.data);
    const k = (await cuaBe('s1')).ke;
    const s = (k.baiHoc || []).find(b => b.baiHocId === shapes.id) || {};
    const a = (k.baiHoc || []).find(b => b.baiHocId === animals.id) || {};
    check('ke.baiHoc: Shapes thuộc Maths (cam-toan)', s.linhVucCon === 'cam-toan', s);
    check("ke.baiHoc: Animals thuộc Let's Explore (cam-kham-pha)", a.linhVucCon === 'cam-kham-pha', a);
    check('bài Montessori không có mục con → chuỗi rỗng, không undefined',
      (k.baiHoc || []).every(b => typeof b.linhVucCon === 'string'));
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: NN, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'nuoc-ngoai' } });
    const cho = (await req('GET', '/api/kehoachbe/cho-duyet', { cookie: QL })).data || {};
    const dong = ((cho.nhom || []).flatMap(n => n.ds)).find(x => x.studentId === 's1' && x.chuongTrinh === 'nuoc-ngoai') || {};
    check('màn duyệt của quản lý cũng nhận mục con của từng bài',
      (dong.baiHoc || []).some(b => b.ten === 'Shapes' && b.linhVucCon === 'cam-toan'), dong.baiHoc);
    const dy = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: k.id, chuongTrinh: 'nuoc-ngoai' }] } });
    check('quản lý duyệt phần Cambridge', dy.status === 200, dy.data);
    const d = await giaDinh();
    const theoMuc = d.baiThangNayTheoMuc || [];
    check('gia đình thấy Shapes kèm mục con Maths',
      theoMuc.some(b => b.ten === 'Shapes' && b.linhVucCon === 'cam-toan'), theoMuc);
  }

  // =========================================================================
  console.log('\n[3] Đề xuất sửa mang bản mới; quản lý đồng ý thì bản mới thay bản đã duyệt');
  {
    let k = (await cuaBe('s1')).ke;
    const dong = (ke, id) => (ke.baiHoc || []).find(b => b.baiHocId === id) || {};
    const nl = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: NN, body: { id: k.id, baiHoc: [
      { id: dong(k, shapes.id).id, mucDo: 'da-vung', tiepTuc: '' },
      { id: dong(k, animals.id).id, mucDo: 'dang-hinh-thanh', tiepTuc: '' }] } });
    check('cô nhìn lại Shapes và Animals trước khi đề xuất', nl.status === 200, nl.data);

    const banMoi = {
      baiHoc: [{ baiHocId: shapes.id, nhan: 'on-tap' }, { baiHocId: colours.id, nhan: 'hoc-moi' }, { baiHocId: weather.id, nhan: 'hoc-moi' }],
      muc: [{ gocLinhVuc: 'cambridge', noiDung: 'Hát bài Goodbye cuối buổi' }],
    };
    const dx = (body, cookie = NN) => req('POST', `/api/kehoachbe/${k.id}/de-xuat`, { cookie, body });
    const saiCt = await dx({ lyDo: 'Đổi bài', chuongTrinh: 'nuoc-ngoai', ban: { baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }], muc: [] } });
    check('bản có bài Montessori trong phần Cambridge → 400', saiCt.status === 400, saiCt.status);
    const rong = await dx({ lyDo: 'Đổi bài', chuongTrinh: 'nuoc-ngoai', ban: { baiHoc: [], muc: [] } });
    check('bản rỗng → 400', rong.status === 400 && /ít nhất một bài/.test(rong.data.error || ''), rong.data);
    const khongCt = await dx({ lyDo: 'Đổi bài', ban: banMoi });
    check('bản mới mà không nói rõ phần nào → 400', khongCt.status === 400, khongCt.status);
    check('ba lần hỏng trên không để lại đề xuất nào',
      sql('SELECT COUNT(*) n FROM kehoachbe_de_xuat WHERE keId = ?', k.id)[0].n === 0);

    const ok = await dx({ lyDo: 'Bé thích Weather, Animals dời sang tháng sau', chuongTrinh: 'nuoc-ngoai', ban: banMoi });
    check('đề xuất kèm bản mới → 201', ok.status === 201, ok.data);
    k = (await cuaBe('s1')).ke;
    check('phần Cambridge VẪN "đã duyệt" trong lúc chờ', k.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet', k.chuongTrinh['nuoc-ngoai']);
    let ten = (await giaDinh()).baiThangNay.map(b => b.ten);
    check('gia đình vẫn thấy BẢN CŨ trong lúc chờ (Animals có, Weather chưa)',
      ten.includes('Animals') && !ten.includes('Weather'), ten);
    const ban = (k.deXuatTheoCt['nuoc-ngoai'] || {}).ban || {};
    check('đề xuất mang bản mới kèm tên bài và mục con',
      (ban.baiHoc || []).some(b => b.ten === 'Weather' && b.linhVucCon === 'cam-kham-pha'), ban);
    const td = ban.thayDoi || {};
    check('thay đổi so với bản đã duyệt: thêm Weather, bỏ Animals, Shapes Dạy mới → Ôn tập',
      JSON.stringify(td.them) === '["Weather"]' && JSON.stringify(td.bo) === '["Animals"]'
      && (td.doiNhan || []).length === 1 && td.doiNhan[0].ten === 'Shapes'
      && td.doiNhan[0].tu === 'hoc-moi' && td.doiNhan[0].sang === 'on-tap', td);
    check('khoá cũ `deXuat` cũng mang bản mới', !!(k.deXuat && k.deXuat.ban), k.deXuat);

    // Phần đã đổi trạng thái giữa chừng (app đời cũ, sửa tay…) → không thay.
    const dxId = ok.data.deXuat.id;
    const truoc = sql('SELECT id, baiHocId, nhan FROM kehoachbe_muc_bai WHERE keId = ? ORDER BY id', k.id);
    ghi("UPDATE kehoachbe_ke_ct SET trangThai = 'nhap' WHERE keId = ? AND chuongTrinh = 'nuoc-ngoai'", k.id);
    const lech = await req('POST', `/api/kehoachbe/de-xuat/${dxId}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    check('phần không còn "đã duyệt" → 400, báo cô gửi lại', lech.status === 400 && /gửi lại đề xuất/.test(lech.data.error || ''), lech.data);
    check('và không dòng bài nào đổi',
      JSON.stringify(sql('SELECT id, baiHocId, nhan FROM kehoachbe_muc_bai WHERE keId = ? ORDER BY id', k.id)) === JSON.stringify(truoc));
    check('đề xuất vẫn đang chờ', sql('SELECT trangThai FROM kehoachbe_de_xuat WHERE id = ?', dxId)[0].trangThai === 'cho-duyet');
    ghi("UPDATE kehoachbe_ke_ct SET trangThai = 'da-duyet' WHERE keId = ? AND chuongTrinh = 'nuoc-ngoai'", k.id);

    const duyet = await req('POST', `/api/kehoachbe/de-xuat/${dxId}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    check('quản lý đồng ý → 200', duyet.status === 200, duyet.data);
    k = (await cuaBe('s1')).ke;
    const cam = (k.baiHoc || []).filter(b => b.gocLinhVuc === 'cambridge');
    check('bản mới thay bản đã duyệt: Shapes, Colours, Weather — không còn Animals',
      cam.map(b => b.ten).sort().join(',') === 'Colours,Shapes,Weather', cam.map(b => b.ten));
    check('Shapes đổi nhãn sang Ôn tập và GIỮ mức độ đã nhìn lại',
      dong(k, shapes.id).nhan === 'on-tap' && dong(k, shapes.id).mucDo === 'da-vung', dong(k, shapes.id));
    check('mục chữ của phần Cambridge là mục của bản mới',
      (k.muc || []).filter(m => m.gocLinhVuc === 'cambridge').map(m => m.noiDung).join('|') === 'Hát bài Goodbye cuối buổi', k.muc);
    check('phần Montessori không bị đụng tới',
      (k.muc || []).some(m => m.gocLinhVuc === 'toan' && m.noiDung === 'Đếm hạt tới 10 bằng chuỗi hạt' && m.ketQua === 'chua-quan-sat-thay'), k.muc);
    check('phần Cambridge vẫn "đã duyệt" (không mở lại về nháp)',
      k.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet' && k.trangThai === 'da-duyet', k.chuongTrinh['nuoc-ngoai']);
    const cu = JSON.parse((sql('SELECT banCuJSON FROM kehoachbe_de_xuat_ban WHERE deXuatId = ?', dxId)[0] || {}).banCuJSON || '{}');
    const animalsCu = (cu.baiHoc || []).find(b => b.baiHocId === animals.id) || {};
    check('bản cũ được chụp lại: bài bị bỏ còn nguyên mức độ đã nhìn lại',
      animalsCu.ten === 'Animals' && animalsCu.mucDo === 'dang-hinh-thanh', cu);
    ten = (await giaDinh()).baiThangNay.map(b => b.ten);
    check('gia đình thấy BẢN MỚI (Weather có, Animals không)', ten.includes('Weather') && !ten.includes('Animals'), ten);
    check('và mục chữ mới của phần Cambridge', ten.includes('Hát bài Goodbye cuối buổi'), ten);

    // Đề xuất không kèm bản (app đời cũ) → vẫn mở lại về nháp như trước.
    const cu2 = await req('POST', `/api/kehoachbe/${k.id}/de-xuat`, { cookie: GV, body: { lyDo: 'Bé nghỉ ốm', chuongTrinh: 'chu-nhiem' } });
    check('đề xuất kiểu cũ (không có bản) vẫn gửi được', cu2.status === 201, cu2.data);
    check('đề xuất kiểu cũ: ban = null', cu2.data.deXuat && cu2.data.deXuat.ban === null, cu2.data.deXuat);
    await req('POST', `/api/kehoachbe/de-xuat/${cu2.data.deXuat.id}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    k = (await cuaBe('s1')).ke;
    check('đồng ý đề xuất kiểu cũ → phần đó mở lại về nháp, phần Cambridge giữ nguyên',
      k.chuongTrinh['chu-nhiem'].trangThai === 'nhap' && k.chuongTrinh['nuoc-ngoai'].trangThai === 'da-duyet', k.chuongTrinh);
  }

  // =========================================================================
  console.log('\n[4] Hiệu trưởng tắt Maths / Let\'s Explore trong kho bài của một cơ sở');
  {
    // Bé s3 đã được tích Patterns (Maths) TRƯỚC khi tắt; bé s4 có Maths ở tháng trước.
    const r3 = await luu(NN, 'nuoc-ngoai', [{ studentId: 's3', capNhatLucGoc: null, baiHoc: [{ baiHocId: patterns.id, nhan: 'hoc-moi' }] }]);
    check('đối chứng — s3 có Patterns từ trước', r3.status === 200 && r3.data.daLuu === 1, r3.data);
    const r4 = await luu(NN, 'nuoc-ngoai', [{ studentId: 's4', capNhatLucGoc: null,
      baiHoc: [{ baiHocId: bigSmall.id, nhan: 'hoc-moi' }, { baiHocId: animals.id, nhan: 'hoc-moi' }] }], THANG_TRUOC);
    check('đối chứng — s4 có Big and small + Animals ở tháng trước', r4.status === 200 && r4.data.daLuu === 1, r4.data);
    const soBai = sql('SELECT COUNT(*) n FROM kehoachbe_baihoc')[0].n;

    const put = (cookie, body) => req('PUT', '/api/kehoachbe/mon-co-so', { cookie, body });
    const tat = { campusId: 'cs1', linhVucCon: 'cam-toan', tat: true };
    check('cô → 403', (await put(GV, tat)).status === 403);
    check('quản lý cơ sở → 403', (await put(QLCS, tat)).status === 403);
    check('văn phòng cơ sở → 403', (await put(VP, tat)).status === 403);
    check('hiệu trưởng khoá ở cơ sở khác → 403', (await put(HT2, tat)).status === 403);
    check('đọc danh sách: cô → 403', (await req('GET', '/api/kehoachbe/mon-co-so', { cookie: GV })).status === 403);
    check('môn ngoài hai môn tắt được (Communication and Language) → 400',
      (await put(QL, { campusId: 'cs1', linhVucCon: 'cam-giao-tiep', tat: true })).status === 400);
    check('cơ sở không có → 400 hoặc 403', [400, 403].includes((await put(QL, { campusId: 'khong-co', linhVucCon: 'cam-toan', tat: true })).status));
    const ok = await put(QL, tat);
    check('hiệu trưởng tắt Maths ở cơ sở 1 → 200', ok.status === 200, ok.data);
    const ds = (await req('GET', '/api/kehoachbe/mon-co-so', { cookie: QL })).data || {};
    check('danh sách cơ sở ghi Maths đang tắt ở cơ sở 1',
      (ds.coSo || []).some(c => c.id === 'cs1' && (c.tat || []).includes('cam-toan'))
      && (ds.coSo || []).some(c => c.id === 'cs2' && !(c.tat || []).length), ds);
    check('hai môn tắt được là Maths và Let\'s Explore',
      (ds.monTatDuoc || []).map(m => m.ma).sort().join(',') === 'cam-kham-pha,cam-toan', ds.monTatDuoc);
    const ds2 = (await req('GET', '/api/kehoachbe/mon-co-so', { cookie: HT2 })).data || {};
    check('hiệu trưởng khoá cơ sở 2 chỉ thấy cơ sở 2', (ds2.coSo || []).map(c => c.id).join(',') === 'cs2', ds2.coSo);

    const c1 = await nhom(GV, 'c1');
    check('kho của nhóm ở cơ sở 1 không còn bài Maths', !(c1.baiHoc || []).some(b => b.linhVucCon === 'cam-toan'),
      (c1.baiHoc || []).filter(b => b.linhVucCon === 'cam-toan').map(b => b.ten));
    check('nhưng vẫn còn bài Let\'s Explore', (c1.baiHoc || []).some(b => b.linhVucCon === 'cam-kham-pha'));
    check('máy chủ nói rõ môn đang tắt ở cơ sở này', JSON.stringify(c1.monTatCoSo) === '["cam-toan"]', c1.monTatCoSo);
    const c3 = await nhom(QL, 'c3');
    check('kho của nhóm ở cơ sở 2 vẫn còn bài Maths', (c3.baiHoc || []).some(b => b.linhVucCon === 'cam-toan'));

    const moi = await luu(NN, 'nuoc-ngoai', [{ studentId: 's3', capNhatLucGoc: (await cuaBe('s3')).ke.chuongTrinh['nuoc-ngoai'].capNhatLuc,
      baiHoc: [{ baiHocId: patterns.id, nhan: 'hoc-moi' }, { baiHocId: numbers.id, nhan: 'hoc-moi' }] }]);
    check('tích bài Maths MỚI ở cơ sở đã tắt → 400', moi.status === 400 && /không dạy/.test(moi.data.error || ''), moi.data);
    const giu = await luu(NN, 'nuoc-ngoai', [{ studentId: 's3', capNhatLucGoc: (await cuaBe('s3')).ke.chuongTrinh['nuoc-ngoai'].capNhatLuc,
      baiHoc: [{ baiHocId: patterns.id, nhan: 'on-tap' }, { baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    check('bài Maths ĐÃ tích từ trước vẫn giữ được khi lưu', giu.status === 200 && giu.data.daLuu === 1, giu.data);
    const k3 = (await cuaBe('s3')).ke;
    check('và vẫn hiện trong kế hoạch của bé', (k3.baiHoc || []).some(b => b.baiHocId === patterns.id && b.nhan === 'on-tap'), k3.baiHoc);
    const caNhom = await req('POST', '/api/kehoachbe/dat-ca-nhom', { cookie: NN, body: { classId: 'c1', thang: THANG, chuongTrinh: 'nuoc-ngoai',
      baiHoc: [{ baiHocId: numbers.id, nhan: 'hoc-moi' }] } });
    check('đặt cả nhóm bài Maths ở cơ sở đã tắt → 400', caNhom.status === 400, caNhom.data);

    const chep = await req('POST', '/api/kehoachbe/chep-thang-truoc', { cookie: NN, body: { classId: 'c1', thang: THANG, chuongTrinh: 'nuoc-ngoai' } });
    check('chép tháng trước chạy được', chep.status === 200, chep.data);
    const k4 = (await cuaBe('s4')).ke || {};
    const ten4 = (k4.baiHoc || []).map(b => b.ten);
    check('chép tháng trước bỏ bài Maths đã tắt, giữ Animals', ten4.includes('Animals') && !ten4.includes('Big and small'), ten4);

    check('tắt môn không đụng tới kho bài (số bài giữ nguyên)', sql('SELECT COUNT(*) n FROM kehoachbe_baihoc')[0].n === soBai);
    const bat = await put(QL, { campusId: 'cs1', linhVucCon: 'cam-toan', tat: false });
    check('bật lại → 200', bat.status === 200, bat.data);
    const c1b = await nhom(GV, 'c1');
    check('bật lại thì bài Maths trở lại kho của cơ sở 1', (c1b.baiHoc || []).some(b => b.linhVucCon === 'cam-toan'));
    check('và không còn môn nào đang tắt', JSON.stringify(c1b.monTatCoSo) === '[]', c1b.monTatCoSo);
  }
} catch (err) {
  console.error(err);
  check('bài chạy không vấp lỗi', false, err.message);
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
