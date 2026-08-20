# Dựng máy chủ thử trên Oracle Cloud

Hướng dẫn này ghi lại **đúng những gì đã làm thật** ngày 20/08/2026 để dựng một
máy chủ SchoolConnect chạy được từ Internet, có HTTPS thật, trên gói dùng thử của
Oracle Cloud. Viết lại kèm mọi chỗ vấp, vì một hướng dẫn "sạch sẽ" sẽ bỏ qua đúng
những thứ tốn nhiều thời gian nhất.

> **Đây là máy chủ TẬP DƯỢT, không phải máy chủ thật của trường.**
> Chỉ dùng dữ liệu demo. Tuyệt đối không nhập danh sách học sinh thật lên máy này:
> gói miễn phí không có cam kết vận hành, không sao lưu, và có thể bị thu hồi bất
> cứ lúc nào. Khi triển khai thật cho trường, làm theo
> `docs/QUY-TRINH-TRIEN-KHAI.docx` với một VPS trả phí đặt tại Việt Nam.

Mục đích của việc tập dượt: làm quen trọn quy trình vận hành — systemd tự bật lại
khi app sập, Caddy tự xin HTTPS, sao lưu hằng đêm, kiểm tra sức khỏe máy chủ.
Ba thứ này giống hệt nhau trên mọi nhà cung cấp.

---

## Chuẩn bị

| Cần gì | Ghi chú |
|---|---|
| Thẻ Visa/MasterCard | Chỉ để xác minh danh tính. Nên dùng **thẻ ảo hạn mức thấp** (app ngân hàng nào cũng tạo được). Có thể bị tạm giữ ~1 USD rồi hoàn lại. |
| Máy Windows có PowerShell | Để SSH vào máy chủ. Windows 10/11 có sẵn, không cần cài PuTTY. |
| Khoảng 1 tiếng | Lần đầu. Lần sau chừng 20 phút. |

**Quy tắc quan trọng nhất về tiền:** đừng bao giờ bấm nút **Upgrade** ở băng vàng
đầu trang, kể cả khi Oracle gửi email mời. Chừng nào chưa bấm, tài khoản không có
đường nào để tính tiền — hết 30 ngày dùng thử nó tự rớt về gói Always Free, máy
trả phí bị dừng, thế thôi.

---

## Giai đoạn 1 — Đăng ký tài khoản

1. Vào https://www.oracle.com/cloud/free/ và bấm **Start for free**.
   Đừng dùng menu **Cloud → Compute** trên trang chủ — đó chỉ là trang quảng cáo,
   không tạo được gì.
2. Điền thông tin, xác minh email và số điện thoại.
3. **Home Region: chọn `Singapore (ap-singapore-1)`.**

> ⚠️ Home Region **không đổi được về sau**, chọn sai phải xóa tài khoản làm lại từ
> đầu. Singapore cho độ trễ về Việt Nam khoảng 30–40ms và là vùng hiếm khi hết máy.
> Tài nguyên Always Free **chỉ tồn tại ở home region**.

4. Nhập thẻ để xác minh. Đăng ký xong, từ nay làm việc ở **https://cloud.oracle.com**
   (không phải `oracle.com`).

---

## Giai đoạn 2 — Tạo mạng TRƯỚC khi tạo máy

Đây là chỗ vấp đầu tiên. Nếu tạo mạng ngay trong lúc tạo máy, nút gạt **Public
IPv4** sẽ bị khóa và không hiểu vì sao. Tạo mạng riêng trước thì trơn tru.

1. Menu ☰ → **Networking → Virtual cloud networks**
2. Bấm **Actions → Start VCN Wizard** (nếu không thấy, bấm **Create VCN** rồi tìm
   lựa chọn có chữ *Internet Connectivity*)
3. Chọn **VCN with Internet Connectivity** — đừng chọn Create VCN thường, loại đó
   tạo mạng rỗng không có Internet Gateway
