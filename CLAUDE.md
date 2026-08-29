# Quy định bắt buộc cho mọi thay đổi trong kho mã này

**CASA Mầm non** — app liên lạc nhà trường ↔ gia đình cho một trường mầm non
**3 cơ sở**. Mục tiêu số một: **thay hẳn sổ liên lạc giấy**. Sau đó mới tới phần
hành trình học tập theo triết lý CASA.

**Lứa tuổi: 12 tháng – 6 tuổi.** Trường nhận hầu hết từ **18 tháng**, và nhận sớm
hơn từ **12 tháng** khi trường đồng ý. Con số này đáng ghi ngay dòng đầu vì nó
quyết định nhiều thứ ở dưới: bé 14 tháng thì màn hình phải nói *"14 tháng"* chứ
không phải *"1 tuổi"*; nhóm nhà trẻ cần nhật ký thay bỉm và bú bình mà nhóm Lá
không cần; và ô nhập chiều cao/cân nặng gợi ý sai lứa tuổi là thứ cô với y tế
trường nhận ra ngay.

Kho mã này **nhân bản từ app 1 (SchoolConnect** — trường tiểu học, đang chạy thật
cho ~300 học sinh**)** tại điểm tách `bc9dfa3`. Toàn bộ lịch sử git của phần nền
được giữ nguyên, nên tra `git log` vẫn thấy vì sao mỗi dòng nền được viết như vậy.

Đọc `docs/KE-HOACH.md` để biết đang xây cái gì và theo thứ tự nào.
Đọc `docs/TIEN-DO.md` để biết **hiện đang đứng ở đâu**.

---

## Nguyên tắc số 1 — Không bao giờ được làm app ngừng dùng được

**Mỗi khi THÊM hoặc BỎ một tính năng, phải bảo đảm ba điều sau. Không có ngoại lệ.**

1. **App vẫn khởi động và vẫn đăng nhập được**, kể cả khi tính năng vừa thêm hoặc
   vừa bỏ có lỗi.
2. **Mọi tính năng khác đang bật vẫn chạy y như cũ** — không đổi hành vi, không đổi
   đường dẫn API, không đổi cấu trúc bảng của chúng.
3. **Dữ liệu đã có không được mất hay hỏng.** Bỏ một tính năng là ngưng dùng nó,
   không phải xóa dữ liệu của nó.

Nếu một yêu cầu không thể làm mà vẫn giữ được ba điều trên, **phải nói rõ với người
dùng trước khi làm**, không được tự ý đánh đổi.

Ở giai đoạn đầu app 2 chưa có người dùng thật, nhưng quy định này **có hiệu lực
ngay từ bây giờ**: nền của nó là nền đang chạy thật ở app 1, và mọi thói quen nới
ra lúc này sẽ còn nguyên khi trường mầm non bắt đầu dùng.

---

## 5 QUY TẮC giáo dục — phần hồn của app này

Năm quy tắc dưới đây đến từ bản kế hoạch CASA và **đứng ngang hàng với Nguyên tắc
số 1**. Chúng quyết định app này khác một phần mềm quản lý học sinh thông thường ở
chỗ nào.

1. **Quan sát ≠ đánh giá.** Một ghi chép về đứa trẻ trước hết là mô tả điều đã thấy.
   Việc gắn nó vào lĩnh vực phát triển nào là một bước riêng, do cô làm sau, có thể
   không làm.
2. **Chưa quan sát thấy ≠ không làm được.** Màn hình không bao giờ được trình bày
   "Chưa quan sát thấy" như một thất bại, một ô đỏ, hay một khoảng trống cần lấp.
3. **AI gợi ý ≠ cô quyết định.** Mọi thứ AI sinh ra đều là *nháp chờ cô duyệt*. AI
   không bao giờ tự đánh giá một đứa trẻ, không bao giờ ghi thẳng vào hồ sơ.
