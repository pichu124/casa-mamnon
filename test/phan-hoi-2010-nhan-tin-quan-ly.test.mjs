// Bài canh QUẢN LÝ XEM HỘI THOẠI CÔ ↔ GIA ĐÌNH (Đ242F, góp ý 20/10 mục F1).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-quan-ly.test.mjs
//
// Chủ dự án quyết 26/10: *"như LittleLives, để quản lý kiểm soát nội dung cô
// trao đổi với phụ huynh, câu từ có chuẩn mực không, có truyền đạt sai thông
// tin không"*. Trước đợt này mã cố ý cấm (Đ192).
//
// Điều bài này canh, theo đúng lời giao việc:
//   1. AI XEM: ban giám hiệu mọi cuộc; quản lý cơ sở và văn phòng cơ sở chỉ cuộc
//      của bé thuộc cơ sở mình. Cô khác, gia đình khác, chức vụ khác của khối
//      quản trị (kế toán): không.
//   2. CHỈ XEM: không gửi được, không thu hồi được, không để lại dấu trong cuộc —
//      không hàng thành viên, không đổi "đã đọc" của cô hay của gia đình, không
//      cộng vào chấm đỏ của quản lý.
//   3. MỖI LƯỢT MỞ GHI NHẬT KÝ: ai, cuộc nào. Lượt bị từ chối thì không ghi.
//   4. LỌC THEO CƠ SỞ → NHÓM → BÉ, trong đúng phạm vi người hỏi.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-quan-ly');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng QL', 'ql_bgh');          // ban giám hiệu, cả trường
const mkQL1 = taoQuanTri(DIR, 'Quản lý CS1 QL', 'ql_cs1');
datChucVu(DIR, 'ql_cs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'ql_cs1', 'cs1');
const mkQL2 = taoQuanTri(DIR, 'Quản lý CS2 QL', 'ql_cs2');
datChucVu(DIR, 'ql_cs2', 'quanly-coso');
khoaVaoCoSo(DIR, 'ql_cs2', 'cs2');
const mkVP1 = taoQuanTri(DIR, 'Văn phòng CS1 QL', 'ql_vp1');
datChucVu(DIR, 'ql_vp1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'ql_vp1', 'cs1');
const mkKT = taoQuanTri(DIR, 'Kế toán QL', 'ql_kt');
datChucVu(DIR, 'ql_kt', 'ketoan');

const CSDL = path.join(DIR, 'school.db');
function hoi(sql, ...thamSo) {
  const conn = new Database(CSDL);
  try { return conn.prepare(sql).all(...thamSo); } finally { conn.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7101), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('ql_bgh', mkQT);
  const QL1 = await vao('ql_cs1', mkQL1);
  const QL2 = await vao('ql_cs2', mkQL2);
  const VP1 = await vao('ql_vp1', mkVP1);
  const KT = await vao('ql_kt', mkKT);
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — Chồi 2 (c1, cơ sở 1)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — Lá 1 (c2), không phụ trách c1
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — bé s1 ở c1
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — bé s3 ở c1, nhà khác

  const maQT = hoi("SELECT id FROM users WHERE username = 'ql_bgh'")[0].id;
  const xem = (cookie, id, q = '') => req('GET', `/api/messages/quan-ly/cuoc/${id}${q}`, { cookie });
  const dsCuoc = (cookie, q) => req('GET', `/api/messages/quan-ly/cuoc?${q}`, { cookie });
  const gui = (cookie, id, text) => req('POST', `/api/messages/${id}`, { cookie, body: { text } });
  const huyHieu = async (cookie) =>
    Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.nhantin || 0);
  const nhatKy = (id) => hoi(
    "SELECT userId FROM audit_log WHERE action = 'hoi-thoai-quan-ly-xem' AND target = ? ORDER BY rowid", id)
    .map(r => r.userId);
  const thanhVien = (id) => hoi(
    'SELECT userId, lastRead FROM conversation_members WHERE conversationId = ? ORDER BY userId', id);

  // Dựng một cuộc cô ↔ gia đình thật: gia đình mở lời, cô trả lời, gia đình đọc.
  const KENH = (await req('POST', '/api/messages/start', { cookie: PH, body: { kenh: 'nhom', studentId: 's1' } })).data?.id;
  await gui(PH, KENH, 'Cô ơi tối qua bé sốt nhẹ ạ');
  await gui(GV, KENH, 'Dạ cô sẽ theo dõi nhiệt độ của bé trong ngày');
  await req('GET', `/api/messages/${KENH}`, { cookie: PH });
  await req('GET', `/api/messages/${KENH}`, { cookie: GV });
  check('đối chứng — dựng được một cuộc cô ↔ gia đình', !!KENH, KENH);
  const tvTruoc = thanhVien(KENH);
  const soTinTruoc = hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', KENH)[0].n;
  // Huy hiệu của quản lý đo TRƯỚC mọi lượt xem.
  const hhQT0 = await huyHieu(QT);
  const hhVP10 = await huyHieu(VP1);

  // =========================================================================
  console.log('\n[1] Ai được xem: ban giám hiệu, quản lý cơ sở và văn phòng ĐÚNG cơ sở');
  {
    const r = await xem(QT, KENH);
    check('ban giám hiệu xem được', r.status === 200, r.status);
    check('đọc đủ hai phía của cuộc',
      (r.data?.messages || []).some(m => /sốt nhẹ/.test(m.text))
        && (r.data?.messages || []).some(m => /theo dõi nhiệt độ/.test(m.text)), r.data?.messages);
    check('máy chủ nói rõ đây là chế độ CHỈ ĐỌC', r.data?.chiDoc === true, r.data?.chiDoc);
    check('tiêu đề nói rõ gia đình bé nào', /^Gia đình bé /.test(r.data?.title || ''), r.data?.title);
    check('dòng phụ nói rõ kênh với cô nào, ở nhóm nào',
      /Cô phụ trách nhóm/.test(r.data?.subtitle || '') && /Chồi 2/.test(r.data?.subtitle || ''), r.data?.subtitle);
    check('không tin nào bị coi là "của tôi" với người xem', (r.data?.messages || []).every(m => m.mine === false));

    check('quản lý cơ sở 1 xem được (bé học cơ sở 1)', (await xem(QL1, KENH)).status === 200);
    check('văn phòng cơ sở 1 xem được', (await xem(VP1, KENH)).status === 200);
    const ql2 = await xem(QL2, KENH);
    check('QUẢN LÝ CƠ SỞ 2 KHÔNG xem được cuộc của bé cơ sở 1', ql2.status === 403, ql2.status);
    check('và câu từ chối nói tiếng Việt dễ hiểu', /cơ sở khác/.test(ql2.data?.error || ''), ql2.data);
    const kt = await xem(KT, KENH);
    check('kế toán (chức vụ khác của khối quản trị) KHÔNG xem được', kt.status === 403, kt.status);
    check('CÔ NHÓM KHÁC không xem được qua đường này', (await xem(GV2, KENH)).status === 403);
    check('và vẫn 403 ở đường của người trong cuộc',
      (await req('GET', `/api/messages/${KENH}`, { cookie: GV2 })).status === 403);
    check('GIA ĐÌNH KHÁC không xem được', (await xem(PH2, KENH)).status === 403);
    check('chính gia đình trong cuộc cũng không dùng đường của quản lý', (await xem(PH, KENH)).status === 403);
    check('cuộc không tồn tại → 404', (await xem(QT, 'cv_khong_co')).status === 404);
  }

  // =========================================================================
  console.log('\n[2] Mỗi lượt mở ghi nhật ký — ai, cuộc nào; lượt bị từ chối thì không');
  {
    const ai = nhatKy(KENH);
    check('đúng ba lượt mở được ghi (ban giám hiệu, quản lý cơ sở 1, văn phòng cơ sở 1)', ai.length === 3, ai);
    check('dòng đầu là của ban giám hiệu', ai[0] === maQT, ai);
    const ct = hoi("SELECT detail FROM audit_log WHERE action = 'hoi-thoai-quan-ly-xem' AND target = ? LIMIT 1", KENH)[0];
    check('nhật ký ghi kèm bé của cuộc', /s1/.test(ct?.detail || ''), ct);
    await xem(QT, KENH, `?truoc=${encodeURIComponent(new Date().toISOString())}`);
    check('kéo thêm tin cũ trong cùng một lượt xem thì không ghi thêm dòng', nhatKy(KENH).length === 3, nhatKy(KENH));
  }

  // =========================================================================
  console.log('\n[3] CHỈ XEM: không gửi, không thu hồi, không để lại dấu trong cuộc');
  {
    const g = await gui(QT, KENH, 'Ban giám hiệu chen vào');
    check('quản lý KHÔNG gửi được vào kênh của cô', g.status === 403, g.status);
    check('văn phòng cơ sở cũng không', (await gui(VP1, KENH, 'Văn phòng chen vào')).status === 403);
    const gXem = await req('POST', `/api/messages/quan-ly/cuoc/${KENH}`, { cookie: QT, body: { text: 'x' } });
    check('đường xem không nhận tin gửi lên', gXem.status === 404 || gXem.status === 405, gXem.status);
    const tinCo = hoi('SELECT id FROM messages WHERE conversationId = ? AND senderId = ?', KENH, 't1')[0]?.id;
    const th = await req('POST', `/api/messages/${KENH}/tin/${tinCo}/thu-hoi`, { cookie: QT });
    check('quản lý KHÔNG thu hồi được tin của cô', th.status === 403, th.status);
    check('số tin trong cuộc không đổi',
      hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', KENH)[0].n === soTinTruoc);
    check('KHÔNG có dấu thu hồi nào', hoi("SELECT COUNT(*) AS n FROM record_edits WHERE bang = 'messages' AND recordId = ?", tinCo)[0].n === 0);

    const tvSau = thanhVien(KENH);
    check('không thêm hàng thành viên nào — quản lý không hiện ra như người trong cuộc',
      JSON.stringify(tvSau.map(r => r.userId)) === JSON.stringify(tvTruoc.map(r => r.userId)),
      { truoc: tvTruoc, sau: tvSau });
    check('"đã đọc" của cô và của gia đình giữ nguyên', JSON.stringify(tvSau) === JSON.stringify(tvTruoc),
      { truoc: tvTruoc, sau: tvSau });

    // Gia đình nhắn tiếp: chấm đỏ của quản lý KHÔNG được tăng vì cuộc này.
    await gui(PH, KENH, 'Dạ chiều nay bé đỡ sốt rồi ạ');
    check('chấm đỏ của ban giám hiệu không cộng tin của kênh cô', (await huyHieu(QT)) === hhQT0,
      { truoc: hhQT0, sau: await huyHieu(QT) });
    check('chấm đỏ của văn phòng cơ sở cũng vậy', (await huyHieu(VP1)) === hhVP10,
      { truoc: hhVP10, sau: await huyHieu(VP1) });
    const dsQT = (await req('GET', '/api/messages', { cookie: QT })).data?.conversations || [];
    check('và cuộc ấy KHÔNG nằm trong danh sách Nhắn tin thường của quản lý',
      !dsQT.some(c => c.id === KENH), dsQT.map(c => c.id));
    check('cô vẫn thấy tin mới là CHƯA ĐỌC — người xem không đọc hộ',
      ((await req('GET', '/api/messages', { cookie: GV })).data?.conversations || [])
        .find(c => c.id === KENH)?.unreadCount === 1);
  }

  // =========================================================================
  console.log('\n[4] Lọc theo cơ sở → nhóm → bé, trong đúng phạm vi');
  {
    const r = await dsCuoc(QT, 'classId=c1');
    const dong = (r.data?.cuoc || []).find(c => c.id === KENH);
    check('ban giám hiệu thấy cuộc trong danh sách của nhóm Chồi 2', r.status === 200 && !!dong, r.data);
    check('dòng nói rõ bé, kênh với cô nào',
      /Nguyễn Bảo An/.test(dong?.tenBe || '') && dong?.tenKenh === 'Cô phụ trách nhóm', dong);
    check('kèm số tin và lúc có tin cuối', dong?.soTin === soTinTruoc + 1 && !!dong?.tinCuoiLuc, dong);
    check('không chép nội dung tin ra danh sách', !JSON.stringify(r.data).includes('sốt'));
    const theoBe = await dsCuoc(QT, 'classId=c1&studentId=s3');
    check('lọc đến bé khác thì không còn cuộc của bé s1',
      theoBe.status === 200 && !(theoBe.data?.cuoc || []).some(c => c.id === KENH), theoBe.data);
    const ql2 = await dsCuoc(QL2, 'classId=c1');
    check('quản lý cơ sở 2 hỏi nhóm của cơ sở 1 → 403', ql2.status === 403, ql2.status);
    check('quản lý cơ sở 2 hỏi bé cơ sở 1 → 403', (await dsCuoc(QL2, 'studentId=s1')).status === 403);
    check('quản lý cơ sở 2 hỏi nhóm của mình thì được', (await dsCuoc(QL2, 'classId=c3')).status === 200);
    check('cô không dùng được danh sách này', (await dsCuoc(GV, 'classId=c1')).status === 403);
    check('chưa chọn nhóm hay bé → 400', (await dsCuoc(QT, '')).status === 400);

    const chonQL2 = (await req('GET', '/api/messages/chon-be', { cookie: QL2 })).data || {};
    check('ô chọn của quản lý cơ sở 2 chỉ có cơ sở 2',
      (chonQL2.coSo || []).map(c => c.id).join() === 'cs2', chonQL2.coSo);
    check('và chỉ nhóm của cơ sở 2', (chonQL2.nhom || []).every(n => n.coSo === 'cs2') && (chonQL2.nhom || []).length >= 1, chonQL2.nhom);
    check('không một bé nào của cơ sở 1', !(chonQL2.be || []).some(b => ['c1', 'c2', 'c4'].includes(b.nhom)), chonQL2.be);
    const chonQT = (await req('GET', '/api/messages/chon-be', { cookie: QT })).data || {};
    check('ô chọn của ban giám hiệu có cả hai cơ sở',
      ['cs1', 'cs2'].every(id => (chonQT.coSo || []).some(c => c.id === id)), chonQT.coSo);
    check('có bé s1 kèm nhóm của bé', (chonQT.be || []).some(b => b.id === 's1' && b.nhom === 'c1'), chonQT.be);
    check('kế toán không mở được ô chọn', (await req('GET', '/api/messages/chon-be', { cookie: KT })).status === 403);
    check('gia đình không mở được ô chọn', (await req('GET', '/api/messages/chon-be', { cookie: PH })).status === 403);
  }

  // =========================================================================
  console.log('\n[5] Cuộc đã đóng: văn phòng cơ sở vẫn không có đường vào kho lưu (Đ192)');
  {
    const dong = await req('POST', `/api/messages/${KENH}/dong`, { cookie: QT, body: { lyDo: 'thử' } });
    check('đối chứng — ban giám hiệu đóng được cuộc', dong.status === 200, dong.data);
    check('ban giám hiệu vẫn xem được', (await xem(QT, KENH)).status === 200);
    check('văn phòng cơ sở KHÔNG xem được cuộc đã đóng', (await xem(VP1, KENH)).status === 404);
    const ds = (await dsCuoc(VP1, 'classId=c1')).data?.cuoc || [];
    check('và không thấy nó trong danh sách', !ds.some(c => c.id === KENH), ds.map(c => c.id));
    const dsQT = (await dsCuoc(QT, 'classId=c1')).data?.cuoc || [];
    check('ban giám hiệu thấy nó, kèm dấu đã đóng', dsQT.find(c => c.id === KENH)?.daDong === true, dsQT);
    await req('POST', `/api/messages/${KENH}/mo-lai`, { cookie: QT });
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Quản lý xem hội thoại cô – gia đình (F1)');
