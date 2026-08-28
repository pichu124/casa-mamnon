// MỘT ĐỊNH NGHĨA DUY NHẤT CHO CHỮ "HÔM NAY".
//
// VÌ SAO TỆP NÀY TỒN TẠI
//
// Trước tệp này, app có HAI câu trả lời khác nhau cho cùng một câu hỏi:
//
//   • Tám phân hệ mầm non hỏi `new Date().toISOString().slice(0, 10)` — ngày
//     theo giờ UTC.
//   • Các màn lõi (điểm danh, thực đơn, trang chủ, album, sức khoẻ) hỏi
//     `getFullYear()/getMonth()/getDate()` — ngày theo giờ của MÁY CHỦ.
//
// Việt Nam là UTC+7, nên từ 0 giờ tới 7 giờ sáng hai bên nói hai ngày khác
// nhau. Mà 7 giờ sáng chính là lúc cô điểm danh và chốt báo ăn.
//
// Đây không phải lỗi hiển thị. `tienan_chot` có UNIQUE (ngay, classId): cô
// chốt báo ăn lúc 6 giờ 50 thì bản ghi rơi vào NGÀY HÔM TRƯỚC và ĐÈ LÊN con
// số hôm trước — mất dữ liệu, âm thầm, mỗi sáng.
//
// VÌ SAO ĐÓNG CỨNG UTC+7 CHỨ KHÔNG DÙNG GIỜ MÁY CHỦ
//
// Ba lẽ, xếp theo mức quan trọng:
//
//   1. Trường ở Việt Nam, cả ba cơ sở. Không có tình huống nào mà một múi giờ
//      khác là câu trả lời đúng.
//   2. Giờ máy chủ là thứ ĐỔI ÂM THẦM. Hôm nay app chạy thử ở Singapore
//      (render.yaml), mai dọn về VPS trong nước theo mục N7. Nếu "hôm nay" phụ
//      thuộc biến môi trường TZ thì một lần dọn nhà là lệch ngày cả trường, và
//      không ai phát hiện cho tới cuối tháng khi bảng tiền ăn không khớp.
//   3. Việt Nam không có giờ mùa hè và giữ UTC+7 từ 1975. Một con số cố định
//      ở đây là ĐÚNG CHÍNH XÁC, không phải xấp xỉ cho tiện.
//
// Muốn đổi múi giờ thì sửa đúng một dòng dưới đây, và bài canh trong
// test/mot-hom-nay.test.mjs sẽ bắt mọi chỗ lén quay về cách cũ.
const LECH_PHUT = 7 * 60;   // Việt Nam: UTC+7, không có giờ mùa hè

// Ngày (YYYY-MM-DD) theo giờ Việt Nam của một mốc thời gian bất kỳ.
function ngayCua(moc) {
  const t = moc instanceof Date ? moc.getTime() : Number(moc);
  if (!Number.isFinite(t)) return '';
  return new Date(t + LECH_PHUT * 60000).toISOString().slice(0, 10);
}

// Hôm nay, theo giờ Việt Nam.
function homNay() {
  return ngayCua(Date.now());
}

// Tháng này (YYYY-MM), theo giờ Việt Nam.
function thangNay() {
  return homNay().slice(0, 7);
}

// Giờ phút (HH:MM) theo giờ Việt Nam — dùng cho những chỗ ghi mốc trong ngày.
function gioCua(moc) {
  const t = moc instanceof Date ? moc.getTime() : Number(moc);
  if (!Number.isFinite(t)) return '';
  return new Date(t + LECH_PHUT * 60000).toISOString().slice(11, 16);
}

function bayGio() {
  return gioCua(Date.now());
}

// KHOẢNG THỜI GIAN UTC ỨNG VỚI MỘT NGÀY VIỆT NAM.
//
// Dùng khi phải lọc những bản ghi lưu MỐC THỜI GIAN (ISO đầy đủ, giờ UTC) theo
// một NGÀY của trường.
//
// Cách hay bị viết nhầm là cắt chuỗi trong SQL: `substr(taoLuc, 1, 10) = ?`.
// Nó gọn, nó chạy, và nó cắt ra ngày theo giờ UTC — tức là một định nghĩa
// "hôm nay" THỨ BA, nằm trong câu SQL nên không bộ canh nào quét mã JavaScript
// nhìn thấy. Sáng sớm ở Việt Nam thì bản ghi vừa tạo rơi vào ngày hôm trước và
// biến mất khỏi màn hình của cô.
//
// Trả về [từ, đến) — nửa mở, để không bao giờ đếm hai lần mốc nửa đêm.
function khoangUtcCuaNgay(ngayStr) {
  const dau = Date.parse(`${ngayStr}T00:00:00Z`);
  if (Number.isNaN(dau)) return ['', ''];
  const goc = dau - LECH_PHUT * 60000;
  return [new Date(goc).toISOString(), new Date(goc + 86400000).toISOString()];
}

module.exports = { LECH_PHUT, ngayCua, homNay, thangNay, gioCua, bayGio, khoangUtcCuaNgay };
