# Tình trạng hiện tại — chốt ngày 30/09/2026

**Tệp này trả lời đúng một câu: *đang đứng ở đâu, và việc gì đang chờ ai.***

Khác với `docs/TIEN-DO.md` — sổ nhật ký chỉ ghi thêm, không bao giờ sửa dòng cũ —
tệp này là **ảnh chụp một thời điểm** và **được phép ghi đè**. Đọc nó trước khi
làm gì tiếp; đọc `TIEN-DO.md` khi cần biết *vì sao* một thứ lại như bây giờ.

> **Mốc chốt sổ: 30/09/2026.** Mọi câu ở dưới đúng tại ngày đó. Phần nói về máy
> chủ thật thì **đo lần cuối ngày 16/09** — xem mục "Những điều chưa ai kiểm lại"
> ở cuối, đừng tin chúng như chuyện của hôm nay.

---

## 1. Mã nguồn

| | |
|---|---|
| Nhánh đang làm | `claude/code-review-optimization-at4jzk` |
| Commit mới nhất | `697174f` — Đ219 |
| Đã đẩy lên GitHub | **rồi**, `HEAD` trùng `origin` |
| Cây làm việc | sạch, không còn gì chưa commit |
| `npm test` | **118 bộ, 6504 phép kiểm, 0 đỏ** |
| `npm run test:giao-dien` | **14 bộ, 787 phép kiểm, 0 đỏ** |

### `main` KHÔNG phải bản đầy đủ

Đây là điều dễ vấp nhất khi có người mới vào việc:

```
origin/main   = a91cee8, ngày 31/08/2026, đợt Đ116
nhánh làm việc đi trước 168 commit
```

`main` **thiếu** ô Lưu ý nội bộ (Đ207), số tài khoản + QR học phí (Đ208), một
dòng Vào/Ra (Đ210), mật khẩu sinh bằng nguồn ngẫu nhiên thật (Đ212), ảnh QR
trường tự tải (Đ214) — và `lib/vietqr.js` thì **chưa tồn tại** trên đó.

**Đừng clone `main`.** Cách tự kiểm ghi ở bước 4 của `docs/CAI-DAT-VPS.docx`.

> Con số 168 đúng ngày 16/09. Đo lại bằng:
> `git rev-list --count origin/main..origin/<nhánh>`

---

## 2. Việc đã xong trong đợt này

Mười một việc chủ dự án giao đều xong (việc 49 là của app 1, đã gác lại):

| Việc | Xong ở |
|---|---|
| 1, 2, 3 — một dòng Vào/Ra, ảnh trả bé vào lõi, bỏ sổ trả bé riêng | Đ210 + Đ210b |
| 4 — ô Lưu ý chỉ nội bộ cơ sở | Đ207 |
| 10, 11 — sức khoẻ: siết quyền sửa theo ngày, tệp cân đo | Đ205 |
| 13 — Cambridge kiểm kê theo lứa | Đ206 |
| 23 — cô đánh giá từng bài | **đã có sẵn**; tôi dựng nhầm rồi hoàn tác (Đ211) |
| 36 — số tài khoản, QR, cú pháp chuyển khoản | Đ208 |
| 43 — sao chép lịch từ lớp khác | **đã có sẵn**, chỉ xác nhận (Đ209) |

Cộng thêm năm đợt không nằm trong danh sách giao, sinh ra từ chính việc làm:

- **Đ212** — mọi mật khẩu sinh bằng `crypto.randomInt`, và bản vá Đ117 nay mới có người canh
- **Đ213** — sổ nợ nền chung ghi bốn lỗ bảo mật là "đã trả xong" trong khi chúng vẫn mở
- **Đ214** — nhà trường tự tải ảnh mã QR lên
- **Đ215** — tài liệu cài VPS từ A đến Z, bản Word sinh từ kho mã
- **Đ216–Đ219** — bốn lượt vá chính tài liệu ấy, mỗi lượt do chủ dự án vấp phải trên máy thật

---

## 3. Máy chủ thật — đo ngày 16/09/2026

Máy thử Oracle Cloud, tên miền `casa-school.duckdns.org`, đứng trước là Caddy.

| Mục | Tình trạng lúc đo |
|---|---|
| Dịch vụ `casa-mamnon` | `active`, khởi động lại hai lần đều lên |
| Cấu hình đang có hiệu lực | `User=ubuntu`, `DATA_DIR=/var/lib/casa-mamnon`, `NODE_ENV=production`, `PORT=3000`, `FORCE_HTTPS=1` |
| HTTPS | `HTTP/2 200` qua Caddy, có HSTS và CSP |
| `/healthz` | `content-length: 11` — đúng `{"ok":true}`, **không rò** thời gian chạy và số phiên cho người chưa đăng nhập (bản vá Đ117 đang sống trên máy thật) |
| Múi giờ máy | đã là giờ Việt Nam |
| Mã trên máy | đợt Đ217 (lúc đó tôi đã đẩy tới Đ219 — lệch hai đợt tài liệu, không đổi mã chạy) |

### Lịch sao lưu — đã sửa, nhưng chưa ai xác nhận nó tự chạy

