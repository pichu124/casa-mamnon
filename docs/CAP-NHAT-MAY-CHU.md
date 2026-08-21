# Cập nhật máy chủ đang chạy

Áp dụng cho cả hai phương án đặt máy chủ (A — máy tại trường, B — thuê VPS).
Dùng mỗi khi có bản mới trên GitHub.

> **Nguyên tắc:** dữ liệu của trường nằm ngoài thư mục mã nguồn, nên cập nhật app
> **không bao giờ đụng tới dữ liệu**. Điều đó cũng có nghĩa là quay lui bản cũ
> luôn an toàn — chỉ cần đổi mã nguồn về bản trước rồi khởi động lại.

---

## Quy trình chuẩn

Sáu bước, làm đúng thứ tự. Bước 2 và 4 là hai chốt chặn — bỏ qua chúng thì mất
luôn lưới an toàn.

```bash
# 1. Vào thư mục app
cd /opt/schoolconnect                    # [A] cd C:\Users\Administrator\School

# 2. SAO LƯU TRƯỚC KHI ĐỘNG VÀO GÌ
DATA_DIR=/var/lib/schoolconnect npm run backup

# 3. Lấy mã mới
git pull origin claude/school-communication-app-wqjitt
npm ci --omit=dev

# 4. CHẠY KIỂM THỬ — xanh hết mới đi tiếp
npm test

# 5. Khởi động lại
sudo systemctl restart schoolconnect     # [A] nssm restart SchoolConnect

# 6. Kiểm tra app sống lại thật
curl -I https://<tên-miền>/healthz       # phải ra HTTP/2 200
DATA_DIR=/var/lib/schoolconnect npm run kiem-tra-may-chu -- --ten-mien=<tên-miền>
```

**Bước 4 có bài đỏ thì DỪNG LẠI, đừng khởi động lại.** App đang chạy vẫn là bản
cũ và vẫn tốt — phụ huynh không bị ảnh hưởng gì. Ghi lại tên bài đỏ rồi báo người
viết phần mềm.

### Nếu bản mới có vấn đề — quay lui

```bash
git log --oneline -5                 # tìm mã bản trước, ví dụ 360284a
git checkout 360284a
npm ci --omit=dev
sudo systemctl restart schoolconnect
```

Dữ liệu không bị ảnh hưởng vì nó nằm ở thư mục khác. Quay lui xong báo lại để bản
sau sửa cho đúng, rồi `git checkout claude/school-communication-app-wqjitt` để
quay về nhánh chính khi đã có bản vá.

---

## Sau khi cập nhật — điện thoại đã cài app

Ứng dụng cài trên màn hình chính giữ một bản sao giao diện trong máy để chạy được
khi mất mạng. Mỗi bản cập nhật có đổi giao diện đều tăng số phiên bản trong
`public/sw.js`, nên **điện thoại tự nhận bản mới ở lần mở kế tiếp** — không cần
gỡ ra cài lại.

Nếu một máy cụ thể vẫn hiện bản cũ: đóng hẳn app (vuốt khỏi danh sách ứng dụng
đang chạy) rồi mở lại. Vẫn không được thì gỡ khỏi màn hình chính và thêm lại.

---

## `TRUST_PROXY` — đặt đúng theo phương án, đặt sai gây phiền thật

Cơ chế chống dò mật khẩu đếm số lần nhập sai theo địa chỉ người dùng. Địa chỉ đó
được xác định khác nhau tùy có máy chủ trung gian phía trước hay không.

| Phương án | Cấu hình | Vì sao |
|---|---|---|
| **B — VPS có Caddy** | **Giữ mặc định**, đừng đặt `TRUST_PROXY` | Caddy nối thêm địa chỉ thật của người dùng vào cuối danh sách chuyển tiếp, app lấy đúng giá trị đó. Đặt `TRUST_PROXY=0` ở đây là **sai**: khi ấy mọi người dùng đều mang chung địa chỉ của Caddy, một người nhập sai 8 lần là **khóa luôn cả trường**. |
| **A — máy tại trường, không có máy chủ trung gian** | **Bắt buộc `TRUST_PROXY=0`** | Không có gì kiểm chứng địa chỉ chuyển tiếp, nên phải bỏ qua nó hoàn toàn và chỉ tin địa chỉ kết nối thật. Không đặt thì người lạ tự khai địa chỉ giả mỗi lần thử là thoát được khóa. |

