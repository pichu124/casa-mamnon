# Chạy bản thử CASA Mầm non trên máy Oracle đã dựng cho app 1

Tài liệu này viết cho **đúng cái máy** đã dựng theo `docs/MAY-CHU-THU-ORACLE.md`
ngày 20/08/2026: người dùng `ubuntu`, Node 22 và Caddy đã cài, tên miền
`casa-school.duckdns.org` đang trỏ về máy. Làm theo đây là **tắt app 1 và chạy
app 2 thay vào**, dùng lại cổng 3000 và khối Caddy có sẵn. Mã và dữ liệu của
app 1 nằm yên, quay lại được bằng hai lệnh ở cuối tệp.

> ## ⛔ Máy này ở nước ngoài — chỉ dữ liệu mẫu, tuyệt đối không nhập trẻ thật
>
> Oracle không có vùng máy ở Việt Nam. Dữ liệu ở app này là ảnh khuôn mặt và hồ
> sơ sức khoẻ của trẻ 12 tháng – 6 tuổi, nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP.
> Đưa nó ra ngoài là thủ tục chuyển dữ liệu xuyên biên giới mà trường không nên
> phải làm chỉ để chạy thử. Máy này là **bàn thử sống lâu hơn cái đường hầm
> cloudflared**, không phải bước đầu của máy chủ thật. Máy chủ thật là mục N7 của
> `docs/TIEN-DO.md`: VPS trong nước, tên miền đứng tên trường, làm theo
> `docs/TRIEN-KHAI.md`.

Ba điều trước khi bắt đầu:

- **Dán mỗi lần một dòng** vào PowerShell, chờ dấu `$` hiện lại rồi mới dán dòng
  tiếp. Dán cả khối là lỗi im lặng — lần dựng app 1 đã vấp thật: lệnh `cd` bị
  cắt cụt, các lệnh mở cổng không chạy, mãi tới lúc xin chứng chỉ mới lần ra.
- Nếu máy Oracle đã bị xoá (mục "Xoá máy khi xong" của tài liệu cũ), dựng lại
  theo giai đoạn 1 đến 5 của `docs/MAY-CHU-THU-ORACLE.md` rồi quay lại đây.
- Lệnh lấy mã bên dưới lấy **`main`**. Từ 07/10/2026 (pull request #2) việc làm
  xong được đưa vào `main` bằng pull request; nhánh làm việc là chỗ đang làm dở,
  không phải chỗ để cài. Máy đã cài TRƯỚC 07/10 thì đang đứng ở nhánh làm việc —
  chuyển sang `main` một lần theo Bước 10.

---

## Phần 0. Nếu phải dựng lại máy Oracle từ đầu

Chỉ cần khi máy cũ đã bị xoá. Máy còn thì bỏ qua, sang Phần 1. Đây là bản rút
gọn của giai đoạn 1–8 trong `docs/MAY-CHU-THU-ORACLE.md`, giữ lại đúng những
chỗ đã vấp thật; gặp gì lạ thì mở tài liệu đó ra đọc phần tương ứng.

### 0.1 Tài khoản

Vào https://www.oracle.com/cloud/free/ → **Start for free** (đừng đi qua menu
Cloud → Compute trên trang chủ, đó là trang quảng cáo). **Home Region: chọn
`Singapore (ap-singapore-1)`** — không đổi được về sau, chọn sai là xoá tài
khoản làm lại. Nhập thẻ để xác minh (nên dùng thẻ ảo hạn mức thấp). Từ đây làm
việc ở https://cloud.oracle.com.

### 0.2 Tạo mạng TRƯỚC khi tạo máy

Menu ☰ → **Networking → Virtual cloud networks → Start VCN Wizard → VCN with
Internet Connectivity**, tên `vcn-school`, các ô CIDR để mặc định. Kiểm lại: tab
**Subnets** có `public subnet-vcn-school` ghi *Public (Regional)*; tab
**Gateways** có Internet gateway *Available*. Tạo mạng ngay trong lúc tạo máy
thì nút Public IPv4 bị khoá, đó là chỗ vấp đầu tiên lần trước.

