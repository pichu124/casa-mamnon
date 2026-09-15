// Bài canh NHẮN TIN VỚI LỚP VÀ VỚI VĂN PHÒNG (Đ151).
//
// Chạy bằng:  npm run test:nhan-tin-kenh
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"giao diện phụ huynh phải nhắn tin với LỚP và nhắn tin với
// VĂN PHÒNG, chứ mình cũng k muốn là nhắn tin với từng cô riêng lẻ"*, và
// *"đón thay một lần thì PH sẽ nhắn tin với văn phòng để thông báo"*.
//
// BỐN ĐIỀU DỄ LÀM SAI, canh ở [2] [3] [4] [6]
//
//   1. "NHẮN VỚI LỚP" KHÔNG PHẢI MỘT PHÒNG CHUNG CẢ LỚP. Đây là chỗ dễ đọc
//      nhầm nhất của cả đợt. Chuyện nhà một bé — con sốt, bố mẹ ly thân, xin
//      đón sớm — mà hiện trước mặt mười chín nhà khác là hỏng lòng tin không
//      lấy lại được. Mục [3] cho hai gia đình cùng nhóm nhắn rồi kiểm rằng
//      không nhà nào đọc được của nhà kia.
//   2. CÔ MỚI VỀ NHÓM PHẢI ĐỌC ĐƯỢC NGAY, cô đã chuyển đi thì thôi. Quyền vào
//      kênh tính LẠI mỗi lần hỏi, không đọc một danh sách chép sẵn — mục [4].
//   3. CÔ VÀ VĂN PHÒNG LÀ HAI ĐƯỜNG RIÊNG. Gia đình chọn nói với ai thì chỉ
//      bên đó đọc được — mục [2] và [4].
//   4. HỘI THOẠI RIÊNG ĐÃ CÓ THÌ GIỮ NGUYÊN. Nguyên tắc số 1: bỏ một lối đi là
//      thôi mời người ta đi lối đó, KHÔNG phải xoá những gì đã nói — mục [6].
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-tin-kenh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4649), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
const QL2 = await vao('quanly2', mkCS2);
const GV = (await login('giaovien', '123456')).cookie;
const GV2 = (await login('giaovien2', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const ds = async (cookie) => (await req('GET', '/api/messages', { cookie })).data;
const mo = (cookie, kenh, studentId) => req('POST', '/api/messages/start', { cookie, body: { kenh, studentId } });
const gui = (cookie, id, text) => req('POST', `/api/messages/${id}`, { cookie, body: { text } });
const doc = (cookie, id) => req('GET', `/api/messages/${id}`, { cookie });

// Bé nào là con của tài khoản phụ huynh mẫu, và bé đó ở nhóm nào.
const conn0 = new Database(path.join(DIR, 'school.db'));
const BE = conn0.prepare(
  `SELECT s.id AS id, s.name AS name, s.classId AS classId
     FROM students s JOIN student_parents sp ON sp.studentId = s.id
     JOIN users u ON u.id = sp.parentId
    WHERE u.username = 'phuhuynh' AND s.active = 1 LIMIT 1`).get();
conn0.close();

// ===========================================================================
console.log('\n[1] Gia đình được mời ĐÚNG BA ĐẦU MỐI, không hơn không kém');
{
  const d = await ds(PH);
  const lh = d.contacts || [];
  check('đối chứng — tìm được bé của tài khoản gia đình mẫu', !!BE, BE);
  check('danh sách liên hệ KHÔNG còn tên cô nào để bấm vào',
    lh.every(c => !c.userId), lh.map(c => c.name));
  check('mỗi liên hệ là một KÊNH, kèm mã bé', lh.every(c => c.kenh && c.studentId), lh[0]);
  // BA ĐẦU MỐI, THEO LỜI TRƯỜNG NGÀY 15/09 (Đ188, Câu 11): *"Khi ở giao diện
  // của Phụ huynh tôi chỉ muốn hiện lên 3 ng để PH có thể nhắn tin tới: Giáo
  // viên chủ nhiệm, GV nước ngoài, văn phòng Nhà trường"*.
  //
  // Trước đợt này gia đình thấy hai dòng: "Nhóm lớp Chồi 2" và "Văn phòng".
  // Một dòng mang tên NHÓM thì không phân biệt được cô chủ nhiệm với cô nước
  // ngoài — mà đó đúng là thứ trường cần tách ra.
  check('có dòng cho cô phụ trách nhóm',
    lh.some(c => c.kenh === 'nhom' && c.name === 'Cô phụ trách nhóm'), lh.map(c => c.name));
  check('có dòng cho cô nước ngoài',
    lh.some(c => c.kenh === 'nuoc-ngoai' && c.name === 'Cô nước ngoài'), lh.map(c => c.name));
  check('và dòng "Văn phòng nhà trường"',
    lh.some(c => c.kenh === 'vanphong' && c.name === 'Văn phòng nhà trường'), lh.map(c => c.name));
  // CÔ THỂ CHẤT KHÔNG PHẢI MỘT ĐẦU MỐI NHẮN TIN. Trường liệt kê ba nhóm cô ở
  // phía nhà trường nhưng chỉ ba đầu mối ở phía gia đình, và một trong ba là
  // văn phòng. Dựng hai danh sách ấy thành một là sai cả hai.
  check('KHÔNG có đầu mối nào cho cô thể chất',
    !lh.some(c => c.kenh === 'the-chat' || /thể chất/i.test(c.name || '')), lh.map(c => c.name));

  const soCon = new Set(lh.map(c => c.studentId)).size;
  check('đối chứng — nhà này có ít nhất một con đang học', soCon >= 1, soCon);
  check('mỗi bé ĐÚNG BA dòng, không hơn', lh.length === soCon * 3, { soCon, dong: lh.length });
  check('và mỗi bé có đủ cả ba loại kênh',
    [...new Set(lh.map(c => c.studentId))].every(id =>
      ['nhom', 'nuoc-ngoai', 'vanphong'].every(k => lh.some(c => c.studentId === id && c.kenh === k))),
    lh.map(c => `${c.studentId}:${c.kenh}`));
}

// ===========================================================================
console.log('\n[2] Nhắn với NHÓM: cô đọc được, văn phòng thì không');
let KENH_NHOM;
{
  const r = await mo(PH, 'nhom', BE.id);
  check('gia đình mở được kênh nhóm lớp', r.status === 200 && !!r.data.id, r.data);
  KENH_NHOM = r.data.id;
  const lai = await mo(PH, 'nhom', BE.id);
  check('mở lần hai KHÔNG đẻ thêm cuộc mới', lai.data.id === KENH_NHOM, lai.data);

  check('gửi được tin', (await gui(PH, KENH_NHOM, 'Cô ơi hôm nay con hơi ho ạ')).status === 200);

  const coDoc = await doc(GV, KENH_NHOM);
  check('CÔ PHỤ TRÁCH đọc được, dù chưa từng mở cuộc này',
    coDoc.status === 200 && (coDoc.data.messages || []).some(m => /hơi ho/.test(m.text)), coDoc.status);
  check('và cô thấy tiêu đề là GIA ĐÌNH BÉ — cô đang nói với một nhà',
    /^Gia đình bé /.test(coDoc.data.title || ''), coDoc.data.title);

  const phDoc = await doc(PH, KENH_NHOM);
  check('gia đình thấy tiêu đề là TÊN ĐẦU MỐI, không phải tên nhóm lớp',
    phDoc.data.title === 'Cô phụ trách nhóm', phDoc.data.title);
  check('và dòng phụ vẫn nói rõ đang nói về bé nào, ở nhóm nào',
    /Về bé /.test(phDoc.data.subtitle || ''), phDoc.data.subtitle);

  const vpDoc = await doc(QT, KENH_NHOM);
  check('VĂN PHÒNG KHÔNG đọc được cuộc gia đình nói với cô', vpDoc.status === 403, vpDoc.status);
}

// ===========================================================================
console.log('\n[3] "Nhắn với lớp" KHÔNG phải phòng chung — nhà này không đọc được của nhà kia');
{
  const conn = new Database(path.join(DIR, 'school.db'));
  const beKhac = conn.prepare(
    `SELECT s.id AS id, sp.parentId AS parentId, u.username AS username
       FROM students s JOIN student_parents sp ON sp.studentId = s.id
       JOIN users u ON u.id = sp.parentId
      WHERE s.classId = ? AND s.id != ? AND s.active = 1 LIMIT 1`).get(BE.classId, BE.id);
  conn.close();
  check('đối chứng — nhóm có bé thứ hai của một nhà khác', !!beKhac, beKhac);

  if (beKhac) {
    const PH2 = (await login(beKhac.username, '123456')).cookie;
    const r2 = await mo(PH2, 'nhom', beKhac.id);
    check('nhà thứ hai mở được kênh của riêng mình', r2.status === 200, r2.data);
    check('VÀ ĐÓ LÀ MỘT CUỘC KHÁC, không phải phòng chung', r2.data.id !== KENH_NHOM, r2.data.id);
    await gui(PH2, r2.data.id, 'Nhà con xin phép đón sớm');

    const lenNhau = await doc(PH2, KENH_NHOM);
    check('NHÀ KIA KHÔNG ĐỌC ĐƯỢC cuộc của nhà này', lenNhau.status === 403, lenNhau.status);
    const nguocLai = await doc(PH, r2.data.id);
    check('và ngược lại cũng không', nguocLai.status === 403, nguocLai.status);

    const coDoc2 = await doc(GV, r2.data.id);
    check('nhưng CÔ đọc được cả hai — đó mới là "nhắn với lớp"', coDoc2.status === 200, coDoc2.status);
  }
}

// ===========================================================================
console.log('\n[4] Nhắn với VĂN PHÒNG: văn phòng đọc được, cô thì không');
let KENH_VP;
{
  const r = await mo(PH, 'vanphong', BE.id);
  check('gia đình mở được kênh văn phòng', r.status === 200 && !!r.data.id, r.data);
  KENH_VP = r.data.id;
  check('kênh văn phòng KHÁC kênh nhóm lớp', KENH_VP !== KENH_NHOM, { KENH_VP, KENH_NHOM });
  await gui(PH, KENH_VP, 'Chiều nay bà ngoại đón cháu giúp ạ');

  const vpDoc = await doc(QT, KENH_VP);
  check('VĂN PHÒNG đọc được', vpDoc.status === 200
    && (vpDoc.data.messages || []).some(m => /bà ngoại/.test(m.text)), vpDoc.status);
  const coDoc = await doc(GV, KENH_VP);
  check('CÔ KHÔNG đọc được cuộc gia đình nói riêng với văn phòng', coDoc.status === 403, coDoc.status);

  const co2 = await doc(GV2, KENH_NHOM);
  check('CÔ NHÓM KHÁC cũng không đọc được kênh nhóm này', co2.status === 403, co2.status);
  const vp2 = await doc(QL2, KENH_VP);
  check('QUẢN LÝ CƠ SỞ KHÁC cũng không đọc được kênh văn phòng này', vp2.status === 403, vp2.status);
}

// ===========================================================================
console.log('\n[5] Kênh hiện trong danh sách của cả hai bên, kèm tin chưa đọc');
{
  // Cô ĐÃ mở cuộc này ở mục [2], nên lúc đó số tin chưa đọc về 0 — đúng. Gửi
  // một tin mới rồi mới đo, nếu không mục này đo nhầm sang việc "đã đọc xong".
  await gui(PH, KENH_NHOM, 'Cô ơi cho con hỏi thêm một câu ạ');
  const dCo = await ds(GV);
  const cCo = (dCo.conversations || []).find(c => c.id === KENH_NHOM);
  check('cuộc hiện trong danh sách của CÔ mà cô không phải mở trước', !!cCo, (dCo.conversations || []).map(c => c.title));
  check('và tin gia đình vừa gửi được đếm là CHƯA ĐỌC', cCo && cCo.unreadCount >= 1, cCo && cCo.unreadCount);
  check('danh sách của cô là các GIA ĐÌNH, không phải các cô',
    (dCo.contacts || []).every(c => c.kenh === 'nhom'), (dCo.contacts || [])[0]);

  const dVP = await ds(QT);
  check('cuộc văn phòng hiện trong danh sách của VĂN PHÒNG',
    (dVP.conversations || []).some(c => c.id === KENH_VP), (dVP.conversations || []).map(c => c.title));
  check('VĂN PHÒNG KHÔNG được mời mở cuộc mới — văn phòng trả lời, còn nói với cả trường thì có Thông báo',
    (dVP.contacts || []).length === 0, dVP.contacts);
  check('và văn phòng KHÔNG thấy kênh nhóm lớp trong danh sách',
    !(dVP.conversations || []).some(c => c.id === KENH_NHOM), (dVP.conversations || []).map(c => c.id));
}

// ===========================================================================
console.log('\n[6] KHÔNG mở được cuộc riêng mới — nhưng cuộc riêng CŨ vẫn nguyên');
{
  const conn = new Database(path.join(DIR, 'school.db'));
  const cu = conn.prepare("SELECT id FROM conversations WHERE type = 'direct' LIMIT 1").get();
  let coTinCu = null;
  if (cu) {
    coTinCu = conn.prepare('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?').get(cu.id);
  }
  conn.close();
  check('đối chứng — dữ liệu mẫu có cuộc riêng cũ', !!cu, cu);

  const theoLoiCu = await req('POST', '/api/messages/start', { cookie: PH, body: { userId: 'u_t1' } });
  check('gọi theo lối CŨ (userId) thì bị từ chối', theoLoiCu.status === 400, theoLoiCu.status);
  check('và câu từ chối nói rõ nay nhắn với ai',
    /nhóm lớp|văn phòng/i.test(theoLoiCu.data?.error || ''), theoLoiCu.data?.error);

  if (cu) {
    const conn2 = new Database(path.join(DIR, 'school.db'));
    const ai = conn2.prepare(
      `SELECT u.username AS username FROM conversation_members cm
         JOIN users u ON u.id = cm.userId WHERE cm.conversationId = ? LIMIT 1`).get(cu.id);
    conn2.close();
    if (ai) {
      const ck = (await login(ai.username, '123456')).cookie;
      const r = await doc(ck, cu.id);
      check('CUỘC RIÊNG CŨ VẪN MỞ ĐƯỢC — không xoá gì của ai', r.status === 200, r.status);
      check('và tin cũ vẫn còn đủ',
        (r.data.messages || []).length === (coTinCu ? coTinCu.n : 0),
        { con: (r.data.messages || []).length, cu: coTinCu && coTinCu.n });
      check('vẫn nhắn tiếp được vào cuộc cũ', (await gui(ck, cu.id, 'Tin nối tiếp')).status === 200);
    }
  }
}

// ===========================================================================
console.log('\n[7] Trường nhắn thì GIA ĐÌNH được báo; gia đình nhắn thì không tự báo mình');
{
  const conn = new Database(path.join(DIR, 'school.db'));
  const truoc = conn.prepare("SELECT COUNT(*) AS n FROM thongbao_be WHERE loai = 'tin-nhan'").get().n;
  conn.close();

  await gui(GV, KENH_NHOM, 'Cô đã cho con uống nước ấm, gia đình yên tâm nhé');
  const conn2 = new Database(path.join(DIR, 'school.db'));
  const sauCo = conn2.prepare("SELECT * FROM thongbao_be WHERE loai = 'tin-nhan'").all();
  conn2.close();
  check('CÔ nhắn → sinh một tin riêng cho bé, để gia đình được báo ngay',
    sauCo.length === truoc + 1, { truoc, sau: sauCo.length });
  const tin = sauCo[sauCo.length - 1];
  check('tin ấy gắn đúng bé', tin && tin.studentId === BE.id, tin && tin.studentId);
  check('và chỉ đường về đúng cuộc trò chuyện', tin && tin.hash === `#/messages/${KENH_NHOM}`, tin && tin.hash);

  await gui(PH, KENH_NHOM, 'Dạ em cảm ơn cô');
  const conn3 = new Database(path.join(DIR, 'school.db'));
  const sauPH = conn3.prepare("SELECT COUNT(*) AS n FROM thongbao_be WHERE loai = 'tin-nhan'").get().n;
  conn3.close();
  check('GIA ĐÌNH nhắn → KHÔNG sinh tin báo (báo cho chính họ là vô nghĩa)',
    sauPH === sauCo.length, { sauCo: sauCo.length, sauPH });
}

// ===========================================================================
console.log('\n[8] Màn Đón trả bé: gỡ phần khai người đón, GIỮ nguyên đường API và dữ liệu');
{
  const v = fs.readFileSync(path.join(GOC, 'modules/dontra/view.js'), 'utf8');
  check('màn của gia đình không còn nút "Thêm người được đón"', !/id="dt-them"/.test(v));
  check('cũng không còn nút "Uỷ quyền một lần"', !/id="dt-uy"/.test(v));
  check('mà chỉ đường sang nhắn tin với văn phòng — đúng cách trường nói sẽ làm',
    /dt-nhan-vp/.test(v) && /Nhắn cho văn phòng nhà trường/.test(v));

  // GIỮ NGUYÊN DỮ LIỆU: đây là bước 2 của "Bỏ một tính năng" trong CLAUDE.md.
  const r = fs.readFileSync(path.join(GOC, 'modules/dontra/routes.js'), 'utf8');
  check('đường API khai người đón VẪN CÒN — gỡ lối vào, không gỡ dữ liệu',
    /\/api\/dontra\/nguoi/.test(r) && /\/api\/dontra\/uyquyen/.test(r));
  const sc = fs.readFileSync(path.join(GOC, 'modules/dontra/schema.sql'), 'utf8');
  check('và bảng dữ liệu của chúng cũng vậy', /CREATE TABLE IF NOT EXISTS dontra_/.test(sc));

  const con = await req('GET', `/api/dontra?studentId=${encodeURIComponent(BE.id)}`, { cookie: PH });
  check('gia đình vẫn đọc được sổ đón trả của con', con.status === 200, con.status);
  check('và sổ ấy vẫn là sổ cũ, không mất trường nào', Array.isArray(con.data.soGanDay), Object.keys(con.data || {}));
}

// ===========================================================================
console.log('\n[9] BA NHÓM CÔ — vai quyết định cô đọc được kênh nào (Đ188, Câu 11)');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Nhà trường chia cô ở cấp cơ sở thành ba vai: chủ nhiệm (Montessori), nước
  // ngoài (Cambridge), thể chất (P.E). Trước đợt này MỌI cô của một nhóm đều
  // đọc được cuộc gia đình nhắn với "nhóm lớp" — nên khai vai mà không siết
  // quyền đọc thì cái nhãn chỉ để trang trí, và cô nước ngoài vẫn đọc trọn
  // cuộc gia đình nói riêng với cô chủ nhiệm.
  //
  // Dữ liệu mẫu cho mỗi nhóm đúng MỘT cô, nên mục này tự thêm cô thứ hai vào
  // nhóm của bé — đúng mô hình nhiều cô một nhóm mà trường mầm non cần.
  const capNhat = (body) => req('PUT', `/api/admin/classes/${BE.classId}/teachers`, { cookie: QT, body });
  const conn = new Database(path.join(DIR, 'school.db'));
  const CO_CN = conn.prepare('SELECT teacherId FROM class_teachers WHERE classId = ?').get(BE.classId)?.teacherId;
  const CO_NN = conn.prepare("SELECT id FROM users WHERE username = 'giaovien2'").get()?.id;
  conn.close();
  check('đối chứng — tìm được cô đang phụ trách nhóm của bé', !!CO_CN, CO_CN);
  check('đối chứng — và một cô thứ hai để giao vai nước ngoài', !!CO_NN && CO_NN !== CO_CN, { CO_CN, CO_NN });

  // CHIỀU QUAN TRỌNG NHẤT ĐỨNG TRƯỚC: thêm cô vào nhóm mà CHƯA khai vai thì
  // mọi cô là chủ nhiệm, tức app chạy y hệt như trước khi có Đ188.
  const them = await capNhat({ teacherIds: [CO_CN, CO_NN] });
  check('thêm được cô thứ hai vào nhóm', them.status === 200, them.data);
  check('CHƯA KHAI VAI THÌ MỌI CÔ LÀ CHỦ NHIỆM — app chạy y như trước',
    (them.data?.teachers || []).every(t => t.nhomCo === 'chu-nhiem'),
    (them.data?.teachers || []).map(t => `${t.id}:${t.nhomCo}`));
  const truocKhiKhai = await doc(GV2, KENH_NHOM);
  check('nên cô mới thêm đọc được kênh nhóm như cô cũ', truocKhiKhai.status === 200, truocKhiKhai.status);

  const dat = await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { [CO_NN]: 'nuoc-ngoai' } });
  check('khai được vai nước ngoài cho cô thứ hai', dat.status === 200, dat.data);
  check('và đọc lại ra đúng vai vừa khai', dat.data?.nhom?.[CO_NN] === 'nuoc-ngoai', dat.data?.nhom);

  const vaiLa = await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { [CO_NN]: 'lao-cong' } });
  check('vai lạ thì từ chối, và nói bằng tiếng của trường',
    vaiLa.status === 400 && /chủ nhiệm|nước ngoài|thể chất/.test(vaiLa.data?.error || ''), vaiLa.data);
  const ngoaiNhom = await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { 'khong-co-that': 'nuoc-ngoai' } });
  check('khai vai cho người KHÔNG ở trong nhóm thì từ chối', ngoaiNhom.status === 400, ngoaiNhom.data);

  // ĐÂY LÀ CHỐT THẬT, và nó là một cái siết chứ không phải một cái nhãn: vừa
  // khai vai xong, cô nước ngoài MẤT quyền đọc cuộc của cô chủ nhiệm — quyền
  // tính lại mỗi lần hỏi, không ai phải bấm gì.
  const cheo = await doc(GV2, KENH_NHOM);
  check('KHAI VAI XONG, cô nước ngoài KHÔNG còn đọc được cuộc của cô chủ nhiệm',
    cheo.status === 403, cheo.status);

  const rNN = await mo(PH, 'nuoc-ngoai', BE.id);
  check('gia đình mở được kênh với cô nước ngoài', rNN.status === 200 && !!rNN.data.id, rNN.data);
  const KENH_NN = rNN.data.id;
  check('gửi được tin vào kênh ấy',
    (await gui(PH, KENH_NN, 'Teacher ơi con nhà em học Cambridge thế nào ạ')).status === 200);

  const docNN = await doc(GV2, KENH_NN);
  check('CÔ NƯỚC NGOÀI ĐỌC ĐƯỢC kênh của mình, dù chưa từng mở cuộc này',
    docNN.status === 200 && (docNN.data.messages || []).some(m => /Cambridge/.test(m.text)), docNN.status);
  check('và cô thấy rõ mình đang đứng ở vai nào',
    /nước ngoài/i.test(docNN.data.subtitle || ''), docNN.data.subtitle);
  const cheoNguoc = await doc(GV, KENH_NN);
  check('CÔ CHỦ NHIỆM KHÔNG đọc được cuộc của cô nước ngoài', cheoNguoc.status === 403, cheoNguoc.status);
  const vpNN = await doc(QT, KENH_NN);
  check('văn phòng cũng KHÔNG đọc được — kênh của cô vẫn là kênh của cô', vpNN.status === 403, vpNN.status);

  // Cô thể chất: có vai, nhưng KHÔNG có đầu mối nhắn tin nào. Trường liệt kê
  // ba nhóm cô ở phía nhà trường và ba đầu mối ở phía gia đình, nhưng hai danh
  // sách ấy KHÔNG trùng nhau — cô P.E nằm ở danh sách đầu, không nằm ở danh
  // sách sau. Đây đúng chỗ dễ dựng hai danh sách thành một rồi sai cả hai.
  await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { [CO_NN]: 'the-chat' } });
  const lhTC = ((await ds(GV2)).contacts || []).filter(c => c.studentId === BE.id);
  check('CÔ THỂ CHẤT KHÔNG có đầu mối nhắn tin nào với bé của nhóm đó',
    lhTC.length === 0, lhTC.map(c => `${c.studentId}:${c.kenh}`));
  check('và mất luôn quyền đọc kênh nước ngoài vừa nãy',
    (await doc(GV2, KENH_NN)).status === 403);

  // Trả vai về chủ nhiệm: đọc lại được ngay.
  await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { [CO_NN]: 'chu-nhiem' } });
  check('trả vai về chủ nhiệm thì cô đọc lại được kênh nhóm ngay',
    (await doc(GV2, KENH_NHOM)).status === 200);

  // Cô rời nhóm thì dòng khai vai đi theo — không dọn thì cô quay lại sẽ mang
  // theo vai cũ mà không ai bấm gì.
  await capNhat({ teacherIds: [CO_CN, CO_NN], nhom: { [CO_NN]: 'the-chat' } });
  await capNhat({ teacherIds: [CO_CN] });
  const quayLai = await capNhat({ teacherIds: [CO_CN, CO_NN] });
  check('CÔ RỜI NHÓM RỒI QUAY LẠI thì KHÔNG mang theo vai cũ',
    quayLai.data?.nhom?.[CO_NN] === undefined, quayLai.data?.nhom);

  await capNhat({ teacherIds: [CO_CN] });
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Nhắn tin với lớp và với văn phòng');
