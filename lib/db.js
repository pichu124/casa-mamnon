// Tầng dữ liệu CASA Mầm non trên nền SQLite.
//
// Vì sao dùng SQLite thay cho tệp JSON: ở quy mô 300 học sinh, kho JSON phải ghi
// lại toàn bộ tệp 31 MB cho mỗi thay đổi nhỏ, mất 1.803 ms và chặn cả máy chủ.
// SQLite chỉ ghi đúng dòng thay đổi, mất khoảng 0,03 ms.
//
// Tệp dữ liệu nằm trong DATA_DIR nên khi triển khai chỉ cần gắn một ổ đĩa vào
// đó là giữ được cả cơ sở dữ liệu lẫn ảnh album qua các lần cập nhật.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'school.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(DB_FILE);
// WAL cho phép đọc trong khi đang ghi — nhiều phụ huynh xem bài trong lúc giáo
// viên điểm danh sẽ không phải chờ nhau.
sqlite.pragma('journal_mode = WAL');
// NORMAL đủ an toàn khi đã bật WAL và nhanh hơn FULL đáng kể.
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');
sqlite.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// ---------------------------------------------------------------------------
// Cột lưu JSON: tự chuyển đổi qua lại để phần còn lại của ứng dụng làm việc
// với đối tượng JavaScript bình thường, không phải nhớ chỗ nào cần parse.
// ---------------------------------------------------------------------------
const JSON_COLS = {
  settings: ['value'],
  users: ['avatar'],
  students: ['avatar'],
  remarks: ['skills'],
  reports: ['subjects', 'attendanceSummary'],
  medicine_requests: ['medicines', 'log'],
  menus: ['meals'],
  timetable: ['periodTimes', 'days'],
  edu_plans: ['goals', 'weeks'],
  bus_routes: ['driver', 'monitor', 'stops', 'log'],
  surveys: ['questions'],
  survey_responses: ['answers'],
  album_photos: ['g'],
};

// Cột lưu 0/1 nhưng ứng dụng dùng true/false.
const BOOL_COLS = {
  module_settings: ['enabled'],
  campuses: ['active'],
  users: ['mustChangePassword', 'active'],
  students: ['active'],
  classes: ['active'],
  remarks: ['parentSeen'],
  notifications: ['pinned'],
};

function decode(table, row) {
  if (!row) return row;
  for (const c of JSON_COLS[table] || []) {
    if (row[c] != null) {
      try { row[c] = JSON.parse(row[c]); } catch (_) { row[c] = null; }
    }
  }
  for (const c of BOOL_COLS[table] || []) {
    if (row[c] != null) row[c] = !!row[c];
  }
  return row;
}

function decodeAll(table, rows) {
  return rows.map(r => decode(table, r));
}

function encode(table, obj) {
  const out = { ...obj };
  for (const c of JSON_COLS[table] || []) {
    if (c in out) out[c] = out[c] == null ? null : JSON.stringify(out[c]);
  }
  for (const c of BOOL_COLS[table] || []) {
    if (c in out) out[c] = out[c] ? 1 : 0;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Truy vấn cấp thấp
// ---------------------------------------------------------------------------

// Nhớ câu lệnh đã biên dịch để không phải phân tích lại mỗi lần gọi.
const stmtCache = new Map();
function prepare(sql) {
  let s = stmtCache.get(sql);
  if (!s) { s = sqlite.prepare(sql); stmtCache.set(sql, s); }
  return s;
}

// Trả về mảng bản ghi. `table` chỉ dùng để biết cột nào cần giải mã JSON.
function all(table, sql, params = []) {
  return decodeAll(table, prepare(sql).all(params));
}

// Trả về một bản ghi hoặc undefined.
function first(table, sql, params = []) {
  return decode(table, prepare(sql).get(params));
}

// Chạy câu lệnh thay đổi dữ liệu.
function run(sql, params = []) {
  return prepare(sql).run(params);
}

// Đếm nhanh.
function count(sql, params = []) {
  const r = prepare(sql).get(params);
  return r ? Number(Object.values(r)[0]) : 0;
}

function insert(table, obj) {
  const row = encode(table, obj);
  const cols = Object.keys(row);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => `@${c}`).join(', ')})`;
  prepare(sql).run(row);
  return obj;
}

// Ghi đè nếu đã tồn tại (dùng cho điểm danh: mỗi học sinh mỗi ngày một bản ghi).
function upsert(table, obj, conflictCols) {
  const row = encode(table, obj);
  const cols = Object.keys(row);
  const updates = cols.filter(c => !conflictCols.includes(c)).map(c => `${c} = excluded.${c}`);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => `@${c}`).join(', ')})
    ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET ${updates.join(', ')}`;
  prepare(sql).run(row);
  return obj;
}

