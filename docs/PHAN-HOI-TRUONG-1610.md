# Góp ý của trường ngày 16/10/2026 — "Ứng dụng My Casa — feedback 16.10.2026" (9 mục + 2 mục phía phụ huynh)

Nguồn: tệp PDF 3 trang chủ dự án gửi ngày 17/10/2026. Tệp gốc **không** đưa vào kho mã
(có ảnh chụp màn hình mang tên cô thật). Mỗi mục dưới đây ghi: trường nói gì → mã đang ở
đâu → làm gì → trạng thái. Cả đợt mang số **Đ239**, mỗi phần một chữ cái.

| # | Mục | Làm ở | Trạng thái |
|---|---|---|---|
| 1 | Thực đơn — mẫu Excel theo TUẦN, bữa sáng 3 dòng riêng, đúng khuôn của trường | Đ239a, Đ239j, Đ239-vá3 | ✅ |
| 2 | Xuất báo cáo dữ liệu — điểm danh bé và cô, nhận xét tháng / 6 tháng, kế hoạch học tập, hồ sơ bé | Đ239c, Đ239c-vá | ✅ |
| 3 | Báo ăn và tiền ăn — bỏ báo ăn cho bếp, chỉ cần Excel đối chiếu tiền ăn tháng, lồng vào điểm danh | Đ239c, Đ239c-vá, Đ239h | ✅ |
| 4 | Đón trẻ — loại khỏi app | Đ239i | ✅ (máy thử đang có: tắt tay một lần, xem mục 4) |
| 5 | Tạo tài khoản và phân quyền ở đâu | Đ239d1, Đ239d2, Đ239-vá3 | ✅ |
| 6 | Hành trình của bé — đúng bốn tab: Kế hoạch / Cambridge / P.E / Montessori & Kỹ năng sống | Đ239e, Đ239j | ✅ |
| 7 | Nhật ký ngày — bỏ Bú bình, đủ 5 bữa, mỗi bữa nối món của thực đơn hôm đó | Đ239b, Đ239j | ✅ |
| 8 | Cambridge Weekly Plan — 2–3 hoạt động, mỗi hoạt động: chủ đề, từ vựng, mục tiêu; rồi Song / Chant / Story | Đ239f | ✅ |
| 9 | Home Connection — bỏ hoạt động, chủ đề, từ vựng, song/chant | Đ239f | ✅ |
| PH1 | Nhắn tin với văn phòng — một mục, không tách theo từng bé | Đ239g → hoàn tác; Đ239m (phương án A, chủ dự án chọn 18/10) | ✅ |
| PH2 | Điểm danh phía phụ huynh — thấy ảnh con lúc ra về, không chỉ thông báo | Đ239h | ✅ |

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
- Ô "Báo ăn & tiền ăn" (nay tên "Tiền ăn") **gộp vào màn Điểm danh** với tài khoản nhà trường
  (cùng cơ chế đã dùng cho Kế hoạch giáo dục → Lịch sinh hoạt); màn Tiền ăn mở thẳng "Đối chiếu
  tháng", **bỏ tab "Báo ăn hằng ngày"** cho bếp. Đường `#/tienan`, dữ liệu và API giữ nguyên.
  Kế toán (không mở màn Điểm danh) vẫn có ô Tiền ăn trên trang chủ.
- Bé nghỉ hoặc bảo lưu GIỮA kỳ vẫn có trong tệp (kèm cột "Ghi chú: Bảo lưu từ … / Nghỉ từ …").

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
- Quản lý cơ sở: tạo tài khoản cô (cô vừa tạo, chưa phân nhóm, nay vẫn hiện lại trong danh
  sách của quản lý cơ sở đó để phân nhóm và cấp lại mật khẩu — trước đây tạo xong là "mất");
  **chuyển cô** từ nhóm này sang nhóm khác một bước, giữ vai của cô.