4. **Không phần trăm, không điểm số, không xếp hạng trẻ.** Không có bảng xếp hạng,
   không có "hoàn thành 78%", không so sánh bé này với bé khác hay với "chuẩn của
   độ tuổi" trên bất kỳ màn hình nào phụ huynh hoặc cô nhìn thấy.
5. **Đánh giá phải dẫn tới hành động.** Mỗi nhận định đi kèm một gợi ý làm được:
   ở lớp cô làm gì tiếp, ở nhà gia đình chơi gì cùng con.

**QUY TẮC 4 được canh bằng máy** (bài test quét giao diện), không bằng trí nhớ.
Bốn quy tắc còn lại canh bằng bài test phân quyền và bài test luồng. **Nhóm bài
test canh 5 quy tắc này là bất khả xâm phạm** — muốn đổi phải ghi rõ lý do và chờ
người dùng duyệt, giống hệt `test/co-lap-loi.test.mjs`.

### Ba lớp dữ liệu của một quan sát

| Lớp | Ai đọc được | Ghi chú |
|---|---|---|
| Ghi chú thô của cô | **chỉ cô đã ghi** (+ quản trị khi cần) | Nháp dở dang được phép tồn tại. **Không bao giờ** lộ sang phụ huynh. |
| Nhận định chuyên môn | cô trong nhóm, quản lý cơ sở | Gắn lĩnh vực phát triển, mức độ, minh chứng. |
| Câu chuyện kể cho gia đình | phụ huynh của chính bé đó | Do cô chủ động chọn công bố, không tự động. |

Ranh giới lớp 1 → phụ huynh có **bài test phân quyền riêng**. Đây là chỗ dễ rò rỉ
nhất và cũng là chỗ mất lòng tin của cô giáo nhanh nhất.

---

## Cách làm để giữ đúng nguyên tắc

### Thêm một tính năng mới

**Mặc định: tạo phân hệ cắm thêm trong `modules/<mã>/`, không sửa vào phần đang chạy.**
Xem `modules/README.md`. Cơ chế này đã được thiết kế để một phân hệ mới viết sai
cũng không lây sang phần khác:

- Máy chủ nạp từng phân hệ trong khối bắt lỗi riêng.
- Phân hệ mới chỉ đăng ký được đường dẫn trong vùng `api` đã khai báo; đường dẫn đã
  có chủ thì bị từ chối ngay khi khởi động.
- `schema.sql` của nó chỉ được `CREATE ... IF NOT EXISTS` với tên bắt đầu bằng mã
  phân hệ. Mọi câu `DROP`, `ALTER`, `DELETE` đều bị chặn trước khi chạy.

Chỉ sửa thẳng vào `routes/` và `public/js/views/` khi việc đó **thực sự thuộc về
một tính năng lõi đã có**. Khi đó chỉ chạm vào tệp của đúng tính năng ấy.

### Bỏ một tính năng

Theo thứ tự ưu tiên:

1. **Tắt trong Quản trị → Tính năng.** Tính năng biến khỏi màn hình, API bị chặn,
   **dữ liệu giữ nguyên**, bật lại được bất cứ lúc nào.
2. Nếu muốn gỡ hẳn mã: xóa tệp trong `routes/` và `public/js/views/`, **giữ nguyên
   bảng dữ liệu**. Máy chủ tự phát hiện tệp thiếu và tạm ẩn phân hệ đó, không sập.
3. **Không bao giờ tự ý `DROP TABLE`** hay xóa dữ liệu. Muốn xóa dữ liệu phải hỏi
   người dùng và nhắc họ chạy `npm run backup` trước.

### Tệp dùng chung — nhóm nguy hiểm nhất

`lib/db.js`, `lib/auth.js`, `public/js/ui.js`, `public/js/app.js` không thuộc về
tính năng nào cả, mà **cả ứng dụng đang dựa vào chúng**. Cơ chế cô lập lỗi không
bảo vệ được nhóm này — nó bảo vệ bằng cách khoanh vùng, mà tệp dùng chung thì không
có vùng riêng.

