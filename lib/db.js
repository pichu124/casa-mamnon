// Tầng dữ liệu SchoolConnect trên nền SQLite.
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

// Học sinh mà một người dùng được phép xem.
// Phụ huynh: các con của mình. Giáo viên: học sinh lớp chủ nhiệm. Quản trị: tất cả.
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
    if (!user.classId) return [];
    return withParents(all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [user.classId]));
  }
  return withParents(all('students', 'SELECT * FROM students WHERE active = 1 ORDER BY name'));
}

// Chỉ trả về danh sách mã học sinh — nhẹ hơn khi chỉ cần lọc.
function studentIdsOf(user) {
  return studentsOf(user).map(s => s.id);
}

function canAccessStudent(user, studentId) {
  if (!user || !studentId) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'parent') {
    return count(
      'SELECT COUNT(*) FROM student_parents WHERE parentId = ? AND studentId = ?',
      [user.id, studentId]) > 0;
  }
  if (user.role === 'teacher') {
    if (!user.classId) return false;
    return count(
      'SELECT COUNT(*) FROM students WHERE id = ? AND classId = ?',
      [studentId, user.classId]) > 0;
  }
  return false;
}

// Các lớp mà người dùng được xem dữ liệu.
function classIdsOf(user) {
  if (!user) return [];
  if (user.role === 'admin') return classes().map(c => c.id);
  if (user.role === 'teacher') return user.classId ? [user.classId] : [];
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
  audit, isEmpty, close,
};
