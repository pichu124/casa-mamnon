# Phép thử quyết định — trên điện thoại thật của cô giáo

**Đây là cổng DỪNG của GĐ 0.** Phép thử này trả lời đúng một câu hỏi:

> Cô giáo cầm chính điện thoại của mình, có ghi lại được một khoảnh khắc của bé
> trong **dưới 20 giây** không — kể cả khi lớp mất sóng?

Trượt ở đâu thì **dừng lại bàn với người dùng, không lao tiếp sang GĐ 1**. Toàn bộ
GĐ 2 (hành trình học tập) đứng trên giả định "ghi lại nhanh tới mức cô không thấy
phiền". Giả định đó sai thì kế hoạch phải đổi, chứ không phải cố làm cho xong.

Bản mã đã sẵn sàng (G0.3, `modules/thuchup/`, 55 bài kiểm thử xanh). Cái còn thiếu
là **con số đo trên tay người thật** — máy không tự đo hộ được.

---

## 0. Luật bất di bất dịch của buổi thử

> ### ⛔ CHỈ DÙNG DỮ LIỆU MẪU. TUYỆT ĐỐI KHÔNG NHẬP TRẺ THẬT.
>
> Buổi thử này chạy trên một máy chủ tạm, rất có thể đi qua dịch vụ đường hầm của
> bên thứ ba. Ảnh khuôn mặt trẻ 12 tháng – 6 tuổi và hồ sơ sức khỏe là dữ liệu nhạy cảm
> theo Nghị định 13/2023/NĐ-CP — **không được đi qua đó**.
>
> Cô chụp gì trong buổi thử cũng được: đồ chơi, góc lớp, một tờ giấy. **Không chụp
> mặt bé.** Bé trong app lúc này là bé An, bé Nam… của dữ liệu mẫu, không phải trẻ
> thật của trường.

Xong buổi thử thì **xóa hẳn máy chủ tạm và đóng đường hầm**.

---

## 1. Vì sao phải có HTTPS — và cái gì hỏng nếu không có

Đây là chỗ dễ mất cả buổi sáng nhất, nên đọc trước khi hẹn cô.

Phân hệ Ghi nhanh mở máy ảnh bằng `<input type="file" capture>` — tức gọi **app
máy ảnh của hệ điều hành**, không phải `getUserMedia`. Nhờ vậy máy ảnh chạy được
cả trên `http://`. Nhưng hai thứ khác thì **không**:

| Chạy trên `http://192.168.x.x` | Kết quả |
|---|---|
| Mở máy ảnh, chụp, gõ chú thích, Lưu | ✅ chạy bình thường |
| Lưu vào máy khi mất sóng (IndexedDB) | ✅ chạy bình thường |
| Mã chống nhân đôi | ✅ có đường dự phòng khi thiếu `crypto.randomUUID` |
| **Cài app lên màn hình chính (PWA)** | ❌ không cài được |
| **Mở lại app trong lúc VẪN đang mất sóng** | ❌ trắng trang — không có service worker thì không có gì để tải |

Vế cuối đánh thẳng vào **Lời hứa 2** bên dưới. Chạy phép thử trên `http://` rồi
kết luận "app mất bài ghi khi offline" là **kết luận sai** — cái hỏng là môi
trường thử, không phải app.

### Cách rẻ nhất để có HTTPS cho buổi thử

Máy chủ thật của trường chưa có (N7 trong `docs/TIEN-DO.md`). Dùng một đường hầm
tạm:

```bash
# Máy tính chạy app (cùng mạng hoặc bất kỳ đâu)
DATA_DIR=/tmp/casa-thu PORT=3000 npm start

# Cửa sổ khác: mở đường hầm HTTPS tạm, không cần tài khoản
cloudflared tunnel --url http://localhost:3000
# → in ra một địa chỉ https://<ngẫu-nhiên>.trycloudflare.com
```

Đưa đúng địa chỉ `https://…` đó cho cô mở trên điện thoại. Đóng cửa sổ là đường
hầm biến mất.

