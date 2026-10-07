# Đặc tả quy tắc tính học phí tự động — bản 3.1

Nguồn yêu cầu: tài liệu "Xây dựng file tính biểu phí tự động" của nhà trường (3 mục:
chu kỳ thu phí, cấu hình ưu đãi, quy tắc tính). Đặc tả này chốt MỘT cách hiểu cho mọi
chỗ tài liệu còn mơ hồ; mỗi chỗ như vậy đánh dấu **[GIẢ ĐỊNH Gx]** và liệt kê lại cho nhà
trường ở trang "Giả định & câu hỏi" của file Excel.

Đặc tả này là HỢP ĐỒNG chung cho file Excel và cho mọi bản cài sau này (app). Hai bản cài
đúng phải cho ra cùng một con số tới từng đồng trên cùng một đầu vào.

**Bản 3.1 đổi gì so với bản 3**: cùng mã ưu đãi cùng tháng giữ dòng **đang hiệu lực ngày đầu
tháng, mới nhất** — thêm dòng mức mới mà quên ghi hạn cho dòng cũ thì mức mới vẫn có hiệu lực từ
tháng sau (7.2; bản 3 giữ dòng bắt đầu sớm nhất nên mức mới không bao giờ được áp); danh mục
nhận cách viết tắt chu kỳ như ô chu kỳ của bé (6.1); định nghĩa lưu ý gia hạn mốc 1 (10); ngày hợp lệ
nay từ **01/01/2000** tới 31/12/2100 (1.2 — trước 01/03/1900 Excel và LibreOffice đánh số ngày khác
nhau, Excel còn coi 29/02/1900 là ngày có thật; một trường mầm non không có ngày nào trước 2000); mã có
dấu cách ở đầu/cuối không hợp lệ (1.2 — vòng rà soát thứ ba bắt được dòng giá "MAM " lặng lẽ không
bao giờ được áp).

**Bản 3 đổi gì so với bản 2** (sau vòng kiểm chứng thứ hai): ô "đã đóng hết tháng" để trống =
bé chưa đóng tháng nào (mục 3.2); tháng đổi mức ưu đãi hưởng mức CŨ, đúng chữ tài liệu (7.2); lưới
15 tháng và kỳ chỉ gồm các tháng thu (3.4); đổi gói từ một tháng (4); chu kỳ gõ sai là LỖI, nhận
viết tắt "6T", "12T" (3.1); ngày hợp lệ 1900–2100 (bản 3.1 nâng mốc dưới lên 2000), mã toàn dấu cách không hợp lệ (1.2); số tháng
mốc 1 tối đa 120 (5); dòng thiếu mã ở biểu phí/QĐ/danh mục có LƯU Ý TOÀN CỤC (6.1).

**Bản 2 đổi gì so với bản 1** (sau vòng kiểm chứng độc lập):
kỳ thu tính RIÊNG từng bé, bé còn nợ thì thu gộp (mục 3); thiếu hoặc sai dữ liệu thì KHÔNG ra số (mục 1.3);
học phí theo tháng có phiên bản giá (mục 4); dòng ưu đãi đã hết hạn không chiếm ô (mục 6.4);
cùng một mã ưu đãi mỗi tháng chỉ tính một dòng (mục 7.2); chu kỳ trống/sai tính theo Quý
(mục 3.1); so chữ không phân biệt hoa/thường, ký tự `* ? ~` là ký tự thường (mục 1.2).

---

## 1. Nguyên tắc chung

### 1.1 Đơn vị

Mọi phép tính làm theo từng **tháng dương lịch** rồi mới cộng thành kỳ (Quy tắc 3 của tài
liệu: "tách dòng tính toán"). Với tháng m: `đầu(m)` = ngày 1, `cuối(m)` = ngày cuối tháng.
`đầu_tháng(d)` = ngày 1 của tháng chứa ngày d. `EDATE(d, k)` = cộng k tháng (d luôn là ngày 1).
Tỉ lệ phần trăm lưu dạng thập phân: 10% = 0.10.

### 1.2 So chữ và kiểu dữ liệu

- Mọi phép so mã (bé, gói, QĐ, ưu đãi) và giá trị chọn (loại, chu kỳ, mốc, chế độ, Có/Không)
  **không phân biệt hoa/thường** (giống Excel): `quý` = `Quý`, `be01` = `BE01`.
  Không tự bỏ khoảng trắng: `"Quý "` (có dấu cách cuối) ≠ `"Quý"`.
- Ký tự `*`, `?`, `~` trong mã là ký tự bình thường, không phải ký tự đại diện.
- **Số** là số thật (trong JSON: kiểu number). Chữ trông như số (`"30%"`, `"6.000.000"`) là
  **không hợp lệ** ở ô cần số.
- **Ngày** hợp lệ là ngày thật từ 01/01/2000 tới 31/12/2100 (trong JSON: chuỗi `"YYYY-MM-DD"`).
  Ngày trước 2000 chỉ có thể là gõ nhầm, và trước 01/03/1900 các bảng tính còn đếm ngày khác nhau.
  Ngày ngoài khoảng đó, chuỗi khác (`"31/10/2027"`),
  số (`46660`) hay true/false là **không hợp lệ** ở ô cần ngày. (Trong Excel số và ngày là một;
  bộ chạy kịch bản ghi số ở trường ngày thành chữ để giữ đúng nghĩa này.)