- Văn phòng cơ sở: thêm tài khoản phụ huynh thứ hai cho bé (bố / mẹ — luôn là tài khoản
  mới, tối đa 4 phụ huynh mỗi bé); chuyển nhóm (đã có, nay có nút ở tab Tài khoản);
  **nghỉ học bảo lưu** (bé tạm nghỉ, dữ liệu giữ nguyên, "Đi học lại" một chạm, hoặc "Thôi bảo
  lưu, nghỉ hẳn"); form nhận bé nhập được đủ thông tin (dân tộc, nhóm máu, số định danh, tiền
  sử bệnh, liên hệ khẩn cấp, phụ huynh thứ hai). Sửa phần nhân thân SAU khi đã nhận bé vẫn là
  việc của quản lý cơ sở / ban giám hiệu (luật trường chốt 07/09 — xem mục quyết định bên dưới).

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

## PH1. Nhắn tin với văn phòng — XONG theo phương án A (Đ239m)

**Trường:** *"không cần tách ra Văn phòng nhà trường về bé này bé kia, chỉ cần ghi Nhắn tin
với văn phòng nhà trường"*.

**Mã trước Đ239m:** mỗi bé một kênh văn phòng (bảng `kenh_hoi_thoai`), mọi phụ huynh HIỆN TẠI của
bé đọc chung kênh đó. Gia đình hai con thấy hai dòng "Văn phòng nhà trường — Về bé …".

**Đã thử và hoàn tác (Đ239g, Đ239g-vá):** gộp các con thành một mục, gắn vào kênh văn phòng của
MỘT bé. Hai vòng review đối kháng đều chặn, cả hai đã chạy thử thấy rò thật:
- bố mẹ riêng (bé chung + con riêng mỗi người) → tin về con riêng của người này tới người kia;
- vá bằng "chỉ gộp các bé có cùng bộ phụ huynh" vẫn rò khi bộ phụ huynh ĐỔI SAU: mẹ là phụ
  huynh duy nhất của bé A và bé B, kể chuyện bé B trong mục gộp (kênh bé A); trường thêm tài
  khoản bố (chỉ là bố bé A) → bố đọc được chuyện của bé B.

Gốc rễ: nội dung một cuộc gộp phủ nhiều bé, còn quyền đọc tính theo phụ huynh hiện tại của một
bé. Đóng kín được mọi biến thể cần một mô hình kênh mới — và mô hình nào cũng đổi hành vi, nên
phải chủ dự án chọn:

| | Phương án | Được | Mất |
|---|---|---|---|
| **A** (architect đề xuất) | Mỗi TÀI KHOẢN phụ huynh × cơ sở một hộp thư riêng với văn phòng | Luôn đúng MỘT mục "Văn phòng nhà trường", kể cả nhà bố mẹ riêng; không ai đọc được thư không phải của mình, kể cả khi gia đình thay đổi | Bố và mẹ KHÔNG còn chung một cuộc với văn phòng (văn phòng trả lời từng người); tin văn phòng chỉ đẩy về máy + số đỏ ở ô Nhắn tin, không vào chuông Thông báo; phụ huynh gắn với bé sau ngày cập nhật không đọc được cuộc văn phòng CŨ của bé đó |
| **B** | Cuộc gộp với người đọc "đóng băng" lúc lập (bộ phụ huynh + bộ bé); bộ đổi thì mở cuộc mới | Vợ chồng vẫn chung cuộc | Nhà bố mẹ riêng vẫn thấy "Về bé…"; nhiều nhánh hơn, rủi ro cao hơn |
| **C** | Giữ như hiện nay (mỗi bé một kênh) | Không đổi gì, không rò | Trái lời trường: nhà nhiều con vẫn thấy "Về bé …" |

**Chủ dự án chọn A ngày 18/10. Đã làm (Đ239m):**
- Mỗi tài khoản phụ huynh × cơ sở một hộp thư với văn phòng (`conversations.type = 'vanphong'`,
  bảng lõi mới `kenh_van_phong`, chỉ `CREATE ... IF NOT EXISTS`; luật quyền gom một chỗ ở
  `lib/kenh-van-phong.js`). "Trò chuyện mới" của gia đình có MỘT dòng "Văn phòng nhà trường"
  cho mỗi cơ sở có con học; nhà có con ở hai cơ sở thì dòng phụ ghi tên cơ sở.