> Nếu **không thể** có HTTPS trong buổi thử, vẫn thử được Lời hứa 1 và 3 trên
> `http://`. Riêng Lời hứa 2 thì **ghi là "chưa thử được"**, đừng ghi là trượt.

---

## 2. Chuẩn bị (làm trước khi cô tới, khoảng 15 phút)

- [ ] `DATA_DIR` trỏ ra **ngoài** thư mục mã nguồn. Từ bản này, chạy
      `NODE_ENV=production` với dữ liệu nằm trong kho mã thì máy chủ **dừng hẳn**.
- [ ] Sinh dữ liệu mẫu: `DATA_DIR=/tmp/casa-thu node data/seed.js --force`
- [ ] **Đổi mật khẩu mẫu.** Dữ liệu mẫu có 9 tài khoản dùng chung `123456`.
      Máy chủ mở ra Internet mà còn mật khẩu đó là mở cửa cho người lạ.
      Kiểm bằng: `DATA_DIR=/tmp/casa-thu npm run kiem-tra-may-chu`
- [ ] Bật phân hệ: đăng nhập quản trị → **Quản trị → Tính năng → Ghi nhanh**.
      Mặc định nó TẮT.
- [ ] Tạo cho cô một tài khoản thật của cô, hoặc dùng `giaovien` (cô Mai Anh,
      nhóm Chồi 2) — nhưng đã đổi mật khẩu ở bước trên.
- [ ] Thử trước một lượt trên máy của chính bạn, để buổi thử của cô không mất
      thời gian vì lỗi cài đặt.
- [ ] Chuẩn bị **đồng hồ bấm giây** (điện thoại thứ hai), và giấy để ghi.

Cần **cả iPhone thật lẫn Android thật**. Không dùng giả lập: giả lập không tái
hiện được độ trễ mở app máy ảnh, mà đó chính là phần tốn giây nhất.

---

## 3. Nói với cô trước khi bắt đầu

Đọc nguyên văn cũng được:

> "Cô thử giúp em một việc thôi: chạm nút, chụp một tấm, chọn bé, gõ một dòng,
> rồi Lưu. Em bấm giờ **từ lúc cô chạm nút**. Cô cứ làm như bình thường, chậm
> cũng không sao — em đo để biết app có phiền cô hay không, chứ không đo cô."

Và một điều phải nói trước, nếu không cô sẽ tưởng app hỏng:

> "Trên iPhone, lúc mất sóng cô ghi xong thì bài ghi **nằm an toàn trong máy**,
> nhưng nó chỉ gửi lên khi cô **mở lại app** lần sau. iPhone không cho app gửi
> lúc đang đóng. Đó là giới hạn của iPhone, không phải app quên. Màn hình có ô
> *đang chờ gửi* để cô nhìn thấy nó vẫn còn đó."

---

## 4. Ba lời hứa và cách đo

### Lời hứa 1 — NHANH: dưới 20 giây

Làm **5 lượt liên tiếp** trên mỗi máy. Bấm giờ **từ lúc ngón tay chạm nút
"📸 Ghi nhanh một khoảnh khắc"**, dừng khi màn hình báo đã lưu.

App tự bấm giờ và hiện số giây ngay sau khi lưu — nhưng **vẫn bấm giờ tay song
song** ở lượt đầu để đối chiếu. Sau đó đọc ô thống kê **trung vị / nhanh nhất /
chậm nhất** trong màn Ghi nhanh.

| | iPhone | Android |
|---|---|---|
| Lượt 1 | ……… giây | ……… giây |
| Lượt 2 | ……… giây | ……… giây |
| Lượt 3 | ……… giây | ……… giây |
| Lượt 4 | ……… giây | ……… giây |
| Lượt 5 | ……… giây | ……… giây |
| **Trung vị app báo** | ……… giây | ……… giây |

**Đạt:** trung vị **< 20 giây**.
Ghi thêm: cô vấp ở bước nào? Bước nào cô phải nghĩ mới biết bấm gì?

