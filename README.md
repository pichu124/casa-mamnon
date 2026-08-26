# 🌱 CASA Mầm non

Ứng dụng liên lạc **nhà trường ↔ gia đình** cho một trường mầm non **3 cơ sở**,
trẻ 2–6 tuổi.

Mục tiêu số một: **thay hẳn sổ liên lạc giấy** — điểm danh, báo ăn, nhật ký
ăn–ngủ–vệ sinh, đón trả, dặn thuốc, xin nghỉ, thông báo, album ảnh. Sau đó mới
tới phần **hành trình học tập** theo triết lý CASA: cô ghi lại khoảnh khắc của
trẻ, kể thành câu chuyện cho gia đình — không chấm điểm, không xếp hạng trẻ.

> **Trạng thái: đang xây (GĐ 0).** Chưa chạy thật ở trường.
> Đang đứng ở đâu → [`docs/TIEN-DO.md`](docs/TIEN-DO.md).

---

## Đọc theo thứ tự này

| Tệp | Trả lời câu hỏi |
|---|---|
| [`docs/KE-HOACH.md`](docs/KE-HOACH.md) | Xây cái gì, theo thứ tự nào, tốn bao nhiêu, vướng gì về pháp lý |
| [`docs/TIEN-DO.md`](docs/TIEN-DO.md) | **Hiện đang làm tới đâu**, việc nào đã biết mà chưa làm |
| [`CLAUDE.md`](CLAUDE.md) | Luật bắt buộc khi sửa mã: Nguyên tắc số 1 + 5 QUY TẮC giáo dục |
| [`docs/LOI-NEN-CHUNG.md`](docs/LOI-NEN-CHUNG.md) | Lỗi ở phần nền thì vá hai kho ra sao |
| [`modules/README.md`](modules/README.md) | Cách thêm một tính năng mà không đụng phần đang chạy |

---

## Kho mã này đến từ đâu

Nhân bản từ **SchoolConnect** (app 1 — trường tiểu học, đang chạy thật cho ~300
học sinh) tại tag `nen-tu-app1-2026-08-26`, giữ nguyên toàn bộ lịch sử git.

Mang sang được khoảng **70% phần nền**: đăng nhập và băm mật khẩu, phân quyền
theo vai, cơ chế phân hệ cắm thêm có cô lập lỗi, sao lưu/khôi phục, bộ canh
commit và bộ canh dữ liệu, khung PWA, album ảnh, dặn thuốc, xin nghỉ, thông báo,
thực đơn.

Hai kho **phát triển độc lập**. Kho này không có remote nào trỏ về app 1 — cố ý,
để không có đường đẩy nhầm code sang ứng dụng đang chạy thật của trường tiểu học.

Xem lịch sử phần nền:

```bash
git log nen-tu-app1-2026-08-26                       # toàn bộ quá trình xây app 1
git show nen-tu-app1-2026-08-26:docs/TIEN-DO.md      # nhật ký nâng cấp của app 1
```

---

## Chạy thử

Cần **Node.js dòng 22 (LTS)**. Bản khác dòng 22 bị chặn ngay ở `npm install` —
dòng 22 là dòng duy nhất toàn bộ kiểm thử đã chạy trên đó. Không cần cài công cụ
biên dịch nào.

```bash
npm install
npm start
```

Mở **http://localhost:3000**. Dữ liệu mẫu tự sinh vào `data/school.db` ở lần chạy
đầu (tạo lại bằng `npm run seed`).

> Khi chạy thật: **`DATA_DIR` phải trỏ ra ngoài kho mã.** Mặc định `./data` chỉ
> tiện lúc phát triển — dữ liệu ở đây là ảnh khuôn mặt và hồ sơ sức khỏe của trẻ
> dưới 6 tuổi.

## Kiểm thử

```bash
npm test                 # bộ đầy đủ, không cần trình duyệt
npm run test:giao-dien   # chạy trên trình duyệt thật, cần Playwright
npm run test:tat-ca      # cả hai
```

Số bài hiện tại ghi ở [`docs/TIEN-DO.md`](docs/TIEN-DO.md) — không ghi cứng ở đây
để tránh hai chỗ nói khác nhau.

---

## Hai điều quan trọng nhất khi sửa mã

**Nguyên tắc số 1 — không bao giờ làm app ngừng dùng được.** Thêm hay bỏ một tính
năng thì app vẫn đăng nhập được, tính năng khác vẫn chạy y như cũ, dữ liệu đã có
không mất. Bỏ tính năng là *ngưng dùng*, không phải xóa dữ liệu.

**5 QUY TẮC giáo dục** — quan sát ≠ đánh giá · chưa quan sát thấy ≠ không làm
được · AI gợi ý ≠ cô quyết định · không phần trăm/không xếp hạng trẻ · đánh giá
phải dẫn tới hành động. Chi tiết và cách canh bằng máy: [`CLAUDE.md`](CLAUDE.md).

Dữ liệu trẻ dưới 6 tuổi kèm ảnh và hồ sơ sức khỏe thuộc nhóm nhạy cảm theo **Nghị
định 13/2023/NĐ-CP** và **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15**. Máy chủ đặt
tại Việt Nam, trường đứng tên.
