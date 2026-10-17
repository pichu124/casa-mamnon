// ĐỌC VÀ GHI TỆP EXCEL (.xlsx) — KHÔNG THÊM GÓI NÀO.
//
// Vì sao tự viết: tệp .xlsx là một tệp ZIP chứa vài tệp XML. Node có sẵn
// `zlib` (giải nén deflate) nên phần ZIP chỉ là đọc mục lục ở cuối tệp. Thêm
// một gói đọc Excel vào máy chủ là thêm hàng chục nghìn dòng mã của người lạ
// chạy trên máy chứa hồ sơ trẻ, để làm đúng một việc nhỏ: đọc một bảng chữ.
// `test:khoa-goi` cũng canh danh sách gói của máy chủ.
//
// CHỈ ĐỦ CHO BẢNG CHỮ ĐƠN GIẢN — tệp mẫu do chính app phát ra, người dùng điền
// rồi nạp lại. Đọc được: chữ (chung, nội tuyến, chữ nhiều định dạng), số, ngày
// dạng số sê-ri của Excel (bên gọi tự quy đổi), ô gộp DỌC trong một cột (giá
// trị ô đầu chép xuống mọi ô của vùng gộp — bếp gộp "Sữa 180ml" cả tuần là
// cả tuần có sữa); ô gộp ngang thì đọc ở ô đầu. Không đọc
// công thức (chỉ lấy giá trị đã tính sẵn trong tệp), không đọc ảnh, biểu đồ.
//
// CHẶN TỆP XẤU TRƯỚC KHI GIẢI NÉN: tệp ZIP có thể khai "nén 1 KB, bung ra 4 GB".
// Trần tổng dung lượng sau giải nén và số mục được kiểm từ mục lục, rồi kiểm
// lại trên chính kết quả giải nén (`maxOutputLength`) — không tin lời khai.
const zlib = require('zlib');

const TOI_DA_MUC_ZIP = 300;
const TOI_DA_BUNG = 20 * 1024 * 1024;   // 20 MB sau giải nén, cho cả tệp

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------
function docZip(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new Error('Tệp không phải Excel (.xlsx)');
  // Mục lục nằm ở cuối: tìm chữ ký "PK\x05\x06" từ cuối ngược lên.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Tệp không phải Excel (.xlsx)');
  const soMuc = buf.readUInt16LE(eocd + 10);
  const viTriMucLuc = buf.readUInt32LE(eocd + 16);
  if (soMuc > TOI_DA_MUC_ZIP) throw new Error('Tệp Excel có quá nhiều phần');
  const muc = new Map();
  let p = viTriMucLuc;
  let tong = 0;
  for (let n = 0; n < soMuc; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Tệp Excel bị hỏng');
    const cachNen = buf.readUInt16LE(p + 10);
    const coNen = buf.readUInt32LE(p + 20);
    const coBung = buf.readUInt32LE(p + 24);
    const dTen = buf.readUInt16LE(p + 28);
    const dThem = buf.readUInt16LE(p + 30);
    const dGhiChu = buf.readUInt16LE(p + 32);
    const viTri = buf.readUInt32LE(p + 42);
    const ten = buf.slice(p + 46, p + 46 + dTen).toString('utf8');
    tong += coBung;
    if (tong > TOI_DA_BUNG) throw new Error('Tệp Excel quá lớn');
    muc.set(ten, { cachNen, coNen, coBung, viTri });
    p += 46 + dTen + dThem + dGhiChu;
  }
  const doc = (ten) => {
    const m = muc.get(ten);
    if (!m) return null;
    const q = m.viTri;
    if (q + 30 > buf.length || buf.readUInt32LE(q) !== 0x04034b50) throw new Error('Tệp Excel bị hỏng');
    const batDau = q + 30 + buf.readUInt16LE(q + 26) + buf.readUInt16LE(q + 28);
    const tho = buf.slice(batDau, batDau + m.coNen);
    if (m.cachNen === 0) return tho;
    if (m.cachNen === 8) return zlib.inflateRawSync(tho, { maxOutputLength: TOI_DA_BUNG });
    throw new Error('Tệp Excel nén theo kiểu chưa hỗ trợ — mở bằng Excel rồi lưu lại dạng .xlsx');
  };
  return { co: (ten) => muc.has(ten), doc };
}