Hai quy định riêng cho nhóm này:

1. **Chỉ được thêm, không đổi và không bỏ thứ đang có.** Cần đổi hành vi thì truyền
   tham số hoặc thêm hàm mới bên cạnh.
2. **Sửa tệp dùng chung phải là commit riêng**, không trộn chung với việc thêm hay
   bỏ tính năng.

Khi thật sự phải bỏ hay đổi một thứ dùng chung, làm ba bước, mỗi bước một commit và
chạy kiểm thử sau mỗi bước: **thêm cái mới bên cạnh → chuyển từng chỗ gọi sang cái
mới → khi không còn ai gọi mới xóa cái cũ.** Ở bất kỳ bước nào app cũng đang chạy được.

> **Việc lớn nhất của GĐ 0 rơi đúng vào nhóm này:** app 1 gắn cứng *một cô – một
> lớp*, mầm non cần *nhiều cô – một nhóm*. Bắt buộc đi đủ ba bước trên, không được
> sửa thẳng `classIdsOf`/`studentsOf` trong một lần.

Hai vế trên **đều đã được canh bằng máy**, không phải chỉ là lời hứa.

### Dữ liệu của trường không bao giờ được lên kho mã

`scripts/kiem-tra-du-lieu.js` chặn mọi commit có chứa tệp `*.db`, `uploads/`,
`backups/`, `.khoi-phuc-*`, `.env`, khóa ký, hay CSV danh sách trẻ trong `data/`.
**Không có đường thoát** — lộ rồi thì viết lại lịch sử git cũng không thu lại được.
Nếu bản thân bộ canh chạy lỗi thì nó **chặn**, không cho qua.

Ở app này mức độ nhạy cảm còn cao hơn app 1: trẻ 12 tháng – 6 tuổi, **ảnh và video khuôn mặt
trẻ**, hồ sơ sức khỏe. Thư mục `uploads/` của app 2 phải nằm ngoài kho mã ngay từ
lần chạy đầu tiên (`DATA_DIR` trỏ ra ngoài).

Vế commit riêng do `scripts/kiem-tra-commit.js` canh, chạy ở ba chỗ:

| Chạy ở đâu | Lệnh | Bỏ qua được không |
|---|---|---|
| Gõ tay bất cứ lúc nào | `npm run test:commit-rieng` | — |
| Tự động mỗi lần `git commit` | móc `.githooks/commit-msg` | có, bằng `--no-verify` |
| Trên GitHub mỗi lần push | `.github/workflows/kiem-tra.yml` | không |

Khi trộn chung là có chủ ý thật, thêm một **dòng riêng** vào cuối lời commit:

```
Tron-co-y: đổi tên biến xuyên suốt, tách ra thì mã không chạy được
```

Móc git được bật tự động sau `npm install`. Bật lại bằng tay:
`git config core.hooksPath .githooks`.

`npm run test:khe-uoc` canh vế thứ nhất: chụp lại toàn bộ những gì các tệp dùng
chung đang cung cấp và báo đỏ nếu có thứ biến mất hoặc đổi số tham số. Thêm hàm mới
thì không báo đỏ — chạy `npm run test:khe-uoc -- --cap-nhat` để ghi nhận.

### Lỗi ở phần nền phải vá cả hai kho

App 1 và app 2 dùng chung một phần nền đã tách đôi. Quy ước xử lý ở
**`docs/LOI-NEN-CHUNG.md`** — đọc trước khi sửa bất cứ thứ gì trong `lib/`,
`scripts/`, `public/js/ui.js`, `public/js/app.js`, `public/sw.js`.

---

## Bắt buộc chạy trước mỗi lần commit

```bash
npm test              # bộ đầy đủ, không cần trình duyệt, khoảng 3 phút
```

Khi đổi bất cứ thứ gì trong `public/`, chạy thêm:

```bash
npm run test:giao-dien   # chạy trên trình duyệt thật, cần Playwright
```

Hoặc `npm run test:tat-ca` để chạy cả hai.

