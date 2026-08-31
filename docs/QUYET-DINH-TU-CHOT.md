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

## 18. Ô "Khối 1–12" đổi thành ô chọn bậc, nhưng cột dữ liệu giữ nguyên

**Chọn:** hai biểu mẫu thêm/sửa nhóm nay có ô chọn **Nhà trẻ · Mầm · Chồi · Lá**
thay cho ô số 1–12. Cột `grade` ở tầng dữ liệu **không đổi** — vẫn là số.

**Vì sao:** mầm non không có khối 1–12, người của văn phòng khai nhóm mới phải
đoán điền số gì. Nhưng đổi cột dữ liệu là việc lớn và không cần: CLAUDE.md cho
phép giữ tên và kiểu cũ ở tầng dữ liệu, miễn màn hình nói đúng tiếng.

**Chỗ đáng anh biết:** khi mở biểu mẫu **sửa** một nhóm cũ, ô chọn hiện bậc đoán
theo **TÊN nhóm** (nhóm "Chồi 2" → Chồi), không theo con số cũ (dữ liệu mẫu để
Chồi 2 là `grade = 4`, số kế thừa từ app 1). Nghĩa là bấm Lưu mà không đổi gì
thì con số cũ **bị chuẩn hoá** về số bậc. Tôi thấy đây là đúng — đoán theo tên
là cách chính phần chuyển năm học đang làm — nhưng nó là một lần ghi đè âm thầm,
nên ghi ra đây.

**Đổi hướng thì tốn gì:** rẻ.

---

## 19. Cân đo: chặn số gõ nhầm bằng một khoảng CỐ Ý RỘNG

**Chọn:** máy chủ từ chối chiều cao ngoài **40–160 cm** và cân nặng ngoài
**2–60 kg**. Ô nhập gợi ý theo **tuổi thật của bé** thay cho "VD: 105 / VD: 17"
ghi cứng.

**Vì sao khoảng lại rộng đến thế:** đây là chỗ va vào QUY TẮC 4. Một trần hẹp
theo tuổi chính là app đang so bé với *"chuẩn của độ tuổi"* — thứ CLAUDE.md cấm.
Khoảng trên phủ trọn mọi bé 12 tháng – 6 tuổi có thật, **kể cả bé nhẹ cân hay
cao lớn khác thường**, nên nó chỉ bắt được thứ chắc chắn là gõ nhầm (170 cm cho
bé 3 tuổi, 12 cm vì thiếu một chữ số). Câu từ chối cũng nói về **chữ số**, không
nói một chữ nào về đứa trẻ, và có bài test canh đúng điều đó.

**Cùng lý do, tôi KHÔNG thêm dòng nào kiểu "bé tuổi này thường 103 cm"** nằm
cạnh con số thật. Chữ mờ trong ô trống thì biến mất ngay khi cô gõ — nó là gợi ý
nhập liệu. Một dòng chú thích nằm lại bên cạnh con số thì thành lời so sánh.

**Đổi hướng thì tốn gì:** rẻ để nới; **đắt để siết**, vì siết là bước sang phía
QUY TẮC 4 cấm, và phải hỏi nhà trường trước.

---

## 20. Dữ liệu mẫu của phân hệ TẮT SẴN trong kiểm thử, BẬT SẴN cho người dùng

**Chọn:** `npm run seed` sinh dữ liệu mẫu cho cả tám phân hệ mầm non. Bộ kiểm
thử thì tắt nó đi (`CASA_SEED_PHAN_HE=0`), trừ một bài duy nhất bật lên để canh
chính đường đó.

**Vì sao:** mọi bộ test phân hệ đều dựng trên nền *"phân hệ này chưa có dòng
nào"* — tự ghi rồi tự đếm. Đổ dữ liệu mẫu vào là hỏng hàng loạt phép kiểm, mà
đúng là những phép kiểm đáng giá nhất: ranh giới **nháp ↔ đã công bố** của một
quan sát, và ranh giới **nhà mình ↔ nhà khác**.

