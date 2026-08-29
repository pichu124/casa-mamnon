# Tiến độ — CASA Mầm non (app 2)

Nhật ký công việc của kho mã này. **Đọc tệp này đầu tiên** để biết đang đứng ở đâu.
Cập nhật ngay sau mỗi phần hoàn thiện, trước khi commit.

- Đang xây cái gì, theo thứ tự nào → `docs/KE-HOACH.md`
- Quy định bắt buộc khi sửa mã → `CLAUDE.md`
- Vá lỗi phần nền chung với app 1 → `docs/LOI-NEN-CHUNG.md`
- **Báo cáo gọn cho người dùng** (đã làm gì, tự quyết gì, chờ gì) → `docs/BAO-CAO-TU-LAM.md`

> Nhật ký nâng cấp của **app 1** (các mục B1…B14) không nằm ở đây nữa. Nó vẫn còn
> nguyên trong lịch sử git: `git show bc9dfa3:docs/TIEN-DO.md`.

| | |
|---|---|
| Nền nhân bản từ | app 1 (SchoolConnect), điểm tách `bc9dfa3` |
| Giai đoạn hiện tại | **sau GĐ 2** — GĐ 0, GĐ 1, GĐ 2 đã xong phần mã; đang dọn tồn đọng |
| Ba cổng DỪNG | **cả ba chưa mở** — chưa thử trên điện thoại thật của cô (GĐ 0), chưa có nhóm thí điểm chạy song song sổ giấy (GĐ 1), chưa có bé nào có câu chuyện học tập gia đình đọc được (GĐ 2) |
| Đã chạy thật ở trường | **chưa** |

> **Đọc bảng trên cho đúng.** "Đã xong phần mã" của một giai đoạn KHÔNG có nghĩa
> là giai đoạn đó đã qua. Mỗi giai đoạn có một cổng DỪNG mà chỉ nhà trường mở
> được — và cả ba cổng đều đang đóng. Tám phân hệ mầm non hiện **mặc định TẮT**,
> nghĩa là chưa ai từng nhìn app ở đúng trạng thái trường sẽ dùng.

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

### G0.4 — Chuyển mô hình lớp: một cô một lớp → nhiều cô một nhóm ✅

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
3. **✅ Khi không còn ai đọc hai cột cũ mới bỏ chúng khỏi đường đọc — cột dữ
   liệu vẫn giữ, không `DROP`.**

Đã đi đủ ba bước, `npm test` xanh sau mỗi bước, mỗi bước một commit và **không
commit nào trộn tệp dùng chung với tệp tính năng** (`npm run test:commit-rieng`
xanh cả ba lần).

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

#### Bước 3/3 ✅ — đường quyền thôi đọc hai cột cũ

Chỉ chạm `lib/db.js` (+ mấy tệp không thuộc tính năng nào), đúng quy định "sửa
tệp dùng chung phải là commit riêng".

| Hàm | Trước | Sau |
|---|---|---|
| `studentsOf` | trẻ của `users.classId` (một nhóm) | trẻ của **mọi** nhóm cô phụ trách, nhóm còn mở |
| `canAccessStudent` | bé có `classId = users.classId` | bé thuộc một nhóm cô phụ trách, nhóm còn mở |
| `classIdsOf` | `[users.classId]` | `classIdsOfTeacher(user.id)` |

**Từ đây `class_teachers` là nguồn sự thật DUY NHẤT của quyền.** Hai cột
`classes.teacherId` và `users.classId` vẫn được **ghi** làm gương và **cột dữ
liệu còn nguyên** — không `DROP`, đúng quy định. Ba lý do giữ:

1. lỡ bảng mới sai thì còn đường quay lại;
2. `scripts/kiem-tra-may-chu.js` vẫn soát chúng như cũ;
3. phần chuyển đổi lúc khởi động **dựng lại bảng mới từ chính hai cột đó** khi
   nhà trường khôi phục từ bản sao lưu đời cũ.

Kèm theo:

- **Gộp phần chuyển đổi về một chỗ.** Bước 2 phải chép tạm hai câu `INSERT OR
  IGNORE` sang `lib/importer.js`; bước 3 xuất `db.backfillClassTeachers` ra và
  importer gọi lại đúng bản gốc. Không còn hai nơi cùng viết một logic.
- **Bộ canh máy chủ có mục mới `3c. Cô phụ trách nhóm lớp`** — báo đỏ khi một
  nhóm đang mở không còn cô nào phụ trách. Mục `3b` cũ vẫn còn nhưng đã ghi rõ
  nó chỉ còn soát cái gương, không còn soát quyền.
- **Mục `[6]` của `test/nhom-lop.test.mjs` bị lật ngược.** Ở bước 1–2 nó canh
  "quyền CHƯA đổi"; bước 3 nó canh "quyền ĐÃ đi theo bảng mới", cộng mục `[6b]`
  canh nhóm đã đóng không còn cấp quyền cho ai. Đây là bài test được viết sẵn để
  lật — không phải nới lỏng một bài đang canh lỗi.
- **`test/thuchup.test.mjs` mục `[10]` và `[11]`** canh chỗ nguy hiểm nhất mà
  chính việc này tạo ra: hai cô cùng một nhóm **không** đọc được ghi chú thô của
  nhau.

#### Vá bổ sung — đường chống trùng mã cũng là một đường ĐỌC

Soát lại `modules/thuchup/` sau khi khoá ba đường đọc, còn sót một chỗ thứ tư:
`POST /api/thuchup` gửi lại đúng một mã thì trả về **nguyên bản ghi cũ**, kèm cả
dòng ghi chú và tên tệp ảnh — tức đọc lớp dữ liệu 1 ngay bên trong một đường ghi.
Nhìn vào chỉ thấy nó là `POST` nên rất dễ bỏ qua khi soát quyền.

Mã ghi nhận do máy của cô sinh (`crypto.randomUUID`) nên trùng nhau gần như
không xảy ra — nhưng "gần như không xảy ra" không phải là kiểm soát truy cập, và
đây là dữ liệu trẻ dưới 6 tuổi.

Đã vá cả hai nhánh trả về (đường thường và nhánh bắt lỗi khoá chính) bằng cùng
một hàm `doDuocBanGhi`, và đường đọc ảnh cũng chuyển sang gọi nó thay vì lặp lại
điều kiện — một luật, một chỗ. **Lời hứa "không nhân đôi" còn nguyên**: chính cô
đã ghi gửi lại vẫn nhận về bản cũ, mục `[11]` canh đúng điều đó.

#### Việc G0.4 mở ra, chưa làm

Đã chuyển hết vào bảng **"Việc đã biết trước, chưa làm"** ở cuối tệp này để chỉ
có một chỗ phải nhớ: **N8** (`sua-quyen-chu-nhiem.js` chỉ dọn được cái gương),
**N9** (giao diện còn nói tiếng tiểu học), **N10** (chưa có bài test canh cách
gọi tên). Riêng "dữ liệu mẫu chưa có nhóm nào 2–3 cô" là việc của **G0.5** ngay
bên dưới.

### G0.5 — Dữ liệu mẫu kể một câu chuyện ✅

Thay dữ liệu mẫu tiểu học bằng câu chuyện mầm non nhất quán: **bé An, nhóm Chồi
2, cơ sở 1** — cùng một bé xuất hiện xuyên suốt mọi màn hình và mọi bài kiểm thử.
Học từ bản kế hoạch CASA (ở đó là bé Anna): dữ liệu mẫu rời rạc làm người xem
không hình dung nổi app dùng thật ra sao.

#### Câu chuyện

| | |
|---|---|
| Trường | **Trường Mầm non CASA**, cơ sở 1 — 25 Nguyễn Văn Trỗi, Q. Phú Nhuận |
| Nhóm | **Chồi 2** (4–5 tuổi, 5 bé) và **Lá 1** (5–6 tuổi, 3 bé) |
| Cô | Cô Mai Anh (chính Chồi 2) · Cô Thu Hương (chính Lá 1) · **Cô Bích Ngọc phụ trách CẢ HAI nhóm** |
| Bé | **Nguyễn Bảo An** — nhóm Chồi 2. Anh của bé, bé Nam, học nhóm Lá 1, cùng một mẹ |

Bé An có mặt ở điểm danh, nhận xét hằng ngày, dặn thuốc, album, đơn xin nghỉ và
tin nhắn giữa mẹ và cô — mở màn hình nào cũng gặp lại đúng bé đó. Hai anh em ở
hai nhóm khác nhau để màn hình "đổi con đang xem" của phụ huynh có thật sự hai
bé để đổi, và để quyền của cô nhóm này với bé nhóm kia được thử bằng dữ liệu
thật chứ không phải bằng dữ liệu dựng riêng cho bài test.

Cô Bích Ngọc phụ trách hai nhóm là chỗ dữ liệu mẫu **tự kể được G0.4**. Trước
đây một cô một lớp nên nhìn dữ liệu mẫu không thấy mô hình mới ở đâu cả.
`test/nhom-lop.test.mjs` mục `[1]` canh đúng điều này: dữ liệu mẫu mà quay về một
cô một lớp là bài đó đỏ.

#### Dữ liệu mẫu KHÔNG chứa một điểm số nào — QUY TẮC 4

Đây là phần đáng kể nhất, vì dữ liệu mẫu là thứ người ta nhìn trước cả tài liệu.

| Chỗ cũ | Chỗ mới |
|---|---|
| Học bạ: 9–10 môn kèm điểm thang 10 | 5 **lĩnh vực phát triển**, cột `score` bỏ trống hẳn (cột này vốn tùy chọn), chỉ còn một câu mô tả |
| Nề nếp: `points` +20/+15/−5 rồi xếp hạng cả lớp | **Mọi bản ghi `points: 0`** → bảng xếp hạng phẳng lì, không bé nào đứng trên bé nào |
| Nhận xét: "hăng hái phát biểu xây dựng bài" | **Mô tả điều cô đã thấy** (QUY TẮC 1), ví dụ "con xếp khối thành cầu rồi cho ô tô chạy qua, làm lại bốn lần" |
| Lời cô cuối kỳ: "cần phát huy hơn ở môn Toán" | **Kèm việc làm được** (QUY TẮC 5): ở lớp cô làm gì tiếp, ở nhà gia đình chơi gì cùng con |
| Thời khóa biểu: Toán, Tiếng Việt, Tin học | **Lịch sinh hoạt một ngày**: đón bé, thể dục sáng, ăn, ngủ trưa, chơi góc, trả bé |
| Y tế: cao 128–140cm, nặng 26–34kg | Đúng lứa 4–6 tuổi: 102–115cm, 16–21kg |

Ô "Hạnh kiểm" của học bạ chỉ nhận 4 mức Tốt/Khá/Trung bình/Cần cố gắng — tức vẫn
là xếp loại trẻ. Màn hình đó là phần tiểu học sẽ gỡ ở **N3**; chừng nào chưa gỡ,
dữ liệu mẫu để **mọi bé cùng một mức** để không tiếp tay cho việc xếp loại.

#### Kèm theo: dạy máy chuyển năm học bậc mầm non

Không định làm, nhưng buộc phải làm thì câu chuyện mới không tự mâu thuẫn.

Máy chuyển năm của app 1 **tăng số cuối tên lớp** (`Lớp 3A` → `Lớp 4A`, khối 5 ra
trường). Số trong "Chồi 2" lại là **nhóm song song thứ mấy**, không phải khối —
nên quy tắc cũ cho ra *`Chồi 2` → `Chồi 3`* (một bậc không tồn tại) và *`Lá 1` →
`Lá 2`* trong khi thực tế bé rời trường vào lớp 1. Tức là màn hình Quản trị sẽ
đề xuất đúng chiều ngược lại.

Đã thêm quy tắc theo **bậc**: Nhà trẻ → Mầm → Chồi → Lá → vào lớp 1. Thêm **bên
cạnh**, không thay: tên không phải bậc mầm non vẫn đi theo quy tắc số cũ, nên
trường nào còn lớp đặt tên kiểu cũ vẫn chạy y như trước.

#### Một lỗi giao diện lộ ra nhờ việc này

Màn "Soạn báo cáo" ngắn lại (5 lĩnh vực thay cho 9 môn) làm bài kiểm thử trình
duyệt đang xanh chuyển sang đỏ mà **không ai đụng vào mã giao diện**. Đào ra thì
là lỗi có sẵn từ nền app 1: `.modal-overlay` căng theo khung bố cục nên đáy modal
tụt xuống dưới mép màn hình khi bàn phím bật lên — nút Lưu vẫn cuộn tới được
nhưng không chạm vào được, và modal ngắn thì cuộn hết cỡ cũng không cứu được.
Đã vá ở **commit riêng** trước G0.5 (`height: 100dvh`), kèm bài canh đáy modal.

### Đổi cách gọi tên: app nói tiếng của trường mầm non ✅ *(N9 · N10 · N11)*

Không nằm trong danh sách G0.x, nhưng phải làm trước khi trường nhìn thấy màn
hình lần đầu — ấn tượng đầu tiên của cô giáo là thứ không làm lại được.

**250+ chỗ trong 45 tệp.** Ba cặp từ mà `CLAUDE.md` quy định:

| Cũ | Mới | Số chỗ |
|---|---|---|
| học sinh | **bé** (hoặc *trẻ*) | ~150 |
| lớp / lớp học | **nhóm** / **nhóm lớp** | ~100 |
| giáo viên chủ nhiệm · GVCN · chủ nhiệm | **cô phụ trách** | ~40 |

Chạm cả ba tầng, vì cả ba đều hiện lên màn hình:

- `public/js/views/` — 24 tệp, chữ trên màn hình;
- `routes/` + `modules/` — **53 câu báo lỗi**. Câu báo lỗi cũng là giao diện:
  cô đọc "Học sinh không thuộc lớp của bạn" thì biết ngay app này không phải làm
  cho trường mình;