Số bài của app 2 sẽ lệch dần khỏi app 1 khi gỡ phân hệ tiểu học và thêm phân hệ mầm
non — **con số hiện tại luôn ghi ở `docs/TIEN-DO.md`**, không ghi cứng ở đây để
tránh hai chỗ nói khác nhau.

`test/co-lap-loi.test.mjs` là bộ canh giữ Nguyên tắc số 1. Nó cố tình phá hỏng từng
thứ rồi kiểm tra app vẫn đăng nhập được và các tính năng còn lại vẫn chạy.

**Không được sửa hay nới lỏng bộ kiểm thử này để cho code chạy qua.** Nếu nó báo đỏ
thì code sai, không phải bài kiểm thử sai. Quy định này áp dụng y hệt cho nhóm bài
test canh 5 QUY TẮC giáo dục và nhóm bài test phân quyền.

---

## Chủ động nêu ý kiến về độ ổn định dài hạn

**Trong lúc làm bất cứ việc gì, thấy điều gì đe dọa độ ổn định lâu dài của ứng dụng
thì nêu ra ngay, không đợi được hỏi.**

Nêu là nêu, không phải tự ý làm. Nói rõ ba ý — thấy gì, hỏng ra sao nếu để yên, sửa
thì tốn gì — rồi để người dùng quyết. Việc đang làm dở vẫn làm cho xong.

Đáng nêu: dữ liệu thật có nguy cơ lên GitHub / bị ghi đè / mất khi khởi động lại;
một chỗ hỏng kéo sập cả app; một quy định trong tệp này không thực thi được trên
thực tế; bài kiểm thử luôn đúng hoặc bao phủ thiếu đúng chỗ nguy hiểm; thứ hôm nay
chạy được nhưng hỏng khi trường đông lên, sang năm học mới, hoặc khi người khác
tiếp quản mã.

Đừng nêu chuyện vặt về sở thích viết mã.

---

## Vài điều khác cần nhớ

- **Sau mỗi phần hoàn thiện: cập nhật `docs/TIEN-DO.md`, commit, rồi push.**
- Đổi bất cứ tệp nào trong `public/` thì **tăng số `VERSION` trong `public/sw.js`**,
  nếu không điện thoại đã cài app sẽ kẹt ở bản cũ. **Đã canh bằng máy**:
  `npm run test:sw-version`, móc `.githooks/commit-msg`, và một job riêng trên
  GitHub. Bộ canh so với **nhánh chính**, không so với commit ngay trước — cả
  nhánh chỉ cần tăng một lần là đủ. Thật sự không cần tăng thì thêm một dòng
  riêng vào lời commit: `Khong-can-sw: <lý do>`.
- Giao diện và mọi thông báo lỗi viết **bằng tiếng Việt**, dễ hiểu với giáo viên và
  phụ huynh không rành máy tính. Đừng để lộ thuật ngữ kỹ thuật ra màn hình.
- **Gọi đúng tên của bậc mầm non**: *bé / trẻ* (không phải "học sinh"), *nhóm lớp*
  (không phải "lớp học"), *cô* (không phải "giáo viên bộ môn"). Mã nguồn kế thừa từ
  app 1 còn dùng `student`/`class` — được phép giữ ở tầng dữ liệu, nhưng **màn hình
  phải nói tiếng của trường mầm non**.
- Dữ liệu ở đây là thông tin trẻ dưới 6 tuổi, ảnh khuôn mặt và hồ sơ sức khỏe —
  nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân
  91/2025/QH15. Mọi đường dẫn mới đọc dữ liệu của bé **phải gọi
  `db.canAccessStudent(req.user, studentId)`** hoặc `db.canAccessClass(req.user, classId)`.
- **Ảnh nhóm**: một ảnh chỉ hiện cho gia đình khác khi **mọi bé trong ảnh** đều có
  đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện.
- Luôn bọc dữ liệu động bằng `UI.esc(...)` trước khi chèn vào HTML.
