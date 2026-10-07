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

-- ĐỢT 2 (phản hồi nhà trường 07/09): "Từ những tên bài học có sẵn GV sẽ tích
-- chọn trong tháng đó HS sẽ được học những bài nào, cần ôn tập thêm hay mở
-- rộng thêm."
--
-- Ba bảng mới, KHÔNG đổi cột bảng cũ (`kehoachbe_ke`, `kehoachbe_muc` giữ
-- nguyên — ô chữ tự do vẫn là một cách lập kế hoạch hợp lệ, chỉ không còn là
-- cách duy nhất).
--
-- DANH MỤC BÀI HỌC theo góc lĩnh vực. Văn phòng / quản lý soạn; cô chỉ đọc và
-- tích. Bộ mặc định theo tinh thần Montessori được nạp LƯỜI ở routes.js khi
-- bảng còn trống — không INSERT trong tệp này, vì tệp này chạy mỗi lần khởi
-- động và bộ kiểm tra lược đồ chỉ nhận CREATE.
--
-- `active = 0` là ẨN, không xoá: bài đã tích trong kế hoạch tháng cũ vẫn phải
-- hiện đúng tên.
CREATE TABLE IF NOT EXISTS kehoachbe_baihoc (
  id         TEXT PRIMARY KEY,
  gocLinhVuc TEXT NOT NULL,
  ten        TEXT NOT NULL,
  moTa       TEXT NOT NULL DEFAULT '',
  thuTu      INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  nguoiTao   TEXT,
  taoLuc     TEXT
);
CREATE INDEX IF NOT EXISTS kehoachbe_baihoc_theo_goc ON kehoachbe_baihoc(gocLinhVuc, active, thuTu);

-- BÀI ĐÃ TÍCH cho một kế hoạch. `nhan` là một trong ba chữ của nhà trường:
-- 'hoc-moi' · 'on-tap' · 'mo-rong'.
--
-- NHÌN LẠI CUỐI THÁNG CHO TỪNG BÀI: HAI MỨC, CHỮ TRUNG TÍNH.
-- `ketQua` chỉ nhận 'da-thay' ("Đã thấy con làm được") hoặc 'tiep-tuc'
-- ("Tiếp tục cùng con"). Không có giá trị nào là một trong cặp từ đúng/sai —
-- cùng lý do đã ghi ở bảng `kehoachbe_muc` phía trên (QUY TẮC 2). Bài
-- 'tiep-tuc' tự được gợi ý khi lập kế hoạch tháng sau — đó là việc-làm-tiếp
-- của QUY TẮC 5, không phải một dấu trừ.
CREATE TABLE IF NOT EXISTS kehoachbe_muc_bai (
  id              TEXT PRIMARY KEY,
  keId            TEXT NOT NULL,
  baiHocId        TEXT NOT NULL,
  nhan            TEXT NOT NULL DEFAULT 'hoc-moi',
  ketQua          TEXT NOT NULL DEFAULT '',
  nhanXet         TEXT NOT NULL DEFAULT '',
  tiepTucThangSau INTEGER NOT NULL DEFAULT 0,
  capNhatLuc      TEXT
);
CREATE INDEX IF NOT EXISTS kehoachbe_muc_bai_theo_ke ON kehoachbe_muc_bai(keId);

-- ĐỀ XUẤT SỬA KẾ HOẠCH ĐÃ DUYỆT. Nhà trường: "Khi có điều chỉnh khác lộ trình
-- ban đầu thì có quyền đề xuất sửa, ghi rõ lý do rồi quản lý mới phê duyệt."
--
-- Kế hoạch đã duyệt thì cô không sửa thẳng. Cô gửi một đề xuất (bắt buộc có
-- `lyDo`), quản lý duyệt hoặc từ chối. Duyệt thì kế hoạch MỞ LẠI cho cô sửa
-- (về 'nhap'), và dòng đề xuất này chính là vết ghi vì sao nó được mở lại.
CREATE TABLE IF NOT EXISTS kehoachbe_de_xuat (
  id         TEXT PRIMARY KEY,
  keId       TEXT NOT NULL,
  coDeXuat   TEXT NOT NULL,
  lyDo       TEXT NOT NULL,
  noiDung    TEXT NOT NULL DEFAULT '',   -- mỗi dòng một ý muốn đổi
  trangThai  TEXT NOT NULL DEFAULT 'cho-duyet',  -- cho-duyet | da-duyet | tu-choi
  nguoiDuyet TEXT,
  duyetLuc   TEXT,
  yKien      TEXT NOT NULL DEFAULT '',
  taoLuc     TEXT
);
CREATE INDEX IF NOT EXISTS kehoachbe_de_xuat_theo_ke ON kehoachbe_de_xuat(keId, taoLuc DESC);

