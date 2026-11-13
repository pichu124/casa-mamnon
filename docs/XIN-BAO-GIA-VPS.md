# Bản yêu cầu xin báo giá máy chủ (VPS / Cloud Server)

Gửi cùng một bản này cho **ít nhất ba nhà cung cấp** thì mới so được giá. Mỗi
nơi báo một cấu hình khác nhau là không có cách nào biết nơi nào rẻ hơn thật.

Phần dưới dấu `---` là bản **chép thẳng vào email hoặc Zalo**, không cần sửa gì
ngoài tên trường và thông tin liên hệ.

> **Vì sao xin hai cấu hình** (cập nhật 13/11/2026, sau báo giá đầu tiên nhận
> về): phần tính toán của app rất nhẹ — một tiến trình, cơ sở dữ liệu SQLite —
> nên **ổ đĩa mới là thứ quyết định**, vì mỗi ngày trường sinh ra hai tấm ảnh
> cho mỗi bé và bản sao lưu chép theo (mục N25 của `docs/TIEN-DO.md`).
> Cấu hình **A** (4 vCPU / 8 GB) là mức dư dả; cấu hình **B** (2 vCPU / 4 GB)
> là mức `docs/KE-HOACH.md` dự tính ban đầu cho cả hai app, thường rẻ hơn
> 40–50%. **Hai cấu hình giữ nguyên ổ đĩa 200 GB** — cắt CPU và RAM thì được,
> cắt đĩa thì không. Nâng CPU và RAM về sau thường chỉ mất một lần khởi động
> lại; nâng đĩa mới là việc phiền.

---

**Tiêu đề:** Đề nghị báo giá máy chủ ảo — Trường Mầm non [TÊN TRƯỜNG]

## Kính gửi Quý Công ty,

Trường Mầm non **[TÊN TRƯỜNG]** cần thuê một máy chủ ảo để chạy phần mềm liên
lạc nội bộ giữa nhà trường và gia đình các bé. Kính đề nghị Quý Công ty báo
giá **cho cả hai cấu hình A và B** dưới đây, cùng các điều kiện ở mục 3, để nhà
trường cân nhắc lựa chọn.

### 1. Quy mô sử dụng

| Nội dung | Con số |
|---|---|
| Số trẻ | khoảng 300, tại 3 cơ sở |
| Tài khoản gia đình | khoảng 600 |
| Tài khoản giáo viên và văn phòng | khoảng 40 |
| Giờ cao điểm | 7h00–8h00 và 16h30–17h30 hằng ngày |
| Dữ liệu phát sinh | khoảng 25–30 GB mỗi năm học, chủ yếu là ảnh |

### 2. Hai cấu hình đề nghị báo giá

| Hạng mục | Cấu hình A | Cấu hình B |
|---|---|---|
| CPU | 4 vCPU | 2 vCPU |
| RAM | 8 GB | 4 GB |
| Ổ cứng | **200 GB SSD/NVMe** | **200 GB SSD/NVMe** |
| Hệ điều hành | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Địa chỉ IP | 1 IPv4 tĩnh | 1 IPv4 tĩnh |
| Băng thông trong nước | từ 200 Mbps trở lên | từ 200 Mbps trở lên |
| Lưu lượng | không giới hạn | không giới hạn |
| Vị trí đặt máy | **Hà Nội hoặc TP. Hồ Chí Minh** | **Hà Nội hoặc TP. Hồ Chí Minh** |

CPU dùng chung (không cần CPU riêng) là đủ cho nhu cầu của trường.

### 3. Điều kiện bắt buộc (áp dụng cho cả hai cấu hình)

1. **Máy chủ đặt tại Việt Nam.** Dữ liệu gồm hồ sơ và ảnh khuôn mặt trẻ dưới 6
   tuổi — thuộc nhóm dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP và
   Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15. Trường không đặt máy ở nước ngoài.
2. **Sao lưu tự động hằng ngày**, lưu trên hạ tầng **tách khỏi máy ảo**, giữ tối
   thiểu 7 bản gần nhất. Nếu sao lưu là dịch vụ tính phí riêng, kính đề nghị
   ghi rõ giá thành một dòng riêng trong báo giá.
3. **Hoá đơn giá trị gia tăng đứng tên nhà trường.**
4. Hợp đồng và tài khoản quản trị đứng tên nhà trường, không đứng tên cá nhân.

### 4. Kính đề nghị nêu rõ trong báo giá

1. **Giá thuê hằng tháng của từng cấu hình** (ghi rõ đã gồm hay chưa gồm VAT),
   và tổng giá theo kỳ 12 tháng.
2. **Giá gia hạn từ năm thứ hai** — có khác giá năm đầu không.
3. **Giá nâng thêm dung lượng ổ đĩa**, tính theo mỗi GB mỗi tháng.
4. **Nâng từ cấu hình B lên A** về sau: có phải dừng máy chủ không, mất bao lâu,
   có mất dữ liệu không. Câu hỏi tương tự cho **nâng ổ đĩa**.
