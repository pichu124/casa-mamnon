// Đọc và ghi tệp CSV — đủ dùng cho việc nhập danh sách học sinh từ Excel.
// Không thêm thư viện ngoài: định dạng CSV đơn giản và ổn định, tự xử lý được.

// Tách một dòng CSV, hiểu cả ô có dấu phẩy nằm trong ngoặc kép và ngoặc kép đôi.
function parseLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // "" là một dấu nháy
        else inQuote = false;
      } else cur += c;
    } else if (c === '"') {
      inQuote = true;
    } else if (c === sep) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

// Excel bản tiếng Việt thường lưu CSV ngăn bằng dấu chấm phẩy. Đoán theo dòng đầu.
function detectSeparator(header) {
  const phay = (header.match(/,/g) || []).length;
  const chamPhay = (header.match(/;/g) || []).length;
  const tab = (header.match(/\t/g) || []).length;
  if (tab > phay && tab > chamPhay) return '\t';
  return chamPhay > phay ? ';' : ',';
}

// Trả về { headers, rows } với rows là mảng các đối tượng theo tên cột.
function parse(text) {
  // Bỏ dấu BOM mà Excel hay chèn vào đầu tệp, nếu không cột đầu sẽ có tên lạ.
  let s = String(text || '').replace(/^﻿/, '');
  const lines = s.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };

  const sep = detectSeparator(lines[0]);
  const headers = parseLine(lines[0], sep).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], sep);
    const obj = { __line: i + 1 };
    headers.forEach((h, idx) => { obj[h] = cells[idx] !== undefined ? cells[idx] : ''; });
    rows.push(obj);
  }
  return { headers, rows, separator: sep };
}

// Tạo nội dung CSV. Thêm BOM để Excel mở lên hiển thị đúng tiếng Việt có dấu.
function stringify(headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out = [headers.map(esc).join(',')];
  for (const r of rows) out.push(headers.map(h => esc(r[h])).join(','));
  return '﻿' + out.join('\r\n') + '\r\n';
}

// Bỏ dấu tiếng Việt để sinh tên đăng nhập: "Nguyễn Minh Khang" → "nguyenminhkhang"
function boDau(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

module.exports = { parse, stringify, boDau, parseLine };
