# Đưa vào dùng thật — việc phải xong trước ngày phát tài khoản

Viết ngày 26/11/2026 (Đ261g) cho **một cơ sở khoảng 300 bé** trên VPS InterData
đang chạy máy thử (`docs/MAY-CHU-THU-INTERDATA.md`). Nguồn: hai đợt kiểm thử thay
trường ngày 26/11 — thử vận hành (cài mới, nhập 300 bé, sao lưu, khôi phục, bảo mật)
và thử tải (300 bé, 550 phụ huynh, 5 tháng dữ liệu). Số đo trích ở đây là số đo của
hai đợt ấy trên máy thử, **chưa đo trên VPS thật**.

Ba nhóm việc:

- **(A) Chặn** — chưa xong thì chưa phát tài khoản.
- **(B) Nên làm trong tháng đầu.**
- **(C) Làm sau.**

Cột *Ai làm*: **chủ dự án** (quyết và chạy lệnh trên VPS), **văn phòng** (nhà
trường), **lập trình** (sửa mã trong kho). Người làm phần mềm không vào VPS: mọi
lệnh trên VPS dưới đây do chủ dự án chạy, bằng tài khoản `casa` (không dùng `root`).

Chỗ cần điền ghi `<…>`. Tên miền của trường ghi là `<ten-mien>`.

---

## Tóm tắt một trang

| # | Việc | Ai làm | Tốn |
|---|---|---|---|
| **A1** | Tên miền đứng tên trường, trỏ về VPS, đổi khối Caddy — **trước** khi phát tài khoản | Trường + chủ dự án | 1–3 ngày đăng ký, 30 phút cấu hình |
| **A2** | Chốt chỗ để bản sao ngoài máy (Drive hay trong nước) | Chủ dự án quyết, lập trình viết lệnh | Quyết 1 buổi, làm 2–4 giờ |
| **A3** | Cài mới trên thư mục dữ liệu sạch, không dữ liệu mẫu; khoá quyền thư mục | Chủ dự án | 1 giờ |
| **A4** | Sao lưu đêm: nối bằng `&&`, hỏng thì báo | Chủ dự án | 15 phút |
| **A5** | Diễn tập khôi phục trên chính VPS, ngay sau ngày nhập dữ liệu thật | Chủ dự án | 1 giờ |
| **A6** | Giám sát: canh máy mỗi 5 phút, báo cho người trực | Chủ dự án chọn kênh, rồi chạy lệnh | 1 giờ |
| **A7** | Chuẩn bị và nhập danh sách bé (CSV từ Excel) | Văn phòng | 2–4 giờ chuẩn bị, 1 phút nhập |
| **A8** | Khai lứa "Nhà trẻ" cho các nhóm nhà trẻ ngay sau khi nhập | Văn phòng / ban giám hiệu | 5 phút |
| **A9** | Quyết cách cấp tài khoản phụ huynh, phát tài khoản | Chủ dự án + văn phòng | Quyết 1 buổi; phát 1–2 tuần |
| **A10** | Thủ tục tối thiểu theo NĐ 13 | Ban giám hiệu + người có chuyên môn pháp lý | 1–2 tuần |
| **A11** | Chốt điểm 1 (giấy nhập học) trong bốn điểm hẹn của Đ260 | Chủ dự án + trường | 1 buổi |
| A12 | Thử 15 phút trên điện thoại thật | Cô, phụ huynh thật | 15 phút |
| B1–B9 | Cập nhật an toàn, journald, xoay vòng nhật ký, cập nhật hệ điều hành, dung lượng ổ, ba điểm Đ260 còn lại, lỗi đã biết | xem mục B | |
| C | Công cụ xoá dữ liệu một bé, nhật ký truy cập, hồ sơ đánh giá tác động… | xem mục C | |

---

## (A) Chặn — phải xong trước

### A1. Tên miền của trường — trước khi phát tài khoản

**Vì sao chặn:** mỗi điện thoại cài app, bật thông báo, lưu đăng nhập **theo tên
miền**. Phát tài khoản trên `casa-school.duckdns.org` rồi mới đổi là mọi máy phải
cài lại, đăng nhập lại, bật thông báo lại; phiếu đã in sai địa chỉ. Tên miền tạm
cũng không đứng tên trường: người làm phần mềm nghỉ là trường mất cửa vào.

| Bước | Ai | Lệnh / việc | Thời gian |
|---|---|---|---|
| 1 | Trường | Đăng ký `<ten-mien>` đứng tên trường (`.vn` cần hồ sơ tổ chức; `.edu.vn` theo quy định của Bộ). Bản ghi A trỏ về `103.195.238.114` | 1–3 ngày |
| 2 | Chủ dự án | Kiểm trên VPS: `getent hosts <ten-mien>` phải in đúng IP | 1 phút |
| 3 | Chủ dự án | Đổi khối Caddy — mẫu đủ ở `docs/TRIEN-KHAI.md`, mục *Caddy*: `sudo nano /etc/caddy/Caddyfile`, đổi dòng đầu khối thành `<ten-mien> {`, rồi `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy` | 10 phút |
| 4 | Chủ dự án | `curl -I https://<ten-mien>/healthz` → `HTTP/2 200`; `DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu -- --ten-mien=<ten-mien>` → mục chứng chỉ ĐẠT | 5 phút |
| 5 | Chủ dự án | Kiểm nén trên một đường **JSON có đăng nhập**, không chỉ tệp tĩnh — lệnh ở khung ngay dưới. Phải in `content-encoding: gzip` (hoặc `zstd`) | 5 phút |

