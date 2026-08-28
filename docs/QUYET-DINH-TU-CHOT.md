# Những chỗ tôi tự quyết — chờ nhà trường xem lại

Tệp này ghi **mọi điểm cần người quyết mà tôi đã tự chọn một hướng** trong đợt
dọn tồn đọng sau GĐ 2. Người dùng bảo *"làm theo hướng anh thấy tốt nhất, nhưng
lưu lại để báo"* — đây là chỗ lưu.

**Cách đọc:** mỗi mục có ba phần — *chọn gì*, *vì sao*, và *đổi hướng thì tốn
gì*. Vế thứ ba quan trọng nhất: nó nói cho anh biết quyết định nào còn rẻ để
đảo, quyết định nào đã đắt.

Mục nào anh thấy sai thì nói, tôi sửa. Không nói gì thì mặc định là đồng ý.

---

## 1. "Hôm nay" của app đóng cứng theo giờ Việt Nam (UTC+7)

**Chọn:** `lib/ngay.js` trả ngày theo múi giờ +7 cố định, KHÔNG lấy giờ máy chủ,
KHÔNG đọc biến môi trường `TZ`.

**Vì sao:** trường ở Việt Nam, cả ba cơ sở — không có tình huống nào một múi giờ
khác là đúng. Giờ máy chủ thì đổi âm thầm khi app dọn từ Render Singapore về VPS
trong nước (mục N7), và một lần dọn nhà là lệch ngày cả trường mà không ai phát
hiện tới cuối tháng. Việt Nam không có giờ mùa hè và giữ UTC+7 từ 1975, nên một
con số cố định là đúng chính xác chứ không phải xấp xỉ cho tiện.

**Đổi hướng thì tốn gì:** rẻ. Sửa đúng một dòng `LECH_PHUT` trong `lib/ngay.js`.

---

## 2. Ảnh Cambridge: mặc định coi như CÓ mặt bé

**Chọn:** thêm ô tích *"Ảnh không có mặt bé nào"* cho văn phòng, **mặc định
không tích**. Không tích thì ảnh áp luật ảnh nhóm: trong phạm vi bài có nhà nào
đã nói không chia sẻ ảnh thì ảnh giữ lại với mọi gia đình.

**Vì sao:** bản vá đầu của tôi không có ô này — chỉ ẩn ảnh khi trong phạm vi có
nhà nói không. Chạy thử trên dữ liệu mẫu (một nhà trong hai mươi nhà nói không,
đúng như trường thật) thì **mọi ảnh Cambridge biến mất vĩnh viễn**. Đó không
phải "tạm ẩn", đó là gỡ bỏ tính năng. Album không dính bẫy đó vì có đường ra: cô
gắn thẻ bé. Ở đây đường ra là câu hỏi "ảnh này có mặt bé không" — người vừa tải
ảnh lên chính là người biết câu trả lời.

**Mặc định nằm ở phía đóng**, vì quên tích thì phải quên theo hướng giữ ảnh lại.

**Đổi hướng thì tốn gì:** vừa. Nếu trường muốn gắn thẻ bé cho ảnh Cambridge
giống Album thì phải thêm bảng và thêm màn gắn thẻ — một hạng mục riêng.

**Cần trường trả lời:** tờ Home Connection thực tế có kèm ảnh mặt bé không, hay
chỉ giáo cụ và tranh chủ điểm? Nếu chỉ giáo cụ thì ô tích này gần như luôn được
tích, và có thể đảo mặc định lại cho đỡ một thao tác.

---

## 3. Nhập danh sách: nhóm trùng tên thì HỎI, không đoán

**Chọn:** ban giám hiệu nhập tệp mà tên nhóm có ở nhiều cơ sở thì app **báo lỗi
dòng đó** và đòi ghi rõ cột *Cơ sở*. Tệp mẫu có sẵn cột đó.

**Vì sao:** bản cũ lấy nhóm nào ra trước thì lấy, nên tệp của cơ sở 2 đổ trẻ vào
nhóm trùng tên của cơ sở 1 — im lặng, và không ai phát hiện cho tới khi phụ
huynh hỏi vì sao con mình có trong danh sách một cơ sở khác.

**Chỗ tôi đã đổi ý giữa chừng:** bản đầu tôi CHẶN luôn việc tạo nhóm mới khi
chưa rõ cơ sở. Nó làm đỏ 13 bài của bộ nhập danh sách — chặn sai chỗ, vì đường
nhập danh sách đầu năm là đường trường dùng nhiều nhất. Đã bỏ chốt đó; nhóm chưa
gắn cơ sở vẫn tạo được, và màn Quản trị đã có sẵn một dòng đếm nhắc.

