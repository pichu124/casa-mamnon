# Lỗi ở phần nền — vá thế nào khi có hai kho mã

App 1 (**SchoolConnect**, trường tiểu học, đang chạy thật) và app 2 (**CASA Mầm
non**, kho mã này) dùng chung một phần nền. App 2 nhân bản từ app 1 tại **điểm
tách `bc9dfa3078f3e2e3b646e806b6a3c9a204bdb8f7`** (tag `nen-tu-app1-2026-08-26`),
sau đó hai bên đi hai hướng.

> Tag mới chỉ có ở bản trên máy, **chưa đẩy được lên GitHub** — máy chủ trung
> gian của môi trường làm việc từ chối đẩy tag (403). Vì vậy mọi chỗ dưới đây
> ghi kèm mã commit đầy đủ: mã commit thì luôn tra được, tag thì chưa chắc.
> Tạo lại tag trên GitHub bất cứ lúc nào cũng được, trỏ vào đúng mã commit trên.

Cái giá của việc tách kho là: **một lỗi ở phần nền tồn tại ở cả hai nơi**, và sửa
một bên không tự lan sang bên kia. Tệp này quy định khi nào bắt buộc phải vá cả
hai, khi nào không.

---

## ĐÍNH CHÍNH 15/09/2026 — "app 1 đang chạy thật cho ~300 gia đình" LÀ SAI

Câu hỏi số 9 gửi nhà trường ngày 14/09 hỏi thẳng: *"App cũ hiện có dữ liệu thật
của gia đình nào không?"*. Trường trả lời ngày 15/09:

> **"Ko, dữ liệu đều đang chỉ dùng để test phần mềm"**

Con số "~300 gia đình" lặp lại **hơn mười lần** trong chính tệp này và được dùng
làm căn cứ xếp ưu tiên cho gần như mọi món nợ ở bảng dưới — *"ở app 1 nặng hơn
vì đang thu tiền thật của ~300 gia đình"*, *"app 1 đã chạy đủ lâu để có học sinh
ra trường quá 12 tháng"*. **Căn cứ ấy không đứng nữa.**

**BA HỆ QUẢ, VÀ CHÚNG NGƯỢC CHIỀU NHAU:**

1. **Mức khẩn cấp của mọi món nợ bên app 1 GIẢM.** Không có hồ sơ trẻ thật,
   không có tiền thật, không có ảnh khuôn mặt thật thì một lỗi rò rỉ bên đó là
   lỗi trên dữ liệu thử. Những dòng đánh dấu *"Món nợ ưu tiên cao nhất"* vì lý
   do "app 1 nặng hơn" cần đọc lại: chúng vẫn là lỗi thật và vẫn phải vá, nhưng
   lý do khẩn cấp thì không còn.

2. **Việc GỘP bốn bản vá sang app 1 nay AN TOÀN hơn hẳn.** Điều làm việc gộp
   đáng ngại là chạy mã chưa kiểm thử lên một cơ sở dữ liệu có hồ sơ trẻ thật.
   Trường đã nói không có, và cũng đã nói *"cứ gộp vào cho tôi"*.

3. **NHƯNG RỦI RO MỚI XUẤT HIỆN: ĐỘ TIN CỦA SỔ SÁCH.** Một con số sai nằm ở chỗ
   dễ tin nhất trong kho, lặp hơn mười lần, và được dùng để xếp ưu tiên suốt
   nhiều tuần. Nó không tự sinh ra — nó chép từ tài liệu gốc của dự án và không
   ai kiểm lại. Chừng nào chưa rõ **ai viết con số ấy và từ đâu**, thì mọi con
   số khác cùng nguồn đều đáng ngờ như nhau.

**`CLAUDE.md` CŨNG NÓI CÂU ẤY** (*"đang chạy thật cho ~300 học sinh"*, ngay dòng
thứ tư). **Không tự sửa** — quy định của chính tệp đó nói *"nêu là nêu, không
phải tự ý làm"*. Đã nêu với chủ dự án; sửa hay không là quyết định của anh.

**CHƯA GỘP GÌ SANG APP 1 TRONG ĐỢT NÀY.** Kho `pichu124/School` không nằm trong
phạm vi truy cập của phiên làm việc này, nên việc gộp bốn bản vá phải làm ở một
phiên có quyền vào kho đó. Danh sách bốn bản vá vẫn nằm nguyên ở bảng bên dưới.

---

## Phần nào là "nền chung"

### Cách nhận ra, chỉ một câu lệnh

```bash
git cat-file -e bc9dfa3:<tệp> && echo "CÓ ở điểm tách"
```

**Tệp có mặt TẠI điểm tách `bc9dfa3` thì app 1 đang chạy một bản của chính nó.**
Đó là toàn bộ định nghĩa. Sửa nó ở app 2 bao nhiêu lần cũng không đổi điều đó.

> **Mẹo cũ ở chỗ này SAI, và sai về phía bỏ sót.** Nó ghi: *"nếu commit gần nhất
> nằm trước điểm tách thì tệp đó vẫn còn là nền chung"* — tức là hễ app 2 đụng
> vào một tệp thì tệp ấy thôi là nền chung. Ngược hẳn. `lib/db.js` sửa ở đợt Đ44
> vẫn là nền chung, vì bản app 1 đang chạy là bản tại điểm tách, và lỗ hổng vá ở
> Đ44 nằm đúng trong bản đó. Ai tin mẹo cũ sẽ bỏ qua **đúng những tệp vừa sửa** —
> tức đúng những tệp có bản vá cần mang sang.

### Bảng phân loại

Danh sách dưới đây là **toàn bộ** tệp nền có mặt tại `bc9dfa3` và còn sống tới
hôm nay. `npm run test:nen-chung` canh cho không tệp nào lọt khỏi bảng.

| Nhóm | Tệp | Có coi là nền chung không |
|---|---|---|
| Thư viện lõi | `lib/db.js`, `lib/auth.js`, `lib/modules.js`, `lib/uploads.js` | **Có** |
| Thư viện phụ | `lib/csv.js`, `lib/password.js`, `lib/importer.js`, `lib/lich-su-lop.js`, `lib/sua-thu-hoi.js` | **Có** — ít bị sửa hơn nhưng cùng một bản mã. `lib/password.js` là chỗ băm mật khẩu, tức chỗ một lỗ hổng ở đây là lỗ hổng ở cả hai trường |
| Máy chủ | `server.js` | **Có** — chốt vị trí dữ liệu, cảnh báo mật khẩu mẫu, vòng đời phiên đăng nhập đều ở đây |
| Giao diện dùng chung | `public/js/ui.js`, `public/js/app.js`, `public/js/api.js` | **Có** |
| Vỏ PWA | `public/sw.js`, `public/manifest.json` | **Có** |
| Kiểu dáng | `public/css/app.css` | **Có** — một lớp CSS hỏng thì hỏng ở cả hai app |
| Bộ canh | `scripts/kiem-tra-commit.js`, `scripts/kiem-tra-du-lieu.js`, `scripts/kiem-tra-may-chu.js`, `scripts/cai-hook.js` | **Có** |
| Sao lưu / khôi phục | `scripts/backup.js`, `scripts/restore.js` | **Có** |
| Việc vặt vận hành | `scripts/create-admin.js`, `scripts/prepare-mobile.js`, `scripts/xuat-quy-trinh.js`, `scripts/migrate-json-to-sqlite.js` | **Có**, nhưng gần như đóng băng. `migrate-json-to-sqlite.js` là đường một chiều của app 1 đời cũ — app 2 không bao giờ chạy nó |
| Chữa cháy phân công | `scripts/sua-quyen-chu-nhiem.js` | **Một phần** — app 2 đã đổi sang mô hình *nhiều cô một nhóm* (G0.4) nên phần bảng `class_teachers` KHÔNG mang sang được; phần còn lại thì có |
| Cấu trúc bảng | `lib/schema.sql` | **Một phần** — bảng nền chung, bảng riêng thì không |
| Khung kiểm thử | `test/*.mjs` phần dựng máy chủ và tiện ích chung | **Có** |
| Tính năng | `routes/*.js`, `public/js/views/*.js`, `modules/**` | **Không** — hai bên khác nhau từ GĐ 1 |

> **Bảng này từng chỉ có 13 tệp trong khi thực tế có 28.** Mười bốn tệp bị bỏ
> sót, trong đó có `server.js`, `lib/password.js` và `lib/importer.js` — ba chỗ
> mà một lỗi bảo mật rất có thể rơi vào. Sửa ở đợt Đ50, và từ đó có máy canh.

