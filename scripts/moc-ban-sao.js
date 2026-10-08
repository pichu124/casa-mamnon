// GIỜ CHỤP CỦA MỘT BẢN SAO LƯU, ĐỌC TỪ TÊN TỆP (Đ236).
//
// Tên bản sao là `school-YYYYMMDD-HHMM.db.gz`, theo GIỜ VIỆT NAM, do
// `scripts/backup.js` đặt đúng lúc chụp. Đó là giờ chụp THẬT, và nó đi theo
// tệp tới bất cứ đâu.
//
// Giờ sửa tệp (mtime) thì không: chép thư mục sao lưu sang máy mới bằng
// `scp -r` hay `cp -r` mà không giữ giờ (thiếu `-p`) là mọi bản mang cùng một
// giờ — lúc chép. Vòng đời dọn bản cũ mà đọc mtime thì thấy cả kho là "bản của
// hôm nay": lịch sử theo tháng bị dọn sạch, và phần dọn ảnh tưởng mọi bản đều
// mới nên dọn luôn ảnh mà các bản cũ còn cần. Bộ soát máy chủ đọc mtime thì
// báo một bản sao đã cũ là "vừa chụp".
//
// Trả về mốc mi-li-giây, hoặc NaN nếu tên không đúng mẫu hay không phải một
// ngày giờ có thật (tháng 13, 25 giờ...) — người gọi tự lùi về mtime.
'use strict';

const ngay = require('../lib/ngay');

function mocCuaTen(tenTep) {
  const m = /^school-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\.db\.gz$/.exec(tenTep);
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - ngay.LECH_PHUT * 60000;
  // Date.UTC tự "tràn" tên hỏng sang ngày khác (tháng 13 → tháng 1 năm sau).
  // Dựng lại tên từ mốc vừa tính; không khớp thì tên ấy không phải ngày giờ thật.
  const lai = `${ngay.ngayCua(t).replace(/-/g, '')}-${ngay.gioCua(t).replace(':', '')}`;
  return lai === `${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}` ? t : NaN;
}

module.exports = { mocCuaTen };
