-- CAMBRIDGE & KẾT NỐI Ở NHÀ — văn phòng đăng, gia đình đọc.
--
-- NHÀ TRƯỜNG CHƯA CHỐT NỘI DUNG, NÊN CẤU TRÚC PHẢI RỘNG
--
-- Yêu cầu chỉ có một dòng: "văn phòng đăng lên, phụ huynh đọc; chưa rõ nội
-- dung gồm những gì". Đoán trước rồi khoá cứng thành các ô riêng (tuần mấy,
-- chủ điểm gì, từ vựng nào) là cầm chắc phải sửa lược đồ khi trường gửi mẫu
-- thật — mà sửa lược đồ của bảng đã có dữ liệu là việc CLAUDE.md cấm.
--
-- Nên ở đây chỉ có tiêu đề, một khối chữ, vài tấm ảnh, và một cái nhãn loại.
-- Trường gửi mẫu rồi thì thêm ô là chuyện của một bảng phụ, không phải của
-- một câu ALTER.
--
-- HAI LOẠI, VÌ CHÚNG NÓI VỚI HAI NGƯỜI KHÁC NHAU
--
--   'cambridge' — tuần này lớp học gì trong chương trình Cambridge.
--   'ket-noi'   — gợi ý gia đình làm cùng con ở nhà.
--
-- PHẠM VI: cả trường · một cơ sở · một nhóm.
--
-- Ba mức, vì một tờ Home Connection của nhóm Lá 1 gửi cho gia đình nhóm nhà
-- trẻ là thư rác — mà thư rác thì làm gia đình ngừng đọc mọi thứ khác.
--
-- CÔNG BỐ LÀ MỘT BƯỚC RIÊNG (`congBoLuc` rỗng = còn là nháp của văn phòng).
-- Soạn dở trong giờ làm việc rồi để đó là chuyện thường; gia đình không được
-- đọc bản dở.
CREATE TABLE IF NOT EXISTS cambridge_bai (
  id         TEXT PRIMARY KEY,
  loai       TEXT NOT NULL DEFAULT 'cambridge',
  tieuDe     TEXT NOT NULL,
  noiDung    TEXT NOT NULL DEFAULT '',
  tuan       TEXT NOT NULL DEFAULT '',   -- ngày thứ Hai của tuần, rỗng = không gắn tuần
  phamVi     TEXT NOT NULL DEFAULT 'truong',
  campusId   TEXT NOT NULL DEFAULT '',
  classId    TEXT NOT NULL DEFAULT '',
  -- Danh sách tên tệp ảnh, mỗi dòng một tên. Cột phẳng chứ không nhét JSON:
  -- bảng của phân hệ không đi qua JSON_COLS của lib/db.js nên JSON ở đây sẽ về
  -- tay người đọc dưới dạng chuỗi thô.
  anh        TEXT NOT NULL DEFAULT '',
  congBoLuc  TEXT,
  nguoiDang  TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_bai_theo_tuan ON cambridge_bai(tuan DESC);
CREATE INDEX IF NOT EXISTS cambridge_bai_theo_pham_vi ON cambridge_bai(phamVi, campusId, classId);