4. Tên: `vcn-school`. Các ô CIDR để nguyên mặc định (`10.0.0.0/16`, public
   `10.0.0.0/24`, private `10.0.1.0/24`)
5. **Next → Create**, chờ ~30 giây

**Kiểm lại trước khi đi tiếp** — mở VCN vừa tạo:

- Tab **Subnets**: phải có `public subnet-vcn-school` với cột *Subnet Access* ghi
  **Public (Regional)**
- Tab **Gateways**: phải có **Internet gateway** trạng thái *Available*

Cột *Route Table* của Internet Gateway hiện dấu gạch ngang là bình thường.

---

## Giai đoạn 3 — Tạo máy ảo

Menu ☰ → **Compute → Instances → Create instance**.

### Ảnh hệ điều hành — chỗ vấp thứ hai

Mặc định là **Oracle Linux**, phải đổi sang **Ubuntu**. Trong khu vực *Image and
shape* có **hai nút khác nhau**:

- **Change shape** — chỉ đổi cỡ máy (CPU, RAM)
- **Change image** — đổi hệ điều hành ← **cần nút này**

Bấm **Change image** → chọn **Canonical Ubuntu** → phiên bản **24.04** →
**Select image**.

> Trong hộp thoại phải bấm đúng **nút tròn ở đầu dòng**, không phải bấm vào chữ.
> Bấm vào chữ thì hộp thoại không ghi nhận, đóng lại là quay về Oracle Linux.
> Xong phải thấy dòng *Operating system: Canonical Ubuntu 24.04* mới đi tiếp.

### Cỡ máy — chỗ vấp thứ ba, và là chỗ khó nhất

Thứ tự ưu tiên khi chọn shape:

| Ưu tiên | Shape | Ở đâu | Ghi chú |
|---|---|---|---|
| 1 | `VM.Standard.A1.Flex` | tab **Ampere** | Miễn phí vĩnh viễn. Để **1 OCPU / 6 GB** — app chỉ dùng ~46MB nên thừa sức, mà càng nhỏ càng dễ có máy trống. |
| 2 | `VM.Standard.E2.1.Micro` | tab **Specialty and previous generation** | Cũng miễn phí vĩnh viễn, 1 CPU / 1 GB. |
| 3 | `VM.Standard.E5.Flex` | tab **AMD** | **Trả phí** (~58 USD/tháng, trừ vào tín dụng dùng thử). Chỉ dùng khi hai loại trên hết máy. |

**Gần như chắc chắn sẽ gặp lỗi `Out of capacity`.** Máy miễn phí ở Singapore bị
săn rất dữ, và tài khoản dùng thử bị Oracle xếp sau về ưu tiên. Cách xử lý:

- Bấm **Create** lại 4–5 lần, mỗi lần cách nhau 1 phút — capacity được nhả ngẫu nhiên
- Thử lại vào **giờ vắng** (sáng sớm giờ Việt Nam) thường dễ hơn
- Vẫn không được thì tụt xuống ưu tiên 2, rồi 3
- Thông báo lỗi đôi khi tự gợi ý shape đời mới hơn — cứ làm theo nó

Gợi ý *"thử availability domain khác"* trong thông báo lỗi **không dùng được ở
Singapore**, vì vùng này chỉ có một AD duy nhất.

### Mạng

- **Select existing virtual cloud network** → `vcn-school`
- Subnet: **`public subnet-vcn-school`** (phải là public)
- **Assign a public IPv4 address: ON**

### Khóa SSH — sai một lần là phải xóa máy làm lại

- Chọn **Generate a key pair for me**
- Bấm **Download private key**, lưu vào chỗ dễ nhớ
- **Mở thư mục kiểm tra tệp `.key` có thật ở đó**, rồi mới bấm **Create**

> Khóa riêng chỉ tải được đúng một lần. Đóng trang là mất vĩnh viễn.

Chờ 1–2 phút cho trạng thái chuyển sang **RUNNING**, rồi vào tab **Details** ghi
lại **Public IP address**.

---

