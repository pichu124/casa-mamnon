# Tính học phí tự động — file Excel và đặc tả

> **⚠ ĐÃ BỊ BÁC BỎ (chủ dự án, 26/10/2026).** *"Giờ tôi muốn tính tự động theo thời gian
> ưu đãi, bác bỏ toàn bộ thông tin đề cập trước đó. Về học phí có thể để lại sau hoặc ẩn đi…
> khi nào mình xây dựng hoàn thiện thì công bố."* Mọi quy tắc, giả định G1–G22 và kịch bản
> trong thư mục này **không còn là yêu cầu** — giữ lại làm tư liệu, KHÔNG dùng làm hợp đồng
> khi dựng học phí trong app. Yêu cầu mới sẽ được ghi riêng khi chủ dự án làm lại phần học phí.
> Xem `docs/PHAN-HOI-TRUONG-2010.md` mục I.


Làm theo tài liệu "Xây dựng file tính biểu phí tự động" của nhà trường (văn bản gốc:
[`YEU-CAU-GOC.md`](YEU-CAU-GOC.md)). Đây là **cơ sở để tích hợp vào app** sau này: file Excel
cho kế toán dùng ngay, còn đặc tả và bộ kịch bản chuẩn là hợp đồng mà bản cài trong app phải
khớp tới từng đồng.