Phát hiện ngày 16/09: lịch cron **chạy rất đều mỗi đêm, và sao lưu nhầm app**.

Dòng cron cũ chạy `npm run backup` trong thư mục `/opt/schoolconnect`, và đặt
`DATA_DIR` trỏ sang thư mục dữ liệu của app 1 — cả hai đều là đường dẫn của app
cũ. Dòng ấy đặt từ hồi máy chạy app 1; chuyển sang app 2 thì không ai sửa.

> **Cố ý không chép nguyên dòng lệnh sai vào đây.** `npm run test:kiem-tra-may-chu`
> chặn mọi tài liệu chứa một dòng `DATA_DIR=` trỏ đi chỗ khác, và luật ấy đúng:
> một dòng sai mà chép thẳng từ tài liệu ra terminal được thì đúng là thứ nó sinh
> ra để chặn. Muốn xem nguyên văn thì đọc lời commit của đợt Đ219. Suốt 12
ngày, `backup.log` cho thấy nó chạy trơn tru 02:00 mỗi đêm và giữ 11 bản — **bản
của app không còn chạy**, trong khi app đang phục vụ thì không có bản nào.

**Kiểu hỏng đáng nhớ: nhìn từ ngoài mọi dấu hiệu đều lành.** Cron có, log có,
bản sao có, app chạy tốt. Sai duy nhất nằm ở một đường dẫn, và không màn hình
nào nói ra.

Đã thay bằng hai dòng đúng, và đã chạy thử tay thành công:

```
0 2 * * * cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js >> /var/lib/casa-mamnon/backup.log 2>&1
0 7 * * 1 cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/kiem-tra-may-chu.js >> /var/lib/casa-mamnon/soat-may-chu.log 2>&1
```

Lần chạy tay 16/09 lúc 16:31 ra: `school-20260916-1631.db.gz 0.1 MB (gốc 1.5 MB)`,
ảnh album 34 tệp đã có trong kho, giữ lại 3 bản.

---

## 4. Những điều CHƯA AI KIỂM LẠI

**Bốn mục dưới đây đo lần cuối ngày 16/09. Đã qua hai tuần. Đừng tin chúng như
chuyện của hôm nay — kiểm lại trước khi kết luận bất cứ điều gì.**

### 4.1 Lịch sao lưu có thật sự tự chạy không

```bash
DATA_DIR=/var/lib/casa-mamnon npm run backup:list
```

Phải thấy các bản mang mốc **02:0x** của những ngày gần đây. **Đặt lịch xong
không phải là lịch đã chạy** — đó đúng là bài học của 12 ngày vừa rồi.

Không có bản nào sau 16/09 thì lịch lại hỏng theo một kiểu khác, và phải xem
`tail -30 /var/lib/casa-mamnon/backup.log`.

### 4.2 Bản mới đã vào màn hình chưa

`git pull` xong không có nghĩa màn hình đã đổi. Mở app bằng **điện thoại**,
soi ba chỗ của đợt này:

- **Điểm danh** — mỗi bé một dòng có cả **Vào** và **Ra**, không còn mục sổ trả bé riêng *(Đ210)*
- **Điểm danh** — ô **Lưu ý**, và đăng nhập bằng tài khoản phụ huynh thì **không thấy** *(Đ207)*
- **Học phí → Tài khoản nhận tiền** — cuối màn có ô **tải ảnh mã QR** *(Đ214)*

Còn hiện bản cũ thì kéo xuống làm mới trang — app là PWA, bản cũ nằm trong bộ
nhớ đệm máy. `VERSION` trong `public/sw.js` đã lên `v125`.

### 4.3 Máy chủ còn lành không

```bash
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu
```

Mục tiêu là **0 mục cần sửa**. Bộ này bắt được những thứ hỏng dần trong im lặng
nhiều tuần sau ngày cài — lịch sao lưu ngừng chạy, bản sao mới nhất đã mấy ngày
tuổi, ổ đĩa sắp đầy, chứng chỉ HTTPS sắp hết hạn.

### 4.4 Mã trên máy đã cập nhật tới đâu

```bash
cd /opt/casa-mamnon && tail -1 docs/TIEN-DO.md | cut -c1-60
```

Lần cuối đo là **Đ217**. Kho nay ở **Đ219** (hai đợt chỉ sửa tài liệu, không đổi
một dòng mã chạy nào — không gấp, cuốn theo lần cập nhật tới là được).

---

## 5. Việc đang CHỜ CHỦ DỰ ÁN QUYẾT

Bốn việc, không việc nào tôi tự làm được.

### 5.1 Bản sao lưu nằm cùng ổ đĩa với dữ liệu gốc — **việc lớn nhất**

Chính `scripts/backup.js` in cảnh báo này mỗi lần chạy. Hiện nếu ổ đĩa VPS hỏng,
mất **cả cơ sở dữ liệu lẫn ảnh lẫn toàn bộ bản sao** cùng một lúc. Sao lưu chỉ
cứu được chuyện *xoá nhầm*, không cứu được chuyện *mất máy*.

