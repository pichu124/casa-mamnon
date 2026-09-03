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
| `routes/reports.js` | 9 dòng | kiểm điểm 0–10 |
| `public/js/views/reports.js` | 6 dòng | ô nhập điểm từng môn |
| | **27 dòng** | tổng, tính tới 30/08/2026 |

**Con số này đã tăng một lần — và đó không phải bánh cóc hỏng.** Lúc mới ghi,
món nợ là **17**; hai tệp Học bạ nhảy 4 → 9 và 1 → 6 ở Đ6 (`452cd38`), khi bộ
canh được thêm dấu hiệu thứ năm bắt theo **tên trường dữ liệu** (`score`,
`diem`, `hocLuc`) chứ không theo lời văn. Mã nguồn không đổi một dòng; chỉ là
mắt của bộ canh sáng hơn nên nhìn thấy phần vẫn luôn ở đó. Bánh cóc cấm **mã
nguồn** vi phạm thêm, không cấm **bộ canh** nhìn thấy rõ hơn — hai việc khác
nhau, và lần nào con số đi lên vì lý do thứ hai thì phải ghi lại đúng như ở đây,
kẻo người sau đọc thấy số tăng lại tưởng có ai đó đã nới bộ canh ra.

Thêm một chỗ vi phạm **mới** ở bất cứ đâu → đỏ ngay. Món nợ thành con số máy
đếm được, không còn là một dòng ghi chú người ta quên.

**27 là con số cuối, không phải con số tạm.** Bản đầu viết "gỡ xong N3 thì hạ về
0"; nhà trường đã quyết **giữ lại mã** hai màn đó (N3, 30/08) vì chưa chắc sẽ
không dùng lại. Nên bánh cóc này sống chung với 27 dòng nợ lâu dài, và đó vẫn là
cách đúng: nó không đòi mã sạch, nó đòi mã **không bẩn thêm**.

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

> **Đo lại ngày 30/08/2026, sau đợt Đ85.** Con số này rơi rớt rất nhanh — mỗi đợt thêm bài là
> lệch, và bảng này đã lệch thật một lần (ghi 2546 trong khi số đo lại là
> 2615). Đếm lại bằng chính hai lệnh dưới, đừng tin bảng nếu commit gần nhất
> có đụng vào `test/`:
>
> ```bash
> npm test              | grep -E "PASS: " | awk '{s+=$3} END {print s}'
> npm run test:giao-dien | grep -E "PASS: " | awk '{s+=$3} END {print s}'
> ```
>
> **Lệnh này từng đếm thiếu 69 bài, suốt nhiều tháng.** `test/api.test.mjs` in
> tổng kết ở dạng cụt `PASS: 69  FAIL: 0` — không có hai đầu `=====` như mọi
> bài khác — nên `$3` rơi vào chữ "FAIL" và cộng vào 0. Đ57 sửa dạng in của bài
> đó; con số dưới đây là con số ĐÚNG, và nó cao hơn bảng cũ đúng 69 bài cộng
> với phần mới của đợt này. Bài học: một lệnh đếm im lặng bỏ sót thì đáng ngờ
> hơn một lệnh đếm báo lỗi.

| Bộ | Số bài |
|---|---|
| `npm test` (không cần trình duyệt, ~12 phút) | **3919**, FAIL 0 (đo 03/09, sau Đ124) |
| `npm run test:giao-dien` (cần Playwright, chạy trên Chromium thật) | **560**, FAIL 0 (đo 03/09, sau Đ124 — đụng `public/` nên chạy lại đủ bộ) |

Bốn bộ lớn nhất, và việc chúng canh:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:lo-hong` | 291 | Mọi lỗ hổng đã vá — **bất khả xâm phạm** |
| `test:khe-uoc` | 173 | Hình dạng của các tệp dùng chung, và **không ai được chép lại** hàm nén ảnh |
| `test:co-lap-loi` | 102 | Nguyên tắc số 1 — phá hỏng từng thứ rồi kiểm app vẫn đăng nhập được |
| `test:nhom-lop` | 119 | Nhiều cô một nhóm (G0.4 · G0.5 · N8), và cửa sổ tin nhắn (Đ77 · Đ79) |

Các bộ **mới của app 2**, không có ở app 1:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:nhom-lop` | 93 | Mô hình nhiều cô một nhóm, và script chữa cháy phân công |
| `test:thuchup` | 69 | Phép thử ghi nhanh + ranh giới nháp của cô (lớp dữ liệu 1) |
| `test:sao-luu` | 68 | Vòng sao lưu → hỏng → khôi phục, chạy thật trên dữ liệu tạm — kể cả **byte của một tấm ảnh** |
| `test:goi-ten` | 56 | App nói tiếng của trường mầm non, tên app, và cách nói tuổi bé |
| `test:co-so` | 39 | Cách ly dữ liệu giữa ba cơ sở (Cấp 1 ↔ Cấp 3) |
| `test:bao-cao-hoc-tap` | 62 | Báo cáo CASA: ranh giới nháp ↔ đã gửi, năm mức không trôi, kế hoạch chỉ MỜI chữ sang |
| `test:diem-danh-anh` | 37 | Ảnh "con tới lớp" chỉ đi tới nhà mình, và bảng rà soát sau 9 giờ trừ bé đã có đơn nghỉ |
| `test:thuc-don-co-so` | 30 | Ba cơ sở nấu riêng bếp mà KHÔNG đè lên nhau, và thực đơn cũ không mất |
| `test:video-album` | 22 | Video đi qua ĐÚNG luật đồng ý như ảnh, và trần dung lượng chặn thật |
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

**Chín** tệp của `test:giao-dien`, và tệp nào là **mới của app 2** (so với điểm
tách `bc9dfa3` ngày 21/08). Bảng này trước đây ghi "bảy tệp" và bỏ sót hai bộ —
`bien-soan-phan-he` và `chi-tieu` — cùng vài con số đã cũ; sửa lại ngày 31/08:

| Bộ | Bài | Mới? | Canh gì |
|---|---|---|---|
| `test:man-phan-he` | 154 | **mới** | Chín màn phân hệ mầm non dựng lên được, không màn nào trắng; **nháp Nhật ký ngày sống qua một lần app bị đóng**; và mục **[1b]** chạy lại mọi màn của cô bằng **tài khoản cô thứ hai** — cô KHÔNG phụ trách nhóm đứng đầu danh sách (Đ94) |
| `test:bien-soan-gd` | 112 | kế thừa | Cô soạn thật trên Chromium: điểm danh, thực đơn, đơn nghỉ, hồ sơ bé |
| `bien-soan-phan-he` | 78 | **mới** | Bài học B9: một vòng ghi THẬT đi hết chín phân hệ mầm non, cô ghi rồi gia đình đọc lại được |
| `test:pwa` | 58 | kế thừa | Cài được lên màn hình chính, service worker, icon, và **mọi tệp cần để mở app lúc mất mạng đều nằm sẵn trong cache** |
| `test:nhieu-nhom` | 46 | **mới** | Cô dạy hai nhóm mở được cả hai; quản trị biết mình đang xem bé nào |
| `tinh-nang-giao-dien` | 27 | kế thừa | Bật/tắt phân hệ trên màn Quản trị |
| `test:chi-tieu` | 15 | **mới** | Đo thật: cô ghi nhật ký cả nhóm trong bao lâu |
| `test:ngoai-tuyen` | 15 | **mới** | Mất mạng: app vẫn mở, vẫn ghi được, sóng về thì hàng đợi tự bay đi |
| `test:album` | 12 | kế thừa | Cô chọn ảnh và đăng album trên Chromium thật; đường nén ảnh dùng chung đi qua đây |

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
| N1 | Bộ tài liệu triển khai vẫn mô tả **máy chủ của app 1** | **🟢 phần QUY TRÌNH đã xong** (Đ85). `docs/TRIEN-KHAI.md` nay viết sẵn **cả hai kịch bản** — [A] VPS Việt Nam và [B] Render — mỗi cái một runbook đầy đủ, kèm lời dặn **xoá hẳn nửa không dùng** sau khi chốt. Lý lẽ: chỉ có đúng hai kịch bản, cả hai đều biết trước được; chờ tới lúc chốt mới viết là bắt nhà trường chờ thêm một buổi ở đúng lúc họ muốn đi nhanh nhất. **Còn chờ N7 thật sự:** tên miền, địa chỉ IP, chứng chỉ HTTPS cụ thể. **03/09 (Đ123):** thêm `docs/MAY-CHU-THU-ORACLE-APP2.md` — chạy bản thử app 2 trên máy Oracle đã dựng cho app 1 (dữ liệu mẫu), từng bước đối chiếu với nhật ký dựng máy cũ | Phần còn lại sau N7 |
| ~~N2~~ | ~~`android/`, `capacitor.config.json` là vỏ đóng gói của app 1~~ | **✅ xong** — gỡ 7,9 MB / 77 tệp, cùng `scripts/prepare-mobile.js` và 4 gói `@capacitor/*`. **Giữ `render.yaml`**: nó đang mang lời cảnh báo về vòng kẹt triển khai lần đầu (N13). Bài canh cũ *"bản Android khớp đúng bản web"* tự bỏ qua khi thiếu thư mục — tức luôn xanh đúng lúc hết việc — nay đổi thành **"KHÔNG được có bản thứ hai"** | 27/08/2026 |
| N3 | Hai phân hệ **xếp hạng trẻ**: Nề nếp và Báo cáo | **🟢 chốt ở bước 1/2** — nhà trường quyết **TẮT SẴN** cả hai (27/08). Màn hình biến mất, API trả 404, **dữ liệu giữ nguyên**, bật lại bằng một lượt bấm. **Bước 2 (xóa hẳn mã) — nhà trường đã cân nhắc và quyết ĐỂ NGUYÊN (30/08):** *"chưa chắc"* sẽ không dùng lại hai màn đó, nên giữ mã lại để bật lại được bằng một lượt bấm, thay vì phải nhờ người viết lại. Đổi lại, món nợ **27 dòng** của `test:quy-tac-4` **ở nguyên chứ không về 0** — bài canh đó soi **mã nguồn** chứ không soi trạng thái bật/tắt, nên chừng nào hai tệp còn nằm trong kho thì con số còn đó. Đây là **cái giá đã biết trước và chấp nhận**, không phải việc còn sót. Bánh cóc vẫn làm đúng phần việc của nó: 27 chỉ được giảm, thêm một chỗ vi phạm mới ở bất cứ đâu là đỏ ngay. **Hai phân hệ cùng nhóm được GIỮ LẠI, khác với ghi chép ban đầu:** *"Năm học trước"* phục vụ đúng nhu cầu mầm non (phụ huynh xem lại album, thông báo của nhóm con từng học), *"Hồ sơ con đã ra trường"* đúng ý tưởng, chỉ cần đổi từ vựng. **Nhà trường xác nhận lại 30/08:** *"Nề nếp này tạm bỏ qua đi, k cần đến hiện tại"*. Riêng **Báo cáo thì trường CÓ cần** — nhưng là báo cáo kiểu CASA (tháng / 6 tháng / Cambridge), không phải học bạ điểm số của app 1, nên đó là phân hệ **viết mới**, không phải bật lại phân hệ cũ | Chốt 30/08 |
| ~~N4~~ | ~~Chưa có tầng **cơ sở** và vai **quản lý cơ sở**~~ | **✅ xong 27/08** — đi đủ **ba bước ba commit** như G0.4. Cấp 1 (toàn hệ thống) và Cấp 3 (một cơ sở) phân biệt bằng bảng `user_campus`, **không đụng cột `role`** — nhờ vậy mọi tài khoản quản trị đang có giữ nguyên quyền. Cô và phụ huynh không bị đụng tới: quyền của cô đi theo nhóm lớp, của phụ huynh đi theo con, cả hai đã chặt hơn cơ sở. `test:co-so` 36 bài. **Cấp 2 (HR / Marketing / Kế toán) chưa làm** — xem mục yêu cầu mới bên dưới | 27/08/2026 |
| N5 | `DATA_DIR` mặc định là `./data` nằm trong kho mã | **✅ đã canh bằng máy** — chạy `NODE_ENV=production` với dữ liệu trong kho mã thì máy chủ **DỪNG trước khi mở cổng**, không chỉ nhắc vào log. Mặc định vẫn là `./data` cho lúc chạy thử | 26/08/2026 |
| N6 | Bài test canh QUY TẮC 4 | **✅ có rồi** — `test/quy-tac-4.test.mjs`, kiểu **bánh cóc**: món nợ N3 (**27 dòng**) chỉ được giảm. Nhà trường đã chốt **giữ lại mã** hai màn đó (N3, 30/08), nên 27 nằm yên chứ không về 0 — bánh cóc vẫn chặn mọi chỗ vi phạm **mới** | 26/08/2026 |
| N7 | Chưa đăng ký VPS Việt Nam + tên miền đứng tên trường | Việc của nhà trường; chặn phần triển khai | Nhà trường làm |
| ~~N8~~ | ~~`sua-quyen-chu-nhiem.js` chỉ dọn được cái gương~~ | **✅ xong** — và hoá ra nguy hiểm hơn tôi ghi lúc đầu, xem mục bên dưới | 26/08/2026 |
| ~~N9~~ | ~~Giao diện nói tiếng tiểu học~~ | **✅ xong** — xem mục "Đổi cách gọi tên" bên dưới | 26/08/2026 |
| ~~N10~~ | ~~Chưa có bài test canh cách gọi tên~~ | **✅ xong** — `test/goi-ten.test.mjs`, 10 bài | 26/08/2026 |
| ~~N11~~ | ~~Ô "Khối cuối cấp" là ô điều khiển chết~~ | **✅ xong** — máy chủ trả thêm cờ `theoBac`, màn hình giấu hẳn ô đó khi mọi nhóm đi theo bậc | 26/08/2026 |
| N13 | **Lần triển khai đầu tiên lên Render là một vòng kẹt** | **🟡 đã viết đường ra** (Đ85) — `docs/TRIEN-KHAI.md` kịch bản [B] ghi đủ bốn bước, trong đó bước 2 dùng Render Job gắn cùng ổ đĩa để chạy `create-admin` một lần trước khi deploy. **Vẫn chưa ai chạy thử bước đó**, và tài liệu nói thẳng điều này. Vá bằng mã vẫn chờ N7 | Thử trước khi hẹn với trường |
| N14 | `docs/` vẫn ghi `/var/lib/schoolconnect`, `scripts/` nay ghi `/var/lib/casa-mamnon` | **✅ xong** (Đ85). Đã sửa đường dẫn trong `docs/SAO-LUU.md` và `docs/CAP-NHAT-MAY-CHU.md`, giữ nguyên cờ "chưa cập nhật cho app 2" cho phần còn lại. Lý lẽ đảo lại so với ghi chú cũ: một đường dẫn sai KHÔNG gây lỗi — nó làm script mở một CSDL TRỐNG rồi báo "mọi thứ đều sạch", và người ta về nhà tin rằng trường đang được sao lưu. Trấn an sai tệ hơn báo lỗi, nên đường dẫn phải sửa TRƯỚC, không chờ N1 | — |
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
| ~~N17~~ | ~~Ba cơ sở nấu bếp chung hay riêng?~~ | **✅ xong 30/08 — nhà trường đã trả lời.** Điểm 1 của đợt yêu cầu 30/08 nói rõ: *"Ba cơ sở nấu riêng bếp, mỗi cơ sở có 1 thực đơn riêng"*. Làm ở **Đ90** (khai cột JSON cho bảng mới, tệp dùng chung, commit riêng) và **Đ91** (bảng `menu_campus` khoá theo `(campusId, date)`, `test:thuc-don-co-so` 30 bài). Đúng thứ tự mà dòng cũ đòi: **thêm bảng theo cơ sở TRƯỚC**, rồi mới mở đường ra — nên không có ngày nào người sửa sau ghi đè người sửa trước | 30/08/2026 |
| **T7** | **Biểu phí — nhà trường nói "chưa xây thì để ở cấp 1", nhưng chỗ đó chưa ghi vào bảng nào** | Điểm 7 của đợt 30/08: *"Nhà trường đã có 3 BP rồi, nếu hiện tại chưa xây dựng phần biểu phí thì có thể để ở cấp 1 luôn, nhưng giới hạn phân quyền xem từng mảng."* Vế sau **đã làm** ở GĐ2‑E (tầng chức vụ, `test:chuc-vu`). Vế trước thì đúng như trường nói — **chưa xây biểu phí**, và Học phí hiện chỉ mở cho Cấp 1 và *Kế toán*. Ghi dòng này để quyết định ấy **không rơi khỏi trí nhớ**: ngày trường muốn có biểu phí thật (bảng giá theo nhóm tuổi, theo cơ sở, theo suất ăn), đó là một đợt việc riêng chứ không phải một ô nhập thêm vào màn Học phí. **Cần hỏi trường trước khi làm:** biểu phí có khác nhau giữa ba cơ sở không, và *Kế toán* được sửa hay chỉ được đọc | **Chờ nhà trường** |
| ~~N16~~ | ~~Nhà trường xin **số CCCD của phụ huynh**, A3 mới làm **số định danh của bé**~~ | **✅ xong 27/08** — bảng phụ `user_profile`, **không `ALTER` bảng `users`**. Lý do thứ hai của bảng phụ mới là lý do chính: `publicUser()` chỉ gạt `passwordHash`, mọi cột khác của `users` đi thẳng tới ai xem được hồ sơ bé — thêm `soCccd` thành một cột là gửi số của bố cho mẹ và cho cô ngay, không ai phải viết sai thêm dòng nào. **Ranh giới khác số định danh của bé**: quản trị đọc được, **chính người đó** đọc được, còn cô và **người phối ngẫu** thì không — bố mẹ ly hôn là chuyện có thật, app không được là nơi một bên lấy số giấy tờ của bên kia. Đường ghi là `PUT /api/admin/parents/:id/cccd` **riêng**, không nhét vào đường của bé: một phụ huynh có hai con thì sửa ở đâu cũng phải ra cùng một bản ghi. `test:cccd-phu-huynh` 22 bài | 27/08/2026 |
| **A2** | Nhà trường không dùng **Nhận xét hàng ngày** và **Xe buýt** | **✅ xong 27/08** — tắt sẵn, dữ liệu giữ nguyên, bật lại được. Cùng cách với N3. Chỗ của Nhận xét hàng ngày ở app 2 do **Ghi nhanh** thay, mà Ghi nhanh làm việc khác hẳn: cô mô tả điều **đã thấy**, không phán xét (QUY TẮC 1) | 27/08/2026 |
| **A3** | Hồ sơ bé thiếu ba thứ văn phòng cần: **số định danh cá nhân**, **tiền sử bệnh**, **người liên hệ khẩn cấp** | **✅ xong 27/08** — ba bảng phụ `CREATE ... IF NOT EXISTS`, **không `ALTER` bảng lõi**. Số định danh là dữ liệu cá nhân theo NĐ 13/2023 nên **cắt ở máy chủ**, chỉ quản trị nhận được — cô và phụ huynh gọi thẳng đường dẫn cũng không thấy. Ô *"Dị ứng"* đời cũ **không bị xóa**: `tienSuBenh` để trống thì lùi về đọc nó, trường đã nhập cho 300 bé không phải nhập lại. Không gửi một trường lên = **không đụng tới**, khác hẳn xóa trắng — nhờ vậy màn hình cũ lưu hồ sơ không làm bay số định danh và số gọi khẩn cấp. `test:ho-so-be` 22 bài | 27/08/2026 |
| **A4** | Hồ sơ bé hiện **số điện thoại riêng của cô** | **✅ xong 27/08** — thay bằng **hotline văn phòng của đúng cơ sở** bé đang học (lùi về số của trường nếu chưa khai cơ sở). Lý do nhà trường đưa ra rất thực tế: cô đang đứng nhóm với 20 bé thì không cầm điện thoại, văn phòng thì luôn có người nghe. Đi kèm A4: hồ sơ bé hiện **tuổi tính theo ngày sinh**, dưới một tuổi thì đếm bằng tháng | 27/08/2026 |
| **A5** | Dặn thuốc bắt cô gõ tay từng dòng *"đã cho con uống"* | **✅ xong 27/08** — nhà trường chạy thử quy trình nhận thuốc thật rồi chốt bỏ hẳn bước đó, app chỉ ghi **"cô đã nhận thuốc"**. Lý do không phải cho gọn màn hình: cô đang đứng nhóm với 20 bé thì không rảnh tay gõ, ô nào cô không kịp ghi sẽ nằm trống, mà một khoảng trống trên màn hình phụ huynh đọc ra thành *"cô quên cho con uống"*. App chỉ nên hứa thứ nó biết chắc. **Dòng nhật ký cũ vẫn hiện nguyên** và đường `/api/medicine/:id/log` cố ý còn sống (điện thoại còn giữ bản app cũ vẫn gọi được) — xóa hẳn để sau, cùng cách với N3. `test:dan-thuoc` 21 bài | 27/08/2026 |
| **A6** | Văn phòng phải gõ tay lại danh sách bé từ màn hình để làm báo cáo | **✅ xong 27/08** — nút **Xuất ra Excel** ở Quản trị → Tổng quan, tải về tệp CSV có dấu BOM (Excel trên Windows mở thẳng, không lỗi phông tiếng Việt). Đủ cột cho báo cáo: mã, họ tên, ngày sinh, **tuổi tính theo ngày sinh** (dưới một tuổi đếm bằng tháng), nhóm lớp, cơ sở, số định danh, tiền sử bệnh, bố/mẹ, người liên hệ khẩn cấp. **Tệp này chặt hơn màn hình nó đứng cạnh, và đó là chủ ý** — nó đi ra khỏi app nên chỉ xuất bé trong phạm vi cơ sở của người bấm, ghi lại mỗi lần xuất vào Nhật ký, và vô hiệu hoá ô bắt đầu bằng `=` `+` `-` `@` (Excel coi ô như vậy là công thức và **chạy** nó — họ tên do người nhập gõ). `test:xuat-danh-sach` 34 bài | 27/08/2026 |
| ~~N12~~ | ~~Phân hệ vẫn tên là "Thời khóa biểu" trong khi ruột đã là lịch sinh hoạt một ngày~~ | **✅ xong** — nhà trường chốt đổi thành **"Lịch sinh hoạt"**, và bỏ luôn chữ *"tiết"* bên trong ("Thứ 2 — hoạt động từng mốc"). Thêm hai từ vào `test:goi-ten` để tên cũ không trôi ngược; biểu thức tự chừa *"chi tiết"*, *"tiết kiệm"*, *"tiết mục"* thay vì mở ngoại lệ — ngoại lệ chừa CẢ DÒNG, dễ chừa lây chữ sai nằm cạnh | 27/08/2026 |

