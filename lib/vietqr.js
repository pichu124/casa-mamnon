// Dựng mã QR chuyển khoản theo chuẩn VietQR / EMVCo (Đ208, việc 36).
//
// ===========================================================================
// ĐIỀU QUAN TRỌNG NHẤT CỦA TỆP NÀY: APP KHÔNG THỂ KIỂM TRA MỘT SỐ TÀI KHOẢN
// ===========================================================================
//
// Mã QR ở đây mã hoá đúng ba thứ nhà trường khai: mã ngân hàng, số tài khoản,
// nội dung chuyển khoản. Không có bước nào hỏi ngân hàng xem số ấy có thật
// không, tên chủ tài khoản có khớp không — chuẩn VietQR không có bước đó, và
// app cũng không nối tới ngân hàng nào.
//
// Nghĩa là: NHÀ TRƯỜNG KHAI SAI THÌ TIỀN CỦA GIA ĐÌNH ĐI SANG CHỖ KHÁC, và
// app sẽ dựng một mã QR trông hoàn toàn bình thường cho chỗ sai ấy. Đây là
// hỏng tệ nhất trong cả kho mã này về mặt tiền bạc, vì nó im lặng.
//
// Nên mọi thứ quanh tệp này nghiêng về phía BẮT NGƯỜI KHAI XÁC NHẬN:
//
//   • màn khai hiện lại tên ngân hàng mà máy hiểu được từ mã đã gõ, để người
//     khai đọc bằng mắt chứ không tin cái danh sách;
//   • chưa khai đủ thì màn của gia đình KHÔNG hiện mã QR nào cả, và nói rõ là
//     chưa có, chứ không dựng một mã sai;
//   • màn của gia đình luôn in số tài khoản và tên chủ tài khoản BẰNG CHỮ
//     ngay cạnh mã, để người chuyển tiền đối chiếu được trước khi bấm.
//
// Danh sách `NGAN_HANG` dưới đây là DANH SÁCH GỢI Ý cho ô chọn, KHÔNG phải
// nguồn sự thật. Mã BIN do Napas cấp; nhà trường vẫn gõ / chọn rồi tự đối
// chiếu với sổ ngân hàng của mình.

// Mã BIN (Napas) của các ngân hàng hay gặp. Trường dùng ngân hàng ngoài danh
// sách thì gõ thẳng mã 6 số — `hopLeMa` chỉ đòi đúng sáu chữ số.
const NGAN_HANG = [
  { ma: '970436', ten: 'Vietcombank' },
  { ma: '970415', ten: 'VietinBank' },
  { ma: '970418', ten: 'BIDV' },
  { ma: '970405', ten: 'Agribank' },
  { ma: '970407', ten: 'Techcombank' },
  { ma: '970422', ten: 'MB Bank' },
  { ma: '970416', ten: 'ACB' },
  { ma: '970432', ten: 'VPBank' },
  { ma: '970403', ten: 'Sacombank' },
  { ma: '970423', ten: 'TPBank' },
  { ma: '970437', ten: 'HDBank' },
  { ma: '970441', ten: 'VIB' },
  { ma: '970443', ten: 'SHB' },
  { ma: '970431', ten: 'Eximbank' },
  { ma: '970426', ten: 'MSB' },
  { ma: '970448', ten: 'OCB' },
  { ma: '970440', ten: 'SeABank' },
  { ma: '970409', ten: 'BacA Bank' },
  { ma: '970412', ten: 'PVcomBank' },
  { ma: '970419', ten: 'NCB' },
  { ma: '970425', ten: 'ABBANK' },
  { ma: '970427', ten: 'VietABank' },
  { ma: '970428', ten: 'Nam A Bank' },
  { ma: '970433', ten: 'VietBank' },
  { ma: '970438', ten: 'BaoViet Bank' },
  { ma: '970400', ten: 'SaigonBank' },
  { ma: '970449', ten: 'LPBank' },
  { ma: '970452', ten: 'KienLongBank' },
];

const TEN_THEO_MA = new Map(NGAN_HANG.map(x => [x.ma, x.ten]));

function hopLeMa(ma) {
  return /^\d{6}$/.test(String(ma || '').trim());
}

// Tên ngân hàng để NGƯỜI KHAI ĐỌC LẠI. Không nhận ra thì nói thẳng là không
// nhận ra — im lặng ở đây là để người khai tưởng máy đã xác nhận giúp mình.
function tenNganHang(ma) {
  return TEN_THEO_MA.get(String(ma || '').trim()) || '';
}

// ---- EMVCo TLV ----
// Mỗi ô: hai chữ số mã + hai chữ số ĐỘ DÀI + nội dung. Độ dài đếm theo KÝ TỰ
// của chuỗi đã chuẩn hoá, và chuẩn VietQR chỉ dùng ký tự ASCII — nên nội dung
// chuyển khoản phải bỏ dấu trước khi đưa vào đây (xem `boDauASCII`).
function o(ma, giaTri) {
  const v = String(giaTri == null ? '' : giaTri);
  return `${ma}${String(v.length).padStart(2, '0')}${v}`;
}

// CRC16-CCITT (poly 0x1021, khởi tạo 0xFFFF) — bốn chữ HOA ở cuối chuỗi.
function crc16(chuoi) {
  let crc = 0xFFFF;
  for (let i = 0; i < chuoi.length; i += 1) {
    crc ^= (chuoi.charCodeAt(i) & 0xFF) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Bỏ dấu tiếng Việt và mọi ký tự ngoài ASCII. Máy của ngân hàng đọc nội dung
// chuyển khoản theo ASCII; để nguyên dấu là bên nhận thấy một chuỗi hỏng, mà
// chuỗi ấy chính là thứ kế toán dùng để biết tiền này của nhà nào.
function boDauASCII(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chuỗi payload VietQR. `soTien` bỏ trống / 0 thì sinh mã TĨNH (người chuyển
// tự gõ số tiền) — cố ý cho phép, vì gia đình nộp gộp nhiều khoản là chuyện
// thường và một mã khoá cứng số tiền lại cản đúng lúc đó.
function payload({ maNganHang, soTaiKhoan, soTien = 0, noiDung = '' }) {
  const ma = String(maNganHang || '').trim();
  const stk = String(soTaiKhoan || '').trim();
  if (!hopLeMa(ma)) throw new Error('Mã ngân hàng phải là 6 chữ số');
  if (!/^[0-9A-Za-z]{4,25}$/.test(stk)) throw new Error('Số tài khoản không hợp lệ');

  const tien = Number(soTien) > 0 ? String(Math.round(Number(soTien))) : '';
  const nd = boDauASCII(noiDung).slice(0, 99);

  const thuHuong = o('00', ma) + o('01', stk);
  const tk = o('00', 'A000000727') + o('01', thuHuong) + o('02', 'QRIBFTTA');

  let s = o('00', '01')
    + o('01', tien ? '12' : '11')   // 12 = một lần (có số tiền), 11 = dùng lại
    + o('38', tk)
    + o('53', '704')               // VND
    + (tien ? o('54', tien) : '')
    + o('58', 'VN')
    + (nd ? o('62', o('08', nd)) : '');

  s += '6304';                      // mã 63, độ dài 04 — CRC tính TRÊN cả phần này
  return s + crc16(s);
}

module.exports = { NGAN_HANG, hopLeMa, tenNganHang, payload, boDauASCII, crc16 };
