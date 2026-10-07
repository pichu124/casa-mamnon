-- CAMBRIDGE & KẾT NỐI Ở NHÀ — văn phòng đăng, gia đình đọc.
--
-- NHÀ TRƯỜNG CHƯA CHỐT NỘI DUNG, NÊN CẤU TRÚC PHẢI RỘNG
--
-- Yêu cầu chỉ có một dòng: "văn phòng đăng lên, phụ huynh đọc; chưa rõ nội
-- dung gồm những gì". Đoán trước rồi khoá cứng thành các ô riêng (tuần mấy,
-- chủ điểm gì, từ vựng nào) là cầm chắc phải sửa lược đồ khi trường gửi mẫu
-- thật — mà sửa lược đồ của bảng đã có dữ liệu là việc CLAUDE.md cấm.
--
-- Nên ở đây chỉ có tiêu đề, một khối chữ, vài tấm ảnh, và một cái nhãn loại.
-- Trường gửi mẫu rồi thì thêm ô là chuyện của một bảng phụ, không phải của
-- một câu ALTER.
--
-- HAI LOẠI, VÌ CHÚNG NÓI VỚI HAI NGƯỜI KHÁC NHAU
--
--   'cambridge' — tuần này lớp học gì trong chương trình Cambridge.
--   'ket-noi'   — gợi ý gia đình làm cùng con ở nhà.
--
-- PHẠM VI: cả trường · một cơ sở · một nhóm.
--
-- Ba mức, vì một tờ Home Connection của nhóm Lá 1 gửi cho gia đình nhóm nhà
-- trẻ là thư rác — mà thư rác thì làm gia đình ngừng đọc mọi thứ khác.
--
-- CÔNG BỐ LÀ MỘT BƯỚC RIÊNG (`congBoLuc` rỗng = còn là nháp của văn phòng).
-- Soạn dở trong giờ làm việc rồi để đó là chuyện thường; gia đình không được
-- đọc bản dở.
CREATE TABLE IF NOT EXISTS cambridge_bai (
  id         TEXT PRIMARY KEY,
  loai       TEXT NOT NULL DEFAULT 'cambridge',
  tieuDe     TEXT NOT NULL,
  noiDung    TEXT NOT NULL DEFAULT '',
  tuan       TEXT NOT NULL DEFAULT '',   -- ngày thứ Hai của tuần, rỗng = không gắn tuần
  phamVi     TEXT NOT NULL DEFAULT 'truong',
  campusId   TEXT NOT NULL DEFAULT '',
  classId    TEXT NOT NULL DEFAULT '',
  -- Danh sách tên tệp ảnh, mỗi dòng một tên. Cột phẳng chứ không nhét JSON:
  -- bảng của phân hệ không đi qua JSON_COLS của lib/db.js nên JSON ở đây sẽ về
  -- tay người đọc dưới dạng chuỗi thô.
  anh        TEXT NOT NULL DEFAULT '',
  congBoLuc  TEXT,
  nguoiDang  TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_bai_theo_tuan ON cambridge_bai(tuan DESC);
CREATE INDEX IF NOT EXISTS cambridge_bai_theo_pham_vi ON cambridge_bai(phamVi, campusId, classId);

-- ẢNH CỦA BÀI CÓ MẶT BÉ HAY KHÔNG — bảng riêng, vì cột thì không thêm được.
--
-- Luật ảnh nhóm cần biết trong ảnh có trẻ hay không. Album trả lời bằng cách
-- cho cô GẮN THẺ từng bé; ở đây thì không có cơ chế đó, và thêm nó vào là một
-- hạng mục riêng.
--
-- Nên chỉ hỏi đúng một câu, cho cả bài: ảnh này CÓ MẶT BÉ không.
--
-- KHÔNG CÓ DÒNG NÀO = COI NHƯ CÓ MẶT BÉ. Đây là chỗ quan trọng nhất của bảng
-- này. Mặc định phải là phía AN TOÀN, vì người quên tích ô thì quên theo hướng
-- đóng lại chứ không phải mở ra — cùng một luật với danh sách cho phép của
-- tầng chức vụ. Văn phòng phải chủ động nói "ảnh này không có bé nào" thì ảnh
-- mới đi rộng ra được.
--
-- Bảng riêng chứ không phải cột mới trong `cambridge_bai`: lược đồ của phân hệ
-- chỉ được CREATE ... IF NOT EXISTS, nên thêm cột vào một bảng đã tồn tại thì
-- câu lệnh im lặng không chạy — đúng loại lỗi không ai phát hiện.
CREATE TABLE IF NOT EXISTS cambridge_anh_be (
  baiId    TEXT PRIMARY KEY,
  coMatBe  INTEGER NOT NULL DEFAULT 1,
  ghiLuc   TEXT
);

-- =============================================================================
-- TRƯỜNG ĐÃ GỬI MẪU (07/09/2026) — THÊM BẢNG PHỤ, ĐÚNG NHƯ ĐÃ HỨA Ở ĐẦU TỆP
-- =============================================================================
--
-- Chương trình Cambridge của trường đi theo BLOCK (mỗi block vài tuần, có mục
-- tiêu và thời gian áp dụng từ … đến …) và WEEK. Lớp Montessori trộn 3–5 tuổi,
-- nhưng Cambridge chỉ có hai lứa 3–4 và 4–5, nên mỗi block / mỗi bài có thể
-- dành riêng cho một lứa. Mỗi bài tuần ghi: Hoạt động (Cambridge gọi là môn), Chủ đề, Từ vựng,
-- Song/Chant, Kết nối ở nhà — và kèm tệp PDF / Word chứ không chỉ ảnh.
--
-- `cambridge_bai` GIỮ NGUYÊN: tiêu đề, khối chữ (thư gửi gia đình), ảnh, phạm
-- vi. Phần khung đi vào bảng phụ khoá theo bài; bài không có dòng khung thì
-- màn hình vẽ y như trước. Không một câu ALTER nào.

-- Một BLOCK của chương trình: "Block 1 · 3–4 tuổi · 08/09 → 17/10 · mục tiêu…".
-- Chương trình là của cả trường nên không gắn cơ sở hay nhóm.
CREATE TABLE IF NOT EXISTS cambridge_block (
  id         TEXT PRIMARY KEY,
  ten        TEXT NOT NULL,
  luaTuoi    TEXT NOT NULL DEFAULT '',   -- '' = cả hai lứa · '3-4' · '4-5'
  tuNgay     TEXT NOT NULL DEFAULT '',
  denNgay    TEXT NOT NULL DEFAULT '',
  mucTieu    TEXT NOT NULL DEFAULT '',
  thuTu      INTEGER NOT NULL DEFAULT 0,
  nguoiTao   TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_block_theo_thu_tu ON cambridge_block(thuTu, tuNgay);

-- KHUNG của một bài: bài thuộc block nào, tuần mấy, cho lứa nào, và năm ô nội
-- dung theo đúng mẫu trường gửi. Một bài tối đa một dòng.
CREATE TABLE IF NOT EXISTS cambridge_bai_khung (
  baiId      TEXT PRIMARY KEY,
  blockId    TEXT NOT NULL DEFAULT '',
  tuanSo     INTEGER NOT NULL DEFAULT 0,  -- 0 = không gắn tuần trong block
  luaTuoi    TEXT NOT NULL DEFAULT '',    -- '' = cả hai lứa · '3-4' · '4-5'
  monHoc     TEXT NOT NULL DEFAULT '',    -- hoạt động: Communication and Language / Mathematics / Let's Explore…
  chuDe      TEXT NOT NULL DEFAULT '',
  tuVung     TEXT NOT NULL DEFAULT '',
  songChant  TEXT NOT NULL DEFAULT '',
  ketNoiONha TEXT NOT NULL DEFAULT '',    -- video, worksheet, việc làm cùng con
  ghiLuc     TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_bai_khung_theo_block ON cambridge_bai_khung(blockId, tuanSo);

-- TỆP KÈM BÀI (PDF / Word). Tên tệp trên đĩa do `lib/uploads.js` sinh; `tenGoc`
-- là tên cô đặt, để gia đình tải về thấy "Worksheet-tuan-2.pdf" chứ không phải
-- một chuỗi hex. Tệp đi qua canh quyền như ảnh, không phục vụ tĩnh.
CREATE TABLE IF NOT EXISTS cambridge_tep (
  id      TEXT PRIMARY KEY,
  baiId   TEXT NOT NULL,
  file    TEXT NOT NULL,
  tenGoc  TEXT NOT NULL DEFAULT '',
  bytes   INTEGER NOT NULL DEFAULT 0,
  taoLuc  TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_tep_theo_bai ON cambridge_tep(baiId);

-- ===== CHỈ MỤC ẢNH THEO TÊN TỆP (Đ158, món 2 của Đ120) =====
--
-- Đường `GET /api/cambridge/anh/:file` trước đợt này tìm chủ của một tấm ảnh
-- bằng `SELECT * FROM cambridge_bai WHERE anh LIKE '%<tên tệp>%'` rồi lọc lại
-- trong JavaScript. Ba chỗ hỏng cùng lúc:
--
--   • `LIKE '%…'` mở đầu bằng ký tự đại diện nên KHÔNG dùng được chỉ mục nào —
--     mỗi lần một tấm ảnh hiện lên màn hình là một lượt quét cả bảng bài.
--   • `SELECT *` kéo theo cả cột `anh` (danh sách tên tệp) của MỌI bài.
--   • Một trang Home Connection có tới 10 ảnh, và màn hình gia đình tải cả
--     trang cùng lúc — nghĩa là 10 lượt quét bảng cho một lần mở màn.
--
-- Bảng phụ này là "tên tệp → bài nào". Nó KHÔNG phải nguồn sự thật: cột
-- `cambridge_bai.anh` vẫn là nơi giữ danh sách ảnh của một bài, y như cũ. Đây
-- chỉ là chỉ mục, dựng lại được bất cứ lúc nào từ cột ấy — và máy chủ tự dựng
-- lại lúc khởi động cho những bài chưa có dòng.
--
-- Lược đồ của phân hệ chỉ được `CREATE ... IF NOT EXISTS`, không được ALTER,
-- nên đây là bảng riêng chứ không phải cột thêm vào `cambridge_bai`.
CREATE TABLE IF NOT EXISTS cambridge_anh (
  file   TEXT PRIMARY KEY,
  baiId  TEXT NOT NULL,
  ghiLuc TEXT
);
CREATE INDEX IF NOT EXISTS cambridge_anh_theo_bai ON cambridge_anh(baiId);
