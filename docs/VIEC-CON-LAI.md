# Việc còn lại sau đợt 2 — sổ để anh quyết

Sổ này dựng ngày 10/09/2026, ngay sau khi đợt 2 (Đ137–Đ144) đẩy xong và hai bộ kiểm thử
đều xanh. Sáu lượt đọc mã và tài liệu chạy song song, rồi một lượt phản biện gộp lại,
loại tám mục sai hoặc đã làm rồi, và bổ sung ba chỗ không lượt nào nêu. Mỗi mục đều có
bằng chứng tệp:dòng — không mục nào là phỏng đoán.

Ba danh sách, và chúng khác nhau thật: **A** là thứ chỉ anh quyết được, tôi làm gì cũng
sai nếu đoán; **B** là việc có mã phải viết, đã rõ phải viết gì; **C** là thứ máy không
canh được, phải có người thật bấm thử.

> **Cập nhật 10/09:** ba mục nhỏ trong danh sách B đã làm ngay trong ngày lập sổ
> (Đ145a, Đ145b, Đ145c) — đánh dấu gạch ngang tại chỗ, không xoá, để còn thấy sổ
> này từng ghi gì. Số mục còn lại của B là **30**.

Đọc kèm: `docs/PHAN-HOI-TRUONG-0709.md` (bảng đối chiếu từng ý của trường),
`docs/TIEN-DO.md` (nhật ký công việc), `docs/LOI-NEN-CHUNG.md` (sổ nợ với app 1).

---

## 0. Nếu chỉ làm được một việc trước buổi thử tới

**~~Bật phân hệ~~ — ĐÃ LÀM Đ146.** Cả chín phân hệ mầm non nay `defaultEnabled: true`,
tắt lại được bất cứ lúc nào ở Quản trị → Tính năng. Trước đó cả chín tắt sẵn, nên suốt
hai buổi trường bấm thử không ai thấy Nhật ký, Kế hoạch hay Cambridge — trường mở app ra
rồi hỏi "sao chưa thấy phần chụp ảnh".

Con số "tám phân hệ" ghi sai ở `docs/TIEN-DO.md`, `scripts/ban-thu.js`,
`docs/PHEP-THU-DIEN-THOAI.md`, `docs/QUYET-DINH-TU-CHOT.md` và
`docs/MAY-CHU-THU-ORACLE-APP2.md` cũng đã sửa thành **chín** trong cùng đợt.

---

## A. Cần anh quyết

Ba mươi lăm điểm. Phần lớn là trường đổi ý so với điều anh đã chốt, hoặc yêu cầu của
trường đụng một trong 5 QUY TẮC, hoặc tốn kém tới mức phải chọn. Mục B của `docs/PHAN-
HOI-TRUONG-0709.md` vẫn là nơi ghi chín điểm gốc; ở đây là bản đã gộp thêm những gì đợt
2 làm lộ ra.

### A1 — Trước buổi trường bấm thử tới

**~~Bật phân hệ nào cho buổi thử tới — CHÍN phân hệ đang TẮT hết~~ — ĐÃ LÀM Đ146**

Cả 9 phân hệ mầm non đều defaultEnabled:false, gồm toàn bộ công sức đợt 2 (nhatky Đ141,
kehoachbe Đ142, cambridge Đ143, hanhtrinh Đ144, baocaohoctap, thuchup, tienan, hocphi,
dontra). Trường mở app mà chưa bật thì kết luận là 'chưa làm'. Bật là gia đình bắt đầu
nhìn thấy dữ liệu — cần anh chốt danh sách, không tự bật.

*Vì sao cần anh:* Quyết định vận hành, chặn cả buổi thử; số trong TIEN-DO đang sai