**Vì sao bước 5:** app không tự nén; nén là việc của Caddy (`encode zstd gzip`, mẫu ở
`docs/TRIEN-KHAI.md`). Phép kiểm cũ chỉ `curl` một tệp `.js`, mà thứ nặng nhất lại là
JSON sau đăng nhập: `/api/auth/me` và `/api/students` của văn phòng, ban giám hiệu
khoảng **306–319 KB** mỗi lần mở app với 300 bé; nén gzip còn **13–15 KB** (đo trong
đợt thử tải 26/11, Đ261f). Caddy hay khối proxy sửa sai mà bỏ sót JSON thì điện
thoại phụ huynh, cô trên 4G tải gấp hai mươi lần mà không ai thấy lỗi.

```bash
# --- chạy trên VPS, tài khoản nào của app cũng được; xong thì đăng xuất như dòng cuối ---
read -rs -p 'Mật khẩu: ' MK; echo                    # gõ ẩn, không vào lịch sử lệnh
curl -s -o /dev/null -c ~/.casa-thu-nen -H 'Content-Type: application/json' \
  --data "{\"username\":\"<tên đăng nhập>\",\"password\":\"$MK\"}" https://<ten-mien>/api/auth/login
unset MK
curl -s -o /dev/null -D - -b ~/.casa-thu-nen -H 'Accept-Encoding: gzip' \
  https://<ten-mien>/api/auth/me | grep -iE '^HTTP|content-encoding'   # HTTP/2 200 và content-encoding: gzip
curl -s -o /dev/null -b ~/.casa-thu-nen -X POST https://<ten-mien>/api/auth/logout
rm -f ~/.casa-thu-nen                                 # tệp có cookie phiên — xoá ngay
```

Ra `HTTP/2 401` là đăng nhập chưa được (sai tên, mật khẩu có dấu `"`): thử lại. Ra
`200` mà không có dòng `content-encoding` thì xem lại khối Caddy trước khi phát tài
khoản.

### A2. Chỗ để bản sao ngoài máy — CHỜ CHỦ DỰ ÁN QUYẾT

Hiện cron 02:00 đẩy bản sao (mã hoá bằng rclone `crypt`) lên **Google Drive** —
trái quy định của kho (`docs/SAO-LUU.md`: bản sao không rời Việt Nam). Với dữ
liệu mẫu thì chưa sao; với dữ liệu thật thì phải chọn một trong hai:

| | Giữ Google Drive có mã hoá | Đổi sang lưu trữ trong nước / ổ cứng ở trường |
|---|---|---|
| Pháp lý | Là **chuyển dữ liệu ra nước ngoài** (NĐ 13, Điều 25): cần hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài, gửi cơ quan chức năng. Mã hoá giảm rủi ro nhưng **chưa ai xác nhận là đủ**. Phải hỏi người có chuyên môn pháp lý, rồi sửa `docs/SAO-LUU.md` cho khớp | Không phát sinh thủ tục chuyển ra nước ngoài |
| Dung lượng | Tài khoản miễn phí 15 GB; `rclone copy` không bao giờ xoá trên Drive, ảnh tăng mỗi năm → đầy trong năm đầu, **đẩy hỏng âm thầm**. Cần gói trả phí đứng tên trường | Gói lưu trữ đối tượng trong nước (VNG Cloud, Viettel IDC, FPT Cloud, CMC…) hoặc một ổ cứng ngoài ở trường |
| Việc còn mở | Khoá kết nối (client_id) dùng chung của rclone Google sắp ngừng; tài khoản Drive đang là cá nhân; mật khẩu mã hoá chỉ có một bản | Thuê dịch vụ, tạo khoá truy cập, đổi một dòng cron |
| Thời gian | Hỏi pháp lý: tuỳ người tư vấn | 2–4 giờ cài + một lần thử khôi phục |

Dù chọn bên nào: **thử khôi phục casa-mamnon từ đúng chỗ ấy một lần** (mục A5),
và cất mật khẩu mã hoá ở chỗ an toàn của trường (mất là bản sao vô dụng).

Kéo ảnh về từ chỗ ngoài máy **mất hàng giờ** khi kho ảnh đã 25–30 GB (một năm học
theo dự trù của kế hoạch). Cơ sở dữ liệu thì chỉ vài phút. Xem `docs/SAO-LUU.md`.

### A3. Cài mới trên thư mục dữ liệu sạch

Máy thử đang chạy dữ liệu mẫu ở `/var/lib/casa-mamnon` (tài khoản mẫu, bé giả,
ảnh đồ vật). Không nhập dữ liệu thật lên trên. **Không xoá** thư mục mẫu: đổi tên
giữ lại, khi nào chắc không cần mới bỏ.

Thử vận hành ngày 26/11 thấy `school.db` và các bản sao mang quyền 644 (mọi tài
khoản khác trên máy đọc được), mà VPS này chạy chung với casa-lead. Khoá thư mục
lại (700) và cho dịch vụ tạo tệp mới với quyền 600.

```bash
# --- chạy trên VPS, tài khoản casa ---
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup            # bản sao cuối của máy thử, phòng khi cần xem lại

sudo systemctl stop casa-mamnon
sudo mv /var/lib/casa-mamnon /var/lib/casa-mamnon.mau-$(date +%Y%m%d)   # GIỮ LẠI, không xoá
sudo chmod 700 /var/lib/casa-mamnon.mau-*

sudo install -d -m 700 -o casa -g casa /var/lib/casa-mamnon
ls -ld /var/lib/casa-mamnon                              # phải là drwx------ casa casa

# Tệp mới (cơ sở dữ liệu, ảnh, bản sao) chỉ chủ đọc được
sudo mkdir -p /etc/systemd/system/casa-mamnon.service.d
printf '[Service]\nUMask=0077\n' | sudo tee /etc/systemd/system/casa-mamnon.service.d/quyen.conf
sudo systemctl daemon-reload

# Tài khoản quản trị TRƯỚC khi bật (máy thật với cơ sở dữ liệu trống sẽ từ chối tự sinh dữ liệu mẫu)
DATA_DIR=/var/lib/casa-mamnon npm run create-admin -- "<họ tên hiệu trưởng>" <tên đăng nhập>
#   → in mật khẩu tạm MỘT LẦN. Chép ra giấy, không chụp màn hình gửi qua Zalo.

sudo systemctl start casa-mamnon
sleep 3 && curl -s -H 'X-Forwarded-Proto: https' http://127.0.0.1:3000/healthz   # {"ok":true}
DATA_DIR=/var/lib/casa-mamnon npm run backup                                    # lần sao lưu đầu của máy thật
ls -l /var/lib/casa-mamnon /var/lib/casa-mamnon/backups | head                   # chỉ chủ casa đọc được
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu -- --ten-mien=<ten-mien>  # mục tiêu: 0 mục cần sửa
```

