# Triển khai CASA Mầm non lên máy chủ thật

Đây là tài liệu triển khai **của app 2**. Hai tệp `CAP-NHAT-MAY-CHU.md` và
`MAY-CHU-THU-ORACLE.md` là của **app 1** (SchoolConnect, trường tiểu học, đang
chạy thật) — chúng vẫn đúng cho app 1 và không được sửa theo app 2.

---

## Đọc phần này trước, đừng bỏ qua

**Chưa chọn xong máy chủ thì chưa triển khai được, và điều đó là cố ý.**

Dữ liệu ở app này là thông tin trẻ **12 tháng – 6 tuổi**, kèm **ảnh khuôn mặt**
và **hồ sơ sức khoẻ** — nhóm dữ liệu nhạy cảm theo Nghị định 13/2023/NĐ-CP và
Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15. Hai hệ quả:

1. **Máy chủ phải đặt tại Việt Nam.** Không phải vì luật cấm hẳn việc đặt ở
   nước ngoài, mà vì đặt ngoài thì kéo theo thủ tục chuyển dữ liệu xuyên biên
   giới — hồ sơ, đăng ký, và trách nhiệm mà trường chưa làm và không nên phải
   làm chỉ để chạy một sổ liên lạc.
2. **Tên miền và tài khoản máy chủ phải đứng tên trường**, không phải tên cá
   nhân của ai. Người làm phần mềm nghỉ việc thì trường vẫn phải vào được.

`render.yaml` trong kho này **chỉ để chạy thử với dữ liệu giả** — Render không
có vùng máy nào ở Việt Nam. Chính tệp đó mở đầu bằng lời cảnh báo, và có bài
test canh để lời cảnh báo không bị gỡ đi.

> **Mục N7 của `docs/TIEN-DO.md` đang chờ nhà trường:** đăng ký VPS trong nước
> và một tên miền. Khoảng 3–6 triệu đồng một năm cho cả hai app. Chưa có hai
> thứ đó thì phần lệnh cụ thể bên dưới (địa chỉ máy, tên miền, chứng chỉ HTTPS)
> chưa viết ra được, vì viết ra cũng chỉ là đoán.

---

## Phần KHÔNG phụ thuộc vào chọn máy chủ nào

Bốn mục dưới đây đúng với mọi VPS Linux, và cũng đúng nếu trường chạy trên một
máy tính để bàn trong phòng hành chính.

### 1. Thư mục dữ liệu phải nằm NGOÀI kho mã

```bash
sudo mkdir -p /var/lib/casa-mamnon
sudo chown "$USER" /var/lib/casa-mamnon
```

Rồi mọi lệnh đều chạy kèm `DATA_DIR=/var/lib/casa-mamnon`.

**Vì sao đây là mục số 1, không phải mục cuối:** mặc định `DATA_DIR` là `./data`
nằm ngay trong kho mã. Để nguyên là ảnh khuôn mặt trẻ và cơ sở dữ liệu nằm cạnh
mã nguồn — chỉ cần một lần `git add -A` sơ ý là hồ sơ trẻ lên GitHub, và **lộ
rồi thì viết lại lịch sử git cũng không thu lại được**.

Máy chủ tự canh chỗ này: chạy với `NODE_ENV=production` mà dữ liệu vẫn nằm
trong kho mã thì nó **DỪNG trước khi mở cổng**, không chỉ ghi một dòng log.

### 2. Tạo tài khoản quản trị TRƯỚC khi bật dịch vụ

```bash
DATA_DIR=/var/lib/casa-mamnon npm run create-admin "Nguyễn Văn Hiệu" hieutruong
```

Lệnh in ra một mật khẩu tạm — ghi lại, lần đăng nhập đầu app bắt đổi ngay.

**Vì sao phải làm trước:** với `NODE_ENV=production`, cơ sở dữ liệu trống thì
máy chủ **dừng có chủ ý** thay vì tự sinh dữ liệu mẫu. Dữ liệu mẫu kèm
13 tài khoản dùng chung mật khẩu `123456`; sinh chúng ra trên một máy đang mở ra
Internet là tự mở cửa cho người lạ.