*Bằng chứng:* grep defaultEnabled false modules/*/module.json → 9/9 tệp (baocaohoctap
cambridge dontra hanhtrinh hocphi kehoachbe nhatky thuchup tienan); docs/TIEN-DO.md:23
ghi 'tám phân hệ' — số này sai, thực tế chín

**B.1 / DD-02 — máy TỰ ghi 'Nghỉ không phép' hay giữ nút 'Chốt sổ vắng' một chạm**

Trường viết 'auto Nghỉ KP'. Đ131 làm thay bằng nút chốt sổ sau 9h. Muốn tự động thật:
trường phải chốt một giờ cố định VÀ app cần lịch ngày học/nghỉ lễ trước (~một buổi làm),
nếu không sẽ ghi chữ đỏ cho cả T7/CN/lễ/nghỉ hè.

*Vì sao cần anh:* Khác chữ 'auto' của trường; mâu thuẫn Đ84/Đ89; sai tiền ăn + chữ đỏ về
trẻ (QUY TẮC 2)

*Bằng chứng:* docs/PHAN-HOI-TRUONG-0709.md:40-48 (mục B.1); dòng DD-02 cột Đã làm 'Đ131
— làm theo cách chốt sổ vắng một chạm, KHÔNG tự động'; TIEN-DO.md:1088 (Đ131)

> **✅ ĐÃ NGÃ NGŨ — trường 10/09 + Đ147.** Trường chốt *"đồng ý là sẽ k để tự
> động"*, nên nút Chốt sổ vắng giữ nguyên. Phần còn thiếu mà tôi nêu ("app cần
> lịch ngày học/nghỉ lễ trước") nay **đã có**: Đ147 dựng lịch nghỉ của trường,
> và ngày trong đợt nghỉ thì chốt sổ ghi nghỉ CÓ PHÉP + hoàn tiền ăn. Mục này
> không còn chờ ai quyết.

**B.2 / DD-16 — bỏ hay giữ phân hệ Đón trả bé**

Trường nói không cần. Ngược Đ125–Đ128 anh vừa quyết. Cột 'Ra về HH:MM' trong chính ảnh
mẫu của trường là dữ liệu sổ trả bé. Nếu bỏ: chỉ TẮT trong Quản trị → Tính năng, không
xoá; mất giờ ra về và ảnh lúc trả. Không có việc mã.

*Vì sao cần anh:* Trường đổi ý ngược quyết định Đ125–Đ128 của anh

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:49-53 (B.2); dòng DD-16 'Chưa có gì phải làm về
mã; chỉ cần quyết bật/tắt'

> **✅ ĐÃ NGÃ NGŨ — trường 10/09 + Đ151.** Trường giữ nguyên ý bỏ, và lý do rõ
> hơn lần trước: họ đã có bản giấy ở văn phòng. Phần tôi lo mất — giờ ra về và
> ảnh lúc trả — thì trường giữ lại nguyên vẹn ở màn Điểm danh → Trả bé (Đ126/
> Đ128), nên chỗ mâu thuẫn tôi nêu không còn.
>
> Đã gỡ phần khai người đón khỏi màn của gia đình, **giữ nguyên đường API và
> bảng dữ liệu**, và thay bằng nút nhắn cho văn phòng — đúng cách trường nói sẽ
> làm khi nhờ người đón hộ.

**DD-11 — bố cục điểm danh một dòng Vào/Ra, thêm tab Nhiệt độ và tab Lưu ý**

Ảnh mẫu trường gộp Vào lớp/Ra về vào MỘT danh sách; Đ126/Đ128 vừa tách hai tab Đón
bé/Trả bé và trả bé bằng ảnh — hai bố cục không đi cùng nhau. Nhiệt độ là dữ liệu sức
khoẻ, grep toàn kho không có một dòng nào. Ô lưu ý cho cô cũng chưa có.

*Vì sao cần anh:* Ngược quyết định Đ126/Đ128 (03–04/09) của anh

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng DD-11 'vừa | **hỏi lại anh**', cột Đã làm
trống; grep 'nhietDo|nhiệt độ' trong routes/ modules/ public/js/views/ → 0 kết quả

**DD-14 — ai chốt Báo ăn: cô hay văn phòng (đảo quyết định Y3)**

Bảng phân quyền 07/09 nói văn phòng nhập. Đ140 đã ẩn ô Báo ăn với cô, nhưng máy chủ vẫn
cho cô chốt nhóm mình theo đúng Y3 (28/08). Hai đầu đang nói khác nhau — cần anh chốt
rồi mới siết máy chủ.

*Vì sao cần anh:* Đảo quyết định Y3 của anh; giao diện và máy chủ đang lệch nhau

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng DD-14 '**hỏi lại anh**', Đã làm TRỐNG, Hiện
trạng: modules/tienan/routes.js:225-230 chú thích cố ý 'CÔ CHỐT ĐƯỢC NHÓM MÌNH'; vs mục
A dòng Đ140

**B.9 / KH-01 / KH-06 / LSH-04 — bỏ Kế hoạch giáo dục chung / Newsletter thì giữ nội dung ở đâu**

Ba câu của trường tự mâu thuẫn: bỏ hẳn KH giáo dục (#6) / lồng phần chung ở đầu Lịch
sinh hoạt (LSH-04) / lồng bé vào giáo dục (#9). Cùng nội dung đang nằm ba chỗ: chủ đề
tuần + Cùng con ở nhà (Hành trình, cô soạn), Kết nối ở nhà (Cambridge, văn phòng đăng),
ô 'Nhắn gửi phụ huynh' của lõi kehoach. Chưa xác định 'newsletter' của trường là mục
nào.

*Vì sao cần anh:* Yêu cầu của trường tự mâu thuẫn; tắt kehoach chạm bảy bộ test đang gọi
/api/plans

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:87-90 (B.9); dòng LSH-04 'lớn | hỏi lại anh';
KH-01 (hai bảng) và KH-06 'Chưa xác định newsletter của trường là mục nào'

> **✅ ĐÃ NGÃ NGŨ — trường 10/09 + Đ148.** Trường chốt rõ chỗ giữ: một tab tên
> **Lịch sinh hoạt** chứa đủ hai nội dung. Đã làm ở Đ148 — gộp MÀN, không gộp
> mã: `/api/plans` không đổi (bảy bộ bài canh gọi nó vẫn xanh), `#/plans` vẫn
> mở được, và tắt một bên thì bên kia trở lại y như trước.
>
> **Còn một chỗ tôi đoán:** "newsletter" hiểu là chính ô Kế hoạch giáo dục đứng
> riêng. Nếu trường có ý khác thì sửa lại rẻ — đã hỏi ở PHAN-HOI mục 9.

**Sự kiện nào ĐẨY về điện thoại, sự kiện nào chỉ kêu chuông trong app**

Chỉ tin RIÊNG TỪNG BÉ mới đẩy (ảnh tới lớp, nhật ký, cân đo, Cambridge, câu chuyện, báo
cáo, ảnh gắn thẻ). Tin CẢ NHÓM không đẩy: album CÔNG KHAI, thực đơn tuần, lịch sinh
hoạt, thông báo nhà trường. Nhưng màn Cài đặt lại hứa 'album mới…'. Chốt: mở đẩy cho cả
nhóm, hay sửa câu hứa.

*Vì sao cần anh:* Đúng nỗi lo Đ14/test:khong-hua-suong — hứa trên màn hình nhiều hơn máy
làm được

*Bằng chứng:* lib/thong-bao-be.js:32 (chỉ tbb.gui gọi lib/day.js); lib/thong-
bao.js:90-121 guiChoNhom không gọi đẩy; public/js/views/settings.js:114 '…cân đo, album
mới…'

**NK-04 — ô thay bỉm cắt theo NGÀY SINH hay theo NHÓM LỚP**

Trường 07/09: 'Nhật ký ngày tự động bỏ đi với các bạn không phải lớp nhà trẻ'. Mã cố ý
quyết theo ngày sinh (< 36 tháng), không nhìn tên nhóm. Hệ quả: bé 37 tháng còn ở nhóm
nhà trẻ mất ô; nhóm nhà trẻ toàn bé > 36 tháng thì cả màn báo 'nhóm này không có bé nhà
trẻ'.

*Vì sao cần anh:* Mã cố ý đi khác lời trường; mâu thuẫn quyết định GĐ1-a/N20 của anh

*Bằng chứng:* modules/nhatky/routes.js:97-120 (laNhaTre, chú thích 'Quyết định theo NGÀY
SINH, không theo tên nhóm', return thang < 36); modules/nhatky/view.js:315-325; dòng
NK-04 '**hỏi lại anh** | Đ141'

**Cambridge chỉ có hai lứa 3–4 và 4–5 — bé nhà trẻ và bé 5–6 tuổi nhận nội dung gì**

Bé < 36 tháng về lứa rỗng, chỉ đọc bài đánh dấu 'Cả hai lứa'. Mọi bé ≥ 48 tháng, kể cả
nhóm Lá 5–6 tuổi, đều bị xếp vào lứa 4–5 vì đó là lứa lớn nhất. Đường tải tệp cũng chặn
theo lứa này. Trường nhận từ 12 tháng tới 6 tuổi.

*Vì sao cần anh:* Mẫu Cambridge của trường không phủ hết lứa tuổi trường nhận

*Bằng chứng:* modules/cambridge/routes.js:44-61 (luaTuoiCuaBe: thang < 36 trả '', thang
< 48 ? '3-4' : '4-5'); :779-781 chặn tải tệp sai lứa

**Ô nhập cân đo gợi ý sẵn con số theo tháng tuổi (QUY TẮC 4)**

Ô chiều cao/cân nặng có chữ mờ 'VD: 105', 'VD: 17' tính bằng công thức tuyến tính từ
tháng tuổi (75 + (t−12)·0,72 cm; 9,5 + (t−12)·0,2 kg, kẹp 12–72 tháng). Chỉ là gợi ý gõ
nhanh, không lưu. Nhưng một con số theo tuổi hiện trên màn dễ bị đọc thành 'chuẩn của độ
tuổi'.

*Vì sao cần anh:* CLAUDE.md: gợi ý sai lứa tuổi là thứ cô và y tế nhận ra ngay; sát QUY
TẮC 4 — cần y tế trường xác nhận hoặc bỏ hẳn

*Bằng chứng:* public/js/views/health.js:352-358 (goiYCanDo), dùng ở :189 và :195
placeholder

**Tiêm chủng — chính bản phản hồi của trường tự mâu thuẫn**

Một chỗ trường nói bỏ hẳn ('trường k có tiêm chủng'), chỗ khác lại muốn bấm vào từng bé
xem tiêm chủng. Đ136 đã bỏ khỏi mẫu ghi MỚI nhưng vẫn đọc và hiện bản ghi cũ. Cần một
câu trả lời duy nhất.

*Vì sao cần anh:* Hai câu của trường ngược nhau

*Bằng chứng:* phan-hoi.md:351 'Bỏ phần tiêm chủng đi, trường k có tiêm chủng' vs phan-
hoi.md:259 'xem chi tiết hơn về thông tin khác như tiêm chủng, note bất thường'; dòng
SK-04

**Đ133 — cô mất quyền sửa Lịch sinh hoạt (đổi hành vi tính năng đang chạy)**

PUT /api/timetable/:classId nay từ chối vai cô; cô chỉ còn dòng 'Lịch do văn phòng cơ sở
soạn'. Làm vì trường yêu cầu thẳng, nhưng đây là một đổi hành vi của tính năng đang bật
— chạm Nguyên tắc số 1.

*Vì sao cần anh:* Chạm Nguyên tắc số 1 — cần anh xác nhận đã chấp nhận đánh đổi

*Bằng chứng:* TIEN-DO.md:1090 (Đ133 — 'Đây là một đổi hành vi của tính năng đang chạy
(cô mất quyền sửa) — làm vì trường yêu cầu thẳng')

**Tên mục bằng tiếng Anh trên màn hình (Class Progress, Letter for parent)**

Trường đặt tên Class Progress, Home Connection, Letter for parent. CLAUDE.md bắt buộc
giao diện và mọi thông báo viết tiếng Việt dễ hiểu với cô và phụ huynh không rành máy
tính. Đ143 đã dịch 'Kết nối ở nhà'; ba tên còn lại chưa quyết.

*Vì sao cần anh:* Mâu thuẫn quy định tiếng Việt trong CLAUDE.md

*Bằng chứng:* phan-hoi.md:55, :56, :272; CLAUDE.md mục 'Vài điều khác cần nhớ'

### A2 — Trước khi trường chạy thật

**Một nhà nhận bao nhiêu thông báo mỗi ngày**

Mỗi bữa ghi là một tin riêng cho từng bé (trường có năm bữa), cộng ngủ, bỉm, ảnh tới
lớp, cân đo, album, Cambridge, câu chuyện, báo cáo. Màn Cài đặt chỉ có Bật/Tắt cả cụm,
không có ô chọn loại tin. Chống lặp chỉ chặn tin TRÙNG TÊN trong ngày, không chặn tổng
số.

*Vì sao cần anh:* Quá nhiều tin thì gia đình tắt hết, kể cả tin cần đọc (con sốt)

*Bằng chứng:* modules/nhatky/routes.js:742-753 (một tin mỗi bé mỗi bữa);
public/js/views/settings.js:118-124 (chỉ Bật / Gửi thử / Tắt)

**Ảnh câu chuyện Hành trình (lớp 3) chép sang album CÔNG KHAI thì nhà khác xem được**

Khi cô bấm 'Kể cho gia đình', cô chọn lưu ảnh về một album. Album ở chế độ công khai thì
tấm ảnh riêng của bé hiện với mọi gia đình trong nhóm. Ô chọn chỉ ghi 'để gia đình về
sau vào Album ảnh tìm lại cho tiện', không cảnh báo. Chốt: chỉ cho chọn album theo thẻ,
hay giữ nguyên và ghi rõ cảnh báo.

*Vì sao cần anh:* Chạm ranh giới ba lớp dữ liệu của CLAUDE.md — lớp 3 chỉ dành cho gia
đình của chính bé đó

*Bằng chứng:* modules/hanhtrinh/view.js:426-434 (ô ht-album + hint);
modules/hanhtrinh/routes.js:828-846 (luuAnhVeAlbum); routes/albums.js:261-266
(locTheoThe chỉ lọc khi cheDo === 'theo-the')

**KH-05 / BC-07 — hai mức chữ trung tính và ánh xạ thang M/S/W/N/NA của mẫu trường**

Đ142 làm hai mức CHỮ TRUNG TÍNH; Đ143/báo cáo thay hai bậc trên của thang năm bậc trường
gửi bằng năm trạng thái Hành trình. Nếu trường vẫn đòi đúng chữ 'đạt/chưa đạt' hay 'xuất
sắc/thuần thục' thì không chiều được — phải nới bộ canh QUY TẮC 4 (bất khả xâm phạm).
Cần anh giải thích với trường trước khi họ gửi mẫu BC 6 tháng.

*Vì sao cần anh:* QUY TẮC 2/4 vs nguyên văn mẫu giấy của trường; báo cáo này in gửi phụ
huynh

*Bằng chứng:* modules/baocaohoctap/routes.js:11-33 (giải thích lý do đổi + danh sách MUC
5 mức kèm chữ cái); dòng KH-05 '**hỏi lại anh** | Đ142'; dòng BC-07 '**hỏi lại anh**',
Đã làm trống; test/ke-hoach-be.test.mjs:323-325, test/quy-tac-2.test.mjs:81

**SK-10 — chỉ quản lý cơ sở/hiệu trưởng được sửa bản ghi sức khoẻ?**

Cô hiện sửa/thu hồi được bản ghi bé nhóm mình. Ràng 'chỉ quản lý sửa' mâu thuẫn thực tế:
cô cân đo cả nhóm (SK-05) gõ nhầm một số mà phải nhờ quản lý thì dễ để nguyên số sai.
Tiền lệ dung hoà: Đ127 (chỉ sửa trong ngày).

*Vì sao cần anh:* Yêu cầu của trường vs tính khả dụng — anh chọn ràng hẳn hay theo kiểu
Đ127

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng SK-10 'nhỏ | **hỏi lại anh**', Đã làm trống

**CB-01 + Đ120 — khi nào bật Cambridge, và ba món hiệu năng phải làm trước đó**

Đ121 (03/09) chốt 'Cambridge sau này làm sau, tắt sẵn'; Đ143 (10/09) đã dựng theo mẫu
thật trường gửi — mốc 'trước khi trường bật' nay đến gần. Ba món hiệu năng hoãn ở Đ120
(keml ~65 truy vấn/bài, tra ảnh bằng LIKE '%file%', tải cả bảng rồi lọc; cần bảng phụ
cambridge_anh) vẫn nguyên nhãn hoãn — Đ143 không ghi đã làm.

*Vì sao cần anh:* Xác nhận đảo Đ121 và cho làm Đ120 trước khi bật

*Bằng chứng:* TIEN-DO.md:1075 (Đ120 'hoãn 4'), :1076 (Đ121 'mốc làm: trước khi trường
bật Cambridge, cần bảng phụ cambridge_anh'), :1100 (Đ143); docs/RA-SOAT-2026-09.md:118

**PQ-01 (Cambridge) — Marketing vẫn mở được Cambridge (đảo Đ60)**

Trường muốn MKT/HR/KT không thấy Cambridge. HR (nhansu) và Kế toán đã đúng; Marketing CÓ
'/api/cambridge' vì Đ60 anh cố ý mở (chỉ ảnh không có bé). Sửa là chạm lib/db.js —
commit riêng, cập nhật test chức vụ.

*Vì sao cần anh:* Đảo quyết định Đ60 của anh; chạm tệp dùng chung

*Bằng chứng:* lib/db.js:1412-1419 chức vụ marketing api
['/api/auth','/api/dashboard','/api/albums','/api/cambridge']; dòng PQ-01 (bảng
Cambridge) '**hỏi lại anh**'

**Đ128 — trả bé chỉ bằng một tấm ảnh, sổ không còn tên người đón**

Nút chính là 'Chụp ảnh trả bé'; ô nguoiDon ghi 'Xác nhận bằng ảnh lúc trả'. Từ nay câu
trả lời cho 'hôm đó ai đón bé' nằm ở khuôn mặt trong ảnh, không ở một cái tên đọc được —
trong khi Đ127b gọi sổ trả bé là 'chứng cứ duy nhất'.

*Vì sao cần anh:* Đánh đổi về chứng cứ khi có tranh chấp — cần anh và nhà trường xác
nhận chấp nhận

*Bằng chứng:* TIEN-DO.md:1085 (Đ128 — 'Đánh đổi phải nói rõ… nằm ở KHUÔN MẶT trong ảnh,
không ở một cái tên đọc được')

**Lưu số định danh cá nhân của bé và CCCD của phụ huynh?**

Trường xin thêm ô. Chưa có mã, chưa ai quyết. Là số định danh của trẻ dưới 6 tuổi và của
người lớn — cần quyết có lưu không, ai đọc được, và ghi vào cam kết riêng tư TRƯỚC khi
mở ô nhập.

*Vì sao cần anh:* Dữ liệu định danh nhạy cảm theo NĐ 13/2023

*Bằng chứng:* phan-hoi.md:6 'Số định danh cá nhân'; :34 'thêm cả thông tin số CCCD phụ
huynh'; mảng Hồ sơ bé chưa có bảng đối chiếu (PHAN-HOI-TRUONG-0709.md:242)

**Gộp nhánh vá bốn món nợ nền vào kho app 1, và mở lượt trả 16 món còn lại**

Bốn món bắt buộc (mất ảnh khi khôi phục, lộ mã máy chủ Học phí, hồ sơ bé đã rời trường,
nhận xét đã thu hồi) đã vá ở kho pichu124/School trên nhánh claude/no-nen-chung-app2 và
đang CHỜ GỘP — app 1 đang phục vụ ~300 gia đình thật. Sau đó là 16 dòng còn nợ, ưu tiên
cao nhất là Đ39 (màn Học phí chọn bé không có tác dụng — và là tiền).

*Vì sao cần anh:* Đụng app đang chạy thật cho ~300 gia đình — chỉ anh được quyết

*Bằng chứng:* docs/BAO-CAO-TU-LAM.md:511, :535 'tôi để bản vá ở một nhánh riêng và chờ
anh gộp'; docs/LOI-NEN-CHUNG.md:149 'Món nợ ưu tiên cao nhất trong bảng này'; :141-149,
:151-153, :157-160 = 16 dòng còn 'app 1'

**18 món nợ nền KHÔNG bắt buộc — làm hay bỏ hẳn, riêng gói qs nên xử ngay**

Sổ liệt kê 18 chỗ app 1 gần như chắc chắn dính nhưng không thuộc loại rò rỉ/mất dữ liệu.
Hai món đáng cân nhắc: Đ54 (màn 'không mở được' nói sai lý do với phụ huynh — 'dễ vá và
đáng vá nhất'), và Đ122 (gói qs 6.15.3 có lỗ làm treo máy chủ, GHSA-4mjr-xmp4-gh2g) ở
app đang chạy thật.

*Vì sao cần anh:* Theo quy ước, mọi thứ ngoài hai loại bắt buộc 'để mỗi bên tự quyết'
(LOI-NEN-CHUNG.md:88)

*Bằng chứng:* docs/LOI-NEN-CHUNG.md:211, :248, :284-288

**Sổ nợ nền tự mâu thuẫn về món Đ44 — đã trả hay còn nợ**

Dòng bảng Đ44 (db.canAccessStudent nhánh phụ huynh) vẫn ghi Còn nợ = app 1, trong khi
hộp 'BỐN MÓN 30/08 ĐÃ TRẢ XONG' liệt kê chính món đó đã vá bằng ba commit. Dòng Đ59 ngay
bên cạnh đã gạch, dòng Đ44 thì không. Phải chốt rồi sửa sổ.

*Vì sao cần anh:* Sổ nợ là thứ DUY NHẤT canh việc vá chéo, và nó canh bằng người — 'ghi
sổ sai còn tệ hơn sổ trống' (:193)

*Bằng chứng:* docs/LOI-NEN-CHUNG.md:153 (cột Còn nợ '**app 1**') vs :171 '| Đ44+Đ59 luật
12 tháng… | f1c421f · 59148bc · 02b03c4 |'; đối chiếu :155 đã gạch ~~app 1~~

**Kịch bản triển khai [A] VPS Việt Nam hay [B] Render, tên miền, và tên chính thức của app**

N7 (VPS Việt Nam + tên miền đứng tên trường) là việc nhà trường làm và đang CHẶN toàn bộ
phần triển khai; đã có bản xin báo giá gửi nhà cung cấp. Kèm theo: chốt tên chính thức
của app (đang tạm gọi CASA Mầm non, repo casa-mamnon) — đổi bây giờ miễn phí, đổi sau
khi phụ huynh đã cài thì phiền.

*Vì sao cần anh:* Tốn kém (VPS 4 vCPU/8 GB, hoá đơn VAT) và là quyết định của nhà trường

*Bằng chứng:* TIEN-DO.md:697 (N1 'Còn chờ N7 thật sự: tên miền, địa chỉ IP, chứng chỉ
HTTPS'), :703 (N7 'Việc của nhà trường; chặn phần triển khai', docs/XIN-BAO-GIA-VPS.md);
docs/KE-HOACH.md mục 9 việc số 3 (:260)

**Duyệt bảng thuật ngữ tiếng Việt — năm trạng thái đánh giá**

'Chưa dạy · Chưa quan sát thấy · Đang hình thành · Đã vững · Vượt trội' mới là ĐỀ XUẤT,
nhưng mã đã dựng theo bản này và chữ đã nằm trong dữ liệu. Trường phải duyệt trước cổng
DỪNG GĐ 2 — đổi sau tốn hơn đổi bây giờ.

*Vì sao cần anh:* Chữ đã nằm trong dữ liệu

*Bằng chứng:* docs/KE-HOACH.md:121 'tên tiếng Việt (đề xuất, trường duyệt)', mục 9 việc
số 4 (:261); TIEN-DO.md:726

**Địa chỉ liên hệ trong khoá đẩy đang là địa chỉ tự đặt**

Gói đẩy gửi đi kèm subject mailto:lienhe@casamamnon.edu.vn, viết cứng trong mã. Một số
dịch vụ đẩy dùng địa chỉ này để liên lạc khi có sự cố. Cần trường cho một hòm thư có
thật.

*Vì sao cần anh:* Cần nhà trường cấp hòm thư thật

*Bằng chứng:* lib/day.js:22 (CHU_DE); lib/day.js:86 (vapidDetails.subject)

### A3 — Để sau

**Thu hồi tin nhắn và 'xoá cuộc trò chuyện cả ở đầu PH' nghĩa là gì**

Cần chốt: ẩn khỏi màn hình (dữ liệu giữ nguyên) hay xoá hẳn. routes/messages.js hiện
không có đường xoá/thu hồi nào. CLAUDE.md cấm tự ý xoá dữ liệu; tin nhắn cô ↔ phụ huynh
là chứng cứ trao đổi của trường.

*Vì sao cần anh:* Đụng nguyên tắc không xoá dữ liệu; nghĩa của 'xoá' chưa rõ

*Bằng chứng:* phan-hoi.md:349; grep 'delete|thu-hoi|thuHoi|recall' trong
routes/messages.js → 0 kết quả

**B.4 / BC-03 — AI viết nhận xét cho báo cáo tháng**

Làm được nhưng chỉ dưới dạng NHÁP CHỜ CÔ DUYỆT (QUY TẮC 3), và là việc rất lớn. Chốt:
dịch vụ nào, ai trả phí theo lượt, dữ liệu bé có gửi ra ngoài không. Bốn điều kiện pháp
lý chưa có cái nào (ô đồng ý AI riêng trong student_consent, thay tên bé bằng mã, hợp
đồng không lưu/không huấn luyện, hồ sơ đánh giá tác động) — thiếu một là không bật.

*Vì sao cần anh:* Tốn kém + pháp lý + bộ canh quy-tac-3 (bất khả xâm phạm) sẽ báo đỏ

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:58-62 (B.4); dòng BC-03 'rất lớn | **hỏi lại
anh**'; docs/KE-HOACH.md:143, :215 'Thiếu một trong bốn — không bật'; TIEN-DO.md:1012
(Đ53)

**B.6 — video 3–5 phút hay video 60 giây (kéo theo AL-07, HT-05, CB-03, N25)**

Trần tệp hiện 8 MB (≈10–20 giây); video điện thoại 3 phút nặng 150–400 MB. Đề nghị mở
tới 60 giây trước, đo kho ảnh vài tuần rồi mở tiếp; hoặc chờ object storage (N25).

*Vì sao cần anh:* Mâu thuẫn §5 (trần 8 MB, không nới 12 MB) và N25/Đ129 kho ảnh đầy đĩa

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:68-72 (B.6); dòng AL-07, HT-05 'hỏi lại anh'; dòng
CB-03 'Đ143 (PDF, Word; video vẫn theo mục B.6)'; lib/uploads.js:198 trần 8 MB;
docs/QUYET-DINH-TU-CHOT.md §5

**B.5 / B.7 / T7 và các việc lớn đề nghị dời sang đợt 3**

(1) B.5 đo 'sự quan tâm của phụ huynh' bằng lượt click — theo dõi hành vi từng gia đình
trong app chứa ảnh trẻ, chưa có trong cam kết riêng tư nào; nếu mở thì chỉ đếm GỘP theo
mục. (2) B.7 hồ sơ nhân sự đầy đủ (CCCD, MST, vợ/chồng/con) + chấm công giáo viên — miền
dữ liệu người lớn hoàn toàn mới, cần quyền riêng HR + hiệu trưởng, vài ngày. (3) T7 biểu
phí thật — cần hỏi trường: biểu phí có khác nhau giữa ba cơ sở không, Kế toán được sửa
hay chỉ được đọc.

*Vì sao cần anh:* Tốn kém + mở miền dữ liệu mới; cần chốt thứ tự ưu tiên so với phần trẻ

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:63-67 (B.5), :73-77 (B.7); TIEN-DO.md:739 (T7 'Cần
hỏi trường trước khi làm'); phan-hoi.md:227, :376, :372-375

**N25 — nâng đĩa hay chuyển kho ảnh ra ngoài khi tới mốc**

Ảnh ghi thẳng vào ổ máy chủ, ~25–30 GB/năm với 300 bé; ổ đầy là SQLite ghi hỏng và cả
app dừng. Hai mốc kích hoạt (ảnh > 60% đĩa; đĩa còn < 6 tháng là đầy) nay npm run kiem-
tra-may-chu tự đo. Ước 2–3 ngày làm, phải quyết trước vài tháng. Chỗ nguy hiểm nhất: kho
ngoài để chế độ công khai là lộ toàn bộ ảnh khuôn mặt trẻ.

*Vì sao cần anh:* Tốn kém, chọn nhà cung cấp, sửa mã mất vài ngày

*Bằng chứng:* TIEN-DO.md:730 (N25 '🟡 chưa làm, có mốc kích hoạt rõ ràng… Chờ mốc'),
:1086 (Đ129)

**Bốn điểm cố ý để sau, chờ trường dùng thật rồi quyết**

(1) Y3-b: phụ huynh chưa xem được bảng tiền ăn theo tháng của con — nay trường đã hỏi
lại (DD-01) nên coi như đủ điều kiện mở. (2) Y5-c: uỷ quyền đón một lần không cần văn
phòng duyệt. (3) GĐ2-C-b: phụ huynh không xem kế hoạch tháng của con (cố ý, QUY TẮC 2).
(4) GĐ2-D-b: không đếm bao nhiêu gia đình đã đọc tờ Cambridge.

*Vì sao cần anh:* Mỗi điểm là một cân bằng giữa tiện lợi và rò dữ liệu / áp lực lên trẻ

*Bằng chứng:* TIEN-DO.md:721 (Y3-b), :725 (Y5-c 'Cố ý, nhưng nên xem lại khi trường dùng
thật'), :732 (GĐ2-C-b), :734 (GĐ2-D-b) — cột cuối đều ghi 'Chờ trường dùng thử'

**Gỡ hẳn UI.RATING và GET /api/kehoachbe/be — chờ anh duyệt**

UI.RATING (ba mức 'Con làm rất tốt / tốt / cần cố gắng thêm') đã bị chặn chép sang chỗ
mới bằng bánh cóc thứ hai, bốn tệp ghi vào sổ nợ riêng; gỡ hẳn chưa được duyệt. GET
/api/kehoachbe/be không màn hình nào gọi, khuyến nghị gỡ nhưng đang GIỮ NGUYÊN.

*Vì sao cần anh:* Gỡ mã phải được người dùng duyệt theo CLAUDE.md

*Bằng chứng:* docs/BAO-CAO-TU-LAM.md:444 'Gỡ hẳn UI.RATING vẫn chưa được duyệt'; :447
'Khuyến nghị của tôi là gỡ hẳn, nhưng gỡ chưa được duyệt'

**AL-06 / AL-08 / SK-07 / PQ-01 (Thực đơn) — bốn ý cần hỏi lại trường hoặc anh chốt**

(1) AL-06 'đăng album trên điện thoại phải nhanh' — mã đã có input multiple mở thẳng máy
ảnh, chưa rõ điểm khó cụ thể, phải hỏi lại trường. (2) AL-08 văn phòng/quản lý đăng-sửa-
xoá album — ngược thiết kế 'quản trị không ở trong lớp và không biết trong ảnh là bé
nào'; nếu 'ai cũng' gồm phụ huynh thì mâu thuẫn luật ảnh nhóm. (3) SK-07 ảnh phiếu khám
trạm y tế — chính trường còn phân vân, và là hồ sơ y tế trẻ < 6 tuổi vào kho đang bị
Đ129/N25 cảnh báo dung lượng. (4) PQ-01 'văn phòng chỉ nhập, quản lý mới sửa' hiện không
tách được (cùng role admin).

*Vì sao cần anh:* Chưa rõ yêu cầu / đổi thiết kế / chạm lib/db.js CHUC_VU

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng AL-06 'Chưa rõ điểm khó cụ thể'; AL-08
(routes/albums.js:583-586); SK-07 'hỏi lại anh'; PQ-01 (bảng TĐ/LSH) 'Vế văn phòng chỉ
nhập, quản lý mới sửa hiện không tách được'

---

## B. Còn phải làm

Ba mươi ba việc có mã phải viết. Cột *cỡ việc* là ước lượng của tôi, không phải cam kết.
Vài việc chờ anh quyết ở phần A rồi mới làm được — đã ghi rõ trong từng mục.

### B1 — Trước buổi trường bấm thử tới

**~~lib/thong-bao-be.js và lib/day.js là tệp dùng chung MỚI nhưng chưa nằm trong khế ước~~ — ĐÃ LÀM Đ145a**

lib/thong-bao-be.js được 9 tệp route/module gọi; lib/day.js là đường đẩy duy nhất. Bộ
canh khế ước chỉ chụp hình dạng của lib/db.js, lib/auth.js, lib/modules.js, UI và App.
Đổi chữ ký gui() hay bỏ một hàm ở đây thì KHÔNG bài nào báo đỏ. Đây là lỗ hổng do chính
đợt 2 mở ra.

*Cỡ việc:* nhỏ — thêm hai khoá vào test/khe-uoc.json rồi npm run test:khe-uoc -- --cap-
nhat; commit riêng

*Bằng chứng:* test/khe-uoc.test.mjs:88-92 (danh sách 5 mục); test/khe-uoc.json chỉ có ba
khoá lib/db.js, lib/auth.js, lib/modules.js (đã grep xác nhận); tbb.gui gọi ở
routes/health.js:174,260 · routes/attendance.js:390 · routes/albums.js:280 ·
modules/nhatky/routes.js:629,745 · modules/cambridge/routes.js:661 ·
modules/hanhtrinh/routes.js:860 · modules/baocaohoctap/routes.js:233

**~~Cô (role teacher) bật được thông báo đẩy nhưng không bao giờ nhận tin thật~~ — ĐÃ LÀM Đ145c**

Thẻ 'Thông báo trên điện thoại' hiện với cô, và đường đẩy chỉ gửi cho bố mẹ của một bé —
cô bật xong chỉ nhận được đúng cái 'Gửi thử'. Chữ trên thẻ cũng viết cho phụ huynh ('Bật
để máy tự báo khi có tin về con'). Văn phòng cơ sở thì đã bị ẩn đúng, nên chỉ còn cô hở.
Hoặc ẩn thẻ với cô, hoặc thêm loại tin đẩy cho cô (gia đình xin nghỉ, đơn chờ duyệt).

*Cỡ việc:* nhỏ

*Bằng chứng:* lib/day.js:103-112 guiChoGiaDinhCuaBe chỉ đọc student_parents;
lib/day.js:114 guiChoNguoi chỉ được routes/push.js:35 gọi cho lượt gửi thử;
public/js/views/settings.js:106-108 chỉ loại trừ admin có chucVu, không loại trừ teacher

**~~DT-03 — cô mở lại đơn thuốc đã hoàn tất~~ — ĐÃ LÀM Đ153c**

Mục 'Đã hoàn tất (N)' chỉ liệt kê tên bé + khoảng ngày; dòng list-row KHÔNG có onclick
nên không xem lại được thuốc gì, liều, ghi chú, ai nhận lúc nào. Thiếu cả lọc theo
bé/khoảng ngày. Giữ nguyên trần 60/500 của Đ113.

*Cỡ việc:* nhỏ

*Bằng chứng:* public/js/views/medicine.js:229-241 — khối done render list-row chỉ có
avatar, tên, khoảng ngày, badge 'Hoàn tất', không có onclick (đã đọc tận nơi); dòng
DT-03 'nhỏ | làm', Đã làm TRỐNG

**~~AL-01 — gắn thẻ một lượt cho nhiều ảnh~~ — ĐÃ LÀM Đ153a** (đây là thứ đã hứa với trường khi từ chối nhận diện khuôn mặt)

routes/albums.js chỉ có PUT /api/albums/:id/photos/:photoId/be — gắn thẻ TỪNG ẢNH một.
Không có đường gắn nhiều ảnh một lượt. Đây là 'thay thế' mà mục B.3 hứa với trường khi
từ chối nhận diện khuôn mặt, nên phải làm trước khi trả lời trường về AL-04.

*Cỡ việc:* nhỏ

*Bằng chứng:* grep 'photos/:photoId/be|nhieu-anh|hangLoat|bulk' routes/albums.js → chỉ
dòng 701 (một ảnh); PHAN-HOI-TRUONG-0709.md:57 'gắn thẻ nhanh nhiều bé một lúc (GN-01,
AL-01) — làm được ở đợt 2' vs dòng AL-01 'làm một phần', Đã làm TRỐNG

**~~Thông báo khi có KHẢO SÁT mới — chưa có~~ — ĐÃ LÀM Đ145b**

Trường xếp khảo sát đứng đầu danh sách 'phải có thông báo tới phụ huynh', nhưng Đ137 nối
thông báo cho 9 loại nội dung và không có khảo sát trong đó.

*Cỡ việc:* nhỏ

*Bằng chứng:* phan-hoi.md:334-335 'Lưu ý quan trọng về thông báo: Khảo sát, mọi update
của nhà trường… cần phải có thông báo tới phụ huynh'; grep khảo sát trong lib/thong-bao-
be.js và routes/surveys.js → không có lời gọi tbb.gui nào

**NK-06 — khai nhóm nào là nhà trẻ, và ẩn ô Nhật ký ở phía PHỤ HUYNH**

Đ141 mới ẩn ô với CÔ không có bé nhà trẻ (dieuKienHien). Còn thiếu: (1) cách khai nhóm
nào là nhà trẻ; (2) ẩn ô trên trang chủ phụ huynh theo nhóm; và luật gộp 'nhóm nhà trẻ
HOẶC có bé < 36 tháng' để không làm mất nhật ký của bé 20 tháng học nhóm mẫu giáo. Phụ
thuộc quyết định NK-04.

*Cỡ việc:* vừa

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng NK-06 'lớn | làm | Đ141 (ô ẩn với cô không có
bé nhà trẻ — dieuKienHien)'; modules/nhatky/routes.js:344-348

**~~Dọn bốn chỗ tài liệu đang nói ngược nhau~~ — ĐÃ LÀM Đ153d**

(1) TIEN-DO.md dòng 751 '🔴 GITHUB ACTIONS KHÔNG CHẠY TỪ 28/08 — cần người dùng xử lý'
vẫn bảo anh mở Billing, trong khi Đ119c (dòng 1074) ghi Actions đã chạy thật từ 01/09 và
CI xanh lại — mà TIEN-DO là tệp 'đọc đầu tiên'. (2) TIEN-DO:23 ghi 'tám phân hệ mầm non
mặc định TẮT', thực tế CHÍN. (3) PHAN-HOI-TRUONG-0709.md: DD-14 cột Đã làm trống trong
khi mục A ghi Đ140 đã làm; B.3 nói AL-01 'làm được ở đợt 2' nhưng AL-01 trống; nhiều ô
Hiện trạng/Ghi chú bị cắt cụt giữa câu (DD-02, DD-11, DD-12, SK-09, NK-05, CB-03,
AL-08). (4) LOI-NEN-CHUNG.md: dòng Đ44 chưa gạch, câu 'Mười món còn lại' (:190) lệch với
16 dòng thực tế, ghi chú :141 'chưa mở kho app 1' đã lỗi thời từ 30/08 (:165).

*Cỡ việc:* nhỏ, việc tài liệu — nhưng là sổ mà người sau đọc để biết còn nợ gì

*Bằng chứng:* TIEN-DO.md:751 vs :1074; TIEN-DO.md:23 vs grep 9/9 module.json; PHAN-HOI-
TRUONG-0709.md mục A Đ140 vs dòng DD-14; :57 vs dòng AL-01; LOI-NEN-CHUNG.md:153 vs
:171, :190, :141 vs :165

**Ba mảng bảng đối chiếu 07/09 còn thiếu — chưa biết còn ý nào của trường chưa làm**

Phần D tự nhận chưa có bảng cho: (1) Phân quyền · Giao diện Hiệu trưởng · Hồ sơ bé · Hồ
sơ nhân sự · Tài khoản; (2) Kế toán/Học phí · Nhân sự · Marketing; (3) Phụ huynh · Thông
báo · Khảo sát · Trò chuyện · Vài ý GV. Gần như toàn bộ mục 'chưa có mã' ở trên rơi đúng
vào ba mảng này — nghĩa là danh sách còn phải làm hiện CHƯA ĐẦY ĐỦ.

*Cỡ việc:* một lượt đọc mã, chưa rõ phát sinh

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md:240-242 'Ba mảng sau chưa có bảng vì tác nhân đọc
mã hết lượt giữa chừng, đang chạy lại'

**Việc của NHÀ TRƯỜNG — bảy món đang chặn**

(1) Đăng ký VPS Việt Nam + tên miền đứng tên trường (chặn toàn bộ triển khai; bản xin
báo giá đã soạn sẵn). (2) Phát và thu giấy đồng ý phụ huynh ký — ba mục tích riêng, ô ③
truyền thông mặc định KHÔNG tích; chặn cổng DỪNG GĐ 2. (3) Hồ sơ đánh giá tác động theo
Điều 24 NĐ 13/2023, nộp trong 60 ngày kể từ khi chạy thật. (4) Danh sách bé + nhóm + cô
của cả 3 cơ sở (Excel). (5) Chụp lại sổ liên lạc giấy đang dùng. (6) Mẫu báo cáo 6 tháng
lứa 3–6. (7) Danh sách bài học/bài tập theo góc lĩnh vực để đổ vào danh mục Đ142 — Đ142
mới dựng khung, nội dung thật vẫn trống.

*Cỡ việc:* việc của nhà trường

*Bằng chứng:* docs/KE-HOACH.md mục 9 việc số 1–6 (:258-263), :203, :210; TIEN-DO.md:703
(N7, docs/XIN-BAO-GIA-VPS.md), :1052 (Đ96); phan-hoi.md:264, :269; dòng BC-07

### B2 — Trước khi trường chạy thật

**~~Không đổi được chế độ album sau khi đã tạo~~ — ĐÃ LÀM Đ153b** (máy trả về chiều đổi, màn hình hỏi lại cô một câu khi mở rộng)

Chế độ công khai / theo thẻ chỉ ghi được đúng một lần lúc POST /api/albums; không có
đường PUT/PATCH nào đổi lại. Cô chọn nhầm 'Cả nhóm' cho album đáng lẽ theo thẻ thì chỉ
còn cách xoá cả album và đăng lại.

*Cỡ việc:* nhỏ, kèm quyết định: đổi theo-thẻ → công khai thì có báo lại gia đình không

*Bằng chứng:* routes/albums.js:249 (ghiCheDo) và :618 là chỗ gọi DUY NHẤT (đã grep xác
nhận); các đường còn lại :572, 633, 701, 742, 758 — không có đường sửa chế độ

**~~'Hẹn ngày công bố' báo theo kiểu lười — không có tác vụ định giờ~~ — ĐÃ LÀM Đ154** (máy chủ nay có đồng hồ `lib/hen-gio.js`, quét 15 phút một lượt; bốn lời gọi lười cũ giữ lại làm lưới hứng)

Quản lý duyệt và hẹn ngày công bố cho tương lai; đến ngày đó tin báo gia đình CHỈ được
gửi khi có người mở một trong các màn gọi baoNeuToiNgay. Không ai mở thì gia đình không
được báo; và khi chính gia đình mở màn thì tin đẩy tới lúc họ đang nhìn.

*Cỡ việc:* vừa — thêm tác vụ quét theo ngày, hoặc bỏ hẹn ngày và duyệt là công bố ngay

*Bằng chứng:* modules/baocaohoctap/routes.js:507 (chú thích 'tới ngày công bố thì báo
gia đình (lười)'), :569, :590, :973 các chỗ gọi còn lại; :226-240 (baoNeuToiNgay)

**~~Quy trình duyệt không báo cho quản lý khi cô gửi~~ — ĐÃ LÀM Đ154** (huy hiệu trên màn hình chính là dấu vết bền, tin đẩy là dấu hiệu ngay; `lib/huy-hieu.js` + `lib/bao-nha-truong.js`)

Cô gửi báo cáo học tập chờ duyệt, hoặc gửi đề xuất sửa kế hoạch đã duyệt — quản lý cơ sở
không nhận tin nào, chỉ biết khi tự mở màn và thấy con số ở thẻ Chờ duyệt.

*Cỡ việc:* vừa — hoặc chốt là trường tự đặt nếp mở màn hằng ngày

*Bằng chứng:* modules/baocaohoctap/routes.js: chỉ một lời gọi tbb.gui ở :233 và đó là
báo GIA ĐÌNH; modules/kehoachbe/routes.js không require lib/thong-bao-be, đường đề xuất
:992-1025 chỉ ghi audit; số đếm ở :370

**~~DD-12 — chức vụ 'bảo vệ' chỉ được check-in~~ — ĐÃ LÀM Đ156** (chức vụ hẹp nhất bảng: `/api/auth`, `/api/dashboard`, `/api/attendance`; chốt sổ vắng và mốc giờ rà soát vẫn không phải việc ở cổng)

Đ131 mới mở cho văn phòng/quản lý chấm cả cơ sở; chức vụ bảo vệ chưa có. Máy dùng chung
ở cổng đang phải mượn tài khoản văn phòng = thấy ảnh mọi bé của cơ sở. Cần chức vụ mới
chỉ mở /api/attendance — chạm lib/db.js CHUC_VU, commit riêng.

*Cỡ việc:* vừa, tệp dùng chung

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng DD-12, Đã làm 'Đ131 (văn phòng/quản lý chấm;
chưa có tài khoản riêng cho bảo vệ)', Ghi chú 'Tài khoản bảo vệ dùng chung một máy ở
cổng = thấy ảnh mọi bé cơ sở'; phan-hoi.md:240

**~~DD-07 / DD-13 — mốc rà soát cứng 9h, và bảng tháng chưa trừ ngày hoàn~~ — ĐÃ LÀM Đ155** (mốc giờ nay nhà trường đặt được ngay trên màn Điểm danh, lưu theo PHÚT nên "8h30" là 8h30; bảng tháng ĐÁNH DẤU ngày bé vẫn đi học trong đơn hoàn, cố ý không tự trừ)

(1) routes/attendance.js:20 GIO_RA_SOAT = 9 ghi cứng, trong khi trường nói admin điểm
danh từ 8h30 — nên cho cấu hình. (2) Bảng tháng tiền ăn chưa đánh dấu 'ngày trong đơn
hoàn nhưng bé có mặt' để trừ hoàn, dù Đ131 đã cho ảnh thắng đơn nghỉ.

*Cỡ việc:* nhỏ + vừa

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng DD-07 'Mốc giờ cứng 9h; trường nay nói admin
điểm danh từ 8h30'; dòng DD-13 'bảng tháng chưa đánh dấu ngày trong đơn hoàn nhưng bé có
mặt để trừ hoàn'

**BC-02 / KH-02 — liệt kê theo danh mục bài, và trần TOI_DA_MUC_MOI_BE = 12**

Đ142 làm 'mở báo cáo tháng là điền sẵn'; còn thiếu liệt kê tên bài + kết quả + 'tiếp tục
tháng sau' theo danh mục KH-02 và nút chép cả loạt. Trần 12 mục/bé/tháng còn nguyên — có
thể quá thấp cho kiểu tích chọn theo danh mục. Chờ trường gửi danh sách bài mẫu.

*Cỡ việc:* vừa + chờ dữ liệu từ trường

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng BC-02 'làm một phần | Đ142'; dòng KH-02 'chỉ
cần trường gửi danh sách bài mẫu'; modules/kehoachbe/routes.js:130 TOI_DA_MUC_MOI_BE =
12, dùng ở :531-532 và :742

**Phân quyền — ba dòng của bảng 07/09 chưa được đối chiếu**

(1) Hồ sơ bé: admin cơ sở nhập, quản lý/hiệu trưởng sửa, Marketing không thấy. (2) Khảo
sát: admin + cô nhập, MKT/HR/Kế toán không thấy. (3) Sức khoẻ: chỉ quản lý/hiệu trưởng
được SỬA (hiện cô sửa và thu hồi được — xem SK-10). Kèm hai ý cũ 28/08 chưa có mã: tách
vai Quản lý cơ sở vs Admin văn phòng, và biểu phí để ở Cấp 1 nhưng giới hạn xem từng
mảng.

*Cỡ việc:* vừa, chạm lib/db.js CHUC_VU (ba bước ba commit)

*Bằng chứng:* phan-hoi.md:145-148, :167-170, :171-174, :135-136; dòng SK-10; mảng Phân
quyền chưa có bảng đối chiếu (PHAN-HOI-TRUONG-0709.md:242)

**Đ120 — ba món hiệu năng Cambridge, làm TRƯỚC ngày trường bật phân hệ**

keml vẫn ~65 truy vấn/bài sau bước lọc; tra ảnh bằng LIKE '%file%'; tải cả bảng rồi lọc.
Bản vá cần bảng phụ cambridge_anh (khác bảng cambridge_anh_be đã có từ Đ1). Đ143 dựng
Cambridge theo mẫu trường nhưng không ghi đã làm phần này.

*Cỡ việc:* vừa

*Bằng chứng:* docs/RA-SOAT-2026-09.md:118 (mốc làm 'trước khi trường bật Cambridge');
TIEN-DO.md:1075-1076; grep cambridge_anh → chỉ thấy cambridge_anh_be
(modules/cambridge/schema.sql:65, do commit 8f4811b 'Đ1' tạo) — bảng phụ của Đ120 CHƯA
có

**Vá app 1 cho phần nền mà đợt 2 vừa chạm, và ghi dòng Nen-chung: ở lời commit**

Web Push đụng public/sw.js và public/js/app.js; PDF/Word đụng lib/uploads.js — đều là
tệp nền chung, quy ước là 'vá cả hai kho'. Không nguồn nào ghi đã vá app 1. Quy ước bắt
buộc: dòng cuối lời commit ghi 'Nen-chung: đã vá cả hai kho' hoặc 'Nen-chung: CÒN NỢ app
1' để git log --grep liệt kê được.

*Cỡ việc:* vừa, việc ở kho app 1

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng DD-08 Ghi chú 'Web Push đụng public/sw.js và
public/js/app.js là tệp nền chung (docs/LOI-NEN-CHUNG.md, vá cả hai kho)'; dòng CB-03
Ghi chú (lib/uploads.js); docs/LOI-NEN-CHUNG.md:118-129

**16 món nợ nền BẮT BUỘC còn ở kho app 1 (kho này đã vá xong hết)**

Nhóm nặng nhất: Đ39 màn Học phí chọn bé không có tác dụng (và là tiền); 4 món sao
lưu/khôi phục (khôi phục chạy khi máy chủ đang chạy; backups/uploads không bao giờ xoá;
restore bỏ qua ảnh hỏng; .gz ghi không nguyên tử); 5 món rò rỉ (/healthz kể số phiên;
hai bộ canh mật khẩu mẫu báo xanh sai; mật khẩu tạm bằng Math.random; route hoa/thường
bỏ qua phân hệ đã tắt; XSS lưu trữ ở public/js/ui.js dùng ở hơn 30 màn); 2 món
lib/importer.js xoá dữ liệu theo danh sách viết tay; Đ4 + .dockerignore; Đ118a
lib/csv.js bẻ gãy ô có xuống dòng.

*Cỡ việc:* toàn bộ ở kho app 1, không có việc nào trong kho này

*Bằng chứng:* docs/LOI-NEN-CHUNG.md:141-149, :151-153, :157-160 (16 dòng cột Còn nợ =
'app 1'); :154-156, :161 đã gạch

**N1 + N13 — hoàn tất tài liệu triển khai và vá vòng kẹt sau khi có N7**

docs/TRIEN-KHAI.md còn cả hai kịch bản [A] VPS Việt Nam và [B] Render; sau khi trường
chốt phải điền tên miền, IP, chứng chỉ HTTPS thật và XOÁ HẲN nửa không dùng. N13: vòng
kẹt triển khai lần đầu lên Render — đã viết đường ra bằng Render Job create-admin, nhưng
vá bằng mã vẫn chờ N7.

*Cỡ việc:* nhỏ, sau N7

*Bằng chứng:* TIEN-DO.md:697 (N1 'Phần còn lại sau N7'), :708 (N13 'Vá bằng mã vẫn chờ
N7'), :1043 (Đ85 'kèm lời dặn xoá hẳn nửa không dùng')

### B3 — Để sau

**/api/push chưa có trong danh sách api của BỐN chức vụ có danh sách**

