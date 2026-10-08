// CANH "QUÊN DATA_DIR" CHO CÁC LỆNH QUẢN TRỊ (Đ234).
//
// Gọi ở DÒNG ĐẦU của `backup.js`, `restore.js`, `kiem-tra-may-chu.js`,
// `create-admin.js` — trước mọi `require` có thể đụng tới thư mục dữ liệu
// (`lib/db.js` tự tạo thư mục ngay khi được nạp).
//
// VÌ SAO CẦN
//
// Không có `DATA_DIR`, các lệnh này lặng lẽ dùng thư mục mặc định `./data` —
// nằm TRONG kho mã. Trên máy lập trình thì đúng. Trên máy chủ thật, dữ liệu ở
// `/var/lib/casa-mamnon`, và người vận hành gõ thiếu `DATA_DIR` (ngày 08/10 đã
// xảy ra thật, theo đúng một chỉ dẫn viết thiếu) nhận về một bản báo cáo SAI:
// "chưa có bản sao lưu nào", "không thấy cơ sở dữ liệu", kèm gợi ý sửa là
// `DATA_DIR=/opt/casa-mamnon/data npm run backup` — tức đặt bản sao lưu vào
// ngay trong kho mã, đúng chỗ dữ liệu của trẻ không bao giờ được nằm. Chiều
// ngược lại còn tệ hơn: thư mục mặc định có sẵn một cơ sở dữ liệu cũ thì báo
// cáo XANH trong khi nó không hề nhìn vào máy chủ thật.
//
// LUẬT, CỐ Ý HẸP: chỉ dừng khi KHÔNG có `DATA_DIR` VÀ máy có dữ liệu thật ở
// thư mục chuẩn của tài liệu triển khai. Máy lập trình, CI và bộ kiểm thử (luôn
// truyền `DATA_DIR`) không bị đụng tới. Ai đã ghi rõ `DATA_DIR` — kể cả một chỗ
// lạ — là đã tự chọn, lệnh chạy như cũ.
//
// Thư mục chuẩn là thư mục `docs/TRIEN-KHAI.md` và
// `docs/MAY-CHU-THU-ORACLE-APP2.md` dạy dùng. Windows không có thư mục chuẩn
// nào trong tài liệu (máy chủ thật chạy Linux), nên trên Windows bộ canh không
// bao giờ chặn — đoán bừa một đường dẫn thì chỉ thêm một chỗ để sai.
//
// `CASA_THU_MUC_CHUAN` (các đường nối bằng `path.delimiter`) CHỈ để bài kiểm
// thử giả lập một máy chủ đã cài — không ai cần đặt nó trên máy thật.
'use strict';

const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
const THU_MUC_CHUAN = process.platform === 'win32' ? [] : ['/var/lib/casa-mamnon'];

function cacThuMucChuan() {
  const thu = process.env.CASA_THU_MUC_CHUAN;
  return thu ? thu.split(path.delimiter).filter(Boolean) : THU_MUC_CHUAN;
}

// Trả về thư mục chuẩn đang có dữ liệu thật khi lệnh bị gọi thiếu DATA_DIR;
// null nếu không có gì phải chặn.
function thuMucBiQuen() {
  if (process.env.DATA_DIR) return null;
  return cacThuMucChuan().find((d) => {
    try { return fs.statSync(path.join(d, 'school.db')).isFile(); } catch (_) { return false; }
  }) || null;
}

function canhThuMucDuLieu() {
  const chuan = thuMucBiQuen();
  if (!chuan) return;
  // Đứng trong thư mục kho mã (`cd /opt/casa-mamnon` như mọi chỉ dẫn) thì in
  // đường ngắn; đứng chỗ khác thì in đường tuyệt đối để dòng gõ lại chạy được.
  const tep = process.argv[1] || '';
  const tenTep = path.resolve(process.cwd()) === path.resolve(GOC) ? path.relative(GOC, tep) : tep;
  const lenh = [tenTep || 'scripts/<lệnh>', ...process.argv.slice(2)]
    .map(a => (/[\s"']/.test(a) ? JSON.stringify(a) : a)).join(' ');
  const goLai = process.platform === 'win32'
    ? `$env:DATA_DIR="${chuan}"; node ${lenh}`
    : `DATA_DIR=${chuan} node ${lenh}`;
  console.error([
    '',
    '⛔ THIẾU DATA_DIR — lệnh DỪNG, chưa đọc hay ghi gì.',
    '',
    `   Máy này có dữ liệu thật ở ${chuan}, nhưng lệnh vừa gõ không nói thư mục dữ`,
    `   liệu nên sẽ xem thư mục mặc định ${path.join(GOC, 'data')} (nằm TRONG kho mã)`,
    '   — mọi kết quả và mọi gợi ý sửa in ra từ đó đều SAI với máy chủ này.',
    '',
    '   Gõ lại, có DATA_DIR ở đầu:',
    '',
    `     ${goLai}`,
    '',
    '   (Lệnh npm cũng vậy, ví dụ: '
      + (process.platform === 'win32' ? `$env:DATA_DIR="${chuan}"; npm run kiem-tra-may-chu` : `DATA_DIR=${chuan} npm run kiem-tra-may-chu`)
      + ')',
    '',
  ].join('\n'));
  process.exit(2);
}

module.exports = canhThuMucDuLieu;
module.exports.thuMucBiQuen = thuMucBiQuen;
module.exports.THU_MUC_CHUAN = THU_MUC_CHUAN;