### 0.3 Tạo máy ảo

Menu ☰ → **Compute → Instances → Create instance**:

- **Change image** (không phải Change shape) → **Canonical Ubuntu 24.04**, bấm
  đúng nút tròn đầu dòng; phải thấy dòng *Operating system: Canonical Ubuntu
  24.04* mới đi tiếp.
- Cỡ máy, theo thứ tự: `VM.Standard.A1.Flex` (tab Ampere, 1 OCPU / 6 GB, miễn
  phí) → `VM.Standard.E2.1.Micro` (miễn phí, 1 GB, cần swap ở bước 4) →
  `VM.Standard.E5.Flex` (trả phí, chỉ khi hai loại trên hết máy). Gặp *Out of
  capacity* là chuyện thường: bấm Create lại 4–5 lần cách nhau một phút, hoặc
  thử vào sáng sớm giờ Việt Nam.
- Mạng: **Select existing VCN** → `vcn-school`, subnet **public**, **Assign a
  public IPv4 address: ON**.
- Khoá SSH: **Generate a key pair for me → Download private key**. Mở thư mục
  kiểm tra tệp `.key` có thật rồi mới bấm **Create** — khoá chỉ tải được một
  lần, đóng trang là mất vĩnh viễn.

Chờ trạng thái **RUNNING**, vào tab Details ghi lại **Public IP address**.

### 0.4 Mở cổng lớp 1 (trên web)

**Networking → Virtual cloud networks → vcn-school → Security → Default Security
List → Add Ingress Rules**: Source CIDR `0.0.0.0/0`, TCP, Destination Port Range
`80,443`. Oracle chặn ở hai lớp độc lập; thiếu một lớp là trang không vào được
mà không có thông báo lỗi nào.

### 0.5 Vào máy và dựng nền

Vào máy bằng lệnh ở **Bước 1** bên dưới, rồi gõ từng dòng:

```bash
# Múi giờ — làm trước tiên
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Mở cổng lớp 2 (ảnh Ubuntu của Oracle chặn mọi thứ trừ 22)
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/node.sh
sudo bash /tmp/node.sh
sudo apt-get install -y nodejs
node -v      # phải ra v22.x

# Caddy
sudo apt install -y apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 0.6 Tên miền và Caddy

Vào https://www.duckdns.org (đăng nhập Google/GitHub), tạo subdomain
`casa-school` (hoặc tên khác) trỏ về Public IP vừa ghi. Trên máy chủ kiểm:
`getent hosts casa-school.duckdns.org` phải in ra đúng IP. Rồi:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'CADDY'
casa-school.duckdns.org {
    reverse_proxy localhost:3000
}
CADDY
sudo systemctl restart caddy
```

Caddy tự xin chứng chỉ HTTPS khi có yêu cầu đầu tiên; kiểm ở **Bước 7** sau khi
app đã chạy. Nếu `curl -I` không ra 200, xem `sudo journalctl -u caddy -n 30
--no-pager` — gần như luôn là cổng 80/443 chưa mở ở một trong hai lớp.

Xong Phần 0 thì sang Phần 1. Ở máy mới không có app 1 nên **Bước 2 bỏ qua**.

---

## Phần 1. Vào máy và tắt app 1

### Bước 1. Vào máy từ Windows

PowerShell, sửa đường dẫn tệp khoá và địa chỉ IP cho đúng máy của mình:

```powershell
$key = "D:\duong-dan\ssh-key-2026-08-20.key"
icacls.exe $key /reset
icacls.exe $key /grant:r "$($env:USERNAME):(R)"
icacls.exe $key /inheritance:r
ssh -i $key ubuntu@<PUBLIC-IP>
```

