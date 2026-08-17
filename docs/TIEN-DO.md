# Tiến độ nâng cấp

Tệp này ghi lại trạng thái công việc để có thể dừng và tiếp tục bất cứ lúc nào.
**Cập nhật ngay sau mỗi phần hoàn thiện, trước khi commit.**

Mục tiêu: đưa hệ thống từ quy mô demo lên vận hành thật cho trường 300 học sinh.
Xem kế hoạch đầy đủ và lý do từng hạng mục trong `docs/KE-HOACH-TRIEN-KHAI.md`.

---

## Tổng quan

| Mã | Hạng mục | Trạng thái |
|----|----------|-----------|
| B1 | Chuyển kho dữ liệu sang SQLite | ✅ **Hoàn thành** |
| B4 | Sao lưu tự động | ✅ **Hoàn thành** |
| B3 | Cấp lại mật khẩu khi quên | ✅ **Hoàn thành** — 25/25 kiểm thử đạt |
| B2 | Trang quản trị và nhập danh sách | ✅ **Hoàn thành** — 43/43 kiểm thử đạt |
| B5 | Chuyển năm học và lên lớp | ✅ **Hoàn thành** — 31/31 kiểm thử đạt |
| B6 | Bật/tắt tính năng và cắm thêm tính năng mới | ✅ **Hoàn thành** — 72/72 kiểm thử đạt |
| B7 | Cô lập lỗi: thêm/bỏ tính năng không làm hỏng app | ✅ **Hoàn thành** — 101/101 kiểm thử đạt |
| B8 | Giữ độ ổn định dài hạn: kiểm thử vào kho mã, canh tệp dùng chung, chặn lộ dữ liệu | ✅ **Hoàn thành** — 191/191 kiểm thử đạt, đã kiểm chứng trên máy Windows của trường |
| B9 | Đường soạn nội dung cho 4 phân hệ chỉ-đọc (TKB, thực đơn, kế hoạch, báo cáo) | ⏳ **Đang làm** — B9.1 Thời khóa biểu, B9.2 Thực đơn xong |

Thứ tự thực hiện: **B1 → B4 → B3 → B2 → B5**.
B1 là nền tảng cho mọi việc còn lại. B4 làm sớm để dữ liệu được an toàn ngay.
B2 phụ thuộc B1, B5 phụ thuộc B2.

---

## B1 — Chuyển kho dữ liệu sang SQLite

**Kết quả sau khi hoàn thành**, đo trên dữ liệu mô phỏng một năm học của
300 học sinh:

| Phép đo | Kho JSON cũ | SQLite | Cải thiện |
|---------|------------|--------|-----------|
| Ghi một lượt điểm danh | 1.803 ms | 0,091 ms | nhanh gấp ~20.000 lần |
| Cao điểm sáng (300 lượt) | 541 giây | 30 ms | nhanh gấp ~18.000 lần |
| Bộ nhớ máy chủ chiếm dụng | 195 MB | 7 MB | giảm 96% |
| Mở màn hình điểm danh cả lớp | — | 0,110 ms | |
| Mở một phòng chat | — | 0,208 ms | |

Toàn bộ 192 bài kiểm thử (API, bảo mật, PWA, album) đều đạt sau khi chuyển đổi.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B1.1 | Cài `better-sqlite3`, xác nhận biên dịch được | ✅ Xong |
| B1.2 | Thiết kế lược đồ bảng (`lib/schema.sql`) | ✅ Xong |
| B1.3 | Viết lại `lib/db.js` trên nền SQLite | ✅ Xong |
| B1.4 | Chuyển `data/seed.js` sinh thẳng vào SQLite | ✅ Xong |
| B1.5 | Script chuyển dữ liệu `db.json` cũ sang SQLite | ✅ Xong |
| B1.6 | Sửa nhóm route 1: auth, dashboard, students | ✅ Xong |
| B1.7 | Sửa nhóm route 2: attendance, leave, remarks, reports | ✅ Xong |
| B1.8 | Sửa nhóm route 3: menu, timetable, plans, bus, conduct | ✅ Xong |
| B1.9 | Sửa nhóm route 4: health, medicine, surveys | ✅ Xong |
| B1.10 | Sửa nhóm route 5: albums, notifications, messages | ✅ Xong |
| B1.11 | Chạy lại toàn bộ 4 bộ kiểm thử | ✅ Xong — 192/192 đạt |
| B1.12 | Đo lại hiệu năng ở quy mô 300 học sinh | ✅ Xong |

