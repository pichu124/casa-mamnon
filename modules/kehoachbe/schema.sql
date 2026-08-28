-- KẾ HOẠCH CỦA BÉ — kế hoạch tháng cho TỪNG BÉ, có phê duyệt.
--
-- KHÁC VỚI PHÂN HỆ "KẾ HOẠCH GIÁO DỤC" ĐANG CÓ
--
-- App đã có phân hệ lõi `kehoach` (/api/plans): kế hoạch tháng của CẢ NHÓM —
-- chủ đề, mục tiêu chung, việc từng tuần. Phân hệ này là chuyện khác: kế hoạch
-- của TỪNG BÉ, chia theo góc lĩnh vực, và có một người duyệt.
--
-- Hai cái đứng cạnh nhau được vì chúng trả lời hai câu khác nhau: "tháng này
-- lớp làm gì" và "tháng này cô định làm gì cùng bé này". Đường dẫn, mã phân
-- hệ và tên hiển thị đều tách hẳn để không ai nhầm hai ô trên màn hình.
--
-- HAI BẢNG, VÌ MỘT BÉ MỘT THÁNG CÓ NHIỀU MỤC
--
--   kehoachbe_ke  — một bé, một tháng, một bản. Giữ trạng thái duyệt.
--   kehoachbe_muc — từng mục theo góc lĩnh vực, và kết quả nhìn lại cuối tháng.
--
-- BA GIÁ TRỊ CỦA VIỆC DUYỆT, KHÔNG PHẢI HAI
--
-- 'nhap' (cô còn đang soạn) · 'cho-duyet' (đã gửi, quản lý chưa xem) ·
-- 'da-duyet' · 'tra-lai' (quản lý đã xem và gửi lại kèm ý kiến). Gộp "chưa ai
-- xem" với "đã xem và không đồng ý" vào một giá trị là cô không biết mình đang
-- chờ hay đang phải sửa.
CREATE TABLE IF NOT EXISTS kehoachbe_ke (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL,
  classId    TEXT NOT NULL,           -- chụp lại lúc lập, không suy ra lúc đọc
  thang      TEXT NOT NULL,           -- YYYY-MM
  trangThai  TEXT NOT NULL DEFAULT 'nhap',
  coLap      TEXT,
  lapLuc     TEXT,
  guiLuc     TEXT,
  nguoiDuyet TEXT,
  duyetLuc   TEXT,
  yKienDuyet TEXT NOT NULL DEFAULT '',
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS kehoachbe_mot_be_mot_thang ON kehoachbe_ke(studentId, thang);
CREATE INDEX IF NOT EXISTS kehoachbe_ke_theo_nhom ON kehoachbe_ke(classId, thang);

-- CUỐI THÁNG NHÌN LẠI, KHÔNG PHẢI CUỐI THÁNG CHẤM ĐIỂM.
--
-- Nhà trường mô tả bước cuối tháng bằng một cặp từ đúng/sai rồi ôn tiếp. Vế
-- "ôn tiếp" giữ nguyên tinh thần, vế đúng/sai thì không: `ketQua` dùng ĐÚNG
-- NĂM TRẠNG THÁI của phân hệ Hành trình học tập (chua-day · chua-quan-sat-thay
-- · dang-hinh-thanh · da-vung · vuot-troi), và không có giá trị nào là một
-- trong cặp từ kia.
--
-- "Ôn tiếp" thành cột `tiepTucThangSau` — một ô tích trung tính, và cũng chính
-- là việc-làm-tiếp mà QUY TẮC 5 đòi hỏi: nhìn lại xong thì có một hành động cụ
-- thể cho tháng sau, chứ không dừng ở một lời nhận xét.
CREATE TABLE IF NOT EXISTS kehoachbe_muc (
  id              TEXT PRIMARY KEY,
  keId            TEXT NOT NULL,
  gocLinhVuc      TEXT NOT NULL,
  noiDung         TEXT NOT NULL,
  ketQua          TEXT NOT NULL DEFAULT '',
  nhanXet         TEXT NOT NULL DEFAULT '',
  tiepTucThangSau INTEGER NOT NULL DEFAULT 0,
  capNhatLuc      TEXT
);
CREATE INDEX IF NOT EXISTS kehoachbe_muc_theo_ke ON kehoachbe_muc(keId);