**Đổi hướng thì tốn gì:** rẻ.

---

## 4. Màn "Hồ sơ con đã ra trường" — tắt sẵn, và gỡ phần điểm số

**Chọn:** đặt `defaultEnabled: false`, đồng thời gỡ hẳn phần in điểm từng môn
khỏi màn hình của gia đình. Dữ liệu giữ nguyên, bật lại được bất cứ lúc nào.

**Vì sao:** phân hệ này là của app 1 và nó đang **BẬT SẴN cho mọi gia đình**.
Màn của nó dựng mục "Học bạ", "Học kỳ", và in điểm từng môn — đúng thứ QUY TẮC 4
cấm, ngay trên màn hình phụ huynh. Cùng cách xử lý với Nhận xét hằng ngày và Xe
buýt (A2).

**Đổi hướng thì tốn gì:** rẻ để bật lại. Nhưng phần điểm số thì tôi đã gỡ khỏi
màn hình — muốn có lại phải viết lại, và nó vẫn sẽ va vào QUY TẮC 4.

**Cần trường trả lời:** gia đình có con đã ra trường cần xem lại những gì? Hiện
màn đó còn chuyên cần, lời cô nhận xét, và sổ liên lạc — nếu trường muốn thêm
câu chuyện học tập từ phân hệ Hành trình thì làm được, nhưng phải nói rõ.

---

## 5. Con số món nợ của bộ canh QUY TẮC 4 được phép TĂNG một lần

**Chọn:** hai tệp Học bạ tăng nợ 1 → 6 và 4 → 9, kèm một mục canh mới khoá cứng
**danh sách tệp** (chỉ được ngắn đi, không bao giờ dài ra).

**Vì sao:** luật bánh cóc nói con số chỉ được giảm. Nhưng lần này con số tăng vì
**cái thước dài ra**, không phải vì nợ phình ra: tôi thêm dấu hiệu bắt điểm số
viết bằng tên trường dữ liệu (`m.score`) — thứ trước đây lọt hết vì nó không tự
gọi tên mình. Không một dòng vi phạm mới nào được viết.

Để chỗ nới này không thành cửa sau, danh sách TỆP bị khoá: một tệp mới xuất hiện
trong sổ nợ nghĩa là có vi phạm thật, và mục [1] bắt nó trước.

**Đổi hướng thì tốn gì:** rẻ — hạ số xuống bất cứ lúc nào sau khi gỡ N3.

---

## 6. Sửa hai bài trong nhóm test BẤT KHẢ XÂM PHẠM

**Chọn:** thêm **một dòng dựng bối cảnh** vào `test/lo-hong-da-va.test.mjs` (bật
tường minh phân hệ `hocsinhcu` vừa tắt sẵn). KHÔNG bỏ, không nới một phép kiểm
nào.

**Vì sao:** tệp đó canh những lỗ hổng ĐÃ VÁ bên trong phân hệ, và lỗ hổng không
biến mất vì phân hệ đang tắt — trường bật lại là nó quay về. Chính tệp đó đã có
sẵn tiền lệ ở đầu tệp cho `nenep` và `nhanxet`.

**Anh đã duyệt trước** phần "siết chặt, không gỡ" cho các mục 2, 5, 7, 10. Mục
này không nằm trong bốn mục đó, nên tôi ghi riêng ra đây.

**Đổi hướng thì tốn gì:** rẻ.

---

## 7. Kho `pichu124/School` (app 1) — chưa đụng vào

**Chọn:** mở **sổ nợ** trong `docs/LOI-NEN-CHUNG.md` với 4 món, chưa trả món
nào.

**Vì sao:** anh nói kho đó chưa có dữ liệu thật và hỏi tôi nên làm thế nào. Đề
nghị của tôi: **gắn vào ở chế độ ĐỌC trước** để xác nhận app 1 có thật sự dính
từng lỗi hay không, rồi mới vá và **mở PR chứ không gộp**. Ghi sổ sai còn tệ hơn
sổ trống, mà hiện tôi chưa mở kho đó nên chưa biết chắc.

**Bốn món đang nợ:** `.dockerignore` để hồ sơ trẻ lọt vào ảnh Docker · khôi phục
dữ liệu chạy được khi máy chủ đang chạy · `/healthz` lộ thông tin vận hành ·
bộ canh dữ liệu bỏ lọt tệp mà `restore.js` sinh ra.