- `lib/modules.js` — tên và mô tả của 18 phân hệ trong Quản trị → Tính năng.

Ba quyết định đáng ghi lại:

- **Loại thông báo `'Lớp học'` → `'Nhóm lớp'` là một GIÁ TRỊ trong cơ sở dữ
  liệu**, không phải nhãn. Phải đổi đồng thời ở ba chỗ (danh sách hợp lệ của máy
  chủ, dữ liệu mẫu, bảng màu của giao diện) — lệch một chỗ là thông báo cũ mất
  màu, mất biểu tượng mà không báo lỗi gì.
- **Nhập tệp Excel: NHẬN VÀO thì rộng, XUẤT RA thì đúng.** Tệp có sẵn của nhà
  trường rất có thể còn ghi "Tên học sinh", "Lớp" theo mẫu cũ của Phòng. Từ chối
  một tệp thật vì cái tên cột là bắt trường gõ lại 300 dòng — nên danh sách tên
  cột chấp nhận được **giữ nguyên tên cũ và thêm tên mới**. Tệp CSV mẫu mà nhà
  trường tải về thì nói đúng tiếng mầm non.
- **Chú thích trong mã được phép nhắc mô hình cũ.** "một cô một lớp", "quan hệ
  chủ nhiệm" là lịch sử có thật của phần nền, người đọc mã cần biết. Bài canh vì
  vậy bỏ qua dòng chú thích và chỉ soi phần chữ đi ra màn hình.

**N11 — ô điều khiển đã chết thì phải giấu, không phải đổi chữ.** Màn Chuyển năm
học có ô "Khối cuối cấp"; từ G0.5 nhóm mầm non đi theo bậc và **bỏ qua hẳn ô
đó**. Máy chủ nay trả thêm cờ `theoBac` cho từng nhóm, màn hình giấu ô khi mọi
nhóm đều theo bậc, và câu hỏi lại nói đúng con số thật ("3 bé sẽ ra trường") thay
vì nhắc tới một "khối" mà mầm non không có.

**N10 — bài canh, để nó không trôi ngược.** `npm run test:goi-ten`, 10 bài. Quét
`public/`, `routes/`, `modules/`, `scripts/`, `lib/modules.js`, `data/seed.js`;
bỏ qua dòng chú thích; ngoại lệ phải **ghi rõ lý do** ngay trong tệp.

Quét cả `scripts/` vì người vận hành đọc chúng **đúng lúc đang chữa cháy** —
`npm run kiem-tra-may-chu` báo "8 học sinh" thì không sai về số liệu, nhưng nói
sai tiếng ở đúng lúc người ta căng thẳng nhất. `scripts/xuat-quy-trinh.js` là
ngoại lệ có ghi lý do: đó là **nội dung tài liệu triển khai của app 1** đã dán
cảnh báo "chưa cập nhật" (N1) — đổi chữ trong đó là làm nó *trông như* đã cập
nhật trong khi quy trình thì chưa. Mục `[2]` là phép thử
ngược: dựng một tệp bẩn rồi soi bằng chính hàm quét đó — **một bài canh luôn xanh
là một bài canh vô dụng**. Mục `[3]` chứng minh nó không bắt nhầm tên biến tiếng
Anh của tầng dữ liệu (`studentsOf`, `classIdsOf`), đúng như `CLAUDE.md` cho phép.

### Script chữa cháy phân công cô: thu hồi THẬT, không chỉ dọn cái gương ✅ *(N8)*

Ghi chú N8 lúc đầu của tôi **sai ở phần chẩn đoán**. Sự thật khó chịu hơn.

**Sai chỗ nào.** Tôi ghi "chạy script xong cô vẫn chưa nhận lại nhóm cho tới lần
khởi động lại". Không đúng: nạp `lib/db.js` là chạy `backfillClassTeachers()`,
mà script cũng nạp `lib/db.js` — nên nhóm được dựng lại **ngay lúc script khởi
động**, và máy chủ đang chạy nhìn thấy ngay (chung một tệp SQLite). Chiều
"cô mất nhóm" tự lành.

**Chỗ thật sự hỏng là chiều ngược lại — chiều nguy hiểm.** Bài test mới bắt được:

> Script gỡ `users.classId` của cô đang giữ thừa quyền, báo "đã sửa" — nhưng
> dòng trong `class_teachers` thì còn nguyên. Mà từ G0.4 **quyền đọc hồ sơ trẻ
> đi theo `class_teachers`**. Nên cô vẫn đọc được hồ sơ trẻ của nhóm không còn
> là của cô, đúng cái lỗ hổng mà script này sinh ra để đóng.

Tệ hơn: chính phần chuyển đổi lúc khởi động đã *dựng dòng đó lên* từ cái gương
lệch, ngay trước khi script kịp nhìn.

**Đã sửa:** `--sua` nay thu hồi ở **cả hai nơi**. Dám tự gỡ ở đây vì cặp
"`users.classId` trỏ vào nhóm mà cô không phải cô chính" là dấu vết của gương
lệch, không phải phân công có chủ ý — cô được xếp làm cô **phụ** có chủ ý thì
`users.classId` của cô không trỏ vào nhóm đó (xem `mirrorLegacyHomeroom`). Và
với quyền thì **gỡ nhầm còn sửa lại được, để sót thì không ai biết**.

Thêm hai điều:

- **Kiểu 4 — nhóm đang mở mà không còn cô nào: chỉ BÁO, không tự đoán.** Chọn cô
  nào cho nhóm nào là việc của nhà trường; máy đoán hộ là sai người mà không ai hay.
- **Nói thật về chế độ "chỉ xem".** Nó không hoàn toàn chỉ đọc và không thể làm
  cho nó chỉ đọc — nạp `lib/db.js` là đã ghi. Script nay chụp bảng quyền bằng một
  kết nối riêng **trước khi** nạp, để báo đúng cái vừa xảy ra thay vì nói một câu
  sai với người đang chữa cháy.

**16 bài test mới** ở `test/nhom-lop.test.mjs` mục `[9b]`. Script này ra đời từ
app 1 và **chưa từng có bài test nào** — đó chính là lý do nó trôi khỏi sự thật
mà không ai hay.

### Bài canh QUY TẮC 4: bánh cóc, không phải công tắc ✅ *(N6)*

`CLAUDE.md` xếp QUY TẮC 4 ngang hàng Nguyên tắc số 1 và nói thẳng nó phải được
**canh bằng máy, không bằng trí nhớ**. G0.5 đã dọn sạch dữ liệu mẫu, nhưng không
có gì giữ cho nó ở nguyên như thế qua lần sửa sau.

**Vấn đề:** app vẫn còn hai màn hình tiểu học chưa gỡ (N3) — Nề nếp xếp hạng trẻ
theo điểm thi đua, và Học bạ có ô nhập điểm thang 10. Viết một bài test bắt chúng
biến mất ngay thì hoặc phải gỡ tính năng khi chưa được duyệt, hoặc phải sống chung
với một bài test luôn đỏ. Cả hai đều sai.

**Cách làm:** ghi lại **chính xác món nợ đang có** rồi bắt con số ấy chỉ được
GIẢM.

| Tệp | Nợ | Là gì |
|---|---|---|
| `routes/conduct.js` | 7 dòng | máy chủ cộng điểm rồi sắp xếp trẻ |
| `public/js/views/conduct.js` | 5 dòng | bảng xếp hạng trên màn hình |
| `routes/reports.js` | 4 dòng | kiểm điểm 0–10 |
| `public/js/views/reports.js` | 1 dòng | ô nhập điểm từng môn |

Thêm một chỗ vi phạm **mới** ở bất cứ đâu → đỏ ngay. Gỡ xong N3 → hạ số về 0,
bài test tự siết chặt. Món nợ thành con số máy đếm được, không còn là một dòng
ghi chú người ta quên.

Ba điều đáng ghi lại:

- **Không phải mọi phần trăm đều vi phạm.** `public/js/views/surveys.js` in tỉ lệ
  phụ huynh chọn mỗi phương án — con số về người lớn, không phải về một đứa trẻ.
  Đó là ngoại lệ có ghi lý do. Bài canh cũng chỉ bắt dạng `${...}%` (phần trăm
  được TÍNH rồi in ra) chứ không bắt `width:100%` của bố cục — mục `[4]` chứng
  minh đúng điều đó.
- **Mục `[3]` canh riêng dữ liệu mẫu**, chặt hơn hẳn phần còn lại: không một
  `points` khác 0, không một `score` nào, và **mọi bé cùng một mức hạnh kiểm** —
  vì đó là thứ người ta nhìn thấy đầu tiên khi mở app.
- **Mục `[4]` là phép thử ngược**, giống `test:goi-ten`: dựng tệp bẩn rồi soi bằng
  chính hàm quét đó.

### Đợt soát sau G0.5: sáu chỗ hỏng thật, tìm bằng cách đi lại đường của người dùng ✅

Sau G0.5, thay vì làm tiếp tính năng, tôi cho **năm góc nhìn độc lập** soát lại
app: giao diện trên trình duyệt thật, vòng sao lưu–khôi phục, đường cài đặt máy
chủ, phân quyền tấn công bằng HTTP thật, và chất lượng tiếng Việt. Mỗi phát hiện
đi qua một lượt **thẩm ngược** — người thẩm được yêu cầu mặc định bác bỏ.

Tin tốt trước: **tầng phân quyền của G0.4 đứng vững**. Tấn công bằng HTTP thật
qua 14 phân hệ — cô nhóm này gọi thẳng API của nhóm kia, phụ huynh gọi API của
bé không phải con mình, cô gọi API quản trị — **tất cả đều 403**. Không màn hình
nào của bốn vai ném lỗi JavaScript.

Sáu chỗ hỏng thật, sửa hết trong đợt này:

| Chỗ hỏng | Vì sao nguy hiểm | Đã làm gì |
|---|---|---|
| `undefined/school.db` 520 KB — hồ sơ 8 bé — **nằm trong kho mã nhiều ngày** | `.gitignore` có dòng `*.db` nên git không bao giờ nhắc tới nó: `git status` sạch, `npm test` xanh, mắt người soát cũng không thấy. Nhưng `docker build` **không đọc** `.gitignore` | Xóa tệp; vá bài kiểm thử đã đẻ ra nó (`DATA_DIR` thành chuỗi `"undefined"`); viết lại `.dockerignore`; thêm `--quet-kho` soi tệp dữ liệu nằm sai chỗ |
| `scripts/restore.js` **không kiểm tra máy chủ có đang chạy không** | `rename` không rời tay máy chủ khỏi tệp cũ; `-wal` bị xóa dưới chân một kết nối đang mở. Không báo lỗi, màn hình vẫn chạy — **hỏng chỉ lộ ra sau lần khởi động lại kế tiếp** | Hỏi SQLite bằng khóa độc quyền trước khi động vào tệp; viết `test/sao-luu.test.mjs` (39 bài) đi trọn vòng sao lưu → hỏng → khôi phục |
| Bản "giữ lại phòng khi khôi phục nhầm" **mất phần ghi cuối** | Phần vừa ghi nằm trong `-wal`; bản cũ đổi tên tệp chính rồi xóa `-wal`. Máy chủ tắt đột ngột vừa là lý do hay gặp nhất khiến phải khôi phục, vừa là lúc `-wal` chứa nhiều nhất | Gộp nhật ký ghi vào tệp chính trước khi đổi tên, kèm phép thử ngược tự chứng minh tình huống là thật |
| Cô dạy **hai nhóm** không mở được Kế hoạch / Thời khóa biểu của nhóm thứ hai | Máy chủ cho phép, nhưng màn hình lấy cứng `nhomCuaCo[0]`. Quyền có mà lối vào thì không — và bài kiểm thử API **không bao giờ thấy** loại lỗi này | Ô chọn nhóm cho cả hai màn, chỉ hiện khi cô có hơn một nhóm; `test/nhieu-nhom-giao-dien.test.mjs` đi bằng chuột trên trình duyệt thật |
| `'chưa chưa phụ trách nhóm nào'` trên màn Quản trị | Do chính đợt N9–N11 tìm-thay hàng loạt. Câu vẫn đúng ngữ pháp, chỉ thừa một từ — mắt người rất dễ lướt qua | Sửa, và thêm mục canh **chữ lặp đôi** vào `test:goi-ten` |
| Tuổi bé tính bằng **hiệu hai con số năm** | Bé sinh tháng 12 bị ghi già hơn tuổi thật gần trọn một năm. Ở lứa tuổi này, sáu tháng là khoảng cách thật sự, và cô nhìn con số đó để chờ đợi ở bé | Tính theo ngày sinh, hiện kèm tháng ("4 tuổi 8 tháng"); bé chưa tròn một tuổi thì đếm bằng tháng |

Ba chỗ nữa thuộc loại **nói sai sự thật với người vận hành**, đã sửa cùng đợt:

- `kiem-tra-may-chu.js` in "các mục trên **không làm app ngừng chạy**" — sai từ
  khi có chốt chặn N5. Máy đang chạy thì vẫn chạy vì nó qua cửa đó từ lần khởi
  động trước; **lần bật lại tới mới là lúc vỡ**, mà lần bật lại tới thường rơi
  đúng vào lúc cập nhật app hoặc lúc máy vừa mất điện. Nay mục nào chặn khởi
  động thì in một khối ⛔ riêng, nêu đích danh.
- `server.js` mách `mv <DATA_DIR>/* <đích>/`. Khi `DATA_DIR` là `data/` trong
  kho mã — đúng trường hợp lời nhắc này tồn tại để chữa — nó **cuốn luôn
  `data/seed.js`**. Người vận hành làm theo lời nhắc và tự tay làm hỏng kho mã.
