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
| 27/08 | Hồ sơ trẻ lọt vào ảnh Docker: `.gitignore` giấu tệp `.db` khỏi mắt người soát, nhưng `docker build` **không đọc** `.gitignore` nên vẫn đóng gói nó vào ảnh | app 2 — `2551b2a` | **app 1** | Loại 1 (rò rỉ dữ liệu). Cần đối chiếu `.dockerignore` của app 1 trước khi vá — chưa mở kho app 1 nên chưa biết bên đó có dính không |
| 27/08 | Khôi phục dữ liệu chạy được trong lúc máy chủ ĐANG chạy → SQLite ghi đè lẫn nhau, hỏng âm thầm | app 2 — `8560f9c` | **app 1** | Loại 2 (mất dữ liệu) |
| 27/08 | `/healthz` công khai kể số phiên đăng nhập và thời gian chạy cho người **chưa đăng nhập** | app 2 — `616ce0c` | **app 1** | Loại 1. Cùng commit còn vá `restore:check` không đếm bảng phân công cô |
| 28/08 | Bộ canh dữ liệu **bỏ lọt chính tệp mà `restore.js` sinh ra**: `school.db.truoc-khi-khoi-phuc-<số>` không khớp mẫu `*.db` của cả bộ canh lẫn `.gitignore` | app 2 — Đ4 | **app 1** | Loại 1, và là lỗ do chính kho mã tự mở ra sau mỗi lần khôi phục |
| 28/08 | Hai bộ canh mật khẩu mẫu (`server.js`, `scripts/kiem-tra-may-chu.js`) chỉ soát đúng chuỗi trong `DEMO_PASSWORD`. Đặt biến đó thành một chuỗi ngẫu nhiên (`render.yaml` làm đúng vậy) là **mọi tài khoản còn giữ "123456" đều lọt, và bộ canh báo xanh trong khi cửa vẫn mở** | app 2 — Đ12 | **app 1** | Loại 1. Bản vá là soát CẢ chuỗi cấu hình LẪN "123456" — vài dòng, không đổi hành vi nào khác |
| 28/08 | `scripts/backup.js` chép ảnh sang `backups/uploads` và **không bao giờ xoá**: vòng đời 7 ngày / 4 tuần / 12 tháng chỉ áp cho `school-*.db.gz`. Chỗ ảnh trong `DATA_DIR` luôn gấp đôi và chỉ tăng, tới lúc đầy ổ thì cô đăng ảnh giữa buổi là hỏng | app 2 — Đ17 | **app 1** | Loại 2 (đầy ổ → không ghi được nữa). Ở app 1 nhẹ hơn nhiều vì trường tiểu học gần như không có ảnh, nên **ưu tiên thấp** — nhưng cùng một đoạn mã |
| 28/08 | `scripts/restore.js` **im lặng bỏ qua** mọi ảnh đã có sẵn trong `uploads/`, kể cả khi tệp trên đĩa khác hẳn bản trong bản sao (cụt, rỗng, hỏng). Người vận hành vừa khôi phục xong tưởng đã chữa hết, trong khi ảnh khuôn mặt trẻ vẫn đang hỏng — và ảnh là thứ duy nhất không dựng lại được | app 2 — Đ23 | **app 1** | Loại 2. Bản vá KHÔNG đè lên tệp đang có (tên tệp là 16 byte ngẫu nhiên nên trùng tên là trùng ảnh, mà bản trên đĩa có thể mới hơn) — chỉ **nói ra** danh sách tệp lệch dung lượng để người vận hành tự soi. Ở app 1 nhẹ hơn vì trường tiểu học gần như không có ảnh |
| 28/08 | `lib/importer.js` xoá dữ liệu cũ theo một danh sách bảng **viết tay chỉ có bảng lõi**. Nhập lại kho JSON đời cũ, hay chạy `npm run seed -- --force`, xoá sạch bé và nhóm nhưng ĐỂ NGUYÊN ghi chép của phân hệ về chính những bé vừa bị xoá — nhật ký ăn ngủ vệ sinh, quan sát, kế hoạch, sổ đón trả | app 2 — Đ32 | **app 1** | Loại 1 và loại 2 cùng lúc: dữ liệu mồ côi, và **ghi chép về một đứa trẻ sống sót sau khi đứa trẻ đó đã bị xoá** — Nghị định 13/2023 cho quyền xoá. Ở app 1 nhẹ hơn vì bên đó chỉ có phân hệ `hocphi`, mà bảng của nó CÓ khoá ngoại `ON DELETE CASCADE`; vẫn nên vá vì lỗi nằm ở cách viết danh sách |
| 29/08 | Màn **Học phí**: ô *Chọn bé* của người trong trường **không có tác dụng**. `render()` luôn lấy `students[0]`, còn `onchange` chỉ ghi `this._sid` rồi vẽ lại — nên văn phòng chọn bé A, màn lặng lẽ quay về bé đầu danh sách, và **khoản thu vừa tạo mang tên nhà khác** | app 2 — Đ39 | **app 1** | Loại 1 (dữ liệu của nhà này hiện trong hồ sơ nhà kia) **và là tiền**. Mã ở `modules/hocphi/view.js` giống hệt nhau tại điểm tách `bc9dfa3`, nên app 1 chắc chắn dính. Ở app 1 còn nặng hơn: app 1 đang thu tiền thật của ~300 gia đình, còn app 2 chưa có người dùng. **Món nợ ưu tiên cao nhất trong bảng này** |

