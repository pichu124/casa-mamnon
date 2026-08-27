# CASA Mầm non — kế hoạch xây dựng

> Bản 1.0 · 26/08/2026 · bản đầy đủ có định dạng:
> <https://claude.ai/code/artifact/4866ad4b-bc14-4e85-beac-577c40b82efd>

App thứ hai, xây trên nền đã kiểm chứng của **SchoolConnect** (app 1, trường tiểu
học), cho một trường mầm non **3 cơ sở**. Mục tiêu: **thay hẳn sổ liên lạc giấy**,
rồi bồi thêm phần **hành trình học tập** theo triết lý CASA.

Bản này thay phần *kiến trúc và triển khai* trong tài liệu "CASA Learning
Companion" (làm với ChatGPT). Phần **triết lý giáo dục** của tài liệu đó được giữ
nguyên và đưa vào `CLAUDE.md`.

| | |
|---|---|
| Cơ sở | 3 |
| Giai đoạn | 4 (GĐ 0 → GĐ 3) |
| Tới bản thay được sổ giấy | ~6–8 tuần |
| Hạ tầng | ~3–6 triệu ₫/năm, trường đứng tên |
| Nền dùng lại từ app 1 | ~70% |

---

## 1. Năm quyết định nền — đã chốt

Mọi phần sau của kế hoạch đứng trên năm điều này.

**1. Repo riêng, nhân bản nền từ app 1 — không sửa trực tiếp app 1.**
App 1 đang chạy thật cho trường tiểu học, không được phép rung. App 2 chép phần
nền (đăng nhập, phân quyền, sao lưu, bộ canh, khung kiểm thử, PWA) sang repo mới
rồi phát triển độc lập. Cái giá phải chấp nhận: lỗi phát hiện ở phần nền phải vá
hai nơi — quy ước ở mục 8 và `docs/LOI-NEN-CHUNG.md`.

**2. PWA cho cả ba vai — không làm app native.**
Cô giáo dùng điện thoại cá nhân, người iPhone người Android. App native cho iPhone
nghĩa là 99 USD/năm phí Apple + chờ duyệt mỗi lần sửa. PWA chạy trên cả hai, sửa
xong là mọi người có ngay — app 1 đã chứng minh. Giới hạn thật duy nhất: iPhone
không tự gửi dữ liệu khi app đang đóng — cách né ở mục 10.

**3. Máy chủ đặt tại Việt Nam, trường đứng tên.**
Dữ liệu trẻ 12 tháng – 6 tuổi kèm ảnh, video là nhóm nhạy cảm nhất theo NĐ 13/2023 và Luật
Bảo vệ dữ liệu cá nhân 91/2025 (hiệu lực 01/01/2026). Máy chủ trong nước
(Viettel/VNPT/FPT) là cách gọn nhất để không vướng thủ tục chuyển dữ liệu ra nước
ngoài. Trường đứng tên tài khoản và thanh toán — app không chết vì thẻ cá nhân của
ai đó hết hạn.

**4. Thay sổ giấy là mục tiêu số một.**
GĐ 1 xây trọn lớp vận hành hằng ngày (điểm danh, báo ăn, nhật ký ăn–ngủ, đón trả,
dặn thuốc, thông báo). Cô và phụ huynh có lý do mở app mỗi ngày — rồi phần hành
trình học tập CASA (GĐ 2) mới có đất sống. Đây là chỗ kế hoạch cũ thiếu nhất.

**5. 3 cơ sở = tầng cơ sở có thật trong mô hình.**
Chỉ **một** tầng (bỏ tầng "Organisation" của bản cũ) và **4 vai** thay vì 6:
Chủ trường (thấy cả 3 cơ sở) · Quản lý cơ sở · Cô giáo · Phụ huynh.

**Tên gọi.** Tạm gọi **CASA Mầm non**, repo `casa-mamnon`. Trường chốt tên chính
thức và tên miền — đổi lúc này miễn phí, đổi sau khi phụ huynh đã cài thì phiền.