| Tệp | Là gì |
|---|---|
| [`Tinh-hoc-phi-tu-dong.xlsx`](Tinh-hoc-phi-tu-dong.xlsx) | File Excel cho kế toán và ban giám hiệu — mọi ô tính là công thức sống, 300 bé. Mở trang "Hướng dẫn" trước. |
| [`DAC-TA.md`](DAC-TA.md) | Đặc tả quy tắc tính (bản 3.1) — HỢP ĐỒNG chung cho file Excel và app. Mỗi chỗ tài liệu gốc mơ hồ ghi một giả định Gx. |
| [`tham-chieu/tinh.mjs`](tham-chieu/tinh.mjs), [`tham-chieu/tinh.py`](tham-chieu/tinh.py) | Hai bản tính THAM CHIẾU viết độc lập từ đặc tả (không nhìn file Excel, không nhìn nhau), kèm bài tự kiểm `kiem-tra.mjs`, `test_tinh.py`. Bản JS là điểm xuất phát tự nhiên khi đưa vào app. |
| [`kich-ban/`](kich-ban/) | Bộ kịch bản chuẩn: mỗi `*.json` là một đầu vào, `*.ket-qua.json` là kết quả mà file Excel và cả hai bản tham chiếu cùng ra y hệt. `npm run test:hoc-phi-tu-dong` canh bản JS không lệch khỏi bộ này. |
| [`tao_file.py`](tao_file.py) | Sinh lại file Excel (openpyxl). `--suc-chua=<số bé>` đổi sức chứa; `--kich-ban=<tệp>` nạp một kịch bản thay dữ liệu mẫu. |
| [`tinh_lai.py`](tinh_lai.py) | Cho LibreOffice tính lại mọi công thức (openpyxl không ghi kết quả). |
| [`chay_kich_ban.py`](chay_kich_ban.py), [`so_sanh.py`](so_sanh.py) | Chạy một kịch bản qua CHÍNH file Excel; đối chiếu ba chiều Excel ↔ JS ↔ Python. |
| [`thu_pha_file.py`](thu_pha_file.py) | 12 cách "phá file" một văn phòng thật hay làm (ô #N/A, mã có dấu cách thừa, ngày kèm giờ, dòng mồ côi cuối bảng, số tài khoản mất số 0…): file phải chặn đúng bé dính vào và cảnh báo, không ra số sai im lặng. |
| [`mong-doi-mau.json`](mong-doi-mau.json) | Số "Mong đợi" của trang Ví dụ kiểm chứng — do hai bản tham chiếu tính, không lấy từ file Excel. |

## Sinh lại và kiểm lại

```bash
pip install openpyxl                      # và: sudo apt-get install -y --no-install-recommends libreoffice-calc
python3 tao_file.py Tinh-hoc-phi-tu-dong.xlsx
python3 tinh_lai.py Tinh-hoc-phi-tu-dong.xlsx 900   # phải in "0 ô lỗi" (bản 300 bé tính mất ~1 phút)
python3 so_sanh.py kich-ban                          # phải in "0 chỗ lệch" (~10 phút)
python3 thu_pha_file.py                              # phải in "12/12 ca đạt"
node tham-chieu/kiem-tra.mjs && python3 tham-chieu/test_tinh.py
```

Tệp xlsx trong thư mục này **đã được tính sẵn** (bước `tinh_lai.py`), nên mở bằng bất kỳ công cụ
nào cũng thấy số, không chỉ Excel.

## Đã kiểm chứng thế nào

Con số ở đây là của lượt chốt Đ221 (01/10/2026).

1. **Đặc tả trước, rồi ba bản cài độc lập.** `DAC-TA.md` chốt mọi chỗ tài liệu gốc mơ hồ. Từ đó có
   ba bản cài viết riêng: file Excel (công thức sống), bản JS và bản Python. Hai bản tham chiếu do
   hai tác tử khác nhau viết, chỉ được đọc đặc tả — không mở file Excel, không mở bản kia — kèm bài
   tự kiểm riêng (`kiem-tra.mjs` 82 bài, `test_tinh.py` 97 bài; mỗi bài mới đều được thử ngược
   là ĐỎ trên bản đặc tả cũ).
2. **Đối chiếu ba chiều** (`so_sanh.py`): mỗi kịch bản chạy qua CHÍNH file Excel (LibreOffice tính
   lại toàn bộ công thức) và qua hai bản tham chiếu; so theo luật ở cuối `DAC-TA.md`. Kết quả lượt
   chốt: **36 kịch bản, 1.390 bé, 0 chỗ lệch.** Kịch bản do tác tử riêng viết theo lối đối kháng:
   làm tròn, nợ gộp ở mọi tháng của quý, kỳ 14/15/16 tháng, đổi gói, đổi mức ưu đãi giữa tháng ở cả
   hai chế độ, chu kỳ viết tắt đủ kiểu hoa/thường, mã chỉ có dấu cách, mã dạng số, ký tự `* ? ~`,
   chữ Unicode tổ hợp, ngày biên 31/12/1999 – 01/01/2000 – 29/02/2000 – 31/12/2100 ở mọi ô ngày.
3. **Bên thứ tư:** 173 bé ở ba bộ kịch bản mới nhất (biên năm 2000, mã có dấu cách thừa) còn có số
   tính TAY của người viết kịch bản — khớp cả 173.
4. **Ba vòng rà soát độc lập** (mỗi phát hiện qua một người phản biện cố bác bỏ): vòng 1 — đối
   chiếu số, rà công thức, đọc lại tài liệu dưới ba vai, rà ngôn ngữ; vòng 2 — 27 phát hiện; vòng 3 —
   đóng vai kế toán qua nhiều đợt thu, đọc phiếu như phụ huynh, cố tình phá file (27 phát hiện, sửa
   hết; 12 cách phá file nay thành `thu_pha_file.py` — 12/12 đạt, và 0/12 trên bộ sinh file trước khi sửa).
5. **Giới hạn đã biết của phép kiểm:** máy kiểm là LibreOffice, không phải Excel — mọi hàm dùng
   trong file là hàm có từ Excel 2007, không có hàm mảng tràn ô; công thức dài nhất ~5.400 ký tự
   (Excel giới hạn 8.192), lồng sâu nhất 17 tầng (giới hạn 64). Thứ máy KHÔNG kiểm được: bấm thật
   trên Excel (thả xuống, khoá trang, Cắt/Dán), in ra máy in thật — cần người thử.

## Ghi chú cho lúc đưa vào app

1. **Tài liệu của trường đòi TỰ ĐỘNG TÍNH — ngược với Đ169 "máy không tự trừ tiền".** Bảng ưu
   đãi hiện tại (`hocphi_uudai`) cố ý chỉ theo dõi và nhắc, để kế toán nhìn con số trước khi nó
   thành khoản thu. Đưa bộ máy này vào app là đảo quyết định đó, nên **phải hỏi chủ dự án trước**.
   Đề xuất giữ tinh thần Đ169: bộ máy chỉ sinh **phiếu tính nháp** kèm giải trình từng tháng; kế
   toán duyệt rồi mới ghi thành khoản thu qua đường ghi sổ đang có (cùng nếp "chép ra" của Đ200).
   Không có đường hẹn giờ nào tự tạo khoản.
2. **Mô hình dữ liệu hiện tại chưa đủ.** `hocphi_uudai` có `ten` tự do, `kieu` 'so-tien' |
   'phan-tram', `giaTri` số nguyên 1–100; thiếu mã danh mục, loại (Chung / Theo chu kỳ / Bổ sung),
   áp cho mốc, áp cho chu kỳ, trần riêng. Chưa có bảng quyết định tuyển sinh, chu kỳ đóng của bé,
   cờ con/em giáo viên, "đã đóng hết tháng", đổi gói giữa kỳ. Lược đồ phân hệ cấm `ALTER`, nên
   phải là **bảng mới** cạnh bảng cũ, và một bước chuyển dữ liệu có kiểm (ưu đãi kiểu số tiền
   không có chỗ trong đặc tả — giả định G12).
3. **Thiếu dữ liệu thì không ra số** (DAC-TA mục 1.3). Ngày bật, mọi bé cũ chưa có mã QĐ và chưa
   có "đã đóng hết tháng"; nếu bản cài "mặc định 0" thay vì chặn thì mọi bé mất ưu đãi thường,
   hoặc bị thu nợ từ tháng nhập học (G22), mà không ai bấm gì.
4. **Trạng thái mà file Excel để kế toán tự giữ, app phải lưu**: "đã đóng hết tháng" (file chỉ
   tính sẵn giá trị sau đợt ở cột "Đã đóng hết tháng — SAU đợt này", kế toán chép tay khi khoá sổ),
   phiếu đã phát hành kèm ảnh chụp đầu vào, khoản đã thu gắn với ĐÚNG phiếu (gia đình có thể đóng
   phiếu cũ sau khi đợt mới đã mở), khoản điều chỉnh khi ưu đãi duyệt muộn, hoàn tiền khi nghỉ giữa
   kỳ đã đóng. File Excel tính lại liên tục — sửa dữ liệu hôm nay là phiếu đã gửi hôm qua đổi số.
5. **Tính bằng số nguyên** (đồng × phần vạn) trong app, và giữ đúng luật làm tròn của đặc tả
   (nửa ra xa số 0, một lần mỗi tháng). Bộ kịch bản chuẩn có sẵn các ca bẫy số thực.
6. **Màn hình cho gia đình**: phiếu có chữ "%" — cùng chỗ Đ169 đã phải xử lý với
   `test:quy-tac-4`. Chốt với chủ dự án gia đình được thấy gì trước khi dựng màn hình.
7. Sức chứa 6 ưu đãi thường + 2 chính sách riêng mỗi bé và kỳ tối đa 15 tháng là **giới hạn của
   file Excel**, không phải quy tắc — app không cần hai giới hạn này.

## Câu hỏi còn mở cho nhà trường

Trang "Giả định & câu hỏi" trong file Excel liệt kê từng chỗ tài liệu gốc chưa nói rõ, cách
file đang tạm hiểu, và cột để ban giám hiệu ghi câu trả lời. Chỗ nào nhà trường chốt khác đi thì
sửa **DAC-TA.md trước**, rồi file Excel, rồi bộ kịch bản chuẩn — theo đúng thứ tự đó.
