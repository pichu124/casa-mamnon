-- ===========================================================================
-- HỒ SƠ NHÂN SỰ VÀ CHẤM CÔNG (Đ152)
--
-- Nhà trường 10/09: *"làm luôn cùng đợt này đi bạn. để mình có thể test luôn 1
-- thể về phần chấm công giáo viên, nhân viên"*.
--
-- ĐÂY LÀ MỘT MIỀN DỮ LIỆU MỚI, VÀ NÓ KHÔNG PHẢI CỦA TRẺ.
--
-- Cả kho mã này tới nay xoay quanh một câu hỏi: ai được đọc dữ liệu của một
-- đứa trẻ. Bảng dưới đây thì khác hẳn — nó là dữ liệu cá nhân của NGƯỜI LỚN,
-- và là loại nặng nhất: số định danh, mã số thuế, số bảo hiểm, hoàn cảnh gia
-- đình, số tài khoản ngân hàng, lương.
--
-- Ba điều đi kèm, và cả ba đều là điều kiện chứ không phải lời hứa:
--
--   1. CHỈ NHÂN SỰ VÀ BAN GIÁM HIỆU. Không phải mọi tài khoản quản trị. Quản
--      lý cơ sở, Văn phòng cơ sở, Kế toán, Marketing đều KHÔNG mở được — xem
--      `chiNhanSu` ở routes.js. Đường dẫn cố ý KHÔNG nằm dưới `/api/admin`, vì
--      tiền tố đó đã mở sẵn cho Văn phòng cơ sở (chú thích ở lib/db.js nói
--      thẳng rằng mọi đường `/api/admin/...` thêm sau này tự động lọt).
--   2. NGƯỜI TRONG HỒ SƠ ĐỌC ĐƯỢC HỒ SƠ CỦA CHÍNH MÌNH. Cô mở được phần "Của
--      tôi" để xem trường đang giữ những gì về mình và bảng công tháng này.
--      Giữ dữ liệu về một người mà chính họ không xem được là chỗ hỏng lòng
--      tin nhanh nhất, và cũng là chỗ luật đòi hỏi rõ nhất.
--   3. TẮT PHÂN HỆ LÀ DỮ LIỆU NGƯNG CHẢY. Đây là phân hệ cắm thêm, tắt được ở
--      Quản trị → Tính năng, và tắt thì API bị chặn ngay ở máy chủ.
--
-- SAO LƯU: `npm run backup` chép cả tệp cơ sở dữ liệu nên hai bảng này đi theo
-- mà không phải khai thêm gì. Nhưng cũng vì thế mà bản sao lưu của trường từ
-- hôm nay CÓ CHỨA số định danh của nhân viên — nhà trường cần biết điều đó khi
-- quyết định để bản sao lưu ở đâu.
-- ===========================================================================

-- Một dòng một người. `userId` là tài khoản trong `users`, nên hồ sơ tự biến
-- mất khi tài khoản bị xoá — không để lại một hồ sơ mồ côi không ai nhận.
CREATE TABLE IF NOT EXISTS nhansu_ho_so (
  userId           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ngaySinh         TEXT NOT NULL DEFAULT '',
  gioiTinh         TEXT NOT NULL DEFAULT '',
  cccd             TEXT NOT NULL DEFAULT '',
  cccdNgayCap      TEXT NOT NULL DEFAULT '',
  cccdNoiCap       TEXT NOT NULL DEFAULT '',
  mst              TEXT NOT NULL DEFAULT '',
  soBhxh           TEXT NOT NULL DEFAULT '',
  dienThoai        TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL DEFAULT '',
  queQuan          TEXT NOT NULL DEFAULT '',
  hoKhau           TEXT NOT NULL DEFAULT '',
  choO             TEXT NOT NULL DEFAULT '',
  danToc           TEXT NOT NULL DEFAULT '',
  honNhan          TEXT NOT NULL DEFAULT '',
  tenVoChong       TEXT NOT NULL DEFAULT '',
  dienThoaiVoChong TEXT NOT NULL DEFAULT '',
  soCon            INTEGER NOT NULL DEFAULT 0,
  trinhDo          TEXT NOT NULL DEFAULT '',
  chuyenNganh      TEXT NOT NULL DEFAULT '',
  chucDanh         TEXT NOT NULL DEFAULT '',
  loaiHopDong      TEXT NOT NULL DEFAULT '',
  ngayVaoLam       TEXT NOT NULL DEFAULT '',
  ngayNghiViec     TEXT NOT NULL DEFAULT '',
  nganHang         TEXT NOT NULL DEFAULT '',
  soTaiKhoan       TEXT NOT NULL DEFAULT '',
  khanCapTen       TEXT NOT NULL DEFAULT '',
  khanCapQuanHe    TEXT NOT NULL DEFAULT '',
  khanCapDienThoai TEXT NOT NULL DEFAULT '',
  ghiChu           TEXT NOT NULL DEFAULT '',
  capNhatLuc       TEXT,
  nguoiCapNhat     TEXT
);

-- CHẤM CÔNG: một dòng một người một ngày.
--
-- Cố ý KHÔNG tính lương ở đây. Bảng này ghi lại NGÀY CÔNG — ai đi làm hôm nào,
-- nghỉ loại gì — rồi xuất ra tệp cho kế toán. Tính lương kéo theo hệ số, phụ
-- cấp, thuế, bảo hiểm: một miền nghiệp vụ riêng, và đoán sai một dòng ở đó là
-- trả sai lương cho một người có thật.
CREATE TABLE IF NOT EXISTS nhansu_cham_cong (
  userId     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ngay       TEXT NOT NULL,                    -- YYYY-MM-DD, giờ Việt Nam
  loai       TEXT NOT NULL DEFAULT 'di-lam',   -- di-lam | nua-ngay | nghi-phep | nghi-khong-phep | nghi-le
  gioVao     TEXT NOT NULL DEFAULT '',         -- HH:MM
  gioRa      TEXT NOT NULL DEFAULT '',
  ghiChu     TEXT NOT NULL DEFAULT '',
  nguoiGhi   TEXT,
  capNhatLuc TEXT,
  PRIMARY KEY (userId, ngay)
);
CREATE INDEX IF NOT EXISTS idx_nhansu_cc_thang ON nhansu_cham_cong(ngay);
