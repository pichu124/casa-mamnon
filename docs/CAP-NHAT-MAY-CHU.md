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

---

## Bảng kiểm sau mỗi lần cập nhật

- [ ] Đã sao lưu **trước** khi kéo mã mới
- [ ] `npm test` xanh toàn bộ trên chính máy chủ
- [ ] `systemctl status schoolconnect` báo `active (running)`
- [ ] Mở `https://<tên-miền>` trên điện thoại bằng 4G, đăng nhập được
- [ ] Thử một việc hằng ngày thật: điểm danh một em, hoặc gửi một tin nhắn
- [ ] `npm run kiem-tra-may-chu` không còn mục nào CẦN SỬA
- [ ] Đã làm xong phần "việc riêng theo đợt vá" nếu bản này có