5. **Bản sao lưu tự động** nằm ở đâu, giữ được bao nhiêu ngày, khôi phục mất bao
   lâu, và trường tự khôi phục được hay phải nhờ Quý Công ty.
6. **Snapshot và backup có phải là hai thứ khác nhau không** trong dịch vụ của
   Quý Công ty, và snapshot lưu ở đâu.
7. **Trung tâm dữ liệu cụ thể** (tên, thành phố) và do đơn vị nào vận hành.
8. **Cam kết uptime** và mức bồi thường khi không đạt.
9. **Thời gian phản hồi hỗ trợ kỹ thuật**, nêu riêng cho **ngoài giờ hành chính
   và ngày nghỉ**. Trường bắt đầu đón trẻ từ 7 giờ sáng; máy chủ hỏng vào giờ
   đó là cả trường phải quay lại chấm sổ giấy trong ngày.
10. **Thời gian bàn giao** kể từ khi ký hợp đồng, và **thời hạn hiệu lực** của
    báo giá.
11. Có hỗ trợ **tường lửa** và **chống tấn công từ chối dịch vụ** kèm theo không.

### 5. Thông tin liên hệ

- Đơn vị: Trường Mầm non **[TÊN TRƯỜNG]**
- Người phụ trách: **[HỌ TÊN]** — **[SỐ ĐIỆN THOẠI]** — **[EMAIL]**
- Mã số thuế: **[MST]**

Trân trọng cảm ơn Quý Công ty.

---

## Thư gửi lại nhà cung cấp đã báo giá một lần

Với nơi đã gửi báo giá trước đó (ví dụ báo giá cloud server ngày 09/09/2026,
hiệu lực 30 ngày, đã hết hạn), dán đoạn này **lên đầu** bản thư ở trên rồi gửi
cả bản:

> Cảm ơn Quý Công ty đã gửi báo giá ngày [NGÀY]. Do báo giá đã hết hiệu lực và
> nhà trường cần so sánh thêm một cấu hình nhỏ hơn, kính đề nghị Quý Công ty
> báo giá lại theo hai cấu hình A và B dưới đây. Kính đề nghị lưu ý thêm:
> (1) báo giá đứng tên **[TÊN ĐƠN VỊ ĐỨNG TÊN HỢP ĐỒNG]**; (2) báo giá trước
> chưa nêu dịch vụ **sao lưu tự động** — đây là điều kiện bắt buộc của nhà
> trường; (3) xin ghi rõ **trung tâm dữ liệu cụ thể** và **giá gia hạn năm thứ
> hai**.

---

## Bảng so sánh — điền khi nhận đủ báo giá

| Nội dung | Nhà cung cấp X | Nhà cung cấp Y | Nhà cung cấp Z |
|---|---|---|---|
| Giá tháng **cấu hình A**, đã gồm VAT | | | |
| Giá tháng **cấu hình B**, đã gồm VAT | | | |
| Giá sao lưu (nếu tính riêng) | | | |
| Giá gia hạn năm thứ hai | | | |
| Giá nâng đĩa (đồng/GB/tháng) | | | |
| Nâng B → A: dừng máy bao lâu | | | |
| Sao lưu: nhịp / nơi lưu / số bản | | | |
| Trường tự khôi phục được không | | | |
| Trung tâm dữ liệu / thành phố | | | |
| Phản hồi hỗ trợ ngoài giờ | | | |
| Thời gian bàn giao | | | |
| Báo giá đứng tên đúng đơn vị không | | | |

**Bốn chỗ dễ bị hớ khi đọc báo giá:**

- **Giá năm đầu rẻ, năm sau khác hẳn.** Hỏi thẳng câu số 2 ở trên trước khi so.
- **Snapshot bị chào như sao lưu.** Snapshot thường nằm cùng hạ tầng với máy ảo:
  hỏng cụm là mất cả máy lẫn ảnh chụp của nó. Sao lưu thật phải nằm chỗ khác.
- **Đĩa nhỏ, tưởng đủ.** Gói 40–100 GB nhìn thì rẻ, nhưng ảnh của trường tăng
  25–30 GB mỗi năm và bản sao lưu chép theo, nên chật trong vòng một năm. Bộ
  soát `npm run kiem-tra-may-chu` có mục *"Kho ảnh của trường"* tự cảnh báo
  trước khi đầy — nhưng mua đúng ngay từ đầu vẫn rẻ hơn nâng giữa chừng.
- **Báo giá thiếu dòng sao lưu.** Giá trông rẻ hơn nơi khác chỉ vì chưa tính
  sao lưu. So giá phải so **cộng cả dòng sao lưu**.
