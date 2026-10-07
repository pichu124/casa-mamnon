-- BÁO CÁO HỌC TẬP — bảng riêng của phân hệ, mọi tên bắt đầu bằng `baocaohoctap_`.
--
-- VÌ SAO MẪU BÁO CÁO NẰM TRONG CƠ SỞ DỮ LIỆU CHỨ KHÔNG GHI CỨNG TRONG MÃ
--
-- Nhà trường gửi bảy tệp mẫu, và bảy tệp ấy đã khác nhau ngay trong cùng một
-- năm: báo cáo tháng lứa 0–3 có bốn lĩnh vực nhận thức, lứa 3–6 có sáu (thêm
-- Tiếng Anh và Văn hoá); báo cáo học kỳ 5–6 có mười một nhóm tiêu chí, lứa
-- 0–3 có sáu. Danh sách tiêu chí là thứ nhà trường sẽ còn sửa mỗi năm học,
-- theo chương trình của chính họ chứ không theo lịch phát hành app.
--
-- Ghi cứng trong mã thì mỗi lần trường thêm một dòng tiêu chí là một lần phải
-- nhờ người viết mã, chờ một bản cập nhật, và cập nhật ấy lại phải qua cả bộ
-- kiểm thử. Trường sẽ quay về Word từ lần thứ hai.

