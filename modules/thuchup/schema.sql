-- Phân hệ THỬ NGHIỆM của GĐ 0. Bảng này giữ kết quả phép thử "ghi lại một
-- khoảnh khắc của bé trong dưới 20 giây", không phải dữ liệu vận hành của trường.
--
-- Cột id CỐ Ý do máy của cô sinh ra chứ không do máy chủ sinh. Đó là toàn bộ cơ
-- chế chống nhân đôi: điện thoại mất mạng gửi lại lần hai, lần ba vẫn cùng một
-- mã, máy chủ thấy trùng thì trả lại bản cũ chứ không tạo thêm bản ghi mới.
CREATE TABLE IF NOT EXISTS thuchup_ghinhanh (
  id           TEXT PRIMARY KEY,
  studentId    TEXT NOT NULL,
  file         TEXT,
  note         TEXT,
  giay         REAL,               -- số giây từ lúc cô mở màn hình tới lúc lưu xong
  ngoaiTuyen   INTEGER DEFAULT 0,  -- 1 = lúc ghi đang mất mạng, gửi lên sau
  choBaoLau    REAL,               -- số giây bản ghi nằm trong hàng đợi trước khi lên được
  taoLuc       TEXT NOT NULL,      -- thời điểm trên máy của cô
  nhanLuc      TEXT NOT NULL,      -- thời điểm máy chủ nhận
  byTeacherId  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS thuchup_ghinhanh_hs ON thuchup_ghinhanh(studentId);
CREATE INDEX IF NOT EXISTS thuchup_ghinhanh_luc ON thuchup_ghinhanh(taoLuc);