Còn hai việc:

- Ảnh album, video, thông báo đẩy của máy thử nằm trong thư mục cũ, máy mới không
  có. Điện thoại đã cài app từ máy thử: gỡ biểu tượng cũ, cài lại từ `<ten-mien>`.
- `chmod 700` chỉ chặn được **tài khoản khác**. Nếu casa-lead cũng chạy bằng tài
  khoản `casa` thì hai app vẫn đọc được dữ liệu của nhau: tách tài khoản là việc B8.

### A4. Sao lưu đêm: nối bằng `&&`, hỏng thì báo

Dòng cron hiện nối hai lệnh bằng `;`: sao lưu hỏng thì `rclone` vẫn chạy, đẩy lại
bản cũ, và không ai biết. Đổi thành `&&` và gửi tin khi bất cứ bước nào hỏng
(kênh báo cài ở A6; chưa có kênh thì tin vẫn ghi vào `backup-casa.log`).

```bash
crontab -l > ~/crontab.cu-$(date +%Y%m%d)      # giữ bản cũ
crontab -e
```

Thay dòng 02:00 của casa-mamnon bằng **một dòng** (giữ nguyên các dòng của casa-lead).
`<lệnh-đẩy-ra-ngoài>` là lệnh của A2: hiện là `rclone copy /var/lib/casa-mamnon/backups mahoa:casa-mamnon`.

```cron
0 2 * * * umask 077 && cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js >> /home/casa/backup-casa.log 2>&1 && <lệnh-đẩy-ra-ngoài> >> /home/casa/backup-casa.log 2>&1 || { echo "$(date) SAO LƯU ĐÊM HỎNG" >> /home/casa/backup-casa.log; set -a; [ -r /etc/casa-mamnon/canh-may.env ] && . /etc/casa-mamnon/canh-may.env; set +a; DATA_DIR=/var/lib/casa-mamnon /usr/bin/node /opt/casa-mamnon/scripts/canh-may.js --gui "Sao lưu đêm 02:00 HỎNG (sao lưu hoặc đẩy bản sao ra ngoài). Xem: tail -50 /home/casa/backup-casa.log" >> /home/casa/backup-casa.log 2>&1; }
```

Thử ngay một lần (không chờ tới 2 giờ sáng): chép phần sau `0 2 * * *` ra dấu nhắc
và chạy; xem `tail -20 /home/casa/backup-casa.log`.

### A5. Diễn tập khôi phục trên chính VPS

Thử vận hành đã khôi phục được trên máy thử (cơ sở dữ liệu 0,07 giây, số liệu khớp).
Trên VPS thật thì chưa. Làm **ngay sau ngày nhập dữ liệu thật**, và mỗi quý một lần.
Khôi phục vào một **thư mục riêng, cổng riêng**: app đang chạy không bị đụng tới.
Bản diễn tập chép thêm một lần toàn bộ ảnh: xem `df -h /` trước, phải còn trống hơn
dung lượng `du -sh /var/lib/casa-mamnon/backups/uploads`.

```bash
cd /opt/casa-mamnon
install -d -m 700 /tmp/casa-dien-tap
ls -1t /var/lib/casa-mamnon/backups/school-*.db.gz | head -1    # bản mới nhất — ghi tên lại
time DATA_DIR=/tmp/casa-dien-tap node scripts/restore.js /var/lib/casa-mamnon/backups/<tên-bản-vừa-ghi>
#   đọc bản sao và ảnh ở backups/ của máy thật, CHỈ GHI vào /tmp/casa-dien-tap; ghi lại thời gian

# Bản diễn tập KHÔNG được gửi thông báo tới điện thoại phụ huynh thật:
node -e "const D=require('better-sqlite3');const d=new D('/tmp/casa-dien-tap/school.db');console.log('Đã gỡ',d.prepare('DELETE FROM push_dang_ky').run().changes,'đăng ký đẩy của BẢN DIỄN TẬP')"

DATA_DIR=/tmp/casa-dien-tap NODE_ENV=production HOST=127.0.0.1 PORT=3999 HEN_GIO_PHUT=0 node server.js &
sleep 3 && curl -s http://127.0.0.1:3999/healthz                # {"ok":true}
```

Từ máy tính ở nhà: `ssh -L 3999:127.0.0.1:3999 casa@103.195.238.114`, mở
`http://localhost:3999`, đăng nhập quản trị, đối chiếu: số bé, một album có ảnh,
một cuộc nhắn tin, điểm danh hôm qua. Xong:

```bash
kill %1                                   # tắt bản diễn tập
rm -rf /tmp/casa-dien-tap                 # bản chép dữ liệu thật — KIỂM ĐƯỜNG DẪN HAI LẦN rồi mới xoá
```

Ghi vào sổ vận hành: ngày, bản sao nào, mất bao lâu, số liệu có khớp không. Lần
diễn tập từ chỗ ngoài máy (A2) thì lấy bản về một thư mục tạm khác (ví dụ
`/tmp/casa-lay-ve`), khôi phục từ đó y như trên, và **ghi thời gian kéo ảnh về** —
đó là con số quyết định trường ngừng bao lâu khi ổ hỏng.

### A6. Giám sát tối thiểu

