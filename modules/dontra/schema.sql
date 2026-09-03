-- ĐÓN TRẢ BÉ — ai được đón, và bé đã được trả cho ai.
--
-- Đây là phân hệ AN TOÀN, không phải phân hệ tiện lợi. Sai ở đây là trao một
-- đứa trẻ cho người không được phép. Nên mọi thứ dưới đây nghiêng về phía
-- CHẶT: không xoá, chép lại tên tại thời điểm trả, và ghi rõ ai làm việc gì.
--
-- BA BẢNG, BA VIỆC KHÁC NHAU
--
--   dontra_nguoi   — người được đón THƯỜNG XUYÊN (bố, mẹ, ông bà, cô giúp
--                    việc). Do GIA ĐÌNH khai, không phải cô.
--   dontra_uyquyen — uỷ quyền MỘT LẦN, có khoảng ngày. "Hôm nay bác hàng xóm
--                    đón hộ" — thứ sổ giấy làm rất kém vì nó là một mẩu giấy
--                    rời không ai đối chiếu được.
--   dontra_ghi     — sổ ghi bé đã được trả cho ai, lúc mấy giờ, cô nào trả.

-- KHÔNG XOÁ, CHỈ NGƯNG DÙNG (`dangDung = 0`).
--
-- Ông đã mất, cô giúp việc đã nghỉ — gỡ khỏi danh sách là đúng, nhưng xoá hẳn
-- thì những lần đón trước đó trong sổ mất chỗ đối chiếu. Cùng luật "bỏ một
-- tính năng là ngưng dùng, không phải xoá dữ liệu" của CLAUDE.md.
CREATE TABLE IF NOT EXISTS dontra_nguoi (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL,
  hoTen      TEXT NOT NULL,
  quanHe     TEXT NOT NULL DEFAULT '',
  dienThoai  TEXT NOT NULL DEFAULT '',
  anh        TEXT NOT NULL DEFAULT '',
  ghiChu     TEXT NOT NULL DEFAULT '',
  dangDung   INTEGER NOT NULL DEFAULT 1,
  nguoiTao   TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS dontra_nguoi_theo_be ON dontra_nguoi(studentId);
-- Tra "ảnh này của ai" theo tên tệp — chạy mỗi lần mở một ảnh người đón,
-- đúng giờ cao điểm trả bé. Không có chỉ mục là quét cả bảng mỗi tấm.
CREATE INDEX IF NOT EXISTS dontra_nguoi_theo_anh ON dontra_nguoi(anh);

-- Uỷ quyền một lần. HUỶ chứ không xoá, cùng lý do trên: cô cần thấy được
-- "có uỷ quyền nhưng đã bị gia đình huỷ", không phải một khoảng trống.
CREATE TABLE IF NOT EXISTS dontra_uyquyen (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  hoTen     TEXT NOT NULL,
  quanHe    TEXT NOT NULL DEFAULT '',
  dienThoai TEXT NOT NULL DEFAULT '',
  anh       TEXT NOT NULL DEFAULT '',
  tuNgay    TEXT NOT NULL,
  denNgay   TEXT NOT NULL,
  lyDo      TEXT NOT NULL DEFAULT '',
  huyLuc    TEXT,
  huyBoi    TEXT,
  nguoiTao  TEXT,
  taoLuc    TEXT
);
CREATE INDEX IF NOT EXISTS dontra_uyquyen_theo_be ON dontra_uyquyen(studentId, tuNgay);
-- Cùng lý do với dontra_nguoi_theo_anh: đường ảnh tra cả hai bảng theo tệp.
CREATE INDEX IF NOT EXISTS dontra_uyquyen_theo_anh ON dontra_uyquyen(anh);

-- SỔ TRẢ BÉ.
--
-- `nguoiDon` chép lại TÊN tại đúng lúc trả, không chỉ giữ khoá tới bảng kia.
-- Sang năm cô giúp việc nghỉ và gia đình gỡ tên khỏi danh sách, thì sổ tháng
-- Chín vẫn phải nói đúng hôm đó ai đón bé — chứ không hiện một dòng trống.
--
-- Một bé một ngày một bản ghi: trả rồi mà ghi lại thì ĐÈ, không sinh dòng thứ
-- hai để rồi không biết dòng nào là thật.
CREATE TABLE IF NOT EXISTS dontra_ghi (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL,
  ngay       TEXT NOT NULL,
  luc        TEXT NOT NULL DEFAULT '',
  nguoiDon   TEXT NOT NULL,
  nguonLoai  TEXT NOT NULL DEFAULT '',
  nguonId    TEXT NOT NULL DEFAULT '',
  ghiChu     TEXT NOT NULL DEFAULT '',
  coGhi      TEXT,
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS dontra_mot_be_mot_ngay ON dontra_ghi(studentId, ngay);
CREATE INDEX IF NOT EXISTS dontra_ghi_theo_ngay ON dontra_ghi(ngay);

-- ===== Ảnh lúc trả bé (Đ125) =====
-- Cô chụp một khung hình lúc trao bé cho người đón, gửi gia đình — cùng ý với
-- ảnh "con đã tới lớp" của Điểm danh. Mỗi bé mỗi ngày MỘT tấm. Chụp lại là
-- THAY tấm cũ (tệp cũ được bỏ đi), không chất đống. Gỡ ảnh cũng là một lần
-- thay — thay bằng trống: dòng ở lại làm vết, tệp ảnh thì không còn. Chỉ gia
-- đình của chính bé, cô của nhóm và văn phòng xem được — ảnh đi qua
-- /api/dontra/anh/:file có canh quyền, không phục vụ tĩnh.
-- (Chú thích trong tệp này cố ý không dùng dấu chấm phẩy: bài canh tách câu
-- lệnh theo dấu đó.)
CREATE TABLE IF NOT EXISTS dontra_anh_tra (
  studentId TEXT NOT NULL,
  ngay      TEXT NOT NULL,              -- YYYY-MM-DD
  file      TEXT NOT NULL,
  taoLuc    TEXT,
  byUserId  TEXT,
  PRIMARY KEY (studentId, ngay)
);
CREATE INDEX IF NOT EXISTS dontra_anh_tra_theo_file ON dontra_anh_tra(file);