Cách đặt cho phương án A: thêm `Environment=TRUST_PROXY=0` vào tệp dịch vụ
(Linux), hoặc thêm vào `AppEnvironmentExtra` của NSSM (Windows), rồi khởi động lại.

---

## Việc riêng theo từng đợt vá

Phần lớn bản cập nhật chỉ cần quy trình chuẩn ở trên. Vài đợt có việc phải làm
thêm **một lần** trên máy đang chạy — liệt kê ở đây để không sót.

### Đợt vá tháng 08/2026 — 5 lỗ hổng bảo mật

Sau khi làm xong quy trình chuẩn, làm thêm ba việc sau.

**1. Dọn quan hệ giáo viên chủ nhiệm bị lệch.** Trước bản vá, đổi giáo viên chủ
nhiệm chỉ ghi một chiều, nên có thể còn giáo viên đang giữ quyền đọc hồ sơ một lớp
không còn là của mình. Xem trước rồi mới sửa:

```bash
DATA_DIR=/var/lib/schoolconnect npm run sua-quyen-chu-nhiem
# đọc kỹ kết quả, thấy đúng thì mới chạy:
DATA_DIR=/var/lib/schoolconnect npm run sua-quyen-chu-nhiem -- --sua
```

Giáo viên bị gỡ quyền sẽ không còn lớp — vào **Quản trị → Tổng quan** phân công
lại cho đúng.

**2. Đổi mật khẩu các tài khoản mẫu, nếu máy chủ từng chạy dữ liệu mẫu.** Bản vá
đã bỏ khối "Tài khoản dùng thử" khỏi màn hình đăng nhập và chặn việc tự sinh dữ
liệu mẫu khi chạy thật — nhưng **các tài khoản đã lỡ tạo ra thì vẫn còn và vẫn
đăng nhập được bằng cách gõ tay**. Kiểm bằng:

```bash
DATA_DIR=/var/lib/schoolconnect npm run kiem-tra-may-chu
```

Mục *Mật khẩu mẫu* còn báo CẦN SỬA thì làm theo mục 4.1 của
`docs/QUY-TRINH-TRIEN-KHAI.docx`: đổi mật khẩu từng tài khoản, và cho các học sinh
mẫu nghỉ học để ẩn đi.

**3. Kiểm `TRUST_PROXY` theo bảng ở trên.** Đây là lần đầu cấu hình này thật sự có
ảnh hưởng, nên đáng soát lại một lượt.

### Đợt vá tháng 08/2026 (đợt 2) — quản trị và điểm danh

Đợt này **không có việc phải làm thêm trên máy chủ**: chỉ cần quy trình chuẩn ở
đầu tệp này. Không có bảng nào đổi cấu trúc, không có biến môi trường mới, không
có lệnh nào phải chạy một lần.

Nhưng có ba thay đổi **hành vi** nên báo trước cho nhà trường, kẻo tưởng app hỏng:

**1. Danh sách lớp giờ tô đỏ lớp chưa có chủ nhiệm.** Nếu sau khi cập nhật thấy
vài lớp đỏ, đó không phải lỗi — đó là tình trạng có thật, trước đây không hiện ra.
Bấm **Sửa** ở dòng đó để phân công.

**2. "Cả lớp có mặt" nay hỏi lại, và mặc định KHÔNG ghi đè.** Cô đánh dấu vài em
nghỉ trước rồi bấm nút này thì mấy em đó **giữ nguyên**, chỉ những em chưa điểm
danh mới thành có mặt. Muốn ghi đè cả lớp phải bấm nút thứ hai trong hộp thoại.
Đây là chủ ý: trước bản này một lần chạm nhầm xóa sạch phần cô vừa nhập tay.

