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
| B9 | Đường soạn nội dung cho 4 phân hệ chỉ-đọc (TKB, thực đơn, kế hoạch, báo cáo) | ✅ **Hoàn thành** — 105/105 kiểm thử đạt (80 API + 25 trình duyệt) |
| B10 | Kiểm tra máy chủ thật: bịt khoảng trống giữa kho mã và bản cài đặt đang chạy | ✅ **Hoàn thành** — 34/34 kiểm thử đạt |
| B11 | Vá 5 lỗ hổng do đợt rà soát nhiều tác nhân tìm ra (Đợt 1) | ✅ **Hoàn thành** |
| B12 | Đợt 2: chặn XSS qua `onclick`, sửa lớp/học sinh, cảnh báo nhập trùng, bắt lỗi bảng mã CSV, sửa màn hình điểm danh | ✅ **Hoàn thành** — 195/195 kiểm thử đạt (122 API + 73 trình duyệt) |
| B13 | Đợt 3: album lớp đã đóng, huy hiệu đơn nghỉ, trần cho màn dày theo năm, sửa/thu hồi bốn phân hệ, ghi lịch sử lớp | ✅ **Hoàn thành** — 123/123 kiểm thử đạt (93 API + 30 trình duyệt) |
| B14 | Đợt 4: mở lại nội dung năm học cũ — khoảng lớp có thời gian, hồ sơ con đã ra trường, album lớp cũ cho phụ huynh, phân hệ Năm học trước | ✅ **Hoàn thành** — 42/42 kiểm thử đạt |

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
| B9.3 | **Kế hoạch giáo dục**: `PUT /api/plans/:classId/:year/:month` — GVCN soạn lớp mình theo tháng (chủ đề bắt buộc, mục tiêu mỗi dòng một mục, tối đa 6 tuần trọng tâm + hoạt động, lời nhắn phụ huynh); chọn được tháng tới; mỗi lớp mỗi tháng một bản, soạn lại là ghi đè không nhân bản | ✅ Xong — 18 bài API + 5 bài trình duyệt |
| B9.4 | **Báo cáo học tập**: `PUT /api/reports/:studentId` — GVCN soạn cho học sinh lớp mình theo học kỳ (điểm thang 10 làm tròn 1 số lẻ, mức đánh giá từng môn, hạnh kiểm, đánh giá chung, nhận xét); **chuyên cần KHÔNG nhập tay** — máy chủ tự đếm từ bảng điểm danh đúng khoảng học kỳ (HK1: 01/08–31/12, HK2: 01/01–31/07); mỗi học sinh mỗi kỳ một bản, soạn lại là ghi đè | ✅ Xong — 22 bài API + 6 bài trình duyệt |

Bộ kiểm thử mới `test:bien-soan` (API) + `test/bien-soan-giao-dien.test.mjs`
(trình duyệt) canh cả bốn: giáo viên/quản trị soạn được và đọc lại đúng từng ô,
phụ huynh bị chặn cả API lẫn nút trên màn hình, thân yêu cầu sai bị 400 mà không
làm hỏng dữ liệu cũ.

---

## B10 — Kiểm tra máy chủ thật

Phát hiện khi tập dượt triển khai lên một VPS Ubuntu thật: tài liệu hẹn cron sao
lưu lúc `0 2 * * *` nhưng **không có bước nào đặt múi giờ**. VPS mới cài luôn chạy
UTC, nên lịch đó thực ra chạy 9 giờ sáng giờ Việt Nam — đúng lúc giáo viên điểm
danh và phụ huynh mở app.

Điều đáng nói: **không bộ kiểm thử nào bắt được lỗi này.** Cả 760 bài đều xanh,
kể cả `test:co-lap-loi` vốn cố tình phá từng thứ. Vì lỗi không nằm trong mã — nó
nằm ở khoảng cách giữa tài liệu và việc thực sự làm trên máy. Một máy chủ đặt sai
múi giờ, chưa hề sao lưu, để dữ liệu trong thư mục mã nguồn và còn nguyên mật khẩu
mẫu vẫn qua đủ 760 bài.