Đó cũng là lý do đừng đi đường tắt *"tạm bỏ NODE_ENV=production cho nó lên đã"*.

### 3. Sao lưu phải chạy được TRƯỚC khi có dữ liệu thật

```bash
DATA_DIR=/var/lib/casa-mamnon npm run backup
DATA_DIR=/var/lib/casa-mamnon npm run backup:list
```

Rồi đặt lịch chạy hằng ngày (cron hoặc systemd timer).

**Hai điều dễ làm sai, cả hai đều chỉ lộ ra vào lúc tệ nhất:**

- **Bản sao nằm cùng ổ đĩa với dữ liệu gốc thì không phải là bản sao.** Ổ hỏng
  là mất cả hai cùng lúc. Chạy thêm một lần nữa ra nơi khác:
  `npm run backup -- --out /mnt/o-cung-ngoai/casa-mamnon`, hoặc đặt lịch đồng
  bộ thư mục `backups` ra ổ ngoài / dịch vụ lưu trữ. Script tự in cảnh báo khi
  phát hiện hai chỗ nằm cùng ổ.
- **Ảnh chiếm chỗ, không phải chữ.** Bản kế hoạch dự trù 80–160 GB ảnh cho ba
  cơ sở; bản sao ảnh nằm cùng ổ nên phải cộng thêm phần của nó. Tính dung lượng
  theo con số đó, đừng theo dung lượng cơ sở dữ liệu.

Và **thử khôi phục ít nhất một lần** trước khi trường dùng thật. Một bản sao
chưa từng khôi phục thử là một bản sao chưa biết có dùng được không:

```bash
DATA_DIR=/var/lib/casa-mamnon npm run restore:check
```

`restore.js` từ chối chạy khi máy chủ đang chạy — cố ý, vì khôi phục trong lúc
máy chủ đang ghi là hỏng dữ liệu âm thầm.

### 4. Soát máy chủ sau mỗi lần cập nhật

```bash
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu
```

Nó soát: cơ sở dữ liệu mở được không, **còn tài khoản nào dùng mật khẩu mẫu
không**, thư mục dữ liệu nằm đúng chỗ chưa, bảng phân công cô có khớp không.

---

## Quy trình cập nhật mã (khi đã có máy chủ)

Thứ tự dưới đây quan trọng hơn từng lệnh riêng lẻ:

```bash
# 1. Sao lưu TRƯỚC, luôn luôn
DATA_DIR=/var/lib/casa-mamnon npm run backup

# 2. Lấy mã mới
git pull

# 3. Cài phụ thuộc nếu package.json đổi
npm install --omit=dev

# 4. Chạy bộ kiểm thử trên chính máy đó
npm test

# 5. Khởi động lại dịch vụ
#    (lệnh cụ thể tuỳ cách cài — systemd, pm2, docker)

# 6. Soát lại
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu
```

**Khởi động lại HAI LẦN liên tiếp và kiểm cả hai lần đều lên được.** Đây là
phép thử cho lược đồ dữ liệu: một câu `ALTER TABLE` viết sai thì lần đầu chạy
được, **lần thứ hai mới chết**.

---

## Docker

`Dockerfile` trong kho dựng trên `node:22-bookworm-slim`.

**Đừng đổi sang alpine.** Alpine dùng thư viện C là musl, còn `better-sqlite3`
chỉ phát hành bản dựng sẵn cho glibc — trên alpine nó phải tự biên dịch lại từ
mã C++, mà ảnh alpine của Node không có sẵn `python3`, `make`, `g++`. Lệnh build
gãy ngay bước cài, và gãy ở chỗ khó đọc. Có bài test canh chỗ này.

Vẫn phải tạo tài khoản quản trị trước, trên chính ổ đĩa sẽ gắn vào:

```bash
docker run --rm -v casa-data:/data <tên-ảnh> \
  npm run create-admin "Nguyễn Văn Hiệu" hieutruong
```

---

## HAI KỊCH BẢN — viết sẵn cả hai, chốt xong thì xoá nửa không dùng