**Chỗ tôi đã đi sai rồi quay lại:** ban đầu tôi bẻ dữ liệu mẫu để né từng bài
test — chuyển kế hoạch của bé An sang nhóm khác, chuyển ba quan sát sang nhóm
nhà trẻ. Nó làm câu chuyện méo đi (bản kế hoạch đòi *"mở màn hình nào cũng gặp
lại đúng bé đó"*) mà vẫn hỏng lại ở bài test tiếp theo. Tách hai đường thì mỗi
đường được là chính nó.

**Cái giá phải trả, và cách tôi trả:** không bộ test nào đang chạy còn nhìn tới
đường sinh dữ liệu mẫu của phân hệ, nên nó có thể hỏng hoàn toàn mà cả bộ kiểm
thử vẫn xanh — đúng kiểu *"bài canh luôn đúng"*. Nên có `test:du-lieu-mau-phan-he`
bật nó lên và canh 34 điểm, trong đó có cả việc **chạy lại seed không nhân đôi
dữ liệu** và **không dòng nào trỏ vào bé đã bị xoá**.

**Đổi hướng thì tốn gì:** rẻ.

---

## 21. Ghi nhầm bé: ưu tiên CHUYỂN, xoá chỉ là đường sau

**Chọn:** thêm hộp thoại *"Ghi nhầm bé"* với hai đường ra, và đường **chuyển
sang đúng bé** đứng trước đường **xoá**. Ô chọn bé nay có dòng trống *"— Chọn
bé —"* nên không còn bé nào được chọn sẵn.

**Vì sao:** cú bấm nhầm thường gặp nhất là quên đổi tên bé trong ô chọn — và
lúc đó việc cô muốn làm là chuyển sang đúng bé, không phải gõ lại từ đầu. Trước
đây không có đường lùi nào: đường sửa không nhận `studentId`, và **không phân
hệ nào trong `modules/` có một `app.delete` nào cả**.

**Ba quyết định nhỏ bên trong, cả ba đều nghiêng về phía an toàn:**

1. **Chuyển bé thì câu chuyện đã công bố bị THU LẠI.** Gia đình bé cũ đã đọc
   rồi; để nguyên trạng thái công bố là đưa câu chuyện của bé này sang nhà bé
   kia. Cô công bố lại nếu vẫn muốn kể.
2. **Kiểm quyền hai lần**, cho cả bé cũ lẫn bé mới. Chỉ kiểm bé cũ thì đây
   thành đường chuyển một quan sát sang nhóm mà cô không dạy.
3. **Ảnh được dọn khi xoá** — và chỉ khi không bản ghi nào khác còn dùng tới
   nó. `uploads.remove` có ở dontra, cambridge, albums nhưng **không** ở hai
   phân hệ này, nên ảnh khuôn mặt trẻ vẫn nằm trên ổ đĩa sau khi bản ghi đã
   biến mất khỏi màn hình. Đó mới là phần đáng lo, không phải dung lượng.

**Đổi hướng thì tốn gì:** rẻ. Nếu trường muốn "xoá là ẩn đi chứ không xoá hẳn"
(giữ lại để tra khi có khiếu nại) thì đổi được, nhưng phải bàn: giữ lại một
quan sát sai bé nghĩa là giữ lại ảnh của một đứa trẻ trong hồ sơ đứa trẻ khác.

---

## 22. Gia đình RÚT được đồng ý trong app, nhưng KHÔNG tự đồng ý được

**Chọn:** thêm thẻ *"Giấy đồng ý của gia đình"* vào màn hồ sơ bé cho phụ huynh.
Họ xem được đã ký gì, ai ký, ký ngày nào — và **rút lại ngay trên màn hình**.
Nhưng chiều ngược lại thì máy chủ từ chối: muốn **đồng ý** phải nhờ văn phòng.

**Vì sao lệch hai chiều như vậy:**

*Đồng ý* là một tờ giấy **có chữ ký**. Nếu bấm một nút trong app cũng ghi được
"đã đồng ý" thì nhà trường sẽ có một bản ghi đồng ý mà **không chữ ký nào đứng
sau** — và lúc có chuyện thì không ai chứng minh được gia đình đã đồng ý thật.
Chữ ký là thứ bảo vệ cả hai bên, không phải thủ tục thừa.

*Rút lại* thì ngược hẳn. Nghị định 13/2023 nói rút lại là **quyền** của chủ thể
dữ liệu, và một quyền thì không được đặt điều kiện thủ tục lên nó. Trước đây
gia đình muốn rút phải **gọi điện cho văn phòng** — trên thực tế đó là một
quyền khó dùng, nhất là với chuyện ảnh của con.

**Ba chi tiết nhỏ, cả ba đều cố ý:**

- Rút xong có hiệu lực **ngay** — luật lọc ảnh đọc đồng ý đúng lúc hiển thị,
  nên không phải chờ ai làm gì. Có phép kiểm cho đúng điều đó.
- **Cô cũng không rút hộ được.** Đây là quyền của gia đình, không phải việc của
  cô; và câu từ chối chỉ thẳng chỗ văn phòng phải làm.
- Màn hình giữ **ba trạng thái**, không phải hai: *Đã đồng ý* · *Không đồng ý* ·
  **Chưa nộp giấy**. Gộp hai cái sau lại là hoặc vu cho gia đình đã từ chối,
  hoặc coi im lặng là đồng ý.

**Đổi hướng thì tốn gì:** rẻ. Nếu trường muốn gia đình đồng ý được ngay trong
app (ví dụ có chữ ký điện tử), phần đó thêm vào được — nhưng đó là một hạng mục
riêng và phải bàn về giá trị pháp lý của chữ ký trước.

## 23. Nén ảnh: một bản dùng chung, và chọn tuỳ chọn có tên thay vì tham số vị trí

**Chọn:** gom năm bản hàm nén ảnh về `UI.nenAnh(file, { canhToiDa, chatLuong })`
trong `public/js/ui.js`, và giữ nguyên năm bộ số cũ ở từng chỗ gọi.

**Vì sao không nhân dịp này thống nhất luôn một bộ số:**

Năm bộ số ấy khác nhau có lý do, không phải do viết ẩu:

| Màn hình | Cạnh dài | Chất lượng | Vì sao |
|---|---|---|---|
| Album | 1600 | 0.82 | ảnh gia đình xem lại nhiều năm sau |
| Cambridge | 1400 | 0.82 | ảnh tờ bài học, có chữ, mờ là không đọc được |
| Hành trình | 1280 | 0.82 | ảnh minh chứng kèm quan sát |
| Ghi nhanh | 1280 | **0.75** | phải nằm chờ trong máy lúc mất mạng |
| Đón trả | **640** | 0.82 | ảnh để nhận mặt người đón, không phải để in |

Ép cả năm về một số là hoặc làm nặng thêm hàng đợi ngoại tuyến của Ghi nhanh,
hoặc làm mờ ảnh album. Việc phải gom là **mã**, không phải **số**.

**Vì sao tuỳ chọn có tên, không phải `nenAnh(f, 1280, 0.75)`:**

Đọc lại sau ba tháng thì không ai đoán ra số nào là cạnh, số nào là chất lượng.
`{ chatLuong: 0.75 }` thì đọc là hiểu, và thiếu một tuỳ chọn cũng không sai chỗ.

**Cái được thêm mà không ai đòi:** ba trong năm bản cũ (Cambridge, Hành trình,
Đón trả) không xoay ảnh theo chiều máy ảnh đã chụp. Bản dùng chung có, nên ảnh
dọc chụp bằng điện thoại thôi lên màn hình gia đình ở tư thế nằm ngang.

**Lý do thật sự đáng gom, và cũng là lý do có bộ canh riêng:** vẽ lại ảnh qua
canvas rồi `toDataURL` là bước **duy nhất** bỏ được toạ độ GPS nhúng trong ảnh
gốc. Ảnh trẻ chụp trong lớp mà còn kèm toạ độ trường là thứ không được để lọt.
Bản chép thứ sáu nào gửi thẳng tệp gốc lên máy chủ sẽ **không bộ test nào khác
bắt được** — nên `test/khe-uoc.test.mjs` đọc thẳng mã nguồn: ngoài
`public/js/ui.js`, không tệp nào chạy trên máy người dùng được tự dựng canvas
hay tự gọi `toDataURL`.

**Đổi hướng thì tốn gì:** rẻ, vì giờ chỉ còn một chỗ. Nhận ảnh HEIC của iPhone,
hạ trần dung lượng sau khi đo số thật ở nhóm thí điểm — đều sửa một chỗ.

## 24. Nháp Nhật ký ngày: HỎI cô, không tự điền đè

**Chọn:** phần cô gõ dở trong Nhật ký ngày được cất vào máy (`localStorage`,
khoá theo **nhóm + ngày**, hạn 24 giờ). Mở lại app thấy có nháp thì hiện một
dải nhắc với hai nút *Điền lại phần dở* / *Bỏ phần dở* — **không tự điền**.

**Vì sao không tự điền, dù tự điền tiện hơn:**

Một nhóm có **nhiều cô**. Trong lúc bản nháp nằm trong máy cô A, cô B có thể đã
ghi và lưu từ máy của mình. Tự điền đè là lấy bản cũ của cô A ghi chồng lên bản
mới của cô B ngay ở lần bấm Lưu tiếp theo — âm thầm, và không ai biết. Đây đúng
là kiểu mất dữ liệu mà Nguyên tắc số 1 cấm.

Một dải nhắc tốn của cô một cú bấm. Ghi đè mất của cô B cả buổi làm.

**Vì sao vẫn cần, dù đã có lời hỏi khi đổi ngày:**

Lời hỏi (Đ8) chỉ đỡ được chỗ **chạm nhầm ô ngày**. Nó không đỡ được thứ hay xảy
ra hơn trên điện thoại: có người gọi tới, cô chuyển sang app khác, hệ điều hành
đóng trình duyệt để lấy bộ nhớ. Chỉ tiêu của bản kế hoạch là *cả nhóm dưới 5
phút*, nghĩa là luôn có tới năm phút công việc chỉ nằm trong DOM.

**Ba chi tiết cố ý:**

- **Chỉ nhắc khi nháp KHÁC dữ liệu máy chủ vừa trả về.** Trùng khít thì nó đã
  được lưu rồi; nhắc lúc đó là dạy cô bỏ qua mọi lời nhắc sau này.
- **Hạn 24 giờ.** Nhật ký là của đúng một ngày; một bản nháp ba hôm trước không
  còn là thứ cô muốn điền lại.
- **Lưu xong thì dọn nháp ngay.** Giữ lại là lần mở sau app nhắc một phần dở
  không còn dở nữa.

**Chỗ hở đã biết:** nháp ghi theo (nhóm, ngày), mà app mở lại luôn về ngày hôm
nay. Nếu cô đang ghi cho **hôm qua** lúc app bị đóng, dải nhắc chỉ hiện khi cô
quay lại đúng ngày đó. Nháp không mất, chỉ là không tự đập vào mắt.

---

## 25. Ghi sổ tiền là việc của văn phòng — cô không tạo, không xác nhận

**Chọn:** hai đường ghi của phân hệ Học phí (`POST /api/hocphi` và
`POST /api/hocphi/:id/xac-nhan`) đổi từ `requireRole('teacher', 'admin')` thành
`requireRole('admin')`. Màn hình bỏ nút *Tạo khoản* và *Xác nhận* với vai cô.
**Đường ĐỌC giữ nguyên** — cô vẫn mở được sổ tiền của bé nhóm mình.

**Vì sao đổi:**

App 1 là trường tiểu học, ở đó cô chủ nhiệm thu tiền là chuyện thường. App 2 thì
tầng chức vụ đã đặt **Kế toán** lo học phí và tiền ăn, và đợt Y3 đã tách rõ *"cô
chốt suất, kế toán đối chiếu"*. Để cô vừa tạo khoản vừa tự xác nhận đã nhận tiền
là để **một người vừa ghi sổ vừa duyệt sổ** — sai sót ở đó không ai đối chiếu ra,
và khi có chuyện thì người đứng lớp là người phải giải trình về tiền.

**Vì sao KHÔNG siết luôn đường đọc:**

Vì cắt đường đọc là cô không trả lời được câu *"nhà em đã nộp chưa cô"* ở cổng
trường, và gia đình phải gọi lên văn phòng cho một việc lẽ ra hỏi một câu là
xong. Siết chỗ **ghi**, không siết chỗ **biết**.

**Đây là đổi CHÍNH SÁCH, không phải vá lỗi — nên KHÔNG mang sang app 1.**

`modules/hocphi/` sinh ra trước điểm tách `bc9dfa3`, tức app 1 có cùng đoạn mã.
Nhưng ở app 1 cô đang thu tiền thật cho ~300 gia đình; đổi vai bên đó mà nhà
trường chưa nói gì là **làm hỏng việc đang chạy**. Đã ghi rõ ở
`docs/LOI-NEN-CHUNG.md` để người sang kho kia sau này không "vá giúp" nhầm.

**Đảo ngược được:** đổi hai chữ `'admin'` về `'teacher', 'admin'` trong
`modules/hocphi/routes.js` và một dòng trong `view.js`. Dữ liệu không đụng tới.

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

### Một chỗ tôi thấy nhưng KHÔNG tự sửa: `UI.RATING`

`public/js/ui.js` còn hằng `UI.RATING` — ba mức **"Con làm rất tốt" / "Con làm
tốt" / "Cần cố gắng thêm"**, kế thừa từ app 1. Ba tệp còn gọi tới nó:
`views/remarks.js`, `views/hocsinhcu.js`, và `routes/remarks.js` (hằng `RATINGS`
với `great` / `good` / `needs_effort`).

**Vì sao tôi nêu:** ba mức xếp trên dưới về một đứa trẻ là đúng thứ QUY TẮC 4
cấm — chỉ khác là nó không dùng chữ "điểm" hay "xếp hạng" nên không bộ canh nào
bắt được, kể cả sau khi Đ25 mở rộng vùng quét tới `ui.js`.

**Vì sao tôi không tự sửa:**

1. `public/js/ui.js` là **tệp dùng chung** — luật là *chỉ được thêm, không đổi
   và không bỏ thứ đang có*.
2. Cả hai màn dùng nó (Nhận xét hàng ngày, Hồ sơ con đã ra trường) **đã tắt sẵn**
   từ A2 và Đ5, nên hôm nay không phụ huynh nào nhìn thấy ba mức đó.
3. Gỡ hẳn thuộc bước 2 của món nợ N3 — phần **không được duyệt**.

**Ba đường đi, tôi nghiêng về đường 2:**

| | Làm gì | Được | Mất |
|---|---|---|---|
| 1 | Để nguyên | Không tốn gì | Bật lại Nhận xét hàng ngày là vi phạm QUY TẮC 4 ngay, mà không bộ canh nào kêu |
| 2 | **Thêm một dấu hiệu cho bộ canh QUY TẮC 4 bắt được ba mức này, và ghi `ui.js` vào sổ nợ N3** | Từ nay không ai vô tình chép mẫu ba-mức sang chỗ khác | Phải nới luật "danh sách tệp nợ chỉ được ngắn đi" của `test/quy-tac-4.test.mjs` — mà đó là bộ canh bất khả xâm phạm, nên **phải hỏi** |
| 3 | Gỡ `UI.RATING` theo ba bước của luật tệp dùng chung | Sạch hẳn | Thuộc phần gỡ chưa được duyệt |

**ĐÃ CHỐT (Đ55, 30/08/2026) — làm đường 2, và làm được mà KHÔNG nới bộ canh cũ.**

Chỗ đắt của đường 2 là nó tưởng như bắt buộc phải nới luật *"danh sách tệp nợ
chỉ được ngắn đi"* của `test/quy-tac-4.test.mjs` — một bộ canh bất khả xâm
phạm. Nhưng không cần: thay vì ghi bốn tệp vào `NO_DA_BIET`, đợt này dựng một
**bánh cóc thứ hai** (`DAU_HIEU_BA_MUC` + `NO_BA_MUC` + mục `[2c]`), siết chặt
ngay từ lúc sinh ra và có phép kiểm riêng canh cho nó chỉ ngắn đi.

Bánh cóc cũ **không bị chạm một dòng nào** — mục `[2c]` còn có một phép kiểm
đòi đúng điều đó, để lần sau không ai gộp hai sổ nợ làm một rồi làm hỏng mục
`[2b]`.

Bốn tệp trong sổ nợ mới: `public/js/ui.js` (3 dòng), `public/js/views/remarks.js`
(4), `public/js/views/hocsinhcu.js` (1), `routes/remarks.js` (1). Gỡ hẳn vẫn
thuộc phần chưa được duyệt, và với `ui.js` thì còn phải đi đủ ba bước của luật
tệp dùng chung.

*Vì sao tự chốt:* anh dặn *"việc nào cần hỏi ý kiến thì làm theo hướng bạn
thấy tốt nhất, ghi lại rồi báo"*. Đường 2 là hướng tốt nhất vì nó không gỡ gì,
không nới gì, và từ nay không ai chép được mẫu ba mức sang chỗ mới mà bộ canh
im lặng.

---

## Đợt yêu cầu 30/08 của nhà trường — bốn quyết định tự chốt

Nhà trường gửi một ảnh 8 điểm và bảy tệp mẫu báo cáo. Bốn chỗ phải chọn hướng,
và cả bốn đều rơi đúng vào chỗ "làm theo yêu cầu thì đụng một quy tắc".

### 1. Thang năm bậc trên mẫu báo cáo giấy ↔ QUY TẮC 4

**Việc:** cả bảy tệp mẫu dùng thang M/S/W/N/NA. Hai bậc trên cùng của thang ấy
là hai lời khen so trẻ trên dưới nhau — đúng thứ QUY TẮC 4 cấm. Mà
`test:quy-tac-4` là nhóm bài **bất khả xâm phạm**.

| Đường | Được gì | Mất gì |
|---|---|---|
| 1 | Chép nguyên thang của trường | Phải nới bộ canh bất khả xâm phạm — tức đổi luật cho mã chạy qua |
| 2 | **Dùng lại năm trạng thái Hành trình học tập, hiện kèm chữ cái M/S/W/N/NA** | Báo cáo không còn hai từ khen chê ở hai bậc trên |
| 3 | Bỏ hẳn phần chọn mức, chỉ để ô chữ | Mất một nửa nội dung báo cáo học kỳ mà trường đang dùng thật |

**ĐÃ CHỐT: đường 2.** Năm bậc của trường khớp gần như một đối một với năm
trạng thái app đã dùng từ GĐ2‑A. Cô vẫn chạm đúng chữ cái quen tay, gia đình
vẫn đọc đúng một thứ như cô nhập, và không bộ canh nào bị nới. Thứ duy nhất bị
bỏ là hai từ khen chê — bỏ chúng thì báo cáo vẫn nói đủ điều nó cần nói.

**Chỗ cần nhà trường xác nhận:** hai từ ấy đã in trên tờ giấy phụ huynh đọc
nhiều năm. Nếu trường muốn giữ nguyên chữ, đó là một quyết định **đổi luật của
kho mã**, không phải một dòng cấu hình — và phải do người dùng duyệt.

### 2. Không tính BMI trong báo cáo

Mẫu giấy có cột BMI. App **giữ nguyên số đo** chiều cao, cân nặng (y tế trường
cần) nhưng **không in BMI** ra màn hình gia đình: BMI của trẻ dưới 6 tuổi chỉ
đọc được khi đặt cạnh biểu đồ tăng trưởng theo tuổi và giới. In trơ một con số
là mời người đọc tự so con mình với một cái chuẩn tưởng tượng — QUY TẮC 4.

*Đảo lại được:* nếu trường muốn có BMI, thêm một dòng vào phần soạn mẫu.

### 3. "Tự link qua báo cáo tháng" dừng ở chỗ MỜI

Nhà trường yêu cầu nhận xét cuối tháng *"tự link qua báo cáo tháng"*. Làm đúng
chữ "tự" là đổ thẳng chữ của lớp 1–2 (cô ghi cho mình và quản lý đọc) sang lớp
3 (báo cáo gửi gia đình) — đúng chỗ CLAUDE.md gọi là dễ rò rỉ nhất.

**ĐÃ CHỐT:** máy chủ mang chữ sang, màn hình hiện nút **"Chép câu này"**, cô
bấm thì mới vào ô, và cô sửa lại trước khi gửi. Một lượt bấm thêm, đổi lấy việc
không có chữ nào tự chảy từ sổ riêng của cô sang màn hình gia đình.

### 4. Mã phân hệ là `baocaohoctap`, không phải `baocao`

`baocao` đã là mã của Học bạ tiểu học — đúng phân hệ N3 nhà trường quyết giữ mã
lại nhưng tắt sẵn. Phân hệ mới đặt mã khác để hai thứ không bao giờ lẫn nhau,
và để bật cái này không vô tình bật cái kia.

### 5. Trần video 8 MB, và KHÔNG nới giới hạn thân yêu cầu của máy chủ

**Việc:** nhà trường muốn có video ("1 video quý hơn hàng trăm bức ảnh"). Video
**không nén được trong trình duyệt** như ảnh — `UI.nenAnh` vẽ lại ảnh qua canvas,
video không có đường tương đương chạy nổi trên điện thoại của cô. Nên trần phải
đặt bằng tay.

| Đường | Được gì | Mất gì |
|---|---|---|
| 1 | Trần cao (25–50 MB), nới `express.json` lên cho vừa | Cô quay thoải mái | **Nới một giới hạn đang che MỌI đường dẫn của app** để tiện cho một tính năng; và ổ đĩa trường đầy sau một học kỳ |
| 2 | **Trần 8 MB, giữ nguyên giới hạn 12 MB** | Không đụng gì tới bề mặt tấn công của các đường khác; dung lượng ước tính ≈ 3 GB một năm học | Video chỉ được 10–20 giây |
| 3 | Không làm video | Không tốn gì | Bỏ hẳn một yêu cầu nhà trường nêu rõ |

**ĐÃ CHỐT: đường 2.** Con số 8 MB không phải chọn tuỳ ý — nó là hệ quả của
`express.json({ limit: '12mb' })` trong `server.js`: tệp đi lên dưới dạng base64
nên phình thêm 33%, và 8 MB nhị phân thành khoảng 10,7 MB chữ, vừa lọt và còn
chỗ cho phần bọc JSON.

**Chỗ cần nhà trường biết:** 10–20 giây là đủ cho thứ nhà trường mô tả (một
khoảnh khắc con làm được việc gì đó), nhưng KHÔNG đủ cho một đoạn quay cả buổi
hoạt động. Muốn dài hơn thì phải đổi cách lưu — tải tệp theo luồng thay vì gửi
kèm trong JSON — và đó là một đợt việc riêng, không phải một dòng cấu hình.

**Ước tính dung lượng để nhà trường quyết:** ba cơ sở, mỗi nhóm một video mỗi
ngày học ≈ **3 GB một năm học**, đã tính cả phần sao lưu chép theo. Gói VPS nhỏ
nhất thường có 25–40 GB, nên vẫn thoải mái — nhưng đây là con số đầu tiên trong
cả app tăng theo GB chứ không theo MB, và nó đáng được nhìn trước khi bật.


---

### 6. Thêm một hàm vào tệp dùng chung để sửa lỗi ô chọn nhóm, thay vì chép ba lần

**Việc:** chạy thử bàn thử bằng tài khoản **cô nhóm Nhà trẻ 1** (chứ không phải cô
nhóm Chồi 2 như mọi lần trước) lộ ra một họ lỗi: bốn màn của cô đều tự đi tìm câu
trả lời cho "cô mở được nhóm nào", mỗi màn một kiểu, và ba trong bốn màn quên lọc
phần ô chọn. Cô mở màn ra thì đúng nhóm của mình, nhưng ô **"Nhóm"** vẫn liệt kê
cả bốn nhóm của trường — bấm vào nhóm không phụ trách là rơi thẳng vào màn *"Có
lỗi xảy ra"*. Riêng màn Báo cáo học tập còn lấy nhầm nhóm mặc định, nên cô Nhà trẻ
mở lên là hỏng ngay, chưa bấm gì cả.

| Đường | Được gì | Mất gì |
|---|---|---|
| 1 | Chép đoạn lọc ba dòng vào từng màn | Không đụng tệp dùng chung | **Bốn bản chép của cùng một quy tắc phân quyền** — đúng thứ `CLAUDE.md` cảnh báo sẽ trôi; lần thứ năm ai đó thêm màn mới là quên lần nữa |
| 2 | **Thêm `App.nhomCuaCo()` vào `public/js/app.js`, bốn màn cùng gọi** | Một chỗ duy nhất giữ quy tắc; màn mới chỉ cần gọi đúng hàm | Chạm vào **tệp dùng chung** — nhóm nguy hiểm nhất theo `CLAUDE.md` |
| 3 | Để máy chủ tự lọc danh sách nhóm gửi về | Sạch nhất | Đổi hình dạng dữ liệu `/api/auth/me` mà **cả app đang dựa vào** — vi phạm "chỉ được thêm, không đổi" |

**ĐÃ CHỐT: đường 2**, làm đúng theo quy định của `CLAUDE.md` cho nhóm tệp này:

- **Chỉ thêm, không đổi và không bỏ.** `state.classes` còn nguyên vẹn cho mọi chỗ
  đang dùng; văn phòng (không có `classIds`) nhận lại đủ danh sách như trước.
- **Commit riêng.** Hàm mới đi một commit một mình, chưa ai gọi — app ở bước đó
  chạy y như cũ. Commit sau mới chuyển bốn màn sang gọi nó.
- Ghi nhận lại bản chụp khế ước (`npm run test:khe-uoc -- --cap-nhat`) và tăng
  `VERSION` của `public/sw.js`.

**Bài học đáng ghi hơn cả bản vá:** bộ canh màn phân hệ chạy đủ chín màn nhưng
chỉ bằng **một tài khoản cô** — mà cô ấy tình cờ phụ trách nhóm đứng đầu danh
sách. Mọi lỗi kiểu "lấy phần tử [0] của danh sách cả trường" đều đi lọt. Nay có
thêm mục **[1b]** chạy lại đúng các màn ấy bằng **tài khoản cô thứ hai**, kèm một
dòng đối chứng báo đỏ nếu sau này dữ liệu mẫu đổi cho cô ấy dạy nhóm đầu danh sách
— lúc đó bài canh mất hết ý nghĩa mà vẫn xanh.

---

### 7. Rút đồng ý ① "hồ sơ học tập" — ba ranh giới tôi tự chốt

**Việc:** ô ① rút được, có ghi nhật ký, đổi chữ trên màn — nhưng **không đường nào
thi hành nó**. Nặng hơn phần thiếu chốt: màn của gia đình đang **hứa thẳng bằng
chữ** — *"Cô ghi lại quan sát và câu chuyện học tập của con trong năm"* — nên gia
đình bấm "Rút lại" là tin rằng trường đã ngưng ghi, trong khi mọi đường ghi vẫn
chạy y nguyên. `docs/KE-HOACH.md` mục 6 đã đặt sẵn nghĩa vụ: *"Rút lại được bất cứ
lúc nào — app phải định nghĩa rõ chuyện gì xảy ra khi rút."*

Khảo sát mã nêu **ba chỗ phải có người quyết**, vì chúng là chính sách của trường
chứ không phải kỹ thuật. Theo uỷ quyền, tôi chốt như sau:

| Chỗ | Chốt | Vì sao |
|---|---|---|
| **Nhận xét hằng ngày** (`routes/remarks.js`) | **CHO QUA — không chặn** | Đây là **sổ liên lạc**, mục tiêu số một của app và là thứ gia đình trả tiền để có. Gia đình rút ① là nói *"đừng dựng hồ sơ đánh giá con tôi"*, không phải *"đừng kể hôm nay con ăn gì"*. Chặn ở đây là **phạt gia đình vì đã dùng quyền của mình** — và họ sẽ đồng ý lại chỉ để lấy lại sổ liên lạc, tức lời đồng ý ấy không còn tự nguyện. |
| **Ảnh Cambridge** (`modules/cambridge/routes.js`) | **CHO QUA — không chặn thêm** | Đường ảnh đã đi qua ô ② (chia sẻ với gia đình) và ô ③ (truyền thông) rồi. ① nói về việc **dựng hồ sơ học tập**, không phải về việc một tấm ảnh hiện với ai. Chặn hai lần cùng một việc bằng hai ô khác nghĩa là chỗ sau này không ai gỡ ra được. |
| **Học bạ tiểu học** (`routes/reports.js`) | **KHÔNG vá** | Phân hệ kế thừa từ app 1, đang tắt cho mầm non, và chấm điểm 0–10 — thứ QUY TẮC 4 cấm. Vá một thứ đang tắt là thêm mã chết. **Ghi rõ ở đây để người sau biết:** ngày nào bật lại phân hệ này thì phải thêm chốt ① vào `PUT /api/reports/:studentId`. |

**Chặn ở đâu:** `modules/hanhtrinh` (ghi quan sát), `modules/kehoachbe` (kế hoạch
của bé), `modules/baocaohoctap` (mở bản, sửa, gửi), `modules/thuchup` (Ghi nhanh —
chính là lớp 1, quên chỗ này thì cô chỉ việc đổi màn hình là ghi tiếp được).

**Ba ranh giới nữa, không thương lượng:**

1. **Ba giá trị, không phải hai.** `hoSoHocTap` là `true` / `false` / `null`, và
   `null` nghĩa là **chưa thu được giấy**. Chỉ `false` mới chặn. Viết
   `if (!hoSoHocTap)` là tháng Chín cả trường không ghi được gì.
2. **Rút là NGƯNG GHI MỚI, không phải xoá và không phải đóng đường đọc.** Phần đã
   ghi vẫn còn, gia đình vẫn xem lại được, và mọi đường làm GIẢM dữ liệu đang hiện
   (thu hồi, xoá) phải luôn chạy — chặn chúng là để câu chuyện đã công bố kẹt lại
   vĩnh viễn.
3. **Không nhét chốt vào `db.canAccessStudent`.** Hàm đó gác khoảng 40 đường đọc
   gồm nhật ký, sức khoẻ, dặn thuốc, đón trả, học phí. Rút ① mà cắt luôn những
   đường đó là cắt gia đình khỏi hồ sơ sức khoẻ của chính con mình.

**Và một chỗ trình bày:** trạng thái "gia đình đã dừng hồ sơ học tập" là quyết định
của **người lớn**, không phải khiếm khuyết của đứa trẻ. Không ô đỏ, không tam giác
cảnh báo, không đếm "3/25 bé chưa có hồ sơ" — QUY TẮC 2 và QUY TẮC 4.