| Bước | Việc | Trạng thái |
|---|---|---|
| B10.1 | Tài liệu: thêm `timedatectl set-timezone Asia/Ho_Chi_Minh` vào Giai đoạn 3.1, kèm giải thích hậu quả | ✅ Xong |
| B10.2 | Tài liệu: thay cron bằng **systemd timer** với `OnCalendar=... Asia/Ho_Chi_Minh` — lịch tự mang múi giờ, đặt sai múi giờ máy chủ cũng không lệch. Thêm `Persistent=true` để chạy bù nếu máy tắt đúng giờ đó | ✅ Xong |
| B10.3 | `scripts/kiem-tra-may-chu.js` — kiểm 8 mục trên **máy chủ đang phục vụ**: múi giờ, vị trí dữ liệu, CSDL mở được, mật khẩu mẫu, lịch sao lưu, bản sao lưu còn mới, bản sao lưu **mở ra được thật**, dung lượng đĩa, hạn chứng chỉ HTTPS | ✅ Xong |
| B10.4 | Đưa vào bảng kiểm Giai đoạn 3 và 4, thêm dòng "hằng tháng" trong bảng bảo trì | ✅ Xong |

Vài quyết định thiết kế đáng ghi lại:

- **Chỉ báo, không tự sửa.** Mỗi mục hỏng in kèm câu lệnh khắc phục để người phụ
  trách ở trường tự làm. Tự sửa thì có ngày nó sửa nhầm thứ đang chạy tốt.
- **Mở cơ sở dữ liệu ở chế độ chỉ đọc, bắt buộc tệp phải có sẵn.** Một bộ kiểm tra
  không được phép tạo ra thứ nó đang đi kiểm — nếu không, chạy lần đầu ở máy chủ
  sai `DATA_DIR` sẽ luôn báo "đạt". Có bài kiểm thử canh đúng điểm này.
- **Mỗi mục kiểm chạy trong khối bắt lỗi riêng.** Một phép kiểm hỏng không được
  làm cả bản báo cáo tắt ngóm — đúng lúc máy chủ có vấn đề là lúc cần đọc các mục
  còn lại nhất.
- **Thoát mã 1 khi có mục cần sửa**, để đặt lịch chạy tự động và biết mà báo.
- Bộ kiểm thử `test:may-chu` thử **cả hai chiều** cho từng mục: dựng tình huống
  hỏng xem có báo không, rồi sửa tình huống đó xem có thôi báo không. Thử một
  chiều thì không phân biệt được "bắt đúng" với "lúc nào cũng kêu".

Giới hạn phải nói rõ: bộ này **không thay được người chịu đọc kết quả**. Nếu trường
không phân công ai chạy hằng tháng thì nó cũng thành một thứ nữa bị bỏ quên. Vì vậy
nó được gắn vào bảng kiểm bàn giao — chỗ chắc chắn có người chạy ít nhất một lần.

---

## B11 — Vá 5 lỗ hổng từ đợt rà soát nhiều tác nhân

Một đợt rà soát 27 tác nhân: ba tác nhân dùng thử app bằng trình duyệt theo vai
phụ huynh, giáo viên và quản trị; năm tác nhân đào theo phân quyền, chèn mã độc,
quy mô 300 học sinh, nghiệp vụ trường học và độ bền. Mỗi phát hiện sau đó bị một
tác nhân khác cố tình bác bỏ, mặc định là loại nếu không tự tái hiện lại được.
Kết quả: 44 phát hiện thô → 17 đứng vững, 1 bị bác bỏ.

Đợt 1 vá 5 lỗ phải xong **trước khi phụ huynh đầu tiên đăng nhập**.

| Mã | Lỗ hổng | Cách vá |
|---|---|---|
| A1 | Màn hình đăng nhập in sẵn `phuhuynh / 123456` và `giaovien / 123456` kèm nút bấm-là-vào, viết cứng trong mã nên bản chạy thật hiện y hệt bản demo | Gỡ hẳn khối đó khỏi `public/js/views/login.js`, đồng bộ sang bản sao dùng cho APK Android |
| B2 | Máy chủ tự sinh dữ liệu mẫu kèm 8 tài khoản `123456` khi thư mục dữ liệu trống, kể cả ở chế độ chạy thật | `NODE_ENV=production` + cơ sở dữ liệu trống → in hướng dẫn rồi **dừng hẳn**, không tự seed |
| A3 | Khóa chống dò mật khẩu bị vô hiệu hoàn toàn: `clientIp` đọc thẳng header `X-Forwarded-For` do chính người gõ mật khẩu tự khai. 60 lần sai với 60 giá trị khác nhau không lần nào bị chặn | Bỏ đọc header, dùng `req.ip`; **thêm bộ đếm thứ hai theo tên đăng nhập** kiểu chậm dần; đặt trần số mục cho cả hai bộ đếm; băm giả khi không tìm thấy tài khoản để không lộ tên nào có thật |
| A2 | Ba đường ghi mà **phụ huynh** gọi được (Xin nghỉ, Dặn thuốc, Khảo sát) không giới hạn độ dài — một đơn 8 MB hoặc 200.000 dòng thuốc làm màn hình của cả lớp đông cứng, mà app không có đường xóa đơn | Cắt độ dài từng ô: lý do nghỉ 1.000 ký tự, tối đa 10 loại thuốc × 100 ký tự mỗi ô, câu trả lời khảo sát 1.000 ký tự |
| A5 | Đổi giáo viên chủ nhiệm chỉ gán `classId` cho cô mới, **không xóa của cô cũ** — cô đã chuyển lớp vẫn đọc và ghi được hồ sơ cả lớp cũ vĩnh viễn. Ngược lại, tạo lớp kèm chủ nhiệm chỉ ghi `classes.teacherId` nên cô đăng nhập vào thấy "Sĩ số 0" | Gom về một hàm `datChuNhiem()` ghi đủ cả hai chiều, dùng ở cả ba chỗ (tạo lớp, sửa lớp, tạo giáo viên) |

