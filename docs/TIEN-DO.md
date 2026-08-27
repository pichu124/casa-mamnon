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
| Tuổi bé tính bằng **hiệu hai con số năm** | Bé sinh tháng 12 bị ghi già hơn tuổi thật gần trọn một năm. Ở tuổi 2–6, sáu tháng là khoảng cách thật sự, và cô nhìn con số đó để chờ đợi ở bé | Tính theo ngày sinh, hiện kèm tháng ("4 tuổi 8 tháng"); bé chưa tròn một tuổi thì đếm bằng tháng |

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
| Ô nhập chiều cao / cân nặng gợi ý **"130 cm", "28 kg"** | Số của trẻ lớp 4, trên form dành cho bé 2–6 tuổi — trong khi chú thích của chính `data/seed.js` đã viết "số liệu sai lứa tuổi là thứ cô và y tế trường nhận ra ngay, và nhận ra là mất tin vào cả bộ dữ liệu" | Đổi thành 105 cm / 17 kg, và "VD: Cân đo định kỳ đầu năm" |
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

> **Điểm chung của cả tám dòng:** không dòng nào làm app hỏng, không dòng nào
> rò dữ liệu, và không dòng nào bài kiểm thử bắt được — vì bài kiểm thử hỏi
> "máy chủ trả về đúng không", còn đây là "người ngồi trước màn hình có hiểu
> đúng không". Chỉ đăng nhập bằng từng vai rồi đọc từng màn mới thấy.

---

### G0.6 — Con số kiểm thử hiện tại

| Bộ | Số bài |
|---|---|
| `npm test` (không cần trình duyệt, ~4 phút) | **1238**, FAIL 0 |
| `npm run test:giao-dien` (cần Playwright, chạy trên Chromium thật) | **245**, FAIL 0 |

