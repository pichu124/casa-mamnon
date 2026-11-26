// ĐỌC NGÀY SINH CỦA BÉ TỪ CHỮ NGƯỜI TA GÕ (Đ261a — báo cáo O1 / L4).
//
// Trước tệp này, đường nhập danh sách lưu nguyên văn ô "Ngày sinh". Excel cài
// vùng Việt Nam lưu CSV ra `24/09/2023`, nên CẢ CỘT ngày sinh của một tệp thật
// rơi xuống cơ sở dữ liệu ở dạng mà không màn nào đọc được: hồ sơ hiện
// "NaN/NaN/NaN", không có tuổi, nhóm chưa khai lứa thì bé nhà trẻ mất sổ nhật
// ký. Tệ hơn, `12/5/24` được trình duyệt đọc kiểu Mỹ thành 05/12/2024 — sai
// ngày mà không ai biết.
//
// MỘT CHỖ cho mọi đường ghi ngày sinh: nhập tệp, nhận một bé, sửa hồ sơ.
//
// ĐỌC NGÀY TRƯỚC, THÁNG SAU — kiểu Việt Nam. Không đoán kiểu Mỹ: ở trường này
// không có ai gõ tháng trước. Năm hai chữ số là 20yy (bé sinh từ năm 2000).
//
// Ô trống KHÔNG phải lỗi: ngày sinh chưa bao giờ là cột bắt buộc.

const NGAY_MS = 86400000;
// Excel đếm ngày từ 30/12/1899 (gồm cả ngày 29/02/1900 không có thật, nên mốc
// này đúng cho mọi số từ 61 trở đi — tức mọi ngày sinh có thể có ở đây).
const MOC_EXCEL = Date.UTC(1899, 11, 30);

function ghep(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function coThat(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Chữ người gõ → { ngay: 'YYYY-MM-DD' } | { ngay: '' } (ô trống) | { loi: '...' }.
function doc(chu) {
  const t = String(chu ?? '').trim();
  if (!t) return { ngay: '' };
  let y; let m; let d;
  let k = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);                 // 2023-09-24
  if (k) [y, m, d] = [k[1], k[2], k[3]].map(Number);
  if (!k) {
    k = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);              // 24/09/2023, 24/9/23
    if (k) {
      [d, m, y] = [k[1], k[2], k[3]].map(Number);
      if (k[3].length === 2) y += 2000;
    }
  }
  if (!k) {
    k = t.match(/^(\d{5})(?:[.,]0+)?$/);                                      // 45678 — số ngày của Excel
    if (k) {
      const n = new Date(MOC_EXCEL + Number(k[1]) * NGAY_MS);
      return { ngay: n.toISOString().slice(0, 10) };
    }
  }
  if (!k) return { loi: `ngày sinh '${t}' không đọc được — xin ghi dạng ngày/tháng/năm, ví dụ 24/09/2023` };
  if (!coThat(y, m, d)) return { loi: `ngày sinh '${t}' không có thật` };
  return { ngay: ghep(y, m, d) };
}

// Số tháng tuổi tròn của bé tính tới `homNay` (YYYY-MM-DD).
function thangTuoi(ngay, homNay) {
  const [y1, m1, d1] = ngay.split('-').map(Number);
  const [y2, m2, d2] = homNay.split('-').map(Number);
  let thang = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) thang -= 1;
  return thang;
}

function noiTuoi(thang) {
  if (thang < 36) return `${thang} tháng`;
  const nam = Math.floor(thang / 12);
  const du = thang % 12;
  return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
}

// Soát ngày sinh đã đọc được so với hôm nay.
//
// Lứa của trường là 12 tháng – 6 tuổi. Ngoài lứa là CẢNH BÁO, vẫn cho nhập:
// trường nhận sớm từ 12 tháng khi đã đồng ý, và bé nhóm Lá qua 6 tuổi giữa năm
// học là chuyện thường. Ngày trong tương lai, hoặc bé đã quá 7 tuổi, thì gần
// như chắc là gõ nhầm năm — đó là LỖI, không nhập.
//
// Trả về { loi } | { canhBao } | {}.
function soat(ngay, homNay, chuGoc = ngay) {
  if (!ngay) return {};
  if (ngay > homNay) return { loi: `ngày sinh '${chuGoc}' là ngày trong tương lai` };
  const thang = thangTuoi(ngay, homNay);
  if (thang > 84) {
    return { loi: `ngày sinh '${chuGoc}' cho thấy bé đã ${noiTuoi(thang)} — trường nhận bé từ 12 tháng tới 6 tuổi, xin xem lại năm sinh` };
  }
  if (thang < 12) {
    return { canhBao: `bé mới ${noiTuoi(thang)}, nhỏ hơn lứa 12 tháng – 6 tuổi của trường — vẫn nhập được nếu trường đã đồng ý nhận sớm` };
  }
  if (thang > 72) {
    return { canhBao: `bé đã ${noiTuoi(thang)}, lớn hơn lứa 12 tháng – 6 tuổi của trường — xin xem lại ngày sinh` };
  }
  return {};
}

// Đọc và soát một lượt: { ngay, loi?, canhBao? }.
function docVaSoat(chu, homNay) {
  const r = doc(chu);
  if (r.loi) return { ngay: '', loi: r.loi };
  return { ngay: r.ngay, ...soat(r.ngay, homNay, String(chu ?? '').trim()) };
}

module.exports = { doc, soat, docVaSoat, thangTuoi };
