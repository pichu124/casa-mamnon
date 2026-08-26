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
> | **KHÔNG** còn đúng | Tên dịch vụ và thư mục `schoolconnect`; máy chủ thử trên Oracle Cloud; cách gọi *học sinh / lớp / giáo viên chủ nhiệm* |
> | Chưa chốt | App 2 chạy **VPS đặt tại Việt Nam, tên miền đứng tên trường** — nhà trường chưa đăng ký (N7) |
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

## Tự động sao lưu hằng đêm

Sao lưu thủ công sẽ bị quên. Hãy đặt lịch chạy tự động lúc 2 giờ sáng:

**Trên máy chủ Linux** — mở `crontab -e` rồi thêm:

```cron
0 2 * * * cd /duong/dan/toi/School && /usr/bin/node scripts/backup.js >> /var/log/schoolconnect-backup.log 2>&1
```

**Trên Windows** — mở Task Scheduler, tạo tác vụ chạy hằng ngày lúc 02:00 với:
- Chương trình: `node`
- Tham số: `scripts\backup.js`
- Thư mục bắt đầu: thư mục cài đặt SchoolConnect

---

## Đưa bản sao ra khỏi máy chủ

> **Bản sao lưu nằm cùng máy với dữ liệu gốc sẽ mất cùng nhau khi ổ cứng hỏng
> hoặc máy chủ bị xóa.** Đây là sai lầm khiến nhiều nơi mất trắng dù vẫn "có
> sao lưu đều đặn".

Chọn một trong các cách sau và thêm vào lệnh cron ngay sau lệnh sao lưu:

**Cloudflare R2 / Backblaze B2 / Amazon S3** (khoảng 20–50 nghìn đồng/tháng):
```bash
rclone sync /duong/dan/data/backups remote:schoolconnect-backup
```

**Máy chủ khác qua SSH:**
```bash
rsync -az --delete /duong/dan/data/backups/ user@may-khac:/backup/schoolconnect/
```

**Google Drive** (dùng `rclone config` để kết nối một lần):
```bash
rclone sync /duong/dan/data/backups gdrive:SchoolConnect-Backup
```

---

## Vòng đời bản sao

Script tự dọn bản cũ theo nguyên tắc: giữ **7 bản gần nhất theo ngày**,
**4 bản theo tuần**, **12 bản theo tháng**. Nhờ vậy vẫn tra được dữ liệu của
nhiều tháng trước mà không để thư mục phình to vô hạn.

Mỗi bản sao được nén lại, thường chỉ còn khoảng 1/5 dung lượng gốc.

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
