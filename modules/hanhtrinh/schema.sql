-- HÀNH TRÌNH HỌC TẬP — phần hồn của CASA.
--
-- BA LỚP DỮ LIỆU NẰM TRONG MỘT BẢN GHI, KHÔNG PHẢI BA BẢNG
--
-- CLAUDE.md gọi đúng tên: "ba lớp dữ liệu của MỘT quan sát". Cùng một khoảnh
-- khắc của đứa trẻ, kể lại ở ba mức độ khác nhau cho ba người đọc khác nhau:
--
--   Lớp 1 — ghi chú thô của cô     → CHỈ cô đã ghi (+ quản trị khi cần)
--   Lớp 2 — nhận định chuyên môn   → cô trong nhóm, quản lý cơ sở
--   Lớp 3 — câu chuyện cho gia đình → phụ huynh của CHÍNH bé đó, và chỉ khi cô
--                                      chủ động công bố
--
-- Tách thành ba bảng thì mỗi lần đọc phải ghép ba nơi, và chỗ ghép chính là chỗ
-- rò rỉ: quên một điều kiện WHERE là nháp dở dang của cô hiện thẳng ra cho phụ
-- huynh. Một bảng, một hàm lọc theo người xem, một chỗ để canh.
--
-- NĂM TRẠNG THÁI, LƯU BẰNG NHÃN CHỮ
--
-- 'chua-day' · 'chua-quan-sat-thay' · 'dang-hinh-thanh' · 'da-vung' · 'vuot-troi'
--
-- Cố ý KHÔNG phải số 1–5. Để là số thì sớm muộn có người cộng lại, chia trung
-- bình, rồi sắp các bé trên dưới nhau — đúng thứ QUY TẮC 4 cấm. Và cột này
-- KHÔNG BAO GIỜ được đem cộng dồn hay quy ra phần trăm.
--
-- Ô TRỐNG LÀ CHUYỆN BÌNH THƯỜNG
--
-- Cô ghi lớp 1 lúc 9 giờ sáng giữa lớp, lớp 2 lúc cuối ngày, lớp 3 có thể không
-- bao giờ. Nên mọi cột của lớp 2 và lớp 3 đều có mặc định rỗng, và một bản ghi
-- chỉ có lớp 1 là một bản ghi hoàn chỉnh — không phải một bản ghi dở dang.
CREATE TABLE IF NOT EXISTS hanhtrinh_quansat (
  id           TEXT PRIMARY KEY,
  studentId    TEXT NOT NULL,
  ngay         TEXT NOT NULL,

  -- ===== LỚP 1 =====
  moTa         TEXT NOT NULL DEFAULT '',
  anh          TEXT NOT NULL DEFAULT '',
  ghiNhanhId   TEXT NOT NULL DEFAULT '',   -- khoá mềm sang phân hệ Ghi nhanh

  -- ===== LỚP 2 =====
  linhVuc      TEXT NOT NULL DEFAULT '',
  trangThai    TEXT NOT NULL DEFAULT '',
  minhChung    TEXT NOT NULL DEFAULT '',
  oLopLamGi    TEXT NOT NULL DEFAULT '',   -- QUY TẮC 5, phía lớp học
  suyNgamLuc   TEXT,
  giaySuyNgam  REAL,                        -- đo chỉ tiêu "suy ngẫm <= 3 phút"

  -- ===== LỚP 3 =====
  cauChuyen    TEXT NOT NULL DEFAULT '',
  cungConONha  TEXT NOT NULL DEFAULT '',   -- QUY TẮC 5, phía gia đình
  congBoLuc    TEXT,                        -- rỗng = còn là nháp của cô

  coGhi        TEXT NOT NULL,
  taoLuc       TEXT NOT NULL,
  capNhatLuc   TEXT
);
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_theo_be ON hanhtrinh_quansat(studentId, ngay DESC);
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_theo_co ON hanhtrinh_quansat(coGhi, ngay DESC);

-- CHỦ ĐỀ TUẦN của một nhóm.
--
-- Bài học B9 của app 1: màn hình nào hiển thị dữ liệu thì phải có người tạo
-- được dữ liệu đó qua giao diện. Chủ đề tuần hiện trên màn của gia đình, nên
-- cô phải soạn được nó ngay trong app, kèm nút chép tuần trước.
--
-- `tuan` lưu bằng NGÀY THỨ HAI của tuần đó (YYYY-MM-DD): so sánh và sắp xếp
-- được bằng chuỗi, không phải nhớ quy ước đánh số tuần của nước nào.
CREATE TABLE IF NOT EXISTS hanhtrinh_chude (
  id          TEXT PRIMARY KEY,
  classId     TEXT NOT NULL,
  tuan        TEXT NOT NULL,
  chuDe       TEXT NOT NULL,
  moTa        TEXT NOT NULL DEFAULT '',
  cungConONha TEXT NOT NULL DEFAULT '',
  coGhi       TEXT,
  taoLuc      TEXT,
  capNhatLuc  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS hanhtrinh_chude_mot_nhom_mot_tuan ON hanhtrinh_chude(classId, tuan);
