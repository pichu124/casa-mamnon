# Tổng kết — những việc đã hoàn thiện sau góp ý của trường ngày 16/10/2026

Bản ngắn để gửi nhà trường. Chi tiết kỹ thuật từng mục: `docs/PHAN-HOI-TRUONG-1610.md`.
Cách thử từng việc trên máy thử: `docs/HUONG-DAN-KIEM-THU.md` (bản 18/10, cột "Thử ở dòng").

**Kết quả: 10 / 11 mục đã xong. 1 mục (nhắn tin văn phòng) chờ nhà trường chọn cách làm.**

| # | Trường yêu cầu | App nay làm gì | Thử ở dòng |
|---|---|---|---|
| 1 | Thực đơn tải lên theo **tuần**, đúng mẫu của trường, Bữa sáng 3 dòng | Thực đơn → thẻ Excel → chọn tuần → **Tải mẫu** (cột Thứ Hai → Thứ Sáu; Bữa sáng 3 dòng, Bữa phụ sáng, Bữa trưa, Bữa phụ chiều, Bữa sữa chiều) → điền hoặc dán bảng của trường → **Nạp** → xem trước → **Lưu**. Tệp của tuần khác tuần đang chọn bị từ chối, không ghi đè nhầm. | 7.3, 7.14, 7.15 |
| 2 | Xuất báo cáo dữ liệu: điểm danh cô và bé, nhận xét tháng / 6 tháng, kế hoạch học tập, hồ sơ học sinh | Ô mới **"Xuất báo cáo"** — tải Excel cho: điểm danh bé, điểm danh cô và nhân viên (chọn kiểu *giờ ra vào* hoặc *có mặt / nghỉ phép / nghỉ không phép*), báo cáo tháng và 6 tháng, kế hoạch của bé, hồ sơ bé. Chọn cả trường / một cơ sở / một nhóm / một bé, theo tháng hoặc khoảng ngày. Mỗi người chỉ thấy phần mình được xem (kế toán: tiền ăn; văn phòng cơ sở: cơ sở mình). | 10.14–10.16 |
| 3 | Không cần báo ăn cho bếp, chỉ cần Excel đối chiếu tiền ăn tháng, lồng vào điểm danh | Bỏ phần "Báo ăn hằng ngày". Màn **Điểm danh** của nhà trường có thẻ **"Báo cáo"** dẫn tới *Đối chiếu tiền ăn tháng* và *Xuất báo cáo điểm danh*. Tệp tiền ăn là Excel thật (.xlsx). | 10.2, 10.3, 10.6 |
| 4 | Bỏ mục Đón trẻ (đã gộp vào điểm danh) | Đón trả bé tắt. Máy thử dựng từ trước: ban giám hiệu vào **Quản trị → Tính năng → tắt "Đón trả bé"** (một chạm, dữ liệu cũ giữ nguyên). | 9.12 |
| 5 | Tạo tài khoản và phân quyền: giám đốc → cấp 2 và quản lý cơ sở; quản lý cơ sở → cô, phân lớp, điều chuyển cô; văn phòng → phụ huynh, chuyển lớp, bảo lưu, nhập đủ thông tin bé | Tab mới **"Tài khoản"** (Cài đặt → *Tài khoản & phân quyền*). **Ban giám hiệu** tạo tài khoản quản trị kèm chức vụ và cơ sở. **Quản lý cơ sở** tạo tài khoản cô, phân vào nhóm, **chuyển cô** sang nhóm khác (giữ vai), cấp lại mật khẩu cô. **Văn phòng cơ sở** nhận bé mới nhập đủ thông tin (kèm phụ huynh thứ hai), **thêm tài khoản phụ huynh**, chuyển nhóm, **nghỉ học bảo lưu / đi học lại**. Mật khẩu tạm hiện một lần, đăng nhập lần đầu phải đổi. | 3.3, 3.4, 3.13, 3.19, 3.29–3.37 |
| 6 | Hành trình của bé đúng 4 tab: Kế hoạch của bé / Cambridge / P.E / Montessori & Kỹ năng sống; nút + ghi nhanh, lưu nháp, gắn bé sau, gửi phụ huynh; nói thành chữ | Mở **Hành trình** là thấy chọn bé + đúng 4 tab theo thứ tự trường. Nút **+ Ghi nhanh** ở tab nào thì ghi sẵn chương trình đó; lưu nháp chưa gắn bé, gắn bé ngay trong tab, **Kể cho gia đình** từ tab. Có nút nói thành chữ. "Suy ngẫm cuối ngày" và "Chủ đề tuần" vẫn còn, là hai nút nhỏ dưới tiêu đề. Phụ huynh thấy 4 tab cùng thứ tự. | 3.25, 6.3–6.17, 12.3 |
| 7 | Nhật ký: bỏ Bú bình; đủ Bữa sáng / phụ sáng / trưa / phụ chiều / sữa chiều; mỗi bữa nối thực đơn hôm đó | Tab Ăn uống không còn Bú bình, luôn đủ 5 bữa, mỗi bữa hiện món của thực đơn hôm đó. Gia đình đọc: **"Bữa sáng: Bánh bao xá xíu — con ăn hết"**. | 5.1, 5.7, 5.13, 11.2 |
| 8 | Cambridge Weekly Plan: 2–3 hoạt động, mỗi hoạt động có chủ đề, từ vựng, mục tiêu; sau đó Song / Chant / Story | Mẫu soạn có **Hoạt động 1, 2, 3** (chủ đề, từ vựng, mục tiêu) rồi mục chung **Song / Chant**, **Story**. Thẻ gửi phụ huynh hiện đủ. | 7.16 |
| 9 | Home Connection bỏ hoạt động, chủ đề, từ vựng, song/chant | Mẫu soạn chỉ còn: tiêu đề, nội dung, gửi cho ai, tuần, khung Cambridge (block, tuần trong block, lứa tuổi). | 7.12 |
| PH2 | Phụ huynh chưa thấy ảnh con lúc ra về, chỉ có thông báo | Màn Điểm danh của phụ huynh có **ảnh con lúc ra về** cạnh ảnh lúc tới lớp; chạm thông báo "Con đã được đón về" mở đúng ngày, đúng bé. | 4.2, 11.13 |
| PH1 | Nhắn tin với văn phòng chỉ một mục, không tách "về bé này bé kia" | **Chưa làm — chờ nhà trường chọn cách.** Gộp đơn giản làm lộ tin: gia đình bố mẹ riêng, hoặc tài khoản bố/mẹ thêm sau, sẽ đọc được tin về con không phải của mình. Hiện vẫn mỗi bé một mục "Văn phòng nhà trường — Về bé …". Danh sách hội thoại nay có dòng phụ ghi rõ bé nào, nhóm nào. | 8.2, 11.3 |

