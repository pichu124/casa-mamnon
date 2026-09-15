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
-- Hai truy vấn chạy thường xuyên chưa có chỉ mục đỡ:
--   • tra "ảnh này của quan sát nào" mỗi lần một gia đình mở một tấm ảnh
--     (WHERE anh = ?);
--   • gom các ghi nhanh đã dùng trong ngày (WHERE ngay = ? đọc ghiNhanhId).
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_theo_anh ON hanhtrinh_quansat(anh);
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_theo_ngay ON hanhtrinh_quansat(ngay);

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

-- ẢNH CỦA CÂU CHUYỆN ĐÃ VỀ ALBUM NÀO (Đ144).
--
-- Nhà trường 07/09: "ảnh học tập riêng biệt của con → cần tag album và bé →
-- lưu ảnh toàn bộ về album". Khi cô kể câu chuyện cho gia đình, cô chọn một
-- album của nhóm; ảnh của quan sát được CHÉP sang album đó thành một tấm có
-- gắn thẻ bé. Bảng này nhớ tấm nào đã chép để công bố lại không chép đôi.
-- Không có dòng = chưa về album nào.
CREATE TABLE IF NOT EXISTS hanhtrinh_album (
  quanSatId  TEXT PRIMARY KEY,
  albumId    TEXT NOT NULL,
  photoId    TEXT NOT NULL,
  ghiLuc     TEXT
);
CREATE INDEX IF NOT EXISTS hanhtrinh_album_theo_album ON hanhtrinh_album(albumId);

-- QUAN SÁT NÀY THUỘC CHƯƠNG TRÌNH NÀO (Đ195, việc 24).
--
-- Nhà trường (Câu 11): ba nhóm cô — cô phụ trách nhóm (Montessori), cô nước
-- ngoài (Cambridge), cô thể chất (Thể chất chuyên sâu) — "3 vị trí này sẽ giúp
-- lên kế hoạch và đánh giá -> báo cáo học tập cho từng trẻ". Sổ quan sát của
-- một bé vì thế chia ba tab theo ba nhóm ấy.
--
-- VÌ SAO GHI LẠI CHỨ KHÔNG SUY RA LÚC ĐỌC
--
-- Suy ra lúc đọc thì chỉ cần một dòng `nhomCua(classId, coGhi)`, không cần
-- bảng nào. Nhưng nhóm của cô là thuộc tính của một LƯỢT PHÂN CÔNG, và nó đổi
-- được: trường khai lại vai của một cô là TOÀN BỘ quan sát cũ của cô nhảy sang
-- tab khác, kể cả những quan sát cô ghi từ năm ngoái khi cô đang giữ vai kia.
-- Tệ hơn: `donTheoDanhSachCo` xoá dòng khai vai khi cô rời nhóm, nên quan sát
-- của cô nước ngoài đã nghỉ việc lặng lẽ rơi về tab Montessori.
--
-- Lịch sử học tập của một đứa trẻ không được đổi vì một thao tác hành chính
-- xảy ra sau đó. Nên ghi lại NGAY LÚC GHI, và lúc đọc chỉ tra bảng này.
--
-- KHÔNG CÓ DÒNG = QUAN SÁT CŨ, ghi trước khi bảng này ra đời. Lúc ấy mới suy
-- ra từ vai hiện thời, rồi cuối cùng mới về mặc định. Nhờ vậy ngày bảng này
-- ra đời không một quan sát nào biến mất khỏi màn hình.
CREATE TABLE IF NOT EXISTS hanhtrinh_quansat_nhom (
  quanSatId TEXT PRIMARY KEY,
  nhom      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_nhom_theo_nhom ON hanhtrinh_quansat_nhom(nhom);
