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
