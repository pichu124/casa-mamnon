# Góp ý của trường ngày 20/10/2026 — "Ứng dụng My Casa — feedback 20.10.2026" (14 trang)

Nguồn: tệp PDF chủ dự án gửi ngày 26/10/2026. Tệp gốc **không** đưa vào kho mã (ảnh chụp
màn hình mang tên cô và bé thật). Cả đợt mang số **Đ241**, mỗi phần một chữ cái. Bảng dưới
là kết quả đối chiếu từng mục với mã (ba lượt đọc mã độc lập, 26/10), chia đợt làm.

Cỡ việc: **S** ≤ 1 giờ · **M** ≤ nửa ngày · **L** hơn nửa ngày.

## Tóm tắt theo đợt

| Đợt | Gồm | Ghi chú |
|---|---|---|
| **1 — lỗi và gọn màn hình** | N7, N8, F5, P1, P2, O3 (lỗi); A1, A2, C1, D1, D2, J2, B2, B3, H1, O1, O5, Q1, K2, N6, B6, F4 (thu hồi), G1 | Không đổi luật, không đụng tệp dùng chung |
| **2 — đổi cách làm việc hằng ngày** | D3 (điểm danh bấm tên), E1 + D4 (duyệt nghỉ từng ngày, tự ghi điểm danh), B1 + B4 + B5 + B7 (Hình ảnh ghi nhanh, video, ảnh tới gia đình), F2 + F3 (nhắn nhiều nhà, văn phòng mở tin), G2, K1, O2, O4 | Một số mục cần trường trả lời (cuối tệp) |
| **3 — dựng lại** | N1–N5 (kho bài học), L1–L6 (Quản trị), M1 (album) | Đụng bài test phân quyền: ghi lý do, chủ dự án duyệt |
| **4 — Học phí** | I1–I4 | Dựng trên `docs/hoc-phi-tu-dong/DAC-TA.md` bản 3.1 (đã có bản tính tham chiếu) |
| **Chờ quyết định** | H2 (cảnh báo màu cân đo), F1 (cấp trên đọc tin nhắn) | H2 đụng thẳng QUY TẮC 4 |

## Từng mục

