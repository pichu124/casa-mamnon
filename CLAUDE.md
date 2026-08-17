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

Chỉ chạm vào tệp của đúng tính năng đó.

### Tệp dùng chung — nhóm nguy hiểm nhất

`lib/db.js`, `lib/auth.js`, `public/js/ui.js`, `public/js/app.js` không thuộc về
tính năng nào cả, mà **cả ứng dụng đang dựa vào chúng**: 22/22 tệp route đều gọi
`lib/db.js`, riêng `UI.esc` có hơn 300 chỗ gọi. Cơ chế cô lập lỗi không bảo vệ
được nhóm này — nó bảo vệ bằng cách khoanh vùng, mà tệp dùng chung thì không có
vùng riêng.

Vì vậy có hai quy định riêng cho nhóm này:

1. **Chỉ được thêm, không đổi và không bỏ thứ đang có.** Cần đổi hành vi thì
   truyền tham số hoặc thêm hàm mới bên cạnh, đừng sửa thứ đang chạy.
2. **Sửa tệp dùng chung phải là commit riêng, không trộn chung với việc thêm hay
   bỏ tính năng.** Trộn chung thì khi hỏng không biết gỡ phần nào, và người sửa
   đang bận nghĩ về tính năng mới chứ không nghĩ về 300 chỗ gọi kia.

Khi thật sự phải bỏ hay đổi một thứ dùng chung, làm ba bước, mỗi bước một commit
và chạy kiểm thử sau mỗi bước: **thêm cái mới bên cạnh → chuyển từng chỗ gọi sang
cái mới → khi không còn ai gọi mới xóa cái cũ.** Ở bất kỳ bước nào app cũng đang
chạy được.

Hai vế trên **đều đã được canh bằng máy**, không phải chỉ là lời hứa.

### Dữ liệu của trường không bao giờ được lên kho mã

`scripts/kiem-tra-du-lieu.js` chặn mọi commit có chứa tệp `*.db`, `uploads/`,
`backups/`, `.khoi-phuc-*`, `.env`, khóa ký, hay CSV danh sách học sinh trong
`data/`. Chạy ở cùng ba chỗ như bộ canh commit riêng, nhưng **không có đường
thoát** — không có trường hợp nào mà đẩy hồ sơ trẻ em lên kho công khai là đúng,
và lộ rồi thì viết lại lịch sử git cũng không thu lại được.

Bộ này còn khác một điểm: nếu bản thân nó chạy lỗi thì nó **chặn**, chứ không cho
qua như bộ commit riêng. Thà phiền một lần còn hơn để lọt.

Khi làm việc gì đụng tới đường dẫn dữ liệu, nhớ: mặc định `DATA_DIR` là `./data`
nằm trong kho mã — tiện lúc phát triển nhưng phải trỏ ra ngoài khi chạy thật.

Vế thứ hai — commit riêng — do `scripts/kiem-tra-commit.js` canh, chạy ở ba chỗ:

| Chạy ở đâu | Lệnh | Bỏ qua được không |
|---|---|---|
| Gõ tay bất cứ lúc nào | `npm run test:commit-rieng` | — |
| Tự động mỗi lần `git commit` | móc `.githooks/commit-msg` | có, bằng `--no-verify` |
| Trên GitHub mỗi lần push | `.github/workflows/kiem-tra.yml` | không |

Nó xếp tệp đã `git add` vào hai nhóm — dùng chung (bốn tệp trên) và tính năng
(`routes/*.js`, `public/js/views/*.js`, `modules/**`) — rồi chặn nếu cùng một
commit có cả hai. Tài liệu, kiểm thử, `lib/modules.js`, `lib/schema.sql`,
`public/index.html`, `public/sw.js` không thuộc nhóm nào, nên **thêm một tính
năng lõi mới vẫn commit một lần bình thường**.

Khi trộn chung là có chủ ý thật (ví dụ đổi tên một biến xuyên suốt), thêm một
**dòng riêng** vào cuối lời commit:

```
Tron-co-y: đổi tên biến xuyên suốt, tách ra thì mã không chạy được
```

Phải là dòng riêng và phải có lý do. Nhắc tới quy định này trong văn xuôi thì
không mở được đường thoát — bản thân lời commit thêm bộ canh này đã mắc đúng lỗi
đó một lần.

Móc git được bật tự động sau `npm install` (mục `prepare`). Bật lại bằng tay:
`git config core.hooksPath .githooks`.

`npm run test:khe-uoc` canh vế thứ nhất: nó chụp lại toàn bộ những gì các tệp
dùng chung đang cung cấp và báo đỏ nếu có thứ biến mất hoặc đổi số tham số. Thêm
hàm mới thì không báo đỏ — chạy `npm run test:khe-uoc -- --cap-nhat` để ghi nhận.

Nó chỉ bắt được thay đổi về **hình dạng**. Thay đổi về **hành vi** — ví dụ đổi
`canAccessStudent` trả `true` thay vì `false` khi không tìm thấy học sinh, khiến
phụ huynh xem được hồ sơ con nhà khác mà app không hề báo lỗi — thì chỉ `npm test`
đầy đủ mới bắt được. Đó là lý do phải chạy cả bộ, không chỉ bộ khế ước.

