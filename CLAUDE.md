# Quy định bắt buộc cho mọi thay đổi trong kho mã này

Đây là ứng dụng đang chạy thật cho một trường khoảng 300 học sinh. Phụ huynh và
giáo viên dùng nó hằng ngày. Vì vậy có một nguyên tắc đứng trên mọi thứ khác.

---

## Nguyên tắc số 1 — Không bao giờ được làm app ngừng dùng được

**Mỗi khi THÊM hoặc BỎ một tính năng, phải bảo đảm ba điều sau. Không có ngoại lệ.**

1. **App vẫn khởi động và vẫn đăng nhập được**, kể cả khi tính năng vừa thêm hoặc
   vừa bỏ có lỗi.
2. **Mọi tính năng khác đang bật vẫn chạy y như cũ** — không đổi hành vi, không
   đổi đường dẫn API, không đổi cấu trúc bảng của chúng.
3. **Dữ liệu đã có không được mất hay hỏng.** Bỏ một tính năng là ngưng dùng nó,
   không phải xóa dữ liệu của nó.

Nếu một yêu cầu không thể làm mà vẫn giữ được ba điều trên, **phải nói rõ với
người dùng trước khi làm**, không được tự ý đánh đổi.

---

## Cách làm để giữ đúng nguyên tắc

### Thêm một tính năng mới

**Mặc định: tạo phân hệ cắm thêm trong `modules/<mã>/`, không sửa vào phần đang chạy.**
Xem `modules/README.md`. Cơ chế này đã được thiết kế để một phân hệ mới viết sai
cũng không lây sang phần khác:

- Máy chủ nạp từng phân hệ trong khối bắt lỗi riêng.
- Phân hệ mới chỉ đăng ký được đường dẫn trong vùng `api` đã khai báo; đường dẫn
  đã có chủ thì bị từ chối ngay khi khởi động.
- `schema.sql` của nó chỉ được `CREATE ... IF NOT EXISTS` với tên bắt đầu bằng mã
  phân hệ. Mọi câu `DROP`, `ALTER`, `DELETE` đều bị chặn trước khi chạy.

Chỉ sửa thẳng vào `routes/` và `public/js/views/` khi việc đó **thực sự thuộc về
một tính năng lõi đã có**. Khi đó chỉ chạm vào tệp của đúng tính năng ấy.

### Bỏ một tính năng

Theo thứ tự ưu tiên:

1. **Tắt trong Quản trị → Tính năng.** Đây là cách đúng trong hầu hết trường hợp:
   tính năng biến khỏi màn hình, API bị chặn, **dữ liệu giữ nguyên**, bật lại
   được bất cứ lúc nào.
2. Nếu người dùng muốn gỡ hẳn mã: xóa tệp trong `routes/` và `public/js/views/`,
   **giữ nguyên bảng dữ liệu**. Máy chủ tự phát hiện tệp thiếu và tạm ẩn phân hệ
   đó, không sập.
3. **Không bao giờ tự ý `DROP TABLE`** hay xóa dữ liệu. Muốn xóa dữ liệu phải hỏi
   người dùng và nhắc họ chạy `npm run backup` trước.

### Sửa một tính năng đang có

Chỉ chạm vào tệp của đúng tính năng đó. Nếu buộc phải sửa tệp dùng chung
(`lib/db.js`, `lib/auth.js`, `public/js/ui.js`, `public/js/app.js`), thì:

- Chỉ **thêm** vào, không đổi hay bỏ thứ đang có.
- Chạy lại toàn bộ kiểm thử trước khi commit.

---

## Bắt buộc chạy trước mỗi lần commit

```bash
npm test          # 153 bài: bật/tắt tính năng + cô lập lỗi
```

Cả hai bộ đều tự dựng máy chủ riêng với cơ sở dữ liệu tạm, **không đụng dữ liệu
thật của trường**.

`test/co-lap-loi.test.mjs` chính là bộ canh giữ nguyên tắc số 1. Nó cố tình phá
hỏng từng thứ — tính năng lõi viết sai, tính năng bị gỡ mất, phân hệ mới chiếm
đường dẫn của phần khác, `schema.sql` chứa `DROP TABLE students` — rồi kiểm tra
app vẫn đăng nhập được và các tính năng còn lại vẫn chạy.

**Không được sửa hay nới lỏng bộ kiểm thử này để cho code chạy qua.** Nếu nó báo
đỏ thì code sai, không phải bài kiểm thử sai.

Khi đổi những phần dùng chung (đăng nhập, cơ sở dữ liệu, giao diện nền), chạy
thêm các bộ trong `docs/TIEN-DO.md` để chắc chắn không có hồi quy.

---

## Vài điều khác cần nhớ

- **Sau mỗi phần hoàn thiện: cập nhật `docs/TIEN-DO.md`, commit, rồi push** lên
  nhánh `claude/school-communication-app-wqjitt`. Người dùng yêu cầu điều này để
  công việc không mất khi phiên làm việc bị gián đoạn.
- Đổi bất cứ tệp nào trong `public/` thì **tăng số `VERSION` trong `public/sw.js`**,
  nếu không điện thoại đã cài app sẽ kẹt ở bản cũ.
- Giao diện và mọi thông báo lỗi viết **bằng tiếng Việt**, dễ hiểu với giáo viên
  và phụ huynh không rành máy tính. Đừng để lộ thuật ngữ kỹ thuật ra màn hình.
- Dữ liệu ở đây là thông tin trẻ em dưới 16 tuổi và hồ sơ sức khỏe — thuộc nhóm
  nhạy cảm theo Nghị định 13/2023/NĐ-CP. Mọi đường dẫn mới đọc dữ liệu học sinh
  **phải gọi `db.canAccessStudent(req.user, studentId)`** hoặc
  `db.canAccessClass(req.user, classId)`.
- Luôn bọc dữ liệu động bằng `UI.esc(...)` trước khi chèn vào HTML.