| Lỗi | Nguyên nhân |
|---|---|
| `UNPROTECTED PRIVATE KEY FILE` | Chưa chạy ba lệnh `icacls`, hoặc đường dẫn `$key` sai |
| `Connection timed out` | Gõ nhầm IP, hoặc máy chưa RUNNING trên cloud.oracle.com |

### Bước 2. Tắt app 1, giữ nguyên dữ liệu của nó

```bash
sudo systemctl disable --now schoolconnect
sudo systemctl status schoolconnect --no-pager | head -3     # phải thấy inactive
```

Thư mục `/opt/schoolconnect` và `/var/lib/schoolconnect` **không đụng tới**.

### Bước 3. Xác nhận nền có sẵn

```bash
node -v                          # phải ra v22.x
systemctl is-active caddy        # phải ra active
timedatectl | grep "Time zone"   # phải là Asia/Ho_Chi_Minh
```

Thiếu cái nào thì cài theo giai đoạn 6 và 8 của `docs/MAY-CHU-THU-ORACLE.md`.

---

## Phần 2. Cài app 2

### Bước 4. Lấy mã về, thư mục riêng

```bash
sudo git clone https://github.com/pichu124/casa-mamnon.git /opt/casa-mamnon
sudo chown -R ubuntu:ubuntu /opt/casa-mamnon
cd /opt/casa-mamnon
npm ci --omit=dev
```

Máy 1 GB RAM (shape E2.1.Micro) mà `npm ci` chết giữa chừng thì bật vùng nhớ
đệm rồi chạy lại:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Bước 5. Dựng dữ liệu thử

Một lệnh làm hết: sinh dữ liệu mẫu (11 bé, 4 nhóm, 3 cơ sở), bật đủ tám phân
hệ mầm non, đổi mật khẩu 13 tài khoản mẫu sang mật khẩu mới, tạo tài khoản quản
trị `hieutruong`.

```bash
sudo mkdir -p /var/lib/casa-mamnon && sudo chown ubuntu:ubuntu /var/lib/casa-mamnon
npm run ban-thu -- --khong-chay --thu-muc /var/lib/casa-mamnon
```

Nó in bảng tài khoản và mật khẩu **một lần duy nhất** — chép lại trước khi làm
gì tiếp. Phần nó nhắc về `cloudflared` thì bỏ qua: ở máy này Caddy đã lo HTTPS.

> Vì sao không `node data/seed.js` rồi `create-admin` như lần dựng app 1: app 2
> ở chế độ production **cố ý dừng** nếu còn tài khoản dùng mật khẩu mẫu
> `123456`, và chín phân hệ mầm non **bật sẵn** (Đ146) — hai thứ bàn thử đã lo, làm tay
> thì hay sót.

### Bước 6. Dịch vụ tự bật lại

Dùng lại cổng 3000 của app 1 để không phải sửa Caddy:

```bash
sudo tee /etc/systemd/system/casa-mamnon.service >/dev/null <<'UNIT'
[Unit]
Description=CASA Mam non (ban thu)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/casa-mamnon
ExecStart=/usr/bin/node server.js
Environment=DATA_DIR=/var/lib/casa-mamnon
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=FORCE_HTTPS=1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now casa-mamnon
sudo journalctl -u casa-mamnon -n 20 --no-pager
```

Dòng cuối phải thấy *"CASA Mầm non đang chạy tại"*. Nếu thấy máy chủ dừng và
nhắc *"tạo tài khoản quản trị"* hoặc *"mật khẩu mẫu"*: bước 5 chưa chạy xong,
hoặc `--thu-muc` ở bước 5 gõ khác đường với `DATA_DIR` ở đây.

**Giữ nguyên `TRUST_PROXY` mặc định.** Có Caddy đứng trước nên app lấy đúng địa
chỉ thật của người dùng; đặt `TRUST_PROXY=0` ở máy này là một người gõ sai mật
khẩu 8 lần khoá luôn cả trường.

### Bước 7. Tên miền và HTTPS

Caddy vẫn trỏ `casa-school.duckdns.org` về cổng 3000, không phải sửa gì:

