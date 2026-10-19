#!/usr/bin/env node
// Dựng hai hướng dẫn thử gửi trường ra tệp Word:
//   docs/HUONG-DAN-KIEM-THU.md  → Huong-dan-kiem-thu-CASA-Mam-non-<ngày>.docx  (bản đầy đủ)
//   docs/HUONG-DAN-THU-NHANH.md → Huong-dan-thu-nhanh-CASA-Mam-non-<ngày>.docx (bản ngắn)
//
//   npm run tai-lieu:huong-dan-thu                    # cả hai, vào thư mục ban-word/
//   npm run tai-lieu:huong-dan-thu -- --chi ngan      # chỉ bản ngắn (hoặc: day-du)
//   npm run tai-lieu:huong-dan-thu -- --ra D:\GuiTruong
//
// BẢN CHÍNH KHÔNG NẰM Ở ĐÂY
//
// Bản chính của hai hướng dẫn là hai tài liệu trên claude.ai (chủ dự án chốt
// 19/10/2026, Đ239u); hai tệp markdown trong kho là bản chép. Trước khi dựng,
// chép bản chính về theo cách ghi ở đầu mỗi tệp. Dựng từ bản chép cũ là gửi
// trường một hướng dẫn cũ, mà nhìn tệp Word thì không ai biết.
//
// LẤY GÌ TỪ TỆP
//
//   - tiêu đề: dòng "# …" đầu tệp;
//   - phụ đề: dòng chữ đầu tiên ngay sau tiêu đề;
//   - thân: từ dòng mốc của từng bản (HUONG_DAN bên dưới) tới hết tệp.
// Mọi thứ nằm giữa phụ đề và mốc (đường dẫn bản chính, cách chép, câu cấm điền
// mật khẩu) là ghi chú của kho và KHÔNG vào file Word.
//
// PHỤ ĐỀ LỆCH THÌ DỪNG, KHÔNG DỰNG
//
// Phụ đề nằm ngoài vùng chép nên phải sửa tay. Quên sửa thì trang đầu file gửi
// trường in số việc cũ — thứ người đọc tin ngay mà không ai đếm lại. Nên lệnh
// này từ chối dựng khi số ghi ở phụ đề khác số dòng thật của các bảng thử, hay
// ngày ở phụ đề khác ngày "Chép từ bản chính lần cuối".
//
// Cột "Kết quả" của mỗi bảng thử thành ba ô tích bấm được trong Word (Đạt /
// Không đạt / Chưa thử). Giấy A4 nằm ngang, tiêu đề bảng lặp lại khi sang trang.
//
// Cần: thư viện `docx` (đã nằm trong devDependencies).
'use strict';
const fs = require('fs');
const path = require('path');
const d = require('docx');

const GOC = path.join(__dirname, '..');

const HUONG_DAN = {
  'day-du': {
    nguon: 'docs/HUONG-DAN-KIEM-THU.md',
    tenTep: 'Huong-dan-kiem-thu-CASA-Mam-non',
    moc: '> **Đợt này thay đổi gì',
    donVi: 'dòng thử',
    // Mục "## …" thứ mấy trở đi thì bắt đầu trang mới (hai mục đầu ngắn, in liền).
    sangTrangTuMuc: 3,
  },
  ngan: {
    nguon: 'docs/HUONG-DAN-THU-NHANH.md',
    tenTep: 'Huong-dan-thu-nhanh-CASA-Mam-non',
    moc: '## Trước khi thử',
    donVi: 'việc',
    sangTrangTuMuc: 2,
  },
};

// ---- Đọc tệp markdown ------------------------------------------------------
function o(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split(' | ').map(x => x.trim()); }
function laBangThu(dau) { return dau[0] === 'Số' && dau[1] === 'Ai làm' && dau[dau.length - 1] === 'Kết quả'; }

function demDongThu(than) {
  let n = 0;
  for (let i = 0; i < than.length; i++) {
    if (!than[i].startsWith('|')) continue;
    const thu = laBangThu(o(than[i]));
    i += 2;
    while (i < than.length && than[i].startsWith('|')) { if (thu) n++; i++; }
  }
  return n;
}