---


## 🔴 GITHUB ACTIONS KHÔNG CHẠY TỪ 28/08 — cần người dùng xử lý

`CLAUDE.md` ghi lớp canh trên GitHub là lớp **không bỏ qua được**:

| Chạy ở đâu | Bỏ qua được không |
|---|---|
| móc `.githooks/commit-msg` | **có**, bằng `git commit --no-verify` |
| GitHub mỗi lần push | **không** |

Thực tế thì lớp đó **đã không chạy một lần nào kể từ 28/08/2026**.

**Đo được, không phải phỏng đoán** (qua GitHub API, xếp mọi lần chạy theo thời gian):

| Khoảng | Số lần chạy | Thời lượng | Kết quả |
|---|---|---|---|
| tới **28/08 04:08** | 30 | ~210–230 giây | 28 xanh, 2 đỏ thật (đỏ vì bài test, chạy 953 giây) |
| từ **28/08 22:24** trở đi | 30 | **3–6 giây** | **0 xanh** |

Cả 5 job đều "hỏng" sau 2–4 giây và **không tải được nhật ký nào** (HTTP 404).
Một job chạy thật thì riêng bước `actions/checkout` đã lâu hơn thế. Nghĩa là
**không bước nào được thực thi**, kể cả checkout — đây không phải mã sai.

**Đã loại trừ:**
- Tệp `.github/workflows/kiem-tra.yml` vẫn hợp lệ: GitHub tạo đủ 5 job đúng tên,
  kể cả job `sw-version` mà nhánh này thêm vào (Đ29).
- Không phải do nhánh: 4 job còn lại y hệt bản trên `main` — bản chạy tốt.
- Workflow đang ở trạng thái `active`.

**Nguyên nhân gần như chắc chắn nằm ở tài khoản/kho, không nằm ở mã**: hết hạn
mức phút Actions (kho riêng tư), hoặc Actions bị tắt/hạn chế ở cấp tài khoản.
Phiên làm việc này **không nhìn được phần thanh toán của GitHub** nên không xác
nhận được nốt.

**Hệ quả:** khoảng 50 commit gần nhất chưa từng đi qua lớp canh cuối. Ở máy này
tôi vẫn chạy đủ `npm test`, `npm run test:giao-dien` và cả ba bộ canh khoảng
trước mỗi lần đẩy, nên **mã vẫn được kiểm** — nhưng đúng lớp mà tệp quy định gọi
là "không bỏ qua được" thì đang không chạy, và nếu người khác đẩy mã lên với
`--no-verify` thì hôm nay **không có gì chặn cả**.

**Việc của người dùng:** mở https://github.com/settings/billing (hoặc phần
Billing của tổ chức) xem hạn mức Actions, và kiểm tra Settings → Actions của kho
`pichu124/casa-mamnon`.

---

## Đợt soát nhiều tác nhân (30/08/2026) — 21 phát hiện đã qua thẩm định ngược

**Cách làm:** 8 tác nhân soát song song trên toàn kho theo 8 hướng khác nhau
(rò rỉ dữ liệu trẻ · mất dữ liệu · 5 QUY TẮC · bài canh rỗng · cô lập lỗi ·
tiếng Việt trên màn hình · đầu vào và quy mô · tài liệu nói sai). Mỗi phát hiện
nặng nhất của từng hướng bị **một tác nhân khác cố bác bỏ**, có đọc mã thật, dò
lớp bọc phía dưới, tra bài test đã có và tra tài liệu xem có phải chỗ cố ý hoãn
không.

**Kết quả:** 24 phát hiện đưa ra thẩm định → **21 đứng vững, 3 bị bác bỏ**.
Ba cái bị bác bỏ (đều là chỗ CỐ Ý, đã ghi tài liệu) không đưa vào đây.

**Đã vá trong đợt này:** Đ59 (rò rỉ album lớp cũ), Đ60 (ảnh Cambridge với
Marketing), Đ61 (hai lỗ ở đường phân công cô).

### ✅ ĐÃ VÁ HẾT — Đ59 tới Đ71 (30/08/2026)

Toàn bộ 21 phát hiện đã được vá. Bảng dưới giữ lại nguyên văn khiếm khuyết và
tình huống hỏng để người sau đọc được **vì sao** mỗi chốt tồn tại — đừng gỡ một
chốt nào ở đây mà chưa đọc dòng tương ứng.

Trong lúc vá, bộ canh vừa mở rộng còn bắt thêm **hai chỗ nữa** mà đợt soát chưa
nêu: `routes/attendance.js` đọc `leave_requests` và `routes/reports.js` đọc
`attendance`, cả hai đều không hỏi công tắc. Đã vá cùng Đ65.