- true/false (JSON boolean) **không phải số** ở ô cần số (Excel: ISNUMBER(TRUE) = FALSE).
- **Mã** không được là một con số: mã dạng số (JSON number, hoặc chuỗi mà bỏ dấu cách U+0020
  hai đầu thì CHỈ gồm chữ số 0–9, VD `"01"`, `" 123 "`) là **không hợp lệ**. Lý do: Excel
  đếm "01" và "1" như nhau ở một số hàm. (`"1e3"`, `"12%"`, `"1.5"` là mã hợp lệ.) Mã chỉ gồm
  dấu cách (`"  "`) cũng **không hợp lệ**. Mã có dấu cách ở ĐẦU hoặc ở CUỐI (`"MAM "`, `" BE01"`) cũng
  **không hợp lệ**: dán từ văn bản hay để lại dấu cách thừa, và `"MAM "` với `"MAM"` trông y hệt nhau mà là
  hai mã khác nhau — một dòng tăng giá lặng lẽ thành gói riêng, một bé nhập hai lần thành hai bé.
  Dấu cách ở giữa (`"MAM 2"`) vẫn hợp lệ. "Dấu cách" ở mục này chỉ là ký tự U+0020 (như TRIM của Excel).
  Quy tắc mã áp cho mã TỰ KHAI ở bốn chỗ: mã bé, mã gói (biểu phí), mã QĐ, mã ưu đãi (danh mục). Chỗ
  THAM CHIẾU tới mã (gói của bé, QĐ của bé, gói mới, mã ưu đãi của dòng gán) mà có dấu cách thừa thì đơn
  giản là không khớp mã nào — đã là LỖI ở mục 10; riêng `ma_be` của dòng gán không khớp bé nào là LƯU Ý
  TOÀN CỤC (mục 6.2).
- "Trống" = null, thiếu khoá, hoặc chuỗi rỗng `""`.

### 1.3 LỖI và LƯU Ý — thiếu hay sai dữ liệu thì KHÔNG ra số

Mỗi bé có hai danh sách: **lỗi** và **lưu ý**.

- Bé có ít nhất một **lỗi** → `tinh_duoc = false`: file KHÔNG ra số tiền cho bé đó (hiện
  "CHƯA TÍNH ĐƯỢC" kèm lý do) và không cộng vào tổng. Lý do: một con số trông hợp lý mà sai
  (thiếu ưu đãi, thiếu trần) nguy hiểm hơn nhiều so với một ô báo đỏ.
- **Lưu ý** không chặn: file vẫn tính, chỉ nhắc.
- **Lỗi toàn cục** (mục 2) chặn MỌI bé.

Danh sách đầy đủ ở mục 10.

## 2. Cấu hình

| Khoá               | Trống thì           | Giá trị hợp lệ |
|--------------------|---------------------|----------------|
| `thang_ky`         | LỖI toàn cục        | ngày; lấy `đầu_tháng` — gọi là **THANG_THU** (tháng của đợt thu) |
| `che_do_hieu_luc`  | "Trùng ít nhất 1 ngày" | "Trùng ít nhất 1 ngày", "Phủ trọn cả tháng" |
| `che_do_chon`      | "% lớn nhất trước"  | "% lớn nhất trước", "Theo thứ tự nhập" |
| `don_vi_lam_tron`  | 1000                | số ≥ 1 |
| `cach_lam_tron`    | "Làm tròn thường"   | "Làm tròn thường", "Làm tròn xuống" |

Giá trị không trống mà không hợp lệ → **LỖI toàn cục**.

## 3. Bé và kỳ thu của bé

Mỗi bé: `ma`, `ten`, `goi`, `con_gv`, `chu_ky`, `ngay_nhap_hoc`, `ma_qd`, và các ô có thể
trống: `thang_moc2`, `so_luong_moc2`, `tran_moc2`, `da_dong_den`, `ngay_nghi`, `goi_moi`, `doi_goi_tu`,
(`co_so`, `nhom_lop` chỉ để hiển thị, không ảnh hưởng tiền).
`ngay_nghi` là **ngày cuối cùng bé đi học** (trên file Excel: ô "Ngày cuối cùng đi học"): tháng chứa
ngày đó vẫn thu trọn (G15). Phụ huynh nói "nghỉ từ 01/01" thì ngày cuối đi học là 31/12.

### 3.1 Chu kỳ áp dụng

Cách viết được nhận (không phân biệt hoa/thường): **1 tháng** ← "1 tháng", "1T"; **Quý** ← "Quý",
"3 tháng", "3T"; **6 tháng** ← "6 tháng", "6T"; **12 tháng** ← "12 tháng", "12T" (tài liệu tự viết
"6T, 12T").

