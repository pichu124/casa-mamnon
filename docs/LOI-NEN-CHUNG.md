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

| Nhóm | Tệp | Có coi là nền chung không |
|---|---|---|
| Thư viện lõi | `lib/db.js`, `lib/auth.js`, `lib/modules.js`, `lib/uploads.js` | **Có** |
| Giao diện dùng chung | `public/js/ui.js`, `public/js/app.js`, `public/js/api.js` | **Có** |
| Vỏ PWA | `public/sw.js`, `public/manifest.json` | **Có** |
| Bộ canh | `scripts/kiem-tra-commit.js`, `scripts/kiem-tra-du-lieu.js` | **Có** |
| Sao lưu / khôi phục | `scripts/backup.js`, `scripts/restore.js` | **Có** |
| Khung kiểm thử | `test/*.mjs` phần dựng máy chủ và tiện ích chung | **Có** |
| Tính năng | `routes/*.js`, `public/js/views/*.js`, `modules/**` | **Không** — hai bên khác nhau từ GĐ 1 |
| Cấu trúc bảng | `lib/schema.sql` | **Một phần** — bảng nền chung, bảng riêng thì không |

Cách nhận ra nhanh: **mở `git log <tệp>`, nếu commit gần nhất nằm trước điểm tách
`bc9dfa3` thì tệp đó vẫn còn là nền chung.**

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

> **Chín món trên chưa trả được vì phiên làm việc chưa có quyền vào kho app 1.**
> Ghi nợ ở đây là việc làm được ngay; trả nợ cần mở kho kia và đối chiếu từng
> tệp, vì không chắc app 1 có dính đủ cả chín hay không — mà ghi sổ sai còn tệ
> hơn sổ trống. **Món 29/08 là ngoại lệ:** đã đối chiếu được bằng chính lịch sử
> git của kho này (tệp sinh ra trước điểm tách và không đổi từ đó), nên app 1
> chắc chắn dính.

### MỘT CHỖ CỐ Ý KHÁC NHAU GIỮA HAI KHO — đừng "vá giúp"

**Ai được ghi sổ Học phí.** Ở app 2 (đợt Đ42) chỉ **văn phòng** tạo được khoản
thu và xác nhận đã nhận tiền; ở app 1 cả **cô** cũng làm được. `modules/hocphi/`
sinh ra trước điểm tách nên hai kho có cùng đoạn mã, và người sang kho kia rất
dễ tưởng đây là bản vá còn nợ.

**Không phải.** Đây là đổi chính sách theo cách trường mầm non chia việc (tầng
chức vụ đặt Kế toán lo học phí và tiền ăn). Ở app 1 cô đang thu tiền thật cho
khoảng 300 gia đình — đổi vai bên đó khi nhà trường chưa nói gì là làm hỏng việc
đang chạy. Lý lẽ đầy đủ ở `docs/QUYET-DINH-TU-CHOT.md` mục 25.

### Còn bốn món KHÔNG bắt buộc, ghi lại cho khỏi quên

Bốn chỗ dưới đây cũng nằm ở phần nền chung và app 1 gần như chắc chắn dính,
nhưng không thuộc loại 1 hay loại 2 nên **không bắt buộc** vá chéo. Ghi ra đây
để người sang kho app 1 sau này khỏi phải phát hiện lại từ đầu:

- **Mở app lúc mất mạng thì rơi về màn đăng nhập** (`public/js/app.js`,
  `public/js/api.js`, `public/sw.js` — vá ở app 2 tại Đ12). Ở app 1 hậu quả nhẹ
  hơn: phụ huynh tiểu học mở app lúc mất sóng thì chỉ chờ, không có việc gì đang
  làm dở. Ở app 2 thì nó cắt đúng lời hứa "mất mạng vẫn ghi được" của cô.
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