-- MỘT MẪU BÁO CÁO.
--
-- `tuThang`/`denThang` là lứa tuổi tính bằng THÁNG, không phải bằng tuổi. Đây
-- là quy định của CLAUDE.md và ở đây nó có ích thật: trường nhận bé từ 12
-- tháng, và ranh giới giữa hai mẫu báo cáo tháng của nhà trường rơi đúng vào
-- mốc 36 tháng — "0–3" và "3–6" trong tên mẫu là nói tắt của 0–36 và 36–72
-- tháng, không phải hai con số tuổi tròn.
CREATE TABLE IF NOT EXISTS baocaohoctap_mau (
  id         TEXT PRIMARY KEY,
  loai       TEXT NOT NULL,               -- thang | hocky | cambridge
  ten        TEXT NOT NULL,
  tuThang    INTEGER NOT NULL DEFAULT 0,
  denThang   INTEGER NOT NULL DEFAULT 72,
  active     INTEGER NOT NULL DEFAULT 1,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS baocaohoctap_mau_theo_loai ON baocaohoctap_mau(loai, active, tuThang);

-- MỘT DÒNG TRONG MẪU.
--
-- `kieu` quyết định cô nhập gì:
--   'chu' — một ô chữ tự do. Đây là kiểu của báo cáo tháng: cô kể lại điều đã
--           thấy, không chọn mức nào cả. Đúng QUY TẮC 1 (quan sát ≠ đánh giá).
--   'muc' — một trong năm trạng thái của phân hệ Hành trình học tập. Đây là
--           kiểu của báo cáo học kỳ và báo cáo thể chất.
--
-- `gocLinhVuc` là sợi dây nối sang phân hệ Kế hoạch của bé: dòng nào khai góc
-- lĩnh vực thì màn soạn báo cáo tháng mời được nhận xét cuối tháng cô đã ghi ở
-- kế hoạch. MỜI, không tự điền — xem `routes.js`.
CREATE TABLE IF NOT EXISTS baocaohoctap_dong (
  id         TEXT PRIMARY KEY,
  mauId      TEXT NOT NULL,
  nhom       TEXT NOT NULL DEFAULT '',    -- mục lớn, ví dụ "I. KỸ NĂNG TỰ PHỤC VỤ"
  nhomEn     TEXT NOT NULL DEFAULT '',
  tieuDe     TEXT NOT NULL,
  tieuDeEn   TEXT NOT NULL DEFAULT '',
  kieu       TEXT NOT NULL DEFAULT 'chu', -- chu | muc
  gocLinhVuc TEXT NOT NULL DEFAULT '',
  thuTu      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS baocaohoctap_dong_theo_mau ON baocaohoctap_dong(mauId, thuTu);

-- MỘT BẢN BÁO CÁO CỦA MỘT BÉ.
--
-- `classId` và `campusId` được CHỤP LẠI lúc mở bản, không suy ra lúc đọc. Bé
-- chuyển nhóm hoặc chuyển cơ sở giữa năm là chuyện có thật ở trường ba cơ sở;
-- một bản báo cáo tháng 9 phải mãi mãi nói đúng nhóm và cơ sở của tháng 9.
--
-- `trangThai`: 'nhap' là nháp của cô, gia đình KHÔNG thấy. 'da-gui' là cô đã
-- chủ động công bố. Không có trạng thái nào ở giữa và không có đường nào để
-- một bản tự chuyển sang 'da-gui' — QUY TẮC 3.
CREATE TABLE IF NOT EXISTS baocaohoctap_ban (
  id         TEXT PRIMARY KEY,
  mauId      TEXT NOT NULL,
  studentId  TEXT NOT NULL,
  classId    TEXT NOT NULL,
  campusId   TEXT NOT NULL DEFAULT '',
  tuNgay     TEXT NOT NULL,               -- YYYY-MM-DD
  denNgay    TEXT NOT NULL,
  trangThai  TEXT NOT NULL DEFAULT 'nhap',
  tongHop    TEXT NOT NULL DEFAULT '',
  oLopLamGi  TEXT NOT NULL DEFAULT '',
  oNhaChoiGi TEXT NOT NULL DEFAULT '',
  coKy       TEXT NOT NULL DEFAULT '',
  soanBoi    TEXT,
  guiLuc     TEXT,
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS baocaohoctap_mot_be_mot_ky
  ON baocaohoctap_ban(studentId, mauId, tuNgay, denNgay);
CREATE INDEX IF NOT EXISTS baocaohoctap_ban_theo_nhom ON baocaohoctap_ban(classId, denNgay DESC);
CREATE INDEX IF NOT EXISTS baocaohoctap_ban_theo_be ON baocaohoctap_ban(studentId, denNgay DESC);

-- MỘT Ô ĐÃ ĐIỀN.
--
-- Một dòng bỏ trống thì KHÔNG có bản ghi ở đây. Không có ô rỗng nào được sinh
-- sẵn để chờ lấp: QUY TẮC 2 cấm trình bày chỗ chưa có gì như một khoảng trống
-- cần lấp, và cách chắc chắn nhất là đừng tạo ra khoảng trống ấy trong dữ liệu.
CREATE TABLE IF NOT EXISTS baocaohoctap_o (
  id         TEXT PRIMARY KEY,
  banId      TEXT NOT NULL,
  dongId     TEXT NOT NULL,
  chu        TEXT NOT NULL DEFAULT '',
  muc        TEXT NOT NULL DEFAULT '',
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS baocaohoctap_mot_o_mot_dong ON baocaohoctap_o(banId, dongId);

-- ĐỢT 2 (phản hồi nhà trường 07/09) — hai BẢNG PHỤ, bảng cũ không đổi cột.
--
-- QUY TRÌNH DUYỆT TRƯỚC KHI TỚI TAY GIA ĐÌNH.
--
-- `baocaohoctap_ban.trangThai` vẫn hai giá trị như cũ: 'nhap' (trong tay cô)
-- và 'da-gui' (cô đã gửi đi). Nhưng "gửi đi" nay là gửi cho QUẢN LÝ CƠ SỞ
-- duyệt, không phải gửi thẳng cho gia đình. Bảng này giữ phần còn lại:
--   • 'cho-duyet' — cô đã gửi, quản lý chưa xem.
--   • 'da-duyet'  — quản lý đồng ý và chọn `ngayCongBo`. Gia đình CHỈ thấy
--                   khi tới ngày ấy (so với lib/ngay.homNay()).
--   • 'tu-choi'   — quản lý trả lại kèm `yKien`; bản về 'nhap' cho cô sửa.
-- `daBaoLuc`: đã báo cho gia đình chưa — một bản chỉ báo đúng một lần.
CREATE TABLE IF NOT EXISTS baocaohoctap_duyet (
  banId      TEXT PRIMARY KEY,
  trangThai  TEXT NOT NULL DEFAULT 'cho-duyet',
  nguoiGui   TEXT,
  guiLuc     TEXT,
  nguoiDuyet TEXT,
  duyetLuc   TEXT,
  yKien      TEXT NOT NULL DEFAULT '',
  ngayCongBo TEXT NOT NULL DEFAULT '',   -- YYYY-MM-DD
  daBaoLuc   TEXT
);

-- KHOÁ Ô THEO CÔ. Nhiều cô một nhóm: ô do cô A ghi lần đầu thì cô B không
-- sửa hay xoá được; quản lý cơ sở mở khoá (`moKhoaBoi`, `moKhoaLuc`) thì ô
-- lại mở cho mọi người, và người ghi tiếp theo nhận khoá.
--
-- Ô máy điền sẵn từ Kế hoạch của bé KHÔNG có dòng ở đây: chưa cô nào ghi cả.
CREATE TABLE IF NOT EXISTS baocaohoctap_o_khoa (
  oId       TEXT PRIMARY KEY,
  coGhi     TEXT NOT NULL,
  khoaLuc   TEXT,
  moKhoaBoi TEXT,
  moKhoaLuc TEXT
);
