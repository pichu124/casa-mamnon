# 🏫 SchoolConnect – Sổ liên lạc điện tử

Ứng dụng web kết nối **nhà trường – gia đình**, hỗ trợ trao đổi thông tin giữa **giáo viên và phụ huynh học sinh**: điểm danh, xin phép nghỉ học, thực đơn bán trú, thời khóa biểu, nhận xét hằng ngày, báo cáo học tập, xe đưa đón, nề nếp, khảo sát, y tế học đường, dặn thuốc, album ảnh lớp, kế hoạch giáo dục, thông báo và nhắn tin trực tiếp.

## Dành cho nhà trường

Hệ thống đã sẵn sàng cho quy mô vài trăm học sinh: dữ liệu lưu bằng SQLite, có
trang quản trị để nhập danh sách đầu năm từ Excel, cấp lại mật khẩu khi phụ huynh
quên, sao lưu tự động và chuyển năm học cuối kỳ.

```bash
npm run create-admin "Nguyễn Văn Hiệu" hieutruong   # tạo tài khoản quản trị
npm run backup                                       # sao lưu dữ liệu
npm run restore:check                                # kiểm tra bản sao lưu
```

Kế hoạch triển khai đầy đủ (hạ tầng, chi phí, pháp lý, vận hành):
`docs/ke-hoach-trien-khai.html`. Hướng dẫn sao lưu: `docs/SAO-LUU.md`.

## Chạy ứng dụng

Cần **đúng dòng Node.js 22 (LTS)** — tải tệp `-x64.msi` tại
https://nodejs.org/dist/latest-v22.x/. Bản khác dòng 22 (kể cả MỚI HƠN như Node 24)
sẽ bị chặn ngay ở `npm install`: thư viện cơ sở dữ liệu cần bản dựng sẵn khớp đúng
phiên bản Node, sai dòng là nó quay ra tự biên dịch và đòi cài Visual Studio.

```bash
npm install
npm start
```

Mở trình duyệt tại **http://localhost:3000**. Dữ liệu mẫu tự sinh vào
`data/school.db` ở lần chạy đầu (tạo lại bằng `npm run seed`).

> Nâng cấp từ bản cũ dùng tệp JSON: chạy `npm run migrate` một lần để chuyển
> dữ liệu sang SQLite. Script tự băm lại mật khẩu cũ và giữ nguyên phiên đăng nhập.

> Trên PowerShell cũ của Windows, `&&` không hợp lệ — hãy chạy `npm install` và `npm start` trên hai dòng riêng, hoặc dùng dấu `;` để ngăn cách.

## 📱 Dùng trên điện thoại

Giao diện được thiết kế cho điện thoại trước, và ứng dụng có thể **cài vào màn hình chính như app thật**.

### Bước 1 — Cho điện thoại truy cập được

Máy tính chạy server và điện thoại phải **cùng một mạng Wi-Fi**.

1. Trên máy tính, xem địa chỉ IP nội bộ:
   ```powershell
   ipconfig
   ```
   Tìm dòng **IPv4 Address** trong mục Wi-Fi, ví dụ `192.168.1.15`.

2. Lần đầu chạy, Windows sẽ hỏi quyền truy cập mạng cho Node.js — chọn **Cho phép** (Allow access) ở mạng Riêng tư. Nếu đã lỡ chặn, mở cổng thủ công bằng PowerShell **quyền Administrator**:
   ```powershell
   New-NetFirewallRule -DisplayName "SchoolConnect" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

3. Trên điện thoại, mở trình duyệt và truy cập `http://192.168.1.15:3000` (thay bằng IP của bạn).

### Bước 2 — Cài vào màn hình chính

| Thiết bị | Cách cài |
|---|---|
| **Android** (Chrome) | Menu ⋮ → **Thêm vào Màn hình chính** / **Cài đặt ứng dụng**. Hoặc vào mục **Cài đặt** trong app và bấm nút **Cài đặt**. |
| **iPhone/iPad** (Safari) | Nút Chia sẻ □↑ → **Thêm vào MH chính** (Add to Home Screen). |