| # | Trường nói | Mã hôm nay | Làm gì | Cỡ | Đợt |
|---|---|---|---|---|---|
| A1 | Bỏ ô "Đón trả bé", "Nhân sự & chấm công" khỏi trang chủ | Mỗi phân hệ bật là một ô (`public/js/views/dashboard.js`). `dontra` mặc định tắt, máy thử đang bật tay; `nhansu` không được tắt vì giờ chụp cổng chép sang bảng công | Đón trả: tắt ở Quản trị → Tính năng (dữ liệu giữ). Nhân sự: cờ mới "ẩn khỏi lưới trang chủ", vẫn vào được từ Quản trị | S | 1 |
| A2 | Trang chủ quản trị trên điện thoại: gập "Hôm nay theo cơ sở", bấm cơ sở mới mở | Mở sẵn cả 3 cơ sở | Mỗi cơ sở một khối gập | S | 1 |
| B1 | Bỏ "Chủ đề tuần"; "Suy ngẫm cuối ngày" → "Hình ảnh ghi nhanh" | Hai nút phụ dưới tiêu đề Hành trình. Màn Chủ đề tuần là chỗ DUY NHẤT soạn chủ đề tuần đang hiện ở Lịch sinh hoạt | Bỏ nút; chỗ soạn chủ đề tuần chuyển sang Lịch sinh hoạt (văn phòng) | M | 2 |
| B2 | Bỏ "Nói để ghi" | Nút 🎤 dùng nhận dạng giọng nói của trình duyệt | Bỏ nút, giữ câu nhắc dùng micro của bàn phím | S | 1 |
| B3 | Bỏ phần suy ngẫm (đánh giá) | Nút "Suy ngẫm" trên mỗi quan sát (lĩnh vực, mức, "ở lớp cô làm gì tiếp") | Ẩn nút; dữ liệu và API giữ | S | 1 |
| B4 | Ghi nhanh ảnh **và video**; lưu ở "Hình ảnh ghi nhanh"; chỉ hiện mục chưa kể cho gia đình, không theo ngày; kể xong thì biến mất | Ghi nhanh chỉ nhận ảnh; "Suy ngẫm cuối ngày" lọc theo một ngày | Đường mới `cho-ke` gộp: ghi nhanh chưa dùng + nháp chưa gắn bé + quan sát chưa công bố, chỉ của cô đang đăng nhập; video ≤ 8MB | L | 2 |
| B5 | Nút (+): ghi nhanh chỉ cần "con đang làm gì", hoặc chỉ ảnh/video | Bắt buộc có mô tả | Cho lưu chỉ ảnh/video; vào "Hình ảnh ghi nhanh" | M | 2 |
| B6 | Văn phòng / hiệu trưởng cũng lưu ảnh về album được | Chỉ cô phụ trách nhóm của album | Thêm quản trị có quyền với nhóm của album | S | 1 |
| B7 | **Lỗi:** ảnh trong câu chuyện kể cho gia đình không hiện phía phụ huynh | Do thiết kế: ảnh quan sát là lớp 1 (ghi chú thô), không bao giờ tới gia đình | Cô tích "gửi kèm ảnh/video" khi kể → bản chép riêng thuộc lớp 3; ảnh nhóm lọc theo đồng ý của mọi bé trong ảnh ở tầng dữ liệu | M–L | 2 |
| C1 | Hồ sơ bé: bỏ nhóm máu | Có ở hồ sơ, phiếu nhận bé, phiếu sửa, mẫu CSV | Ẩn khỏi màn hình và mẫu; cột dữ liệu giữ | S | 1 |
| D1 | Gập "Cần gọi xác nhận" | Thẻ đỏ mở sẵn | Khối gập, tiêu đề giữ số bé | S | 1 |
| D2 | Bỏ "Mở Đón trả bé" | Thẻ chỉ đường ở màn văn phòng và phụ huynh | Bỏ | S | 1 |
| D3 | Bấm tên bé lần 1 = vào lớp (màn xem lại: ảnh, ghi chú, nút "Vào lớp"); lần 2 = ra về; giữ gỡ ảnh | 5–6 nút mỗi dòng, chụp xong gửi ngay | Như trường tả; ô ghi chú gửi kèm (ghi rõ gia đình đọc được, khác ô "🔒 Lưu ý" nội bộ) | M | 2 |
| D4 | Đơn nghỉ được duyệt tự cập nhật điểm danh từng ngày | Chỉ ghi khi có người bấm "Chốt sổ vắng" (chỉ hôm nay) | Việc chạy cuối mỗi ngày: bé có đơn đã duyệt, chưa có dòng → ghi theo cờ có phép từng ngày (E1) | M | 2 |
| D5 | Cài ngày nghỉ lễ, Tết → nghỉ có phép, hoàn tiền ăn | **Đã có**: "Lịch nghỉ của trường" ở cuối màn Xin phép | Thêm lối vào từ Điểm danh; tự ghi điểm danh ngày nghỉ cùng việc của D4 | S–M | 2 |
| E1 | Duyệt đơn chi tiết từng ngày (sau 7h → ngày đầu không phép, không hoàn; T7/CN không hoàn) | Một con số "Số ngày được hoàn" | Bảng mới theo ngày; màn duyệt mỗi ngày một dòng, gợi ý theo giờ gửi đơn và thứ; đơn cũ đọc như trước | L | 2 |
| F1 | Cấp trên xem được cuộc trò chuyện cô ↔ phụ huynh | Cố ý cấm khi cuộc đang mở (Đ192) | **Chờ quyết định** (quyền riêng tư) | M | — |
| F2 | Cô nhắn theo nhóm phụ huynh tự chọn | Máy chủ có phòng chung, chưa có nút | Gửi một lượt, mỗi nhà một cuộc riêng (không lộ tên các nhà với nhau) | M | 2 |
| F3 | Văn phòng tạo tin nhắn với 1 hay nhiều phụ huynh — "không gửi được" | **Đã xác định**: danh sách người nhận của văn phòng luôn rỗng | Văn phòng mở hộp thư với một hay nhiều phụ huynh (mỗi nhà một cuộc). Đổi bài phân quyền `nhan-tin-kenh` [ghi lý do] | M–L | 2 |
| F4 | Thu hồi / sửa tin đã gửi | Máy chủ có thu hồi, không có nút; không có sửa | Nút Thu hồi (đợt 1); Sửa có ghi vết "đã chỉnh sửa" (đợt 2) | S + M | 1, 2 |
| F5 | **Lỗi:** phụ huynh nhắn tới mà không có chấm đỏ | **Đã xác định**: cô chỉ được ghi vào cuộc khi mở màn Nhắn tin, nên trước đó huy hiệu đếm 0 | Ghi thành viên cho cô / văn phòng ngay khi gia đình lập cuộc và trước khi đếm | S–M | 1 |
| F6 | Nhắn "Cô nước ngoài" thì ai trả lời? | Chỉ cô được khai vai "nước ngoài" ở đúng nhóm đó; nhóm chưa khai thì không ai đọc | Ẩn ô khi nhóm chưa có cô nước ngoài (trả lời trường ở cuối tệp) | S | 1 |
| G1 | Danh sách phụ huynh chưa trả lời khảo sát | Chỉ có danh sách đã trả lời | Thêm danh sách chưa trả lời, theo phạm vi người xem | S–M | 1 |
| G2 | Bấm thông báo khảo sát là làm luôn | Mở hộp chi tiết, không có liên kết | Lưu liên kết của thông báo (bảng phụ); mở thẳng khảo sát | M | 2 |
| H1 | Màn phụ huynh: bỏ danh sách khám định kỳ / tiêm chủng | Phụ huynh thấy cả danh sách ghi nhận (kể cả sự cố y tế) | Bỏ khám định kỳ và tiêm chủng; giữ dòng sự cố y tế (chuông thông báo y tế dẫn về đây) | S | 1 |
| H2 | Cảnh báo màu nguy cơ béo phì / suy dinh dưỡng | BMI chỉ là con số; đánh giá thể trạng do y tế tự gõ | **Chờ quyết định**: đụng thẳng QUY TẮC 4 | M | — |
| I1 | Bỏ ô Tiền ăn ở app phụ huynh | Phân hệ `tienan` có vai phụ huynh | Bỏ vai phụ huynh; bảng đối chiếu phía trường giữ | S | 4 |
| I2 | Bốn tab Biểu phí / Khoản phí / Chiết khấu / Cài đặt học phí; cây cơ sở → lớp → bé | Một trang, chọn bé bằng ô chọn phẳng | Dựng 4 tab trên các đường đang có | L | 4 |
| I3 | Tiền ăn thu theo quý/tháng, chỉ T2–T6 | Chỉ đếm ngày, không tính tiền | Đơn giá × ngày T2–T6, trừ ngày hoàn | M | 4 |
| I4 | Tính biểu phí tự động (chu kỳ, ưu đãi lũy tiến, trần, tách dòng) | App chưa cài phần nào; đặc tả 3.1 và bản tính tham chiếu đã có | Đưa bản tính vào app (số nguyên), phiếu nháp → kế toán duyệt → gửi | L | 4 |
| J1 | "Vẫn chưa link thực đơn từng bữa để cô nhận xét" | Có từ Đ239b: mỗi bữa có dòng món ở đầu bước; gia đình đọc "Bữa sáng: … — con ăn hết" | Đưa tên món vào ngay cạnh ô của từng bé; kiểm máy thử đã lên bản Đ239b chưa | S | 1 |
| J2 | Bỏ theo dõi bỉm | Tab Vệ sinh của nhóm nhà trẻ | Ẩn; ngày cũ có số vẫn hiện | S | 1 |
| K1 | Ngày công cô: ≥ 8 tiếng = 1 công; nửa ngày 7h–14h hoặc 12h–18h; quên chấm thì giải trình | Chụp ảnh vào là 1 công, không xét giờ | Tính công từ giờ vào/ra; thiếu giờ thì gắn "cần giải trình" | M–L | 2 |
| K2 | Ô chọn bé ở Xuất báo cáo chưa gọn | Ô tìm + hộp danh sách 5 dòng | Chọn theo Cơ sở → Nhóm → Bé | S | 1 |
| L1 | Tab Tài khoản gộp, theo phân quyền; quyền cấp lại mật khẩu mới; bỏ quyền cô cấp lại MK phụ huynh | Ba chỗ cấp lại MK; văn phòng không có `/api/accounts` | Viết lại luật cấp lại MK; thêm quyền cho văn phòng (sửa `lib/db.js`, commit riêng); đổi bài phân quyền [ghi lý do] | L | 3 |
| L2 | Tab Thông tin bé/nhân sự; hồ sơ cô (CCCD, ngày sinh, địa chỉ); nhập hàng loạt cô | Hồ sơ cô ở Nhân sự (chỉ hiệu trưởng, nhân sự xem); chưa nhập cô hàng loạt | Như trường tả; quyền xem hồ sơ cô đổi sang cấp 1, quản lý cơ sở, văn phòng cơ sở | L | 3 |
| L3 | Tổng quan ngày lấy chấm công cô từ điểm danh ảnh | Đọc bảng công của Nhân sự | Đọc thẳng giờ chụp cổng, giữ nguồn cũ | M | 3 |
| L4 | Tab Cài đặt đánh giá (quản lý cơ sở, cấp 1) | Thẻ nằm trong tab Cơ sở; một bộ cho cả trường | Tách tab | S | 3 |
| L5 | Tab Cơ sở chỉ cấp 1 | Đã có tên, địa chỉ, hotline, email | Chuyển các thẻ khác ra; ẩn tab | S | 3 |
| L6 | Quan tâm, Tính năng, Năm học, Nhật ký giữ | Mọi tài khoản quản trị thấy đủ 10 tab | Lọc tab theo chức vụ | S | 3 |
| M1 | Ai cũng tạo album / đăng ảnh vào album chung | Chỉ cô phụ trách nhóm | Mở cho văn phòng, ban giám hiệu, cô khác theo phạm vi cơ sở; phụ huynh chưa (ảnh mặt trẻ) | M | 3 |
| N1 | Kho bài học gập theo lĩnh vực con; Cambridge: Communication and Language / Maths / Let's Explore; PE: Vận động thô / tinh | Cambridge và P.E mỗi bên một góc; kho không gập được | Thêm góc; gập từng lĩnh vực; bài cũ chuyển góc qua màn hình, không xoá | L | 3 |
| N2 | Kho bài 0–3; nhà trẻ dùng Tiếng Anh thay Cambridge | Nhà trẻ dùng tạm kho 3–4 | Thêm lứa 0–3 | M | 3 |
| N3 | Lưu vết các tháng trước để lập tháng sau | Chỉ có "chép tháng trước" và gợi ý | Hiện 2–3 tháng gần nhất dưới thẻ từng bé | M | 3 |
| N4 | Mỗi bài một hàng, có số thứ tự | Nút chip xếp ngang | Danh sách đánh số | M | 3 |
| N5 | Đổi thứ tự bài trong kho | Bài mới luôn xuống cuối | Nút lên / xuống | S–M | 3 |
| N6 | Nhìn lại cuối tháng: thêm "Mở rộng ở tháng sau" | Chỉ dạy mới / ôn tập | Thêm | S | 1 |
| N7 | **Lỗi:** "Duyệt (0)" nhưng có 1 bé chờ | **Đã xác định**: số đếm theo nhóm đang chọn, danh sách gom mọi nhóm | Đếm cùng nguồn với danh sách | S | 1 |
| N8 | **Lỗi:** giaovien2 "Không có quyền xem kế hoạch của nhóm này" | **Phỏng đoán mạnh**: màn Kế hoạch giữ nhóm của tài khoản đăng nhập trước trên cùng máy | Bỏ nhóm cũ khi nó không thuộc tài khoản hiện tại | S | 1 |
| O1 | Ô viết to hơn trên máy tính | Ô 2–5 dòng | Cao, rộng hơn trên màn rộng | S | 1 |
| O2 | Bố cục "Bài học trong tháng của con: • Xúc hạt (học mới)…" rồi "Nhận xét của cô" | Một dòng nối dài kèm chữ quy ước | Như trường tả | S–M | 2 |
| O3 | "Mời chữ từ Kế hoạch của bé" lấy gì? | **Đã xác định**: chỉ đọc ô gõ tay, bỏ qua bài đã tích | Gộp bài đã tích vào chữ mời | S | 1 |
| O4 | Gửi quản lý cơ sở duyệt trước | **Đã có** bước duyệt, nhưng mọi tài khoản quản trị (kể cả văn phòng) duyệt được | Chỉ quản lý cơ sở và ban giám hiệu duyệt | S | 2 |
| O5 | Bỏ phần cô ký tên | Ô "Cô ký tên", tên in cuối "Cô kể thêm" | Ẩn; dữ liệu giữ | S | 1 |
| P1 | **Lỗi:** báo 1 thông báo mà vào không thấy; có tin mới không có chấm đỏ | Vế 1 **phỏng đoán mạnh**: huy hiệu đếm mọi tin riêng về con, danh sách chỉ tải 50 tin. Vế 2 chưa dựng lại được | Huy hiệu và danh sách cùng một cửa sổ; "Đọc tất cả" hiện khi huy hiệu còn số | S–M | 1 |
| P2 | **Lỗi:** phụ huynh bé mới nhập học thấy thông báo cũ | **Đã xác định**: lọc thông báo không có mốc thời gian | Chỉ thông báo từ ngày tài khoản phụ huynh được tạo (thông báo ghim vẫn hiện) | S–M | 1 |
| Q1 | Hiện giờ phụ huynh gửi lời dặn thuốc | Có cột thời gian, chưa hiện | Hiện "gửi lúc HH:MM dd/mm" | S | 1 |