---

## Khi nào BẮT BUỘC vá cả hai kho

Chỉ hai loại. Ngắn có chủ đích — càng ít việc bắt buộc thì việc bắt buộc càng
được làm thật.

### 1. Lỗ hổng bảo mật hoặc rò rỉ dữ liệu

Ví dụ: một đường dẫn quên gọi `db.canAccessStudent`; phụ huynh xem được hồ sơ
con nhà khác; phiên đăng nhập không hết hạn đúng; tệp giả danh ảnh vượt được bộ
lọc; nội dung người dùng nhập chạy được mã trong HTML.

**Vì sao bắt buộc:** cùng một lỗi, cùng một cách khai thác, và cả hai bên đều là
hồ sơ trẻ em dưới 16 tuổi. Vá một bên rồi bỏ quên bên kia là để nguyên lỗ hổng ở
nơi có 300 gia đình đang dùng.

### 2. Lỗi làm mất hoặc hỏng dữ liệu

Ví dụ: sao lưu chạy nhưng tệp rỗng; khôi phục ghi đè nhầm; một câu SQL xóa nhiều
hơn ý định; nâng cấp làm bảng cũ không đọc được.

**Vì sao bắt buộc:** dữ liệu mất thì không có bản vá nào lấy lại được.

### Mọi thứ khác thì KHÔNG bắt buộc

Sửa giao diện, thêm tính năng, đổi cách hiển thị, tối ưu tốc độ, sửa lỗi chỉ gây
khó chịu chứ không mất dữ liệu — **để mỗi bên tự quyết**. Ép đồng bộ mọi thứ
nghĩa là quay lại một kho mã, mất đúng cái lợi vừa tách ra.

---

## Cách vá chéo

Vá ở kho phát hiện ra lỗi trước, chạy `npm test` xanh, commit **rồi mới** mang
sang kho kia. Không mang một bản vá chưa chạy được sang bên thứ hai.

**Cách 1 — chép commit (ưu tiên khi tệp hai bên còn giống nhau).**

```bash
# ở kho đích, thêm kho nguồn làm remote phụ (một lần duy nhất)
git remote add app1 <đường-dẫn-hoặc-URL-app-1>
git fetch app1
git cherry-pick <mã-commit>
```

Nếu `cherry-pick` báo đụng độ nghĩa là hai bên đã lệch — chuyển sang cách 2, đừng
cố gỡ đụng độ cho xong.

**Cách 2 — chép tay theo ý nghĩa.** Đọc bản vá bên kia, hiểu **lỗi là gì**, rồi
viết lại cho đúng bối cảnh kho này. Bắt buộc kèm bài kiểm thử tái hiện đúng lỗi
đó ở kho này — không mượn kết quả xanh của kho bên kia làm bằng chứng.

### Lời commit phải nhắc tới kho kia

Dòng cuối của lời commit, cả hai bên:

```
Nen-chung: đã vá cả hai kho (app1 <mã-commit> / app2 <mã-commit>)
```

Chưa vá xong bên kia thì ghi rõ đang nợ:

```
Nen-chung: CÒN NỢ app 1 — cùng lỗi, chưa vá
```

Nhờ vậy sau này `git log --grep="Nen-chung"` liệt kê được toàn bộ lịch sử vá chéo
và những món còn nợ, không phải nhớ bằng đầu.

---

## Sổ nợ

Mọi bản vá thuộc hai loại bắt buộc mà **chưa** vá xong cả hai kho phải nằm ở đây
cho tới khi trả hết. Trống là tốt.

| Ngày | Lỗi | Đã vá | Còn nợ | Ghi chú |
|---|---|---|---|---|
| 27/08 | Hồ sơ trẻ lọt vào ảnh Docker: `.gitignore` giấu tệp `.db` khỏi mắt người soát, nhưng `docker build` **không đọc** `.gitignore` nên vẫn đóng gói nó vào ảnh | app 2 — `2551b2a` | **app 1** | Loại 1 (rò rỉ dữ liệu). Cần đối chiếu `.dockerignore` của app 1 trước khi vá. (Ghi chú cũ nói "chưa mở kho app 1" — điều đó đã hết đúng từ 30/08, khi người dùng mở quyền vào kho `pichu124/School`; món này vẫn chưa đối chiếu, nhưng nay là vì chưa ai làm, không phải vì không vào được.) |
| 27/08 | Khôi phục dữ liệu chạy được trong lúc máy chủ ĐANG chạy → SQLite ghi đè lẫn nhau, hỏng âm thầm | app 2 — `8560f9c` | **app 1** | Loại 2 (mất dữ liệu) |
| 27/08 | `/healthz` công khai kể số phiên đăng nhập và thời gian chạy cho người **chưa đăng nhập** | app 2 — `616ce0c` | **app 1** | Loại 1. Cùng commit còn vá `restore:check` không đếm bảng phân công cô |
| 28/08 | Bộ canh dữ liệu **bỏ lọt chính tệp mà `restore.js` sinh ra**: `school.db.truoc-khi-khoi-phuc-<số>` không khớp mẫu `*.db` của cả bộ canh lẫn `.gitignore` | app 2 — Đ4 | **app 1** | Loại 1, và là lỗ do chính kho mã tự mở ra sau mỗi lần khôi phục |
| 28/08 | Hai bộ canh mật khẩu mẫu (`server.js`, `scripts/kiem-tra-may-chu.js`) chỉ soát đúng chuỗi trong `DEMO_PASSWORD`. Đặt biến đó thành một chuỗi ngẫu nhiên (`render.yaml` làm đúng vậy) là **mọi tài khoản còn giữ "123456" đều lọt, và bộ canh báo xanh trong khi cửa vẫn mở** | app 2 — Đ12 | **app 1** | Loại 1. Bản vá là soát CẢ chuỗi cấu hình LẪN "123456" — vài dòng, không đổi hành vi nào khác |
| 28/08 | `scripts/backup.js` chép ảnh sang `backups/uploads` và **không bao giờ xoá**: vòng đời 7 ngày / 4 tuần / 12 tháng chỉ áp cho `school-*.db.gz`. Chỗ ảnh trong `DATA_DIR` luôn gấp đôi và chỉ tăng, tới lúc đầy ổ thì cô đăng ảnh giữa buổi là hỏng | app 2 — Đ17 | **app 1** | Loại 2 (đầy ổ → không ghi được nữa). Ở app 1 nhẹ hơn nhiều vì trường tiểu học gần như không có ảnh, nên **ưu tiên thấp** — nhưng cùng một đoạn mã |
| 28/08 | `scripts/restore.js` **im lặng bỏ qua** mọi ảnh đã có sẵn trong `uploads/`, kể cả khi tệp trên đĩa khác hẳn bản trong bản sao (cụt, rỗng, hỏng). Người vận hành vừa khôi phục xong tưởng đã chữa hết, trong khi ảnh khuôn mặt trẻ vẫn đang hỏng — và ảnh là thứ duy nhất không dựng lại được | app 2 — Đ23 | **app 1** | Loại 2. Bản vá KHÔNG đè lên tệp đang có (tên tệp là 16 byte ngẫu nhiên nên trùng tên là trùng ảnh, mà bản trên đĩa có thể mới hơn) — chỉ **nói ra** danh sách tệp lệch dung lượng để người vận hành tự soi. Ở app 1 nhẹ hơn vì trường tiểu học gần như không có ảnh |
| 28/08 | `lib/importer.js` xoá dữ liệu cũ theo một danh sách bảng **viết tay chỉ có bảng lõi**. Nhập lại kho JSON đời cũ, hay chạy `npm run seed -- --force`, xoá sạch bé và nhóm nhưng ĐỂ NGUYÊN ghi chép của phân hệ về chính những bé vừa bị xoá — nhật ký ăn ngủ vệ sinh, quan sát, kế hoạch, sổ đón trả | app 2 — Đ32 | **app 1** | Loại 1 và loại 2 cùng lúc: dữ liệu mồ côi, và **ghi chép về một đứa trẻ sống sót sau khi đứa trẻ đó đã bị xoá** — Nghị định 13/2023 cho quyền xoá. Ở app 1 nhẹ hơn vì bên đó chỉ có phân hệ `hocphi`, mà bảng của nó CÓ khoá ngoại `ON DELETE CASCADE`; vẫn nên vá vì lỗi nằm ở cách viết danh sách |
| 29/08 | Màn **Học phí**: ô *Chọn bé* của người trong trường **không có tác dụng**. `render()` luôn lấy `students[0]`, còn `onchange` chỉ ghi `this._sid` rồi vẽ lại — nên văn phòng chọn bé A, màn lặng lẽ quay về bé đầu danh sách, và **khoản thu vừa tạo mang tên nhà khác** | app 2 — Đ39 | **app 1** | Loại 1 (dữ liệu của nhà này hiện trong hồ sơ nhà kia) **và là tiền**. Mã ở `modules/hocphi/view.js` giống hệt nhau tại điểm tách `bc9dfa3`, nên app 1 chắc chắn dính. Ở app 1 còn nặng hơn: app 1 đang thu tiền thật của ~300 gia đình, còn app 2 chưa có người dùng. **Món nợ ưu tiên cao nhất trong bảng này** |