- Hai script bảo "Vào **Quản trị → Lớp**". **Không có tab nào tên Lớp** —
  danh sách nhóm nằm ở tab Tổng quan. Người ta đọc câu đó đúng lúc đang chữa
  cháy một nhóm chưa có cô phụ trách.

Và một đợt quét chữ nữa: N9–N11 chỉ soát bốn từ trong danh sách cấm, nên **59
chỗ** vẫn gọi bé là *"em"*, vẫn viết tắt *"HS"* / *"PH"*, và **17 câu báo lỗi
của máy chủ vẫn nói "lớp" trong khi nhãn nói "nhóm"** — cô đọc câu báo lỗi mà
không chắc nó đang nói về cái mình vừa bấm. `test:goi-ten` nay canh cả bốn nhóm
từ ấy bằng ranh giới từ **tiếng Việt** (`\b` của JavaScript chỉ biết chữ ASCII
nên "em" trong "thêm", "xem", "điểm" sẽ lọt), và chừa đúng những chỗ tiếng Việt
vốn đúng: *"ở lớp"*, *"vào lớp 1"*, *"nhóm lớp"*, và lời thoại phụ huynh tự
xưng "em" với cô.

> **Bài học đáng giữ lại của đợt này:** cả sáu chỗ đều **xanh trong `npm test`**
> ngay trước khi bị tìm ra. Chúng nằm ở chỗ bài kiểm thử không nhìn tới — tệp bị
> `.gitignore` giấu, một script chỉ chạy lúc chữa cháy, một màn hình thiếu nút
> bấm. Đi lại đúng đường của người dùng vẫn tìm ra thứ mà 1.200 bài không thấy.

---

### Đợt soát, phần hai: những chỗ màn hình không nói ra thứ nó đang hiện ✅

Đợt soát năm góc nhìn nêu ra 60 phát hiện, mỗi phát hiện qua một lượt thẩm
ngược. Phần đầu (bên trên) là những chỗ hỏng thẳng. Phần này là một loại khác,
khó thấy hơn: **màn hình chạy đúng, không lỗi, không rò dữ liệu — nhưng không
nói ra thứ nó đang hiện.**

| Chỗ hỏng | Điều gì thật sự sai | Đã làm gì |
|---|---|---|
| Vai **quản trị** rơi vào nhánh phụ huynh ở 11 màn | Trang chủ ghi cô hiệu trưởng là "Phụ huynh". Các màn một-bé hiện hồ sơ / nhận xét / nề nếp của **bé đầu bảng chữ cái**, có màn không ghi tên bé nào, và không có đường nào đổi sang bé khác. Đây không phải chuyện quyền — `db.canAccessStudent` cho quản trị đúng theo bảng ba lớp dữ liệu. Đây là chuyện **quản trị đang đọc hồ sơ một đứa trẻ mà không biết là đứa nào** | Thêm `UI.thanhChonBe()` (tệp dùng chung, commit riêng) và `vaiTro()` ở trang chủ. Bài canh: đổi bé thì hồ sơ phải đổi theo, và phụ huynh/cô **không** được thấy ô chọn đó — nó liệt kê tên mọi bé của trường |
| Phụ huynh gõ nhầm `#/accounts` | Nhận màn "Có lỗi xảy ra 😥 / Không có quyền thực hiện" — câu của máy chủ nói với máy | Kiểm vai ngay đầu màn, nói "Mục này dành cho cô và nhà trường" |
| Cô phụ trách hai nhóm thấy "Các bé nhóm **Chồi 2, Lá 1**" | Đọc lướt thành TÊN MỘT NHÓM, vì "Chồi 2, Lá 1" trông y như một cái tên dài | `UI.noiTenNhom()` (tệp dùng chung, commit riêng) nối bằng "và" |
| Câu báo lỗi nói với cô lệch **ba kiểu** xưng hô | Cùng một việc, máy chủ có ba câu: "nhóm của cô", "nhóm cô phụ trách", "nhóm lớp của bạn". Nặng nhất là một câu vừa gọi người kia là *cô* vừa gọi người đọc là *bạn* | Chốt một cách duy nhất, bỏ hẳn "bạn" ở mọi câu nói với cô |
| Ô nhập chiều cao / cân nặng gợi ý **"130 cm", "28 kg"** | Số của trẻ lớp 4, trên form dành cho bé 12 tháng – 6 tuổi — trong khi chú thích của chính `data/seed.js` đã viết "số liệu sai lứa tuổi là thứ cô và y tế trường nhận ra ngay, và nhận ra là mất tin vào cả bộ dữ liệu" | Đổi thành 105 cm / 17 kg, và "VD: Cân đo định kỳ đầu năm" |
| Người áp tải xe cũng được gọi là **"Cô phụ trách"** | Một chữ mang hai nghĩa trong cùng một app: ở màn Xe buýt là cô đi cùng xe, ở màn Hồ sơ là cô đứng nhóm của bé. Phụ huynh gọi nhầm số khi con có chuyện ở lớp | "Cô đi cùng xe" |
| "Y tế **học đường**", "Thực đơn **bán trú**", "**Sĩ số**" | Chữ của trường phổ thông | "Sức khỏe của bé", "Thực đơn của bé", "Số bé" |
| Tên phân hệ ≠ tên trang của cùng tính năng | Phân hệ "Hồ sơ bé" mở ra trang "Hồ sơ của bé"; phân hệ "Y tế" mở ra "Y tế học đường" | Chốt một tên cho mỗi tính năng |
| `/healthz` trả `uptime` và số phiên cho **mọi lượt quét cổng** | Đường này buộc phải mở — `render.yaml` và `Dockerfile` dùng nó để theo dõi. Nhưng bộ theo dõi chỉ đọc mã 200, không đọc phần thân. Người ngoài dò được máy chủ vừa bật lại lúc nào, và số phiên nhích theo từng lần cô hay phụ huynh đăng nhập | Người lạ chỉ nhận `{ok:true}`; chi tiết vận hành chỉ cho quản trị đã đăng nhập. Bài canh cũ **khẳng định điều sai** là công khai `uptime` — sửa nó là SIẾT lại, không phải nới ra |
| Chuyển năm xong, phụ huynh **mất album nhóm cũ của con** | Khoảng lịch sử dựng lại cho hồ sơ cũ lấy mốc `createdAt` — ngày NHẬP HỒ SƠ vào app, không phải ngày bé vào nhóm. Trường nhập cả trường trong một buổi chiều thì mọi hồ sơ mang ngày hôm đó, muộn hơn mọi tấm ảnh đã chụp. Đang học thì phụ huynh xem được mọi album của nhóm; nhóm vừa đóng thì **ảnh cũ nhất biến mất** — đúng thứ người ta muốn giữ | Mốc lấy sớm hơn trong hai: ngày nhập hồ sơ và **đầu năm học của nhóm**. Luật NGÀY giữ nguyên: ảnh chụp sau khi con rời nhóm vẫn bị chặn. **Người dùng duyệt hướng này trước khi làm** — xem khung bên dưới |
| `restore:check` báo **"đạt"** cho bản sao lưu mất sạch phân công cô | Tệp không hỏng, qua `integrity_check` bình thường — chỉ thiếu một bảng. Khôi phục xong: phụ huynh vẫn thấy con, còn **mọi cô** thấy "Nhóm chưa có bé nào". Phía đông người hơn trông vẫn đúng nên không ai báo động; người vận hành chỉ biết vào sáng hôm sau | Đếm cả `class_teachers`, và cảnh báo thẳng trước khi người ta bấm khôi phục, kèm lệnh dựng lại phân công |