### Lời hứa 2 — KHÔNG MẤT *(cần HTTPS, xem mục 1)*

1. Bật chế độ máy bay trên điện thoại.
2. Cô ghi **2 bài** như bình thường. Màn hình phải hiện **"2 bài ghi đang chờ gửi lên"**.
3. **Đóng hẳn app** (vuốt khỏi danh sách app đang chạy).
4. Tắt chế độ máy bay.
5. Mở lại app, đăng nhập nếu bị hỏi.

| | iPhone | Android |
|---|---|---|
| Ghi được khi đang mất sóng | ☐ | ☐ |
| Hiện đúng số bài đang chờ gửi | ☐ | ☐ |
| Mở lại app thì tự gửi lên | ☐ | ☐ |
| Sau khi gửi, ô "đang chờ" về 0 | ☐ | ☐ |
| **Không mất bài nào** | ☐ | ☐ |

**Đạt:** đủ 2 bài lên máy chủ, không mất, không phải làm gì thủ công.

### Lời hứa 3 — KHÔNG NHÂN ĐÔI

Ngay sau Lời hứa 2, đếm số bài ghi trong danh sách.

- [ ] Đúng bằng số cô đã ghi, **không có bài nào lặp**.
- [ ] Thử thêm: mất sóng, ghi 1 bài, mở lại app **hai lần liên tiếp** → vẫn chỉ
      một bài.

---

## 5. Ngoài ba lời hứa — ghi lại nếu thấy

Những thứ này không quyết định đạt/trượt, nhưng đáng giá hơn con số:

- Cô có tự tìm ra nút Ghi nhanh không, hay phải chỉ?
- Chữ trên màn hình cô đọc có hiểu ngay không? Có từ nào nghe lạ tai?
- Cô có ngại chụp không? Ngại vì cái gì — sợ sai, sợ mất thời gian, hay sợ bị
  xem là đang giám sát trẻ?
- Cô **muốn** ghi lại điều gì mà app chưa cho ghi?
- Hỏi thẳng: *"Nếu ngày nào cũng làm thế này 5–10 lần, cô thấy phiền không?"*

Câu cuối là câu quan trọng nhất của cả buổi.

---

## 6. Sau buổi thử

**Đạt cả ba lời hứa trên cả hai máy** → cập nhật `docs/TIEN-DO.md`, đánh dấu G0.3
xong hẳn, GĐ 0 đóng lại và đi tiếp GĐ 1.

**Trượt bất kỳ chỗ nào** → **dừng**. Ghi lại trượt ở đâu, số đo bao nhiêu, cô nói
gì. Rồi bàn lại, vì mỗi kiểu trượt dẫn tới một hướng khác hẳn:

| Trượt ở đâu | Nhiều khả năng phải đổi gì |
|---|---|
| Chậm vì mở máy ảnh lâu | Cho phép ghi **chỉ chữ**, ảnh là tuỳ chọn |
| Chậm vì bước chọn bé | Đổi cách chọn bé, hoặc cho ghi cho **cả nhóm** rồi tách sau |
| Chậm vì gõ chữ | Cho ghi âm thay vì gõ |
| Mất bài khi offline | Lỗi thật trong `modules/thuchup/` — sửa rồi thử lại |
| Cô thấy phiền dù nhanh | Vấn đề không nằm ở tốc độ. **Đây là kiểu trượt nặng nhất** — nó nói rằng chỗ đặt việc ghi chép đang sai, và GĐ 2 phải nghĩ lại từ đầu |

Dọn dẹp: xóa thư mục dữ liệu tạm, đóng đường hầm, tắt máy chủ thử.

---

## Ghi lại kết quả ở đâu

Chép bảng ở mục 4 vào `docs/TIEN-DO.md`, phần G0.3, kèm ngày thử và tên máy
(ví dụ *iPhone 12, iOS 17.4* / *Samsung A34, Android 14*). Con số này là **bằng
chứng để quyết định đi tiếp hay dừng** — nó đáng được ghi lại đúng chỗ, không
phải nhớ trong đầu.