- Người đọc cố định từ lúc lập: chủ hộp thư (còn ít nhất một con đọc được) và văn phòng / quản
  trị của đúng cơ sở ấy. Cô, kế toán, marketing không vào được. Thêm hay gỡ phụ huynh sau này
  không đổi ai đọc được cuộc nào — gốc của hai lần rò ở Đ239g không còn chỗ xảy ra.
- Văn phòng thấy tên người nhắn, dòng phụ "Phụ huynh bé … (nhóm)"; danh sách, số đỏ ô Nhắn tin
  và thông báo đẩy về máy tính cùng một luật.
- Kênh văn phòng CŨ theo từng bé không xoá: người đã đọc nó trước ngày cập nhật vẫn mở được;
  phụ huynh gắn với bé SAU ngày ấy không thấy. App đời cũ gọi `/start` theo bé vẫn vào đúng hộp
  thư của người gọi.
- Kiểm: `test/nhan-tin-kenh.test.mjs` [11]–[20] (hai kịch bản rò cũ nay bị 403), một vòng chạy
  app thật 7/7 đạt (bố mẹ, con hai cơ sở, kênh cũ, app đời cũ, cô / kế toán / marketing).

Phần AN TOÀN của Đ239g vẫn giữ: danh sách hội thoại hiện dòng phụ dưới tên (bé nào, nhóm nào),
nên hai dòng "Cô phụ trách nhóm" của hai con phân biệt được.

## PH2. Ảnh con lúc ra về

**Trường:** *"Chưa thấy update hình ảnh con check out tại trường, chỉ ghi nhận thông báo"*.

**Mã cũ:** máy chủ đã lưu và trả ảnh ra về; màn của gia đình chưa vẽ nó.

**Làm:** màn Điểm danh của gia đình hiện ảnh lúc ra về cạnh ảnh lúc tới lớp.

---

## Còn để chủ dự án quyết (phát sinh khi làm)

1. **Giờ "Bữa sữa chiều"** đang để 15:30 — ảnh mẫu bị cắt ở Bữa chiều 14h00. Bữa trưa lưu một giờ
   11:20; mẫu Excel ghi cả "0–3 tuổi 11h20 / 3–6 tuổi 11h40" ở cột tên bữa.
2. **Ô "Tiền ăn" phía gia đình** (số ngày con ăn ở trường trong tháng) vẫn giữ. Trường muốn bỏ
   luôn phía gia đình thì báo.
3. **Văn phòng điền bổ sung ô nhân thân còn TRỐNG sau khi đã nhận bé** (vd số định danh nhận
   sau): hiện vẫn phải nhờ quản lý cơ sở, vì bài phân quyền bất khả xâm phạm `ho-so-be-ai-sua`
   chặn văn phòng ở MỌI lần sửa nhân thân. Muốn "văn phòng nhập ô trống, quản lý sửa ô đã có"
   thì phải đổi bài đó — cần chủ dự án duyệt.
4. **Bảo lưu dài hơn 12 tháng:** bảo lưu đi đúng đường "Cho nghỉ", nên sau 12 tháng tính từ hôm
   văn phòng BẤM Bảo lưu, gia đình hết xem hồ sơ cũ của con dù bé vẫn "đang bảo lưu". Ngày bắt đầu
   bảo lưu ghi lùi được tối đa 60 ngày; "Thôi bảo lưu, nghỉ hẳn" lùi ngày nghỉ về ngày bắt đầu bảo
   lưu, trừ khi việc lùi làm gia đình hết hạn xem hồ sơ ngay (khi đó giữ ngày đã ghi).
5. **Sau chuyển năm học**, nhóm năm mới chưa có cô và cô chỉ còn nhóm đã đóng → quản lý cơ sở
   không thấy cô nào để phân, phải nhờ ban giám hiệu (như trước Đ239). Có luật an toàn để quản
   lý cơ sở tự phân: "cô không có nhóm đang mở thì hiện với cơ sở X khi MỌI nhóm cô từng dạy đều
   thuộc cơ sở X". Chưa làm.
