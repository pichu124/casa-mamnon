// Lưu trữ ảnh do giáo viên tải lên.
//
// Ảnh nằm trong DATA_DIR/uploads nên khi triển khai chỉ cần gắn một ổ đĩa vào
// DATA_DIR là cả dữ liệu lẫn ảnh đều được giữ lại qua các lần cập nhật.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const UPLOAD_DIR = path.join(db.DATA_DIR, 'uploads');
const MAX_BYTES = 6 * 1024 * 1024; // 6MB mỗi ảnh sau khi trình duyệt đã nén

// TRẦN RIÊNG CHO VIDEO — và đây là con số cần nhìn thẳng vào.
//
// Nhà trường muốn có video ("1 video quý hơn hàng trăm bức ảnh"). Video thì
// KHÔNG nén được trong trình duyệt như ảnh: `UI.nenAnh` vẽ lại ảnh qua canvas,
// video không có đường tương đương chạy nổi trên điện thoại của cô.
//
// Nên trần phải đặt bằng tay, và đặt thấp. Con số 8 MB đến từ ba ràng buộc,
// và ràng buộc chặt nhất là cái thứ nhất:
//
//   1. THÂN YÊU CẦU CỦA MÁY CHỦ LÀ 12 MB (`express.json` trong `server.js`).
//      Tệp đi lên dưới dạng base64 nên PHÌNH THÊM 33%: 8 MB nhị phân thành
//      khoảng 10,7 MB chữ, vừa lọt và còn chỗ cho phần bọc JSON.
//
//      Bản đầu của đợt này đặt 25 MB — tức 33 MB sau base64 — và Express sẽ
//      từ chối trước khi tới một dòng mã nào của ta, bằng một lỗi 413 trơ
//      không ai hiểu. Bắt được khi đọc lại `server.js` trước lúc commit.
//
//      KHÔNG nới giới hạn 12 MB đó lên: nó đang che MỌI đường dẫn của app,
//      và nới ra để tiện cho một tính năng là mở rộng bề mặt tấn công của
//      tất cả những đường còn lại.
//
//   2. 8 MB ≈ 10–20 giây quay bằng điện thoại ở mức trung bình. Đủ cho thứ
//      nhà trường muốn ("con rót nước vào ly"), và ngắn thì gia đình xem hết.
//
//   3. Ba cơ sở, mỗi nhóm một video mỗi ngày là khoảng 3 GB mỗi năm học —
//      đã tính cả phần sao lưu chép theo.
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

// LỜI TỪ CHỐI NÓI CÔ PHẢI LÀM GÌ, không nói máy chủ nghĩ gì.
//
// "Video quá lớn" là một câu cụt: cô đang đứng ở sân trường, vừa quay xong, và
// câu đó không cho biết quay bao lâu thì vừa. Con số giây là thứ cô làm được
// ngay lần quay sau.
const LOI_QUA_NANG = `Video nặng quá — cô quay một đoạn ngắn hơn (khoảng 10–20 giây, `
  + `tối đa ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB) rồi gửi lại nhé`;