## Nhà trường cần trả lời

1. **Nhắn tin văn phòng (PH1)** — chọn một:
   - **A (đề xuất):** mỗi phụ huynh một hộp thư riêng với văn phòng. Luôn đúng một mục, không bao giờ lộ tin; nhưng bố và mẹ không chung một cuộc (văn phòng trả lời từng người).
   - **B:** bố mẹ chung cuộc, người đọc cố định từ lúc mở cuộc; nhà bố mẹ riêng vẫn thấy "Về bé…".
   - **C:** giữ như hiện nay.
2. **Giờ "Bữa sữa chiều"** đang để 15h30 (ảnh mẫu bị cắt) — đúng chưa?
3. **Ô "Tiền ăn" phía phụ huynh** (số ngày con ăn ở trường trong tháng) — giữ hay bỏ?
4. **Văn phòng điền bổ sung thông tin còn trống sau khi đã nhận bé** (vd số định danh có sau): hiện phải nhờ quản lý cơ sở (đúng bảng phân quyền trường chốt 07/09). Trường muốn văn phòng tự điền ô còn trống không?

## Lưu ý khi thử

- Mọi việc trên đã được kiểm bằng máy (toàn bộ kiểm thử tự động của app) và một lượt đi qua app thật trên điện thoại và máy tính.
- Máy thử cần được cập nhật lên bản mới này trước buổi thử.
- Bảo lưu chỉ ghi lùi ngày tối đa 60 ngày (tránh gõ nhầm năm).
