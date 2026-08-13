# Tiến độ nâng cấp B1–B5

Tệp này ghi lại trạng thái công việc để có thể dừng và tiếp tục bất cứ lúc nào.
**Cập nhật ngay sau mỗi phần hoàn thiện, trước khi commit.**

Mục tiêu: đưa hệ thống từ quy mô demo lên vận hành thật cho trường 300 học sinh.
Xem kế hoạch đầy đủ và lý do từng hạng mục trong `docs/KE-HOACH-TRIEN-KHAI.md`.

---

## Tổng quan

| Mã | Hạng mục | Trạng thái |
|----|----------|-----------|
| B1 | Chuyển kho dữ liệu sang SQLite | ✅ **Hoàn thành** |
| B4 | Sao lưu tự động | ✅ **Hoàn thành** |
| B3 | Cấp lại mật khẩu khi quên | ⏳ Đang làm |
| B2 | Trang quản trị và nhập danh sách | ⬜ Chưa bắt đầu |
| B5 | Chuyển năm học và lên lớp | ⬜ Chưa bắt đầu |

Thứ tự thực hiện: **B1 → B4 → B3 → B2 → B5**.
B1 là nền tảng cho mọi việc còn lại. B4 làm sớm để dữ liệu được an toàn ngay.
B2 phụ thuộc B1, B5 phụ thuộc B2.

---

## B1 — Chuyển kho dữ liệu sang SQLite

**Kết quả sau khi hoàn thành**, đo trên dữ liệu mô phỏng một năm học của
300 học sinh:

| Phép đo | Kho JSON cũ | SQLite | Cải thiện |
|---------|------------|--------|-----------|
| Ghi một lượt điểm danh | 1.803 ms | 0,091 ms | nhanh gấp ~20.000 lần |
| Cao điểm sáng (300 lượt) | 541 giây | 30 ms | nhanh gấp ~18.000 lần |
| Bộ nhớ máy chủ chiếm dụng | 195 MB | 7 MB | giảm 96% |
| Mở màn hình điểm danh cả lớp | — | 0,110 ms | |
| Mở một phòng chat | — | 0,208 ms | |

Toàn bộ 192 bài kiểm thử (API, bảo mật, PWA, album) đều đạt sau khi chuyển đổi.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B1.1 | Cài `better-sqlite3`, xác nhận biên dịch được | ✅ Xong |
| B1.2 | Thiết kế lược đồ bảng (`lib/schema.sql`) | ✅ Xong |
| B1.3 | Viết lại `lib/db.js` trên nền SQLite | ✅ Xong |
| B1.4 | Chuyển `data/seed.js` sinh thẳng vào SQLite | ✅ Xong |
| B1.5 | Script chuyển dữ liệu `db.json` cũ sang SQLite | ✅ Xong |
| B1.6 | Sửa nhóm route 1: auth, dashboard, students | ✅ Xong |
| B1.7 | Sửa nhóm route 2: attendance, leave, remarks, reports | ✅ Xong |
| B1.8 | Sửa nhóm route 3: menu, timetable, plans, bus, conduct | ✅ Xong |
| B1.9 | Sửa nhóm route 4: health, medicine, surveys | ✅ Xong |
| B1.10 | Sửa nhóm route 5: albums, notifications, messages | ✅ Xong |
| B1.11 | Chạy lại toàn bộ 4 bộ kiểm thử | ✅ Xong — 192/192 đạt |
| B1.12 | Đo lại hiệu năng ở quy mô 300 học sinh | ✅ Xong |

---

## B4 — Sao lưu tự động

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B4.1 | Script sao lưu dùng lệnh `.backup` của SQLite | ✅ Xong |
| B4.2 | Vòng đời bản sao: 7 ngày / 4 tuần / 12 tháng | ✅ Xong |
| B4.3 | Sao lưu kèm ảnh album | ✅ Xong |
| B4.4 | Script khôi phục và hướng dẫn tập dượt | ✅ Xong — đã diễn tập xóa và lấy lại thành công |
| B4.5 | Hướng dẫn cấu hình cron và đẩy ra nơi lưu ngoài | ✅ Xong — `docs/SAO-LUU.md` |

---

## B3 — Cấp lại mật khẩu khi quên

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B3.1 | Trường `mustChangePassword` trong bảng người dùng | ⬜ |
| B3.2 | API cấp mật khẩu tạm (giáo viên cấp cho phụ huynh lớp mình) | ⬜ |
| B3.3 | Buộc đổi mật khẩu ngay khi đăng nhập bằng mật khẩu tạm | ⬜ |
| B3.4 | Ghi nhật ký mọi lượt cấp lại | ⬜ |
| B3.5 | Giao diện cho giáo viên và màn hình buộc đổi | ⬜ |

---

## B2 — Trang quản trị và nhập danh sách

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B2.1 | Vai trò `admin`, phân quyền và tài khoản quản trị đầu tiên | ⬜ |
| B2.2 | Nhật ký thao tác (ai làm gì, lúc nào) | ⬜ |
| B2.3 | API quản lý lớp và phân công giáo viên chủ nhiệm | ⬜ |
| B2.4 | API quản lý học sinh: thêm, sửa, chuyển lớp, nghỉ học | ⬜ |
| B2.5 | Nhập danh sách từ tệp CSV, kiểm tra lỗi trước khi ghi | ⬜ |
| B2.6 | Tự sinh tài khoản và mật khẩu ban đầu, xuất phiếu để in | ⬜ |
| B2.7 | Giao diện quản trị | ⬜ |

---

## B5 — Chuyển năm học và lên lớp

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B5.1 | Gắn dữ liệu theo năm học, tra cứu được năm cũ | ⬜ |
| B5.2 | Thao tác lên lớp hàng loạt cuối năm | ⬜ |
| B5.3 | Tiếp nhận khối mới, xử lý học sinh chuyển đi | ⬜ |
| B5.4 | Giao diện chuyển năm học cho quản trị | ⬜ |

---

## Cách tiếp tục khi phiên làm việc bị gián đoạn

1. Đọc bảng trạng thái ở trên, tìm dòng ⏳ hoặc ⬜ đầu tiên.
2. Xem `git log --oneline -15` để biết phần nào đã đẩy lên.
3. Chạy `npm test` (nếu đã có) hoặc các bộ kiểm thử trong thư mục tạm để xác nhận
   trạng thái hiện tại còn chạy được.
4. Làm tiếp bước đó, cập nhật bảng này, rồi commit và đẩy lên.
