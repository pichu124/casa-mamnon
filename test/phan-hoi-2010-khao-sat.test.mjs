// Bài canh góp ý 20/10 — G1: danh sách gia đình CHƯA trả lời khảo sát.
//
// Chạy bằng:  node test/phan-hoi-2010-khao-sat.test.mjs
//
// Cô và văn phòng cần biết nhà nào chưa trả lời để nhắc. Đếm theo BÉ: khảo sát
// lưu theo tài khoản phụ huynh, và một bé có hai phụ huynh thì MỘT người trả
// lời là bé đó đã có trả lời. Phạm vi theo người xem — cô chỉ thấy bé nhóm
// mình, quản lý cơ sở thấy bé cơ sở mình, ban giám hiệu thấy cả trường — và
// không ra ngoài phạm vi khảo sát được gửi tới. Gia đình không nhận danh sách
// này.
import Database from 'better-sqlite3';
import path from 'node:path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-khao-sat');
sinhDuLieu(DIR);
const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng KS', 'ks2010_bgh');
const mkCS2 = taoQuanTri(DIR, 'Quản Lý CS2 KS', 'ks2010_cs2');
khoaVaoCoSo(DIR, 'ks2010_cs2', 'cs2');

// Phụ huynh THỨ HAI của bé s4 (bé Vũ Đức Anh, Chồi 2 — mẹ/bố thứ nhất là p3).
{
  const csdl = new Database(path.join(DIR, 'school.db'));
  csdl.prepare(`INSERT INTO users (id, username, passwordHash, role, name, title, phone, email, classId, avatar, mustChangePassword, active, createdAt)
    SELECT 'pks10', 'ph.ks10', passwordHash, 'parent', 'Vũ Thị Mười', 'Chị', '', '', NULL, avatar, 0, 1, createdAt FROM users WHERE id = 'p3'`).run();
  csdl.prepare(`INSERT INTO student_parents (studentId, parentId) VALUES ('s4', 'pks10')`).run();
  csdl.close();
}

const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 6412), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

