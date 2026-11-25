// Bài canh PHÒNG TRAO ĐỔI CHUNG CỦA NHÓM LỚP (Đ260k, góp ý 18/11).
//
// Chạy bằng:  node test/phan-hoi-1811-phong-nhom.test.mjs
//
// Nhà trường: *"Chưa biết cách tạo cuộc hội thoại nhóm, để cho phụ huynh khác
// cùng nhắn bàn bạc về 1 vấn đề chung của lớp."*
//
// Phòng chung là chỗ RÒ RỈ dễ nhất của phần nhắn tin: một gia đình lọt vào
// phòng của nhóm khác là đọc được mọi thứ hai mươi nhà nói với nhau. Nên bài
// này đo kỹ nhất phần AI VÀO ĐƯỢC, và đo cả lúc quyền ấy MẤT ĐI (bị bỏ khỏi
// phòng, con chuyển nhóm) — không chỉ lúc lập phòng.
import path from 'node:path';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, datChucVu, khoaVaoCoSo,
  taoBoDem, taoReq, taoLogin, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-phong-nhom');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng K', 'k_qt');
const mkQLA = taoQuanTri(DIR, 'Quản Lý A', 'k_qla');
datChucVu(DIR, 'k_qla', 'quanly-coso');
khoaVaoCoSo(DIR, 'k_qla', 'cs1');
const mkQLB = taoQuanTri(DIR, 'Quản Lý B', 'k_qlb');
datChucVu(DIR, 'k_qlb', 'quanly-coso');
khoaVaoCoSo(DIR, 'k_qlb', 'cs2');

const CSDL = path.join(DIR, 'school.db');
const hoi = (sql, ...ts) => {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
};
const ghi = (sql, ...ts) => {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
};

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5300), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function dangNhapQT(ten, mk) {
  const d = await login(ten, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(ten, 'quantri2026')).cookie;
}

