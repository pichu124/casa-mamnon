# Hướng dẫn sao lưu và khôi phục

> ## ⚠️ Tài liệu này viết cho APP 1, chưa cập nhật cho CASA Mầm non
>
> Nội dung bên dưới mô tả việc triển khai **SchoolConnect — trường tiểu học**, và
> được mang sang cùng phần nền lúc tách kho. **Đừng làm theo nguyên văn cho app 2
> trước khi cập nhật.**
>
> | | |
> |---|---|
> | Còn dùng được | Quy trình chung: sao lưu hằng đêm, cập nhật bằng `git pull`, dựng dịch vụ tự bật lại, cấu hình HTTPS |
> | **Đã sửa cho app 2** | Mọi ĐƯỜNG DẪN trong tệp này — `/var/lib/casa-mamnon`, `/var/lib/casa-mamnon/backup.log`. Xem lý do ngay dưới |
> | **KHÔNG** còn đúng | Máy chủ thử trên Oracle Cloud; cách gọi *học sinh / lớp / giáo viên chủ nhiệm* |
> | Chưa chốt | App 2 chạy **VPS đặt tại Việt Nam, tên miền đứng tên trường** — nhà trường chưa đăng ký (N7) |
>
> **Vì sao đường dẫn được sửa trước, dù cả tệp còn chờ N1.** Một đường dẫn sai
> không làm người vận hành gặp lỗi — nó làm script mở một cơ sở dữ liệu TRỐNG
> rồi báo *"mọi thứ đều sạch"*. Trấn an sai còn tệ hơn báo lỗi: người ta đóng
> máy về nhà, tin rằng trường đang được sao lưu. Cách gọi tên thì chỉ khó chịu;
> đường dẫn thì mất dữ liệu.
>
> Việc cập nhật bộ tài liệu này là **N1** trong `docs/TIEN-DO.md`. Nó chờ nhà
> trường chốt nhà cung cấp VPS và tên miền, vì không có hai thứ đó thì viết ra
> cũng chỉ là đoán.

Dữ liệu của trường gồm hai phần, đều nằm trong thư mục `DATA_DIR`:

| Phần | Tệp | Ghi chú |
|------|-----|---------|
| Cơ sở dữ liệu | `school.db` | Toàn bộ học sinh, điểm danh, nhận xét, tin nhắn… |
| Ảnh album | `uploads/` | Ảnh giáo viên tải lên |

---

## Các lệnh

```bash
npm run backup          # Tạo bản sao lưu mới
npm run backup:list     # Xem các bản đã có
npm run restore:check   # Kiểm tra bản mới nhất còn dùng được không
npm run restore         # Khôi phục từ bản mới nhất
```

Sao lưu ra nơi khác (ổ cắm ngoài, thư mục mạng):

```bash
node scripts/backup.js --out /mnt/backup-truong
```

Khôi phục từ một bản cụ thể:

```bash
node scripts/restore.js school-20260812-0200.db.gz
```

---

## Khoá giữ ảnh đã tải về ổ ngoài

Bình thường, khi một tấm ảnh đã biến mất khỏi `uploads/` đủ lâu để **không bản
sao nào còn nhắc tới nó**, script dọn nốt bản sao của tấm ảnh đó để thư mục sao
lưu không phình vô hạn (xem *Vòng đời bản sao* bên dưới).

Luật đó đúng khi cô xoá một tấm khỏi album. Nó **sai** khi trường đang làm việc
khác: tải ảnh cũ về ổ cứng của trường rồi xoá bớt phần đã tải trên máy chủ để
nhẹ đĩa. Lúc ấy tấm ảnh không hề hết cần — và một vòng đời sau, máy dọn nốt bản
sao, tấm ảnh chỉ còn nằm trên **một ổ cứng duy nhất**.

Ảnh là thứ duy nhất trong app không dựng lại được từ đâu khác. Nên trước khi
bắt đầu đợt tải về, bật khoá:

```bash
node scripts/backup.js --giu-anh        # BẬT: không tự dọn bản sao của ảnh nữa
node scripts/backup.js --thoi-giu-anh   # TẮT: dọn lại như cũ
```

Vài điều cần biết:

- Khoá là **một tệp** (`backups/giu-anh-da-tai-ve.lock`), không phải tham số
  dòng lệnh. Sao lưu chạy theo lịch cron, mà dòng cron thì không ai nhớ sửa —
  một tham số gõ tay một lần sẽ vô nghĩa với lượt chạy tự động hôm sau.
