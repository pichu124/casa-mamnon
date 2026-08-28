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
máy chủ **dừng có chủ ý** thay vì tự sinh dữ liệu mẫu. Dữ liệu mẫu kèm 9 tài
khoản dùng chung mật khẩu `123456`; sinh chúng ra trên một máy đang mở ra
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

## Còn thiếu gì trong tài liệu này

Ghi ra đây thay vì để người đọc tự phát hiện:

| Phần | Vì sao chưa viết |
|---|---|
| Địa chỉ máy chủ, tên miền, cấu hình HTTPS | Chờ N7 — nhà trường chưa đăng ký |
| Cách cài dịch vụ (systemd / pm2 / docker) | Tuỳ nhà cung cấp VPS, chưa chọn |
| Lịch cron sao lưu cụ thể | Cùng lý do |
| Hồ sơ đánh giá tác động theo Điều 24 NĐ 13/2023 | Cần phần mô tả kỹ thuật viết cùng nhà trường, chưa làm |

Khi nhà trường chốt xong N7, phần trên viết được trong một buổi — và lúc đó mới
nên viết, vì viết trước là đoán.
