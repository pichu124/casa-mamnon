# Sao lưu và khôi phục — CASA Mầm non

Viết lại cho app 2 ngày 26/11/2026 (Đ261g), theo máy đang chạy ở InterData
(`docs/MAY-CHU-THU-INTERDATA.md`) và số đo của đợt thử vận hành, thử tải ngày
26/11. Mọi lệnh chạy trên VPS bằng tài khoản `casa`, trong `/opt/casa-mamnon`,
và **luôn kèm `DATA_DIR=/var/lib/casa-mamnon`**: thiếu nó thì lệnh nhìn nhầm vào
thư mục `./data` trong kho mã (trên máy đã cài, lệnh tự dừng và nói rõ).

Việc phải xong trước ngày dùng thật (cron `&&`, chỗ để bản sao ngoài máy, diễn tập
khôi phục trên VPS, giám sát) nằm ở `docs/DUA-VAO-DUNG.md`, mục A2, A4, A5, A6.

---

## 1. Sao lưu những gì, nằm ở đâu

| Phần | Ở đâu (máy thật) | Trong bản sao | Ghi chú |
|---|---|---|---|
| Cơ sở dữ liệu | `/var/lib/casa-mamnon/school.db` | `backups/school-YYYYMMDD-HHMM.db.gz` | Mọi thứ trừ tệp ảnh: bé, gia đình, cô, điểm danh, nhật ký, tin nhắn, hồ sơ sức khoẻ, đồng ý ảnh, khoá thông báo đẩy, **cả phiên đăng nhập** |
| Ảnh, video | `/var/lib/casa-mamnon/uploads/` | `backups/uploads/` | Bản **chép đầy đủ** (không phải liên kết), mỗi đêm chỉ chép tệp mới — chiếm thêm đúng bằng dung lượng ảnh trên cùng ổ |
| Video đang gửi dở | `video-tam/` | **không** | Tệp gốc chưa đăng, tự dọn sau 24 giờ |
| Trạng thái bộ canh máy | `canh-may.json` | không | Mất thì chỉ báo lại một lần |

Tên tệp là **giờ chụp theo giờ Việt Nam** (`school-20261126-0200.db.gz` = 02:00
ngày 26/11/2026), kể cả khi máy đặt giờ UTC. **Đừng đổi tên tệp sao lưu**: vòng
đời bản sao và bộ soát máy chủ đọc giờ từ tên.

**Bản sao nhạy cảm hơn chính máy chủ.** Nó là một tệp chép đi được, không có màn
đăng nhập nào canh, và (tới khi lỗi O4 được sửa) chứa **phiên đăng nhập dạng thô**:
ai cầm được tệp `.db.gz` là đăng nhập được như người đã đăng nhập, kể cả quản trị,
trong tối đa 30 ngày. Vì vậy thư mục dữ liệu phải là 700 (`DUA-VAO-DUNG.md`, A3)
và mọi bản ra ngoài máy phải mã hoá.

---