> ### Một quyết định phải hỏi, không được tự làm
>
> Bản vá album nhóm cũ làm **ĐỎ hai check** trong `test/lo-hong-da-va.test.mjs`
> — bộ **bất khả xâm phạm** — vốn khẳng định phụ huynh KHÔNG mở được album nhóm
> cũ. Hai check đó mâu thuẫn với chính mục cuối cùng của tệp ("PHỤ HUYNH XEM
> LẠI ĐƯỢC ALBUM LỚP CŨ") và với `CLAUDE.md`; **cả hai chỉ cùng xanh được nhờ
> đúng con bug này**.
>
> `CLAUDE.md` cấm nới một bài canh phân quyền để cho code chạy qua. Nên việc
> làm dở được **dừng lại và hỏi người dùng**, dù hướng vá đã rõ. Người dùng
> chọn: vá, lấy mốc đầu năm học.
>
> Hai check cũ được thay bằng **ba** check chặt hơn — chúng canh cả hai phía
> của đường ranh ngày, thay vì một câu "cấm hết":
>
> - phụ huynh mở lại được album **trong khoảng** con còn học → 200;
> - **không** mở được ảnh chụp sau khi nhóm đã đóng → 403;
> - hỏi kèm nhóm cũ thì thấy đúng album trong khoảng, và **chỉ** trong khoảng.
>
> Cộng thêm một check đánh trúng chỗ con bug: ảnh chụp **trước ngày nhập hồ sơ**
> cũng phải xem lại được. Bài cũ không bắt được nó vì nó lấy chính `khoang.tu`
> làm ngày album — nên đúng dù `tu` bằng gì.

> ### Quyết định của nhà trường, 27/08/2026 — TẮT hai phân hệ xếp hạng trẻ
>
> Nề nếp và Báo cáo kế thừa nguyên vẹn từ app 1 và cả hai xếp trẻ trên dưới
> nhau. **Đây là trẻ 12 tháng – 6 tuổi.** Một phụ huynh mở app ra thấy con mình 4 tuổi
> được xếp huy chương đồng là loại mất lòng tin không sửa được bằng bản cập
> nhật sau.
>
> Nhà trường chọn **[A] tắt**, không phải [B] xóa mã ngay, cũng không phải
> [C] xóa dữ liệu. Ba lời hứa của bước "tắt" **đều được canh bằng máy** ở
> `test/tinh-nang.test.mjs` mục `[10]`, không canh bằng trí nhớ:
>
> 1. **tắt thật** — ô biến khỏi trang chủ VÀ API bị chặn. Giấu ô mà vẫn gọi
>    được API thì chưa gọi là tắt;
> 2. **dữ liệu giữ nguyên** — bật lại là bản ghi cũ còn nguyên từng dòng;
> 3. **bật lại được bất cứ lúc nào**, và quản trị vẫn thấy chúng trong
>    Quản trị → Tính năng — tắt mà biến mất khỏi cả trang quản trị thì không
>    còn đường quay lại.
>
> Thiếu bất kỳ vế nào thì "tắt" đã lặng lẽ biến thành "xóa".
>
> **Sáu bộ kiểm thử phải bật tường minh hai phân hệ này** (`batPhanHe` mới
> trong `test/_chung.mjs`): chúng canh những lỗ hổng ĐÃ VÁ bên trong, và lỗ
> hổng không biến mất chỉ vì phân hệ đang tắt — nhà trường bật lại là nó quay
> về. Riêng `test:co-lap-loi` đổi phép thử từ Nề nếp sang Nhận xét: một phân hệ
> đang tắt trả 404 vì **đang tắt**, không phải vì **hỏng**, và một phép thử
> không phân biệt được hai chuyện đó thì không nói lên điều gì.

> **Điểm chung của cả tám dòng:** không dòng nào làm app hỏng, không dòng nào
> rò dữ liệu, và không dòng nào bài kiểm thử bắt được — vì bài kiểm thử hỏi
> "máy chủ trả về đúng không", còn đây là "người ngồi trước màn hình có hiểu
> đúng không". Chỉ đăng nhập bằng từng vai rồi đọc từng màn mới thấy.

---

### G0.6 — Con số kiểm thử hiện tại

> **Đo ngày 28/08/2026.** Con số này rơi rớt rất nhanh — mỗi đợt thêm bài là
> lệch. Đếm lại bằng chính hai lệnh dưới, đừng tin bảng nếu commit gần nhất
> có đụng vào `test/`:
>
> ```bash
> npm test              | grep -E "PASS: " | awk '{s+=$3} END {print s}'
> npm run test:giao-dien | grep -E "PASS: " | awk '{s+=$3} END {print s}'
> ```

| Bộ | Số bài |
|---|---|
| `npm test` (không cần trình duyệt, ~12 phút) | **2533**, FAIL 0 |
| `npm run test:giao-dien` (cần Playwright, chạy trên Chromium thật) | **346**, FAIL 0 |

Bốn bộ lớn nhất, và việc chúng canh:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:lo-hong` | 291 | Mọi lỗ hổng đã vá — **bất khả xâm phạm** |
| `test:khe-uoc` | 164 | Hình dạng của các tệp dùng chung, và **không ai được chép lại** hàm nén ảnh |
| `test:co-lap-loi` | 102 | Nguyên tắc số 1 — phá hỏng từng thứ rồi kiểm app vẫn đăng nhập được |
| `test:nhom-lop` | 93 | Nhiều cô một nhóm (G0.4 · G0.5 · N8) |

Các bộ **mới của app 2**, không có ở app 1:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:nhom-lop` | 93 | Mô hình nhiều cô một nhóm, và script chữa cháy phân công |
| `test:thuchup` | 69 | Phép thử ghi nhanh + ranh giới nháp của cô (lớp dữ liệu 1) |
| `test:sao-luu` | 68 | Vòng sao lưu → hỏng → khôi phục, chạy thật trên dữ liệu tạm — kể cả **byte của một tấm ảnh** |
| `test:goi-ten` | 56 | App nói tiếng của trường mầm non, tên app, và cách nói tuổi bé |
| `test:co-so` | 39 | Cách ly dữ liệu giữa ba cơ sở (Cấp 1 ↔ Cấp 3) |
| `test:quy-tac-2` | 34 | QUY TẮC 2 — "chưa quan sát thấy" không bao giờ là một thất bại |
| `test:du-lieu-mau-phan-he` | 40 | Bật phân hệ lên là có cái để xem — câu chuyện bé An chạy suốt tám phân hệ |
| `test:quy-tac-4` | 26 | QUY TẮC 4, kiểu **bánh cóc**: món nợ N3 chỉ được giảm; ngoại lệ chừa **đúng dòng**, không chừa cả tệp |
| `test:chuc-vu` | 113 | Tầng chức vụ: chiều cấm VÀ chiều cho phép, trên bốn phân hệ nhạy cảm nhất |
| `test:album-api` | 33 | Chống tệp giả danh ảnh, phân quyền xem ảnh — **không cần trình duyệt** |
| `test:bai-canh-that` | 12 | Bài canh phải canh thật: không tệp test nào bị bỏ quên, không phép kiểm nào tự cho mình qua |
| `test:sw-version-kiemthu` | 28 | Đổi `public/` mà quên tăng `VERSION` là điện thoại đã cài kẹt bản cũ |
| `test:sw-version-kiemthu` | 28 | Đổi `public/` mà quên tăng `VERSION` là điện thoại đã cài kẹt bản cũ |
| `test:quyen-du-lieu-be` | 14 | **Mọi** đường API đọc dữ liệu của bé phải đi qua một hàm canh quyền |
| `test:khong-hua-suong` | 11 | App không được hứa thứ nó không làm được (bài học A5) |

Bảy tệp của `test:giao-dien`, và tệp nào là **mới của app 2** (so với điểm tách
`bc9dfa3` ngày 21/08):

| Bộ | Bài | Mới? | Canh gì |
|---|---|---|---|
| `test:bien-soan-gd` | 112 | kế thừa | Cô soạn thật trên Chromium: điểm danh, thực đơn, đơn nghỉ, hồ sơ bé |
| `test:man-phan-he` | 97 | **mới** | Tám màn phân hệ mầm non dựng lên được, không màn nào trắng; và **nháp Nhật ký ngày sống qua một lần app bị đóng** |
| `test:album` | 12 | kế thừa | Cô chọn ảnh và đăng album trên Chromium thật; đường nén ảnh dùng chung đi qua đây |
| `test:pwa` | 45 | kế thừa | Cài được lên màn hình chính, service worker, icon, và **mọi tệp cần để mở app lúc mất mạng đều nằm sẵn trong cache** |
| `test:nhieu-nhom` | 38 | **mới** | Cô dạy hai nhóm mở được cả hai; quản trị biết mình đang xem bé nào |
| `tinh-nang-giao-dien` | 27 | kế thừa | Bật/tắt phân hệ trên màn Quản trị |
| `test:ngoai-tuyen` | 15 | **mới** | Mất mạng: app vẫn mở, vẫn ghi được, sóng về thì hàng đợi tự bay đi |

Nền lấy từ app 1 là **932 bài**. Phần tăng thêm không chỉ nằm ở các bộ mới: các
bộ cũ cũng dày lên khi mô hình đổi (ví dụ `test:lo-hong` nhận thêm mục `[8b]` canh
việc máy chủ dừng khi dữ liệu nằm trong kho mã). Con số tổng sẽ **giảm** khi gỡ
các phân hệ riêng của tiểu học (N3) và **tăng** khi thêm phần mầm non.

Các bộ canh dưới đây đều có một mục **"phép thử ngược"** — dựng dữ liệu bẩn hoặc
mã bẩn rồi soi bằng chính hàm quét đó: `test:du-lieu`, `test:goi-ten`,
`test:quy-tac-4`, `test:sao-luu`, `test:khong-hua-suong`, và mục nén ảnh của
`test:khe-uoc`. Một bài canh luôn xanh là một bài canh vô dụng.

Riêng `test:goi-ten` còn canh cả **ngoại lệ của chính nó**: dựng một tệp có cả
dòng được chừa lẫn dòng phải bắt, rồi kiểm rằng ngoại lệ chỉ chừa đúng một dòng.
Một ngoại lệ viết rộng quá sẽ lặng lẽ mở cửa cho cả tệp.

---

## Việc đã biết trước, chưa làm — không được quên

Ghi ở đây thay vì để trong đầu, vì phiên làm việc sau sẽ không nhớ.

| # | Việc | Vì sao quan trọng | Làm ở |
|---|---|---|---|
| N1 | Bộ tài liệu triển khai vẫn mô tả **máy chủ của app 1** | **🟡 đã có `docs/TRIEN-KHAI.md` của riêng app 2** (Đ14) — viết đủ phần KHÔNG phụ thuộc vào chọn máy chủ nào: thư mục dữ liệu ra ngoài kho mã, tạo tài khoản quản trị trước khi bật dịch vụ, sao lưu phải chạy được và phải thử khôi phục trước khi có dữ liệu thật, quy trình cập nhật, và một bảng ghi rõ **còn thiếu gì và vì sao**. Hai tệp cũ giữ nguyên vì chúng vẫn đúng cho app 1. **⏳ đã dán cảnh báo, chưa viết lại.** Cả 5 tệp (2 markdown, 1 html, 1 Word, + `docs/SAO-LUU.md`) nay mở đầu bằng một khối nói rõ phần nào còn dùng được, phần nào KHÔNG. **Viết lại thì phải chờ nhà trường chốt VPS và tên miền (N7)** — không có hai thứ đó thì viết ra cũng chỉ là đoán | Sau N7 |
| ~~N2~~ | ~~`android/`, `capacitor.config.json` là vỏ đóng gói của app 1~~ | **✅ xong** — gỡ 7,9 MB / 77 tệp, cùng `scripts/prepare-mobile.js` và 4 gói `@capacitor/*`. **Giữ `render.yaml`**: nó đang mang lời cảnh báo về vòng kẹt triển khai lần đầu (N13). Bài canh cũ *"bản Android khớp đúng bản web"* tự bỏ qua khi thiếu thư mục — tức luôn xanh đúng lúc hết việc — nay đổi thành **"KHÔNG được có bản thứ hai"** | 27/08/2026 |
| N3 | Hai phân hệ **xếp hạng trẻ**: Nề nếp và Báo cáo | **🟡 bước 1/2 xong** — nhà trường quyết **TẮT SẴN** cả hai (27/08). Màn hình biến mất, API trả 404, **dữ liệu giữ nguyên**, bật lại bằng một lượt bấm. Bước 2 (xóa hẳn mã, vẫn giữ bảng dữ liệu) để sau, khi đã sống vài hôm mà không ai nhớ tới chúng — chỉ khi đó món nợ 17 của `test:quy-tac-4` mới về 0, vì bài canh đó soi **mã nguồn** chứ không soi trạng thái bật/tắt. **Hai phân hệ cùng nhóm được GIỮ LẠI, khác với ghi chép ban đầu:** *"Năm học trước"* phục vụ đúng nhu cầu mầm non (phụ huynh xem lại album, thông báo của nhóm con từng học), *"Hồ sơ con đã ra trường"* đúng ý tưởng, chỉ cần đổi từ vựng | GĐ 1 |
| ~~N4~~ | ~~Chưa có tầng **cơ sở** và vai **quản lý cơ sở**~~ | **✅ xong 27/08** — đi đủ **ba bước ba commit** như G0.4. Cấp 1 (toàn hệ thống) và Cấp 3 (một cơ sở) phân biệt bằng bảng `user_campus`, **không đụng cột `role`** — nhờ vậy mọi tài khoản quản trị đang có giữ nguyên quyền. Cô và phụ huynh không bị đụng tới: quyền của cô đi theo nhóm lớp, của phụ huynh đi theo con, cả hai đã chặt hơn cơ sở. `test:co-so` 36 bài. **Cấp 2 (HR / Marketing / Kế toán) chưa làm** — xem mục yêu cầu mới bên dưới | 27/08/2026 |
| N5 | `DATA_DIR` mặc định là `./data` nằm trong kho mã | **✅ đã canh bằng máy** — chạy `NODE_ENV=production` với dữ liệu trong kho mã thì máy chủ **DỪNG trước khi mở cổng**, không chỉ nhắc vào log. Mặc định vẫn là `./data` cho lúc chạy thử | 26/08/2026 |
| N6 | Bài test canh QUY TẮC 4 | **✅ có rồi** — `test/quy-tac-4.test.mjs`, kiểu **bánh cóc**: món nợ N3 chỉ được giảm. Gỡ xong N3 thì hạ số trong `NO_DA_BIET` về 0 và bài test tự siết chặt | 26/08/2026 |
| N7 | Chưa đăng ký VPS Việt Nam + tên miền đứng tên trường | Việc của nhà trường; chặn phần triển khai | Nhà trường làm |
| ~~N8~~ | ~~`sua-quyen-chu-nhiem.js` chỉ dọn được cái gương~~ | **✅ xong** — và hoá ra nguy hiểm hơn tôi ghi lúc đầu, xem mục bên dưới | 26/08/2026 |
| ~~N9~~ | ~~Giao diện nói tiếng tiểu học~~ | **✅ xong** — xem mục "Đổi cách gọi tên" bên dưới | 26/08/2026 |
| ~~N10~~ | ~~Chưa có bài test canh cách gọi tên~~ | **✅ xong** — `test/goi-ten.test.mjs`, 10 bài | 26/08/2026 |
| ~~N11~~ | ~~Ô "Khối cuối cấp" là ô điều khiển chết~~ | **✅ xong** — máy chủ trả thêm cờ `theoBac`, màn hình giấu hẳn ô đó khi mọi nhóm đi theo bậc | 26/08/2026 |
| N13 | **Lần triển khai đầu tiên lên Render là một vòng kẹt** | Ổ đĩa mới là ổ trống; `NODE_ENV=production` + CSDL trống → máy chủ dừng có chủ ý (đúng). Nhưng Shell của Render chỉ mở được khi dịch vụ đang chạy → không tạo được tài khoản quản trị → dịch vụ không bao giờ chạy. **Đã viết thẳng vòng kẹt và hai đường ra vào `render.yaml`**, chưa vá bằng mã: cách vá (nhận tài khoản quản trị đầu tiên qua biến môi trường) là quyết định về triển khai, mà nơi triển khai còn chờ N7 | Sau N7 |
| N14 | `docs/` vẫn ghi `/var/lib/schoolconnect`, `scripts/` nay ghi `/var/lib/casa-mamnon` | Người vận hành làm theo lời nhắc của máy chủ rồi chạy script theo lời nhắc của tài liệu — script mở một CSDL TRỐNG và báo "mọi thứ đều sạch". Trấn an sai còn tệ hơn báo lỗi. `scripts/` đã thống nhất và có bài canh; `docs/` để nguyên vì đang mang cảnh báo "chưa cập nhật cho app 2" (N1) — sửa đường dẫn trong đó là làm nó TRÔNG như đã cập nhật | Cùng N1 |
| ~~N15~~ | ~~**Toàn bộ `/api/admin/*` chưa đi qua tầng cơ sở** — phát hiện khi làm A6~~ | **✅ xong 27/08** — vá 19 đường trong `routes/admin.js` cộng 4 tệp khác. **Lỗ nặng nhất KHÔNG nằm trong admin.js**: `POST /api/accounts/:id/reset-password` trả thẳng mật khẩu tạm về cho người bấm, nên quản trị Cấp 3 chỉ cần **ba lời gọi** để thành Cấp 1 — đã dựng lại được và thành công. Lỗ nặng thứ hai là `routes/albums.js`: Cấp 3 liệt kê, mở và **XOÁ** được album (ảnh khuôn mặt trẻ) của nhóm **đã đóng** thuộc cơ sở khác, mà sau mỗi lần chuyển năm học thì mọi nhóm năm cũ của cả ba cơ sở đều đã đóng. Nay việc ảnh hưởng toàn hệ thống (thêm/đóng cơ sở, gán cơ sở cho tài khoản, chuyển nhóm sang cơ sở khác, chuyển năm học, bật/tắt phân hệ, thực đơn) **chỉ Cấp 1** làm được. `test:co-so-quan-tri` 55 bài, trong đó **mục [7] đọc thẳng mã nguồn** bắt mọi đường mới phải canh, và **mục [10] quét 22 đường** tìm dấu vết cơ sở khác | 27/08/2026 |
| **N18** | **Quy định "ảnh nhóm" trong CLAUDE.md chưa thực thi được** | **✅ xong 28/08** — CLAUDE.md dòng 232 bắt buộc *"một ảnh chỉ hiện cho gia đình khác khi mọi bé trong ảnh đều có đồng ý chia sẻ, lọc ở tầng dữ liệu"*, nhưng trong mã không có trường đồng ý, không có cách biết trong ảnh có ai, không bài canh nào — nên **mọi ảnh của một nhóm hiện cho mọi phụ huynh nhóm đó**. Nay có `student_consent` (ba mục đích, **ba giá trị**: đồng ý / từ chối / chưa trả lời) và `photo_students` (**gắn tay**, không bao giờ nhận diện khuôn mặt trẻ). Lọc ở cả ba đường ảnh đi ra, trong đó **đường trả byte mới là chốt thật** — hai đường kia chỉ giấu khỏi danh sách. `test:anh-nhom` 38 bài | 28/08/2026 |
| **GĐ1‑a** | **Nhật ký ngày** — ăn / ngủ / vệ sinh / thay bỉm / bú bình | **✅ xong 28/08** — phân hệ cắm thêm `modules/nhatky/`, **mặc định TẮT**, nhà trường tự bật ở Quản trị → Tính năng. Đây là trang sổ giấy gia đình đọc mỗi chiều, tức là thứ quyết định app có thay được sổ liên lạc hay không. **Ghi cả nhóm một lượt** (cô có 20 bé và 10 phút cuối giờ); **ô trống = "cô chưa ghi", khác 0**; **ô thay bỉm/bú bình chỉ hiện cho bé dưới 36 tháng**, quyết định theo NGÀY SINH chứ không theo tên nhóm. `test:nhat-ky` 71 bài | 28/08/2026 |
| **N19** | **Bộ canh QUY TẮC 4 không nhìn tới phân hệ mới nào** | **✅ xong 28/08** — `VUNG_QUET` liệt kê tay `modules/hocphi`, `modules/thuchup`, và hàm tìm tệp **không đệ quy** vào thư mục con. Nghĩa là mọi phân hệ thêm sau đó lọt hết mà bộ canh vẫn xanh — phát hiện khi thêm Nhật ký ngày. Nay quét cả thư mục `modules` và đi vào thư mục con; bài `test:nhat-ky` canh để không ai đổi ngược lại thành danh sách viết tay | 28/08/2026 |
| ~~N20~~ | ~~Dữ liệu mẫu **chưa có nhóm nhà trẻ**~~ | **✅ xong 28/08** — thêm nhóm **Nhà trẻ 1** (cơ sở 1) với ba bé **14 / 34 / 38 tháng**, một cô và ba phụ huynh. Ngày sinh tính **lùi từ hôm nay** nên bé luôn đúng số tháng dù chạy dữ liệu mẫu vào lúc nào. Bé 38 tháng nằm trong nhóm tên "Nhà trẻ" là **cố ý**: bé qua mốc giữa năm và trường không chuyển nhóm giữa chừng — nhờ đó chứng minh được app quyết định theo **ngày sinh** chứ không theo tên nhóm. Dữ liệu mẫu nay **11 bé / 4 nhóm** | 28/08/2026 |
| **N21** | **Bé 14 tháng hiện là "1 tuổi"** — sai đúng ví dụ mở đầu của CLAUDE.md | **✅ xong 28/08** — hàm tính tuổi chỉ đếm tháng cho bé **dưới 12 tháng**, nên bé 14 tháng ra đúng *"1 tuổi"*, thứ CLAUDE.md dòng đầu nói không được. Không ai thấy suốt một thời gian dài **vì dữ liệu mẫu không có bé nào dưới 4 tuổi** — lỗi chỉ lộ ra khi làm N20. Nay **dưới 36 tháng nói bằng tháng**, trùng mốc tách nhà trẻ / mẫu giáo nên cả app chỉ một mốc. Hai bản của hàm (máy chủ cho tệp Excel, trình duyệt cho màn hồ sơ) có bài canh không cho trôi khỏi nhau | 28/08/2026 |
| **N22** | 17 chỗ ghi cứng số đếm của dữ liệu mẫu | **✅ xong 28/08** — thêm một bé vào dữ liệu mẫu làm **17 bài đỏ ở 7 bộ**, không bài nào sai về ý. Nay hình dáng dữ liệu mẫu khai ở **đúng một chỗ** (`MAU` trong `test/_chung.mjs`), và `test:quan-tri` đối chiếu hằng số đó với dữ liệu mẫu thật — lệch thì đúng **một** bài đỏ kèm cả hai bên để so | 28/08/2026 |
| **Y1** | **Nhật ký ngày chưa nối với thực đơn; giờ ngủ là hai ô gõ tay** | **✅ xong 28/08** — nhà trường yêu cầu thẳng: *"link luôn với thực đơn từng ngày, tránh phải gõ tay lại"*. Nay `GET /api/nhatky` gửi kèm **thực đơn của đúng ngày đó** (đọc bảng `menus`, chỉ ĐỌC — thực đơn là của cả trường, do văn phòng soạn), hiện ở **cả màn của cô lẫn màn của gia đình**. Nhờ vậy cô không chép tên món vào ô ghi chú của từng bé, và hai màn hình của cùng một trường không còn nói hai chuyện khác nhau về cùng một bữa ăn. **Tắt phân hệ Thực đơn thì thực đơn biến khỏi đây luôn** — nhật ký đọc thẳng bảng `menus` nên nếu không hỏi công tắc, trường tắt Thực đơn xong vẫn thấy thực đơn cũ hiện ra, dữ liệu không còn ai cập nhật mà màn hình vẫn nói như thật. Giờ ngủ trưa đổi từ hai ô gõ tự do sang **ô chọn theo mốc 15 phút**, khung 10:30–15:30 — rộng hơn 12h–14h nhà trường nói ở hai đầu, vì bé ngủ sớm hay dậy muộn là chuyện thường và ô chọn thiếu mất giờ cô cần là cô lại quay về gõ tay. **Khung là để bấm nhanh, không phải hàng rào**: máy chủ vẫn nhận mọi giờ hợp lệ, và màn hình **ghép giờ đã lưu vào danh sách chọn** — thiếu bước này thì mở lại bản ghi 09:50 sẽ thấy ô trống, cô bấm Lưu lần nữa là xoá mất giờ cũ. `test:nhat-ky` **44 → 71 bài** | 28/08/2026 |
| **Y2** | **Cô đang duyệt đơn nghỉ, nhà trường muốn văn phòng duyệt** | **✅ xong 28/08** — nhà trường ghi rõ: *"cô chỉ biết, văn phòng mới duyệt, và khi duyệt thì ghi luôn có hoàn tiền ăn hay không"*. Lý do rất thực tế: duyệt một đơn nghỉ ở mầm non kéo theo tiền ăn của tháng, mà tiền thì cô không cầm và không đối chiếu. Nay `POST /api/leave/:id/review` **chỉ quản trị gọi được**, và **cô vẫn đọc được mọi đơn của nhóm mình** — siết quyền duyệt, không cắt quyền biết. Cô gọi thẳng đường dẫn thì nhận một câu giải thích, không phải câu *"Không có quyền thực hiện"* cụt lủn: hôm qua cô còn bấm duyệt được nên im lặng chặn là cô tưởng app hỏng. **Duyệt là phải chốt luôn tiền ăn** — bỏ trống thì bị từ chối, vì cuối tháng bảng đối chiếu (Y3) có một cột trống mà không ai nhớ vì sao là thứ không tra lại được. **Ba giá trị, không phải hai**: có hoàn / không hoàn / **văn phòng chưa quyết** — bảng `leave_refund` KHÔNG có hàng nghĩa là chưa quyết, khác hẳn *đã quyết là không hoàn*; gộp hai cái đó lại là gia đình đọc ra "trường không hoàn tiền" trong khi chưa ai xem tới đơn. Số ngày hoàn có **con số gợi ý** (thứ Hai–thứ Sáu trong đơn) để văn phòng bấm một nhát, nhưng gợi ý chỉ là gợi ý: app không biết lịch nghỉ lễ, nên con số văn phòng gõ mới là con số được lưu. Bảng **riêng**, không `ALTER` bảng `leave_requests` đang có dữ liệu. `test:nghi-hoc` 40 bài | 28/08/2026 |
| **Y2‑b** | Chuông trên ô *Xin phép* của cô vẫn đếm đơn chờ duyệt | **Cố ý giữ.** Cô không duyệt nữa, nhưng con số đó với cô là *"nhóm mình có mấy bé sắp nghỉ"* — vẫn là thông tin cô cần. Màn hình bên trong nay nói thẳng *"Văn phòng duyệt đơn này"* nên không còn đọc ra thành việc-phải-làm. Nêu ra ở đây để lần sau ai đọc thấy thì biết là đã cân nhắc | 28/08/2026 |
| **Y3** | **Chưa có bảng đối chiếu tiền ăn, và bếp chưa có con số nào để nấu** | **✅ xong 28/08** — phân hệ cắm thêm `modules/tienan/` (**Báo ăn & tiền ăn**), mặc định TẮT. Hai việc, hai người: **cô chốt báo ăn hằng ngày cho nhóm mình** (đếm đầu người lúc 7 giờ sáng — người đứng ở lớp lúc đó là cô), **văn phòng đọc bảng đối chiếu cuối tháng** (tiền thì cô không cầm, cùng lý do đã đưa ở Y2). **Trừ suất của ai là chỗ canh kỹ nhất**: chỉ trừ khi có đơn ĐÃ DUYỆT hoặc ĐÃ ĐIỂM DANH VẮNG — đơn còn chờ duyệt mà đã trừ là bếp nấu thiếu cho một bé vẫn đến lớp; và **bé có đơn mà sáng vẫn tới lớp thì vẫn có suất**, app tin sổ điểm danh chứ không tin cái đơn. Bản ghi chốt lưu **cả con số máy tính ra lúc chốt** bên cạnh con số người gõ: hai số lệch nhau là bình thường, nhưng lệch nhiều và thường xuyên là dấu hiệu điểm danh đang trễ so với bếp, mà không lưu thì không ai phát hiện. **Đơn nghỉ vắt qua hai tháng thì ĐÁNH DẤU, không đoán hộ** — văn phòng gõ tổng số ngày cho cả đơn chứ không gõ từng ngày, nên app tính trọn vào tháng có ngày bắt đầu rồi ghi rõ dòng nào cần kiểm tra tay; chia bừa là bịa ra con số không ai gõ. Xuất Excel có BOM và khoá công thức, cùng luật với A6. `test:tien-an` 71 bài | 28/08/2026 |
| **Y3‑b** | Phụ huynh **chưa** xem được bảng tiền ăn của con | **Cố ý để sau.** Gia đình đã thấy **kết quả hoàn tiền của từng đơn nghỉ** ngay trên màn Xin phép (Y2), tức phần họ cần biết ngay thì đã có. Bảng theo tháng cho phụ huynh là một màn nữa và một mặt rò dữ liệu nữa, nên chờ trường dùng thật vài tuần rồi quyết | Chờ trường dùng thử |
| **Y4** | **"Giao diện máy tính hơi khó nhìn"**, và soạn thực đơn một tuần mất 5 lần bấm Lưu | **✅ xong 28/08** — hai câu nhà trường nói chỉ ra hai chỗ khác nhau. **Khó nhìn**: 5 ngày xếp dọc thành một cột hẹp dài, phải cuộn mới so được thứ Hai với thứ Sáu — mà so ngang chính là việc người soạn thực đơn làm (*tuần này đã có món cá hai lần chưa?*). Nay trên màn rộng **xếp ngang**, trên điện thoại vẫn một cột như cũ. **Chậm khi nhập**: soạn một tuần là mở 5 hộp thoại, mỗi hộp 9 ô, bấm Lưu 5 lần — mỗi năm gần 40 lần như vậy. Nay có nút **Soạn cả tuần**: 5 ngày trên cùng một trang, mỗi ngày **ba ô gõ món**, một nút Lưu duy nhất, thêm nút *"Giống hôm trước"* vì thứ Ba giống thứ Hai là chuyện thường ở bếp trường. Tên bữa và giờ ăn gần như không bao giờ đổi nên **gấp lại**. Đường ghi mới `PUT /api/menu/tuan` lưu **một giao dịch**: gọi 5 lần đường cũ thì lỗi ở ngày thứ ba để lại một tuần soạn dở mà người soạn không biết mình đang đứng ở đâu. Ngày để trống hẳn thì **bỏ qua**, không tạo bản ghi rỗng — bản ghi rỗng là màn hình của gia đình hiện một ngày trắng trông y như bếp quên soạn. **Hộp thoại soạn từng ngày giữ nguyên** bên cạnh: ai quen cách cũ vẫn dùng được. `test:thuc-don` 43 bài, cộng 8 bài chạy trên trình duyệt thật | 28/08/2026 |
| **Y5** | **Đón trả bé — app chưa làm gì, mà sổ giấy làm việc này rất kém** | **✅ xong 28/08** — phân hệ cắm thêm `modules/dontra/`, mặc định TẮT. Đây là **phân hệ an toàn, không phải phân hệ tiện lợi**: sai ở đây là trao một đứa trẻ cho người không được phép. Ba bảng — người đón **thường xuyên**, **uỷ quyền một lần** (có khoảng ngày, có ảnh), và **sổ ghi đã trả cho ai**. **Ranh giới quan trọng nhất: cô KHÔNG thêm được người được đón.** Danh sách ai được đón một đứa trẻ là quyết định của gia đình, văn phòng ghi hộ khi gia đình tới trường — không phải vì nghi ngờ cô, mà vì một phân hệ cho phép điều đó thì chỉ cần **một** tài khoản cô lộ mật khẩu là có đường hợp thức hoá việc đón trẻ. Việc của cô là việc ở cổng: nhìn, **đối chiếu ảnh**, ghi lại. **Uỷ quyền hết hạn hay đã huỷ thì không ghi sổ bằng nó được, nhưng vẫn HIỆN RA** ở một mục riêng trên màn cổng — lặng lẽ biến mất là lúc người đó đứng ở cổng, cô không thấy gì, rồi phải gọi điện giữa lúc đang trả 20 bé; câu từ chối còn chỉ đường ra (*chọn "Người khác" và ghi rõ tên*). **Sổ chép lại TÊN** tại đúng lúc trả chứ không chỉ giữ khoá: sang năm gia đình gỡ cô giúp việc khỏi danh sách thì sổ tháng Chín vẫn nói đúng hôm đó ai đón bé. **Ảnh đi qua canh quyền**, không phục vụ tĩnh — ảnh khuôn mặt người lớn gắn với một đứa trẻ cụ thể thì biết ai đón bé nào cũng là thông tin về đứa trẻ đó. **Không có đường xoá nào**: ngưng dùng và huỷ, không xoá. `test:don-tra` 77 bài | 28/08/2026 |
| **Y5‑b** | Uỷ quyền một lần **không bắt buộc** phải có ảnh | **Cố ý.** Nhà trường yêu cầu "có kèm ảnh", và app nhắc rất rõ ở cả hai đầu — gia đình gửi không ảnh thì phải xác nhận thêm một lần, cô ở cổng thấy dòng đỏ *"chưa có ảnh để đối chiếu"*. Nhưng **bắt buộc** thì mẹ đang họp, điện thoại không có ảnh bác hàng xóm, sẽ gọi điện cho cô — tức quay về đúng cách cũ mà app định thay | 28/08/2026 |
| **Y5‑c** | Uỷ quyền một lần **không cần văn phòng duyệt** | **Cố ý, nhưng nên xem lại khi trường dùng thật.** Gia đình là người có quyền quyết ai đón con mình, và bắt duyệt là thêm một khâu chờ đúng lúc gấp nhất (4 giờ chiều). Đổi lại app ghi **ai tạo, lúc nào, ảnh gì** vào Nhật ký thao tác — chặt hơn mẩu giấy hay cuộc điện thoại của cách cũ. Nếu trường muốn khâu duyệt thì thêm được mà không phải sửa bảng | Chờ trường dùng thử |
| **GĐ2‑A** | **Hành trình học tập — phần hồn của CASA, chưa có gì** | **✅ xong 28/08** — phân hệ cắm thêm `modules/hanhtrinh/`, mặc định TẮT. **Ba lớp dữ liệu nằm trong MỘT bản ghi**, đúng chữ *"ba lớp dữ liệu của một quan sát"* trong CLAUDE.md: tách ba bảng thì mỗi lần đọc phải ghép ba nơi, và chỗ ghép chính là chỗ rò rỉ. Một bảng, **một hàm lọc theo người xem**, một chỗ để canh. Lớp 1 (ghi chú thô) chỉ cô đã ghi; lớp 2 (nhận định) cô trong nhóm; lớp 3 (câu chuyện) chỉ phụ huynh của chính bé, và **chỉ khi cô chủ động công bố**. Phụ huynh **không nhận cả số lượng bản ghi chưa công bố** — lọc trong câu truy vấn, vì *"cô ghi 12 điều về con tôi nhưng chỉ kể 2"* cũng là thứ không nên rò. **Năm trạng thái** đúng bản kế hoạch (Chưa dạy · Chưa quan sát thấy · Đang hình thành · Đã vững · Vượt trội), lưu bằng **nhãn chữ** chứ không phải số 1–5. **QUY TẮC 1**: quan sát chỉ có mô tả là quan sát hoàn chỉnh, gắn lĩnh vực là bước riêng có thể không làm. **QUY TẮC 5**: chọn một trong ba trạng thái đã quan sát thấy thì phải ghi *"ở lớp cô làm gì tiếp"*; công bố câu chuyện thì phải có *"cùng con ở nhà"*. `test:hanh-trinh` 89 bài | 28/08/2026 |
| **GĐ2‑B** | Suy ngẫm cuối ngày, chủ đề tuần, Cùng con ở nhà | **✅ xong 28/08** — cùng phân hệ. Màn **suy ngẫm cuối ngày** đưa sẵn mọi thứ cô cần (quan sát hôm nay của chính cô + Ghi nhanh chưa kéo vào), và **bấm giờ thật** để chỉ tiêu *≤ 3 phút một quan sát* của bản kế hoạch đo được bằng số chứ không phải lời hứa. **Chủ đề tuần** có nút *chép tuần trước*, không ghi đè tuần đã soạn — bài học B9 của app 1: màn hình nào hiển thị dữ liệu thì phải có người tạo được dữ liệu đó qua giao diện. **Cùng con ở nhà** ở hai chỗ: theo tuần cho cả nhóm, và theo từng câu chuyện. Nối với **Ghi nhanh** nhưng **không phụ thuộc**: đọc bảng của phân hệ khác trong khối bắt lỗi, tắt Ghi nhanh đi thì Hành trình vẫn chạy | 28/08/2026 |
| **N23** | **QUY TẮC 2 chưa canh được bằng máy** | **✅ xong 28/08** — bốn quy tắc kia đã có bộ canh, riêng QUY TẮC 2 nằm im trong tài liệu vì màn hình đánh giá chưa tồn tại. Nay có `test:quy-tac-2` (32 bài) quét `public/js/views`, `modules`, `routes`, `data/seed.js` tìm **bốn cách vi phạm**: tô đỏ nhãn *"chưa"*, gọi nó là thất bại, đếm nó ra một khoảng trống cần lấp (thanh tiến độ, **chỉ tiêu số quan sát**), và giấu bé chưa có gì đi cho màn hình đỡ trống. Kiểu **bánh cóc** như QUY TẮC 4, và món nợ hiện là **một dòng** — màn Học bạ tiểu học có thang bốn mức mà mức thấp nhất tên *"Chưa hoàn thành"*, gỡ ở N3. Bộ canh phân biệt **trần với sàn**: `TOI_DA_MUC_TIEU = 15` là trần nhập liệu, không sao; `TOI_THIEU_QUAN_SAT = 5` là sàn, và đó mới là thứ bị cấm | 28/08/2026 |
| **N24** | **Ba lỗ phát hiện khi đọc lại mã trước lúc làm GĐ2** | **✅ xong 28/08** — ba cái, xếp theo mức nặng. **(a)** Đường chống trùng mã của Ghi nhanh (`POST /api/thuchup`) kiểm quyền trên `studentId` do NGƯỜI GỬI khai, rồi tra bản ghi theo `id` — **hai giá trị không đối chiếu với nhau**. Quản trị Cấp 3 khai bé của cơ sở mình cộng với id bản ghi của cơ sở khác thì đọc được nguyên ghi chú và tên tệp ảnh. `doDuocBanGhi` không bắt được vì nó chỉ hỏi *"có phải cô đã ghi không"*, mà quản trị thì không phải cô nào. Mã là UUID nên khó đoán, nhưng **"khó đoán" không phải kiểm soát truy cập** — chính lời chú thích trong tệp cũng nói vậy. **(b)** `test/goi-ten.test.mjs` liệt kê TAY `modules/hocphi` và `modules/thuchup`, nên **năm phân hệ thêm sau đó không được quét một dòng nào** — đúng lỗi N19 đã sửa cho `test:quy-tac-4` nhưng quên sửa sang đây. Nay quét cả thư mục `modules`, đi vào thư mục con, và có mục canh riêng để không ai thu hẹp lại; cố ý **không quét `.sql`** vì bộ lọc bỏ chú thích hiểu `//` chứ không hiểu `--`, mà lược đồ thì không in gì cho ai đọc. **(c)** Hành trình học tập đọc thẳng bảng của Ghi nhanh mà **không hỏi công tắc** — chặn ở HTTP không đủ vì đường này không đi qua HTTP; nhà trường tắt Ghi nhanh xong vẫn thấy nội dung chảy ra qua màn khác. Cùng lỗi đã vá ở Y1 cho Thực đơn | 28/08/2026 |
| **GĐ2‑C** | **Kế hoạch tháng cho từng bé, có phê duyệt (Class Progress)** | **✅ xong 28/08** — phân hệ cắm thêm `modules/kehoachbe/` (**Kế hoạch của bé**), mặc định TẮT. **Tách hẳn khỏi phân hệ lõi "Kế hoạch giáo dục"** (`/api/plans`, kế hoạch tháng của cả NHÓM) — mã phân hệ, đường dẫn và tên hiển thị đều khác, để cô không nhìn thấy hai ô cùng tên. Cô lập kế hoạch cho từng bé theo **5 góc lĩnh vực** (Toán · Tiếng Việt · Cambridge · Thực hành cuộc sống · Giác quan) → **quản lý duyệt** → cuối tháng **nhìn lại**. **Rủi ro 1 — khối lượng nhập liệu**: 20 bé × 5 góc = 100 ô mỗi tháng, nên có **ba đường tắt là đường CHÍNH**: *đặt một kế hoạch cho cả nhóm* (gõ 5 dòng, cả nhóm có kế hoạch), *chép tháng trước* (mục đánh dấu "tiếp tục" xếp lên trước), và **lưu cả nhóm trong một giao dịch**. Cả hai đường tắt đều **không đè lên phần cô đã gõ tay** — một đường tắt xoá công của cô thì tệ hơn không có. **Rủi ro 2 — vế cuối tháng chạm QUY TẮC 2**: `ketQua` dùng **đúng năm trạng thái** của Hành trình học tập (bài test đối chiếu **từng chữ** hai danh sách), không có giá trị nào thuộc cặp từ đúng/sai; phần "ôn tiếp" thành ô tích **Tiếp tục ở tháng sau** — trung tính, và cũng chính là việc-làm-tiếp của QUY TẮC 5. **Người lập không duyệt kế hoạch của chính mình** (cùng luật Y2); trả lại **phải kèm lý do**; khoá khi đang chờ duyệt nhưng **rút lại được**; phần nhìn lại vẫn ghi được trên bản đã duyệt. `test:ke-hoach-be` 74 bài | 28/08/2026 |
| **GĐ2‑C‑b** | Phụ huynh **chưa** xem được kế hoạch tháng của con | **Cố ý.** Đây là hồ sơ nghề nghiệp của cô, và mở nó cho gia đình là dựng lại đúng áp lực *"tháng này con chưa làm được mục nào"* mà QUY TẮC 2 tránh. Gia đình đọc **câu chuyện học tập** ở phân hệ Hành trình — thứ cô chủ động kể | Chờ trường dùng thử |
| **GĐ2‑D** | **Cambridge và Home Connection cho phụ huynh** | **✅ xong 28/08** — phân hệ cắm thêm `modules/cambridge/` (**Cambridge & Kết nối ở nhà**), mặc định TẮT. Nhà trường mới nói *"văn phòng đăng lên, phụ huynh đọc; chưa rõ nội dung gồm những gì"*, nên **lược đồ để rộng có chủ ý**: tiêu đề, một khối chữ, tối đa 6 ảnh, một nhãn loại. Đoán trước rồi khoá cứng thành các ô riêng (tuần mấy, từ vựng nào) là cầm chắc phải sửa lược đồ khi trường gửi mẫu thật — mà sửa lược đồ của bảng đã có dữ liệu là việc CLAUDE.md cấm. **Phần khó nhất là PHẠM VI**, không phải nội dung: sai có hai kiểu, *gửi thiếu* (gia đình không thấy tờ của chính nhóm mình, không ai báo vì không ai biết mình đang thiếu) và *gửi thừa* (tờ của nhóm Lá 1 hiện cho gia đình nhà trẻ — thư rác, mà thư rác làm gia đình ngừng đọc cả những thông báo quan trọng). Ba mức: **cả trường · một cơ sở · một nhóm**, lọc ở tầng dữ liệu bằng **một hàm duy nhất**, và bài test đi đủ ba mức nhân ba loại người đọc theo cả hai chiều thấy/không thấy. Quản lý một cơ sở gửi được cho cơ sở mình và nhóm của mình, **không gửi được cho cả trường** (cùng luật thực đơn ở N15). **Công bố là bước riêng**; thu hồi gỡ khỏi màn hình gia đình mà không xoá chữ. Ảnh đi qua canh quyền. `test:cambridge` 66 bài | 28/08/2026 |
| **GĐ2‑D‑b** | Không đếm **bao nhiêu gia đình đã đọc** | **Cố ý để sau.** Nhà trường chưa chốt nội dung nên chưa rõ có cần. Thêm bảng đánh dấu đã đọc là thêm một mặt dữ liệu về hành vi của phụ huynh, làm sau khi trường nói rõ mình cần con số đó để làm gì thì đúng hơn | Chờ trường dùng thử |
| **GĐ2‑E** | **Phân quyền Cấp 2 chưa có gì, và Cấp 3 chưa tách hai vai** | **✅ xong 28/08** — thêm **tầng chức vụ**, cài bằng **một middleware duy nhất** đặt cạnh `chanApiDaTat` và **trước khi mọi route được nạp**, nên không đường nào đi vòng qua được. Ba luật của tầng này quan trọng hơn danh sách chức vụ: **(1) không khai chức vụ = y hệt hôm nay** — bảng `user_chucvu` rỗng thì `apiChoPhep` trả `null` và cả tầng nằm im, trường đang chạy không rung một chút nào; **(2) chức vụ chỉ BỚT, không bao giờ THÊM** — mọi giới hạn cũ (tầng cơ sở, `requireRole`, `canAccessStudent`) vẫn nguyên, không có đường nào để một chức vụ mở ra quyền mà vai không có sẵn; **(3) danh sách CHO PHÉP chứ không phải danh sách CẤM** — đường dẫn thêm sau này **mặc định bị từ chối**, tức quên thì quên theo hướng đóng lại. Sáu chức vụ: *Ban giám hiệu* (Cấp 1) · *Quản lý cơ sở* và *Văn phòng cơ sở* (Cấp 3) · *Nhân sự*, *Marketing*, *Kế toán* (Cấp 2). **Ba chỗ phải vá thêm ở tầng route, vì danh sách cho phép một mình không đủ**: **(a)** *Nhân sự* là quản trị **không khoá cơ sở** nên nó đi lọt đúng chỗ N15 đã bịt cho Cấp 3 — ba lời gọi là thành Cấp 1 (xem danh sách quản trị → cấp lại mật khẩu cho ban giám hiệu → đọc mật khẩu tạm ngay trên màn hình → đăng nhập). Nay Cấp 2 **không cấp lại mật khẩu cho bất kỳ tài khoản quản trị nào**, kể cả một Cấp 2 khác. **(b)** *Văn phòng cơ sở* cần cả `/api/admin` để làm việc hằng ngày, nhưng **không tạo tài khoản cô** (đường đó trả thẳng mật khẩu tạm về màn hình) và **không phân công cô vào nhóm** (gắn cô vào nhóm là mở hồ sơ cả nhóm bé cho cô ấy) — hai quyết định về con người thuộc về *Quản lý cơ sở*. **(c)** *Marketing* thấy ảnh theo **luật chặt hơn luật ảnh nhóm**: ảnh phải **đã gắn bé** và **mọi bé trong ảnh** đều tích ô ③ *truyền thông* — ảnh chưa gắn ai thì không biết trong đó có ai, mà ô ③ mặc định **không** tích. Lọc ở cả **ba đường đọc ảnh**, kể cả đường trả về đúng các byte của tấm ảnh. **Khung xương của app luôn mở với mọi chức vụ** (`/api/auth`, `/api/modules`, `/api/dashboard`) — chặn một trong ba là app trắng màn hình ngay sau khi đăng nhập, tức tầng bảo mật tự vi phạm Nguyên tắc số 1. `test:chuc-vu` 78 bài, canh **cả hai chiều**: hở ra, và siết quá | 28/08/2026 |
| **GĐ2‑E‑b** | *Nhân sự* **vẫn** cấp lại được mật khẩu cho gia đình | **Cố ý.** Chốt mới chỉ chặn chiều leo thang (tài khoản quản trị). Cấp lại mật khẩu cho một phụ huynh quên là việc văn phòng trường vẫn làm, và cắt nó đi thì chức vụ *Nhân sự* gần như không còn việc gì mở được | 28/08/2026 |
| **GĐ2‑E‑c** | Chốt *Marketing chỉ đọc ảnh* chỉ gắn ở **hai** đường, không phải bốn | **Cố ý.** Thêm ảnh và xoá một tấm ảnh vốn đã **chỉ dành cho cô đang dạy nhóm**, nên mọi tài khoản quản trị đã nhận 403 ở đó từ trước — gắn thêm chốt vào đấy trông cẩn thận nhưng **không bao giờ chạy**, mà một chốt không bao giờ chạy là một lời hứa không ai kiểm được. Hai chỗ nó thật sự đỡ: **tạo album** (luật cũ trả 400 *"Tài khoản chưa gắn với nhóm lớp nào"*, sai người sai việc) và **xoá cả album của nhóm ĐÃ ĐÓNG** — chỗ này hở thật, mà sau mỗi lần chuyển năm học thì gần như **toàn bộ** album của trường đều đã đóng | 28/08/2026 |
| **N17** | Ba cơ sở nấu bếp chung hay riêng? | **Chờ nhà trường trả lời.** Bảng `menus` hiện có MỘT bản ghi mỗi ngày, tức mô hình đang nói "cả trường ăn chung một thực đơn" — khớp với yêu cầu *"thực đơn và TKB sẽ do admin làm và up lên"*. N15 tạm chặn quản lý cơ sở sửa thực đơn. Nếu ba bếp nấu riêng thì phải **thêm cột cơ sở vào `menus` TRƯỚC**, rồi mới mở đường ra — mở trước mà giữ nguyên bảng thì người sửa sau ghi đè người sửa trước, âm thầm, mỗi ngày | **Chờ nhà trường** |
| ~~N16~~ | ~~Nhà trường xin **số CCCD của phụ huynh**, A3 mới làm **số định danh của bé**~~ | **✅ xong 27/08** — bảng phụ `user_profile`, **không `ALTER` bảng `users`**. Lý do thứ hai của bảng phụ mới là lý do chính: `publicUser()` chỉ gạt `passwordHash`, mọi cột khác của `users` đi thẳng tới ai xem được hồ sơ bé — thêm `soCccd` thành một cột là gửi số của bố cho mẹ và cho cô ngay, không ai phải viết sai thêm dòng nào. **Ranh giới khác số định danh của bé**: quản trị đọc được, **chính người đó** đọc được, còn cô và **người phối ngẫu** thì không — bố mẹ ly hôn là chuyện có thật, app không được là nơi một bên lấy số giấy tờ của bên kia. Đường ghi là `PUT /api/admin/parents/:id/cccd` **riêng**, không nhét vào đường của bé: một phụ huynh có hai con thì sửa ở đâu cũng phải ra cùng một bản ghi. `test:cccd-phu-huynh` 22 bài | 27/08/2026 |
| **A2** | Nhà trường không dùng **Nhận xét hàng ngày** và **Xe buýt** | **✅ xong 27/08** — tắt sẵn, dữ liệu giữ nguyên, bật lại được. Cùng cách với N3. Chỗ của Nhận xét hàng ngày ở app 2 do **Ghi nhanh** thay, mà Ghi nhanh làm việc khác hẳn: cô mô tả điều **đã thấy**, không phán xét (QUY TẮC 1) | 27/08/2026 |
| **A3** | Hồ sơ bé thiếu ba thứ văn phòng cần: **số định danh cá nhân**, **tiền sử bệnh**, **người liên hệ khẩn cấp** | **✅ xong 27/08** — ba bảng phụ `CREATE ... IF NOT EXISTS`, **không `ALTER` bảng lõi**. Số định danh là dữ liệu cá nhân theo NĐ 13/2023 nên **cắt ở máy chủ**, chỉ quản trị nhận được — cô và phụ huynh gọi thẳng đường dẫn cũng không thấy. Ô *"Dị ứng"* đời cũ **không bị xóa**: `tienSuBenh` để trống thì lùi về đọc nó, trường đã nhập cho 300 bé không phải nhập lại. Không gửi một trường lên = **không đụng tới**, khác hẳn xóa trắng — nhờ vậy màn hình cũ lưu hồ sơ không làm bay số định danh và số gọi khẩn cấp. `test:ho-so-be` 22 bài | 27/08/2026 |
| **A4** | Hồ sơ bé hiện **số điện thoại riêng của cô** | **✅ xong 27/08** — thay bằng **hotline văn phòng của đúng cơ sở** bé đang học (lùi về số của trường nếu chưa khai cơ sở). Lý do nhà trường đưa ra rất thực tế: cô đang đứng nhóm với 20 bé thì không cầm điện thoại, văn phòng thì luôn có người nghe. Đi kèm A4: hồ sơ bé hiện **tuổi tính theo ngày sinh**, dưới một tuổi thì đếm bằng tháng | 27/08/2026 |
| **A5** | Dặn thuốc bắt cô gõ tay từng dòng *"đã cho con uống"* | **✅ xong 27/08** — nhà trường chạy thử quy trình nhận thuốc thật rồi chốt bỏ hẳn bước đó, app chỉ ghi **"cô đã nhận thuốc"**. Lý do không phải cho gọn màn hình: cô đang đứng nhóm với 20 bé thì không rảnh tay gõ, ô nào cô không kịp ghi sẽ nằm trống, mà một khoảng trống trên màn hình phụ huynh đọc ra thành *"cô quên cho con uống"*. App chỉ nên hứa thứ nó biết chắc. **Dòng nhật ký cũ vẫn hiện nguyên** và đường `/api/medicine/:id/log` cố ý còn sống (điện thoại còn giữ bản app cũ vẫn gọi được) — xóa hẳn để sau, cùng cách với N3. `test:dan-thuoc` 21 bài | 27/08/2026 |
| **A6** | Văn phòng phải gõ tay lại danh sách bé từ màn hình để làm báo cáo | **✅ xong 27/08** — nút **Xuất ra Excel** ở Quản trị → Tổng quan, tải về tệp CSV có dấu BOM (Excel trên Windows mở thẳng, không lỗi phông tiếng Việt). Đủ cột cho báo cáo: mã, họ tên, ngày sinh, **tuổi tính theo ngày sinh** (dưới một tuổi đếm bằng tháng), nhóm lớp, cơ sở, số định danh, tiền sử bệnh, bố/mẹ, người liên hệ khẩn cấp. **Tệp này chặt hơn màn hình nó đứng cạnh, và đó là chủ ý** — nó đi ra khỏi app nên chỉ xuất bé trong phạm vi cơ sở của người bấm, ghi lại mỗi lần xuất vào Nhật ký, và vô hiệu hoá ô bắt đầu bằng `=` `+` `-` `@` (Excel coi ô như vậy là công thức và **chạy** nó — họ tên do người nhập gõ). `test:xuat-danh-sach` 34 bài | 27/08/2026 |
| ~~N12~~ | ~~Phân hệ vẫn tên là "Thời khóa biểu" trong khi ruột đã là lịch sinh hoạt một ngày~~ | **✅ xong** — nhà trường chốt đổi thành **"Lịch sinh hoạt"**, và bỏ luôn chữ *"tiết"* bên trong ("Thứ 2 — hoạt động từng mốc"). Thêm hai từ vào `test:goi-ten` để tên cũ không trôi ngược; biểu thức tự chừa *"chi tiết"*, *"tiết kiệm"*, *"tiết mục"* thay vì mở ngoại lệ — ngoại lệ chừa CẢ DÒNG, dễ chừa lây chữ sai nằm cạnh | 27/08/2026 |

---

## Nhật ký commit

| Ngày | Việc | Mục |
|---|---|---|
| 26/08/2026 | Nhân bản nền từ app 1, viết `CLAUDE.md` + bộ docs định hướng | G0.1, G0.2 |
| 26/08/2026 | Phân hệ `thuchup` + 40 bài kiểm thử — phần mã của phép thử quyết định | G0.3 |
| 26/08/2026 | Nhiều cô một nhóm, **bước 1/3**: bảng `class_teachers` + 9 hàm mới, chưa ai gọi | G0.4 |
| 26/08/2026 | Nhiều cô một nhóm, **bước 2/3**: chuyển 12 tệp tính năng sang hàm mới; chặn rò rỉ ghi chú thô của cô | G0.4 |
| 26/08/2026 | Nhiều cô một nhóm, **bước 3/3**: đường quyền thôi đọc hai cột cũ — G0.4 xong | G0.4 |
| 26/08/2026 | Vá nốt chỗ thứ tư của `thuchup`: đường chống trùng mã trả nguyên bản nháp của cô khác | G0.4 |
| 26/08/2026 | Ghi lại việc còn nợ N8–N10, sửa một chú thích đã sai sau G0.4 | — |
| 26/08/2026 | Vá lỗi nền: đáy modal nằm ngoài vùng chạm được khi bàn phím bật | Lỗi nền chung |
| 26/08/2026 | Dữ liệu mẫu kể chuyện bé An — nhóm Chồi 2, cơ sở 1; không còn một điểm số nào | G0.5 |
| 26/08/2026 | Đổi cách gọi tên toàn app (250+ chỗ / 45 tệp) + bài canh `test:goi-ten` + giấu ô điều khiển đã chết | N9 · N10 · N11 |
| 26/08/2026 | Script chữa cháy phân công cô: thu hồi quyền THẬT ở cả hai nơi, + 16 bài test | N8 |
| 26/08/2026 | Bài canh QUY TẮC 4 kiểu bánh cóc — món nợ N3 thành con số máy đếm được | N6 |
| 26/08/2026 | Chạy thật mà dữ liệu nằm trong kho mã → máy chủ DỪNG trước khi mở cổng | N5 |
| 26/08/2026 | Dán cảnh báo "tài liệu này của app 1" lên cả 5 tệp triển khai | N1 (một phần) |
| 26/08/2026 | Phiếu hướng dẫn phép thử trên điện thoại thật — cổng DỪNG của GĐ 0 | G0.3 |
| 27/08/2026 | Bắt chữ lặp đôi bằng máy, sau khi `chưa chưa` lọt ra màn hình thật | Đợt soát |
| 27/08/2026 | Dữ liệu của bé nằm lạc trong kho mã: `.gitignore` giấu nó, `docker build` đóng gói nó | Đợt soát |
| 27/08/2026 | Khôi phục dữ liệu: từ chối khi máy chủ đang chạy, và giữ lại cho đủ (+39 bài) | Đợt soát |
| 27/08/2026 | Đường triển khai: một tên thư mục dữ liệu, một lệnh chuyển không cuốn theo mã nguồn | Đợt soát · N13 · N14 |
| 27/08/2026 | Bộ kiểm máy chủ nói đúng sự thật: mục nào chặn app bật lại thì nói thẳng | Đợt soát |
| 27/08/2026 | Cô dạy hai nhóm mở được cả hai: ô chọn nhóm cho Kế hoạch và Thời khóa biểu | Đợt soát · G0.4 |
| 27/08/2026 | Quét nốt tiếng của trường mầm non: "em", "HS", "PH", "lớp" thay cho "nhóm" (59 chỗ) | Đợt soát · N9 |
| 27/08/2026 | Tuổi bé tính theo ngày sinh; màn Soạn kế hoạch thôi dạy bài tiểu học | Đợt soát |
| 27/08/2026 | App tự xưng đúng tên mình: CASA Mầm non, không phải SchoolConnect | Đợt soát |
| 27/08/2026 | Tệp dùng chung nói đúng tên app (**commit riêng**), bỏ 2 chú thích sai từ sau G0.4 | Đợt soát |
| 27/08/2026 | Thêm `UI.thanhChonBe()` — ô chọn bé cho quản trị (**commit riêng**, tệp dùng chung) | Đợt soát |
| 27/08/2026 | Quản trị biết mình là ai và đang xem hồ sơ bé nào; phụ huynh vào nhầm được nói tử tế | Đợt soát |
| 27/08/2026 | Thêm `UI.noiTenNhom()` — nối tên nhóm bằng "và" (**commit riêng**, tệp dùng chung) | Đợt soát |
| 27/08/2026 | Dọn nốt nhãn còn lệch: xưng hô với cô, số đo sai lứa tuổi, chữ của trường phổ thông | Đợt soát |
| 27/08/2026 | `/healthz` thôi lộ thông tin vận hành; `restore` đếm cả phân công cô | Đợt soát |
| 27/08/2026 | Phụ huynh xem lại được album nhóm cũ của con — mốc lấy đầu năm học (**người dùng duyệt**) | Đợt soát |
| 27/08/2026 | Gỡ vỏ đóng gói Android của app 1 — app 2 chỉ làm PWA | N2 |
| 27/08/2026 | "Thời khóa biểu" → **"Lịch sinh hoạt"**, bỏ chữ "tiết" | N12 |
| 27/08/2026 | **TẮT SẴN** Nề nếp và Báo cáo — hai phân hệ xếp hạng trẻ (**nhà trường quyết**) | N3 bước 1/2 |
| 27/08/2026 | Tầng cơ sở **bước 1/3**: bảng và hàm, chưa ai gọi tới | N4 |
| 27/08/2026 | Tầng cơ sở **bước 2/3**: khai báo, gắn nhóm, dữ liệu mẫu ba cơ sở | N4 |
| 27/08/2026 | Tầng cơ sở **bước 3/3**: đường quyền cách ly thật sự các cơ sở (+36 bài) | N4 |
| 27/08/2026 | Gán tài khoản quản trị vào cơ sở, kèm hai chốt chặn không cho tự khoá cửa | N4 |
| 27/08/2026 | Lứa tuổi thật của trường: **12 tháng – 6 tuổi**, không phải 2–6 | A1 |
| 27/08/2026 | **TẮT SẴN** Nhận xét hàng ngày và Xe buýt (**nhà trường quyết**) | A2 |
| 27/08/2026 | Hồ sơ bé: số định danh, tiền sử bệnh, người liên hệ khẩn cấp — **tầng dữ liệu** (**commit riêng**) | A3 bước 1/2 |
| 27/08/2026 | Hồ sơ bé: ba trường mới lên màn hình, hotline văn phòng thay số riêng của cô (+22 bài) | A3 · A4 |
| 27/08/2026 | Hai bộ kiểm thử trùng cổng thì **báo đỏ ngay**, thay vì lặng lẽ chạy nhầm cơ sở dữ liệu | Đợt soát |
| 27/08/2026 | Dặn thuốc bỏ bước **"đã cho uống"** — app chỉ ghi thứ nó biết chắc (+21 bài) | A5 |
| 27/08/2026 | Xuất danh sách bé ra tệp Excel mở thẳng được, có canh phạm vi cơ sở (+34 bài) | A6 |
| 27/08/2026 | Số CCCD của phụ huynh — **tầng dữ liệu** (**commit riêng**) | N16 bước 1/2 |
| 27/08/2026 | Số CCCD của phụ huynh lên màn hình, canh cả ranh giới vợ–chồng (+22 bài) | N16 |
| 27/08/2026 | Nhật ký thao tác hỏng thì **kêu lên**, đừng câm (**commit riêng**, tệp dùng chung) | N15 |
| 27/08/2026 | Tầng cơ sở phủ kín các đường quản trị; bịt lối leo thang quyền qua đặt lại mật khẩu (+55 bài) | N15 |
| 28/08/2026 | Đồng ý của gia đình và luật ảnh nhóm — **tầng dữ liệu** (**commit riêng**) | N18 bước 1/2 |
| 28/08/2026 | Sửa luật ảnh nhóm: "con mình" không phải lối tắt bỏ qua đồng ý bé khác (**commit riêng**) | N18 |
| 28/08/2026 | Đồng ý chia sẻ ảnh lên màn hình: cô gắn thẻ bé, văn phòng ghi giấy (+38 bài) | N18 |
| 28/08/2026 | **Nhật ký ngày**: ăn / ngủ / vệ sinh / thay bỉm — phân hệ cắm thêm (+44 bài) | GĐ 1 |
| 28/08/2026 | Nhật ký ngày **nối với thực đơn từng ngày** + khung giờ ngủ chọn sẵn (+21 bài) | Y1 |
| 28/08/2026 | **Văn phòng duyệt đơn nghỉ**, chốt luôn hoàn tiền ăn (+40 bài, +3 bài ở `test:lo-hong`) | Y2 |
| 28/08/2026 | **Báo ăn & tiền ăn** — chốt suất cho bếp, đối chiếu cuối tháng (+71 bài) | Y3 |
| 28/08/2026 | Màn **Thực đơn**: cả tuần nhìn một lượt, soạn cả tuần một lần Lưu (+43 bài, +8 giao diện) | Y4 |
| 28/08/2026 | **Đón trả bé**: ai được đón, uỷ quyền một lần có ảnh, sổ trả bé (+77 bài) | Y5 |
| 28/08/2026 | **Hành trình học tập**: ba lớp dữ liệu, 5 trạng thái, suy ngẫm cuối ngày, chủ đề tuần (+89 bài) | GĐ2‑A · GĐ2‑B |
| 28/08/2026 | **QUY TẮC 2 nay canh được bằng máy** (+32 bài) | N23 |
| 28/08/2026 | Vá ba lỗ đọc lại trước GĐ2: lỗ đọc chéo cơ sở ở Ghi nhanh, bộ canh gọi tên bỏ sót 5 phân hệ, công tắc phân hệ (+12 bài) | N24 |
| 28/08/2026 | **Kế hoạch của bé**: từng bé, 5 góc lĩnh vực, quản lý duyệt, cuối tháng nhìn lại (+74 bài) | GĐ2‑C |
| 28/08/2026 | **Cambridge & Kết nối ở nhà**: văn phòng đăng theo ba mức phạm vi (+66 bài) | GĐ2‑D |
| 28/08/2026 | **Tầng chức vụ**: Cấp 2 (Nhân sự · Marketing · Kế toán), Cấp 3 tách *quản lý cơ sở* với *văn phòng cơ sở* (+78 bài) | GĐ2‑E |
| 28/08/2026 | Bộ canh QUY TẮC 4 nay nhìn tới MỌI phân hệ, không chỉ hai cái viết tay | N19 |
| 28/08/2026 | Dữ liệu mẫu có **nhóm nhà trẻ**: ba bé 14 / 34 / 38 tháng | N20 |
| 28/08/2026 | Bé 14 tháng thôi bị gọi là "1 tuổi" — vá cả hai bản của hàm tính tuổi | N21 |
| 28/08/2026 | Số đếm của dữ liệu mẫu khai một chỗ, có bài canh cho chính hằng số đó | N22 |
| 28/08/2026 | **Đ1** — ảnh Cambridge phải đi qua luật ảnh nhóm, kèm ô "ảnh không có mặt bé nào" làm đường ra | Sổ việc 31 |
| 28/08/2026 | **Đ2** — một định nghĩa duy nhất cho chữ "hôm nay" (`lib/ngay.js`, UTC+7 đóng cứng) | Sổ việc 43 |
| 28/08/2026 | **Đ3** — chuyển năm học giữ đúng cơ sở, không gộp nhóm trùng tên của ba cơ sở | Sổ việc 27, 32, 42 |
| 28/08/2026 | **Đ4** — bộ canh dữ liệu bỏ lọt chính tệp mà `restore.js` sinh ra | Sổ việc 41 |
| 28/08/2026 | **Đ5 + Đ6** — tắt sẵn màn "Hồ sơ con đã ra trường" và gỡ phần điểm số; dấu phiên bản cho `view.js` của phân hệ | Sổ việc 37, 10, 36 |
| 28/08/2026 | **Đ7 + Đ8 + Đ10** — tám màn phân hệ chạy trên Chromium thật lần đầu; Nhật ký "áp cả nhóm" thôi ghi đè và giữ nháp; hàng đợi Ghi nhanh tự gửi khi có mạng lại | Sổ việc 1, 6, 11, 26, 38, 54 |
| 28/08/2026 | **Đ9 + Đ11** — Hành trình hiện lại ảnh và chép được cả chữ lẫn ảnh từ Ghi nhanh; ba bộ canh thôi tự cho mình qua | Sổ việc 39, 40, 50, 51 · 2, 5, 7 |
| 28/08/2026 | **Đ13** — lời từ chối chia sẻ ảnh thôi hết hiệu lực theo lịch nhà trường (album năm cũ và tờ Cambridge cũ) | Sổ việc 44 |
| 28/08/2026 | **Đ14** — gỡ hẳn lời hứa "thông báo đẩy" mà app không làm được; thêm bộ canh `test:khong-hua-suong` | Sổ việc 25, 49 |
| 28/08/2026 | **Đ15** — ghi nhầm bé thì chuyển được sang đúng bé, hoặc xoá hẳn kèm dọn ảnh; ô chọn bé thôi chọn sẵn bé đầu danh sách | Sổ việc 52 |
| 28/08/2026 | **Đ20** — bộ canh đòi mỗi phân hệ phải được quyết định tường minh trong danh sách chức vụ | Sổ việc 113 |
| 28/08/2026 | **Đ16** — dữ liệu mẫu kể tiếp câu chuyện bé An qua cả tám phân hệ mầm non; tắt sẵn trong kiểm thử, có bộ canh riêng | Sổ việc 53, 85 |
| 28/08/2026 | **Đ19** — đợt chữ còn nói tiếng trường phổ thông: ô "Tên môn học", ô "Khối 1–12", hộp thoại hứa giữ "học bạ", mô tả "cô duyệt" đơn nghỉ, và các câu ghi cứng "ba cơ sở". Ô cân đo gợi ý theo tuổi thật + chặn số gõ nhầm | Sổ việc 96, 128, 132, 133, 147, 161 |
| 28/08/2026 | **Đ17** — ảnh trong bản sao lưu được dọn (theo luật cố ý dè dặt); hai bộ canh mật khẩu mẫu thôi báo xanh oan; `render.yaml` và `Dockerfile` thôi mang tên app 1 và thôi gãy lúc build | Sổ việc 45, 33, 105, 115, 116 |
| 28/08/2026 | **Đ18** — gia đình tự xem và tự rút được giấy đồng ý; đồng ý thì vẫn phải ký giấy ở văn phòng | Sổ việc 48 |
| 28/08/2026 | **Đ21** — năm bản hàm nén ảnh gom về `UI.nenAnh`; ba màn thôi để ảnh dọc nằm ngang; bộ canh đọc mã cấm bản chép thứ sáu (bước duy nhất xoá toạ độ GPS trong ảnh) | Sổ việc 94, 146 |
| 28/08/2026 | **Đ22** — bộ canh mới: mọi đường API trong `routes/` và `modules/*/routes.js` đọc dữ liệu của bé đều phải đi qua một hàm canh quyền (trước chỉ canh cho `routes/admin.js`) | Sổ việc 8 |
| 28/08/2026 | **Đ23** — vòng sao lưu → mất → khôi phục nay kiểm đúng **byte của một tấm ảnh thật**; `restore.js` thôi im lặng bỏ qua ảnh trên đĩa khác với bản sao | Sổ việc 3 |
| 28/08/2026 | **Đ24** — tầng chức vụ nay được thử THẬT với bốn phân hệ nhạy cảm nhất (Ghi nhanh, Hành trình, Kế hoạch của bé, Nhật ký ngày), cả chiều cấm lẫn chiều cho phép | Sổ việc 4 |
| 28/08/2026 | **Đ25** — hai bộ canh QUY TẮC 2 và QUY TẮC 4 nay nhìn cả `public/js/ui.js` và `public/js/app.js` (trước chỉ quét `public/js/views`, nên hai tệp cả app dựa vào nằm ngoài tầm) | Sổ việc 10 |
| 28/08/2026 | **Đ26** — hai phép kiểm "chạy khi mất mạng" của `test:pwa` thôi luôn xanh: thay bằng phép kiểm đọc thẳng nội dung cache, và ghi rõ chỗ `setOffline` của Playwright không kiểm được | Sổ việc 9 |
| 28/08/2026 | **Đ27** — phiếu thử điện thoại thêm **Lời hứa 2b**: mở lại app trong lúc VẪN đang mất sóng (bản trước kết luận nhầm rằng chỗ đó chỉ hỏng khi thiếu HTTPS) | Sổ việc 22 |
| 28/08/2026 | **Đ28** — Nhật ký ngày cất phần cô gõ dở vào máy theo (nhóm, ngày); mở lại app thì HỎI cô có điền lại không, không tự điền đè lên phần cô khác vừa lưu | Sổ việc 38 |
| 28/08/2026 | **Đ29** — quy định "đổi `public/` thì tăng `VERSION`" nay canh bằng máy ở ba chỗ; đối chiếu lịch sử thấy Đ14 và Đ19 đã quên thật | Sổ việc 65, 72 |
| 28/08/2026 | **Đ30** — ngoại lệ của bộ canh QUY TẮC 4 thôi chừa cả tệp (chừa đúng dòng, và có phép kiểm canh chính ngoại lệ); QUY TẮC 2 quét thêm `.sql` và `.json` | Sổ việc 61, 63 |
| 28/08/2026 | **Đ31** — bộ canh mới: **mọi phân hệ trong thư mục đều phải nạp được**, không cái nào mang cờ lỗi. Hai tài liệu máy chủ của app 1 nay chỉ thẳng sang `docs/TRIEN-KHAI.md` và đúng thư mục dữ liệu của app 2 | Sổ việc 67, 87 |
| 28/08/2026 | **Đ32** — nhập lại dữ liệu lõi nay dọn theo cả ghi chép của phân hệ; trước đó nhật ký và quan sát của bé vừa bị xoá vẫn nằm lại trong máy | Sổ việc 85 |
| 28/08/2026 | **Đ33** — hai chỗ bài canh im lặng biến mất khi không dựng được tình huống nay tính là ĐỎ; thêm `test:bai-canh-that` canh chính bộ kiểm thử | Sổ việc 56, 69 |
| 28/08/2026 | **Đ34** — tách phần API của bộ album ra `test:album-api` và đưa vào `npm test`; trước đó sửa `routes/albums.js` rồi chạy `npm test` là mọi chốt chống tệp giả danh ảnh đều không chạy | Sổ việc 64 |
| 28/08/2026 | **Đ35** — sĩ số báo ăn nay neo vào hình dáng dữ liệu mẫu (trước chỉ so hai trường của cùng một câu trả lời); tầng chức vụ thử thêm vai Văn phòng cơ sở | Sổ việc 68, 70 |