Đ137 tự ghi 'chưa làm' cho Cấp 2. Kiểm lại: cả vanphong-coso (Cấp 3) cũng thiếu — bốn
chức vụ nhansu, ketoan, marketing, vanphong-coso đều không có '/api/push'. Màn Cài đặt
đã ẩn thẻ đẩy cho đúng bốn chức vụ này nên chưa lộ ra màn hình, nhưng nếu sau này muốn
mở đẩy cho văn phòng thì phải sửa cả hai chỗ. Sửa lib/db.js là tệp dùng chung → commit
riêng.

*Cỡ việc:* nhỏ, một commit riêng, chạy test:chuc-vu và test:khe-uoc

*Bằng chứng:* TIEN-DO.md:1094 (Đ137 'Chưa làm: chức vụ Cấp 2 chưa có /api/push');
lib/db.js:1379-1399 (vanphong-coso), :1402-1429 (nhansu, marketing, ketoan) — không danh
sách nào có '/api/push'; public/js/views/settings.js:107-108

**Không có đường thay khoá VAPID và không có chỗ xem các máy đã đăng ký**

Khoá VAPID sinh một lần rồi cất trong bảng settings, chỉ sinh khi CHƯA có. Khoá lộ hay
cần đổi thì không có đường nào trong app làm được. Bảng push_dang_ky cũng không có màn
quản trị để xem hay dọn; chỉ tự xoá khi dịch vụ đẩy trả 404/410.