---

## 2. Một ngày dùng app

Cách kiểm tra nhanh nhất xem app có đáng tồn tại: kể được một ngày trọn vẹn mà
không cần sổ giấy.

| Giờ | Ai | Làm gì trên app |
|---|---|---|
| 7:30–8:15 | Cô giáo | Điểm danh khi đón từng bé — chạm một cái mỗi bé. 8:30 bấm **Chốt báo ăn**: sĩ số ăn hôm nay tự tính, bếp và văn phòng thấy ngay. |
| Trong ngày | Cô giáo | Bé sốt nhẹ → ghi nhật ký sức khỏe, phụ huynh nhận thông báo. Khoảnh khắc hay → chụp ảnh + một dòng ghi chú, **dưới 20 giây**, mất mạng vẫn lưu được. |
| 13:30 | Cô giáo | Nhật ký cả nhóm một lượt (ăn hết suất / ngủ đủ giấc), rồi chỉnh riêng 2–3 bé khác biệt. Mục tiêu: cả nhóm **dưới 5 phút**. |
| 16:00 | Phụ huynh | Mở app: hôm nay con ăn gì, ngủ bao lâu, ảnh hoạt động. Mai bận → gửi **ủy quyền đón**: tên + ảnh người đón hộ, cô thấy khi trả bé. |
| Tối | Phụ huynh | Gửi đơn xin nghỉ, dặn cữ thuốc cho mai. Mỗi tuần một lần: đọc câu chuyện học tập của con (GĐ 2). |
| Bất kỳ | Quản lý cơ sở / Chủ trường | Sĩ số ăn từng cơ sở theo thời gian thực, gửi thông báo (một nhóm / một cơ sở / cả trường), duyệt danh sách bé mới. Chủ trường nhìn được cả 3 cơ sở trên một màn hình. |

---

## 3. Bốn giai đoạn

Mỗi giai đoạn kết thúc bằng một điểm **DỪNG**: người dùng nghiệm thu bằng tiêu chí
ghi sẵn, duyệt rồi mới sang giai đoạn sau — đúng nhịp đã làm app 1.

### GĐ 0 — Dựng nền + phép thử trên điện thoại thật · ≈ 1 tuần

- Tạo repo `casa-mamnon` từ nền app 1: giữ đăng nhập, phân quyền, sao lưu, PWA,
  3 bộ canh tự động, khung kiểm thử; gỡ các phân hệ tiểu học không dùng.
- Sửa mô hình cốt lõi cho mầm non: nhóm lớp theo độ tuổi (nhà trẻ / mầm / chồi /
  lá), **nhiều cô một nhóm** (app 1 là 1 cô 1 lớp — đây là thay đổi nền lớn nhất,
  làm đúng quy trình commit riêng), tầng cơ sở + vai quản lý cơ sở.
- Viết `CLAUDE.md` mới: Nguyên tắc số 1 của app 1 + **5 QUY TẮC** giáo dục của bản
  CASA + quy định "test đỏ là code sai, cấm nới test".
- Seed kể **một câu chuyện nhất quán**, thuần Việt: bé An, nhóm Chồi 2, cơ sở 1 —
  chạy xuyên suốt mọi màn hình và mọi bài test.
- **Phép thử quyết định**, trên iPhone và Android thật của cô giáo: chụp ảnh + ghi
  chú, tắt mạng, đóng app, mở lại → tự gửi lên, không mất, không nhân đôi.

**Xong khi:** phép thử đạt trên cả hai loại máy, bộ kiểm thử nền xanh, người dùng
duyệt. Phép thử trượt ở đâu → dừng lại bàn, không lao tiếp.

### GĐ 1 — Thay sổ giấy: lớp vận hành hằng ngày · ≈ 3–5 tuần

- **mới** Điểm danh + chốt báo ăn theo ngày — việc bắt buộc mỗi sáng, số liệu cho
  bếp và cho tiền ăn sau này.
