# Máy chủ thử InterData — cách làm từng việc

> **Máy này là MÁY THỬ, chạy dữ liệu mẫu.** Chụp ảnh đồ vật, không chụp trẻ thật.
> Trước khi nhập dữ liệu thật của trường phải xong bốn việc ghi ở mục N7 của
> `docs/TIEN-DO.md` (tên miền của trường, chốt chỗ để bản sao ngoài máy, xác
> nhận giá gia hạn, đổi sang dữ liệu thật). Danh sách đầy đủ, kèm lệnh từng việc
> (cài mới trên thư mục sạch, giám sát, diễn tập khôi phục, nhập danh sách, phát tài
> khoản): `docs/DUA-VAO-DUNG.md`.
>
> Tệp này ghi **cách làm** với đúng máy đang chạy. Thông tin gói, cấu hình, hạn
> thuê và các việc còn mở nằm ở mục **N7** của `docs/TIEN-DO.md`. Quy trình
> chung cho máy chạy thật nằm ở `docs/TRIEN-KHAI.md` và `docs/CAP-NHAT-MAY-CHU.md`.
>
> **Không ghi mật khẩu vào tệp này**, kể cả mật khẩu mã hoá của rclone.

## Máy ở đâu

| | |
|---|---|
| Nhà cung cấp | InterData (bảng điều khiển: support.interdata.vn → Dịch vụ → `casamamon`) |
| Tên máy, IP | `casamamon`, `103.195.238.114` |
| Tên miền tạm | https://casa-school.duckdns.org (duckdns.org, miễn phí) |
| Tài khoản dùng hằng ngày | `casa` (không dùng `root`) |
| Mã nguồn | `/opt/casa-mamnon`, nhánh `main` |
| Dữ liệu | `/var/lib/casa-mamnon` (cơ sở dữ liệu `school.db`, ảnh `uploads/`) |
| Bản sao trên máy | `/var/lib/casa-mamnon/backups` |
| Dịch vụ | `casa-mamnon` (systemd), cổng 3000 chỉ nghe trong máy; Caddy lo HTTPS |
| Tường lửa | `ufw`, chỉ mở 22, 80, 443 |
| Giờ máy | giờ Việt Nam (+07) |

---

## 1. Vào máy

Từ PowerShell trên Windows:

```powershell
ssh casa@103.195.238.114
```

Đăng nhập xong dấu nhắc là `casa@casamamon:~$`.

**Vì sao không dùng `root`:** mã nguồn, khoá đọc kho mã trên GitHub và lịch sao
lưu đều thuộc `casa`. Chạy `git pull` hay `npm ci` bằng `root` tạo ra tệp thuộc
`root`, lần sau `casa` không ghi đè được. Việc cần quyền quản trị thì đã có
`sudo` trong lệnh (hỏi mật khẩu của `casa`). Chỉ dùng `root` khi không vào được
bằng `casa`.

**Gõ gọn `ssh casa`:** trên Windows chạy `notepad $HOME\.ssh\config`, chọn Yes để
tạo tệp, dán ba dòng dưới rồi lưu (tên tệp đúng `config`, không có `.txt`):

```
Host casa
    HostName 103.195.238.114
    User casa
```

---

## 2. Cập nhật mã khi `main` có bản mới

Chỉ cập nhật khi đã có bản gộp vào `main` (bộ kiểm thử trên GitHub xanh rồi mới
gộp, nên máy thử này không chạy lại `npm test`; máy chạy thật thì làm đủ quy
trình ở `docs/CAP-NHAT-MAY-CHU.md`).

```bash
cd /opt/casa-mamnon
git log --oneline -1                               # ghi lại mã bản đang chạy, để quay lui
DATA_DIR=/var/lib/casa-mamnon npm run backup       # sao lưu trước
git pull origin main
npm ci --omit=dev
sudo systemctl restart casa-mamnon
sleep 3
curl -I https://casa-school.duckdns.org/healthz                        # phải ra HTTP/2 200
curl -s https://casa-school.duckdns.org/sw.js | grep "const VERSION"   # số phiên bản mới
```

Không ra `HTTP/2 200` thì xem lỗi: `sudo journalctl -u casa-mamnon -n 50 --no-pager`.

Đó là cách làm tay, để hiểu từng bước. Dùng hằng ngày thì chạy `~/cap-nhat.sh` ngay
dưới: dòng `npm ci` làm tay mà mất mạng giữa chừng là app mất thư viện, và làm tay
thì không có bước tự quay lui.