## Trả lời câu hỏi của trường

- **F6 — Nhắn "Cô nước ngoài" thì ai trả lời?** Cô được khai vai "Cô nước ngoài" ở đúng nhóm
  của bé (Cài đặt → Tài khoản & phân quyền → phân cô vào nhóm). Nhóm chưa khai cô nào thì hiện
  chưa ai đọc được tin đó. Từ đợt 1: nhóm chưa có cô nước ngoài thì dòng này hiện mờ kèm câu
  "Nhóm của bé hiện chưa có cô nhận tin ở mục này", và app không cho gửi vào đó (trước đây gửi
  được mà không ai đọc). Ẩn hẳn dòng này cần sửa một bài kiểm thử phân quyền — chờ chủ dự án.
- **O3 — "Mời chữ" lấy từ đâu?** Từ Kế hoạch của bé cùng tháng. Trước đây nút chỉ đọc ô gõ tay
  "Việc khác ngoài danh mục" nên báo "chưa có nhận xét nào"; từ đợt 1 nút đọc cả các bài đã tích.
- **D5 — Cài ngày nghỉ lễ?** Đã có: màn Xin phép, kéo xuống cuối, thẻ "Lịch nghỉ của trường".

## Câu hỏi còn chờ trường

1. **E1** — mốc 7h tính theo giờ gửi đơn của chính ngày nghỉ đầu? Có ngoại lệ (ốm đột xuất)?
2. **D3** — ô ghi chú lúc vào lớp: gia đình có đọc được không (mặc định: có)?
3. **I3** — đơn giá tiền ăn một ngày, có khác theo cơ sở / lứa không; thu trước rồi hoàn, hay trừ vào kỳ sau?
4. **I4** — các giả định G1–G22 ghi trong `docs/hoc-phi-tu-dong/Tinh-hoc-phi-tu-dong.xlsx`.
5. **K1** — 8 tiếng có trừ nghỉ trưa? Ai duyệt giải trình?
6. **M1** — "ai cũng tạo album" có gồm phụ huynh không?

