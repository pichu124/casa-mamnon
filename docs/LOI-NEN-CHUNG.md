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
| _(chưa có)_ | | | | |

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
