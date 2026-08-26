# Tiến độ — CASA Mầm non (app 2)

Nhật ký công việc của kho mã này. **Đọc tệp này đầu tiên** để biết đang đứng ở đâu.
Cập nhật ngay sau mỗi phần hoàn thiện, trước khi commit.

- Đang xây cái gì, theo thứ tự nào → `docs/KE-HOACH.md`
- Quy định bắt buộc khi sửa mã → `CLAUDE.md`
- Vá lỗi phần nền chung với app 1 → `docs/LOI-NEN-CHUNG.md`

> Nhật ký nâng cấp của **app 1** (các mục B1…B14) không nằm ở đây nữa. Nó vẫn còn
> nguyên trong lịch sử git: `git show bc9dfa3:docs/TIEN-DO.md`.

| | |
|---|---|
| Nền nhân bản từ | app 1 (SchoolConnect), điểm tách `bc9dfa3` |
| Giai đoạn hiện tại | **GĐ 0 — dựng nền** |
| Đã chạy thật ở trường | **chưa** |

---

## GĐ 0 — Dựng nền (đang làm)

Mục tiêu: có một kho mã chạy được, biết rõ luật chơi, và **trả lời được câu hỏi
quyết định**: cô giáo cầm điện thoại của chính mình có ghi lại được một khoảnh
khắc của trẻ trong dưới 20 giây không?

### G0.1 — Nhân bản nền từ app 1 ✅

Clone toàn bộ kho app 1 (giữ nguyên lịch sử git) rồi tách ra:

- Nhánh làm việc: `main`. Điểm tách: `bc9dfa3` (tag `nen-tu-app1-2026-08-26`, mới
  có ở bản trên máy — môi trường làm việc từ chối đẩy tag lên GitHub, 403).
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

### G0.3 — Phép thử quyết định: ghi lại một khoảnh khắc ✅ *(phần mã)*

Phân hệ `modules/thuchup/` đã dựng xong — bản thử, **không phải bản dùng thật**.
Mặc định TẮT, nhà trường bật trong Quản trị → Tính năng khi muốn thử.

Luồng: cô chạm **một nút** → máy ảnh mở ngay → chụp → chọn bé bằng chip → gõ một
dòng → Lưu. Bấm giờ **từ lúc chạm nút**, không phải từ lúc màn hình hiện ra — đo
từ lúc màn hình hiện ra sẽ ra con số đẹp giả tạo nếu cô để máy nằm đó một lúc.

Ba lời hứa và cách canh:

| Lời hứa | Cách làm | Canh ở đâu |
|---|---|---|
| **Nhanh** — dưới 20 giây | Máy tự bấm giờ, hiện số giây ngay sau khi lưu; màn hình có ô thống kê trung vị / nhanh nhất / chậm nhất | Chỉ đo được **trên tay cô giáo thật** |
| **Không mất** | Lưu vào IndexedDB của máy TRƯỚC, gửi lên máy chủ sau. Chỉ xoá khỏi máy **sau khi** máy chủ xác nhận | Thử tay khi tắt mạng |
| **Không nhân đôi** | Mã ghi nhận do máy của cô sinh (`crypto.randomUUID`), máy chủ thấy mã trùng thì trả lại bản cũ chứ không tạo bản mới | `test/thuchup.test.mjs` mục [3] |

Dùng IndexedDB chứ không dùng `localStorage`: một ảnh đã nén vẫn vài trăm KB,
`localStorage` chỉ khoảng 5MB cho cả app và khi đầy thì ném lỗi giữa chừng —
đúng lúc cô đang vội thì mất bài ghi.

`npm run test:thuchup` — **40 bài, xanh**. Bao gồm: gửi lại cùng mã 3 lần và 4
lần cùng lúc vẫn chỉ một bản ghi; cô nhóm khác và phụ huynh không mở được ảnh
(đây là bản nháp của cô, thuộc lớp dữ liệu 1); tắt phân hệ thì API bị chặn nhưng
dữ liệu còn nguyên; điểm danh và trang chủ không bị ảnh hưởng.

**Còn lại — và đây mới là cổng DỪNG thật:** thử trên **iPhone thật và Android
thật của cô giáo**, không dùng giả lập. Phép thử trượt ở đâu thì dừng lại bàn với
người dùng, không lao tiếp sang GĐ 1. Lý do: toàn bộ GĐ 2 đứng trên giả định
"ghi lại nhanh tới mức cô không thấy phiền". Giả định đó sai thì kế hoạch phải
đổi, chứ không phải cố làm cho xong.

> Điều cần biết trước khi thử trên iPhone: iOS **không** cho PWA gửi dữ liệu khi
> app đang đóng. Bài ghi nằm an toàn trong máy và chỉ lên máy chủ vào lần cô mở
> app kế tiếp. Đó là giới hạn của hệ điều hành, không phải lỗi — nhưng cô cần
> được nói trước, và màn hình có ô "đang chờ gửi" để cô nhìn thấy điều đó.

### G0.4 — Chuyển mô hình lớp: một cô một lớp → nhiều cô một nhóm ⏳