**Cập nhật bằng một lệnh — `~/cap-nhat.sh`** (Đ261g). Script nằm trong kho:
`scripts/cap-nhat-may-chu.sh`. Chép một bản ra ngoài kho mã (để `git pull` không
thay tệp đang chạy), làm một lần và làm lại mỗi khi script trong kho đổi:

```bash
cp /opt/casa-mamnon/scripts/cap-nhat-may-chu.sh ~/cap-nhat.sh && chmod +x ~/cap-nhat.sh
```

Mỗi lần cập nhật:

```bash
TEN_MIEN=casa-school.duckdns.org ~/cap-nhat.sh
```

Script làm, theo thứ tự (bước nào hỏng thì dừng ở đó, app vẫn chạy bản cũ):

1. Kho mã có sửa tay chưa commit → dừng.
2. Sao lưu (`npm run backup`); in tên bản sao trước cập nhật — **ghi lại tên này**.
3. `git fetch`; không có gì mới thì thoát.
4. Chỉ khi `package.json` / `package-lock.json` đổi: `npm ci` vào **thư mục tạm**.
   Mất mạng giữa chừng thì `node_modules` đang chạy còn nguyên. (Bản cũ chạy
   `npm ci` thẳng trong `/opt/casa-mamnon`: `npm ci` xoá `node_modules` trước khi
   cài, nên hỏng giữa chừng là app đang chạy mất thư viện, và lần tự khởi động lại
   kế tiếp thì chết.)
5. Đổi sang mã mới; thư viện cũ giữ ở `node_modules.truoc-cap-nhat`.
6. Khởi động lại **hai lần**, mỗi lần chờ `/healthz` trả `{"ok":true}` (cả qua
   `https://TEN_MIEN` nếu có). Không lên → **tự quay lui** mã và thư viện, khởi động
   lại bản cũ, gửi tin cho người trực (khi đã cài kênh báo ở `docs/DUA-VAO-DUNG.md`,
   mục A6), in 30 dòng nhật ký. Dữ liệu **không** tự khôi phục: xem "Quay lui" dưới.

**Điện thoại đã cài app:** mở, đóng hẳn, mở lại — lần mở thứ hai mới là bản mới.

### Quay lui về bản trước

**Khi chỉ cần đổi mã** (bản mới chạy được nhưng có lỗi giao diện, lỗi một màn):

```bash
cd /opt/casa-mamnon
git log --oneline -5                              # tìm mã bản trước
git checkout <mã-bản-trước>                       # ví dụ: git checkout 2dd1b3c
[ -d node_modules.truoc-cap-nhat ] && mv node_modules node_modules.hong && mv node_modules.truoc-cap-nhat node_modules
sudo systemctl restart casa-mamnon
curl -s -H 'X-Forwarded-Proto: https' http://127.0.0.1:3000/healthz   # {"ok":true}
```

(Dòng `node_modules` chỉ cần khi lần cập nhật ấy có đổi thư viện; xong thì `rm -rf
node_modules.hong`.) Khi có bản sửa: `git checkout main` rồi `~/cap-nhat.sh`.

**Khi bản mới đã kịp ghi dữ liệu mà bản cũ đọc sai** (hiếm: mọi bảng mới đều chỉ
thêm, không đổi bảng cũ — nhưng một bản lỗi có thể đã ghi sai dữ liệu): đổi mã như
trên, rồi khôi phục bản sao **trước cập nhật** mà script đã in ở bước 2.

```bash
cd /opt/casa-mamnon
sudo systemctl stop casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run restore -- <tên-bản-sao-trước-cập-nhật>   # ví dụ school-20261126-2130.db.gz
sudo systemctl start casa-mamnon
```

**Mọi thứ cô và gia đình ghi từ lúc cập nhật tới lúc khôi phục sẽ mất** (điểm danh,
tin nhắn, ảnh mới vẫn còn trong `uploads/` nhưng không còn dòng nào trỏ tới). Vì
vậy: cập nhật ngoài giờ học, và quyết khôi phục dữ liệu càng sớm càng tốt. Script
khôi phục đổi tên dữ liệu hiện tại để giữ lại (`school.db.truoc-khi-khoi-phuc-*`),
không xoá — lỡ tay vẫn quay lại được.