| `chu_ky` nhập | Chu kỳ áp dụng | Ghi |
|---|---|---|
| 1 tháng và `con_gv` = "Có" | 1 tháng | |
| 1 tháng và `con_gv` ≠ "Có" | **Quý** | LƯU Ý: 1 tháng chỉ dành cho con/em giáo viên — đang tính theo Quý |
| Quý, 6 tháng, 12 tháng | như nhập | |
| trống | **Quý** | LƯU Ý: chưa chọn chu kỳ — đang dùng mặc định Quý |
| giá trị khác | — | **LỖI**: chu kỳ không hợp lệ (không đoán — một chữ gõ sai đổi cả số tiền) |

Tài liệu: *"Chu kỳ khác (Quý, 6T, 12T): Áp dụng cho toàn bộ Phụ huynh (Mặc định: Quý)"*.
Số tháng L: 1 tháng → 1, Quý → 3, 6 tháng → 6, 12 tháng → 12.

### 3.2 Tháng bắt đầu kỳ của bé — N

Mỗi bé có kỳ riêng. File không nhớ bé đã đóng tới đâu, nên có ô **`da_dong_den`**
("đã đóng hết tháng"), kế toán cập nhật sau mỗi lần gia đình đóng đủ:

```
goc = EDATE(đầu_tháng(da_dong_den), 1)   nếu da_dong_den có
    = đầu_tháng(ngay_nhap_hoc)            nếu da_dong_den trống   ("bé chưa đóng tháng nào")
N   = MAX(goc, đầu_tháng(ngay_nhap_hoc))       -- không bao giờ thu trước tháng nhập học
```

- **[GIẢ ĐỊNH G22]** Ô trống nghĩa là **bé chưa đóng tháng nào**: bé mới nhập học tự được thu từ
  tháng nhập học; bé cũ mà kế toán quên ghi sẽ hiện nợ từ tháng nhập học (thường quá sức chứa →
  LỖI kèm lời nhắc ghi ô này), thay vì bị thu trùng hay bị bỏ sót tháng mà không ai biết.
  LƯU Ý khi ô trống và N < THANG_THU: "chưa ghi 'Đã đóng hết tháng' — đang tính như bé chưa đóng
  tháng nào từ tháng nhập học".
- LƯU Ý khi `da_dong_den` ≥ EDATE(THANG_THU, L) (xa hơn một kỳ — có thể gõ nhầm năm).
- (`ngay_nhap_hoc` hoặc `da_dong_den` không hợp lệ đã là LỖI — mục 10; khi đó N không cần
  chính xác và không được so.)

### 3.3 Tháng kết thúc kỳ — E, và bé có đến kỳ không

Khung quý cố định theo lịch: Q1 = T1–T3, Q2 = T4–T6, Q3 = T7–T9, Q4 = T10–T12.

```
E1 = N                                         nếu chu kỳ áp dụng = 1 tháng
   = EDATE(N, L − 1)                           nếu tháng của N ∈ {1, 4, 7, 10}
   = tháng cuối của quý chứa N                 ngược lại  ("kỳ lẻ")
E0 = E1                                        nếu N > THANG_THU hoặc THANG_THU ≤ E1
   = EDATE(E1, L × ROUNDUP(k / L))             nếu N ≤ THANG_THU và THANG_THU > E1,
                                               với k = THANG_THU − E1 (hiệu số tháng, VD 10/2027 − 09/2027 = 1)
E  = MIN(E0, đầu_tháng(ngay_nghi))             nếu ngay_nghi có, ngược lại E0
```

**[GIẢ ĐỊNH G21]** Bé **còn nợ** mà kỳ đầu (N…E1) kết thúc trước tháng thu: đợt thu **gộp** các
tháng nợ với kỳ đang tới hạn. Sau E1 là các kỳ nối tiếp, mỗi kỳ L tháng (bắt đầu ở tháng đầu quý);
E0 là tháng cuối của kỳ chứa THANG_THU. VD đóng quý, đã đóng hết 08/2027, đợt 10/2027 → thu
09–12/2027; 1 tháng, đã đóng hết 07/2027, đợt 10/2027 → thu 08–10/2027; bé mới vào 08/2027 đóng
12 tháng, đợt 10/2027 → thu 08/2027–09/2028 (14 tháng). Kỳ cần thu dài hơn **15 tháng** (sức chứa
của file) → LỖI, lập phiếu tay.

- **[GIẢ ĐỊNH G1]** Kỳ Quý/6 tháng/12 tháng bắt đầu ở tháng đầu một quý; 6 tháng = 2 quý
  liền, 12 tháng = 4 quý liền, được vắt qua năm dương lịch.
- **[GIẢ ĐỊNH G14]** Bé bắt đầu giữa quý (thường là bé mới nhập học): kỳ đầu là **kỳ lẻ**
  từ N tới hết quý đó, bất kể chu kỳ; từ quý sau mới theo chu kỳ đã chọn. Nếu tháng thu đã qua
  kỳ lẻ thì kỳ lẻ được thu gộp theo G21.