| 14/09 | `lib/db.js` — chức vụ **Văn phòng cơ sở** không có `'/api/plans'` trong danh sách đường dẫn, trong khi `'/api/timetable'` thì có và Đ148 đã gộp hai thứ thành MỘT màn. `apiChoPhep` là danh sách trắng nên phân hệ `kehoach` bị lọc khỏi danh sách của họ, dải tab không được vẽ, và **chính vai được nhà trường giao việc soạn kế hoạch thì mở màn ra không thấy chỗ nào để soạn — màn hình cũng không báo lỗi gì**. Cùng loại *quên theo hướng đóng lại* với `'/api/dong-y'` đã vá trước đây ở ngay khối ấy | app 2 — Đ180 (`5b63994`) | **app 1** | Loại 3 (mất tính năng, không rò dữ liệu). App 1 cũng có chức vụ này và cũng có màn kế hoạch nên nhiều khả năng hở y hệt, nhưng **chưa mở kho kia đối chiếu được** — đây là suy đoán theo cấu trúc, không phải đã kiểm tận nơi. Bản vá là THÊM một phần tử vào mảng, không đổi không bỏ, khế ước không đổi |
| 14/09 | `public/js/app.js` — hai chuỗi hiện tên app ra màn hình đổi theo tên mới nhà trường chốt | app 2 — `9b3308f` | **KHÔNG chép sang app 1** | Không phải lỗi. Ghi lại để lần vá chéo sau không đối chiếu hai tệp rồi tưởng chúng đã trôi khỏi nhau: app 1 mang tên khác, nên hai dòng này CỐ Ý lệch |
| 19/10 | `.githooks/commit-msg` — thêm bước 4: `node scripts/xuat-huong-dan-thu.js --kiem-tra --ban-sap-commit` soát hai hướng dẫn thử chép từ bản chính trên claude.ai, bản chép tên khác và mọi tệp .md trong commit (bản đã `git add`), chặn commit có mật khẩu hay tên người | app 2 — Đ239x | **KHÔNG chép sang app 1** | Không phải lỗi. App 1 không có hướng dẫn thử chép từ claude.ai. Ghi lại để lần vá chéo móc sau không tưởng hai móc đã trôi khỏi nhau, và **chép móc từ app 1 sang thì GIỮ bước 4**: bỏ nó là commit tay lại có thể đưa mật khẩu lên kho |
| 19/10 | `server.js` (`kiemTraViTriDuLieu`) và `scripts/kiem-tra-may-chu.js` (mục *Vị trí dữ liệu*) soát "dữ liệu nằm trong kho mã" chỉ bằng `!path.relative(...).startsWith('..')`. Trên Windows, mã và dữ liệu **khác ổ đĩa** (mã ở `D:\casa-mamnon`, dữ liệu ở `C:\CasaMamNonData` — đúng chỗ câu hướng dẫn của `kiem-tra-may-chu` khuyên) thì `path.relative` trả nguyên đường tuyệt đối, không có `..`: app 2 chạy `NODE_ENV=production` là **máy chủ dừng ngay, không bật lên được**; bộ soát báo CẦN SỬA và in khối ⛔ oan. Lộ ra vì CI Windows đỏ (`test/kiem-tra-may-chu.test.mjs`, `test/lo-hong-da-va.test.mjs`) | app 2 — PR #14 (thêm `&& !path.isAbsolute(...)`, như `scripts/ban-thu.js` đã làm) | **app 1 — không bắt buộc** | Ở app 2 là Nguyên tắc số 1 (app không khởi động). **Đã đối chiếu tận nơi:** `bc9dfa3:server.js:147` cùng phép so, nhưng bên đó chỉ `console.warn` (cảnh báo oan, không chặn), và `bc9dfa3:scripts/kiem-tra-may-chu.js` cũng vậy. Không rò, không mất dữ liệu → không thuộc loại 1, 2. Bản vá một dòng mỗi chỗ, chép thẳng được |
| 19/10 | `scripts/restore.js` dọn tệp tạm `.khoi-phuc-*.db` khi bản sao lưu hỏng mà **chưa đóng kết nối SQLite** (`integrity_check` ném lỗi trước `db.close()`). Linux cho xoá tệp đang mở; Windows từ chối (EBUSY), nên tệp tạm nằm lại mãi trong thư mục dữ liệu — khớp đúng mẫu "bản lưu trước khi khôi phục" của bộ canh dữ liệu. Cùng kiểu rò ở khối gộp nhật ký ghi của dữ liệu cũ: checkpoint lỗi thì `renameSync(DB_FILE)` ngay sau bị Windows từ chối. Lộ ra vì CI Windows đỏ (`test/sao-luu.test.mjs` mục [5]) | app 2 — PR #14 (đóng kết nối ở nhánh lỗi / `finally`) | **app 1 — không bắt buộc** | **Đã đối chiếu tận nơi:** `bc9dfa3:scripts/restore.js:54-68` mở `db` trong `try` rồi `fs.unlinkSync(tmp)` ở `catch` khi kết nối còn mở — trên Windows nổ EBUSY kèm vết ngăn xếp thay vì câu báo gọn, tệp tạm nằm lại. Dữ liệu đang có không bị đụng → không thuộc loại 2 |
| 01/09 | Mật khẩu tạm sinh bằng `Math.random()` — đoán trước được khi biết vài giá trị nó từng sinh — ở CẢ HAI chỗ cấp mật khẩu: `scripts/create-admin.js` (tài khoản quản trị thật) và `routes/accounts.js` (cấp lại cho cô/phụ huynh, mật khẩu trả thẳng về màn hình) | app 2 — Đ117 | **app 1** | Loại 1, ưu tiên vừa (mật khẩu tạm buộc đổi ngay lần đầu nên cửa sổ hẹp). **Đã đối chiếu tận nơi:** `bc9dfa3:scripts/create-admin.js:37` và `bc9dfa3:routes/accounts.js:14` cùng một dòng `Math.random`. Bản vá một dòng mỗi chỗ: `crypto.randomInt` |
| 01/09 | Express khớp route **không phân biệt hoa/thường**, nhưng các chốt chặn đứng trước route lại so `req.path` nguyên bản với tiền tố chữ thường. Gõ `/API/...` là: `chanApiDaTat` (lib/modules.js) cho API của **phân hệ đã tắt** chạy như đang bật, và `server.js` quên gắn `Cache-Control: no-store` nên proxy được phép cache dữ liệu trẻ. (Tầng chức vụ dính nặng nhất — Kế toán mở được hồ sơ bé — nhưng tầng đó là mã riêng app 2, app 1 không có.) | app 2 — Đ117 | **app 1** | Loại 1. **Đã đối chiếu tận nơi:** `bc9dfa3:lib/modules.js:409-413` và `bc9dfa3:server.js:51` là đúng hai phép so đó. Bản vá chỉ là hạ đường dẫn về chữ thường trước khi so — vài dòng, kèm bộ canh `test/duong-hoa-thuong.test.mjs` chép sang được |
| 29/08 | `db.canAccessStudent` nhánh phụ huynh chỉ hỏi bảng `student_parents`, tức trả `true` **mãi mãi**. Mốc "gia đình còn xem hồ sơ 12 tháng sau khi bé rời trường" chỉ được cài trong `routes/hocsinh-cu.js`, nên **màn hình đó đóng đúng hạn còn mọi đường khác thì không**: gõ thẳng `/api/nhatky?studentId=`, `/api/health`, `/api/medicine`, `/api/hocphi` là đọc được hồ sơ một đứa trẻ đã rời trường nhiều năm | app 2 — Đ44 | **app 1** | Loại 1 (rò rỉ dữ liệu). Cả hai tệp — `lib/db.js` và `routes/hocsinh-cu.js` — sinh ra TRƯỚC điểm tách `bc9dfa3` và nhánh phụ huynh giống hệt nhau, nên **app 1 chắc chắn dính**. Ở app 1 nặng hơn: hồ sơ 5 năm tiểu học của ~300 gia đình, và app 1 đã chạy đủ lâu để có học sinh ra trường quá 12 tháng. Bản vá là thêm hai thứ vào `lib/db.js` (`SO_THANG_GIU_HO_SO`, `conHanXemHoSo`) rồi siết đúng nhánh phụ huynh — không đụng dữ liệu, không đổi hành vi của vai nào khác. **Đối chiếu lại 16/09: vẫn CHƯA về tới app 1** — `lib/db.js` tại `origin/HEAD` của app 1, nhánh phụ huynh của `canAccessStudent` vẫn là một câu đếm `student_parents` trần, trả `true` mãi mãi. Bản vá có được viết 30/08 (`f1c421f` · `59148bc` · `02b03c4`) nhưng nhánh đó không còn ở kho nào. |
| 30/08 | `scripts/restore.js` tìm ảnh ở `DATA_DIR/backups/uploads` — **ghi cứng**, trong khi `scripts/backup.js` ngay cạnh **có** `--out /mnt/usb` và tự quảng cáo điều đó ở dòng đầu tệp. Sao lưu ra ổ ngoài, ổ trong hỏng, khôi phục từ ổ ngoài: cơ sở dữ liệu về đủ (dòng 40 nhận đường dẫn tuyệt đối) còn **ảnh thì không**, vì máy đi tìm trong đúng cái thư mục vừa mất | app 2 — Đ62 | **app 1** | Loại 2 (mất dữ liệu vĩnh viễn). **Đã đối chiếu tận nơi tại `bc9dfa3`, không phải phỏng đoán:** `restore.js:95` ghi cứng, `backup.js:23` đọc `--out`. Ảnh là thứ DUY NHẤT không dựng lại được từ đâu khác. App 1 đang chạy thật cho ~300 gia đình. **Món nợ ưu tiên cao nhất trong bảng này** — và nó chỉ lộ ra đúng lúc người ta cần nó nhất **Đối chiếu lại 16/09: CHƯA về tới app 1.** Bản vá có được viết 30/08 (`083a88e`) nhưng nhánh `claude/no-nen-chung-app2` không còn ở kho nào — `scripts/restore.js` tại `origin/HEAD` của app 1 vẫn không đọc `--out`. |
| 30/08 | `lib/lich-su-lop.js` — `lopCuCuaPhuHuynh` chỉ hỏi quan hệ `student_parents`, mà quan hệ cha mẹ – con thì **không bao giờ hết hạn**. Đ44 gom luật "12 tháng" về `db.canAccessStudent` nhưng hai họ đường của LỚP CŨ (album lớp cũ, màn Năm học trước) **không đi qua hàm đó** | app 2 — Đ59 | **app 1** | Loại 1 (rò rỉ dữ liệu). **Đã đối chiếu tận nơi:** ở `bc9dfa3`, `lopCuCuaPhuHuynh` không có một dòng lọc hạn nào và `lib/db.js` bên đó chưa có `conHanXemHoSo`. Nặng hơn hồ sơ của chính bé đó: album lớp là **ảnh khuôn mặt CẢ LỚP**, phần lớn các em trong ảnh vẫn đang học. Dựng lại được ở app 2: một gia đình rời trường 3 năm vẫn tải về **đúng các byte của tấm ảnh**. Cùng một tài khoản, cùng một phiên, màn "Hồ sơ con đã ra trường" trả 403 kèm câu "chỉ tra cứu được trong 12 tháng" — nên nhà trường nhìn màn thứ nhất sẽ tin là cửa đã đóng **Đối chiếu lại 16/09: CHƯA về tới app 1.** Bản vá có được viết 30/08 (`59148bc`) nhưng nhánh `claude/no-nen-chung-app2` không còn ở kho nào — `lib/lich-su-lop.js` tại `origin/HEAD` của app 1 vẫn không có một dòng lọc hạn nào. |
| 30/08 | `server.js` phục vụ `/modules` bằng `express.static` với một cố gắng trả 404 đặt trong `setHeaders` — mà `setHeaders` chạy **sau khi** đã quyết định gửi tệp, nên nó không chặn được gì. Và khối này nằm **ngoài** lớp `auth.requireAuth` của `/api`, tức mở cho người **chưa đăng nhập** | app 2 — Đ66 | **app 1** | Loại 1 (lộ mã nguồn máy chủ). **Đã đối chiếu tận nơi:** `bc9dfa3:server.js:111-116` giống hệt, và nó đứng sau `app.use('/api', …requireAuth)` nên không được lớp đó che. App 1 có `modules/hocphi/`, nên bất kỳ ai cũng tải được `/modules/hocphi/routes.js` và `/modules/hocphi/schema.sql` — logic phân quyền và cấu trúc bảng của phần thu tiền. Bản vá là một middleware chặn thật trước `express.static`, vài dòng **Đối chiếu lại 16/09: CHƯA về tới app 1.** Bản vá có được viết 30/08 (`d121010`) nhưng nhánh `claude/no-nen-chung-app2` không còn ở kho nào — `server.js:111-116` tại `origin/HEAD` của app 1 vẫn đúng khối `express.static` với `setHeaders` trả 404 quá muộn. |
| 02/09 | `lib/csv.js` tách dòng **trước khi** xét ngoặc kép, nên ô chứa xuống dòng (Excel Alt+Enter — hay gặp ở cột ghi chú, địa chỉ) bị bẻ gãy thành hai dòng lệch cột. Danh sách bé nhập từ Excel lệch cột là hồ sơ sai mà không ai báo | app 2 — `7ba4ff7` (Đ118a) | **app 1** | Loại 2 (hỏng dữ liệu nhập) |
| 02/09 | `lib/importer.js` xoá dữ liệu cũ mà **bỏ sót `record_edits`** — cờ thu hồi mồ côi ở lại, và một bản ghi mới trùng id với bản từng bị thu hồi sẽ bị ẩn nhầm khỏi mọi màn hình | app 2 — `cf51455` (Đ118b) | **app 1** | Loại 2. App 1 dùng chung danh sách xoá viết tay này |
| 02/09 | `scripts/backup.js` ghi `.gz` **không nguyên tử** (script chết giữa chừng để lại bản cụt — vòng đời dọn có thể xoá mất bản tốt cùng ngày vì tưởng đã có bản mới) và chép cả tệp `.tmp` đang tải dở vào kho ảnh | app 2 — `deb2b91` (Đ118h) | **app 1** | Loại 2 (mất bản sao lưu). Cùng commit: `kiem-tra-may-chu.js` thôi nuốt cảnh báo của `restore:check` |
| 01/10 | `scripts/backup.js` mục 3b so "mốc lần đầu thấy ảnh vắng" với "bản sao cũ nhất còn giữ" bằng `>`. Hai mốc sinh ra cách nhau vài phần nghìn giây trong CÙNG một lượt; máy đủ nhanh thì trùng nhau tới từng mi-li-giây và ảnh bị dọn ngay — đúng chiều ngược với lời hứa "sai về phía giữ lâu hơn". Lộ ra vì `test/sao-luu.test.mjs` mục [7] xanh trên máy làm việc mà ĐỎ trên GitHub | app 2 — Đ221b (đổi thành `>=`, thêm mục [7c] dựng thẳng ca trùng mốc) | **app 1** | Loại 2 nhưng **ưu tiên thấp**: chỉ mất ảnh khi ảnh bị xoá đúng trong khoảng vài mi-li-giây giữa lúc chụp cơ sở dữ liệu và lúc quét ảnh của một lượt sao lưu, và app 1 gần như không có ảnh. Bản vá một ký tự, chép thẳng được |
| 08/10 | `scripts/backup.js` mục 3 — vòng đời giữ đúng MỘT bản mỗi ngày, bản MỚI NHẤT. Mà tài liệu dặn chạy sao lưu tay trước mỗi lần cập nhật, nên lần chạy tay ấy **xoá mất bản 02:00 tự động của chính hôm đó** (thấy tận mắt trên máy chủ thử app 2 ngày 08/10: chạy tay 09:54, bản 02:00 và bản 08:36 cùng biến mất). Ca hỏng thật: 8 giờ có người xoá nhầm, 10 giờ sao lưu "cho chắc" → bản sạch của hôm đó bị xoá, bản 10 giờ đã mang chỗ bị xoá, bản sạch gần nhất là 02:00 hôm trước — mọi thứ ghi trong cả ngày hôm trước mà bị xoá nhầm là mất hẳn. Bản sao "trước khi cập nhật" lúc giữa ngày cũng bị một lần sao lưu sau đó trong ngày xoá mất | app 2 — Đ235 | **app 1** | Loại 2 (mất dữ liệu vĩnh viễn). **Đã đối chiếu tận nơi:** `bc9dfa3:scripts/backup.js:118` là đúng dòng `if (!theoNgay.has(khoaNgay))` trên danh sách xếp mới → cũ (dòng 43 `.reverse()`), tức giữ bản mới nhất mỗi ngày. Bên đó khoá ngày còn tính theo giờ MÁY CHỦ (app 2 đã đổi sang giờ Việt Nam ở Đ2, `f7e08c2`) — chép bản vá thì chép theo ý nghĩa (cách 2), không cherry-pick. Bản vá: giữ bản ĐẦU và bản CUỐI mỗi ngày trong 7 ngày, mọi bản trong 48 giờ (tối đa 24, không tính bản mang giờ tương lai), tuần / tháng như cũ. Mục [12] của `test/sao-luu.test.mjs` chỉ dùng làm MẪU: app 1 tại `bc9dfa3` chưa có `test/sao-luu.test.mjs` lẫn `lib/ngay.js`, phải viết lại theo giờ máy chủ |
| 08/10 | `scripts/backup.js` mục 3 (và 3b) cùng `scripts/kiem-tra-may-chu.js` mục 5 đọc GIỜ SỬA TỆP (mtime) của bản sao lưu, không đọc giờ chụp ghi trong TÊN tệp. Chuyển máy chủ mà chép thư mục sao lưu bằng `scp -r` / `cp -r` không giữ giờ thì mọi bản mang cùng một mtime: vòng đời thấy cả kho là "bản của hôm nay" và **dọn sạch lịch sử theo tháng** (bản cũ: ngay lượt đầu; dựng lại được: 10 bản theo tháng còn 1); phần dọn ảnh tưởng mọi bản đều mới nên **dọn luôn ảnh mà các bản cũ còn cần**; bộ soát máy chủ báo bản đã cũ 72 giờ là "vừa chụp" (ĐẠT) — che mất việc lịch sao lưu ở máy mới chưa chạy | app 2 — Đ236 | **app 1** | Loại 2 (mất lịch sử sao lưu, mất ảnh trong bản sao). **Đã đối chiếu tận nơi:** `bc9dfa3:scripts/backup.js:113` là `const d = b.at` (mtime) làm khoá ngày / tuần / tháng, và `bc9dfa3:scripts/kiem-tra-may-chu.js:196-203` đo tuổi bản mới nhất bằng `mtimeMs`. App 1 tại điểm tách chưa có phần dọn ảnh (3b sinh ra ở Đ17 của app 2), nên bên đó chỉ dính vế mất lịch sử và vế bộ soát. Bản vá: tệp MỚI `scripts/moc-ban-sao.js` đọc giờ chụp từ tên `school-YYYYMMDD-HHMM` (tên hỏng thì lùi về mtime); vòng đời dùng giờ ấy; dọn ảnh và bộ soát dùng mốc SỚM HƠN trong hai mốc (sai về phía giữ ảnh lâu hơn / báo động sớm hơn). Bên app 1 tên bản sao theo giờ MÁY CHỦ, không phải giờ Việt Nam — phải viết lại theo ý nghĩa (cách 2) |
| 02/09 | `public/js/ui.js` — `avatar()` chèn `emoji` vào HTML **không qua esc** và chèn `bg` vào thuộc tính style không kiểm tra định dạng; `studentBar()` nhét id vào **chuỗi JS trong onclick** nơi `esc()` không đủ (trình phân tích thuộc tính giải mã `&#39;` về dấu nháy thật). Hồ sơ người dùng là dữ liệu nhập được → XSS lưu trữ, dùng ở hơn 30 màn | app 2 — Đ118m | **app 1** | Loại 1 (mã chạy từ nội dung người dùng nhập) |
| 11/09 | `public/js/api.js` ném lỗi chỉ mang CHỮ, không mang mã lỗi HTTP — nên mọi chỗ gọi buộc phải **đoán mã lỗi qua câu văn**. Màn "Nhận một bé" dò chuỗi *"đã có"* để nhận ra cảnh báo 409, mà câu 400 của mã bé trùng — *mã của bé "A1" đã có trong hệ thống* — cũng mang đúng chữ ấy: người dùng bấm Đồng ý, máy gửi lại y nguyên, máy chủ từ chối y nguyên. Một vòng không có lối ra, sinh ra từ việc đoán. | app 2 — `141102a` (commit riêng) | **app 1** | Loại 3 (khó dùng, không mất dữ liệu). Bản vá **CHỈ THÊM**: chữ của lỗi giữ nguyên từng ký tự nên mọi chỗ bắt lỗi theo cách cũ chạy y như trước; thêm `err.status = res.status` cạnh nó. Ở app 1 chưa biết có chỗ nào đang đoán mã lỗi qua câu chữ hay không — **cần grep trước khi vá**, nhưng bản thân việc thêm trường thì vô hại và nên mang sang để hai bản `api.js` không lệch nhau. |
| 30/08 | `routes/hocsinh-cu.js` đọc bảng `remarks` bằng `SELECT *` **không kèm điều kiện lọc thu hồi**. Cô bấm Thu hồi một nhận xét bấm nhầm sang bé khác → màn Nhận xét sạch, nhưng màn "Hồ sơ con đã ra trường" vẫn hiện nguyên dòng đó cho gia đình | app 2 — Đ73 | **app 1** | Loại 1 (rò rỉ) và là **quyền xoá dữ liệu theo Nghị định 13/2023** — nhà trường đã làm đúng thao tác, app mới là chỗ không thực hiện. **Đã đối chiếu tận nơi:** `bc9dfa3:routes/hocsinh-cu.js:92` là đúng câu SQL đó, và `bc9dfa3:lib/sua-thu-hoi.js` **đã có sẵn** `dieuKienConHien` — tức bản vá bên đó chỉ là gọi một hàm đang nằm sẵn trong kho. **Ở app 1 nặng hơn hẳn app 2:** app 2 đã tắt phân hệ Nhận xét từ A2, còn app 1 là trường tiểu học dùng nhận xét hằng ngày cho ~300 gia đình. Và đây là màn CHỈ GIA ĐÌNH mở — cô không có đường nào nhìn thấy để biết là chưa gỡ được **Đối chiếu lại 16/09: CHƯA về tới app 1.** Bản vá có được viết 30/08 (`0e3b15a`) nhưng nhánh `claude/no-nen-chung-app2` không còn ở kho nào — `routes/hocsinh-cu.js` tại `origin/HEAD` của app 1 vẫn không gọi `dieuKienConHien`. |