| 01/09 | Express khớp route **không phân biệt hoa/thường**, nhưng các chốt chặn đứng trước route lại so `req.path` nguyên bản với tiền tố chữ thường. Gõ `/API/...` là: `chanApiDaTat` (lib/modules.js) cho API của **phân hệ đã tắt** chạy như đang bật, và `server.js` quên gắn `Cache-Control: no-store` nên proxy được phép cache dữ liệu trẻ. (Tầng chức vụ dính nặng nhất — Kế toán mở được hồ sơ bé — nhưng tầng đó là mã riêng app 2, app 1 không có.) | app 2 — Đ117 | **app 1** | Loại 1. **Đã đối chiếu tận nơi:** `bc9dfa3:lib/modules.js:409-413` và `bc9dfa3:server.js:51` là đúng hai phép so đó. Bản vá chỉ là hạ đường dẫn về chữ thường trước khi so — vài dòng, kèm bộ canh `test/duong-hoa-thuong.test.mjs` chép sang được |
| 29/08 | `db.canAccessStudent` nhánh phụ huynh chỉ hỏi bảng `student_parents`, tức trả `true` **mãi mãi**. Mốc "gia đình còn xem hồ sơ 12 tháng sau khi bé rời trường" chỉ được cài trong `routes/hocsinh-cu.js`, nên **màn hình đó đóng đúng hạn còn mọi đường khác thì không**: gõ thẳng `/api/nhatky?studentId=`, `/api/health`, `/api/medicine`, `/api/hocphi` là đọc được hồ sơ một đứa trẻ đã rời trường nhiều năm | app 2 — Đ44 | **app 1** | Loại 1 (rò rỉ dữ liệu). Cả hai tệp — `lib/db.js` và `routes/hocsinh-cu.js` — sinh ra TRƯỚC điểm tách `bc9dfa3` và nhánh phụ huynh giống hệt nhau, nên **app 1 chắc chắn dính**. Ở app 1 nặng hơn: hồ sơ 5 năm tiểu học của ~300 gia đình, và app 1 đã chạy đủ lâu để có học sinh ra trường quá 12 tháng. Bản vá là thêm hai thứ vào `lib/db.js` (`SO_THANG_GIU_HO_SO`, `conHanXemHoSo`) rồi siết đúng nhánh phụ huynh — không đụng dữ liệu, không đổi hành vi của vai nào khác |
| 30/08 | `scripts/restore.js` tìm ảnh ở `DATA_DIR/backups/uploads` — **ghi cứng**, trong khi `scripts/backup.js` ngay cạnh **có** `--out /mnt/usb` và tự quảng cáo điều đó ở dòng đầu tệp. Sao lưu ra ổ ngoài, ổ trong hỏng, khôi phục từ ổ ngoài: cơ sở dữ liệu về đủ (dòng 40 nhận đường dẫn tuyệt đối) còn **ảnh thì không**, vì máy đi tìm trong đúng cái thư mục vừa mất | app 2 — Đ62 | ~~app 1~~ **đã trả 30/08** | Loại 2 (mất dữ liệu vĩnh viễn). **Đã đối chiếu tận nơi tại `bc9dfa3`, không phải phỏng đoán:** `restore.js:95` ghi cứng, `backup.js:23` đọc `--out`. Ảnh là thứ DUY NHẤT không dựng lại được từ đâu khác. App 1 đang chạy thật cho ~300 gia đình. **Món nợ ưu tiên cao nhất trong bảng này** — và nó chỉ lộ ra đúng lúc người ta cần nó nhất |
| 30/08 | `lib/lich-su-lop.js` — `lopCuCuaPhuHuynh` chỉ hỏi quan hệ `student_parents`, mà quan hệ cha mẹ – con thì **không bao giờ hết hạn**. Đ44 gom luật "12 tháng" về `db.canAccessStudent` nhưng hai họ đường của LỚP CŨ (album lớp cũ, màn Năm học trước) **không đi qua hàm đó** | app 2 — Đ59 | ~~app 1~~ **đã trả 30/08** | Loại 1 (rò rỉ dữ liệu). **Đã đối chiếu tận nơi:** ở `bc9dfa3`, `lopCuCuaPhuHuynh` không có một dòng lọc hạn nào và `lib/db.js` bên đó chưa có `conHanXemHoSo`. Nặng hơn hồ sơ của chính bé đó: album lớp là **ảnh khuôn mặt CẢ LỚP**, phần lớn các em trong ảnh vẫn đang học. Dựng lại được ở app 2: một gia đình rời trường 3 năm vẫn tải về **đúng các byte của tấm ảnh**. Cùng một tài khoản, cùng một phiên, màn "Hồ sơ con đã ra trường" trả 403 kèm câu "chỉ tra cứu được trong 12 tháng" — nên nhà trường nhìn màn thứ nhất sẽ tin là cửa đã đóng |
| 30/08 | `server.js` phục vụ `/modules` bằng `express.static` với một cố gắng trả 404 đặt trong `setHeaders` — mà `setHeaders` chạy **sau khi** đã quyết định gửi tệp, nên nó không chặn được gì. Và khối này nằm **ngoài** lớp `auth.requireAuth` của `/api`, tức mở cho người **chưa đăng nhập** | app 2 — Đ66 | ~~app 1~~ **đã trả 30/08** | Loại 1 (lộ mã nguồn máy chủ). **Đã đối chiếu tận nơi:** `bc9dfa3:server.js:111-116` giống hệt, và nó đứng sau `app.use('/api', …requireAuth)` nên không được lớp đó che. App 1 có `modules/hocphi/`, nên bất kỳ ai cũng tải được `/modules/hocphi/routes.js` và `/modules/hocphi/schema.sql` — logic phân quyền và cấu trúc bảng của phần thu tiền. Bản vá là một middleware chặn thật trước `express.static`, vài dòng |
| 30/08 | `routes/hocsinh-cu.js` đọc bảng `remarks` bằng `SELECT *` **không kèm điều kiện lọc thu hồi**. Cô bấm Thu hồi một nhận xét bấm nhầm sang bé khác → màn Nhận xét sạch, nhưng màn "Hồ sơ con đã ra trường" vẫn hiện nguyên dòng đó cho gia đình | app 2 — Đ73 | ~~app 1~~ **đã trả 30/08** | Loại 1 (rò rỉ) và là **quyền xoá dữ liệu theo Nghị định 13/2023** — nhà trường đã làm đúng thao tác, app mới là chỗ không thực hiện. **Đã đối chiếu tận nơi:** `bc9dfa3:routes/hocsinh-cu.js:92` là đúng câu SQL đó, và `bc9dfa3:lib/sua-thu-hoi.js` **đã có sẵn** `dieuKienConHien` — tức bản vá bên đó chỉ là gọi một hàm đang nằm sẵn trong kho. **Ở app 1 nặng hơn hẳn app 2:** app 2 đã tắt phân hệ Nhận xét từ A2, còn app 1 là trường tiểu học dùng nhận xét hằng ngày cho ~300 gia đình. Và đây là màn CHỈ GIA ĐÌNH mở — cô không có đường nào nhìn thấy để biết là chưa gỡ được |