function update(table, id, patch, idCol = 'id') {
  const row = encode(table, patch);
  const cols = Object.keys(row);
  if (!cols.length) return 0;
  const sql = `UPDATE ${table} SET ${cols.map(c => `${c} = @${c}`).join(', ')} WHERE ${idCol} = @__id`;
  return prepare(sql).run({ ...row, __id: id }).changes;
}

function remove(table, id, idCol = 'id') {
  return prepare(`DELETE FROM ${table} WHERE ${idCol} = ?`).run(id).changes;
}

// Gom nhiều thao tác thành một giao dịch: hoặc tất cả cùng thành công, hoặc
// không có gì được ghi. Dùng khi tạo album kèm ảnh, nhập danh sách hàng loạt...
function tx(fn) {
  return sqlite.transaction(fn)();
}

let idCounter = Date.now() % 1000000;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Truy vấn nghiệp vụ dùng chung cho các route
// ---------------------------------------------------------------------------

function school() {
  const row = first('settings', 'SELECT value FROM settings WHERE key = ?', ['school']);
  return row ? row.value : null;
}

function setSchool(obj) {
  upsert('settings', { key: 'school', value: obj }, ['key']);
}

function classes() {
  return all('classes', 'SELECT * FROM classes WHERE active = 1 ORDER BY name');
}

function findClass(id) {
  return first('classes', 'SELECT * FROM classes WHERE id = ?', [id]);
}

function findUser(id) {
  return first('users', 'SELECT * FROM users WHERE id = ?', [id]);
}

function findUserByUsername(username) {
  return first('users', 'SELECT * FROM users WHERE username = ? COLLATE NOCASE', [String(username || '').trim()]);
}

// Học sinh kèm danh sách phụ huynh, giữ đúng hình dạng dữ liệu mà giao diện
// đang dùng (trường parentIds là một mảng).
function withParents(students) {
  if (!students.length) return students;
  const ids = students.map(s => s.id);
  const rows = prepare(
    `SELECT studentId, parentId FROM student_parents WHERE studentId IN (${ids.map(() => '?').join(',')})`
  ).all(ids);
  const map = new Map(ids.map(id => [id, []]));
  for (const r of rows) map.get(r.studentId)?.push(r.parentId);
  for (const s of students) s.parentIds = map.get(s.id) || [];
  return students;
}

function findStudent(id) {
  const s = first('students', 'SELECT * FROM students WHERE id = ?', [id]);
  if (!s) return undefined;
  return withParents([s])[0];
}