> ### ⚠️ BỐN MÓN 30/08 (VÀ CẢ Đ44) ĐÃ VIẾT BẢN VÁ NHƯNG **CHƯA VỀ TỚI APP 1** (sửa 16/09/2026)
>
> **Ô này trước đây ghi "ĐÃ TRẢ XONG". Đó là sai, và sai về phía nguy hiểm
> nhất: nó tuyên bố bốn lỗ bảo mật bắt buộc đã đóng trong khi chúng vẫn đang
> mở.** Ghi lại đây thay vì xoá đi, để lần sau ai đọc sổ cũng thấy được cái bẫy
> đã sập như thế nào.
>
> Chuyện thật sự đã xảy ra ngày 30/08: bốn món của đợt Đ59–Đ77 (và cả Đ44) **có
> được viết bản vá** ở kho app 1, trên nhánh `claude/no-nen-chung-app2`. Nhưng
> **nhánh đó chưa bao giờ được đẩy lên GitHub**, và phiên làm việc sinh ra nó là
> phiên chạy trong máy ảo tạm. Hôm nay nhánh ấy không còn tồn tại ở đâu: không
> ở kho app 1 trên GitHub, không ở bản sao nào. Mấy commit dưới đây tra `git
> show` vẫn ra nội dung, nhưng **không nhánh nào với tới chúng** — chúng là vật
> thể mồ côi trong đúng một bản sao, sống tới lần dọn rác kế tiếp là hết.
>
> | Món | Commit đã viết ở app 1 | Về tới app 1 chưa |
> |---|---|---|
> | Đ62 `scripts/restore.js` không mang ảnh về | `083a88e` | **Chưa** |
> | Đ44+Đ59 luật 12 tháng chỉ đúng ở một màn hình | `f1c421f` · `59148bc` · `02b03c4` | **Chưa** |
> | Đ66 `/modules` mở cho người chưa đăng nhập | `d121010` | **Chưa** |
> | Đ73 nhận xét đã thu hồi vẫn hiện | `0e3b15a` | **Chưa** |
>
> **Đối chiếu ngày 16/09 tại `origin/HEAD` của kho app 1** — đọc thẳng nội dung
> tệp, không tra lịch sử commit:
>
> | Chỗ phải đổi nếu bản vá đã về | Tình trạng hôm nay |
> |---|---|
> | `lib/db.js` — `SO_THANG_GIU_HO_SO`, `conHanXemHoSo` | **không có** |
> | `lib/lich-su-lop.js` — lọc hạn | **không có** |
> | `server.js:111-116` — chốt chặn trước `express.static` | **vẫn nguyên khối cũ**, `setHeaders` trả 404 sau khi đã quyết định gửi tệp |
> | `routes/hocsinh-cu.js` — `dieuKienConHien` | **không có** |
> | `scripts/restore.js` — đọc `--out` | **không có** |
> | `lib/db.js` — nhánh phụ huynh của `canAccessStudent` | **vẫn là một câu đếm `student_parents` trần** |
>
> Nhân thể đối chiếu cũng xác nhận lại được một điều ô cũ ghi ĐÚNG và vẫn đúng:
> **app 1 ĐÃ CÓ SẴN `SO_THANG_GIU = 12`** ở `routes/hocsinh-cu.js:23`, và đang
> nói câu *"Hồ sơ của em chỉ tra cứu được trong 12 tháng sau khi rời trường"* ra
> với phụ huynh. Nên món Đ44/Đ59 ở bên đó không phải chuyện đổi chính sách —
> luật là của chính nhà trường ấy, app chỉ đang không thực thi được nó ở đâu
> ngoài đúng một màn hình. **Và vì bản vá chưa về, hôm nay vẫn vậy.**
>
> Ba con số ô cũ ghi là **đo lúc chưa vá** nên tới giờ vẫn còn đúng, chỉ khác ở
> chỗ chúng không còn là "đã đóng" mà là "đang mở":
> `/modules/hocphi/routes.js` trả **3142 byte** mã máy chủ cho người chưa đăng
> nhập; khôi phục từ ổ ngoài trả về **"không có thư mục uploads/"**; và một tài
> khoản có con rời trường 2 năm đọc được **5 đường** kèm nguyên sổ sức khoẻ,
> nhận xét, nề nếp, điểm danh.
>
> Câu `npm test` ở app 1 *932 → 1017* của ô cũ đo trên nhánh đã mất, nên nay
> không kiểm lại được và không được dùng làm bằng chứng.
>
> ### Bài học của chỗ này — **viết xong bản vá KHÔNG phải là trả nợ**
>
> Nợ chỉ hết khi bản vá **nằm trên nhánh đã đẩy lên kho kia**. Trước khi gạch
> một dòng trong bảng trên, bắt buộc kiểm bằng nội dung tệp ở kho app 1, không
> kiểm bằng mã commit — mã commit vẫn tra ra được kể cả khi nhánh chứa nó đã
> biến mất, và đó chính là cách sổ này ghi sai suốt từ 30/08 tới 16/09:
>
> ```bash
> git fetch origin && git show origin/HEAD:lib/db.js | grep conHanXemHoSo
> ```
>
> **Việc này đang lặp lại ngay lúc này.** Có một nhánh thứ hai,
> `claude/go-no-nen-chung`, mang 16 bản vá nền khác từ app 2 về app 1 (nhóm
> Đ117/Đ118 và các món 27/08–02/09), `npm test` bên đó xanh — và nó **cũng chưa
> được đẩy lên**. Nếu máy ảo hiện tại bị thu hồi trước khi đẩy, nó mất đúng như
> `claude/no-nen-chung-app2` đã mất, và sổ này lại có nguy cơ ghi nhầm lần nữa.

