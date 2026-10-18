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
//
// GÓP Ý 16/10, MỤC PH1 — PHƯƠNG ÁN A (Đ239m), canh ở [11]–[20]
//
//   Văn phòng là MỘT mục cho mỗi cơ sở có con học, không "Về bé…". Mỗi TÀI
//   KHOẢN phụ huynh × cơ sở một hộp thư riêng: phía gia đình chỉ có đúng một
//   người đọc, nên hai kiểu rò tin đã bắt được ở Đ239g (bố mẹ riêng — [13];
//   phụ huynh được gắn thêm sau — [15]) không còn chỗ để xảy ra.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu, ganPhuHuynh, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-tin-kenh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin', 'dontra']);   // Đón trả mặc định TẮT từ góp ý 06/10 mục 2 — mục [8] cần nó bật
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');
// Văn phòng cơ sở 1 — cùng Cấp 3 với quản lý cơ sở nhưng KHÁC quyền, đúng
// điều nhà trường xác nhận ở Câu 3. Có mặt ở đây để đo rằng kho lưu hội thoại
// đã đóng KHÔNG mở cho văn phòng.
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');

// GÓP Ý 16/10, MỤC PH1 — dựng cho [11]–[20], TRƯỚC khi máy chủ chạy.
//
// Văn phòng KHOÁ VÀO TỪNG CƠ SỞ: hộp thư của gia đình phải tới đúng văn phòng
// của cơ sở có con học, không lọt sang cơ sở kia.
const mkVPcs1 = taoQuanTri(DIR, 'Văn phòng khoá CS1', 'vpcs1');
datChucVu(DIR, 'vpcs1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vpcs1', 'cs1');
const mkVPcs2 = taoQuanTri(DIR, 'Văn phòng khoá CS2', 'vpcs2');
datChucVu(DIR, 'vpcs2', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vpcs2', 'cs2');
{
  const c = new Database(path.join(DIR, 'school.db'));
  const luc = (soNgay) => new Date(Date.now() - soNgay * 864e5).toISOString();
  const nam = Number(HOM_NAY().slice(0, 4));
  // Kênh văn phòng CŨ theo từng bé, đúng hình dạng mã trước Đ239m đã ghi.
  const kenhVPCu = (ma, be, nguoi, chu, tao) => {
    c.prepare("INSERT INTO conversations (id, type, name, classId) VALUES (?, 'kenh', NULL, NULL)").run(ma);
    c.prepare(`INSERT INTO kenh_hoi_thoai (conversationId, loai, studentId, classId, taoLuc)
               VALUES (?, 'vanphong', ?, '', ?)`).run(ma, be, tao);
    for (const u of nguoi) {
      c.prepare('INSERT INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, NULL)')
        .run(ma, u);
    }
    c.prepare('INSERT INTO messages (id, conversationId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(`ms_${ma}`, ma, nguoi[0], chu, tao);
  };
  const themBe = (id, ten, tuoi, gioi, lop) => c.prepare(
    `INSERT INTO students (id, name, dob, gender, classId, active, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)`)
    .run(id, ten, `${nam - tuoi}-06-01`, gioi, lop, luc(60));
  const matKhauMau = c.prepare("SELECT passwordHash FROM users WHERE id = 'p1'").get().passwordHash;
  const themPH = (id, tenDN, ten, xung) => c.prepare(
    `INSERT INTO users (id, username, passwordHash, role, name, title, createdAt)
     VALUES (?, ?, ?, 'parent', ?, ?, ?)`).run(id, tenDN, matKhauMau, ten, xung, luc(60));
  const ganPH = c.prepare('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)');

  // [11] Nhà anh Tuấn (p3) có hai con cùng cơ sở 1 — s4 (Chồi 2), s8 (Lá 1) —
  // và ĐÃ nhắn văn phòng theo từng bé từ trước đợt này.
  kenhVPCu('cv_vp_cu_s4', 's4', ['p3'], 'Tuần sau bé xin nghỉ hai hôm ạ', luc(5));
  kenhVPCu('cv_vp_cu_s8', 's8', ['p3'], 'Gia đình xin giấy xác nhận đang học cho bé ạ', luc(3));
  // [12] Nhà anh Bảo (p2): bé s3 học Chồi 2 ở cơ sở 1; thêm một bé ở Mầm 1 — cơ sở 2.
  themBe('s_cs2', 'Phạm Gia Khang', 3, 'Nam', 'c3');
  // [13] BỐ MẸ RIÊNG: bé s0_chung là con của CẢ chị Lan (p4) lẫn anh Minh (p5);
  // chị Lan còn bé s5, anh Minh còn bé s6, cả ba cùng cơ sở 1. Mã bé chung đứng
  // đầu theo thứ tự — đúng ca đã làm rò tin ở Đ239g.
  themBe('s0_chung', 'Hoàng Minh Khuê', 5, 'Nữ', 'c2');
  ganPH.run('s0_chung', 'p4');
  ganPH.run('s0_chung', 'p5');
  // [14] Nhà thường có cả bố lẫn mẹ: anh Duy (p8) và chị Nga (p9) cùng gắn với cả
  // hai bé s10, s11.
  ganPH.run('s10', 'p9');
  ganPH.run('s11', 'p8');
  // [15] Chị Hương (p6) là phụ huynh DUY NHẤT của s7 và s7b (cùng cơ sở 1), và
  // đã có một kênh văn phòng cũ trên s7 — giả lập đúng mục gộp của Đ239g — trong
  // đó chị kể chuyện riêng của s7b.
  themBe('s7b', 'Bùi Minh Châu', 4, 'Nữ', 'c2');
  ganPH.run('s7b', 'p6');
  kenhVPCu('cv_vp_gop_s7', 's7', ['p6'], 'Văn phòng ơi, chuyện riêng s7b: bé Châu đang điều trị tâm lý ạ', luc(6));
  // [17] Ba phụ huynh của MỘT bé.
  themBe('s_ba', 'Đặng Gia Linh', 4, 'Nữ', 'c1');
  for (const [id, tenDN, ten, xung] of [
    ['p_ba1', 'ph.ba1', 'Đặng Văn Hùng', 'Anh'],
    ['p_ba2', 'ph.ba2', 'Mai Thị Hoa', 'Chị'],
    ['p_ba3', 'ph.ba3', 'Đặng Thị Lụa', 'Bà'],
  ]) { themPH(id, tenDN, ten, xung); ganPH.run('s_ba', id); }
  // [18] Một nhà có đúng một con, rồi con nghỉ học.
  themBe('s_nghi', 'Lâm Gia Phúc', 5, 'Nam', 'c2');
  themPH('p_nghi', 'ph.nghi', 'Lâm Thị Thảo', 'Chị');
  ganPH.run('s_nghi', 'p_nghi');
  c.close();
}
ganPhuHuynh(DIR, 's_cs2', 'p2');

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
const VP = await vao('vanphong1', mkVP);
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
// Mọi con của nhà ấy, theo mã — mục văn phòng gắn với bé có mã nhỏ nhất.
const CON_PH = conn0.prepare(
  `SELECT s.id AS id, s.name AS name FROM students s
     JOIN student_parents sp ON sp.studentId = s.id
     JOIN users u ON u.id = sp.parentId
    WHERE u.username = 'phuhuynh' AND s.active = 1 ORDER BY s.id`).all();
const TEN = {};
for (const r of conn0.prepare('SELECT id, name FROM students').all()) TEN[r.id] = r.name;
for (const r of conn0.prepare("SELECT username, name FROM users WHERE role = 'parent'").all()) TEN[r.username] = r.name;
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

  // GÓP Ý 16/10, MỤC PH1: *"không cần tách ra Văn phòng nhà trường về bé này bé
  // kia, chỉ cần ghi Nhắn tin với văn phòng nhà trường"*. Vẫn ba đầu mối, nhưng
  // văn phòng là MỘT cho mỗi cơ sở có con học — hai dòng cô mỗi bé, cộng một
  // dòng văn phòng (nhà mẫu: hai con, cùng cơ sở 1).
  const dongCo = lh.filter(c => c.kenh !== 'vanphong');
  const dongVP = lh.filter(c => c.kenh === 'vanphong');
  const soCon = new Set(dongCo.map(c => c.studentId)).size;
  check('đối chứng — nhà mẫu có HAI con', CON_PH.length === 2 && soCon === 2, { CON_PH, soCon });
  check('mỗi bé ĐÚNG HAI dòng cô, không hơn', dongCo.length === soCon * 2, { soCon, dong: dongCo.length });
  check('và mỗi bé có đủ cả hai kênh cô',
    CON_PH.every(b => ['nhom', 'nuoc-ngoai'].every(k => dongCo.some(c => c.studentId === b.id && c.kenh === k))),
    dongCo.map(c => `${c.studentId}:${c.kenh}`));
  check('cả nhà ĐÚNG MỘT dòng "Văn phòng nhà trường" — không tách theo từng bé',
    dongVP.length === 1, dongVP);
  check('dòng ấy KHÔNG còn "Về bé…" — các con cùng cơ sở thì không cần dòng phụ',
    dongVP.every(c => c.subtitle === ''), dongVP.map(c => c.subtitle));
  check('gắn với bé có mã nhỏ nhất ở cơ sở đó — lần nào cũng cùng một bé, chưa có cuộc nào',
    dongVP[0]?.studentId === CON_PH[0].id && !dongVP[0]?.existingConversationId, dongVP[0]);
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
  // Gia đình bỏ "Về bé…", nhưng phía văn phòng thì PHẢI biết đang nói với ai.
  // Từ Đ239m tên phụ huynh nằm ở TIÊU ĐỀ, các con ở dòng phụ.
  const nhanVP = `${vpDoc.data.title || ''} ${vpDoc.data.subtitle || ''}`;
  check('văn phòng thấy rõ đang nói với PHỤ HUYNH NÀO', nhanVP.includes(TEN.phuhuynh), nhanVP);
  check('và về CÁC CON NÀO của nhà ấy — cả hai bé, không chỉ bé gắn mục',
    CON_PH.every(b => nhanVP.includes(b.name)), nhanVP);
  const phDocVP = await doc(PH, KENH_VP);
  check('gia đình thấy "Văn phòng nhà trường", KHÔNG kèm "Về bé…"',
    phDocVP.data.title === 'Văn phòng nhà trường' && !/Về bé/.test(phDocVP.data.subtitle || ''),
    { title: phDocVP.data.title, subtitle: phDocVP.data.subtitle });
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

// ===========================================================================
console.log('\n[10] HỘI THOẠI ĐÃ ĐÓNG — mất khỏi màn gia đình, còn trong kho của quản lý (Đ192, Câu 5)');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Nhà trường chốt: xoá một cuộc là xoá khỏi màn hình phụ huynh, còn "giao
  // diện quản lý vẫn xem lại được". Hỏi rõ AI là quản lý, trường trả lời
  // 15/09: *"Quản lý cơ sở và cấp 1 có thể xem lại được -> chỉ xem lại được k
  // thể nhắn vào thêm được nữa"*.
  //
  // Đây là chỗ dễ phá chốt phân quyền nhất trong cả đợt: hôm nay quản trị
  // KHÔNG đọc được cuộc gia đình nhắn với cô, và mục [2] ở trên có một phép
  // kiểm chốt đúng điều đó. Mở một đường đọc mà không cẩn thận là nới chính
  // bài canh ấy — nên mục này đo cả hai chiều, và chiều KHÔNG ĐƯỢC ĐỌC đứng
  // trước.
  const KENH_MOI = (await mo(PH, 'nhom', BE.id)).data.id;
  await gui(PH, KENH_MOI, 'Chuyện riêng của nhà em với cô ạ');

  // CHIỀU MỘT: cuộc ĐANG SỐNG thì quản lý vẫn không đọc được, y như trước.
  check('CUỘC ĐANG SỐNG: ban giám hiệu vẫn KHÔNG đọc được — chốt cũ không bị nới',
    (await doc(QT, KENH_MOI)).status === 403);

  const dong = await req('POST', `/api/messages/${KENH_MOI}/dong`, {
    cookie: QT, body: { lyDo: 'Gia đình đã chuyển trường' },
  });
  check('ban giám hiệu đóng được cuộc trò chuyện', dong.status === 200, dong.data);

  // CHIỀU HAI: đóng rồi thì gia đình và cô mất hẳn đường vào.
  const phSau = await doc(PH, KENH_MOI);
  check('ĐÓNG RỒI: gia đình không mở được nữa', phSau.status === 404, phSau.status);
  check('và cô cũng không', (await doc(GV, KENH_MOI)).status === 404);
  const dsPH = await ds(PH);
  check('cuộc ấy biến khỏi danh sách của gia đình',
    !(dsPH.conversations || []).some(c => c.id === KENH_MOI),
    (dsPH.conversations || []).map(c => c.id));

  // CHIỀU BA: quản lý mở lại được, CHỈ ĐỌC.
  const qtSau = await doc(QT, KENH_MOI);
  check('BAN GIÁM HIỆU XEM LẠI ĐƯỢC, và đọc đủ nội dung cũ',
    qtSau.status === 200 && (qtSau.data.messages || []).some(m => /Chuyện riêng/.test(m.text)),
    qtSau.status);
  const viet = await gui(QT, KENH_MOI, 'thử nhắn thêm');
  check('nhưng KHÔNG nhắn thêm được — "chỉ xem lại được k thể nhắn vào thêm"',
    viet.status === 403, viet.status);
  check('câu từ chối nói rõ nội dung cũ vẫn được giữ',
    /giữ nguyên/.test(viet.data?.error || ''), viet.data);
  check('gia đình lại càng không nhắn thêm được', (await gui(PH, KENH_MOI, 'a')).status === 404);

  // KHÔNG XOÁ MỘT DÒNG TIN NÀO. Đây có thể là chỗ duy nhất còn lưu lời qua lại
  // giữa trường và một gia đình khi có khiếu nại.
  const conn2 = new Database(path.join(DIR, 'school.db'));
  const soTin = conn2.prepare('SELECT COUNT(*) c FROM messages WHERE conversationId = ?').get(KENH_MOI).c;
  conn2.close();
  check('ĐÓNG LÀ ĐÁNH DẤU, KHÔNG XOÁ — tin nhắn cũ còn nguyên dưới cơ sở dữ liệu',
    soTin >= 1, soTin);

  // CHIỀU BỐN: văn phòng cơ sở KHÔNG có đường này. Trường nói "quản lý cơ sở
  // và cấp 1"; văn phòng tuy cùng Cấp 3 nhưng khác quyền — đúng điều trường
  // xác nhận ở Câu 3.
  const kho = await req('GET', '/api/messages/da-dong', { cookie: QT });
  check('kho lưu liệt kê được cuộc vừa đóng',
    kho.status === 200 && (kho.data.ds || []).some(x => x.conversationId === KENH_MOI), kho.data);
  check('và kho ấy nói rõ ai đóng, đóng lúc nào, vì sao',
    (kho.data.ds || []).some(x => x.conversationId === KENH_MOI && x.dongLuc && x.dongBoiTen && /chuyển trường/i.test(x.lyDo)),
    (kho.data.ds || []).find(x => x.conversationId === KENH_MOI));
  // VĂN PHÒNG CƠ SỞ KHÔNG CÓ ĐƯỜNG NÀY. Trường nói "quản lý cơ sở và cấp 1";
  // văn phòng tuy cùng Cấp 3 nhưng khác quyền — chính điều trường xác nhận ở
  // Câu 3 ("Quản lý cơ sở sẽ có toàn quyền tại cơ sở, còn văn phòng chỉ trong
  // phạm vi cho phép"). Đây là chỗ dễ nới nhất vì hai vai cùng cấp.
  const vpKho = await req('GET', '/api/messages/da-dong', { cookie: VP });
  check('VĂN PHÒNG CƠ SỞ KHÔNG mở được kho lưu, dù cùng Cấp 3 với quản lý cơ sở',
    vpKho.status === 403, vpKho.status);
  check('và câu từ chối nói rõ ai mới xem được',
    /ban giám hiệu và quản lý cơ sở/i.test(vpKho.data?.error || ''), vpKho.data);
  check('văn phòng cũng KHÔNG đọc được nội dung cuộc đã đóng',
    (await doc(VP, KENH_MOI)).status === 404);
  check('và KHÔNG đóng được cuộc nào',
    (await req('POST', `/api/messages/${KENH_NHOM}/dong`, { cookie: VP })).status === 403);

  check('CÔ không mở được kho lưu', (await req('GET', '/api/messages/da-dong', { cookie: GV })).status === 403);
  check('GIA ĐÌNH không mở được kho lưu', (await req('GET', '/api/messages/da-dong', { cookie: PH })).status === 403);
  check('và cô cũng không đóng được cuộc nào',
    (await req('POST', `/api/messages/${KENH_NHOM}/dong`, { cookie: GV })).status === 403);
  check('gia đình cũng không',
    (await req('POST', `/api/messages/${KENH_NHOM}/dong`, { cookie: PH })).status === 403);

  // QUẢN LÝ CƠ SỞ KHÁC thì không — đóng một cuộc không biến nó thành tài liệu
  // chung của cả trường.
  check('quản lý CƠ SỞ KHÁC không đọc được cuộc đã đóng của cơ sở này',
    (await doc(QL2, KENH_MOI)).status === 404);
  check('và không thấy nó trong kho lưu của mình',
    !(((await req('GET', '/api/messages/da-dong', { cookie: QL2 })).data || {}).ds || [])
      .some(x => x.conversationId === KENH_MOI));

  // MỞ LẠI ĐƯỢC. Đóng nhầm mà không mở lại được thì gia đình mất đường nói
  // chuyện với cô, và cách chữa duy nhất là sửa thẳng cơ sở dữ liệu.
  const moLai = await req('POST', `/api/messages/${KENH_MOI}/mo-lai`, { cookie: QT });
  check('mở lại được cuộc đã đóng', moLai.status === 200, moLai.data);
  check('gia đình vào lại được ngay', (await doc(PH, KENH_MOI)).status === 200);
  check('và nhắn tiếp được', (await gui(PH, KENH_MOI, 'em quay lại ạ')).status === 200);
  check('MỞ LẠI XONG thì ban giám hiệu KHÔNG còn đọc được nữa — chốt cũ trở lại đúng chỗ',
    (await doc(QT, KENH_MOI)).status === 403);
}

// ===========================================================================
// GÓP Ý 16/10, MỤC PH1 — PHƯƠNG ÁN A (Đ239m): mỗi TÀI KHOẢN phụ huynh × cơ sở
// một hộp thư riêng với văn phòng. Dữ liệu dựng sẵn ở đầu tệp.
const VP1 = await vao('vpcs1', mkVPcs1);
const VP2 = await vao('vpcs2', mkVPcs2);
const vpCua = async (cookie) => ((await ds(cookie)).contacts || []).filter(c => c.kenh === 'vanphong');
const dsHT = async (cookie) => (await ds(cookie)).conversations || [];
const moCsdl = () => new Database(path.join(DIR, 'school.db'));
const docCsdl = (sql, ...thamSo) => {
  const c = moCsdl();
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const ghiCsdl = (sql, ...thamSo) => {
  const c = moCsdl();
  try { c.prepare(sql).run(...thamSo); } finally { c.close(); }
};
const thanhVienPH = (ma) => docCsdl(
  `SELECT cm.userId AS id FROM conversation_members cm JOIN users u ON u.id = cm.userId
    WHERE cm.conversationId = ? AND u.role = 'parent' ORDER BY cm.userId`, ma).map(r => r.id);

let CUOC_P3 = '';
console.log('\n[11] Hai con cùng cơ sở, ĐÃ có cuộc văn phòng cũ theo từng bé');
{
  const PH3 = (await login('ph.tuan', '123456')).cookie;
  const d = await ds(PH3);
  const vp = (d.contacts || []).filter(c => c.kenh === 'vanphong');
  check('đối chứng — nhà này có hai con', new Set((d.contacts || []).map(c => c.studentId)).size === 2,
    (d.contacts || []).map(c => `${c.studentId}:${c.kenh}`));
  check('ĐÚNG MỘT liên hệ "Văn phòng nhà trường" cho cả nhà',
    vp.length === 1 && vp[0].name === 'Văn phòng nhà trường', vp);
  check('và không còn "Về bé…"', vp.every(c => c.subtitle === ''), vp.map(c => c.subtitle));
  check('mục mới KHÔNG trỏ vào cuộc cũ nào — cuộc cũ đọc được bởi mọi phụ huynh của bé ấy',
    vp[0] && !vp[0].existingConversationId && vp[0].studentId === 's4', vp[0]);

  const cu = (d.conversations || []).filter(c => /^cv_vp_cu_/.test(c.id));
  check('CẢ HAI cuộc văn phòng cũ vẫn nằm trong danh sách', cu.length === 2, cu.map(c => c.id));
  check('và vẫn nói rõ "Về bé…" như trước — đó là cuộc của từng bé',
    cu.find(c => c.id === 'cv_vp_cu_s4')?.subtitle === `Về bé ${TEN.s4}`
      && cu.find(c => c.id === 'cv_vp_cu_s8')?.subtitle === `Về bé ${TEN.s8}`
      && cu.every(c => c.title === 'Văn phòng nhà trường'),
    cu.map(c => `${c.title} | ${c.subtitle}`));
  const cuBe = await doc(PH3, 'cv_vp_cu_s4');
  check('cuộc cũ vẫn mở được và còn nguyên tin', cuBe.status === 200
    && (cuBe.data.messages || []).some(m => /nghỉ hai hôm/.test(m.text)), cuBe.status);
  check('và vẫn nhắn tiếp được', (await gui(PH3, 'cv_vp_cu_s4', 'Dạ em hỏi thêm ạ')).status === 200);

  const r = await mo(PH3, 'vanphong', 's8');
  CUOC_P3 = r.data?.id || '';
  check('bấm mục văn phòng (gửi mã bé nào của nhà cùng cơ sở cũng được) là mở một cuộc MỚI',
    r.status === 200 && CUOC_P3 && !/^cv_vp_cu_/.test(CUOC_P3), r.data);
  check('mở lại bằng mã bé kia vẫn về ĐÚNG cuộc ấy', (await mo(PH3, 'vanphong', 's4')).data?.id === CUOC_P3);
  check('gửi được tin', (await gui(PH3, CUOC_P3, 'Chiều nay ông nội đón hai cháu ạ')).status === 200);

  const kenhCu = docCsdl(
    "SELECT COUNT(*) AS n FROM kenh_hoi_thoai WHERE loai = 'vanphong' AND studentId IN ('s4', 's8')")[0].n;
  const hop = docCsdl('SELECT * FROM kenh_van_phong WHERE conversationId = ?', CUOC_P3)[0];
  const loai = docCsdl('SELECT type FROM conversations WHERE id = ?', CUOC_P3)[0]?.type;
  check('TẦNG DỮ LIỆU CŨ KHÔNG ĐỔI — không gộp, không xoá, không đẻ thêm kênh theo bé', kenhCu === 2, kenhCu);
  check('cuộc mới là hộp thư của ĐÚNG người này ở ĐÚNG cơ sở 1',
    loai === 'vanphong' && hop?.parentId === 'p3' && hop?.campusId === 'cs1', { loai, hop });
  check('phía gia đình chỉ có MỘT người đọc', thanhVienPH(CUOC_P3).join() === 'p3', thanhVienPH(CUOC_P3));
  check('mục liên hệ nay trỏ vào cuộc ấy', (await vpCua(PH3))[0]?.existingConversationId === CUOC_P3);

  // Văn phòng chưa mở cuộc nào mà vẫn thấy trong danh sách — hàng thành viên
  // phía văn phòng tự thêm, như kênh cũ.
  const dsVP1 = await dsHT(VP1);
  const dong = dsVP1.find(c => c.id === CUOC_P3);
  check('VĂN PHÒNG CƠ SỞ 1 thấy cuộc trong danh sách dù chưa từng mở', !!dong, dsVP1.map(c => c.id));
  check('tiêu đề là tên phụ huynh', (dong?.title || '').includes(TEN['ph.tuan']), dong);
  check('và tin vừa gửi được đếm là chưa đọc', dong?.unreadCount >= 1, dong?.unreadCount);
  const vpDoc = await doc(VP1, CUOC_P3);
  check('VĂN PHÒNG CƠ SỞ 1 đọc được tin', vpDoc.status === 200
    && (vpDoc.data.messages || []).some(m => /ông nội/.test(m.text)), vpDoc.status);
  check('và thấy CẢ HAI con của nhà ấy ở cơ sở mình, kèm nhóm',
    (vpDoc.data.subtitle || '').includes(TEN.s4) && (vpDoc.data.subtitle || '').includes(TEN.s8)
      && /Chồi 2/.test(vpDoc.data.subtitle || '') && /Lá 1/.test(vpDoc.data.subtitle || ''),
    vpDoc.data.subtitle);
  check('VĂN PHÒNG CƠ SỞ KHÁC không đọc được', (await doc(VP2, CUOC_P3)).status === 403);
  check('kể cả cuộc cũ', (await doc(VP2, 'cv_vp_cu_s4')).status === 403);
  check('và không thấy chúng trong danh sách của mình',
    !(await dsHT(VP2)).some(c => c.id === CUOC_P3 || /^cv_vp_cu_/.test(c.id)));
  check('CÔ không đọc được hộp thư văn phòng', (await doc(GV, CUOC_P3)).status === 403);
  check('và không thấy nó trong danh sách', !(await dsHT(GV)).some(c => c.id === CUOC_P3));
}

let CUOC_P2_CS1 = '';
console.log('\n[12] Hai con ở HAI cơ sở: hai mục văn phòng, phân biệt bằng tên cơ sở');
{
  const PH2 = (await login('phuhuynh2', '123456')).cookie;
  const vp = await vpCua(PH2);
  check('HAI mục "Văn phòng nhà trường" — mỗi cơ sở một mục',
    vp.length === 2 && vp.every(c => c.name === 'Văn phòng nhà trường'), vp);
  check('phân biệt bằng TÊN CƠ SỞ, không bằng "Về bé…"',
    vp.map(c => c.subtitle).sort().join('|') === 'Cơ sở 1|Cơ sở 2', vp.map(c => c.subtitle));
  const muc1 = vp.find(c => c.subtitle === 'Cơ sở 1');
  const muc2 = vp.find(c => c.subtitle === 'Cơ sở 2');
  check('mục cơ sở 1 gắn với bé học cơ sở 1, mục cơ sở 2 với bé học cơ sở 2',
    muc1?.studentId === 's3' && muc2?.studentId === 's_cs2', vp);

  const r1 = await mo(PH2, 'vanphong', 's3');
  const r2 = await mo(PH2, 'vanphong', 's_cs2');
  CUOC_P2_CS1 = r1.data?.id || '';
  check('mở được cả hai, và đó là HAI cuộc khác nhau',
    r1.status === 200 && r2.status === 200 && r1.data.id !== r2.data.id, { r1: r1.data, r2: r2.data });
  await gui(PH2, r1.data.id, 'Gửi văn phòng cơ sở 1 ạ');
  await gui(PH2, r2.data.id, 'Gửi văn phòng cơ sở 2 ạ');

  const ds2 = await dsHT(VP2);
  check('văn phòng cơ sở 2 thấy cuộc của cơ sở 2 trong danh sách trước khi mở',
    ds2.some(c => c.id === r2.data.id), ds2.map(c => c.id));
  check('mà KHÔNG thấy cuộc của cơ sở 1', !ds2.some(c => c.id === r1.data.id));
  const doc11 = await doc(VP1, r1.data.id);
  check('văn phòng cơ sở 1 đọc được cuộc của cơ sở 1', doc11.status === 200, doc11.status);
  check('nhưng KHÔNG đọc được cuộc của cơ sở 2', (await doc(VP1, r2.data.id)).status === 403);
  check('văn phòng cơ sở 2 đọc được cuộc của cơ sở 2', (await doc(VP2, r2.data.id)).status === 200);
  check('nhưng KHÔNG đọc được cuộc của cơ sở 1', (await doc(VP2, r1.data.id)).status === 403);
  check('QUẢN LÝ cơ sở 2 cũng không', (await doc(QL2, r1.data.id)).status === 403);
  const phu = doc11.data.subtitle || '';
  check('văn phòng cơ sở 1 thấy bé của cơ sở mình', phu.includes(TEN.s3), phu);
  check('mà KHÔNG thấy tên bé học cơ sở khác', !phu.includes(TEN.s_cs2), phu);

  const phDs = await dsHT(PH2);
  check('danh sách của gia đình: hai cuộc văn phòng cũng phân biệt bằng tên cơ sở',
    phDs.find(c => c.id === r1.data.id)?.subtitle === 'Cơ sở 1'
      && phDs.find(c => c.id === r2.data.id)?.subtitle === 'Cơ sở 2',
    phDs.filter(c => c.id === r1.data.id || c.id === r2.data.id).map(c => `${c.title} | ${c.subtitle}`));
}

console.log('\n[13] Bố mẹ RIÊNG: mỗi người MỘT mục, và không ai đọc được thư của người kia');
{
  const PL = (await login('ph.lan', '123456')).cookie;
  const PM = (await login('ph.minh', '123456')).cookie;
  const vL = await vpCua(PL);
  const vM = await vpCua(PM);
  check('chị Lan thấy ĐÚNG MỘT mục văn phòng, không "Về bé…"',
    vL.length === 1 && vL[0].subtitle === '', vL);
  check('anh Minh cũng vậy', vM.length === 1 && vM[0].subtitle === '', vM);

  // Chị Lan kể CHUYỆN RIÊNG của bé Vy (con riêng của chị) trong mục duy nhất ấy
  // — đúng điều một gia đình sẽ làm, và đúng ca đã rò tin ở Đ239g.
  const r = await mo(PL, 'vanphong', vL[0]?.studentId);
  const RIENG = r.data?.id;
  check('mở được mục văn phòng', r.status === 200 && !!RIENG, r.data);
  check('gửi được tin', (await gui(PL, RIENG, 'Bé Vy bị sốt, xin cho bé nghỉ hai hôm ạ')).status === 200);
  check('ANH MINH KHÔNG ĐỌC ĐƯỢC thư của chị Lan', (await doc(PM, RIENG)).status === 403);
  const dsM = await ds(PM);
  check('cuộc ấy không có trong danh sách hội thoại của anh',
    !(dsM.conversations || []).some(c => c.id === RIENG), (dsM.conversations || []).map(c => c.id));
  check('không tin cuối nào của anh nói về bé Vy',
    !(dsM.conversations || []).some(c => /Bé Vy/.test(c.lastMessage?.text || '')));
  check('cũng không mục liên hệ nào của anh trỏ vào nó',
    !(dsM.contacts || []).some(c => c.existingConversationId === RIENG), dsM.contacts);
  const rM = await mo(PM, 'vanphong', vM[0]?.studentId);
  check('mục của anh Minh mở ra một cuộc KHÁC', rM.status === 200 && rM.data.id && rM.data.id !== RIENG, rM.data);
  check('và chị Lan không đọc được cuộc của anh', (await doc(PL, rM.data.id)).status === 403);

  // PHÍA VĂN PHÒNG: dòng phụ nêu các con của ĐÚNG người viết.
  const vpR = await doc(VP1, RIENG);
  const nhan = `${vpR.data.title || ''} | ${vpR.data.subtitle || ''}`;
  check('văn phòng đọc được, thấy chị Lan cùng bé chung và bé Vy',
    vpR.status === 200 && nhan.includes(TEN['ph.lan']) && nhan.includes(TEN.s0_chung) && nhan.includes(TEN.s5), nhan);
  check('mà KHÔNG nêu anh Minh hay con riêng của anh', !nhan.includes(TEN['ph.minh']) && !nhan.includes(TEN.s6), nhan);
}

console.log('\n[14] Nhà thường có cả bố lẫn mẹ: vẫn MỘT mục, nhưng mỗi người một cuộc');
{
  const PD = (await login('ph.duy', '123456')).cookie;
  const PN = (await login('ph.nga', '123456')).cookie;
  const vD = await vpCua(PD);
  const vN = await vpCua(PN);
  check('anh Duy: ĐÚNG MỘT mục, không dòng phụ', vD.length === 1 && vD[0].subtitle === '', vD);
  check('chị Nga cũng vậy', vN.length === 1 && vN[0].subtitle === '', vN);
  const rD = await mo(PD, 'vanphong', vD[0]?.studentId);
  await gui(PD, rD.data.id, 'Chiều nay bà nội đón hai cháu ạ');
  const rN = await mo(PN, 'vanphong', vN[0]?.studentId);
  // HỒI QUY CÓ CHỦ Ý — chủ dự án đã chấp nhận khi chọn phương án A: vợ chồng
  // không chung một cuộc với văn phòng.
  check('bố và mẹ MỖI NGƯỜI MỘT CUỘC', rD.status === 200 && rN.status === 200 && rD.data.id !== rN.data.id,
    { rD: rD.data, rN: rN.data });
  check('chị Nga không đọc được cuộc của anh Duy', (await doc(PN, rD.data.id)).status === 403);
  const dsVP = await dsHT(VP1);
  check('văn phòng thấy cả hai cuộc, mỗi cuộc mang tên đúng người',
    (dsVP.find(c => c.id === rD.data.id)?.title || '').includes(TEN['ph.duy'])
      && (dsVP.find(c => c.id === rN.data.id)?.title || '').includes(TEN['ph.nga']),
    dsVP.filter(c => c.id === rD.data.id || c.id === rN.data.id).map(c => c.title));
}

let CUOC_P6 = '';
let TIN_P6 = '';
console.log('\n[15] Phụ huynh được gắn THÊM SAU không đọc được thư đã có (repro vòng 2 của Đ239g)');
{
  const PH6 = (await login('ph.huong', '123456')).cookie;
  const v6 = await vpCua(PH6);
  check('đối chứng — chị Hương có hai con cùng cơ sở, MỘT mục văn phòng', v6.length === 1, v6);
  const r = await mo(PH6, 'vanphong', 's7b');
  CUOC_P6 = r.data?.id || '';
  const g = await gui(PH6, CUOC_P6, 'Văn phòng ơi, bí mật s7b: bé Châu sắp chuyển nhà ạ');
  TIN_P6 = g.data?.id || '';
  check('chị Hương nhắn được về bé Châu', r.status === 200 && g.status === 200, { r: r.data, g: g.data });

  // Trường gắn tài khoản chị Trang (p7) làm phụ huynh của RIÊNG bé s7.
  ganPhuHuynh(DIR, 's7', 'p7');
  const PH7 = (await login('ph.trang', '123456')).cookie;
  const d7 = await ds(PH7);
  check('đối chứng — chị Trang nay là phụ huynh của s7',
    (d7.contacts || []).some(c => c.studentId === 's7'), (d7.contacts || []).map(c => c.studentId));
  check('chị Trang KHÔNG thấy cuộc của chị Hương trong danh sách',
    !(d7.conversations || []).some(c => c.id === CUOC_P6), (d7.conversations || []).map(c => c.id));
  check('không tin cuối nào lộ chuyện bé Châu',
    !(d7.conversations || []).some(c => /s7b/.test(c.lastMessage?.text || '')),
    (d7.conversations || []).map(c => c.lastMessage?.text));
  check('không mục liên hệ nào của chị Trang trỏ vào cuộc ấy',
    !(d7.contacts || []).some(c => c.existingConversationId === CUOC_P6 || c.existingConversationId === 'cv_vp_gop_s7'),
    d7.contacts);
  check('GET → 403', (await doc(PH7, CUOC_P6)).status === 403);
  check('poll → 403',
    (await req('GET', `/api/messages/${CUOC_P6}/poll?after=`, { cookie: PH7 })).status === 403);
  check('POST → 403', (await gui(PH7, CUOC_P6, 'chen vào')).status === 403);
  check('thu hồi tin của người khác → 403',
    (await req('POST', `/api/messages/${CUOC_P6}/tin/${TIN_P6}/thu-hoi`, { cookie: PH7 })).status === 403);

  // Kênh văn phòng CŨ của s7: người đọc phía gia đình đóng băng từ lúc triển
  // khai Đ239m — phụ huynh được gắn sau không vào được, dù là phụ huynh của s7.
  check('kênh văn phòng CŨ của s7 (có chuyện riêng s7b): chị Trang mở → 403',
    (await doc(PH7, 'cv_vp_gop_s7')).status === 403);
  const d7b = await ds(PH7);
  check('và không thấy nó, cũng không thấy tin cuối của nó',
    !(d7b.conversations || []).some(c => c.id === 'cv_vp_gop_s7' || /chuyện riêng s7b/.test(c.lastMessage?.text || '')),
    (d7b.conversations || []).map(c => c.id));
  check('không ai thêm chị Trang vào kênh cũ ấy', !thanhVienPH('cv_vp_gop_s7').includes('p7'),
    thanhVienPH('cv_vp_gop_s7'));
  const muc7 = (d7b.contacts || []).filter(c => c.kenh === 'vanphong');
  check('mục văn phòng của chị Trang là của RIÊNG chị — chưa có cuộc nào',
    muc7.length === 1 && !muc7[0].existingConversationId, muc7);
  check('chị Hương vẫn đọc được kênh cũ của mình', (await doc(PH6, 'cv_vp_gop_s7')).status === 200);
  check('và cuộc mới của mình', (await doc(PH6, CUOC_P6)).status === 200);
}

console.log('\n[16] Gỡ phụ huynh khỏi bé: còn con thì còn thư, hết con trong hạn thì hết');
{
  const PH6 = (await login('ph.huong', '123456')).cookie;
  ghiCsdl("DELETE FROM student_parents WHERE studentId = 's7b' AND parentId = 'p6'");
  check('gỡ khỏi s7b, còn s7: chị Hương VẪN đọc cuộc của mình', (await doc(PH6, CUOC_P6)).status === 200);
  ghiCsdl("DELETE FROM student_parents WHERE studentId = 's7' AND parentId = 'p6'");
  check('gỡ nốt s7: mở cuộc → 403', (await doc(PH6, CUOC_P6)).status === 403);
  const d6 = await dsHT(PH6);
  check('và cuộc ấy biến khỏi danh sách', !d6.some(c => c.id === CUOC_P6), d6.map(c => c.id));
  check('kênh văn phòng cũ của bé đã gỡ cũng biến khỏi danh sách (không lộ tin cuối)',
    !d6.some(c => c.id === 'cv_vp_gop_s7'), d6.map(c => c.id));
  check('văn phòng vẫn giữ và đọc được cuộc — đóng đường xem không phải xoá',
    (await doc(VP1, CUOC_P6)).status === 200);
}

console.log('\n[17] Ba phụ huynh của MỘT bé: mỗi người một cuộc, không ai đọc của ai');
{
  const ck = {};
  const ma = {};
  for (const u of ['ph.ba1', 'ph.ba2', 'ph.ba3']) {
    ck[u] = (await login(u, '123456')).cookie;
    const muc = await vpCua(ck[u]);
    const r = await mo(ck[u], 'vanphong', muc[0]?.studentId);
    ma[u] = r.data?.id;
    await gui(ck[u], ma[u], `Tin riêng của ${u}`);
  }
  check('ba người, BA cuộc khác nhau', new Set(Object.values(ma).filter(Boolean)).size === 3, ma);
  const cheo = [];
  for (const a of Object.keys(ma)) {
    for (const b of Object.keys(ma)) {
      if (a !== b) cheo.push([a, b, (await doc(ck[a], ma[b])).status]);
    }
  }
  check('mọi lượt đọc chéo đều 403', cheo.every(x => x[2] === 403), cheo);
  const dsVP = await dsHT(VP1);
  check('văn phòng thấy cả ba', Object.values(ma).every(id => dsVP.some(c => c.id === id)));
}

console.log('\n[18] Bé đã nghỉ: còn hạn 12 tháng thì còn thư, quá hạn thì hết');
{
  const PN = (await login('ph.nghi', '123456')).cookie;
  const muc = await vpCua(PN);
  const r = await mo(PN, 'vanphong', muc[0]?.studentId);
  const CUOC = r.data?.id;
  await gui(PN, CUOC, 'Gia đình xin bảng điểm danh tháng này ạ');
  const k = await mo(PN, 'nhom', 's_nghi');
  await gui(PN, k.data.id, 'Cô ơi con đỡ ho rồi ạ');
  check('đối chứng — mở được cả hộp thư văn phòng lẫn kênh của cô', r.status === 200 && k.status === 200);

  const luiThang = (n) => {
    const [y, m, d] = HOM_NAY().split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 - n, Math.min(d, 28))).toISOString().slice(0, 10);
  };
  ghiCsdl("UPDATE students SET active = 0, leftAt = ? WHERE id = 's_nghi'", luiThang(3));
  check('nghỉ 3 tháng: vẫn mở được hộp thư', (await doc(PN, CUOC)).status === 200);
  check('và nó vẫn trong danh sách', (await dsHT(PN)).some(c => c.id === CUOC));
  check('nhưng không còn mục để MỞ cuộc mới với văn phòng', (await vpCua(PN)).length === 0);
  const vpDoc = await doc(VP1, CUOC);
  check('văn phòng vẫn đọc được, và dòng phụ nói rõ không còn bé nào đang học',
    vpDoc.status === 200 && vpDoc.data.subtitle === 'Không còn bé đang học ở cơ sở này', vpDoc.data.subtitle);

  ghiCsdl("UPDATE students SET leftAt = ? WHERE id = 's_nghi'", luiThang(13));
  check('quá 12 tháng: mở hộp thư → 403', (await doc(PN, CUOC)).status === 403);
  const d = await dsHT(PN);
  check('và nó biến khỏi danh sách', !d.some(c => c.id === CUOC), d.map(c => c.id));
  check('kênh của cô với bé ấy cũng biến khỏi danh sách', !d.some(c => c.id === k.data.id), d.map(c => c.id));
}