> ### ✅ BỐN MÓN 30/08 ĐÃ TRẢ XONG (30/08/2026)
>
> Người dùng mở quyền vào kho `pichu124/School`, và cả bốn món bắt buộc của đợt
> Đ59–Đ77 đã được vá bên đó trên nhánh `claude/no-nen-chung-app2`:
>
> | Món | Commit ở app 1 |
> |---|---|
> | Đ62 `scripts/restore.js` không mang ảnh về | `083a88e` |
> | Đ44+Đ59 luật 12 tháng chỉ đúng ở một màn hình | `f1c421f` · `59148bc` · `02b03c4` (ba bước, `lib/db.js` là tệp dùng chung) |
> | Đ66 `/modules` mở cho người chưa đăng nhập | `d121010` |
> | Đ73 nhận xét đã thu hồi vẫn hiện | `0e3b15a` |
>
> **Đối chiếu tại chỗ xác nhận cả bốn có thật ở app 1**, đúng như sổ ghi. Ngoài
> ra còn tìm được ở app 1 một điều sổ này chưa biết: **app 1 ĐÃ CÓ SẴN
> `SO_THANG_GIU = 12`** trong `routes/hocsinh-cu.js` và đang nói câu đó ra với
> phụ huynh. Nên món Đ44/Đ59 ở bên đó không phải chuyện đổi chính sách — luật là
> của chính nhà trường ấy, app chỉ đang không thực thi được nó ở đâu ngoài đúng
> một màn hình.
>
> Ba con số đo được ở app 1, không phải suy đoán: `/modules/hocphi/routes.js`
> trả **3142 byte** mã máy chủ cho người chưa đăng nhập; khôi phục từ ổ ngoài
> trả về **"không có thư mục uploads/"**; và một tài khoản có con rời trường 2
> năm đọc được **5 đường** kèm nguyên sổ sức khoẻ, nhận xét, nề nếp, điểm danh.
>
> `npm test` ở app 1: 932 → **1017**, FAIL 0. Hai bộ canh mới bên đó:
> `test:sao-luu` và `test:con-ra-truong`.

