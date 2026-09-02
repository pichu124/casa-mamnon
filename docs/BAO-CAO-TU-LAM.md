# Báo cáo phiên làm việc tự động — anh đọc một chỗ là nắm hết

> **Tệp này viết cho người dùng, không phải cho người viết mã.**
> Nó trả lời đúng ba câu: *tôi đã làm gì*, *tôi đã tự quyết những gì*, và
> *còn việc gì đang chờ anh*.
>
> Chi tiết kỹ thuật của từng đợt nằm ở `docs/TIEN-DO.md` (nhật ký commit);
> lý lẽ đầy đủ của từng quyết định nằm ở `docs/QUYET-DINH-TU-CHOT.md`.

---

## 1. Câu trả lời ngắn nhất

| | |
|---|---|
| Nhánh làm việc | `claude/code-review-optimization-at4jzk` (đợt Đ117–Đ118); các đợt trước: `claude/g0-4-multi-teacher-group-yq1n9e` |
| Đã đẩy lên GitHub | **có**, sau mỗi đợt |
| Bộ kiểm thử | `npm test` **3785 bài** (đo 02/09/2026, sau Đ118), `npm run test:giao-dien` **526 bài** (đo 02/09, chạy lại đủ bộ vì Đ118 đụng `public/`), FAIL 0 |
| Lớp canh trên GitHub | 🔴 **không chạy từ 28/08** — không phải lỗi mã, xem mục 4.2b |
| App có chạy được không | có — mọi đợt đều chạy đủ hai bộ trước khi commit |
| Còn việc nào cần anh quyết | **không còn chỗ nào bị treo.** Năm chỗ trước đây "chờ anh" nay tôi đã tự chốt và ghi rõ ở mục 4.1 — anh đọc rồi bảo làm ngược lại chỗ nào cũng được |
| Còn việc gì chặn | **một thứ, ngoài tầm tay tôi**: nhà trường (mục 4.2). Kho app 1 anh đã mở, và **bốn món nợ bắt buộc đã trả xong** — xem mục 4.3 |
| Cổng DỪNG của ba giai đoạn | **cả ba vẫn đóng** — chờ nhà trường, không phải chờ mã |
| Đợt soát nhiều tác nhân 30/08 | **đã đóng hết**: 21 phát hiện của vòng một, cộng 6 phát hiện bị cắt khỏi vòng một nay đã qua **vòng thẩm định thứ hai** (12 tác nhân, mỗi phát hiện hai người soát độc lập — 0 bị bác bỏ). Tất cả đã vá, Đ59 tới Đ77 |

---

## 1b-mới. Đợt mới nhất — 02/09/2026: đợt hai của cuộc rà soát, khép sổ (Đ118)

Anh dặn *"khi đủ token làm hết phần còn lại"* — đợt này làm đúng điều đó: vá
nốt **77 phát hiện** trong 15 commit (Đ118a–o). Kết sổ 96 phát hiện của cuộc
rà soát: **93 đã vá, 1 bác bỏ khi kiểm chứng lại, 1 giữ theo thiết kế, 1 còn
lại** cần thiết kế thêm (hai cô cùng lưu kế hoạch cả nhóm ghi đè lẫn nhau —
cần máy chủ phát hiện xung đột, tôi không ghép việc đổi hình dạng API vào một
đợt vá). Trạng thái từng dòng ghi ở `docs/RA-SOAT-2026-09.md`. Đáng kể nhất:

- **Hai chỗ anh từng phải quyết, tôi đã làm theo hướng giữ dữ liệu**: Học phí
  nay có đường *thu hồi khoản thu* và *hủy xác nhận đã nộp* — đều bắt buộc ghi
  lý do, đều để vết, **không xoá gì** (bảng `hocphi_thuhoi` mới). Dữ liệu mẫu
  sửa xong cả múi giờ lẫn số đo của ba bé nhà trẻ.
- **`ui.js` bịt một điểm XSS lưu trữ** ở `avatar()`/`studentBar()` dùng ở hơn
  30 màn — app 1 mang cùng mã, **đã ghi sổ nợ** (cùng với CSV-xuống-dòng,
  `record_edits` mồ côi, và sao lưu không nguyên tử: bốn món mới trong sổ).
- **Hết phiên đăng nhập thôi xoá công của cô**: poll huy hiệu chạy nền nay gọi
  kiểu nền (`API.getNen` — chỉ thêm, không đổi hàm cũ), gặp 401 thì ngừng hỏi
  thay vì thay cả màn hình bằng màn đăng nhập giữa lúc cô gõ dở nhật ký.
- **Nháp nhật ký chỉ giữ ô cô đã gõ** — bản cũ chụp cả giá trị máy chủ rồi
  "điền lại phần dở" là điền đè bản cô khác vừa lưu, đúng thứ lời nhắc trên
  màn hứa sẽ không làm.
- **Sổ đón trả có "Giữ như đã ghi"** — sửa mỗi giờ đón thôi làm tên người đón
  lặng lẽ nhảy về người đầu danh sách.
- Sáu phép kiểm gần-như-luôn-xanh được **siết cho đỏ được thật** (chỉ siết,
  không nới — đúng luật bộ canh bất khả xâm phạm).

Tệp dùng chung đi đúng luật ba bước: `ui.js` và `app.js` mỗi tệp một commit
riêng; khế ước chụp lại bằng `--cap-nhat` (2 mục thêm, 0 mục mất). VERSION sw
v75 → v76 nên điện thoại đã cài sẽ tự nhận bản mới.

**Còn chờ anh quyết, không gấp:** tắt hay gỡ ba tính năng tiểu học còn sót
(xe đưa đón, hạnh kiểm, thời khóa biểu — lỗ lộ mã bé trên tuyến đã vá nên
không còn gấp), và có muốn khảo sát gửi riêng một nhóm không (hiện mọi khảo
sát là toàn trường, form đã nói rõ điều đó).