try {
  const QT = await dangNhapQT('k_qt', mkQT);
  const QLA = await dangNhapQT('k_qla', mkQLA);
  const QLB = await dangNhapQT('k_qlb', mkQLB);
  const GV = (await login('giaovien', '123456')).cookie;      // t1, chủ nhiệm c1
  const GVNN = (await login('giaovien.nn', '123456')).cookie; // t5, cô nước ngoài c1
  const GV2 = (await login('giaovien2', '123456')).cookie;    // t2, chỉ c2
  const PH = (await login('phuhuynh', '123456')).cookie;      // p1: s1 (c1) + s2 (c2)
  const PH2 = (await login('phuhuynh2', '123456')).cookie;    // p2: s3 (c1)
  const PH4 = (await login('ph.lan', '123456')).cookie;       // p4: s5 (c1)
  const PH5 = (await login('ph.minh', '123456')).cookie;      // p5: s6 (c1)
  const PH6 = (await login('ph.huong', '123456')).cookie;     // p6: chỉ s7 (c2)
  check('đối chứng — đăng nhập đủ mọi vai', [QT, QLA, QLB, GV, GVNN, GV2, PH, PH2, PH4, PH5, PH6].every(Boolean));

  const soDienThoai = hoi("SELECT phone FROM users WHERE phone IS NOT NULL AND phone != ''").map(r => r.phone);
  check('đối chứng — dữ liệu mẫu có số điện thoại để mà canh', soDienThoai.length >= 5, soDienThoai.length);
  const coSoDienThoai = (x) => {
    const s = JSON.stringify(x);
    return /"phone"/.test(s) || soDienThoai.some(p => s.includes(p) || s.includes(p.replace(/\s/g, '')));
  };

  // =========================================================================
  console.log('\n[1] Cô lập phòng cho cả nhóm; cô thứ hai của nhóm tự có trong phòng');
  let cvId = '';
  {
    const moi = await req('GET', '/api/messages/phong-nhom/moi', { cookie: GV });
    check('cô hỏi được nhóm mình lập phòng được', moi.status === 200
      && (moi.data.nhom || []).some(n => n.id === 'c1'), moi.status);
    check('chỉ nhóm cô đang phụ trách', (moi.data.nhom || []).every(n => n.id === 'c1'), moi.data.nhom);
    const giaDinh = (moi.data.giaDinh || []).filter(g => g.classId === 'c1');
    check('kèm đủ gia đình của 5 bé nhóm Chồi 2', giaDinh.length === 5, giaDinh.map(g => g.id));
    check('gia đình hiện bằng nhãn "… bé …", không họ tên người lớn',
      giaDinh.every(g => / bé /.test(g.nhan)) && !JSON.stringify(moi.data).includes('Lê Thị Thu Hà'), giaDinh);
    check('KHÔNG có số điện thoại trong danh sách mời', !coSoDienThoai(moi.data));

    const tao = await req('POST', '/api/messages/phong-nhom', {
      cookie: GV, body: { classId: 'c1', ten: 'Bàn chuyện dã ngoại', phuHuynh: giaDinh.map(g => g.id) },
    });
    check('cô lập được phòng: 201', tao.status === 201 && tao.data?.id, tao);
    cvId = tao.data.id;
    const dong = hoi('SELECT * FROM phong_nhom WHERE conversationId = ?', cvId)[0];
    check('có dòng phong_nhom gắn đúng nhóm', dong && dong.classId === 'c1' && dong.taoBoi === 't1', dong);
    const cv = hoi('SELECT * FROM conversations WHERE id = ?', cvId)[0];
    check('hội thoại là loại group, gắn classId c1', cv && cv.type === 'group' && cv.classId === 'c1', cv);
    check('ghi nhật ký phong-nhom-tao',
      hoi("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'phong-nhom-tao' AND target = ?", cvId)[0].n === 1);

    const nn = await req('GET', `/api/messages/${cvId}`, { cookie: GVNN });
    check('cô nước ngoài của nhóm mở được phòng mà không ai mời', nn.status === 200, nn.status);
    check('và được quản phòng', nn.data?.phong?.quanLyDuoc === true, nn.data?.phong);
    const dsNN = await req('GET', '/api/messages', { cookie: GVNN });
    check('phòng hiện trong danh sách của cô nước ngoài',
      (dsNN.data.conversations || []).some(c => c.id === cvId));
    check('phụ đề nói tên nhóm và số thành viên',
      /Chồi 2.*thành viên/.test((dsNN.data.conversations || []).find(c => c.id === cvId)?.subtitle || ''),
      (dsNN.data.conversations || []).find(c => c.id === cvId)?.subtitle);
  }

  // =========================================================================
  console.log('\n[2] Gia đình đọc và nhắn được; nhà khác thấy nhãn "… bé …", không số điện thoại');
  {
    const g = await req('POST', `/api/messages/${cvId}`, { cookie: PH, body: { text: 'Cả nhà ơi mình góp quà Tết cho cô nhé' } });
    check('phụ huynh nhắn được vào phòng', g.status === 200, g.status);
    const xem = await req('GET', `/api/messages/${cvId}`, { cookie: PH2 });
    check('phụ huynh khác đọc được', xem.status === 200, xem.status);
    const tin = (xem.data.messages || []).find(m => m.text.includes('quà Tết'));
    check('tên người gửi là nhãn "Mẹ bé Nguyễn Bảo An"', tin && tin.senderName === 'Mẹ bé Nguyễn Bảo An', tin?.senderName);
    check('không lộ họ tên người lớn', !JSON.stringify(xem.data).includes('Lê Thị Thu Hà'));
    check('JSON không có số điện thoại', !coSoDienThoai(xem.data));
    check('phòng báo chưa khoá, gia đình không quản phòng',
      xem.data.phong && xem.data.phong.daKhoa === false && xem.data.phong.quanLyDuoc === false, xem.data.phong);
    check('nhãn bé chỉ nói bé ĐÚNG nhóm này (không kèm bé Nam ở Lá 1)',
      !JSON.stringify(xem.data).includes('Nguyễn Bảo Nam'));

    const tv = await req('GET', `/api/messages/${cvId}/thanh-vien`, { cookie: PH2 });
    check('gia đình xem được danh sách thành viên', tv.status === 200 && (tv.data.giaDinh || []).length === 5, tv.data);
    check('danh sách có các cô của nhóm', (tv.data.co || []).some(c => c.id === 't1') && (tv.data.co || []).some(c => c.id === 't5'), tv.data.co);
    check('gia đình không nhận danh sách "mời thêm"', !('moiThem' in (tv.data || {})) || !tv.data.moiThem?.length, tv.data.moiThem);
    check('danh sách thành viên không có số điện thoại', !coSoDienThoai(tv.data));

    const ds = await req('GET', '/api/messages', { cookie: PH2 });
    const dong = (ds.data.conversations || []).find(c => c.id === cvId);
    check('xem trước tin cuối dùng nhãn', dong && dong.lastMessage?.senderName === 'Mẹ bé Nguyễn Bảo An', dong?.lastMessage);
  }

  // =========================================================================
  console.log('\n[3] Gia đình nhóm khác bị chặn; gia đình không quản phòng');
  {
    const doc = await req('GET', `/api/messages/${cvId}`, { cookie: PH6 });
    check('phụ huynh chỉ có con ở Lá 1: GET 403', doc.status === 403, doc.status);
    const nhan = await req('POST', `/api/messages/${cvId}`, { cookie: PH6, body: { text: 'xin vào' } });
    check('và POST 403', nhan.status === 403, nhan.status);
    const tv = await req('GET', `/api/messages/${cvId}/thanh-vien`, { cookie: PH6 });
    check('và không xem được thành viên', tv.status === 403, tv.status);

    const lap = await req('POST', '/api/messages/phong-nhom', { cookie: PH, body: { classId: 'c1', ten: 'x', phuHuynh: ['p2'] } });
    check('phụ huynh không lập được phòng', lap.status === 403, lap.status);
    const moi = await req('GET', '/api/messages/phong-nhom/moi', { cookie: PH });
    check('phụ huynh không có danh sách mời', moi.status === 403, moi.status);
    const them = await req('POST', `/api/messages/${cvId}/thanh-vien`, { cookie: PH, body: { phuHuynh: ['p3'] } });
    check('phụ huynh không thêm được thành viên', them.status === 403, them.status);
    const doiTen = await req('PUT', `/api/messages/${cvId}/phong`, { cookie: PH, body: { ten: 'Phòng của tôi' } });
    check('phụ huynh không đổi tên phòng được', doiTen.status === 403, doiTen.status);
    check('tên phòng còn nguyên', hoi('SELECT name FROM conversations WHERE id = ?', cvId)[0].name === 'Bàn chuyện dã ngoại');
  }

  // =========================================================================
  console.log('\n[4] Cô nhóm khác bị chặn; không mời được gia đình nhóm khác');
  {
    const doc = await req('GET', `/api/messages/${cvId}`, { cookie: GV2 });
    check('cô Lá 1 không đọc được phòng Chồi 2', doc.status === 403, doc.status);
    const lap = await req('POST', '/api/messages/phong-nhom', { cookie: GV2, body: { classId: 'c1', ten: 'x', phuHuynh: ['p2'] } });
    check('cô Lá 1 không lập được phòng cho Chồi 2', lap.status === 403, lap.status);
    const lapLan = await req('POST', '/api/messages/phong-nhom', { cookie: GV, body: { classId: 'c1', ten: 'x', phuHuynh: ['p2', 'p6'] } });
    check('cô Chồi 2 không mời được gia đình chỉ có con ở Lá 1', lapLan.status === 403, lapLan.status);
    check('câu từ chối nói số tài khoản bị từ chối', /Có 1 tài khoản/.test(lapLan.data?.error || ''), lapLan.data);
    check('nhưng KHÔNG lộ tên bé hay người lớn của nhóm khác',
      !/Bùi Minh Thư|Bùi Thu Hương/.test(lapLan.data?.error || ''), lapLan.data);
    const them = await req('POST', `/api/messages/${cvId}/thanh-vien`, { cookie: GV, body: { phuHuynh: ['p6'] } });
    check('thêm thành viên cũng chặn gia đình nhóm khác', them.status === 403, them.status);
    check('p6 không có hàng thành viên', hoi('SELECT COUNT(*) AS n FROM conversation_members WHERE conversationId = ? AND userId = ?', cvId, 'p6')[0].n === 0);
    const thieu = await req('POST', '/api/messages/phong-nhom', { cookie: GV, body: { classId: 'c1', ten: 'x', phuHuynh: [] } });
    check('phòng phải có ít nhất một gia đình', thieu.status === 400, thieu.status);
  }

  // =========================================================================
  console.log('\n[5] Mất quyền: bị bỏ khỏi phòng, hoặc con chuyển nhóm');
  {
    await req('POST', `/api/messages/${cvId}`, { cookie: GV, body: { text: 'Cô nhắn cả nhà lịch dã ngoại' } });
    const hh0 = await req('GET', '/api/dashboard/badges', { cookie: PH5 });
    check('đối chứng — p5 có tin chưa đọc trong huy hiệu', (hh0.data?.nhantin || 0) >= 1, hh0.data?.nhantin);

    const bo = await req('POST', `/api/messages/${cvId}/thanh-vien/p5/bo`, { cookie: GV });
    check('cô bỏ được một gia đình khỏi phòng', bo.status === 200, bo);
    check('ghi nhật ký phong-nhom-bo',
      hoi("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'phong-nhom-bo' AND target = ?", cvId)[0].n === 1);
    const doc = await req('GET', `/api/messages/${cvId}`, { cookie: PH5 });
    check('gia đình bị bỏ: GET 403', doc.status === 403, doc.status);
    const ds = await req('GET', '/api/messages', { cookie: PH5 });
    check('phòng mất khỏi danh sách', !(ds.data.conversations || []).some(c => c.id === cvId));
    const hh = await req('GET', '/api/dashboard/badges', { cookie: PH5 });
    check('huy hiệu không đếm tin của phòng nữa', (hh.data?.nhantin || 0) < (hh0.data?.nhantin || 0), [hh0.data?.nhantin, hh.data?.nhantin]);
    const boCo = await req('POST', `/api/messages/${cvId}/thanh-vien/t5/bo`, { cookie: GV });
    check('không bỏ được cô khỏi phòng (chỉ bỏ gia đình)', boCo.status === 400 || boCo.status === 403, boCo.status);
    check('tin nhắn của phòng không mất dòng nào',
      hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', cvId)[0].n === 2);

    check('đối chứng — p4 đọc được phòng trước khi con chuyển nhóm',
      (await req('GET', `/api/messages/${cvId}`, { cookie: PH4 })).status === 200);
    const hhP4 = await req('GET', '/api/dashboard/badges', { cookie: PH4 });
    await req('POST', `/api/messages/${cvId}`, { cookie: GV, body: { text: 'Thêm một tin cho cả nhà' } });
    const hhP4b = await req('GET', '/api/dashboard/badges', { cookie: PH4 });
    check('đối chứng — huy hiệu p4 tăng', (hhP4b.data?.nhantin || 0) > (hhP4.data?.nhantin || 0), [hhP4.data?.nhantin, hhP4b.data?.nhantin]);
    ghi("UPDATE students SET classId = 'c2' WHERE id = 's5'");
    const doc4 = await req('GET', `/api/messages/${cvId}`, { cookie: PH4 });
    check('con chuyển sang Lá 1: GET 403', doc4.status === 403, doc4.status);
    const gui4 = await req('POST', `/api/messages/${cvId}`, { cookie: PH4, body: { text: 'còn đây không' } });
    check('và không nhắn được', gui4.status === 403, gui4.status);
    const ds4 = await req('GET', '/api/messages', { cookie: PH4 });
    check('phòng mất khỏi danh sách', !(ds4.data.conversations || []).some(c => c.id === cvId));
    const hh4 = await req('GET', '/api/dashboard/badges', { cookie: PH4 });
    check('huy hiệu không đếm tin của phòng nữa', (hh4.data?.nhantin || 0) < (hhP4b.data?.nhantin || 0), [hhP4b.data?.nhantin, hh4.data?.nhantin]);
    ghi("UPDATE students SET classId = 'c1' WHERE id = 's5'");
  }

  // =========================================================================
  console.log('\n[6] Khoá phòng: chỉ đọc với mọi người, mở khoá là nhắn lại được');
  {
    const k = await req('PUT', `/api/messages/${cvId}/phong`, { cookie: GV, body: { khoa: true } });
    check('cô khoá được phòng', k.status === 200, k);
    const pC = await req('POST', `/api/messages/${cvId}`, { cookie: GV, body: { text: 'thử khi khoá' } });
    check('khoá rồi cô cũng không nhắn được: 403', pC.status === 403, pC.status);
    const pP = await req('POST', `/api/messages/${cvId}`, { cookie: PH2, body: { text: 'thử khi khoá' } });
    check('và gia đình cũng vậy: 403', pP.status === 403, pP.status);
    check('câu từ chối bằng tiếng Việt', /khoá/.test(pP.data?.error || ''), pP.data);
    const x = await req('GET', `/api/messages/${cvId}`, { cookie: PH2 });
    check('vẫn đọc được, kèm daKhoa', x.status === 200 && x.data.phong?.daKhoa === true, x.data?.phong);
    const tinMinh = ((await req('GET', `/api/messages/${cvId}`, { cookie: PH })).data.messages || []).find(m => m.mine);
    check('đối chứng — p1 có tin của mình trong phòng', !!tinMinh);
    const th = await req('POST', `/api/messages/${cvId}/tin/${tinMinh.id}/thu-hoi`, { cookie: PH });
    check('khoá rồi không thu hồi được', th.status === 403, th.status);
    const doiTen = await req('PUT', `/api/messages/${cvId}/phong`, { cookie: GVNN, body: { ten: 'Dã ngoại tháng 12' } });
    check('cô thứ hai đổi tên được', doiTen.status === 200, doiTen.status);
    check('tên mới đã lưu', hoi('SELECT name FROM conversations WHERE id = ?', cvId)[0].name === 'Dã ngoại tháng 12');
    const mo = await req('PUT', `/api/messages/${cvId}/phong`, { cookie: GV, body: { khoa: false } });
    check('mở khoá được', mo.status === 200, mo.status);
    const lai = await req('POST', `/api/messages/${cvId}`, { cookie: PH2, body: { text: 'Dạ em đồng ý với cả nhà ạ' } });
    check('mở khoá xong gia đình nhắn lại được', lai.status === 200, lai.status);
  }

  // =========================================================================
  console.log('\n[7] Cô ẩn tin của gia đình: nhà khác thấy chỗ trống, chữ vẫn lưu, có nhật ký');
  {
    const g = await req('POST', `/api/messages/${cvId}`, { cookie: PH2, body: { text: 'NOI-DUNG-CAN-AN không hay' } });
    const tinId = g.data.id;
    const phAn = await req('POST', `/api/messages/${cvId}/tin/${tinId}/an`, { cookie: PH });
    check('phụ huynh không ẩn được tin người khác', phAn.status === 403, phAn.status);
    const an = await req('POST', `/api/messages/${cvId}/tin/${tinId}/an`, { cookie: GV });
    check('cô ẩn được', an.status === 200, an);
    const x = await req('GET', `/api/messages/${cvId}`, { cookie: PH });
    const tin = (x.data.messages || []).find(m => m.id === tinId);
    check('nhà khác thấy chữ rỗng kèm daAn', tin && tin.text === '' && tin.daAn === true, tin);
    check('chữ không rời máy chủ', !JSON.stringify(x.data).includes('NOI-DUNG-CAN-AN'));
    check('dòng messages vẫn còn chữ',
      (hoi('SELECT text FROM messages WHERE id = ?', tinId)[0] || {}).text?.includes('NOI-DUNG-CAN-AN'));
    check('ghi nhật ký tin-nhan-an',
      hoi("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'tin-nhan-an' AND target = ?", tinId)[0].n === 1);
    const g2 = await req('POST', `/api/messages/${cvId}`, { cookie: PH2, body: { text: 'gõ nhầm' } });
    await req('POST', `/api/messages/${cvId}/tin/${g2.data.id}/thu-hoi`, { cookie: PH2 });
    const tu = ((await req('GET', `/api/messages/${cvId}`, { cookie: PH })).data.messages || []).find(m => m.id === g2.data.id);
    check('tin người gửi tự thu hồi: daThuHoi nhưng KHÔNG daAn', tu && tu.daThuHoi === true && tu.daAn === false, tu);

    // Ngoài phòng nhóm, route ẩn không mở: kênh riêng của gia đình.
    const k = await req('POST', '/api/messages/start', { cookie: PH, body: { kenh: 'nhom', studentId: 's1' } });
    const gk = await req('POST', `/api/messages/${k.data.id}`, { cookie: PH, body: { text: 'tin riêng' } });
    const anK = await req('POST', `/api/messages/${k.data.id}/tin/${gk.data.id}/an`, { cookie: GV });
    check('cuộc riêng: cô không ẩn được lời của gia đình', anK.status === 403 || anK.status === 404, anK.status);
  }

  // =========================================================================
  console.log('\n[8] Quản lý cơ sở: đúng cơ sở lập được, cơ sở khác thì không gì cả; gói đẩy');
  {
    const lapA = await req('POST', '/api/messages/phong-nhom', { cookie: QLA, body: { classId: 'c1', ten: 'Văn phòng hỏi ý kiến', phuHuynh: ['p2'] } });
    check('quản lý cơ sở 1 lập được phòng cho nhóm cơ sở 1', lapA.status === 201, lapA);
    const xA = await req('GET', `/api/messages/${lapA.data.id}`, { cookie: QLA });
    check('và quản phòng ấy', xA.status === 200 && xA.data.phong?.quanLyDuoc === true, xA.data?.phong);

    const lapB = await req('POST', '/api/messages/phong-nhom', { cookie: QLB, body: { classId: 'c1', ten: 'x', phuHuynh: ['p2'] } });
    check('quản lý cơ sở 2 không lập được phòng cho nhóm cơ sở 1', lapB.status === 403, lapB.status);
    const docB = await req('GET', `/api/messages/${cvId}`, { cookie: QLB });
    check('và không đọc được phòng', docB.status === 403 || docB.status === 404, docB.status);
    const dongB = await req('POST', `/api/messages/${cvId}/dong`, { cookie: QLB, body: {} });
    check('và không đóng được phòng', dongB.status === 403, dongB.status);
    check('phòng vẫn chưa đóng', hoi('SELECT COUNT(*) AS n FROM hoi_thoai_dong WHERE conversationId = ?', cvId)[0].n === 0);

    const dongQT = await req('POST', `/api/messages/${cvId}/dong`, { cookie: QT, body: {} });
    check('đối chứng — ban giám hiệu đóng được', dongQT.status === 200, dongQT.status);
    const docB2 = await req('GET', `/api/messages/${cvId}`, { cookie: QLB });
    check('quản lý cơ sở 2 không đọc được phòng ĐÃ ĐÓNG của cơ sở 1', docB2.status === 404 || docB2.status === 403, docB2.status);
    const khoB = await req('GET', '/api/messages/da-dong', { cookie: QLB });
    check('và không thấy nó trong kho cuộc đã đóng', !(khoB.data?.ds || []).some(d => d.conversationId === cvId), khoB.data);
    const moB = await req('POST', `/api/messages/${cvId}/mo-lai`, { cookie: QLB, body: {} });
    check('và không mở lại được', moB.status === 403, moB.status);
    const docA = await req('GET', `/api/messages/${cvId}`, { cookie: QLA });
    check('đối chứng — quản lý cơ sở 1 đọc được phòng đã đóng', docA.status === 200, docA.status);
    await req('POST', `/api/messages/${cvId}/mo-lai`, { cookie: QT, body: {} });

    // Gói đẩy: nạp thẳng trong tiến trình, trên đúng cơ sở dữ liệu tạm.
    process.env.DATA_DIR = DIR;
    const require_ = createRequire(import.meta.url);
    const pn = require_(path.join(GOC, 'lib/phong-nhom.js'));
    const cv = hoi('SELECT * FROM conversations WHERE id = ?', cvId)[0];
    const p2 = hoi("SELECT * FROM users WHERE id = 'p2'")[0];
    const goi = pn.goiDayPhong(cv, p2, 'Tin thử gói đẩy');
    const nhan = new Set(goi.nguoiNhan);
    check('gói đẩy: khoá gộp ổn định theo phòng', goi.goi.gop === `phong-${cvId}`, goi.goi.gop);
    check('gói đẩy: mở đúng phòng', goi.goi.hash === `#/messages/${cvId}`, goi.goi.hash);
    check('gói đẩy: không gửi cho chính người gửi', !nhan.has('p2'));
    check('gói đẩy: có cô và các nhà còn trong phòng', ['t1', 't5', 'p1', 'p3', 'p4'].every(id => nhan.has(id)), [...nhan]);
    check('gói đẩy: không có nhà đã bị bỏ, không có nhà nhóm khác', !nhan.has('p5') && !nhan.has('p6'), [...nhan]);
    check('gói đẩy: người gửi hiện bằng nhãn', /^Bố bé Phạm Gia Hân: /.test(goi.goi.noiDung), goi.goi.noiDung);
    check('gói đẩy: không số điện thoại', !coSoDienThoai(goi));
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