Thay đổi lớn nhất và nguy hiểm nhất của GĐ 0. App 1 gắn cứng *một giáo viên chủ
nhiệm cho một lớp*; mầm non thì **một nhóm 2–3 cô cùng phụ trách**, và một cô có
thể phụ trách nhiều nhóm.

> **Đính chính bản kế hoạch:** app 1 không có cột `classes.homeroomTeacherId`.
> Quan hệ chủ nhiệm nằm ở **hai** cột phải luôn ghi khớp nhau —
> `classes.teacherId` (màn hình quản trị đọc) và `users.classId` (**quyền đọc hồ
> sơ học sinh đi theo cột này**). Hai cột chứ không phải một, nên chỗ dễ hỏng
> nhiều gấp đôi so với lúc lập kế hoạch tưởng.

Chạm vào `lib/db.js` (`classIdsOf`, `studentsOf`, `canAccessStudent`) — nhóm tệp
dùng chung. **Bắt buộc đi đủ ba bước, mỗi bước một commit, chạy `npm test` sau
mỗi bước:**

1. **✅ Thêm bảng `class_teachers` + hàm mới bên cạnh, chưa ai gọi.**
2. **✅ Chuyển từng chỗ gọi sang hàm mới; hai cột cũ vẫn còn và vẫn đúng.**
3. ⏳ Khi không còn ai đọc hai cột cũ mới bỏ chúng khỏi đường đọc — **cột dữ
   liệu vẫn giữ**, không `DROP`.

#### Bước 1/3 ✅ — thêm bên cạnh, chưa ai gọi

| Thêm gì | Ở đâu |
|---|---|
| Bảng `class_teachers (classId, teacherId, vaiTro, ganLuc)` | `lib/schema.sql` |
| 9 hàm mới: `teachersOfClass`, `teacherIdsOfClass`, `classIdsOfTeacher`, `classIdsEverOfTeacher`, `isTeacherOfClass`, `setClassTeachers`, `addClassTeacher`, `removeClassTeacher`, `setHomeroomTeacher` | `lib/db.js` |
| 46 bài kiểm thử | `test/nhom-lop.test.mjs` (`npm run test:nhom-lop`) |

Bốn quyết định đáng ghi lại:

- **Hai cột cũ được giữ làm gương, không bỏ.** Mọi đường ghi đều đi qua
  `mirrorLegacyHomeroom`, ghi đúng ba chiều mà `datChuNhiem` của app 1 đã trả giá
  để học. Nhờ vậy lỡ bảng mới sai thì còn đường quay lại, và
  `scripts/kiem-tra-may-chu.js` vẫn soát được như cũ.
- **Vai trò `chinh` vẫn độc quyền một nhóm mỗi cô**, vì hai cột cũ chỉ chứa nổi
  bấy nhiêu. Nhưng khi cô nhận nhóm mới, ở nhóm cũ cô bị **hạ xuống `phu` chứ
  không bị gỡ** — đó chính là chỗ mầm non khác tiểu học.
- **Nhóm đã đóng: giữ vết, không giữ quyền.** Dòng của nhóm đã đóng được giữ để
  còn nhận ra "cô từng phụ trách nhóm này" khi mở album năm cũ; `classIdsOfTeacher`
  lọc thêm `classes.active = 1` nên quyền đọc hồ sơ trẻ không rò rỉ theo.
- **Phần chuyển đổi chạy ở MỖI lần khởi động và chỉ THÊM.** Chạy một lần rồi thôi
  thì mỗi lần khôi phục từ bản sao lưu (`lib/importer.js` ghi thẳng hai cột cũ)
  là cô mất sạch nhóm mà không ai biết. Chỉ thêm thì không bao giờ dựng dậy được
  một phân công đã gỡ có chủ ý, vì hai cột cũ luôn là tập con của bảng mới.

Mục `[6]` của `test/nhom-lop.test.mjs` là mục quan trọng nhất của bước này: nó
chứng minh bước 1 **chưa đổi hành vi** của `studentsOf` / `classIdsOf` /
`canAccessStudent` — "thêm bên cạnh" đúng nghĩa bên cạnh.

#### Bước 2/3 ✅ — chuyển từng chỗ gọi sang hàm mới

Không chạm `lib/db.js`: đường quyền vẫn đọc `users.classId` như cũ, nên hành vi
của mọi màn hình đang có **không đổi một chút nào**. Cái đổi là chỗ các route hỏi
"cô nào của nhóm này" và "cô này phụ trách nhóm nào".

| Chỗ gọi | Trước | Sau |
|---|---|---|
| Hiển thị cô của một nhóm (hồ sơ bé, kế hoạch, TKB, quản trị, đăng nhập) | `classes.teacherId` → **một** cô | `db.teachersOfClass` → **đủ** các cô, qua `lib/nhom-lop.js` |
| Phân công cô | `datChuNhiem` trong `routes/admin.js` | `db.setHomeroomTeacher` (đường cũ) + `PUT /api/admin/classes/:id/teachers` (đường mới) |
| Cấp lại mật khẩu phụ huynh | trẻ của `actor.classId` | trẻ của **mọi** nhóm cô phụ trách |
| Album, thông báo, điểm danh cả lớp | `req.user.classId` | nhóm cô chọn, hoặc nhóm duy nhất của cô |
| Người giữ album nhóm đã đóng | riêng cô chủ nhiệm chính | **mọi** cô từng phụ trách nhóm |
| Gia đình nhắn tin | một cô chủ nhiệm | **mọi** cô của nhóm con mình |