Hai điểm đáng ghi lại về cách vá A3:

- **Cố ý KHÔNG khóa cứng theo tên đăng nhập.** Tên đăng nhập của phụ huynh sinh
  từ số điện thoại nên người ngoài đoán được; khóa cứng theo tên là đổi một lỗ
  hổng lấy một lỗ hổng khác — nhập sai vài lần để khóa phụ huynh khác khỏi app.
  Dùng cách chậm dần (0,5s → 8s) nên chủ tài khoản thật hầu như không thấy phiền,
  còn tốc độ dò tụt từ ~19 lần/giây xuống dưới 1 lần/8 giây. Có bài kiểm thử canh
  đúng điều này: bị dò nhiều lần thì chủ tài khoản **vẫn đăng nhập được**.
- **Dùng `req.ip` là chưa đủ khi đặt máy chủ tại trường.** Với `trust proxy` bật
  mặc định, Express vẫn lấy giá trị từ header nếu không có proxy thật phía trước.
  Vì vậy phương án A phải đặt `TRUST_PROXY=0`; bài kiểm thử dựng riêng một máy chủ
  với cấu hình đó để chứng minh lúc ấy header giả hoàn toàn vô tác dụng.

Kèm theo: `scripts/sua-quyen-chu-nhiem.js` dọn dữ liệu đã lỡ lệch trên máy chủ
đang chạy (mặc định **chỉ xem**, phải thêm `--sua` mới ghi), và bộ kiểm tra máy
chủ có thêm một mục phát hiện tình trạng lệch này.

Bộ `test:lo-hong` canh cả năm lỗ không tái phát — bộ kiểm thử cũ không bắt được
bất kỳ lỗ nào trong số đó, đấy chính là lý do bộ này ra đời.

---

## B12 — Đợt 2: bảy việc ở màn hình quản trị và màn hình điểm danh

