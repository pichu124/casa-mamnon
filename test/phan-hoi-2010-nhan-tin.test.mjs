// Bài canh NHẮN TIN theo góp ý của trường 20/10 (Đ241c — F5, F6).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin.test.mjs
//
// F5 — gia đình nhắn tới mà cô / văn phòng KHÔNG thấy số đỏ ở ô Nhắn tin trên
// trang chủ và thanh dưới; phải tự mở màn Nhắn tin mới thấy. Gốc: hàng thành
// viên của người nhận chỉ được ghi khi CHÍNH họ mở màn Nhắn tin, mà huy hiệu
// đếm qua hàng thành viên. Bài này đo đúng điều người dùng thấy: cô CHƯA TỪNG
// mở màn Nhắn tin, gia đình gửi một tin, huy hiệu của cô phải tăng — và chỉ
// của đúng cô đó, không lan sang cô nhóm khác hay văn phòng cơ sở khác.
//
// F6 — đầu mối "Cô nước ngoài" của một nhóm CHƯA có cô nào giữ vai ấy: tin gửi
// vào đó không ai đọc được. Máy chủ phải từ chối gửi, nói tiếng Việt dễ hiểu,
// và tin cũ đã có vẫn đọc được.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, goCoNuocNgoaiMau,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng NT', 'nt_qt');
const mkCS2 = taoQuanTri(DIR, 'Văn phòng CS2 NT', 'nt_cs2');
khoaVaoCoSo(DIR, 'nt_cs2', 'cs2');