Bản trước của tệp này để trống toàn bộ phần triển khai với lý do *"chờ nhà
trường chốt N7, viết trước là đoán"*. Đúng một nửa: **tên miền và địa chỉ máy
chủ** thì đúng là phải chờ. Nhưng **quy trình** thì không — chỉ có đúng hai
kịch bản, cả hai đều biết trước được, và chờ tới lúc chốt mới viết là để nhà
trường phải chờ thêm một buổi nữa ở đúng lúc họ muốn đi nhanh nhất.

Nên cả hai được viết sẵn ở đây. **Chốt xong thì XOÁ HẲN nửa không dùng** — hai
quy trình cùng nằm trong một tệp là chỗ người vận hành làm lẫn bước của kịch bản
kia, và đó là kiểu lẫn không ai phát hiện cho tới lúc chữa cháy.

Chỗ nào cần nhà trường điền, ghi rõ `<…>`.

---

### [A] VPS đặt tại Việt Nam — hướng dùng được với trẻ thật

Đây là hướng `docs/KE-HOACH.md` chọn, và là hướng duy nhất giữ được dữ liệu trẻ
trong nước theo Nghị định 13/2023.

```bash
# 1. Trên máy chủ mới, tạo thư mục dữ liệu NGOÀI kho mã
sudo mkdir -p /var/lib/casa-mamnon
sudo chown -R $USER:$USER /var/lib/casa-mamnon

# 2. Lấy mã về
# LẤY ĐÚNG NHÁNH. Nhánh mặc định `main` đang LÙI RẤT XA so với nhánh đang
# làm: clone theo mặc định sẽ ra một bản THIẾU SÁU PHÂN HỆ (Đón trả bé, Hành
# trình, Kế hoạch của bé, Báo cáo học tập, Cambridge, Tiền ăn), và còn nguyên
# mấy lỗ đã vá — trong đó có lỗ tải được mã máy chủ khi chưa đăng nhập.
git clone -b claude/g0-4-multi-teacher-group-yq1n9e <đường-dẫn-kho-mã> /opt/casa-mamnon
cd /opt/casa-mamnon
npm ci --omit=dev

# 3. TẠO TÀI KHOẢN QUẢN TRỊ TRƯỚC KHI BẬT DỊCH VỤ
#    Bước này KHÔNG được đảo xuống sau: xem mục 2 ở trên.
DATA_DIR=/var/lib/casa-mamnon npm run create-admin -- "<họ tên hiệu trưởng>" <tên đăng nhập>
#    → in ra mật khẩu tạm MỘT LẦN. Chép lại.

# 4. Thử sao lưu và KHÔI PHỤC THỬ, trước khi có dữ liệu thật
DATA_DIR=/var/lib/casa-mamnon npm run backup
DATA_DIR=/var/lib/casa-mamnon npm run restore:check

# 5. Dựng dịch vụ tự bật lại
sudo tee /etc/systemd/system/casa-mamnon.service >/dev/null <<'UNIT'
[Unit]
Description=CASA Mam non
After=network.target

[Service]
Type=simple
User=<người-chạy>
WorkingDirectory=/opt/casa-mamnon
Environment=NODE_ENV=production
Environment=DATA_DIR=/var/lib/casa-mamnon
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now casa-mamnon

# 6. Sao lưu hằng đêm + MỘT BẢN RA Ổ NGOÀI
#    Bản ra ổ ngoài là bản cứu được khi ổ máy chủ hỏng. Xem docs/SAO-LUU.md.
crontab -e
# 0 2 * * * cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js >> /var/lib/casa-mamnon/backup.log 2>&1
# 0 3 * * 0 cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js --out <ổ-ngoài> >> /var/lib/casa-mamnon/backup.log 2>&1

# 7. Soát lại — MỘT LẦN NGAY BÂY GIỜ, VÀ MỖI TUẦN MỘT LẦN SAU ĐÓ
#
#    Chạy tay lúc này để biết máy vừa dựng đã đúng chưa. Nhưng thứ bộ soát này
#    bắt được — lịch sao lưu ngừng chạy, bản sao mới nhất đã 3 ngày tuổi, ổ đĩa
#    sắp đầy, chứng chỉ HTTPS sắp hết hạn — đều là những thứ HỎNG DẦN trong im
#    lặng nhiều tuần sau ngày cài. Không đặt lịch thì nó chỉ soát đúng cái ngày
#    mà mọi thứ chắc chắn đang tốt.
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu

crontab -e
# 0 7 * * 1 cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/kiem-tra-may-chu.js >> /var/lib/casa-mamnon/soat-may-chu.log 2>&1
```