// ---------------------------------------------------------------------------
// Cô phụ trách nhóm lớp — quan hệ NHIỀU CÔ ↔ MỘT NHÓM  (G0.4)
//
// App 1 là trường tiểu học: một lớp có đúng MỘT giáo viên chủ nhiệm, và quan hệ
// đó nằm ở hai cột phải luôn ghi khớp nhau — `classes.teacherId` (màn hình quản
// trị đọc) và `users.classId` (quyền đọc hồ sơ học sinh đi theo). Trường mầm non
// thì một nhóm lớp có 2–3 cô cùng phụ trách, và một cô có thể phụ trách nhiều
// nhóm. Hai cột kia không diễn tả nổi điều đó, dù ghi khớp đến đâu.
//
// Bảng `class_teachers` diễn tả được. Nhưng đường quyền cũ đang được cả ứng dụng
// dùng, nên việc chuyển sang đã đi đủ BA BƯỚC, mỗi bước một commit, chạy
// `npm test` sau mỗi bước (CLAUDE.md, mục "Tệp dùng chung"):
//
//   1. Thêm bảng + các hàm dưới đây, chưa ai gọi.
//   2. Chuyển từng chỗ gọi sang các hàm này. Hai cột cũ vẫn được ghi, vẫn đúng.
//   3. Đường quyền thôi ĐỌC hai cột cũ.       ← ĐÃ XONG, đây là trạng thái hiện tại
//
// TỪ ĐÂY, bảng này là nguồn sự thật DUY NHẤT của quyền: `studentsOf`,
// `canAccessStudent` và `classIdsOf` bên dưới đều đọc nó, không chỗ nào còn cấp
// quyền theo `users.classId` nữa.
//
// Hai cột cũ vẫn được GHI làm gương và cột dữ liệu vẫn còn nguyên — KHÔNG `DROP`.
// Ba lý do: lỡ bảng mới sai thì còn đường quay lại; `scripts/kiem-tra-may-chu.js`
// vẫn soát được như cũ; và phần chuyển đổi lúc khởi động dựng lại bảng mới từ
// chính hai cột đó khi khôi phục từ bản sao lưu đời cũ.
// ---------------------------------------------------------------------------

// Cô của một nhóm lớp, cô phụ trách chính đứng trước. KHÔNG kèm `passwordHash`:
// hàm này sinh ra để đổ thẳng lên màn hình, đừng bắt từng chỗ gọi phải nhớ gỡ.
function teachersOfClass(classId) {
  if (!classId) return [];
  return all('users',
    `SELECT u.*, ct.vaiTro AS vaiTro FROM class_teachers ct
     JOIN users u ON u.id = ct.teacherId
     WHERE ct.classId = ? AND u.active = 1
     ORDER BY CASE ct.vaiTro WHEN 'chinh' THEN 0 ELSE 1 END, u.name`, [classId])
    .map(({ passwordHash: _h, ...u }) => u);
}

// Chỉ danh sách mã cô — nhẹ hơn khi chỉ cần so sánh.
function teacherIdsOfClass(classId) {
  if (!classId) return [];
  return prepare('SELECT teacherId FROM class_teachers WHERE classId = ?')
    .all(classId).map(r => r.teacherId);
}

// Các nhóm lớp ĐANG MỞ mà một cô đang phụ trách.
//
// Lọc `classes.active = 1` là cố ý. Lúc chuyển năm học nhóm cũ bị đóng nhưng
// dòng trong `class_teachers` được GIỮ LẠI, để còn nhận ra "cô từng phụ trách
// nhóm này" khi mở lại album năm cũ. Không lọc ở đây thì cô giữ nguyên quyền đọc
// hồ sơ trẻ của một nhóm đã đóng — đúng thứ mà việc gỡ `users.classId` lúc
// chuyển năm đang ngăn.
function classIdsOfTeacher(teacherId) {
  if (!teacherId) return [];
  return prepare(
    `SELECT ct.classId AS classId FROM class_teachers ct
     JOIN classes c ON c.id = ct.classId
     WHERE ct.teacherId = ? AND c.active = 1
     ORDER BY c.name`).all(teacherId).map(r => r.classId);
}

// Mọi nhóm cô TỪNG phụ trách, kể cả nhóm đã đóng. Dùng cho những màn hình nhìn
// lại năm cũ — KHÔNG dùng để cấp quyền đọc hồ sơ trẻ đang học.
function classIdsEverOfTeacher(teacherId) {
  if (!teacherId) return [];
  return prepare('SELECT classId FROM class_teachers WHERE teacherId = ?')
    .all(teacherId).map(r => r.classId);
}

function isTeacherOfClass(teacherId, classId) {
  if (!teacherId || !classId) return false;
  return count('SELECT COUNT(*) FROM class_teachers WHERE teacherId = ? AND classId = ?',
    [teacherId, classId]) > 0;
}

