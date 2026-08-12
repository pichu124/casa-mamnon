// Kho dữ liệu JSON.
//
// Quy mô một trường (vài nghìn bản ghi) thì một file JSON là đủ và không cần
// cài đặt gì thêm. Khi triển khai lên máy chủ, đặt biến môi trường DATA_DIR trỏ
// tới ổ đĩa gắn ngoài để dữ liệu không mất mỗi lần khởi động lại.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let data = null;
let saveTimer = null;
let dirty = false;

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    require('../data/seed').generate();
  }
  data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (migrate(data)) writeNow();
  return data;
}

// Nâng cấp dữ liệu cũ sang định dạng hiện tại. Trả về true nếu có thay đổi.
function migrate(db) {
  let changed = false;
  const password = require('./password');
  for (const u of db.users || []) {
    // Trước đây mật khẩu lưu ở dạng đọc được — băm lại và xóa bản gốc.
    if (u.password) {
      if (!u.passwordHash) u.passwordHash = password.hash(u.password);
      delete u.password;
      changed = true;
    }
  }
  return changed;
}

function get() {
  if (!data) load();
  return data;
}

// Ghi nguyên tử: ghi ra file tạm rồi đổi tên, để mất điện giữa chừng cũng
// không làm hỏng db.json đang có.
function writeNow() {
  if (!data) return;
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, DB_PATH);
  dirty = false;
}

// Gom nhiều thay đổi liên tiếp thành một lần ghi đĩa.
function save() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { writeNow(); } catch (err) { console.error('Không ghi được dữ liệu:', err.message); }
  }, 150);
}

// Máy chủ bị tắt (deploy lại, khởi động lại) — ghi nốt thay đổi đang chờ.
function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (dirty) {
    try { writeNow(); } catch (err) { console.error('Không ghi được dữ liệu khi tắt:', err.message); }
  }
}

let idCounter = Date.now() % 1000000;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

// ---- Tiện ích truy vấn dùng chung cho các route ----

function findUser(id) { return get().users.find(u => u.id === id); }
function findStudent(id) { return get().students.find(s => s.id === id); }
function findClass(id) { return get().classes.find(c => c.id === id); }

// Danh sách học sinh mà một người dùng được phép xem.
// Phụ huynh: các con của mình. Giáo viên: học sinh lớp chủ nhiệm.
function studentsOf(user) {
  const db = get();
  if (user.role === 'parent') return db.students.filter(s => s.parentIds.includes(user.id));
  if (user.role === 'teacher') return db.students.filter(s => s.classId === user.classId);
  return db.students;
}

// Kiểm tra user có quyền xem học sinh này không.
function canAccessStudent(user, studentId) {
  return studentsOf(user).some(s => s.id === studentId);
}

module.exports = {
  get, save, flush, nextId,
  findUser, findStudent, findClass, studentsOf, canAccessStudent,
  DB_PATH, DATA_DIR,
};