---

## Bắt buộc chạy trước mỗi lần commit

```bash
npm test              # 607 bài, không cần trình duyệt, khoảng 3 phút
```

Khi đổi bất cứ thứ gì trong `public/`, chạy thêm:

```bash
npm run test:giao-dien   # 125 bài chạy trên trình duyệt thật, cần Playwright
```

Hoặc `npm run test:tat-ca` để chạy cả hai (732 bài).

| Bộ | Số bài | Canh điều gì |
|---|---|---|
| `test:du-lieu-kiemthu` | 40 | Dữ liệu thật không lọt lên kho mã |
| `test:khe-uoc` | 104 | Tệp dùng chung không bị bỏ hay đổi hình dạng |
| `test:commit-rieng-kiemthu` | 30 | Bộ canh commit riêng vẫn chặn đúng thứ cần chặn |
| `test:api` | 68 | Toàn bộ nghiệp vụ và phân quyền hai vai trò |
| `test:bien-soan` | 58 | Giáo viên/quản trị soạn được nội dung, phụ huynh bị chặn đường ghi |
| `test:bao-mat` | 38 | Mật khẩu, cookie, header, chống dò, phiên bền vững |
| `test:mat-khau` | 25 | Cấp lại mật khẩu, buộc đổi mật khẩu tạm |
| `test:quan-tri` | 43 | Nhập CSV, bắt lỗi, sinh tài khoản, nhật ký |
| `test:nam-hoc` | 31 | Lên lớp, ra trường, giữ dữ liệu năm cũ |
| `test:tinh-nang` | 52 | Bật/tắt phân hệ, cắm thêm phân hệ mới |
| `test:co-lap-loi` | 101 | **Nguyên tắc số 1** |
| `test:luoi-an-toan` | 17 | Lỗi bất đồng bộ: promise bỏ quên thì sống, nổ đồng bộ thì dừng sạch |
| `test:album` | 43 | Tải ảnh, phân quyền xem, chặn tệp giả danh ảnh |
| `test:pwa` | 43 | Cài như app, chạy offline, khổ iPhone và Android |

Mọi bộ đều tự dựng máy chủ riêng trên cổng riêng với cơ sở dữ liệu tạm trong thư
mục tạm của hệ điều hành, **không đụng dữ liệu thật của trường**.

`test/co-lap-loi.test.mjs` chính là bộ canh giữ nguyên tắc số 1. Nó cố tình phá
hỏng từng thứ — tính năng lõi viết sai, tính năng bị gỡ mất, phân hệ mới chiếm
đường dẫn của phần khác, `schema.sql` chứa `DROP TABLE students` — rồi kiểm tra
app vẫn đăng nhập được và các tính năng còn lại vẫn chạy.

**Không được sửa hay nới lỏng bộ kiểm thử này để cho code chạy qua.** Nếu nó báo
đỏ thì code sai, không phải bài kiểm thử sai.

---

## Chủ động nêu ý kiến về độ ổn định dài hạn

Người dùng yêu cầu: **trong lúc làm bất cứ việc gì, thấy điều gì đe dọa độ ổn
định lâu dài của ứng dụng thì nêu ra ngay, không đợi được hỏi.**

Nêu là nêu, không phải tự ý làm. Nói rõ ba ý — thấy gì, hỏng ra sao nếu để yên,
sửa thì tốn gì — rồi để người dùng quyết. Việc đang làm dở vẫn làm cho xong.

Những thứ đáng nêu, ví dụ:

- Dữ liệu thật có nguy cơ bị đẩy lên GitHub, bị ghi đè, hoặc mất khi khởi động lại.
- Một chỗ hỏng có thể kéo sập cả ứng dụng thay vì chỉ hỏng một phần.
- Một quy định trong tệp này đang không thực thi được trên thực tế.
- Bài kiểm thử bao phủ thiếu đúng chỗ nguy hiểm, hoặc có bài kiểm thử luôn đúng.
- Thứ hôm nay chạy được nhưng sẽ hỏng khi trường đông lên, khi sang năm học mới,
  hoặc khi người khác tiếp quản mã.

Đừng nêu những chuyện vặt về sở thích viết mã. Chỉ nêu thứ có thể làm phụ huynh
và giáo viên không dùng được app, hoặc làm mất dữ liệu.

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
- **Tài liệu triển khai cho nhà trường** là `docs/QUY-TRINH-TRIEN-KHAI.docx`,
  sinh từ `scripts/xuat-quy-trinh.js` (chữ) + `docs/so-do-trien-khai.svg` (sơ đồ).
  Thay đổi nào ảnh hưởng tới cách triển khai/vận hành (lệnh, đường dẫn, cổng,
  phiên bản Node, quy trình sao lưu…) thì sửa hai tệp nguồn đó rồi chạy
  `npm run tai-lieu:quy-trinh` để bản Word khớp lại với app, trong cùng đợt commit.