| Mã | Vấn đề | Cách sửa |
|---|---|---|
| A7 | Tên do người dùng nhập được nhét vào tham số chuỗi của `onclick`. `UI.esc` đổi `'` thành `&#39;`, nhưng trình duyệt giải mã thực thể HTML **trước** khi trình phân tích JS nhìn thấy — nên một tên lớp `');window.__pwn=1;//` vẫn chạy được | `accounts.js` và `admin.js` chỉ truyền mã (id) qua `onclick`, tên tra lại từ danh sách đã tải. Giữ chữ ký hai tham số để bản giao diện cũ trong bộ nhớ đệm điện thoại vẫn gọi được |
| A4 | Không có màn hình nào phân công lại giáo viên chủ nhiệm; nút "Đi phân công" sau khi chuyển năm học dẫn về một danh sách chỉ để đọc. `datChuNhiem()` của Đợt 1 lại chỉ gỡ **một chiều** — lớp cũ của cô mới vẫn hiện tên cô | Thêm màn hình Sửa lớp (tên, phòng, khối, chủ nhiệm) + thẻ cảnh báo đếm lớp chưa có chủ nhiệm và tô đỏ dòng lớp đó. Máy chủ: `datChuNhiem()` gỡ đủ **hai chiều**, và từ chối tên lớp rỗng |
| A6a | Danh sách học sinh trong lớp chỉ để xem: không sửa được tên/mã/ngày sinh, không chuyển lớp được, không cho nghỉ học được, và em đã cho nghỉ thì không có đường nào nhận lại | Nút **Sửa** và **Cho nghỉ** ngay trong màn hình lớp, kèm mục "đã nghỉ" có nút **Nhận lại**. Máy chủ chặn tên rỗng và mã trùng em khác; `?keCaNghi=1` để tìm lại em đã nghỉ. Cho nghỉ vẫn chỉ là **đánh dấu, không xóa gì** |
| A6b | Nhập lại đúng tệp cũ (trường hay làm khi thêm vài em mới) tạo bản sao của cả trường kèm tài khoản phụ huynh mới, **không cảnh báo gì** | Nhận ra em đã có theo họ tên bỏ dấu + ngày sinh + lớp, cả với dữ liệu sẵn có lẫn trùng ngay trong tệp. Mặc định **bỏ qua** dòng trùng, màn hình liệt kê từng em; quản trị tích một ô là nhập được cả em trùng nếu trường thật sự có |
| C1 | Tệp CSV lưu sai bảng mã (Excel bản Việt hay lưu kiểu cũ) nhập vào thành tên hỏng hàng loạt, mà app không có đường sửa lại hàng loạt | `lib/csv.js` thêm `kiemTraBangMa()` phát hiện U+FFFD và byte 0 **trên chuỗi đã giải mã**, áp dụng ở **cả hai** đường xem trước và ghi thật. Giao diện chỉ từng bước cách lưu lại bằng "CSV UTF-8" trong Excel |

Kèm theo: `routes/schoolyear.js` kiểm tra định dạng `namMoi` ở đường xem trước
(trước đây nhận bất kỳ chuỗi nào từ query).

Hai việc còn lại của Đợt 2, đều ở màn hình cô dùng nhiều nhất mỗi sáng:

| Mã | Vấn đề | Cách sửa |
|---|---|---|
| B1 | Mỗi lần chạm một em, `App.route()` vẽ lại cả trang rồi **cuộn về đầu**. Lớp 30 em thì điểm danh xong em thứ 25 là bị ném về đầu danh sách, phải cuộn lại từ đầu cho từng em — 30 lần cuộn cho một buổi sáng | Chỉ vẽ lại đúng dòng vừa đổi (`veLaiDong`) và hai ô đếm (`veLaiSoDem`). Có bài kiểm thử trình duyệt đo `window.scrollY` trước và sau khi chạm, cộng một dấu mốc trên `#view` để chắc chắn trang không bị vẽ lại toàn bộ |
| B4 | "Cả lớp có mặt" ghi ngay không hỏi, và **ghi đè cả những em cô vừa đánh dấu nghỉ**. Nó còn bắn N yêu cầu HTTP tuần tự — lớp 30 em là 30 lượt chờ mạng | Hỏi lại trước khi ghi; **mặc định chỉ ghi cho em CHƯA điểm danh**, em cô đã đánh dấu được giữ nguyên; muốn ghi đè phải bấm một nút riêng có ghi rõ hậu quả. Máy chủ có đường `POST /api/attendance/mark-all` mới, ghi cả lớp trong một giao dịch |

Đường ghi từng em `POST /api/attendance/mark` **giữ nguyên không đụng tới**: bản
giao diện cũ còn trong bộ nhớ đệm của điện thoại đã cài app vẫn gọi đường đó, và
hai bộ kiểm thử cũ cũng gọi nó.

Bốn điều đáng ghi lại:

- **Bộ lọc bảng mã ở trình duyệt suýt chặn mọi tệp thật.** Bản đầu gõ thẳng hai
  ký tự vào lớp ký tự `/[…]/`. Byte 0 không tồn tại được trong tệp mã nguồn nên
  nó lặng lẽ thành **dấu cách** — và mọi tệp CSV có dấu cách, tức mọi tệp thật,
  đều bị chặn ngay tại máy người dùng mà máy chủ không hề biết vì tệp không bao
  giờ được gửi lên. Bộ kiểm thử API không bắt được vì nó gọi thẳng máy chủ. Chỉ
  bài kiểm thử **trình duyệt** tải tệp lên thật mới lộ ra. Nay viết bằng
  `[\\uFFFD\\u0000]` và có bài canh riêng cho đúng lỗi này.
- **Số dòng trùng để riêng khỏi số dòng lỗi.** Ba chỗ trong giao diện và hai bài
  kiểm thử đang tính "số dòng nhập được = tổng − lỗi". Gộp trùng vào lỗi là làm
  sai tất cả những chỗ đó cùng lúc.