### Thử một nhánh CHƯA gộp vào `main`

Dùng khi muốn xem trước một bản đang làm dở (như lần thử Đ258 ngày 14/11):

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup
git fetch origin <tên-nhánh>
git checkout -B thu-tam origin/<tên-nhánh>
sudo systemctl restart casa-mamnon
```

Về lại `main`: `git checkout main && git branch -D thu-tam`, rồi khởi động lại.
Nhánh thử có đổi bảng dữ liệu hay thư viện thì hỏi trước khi làm — quay lui khi
đó không còn đơn giản là đổi mã.

---

## 3. Sao lưu đang chạy thế nào

### Lớp 1 — trên chính máy này

Mỗi đêm **02:00** (giờ Việt Nam), lịch `crontab` của `casa` chạy
`npm run backup`, ghi nhật ký vào `/home/casa/backup-casa.log`:

- **Cơ sở dữ liệu:** mỗi lần một tệp nén, ví dụ `school-20261117-0200.db.gz`.
  Dùng lệnh sao lưu riêng của SQLite nên chép đúng cả khi có người đang dùng app.
- **Ảnh và video:** chép vào `backups/uploads/`, mỗi đêm chỉ chép ảnh mới.
- **Giữ bao lâu** (tự dọn): mọi bản trong 48 giờ; 7 ngày gần nhất mỗi ngày bản
  đầu và cuối (chạy một lần mỗi đêm nên thực tế một bản mỗi ngày); 4 bản theo
  tuần; 12 bản theo tháng. Ảnh đã xoá khỏi app chỉ bị dọn khỏi kho sao lưu khi
  không còn bản cơ sở dữ liệu nào nhắc tới nó.

Lớp này chỉ cứu được khi lỡ tay xoá hay sửa sai dữ liệu. Ổ hỏng hoặc máy bị thu
hồi là mất cả dữ liệu lẫn bản sao — nên mới có lớp 2.

### Lớp 2 — lên Google Drive, có mã hoá (cài 16/11/2026)

Cài ở một phiên làm việc khác, cùng lúc với sao lưu của app casa-lead chạy chung
máy này. Dòng cron 02:00 được nối thêm:

```
; rclone copy /var/lib/casa-mamnon/backups mahoa:casa-mamnon
```

**Phải đổi `;` thành `&&` và thêm báo lỗi** (Đ261g): với `;`, sao lưu hỏng thì
rclone vẫn chạy, đẩy lại bản cũ, không ai biết. Dòng thay thế đầy đủ ở
`docs/DUA-VAO-DUNG.md`, mục A4.

- `gdrive:` là Google Drive; `mahoa:` là lớp mã hoá (`crypt` của rclone) đặt
  trên thư mục `gdrive:casa-sao-luu`. Tên tệp, tên thư mục và nội dung đều mã
  hoá bằng mật khẩu chủ dự án giữ (nằm trong cấu hình rclone của `casa` trên
  máy này). Ai mở được Drive cũng không đọc được gì.
- Đẩy CẢ cơ sở dữ liệu lẫn ảnh.
- Dùng `copy`, không dùng `sync`: Drive chỉ được thêm, không bao giờ xoá theo
  khi máy này hỏng. Hệ quả: Drive chỉ có tăng.
- Trên web, thư mục `casa-sao-luu` có hai thư mục con tên lộn xộn (một của
  casa-mamnon, một của casa-lead). **Đừng đổi tên, di chuyển hay xoá gì trong
  đó trên web**: rclone tìm tệp theo đúng tên đã mã hoá, đổi là không khôi phục
  được.

> ⚠️ **Lớp 2 đang trái quy định của kho** (`docs/SAO-LUU.md`: bản sao không được
> rời Việt Nam, kể tên Google Drive). Với dữ liệu mẫu thì chưa sao. Trước khi
> nhập dữ liệu thật phải chốt: giữ Drive có mã hoá sau khi hỏi người có chuyên
> môn pháp lý (rồi sửa quy định cho khớp), hoặc đổi sang lưu trữ đặt tại Việt Nam
> / ổ cứng ở trường. Bốn điều kỹ thuật còn mở (dung lượng Drive, khoá kết nối
> dùng chung của rclone, cất mật khẩu mã hoá, lệnh nối bằng `;`) ghi ở mục N7.

### Tự kiểm tra sao lưu

```bash
tail -20 ~/backup-casa.log                               # lần chạy gần nhất có lỗi không
ls -lh /var/lib/casa-mamnon/backups/ | tail              # các bản trên máy
cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon npm run restore:check   # bản mới nhất còn đọc được không
crontab -l                                               # dòng 02:00 còn đủ hai lệnh không
rclone ls mahoa:casa-mamnon | grep db.gz | tail -5      # các bản đã lên Drive (tên thật)
rclone lsd mahoa:                                        # phải thấy casa-mamnon và casa-lead
```

Muốn biết thư mục tên lộn xộn nào trên web là của app nào:

```bash
rclone lsd gdrive:casa-sao-luu                           # in tên đã mã hoá, đầy đủ
rclone cryptdecode mahoa: <tên-thứ-nhất> <tên-thứ-hai>   # ra casa-mamnon / casa-lead
```

---

## 4. Khôi phục

**Dừng app trước khi khôi phục.** Script khôi phục tự từ chối nếu app còn mở cơ
sở dữ liệu, và đổi tên dữ liệu hiện tại để giữ lại chứ không xoá — khôi phục
nhầm vẫn quay lại được.

### Từ bản sao trên máy

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup -- --list            # xem các bản đang có
sudo systemctl stop casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run restore                     # bản mới nhất
# hoặc một bản cụ thể:
DATA_DIR=/var/lib/casa-mamnon npm run restore -- school-20261117-0200.db.gz
sudo systemctl start casa-mamnon
curl -I https://casa-school.duckdns.org/healthz
```