## 1b. Đợt trước — 01/09/2026: rà soát toàn kho + 7 bản vá (Đ117)

Anh yêu cầu *"review lại toàn bộ code và tối ưu"*. Tôi rà 17 hướng song song
trên toàn kho, thu về **96 phát hiện**, tự kiểm chứng và **vá 16 cái nặng
nhất** trong 7 commit (Đ117a–g), mỗi bản vá kèm bộ canh đã chạy thử trên bản
chưa vá để xác nhận nó đỏ đúng chỗ. Đáng kể nhất:

- **Gõ `/API/students` thay vì `/api/students` là đi vòng qua chốt phân
  quyền chức vụ** — dựng lại được cảnh tài khoản Kế toán đọc 11 hồ sơ bé.
  App 1 dính một phần, **đã ghi sổ nợ**.
- Đường phân công cô đời cũ **xoá lịch sử "cô từng phụ trách nhóm"** của các
  năm đã đóng, và có thể hạ nhầm cô chính của một nhóm đang hoạt động.
- Gia đình bé đã rời trường (còn hạn 12 tháng) **bị ẩn ảnh của chính con
  mình** với chính họ.
- `npm run seed` từng gắn cứng `--force`: một lệnh gõ nhầm trên máy chủ thật
  là **xoá sạch dữ liệu của trường**. Nay phải gõ chủ ý mới xoá được.

**80 phát hiện còn lại chưa vá** — sổ đầy đủ kèm đề xuất thứ tự ở
`docs/RA-SOAT-2026-09.md`. Bốn cái mức cao đều nằm ở giao diện (đợt này cố ý
không đụng `public/`); vài cái cần anh quyết: tắt/gỡ các tính năng tiểu học
còn sót (xe đưa đón, hạnh kiểm, thời khóa biểu, Cambridge — xe đưa đón đang
lộ mã mọi bé trên tuyến cho phụ huynh), và phân hệ Học phí chưa có đường
sửa/hủy một khoản thu tạo nhầm.

## 2. Đã làm gì trong đợt này

Toàn bộ việc dưới đây tôi tự làm, tự kiểm, tự đẩy lên. Mỗi đợt đều có một
**phép thử ngược**: tôi cố ý phá đúng chỗ bộ canh đang canh, xác nhận nó báo
đỏ, rồi khôi phục. Bộ canh không bao giờ báo đỏ là bộ canh vô dụng.

### 2.1 Việc chạm tới dữ liệu của trẻ — nhóm quan trọng nhất

| Đợt | Việc | Vì sao đáng làm |
|---|---|---|
| **Đ18** | Gia đình tự xem và **tự rút** giấy đồng ý ngay trong app | Rút lại là quyền theo Nghị định 13/2023. Trước đó muốn rút phải gọi điện lên văn phòng — trên thực tế là một quyền khó dùng |
| **Đ22** | Bộ canh mới: **109/109** đường API đọc dữ liệu bé đều phải qua một hàm canh quyền | Trước đó quy định này chỉ được máy canh cho **đúng một tệp**. App thêm phân hệ gần như mỗi tuần |
| **Đ23** | Vòng sao lưu → mất → khôi phục nay kiểm **đúng byte của một tấm ảnh thật** | Ảnh khuôn mặt trẻ nằm ngoài cơ sở dữ liệu và là thứ **duy nhất không dựng lại được** nếu mất. Cả 58 bài cũ chỉ đếm số bé |
| **Đ24** | Tầng chức vụ thử thật với Ghi nhanh, Hành trình, Kế hoạch bé, Nhật ký | Ghi nhanh là ghi chép thô của cô — lớp 1 của bảng ba lớp, thứ *"không bao giờ lộ sang phụ huynh"*. Chốt quan trọng nhất lại chưa có bài nào chứng minh nó đang đóng |
| **Đ21** | Gom 5 bản hàm nén ảnh về một chỗ | Vẽ lại ảnh qua canvas là bước **duy nhất** bỏ được toạ độ GPS trong ảnh. Ảnh trẻ chụp trong lớp mà còn kèm toạ độ trường là thứ không được để lọt |
| **Đ39** | Vá lỗi **khoản thu rơi vào nhà người khác**: ô *Chọn bé* của màn Học phí không có tác dụng | Văn phòng chọn bé A, màn lặng lẽ quay về bé đầu danh sách, và khoản tiền được tạo cho bé đó. Sai tiền, sai nhà, mà trên màn hình trông vẫn bình thường. Bài canh mới tìm ra nó ngay lần chạy đầu |
| **Đ42** | **Ghi sổ tiền là việc của văn phòng, không phải của cô** | Trước đó cô vừa tạo được khoản thu vừa tự xác nhận đã nhận tiền — một người vừa ghi sổ vừa duyệt sổ. Sai sót ở đó không ai đối chiếu ra, và khi có chuyện thì người đứng lớp phải giải trình về tiền. Cô vẫn ĐỌC được sổ của nhóm mình để trả lời gia đình ở cổng |