## 2. Các lệnh

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup          # tạo bản sao mới (an toàn khi app đang chạy)
DATA_DIR=/var/lib/casa-mamnon npm run backup:list     # xem các bản đang có, trạng thái khoá giữ ảnh
DATA_DIR=/var/lib/casa-mamnon npm run restore:check   # mở thử bản mới nhất, in số bé, người dùng, ảnh…
DATA_DIR=/var/lib/casa-mamnon node scripts/backup.js --out /mnt/o-ngoai/casa-mamnon   # sao lưu ra ổ khác
```

Sao lưu dùng lệnh sao lưu riêng của SQLite, nên chụp đúng cả khi cô đang ghi. Đo
ngày 26/11: dữ liệu nhỏ 0,27 giây; cơ sở dữ liệu 82 MB kèm 5.616 ảnh (5 tháng của
300 bé) **6,9 giây** lần đầu, 5,8 giây các lần sau (chủ yếu là nén). Chạy ở tiến
trình riêng, không làm app chậm.

**Lịch hằng đêm 02:00** — dòng cron đầy đủ (nối bằng `&&`, hỏng thì gửi tin cho
người trực): `docs/DUA-VAO-DUNG.md`, mục A4. Giờ 02:00 chỉ đúng khi máy đặt múi giờ
Việt Nam (`timedatectl`).

---

## 3. Vòng đời bản sao (tự dọn)

- **48 giờ gần nhất:** giữ **mọi** bản (tối đa 24 bản), để bản chạy tay "trước khi
  cập nhật" không bị lượt sao lưu sau đó trong ngày xoá mất.
- **7 ngày gần nhất:** giữ bản **đầu** và bản **cuối** của mỗi ngày.
- **4 bản theo tuần, 12 bản theo tháng.**

Ảnh không theo vòng đời trên: bản sao của một tấm ảnh chỉ được dọn khi mọi bản sao
cơ sở dữ liệu còn giữ đều chụp **sau** lúc tấm ảnh biến mất khỏi `uploads/`.

### Khoá giữ ảnh đã tải về ổ ngoài

Trước khi tải ảnh cũ về ổ cứng của trường rồi xoá bớt trên máy chủ cho nhẹ đĩa, bật
khoá — nếu không, một vòng đời sau máy dọn nốt bản sao, ảnh chỉ còn trên một ổ cứng:

```bash
DATA_DIR=/var/lib/casa-mamnon node scripts/backup.js --giu-anh        # BẬT: không tự dọn bản sao ảnh
DATA_DIR=/var/lib/casa-mamnon node scripts/backup.js --thoi-giu-anh   # TẮT: dọn lại như cũ
```

Khoá là một tệp (`backups/giu-anh-da-tai-ve.lock`), đi theo kho sao lưu; mỗi lượt
sao lưu đều nhắc khi khoá đang bật. Khoá bật thì chỗ ảnh trong `backups/` chỉ tăng.

---

## 4. Bản sao ra ngoài máy — CHỜ CHỦ DỰ ÁN QUYẾT

Bản sao nằm cùng ổ với dữ liệu gốc **mất cùng lúc** khi ổ hỏng hoặc VPS bị thu hồi.
Phải có một bản ở chỗ khác. Hiện có **một mâu thuẫn chưa giải**:

- Quy định của kho (từ khi chốt VPS trong nước, 12/11): **bản sao không rời lãnh
  thổ Việt Nam**. Bản sao chứa hồ sơ trẻ 12 tháng – 6 tuổi, ảnh và video khuôn mặt
  trẻ, hồ sơ sức khoẻ, số điện thoại và số định danh của phụ huynh — nhóm dữ liệu
  nhạy cảm theo NĐ 13/2023 và Luật 91/2025/QH15. Đưa lên dịch vụ đặt ở nước ngoài
  (Google Drive, Dropbox, OneDrive, Amazon S3, Cloudflare R2, Backblaze…) là chuyển
  dữ liệu xuyên biên giới, kéo theo thủ tục riêng.
- Thực tế từ 16/11: máy đang đẩy bản sao (mã hoá bằng rclone `crypt`) lên **Google
  Drive** — cài ở một phiên khác, cùng lúc với casa-lead (chi tiết ở
  `docs/MAY-CHU-THU-INTERDATA.md`, mục 3). Với dữ liệu mẫu thì chưa sao.

Hai đường, hệ quả của từng đường ở `docs/DUA-VAO-DUNG.md`, mục A2. **Trước khi nhập
dữ liệu thật phải chọn một**, rồi sửa mục này cho khớp:

1. **Giữ Drive có mã hoá** sau khi người có chuyên môn pháp lý xác nhận, làm hồ sơ
   chuyển dữ liệu ra nước ngoài, mua dung lượng đứng tên trường.
2. **Đổi sang chỗ trong nước**, một trong ba cách, thêm vào dòng cron ngay sau lệnh
   sao lưu (bằng `&&`):

   ```bash
   # ① ổ cứng ngoài ở trường (rẻ nhất, không cần tài khoản dịch vụ nào)
   DATA_DIR=/var/lib/casa-mamnon node scripts/backup.js --out /mnt/o-ngoai/casa-mamnon
   # ② một máy khác ở phòng hành chính, qua SSH (KHÔNG dùng --delete)
   rsync -a /var/lib/casa-mamnon/backups/ user@may-hanh-chinh:/backup/casa-mamnon/
   # ③ lưu trữ đối tượng ĐẶT TẠI VIỆT NAM (VNG Cloud, Viettel IDC, FPT Cloud, CMC…),
   #    qua lớp crypt của rclone như hiện nay (KHÔNG dùng `rclone sync`)
   rclone copy /var/lib/casa-mamnon/backups <tên-kho-mã-hoá>:casa-mamnon
   ```

> **`rsync --delete` và `rclone sync` xoá theo cả lỗi.** Chúng làm bên kia giống
> hệt bên này: bên này mất bản sao (ổ hỏng, `DATA_DIR` sai, thư mục trống) thì lượt
> kế tiếp lúc 2 giờ sáng **xoá nốt bản ở bên kia**. Dùng `rsync -a` và `rclone copy`;
> bên kia chỉ tăng, nên phải theo dõi dung lượng chỗ ấy.

Dù chọn đường nào: **mật khẩu mã hoá cất thêm một bản ở chỗ an toàn của trường**
(mất là bản sao vô dụng), và **thử khôi phục từ đúng chỗ ấy một lần** (mục 6).

---

## 5. Khôi phục từng bước

Script khôi phục: tự kiểm bản sao trước khi ghi; **từ chối chạy khi app còn mở cơ
sở dữ liệu**; **đổi tên** dữ liệu đang có (`school.db.truoc-khi-khoi-phuc-*`) chứ
không xoá; chép ảnh trong `backups/uploads/` vào `uploads/` mà không đè tệp đang có.

### 5a. Lỡ tay xoá hay sửa sai dữ liệu — bản trên máy còn

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup:list                    # chọn bản TRƯỚC lúc sai
sudo systemctl stop casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run restore -- school-20261126-0200.db.gz
sudo systemctl start casa-mamnon
curl -s -H 'X-Forwarded-Proto: https' http://127.0.0.1:3000/healthz  # {"ok":true}
```