---

## B4 — Sao lưu tự động

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B4.1 | Script sao lưu dùng lệnh `.backup` của SQLite | ✅ Xong |
| B4.2 | Vòng đời bản sao: 7 ngày / 4 tuần / 12 tháng | ✅ Xong |
| B4.3 | Sao lưu kèm ảnh album | ✅ Xong |
| B4.4 | Script khôi phục và hướng dẫn tập dượt | ✅ Xong — đã diễn tập xóa và lấy lại thành công |
| B4.5 | Hướng dẫn cấu hình cron và đẩy ra nơi lưu ngoài | ✅ Xong — `docs/SAO-LUU.md` |

---

## B3 — Cấp lại mật khẩu khi quên

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B3.1 | Trường `mustChangePassword` trong bảng người dùng | ✅ Xong |
| B3.2 | API cấp mật khẩu tạm (giáo viên cấp cho phụ huynh lớp mình) | ✅ Xong |
| B3.3 | Buộc đổi mật khẩu ngay khi đăng nhập bằng mật khẩu tạm | ✅ Xong |
| B3.4 | Ghi nhật ký mọi lượt cấp lại | ✅ Xong |
| B3.5 | Giao diện cho giáo viên và màn hình buộc đổi | ✅ Xong |

---

## B2 — Trang quản trị và nhập danh sách

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B2.1 | Vai trò `admin`, phân quyền và tài khoản quản trị đầu tiên | ✅ Xong |
| B2.2 | Nhật ký thao tác (ai làm gì, lúc nào) | ✅ Xong |
| B2.3 | API quản lý lớp và phân công giáo viên chủ nhiệm | ✅ Xong |
| B2.4 | API quản lý học sinh: thêm, sửa, chuyển lớp, nghỉ học | ✅ Xong |
| B2.5 | Nhập danh sách từ tệp CSV, kiểm tra lỗi trước khi ghi | ✅ Xong |
| B2.6 | Tự sinh tài khoản và mật khẩu ban đầu, xuất phiếu để in | ✅ Xong |
| B2.7 | Giao diện quản trị | ✅ Xong |

---

## B5 — Chuyển năm học và lên lớp

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B5.1 | Gắn dữ liệu theo năm học, tra cứu được năm cũ | ✅ Xong |
| B5.2 | Thao tác lên lớp hàng loạt cuối năm | ✅ Xong |
| B5.3 | Tiếp nhận khối mới, xử lý học sinh chuyển đi | ✅ Xong |
| B5.4 | Giao diện chuyển năm học cho quản trị | ✅ Xong |

---

## B6 — Bật/tắt tính năng và cắm thêm tính năng mới

Nhà trường tự chọn dùng phân hệ nào, và thêm được tính năng chưa từng có mà
**không phải sửa vào phần đang chạy**.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B6.1 | Danh mục phân hệ và bảng lưu trạng thái bật/tắt (`lib/modules.js`) | ✅ Xong |
| B6.2 | Chặn API của phân hệ đã tắt ở tầng máy chủ, không chỉ giấu biểu tượng | ✅ Xong |
| B6.3 | Màn hình chính dựng động từ danh sách phân hệ đang bật | ✅ Xong |
| B6.4 | Tab **Quản trị → Tính năng** để bật/tắt, ghi nhật ký mọi thay đổi | ✅ Xong |
| B6.5 | Cơ chế cắm thêm: máy chủ tự nạp `modules/<mã>/` khi khởi động | ✅ Xong |
| B6.6 | Cô lập lỗi — một phân hệ hỏng không làm sập ứng dụng | ✅ Xong |
| B6.7 | Phân hệ mẫu `modules/hocphi/` và hướng dẫn viết `modules/README.md` | ✅ Xong |

**Bốn điều được bảo đảm bằng kiểm thử:**

1. Tắt một phân hệ thì API của nó trả 404 cho cả đường đọc lẫn đường ghi — người
   biết đường dẫn cũng không lấy được dữ liệu.
2. Các phân hệ khác và việc đăng nhập **không hề bị ảnh hưởng**.
3. Bật lại thì **dữ liệu cũ còn nguyên vẹn**, đối chiếu đúng từng bản ghi.
4. Cắm một phân hệ cố tình viết lỗi vào thì máy chủ vẫn khởi động, người dùng vẫn
   đăng nhập và dùng bình thường, trang quản trị nêu rõ phân hệ nào đang lỗi.

