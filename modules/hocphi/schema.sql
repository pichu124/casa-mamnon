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
