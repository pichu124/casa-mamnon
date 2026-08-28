-- BÁO ĂN HẰNG NGÀY — con số cô/văn phòng chốt cho bếp.
--
-- VÌ SAO PHẢI LƯU, TRONG KHI MÁY TÍNH RA ĐƯỢC
--
-- Máy tính ra được số suất dự kiến (sĩ số trừ bé nghỉ), nhưng con số đó ĐỔI
-- theo thời gian: 8 giờ sáng có thêm một bé báo nghỉ là con số khác đi, trong
-- khi bếp đã đong gạo từ 7 giờ. Bếp cần một con số ĐÃ CHỐT, kèm chốt lúc mấy
-- giờ và ai chốt — để cuối tháng đối chiếu thì có cái mà đối chiếu.
--
-- Lưu cả `soSuatMay` (con số máy tính ra ĐÚNG LÚC chốt) bên cạnh `soSuat` (con
-- số người gõ). Hai con số lệch nhau là chuyện bình thường và có lý do thật —
-- nhưng lệch NHIỀU và lệch THƯỜNG XUYÊN thì là dấu hiệu điểm danh đang trễ so
-- với bếp, và không lưu lại thì không ai phát hiện ra được.
--
-- MỘT NHÓM MỘT NGÀY MỘT BẢN GHI. Chốt lại thì ĐÈ lên, không sinh dòng thứ hai
-- để rồi bếp phải đoán lấy dòng nào.
CREATE TABLE IF NOT EXISTS tienan_chot (
  id        TEXT PRIMARY KEY,
  ngay      TEXT NOT NULL,          -- YYYY-MM-DD
  classId   TEXT NOT NULL,
  soSuat    INTEGER NOT NULL,
  soSuatMay INTEGER NOT NULL,
  ghiChu    TEXT NOT NULL DEFAULT '',
  nguoiChot TEXT,
  chotLuc   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS tienan_mot_nhom_mot_ngay ON tienan_chot(ngay, classId);
CREATE INDEX IF NOT EXISTS tienan_theo_ngay ON tienan_chot(ngay);