### Từ Google Drive (khi bản trên máy đã mất)

Lấy bản về một thư mục tạm, rồi khôi phục từ đó:

```bash
mkdir -p ~/lay-tu-drive && cd ~/lay-tu-drive
rclone ls mahoa:casa-mamnon | grep db.gz | tail -5                 # chọn bản cần lấy
rclone copy mahoa:casa-mamnon/school-20261117-0200.db.gz .
rclone copy mahoa:casa-mamnon/uploads ./uploads                    # ảnh, nếu ảnh cũng mất
cd /opt/casa-mamnon
sudo systemctl stop casa-mamnon
DATA_DIR=/var/lib/casa-mamnon node scripts/restore.js ~/lay-tu-drive/school-20261117-0200.db.gz --anh ~/lay-tu-drive/uploads
sudo systemctl start casa-mamnon
```

Không có máy chủ (máy bị thu hồi): cài rclone lên máy khác, chép cấu hình rclone
(cần mật khẩu mã hoá), rồi lấy về như trên. **Mất mật khẩu mã hoá là bản trên
Drive không mở được nữa.** Đến 17/11/2026 mới thử khôi phục từ Drive cho
casa-lead; casa-mamnon chưa thử — nên thử một lần trước khi có dữ liệu thật.

---

## 5. Máy này đã được dựng thế nào (13–14/11/2026)

Làm tay, theo `docs/MAY-CHU-THU-ORACLE-APP2.md` (Phần 0 mục 0.5–0.6, Phần 2
bước 4–9), khác ở mấy chỗ:

- **Người dùng `casa`** thay cho `ubuntu`: `sudo adduser casa`, `sudo usermod -aG sudo casa`,
  rồi đăng nhập lại bằng `casa`. Mọi chỗ `ubuntu` trong tài liệu kia (lệnh
  `chown`, dòng `User=` của dịch vụ, đường nhật ký sao lưu) đổi thành `casa`.
- **Lấy mã bằng khoá chỉ-đọc của kho** (deploy key trên GitHub) thay cho
  `git clone https://…`, vì kho để riêng tư.
- **Không có lớp tường lửa của Oracle**; thay vào đó dùng `ufw`. Ảnh Ubuntu của
  InterData không cài sẵn `ufw`:

  ```bash
  sudo apt install -y ufw
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
  sudo ufw enable
  ```

- Lúc `apt upgrade` hỏi về tệp cấu hình SSH: chọn **giữ bản đang có** (*keep the
  local version*) — InterData chỉnh sẵn tệp đó cho kiểu đăng nhập của máy.
- Dữ liệu mẫu dựng bằng `npm run ban-thu -- --khong-chay --thu-muc /var/lib/casa-mamnon`
  (in bảng mật khẩu một lần duy nhất — không chép vào kho).
