# Việc đang dở — đọc trước khi làm tiếp

**Ghi ngày 17/10/2026, cuối phiên làm Đ238.** Chủ dự án mở phiên mới để làm tiếp,
nên tệp này gom MỌI việc còn treo vào một chỗ. Phiên mới đọc tệp này sau `CLAUDE.md`,
rồi mới đọc `docs/TIEN-DO.md`.

Xong việc nào thì gạch ngang việc đó tại chỗ (không xoá), ghi số Đ… đã làm, rồi cập
nhật `docs/TIEN-DO.md` như thường lệ.

> **18/10/2026 — Đ239:** phiên sau làm đợt góp ý của trường ngày 16/10 (11 mục) trên nhánh
> `claude/nice-keller-ab1mso`, xem `docs/PHAN-HOI-TRUONG-1610.md`. PR #7 (Đ238) đã gộp vào
> `main` trước đó. Các việc 1, 2, 4 và mục 2–4 dưới đây CHƯA đụng tới trong Đ239.

---

## 0. Tình trạng lúc giao lại

| | |
|---|---|
| Nhánh `main` | `acec801` — gộp tới Đ237 (PR #6) |
| PR đang mở | **#7 — "Đ238 — Bộ kiểm thử chạy được trên Windows"**, dạng nháp, **CHƯA gộp** |
| Nhánh của PR #7 | `claude/code-review-optimization-at4jzk`, đầu nhánh `19fbda1` (Đ238a → Đ238i + ghi TIEN-DO) |
| CI trên Linux của PR #7 | 4 lượt canh xanh: không có dữ liệu trường, commit riêng, VERSION của sw, `npm test` (128 bộ, FAIL 0) |
| `test:giao-dien` | **đỏ 5 phép ở `diem-danh-tra-be`** — chỉ đỏ thứ Bảy/Chủ nhật, có từ trước, xem việc 3 |
| Lượt Windows (`kiem-tra-windows.yml`) | **đỏ 3/128** — ba lỗi thật của app trên Windows, xem việc 1 |

Chi tiết từng commit Đ238 và bằng chứng: dòng Đ238 cuối `docs/TIEN-DO.md`, mô tả PR #7
và hai bình luận trên PR #7.

Máy Windows của chủ dự án (`C:\casa-mamnon`, Node 22 qua nvm-windows) đã đặt
`git config core.autocrlf false` riêng cho kho này và làm mới về LF từ 16/10. Sau khi
PR #7 gộp thì chỉ cần `git pull`.

---

## 1. Bốn việc CHỜ CHỦ DỰ ÁN QUYẾT (đã hỏi 17/10, chưa trả lời)

Chủ dự án hỏi lại "4 việc cụ thể là gì" và được giải thích; **chưa có câu trả lời
duyệt**. Phiên mới hỏi lại đúng bốn câu dưới, kèm đề xuất. Thứ tự đề xuất: 3 → 4 → 1 →
mục 2 (vá lỗ cũ).

### Việc 1 — Ba lỗi thật của app khi chạy trên Windows (mã nền, chưa vá)

Lượt Windows trên GitHub lộ ra. Máy chủ thật đang chạy Linux nên **hiện chưa bị gì**,
nhưng `docs/CAP-NHAT-MAY-CHU.md` có hướng dẫn chạy máy chủ trên Windows (NSSM).

1. **Khác ổ đĩa → máy chủ không khởi động.** `server.js:230`,
   `scripts/kiem-tra-may-chu.js:97` (và `scripts/ban-thu.js:61`, chỗ này đúng phần lớn)
   xét "dữ liệu nằm trong kho mã" bằng `!path.relative(goc, dich).startsWith('..')`.
   Mã ở `D:`, dữ liệu ở `C:` thì `path.win32.relative` trả nguyên đường tuyệt đối →
   bị coi là TRONG kho mã → `NODE_ENV=production` thì `process.exit(1)`. Đây đúng là
   cách bố trí `kiem-tra-may-chu.js:107` khuyên (`C:\CasaMamNonData`).
   Bài đỏ: `lo-hong-da-va` [8] (3 phép), `kiem-tra-may-chu` [2] (2 phép).
2. **`scripts/restore.js` không đóng kết nối CSDL trước khi xoá / đổi tên tệp.**
   - Dòng ~135–165: `db` khai trong `try`, `catch` không đóng được, `donTam(tmp)` nuốt
     lỗi xoá → sót `.khoi-phuc-<ms>.db`. Bài đỏ: `sao-luu` [5].
   - Dòng ~304–316: `school.db` đang dùng bị hỏng (đúng lúc cần khôi phục nhất) →
     `cu.pragma(wal_checkpoint)` ném lỗi, `cu` không đóng, `renameSync` ném lỗi không
     ai bắt → **không khôi phục được**. Chưa có bài nào thử ca này.

**Đề xuất:** làm, ở **một PR riêng**. Cách làm:
- Khác ổ: đi đủ **ba bước, ba commit** (CLAUDE.md, tệp nền): thêm một hàm thuần
  `namTrong(goc, dich, p = path)` — `const r = p.relative(goc, dich); return r === '' ||
  (!p.isAbsolute(r) && r !== '..' && !r.startsWith('..' + p.sep));` — ở tệp MỚI (không
  sửa tệp dùng chung); chuyển ba chỗ gọi sang hàm đó; thêm bài kiểm đơn vị dùng
  `path.win32` (khác ổ → ngoài; `C:\kho\data` → trong; `c:\KHO\data` → trong; chính
  `C:\kho` → trong; `..\x` → ngoài; thư mục con tên `..abc` → trong). Kiểm được ngay
  trên CI Linux nhờ truyền `path.win32`.
- `restore.js`: khai `let db = null` / `let cu = null` NGOÀI `try`, đóng trong
  `finally` (`try { db?.close(); } catch {}`) TRƯỚC `donTam` / `renameSync`. Giữ nguyên
  `sao-luu` [5]; THÊM ca: ghi rác vào `school.db` đang dùng, chạy `restore.js`, đòi mã
  thoát 0, có `.truoc-khi-khoi-phuc-*`, số bé quay về đúng (trên Linux ca này xanh cả khi
  chưa sửa — chỉ lượt Windows canh được).
- **Phải vá cả app 1** theo `docs/LOI-NEN-CHUNG.md`. Phiên 17/10 chỉ được cấp quyền kho
  `casa-mamnon`: muốn vá luôn app 1 thì xin chủ dự án tên kho app 1; không thì ghi vào
  Sổ nợ của `docs/LOI-NEN-CHUNG.md` (nhớ bài `nen-chung` đếm "Còn nợ N món").

### Việc 2 — Giữ hay bỏ các chỗ "siết thêm" trong Đ238

Chủ dự án duyệt Đ238 với điều kiện "chỉ đổi cách so đường dẫn / xuống dòng, không nới".
Ngoài phạm vi đó, Đ238 còn **siết** (không chỗ nào nới — đã thử ngược):
- `album-che-do`: phép "kiểm album đứng TRƯỚC câu UPDATE công bố" đòi cả hai mốc tìm
  thấy (bài cũ XANH khi gỡ hẳn chốt quyền vì `indexOf` = −1).
- `nen-chung`: không còn dòng trống nào sau bảng thì đỏ; phần bảng không được lấn tới
  "## Sổ nợ".
- `kiem-tra-may-chu`: đòi thêm chữ `sudo`; thêm hai lượt giả `os.platform()` canh cả
  nhánh Linux lẫn Windows.
- `thu-hoi-khong-song-lai`: thêm phép "tệp gốc còn trên đĩa của mọi bảng có trong vùng
  quét".

**Đề xuất:** giữ. Nếu chủ dự án bảo bỏ thì bỏ đúng các dòng trên, giữ phần đổi cách so.

### ~~Việc 3 — Bài giao diện `diem-danh-tra-be` đỏ mỗi thứ Bảy, Chủ nhật~~ — ĐÃ LÀM ở Đ239h (18/10)

> Khối cuối tuần đã thêm vào đầu bài đúng như đề xuất dưới đây; chạy Chủ nhật 18/10 các phép
> cuối tuần xanh. CÒN một phép phụ thuộc GIỜ: mục [8] "bảng cần gọi xác nhận có nút Gọi" đỏ khi
> chạy 00:00–06:00 giờ Việt Nam (mốc rà soát 06:00) — xem `docs/PHAN-HOI-TRUONG-1610.md`, mục cuối.

`data/seed.js` dùng `recentWeekdays(20)` (bỏ T7/CN) → cuối tuần "hôm nay" không bé nào
có mặt → nút "Ghi con đã về" (`public/js/views/attendance.js` ~1121, chỉ hiện khi bé có
mặt) không có → đỏ 5 phép ở [1], [4], [5], [8]. Đã tái hiện trên `main` chưa sửa.

**Đề xuất:** sửa ngay trong PR #7 (chỉ đụng bài kiểm thử, không đổi `public/` nên không
tăng VERSION). Ngay sau khi dựng máy chủ trong `test/diem-danh-tra-be.test.mjs`:

```js
// Dữ liệu mẫu chỉ điểm danh NGÀY HỌC, nên chạy vào cuối tuần thì "hôm nay"
// chưa bé nào vào lớp và mọi nút "Ghi con đã về" biến mất.
const homNay = HOM_NAY();
if ([0, 6].includes(new Date(`${homNay}T00:00:00Z`).getUTCDay())) {
  const ckCo = await dnApi('giaovien', '123456');
  await goiApi('/api/attendance/mark-all', { date: homNay, status: 'present', classId: 'c1' }, ckCo);
}
```

**Đoạn trên là đề xuất, CHƯA chạy thử.** Nhớ thêm `HOM_NAY` vào dòng `import` từ
`./_chung.mjs`; kiểm `mark-all` tạo dòng "có mặt" mà chưa có giờ về (phép [8] cần đúng
thế). KHÔNG đổi dữ liệu mẫu (nhiều bộ khác dựa vào việc nó bỏ cuối tuần). Ngày thường
khối `if` không chạy nên bài phải y như cũ — chạy lại cả bài vào một ngày thường để
chắc.

### Việc 4 — Gộp PR #7 vào main

**Đề xuất:** gộp ngay sau việc 3, khi mọi lượt Linux xanh. Lượt Windows còn đỏ 3 bộ tới
khi xong việc 1 — job đó không bắt buộc, lý do đã ghi trên PR. **Chỉ gộp khi chủ dự án
đồng ý** (không tự gộp). Sau khi gộp: ghi lần gộp vào khối lịch sử của
`docs/TINH-TRANG.md` (như #2 → #6), rồi bắt đầu lại nhánh làm việc từ `main` mới.

---

## 2. Lỗ có từ trước trong bài canh được bảo vệ (thử ngược 17/10 tìm ra, chưa vá)

Bài được bảo vệ → **phải có chủ dự án duyệt**. Đề xuất: vá chung một PR riêng. Hiện chưa
có đường nào đang lọt dữ liệu.

| Bài | Lỗ | Cách vá đề xuất |
|---|---|---|
| `quyen-du-lieu-be` | Dò tên hàm kiểm quyền cả trong CHÚ THÍCH: gỡ chốt `canAccessStudent` thật ở `GET /api/hocphi` (`modules/hocphi/routes.js` ~189) mà để dòng chú thích nhắc tên hàm thì vẫn xanh | Bỏ chú thích khỏi thân đường dẫn trước khi dò (như các bài canh khác) |
| `thu-hoi-khong-song-lai` | `boChuThich` bỏ mọi dòng bắt đầu bằng `*` → câu `SELECT\n    * FROM remarks WHERE …` không lọc lọt qua | Chỉ coi `*` là chú thích khi nằm trong khối `/* … */` |
| `nen-chung` | Xoá đúng dòng trống sau bảng phân loại thì khối trích dẫn sau đó bị tính là bảng → gỡ `server.js` khỏi bảng mà vẫn xanh | Cắt bảng theo các dòng liên tiếp bắt đầu bằng `\|` (~3 dòng mã) |
| `album-che-do` | Dòng ~254–256: phép thứ tự ở đường trả byte vẫn xanh khi gỡ luật đồng ý ảnh nhóm (`indexOf` = −1). `anh-nhom` [5] vẫn bắt được (đã thử) | Đòi cả 3 mốc ≥ 0 rồi mới so |
| `kiem-tra-may-chu` | Chưa thử UTC+8: nới điều kiện thành `Math.abs(lech - 420) <= 60` thì bài vẫn xanh, máy UTC+8 bị báo "UTC+7 ĐẠT" | Thêm một lượt `TZ=Asia/Singapore` đòi CẦN SỬA |

---

## 3. Rủi ro dài hạn đã nêu, chờ quyết

- **`lib/csv.js` chứa 3 byte rỗng thật** (dòng 124, 134, 138, trong regex) → git và
  GitHub coi là nhị phân, mọi sửa đổi hiện "Binary files differ", người duyệt không đọc
  được (đã thấy ở Đ120b). Vá: viết lại thành `\u0000`, hành vi y hệt. Tệp nền → commit
  riêng, vá cả app 1.
- **Lệnh `npm test` dài 4 578 ký tự**; cmd.exe trên Windows tối đa 8 191. Thêm ~100 bộ
  nữa là `npm test` chết trên Windows trong khi CI Linux vẫn xanh. Lượt Windows trên
  GitHub chạy từng bộ riêng nên KHÔNG bắt được chuyện này. Vá: một tệp chạy danh sách bộ
  (`scripts/…`), `npm test` gọi tệp đó.
- **Trên Windows, `proc.kill('SIGTERM')` là giết cứng** → bài "tắt êm bằng SIGTERM"
  (`bao-mat` ~160) xanh rỗng trên Windows; móc dọn dẹp SIGTERM ở `luoi-an-toan`,
  `co-lap-loi` không có tác dụng khi bấm Stop. Không đỏ. Muốn canh thật cần đường tắt có
  kiểm soát trong `server.js` → hỏi trước.
- **`dungMayChu` (`test/_chung.mjs`) gọi `http://localhost`** trong khi máy chủ thử nghe
  IPv4; Windows phân giải `localhost` ra `::1` trước → chậm, và vòng chờ không có hạn.
  Lượt Windows hiện vẫn xanh các bộ này; chỉ cân nhắc nếu thấy chậm / treo.
- **Câu hướng dẫn in ra màn hình dạy lệnh Linux** (`DATA_DIR=… npm start`, `mkdir -p`,
  `mv`, `sudo systemctl`, `rm -rf`) ở `server.js` ~243–262, `scripts/restore.js`
  ~280–287, `scripts/ban-thu.js` ~320, `scripts/backup.js` ~359, `scripts/kiem-tra-may-chu.js`
  nhiều chỗ. PowerShell không chạy được. Vá: THÊM dòng PowerShell khi `win32` (như
  `scripts/canh-thu-muc-du-lieu.js` đã làm), GIỮ dòng Linux. Mã nền → vá cả app 1.

---

## 4. Việc tồn từ trước Đ238 (vẫn chờ)

- **Đ237 — các phát hiện L1–L33** khi viết hướng dẫn kiểm thử: bảng đầy đủ ở mục 1 của
  `docs/HUONG-DAN-KIEM-THU.md`. Đáng làm trước:
  - **L26 (lỗi):** tài khoản một cơ sở (vanphong1, quanly1) không thêm được đợt nghỉ nào —
    ô "Áp cho cơ sở" bị khoá nên `public/js/views/leave.js` (`luuDot`) không gửi
    `campusId`, còn `routes/leave.js` (`coSoDatDuoc`) từ chối khi thiếu.
    `test/lich-nghi-truong.test.mjs` luôn gửi `campusId` nên không bắt được.
  - **L27, L28, L31 (cần nhà trường xác nhận):** quản lý một cơ sở gỡ được máy nhận
    thông báo / đổi khoá cho cả trường (`routes/push.js` `chiNguoiGiuKhoa`); thu hồi
    được bài Cambridge "Cả trường"; xoá được Ghi nhanh và bấm "Kể cho gia đình" thay cô.
  - **L17 (chữ sai):** `scripts/ban-thu.js` ~285 và `docs/MAY-CHU-THU-ORACLE-APP2.md`
    ~270, ~564 ghi phuhuynh là mẹ "bé Ngọc (Lá 1)" — đúng là bé Nguyễn Bảo Nam.
- **Rủi ro đã nêu ở Đ237, chờ quyết:** "buộc đổi mật khẩu lần đầu" chỉ chặn ở màn hình,
  API vẫn mở; tài khoản Cấp 3 quên gắn cơ sở làm được việc Cấp 1; `ban-thu` chỉ chặn
  `NODE_ENV=production` mà tài liệu máy thử chạy nó trên đúng `/var/lib/casa-mamnon`;
  `docs/MAY-CHU-THU-ORACLE-APP2.md` lặp nguyên đoạn Phần 0 → Bước 8 trong mục "Cập nhật
  nhanh".
- **Node 24:** chủ dự án hỏi có nên nâng app lên Node 24 không (máy có app khác dùng
  Node 24). Hiện dùng nvm-windows để giữ cả hai. Đề xuất đã nêu: bước 1 cho phép `22.x`
  hoặc `24.x` (`package.json` `engines`, `.nvmrc`, `.npmrc engine-strict`) và chạy CI cả
  hai bản; Dockerfile và tài liệu đổi sau. **Chưa quyết, không gấp.**
- **Việc phía nhà trường / chủ dự án:** tạo tài khoản `quanly1` trên máy thử theo
  `docs/HUONG-DAN-KIEM-THU.md`; cập nhật máy thử lên bản có Đ235/Đ236 nếu chưa làm.

---

## 5. Ghi chú kỹ thuật cho phiên mới

- **Hướng dẫn kiểm thử: bản chính nằm trên claude.ai** (chủ dự án chốt 19/10/2026), cả bản
  đầy đủ lẫn bản ngắn. `docs/HUONG-DAN-KIEM-THU.md` và `docs/HUONG-DAN-THU-NHANH.md` chỉ
  là bản chép. Việc nào làm đổi một dòng thử thì sửa bản chính trước (đổi cả ô ngày dưới
  tiêu đề: đó là ngày của bản, chủ dự án chốt 19/10), rồi xuất ra markdown và thay phần **từ
  dòng tiêu đề trở xuống** bằng bản xuất, nguyên văn. **Giữ nguyên khung ghi chú trên cùng**
  của tệp. Hai chỗ phải sửa khi chép: bỏ “ · @tên người viết” ở dòng ngày, và xoá sạch bảng
  Mật khẩu (bản chính có thể đã được điền). Móc commit (tự bật sau `npm install`) chặn cả hai
  mỗi lần `git commit`, kể cả commit tay, trừ khi dùng `--no-verify`; nó soát cả bản chép
  mang tên khác và mọi tệp .md trong commit; `npm run test:huong-dan-thu` (trong bộ kiểm nhanh) soát thêm phụ đề và ngày. Đường dẫn bản chính và cách chép ghi ở đầu mỗi tệp. Dựng lại file
  Word gửi trường: `npm run tai-lieu:huong-dan-thu` (ra thư mục `ban-word/`, git bỏ qua).

- `npm test` hiện chạy khoảng 5 phút. Số phép kiểm **đổi theo ngày và giờ chạy**
  (lich-nghi-truong, diem-danh-theo-anh có nhánh trước/sau 9h; moc-ra-soat-tru-hoan theo
  ngày; thu-muc-du-lieu có khối 4 phép chỉ chạy khi hạ được quyền xuống `nobody`). So số
  thì chạy hai bản cùng lúc.
- Lượt Windows chạy khi mở PR vào `main` và mỗi lần đẩy lên PR đó; lượt cũ bị huỷ khi có
  commit mới. Nút "Run workflow" chỉ có sau khi `kiem-tra-windows.yml` đã vào `main`.
- Đọc nhật ký CI: công cụ GitHub MCP chỉ trả **5 000 dòng cuối**; tải thẳng nhật ký
  (`gh api …/logs`) bị proxy chặn. Vì thế lượt Windows in lại phần "LỖI:" của từng bộ
  đỏ ở cuối nhật ký — đọc phần cuối là đủ.
- Phiên mới muốn theo dõi PR #7 thì tự đăng ký nhận sự kiện của PR. Phiên cũ đã huỷ đăng
  ký và huỷ lịch tự kiểm tra lại để không giành sự kiện.