**Cần anh gật:** có gắn kho app 1 vào không, và ở mức nào.

---

## 8. Hàng đợi Ghi nhanh đẩy đi ngay khi app mở

**Chọn:** gắn máy nghe `online` ở **cuối `modules/thuchup/view.js`** (chạy lúc
tệp được nạp), không phải trong `render()`. Cố ý KHÔNG đụng `public/js/app.js`.

**Vì sao:** bản cũ chỉ đẩy hàng đợi khi cô mở đúng màn Ghi nhanh — cô chụp lúc
mất sóng rồi cả ngày không quay lại màn đó thì bài ghi nằm im. Đó là hỏng đúng
thứ phép thử quyết định của GĐ 0 đang đo.

`public/js/app.js` là tệp dùng chung; sửa nó phải là commit riêng, và một phân hệ
cắm thêm thì không được quyền bắt cả app biết về mình.

**Đổi hướng thì tốn gì:** rẻ.

---

## 9. Nhật ký ngày: "Áp cho cả nhóm" mặc định KHÔNG ghi đè

**Chọn:** hỏi lại trước khi áp, mặc định chỉ điền ô còn trống, và giữ một nút
riêng để ghi đè cả nhóm khi cô thật sự muốn.

**Vì sao:** chép nguyên cách màn điểm danh đã làm (`markAll`) — màn đó đã trả giá
cho đúng bài học này. Cắt mất đường ghi đè thì lấy đi một thao tác cô đang cần
(cả nhóm ngủ cùng khung giờ), nên giữ cả hai.

**Đổi hướng thì tốn gì:** rẻ.

---

## 10. Đổi ngày/nhóm lúc đang gõ dở thì hỏi lại

**Chọn:** chỉ hỏi khi THẬT SỰ có thay đổi chưa lưu.

**Vì sao:** hỏi khi không có gì để mất thì lần thứ ba cô sẽ bấm "Đồng ý" theo
phản xạ, và lời hỏi thành vô dụng.

**Đổi hướng thì tốn gì:** rẻ.

---

## 11. Mất mạng thì giữ cô ở lại, không đá về màn đăng nhập

**Chọn:** app phân biệt *mất mạng* với *hết phiên*. Mất mạng thì hiện một màn
nói đúng chuyện đang xảy ra, có nút Thử lại, và **tự mở lại khi có sóng**. Đồng
thời nạp sẵn màn hình của phân hệ từ bản lưu trong máy, để hàng đợi Ghi nhanh
còn có người đẩy.

**Vì sao:** trước đây mọi lỗi lúc khởi động đều đưa về màn đăng nhập — mà màn
đăng nhập cũng phải gọi máy chủ. Cô đứng ở sân trường sóng yếu mở app ra là gặp
một màn hình không làm gì được, kể cả Ghi nhanh, đúng thứ cả GĐ 0 dựng lên để
hứa *"mất mạng vẫn ghi được"*.

**Chỗ tôi tự quyết mà đáng anh biết:** máy chỉ nhớ lại **địa chỉ mấy tệp .js của
phân hệ**, không nhớ một chữ nào về bé, về cô hay về trường. Điện thoại của cô
có thể là máy dùng chung ở lớp, nên tôi cố ý KHÔNG lưu danh sách bé để "xem
nguội" — dù làm vậy thì màn mất mạng sẽ hữu ích hơn. Có một bài test canh điều
này: nó quét sạch bộ nhớ trong máy và đòi không có tên bé nào ở đó.

**Đổi hướng thì tốn gì:** vừa. Muốn cô xem được danh sách bé lúc mất mạng thì
phải bàn riêng chuyện dữ liệu trẻ nằm lại trong máy bao lâu và xoá lúc nào.

---

## 12. Bộ canh mật khẩu mẫu nay soát cả "123456", không chỉ chuỗi đang cấu hình

**Chọn:** hai bộ canh (`server.js` và `scripts/kiem-tra-may-chu.js`) soát **cả
hai**: chuỗi trong `DEMO_PASSWORD` lẫn `"123456"`.

**Vì sao:** `render.yaml` đặt `DEMO_PASSWORD` bằng một chuỗi ngẫu nhiên. Bộ canh
chỉ so đúng chuỗi đó, nên mọi tài khoản còn giữ `"123456"` — bản khôi phục từ
sao lưu cũ, tài khoản tạo trước khi có biến này — đều lọt, và **bộ canh báo xanh
trong khi cửa vẫn mở**. Đây là kiểu hỏng tệ nhất của một bộ canh.

