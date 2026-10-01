# Yêu cầu gốc của nhà trường — "Xây dựng file tính biểu phí tự động"

Chép nguyên văn nội dung tệp Word nhà trường gửi (30/09/2026), chỉ đổi định dạng. Mọi chỗ
đặc tả [`DAC-TA.md`](DAC-TA.md) phải chọn một cách hiểu đều ghi giả định Gx và dẫn lại câu gốc ở đây.

---

1. Phân loại Chu kỳ Thu phí (Billing Cycles)
Hệ thống áp dụng 4 chu kỳ đóng phí: 1 tháng, Quý (3 tháng), 6 tháng, 12 tháng.
Cố định khung thời gian Quý (Lịch chuẩn):
Quý 1: Tháng 1, 2, 3
Quý 2: Tháng 4, 5, 6
Quý 3: Tháng 7, 8, 9
Quý 4: Tháng 10, 11, 12
Phân quyền/Điều kiện chọn chu kỳ:
1 tháng: Chỉ áp dụng cho học sinh là con/em giáo viên trong trường.
Chu kỳ khác (Quý, 6T, 12T): Áp dụng cho toàn bộ Phụ huynh (Mặc định: Quý).
2. Cơ chế Cấu hình Ưu đãi Học sinh (Discount Configuration)
Mỗi học sinh có một danh sách danh mục ưu đãi. Mỗi ưu đãi có các thuộc tính:
Loại ưu đãi: Ưu đãi chung (Năm đầu, Cư dân, em bé thứ 2...), Ưu đãi theo chu kỳ đóng phí (Đóng Quý, 6T, 12T), Ưu đãi bổ sung (Chính sách riêng của trường).
Giá trị ưu đãi: % giảm giá.
Thời hạn áp dụng: Ngày bắt đầu - Ngày kết thúc (VD: đến 31/10/2027).
Điều kiện áp dụng: Thuộc năm học nào (Năm 1, Năm 2+), chu kỳ đóng phí nào.
3. Logic & Quy tắc Tính toán Biểu phí (Business Rules)
Quy tắc 1: Nguyên tắc lũy tiến (Compounding/Progressive Calculation)
Các ưu đãi không cộng dồn phần trăm trực tiếp theo phép cộng đơn thuần (), mà áp dụng tính giảm giá lũy tiến trên số tiền còn lại sau mỗi bước trừ ưu đãi (hoặc tính theo công thức lũy tiến tương đương được thiết lập).
Quy tắc 2: Giới hạn số lượng & Tổng % ưu đãi tối đa (Caps & Constraints)
Mốc Năm 1:
Tối đa chọn 2 ưu đãi hoặc 3 ưu đãi tùy theo quyết định ban hành
Tổng % giảm giá không vượt quá ….%. theo quyết định ban hành từng thời điểm
Mốc Từ Năm 2 trở đi:
Tối đa chọn xx ưu đãi (2 hoặc 3…. Do nhà trường set)
Tổng % giảm giá không vượt quá xx%. – xx do nhà trường set cho từng bạn
Ưu đãi bổ sung (Chính sách riêng): Khi gán thêm chính sách riêng phát sinh từ nhà trường, hệ thống phải cho phép cài đặt Thời hạn và Trần ưu đãi tối đa (Max Discount Cap) riêng cho chính sách đó.
Hoặc Mốc sẽ được thay đổi theo từng thời điểm ra quyết định tuyển sinh, là ưu đãi 2 năm đầu và các năm về sau, hoặc sau năm đầu phê duyệt cho gia hạn ưu đãi mốc 1 thêm 1 năm nữa…..=
Quy tắc 3: Tính toán Học phí theo Quý tự động (Quarterly Auto-Billing)
Hệ thống tự động quét thời hạn hiệu lực của từng ưu đãi tại thời điểm tính phí.
Nếu một ưu đãi hết hạn giữa chừng (ví dụ: ngày 31/10/2027 - thuộc Quý 4), hệ thống sẽ tách dòng tính toán: các tháng trước/trong thời hạn (tháng 10) áp dụng ưu đãi cũ, các tháng sau thời hạn (tháng 11, 12) chuyển sang quy tắc tính phí/ưu đãi của giai đoạn mới.