| Mức | Chỗ nào | Khiếm khuyết | Tình huống hỏng |
|---|---|---|---|
| 🔴 cao | `scripts/restore.js`:260 | Khôi phục từ bản sao lưu để ở ổ ngoài thì TOÀN BỘ ảnh của trẻ không được mang về, và script vẫn báo "Đã khôi phục xong" | Ổ đĩa VPS hỏng (đúng kịch bản mà `backup.js` cảnh báo và khuyên chạy `--out`). Nhà trường dựng máy chủ mới, cắm ổ cứng ngoài, chạy `node scripts/restore.js /mnt/usb/casa-mamnon/school-20270115-0200.db.gz`. Script in 'Kiểm tra toàn vẹn: đạt', liệt kê đủ 300 bé, 25 nhóm, rồi 'Đã khôi phục xong'. Người |
| 🔴 cao | `modules/thuchup/view.js`:76 | Hàng đợi ngoại tuyến của Ghi nhanh tự XOÁ HẲN bài ghi của cô khi máy chủ trả 403, không báo một chữ nào | Cuối tháng 6, nhà trường bấm 'Chuyển năm học'. Chiều hôm trước cô Bích Ngọc đứng ở sân, sóng yếu, ghi nhanh 4 khoảnh khắc của nhóm Chồi 2 kèm ảnh — app báo 'Đã lưu trong 12 giây' và '4 bài ghi đang chờ gửi lên'. Sáng hôm sau cô mở app: nhóm Chồi 2 đã `active = 0`, `canAccessStudent` trả false, máy c |
| 🔴 cao | `modules/hanhtrinh/view.js`:399 | Nút "Lưu nháp" trên một câu chuyện ĐÃ công bố sửa thẳng màn hình gia đình và xoá được phần "Cùng con ở nhà" | Cô Mai Anh đã kể cho gia đình một câu chuyện về bé An. Hôm sau cô mở lại bằng nút "Sửa câu chuyện", xoá ô "Cùng con ở nhà" định viết lại sau, gõ dở nửa câu chuyện, rồi bấm "Lưu nháp" vì app hứa "gia đình chưa đọc được". Bản ghi vẫn đang công bố: tối đó mẹ bé An mở app thấy nửa câu dở dang, và phần " |
| 🟠 vừa | `routes/hocsinh-cu.js`:109 | Màn "Hồ sơ con đã ra trường" đọc thẳng bảng của Nhận xét và Báo cáo mà không hỏi công tắc — bật nó lên là hai phân hệ đã tắt quay lại màn hình gia đình | Nhà trường bật thử "Nhận xét" một học kỳ rồi tắt đi, đúng quy trình "bỏ tính năng" của CLAUDE.md (màn hình biến mất, API bị chặn, dữ liệu giữ nguyên). Cuối năm văn phòng bật "Hồ sơ con đã ra trường" để gia đình tải hồ sơ con vừa vào lớp 1. Phụ huynh mở màn đó và đọc lại nguyên sổ nhận xét cũ với ba  |
| 🔴 cao | `test/co-so.test.mjs`:106 | Phép kiểm "dặn thuốc / xin nghỉ không lọt bé của cơ sở khác" chạy trên một bé không có lấy một dòng dặn thuốc hay đơn nghỉ nào | Ai đó thêm một màn "Dặn thuốc toàn trường" cho ban giám hiệu và sửa `/api/medicine` đọc thẳng cả bảng khi `req.user.role === 'admin'`, quên `db.phamViCoSo`. Quản lý cơ sở 1 (Cấp 3) mở màn Dặn thuốc và đọc được tên thuốc, liều, ghi chú sức khoẻ của trẻ ở cơ sở 2 và 3 — đúng thứ `test:co-so` sinh ra đ |
| 🟠 vừa | `test/quyen-du-lieu-be.test.mjs`:107 | Hàm cắt thân hàm của bộ canh quyền gán nhãn "hàm canh" cho cả những hàm phụ trợ vô can, nên một đường mất chốt vẫn qua được | Một phiên làm việc sau thêm ô "tra hồ sơ bé đã ra trường theo nhóm" cho văn phòng, sửa `GET /api/hocsinh-cu` nhận `classId` từ trình duyệt và bỏ mệnh đề `sp.parentId = ?`. Một phụ huynh gõ tay `/api/hocsinh-cu?classId=c1` đọc được danh sách và học bạ của mọi bé từng học nhóm đó. `npm run test:quyen- |
| 🟠 vừa | `routes/namhoccu.js`:71 | Màn "Năm học trước" (bật sẵn cho mọi gia đình) đọc thẳng bảng của bốn phân hệ khác mà không hỏi công tắc — tắt một phân hệ không tắt được dữ liệu của nó | Nhà trường vào Quản trị → Tính năng tắt "Khảo sát" (hoặc "Kế hoạch giáo dục", "Lịch sinh hoạt", "Thông báo"). Ô vuông biến khỏi màn hình chính và `GET /api/surveys` trả 404 *"Phân hệ Khảo sát đang được nhà trường tắt"* — đúng như lời hứa. Nhưng phụ huynh bấm ô "Năm học trước" (vẫn còn đó, bật sẵn),  |
| 🟠 vừa | `server.js`:134 | Chốt `res.status(404)` ở đường /modules không chặn gì cả: routes.js, schema.sql và module.json của mọi phân hệ tải về được nguyên vẹn, kể cả khi chưa đăng nhập | Người ngoài, chưa đăng nhập, gõ `https://<tên miền của trường>/modules/dontra/routes.js` — nhận đủ mã máy chủ của phân hệ Đón trả bé: toàn bộ luật kiểm quyền, tên bảng, tên cột, các đường dẫn phụ chưa công bố. Tiếp `.../schema.sql` và `.../module.json` cho cả tám phân hệ. Trình duyệt hiện "404" nên  |
| 🔴 cao | `public/js/views/admin.js`:1093 | Màn Chuyển năm học bảo hiệu trưởng gõ lệnh `npm run backup` — người đang bấm nút không chạy được lệnh đó, và app không có đường nào khác để sao lưu | Cuối tháng 5, cô hiệu trưởng mở Quản trị → Năm học để chuyển sang năm học mới. Thẻ cảnh báo đỏ bảo "Hãy sao lưu dữ liệu trước bằng lệnh npm run backup" — chị không biết đó là gì, tìm khắp app không thấy nút sao lưu nào. Chị bấm tiếp; hộp thoại thứ hai hỏi 'bạn đã chạy "npm run backup" chưa?' và chỉ  |
| 🟠 vừa | `public/js/views/plans.js`:34 | Cô chưa được phân công nhóm mở Kế hoạch giáo dục thì nhận màn "Có lỗi xảy ra 😥 / Không tìm thấy nhóm lớp" — đổ lỗi cho một nhóm không tồn tại thay vì nói cô chưa có nhóm | (a) Quản trị vào Quản trị → Giáo viên → Thêm giáo viên, để ô "Phụ trách nhóm" ở "— Chưa phân công —" (chính màn hình mời làm vậy, `admin.js:993`, và `routes/admin.js:490` nhận `classId: classId ·· null`). Cô mới đăng nhập lần đầu, bấm ô "Kế hoạch giáo dục" → màn "Có lỗi xảy ra 😥 — Không tìm thấy nhó |
| 🟠 vừa | `public/js/views/dashboard.js`:34 | Trang chủ nói "Nhà trường chưa bật phân hệ nào" với tài khoản Nhân sự / Kế toán — vừa sai sự thật, vừa dùng chữ chỉ có trong mã nguồn | Ban giám hiệu vào Quản trị → Giáo viên, gán chức vụ "Kế toán" cho tài khoản chị kế toán (màn hình có sẵn ô chọn, `admin.js:243`). Chị đăng nhập: trang chủ trống trơn, chỉ một dòng "Nhà trường chưa bật phân hệ nào.", thanh dưới không còn Thông báo lẫn Nhắn tin. Chị gọi lên văn phòng báo "trường tắt h |
| 🔴 cao | `routes/leave.js`:82 | Đơn xin nghỉ không chặn độ dài khoảng ngày — gõ nhầm năm là bé bị cắt suất ăn cả năm và văn phòng được gợi ý hoàn 261 ngày tiền ăn | Mẹ bé An mở màn Xin nghỉ trên điện thoại, chọn ngày bắt đầu 07/09/2026 rồi khi chọn ngày kết thúc thì bánh xe năm nhảy sang 2027 (rất dễ xảy ra trên ô chọn ngày của Android). Máy chủ nhận đơn 366 ngày. Văn phòng mở đơn, thấy tên bé và lý do "Con bị sốt", ô tiền ăn đã điền sẵn 261, bấm **Duyệt đơn**. |
| 🟠 vừa | `routes/surveys.js`:45 | Màn Khảo sát nạp TOÀN BỘ câu trả lời của TOÀN BỘ khảo sát chỉ để hiện hai con số, và danh sách không có LIMIT | Tháng 5 năm thứ ba, văn phòng gửi khảo sát "Đăng ký học hè" và bấm gửi thông báo. Hàng trăm gia đình mở app trong vài phút, ai cũng vào tab Khảo sát. Mỗi lượt mở khiến máy chủ đọc và giải mã lại toàn bộ câu trả lời của mọi khảo sát ba năm qua — 135 ms CPU một lượt, nhân với số người đang mở, trên mộ |
| 🟠 vừa | `modules/dontra/routes.js`:226 | Trần "tối đa 12 người được đón" chỉ đếm dòng ĐANG dùng, nên vòng tạo → ngưng dùng lặp vô hạn, mỗi vòng ghi thêm một ảnh 6 MB vào ổ đĩa không bao giờ được xoá | Một tài khoản phụ huynh bị lộ mật khẩu (tên đăng nhập của phụ huynh sinh từ số điện thoại — chính routes/auth.js:22-24 ghi nhận là người ngoài đoán được). Người chiếm tài khoản chạy vòng POST /api/dontra/uyquyen kèm ảnh 6 MB rồi POST .../huy, khoảng 6 lượt mỗi giây. Sau một buổi tối, thư mục uploads |
| 🟠 vừa | `CLAUDE.md`:229 | CLAUDE.md hứa bộ canh VERSION "so với nhánh chính", nhưng job trên GitHub lại so với lần push trước — nhánh đã tăng VERSION một lần vẫn bị báo đỏ | Người sửa mã làm đúng theo CLAUDE.md: trên nhánh của mình tăng `VERSION` một lần ở commit đầu rồi push; commit sau đụng thêm `public/js/views/*.js` mà không tăng nữa rồi push lần hai. Móc `commit-msg` ở máy báo xanh (nó so với `main`), nhưng job "sw-version" trên GitHub — lớp mà CLAUDE.md nói "không |
| 🟠 vừa | `modules/README.md`:59 | modules/README.md nói `schema.sql` của phân hệ được dùng `CREATE TRIGGER IF NOT EXISTS`, nhưng bộ kiểm tra từ chối mọi trigger có thân lệnh | Người viết phân hệ mới đọc `modules/README.md`, thấy trigger được phép, viết `CREATE TRIGGER IF NOT EXISTS abc_dem AFTER INSERT ON abc_ghi BEGIN ... END;` đúng tiền tố mã phân hệ. Khởi động máy chủ: `napApiMoRong` bắt lỗi, đặt `m.loi`, phân hệ bị đánh dấu hỏng — ô của nó biến khỏi màn hình và `chanA |
| 🟠 vừa | `README.md`:4 | README.md — trang đầu của kho mã — ghi lứa tuổi "trẻ 2–6 tuổi", ngược với con số 12 tháng – 6 tuổi mà CLAUDE.md nói là quyết định nhiều thứ | Người tiếp quản mã (hoặc người viết phân hệ mới) đọc README trước, tin lứa tuổi nhỏ nhất là 24 tháng. Khi làm ô nhập ngày sinh hoặc bảng cân đo, họ đặt mốc chặn dưới ở 24 tháng và loại bé 14 tháng của nhóm Nhà trẻ 1 ra khỏi dữ liệu hợp lệ; hoặc khi đọc mã thấy `thang < 36 → "14 tháng"` và ô thay bỉm |

> **Mỗi dòng trên đã được một tác nhân độc lập cố bác bỏ và không bác nổi**, phần
> lớn có dựng lại trên máy chủ chạy thật. Nhưng chúng vẫn là *phát hiện*, không
> phải *bản vá đã thử*: đọc lại mã trước khi sửa, và giữ đúng nếp của kho —
> mỗi bản vá kèm một bài canh, và một **phép thử ngược** chứng minh bài canh có
> bắt được thật.

> **Bốn phát hiện đã bị cắt khỏi vòng thẩm định** vì mỗi hướng chỉ đưa 3 cái
> nặng nhất đi thẩm định (ghi rõ trong nhật ký chạy). **Đã moi nốt ở vòng hai
> ngay dưới đây.**

### Vòng thẩm định thứ hai — 6 phát hiện bị cắt, không cái nào bị bác bỏ

Sáu phát hiện bị cắt khỏi vòng một được đưa lại qua **12 tác nhân, mỗi phát hiện
hai người soát độc lập**, cùng một luật: đọc mã thật, dò lớp bọc phía dưới, tra
bài test đã có, tra tài liệu xem có phải chỗ cố ý hoãn không.

**Kết quả: 4 cả hai người xác nhận, 2 hai người đồng ý về SỰ VIỆC nhưng khác
nhau về mức hại, 0 bị bác bỏ.** Cả sáu đã vá — Đ72 tới Đ77.

| Mức | Chỗ nào | Khiếm khuyết | Vá ở |
|---|---|---|---|
| 🔴 cao | `modules/nhatky/routes.js` | Hai cô cùng phụ trách một nhóm cùng ghi nhật ký: cô bấm Lưu sau ghi đè trọn bản ghi bằng ảnh chụp màn hình CŨ của mình. Phần cô kia vừa ghi biến mất, im lặng, và máy chủ vẫn trả "Đã lưu" | **Đ72** |
| 🟠 vừa | `routes/hocsinh-cu.js` | Cô thu hồi một nhận xét bấm nhầm sang bé khác → màn Nhận xét sạch, nhưng màn "Hồ sơ con đã ra trường" vẫn hiện nguyên dòng đó cho gia đình. Là quyền xoá dữ liệu theo Nghị định 13/2023 | **Đ73** |
| 🟠 vừa | `test/co-so-quan-tri.test.mjs` | Phép quét "22 đường không đường nào rò dữ liệu cơ sở khác" có hai đường chưa từng quét gì: một vì phân hệ đang tắt, một vì **gõ nhầm đường dẫn** (`/api/attendance` không nhận `classId`) | **Đ74** |
| 🟠 vừa | `server.js` · `render.yaml` · `scripts/kiem-tra-may-chu.js` · `docs/PHEP-THU-DIEN-THOAI.md` | Bốn chỗ cảnh báo mật khẩu mẫu nói "8" và "9" tài khoản; thật ra là **13**. Người vận hành đổi 9 cái mình nhớ rồi tin là xong, còn 4 tài khoản vẫn "123456" trên máy chủ mở ra Internet | **Đ75** |
| 🟠 vừa | `public/js/views/timetable.js` | Nhãn "Đang học" treo lên trên dòng "Ngủ trưa" lúc 12h30; mốc trống gọi là "Nghỉ / tự học" (bé 18 tháng không tự học); và khung giờ mặc định là bảy tiết 35 phút **không có bữa trưa lẫn giấc ngủ trưa** | **Đ76** |
| 🟠 vừa | `routes/messages.js` | Mở một phòng chat kéo về MỌI tin nhắn, không giới hạn. Nhóm lớp là một hội thoại chung của cô và 20 gia đình, dùng hằng ngày — sau một năm học là hàng nghìn tin, trên máy Android rẻ tiền của trường | **Đ77** |

> **Hai chỗ "đồng ý về sự việc, khác nhau về mức hại"** là Đ74 và Đ76: một người
> xếp 🟠, người kia xếp 🟢. Không ai bác bỏ sự việc. Đã vá cả hai — một bài canh
> rỗng và một màn nói sai chuyện đang xảy ra với con thì rẻ hơn nhiều so với
> việc tranh luận tiếp về mức.

### Nợ nền chung sinh ra từ đợt này

Đợt Đ59–Đ77 sinh **bốn món nợ BẮT BUỘC** phải vá cả sang app 1, đã ghi vào Sổ nợ
của `docs/LOI-NEN-CHUNG.md` ở Đ78 — mỗi món có đối chiếu tận nơi tại điểm tách
`bc9dfa3`, không phỏng đoán:

| Món | Vì sao bắt buộc |
|---|---|
| **Đ62** `scripts/restore.js` ghi cứng thư mục ảnh | Loại 2. `backup.js` ngay cạnh CÓ `--out /mnt/usb`; sao lưu ra ổ ngoài rồi khôi phục thì cơ sở dữ liệu về đủ còn **ảnh thì không**. Ảnh là thứ duy nhất không dựng lại được. **Ưu tiên cao nhất** |
| **Đ59** `lib/lich-su-lop.js` không có hạn 12 tháng | Loại 1. Gia đình rời trường nhiều năm vẫn tải được **ảnh khuôn mặt cả lớp**, phần lớn các em vẫn đang học |
| **Đ66** `/modules` mở cho người chưa đăng nhập | Loại 1. App 1 có `modules/hocphi/` — ai cũng tải được `routes.js` và `schema.sql` của phần thu tiền |
| **Đ73** `routes/hocsinh-cu.js` không lọc nhận xét đã thu hồi | Loại 1 + Nghị định 13/2023. **Ở app 1 nặng hơn app 2**: app 2 đã tắt phân hệ Nhận xét từ A2, app 1 dùng nó hằng ngày cho ~300 gia đình |

Bốn món KHÔNG bắt buộc (Đ65, Đ67, Đ68, Đ77) và danh sách món **không áp dụng cho
app 1** cũng ghi ở đó. Đáng chú ý nhất trong danh sách sau: **Đ76 tuyệt đối
không được chép sang app 1** — ở trường tiểu học, "Nghỉ / tự học", "Đang học" và
khung bảy tiết 35 phút đều là chữ và khung ĐÚNG.

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
| 28/08/2026 | **Đ36** — đo bố cục điện thoại cho tám màn phân hệ với vai CÔ; tìm ra và vá lỗi thật: bốn ô nhập của Nhật ký ngày cao 21px, nhỏ hơn đầu ngón tay | Sổ việc 73 |
| 28/08/2026 | **Đ37** — đóng nhóm là cắt quyền cô ngay **dù nhóm đó vẫn còn bé**, nhưng bảng phân công không bị xoá; trước đó điều này chỉ nằm trong một dòng chú thích | Sổ việc 57 |
| 28/08/2026 | **Đ38** — vai **Cấp 3** lần đầu được mở trên trình duyệt thật: không lọt tên bé của cơ sở khác lên màn hình, không lọt vào ô chọn nhóm, và gọi thẳng API từ trong phiên cũng bị từ chối | Sổ việc 74 |
| 29/08/2026 | **Đ39** — bài học **B9** (*màn nào hiện dữ liệu thì phải tạo được qua giao diện*) lần đầu phủ **cả tám phân hệ mầm non**, đi đủ vòng mở màn → điền → lưu → thấy lại. Tìm ra và vá lỗi thật: ô *Chọn bé* của màn Học phí không có tác dụng, nên khoản thu văn phòng tạo ra rơi vào **nhà người khác** | Sổ việc 71 |
| 29/08/2026 | **Đ40** — bộ canh VERSION tự mở một lỗ ở chế độ `--khoang` (chế độ GitHub chạy): **một** commit có dòng `Khong-can-sw:` miễn kiểm tra cho **cả khoảng**. Nay đường thoát chỉ miễn cho tệp của chính commit đó | — |
| 29/08/2026 | **Đ41** — chỉ tiêu *nhật ký cả nhóm dưới 5 phút* lần đầu có phép đo: dựng nhóm **20 bé** rồi đo đúng ba đoạn máy chịu trách nhiệm (**dưới 1 giây**), và đo *một lần chạm lấp được bao nhiêu ô*. Phiếu thử máy thật thêm chỗ đo cho **hai chỉ tiêu còn lại**. Siết `modules/thuchup/routes.js`: số giây bịa không còn đầu độc bảng tổng kết cổng DỪNG GĐ 0 | Sổ việc 55 |
| 29/08/2026 | **Đ42** — **ghi sổ tiền là việc của văn phòng**: cô không còn tạo khoản thu và không còn xác nhận đã nhận tiền (tầng chức vụ đã đặt Kế toán lo học phí), nhưng vẫn ĐỌC được sổ của nhóm mình. Học phí có `test:hoc-phi` — phân hệ cuối cùng chưa có tệp kiểm thử riêng | Sổ việc 97 |
| 29/08/2026 | **Đ43** — **màn hình phân hệ sống qua một lần đổi phiên bản**: móc `activate` mang theo phần `/modules/` rồi mới xoá kho đệm cũ. Trước đó cô cập nhật app xong đi ra sân sóng yếu là không mở được đúng tám màn mầm non. Thêm `test:vo-app` — bài đầu tiên CHẠY MÃ THẬT của `public/sw.js` (hộp cát Node, không cần trình duyệt) | Sổ việc 99 |
| 29/08/2026 | **Đ44** — **quyền của gia đình với con đã rời trường nay có hạn thật**. Mốc 12 tháng trước chỉ nằm trong `routes/hocsinh-cu.js`, còn `db.canAccessStudent` nhánh phụ huynh trả `true` mãi mãi — gõ thẳng `/api/nhatky`, `/api/health`, `/api/medicine` là đọc được hồ sơ một đứa trẻ đã rời trường nhiều năm. Luật nay ở `lib/db.js`, một nguồn sự thật | Sổ việc 112 |
| 29/08/2026 | **Đ45** — `routes/hocsinh-cu.js` bỏ bản luật riêng, mượn lại luật của `lib/db.js`; và giữ được câu chỉ đường cho gia đình (*"liên hệ nhà trường nếu cần bản sao"*) mà bản vá Đ44 suýt làm mất | Sổ việc 112 |
| 29/08/2026 | **Đ46** — **Báo ăn nay hỏi công tắc trước khi đọc bảng của phân hệ khác**. Nó đọc thẳng `attendance`, `leave_requests`, `leave_refund` mà không hỏi Điểm danh và Xin phép còn bật không — nhà trường tắt Điểm danh xong màn báo ăn vẫn trừ suất theo một sổ không còn ai cập nhật, và **bếp nấu thiếu**. Cùng chỗ hở Y1 đã vá cho Thực đơn và N24 cho Ghi nhanh | Sổ việc 108 |
| 29/08/2026 | **Đ47** — bước *"đọc bảng của phân hệ khác thì hỏi công tắc trước"* nay có **máy canh** (`test:doc-cheo`) và được `modules/README.md` dạy hẳn hoi. Đây là bước đã bị quên **ba lần** (Y1, N24, Đ46); bộ canh mới thử ngược đúng lỗi Đ46 và bắt được | Sổ việc 93 |
| 29/08/2026 | **Đ48** — `GET /api/kehoachbe/be` là mặt API trả dữ liệu của trẻ mà **chưa màn hình nào gọi và chưa bài nào chạm**. Nay có 10 phép kiểm: ranh giới nhóm, ranh giới nhà, tầng cơ sở, và QUY TẮC 4. Số phận của nó (dựng màn hình hay gỡ) vẫn chờ nhà trường | Sổ việc 91 |
| 29/08/2026 | **Đ50** — mẹo nhận diện *"nền chung"* trong `docs/LOI-NEN-CHUNG.md` **ghi ngược**, và bảng chỉ có **13 tệp trong khi thực tế 28** — thiếu cả `server.js`, `lib/password.js`, `lib/importer.js`. Nay mẹo đúng chiều, bảng đủ, và `test:nen-chung` suy danh sách thẳng từ git nên không bỏ sót lại được | Sổ việc 102, 103 |
| 29/08/2026 | **Đ51** — có bản mới thì app **nói một câu**, và **tuyệt đối không tự tải lại**: cô có thể đang gõ dở nhật ký của hai mươi bé. Cả bộ máy VERSION trước đó chỉ lo cho bản mới TỚI ĐƯỢC máy cô, còn trang đang mở vẫn chạy mã cũ mà không ai báo | Sổ việc 98 |
| 29/08/2026 | **Đ52** — hai bộ canh nay **nhắc khi dòng thoát KHÔNG cần thiết**. Chính tôi đã dùng thừa hai lần (Đ39, Đ51): lời commit ghi lại một điều không đúng, và dùng đường thoát cho quen tay là bước đầu của việc dùng nó lúc thật sự đang vi phạm. Chỉ nhắc, không chặn | — |
| 29/08/2026 | **Đ53** — **QUY TẮC 3 lần đầu có bộ canh riêng**, dựng TRƯỚC khi kho mã có một dòng AI nào. `CLAUDE.md` nói năm QUY TẮC được canh bằng máy, nhưng chỉ QUY TẮC 2 và 4 có bộ canh; QUY TẮC 3 — thứ quyết định nhất khi AI tới ở GĐ 3 — không có gì. Bài canh cũng giữ **bốn điều kiện bật AI** của bản kế hoạch và canh bảng đồng ý **chưa** có ô AI, để không ai coi ô ② hay ③ là đã đủ | Sổ việc 134, 104 |
| 30/08/2026 | **Đ54** — **màn "không mở được" nói sai lý do với gia đình**. `/api/modules` lọc bằng BỐN điều kiện khác hẳn nhau — nhà trường tắt, ngoài vai trò, ngoài phần việc của chức vụ, phân hệ đang lỗi — rồi trả về đúng một danh sách, nên màn hình đoán một lý do duy nhất: *"phân hệ này hiện đang được nhà trường tắt"*. Câu đó **sai đúng vào trường hợp hay gặp nhất**: gia đình mở một địa chỉ chỉ dành cho trường. Nhà trường không tắt gì cả, còn phụ huynh thì gọi lên văn phòng hỏi vì sao trường tắt mất phần của mình. Nay có `viSaoKhongThay()` và `GET /api/modules/vi-sao/:view`; màn hình vẽ câu trung tính trước rồi mới hỏi máy chủ, nên **mất mạng vẫn không nói sai**. Hai bài test giao diện cũ bắt theo câu chữ cũ nên sẽ lặng lẽ xanh — đã sửa, và một bài được siết thêm để đòi ĐÚNG lý do | Báo cáo 4.1 #2 |
| 30/08/2026 | **Đ55** — **QUY TẮC 4 nay bắt được cách xếp trẻ ba bậc mà không gọi tên mình**. `UI.RATING` xếp bé thành *"Con làm rất tốt / Con làm tốt / Cần cố gắng thêm"* — đúng thứ QUY TẮC 4 cấm, nhưng không có chữ "điểm", "xếp hạng" hay "thi đua" nào nên **cả năm dấu hiệu cũ đều trượt**, kể cả sau khi vùng quét đã mở tới `public/js/ui.js`. Làm bằng một **bánh cóc THỨ HAI**, siết từ lúc sinh ra, thay vì ghi bốn tệp vào `NO_DA_BIET` — vì làm thế là bắt danh sách tệp DÀI RA, tức phải nới một bộ canh bất khả xâm phạm để bịt lỗ của chính nó. Bánh cóc cũ không bị chạm một dòng | Báo cáo 4.1 #1 |
| 30/08/2026 | **Đ56** — **hai ô chết trong hồ sơ sức khoẻ nay ghi được**. `vision` và `bmiNote` có sẵn trong `lib/schema.sql` và màn hình in ra từ lâu, nhưng không đường nào ghi — y tế khám xong không nhập được đúng thứ vừa đo. Chọn hướng CHO NHẬP, không chọn hướng bỏ hai ô (phần gỡ chưa duyệt, và nếu trường có dữ liệu cũ thì bỏ đi là mất chỗ cất). Kèm một phép kiểm QUY TẮC 4 + QUY TẮC 3: gửi chiều cao + cân nặng mà không gửi ô đánh giá thì ô đó phải **ở nguyên trống** — app không được tự xếp trẻ so với "chuẩn của độ tuổi" | Báo cáo 4.1 #5 |
| 30/08/2026 | **Đ57** — **Nhân sự thôi chạm được vào tài khoản của gia đình**. Mô tả chức vụ hứa họ "KHÔNG mở được hồ sơ bé, sức khoẻ, hay ảnh của trẻ", nhưng cấp lại mật khẩu cho một tài khoản phụ huynh là trao đúng ba thứ ấy, còn `/api/accounts/parents` thì trả kèm **tên các con** của từng nhà. Siết cả hai đường. Gia đình không bị bỏ giữa đường: cô của nhóm bé, ban giám hiệu và quản trị toàn hệ thống vẫn làm được, và mục [10] canh đúng ba đường đó. Cũng sửa dạng in tổng kết của `test/api.test.mjs` — **69 bài của nó chưa bao giờ được lệnh đếm trong tài liệu này cộng vào** | Báo cáo 4.1 #3 |
| 30/08/2026 | **Đ58** — `GET /api/kehoachbe/be`: **quyết định là GIỮ NGUYÊN, không dựng màn hình**. Màn nhóm đã trả kế hoạch của *mọi bé* trong nhóm rồi, nên một màn riêng cho từng bé là **thừa**. Cách đặt nó vào Hồ sơ bé thì phải để một tệp lõi (`public/js/views/student.js`) gọi vào một phân hệ cắm thêm — đảo ngược đúng chiều phụ thuộc mà `modules/README.md` dựng lên, và trong kho mã chưa có một tiền lệ nào như vậy. Đ48 đã bọc đường này bằng 10 phép kiểm nên **chừng nào còn sống thì còn kín**. Khuyến nghị của tôi là **gỡ hẳn**, nhưng gỡ thuộc phần chưa được duyệt | Báo cáo 4.1 #4 |
| 30/08/2026 | **Đối chiếu sổ nợ nền chung sau Đ54–Đ58**: không thêm món **bắt buộc** nào, nhưng thêm **hai món không bắt buộc đã đối chiếu tận nơi ở `bc9dfa3`** — app 1 **đang** nói sai câu "nhà trường tắt" với phụ huynh (`public/js/app.js` ở điểm tách có đúng câu đó, `lib/modules.js` ở điểm tách cũng đã lọc theo `roles`), và app 1 có y hệt **hai ô chết** trong hồ sơ sức khoẻ. Đ57 **không áp dụng** cho app 1: `lib/db.js` ở điểm tách chưa có `CHUC_VU`. Cũng đã **thử `add_repo` vào `pichu124/School` và bị chặn** — gắn thêm kho cần người dùng đồng ý | `docs/LOI-NEN-CHUNG.md` |
| 30/08/2026 | **Đ59** — **rò rỉ thật, đã dựng lại được**: mốc 12 tháng của Đ44 KHÔNG áp cho album lớp cũ và màn Năm học trước, vì `lsl.lopCuCuaPhuHuynh` chỉ hỏi quan hệ `student_parents` — mà quan hệ cha mẹ – con thì không bao giờ hết hạn. Gia đình rời trường 3 năm vẫn tải được **đúng các byte** ảnh khuôn mặt cả nhóm, phần lớn các bé trong ảnh vẫn đang học; cùng lúc màn "Hồ sơ con đã ra trường" trả 403 nên nhà trường tin là cửa đã đóng. Vá bằng cách **mượn lại `db.conHanXemHoSo`**, không viết bản luật thứ ba | Soát 30/08 #1 |
| 30/08/2026 | **Đ60** — ảnh **Cambridge** không đi qua luật đồng ý truyền thông: chốt duy nhất hỏi `role === 'parent'`, mà Marketing là `role === 'admin'`. Họ tải được ảnh của bé mà gia đình đã nói KHÔNG với ô ③ — đúng điều mô tả chức vụ hứa là không thể xảy ra. Ảnh Cambridge không gắn thẻ bé nên **mặc định không cho**, đường ra là ô "Ảnh không có mặt bé nào" đã có sẵn | Soát 30/08 #3 |
| 30/08/2026 | **Đ61** — hai lỗ ở đường phân công cô. **(a)** Tạo tài khoản cô mới kèm nhóm thì XOÁ SẠCH phân công của mọi cô đang dạy nhóm đó, im lặng — sáng hôm sau cô thấy "Nhóm chưa có bé nào". **(b)** Đường cũ `PUT /api/admin/classes/:id` phân công cô được mà không hỏi `chanNeuVanPhong`, lại không canh cơ sở của chính cô ấy nên quản lý cơ sở 1 gỡ được cô khỏi nhóm ở cơ sở 2 | Soát 30/08 #4, #2 |
| 30/08/2026 | **Đ62** — **khôi phục từ ổ ngoài KHÔNG mang ảnh của trẻ về**, mà vẫn in "Đã khôi phục xong". Đường khôi phục đóng cứng thư mục ảnh vào `DATA_DIR/backups` trong khi `backup.js` và hai tệp tài liệu đều dạy chạy `--out` ra ổ ngoài. Nay đi tìm ảnh theo TỆP BẢN SAO, thêm cờ `--anh`, và **nói ra khi không tìm thấy ảnh** | Soát 30/08 #5 |
| 30/08/2026 | **Đ63** — hàng đợi ngoại tuyến của Ghi nhanh **tự xoá hẳn bài của cô** khi máy chủ trả 403. Mẫu chữ cũ bắt cả `không thuộc` và `quyền` — mà lỗi quyền ở đây gần như luôn tạm thời (vừa đổi phân công, nhóm vừa đóng, phân hệ vừa tắt). Nay chỉ ảnh hỏng mới được bỏ, và cũng giữ lại dòng chữ | Soát 30/08 #6 |
| 30/08/2026 | **Đ64** — nút "Lưu nháp" trên câu chuyện **đã công bố** sửa thẳng màn hình gia đình, và **xoá trắng được "Cùng con ở nhà"** — đi vòng qua đúng QUY TẮC 5 mà đường `cong-bo` bắt buộc. Nay ép đúng hai điều kiện đó ở máy chủ; sửa lỗi chính tả thì vẫn được | Soát 30/08 #7 |
| 30/08/2026 | **Đ65** — bộ canh "đọc bảng phân hệ khác" (Đ47) **chỉ quét `modules/`**, không quét `routes/`. Mở rộng ra thì bắt được **bốn** chỗ: `hocsinh-cu` (2 phân hệ đang tắt sẵn), `namhoccu` (4 phân hệ, màn này bật sẵn cho mọi gia đình), `attendance` và `reports`. Bảng ánh xạ từ 5 lên 18 tên bảng | Soát 30/08 #8, #11 |
| 30/08/2026 | **Đ66** — `/modules` **gửi nguyên mã nguồn phân hệ ra ngoài**: chốt `res.status(404)` đặt trong `setHeaders` chạy TRƯỚC khi mở luồng tệp, nên chỉ đổi con số ở dòng đầu. Đo được **11.308 byte** `routes.js` thật, kèm cả `schema.sql` và `module.json`, kể cả khi chưa đăng nhập | Soát 30/08 #12 |
| 30/08/2026 | **Đ67** — đơn xin nghỉ **không có trần khoảng ngày**: gõ nhầm năm là bé bị cắt suất ăn cả năm và văn phòng nhận gợi ý hoàn hơn 200 ngày tiền ăn. Trần 60 ngày, lời từ chối chỉ thẳng ô năm | Soát 30/08 #16 |
| 30/08/2026 | **Đ68** — hai chỗ hỏng khi trường đông lên: Khảo sát nạp **toàn bộ phiếu của toàn bộ khảo sát** chỉ để lấy hai con số (nay hai câu tổng hợp + LIMIT); và trần "12 người được đón" chỉ đếm dòng đang dùng nên vòng tạo → ngưng dùng lặp vô hạn — đo được 30 vòng không gì chặn | Soát 30/08 #17, #18 |
| 30/08/2026 | **Đ69** — ba chỗ chữ trên màn hình: màn Chuyển năm học bảo hiệu trưởng **gõ `npm run backup`** (người bấm nút không chạy được lệnh đó, và app không có nút sao lưu nào); cô chưa có nhóm mở Kế hoạch/Lịch sinh hoạt thì nhận "Có lỗi xảy ra 😥" đổ lỗi cho một nhóm không tồn tại; trang chủ nói "Nhà trường chưa bật phân hệ nào" với Nhân sự/Kế toán — sai sự thật, và "phân hệ" là chữ chỉ có trong mã nguồn | Soát 30/08 #13, #14, #15 |
| 30/08/2026 | **Đ70** — hai bộ canh tự siết: mục cách ly cơ sở chạy trên một bé **không có lấy một dòng** dặn thuốc hay xin nghỉ nào (xanh vì chẳng có gì để lọt); và hàm cắt thân hàm của bộ canh quyền gán nhãn "hàm canh" cho cả hàm phụ trợ vô can. Sửa xong, bộ canh quyền lập tức bắt được một đường — kiểm lại thì đó là **báo nhầm**, nên dạy nó nhận thêm kiểu (b) viết thẳng bằng SQL | Soát 30/08 #9, #10 |
| 30/08/2026 | **Đ71** — ba chỗ tài liệu nói sai: job `sw-version` trên GitHub so với **lần push trước** trong khi `CLAUDE.md` hứa so với **nhánh chính** (nhánh đã tăng VERSION vẫn bị báo đỏ, người gặp sẽ tăng thêm lần nữa — mỗi lần là một lần xoá kho đệm của mọi điện thoại); `modules/README.md` nói dùng được `CREATE TRIGGER` trong khi bộ kiểm tra từ chối mọi trigger có thân lệnh; `README.md` — trang đầu kho mã — ghi lứa tuổi **2–6 tuổi** | Soát 30/08 #19, #20, #21 |
| 30/08/2026 | **Đ72** — **hai cô cùng ghi nhật ký một nhóm: người bấm Lưu sau xoá sạch phần người bấm trước.** Màn hình gửi lên mọi ô của mọi bé đang hiện, `lamSach` luôn trả đủ 13 cột, `db.update` ghi đè trọn bản ghi — nên cú lưu lúc 16h40 là ảnh chụp màn hình lúc 16h20 đè lên bản 16h25. Im lặng, và máy chủ vẫn trả "Đã lưu". `QUYET-DINH-TU-CHOT.md` mục 24 đã gọi đúng tên kiểu mất dữ liệu này nhưng chỉ bịt đường NHÁP. Nay màn gửi kèm dấu thời gian lúc nạp; bé nào bị người khác ghi đè thì **bỏ qua đúng bé đó và nói ra**, các bé khác vẫn lưu | Vòng thẩm định 2 |
| 30/08/2026 | **Đ73** — cô thu hồi một nhận xét bấm nhầm sang bé khác thì màn Nhận xét sạch, nhưng **màn "Hồ sơ con đã ra trường" vẫn hiện nguyên dòng đó cho gia đình** — vì `lib/sua-thu-hoi.js` ghi trạng thái ở bảng phụ, nên mọi `SELECT *` không lọc đều đọc ra dòng đã gỡ. Là quyền xoá dữ liệu theo Nghị định 13/2023, và là màn CHỈ gia đình mở | Vòng thẩm định 2 |
| 30/08/2026 | **Đ74** — phép quét "22 đường không đường nào rò dữ liệu cơ sở khác" có **hai đường chưa từng quét gì**: `GET /api/hocsinh-cu` trả 404 vì phân hệ tắt sẵn, và `GET /api/attendance?classId=` **gõ nhầm đường dẫn** (đường đó đòi `studentId`, trả 400 trước mọi chốt cơ sở). Nay tách hai nhóm với hai kỳ vọng, bật phân hệ tắt sẵn, và thêm vế khẳng định "phép quét phải nhìn thấy dữ liệu của chính cơ sở mình" | Vòng thẩm định 2 |
| 30/08/2026 | **Đ75** — bốn chỗ cảnh báo mật khẩu mẫu nói **8 và 9 tài khoản, thật ra là 13**. Người vận hành đổi 9 cái mình nhớ rồi tin là xong, còn 4 tài khoản vẫn "123456" trên máy chủ mở ra Internet. Chua hơn: `scripts/kiem-tra-may-chu.js` mở đầu bằng đúng bài học "một con số ghi cứng thì sai ngay từ lần sau" rồi ghi cứng con số này ba dòng dưới. Nay canh bằng máy, và đối chiếu thẳng với số tài khoản dữ liệu mẫu sinh ra | Vòng thẩm định 2 |
| 30/08/2026 | **Đ76** — màn Lịch sinh hoạt còn ba thứ của app 1: nhãn **"Đang học" treo lên trên dòng "Ngủ trưa"** lúc 12h30; mốc chưa xếp gọi là **"Nghỉ / tự học"** (bé 18 tháng không tự học, và "nghỉ" thì gia đình đọc ra là nhóm được nghỉ); và **khung giờ mặc định bảy tiết 35 phút** với một khoảng trống 10:15–14:00 không mốc nào nói tới — đúng chỗ bữa trưa và giấc ngủ trưa. Bộ canh đo khung bằng **số phút**, không bằng chữ | Vòng thẩm định 2 |
| 30/08/2026 | **Đ77** — mở một phòng chat kéo về **mọi tin nhắn, không giới hạn**. Nhóm lớp là một hội thoại chung của cô và 20 gia đình, dùng hằng ngày; sau một năm học là hàng nghìn tin, trên máy Android rẻ tiền của trường. Nay nạp cửa sổ tin mới nhất — cắt ở đầu MỚI, không phải đầu cũ — kèm đường `?truoc=` và nút "Xem tin cũ hơn", vì cắt bớt mà không mở đường đi ngược là biến một cái chậm thành một cái mất. Kèm gộp một chỗ N+1 ở màn danh sách | Vòng thẩm định 2 |
| 30/08/2026 | **Đ79** — đường `?after=` của Nhắn tin (màn hình gọi bốn giây một lần) cũng **không có trần**, và nó không có trần TỰ NHIÊN nào: mốc do màn hình gửi lên, nên tab để mở qua đêm rồi máy thức dậy là một lượt hỏi kéo về cả quãng ở giữa. Cắt ở đầu **CŨ** — đây là dòng chảy nối tiếp, bỏ khúc giữa là màn hình thủng một khoảng không lấy lại được | Tự thấy khi vá Đ77 |
| 30/08/2026 | **Đ78** — ghi **bốn món nợ nền chung BẮT BUỘC** của đợt Đ59–Đ77 vào Sổ nợ (Đ62 khôi phục từ ổ ngoài thì ảnh không về — **món nặng nhất trong sổ**; Đ59 album lớp cũ không có hạn 12 tháng; Đ66 `/modules` mở cho người chưa đăng nhập; Đ73 nhận xét đã thu hồi vẫn hiện). Cả bốn **đối chiếu tận nơi tại `bc9dfa3`**, kèm bốn món không bắt buộc và danh sách món KHÔNG áp dụng cho app 1 — trong đó Đ76 tuyệt đối không được chép sang, vì ở trường tiểu học cả ba chữ đó đều đúng | `LOI-NEN-CHUNG.md` |
| 30/08/2026 | **Đ82** — **TRẢ XONG bốn món nợ nền chung sang kho app 1** (`pichu124/School`), nhánh `claude/no-nen-chung-app2`. Đối chiếu tại chỗ xác nhận cả bốn có thật; ba con số đo được trên app 1: khôi phục từ ổ ngoài trả về **"không có thư mục uploads/"**; `/modules/hocphi/routes.js` trả **3142 byte** mã máy chủ cho người **chưa đăng nhập**; tài khoản có con rời trường 2 năm đọc được **5 đường** kèm nguyên sổ sức khoẻ, nhận xét, nề nếp, điểm danh, và album lớp cũ trả về **đúng byte của ảnh**. Luật 12 tháng đi **ba bước ba commit** vì `lib/db.js` là tệp dùng chung — và `test:lo-hong` của app 1 đỏ ngay khi thử làm gộp, đúng chỗ câu chỉ đường cho gia đình. `npm test` app 1: 932 → **1017**, FAIL 0. **Chưa gộp vào nhánh app 1 đang chạy** — chờ người dùng duyệt | Sổ nợ đã trả |
| 30/08/2026 | **Đ83** — `npm run ban-thu`: dựng bàn thử cho buổi thử điện thoại bằng **một lệnh**. Phiếu thử có sáu bước chuẩn bị và ba bước dễ bỏ sót nhất đều làm hỏng buổi thử theo một kiểu riêng — nặng nhất là chỉ bật MỘT phân hệ (phiếu ghi đúng "Ghi nhanh"), nên cô ngồi thử một app khác hẳn app trường sẽ dùng. Tôi tự làm hỏng tệp này **hai lần**, cả hai đều "chạy xong không lỗi": quên `napMoRong()` nên không bật gì, và lọc bằng `!m.core` nên bật luôn bốn phân hệ nhà trường đã quyết TẮT. Bộ canh vì vậy đọc thẳng CSDL và **dựng máy chủ thật** để hỏi, không đọc chữ script in ra | Hướng 3 |
| 30/08/2026 | **Đ84** — **vòng soát thứ ba, đi theo THỜI GIAN chứ không theo chủ đề.** Hai vòng trước soát theo chủ đề nên không thấy chỗ BÀN GIAO giữa hai việc. Đi một lượt 7h→17h30 ở đúng cấu hình đủ tám phân hệ, lộ ra trong ba phút: gia đình báo con sốt 7h, văn phòng duyệt, **BẾP trừ đúng một suất** (Đ46 làm đúng) — nhưng **màn Nhật ký ngày không biết gì**. Cô bấm "áp cả nhóm" và bé nằm nhà được ghi *"ăn hết bát cơm, ngủ 11h30–14h"*; chiều tối mẹ đọc đúng dòng đó. Không mất, không rò — nhưng là mục tiêu số một của cả app nói một điều gia đình BIẾT CHẮC là sai. Sổ Đón trả cũng vậy. Vá: `lib/nghi-hoc.js` một chỗ trả lời, ba màn cùng hỏi; **nói ra, không chặn** | Hướng 1 |
| 30/08/2026 | **Đ85** — dọn N1/N13/N14 theo hướng **chuẩn bị sẵn cả hai kịch bản**. `docs/TRIEN-KHAI.md` nay có runbook đầy đủ cho [A] VPS Việt Nam và [B] Render, kèm lời dặn xoá hẳn nửa không dùng. Sửa đường dẫn dữ liệu trong `docs/SAO-LUU.md` và `docs/CAP-NHAT-MAY-CHU.md` — bộ canh mới **tự tìm ra tệp thứ ba** tôi chưa nhìn tới, và nó là runbook cập nhật máy chủ ĐANG CHẠY. Bản đầu của bộ canh đó miễn trừ theo cờ trong tệp và vì thế **vô dụng đúng ở chỗ cần nhất**; đã đổi sang danh sách ghi tay | Hướng 2 |
| 30/08/2026 | **Đ87** — **phân hệ Báo cáo học tập CASA** (tháng · 6 tháng · Cambridge), dựng theo bảy tệp mẫu nhà trường gửi. Mã là `baocaohoctap` chứ không phải `baocao` — mã đó đã thuộc Học bạ tiểu học của N3. Thang M/S/W/N/NA của mẫu giấy có hai bậc trên là lời khen so trẻ trên dưới nhau; **không nới `test:quy-tac-4`**, mà dùng lại đúng năm trạng thái Hành trình học tập (khớp gần như một đối một) và hiện kèm chữ cái cô quen tay. Mẫu nằm trong CSDL để trường tự sửa mỗi năm. Bốn bộ canh bắt bốn lỗi tôi tự gây ra, trong đó `studentsOf(classId)` đổ **cả 11 bé của trường** vào sổ một nhóm 5 bé. Phép thử ngược lột được **một bài canh xanh giả**: phép so trước/sau bị đánh bại bởi thứ tự gọi, đổi sang khẳng định trực tiếp | Yêu cầu 30/08 |
| 30/08/2026 | **Đ88** — dữ liệu mẫu: bốn mẫu báo cáo thật của trường, và vá **ba mã trạng thái chết** ('dang-lam-duoc' ×2, 'lam-duoc-mot-minh' ×1) — tên cũ đã đổi từ lâu mà `data/seed.js` không đổi theo. Không bộ canh nào bắt được vì seed ghi thẳng vào bảng, không qua API. Hậu quả đúng chỗ đau nhất: `npm run ban-thu` dựng bàn thử từ dữ liệu mẫu, cô mở màn Hành trình ra thấy ô trạng thái TRỐNG. Bộ canh mới đọc năm mã từ chính mã phân hệ | Tự thấy khi seed |
| 30/08/2026 | **Đ89** — **ảnh điểm danh và bảng rà soát sau 9 giờ** (điểm 4 của nhà trường). Ảnh "con đã tới lớp" chỉ đi tới gia đình CỦA CHÍNH BÉ ĐÓ — bảng phụ `attendance_photo`, không ALTER TABLE, chụp lại thì ảnh cũ được dọn khỏi kho. Bảng rà soát **trừ bé đã có đơn nghỉ được duyệt** (dùng `lib/nghi-hoc.js` của Đ84): không trừ thì mỗi sáng văn phòng lại gọi một gia đình đã báo từ hôm trước, vài lần là cả bảng bị bỏ qua. **Màu đỏ ở đây nói về việc của người lớn chưa xong**, không nói gì về đứa trẻ — có bài canh soi chữ. `test:quy-tac-4` bắt tên hành động `diem-danh-anh` vì `\bdiem\b` khớp; đổi tên thay vì xin ngoại lệ | Yêu cầu 30/08 |
| 30/08/2026 | **Đ90 + Đ91** — **ba cơ sở nấu riêng bếp** (điểm 1). Bảng `menus` có `date UNIQUE` nên ba bếp không thể có ba thực đơn cùng ngày, và chú thích cũ dặn "thêm cột cơ sở vào `menus` rồi mới mở đường ra" — không đi được, vì đổi khoá phải dựng lại một bảng đang có dữ liệu thật. Đường đã đi: bảng phụ `menu_campus`, đọc thì **dòng riêng thắng, không có thì rơi về bản dùng chung** — trường một bếp chạy y như cũ, thực đơn đã nhập không mất. `lib/db.js` đi **commit riêng** trước (Đ90) đúng luật tệp dùng chung. **Bản đầu dựng lại đúng cái hỏng mà chú thích cũ cảnh báo:** hàm phân quyền đọc `phamViCoSo(user).length === 1` như thể nó trả về mảng, trong khi nó trả về một chuỗi — nên mọi quản lý cơ sở rơi xuống nhánh Cấp 1 và món của cơ sở 2 hiện lên màn hình gia đình cơ sở 1. Phép thử tay bắt được trước khi commit | Yêu cầu 30/08 |
| 30/08/2026 | **Đ92** — **bốn bài canh đỏ theo giờ trong ngày, cả bốn đều có sẵn từ trước.** Phát hiện lúc 00h26 giờ Việt Nam ngày thứ Hai (17h26 UTC Chủ nhật): `bien-soan` tính thứ Hai bằng `new Date()` của máy chạy test chứ không bằng `HOM_NAY()` (4 bài); `hanh-trinh` cộng 7 ngày vào giờ UTC nên "tuần sau" rơi vào chính tuần này (1 bài); `mot-ngay-cua-co` trông vào việc dữ liệu mẫu CHƯA chấm điểm danh cho bé, mà luật là điểm danh thắng đơn nghỉ — nên nó xanh vào cuối tuần và đỏ vào ngày học, cả hai lần đều không đo đúng thứ nó nói (2 bài); `tien-an` mong tháng NÀY có sẵn một buổi vắng không phép, mà 20 ngày học gần nhất rơi sang tháng trước vào ngày 31 (1 bài). Đã đối chiếu từng bộ bằng cách cất hết thay đổi trong cây làm việc rồi chạy lại — đỏ y hệt. Vá: dùng `HOM_NAY()` và **tự dựng tình huống** thay vì trông vào dữ liệu mẫu rơi đúng chỗ | Tự thấy |
| 30/08/2026 | **Đ93** — **video trong album** (điểm 5 của nhà trường). Video lưu thành MỘT DÒNG trong `album_photos` y như ảnh, cùng cột `file`, cùng bảng gắn thẻ bé — nên nó đi qua **đúng một đường** với ảnh, không phải "cũng có kiểm tra tương tự". Không thêm bảng, không thêm cột. Phép thử ngược cho video đi vòng qua bộ lọc đồng ý: đỏ ngay. **Hai chỗ sẽ vỡ khi gặp video thật, bắt được khi đọc lại `server.js` trước lúc commit:** trần 25 MB tôi đặt ban đầu vượt thân yêu cầu 12 MB của Express (base64 phình 33%), và lô gửi lên gom 3 tệp một lượt nên hai video là vỡ. Vá bằng cách hạ trần xuống **8 MB** và cho video đi **một mình một lượt** — KHÔNG nới giới hạn 12 MB, vì nó đang che mọi đường dẫn khác. Kèm: thân yêu cầu quá lớn nay trả lời 413 kèm câu chỉ đường, thay vì bốn chữ "Lỗi máy chủ" | Yêu cầu 30/08 |
| 31/08/2026 | **Đ94** — **hai lỗi chỉ lộ ra khi CHẠY THẬT bàn thử, đọc mã không thấy.** (1) Sổ báo cáo của một nhóm tra theo `(bé, từ ngày, đến ngày)` mà **bỏ mất loại báo cáo**: bé mới chỉ có bản THÁNG vẫn bị đếm là "đã có bản" cho cả loại 6 THÁNG, nút *Mở báo cáo* mở đúng bản tháng ấy ra dưới tiêu đề 6 tháng. Đo trên dữ liệu bàn thử: câu cũ trả **hai bé cho MỌI loại**, câu mới trả đúng một bé cho mỗi loại. Loại nay là tham số **bắt buộc** — bỏ trống thì từ chối, không ngầm chọn giúp, vì ngầm chọn chính là cách lỗi này quay lại. (2) **Bốn màn của cô tự đi tìm câu trả lời "cô mở được nhóm nào", mỗi màn một kiểu.** Màn Báo cáo học tập lấy `App.state.classes[0]` — nhóm đầu danh sách của CẢ TRƯỜNG — làm nhóm mặc định, nên cô nhóm Nhà trẻ 1 bấm vào là gặp thẳng "Có lỗi xảy ra" (403). Ba màn còn lại (Nhật ký ngày, Đón trả bé, Hành trình) mở đúng nhóm nhưng **ô "Nhóm" vẫn liệt kê cả bốn nhóm của trường**, bấm sang nhóm không phụ trách là hỏng. Gom về **một** hàm dùng chung `App.nhomCuaCo()` (commit riêng, chỉ thêm). Bộ canh màn phân hệ trước nay chỉ chạy bằng MỘT tài khoản cô, mà cô ấy tình cờ dạy nhóm đầu danh sách — thêm mục **[1b] chạy lại mọi màn của cô bằng tài khoản thứ hai**, kèm đối chứng và một bài canh "ô chọn không mời cô bấm vào chỗ chắc chắn hỏng" | Chạy thử bàn thử |
| 31/08/2026 | **Đ95** — **ảnh "con tới lớp" chưa từng hiện ra được, và 37 bài canh của Đ89 không bài nào thấy.** Hai màn hình trỏ thẳng vào `/uploads/<tên tệp>`, mà máy chủ **không hề gắn đường tĩnh nào tên đó** — tệp ảnh nằm ở `DATA_DIR/uploads`, ngoài `public/`. Mọi yêu cầu ảnh rơi vào lớp đỡ của trang đơn và nhận về `index.html`. Đo bằng HTTP thật trên bàn thử: tải lên trả **201**, tải về trả **200 + `text/html` + 2977 byte**. Ô ảnh vỡ ở cả hai màn, trong khi màn của cô vẫn in dòng *"Gia đình đã thấy ảnh"* — đúng hạng lỗi mà `test:khong-hua-suong` sinh ra để chặn. Đây là điểm 4 nhà trường đặt hàng, và bảng tiến độ đã ghi là XONG. **Vì sao 37 bài canh không thấy:** tất cả chỉ đọc JSON (`taoReq` của `_chung.mjs` chỉ phân tích JSON) và đọc đĩa bằng `fs.existsSync` — không bài nào tải byte qua HTTP, nên một đường trả `index.html` vẫn hiện ra là "status 200". Vá bằng `GET /api/attendance/anh/:file` tra chủ ảnh trong `attendance_photo` rồi `db.canAccessStudent`, theo đúng mẫu đã có ở Đón trả và Cambridge. **KHÔNG vá bằng `express.static`**: thư mục đó dùng chung cho ảnh album, ảnh người được đón, ảnh quan sát của cô — mở tĩnh một dòng là đi vòng qua `locAnhChoNguoiXem` + `canAccessStudent` + luật ảnh nhóm cùng lúc, và tên tệp không phải bí mật (nó nằm sẵn trong JSON mọi gia đình đã nhận). Mục canh mới **[1b]** tải byte thật, kiểm chữ ký PNG, kiểm 403 cho cô nhóm khác / nhà khác / người chưa đăng nhập, 404 cho tên tệp bịa, **và chốt ngược rằng `/uploads` vẫn KHÔNG phục vụ ảnh** — phép thử ngược thứ ba (thêm một dòng `express.static`) cho người lạ chưa đăng nhập tải được đúng byte ảnh mặt trẻ, bài canh đỏ ngay | Đợt soát 31/08 |
| 31/08/2026 | **Đ96** — **rút đồng ý ① *hồ sơ học tập* không có hiệu lực gì cả.** Gia đình bấm *Rút lại* ở mục ①, app báo đã ghi nhận, và **cô vẫn ghi quan sát, vẫn lập kế hoạch, vẫn soạn báo cáo cho bé y như cũ**. Hai ô ② và ③ có hiệu lực thật (đã lọc ở tầng dữ liệu từ Việc 1), riêng ô ① chưa nối vào đâu — tức app hứa một điều nó không làm, đúng hạng lỗi `test:khong-hua-suong` sinh ra để chặn, và là lời hứa nặng nhất trong ba lời hứa vì nó nói về hồ sơ học tập của trẻ. **Ba quyết định đã tự chốt:** (1) **rút = ngưng ghi MỚI, không xoá phần đã ghi** — Nghị định 13/2023 cho quyền rút, không bắt xoá ngược, và xoá ngược là lấy mất phần gia đình vẫn đang xem lại được; (2) **ba giá trị, không phải hai** — `null` là *chưa nộp giấy*, và chưa nộp giấy thì **không chặn** (`if (!x)` là con dao ở đây: nó gộp *chưa nộp* vào *đã từ chối*); (3) **nhật ký ngày vẫn chạy** — ăn ngủ vệ sinh thay bỉm là chăm sóc hằng ngày, không phải hồ sơ học tập, cắt nó là cắt luôn thứ gia đình cần nhất mỗi chiều. Chốt ở **tám đường ghi** thuộc bốn phân hệ (Hành trình ×3, Ghi nhanh, Kế hoạch của bé ×2, Báo cáo học tập ×3). Ghi cho **cả nhóm** thì **bỏ qua bé đã rút chứ không trả 403** — trả 403 là một bé rút làm cô không lưu được cho 19 bé còn lại, tức biến quyền của một gia đình thành hình phạt cho cả nhóm; câu trả lời kèm `boQuaNgungHoSo` để màn hình nói rõ đã bỏ qua ai. `lib/db.js` thêm `beNgungHoSoHocTap` + `dsBeNgungHoSoHocTap` (commit riêng, chỉ thêm). `test:rut-dong-y` 23 bài, hai phép thử ngược đều bắt | Đợt soát 31/08 |
| 31/08/2026 | **Đ97** — **bảng rà soát sau 9 giờ chỉ cô mở được, mà người nhấc máy gọi phụ huynh lại là văn phòng.** Màn Điểm danh chia hai nhánh *cô* / *phụ huynh*; quản trị rơi vào nhánh phụ huynh và không có đường nào tới bảng rà soát. Thêm nhánh **văn phòng**: gọi `/api/attendance/ra-soat` **không kèm `classId`**, nên nhận cả cơ sở (Cấp 3) hoặc cả trường (Cấp 1) trong một lần, gom theo nhóm. Ba trạng thái tách bạch: *chưa tới giờ* · *cả trường đã xong* (xanh) · *cần gọi N bé* | Đợt soát 31/08 |
| 31/08/2026 | **Đ98** — **Album và Thông báo hỏi cơ sở dữ liệu từng dòng một.** Màn Album của một gia đình chạy N+1 **ba tầng**: mỗi album một câu lấy ảnh, mỗi ảnh một câu lấy thẻ bé, mỗi bé một câu lấy giấy đồng ý. Đo trên cùng một bàn đo (120 album × 25 ảnh × 4 bé gắn thẻ): **3.997 câu → 392 câu**. Thông báo tra tên người gửi từng dòng: **406 → 1**. Ba hàm tra theo LÔ thêm vào `lib/db.js` (commit riêng, chỉ thêm), chia lô 400 mã một lượt vì SQLite giới hạn số tham số. **Luật ảnh nhóm không đổi một chữ** — vẫn *mọi* bé trong ảnh phải đồng ý, vẫn lọc ở tầng dữ liệu | Đợt soát 31/08 |
| 31/08/2026 | **Đ99** — **bộ canh cho chính cái luật vừa vá ở Đ95.** Đ95 vá một đường; không có gì ngăn đường thứ hai mắc lại đúng lỗi ấy. `test:anh-canh-quyen` 16 bài, ba mục: **(1)** không tệp nào gắn `express.static` vào `DATA_DIR`; **(2)** mọi `src="/..."` trong màn hình và view phân hệ đều phải khớp một đường `/api` **có đăng ký thật**; **(3)** mọi `res.sendFile` đều phải nằm sau một chốt quyền, kể cả khi chốt nằm trong một hàm phụ trong cùng tệp — lớp đỡ trang đơn được miễn theo **nội dung** (`laLopDoTrangDon`), không theo tên tệp | Đợt soát 31/08 |
| 31/08/2026 | **Đ100** — **năm bộ canh xanh hờ: chúng canh đúng thứ chúng nói, nhưng xanh cả khi tình huống không dựng được.** (1) `nam-hoc-co-so` [6] đếm nhóm trùng tên trên danh sách năm 2028-2029 mà **không hề chốt danh sách ấy khác rỗng** — lần chuyển năm thứ hai không đẻ ra nhóm nào thì cả hai phép kiểm vẫn xanh. (2) `co-so-quan-tri` [8] chỉ bắt lỗi **lộ ra** (*có dòng của người khác*); siết quá tay tới mức Cấp 3 không đọc được nhật ký của chính mình cũng cho ra danh sách rỗng, và rỗng thì "không có ai khác" luôn đúng — phép thử ngược xác nhận: trả `[]` thì phép kiểm cũ **vẫn xanh**, phép kiểm mới đỏ. (3) `du-lieu-mau-phan-he` bọc vòng đếm dòng mồ côi trong `try/catch` **nuốt lỗi SQL**: một tên bảng gõ sai là bỏ qua bảng đó và đếm ra 0. Bỏ `try`, và chốt trước rằng cả năm bảng đều có dữ liệu để mà quét. (4) `bai-canh-that` chỉ bắt `check(..., true, ...)` **ba tham số**; dạng **hai tham số** `check(..., true)` — tự cho qua mà còn không thèm ghi lý do — lọt suốt. (5) `test:khe-uoc` mất bản chụp thì **âm thầm ghi một bản mới rồi thoát 0**, biến việc xoá bản chụp thành cách dễ nhất để một thay đổi phá vỡ khế ước đi qua mà không để lại dấu vết. Nay thiếu bản chụp là **đỏ**, trừ khi gọi tường minh `--cap-nhat` | Đợt soát 31/08 |
| 31/08/2026 | **Đ101** — **danh sách bé ra trường cắt 500 dòng TRƯỚC khi lọc cơ sở.** `/api/schoolyear/alumni` lấy 500 bé ra trường mới nhất của cả trường rồi mới lọc còn cơ sở của người xem, nên quản lý một cơ sở nhận về khoảng một phần ba của 500 — **danh sách cụt mà nhìn vẫn như đủ**, vì màn hình không có chỗ nào nói là đã cắt. Hỏng nặng dần theo thời gian chứ không hỏng ngay: năm đầu chưa tới 500 bé ra trường thì không ai thấy gì. Dựng đúng cảnh trong bài canh — cơ sở 2 có 520 bé ra trường năm 2030, cơ sở 1 có 3 bé từ năm 2020 — phép thử ngược cho ra **0 dòng** cho quản lý cơ sở 1 | Đợt soát 31/08 |
| 31/08/2026 | **Đ102** — **bảng lịch sử nhóm qua các năm chỉ ghi, không màn hình nào đọc.** Một bảng chỉ ghi mà không ai nhìn thì hỏng lúc nào cũng không biết, và tới lúc thật sự cần tra lại một bé đã ra trường thì đã muộn. Nối vào **hai chỗ**: hồ sơ bé của gia đình, và ô hồ sơ bé cô mở từ danh sách nhóm. Chỉ hiện khi bé đã qua từ **hai** năm trở lên, và **không** viết "đây là năm đầu của con ở trường" cho trường hợp một khoảng — trường mới dùng app thì mọi bé đều chỉ có một khoảng, nói vậy là app tự bịa ra một điều nó không biết | Đợt soát 31/08 |
| 31/08/2026 | **Đ103** — **ba lỗ nhỏ ở kế hoạch tuần, cùng một gốc: nếp thứ Sáu của trường chưa được app đỡ.** (1) **Chủ đề tuần không có ô chọn tuần.** Máy chủ nhận `tuan` từ đầu ở cả ba đường, nhưng màn hình không bao giờ gửi — nên nó luôn soạn cho tuần đang chạy, và **thứ Sáu, đúng hôm phải soạn tuần sau, lại là hôm duy nhất không soạn được**. Thêm hai nút *Tuần này* / *Tuần sau*. (2) **Lời nhắc thứ Sáu chỉ nói tới thực đơn**, trong khi nếp của trường là gửi cả thực đơn lẫn chủ đề học tập tuần tới. Nhắc ở cả hai màn, và ở màn của cô thì chỉ hỏi máy chủ vào **đúng thứ Sáu** — ngày thường không tốn thêm lần gọi nào. (3) **`/api/plans` chỉ trả kế hoạch của đúng tháng hiện tại.** Cô soạn kế hoạch tháng 9 vào cuối tháng 8 — cách duy nhất soạn kịp — rồi màn hình vẫn ghi *"Chưa có kế hoạch giáo dục cho tháng này"*, nên cô tưởng app không lưu được và soạn lại. Thêm `planSapToi` **bên cạnh**, không đổi nghĩa của `plan`. Và "tháng này" nay lấy từ `lib/ngay` (giờ Việt Nam), không từ giờ máy chủ | Đợt soát 31/08 |
| 31/08/2026 | **Đ98b** — **Album và Thông báo vẫn kéo cả kho về, dù Đ98 đã bỏ N+1.** Đ98 gom ba tầng truy vấn thành tra theo lô, nhưng khối lượng vẫn lớn dần theo số năm nhà trường dùng app và **không có gì chặn**: sang năm thứ ba, phụ huynh mở màn Album là kéo cả lịch sử ảnh của nhóm về điện thoại chỉ để xem mấy album trên cùng; bảng thông báo thì chỉ thêm chứ không ai dọn. Cắt cửa sổ **60 album** và **100 thông báo** một lượt, kèm nút *Xem album cũ hơn* / *Xem thông báo cũ hơn* — cắt mà không có nút là **giấu mất** dữ liệu, không phải tối ưu. **Hai chỗ cắt ở hai tầng khác nhau, có lý do:** thông báo cắt thẳng bằng `LIMIT/OFFSET` trong SQL vì `audienceFilter` đã lo phần *ai được thấy gì* ngay trong `WHERE`; album thì **cắt trong JavaScript SAU khi lọc quyền**, vì phụ huynh chỉ xem được album chụp trong đúng khoảng con còn ở nhóm đó và bộ lọc ấy không nằm trong `WHERE` — cắt trước khi lọc thì số dòng trả về không phải số dòng người này xem được, và màn hình (vốn suy ra *còn nữa hay hết* bằng cách **đếm**) sẽ giấu nút đúng lúc vẫn còn album. Câu trả lời **vẫn là một mảng**, không đổi hình dạng: điện thoại đang giữ bản app cũ trong bộ nhớ đệm chạy y như trước, chỉ là danh sách dừng ở trang đầu — đúng Nguyên tắc số 1. Thông báo **ghim** vẫn đứng đầu nhờ `ORDER BY n.pinned DESC` nên trang một không bao giờ rơi mất thứ nhà trường muốn nổi lên. Bài canh chốt vế khó nhất: **ghép từng trang lại phải ra ĐÚNG danh sách cũ** — không thừa một album (rò quyền), không thiếu một album (mất ảnh của con) | Đợt soát 31/08 |
| 31/08/2026 | **Đ104** — **bàn thử chỉ có một tài khoản Cấp 1, nên tầng phân quyền chưa bao giờ được người thật bấm thử.** Tầng chức vụ chia người của trường làm ba cấp, mà mọi buổi thử đều đăng nhập bằng ban giám hiệu. Đó là chỗ dễ sai nhất: sai kiểu **thấy quá nhiều** thì màn hình vẫn chạy trơn, không có gì báo, và người thử cũng không có cách nào nhận ra. Bàn thử nay dựng thêm **bốn tài khoản**: `vanphong1` (Cấp 3, khoá vào cơ sở 1), `nhansu` · `ketoan` · `marketing` (Cấp 2, không khoá cơ sở), tất cả **bị buộc đổi mật khẩu khi đăng nhập** y như ban giám hiệu. Đo bằng HTTP thật: *marketing* nhận 403 ở hồ sơ bé và học phí nhưng 200 ở album; *kế toán* ngược lại; *nhân sự* 403 cả ba. **`data/seed.js` cố ý để nguyên** — dữ liệu mẫu không có tài khoản quản trị nào là một quyết định đã ghi trong chính tệp đó, và đổi nó là đổi bối cảnh của khoảng năm mươi bài kiểm thử | Đợt soát 31/08 |
| 30/08/2026 | **N3 bước 2 — nhà trường quyết ĐỂ NGUYÊN.** Câu hỏi đặt ra là có xoá hẳn mã hai màn Nề nếp và Báo cáo không (dữ liệu vẫn giữ trong cả hai hướng). Trả lời: *"chưa chắc"* sẽ không dùng lại, nên giữ mã để bật lại bằng một lượt bấm. **Cái giá đã biết trước:** món nợ `test:quy-tac-4` ở nguyên **27 dòng** thay vì về 0, vì bài canh soi mã nguồn chứ không soi trạng thái bật/tắt. Nhân đó sửa hai chỗ ghi sai con số cũ **17** trong tài liệu — 17 là số lúc mới ghi, Đ6 (`452cd38`) thêm dấu hiệu bắt theo **tên trường dữ liệu** nên hai tệp Học bạ nhảy 4→9 và 1→6. **Mã nguồn không đổi một dòng**; bánh cóc không hỏng, chỉ là mắt bộ canh sáng hơn | N3 chốt |
| 31/08/2026 | **Đ111** — **sáu chỗ app hứa mà không làm, hoặc làm mà không nối vào màn hình.** (1) Điểm danh ghi *"Gia đình đã thấy ảnh"* trong khi app **không có bảng nào ghi việc gia đình đã mở hay chưa** — cô đọc dòng đó rồi thôi không gọi điện; đổi thành *"Đã gửi cho gia đình"*. (2) Gia đình bấm *Ngưng dùng* một người được đón lúc 10 giờ, 4 giờ chiều **cô vẫn ghi sổ bằng đúng tên đó** từ danh sách còn trong bộ nhớ trang; máy chủ nay từ chối và **giữ đường ra** — cô vẫn trả bé được bằng *"Người khác"* kèm tên, vì chặn cứng thì cô trả bé rồi ghi sổ giấy, tức mất hẳn vết. (3) Quản trị mở Khảo sát / Dặn thuốc **rơi vào nhánh của gia đình** — màn hình hỏi *"con bạn là bé nào"* với một người không có con nào; Điểm danh **cố ý không đi theo** (`nhomCuaCo` chỉ đặt cho vai cô) và bài canh ghi lại lý do để lần sau không ai "sửa cho đồng bộ". (4) `/api/schoolyear/alumni` lọc đúng cơ sở, chạy tốt, **không màn hình nào gọi** — bé ra trường biến khỏi mọi màn của trường sau khi chuyển năm; thêm bảng vào Quản trị → Năm học, **tải rời** nên hỏng cũng không ảnh hưởng phần chuyển năm. (5) Nhà trường tắt một mẫu báo cáo là mẫu ấy rơi khỏi danh sách và **không còn nút nào bật lại** — một cửa MỘT CHIỀU. (6) Cô soạn chủ đề tuần sau từ thứ Sáu nhưng gia đình chỉ đọc được tuần này, mà *"Cùng con ở nhà"* là thứ nhà chơi vào **cuối tuần**; thêm khoá `chuDeTuanSau` **bên cạnh** khoá cũ. `test:hua-thi-lam` 50 bài, phá ngược cả sáu bản vá | Đợt soát 31/08 |
| 31/08/2026 | **Đ112** — **mười bộ canh báo xanh mà không canh gì cả, và tài liệu vận hành dạy sai.** QUY TẮC 2 chỉ biết màu **đỏ**, không biết màu **cam** — `UI.badge('Chưa quan sát thấy', 'orange')` đi qua sạch sẽ, mà cam đọc ra đúng thứ quy tắc cấm. Hai bộ canh QUY TẮC tự nhận soi `schema.sql` nhưng **lược đồ LÕI `lib/schema.sql` nằm ngoài vùng quét của cả hai** — cửa sau rộng nhất ở tệp trung tâm nhất; mở rộng xong QUY TẮC 4 báo đỏ đúng một chỗ (một chú thích kể chuyện app 1 trừ điểm thi đua) và **sửa chính chú thích ấy chứ không thêm ngoại lệ**. `co-lap-loi` [1] phá `routes/conduct.js` — mà Nề nếp **tắt sẵn** từ N3, nên "tính năng hỏng biến khỏi màn hình chính" xanh bất kể có phá hay không; đổi sang Khảo sát kèm đối chứng đọc trạng thái TRƯỚC khi phá. `ban-thu` [3] hỏi bảng `module_settings` trong khi bốn trong năm phân hệ phải-tắt **không có dòng nào trong bảng** — phép kiểm "quan trọng nhất của cả bài" xanh kể cả khi Nề nếp được bật cho cô xem. Ba phép kiểm **hằng đúng** (`Array.isArray(Object.keys(...))`, `typeof x === 'boolean'`). Một phép kiểm nằm trong `if` không có `else`. Bộ canh dữ liệu **miễn trừ trọn thư mục `test/`** — nơi bộ test ghi cơ sở dữ liệu thật và ảnh thật — trong khi CLAUDE.md ghi nó "KHÔNG có đường thoát". Hai bài canh sửa thẳng vào kho mã **không có móc SIGTERM**, tức `kill` hay CI hết giờ là để lại kho mã ở trạng thái cố tình phá hỏng. **Tài liệu:** `docs/SAO-LUU.md` dạy đồng bộ bản sao (ảnh mặt trẻ + hồ sơ sức khoẻ) ra R2 / S3 / Google Drive — **chuyển dữ liệu xuyên biên giới**, đúng thứ `render.yaml` đã cấm cho máy chủ đang chạy; và dùng `rsync --delete` / `rclone sync`, hai lệnh xoá nốt bản bên kia khi bên này mất. `restore:check` **không nói một chữ nào về ảnh** mà bộ soát máy chủ lại đọc kết quả đó thành "bản sao dùng được thật" | Đợt soát 31/08 |
| 31/08/2026 | **Đ113** — **bốn màn hỏng dần khi trường đông lên.** Cùng một hình dạng: hỏi cơ sở dữ liệu "một câu cho mỗi dòng", hoặc nạp cả lịch sử rồi vứt gần hết bằng JavaScript. Với 11 bé mẫu không ai thấy gì; với 600 bé và ba năm lịch sử là hàng nghìn câu cho MỘT lượt mở màn — và vì better-sqlite3 chạy **đồng bộ**, chúng chặn thẳng vòng lặp sự kiện, tức làm chậm mọi người chứ không riêng người đang bấm. (1) **Nhắn tin**: danh sách hội thoại không có trần nào (hội thoại cô ↔ gia đình chỉ sinh ra chứ không bao giờ đóng) cộng 4–5 câu mỗi dòng → cắt cửa sổ 40 bằng `LIMIT/OFFSET` kèm nút *Xem hội thoại cũ hơn*, gom thành một bảng tra cho cả lượt. `c.id DESC` là **tiêu chí phụ bắt buộc**: phòng chưa có tin nào đều cùng mốc NULL, cắt trang trên một tập bằng nhau mà không có tiêu chí phụ là có phòng lặp ở trang sau và có phòng không bao giờ hiện. (2) **Mở app**: `mePayload` và `/api/students` hỏi lại thông tin nhóm cho TỪNG bé → bảng nhớ theo nhóm, **sống đúng một lượt gọi** (nâng ra ngoài thành đệm dùng chung là quyền cũ đọng lại ở đúng chỗ giao diện lấy `classIds` của cô — có phép kiểm khoá lại). (3) **Màn cổng đón trả**: nạp toàn bộ lịch sử uỷ quyền rồi lọc bằng JavaScript → đẩy mốc `denNgay >= ngày−7` vào SQL, gom ba câu-mỗi-bé thành ba câu-cả-nhóm; **cố ý không thêm `tuNgay <= ngày`** vì uỷ quyền của ngày mai đã bị huỷ mang trạng thái `da-huy` chứ không phải `chua-toi`, và cô vẫn phải thấy nó. (4) **Xin phép nghỉ / Dặn thuốc**: máy chủ có cắt ở 60 đơn nhưng màn hình không gửi `?gioiHan=` và không nói một chữ nào là đã cắt → văn phòng gom đơn cả trường nên sau một tuần là lịch sử cũ biến mất, người dùng kết luận *"đơn mất"*. `test:quy-mo` 44 bài — **không đo tốc độ** (đỏ ngẫu nhiên), mà canh: ghép các trang lại phải ra ĐỦ và KHÔNG LẶP, hình dạng câu trả lời không đổi, ranh giới không nới theo, bảng nhớ không sống quá một lượt gọi | Đợt soát 31/08 |
| 31/08/2026 | **Đ114a** — **văn phòng cơ sở ghi được giấy đồng ý mà không đọc lại được.** Chức vụ `vanphong-coso` GHI giấy đồng ý qua `PUT /api/admin/students/:id/dong-y` — lọt nhờ tiền tố `/api/admin` trong danh sách api của chức vụ — và GHI lịch sử nhóm mỗi lần chuyển nhóm cho bé. Nhưng hai đường ĐỌC, `/api/dong-y` và `/api/schoolyear/lich-su-lop`, không nằm trong danh sách nào, nên chính người vừa ghi thì không mở lại xem được. Vá bằng cách **chỉ thêm** hai mục, đi **commit riêng** vì `lib/db.js` là tệp dùng chung. `/api/schoolyear/lich-su-lop` ghi **đường đầy đủ chứ không phải tiền tố**: `chanApiNgoaiChucVu` khớp theo tiền tố, viết ngắn thành `/api/schoolyear` là mở luôn `POST /api/schoolyear/promote` — chuyển năm học cho toàn trường — cho một tài khoản văn phòng | Đợt soát 31/08 |
| 31/08/2026 | **Đ114** — **ba ranh giới còn hở, và bộ canh "mọi đường /api/ phải có chủ".** (1) **Khảo sát**: `POST /api/surveys` ghi cứng `audience: 'all'` nên mọi khảo sát đi tới cả ba cơ sở, mà chỗ đọc kết quả trả về `respondents` — **tên từng phụ huynh** — và với câu hỏi mở là **cả câu chữ họ viết kèm tên**. Cô nhóm Chồi 2 mở một khảo sát ra là đọc được ý kiến phụ huynh cả trường, gồm hai cơ sở cô không làm việc; mà ý kiến gửi nhà trường thường là chuyện riêng (hoàn cảnh gia đình, lý do xin nghỉ, phàn nàn về một cô cụ thể). Nay lọc theo phạm vi: cô thấy nhóm mình, Cấp 3 thấy cơ sở mình, **Cấp 1 thấy cả trường và không lọc** — lọc theo nhóm là lọc theo bé *đang học*, khảo sát cuối năm mà mất phiếu của những nhà đã chuyển trường là mất đúng phần đáng đọc nhất. Hình dạng câu trả lời **không đổi**: `responseCount` vẫn là số phiếu cả trường, chỉ **thêm** `soPhieuTrongPhamVi` bên cạnh và màn hình nói thẳng ra chênh lệch, nếu không cô nhìn "12 phiếu" rồi đếm được 4 tên và tưởng app mất phiếu. (2) **Phòng chung của nhóm**: cô bị rút khỏi nhóm vẫn mở được và vẫn gửi bài vào phòng chat chung của nhóm ấy, vì `findConv` chỉ hỏi tư cách thành viên đã ghi trong bảng chứ không hỏi lại quyền hiện thời → phòng `type='group'` có `classId` nay phải qua `db.canAccessClass`; **phòng riêng giữa hai người không đụng tới** — cô với gia đình vẫn nhắn tiếp được, và đó là đúng. (3) **Bộ canh mới `[9b]`**: đọc `mod.CORE`, danh sách api trong `module.json` và các tiền tố `HE_THONG`, rồi bắt mọi đường `/api/` đang đăng ký phải thuộc về **đúng một** nơi — chính bài này tìm ra hai đường đọc của văn phòng đã vá ở Đ114a | Đợt soát 31/08 |
| 31/08/2026 | **Đ115** — **ba ô chết và một chú thích nói dối.** (1) **Nhật ký ngày đọc nhầm bếp.** Nhà trường chốt 30/08 là ba cơ sở nấu riêng; Đ91 đã tách dữ liệu ra bảng `menu_campus` và sửa màn Thực đơn, nhưng **Nhật ký ngày thì không ai sửa** — nó vẫn đọc thẳng bảng `menus` dùng chung. Hậu quả không kêu lên ở đâu cả: bé ở cơ sở 2 có nhật ký kèm món của một cái bếp khác, mỗi ngày, cho cả nhóm, và gia đình đọc thấy con *"ăn hết"* một món trường không hề nấu. Nay dòng riêng của cơ sở thắng, ngày nào chưa soạn riêng thì về bản dùng chung; cơ sở **suy từ nhóm bé đang học**, không hỏi người đang xem (mẹ có thể có hai con ở hai cơ sở). Luật đọc **chép vào phân hệ** chứ không gọi sang `routes/menu.js` — gỡ Thực đơn đi thì Nhật ký vẫn phải khởi động được. (2) **Dân tộc / Nhóm máu**: hai cột có trong bảng, có trong tệp xuất cho Phòng, có trong dữ liệu mẫu — nhưng **không màn nào nhập được**, và đường nhập CSV ghi cứng chuỗi rỗng, nên bé nhập sau ngày khai giảng thì hai cột ấy vĩnh viễn trống. **Mở đường ghi, không gỡ cột**: thêm hai ô vào màn Sửa hồ sơ, hai trường vào danh sách được vá của `PUT /api/admin/students/:id`, hai cột vào đường nhập CSV và vào tệp mẫu — tệp **không có** hai cột đó vẫn nhập được như cũ. (3) **Album trên máy dùng chung**: `App.logout()` cố ý không tải lại trang, nên `App.views.albums._daTai` sống suốt vòng đời trang; nút *Xem album cũ hơn* đặt `_giuTrang = true` **rồi mới** gọi `App.route()`, và phiên đổi đúng giữa hai bước đó thì album của người trước trộn vào danh sách người mới. Gắn phần đã tải với **mã người dùng** là bịt cả họ tình huống ấy, và không phải chạm `public/js/app.js`. (4) **`/api/accounts/reset-log`**: chú thích cũ ghi *"để tra khi có tranh chấp"* trong khi câu truy vấn lọc theo mã **người đi cấp lại**; ai tin theo chú thích mà mở đường này ra để điều tra một khiếu nại sẽ nhận danh sách rỗng và kết luận *"không ai đụng vào"*. **Giữ đường, sửa lời**, và chỉ sang `/api/admin/audit` — chỗ tra thật | Đợt soát 31/08 |
| 01/09/2026 | **Đ116** — **hai bài canh đỏ theo LỊCH chứ không theo mã.** Cả hai lộ ra đúng lúc giờ Việt Nam bước sang mùng 1 tháng 9, không có commit nào ở giữa: bộ đầy đủ xanh lúc 23h50 ngày 31/08 rồi đỏ lúc 00h20 ngày 01/09. (1) **Tuổi bé nhà trẻ trong dữ liệu mẫu.** `thangTruoc(n)` ở `data/seed.js` **ghim cứng ngày 12**: lùi 14 tháng từ mùng 1 tháng 9 ra `2025-07-12`, muộn hơn mùng 1 tháng 7 mười một ngày, nên bé đọc ra **13 tháng** thay vì 14 — sai đúng một tháng vào **mùng 1 đến 11 mỗi tháng**, và sai ngay ở ví dụ mở đầu của CLAUDE.md. Nay lùi n tháng từ chính hôm nay rồi lùi thêm 3 ngày, ghim ngày trong tháng ở mức tối đa 25 để tháng 28/30 ngày không tràn: bé luôn hơn n tháng từ 3 tới 9 ngày, không bao giờ đứng ngay mốc. Bài canh mới **lấy chính hàm trong `data/seed.js` ra chạy** (không chép lại công thức) với mọi ngày của ba năm — 3288 trường hợp — kèm đối chứng bắt bản ghim ngày 12 phải sai. (2) **Bảng rà soát sau 9h** (`test/diem-danh-anh.test.mjs` [4]). Chú thích cũ đã tránh được chuyện đỏ theo GIỜ bằng cách lấy *hôm qua*, nhưng dữ liệu mẫu điểm danh sẵn **20 ngày học gần nhất**: hôm qua mà là ngày học thì mọi bé đã được chấm, danh sách cần gọi RỖNG, ba phép so bên dưới mất nghĩa. Bài chỉ xanh khi hôm qua rơi vào thứ Bảy hoặc Chủ nhật — **hai ngày mỗi tuần**. Nay lấy một ngày trong tuần cách 45 ngày (20 ngày học trải tối đa 28 ngày lịch). **Cả hai lỗi nằm ở chỗ dựng tình huống của bài kiểm thử, không ở mã chạy thật** — và kiểu xanh phần lớn thời gian rồi đỏ vài ngày còn nguy hiểm hơn đỏ hẳn, vì ai gặp cũng nghĩ "chạy lại là xanh" | Đợt soát 31/08 |
| 01/09/2026 | **Đ117 (a–g, 7 commit)** — **rà soát toàn kho theo yêu cầu người dùng: 96 phát hiện, vá 16, sổ đầy đủ ở `docs/RA-SOAT-2026-09.md`.** Nặng nhất và đã vá: (a) **đổi hoa/thường trong đường dẫn** (`/API/students`) đi vòng cả chốt chức vụ lẫn chốt phân hệ tắt — Express khớp route không phân biệt hoa/thường còn ba phép so tiền tố thì có; dựng lại được cảnh Kế toán đọc 11 hồ sơ bé, **ghi sổ nợ app 1**; (b) đường cũ một-cô-một-lớp **xoá lịch sử phân công của nhóm đã đóng** và có chuỗi domino hạ nhầm cô chính của nhóm đang mở; kèm vá xoá-nhầm-cô-đang-nghỉ ở cả tầng db lẫn route; (c) bé đã rời trường (còn hạn 12 tháng) **bị ẩn ảnh của chính mình với chính nhà mình** — diện miễn trừ "con mình" nay đi theo quan hệ `student_parents`; (d+f) hết hai ổ N+1/quét bảng: bản lô luật truyền thông cho Marketing, 5 chỉ mục mới cho các đường tra ảnh theo tên tệp; (e) quản trị gửi được thông báo cho một nhóm (trước đó 400 "chưa gắn nhóm" — câu sai sự thật), Cấp 3 hết sửa/thu hồi thông báo cơ sở khác, POST tạo nhóm đủ chốt như PUT; (g) `npm run seed` **thôi gắn cứng `--force`**, mật khẩu tạm hai chỗ đổi sang `crypto.randomInt` (**ghi sổ nợ app 1**). Năm bộ canh mới, mỗi bộ đã **chạy thử trên bản chưa vá để xác nhận đỏ đúng chỗ**: `test:duong-hoa-thuong` · `test:phan-cong-nhom-cu` · `test:anh-be-ra-truong` · `test:thong-bao-pham-vi` · `test:tao-nhom-phan-cong`. `npm test` 3708 → **3768**, FAIL 0. Không đụng `public/` — 80 phát hiện còn lại (4 mức cao, đều ở giao diện/view phân hệ) nằm trong sổ chờ đợt sau | Đợt rà soát 01/09 |
| 02/09/2026 | **Đ118 (a–o, 15 commit)** — **đợt hai của cuộc rà soát: vá nốt 77 phát hiện còn lại, khép sổ.** Kết sổ 96 phát hiện: **93 đã vá** (16 ở Đ117 + 77 ở đợt này), **1 bác bỏ** khi kiểm chứng lại (huy hiệu khảo sát đếm đúng — khảo sát vốn không có phạm vi nhóm), **1 giữ theo thiết kế** (dọn phần nhìn lại khi ĐỔI nội dung mục kế hoạch — bộ canh có sẵn đòi đúng vậy), **1 còn lại** cần thiết kế thêm (hai cô cùng lưu kế hoạch cả nhóm ghi đè lẫn nhau — cần máy chủ phát hiện xung đột như nhật ký ngày). Nặng nhất đợt này: CSV hiểu ô có xuống dòng của Excel (**sổ nợ app 1**); `importSnapshot` dọn cờ thu hồi mồ côi (**sổ nợ app 1**); sửa mẫu báo cáo thôi làm trắng bản đã gửi + giữ hai cột tiếng Anh; học phí có đường **thu hồi / hủy xác nhận có vết** (bảng `hocphi_thuhoi`, không xoá gì); sao lưu ghi nguyên tử (**sổ nợ app 1**); `ui.js` bịt XSS lưu trữ ở `avatar()`/`studentBar()` (**sổ nợ app 1**); hết phiên đăng nhập thôi xoá màn cô đang gõ (poll huy hiệu gọi kiểu nền mới `API.getNen`); sổ đón trả có "Giữ như đã ghi" — hết đổi tên người đón âm thầm; nháp nhật ký **chỉ giữ ô cô đã gõ** — thôi chụp cả giá trị máy chủ rồi điền đè bản cô khác vừa lưu; ô chọn năm học ở trang chủ thôi nói dối; sáu phép kiểm gần-như-luôn-xanh được siết cho đỏ được thật. Tệp dùng chung đi đúng luật: `ui.js` và `app.js` mỗi tệp một commit riêng, khế ước cập nhật bằng `--cap-nhat` (2 mục thêm, 0 mục mất). VERSION sw v75 → v76. `npm test` 3768 → **3785**, `test:giao-dien` **526**, FAIL 0 cả hai | `docs/RA-SOAT-2026-09.md` |
| 02/09/2026 | **Đ118q — món cuối của sổ rà soát, SỔ KHÉP HẲN: hai cô cùng soạn Kế hoạch của bé, người lưu sau thôi xoá người lưu trước.** Người dùng bảo "làm nốt". Kiểm chứng lại phát hiện (độ tin cũ "khá chắc"): đúng thật — màn gửi nguyên ảnh chụp mọi ô, máy chủ xoá sạch mục rồi ghi lại, nên bản màn hình cũ đè trọn phần cô kia vừa soạn, im lặng. Vá bằng **đúng cơ chế `capNhatLucGoc` của nhật ký ngày**: màn gửi kèm dấu thời gian bản đã nạp, máy chủ bỏ qua ĐÚNG BÉ đụng độ và trả tên + lời nhắc, các bé sạch trong cùng mẻ vẫn lưu; app cũ không gửi mốc thì ghi như trước (Nguyên tắc số 1). Phía màn: khi đụng độ **không vẽ lại màn** (vẽ lại là mất phần đang gõ), chỉ nạp lại mốc nền — lần Lưu sau là một lần ghi đè có chủ ý, có đường ra. 12 phép kiểm mới trong `test:ke-hoach-be` (100 bài), đã chạy trên bản chưa vá: **đỏ 7 chỗ, in ra đúng cảnh bản cũ đè bản mới**. `npm test` 3785 → **3797**, bộ giao diện phân hệ 78 bài xanh | Kết sổ 96/96 |
| 02/09/2026 | **Đ119 — KHẢO SÁT GỬI RIÊNG MỘT NHÓM** (tính năng mới, người dùng yêu cầu sau khi đọc kết sổ rà soát). Hoá ra nền app 1 đã chuẩn bị sẵn: bảng `surveys` có cột `audience`, `visibleTo` đã lọc đúng luật — chỉ đường TẠO ghi cứng `'all'` nên mọi phép lọc phía dưới chưa từng có việc để làm. Nay `POST /api/surveys` nhận `audience: 'class'` + `classId`, **cùng luật và cùng chữ với Thông báo** (cô → nhóm mình qua `nhomDangThaoTac`, cô một nhóm khỏi phải chọn; văn phòng → nhóm trong cơ sở qua `canAccessClass`); **huy hiệu khảo sát lọc bằng chung `lib/thong-bao.js`** — không lọc thì nó đếm cả khảo sát nhà không mở được, thành con số không bao giờ về 0 (đúng phát hiện từng bị bác ở Đ118, nay có phạm vi là nó thành thật). Form tạo có ô "Gửi tới phụ huynh: Nhóm mình / Toàn trường"; thẻ khảo sát mang tên nhóm cho nhà hai con biết phiếu hỏi về bé nào. **App đời cũ không gửi phạm vi thì giữ đúng nghĩa cũ: toàn trường** — không đổi hành vi nào đang có. Bộ canh mới `test:khao-sat-theo-nhom` (25 bài) đi trọn đường: tạo đúng phạm vi → nhà ngoài phạm vi không thấy / không mở / không trả lời được, huy hiệu không nhích, Cấp 3 không với sang cơ sở khác; **đã chạy trên bản chưa vá: đỏ 11 chỗ**. VERSION sw v76 → v77. `npm test` 3797 → **3822**, `test:giao-dien` **526**, FAIL 0 cả hai | Yêu cầu 02/09 |
| 02/09/2026 | **Đ119c — CI trên GitHub xanh lại được: job `npm test` thiếu `fetch-depth: 0`.** Mở GitHub ra xem (điều báo cáo trước tự nhận là đã quên) thì thấy Actions **đã thực thi thật từ 01/09** — 5 job, ~7 phút, **bộ giao diện 526 bài xanh ngay trên máy GitHub** — nhưng job `npm test` đỏ ở mọi lần đẩy: bước checkout của riêng job đó dùng clone nông mặc định, `test/nen-chung.test.mjs` không tìm thấy điểm tách `bc9dfa3` và sập bằng stack trace, các bài sau không chạy. Ba job canh khác đã đặt `fetch-depth: 0` từ đầu. Vá hai vế: thêm `fetch-depth: 0`, và bài canh đó nay **dừng bằng một câu nói rõ "kho clone nông"** thay vì đổ lỗi thô — đã thử trên bản `clone --depth 1` (in đúng câu, 1 FAIL) và bản đủ lịch sử (14/14). Bài học ghi vào mục 4.2b của báo cáo: đỏ trên CI mà không đỏ ở máy thì nhìn vào cấu hình CI trước khi nghi mã | GitHub Actions #127–#130 |
| 02/09/2026 | **Đ120 (a–c) — VÒNG RÀ ĐỐI KHÁNG nhắm vào chính 30 commit của nhánh.** Người dùng hỏi "còn việc gì phải làm/test không"; thứ còn thiếu là chưa ai soi độc lập diff của nhánh (79 tệp, ~2.700 dòng). Dựng 10 lăng kính + 3 người phản bác/phát hiện; **hạn mức phiên cắt ngang** — 7/10 lăng kính chạy xong (36 thô → 27 sau gộp), vòng phản bác hỏng toàn bộ, nên **tự đối chiếu bằng mã từng phát hiện** (ghi rõ độ tin ở sổ). Vá 23, hoãn 4 (hiệu năng Cambridge/Album, chờ quyết định giữ/gỡ). Đáng kể: (1) **bộ test đầy đủ bắt được chính bản vá của đợt này** — danh sách hội thoại cho quản trị hỏi cột `classes.campusId` không tồn tại → `GET /api/messages` 500 với quản trị cơ sở; đỏ ở bài `chuc-vu` trước khi commit, sửa bằng một luật `nhomPhongChat` dùng chung cho danh sách và huy hiệu; (2) sửa mẫu báo cáo nhận nhầm dòng cùng tên "Lưu ý" giữa hai nhóm → nay so cả nhóm; (3) Kế hoạch của bé: Lưu lần hai sau đụng độ đè cả bé cô không gõ → nay **chỉ gửi bé có sửa**; (4) "Áp cho cả nhóm" ở nhật ký không được nháp giữ (tác dụng phụ của Đ118o) → đánh dấu ô đã điền; tập ô đã gõ reset sau lưu thành công; cờ nhà trẻ tính theo ngày đang xem ở cả GET; (5) CSV: dấu nháy lẻ thôi nuốt cả tệp; (6) khảo sát: nhóm đã đóng vẫn đọc lại được với cô/quản trị, Cấp 3 không đóng khảo sát cơ sở khác, bộ lọc dựng một lần; (7) ô "Gửi cho nhóm" của văn phòng cơ sở chỉ liệt kê nhóm cơ sở mình (`me.user.coSo`, `classes[].campusId`); (8) chuyển năm học: xem trước ghi "giữ nguyên", kết quả đếm nhóm giữ nguyên; (9) PUT phân công tự giữ cô đang khoá đang có trong nhóm; `setClassTeachers` một cô chính duy nhất (Đ120a, commit riêng); (10) `/API/lac` trả JSON 404 thay vì index.html; ô năm học ở trang chủ chỉ cho gia đình; thực đơn cơ sở ghi đủ ngày giờ; hai bài canh tự siết (ngày rời trường tính từ hôm nay; khung SQL trong template literal). 20 phép kiểm mới, các bản vá chính đều **thử đỏ trên bản chưa vá**. VERSION sw v77 → v78. `npm test` 3822 → **3842**, `test:giao-dien` **526**, FAIL 0 cả hai | `docs/RA-SOAT-2026-09.md` mục "Vòng rà ĐỐI KHÁNG" |
| 03/09/2026 | **Đ121 — người dùng chốt món cuối của sổ rà soát: GIỮ NGUYÊN tàn dư tiểu học (Xe buýt, Nề nếp) và Cambridge, "sau này làm sau".** Không tắt thêm, không gỡ mã, không đụng dữ liệu — cùng cách chốt với N3 ngày 30/08. Hiện trạng đã đúng ý đó: Xe buýt (A2), Nề nếp (N3) và Cambridge đều **tắt sẵn** (`defaultEnabled: false`), bật lại bằng một lượt bấm trong Quản trị → Tính năng; `routes/timetable.js` mà sổ rà soát từng xếp vào nhóm này thực ra đã là **Lịch sinh hoạt** mầm non đang bật, không phải tàn dư. Ba món hiệu năng Cambridge hoãn ở Đ120 ở nguyên nhãn hoãn, mốc làm: **trước khi trường bật Cambridge** (cần bảng phụ `cambridge_anh`); món Album mức thấp không dính quyết định này. **Mã không đổi một dòng**, chỉ sổ sách | Quyết định 03/09 |
| 03/09/2026 | **Đ122 — tệp khóa gói lệch khỏi `package.json` suốt sáu ngày mà không bộ canh nào kêu.** Lộ ra ở lần đầu người dùng cài app 2 trên máy mình: `npm install` báo một lỗ mức vừa, và `git status` đỏ ngay `package-lock.json` dù chưa sửa gì. Đào ra: ngày 27/08 (N2) gỡ bốn gói `@capacitor/*` khỏi `package.json` nhưng tệp khóa không được làm lại — mang **385 mục thừa** (510 so với 125 gói thật), tên gốc vẫn là `school-connect` của app 1. `npm ci` ở CI và Docker lấy `package.json` làm gốc nên cài vẫn đúng (đã thử cả hai kiểu: 124 và 102 gói, không có Capacitor) — vì thế không ai thấy; nhưng `npm audit` đọc cả tệp khóa nên báo **11 lỗ toàn của gói không ai cài**, kể cả một lỗ "nghiêm trọng" ở `tar`, che mất lỗ thật duy nhất: `qs` 6.15.3 — bộ đọc chuỗi truy vấn của Express, mọi yêu cầu đi qua. Vá: làm lại tệp khóa cho khớp, nâng `qs` lên 6.16.0, `npm audit` về 0. Bộ canh mới `test:khoa-goi` (16 bài) **không gọi `npm`** để chạy y hệt trên Windows lẫn CI — tự đi lại luật tìm gói của Node xuất phát từ `package.json`, mục nào không ai với tới là thừa; **đã chạy trên tệp khóa cũ: đỏ 4 chỗ, đếm đúng 385 mục thừa**. Ghi sổ nợ app 1 (không bắt buộc): cùng dòng Express nên gần như chắc chắn cùng bản `qs`. `npm test` 3842 → **3858**, FAIL 0 | Lần cài đầu trên máy người dùng |
| 03/09/2026 | **Đ123 — `docs/MAY-CHU-THU-ORACLE-APP2.md`: chạy bản thử app 2 trên máy Oracle đã dựng cho app 1.** Người dùng hỏi cách đưa bản thử lên mạng rồi hỏi chạy trên VPS cũ thay app 1. Tài liệu viết cho đúng máy đó (người dùng `ubuntu`, Caddy, `casa-school.duckdns.org`): tắt `schoolconnect` giữ dữ liệu, clone nhánh làm việc vào `/opt/casa-mamnon`, **dựng dữ liệu bằng `ban-thu --khong-chay`** thay vì seed tay (production cố ý dừng khi còn mật khẩu mẫu; tám phân hệ tắt sẵn), dịch vụ systemd cổng 3000 + `FORCE_HTTPS=1`, Caddy giữ nguyên, sao lưu và soát máy, cập nhật, quay lui hai lệnh; **Phần 0** rút gọn cách dựng lại máy Oracle từ đầu (tài khoản, mạng trước máy, Ubuntu 24.04, hai lớp cổng, Node, Caddy, DuckDNS) cho trường hợp máy cũ đã xoá. Mở đầu bằng cờ **máy ở nước ngoài — chỉ dữ liệu mẫu**. Chỉ dùng `DATA_DIR=/var/lib/casa-mamnon` nên qua được bài canh đường dẫn tài liệu trong `test:kiem-tra-may-chu`. README và cờ đầu tài liệu Oracle cũ trỏ sang | Yêu cầu 03/09 |
| 03/09/2026 | **Đ124 — TRANG CHỦ THEO VAI, và thông báo / khảo sát nói rõ gửi cho ai** (hai điểm người dùng yêu cầu sau buổi thử trên máy Oracle). (1) **Phạm vi gửi**: máy chủ kèm `toanTruong` / `tenNhom` / `tenCoSo` cho từng thông báo và khảo sát (`lib/thong-bao.taoMoTaPhamVi`, bảng nhớ theo lượt gọi); dòng danh sách và hộp chi tiết ghi "Toàn trường" hay "Nhóm Chồi 2 · Cơ sở 1"; ô chọn nhóm khi gửi kèm tên cơ sở với trường nhiều cơ sở. (2) **Cô**: bảng "Hôm nay ở nhóm" ngay dưới hero — 20–25 bé nhìn một lượt thành chip có chấm màu điểm danh (cùng bảng màu `UI.ATT_STATUS` với màn Điểm danh) và dấu thuốc / đơn chờ / đã ghi nhật ký / đã đón về, dãy số đếm việc, nút việc hằng ngày kèm số còn lại, cô nhiều nhóm có seg đổi nhóm; đường mới `GET /api/dashboard/hom-nay?classId=` (qua `canAccessClass`; vế của phân hệ đang tắt là **null** chứ không phải 0; bảng phân hệ khác chỉ đọc khi đang bật và trong khối bắt lỗi; một câu cho cả nhóm). (3) **Văn phòng / ban giám hiệu**: thay ô chọn bé phẳng của cả trường bằng **cây cơ sở → nhóm** với số đếm hôm nay (`GET /api/dashboard/tong-quan`, cắt theo `phamViCoSo`; chức vụ không mở hồ sơ bé — Nhân sự, Kế toán, Marketing — thấy cây nhưng không mở được màn từng bé, máy chủ 403), bấm nhóm → màn `#/dashboard/nhom/<mã>` (danh sách bé với trạng thái việc), bấm bé → Hồ sơ của bé với **ô chọn theo cấp** `UI.thanhChonBeTheoCap` (một `<select>` gom `<optgroup>` "Cơ sở › Nhóm"; hàm mới bên cạnh hàm cũ theo luật ba bước, 14 màn chuyển sang gọi). (4) **Co giao diện cho cô và văn phòng** qua `body[data-vai]` (app.js thêm đúng một dòng): hero thấp hơn, ô biểu tượng 48px, thẻ và dòng danh sách gọn hơn; trên máy tính khung rộng 1180px, 8 cột biểu tượng, cây cơ sở xếp thành cột. **Gia đình không đổi một pixel.** Lưới biểu tượng vẽ trước, phần hôm nay nạp sau — máy chủ đời cũ hay mất mạng thì trang chủ y như trước. Mọi con số là số đếm VIỆC của người lớn: không phần trăm, không so bé này với bé kia, "chưa điểm danh" tô màu trung tính (bộ canh QUY TẮC 2 và 4 xanh, có một chú thích bị bắt vì chữ "xếp hạng" và đã viết lại). Hai tệp dùng chung mỗi tệp một commit riêng, khế ước cập nhật bằng `--cap-nhat`. Bộ canh mới `test:trang-chu-theo-vai` (60 bài, soi kỹ phân quyền: cô nhóm khác 403, quản lý cơ sở 2 hỏi nhóm cơ sở 1 403, Nhân sự 403 ở màn từng bé, cô hai nhóm không nói nhóm nào thì 400, số đếm đo bằng hiệu số) và `test:trang-chu-giao-dien` (34 bài trên Chromium, chụp 6 ảnh cả điện thoại lẫn máy tính). VERSION sw v78 → v79. `npm test` 3858 → **3919**, `test:giao-dien` 526 → **560**, FAIL 0 cả hai | Yêu cầu 03/09 sau buổi thử |
