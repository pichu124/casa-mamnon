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
| Bộ kiểm thử | `npm test` **2483 bài**, `npm run test:giao-dien` **379 bài**, FAIL 0 |
| App có chạy được không | có — mọi đợt đều chạy đủ hai bộ trước khi commit |
| Còn việc nào cần anh quyết | **có, 3 việc**, xem mục 4 |
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

### 2.2 Việc giữ cho cô không mất công

| Đợt | Việc |
|---|---|
| **Đ28** | Nhật ký ngày cất phần cô gõ dở vào máy. App bị đóng giữa chừng thì mở lại **hỏi cô có điền lại không** |
| **Đ29** | Quy định *"đổi `public/` thì tăng `VERSION`"* nay canh bằng máy ở ba chỗ. Đối chiếu lịch sử thấy **đã quên thật hai lần** (Đ14, Đ19) |
| **Đ27** | Phiếu thử điện thoại thêm **Lời hứa 2b**: mở lại app trong lúc *vẫn đang* mất sóng |

### 2.3 Việc làm cho bộ kiểm thử thôi nói dối

| Đợt | Việc |
|---|---|
| **Đ25** | Hai bộ canh QUY TẮC 2 và QUY TẮC 4 nay nhìn cả `ui.js` và `app.js` — hai tệp cả app dựa vào, trước nằm ngoài tầm |
| **Đ26** | Hai phép kiểm *"chạy khi mất mạng"* của `test:pwa` **luôn xanh dù app hỏng hẳn**. Thay bằng phép kiểm đọc thẳng nội dung cache |
| — | Bảng số kiểm thử ở `docs/TIEN-DO.md` ghi 2183/265, số thật là 2469/379. Sửa số, và sửa luôn cái làm số ấy lệch: thêm ngày đo và hai lệnh tự đếm lại |

---

## 3. Ba việc tôi tự quyết thay anh

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

**d) Nháp Nhật ký ngày: HỎI cô, không tự điền đè.** Một nhóm có nhiều cô. Trong
lúc bản nháp nằm trong máy cô A, cô B có thể đã ghi và lưu từ máy mình. Tự điền
đè là lấy bản cũ ghi chồng lên bản mới, âm thầm.

---

## 4. Việc đang chờ anh

### 4.1 Một chỗ tôi thấy nhưng KHÔNG tự sửa

**`UI.RATING` — ba mức "Con làm rất tốt / Con làm tốt / Cần cố gắng thêm".**

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

Bảy bản vá thuộc loại **bắt buộc** (rò rỉ dữ liệu hoặc mất dữ liệu) đã làm ở
app 2 nhưng **chưa mang sang app 1** — vì phiên làm việc chưa có quyền vào kho
đó. Danh sách đầy đủ kèm mã commit ở `docs/LOI-NEN-CHUNG.md`, mục *Sổ nợ*.

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

*Cập nhật lần cuối: sau đợt Đ32.*