| **Đ72** | **Hai cô cùng ghi nhật ký một nhóm: người bấm Lưu sau xoá sạch phần người bấm trước** | Nhóm mầm non có 2–3 cô, và cách chia việc tự nhiên nhất cuối giờ là hai cô cùng mở màn rồi chia nhau. Trước bản vá, cú lưu của cô A là một *ảnh chụp màn hình lúc 16h20* đè lên bản 16h25 của cô B — im lặng, và máy chủ vẫn báo "Đã lưu nhật ký cho 20 bé" |
| **Đ73** | Cô thu hồi một nhận xét bấm nhầm sang bé khác, **màn "Hồ sơ con đã ra trường" vẫn hiện nó cho gia đình** | Là quyền chỉnh sửa và xoá dữ liệu của con theo Nghị định 13/2023. Nhà trường đã làm đúng thao tác; app mới là chỗ không thực hiện. Và đây là màn CHỈ gia đình mở — cô không có đường nào nhìn thấy để biết là chưa gỡ được |
| **Đ75** | Bốn chỗ cảnh báo mật khẩu mẫu nói **"8" và "9" tài khoản; thật ra là 13** | Người vận hành đổi mật khẩu cho 9 tài khoản mình nhớ mặt rồi tin là đã xong — trong khi bốn tài khoản nữa vẫn dùng "123456" trên một máy chủ mở ra Internet, kèm hồ sơ và ảnh khuôn mặt trẻ dưới 6 tuổi. Đúng thứ mà chính bốn câu cảnh báo đó sinh ra để ngăn |

| **Đ84** | **Bé nghỉ có phép vẫn bị ghi "ăn hết bát cơm, ngủ 11h30–14h"** | Gia đình báo con sốt lúc 7h, văn phòng duyệt, bếp trừ đúng một suất — nhưng màn Nhật ký ngày không biết gì. Cô bấm "áp cả nhóm" (đúng thao tác cả phân hệ được thiết kế quanh nó) và bé nằm nhà được ghi một ngày ăn ngủ đầy đủ. Chiều tối mẹ mở app đọc đúng dòng đó. Không mất dữ liệu, không rò dữ liệu — nhưng đây là mục tiêu số một của cả app đang nói một điều gia đình **biết chắc là sai**, và quyển sổ giấy thì không bao giờ tự ghi thay cô |

### 2.2 Việc giữ cho cô không mất công

| Đợt | Việc |
|---|---|
| **Đ28** | Nhật ký ngày cất phần cô gõ dở vào máy. App bị đóng giữa chừng thì mở lại **hỏi cô có điền lại không** |
| **Đ29** | Quy định *"đổi `public/` thì tăng `VERSION`"* nay canh bằng máy ở ba chỗ. Đối chiếu lịch sử thấy **đã quên thật hai lần** (Đ14, Đ19) |
| **Đ27** | Phiếu thử điện thoại thêm **Lời hứa 2b**: mở lại app trong lúc *vẫn đang* mất sóng |
| **Đ51** | **Có bản mới thì app nói một câu — và không tự tải lại.** Trước đó cô cập nhật xong, trang đang mở vẫn chạy mã cũ và không gì báo; cô đọc tài liệu thấy có nút mới, mở máy ra không thấy. Tự tải lại thì tiện hơn nhưng mất sạch phần cô gõ dở, nên app hiện một dải nhắc có nút, và nhắc luôn *"phần đang gõ dở nên lưu trước"* |
| **Đ41** | Đo được rồi: với nhóm **20 bé**, phần **máy** của cả việc ghi nhật ký hết **dưới 1 giây**. Nghĩa là gần trọn 5 phút là thời gian của **người** — nếu buổi thí điểm trượt chỉ tiêu này thì đi sửa số lần chạm và cách bày màn hình, **đừng đi tối ưu máy chủ** |
| **Đ43** | **Cô cập nhật app xong, đi ra sân sóng yếu, và đúng tám màn mầm non không mở được.** Mỗi lần app lên bản mới, kho đệm cũ bị xoá sạch — mà màn hình của phân hệ không nằm trong danh sách nạp sẵn được (địa chỉ của chúng chỉ có lúc máy chủ chạy). Nay chúng được mang theo sang bản mới |
| **Đ44 · Đ45** | **Gia đình vẫn đọc được hồ sơ con đã rời trường từ nhiều năm trước.** Nhà trường chốt giữ 12 tháng, nhưng mốc đó chỉ nằm ở đúng một màn hình; gõ thẳng địa chỉ là ra nhật ký ăn ngủ, hồ sơ sức khoẻ, đơn thuốc. Nay luật nằm ở tầng dữ liệu, một nguồn sự thật — và **app 1 chắc chắn cũng dính**, đã ghi vào sổ nợ |
| **Đ46** | **Tắt Điểm danh xong bếp vẫn nấu thiếu suất.** Màn báo ăn đọc thẳng sổ điểm danh và đơn nghỉ mà không hỏi hai phân hệ đó còn bật không, nên nó trừ suất theo một quyển sổ không còn ai cập nhật |

| **Đ76** | **Màn Lịch sinh hoạt treo chữ "Đang học" lên trên dòng "Ngủ trưa"** lúc 12h30; mốc chưa xếp gọi là "Nghỉ / tự học"; và khung giờ mặc định là bảy tiết 35 phút **không có bữa trưa lẫn giấc ngủ trưa** — cô lập lịch lần đầu phải xoá sạch rồi gõ lại |
| **Đ77** | **Mở một phòng chat kéo về cả năm học tin nhắn.** Nhóm lớp là một hội thoại chung của cô và 20 gia đình, dùng hằng ngày — sau một năm là hàng nghìn tin, trên máy Android rẻ tiền của trường. Nay nạp cửa sổ tin mới nhất, kèm nút "Xem tin cũ hơn" để cắt bớt không biến thành giấu |
| **Đ79** | Đường màn chat gọi **bốn giây một lần** để lấy tin mới cũng không có trần — và nó không có trần tự nhiên nào, vì mốc là do màn hình gửi lên. Tự thấy khi đang vá Đ77; để nguyên một chỗ như vậy trong đúng tệp mình vừa siết thì kỳ |

### 2.3 Việc làm cho bộ kiểm thử thôi nói dối

