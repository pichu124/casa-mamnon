# Góp ý của trường ngày 16/10/2026 — "Ứng dụng My Casa — feedback 16.10.2026" (9 mục + 2 mục phía phụ huynh)

Nguồn: tệp PDF 3 trang chủ dự án gửi ngày 17/10/2026. Tệp gốc **không** đưa vào kho mã
(có ảnh chụp màn hình mang tên cô thật). Mỗi mục dưới đây ghi: trường nói gì → mã đang ở
đâu → làm gì → trạng thái. Cả đợt mang số **Đ239**, mỗi phần một chữ cái.

| # | Mục | Làm ở | Trạng thái |
|---|---|---|---|
| 1 | Thực đơn — mẫu Excel theo TUẦN, bữa sáng 3 dòng riêng, đúng khuôn của trường | Đ239a | đang làm |
| 2 | Xuất báo cáo dữ liệu — điểm danh bé và cô, nhận xét tháng / 6 tháng, kế hoạch học tập, hồ sơ bé | Đ239c | đang làm |
| 3 | Báo ăn và tiền ăn — bỏ báo ăn cho bếp, chỉ cần Excel đối chiếu tiền ăn tháng, lồng vào điểm danh | Đ239c | đang làm |
| 4 | Đón trẻ — loại khỏi app | Đ239i | đang làm |
| 5 | Tạo tài khoản và phân quyền ở đâu | Đ239d | đang làm |
| 6 | Hành trình của bé — đúng bốn tab: Kế hoạch / Cambridge / P.E / Montessori & Kỹ năng sống | Đ239e | đang làm |
| 7 | Nhật ký ngày — bỏ Bú bình, đủ 5 bữa, mỗi bữa nối món của thực đơn hôm đó | Đ239b | đang làm |
| 8 | Cambridge Weekly Plan — 2–3 hoạt động, mỗi hoạt động: chủ đề, từ vựng, mục tiêu; rồi Song / Chant / Story | Đ239f | đang làm |
| 9 | Home Connection — bỏ hoạt động, chủ đề, từ vựng, song/chant | Đ239f | đang làm |
| PH1 | Nhắn tin với văn phòng — một mục, không tách theo từng bé | Đ239g | đang làm |
| PH2 | Điểm danh phía phụ huynh — thấy ảnh con lúc ra về, không chỉ thông báo | Đ239h | đang làm |

---

## 1. Thực đơn theo tuần

**Trường:** *"Để upload theo tuần k cần để theo tháng"*; *"Bữa sáng để luôn 3 dòng riêng
biệt, còn bạn copy đẩy lên hệ thống thế nào thì bạn xử lý nhé"*. Ảnh mẫu: cột là Thứ Hai →
Thứ Sáu; hàng là bữa ăn — Bữa sáng 8h (3 dòng), Bữa phụ sáng 9h30, Bữa trưa
(0–3 tuổi 11h20, 3–6 tuổi 11h40, nhiều dòng), Bữa chiều 14h00 (2 dòng).

**Mã cũ (Đ226):** `GET /api/menu/mau-excel?thang=` sinh mẫu THEO THÁNG, mỗi hàng một ngày,
mỗi cột một bữa; `POST /api/menu/nap-excel` đọc đúng khuôn đó.

**Làm:**
- Mẫu mới theo TUẦN, đúng khuôn của trường: cột A là bữa (kèm giờ), cột B → F là Thứ Hai
  → Thứ Sáu; Bữa sáng 3 dòng, Bữa phụ sáng 1, Bữa trưa 6, Bữa phụ chiều 2, Bữa sữa chiều 1.
  Mỗi ô một món. Mẫu tải về đã điền sẵn thực đơn đang có của tuần đó.
- Nạp lên: cô / văn phòng chọn TUẦN trên màn hình, app tự đặt Thứ Hai… vào đúng ngày.
  Đọc được cả khi trường dán bảng của mình (số dòng mỗi bữa tuỳ ý, ô bữa gộp hay không gộp,
  tên bữa viết "Bữa chiều" hay "Bữa phụ chiều" đều được). Vẫn có bước xem trước rồi mới lưu.
- Tệp theo khuôn tháng cũ vẫn nạp được (không làm hỏng tệp trường đã điền).
- Giờ mặc định của các bữa theo ảnh mẫu: sáng 08:00, phụ sáng 09:30, trưa 11:20, phụ chiều
  14:00; bữa sữa giữ 15:30 (ảnh mẫu bị cắt, chưa thấy giờ). "Sữa Vinamilk" đổi tên thành
  **"Bữa sữa chiều"** theo cách gọi ở mục 7. Thực đơn đã lưu giữ nguyên tên và giờ đã có.

## 2 + 3. Xuất báo cáo dữ liệu — gồm cả đối chiếu tiền ăn