// CRC-32 cho phần ghi ZIP. Dựng bảng một lần.
const BANG_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = BANG_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Ghi ZIP: mỗi tệp nén deflate. `tep` = [[tên, Buffer|chuỗi], ...]
function ghiZip(tep) {
  const phan = [];
  const mucLuc = [];
  let viTri = 0;
  for (const [ten, noiDung] of tep) {
    const goc = Buffer.isBuffer(noiDung) ? noiDung : Buffer.from(String(noiDung), 'utf8');
    const nen = zlib.deflateRawSync(goc);
    const tenB = Buffer.from(ten, 'utf8');
    const crc = crc32(goc);
    const dau = Buffer.alloc(30);
    dau.writeUInt32LE(0x04034b50, 0); dau.writeUInt16LE(20, 4); dau.writeUInt16LE(0x0800, 6);
    dau.writeUInt16LE(8, 8); dau.writeUInt16LE(0, 10); dau.writeUInt16LE(0x21, 12);
    dau.writeUInt32LE(crc, 14); dau.writeUInt32LE(nen.length, 18); dau.writeUInt32LE(goc.length, 22);
    dau.writeUInt16LE(tenB.length, 26); dau.writeUInt16LE(0, 28);
    phan.push(dau, tenB, nen);
    const ml = Buffer.alloc(46);
    ml.writeUInt32LE(0x02014b50, 0); ml.writeUInt16LE(20, 4); ml.writeUInt16LE(20, 6);
    ml.writeUInt16LE(0x0800, 8); ml.writeUInt16LE(8, 10); ml.writeUInt16LE(0, 12); ml.writeUInt16LE(0x21, 14);
    ml.writeUInt32LE(crc, 16); ml.writeUInt32LE(nen.length, 20); ml.writeUInt32LE(goc.length, 24);
    ml.writeUInt16LE(tenB.length, 28); ml.writeUInt32LE(viTri, 42);
    mucLuc.push(ml, tenB);
    viTri += 30 + tenB.length + nen.length;
  }
  const ml = Buffer.concat(mucLuc);
  const cuoi = Buffer.alloc(22);
  cuoi.writeUInt32LE(0x06054b50, 0);
  cuoi.writeUInt16LE(tep.length, 8); cuoi.writeUInt16LE(tep.length, 10);
  cuoi.writeUInt32LE(ml.length, 12); cuoi.writeUInt32LE(viTri, 16);
  return Buffer.concat([...phan, ml, cuoi]);
}

