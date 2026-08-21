-- Lược đồ cơ sở dữ liệu SchoolConnect.
--
-- Nguyên tắc thiết kế:
--   • Bảng lớn (điểm danh, nhận xét, tin nhắn) được tách riêng và đánh chỉ mục
--     theo đúng cách ứng dụng tra cứu, để mỗi thao tác chỉ đụng vài dòng.
--   • Dữ liệu nhỏ, luôn đọc trọn gói và không cần tìm kiếm bên trong (thực đơn
--     một ngày, các tiết trong thời khóa biểu) thì lưu thẳng dạng JSON cho gọn.
--   • Mọi khóa ngoại đều bật ON DELETE để xóa lớp hay học sinh không để lại rác.

PRAGMA foreign_keys = ON;

-- ===== Thông tin chung của trường (một dòng duy nhất, khóa = 'school') =====
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL             -- JSON
);

-- ===== Lớp học =====
CREATE TABLE IF NOT EXISTS classes (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  teacherId TEXT,
  room      TEXT DEFAULT '',
  year      TEXT NOT NULL,
  grade     INTEGER,              -- khối lớp, phục vụ lên lớp cuối năm (B5)
  active    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_classes_year ON classes(year, active);

-- ===== Người dùng =====
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  username           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  passwordHash       TEXT NOT NULL,
  role               TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent')),
  name               TEXT NOT NULL,
  title              TEXT DEFAULT '',
  phone              TEXT DEFAULT '',
  email              TEXT DEFAULT '',
  classId            TEXT REFERENCES classes(id) ON DELETE SET NULL,
  avatar             TEXT,        -- JSON {emoji, bg}
  mustChangePassword INTEGER NOT NULL DEFAULT 0,
  active             INTEGER NOT NULL DEFAULT 1,
  createdAt          TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, active);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(classId);

-- ===== Học sinh =====
CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  code       TEXT,
  name       TEXT NOT NULL,
  dob        TEXT,
  gender     TEXT,
  classId    TEXT REFERENCES classes(id) ON DELETE SET NULL,
  avatar     TEXT,                -- JSON
  address    TEXT DEFAULT '',
  ethnicity  TEXT DEFAULT '',
  bloodType  TEXT DEFAULT '',
  allergies  TEXT DEFAULT '',
  active     INTEGER NOT NULL DEFAULT 1,
  leftAt     TEXT,                -- ngày chuyển đi, nếu có
  createdAt  TEXT
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(classId, active);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);

-- Một học sinh có thể có nhiều phụ huynh, một phụ huynh có nhiều con.
CREATE TABLE IF NOT EXISTS student_parents (
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parentId  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (studentId, parentId)
);
CREATE INDEX IF NOT EXISTS idx_sp_parent ON student_parents(parentId);

-- ===== Điểm danh — bảng lớn nhất, khoảng 52.500 dòng mỗi năm =====
CREATE TABLE IF NOT EXISTS attendance (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,        -- YYYY-MM-DD
  status    TEXT NOT NULL,        -- present | late | absent_excused | absent_unexcused
  checkIn   TEXT,
  checkOut  TEXT,
  note      TEXT DEFAULT '',
  markedBy  TEXT,
  UNIQUE (studentId, date)        -- mỗi học sinh mỗi ngày chỉ một bản ghi
);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_att_student_date ON attendance(studentId, date DESC);