---

## B7 — Cô lập lỗi khi thêm hoặc bỏ tính năng

Nguyên tắc: **thêm hoặc bỏ một tính năng, kể cả khi tính năng đó viết sai, không
được làm app ngừng dùng được và không được đụng tới các tính năng khác đang bật.**
Ghi thành quy định bắt buộc trong `CLAUDE.md`.

Trước B7 nguyên tắc này chỉ đúng với phân hệ cắm thêm. Đo thử bằng cách cố tình
viết sai một tệp tính năng lõi thì **toàn bộ máy chủ sập ngay khi khởi động** —
tức là chỉ cần một lỗi ở phần Nề nếp là cả trường mất luôn cả đăng nhập.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B7.1 | Nạp từng tệp trong `routes/` trong khối bắt lỗi riêng | ✅ Xong |
| B7.2 | Tính năng lỗi bị tạm ẩn, API trả 503, quản trị thấy lý do | ✅ Xong |
| B7.3 | Tính năng bị gỡ mất tệp thì tự ẩn, không hiện biểu tượng chết | ✅ Xong |
| B7.4 | Phân hệ mới không đăng ký được đường dẫn đã có chủ | ✅ Xong |
| B7.5 | Phân hệ mới chỉ đăng ký được route trong vùng `api` của nó | ✅ Xong |
| B7.6 | `schema.sql` của phân hệ mới chỉ được tạo bảng mang tên nó | ✅ Xong |
| B7.7 | Giao diện báo rõ khi màn hình một tính năng không tải được | ✅ Xong |

Sáu tệp nền tảng (`auth`, `dashboard`, `admin`, `accounts`, `modules`,
`schoolyear`) vẫn cố tình để dừng hẳn nếu hỏng: chạy tiếp với một ứng dụng không
đăng nhập được thì tệ hơn là dừng để người quản trị biết mà sửa.

---

## B8 — Giữ độ ổn định dài hạn

Ba lỗ hổng phát hiện khi rà lại chính những gì đã hứa ở B6–B7.

**B8.1 — Kiểm thử không nằm trong kho mã.** Chỉ 153 bài có trong `test/`, 291 bài
còn lại sống trong thư mục tạm của phiên làm việc nên phiên sau không chạy lại
được. Đúng những bộ đó mới bắt được hồi quy khi sửa `lib/db.js` hay `lib/auth.js`.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B8.1a | Chuyển 7 bộ cũ vào `test/`, bỏ hết đường dẫn cứng | ✅ Xong |
| B8.1b | `test/_chung.mjs`: mỗi bộ tự dựng máy chủ, cổng riêng, CSDL tạm | ✅ Xong |
| B8.1c | `npm test` (không cần trình duyệt) và `npm run test:giao-dien` | ✅ Xong |

**B8.2 — Tệp dùng chung không có gì canh.** Cô lập lỗi bảo vệ bằng cách khoanh
vùng, mà tệp dùng chung thì không có vùng riêng.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B8.2a | `test:khe-uoc` chụp 104 mục các tệp dùng chung cung cấp, báo đỏ khi mất | ✅ Xong |
| B8.2b | `scripts/kiem-tra-commit.js` chặn commit trộn tệp dùng chung với tính năng | ✅ Xong |
| B8.2c | Chạy ở ba mức: gõ tay, móc git `commit-msg`, GitHub Actions | ✅ Xong |
| B8.2d | Đường thoát `Tron-co-y:` phải là dòng riêng và có lý do | ✅ Xong |

**B8.3 — Dữ liệu thật có thể lọt lên GitHub.** `data/school.db` vẫn đang được git
theo dõi từ B1, vì `.gitignore` không có tác dụng với tệp đã commit từ trước.

| Bước | Việc | Trạng thái |
|------|------|-----------|
| B8.3a | Gỡ theo dõi CSDL và tệp `.khoi-phuc-*`, giữ nguyên tệp trên đĩa | ✅ Xong |
| B8.3b | `.gitignore` chặn cả `/data/*` rồi mở lại `seed.js` | ✅ Xong |
| B8.3c | `scripts/kiem-tra-du-lieu.js` chặn lúc commit, kể cả khi ép `git add -f` | ✅ Xong |
| B8.3d | GitHub kiểm lại mỗi lần push, canh cả `--no-verify` | ✅ Xong |
| B8.3e | Cảnh báo lúc khởi động khi `DATA_DIR` nằm trong thư mục mã nguồn | ✅ Xong |
| B8.3f | README: hướng dẫn chuyển dữ liệu ra ngoài, cho cả Windows và Linux | ✅ Xong |

