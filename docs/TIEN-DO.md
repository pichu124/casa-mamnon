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
| B3 | Cấp lại mật khẩu khi quên | ✅ **Hoàn thành** — 25/25 kiểm thử đạt |
| B2 | Trang quản trị và nhập danh sách | ✅ **Hoàn thành** — 43/43 kiểm thử đạt |
| B5 | Chuyển năm học và lên lớp | ✅ **Hoàn thành** — 31/31 kiểm thử đạt |

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
| B3.1 | Trường `mustChangePassword` trong bảng người dùng | ✅ Xong |
| B3.2 | API cấp mật khẩu tạm (giáo viên cấp cho phụ huynh lớp mình) | ✅ Xong |
| B3.3 | Buộc đổi mật khẩu ngay khi đăng nhập bằng mật khẩu tạm | ✅ Xong |
| B3.4 | Ghi nhật ký mọi lượt cấp lại | ✅ Xong |
| B3.5 | Giao diện cho giáo viên và màn hình buộc đổi | ✅ Xong |

---

## B2 — Trang quản trị và nhập danh sách

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B2.1 | Vai trò `admin`, phân quyền và tài khoản quản trị đầu tiên | ✅ Xong |
| B2.2 | Nhật ký thao tác (ai làm gì, lúc nào) | ✅ Xong |
| B2.3 | API quản lý lớp và phân công giáo viên chủ nhiệm | ✅ Xong |
| B2.4 | API quản lý học sinh: thêm, sửa, chuyển lớp, nghỉ học | ✅ Xong |
| B2.5 | Nhập danh sách từ tệp CSV, kiểm tra lỗi trước khi ghi | ✅ Xong |
| B2.6 | Tự sinh tài khoản và mật khẩu ban đầu, xuất phiếu để in | ✅ Xong |
| B2.7 | Giao diện quản trị | ✅ Xong |

---

## B5 — Chuyển năm học và lên lớp

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B5.1 | Gắn dữ liệu theo năm học, tra cứu được năm cũ | ✅ Xong |
| B5.2 | Thao tác lên lớp hàng loạt cuối năm | ✅ Xong |
| B5.3 | Tiếp nhận khối mới, xử lý học sinh chuyển đi | ✅ Xong |
| B5.4 | Giao diện chuyển năm học cho quản trị | ✅ Xong |

---

## Tổng kết

Cả năm hạng mục B1–B5 đã hoàn thành. **291 bài kiểm thử tự động đều đạt:**

| Bộ kiểm thử | Số bài | Nội dung |
|-------------|--------|----------|
| API | 68 | Toàn bộ nghiệp vụ và phân quyền hai vai trò |
| Bảo mật | 38 | Băm mật khẩu, cookie, header, chống dò, phiên bền vững |
| PWA và điện thoại | 43 | Cài đặt như app, chạy offline, giao diện iPhone và Android |
| Album ảnh | 43 | Tải ảnh, phân quyền xem, chặn tệp giả danh ảnh |
| Cấp lại mật khẩu | 25 | Mật khẩu tạm, buộc đổi, phân quyền |
| Quản trị và nhập liệu | 43 | Nhập CSV, bắt lỗi, sinh tài khoản, nhật ký |
| Chuyển năm học | 31 | Lên lớp, ra trường, giữ dữ liệu năm cũ |

Việc còn lại trước khi cho trường dùng thật nằm ở phía nhà trường: thuê hạ tầng,
soạn văn bản đồng ý của phụ huynh, nhập danh sách thật và tập huấn giáo viên.
Xem `docs/ke-hoach-trien-khai.html`.

---

## Cách tiếp tục khi phiên làm việc bị gián đoạn

1. Đọc bảng trạng thái ở trên, tìm dòng ⏳ hoặc ⬜ đầu tiên.
2. Xem `git log --oneline -15` để biết phần nào đã đẩy lên.
3. Chạy `npm test` (nếu đã có) hoặc các bộ kiểm thử trong thư mục tạm để xác nhận
   trạng thái hiện tại còn chạy được.
4. Làm tiếp bước đó, cập nhật bảng này, rồi commit và đẩy lên.