- Khoá bật thì **mỗi lượt sao lưu đều nhắc**, kèm số ảnh và dung lượng đang
  giữ thêm. `npm run backup:list` cũng nói trạng thái khoá.
- Đổi lại, chỗ ảnh trong thư mục sao lưu **chỉ tăng**. Nhớ theo dõi dung lượng.
- Chỉ tắt khoá khi đã chắc ổ cứng ngoài an toàn và đã kiểm tra lại — tắt xong,
  lượt sao lưu kế tiếp sẽ dọn thật.

---

## Tự động sao lưu hằng đêm

Sao lưu thủ công sẽ bị quên. Hãy đặt lịch chạy tự động lúc 2 giờ sáng:

**Trên máy chủ Linux** — mở `crontab -e` rồi thêm:

```cron
0 2 * * * cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js >> /var/lib/casa-mamnon/backup.log 2>&1
```

**Trên Windows** — mở Task Scheduler, tạo tác vụ chạy hằng ngày lúc 02:00 với:
- Chương trình: `node`
- Tham số: `scripts\backup.js`
- Thư mục bắt đầu: thư mục cài đặt CASA Mầm non

---

## Đưa bản sao ra khỏi máy chủ

> **Bản sao lưu nằm cùng máy với dữ liệu gốc sẽ mất cùng nhau khi ổ cứng hỏng
> hoặc máy chủ bị xóa.** Đây là sai lầm khiến nhiều nơi mất trắng dù vẫn "có
> sao lưu đều đặn".

> ### ⛔ BẢN SAO KHÔNG ĐƯỢC RỜI KHỎI LÃNH THỔ VIỆT NAM
>
> Bản sao lưu của app này chứa **đủ mọi thứ máy chủ chứa**: hồ sơ trẻ 12 tháng
> – 6 tuổi, **ảnh và video khuôn mặt trẻ**, hồ sơ sức khoẻ, số điện thoại và
> số định danh của phụ huynh. Đó là nhóm dữ liệu nhạy cảm theo **Nghị định
> 13/2023/NĐ-CP** và **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15**.
>
> Đưa nhóm dữ liệu đó lên một dịch vụ lưu trữ nước ngoài — Cloudflare R2,
> Amazon S3, Backblaze, Google Drive, Dropbox, OneDrive — là **chuyển dữ liệu
> xuyên biên giới**, kéo theo thủ tục mà trường chưa làm và cũng không nên
> phải làm. Chính vì lý do này mà `render.yaml` bị đánh dấu "chỉ để chạy thử",
> và bản sao thì còn nhạy cảm hơn máy chủ đang chạy: nó là một tệp duy nhất,
> chép đi được, và không có màn đăng nhập nào canh.
>
> Ba cách dưới đây đều **giữ bản sao trong nước**.

Chọn một trong các cách sau và thêm vào lệnh cron ngay sau lệnh sao lưu:

**① Ổ cứng ngoài cắm tại trường** — cách rẻ nhất và cũng là cách runbook app 2
khuyên dùng (`docs/TRIEN-KHAI.md`, mục 6). Không cần tài khoản dịch vụ nào:
```bash
node scripts/backup.js --out /mnt/o-ngoai/casa-mamnon
```

**② Một máy khác trong phòng hành chính, qua SSH:**
```bash
# KHÔNG dùng --delete: xem cảnh báo ngay dưới.
rsync -a /var/lib/casa-mamnon/backups/ user@may-hanh-chinh:/backup/casa-mamnon/
```

**③ Nhà cung cấp lưu trữ ĐẶT TẠI VIỆT NAM** (VNG Cloud, Viettel IDC, FPT
Cloud, CMC Cloud…), cùng nhà cung cấp với VPS thì càng gọn:
```bash
# rclone copy — KHÔNG phải `rclone sync`. Xem cảnh báo ngay dưới.
rclone copy /var/lib/casa-mamnon/backups vngcloud:casa-mamnon-backup
```

> ### ⚠️ `--delete` và `rclone sync` xoá theo cả lỗi
>
> `rsync --delete` và `rclone sync` có nghĩa là *"làm cho bên kia GIỐNG HỆT bên
> này"*. Bên này mất bản sao — ổ hỏng, thư mục bị xoá nhầm, `DATA_DIR` trỏ sai
> nên thư mục `backups` trống trơn — thì lượt đồng bộ kế tiếp **xoá nốt bản ở
> bên kia**. Máy chạy lúc 2 giờ sáng, không ai nhìn, và sáng ra cả hai bên đều
> trống.
>
> Dùng `rsync -a` (không `--delete`) và `rclone copy` (không `sync`). Thư mục
> đích phình ra thì đã có phần **Vòng đời bản sao** ngay dưới dọn giúp — dọn
> theo luật, không dọn theo lỗi.