// Gương hai cột đời cũ theo ĐÚNG cách app 1 vẫn ghi, không hơn không kém.
//
// Ba chiều dưới đây chép nguyên từ `datChuNhiem` trong routes/admin.js, nơi đã
// trả giá cho hai lỗi thật: đổi chủ nhiệm mà quên chiều 1 thì cô cũ giữ nguyên
// quyền đọc cả lớp cũ; quên chiều 2 thì lớp cũ của cô mới thành "lớp có chủ
// nhiệm ma" mà hiệu trưởng tưởng đã phân công xong.
function mirrorLegacyHomeroom(classId, chinhId) {
  run(`UPDATE users SET classId = NULL
       WHERE role = 'teacher' AND classId = ? AND id IS NOT ?`, [classId, chinhId || null]);
  if (chinhId) {
    const co = findUser(chinhId);
    if (co && co.classId && co.classId !== classId) {
      run('UPDATE classes SET teacherId = NULL WHERE id = ?', [co.classId]);
    }
    run('UPDATE users SET classId = ? WHERE id = ?', [classId, chinhId]);
  }
  run('UPDATE classes SET teacherId = ? WHERE id = ?', [chinhId || null, classId]);
}

// Danh sách mã cô đã lọc: bỏ trùng, bỏ người không phải cô.
function loSachDanhSachCo(teacherIds) {
  const ra = [];
  for (const id of (Array.isArray(teacherIds) ? teacherIds : [])) {
    if (!id || ra.includes(id)) continue;
    const u = findUser(id);
    if (u && u.role === 'teacher' && u.active !== false) ra.push(id);
  }
  return ra;
}

// Đặt TOÀN BỘ danh sách cô của một nhóm lớp. Trả về danh sách mã cô đã ghi.
//
// Khác hẳn nếp app 1: gán cô vào nhóm này KHÔNG gỡ cô khỏi các nhóm khác — đó
// mới là điều trường mầm non cần. Chỉ vai trò "chính" là còn độc quyền một nhóm
// mỗi cô, vì hai cột đời cũ chỉ chứa nổi bấy nhiêu; ở nhóm cũ cô bị hạ xuống
// "phụ" chứ KHÔNG bị gỡ khỏi nhóm.
function setClassTeachers(classId, teacherIds, chinhId = null) {
  if (!classId || !findClass(classId)) return [];
  const ds = loSachDanhSachCo(teacherIds);
  const chinh = ds.includes(chinhId) ? chinhId : (ds[0] || null);
  const luc = new Date().toISOString();

  tx(() => {
    for (const id of teacherIdsOfClass(classId)) {
      if (!ds.includes(id)) {
        run('DELETE FROM class_teachers WHERE classId = ? AND teacherId = ?', [classId, id]);
      }
    }
    if (chinh) {
      run(`UPDATE class_teachers SET vaiTro = 'phu' WHERE teacherId = ? AND classId IS NOT ?`,
        [chinh, classId]);
    }
    for (const id of ds) {
      run(`INSERT INTO class_teachers (classId, teacherId, vaiTro, ganLuc) VALUES (?, ?, ?, ?)
           ON CONFLICT (classId, teacherId) DO UPDATE SET vaiTro = excluded.vaiTro`,
        [classId, id, id === chinh ? 'chinh' : 'phu', luc]);
    }
    mirrorLegacyHomeroom(classId, chinh);
  });
  return ds;
}

// Thêm MỘT cô vào nhóm, giữ nguyên những cô đang có.
function addClassTeacher(classId, teacherId, vaiTro = 'phu') {
  const ds = teacherIdsOfClass(classId);
  if (!ds.includes(teacherId)) ds.push(teacherId);
  const dangChinh = teachersOfClass(classId).find(t => t.vaiTro === 'chinh');
  const chinh = vaiTro === 'chinh' ? teacherId : (dangChinh ? dangChinh.id : null);
  return setClassTeachers(classId, ds, chinh);
}