Bốn bộ lớn nhất, và việc chúng canh:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:lo-hong` | 282 | Mọi lỗ hổng đã vá — **bất khả xâm phạm** |
| `test:khe-uoc` | 116 | Hình dạng của các tệp dùng chung |
| `test:co-lap-loi` | 101 | Nguyên tắc số 1 — phá hỏng từng thứ rồi kiểm app vẫn đăng nhập được |
| `test:nhom-lop` | 93 | Nhiều cô một nhóm (G0.4 · G0.5 · N8) |

Bốn bộ **mới của app 2**, không có ở app 1:

| Bộ | Bài | Canh gì |
|---|---|---|
| `test:nhom-lop` | 93 | Mô hình nhiều cô một nhóm, và script chữa cháy phân công |
| `test:thuchup` | 55 | Phép thử ghi nhanh + ranh giới nháp của cô (lớp dữ liệu 1) |
| `test:sao-luu` | 48 | Vòng sao lưu → hỏng → khôi phục, chạy thật trên dữ liệu tạm |
| `test:goi-ten` | 34 | App nói tiếng của trường mầm non, tên app, và cách nói tuổi bé |
| `test:quy-tac-4` | 12 | QUY TẮC 4, kiểu **bánh cóc**: món nợ N3 chỉ được giảm |
| `test:nhieu-nhom` | 35 *(trình duyệt)* | Cô dạy hai nhóm mở được cả hai; quản trị biết mình đang xem bé nào |

Nền lấy từ app 1 là **932 bài**. Phần tăng thêm không chỉ nằm ở bốn bộ mới: các
bộ cũ cũng dày lên khi mô hình đổi (ví dụ `test:lo-hong` nhận thêm mục `[8b]` canh
việc máy chủ dừng khi dữ liệu nằm trong kho mã). Con số tổng sẽ **giảm** khi gỡ
các phân hệ riêng của tiểu học (N3) và **tăng** khi thêm phần mầm non.

Bốn bộ canh dưới đây đều có một mục **"phép thử ngược"** — dựng dữ liệu bẩn rồi
soi bằng chính hàm quét đó: `test:du-lieu`, `test:goi-ten`, `test:quy-tac-4`,
`test:sao-luu`. Một bài canh luôn xanh là một bài canh vô dụng.

Riêng `test:goi-ten` còn canh cả **ngoại lệ của chính nó**: dựng một tệp có cả
dòng được chừa lẫn dòng phải bắt, rồi kiểm rằng ngoại lệ chỉ chừa đúng một dòng.
Một ngoại lệ viết rộng quá sẽ lặng lẽ mở cửa cho cả tệp.

---

## Việc đã biết trước, chưa làm — không được quên

Ghi ở đây thay vì để trong đầu, vì phiên làm việc sau sẽ không nhớ.

| # | Việc | Vì sao quan trọng | Làm ở |
|---|---|---|---|
| N1 | Bộ tài liệu triển khai vẫn mô tả **máy chủ của app 1** | **⏳ đã dán cảnh báo, chưa viết lại.** Cả 5 tệp (2 markdown, 1 html, 1 Word, + `docs/SAO-LUU.md`) nay mở đầu bằng một khối nói rõ phần nào còn dùng được, phần nào KHÔNG. **Viết lại thì phải chờ nhà trường chốt VPS và tên miền (N7)** — không có hai thứ đó thì viết ra cũng chỉ là đoán | Sau N7 |
| N2 | `android/`, `capacitor.config.json`, `render.yaml` là vỏ đóng gói của app 1 | App 2 đã chốt chỉ làm PWA. Để nguyên thì vô hại nhưng gây hiểu nhầm | GĐ 1 |
| N3 | Phân hệ riêng của tiểu học vẫn còn: `hocsinh-cu`, `namhoccu`, học bạ theo học kỳ, **nề nếp/thi đua có xếp hạng** | Xếp hạng trẻ **đi ngược QUY TẮC 4**. Tuyệt đối không để lọt sang màn hình mầm non | GĐ 1, gỡ theo đúng quy trình "bỏ tính năng" |
| N4 | Chưa có tầng **cơ sở** (3 cơ sở) và vai **quản lý cơ sở** | Là mô hình thật của trường; càng để muộn càng phải sửa nhiều chỗ | GĐ 0/1 |
| N5 | `DATA_DIR` mặc định là `./data` nằm trong kho mã | **✅ đã canh bằng máy** — chạy `NODE_ENV=production` với dữ liệu trong kho mã thì máy chủ **DỪNG trước khi mở cổng**, không chỉ nhắc vào log. Mặc định vẫn là `./data` cho lúc chạy thử | 26/08/2026 |
| N6 | Bài test canh QUY TẮC 4 | **✅ có rồi** — `test/quy-tac-4.test.mjs`, kiểu **bánh cóc**: món nợ N3 chỉ được giảm. Gỡ xong N3 thì hạ số trong `NO_DA_BIET` về 0 và bài test tự siết chặt | 26/08/2026 |
| N7 | Chưa đăng ký VPS Việt Nam + tên miền đứng tên trường | Việc của nhà trường; chặn phần triển khai | Nhà trường làm |
| ~~N8~~ | ~~`sua-quyen-chu-nhiem.js` chỉ dọn được cái gương~~ | **✅ xong** — và hoá ra nguy hiểm hơn tôi ghi lúc đầu, xem mục bên dưới | 26/08/2026 |
| ~~N9~~ | ~~Giao diện nói tiếng tiểu học~~ | **✅ xong** — xem mục "Đổi cách gọi tên" bên dưới | 26/08/2026 |
| ~~N10~~ | ~~Chưa có bài test canh cách gọi tên~~ | **✅ xong** — `test/goi-ten.test.mjs`, 10 bài | 26/08/2026 |
| ~~N11~~ | ~~Ô "Khối cuối cấp" là ô điều khiển chết~~ | **✅ xong** — máy chủ trả thêm cờ `theoBac`, màn hình giấu hẳn ô đó khi mọi nhóm đi theo bậc | 26/08/2026 |
| N13 | **Lần triển khai đầu tiên lên Render là một vòng kẹt** | Ổ đĩa mới là ổ trống; `NODE_ENV=production` + CSDL trống → máy chủ dừng có chủ ý (đúng). Nhưng Shell của Render chỉ mở được khi dịch vụ đang chạy → không tạo được tài khoản quản trị → dịch vụ không bao giờ chạy. **Đã viết thẳng vòng kẹt và hai đường ra vào `render.yaml`**, chưa vá bằng mã: cách vá (nhận tài khoản quản trị đầu tiên qua biến môi trường) là quyết định về triển khai, mà nơi triển khai còn chờ N7 | Sau N7 |
| N14 | `docs/` vẫn ghi `/var/lib/schoolconnect`, `scripts/` nay ghi `/var/lib/casa-mamnon` | Người vận hành làm theo lời nhắc của máy chủ rồi chạy script theo lời nhắc của tài liệu — script mở một CSDL TRỐNG và báo "mọi thứ đều sạch". Trấn an sai còn tệ hơn báo lỗi. `scripts/` đã thống nhất và có bài canh; `docs/` để nguyên vì đang mang cảnh báo "chưa cập nhật cho app 2" (N1) — sửa đường dẫn trong đó là làm nó TRÔNG như đã cập nhật | Cùng N1 |
| N12 | Phân hệ vẫn tên là **"Thời khóa biểu"**, nội dung bên trong đã là **lịch sinh hoạt một ngày** (đón bé, ăn, ngủ trưa, trả bé) | Dữ liệu và cái tên đang nói hai chuyện khác nhau. Không sai tới mức hỏng, nhưng cô sẽ đọc "thời khóa biểu" rồi tìm "tiết học". Cố ý KHÔNG gộp vào N9 vì `CLAUDE.md` chỉ liệt kê ba cặp từ (bé, nhóm lớp, cô) — đổi tên một phân hệ là quyết định của nhà trường | Hỏi nhà trường rồi làm |

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
