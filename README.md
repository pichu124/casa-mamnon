# 🏫 SchoolConnect – Sổ liên lạc điện tử

Ứng dụng web kết nối **nhà trường – gia đình**, hỗ trợ trao đổi thông tin giữa **giáo viên và phụ huynh học sinh**: điểm danh, xin phép nghỉ học, thực đơn bán trú, thời khóa biểu, nhận xét hằng ngày, báo cáo học tập, xe đưa đón, nề nếp, khảo sát, y tế học đường, dặn thuốc, album ảnh lớp, kế hoạch giáo dục, thông báo và nhắn tin trực tiếp.

## Chạy ứng dụng

```bash
npm install
npm start
```

Mở trình duyệt tại **http://localhost:3000**. Dữ liệu mẫu được tự sinh vào `data/db.json` ở lần chạy đầu (tạo lại từ đầu bằng `npm run seed`).

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
