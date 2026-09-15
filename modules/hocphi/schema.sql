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

-- ƯU ĐÃI HỌC PHÍ CỦA MỘT BÉ, VÀ HẠN CỦA NÓ (Đ169, ý 4 của trường).
--
-- GẮN VÀO BÉ, KHÔNG GẮN VÀO KHOẢN THU. Một ưu đãi sống lâu hơn một khoản: nó
-- có hạn, trải qua nhiều kỳ thu, và còn nguyên khi khoản thu của tháng này đã
-- nộp xong. Gắn vào khoản thu thì mỗi tháng phải khai lại, và không ai trả lời
-- được câu "nhà này đang được ưu đãi gì".
--
-- MỨC GHI ĐƯỢC CẢ HAI KIỂU. Số tiền ("giảm 500.000đ/tháng") và phần trăm
-- ("giảm 10%") đều có thật ở trường mầm non, và kế toán quen nói kiểu thứ hai.
-- Chủ dự án đã chốt 11/09 là làm cả hai.
--
-- MÁY KHÔNG TỰ TRỪ TIỀN. Bảng này là chỗ THEO DÕI và NHẮC HẠN, không phải một
-- công thức tính tự động: cùng một lập luận đã chốt ở DD-13 (bảng tháng đánh
-- dấu ngày bé vẫn đi học trong đơn hoàn, cố ý không tự trừ). Tự trừ thì một
-- dòng ưu đãi khai sai là sai tiền của một nhà mà không ai đối chiếu ra, và
-- kế toán mất chỗ để nhìn thấy con số trước khi nó thành hoá đơn.
CREATE TABLE IF NOT EXISTS hocphi_uudai (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ten       TEXT NOT NULL,          -- "Ưu đãi anh chị em ruột", "Con cán bộ"…
  kieu      TEXT NOT NULL,          -- 'so-tien' | 'phan-tram'
  giaTri    INTEGER NOT NULL,       -- đồng, hoặc số phần trăm 1..100
  tuNgay    TEXT,
  denNgay   TEXT,                   -- hạn; để trống = không có hạn
  ghiChu    TEXT DEFAULT '',
  daNhacLuc TEXT,                   -- lần nhắc hạn gần nhất, chống nhắc hai lần
  taoBoi    TEXT,
  taoLuc    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hocphi_uudai_be ON hocphi_uudai(studentId);
CREATE INDEX IF NOT EXISTS idx_hocphi_uudai_han ON hocphi_uudai(denNgay);

-- ƯU ĐÃI ĐÃ GỠ — ngưng dùng chứ không xoá, đúng nếp `hocphi_thuhoi` của chính
-- phân hệ này. Một dòng ưu đãi biến khỏi sổ mà không lời giải thích là chỗ mất
-- lòng tin nhanh nhất, và ở đây nó còn là căn cứ cho số tiền một nhà đã nộp.
CREATE TABLE IF NOT EXISTS hocphi_uudai_go (
  uuDaiId   TEXT PRIMARY KEY REFERENCES hocphi_uudai(id) ON DELETE CASCADE,
  lyDo      TEXT NOT NULL DEFAULT '',
  boiUserId TEXT,
  luc       TEXT NOT NULL
);

-- ===== LOẠI CỦA MỘT KHOẢN THU (Đ199, việc 34) =====
--
-- Nhà trường: ưu đãi chỉ áp trên HỌC PHÍ, không áp trên tiền ăn hay tiền xe.
-- Hôm nay `hocphi_khoan` chỉ có `noiDung` là chữ tự do, nên không có cách nào
-- để máy biết một khoản là học phí hay tiền ăn.
--
-- BẢNG PHỤ, KHÔNG THÊM CỘT: `CREATE TABLE IF NOT EXISTS` không thêm được cột
-- vào một bảng đã tồn tại, nên khai thêm cột ở trên là câu lệnh im lặng không
-- chạy trên cơ sở dữ liệu của trường — đúng loại lỗi chỉ lộ ra sau khi triển
-- khai. Cùng lối đã dùng cho `hocphi_thuhoi` và `hocphi_uudai_go`.
--
-- KHÔNG CÓ DÒNG = HỌC PHÍ, và đó là lựa chọn giữ Nguyên tắc số 1.
--
-- Mọi khoản thu đã ghi trước đợt này đều không có dòng. Cho chúng về 'khac'
-- thì ưu đãi thôi áp lên chúng, tức SỐ TIỀN MỘT NHÀ ĐANG NỢ TỰ NHIÊN TĂNG LÊN
-- mà không ai bấm gì — trên tiền, và im lặng. Cho về 'hoc-phi' thì ưu đãi vẫn
-- áp y như hôm qua, không một hoá đơn nào đổi.
CREATE TABLE IF NOT EXISTS hocphi_khoan_loai (
  khoanId TEXT PRIMARY KEY REFERENCES hocphi_khoan(id) ON DELETE CASCADE,
  loai    TEXT NOT NULL DEFAULT 'hoc-phi'   -- hoc-phi | tien-an | xe-dua-don | khac
);
CREATE INDEX IF NOT EXISTS idx_hocphi_khoan_loai ON hocphi_khoan_loai(loai);

-- ĐÃ NHẮC HẠN NỘP KHOẢN NÀY CHƯA (Đ199, việc 37).
--
-- Bảng phụ vì cùng lý do với `hocphi_khoan_loai`: không thêm được cột vào một
-- bảng đã tồn tại.
--
-- CÓ DÒNG = ĐÃ NHẮC. Thiếu bảng này thì bộ quét chạy mỗi ngày sẽ nhắc lại đúng
-- khoản ấy mỗi ngày cho tới hạn — kế toán nhận mười tiếng chuông cho một khoản,
-- rồi tắt thông báo, rồi lỡ khoản thật. `hocphi_uudai` giải cùng việc này bằng
-- cột `daNhacLuc` có sẵn từ đầu; khoản thu thì không có cột ấy.
CREATE TABLE IF NOT EXISTS hocphi_khoan_nhac (
  khoanId TEXT PRIMARY KEY REFERENCES hocphi_khoan(id) ON DELETE CASCADE,
  luc     TEXT NOT NULL
);