**B8.4 — Node quá cũ phải bị chặn ngay lúc cài.** `engines` ghi `>=18` trong khi
`better-sqlite3` v13 đòi `>=22` — lời hứa đang sai, ai cài Node cũ sẽ gặp lỗi
biên dịch khó hiểu. Siết `engines` thành `>=22`, thêm `.nvmrc`, và bật
`engine-strict` trong `.npmrc` để `npm install` dừng hẳn kèm thông báo rõ thay vì
chỉ cảnh cáo rồi cài tiếp.

**B8.5 — Lưới an toàn cho lỗi bất đồng bộ.** Cô lập lỗi ở tầng nạp phân hệ và
tầng xử lý yêu cầu không đỡ được lỗi nổ trong `setTimeout` hay promise bị bỏ
quên — đo thử thì một dòng viết ẩu trong một phân hệ cắm thêm giết cả tiến
trình. Nay (`test:luoi-an-toan`, 17 bài):

- Promise bị từ chối không ai bắt → ghi log rõ rồi **chạy tiếp**: đó chỉ là giá
  trị lỗi bị bỏ quên, mọi thao tác ghi SQLite đều đồng bộ nên không có giao dịch
  dở dang; sập cả trường vì một dấu `.catch` thiếu thì trái nguyên tắc số 1.
- Lỗi ném đồng bộ không ai bắt → **dừng có chủ ý** với log giải thích và mã
  thoát 1: trạng thái bộ nhớ không còn tin được, chạy tiếp có nguy cơ ghi dữ
  liệu sai. Trình giám sát bật lại trong vài giây.
- README thêm mục "Tự khởi động lại khi gặp sự cố": NSSM cho Windows, systemd
  cho Linux; Docker/Render có sẵn. Chạy thật bắt buộc có trình giám sát.

**B8.6 — Bộ kiểm thử chạy được trên Windows.** Các bài kiểm thử dùng cú pháp
`DATA_DIR=... node ...` (chỉ shell Linux/Mac hiểu) và đường dẫn trình duyệt viết
chết `/opt/pw-browsers/chromium` (chỉ tồn tại trên CI) — tức là "chạy bằng một
lệnh" mới đúng trên Linux, chưa đúng trên máy Windows của trường. Đã chuyển sang
truyền biến qua tham số `env` của Node và để Playwright tự tìm trình duyệt khi
không có `CHROMIUM_PATH`.

✅ **Đã kiểm chứng ngày 17/08/2026 trên chính máy Windows của trường: trọn bộ
655/655 bài đạt** (549 bài `npm test` + 106 bài giao diện trên trình duyệt thật). Ba lần chạy đầu lần lượt bắt được ba khác biệt thật mà Linux không
thể thấy (B8.7 — thư viện thiếu tệp dựng sẵn, B8.8 — Windows khóa tệp khi dọn),
sửa xong thì xanh trọn bộ. Bộ kiểm thử nay được chứng minh trên cả ba môi
trường: máy phát triển (Linux), CI của GitHub (Linux), máy trường (Windows).

**B8.7 — Ghim Node 22 và ghim thư viện cơ sở dữ liệu ở bản có tệp dựng sẵn.**
Hai lần chạy đầu trên máy Windows thật (B8.6) lần ra thủ phạm theo hai lớp:

- Lớp một (đoán ban đầu, đúng một nửa): máy trường chạy Node 24, lọt qua khai
  báo `>=22`. Đã ghim `engines: 22.x` — dòng duy nhất mọi kiểm thử chạy trên đó.
- Lớp hai (gốc rễ, lộ ra khi Node 22 vẫn vỡ y hệt): `better-sqlite3` 13.0.3 —
  bản mới nhất — **không phát hành kèm tệp dựng sẵn cho bất kỳ hệ điều hành
  nào** (kiểm chứng: GitHub trả 404 cho cả win32 lẫn linux). Máy nào không có
  trình biên dịch C++ là chết `npm install`; Linux thường có sẵn gcc nên không
  ai để ý, Windows thì không. Đã ghim `better-sqlite3` = **12.11.1**: bản mới
  nhất có đủ tệp dựng sẵn (kiểm chứng 200 cho win32-x64 và linux-x64, hỗ trợ
  Node 20→26), toàn bộ 655 bài chạy lại đều xanh.