```bash
sudo systemctl restart caddy
curl -I https://casa-school.duckdns.org/healthz      # phải ra HTTP/2 200
```

Muốn tên miền mang tên mầm non: tạo thêm một subdomain trên duckdns.org trỏ cùng
IP, sửa tên ở dòng đầu khối trong `/etc/caddy/Caddyfile`, `sudo systemctl
restart caddy`, rồi kiểm lại bằng `curl -I` như trên với tên mới.

### Bước 8. Thử trên điện thoại

Mở `https://casa-school.duckdns.org`, đăng nhập `hieutruong` với mật khẩu bước 5
in ra — nó buộc đổi mật khẩu ngay. Sau đó thử:

| Tài khoản | Vai | Xem gì |
|---|---|---|
| `giaovien` | cô nhóm Chồi 2 | Nhật ký ngày, Ghi nhanh, Đón trả bé |
| `giaovien4` | cô nhóm Nhà trẻ 1 | có ô thay bỉm, bú bình |
| `phuhuynh` | mẹ của bé An (Chồi 2) và bé Ngọc (Lá 1) | nhà hai con ở hai nhóm |
| `vanphong1` | Văn phòng Cơ sở 1 | chỉ thấy bé của cơ sở 1 |

Cài app lên màn hình chính, tắt Wi-Fi rồi mở lại app để thử lúc mất mạng. Cách
đo và chỗ ghi kết quả: `docs/PHEP-THU-DIEN-THOAI.md`. **Chỉ chụp đồ vật, không
chụp mặt bé.**

---

## Phần 3. Giữ máy sống và cập nhật

### Cập nhật nhanh khi có bản mới — hai cửa sổ, sáu dòng

Đây là bản rút gọn cho những lần sau, khi máy đã dựng xong. Cả quy trình mất
chừng hai phút.

**Cửa sổ 1 — PowerShell trên Windows, để vào máy:**

```powershell
$key = "<đường dẫn tới tệp .key đã tải khi tạo máy>"
ssh -i $key ubuntu@<PUBLIC-IP>
```