Hôm nay không có gì báo ra ngoài khi app chết, đĩa đầy, hay sao lưu ngừng.
`scripts/canh-may.js` soát mỗi 5 phút: `/healthz` (cổng trong máy và qua
`https://<ten-mien>`), % ổ đã dùng (báo từ 85%), tuổi bản sao mới nhất (báo quá
30 giờ), máy còn ffmpeg không. Có vấn đề thì gửi **một** tin, nhắc lại sau 6 giờ
nếu vẫn còn, báo "đã ổn lại" khi hết.

**Kênh báo — chủ dự án chọn.** Kênh phải nằm ngoài app (app chết thì thông báo đẩy
của app chết theo). Có sẵn hai kênh:

- **Telegram** (đơn giản nhất, khuyên dùng): tin chỉ có tình trạng máy, không có
  dữ liệu của bé nào.
- **Thư** qua `sendmail`: máy cần cài và cấu hình một bộ gửi thư (ví dụ `msmtp-mta`
  với hộp thư của trường) — việc riêng, khoảng 1 giờ.

Tạo bot Telegram (5 phút, trên điện thoại người trực): mở Telegram, tìm
`@BotFather`, gửi `/newbot`, đặt tên → nhận **token**. Nhắn một câu bất kỳ cho bot
vừa tạo (hoặc thêm bot vào nhóm trực). Rồi trên VPS:

```bash
# 1. Tệp bí mật — CHỈ trên VPS, quyền 600, KHÔNG BAO GIỜ đưa vào kho mã
sudo install -d -m 700 -o casa -g casa /etc/casa-mamnon
install -m 600 /dev/null /etc/casa-mamnon/canh-may.env
nano /etc/casa-mamnon/canh-may.env      # gõ đúng ba dòng dưới (không có dấu # ở đầu), lưu
#   CANH_TELEGRAM_TOKEN=<token của BotFather>
#   CANH_TELEGRAM_CHAT=<số chat id, xem bước 2>
#   CANH_TEN_MIEN=<ten-mien>

# 2. Lấy chat id: tìm "chat":{"id":<số> trong kết quả
curl -s "https://api.telegram.org/bot<token>/getUpdates"

# 3. Thử kênh: điện thoại người trực phải nhận một tin
cd /opt/casa-mamnon
set -a; . /etc/casa-mamnon/canh-may.env; set +a
DATA_DIR=/var/lib/casa-mamnon node scripts/canh-may.js --thu-kenh
DATA_DIR=/var/lib/casa-mamnon node scripts/canh-may.js; echo "mã thoát: $?"   # "Máy ổn", mã 0

# 4. Hẹn giờ mỗi 5 phút
sudo tee /etc/systemd/system/casa-canh-may.service >/dev/null <<'UNIT'
[Unit]
Description=CASA Mam non - canh may (healthz, o dia, sao luu, ffmpeg)

[Service]
Type=oneshot
User=casa
Environment=DATA_DIR=/var/lib/casa-mamnon
Environment=PORT=3000
EnvironmentFile=-/etc/casa-mamnon/canh-may.env
ExecStart=/usr/bin/node /opt/casa-mamnon/scripts/canh-may.js
UNIT
sudo tee /etc/systemd/system/casa-canh-may.timer >/dev/null <<'UNIT'
[Unit]
Description=CASA Mam non - canh may moi 5 phut

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now casa-canh-may.timer
systemctl list-timers casa-canh-may.timer             # thấy lần chạy kế tiếp
journalctl -u casa-canh-may -n 20 --no-pager          # kết quả các lượt

# 5. Thử báo động thật một lần: tắt app 6 phút, người trực phải nhận tin "App không trả lời",
#    bật lại thì nhận "ĐÃ ỔN LẠI". Làm ngoài giờ học.
sudo systemctl stop casa-mamnon; sleep 400; sudo systemctl start casa-mamnon
```

Chưa có kênh nào thì timer vẫn chạy, ghi vấn đề vào `journalctl -u casa-canh-may`
kèm dòng "CHƯA CÓ KÊNH BÁO" — tức **không ai nhận**. Đó là lý do việc này nằm ở mục A.

Lệnh soát đầy đủ (`npm run kiem-tra-may-chu`, gồm cả mật khẩu mẫu, chứng chỉ) vẫn
chạy tuần một lần theo `docs/TRIEN-KHAI.md`; muốn nhận kết quả của nó qua cùng
kênh: thêm `|| node /opt/casa-mamnon/scripts/canh-may.js --gui "Soát máy chủ tuần này có mục CẦN SỬA"`
vào cuối dòng cron thứ Hai (kèm nạp `canh-may.env` như dòng sao lưu ở A4).

### A7. Chuẩn bị và nhập danh sách bé

Màn nhập: **Cài đặt → Nhóm lớp, cô, nhập danh sách → Thông tin bé & nhân sự →
Nhập danh sách bé**. Chỉ nhận **CSV**, không nhận `.xlsx`. Bấm **Tải tệp mẫu CSV**
để lấy mẫu 14 cột: `Mã của bé, Họ tên, Ngày sinh, Giới tính, Nhóm, Cơ sở, Địa chỉ,
Họ tên phụ huynh, Điện thoại, Email, Dân tộc, Họ tên phụ huynh 2, Điện thoại phụ
huynh 2, Quan hệ phụ huynh 2`. Mỗi dòng một bé; ba cột phụ huynh 2 để trống được
(bản Đ261a — bản trước chỉ có 11 cột, một phụ huynh).

Chuẩn bị từ Excel của trường (văn phòng, 2–4 giờ cho 300 bé):