Sau khi cài: app có icon riêng, mở toàn màn hình không thanh địa chỉ, và **xem lại được giao diện khi mất mạng**.

> **Lưu ý:** Chế độ cài đặt đầy đủ và hoạt động offline chỉ bật khi truy cập qua `localhost` hoặc **HTTPS**. Khi vào bằng địa chỉ IP dạng `http://192.168.x.x`, trình duyệt vẫn hiển thị app bình thường nhưng bỏ qua service worker. Muốn có đủ tính năng khi thử qua điện thoại, dùng một tunnel HTTPS tạm thời:
> ```bash
> npx cloudflared tunnel --url http://localhost:3000
> ```
> Lệnh này in ra một địa chỉ `https://...trycloudflare.com` — mở địa chỉ đó trên điện thoại.

### Đã tối ưu sẵn cho điện thoại

- Ô nhập cỡ chữ 16px nên **iOS không tự phóng to trang** khi bạn chạm vào
- Chừa **vùng tai thỏ và thanh home** khi chạy toàn màn hình
- Mọi nút bấm đạt tối thiểu 44×44px theo chuẩn của Apple và Google
- Phòng chat chiếm trọn màn hình, ô nhập luôn sát đáy
- **Tự dừng cập nhật khi bạn chuyển sang app khác** để tiết kiệm pin và dung lượng 4G
- Không có thanh cuộn ngang trên mọi màn hình, kể cả máy nhỏ 360px
- Tự đổi sang **nền tối** theo thiết lập của điện thoại

## Tài khoản dùng thử

| Vai trò | Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| Phụ huynh | `phuhuynh` | `123456` | Có 2 con ở 2 lớp (3A và 5B) |
| Phụ huynh | `phuhuynh2` | `123456` | Có 1 con ở lớp 3A |
| Giáo viên | `giaovien` | `123456` | Chủ nhiệm lớp 3A |
| Giáo viên | `giaovien2` | `123456` | Chủ nhiệm lớp 5B |

## Tính năng

**Dành cho phụ huynh**
- 👦 Xem hồ sơ học sinh, chuyển nhanh giữa các con
- 📅 Lịch điểm danh theo tháng, giờ vào/ra lớp
- 📝 Gửi đơn xin phép nghỉ học, theo dõi trạng thái duyệt
- 🍚 Thực đơn bán trú tuần này / tuần sau
- 🗓️ Thời khóa biểu từng lớp, đánh dấu tiết đang học
- 💬 Nhận xét hằng ngày của giáo viên về con
- 📊 Báo cáo kết quả học tập theo học kỳ
- 🚌 Tuyến xe đưa đón, hành trình trong ngày, gọi nhanh tài xế
- ⭐ Sổ nề nếp: tuyên dương / nhắc nhở, điểm thi đua
- 🗳️ Trả lời khảo sát của nhà trường
- 🩺 Hồ sơ y tế: khám định kỳ, tiêm chủng, sự cố
- 💊 Dặn thuốc: gửi hướng dẫn uống thuốc, cô xác nhận và ghi nhật ký
- 🖼️ Album ảnh hoạt động của lớp (ảnh chụp thật, xem phóng to)
- 📖 Kế hoạch giáo dục theo tháng
- 🔔 Thông báo từ trường/lớp, 💬 nhắn tin trực tiếp với giáo viên

**Dành cho giáo viên**
- Điểm danh cả lớp trong một chạm, duyệt đơn xin phép
- Viết nhận xét, ghi nhận nề nếp, cập nhật hành trình xe buýt
- Tạo khảo sát và xem kết quả tổng hợp, tạo thông báo
- Đăng album ảnh: chọn nhiều ảnh từ máy hoặc chụp trực tiếp trên điện thoại, thêm/xóa ảnh bất kỳ lúc nào
- Xác nhận dặn thuốc và ghi nhật ký cho phụ huynh yên tâm
- Nhắn tin riêng với từng phụ huynh và nhóm chung của lớp