- **[GIẢ ĐỊNH G15]** Tháng nhập học và tháng nghỉ học tính **trọn tháng** (không chia theo ngày).
- `den_ky` (bé có trong đợt thu này) = `N ≤ THANG_THU` VÀ `N ≤ E`.
  - `N > THANG_THU`: không thu, không phải lỗi — "Chưa nhập học" nếu tháng nhập học > THANG_THU,
    ngược lại "Chưa đến kỳ".
  - `E < N` (nghỉ học trước khi kỳ bắt đầu): không thu — "Đã nghỉ học". LƯU Ý nếu `da_dong_den`
    sau tháng nghỉ: "đã đóng dư — kiểm tra hoàn tiền (file không tính)".
  - `N < THANG_THU`: vẫn thu, kỳ bắt đầu từ N; LƯU Ý "còn nợ từ tháng N".
- `Lk` = số tháng từ N tới E (tính cả hai đầu) nếu `den_ky`, ngược lại 0. `den_ky` mà Lk > 15 → LỖI.
- `ky_den` trong kết quả là E (kể cả khi bé chưa đến kỳ). E < N thì `ky_den` = null.

### 3.4 Các tháng của kỳ và cửa sổ ưu đãi

Mọi đại lượng theo tháng tính trên các tháng `m_t = EDATE(N, t−1)`, t = 1…Lk (Lk ≤ 15).
Cửa sổ ưu đãi của bé = từ `đầu(N)` tới `cuối(E)` (rỗng nếu E < N).

## 4. Học phí theo tháng — biểu phí có phiên bản

Mỗi dòng biểu phí: `ma` (mã gói), `ten`, `hoc_phi_thang`, `ap_dung_tu` (có thể trống).
Mỗi bé có `goi`, và có thể **đổi gói từ một tháng**: `goi_moi` + `doi_goi_tu` (phải có cả hai
hoặc không có gì — thiếu một là LỖI).

```
gói(m) = goi_moi  nếu có doi_goi_tu và đầu(m) ≥ đầu_tháng(doi_goi_tu), ngược lại goi
bắt_đầu(dòng) = đầu_tháng(ap_dung_tu) nếu có, ngược lại "từ trước tới nay"
hp(m) = hoc_phi_thang của dòng có mã = gói(m) và bắt_đầu ≤ đầu(m) LỚN NHẤT
      = 0 nếu không có dòng nào
```

Một gói có thể có nhiều dòng (VD tăng giá từ 01/09/2028). Lỗi của dòng biểu phí (mục 10)
chặn mọi bé dùng gói đó (`goi` hoặc `goi_moi`). Tháng thuộc kỳ mà `hp(m)` không tìm thấy
dòng → LỖI của bé.

**[GIẢ ĐỊNH G19]** Bé đóng trước 6 tháng/12 tháng mà giữa kỳ trường tăng giá: tháng sau ngày
tăng tính theo giá mới. Bé lên nhóm tuổi (thường từ tháng 9): kế toán ghi `goi_moi` +
`doi_goi_tu`; bé lớp Lá ra trường: ghi `ngay_nghi`. LƯU Ý khi kỳ có từ 2 tháng, chứa một tháng 9
không phải tháng đầu kỳ, và không có lần đổi gói nào rơi vào (N, E]. LƯU Ý khi đổi gói đã qua
(`doi_goi_tu` ≤ N): kế toán phải chép `goi_moi` sang `goi` và xoá hai ô đổi gói TRƯỚC khi ghi lần lên
nhóm sau — nếu ghi đè thẳng, các tháng trước lần đổi mới sẽ bị tính theo gói cũ nhất.

## 5. Quyết định tuyển sinh (QĐ) và mốc

Mỗi QĐ: `ma`, `ten`, `so_thang_moc1` (số nguyên từ 1 tới 120), `so_luong_moc1`, `so_luong_moc2`
(số nguyên ≥ 0), `tran_moc1`, `tran_moc2` (số từ 0 tới 1). Thiếu hay sai → lỗi dòng QĐ,
chặn mọi bé dùng QĐ đó. Mã QĐ trùng (không phân biệt hoa/thường) → chặn các bé dùng mã đó.

```
THANG_MOC2 = đầu_tháng(thang_moc2)                               nếu bé có thang_moc2
           = EDATE(đầu_tháng(ngay_nhap_hoc), so_thang_moc1 của QĐ)  ngược lại
moc(m)     = 2 nếu đầu(m) ≥ THANG_MOC2, ngược lại 1
so_luong_toi_da(m) = moc 1 ? QĐ.so_luong_moc1 : (bé.so_luong_moc2 nếu có, ngược lại QĐ.so_luong_moc2)
tran(m)            = moc 1 ? QĐ.tran_moc1     : (bé.tran_moc2 nếu có,     ngược lại QĐ.tran_moc2)
```

- **[GIẢ ĐỊNH G2]** "Năm 1" = `so_thang_moc1` tháng tính từ **tháng** nhập học.
- **[GIẢ ĐỊNH G16]** Điều kiện "Năm 1 / Năm 2+" của ưu đãi DÙNG CHUNG mốc của QĐ: QĐ đặt mốc 1
  = 24 tháng ("ưu đãi 2 năm đầu") thì ưu đãi gắn "Mốc 1" (VD Năm đầu) áp đủ 24 tháng; gia
  hạn mốc 1 (ô `thang_moc2`) kéo dài cả trần, số lượng lẫn ưu đãi "Mốc 1".
