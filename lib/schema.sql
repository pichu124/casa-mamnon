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

-- Hồ sơ mở rộng của bé — những trường nhà trường yêu cầu thêm.
--
-- VÌ SAO LÀ BẢNG PHỤ, KHÔNG PHẢI CỘT THÊM VÀO `students`
--
-- Lược đồ lõi không được có câu ALTER TABLE nào (`test:lo-hong` canh điều đó).
-- Cùng lý do với `class_campus` và `class_teachers`.
--
-- `soDinhDanh` là SỐ ĐỊNH DANH CÁ NHÂN của bé. Đây là dữ liệu cá nhân theo
-- Nghị định 13/2023 — app chỉ hiện nó cho quản trị và văn phòng, KHÔNG hiện cho
-- cô, và không đưa vào bản xuất danh sách trừ khi người xuất chủ động chọn.
CREATE TABLE IF NOT EXISTS student_profile (
  studentId   TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  soDinhDanh  TEXT NOT NULL DEFAULT '',
  tienSuBenh  TEXT NOT NULL DEFAULT '',   -- thay chỗ cho ô "Dị ứng" đời cũ
  capNhatLuc  TEXT
);

-- Người liên hệ khẩn cấp NGOÀI bố mẹ.
--
-- Nhà trường yêu cầu mỗi bé phải có, vì có lúc gọi bố mẹ không được. Đây KHÔNG
-- phải tài khoản đăng nhập — người này không xem được gì trong app, chỉ là một
-- cái tên và một số điện thoại để cô gọi khi cần gấp.
CREATE TABLE IF NOT EXISTS student_emergency_contacts (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hoTen     TEXT NOT NULL,
  quanHe    TEXT NOT NULL DEFAULT '',     -- ông, bà, cô, bác…
  dienThoai TEXT NOT NULL DEFAULT '',
  ghiChu    TEXT NOT NULL DEFAULT '',
  taoLuc    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sec_student ON student_emergency_contacts(studentId);

-- Hồ sơ mở rộng của NGƯỜI LỚN — hiện chỉ có số CCCD.
--
-- Nhà trường cần số CCCD của phụ huynh để đối chiếu khi ký hợp đồng và khi giao
-- bé cho người tới đón. Cùng lý do bảng phụ như `student_profile`: lược đồ lõi
-- không được có câu ALTER TABLE nào.
--
-- CÓ MỘT LÝ DO THỨ HAI, RIÊNG CHO BẢNG NÀY, VÀ NÓ QUAN TRỌNG HƠN.
--
-- `routes/auth.js` có hàm `publicUser(u)` gạt đúng một trường ra: `passwordHash`.
-- Mọi cột khác của `users` đi thẳng tới bất cứ ai xem được hồ sơ bé — cô của
-- nhóm, và cả phụ huynh còn lại của bé đó. Thêm `soCccd` thành một cột của
-- `users` là gửi số CCCD của bố cho mẹ và cho cô, ngay lập tức, không ai phải
-- viết thêm dòng nào. Để ở bảng phụ thì mỗi chỗ muốn hiện nó phải ghép TAY —
-- tức là phải cố ý, và chỗ nào cố ý thì chỗ đó canh được.
CREATE TABLE IF NOT EXISTS user_profile (
  userId     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  soCccd     TEXT NOT NULL DEFAULT '',
  capNhatLuc TEXT
);

-- Một học sinh có thể có nhiều phụ huynh, một phụ huynh có nhiều con.
CREATE TABLE IF NOT EXISTS student_parents (
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parentId  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (studentId, parentId)
);
CREATE INDEX IF NOT EXISTS idx_sp_parent ON student_parents(parentId);

-- Người này là gì của bé: bố, mẹ, ông, bà, người giám hộ (Đ239d2 — góp ý 16/10,
-- mục 5). Theo TỪNG CẶP bé – người lớn, không theo người: cùng một người có thể
-- là mẹ của bé này và là bà của bé kia. Bảng riêng vì lược đồ lõi không có câu
-- ALTER TABLE nào. Không có dòng = chưa ai ghi quan hệ, KHÔNG phải "không là gì".
CREATE TABLE IF NOT EXISTS quan_he_phu_huynh (
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parentId  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quanHe    TEXT NOT NULL DEFAULT '',
  ghiLuc    TEXT,
  PRIMARY KEY (studentId, parentId)
);

-- Bé đang NGHỈ HỌC BẢO LƯU (Đ239d2 — góp ý 16/10, mục 5).
--
-- Bảo lưu đi đúng đường "Cho nghỉ" (students.active = 0, leftAt = hôm bấm):
-- bảng này chỉ ghi thêm rằng lần nghỉ ấy là TẠM, kèm tháng dự kiến quay lại.
-- Đi học lại (đường "Nhận lại") thì xoá dòng; dấu vết còn ở nhật ký thao tác.
CREATE TABLE IF NOT EXISTS hoc_sinh_bao_luu (
  studentId     TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  tuNgay        TEXT NOT NULL,            -- YYYY-MM-DD
  duKienQuayLai TEXT NOT NULL DEFAULT '', -- YYYY-MM, rỗng = chưa hẹn
  lyDo          TEXT NOT NULL DEFAULT '',
  nguoiGhi      TEXT,
  ghiLuc        TEXT
);

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

-- ===== Ảnh điểm danh buổi sáng =====
--
-- Nhà trường yêu cầu (điểm 4, 30/08): điểm danh chụp được ảnh, và ảnh đó gửi
-- thẳng cho gia đình để xác nhận con đã tới trường.
--
-- BẢNG PHỤ, KHÔNG PHẢI CỘT THÊM VÀO `attendance`. Lược đồ lõi cấm ALTER TABLE,
-- và ở đây tách bảng còn đúng về nghĩa: một buổi điểm danh KHÔNG bắt buộc có
-- ảnh, mà một cột NULL trong bảng chính thì mọi phép đếm sau này phải nhớ loại
-- trừ nó ra.
--
-- MỘT ẢNH MỖI BÉ MỖI NGÀY. Đây là ảnh "con đã tới lớp" chứ không phải album:
-- cho phép nhiều ảnh là mời cô chụp cả buổi sáng vào đây, và ảnh trẻ thì càng
-- ít chỗ lưu càng tốt.
--
-- KHÔNG PHẢI ẢNH NHÓM. Ảnh này chỉ đi tới gia đình CỦA CHÍNH BÉ ĐÓ, các cô
-- phụ trách nhóm, và quản trị trong phạm vi cơ sở. Nó không bao giờ xuất hiện
-- trong bất cứ danh sách nào mà một gia đình khác nhìn thấy, nên luật đồng ý
-- chia sẻ ảnh nhóm không áp dụng — nhưng chính vì thế, chốt chặn "chỉ nhà
-- mình" phải là một dòng riêng trong đường dẫn, không được dựa vào bộ lọc ảnh.
CREATE TABLE IF NOT EXISTS attendance_photo (
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,              -- YYYY-MM-DD
  file      TEXT NOT NULL,
  taoLuc    TEXT,
  byUserId  TEXT,
  PRIMARY KEY (studentId, date)
);
CREATE INDEX IF NOT EXISTS idx_att_photo_date ON attendance_photo(date);
-- Tra theo tên tệp chạy MỖI LẦN một gia đình mở một tấm ảnh điểm danh
-- (GET /api/attendance/anh/:file hỏi "ảnh này của bé nào" trước khi trả tệp).
-- Không có chỉ mục là một lượt quét cả bảng cho mỗi tấm ảnh — bảng này mỗi bé
-- mỗi ngày một dòng, một năm học 300 bé là ~60.000 dòng.
CREATE INDEX IF NOT EXISTS idx_att_photo_file ON attendance_photo(file);

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

-- ===== Hoàn tiền ăn khi bé nghỉ =====
--
-- Bảng RIÊNG chứ không thêm cột vào `leave_requests`, vì hai lẽ:
--
--   1. Lược đồ lõi cấm `ALTER TABLE` — trường đang chạy thật ở app 1 dùng chung
--      nền này, và một câu ALTER chạy nửa chừng là hỏng bảng đang có dữ liệu.
--   2. Có hàng nghĩa là VĂN PHÒNG ĐÃ QUYẾT. Không có hàng nghĩa là chưa quyết —
--      khác hẳn "đã quyết là không hoàn". Nhập hai chuyện đó vào một cột mặc
--      định 0 là gia đình đọc ra "trường không hoàn" trong khi văn phòng còn
--      chưa xem tới đơn.
--
-- `hoanTienAn` để dạng chữ ('co' / 'khong') chứ không phải 0/1: cột kiểu số ở
-- kho mã này đi qua BOOL_COLS, mà chỗ đó biến null thành 0 — đúng cái bẫy trên.
-- ===== Chức vụ: tầng hẹp thêm bên cạnh vai =====
--
-- App có bốn VAI: parent · teacher · admin (+ chưa đăng nhập). Bốn vai đó là
-- xương sống, và chúng KHÔNG đổi. Chức vụ là một tầng HẸP THÊM đặt bên cạnh,
-- chỉ áp cho tài khoản `admin`:
--
--   Cấp 1  hieu-truong    — ban giám hiệu, thấy cả ba cơ sở
--   Cấp 3  quanly-coso    — quản lý một cơ sở (đúng như Cấp 3 hiện có)
--   Cấp 3  vanphong-coso  — văn phòng một cơ sở: hẹp hơn, không đụng tài khoản
--   Cấp 2  nhansu · marketing · ketoan — nhân viên chéo cơ sở, mỗi người chỉ
--          mở được đúng phần việc của mình
--
-- KHÔNG KHAI CHỨC VỤ = Y NHƯ HÔM NAY.
--
-- Đây là điều quan trọng nhất của cả tầng này. Bảng rỗng thì mọi tài khoản
-- đang có chạy đúng như trước khi có nó — thêm một chức vụ chỉ BỚT quyền đi,
-- không bao giờ thêm. Nhờ vậy tầng này không thể làm hỏng trường đang chạy,
-- và bật nó lên là việc của nhà trường chứ không phải của một lần cập nhật mã.
--
-- Bảng RIÊNG chứ không thêm cột vào `users`: lược đồ lõi cấm ALTER TABLE, và
-- `publicUser()` chỉ gạt `passwordHash` nên mọi cột khác của `users` đi thẳng
-- tới ai xem được hồ sơ bé.
CREATE TABLE IF NOT EXISTS user_chucvu (
  userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chucVu TEXT NOT NULL,
  ganLuc TEXT
);

CREATE TABLE IF NOT EXISTS leave_refund (
  leaveId    TEXT PRIMARY KEY REFERENCES leave_requests(id) ON DELETE CASCADE,
  hoanTienAn TEXT NOT NULL DEFAULT '',
  soNgay     INTEGER,
  ghiChu     TEXT NOT NULL DEFAULT '',
  nguoiGhi   TEXT,
  capNhatLuc TEXT
);

-- ===== Duyệt đơn nghỉ TỪNG NGÀY (góp ý 20/10, E1 + D4) =====
--
-- Mỗi (đơn, ngày) một dòng: có phép hay không, được hoàn tiền ăn hay không, vì
-- sao. `leave_refund.soNgay` vẫn được ghi theo (= số dòng được hoàn) để mọi chỗ
-- đang đọc con số ấy giữ nguyên. Đơn duyệt trước bảng này không có dòng nào —
-- KHÔNG có dòng nghĩa là "duyệt theo một con số", không phải "không hoàn".
--
-- `diemDanh` ghi việc tự động ghi sổ điểm danh đã xét ngày này chưa:
--   ''          chưa tới hạn (hoặc chưa xét)
--   'tu-ghi'    đã tự ghi dòng `attId` (markedBy = 'tu-dong:don-nghi')
--   'da-co'     sổ đã có dòng do người ghi — giữ nguyên, `diemDanhCo` là trạng
--               thái lúc ấy để văn phòng xem
--   'khong-ghi' cuối tuần / trường nghỉ / bé đã thôi học — không cần dòng
-- Chữ 'co' / 'khong' cùng lý do với `leave_refund` (BOOL_COLS biến null thành 0).
CREATE TABLE IF NOT EXISTS leave_ngay (
  leaveId    TEXT NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  ngay       TEXT NOT NULL,                 -- YYYY-MM-DD
  coPhep     TEXT NOT NULL DEFAULT 'co',
  duocHoan   TEXT NOT NULL DEFAULT 'khong',
  lyDo       TEXT NOT NULL DEFAULT '',
  nguoiDuyet TEXT,
  duyetLuc   TEXT,
  diemDanh   TEXT NOT NULL DEFAULT '',
  diemDanhCo TEXT NOT NULL DEFAULT '',
  attId      TEXT,
  PRIMARY KEY (leaveId, ngay)
);
CREATE INDEX IF NOT EXISTS idx_leave_ngay_cho ON leave_ngay(diemDanh, ngay);

-- ===== LỊCH NGHỈ CỦA TRƯỜNG — nghỉ lễ, nghỉ hè, nghỉ Tết =====
--
-- Nhà trường 10/09: *"cần thêm phần set lịch được ghi nhận là nghỉ có phép để
-- hoàn tiền ăn, như nghỉ lễ theo lịch nhà nước, lịch nghỉ hè tết của trường.
-- Do đó nếu hôm đó bé k xin nghỉ, k có checkin thì sẽ là nghỉ ko phép."*
--
-- MỘT BẢNG RIÊNG, KHÔNG PHẢI MỘT ĐƠN XIN NGHỈ.
--
-- Đường ngắn nhất là sinh cho mỗi bé một dòng `leave_requests` trạng thái
-- 'approved' vào ngày lễ. Ba trăm đơn cho một ngày mùng Hai tháng Chín — mà
-- không nhà nào gửi và không ai duyệt. Sổ đơn của văn phòng ngập, con số "chờ
-- duyệt" trên trang chủ sai, và lịch sử đơn của một bé lẫn giữa việc riêng của
-- nhà bé với lịch của cả trường. Đợt nghỉ là chuyện của TRƯỜNG, nên nó là một
-- dòng của trường, không phải ba trăm dòng của ba trăm đứa trẻ.
--
-- `campusId` ĐỂ TRỐNG = CẢ TRƯỜNG. Cố ý KHÔNG khai REFERENCES campuses(id):
-- chuỗi rỗng không phải mã cơ sở nào cả, mà nghỉ lễ theo lịch nhà nước — trường
-- hợp thường gặp nhất, phải là cái dễ nhập nhất — thì đúng là cả ba cơ sở cùng
-- nghỉ. Nghỉ riêng một cơ sở (sửa chữa, mất nước) thì khai rõ mã cơ sở.
--
-- `hoanTienAn` để dạng CHỮ ('co'/'khong') cùng lý do đã ghi ở `leave_refund`
-- ngay trên: cột kiểu số ở kho mã này đi qua BOOL_COLS và biến null thành 0.
CREATE TABLE IF NOT EXISTS lich_nghi_truong (
  id         TEXT PRIMARY KEY,
  ten        TEXT NOT NULL,
  tuNgay     TEXT NOT NULL,                 -- YYYY-MM-DD
  denNgay    TEXT NOT NULL,                 -- YYYY-MM-DD, tính CẢ ngày này
  loai       TEXT NOT NULL DEFAULT 'khac',  -- le | he | tet | khac
  campusId   TEXT NOT NULL DEFAULT '',      -- '' = cả trường
  hoanTienAn TEXT NOT NULL DEFAULT 'co',
  ghiChu     TEXT NOT NULL DEFAULT '',
  nguoiTao   TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS idx_lnt_khoang ON lich_nghi_truong(tuNgay, denNgay);

-- ===== GIA ĐÌNH QUAN TÂM ĐIỀU GÌ — ĐẾM GỘP, KHÔNG THEO DÕI AI =====
--
-- Nhà trường 10/09: *"mình chỉ muốn xem PH khi vào app quan tâm những gì: kiểu
-- về ăn uống thực đơn, hay thời gian biểu, hay kế hoạch của bé hay là hình
-- ảnh"*.
--
-- BẢNG NÀY CỐ Ý KHÔNG CÓ CỘT NÀO CHỈ RA MỘT NGƯỜI. Không `userId`, không mã
-- gia đình, không mã bé, không địa chỉ máy, không mã phiên. Một dòng ở đây là
-- một CON SỐ: ngày ấy, ở cơ sở ấy, mục ấy được mở bao nhiêu lượt. Đọc ngược ra
-- một gia đình là việc không làm được, kể cả với người có toàn quyền vào kho.
--
-- Vì sao phải chặt đến thế: đây là app chứa ảnh khuôn mặt và hồ sơ sức khoẻ
-- của trẻ dưới 6 tuổi, và chưa một cam kết riêng tư nào với phụ huynh nói rằng
-- nhà trường xem được từng nhà đang mở gì. Một bảng có cột `userId` thì hôm nay
-- không ai truy vấn nó, nhưng ngày mai chỉ cần một câu SELECT là thành sổ theo
-- dõi — và không có bước nào ở giữa để ai đó kịp cân nhắc.
--
-- Con số ở đây là LƯỢT MỞ, không phải SỐ GIA ĐÌNH. Muốn biết số gia đình thì
-- phải nhớ từng nhà đã mở gì — đúng thứ vừa từ chối ở trên. Màn hình đọc bảng
-- này phải nói đúng chữ "lượt mở".
CREATE TABLE IF NOT EXISTS luot_quan_tam (
  ngay     TEXT NOT NULL,              -- YYYY-MM-DD, theo giờ Việt Nam
  muc      TEXT NOT NULL,              -- tên màn (view) của phân hệ
  campusId TEXT NOT NULL DEFAULT '',   -- '' = chưa suy ra được cơ sở
  soLuot   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ngay, muc, campusId)
);
CREATE INDEX IF NOT EXISTS idx_lqt_ngay ON luot_quan_tam(ngay);

-- ===== KÊNH NHẮN TIN: GIA ĐÌNH ↔ NHÓM LỚP, và GIA ĐÌNH ↔ VĂN PHÒNG =====
--
-- Nhà trường 10/09: *"giao diện phụ huynh phải nhắn tin với LỚP và nhắn tin với
-- VĂN PHÒNG, chứ mình cũng k muốn là nhắn tin với từng cô riêng lẻ"*.
--
-- MỘT KÊNH LÀ MỘT GIA ĐÌNH NÓI VỚI MỘT BÊN CỦA TRƯỜNG, KHÔNG PHẢI MỘT PHÒNG
-- CHUNG CẢ LỚP. Đây là chỗ dễ đọc nhầm nhất của cả đợt: "nhắn với lớp" nghe như
-- một phòng có cả hai chục gia đình trong đó. Không phải, và cũng không được
-- phép là như vậy — chuyện nhà một bé (con sốt, bố mẹ ly thân, xin đón sớm) mà
-- hiện trước mặt mười chín nhà khác là hỏng lòng tin không lấy lại được. "Với
-- lớp" nghĩa là gia đình không phải chọn nhắn cho cô nào: MỌI cô của nhóm đều
-- đọc và trả lời được cùng một cuộc, còn gia đình chỉ thấy một cuộc.
--
-- BẢNG PHỤ, KHÔNG THÊM CỘT VÀO `conversations`. Lược đồ lõi cấm ALTER TABLE, và
-- `conversations` là bảng app 1 đang chạy thật cũng dùng.
--
-- VÌ SAO PHẢI CÓ `studentId` chứ không chỉ `classId`: một nhà có hai con cùng
-- nhóm thì hai cuộc trò chuyện phải tách nhau, nếu không cô đọc một cuộc mà
-- không biết đang nói về bé nào. Gắn theo BÉ cũng làm cuộc trò chuyện tự đi
-- theo bé khi bé chuyển nhóm.
--
-- BÊN TRƯỜNG KHÔNG GHI THÀNH VIÊN CỐ ĐỊNH. Ai đọc được một kênh là câu hỏi tính
-- LẠI mỗi lần hỏi (`canAccessClass` cho cô, `canAccessStudent` cho văn phòng),
-- không phải một danh sách chép ra lúc lập phòng. Đó chính là chỗ hở mà chú
-- thích `findConv` ở routes/messages.js đã ghi lại: bảng thành viên không bao
-- giờ được đồng bộ, nên cô đã rời nhóm vẫn đọc tiếp, còn cô MỚI thì không vào
-- được. Kênh sinh sau nên không mang cái nợ đó.
CREATE TABLE IF NOT EXISTS kenh_hoi_thoai (
  conversationId TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  loai           TEXT NOT NULL,             -- 'nhom' | 'vanphong'
  studentId      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classId        TEXT NOT NULL DEFAULT '',  -- nhóm lúc lập kênh; '' với kênh văn phòng
  taoLuc         TEXT
);
CREATE INDEX IF NOT EXISTS idx_kenh_be ON kenh_hoi_thoai(studentId, loai);
CREATE INDEX IF NOT EXISTS idx_kenh_lop ON kenh_hoi_thoai(classId);

-- ===== HỘP THƯ VĂN PHÒNG: MỖI TÀI KHOẢN PHỤ HUYNH × CƠ SỞ MỘT CUỘC (Đ239m) =====
--
-- Nhà trường 16/10 (PH1): *"không cần tách ra Văn phòng nhà trường về bé này bé
-- kia, chỉ cần ghi Nhắn tin với văn phòng nhà trường"*. Chủ dự án chọn phương án
-- A ngày 18/10 (docs/PHAN-HOI-TRUONG-1610.md, mục PH1).
--
-- VÌ SAO GẮN THEO NGƯỜI, KHÔNG GẮN THEO BÉ. Một cuộc nói về cả nhà thì nội dung
-- phủ nhiều bé, còn quyền đọc kênh của MỘT bé tính theo phụ huynh HIỆN TẠI của
-- bé đó. Hai lần gộp kiểu ấy đều rò tin thật: bố mẹ riêng đọc chuyện con riêng
-- của nhau, và phụ huynh được gắn THÊM SAU đọc chuyện của bé không phải con mình.
-- Ở đây phía gia đình chỉ có ĐÚNG MỘT người đọc (`parentId`) và không ai được
-- thêm vào sau — rò kiểu đó không còn chỗ để xảy ra, không phải nhờ một chốt
-- chặn mà nhờ hình dạng dữ liệu.
--
-- KHÔNG UNIQUE (parentId, campusId): cuộc bị đóng (bảng hoi_thoai_dong) thì gia
-- đình phải lập được cuộc mới. "Cuộc đang dùng" là dòng mới nhất chưa bị đóng.
-- `parentId` không có khoá ngoại, cùng lối với `hoi_thoai_dong.dongBoi`: xoá một
-- tài khoản không được kéo theo lời qua lại giữa trường và gia đình.
-- `campusId` là cơ sở lúc lập; '' là nhóm chưa gắn cơ sở (chỉ ban giám hiệu đọc).
-- Luật đọc nằm ở MỘT chỗ: lib/kenh-van-phong.js.
CREATE TABLE IF NOT EXISTS kenh_van_phong (
  conversationId TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  parentId       TEXT NOT NULL,
  campusId       TEXT NOT NULL DEFAULT '',
  taoLuc         TEXT
);
CREATE INDEX IF NOT EXISTS idx_kvp_nguoi ON kenh_van_phong(parentId, campusId);
CREATE INDEX IF NOT EXISTS idx_kvp_coso ON kenh_van_phong(campusId);

-- ===== Hội thoại nhà trường đã ĐÓNG (Đ192, Câu 5) =====
--
-- Nhà trường chốt: xoá một cuộc trò chuyện là xoá khỏi màn hình phụ huynh,
-- còn "giao diện quản lý vẫn xem lại được". Hỏi rõ ai là quản lý, trường trả
-- lời 15/09/2026: *"Quản lý cơ sở và cấp 1 có thể xem lại được -> chỉ xem lại
-- được k thể nhắn vào thêm được nữa"*.
--
-- ĐÓNG LÀ ĐÁNH DẤU, KHÔNG PHẢI XOÁ. Không một dòng `messages` nào bị xoá —
-- vừa theo Nguyên tắc số 1 ("bỏ một tính năng là ngưng dùng nó, không phải
-- xoá dữ liệu của nó"), vừa vì đây có thể là chỗ duy nhất còn lưu lời qua lại
-- giữa trường và một gia đình khi có khiếu nại.
CREATE TABLE IF NOT EXISTS hoi_thoai_dong (
  conversationId TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  dongLuc        TEXT,
  dongBoi        TEXT,
  lyDo           TEXT NOT NULL DEFAULT ''
);

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

-- ===== Thực đơn RIÊNG của từng cơ sở =====
--
-- Nhà trường chốt ngày 30/08: "Ba cơ sở nấu riêng bếp, mỗi cơ sở có 1 thực đơn
-- riêng, thực đơn này sẽ được admin cơ sở up lên vào thứ 6 hàng tuần".
--
-- BẢNG PHỤ, KHÔNG PHẢI CỘT THÊM VÀO `menus`.
--
-- Chú thích cũ ở `routes/menu.js` dặn "thêm cột cơ sở vào `menus` rồi mới mở
-- đường này ra". Không làm được: `menus.date` là UNIQUE, đổi khoá phải dựng
-- lại bảng, mà lược đồ lõi CẤM ALTER TABLE — và dựng lại một bảng đang có dữ
-- liệu thật là đúng thứ Nguyên tắc số 1 cấm. Bảng phụ đạt cùng kết quả mà
-- không chạm một dòng nào của `menus`.
--
-- CÁCH ĐỌC: thực đơn của một cơ sở trong một ngày = dòng ở đây nếu có, KHÔNG
-- có thì rơi về `menus` (thực đơn dùng chung cả trường). Nhờ vậy:
--   • trường một bếp vẫn chạy y như cũ, không phải nhập lại gì;
--   • trường ba bếp chỉ cần nhập riêng ở cơ sở nào nấu khác;
--   • thực đơn đã nhập trước đợt này KHÔNG mất và vẫn hiện đúng.
CREATE TABLE IF NOT EXISTS menu_campus (
  campusId   TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,              -- YYYY-MM-DD
  meals      TEXT NOT NULL,              -- JSON, cùng hình dạng với menus.meals
  nguoiDang  TEXT,
  capNhatLuc TEXT,
  PRIMARY KEY (campusId, date)
);
CREATE INDEX IF NOT EXISTS idx_menu_campus_date ON menu_campus(date);

-- ===== TỆP THỰC ĐƠN CẢ TUẦN (Đ160 — TD-04) =====
--
-- Nhà trường 07/09: *"cho văn phòng nhập thực đơn cả tuần bằng cách tải tệp
-- lên, hoặc điền/dán theo mẫu bảng tuần"*. Đ132 đã làm vế thứ hai (ô dán bảng
-- từ Excel). Đây là vế thứ nhất.
--
-- KÈM THÊM, KHÔNG THAY THẾ. Thực đơn gõ vào `menus` / `menu_campus` vẫn là
-- nguồn sự thật của app: nó là thứ màn hình gia đình đọc theo từng ngày, thứ
-- phân hệ Tiền ăn đối chiếu, thứ tìm kiếm được. Một tệp PDF hay một tấm ảnh
-- chụp bảng thực đơn thì app KHÔNG đọc được vào trong — nên nếu để nó thay
-- chỗ bảng đã gõ thì mọi màn khác mất dữ liệu. Ở đây nó là BẢN ĐÍNH KÈM của
-- một tuần: bếp gửi tệp gì thì trường treo nguyên tệp ấy lên cho gia đình mở.
--
-- THEO TUẦN, KHÔNG THEO NGÀY. Bếp gửi một tệp cho cả tuần chứ không gửi năm
-- tệp; `tuNgay` là thứ Hai của tuần ấy, cùng cách tính với màn soạn tuần.
--
-- `campusId` để TRỐNG nghĩa là cả trường — cùng quy ước với `lich_nghi_truong`
-- (Đ147), và cố ý KHÔNG có REFERENCES vì chuỗi rỗng không trỏ vào cơ sở nào.
CREATE TABLE IF NOT EXISTS menu_tep (
  id       TEXT PRIMARY KEY,
  tuNgay   TEXT NOT NULL,               -- thứ Hai của tuần, YYYY-MM-DD
  campusId TEXT NOT NULL DEFAULT '',    -- '' = cả trường
  file     TEXT NOT NULL,               -- tên tệp trong kho uploads
  tenGoc   TEXT NOT NULL DEFAULT '',    -- tên người tải lên nhìn thấy
  bytes    INTEGER,
  loai     TEXT NOT NULL DEFAULT '',    -- pdf | docx | anh
  nguoiTai TEXT,
  taoLuc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_menu_tep_tuan ON menu_tep(tuNgay, campusId);

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

-- ===== Kế hoạch giáo dục CHUNG CẢ TRƯỜNG, soạn theo TUẦN (góp ý 06/10, mục 4) =====
-- Trường: "đây sẽ là kế hoạch chung của toàn trường nên sẽ bỏ nhóm lớp đi …
-- mục này mình sẽ để là soạn kế hoạch tuần". Bảng MỚI cạnh `edu_plans` (tháng,
-- theo nhóm) chứ không sửa bảng cũ: lược đồ lõi cấm ALTER, và kế hoạch tháng đã
-- soạn vẫn phải đọc được ở #/plans (Nguyên tắc số 1, vế 3).
-- `campusId` '' = cả trường — cùng quy ước với `menu_tep`, `lich_nghi_truong`.
-- `noiDung`: chữ thường, mỗi dòng một mục "Lĩnh vực: nội dung" — màn hình in
-- đậm phần trước dấu hai chấm. Không JSON, để khỏi phải khai cột trong lib/db.js.
CREATE TABLE IF NOT EXISTS edu_plan_tuan (
  id         TEXT PRIMARY KEY,
  tuan       TEXT NOT NULL,              -- thứ Hai của tuần, YYYY-MM-DD
  campusId   TEXT NOT NULL DEFAULT '',
  tieuDe     TEXT NOT NULL DEFAULT '',
  noiDung    TEXT NOT NULL DEFAULT '',
  nguoiSoan  TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_plan_tuan ON edu_plan_tuan(tuan, campusId);

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

-- ĐỒNG Ý CỦA GIA ĐÌNH — tách theo TỪNG MỤC ĐÍCH, không gộp một ô
--
-- Trẻ 12 tháng – 6 tuổi cộng ảnh khuôn mặt là nhóm dữ liệu được luật bảo vệ
-- chặt nhất (Nghị định 13/2023, Luật 91/2025). Gia đình đồng ý cho trường giữ
-- hồ sơ học tập của con KHÔNG có nghĩa là đồng ý cho ảnh con hiện trên màn hình
-- nhà khác, càng không có nghĩa là đồng ý cho trường dùng ảnh đi tuyển sinh.
-- Ba việc khác nhau nên là ba ô tích khác nhau, đúng như giấy đồng ý trường
-- phát cho phụ huynh ký.
--
-- BA GIÁ TRỊ, KHÔNG PHẢI HAI. NULL = CHƯA TRẢ LỜI, khác hẳn 0 = TỪ CHỐI.
--
-- Đầu năm học có hàng chục tờ giấy chưa thu về. "Chưa thu được giấy của bé An"
-- và "gia đình bé An nói không" là hai chuyện hoàn toàn khác nhau, và cách xử
-- của app với chúng cũng khác nhau — xem `locAnhChoNguoiXem` trong lib/db.js.
-- Gộp hai thứ đó làm một là hoặc vu cho gia đình đã từ chối, hoặc coi im lặng
-- là đồng ý. Cả hai đều sai.
--
-- Vì lẽ đó ba cột này CỐ Ý KHÔNG khai trong BOOL_COLS của lib/db.js: hàm
-- `encode` ở đó biến null thành 0, tức là biến "chưa trả lời" thành "từ chối".
CREATE TABLE IF NOT EXISTS student_consent (
  studentId     TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  hoSoHocTap    INTEGER,                    -- ① trường giữ hồ sơ học tập của con
  chiaSeGiaDinh INTEGER,                    -- ② ảnh/câu chuyện hiện cho gia đình khác trong nhóm
  truyenThong   INTEGER,                    -- ③ dùng ảnh cho truyền thông/tuyển sinh
  nguoiKy       TEXT NOT NULL DEFAULT '',   -- ai ký giấy
  ngayKy        TEXT NOT NULL DEFAULT '',
  ghiChu        TEXT NOT NULL DEFAULT '',
  capNhatLuc    TEXT
);

-- BÉ NÀO CÓ MẶT TRONG MỘT TẤM ẢNH — GẮN TAY, KHÔNG BAO GIỜ NHẬN DIỆN KHUÔN MẶT
--
-- Không có bảng này thì quy định "ảnh nhóm" trong CLAUDE.md không thể thực thi
-- được: app không biết trong ảnh có ai thì không thể biết ảnh đó được phép hiện
-- cho nhà nào.
--
-- GẮN TAY là một quyết định, không phải chỗ chưa kịp làm. Chạy nhận diện khuôn
-- mặt trên ảnh trẻ dưới 6 tuổi là tạo ra dữ liệu sinh trắc học của trẻ — thứ
-- luật xếp vào nhóm nhạy cảm nhất, và thứ không gia đình nào ký đồng ý cho làm.
-- Cô gắn thẻ bằng một lượt bấm; máy không được đoán thay.
CREATE TABLE IF NOT EXISTS photo_students (
  photoId   TEXT NOT NULL REFERENCES album_photos(id) ON DELETE CASCADE,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ganLuc    TEXT,
  PRIMARY KEY (photoId, studentId)
);
CREATE INDEX IF NOT EXISTS idx_ps_student ON photo_students(studentId);

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

-- ===== CHẾ ĐỘ CỦA MỘT ALBUM (Đ144) =====
--
-- Nhà trường 07/09: "cho thêm lựa chọn khi tạo album: có những album công khai
-- toàn gia đình ở lớp xem được mà không cần tag nhiều lần, còn những album thì
-- tag tên từng bé". Hai chế độ:
--
--   'cong-khai' — MỌI gia đình trong nhóm thấy album (vẫn qua luật đồng ý chia
--                 sẻ của `locAnhChoNguoiXem`, không có lối tắt nào ở đây).
--   'theo-the'  — gia đình CHỈ thấy tấm ảnh có con mình được gắn thẻ; ảnh chưa
--                 gắn thẻ chưa hiện với gia đình nào. Album cá nhân hoá.
--
-- KHÔNG CÓ DÒNG = 'cong-khai': đúng cách mọi album đang có đang hiện. Bảng
-- riêng chứ không phải cột mới: `albums` là bảng đã có dữ liệu, không ALTER.
CREATE TABLE IF NOT EXISTS album_che_do (
  albumId  TEXT PRIMARY KEY REFERENCES albums(id) ON DELETE CASCADE,
  cheDo    TEXT NOT NULL DEFAULT 'cong-khai',
  ghiLuc   TEXT
);

-- ===== THÔNG BÁO RIÊNG CHO GIA ĐÌNH MỘT BÉ (Đ137) =====
--
-- `notifications` là thông báo CỦA NHÀ TRƯỜNG gửi cả nhóm hay cả trường. Nhà
-- trường (07/09) muốn gia đình được báo NGAY khi có ảnh con tới lớp, khi cô
-- ghi nhật ký, cân đo, khi có album mới… — tức là chuyện của MỘT bé, không
-- phải của cả nhóm. Nhét vào `notifications` với audience = mã bé là làm
-- luật "ai thấy gì" của bảng ấy rẽ nhánh — chỗ dễ rò nhất. Nên là bảng riêng,
-- đọc theo `student_parents`: chỉ bố mẹ của chính bé đó thấy.
--
-- Bảng phụ, KHÔNG ALTER bảng nào. `hash` là chỗ bấm vào thì mở (ví dụ
-- '#/attendance'); `loai` để màn hình chọn biểu tượng.
CREATE TABLE IF NOT EXISTS thongbao_be (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  loai      TEXT NOT NULL DEFAULT '',
  tieuDe    TEXT NOT NULL,
  noiDung   TEXT NOT NULL DEFAULT '',
  hash      TEXT NOT NULL DEFAULT '',
  nguoiTao  TEXT,
  taoLuc    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_thongbao_be_student ON thongbao_be(studentId, taoLuc DESC);

CREATE TABLE IF NOT EXISTS thongbao_be_doc (
  thongBaoId TEXT NOT NULL REFERENCES thongbao_be(id) ON DELETE CASCADE,
  userId     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  docLuc     TEXT,
  PRIMARY KEY (thongBaoId, userId)
);

-- Dòng chuông nào sinh ra TỪ bản ghi nào (Đ239p).
--
-- Một dòng `thongbao_be` chép sẵn một đoạn chữ của bản ghi gốc — tin nhắn của
-- cô chép 140 chữ đầu. Bản gốc thu hồi được (`record_edits`), bản chép thì
-- không biết mình chép từ đâu, nên câu cô đã rút lại cứ nằm trên màn Thông báo
-- của gia đình. Bảng này nối hai đầu để lúc ĐỌC lọc được (lib/thong-bao-be.js).
--
-- Bảng phụ chứ không phải cột mới trên `thongbao_be`: tệp này chạy lại ở mỗi
-- lần khởi động, ALTER TABLE ADD COLUMN chạy được lần đầu rồi báo trùng cột ở
-- mọi lần sau (xem đầu lib/sua-thu-hoi.js). Dòng chuông không có nguồn đọc y
-- như trước.
CREATE TABLE IF NOT EXISTS thongbao_be_nguon (
  thongBaoId TEXT PRIMARY KEY REFERENCES thongbao_be(id) ON DELETE CASCADE,
  bang       TEXT NOT NULL,          -- tên bảng gốc, cùng nghĩa với record_edits.bang
  recordId   TEXT NOT NULL
);

-- Đăng ký nhận thông báo ĐẨY (Web Push) của từng điện thoại. Một người có thể
-- có vài máy; mỗi máy một dòng, khoá theo `endpoint` do trình duyệt cấp.
CREATE TABLE IF NOT EXISTS push_dang_ky (
  endpoint  TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  taoLuc    TEXT,
  loiCuoi   TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_dang_ky_user ON push_dang_ky(userId);

CREATE TABLE IF NOT EXISTS notification_reads (
  notificationId TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  userId         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  readAt         TEXT,
  PRIMARY KEY (notificationId, userId)
);
CREATE INDEX IF NOT EXISTS idx_nreads_user ON notification_reads(userId);

-- Bấm thông báo thì mở thẳng màn nào (góp ý 20/10, G2). Thông báo khảo sát
-- trỏ '#/surveys/<mã>' để gia đình làm khảo sát luôn, không phải tự đi tìm.
-- Bảng phụ, KHÔNG ALTER `notifications`. Không có dòng = mở hộp chi tiết như
-- mọi thông báo cũ. Liên kết không mở thêm quyền: màn đích tự hỏi máy chủ.
CREATE TABLE IF NOT EXISTS notification_lien_ket (
  notificationId TEXT PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  lienKet        TEXT NOT NULL
);

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

-- ===== Lịch sử lớp của học sinh =====
--
-- Học sinh chỉ có MỘT trường `classId` duy nhất, bị GHI ĐÈ ngay lúc chuyển năm
-- học hoặc lúc quản trị chuyển lớp giữa năm. Nghĩa là sau lần chuyển đầu tiên,
-- không còn cách nào biết trước đó em học lớp nào — và đó là thông tin cần để
-- cho phụ huynh xem lại album, thông báo, kế hoạch của năm cũ.
--
-- Mỗi dòng là một KHOẢNG THỜI GIAN em học một lớp: `den = NULL` nghĩa là đang
-- học. Phải là khoảng chứ không phải "mỗi năm một dòng": em chuyển lớp giữa năm
-- thì có hai khoảng trong cùng một năm, và album phải giới hạn đúng khoảng em
-- còn ở lớp đó — mở cả lớp cũ thì một em chuyển đi tháng 10 vẫn xem được ảnh
-- chụp tháng 12, trong khi album có mặt nhiều trẻ khác.
--
-- Ghi lại từ bây giờ là việc rẻ; mỗi lần chuyển năm trôi qua mà không ghi là
-- mất thêm một năm thông tin KHÔNG lấy lại được.
CREATE TABLE IF NOT EXISTS student_class_periods (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classId   TEXT NOT NULL,
  className TEXT NOT NULL DEFAULT '',
  year      TEXT NOT NULL DEFAULT '',
  tu        TEXT NOT NULL,           -- ngày bắt đầu học lớp đó (YYYY-MM-DD)
  den       TEXT,                    -- NULL = đang học
  ghiLuc    TEXT
);
CREATE INDEX IF NOT EXISTS idx_scp_student ON student_class_periods(studentId, tu DESC);
CREATE INDEX IF NOT EXISTS idx_scp_class ON student_class_periods(classId);
CREATE INDEX IF NOT EXISTS idx_scp_dang_hoc ON student_class_periods(studentId, den);

-- ===== CƠ SỞ — trường có 3 cơ sở, dữ liệu giữa các cơ sở phải ĐỘC LẬP =====
--
-- App 1 là một trường tiểu học MỘT điểm, nên không có khái niệm cơ sở. Trường
-- mầm non này có ba, và quy định phân quyền của nhà trường nói rất rõ:
-- "Cấp 3 Cơ sở A không thể xem dữ liệu của Cấp 3 Cơ sở B."
--
-- VÌ SAO LÀ BẢNG PHỤ, KHÔNG PHẢI CỘT THÊM VÀO `classes`
--
-- Lược đồ lõi KHÔNG được có câu ALTER TABLE nào — `test/lo-hong-da-va.test.mjs`
-- canh đúng điều đó, vì một câu ALTER chạy nửa chừng trên cơ sở dữ liệu thật là
-- hỏng không lùi được. Nên quan hệ nhóm ↔ cơ sở nằm ở bảng riêng, đúng cách mà
-- `class_teachers` và `student_class_periods` đã làm.
--
-- TÍNH CHẤT AN TOÀN QUAN TRỌNG NHẤT: chừng nào bảng `campuses` còn TRỐNG thì
-- toàn bộ tầng cơ sở nằm im, không đổi hành vi của bất kỳ ai. Trường một cơ sở
-- dùng app này không hề biết tầng đó tồn tại.
CREATE TABLE IF NOT EXISTS campuses (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone   TEXT NOT NULL DEFAULT '',   -- hotline văn phòng cơ sở
  email   TEXT NOT NULL DEFAULT '',
  active  INTEGER NOT NULL DEFAULT 1,
  taoLuc  TEXT
);
CREATE INDEX IF NOT EXISTS idx_campus_active ON campuses(active, name);

-- Mỗi nhóm lớp thuộc đúng MỘT cơ sở.
CREATE TABLE IF NOT EXISTS class_campus (
  classId  TEXT PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  campusId TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  ganLuc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_cc_campus ON class_campus(campusId);

-- Tài khoản bị KHOÁ VÀO một cơ sở (Cấp 3 theo quy định phân quyền).
--
-- Không có dòng nào ở đây = tài khoản KHÔNG bị khoá vào cơ sở nào. Với vai quản
-- trị, đó chính là Cấp 1 (toàn hệ thống). Nhờ vậy mọi tài khoản quản trị đang có
-- giữ nguyên quyền như trước — thêm tầng cơ sở không lấy đi quyền của ai.
CREATE TABLE IF NOT EXISTS user_campus (
  userId   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  campusId TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  ganLuc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_uc_campus ON user_campus(campusId);

-- Cô do quản lý cơ sở NÀO tạo ra (Đ239d1 — góp ý 16/10, mục 5).
--
-- Cô không có cơ sở của riêng mình: cơ sở của cô suy ra từ nhóm cô phụ trách.
-- Cô vừa được quản lý cơ sở tạo mà chưa gán nhóm thì không suy ra được gì, nên
-- chính người tạo không thấy lại cô để phân công. Bảng này ghi đúng điều đó,
-- và CHỈ được hỏi khi cô chưa phụ trách nhóm nào đang mở: cô đã có nhóm thì
-- nhóm mới là sự thật. Bảng không cấp quyền đọc dữ liệu bé nào cả.
CREATE TABLE IF NOT EXISTS giao_vien_co_so (
  userId   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  campusId TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  taoLuc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_gvcs_campus ON giao_vien_co_so(campusId);

-- ===== Cô phụ trách nhóm lớp — quan hệ NHIỀU CÔ ↔ MỘT NHÓM =====
--
-- App 1 là trường tiểu học: một lớp có đúng MỘT giáo viên chủ nhiệm. Quan hệ đó
-- nằm ở hai cột phải luôn ghi khớp nhau — `classes.teacherId` (màn hình quản trị
-- đọc) và `users.classId` (quyền đọc hồ sơ học sinh đi theo). Trường mầm non thì
-- khác hẳn: một nhóm lớp có 2–3 cô cùng phụ trách, và một cô có thể phụ trách
-- nhiều nhóm. Hai cột kia không diễn tả nổi điều đó, dù ghi khớp đến đâu.
--
-- Bảng PHỤ, cố ý KHÔNG đụng vào hai cột cũ: chúng vẫn được ghi và vẫn đúng, nên
-- lỡ bảng này sai thì còn đường quay lại. Xem `lib/db.js` mục "Cô phụ trách nhóm
-- lớp" để biết ba bước chuyển đổi.
--
-- `vaiTro` chỉ có hai giá trị: 'chinh' (cô phụ trách chính của nhóm — đúng thứ
-- hai cột đời cũ diễn tả được) và 'phu'. Dòng của nhóm ĐÃ ĐÓNG được GIỮ LẠI để
-- còn nhận ra "cô từng phụ trách nhóm này" khi mở lại album năm cũ; quyền đọc hồ
-- sơ trẻ thì lọc thêm `classes.active = 1` nên không rò rỉ theo.
CREATE TABLE IF NOT EXISTS class_teachers (
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacherId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vaiTro    TEXT NOT NULL DEFAULT 'phu',    -- chinh | phu
  ganLuc    TEXT,
  PRIMARY KEY (classId, teacherId)
);
CREATE INDEX IF NOT EXISTS idx_ct_teacher ON class_teachers(teacherId);
CREATE INDEX IF NOT EXISTS idx_ct_class ON class_teachers(classId, vaiTro);

-- ===== Ba nhóm cô của trường mầm non (Đ188, Câu 11) =====
--
-- Nhà trường: ở cấp cơ sở có GV chủ nhiệm (Montessori), GV nước ngoài
-- (Cambridge) và GV P.E (thể chất chuyên sâu); ba vai này lên kế hoạch, đánh
-- giá và làm báo cáo học tập cho từng trẻ.
--
-- BẢNG PHỤ, KHÔNG THÊM CỘT VÀO `class_teachers`. Lược đồ lõi cấm ALTER TABLE
-- vì tệp này chạy lại ở MỖI lần khởi động và không có khối bắt lỗi nào bọc
-- quanh — lý do đầy đủ đã ghi ở khối `record_edits` bên dưới.
--
-- KHÔNG dùng lại cột `vaiTro` đang có ('chinh' | 'phu'): cột ấy nói ai là cô
-- phụ trách CHÍNH của nhóm, còn cột này nói cô dạy CHƯƠNG TRÌNH nào. Một nhóm
-- có đúng một cô chính, nhưng cô chính ấy vẫn có thể là cô nước ngoài. Trộn
-- hai câu hỏi vào một cột là mất một trong hai câu trả lời.
--
-- KHÔNG CÓ DÒNG = CHỦ NHIỆM. Nhờ vậy hôm bảng này ra đời, chưa nhóm nào được
-- khai, và mọi cô đều là chủ nhiệm — tức app chạy y hệt như trước.
CREATE TABLE IF NOT EXISTS class_teacher_nhom (
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacherId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nhom      TEXT NOT NULL DEFAULT 'chu-nhiem',   -- chu-nhiem | nuoc-ngoai | the-chat
  PRIMARY KEY (classId, teacherId)
);
CREATE INDEX IF NOT EXISTS idx_ctn_co ON class_teacher_nhom(teacherId, nhom);

-- ===== Lứa tuổi của một NHÓM LỚP (Đ193, việc 5) =====
--
-- Nhà trường chốt (A4): nhật ký ngày cắt theo NHÓM LỚP, và nhóm không phải nhà
-- trẻ thì bỏ hẳn mục Nhật ký của bé.
--
-- VÌ SAO KHÔNG SUY RA TỪ TÊN NHÓM. "Nhà trẻ 1" thì đoán được, nhưng trường ba
-- cơ sở đặt tên mỗi nơi một kiểu, và sang năm học mới tên đổi. Một cái tên
-- không phải một lời khai.
--
-- VÌ SAO KHÔNG SUY RA TỪ NGÀY SINH NỮA. Đó là luật cũ, và nó đúng cho câu hỏi
-- "bé này đã 36 tháng chưa". Nhưng câu hỏi trường thật sự hỏi là "NHÓM này có
-- phải nhóm nhà trẻ không" — một nhóm nhà trẻ vẫn có bé vừa qua 36 tháng, và
-- cô vẫn cần ghi thay bỉm cho bé ấy. Hai câu hỏi khác nhau.
--
-- KHÔNG CÓ DÒNG = CHƯA KHAI, và chưa khai thì QUAY VỀ ĐÚNG LUẬT CŨ (tính theo
-- ngày sinh). Nhờ vậy ngày bảng này ra đời, không nhóm nào đổi hành vi.
CREATE TABLE IF NOT EXISTS class_lua_tuoi (
  classId  TEXT PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  lua      TEXT NOT NULL DEFAULT 'nha-tre',   -- nha-tre | mau-giao
  khaiLuc  TEXT,
  khaiBoi  TEXT
);

-- NHÀ NÀO ĐƯỢC XEM MỘT ALBUM "CHỌN TỪNG NHÀ" (Đ197, việc 29).
--
-- Nhà trường xin phân quyền TỪNG album ở bốn mức: cả trường · một nhóm lớp ·
-- theo thẻ bé · chọn từng nhà. Ba mức đầu suy ra được từ thứ đã có (`classId`
-- của album, bảng thẻ bé); mức thứ tư thì phải khai ra, vì không có gì trong
-- dữ liệu nói được "nhà này thì có, nhà kia thì không".
--
-- MỞ RỘNG TẦM NHÌN KHÔNG BAO GIỜ ĐƯỢC NỚI LUẬT ẢNH NHÓM. `album_che_do` trả
-- lời "ai mở được album này"; `db.locAnhChoNguoiXem` trả lời "trong album ấy,
-- nhà này thấy được tấm nào". Hai câu hỏi xếp chồng, KHÔNG thay nhau: một nhà
-- được chọn vào đây vẫn chỉ thấy những tấm mà MỌI bé trong ảnh đều có đồng ý
-- chia sẻ. Bỏ vế sau là vi phạm thẳng quy định ở CLAUDE.md.
CREATE TABLE IF NOT EXISTS album_nha (
  albumId  TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  parentId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ghiLuc   TEXT,
  PRIMARY KEY (albumId, parentId)
);
CREATE INDEX IF NOT EXISTS idx_album_nha_nha ON album_nha(parentId);

-- LỜI KỂ VÀ GỢI Ý CÙNG CON Ở NHÀ CHO MỘT ALBUM (Đ197, việc 32).
--
-- Nhà trường: *"ảnh đăng phải có lời chú thích rõ ràng, kèm gợi ý gia đình làm
-- thêm ở nhà"*. Vế thứ hai chính là QUY TẮC 5 của CLAUDE.md — mỗi nhận định đi
-- kèm một việc làm được ở nhà — nên nó không phải một ô phụ, nó là phần hồn.
--
-- VÌ SAO Ở TẦNG ALBUM CHỨ KHÔNG Ở TỪNG TẤM ẢNH. Đây là đường thoát mà bản tồn
-- đọng dặn phải có: bắt chú thích từng tấm là thêm một bước cho cô ở đúng lúc
-- cô đang vội — hai mươi tấm là hai mươi lần gõ, và kết cục là cô gõ "abc" hai
-- mươi lần hoặc thôi không đăng ảnh nữa. Một lời kể cho cả buổi hoạt động thì
-- cô viết được, và nó nói đúng thứ gia đình cần biết.
--
-- `albums.description` đã có sẵn và chính là lời kể ấy — không thêm cột. Bảng
-- này chỉ chở vế thứ hai, thứ chưa có chỗ nào để chứa.
CREATE TABLE IF NOT EXISTS album_cung_con (
  albumId     TEXT PRIMARY KEY REFERENCES albums(id) ON DELETE CASCADE,
  cungConONha TEXT NOT NULL DEFAULT '',
  ghiLuc      TEXT
);

-- ===========================================================================
-- NGÀY CÔ GHI MỘT BẢN GHI SỨC KHOẺ (Đ205, việc 10)
-- ===========================================================================
--
-- Nhà trường: *"cô chỉ sửa được ghi nhận sức khoẻ trong chính ngày ghi"*.
--
-- CỘT `date` CỦA BẢNG `health` KHÔNG DÙNG ĐƯỢC CHO VIỆC NÀY, và đó là toàn bộ
-- lý do bảng phụ này tồn tại. `date` là NGÀY KHÁM, không phải ngày cô gõ vào
-- máy — app cố ý cho nhập BÙ kết quả khám của trạm y tế làm cách đó vài tuần
-- (xem chú thích ở `routes/health.js`). Khoá theo `date` là giết luôn việc
-- nhập bù: cô gõ kết quả khám ngày 01/09 vào hôm nay thì bản ghi ấy sinh ra đã
-- ở trạng thái không sửa được, gõ sai một chữ số cũng phải đi nhờ văn phòng.
--
-- Nên khoá theo NGÀY GÕ VÀO MÁY, và ngày ấy phải ghi lại — bảng `health`
-- không có cột nào giữ nó, mà `CREATE TABLE IF NOT EXISTS` thì không thêm được
-- cột vào bảng đã tồn tại (cùng lý do đã ghi ở `hocphi_khoan_loai`, Đ199).
--
-- KHÔNG CÓ DÒNG = BẢN GHI CÓ TRƯỚC ĐỢT NÀY. Lúc ấy lùi về `date`, và với bản
-- ghi cũ thì `date` gần như luôn là ngày quá khứ, tức là khoá — đúng điều nhà
-- trường muốn. Không có khoảng trống nào để một bản ghi cũ lọt qua mãi mãi.
--
-- HAI CỘT THỜI GIAN, VÀ ĐÓ LÀ CỐ Ý.
--
-- `luc` là dấu thời gian ISO (giờ UTC) — thứ dùng để tra "ghi lúc mấy giờ".
-- `ngayGhi` là NGÀY THEO GIỜ VIỆT NAM, và nó mới là thứ đem ra so.
--
-- Cắt mười ký tự đầu của `luc` để lấy ngày là SAI BẢY TIẾNG MỖI NGÀY: từ 17h
-- UTC trở đi, Việt Nam đã sang ngày mới mà chuỗi ISO thì chưa. Cô ghi một bản
-- ghi lúc 9 giờ tối rồi sửa lại ngay sau đó sẽ nhận câu "bản ghi này ghi hôm
-- qua". Bộ kiểm thử bắt đúng lỗi này ở lượt chạy đầu tiên — cùng loại lỗi mà
-- `test:mot-hom-nay` sinh ra để canh.
CREATE TABLE IF NOT EXISTS health_ghi_luc (
  healthId TEXT PRIMARY KEY,
  luc      TEXT NOT NULL,          -- ISO (UTC), để tra "ghi lúc mấy giờ"
  ngayGhi  TEXT NOT NULL DEFAULT '', -- YYYY-MM-DD theo GIỜ VIỆT NAM — cột đem ra so
  nguoiGhi TEXT
);

-- ===========================================================================
-- Ô LƯU Ý CỦA TRƯỜNG VỀ MỘT NGÀY CỦA BÉ (Đ207, việc 4)
-- ===========================================================================
--
-- Nhà trường: *"ô Lưu ý chỉ cơ sở xem, không gửi tới phụ huynh"*.
--
-- VÌ SAO KHÔNG DÙNG LẠI CỘT `attendance.note` ĐANG CÓ. Ô ấy đang mang nhãn
-- "Ghi chú (gia đình đọc được)" ngay trên màn hình của cô, và cô đã gõ vào đó
-- những câu viết CHO gia đình đọc ("bà đưa tới lúc 9 giờ"). Đổi công dụng của
-- nó thành nội bộ là hai cái sai cùng lúc: những câu cô viết cho gia đình bỗng
-- biến mất khỏi màn của gia đình, và ô ấy từ nay nhận những câu KHÔNG dành cho
-- gia đình trong khi mọi bản ghi cũ trong đó thì có. Không một dòng dữ liệu nào
-- tự khai nó thuộc đời nào. Nên: THÊM Ô MỚI, giữ nguyên ô cũ.
--
-- VÀ VÌ SAO LÀ BẢNG PHỤ CHỨ KHÔNG PHẢI CỘT MỚI CỦA `attendance` — đây là phần
-- đáng đọc nhất của bảng này, nó không chỉ là chuyện CREATE TABLE IF NOT EXISTS
-- không thêm được cột:
--
--   `GET /api/attendance` là đường GIA ĐÌNH đọc lịch điểm danh của con, và nó
--   chạy `SELECT * FROM attendance`. Một cột mới trên bảng ấy là một cột GIA
--   ĐÌNH ĐỌC ĐƯỢC NGAY, không cần ai viết thêm dòng nào — đúng thứ việc này
--   sinh ra để cấm. Để ở bảng riêng thì `SELECT *` kia không với tới được, và
--   muốn lộ phải có người cố ý viết một câu JOIN mới.
--
-- Nói cách khác: chỗ an toàn ở đây do HÌNH DẠNG DỮ LIỆU giữ, không do người
-- viết mã nhớ mà giữ.
--
-- KHÔNG KHOÁ THEO NGÀY, khác với chính bảng `attendance`. Sổ điểm danh khoá
-- ngoài ngày vì nó là chứng từ bé có mặt hay không — không ai được viết lại.
-- Ô này thì ngược lại: nó là chỗ trường ghi thứ BIẾT ĐƯỢC SAU, thường là hai
-- ba hôm sau khi gia đình gọi lại. Khoá nó theo ngày là bịt đúng lúc nó cần
-- dùng. Bù lại phải ghi rõ ai viết và viết lúc nào.
--
-- Ô này KHÔNG chạm tới `status`, `checkIn`, `checkOut` — nó không phải một lối
-- vòng để sửa sổ điểm danh đã khoá.
CREATE TABLE IF NOT EXISTS attendance_luu_y (
  studentId  TEXT NOT NULL,
  ngay       TEXT NOT NULL,          -- YYYY-MM-DD
  luuY       TEXT NOT NULL DEFAULT '',
  nguoiGhi   TEXT,
  capNhatLuc TEXT,
  PRIMARY KEY (studentId, ngay)
);
CREATE INDEX IF NOT EXISTS attendance_luu_y_theo_ngay ON attendance_luu_y(ngay);

-- ===========================================================================
-- ẢNH LÚC TRẢ BÉ, NAY THUỘC PHẦN LÕI (Đ210, việc 1 + 2)
-- ===========================================================================
--
-- Nhà trường xin gộp hai tab Đón bé / Trả bé về MỘT dòng Vào/Ra, và chuyển ảnh
-- trả bé vào phần lõi.
--
-- ĐÂY LÀ MỘT ĐÁNH ĐỔI THẬT, VÀ NÓ ĐÃ ĐƯỢC NÓI RA TRƯỚC KHI LÀM. Ảnh trả bé
-- trước nay nằm trong phân hệ Đón trả bé — thứ nhà trường TẮT ĐƯỢC ở Quản trị.
-- Cơ chế cô lập lỗi của kho mã này bảo vệ bằng cách khoanh vùng: phân hệ nào
-- hỏng thì tắt phân hệ ấy, phần còn lại chạy tiếp. Vào lõi là mất lớp ấy —
-- từ nay một lỗi ở đường ảnh trả bé không còn khoanh lại được nữa.
--
-- KHÔNG DỜI MỘT DÒNG DỮ LIỆU NÀO. Bảng `dontra_anh_tra` giữ nguyên từng dòng
-- và phân hệ vẫn đọc nó y như cũ. Bảng dưới đây là chỗ ghi MỚI của lõi, và
-- đường đọc của lõi tra CẢ HAI — ảnh chụp trước đợt này vẫn mở ra xem được.
-- Đây đúng là lối "thêm cái mới bên cạnh, chuyển dần chỗ gọi" mà CLAUDE.md
-- bắt đi khi phải đổi một thứ đang chạy.
--
-- Một bé một ngày MỘT tấm, chụp lại là THAY. Cùng luật với `attendance_photo`.
CREATE TABLE IF NOT EXISTS attendance_anh_ve (
  studentId TEXT NOT NULL,
  date      TEXT NOT NULL,              -- YYYY-MM-DD
  file      TEXT NOT NULL,
  taoLuc    TEXT,
  byUserId  TEXT,
  PRIMARY KEY (studentId, date)
);
CREATE INDEX IF NOT EXISTS idx_att_anh_ve_date ON attendance_anh_ve(date);
CREATE INDEX IF NOT EXISTS idx_att_anh_ve_file ON attendance_anh_ve(file);

-- ===========================================================================
-- GHI CHÚ LÚC RA VỀ — GIA ĐÌNH ĐỌC ĐƯỢC (Đ242D, góp ý D3)
-- ===========================================================================
--
-- Màn "Xem lại" lúc bấm tên bé có một ô ghi chú gửi gia đình. Lượt VÀO LỚP
-- ghi vào `attendance.note` — chính ô "Ghi chú (gia đình đọc được)" đã có.
-- Lượt RA VỀ thì `attendance` không có ô thứ hai, và lược đồ lõi cấm ALTER,
-- nên ghi chú ấy nằm ở bảng phụ này. Ghi chú NỘI BỘ là `attendance_luu_y`,
-- không trộn với bảng này.
--
-- Gỡ giờ ra về (bấm nhầm bé) thì ghi chú về chuỗi rỗng, dòng ở lại làm vết.
CREATE TABLE IF NOT EXISTS attendance_ghi_chu_ve (
  studentId  TEXT NOT NULL,
  date       TEXT NOT NULL,              -- YYYY-MM-DD
  ghiChu     TEXT NOT NULL DEFAULT '',
  nguoiGhi   TEXT,
  capNhatLuc TEXT,
  PRIMARY KEY (studentId, date)
);

-- ===== CHẤM CÔNG CÔ VÀ NHÂN VIÊN BẰNG ẢNH Ở CỔNG (góp ý 06/10, mục 2) =====
-- Trường: mục "Giáo viên" đứng đầu màn điểm danh — bấm vào ra danh sách cô và
-- nhân viên của cơ sở, chụp ảnh lần đầu là giờ vào, lần hai là giờ ra. Chủ dự
-- án chốt 06/10: CHỤP ẢNH NHƯ VỚI BÉ.
-- Đây là loại dữ liệu MỚI: ảnh khuôn mặt người lớn. Ai được XEM ảnh là chuyện
-- của phân hệ Nhân sự (`/api/nhansu/anh-cham-cong`), không phải của cổng —
-- người chụp ở cổng chỉ thấy tên và giờ.
-- Bảng LÕI chứ không của phân hệ Nhân sự: người chụp là bảo vệ cổng, mà chức
-- vụ ấy chỉ gọi được `/api/attendance`. Nhân sự đang bật thì giờ vào/ra được
-- chép sang bảng công `nhansu_cham_cong` (hỏi công tắc trước).
CREATE TABLE IF NOT EXISTS staff_checkin (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ngay         TEXT NOT NULL,          -- YYYY-MM-DD giờ Việt Nam
  gioVao       TEXT NOT NULL DEFAULT '',
  gioRa        TEXT NOT NULL DEFAULT '',
  anhVao       TEXT NOT NULL DEFAULT '',
  anhRa        TEXT NOT NULL DEFAULT '',
  campusId     TEXT NOT NULL DEFAULT '', -- cơ sở của người được chụp lúc chụp
  nguoiChupVao TEXT,
  nguoiChupRa  TEXT,
  capNhatLuc   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_checkin ON staff_checkin(userId, ngay);
CREATE INDEX IF NOT EXISTS idx_staff_checkin_anh_vao ON staff_checkin(anhVao);
CREATE INDEX IF NOT EXISTS idx_staff_checkin_anh_ra ON staff_checkin(anhRa);