- **Bỏ qua chứ không chặn cả tệp.** Điện thoại đã cài app có thể còn giữ bản
  `admin.js` cũ trong bộ nhớ đệm; nếu máy chủ chặn cả tệp thì bản cũ chỉ hiện một
  lỗi trống không giải thích được gì.
- **"Cả lớp có mặt" mặc định KHÔNG ghi đè.** Cô hay đánh dấu vài em nghỉ trước
  rồi mới bấm nút cho phần còn lại. Ghi đè hết là xóa đúng phần cô vừa nhập tay,
  mà app không có đường hoàn tác. Bài kiểm thử dựng đúng cảnh đó: đánh dấu hai em
  nghỉ, bấm cả lớp có mặt, rồi kiểm tra hai em vẫn là nghỉ.

Bộ `test:lo-hong` lên **122 bài** và bộ soạn nội dung trên trình duyệt lên
**73 bài**, canh từng lỗ ở trên không tái phát.

Đợt 2 đã xong. Đợt 3 ở mục B13, Đợt 4 ở mục B14 bên dưới.

---

## B13 — Đợt 3: những thứ chỉ bùng ra khi năm học chuyển hoặc dữ liệu dày lên

| Mã | Vấn đề | Cách sửa |
|---|---|---|
| B6 | Quyền xem album đi qua danh sách lớp **đang mở**, nên ngay khi bấm "Chuyển năm học" toàn bộ album năm cũ rơi khỏi tầm với của **mọi vai**, kể cả quản trị. Ảnh vẫn nằm nguyên trên ổ đĩa mà không ai xem được, cũng không ai xóa được | Quản trị và giáo viên **từng** chủ nhiệm lớp đó xem và xóa được album của lớp đã đóng. Danh sách mặc định không đổi — album lớp cũ chỉ hiện khi hỏi kèm `?keCaLopCu=1` |
| B5 | Cô duyệt đơn xin nghỉ xong mà sổ điểm danh không hay biết gì, vẫn cho chấm "Nghỉ không phép" đúng ngày đơn đã duyệt. Cùng một việc nhập hai lần, quên là phụ huynh thấy chữ đỏ cho con mình | `/api/attendance/class` trả kèm đơn nghỉ đã duyệt của từng em; màn hình hiện huy hiệu kèm ngày và lý do, viền sẵn ô "Nghỉ CP". Chấm "Nghỉ không phép" đúng ngày có đơn thì hỏi lại |
| B3 | Màn Nề nếp của **giáo viên** lấy toàn bộ ghi nhận từ trước tới nay, nặng thêm mỗi năm (đo: 2 năm ~1,9 giây, 5 năm ~4,7 giây trên điện thoại tầm trung qua 4G) | Trả 50 bản ghi gần nhất kèm tổng số, có nút "Xem thêm". Bảng xếp hạng giữ nguyên vì tổng điểm do `SUM` trên toàn bộ bảng |
| B7 | Bốn phân hệ ghi nội dung quan trọng nhất — Thông báo, Nề nếp, Y tế, Nhận xét — **chỉ có đường ghi thêm**. Ghi nhầm một "nhắc nhở" trừ điểm hay một ghi nhận y tế sang em khác là gắn vĩnh viễn vào hồ sơ đứa trẻ, hiệu trưởng cũng không gỡ được. Rủi ro NĐ 13/2023 | Mỗi phân hệ có đường **sửa** và đường **thu hồi** cho người đã tạo hoặc quản trị. Thu hồi là **đánh dấu ẩn, không xóa**. Y tế và Nề nếp nay nhận **ngày do người nhập chọn** |
| — | Cơ sở dữ liệu **không lưu lịch sử lớp**: học sinh chỉ có một `classId`, bị ghi đè ngay lúc chuyển năm. Mỗi lần chuyển năm trôi qua là mất thêm một năm thông tin không lấy lại được | **Bắt đầu ghi lại từ bây giờ** — bảng `student_class_history`, ghi ngay tại lúc chuyển năm trước khi `classId` bị đè, kèm đường đọc `/api/schoolyear/lich-su-lop`. Phần *dùng* nó vẫn để ngỏ, xem mục dưới |

Bốn điều đáng ghi lại:

