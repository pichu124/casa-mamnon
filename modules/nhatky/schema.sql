-- NHẬT KÝ NGÀY — trang sổ giấy mà gia đình đọc mỗi chiều.
--
-- Đây là thứ thay được sổ liên lạc giấy hay không thì cả app thành hay bại ở
-- đó. Sổ giấy hiện tại của trường ghi đúng mấy dòng này: hôm nay con ăn thế
-- nào, ngủ từ mấy giờ tới mấy giờ, đi vệ sinh mấy lần, có gì lạ không.
--
-- MỘT BẢN GHI CHO MỖI BÉ MỖI NGÀY. Chỉ mục duy nhất bên dưới canh điều đó:
-- cô ghi hai lần trong ngày thì lần sau ĐÈ lên lần trước, không sinh ra hai
-- dòng để rồi màn hình phải đoán lấy dòng nào.
--
-- CỘT PHẲNG, KHÔNG NHÉT JSON. Bảng của phân hệ không đi qua JSON_COLS của
-- lib/db.js nên JSON ở đây sẽ về tay người đọc dưới dạng chuỗi thô. Cột phẳng
-- còn đọc được bằng mắt khi mở cơ sở dữ liệu ra dò lỗi.
--
-- BA CỘT CUỐI CHỈ DÙNG CHO NHÓM NHÀ TRẺ. Bé 14 tháng cần ghi thay bỉm và bú
-- bình; bé nhóm Lá thì không, và bắt cô nhóm Lá nhìn ba ô luôn trống mỗi ngày
-- là cách nhanh nhất làm cô bỏ dùng app. Máy chủ quyết định hiện hay không
-- theo NGÀY SINH của từng bé, không theo tên nhóm — nhóm nào cũng có thể có
-- một bé nhỏ tuổi hơn hẳn.
CREATE TABLE IF NOT EXISTS nhatky_ngay (
  id             TEXT PRIMARY KEY,
  studentId      TEXT NOT NULL,
  ngay           TEXT NOT NULL,          -- YYYY-MM-DD
  anSang         TEXT NOT NULL DEFAULT '',
  anTrua         TEXT NOT NULL DEFAULT '',
  anXe           TEXT NOT NULL DEFAULT '',
  anGhiChu       TEXT NOT NULL DEFAULT '',
  nguTuLuc       TEXT NOT NULL DEFAULT '',
  nguDenLuc      TEXT NOT NULL DEFAULT '',
  nguGhiChu      TEXT NOT NULL DEFAULT '',
  veSinhSoLan    INTEGER,
  veSinhTinhChat TEXT NOT NULL DEFAULT '',
  bimSoLan       INTEGER,
  buBinhSoLan    INTEGER,
  buBinhMl       INTEGER,
  ghiChu         TEXT NOT NULL DEFAULT '',
  nguoiGhi       TEXT,
  capNhatLuc     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS nhatky_mot_be_mot_ngay ON nhatky_ngay(studentId, ngay);
CREATE INDEX IF NOT EXISTS nhatky_theo_ngay ON nhatky_ngay(ngay);

-- TỪNG BỮA MỘT — BẢNG PHỤ, KHÔNG ĐỔI CỘT BẢNG TRÊN.
--
-- Nhà trường 07/09: "Bữa nào ăn sẽ cập nhật bữa đó, chứ không phải cuối ngày
-- mới làm một loạt — tách riêng từng bữa theo thực đơn của nhà trường. Hiện tại
-- đang chỉ có bữa trưa." Thực đơn của trường nay có NĂM bữa (sáng, phụ sáng,
-- trưa, phụ chiều, sữa), còn `nhatky_ngay` chỉ có ba cột anSang/anTrua/anXe.
--
-- Bảng đã có thì không đổi cột — quy ước của modules/README.md — nên mỗi bữa
-- là MỘT DÒNG ở đây, khoá theo (bé, ngày, bữa). `bua` là đúng `type` mà màn
-- Thực đơn dùng (breakfast, snack_sang, lunch, snack, milk), để hai màn của
-- cùng một trường nói cùng một tên bữa.
--
-- Ba bữa trùng với ba cột cũ được máy chủ ĐỒNG BỘ NGƯỢC vào `nhatky_ngay`
-- (routes.js, `dongBoCotCu`), nên màn gia đình đời cũ còn trong bộ nhớ điện
-- thoại vẫn đọc đúng — Nguyên tắc số 1.
CREATE TABLE IF NOT EXISTS nhatky_bua (
  id             TEXT PRIMARY KEY,
  studentId      TEXT NOT NULL,
  ngay           TEXT NOT NULL,          -- YYYY-MM-DD
  bua            TEXT NOT NULL,          -- type của thực đơn: breakfast / snack_sang / lunch / snack / milk
  muc            TEXT NOT NULL DEFAULT '',   -- MUC_AN: het / gan-het / nua-suat / it / khong-an; '' = cô chưa ghi
  ghiChu         TEXT NOT NULL DEFAULT '',
  nguoiGhi       TEXT,
  capNhatLuc     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS nhatky_bua_mot_be_mot_bua ON nhatky_bua(studentId, ngay, bua);
CREATE INDEX IF NOT EXISTS nhatky_bua_theo_ngay ON nhatky_bua(ngay);

-- "LƯU LÀ NHÁP, GỬI MỚI THẤY" — góp ý của trường 06/10 (mục 9), chủ dự án chốt.
--
-- Trường: "sau mỗi hành động cập nhật thông tin về ăn, ngủ, vệ sinh, thay bỉm…,
-- giáo viên đều bấm nút gửi tới phụ huynh" và "phải check kỹ làm theo nhóm trước
-- khi gửi cho PH". Nên lưu chỉ là NHÁP của cô; gia đình đọc ẢNH CHỤP của từng
-- phần (ăn uống / nghỉ trưa / vệ sinh) ĐÚNG LÚC CÔ BẤM GỬI. Cô sửa sau khi gửi
-- thì gia đình vẫn đọc bản đã gửi cho tới lần gửi sau — "soát rồi mới gửi" mới
-- có nghĩa.
--
-- `phan = 'cu'`: ngày đã có TRƯỚC mốc đổi luật. Gia đình đọc thẳng dữ liệu như
-- trước — dữ liệu đã có không được biến mất khỏi màn hình của ai (Nguyên tắc số
-- 1, vế 3). `banGui` là JSON chữ thô: bảng của phân hệ không qua JSON_COLS.
CREATE TABLE IF NOT EXISTS nhatky_gui (
  studentId TEXT NOT NULL,
  ngay      TEXT NOT NULL,
  phan      TEXT NOT NULL,              -- an | ngu | vesinh | cu
  banGui    TEXT NOT NULL DEFAULT '',
  guiLuc    TEXT,
  nguoiGui  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS nhatky_gui_mot ON nhatky_gui(studentId, ngay, phan);

-- GIỜ THAY BỈM VÀ GIỜ ĐI VỆ SINH — góp ý 06/10 (mục 9): "ghi lại nhật ký cụ thể
-- THỜI GIAN các con thay bỉm hoặc đi vệ sinh (Poo)". Bảng phụ, không đổi cột
-- `nhatky_ngay` (bài canh giữ đúng 18 cột). Hai ô số lần cũ vẫn còn: ghi thêm
-- một giờ thì số lần cộng một, bỏ một giờ ghi nhầm thì trừ một — số cô đã gõ
-- tay từ trước vẫn được tính, không bị đếm lại từ đầu.
CREATE TABLE IF NOT EXISTS nhatky_vesinh (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  ngay      TEXT NOT NULL,
  luc       TEXT NOT NULL,              -- HH:MM
  loai      TEXT NOT NULL,              -- thay-bim | di-ve-sinh
  coPoo     INTEGER NOT NULL DEFAULT 0,
  tinhChat  TEXT NOT NULL DEFAULT '',
  ghiChu    TEXT NOT NULL DEFAULT '',
  nguoiGhi  TEXT,
  taoLuc    TEXT
);
CREATE INDEX IF NOT EXISTS nhatky_vesinh_be_ngay ON nhatky_vesinh(studentId, ngay);