// Gỡ MỘT cô khỏi nhóm, giữ nguyên những cô còn lại.
function removeClassTeacher(classId, teacherId) {
  const ds = teacherIdsOfClass(classId).filter(id => id !== teacherId);
  const dangChinh = teachersOfClass(classId).find(t => t.vaiTro === 'chinh');
  const chinh = dangChinh && dangChinh.id !== teacherId ? dangChinh.id : null;
  return setClassTeachers(classId, ds, chinh);
}

// Nếp CŨ của app 1: một nhóm đúng một cô, và gán cô vào nhóm này thì gỡ cô khỏi
// mọi nhóm khác. Giữ lại nguyên vẹn vì đường API cũ (`PUT /api/admin/classes/:id`
// với trường `teacherId`) vẫn còn, và bản giao diện cũ nằm trong điện thoại đã
// cài app vẫn đang gọi nó. Trường mầm non thì dùng `setClassTeachers`.
function setHomeroomTeacher(classId, teacherId) {
  if (!classId || !findClass(classId)) return [];
  return tx(() => {
    if (teacherId) {
      for (const cid of classIdsEverOfTeacher(teacherId)) {
        if (cid !== classId) removeClassTeacher(cid, teacherId);
      }
    }
    return setClassTeachers(classId, teacherId ? [teacherId] : [], teacherId || null);
  });
}

// Chuyển quan hệ chủ nhiệm đời cũ sang bảng mới.
//
// Chạy ở MỖI lần khởi động và CHỈ THÊM, không bao giờ xóa. Hai lý do:
//   • `lib/importer.js` (khôi phục từ bản sao lưu, nhập kho JSON đời cũ) ghi
//     thẳng hai cột cũ. Chạy một lần rồi thôi thì sau mỗi lần khôi phục là cô
//     mất sạch nhóm, mà không ai biết cho tới lúc cô đăng nhập.
//   • Chỉ thêm thì không bao giờ dựng dậy được một phân công đã bị gỡ có chủ ý:
//     mọi đường ghi đều đi qua `mirrorLegacyHomeroom`, nên hai cột cũ luôn là
//     TẬP CON của bảng mới. Không có gì để dựng dậy.
//
// Cũng được XUẤT RA cho `lib/importer.js` gọi lại sau khi nhập dữ liệu: dữ liệu
// xuất hiện SAU lúc khởi động (máy chủ tự sinh dữ liệu mẫu ở lần chạy đầu, nhà
// trường nhập kho JSON đời cũ) thì lúc ấy hàm này đã chạy xong trên một cơ sở dữ
// liệu rỗng, và cô đăng nhập vào thấy nhóm trống trơn.
//
// Hỏng thì ghi ra log rồi đi tiếp, KHÔNG ném lỗi: `lib/db.js` được nạp ở mọi
// đường vào, ném ở đây là app không khởi động được (Nguyên tắc số 1). Lần khởi
// động sau nó tự thử lại.
// ---------------------------------------------------------------------------
// CƠ SỞ — trường có ba cơ sở, dữ liệu giữa các cơ sở phải độc lập
//
// Quy định phân quyền của nhà trường chia ba cấp. Phần mà tầng dữ liệu này lo:
//
//   Cấp 1 — toàn hệ thống. Xem được mọi cơ sở.
//   Cấp 3 — tại cơ sở. "Cơ sở A KHÔNG thể xem dữ liệu của Cơ sở B."
//
// CÁCH PHÂN BIỆT CẤP 1 VỚI CẤP 3, MÀ KHÔNG ĐỘNG VÀO CỘT `role`
//
// Một tài khoản quản trị CÓ dòng trong `user_campus` là Cấp 3 — bị khoá vào
// đúng cơ sở đó. KHÔNG có dòng nào là Cấp 1 — toàn hệ thống.
//
// Chọn cách này thay vì thêm vai mới vào cột `role` vì hai lẽ:
//
//   1. Mọi tài khoản quản trị ĐANG CÓ đều chưa có dòng nào, nên chúng giữ
//      nguyên quyền như trước. Thêm tầng cơ sở KHÔNG lấy đi quyền của ai —
//      đúng Nguyên tắc số 1.
//   2. `role` đang được `lib/auth.js` và 20 đường dẫn dùng để chặn. Thêm giá
//      trị mới vào đó là đổi hành vi của cả 20 chỗ cùng một lúc.
//
// Cô giáo KHÔNG cần khoá vào cơ sở: quyền của cô đi theo NHÓM LỚP
// (`class_teachers`), mà mỗi nhóm đã thuộc đúng một cơ sở. Cô dạy hai cơ sở thì
// chỉ cần được phân vào nhóm ở cả hai — không phải hai tài khoản.
// Phụ huynh cũng vậy: quyền đi theo con.
//
// TÍNH CHẤT AN TOÀN: bảng `campuses` còn trống thì mọi hàm dưới đây trả về
// "không giới hạn", và tầng cơ sở nằm im hoàn toàn.
// ---------------------------------------------------------------------------