Mọi thứ ghi sau giờ của bản sao ấy sẽ mất: báo cô và văn phòng ghi lại phần đó.
Chỉ xoá `school.db.truoc-khi-khoi-phuc-*` khi đã chắc chắn.

### 5b. Máy hỏng hay mất — dựng máy mới

1. Dựng máy theo `docs/TRIEN-KHAI.md` (múi giờ, Node, mã nguồn, thư mục
   `/var/lib/casa-mamnon` quyền 700, dịch vụ, Caddy) — **chưa** tạo tài khoản quản
   trị, chưa bật dịch vụ.
2. Lấy **CẢ thư mục `backups/`** về `/var/lib/casa-mamnon/backups/` (từ chỗ ngoài
   máy ở mục 4, hoặc từ ổ cũ nếu còn đọc được). Không chỉ lấy một tệp `.db.gz`:
   - ảnh nằm trong `backups/uploads/`, thiếu là khôi phục ra một trường không có ảnh
     (script sẽ cảnh báo);
   - các bản cũ hơn là lịch sử để quay về trước một lỗi phát hiện muộn; máy mới chỉ
     có một bản thì vòng đời bản sao bắt đầu lại từ số không.

   ```bash
   # ví dụ từ kho rclone (tên kho tuỳ mục 4); thêm --progress để xem tiến độ
   rclone copy <tên-kho-mã-hoá>:casa-mamnon /var/lib/casa-mamnon/backups --progress
   ```