---

## Vòng đời bản sao

Script tự dọn bản cũ theo nguyên tắc (Đ235, 08/10/2026):

- **7 ngày gần nhất:** giữ bản **đầu** và bản **cuối** của mỗi ngày. Bản đầu
  thường là bản 02:00 tự động — bản sạch của cả ngày ấy.
- **48 giờ gần nhất:** giữ **mọi** bản (tối đa 24 bản mới nhất), để bản sao
  chạy tay "trước khi cập nhật" không bị một lần sao lưu sau đó trong ngày
  xoá mất.
- **4 bản theo tuần**, **12 bản theo tháng**, như trước.

Nhờ vậy vẫn tra được dữ liệu của nhiều tháng trước, mà tổng số bản luôn có
trần — một dòng cron lỡ đặt chạy mỗi phút cũng không làm đầy đĩa.

**Giờ của mỗi bản đọc từ TÊN tệp** (`school-20261008-0200.db.gz` = 02:00 ngày
08/10/2026, giờ Việt Nam), không đọc giờ sửa tệp (Đ236). Nhờ vậy chép cả thư
mục sao lưu sang máy chủ mới — kể cả bằng `scp -r` hay `cp -r` không giữ giờ —
vẫn giữ nguyên lịch sử. **Đừng đổi tên tệp sao lưu**: tên chính là giờ chụp.

> **Vì sao không còn "một bản mỗi ngày".** Luật cũ chỉ giữ bản mới nhất mỗi
> ngày, nên chạy sao lưu tay (việc tài liệu dặn làm trước mỗi lần cập nhật) là
> xoá mất bản 02:00 của chính hôm đó. Nếu sáng hôm ấy có người lỡ xoá nhầm dữ
> liệu, bản sạch duy nhất của cả ngày hôm trước cũng đi theo.

Mỗi bản sao được nén lại, thường chỉ còn khoảng 1/5 dung lượng gốc.

Ảnh thì không theo vòng đời trên: bản sao của một tấm ảnh chỉ được dọn khi mọi
bản sao còn giữ đều chụp **sau** lúc tấm ảnh biến mất khỏi `uploads/` — tức là
khi không bản nào còn nhắc tới nó nữa. Muốn hoãn hẳn việc này, xem *Khoá giữ
ảnh đã tải về ổ ngoài* ở trên.

---

## Diễn tập khôi phục — làm mỗi quý

**Bản sao lưu chưa từng khôi phục thử thì coi như không có.** Nhiều trường chỉ
phát hiện tệp sao lưu bị hỏng đúng vào ngày cần đến nó.

Cách kiểm tra nhanh, không ảnh hưởng dữ liệu đang chạy:

```bash
npm run restore:check
```

Lệnh này giải nén bản sao mới nhất, kiểm tra tính toàn vẹn của cơ sở dữ liệu và
in ra số người dùng, học sinh, lượt điểm danh, tin nhắn có trong đó. Nếu các con
số khớp với thực tế của trường thì bản sao dùng được.

Mỗi năm một lần, nên làm bài diễn tập đầy đủ: khôi phục vào một máy chủ thử,
khởi động lên và đăng nhập kiểm tra.

---

## Khi cần khôi phục thật

1. **Dừng máy chủ** trước — không khôi phục khi hệ thống đang chạy.
2. Chạy `npm run restore` (hoặc chỉ định tên bản sao muốn dùng).
3. Script tự kiểm tra bản sao trước khi ghi đè, và **đổi tên giữ lại dữ liệu
   hiện tại** thay vì xóa — nếu khôi phục nhầm vẫn quay lại được.
4. Khởi động máy chủ, đăng nhập và kiểm tra vài màn hình.
5. Chỉ xóa tệp `school.db.truoc-khi-khoi-phuc-*` sau khi đã chắc chắn.

---

## Mất bao nhiêu dữ liệu và bao lâu thì xong

| Chỉ số | Giá trị |
|--------|---------|
| Dữ liệu có thể mất | Tối đa 24 giờ (nếu sao lưu mỗi đêm một lần) |
| Thời gian khôi phục | Khoảng 5–15 phút nếu đã tập dượt |

Muốn giảm mức mất dữ liệu xuống còn 1 giờ, đặt cron chạy mỗi giờ thay vì mỗi
ngày — bản sao được nén nên chi phí lưu trữ không đáng kể.