// ---------------------------------------------------------------------------
// XML tối thiểu
// ---------------------------------------------------------------------------
function giaiMa(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
function maHoa(s) {
  return String(s)
    // Ký tự điều khiển (trừ xuống dòng, tab) làm Excel báo tệp hỏng.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Mọi chữ trong các thẻ <t>…</t> nằm trong đoạn `xml` (chữ nhiều định dạng có nhiều <t>).
function chuTrong(xml) {
  let ra = '';
  const re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>|<(?:\w+:)?t(?:\s[^>]*)?\/>/g;
  let m;
  while ((m = re.exec(xml))) ra += m[1] !== undefined ? giaiMa(m[1]) : '';
  return ra;
}
function thuocTinh(the, ten) {
  const m = new RegExp(`\\s${ten}="([^"]*)"`).exec(the);
  return m ? giaiMa(m[1]) : null;
}

// "AB12" → { cot: 27 (đếm từ 0), hang: 11 (đếm từ 0) }
function viTriO(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(String(ref || ''));
  if (!m) return null;
  let cot = 0;
  for (const ch of m[1]) cot = cot * 26 + (ch.charCodeAt(0) - 64);
  return { cot: cot - 1, hang: Number(m[2]) - 1 };
}
function tenCot(i) {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// ---------------------------------------------------------------------------
// ĐỌC: Buffer → [{ ten, hang: [[giá trị ô…]…] }]
// Ô chữ → chuỗi; ô số → số (ngày của Excel cũng là số — bên gọi quy đổi).
// ---------------------------------------------------------------------------
function doc(buf) {
  const z = docZip(buf);
  const chuoi = (ten) => { const b = z.doc(ten); return b ? b.toString('utf8') : null; };
  const wb = chuoi('xl/workbook.xml');
  if (!wb) throw new Error('Tệp không phải Excel (.xlsx)');
  const rels = chuoi('xl/_rels/workbook.xml.rels') || '';
  const dich = new Map();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = thuocTinh(m[0], 'Id'); const t = thuocTinh(m[0], 'Target');
    if (id && t) dich.set(id, t.replace(/^\/?xl\//, '').replace(/^\//, ''));
  }
  const chung = [];
  const ss = chuoi('xl/sharedStrings.xml');
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) chung.push(m[1] ? chuTrong(m[1]) : '');

  const bang = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const ten = thuocTinh(m[0], 'name') || '';
    const rid = thuocTinh(m[0], 'r:id');
    const duong = rid && dich.get(rid) ? `xl/${dich.get(rid)}` : null;
    const xml = duong ? chuoi(duong) : null;
    const hang = [];
    if (xml) {
      for (const r of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const the = r[1]; const trong = r[2] || '';
        const vt = viTriO(thuocTinh(` ${the}`, 'r'));
        if (!vt || vt.hang > 5000 || vt.cot > 200) continue;
        const kieu = thuocTinh(` ${the}`, 't');
        const v = /<v>([\s\S]*?)<\/v>/.exec(trong);
        let gt = null;
        if (kieu === 's') gt = v ? (chung[Number(v[1])] ?? '') : '';
        else if (kieu === 'inlineStr') gt = chuTrong(trong);
        else if (kieu === 'str' || kieu === 'e') gt = v ? giaiMa(v[1]) : '';
        else if (kieu === 'b') gt = v ? v[1] === '1' : null;
        else if (v) { const so = Number(v[1]); gt = Number.isFinite(so) ? so : giaiMa(v[1]); }
        if (gt === null || gt === '') continue;
        while (hang.length <= vt.hang) hang.push([]);
        hang[vt.hang][vt.cot] = gt;
      }
      // Ô GỘP DỌC (vòng rà Đ232): Excel chỉ lưu giá trị ở ô đầu vùng gộp.
      // Đọc ở ô đầu là các ngày sau mất bữa đó mà không lời nào báo.
      for (const g of xml.matchAll(/<mergeCell\b[^>]*\/?>/g)) {
        const [a, b] = String(thuocTinh(g[0], 'ref') || '').split(':');
        const va = viTriO(a); const vb = viTriO(b);
        if (!va || !vb || va.cot !== vb.cot || vb.hang <= va.hang || vb.hang > 5000 || va.cot > 200) continue;
        const goc = hang[va.hang] && hang[va.hang][va.cot];
        if (goc === undefined || goc === null || goc === '') continue;
        for (let r = va.hang + 1; r <= vb.hang; r++) {
          while (hang.length <= r) hang.push([]);
          if (hang[r][va.cot] === undefined) hang[r][va.cot] = goc;
        }
      }
    }
    bang.push({ ten, hang });
  }
  return bang;
}

// Số sê-ri ngày của Excel → "YYYY-MM-DD" (hệ 1900, có lỗi năm nhuận 1900 của Excel).
function ngayTuSoExcel(so) {
  if (typeof so !== 'number' || !Number.isFinite(so) || so < 1 || so > 2958465) return null;
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(so) * 86400000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// GHI: [{ ten, cot: [độ rộng…], hang: [[chuỗi…]…], dongTieuDe: true }] → Buffer
// Mọi ô ghi dạng CHỮ (kể cả ngày) — người dùng điền rồi nạp lại, không cần
// Excel đoán kiểu, và ô ngày không bao giờ bị Excel đổi sang dạng tháng/ngày.
// Kiểu ô: 0 thường, 1 tiêu đề (đậm, nền xám), 2 chữ xuống dòng canh trên.
//
// `gop` (tuỳ chọn, Đ239a): các vùng ô GỘP viết như Excel, vd ['A3:A5', 'A1:F1'].
// Chữ để ở ô đầu vùng. Vùng viết sai, hay chồng lên một vùng đứng trước nó, bị
// bỏ qua — hai vùng chồng nhau là Excel báo tệp hỏng. Không truyền thì tệp ghi
// ra y như trước.
// ---------------------------------------------------------------------------
function vungGop(ds) {
  const ra = [];
  for (const v of ds || []) {
    const [a, b] = String(v).split(':');
    const p = viTriO(a); const q = viTriO(b);
    if (!p || !q || p.hang < 0 || q.hang < p.hang || q.cot < p.cot || (q.hang === p.hang && q.cot === p.cot)) continue;
    if (ra.some(x => p.hang <= x.q.hang && q.hang >= x.p.hang && p.cot <= x.q.cot && q.cot >= x.p.cot)) continue;
    ra.push({ ref: `${a}:${b}`, p, q });
  }
  return ra;
}

function ghi(cacBang) {
  const ds = cacBang.slice(0, 20);
  const sheet = (b) => {
    const gop = vungGop(b.gop);
    const cols = (b.cot || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Number(w) || 12}" customWidth="1"/>`).join('');
    const rows = (b.hang || []).map((h, r) => `<row r="${r + 1}">${h.map((gt, c) => {
      if (gt === null || gt === undefined || gt === '') return '';
      const kieu = b.dongTieuDe && r === 0 ? 1 : 2;
      return `<c r="${tenCot(c)}${r + 1}" t="inlineStr" s="${kieu}"><is><t xml:space="preserve">${maHoa(gt)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const dong = b.dongTieuDe
      ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + dong + (cols ? `<cols>${cols}</cols>` : '') + `<sheetData>${rows}</sheetData>`
      + (gop.length ? `<mergeCells count="${gop.length}">${gop.map(g => `<mergeCell ref="${g.ref}"/>`).join('')}</mergeCells>` : '')
      + '</worksheet>';
  };
  const tep = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + ds.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${ds.map((b, i) => `<sheet name="${maHoa(String(b.ten || `Trang ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>`
      + '</workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + ds.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${ds.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>'
      + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>'
      + '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>'],
    ...ds.map((b, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheet(b)]),
  ];
  return ghiZip(tep);
}

module.exports = { doc, ghi, ngayTuSoExcel };