- **Không được cắt danh sách mà quên các ô đếm.** Màn Nề nếp của **phụ huynh**
  cố ý KHÔNG giới hạn: hai ô "Tuyên dương" và "Nhắc nhở" đếm ngay trên mảng
  `records`, cắt bớt là hai con số đó sai mà không có lỗi nào báo. Cùng lý do,
  đơn xin nghỉ **chờ duyệt** và đơn dặn thuốc **chưa hoàn tất** lấy hết không
  bao giờ cắt — màn hình đếm "Chờ duyệt (N)" trên chính danh sách đó, và đó là
  việc cô phải làm hôm nay. Chỉ phần lịch sử đã xử lý mới giới hạn.
- **`ALTER TABLE` trong `lib/schema.sql` sẽ giết app, chậm.** Lược đồ được chạy
  lại ở mỗi lần khởi động và `lib/db.js` gọi `sqlite.exec` thẳng, không bọc bắt
  lỗi. `ALTER TABLE ADD COLUMN` chạy được lần đầu rồi báo lỗi trùng cột ở **mọi**
  lần khởi động sau — app chạy bình thường ngay sau khi triển khai rồi chết lặng
  lẽ vài ngày sau, sau khi mọi bài kiểm thử đã xanh. Trạng thái sửa/thu hồi vì
  thế nằm ở bảng phụ `record_edits` tạo bằng `CREATE TABLE IF NOT EXISTS`, và có
  bài kiểm thử đọc lại chính `lib/schema.sql` để chắc chắn không có câu `ALTER`.
- **Thu hồi phải kéo theo mọi con số nó ảnh hưởng.** Thông báo đã thu hồi phải bị
  loại khỏi bộ đếm "chưa đọc", nếu không phụ huynh thấy một con số không bao giờ
  về 0 (thông báo đã biến khỏi danh sách nên không còn cách nào bấm vào để đánh
  dấu đã đọc). Ghi nhận nề nếp đã thu hồi phải được **trả lại điểm thi đua**, nếu
  không việc thu hồi chẳng còn nghĩa gì với gia đình.
- **KHÔNG tự sinh bản ghi điểm danh khi duyệt đơn nghỉ.** Hệ thống không có khái
  niệm ngày học / ngày lễ / cuối tuần, nên một đơn từ thứ Sáu đến thứ Hai sẽ sinh
  bản ghi nghỉ cho cả thứ Bảy và Chủ nhật, thổi phồng số buổi nghỉ trong báo cáo
  học kỳ — đúng con số mà việc này định cứu. Chỉ thêm thông tin cho cô, không tự
  quyết thay cô.

### Phần còn để ngỏ ở đây ĐÃ LÀM XONG ở Đợt 4 (mục B14)

Ghi lại nguyên văn phần bàn bạc bên dưới vì nó là lý do của những quyết định
trong B14. Nhà trường đã chọn: làm cả ba việc, giữ hồ sơ con đã ra trường
**12 tháng**, và thêm ngay hai cột thời gian vào bảng lịch sử lớp.

#### (Nguyên văn lúc còn để ngỏ) — cần nhà trường quyết

**Cho phụ huynh xem lại nội dung của năm học cũ** (album, thông báo lớp, kế
hoạch, khảo sát của năm trước). Đây là việc lớn nhất trong báo cáo rà soát.

Phần **không hoàn tác được** đã làm xong: từ nay mỗi lần chuyển năm học, lớp của
từng em được ghi vào `student_class_history` trước khi bị ghi đè. Nếu không làm
bước này, mỗi năm trôi qua là mất vĩnh viễn thông tin "năm ngoái em này học lớp
nào" — mà đó chính là thứ cần để mở lại nội dung năm cũ.

Phần còn lại là quyết định của nhà trường, vì nó chạm tới dữ liệu nhạy cảm:

- Album chứa mặt **nhiều trẻ khác**. Nếu mở cho phụ huynh cũ xem lại thì phải
  giới hạn đúng khoảng thời gian con họ còn học lớp đó, chứ mở cả lớp cũ thì một
  em chuyển đi giữa năm vẫn xem được ảnh chụp sau khi đã rời lớp.
- Việc này chạm vào cách tính danh sách lớp — thứ mà **mọi** phân hệ khóa theo lớp
  đang dựa vào. Sửa không cẩn thận là phụ huynh năm nay thấy nhầm nội dung lớp
  khác.
- Album của **các năm đã chuyển trước khi có bản này** vẫn không có lịch sử lớp
  nên không cứu được bằng cách này. Với chúng, đường duy nhất là quản trị mở ra
  và tải về (đã làm ở B6).

