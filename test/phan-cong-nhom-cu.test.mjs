// PHÂN CÔNG CÔ KHÔNG ĐƯỢC PHÁ LỊCH SỬ CỦA NHÓM ĐÃ ĐÓNG, KHÔNG ĐƯỢC XOÁ
// NHẦM CÔ ĐANG NGHỈ.
//
// Hai lời cam kết đã ghi trong lib/db.js và lib/schema.sql:
//
//   • Dòng `class_teachers` của nhóm ĐÃ ĐÓNG được GIỮ LẠI sau chuyển năm, để
//     còn nhận ra "cô từng phụ trách nhóm này" khi mở album năm cũ.
//   • Gán cô vào nhóm này KHÔNG gỡ cô khỏi các nhóm khác (trừ đường cũ
//     một-cô-một-lớp, và đường đó cũng chỉ nói về các nhóm ĐANG MỞ).
//
// Trước bản vá, hai đường dưới đây lặng lẽ phá cả hai cam kết:
//
//   1. Đường CŨ `PUT /api/admin/classes/:id` (bản giao diện cũ trong điện
//      thoại vẫn gửi `teacherId`) → `setHomeroomTeacher` quét
//      `classIdsEverOfTeacher` — gồm cả nhóm đã đóng — rồi XOÁ dòng của cô ở
//      đó. Tệ hơn: xoá cô "chính" của nhóm đã đóng làm cô "phụ" còn lại bị tự
//      thăng lên "chính" của nhóm ma đó, rồi bị hạ xuống "phụ" ở MỌI nhóm
//      khác — kể cả nhóm ĐANG MỞ cô ấy đang phụ trách chính.
//   2. `addClassTeacher` (POST /api/admin/teachers kèm classId) chép danh sách
//      hiện có của nhóm rồi gọi `setClassTeachers` — hàm này lọc cô có tài
//      khoản đang KHOÁ (nghỉ thai sản) khỏi danh sách rồi XOÁ dòng của cô như
//      một tác dụng phụ không ai bấm.
import path from 'path';
import { createRequire } from 'module';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const Database = require_('better-sqlite3');

const DIR = thuMucTam('phan-cong-nhom-cu');
sinhDuLieu(DIR);

// Dựng bối cảnh TRƯỚC khi máy chủ chạy:
//   • nhóm 'cux' đã đóng (một nhóm của năm học trước), t4 là chính, t2 là phụ.
//     t2 đồng thời đang là cô CHÍNH của nhóm ĐANG MỞ c2 — đúng tình huống sau
//     mỗi lần chuyển năm.
//   • t3 (đang là cô phụ của c1) bị khoá tài khoản — cô đang nghỉ dài ngày.
{
  const d = new Database(path.join(DIR, 'school.db'));
  d.prepare(`INSERT INTO classes (id, name, room, year, grade, active)
             VALUES ('cux', 'Chồi 1 (năm cũ)', '', '2024-2025', 4, 0)`).run();
  const them = d.prepare(
    'INSERT OR REPLACE INTO class_teachers (classId, teacherId, vaiTro) VALUES (?, ?, ?)');
  them.run('cux', 't4', 'chinh');
  them.run('cux', 't2', 'phu');
  d.prepare("UPDATE users SET active = 0 WHERE id = 't3'").run();
  d.close();
}

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4110), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

// Đọc cơ sở dữ liệu tạm bằng kết nối CHỈ ĐỌC — an toàn khi máy chủ đang mở WAL.
function doc(fn) {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return fn(d); } finally { d.close(); }
}
const dongPhanCong = (classId, teacherId) => doc(d => d.prepare(
  'SELECT vaiTro FROM class_teachers WHERE classId = ? AND teacherId = ?')
  .get(classId, teacherId));

console.log('\n[0] Bối cảnh dựng đúng như dự định');
{
  check('t2 là cô phụ của nhóm đã đóng cux', dongPhanCong('cux', 't2')?.vaiTro === 'phu');
  check('t2 là cô chính của nhóm đang mở c2', dongPhanCong('c2', 't2')?.vaiTro === 'chinh');
  check('t3 (đang khoá) là cô phụ của c1', dongPhanCong('c1', 't3')?.vaiTro === 'phu');
}

const bgh = await login('hieutruong', mkBGH);

console.log('\n[1] Đường cũ một-cô-một-lớp không được đụng nhóm đã đóng');
{
  const r = await req('PUT', '/api/admin/classes/c4',
    { cookie: bgh.cookie, body: { teacherId: 't4' } });
  check('gán chủ nhiệm qua đường cũ chạy được', r.status === 200, r.status);

  check('dòng "t4 từng là chính của nhóm đã đóng" còn nguyên',
    dongPhanCong('cux', 't4')?.vaiTro === 'chinh', dongPhanCong('cux', 't4'));
  check('dòng "t2 từng là phụ của nhóm đã đóng" còn nguyên',
    dongPhanCong('cux', 't2')?.vaiTro === 'phu', dongPhanCong('cux', 't2'));
  check('t2 VẪN là cô chính của nhóm đang mở c2 — không bị hạ oan',
    dongPhanCong('c2', 't2')?.vaiTro === 'chinh', dongPhanCong('c2', 't2'));

  const guong = doc(d => ({
    classIdT2: d.prepare("SELECT classId FROM users WHERE id = 't2'").get()?.classId,
    chuNhiemC2: d.prepare("SELECT teacherId FROM classes WHERE id = 'c2'").get()?.teacherId,
  }));
  check('hai cột gương đời cũ của t2/c2 không bị ghi lạc về nhóm đã đóng',
    guong.classIdT2 === 'c2' && guong.chuNhiemC2 === 't2', guong);
}

console.log('\n[2] Thêm cô mới vào nhóm không được xoá nhầm cô đang nghỉ');
{
  const r = await req('POST', '/api/admin/teachers',
    { cookie: bgh.cookie, body: { name: 'Cô Mới Vào Nghề', classId: 'c1' } });
  check('tạo cô mới gắn vào c1 chạy được', r.status === 201, { status: r.status, data: r.data });

  check('dòng phân công của cô đang nghỉ (t3) trong c1 còn nguyên',
    dongPhanCong('c1', 't3')?.vaiTro === 'phu', dongPhanCong('c1', 't3'));
  check('cô chính của c1 vẫn là t1', dongPhanCong('c1', 't1')?.vaiTro === 'chinh');
  check('cô mới vào nhóm với vai phụ',
    r.data?.id ? dongPhanCong('c1', r.data.id)?.vaiTro === 'phu' : false,
    r.data?.id && dongPhanCong('c1', r.data.id));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