1. Mở tệp mẫu bằng Excel. Dòng ví dụ mang mã **`VI-DU`** (tên "dòng ví dụ — xoá
   đi"): nên xoá; quên xoá thì màn xem trước báo "Đã bỏ qua dòng ví dụ của tệp
   mẫu" và **không** nhập dòng đó.
2. Cột **Ngày sinh**: ghi kiểu Việt Nam **ngày/tháng/năm** (`24/09/2023`), hoặc
   `2023-09-24`; Excel tự đổi thành số ngày cũng đọc được. App đọc ngày trước, tháng
   sau, không đoán kiểu Mỹ. Ngày không có thật (`31/02/2024`), ngày ở tương lai, bé
   trên 7 tuổi là dòng lỗi; bé dưới 12 tháng hay trên 6 tuổi là thẻ vàng cảnh báo,
   vẫn nhập được.
3. Cột **Điện thoại** (và Điện thoại phụ huynh 2): để kiểu **Văn bản** (chuột phải →
   *Định dạng ô* → Văn bản), để giữ số 0 ở đầu. Anh chị em dùng chung một số điện
   thoại thì được nối vào cùng một tài khoản nhà — kể cả số của phụ huynh 2.
4. Cột **Nhóm**: gõ đúng y tên nhóm, có dấu. Gõ "Mam 1" trong khi đã có "Mầm 1"
   thì màn xem trước hiện thẻ đỏ "Xem lại tên nhóm trước khi nhập — Sẽ tạo nhóm MỚI
   'Mam 1' (giống 'Mầm 1' đã có?)": sửa trong tệp rồi tải lên lại, không thì các bé
   ấy vào một nhóm riêng.
5. Lưu: *Tệp → Lưu dưới dạng* → kiểu **CSV UTF-8 (Comma delimited) (*.csv)** — đúng
   dòng có chữ **UTF-8**. Kiểu CSV thường (ANSI) bị app chặn kèm hướng dẫn.
6. Tải lên, đọc màn xem trước (số "Sẽ nhập", dòng lỗi, dòng trùng), rồi mới nhập.
   Nhập lại cùng tệp không tạo bé trùng.

Nhập 300 bé mất khoảng **7 giây** và từ bản Đ261a không còn làm cả app đứng (trước
đó ~11 giây cả trường chờ); vẫn nên nhập ngoài giờ học. Ngay sau khi nhập: chạy một lần sao lưu tay (`npm run backup`) và làm A5.

### A8. Khai lứa "Nhà trẻ"

Ngay sau khi nhập, ở **Thông tin bé & nhân sự → Nhóm lớp & bé**, với mỗi nhóm nhà
trẻ: **Sửa** → ô **Lứa tuổi của nhóm** → chọn **Nhà trẻ (12–36 tháng)** → lưu (ban
giám hiệu hoặc quản lý cơ sở; văn phòng bị chặn). Khai rồi thì sổ nhật ký (bữa, ngủ,
vệ sinh) đi theo nhóm, không phụ thuộc ngày sinh — tức không bị lỗi ngày sinh ở A7
làm mất sổ của bé. 5 phút.

### A9. Cấp và phát tài khoản phụ huynh

**Quyết trước (chủ dự án + văn phòng, 1 buổi):** một tài khoản mỗi nhà, hay bố và
mẹ mỗi người một tài khoản? Từ bản Đ261a mẫu nhập có ba cột **phụ huynh 2**: điền
luôn trong tệp, nhà có hai con mà phụ huynh 2 cùng số thì chỉ có **một** tài khoản.
Thêm tay sau này ở "Thêm phụ huynh cho bé": số đã có tài khoản thì máy **hỏi** rồi
nối bé vào tài khoản đó. Còn một đường vẫn sinh tài khoản thứ hai: phụ huynh 2 nhập
ở phiếu **Nhận một bé** luôn được tạo mới (xem B9).

**Phát tài khoản** (khoảng 280 tài khoản cho 300 bé, gấp đôi nếu cả bố lẫn mẹ):

1. Nhập xong, hộp **"Tài khoản đã tạo" chỉ hiện một lần**: bấm **Tải danh sách tài
   khoản (CSV)** ngay. Tệp có cột `Bé, Nhóm, Phụ huynh, Điện thoại, Tên đăng nhập,
   Mật khẩu`. Đây là tệp mật khẩu: cất trên máy văn phòng, xoá sau khi phát xong,
   không gửi qua Zalo/thư.
2. Trộn thư bằng Word (*Thư → Bắt đầu trộn thư → Nhãn*, nguồn là tệp CSV vừa tải,
   mỗi trang A4 khoảng 8 phiếu): mỗi phiếu ghi tên bé, nhóm, địa chỉ
   `https://<ten-mien>`, tên đăng nhập, mật khẩu tạm, và ba bước "mở địa chỉ →
   đăng nhập → đặt mật khẩu mới". Dòng "Nhà đã có tài khoản" thì ô mật khẩu trống:
   không in mật khẩu cho dòng đó. **1–2 giờ dựng mẫu, 1–2 giờ in và cắt (~35–70 trang)**.
3. Phát tận tay khi đón bé, trong **1–2 tuần**; đánh dấu nhà đã nhận. Nhắn Zalo
   từng nhà thì khoảng 9 giờ công và để lại mật khẩu trong tin nhắn — không khuyên.
4. **Phát ở buổi họp dùng Wi-Fi của trường được** từ bản Đ261b: khoá đăng nhập đếm
   theo từng tài khoản trên từng mạng — sai 5 lần thì chỉ tài khoản đó bị khoá 15
   phút trên mạng ấy, nhà khác cùng Wi-Fi vẫn vào được. Cả mạng chỉ bị chặn khi
   tổng số lần sai từ mạng đó vượt 100 trong 15 phút. Lưu ý: nếu sau này đặt
   Cloudflare trước Caddy thì mọi người hiện ra cùng một địa chỉ mạng — phải sửa
   cấu hình `trust proxy` trước khi bật.
5. Quên mật khẩu: văn phòng cấp lại ở **Cài đặt → Tài khoản & phân quyền → Tài khoản**.

Rải việc phát ra 1–2 tuần cũng tránh được một rủi ro dài hạn: phiên đăng nhập hết
hạn sau **30 ngày tính từ lúc đăng nhập**, nên cả trường đăng nhập cùng ngày thì
30 ngày sau cả trường cùng bị đăng xuất, xếp hàng đăng nhập lại cùng lúc.

### A10. Thủ tục tối thiểu theo NĐ 13/2023 và Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15

> **Đây không phải tư vấn pháp lý.** Danh sách dưới đây là những gì đợt thử vận
> hành 26/11 đối chiếu được giữa app và Nghị định 13/2023/NĐ-CP. Luật 91/2025/QH15
> có hiệu lực có thể đổi thủ tục và số điều. Trường cần người có chuyên môn pháp lý
> xác nhận trước khi dùng thật.

**App đã có:** máy chủ đặt tại Việt Nam; ghi đồng ý ba mục cho từng bé và ghi rút
đồng ý qua văn phòng; lọc ảnh nhóm theo đồng ý ở tầng dữ liệu; phân quyền ba lớp và
theo cơ sở; nhật ký thao tác; mật khẩu băm (scrypt); HTTPS + HSTS; bé nghỉ học thì
gia đình còn xem hồ sơ 12 tháng.

**App chưa có:** màn thông báo xử lý dữ liệu trong app; công cụ xoá hẳn dữ liệu một
bé; thời hạn lưu; mã hoá bản sao nằm trên máy (bản sao trên VPS là tệp không mã hoá).

**Trường còn phải làm (ban giám hiệu + tư vấn pháp lý, 1–2 tuần):**

1. Xác nhận bằng văn bản giấy nhập học của **mọi khoá** có ba điều khoản tách riêng
   (hồ sơ học tập; chia sẻ ảnh cho gia đình khác; ③ truyền thông / tuyển sinh). Thiếu
   thì đặt mục đó về "Chưa trả lời" **trước khi nhập** (xem A11).
2. Văn bản thông báo xử lý dữ liệu phát cho phụ huynh (Điều 13).
3. Chỉ định người hoặc bộ phận bảo vệ dữ liệu cá nhân — có dữ liệu nhạy cảm: sức
   khoẻ, trẻ em (Điều 28).
4. Điều khoản bên xử lý dữ liệu với InterData và với người làm phần mềm có quyền SSH.
5. Quy trình báo vi phạm trong 72 giờ (Điều 23): ai báo, báo ai, ai được quyền tắt máy.
6. Nếu giữ Google Drive (A2): hồ sơ chuyển dữ liệu ra nước ngoài (Điều 25).
7. Hồ sơ đánh giá tác động xử lý dữ liệu (Điều 24): hạn **60 ngày kể từ ngày chạy
   thật** — đặt lịch ngay ngày đầu.

### A11. Bốn điểm chủ dự án hẹn chốt (Đ260, 26/11)

Ghi ở `docs/TIEN-DO.md`, mục "Đ260 — việc còn mở". Chưa chốt thì app giữ nguyên
hành vi đang có.

| Điểm | Hành vi hiện tại | Hệ quả nếu dùng thật khi chưa chốt | Mức |
|---|---|---|---|
| **Mục 1 — giấy nhập học / NĐ 13** | Mọi bé nhập vào đều được ghi đồng ý cả ba mục "theo giấy nhập học", kể cả ③ truyền thông (đợt thử 26/11: 300/300 bé `truyenThong=1`). Gia đình muốn rút thì báo văn phòng | Nếu giấy nhập học của khoá nào không có ô tích riêng cho ③, ảnh bé đó có thể vào tài khoản truyền thông mà không có đồng ý thật. Trái `docs/KE-HOACH.md` mục 6 ("ô ③ mặc định KHÔNG tích") | **A — chặn** |
| **Mục 9 — tin đẩy phòng trao đổi chung** | Màn khoá điện thoại mọi thành viên hiện chữ tin nhắn kèm "Mẹ bé …" | Tin riêng tư của một nhà hiện trên màn khoá của các nhà khác | B — nên chốt trước khi bật phòng chung cho trường |
| **Mục 4 — ai xác nhận liên hệ khẩn cấp** | Quản lý cơ sở / ban giám hiệu xác nhận; văn phòng chỉ xem | Văn phòng nhận việc mà không bấm được; đề xuất của gia đình nằm chờ | C |
| **Mục 3 — Cambridge hẹn ngày tương lai** | Tới ngày bắt đầu bài tự hiện với gia đình nhưng không có tin báo | Gia đình không biết có bài mới; cô phải gửi thông báo riêng | C |

### A12. Thử 15 phút trên điện thoại thật

Những gì máy không kiểm được (thông báo trên màn khoá, camera thật, video iPhone,
cài vào màn hình chính, mất mạng thật, bàn phím số): mục đầu của
`docs/HUONG-DAN-THU-NHANH.md`, "Thử 15 phút trước khi dùng thật". Làm trên máy thử
trước; dựng xong máy thật (A3) thì làm lại T1–T3 trên `<ten-mien>` bằng tài khoản
thật của một cô và một phụ huynh, trước khi phát tài khoản cho cả trường.

---

## (B) Nên làm trong tháng đầu

### B1. Cập nhật mã an toàn hơn

Bản `~/cap-nhat.sh` cũ chạy `npm ci` thẳng trong thư mục mã: `npm ci` xoá
`node_modules` trước khi cài, mất mạng giữa chừng là app đang chạy mất thư viện và
lần tự khởi động lại kế tiếp thì chết; không kiểm app sau khi khởi động, không quay
lui. Bản mới nằm trong kho: `scripts/cap-nhat-may-chu.sh` (sao lưu → cài thư viện
vào thư mục tạm → đổi chỗ → khởi động lại hai lần, chờ `/healthz` → hỏng thì quay
lui mã và thư viện, báo người trực). Cài: `docs/MAY-CHU-THU-INTERDATA.md`, mục 2.
Chủ dự án, 15 phút.

**Lần cập nhật lên bản đợt Đ261 (lần đầu có script mới) — ba điều phải biết:**

- **Bắt buộc cài lại thư viện.** `package-lock.json` đổi (`body-parser` 2.4.0, `qs`
  6.17.1 — vá lỗ `npm audit` mức cao, Đ261b). Script mới tự `npm ci` khi khoá gói
  đổi (bước 4 của nó), nên **chép script mới ra trước** rồi mới chạy, vì bản
  `~/cap-nhat.sh` đang có trên máy là bản cũ:

  ```bash
  cd /opt/casa-mamnon && git fetch origin
  git show origin/main:scripts/cap-nhat-may-chu.sh > ~/cap-nhat.sh && chmod +x ~/cap-nhat.sh
  TEN_MIEN=<ten-mien> ~/cap-nhat.sh
  npm ls body-parser qs                  # phải là body-parser@2.4.0, qs@6.17.1
  npm audit --omit=dev                   # found 0 vulnerabilities
  ```

  Cập nhật tay theo `docs/MAY-CHU-THU-INTERDATA.md` mục 2 thì dòng `npm ci --omit=dev`
  **không được bỏ**.
- **Phiên đăng nhập được băm lúc khởi động** (Đ261b, O4): không ai bị đăng xuất. Bản
  sao lưu làm **trước** lần cập nhật này vẫn chứa phiên dạng thô, dùng được tới khi
  phiên hết hạn (tối đa 30 ngày): giữ chúng đúng chỗ như A2 dặn, đừng chép đi đâu.
  Muốn chặn hẳn thì phải xoá mọi phiên cũ, tức đăng xuất cả trường — chủ dự án quyết.
- **Quay lui về bản trước Đ261** (theo "Quay lui" ở `docs/MAY-CHU-THU-INTERDATA.md`)
  thì mọi người phải đăng nhập lại một lần (bản cũ không đọc được phiên đã băm);
  không mất dữ liệu.

### B2. Giới hạn nhật ký hệ thống (journald)

Nhật ký của app, Caddy, bộ canh máy đi vào journald. Không giới hạn thì nó có thể
lấy tới 10% ổ.

```bash
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=500M\nMaxRetentionSec=3month\n' | sudo tee /etc/systemd/journald.conf.d/casa.conf
sudo systemctl restart systemd-journald
journalctl --disk-usage
```

### B3. Xoay vòng tệp nhật ký sao lưu và soát máy

`backup-casa.log`, `soat-may-chu.log` chỉ có tăng.

```bash
sudo tee /etc/logrotate.d/casa-mamnon >/dev/null <<'CONF'
/home/casa/backup-casa.log /var/lib/casa-mamnon/soat-may-chu.log /var/lib/casa-mamnon/backup.log {
    su casa casa
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
CONF
sudo logrotate -d /etc/logrotate.d/casa-mamnon     # chạy thử, không đổi gì; đọc có dòng lỗi không
```

### B4. Cập nhật bảo mật hệ điều hành tự động

```bash
sudo apt install -y unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
# Tự khởi động lại khi bản vá nhân cần — lúc 03:30, sau sao lưu 02:00, ngoài giờ học.
# Không muốn máy tự khởi động lại thì bỏ dòng này và mỗi tháng xem /var/run/reboot-required.
printf 'Unattended-Upgrade::Automatic-Reboot "true";\nUnattended-Upgrade::Automatic-Reboot-Time "03:30";\n' | sudo tee /etc/apt/apt.conf.d/52casa-khoi-dong-lai
sudo unattended-upgrade --dry-run --debug 2>&1 | tail -5
systemctl is-enabled casa-mamnon caddy casa-canh-may.timer   # cả ba "enabled": khởi động lại máy là tự lên
```

### B5. Dung lượng ổ: 180 GB đủ bao lâu

Số đo của đợt thử tải (300 bé, mỗi năm học), cộng dự trù của kế hoạch:

| Phần | Mỗi năm, một cơ sở ~300 bé | Ghi chú |
|---|---|---|
| Cơ sở dữ liệu | 160–200 MB | nhật ký bữa, chuông của bé, nhật ký gửi là lớn nhất |
| Album | ~2,4 GB | nhịp 30 album × 30 ảnh mỗi tháng, ảnh ~220 KB |
| Ảnh điểm danh | ~0,2 GB nếu ít bé có ảnh; **~6 GB** nếu chụp mọi bé cả lúc vào lẫn lúc ra | |
| Video 720p (15–20 MB/phút) | **~8 GB** nếu 1 phút mỗi nhóm mỗi tuần; **~42 GB** nếu mỗi ngày | |
| Bản sao trên cùng ổ | **×2** phần ảnh và video (bản chép đầy đủ, không phải liên kết) + ~25 bản cơ sở dữ liệu nén | |
| `video-tam/` | vài GB lúc đông | tệp gốc đang gửi, tự dọn sau 24 giờ |

Ổ 180 GB, dùng chung với casa-lead và hệ điều hành; tính **khoảng 150 GB** cho
casa-mamnon, bộ canh báo từ 85%.

| Cách dùng (kể cả bản sao ×2) | Một cơ sở | Ba cơ sở |
|---|---|---|
| Như đợt thử tải: album + video hằng tuần ≈ 21 GB/năm/cơ sở | ~7 năm | ~2,5 năm |
| Thêm ảnh mọi bé lúc vào và ra ≈ 33 GB/năm/cơ sở | ~4,5 năm | ~1,5 năm |
| Theo dự trù kế hoạch (ảnh 25–30 GB/năm) ≈ 55–65 GB/năm/cơ sở | ~2,5 năm | **dưới 1 năm** |
| Video mỗi ngày ≈ 90 GB/năm/cơ sở | dưới 2 năm | **vài tháng** |

**Chủ dự án quyết**, trước khi mở cơ sở thứ hai: nâng ổ (hỏi InterData giá nâng
dung lượng), hoặc đưa bản sao ảnh ra chỗ ngoài máy thay vì giữ ×2 trên cùng ổ
(lập trình: dùng liên kết cứng cho `backups/uploads`, 0,5 ngày), hoặc giới hạn
video. Bộ canh A6 báo khi ổ chạm 85%; `npm run kiem-tra-may-chu` có ước tính "còn
bao lâu thì đầy" theo tốc độ ảnh thật.

### B6. Tách tài khoản hệ điều hành cho từng app

casa-mamnon và casa-lead chạy chung một VPS. Chạy mỗi app dưới một tài khoản riêng
(`casa-mamnon`, `casa-lead`), thư mục dữ liệu 700 của chủ ấy: một app bị chiếm
quyền không đọc được dữ liệu trẻ của app kia. Lập trình viết lệnh, chủ dự án chạy,
khoảng 1 giờ, làm vào cuối tuần (phải dừng app vài phút).

### B7. Hai điểm Đ260 còn lại

Mục 9 (tin đẩy phòng trao đổi chung trên màn khoá) — chốt trước khi bật phòng chung
cho cả trường. Mục 4 và mục 3 — xem bảng A11.

### B8. Xin InterData xác nhận giá gia hạn bằng văn bản

Gói mua lúc khuyến mãi (5.679.000 đ/năm, giá niêm yết 21.792.000 đ), hết hạn
13/11/2027. Xin một email hoặc hoá đơn ghi "gia hạn không đổi giá", và hỏi hoá đơn
có đứng tên trường không. Chủ dự án, một email.

### B9. Lỗi đã biết của đợt thử 26/11 cần lập trình sửa

Đối chiếu ngày 26/11 sau khi gộp đợt Đ261 (chi tiết từng đơn vị ở `docs/TIEN-DO.md`,
khung "Đ261"). Máy chạy thật phải ở bản có đủ các bản vá này (B1).

| Lỗi | Hậu quả | Trạng thái / tạm thời |
|---|---|---|
| O1 — ngày sinh nhập nguyên văn | `24/09/2023` thành "NaN"; `12/5/24` đọc kiểu Mỹ; ngày tương lai, bé 11 tuổi đều được nhận | **Đã sửa (Đ261a)** — xem A7 bước 2 |
| O2 — phụ huynh thứ hai | nhà nhiều con sinh ra nhiều tài khoản cho cùng một người | **Đã sửa ở nhập tệp và "Thêm phụ huynh" (Đ261a).** Còn ở phiếu **Nhận một bé**: phụ huynh 2 luôn được tạo tài khoản mới — thêm phụ huynh 2 bằng "Thêm phụ huynh cho bé" thay vì ở phiếu đó |
| O3 — khoá theo địa chỉ mạng | cả mạng Wi-Fi bị khoá 15 phút; ngược lại đăng nhập đúng một lần là xoá bộ đếm | **Đã sửa (Đ261b)** — A9 bước 4 |
| O4 — phiên đăng nhập lưu thô trong cơ sở dữ liệu | ai cầm tệp sao lưu là đăng nhập được như quản trị tới 30 ngày | **Đã sửa (Đ261b)**; bản sao làm trước lần cập nhật vẫn còn phiên thô tới 30 ngày (B1). Vẫn giữ thư mục 700 (A3), bản sao ngoài máy mã hoá (A2) |
| O5 — mật khẩu tạm không hết hạn, API không bắt đổi | phiếu mật khẩu tạm rơi vào tay người khác là đọc được hồ sơ bé mà không cần đặt mật khẩu mới | **Đang sửa (Đ261h)** — chặn ở máy chủ. Trong lúc chờ: phát phiếu nhanh, nhắc đổi |
| `npm audit` — `body-parser` mức cao | gửi một yêu cầu nén đặc biệt làm treo máy chủ | **Đã sửa (Đ261b)** — sau khi cập nhật phải `npm ci` (B1) |

---

## (C) Làm sau

- **Hồ sơ đánh giá tác động** (Điều 24 NĐ 13): hạn 60 ngày kể từ ngày chạy thật —
  đặt lịch ngay hôm đầu (xem A10).
- Công cụ **xoá hẳn dữ liệu một bé** (quyền xoá) và chính sách **thời hạn lưu**; màn
  "Quyền riêng tư" trong app. Đ260 mục 7 (dòng mồ côi của Kế hoạch của bé) và mục 8
  (khôi phục bản sao JSON chạy lại bước "đồng ý mặc định").
- **Nhật ký truy cập** để tra cứu khi có sự cố: đã có trong khối Caddy mẫu của
  `docs/TRIEN-KHAI.md` (giữ 30 ngày). Nhật ký này có địa chỉ mạng của phụ huynh:
  kể nó trong văn bản thông báo xử lý dữ liệu (A10 mục 2).
- ~~Nhập 300 bé làm máy chủ đứng 11 giây; gõ nhầm tên nhóm tạo nhóm mới lặng lẽ (O6,
  O7)~~ — đã sửa ở Đ261a (A7).
- ~~Xuất Excel điểm danh "giờ vào ra" dài ngày làm cả app đứng; đăng nhập băm mật
  khẩu đồng bộ~~ — đã sửa ở Đ261f (xuất không chặn app, mỗi lúc một lượt xuất) và
  Đ261b (băm ở luồng phụ). Còn lại cho lúc mở ba cơ sở: gói JSON của văn phòng, ban
  giám hiệu ~300 KB mỗi lần mở app (phần lớn là danh sách cô lặp lại theo từng bé) —
  nén ở Caddy (A1 bước 5) che được phần lớn; nhập danh sách cô còn băm mật khẩu
  đồng bộ.
- Trang in phiếu tài khoản có mã QR (thay bước trộn thư ở A9, tiết kiệm vài giờ cho
  văn phòng mỗi khoá nhập học).