## 🎛️ Bật/tắt tính năng và thêm tính năng mới

Không phải trường nào cũng dùng hết. Trường không có xe đưa đón thì tắt **Xe buýt**,
chưa làm bán trú thì tắt **Thực đơn** — màn hình chính gọn lại, phụ huynh đỡ rối.

**Cách làm:** đăng nhập tài khoản quản trị → **Quản trị → Tính năng** → bấm nút
bên phải mỗi dòng để đổi giữa *Đang bật* và *Đang tắt*. Có hiệu lực ngay với toàn
trường, không cần khởi động lại máy chủ.

Vài điều nên biết:

- **Tắt là chặn thật, không phải chỉ giấu biểu tượng.** Máy chủ khóa luôn các
  đường dẫn API của tính năng đó, người biết đường dẫn cũng không lấy được dữ liệu.
- **Dữ liệu đã có được giữ nguyên.** Tắt Điểm danh nửa năm rồi bật lại thì toàn bộ
  lịch sử vẫn còn đủ.
- **Hồ sơ học sinh không tắt được** vì mọi phần khác đều dựa vào nó, nên nó hiện
  "Luôn bật".
- Chỉ tài khoản quản trị mới bật/tắt được; mọi lượt thay đổi đều vào **Nhật ký**
  (ai làm, lúc nào).

### Thêm tính năng chưa từng có

Tính năng mới nằm trong thư mục riêng ở `modules/`, **không phải sửa vào phần đang
chạy**. Máy chủ tự phát hiện khi khởi động, nhà trường tự bật trong trang quản trị.

```
modules/hocphi/
├── module.json   khai báo tên, biểu tượng, đường dẫn API
├── schema.sql    bảng riêng của nó
├── routes.js     API riêng
└── view.js       màn hình riêng
```

Thư mục `modules/hocphi/` là ví dụ hoàn chỉnh có sẵn (mặc định tắt, bật lên để xem).
Hướng dẫn viết chi tiết: [`modules/README.md`](modules/README.md).

### Thêm hay bỏ tính năng không bao giờ làm hỏng app

Đây là nguyên tắc số 1 của kho mã này, ghi trong [`CLAUDE.md`](CLAUDE.md) và được
canh giữ bằng 101 bài kiểm thử tự động. Ứng dụng được dựng sao cho **một tính năng
viết sai chỉ làm chính nó ngưng hoạt động**:

- Máy chủ nạp **từng tệp tính năng trong khối bắt lỗi riêng**. Một tính năng hỏng
  thì nó bị tạm ẩn, API của nó trả lỗi rõ ràng, trang quản trị nêu tên và lý do —
  còn máy chủ vẫn chạy, mọi người vẫn đăng nhập và dùng các phần khác bình thường.
- Gỡ hẳn một tính năng cũng vậy: máy chủ phát hiện thiếu tệp và tự ẩn nó đi, không
  để lại một biểu tượng bấm vào chẳng có gì.
- Tính năng mới **không đăng ký được đường dẫn đã thuộc về tính năng khác**, và
  `schema.sql` của nó **chỉ được tạo bảng mang tên nó** — mọi câu `DROP`, `ALTER`
  đều bị chặn trước khi chạy, nên không thể vô tình xóa dữ liệu đang dùng.

Kiểm chứng lại bất cứ lúc nào:

```bash
npm test                 # 549 bài, khoảng 3 phút, không cần trình duyệt
npm run test:giao-dien   # thêm 106 bài chạy trên trình duyệt thật (cần Playwright)
npm run test:tat-ca      # chạy cả hai
```