Ba lệnh `icacls` ở Bước 1 chỉ cần làm **một lần đầu**; từ lần thứ hai chỉ cần
hai dòng trên. Gặp `UNPROTECTED PRIVATE KEY FILE` thì mới chạy lại ba lệnh đó.
Thấy dấu nhắc `ubuntu@instance-…:~# Chạy bản thử CASA Mầm non trên máy Oracle đã dựng cho app 1

Tài liệu này viết cho **đúng cái máy** đã dựng theo `docs/MAY-CHU-THU-ORACLE.md`
ngày 20/08/2026: người dùng `ubuntu`, Node 22 và Caddy đã cài, tên miền
`casa-school.duckdns.org` đang trỏ về máy. Làm theo đây là **tắt app 1 và chạy
app 2 thay vào**, dùng lại cổng 3000 và khối Caddy có sẵn. Mã và dữ liệu của
app 1 nằm yên, quay lại được bằng hai lệnh ở cuối tệp.

> ## ⛔ Máy này ở nước ngoài — chỉ dữ liệu mẫu, tuyệt đối không nhập trẻ thật
>
> Oracle không có vùng máy ở Việt Nam. Dữ liệu ở app này là ảnh khuôn mặt và hồ
> sơ sức khoẻ của trẻ 12 tháng – 6 tuổi, nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP.
> Đưa nó ra ngoài là thủ tục chuyển dữ liệu xuyên biên giới mà trường không nên
> phải làm chỉ để chạy thử. Máy này là **bàn thử sống lâu hơn cái đường hầm
> cloudflared**, không phải bước đầu của máy chủ thật. Máy chủ thật là mục N7 của
> `docs/TIEN-DO.md`: VPS trong nước, tên miền đứng tên trường, làm theo
> `docs/TRIEN-KHAI.md`.

Ba điều trước khi bắt đầu:

- **Dán mỗi lần một dòng** vào PowerShell, chờ dấu `$` hiện lại rồi mới dán dòng
  tiếp. Dán cả khối là lỗi im lặng — lần dựng app 1 đã vấp thật: lệnh `cd` bị
  cắt cụt, các lệnh mở cổng không chạy, mãi tới lúc xin chứng chỉ mới lần ra.
- Nếu máy Oracle đã bị xoá (mục "Xoá máy khi xong" của tài liệu cũ), dựng lại
  theo giai đoạn 1 đến 5 của `docs/MAY-CHU-THU-ORACLE.md` rồi quay lại đây.
- Lệnh lấy mã bên dưới lấy **`main`**. Từ 07/10/2026 (pull request #2) việc làm
  xong được đưa vào `main` bằng pull request; nhánh làm việc là chỗ đang làm dở,
  không phải chỗ để cài. Máy đã cài TRƯỚC 07/10 thì đang đứng ở nhánh làm việc —
  chuyển sang `main` một lần theo Bước 10.

---

## Phần 0. Nếu phải dựng lại máy Oracle từ đầu

Chỉ cần khi máy cũ đã bị xoá. Máy còn thì bỏ qua, sang Phần 1. Đây là bản rút
gọn của giai đoạn 1–8 trong `docs/MAY-CHU-THU-ORACLE.md`, giữ lại đúng những
chỗ đã vấp thật; gặp gì lạ thì mở tài liệu đó ra đọc phần tương ứng.

### 0.1 Tài khoản

Vào https://www.oracle.com/cloud/free/ → **Start for free** (đừng đi qua menu
Cloud → Compute trên trang chủ, đó là trang quảng cáo). **Home Region: chọn
`Singapore (ap-singapore-1)`** — không đổi được về sau, chọn sai là xoá tài
khoản làm lại. Nhập thẻ để xác minh (nên dùng thẻ ảo hạn mức thấp). Từ đây làm
việc ở https://cloud.oracle.com.

### 0.2 Tạo mạng TRƯỚC khi tạo máy

Menu ☰ → **Networking → Virtual cloud networks → Start VCN Wizard → VCN with
Internet Connectivity**, tên `vcn-school`, các ô CIDR để mặc định. Kiểm lại: tab
**Subnets** có `public subnet-vcn-school` ghi *Public (Regional)*; tab
**Gateways** có Internet gateway *Available*. Tạo mạng ngay trong lúc tạo máy
thì nút Public IPv4 bị khoá, đó là chỗ vấp đầu tiên lần trước.

### 0.3 Tạo máy ảo

Menu ☰ → **Compute → Instances → Create instance**:

- **Change image** (không phải Change shape) → **Canonical Ubuntu 24.04**, bấm
  đúng nút tròn đầu dòng; phải thấy dòng *Operating system: Canonical Ubuntu
  24.04* mới đi tiếp.
- Cỡ máy, theo thứ tự: `VM.Standard.A1.Flex` (tab Ampere, 1 OCPU / 6 GB, miễn
  phí) → `VM.Standard.E2.1.Micro` (miễn phí, 1 GB, cần swap ở bước 4) →
  `VM.Standard.E5.Flex` (trả phí, chỉ khi hai loại trên hết máy). Gặp *Out of
  capacity* là chuyện thường: bấm Create lại 4–5 lần cách nhau một phút, hoặc
  thử vào sáng sớm giờ Việt Nam.
- Mạng: **Select existing VCN** → `vcn-school`, subnet **public**, **Assign a
  public IPv4 address: ON**.
- Khoá SSH: **Generate a key pair for me → Download private key**. Mở thư mục
  kiểm tra tệp `.key` có thật rồi mới bấm **Create** — khoá chỉ tải được một
  lần, đóng trang là mất vĩnh viễn.

Chờ trạng thái **RUNNING**, vào tab Details ghi lại **Public IP address**.

### 0.4 Mở cổng lớp 1 (trên web)

**Networking → Virtual cloud networks → vcn-school → Security → Default Security
List → Add Ingress Rules**: Source CIDR `0.0.0.0/0`, TCP, Destination Port Range
`80,443`. Oracle chặn ở hai lớp độc lập; thiếu một lớp là trang không vào được
mà không có thông báo lỗi nào.

### 0.5 Vào máy và dựng nền

Vào máy bằng lệnh ở **Bước 1** bên dưới, rồi gõ từng dòng:

```bash
# Múi giờ — làm trước tiên
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Mở cổng lớp 2 (ảnh Ubuntu của Oracle chặn mọi thứ trừ 22)
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/node.sh
sudo bash /tmp/node.sh
sudo apt-get install -y nodejs
node -v      # phải ra v22.x