**Trường:** báo cáo điểm danh cô và bé (cả trường / một lớp / một bé; hai kiểu: theo giờ ra
vào, theo có mặt – nghỉ phép – nghỉ không phép); báo cáo nhận xét tháng, 6 tháng (từng bé /
cả lớp / cả trường); kế hoạch học tập của từng bé / lớp theo tháng hoặc một giai đoạn; hồ sơ
học sinh (một bé / lớp / trường). Mục 3: *"Mình k cần báo ăn lên cho bếp, chỉ cần chức năng
xuất excel tổng hợp phần tiền ăn đối chiếu tháng… lồng ghép vào trong mục điểm danh và xuất
báo cáo điểm danh luôn"*.

**Mã cũ:** chỉ có ba tệp CSV (đối chiếu tiền ăn tháng, bảng công tháng, danh sách bé). Điểm
danh bé không xuất được; báo cáo học tập, kế hoạch của bé không xuất được.

**Làm:** phân hệ cắm thêm mới **"Xuất báo cáo"** (`modules/xuatbaocao`), chỉ cho tài khoản
nhà trường, mọi tệp là **Excel thật (.xlsx)**:
- Điểm danh bé — phạm vi cả trường / một cơ sở / một nhóm / một bé, khoảng ngày; kiểu "giờ
  vào – giờ ra" hoặc "có mặt / nghỉ phép / nghỉ không phép".
- Điểm danh cô và nhân viên — cùng hai kiểu (giờ vào ra từ chấm công bằng ảnh; nghỉ phép /
  không phép từ bảng công của Nhân sự nếu phân hệ đó đang bật).
- Đối chiếu tiền ăn tháng — đúng số liệu bảng đối chiếu đang có, nay ra Excel thật.
- Báo cáo tháng và báo cáo 6 tháng; kế hoạch của bé; hồ sơ bé.
- Ai thấy phần nào: đúng phần dữ liệu người đó vốn đã mở được ở màn gốc (không nới quyền);
  tài khoản một cơ sở chỉ xuất được cơ sở của mình. Không phần trăm, không xếp hạng (QUY TẮC 4).
- Màn Điểm danh của nhà trường có lối vào "Xuất báo cáo điểm danh" và "Đối chiếu tiền ăn".
- Ô "Báo ăn & tiền ăn" **gộp vào màn Điểm danh** với tài khoản nhà trường (cùng cơ chế đã dùng
  cho Kế hoạch giáo dục → Lịch sinh hoạt). Đường `#/tienan`, dữ liệu và API giữ nguyên.

## 4. Đón trẻ

**Trường:** *"loại bỏ khỏi app cho mình đã được lồng ghép trong phần điểm danh"*.

**Mã cũ:** Đ227 đã tắt sẵn phân hệ Đón trả bé (`defaultEnabled: false`). **Nhưng** máy thử
dựng bằng `npm run ban-thu`, và lệnh này bật MỌI phân hệ cắm thêm — kể cả Đón trả bé — nên
trên máy thử nó vẫn hiện.

**Làm:** `ban-thu` không bật những phân hệ trường đã quyết tắt, và tắt lại nếu đang bật.
Trên máy thử hiện có: người giữ máy vào **Quản trị → Tính năng → tắt "Đón trả bé"** (một
chạm, dữ liệu giữ nguyên) hoặc chạy lại `ban-thu`.

## 5. Tạo tài khoản và phân quyền

**Trường:** Giám đốc tạo tài khoản cấp 2 và quản lý cơ sở; quản lý cơ sở tạo tài khoản cô,
phân cô vào từng lớp, điều chuyển cô; văn phòng cơ sở tạo tài khoản phụ huynh, chuyển lớp,
nghỉ học bảo lưu, nhập đủ thông tin bé.

**Mã cũ:** phần lớn đã có nhưng nằm sâu (Cài đặt → "Nhóm lớp, cô, nhập danh sách"); KHÔNG
có màn tạo tài khoản quản trị (chỉ có lệnh trên máy chủ); không có "chuyển cô"; không có
"bảo lưu"; mỗi bé chỉ một tài khoản phụ huynh; quản lý cơ sở tạo cô chưa gán nhóm thì không
thấy lại cô đó.

**Làm:** tab **"Tài khoản"** mới trong Quản trị, có lối vào riêng ở Cài đặt, mỗi vai thấy
đúng việc của mình:
- Ban giám hiệu (cả trường): tạo tài khoản quản trị kèm chức vụ (Cấp 2, quản lý cơ sở, văn
  phòng cơ sở…) và cơ sở; mật khẩu tạm hiện một lần.