Trong đó `test:co-lap-loi` cố tình phá hỏng từng thứ — viết sai một tính năng lõi,
xóa mất tệp của một tính năng, cắm một phân hệ chiếm đường dẫn của phần khác, một
`schema.sql` chứa `DROP TABLE students` — rồi kiểm tra app vẫn đăng nhập được, các
tính năng còn lại vẫn chạy, và dữ liệu học sinh vẫn còn nguyên.

Còn `test:khe-uoc` canh những tệp mà cả ứng dụng cùng dựa vào (`lib/db.js`,
`public/js/ui.js`…): nếu một hàm dùng chung bị xóa, đổi tên hay đổi số tham số thì
báo đỏ ngay, vì một thay đổi như vậy làm hỏng hàng chục màn hình cùng lúc.

Mọi bộ đều tự dựng máy chủ riêng với cơ sở dữ liệu tạm nên chạy được ngay sau khi
`npm install`, không cần `npm start` chạy sẵn, và **không đụng dữ liệu thật của
trường**.

## 🌐 Đưa lên Internet cho phụ huynh dùng qua 4G

### ⚠️ Bắt buộc làm trước

Toàn bộ tài khoản mẫu đang dùng chung mật khẩu `123456`. **Trước khi cho phụ huynh dùng thật**, đăng nhập từng tài khoản và đổi mật khẩu trong **Cài đặt → Đổi mật khẩu**. Khi chạy với `NODE_ENV=production`, máy chủ sẽ in cảnh báo ra log nếu còn tài khoản dùng mật khẩu mẫu.

### Cách 1 — Dùng thử nhanh bằng tunnel (không cần tài khoản)

```bash
npm start
npx cloudflared tunnel --url http://localhost:3000
```
Lệnh thứ hai in ra địa chỉ `https://...trycloudflare.com` dùng được từ mọi nơi. Máy tính phải bật, và địa chỉ đổi mỗi lần chạy lại — phù hợp để demo, không phù hợp dùng lâu dài.

### Cách 2 — Deploy lên Render (chạy 24/7)

Kho mã đã có sẵn `render.yaml`. Đẩy mã lên GitHub rồi vào Render → **New → Blueprint** → chọn kho này. Render tự đọc cấu hình, gắn ổ đĩa 1GB vào `/data` và bật HTTPS.

> **Quan trọng:** phải dùng gói **Starter trở lên**. Gói miễn phí không có ổ đĩa lưu trữ nên `db.json` sẽ bị xóa sạch mỗi lần dịch vụ khởi động lại.

### Cách 3 — Docker (máy chủ riêng, VPS)

```bash
docker build -t schoolconnect .
docker run -d -p 80:3000 -v schoolconnect-data:/data --restart unless-stopped schoolconnect
```
Ổ đĩa `schoolconnect-data` giữ dữ liệu qua các lần cập nhật. Nên đặt Nginx hoặc Caddy phía trước để có HTTPS.

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng lắng nghe |
| `HOST` | `0.0.0.0` | Địa chỉ lắng nghe (`0.0.0.0` cho phép máy khác trong mạng truy cập) |
| `DATA_DIR` | `./data` | **Thư mục lưu dữ liệu và ảnh album — trỏ vào ổ đĩa gắn ngoài khi deploy** |
| `NODE_ENV` | — | Đặt `production` để bật các cảnh báo an toàn lúc khởi động |
| `FORCE_HTTPS` | — | Đặt `1` để tự chuyển hướng HTTP sang HTTPS |
| `DEMO_PASSWORD` | `123456` | Mật khẩu ban đầu khi sinh dữ liệu mẫu lần đầu |
| `TRUST_PROXY` | bật | Đặt `0` nếu **không** chạy sau reverse proxy |

### ⚠️ Để dữ liệu của trường nằm NGOÀI thư mục mã nguồn

