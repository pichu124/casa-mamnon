# Tiến độ — CASA Mầm non (app 2)

Nhật ký công việc của kho mã này. **Đọc tệp này đầu tiên** để biết đang đứng ở đâu.
Cập nhật ngay sau mỗi phần hoàn thiện, trước khi commit.

- Đang xây cái gì, theo thứ tự nào → `docs/KE-HOACH.md`
- Quy định bắt buộc khi sửa mã → `CLAUDE.md`
- Vá lỗi phần nền chung với app 1 → `docs/LOI-NEN-CHUNG.md`

> Nhật ký nâng cấp của **app 1** (các mục B1…B14) không nằm ở đây nữa. Nó vẫn còn
> nguyên trong lịch sử git: `git show nen-tu-app1-2026-08-26:docs/TIEN-DO.md`.

| | |
|---|---|
| Nền nhân bản từ | app 1 (SchoolConnect), tag `nen-tu-app1-2026-08-26` |
| Giai đoạn hiện tại | **GĐ 0 — dựng nền** |
| Đã chạy thật ở trường | **chưa** |

---

## GĐ 0 — Dựng nền (đang làm)

Mục tiêu: có một kho mã chạy được, biết rõ luật chơi, và **trả lời được câu hỏi
quyết định**: cô giáo cầm điện thoại của chính mình có ghi lại được một khoảnh
khắc của trẻ trong dưới 20 giây không?

### G0.1 — Nhân bản nền từ app 1 ✅

Clone toàn bộ kho app 1 (giữ nguyên lịch sử git) rồi tách ra:

- Nhánh làm việc: `main`. Tag điểm tách: `nen-tu-app1-2026-08-26`.
- Không có remote trỏ về kho app 1 → **không có đường đẩy nhầm code app 2 sang
  kho đang chạy thật**. Đây là điều quan trọng nhất của bước này.
- `npm install` chạy được, móc git đã tự bật (`.githooks/`).

Giữ nguyên lịch sử git chứ không tạo kho trắng rồi chép tệp vào, vì `git log` của
phần nền chính là tài liệu giải thích *vì sao* mỗi chỗ được viết như vậy — bỏ đi
là mất vĩnh viễn.

**Mang sang được (chưa sửa gì):** đăng nhập + băm mật khẩu scrypt, phân quyền
theo vai, `db.canAccessStudent`/`canAccessClass`, cơ chế phân hệ cắm thêm có cô
lập lỗi, bộ canh commit riêng, bộ canh dữ liệu thật, sao lưu/khôi phục, khung PWA
+ service worker, album ảnh có kiểm tra tệp giả danh ảnh, dặn thuốc, xin nghỉ,
thông báo, khảo sát, thực đơn.

### G0.2 — Luật chơi và định hướng ✅

| Tệp | Nội dung |
|---|---|
| `CLAUDE.md` | Viết mới cho app 2: Nguyên tắc số 1 + **5 QUY TẮC giáo dục CASA** + ba lớp dữ liệu của một quan sát + cách gọi tên bậc mầm non + quy tắc ảnh nhóm |
| `docs/KE-HOACH.md` | Bản kế hoạch đầy đủ: 5 quyết định nền, 4 giai đoạn, pháp lý, chi phí |
| `docs/LOI-NEN-CHUNG.md` | Quy ước vá lỗi chéo hai kho + sổ nợ |
| `docs/TIEN-DO.md` | Tệp này |
| `README.md` | Viết lại cho app 2 |

**5 QUY TẮC** vào `CLAUDE.md` giữ nguyên nghĩa từ bản kế hoạch CASA làm với
ChatGPT, chỉ dịch sang tiếng Việt. QUY TẮC 4 (không phần trăm, không xếp hạng
trẻ) sẽ được canh bằng bài test quét giao diện ở GĐ 2 — **chưa có bài test đó thì
quy tắc mới chỉ là lời hứa**, ghi ở đây để không quên.

### G0.3 — Phép thử quyết định: ghi lại một khoảnh khắc ⏳

Phân hệ `modules/thuchup/` — bản thử, **không phải bản dùng thật**:

- Cô chọn bé → chụp ảnh → gõ một dòng → lưu. Đo thời gian thật từ lúc mở tới lúc
  lưu xong, hiện số giây lên cho chính cô thấy.
- Tắt mạng vẫn lưu được; mở lại app thì tự gửi lên; **không mất, không nhân đôi**.
- Thử trên **iPhone thật và Android thật của cô giáo**, không dùng giả lập.