**B8.8 — Dọn thư mục tạm kiểu Windows.** Phát hiện thứ ba từ máy trường: cả 38
bài bảo mật ĐẠT nhưng bài văng ở khâu đổ rác cuối — Windows từ chối xóa tệp .db
mà máy chủ thử vừa bị tắt còn giữ (EBUSY), điều Linux cho phép nên không nơi nào
khác thấy. Nay: dọn ĐẦU lần chạy có retry là chốt chặn chính; dọn CUỐI là
cố-gắng-hết-sức, xóa không được thì để lần sau dọn — không để việc đổ rác làm đỏ
một bài đã đạt.

⏰ **Hẹn xem lại: đầu năm học 2027 (Node 22 hết hỗ trợ 04/2027).** Trình tự:
kiểm tra dòng 13.x của `better-sqlite3` đã phát hành kèm tệp dựng sẵn chưa
(soi assets trên GitHub Releases, đừng tin số phiên bản) → nâng thư viện →
chạy đủ 655 bài → kiểm trên Windows → mới nới `engines`. Không đảo thứ tự.

Hai bộ canh có triết lý ngược nhau, cố ý:

- **Commit riêng** — có đường thoát, và nếu bản thân nó lỗi thì cho qua. Trộn
  chung đôi khi hợp lý thật.
- **Dữ liệu** — không có đường thoát, và nếu bản thân nó lỗi thì chặn. Không có
  trường hợp nào mà đẩy hồ sơ trẻ em lên kho công khai là đúng, và lộ rồi thì
  viết lại lịch sử git cũng không thu lại được.

---

## B9 — Đường soạn nội dung cho 4 phân hệ chỉ-đọc

Người dùng đăng nhập vai giáo viên phát hiện Kế hoạch giáo dục và Báo cáo học tập
không có nút thêm/sửa. Rà lại cả 16 phân hệ: **4 phân hệ chỉ có đường đọc** — dữ
liệu vào bằng seed, giáo viên không có cách nào cập nhật cho phụ huynh — gồm Thời
khóa biểu, Thực đơn, Kế hoạch giáo dục, Báo cáo học tập. 11 phân hệ còn lại có
đường ghi đầy đủ. Nguyên nhân gốc: lỗ hổng kiểm thử — có bài "phụ huynh đọc được"
nhưng không có bài "giáo viên tạo được".

| Bước | Việc | Trạng thái |
|---|---|---|
| B9.1 | **Thời khóa biểu**: `PUT /api/timetable/:classId` — GVCN sửa lớp mình, quản trị sửa lớp bất kỳ, phụ huynh bị chặn; sửa từng thứ ngay trên màn hình xem, lập mới cho lớp chưa có; máy chủ tự làm sạch dữ liệu nhập tay | ✅ Xong — 23 bài API + 8 bài trình duyệt |
| B9.2 | **Thực đơn**: `PUT /api/menu/:date` + `POST /api/menu/copy-week` — quản trị soạn từng ngày (tên bữa, giờ ăn, mỗi dòng một món), ngày trống có nút soạn ngay, chép tuần trước chỉ đổ vào ngày còn trống; thêm `?week=-1` xem lại tuần trước | ✅ Xong — 17 bài API + 6 bài trình duyệt |
| B9.3 | **Kế hoạch giáo dục**: GVCN soạn theo tháng — chủ đề, mục tiêu, 4 tuần, lời nhắn phụ huynh | ⬜ |
| B9.4 | **Báo cáo học tập**: GVCN nhập theo học kỳ — điểm môn, hạnh kiểm, nhận xét; chuyên cần tự tính từ dữ liệu điểm danh | ⬜ |

Bộ kiểm thử mới `test:bien-soan` (API) + `test/bien-soan-giao-dien.test.mjs`
(trình duyệt) canh cả bốn: giáo viên/quản trị soạn được và đọc lại đúng từng ô,
phụ huynh bị chặn cả API lẫn nút trên màn hình, thân yêu cầu sai bị 400 mà không
làm hỏng dữ liệu cũ.

---

## Tổng kết