# Caddy
sudo apt install -y apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 0.6 Tên miền và Caddy

Vào https://www.duckdns.org (đăng nhập Google/GitHub), tạo subdomain
`casa-school` (hoặc tên khác) trỏ về Public IP vừa ghi. Trên máy chủ kiểm:
`getent hosts casa-school.duckdns.org` phải in ra đúng IP. Rồi:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'CADDY'
casa-school.duckdns.org {
    reverse_proxy localhost:3000
}
CADDY
sudo systemctl restart caddy
```

Caddy tự xin chứng chỉ HTTPS khi có yêu cầu đầu tiên; kiểm ở **Bước 7** sau khi
app đã chạy. Nếu `curl -I` không ra 200, xem `sudo journalctl -u caddy -n 30
--no-pager` — gần như luôn là cổng 80/443 chưa mở ở một trong hai lớp.

Xong Phần 0 thì sang Phần 1. Ở máy mới không có app 1 nên **Bước 2 bỏ qua**.

---

## Phần 1. Vào máy và tắt app 1

### Bước 1. Vào máy từ Windows

PowerShell, sửa đường dẫn tệp khoá và địa chỉ IP cho đúng máy của mình:

```powershell
$key = "D:\duong-dan\ssh-key-2026-08-20.key"
icacls.exe $key /reset
icacls.exe $key /grant:r "$($env:USERNAME):(R)"
icacls.exe $key /inheritance:r
ssh -i $key ubuntu@<PUBLIC-IP>
```

| Lỗi | Nguyên nhân |
|---|---|
| `UNPROTECTED PRIVATE KEY FILE` | Chưa chạy ba lệnh `icacls`, hoặc đường dẫn `$key` sai |
| `Connection timed out` | Gõ nhầm IP, hoặc máy chưa RUNNING trên cloud.oracle.com |

### Bước 2. Tắt app 1, giữ nguyên dữ liệu của nó

```bash
sudo systemctl disable --now schoolconnect
sudo systemctl status schoolconnect --no-pager | head -3     # phải thấy inactive
```

Thư mục `/opt/schoolconnect` và `/var/lib/schoolconnect` **không đụng tới**.

### Bước 3. Xác nhận nền có sẵn

```bash
node -v                          # phải ra v22.x
systemctl is-active caddy        # phải ra active
timedatectl | grep "Time zone"   # phải là Asia/Ho_Chi_Minh
```

Thiếu cái nào thì cài theo giai đoạn 6 và 8 của `docs/MAY-CHU-THU-ORACLE.md`.

---

## Phần 2. Cài app 2

### Bước 4. Lấy mã về, thư mục riêng

```bash
sudo git clone https://github.com/pichu124/casa-mamnon.git /opt/casa-mamnon
sudo chown -R ubuntu:ubuntu /opt/casa-mamnon
cd /opt/casa-mamnon
npm ci --omit=dev
```

Máy 1 GB RAM (shape E2.1.Micro) mà `npm ci` chết giữa chừng thì bật vùng nhớ
đệm rồi chạy lại:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Bước 5. Dựng dữ liệu thử

Một lệnh làm hết: sinh dữ liệu mẫu (11 bé, 4 nhóm, 3 cơ sở), bật đủ tám phân
hệ mầm non, đổi mật khẩu 13 tài khoản mẫu sang mật khẩu mới, tạo tài khoản quản
trị `hieutruong`.

```bash
sudo mkdir -p /var/lib/casa-mamnon && sudo chown ubuntu:ubuntu /var/lib/casa-mamnon
npm run ban-thu -- --khong-chay --thu-muc /var/lib/casa-mamnon
```

Nó in bảng tài khoản và mật khẩu **một lần duy nhất** — chép lại trước khi làm
gì tiếp. Phần nó nhắc về `cloudflared` thì bỏ qua: ở máy này Caddy đã lo HTTPS.

> Vì sao không `node data/seed.js` rồi `create-admin` như lần dựng app 1: app 2
> ở chế độ production **cố ý dừng** nếu còn tài khoản dùng mật khẩu mẫu
> `123456`, và chín phân hệ mầm non **bật sẵn** (Đ146) — hai thứ bàn thử đã lo, làm tay
> thì hay sót.

### Bước 6. Dịch vụ tự bật lại

Dùng lại cổng 3000 của app 1 để không phải sửa Caddy:

```bash
sudo tee /etc/systemd/system/casa-mamnon.service >/dev/null <<'UNIT'
[Unit]
Description=CASA Mam non (ban thu)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/casa-mamnon
ExecStart=/usr/bin/node server.js
Environment=DATA_DIR=/var/lib/casa-mamnon
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=FORCE_HTTPS=1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now casa-mamnon
sudo journalctl -u casa-mamnon -n 20 --no-pager
```

Dòng cuối phải thấy *"CASA Mầm non đang chạy tại"*. Nếu thấy máy chủ dừng và
nhắc *"tạo tài khoản quản trị"* hoặc *"mật khẩu mẫu"*: bước 5 chưa chạy xong,
hoặc `--thu-muc` ở bước 5 gõ khác đường với `DATA_DIR` ở đây.

**Giữ nguyên `TRUST_PROXY` mặc định.** Có Caddy đứng trước nên app lấy đúng địa
chỉ thật của người dùng; đặt `TRUST_PROXY=0` ở máy này là một người gõ sai mật
khẩu 8 lần khoá luôn cả trường.

### Bước 7. Tên miền và HTTPS

Caddy vẫn trỏ `casa-school.duckdns.org` về cổng 3000, không phải sửa gì:

```bash
sudo systemctl restart caddy
curl -I https://casa-school.duckdns.org/healthz      # phải ra HTTP/2 200
```

Muốn tên miền mang tên mầm non: tạo thêm một subdomain trên duckdns.org trỏ cùng
IP, sửa tên ở dòng đầu khối trong `/etc/caddy/Caddyfile`, `sudo systemctl
restart caddy`, rồi kiểm lại bằng `curl -I` như trên với tên mới.

### Bước 8. Thử trên điện thoại

Mở `https://casa-school.duckdns.org`, đăng nhập `hieutruong` với mật khẩu bước 5
in ra — nó buộc đổi mật khẩu ngay. Sau đó thử:

| Tài khoản | Vai | Xem gì |
|---|---|---|
| `giaovien` | cô nhóm Chồi 2 | Nhật ký ngày, Ghi nhanh, Đón trả bé |
| `giaovien4` | cô nhóm Nhà trẻ 1 | có ô thay bỉm, bú bình |
| `phuhuynh` | mẹ của bé An (Chồi 2) và bé Ngọc (Lá 1) | nhà hai con ở hai nhóm |
| `vanphong1` | Văn phòng Cơ sở 1 | chỉ thấy bé của cơ sở 1 |

Cài app lên màn hình chính, tắt Wi-Fi rồi mở lại app để thử lúc mất mạng. Cách
đo và chỗ ghi kết quả: `docs/PHEP-THU-DIEN-THOAI.md`. **Chỉ chụp đồ vật, không
chụp mặt bé.**

---

 là đã ở trong máy Oracle.

**Cửa sổ 2 — chính cửa sổ SSH đó, dán từng dòng:**

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup
git pull origin main
npm ci --omit=dev
sudo systemctl restart casa-mamnon
curl -I https://casa-school.duckdns.org/healthz
```

Dòng cuối ra `HTTP/2 200` là xong; gõ `exit` để đóng cửa sổ. Điện thoại đã
cài app sẽ thấy dải "Đã có bản mới" ở lần mở tiếp theo — bấm vào là lên bản
mới, không phải cài lại.

Mẹo: trong PowerShell bấm **mũi tên lên** để gọi lại dòng `$key = …` và dòng
`ssh` của lần trước, không phải gõ lại. Đường dẫn tệp khoá và địa chỉ IP là
của riêng máy mình: IP xem ở cloud.oracle.com → Compute → Instances, tệp khoá
là tệp `.key` đã tải về lúc tạo máy.


### Bước 9. Sao lưu và soát máy — một lần ngay bây giờ

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup
DATA_DIR=/var/lib/casa-mamnon npm run restore:check
DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu -- --ten-mien=casa-school.duckdns.org
```