- Quản lý cơ sở: tạo tài khoản cô (bắt buộc chọn nhóm của cơ sở mình — hết cảnh tạo xong
  không thấy cô đâu); **chuyển cô** từ nhóm này sang nhóm khác một bước, giữ vai của cô.
- Văn phòng cơ sở: thêm tài khoản phụ huynh thứ hai cho bé (bố / mẹ); chuyển nhóm (đã có);
  **nghỉ học bảo lưu** (bé tạm nghỉ, dữ liệu giữ nguyên, đi học lại một chạm); form nhận bé
  nhập được đủ thông tin (dân tộc, nhóm máu, số định danh, tiền sử bệnh, liên hệ khẩn cấp).

## 6. Hành trình của bé

**Trường:** đang thấy 3 tab Suy ngẫm cuối ngày / Chủ đề tuần / Hành trình của bé; đúng ra
là 4 tab: Kế hoạch của bé; Cambridge; P.E (Thể chất); Montessori & Kỹ năng sống. Nút + ở
tab 2–4 để ghi nhanh, lưu nháp, sau đó gắn tên bé, gắn chương trình, gửi phụ huynh. Có nói
thành chữ.

**Mã cũ (Đ230):** bốn tab có rồi nhưng nằm ở tầng thứ hai — phải mở "Hành trình từng bé" và
chọn bé mới thấy. Cô mở vào luôn rơi vào Suy ngẫm. Nút + không biết cô đang ở tab nào;
nháp và "Kể cho gia đình" chỉ làm được ở Suy ngẫm.

**Làm:** màn của cô mở thẳng vào chọn bé + **bốn tab theo đúng thứ tự trường**; nút + ở tab
chương trình ghi sẵn đúng chương trình đó; mỗi tab chương trình có phần nháp chưa gắn bé
(gắn bé được ngay tại đó) và nút "Kể cho gia đình". Suy ngẫm cuối ngày và Chủ đề tuần
**không mất** — thành hai lối vào phụ dưới tiêu đề. Phía gia đình: bốn tab theo cùng thứ tự.

## 7. Nhật ký ngày

**Trường:** bỏ tab Bú bình trong ăn uống; đủ Bữa sáng / Bữa phụ sáng / Bữa trưa / Bữa phụ
chiều / Bữa sữa chiều; mỗi bữa nối thực đơn hôm đó, hiện như "Bữa sáng: bánh bao xá xíu —
con ăn hết".

**Mã cũ:** bữa lấy theo thực đơn của ngày; ngày chưa có thực đơn thì chỉ 3 bữa; có bước
"Bú bình" cho nhóm có bé nhà trẻ.

**Làm:** luôn đủ 5 bữa theo đúng tên trên; món lấy từ thực đơn hôm đó; bỏ bước Bú bình (số
liệu bú bình đã ghi trước đây vẫn giữ và vẫn hiện cho gia đình ở những ngày đó); gia đình
đọc "Bữa sáng: Bánh bao xá xíu — con ăn hết".

## 8 + 9. Cambridge

**Trường (8):** Weekly Plan hiện 2 hoặc 3 hoạt động, mỗi hoạt động: tên chủ đề, từ vựng,
mục tiêu; sau đó mới tới các mục chung Song / Chant / Story. **(9):** Home Connection bỏ
hoạt động, chủ đề, từ vựng, song/chant — chỉ còn tiêu đề, nội dung, gửi cho ai, tuần, khung
Cambridge (block, tuần trong block, lứa tuổi).

**Làm:** Weekly Plan soạn được 1–3 hoạt động (bảng phụ mới, bài cũ hiện như cũ), thêm ô
Story; Home Connection bỏ các ô đó khỏi form (bài cũ có chữ trong các ô ấy vẫn hiện đủ).

## PH1. Nhắn tin với văn phòng

**Trường:** *"không cần tách ra Văn phòng nhà trường về bé này bé kia, chỉ cần ghi Nhắn tin
với văn phòng nhà trường"*.

**Làm:** gia đình có nhiều con chỉ thấy MỘT mục "Văn phòng nhà trường" (mỗi cơ sở một mục
nếu các con học khác cơ sở), không còn dòng "Về bé…". Hội thoại cũ theo từng bé vẫn giữ và
vẫn mở được.

## PH2. Ảnh con lúc ra về

**Trường:** *"Chưa thấy update hình ảnh con check out tại trường, chỉ ghi nhận thông báo"*.

**Mã cũ:** máy chủ đã lưu và trả ảnh ra về; màn của gia đình chưa vẽ nó.

**Làm:** màn Điểm danh của gia đình hiện ảnh lúc ra về cạnh ảnh lúc tới lớp.

---

## Điểm cần chủ dự án quyết (phát sinh khi làm)

Ghi ở cuối đợt, xem mục "Còn để chủ dự án quyết" bên dưới khi đợt xong.