| Đợt | Việc |
|---|---|
| **Đ25** | Hai bộ canh QUY TẮC 2 và QUY TẮC 4 nay nhìn cả `ui.js` và `app.js` — hai tệp cả app dựa vào, trước nằm ngoài tầm |
| **Đ26** | Hai phép kiểm *"chạy khi mất mạng"* của `test:pwa` **luôn xanh dù app hỏng hẳn**. Thay bằng phép kiểm đọc thẳng nội dung cache |
| — | Bảng số kiểm thử ở `docs/TIEN-DO.md` ghi 2183/265, số thật là 2469/379. Sửa số, và sửa luôn cái làm số ấy lệch: thêm ngày đo và hai lệnh tự đếm lại |
| **Đ39** | Bài học **B9** — *"màn nào hiện dữ liệu thì phải tạo được qua giao diện"* — trước chỉ được canh cho mười màn **lõi kế thừa từ app 1**. Nay phủ đủ **tám phân hệ mầm non**, mỗi phân hệ đi đủ vòng: mở màn → điền → lưu → **thấy lại**. Kèm một bộ canh cho chính món nợ đó: thêm phân hệ thứ chín mà quên đường ghi là bài đỏ ngay |
| **Đ40** | Bộ canh VERSION **tự mở một lỗ** ở đúng chế độ GitHub chạy: một commit xin thoát hợp lệ (sửa chú thích) là miễn kiểm tra cho **cả loạt commit**, kể cả commit sửa thật màn hình mà quên tăng số. Nay đường thoát chỉ miễn cho tệp của chính commit đó |
| **Đ41** | Chỉ tiêu *"nhật ký cả nhóm dưới 5 phút"* — một trong ba chỉ tiêu bản kế hoạch hứa **đo được ngay trong bài test** — trước không có bài nào chạm tới. Nay có, và nó nói thẳng phần nào bài test đo được, phần nào không |
| **Đ42** | Học phí là phân hệ **duy nhất chưa có tệp kiểm thử riêng** — nay có `test:hoc-phi`. Một phép kiểm trong đó lúc đầu **vô dụng**: nó dò mã nguồn màn hình bằng biểu thức, nên vẫn xanh cả khi cổng đã mở toang. Đã thay bằng phép kiểm đếm nút trên trình duyệt thật |
| **Đ43** | `public/sw.js` — đoạn mã quyết định app có mở được khi mất mạng hay không — trước chỉ được canh bằng *"tệp có tải về được không"* và *"trong tệp có chữ này không"*. Nay `test:vo-app` nạp chính đoạn mã đó vào một hộp cát rồi **gọi đúng các móc trình duyệt sẽ gọi**, nên đo được hành vi thật mà không cần trình duyệt |
| **Đ47** | Bước *"đọc bảng của phân hệ khác thì hỏi công tắc trước"* đã bị quên **ba lần** (Y1, N24, Đ46), và cả ba lần đều do người đọc mã phát hiện. Nay có máy canh — nó thử ngược đúng lỗi Đ46 và bắt được — cộng một mục hướng dẫn hẳn hoi trong `modules/README.md`, nơi người viết phân hệ mới đọc trước |
| **Đ50** | **Cuốn sổ tôi dùng cả phiên để quyết "cái này có phải mang sang app 1 không" thì lại chỉ ghi 13 trong số 28 tệp nền — và mẹo nhận diện của nó ghi NGƯỢC.** Theo mẹo cũ, hễ app 2 sửa một tệp là tệp ấy thôi được coi là nền chung; tức người sang kho app 1 sẽ bỏ qua **đúng những tệp vừa có bản vá**. Nay sổ đủ, mẹo đúng chiều, và có máy canh suy danh sách thẳng từ git |
| **Đ52** | **Tôi bắt được chính mình dùng thừa một "đường thoát".** Hai bộ canh cho phép ghi một dòng vào lời commit để xin bỏ qua; hai lần tôi ghi dòng đó trong khi bộ canh vốn đã cho qua. Vô hại lần này, nhưng lời commit ghi lại một điều không đúng, và dùng cho quen tay là bước đầu của việc dùng nó lúc thật sự đang vi phạm. Nay hai bộ canh **nhắc** khi thấy dòng thoát thừa — nhắc chứ không chặn, vì một bộ canh gây phiền là một bộ canh bị tắt |
| **Đ53** | **QUY TẮC 3 — *AI gợi ý ≠ cô quyết định* — hoá ra chưa có bộ canh nào**, dù `CLAUDE.md` nói năm quy tắc đều được canh bằng máy. Nay có, và **dựng trước khi kho mã có một dòng AI nào**: ngày ai đó nối dịch vụ AI vào, đường ngắn nhất luôn là ghi thẳng kết quả vào hồ sơ bé; bài canh báo đỏ đúng lúc đó. Nó cũng giữ **bốn điều kiện bật AI** của bản kế hoạch và canh cho **bảng đồng ý chưa có ô AI** — để không ai coi ô *chia sẻ ảnh* hay *truyền thông* là đã bao gồm |

---

## 3. Những việc tôi tự quyết thay anh

Anh đã dặn *"làm theo hướng bạn thấy tốt nhất"*, nên tôi chọn rồi ghi lại.
Cả ba đều **đảo ngược được** nếu anh thấy nên đi hướng khác.

**a) Rút đồng ý làm được trong app, nhưng ĐỒNG Ý thì không.**
Rút lại là quyền, không được đặt thủ tục lên trên. Còn *đồng ý* là một tờ giấy
**có chữ ký** — cho bấm một nút cũng ghi được "đã đồng ý" nghĩa là trường sẽ có
bản ghi đồng ý mà không chữ ký nào đứng sau, và lúc có chuyện thì không bên nào
chứng minh được gì.