> **Còn nợ 25 món** — đếm theo số dòng có cột "Còn nợ" **đúng bằng**
> `**app 1**` trong bảng trên, không phải một con số nhớ tay. Dòng ghi
> `**KHÔNG chép sang app 1**` không tính, vì đó là chỗ cố ý khác nhau chứ không
> phải nợ.
>
> Con số này đã trượt hai lần: bản đầu ghi "mười", sửa 10/09 thành "mười sáu", và
> tới 16/09 đếm lại theo đúng cách đếm ghi ở trên thì ra **mười tám** — tức nó
> lại sai ngay khi bảng dài thêm, dù cách đếm đã được ghi rõ. Bốn món vừa bỏ gạch
> ở ô trên cộng vào thành 22; món thứ 23 thêm ngày 01/10 (Đ221b, `backup.js` trùng mốc); món thứ 24 thêm ngày 08/10 (Đ235, `backup.js` sao lưu tay xoá mất bản 02:00); món thứ 25 cũng ngày 08/10 (Đ236, sao lưu đọc giờ sửa tệp thay vì giờ trong tên). Cách đếm ghi ra chỉ có ích khi có máy chạy lại nó,
> nên từ 16/09 **`npm run test:nen-chung` đếm lại bảng và báo đỏ nếu con số trên
> lệch** — chữ "25" trong dòng đầu đoạn này là con số bài canh đọc.
>
> Ghi nợ ở đây là việc làm được ngay; trả nợ cần đẩy được bản vá lên kho kia và
> đối chiếu từng tệp, vì không chắc app 1 có dính đủ cả hai mươi lăm hay không —
> mà ghi sổ sai còn tệ hơn sổ trống. **Hai món 29/08 là ngoại lệ:** đã đối chiếu
> được bằng chính lịch sử git của kho này (tệp sinh ra trước điểm tách và nhánh
> mã giống hệt nhau), nên app 1 chắc chắn dính cả hai. **Năm món 29–30/08 (Đ44,
> Đ59, Đ62, Đ66, Đ73) thì đã đối chiếu tận nơi ở `origin/HEAD` ngày 16/09** —
> bảng trong ô ⚠️ ghi rõ từng tệp.