**3. Nhập lại tệp danh sách cũ nay bị chặn thay vì tạo bản sao.** Nếu văn thư
quen nhập lại cả tệp mỗi lần thêm vài em, màn hình sẽ báo "N em đã có trong hệ
thống" và chỉ nhập những em mới. Đó là đúng — trước đây việc này nhân đôi cả
trường kèm tài khoản phụ huynh mới mà không báo gì.

#### Kiểm bằng tay sau khi cập nhật — 6 việc, khoảng 10 phút

`npm test` đã canh toàn bộ những thứ này rồi, nhưng nó chạy trên máy chủ tạm.
Sáu việc dưới đây kiểm **đúng bản đang chạy thật, qua trình duyệt điện thoại**.
Làm bằng tài khoản quản trị trừ khi ghi khác.

| # | Làm gì | Phải thấy gì |
|---|---|---|
| 1 | **Quản trị → Nhập danh sách**, chọn một tệp CSV bất kỳ (tải **Tệp mẫu CSV** ngay trên màn hình đó là được) | Hiện bảng xem trước. **Nếu báo "Tệp bị lỗi phông chữ" với một tệp bình thường thì máy chủ đang chạy bản CŨ chưa vá** — xem ghi chú dưới bảng |
| 2 | Tải lên đúng tệp vừa nhập lần nữa | Hiện thẻ vàng "N em đã có trong hệ thống", nút ghi "Nhập 0 học sinh" và bị khóa |
| 3 | **Quản trị → Tổng quan**, bấm **Sửa** ở một lớp | Mở được hộp sửa, có ô chọn giáo viên chủ nhiệm, **không có** ô năm học |
| 4 | Bấm **Xem** ở một lớp | Mỗi em có nút **Sửa** và **Cho nghỉ** |
| 5 | Đăng nhập **bằng tài khoản giáo viên**, mở **Điểm danh**, cuộn xuống cuối rồi chạm một nút trạng thái | Màn hình **đứng yên tại chỗ**, không nhảy về đầu; hai ô đếm đổi ngay |
| 6 | Vẫn ở màn đó, bấm **Cả lớp có mặt** | Hiện hộp hỏi lại, có nút ghi đè riêng và nút Quay lại |

**Về việc 1 — vì sao phải kiểm.** Bản vá C1 đẩy lên ngày 21/08 có một lỗi: bộ lọc
bảng mã chạy ở trình duyệt nhận nhầm **dấu cách** là ký tự hỏng, nên nó từ chối
mọi tệp CSV có dấu cách — tức mọi tệp thật — ngay tại máy người dùng, tệp không
bao giờ được gửi lên nên máy chủ không hề biết. Bộ kiểm thử API không bắt được vì
nó gọi thẳng máy chủ. Lỗi đã sửa trong cùng đợt này, nhưng nếu kéo mã đúng vào
khoảng giữa hai bản thì máy chủ có thể đang chạy bản hỏng. Kiểm một lần cho chắc.

Thấy lỗi đó thì kéo mã mới rồi khởi động lại — không cần đụng dữ liệu:

```bash
cd /opt/schoolconnect
git pull origin claude/school-communication-app-wqjitt
npm ci --omit=dev && npm test
sudo systemctl restart schoolconnect
```

**Nếu việc 5 vẫn nhảy về đầu trang** thì gần như chắc chắn là **điện thoại đang
giữ bản giao diện cũ trong bộ nhớ đệm**, không phải máy chủ chưa cập nhật. Đóng
hẳn app rồi mở lại (điện thoại đã cài app: vuốt tắt khỏi danh sách ứng dụng đang
chạy). Số phiên bản đã tăng nên chậm nhất là lần mở thứ hai sẽ nhận bản mới.

### Đợt vá tháng 08/2026 (đợt 3) — năm học cũ và sửa/thu hồi