## Giai đoạn 4 — Mở cổng ở CẢ HAI LỚP

Oracle chặn ở hai nơi độc lập. Mở một lớp thôi thì trang web vẫn không vào được mà
**không có thông báo lỗi nào** để lần ra. Đây là cái bẫy tốn thời gian nhất.

### Lớp 1 — Security List (trên web)

**Networking → Virtual cloud networks → vcn-school → Security → Default Security
List** → **Add Ingress Rules**:

- Source Type: **CIDR** · Source CIDR: `0.0.0.0/0`
- IP Protocol: **TCP** · Destination Port Range: `80,443`

### Lớp 2 — iptables (trong máy, làm ở giai đoạn sau khi đã SSH vào)

Ảnh Ubuntu của Oracle có sẵn luật chặn tất cả trừ cổng 22. Xem bằng:

```bash
sudo iptables -L INPUT -n --line-numbers
```

Thấy dòng cuối `REJECT ... reject-with icmp-host-prohibited` chính là thủ phạm.

---

## Giai đoạn 5 — Vào máy từ Windows

Mở **PowerShell**, sửa quyền tệp khóa trước (Windows chặn nếu tệp mở quá rộng):

```powershell
$key = "D:\duong-dan\ssh-key-2026-08-20.key"
icacls.exe $key /reset
icacls.exe $key /grant:r "$($env:USERNAME):(R)"
icacls.exe $key /inheritance:r
ssh -i $key ubuntu@<PUBLIC-IP>
```

Lần đầu hỏi *"Are you sure you want to continue connecting?"* → gõ `yes`.

| Lỗi | Nguyên nhân |
|---|---|
| `UNPROTECTED PRIVATE KEY FILE` | Chưa chạy ba lệnh `icacls`, hoặc đường dẫn `$key` sai |
| `Connection timed out` | Gõ nhầm IP, hoặc máy chưa RUNNING |

---

## Giai đoạn 6 — Cài đặt

> **Dán MỖI LẦN MỘT DÒNG.** Dán cả khối nhiều dòng vào PowerShell hay bị dính dấu
> nhắc vào giữa câu lệnh, chạy sai mà không báo lỗi rõ. Đây là chỗ vấp thật: lần
> đầu chúng tôi dán cả khối, lệnh `cd /opt/schoolconnect` bị cắt thành `onnect`,
> và các lệnh mở cổng iptables lặng lẽ không chạy — mãi tới lúc xin chứng chỉ
> HTTPS thất bại mới lần ra.
>
> Chờ dấu nhắc `$` hiện lại rồi mới dán dòng tiếp theo.

```bash
# Múi giờ — làm trước tiên, mọi dấu thời gian về sau đều dựa vào nó
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Mở cổng lớp 2
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Node 22 — tách curl và bash thành hai bước cho dễ thấy lỗi
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/node.sh
sudo bash /tmp/node.sh
sudo apt-get install -y nodejs
node -v      # phải ra v22.x
npm -v

# Tải mã nguồn
sudo git clone -b claude/school-communication-app-wqjitt \
  https://github.com/pichu124/School.git /opt/schoolconnect
sudo chown -R ubuntu:ubuntu /opt/schoolconnect
cd /opt/schoolconnect
npm ci --omit=dev

# Dữ liệu để NGOÀI thư mục mã nguồn
sudo mkdir -p /var/lib/schoolconnect && sudo chown ubuntu:ubuntu /var/lib/schoolconnect
DATA_DIR=/var/lib/schoolconnect node data/seed.js
DATA_DIR=/var/lib/schoolconnect npm run create-admin "Nguyễn Văn Hiệu" hieutruong
```

Lệnh cuối in ra **mật khẩu tạm — chép lại ngay**, nó chỉ hiện một lần.

**Nếu máy chỉ có 1 GB RAM** (shape E2.1.Micro), thêm vùng nhớ đệm trước khi chạy
`npm ci`, nếu không nó chết giữa chừng:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Giai đoạn 7 — Chạy như dịch vụ