console.log('\n[19] Nhiều cơ sở và cuộc đã đóng');
{
  check('văn phòng cơ sở 2 không thấy cuộc của cơ sở 1', !(await dsHT(VP2)).some(c => c.id === CUOC_P6));
  check('quản lý cơ sở 2 cũng không', !(await dsHT(QL2)).some(c => c.id === CUOC_P6));
  const dongCheo = await req('POST', `/api/messages/${CUOC_P6}/dong`, { cookie: QL2 });
  check('quản lý cơ sở 2 KHÔNG đóng được cuộc của cơ sở 1',
    dongCheo.status === 403 && /cơ sở khác/.test(dongCheo.data?.error || ''), dongCheo.data);

  const dong = await req('POST', `/api/messages/${CUOC_P2_CS1}/dong`, {
    cookie: QT, body: { lyDo: 'Đã giải quyết xong' },
  });
  check('ban giám hiệu đóng được hộp thư cơ sở 1 của anh Bảo', dong.status === 200, dong.data);
  check('quản lý cơ sở 2 không đọc được cuộc đã đóng ấy', (await doc(QL2, CUOC_P2_CS1)).status === 404);
  check('và không thấy nó trong kho lưu của mình',
    !(((await req('GET', '/api/messages/da-dong', { cookie: QL2 })).data || {}).ds || [])
      .some(x => x.conversationId === CUOC_P2_CS1));
  check('cũng không mở lại được',
    (await req('POST', `/api/messages/${CUOC_P2_CS1}/mo-lai`, { cookie: QL2 })).status === 403);
  check('ban giám hiệu đọc lại được', (await doc(QT, CUOC_P2_CS1)).status === 200);
  const kho = (((await req('GET', '/api/messages/da-dong', { cookie: QT })).data || {}).ds || [])
    .find(x => x.conversationId === CUOC_P2_CS1);
  check('kho lưu nói rõ hộp thư của phụ huynh nào', (kho?.hoTenPhuHuynh || '').includes(TEN.phuhuynh2), kho);
  const PH2 = (await login('phuhuynh2', '123456')).cookie;
  check('gia đình không mở được cuộc đã đóng', (await doc(PH2, CUOC_P2_CS1)).status === 404);
  const moi = await mo(PH2, 'vanphong', 's3');
  check('và mục văn phòng cơ sở 1 mở ra một cuộc MỚI', moi.status === 200 && moi.data.id !== CUOC_P2_CS1, moi.data);
}

