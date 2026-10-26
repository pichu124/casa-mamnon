// Bài canh CÔNG TẮC "PHỤ HUYNH NHẮN TIN CÔ NƯỚC NGOÀI" (Đ242F — F6b).
//
// Chạy bằng:  node test/phan-hoi-2010-nhan-tin-co-nuoc-ngoai.test.mjs
//
// Chủ dự án quyết 26/10: *"Lớp nào cũng có cô nước ngoài… Đồng thời setup cho
// nhà trường có quyền tắt bật phần chat với GVNN này, vì chưa cân đối được GVNN
// chat với PH có ảnh hưởng quá nhiều tới thời gian làm việc của cô hay không."*
//
//   • Mặc định BẬT — đúng hành vi đang chạy.
//   • Chỉ ban giám hiệu đổi được.
//   • TẮT: gia đình không còn dòng "Cô nước ngoài"; máy chủ từ chối lập cuộc và
//     gửi tin MỚI vào kênh ấy, cả hai chiều (409, tiếng Việt); cuộc cũ vẫn đọc
//     được; kênh cô phụ trách và văn phòng không đổi gì; huy hiệu không nhảy.
//   • BẬT LẠI: mọi thứ như cũ.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhan-tin-co-nn');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhantin']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng NN', 'cn_bgh');
const mkQL1 = taoQuanTri(DIR, 'Quản lý CS1 NN', 'cn_ql1');
datChucVu(DIR, 'cn_ql1', 'quanly-coso');
khoaVaoCoSo(DIR, 'cn_ql1', 'cs1');
const mkVP1 = taoQuanTri(DIR, 'Văn phòng CS1 NN', 'cn_vp1');
datChucVu(DIR, 'cn_vp1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'cn_vp1', 'cs1');
const CSDL = path.join(DIR, 'school.db');
{
  // Cô 2 (t2) là cô nước ngoài của Chồi 2 (c1), vẫn là cô phụ trách Lá 1 (c2).
  const c = new Database(CSDL);
  c.prepare("DELETE FROM class_teacher_nhom WHERE classId = 'c1'").run();
  c.prepare("INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro) VALUES ('c1', 't2', 'phu')").run();
  c.prepare("INSERT INTO class_teacher_nhom (classId, teacherId, nhom) VALUES ('c1', 't2', 'nuoc-ngoai')").run();
  c.close();
}
function hoi(sql, ...thamSo) {
  const conn = new Database(CSDL);
  try { return conn.prepare(sql).all(...thamSo); } finally { conn.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7105), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const LOI = 'Nhà trường đang tạm tắt nhắn tin với cô nước ngoài. Gia đình nhắn cô phụ trách nhóm hoặc văn phòng nhé.';

try {
  const QT = await vao('cn_bgh', mkQT);
  const QL1 = await vao('cn_ql1', mkQL1);
  const VP1 = await vao('cn_vp1', mkVP1);
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô phụ trách Chồi 2
  const NN = (await login('giaovien2', '123456')).cookie;   // t2 — cô nước ngoài Chồi 2
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — s1 (c1)

  const lh = async (cookie) => (await req('GET', '/api/messages', { cookie })).data?.contacts || [];
  const mo = (cookie, kenh, studentId) => req('POST', '/api/messages/start', { cookie, body: { kenh, studentId } });
  const gui = (cookie, id, text) => req('POST', `/api/messages/${id}`, { cookie, body: { text } });
  const doc = (cookie, id) => req('GET', `/api/messages/${id}`, { cookie });
  const datCongTac = (cookie, coNuocNgoai) => req('PUT', '/api/messages/cai-dat', { cookie, body: { coNuocNgoai } });
  const huyHieu = async (cookie) =>
    Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.nhantin || 0);

  // =========================================================================
  console.log('\n[1] Mặc định BẬT — đúng hành vi đang chạy');
  let KENH_NN;
  {
    const cd = (await req('GET', '/api/messages/cai-dat', { cookie: QT })).data || {};
    check('mặc định: gia đình nhắn được cô nước ngoài', cd.coNuocNgoai === true, cd);
    check('ban giám hiệu đổi được', cd.suaDuoc === true, cd);
    const l = (await lh(PH)).filter(c => c.studentId === 's1');
    check('gia đình có dòng "Cô nước ngoài" cho bé', l.some(c => c.kenh === 'nuoc-ngoai'), l.map(c => c.kenh));
    const r = await mo(PH, 'nuoc-ngoai', 's1');
    KENH_NN = r.data?.id;
    check('mở được kênh cô nước ngoài', r.status === 200 && !!KENH_NN, r.data);
    check('gia đình gửi được', (await gui(PH, KENH_NN, 'Teacher ơi bé học tiếng Anh thế nào ạ')).status === 200);
    check('cô nước ngoài trả lời được', (await gui(NN, KENH_NN, 'Bé học rất chăm ạ')).status === 200);
  }

  // =========================================================================
  console.log('\n[2] Chỉ ban giám hiệu đổi được');
  {
    for (const [ten, ck] of [['quản lý cơ sở', QL1], ['văn phòng cơ sở', VP1], ['cô', GV], ['gia đình', PH]]) {
      check(`${ten} KHÔNG đổi được`, (await datCongTac(ck, false)).status === 403);
    }
    check('văn phòng cơ sở đọc được trạng thái, nhưng không được mời sửa',
      (await req('GET', '/api/messages/cai-dat', { cookie: VP1 })).data?.suaDuoc === false);
    check('giá trị lạ → 400', (await datCongTac(QT, 'tat')).status === 400);
  }

  // =========================================================================
  console.log('\n[3] TẮT: không lập cuộc, không gửi tin mới — cuộc cũ vẫn đọc được');
  {
    const hhPH = await huyHieu(PH);
    const tat = await datCongTac(QT, false);
    check('ban giám hiệu tắt được', tat.status === 200 && tat.data?.coNuocNgoai === false, tat.data);
    check('ghi nhật ký', hoi("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'nhantin-co-nuoc-ngoai'")[0].n === 1);
    check('huy hiệu gia đình không nhảy khi tắt', (await huyHieu(PH)) === hhPH, { truoc: hhPH, sau: await huyHieu(PH) });

    const l = await lh(PH);
    check('gia đình KHÔNG còn dòng "Cô nước ngoài"', !l.some(c => c.kenh === 'nuoc-ngoai'), l.map(c => c.kenh));
    check('vẫn còn dòng cô phụ trách nhóm cho mỗi bé',
      ['s1', 's2'].every(s => l.some(c => c.kenh === 'nhom' && c.studentId === s)), l.map(c => `${c.studentId}:${c.kenh}`));
    check('và dòng văn phòng', l.some(c => c.kenh === 'vanphong'));

    const r = await mo(PH, 'nuoc-ngoai', 's2');
    check('lập cuộc mới với cô nước ngoài → 409', r.status === 409, r.status);
    check('câu từ chối đúng lời nhà trường', r.data?.error === LOI, r.data);
    const g = await gui(PH, KENH_NN, 'gia đình nhắn thêm');
    check('gia đình gửi tin mới vào cuộc cũ → 409', g.status === 409 && g.data?.error === LOI, g.data);
    const gn = await gui(NN, KENH_NN, 'cô nhắn thêm');
    check('cô nước ngoài cũng không gửi mới được (giảm tải cho cô)', gn.status === 409, gn.status);
    check('không tin nào được thêm',
      hoi('SELECT COUNT(*) AS n FROM messages WHERE conversationId = ?', KENH_NN)[0].n === 2);

    const d = await doc(PH, KENH_NN);
    check('gia đình vẫn ĐỌC được cuộc cũ', d.status === 200 && (d.data?.messages || []).length === 2, d.status);
    check('máy chủ báo màn hình đây là chỉ đọc', typeof d.data?.tamDung === 'string' && d.data.tamDung.length > 0, d.data?.tamDung);
    check('cô nước ngoài vẫn đọc được', (await doc(NN, KENH_NN)).status === 200);
    check('đọc xong thì tin cũ thôi được đếm như bình thường', (await huyHieu(PH)) === hhPH - 1 || hhPH === 0,
      { truoc: hhPH, sau: await huyHieu(PH) });

    check('cô nước ngoài KHÔNG còn mục mở cuộc với gia đình nhóm ấy',
      !(await lh(NN)).some(c => c.kenh === 'nuoc-ngoai'), (await lh(NN)).map(c => c.kenh));
    const chon = (await req('GET', '/api/messages/chon-be', { cookie: NN })).data || {};
    check('và ô "Nhắn nhiều gia đình" không còn nhóm ấy', !(chon.nhom || []).some(n => n.id === 'c1'), chon.nhom);
    const nhieu = await req('POST', '/api/messages/gui-nhieu-nha', { cookie: NN, body: { studentIds: ['s1'], text: 'x' } });
    check('gửi nhiều nhà qua kênh cô nước ngoài: không gửi, nói rõ',
      /tạm tắt/.test((nhieu.data?.khongGui || [])[0]?.lyDo || ''), nhieu.data);

    const kn = (await mo(PH, 'nhom', 's1')).data?.id;
    check('KÊNH CÔ PHỤ TRÁCH không đổi gì', (await gui(PH, kn, 'Cô ơi chiều nay đón sớm ạ')).status === 200);
    check('cô phụ trách trả lời được', (await gui(GV, kn, 'Dạ cô biết rồi ạ')).status === 200);
    const vp = (await mo(PH, 'vanphong', 's1')).data?.id;
    check('văn phòng không đổi gì', (await gui(PH, vp, 'Văn phòng ơi')).status === 200);
  }

  // =========================================================================
  console.log('\n[4] BẬT LẠI: mọi thứ như cũ');
  {
    check('bật lại được', (await datCongTac(QT, true)).data?.coNuocNgoai === true);
    check('dòng "Cô nước ngoài" quay lại', (await lh(PH)).some(c => c.kenh === 'nuoc-ngoai'));
    check('gửi tiếp được vào cuộc cũ', (await gui(PH, KENH_NN, 'Em quay lại ạ')).status === 200);
    const d = await doc(PH, KENH_NN);
    check('màn hình không còn bị báo chỉ đọc', !d.data?.tamDung, d.data?.tamDung);
    const lai = await mo(PH, 'nuoc-ngoai', 's1');
    check('mục "Cô nước ngoài" mở lại đúng cuộc cũ', lai.status === 200 && lai.data?.id === KENH_NN, lai.data);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Công tắc nhắn tin cô nước ngoài (F6b)');