*Cỡ việc:* nhỏ

*Bằng chứng:* lib/day.js:28-36 (khoa(), chỉ generateVAPIDKeys khi chưa có), :91-92 (xoá
khi 404/410); routes/push.js chỉ có 5 đường: trang-thai, khoa-cong-khai, dang-ky
POST/DELETE, thu

**HT-01 / HT-03 — dòng thời gian thống nhất cho cô, và sửa caption bản Ghi nhanh**

Màn gia đình đã theo ngày; màn CÔ vẫn nhiều tab/ô. Thiếu cả đường tắt 'kể cho gia đình'
không qua lớp 2. HT-03: ảnh Ghi nhanh không caption đã hợp lệ, thiếu sửa caption sau.
Dòng thời gian KHÔNG được hiện ô trống 'chưa quan sát' như thiếu sót (QUY TẮC 2).

*Cỡ việc:* lớn (HT-01) + nhỏ (HT-03)

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng HT-01 'lớn | làm một phần', Đã làm TRỐNG;
dòng HT-03 'nhỏ | làm một phần', Đã làm TRỐNG

**TD-04 — nút tải tệp thực đơn**

Đ132 làm ô 'dán bảng từ Excel', không có nút tải tệp lên.

*Cỡ việc:* vừa

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng TD-04, Đã làm 'Đ132 (dán bảng, không tải
tệp)'; phan-hoi.md:245