### MỘT CHỖ CỐ Ý KHÁC NHAU GIỮA HAI KHO — đừng "vá giúp"

**Ai được ghi sổ Học phí.** Ở app 2 (đợt Đ42) chỉ **văn phòng** tạo được khoản
thu và xác nhận đã nhận tiền; ở app 1 cả **cô** cũng làm được. `modules/hocphi/`
sinh ra trước điểm tách nên hai kho có cùng đoạn mã, và người sang kho kia rất
dễ tưởng đây là bản vá còn nợ.

**Không phải.** Đây là đổi chính sách theo cách trường mầm non chia việc (tầng
chức vụ đặt Kế toán lo học phí và tiền ăn). Ở app 1 cô đang thu tiền thật cho
khoảng 300 gia đình — đổi vai bên đó khi nhà trường chưa nói gì là làm hỏng việc
đang chạy. Lý lẽ đầy đủ ở `docs/QUYET-DINH-TU-CHOT.md` mục 25.

### Còn hai mươi món KHÔNG bắt buộc, ghi lại cho khỏi quên

Hai mươi chỗ dưới đây cũng nằm ở phần nền chung và app 1 gần như chắc chắn dính,
nhưng không thuộc loại 1 hay loại 2 nên **không bắt buộc** vá chéo. Ghi ra đây
để người sang kho app 1 sau này khỏi phải phát hiện lại từ đầu:

- **Mở app lúc mất mạng thì rơi về màn đăng nhập** (`public/js/app.js`,
  `public/js/api.js`, `public/sw.js` — vá ở app 2 tại Đ12). Ở app 1 hậu quả nhẹ
  hơn: phụ huynh tiểu học mở app lúc mất sóng thì chỉ chờ, không có việc gì đang
  làm dở. Ở app 2 thì nó cắt đúng lời hứa "mất mạng vẫn ghi được" của cô.
- **Móc `activate` của `public/sw.js` xoá sạch kho đệm cũ mỗi lần đổi VERSION**
  (vá ở app 2 tại Đ43 bằng cách mang theo phần `/modules/`). Ở app 1 hậu quả gần
  như bằng không: bên đó chỉ có một phân hệ (`hocphi`), và màn học phí không
  phải thứ ai mở lúc mất sóng. Ở app 2 thì đó là **tám màn mầm non** — đúng
  những màn app 2 tồn tại vì chúng.