> **Mười món còn lại chưa trả được** — chúng có từ trước đợt Đ59 và cần một lượt
> đối chiếu riêng ở kho app 1.
> Ghi nợ ở đây là việc làm được ngay; trả nợ cần mở kho kia và đối chiếu từng
> tệp, vì không chắc app 1 có dính đủ cả mười hay không — mà ghi sổ sai còn tệ
> hơn sổ trống. **Hai món 29/08 là ngoại lệ:** đã đối chiếu được bằng chính lịch sử
> git của kho này (tệp sinh ra trước điểm tách và nhánh mã giống hệt nhau), nên app 1
> chắc chắn dính cả hai. **Bốn món 30/08 cũng vậy** — mỗi món ghi rõ đã đối
> chiếu tệp nào, dòng nào ở `bc9dfa3`.

### MỘT CHỖ CỐ Ý KHÁC NHAU GIỮA HAI KHO — đừng "vá giúp"

**Ai được ghi sổ Học phí.** Ở app 2 (đợt Đ42) chỉ **văn phòng** tạo được khoản
thu và xác nhận đã nhận tiền; ở app 1 cả **cô** cũng làm được. `modules/hocphi/`
sinh ra trước điểm tách nên hai kho có cùng đoạn mã, và người sang kho kia rất
dễ tưởng đây là bản vá còn nợ.

**Không phải.** Đây là đổi chính sách theo cách trường mầm non chia việc (tầng
chức vụ đặt Kế toán lo học phí và tiền ăn). Ở app 1 cô đang thu tiền thật cho
khoảng 300 gia đình — đổi vai bên đó khi nhà trường chưa nói gì là làm hỏng việc
đang chạy. Lý lẽ đầy đủ ở `docs/QUYET-DINH-TU-CHOT.md` mục 25.

### Còn mười một món KHÔNG bắt buộc, ghi lại cho khỏi quên

Mười một chỗ dưới đây cũng nằm ở phần nền chung và app 1 gần như chắc chắn dính,
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