**Hồ sơ bé — bốn ý chưa có mã**

(1) Đổi nhãn 'Dị ứng' → 'Tiền sử bệnh hoặc lưu ý đặc biệt' và thêm các trường trường yêu
cầu. (2) Khối 'Thông tin trường lớp' ở màn PHỤ HUYNH: tên lớp, GVCN, hotline văn phòng,
email trường, email kế toán; BỎ SĐT giáo viên — không đụng Đ139 (màn CÔ vẫn cần đủ SĐT
bố/mẹ/khẩn cấp). (3) Bắt buộc đủ bố + mẹ + một người liên hệ khẩn cấp ngoài bố mẹ. (4)
Bố cục duyệt theo cây Cơ sở → Lớp → Bé (như Đ138 đã làm cho Sức khoẻ).

*Cỡ việc:* vừa

*Bằng chứng:* phan-hoi.md:4-5, :7, :8, :34, :224-226; mảng Hồ sơ bé chưa có bảng đối
chiếu (PHAN-HOI-TRUONG-0709.md:242)

**Giao diện Hiệu trưởng — màn tổng quan toàn hệ thống chưa có**

Trường cần: tổng số bé; hôm nay đi học / ra về; bé trong danh sách chờ; số nghỉ phân
theo lý do; số cô và số cô đi làm hôm nay; thống kê nộp học phí; chọn từng cơ sở xem
theo ngày. Hiện /api/admin/overview chỉ trả counts gồm classes, students, teachers,
parents, mustChange.

*Cỡ việc:* lớn

*Bằng chứng:* phan-hoi.md:216-221; routes/admin.js:321-330 (đã đọc tận nơi — counts chỉ
có 5 khoá)

**Học phí và Kế toán — bốn ý chưa có mã**

(1) Chỉ kế toán hoặc Cấp 1 được tạo khoản thu. (2) Tạo phí tách theo cơ sở / lớp / trẻ
cho dễ nhìn. (3) Thêm thông tin ngân hàng nộp. (4) Bảng theo dõi ưu đãi và nhắc báo hạn
ưu đãi. Đ140 mới chỉ ẩn ô Học phí khỏi màn cô.

*Cỡ việc:* lớn

*Bằng chứng:* phan-hoi.md:326, :371, :373-374; mảng Kế toán/Học phí chưa có bảng đối
chiếu (PHAN-HOI-TRUONG-0709.md:242)

**Trò chuyện — nhóm phụ huynh tuỳ chọn, thu hồi tin, xoá cuộc trò chuyện**

Đã có phòng chung theo nhóm lớp; chưa có: tạo nhóm với MỘT nhóm phụ huynh tuỳ chọn, thu
hồi tin nhắn, xoá cuộc trò chuyện. Nghĩa của 'xoá cả ở đầu PH' cần anh chốt trước.

*Cỡ việc:* vừa, chờ quyết

*Bằng chứng:* phan-hoi.md:349; routes/messages.js:160 type='group'; grep 'delete|thu-
hoi|thuHoi|recall' trong routes/messages.js → 0 kết quả (đã xác nhận)

**Cấp 1 / Cấp 2 — khung quản trị hệ thống chưa có mã**

Chưa có: quản trị đa cơ sở (tạo/đóng-mở tài khoản chi nhánh), cấu hình danh mục chung
(mức học phí, khung chương trình, mẫu báo cáo, thực đơn mẫu), báo cáo tổng hợp toàn hệ
thống, uỷ quyền phân vai cho Cấp 2/Cấp 3.

*Cỡ việc:* lớn

*Bằng chứng:* phan-hoi.md:71-74; mảng Phân quyền · Tài khoản chưa có bảng đối chiếu
(PHAN-HOI-TRUONG-0709.md:242)

