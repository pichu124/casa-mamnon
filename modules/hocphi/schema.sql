-- Bảng riêng của phân hệ Học phí. Chỉ phân hệ này đụng tới, nên thêm hay gỡ
-- phân hệ đều không ảnh hưởng dữ liệu của phần còn lại.
CREATE TABLE IF NOT EXISTS hocphi_khoan (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kyThu     TEXT NOT NULL,          -- ví dụ "Tháng 9/2026"
  noiDung   TEXT NOT NULL,
  soTien    INTEGER NOT NULL,
  hanNop    TEXT,
  daNop     INTEGER NOT NULL DEFAULT 0,
  ngayNop   TEXT,
  ghiChu    TEXT DEFAULT '',
  taoBoi    TEXT,
  taoLuc    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hocphi_student ON hocphi_khoan(studentId, kyThu);

-- KHOẢN THU ĐÃ THU HỒI — thu hồi là NGƯNG DÙNG, không phải xoá.
--
-- Khoản tạo nhầm (sai bé, sai số tiền, sai kỳ) trước đây là vĩnh viễn: phân
-- hệ không có đường sửa hay huỷ nào cho tiền. Nay văn phòng thu hồi được, và
-- theo đúng nếp của cả app (lib/sua-thu-hoi.js): dòng gốc GIỮ NGUYÊN trong
-- hocphi_khoan làm chứng từ, bảng này chỉ ghi "khoản nào đã thu hồi, ai, lúc
-- nào, vì sao" — mọi danh sách lọc qua nó.
CREATE TABLE IF NOT EXISTS hocphi_thuhoi (
  khoanId   TEXT PRIMARY KEY REFERENCES hocphi_khoan(id) ON DELETE CASCADE,
  lyDo      TEXT NOT NULL DEFAULT '',
  boiUserId TEXT,
  luc       TEXT NOT NULL
);

-- MỘT ĐỢT GHI SỔ CHO CẢ NHÓM HOẶC CẢ CƠ SỞ (Đ163).
--
-- Nhà trường 07/09: *"tạo phí tách theo cơ sở / lớp / trẻ cho dễ nhìn"*. Trước
-- đợt này mỗi khoản thu phải gõ cho TỪNG BÉ một lần — trường ba cơ sở, mấy
-- trăm bé, thì "tiền ăn tháng 9" là mấy trăm lượt gõ tay giống hệt nhau, và
-- mỗi lượt là một cơ hội gõ nhầm số tiền cho đúng một nhà.
--
-- Bảng này KHÔNG phải nguồn sự thật của tiền: tiền vẫn nằm trọn trong
-- `hocphi_khoan`, mỗi bé một dòng y như cũ, nên mọi đường đọc đã có không đổi
-- một chữ. Nó chỉ ghi lại "đợt ghi sổ nào đã tạo ra những dòng nào" — thứ mà
-- trước đây không có chỗ nào chứa, nên một đợt ghi nhầm cho cả nhóm là phải
-- đi thu hồi từng dòng một mà không có cách nào biết chắc đã hết chưa.
CREATE TABLE IF NOT EXISTS hocphi_dot (
  id        TEXT PRIMARY KEY,
  pham      TEXT NOT NULL,          -- 'nhom' | 'coso' | 'truong'
  phamId    TEXT DEFAULT '',        -- mã nhóm / mã cơ sở; rỗng khi cả trường
  phamTen   TEXT NOT NULL DEFAULT '',
  kyThu     TEXT NOT NULL,
  noiDung   TEXT NOT NULL,
  soTien    INTEGER NOT NULL,
  soBe      INTEGER NOT NULL DEFAULT 0,
  boQua     INTEGER NOT NULL DEFAULT 0,
  taoBoi    TEXT,
  taoLuc    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hocphi_dot_luc ON hocphi_dot(taoLuc);

-- Dòng nào thuộc đợt nào. Bảng nối chứ không phải cột thêm vào
-- `hocphi_khoan`: lược đồ của phân hệ chỉ được CREATE ... IF NOT EXISTS, mọi
-- câu ALTER đều bị chặn trước khi chạy (lib/modules.js) — và đó là luật đúng,
-- vì một cột thêm vào bảng tiền là thứ không rút lại được.
CREATE TABLE IF NOT EXISTS hocphi_dot_khoan (
  khoanId TEXT PRIMARY KEY REFERENCES hocphi_khoan(id) ON DELETE CASCADE,
  dotId   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hocphi_dot_khoan_dot ON hocphi_dot_khoan(dotId);