- **mới** Nhật ký ngày: ăn, ngủ, vệ sinh, sức khỏe — nhập cả nhóm một lượt, chỉnh
  riêng từng bé. Đây chính là trang sổ giấy phụ huynh đọc mỗi chiều.
- **mới** Đón trả + ủy quyền đón: ai được đón bé, ủy quyền một lần có ảnh — chuyện
  an toàn, sổ giấy làm rất kém.
- **có sẵn** Dặn thuốc, xin nghỉ, thông báo, album ảnh, thực đơn — mang từ app 1
  sang, chỉnh cho mầm non (ví dụ thông báo theo cơ sở).

**Xong khi:** MỘT nhóm thí điểm chạy song song với sổ giấy đủ 2 tuần, sau đó cô
nhóm đó xác nhận không cần ghi sổ nữa. Đó là định nghĩa "thay được sổ giấy" —
không phải demo đẹp.

### GĐ 2 — Hành trình học tập, phần hồn của CASA · ≈ 3–4 tuần

- **Quan sát nhanh <20 giây**: ảnh + ghi chú, chọn bé, lưu — làm được khi mất mạng.
  Chỉ ảnh và chữ ở bản đầu; video và ghi âm để sau.
- **Suy ngẫm sau**: cuối ngày cô mở lại, gắn lĩnh vực phát triển, đánh dấu minh
  chứng, quyết định có kể cho phụ huynh không. Chỉ tiêu **≤ 3 phút** một quan sát —
  có bài test canh.
- **5 trạng thái đánh giá**, tên tiếng Việt (đề xuất, trường duyệt): Chưa dạy ·
  Chưa quan sát thấy · Đang hình thành · Đã vững · Vượt trội. Kèm quy tắc sắt:
  "Chưa quan sát thấy" không bao giờ hiển thị như thất bại; **không phần trăm,
  không xếp hạng** — có bài test quét giao diện canh điều này.
- **Ba lớp dữ liệu**: ghi chú riêng của cô — nhận định chuyên môn — câu chuyện kể
  cho gia đình. Ghi chú riêng của cô **không bao giờ** lộ sang phụ huynh; có bài
  test phân quyền riêng.
- Màn **soạn chủ đề tuần** cho cô (kèm nút chép tuần trước) — bài học B9 của app 1:
  màn hình nào hiển thị dữ liệu thì phải có người tạo được dữ liệu đó qua giao diện.
- **Cùng con ở nhà**: gợi ý hoạt động 5–10 phút, đồ trong nhà, không màn hình — và
  không bao giờ gọi là "bài tập".

**Xong khi:** nhóm thí điểm dùng thật 2 tuần: mỗi bé có ít nhất một câu chuyện học
tập phụ huynh đọc được, và cô xác nhận phần suy ngẫm không thành gánh nặng buổi tối.

### GĐ 3 — Hoàn thiện dài hạn, làm rải theo nhu cầu thật

- Tiền ăn theo ngày có mặt + đối soát cuối tháng (số liệu đã có từ GĐ 1).
- Báo cáo theo mẫu của phòng GD — xin mẫu thật của trường trước, app xuất đúng mẫu
  đó để cô không phải làm hai hệ đánh giá song song.
- Video, ghi âm giọng nói trong quan sát — sau khi ảnh đã chạy ổn và đo được dung
  lượng thật.
- **AI hỗ trợ** (soạn nháp câu chuyện, gợi ý lĩnh vực) — làm **cuối cùng**, và chỉ
  khi đủ 4 điều kiện pháp lý ở mục 6. Cô luôn là người duyệt; AI không bao giờ tự
  đánh giá một đứa trẻ.

Nguyên tắc: mỗi mục ở đây chỉ làm khi trường yêu cầu thật — không làm trước "cho đủ".

---

## 4. Giữ gì, bỏ gì từ bản kế hoạch ChatGPT

Bản của ChatGPT có phần triết lý rất tốt và phần kiến trúc không hợp hoàn cảnh.

