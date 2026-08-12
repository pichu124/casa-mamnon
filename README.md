# 🏫 SchoolConnect – Sổ liên lạc điện tử

Ứng dụng web kết nối **nhà trường – gia đình**, hỗ trợ trao đổi thông tin giữa **giáo viên và phụ huynh học sinh**: điểm danh, xin phép nghỉ học, thực đơn bán trú, thời khóa biểu, nhận xét hằng ngày, báo cáo học tập, xe đưa đón, nề nếp, khảo sát, y tế học đường, dặn thuốc, album ảnh lớp, kế hoạch giáo dục, thông báo và nhắn tin trực tiếp.

## Chạy ứng dụng

```bash
npm install
npm start
```

Mở trình duyệt tại **http://localhost:3000**. Dữ liệu mẫu được tự sinh vào `data/db.json` ở lần chạy đầu (tạo lại từ đầu bằng `npm run seed`).

> Trên PowerShell cũ của Windows, `&&` không hợp lệ — hãy chạy `npm install` và `npm start` trên hai dòng riêng, hoặc dùng dấu `;` để ngăn cách.

## 📱 Dùng trên điện thoại

Giao diện được thiết kế cho điện thoại trước, và ứng dụng có thể **cài vào màn hình chính như app thật**.

### Bước 1 — Cho điện thoại truy cập được

Máy tính chạy server và điện thoại phải **cùng một mạng Wi-Fi**.

1. Trên máy tính, xem địa chỉ IP nội bộ:
   ```powershell
   ipconfig
   ```
   Tìm dòng **IPv4 Address** trong mục Wi-Fi, ví dụ `192.168.1.15`.

2. Lần đầu chạy, Windows sẽ hỏi quyền truy cập mạng cho Node.js — chọn **Cho phép** (Allow access) ở mạng Riêng tư. Nếu đã lỡ chặn, mở cổng thủ công bằng PowerShell **quyền Administrator**:
   ```powershell
   New-NetFirewallRule -DisplayName "SchoolConnect" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

3. Trên điện thoại, mở trình duyệt và truy cập `http://192.168.1.15:3000` (thay bằng IP của bạn).

### Bước 2 — Cài vào màn hình chính

| Thiết bị | Cách cài |
|---|---|
| **Android** (Chrome) | Menu ⋮ → **Thêm vào Màn hình chính** / **Cài đặt ứng dụng**. Hoặc vào mục **Cài đặt** trong app và bấm nút **Cài đặt**. |
| **iPhone/iPad** (Safari) | Nút Chia sẻ □↑ → **Thêm vào MH chính** (Add to Home Screen). |

Sau khi cài: app có icon riêng, mở toàn màn hình không thanh địa chỉ, và **xem lại được giao diện khi mất mạng**.

> **Lưu ý:** Chế độ cài đặt đầy đủ và hoạt động offline chỉ bật khi truy cập qua `localhost` hoặc **HTTPS**. Khi vào bằng địa chỉ IP dạng `http://192.168.x.x`, trình duyệt vẫn hiển thị app bình thường nhưng bỏ qua service worker. Muốn có đủ tính năng khi thử qua điện thoại, dùng một tunnel HTTPS tạm thời:
> ```bash
> npx cloudflared tunnel --url http://localhost:3000
> ```
> Lệnh này in ra một địa chỉ `https://...trycloudflare.com` — mở địa chỉ đó trên điện thoại.

### Đã tối ưu sẵn cho điện thoại

- Ô nhập cỡ chữ 16px nên **iOS không tự phóng to trang** khi bạn chạm vào
- Chừa **vùng tai thỏ và thanh home** khi chạy toàn màn hình
- Mọi nút bấm đạt tối thiểu 44×44px theo chuẩn của Apple và Google
- Phòng chat chiếm trọn màn hình, ô nhập luôn sát đáy
- **Tự dừng cập nhật khi bạn chuyển sang app khác** để tiết kiệm pin và dung lượng 4G
- Không có thanh cuộn ngang trên mọi màn hình, kể cả máy nhỏ 360px
- Tự đổi sang **nền tối** theo thiết lập của điện thoại

## Tài khoản dùng thử

| Vai trò | Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| Phụ huynh | `phuhuynh` | `123456` | Có 2 con ở 2 lớp (3A và 5B) |
| Phụ huynh | `phuhuynh2` | `123456` | Có 1 con ở lớp 3A |
| Giáo viên | `giaovien` | `123456` | Chủ nhiệm lớp 3A |
| Giáo viên | `giaovien2` | `123456` | Chủ nhiệm lớp 5B |

## Tính năng

**Dành cho phụ huynh**
- 👦 Xem hồ sơ học sinh, chuyển nhanh giữa các con
- 📅 Lịch điểm danh theo tháng, giờ vào/ra lớp
- 📝 Gửi đơn xin phép nghỉ học, theo dõi trạng thái duyệt
- 🍚 Thực đơn bán trú tuần này / tuần sau
- 🗓️ Thời khóa biểu từng lớp, đánh dấu tiết đang học
- 💬 Nhận xét hằng ngày của giáo viên về con
- 📊 Báo cáo kết quả học tập theo học kỳ
- 🚌 Tuyến xe đưa đón, hành trình trong ngày, gọi nhanh tài xế
- ⭐ Sổ nề nếp: tuyên dương / nhắc nhở, điểm thi đua
- 🗳️ Trả lời khảo sát của nhà trường
- 🩺 Hồ sơ y tế: khám định kỳ, tiêm chủng, sự cố
- 💊 Dặn thuốc: gửi hướng dẫn uống thuốc, cô xác nhận và ghi nhật ký
- 🖼️ Album ảnh hoạt động của lớp
- 📖 Kế hoạch giáo dục theo tháng
- 🔔 Thông báo từ trường/lớp, 💬 nhắn tin trực tiếp với giáo viên

**Dành cho giáo viên**
- Điểm danh cả lớp trong một chạm, duyệt đơn xin phép
- Viết nhận xét, ghi nhận nề nếp, cập nhật hành trình xe buýt
- Tạo khảo sát và xem kết quả tổng hợp, tạo thông báo, tạo album ảnh
- Xác nhận dặn thuốc và ghi nhật ký cho phụ huynh yên tâm
- Nhắn tin riêng với từng phụ huynh và nhóm chung của lớp

## Công nghệ

- **Backend**: Node.js + Express 5, lưu trữ JSON (`data/db.json`) — không cần cài database
- **Frontend**: SPA vanilla JavaScript, không cần bước build; giao diện mobile-first tiếng Việt
- **Xác thực**: phiên cookie HttpOnly, phân quyền theo vai trò (phụ huynh / giáo viên)
- Nhắn tin cập nhật gần thời gian thực bằng polling; huy hiệu (badge) số việc cần chú ý trên trang chủ

## Cấu trúc thư mục

```
server.js            # Express: tự nạp routes/, phục vụ SPA
lib/db.js            # Kho JSON + helper phân quyền
lib/auth.js          # Phiên đăng nhập, middleware vai trò
data/seed.js         # Sinh dữ liệu mẫu (ngày tháng tương đối theo hôm nay)
routes/*.js          # API từng phân hệ
public/index.html    # App shell
public/js/views/*.js # View từng phân hệ (tự đăng ký vào App.views)
```