Tám hạng mục B1–B8 đã hoàn thành, B9 đang làm dở. **709 bài kiểm thử tự động đều
đạt**, tất cả đều nằm trong kho mã và chạy được bằng lệnh.

`npm test` — 589 bài, không cần trình duyệt, khoảng 3 phút:

| Bộ kiểm thử | Số bài | Nội dung |
|-------------|--------|----------|
| `test:du-lieu-kiemthu` | 40 | Dữ liệu thật không lọt lên kho mã |
| `test:khe-uoc` | 104 | Tệp dùng chung không bị bỏ hay đổi hình dạng |
| `test:commit-rieng-kiemthu` | 30 | Bộ canh commit riêng vẫn chặn đúng thứ cần chặn |
| `test:api` | 68 | Toàn bộ nghiệp vụ và phân quyền hai vai trò |
| `test:bien-soan` | 40 | Giáo viên/quản trị soạn được nội dung, phụ huynh bị chặn đường ghi |
| `test:bao-mat` | 38 | Băm mật khẩu, cookie, header, chống dò, phiên bền vững |
| `test:mat-khau` | 25 | Mật khẩu tạm, buộc đổi, phân quyền |
| `test:quan-tri` | 43 | Nhập CSV, bắt lỗi, sinh tài khoản, nhật ký |
| `test:nam-hoc` | 31 | Lên lớp, ra trường, giữ dữ liệu năm cũ |
| `test:tinh-nang` | 52 | Chặn API khi tắt, giữ dữ liệu, cắm thêm phân hệ mới |
| `test:co-lap-loi` | 101 | Cố tình phá từng tính năng, kiểm tra phần còn lại vẫn chạy |
| `test:luoi-an-toan` | 17 | Lỗi bất đồng bộ: promise bỏ quên thì sống, nổ đồng bộ thì dừng sạch |

`npm run test:giao-dien` — 120 bài chạy trên trình duyệt thật, cần Playwright:

| Bộ kiểm thử | Số bài | Nội dung |
|-------------|--------|----------|
| `test:album` | 43 | Tải ảnh, phân quyền xem, chặn tệp giả danh ảnh |
| `test:pwa` | 43 | Cài đặt như app, chạy offline, khổ iPhone và Android |
| bật/tắt tính năng | 20 | Thao tác thật trên màn hình quản trị và màn hình chính |
| soạn nội dung | 14 | Giáo viên sửa TKB, quản trị soạn thực đơn trên màn hình thật; phụ huynh không thấy nút soạn |

`npm run test:tat-ca` chạy cả hai nhóm.

Mọi bộ đều tự dựng máy chủ riêng trên cổng riêng với cơ sở dữ liệu tạm, không cần
`npm start` chạy sẵn và **không đụng dữ liệu thật của trường**.

Việc còn lại trước khi cho trường dùng thật nằm ở phía nhà trường: thuê hạ tầng,
soạn văn bản đồng ý của phụ huynh, nhập danh sách thật và tập huấn giáo viên.
Xem `docs/ke-hoach-trien-khai.html`.

---

## Tài liệu triển khai cho nhà trường

`docs/QUY-TRINH-TRIEN-KHAI.docx` — quy trình 7 giai đoạn kèm sơ đồ, trình bày
HAI phương án đặt máy chủ: A (máy tại trường, Windows + NSSM) và B (thuê VPS,
Ubuntu + systemd + Caddy, máy trường chỉ giữ bản sao lưu kéo về hằng đêm — đủ
nguyên tắc 3-2-1). Sinh tự động bằng `npm run tai-lieu:quy-trinh` từ
`scripts/xuat-quy-trinh.js` và `docs/so-do-trien-khai*.svg` (mỗi phương án
một sơ đồ). Tài liệu tự đóng dấu bản mã nguồn ở trang bìa;
CLAUDE.md có quy định tạo lại nó mỗi khi thay đổi ảnh hưởng tới triển khai.

---

## Cách tiếp tục khi phiên làm việc bị gián đoạn

1. Đọc bảng trạng thái ở trên, tìm dòng ⏳ hoặc ⬜ đầu tiên.
2. Xem `git log --oneline -15` để biết phần nào đã đẩy lên.
3. Chạy `npm test` để xác nhận trạng thái hiện tại còn chạy được.
4. Làm tiếp bước đó, cập nhật bảng này, rồi commit và đẩy lên.