- **`Dockerfile` dựng trên `node:22-alpine`** trong khi `better-sqlite3` chỉ có
  bản dựng sẵn cho glibc — lệnh build gãy ngay bước cài, và gãy ở chỗ khó đọc.
  Vá ở app 2 tại Đ12 bằng cách đổi sang `node:22-bookworm-slim`.
- **Hàm nén ảnh bị chép nhiều bản** (`public/js/ui.js`, `public/js/views/albums.js`
  — gom ở app 2 tại Đ21 thành `UI.nenAnh`). App 1 chỉ có một bản trong
  `albums.js`, nên chưa phải nợ. Nhưng bản dùng chung có hai thứ app 1 cũng cần:
  xoay ảnh theo chiều máy ảnh đã chụp, và một chỗ duy nhất để sau này thêm bước
  xoá toạ độ GPS.
- **Bộ canh "mọi đường API đọc dữ liệu của bé phải qua một hàm canh quyền"**
  (`test/quyen-du-lieu-be.test.mjs`, thêm ở app 2 tại Đ22). Không phải bản vá
  cho lỗi nào cả, nên không bắt buộc — nhưng app 1 đang chạy thật cho ~300 gia
  đình và cũng chỉ canh quy định đó cho đúng một tệp. Chép sang được gần như
  nguyên vẹn; chỉ phải chỉnh danh sách hàm canh cho khớp `lib/` bên đó.
- **Màn "không mở được" nói sai lý do với phụ huynh** (`lib/modules.js`,
  `routes/modules.js`, `public/js/app.js` — vá ở app 2 tại Đ54). **Đã đối chiếu
  tận nơi, không phải phỏng đoán:** `public/js/app.js` ở điểm tách có đúng câu
  *"Phân hệ này hiện đang được nhà trường tắt."*, và `lib/modules.js` ở điểm
  tách cũng đã lọc theo `roles`. Nghĩa là app 1 **đang** nói câu đó với phụ
  huynh mở nhầm một địa chỉ chỉ dành cho nhà trường — và bên đó là ~300 gia
  đình thật, tức là văn phòng app 1 có thể đã nhận những cuộc gọi hỏi "sao
  trường tắt mất phần của tôi" mà không ai lần ra nguyên nhân. Không rò dữ liệu,
  không mất dữ liệu, nên không bắt buộc; nhưng đây là món **dễ vá và đáng vá
  nhất** trong danh sách này.