// Trả về phần cần dựng, hoặc ném lỗi bằng tiếng Việt nói rõ phải sửa dòng nào.
function docHuongDan(noiDung, cauHinh) {
  const dong = noiDung.split(/\r?\n/);
  if (!dong[0] || !dong[0].startsWith('# ')) throw new Error('dòng đầu tệp phải là tiêu đề "# …".');
  const tieuDe = dong[0].slice(2).trim();

  const iPhuDe = dong.findIndex((l, i) => i > 0 && l.trim());
  const phuDe = iPhuDe < 0 ? '' : dong[iPhuDe].trim();
  if (!phuDe || /^[>#|-]/.test(phuDe)) {
    throw new Error('thiếu dòng phụ đề ngay dưới tiêu đề (vd "Bản 19/10/2026 · … · 177 dòng thử").');
  }

  const iMoc = dong.findIndex(l => l.startsWith(cauHinh.moc));
  if (iMoc < 0) throw new Error(`không thấy dòng mốc bắt đầu bằng "${cauHinh.moc}".`);
  const than = dong.slice(iMoc);

  const mNgayChep = dong.slice(0, iMoc).join('\n').match(/Chép từ bản chính lần cuối:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (!mNgayChep) throw new Error('phần đầu tệp thiếu dòng "Chép từ bản chính lần cuối: dd/mm/yyyy".');
  const ngayChep = mNgayChep[1];

  const soDong = demDongThu(than);
  const mSo = phuDe.match(new RegExp(`(\\d+)\\s+${cauHinh.donVi}`));
  if (!mSo) throw new Error(`phụ đề không ghi số ${cauHinh.donVi} (vd "${soDong} ${cauHinh.donVi}").`);
  if (Number(mSo[1]) !== soDong) {
    throw new Error(`phụ đề ghi ${mSo[1]} ${cauHinh.donVi} nhưng các bảng có ${soDong}. Sửa dòng phụ đề ngay dưới tiêu đề.`);
  }
  const mNgay = phuDe.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
  if (!mNgay || mNgay[0] !== ngayChep) {
    throw new Error(`ngày ở phụ đề (${mNgay ? mNgay[0] : 'không có'}) khác ngày chép từ bản chính (${ngayChep}). Sửa dòng phụ đề.`);
  }

  const dau = phuDe.split(' · ')[0];
  const dauTrang = `${tieuDe} · ${dau.charAt(0).toLowerCase()}${dau.slice(1)}`;
  return { tieuDe, phuDe, dauTrang, than, soDong, ngayChep, sangTrangTuMuc: cauHinh.sangTrangTuMuc };
}

// ---- Kích thước (DXA) -------------------------------------------------------
const TRANG_W = 11906, TRANG_H = 16838;          // A4 dọc; xoay ngang bên dưới
const LE = 720;                                   // lề 1,27 cm
const RONG = TRANG_H - 2 * LE;                    // bề ngang trang nằm ngang
const FONT = 'Arial';
const CO_THAN = 21, CO_BANG = 17;                 // nửa-point: 10,5pt và 8,5pt
const XANH = '1F4E79', NEN_DAU = 'DCE6F1', NEN_KHUNG = 'F2F2F2', VIEN = 'A6A6A6';

// ---- Chữ trong dòng: **đậm**, *nghiêng*, `mã`, ký tự thoát ------------------
function bo(s) { return s.replace(/\\([\[\]<>*_`\\#|])/g, '$1'); }
function tr(text, k) {
  return new d.TextRun({
    text, bold: k.bold, italics: k.italics, size: k.size,
    font: k.ma ? 'Consolas' : FONT, color: k.color,
    shading: k.ma ? { type: d.ShadingType.CLEAR, fill: 'EDEDED', color: 'auto' } : undefined,
  });
}
function chay(s, kieu = {}) {
  const out = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let m, cuoi = 0;
  while ((m = re.exec(s))) {
    if (m.index > cuoi) out.push(tr(bo(s.slice(cuoi, m.index)), kieu));
    if (m[1] !== undefined) out.push(...chay(m[1], { ...kieu, bold: true }));
    else if (m[2] !== undefined) out.push(tr(m[2], { ...kieu, ma: true }));
    else out.push(...chay(m[3], { ...kieu, italics: true }));
    cuoi = re.lastIndex;
  }
  if (cuoi < s.length) out.push(tr(bo(s.slice(cuoi)), kieu));
  return out;
}

// ---- Bảng -------------------------------------------------------------------
function doRong(dau, dong) {
  if (laBangThu(dau) && dau.length === 5) {
    const w = [640, 1900, 5500, 5500];
    w.push(RONG - w.reduce((a, b) => a + b, 0));
    return w;
  }
  if (laBangThu(dau)) {
    const w = [640, 1800, 5100, 5100, 900];
    w.push(RONG - w.reduce((a, b) => a + b, 0));
    return w;
  }
  // Cột toàn chữ ngắn (mã, loại, tên đăng nhập) giữ đủ rộng cho chữ dài nhất;
  // phần còn lại chia theo độ dài trung bình của các cột chữ dài.
  const n = dau.length;
  const cot = c => [dau[c], ...dong.map(r => r[c] || '')];
  const toiThieu = dau.map((_, c) => Math.max(900, ...cot(c).filter(x => x.length <= 22).map(x => x.length * 105 + 220)));
  const tb = dau.map((_, c) => cot(c).reduce((a, x) => a + x.length, 0) / cot(c).length);
  const dai = dau.map((_, c) => cot(c).some(x => x.length > 22));
  const conLai = RONG - toiThieu.reduce((a, b) => a + b, 0);
  const tongTb = dau.reduce((a, _, c) => a + (dai[c] ? tb[c] : 0), 0) || 1;
  const w = dau.map((_, c) => Math.floor(toiThieu[c] + (dai[c] ? Math.max(0, conLai) * tb[c] / tongTb : 0)));
  w[n - 1] += RONG - w.reduce((a, b) => a + b, 0);
  return w;
}
const vien = { style: d.BorderStyle.SINGLE, size: 4, color: VIEN };
const vienO = { top: vien, bottom: vien, left: vien, right: vien };
function oChonKetQua() {
  return ['Đạt', 'Không đạt', 'Chưa thử'].map(nhan => new d.Paragraph({
    spacing: { after: 20 },
    children: [new d.CheckBox({ checked: false }), new d.TextRun({ text: ' ' + nhan, font: FONT, size: CO_BANG })],
  }));
}
function bang(dau, dong) {
  const w = doRong(dau, dong);
  const thu = laBangThu(dau);
  const hang = [new d.TableRow({
    tableHeader: true, cantSplit: true,
    children: dau.map((h, c) => new d.TableCell({
      width: { size: w[c], type: d.WidthType.DXA }, borders: vienO,
      shading: { type: d.ShadingType.CLEAR, fill: NEN_DAU, color: 'auto' },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new d.Paragraph({ children: chay(h, { bold: true, size: CO_BANG }) })],
    })),
  })];
  for (const r of dong) {
    hang.push(new d.TableRow({
      cantSplit: thu,
      children: dau.map((_, c) => {
        const txt = r[c] || '';
        const con = (thu && c === dau.length - 1) ? oChonKetQua()
          : [new d.Paragraph({ children: chay(txt, { size: CO_BANG, bold: (thu && c === 0) || (thu && dau[c] === 'Mức' && txt === 'Cao') || undefined }) })];
        return new d.TableCell({
          width: { size: w[c], type: d.WidthType.DXA }, borders: vienO,
          margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: con,
        });
      }),
    }));
  }
  return new d.Table({ width: { size: RONG, type: d.WidthType.DXA }, columnWidths: w, rows: hang });
}

// ---- Khung nền xám có viền trái: khối "Đợt này thay đổi gì" và trích dẫn ----
function khung(lines) {
  const ps = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    const m = l.match(/^- (.*)/);
    ps.push(new d.Paragraph({
      spacing: { after: 80, line: 264 },
      shading: { type: d.ShadingType.CLEAR, fill: NEN_KHUNG, color: 'auto' },
      border: { left: { style: d.BorderStyle.SINGLE, size: 18, color: XANH, space: 8 } },
      indent: m ? { left: 540, hanging: 300 } : { left: 200 },
      children: m ? [tr('• ', { size: CO_THAN }), ...chay(m[1], { size: CO_THAN })] : chay(l, { size: CO_THAN }),
    }));
  }
  return ps;
}

// ---- Dựng tài liệu ----------------------------------------------------------
async function dungWord(phan) {
  const soDanhSach = [];
  let demDs = 0;
  const dsMoi = (batDau) => {
    const ref = 'ds' + (++demDs);
    soDanhSach.push({ reference: ref, levels: [{ level: 0, format: d.LevelFormat.DECIMAL, text: '%1.',
      start: batDau, alignment: d.AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
    return ref;
  };
  soDanhSach.push({ reference: 'cham', levels: [{ level: 0, format: d.LevelFormat.BULLET, text: '•',
    alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
  soDanhSach.push({ reference: 'tich', levels: [{ level: 0, format: d.LevelFormat.BULLET, text: '☐',
    alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });

  const con = [];
  con.push(new d.Paragraph({ heading: d.HeadingLevel.TITLE, children: [new d.TextRun({ text: phan.tieuDe, font: FONT, bold: true, size: 40, color: XANH })] }));
  con.push(new d.Paragraph({ spacing: { after: 200 }, children: [new d.TextRun({ text: phan.phuDe, font: FONT, size: 20, color: '595959' })] }));

  const than = phan.than;
  let i = 0, dsHienTai = null, mucH2 = 0;
  while (i < than.length) {
    const l = than[i];
    if (l.startsWith('```')) {
      const ma = []; i++;
      while (i < than.length && !than[i].startsWith('```')) ma.push(than[i++]);
      i++;
      for (const m of ma) con.push(new d.Paragraph({ spacing: { after: 0 }, indent: { left: 200 },
        shading: { type: d.ShadingType.CLEAR, fill: 'EDEDED', color: 'auto' },
        children: [new d.TextRun({ text: m || ' ', font: 'Consolas', size: 18 })] }));
      con.push(new d.Paragraph({ spacing: { after: 100 }, children: [] }));
      continue;
    }
    if (l.startsWith('|')) {
      const dau = o(l); i += 2;
      const dong = [];
      while (i < than.length && than[i].startsWith('|')) dong.push(o(than[i++]));
      con.push(bang(dau, dong));
      con.push(new d.Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }
    if (l.startsWith('## ')) {
      mucH2++;
      con.push(new d.Paragraph({ heading: d.HeadingLevel.HEADING_1, pageBreakBefore: mucH2 >= phan.sangTrangTuMuc,
        spacing: { before: 200, after: 120 }, children: chay(l.slice(3), { bold: true, size: 30, color: XANH }) }));
      i++; continue;
    }
    if (l.startsWith('### ')) {
      con.push(new d.Paragraph({ heading: d.HeadingLevel.HEADING_2, keepNext: true,
        spacing: { before: 200, after: 100 }, children: chay(l.slice(4), { bold: true, size: 24, color: XANH }) }));
      i++; continue;
    }
    if (l.startsWith('>')) {
      const q = [];
      while (i < than.length && than[i].startsWith('>')) q.push(than[i++].replace(/^> ?/, ''));
      con.push(...khung(q));
      continue;
    }
    let m;
    if ((m = l.match(/^(\d+)\. (.*)/))) {
      if (!dsHienTai) dsHienTai = dsMoi(Number(m[1]));
      con.push(new d.Paragraph({ numbering: { reference: dsHienTai, level: 0 }, spacing: { after: 60, line: 276 }, children: chay(m[2], { size: CO_THAN }) }));
      i++; continue;
    }
    dsHienTai = null;
    if ((m = l.match(/^- \[ \] (.*)/))) {
      con.push(new d.Paragraph({ numbering: { reference: 'tich', level: 0 }, spacing: { after: 60 }, children: chay(m[1], { size: CO_THAN }) }));
      i++; continue;
    }
    if ((m = l.match(/^- (.*)/))) {
      con.push(new d.Paragraph({ numbering: { reference: 'cham', level: 0 }, spacing: { after: 60, line: 276 }, children: chay(m[1], { size: CO_THAN }) }));
      i++; continue;
    }
    if (l.trim()) con.push(new d.Paragraph({ spacing: { after: 100, line: 276 }, children: chay(l, { size: CO_THAN }) }));
    i++;
  }

  const tai = new d.Document({
    creator: 'CASA Mầm non', title: phan.tieuDe,
    styles: { default: { document: { run: { font: FONT, size: CO_THAN } } } },
    numbering: { config: soDanhSach },
    sections: [{
      properties: { page: { size: { width: TRANG_W, height: TRANG_H, orientation: d.PageOrientation.LANDSCAPE },
        margin: { top: LE, bottom: LE, left: LE, right: LE, header: 360, footer: 360 } } },
      headers: { default: new d.Header({ children: [new d.Paragraph({ alignment: d.AlignmentType.RIGHT,
        children: [new d.TextRun({ text: phan.dauTrang, font: FONT, size: 16, color: '808080' })] })] }) },
      footers: { default: new d.Footer({ children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER,
        children: [new d.TextRun({ children: ['Trang ', d.PageNumber.CURRENT, ' / ', d.PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '808080' })] })] }) },
      children: con,
    }],
  });

  // docx-js ghi ô tích bằng <w:sym>, mà LibreOffice vẽ sai ký hiệu đó (ra ô đã
  // tích). Word tự ghi ô tích bằng một ký tự ☐ thường trong font MS Gothic:
  // đổi sang dạng ấy để mở bằng phần mềm nào cũng thấy ô trống.
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('docx')] }));
  const z = await JSZip.loadAsync(await d.Packer.toBuffer(tai));
  const x = (await z.file('word/document.xml').async('string'))
    .split('<w:r><w:sym w:char="2610" w:font="MS Gothic"/></w:r>')
    .join('<w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/>'
      + '<w:sz w:val="17"/></w:rPr><w:t>\u2610</w:t></w:r>');
  z.file('word/document.xml', x);
  return z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function tenTepWord(cauHinh, phan) {
  const [ng, th, nam] = phan.ngayChep.split('/');
  return `${cauHinh.tenTep}-${ng.padStart(2, '0')}-${th.padStart(2, '0')}-${nam}.docx`;
}