Ước lượng nếu làm: 2–3 ngày, chạm vào `lib/db.js` (tệp dùng chung, phải tách
commit riêng theo quy định trong `CLAUDE.md`).

---

## B14 — Đợt 4: mở lại nội dung của năm học cũ cho phụ huynh

Đây là phần "còn để ngỏ" của Đợt 3, sau khi đo lại bằng mã thật thì phạm vi
khác hẳn mô tả ban đầu.

### Đo lại: chính xác thì chuyển năm học làm mất gì

Quyền của phụ huynh đi theo **hai** đường khác nhau, và chỉ một đường bị phá:

| Đường | Khóa theo | Sau khi chuyển năm |
|---|---|---|
| `db.canAccessStudent` — học bạ, sổ liên lạc, điểm danh, nề nếp, y tế, xin nghỉ, dặn thuốc | **con**, và **không** kiểm `active` | **Còn nguyên** |
| `db.classIdsOf` — album, thông báo gửi riêng lớp, khảo sát lớp, kế hoạch, thời khóa biểu | **lớp đang mở** | **Mất** |

Nên với con **lên lớp bình thường**, thứ thật sự mất chỉ là album lớp cũ, cộng
vài thứ giá trị thấp. Nhưng với con **đã ra trường** thì `db.studentsOf` lọc
`active = 1`, em biến khỏi ô chọn con trên màn hình, và phụ huynh mất luôn học
bạ và sổ liên lạc của 5 năm tiểu học — dù máy chủ vẫn sẵn sàng trả về. Đó mới là
mất mát lớn nhất, và trước nay không ai nhìn thấy vì nó im lặng.

### Bốn việc đã làm

| Việc | Vấn đề | Cách sửa |
|---|---|---|
| 0 | Bảng lịch sử lớp của Đợt 3 lưu **mỗi năm một dòng**, không đủ để giới hạn album theo thời gian, và không chịu được em chuyển lớp giữa năm | Đổi thành `student_class_periods` — mỗi dòng là một **khoảng** `(tu, den)`, `den = NULL` là đang học. Ghi vết ở **bốn** chỗ: chuyển năm, chuyển lớp giữa năm, cho nghỉ/nhận lại, nhập CSV |
| 1 | Con đã ra trường biến khỏi ô chọn con → mất học bạ và sổ liên lạc | Phân hệ **mới** `Hồ sơ con đã ra trường`: học bạ, sổ liên lạc, tổng kết chuyên cần. Giữ **12 tháng** kể từ ngày rời trường |
| 2 | Album lớp cũ chỉ quản trị lấy được (Đợt 3), phụ huynh vẫn không xem lại được ảnh của con | Phụ huynh xem được album lớp cũ, **chỉ phần chụp trong đúng khoảng con còn ở lớp đó** |
| 3 | Thông báo lớp, khảo sát, kế hoạch, TKB của năm cũ rơi khỏi tầm với | Phân hệ **mới** `Năm học trước`, chỉ đọc, cũng giới hạn theo khoảng |

### Bốn quyết định đáng ghi lại

- **Giữ 12 tháng, không giữ vĩnh viễn.** Đủ để gia đình tải học bạ về khi con
  chuyển cấp rồi tự đóng. Dữ liệu trẻ em thuộc nhóm nhạy cảm theo Nghị định
  13/2023 nên mở quyền truy cập vô thời hạn là không nên. Hết hạn thì **chỉ đóng
  đường xem**, tuyệt đối không xóa: nhà trường vẫn phải giữ hồ sơ theo quy định
  lưu trữ, và quản trị vẫn mở được. Có bài kiểm thử ghi thẳng ngày rời trường lùi
  hai năm vào cơ sở dữ liệu rồi đối chiếu đúng điều đó.

- **Giới hạn theo KHOẢNG là điều kiện bắt buộc, không phải chi tiết cho đẹp.**
  Album có mặt nhiều trẻ khác. Mở cả lớp cũ thì một em chuyển đi tháng 10 vẫn xem
  được ảnh các bạn chụp tháng 12. Bài kiểm thử dựng đúng cảnh đó: hai album cùng
  một lớp, một trong khoảng và một 30 ngày sau khi con rời lớp — phụ huynh thấy
  cái đầu, bị 403 với cái sau ở cả ba đường (danh sách, mở album, tải tệp ảnh).