// Trường này đã khai báo cơ sở nào chưa? Chưa thì cả tầng cơ sở nằm im.
function coTangCoSo() {
  return count('SELECT COUNT(*) FROM campuses WHERE active = 1') > 0;
}

function campuses() {
  return all('campuses', 'SELECT * FROM campuses WHERE active = 1 ORDER BY name');
}

function findCampus(id) {
  return id ? first('campuses', 'SELECT * FROM campuses WHERE id = ?', [id]) : null;
}

// Cơ sở của một nhóm lớp, hoặc null nếu nhóm chưa được gắn vào cơ sở nào.
function campusOfClass(classId) {
  if (!classId) return null;
  const r = prepare('SELECT campusId FROM class_campus WHERE classId = ?').get(classId);
  return r ? r.campusId : null;
}

// Cơ sở mà một tài khoản bị KHOÁ VÀO, hoặc null nếu không bị khoá.
function campusOfUser(userId) {
  if (!userId) return null;
  const r = prepare('SELECT campusId FROM user_campus WHERE userId = ?').get(userId);
  return r ? r.campusId : null;
}

function classIdsOfCampus(campusId) {
  if (!campusId) return [];
  return prepare(
    `SELECT cc.classId AS classId FROM class_campus cc
     JOIN classes c ON c.id = cc.classId
     WHERE cc.campusId = ? AND c.active = 1
     ORDER BY c.name`).all(campusId).map(r => r.classId);
}

function setClassCampus(classId, campusId) {
  if (!classId) return;
  if (!campusId) { run('DELETE FROM class_campus WHERE classId = ?', [classId]); return; }
  run(`INSERT INTO class_campus (classId, campusId, ganLuc) VALUES (?, ?, ?)
       ON CONFLICT(classId) DO UPDATE SET campusId = excluded.campusId, ganLuc = excluded.ganLuc`,
  [classId, campusId, new Date().toISOString()]);
}

function setUserCampus(userId, campusId) {
  if (!userId) return;
  if (!campusId) { run('DELETE FROM user_campus WHERE userId = ?', [userId]); return; }
  run(`INSERT INTO user_campus (userId, campusId, ganLuc) VALUES (?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET campusId = excluded.campusId, ganLuc = excluded.ganLuc`,
  [userId, campusId, new Date().toISOString()]);
}

// Phạm vi cơ sở của một người dùng.
//
// Trả về `null` nghĩa là KHÔNG GIỚI HẠN — thấy mọi cơ sở. Trả về một mã cơ sở
// nghĩa là chỉ thấy đúng cơ sở đó.
//
// Cố ý trả `null` chứ không trả mảng mọi cơ sở: "không giới hạn" và "được phép ở
// đúng ba cơ sở đang có" là hai chuyện khác nhau, và chúng khác nhau đúng vào
// lúc ai đó mở cơ sở thứ tư.
function phamViCoSo(user) {
  if (!user) return null;
  if (!coTangCoSo()) return null;          // trường chưa khai báo cơ sở nào
  if (user.role !== 'admin') return null;  // cô và phụ huynh: quyền đi theo nhóm / theo con
  return campusOfUser(user.id);            // quản trị: có khoá thì là Cấp 3, không thì Cấp 1
}

// Người này có được đụng tới cơ sở đó không.
function canAccessCampus(user, campusId) {
  if (!user || !campusId) return false;
  const pham = phamViCoSo(user);
  return pham === null || pham === campusId;
}

