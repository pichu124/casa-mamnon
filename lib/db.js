// Tầng dữ liệu CASA Mầm non trên nền SQLite.
//
// Vì sao dùng SQLite thay cho tệp JSON: ở quy mô 300 học sinh, kho JSON phải ghi
// lại toàn bộ tệp 31 MB cho mỗi thay đổi nhỏ, mất 1.803 ms và chặn cả máy chủ.
// SQLite chỉ ghi đúng dòng thay đổi, mất khoảng 0,03 ms.
//
// Tệp dữ liệu nằm trong DATA_DIR nên khi triển khai chỉ cần gắn một ổ đĩa vào
// đó là giữ được cả cơ sở dữ liệu lẫn ảnh album qua các lần cập nhật.
const crypto = require('crypto');
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
  // Thực đơn riêng của từng cơ sở — cùng hình dạng `meals` với `menus`.
  // CHỈ THÊM MỘT KHOÁ MỚI, không đụng khoá nào đang có: bảng chưa tồn tại thì
  // dòng này không bao giờ được tra tới, nên bước này an toàn kể cả khi đứng
  // một mình trước lúc bảng được tạo.
  menu_campus: ['meals'],
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

// HÀNG RÀO ĐỊNH DANH cho các hàm ghép tên bảng/cột vào câu SQL.
//
// `insert`/`upsert`/`update`/`remove` ghép thẳng tên bảng và TÊN KHOÁ của đối
// tượng vào chuỗi SQL (giá trị thì luôn đi qua tham số — an toàn). Mọi chỗ gọi
// hôm nay đều truyền chuỗi cứng, nhưng đây là tệp dùng chung: ngày một phân hệ
// mới lỡ đưa khoá từ thân yêu cầu vào thẳng object là thành SQL injection. Một
// tên định danh hợp lệ chỉ gồm chữ, số, gạch dưới — ngoài khuôn đó thì ném lỗi
// ngay tại chỗ gọi thay vì để chuỗi lạ chui vào câu lệnh.
const TEN_DINH_DANH = /^[A-Za-z_][A-Za-z0-9_]*$/;
function tenDinhDanh(ten, loai) {
  if (!TEN_DINH_DANH.test(String(ten))) {
    throw new Error(`Tên ${loai} không hợp lệ trong câu SQL: "${String(ten).slice(0, 40)}"`);
  }
  return ten;
}

function insert(table, obj) {
  tenDinhDanh(table, 'bảng');
  const row = encode(table, obj);
  const cols = Object.keys(row).map(c => tenDinhDanh(c, 'cột'));
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => `@${c}`).join(', ')})`;
  prepare(sql).run(row);
  return obj;
}

// Ghi đè nếu đã tồn tại (dùng cho điểm danh: mỗi học sinh mỗi ngày một bản ghi).
function upsert(table, obj, conflictCols) {
  tenDinhDanh(table, 'bảng');
  (conflictCols || []).forEach(c => tenDinhDanh(c, 'cột'));
  const row = encode(table, obj);
  const cols = Object.keys(row).map(c => tenDinhDanh(c, 'cột'));
  const updates = cols.filter(c => !conflictCols.includes(c)).map(c => `${c} = excluded.${c}`);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => `@${c}`).join(', ')})
    ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET ${updates.join(', ')}`;
  prepare(sql).run(row);
  return obj;
}

function update(table, id, patch, idCol = 'id') {
  tenDinhDanh(table, 'bảng');
  tenDinhDanh(idCol, 'cột');
  const row = encode(table, patch);
  const cols = Object.keys(row).map(c => tenDinhDanh(c, 'cột'));
  if (!cols.length) return 0;
  const sql = `UPDATE ${table} SET ${cols.map(c => `${c} = @${c}`).join(', ')} WHERE ${idCol} = @__id`;
  return prepare(sql).run({ ...row, __id: id }).changes;
}

function remove(table, id, idCol = 'id') {
  tenDinhDanh(table, 'bảng');
  tenDinhDanh(idCol, 'cột');
  return prepare(`DELETE FROM ${table} WHERE ${idCol} = ?`).run(id).changes;
}

// Gom nhiều thao tác thành một giao dịch: hoặc tất cả cùng thành công, hoặc
// không có gì được ghi. Dùng khi tạo album kèm ảnh, nhập danh sách hàng loạt...
function tx(fn) {
  return sqlite.transaction(fn)();
}