**Đổi hướng thì tốn gì:** rẻ.

---

## 13. `render.yaml` bị dán nhãn "chỉ để chạy thử"

**Chọn:** giữ tệp lại nhưng mở đầu bằng một khối cảnh báo: Render không có máy
ở Việt Nam, nên tệp này **không được dùng cho dữ liệu trẻ thật**. Đồng thời sửa
tên dịch vụ và ổ đĩa về `casa-mamnon`, và nâng ổ từ 1 GB lên 20 GB. Có bài test
canh: chừng nào còn `region: singapore` thì tệp phải còn cảnh báo.

**Vì sao:** xoá tệp đi thì mất luôn đường dựng bản chạy thử. Để nguyên thì người
triển khai sau tưởng dùng thật được — mà 1 GB ổ đĩa thì một tuần chụp ảnh là
đầy, và đầy ổ nghĩa là cô đăng ảnh giữa buổi thì hỏng. Dán nhãn là đường ở giữa,
và nó **canh được bằng máy**.

**Cần anh gật:** hướng đúng vẫn là VPS trong nước đứng tên trường (mục N7) — chỗ
này chỉ mua thời gian, không thay thế được.

---

## 14. Ảnh trong bản sao lưu nay được dọn — theo một luật cố ý dè dặt

**Chọn:** ảnh trong `backups/uploads` chỉ bị xoá khi **mọi bản sao còn giữ đều
được chụp SAU lúc tấm ảnh biến mất khỏi thư mục gốc**. Mốc "biến mất lúc nào"
ghi vào một sổ nhỏ (`backups/uploads-da-vang.json`).

**Vì sao:** vòng đời 7 ngày / 4 tuần / 12 tháng chỉ áp cho tệp `.db.gz`; ảnh thì
chép vào rồi nằm đó vĩnh viễn. Chỗ ảnh trong `DATA_DIR` luôn gấp đôi và chỉ
tăng, mà bản kế hoạch dự trù 80–160 GB ảnh cho ba cơ sở. Nhưng **dọn sai còn tệ
hơn không dọn**: xoá tấm ảnh mà một bản sao cũ còn nhắc tới là khôi phục về
album thủng lỗ, không lấy lại được. Nên luật ở trên sai về phía **giữ lâu hơn**,
và mốc ghi lại cũng luôn muộn hơn lúc xoá thật.

**Đổi hướng thì tốn gì:** rẻ — bỏ đoạn dọn đi là quay lại như cũ, không mất gì.

---

## 15. Lời từ chối chia sẻ ảnh tính theo "TỪNG HỌC", không theo ngày chụp

**Chọn:** ảnh chưa gắn thẻ của một nhóm bị ẩn với gia đình khác nếu **bất kỳ bé
nào TỪNG học nhóm đó** đã từ chối — kể cả bé đã chuyển nhóm hoặc đã ra trường.

**Vì sao:** bản cũ hỏi bằng hai điều kiện đều nói về hiện tại, nên sau mỗi lần
chuyển năm học thì lời từ chối **tự hết hiệu lực** và những tấm ảnh từng bị ẩn
hiện trở lại trong album năm cũ. Không ai bấm gì, không ai rút. Đó là kiểu rò rỉ
tệ nhất: im lặng, đúng hạn, không ai biết.

**Chỗ tôi tự quyết:** bảng lịch sử có sẵn cột *từ ngày – đến ngày*, nên tôi
**có thể** so theo đúng ngày chụp ảnh, chặt hơn hẳn. Tôi cố ý **không** làm vậy.
So theo ngày mà sai một ly là lộ ảnh trẻ; cách hiện tại sai về phía **ẩn thừa**,
và ẩn thừa thì cô gắn thẻ bé một lượt là ảnh hiện lại.

**Đổi hướng thì tốn gì:** rẻ, nhưng nên đợi tới khi trường dùng thật và thấy
đúng là có ảnh bị ẩn oan. Sửa vì lo xa ở đây là đổi phía an toàn lấy sự gọn gàng.

---

## 16. Gỡ hẳn lời hứa "thông báo đẩy", không làm nửa vời

**Chọn:** gỡ băng-rôn *"Bật để nhận thông báo kịp thời"* và nút *"Bật thông báo
đẩy"* trong Cài đặt. Thay bằng một dòng nói đúng sự thật: app chưa gửi được
thông báo ra ngoài, tin mới hiện khi mở app. Băng-rôn nay mời **cài app vào màn
hình chính** — thứ app làm được thật.