Đợt này thêm **hai bảng mới** vào cơ sở dữ liệu, nhưng **không có việc phải làm
thêm bằng tay**: cả hai đều được tạo bằng câu `CREATE TABLE IF NOT EXISTS` và
chạy tự động khi máy chủ khởi động lại. Không có bảng cũ nào bị đổi cấu trúc,
không có dữ liệu nào bị đụng vào.

| Bảng mới | Để làm gì |
|---|---|
| `record_edits` | Nhớ bản ghi nào đã sửa, bản ghi nào đã thu hồi (Thông báo, Nề nếp, Y tế, Nhận xét) |
| `student_class_history` | Ghi lại lớp của từng em **trước khi** chuyển năm học ghi đè mất |

**Việc duy nhất cần biết trước, và nó gấp:** bảng `student_class_history` chỉ ghi
được **từ lần chuyển năm học tiếp theo trở đi**. Nếu nhà trường đã bấm "Chuyển
năm học" trước khi cập nhật bản này thì năm đó **không lấy lại được** — cơ sở dữ
liệu không còn dấu vết em nào học lớp nào. Vì vậy: **cập nhật bản này TRƯỚC khi
bấm chuyển năm học lần đầu.**

#### Kiểm bằng tay sau khi cập nhật — 5 việc

| # | Làm gì | Phải thấy gì |
|---|---|---|
| 1 | **Khởi động lại máy chủ hai lần liên tiếp**, mỗi lần `systemctl status schoolconnect` | Cả hai lần đều `active (running)`. Đây là phép thử cho hai bảng mới: nếu lược đồ viết sai kiểu `ALTER TABLE` thì lần đầu chạy được, **lần thứ hai mới chết** |
| 2 | Mở một **thông báo cô vừa gửi** | Có nút **Sửa lại** và **Thu hồi**. Thu hồi xong thông báo biến mất và số "chưa đọc" giảm theo |
| 3 | **Nề nếp** → ghi một nhắc nhở trừ điểm → **Thu hồi** | Điểm thi đua của em **trở lại đúng như trước**, không còn bị trừ |
| 4 | **Y tế** → Thêm ghi nhận | Có ô **Ngày ghi nhận** để nhập bù đợt tiêm chủng đã làm trước đó |
| 5 | **Điểm danh** một ngày mà lớp có đơn nghỉ đã duyệt | Dòng của em đó hiện **"Có đơn nghỉ đã duyệt"** kèm lý do |

Ba thay đổi hành vi nên báo trước cho nhà trường:

1. **Thu hồi là ẩn, không phải xóa.** Nội dung vẫn nằm trong cơ sở dữ liệu và
   trong bản sao lưu — để tra khi có khiếu nại. Phụ huynh đã đọc rồi thì không
   lấy lại được điều họ đã thấy; thu hồi chỉ gỡ khỏi màn hình từ lúc đó trở đi.
2. **Sửa một nhận xét sẽ báo "mới" lại cho phụ huynh** và hiện kèm chữ "đã chỉnh
   sửa". Cố ý như vậy, để không ai tưởng mình nhớ nhầm nội dung cũ.
3. **Màn Nề nếp của cô chỉ hiện 50 ghi nhận gần nhất**, có nút "Xem thêm" ở cuối.
   Bảng điểm thi đua vẫn tính trên toàn bộ, không đổi.

---

## Bảng kiểm sau mỗi lần cập nhật

- [ ] Đã sao lưu **trước** khi kéo mã mới
- [ ] `npm test` xanh toàn bộ trên chính máy chủ
- [ ] `systemctl status schoolconnect` báo `active (running)`
- [ ] Mở `https://<tên-miền>` trên điện thoại bằng 4G, đăng nhập được
- [ ] Thử một việc hằng ngày thật: điểm danh một em, hoặc gửi một tin nhắn
- [ ] `npm run kiem-tra-may-chu` không còn mục nào CẦN SỬA
- [ ] Đã làm xong phần "việc riêng theo đợt vá" nếu bản này có