**Đây là cổng DỪNG.** Phép thử trượt ở đâu thì dừng lại bàn với người dùng, không
lao tiếp sang GĐ 1. Lý do: toàn bộ GĐ 2 đứng trên giả định "ghi lại nhanh tới mức
cô không thấy phiền". Giả định đó sai thì kế hoạch phải đổi, chứ không phải cố
làm cho xong.

### G0.4 — Chuyển mô hình lớp: một cô một lớp → nhiều cô một nhóm ⏳

Thay đổi lớn nhất và nguy hiểm nhất của GĐ 0. App 1 gắn cứng *một giáo viên chủ
nhiệm cho một lớp* (`classes.homeroomTeacherId`); mầm non thì **một nhóm 2–3 cô
cùng phụ trách**, và một cô có thể phụ trách nhiều nhóm.

Chạm vào `lib/db.js` (`classIdsOf`, `studentsOf`, `canAccessClass`) — nhóm tệp
dùng chung. **Bắt buộc đi đủ ba bước, mỗi bước một commit, chạy `npm test` sau
mỗi bước:**

1. Thêm bảng `class_teachers` + hàm mới bên cạnh, chưa ai gọi.
2. Chuyển từng chỗ gọi sang hàm mới; `homeroomTeacherId` vẫn còn và vẫn đúng.
3. Khi không còn ai đọc `homeroomTeacherId` mới bỏ nó khỏi đường đọc — **cột dữ
   liệu vẫn giữ**, không `DROP`.

### G0.5 — Dữ liệu mẫu kể một câu chuyện ⏳

Thay dữ liệu mẫu tiểu học bằng câu chuyện mầm non nhất quán: **bé An, nhóm Chồi
2, cơ sở 1** — cùng một bé xuất hiện xuyên suốt mọi màn hình và mọi bài kiểm thử.
Học từ bản kế hoạch CASA (ở đó là bé Anna): dữ liệu mẫu rời rạc làm người xem
không hình dung nổi app dùng thật ra sao.

### G0.6 — Chạy toàn bộ kiểm thử ở kho mới ⏳

Chạy `npm test` và `npm run test:giao-dien` để biết **con số nền** của app 2
trước khi sửa gì. Ghi lại kết quả ở đây.

---

## Việc đã biết trước, chưa làm — không được quên

Ghi ở đây thay vì để trong đầu, vì phiên làm việc sau sẽ không nhớ.

| # | Việc | Vì sao quan trọng | Làm ở |
|---|---|---|---|
| N1 | `docs/CAP-NHAT-MAY-CHU.md`, `docs/MAY-CHU-THU-ORACLE.md`, `docs/QUY-TRINH-TRIEN-KHAI.docx`, `docs/so-do-*.svg` vẫn mô tả **máy chủ Oracle của app 1** | Người triển khai app 2 đọc nhầm sẽ dựng sai chỗ. App 2 chạy VPS Việt Nam, trường đứng tên | Trước khi triển khai thật |
| N2 | `android/`, `capacitor.config.json`, `render.yaml` là vỏ đóng gói của app 1 | App 2 đã chốt chỉ làm PWA. Để nguyên thì vô hại nhưng gây hiểu nhầm | GĐ 1 |
| N3 | Phân hệ riêng của tiểu học vẫn còn: `hocsinh-cu`, `namhoccu`, học bạ theo học kỳ, **nề nếp/thi đua có xếp hạng** | Xếp hạng trẻ **đi ngược QUY TẮC 4**. Tuyệt đối không để lọt sang màn hình mầm non | GĐ 1, gỡ theo đúng quy trình "bỏ tính năng" |
| N4 | Chưa có tầng **cơ sở** (3 cơ sở) và vai **quản lý cơ sở** | Là mô hình thật của trường; càng để muộn càng phải sửa nhiều chỗ | GĐ 0/1 |
| N5 | `DATA_DIR` mặc định là `./data` nằm trong kho mã | Ảnh khuôn mặt trẻ 2–6 tuổi. Phải trỏ ra ngoài **ngay lần chạy thật đầu tiên** | Trước khi triển khai |
| N6 | Bài test canh QUY TẮC 4 (quét giao diện tìm %, điểm số, xếp hạng) chưa có | Không có nó thì QUY TẮC 4 chỉ là lời hứa | GĐ 2 |
| N7 | Chưa đăng ký VPS Việt Nam + tên miền đứng tên trường | Việc của nhà trường; chặn phần triển khai | Nhà trường làm |

---

## Nhật ký commit

| Ngày | Việc | Mục |
|---|---|---|
| 26/08/2026 | Nhân bản nền từ app 1, viết `CLAUDE.md` + bộ docs định hướng | G0.1, G0.2 |