**Vì sao:** cả kho mã không có một dòng nào cho thông báo đẩy — không sự kiện
`push` trong service worker, không đăng ký, không khoá, không đường máy chủ. Gia
đình bấm đồng ý xong sẽ **không bao giờ** nhận được gì, kể cả khi cô báo con
sốt. Đây đúng bài học A5 (dặn thuốc): lời hứa sai tệ hơn thiếu tính năng, vì
người ta sẽ **thôi mở app ra xem** — họ tưởng có tin thì máy sẽ báo.

**Tôi chọn gỡ chứ không làm thật**, vì làm thật cần khoá VAPID, một chỗ lưu đăng
ký trên máy chủ, và một quyết định về việc gửi thông tin trẻ qua dịch vụ đẩy của
Google/Apple — chuyện thuộc nhóm dữ liệu nhạy cảm, phải hỏi nhà trường trước.

**Bộ canh mới:** `test/khong-hua-suong.test.mjs` không cấm làm thông báo đẩy. Nó
đọc `public/sw.js` rồi đòi hai thứ đi cùng nhau: **hễ còn xin quyền thì phải có
đường đẩy thật**. Ngày nào dựng xong, bài test tự nới ra, không cần sửa dòng nào.

**Cần trường trả lời:** có muốn thông báo đẩy thật không? Nếu có thì phải chấp
nhận tên bé / tiêu đề thông báo đi qua máy chủ của Google hoặc Apple.

**Đổi hướng thì tốn gì:** vừa. Băng-rôn và nút gỡ đi rồi thì viết lại nhanh,
nhưng phần đường đẩy thật là một hạng mục riêng.

---

## 17. Viết tài liệu triển khai MỚI cho app 2, không sửa hai tệp của app 1

**Chọn:** thêm `docs/TRIEN-KHAI.md` — chỉ gồm phần **không phụ thuộc vào việc
chọn máy chủ nào**, kèm một bảng ghi rõ *còn thiếu gì và vì sao*. Hai tệp
`CAP-NHAT-MAY-CHU.md` và `MAY-CHU-THU-ORACLE.md` giữ nguyên.

**Vì sao:** hai tệp cũ mô tả **máy chủ thật của app 1**, đang chạy cho ~300 học
sinh. Chúng vẫn đúng cho app 1. Sửa đường dẫn trong đó thành `casa-mamnon` là
làm hỏng tài liệu vận hành của một hệ thống đang sống — để lấy một tài liệu app
2 vẫn sai, vì app 2 chưa có máy chủ.

**Chỗ tôi cố ý dừng lại:** phần địa chỉ máy, tên miền, HTTPS, lệnh cài dịch vụ
và lịch cron — tôi **không viết**, và ghi thẳng lý do vào một bảng ở cuối tài
liệu. Viết trước khi biết chạy ở đâu thì chỉ là đoán, mà một tài liệu triển
khai đoán sai còn nguy hơn không có: người làm theo sẽ tin nó.

**Đổi hướng thì tốn gì:** rẻ. Chốt xong N7 thì phần còn lại viết trong một buổi.

---

## Còn chờ nhà trường trả lời (tôi không tự quyết được)

Những mục dưới đây tôi **cố ý không tự chọn**, vì chọn sai thì phải sửa lược đồ
hoặc phải làm lại quy trình — đắt hơn nhiều so với chờ một câu trả lời.

| # | Câu hỏi | Chặn việc gì |
|---|---|---|
| N7 | Đăng ký VPS Việt Nam + tên miền đứng tên trường | Chặn N1, N13, N14 và toàn bộ phần triển khai |
| N17 | Ba cơ sở nấu bếp chung hay nấu riêng? | Bảng `menus` đang là một thực đơn cho cả trường. Nấu riêng thì phải **thêm cột cơ sở trước**, mở đường ra trước là người sửa sau ghi đè người sửa trước, âm thầm, mỗi ngày |
| — | Duyệt bảng thuật ngữ 5 trạng thái đánh giá | Chữ đang dùng là đề xuất trong bản kế hoạch |
| — | Nội dung tờ Cambridge & Kết nối ở nhà gồm những gì | Lược đồ đang để rộng có chủ ý; chốt rồi mới thêm ô được |
| — | Mẫu báo cáo phòng GD yêu cầu | Chưa có mẫu thì không xuất đúng mẫu được |
| — | Chọn nhóm thí điểm, phát và thu giấy đồng ý | Ba cổng DỪNG của GĐ 0, GĐ 1, GĐ 2 đều đang chờ chỗ này |
