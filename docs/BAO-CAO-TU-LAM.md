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
| Nhánh làm việc | `claude/g0-4-multi-teacher-group-yq1n9e` |
| Đã đẩy lên GitHub | **có**, sau mỗi đợt |
| Bộ kiểm thử | `npm test` **2687 bài**, `npm run test:giao-dien` **454 bài**, FAIL 0 (đo 29/08/2026) |
| App có chạy được không | có — mọi đợt đều chạy đủ hai bộ trước khi commit |
| Còn việc nào cần anh quyết | **có, 3 nhóm việc**, xem mục 4 |
| Cổng DỪNG của ba giai đoạn | **cả ba vẫn đóng** — chờ nhà trường, không phải chờ mã |

---

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

### 2.2 Việc giữ cho cô không mất công

| Đợt | Việc |
|---|---|
| **Đ28** | Nhật ký ngày cất phần cô gõ dở vào máy. App bị đóng giữa chừng thì mở lại **hỏi cô có điền lại không** |
| **Đ29** | Quy định *"đổi `public/` thì tăng `VERSION`"* nay canh bằng máy ở ba chỗ. Đối chiếu lịch sử thấy **đã quên thật hai lần** (Đ14, Đ19) |
| **Đ27** | Phiếu thử điện thoại thêm **Lời hứa 2b**: mở lại app trong lúc *vẫn đang* mất sóng |
| **Đ41** | Đo được rồi: với nhóm **20 bé**, phần **máy** của cả việc ghi nhật ký hết **dưới 1 giây**. Nghĩa là gần trọn 5 phút là thời gian của **người** — nếu buổi thí điểm trượt chỉ tiêu này thì đi sửa số lần chạm và cách bày màn hình, **đừng đi tối ưu máy chủ** |
| **Đ43** | **Cô cập nhật app xong, đi ra sân sóng yếu, và đúng tám màn mầm non không mở được.** Mỗi lần app lên bản mới, kho đệm cũ bị xoá sạch — mà màn hình của phân hệ không nằm trong danh sách nạp sẵn được (địa chỉ của chúng chỉ có lúc máy chủ chạy). Nay chúng được mang theo sang bản mới |

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

---

## 4. Việc đang chờ anh

### 4.1 Hai chỗ tôi thấy nhưng KHÔNG tự sửa

**Chỗ thứ nhất — `UI.RATING`: ba mức "Con làm rất tốt / Con làm tốt / Cần cố
gắng thêm".**

Ba mức xếp trên dưới về một đứa trẻ đúng là thứ QUY TẮC 4 cấm. Nhưng nó không
dùng chữ "điểm" hay "xếp hạng" nên **không bộ canh nào bắt được**, kể cả sau khi
Đ25 mở rộng vùng quét.

Tôi không tự sửa vì cả ba đường đều đụng ranh giới anh đã dặn: `public/js/ui.js`
là tệp dùng chung (chỉ được thêm); gỡ hẳn thuộc **phần gỡ chưa được duyệt**; còn
thêm dấu hiệu cho bộ canh thì phải nới luật của một bộ canh **bất khả xâm phạm**.

> **Hôm nay chưa ai nhìn thấy ba mức đó** — cả hai màn dùng nó (Nhận xét hàng
> ngày, Hồ sơ con đã ra trường) đều đã tắt sẵn. Nên việc này **không gấp**, chỉ
> là không được quên khi bật lại.

Ba đường đi và giá của từng đường ghi đủ ở `docs/QUYET-DINH-TU-CHOT.md`.

**Chỗ thứ hai — một câu thông báo nói sai sự thật với gia đình.**

Gia đình gõ thẳng đường dẫn của một phân hệ chỉ dành cho người trong trường
(Báo ăn, Ghi nhanh, Kế hoạch của bé) thì màn hình hiện: *"Phân hệ này hiện đang
được nhà trường tắt."* Nhưng nhà trường **không** tắt nó — nó đang bật, chỉ là
không dành cho gia đình. Bộ canh mới ở Đ39 đi qua đúng ba màn này nên nhìn thấy.

Câu đó nằm ở `public/js/app.js`, tức **tệp dùng chung**: theo quy định của
`CLAUDE.md` nó phải là một commit riêng, không trộn với đợt thêm bài canh. Hại
thì nhỏ (chỉ ai gõ tay đường dẫn mới gặp) nhưng nói sai với phụ huynh là thứ
không nên để lâu. **Sửa được trong một đợt riêng, chỉ chờ anh gật.**

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

### 4.3 Món nợ với kho app 1

**Chín** bản vá thuộc loại **bắt buộc** (rò rỉ dữ liệu hoặc mất dữ liệu) đã làm
ở app 2 nhưng **chưa mang sang app 1** — vì phiên làm việc chưa có quyền vào kho
đó. Danh sách đầy đủ kèm mã commit ở `docs/LOI-NEN-CHUNG.md`, mục *Sổ nợ*.

> **Đợt này thêm một món, và nó là món nặng nhất trong sổ.** Lỗi *Chọn bé* của
> màn Học phí (mục 2.1 ở trên) nằm trong tệp sinh ra **trước điểm tách hai kho**
> và không đổi từ đó — nên app 1 **chắc chắn** dính, không phải "có thể". Ở app 1
> nó nặng hơn hẳn: bên đó đang thu tiền thật của khoảng 300 gia đình, còn app 2
> chưa có người dùng nào.

App 1 đang chạy thật cho khoảng 300 gia đình, nên đây là món nợ đáng trả sớm.
Anh mở quyền vào kho `pichu124/School` là tôi đối chiếu và vá được.

---

## 5. Còn gì trong sổ việc

Sổ việc gốc có **161 mục**. Sau đợt này:

- **Đã xong hoặc đã hết hạn:** phần lớn nhóm *cao*. Nhiều mục trong sổ đã lạc
  hậu — tôi đối chiếu lại từng mục với mã hiện tại trước khi làm, và bỏ qua
  những mục đã được vá ở đợt trước (ví dụ mục 5 *"chỉ canh chiều cấm"* — cả bốn
  tệp hiện đã canh cả chiều cho phép bằng tài khoản cô thứ hai).
- **Còn lại:** chủ yếu là nhóm *Chờ nhà trường* ở mục 4.2, cộng một số món nợ
  kỹ thuật mức *vừa* và *thấp* mà tôi làm tiếp.

---

*Cập nhật lần cuối: sau đợt Đ43.*