- **CỐ Ý không nới `db.classIdsOf`.** Một dòng là xong, mọi thứ chạy ngay. Nhưng
  hàm đó đang được **8 chỗ** dùng — điểm danh, huy hiệu trang chủ, thông báo,
  khảo sát, kế hoạch, thời khóa biểu, album — nên nới ra là đổi hành vi cả 8 chỗ
  trong một lần đẩy. Huy hiệu "chưa đọc" sẽ đếm cả thông báo lớp cũ. Thay vào đó
  là một hàm mới bên cạnh, và từng phân hệ tự chọn dùng.

- **Việc 1 và Việc 3 làm thành PHÂN HỆ MỚI, không sửa vào phân hệ đang chạy.**
  Nhét con cũ vào ô chọn con thì phải sửa `App.state.students` và `UI.studentBar`
  — hai tệp dùng chung, mà quy định là chỉ được thêm chứ không đổi. Mở nội dung
  năm cũ trong năm phân hệ hiện có thì phải chạm năm tệp giáo viên và phụ huynh
  dùng hằng ngày, chỉ để phục vụ một việc tra cứu hiếm. Gói thành phân hệ mới
  thì: **không đụng tệp dùng chung nào**, cơ chế cô lập lỗi bao luôn, và nhà
  trường tắt được trong Quản trị → Tính năng nếu thấy không cần.

### Còn hạn chế

- **Các năm đã chuyển TRƯỚC bản này không có lịch sử lớp** nên không cứu được
  bằng cách này. Với chúng chỉ còn đường quản trị mở album ra và tải về (B6).
- **Thời khóa biểu chỉ lưu một bản cho mỗi lớp**, không lưu theo tuần, nên bản
  hiện ở "Năm học trước" là bản gần nhất của lớp đó — màn hình nói rõ điều này
  thay vì để gia đình hiểu nhầm.

---

## Tổng kết

Chín hạng mục B1–B9 đã hoàn thành. **1141 bài kiểm thử tự động đều đạt**, tất cả
đều nằm trong kho mã và chạy được bằng lệnh.

`npm test` — 932 bài, không cần trình duyệt, khoảng 3 phút:

| Bộ kiểm thử | Số bài | Nội dung |
|-------------|--------|----------|
| `test:du-lieu-kiemthu` | 40 | Dữ liệu thật không lọt lên kho mã |
| `test:khe-uoc` | 104 | Tệp dùng chung không bị bỏ hay đổi hình dạng |
| `test:commit-rieng-kiemthu` | 30 | Bộ canh commit riêng vẫn chặn đúng thứ cần chặn |
| `test:may-chu` | 34 | Bộ kiểm tra máy chủ thật bắt đúng lỗi cấu hình khi triển khai |
| `test:lo-hong` | 269 | Các lỗ hổng đã vá không tái phát |
| `test:api` | 68 | Toàn bộ nghiệp vụ và phân quyền hai vai trò |
| `test:bien-soan` | 80 | Giáo viên/quản trị soạn được nội dung, phụ huynh bị chặn đường ghi |
| `test:bao-mat` | 38 | Băm mật khẩu, cookie, header, chống dò, phiên bền vững |
| `test:mat-khau` | 25 | Mật khẩu tạm, buộc đổi, phân quyền |
| `test:quan-tri` | 43 | Nhập CSV, bắt lỗi, sinh tài khoản, nhật ký |
| `test:nam-hoc` | 31 | Lên lớp, ra trường, giữ dữ liệu năm cũ |
| `test:tinh-nang` | 52 | Chặn API khi tắt, giữ dữ liệu, cắm thêm phân hệ mới |
| `test:co-lap-loi` | 101 | Cố tình phá từng tính năng, kiểm tra phần còn lại vẫn chạy |
| `test:luoi-an-toan` | 17 | Lỗi bất đồng bộ: promise bỏ quên thì sống, nổ đồng bộ thì dừng sạch |

`npm run test:giao-dien` — 209 bài chạy trên trình duyệt thật, cần Playwright:

| Bộ kiểm thử | Số bài | Nội dung |
|-------------|--------|----------|
| `test:album` | 43 | Tải ảnh, phân quyền xem, chặn tệp giả danh ảnh |
| `test:pwa` | 43 | Cài đặt như app, chạy offline, khổ iPhone và Android |
| bật/tắt tính năng | 20 | Thao tác thật trên màn hình quản trị và màn hình chính |
| soạn nội dung | 103 | GV sửa TKB, soạn kế hoạch và báo cáo, quản trị soạn thực đơn — thao tác thật trên màn hình; phụ huynh không thấy nút soạn nào |

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