**b) Giữ nguyên năm bộ số nén ảnh khi gom mã** (album 1600px, Cambridge 1400,
Hành trình 1280, Ghi nhanh 1280 nén sâu hơn, Đón trả 640). Mỗi số có lý do
riêng; ép về một số là hoặc làm nặng hàng đợi lúc mất mạng, hoặc làm mờ ảnh
album. Thứ phải gom là **mã**, không phải **số**.

**c) Khôi phục dữ liệu KHÔNG đè lên ảnh đang có, chỉ *nói ra* tấm nào lệch.**
Tên tệp ảnh là 16 byte ngẫu nhiên nên trùng tên là trùng đúng tấm ảnh đó — mà
bản trên đĩa có thể **mới hơn** bản sao. Đè xuống là lấy bản cũ ghi chồng lên
bản mới. Nhưng im lặng bỏ qua cũng sai, nên nó liệt kê ra để người vận hành tự
xem.

**e) Ghi sổ tiền: siết chỗ GHI, không siết chỗ BIẾT.** Cô không còn tạo khoản
thu và không còn xác nhận đã nhận tiền, nhưng vẫn **đọc** được sổ của bé nhóm
mình. Cắt luôn đường đọc thì cô không trả lời được câu *"nhà em đã nộp chưa cô"*
ở cổng trường, và gia đình phải gọi lên văn phòng cho một việc lẽ ra hỏi một câu
là xong. **Chỗ này KHÔNG mang sang app 1** — bên đó cô đang thu tiền thật cho
khoảng 300 gia đình, đổi vai khi nhà trường chưa nói gì là làm hỏng việc đang chạy.

**d) Nháp Nhật ký ngày: HỎI cô, không tự điền đè.** Một nhóm có nhiều cô. Trong
lúc bản nháp nằm trong máy cô A, cô B có thể đã ghi và lưu từ máy mình. Tự điền
đè là lấy bản cũ ghi chồng lên bản mới, âm thầm.

**f) Đụng nhau khi hai cô cùng ghi: chặn ĐÚNG BÉ ĐÓ, không chặn cả cú lưu**
(Đ72). Chặn cả cú lưu thì cô điền 20 bé xong bấm Lưu và bị từ chối sạch — đổi
một kiểu mất công lấy một kiểu mất công nặng hơn. Nay 19 bé không đụng nhau vẫn
lưu, và cô đọc được câu *"1 bé chưa lưu được vì cô khác vừa ghi"*. Kèm hai
điều: bản app cũ còn trong máy điện thoại **không gửi dấu thời gian thì vẫn lưu
được như trước** (Nguyên tắc số 1), và có bé chưa lưu được thì màn **không xoá
nháp** — phần cô vừa gõ còn nguyên trong máy.

**g) Tin nhắn cũ: cắt bớt thì phải mở đường đi ngược** (Đ77). Chỉ thêm giới hạn
là nhanh nhất, nhưng cô cuộn lên không thấy gì sẽ tin rằng tin nhắn cũ đã mất —
tức là đổi một cái chậm lấy một cái *tưởng như mất dữ liệu*. Nên máy chủ nói ra
"phía trước còn tin cũ hơn" và màn có nút **"Xem tin cũ hơn"** giữ nguyên chỗ cô
đang đọc. Tôi chọn cửa sổ **200 tin** thay vì cuộn vô hạn tự nạp: cuộn vô hạn
đẹp hơn nhưng thêm một cơ chế nữa phải canh, mà nút bấm thì cô hiểu ngay.

**h) Khung giờ mặc định của Lịch sinh hoạt: sửa luôn, dù phát hiện chỉ nói về
chữ** (Đ76). Đợt soát chỉ nêu hai câu chữ sai. Nhưng mở tệp ra thì khung giờ
mặc định — thứ cô nhìn thấy khi nhóm lập lịch lần đầu — là bảy tiết 35 phút của
trường tiểu học, không có bữa trưa lẫn giấc ngủ trưa. Cùng một khiếm khuyết,
cùng một tệp, và để lại thì cô lập lịch lần đầu phải xoá sạch rồi gõ lại. Rủi ro
thấp: khung mặc định chỉ dùng khi nhóm **chưa có** lịch.

---

## 4. Việc tôi đã tự chốt, và việc thật sự còn chờ

### 4.1 Năm chỗ tôi TỰ CHỐT thay anh — và chốt thế nào

Bản báo cáo trước để năm chỗ này ở dạng "chờ anh quyết". Đọc lại lời anh dặn thì
đó là tôi làm sai: anh nói **"việc nào cần hỏi ý kiến thì cứ làm theo hướng bạn
thấy tốt nhất, ghi lại rồi báo"**. Nên đợt này tôi quyết cả năm, làm xong bốn,
và chốt "không làm" một cách có lý do cho cái thứ năm.

Anh đọc bảng dưới rồi bảo tôi làm ngược lại chỗ nào cũng được — mọi thứ đều lùi
lại được trong một commit.