// Nhận dạng loại ảnh bằng vài byte đầu tệp thay vì tin vào phần khai báo của
// trình duyệt — tránh việc tệp thực thi được đổi tên thành .jpg rồi tải lên.
const SIGNATURES = [
  { ext: 'jpg', mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'webp', mime: 'image/webp',
    test: b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

// Chữ ký của hai định dạng video mà điện thoại nào cũng quay ra được.
//
// MP4 nhận theo hộp `ftyp` ở byte 4–8 (iPhone và hầu hết Android), WebM theo
// chữ ký EBML (Android quay bằng vài ứng dụng, và bản ghi từ trình duyệt).
// Vẫn đọc byte thật, không tin phần khai báo của trình duyệt — cùng lý do đã
// ghi ở phần ảnh.
const SIGNATURES_VIDEO = [
  {
    ext: 'mp4', mime: 'video/mp4',
    test: b => b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp',
  },
  {
    ext: 'webm', mime: 'video/webm',
    test: b => b.length > 12 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
];

function detect(buf) {
  return SIGNATURES.find(s => buf.length > 12 && s.test(buf)) || null;
}

function detectVideo(buf) {
  return SIGNATURES_VIDEO.find(s => buf.length > 12 && s.test(buf)) || null;
}

// Chỉ chấp nhận tên tệp do chính hệ thống sinh ra, chặn mọi mưu toan đi ra
// ngoài thư mục ảnh bằng dấu ../ hay đường dẫn tuyệt đối.
const SAFE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/;

function pathOf(file) {
  if (typeof file !== 'string' || !SAFE_NAME.test(file)) return null;
  return path.join(UPLOAD_DIR, file);
}

function mimeOf(file) {
  const ext = String(file).split('.').pop();
  const sig = SIGNATURES.find(s => s.ext === ext) || SIGNATURES_VIDEO.find(s => s.ext === ext);
  return sig ? sig.mime : 'application/octet-stream';
}

// Tệp này là video hay ảnh — màn hình cần biết để dựng <video> hay <img>.
function laVideo(file) {
  const ext = String(file || '').split('.').pop();
  return SIGNATURES_VIDEO.some(s => s.ext === ext);
}

// Nhận chuỗi data URL từ trình duyệt (data:image/jpeg;base64,...) và ghi thành tệp.
// Trả về { file, bytes } hoặc ném lỗi có thông báo tiếng Việt.
function saveDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Ảnh không hợp lệ');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Ảnh không hợp lệ');

  const base64 = dataUrl.slice(comma + 1);
  // Ước lượng dung lượng trước khi giải mã để không tốn bộ nhớ với tệp quá lớn.
  if (base64.length * 0.75 > MAX_BYTES) {
    throw new Error('Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn');
  }

  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch (_) {
    throw new Error('Ảnh không hợp lệ');
  }
  if (!buf.length) throw new Error('Ảnh rỗng');
  if (buf.length > MAX_BYTES) throw new Error('Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn');

  const sig = detect(buf);
  if (!sig) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${crypto.randomBytes(16).toString('hex')}.${sig.ext}`;
  const tmp = path.join(UPLOAD_DIR, `.${file}.tmp`);
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(UPLOAD_DIR, file));
  return { file, bytes: buf.length };
}

// LƯU VIDEO — HÀM MỚI ĐẶT CẠNH HÀM CŨ, KHÔNG SỬA HÀM CŨ.
//
// `saveDataUrl` là thứ cả app đang dựa vào (album, Ghi nhanh, Hành trình,
// Cambridge, Đón trả, ảnh điểm danh). Nới nó ra để nhận thêm video là đổi hành
// vi của sáu chỗ gọi cùng lúc, mà năm trong sáu chỗ đó không muốn nhận video.
// Thêm một hàm riêng thì mỗi đường gọi tự nói rõ nó cho phép cái gì.
//
// Trả về { file, bytes } hoặc ném lỗi có thông báo tiếng Việt.
function saveVideoDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:video/')) {
    throw new Error('Video không hợp lệ');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Video không hợp lệ');

  const base64 = dataUrl.slice(comma + 1);
  // Ước lượng trước khi giải mã: một video 100 MB gửi lên mà giải mã hết ra bộ
  // nhớ trước khi từ chối là đủ để máy chủ nhỏ của trường ngã.
  if (base64.length * 0.75 > MAX_VIDEO_BYTES) {
    throw new Error(LOI_QUA_NANG);
  }

  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch (_) {
    throw new Error('Video không hợp lệ');
  }
  if (!buf.length) throw new Error('Video rỗng');
  if (buf.length > MAX_VIDEO_BYTES) throw new Error(LOI_QUA_NANG);

  const sig = detectVideo(buf);
  if (!sig) throw new Error('Chỉ nhận video MP4 hoặc WebM — đó là hai định dạng điện thoại quay ra');

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${crypto.randomBytes(16).toString('hex')}.${sig.ext}`;
  const tmp = path.join(UPLOAD_DIR, `.${file}.tmp`);
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(UPLOAD_DIR, file));
  return { file, bytes: buf.length };
}