6. **Hành trình:** tab chương trình có "Kể cho gia đình" nhưng chưa có nút "Suy ngẫm" (gắn lĩnh
   vực, lớp 2) — vẫn làm ở lối phụ "Suy ngẫm cuối ngày". Tiêu đề màn vẫn "Hành trình học tập"
   (tên phân hệ); trường gọi "Hành trình của bé" — đổi thì báo.
7. **Chạy lại `ban-thu`** sẽ tắt Đón trả bé kể cả khi người giữ máy đã bật lại bằng tay.
8. **Hộp thư văn phòng (phương án A) — hai điểm nên biết** (review đối kháng 18/10, không chặn):
   - **Bé chuyển cơ sở:** hộp thư cũ của gia đình vẫn thuộc văn phòng cơ sở CŨ (thiết kế A cố ý
     không buộc hộp thư theo nơi con đang học, để không ai mất lịch sử). Gia đình có thêm dòng
     văn phòng của cơ sở mới; nếu vẫn viết vào hộp thư cũ thì văn phòng cơ sở cũ đọc được tin về
     một bé nay đã ở cơ sở khác. Muốn đóng hộp thư cũ khi bé chuyển thì báo.
   - **Dòng thông báo cũ của kênh văn phòng theo từng bé:** trước Đ239m, mỗi lần văn phòng trả lời
     trong kênh của một bé thì ghi một dòng vào chuông Thông báo của bé đó (kèm 140 chữ đầu). Dòng
     ấy hiện cho mọi phụ huynh HIỆN TẠI của bé, kể cả người gắn sau. Từ Đ239m không ghi dòng mới.
     App chưa chạy thật ở trường nên chỉ có dòng của dữ liệu thử; khi trường dùng thật, bắt đầu
     từ cơ sở dữ liệu mới (không dùng lại dữ liệu của máy thử) là đủ, không cần thêm mã.
9. **Lỗi có từ trước, tìm thấy khi làm đợt này, CHƯA sửa** (đụng bài canh quyền ảnh hoặc ngoài
   phạm vi):
   - "Nhận lại" / "Đi học lại" không mở khoảng lịch sử nhóm từ hôm nay (`lsl.baoDamCoKhoang` gọi
     trước khi bé được bật lại) → khoảng được mở muộn, phủ cả thời gian bé vắng; khi nhóm đóng,
     luật ngày của album có thể cho gia đình thấy ảnh chụp lúc bé không có mặt.
   - ~~Danh sách hội thoại đọc theo `conversation_members`: phụ huynh đã bị gỡ khỏi bé có thể vẫn
     thấy tiêu đề và tin cuối của kênh cũ (mở vào thì bị chặn).~~ **Đã sửa ở Đ239m**: điều kiện
     danh sách lọc kênh theo các bé người này còn đọc được (`nhan-tin-kenh` [16]).
   - Gọi thẳng API "Cho nghỉ" trên bé đã nghỉ đặt lại `leftAt` = hôm nay → kéo dài hạn 12 tháng.
   - Bài giao diện `diem-danh-tra-be` [8] đỏ khi chạy 00:00–06:00 giờ Việt Nam (mốc rà soát
     06:00) — cần đồng hồ giả cho bài.
   - `data/seed.js` (`xoaBangPhanHe`) không xoá các bảng phụ của Cambridge → chạy lại bàn thử
     có thể dính khung / hoạt động cũ vào bài mẫu cùng mã (chỉ máy thử).
   - Màn quản trị còn vài chữ "giáo viên" ("Thêm giáo viên", "Tài khoản giáo viên", "Giáo viên &
     nhân viên" ở Điểm danh) — CLAUDE.md đòi gọi là "cô". Màn đặt mật khẩu mới của tài khoản quản
     trị vẫn viết "để bảo vệ thông tin của con". Phụ huynh tạo không có danh xưng thì tên hiện có
     dấu cách đầu. (Verifier ghi nhận 18/10; chưa sửa.)