async function vaoQuanTri(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const CAU_HOI = [{ text: 'Nhà mình tham gia được không ạ?', type: 'choice', options: ['Có', 'Không'] }];
const tao = (cookie, them = {}) => req('POST', '/api/surveys', {
  cookie, body: { title: 'Dã ngoại cuối tháng', description: '', deadline: '2030-01-01', questions: CAU_HOI, ...them },
});
const traLoi = (cookie, id) => req('POST', `/api/surveys/${id}/respond`, { cookie, body: { answers: { q1: 'Có' } } });
const chuaTraLoi = async (cookie, id) => {
  const r = await req('GET', `/api/surveys/${id}`, { cookie });
  return { status: r.status, ds: r.data && r.data.chuaTraLoi, data: r.data };
};
const maBe = (ds) => (ds || []).map(x => x.studentId).sort();

try {
  const bgh = await vaoQuanTri('ks2010_bgh', mkBGH);
  const cs2 = await vaoQuanTri('ks2010_cs2', mkCS2);
  const co1 = (await login('giaovien', '123456')).cookie;    // t1 — Chồi 2 (c1)
  const co2 = (await login('giaovien2', '123456')).cookie;   // t2 — Lá 1 (c2)
  const p1 = (await login('phuhuynh', '123456')).cookie;     // mẹ s1 (c1) và s2 (c2)
  const pks10 = (await login('ph.ks10', '123456')).cookie;   // phụ huynh thứ hai của s4

  // =========================================================================
  console.log('\n[1] Khảo sát toàn trường — mỗi người xem thấy đúng phạm vi mình');
  const t = await tao(bgh, { audience: 'all' });
  check('đối chứng — ban giám hiệu tạo được khảo sát toàn trường', t.status === 201, t.status);
  const KS = t.data.id;
  check('đối chứng — mẹ s1/s2 trả lời được', (await traLoi(p1, KS)).status === 201);
  check('đối chứng — phụ huynh thứ hai của s4 trả lời được', (await traLoi(pks10, KS)).status === 201);

  {
    const r = await chuaTraLoi(co1, KS);
    check('cô Chồi 2 nhận danh sách chưa trả lời', r.status === 200 && Array.isArray(r.ds), r.status);
    check('đúng các bé Chồi 2 chưa có ai trả lời: s3, s5, s6', JSON.stringify(maBe(r.ds)) === JSON.stringify(['s3', 's5', 's6']), maBe(r.ds));
    check('bé s4 KHÔNG nằm trong danh sách — một trong hai phụ huynh đã trả lời', !maBe(r.ds).includes('s4'));
    const s3 = (r.ds || []).find(x => x.studentId === 's3') || {};
    check('mỗi dòng có tên bé, tên nhóm, tên phụ huynh',
      s3.tenBe === 'Phạm Gia Hân' && s3.tenNhom === 'Chồi 2' && Array.isArray(s3.phuHuynh) && s3.phuHuynh.includes('Anh Phạm Quốc Bảo'), s3);
    check('không có phần trăm, không điểm số trong danh sách', !/%|phanTram|diem/i.test(JSON.stringify(r.ds)));
  }
  {
    const r = await chuaTraLoi(co2, KS);
    check('cô Lá 1 chỉ thấy bé Lá 1 chưa trả lời: s7, s8 (s2 đã có mẹ trả lời)',
      JSON.stringify(maBe(r.ds)) === JSON.stringify(['s7', 's8']), maBe(r.ds));
  }
  {
    const r = await chuaTraLoi(bgh, KS);
    check('ban giám hiệu thấy cả trường: 8 bé chưa có trả lời',
      JSON.stringify(maBe(r.ds)) === JSON.stringify(['s10', 's11', 's3', 's5', 's6', 's7', 's8', 's9']), maBe(r.ds));
  }
  {
    const r = await chuaTraLoi(cs2, KS);
    check('quản lý cơ sở 2 (chưa có bé) — danh sách rỗng, không lộ bé cơ sở 1', r.status === 200 && Array.isArray(r.ds) && r.ds.length === 0, r.ds);
  }
  {
    const r = await chuaTraLoi(p1, KS);
    check('gia đình KHÔNG nhận danh sách nhà chưa trả lời', r.status === 200 && r.ds === undefined, r.data && Object.keys(r.data));
  }

  // =========================================================================
  console.log('\n[2] Khảo sát gửi riêng một nhóm — không ra ngoài nhóm đó');
  {
    const n = await tao(co1, { audience: 'class' });
    check('đối chứng — cô Chồi 2 tạo khảo sát cho nhóm mình', n.status === 201 && n.data.audience === 'c1', n.data);
    const r = await chuaTraLoi(co1, n.data.id);
    check('chưa ai trả lời: đủ năm bé Chồi 2', JSON.stringify(maBe(r.ds)) === JSON.stringify(['s1', 's3', 's4', 's5', 's6']), maBe(r.ds));
    const rB = await chuaTraLoi(bgh, n.data.id);
    check('ban giám hiệu mở khảo sát nhóm Chồi 2 cũng chỉ thấy bé Chồi 2', JSON.stringify(maBe(rB.ds)) === JSON.stringify(['s1', 's3', 's4', 's5', 's6']), maBe(rB.ds));
    await traLoi(p1, n.data.id);
    const sau = await chuaTraLoi(co1, n.data.id);
    check('mẹ s1 trả lời thì s1 rời danh sách — s2 (Lá 1) không bao giờ lọt vào', JSON.stringify(maBe(sau.ds)) === JSON.stringify(['s3', 's4', 's5', 's6']), maBe(sau.ds));
    await req('POST', `/api/surveys/${n.data.id}/close`, { cookie: co1 });
    const dong = await chuaTraLoi(co1, n.data.id);
    check('khảo sát đã đóng thì không còn danh sách để nhắc', dong.status === 200 && dong.ds === undefined, dong.ds);
  }
} finally {
  donThuMucTam(DIR);
}
tongKet();
