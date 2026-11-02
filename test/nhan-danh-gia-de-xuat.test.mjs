// Bài canh ĐỀ XUẤT ĐỔI BỘ CHỮ ĐÁNH GIÁ (chủ dự án 02/11).
//
// Chạy bằng:  node test/nhan-danh-gia-de-xuat.test.mjs
//
// Quản lý cơ sở bị khoá vào một cơ sở không sửa thẳng được bộ chữ dùng chung
// cả trường (`test/nhan-danh-gia.test.mjs` mục [4] vẫn canh điều đó). Họ GỬI
// ĐỀ XUẤT; ban giám hiệu đồng ý (áp vào bộ chữ) hoặc chưa đồng ý, và vẫn sửa
// trực tiếp được như cũ.
//
// Ba điều bài này chốt:
//   1. Đề xuất KHÔNG phải bộ chữ đang dùng — gửi xong, màn của cô vẫn nói chữ cũ.
//   2. Người gác chữ cấm đứng ở CẢ đường gửi lẫn đường duyệt.
//   3. Mỗi lúc chỉ MỘT đề xuất chờ cho cả trường, chốt ở cả route lẫn chỉ mục.
import { createRequire } from 'module';
import path from 'path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('nhan-danh-gia-de-xuat');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ndgdx_qt');
const mkCs2 = taoQuanTri(DIR, 'Cô Hai Quản Lý', 'ndgdx_cs2');
const mkCs1 = taoQuanTri(DIR, 'Cô Một Quản Lý', 'ndgdx_cs1');
const mkVp = taoQuanTri(DIR, 'Văn Phòng Hai', 'ndgdx_vp');
khoaVaoCoSo(DIR, 'ndgdx_cs2', 'cs2');
khoaVaoCoSo(DIR, 'ndgdx_cs1', 'cs1');
datChucVu(DIR, 'ndgdx_cs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'ndgdx_vp', 'cs2');
datChucVu(DIR, 'ndgdx_vp', 'vanphong-coso');

const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 4662), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Ghi thẳng vào cơ sở dữ liệu của máy chủ đang chạy — để dựng những dòng mà
// đường API không bao giờ cho tạo (chữ cấm, JSON hỏng, hai dòng chờ).
function moCsdl() {
  const sql = new Database(path.join(DIR, 'school.db'));
  sql.pragma('busy_timeout = 5000');
  return sql;
}
function chenThang(dong) {
  const sql = moCsdl();
  try {
    sql.prepare(`INSERT INTO nhan_danh_gia_de_xuat (id, nhan, nen, lyDo, coDeXuat, coSoId, trangThai, taoLuc)
      VALUES (@id, @nhan, @nen, @lyDo, @coDeXuat, @coSoId, @trangThai, @taoLuc)`).run({
      nen: '{}', lyDo: 'chèn thẳng', coSoId: 'cs2', trangThai: 'cho-duyet',
      taoLuc: new Date().toISOString(), ...dong,
    });
  } finally { sql.close(); }
}
function idCua(username) {
  const sql = moCsdl();
  try { return sql.prepare('SELECT id FROM users WHERE username = ?').get(username).id; } finally { sql.close(); }
}
function cacMaAudit() {
  const sql = moCsdl();
  try { return sql.prepare('SELECT action FROM audit_log').all().map(r => r.action); } finally { sql.close(); }
}