- Tên miền: sửa bản ghi `casa-school` trên duckdns.org trỏ về `103.195.238.114`.
- Soát lần đầu: `DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu -- --ten-mien=casa-school.duckdns.org` → 11 đạt / 0 cần sửa.

---

## 6. Hỏng thì xem gì trước

| Thấy gì | Xem |
|---|---|
| Trang không mở / lỗi 502 | `sudo systemctl status casa-mamnon --no-pager`, rồi `sudo journalctl -u casa-mamnon -n 50 --no-pager` |
| Lỗi chứng chỉ HTTPS | `sudo journalctl -u caddy -n 30 --no-pager`; kiểm duckdns còn trỏ đúng IP: `getent hosts casa-school.duckdns.org` |
| Không SSH vào được | Bảng điều khiển InterData → Enduser Panel (Virtualizor) → mở màn hình máy (VNC) |
| Sao lưu đêm qua không có | `tail -50 ~/backup-casa.log`, `crontab -l` |
| Đĩa sắp đầy | `df -h /`, `du -sh /var/lib/casa-mamnon/*`; ngưỡng cảnh báo có sẵn trong `npm run kiem-tra-may-chu` |
| Bộ canh máy báo gì, lượt gần nhất ra sao | `journalctl -u casa-canh-may -n 30 --no-pager`; `systemctl list-timers casa-canh-may.timer` (cài ở `docs/DUA-VAO-DUNG.md`, mục A6) |
| Cập nhật vừa tự quay lui | Đọc 30 dòng nhật ký script in ra; `sudo journalctl -u casa-mamnon -n 100 --no-pager`; `git log --oneline -3` để biết đang chạy bản nào |
| Video lại nén trên điện thoại (mờ), hay cô báo "máy chủ chưa làm nét được" | `ffmpeg -version`; `sudo journalctl -u casa-mamnon -n 200 --no-pager \| grep nen-video` — xem mục 7 |

---

## 7. Nén video trên máy chủ (Đ260f, 25/11/2026)

Từ đợt này, khi cô đăng video ở **Album** hay **Hình ảnh ghi nhanh**, điện thoại
gửi **nguyên tệp gốc** lên máy chủ (từng phần 4 MB), máy chủ nén lại bằng
**ffmpeg** thành MP4 H.264 720p (cạnh ngắn 720, AAC 96 kbps, kèm ảnh bìa cho ô
lưới album). Lý do: bản nén ngay trên iPhone rất mờ (Safari bỏ qua bitrate).

Cài một lần:

```bash
sudo apt install -y ffmpeg
ffmpeg -version | head -1      # phải in ra "ffmpeg version 6.x ..."
ffprobe -version | head -1
sudo systemctl restart casa-mamnon   # app dò ffmpeg MỘT lần lúc khởi động
```

**Không có ffmpeg thì app vẫn chạy y như cũ**: màn hình tự quay về nén video
ngay trên điện thoại (đường trước Đ260f). Nhật ký dịch vụ khi đó có một dòng
`[nen-video] Máy chủ chưa có ffmpeg …`. Cài ffmpeg rồi khởi động lại là xong,
không cần đổi gì khác.

Ghi nhớ khi vận hành:

- **Thư mục tạm:** `/var/lib/casa-mamnon/video-tam/` giữ tệp gốc đang gửi và bản
  nén chưa đăng. Đồng hồ định giờ xoá lượt dở / bản nén không ai dùng sau 24
  giờ. Mỗi cô tối đa 3 lượt dở, mỗi tệp gốc tối đa 500 MB — lúc đông nhất thư
  mục này có thể chiếm vài GB; soát cùng lúc với `df -h /`.
- **CPU:** tối đa 2 video nén cùng lúc, chạy `nice -n 10` (máy chủ trả lời cô
  và gia đình trước). Một đoạn 1 phút nén mất vài giây trên máy 12 nhân; mỗi
  video quá 10 phút thì bị dừng và cô nhận lời báo gửi lại.
- **Video đã nén** nằm trong `uploads/` như mọi ảnh, video khác (trần 120 MB mỗi
  tệp, ~6 phút rưỡi), nên đi theo sao lưu như cũ. Tệp gốc không bao giờ được
  phục vụ ra ngoài và không vào sao lưu.
- Khởi động lại app giữa lúc cô đang gửi: lượt đó báo "Máy chủ vừa khởi động lại
  giữa chừng — cô gửi lại video giúp nhé".