**GET /api/albums đếm ảnh kiểu N+1 ba tầng**

Đường liệt kê album nạp từng tấm ảnh của từng album rồi hỏi tiếp ai được gắn thẻ và nhà
đó đồng ý chưa. Sau vài năm học, một lần gia đình mở màn Album là hàng nghìn câu truy
vấn. Chưa sửa CÓ CHỦ Ý: cách nhanh nhất (nhớ tạm lời đồng ý) có thể hiện ảnh của nhà vừa
rút đồng ý.

*Cỡ việc:* cần đo trước rồi mới ước lượng

*Bằng chứng:* docs/BAO-CAO-TU-LAM.md:450

**KH-01 tắt phân hệ kehoach + LSH-04 khối kế hoạch chung — CHỜ quyết B.9**

KH-01: công tắc + đổi mặc định, và sửa bảy bộ test đang gọi /api/plans (api, co-so, co-
so-quan-tri, bien-soan, phan-he-doc-cheo, nhieu-nhom-giao-dien…). LSH-04: khối 'kế hoạch
chung tuần này' ở đầu Lịch sinh hoạt (chủ đề, bài hát, Casa talkshow, nhắc gia đình,
link video, tệp pdf/word) + quyền soạn cho văn phòng (hanhtrinh_chude hiện do cô soạn).
Không làm được trước khi anh chốt B.9. Ưu tiên: TRƯỚC KHI TRƯỜNG BẤM THỬ (sau quyết
B.9).

*Cỡ việc:* nhỏ (KH-01) + lớn (LSH-04), chờ quyết

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng KH-01 (bảng TĐ/LSH) 'nhỏ | làm một phần', Đã
làm TRỐNG; dòng LSH-04 'lớn | hỏi lại anh', Đã làm TRỐNG

**Marketing — đổi tông màu giao diện theo nhận diện Casa**

Trường nói giao diện 'hơi bị tối', muốn hợp tone Casa. Chưa có mã; cần trường gửi bộ
màu/nhận diện trước khi làm.

*Cỡ việc:* nhỏ, chờ dữ liệu từ trường

*Bằng chứng:* phan-hoi.md:378; mảng Marketing chưa có bảng đối chiếu (PHAN-HOI-
TRUONG-0709.md:242)

**Ba món GĐ 3 chưa có một dòng mã nào**