**✅ Giữ — đưa nguyên nghĩa vào `CLAUDE.md`**

- 5 QUY TẮC giáo dục: quan sát ≠ đánh giá · chưa thấy ≠ không làm được · AI gợi ý ≠
  cô quyết định · không phần trăm/xếp hạng · đánh giá phải dẫn tới hành động.
- Ba lớp dữ liệu (thô — nhận định — kể cho gia đình).
- Capture <20 giây, nghĩ sau; nháp dở dang được phép.
- "Bé đáng chú ý" chỉ là gợi ý, không bao giờ là chỉ tiêu.
- Seed kể một câu chuyện nhất quán xuyên mọi màn hình.
- 6 bài test phân quyền tối thiểu; danh sách VIỆC CẤM; nguyên tắc quyết định khi phân vân.
- Dừng sau kiến trúc; xây từng lát dọc trọn vẹn; AI để cuối.

**❌ Bỏ — và lý do một dòng**

- **Supabase** — máy chủ ngoài VN, ảnh trẻ không nằm trong backup tự động, phí tháng.
- **React Native/Expo + App Store** — 99 USD/năm + duyệt vài ngày mỗi lần sửa; PWA
  làm được việc cần.
- **Next.js + Turborepo 8 package** — bộ máy cho đội đông người; một người thì mỗi
  giờ chăm nó là một giờ không sửa app.
- **6 vai + tầng Organisation** — co về 4 vai + 1 tầng cơ sở.
- **Giao diện quản lý phiên bản chương trình học** — giữ cột trong dữ liệu, bỏ màn
  hình; trường đơn đổi chương trình rất chậm.
- **Quy định bằng văn xuôi** — thay bằng máy canh + bài test (mục 8).

---

## 5. Khác biệt kỹ thuật so với app 1

Nền giống nhau ~70%. Đây là 30% khác, xếp theo mức đụng chạm.

| Khác biệt | Cách xử lý |
|---|---|
| **Nhiều cô một nhóm** *(đụng nền)* | App 1 gắn cứng 1 cô – 1 lớp trong phần nền dùng chung. Mầm non 2–3 cô/nhóm → thêm bảng phân công cô–nhóm **bên cạnh**, chuyển dần từng chỗ gọi theo đúng quy trình 3 bước "thêm mới → chuyển → xóa cũ", mỗi bước một commit riêng. Làm ngay ở GĐ 0 vì mọi thứ khác đứng trên nó. |
| Tầng cơ sở | Bảng cơ sở + mã cơ sở trên nhóm lớp; quản lý cơ sở chỉ thấy cơ sở mình; chủ trường thấy cả ba. Mỗi ranh giới có bài test phân quyền riêng. |
| Nhật ký ngày nhập theo nhóm | Phân hệ mới hoàn toàn — mẫu "cả nhóm một lượt, chỉnh lẻ từng bé" cùng họ với "Cả lớp có mặt" đã làm (mặc định không ghi đè phần cô đã chỉnh riêng). |
| Điểm danh gắn báo ăn | Thêm bước "chốt báo ăn" trước một giờ quy định; số liệu này về sau là gốc tính tiền ăn — phải đúng ngay từ đầu, có nhật ký ai chốt lúc nào. |
| Hàng đợi quan sát offline | Lưu nháp trong máy (IndexedDB), tự gửi khi có mạng và khi mở app; mã sinh phía máy để gửi lại không tạo bản trùng. Đơn giản có chủ ý. |
| Ảnh: nén trước khi gửi | Mầm non chụp nhiều hơn tiểu học hẳn. Nén phía máy trước khi tải lên, trần dung lượng mỗi album, đo dung lượng thật ở nhóm thí điểm trước khi mở video. |

---

## 6. Pháp lý và dữ liệu trẻ em

Trẻ 12 tháng – 6 tuổi + ảnh + video = nhóm dữ liệu được luật bảo vệ chặt nhất.