// ---- Dòng lệnh --------------------------------------------------------------
async function main(argv) {
  const lay = (ten) => { const i = argv.indexOf(ten); return i < 0 ? undefined : argv[i + 1]; };
  const chi = lay('--chi');
  if (chi !== undefined && !HUONG_DAN[chi]) {
    throw new Error(`"--chi ${chi}" không có. Chọn một trong: ${Object.keys(HUONG_DAN).join(', ')}.`);
  }
  const thuMucRa = path.resolve(lay('--ra') || path.join(GOC, 'ban-word'));
  fs.mkdirSync(thuMucRa, { recursive: true });

  for (const khoa of chi ? [chi] : Object.keys(HUONG_DAN)) {
    const cauHinh = HUONG_DAN[khoa];
    let phan;
    try {
      phan = docHuongDan(fs.readFileSync(path.join(GOC, cauHinh.nguon), 'utf8'), cauHinh);
    } catch (e) {
      throw new Error(`${cauHinh.nguon}: ${e.message}`);
    }
    const ra = path.join(thuMucRa, tenTepWord(cauHinh, phan));
    fs.writeFileSync(ra, await dungWord(phan));
    console.log(`Đã dựng ${ra} (${phan.soDong} ${cauHinh.donVi}, chép từ bản chính ngày ${phan.ngayChep}).`);
  }
}

module.exports = { HUONG_DAN, docHuongDan, dungWord, tenTepWord, demDongThu };

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`Không dựng được file Word: ${e.message}`);
    process.exit(1);
  });
}