- **[GIẢ ĐỊNH G17]** QĐ gắn theo **lứa nhập học** (bé vào theo QĐ nào giữ QĐ đó), không theo
  ngày hiệu lực.
- `so_luong_moc2`/`tran_moc2` riêng của bé: nếu có phải hợp lệ như của QĐ, sai → LỖI.
- "Số nguyên" = số thật không có phần lẻ (3.0 hợp lệ, 2.5 không).

## 6. Danh mục ưu đãi và ưu đãi gán cho bé

### 6.1 Danh mục

`ma`, `ten`, `loai` ∈ {Chung, Theo chu kỳ, Bổ sung}, `phan_tram`, `ap_cho_moc` ∈ {Cả hai,
Mốc 1, Mốc 2}, `ap_cho_chu_ky` ∈ {Mọi chu kỳ, 1 tháng, Quý, 6 tháng, 12 tháng},
`tran_rieng` (chỉ có nghĩa với loại Bổ sung).
`ap_cho_chu_ky` nhận cả cách viết tắt ở mục 3.1 (1T, 3T, "3 tháng", 6T, 12T — không phân biệt
hoa/thường, KHÔNG bỏ khoảng trắng: "6 T", "6T " là sai) và được đổi về tên chuẩn trước MỌI phép so
(7.1(c) và lưu ý G4).

- Trống lấy mặc định: `loai` → Chung, `ap_cho_moc` → Cả hai, `ap_cho_chu_ky` → Mọi chu kỳ,
  `tran_rieng` → 1 (không giới hạn). `phan_tram` trống là HỢP LỆ ở danh mục nhưng dòng gán
  phải tự có % (mục 6.3).
- Lỗi của một mục danh mục (mục 10) chặn mọi bé có dòng gán mã đó (kể cả dòng ngoài cửa sổ).
- `tran_rieng` HỢP LỆ ở mục (hoặc dòng gán) không phải Bổ sung: bị bỏ qua, chỉ LƯU Ý.
  `tran_rieng` KHÔNG hợp lệ (không phải số trong [0,1]) thì vẫn là LỖI, bất kể loại (mục 10).
- Dòng biểu phí / QĐ / danh mục có dữ liệu mà mã trống: bỏ qua (không ai tham chiếu được), kèm
  LƯU Ý TOÀN CỤC "dòng có số liệu nhưng thiếu mã — đang bị bỏ qua".
- Dòng biểu phí / QĐ / mục danh mục bị LỖI (mục 10) — kể cả khi không bé nào dùng tới mã đó: LƯU Ý
  TOÀN CỤC đếm số dòng lỗi. (Không có lưu ý này thì một dòng tăng giá gõ "MAM " lặng lẽ không bao giờ
  được áp — mọi bé gói "MAM" vẫn tính giá cũ.)
- **Nhóm THƯỜNG** = Chung + Theo chu kỳ. **Nhóm RIÊNG** = Bổ sung.
- **[GIẢ ĐỊNH G3]** Ưu đãi theo chu kỳ **tính vào** số lượng tối đa và trần % như mọi ưu đãi
  thường (hệ quả: khi đủ ưu đãi chung, ưu đãi đóng 12 tháng nhỏ thường bị bỏ — xem G6).
- **[GIẢ ĐỊNH G4]** Ưu đãi theo chu kỳ **gán tay**, không tự áp. Bé có chu kỳ áp dụng X, danh
  mục có mục "Theo chu kỳ" với `ap_cho_chu_ky` = X, mà bé không có dòng gán nào (trong cửa sổ)
  của một mục như vậy: LƯU Ý.

### 6.2 Dòng gán

`ma_be`, `ma_uu_dai`, có thể ghi đè `phan_tram`, `tu_ngay`, `den_ngay`, `tran_rieng`.

- `ma_be` và `ma_uu_dai` đều trống → bỏ qua dòng.
- `ma_be` trống, `ma_uu_dai` có → LƯU Ý TOÀN CỤC "dòng ưu đãi thiếu mã bé".
- `ma_be` không khớp bé nào → LƯU Ý TOÀN CỤC.
- `ma_be` có, `ma_uu_dai` trống → LỖI của bé.
- Một dòng gán thuộc về MỌI bé có mã khớp (theo 1.2) — nếu mã bé trùng thì các bé đó đã bị
  chặn (mục 10).

### 6.3 Giá trị hiệu lực của một dòng

```
p     = phan_tram dòng nếu có, ngược lại phan_tram danh mục   (không có cả hai → LỖI)
tu    = tu_ngay nếu có, ngược lại 01/01/1900
den   = den_ngay nếu có, ngược lại 31/12/9999
tran  = tran_rieng dòng nếu có, ngược lại tran_rieng danh mục, ngược lại 1   (chỉ nhóm riêng)
nhóm  = RIÊNG nếu loại (sau mặc định) = "Bổ sung", ngược lại THƯỜNG
```

p phải là số trong [0, 1] — ngoài khoảng là LỖI (không kẹp). `tu > den` là LỖI.

### 6.4 Ô ưu đãi — sức chứa của file, không phải quy tắc