// =============================================================================
// TÀI LIỆU PDF / WORD — HÀM MỚI ĐẶT CẠNH HÀM CŨ, KHÔNG SỬA HÀM CŨ (Đ143)
// =============================================================================
//
// Nhà trường 07/09, phần Cambridge: "dữ liệu up chia sẻ kèm theo trong phần này
// để đa dạng chứ không để mỗi ảnh: để pdf, word…". Worksheet, thư gửi gia
// đình, lời bài hát — đúng những thứ không phải ảnh.
//
// Cùng lối với `saveVideoDataUrl`: hàm riêng, chữ ký tệp riêng, tên tệp riêng.
// `pathOf` / `exists` / `remove` / `mimeOf` của ảnh KHÔNG được nới ra nhận
// thêm .pdf — sáu chỗ gọi chúng là đường trả ảnh của bé, và một đường trả ảnh
// không có lý do gì để trả được một tệp Word. Tài liệu có bộ bốn hàm của riêng
// nó ở dưới.
//
// Trần 8 MB cùng lý do với video: thân yêu cầu 12 MB, base64 phình 33%.
const MAX_TAI_LIEU_BYTES = 8 * 1024 * 1024;
const LOI_TAI_LIEU_NANG = 'Tệp nặng quá — tối đa '
  + `${Math.round(MAX_TAI_LIEU_BYTES / (1024 * 1024))} MB mỗi tệp. Cô nén bớt ảnh trong tệp rồi gửi lại nhé`;

// PDF nhận theo bốn byte đầu "%PDF". Word (.docx) là một tệp ZIP có thư mục
// "word/" bên trong: kiểm cả chữ ký ZIP lẫn tên thư mục đó, để một tệp ZIP
// bất kỳ đổi đuôi thành .docx không lọt.
const SIGNATURES_TAI_LIEU = [
  {
    ext: 'pdf', mime: 'application/pdf',
    test: b => b.length > 8 && b.toString('ascii', 0, 4) === '%PDF',
  },
  {
    ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    test: b => b.length > 30 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
      && b.includes('word/'),
  },
];

function detectTaiLieu(buf) {
  return SIGNATURES_TAI_LIEU.find(s => s.test(buf)) || null;
}

const SAFE_NAME_TAI_LIEU = /^[a-f0-9]{32}\.(pdf|docx)$/;

function pathOfTaiLieu(file) {
  if (typeof file !== 'string' || !SAFE_NAME_TAI_LIEU.test(file)) return null;
  return path.join(UPLOAD_DIR, file);
}

function mimeOfTaiLieu(file) {
  const ext = String(file || '').split('.').pop();
  const sig = SIGNATURES_TAI_LIEU.find(s => s.ext === ext);
  return sig ? sig.mime : 'application/octet-stream';
}

function existsTaiLieu(file) {
  const p = pathOfTaiLieu(file);
  return !!p && fs.existsSync(p);
}

function removeTaiLieu(file) {
  const p = pathOfTaiLieu(file);
  if (!p) return false;
  try { fs.unlinkSync(p); return true; } catch (_) { return false; }
}

// Nhận data URL (data:application/pdf;base64,... hoặc data:application/vnd...;
// base64,...) và ghi thành tệp. Trả về { file, bytes, ext } hoặc ném lỗi có
// thông báo tiếng Việt. Không tin phần khai báo của trình duyệt — chỉ đọc byte.
function saveTaiLieuDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Tệp không hợp lệ');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Tệp không hợp lệ');
  const base64 = dataUrl.slice(comma + 1);
  if (base64.length * 0.75 > MAX_TAI_LIEU_BYTES) throw new Error(LOI_TAI_LIEU_NANG);

  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch (_) {
    throw new Error('Tệp không hợp lệ');
  }
  if (!buf.length) throw new Error('Tệp rỗng');
  if (buf.length > MAX_TAI_LIEU_BYTES) throw new Error(LOI_TAI_LIEU_NANG);

  const sig = detectTaiLieu(buf);
  if (!sig) throw new Error('Chỉ nhận tệp PDF hoặc Word (.docx)');

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${crypto.randomBytes(16).toString('hex')}.${sig.ext}`;
  const tmp = path.join(UPLOAD_DIR, `.${file}.tmp`);
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(UPLOAD_DIR, file));
  return { file, bytes: buf.length, ext: sig.ext };
}

function remove(file) {
  const p = pathOf(file);
  if (!p) return false;
  try { fs.unlinkSync(p); return true; } catch (_) { return false; }
}

function exists(file) {
  const p = pathOf(file);
  return !!p && fs.existsSync(p);
}

module.exports = {
  saveDataUrl, saveVideoDataUrl, laVideo,
  remove, exists, pathOf, mimeOf,
  UPLOAD_DIR, MAX_BYTES, MAX_VIDEO_BYTES,
  // Tài liệu PDF / Word (Đ143) — bộ riêng, không đụng bộ ảnh ở trên.
  saveTaiLieuDataUrl, pathOfTaiLieu, existsTaiLieu, removeTaiLieu, mimeOfTaiLieu,
  MAX_TAI_LIEU_BYTES,
};
