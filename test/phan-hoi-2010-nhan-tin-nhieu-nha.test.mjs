// Bài canh CÔ NHẮN NHIỀU GIA ĐÌNH MỘT LƯỢT (Đ242F, góp ý 20/10 mục F2) và
// VĂN PHÒNG MỞ TIN VỚI GIA ĐÌNH (mục F3).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-nhieu-nha.test.mjs
//
// F2: cô chọn nhiều bé trong nhóm mình, viết một tin, bấm gửi → MỖI gia đình
// nhận trong CUỘC RIÊNG của nhà mình với cô (đúng kênh cô hiện có, lập cuộc nếu
// chưa có). Các nhà KHÔNG thấy tên nhau — nên KHÔNG dùng phòng chung. Mỗi bé
// kiểm quyền riêng; trả về số nhà đã gửi và nhà nào không gửi được kèm lý do.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-nhieu-nha');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng NN', 'nn_bgh');

const CSDL = path.join(DIR, 'school.db');
function hoi(sql, ...thamSo) {
  const conn = new Database(CSDL);
  try { return conn.prepare(sql).all(...thamSo); } finally { conn.close(); }
}
{
  // Một bé ở Chồi 2 CHƯA có tài khoản gia đình nào.
  const c = new Database(CSDL);
  const nam = Number(HOM_NAY().slice(0, 4));
  c.prepare(`INSERT INTO students (id, name, dob, gender, classId, active, createdAt)
             VALUES ('s_mo_coi', 'Trần Bé Mới', ?, 'Nam', 'c1', 1, ?)`)
    .run(`${nam - 4}-03-01`, new Date().toISOString());
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7102), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d0 = await login('nn_bgh', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('nn_bgh', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — Chồi 2 (c1)
  const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — c1 và c2
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — s1 (c1), s2 (c2)
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — s3 (c1)
  const PH3 = (await login('ph.tuan', '123456')).cookie;    // p3 — s4 (c1), s8 (c2)

  const guiNhieu = (cookie, studentIds, text) =>
    req('POST', '/api/messages/gui-nhieu-nha', { cookie, body: { studentIds, text } });
  const dsHT = async (cookie) => (await req('GET', '/api/messages', { cookie })).data?.conversations || [];
  const huyHieu = async (cookie) =>
    Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.nhantin || 0);
  const kenhCua = (sid) => hoi("SELECT conversationId FROM kenh_hoi_thoai WHERE studentId = ? AND loai = 'nhom'", sid);

  // Nhà bé s1 đã có cuộc với cô từ trước — gửi nhiều nhà phải dùng ĐÚNG cuộc ấy.
  const CU_S1 = (await req('POST', '/api/messages/start', { cookie: PH, body: { kenh: 'nhom', studentId: 's1' } })).data?.id;
  await req('POST', `/api/messages/${CU_S1}`, { cookie: PH, body: { text: 'Dạ chào cô ạ' } });
  await req('GET', `/api/messages/${CU_S1}`, { cookie: PH });
  const soPhongChung = () => hoi("SELECT COUNT(*) AS n FROM conversations WHERE type = 'group'")[0].n;
  const phongChung0 = soPhongChung();
  const hhPH0 = await huyHieu(PH);
  const hhPH30 = await huyHieu(PH3);
  const chuong0 = hoi("SELECT COUNT(*) AS n FROM thongbao_be WHERE loai = 'tin-nhan'")[0].n;

  // =========================================================================
  console.log('\n[1] Ô chọn của cô: đúng các bé trong nhóm cô phụ trách');
  {
    const r = await req('GET', '/api/messages/chon-be', { cookie: GV });
    check('cô mở được ô chọn', r.status === 200, r.status);
    check('chỉ nhóm Chồi 2', (r.data?.nhom || []).map(n => n.id).join() === 'c1', r.data?.nhom);
    const ma = (r.data?.be || []).map(b => b.id);
    check('có các bé của Chồi 2', ['s1', 's3', 's4', 's_mo_coi'].every(id => ma.includes(id)), ma);
    check('không bé nào của nhóm khác', !ma.includes('s2') && !ma.includes('s8'), ma);
    check('bé chưa có tài khoản gia đình được đánh dấu',
      (r.data?.be || []).find(b => b.id === 's_mo_coi')?.coGiaDinh === false, r.data?.be);
    const r3 = await req('GET', '/api/messages/chon-be', { cookie: GV3 });
    check('cô phụ trách hai nhóm thấy cả hai', ['c1', 'c2'].every(id => (r3.data?.nhom || []).some(n => n.id === id)), r3.data?.nhom);
    check('gia đình không mở được ô chọn', (await req('GET', '/api/messages/chon-be', { cookie: PH })).status === 403);
  }

  // =========================================================================
  console.log('\n[2] Cô gửi MỘT tin cho NHIỀU nhà — mỗi nhà một cuộc riêng');
  const TIN = 'Ngày mai nhóm mình đi dã ngoại, gia đình cho bé mang mũ giúp cô ạ';
  let kq;
  {
    const r = await guiNhieu(GV, ['s1', 's3', 's4', 's2', 's_mo_coi', 'khong_co_that', 's1'], TIN);
    kq = r.data || {};
    check('gửi được', r.status === 200, r.data);
    check('ĐÚNG ba nhà nhận (s1, s3, s4)', kq.soNha === 3
      && (kq.daGui || []).map(x => x.studentId).sort().join() === 's1,s3,s4', kq);
    const ko = Object.fromEntries((kq.khongGui || []).map(x => [x.studentId, x]));
    check('bé nhóm khác: không gửi, có lý do', /không thuộc nhóm/.test(ko.s2?.lyDo || ''), ko.s2);
    check('và KHÔNG lộ tên bé ngoài tầm', !ko.s2?.ten, ko.s2);
    check('mã không có thật: không gửi, có lý do', !!ko.khong_co_that?.lyDo, ko.khong_co_that);
    check('bé chưa có tài khoản gia đình: không gửi, nói rõ', /chưa có tài khoản gia đình/.test(ko.s_mo_coi?.lyDo || ''), ko.s_mo_coi);
    check('bé gửi trùng hai lần chỉ tính một', (kq.daGui || []).filter(x => x.studentId === 's1').length === 1);

    check('nhà s1 dùng ĐÚNG cuộc đã có, không đẻ cuộc mới',
      kenhCua('s1').length === 1 && kenhCua('s1')[0].conversationId === CU_S1, kenhCua('s1'));
    check('nhà s3 và s4 được lập cuộc riêng', kenhCua('s3').length === 1 && kenhCua('s4').length === 1);
    const ba = ['s1', 's3', 's4'].map(s => kenhCua(s)[0]?.conversationId);
    check('ba nhà, BA cuộc khác nhau', new Set(ba).size === 3, ba);
    check('KHÔNG lập phòng chung nào', soPhongChung() === phongChung0);
    check('không lập cuộc nào cho bé nhóm khác', kenhCua('s2').length === 0);
    for (const ma of ba) {
      const tin = hoi('SELECT text, senderId FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT 1', ma)[0];
      check(`cuộc ${ma}: tin cuối là tin của cô`, tin?.text === TIN && tin?.senderId === 't1', tin);
    }
    const phCuoc = (ma) => hoi(`SELECT cm.userId FROM conversation_members cm JOIN users u ON u.id = cm.userId
                                 WHERE cm.conversationId = ? AND u.role = 'parent'`, ma).map(r => r.userId).sort().join();
    check('cuộc của s3 chỉ có gia đình s3', phCuoc(ba[1]) === 'p2', phCuoc(ba[1]));
    check('cuộc của s4 chỉ có gia đình s4', phCuoc(ba[2]) === 'p3', phCuoc(ba[2]));
  }

  // =========================================================================
  console.log('\n[3] Phía gia đình: mỗi nhà thấy tin trong cuộc của mình, không thấy nhà khác');
  {
    const d1 = await dsHT(PH);
    const c1 = d1.find(c => c.id === CU_S1);
    check('nhà s1 thấy tin mới trong cuộc với cô', c1?.lastMessage?.text === TIN, c1);
    check('và tin ấy CHƯA ĐỌC', c1?.unreadCount === 1, c1?.unreadCount);
    check('huy hiệu tăng một', (await huyHieu(PH)) === hhPH0 + 1);
    check('huy hiệu nhà s4 cũng tăng', (await huyHieu(PH3)) === hhPH30 + 1);
    const tenNhaKhac = ['Phạm Gia Hân', 'Vũ Đức Anh', 'Phạm Quốc Bảo', 'Vũ Anh Tuấn'];
    check('danh sách của nhà s1 không nêu tên nhà khác hay bé khác',
      !tenNhaKhac.some(t => JSON.stringify(d1).includes(t)), d1.map(c => `${c.title} | ${c.subtitle}`));
    const mo = await req('GET', `/api/messages/${CU_S1}`, { cookie: PH });
    check('mở cuộc ra không nêu tên nhà khác', !tenNhaKhac.some(t => JSON.stringify(mo.data).includes(t)));
    const ma3 = kenhCua('s3')[0].conversationId;
    check('nhà s1 KHÔNG đọc được cuộc của nhà s3', (await req('GET', `/api/messages/${ma3}`, { cookie: PH })).status === 403);
    const d2 = await dsHT(PH2);
    check('nhà s3 thấy cuộc của mình với tin của cô', d2.some(c => c.id === ma3 && c.lastMessage?.text === TIN));
    check('mỗi nhà một dòng chuông riêng của bé',
      hoi("SELECT COUNT(*) AS n FROM thongbao_be WHERE loai = 'tin-nhan'")[0].n === chuong0 + 3);
    const coDs = await dsHT(GV);
    check('cô thấy ba cuộc, đã đọc (tin của chính cô)',
      ['s1', 's3', 's4'].every(s => coDs.some(c => c.id === kenhCua(s)[0].conversationId && c.unreadCount === 0)));
  }

  // =========================================================================
  console.log('\n[4] Từ chối rõ ràng, và các vai khác');
  {
    check('nội dung trống → 400', (await guiNhieu(GV, ['s1'], '   ')).status === 400);
    check('chưa chọn bé nào → 400', (await guiNhieu(GV, [], 'a')).status === 400);
    check('gia đình không dùng được đường này', (await guiNhieu(PH, ['s1'], 'a')).status === 403);

    // Cô thể chất ở một nhóm: không có kênh nhắn tin ở nhóm đó.
    const dat = await req('PUT', '/api/admin/classes/c2/teachers', {
      cookie: QT, body: { teacherIds: ['t2', 't3'], nhom: { t3: 'the-chat' } },
    });
    check('đối chứng — khai được cô 3 là cô thể chất ở Lá 1', dat.status === 200, dat.data);
    const r = await guiNhieu(GV3, ['s2', 's1'], 'Tin của cô 3');
    const ko = Object.fromEntries((r.data?.khongGui || []).map(x => [x.studentId, x]));
    check('bé Lá 1 (cô là cô thể chất): không gửi, nói rõ vì vai', /vai/.test(ko.s2?.lyDo || ''), r.data);
    check('bé Chồi 2 (cô là chủ nhiệm): gửi được', (r.data?.daGui || []).some(x => x.studentId === 's1'), r.data);
    check('không lập kênh nào cho bé Lá 1', kenhCua('s2').length === 0);

    // Cuộc đã đóng: không gửi vào được, nói rõ.
    const ma4 = kenhCua('s4')[0].conversationId;
    await req('POST', `/api/messages/${ma4}/dong`, { cookie: QT, body: {} });
    const soTin4 = hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', ma4)[0].n;
    const rd = await guiNhieu(GV, ['s4', 's3'], 'Tin sau khi đóng');
    check('cuộc đã đóng: không gửi, nói rõ', /đã đóng/.test((rd.data?.khongGui || []).find(x => x.studentId === 's4')?.lyDo || ''), rd.data);
    check('và không thêm tin vào cuộc đã đóng', hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', ma4)[0].n === soTin4);
    check('các nhà khác vẫn nhận', rd.data?.soNha === 1);
    check('nhật ký ghi lượt gửi nhiều nhà',
      hoi("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tin-nhan-gui-nhieu-nha'")[0].n >= 3);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Nhắn nhiều gia đình một lượt (F2)');
