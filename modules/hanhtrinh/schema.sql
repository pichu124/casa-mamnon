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

-- ===========================================================================
-- KHỐI KẾ HOẠCH CHUNG TUẦN — phần THÊM của chủ đề tuần (Đ201, việc 44)
-- ===========================================================================
--
-- Nhà trường muốn ở đầu Lịch sinh hoạt có một khối *"kế hoạch chung tuần này"*
-- gồm: chủ đề, **bài hát**, **Casa talkshow**, **lời nhắc gia đình**, **đường
-- dẫn video** và **tệp đính kèm** (PDF/Word).
--
-- VÌ SAO LÀ BẢNG PHỤ CHỨ KHÔNG THÊM CỘT VÀO `hanhtrinh_chude`.
--
-- Không phải vì sạch sẽ. Vì `CREATE TABLE IF NOT EXISTS` **không thêm được cột
-- vào một bảng đã tồn tại**: khai thêm cột vào câu lệnh cũ là một dòng SQL
-- KHÔNG BAO GIỜ CHẠY trên cơ sở dữ liệu đã có của trường, và mọi câu đọc cột
-- ấy sẽ hỏng ngay lượt đọc đầu tiên — im lặng trên máy người viết (nơi bảng
-- được tạo mới), ồn ào trên máy trường. Cùng lý do đã ghi ở
-- `hocphi_khoan_loai` (Đ199).
--
-- KHÔNG CÓ DÒNG = TUẦN CHỈ CÓ CHỦ ĐỀ, và đó là trạng thái đúng của mọi tuần cô
-- đã soạn trước đợt này. Màn hình phải hiện tuần ấy y như hôm qua, không phải
-- hiện năm ô trống kèm cảm giác "cô soạn thiếu".
CREATE TABLE IF NOT EXISTS hanhtrinh_chude_them (
  id           TEXT PRIMARY KEY,
  classId      TEXT NOT NULL,
  tuan         TEXT NOT NULL,          -- thứ Hai của tuần, YYYY-MM-DD
  baiHat       TEXT NOT NULL DEFAULT '',
  linkBaiHat   TEXT NOT NULL DEFAULT '',
  talkshow     TEXT NOT NULL DEFAULT '',
  linkTalkshow TEXT NOT NULL DEFAULT '',
  nhacGiaDinh  TEXT NOT NULL DEFAULT '',
  coGhi        TEXT,
  taoLuc       TEXT,
  capNhatLuc   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS hanhtrinh_chude_them_mot_tuan
  ON hanhtrinh_chude_them(classId, tuan);

-- TỆP ĐÍNH KÈM CỦA MỘT TUẦN (PDF, Word, hoặc ảnh chụp tờ kế hoạch).
--
-- Cùng khuôn với `menu_tep` (Đ160): tên tệp thật nằm trong kho `uploads/`
-- ngoài kho mã, bảng chỉ giữ cái tên và ai tải lên; đường tải **đi qua canh
-- quyền** chứ không phục vụ tĩnh. Đây là tệp của một nhóm lớp cụ thể, nên
-- người đọc phải qua `db.canAccessClass` — gia đình nhóm khác không mở được
-- kể cả khi đoán trúng mã tệp.
CREATE TABLE IF NOT EXISTS hanhtrinh_chude_tep (
  id       TEXT PRIMARY KEY,
  classId  TEXT NOT NULL,
  tuan     TEXT NOT NULL,
  file     TEXT NOT NULL,              -- tên tệp trong kho uploads
  tenGoc   TEXT NOT NULL DEFAULT '',   -- tên người tải lên nhìn thấy
  bytes    INTEGER,
  loai     TEXT NOT NULL DEFAULT '',   -- pdf | docx | anh
  nguoiTai TEXT,
  taoLuc   TEXT
);
CREATE INDEX IF NOT EXISTS hanhtrinh_chude_tep_theo_tuan
  ON hanhtrinh_chude_tep(classId, tuan);

-- GHI NHÁP CHƯA GẮN BÉ (góp ý 06/10, mục 7): *"Thêm nút + … để ghi nhanh lại
-- quan sát của 1 học sinh → sau đó có thể lưu nháp, GV có thời gian sẽ tag tên
-- học sinh, vào chương trình cụ thể để đăng gửi phụ huynh."*
--
-- Cô đang đứng giữa lớp: ghi ngay một dòng (và một tấm ảnh nếu có), chưa kịp
-- chọn bé. Bảng `hanhtrinh_quansat` bắt buộc có bé, nên nháp nằm ở bảng riêng
-- này cho tới khi cô gắn bé + chương trình — lúc đó nó thành một quan sát LỚP 1
-- bình thường và đi tiếp đúng luồng cũ (suy ngẫm → kể cho gia đình).
--
-- Đây là dữ liệu LỚP 1: CHỈ CÔ ĐÃ GHI đọc được. Không lộ sang cô khác, không
-- lộ sang gia đình.
CREATE TABLE IF NOT EXISTS hanhtrinh_nhap (
  id         TEXT PRIMARY KEY,
  coGhi      TEXT NOT NULL,
  moTa       TEXT NOT NULL DEFAULT '',
  anh        TEXT NOT NULL DEFAULT '',
  nhom       TEXT NOT NULL DEFAULT '',   -- chương trình cô định gắn (mã lib/nhom-co.js), có thể để trống
  taoLuc     TEXT NOT NULL,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS hanhtrinh_nhap_theo_co ON hanhtrinh_nhap(coGhi, taoLuc DESC);
CREATE INDEX IF NOT EXISTS hanhtrinh_nhap_theo_anh ON hanhtrinh_nhap(anh);

-- ẢNH / VIDEO CÔ GỬI KÈM CÂU CHUYỆN CHO GIA ĐÌNH (Đ242B — chủ dự án quyết 26/10, B7).
--
-- Ảnh gốc của quan sát (`hanhtrinh_quansat.anh`) là tư liệu LỚP 1 và giữ đúng
-- luật lớp 1: đường /api/hanhtrinh/anh/:file không nới một chữ. Thứ tới được
-- gia đình là một BẢN CHÉP RIÊNG, do cô chủ động tích "gửi kèm" lúc kể — tệp
-- khác, tên khác, mã khác. Thu hồi câu chuyện là gỡ bản chép (cả tệp), ảnh
-- gốc của cô còn nguyên.
--
-- `file` KHÔNG BAO GIỜ ra JSON: màn hình chỉ nhận `id` và mở qua
-- /api/hanhtrinh/ke-tep/:id, nơi có canh quyền và luật đồng ý ảnh nhóm.
--
-- `daXacNhanBe` = 1 khi cô đã trả lời "trong ảnh có những bé nào" (dòng ở
-- `hanhtrinh_ke_tep_be`, luôn có bé chính). = 0 thì app KHÔNG BIẾT trong ảnh
-- có ai — cùng luật với ảnh album chưa gắn thẻ: nhóm có nhà từ chối thì ẩn.
CREATE TABLE IF NOT EXISTS hanhtrinh_ke_tep (
  id          TEXT PRIMARY KEY,
  quanSatId   TEXT NOT NULL,
  file        TEXT NOT NULL,
  loai        TEXT NOT NULL,              -- 'anh' | 'video'
  daXacNhanBe INTEGER NOT NULL DEFAULT 0,
  nguoiKe     TEXT NOT NULL,
  keLuc       TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS hanhtrinh_ke_tep_theo_qs ON hanhtrinh_ke_tep(quanSatId);
CREATE TABLE IF NOT EXISTS hanhtrinh_ke_tep_be (
  tepId     TEXT NOT NULL,
  studentId TEXT NOT NULL,
  PRIMARY KEY (tepId, studentId)
);
CREATE INDEX IF NOT EXISTS hanhtrinh_ke_tep_be_theo_be ON hanhtrinh_ke_tep_be(studentId);

-- GÓC MONTESSORI CỦA MỘT QUAN SÁT (Đ242B). Bảng phụ vì CREATE TABLE IF NOT
-- EXISTS không thêm được cột vào bảng đã có (xem `hanhtrinh_chude_them`).
-- Không có dòng = chưa chọn góc — trạng thái đúng của mọi quan sát cũ.
CREATE TABLE IF NOT EXISTS hanhtrinh_quansat_goc (
  quanSatId TEXT PRIMARY KEY,
  goc       TEXT NOT NULL
);
-- "Hình ảnh ghi nhanh" đọc quan sát chưa kể của một cô.
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_cho_ke ON hanhtrinh_quansat(coGhi, congBoLuc);

-- Đ242B: `GET /cho-ke` tìm Ghi nhanh chưa dùng bằng `NOT IN (SELECT ghiNhanhId …)`;
-- không có chỉ mục thì mỗi lần cô mở Hình ảnh ghi nhanh là quét cả bảng quan
-- sát — chậm dần theo từng năm học.
CREATE INDEX IF NOT EXISTS hanhtrinh_quansat_theo_ghinhanh ON hanhtrinh_quansat(ghiNhanhId);
