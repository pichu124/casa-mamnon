// Bài canh: NHÃN "MẸ BÉ …" Ở PHÒNG CHUNG KIỂU CŨ chỉ nêu bé chung nhóm với
// người khác trong phòng (Đ261j, ghi nhận của đợt rà Đ261).
//
// Chạy bằng:  TEST_PORT=7456 node test/phong-chung-cu-nhan.test.mjs
//
// Phòng chung kiểu cũ (đường `/phong-chung` đã ngừng, không gắn nhóm) từ
// Đ261c ghi nhãn theo bé thay cho họ tên người lớn. Nhưng nhãn nêu MỌI bé đang
// học của nhà ấy — cả bé ở nhóm khác, cơ sở khác — và hiện cho mọi thành viên
// phòng: một phòng của nhóm Chồi 2 biết được nhà kia còn một bé học ở cơ sở 2.
// Nay chỉ nêu bé học cùng nhóm với ít nhất một thành viên khác của phòng (cô
// phụ trách nhóm ấy, hoặc nhà có bé đang học nhóm ấy); không có bé nào như thế
// thì ghi "Phụ huynh".
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phong-chung-cu-nhan');
sinhDuLieu(DIR);
const sql = (cau, ...tham) => {
  const c = new Database(path.join(DIR, 'school.db'));
  try {
    const st = c.prepare(cau);
    return st.reader ? st.all(...tham) : st.run(...tham);
  } finally { c.close(); }
};
// Nhà chị Thu Hà (p1): bé An (Chồi 2, cơ sở 1), bé Nam (Lá 1, cơ sở 1), và thêm
// một bé học Mầm 1 ở cơ sở 2.
sql(`INSERT INTO students (id, name, classId, active, createdAt) VALUES ('s_cs2', 'Nguyễn Bảo Châu', 'c3', 1, '2026-09-01')`);
sql("INSERT INTO student_parents (studentId, parentId) VALUES ('s_cs2', 'p1')");
// Phòng cũ: cô Chồi 2 (t1), nhà p1, nhà p4 (bé Khánh Vy, Chồi 2), nhà p8 (bé ở Nhà trẻ 1 — không ai khác cùng nhóm).
sql("INSERT INTO conversations (id, type, name, classId) VALUES ('cv_cu', 'group', 'Phòng cũ của nhóm', NULL)");
for (const u of ['t1', 'p1', 'p4', 'p8']) {
  sql("INSERT INTO conversation_members (conversationId, userId, lastRead) VALUES ('cv_cu', ?, NULL)", u);
}
for (const [id, u, t] of [['ms_1', 'p1', 'Nhà em góp nước ạ.'], ['ms_2', 'p8', 'Nhà em góp bánh ạ.'], ['ms_3', 'p4', 'Cảm ơn các nhà.']]) {
  sql('INSERT INTO messages (id, conversationId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)',
    id, 'cv_cu', u, t, `2026-01-05T08:0${id.slice(-1)}:00.000Z`);
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7456), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const GV = (await login('giaovien', '123456')).cookie;
  const PH4 = (await login('ph.lan', '123456')).cookie;
  for (const [ai, cookie] of [['cô', GV], ['nhà khác', PH4]]) {
    console.log(`\n[${ai}] mở phòng cũ`);
    const mo = await req('GET', '/api/messages/cv_cu', { cookie });
    check(`${ai}: mở được phòng cũ`, mo.status === 200, mo.status);
    const nhan = Object.fromEntries((mo.data?.messages || []).map(m => [m.id, m.senderName]));
    check(`${ai}: nhà p1 hiện là "Mẹ bé Nguyễn Bảo An" — chỉ bé chung nhóm Chồi 2`,
      nhan.ms_1 === 'Mẹ bé Nguyễn Bảo An', nhan.ms_1);
    check(`${ai}: không lộ bé ở nhóm khác, cơ sở khác của nhà ấy`,
      !JSON.stringify(mo.data).includes('Nguyễn Bảo Châu') && !JSON.stringify(mo.data).includes('Nguyễn Bảo Nam'), nhan.ms_1);
    check(`${ai}: nhà không có bé chung nhóm với ai trong phòng hiện "Phụ huynh"`, nhan.ms_2 === 'Phụ huynh', nhan.ms_2);
    check(`${ai}: không lộ họ tên người lớn`, !/Lý Khánh Duy|Lê Thị Thu Hà/.test(JSON.stringify(mo.data)));
    check(`${ai}: nhà p4 vẫn hiện theo bé`, /bé Đỗ Khánh Vy$/.test(nhan.ms_3 || ''), nhan.ms_3);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
