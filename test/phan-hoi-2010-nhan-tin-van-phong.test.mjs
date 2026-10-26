// Bài canh VĂN PHÒNG MỞ TIN VỚI MỘT HAY NHIỀU GIA ĐÌNH (Đ242F, góp ý 20/10
// mục F3 — "hiện tại không gửi được").
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-van-phong.test.mjs
//
// Gốc: danh sách người nhận của văn phòng (`contactsFor`) luôn rỗng — văn phòng
// chỉ trả lời được cuộc gia đình đã mở. Nay văn phòng, quản lý cơ sở và ban
// giám hiệu mở được "hộp thư văn phòng" (Đ239m — mỗi TÀI KHOẢN phụ huynh × cơ sở
// một cuộc) với gia đình của bé trong phạm vi mình: một bé, hoặc nhiều bé như
// F2. Bố và mẹ mỗi người một cuộc — đúng phương án A chủ dự án chọn 18/10.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu, ganPhuHuynh, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-van-phong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng VP', 'vp_bgh');
const mkVP1 = taoQuanTri(DIR, 'Văn phòng CS1 VP', 'vp_cs1');
datChucVu(DIR, 'vp_cs1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vp_cs1', 'cs1');
const mkVP2 = taoQuanTri(DIR, 'Văn phòng CS2 VP', 'vp_cs2');
datChucVu(DIR, 'vp_cs2', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vp_cs2', 'cs2');
const mkKT = taoQuanTri(DIR, 'Kế toán VP', 'vp_kt');
datChucVu(DIR, 'vp_kt', 'ketoan');

const CSDL = path.join(DIR, 'school.db');
function hoi(sql, ...thamSo) {
  const conn = new Database(CSDL);
  try { return conn.prepare(sql).all(...thamSo); } finally { conn.close(); }
}
{
  // Một bé ở Mầm 1 (cơ sở 2), con của chị Lan (p4).
  const c = new Database(CSDL);
  const nam = Number(HOM_NAY().slice(0, 4));
  c.prepare(`INSERT INTO students (id, name, dob, gender, classId, active, createdAt)
             VALUES ('s_cs2', 'Phan Gia Khôi', ?, 'Nam', 'c3', 1, ?)`)
    .run(`${nam - 3}-05-01`, new Date().toISOString());
  c.close();
}
ganPhuHuynh(DIR, 's_cs2', 'p4');
// Bé s3 có cả bố (p2) lẫn mẹ — gắn thêm anh Minh (p5) làm phụ huynh thứ hai.
ganPhuHuynh(DIR, 's3', 'p5');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7103), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('vp_bgh', mkQT);
  const VP1 = await vao('vp_cs1', mkVP1);
  const VP2 = await vao('vp_cs2', mkVP2);
  const KT = await vao('vp_kt', mkKT);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — s1 (c1), s2 (c2), cùng cơ sở 1
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — s3
  const PM = (await login('ph.minh', '123456')).cookie;     // p5 — s6, và s3 (gắn thêm)
  const PL = (await login('ph.lan', '123456')).cookie;      // p4 — s5 (cs1), s_cs2 (cs2)

  const guiNhieu = (cookie, studentIds, text) =>
    req('POST', '/api/messages/gui-nhieu-nha', { cookie, body: { studentIds, text } });
  const dsHT = async (cookie) => (await req('GET', '/api/messages', { cookie })).data?.conversations || [];
  const huyHieu = async (cookie) =>
    Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.nhantin || 0);
  const hopThu = (parentId) => hoi(
    `SELECT conversationId, campusId FROM kenh_van_phong WHERE parentId = ?
       AND conversationId NOT IN (SELECT conversationId FROM hoi_thoai_dong)`, parentId);

  // Anh Bảo (p2) đã tự mở hộp thư văn phòng từ trước.
  const CU_P2 = (await req('POST', '/api/messages/start', { cookie: PH2, body: { kenh: 'vanphong', studentId: 's3' } })).data?.id;
  const hhPH0 = await huyHieu(PH);

  // =========================================================================
  console.log('\n[1] Gốc của "không gửi được": văn phòng có đường để chọn gia đình');
  {
    const ds = (await req('GET', '/api/messages', { cookie: VP1 })).data;
    check('danh sách liên hệ gửi kèm màn Nhắn tin của văn phòng vẫn rỗng — không chở ba trăm gia đình mỗi lần mở',
      (ds?.contacts || []).length === 0, ds?.contacts);
    const chon = (await req('GET', '/api/messages/chon-be', { cookie: VP1 })).data || {};
    check('văn phòng cơ sở 1 mở được ô chọn, chỉ cơ sở 1', (chon.coSo || []).map(c => c.id).join() === 'cs1', chon.coSo);
    check('có bé của cơ sở 1, không có bé cơ sở 2',
      (chon.be || []).some(b => b.id === 's1') && !(chon.be || []).some(b => b.id === 's_cs2'), chon.be);
  }

  // =========================================================================
  console.log('\n[2] Văn phòng gửi cho nhiều bé — mỗi tài khoản phụ huynh một hộp thư');
  const TIN = 'Văn phòng xin nhắc gia đình nộp giấy khám sức khoẻ đầu năm trước thứ sáu ạ';
  {
    const r = await guiNhieu(VP1, ['s1', 's2', 's3', 's_cs2'], TIN);
    check('gửi được', r.status === 200, r.data);
    const kq = r.data || {};
    check('ba bé trong cơ sở được gửi', (kq.daGui || []).map(x => x.studentId).sort().join() === 's1,s2,s3', kq);
    const ko = (kq.khongGui || []).find(x => x.studentId === 's_cs2');
    check('bé cơ sở 2: không gửi, có lý do, không lộ tên', !!ko?.lyDo && !ko?.ten, ko);

    const h1 = hopThu('p1');
    check('chị Hà (hai con cùng cơ sở) có ĐÚNG MỘT hộp thư cơ sở 1', h1.length === 1 && h1[0].campusId === 'cs1', h1);
    const tin1 = hoi('SELECT text, senderId FROM messages WHERE conversationId = ?', h1[0]?.conversationId);
    check('và nhận ĐÚNG MỘT tin, không hai', tin1.length === 1 && tin1[0].text === TIN, tin1);
    check('huy hiệu của chị tăng một', (await huyHieu(PH)) === hhPH0 + 1);
    const c1 = (await dsHT(PH)).find(c => c.id === h1[0]?.conversationId);
    check('chị thấy "Văn phòng nhà trường" với tin mới chưa đọc',
      c1?.title === 'Văn phòng nhà trường' && c1?.lastMessage?.text === TIN && c1?.unreadCount === 1, c1);
    const lh = ((await req('GET', '/api/messages', { cookie: PH })).data?.contacts || []).filter(c => c.kenh === 'vanphong');
    check('mục "Văn phòng nhà trường" của chị trỏ vào đúng cuộc ấy', lh[0]?.existingConversationId === h1[0]?.conversationId, lh);

    const h2 = hopThu('p2');
    check('anh Bảo đã có hộp thư thì dùng ĐÚNG cuộc ấy', h2.length === 1 && h2[0].conversationId === CU_P2, h2);
    const h5 = hopThu('p5');
    check('anh Minh (phụ huynh thứ hai của s3) có hộp thư RIÊNG', h5.length === 1 && h5[0].conversationId !== CU_P2, h5);
    check('anh Minh KHÔNG đọc được hộp thư của anh Bảo',
      (await req('GET', `/api/messages/${CU_P2}`, { cookie: PM })).status === 403);
    check('và ngược lại', (await req('GET', `/api/messages/${h5[0]?.conversationId}`, { cookie: PH2 })).status === 403);
    const tv = hoi(`SELECT cm.userId FROM conversation_members cm JOIN users u ON u.id = cm.userId
                     WHERE cm.conversationId = ? AND u.role = 'parent'`, h1[0]?.conversationId).map(x => x.userId);
    check('phía gia đình mỗi hộp thư chỉ một người', tv.join() === 'p1', tv);
    check('chị Lan (con ở cơ sở 2) không nhận gì', hopThu('p4').length === 0);
    check('không lập kênh theo bé nào', hoi("SELECT COUNT(*) AS n FROM kenh_hoi_thoai WHERE loai = 'vanphong'")[0].n === 0);
  }

  // =========================================================================
  console.log('\n[3] Ai đọc được, ai gửi được');
  {
    const ma = hopThu('p1')[0].conversationId;
    check('văn phòng cơ sở 1 đọc được', (await req('GET', `/api/messages/${ma}`, { cookie: VP1 })).status === 200);
    check('văn phòng cơ sở 2 KHÔNG đọc được', (await req('GET', `/api/messages/${ma}`, { cookie: VP2 })).status === 403);
    check('cô KHÔNG đọc được', (await req('GET', `/api/messages/${ma}`, { cookie: GV })).status === 403);
    check('gia đình trả lời được', (await req('POST', `/api/messages/${ma}`, { cookie: PH, body: { text: 'Dạ vâng ạ' } })).status === 200);

    const r2 = await guiNhieu(VP2, ['s_cs2'], 'Văn phòng cơ sở 2 chào chị');
    check('văn phòng cơ sở 2 gửi được cho bé cơ sở 2', r2.status === 200 && r2.data?.soNha === 1, r2.data);
    const h4 = hopThu('p4');
    check('chị Lan có hộp thư cơ sở 2', h4.length === 1 && h4[0].campusId === 'cs2', h4);
    const rQT = await guiNhieu(QT, ['s5'], 'Ban giám hiệu gửi chị');
    check('ban giám hiệu gửi được', rQT.status === 200 && rQT.data?.soNha === 1, rQT.data);
    check('chị Lan nay có thêm hộp thư cơ sở 1', hopThu('p4').map(h => h.campusId).sort().join() === 'cs1,cs2', hopThu('p4'));

    check('kế toán KHÔNG gửi được', (await guiNhieu(KT, ['s1'], 'x')).status === 403);
    check('và không mở được ô chọn', (await req('GET', '/api/messages/chon-be', { cookie: KT })).status === 403);
    check('gia đình KHÔNG gửi được', (await guiNhieu(PH, ['s1'], 'x')).status === 403);
    check('nội dung trống → 400', (await guiNhieu(VP1, ['s1'], ' ')).status === 400);
  }

  // =========================================================================
  console.log('\n[4] Hộp thư đã đóng: gửi mới thì mở một cuộc MỚI, không viết vào kho lưu');
  {
    const dong = await req('POST', `/api/messages/${CU_P2}/dong`, { cookie: QT, body: {} });
    check('đối chứng — đóng được hộp thư của anh Bảo', dong.status === 200, dong.data);
    const soTinCu = hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', CU_P2)[0].n;
    const r = await guiNhieu(VP1, ['s3'], 'Văn phòng nhắn lại anh');
    check('gửi được', r.status === 200, r.data);
    const h2 = hopThu('p2');
    check('anh Bảo có một hộp thư MỚI', h2.length === 1 && h2[0].conversationId !== CU_P2, h2);
    check('cuộc đã đóng không có thêm tin', hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', CU_P2)[0].n === soTinCu);
    const mot = (r.data?.daGui || []).find(x => x.studentId === 's3');
    check('câu trả lời nêu các cuộc đã gửi vào', (mot?.conversationIds || []).includes(h2[0].conversationId), mot);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Văn phòng mở tin với gia đình (F3)');