// Dựng quan hệ nhóm ↔ cơ sở từ dữ liệu đã có.
//
// Trước khi có bảng này, cơ sở chỉ tồn tại dưới dạng CHỮ trong tên phòng —
// "Cơ sở 1 — Phòng Hoa Sen" — vì app chưa có chỗ nào khác để đặt nó.
//
// Hàm này chỉ chạy khi trường ĐÃ khai báo cơ sở. Nó KHÔNG tự tạo cơ sở nào: đoán
// ra một cơ sở từ một chuỗi chữ rồi tự dựng nó lên là loại "giúp" mà người vận
// hành không lường được. Việc của nó chỉ là nối nhóm vào một cơ sở ĐÃ CÓ, khi
// tên phòng nói rõ ràng nhóm đó ở đâu.
function backfillClassCampus() {
  try {
    if (!coTangCoSo()) return;
    const ds = campuses();
    if (!ds.length) return;
    const chuaGan = all('classes',
      `SELECT c.* FROM classes c
       LEFT JOIN class_campus cc ON cc.classId = c.id
       WHERE cc.classId IS NULL AND c.active = 1`);
    for (const lop of chuaGan) {
      const phong = String(lop.room || '');
      const khop = ds.find(cs => phong.toLowerCase().startsWith(String(cs.name || '').toLowerCase()));
      if (khop) setClassCampus(lop.id, khop.id);
    }
  } catch (err) {
    console.error('[db] Chưa nối được nhóm lớp vào cơ sở:', err.message);
  }
}

function backfillClassTeachers() {
  try {
    run(`INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro)
         SELECT c.id, c.teacherId, 'chinh' FROM classes c
         JOIN users u ON u.id = c.teacherId
         WHERE c.teacherId IS NOT NULL AND u.role = 'teacher'`);
    run(`INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro)
         SELECT u.classId, u.id, 'chinh' FROM users u
         JOIN classes c ON c.id = u.classId
         WHERE u.role = 'teacher' AND u.classId IS NOT NULL`);
  } catch (err) {
    console.error('[db] Chưa chuyển được phân công cô sang bảng class_teachers:', err.message);
  }
}
backfillClassTeachers();
backfillClassCampus();

// Học sinh mà một người dùng được phép xem.
// Phụ huynh: các con của mình. Cô: trẻ của MỌI nhóm cô phụ trách. Quản trị: tất cả.
//
// Vế "MỌI nhóm" là G0.4 bước 3: trước đây chỗ này đọc `users.classId`, một cột
// chỉ chứa nổi MỘT nhóm. Bảng `class_teachers` chứa được cả 2–3 cô của một nhóm
// lẫn nhiều nhóm của một cô, và từ commit này nó là nguồn sự thật duy nhất của
// quyền. Hai cột cũ vẫn được ghi làm gương (xem `mirrorLegacyHomeroom`) nhưng
// KHÔNG còn ai đọc để cấp quyền nữa.
function studentsOf(user) {
  if (!user) return [];
  if (user.role === 'parent') {
    return withParents(all('students',
      `SELECT s.* FROM students s
       JOIN student_parents sp ON sp.studentId = s.id
       WHERE sp.parentId = ? AND s.active = 1
       ORDER BY s.name`, [user.id]));
  }
  if (user.role === 'teacher') {
    const nhom = classIdsOfTeacher(user.id);
    if (!nhom.length) return [];
    const marks = nhom.map(() => '?').join(',');
    return withParents(all('students',
      `SELECT * FROM students WHERE classId IN (${marks}) AND active = 1 ORDER BY name`, nhom));
  }
  // Quản trị. Cấp 1 thấy toàn hệ thống; Cấp 3 chỉ thấy cơ sở mình phụ trách.
  const coSo = phamViCoSo(user);
  if (!coSo) {
    return withParents(all('students', 'SELECT * FROM students WHERE active = 1 ORDER BY name'));
  }
  const nhomCoSo = classIdsOfCampus(coSo);
  if (!nhomCoSo.length) return [];
  const dau = nhomCoSo.map(() => '?').join(',');
  return withParents(all('students',
    `SELECT * FROM students WHERE classId IN (${dau}) AND active = 1 ORDER BY name`, nhomCoSo));
}

