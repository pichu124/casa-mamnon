// Bài canh các lỗi thông báo và nhắn tin của đợt kiểm thử thay trường R4 (Đ261c).
//
// Chạy bằng:  node test/kiem-thu-r4-tin.test.mjs
//
//   [1] B3 — văn phòng, quản lý cơ sở KHÔNG sửa được chữ trong thông báo nhóm
//       do cô gửi (gia đình đọc dưới tên cô). Vẫn ghim, vẫn thu hồi được. Tin
//       toàn trường giữ nguyên luật cũ (L12).
//   [2] Đường cũ POST /api/messages/phong-chung (không còn nút) ngừng lập
//       phòng mới; phòng cũ vẫn đọc được, và gia đình hiện là "Mẹ bé …".
//   [3] L34 — bé chuyển nhóm: tin MỚI của gia đình tới cô nhóm mới, cô nhóm
//       cũ không nhận và không đọc được; tin trước ngày chuyển vẫn còn.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('kiem-thu-r4-tin');
sinhDuLieu(DIR);
const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng T', 't_ht'),
  vp: taoQuanTri(DIR, 'Văn Phòng T', 't_vp'),
  ql: taoQuanTri(DIR, 'Quản Lý T', 't_ql'),
};
datChucVu(DIR, 't_ht', 'hieu-truong');
datChucVu(DIR, 't_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 't_vp', 'cs1');
datChucVu(DIR, 't_ql', 'quanly-coso');
khoaVaoCoSo(DIR, 't_ql', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7120), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const sql = (cau, ...tham) => {
  const c = new Database(path.join(DIR, 'school.db'));
  try {
    const st = c.prepare(cau);
    return st.reader ? st.all(...tham) : st.run(...tham);
  } finally { c.close(); }
};

try {
  const vao = async (ten) => {
    const d = await login(`t_${ten}`, mk[ten]);
    await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
    return (await login(`t_${ten}`, 'quantri2026')).cookie;
  };
  const HT = await vao('ht');
  const VP = await vao('vp');
  const QL = await vao('ql');
  const GV = (await login('giaovien', '123456')).cookie;     // t1 — cô chủ nhiệm Chồi 2 (c1)
  const GV2 = (await login('giaovien2', '123456')).cookie;   // t2 — cô chủ nhiệm Lá 1 (c2)
  const PH1 = (await login('phuhuynh', '123456')).cookie;    // p1 — con s1 ở c1
  const PH4 = (await login('ph.lan', '123456')).cookie;      // p4 — con s5 ở c1

  // =========================================================================
  console.log('\n[1] B3 — CHỮ TRONG TIN NHÓM CỦA CÔ CHỈ CÔ (HOẶC BAN GIÁM HIỆU) SỬA');
  {
    const gui = async (body) => req('POST', '/api/notifications', {
      cookie: GV, body: { title: 'Nhóm Chồi 2 đi dã ngoại', body, category: 'Nhóm lớp', audience: 'class' },
    });
    const t1 = await gui('Thứ Sáu nhóm mình đi vườn bách thảo, gia đình cho bé mang mũ nhé.');
    check('cô gửi được thông báo cho nhóm', t1.status === 201, t1.status);
    const id = t1.data?.id;

    const vp = await req('PUT', `/api/notifications/${id}`, { cookie: VP, body: { body: 'Văn phòng viết đè lời cô.' } });
    check('VĂN PHÒNG KHÔNG SỬA ĐƯỢC CHỮ TRONG TIN CÔ GỬI', vp.status === 403, vp.status);
    check('và câu từ chối nói rõ ai sửa được, văn phòng làm được gì',
      /người gửi hoặc ban giám hiệu/.test(vp.data?.error || '') && /thu hồi/.test(vp.data?.error || ''), vp.data);
    const ql = await req('PUT', `/api/notifications/${id}`, { cookie: QL, body: { title: 'Quản lý đổi tiêu đề' } });
    check('QUẢN LÝ CƠ SỞ CŨNG KHÔNG', ql.status === 403, ql.status);

    const ph = ((await req('GET', '/api/notifications', { cookie: PH1 })).data || []).find(n => n.id === id);
    check('gia đình vẫn đọc đúng lời cô, không có dấu "đã chỉnh sửa"',
      ph && ph.body.startsWith('Thứ Sáu') && ph.title === 'Nhóm Chồi 2 đi dã ngoại' && !ph.daSua, ph);

    const dongVp = ((await req('GET', '/api/notifications', { cookie: VP })).data || []).find(n => n.id === id);
    check('màn của văn phòng không vẽ nút "Sửa lại" (cờ suaNoiDungDuoc = false)',
      dongVp && dongVp.suaNoiDungDuoc === false, dongVp && dongVp.suaNoiDungDuoc);
    check('nhưng vẫn vẽ nút Thu hồi (coTheSua giữ nguyên)', dongVp && dongVp.coTheSua === true, dongVp && dongVp.coTheSua);

    const ghim = await req('PUT', `/api/notifications/${id}`, { cookie: VP, body: { pinned: true } });
    check('văn phòng VẪN GHIM được tin nhóm của cơ sở mình', ghim.status === 200, ghim.status);

    const co = await req('PUT', `/api/notifications/${id}`, { cookie: GV, body: { body: 'Thứ Sáu đi vườn bách thảo, cô nhắc mang mũ và nước nhé.' } });
    check('CÔ (người gửi) vẫn sửa được', co.status === 200, co.status);
    const dongGv = ((await req('GET', '/api/notifications', { cookie: GV })).data || []).find(n => n.id === id);
    check('và màn của cô có nút "Sửa lại"', dongGv && dongGv.suaNoiDungDuoc === true, dongGv && dongGv.suaNoiDungDuoc);
    const ht = await req('PUT', `/api/notifications/${id}`, { cookie: HT, body: { title: 'Nhóm Chồi 2 đi vườn bách thảo' } });
    check('BAN GIÁM HIỆU (cấp 1) vẫn sửa được', ht.status === 200, ht.status);

    const t2 = await gui('Tin thứ hai để thử thu hồi.');
    const th = await req('DELETE', `/api/notifications/${t2.data?.id}`, { cookie: VP });
    check('văn phòng VẪN THU HỒI được tin nhóm của cơ sở mình', th.status === 200, th.status);

    // L12: tin toàn trường — luật cũ không đổi trong đợt này.
    const tt = await req('POST', '/api/notifications', {
      cookie: HT, body: { title: 'Nghỉ lễ', body: 'Các bé nghỉ lễ hai ngày.', category: 'Nhà trường', audience: 'all' },
    });
    check('ban giám hiệu gửi được tin toàn trường', tt.status === 201, tt.status);
    const vpTt = await req('PUT', `/api/notifications/${tt.data?.id}`, { cookie: VP, body: { body: 'Các bé nghỉ lễ hai ngày, đi học lại thứ Hai.' } });
    check('tin TOÀN TRƯỜNG giữ đúng luật cũ L12 (văn phòng vẫn sửa được)', vpTt.status === 200, vpTt.status);
  }

  // =========================================================================
  console.log('\n[2] PHÒNG CHUNG KIỂU CŨ: NGỪNG LẬP MỚI, PHÒNG CŨ GIỮ NGUYÊN');
  {
    const tao = await req('POST', '/api/messages/phong-chung', {
      cookie: GV, body: { ten: 'Phòng kiểu cũ', thanhVien: ['p1', 'p4'] },
    });
    check('ĐƯỜNG CŨ KHÔNG LẬP PHÒNG MỚI NỮA (410)', tao.status === 410, tao.status);
    check('và chỉ sang nút đang có', /Tạo phòng trao đổi chung/.test(tao.data?.error || ''), tao.data);
    const soPhong = sql("SELECT COUNT(*) AS n FROM conversations WHERE name = 'Phòng kiểu cũ'")[0].n;
    check('không một dòng nào được ghi', soPhong === 0, soPhong);

    // Phòng cũ có sẵn từ trước (dựng thẳng trong bảng, đúng hình dạng đường cũ ghi).
    sql("INSERT INTO conversations (id, type, name, classId) VALUES ('cv_cu', 'group', 'Phòng cũ của nhóm', NULL)");
    for (const u of ['t1', 'p1', 'p4']) {
      sql("INSERT INTO conversation_members (conversationId, userId, lastRead) VALUES ('cv_cu', ?, NULL)", u);
    }
    sql(`INSERT INTO messages (id, conversationId, senderId, text, createdAt)
         VALUES ('ms_cu1', 'cv_cu', 'p4', 'Nhà em góp hai hộp bánh ạ.', '2026-01-05T08:00:00.000Z')`);

    const mo = await req('GET', '/api/messages/cv_cu', { cookie: PH1 });
    check('PHÒNG CŨ VẪN MỞ ĐƯỢC, tin cũ còn nguyên', mo.status === 200 && (mo.data?.messages || []).length === 1, mo.status);
    const tin = (mo.data?.messages || [])[0] || {};
    check('NHÀ KHÁC KHÔNG HIỆN HỌ TÊN ĐẦY ĐỦ nữa (không còn "Đỗ Ngọc Lan")',
      !JSON.stringify(mo.data).includes('Đỗ Ngọc Lan'), tin.senderName);
    check('mà hiện theo bé, như phòng trao đổi chung của nhóm ("… bé Đỗ Khánh Vy")',
      /bé Đỗ Khánh Vy$/.test(tin.senderName || ''), tin.senderName);
    const ds = ((await req('GET', '/api/messages', { cookie: PH1 })).data?.conversations || []).find(c => c.id === 'cv_cu');
    check('dòng xem trước trong danh sách cũng không lộ họ tên',
      ds && !JSON.stringify(ds).includes('Đỗ Ngọc Lan'), ds && ds.lastMessage);
    const g = await req('POST', '/api/messages/cv_cu', { cookie: PH1, body: { text: 'Nhà em góp nước ạ.' } });
    check('phòng cũ vẫn nhắn tiếp được (không đổi hành vi phòng đang có)', g.status === 200, g.status);
    const cuaCo = (((await req('GET', '/api/messages/cv_cu', { cookie: GV })).data?.messages) || []).find(m => m.id === g.data?.id);
    check('cô cũng thấy nhãn theo bé thay cho họ tên', cuaCo && /bé Nguyễn Bảo An/.test(cuaCo.senderName || ''), cuaCo);
  }

  // =========================================================================
  console.log('\n[3] L34 — BÉ CHUYỂN NHÓM: TIN MỚI TỚI CÔ NHÓM MỚI, KHÔNG TỚI CÔ CŨ');
  {
    const moA = await req('POST', '/api/messages/start', { cookie: PH4, body: { kenh: 'nhom', studentId: 's5' } });
    check('gia đình bé Khánh Vy mở được kênh với cô nhóm Chồi 2', moA.status === 200 && !!moA.data?.id, moA.status);
    const cvA = moA.data?.id;
    await req('POST', `/api/messages/${cvA}`, { cookie: PH4, body: { text: 'Tin TRƯỚC khi chuyển nhóm.' } });
    const truoc = ((await req('GET', `/api/messages/${cvA}`, { cookie: GV })).data?.messages || []).map(m => m.text);
    check('đối chứng — cô Chồi 2 đọc được tin trước khi chuyển', truoc.includes('Tin TRƯỚC khi chuyển nhóm.'), truoc);

    const chuyen = await req('PUT', '/api/admin/students/s5', { cookie: HT, body: { classId: 'c2' } });
    check('ban giám hiệu chuyển bé sang nhóm Lá 1', chuyen.status === 200, chuyen.status);
    const chuong = (uid) => sql(
      "SELECT COUNT(*) AS n, COALESCE(SUM(soLan), 0) AS lan FROM thongbao_nv WHERE userId = ? AND tieuDe LIKE '%Đỗ Khánh Vy%'", uid)[0];
    const chuongCo1 = chuong('t1');

    const vaoCu = await req('POST', `/api/messages/${cvA}`, { cookie: PH4, body: { text: 'Tin gửi nhầm vào cuộc cũ.' } });
    check('GIA ĐÌNH KHÔNG GỬI ĐƯỢC VÀO CUỘC CŨ của nhóm trước', vaoCu.status === 409, vaoCu.status);
    check('và câu từ chối chỉ đường sang cô nhóm mới', /nhóm mới/.test(vaoCu.data?.error || ''), vaoCu.data);
    const xemCu = await req('GET', `/api/messages/${cvA}`, { cookie: PH4 });
    check('gia đình vẫn đọc lại được cuộc cũ, màn hình nhận câu "chỉ còn để xem lại"',
      xemCu.status === 200 && /xem lại/.test(xemCu.data?.tamDung || ''), xemCu.data?.tamDung);

    const lienHe = ((await req('GET', '/api/messages', { cookie: PH4 })).data?.contacts || [])
      .find(c => c.kenh === 'nhom' && c.studentId === 's5');
    check('mục "Cô phụ trách nhóm" của bé KHÔNG còn trỏ vào cuộc cũ',
      lienHe && lienHe.existingConversationId !== cvA, lienHe);
    const moB = await req('POST', '/api/messages/start', { cookie: PH4, body: { kenh: 'nhom', studentId: 's5' } });
    check('MỞ LẠI KÊNH LÀ MỘT CUỘC MỚI VỚI NHÓM LÁ 1', moB.status === 200 && moB.data?.id && moB.data.id !== cvA, moB.data);
    const cvB = moB.data?.id;
    const g = await req('POST', `/api/messages/${cvB}`, { cookie: PH4, body: { text: 'Tin SAU khi chuyển nhóm.' } });
    check('gia đình gửi được vào cuộc mới', g.status === 200, g.status);

    const co2 = await req('GET', `/api/messages/${cvB}`, { cookie: GV2 });
    check('CÔ NHÓM MỚI ĐỌC ĐƯỢC TIN MỚI',
      co2.status === 200 && (co2.data?.messages || []).some(m => m.text === 'Tin SAU khi chuyển nhóm.'), co2.status);
    const co1Moi = await req('GET', `/api/messages/${cvB}`, { cookie: GV });
    check('CÔ NHÓM CŨ KHÔNG ĐỌC ĐƯỢC CUỘC MỚI', co1Moi.status === 403 || co1Moi.status === 404, co1Moi.status);
    const co1Cu = ((await req('GET', `/api/messages/${cvA}`, { cookie: GV })).data?.messages || []).map(m => m.text);
    check('cô nhóm cũ vẫn giữ tin TRƯỚC ngày chuyển', co1Cu.includes('Tin TRƯỚC khi chuyển nhóm.'), co1Cu);
    check('và không có tin nào SAU ngày chuyển trong cuộc cũ',
      !co1Cu.some(t => t.includes('SAU') || t.includes('nhầm')), co1Cu);
    const chuongCo1Sau = chuong('t1');
    check('CÔ NHÓM CŨ KHÔNG NHẬN CHUÔNG cho tin mới của gia đình',
      chuongCo1Sau.n === chuongCo1.n && chuongCo1Sau.lan === chuongCo1.lan, { truoc: chuongCo1, sau: chuongCo1Sau });
    check('đối chứng — cô nhóm mới thì có chuông', chuong('t2').n > 0, chuong('t2'));
    check('cô nhóm cũ cũng không gửi thêm vào cuộc cũ được',
      (await req('POST', `/api/messages/${cvA}`, { cookie: GV, body: { text: 'Cô cũ nhắn tiếp.' } })).status === 409);
    const dsCo2 = ((await req('GET', '/api/messages', { cookie: GV2 })).data?.conversations || []).map(c => c.id);
    check('cuộc mới nằm trong danh sách của cô nhóm mới', dsCo2.includes(cvB), dsCo2);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