Dùng `tee` thay vì mở `nano` — một lần dán, ít rủi ro hơn:

```bash
sudo tee /etc/systemd/system/schoolconnect.service > /dev/null <<'EOF'
[Unit]
Description=SchoolConnect
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/schoolconnect
ExecStart=/usr/bin/node server.js
Environment=DATA_DIR=/var/lib/schoolconnect
Environment=NODE_ENV=production
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

```bash
cat /etc/systemd/system/schoolconnect.service    # xem có dính chữ lạ không
sudo systemctl daemon-reload
sudo systemctl enable --now schoolconnect
curl -I localhost:3000/healthz                   # phải ra HTTP/1.1 200 OK
```

**Chưa bật `FORCE_HTTPS` ở bước này.** Bật sớm là app tự chuyển hướng sang https
trong khi chưa có chứng chỉ, không kiểm tra được gì nữa.

---

## Giai đoạn 8 — Tên miền và HTTPS

### Tên miền miễn phí

1. Vào https://www.duckdns.org, đăng nhập bằng Google/GitHub
2. Tạo subdomain, ví dụ `casa-school` → **add domain**
3. Điền Public IP của máy chủ vào ô **current ip** → **update ip**

Kiểm trên máy chủ: `getent hosts casa-school.duckdns.org` phải in ra đúng IP.

### Caddy

```bash
sudo apt install -y apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

> Hướng dẫn chính thức của Caddy có thêm `debian-keyring debian-archive-keyring`.
> Ubuntu **không cần** hai gói đó, mà `debian-keyring` nặng 31MB với hàng nghìn tệp
> nhỏ nên giải nén rất lâu, dễ tưởng là treo. Bỏ qua chúng.

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
casa-school.duckdns.org {
    reverse_proxy localhost:3000
}
EOF
sudo systemctl restart caddy
```

### Kiểm cổng TRƯỚC khi thử chứng chỉ

Let's Encrypt giới hạn số lần thử hỏng mỗi giờ. Kiểm cổng đã thông chưa **từ máy
Windows của bạn**, không phải từ trong máy chủ:

```powershell
curl.exe -I http://<PUBLIC-IP>
```

Có bất kỳ phản hồi nào (kể cả `308 Permanent Redirect`) là cổng đã thông. Báo
*"Failed to connect"* thì quay lại Giai đoạn 4 — thiếu một trong hai lớp.

Rồi mới:

```bash
sudo systemctl restart caddy
sleep 30
curl -I https://casa-school.duckdns.org/healthz     # phải ra HTTP/2 200
```

Nếu lỗi, xem nguyên nhân trong `sudo journalctl -u caddy -n 30 --no-pager`.
Dòng *"Error getting validation data"* nghĩa là Let's Encrypt không gõ vào được —
tức là cổng vẫn chặn.

### Bật ép HTTPS

Chỉ làm khi lệnh trên đã ra `HTTP/2 200`. Ghi lại tệp dịch vụ, thêm một dòng:

```bash
sudo tee /etc/systemd/system/schoolconnect.service > /dev/null <<'EOF'
[Unit]
Description=SchoolConnect
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/schoolconnect
ExecStart=/usr/bin/node server.js
Environment=DATA_DIR=/var/lib/schoolconnect
Environment=NODE_ENV=production
Environment=FORCE_HTTPS=1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl restart schoolconnect
```

---

## Giai đoạn 9 — Sao lưu và kiểm tra

```bash
cd /opt/schoolconnect
DATA_DIR=/var/lib/schoolconnect npm run backup
DATA_DIR=/var/lib/schoolconnect npm run backup:list
DATA_DIR=/var/lib/schoolconnect npm run restore:check
```

Lệnh cuối là phép thử thật: nó giải nén bản sao lưu ra và đếm lại số bản ghi bên
trong. Sao lưu chưa từng kiểm thì chưa gọi là sao lưu.

**Hẹn giờ hằng đêm** — dùng systemd timer vì lịch tự mang theo múi giờ (cách làm
đầy đủ trong `docs/QUY-TRINH-TRIEN-KHAI.docx` mục 4.2). Với máy tập dượt thì cron
cũng đủ:

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/schoolconnect && DATA_DIR=/var/lib/schoolconnect npm run backup >> /home/ubuntu/backup.log 2>&1") | crontab -
crontab -l
```