// Chỉ trả về danh sách mã học sinh — nhẹ hơn khi chỉ cần lọc.
function studentIdsOf(user) {
  return studentsOf(user).map(s => s.id);
}

function canAccessStudent(user, studentId) {
  if (!user || !studentId) return false;
  if (user.role === 'admin') {
    const coSo = phamViCoSo(user);
    if (!coSo) return true;                       // Cấp 1 — toàn hệ thống
    // Cấp 3 — chỉ bé thuộc một nhóm của cơ sở mình. Bé chưa xếp nhóm, hoặc nhóm
    // chưa gắn cơ sở, thì KHÔNG thuộc về cơ sở nào: chỉ Cấp 1 thấy.
    return count(
      `SELECT COUNT(*) FROM students s
       JOIN class_campus cc ON cc.classId = s.classId
       WHERE s.id = ? AND cc.campusId = ?`,
      [studentId, coSo]) > 0;
  }
  if (user.role === 'parent') {
    return count(
      'SELECT COUNT(*) FROM student_parents WHERE parentId = ? AND studentId = ?',
      [user.id, studentId]) > 0;
  }
  if (user.role === 'teacher') {
    // Bé thuộc một nhóm mà cô đang phụ trách, và nhóm đó chưa đóng.
    return count(
      `SELECT COUNT(*) FROM students s
       JOIN class_teachers ct ON ct.classId = s.classId
       JOIN classes c ON c.id = ct.classId
       WHERE s.id = ? AND ct.teacherId = ? AND c.active = 1`,
      [studentId, user.id]) > 0;
  }
  return false;
}

// Các nhóm lớp mà người dùng được xem dữ liệu.
function classIdsOf(user) {
  if (!user) return [];
  if (user.role === 'admin') {
    const coSo = phamViCoSo(user);
    return coSo ? classIdsOfCampus(coSo) : classes().map(c => c.id);
  }
  if (user.role === 'teacher') return classIdsOfTeacher(user.id);
  const rows = prepare(
    `SELECT DISTINCT s.classId AS classId FROM students s
     JOIN student_parents sp ON sp.studentId = s.id
     WHERE sp.parentId = ? AND s.active = 1 AND s.classId IS NOT NULL`).all(user.id);
  return rows.map(r => r.classId);
}

function canAccessClass(user, classId) {
  return !!classId && classIdsOf(user).includes(classId);
}

// Ghi nhật ký thao tác để tra khi có khiếu nại.
function audit(userId, action, target, detail) {
  try {
    run('INSERT INTO audit_log (at, userId, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), userId || null, action, target || null,
        detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail))]);
  } catch (_) { /* nhật ký hỏng không được làm gián đoạn nghiệp vụ chính */ }
}

function isEmpty() {
  return count('SELECT COUNT(*) FROM users') === 0;
}

// Đóng kết nối gọn gàng khi máy chủ tắt.
function close() {
  try { sqlite.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
  try { sqlite.close(); } catch (_) {}
}

module.exports = {
  sqlite, DB_FILE, DATA_DIR,
  all, first, run, count, insert, upsert, update, remove, tx, prepare, nextId,
  school, setSchool, classes, findClass,
  findUser, findUserByUsername, findStudent, withParents,
  studentsOf, studentIdsOf, canAccessStudent, classIdsOf, canAccessClass,
  teachersOfClass, teacherIdsOfClass, classIdsOfTeacher, classIdsEverOfTeacher,
  isTeacherOfClass, setClassTeachers, addClassTeacher, removeClassTeacher,
  setHomeroomTeacher, backfillClassTeachers,
  coTangCoSo, campuses, findCampus, campusOfClass, campusOfUser, classIdsOfCampus,
  setClassCampus, setUserCampus, phamViCoSo, canAccessCampus, backfillClassCampus,
  audit, isEmpty, close,
};