**Luôn có `DATA_DIR=/var/lib/casa-mamnon` ở đầu** — với mọi lệnh `backup`,
`restore`, `kiem-tra-may-chu`, `create-admin`. Từ Đ234, quên nó trên máy này
thì lệnh **dừng ngay** với dòng *"⛔ THIẾU DATA_DIR"* và in sẵn lệnh gõ lại —
chép dòng đó chạy lại là xong. (Trước Đ234 lệnh không dừng mà lặng lẽ xem
thư mục `data/` trong kho mã và báo sai: "chưa có bản sao lưu nào", "không
thấy cơ sở dữ liệu".)

Lệnh soát in 8 mục kèm cách sửa cho từng mục hỏng. Với bàn thử, đặt lịch sao lưu
hằng đêm bằng cron là đủ:

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon npm run backup >> /home/ubuntu/backup-casa.log 2>&1") | crontab -
crontab -l
```

### Bước 10. Cập nhật khi `main` có bản mới

**Máy cài trước 07/10/2026 — làm MỘT lần trước khi cập nhật.** Những máy ấy
clone nhánh làm việc (`claude/code-review-optimization-at4jzk`). Xem máy đang ở
nhánh nào bằng `git -C /opt/casa-mamnon branch --show-current`; chưa phải `main`
thì chuyển một lần (dữ liệu nằm ở `/var/lib/casa-mamnon`, ngoài thư mục mã, nên không bị
đụng; lúc gộp 07/10 mã hai nhánh trùng nhau). Nhớ chạy `npm run backup` trước như mọi lần:

```bash
cd /opt/casa-mamnon
git fetch origin main
git checkout -B main origin/main
```

Từ đó về sau chỉ cần khối lệnh dưới đây.

```bash
cd /opt/casa-mamnon
DATA_DIR=/var/lib/casa-mamnon npm run backup
git pull origin main
npm ci --omit=dev
sudo systemctl restart casa-mamnon
curl -I https://casa-school.duckdns.org/healthz
```

Muốn chắc hơn thì chạy `npm test` trước khi restart (khoảng 12 phút, không cần
gói dev); có bài đỏ thì **dừng, đừng restart** — bản đang chạy vẫn tốt.

### Quay lại app 1

```bash
sudo systemctl disable --now casa-mamnon
sudo systemctl enable --now schoolconnect
```

Hai app dùng hai thư mục dữ liệu khác nhau, không đè lên nhau.

### Xoá máy khi xong

Nếu máy chạy shape trả phí (E4/E5.Flex), nó tiêu khoảng 1,9 USD/ngày từ tín dụng
dùng thử — làm theo mục "Xoá máy khi xong" của `docs/MAY-CHU-THU-ORACLE.md`.
Bàn thử có ảnh trong `/var/lib/casa-mamnon/uploads/`, xoá máy là hết.