| # | Chỗ nào | Tôi chốt thế nào | Vì sao chốt như vậy |
|---|---|---|---|
| 1 | **`UI.RATING`** — ba mức *"Con làm rất tốt / Con làm tốt / Cần cố gắng thêm"* | **Đ55 — làm đường 2**: bộ canh QUY TẮC 4 nay bắt được mẫu ba mức, ghi bốn tệp vào một **sổ nợ riêng** | Chỗ đắt của đường 2 tưởng là phải nới một bộ canh bất khả xâm phạm. Hoá ra không cần: dựng **bánh cóc thứ hai**, siết từ lúc sinh ra, bánh cóc cũ không bị chạm một dòng. Từ nay không ai chép được mẫu ba mức sang chỗ mới mà bộ canh im lặng. **Gỡ hẳn `UI.RATING` vẫn chưa được duyệt** |
| 2 | **Câu thông báo nói sai với gia đình** | **Đ54 — sửa rồi**, và sửa tận gốc: máy chủ nay nói được LÝ DO THẬT (nhà trường tắt / ngoài vai / ngoài chức vụ / sự cố), màn hình nói đúng cả **chiều** của lý do | Nói với cô rằng "phần này chỉ dành cho cô" là sai lần thứ hai, chỉ khác hướng. Hai bài test giao diện cũ bắt theo câu chữ cũ nên sẽ lặng lẽ xanh — đã sửa cả hai, và siết thêm một bài |
| 3 | **Nhân sự cấp lại được mật khẩu tài khoản gia đình** | **Đ57 — siết lại**. Nhân sự lo tài khoản của trường; tài khoản gia đình thì không. Chặn cả `/api/accounts/parents` (nó trả kèm **tên các con**) | Chính mô tả chức vụ ấy hứa họ "KHÔNG mở được hồ sơ bé, sức khoẻ, hay ảnh của trẻ" — mà cấp lại mật khẩu là trao đúng ba thứ đó. Chặn mà **không ai mất việc**: cô của nhóm bé, ban giám hiệu, quản trị toàn hệ thống vẫn làm được, và bài test canh đúng ba đường đó |
| 4 | **`GET /api/kehoachbe/be`** — chưa màn hình nào gọi | **Đ58 — GIỮ NGUYÊN, không dựng màn hình.** Khuyến nghị của tôi là gỡ hẳn, nhưng gỡ chưa được duyệt | Màn nhóm **đã trả kế hoạch của mọi bé rồi**, nên màn riêng từng bé là thừa. Còn đặt nó vào Hồ sơ bé thì phải để một tệp LÕI gọi vào một phân hệ cắm thêm — đảo ngược chiều phụ thuộc mà `modules/README.md` dựng lên, và kho mã chưa có tiền lệ nào như thế. Dựng một màn hình thừa chỉ để "dùng hết" một đường API là tệ hơn để nó nằm yên, có bọc kín |
| 5 | **Hai ô chết trong hồ sơ sức khoẻ** | **Đ56 — cho y tế nhập**, không bỏ hai ô khỏi màn hình | Bỏ đi là gỡ (chưa duyệt), và nếu trường có sẵn dữ liệu cũ để nhập thì bỏ đi là mất chỗ cất. Kèm một phép kiểm mới: gửi chiều cao + cân nặng mà không gõ ô đánh giá thì ô đó phải **ở nguyên trống** — app không bao giờ được tự xếp một đứa trẻ so với "chuẩn của độ tuổi" |

> **Một việc nữa, không cần anh quyết mà cần anh biết:** đường liệt kê album
> (`GET /api/albums`) đếm số ảnh bằng cách nạp **từng tấm ảnh của từng album**,
> rồi với mỗi tấm lại hỏi tiếp ai được gắn thẻ và nhà đó đồng ý chưa. Hôm nay
> chưa ai thấy chậm vì dữ liệu còn ít. Sau vài năm học, một lần gia đình mở màn
> Album là hàng nghìn câu truy vấn. Tôi **chưa sửa** vì cách sửa nhanh nhất —
> nhớ tạm lời đồng ý của từng bé — có thể làm app hiện một tấm ảnh mà gia đình
> **vừa mới rút đồng ý**, và đó là loại lỗi tệ hơn hẳn cái chậm. Cách sửa an
> toàn cần đo trước; tôi để lại đây thay vì làm vội.

### 4.2b 🔴 GitHub Actions không chạy từ 28/08 — việc này cần anh

Lớp canh mà `CLAUDE.md` gọi là **"không bỏ qua được"** thì **đã không chạy một
lần nào từ 28/08/2026**. Tôi đo qua GitHub API: mọi lần chạy tới 28/08 04:08 đều
mất ~210 giây và 28/30 xanh; từ 28/08 22:24 trở đi, cả 30 lần đều "hỏng" sau
**3–6 giây** và không tải được nhật ký nào.

Một lần chạy thật thì riêng bước tải mã về đã lâu hơn thế — nghĩa là **không
bước nào được thực thi**. Tôi đã loại trừ tệp cấu hình (GitHub vẫn tạo đủ 5 job
đúng tên) và loại trừ nhánh (4 job y hệt bản trên `main` vốn chạy tốt).

Nguyên nhân gần như chắc chắn nằm ở **tài khoản GitHub**, không nằm ở mã: hết
hạn mức phút Actions, hoặc Actions bị tắt/hạn chế. Tôi không nhìn được phần
thanh toán nên không xác nhận nốt được.

**Nói thẳng phần thuộc về tôi:** đợt trước tôi báo với anh là nhánh "sẵn sàng"
sau khi chạy đủ ba bộ canh khoảng **ở máy này**. Điều đó đúng, nhưng tôi đã
không mở GitHub ra xem — nên đã không thấy CI đỏ suốt 50 commit. Từ nay tôi kiểm
cả hai.

**Việc của anh:** mở https://github.com/settings/billing xem hạn mức Actions, và
xem Settings → Actions của kho `pichu124/casa-mamnon`.

---

### 4.2 Những việc chỉ nhà trường mở được

Không phải việc của mã, và tôi không làm thay được:

| Việc | Nó đang chặn cái gì |
|---|---|
| **Thử app trên iPhone và Android thật của cô** | Cổng DỪNG của GĐ 0 — phiếu đã soạn sẵn ở `docs/PHEP-THU-DIEN-THOAI.md`, chỉ cần xếp một buổi |
| **Chọn nhóm thí điểm, chạy song song sổ giấy hai tuần** | Cổng DỪNG của GĐ 1 |
| **Phát và thu giấy đồng ý của phụ huynh** | Cổng DỪNG của GĐ 2, và là điều kiện pháp lý trước khi chạy thật |
| **Đăng ký máy chủ Việt Nam + tên miền đứng tên trường** | Toàn bộ phần triển khai |
| **Ba cơ sở nấu bếp chung hay nấu riêng?** | Bảng thực đơn đang là một thực đơn cho cả trường. Nấu riêng thì phải **thêm cột cơ sở trước** — mở đường ra trước là người sửa sau ghi đè người sửa trước, âm thầm, mỗi ngày |
| **Mẫu báo cáo phòng GD yêu cầu** | Chưa có mẫu thì không xuất đúng mẫu được |