Mặc định `DATA_DIR` là `./data`, tức là **nằm ngay trong thư mục mã nguồn**. Tiện
khi thử trên máy cá nhân, nhưng **nguy hiểm khi chạy thật** nếu máy chủ cập nhật
bằng `git pull`: hồ sơ học sinh khi đó nằm trong thư mục làm việc của git, chỉ cần
một lần `git add -A` theo thói quen là bị đẩy lên kho công khai.

Chạy với `NODE_ENV=production` mà dữ liệu vẫn nằm trong thư mục mã nguồn thì máy
chủ in cảnh báo ra log. Thấy cảnh báo thì làm theo dưới đây.

**Chọn chỗ đặt dữ liệu.** Một thư mục nằm ngoài thư mục mã nguồn, trên ổ đĩa
không bị xóa khi cài lại app:

| Máy chủ | Đường dẫn nên dùng |
|---|---|
| Windows | `C:\SchoolConnectData` |
| Linux | `/var/lib/schoolconnect` |
| Docker / Render | `/data` — **đã cấu hình sẵn, không phải làm gì** |

> **Đừng đặt trong OneDrive, Google Drive hay Dropbox.** Các dịch vụ này đồng bộ
> tệp trong lúc máy chủ đang ghi, có thể làm **hỏng cơ sở dữ liệu**. Cũng đừng đặt
> trên Desktop hay Documents nếu máy đã bật đồng bộ OneDrive.

**Chuyển dữ liệu — làm đúng thứ tự này.**

1. **Tắt máy chủ trước.** Đang chạy mà chép thì cơ sở dữ liệu có thể hỏng vì còn
   dữ liệu nằm trong tệp `-wal` chưa ghi xong.
2. Sao lưu cho chắc: `npm run backup`
3. Chép **cả thư mục `data`** sang chỗ mới, trừ `seed.js`. Trên Windows:
   ```powershell
   mkdir C:\SchoolConnectData
   copy data\school.db* C:\SchoolConnectData\
   xcopy data\uploads C:\SchoolConnectData\uploads /E /I
   xcopy data\backups C:\SchoolConnectData\backups /E /I
   ```
   Trên Linux:
   ```bash
   sudo mkdir -p /var/lib/schoolconnect
   sudo cp -a data/school.db* data/uploads data/backups /var/lib/schoolconnect/
   ```
   Nhớ chép cả `school.db-wal` và `school.db-shm` nếu có — dấu `*` ở trên đã lo.
4. **Chép xong mới khởi động.** Khởi động khi thư mục mới còn rỗng thì máy chủ
   tưởng đây là lần chạy đầu và **sinh ra dữ liệu mẫu giả**.

**Bảo máy chủ dùng chỗ mới.** Trên Windows, tạo tệp `chay.bat` ngay trong thư mục
mã nguồn rồi từ nay mở app bằng cách bấm đúp vào nó:

```bat
@echo off
set DATA_DIR=C:\SchoolConnectData
set NODE_ENV=production
npm start
```

Trên Linux:

```bash
DATA_DIR=/var/lib/schoolconnect NODE_ENV=production npm start
```

**Kiểm tra đã đúng chưa.** Khởi động và đọc log — dòng `Cơ sở dữ liệu:` phải trỏ
vào chỗ mới, và cảnh báo phải biến mất:

```
SchoolConnect đang chạy tại http://localhost:3000
Cơ sở dữ liệu: C:\SchoolConnectData\school.db
```

Rồi đăng nhập, mở danh sách học sinh và một album ảnh để chắc chắn dữ liệu cũ còn
đủ. Xác nhận xong mới xóa thư mục `data` cũ — trước đó cứ đổi tên thành `data-cu`
để còn đường lùi.

Ngoài ra kho mã có ba lớp chặn để dữ liệu không lọt lên GitHub:

1. `.gitignore` chặn cả thư mục `data/`, mọi tệp `*.db`, `uploads/`, `backups/`, `.env`.
2. Móc git chặn commit có chứa tệp dữ liệu — **kể cả khi bị ép bằng `git add -f`**.
   Lớp này không có đường thoát.