Lúc này chưa gấp vì dữ liệu trên đó là dữ liệu chạy thử. Nhưng đây là **việc
phải xong trước ngày trường nhập danh sách bé thật** — ảnh khuôn mặt trẻ là thứ
duy nhất không dựng lại được từ đâu khác.

Cách đơn giản nhất, chạy từ máy của chủ dự án (không phải trên VPS):

```powershell
scp -r ubuntu@<địa-chỉ-IP>:/var/lib/casa-mamnon/backups D:\casa-sao-luu\
```

Làm tay mỗi tuần một lần đã hơn hẳn hiện tại. Khi trường dùng thật thì cần một
chỗ tự động — **đó là một khoản chi phải hỏi nhà trường.**

### 5.2 App 1 còn nằm trên cùng máy

`/opt/schoolconnect` và `/var/lib/schoolconnect` vẫn còn. Bản sao app 1 mới nhất
là 02:00 ngày 16/09 nên không mất gì nếu dừng sao lưu nó.

- **Giữ** — tốn ổ đĩa, và hai bộ dữ liệu trên cùng một máy thì dễ trỏ nhầm
  `DATA_DIR` (đúng thứ vừa xảy ra với cron).
- **Gỡ** — tải bản sao app 1 về máy trước, rồi mới xoá trên VPS.

**Không tự xoá.** `CLAUDE.md` cấm tự ý xoá dữ liệu.

### 5.3 Nợ nền chung với app 1 — 22 món, trong đó 5 món là lỗ bảo mật đang mở

Xem `docs/LOI-NEN-CHUNG.md`. Tóm tắt phần gấp:

Bốn (thật ra năm, kể cả Đ44) lỗ bảo mật bắt buộc **được ghi là "đã trả xong" từ
30/08 trong khi chúng vẫn đang mở** ở app 1. Đ213 sửa sổ sau khi đọc thẳng nội
dung sáu tệp ở `origin/HEAD` của kho app 1.

Nghĩa là — tính tới lần đo 16/09 — ở app 1 vẫn còn: **album ảnh khuôn mặt cả lớp
tải được bởi gia đình đã rời trường nhiều năm**, và `/modules/hocphi/routes.js`
trả mã máy chủ cho người chưa đăng nhập.

**Cái bẫy đã làm sổ ghi sai:** mã commit vẫn `git show` ra được kể cả khi nhánh
chứa nó đã biến mất khỏi mọi kho. Kiểm bằng **nội dung tệp**, không bằng mã commit.

Và việc này **đang lặp lại**: nhánh `claude/go-no-nen-chung` ở app 1 mang 16 bản
vá nền khác, `npm test` xanh, **cũng chưa được đẩy lên**. Nó nằm trong một máy ảo
tạm; máy bị thu hồi là mất y như lần trước.

> Chủ dự án đã nói **"tạm thời quên app 1 đi, chỉ tập trung vào app 2"** — nên
> mục này ghi lại để không mất, không phải để làm ngay.

### 5.4 Gói `qrcode` — **đã chốt, ghi lại cho khỏi hỏi lần nữa**

Giữ cả hai đường. Xem `docs/QUYET-DINH-TU-CHOT.md` mục 21.

---

## 6. Bốn tệp nên đọc khi quay lại

| Tệp | Dùng khi |
|---|---|
| `docs/CAI-DAT-VPS.docx` | Cài lên máy chủ — 10 bước, mỗi bước một bảng kiểm. Sinh lại bằng `npm run tai-lieu:cai-dat-vps` |
| `docs/TRIEN-KHAI.md` | Bản Markdown của cùng nội dung, có thêm kịch bản Render |
| `docs/TIEN-DO.md` | Vì sao một thứ lại như bây giờ — dòng cuối là đợt mới nhất |
| `docs/LOI-NEN-CHUNG.md` | Nợ nền chung với app 1, và cách kiểm cho đúng |

---

## 7. Một nếp làm việc của đợt này, đáng giữ

Bốn lỗi nặng nhất của đợt đều **không** tìm ra bằng cách đọc lại bằng mắt:

| Tìm ra bằng | Lỗi gì |
|---|---|
| Đọc thẳng nội dung tệp ở kho app 1, không tra lịch sử commit | Sổ nợ ghi 5 lỗ bảo mật là đã đóng trong khi đang mở (Đ213) |
| Liệt kê máy móc mọi lệnh trong tài liệu rồi lọc theo loại | Hai chỗ nữa thiếu `sudo`, sau khi chủ dự án đã vấp một chỗ (Đ217) |
| Đếm lại bảng bằng máy thay vì tin con số viết tay | Con số "còn nợ" trượt lần thứ ba (Đ213) |
| Đọc hai con số trong chính dòng `ls -ld` | Thư mục dữ liệu đã có lần cài cũ bên trong |

**Câu rút ra: đo chứ không nhớ.** Một câu đúng lúc viết sẽ sai ngay khi thứ nó
mô tả dài thêm — và không có gì báo. Chỗ nào viết một con số hay một tên nhánh
vào tài liệu, chỗ đó cần một cách đo đi kèm, hoặc một bài canh.