- **Máy chủ tại Việt Nam** (quyết định nền số 3) — né toàn bộ thủ tục chuyển dữ
  liệu ra nước ngoài. Nhân dịp này, **app 1 cũng nên dời về cùng nhà cung cấp**:
  VPS Oracle hiện tại gần như chắc chắn nằm ngoài VN, cùng một vấn đề. Hai app một
  VPS — rẻ và một mối trông nom.
- **Giấy đồng ý tiếng Việt, tách từng mục đích**, phát cho phụ huynh ký khi nhập
  học: ① hồ sơ học tập của con — ② chia sẻ ảnh/câu chuyện cho gia đình — ③ dùng ảnh
  cho truyền thông/tuyển sinh. Mỗi ô tích riêng; ô ③ **mặc định KHÔNG tích**. Rút
  lại được bất cứ lúc nào — app phải định nghĩa rõ chuyện gì xảy ra khi rút.
- **Quy tắc ảnh nhóm** (gần như mọi ảnh mầm non là ảnh nhóm): một ảnh chỉ hiện cho
  gia đình khác khi **mọi bé trong ảnh** đều có đồng ý chia sẻ — có bài test canh,
  xử ở tầng dữ liệu chứ không che ở giao diện.
- **Hồ sơ đánh giá tác động theo Điều 24 NĐ 13/2023**: nghĩa vụ của trường, nộp
  trong 60 ngày kể từ khi chạy thật. Phần mô tả kỹ thuật soạn sẵn từ tài liệu app;
  trường nên nhờ một đơn vị tư vấn rà trước khi nộp.
- **Bé ra trường**: học theo app 1 — gia đình còn xem được hồ sơ **12 tháng**, sau
  đó đóng đường xem (không xóa; trường vẫn lưu theo quy định).
- **Điều kiện bật AI** (GĐ 3): ① có ô đồng ý riêng cho xử lý bằng AI, bé chưa có
  đồng ý thì hệ thống từ chối ngay ở tầng dịch vụ — không phải ở giao diện; ② thay
  tên bé bằng mã trước khi gửi bất cứ thứ gì ra ngoài; ③ chỉ chọn nhà cung cấp AI
  cam kết không lưu và không dùng dữ liệu để huấn luyện; ④ luồng AI được ghi vào hồ
  sơ đánh giá tác động. **Thiếu một trong bốn — không bật.**

---

## 7. Chi phí — trường đứng tên toàn bộ

| Khoản | Ước tính/năm | Ghi chú |
|---|---|---|
| VPS Việt Nam (4 GB RAM, chạy chung app 1 + app 2) | 2,4–4,8 triệu ₫ | Viettel IDC / VNPT / FPT, ~200–400k/tháng. Đứng tên và email của trường. |
| Tên miền (.vn hoặc .com) | 300–800 nghìn ₫ | Đứng tên trường. |
| Nơi cất bản sao lưu thứ hai (ngoài VPS) | 0–600 nghìn ₫ | Kéo về máy tính trường mỗi đêm như app 1 đang làm — có thể 0 đồng. |
| **Tổng** | **≈ 3–6 triệu ₫/năm** | Cho cả hai app. Phương án cũ (Supabase + Apple + Google): ≈ 15–20 triệu ₫/năm và tăng theo lượng ảnh. |

Ước lượng ảnh: 3 cơ sở mầm non chụp nhiều — dự trù ổ đĩa **80–160 GB** ngay từ đầu
và đo số thật ở nhóm thí điểm trước khi mở tính năng video.

---

## 8. Cách làm việc — kế thừa những gì đã chứng minh

- **Máy canh thay lời hứa.** Ba bộ canh của app 1 chuyển sang nguyên vẹn: chặn dữ
  liệu trẻ em lọt lên GitHub (không có đường thoát), chặn trộn commit phần nền với
  tính năng, canh "hình dạng" phần nền không bị đổi lén. Thêm cho app 2: bài test
  quét giao diện cấm hiển thị phần trăm/điểm số/xếp hạng — QUY TẮC 4 được canh bằng
  máy chứ không bằng trí nhớ.
