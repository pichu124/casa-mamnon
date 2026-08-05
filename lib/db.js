// Kho dữ liệu JSON đơn giản: đọc/ghi data/db.json với ghi trì hoãn (debounce).
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

let data = null;
let saveTimer = null;

function load() {
  if (!fs.existsSync(DB_PATH)) {
    require('../data/seed').generate();
  }
  data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  return data;
}

function get() {
  if (!data) load();
  return data;
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 1));
  }, 150);
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

module.exports = { get, save, nextId, findUser, findStudent, findClass, studentsOf, canAccessStudent, DB_PATH };