Dòng **trong cửa sổ** = `E ≥ N` VÀ `tu ≤ cuối(E)` VÀ `den ≥ đầu(N)` (E < N — bé nghỉ trước tháng
bắt đầu kỳ — thì cửa sổ rỗng). Dòng ngoài cửa sổ (đã hết hạn
hẳn, hoặc chưa tới) bị bỏ qua hoàn toàn khi tính — giữ làm lịch sử, không chiếm ô.
Mỗi bé xét tối đa **6 dòng thường** và **2 dòng riêng** trong cửa sổ, theo thứ tự nhập. Nhiều
hơn → LỖI của bé ("quá sức chứa của file"). Bản cài trong app không cần giới hạn này.

## 7. Một dòng có đủ điều kiện trong tháng m không

### 7.1 Ba điều kiện

(a) **Hiệu lực** theo `che_do_hieu_luc`:
```
"Trùng ít nhất 1 ngày":  tu ≤ cuối(m)  VÀ  den ≥ đầu(m)
"Phủ trọn cả tháng":     tu ≤ đầu(m)   VÀ  den ≥ cuối(m)
```
(b) **Mốc**: `ap_cho_moc` (sau mặc định) = "Cả hai", hoặc = "Mốc " & moc(m).
(c) **Chu kỳ**: `ap_cho_chu_ky` (sau mặc định) = "Mọi chu kỳ", hoặc = chu kỳ áp dụng của bé.

**[GIẢ ĐỊNH G5]** Mặc định "trùng ít nhất 1 ngày" — nghĩa đen ví dụ của tài liệu: hạn
31/10/2027 → tháng 10 vẫn áp, tháng 11–12 thôi.

### 7.2 Cùng một mã, cùng một tháng: chỉ một dòng

Nếu nhiều dòng của bé cùng `ma_uu_dai` (theo 1.2) cùng đủ điều kiện trong tháng m, chỉ giữ
MỘT dòng:

1. Trong các dòng **đang hiệu lực ngày đầu tháng** (`tu ≤ đầu(m)`): dòng có `tu` **lớn nhất**
   (dòng mới nhất thay dòng trước).
2. Không dòng nào hiệu lực ngày đầu tháng (mọi dòng bắt đầu giữa tháng): dòng có `tu` **nhỏ nhất**.
3. Bằng nhau: dòng nhập **sau**.

Viết gọn: `diem = −tu` nếu `tu ≤ đầu(m)`, ngược lại `diem = tu`; giữ dòng có `diem` nhỏ nhất;
bằng nhau giữ dòng nhập sau. Ở đây `tu` là **số ngày kiểu Excel** (01/01/1900 = 1, luôn dương).
Cách đếm ngày khác (VD mili-giây từ 1970, âm với ngày trước 1970) làm công thức gọn sai — khi đó
theo đúng ba bước 1–3.

**[GIẢ ĐỊNH G18]** Tài liệu: *"các tháng trước/trong thời hạn (tháng 10) áp dụng ưu đãi cũ,
các tháng sau thời hạn (tháng 11, 12) chuyển sang quy tắc … của giai đoạn mới"* — nên đổi mức giữa
tháng (Cư dân 5% tới 15/11, 7% từ 16/11) thì tháng 11 hưởng mức **cũ** 5% (mức đang áp ngày
1/11), từ tháng 12 mới 7%. Nếu kế toán thêm dòng 7% từ 16/11 mà QUÊN ghi hạn cho dòng 5%, kết quả
vẫn như vậy (tháng 12 cả hai dòng hiệu lực ngày 1/12 → dòng mới nhất 7%). Một mức tạm thời lồng
trong một dòng không hạn được áp khi nó **bắt đầu từ ngày 1** của tháng (VD 7% từ 01/11 tới 30/11
→ tháng 11 hưởng 7%). Mức tạm thời bắt đầu giữa tháng (VD 10/11–30/11) KHÔNG được áp tháng đó
(ngày 1/11 dòng không hạn đang hiệu lực) — chỉ có lưu ý trùng mã.
Không bao giờ lũy tiến một mã hai lần. Tháng có dòng bị bỏ vì trùng mã: LƯU Ý.
(Chế độ "Phủ trọn cả tháng" khác: nếu dòng cũ có hạn giữa tháng thì tháng đổi mức cả hai dòng đều
không phủ trọn nên không hưởng mức nào — kế toán cần biết điều này nếu chọn chế độ đó. Nếu dòng cũ
để không hạn thì nó vẫn phủ trọn tháng đổi mức, tháng đó hưởng mức cũ.)

## 8. Chọn ưu đãi thường khi vượt số lượng (Quy tắc 2)

Làm lại **mỗi tháng**, trên các dòng thường còn lại sau 7.2:

- "% lớn nhất trước" (mặc định): xếp p giảm dần; bằng nhau thì dòng nhập trước đứng trước.
- "Theo thứ tự nhập": đúng thứ tự nhập.
- Giữ `so_luong_toi_da(m)` dòng đầu.

**[GIẢ ĐỊNH G6]** Mặc định giữ % lớn nhất — có lợi nhất cho gia đình.
Nhóm riêng: giữ **mọi** dòng đủ điều kiện (sau 7.2), không tính vào số lượng.

## 9. Tính % và tiền