-- GÓP Ý 06/10 (mục 6): MỖI CHƯƠNG TRÌNH TỰ LƯU NHÁP VÀ TỰ GỬI DUYỆT.
--
-- Nhà trường: ba tab Montessori & Kỹ năng sống / Cambridge / Thể chất, mỗi tab
-- do một cô khác soạn, và tab nào cũng có "Lưu nháp" và "Gửi quản lý duyệt".
-- Bảng `kehoachbe_ke` chỉ có MỘT trạng thái cho cả bé cả tháng: cô Montessori
-- gửi duyệt là phần Cambridge của cô nước ngoài khoá theo, và ngược lại.
--
-- Bảng phụ này giữ trạng thái RIÊNG từng chương trình (mã của lib/nhom-co.js).
-- Không đổi cột bảng cũ. Kế hoạch chưa có dòng nào ở đây thì đọc như cũ: phần
-- nào có nội dung mang trạng thái của cả bản. `kehoachbe_ke.trangThai` vẫn
-- được giữ đồng bộ (gộp từ ba phần) cho mọi chỗ đang đọc nó.
CREATE TABLE IF NOT EXISTS kehoachbe_ke_ct (
  keId        TEXT NOT NULL,
  chuongTrinh TEXT NOT NULL,          -- chu-nhiem | nuoc-ngoai | the-chat
  trangThai   TEXT NOT NULL DEFAULT 'nhap',
  coLap       TEXT,
  guiLuc      TEXT,
  nguoiDuyet  TEXT,
  duyetLuc    TEXT,
  yKienDuyet  TEXT NOT NULL DEFAULT '',
  capNhatLuc  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS kehoachbe_ke_ct_mot ON kehoachbe_ke_ct(keId, chuongTrinh);
CREATE INDEX IF NOT EXISTS kehoachbe_ke_ct_trang_thai ON kehoachbe_ke_ct(trangThai, guiLuc);

-- KHO BÀI THEO LỨA TUỔI (góp ý 06/10, mục 6): "Được quản lý tách biệt theo độ
-- tuổi (Lứa 3-4 tuổi, Lứa 4-5 tuổi, Lứa 5-6 tuổi)". Một bài dùng được cho nhiều
-- lứa nên là bảng phụ, không phải một cột. Bài KHÔNG có dòng nào ở đây = dùng
-- cho mọi lứa — đúng như mọi bài đang có hôm nay.
CREATE TABLE IF NOT EXISTS kehoachbe_baihoc_lua (
  baiHocId TEXT NOT NULL,
  lua      TEXT NOT NULL              -- 3-4 | 4-5 | 5-6
);
CREATE UNIQUE INDEX IF NOT EXISTS kehoachbe_baihoc_lua_mot ON kehoachbe_baihoc_lua(baiHocId, lua);

-- ĐỀ XUẤT SỬA MỘT CHƯƠNG TRÌNH. Đề xuất cũ (không có dòng ở đây) mở lại cả bản
-- như trước; đề xuất mới chỉ mở lại đúng phần chương trình cô xin sửa.
CREATE TABLE IF NOT EXISTS kehoachbe_de_xuat_ct (
  deXuatId    TEXT NOT NULL,
  chuongTrinh TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS kehoachbe_de_xuat_ct_mot ON kehoachbe_de_xuat_ct(deXuatId);

-- NHÌN LẠI CUỐI THÁNG TỪNG BÀI BẰNG KÝ TỰ QUY ƯỚC (góp ý 06/10, mục 7 — chủ dự
-- án chốt 06/10: giữ NĂM trạng thái trung tính, hiện kèm chữ M/S/W/N/NA).
--
-- `mucDo` là một trong năm mã của Hành trình học tập (chua-day ·
-- chua-quan-sat-thay · dang-hinh-thanh · da-vung · vuot-troi). `tiepTuc` là
-- lựa chọn "Tiếp tục ở tháng sau" của nhà trường: 'hoc-moi' (tháng này bé nghỉ,
-- chưa học — tháng sau DẠY MỚI) hoặc 'on-tap' (tháng sau ÔN TẬP); rỗng là không
-- mang sang. Bảng phụ, khoá theo dòng bài của kế hoạch — không đổi cột
-- `kehoachbe_muc_bai`; cột `ketQua` hai mức cũ vẫn được giữ đồng bộ cho mọi chỗ
-- đang đọc nó (gợi ý tháng sau, báo cáo học tập).
CREATE TABLE IF NOT EXISTS kehoachbe_bai_muc_do (
  mucBaiId   TEXT PRIMARY KEY,
  mucDo      TEXT NOT NULL DEFAULT '',
  tiepTuc    TEXT NOT NULL DEFAULT '',
  nguoiGhi   TEXT,
  capNhatLuc TEXT
);