## Kết quả đợt 1 (26/10/2026)

Xong: A1 (ô Nhân sự ẩn khỏi trang chủ, vào ở Cài đặt → Phần việc khác; ô Đón trả bé: trường
tắt ở Quản trị → Tính năng), A2, B2, B3, C1 (trừ phiếu nhận bé mới), D1, D2, F4 (nút Thu hồi),
F5, G1, H1, J1, J2, K2, N6, N7, N8, O1, O3, O5, P1, P2, Q1.

Làm một phần, phần còn lại chờ chủ dự án:
- **B6** — ban giám hiệu và quản lý cơ sở lưu ảnh về album được; tài khoản *Văn phòng cơ sở*
  chưa (chức vụ này không mở được Hành trình; mở ra là đọc được cả ghi chú thô của cô).
- **C1** — phiếu nhận bé mới còn ô Nhóm máu: một bài kiểm thử phân quyền đang đòi ô đó.
  Cũng cần hỏi: tệp xuất danh sách cho Phòng có còn cần cột Nhóm máu không.
- **F6** — xem câu trả lời ở trên.
- **F5** — tin gia đình gửi TRƯỚC bản sửa: cô chưa từng mở Nhắn tin thì chưa có chấm đỏ cho
  tới khi gia đình nhắn thêm hoặc cô mở Nhắn tin một lần.
- **P2** — mốc là đầu ngày tạo tài khoản phụ huynh; tin riêng về con không áp mốc. Máy thử dựng
  dữ liệu mẫu từ trước thì phụ huynh mẫu chỉ còn thấy thông báo ghim và tin mới — dựng lại
  dữ liệu mẫu để thử.