- **Hai ô chết trong hồ sơ sức khoẻ** (`routes/health.js` — vá ở app 2 tại Đ56).
  **Cũng đã đối chiếu tận nơi:** ở điểm tách, `public/js/views/health.js` đã in
  ra "Thị lực" và "Đánh giá thể trạng", còn `routes/health.js` **không có một
  dòng nào** ghi hai cột đó. Nên app 1 có y hệt hai ô chết ấy tới hôm nay. Bản
  vá chép sang được gần như nguyên vẹn, kèm cả phép kiểm QUY TẮC 4 (app 1 không
  có QUY TẮC 4, nhưng "app không được tự suy đánh giá thể trạng từ chiều cao và
  cân nặng" thì bên nào cũng đúng).

- **Mở một phòng chat kéo về CẢ NĂM HỌC tin nhắn** (`routes/messages.js` — vá ở
  app 2 tại Đ77). **Đã đối chiếu tận nơi:** `bc9dfa3:routes/messages.js:183` là
  đúng câu `SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt`
  không có `LIMIT`. Không rò dữ liệu, không mất dữ liệu, nên không bắt buộc —
  nhưng đây là món **nặng dần theo thời gian dùng**, và app 1 đã chạy thật lâu
  hơn app 2 rất nhiều. Cùng commit còn gộp một chỗ N+1 ở màn danh sách (hỏi tin
  cuối của từng hội thoại bằng một truy vấn riêng); `bc9dfa3:…:147` giống hệt.
  Bản vá gồm cả đường `?truoc=` và nút "Xem tin cũ hơn" — **phải chép cả hai
  vế**, cắt bớt tin mà không mở đường đi ngược là biến một cái chậm thành một
  cái mất.
- **Bốn đường đọc bảng của phân hệ khác mà không hỏi công tắc**
  (`routes/hocsinh-cu.js`, `routes/namhoccu.js`, `routes/attendance.js`,
  `routes/reports.js` — vá ở app 2 tại Đ65). **Đã đối chiếu:** cả bốn tệp ở
  `bc9dfa3` không có một lần gọi `modules.dangBat` nào. Hậu quả là lời hứa của
  quy trình "bỏ một tính năng" trong `CLAUDE.md` — *tắt trong Quản trị → Tính
  năng thì nó biến khỏi màn hình* — không đúng ở bốn màn này. Không mất dữ
  liệu, nên không bắt buộc.
- **Đơn xin nghỉ không có trần số ngày** (`routes/leave.js` — vá ở app 2 tại
  Đ67). Ở `bc9dfa3` chỉ có trần độ dài lý do, không có trần khoảng ngày, nên
  một đơn "nghỉ từ 2026 tới 2126" được nhận và mọi màn tính toán trên nó phải
  gánh theo. Không bắt buộc.
- **Màn Khảo sát hỏi cơ sở dữ liệu một lần cho MỖI khảo sát, và không có trần
  danh sách** (`routes/surveys.js` — vá ở app 2 tại Đ68). Ở `bc9dfa3`,
  `responsesOf(sv.id)` được gọi trong vòng lặp. Không bắt buộc; cùng loại với
  món `messages.js` ở trên và cũng nặng dần theo thời gian.
- **Gói `qs` bên trong Express ở bản 6.15.3 có lỗ làm treo máy chủ** (mức vừa,
  GHSA-4mjr-xmp4-gh2g — vá ở app 2 tại Đ122 bằng cách nâng lên 6.16.0, chỉ đổi
  `package-lock.json`). Không có mã nào để đối chiếu ở `bc9dfa3` — đây là phụ
  thuộc, không phải tệp — nhưng app 1 cùng dòng Express 5 nên gần như chắc chắn
  cùng bản; bên đó đang chạy thật cho ~300 gia đình, đáng một lệnh `npm audit
  fix` rồi chạy đủ bộ kiểm thử. Nhân đó soi luôn tệp khóa bên ấy có mục thừa
  không: app 2 mang 385 mục Capacitor thừa suốt sáu ngày mà không ai biết, vì
  `npm ci` lặng lẽ bỏ qua chúng còn `npm audit` thì đếm cả. Bộ canh
  `test/khoa-goi.test.mjs` chép sang được nguyên vẹn — nó chỉ đọc hai tệp JSON,
  không phụ thuộc gì vào app 2.
- **`scripts/kiem-tra-may-chu.js` thêm mục "Kho ảnh của trường"** (app 2, Đ129)
  — cảnh báo sớm khi ảnh sắp lấp đầy đĩa, phép tính tách ra `lib/kho-anh.js`
  (tệp MỚI, không có ở điểm tách). App 1 cũng lưu ảnh trên ổ đĩa máy chủ nên
  cùng dính chuyện đĩa đầy là hỏng cơ sở dữ liệu, nhưng bên đó ảnh ít hơn nhiều
  (tiểu học không chụp hai tấm mỗi bé mỗi ngày). Chép sang được nguyên vẹn nếu
  muốn: `lib/kho-anh.js` không phụ thuộc gì vào app 2, và mục kiểm chỉ thêm chứ
  không đụng mục nào đang có.
- **`lib/modules.js` truyền thêm trường `gopVao` của `module.json` xuống trình
  duyệt** (thêm ở app 2 tại Đ126, một dòng trong `choNguoiDung`). Không phải lỗi
  — là chỗ cắm để ô của một phân hệ gấp vào màn của phân hệ khác với một vài
  vai (Đón trả bé gấp vào Điểm danh với cô). App 1 không có phân hệ nào khai
  trường này nên **không cần** mang sang; ghi lại để nếu bên đó có ngày muốn
  gấp ô Học phí vào một màn nào thì biết chỗ cắm đã có sẵn ở đây, ba tệp
  (`lib/modules.js`, `dashboard.js`, `module.json`) và một luật: chỉ ẩn ô khi
  màn đích đang bật, màn đích tắt là ô quay lại.
- **Thông báo riêng từng bé và đường đẩy Web Push** (thêm ở app 2 tại Đ137:
  hai tệp mới `lib/thong-bao-be.js`, `lib/day.js`; ba bảng mới `thongbao_be`,
  `thongbao_be_doc`, `push_dang_ky` trong `lib/schema.sql` — chỉ `CREATE IF NOT
  EXISTS`; hàm `guiChoNhom` thêm vào `lib/thong-bao.js`; `'/api/push'` thêm vào
  danh sách API của tính năng Thông báo trong `lib/modules.js`; gói `web-push`
  vào `dependencies`; bộ nghe `push`/`notificationclick` trong `public/sw.js`).
  App 1 **không bắt buộc**: phụ huynh tiểu học không có luồng tin riêng từng em
  như ảnh tới lớp / nhật ký ngày. Nhưng nếu bên đó muốn đẩy thông báo nhà
  trường về điện thoại thì mang nguyên `lib/day.js` + bảng `push_dang_ky` +
  `routes/push.js` + đoạn sw.js là đủ, không phải nghĩ lại; nhớ bài học Đ14 —
  `test/khong-hua-suong.test.mjs` chỉ cho xin quyền khi sw.js có bộ nghe thật.
- **`lib/modules.js` truyền thêm trường `dieuKienHien` của `module.json` xuống
  trình duyệt** (thêm ở app 2 tại Đ141, một dòng trong `choNguoiDung`, cùng
  chỗ và cùng luật với `gopVao`). Là đường API mà trang chủ *hỏi trước khi vẽ
  ô*: trả `{ hien: false }` thì ô không vẽ với người này — dùng để ô Nhật ký
  ngày chỉ hiện với cô có bé nhà trẻ trong nhóm. Máy chủ chỉ truyền qua, không
  quyết gì; phân hệ không khai thì `null` và mọi thứ y như trước. App 1 không
  có phân hệ nào khai nên **không cần** mang sang. Cùng tệp, Đ140/Đ144: hàm
  `viSaoKhongThay` trả thêm chiều thứ ba `danhCho: 'gia-dinh-va-van-phong'`
  cho phân hệ có vai gia đình + văn phòng mà không có cô (Học phí); hai giá
  trị cũ giữ nguyên, `public/js/app.js` thêm một nhánh câu chữ bên cạnh. App 1
  không có phân hệ nào ở tổ hợp vai đó.
- **`lib/uploads.js` có bộ hàm riêng cho tài liệu PDF / Word** (thêm ở app 2
  tại Đ143: `saveTaiLieuDataUrl`, `pathOfTaiLieu`, `existsTaiLieu`,
  `removeTaiLieu`, `mimeOfTaiLieu`, trần `MAX_TAI_LIEU_BYTES` 8 MB). Đặt CẠNH
  bộ ảnh, cùng lối với `saveVideoDataUrl`: `SAFE_NAME` của ảnh **không** nới ra
  nhận `.pdf`, nên sáu đường trả ảnh của bé không bỗng trả được một tệp Word.
  Word kiểm cả chữ ký ZIP lẫn thư mục `word/` bên trong. App 1 **không bắt
  buộc**; muốn cho gửi tệp đính kèm thông báo thì mang nguyên khối này sang, nhớ
  trần 12 MB của thân yêu cầu trong `server.js`.
- **`lib/schema.sql` thêm bảng `album_che_do`** (Đ144: album *công khai cả nhóm*
  hay *theo thẻ từng bé*; không có dòng = công khai = đúng cách mọi album đang
  hiện). Chỉ `CREATE IF NOT EXISTS`, không đụng bảng `albums`. Bộ lọc theo thẻ
  nằm ở `routes/albums.js`, chạy SAU luật đồng ý chia sẻ. App 1 **không bắt
  buộc**: album tiểu học là album lớp, không có nhu cầu cá nhân hoá từng em.
- **Gói `proxy-addr` 2.0.7 có lỗ giả địa chỉ IP qua dải tin cậy IPv6 dạng
  `::ffff:`** (mức NGHIÊM TRỌNG, GHSA-jqcg-44mw-7w3h — vá ở app 2 tại Đ234a
  bằng cách nâng lên 2.0.8, chỉ đổi `package-lock.json`). Không bắt buộc vì cả
  hai app không đi qua đường hỏng: `server.js:16` đặt `trust proxy` bằng **số
  chặng** (`1`), không bằng dải địa chỉ — đã đối chiếu tận nơi ở `bc9dfa3`, cùng
  một dòng. Ai đổi dòng đó sang dải địa chỉ mà chưa nâng gói thì lỗ mở thật.
  **Đừng `npm audit fix` trên máy chủ** của bên nào: nó sửa tệp khoá đang được
  git theo dõi, lần `git pull` sau sẽ vấp — nâng trong kho mã, chạy đủ bộ kiểm
  thử, rồi máy chủ `git pull` + `npm ci` như mọi lần.
- **Lệnh quản trị gõ thiếu `DATA_DIR` trên máy chủ thật thì im lặng xem
  `./data` trong kho mã và in một bản báo cáo SAI** (`scripts/backup.js`,
  `restore.js`, `kiem-tra-may-chu.js`, `create-admin.js`,
  `sua-quyen-chu-nhiem.js` — vá ở app 2 tại Đ234/Đ234b bằng tệp MỚI
  `scripts/canh-thu-muc-du-lieu.js`, gọi ở dòng đầu mỗi lệnh).
  Ngày 08/10 xảy ra thật ở máy chủ thử app 2: *"chưa có bản sao lưu nào"*,
  *"không thấy cơ sở dữ liệu"*, kèm gợi ý đặt bản sao lưu vào ngay trong kho mã
  — trong khi máy chủ có đủ chín bản. Không bắt buộc vì không mất dữ liệu: lệnh
  không ghi gì vào chỗ dữ liệu thật, chỉ nói sai. Nhưng người vận hành tin bản
  báo cáo sai thì có thể làm theo gợi ý sai. Chép sang app 1 được gần nguyên vẹn
  — **chỉ phải sửa `THU_MUC_CHUAN`** cho đúng thư mục dữ liệu của máy chủ app 1,
  rồi chép kèm `test/thu-muc-du-lieu.test.mjs`.

> **Đợt Đ54–Đ58 KHÔNG sinh thêm món nợ BẮT BUỘC nào.** Đ55 là bộ canh riêng của
> app 2 (app 1 không có 5 QUY TẮC). Đ57 **không áp dụng cho app 1**: tầng chức
> vụ chưa tồn tại ở điểm tách — `lib/db.js` bên đó không có `CHUC_VU`, nên bên
> đó không có vai Nhân sự để mà siết.
>
> **Đợt Đ59–Đ77 sinh thêm bốn món BẮT BUỘC** (Đ59, Đ62, Đ66, Đ73 — đã vào bảng
> Sổ nợ) **và bốn món không bắt buộc** (Đ65, Đ67, Đ68, Đ77 — ngay trên).
>
> **Không áp dụng cho app 1:** Đ60, Đ63, Đ64, Đ72 (phân hệ Cambridge, Ghi
> nhanh, Hành trình, Nhật ký ngày — không tệp nào tồn tại ở `bc9dfa3`); Đ61
> (`db.addClassTeacher` chưa có ở điểm tách — app 1 là mô hình một cô một lớp);
> Đ76 (màn Lịch sinh hoạt: ở app 1 chữ *"Nghỉ / tự học"* và *"Đang học"* là
> chữ ĐÚNG, và khung giờ bảy tiết 35 phút cũng đúng — đây là trường tiểu học.
> Chép sang là làm hỏng một màn đang đúng); Đ69–Đ71, Đ74, Đ75 (chữ trên màn
> hình của bậc mầm non, bộ canh riêng, CI và tài liệu của app 2).

---

## Điều cần biết trước khi tin vào tệp này

Quy ước này **canh bằng người, không canh bằng máy**. Không có bộ kiểm thử nào
chạy được ở kho này mà biết kho kia đang thiếu bản vá.

Đó là điểm yếu thật, và nó là cái giá đã biết trước khi chọn tách hai kho. Hai
việc làm giảm bớt rủi ro:

1. **Giữ danh sách "nền chung" ở trên thật ngắn.** Càng nhiều tệp chung thì càng
   nhiều thứ phải nhớ vá hai nơi.
2. **Mỗi lần đụng vào bất cứ tệp nào trong bảng đầu tiên, đọc lại tệp này trước.**
   `CLAUDE.md` đã ghi việc đó thành quy định.

Khi số lần vá chéo bắt đầu nhiều tới mức phiền, đó là tín hiệu nên tách phần nền
thành một gói riêng cho cả hai kho cùng cài — **chưa làm bây giờ** vì hôm nay
việc đó tốn hơn cái nó tiết kiệm.