const CSDL = path.join(DIR, 'school.db');
function hoi(sql, ...thamSo) {
  const conn = new Database(CSDL);
  try { return conn.prepare(sql).all(...thamSo); } finally { conn.close(); }
}
// Từ Đ242F — F6b dữ liệu mẫu cho MỖI nhóm một cô nước ngoài (chủ dự án 26/10:
// "lớp nào cũng có cô nước ngoài"). Mục [4] canh đúng ca "lỡ chưa phân cô", nên
// tự gỡ cô nước ngoài khỏi nhóm Lá 1 (c2) để dựng lại ca ấy.
goCoNuocNgoaiMau(DIR, ['c2']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4973), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('nt_qt', mkQT);           // ban giám hiệu, cả trường
  const CS2 = await vao('nt_cs2', mkCS2);        // văn phòng cơ sở 2
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — nhóm c1 (cơ sở 1)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — nhóm c2
  const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — c1 và c2
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — s1 (c1), s2 (c2)

  // CHỈ ĐỌC HUY HIỆU. Không ai trong bài này gọi GET /api/messages trước khi đo
  // — gọi là tự tay ghi hàng thành viên, tức là che đúng lỗi đang đo.
  const huyHieu = async (cookie) =>
    Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.nhantin || 0);
  const mo = (cookie, kenh, studentId) =>
    req('POST', '/api/messages/start', { cookie, body: { kenh, studentId } });
  const gui = (cookie, id, text) => req('POST', `/api/messages/${id}`, { cookie, body: { text } });

  // =========================================================================
  console.log('\n[1] F5 — gia đình nhắn cô phụ trách nhóm: cô CHƯA mở Nhắn tin vẫn thấy số đỏ');
  {
    const truoc = { GV: await huyHieu(GV), GV2: await huyHieu(GV2), GV3: await huyHieu(GV3), QT: await huyHieu(QT) };
    const r = await mo(PH, 'nhom', 's1');
    check('gia đình mở được kênh với cô phụ trách nhóm', r.status === 200 && !!r.data?.id, r.data);
    const g = await gui(PH, r.data.id, 'Cô ơi chiều nay bà ngoại đón bé An ạ.');
    check('gửi được tin', g.status === 200, g.data);

    const sau = { GV: await huyHieu(GV), GV2: await huyHieu(GV2), GV3: await huyHieu(GV3), QT: await huyHieu(QT) };
    check('CÔ PHỤ TRÁCH NHÓM c1 thấy số đỏ tăng 1 dù chưa từng mở màn Nhắn tin',
      sau.GV === truoc.GV + 1, { truoc, sau });
    check('cô thứ hai cùng nhóm (cũng phụ trách) cũng thấy', sau.GV3 === truoc.GV3 + 1, { truoc, sau });
    check('cô CHỈ ở nhóm khác KHÔNG thấy gì tăng', sau.GV2 === truoc.GV2, { truoc, sau });
    check('văn phòng KHÔNG đếm tin trong kênh của cô', sau.QT === truoc.QT, { truoc, sau });
    const tv = hoi('SELECT userId FROM conversation_members WHERE conversationId = ?', r.data.id)
      .map(x => x.userId).sort();
    check('hàng thành viên chỉ gồm gia đình và đúng hai cô của nhóm',
      JSON.stringify(tv) === JSON.stringify(['p1', 't1', 't3']), tv);

    const doc = await req('GET', `/api/messages/${r.data.id}`, { cookie: GV });
    check('cô mở cuộc ra đọc được tin', doc.status === 200
      && (doc.data.messages || []).some(m => /bà ngoại/.test(m.text)), doc.status);
    check('đọc xong thì số đỏ của cô về như cũ', (await huyHieu(GV)) === truoc.GV);

    // Chiều ngược lại vẫn như cũ: cô trả lời thì gia đình thấy số đỏ.
    const ph0 = await huyHieu(PH);
    check('cô trả lời được', (await gui(GV, r.data.id, 'Dạ cô nhớ rồi ạ.')).status === 200);
    check('gia đình thấy số đỏ của câu trả lời', (await huyHieu(PH)) === ph0 + 1);
  }

  // =========================================================================
  console.log('\n[2] F5 — gia đình nhắn văn phòng: văn phòng đúng cơ sở thấy, cơ sở khác thì không');
  {
    const truoc = { QT: await huyHieu(QT), CS2: await huyHieu(CS2), GV: await huyHieu(GV) };
    const r = await mo(PH, 'vanphong', 's1');
    check('gia đình mở được hộp thư văn phòng', r.status === 200 && !!r.data?.id, r.data);
    check('gửi được tin', (await gui(PH, r.data.id, 'Văn phòng ơi cho em hỏi học phí tháng này ạ.')).status === 200);
    const sau = { QT: await huyHieu(QT), CS2: await huyHieu(CS2), GV: await huyHieu(GV) };
    check('BAN GIÁM HIỆU thấy số đỏ dù chưa từng mở màn Nhắn tin', sau.QT === truoc.QT + 1, { truoc, sau });
    check('văn phòng CƠ SỞ KHÁC không thấy', sau.CS2 === truoc.CS2, { truoc, sau });
    check('cô cũng không thấy — gia đình nói với văn phòng', sau.GV === truoc.GV, { truoc, sau });
    const tv = hoi('SELECT userId FROM conversation_members WHERE conversationId = ?', r.data.id).map(x => x.userId);
    check('văn phòng cơ sở 2 KHÔNG được ghi vào cuộc của cơ sở 1',
      !tv.some(id => hoi("SELECT 1 FROM users WHERE id = ? AND username = 'nt_cs2'", id).length), tv);
  }

  // =========================================================================
  console.log('\n[3] F5 — kênh cô nước ngoài: đúng cô giữ vai ấy thấy, cô phụ trách thì không');
  let KENH_NN = '';
  {
    const dat = await req('PUT', '/api/admin/classes/c1/teachers', {
      cookie: QT, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'nuoc-ngoai' } },
    });
    check('khai được cô t3 là cô nước ngoài của nhóm c1', dat.status === 200, dat.data);
    const truoc = { GV: await huyHieu(GV), GV3: await huyHieu(GV3), GV2: await huyHieu(GV2) };
    const r = await mo(PH, 'nuoc-ngoai', 's1');
    check('gia đình mở được kênh cô nước ngoài', r.status === 200 && !!r.data?.id, r.data);
    KENH_NN = r.data.id;
    check('gửi được tin', (await gui(PH, KENH_NN, 'Teacher ơi bé An học Cambridge thế nào ạ?')).status === 200);
    const sau = { GV: await huyHieu(GV), GV3: await huyHieu(GV3), GV2: await huyHieu(GV2) };
    check('CÔ NƯỚC NGOÀI thấy số đỏ dù chưa mở màn Nhắn tin', sau.GV3 === truoc.GV3 + 1, { truoc, sau });
    check('cô phụ trách nhóm KHÔNG đếm tin của kênh nước ngoài', sau.GV === truoc.GV, { truoc, sau });
    check('cô nhóm khác KHÔNG đếm', sau.GV2 === truoc.GV2, { truoc, sau });
  }

  // =========================================================================
  console.log('\n[4] F6 — nhóm chưa có cô nước ngoài: không gửi được vào khoảng không');
  {
    const lh = (await req('GET', '/api/messages', { cookie: PH })).data?.contacts || [];
    const nnS2 = lh.find(c => c.kenh === 'nuoc-ngoai' && c.studentId === 's2');
    const nnS1 = lh.find(c => c.kenh === 'nuoc-ngoai' && c.studentId === 's1');
    check('liên hệ cô nước ngoài của nhóm CHƯA có cô (c2) mang cờ chưa có người nhận',
      nnS2 && nnS2.coNguoiNhan === false, nnS2);
    check('liên hệ cô nước ngoài của nhóm ĐÃ có cô (c1) thì có người nhận',
      nnS1 && nnS1.coNguoiNhan === true, nnS1);
    check('liên hệ cô phụ trách nhóm vẫn có người nhận',
      lh.filter(c => c.kenh === 'nhom').every(c => c.coNguoiNhan === true), lh.filter(c => c.kenh === 'nhom'));

    const r = await mo(PH, 'nuoc-ngoai', 's2');
    check('mở kênh cô nước ngoài ở nhóm chưa có cô thì máy chủ từ chối',
      r.status === 409, { status: r.status, data: r.data });
    check('lời từ chối bằng tiếng Việt, nói rõ chuyện gì và chỉ đường khác',
      /chưa có cô nước ngoài/i.test(r.data?.error || '') && /văn phòng|cô phụ trách/i.test(r.data?.error || ''),
      r.data?.error);
    check('và KHÔNG sinh ra kênh trống nào',
      hoi("SELECT * FROM kenh_hoi_thoai WHERE studentId = 's2' AND loai = 'nuoc-ngoai'").length === 0);

    // Trường gỡ vai nước ngoài khỏi nhóm c1: kênh cũ vẫn đọc được, chỉ thôi gửi.
    const go = await req('PUT', '/api/admin/classes/c1/teachers', {
      cookie: QT, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'chu-nhiem' } },
    });
    check('gỡ được vai nước ngoài khỏi nhóm c1', go.status === 200, go.data);
    const lai = await mo(PH, 'nuoc-ngoai', 's1');
    check('bấm lại đầu mối ấy vẫn mở đúng cuộc cũ', lai.status === 200 && lai.data?.id === KENH_NN, lai.data);
    const doc = await req('GET', `/api/messages/${KENH_NN}`, { cookie: PH });
    check('TIN CŨ VẪN ĐỌC ĐƯỢC', doc.status === 200
      && (doc.data.messages || []).some(m => /Cambridge/.test(m.text)), doc.status);
    const soTin = hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', KENH_NN)[0].n;
    const g = await gui(PH, KENH_NN, 'Teacher ơi còn đó không ạ?');
    check('nhưng gửi thêm thì máy chủ từ chối', g.status === 409, { status: g.status, data: g.data });
    check('lời từ chối bằng tiếng Việt dễ hiểu', /chưa có cô nước ngoài/i.test(g.data?.error || ''), g.data?.error);
    check('và không có tin nào lọt vào cuộc',
      hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', KENH_NN)[0].n === soTin);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