### 4.3 Món nợ với kho app 1 — bốn món nặng nhất ĐÃ TRẢ XONG

Anh mở quyền vào `pichu124/School` và tôi đã vá xong **bốn món bắt buộc** của
đợt Đ59–Đ77 bên đó, trên nhánh `claude/no-nen-chung-app2`.

**Đối chiếu tại chỗ xác nhận cả bốn đều có thật ở app 1**, đúng như sổ ghi. Đây
là ba con số ĐO ĐƯỢC trên máy chủ app 1 chạy thật, không phải suy đoán:

| Đo cái gì | Trước khi vá |
|---|---|
| Khôi phục từ bản sao ở ổ cứng ngoài | Cơ sở dữ liệu về đủ, script in "Đã khôi phục xong" — **ảnh: "không có thư mục uploads/"**, không một tấm nào |
| `GET /modules/hocphi/routes.js`, **chưa đăng nhập** | 404 kèm **3142 byte** mã máy chủ của phần thu tiền; `schema.sql` thêm 625 byte |
| Tài khoản có con rời trường **2 năm** | **5 đường** trả 200: hồ sơ, sổ sức khoẻ, nhận xét, sổ nề nếp, sổ điểm danh. Và album lớp cũ trả về **đúng các byte của tấm ảnh** |

Một điều tìm được tại chỗ mà sổ chưa biết, và nó làm món thứ ba nhẹ gánh hơn
hẳn: **app 1 ĐÃ CÓ SẴN `SO_THANG_GIU = 12`** trong `routes/hocsinh-cu.js`, và
app đang nói câu *"Hồ sơ của em chỉ tra cứu được trong 12 tháng sau khi rời
trường"* với phụ huynh. Nên đây **không phải chuyện đổi chính sách của một
trường khác** — luật là của chính họ, app chỉ đang không thực thi được nó ở đâu
ngoài đúng một màn hình. Tôi vá cái không thực thi được, không đặt luật mới.

`npm test` ở app 1: 932 → **1017 bài**, FAIL 0. Hai bộ canh mới bên đó, và mỗi
bản vá đều có phép thử ngược.

**Tôi KHÔNG đẩy thẳng vào nhánh mà app 1 đang chạy.** `CLAUDE.md` của kho đó bảo
đẩy vào `claude/school-communication-app-wqjitt` — nhưng đó là nhánh của một app
đang phục vụ ~300 gia đình thật, nên tôi để bản vá ở một nhánh riêng và **chờ
anh gộp**. Anh gật một câu là tôi gộp.

**Mười món cũ hơn** (có từ trước đợt Đ59) vẫn còn trong sổ — chúng cần một lượt
đối chiếu riêng ở kho app 1, tôi chưa làm trong đợt này. Danh sách đầy đủ ở
`docs/LOI-NEN-CHUNG.md`, mục *Sổ nợ*.

> **Đợt Đ59–Đ77 thêm BỐN món, và một trong bốn thay chỗ đứng đầu bảng.**
> Cả bốn tôi đã **đối chiếu tận nơi** ở điểm tách hai kho — mở đúng tệp, đúng
> dòng của app 1 tại `bc9dfa3` — chứ không suy đoán từ việc "hai kho giống nhau":
>
> - 🥇 **Khôi phục từ ổ cứng ngoài thì ẢNH KHÔNG VỀ.** `scripts/backup.js` có
>   sẵn tuỳ chọn sao lưu ra ổ ngoài và tự quảng cáo điều đó ở dòng đầu tệp;
>   `scripts/restore.js` ngay cạnh lại đi tìm ảnh trong đúng thư mục vừa mất.
>   Nên đúng kịch bản mà app khuyên người ta chuẩn bị — ổ đĩa máy chủ hỏng — thì
>   danh sách trẻ về đủ, script in "Đã khôi phục xong", còn **ảnh khuôn mặt của
>   ~300 gia đình thì không về, và không ai được báo một chữ nào**. Ảnh là thứ
>   duy nhất không dựng lại được từ đâu khác. **Đây là món nặng nhất trong sổ.**
> - **Gia đình đã rời trường nhiều năm vẫn tải được ảnh album lớp cũ** — mà
>   album lớp là ảnh khuôn mặt CẢ LỚP, phần lớn các em vẫn đang học. Ở app 2 tôi
>   dựng lại được tới mức tải về đúng các byte của tấm ảnh.
> - **Mã máy chủ của phần thu tiền tải về được mà không cần đăng nhập**
>   (`/modules/hocphi/routes.js` và `schema.sql`). Có một chốt chặn trong mã,
>   nhưng nó đặt sai chỗ nên không chặn gì cả.
> - **Cô thu hồi một nhận xét bấm nhầm sang bé khác thì màn "Hồ sơ con đã ra
>   trường" vẫn hiện nguyên dòng đó cho gia đình.** Ở app 1 nặng hơn app 2 nhiều:
>   app 2 đã tắt phân hệ Nhận xét, app 1 dùng nó hằng ngày. Và hàm lọc **đã nằm
>   sẵn** trong kho app 1 — bản vá chỉ là gọi nó.