-- ===== Xin phép nghỉ học =====
CREATE TABLE IF NOT EXISTS leave_requests (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parentId   TEXT REFERENCES users(id) ON DELETE SET NULL,
  fromDate   TEXT NOT NULL,
  toDate     TEXT NOT NULL,
  reason     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  createdAt  TEXT NOT NULL,
  reviewedBy TEXT,
  reviewNote TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_leave_student ON leave_requests(studentId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- ===== Nhận xét hằng ngày — khoảng 34.800 dòng mỗi năm =====
CREATE TABLE IF NOT EXISTS remarks (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacherId  TEXT,
  date       TEXT NOT NULL,
  content    TEXT NOT NULL,
  rating     TEXT,
  skills     TEXT,               -- JSON mảng chuỗi
  parentSeen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_remarks_student ON remarks(studentId, date DESC);
CREATE INDEX IF NOT EXISTS idx_remarks_unseen ON remarks(studentId, parentSeen);

-- ===== Báo cáo học tập theo học kỳ =====
CREATE TABLE IF NOT EXISTS reports (
  id                TEXT PRIMARY KEY,
  studentId         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term              TEXT NOT NULL,
  year              TEXT NOT NULL,
  subjects          TEXT,        -- JSON
  conduct           TEXT,
  overall           TEXT,
  attendanceSummary TEXT,        -- JSON
  teacherComment    TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reports_student ON reports(studentId, year, term);

-- ===== Nề nếp =====
CREATE TABLE IF NOT EXISTS conduct (
  id          TEXT PRIMARY KEY,
  studentId   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  type        TEXT NOT NULL,     -- praise | reminder
  title       TEXT NOT NULL,
  content     TEXT DEFAULT '',
  points      INTEGER NOT NULL DEFAULT 0,
  byTeacherId TEXT
);
CREATE INDEX IF NOT EXISTS idx_conduct_student ON conduct(studentId, date DESC);

-- ===== Y tế học đường =====
CREATE TABLE IF NOT EXISTS health (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  type      TEXT NOT NULL,       -- checkup | vaccination | incident
  title     TEXT NOT NULL,
  detail    TEXT DEFAULT '',
  height    REAL,
  weight    REAL,
  vision    TEXT,
  bmiNote   TEXT
);
CREATE INDEX IF NOT EXISTS idx_health_student ON health(studentId, date DESC);

-- ===== Dặn thuốc =====
CREATE TABLE IF NOT EXISTS medicine_requests (
  id          TEXT PRIMARY KEY,
  studentId   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parentId    TEXT REFERENCES users(id) ON DELETE SET NULL,
  fromDate    TEXT NOT NULL,
  toDate      TEXT NOT NULL,
  medicines   TEXT NOT NULL,     -- JSON mảng {name, dose, timing}
  note        TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  createdAt   TEXT NOT NULL,
  confirmedBy TEXT,
  confirmedAt TEXT,
  log         TEXT               -- JSON mảng {time, text}
);
CREATE INDEX IF NOT EXISTS idx_med_student ON medicine_requests(studentId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_med_status ON medicine_requests(status);

-- ===== Thực đơn bán trú =====
CREATE TABLE IF NOT EXISTS menus (
  id    TEXT PRIMARY KEY,
  date  TEXT NOT NULL UNIQUE,
  meals TEXT NOT NULL            -- JSON
);
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(date);

-- ===== Thời khóa biểu (một dòng mỗi lớp) =====
CREATE TABLE IF NOT EXISTS timetable (
  classId     TEXT PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  periodTimes TEXT NOT NULL,     -- JSON
  days        TEXT NOT NULL      -- JSON { "1".."5": [môn theo tiết] }
);

-- ===== Kế hoạch giáo dục theo tháng =====
CREATE TABLE IF NOT EXISTS edu_plans (
  id        TEXT PRIMARY KEY,
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  month     INTEGER NOT NULL,
  year      INTEGER NOT NULL,
  theme     TEXT,
  goals     TEXT,                -- JSON
  weeks     TEXT,                -- JSON
  note      TEXT DEFAULT '',
  createdBy TEXT
);
CREATE INDEX IF NOT EXISTS idx_plans_class ON edu_plans(classId, year, month);

-- ===== Xe buýt đưa đón =====
CREATE TABLE IF NOT EXISTS bus_routes (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  plate   TEXT,
  driver  TEXT,                  -- JSON {name, phone}
  monitor TEXT,                  -- JSON {name, phone}
  stops   TEXT,                  -- JSON
  log     TEXT                   -- JSON
);
CREATE TABLE IF NOT EXISTS bus_students (
  routeId   TEXT NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (routeId, studentId)
);
CREATE INDEX IF NOT EXISTS idx_bus_student ON bus_students(studentId);

-- ===== Khảo sát =====
CREATE TABLE IF NOT EXISTS surveys (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  createdBy   TEXT,
  createdAt   TEXT NOT NULL,
  deadline    TEXT,
  audience    TEXT NOT NULL DEFAULT 'all',
  status      TEXT NOT NULL DEFAULT 'open',
  questions   TEXT NOT NULL      -- JSON
);
CREATE TABLE IF NOT EXISTS survey_responses (
  id          TEXT PRIMARY KEY,
  surveyId    TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  userId      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  studentId   TEXT,
  submittedAt TEXT NOT NULL,
  answers     TEXT NOT NULL,     -- JSON
  UNIQUE (surveyId, userId)      -- mỗi phụ huynh trả lời một lần
);
CREATE INDEX IF NOT EXISTS idx_sr_survey ON survey_responses(surveyId);

-- ===== Album ảnh =====
CREATE TABLE IF NOT EXISTS albums (
  id          TEXT PRIMARY KEY,
  classId     TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT DEFAULT '',
  createdBy   TEXT
);
CREATE INDEX IF NOT EXISTS idx_albums_class ON albums(classId, date DESC);

CREATE TABLE IF NOT EXISTS album_photos (
  id       TEXT PRIMARY KEY,
  albumId  TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  file     TEXT,                 -- tên tệp ảnh thật
  emoji    TEXT,                 -- ảnh minh họa của dữ liệu cũ
  g        TEXT,                 -- JSON cặp màu nền
  caption  TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_album ON album_photos(albumId, position);

-- ===== Thông báo =====
CREATE TABLE IF NOT EXISTS notifications (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  category  TEXT DEFAULT 'Khác',
  audience  TEXT NOT NULL DEFAULT 'all',   -- 'all' hoặc classId
  createdBy TEXT,
  createdAt TEXT NOT NULL,
  pinned    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notif_order ON notifications(pinned DESC, createdAt DESC);

CREATE TABLE IF NOT EXISTS notification_reads (
  notificationId TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  userId         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  readAt         TEXT,
  PRIMARY KEY (notificationId, userId)
);
CREATE INDEX IF NOT EXISTS idx_nreads_user ON notification_reads(userId);

-- ===== Nhắn tin — bảng lớn, khoảng 28.200 dòng mỗi năm =====
CREATE TABLE IF NOT EXISTS conversations (
  id      TEXT PRIMARY KEY,
  type    TEXT NOT NULL,         -- direct | group
  name    TEXT,
  classId TEXT REFERENCES classes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS conversation_members (
  conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  userId         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lastRead       TEXT,
  PRIMARY KEY (conversationId, userId)
);
CREATE INDEX IF NOT EXISTS idx_cm_user ON conversation_members(userId);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  senderId       TEXT NOT NULL,
  text           TEXT NOT NULL,
  createdAt      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversationId, createdAt);

-- ===== Phiên đăng nhập =====
CREATE TABLE IF NOT EXISTS sessions (
  token     TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);

-- ===== Nhật ký thao tác — phục vụ tra cứu khi có khiếu nại =====
CREATE TABLE IF NOT EXISTS audit_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  userId TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(userId, at DESC);

-- ===== Bật/tắt từng phân hệ (xem lib/modules.js) =====
CREATE TABLE IF NOT EXISTS module_settings (
  moduleKey TEXT PRIMARY KEY,
  enabled   INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT
);

-- ===== Sửa và thu hồi bản ghi (Thông báo, Nề nếp, Y tế, Nhận xét) =====
--
-- Bảng PHỤ, cố ý KHÔNG thêm cột vào bốn bảng gốc.
--
-- Tệp lược đồ này được chạy lại ở MỖI lần khởi động và không có khối bắt lỗi
-- nào bọc quanh (lib/db.js gọi sqlite.exec thẳng). Một câu ALTER TABLE ADD
-- COLUMN vì thế chạy được lần đầu rồi báo lỗi "duplicate column" ở mọi lần
-- khởi động sau — app chạy bình thường ngay sau khi triển khai rồi chết lặng
-- lẽ ở lần khởi động lại tiếp theo, sau khi mọi bài kiểm thử đã xanh. Bảng
-- phụ tạo bằng CREATE TABLE IF NOT EXISTS thì chạy lại bao nhiêu lần cũng được.
--
-- "Thu hồi" là ĐÁNH DẤU ẨN, không xóa: giữ đúng nguyên tắc không mất dữ liệu,
-- và còn vết để tra khi có khiếu nại.
CREATE TABLE IF NOT EXISTS record_edits (
  bang      TEXT NOT NULL,          -- notifications | conduct | health | remarks
  recordId  TEXT NOT NULL,
  thuHoi    INTEGER NOT NULL DEFAULT 0,
  suaLuc    TEXT,
  suaBoi    TEXT,
  thuHoiLuc TEXT,
  thuHoiBoi TEXT,
  PRIMARY KEY (bang, recordId)
);
CREATE INDEX IF NOT EXISTS idx_record_edits_thuhoi ON record_edits(bang, thuHoi);