3. GitHub kiểm tra lại mỗi lần push, canh cả trường hợp bỏ qua móc bằng `--no-verify`.

Kiểm tra bất cứ lúc nào: `npm run test:du-lieu`.

### Tự khởi động lại khi gặp sự cố

Khi gặp lỗi lạ không xử lý được, máy chủ **cố ý dừng lại** (thay vì chạy tiếp với
trạng thái không tin được rồi ghi dữ liệu sai) và trông cậy vào một trình giám sát
bên ngoài bật lại nó trong vài giây. Chạy thật thì **bắt buộc có trình giám sát** —
không có thì app tắt là tắt luôn cho tới khi có người để ý.

**Docker / Render:** đã tự khởi động lại sẵn, không phải làm gì.

**Windows — dùng NSSM** (tải `nssm.exe` từ nssm.cc, chép vào `C:\nssm\`), chạy
PowerShell quyền Administrator:

```powershell
C:\nssm\nssm.exe install SchoolConnect "C:\Program Files\nodejs\node.exe" server.js
C:\nssm\nssm.exe set SchoolConnect AppDirectory "C:\duong\dan\toi\thu-muc-app"
C:\nssm\nssm.exe set SchoolConnect AppEnvironmentExtra DATA_DIR=C:\SchoolConnectData NODE_ENV=production
C:\nssm\nssm.exe start SchoolConnect
```

Từ đây app chạy như một dịch vụ Windows: tự bật khi máy khởi động, tự bật lại khi
gặp sự cố, không cần ai đăng nhập vào máy. Xem trạng thái trong `services.msc`,
gỡ bằng `nssm.exe remove SchoolConnect`.

**Linux — dùng systemd**, tạo `/etc/systemd/system/schoolconnect.service`:

```ini
[Unit]
Description=SchoolConnect
After=network.target

[Service]
WorkingDirectory=/duong/dan/toi/thu-muc-app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
Environment=DATA_DIR=/var/lib/schoolconnect
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now schoolconnect   # bật ngay và tự chạy khi khởi động máy
journalctl -u schoolconnect -f              # xem log
```

### Bảo mật đã có sẵn

- **Mật khẩu băm bằng scrypt** với muối ngẫu nhiên — không bao giờ lưu dạng đọc được
- **Khóa 15 phút** sau 8 lần đăng nhập sai từ cùng một địa chỉ IP
- Cookie phiên **HttpOnly + SameSite=Lax**, tự thêm **Secure** khi chạy qua HTTPS
- Header bảo mật: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, không lộ Express
- Dữ liệu học sinh gửi kèm `Cache-Control: no-store`, service worker **không bao giờ lưu cache `/api`**
- Đổi mật khẩu sẽ **đăng xuất mọi thiết bị khác**
- Phiên đăng nhập và dữ liệu **được ghi xuống đĩa an toàn khi máy chủ tắt** (ghi nguyên tử, không hỏng file)

### Giới hạn cần biết

Dữ liệu lưu trong một file JSON — đủ tốt cho một trường (vài nghìn bản ghi) và không cần cài đặt gì thêm, nhưng **chỉ chạy được trên một tiến trình duy nhất**. Nếu cần nhiều máy chủ chạy song song hoặc quy mô nhiều nghìn học sinh, hãy chuyển sang PostgreSQL — điểm cần sửa nằm gọn trong `lib/db.js`.

## 📦 Đóng gói thành app Android (file APK)

Kho mã đã cấu hình sẵn [Capacitor](https://capacitorjs.com) — app Android là vỏ native nạp giao diện từ máy chủ SchoolConnect của bạn, nên **giữ nguyên toàn bộ tính năng** (đăng nhập, nhắn tin, chạy offline) mà không phải sửa gì ở máy chủ.

### Cần cài trên máy tính

- **Android Studio** (kèm sẵn Android SDK) — tải tại [developer.android.com/studio](https://developer.android.com/studio)
- **JDK 21** — Android Studio đã có sẵn

### Các bước

```bash
# 1. Chỉ định địa chỉ máy chủ mà app sẽ kết nối tới
npm run mobile:prepare -- https://truong-cua-ban.onrender.com

# 2. Đồng bộ cấu hình và giao diện vào project Android
npm run mobile:sync

# 3. Mở bằng Android Studio rồi bấm Run, hoặc build APK bằng dòng lệnh:
npm run mobile:apk
```

File APK nằm ở `android/app/build/outputs/apk/debug/app-debug.apk`. Chép sang điện thoại và cài (cần bật *Cài đặt ứng dụng không rõ nguồn gốc*).

> **Thử với máy chủ trong nhà:** dùng địa chỉ nội bộ, ví dụ `npm run mobile:prepare -- http://192.168.1.15:3000`. Script tự bật cho phép kết nối http trong `AndroidManifest.xml`; khi bạn chuyển sang địa chỉ `https://` nó tự gỡ đi.

### Đổi tên app, icon, mã định danh

| Muốn đổi | Sửa ở đâu |
|---|---|
| Tên hiển thị | `android/app/src/main/res/values/strings.xml` |
| Mã định danh (package) | `capacitor.config.json` → `appId`, rồi chạy lại `npx cap sync` |
| Icon và màn hình chờ | Thay `resources/icon.png` (1024×1024) và `resources/splash.png`, rồi chạy `npm run mobile:icons` |
| Số phiên bản | `android/app/build.gradle` → `versionCode`, `versionName` |

### Phát hành lên CH Play

APK ở trên là bản *debug* dùng để thử. Muốn đưa lên CH Play cần bản *release* đã ký:

```bash
cd android
./gradlew bundleRelease
```
Rồi ký file `.aab` bằng khóa riêng theo [hướng dẫn của Google](https://developer.android.com/studio/publish/app-signing). Đừng đưa file khóa (`.jks`) lên GitHub.

### iOS (iPhone/iPad)

Cần máy **macOS** kèm Xcode:
```bash
npm install @capacitor/ios
npx cap add ios
npm run mobile:prepare -- https://truong-cua-ban.onrender.com
npx cap sync ios
npx cap open ios
```
Lưu ý: Apple thường từ chối app chỉ là "trang web đóng gói". Với iPhone, **cài PWA từ Safari** (mục 📱 ở trên) là cách nhanh và chắc chắn hơn.

## Công nghệ

- **Backend**: Node.js + Express 5, cơ sở dữ liệu SQLite (`data/school.db`) — không cần cài máy chủ CSDL riêng
- **Frontend**: SPA vanilla JavaScript, không cần bước build; giao diện mobile-first tiếng Việt
- **Xác thực**: phiên cookie HttpOnly, phân quyền theo vai trò (phụ huynh / giáo viên)
- Nhắn tin cập nhật gần thời gian thực bằng polling; huy hiệu (badge) số việc cần chú ý trên trang chủ

## Cấu trúc thư mục

```
server.js            # Express: tự nạp routes/, nạp phân hệ cắm thêm, phục vụ SPA
lib/db.js            # Lớp truy cập SQLite + helper phân quyền
lib/schema.sql       # Định nghĩa toàn bộ bảng
lib/auth.js          # Phiên đăng nhập, băm mật khẩu scrypt, middleware vai trò
lib/modules.js       # Danh mục tính năng, bật/tắt, chặn API khi tắt
data/seed.js         # Sinh dữ liệu mẫu (ngày tháng tương đối theo hôm nay)
routes/*.js          # API từng phân hệ
modules/<mã>/        # Tính năng cắm thêm, mỗi thư mục một tính năng
scripts/*.js         # Sao lưu, khôi phục, tạo tài khoản quản trị
public/index.html    # App shell
public/js/views/*.js # View từng phân hệ (tự đăng ký vào App.views)
```