> **Món nặng thứ hai trong sổ, sau Đ62 ở trên.** Lỗi *Chọn bé* của màn Học phí
> (mục 2.1) nằm trong tệp sinh ra **trước điểm tách hai kho** và không đổi từ đó
> — nên app 1 **chắc chắn** dính, không phải "có thể". Ở app 1 nó nặng hơn hẳn:
> bên đó đang thu tiền thật của khoảng 300 gia đình, còn app 2 chưa có người
> dùng nào. (Đ62 vượt lên trên vì nó làm **mất hẳn** ảnh khuôn mặt trẻ, thứ
> không dựng lại được từ đâu; lỗi Học phí thì sai sổ, mà sổ thì sửa lại được.)

App 1 đang chạy thật cho khoảng 300 gia đình, nên đây là món nợ đáng trả sớm.
Anh mở quyền vào kho `pichu124/School` là tôi đối chiếu và vá được.

> **Đợt Đ54–Đ58 không thêm món nợ BẮT BUỘC nào**, nhưng thêm **hai món không
> bắt buộc mà tôi đã đối chiếu tận nơi ở điểm tách `bc9dfa3`, không phỏng đoán:**
>
> - App 1 **đang** nói với phụ huynh câu *"Phân hệ này hiện đang được nhà trường
>   tắt"* khi họ mở nhầm một địa chỉ chỉ dành cho nhà trường — nhà trường không
>   tắt gì cả. Với ~300 gia đình, văn phòng app 1 có thể đã nhận những cuộc gọi
>   hỏi "sao trường tắt mất phần của tôi" mà không ai lần ra nguyên nhân.
> - App 1 có **y hệt hai ô chết** trong hồ sơ sức khoẻ (Thị lực, Đánh giá thể
>   trạng): màn hình in ra, máy chủ không có đường ghi.
>
> Chi tiết ở `docs/LOI-NEN-CHUNG.md`, mục *Còn mười một món KHÔNG bắt buộc*.
>
> **Một chỗ TUYỆT ĐỐI không được chép sang app 1:** đợt Đ76 sửa màn Lịch sinh
> hoạt của app 2 (bỏ chữ "Nghỉ / tự học", bỏ nhãn "Đang học", đổi khung giờ
> mặc định thành một ngày ở nhà trẻ). Ở app 1 cả ba thứ đó đều ĐÚNG — bên đó
> là trường tiểu học. Đã ghi rõ trong Sổ nợ để người sang kho kia khỏi "vá
> giúp" nhầm.

---

## 5. Còn gì trong sổ việc

Sổ việc gốc có **161 mục**. Sau đợt này:

- **Đã xong:** toàn bộ nhóm *cao* mà mã sửa được, cộng phần lớn nhóm *vừa*.
- **Đã lạc hậu, bỏ qua có đối chiếu:** kha khá. Tôi **đọc lại mã hiện tại trước
  khi làm từng mục**, và nhiều mục hoá ra đã được vá ở đợt trước. Ví dụ đợt này:
  sổ việc còn ghi *"màn Lịch sinh hoạt mời cô gõ Tên môn học"*, *"màn Quản trị
  bắt khai Khối 1–12"*, *"ô cân đo gợi ý sai lứa tuổi"*, *"mô tả Xin phép nói cô
  là người duyệt"* — cả bốn đã đúng từ lâu. **Ghi ra đây vì con số "còn N mục"
  trong một cuốn sổ cũ dễ làm người đọc hoảng hơn thực tế.**
- **Còn lại:** nhóm *Chờ nhà trường* ở mục 4.2 (không phải việc của mã), món nợ
  với kho app 1 ở mục 4.3 (chờ anh mở quyền), cộng một ít nợ kỹ thuật mức *thấp*
  — đổi tên biến, gọn lại tài liệu — không chỗ nào đe doạ dữ liệu hay chặn cổng
  DỪNG nào. **Năm chỗ trước đây ghi là "chờ anh quyết" nay đã chốt xong** (mục
  4.1); chúng không còn nằm trong nhóm này nữa.

**Nói thẳng một câu về chỗ đứng hiện tại:** phần việc mà mã sửa được, tôi làm
gần hết rồi. Thứ chặn tiếp theo không phải là mã — là **buổi thử app trên điện
thoại thật của cô** và **máy chủ + tên miền đứng tên trường**. Chừng nào hai thứ
đó chưa có, mọi việc tôi làm thêm đều là siết cho chặt hơn chứ không đưa app tới
gần ngày dùng thật hơn được nữa.

---

## 6. Nếu tôi phải dừng giữa chừng

Phiên làm việc có thể hết lượt bất cứ lúc nào. Mọi thứ cần để đi tiếp đều nằm
trong kho mã, không nằm trong trí nhớ của phiên:

| Muốn biết gì | Đọc tệp nào |
|---|---|
| Đang đứng ở đâu, đợt nào đã làm gì | `docs/TIEN-DO.md` — nhật ký từng đợt, mới nhất ở cuối |
| Tóm tắt cho anh, và việc gì chờ anh quyết | **chính tệp này** |
| Vì sao tôi chọn hướng này chứ không hướng kia | `docs/QUYET-DINH-TU-CHOT.md` |
| Món nợ phải vá sang app 1 | `docs/LOI-NEN-CHUNG.md`, mục *Sổ nợ* |
| Quy định bắt buộc khi sửa kho này | `CLAUDE.md` |

Nhắn **"làm tiếp"** là đủ: tôi đọc lại năm tệp trên rồi đi tiếp đúng chỗ đang dở.
Không cần anh nhắc lại bối cảnh.

---

*Cập nhật lần cuối: sau đợt Đ78 — hai vòng thẩm định của đợt soát nhiều tác
nhân 30/08 đã vá hết (21 + 6 phát hiện), và bốn món nợ bắt buộc mới với app 1
đã vào sổ.*