**Kiểm tra sức khỏe máy chủ:**

```bash
DATA_DIR=/var/lib/schoolconnect npm run kiem-tra-may-chu -- --ten-mien=casa-school.duckdns.org
```

Nó kiểm 8 mục và in kèm cách sửa cho từng mục hỏng. Với máy tập dượt dùng dữ liệu
demo thì mục *Mật khẩu mẫu* sẽ báo CẦN SỬA — đúng như thiết kế.

---

## Giai đoạn 10 — Thử phá

Phần đáng giá nhất của cả buổi tập dượt. Mô phỏng app gặp sự cố lúc 2 giờ sáng
không ai trực:

```bash
sudo systemctl kill schoolconnect
sleep 5
systemctl status schoolconnect --no-pager
curl -I https://casa-school.duckdns.org/healthz
```

Phải thấy `active (running)` kèm `restart counter at 1`, và app trả về 200. Thử
tải lại trang trên điện thoại — vẫn vào bình thường, người dùng không hề biết vừa
có sự cố.

---

## Dùng thử trên điện thoại

Mở `https://<tên-miền>.duckdns.org` bằng **4G** (không dùng Wi-Fi nhà, để đi đúng
đường phụ huynh sẽ đi):

| Vai | Tài khoản | Mật khẩu |
|---|---|---|
| Quản trị | `hieutruong` | mật khẩu tạm do `create-admin` in ra |
| Giáo viên | `giaovien` | `123456` |
| Phụ huynh | `phuhuynh` | `123456` |

Thử luôn **Thêm vào màn hình chính** — có HTTPS thật thì PWA mới cài được như app.

---

## Xóa máy khi xong

**Nếu dùng shape trả phí (E4/E5.Flex) thì đừng quên bước này** — máy tiêu khoảng
1,9 USD/ngày từ tín dụng dùng thử.

**Compute → Instances → More actions → Terminate**, nhớ tick **"Permanently delete
the attached boot volume"** (không tick thì ổ đĩa vẫn nằm đó ăn hạn mức 200GB).

Mạng `vcn-school` không tốn phí, để lại dùng cho lần sau cũng được — lần sau bỏ
qua được Giai đoạn 2.

---

## Tóm tắt các chỗ vấp

| Vấp ở đâu | Dấu hiệu | Cách qua |
|---|---|---|
| Home region | — | Chọn Singapore lúc đăng ký, **không đổi được** về sau |
| Menu Cloud → Compute | Bấm mãi không tạo được máy | Đó là trang quảng cáo; vào `cloud.oracle.com` |
| Public IPv4 bị khóa | Nút gạt xám, cảnh báo *"must select a public subnet"* | Tạo VCN bằng wizard **trước**, rồi chọn existing |
| Đổi hệ điều hành | Bấm mãi vẫn Oracle Linux | Nút **Change image**, không phải Change shape; bấm nút tròn đầu dòng |
| Hết máy | `Out of capacity` | Thử lại nhiều lần, giờ vắng, hoặc tụt shape theo bảng ở Giai đoạn 3 |
| Tường lửa | Web không vào được, không có lỗi gì | Mở **cả hai lớp**: Security List + iptables |
| Dán lệnh | Lệnh chạy sai mà không báo lỗi | Dán **mỗi lần một dòng**, chờ dấu nhắc |
| Xin chứng chỉ | `Error getting validation data` | Cổng 80 chưa thông; kiểm từ ngoài bằng `curl.exe` trước |
| Múi giờ | Sao lưu chạy sai giờ, log lệch 7 tiếng | `timedatectl set-timezone Asia/Ho_Chi_Minh` |