```
pt_thuong      = 1 − Π(1 − p)   trên các dòng thường ĐƯỢC GIỮ    (không có: 0)
pt_thuong_tran = MIN(pt_thuong, tran(m))
nếu không có dòng riêng đủ điều kiện:   pt_tong = pt_thuong_tran
ngược lại:
    he_so_rieng = Π(1 − p)   trên các dòng riêng đủ điều kiện
    tran_rieng  = MAX(tran)  của các dòng riêng đủ điều kiện
    pt_tong     = MIN( 1 − (1 − pt_thuong_tran) × he_so_rieng ,  MAX(tran_rieng, pt_thuong_tran) )

truoc_lam_tron = ROUND(hp(m) × (1 − pt_tong), 2)
phai_thu(m)    = ROUND(truoc_lam_tron / DON_VI, 0) × DON_VI       "Làm tròn thường"
               = ROUNDDOWN(truoc_lam_tron / DON_VI, 0) × DON_VI   "Làm tròn xuống"
tien_giam(m)   = hp(m) − phai_thu(m)
phai_thu_ky    = Σ phai_thu(m) trên các tháng trong_ky      (0 nếu không đến kỳ)
```

- ROUND làm tròn nửa **ra xa số 0** (như Excel), trên biểu diễn thập phân 15 chữ số.
- **[GIẢ ĐỊNH G8]** Trần so với % **đã lũy tiến** (10% + 5% → 14,5%).
- **[GIẢ ĐỊNH G7]** Chính sách riêng là tầng thứ hai, không bao giờ làm tổng thấp hơn trước khi
  áp. Riêng mà không làm tổng tăng: LƯU Ý của tháng "không có tác dụng".
- **[GIẢ ĐỊNH G9]** Làm tròn **một lần** cho mỗi tháng rồi mới cộng kỳ (không làm tròn sau
  từng bước lũy tiến — có thể lệch 1 đơn vị so với trừ tay từng bước).
- **[GIẢ ĐỊNH G10]** Chỉ học phí; không áp tiền ăn, tiền xe (Đ199).

## 10. Danh sách LỖI (chặn) và LƯU Ý

**LỖI toàn cục** (chặn mọi bé): `thang_ky` trống/không phải ngày; `che_do_hieu_luc`,
`che_do_chon`, `cach_lam_tron` không hợp lệ; `don_vi_lam_tron` không phải số hoặc < 1.

**LỖI của bé** (chặn bé đó):
- mã bé dạng số, toàn dấu cách, hoặc có dấu cách ở đầu/cuối; mã bé trùng (không phân biệt hoa/thường) — chặn mọi bé mang mã đó;
  (dòng bé có dữ liệu mà mã trống: không có kết quả, LƯU Ý TOÀN CỤC);
- chu kỳ gõ không hợp lệ (mục 3.1);
- `goi` trống / không có trong biểu phí / gói có dòng biểu phí lỗi; tháng thuộc kỳ không có giá;
- chỉ có một trong `goi_moi`/`doi_goi_tu`; `doi_goi_tu` không phải ngày; `goi_moi` không có trong
  biểu phí hoặc có dòng lỗi;
- `ngay_nhap_hoc` trống hoặc không phải ngày;
- `ma_qd` trống / không có / dòng QĐ lỗi / mã QĐ trùng;
- `thang_moc2`, `da_dong_den`, `ngay_nghi` có mà không phải ngày hợp lệ (mục 1.2);
- `so_luong_moc2` riêng không phải số nguyên ≥ 0; `tran_moc2` riêng không phải số trong [0,1];
- có dòng gán của bé bị lỗi (xét MỌI dòng của bé, kể cả ngoài cửa sổ): thiếu `ma_uu_dai`;
  mã ưu đãi dạng số; mã không có trong danh mục; mục danh mục của mã đó lỗi; p không có /
  không phải số / ngoài [0,1]; `tu_ngay`/`den_ngay` có mà không phải ngày; `tu > den`;
  `tran_rieng` dòng có mà không phải số trong [0,1];
- quá 6 dòng thường hoặc quá 2 dòng riêng trong cửa sổ (xét cả bé chưa đến kỳ — cửa sổ [N, E] vẫn có);
- đến kỳ mà `Lk` > 15 (quá sức chứa của file, G21).

**Lỗi của dòng biểu phí**: mã dạng số, toàn dấu cách, hoặc có dấu cách ở đầu/cuối; `hoc_phi_thang` trống, không phải số hoặc < 0;
`ap_dung_tu` có mà không phải ngày; hai dòng cùng mã gói và cùng tháng bắt đầu (kể cả cùng
trống).
**Lỗi của dòng QĐ**: mã dạng số, toàn dấu cách, hoặc có dấu cách ở đầu/cuối; trường số trống/sai kiểu/ngoài khoảng (mục 5).
**Lỗi của mục danh mục**: mã dạng số, toàn dấu cách, hoặc có dấu cách ở đầu/cuối; mã trùng; `loai`/`ap_cho_moc`/`ap_cho_chu_ky` có mà
không hợp lệ; `phan_tram` có mà không phải số trong [0,1]; `tran_rieng` có mà không phải số
trong [0,1].