Ba điều đáng ghi lại:

- **Chặn rò rỉ ghi chú thô của cô (`modules/thuchup/`).** Lớp dữ liệu 1 là "chỉ
  cô đã ghi đọc được". Trước G0.4 điều đó đúng một cách **tình cờ**: app 1 gắn
  một cô một lớp nên `canAccessStudent` vô tình cũng có nghĩa là "chỉ cô đã ghi".
  Nhóm 2–3 cô thì sự trùng khớp đó biến mất — không chặn thêm là nháp dở dang của
  cô này hiện thẳng cho cô kia đọc. Đã chặn ở tầng dữ liệu (lọc `byTeacherId`),
  không che ở giao diện. Quản trị vẫn xem được, đúng như bảng ba lớp dữ liệu.
- **Sổ điểm danh có ô chọn nhóm.** Dồn trẻ của mấy nhóm vào một danh sách là cô
  điểm danh nhầm nhóm mà không hay biết. Cô chỉ có một nhóm thì **không thấy ô
  này** và số thao tác không đổi.
- **`lib/importer.js` cũng phải dựng bảng mới.** Phần chuyển đổi ở `lib/db.js`
  chỉ chạy lúc KHỞI ĐỘNG; dữ liệu xuất hiện sau đó (máy chủ tự sinh dữ liệu mẫu ở
  lần chạy đầu, hoặc nhập kho JSON đời cũ) thì lúc ấy nó đã chạy xong trên một cơ
  sở dữ liệu rỗng. Bài `test/mat-khau.test.mjs` bắt được đúng lỗi này — máy chủ
  tự sinh dữ liệu mẫu SAU khi `lib/db.js` đã nạp, cô đăng nhập vào thấy nhóm
  trống trơn. Hai câu `INSERT OR IGNORE` hiện đang nằm ở hai nơi; **bước 3 gộp
  lại một chỗ**.

> **Trạng thái tạm ở giữa hai bước, cố ý và có kiểm soát:** sau bước 2, quản trị
> đã tích được 2–3 cô cho một nhóm, nhưng đường quyền vẫn đọc `users.classId`
> (chỉ chứa nổi cô phụ trách chính) nên **cô phụ chưa mở được hồ sơ trẻ** — bước
> 3 mới mở. Không có gì hỏng, không có gì lùi lại; chỉ là phần mới chưa nối điện
> xong. Ba commit đi cùng một lần đẩy nên không người dùng thật nào gặp trạng
> thái này. Đây là cái giá của quy định "sửa tệp dùng chung phải là commit
> riêng", và trả bằng một commit lưng chừng thì rẻ hơn nhiều so với trộn việc sửa
> `lib/db.js` vào cùng chỗ với 12 tệp tính năng.

### G0.5 — Dữ liệu mẫu kể một câu chuyện ⏳

Thay dữ liệu mẫu tiểu học bằng câu chuyện mầm non nhất quán: **bé An, nhóm Chồi
2, cơ sở 1** — cùng một bé xuất hiện xuyên suốt mọi màn hình và mọi bài kiểm thử.
Học từ bản kế hoạch CASA (ở đó là bé Anna): dữ liệu mẫu rời rạc làm người xem
không hình dung nổi app dùng thật ra sao.

### G0.6 — Con số kiểm thử hiện tại

| Bộ | Số bài |
|---|---|
| `npm test` (không cần trình duyệt) | **1049**, FAIL 0 |
| trong đó `test:thuchup` (phân hệ mới) | 40 |
| trong đó `test:nhom-lop` (G0.4) | 68 |
| `npm run test:giao-dien` (cần Playwright) | **209**, FAIL 0 *(đã chạy lại ở kho này)* |

Nền lấy từ app 1 là 932 bài; app 2 hiện là 932 + 40 (thuchup) + 68 (nhóm lớp)
+ 9 (mục khế ước của các hàm mới trong `lib/db.js`) = 1049. Con số này sẽ **giảm**
khi gỡ các phân hệ riêng của tiểu học (mục N3) và **tăng** khi thêm phần mầm non.

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
| 26/08/2026 | Phân hệ `thuchup` + 40 bài kiểm thử — phần mã của phép thử quyết định | G0.3 |
| 26/08/2026 | Nhiều cô một nhóm, **bước 1/3**: bảng `class_teachers` + 9 hàm mới, chưa ai gọi | G0.4 |
| 26/08/2026 | Nhiều cô một nhóm, **bước 2/3**: chuyển 12 tệp tính năng sang hàm mới; chặn rò rỉ ghi chú thô của cô | G0.4 |