try {
  const QT = await vao('ndgdx_qt', mkQt);
  const CS2 = await vao('ndgdx_cs2', mkCs2);
  const CS1 = await vao('ndgdx_cs1', mkCs1);
  const VP = await vao('ndgdx_vp', mkVp);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;
  const idCs2 = idCua('ndgdx_cs2');

  const DX = '/api/admin/nhan-danh-gia/de-xuat';
  const docDx = (cookie) => req('GET', DX, { cookie });
  const gui = (cookie, nhan, lyDo = 'Trường đang dùng chữ này trong sổ giấy') =>
    req('POST', DX, { cookie, body: { nhan, lyDo } });
  const xem = (cookie, id, quyetDinh, yKien) =>
    req('POST', `${DX}/${id}/duyet`, { cookie, body: { quyetDinh, yKien } });
  const rut = (cookie, id) => req('POST', `${DX}/${id}/rut`, { cookie });
  const nhanCu = async () => Object.fromEntries(
    ((await req('GET', '/api/admin/nhan-danh-gia', { cookie: QT })).data?.nhan || []).map(n => [n.ma, n.nhan]));
  const sua = (nhan) => req('PUT', '/api/admin/nhan-danh-gia', { cookie: QT, body: { nhan } });
  const ketQuaKe = async () => (await req('GET', '/api/kehoachbe?studentId=s1', { cookie: GV })).data?.ketQua || [];
  const choDuyet = async (cookie = QT) => (await docDx(cookie)).data?.choDuyet || null;
  const thayDoiCua = (cd, ma) => (cd?.thayDoi || []).find(t => t.ma === ma);

  // =========================================================================
  console.log('\n[1] Ai mở được thẻ đề xuất — và hai đường cũ giữ nguyên');
  {
    const qt = await docDx(QT);
    check('ban giám hiệu: duyệt được, không cần đề xuất',
      qt.status === 200 && qt.data?.duyetDuoc === true && qt.data?.deXuatDuoc === false, qt);
    const cs2 = await docDx(CS2);
    check('quản lý khoá vào cơ sở 2 (chưa khai chức vụ): đề xuất được, không duyệt',
      cs2.status === 200 && cs2.data?.deXuatDuoc === true && cs2.data?.duyetDuoc === false, cs2);
    const cs1 = await docDx(CS1);
    check('quản lý cơ sở 1 (chức vụ quanly-coso): đề xuất được',
      cs1.status === 200 && cs1.data?.deXuatDuoc === true && cs1.data?.duyetDuoc === false, cs1);
    check('chưa có đề xuất nào đang chờ', qt.data?.choDuyet === null && Array.isArray(qt.data?.ganDay), qt.data);
    check('văn phòng cơ sở: 403', (await docDx(VP)).status === 403);
    check('cô: 403', (await docDx(GV)).status === 403);
    check('gia đình: 403', (await docDx(PH)).status === 403);

    const cu = await req('GET', '/api/admin/nhan-danh-gia', { cookie: CS2 });
    check('HỒI QUY: quản lý cơ sở vẫn nhận suaDuoc:false ở đường cũ', cu.data?.suaDuoc === false, cu.data);
    const put = await req('PUT', '/api/admin/nhan-danh-gia', { cookie: CS2, body: { nhan: { 'da-vung': 'Hoàn thành' } } });
    check('HỒI QUY: quản lý cơ sở vẫn bị 403 ở PUT cũ, câu báo nói MỌI cơ sở',
      put.status === 403 && /MỌI cơ sở/.test(put.data?.error || ''), put);
  }

  // =========================================================================
  console.log('\n[2] Đường gửi có người gác');
  {
    const sai = [
      [{ 'da-vung': 'Giỏi' }, undefined, 'chữ Giỏi'],
      [{ 'da-vung': 'Đạt' }, undefined, 'chữ Đạt'],
      [{ 'da-vung': 'Loại A' }, undefined, 'chữ Loại A'],
      [{ 'da-vung': 'Mức 3' }, undefined, 'chữ mang con số'],
      [{ 'da-vung': 'x'.repeat(41) }, undefined, 'chữ 41 ký tự'],
      [{ 'da-vung': 'Hoàn thành' }, '   ', 'lý do rỗng'],
      [{ 'da-vung': 'Hoàn thành' }, 'x'.repeat(301), 'lý do quá 300 ký tự'],
      [{ 'da-vung': 'Đã vững' }, undefined, 'không đổi mã nào'],
      [{ 'ma-la': 'Hoàn thành' }, undefined, 'chỉ có khoá lạ'],
    ];
    for (const [nhan, lyDo, ten] of sai) {
      const r = await gui(CS2, nhan, lyDo);
      check(`từ chối (400): ${ten}`, r.status === 400 && !!r.data?.error, r);
    }
    const r = await gui(CS2, { 'chua-day': 'Chưa học tới', 'da-vung': 'Giỏi' });
    check('câu từ chối chỉ đúng mã sai', r.data?.ma === 'da-vung', r.data);
    check('sau mọi lần bị từ chối, vẫn không có đề xuất chờ', (await choDuyet()) === null);
  }

  // =========================================================================
  console.log('\n[3] Gửi được — nhưng bộ chữ đang dùng KHÔNG đổi');
  let id3;
  {
    const r = await gui(CS2, { 'da-vung': 'Hoàn thành', 'ma-la': 'Gì đó' });
    check('quản lý cơ sở 2 gửi được (201)', r.status === 201, r);
    id3 = r.data?.id;
    check('trả mã đề xuất', typeof id3 === 'string' && id3.length > 0, r.data);
    check('bộ chữ đang dùng VẪN là "Đã vững"', (await nhanCu())['da-vung'] === 'Đã vững');
    const kq = (await ketQuaKe()).find(x => x.ma === 'da-vung');
    check('màn của cô (Kế hoạch của bé) vẫn nói "Đã vững"', kq?.ten === 'Đã vững', kq);
    const cd = await choDuyet();
    check('đề xuất hiện ở choDuyet', cd?.id === id3, cd);
    check('chỉ mang đúng mã đổi, khoá lạ bị bỏ',
      (cd?.thayDoi || []).map(t => t.ma).join(',') === 'da-vung', cd?.thayDoi);
    const t = thayDoiCua(cd, 'da-vung');
    check('so sánh đúng: đang dùng "Đã vững" → đề xuất "Hoàn thành"',
      t?.dangDung === 'Đã vững' && t?.deXuat === 'Hoàn thành' && t?.nen === 'Đã vững'
        && t?.macDinh === 'Đã vững' && t?.daDoiTuLucGui === false, t);
    check('tên người gửi và cơ sở hiện ra',
      cd?.coDeXuatTen === 'Cô Hai Quản Lý' && cd?.coSoTen === 'Cơ sở 2', cd);
    check('lý do lưu đúng', cd?.lyDo === 'Trường đang dùng chữ này trong sổ giấy', cd?.lyDo);
    check('người gửi thấy cuaToi:true', (await choDuyet(CS2))?.cuaToi === true);
    check('quản lý cơ sở khác cũng thấy đề xuất chờ, cuaToi:false',
      (await choDuyet(CS1))?.cuaToi === false && (await choDuyet(CS1))?.id === id3);
  }

  // =========================================================================
  console.log('\n[4] Mỗi lúc chỉ một đề xuất chờ cho cả trường');
  {
    const r1 = await gui(CS1, { 'vuot-troi': 'Tự làm thành thạo' });
    check('quản lý cơ sở 1 gửi bị 409', r1.status === 409, r1);
    check('câu báo nêu tên người gửi và cơ sở',
      /Cô Hai Quản Lý/.test(r1.data?.error || '') && /Cơ sở 2/.test(r1.data?.error || ''), r1.data);
    const r2 = await gui(CS2, { 'vuot-troi': 'Tự làm thành thạo' });
    check('chính người đã gửi gửi lần hai cũng 409', r2.status === 409, r2);
    const r3 = await gui(QT, { 'vuot-troi': 'Tự làm thành thạo' });
    check('ban giám hiệu gửi đề xuất bị 403, được mách sửa trực tiếp',
      r3.status === 403 && /sửa trực tiếp/.test(r3.data?.error || ''), r3);
    check('văn phòng gửi bị 403', (await gui(VP, { 'vuot-troi': 'Tự làm thành thạo' })).status === 403);
    check('cô gửi bị 403', (await gui(GV, { 'vuot-troi': 'Tự làm thành thạo' })).status === 403);
  }

  // =========================================================================
  console.log('\n[5] Chỉ ban giám hiệu duyệt');
  {
    check('người gửi tự duyệt: 403', (await xem(CS2, id3, 'da-duyet')).status === 403);
    check('quản lý cơ sở khác: 403', (await xem(CS1, id3, 'da-duyet')).status === 403);
    check('văn phòng: 403', (await xem(VP, id3, 'da-duyet')).status === 403);
    check('cô: 403', (await xem(GV, id3, 'da-duyet')).status === 403);
    check('mã không có: 404', (await xem(QT, 'ndgdx_khong_co', 'da-duyet')).status === 404);
    check('quyết định lạ: 400', (await xem(QT, id3, 'cho-qua')).status === 400);
    check('vẫn đang chờ, bộ chữ không đổi',
      (await choDuyet())?.id === id3 && (await nhanCu())['da-vung'] === 'Đã vững');
  }

  // =========================================================================
  console.log('\n[6] Chưa đồng ý');
  {
    const r0 = await xem(QT, id3, 'tu-choi', '  ');
    check('chưa đồng ý mà không ghi ý kiến: 400', r0.status === 400, r0);
    const r = await xem(QT, id3, 'tu-choi', 'Giữ chữ cũ tới hết học kỳ');
    check('có ý kiến thì được', r.status === 200, r);
    check('bộ chữ không đổi', (await nhanCu())['da-vung'] === 'Đã vững');
    check('không còn đề xuất chờ', (await choDuyet()) === null);
    const muc = ((await docDx(CS2)).data?.ganDay || []).find(g => g.id === id3);
    check('người gửi thấy kết quả tu-choi kèm ý kiến',
      muc?.trangThai === 'tu-choi' && muc?.yKien === 'Giữ chữ cũ tới hết học kỳ', muc);
    check('quản lý cơ sở khác KHÔNG thấy mục đó',
      !((await docDx(CS1)).data?.ganDay || []).some(g => g.id === id3));
    check('ban giám hiệu thấy mục đó',
      ((await docDx(QT)).data?.ganDay || []).some(g => g.id === id3));
    const lai = await xem(QT, id3, 'da-duyet');
    check('xem lại cùng đề xuất: 400 "đã được xem"', lai.status === 400 && /đã được xem/.test(lai.data?.error || ''), lai);
    check('và bộ chữ vẫn không đổi', (await nhanCu())['da-vung'] === 'Đã vững');
  }

  // =========================================================================
  console.log('\n[7] Đồng ý: chữ đổi tới tận màn của cô, MÃ không đổi');
  {
    const g = await gui(CS2, { 'da-vung': 'Hoàn thành' });
    check('gửi lại được sau khi đề xuất trước đã khép', g.status === 201, g);
    const r = await xem(QT, g.data?.id, 'da-duyet');
    check('ban giám hiệu đồng ý (200)', r.status === 200, r);
    check('đường cũ nói chữ mới', (await nhanCu())['da-vung'] === 'Hoàn thành');
    const kq = await ketQuaKe();
    check('màn của cô nói chữ mới', kq.find(x => x.ma === 'da-vung')?.ten === 'Hoàn thành', kq);
    check('MÃ không đổi',
      kq.map(x => x.ma).join(',') === 'chua-day,chua-quan-sat-thay,dang-hinh-thanh,da-vung,vuot-troi', kq.map(x => x.ma));
    const muc = ((await docDx(CS2)).data?.ganDay || []).find(x => x.id === g.data?.id);
    check('người gửi thấy kết quả da-duyet', muc?.trangThai === 'da-duyet' && !!muc?.xemLuc, muc);
    const ma = cacMaAudit();
    check('nhật ký có đủ ba mã: đề xuất, duyệt, sửa',
      ['nhan-danh-gia-de-xuat', 'nhan-danh-gia-duyet', 'nhan-danh-gia-sua'].every(m => ma.includes(m)),
      [...new Set(ma.filter(m => m.startsWith('nhan-danh-gia')))]);
  }

  // =========================================================================
  console.log('\n[8] Sửa trực tiếp khi đang có đề xuất chờ');
  {
    const g = await gui(CS2, { 'vuot-troi': 'Tự làm thành thạo' });
    check('quản lý cơ sở 2 đề xuất đổi "vuot-troi"', g.status === 201, g);
    check('ban giám hiệu sửa trực tiếp mã khác (da-vung) vẫn được',
      (await sua({ 'da-vung': 'Làm được rồi' })).status === 200);
    let cd = await choDuyet();
    check('đề xuất VẪN chờ', cd?.id === g.data?.id, cd);
    check('mã trong đề xuất chưa bị đụng: daDoiTuLucGui=false',
      thayDoiCua(cd, 'vuot-troi')?.daDoiTuLucGui === false, cd?.thayDoi);
    check('sửa trực tiếp đúng mã trong đề xuất cũng được',
      (await sua({ 'vuot-troi': 'Làm rất vững' })).status === 200);
    cd = await choDuyet();
    const t = thayDoiCua(cd, 'vuot-troi');
    check('đề xuất vẫn chờ, gắn cờ đã đổi từ lúc gửi',
      cd?.id === g.data?.id && t?.daDoiTuLucGui === true && t?.dangDung === 'Làm rất vững'
        && t?.nen === 'Vượt trội' && t?.deXuat === 'Tự làm thành thạo', t);
    const r = await xem(QT, g.data?.id, 'da-duyet');
    check('đồng ý (200)', r.status === 200, r);
    const n = await nhanCu();
    check('mã được đề xuất mang chữ đề xuất', n['vuot-troi'] === 'Tự làm thành thạo', n);
    check('phần sửa trực tiếp ở mã khác KHÔNG bị đè', n['da-vung'] === 'Làm được rồi', n);
  }

  // =========================================================================
  console.log('\n[9] Người gác đứng cả ở đường duyệt');
  {
    const truoc = await nhanCu();
    chenThang({ id: 'ndgdx_kha', nhan: JSON.stringify({ 'da-vung': 'Khá' }), nen: JSON.stringify({ 'da-vung': 'Làm được rồi' }), coDeXuat: idCs2 });
    const r = await xem(QT, 'ndgdx_kha', 'da-duyet');
    check('đồng ý một đề xuất chứa chữ cấm: 400', r.status === 400 && r.data?.ma === 'da-vung', r);
    check('bộ chữ không đổi', JSON.stringify(await nhanCu()) === JSON.stringify(truoc));
    check('đề xuất vẫn chờ', (await choDuyet())?.id === 'ndgdx_kha');
    check('chưa đồng ý thì được', (await xem(QT, 'ndgdx_kha', 'tu-choi', 'Chữ này xếp loại bé')).status === 200);
  }

  // =========================================================================
  console.log('\n[10] Dòng hỏng không làm sập màn hình');
  {
    chenThang({ id: 'ndgdx_hong', nhan: 'không phải json', nen: 'cũng hỏng', coDeXuat: idCs2 });
    const r = await docDx(QT);
    check('GET không trả 500', r.status === 200, r.status);
    check('thayDoi rỗng', r.data?.choDuyet?.id === 'ndgdx_hong' && (r.data?.choDuyet?.thayDoi || []).length === 0, r.data?.choDuyet);
    check('người gửi xem cũng không nổ', (await docDx(CS2)).status === 200);
    const d = await xem(QT, 'ndgdx_hong', 'da-duyet');
    check('đồng ý: 400 "không còn chữ nào để áp"', d.status === 400 && /không còn chữ nào/.test(d.data?.error || ''), d);
    check('dọn: chưa đồng ý thì được', (await xem(QT, 'ndgdx_hong', 'tu-choi', 'Dòng hỏng')).status === 200);
  }

  // =========================================================================
  console.log('\n[11] Rút đề xuất');
  {
    const g = await gui(CS2, { 'chua-day': 'Chưa học tới' });
    check('quản lý cơ sở 2 gửi', g.status === 201, g);
    check('quản lý cơ sở 1 rút đề xuất của người khác: 403', (await rut(CS1, g.data?.id)).status === 403);
    check('ban giám hiệu rút đề xuất của người khác: 403', (await rut(QT, g.data?.id)).status === 403);
    check('mã không có: 404', (await rut(CS2, 'ndgdx_khong_co')).status === 404);
    const r = await rut(CS2, g.data?.id);
    check('người gửi rút được', r.status === 200, r);
    check('không còn đề xuất chờ', (await choDuyet()) === null);
    const muc = ((await docDx(CS2)).data?.ganDay || []).find(x => x.id === g.data?.id);
    check('lịch sử ghi da-rut', muc?.trangThai === 'da-rut', muc);
    const g1 = await gui(CS1, { 'chua-day': 'Chưa học tới' });
    check('sau đó quản lý cơ sở 1 gửi được', g1.status === 201, g1);
    check('rút một đề xuất không còn chờ: 400', (await rut(CS2, g.data?.id)).status === 400);
    check('dọn: quản lý cơ sở 1 rút đề xuất của mình', (await rut(CS1, g1.data?.id)).status === 200);
    check('nhật ký có mã rút', cacMaAudit().includes('nhan-danh-gia-rut'));
    check('bộ chữ không đổi vì rút', (await nhanCu())['chua-day'] === 'Chưa dạy');
  }

  // =========================================================================
  console.log('\n[12] Phép thử ngược cho chỉ mục "một đề xuất chờ"');
  {
    check('không còn đề xuất chờ trước phép thử', (await choDuyet()) === null);
    chenThang({ id: 'ndgdx_mot', nhan: '{}', coDeXuat: idCs2 });
    let loi = null;
    try { chenThang({ id: 'ndgdx_hai', nhan: '{}', coDeXuat: idCs2 }); } catch (e) { loi = e; }
    check('dòng chờ thứ hai bị cơ sở dữ liệu từ chối', !!loi && /UNIQUE/i.test(loi.message), loi && loi.message);
    let loi2 = null;
    try {
      chenThang({ id: 'ndgdx_ba', nhan: '{}', coDeXuat: idCs2, trangThai: 'tu-choi' });
      chenThang({ id: 'ndgdx_bon', nhan: '{}', coDeXuat: idCs2, trangThai: 'tu-choi' });
    } catch (e) { loi2 = e; }
    check('ĐỐI CHỨNG: hai dòng đã khép thì không vướng chỉ mục', loi2 === null, loi2 && loi2.message);
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Đề xuất đổi bộ chữ đánh giá: quản lý cơ sở gửi, ban giám hiệu quyết');