**LƯU Ý** (không chặn): chu kỳ trống / 1 tháng không phải con GV (mục 3.1); kỳ lẻ; còn nợ
từ tháng N (đợt này thu gộp); ô "đã đóng hết tháng" trống (G22) hoặc xa hơn một kỳ; đã đóng dư
khi nghỉ học; dòng ưu đãi trùng mã bị bỏ (7.2), riêng trường hợp hai dòng cùng mã cùng `diem` (thứ tự dòng quyết định) có lưu ý chỉ rõ; đổi gói đã qua (`doi_goi_tu` ≤ N — mục 4); gia hạn mốc 1 mà ưu đãi "Mốc 1" hết hạn trước (có `thang_moc2` nhập tay và một dòng gán trong cửa sổ, `ap_cho_moc` = "Mốc 1", có `den` trước ngày cuối của tháng liền trước THANG_MOC2); kỳ vắt qua tháng 9; học phí tháng bằng 0; chưa gán
ưu đãi chu kỳ (G4); dòng ưu đãi đủ điều kiện nhưng bị bỏ vì vượt số lượng; chạm trần; chính
sách riêng không có tác dụng.

---

## Định dạng kịch bản kiểm thử (JSON) — dùng chung cho file Excel và bản tham chiếu

```json
{
  "ten": "mô tả ngắn",
  "cau_hinh": {"thang_ky": "2027-10-01", "che_do_hieu_luc": "Trùng ít nhất 1 ngày",
               "che_do_chon": "% lớn nhất trước", "don_vi_lam_tron": 1000,
               "cach_lam_tron": "Làm tròn thường"},
  "quyet_dinh": [{"ma":"QD1","ten":"…","so_thang_moc1":12,"so_luong_moc1":3,"tran_moc1":0.30,
                  "so_luong_moc2":2,"tran_moc2":0.20}],
  "bieu_phi":   [{"ma":"MAM","ten":"Mầm","hoc_phi_thang":6000000,"ap_dung_tu":null}],
  "danh_muc":   [{"ma":"CU_DAN","ten":"Cư dân","loai":"Chung","phan_tram":0.05,
                  "ap_cho_moc":"Cả hai","ap_cho_chu_ky":"Mọi chu kỳ","tran_rieng":null}],
  "be":         [{"ma":"B1","ten":"Bé A","goi":"MAM","con_gv":"Không","chu_ky":"Quý",
                  "ngay_nhap_hoc":"2025-09-05","ma_qd":"QD1","thang_moc2":null,
                  "so_luong_moc2":null,"tran_moc2":null,"da_dong_den":"2027-09-30","ngay_nghi":null,
                  "goi_moi":null,"doi_goi_tu":null,
                  "co_so":"Cơ sở 1","nhom_lop":"Mầm 1"}],
  "uu_dai":     [{"ma_be":"B1","ma_uu_dai":"CU_DAN","phan_tram":null,
                  "tu_ngay":null,"den_ngay":"2027-10-31","tran_rieng":null}]
}
```

Khoá thiếu = trống. Giá trị sai kiểu được giữ nguyên để thử (VD `"tran_moc1": "30%"`).

**Kết quả** — một mục cho mỗi bé trong `be` có mã không trống. Khoá kết quả là mã y như
nhập. Hai bé mã khác nhau chỉ ở hoa/thường là hai khoá khác nhau (và cả hai bị chặn vì trùng
mã). Hai bé mã giống hệt nhau: một khoá, `tinh_duoc=false`.

```json
{ "B1": { "tinh_duoc": true, "den_ky": true, "chu_ky": "Quý",
          "ky_tu": "2027-10", "ky_den": "2027-12",
          "thang": [ {"thang":"2027-10","trong_ky":true,"moc":2,"hoc_phi":6000000,
                      "pt_thuong":0.05,"pt_thuong_tran":0.05,"pt_tong":0.05,
                      "phai_thu":5700000,"ap":["CU_DAN"]}, … đúng Lk phần tử: các tháng của kỳ … ],
          "phai_thu_ky": 17100000,
          "loi": ["…"], "luu_y": ["…"] } }
```

- `ky_tu` = N; `ky_den` = E (null nếu E < N). `chu_ky` = chu kỳ áp dụng.
- `ap` = mã các dòng được áp trong tháng (thường được giữ + riêng đủ điều kiện), viết như
  trong dòng gán, mỗi mã một lần.
- `tinh_duoc=false`: `phai_thu_ky` = null; `thang` có thể rỗng.
- `tinh_duoc=true` mà `den_ky=false`: `thang` = [] và `phai_thu_ky` = 0.

**So sánh:** luôn so `tinh_duoc`. Nếu cả hai `tinh_duoc=true`: so tuyệt đối `den_ky`, `chu_ky`,
`ky_tu`, `ky_den`, `phai_thu_ky`, số phần tử của `thang`, và với từng tháng của kỳ: `thang`, `trong_ky`, `moc`, `hoc_phi`,
`phai_thu`, `ap` (như tập hợp, không phân biệt hoa/thường); `pt_*` sai số 1e-9. Câu chữ của
`loi`/`luu_y` không so.