- **Test đỏ nghĩa là code sai.** Cấm nới test cho qua; riêng nhóm test phân quyền
  và 5 QUY TẮC giáo dục là bất khả xâm phạm.
- **`docs/TIEN-DO.md` + commit + push sau mỗi phần** — phiên đứt giữa chừng thì
  phiên sau đọc lại là biết đứng đâu.
- **Điểm DỪNG có tiêu chí đo được** ở cuối mỗi giai đoạn (mục 3) — nghiệm thu bằng
  tiêu chí, không phải bằng cảm giác "trông ổn".
- **Quy ước vá nền hai nơi**: xem `docs/LOI-NEN-CHUNG.md`.

---

## 9. Việc của trường — không phải việc code, nhưng thiếu là app đứng

| # | Việc | Cần trước |
|---|---|---|
| 1 | Chụp lại sổ liên lạc giấy đang dùng — vài trang thật của vài nhóm. | GĐ 0 |
| 2 | Danh sách bé + nhóm + cô của cả 3 cơ sở (Excel — mẫu sẽ đưa, giống app 1). | GĐ 1 |
| 3 | Đăng ký VPS Việt Nam + tên miền, bằng email của trường. Chốt tên app. | GĐ 0 |
| 4 | Duyệt bảng thuật ngữ tiếng Việt (5 trạng thái đánh giá, tên các mục). | GĐ 2 |
| 5 | Phát và thu giấy đồng ý phụ huynh ký. | trước khi chạy thật |
| 6 | Hồ sơ đánh giá tác động Điều 24 (nên có tư vấn rà). | 60 ngày sau khi chạy thật |
| 7 | Chọn nhóm thí điểm: một nhóm, cô chịu thử cái mới, chạy song song sổ giấy 2 tuần. | GĐ 1 |
| 8 | Cung cấp mẫu báo cáo phòng GD yêu cầu. | GĐ 3 |

---

## 10. Rủi ro thật và cách né

| Rủi ro | Cách né — cài sẵn trong kế hoạch |
|---|---|
| iPhone không tự gửi dữ liệu khi app đang đóng | Hàng đợi tự gửi mỗi khi cô mở app — mà cô mở app điểm danh mỗi sáng nên độ trễ tối đa là một buổi. Phép thử GĐ 0 đo đúng điều này trên máy thật; không đạt thì dừng lại bàn (đường dự phòng: gói Capacitor như app 1 đã làm cho Android). |
| Cô thấy nhập liệu phiền hơn ghi sổ → bỏ xó | Chỉ tiêu đo được ngay trong bài test: nhật ký cả nhóm < 5 phút, quan sát < 20 giây, suy ngẫm ≤ 3 phút. Thí điểm một nhóm trước, nghe cô chê, sửa, rồi mới nhân rộng. |
| Ảnh chiếm đầy ổ đĩa | Nén phía máy, trần mỗi album, theo dõi dung lượng trong bộ kiểm tra máy chủ hằng tháng (có sẵn từ app 1), đo thật trước khi mở video. |
| Lỗi phần nền phải vá hai repo | `docs/LOI-NEN-CHUNG.md`: chỉ lỗi bảo mật/mất dữ liệu bắt buộc vá cả hai, có danh sách chung để không quên. |
| Phần học tập (GĐ 2) thành gánh giấy tờ cho cô | Không chỉ tiêu số quan sát; "bé đáng chú ý" chỉ gợi ý; nhịp câu chuyện học tập công bố với phụ huynh là 2 tuần/lần chứ không phải hằng ngày. |

---

*Ước lượng thời gian dựa trên nhịp thực tế đã xây SchoolConnect (14 hạng mục,
1.141 bài kiểm thử). Các nội dung pháp lý là định hướng kỹ thuật, không thay cho
tư vấn pháp lý của trường.*