(1) Báo cáo theo mẫu của phòng GD — phải xin mẫu thật rồi app xuất đúng mẫu để cô không
làm hai hệ đánh giá song song; grep 'phòng GD' trong TIEN-DO: 0 kết quả. (2) Ghi âm
giọng nói trong quan sát; grep 'ghi âm': 0 kết quả. (3) A5 — xoá hẳn đường
/api/medicine/:id/log (cố ý còn sống cho điện thoại bản cũ, 'xoá hẳn để sau, cùng cách
với N3').

*Cỡ việc:* chưa có mã

*Bằng chứng:* docs/KE-HOACH.md:139, :141, mục 9 việc số 8 (:265); TIEN-DO.md:744 (A5),
:1049 (Đ93 video trần 8 MB)

---

## C. Còn phải thử

Hai mươi chín phép thử. Đây là phần `npm test` không thay được: điện thoại thật, tay cô
thật, mạng 4G thật, và ba cổng DỪNG mà chỉ nhà trường mở được.

### C1 — Trước buổi trường bấm thử tới

**Cổng DỪNG GĐ 0 — Ghi nhanh trên iPhone thật và Android thật của cô**

Dựng bàn thử bằng npm run ban-thu, theo phiếu docs/PHEP-THU-DIEN-THOAI.md. Đo: (1) ghi
một khoảnh khắc dưới 20 giây tính từ lúc chạm nút (máy tự bấm giờ, xem trung vị/nhanh
nhất/chậm nhất); (2) tắt mạng rồi ghi, bật lại mạng — bài ghi lên máy chủ và KHÔNG nhân
đôi; (3) Lời hứa 2b: mở lại app trong lúc VẪN đang mất sóng; (4) trên iPhone: đóng app,
bài ghi chỉ lên ở lần mở kế tiếp, ô 'đang chờ gửi' phải nhìn thấy. Cần HTTPS — không có
thì ghi 'chưa thử được', đừng ghi là trượt. Trượt ở đâu thì dừng bàn với anh, không lao
sang GĐ 1.

*Vì sao máy không canh được:* Tốc độ tay người và hành vi PWA trên iOS/Android thật
không đo được bằng bộ kiểm thử tự động

*Bằng chứng:* TIEN-DO.md:18, :82 ('Chỉ đo được trên tay cô giáo thật'), :95-104, :987
(Đ27 Lời hứa 2b), :1041 (Đ83 npm run ban-thu); docs/PHEP-THU-DIEN-THOAI.md mục 1

**Bật đủ phân hệ rồi đăng nhập TỪNG VAI đọc từng màn**

Bật danh sách phân hệ anh chốt trong Quản trị → Tính năng (hoặc ban-thu), rồi đi lại một
ngày dùng app đủ bốn vai: cô, gia đình, văn phòng cơ sở, quản lý cơ sở. Đặc biệt kiểm ô
Nhật ký ngày ẩn/hiện đúng, và trang chủ theo vai (Đ124).

*Vì sao máy không canh được:* Bài kiểm thử hỏi 'máy chủ trả về đúng không', không hỏi
'người ngồi trước màn hình có hiểu đúng không'; bộ test bật/tắt từng phân hệ riêng lẻ,
chưa ai chạy tổ hợp thật

*Bằng chứng:* TIEN-DO.md:23-24 ('chưa ai từng nhìn app ở đúng trạng thái trường sẽ
dùng'), :592-595, :1050 (Đ94 'hai lỗi chỉ lộ ra khi CHẠY THẬT bàn thử, đọc mã không
thấy'); grep 9/9 module.json defaultEnabled:false

**Web Push trên iPhone thật và Android thật, và máy chủ có ra được internet tới dịch vụ đẩy không**

iPhone iOS 16.4+: mở bằng Safari → Chia sẻ → Thêm vào màn hình chính → mở từ biểu tượng
→ Cài đặt → Bật trên máy này → Gửi thử. Rồi KHOÁ MÁY, nhờ cô chụp ảnh 'con tới lớp' và
ghi một bữa nhật ký — xem có hiện trên màn hình khoá không, đúng nhà của bé không, bấm
vào có mở đúng màn không, gộp theo tag không. Làm lại trên Android. Trên máy chủ thật:
nếu 'Gửi thử' báo 'Chưa gửi được tới máy nào' thì kiểm tường lửa ra ngoài.

*Vì sao máy không canh được:* Bài tự động chỉ đòi máy chủ không sập — nó KHÔNG hề chứng
minh gói đẩy tới được máy nào; Playwright không dựng được PWA đã cài trên iOS

*Bằng chứng:* TIEN-DO.md:1094 (Đ137); lib/day.js:14-15, :83-96 (nuốt mọi lỗi, chỉ ghi
cột loiCuoi); public/sw.js:116-131 (bộ nghe push), :133-148 (notificationclick);
test/thong-bao-be.test.mjs:124 chỉ đăng ký endpoint giả https://push.example.test,
:136-139 cố ý chấp nhận cả 200 lẫn 503

**Màn Cài đặt — Bật / Tắt / Gửi thử thông báo, ba vai**

Mở #/settings trên điện thoại thật với gia đình, cô, và văn phòng cơ sở. Bấm Bật, TỪ
CHỐI quyền một lần rồi bật lại, tắt rồi bật lại — xem ba câu trạng thái có nói đúng
không. Kiểm luôn: cô bật xong có nhận được tin thật nào không (xem mục ở phần Còn phải
làm).

*Vì sao máy không canh được:* Bộ 11 tệp trình duyệt của test:giao-dien không có tệp nào
vào màn Cài đặt; phần push chỉ được đọc bằng chuỗi trong tệp nguồn

*Bằng chứng:* public/js/views/settings.js:110-124 (st-push-card, st-push-bat/-thu/-tat),
:144-172 (veTrangThaiDay); không tệp nào trong test:giao-dien mở #/settings hay chạm st-
push — chỉ có canh tĩnh bằng regex ở test/thong-bao-be.test.mjs:161

**Các luồng chụp ảnh của đợt 1–2 trên tay cô ở lớp và ở cổng**

Điểm danh (Đ131): chụp ảnh = có mặt; nút 'Sửa' ba trạng thái; nút 'Chốt sổ vắng cho N
bé' chỉ hiện sau 9h. Trả bé một chạm bằng ảnh (Đ128). Ghi nhanh nhiều bé một lượt
(Đ144): chọn 3–4 bé, kiểm dòng đếm đổi đúng, lưu, xem mỗi bé có đúng MỘT bản ghi riêng;
thử lúc mất mạng rồi bật lại. Nhật ký theo bước từng bữa (Đ141). Hai lần buổi thử trước
người dùng hỏi 'sao chưa thấy phần chụp ảnh' — lỗi chỉ lộ khi có người thật bấm.

*Vì sao máy không canh được:* Đợt 2 mới xong 09–10/09, sau buổi thử gần nhất 04/09;
chuỗi tc-be-dem không có trong tệp test nào

*Bằng chứng:* TIEN-DO.md:1082 (Đ126b), :1085 (Đ128 'hai lần hỏi sao chưa thấy phần chụp
ảnh'), :1088, :1098, :1101; modules/thuchup/view.js:337-378 (#tc-be, #tc-be-dem),
:380-400; test/album-che-do.test.mjs:205-207 chỉ kiểm bằng regex trên tệp nguồn; bài
trình duyệt test/bien-soan-phan-he.test.mjs:295-322 chỉ ghi cho MỘT bé

**Nhập cân đo cả nhóm (Đ138) trên điện thoại của cô**

Với một nhóm ~20 bé, bấm 'Nhập cân đo cả nhóm', điền vài bé, ĐỂ TRỐNG vài bé, gõ nhầm
một số ngoài khoảng (170 cm), bấm Lưu; mở lại tháng đó xem số đã vào đúng dòng bé nào.
Xem bàn phím số trên điện thoại có che mất nút Lưu không, và mạng chập chờn có mất dữ
liệu không.

*Vì sao máy không canh được:* Bài trình duyệt chỉ mở BẢNG nhóm và bấm vào một bé; hộp
nhập cả nhóm chưa từng được bấm ở đâu

*Bằng chứng:* public/js/views/health.js:64 (#btn-can-do-nhom), :82, :176-207 (hộp thoại
.ht-cd, #ht-cd-luu); routes/health.js:124-180; chuỗi 'btn-can-do-nhom' KHÔNG xuất hiện
trong bất kỳ tệp nào dưới test/

**SK-01 / SK-05 / SK-08 — bảng cả nhóm và lịch sử cân đo giữ QUY TẮC 2, 3, 4**

Chạy test:quy-tac-4 và bài canh Đ56 (máy chủ KHÔNG tự sinh bmiNote — phải giữ xanh). Rồi
nhìn bằng mắt: bảng nhóm không tô màu, không xếp theo cân nặng, không có cột 'so với
chuẩn'; bé chưa đo hiện '—' chứ không phải ô đỏ; biểu đồ lịch sử của phụ huynh chỉ có
chỉ số của chính bé, KHÔNG percentile, không so với bạn. Kiểm luôn ô gợi ý 'VD: 105' có
bị đọc thành chuẩn không.

*Vì sao máy không canh được:* Bài canh bắt được chữ cấm, không bắt được cách trình bày
bị đọc ra thành xếp hạng

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng SK-01, SK-05 ('máy chủ KHÔNG tự sinh bmiNote
— đã có bài canh Đ56, phải giữ xanh'), SK-08 'Đ138 (lịch sử cân đo, không đường chuẩn)';
public/js/views/health.js:352-358

**NK-06 / Đ141 — ô Nhật ký ẩn/hiện đúng đối tượng**

Cô nhóm 3–6 không có bé nhà trẻ → không thấy ô. Cô phụ trách cả hai nhóm → vẫn thấy. Bé
20 tháng học nhóm mẫu giáo → cô và gia đình vẫn ghi/đọc được. Phụ huynh nhóm 3–6 có thấy
ô trên trang chủ không (phần này chưa ghi đã làm). Nhóm nhà trẻ mà toàn bé > 36 tháng →
cả màn báo gì.

*Vì sao máy không canh được:* Luật cắt theo ngày sinh khác lời trường nói — hệ quả chỉ
thấy khi đặt lên danh sách trẻ thật

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng NK-06 Ghi chú 'ẩn cả phân hệ theo nhóm sẽ làm
mất nhật ký của bé 20 tháng học nhóm mẫu giáo'; modules/nhatky/routes.js:97-120,
:344-348; modules/nhatky/view.js:315-325

**LSH-01 / Đ133 — cô bị chặn sửa lịch sinh hoạt ở CẢ API và giao diện**

Đăng nhập vai cô, gọi PUT /api/timetable/:classId → phải bị chặn với câu tiếng Việt dễ
hiểu; nút sửa không hiện trên màn; hai bộ test bien-soan đã cập nhật và xanh.

*Vì sao máy không canh được:* Đây là đổi hành vi của tính năng đang bật — phải kiểm cả
hai đầu, không chỉ đầu giao diện

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng LSH-01 Thiếu 'Chặn cô ở API và ẩn nút sửa;
cập nhật hai bộ test bien-soan'; TIEN-DO.md:1090 (Đ133)

**Thực đơn và Lịch sinh hoạt trên điện thoại — ngồi cùng trường chọn cách trình bày**

Mở màn Thực đơn (Đ132: tab T2–T6, năm bữa) và Lịch sinh hoạt 13 dòng (Đ133) trên điện
thoại của cô VÀ của một phụ huynh, cùng ngồi với trường. Nói rõ khối kế hoạch chung ở
đầu (LSH-04) chưa có. Thử luôn: lấy đúng tệp thực đơn tuần trường đang dùng, sao chép
bảng rồi dán vào ô soạn cả tuần — xem năm bữa có rơi đúng cột đúng thứ không.

*Vì sao máy không canh được:* Playwright chạy trên máy, không thay được mắt người trên
màn hình 5 inch; bộ test dán chuỗi tự dựng, không dán đúng định dạng Excel của trường

*Bằng chứng:* phan-hoi.md:12, :13, :42, :43, :245; PHAN-HOI-TRUONG-0709.md dòng KH-02
'Trường muốn xem thử lịch sinh hoạt trên điện thoại để chọn cách trình bày' + 'Chưa có
khối kế hoạch chung ở đầu (LSH-04)'

**Cambridge — Block/Week, lọc lứa theo ngày sinh, và mở tệp Word/PDF trên máy phụ huynh**

Văn phòng tạo một Block, soạn một bài có Week + lứa 3–4, đính một tệp PDF và một .docx
THẬT của trường, gửi gia đình. Tạo bé sát ranh 48 tháng (tròn tháng, thiếu một ngày) và
một bé nhóm Lá 5 tuổi. Mở bằng tài khoản gia đình của bé 3 tuổi rưỡi, 4 tuổi rưỡi, 5
tuổi — ai thấy được bài nào, tệp nào. Từ điện thoại PH (iPhone và Android) bấm vào tệp:
.docx có mở được không hay chỉ tải rồi kẹt; tên tệp tiếng Việt có dấu hiện đúng không;
app đã cài vào màn hình chính thì thẻ target=_blank có chạy không.

*Vì sao máy không canh được:* Không bài trình duyệt nào bấm vào ô tệp; kết quả mở .docx
phụ thuộc hoàn toàn vào ứng dụng cài trên máy

*Bằng chứng:* modules/cambridge/routes.js:44-61 (luaTuoiCuaBe), :779-781, :783 (Content-
Disposition: inline cho cả .docx); modules/cambridge/view.js:160, :337, :376, :420-450,
:490-497; lib/uploads.js:206-215; test/cambridge-khung.test.mjs:250 chỉ kiểm id bằng
regex; test/bien-soan-phan-he.test.mjs:372-405 chỉ điền #cam-tieude và #cam-noidung

**Bộ canh tệp dùng chung và CI sau đợt 2**

Chạy npm test đủ (mốc 10/09: 4563 bài / 80 bộ + test:giao-dien 554, FAIL 0), và chạy Ở
CẢ BUỔI SÁNG LẪN BUỔI CHIỀU giờ VN — test:diem-danh-theo-anh mục [3] có hai nhánh theo
giờ, lỗi 'giờ trước quyền' chỉ lộ khi chạy trước 9h sáng VN. Chạy test:khe-uoc
(lib/uploads.js thêm hàm PDF/DOCX), test:sw-version (sw.js đổi vì Web Push),
test:commit-rieng cho các commit chạm lib/db.js, lib/uploads.js, sw.js, app.js. Rồi mở
tab Actions của pichu124/casa-mamnon kiểm cả 5 job xanh cho Đ137–Đ144 — nhật ký từ Đ120
tới Đ144 không ghi kết quả CI lần nào.

*Vì sao máy không canh được:* CI chạy vào một giờ nhất định chỉ đi một nhánh; và nhật ký
chỉ ghi số bài ở máy nhà, không ghi trạng thái job trên GitHub

*Bằng chứng:* TIEN-DO.md:620-621 (con số), :1102 (Đ137c/Đ131-sửa 'bộ canh phụ thuộc giờ
trong ngày là bộ canh chỉ xanh vào buổi chiều'), :1088 ('mục [3] có hai nhánh theo giờ
chạy'), :1074 (Đ119c 'đỏ trên CI mà không đỏ ở máy thì nhìn vào cấu hình CI trước khi
nghi mã')

**Album so với Hành trình học tập — trường vẫn chưa phân biệt được**

Ngồi cùng MỘT cô và MỘT phụ huynh: đăng một bài Hành trình có ảnh rồi mở Album xem ảnh
có về đúng chỗ không, và hỏi thẳng họ hiểu hai mục khác nhau ở đâu. Trường đã hỏi đúng
câu này hai lần.

*Vì sao máy không canh được:* Đây là bài thử về hiểu nhầm của người dùng, không phải về
mã

*Bằng chứng:* phan-hoi.md:337 'Test thử ablum ảnh: Cái này là ảnh chung hay ntn? -> nó
sẽ bị lồng trong hành trinh hoc tập ko?', :359; PHAN-HOI-TRUONG-0709.md dòng AL-05

### C2 — Trước khi trường chạy thật

**Tin riêng từng bé KHÔNG lọt sang gia đình khác**

Hai máy, hai tài khoản phụ huynh của hai bé khác nhóm. Cô chụp ảnh check-in, ghi nhật
ký, nhập cân đo cho MỘT bé — máy kia phải không nhận gì. Làm thêm: tạo album chế độ
'theo thẻ', gắn thẻ bé A → gia đình bé B cùng nhóm không thấy ảnh và KHÔNG nhận tin
(tránh lộ 'con nhà khác có ảnh'); gia đình A nhận tin riêng.

*Vì sao máy không canh được:* Đường dữ liệu vừa mới thêm ở đợt 2; CLAUDE.md gọi đây là
chỗ dễ rò rỉ nhất và mất lòng tin cô giáo nhanh nhất

*Bằng chứng:* Đ137 dựng ba bảng mới (thongbao_be…); PHAN-HOI-TRUONG-0709.md dòng AL-03
Ghi chú 'thông báo chỉ được tới gia đình bé có trong ảnh'; dòng DD-08 'phải giữ luật ảnh
chỉ tới nhà của chính bé (canAccessStudent)'

**Album chế độ theo thẻ + ảnh câu chuyện Hành trình đổ về album**

Cô tạo album 'Theo thẻ', đăng 3 ảnh, gắn thẻ 1 bé; đăng nhập hai tài khoản gia đình khác
nhau xem mỗi nhà thấy đúng mấy tấm và nhà được gắn thẻ có nhận tin không. Rồi: cô ghi
một quan sát có ảnh, mở 'Câu chuyện cho gia đình', chọn một album CÔNG KHAI ở ô 'Lưu ảnh
về album', bấm 'Kể cho gia đình' — mở Album bằng tài khoản gia đình bé đó VÀ một gia
đình khác cùng nhóm, xem ai thấy tấm đó (đây là điểm cần anh quyết).

*Vì sao máy không canh được:* Luật lọc đã có bài API đầy đủ, nhưng ô chọn trên hộp thoại
chỉ được canh bằng cách ĐỌC CHUỖI trong tệp — cách này bắt được lỗi xoá nhầm, không bắt
được ô bấm không ăn

*Bằng chứng:* public/js/views/albums.js:274-283 (#al-che-do), :471-472;
modules/hanhtrinh/view.js:426-434 (#ht-album), :458-466; routes/albums.js:261-266;
test/album-che-do.test.mjs:210-213 CHỈ kiểm bằng regex /id="al-che-do"/ và /id="ht-
album"/ trên tệp nguồn; test/album.test.mjs [7] đăng album nhưng không chạm ô chế độ

**GN-01 — Ghi nhanh nhiều bé vẫn giữ quyền TỪNG bé**

Chọn 3 bé trong đó có 1 bé đã ngưng hồ sơ học tập (Đ96) hoặc không thuộc nhóm cô → phải
bị từ chối ĐÚNG bé đó, các bé còn lại vẫn ghi được; và bản ghi vẫn ở lớp 1 (chỉ cô đã
ghi thấy).

*Vì sao máy không canh được:* Đường ghi nhiều bé một lượt là đường mới của Đ144 — chỗ dễ
quên vòng lặp kiểm quyền nhất

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng GN-01 Ghi chú 'vẫn canAccessStudent và
beNgungHoSoHocTap cho TỪNG bé (Đ96)'; TIEN-DO.md:1052 (Đ96)

**Luồng duyệt báo cáo học tập trên trình duyệt và mốc ngày công bố**

Cô bấm 'Gửi quản lý duyệt'; quản lý mở thẻ Chờ duyệt, chọn ngày công bố là NGÀY MAI, bấm
Duyệt. Kiểm: hôm nay gia đình KHÔNG thấy gì; sang hôm sau mở lại thì thấy và nhận tin —
kiểm sát mốc 0h theo giờ VN (UTC+7, lib/ngay.js). Thử cả nhánh 'Trả lại cho cô' kèm ý
kiến. Nhớ: tin 'tới ngày' hiện chỉ gửi khi có người mở màn (xem mục Còn phải làm).

*Vì sao máy không canh được:* Luồng chỉ có bài API test/bao-cao-duyet.test.mjs; vế 'sang
ngày mai' chưa có bài test cho mốc ngày

*Bằng chứng:* modules/baocaohoctap/view.js:527-547 (#bc-ngay-cong-bo, #bc-duyet, #bc-
tra, #bc-gui); modules/baocaohoctap/routes.js:507, :226-240; bài trình duyệt test/bien-
soan-phan-he.test.mjs:470-540 DỪNG ở bản NHÁP; chuỗi 'cong-bo', bc-duyet, bc-ngay-cong-
bo không có trong tệp trình duyệt nào

**Kế hoạch của bé — danh mục bài, đề xuất sửa, duyệt cả nhóm, nhìn lại cuối tháng**

Quản trị thêm vài bài học vào danh mục theo góc lĩnh vực. Cô tích chọn bài cho một nhóm
(thử vượt trần 12 mục/bé xem câu từ chối nói gì), gửi quản lý duyệt cả nhóm, quản lý bấm
Duyệt tất cả. Cô gửi một đề xuất sửa kèm lý do, xem quản lý duyệt/từ chối ra sao. Cuối
cùng mở phần nhìn lại và tích 'tiếp tục cùng con'.

*Vì sao máy không canh được:* Cả ba việc thêm ở đợt 2 chưa có bài trình duyệt nào chạm
tới; chỉ có bài API

*Bằng chứng:* modules/kehoachbe/view.js:724 (#kb-bh-them), :284-290, :138, :580-581,
:531; modules/kehoachbe/routes.js:130-132 (TOI_DA_MUC_MOI_BE=12), :531-532; bài trình
duyệt test/bien-soan-phan-he.test.mjs:352-370 chỉ gõ một ô .kb-o rồi bấm #kb-luu

**Tầng chức vụ Cấp 2 / Cấp 3 — chưa bao giờ được người thật bấm thử**

Bàn thử đã có bốn tài khoản: vanphong1 (Cấp 3, cơ sở 1), nhansu, ketoan, marketing (Cấp
2). Đăng nhập từng tài khoản, đi qua trang chủ theo vai (Đ124), hồ sơ bé, học phí,
album, điểm danh cả cơ sở (Đ131), lịch sinh hoạt (Đ133), sức khoẻ nhóm (Đ138), Cambridge
(Marketing có mở được không — điểm cần quyết). Soát CẢ CHIỀU 'thấy quá nhiều'.

*Vì sao máy không canh được:* HTTP đã đo (403/200 đúng vai) nhưng chưa ai bấm thử bằng
mắt; các đợt thử 03–04/09 đều bằng tài khoản Cấp 1

*Bằng chứng:* TIEN-DO.md:1061 (Đ104 — 'bàn thử chỉ có một tài khoản Cấp 1, nên tầng phân
quyền chưa bao giờ được người thật bấm thử… sai kiểu thấy quá nhiều thì màn hình vẫn
chạy trơn, không có gì báo'); lib/db.js:1364-1430

**Bảo vệ chụp ảnh ở cổng bằng MỘT máy dùng chung**

Dựng đúng cảnh sáng thứ Hai: một máy ở cổng, kiểm xem người đứng cổng thấy được ảnh của
những bé nào (hiện phải mượn tài khoản văn phòng = thấy ảnh mọi bé cơ sở), và sau 8h30
văn phòng tiếp quản có trơn không. Thêm: admin cơ sở A chấm nhóm của cơ sở B → phải 403;
ảnh do admin chụp chỉ hiện với gia đình bé đó.

*Vì sao máy không canh được:* Chưa có chức vụ 'bảo vệ'; rủi ro lộ ảnh chỉ thấy khi đứng
ở cổng thật

*Bằng chứng:* phan-hoi.md:240 'Điểm danh thường sẽ do bảo vệ điểm danh'; PHAN-HOI-
TRUONG-0709.md dòng DD-12 Ghi chú 'Tài khoản bảo vệ dùng chung một máy ở cổng = thấy ảnh
mọi bé cơ sở'

**Đối soát tiền ăn cuối tháng với kế toán thật (nhớ BẬT phân hệ tienan)**

BẬT phân hệ tienan (mặc định TẮT — trường thử mà chưa bật thì không thấy gì). Chạy một
tháng dữ liệu thật, xuất bảng CSV rồi ngồi đối chiếu với sổ của kế toán và với màn của
một phụ huynh. Thử riêng ca DD-13: duyệt đơn nghỉ CÓ hoàn tiền, rồi chụp ảnh bé tới lớp
đúng ngày đó — xem /api/tienan/thang có trừ ngày hoàn không.

*Vì sao máy không canh được:* Bộ kiểm thử không biết con số nào là đúng theo sổ giấy của
kế toán

*Bằng chứng:* phan-hoi.md:9, :39; PHAN-HOI-TRUONG-0709.md dòng DD-04 'Phân hệ tienan mặc
định TẮT', dòng DD-13 Thiếu 'bảng tháng chưa đánh dấu ngày trong đơn hoàn nhưng bé có
mặt để trừ hoàn'

**SK-04 — bản ghi 'Tiêm chủng' cũ vẫn hiện, máy chủ vẫn nhận type cũ**

Bản ghi vaccination có sẵn phải HIỆN nguyên (Nguyên tắc số 1 mục 3: bỏ tính năng là
ngưng dùng, không xoá dữ liệu). App bản cũ POST type vaccination không được 400. Kiểm
luôn: 'Cân đo hằng tháng' đã tách khỏi 'Khám' chưa (Đ136 chỉ ghi 'bỏ Tiêm chủng khỏi mẫu
ghi mới').

*Vì sao máy không canh được:* Đây là vế 'dữ liệu cũ không được mất' — dễ trượt khi bỏ
một loại khỏi biểu mẫu

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng SK-04 Thiếu 'tách Cân đo hằng tháng thành
loại riêng bên cạnh Khám (hiện cả hai đều checkup)' + Ghi chú Nguyên tắc 1 mục 3; TIEN-
DO.md:1093 (Đ136)

**Tải nặng qua mạng 4G ở cơ sở, và lịch tháng của phụ huynh**

Đứng ở cơ sở dùng 4G (KHÔNG dùng wifi trường): tải một PDF gần 8 MB lên bài Cambridge,
đăng một album 20 ảnh chụp bằng điện thoại. Đo thời gian, xem có lượt nào đứt giữa
chừng, có ảnh nào mồ côi không. Rồi mở lịch điểm danh tháng của phụ huynh (tải 2×22 ảnh
nhỏ) — kiểm loading=lazy, thời gian tải, dung lượng.

*Vì sao máy không canh được:* Bài tự động chạy trên máy cùng ổ đĩa, không có độ trễ và
không có cảnh đứt sóng giữa lượt gửi

*Bằng chứng:* lib/uploads.js:198 (trần 8 MB/tệp); server.js:20 (express.json limit 12mb
— 8 MB base64 ≈ 10,7 MB, SÁT trần); modules/cambridge/view.js:490-495 (gửi từng tệp một
vì lý do đó); public/js/views/albums.js:418-424; PHAN-HOI-TRUONG-0709.md dòng DD-17 'tải
2×22 ảnh nhỏ/tháng — cân nhắc lazy-load'

**Nợ nền — đối chiếu tận nơi ở kho app 1, mỗi bản vá kèm bài test Ở KHO ĐÓ**

Mở kho app 1, so từng tệp/dòng như bốn món 30/08 đã làm (mỗi món ghi rõ
bc9dfa3:<tệp>:<dòng>) rồi mới ghi trạng thái vào sổ. Mỗi bản vá mang sang PHẢI kèm bài
kiểm thử tái hiện đúng lỗi Ở KHO ĐÓ — tuyệt đối không lấy kết quả xanh của app 2 làm
bằng chứng. Vá ở kho phát hiện lỗi → npm test xanh → commit → cherry-pick; cherry-pick
báo đụng độ nghĩa là hai bên đã lệch, chuyển sang chép tay theo ý nghĩa. Sau mỗi đợt
chạy lại đủ bộ ở app 1 (mốc đã đo: 932 → 1017, FAIL 0). Kiểm riêng .dockerignore của app
1 có chặn *.db, uploads/, backups/ không.

*Vì sao máy không canh được:* Không bộ kiểm thử nào ở kho này đọc được kho kia; đây là
điểm yếu đã biết và chấp nhận khi chọn tách hai kho

*Bằng chứng:* docs/LOI-NEN-CHUNG.md:190-195 ('ghi sổ sai còn tệ hơn sổ trống'),
:110-113, :94-98, :104-109, :187-188, :141, :364-366 ('canh bằng người, không canh bằng
máy')

**N13 — bước Render Job create-admin chưa ai chạy thử**

Nếu chọn kịch bản [B] Render: chạy thử đủ bốn bước trong docs/TRIEN-KHAI.md, đặc biệt
bước 2 (Render Job gắn CÙNG ổ đĩa chạy create-admin một lần TRƯỚC khi deploy) — thử
trước khi hẹn với trường.

*Vì sao máy không canh được:* Vòng kẹt chỉ xuất hiện ở lần deploy đầu trên hạ tầng thật
của nhà cung cấp

*Bằng chứng:* TIEN-DO.md:708 (N13 — 'Vẫn chưa ai chạy thử bước đó, và tài liệu nói thẳng
điều này | Thử trước khi hẹn với trường')

### C3 — Để sau

**NK-05 — thông báo có bị loãng không, và Đ14 không hứa suông**

Dùng thử với vài phụ huynh nhóm nhà trẻ MỘT TUẦN; đếm số tin/ngày mỗi gia đình nhận (5
bữa + ngủ + bỉm × mỗi bé); hỏi thẳng họ có tắt đẩy không. Song song chạy test:khong-hua-
suong và đọc lại chữ trên màn: không được ghi 'đã gửi thông báo' khi gia đình chưa bật
đẩy (lúc đó chỉ là dòng trong app).

*Vì sao máy không canh được:* Là trải nghiệm người thật, không phải lỗi mã; và bộ canh
đó không còn canh từng lời hứa cụ thể

*Bằng chứng:* PHAN-HOI-TRUONG-0709.md dòng NK-05 Ghi chú (a) 'Đ14 + test:khong-hua-
suong', (b) 'mỗi lần cập nhật một thông báo × 5 bữa+ngủ+bỉm × 20 bé là làm loãng thông
báo thật (con sốt)'; test/khong-hua-suong.test.mjs:14-17, :96, :134 (bộ canh tự nới ra
khi đã có đường đẩy)

**Cổng DỪNG GĐ 1 và GĐ 2 — nhóm thí điểm chạy song song sổ giấy**

GĐ 1: chọn một nhóm (gợi ý nhóm nhà trẻ để dùng nhật ký bỉm/bú bình), cô ghi CẢ app lẫn
sổ giấy 2 tuần, đo chỉ tiêu 'nhật ký cả nhóm dưới 5 phút' bằng đồng hồ thật, rồi cô nhóm
đó xác nhận không cần ghi sổ nữa. GĐ 2: 2 tuần dùng thật, mỗi bé có ít nhất một câu
chuyện gia đình đọc được; đo chỉ tiêu ≤ 3 phút một quan sát ở màn suy ngẫm (màn đã có
bấm giờ); kiểm cô nhóm khác và nhà khác không thấy, ghi chú thô của cô không lộ; hỏi cô
phần suy ngẫm có thành gánh nặng buổi tối không.

*Vì sao máy không canh được:* Không bài test nào chứng minh được cô bỏ được sổ giấy; là
nghiệm thu của người dùng

*Bằng chứng:* TIEN-DO.md:18 (ba cổng đều chưa mở, 'Đã chạy thật ở trường: chưa'), :1001
(Đ41 — máy chịu trách nhiệm đo dưới 1 giây, 'gần trọn 5 phút là thời gian của NGƯỜI'),
:726-727 (GĐ2-A/B), :1101 (Đ144); docs/KE-HOACH.md:110, :133

**Hai cô cùng ghi một bản, một ô**

Hai điện thoại, hai tài khoản cô cùng nhóm, cùng mở một bản báo cáo học tập: cô A gõ và
lưu một ô; cô B (đang mở màn TỪ TRƯỚC) gõ đúng ô đó rồi bấm Lưu — xem câu từ chối hiện
ra thế nào và cô B có mất chữ vừa gõ không. Làm tương tự với Nhật ký ngày cùng một bữa.

*Vì sao máy không canh được:* Bài API gọi lần lượt nên không dựng được cảnh màn hình cô
B đang giữ dữ liệu cũ

*Bằng chứng:* modules/baocaohoctap/routes.js:784-789 (từ chối kèm tên cô đã khoá);
modules/nhatky/routes.js:720-725 (xungDot theo capNhatLuc); test/bao-cao-
duyet.test.mjs:158-192 và test/nhat-ky-bua.test.mjs chạy TUẦN TỰ trong một tiến trình

**Mục 'Kho ảnh của trường' trên máy chủ THẬT sau ≥ 14 ngày dữ liệu**

Sau khi máy chủ thật chạy ít nhất 14 ngày và có > 200 MB ảnh, chạy npm run kiem-tra-may-
chu và đọc mục 'Kho ảnh của trường' — phải ra tốc độ tăng/ngày và số tháng còn lại,
không còn chữ 'chưa đủ dữ liệu để đoán'. Đây là số phải có TRƯỚC khi quyết mở video dài
(B.6) và trước khi quyết N25.

*Vì sao máy không canh được:* Bài canh dùng tệp thưa và số giả định; con số thật chỉ có
trên đĩa máy chủ thật

*Bằng chứng:* TIEN-DO.md:1086 (Đ129 — 'dưới 14 ngày hoặc dưới 200 MB thì chỉ báo số liệu
thô kèm chữ chưa đủ dữ liệu để đoán'; 'xếp loại phụ thuộc dung lượng đĩa, mà máy người
này 252 GB còn máy chạy CI có thể 40 GB'); docs/KE-HOACH.md:232

---

## D. Độ tin của chính sổ này

Phần D của `docs/PHAN-HOI-TRUONG-0709.md` tự nhận **chưa có bảng đối chiếu cho ba mảng
lớn**: Phân quyền · Hiệu trưởng · Hồ sơ bé · Hồ sơ nhân sự · Tài khoản; Kế toán/Học phí
· Nhân sự · Marketing; Phụ huynh · Thông báo · Khảo sát · Trò chuyện. Gần như mọi mục
"chưa có mã" trong danh sách B rơi đúng vào ba mảng đó.

Nghĩa là: **danh sách B chưa đầy đủ**, và con số 33 sẽ còn tăng khi ba bảng kia được đối
chiếu xong. Nếu anh lên kế hoạch đợt 3 dựa trên sổ này thì nên dựng ba bảng còn thiếu
trước — nếu không là lên kế hoạch trên một danh sách thiếu.

Tám mục đã bị loại sau khi kiểm chứng (đã làm rồi, hoặc sai): thông báo đẩy tới từng gia
đình (làm ở Đ137); ba cơ sở nấu bếp chung hay riêng (trường trả lời 30/08, làm ở
Đ90/Đ91); nghi ngờ mục C.1/C.3 của đợt 2 chưa làm (đọc lại: cả tám mục đều xong); và bốn
mục khác bị thu hẹp hoặc mở rộng cho đúng phạm vi thật.