// Mã bản ghi: mốc mili giây (base36) + bộ đếm trong tiến trình + 3 ký tự ngẫu
// nhiên MẬT MÃ.
//
// Bản cũ gieo bộ đếm bằng `Date.now() % 1e6` mỗi lần khởi động — chu kỳ 16,7
// phút — cộng 2 ký tự Math.random: hai lần khởi động cách nhau đúng chu kỳ có
// xác suất thật sinh id trùng khoá chính, và INSERT nổ giữa nghiệp vụ. Mốc
// mili giây đầy đủ thì không quay vòng; bộ đếm tách hai lời gọi trong cùng một
// mili giây; phần ngẫu nhiên tách hai tiến trình chạy song song.
let idCounter = 0;
function nextId(prefix) {
  idCounter = (idCounter + 1) % 46656; // 36^3
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36).padStart(3, '0')}`
    + crypto.randomInt(46656).toString(36).padStart(3, '0');
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

  // VÒNG XOÁ SO VỚI DANH SÁCH XIN GỐC, KHÔNG SO VỚI DANH SÁCH ĐÃ LỌC.
  //
  // `loSachDanhSachCo` gạt cô có tài khoản đang khoá (nghỉ thai sản, nghỉ dài
  // ngày) để không THÊM nhầm người không làm việc. Nhưng nếu vòng xoá bên dưới
  // so với danh sách ĐÃ LỌC đó thì hễ danh sách xin có kèm cô đang nghỉ —
  // đúng điều `addClassTeacher`/`removeClassTeacher` làm, vì hai hàm này chép
  // nguyên danh sách hiện có của nhóm — dòng phân công của cô bị XOÁ như một
  // tác dụng phụ không ai bấm. Cô quay lại làm việc là mất luôn dấu "từng phụ
  // trách nhóm này", tức mất đường mở album của đúng những năm cô dạy.
  //
  // Nên: chỉ xoá dòng của id KHÔNG có trong danh sách xin gốc — tức bị chủ ý
  // gỡ. Cô đang nghỉ có mặt trong danh sách xin thì được GIỮ NGUYÊN dòng đang
  // có (vòng ghi bên dưới vẫn dùng `ds` đã lọc, nên không ai thêm mới được
  // một tài khoản khoá vào nhóm).
  const xinGoc = new Set((Array.isArray(teacherIds) ? teacherIds : []).filter(Boolean));

  tx(() => {
    for (const id of teacherIdsOfClass(classId)) {
      if (!xinGoc.has(id)) {
        run('DELETE FROM class_teachers WHERE classId = ? AND teacherId = ?', [classId, id]);
      }
    }
    if (chinh) {
      // Hạ vai "chính" ở nhóm khác — nhưng CHỈ nhóm ĐANG MỞ. Luật "một cô chỉ
      // chính một nhóm" nói về hiện tại; dòng của nhóm đã đóng là sổ ghi "ai
      // từng là cô chính năm đó", hạ nó xuống là viết lại lịch sử.
      run(`UPDATE class_teachers SET vaiTro = 'phu'
           WHERE teacherId = ? AND classId IS NOT ?
             AND classId IN (SELECT id FROM classes WHERE active = 1)`,
      [chinh, classId]);
    }
    for (const id of ds) {
      run(`INSERT INTO class_teachers (classId, teacherId, vaiTro, ganLuc) VALUES (?, ?, ?, ?)
           ON CONFLICT (classId, teacherId) DO UPDATE SET vaiTro = excluded.vaiTro`,
        [classId, id, id === chinh ? 'chinh' : 'phu', luc]);
    }
    // Dòng được GIỮ NGUYÊN ở vòng xoá (cô đang khoá tài khoản) không đi qua
    // vòng ghi, nên nếu cô ấy đang là 'chinh' mà `chinh` vừa được chọn là người
    // khác thì nhóm mang HAI dòng 'chinh'. Một nhóm chỉ có một cô chính.
    if (chinh) {
      run(`UPDATE class_teachers SET vaiTro = 'phu'
           WHERE classId = ? AND teacherId != ? AND vaiTro = 'chinh'`, [classId, chinh]);
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
      // CHỈ GỠ CÔ KHỎI CÁC NHÓM ĐANG MỞ — không đụng nhóm đã đóng.
      //
      // Bản trước quét `classIdsEverOfTeacher` (mọi nhóm cô TỪNG phụ trách, kể
      // cả nhóm đã đóng sau chuyển năm). Điều đó phá đúng lời cam kết ghi ở
      // `classIdsOfTeacher` phía trên: dòng class_teachers của nhóm đã đóng
      // được GIỮ LẠI để cô còn mở album năm cũ. Tệ hơn, xoá cô "chính" của một
      // nhóm đã đóng làm `setClassTeachers` tự thăng cô "phụ" còn lại của nhóm
      // đó lên "chính", rồi câu hạ vai trong hàm ấy hạ cô này xuống "phụ" ở
      // MỌI nhóm khác — kể cả nhóm ĐANG MỞ cô ấy đang phụ trách chính — và
      // `mirrorLegacyHomeroom` ghi hai cột gương trỏ về nhóm đã đóng. Một lời
      // gọi từ bản giao diện cũ làm sai phân công của một nhóm đang hoạt động
      // ở chỗ khác.
      //
      // Nghĩa gốc app 1 "gán cô vào lớp này thì gỡ khỏi mọi lớp khác" vốn chỉ
      // nói về các lớp ĐANG MỞ — thời một cô một lớp, lớp đã đóng không nằm
      // trong hai cột cũ. Quét nhóm đang mở là đủ đúng nghĩa đó.
      for (const cid of classIdsOfTeacher(teacherId)) {
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
// HỒ SƠ MỞ RỘNG CỦA BÉ và NGƯỜI LIÊN HỆ KHẨN CẤP
//
// Nhà trường yêu cầu thêm ba thứ vào hồ sơ bé:
//
//   • số định danh cá nhân;
//   • "Tiền sử bệnh / lưu ý đặc biệt" — rộng hơn ô "Dị ứng" đời cũ, vì thứ cô
//     cần biết trước khi nhận một bé không chỉ là dị ứng (hen, co giật do sốt,
//     thuốc đang dùng…);
//   • người liên hệ khẩn cấp NGOÀI bố mẹ, vì có lúc gọi bố mẹ không được.
//
// Ô "Dị ứng" cũ (`students.allergies`) KHÔNG bị xóa và không bị đụng tới. Dữ
// liệu đã nhập vào đó vẫn còn nguyên, và `tienSuBenh` khi chưa có gì thì tự lùi
// về đọc ô cũ — nhờ vậy trường nào đã nhập dị ứng cho 300 bé không phải nhập
// lại, và không màn hình nào mất chữ trong lúc chuyển.
// ---------------------------------------------------------------------------

function hoSoMoRong(studentId) {
  if (!studentId) return null;
  return first('student_profile', 'SELECT * FROM student_profile WHERE studentId = ?', [studentId]);
}

// Hồ sơ mở rộng của bé, đã lùi sẵn về dữ liệu đời cũ khi chưa có gì mới.
function hoSoBe(studentId) {
  const be = findStudent(studentId);
  if (!be) return null;
  const mr = hoSoMoRong(studentId) || {};
  return {
    soDinhDanh: mr.soDinhDanh || '',
    // Chưa ai nhập tiền sử bệnh thì dùng lại ô "Dị ứng" đời cũ. Đây là chỗ dữ
    // liệu cũ được TÔN TRỌNG chứ không bị bỏ lại phía sau.
    tienSuBenh: mr.tienSuBenh || be.allergies || '',
    lienHeKhanCap: lienHeKhanCap(studentId),
  };
}

function luuHoSoBe(studentId, { soDinhDanh, tienSuBenh } = {}) {
  if (!studentId || !findStudent(studentId)) return null;
  const cu = hoSoMoRong(studentId) || {};
  const rec = {
    studentId,
    soDinhDanh: soDinhDanh !== undefined ? String(soDinhDanh).trim() : (cu.soDinhDanh || ''),
    tienSuBenh: tienSuBenh !== undefined ? String(tienSuBenh).trim() : (cu.tienSuBenh || ''),
    capNhatLuc: new Date().toISOString(),
  };
  run(`INSERT INTO student_profile (studentId, soDinhDanh, tienSuBenh, capNhatLuc)
       VALUES (@studentId, @soDinhDanh, @tienSuBenh, @capNhatLuc)
       ON CONFLICT(studentId) DO UPDATE SET
         soDinhDanh = excluded.soDinhDanh,
         tienSuBenh = excluded.tienSuBenh,
         capNhatLuc = excluded.capNhatLuc`, rec);
  return hoSoBe(studentId);
}

function lienHeKhanCap(studentId) {
  if (!studentId) return [];
  return all('student_emergency_contacts',
    'SELECT * FROM student_emergency_contacts WHERE studentId = ? ORDER BY taoLuc, rowid', [studentId]);
}

// Ghi đè TOÀN BỘ danh sách người liên hệ khẩn cấp của một bé.
//
// Ghi đè cả cụm chứ không sửa từng dòng: màn hình cho nhập mấy dòng cùng lúc,
// và "xóa dòng thứ hai" qua đường sửa-từng-dòng luôn là chỗ dễ lệch nhất.
function datLienHeKhanCap(studentId, danhSach) {
  if (!studentId || !findStudent(studentId)) return [];
  const sach = (Array.isArray(danhSach) ? danhSach : [])
    .map(x => ({
      hoTen: String((x || {}).hoTen || '').trim(),
      quanHe: String((x || {}).quanHe || '').trim(),
      dienThoai: String((x || {}).dienThoai || '').trim(),
      ghiChu: String((x || {}).ghiChu || '').trim(),
    }))
    .filter(x => x.hoTen);           // không tên thì không phải một người liên hệ
  tx(() => {
    run('DELETE FROM student_emergency_contacts WHERE studentId = ?', [studentId]);
    const luc = new Date().toISOString();
    for (const x of sach) {
      insert('student_emergency_contacts', { id: nextId('lhkc'), studentId, ...x, taoLuc: luc });
    }
  });
  return lienHeKhanCap(studentId);
}

// ---------------------------------------------------------------------------
// HỒ SƠ MỞ RỘNG CỦA NGƯỜI LỚN — hiện chỉ có số CCCD của phụ huynh
//
// Nhà trường cần số này để đối chiếu khi ký hợp đồng và khi giao bé cho người
// tới đón. Nó là dữ liệu cá nhân của NGƯỜI LỚN, và ranh giới của nó khác hẳn
// ranh giới của số định danh bé:
//
//   • Số định danh của BÉ: quản trị đọc được, cô và phụ huynh thì không.
//   • Số CCCD của PHỤ HUYNH: quản trị đọc được, CHÍNH NGƯỜI ĐÓ đọc được (đây là
//     dữ liệu của họ, họ có quyền biết trường đang giữ gì), còn cô và người
//     phối ngẫu thì KHÔNG. Bố mẹ ly hôn là chuyện có thật ở trường mầm non; app
//     không được là nơi một bên lấy được số giấy tờ của bên kia.
//
// Ranh giới đó phải cắt ở tầng đường dẫn — hàm này chỉ đọc và ghi, không tự
// quyết ai được thấy. Xem `routes/students.js` và `routes/admin.js`.
// ---------------------------------------------------------------------------

function hoSoNguoiDung(userId) {
  if (!userId) return null;
  const r = first('user_profile', 'SELECT * FROM user_profile WHERE userId = ?', [userId]);
  return { soCccd: (r && r.soCccd) || '' };
}

// Ghi hồ sơ mở rộng của một người. KHÔNG GỬI MỘT TRƯỜNG = KHÔNG ĐỤNG TỚI NÓ,
// khác hẳn xóa trắng — cùng luật với `luuHoSoBe`, và cùng lý do: một màn hình
// cũ chưa biết trường mới mà lưu hồ sơ thì không được làm bay dữ liệu.
function luuHoSoNguoiDung(userId, { soCccd } = {}) {
  if (!userId || !findUser(userId)) return null;
  const cu = first('user_profile', 'SELECT * FROM user_profile WHERE userId = ?', [userId]) || {};
  const rec = {
    userId,
    soCccd: soCccd !== undefined ? String(soCccd).trim() : (cu.soCccd || ''),
    capNhatLuc: new Date().toISOString(),
  };
  run(`INSERT INTO user_profile (userId, soCccd, capNhatLuc)
       VALUES (@userId, @soCccd, @capNhatLuc)
       ON CONFLICT(userId) DO UPDATE SET
         soCccd = excluded.soCccd,
         capNhatLuc = excluded.capNhatLuc`, rec);
  return hoSoNguoiDung(userId);
}

// ---------------------------------------------------------------------------
// ĐỒNG Ý CỦA GIA ĐÌNH, VÀ LUẬT ẢNH NHÓM
//
// CLAUDE.md: "Ảnh nhóm: một ảnh chỉ hiện cho gia đình khác khi MỌI bé trong ảnh
// đều có đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện."
//
// Che ở giao diện là vô nghĩa với ảnh: đường /api/albums/:id/photo/:photoId trả
// về đúng các byte của tấm ảnh, ai biết mã ảnh là tải được. Nên luật phải nằm ở
// đây, và mọi đường đụng tới ảnh phải hỏi qua hàm này.
// ---------------------------------------------------------------------------

// Đồng ý của một bé. Ba giá trị cho mỗi mục: true / false / null (chưa trả lời).
function dongYCuaBe(studentId) {
  const r = studentId
    ? first('student_consent', 'SELECT * FROM student_consent WHERE studentId = ?', [studentId])
    : null;
  const ba = (v) => (v == null ? null : !!v);
  return {
    hoSoHocTap: ba(r && r.hoSoHocTap),
    chiaSeGiaDinh: ba(r && r.chiaSeGiaDinh),
    truyenThong: ba(r && r.truyenThong),
    nguoiKy: (r && r.nguoiKy) || '',
    ngayKy: (r && r.ngayKy) || '',
    ghiChu: (r && r.ghiChu) || '',
    capNhatLuc: (r && r.capNhatLuc) || '',
  };
}

// Ghi đồng ý. KHÔNG GỬI MỘT MỤC = KHÔNG ĐỤNG TỚI MỤC ĐÓ, cùng luật với
// `luuHoSoBe`. Gửi null là chủ ý đưa mục đó về "chưa trả lời".
//
// Viết bằng run() chứ không qua insert/update: `encode` biến null thành 0, tức
// biến "chưa trả lời" thành "từ chối" — xem chú thích ở lib/schema.sql.
function datDongY(studentId, moi = {}) {
  if (!studentId || !findStudent(studentId)) return null;
  const cu = first('student_consent', 'SELECT * FROM student_consent WHERE studentId = ?', [studentId]) || {};
  const lay = (ten) => {
    if (!(ten in moi)) return cu[ten] == null ? null : (cu[ten] ? 1 : 0);
    return moi[ten] == null ? null : (moi[ten] ? 1 : 0);
  };
  const chu = (ten) => (moi[ten] !== undefined ? String(moi[ten]).trim() : (cu[ten] || ''));
  run(`INSERT INTO student_consent
         (studentId, hoSoHocTap, chiaSeGiaDinh, truyenThong, nguoiKy, ngayKy, ghiChu, capNhatLuc)
       VALUES (@studentId, @hoSoHocTap, @chiaSeGiaDinh, @truyenThong, @nguoiKy, @ngayKy, @ghiChu, @capNhatLuc)
       ON CONFLICT(studentId) DO UPDATE SET
         hoSoHocTap = excluded.hoSoHocTap,
         chiaSeGiaDinh = excluded.chiaSeGiaDinh,
         truyenThong = excluded.truyenThong,
         nguoiKy = excluded.nguoiKy,
         ngayKy = excluded.ngayKy,
         ghiChu = excluded.ghiChu,
         capNhatLuc = excluded.capNhatLuc`, {
    studentId,
    hoSoHocTap: lay('hoSoHocTap'),
    chiaSeGiaDinh: lay('chiaSeGiaDinh'),
    truyenThong: lay('truyenThong'),
    nguoiKy: chu('nguoiKy'),
    ngayKy: chu('ngayKy'),
    ghiChu: chu('ghiChu'),
    capNhatLuc: new Date().toISOString(),
  });
  return dongYCuaBe(studentId);
}

// Bé được gắn thẻ trong một tấm ảnh.
function beTrongAnh(photoId) {
  if (!photoId) return [];
  return all('photo_students',
    'SELECT studentId FROM photo_students WHERE photoId = ?', [photoId]).map(r => r.studentId);
}

// Đặt TOÀN BỘ danh sách bé của một tấm ảnh. Mảng rỗng là gỡ hết thẻ — chủ ý.
function datBeTrongAnh(photoId, danhSach) {
  if (!photoId) return [];
  const ids = [...new Set((danhSach || []).filter(id => id && findStudent(id)))];
  tx(() => {
    run('DELETE FROM photo_students WHERE photoId = ?', [photoId]);
    const luc = new Date().toISOString();
    for (const studentId of ids) {
      run('INSERT OR IGNORE INTO photo_students (photoId, studentId, ganLuc) VALUES (?, ?, ?)',
        [photoId, studentId, luc]);
    }
  });
  return beTrongAnh(photoId);
}

// GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP CỦA BÉ NÀY CHƯA (ô đồng ý ①).
//
// BA GIÁ TRỊ, KHÔNG PHẢI HAI — và đây là chỗ dễ viết sai nhất của cả đợt.
// `hoSoHocTap` là `true` / `false` / `null`, trong đó `null` nghĩa là CHƯA THU
// ĐƯỢC GIẤY. Chỉ `false` mới là lời từ chối thật. Viết `if (!hoSoHocTap)` cho
// gọn là tháng Chín cả trường không ghi được gì, vì đầu năm học hàng chục tờ
// giấy chưa về — đúng cái bẫy mà `coBeTuChoiChiaSe` ngay dưới đã tránh bằng
// cách hỏi thẳng `= 0`.
//
// RÚT LÀ NGƯNG GHI MỚI, KHÔNG PHẢI XOÁ VÀ KHÔNG PHẢI ĐÓNG ĐƯỜNG ĐỌC.
//
// Hàm này CHỈ được gọi ở các đường GHI hồ sơ học tập (Hành trình, Ghi nhanh,
// Kế hoạch của bé, Báo cáo học tập). Tuyệt đối không gài nó vào
// `canAccessStudent`: hàm đó gác khoảng 40 đường ĐỌC — nhật ký ngày, sức khoẻ,
// dặn thuốc, đón trả, học phí — và cắt gia đình khỏi hồ sơ sức khoẻ của chính
// con mình thì không phải điều họ xin khi gạt ô ①.
function beNgungHoSoHocTap(studentId) {
  if (!studentId) return false;
  return dongYCuaBe(studentId).hoSoHocTap === false;
}

// Bản LÔ của hàm trên — trả về Set những bé đã dừng, trong một câu truy vấn.
//
// Dùng cho các đường ghi CẢ NHÓM một lượt (kế hoạch tháng, chép tháng trước).
// Ở đó luật là BỎ QUA bé đã dừng chứ không từ chối cả lô: một bé làm hỏng kế
// hoạch tháng của cả nhóm là vi phạm Nguyên tắc số 1 ở vế "mọi tính năng khác
// vẫn chạy y như cũ", và cô sẽ không hiểu vì sao.
function dsBeNgungHoSoHocTap(studentIds) {
  const sach = [...new Set((studentIds || []).filter(Boolean))];
  const ra = new Set();
  for (const lo of chiaLo(sach)) {
    const marks = lo.map(() => '?').join(',');
    for (const r of all('student_consent',
      `SELECT studentId FROM student_consent
        WHERE studentId IN (${marks}) AND hoSoHocTap = 0`, lo)) {
      ra.add(r.studentId);
    }
  }
  return ra;
}

// Nhóm này có bé nào gia đình đã NÓI KHÔNG với việc chia sẻ ảnh chưa.
//
// Chỉ tính lời từ chối THẬT (chiaSeGiaDinh = 0), không tính bé chưa trả lời.
function coBeTuChoiChiaSe(classId) {
  if (!classId) return false;
  return count(
    `SELECT COUNT(*) FROM student_consent sc
     JOIN students s ON s.id = sc.studentId
     WHERE s.classId = ? AND s.active = 1 AND sc.chiaSeGiaDinh = 0`, [classId]) > 0;
}

// CÙNG CÂU HỎI, NHƯNG TÍNH CẢ NHỮNG BÉ TỪNG HỌC NHÓM ĐÓ.
//
// VÌ SAO PHẢI CÓ HÀM THỨ HAI
//
// `coBeTuChoiChiaSe` ở trên hỏi bằng hai điều kiện đều nói về HIỆN TẠI:
// `s.classId = ?` và `s.active = 1`. Cả hai đều hết đúng ngay sau khi chuyển
// năm học — bé đã sang nhóm mới, hoặc đã ra trường.
//
// Mà album của năm cũ thì vẫn còn nguyên, và gia đình vẫn xem lại được qua màn
// "Năm học trước". Nên chuỗi sự việc là thế này:
//
//   Tháng 9  gia đình bé Hân ký giấy: KHÔNG chia sẻ ảnh.
//            → ảnh chưa gắn thẻ của nhóm Chồi 2 tạm ẩn với gia đình khác. Đúng.
//   Tháng 6  chuyển năm học. Bé Hân sang nhóm Lá 1.
//            → `s.classId = 'c1'` không còn đúng, hàm trên trả về false.
//   Tháng 7  một gia đình khác mở lại album Chồi 2 của năm ngoái.
//            → NHỮNG TẤM ẢNH TỪNG BỊ ẨN NAY HIỆN TRỞ LẠI.
//
// Không ai bấm gì cả, không ai rút lời từ chối. Nó tự hết hiệu lực theo lịch
// nhà trường. Đó là kiểu rò rỉ tệ nhất: im lặng, đúng hạn, và không ai biết.
//
// Hàm này hỏi thêm bảng `student_class_periods` — sổ ghi bé từng học nhóm nào,
// từ ngày nào tới ngày nào. Một khi đã trả về true thì không bao giờ trở lại
// false, và đó chính là tính chất cần có: lời từ chối chỉ mất hiệu lực khi
// GIA ĐÌNH RÚT, không phải khi năm học sang trang.
//
// CỐ Ý KHÔNG so theo NGÀY CHỤP ẢNH, dù bảng kia có sẵn cột `tu` và `den`.
// So theo ngày thì chặt hơn, nhưng sai một ly là lộ ảnh — còn cách này sai về
// phía ẩn thừa, và ẩn thừa thì cô gắn thẻ bé một lượt là ảnh hiện lại.
function coBeTuChoiChiaSeTungHoc(classId) {
  if (!classId) return false;
  if (coBeTuChoiChiaSe(classId)) return true;
  return count(
    `SELECT COUNT(*) FROM student_consent sc
     JOIN student_class_periods p ON p.studentId = sc.studentId
     WHERE p.classId = ? AND sc.chiaSeGiaDinh = 0`, [classId]) > 0;
}

// LỌC ẢNH THEO NGƯỜI XEM — luật ảnh nhóm nằm ở đây, và chỉ ở đây.
//
// Ba nhánh, theo đúng thứ tự:
//
//   1. CÔ VÀ QUẢN TRỊ THẤY HẾT. Họ là người chụp, người gắn thẻ, người chịu
//      trách nhiệm. Giấu ảnh khỏi cô là làm cô không gắn thẻ được, tức là làm
//      chính cơ chế này chết.
//
//   2. ẢNH ĐÃ GẮN THẺ: phụ huynh thấy khi MỌI bé trong ảnh hoặc là CON CỦA
//      CHÍNH HỌ, hoặc có đồng ý chia sẻ. Một bé chưa trả lời cũng đủ để ảnh
//      không hiện cho nhà khác — im lặng không phải là đồng ý.
//
//      CHÚ Ý CHỖ NÀY, VÌ NÓ DỄ VIẾT SAI THÀNH NGƯỢC LẠI.
//
//      Bản đầu của hàm này viết "ảnh có con mình thì LUÔN xem được", đặt trước
//      cả phép kiểm đồng ý. Nghe rất thuận tai — ảnh của con mình thì bố mẹ
//      xem chứ sao. Nhưng một tấm ảnh có cả bé An lẫn bé Hân, mà gia đình bé
//      Hân đã nói không, thì cho nhà bé An xem CHÍNH LÀ đưa ảnh bé Hân sang
//      một gia đình khác. Đúng thứ mà lời từ chối đó cấm.
//
//      Hai quyền va nhau ở đây: quyền xem ảnh con mình, và quyền không cho ảnh
//      con mình sang nhà khác. CLAUDE.md đã chọn sẵn: "một ảnh chỉ hiện cho
//      gia đình KHÁC khi MỌI bé trong ảnh đều có đồng ý". Lời từ chối thắng.
//      Nhà bé An mất một tấm ảnh; nhà bé Hân giữ được điều họ đã yêu cầu.
//
//   3. ẢNH CHƯA GẮN THẺ: đây là chỗ phải cân nhắc kỹ nhất, vì gắt quá thì làm
//      hỏng app đang chạy, lỏng quá thì luật thành lời hứa suông.
//
//      Chưa gắn thẻ nghĩa là app KHÔNG BIẾT trong ảnh có ai. Nếu cả nhóm chưa
//      ai từ chối — trường hợp thường gặp nhất, và là trường hợp của trường
//      chưa thu giấy đồng ý — thì không có gì để bảo vệ, ảnh hiện như trước.
//      Đây chính là chỗ Nguyên tắc số 1 được giữ: bật cơ chế này lên không làm
//      biến mất một tấm ảnh nào của trường đang dùng.
//
//      Nhưng chỉ cần MỘT gia đình trong nhóm nói không, thì một tấm ảnh không
//      rõ có ai là một rủi ro thật. Lúc đó ảnh chưa gắn thẻ tạm ẩn với gia đình
//      khác cho tới khi cô gắn thẻ. Màn hình của cô nói rõ điều đó và nói rõ
//      cách làm nó hiện lại — ẩn mà không giải thích là chỗ cô mất lòng tin
//      vào app.
function locAnhChoNguoiXem(photos, user, classId) {
  if (!user || user.role !== 'parent') return photos || [];
  // "Con mình" theo QUAN HỆ, không theo trạng thái đang học — bé đã rời trường
  // (gia đình còn hạn xem album năm cũ) vẫn là con của chính nhà đó. Xem chú
  // thích ở `studentIdsCuaPhuHuynh`.
  const conMinh = new Set(studentIdsCuaPhuHuynh(user.id));
  // Dùng bản TỪNG HỌC, không dùng bản chỉ nhìn hiện tại — xem chú thích dài ở
  // `coBeTuChoiChiaSeTungHoc`. Album của năm cũ vẫn xem lại được, nên lời từ
  // chối cũng phải còn hiệu lực ở đó.
  const nhomCoNguoiTuChoi = coBeTuChoiChiaSeTungHoc(classId);

  return (photos || []).filter(anh => {
    const beDuocGan = beTrongAnh(anh.id);
    if (!beDuocGan.length) return !nhomCoNguoiTuChoi;
    // Con mình KHÔNG phải lối tắt bỏ qua đồng ý của bé khác — nó chỉ miễn phép
    // kiểm cho chính con mình. Ảnh chỉ có con mình thì luôn xem được.
    return beDuocGan.every(id => conMinh.has(id) || dongYCuaBe(id).chiaSeGiaDinh === true);
  });
}

// BẢN LÔ CỦA BA HÀM TRÊN — THÊM BÊN CẠNH, KHÔNG SỬA HÀM CŨ.
//
// VÌ SAO CẦN
//
// `locAnhChoNguoiXem` hỏi cơ sở dữ liệu MỘT LẦN CHO MỖI TẤM ẢNH
// (`beTrongAnh`), rồi MỘT LẦN NỮA CHO MỖI BÉ được gắn thẻ (`dongYCuaBe`).
// Với bốn album của dữ liệu mẫu thì không ai thấy gì. Đo ở quy mô một năm học
// thật — 120 album, mỗi album 25 ảnh, mỗi ảnh 4 bé — một lượt phụ huynh bấm
// vào tab Album tốn **8.218 câu truy vấn**, trong đó 4.200 câu hỏi đồng ý và
// 3.018 câu hỏi thẻ ảnh. Trên máy Android rẻ của trường và một VPS nhỏ, đó là
// màn quay vòng đầu tiên — mà lại đúng là màn gia đình mở nhiều nhất.
//
// VÌ SAO PHẢI LÀ HÀM MỚI, KHÔNG PHẢI SỬA HÀM CŨ
//
// Ba hàm kia là tệp dùng chung, và `CLAUDE.md` cho nhóm này đúng một luật:
// **chỉ được thêm**. `dongYCuaBe` đang có tám chỗ gọi ngoài album — hồ sơ bé,
// màn quản trị, xuất Excel, Cambridge... Đổi ruột nó để "tiện gom lô" là đổi
// hành vi của tám tính năng cùng lúc, mà bảy trong tám không xin điều đó.
//
// BA CHỖ DỄ LÀM SAI, ĐỀU ĐÃ CÓ BÀI CANH
//
//   1. Bé KHÔNG có dòng trong `student_consent` là **CHƯA TRẢ LỜI**, không
//      phải "đồng ý". `Map.get(id)` trả về `undefined` cho bé chưa ký, nên
//      phép so phải giữ nguyên `=== true` như bản cũ. Viết `!== false` là lộ
//      ảnh cả nhóm.
//   2. Ảnh KHÔNG gắn thẻ bé nào vẫn phải có khoá trong Map, với mảng rỗng —
//      để bên gọi phân biệt được "chưa gắn thẻ" với "không tra".
//   3. SQLite giới hạn số tham số của một câu; chia lô 400 mã một lượt.
const LO_TOI_DA = 400;

function chiaLo(ds) {
  const ra = [];
  for (let i = 0; i < ds.length; i += LO_TOI_DA) ra.push(ds.slice(i, i + LO_TOI_DA));
  return ra;
}

// { photoId → [studentId] }. Ảnh không có thẻ nào vẫn có khoá, giá trị [].
function beTrongCacAnh(photoIds) {
  const ra = new Map();
  const sach = [...new Set((photoIds || []).filter(Boolean))];
  for (const id of sach) ra.set(id, []);
  for (const lo of chiaLo(sach)) {
    const marks = lo.map(() => '?').join(',');
    for (const r of all('photo_students',
      `SELECT photoId, studentId FROM photo_students WHERE photoId IN (${marks})`, lo)) {
      ra.get(r.photoId).push(r.studentId);
    }
  }
  return ra;
}

// { studentId → cùng hình dạng `dongYCuaBe` trả về }. Bé chưa ký vẫn có khoá,
// với cả ba mục là null — đúng nghĩa "chưa trả lời".
function dongYCuaCacBe(studentIds) {
  const ba = (v) => (v == null ? null : !!v);
  const rong = () => ({
    hoSoHocTap: null, chiaSeGiaDinh: null, truyenThong: null,
    nguoiKy: '', ngayKy: '', ghiChu: '', capNhatLuc: '',
  });
  const ra = new Map();
  const sach = [...new Set((studentIds || []).filter(Boolean))];
  for (const id of sach) ra.set(id, rong());
  for (const lo of chiaLo(sach)) {
    const marks = lo.map(() => '?').join(',');
    for (const r of all('student_consent',
      `SELECT * FROM student_consent WHERE studentId IN (${marks})`, lo)) {
      ra.set(r.studentId, {
        hoSoHocTap: ba(r.hoSoHocTap),
        chiaSeGiaDinh: ba(r.chiaSeGiaDinh),
        truyenThong: ba(r.truyenThong),
        nguoiKy: r.nguoiKy || '', ngayKy: r.ngayKy || '',
        ghiChu: r.ghiChu || '', capNhatLuc: r.capNhatLuc || '',
      });
    }
  }
  return ra;
}

// Bản lô của `locAnhChoNguoiXem`: nhận NHIỀU ẢNH CỦA NHIỀU ALBUM một lượt.
//
// `nhom` là { classId → [ảnh] }. Trả về cùng hình dạng, đã lọc. Luật lọc phải
// giống hệt bản cũ từng dòng một — bài canh `test:anh-nhom` chạy cả hai trên
// cùng dữ liệu rồi so từng mã ảnh, nên trôi một chút là đỏ.
function locAnhChoNguoiXemNhieuNhom(nhom, user) {
  const ra = {};
  const cac = Object.keys(nhom || {});
  if (!user || user.role !== 'parent') {
    for (const c of cac) ra[c] = nhom[c] || [];
    return ra;
  }
  // Cùng nguồn "con mình" với bản từng dòng ở trên — bài canh so hai bản trên
  // cùng dữ liệu, lệch nguồn là đỏ.
  const conMinh = new Set(studentIdsCuaPhuHuynh(user.id));
  const tuChoi = new Map();
  for (const c of cac) tuChoi.set(c, coBeTuChoiChiaSeTungHoc(c));

  const moiAnh = cac.flatMap(c => (nhom[c] || []).map(a => a.id));
  const the = beTrongCacAnh(moiAnh);
  const dongY = dongYCuaCacBe([...the.values()].flat());

  for (const c of cac) {
    ra[c] = (nhom[c] || []).filter(anh => {
      const beDuocGan = the.get(anh.id) || [];
      if (!beDuocGan.length) return !tuChoi.get(c);
      return beDuocGan.every(id => conMinh.has(id)
        || (dongY.get(id) || {}).chiaSeGiaDinh === true);
    });
  }
  return ra;
}

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

// Mọi nhóm CƠ SỞ NÀY TỪNG CÓ, kể cả nhóm đã đóng sau khi chuyển năm học.
//
// VÌ SAO PHẢI CÓ BẢN "TỪNG" BÊN CẠNH BẢN THƯỜNG
//
// `classIdsOfCampus` lọc `c.active = 1` — đúng cho mọi màn nói về việc ĐANG
// diễn ra. Nhưng đường tra BÉ ĐÃ RA TRƯỜNG thì ngược lại: chuyển năm học đóng
// mọi nhóm của năm cũ, mà bé ra trường vẫn giữ `classId` của nhóm cuối cùng.
// Dùng bản thường ở đó thì từ lần chuyển năm ĐẦU TIÊN trở đi, quản lý cơ sở mở
// màn "Bé đã ra trường" ra thấy trống trơn — vĩnh viễn, không một dòng nào nói
// vì sao, trong khi ban giám hiệu mở lên vẫn thấy đủ.
//
// KHÔNG dùng hàm này để cấp quyền đọc hồ sơ trẻ ĐANG HỌC — cùng lời dặn đã ghi
// ở `classIdsEverOfTeacher`, và cùng lý do: nhóm đã đóng là chuyện của quá
// khứ, quyền hôm nay phải tính trên nhóm đang mở.
function classIdsEverOfCampus(campusId) {
  if (!campusId) return [];
  return prepare(
    `SELECT cc.classId AS classId FROM class_campus cc
     JOIN classes c ON c.id = cc.classId
     WHERE cc.campusId = ?
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
//
// CHỈ TRẢ LỜI CHO TÀI KHOẢN QUẢN TRỊ. Cô và phụ huynh không có "quyền theo cơ
// sở" — quyền của họ đi theo nhóm lớp và theo con (xem chú thích đầu mục CƠ
// SỞ). Bản cũ trả `true` cho MỌI cơ sở khi người hỏi là cô/phụ huynh (vì
// `phamViCoSo` trả null cho họ), tức là một cái bẫy mở sẵn: đường dẫn mới nào
// gọi hàm này cho vai không phải quản trị là mở toang dữ liệu theo cơ sở.
// Hai chỗ gọi hiện có đều chỉ chạy trên quản trị nên siết lại không đổi hành
// vi nào đang chạy; vai khác cần hỏi thì dùng canAccessClass/canAccessStudent.
function canAccessCampus(user, campusId) {
  if (!user || !campusId) return false;
  if (user.role !== 'admin') return false;
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

// Số tháng gia đình còn xem được hồ sơ sau khi bé rời trường.
//
// Nhà trường chọn 1 năm: đủ để gia đình tải hồ sơ về khi con chuyển trường,
// rồi tự đóng lại. Dữ liệu trẻ dưới 6 tuổi thuộc nhóm nhạy cảm theo Nghị định
// 13/2023, nên mở quyền truy cập vô thời hạn là không nên.
//
// ĐỂ Ở ĐÂY, KHÔNG ĐỂ TRONG MỘT TỆP ĐƯỜNG DẪN. Một luật quyền nằm cạnh MỘT màn
// hình là một luật chỉ đúng ở màn hình đó — và đó chính là cách lỗ hổng Đ44
// sinh ra: mốc 12 tháng có thật, nhưng chỉ `routes/hocsinh-cu.js` biết.
const SO_THANG_GIU_HO_SO = 12;

// Bé rời trường rồi thì gia đình còn hạn xem hồ sơ không?
//
// `leftAt` rỗng hoặc hỏng thì trả `true` — CỐ Ý mở, không cố ý đóng: một ô ngày
// để trống không phải bằng chứng rằng bé đã rời trường từ lâu, và tự đóng cửa
// theo một dữ liệu thiếu là cắt nhầm quyền của gia đình đang gửi con.
// Người này có phải phụ huynh của bé này không — hỏi ĐÚNG quan hệ, không hỏi
// quyền. Quan hệ cha mẹ – con không mất khi bé rời trường; quyền đọc thì có
// hạn. Tách hai câu hỏi ra để chỗ nào cần nói "hồ sơ đã quá hạn tra cứu" còn
// phân biệt được gia đình của bé với một người lạ gõ trúng mã.
function laPhuHuynhCuaBe(parentId, studentId) {
  if (!parentId || !studentId) return false;
  return count(
    'SELECT COUNT(*) FROM student_parents WHERE parentId = ? AND studentId = ?',
    [parentId, studentId]) > 0;
}

// MỌI con của một phụ huynh — theo QUAN HỆ, không theo trạng thái đang học.
//
// Khác `studentIdsOf(user)`: hàm đó lọc `s.active = 1`, tức bé đã rời trường
// không còn trong danh sách. Đúng cho các màn "hôm nay của con", nhưng SAI cho
// diện miễn trừ "con mình" của luật ảnh nhóm: gia đình bé đã nghỉ (còn hạn 12
// tháng, tầng route đã gác) mở album năm cũ mà tập "con mình" không chứa con,
// thì ảnh gắn thẻ CHỈ CÓ CON HỌ cũng bị ẩn với chính họ — đúng trong khoảng
// thời gian sinh ra để họ tải kỷ niệm của con về. Quan hệ cha mẹ – con không
// mất khi bé rời trường (xem `laPhuHuynhCuaBe`); hàm này hỏi đúng quan hệ đó.
//
// KHÔNG dùng hàm này để cấp quyền mở đường đọc — hạn 12 tháng và mọi chốt
// khác vẫn nằm ở tầng route và `canAccessStudent`.
function studentIdsCuaPhuHuynh(parentId) {
  if (!parentId) return [];
  return prepare('SELECT studentId FROM student_parents WHERE parentId = ?')
    .all(parentId).map(r => r.studentId);
}

function conHanXemHoSo(leftAt) {
  if (!leftAt) return true;
  const d = new Date(`${leftAt}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return true;
  d.setUTCMonth(d.getUTCMonth() + SO_THANG_GIU_HO_SO);
  return new Date() <= d;
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
    // QUAN HỆ CHA MẸ – CON KHÔNG MẤT, NHƯNG QUYỀN ĐỌC HỒ SƠ THÌ CÓ HẠN.
    //
    // Nhà trường chốt: bé rời trường thì gia đình còn xem hồ sơ 12 tháng, sau
    // đó đóng đường xem (docs/KE-HOACH.md mục 6). Trước đợt Đ44 mốc đó chỉ
    // được cài ở MỘT chỗ — `routes/hocsinh-cu.js` — trong khi chỗ này chỉ hỏi
    // bảng `student_parents`, tức trả `true` mãi mãi.
    //
    // Hậu quả không nhìn thấy được từ giao diện: màn "Hồ sơ con đã ra trường"
    // đóng đúng hạn, nhưng MỌI đường khác gác bằng hàm này thì không —
    // /api/nhatky, /api/hanhtrinh, /api/dontra, /api/health, /api/medicine,
    // /api/hocphi, /api/students/:id. Gia đình gõ thẳng địa chỉ là đọc được
    // nhật ký ăn ngủ và hồ sơ sức khoẻ của một đứa trẻ đã rời trường nhiều năm.
    // Đó là dữ liệu nhạy cảm theo Nghị định 13/2023, và là đúng thứ mốc 12
    // tháng sinh ra để đóng lại.
    //
    // Đóng đường xem KHÔNG phải là xoá: nhà trường vẫn giữ hồ sơ theo quy định
    // lưu trữ, và quản trị vẫn tra được.
    if (!laPhuHuynhCuaBe(user.id, studentId)) return false;
    const be = first('students', 'SELECT active, leftAt FROM students WHERE id = ?', [studentId]);
    if (!be) return false;
    if (be.active) return true;
    return conHanXemHoSo(be.leftAt);
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
// NHẬT KÝ THAO TÁC — hỏng thì kêu lên, đừng câm.
//
// Bản đầu nuốt mọi lỗi để nhật ký hỏng không làm gián đoạn nghiệp vụ chính. Ý
// đó vẫn đúng và giữ nguyên. Nhưng NUỐT KHÔNG NÓI GÌ thì có chuyện thật:
//
// Bốn chỗ trong routes/admin.js (mọi thao tác về CƠ SỞ) gọi nhầm thành
// `audit(req.user, 'campus-create', {...})` — truyền cả đối tượng người dùng
// vào chỗ của userId, và truyền detail vào chỗ của target. better-sqlite3 từ
// chối buộc một đối tượng vào tham số, ném lỗi, và khối catch này nuốt gọn.
// Kết quả: mọi thay đổi về cơ sở KHÔNG ĐƯỢC GHI LẠI MỘT DÒNG NÀO, suốt từ khi
// viết N4, mà không ai thấy gì bất thường. Hỏi "ai chuyển nhóm này sang cơ sở
// khác" là không có câu trả lời.
//
// Hai lớp vá, cùng chiều "chỉ thêm, không đổi":
//   1. Nhận cả đối tượng người dùng lẫn id — gọi kiểu nào cũng ghi đúng người.
//   2. Nuốt lỗi thì vẫn nuốt, NHƯNG in ra log. Một dòng đỏ lúc phát triển rẻ
//      hơn nhiều so với phát hiện sau một năm rằng nhật ký trống rỗng.
function audit(userId, action, target, detail) {
  // Gọi nhầm `audit(req.user, ...)` thay vì `audit(req.user.id, ...)` là lỗi dễ
  // mắc nhất ở đây, vì cả hai đọc lên đều xuôi tai. Nhận luôn cả hai cách.
  const uid = (userId && typeof userId === 'object') ? userId.id : userId;
  try {
    run('INSERT INTO audit_log (at, userId, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString(), uid || null, action,
        target == null ? null : (typeof target === 'string' ? target : JSON.stringify(target)),
        detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail))]);
  } catch (err) {
    // Vẫn KHÔNG ném ra: nhật ký hỏng không được làm gián đoạn nghiệp vụ chính.
    // Nhưng phải kêu lên, nếu không thì im lặng bị đọc thành "vẫn ổn".
    console.error(`[db] KHÔNG ghi được nhật ký thao tác "${action}":`, err.message);
  }
}

function isEmpty() {
  return count('SELECT COUNT(*) FROM users') === 0;
}

// ---------------------------------------------------------------------------
// CHỨC VỤ — tầng HẸP THÊM đặt bên cạnh vai, chỉ áp cho tài khoản quản trị
// ---------------------------------------------------------------------------
//
// App có bốn vai (parent · teacher · admin · chưa đăng nhập) và bốn vai đó là
// xương sống, không đổi. Nhà trường cần thêm hai thứ mà vai không diễn tả được:
//
//   • CẤP 2 — nhân viên chéo cơ sở (Nhân sự, Marketing, Kế toán). Họ là người
//     của trường nhưng KHÔNG có việc gì với hồ sơ sức khoẻ hay ảnh khuôn mặt
//     của trẻ.
//   • CẤP 3 tách đôi — "Quản lý cơ sở" và "Văn phòng cơ sở", hai người cùng
//     đứng một cơ sở nhưng không cùng thẩm quyền.
//
// BA ĐIỀU LÀM TẦNG NÀY AN TOÀN
//
//   1. KHÔNG KHAI CHỨC VỤ = Y NHƯ HÔM NAY. Bảng `user_chucvu` rỗng thì mọi
//      hàm dưới đây trả về `null`, và toàn bộ tầng nằm im. Trường đang chạy
//      không rung một chút nào khi mã này được đưa lên.
//
//   2. CHỨC VỤ CHỈ BỚT, KHÔNG BAO GIỜ THÊM. `apiChoPhep` trả về `null` nghĩa
//      là "không hạn chế gì thêm" — mọi giới hạn khác (tầng cơ sở, requireRole)
//      vẫn nguyên. Không có đường nào để một chức vụ mở ra quyền mà vai không
//      có sẵn.
//
//   3. DANH SÁCH CHO PHÉP, KHÔNG PHẢI DANH SÁCH CẤM. Đường dẫn mới thêm sau
//      này mặc định BỊ TỪ CHỐI với Cấp 2, chứ không mặc định mở. Một danh sách
//      cấm thì lần thêm tính năng sau là quên, và quên theo hướng mở ra.
const CHUC_VU = [
  {
    ma: 'hieu-truong', ten: 'Ban giám hiệu', cap: 1,
    moTa: 'Thấy mọi cơ sở, làm được mọi việc quản trị.',
    api: null,
  },
  {
    ma: 'quanly-coso', ten: 'Quản lý cơ sở', cap: 3,
    moTa: 'Phụ trách trọn một cơ sở. Giới hạn đến từ tầng cơ sở, không từ chức vụ.',
    api: null,
  },
  {
    ma: 'vanphong-coso', ten: 'Văn phòng cơ sở', cap: 3,
    moTa: 'Việc hằng ngày của một cơ sở: hồ sơ bé, điểm danh, báo ăn, đón trả, '
      + 'thuốc men, thông báo. KHÔNG đụng tài khoản và KHÔNG phân công cô.',
    api: [
      '/api/auth', '/api/dashboard',
      '/api/students', '/api/attendance', '/api/leave', '/api/menu',
      // '/api/plans' ĐỨNG CẠNH '/api/timetable' VÌ HAI ĐƯỜNG NÀY NAY LÀ MỘT MÀN.
      //
      // Đ148 gộp Kế hoạch giáo dục và Lịch sinh hoạt thành một tab duy nhất, và
      // nhà trường chốt 10/09/2026 (A24): "Cái này do VĂN PHÒNG làm, cho bớt
      // việc của cô". Nhưng '/api/plans' không xuất hiện một lần nào trong cả
      // tệp này, nên chính văn phòng — người được giao việc — mở màn Lịch sinh
      // hoạt ra KHÔNG THẤY chỗ nào để soạn, và màn hình không báo lỗi gì cả:
      // phân hệ `kehoach` bị lọc khỏi danh sách của họ nên dải tab không được vẽ.
      //
      // Đây là quên theo hướng ĐÓNG LẠI, cùng loại với hai đường '/api/dong-y'
      // và lịch sử nhóm đã ghi ở dưới. Thêm MỘT phần tử, không đổi, không bỏ.
      '/api/timetable', '/api/plans', '/api/health', '/api/medicine', '/api/albums',
      '/api/notifications', '/api/messages', '/api/surveys',
      '/api/admin',
      '/api/nhatky', '/api/tienan', '/api/dontra', '/api/cambridge',
      '/api/hocphi',
      // GHI ĐƯỢC THÌ PHẢI ĐỌC ĐƯỢC.
      //
      // Văn phòng GHI giấy đồng ý qua `PUT /api/admin/students/:id/dong-y` —
      // đi lọt nhờ tiền tố '/api/admin' ở trên — và GHI lịch sử nhóm mỗi lần
      // chuyển nhóm cho bé. Nhưng hai đường ĐỌC lại nằm ngoài mọi danh sách,
      // nên chính người vừa ghi thì không mở lại xem được. Đó là "quên theo
      // hướng đóng lại" đúng như thiết kế, nhưng đóng nhầm chỗ.
      '/api/dong-y',
      // ĐƯỜNG ĐẦY ĐỦ, KHÔNG PHẢI TIỀN TỐ. `chanApiNgoaiChucVu` khớp theo tiền
      // tố, nên viết '/api/schoolyear' là mở luôn `POST /api/schoolyear/promote`
      // — chuyển năm học cho TOÀN TRƯỜNG — cho một tài khoản văn phòng.
      '/api/schoolyear/lich-su-lop',
      // HỒ SƠ CỦA CHÍNH MÌNH (Đ152) — hai đường "/toi", và chỉ hai đường đó.
      //
      // Phân hệ Nhân sự chặn theo chức vụ, nên nếu không khai ở đây thì chính
      // người mang chức vụ này KHÔNG xem được hồ sơ nhà trường đang giữ về
      // mình — một lời hứa rỗng, đúng thứ test:khong-hua-suong sinh ra để chặn.
      // `chanApiNgoaiChucVu` khớp theo TIỀN TỐ, nên hai dòng này mở đúng hai
      // đường ấy chứ không mở `/api/nhansu/ho-so/<người khác>`.
      '/api/nhansu/ho-so/toi', '/api/nhansu/cham-cong/toi',
      // XUẤT BÁO CÁO (Đ239c) — chỉ là CỬA VÀO màn. Mỗi phần bên trong tự hỏi
      // lại đúng API gốc của dữ liệu ấy (`modules/xuatbaocao/routes.js`), nên
      // dòng này không mở thêm dữ liệu nào ngoài phần việc đã liệt kê ở đây.
      '/api/xuatbaocao',
      // HỎI ĐƯỢC VỀ THÔNG BÁO ĐẨY, NHƯNG KHÔNG ĐĂNG KÝ ĐƯỢC (Đ157).
      //
      // Chỉ MỘT đường `/api/push/trang-thai`, cố ý KHÔNG phải cả tiền tố
      // `/api/push`. Đường này trả lời đúng một câu: "tài khoản này có loại
      // tin đẩy nào không". Chức vụ nào không có loại tin nào thì nhận
      // `batDuoc: false` và màn Cài đặt tự giấu thẻ đi.
      //
      // Mở cả tiền tố thì họ đăng ký máy được và bấm "Gửi thử" được — nhận
      // đúng một tiếng chuông thử rồi thôi, vì không đường nào trong app gửi
      // tin thật cho chức vụ này. Đó đúng là lời hứa suông mà Đ145 vừa gỡ đi.
      //
      // Trước Đ157 họ KHÔNG với tới được đường này, nên màn Cài đặt phải tự
      // kể tên chức vụ ra ở phía trình duyệt để quyết ẩn hay hiện — hai chỗ
      // nói cùng một chuyện, và chúng sẽ trôi khỏi nhau ở lần sửa thứ hai.
      '/api/push/trang-thai',
      // KẾ HOẠCH CHUNG TUẦN CỦA NHÓM (L39, chủ dự án chốt 27/10: mở cho văn
      // phòng cơ sở). Chủ đề tuần, bài hát, Casa talkshow, lời nhắc gia đình và
      // tệp kế hoạch tuần — chữ về CẢ NHÓM, đọc ở Lịch sinh hoạt, không phải
      // ghi chép về một bé nào.
      //
      // ĐƯỜNG CON, KHÔNG PHẢI CẢ `/api/hanhtrinh`. Phần còn lại của Hành trình
      // (quan sát ba lớp, ảnh, câu chuyện từng bé) vẫn đóng với văn phòng như
      // trước. Khớp theo tiền tố nên dòng này mở `/api/hanhtrinh/chu-de` và các
      // đường con của nó (chép tuần trước, tệp của tuần), không mở gì khác.
      // Phạm vi cơ sở vẫn do `db.canAccessClass` trong từng đường giữ.
      '/api/hanhtrinh/chu-de',
    ],
  },
  {
    ma: 'nhansu', ten: 'Nhân sự', cap: 2,
    moTa: 'Tài khoản và danh sách cô của cả trường. KHÔNG mở được hồ sơ bé, '
      + 'sức khoẻ, hay ảnh của trẻ.',
    api: [
      '/api/auth', '/api/dashboard',
      '/api/accounts',
      '/api/admin/teachers', '/api/admin/overview',
      // HỒ SƠ NHÂN SỰ & CHẤM CÔNG (Đ152) — đúng phần việc của chức vụ này.
      //
      // Đường dẫn CỐ Ý không nằm dưới `/api/admin`: tiền tố đó đã nằm trong
      // danh sách của Văn phòng cơ sở ngay bên trên, và chú thích ở đó nói
      // thẳng rằng mọi đường `/api/admin/...` thêm sau này TỰ ĐỘNG lọt qua.
      // Một hồ sơ có số định danh, số bảo hiểm và số tài khoản ngân hàng thì
      // không được đi qua một cánh cửa đã mở sẵn cho người khác.
      '/api/nhansu',
      // Cửa vào màn Xuất báo cáo (Đ239c): bên trong chỉ mở phần chấm công.
      '/api/xuatbaocao',
      // Cùng lý do như Văn phòng cơ sở bên trên: hỏi được, không đăng ký được.
      '/api/push/trang-thai',
    ],
  },
  {
    ma: 'marketing', ten: 'Marketing', cap: 2,
    moTa: 'Ảnh dùng cho truyền thông và tuyển sinh. Chỉ thấy ảnh mà MỌI bé '
      + 'trong ảnh đều có đồng ý truyền thông.',
    api: [
      '/api/auth', '/api/dashboard',
      '/api/albums', '/api/cambridge',
      // HỒ SƠ CỦA CHÍNH MÌNH (Đ152) — hai đường "/toi", và chỉ hai đường đó.
      //
      // Phân hệ Nhân sự chặn theo chức vụ, nên nếu không khai ở đây thì chính
      // người mang chức vụ này KHÔNG xem được hồ sơ nhà trường đang giữ về
      // mình — một lời hứa rỗng, đúng thứ test:khong-hua-suong sinh ra để chặn.
      // `chanApiNgoaiChucVu` khớp theo TIỀN TỐ, nên hai dòng này mở đúng hai
      // đường ấy chứ không mở `/api/nhansu/ho-so/<người khác>`.
      '/api/nhansu/ho-so/toi', '/api/nhansu/cham-cong/toi',
      '/api/push/trang-thai',
    ],
  },
  {
    ma: 'ketoan', ten: 'Kế toán', cap: 2,
    moTa: 'Học phí và tiền ăn. Nhận được tên bé và nhóm qua chính hai phần đó, '
      + 'nên KHÔNG cần và KHÔNG mở được hồ sơ bé.',
    api: [
      '/api/auth', '/api/dashboard',
      '/api/hocphi', '/api/tienan',
      // Cửa vào màn Xuất báo cáo (Đ239c): bên trong chỉ mở phần tiền ăn.
      '/api/xuatbaocao',
      // HỒ SƠ CỦA CHÍNH MÌNH (Đ152) — hai đường "/toi", và chỉ hai đường đó.
      //
      // Phân hệ Nhân sự chặn theo chức vụ, nên nếu không khai ở đây thì chính
      // người mang chức vụ này KHÔNG xem được hồ sơ nhà trường đang giữ về
      // mình — một lời hứa rỗng, đúng thứ test:khong-hua-suong sinh ra để chặn.
      // `chanApiNgoaiChucVu` khớp theo TIỀN TỐ, nên hai dòng này mở đúng hai
      // đường ấy chứ không mở `/api/nhansu/ho-so/<người khác>`.
      '/api/nhansu/ho-so/toi', '/api/nhansu/cham-cong/toi',
      '/api/push/trang-thai',
    ],
  },
  {
    // BẢO VỆ Ở CỔNG (Đ156, DD-12) — chức vụ HẸP NHẤT trong bảng này.
    //
    // Nhà trường: điểm danh buổi sáng do bảo vệ chụp ảnh ở cổng. Trước đợt
    // này không có chức vụ nào cho việc ấy, nên chiếc máy dùng chung đặt ở
    // cổng phải MƯỢN TÀI KHOẢN VĂN PHÒNG — mà văn phòng mở được hồ sơ bé, sổ
    // sức khoẻ, đơn thuốc, album ảnh, tin nhắn của mọi gia đình trong cơ sở.
    // Một chiếc máy để ngoài cổng, không ai trông, đăng nhập sẵn cả ngày.
    //
    // Danh sách này chỉ có BA dòng, và không dòng nào là tình cờ:
    //
    //   /api/auth       — đăng nhập, đổi mật khẩu, biết mình là ai
    //   /api/dashboard  — khung của app; chặn là trắng màn ngay sau đăng nhập
    //   /api/attendance — đúng phần việc: chụp ảnh con tới lớp và chấm sổ
    //
    // Không có hồ sơ bé, không sức khoẻ, không thuốc, không album, không tin
    // nhắn, không tài khoản, không tiền. Tên và ảnh đại diện của bé thì có —
    // đó là thứ chính việc đứng cổng cần, và không có cách nào chấm sổ mà
    // không thấy tên bé.
    //
    // CÒN PHẢI KHOÁ VÀO MỘT CƠ SỞ. Chức vụ mở đúng vùng việc; phạm vi bé nào
    // thì do tầng cơ sở quyết (`user_campus`). Bảo vệ cổng cơ sở 1 mà không
    // khoá cơ sở thì thấy bé của cả ba cơ sở — Quản trị → Chức vụ nhắc điều
    // này ngay tại chỗ gán.
    //
    // HAI VIỆC TRONG VÙNG `/api/attendance` VẪN KHÔNG PHẢI CỦA HỌ, và chặn ở
    // chính đường dẫn ấy chứ không cắt nhỏ danh sách trên: "Chốt sổ vắng" là
    // một quyết định của sổ (nó ghi vắng cho mọi bé chưa có dòng), và mốc giờ
    // rà soát là nếp làm việc của cả trường. Cắt nhỏ danh sách theo từng
    // đường con thì mỗi đường `/api/attendance/...` thêm sau này lại lọt ra
    // ngoài mà không ai nhận ra.
    ma: 'baove', ten: 'Bảo vệ cổng', cap: 3,
    moTa: 'Chỉ điểm danh và chụp ảnh con tới lớp ở cổng. KHÔNG mở được hồ sơ bé, '
      + 'sức khoẻ, thuốc, album hay tin nhắn. Nhớ khoá vào đúng cơ sở.',
    api: [
      '/api/auth', '/api/dashboard',
      '/api/attendance',
      '/api/push/trang-thai',
    ],
  },
];

const MA_CHUC_VU = CHUC_VU.map(c => c.ma);

// Chức vụ này có được quyết định NẾP LÀM VIỆC của cả trường không (Đ156).
//
// Dùng cho những đường nằm trong vùng việc của một chức vụ nhưng lại đổi cách
// cả trường làm — mốc giờ rà soát là cái đầu tiên. Trả về `true` cho người
// chưa khai chức vụ, để trường đang chạy không đổi một chút nào.
const CHUC_VU_DAT_NEP = ['hieu-truong', 'quanly-coso', 'vanphong-coso'];
function datNepDuoc(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = chucVu(user);
  return cv === null || CHUC_VU_DAT_NEP.includes(cv);
}

// Chức vụ này có được ĐẶT RA một khoản tiền phải nộp không (Đ163).
//
// Nhà trường 07/09: *"chỉ kế toán hoặc Cấp 1 được tạo khoản thu"*. Đây là một
// câu về TRÁCH NHIỆM chứ không phải về tiện lợi: người đặt ra số tiền một nhà
// phải nộp là người phải giải trình được con số ấy.
//
// Đường `/api/hocphi` nằm trong phần việc của Văn phòng cơ sở, và tầng chức vụ
// khớp theo TIỀN TỐ nên nó mở cả bốn đường ghi cùng lúc. Cắt dòng ấy đi thì văn
// phòng mất luôn cả đường ĐỌC sổ tiền và đường xác nhận đã nhận tiền ở bàn tiếp
// đón — hỏng đúng việc họ làm hằng ngày. Nên chốt chặn nằm ở ĐÂY, tại đúng hai
// đường đặt ra khoản thu, chứ không ở danh sách tiền tố.
//
// GIỮ NGUYÊN cho người CHƯA KHAI CHỨC VỤ (`cv === null`), y như `datNepDuoc`:
// một trường vừa cài xong chỉ có một tài khoản quản trị và chưa phân vai ai cả;
// siết ngay lúc đó là không ai ghi được khoản thu đầu tiên. Chốt chặn này chỉ
// bắt đầu có hiệu lực từ ngày nhà trường thật sự khai chức vụ cho từng người —
// mà đó cũng là ngày câu hỏi "ai chịu trách nhiệm về tiền" mới có câu trả lời.
const CHUC_VU_TAO_KHOAN_THU = ['hieu-truong', 'ketoan'];
function taoKhoanThuDuoc(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = chucVu(user);
  return cv === null || CHUC_VU_TAO_KHOAN_THU.includes(cv);
}

// Chức vụ này có được SỬA PHẦN NHÂN THÂN trong hồ sơ của bé không (Đ168).
//
// Bảng phân quyền 07/09 của nhà trường, dòng Hồ sơ bé: *"Admin cơ sở NHẬP,
// Quản lý cơ sở và Hiệu trưởng CHỈNH SỬA"*. Hôm nay mọi tài khoản quản trị
// trong phạm vi cơ sở mình đều sửa được, kể cả Văn phòng cơ sở.
//
// SIẾT THEO TRƯỜNG DỮ LIỆU, KHÔNG SIẾT CẢ ĐƯỜNG — đây là chỗ quan trọng nhất
// của quyết định này. Cùng một đường `PUT /api/admin/students/:id` mang cả hai
// loại việc: phần NHÂN THÂN (họ tên, ngày sinh, giới tính, địa chỉ, dân tộc,
// nhóm máu, mã bé, số định danh, tiền sử bệnh, người liên hệ khẩn cấp) và phần
// VẬN HÀNH HẰNG NGÀY (chuyển bé sang nhóm khác, đánh dấu bé đã nghỉ học).
//
// Chặn cả đường là văn phòng thôi chuyển nhóm được cho bé — mà chuyển nhóm là
// việc của họ, xảy ra giữa năm, và chờ quản lý cơ sở duyệt từng lượt thì sổ
// điểm danh hôm ấy sai. Nguyên tắc số 1 cấm lấy đi một thứ đang chạy như vậy.
//
// Giữ nguyên cho người CHƯA KHAI CHỨC VỤ, y nếp `datNepDuoc` (Đ156) và
// `taoKhoanThuDuoc` (Đ163a).
const CHUC_VU_SUA_HO_SO_BE = ['hieu-truong', 'quanly-coso'];
function suaHoSoBeDuoc(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = chucVu(user);
  return cv === null || CHUC_VU_SUA_HO_SO_BE.includes(cv);
}

// Chức vụ này có được DUYỆT BÁO CÁO HỌC TẬP của bé không (Đ198, việc 40).
//
// Nhà trường (Câu 3) xác nhận Quản lý cơ sở và Văn phòng cơ sở CÙNG Cấp 3 mà
// KHÁC nhau ở quyền. Đ192 đã tách một quyền theo đúng chữ ấy (xem lại hội
// thoại đã đóng); đây là quyền thứ hai, và nó là quyền nặng nhất trong hai.
//
// VÌ SAO DUYỆT BÁO CÁO KHÔNG PHẢI VIỆC CỦA VĂN PHÒNG. Duyệt một bản báo cáo
// học tập là nói *"những gì cô viết về đứa trẻ này đã đúng và gửi được cho gia
// đình"*. Đó là một phán xét CHUYÊN MÔN về nội dung sư phạm, không phải một
// bước hành chính: người duyệt phải đọc được nhận định của cô và biết nó có
// đúng với bé ấy không. Văn phòng cơ sở làm hồ sơ, thu tiền, tiếp đón — họ
// không đứng lớp và không có căn cứ nào để nói câu ấy.
//
// Bấm duyệt một bản mình không đọc nổi thì bước duyệt thành một cái nút vô
// nghĩa, và cả cơ chế chờ duyệt — thứ đang giữ cho không nhận định nào tới
// gia đình mà chưa ai soát — mất hết tác dụng.
//
// GIỮ NGUYÊN cho người CHƯA KHAI CHỨC VỤ, y nếp `datNepDuoc` (Đ156),
// `taoKhoanThuDuoc` (Đ163a) và `suaHoSoBeDuoc` (Đ168): trường vừa cài xong chỉ
// có một tài khoản quản trị và chưa phân vai ai cả; siết ngay lúc đó là không
// ai duyệt được bản báo cáo đầu tiên.
const CHUC_VU_DUYET_BAO_CAO = ['hieu-truong', 'quanly-coso'];
function duyetBaoCaoDuoc(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = chucVu(user);
  return cv === null || CHUC_VU_DUYET_BAO_CAO.includes(cv);
}

// Chức vụ này có được DUYỆT BIỂU PHÍ của trường không (Đ200, việc 33).
//
// Nhà trường: *"kế toán soạn, cấp 1 duyệt rồi khoá, muốn sửa phải xin mở"*.
//
// HẸP HƠN CẢ BA CHỐT KIA, VÀ ĐÓ LÀ CHỦ Ý. `taoKhoanThuDuoc` mở cho kế toán vì
// ghi sổ là việc hằng ngày của họ. Duyệt biểu phí thì không: biểu phí là bảng
// giá của cả trường cho cả năm học, và người soạn nó không được tự duyệt lấy
// — nếu không thì bước duyệt chỉ là một cái nút kế toán tự bấm cho mình, và cả
// tầng biểu phí thành ra vô nghĩa.
//
// Nên đây là chốt duy nhất trong năm chốt chỉ mở cho ĐÚNG MỘT chức vụ.
//
// GIỮ NGUYÊN cho người CHƯA KHAI CHỨC VỤ, y nếp bốn hàm kia: trường vừa cài
// xong chỉ có một tài khoản quản trị: siết ngay lúc đó là không ai duyệt được
// biểu phí đầu tiên và trường không thu được đồng nào.
const CHUC_VU_DUYET_BIEU_PHI = ['hieu-truong'];
function duyetBieuPhiDuoc(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = chucVu(user);
  return cv === null || CHUC_VU_DUYET_BIEU_PHI.includes(cv);
}

// Mã chức vụ của một người, hoặc null nếu chưa khai.
function chucVu(user) {
  const id = (user && typeof user === 'object') ? user.id : user;
  if (!id) return null;
  const r = first('user_chucvu', 'SELECT chucVu FROM user_chucvu WHERE userId = ?', [id]);
  return r && MA_CHUC_VU.includes(r.chucVu) ? r.chucVu : null;
}

function moTaChucVu(ma) {
  return CHUC_VU.find(c => c.ma === ma) || null;
}

// Gán hoặc gỡ chức vụ. Truyền chuỗi rỗng để gỡ (tức là quay về "như hôm nay").
function datChucVu(userId, ma) {
  if (!userId) return;
  if (!ma) { run('DELETE FROM user_chucvu WHERE userId = ?', [userId]); return; }
  if (!MA_CHUC_VU.includes(ma)) throw new Error('Chức vụ không hợp lệ');
  run(`INSERT INTO user_chucvu (userId, chucVu, ganLuc) VALUES (?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET chucVu = excluded.chucVu, ganLuc = excluded.ganLuc`,
  [userId, ma, new Date().toISOString()]);
}

// Danh sách đường dẫn API mà người này được phép gọi.
//
// `null` = KHÔNG HẠN CHẾ GÌ THÊM. Trả null cho mọi người chưa khai chức vụ,
// cho cô, cho phụ huynh, và cho những chức vụ mà giới hạn đến từ chỗ khác
// (ban giám hiệu, quản lý cơ sở).
function apiChoPhep(user) {
  if (!user || user.role !== 'admin') return null;
  const mo = moTaChucVu(chucVu(user));
  return mo && Array.isArray(mo.api) ? mo.api : null;
}

// Cấp của một người: 1, 2, 3, hoặc null khi chưa khai chức vụ.
function capChucVu(user) {
  const mo = moTaChucVu(chucVu(user));
  return mo ? mo.cap : null;
}

// ẢNH CHO TRUYỀN THÔNG — CHẶT HƠN ẢNH CHO GIA ĐÌNH.
//
// `locAnhChoNguoiXem` (luật ảnh nhóm) cho phép một ảnh CHƯA GẮN BÉ đi qua khi
// nhóm không có ai từ chối. Ở đây thì không: dùng ảnh cho tuyển sinh là mục
// đích tách riêng trong giấy đồng ý, ô ③, và ô đó MẶC ĐỊNH KHÔNG TÍCH. Ảnh
// chưa biết trong đó có ai thì không thể biết cả ba ô đã tích hay chưa.
//
// Nên luật ở đây là: ảnh phải ĐÃ GẮN BÉ, và MỌI bé trong ảnh đều có
// `truyenThong === true`. Không gắn ai thì không dùng được.
function locAnhChoTruyenThong(photos) {
  return (photos || []).filter(anh => {
    const be = beTrongAnh(anh.id);
    if (!be.length) return false;
    return be.every(id => dongYCuaBe(id).truyenThong === true);
  });
}

// BẢN LÔ CỦA HÀM TRÊN — thêm bên cạnh, không sửa hàm cũ, cùng lý do và cùng
// khuôn với bộ ba bản lô của luật ảnh nhóm (xem chú thích dài phía trên).
//
// Hàm từng dòng hỏi hai câu cho MỖI ảnh rồi một câu cho MỖI bé — đường liệt kê
// album của tài khoản Marketing (thấy album TOÀN TRƯỜNG) vì thế tốn hàng nghìn
// truy vấn đồng bộ cho một lượt bấm. Bản lô dùng lại `beTrongCacAnh` +
// `dongYCuaCacBe`: hai câu cho cả danh sách.
//
// Luật phải GIỐNG HỆT bản từng dòng: ảnh chưa gắn bé nào → loại; mọi bé trong
// ảnh phải `truyenThong === true` — so `=== true`, không `!== false`, vì bé
// chưa ký là CHƯA TRẢ LỜI chứ không phải đồng ý.
function locAnhChoTruyenThongNhieuAnh(photos) {
  const ds = photos || [];
  const the = beTrongCacAnh(ds.map(a => a.id));
  const dongY = dongYCuaCacBe([...the.values()].flat());
  return ds.filter(anh => {
    const be = the.get(anh.id) || [];
    if (!be.length) return false;
    return be.every(id => (dongY.get(id) || {}).truyenThong === true);
  });
}

// Đóng kết nối gọn gàng khi máy chủ tắt.
function close() {
  try { sqlite.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
  try { sqlite.close(); } catch (_) {}
}

module.exports = {
  beNgungHoSoHocTap, dsBeNgungHoSoHocTap,
  beTrongCacAnh, dongYCuaCacBe, locAnhChoNguoiXemNhieuNhom,
  sqlite, DB_FILE, DATA_DIR,
  all, first, run, count, insert, upsert, update, remove, tx, prepare, nextId,
  school, setSchool, classes, findClass,
  findUser, findUserByUsername, findStudent, withParents,
  studentsOf, studentIdsOf, canAccessStudent, classIdsOf, canAccessClass,
  SO_THANG_GIU_HO_SO, conHanXemHoSo, laPhuHuynhCuaBe, studentIdsCuaPhuHuynh,
  teachersOfClass, teacherIdsOfClass, classIdsOfTeacher, classIdsEverOfTeacher,
  isTeacherOfClass, setClassTeachers, addClassTeacher, removeClassTeacher,
  setHomeroomTeacher, backfillClassTeachers,
  hoSoBe, luuHoSoBe, lienHeKhanCap, datLienHeKhanCap,
  hoSoNguoiDung, luuHoSoNguoiDung,
  dongYCuaBe, datDongY, beTrongAnh, datBeTrongAnh,
  coBeTuChoiChiaSe, coBeTuChoiChiaSeTungHoc, locAnhChoNguoiXem,
  coTangCoSo, campuses, findCampus, campusOfClass, campusOfUser, classIdsOfCampus,
  setClassCampus, setUserCampus, phamViCoSo, canAccessCampus, backfillClassCampus,
  classIdsEverOfCampus,
  CHUC_VU, chucVu, moTaChucVu, datChucVu, apiChoPhep, capChucVu,
  CHUC_VU_DAT_NEP, datNepDuoc,
  CHUC_VU_TAO_KHOAN_THU, taoKhoanThuDuoc,
  CHUC_VU_DUYET_BAO_CAO, duyetBaoCaoDuoc,
  CHUC_VU_DUYET_BIEU_PHI, duyetBieuPhiDuoc,
  CHUC_VU_SUA_HO_SO_BE, suaHoSoBeDuoc,
  locAnhChoTruyenThong, locAnhChoTruyenThongNhieuAnh,
  audit, isEmpty, close,
};
