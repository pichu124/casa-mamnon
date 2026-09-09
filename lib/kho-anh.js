// KHO ẢNH CỦA TRƯỜNG — đo, và nói còn bao lâu nữa thì đầy đĩa.
//
// Tách khỏi `scripts/kiem-tra-may-chu.js` vì một lý do rất cụ thể: phần XẾP
// LOẠI ở đây phải thử được. Nếu nó nằm trong script thì bài canh chỉ còn cách
// dựng một thư mục ảnh thật rồi đọc chữ in ra — mà lúc đó kết quả phụ thuộc
// dung lượng đĩa CỦA MÁY ĐANG CHẠY BÀI TEST. Máy người này 250 GB, máy CI 40
// GB, và cùng một bài canh cho hai kết quả khác nhau. Đó đúng là kiểu đỏ ngẫu
// nhiên mà kho mã này đã phải đi vá bốn lần ở đợt Đ92 và Đ116.
//
// Nên: `doKhoAnh` chạm vào ổ đĩa (khó thử), `xepLoaiKhoAnh` là phép tính thuần
// nhận vào những con số (thử được đủ mọi tình huống, không cần một byte nào).
'use strict';

const fs = require('fs');
const path = require('path');

// Dưới hai mốc này thì mọi phép chia đều ra con số vô nghĩa: máy vừa dựng, thư
// mục ảnh còn vài tấm. Lúc ấy chỉ báo số liệu thô — một lời cảnh báo sai làm
// người vận hành hết tin cả bộ kiểm.
//
// Tên hai hằng này CỐ Ý không mang chữ "tối thiểu": bộ canh QUY TẮC 2 cấm mẫu
// `TOI_THIEU_*` vì đó là cách người ta đặt CHỈ TIÊU SỐ QUAN SÁT cho một đứa
// trẻ. Ở đây là dung lượng đĩa, chẳng liên quan gì tới trẻ — nhưng bộ canh
// đúng khi không chừa ngoại lệ, vì một ngoại lệ "chỗ này không tính" là chỗ
// dòng vi phạm thật sẽ nấp vào. Đổi tên rẻ hơn nới bài canh rất nhiều.
const NGAY_DU_DE_DOAN = 14;
const BYTE_DU_DE_DOAN = 200 * 1024 * 1024;

// Đầy trong vòng ngần này ngày thì phải mua thêm đĩa NGAY.
const NGAY_BAO_DONG = 180;
// Ảnh chiếm quá ngần này phần trăm đĩa thì tới lúc tính chuyện kho ngoài.
const PHAN_TRAM_KHO_NGOAI = 60;

function gb(b) {
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

// Đo thư mục ảnh: bao nhiêu tệp, bao nhiêu byte, tệp cũ nhất và mới nhất.
//
// Mốc thời gian của tệp chính là thứ cho biết TỐC ĐỘ tăng — không cần lưu lịch
// sử ở đâu cả, ổ đĩa đã tự ghi sẵn.
function doKhoAnh(thuMuc) {
  let soTep = 0;
  let byte = 0;
  let cuNhat = Infinity;
  let moiNhat = 0;
  const di = (d) => {
    let ds;
    try { ds = fs.readdirSync(d); } catch (_) { return; }
    for (const ten of ds) {
      const duong = path.join(d, ten);
      let st;
      // Tệp vừa bị xoá giữa lúc đang duyệt thì bỏ qua, đừng làm hỏng cả phép đo.
      try { st = fs.statSync(duong); } catch (_) { continue; }
      if (st.isDirectory()) { di(duong); continue; }
      soTep += 1;
      byte += st.size;
      if (st.mtimeMs < cuNhat) cuNhat = st.mtimeMs;
      if (st.mtimeMs > moiNhat) moiNhat = st.mtimeMs;
    }
  };
  di(thuMuc);
  return {
    soTep,
    byte,
    soNgay: soTep ? Math.max(0, (moiNhat - cuNhat) / 86400000) : 0,
  };
}

// Xếp loại. Trả về { trangThai: 'ĐẠT' | 'CẦN SỬA' | 'BỎ QUA', moTa, cach }.
//
// `trongByte` và `tongByte` = chỗ còn trống và tổng dung lượng của ổ chứa
// thư mục dữ liệu.
function xepLoaiKhoAnh({ soTep, byte, soNgay, trongByte, tongByte }) {
  if (!soTep) return { trangThai: 'BỎ QUA', moTa: 'chưa có tấm ảnh nào' };

  const phanTram = tongByte ? Math.round((byte / tongByte) * 100) : 0;
  // Viết "41 phần trăm đĩa" bằng CHỮ, không dùng ký hiệu phần trăm.
  //
  // Bộ canh QUY TẮC 4 cấm ký hiệu ấy đứng ngay sau một giá trị chèn vào chuỗi,
  // vì đó chính là cách app tiểu học in ra "hoàn thành 78 phần trăm" cho một
  // đứa trẻ. Ở đây là dung lượng đĩa, chẳng liên quan gì tới trẻ — nhưng bộ
  // canh đúng khi không chừa ngoại lệ, kể cả trong chú thích: một lỗ "chỗ này
  // không tính" là chỗ dòng vi phạm thật sẽ nấp vào. Và với người vận hành thì
  // chữ còn dễ đọc hơn ký hiệu.
  const moTa = `${soTep} tệp, ${gb(byte)} — chiếm ${phanTram} phần trăm đĩa`;

  if (soNgay < NGAY_DU_DE_DOAN || byte < BYTE_DU_DE_DOAN) {
    return { trangThai: 'ĐẠT', moTa: `${moTa} (chưa đủ dữ liệu để đoán ngày đầy đĩa)` };
  }

  const moiNgay = byte / soNgay;
  const conLaiNgay = moiNgay > 0 ? trongByte / moiNgay : Infinity;
  const conLai = conLaiNgay > 400
    ? 'hơn một năm nữa mới đầy'
    : `đầy sau khoảng ${Math.max(1, Math.round(conLaiNgay / 30))} tháng`;
  const day = `${moTa}, tăng ~${(moiNgay / 1024 ** 2).toFixed(0)} MB/ngày, ${conLai}`;

  // ĐẦY ĐĨA LÀ HỎNG CƠ SỞ DỮ LIỆU, KHÔNG CHỈ LÀ MẤT CHỖ ĐỂ ẢNH. SQLite ghi
  // giữa chừng mà hết chỗ thì cô không điểm danh được, gia đình không mở được
  // gì. Nên mục này xếp trước mục kho ngoài.
  if (conLaiNgay < NGAY_BAO_DONG) {
    return {
      trangThai: 'CẦN SỬA',
      moTa: day,
      cach: 'Nâng dung lượng đĩa với nhà cung cấp trước khi đầy. Đĩa đầy là máy chủ '
        + 'ghi hỏng cơ sở dữ liệu, không chỉ mất ảnh.',
    };
  }
  if (phanTram >= PHAN_TRAM_KHO_NGOAI) {
    return {
      trangThai: 'CẦN SỬA',
      moTa: day,
      cach: 'Tới mốc nên chuyển ảnh sang kho ngoài (object storage) — xem mục N25 '
        + 'của docs/TIEN-DO.md. Việc này phải sửa mã, mất vài ngày, nên bắt đầu sớm.',
    };
  }
  return { trangThai: 'ĐẠT', moTa: day };
}

module.exports = {
  doKhoAnh,
  xepLoaiKhoAnh,
  NGAY_DU_DE_DOAN,
  BYTE_DU_DE_DOAN,
  NGAY_BAO_DONG,
  PHAN_TRAM_KHO_NGOAI,
};