console.log('\n[20] Văn phòng trả lời: đẩy về đúng chủ cuộc, KHÔNG vào chuông thông báo của bé');
{
  // thongbao_be gắn theo BÉ: mọi phụ huynh hiện tại của bé đọc được, và nội dung
  // chứa 140 ký tự đầu của tin — đi đường ấy là rò đúng thứ vừa đóng ở [15].
  const dem = () => docCsdl("SELECT COUNT(*) AS n FROM thongbao_be WHERE loai = 'tin-nhan'")[0].n;
  const truoc = dem();
  check('trả lời trong hộp thư mới được', (await gui(VP1, CUOC_P3, 'Văn phòng đã nhận ạ')).status === 200);
  check('trả lời trong kênh văn phòng cũ được', (await gui(VP1, 'cv_vp_cu_s4', 'Dạ văn phòng ghi nhận')).status === 200);
  check('số tin riêng của bé KHÔNG tăng', dem() === truoc, { truoc, sau: dem() });
  check('không dòng nào chỉ đường về hai cuộc ấy',
    docCsdl('SELECT COUNT(*) AS n FROM thongbao_be WHERE hash IN (?, ?)',
      `#/messages/${CUOC_P3}`, '#/messages/cv_vp_cu_s4')[0].n === 0);

  // Ai nhận thông báo đẩy — hỏi thẳng luật, trong tiến trình bài canh (mẫu
  // test/day-tin-nhom.test.mjs). `lib/db.js` đọc DATA_DIR lúc nạp.
  process.env.DATA_DIR = DIR;
  const kvp = createRequire(import.meta.url)(path.join(GOC, 'lib', 'kenh-van-phong.js'));
  ganPhuHuynh(DIR, 's7b', 'p6');
  const nhan = kvp.nguoiNhanDay(kvp.cuaHoiThoai(CUOC_P6));
  check('chủ cuộc còn con đang học → đẩy cho đúng chủ cuộc', JSON.stringify(nhan) === '["p6"]', nhan);
  ghiCsdl("DELETE FROM student_parents WHERE studentId = 's7b' AND parentId = 'p6'");
  const het = kvp.nguoiNhanDay(kvp.cuaHoiThoai(CUOC_P6));
  check('gỡ hết bé → không đẩy cho ai', JSON.stringify(het) === '[]', het);
  createRequire(import.meta.url)(path.join(GOC, 'lib', 'db.js')).close();
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Nhắn tin với lớp và với văn phòng');