**Đọc kết quả soát ở đâu.** Dòng cron trên ghi vào
`/var/lib/casa-mamnon/soat-may-chu.log`, cùng thư mục với `backup.log` — thư
mục mà bước 1 đã cấp quyền ghi cho tài khoản chạy dịch vụ. Sáng thứ Hai mở tệp
đó ra xem có dòng `CẦN SỬA` nào không:

```bash
grep "CẦN SỬA" /var/lib/casa-mamnon/soat-may-chu.log | tail -20
```

**HTTPS** đặt trước app bằng nginx + certbot cho `<tên miền của trường>`. Không
có HTTPS thì app không cài được lên màn hình chính và không mở được lúc mất
mạng — xem mục 1 của `docs/PHEP-THU-DIEN-THOAI.md`.

---

### [B] Render — chỉ để chạy thử, KHÔNG dùng với dữ liệu trẻ thật

`render.yaml` đã ghi rõ ở đầu tệp: máy Render đặt ngoài Việt Nam.

**Lần triển khai đầu tiên là một vòng kẹt, và nó có thật.** Ổ đĩa mới là ổ
trống; với `NODE_ENV=production`, máy chủ DỪNG có chủ ý khi cơ sở dữ liệu trống
thay vì tự sinh dữ liệu mẫu — vì dữ liệu mẫu kèm 13 tài khoản dùng chung mật
khẩu "123456". Đó là hành vi ĐÚNG. Nhưng Shell của Render chỉ mở được khi dịch
vụ đang chạy, nên: dịch vụ không chạy vì chưa có tài khoản quản trị → không mở
được Shell để tạo tài khoản quản trị.

**ĐỪNG đi đường tắt "tạm bỏ `NODE_ENV=production` cho nó lên đã".** Làm vậy là
dựng 13 tài khoản mật khẩu "123456" trên một địa chỉ công khai, kèm hồ sơ trẻ.

Đường ra, làm theo đúng thứ tự:

1. Tạo dịch vụ và ổ đĩa theo `render.yaml`, **nhưng chưa bấm deploy**.
2. Dùng **Render Job** gắn cùng ổ đĩa đó, chạy đúng một lần:
   `DATA_DIR=/data npm run create-admin -- "<họ tên>" <tên đăng nhập>`
   Chép lại mật khẩu tạm từ log của Job.
3. Giờ mới deploy dịch vụ web. Cơ sở dữ liệu đã có tài khoản quản trị nên máy
   chủ khởi động bình thường.
4. `npm run kiem-tra-may-chu` qua Shell để soát lại.

> **Chưa ai đi hết đường này một lần nào.** Bước 2 là điểm chưa thử. Thử trước
> khi hẹn với nhà trường, đừng thử lần đầu vào hôm có người ngồi chờ.

Muốn xem app chạy mà không cần vòng kẹt trên: dùng `npm run ban-thu` trên máy
của mình (xem `docs/PHEP-THU-DIEN-THOAI.md`).

---

## Còn thiếu gì trong tài liệu này

Ghi ra đây thay vì để người đọc tự phát hiện:

| Phần | Vì sao chưa viết |
|---|---|
| Tên miền, địa chỉ IP, chứng chỉ HTTPS cụ thể | Chờ N7 — nhà trường chưa đăng ký. Đây là chỗ **thật sự** phải chờ, khác với quy trình ở trên |
| Bước 2 của kịch bản [B] (Render Job) | Viết ra rồi nhưng **chưa ai chạy thử lần nào** |
| Hồ sơ đánh giá tác động theo Điều 24 NĐ 13/2023 | Cần phần mô tả kỹ thuật viết cùng nhà trường, chưa làm |