3. Khôi phục, rồi bật dịch vụ:

   ```bash
   cd /opt/casa-mamnon
   time DATA_DIR=/var/lib/casa-mamnon node scripts/restore.js     # bản mới nhất trong backups/
   DATA_DIR=/var/lib/casa-mamnon npm run restore:check
   sudo systemctl enable --now casa-mamnon
   curl -s -H 'X-Forwarded-Proto: https' http://127.0.0.1:3000/healthz
   ```
4. Đăng nhập quản trị, đối chiếu số bé, một album có ảnh, một cuộc nhắn tin, điểm
   danh hôm trước. Khởi động lại thêm một lần, kiểm lại.
5. Tên miền trỏ sang IP mới (nếu IP đổi); điện thoại của cô và gia đình không phải
   cài lại khi **tên miền giữ nguyên**. Thông báo đẩy vẫn chạy vì khoá đẩy nằm trong
   cơ sở dữ liệu.
6. `DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu -- --ten-mien=<ten-mien>`, rồi
   cài lại cron sao lưu (A4) và bộ canh máy (A6) của `docs/DUA-VAO-DUNG.md`.

Ảnh cất tách khỏi tệp `.db.gz` (ví dụ chỉ lấy ảnh từ ổ ngoài): thêm
`--anh <thư mục uploads>` vào lệnh `restore.js`.

---

## 6. Mất bao nhiêu dữ liệu, bao lâu thì xong

| | Con số | Nguồn |
|---|---|---|
| Dữ liệu có thể mất | Tối đa ~24 giờ (sao lưu mỗi đêm). Muốn ít hơn: thêm lượt sao lưu buổi trưa vào cron | thiết kế |
| Khôi phục cơ sở dữ liệu từ bản trên máy | **0,07 giây** (300 bé, máy thử, đo 26/11); cả quy trình 5a khoảng **5–10 phút** gồm dừng, chọn bản, kiểm lại | đo |
| Khởi động lại sau khôi phục | dưới 0,7 giây | đo |
| Kéo cơ sở dữ liệu nén từ ngoài về | vài phút (bản nén vài chục MB) | ước tính |
| **Kéo ảnh, video từ ngoài về** | **hàng giờ** khi kho ảnh đã 25–30 GB (một năm học theo dự trù): chậm vì số tệp (hàng chục nghìn ảnh), không chỉ vì dung lượng | ước tính, **chưa đo** — đo ở lần diễn tập |
| Dựng máy mới từ đầu (5b) | nửa ngày, cộng thời gian kéo ảnh | ước tính |

Trong lúc kéo ảnh, app có thể bật lên trước với cơ sở dữ liệu (ảnh chưa về thì hiện
ô trống), rồi chép ảnh vào sau và chạy lại `restore.js` kèm `--anh`. Quyết theo
tình huống: trường ngừng app nửa ngày, hay dùng app vài giờ không có ảnh.

---

## 7. Diễn tập khôi phục

**Bản sao chưa từng khôi phục thử thì coi như không có.**

- Mỗi tuần (tự động): bộ soát `kiem-tra-may-chu` mở thử bản mới nhất; bộ canh máy
  báo khi bản mới nhất quá 30 giờ tuổi (`docs/DUA-VAO-DUNG.md`, A6).
- **Ngay sau ngày nhập dữ liệu thật, rồi mỗi quý:** diễn tập đầy đủ trên chính VPS,
  vào một thư mục và cổng riêng, không đụng app đang chạy, không gửi thông báo tới
  điện thoại phụ huynh — lệnh từng bước ở `docs/DUA-VAO-DUNG.md`, mục A5.
- **Mỗi năm một lần:** diễn tập từ chỗ ngoài máy (mục 4), ghi lại thời gian kéo ảnh.

Ghi mỗi lần diễn tập vào sổ vận hành: ngày, bản sao nào, mất bao lâu, số liệu có
khớp không.
