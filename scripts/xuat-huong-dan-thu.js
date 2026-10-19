#!/usr/bin/env node
// Dựng hai hướng dẫn thử gửi trường ra tệp Word:
//   docs/HUONG-DAN-KIEM-THU.md  → Huong-dan-kiem-thu-CASA-Mam-non-<ngày>.docx  (bản đầy đủ)
//   docs/HUONG-DAN-THU-NHANH.md → Huong-dan-thu-nhanh-CASA-Mam-non-<ngày>.docx (bản ngắn)
//
//   npm run tai-lieu:huong-dan-thu                    # cả hai, vào thư mục ban-word/
//   npm run tai-lieu:huong-dan-thu -- --chi ngan      # chỉ bản ngắn (hoặc: day-du)
//   npm run tai-lieu:huong-dan-thu -- --ra D:\GuiTruong
//   npm run test:huong-dan-thu                        # chỉ soát hai tệp, không dựng
//   (móc .githooks/commit-msg chạy `--kiem-tra --ban-sap-commit`: chỉ soát mật khẩu và
//    tên người trong bản đã git add — xem soatBanSapCommit)
//
// BẢN CHÍNH KHÔNG NẰM Ở ĐÂY
//
// Bản chính của hai hướng dẫn là hai tài liệu trên claude.ai (chủ dự án chốt
// 19/10/2026, Đ239u); hai tệp markdown trong kho là bản chép. Trước khi dựng,
// chép bản chính về theo cách ghi ở đầu mỗi tệp. Dựng từ bản chép cũ là gửi
// trường một hướng dẫn cũ, mà nhìn tệp Word thì không ai biết.
//
// BỐ CỤC TỆP
//
//   > ghi chú của kho (bản chép, cách chép, ngày chép, …)    ← KHÔNG vào file Word
//
//   # Tiêu đề                                  ┐
//   Oct 19, 2026                               │ bản xuất của bản chính,
//   Bản ngắn · máy thử … · 41 việc, …          │ chép nguyên văn
//   …thân…                                     ┘
//
// Dòng ngay dưới tiêu đề là ô ngày dưới tiêu đề trên claude.ai, bản xuất ghi
// kiểu "Oct 19, 2026" (nhận cả "19/10/2026"). Đó là NGÀY CỦA BẢN: ngày sửa trên
// claude.ai (chủ dự án chốt 19/10/2026), in vào phụ đề, đầu trang và tên tệp
// Word. Ngày lấy từ bản chính chứ không gõ tay ở kho, nên chép về là có đúng ngày.
//
// TỪ CHỐI DỰNG, KHÔNG DỰNG BỪA
//
//   - dòng ngày còn " · @tên người viết", hay bất cứ chữ gì ngoài ngày: tên người
//     không lưu vào kho;
//   - cột "Mật khẩu…" của một bảng có chữ, hay số cột ấy khác thường lệ (bị đổi
//     tên, bị tách bảng): bản chính là chỗ người phụ trách điền mật khẩu, chép
//     nguyên văn là mật khẩu lên kho và lên giấy gửi trường;
//   - bất cứ chỗ nào trong tệp có một chuỗi trông như mật khẩu do app sinh ra
//     (5–6 chữ thường rồi 3–4 chữ số, đúng bảng chữ của các bộ sinh mật khẩu);
//   - số ghi ở phụ đề khác số dòng thật của các bảng thử: trang đầu in số việc
//     cũ là thứ người đọc tin ngay mà không ai đếm lại;
//   - ngày trong khung "Đợt này thay đổi gì (bản …)" khác ngày của bản: sửa
//     khung mà quên đổi ô ngày, hay ngược lại.
//
// Cột "Kết quả" của mỗi bảng thử thành ba ô tích bấm được trong Word (Đạt /
// Không đạt / Chưa thử). Giấy A4 nằm ngang, tiêu đề bảng lặp lại khi sang trang.
//
// Cần: thư viện `docx` (đã nằm trong devDependencies), chỉ khi dựng; `--kiem-tra`
// không cần thư viện nào ngoài Node.
'use strict';
const fs = require('fs');
const path = require('path');

let d; // thư viện docx, chỉ nạp khi thật sự dựng (xem dungWord)

const GOC = path.join(__dirname, '..');

const HUONG_DAN = {
  'day-du': {
    nguon: 'docs/HUONG-DAN-KIEM-THU.md',
    // Móc commit nhận ra bản chép mang tên khác (vd "HUONG-DAN-KIEM-THU (1).md", tệp
    // đã đổi tên) nhờ dòng tiêu đề này. Bài kiểm canh nó khớp tiêu đề trong tệp.
    tieuDe: 'Hướng dẫn kiểm thử app CASA Mầm non',
    tenTep: 'Huong-dan-kiem-thu-CASA-Mam-non',
    donVi: 'dòng thử',
    // Bảng Mật khẩu ở mục 1 có hai cột "Mật khẩu lần đầu", "Mật khẩu mới sau khi đổi".
    // Đếm ra số khác là bảng đã bị đổi trên bản chính: bộ chặn không còn biết soi đâu.
    soCotMatKhau: 2,
    // Mục "## …" thứ mấy trở đi thì bắt đầu trang mới (hai mục đầu ngắn, in liền).
    sangTrangTuMuc: 3,
  },
  ngan: {
    nguon: 'docs/HUONG-DAN-THU-NHANH.md',
    tieuDe: 'Hướng dẫn thử nhanh app CASA Mầm non',
    tenTep: 'Huong-dan-thu-nhanh-CASA-Mam-non',
    donVi: 'việc',
    soCotMatKhau: 0,
    sangTrangTuMuc: 2,
  },
};

// Chữ được phép nằm trong cột "Mật khẩu…" của tệp trong kho. Mọi chữ khác có thể
// là mật khẩu thật chép từ bản chính về.
const CHU_GIU_CHO_MAT_KHAU = ['', '*(như dòng đầu)*'];
// Mật khẩu do app sinh ra (scripts/ban-thu.js, scripts/create-admin.js, routes/accounts.js,
// routes/admin.js): 5–6 chữ trong bảng không có i, l, o rồi 3–4 chữ số từ 2 tới 9.
const KHUON_MAT_KHAU_MAY_SINH = /(?<![\p{L}\p{N}])[a-hj-km-np-z]{5,6}[2-9]{3,4}(?![\p{L}\p{N}])/u;

const THANG_ANH = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// "Oct 19, 2026" (bản xuất của claude.ai) hoặc "19/10/2026" → { ngay, thang, nam }.
function docNgay(s) {
  let n = null;
  let m = s.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/);
  if (m && THANG_ANH.includes(m[1].toLowerCase())) {
    n = { ngay: Number(m[2]), thang: THANG_ANH.indexOf(m[1].toLowerCase()) + 1, nam: Number(m[3]) };
  } else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    n = { ngay: Number(m[1]), thang: Number(m[2]), nam: Number(m[3]) };
  }
  return n && n.thang >= 1 && n.thang <= 12 && n.ngay >= 1 && n.ngay <= 31 ? n : null;
}
const vietNgay = (n) => `${String(n.ngay).padStart(2, '0')}/${String(n.thang).padStart(2, '0')}/${n.nam}`;
const cungNgay = (a, b) => a.ngay === b.ngay && a.thang === b.thang && a.nam === b.nam;

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

// Cột có tiêu đề bắt đầu bằng "Mật khẩu" (vd "Mật khẩu lần đầu") của mọi bảng: chỉ được
// trống hoặc chữ giữ chỗ. Cột như "Mất mật khẩu của" (cách cấp lại) không phải chỗ điền.
function oMatKhauCoChu(than) {
  const thay = [];
  let soCot = 0;
  for (let i = 0; i < than.length; i++) {
    if (!than[i].startsWith('|')) continue;
    const dau = o(than[i]);
    const cot = dau.map((h, c) => (/^mật khẩu/i.test(h) ? c : -1)).filter(c => c >= 0);
    soCot += cot.length;
    i += 2;
    while (i < than.length && than[i].startsWith('|')) {
      const r = o(than[i]);
      for (const c of cot) if (!CHU_GIU_CHO_MAT_KHAU.includes(r[c] || '')) thay.push(`${r[0]} / ${dau[c]}`);
      i++;
    }
  }
  return { thay, soCot };
}

const tachDong = (noiDung) => noiDung.split(/\r?\n/);
const sauDongCua = (dong) => (i) => { let k = i + 1; while (k < dong.length && !dong[k].trim()) k++; return k; };

// Chỉ những gì LỌT DỮ LIỆU nếu lên kho: mật khẩu, tên người. Móc commit chạy đúng
// phần này (lệch số việc ở phụ đề không làm lọt gì, để npm test bắt, không chặn
// commit). Ném lỗi tiếng Việt; trả về số cột "Mật khẩu…" đếm được.
// Chuỗi khớp khuôn mật khẩu do app sinh, ở bất cứ dòng nào. Chỉ báo số dòng, không in
// lại chuỗi: nhật ký của máy CI là chỗ ai cũng đọc được.
function soatKhuonMatKhau(noiDung) {
  const dongMkMay = tachDong(noiDung).map((l, i) => (KHUON_MAT_KHAU_MAY_SINH.test(l) ? i + 1 : 0)).filter(Boolean);
  if (dongMkMay.length) {
    throw new Error(`dòng ${dongMkMay.join(', ')} có chuỗi trông như mật khẩu do app sinh ra. Xoá đi: mật khẩu không lưu vào kho, không in lên giấy.`);
  }
}

function soatRoRi(noiDung, cauHinh) {
  const dong = tachDong(noiDung);

  // Soát cả tệp, kể cả khung ghi chú: mật khẩu nằm ở đâu cũng không được lên kho.
  soatKhuonMatKhau(noiDung);

  const iTieuDe = dong.findIndex(l => l.startsWith('# '));
  if (iTieuDe >= 0) {
    const dongNgay = (dong[sauDongCua(dong)(iTieuDe)] || '').trim();
    if (dongNgay.includes('@')) {
      throw new Error(`dòng ngày dưới tiêu đề còn tên người viết ("${dongNgay}"). Bỏ phần " · @…": tên người không lưu vào kho.`);
    }
    if (!docNgay(dongNgay) && docNgay(dongNgay.split(' · ')[0].trim())) {
      throw new Error(`dòng ngày dưới tiêu đề còn chữ khác ngoài ngày ("${dongNgay}"), có thể là tên người viết. Chỉ giữ ngày.`);
    }
  }

  const matKhau = oMatKhauCoChu(dong);
  if (matKhau.soCot !== cauHinh.soCotMatKhau) {
    throw new Error(`đếm được ${matKhau.soCot} cột “Mật khẩu…” trong các bảng, thường lệ là ${cauHinh.soCotMatKhau}. `
      + 'Bảng mật khẩu đã bị đổi tên cột hay tách đôi trên bản chính: soát bằng mắt cho chắc không có mật khẩu, '
      + 'rồi sửa soCotMatKhau trong scripts/xuat-huong-dan-thu.js.');
  }
  if (matKhau.thay.length) {
    throw new Error(`bảng mật khẩu có chữ ở: ${matKhau.thay.join('; ')}. Xoá sạch các ô đó: mật khẩu không lưu vào kho, không in lên giấy.`);
  }
  return matKhau.soCot;
}

// Trả về phần cần dựng, hoặc ném lỗi bằng tiếng Việt nói rõ phải sửa dòng nào.
function docHuongDan(noiDung, cauHinh) {
  const soCotMatKhau = soatRoRi(noiDung, cauHinh);
  const dong = tachDong(noiDung);
  const sauDong = sauDongCua(dong);

  const iTieuDe = dong.findIndex(l => l.startsWith('# '));
  if (iTieuDe < 0) throw new Error('không thấy dòng tiêu đề "# …".');
  const tieuDe = dong[iTieuDe].slice(2).trim();

  const iNgay = sauDong(iTieuDe);
  const dongNgay = (dong[iNgay] || '').trim();
  const ngayBan = docNgay(dongNgay);
  if (!ngayBan) {
    throw new Error(`dòng ngay dưới tiêu đề phải là ngày của bản và chỉ có ngày (ô ngày dưới tiêu đề trên claude.ai, vd "Oct 19, 2026"; bỏ mọi phần " · …" phía sau); đang là "${dongNgay}".`);
  }
  const ngay = vietNgay(ngayBan);

  const iPhuDe = sauDong(iNgay);
  const phuDeGoc = (dong[iPhuDe] || '').trim();
  if (!phuDeGoc || /^[>#|-]/.test(phuDeGoc)) {
    throw new Error('thiếu dòng phụ đề ngay dưới dòng ngày (vd "Bản ngắn · máy thử … · 41 việc").');
  }
  const than = dong.slice(iPhuDe + 1);

  const soDong = demDongThu(than);
  const mSo = phuDeGoc.match(new RegExp(`(\\d+)\\s+${cauHinh.donVi}`));
  if (!mSo) throw new Error(`phụ đề không ghi số ${cauHinh.donVi} (vd "${soDong} ${cauHinh.donVi}").`);
  if (Number(mSo[1]) !== soDong) {
    throw new Error(`phụ đề ghi ${mSo[1]} ${cauHinh.donVi} nhưng các bảng có ${soDong}. Sửa phụ đề trên bản chính rồi chép lại.`);
  }

  const kiemNgay = (s, noi) => {
    const n = docNgay(s);
    if (n && !cungNgay(n, ngayBan)) {
      throw new Error(`${noi} ghi ${s} nhưng ngày của bản (ô ngày dưới tiêu đề) là ${ngay}. Sửa cho khớp trên bản chính rồi chép lại.`);
    }
  };
  const mNgayPhuDe = phuDeGoc.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
  if (mNgayPhuDe) kiemNgay(mNgayPhuDe[0], 'phụ đề');
  const dongKhung = than.find(l => /^> \*\*Đợt này thay đổi gì/.test(l));
  const mNgayKhung = dongKhung && dongKhung.match(/\(bản (\d{1,2}\/\d{1,2}\/\d{4})/);
  if (mNgayKhung) kiemNgay(mNgayKhung[1], 'khung “Đợt này thay đổi gì”');

  // Phụ đề in lên file Word mang ngày của bản: "Bản ngắn · …" → "Bản ngắn 19/10/2026 · …".
  const doan = phuDeGoc.split(' · ');
  if (!mNgayPhuDe) doan[0] = `${doan[0]} ${ngay}`;
  const phuDe = doan.join(' · ');
  const dauTrang = `${tieuDe} · ${doan[0].charAt(0).toLowerCase()}${doan[0].slice(1)}`;
  return { tieuDe, ngay, phuDeGoc, phuDe, dauTrang, than, soDong, soCotMatKhau, sangTrangTuMuc: cauHinh.sangTrangTuMuc };
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
function vienO() {
  const vien = { style: d.BorderStyle.SINGLE, size: 4, color: VIEN };
  return { top: vien, bottom: vien, left: vien, right: vien };
}
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
      width: { size: w[c], type: d.WidthType.DXA }, borders: vienO(),
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
          width: { size: w[c], type: d.WidthType.DXA }, borders: vienO(),
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
  d = d || require('docx');
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

// Móc commit (--ban-sap-commit): đọc bản đã `git add`, KHÔNG đọc tệp trên đĩa. Tệp trên
// đĩa có thể đã sạch trong khi bản trong vùng chờ, tức bản sắp lên kho, vẫn còn mật
// khẩu. (`git commit -a` hay `git commit <tệp>` dùng vùng chờ tạm; git truyền nó xuống
// qua GIT_INDEX_FILE nên `git show :tệp` vẫn đọc đúng bản sắp commit.)
//
// Soát: hai hướng dẫn (nếu có trong vùng chờ), và mọi tệp .md thêm / sửa / đổi tên
// trong commit này. Tệp .md nào mang tiêu đề của một hướng dẫn (bản chép tên khác,
// tệp đã đổi tên) thì soát đủ như hướng dẫn; tệp .md khác thì soát khuôn mật khẩu.
function soatBanSapCommit() {
  const { execFileSync } = require('child_process');
  const git = (...a) => execFileSync('git', a, { cwd: GOC, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tep = new Set(git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z', '--', '*.md')
    .split('\0').filter(Boolean));
  for (const c of Object.values(HUONG_DAN)) if (git('ls-files', '--', c.nguon).trim()) tep.add(c.nguon);

  for (const f of tep) {
    const noiDung = git('show', `:${f}`);
    const tieuDe = (tachDong(noiDung).find(l => l.startsWith('# ')) || '').slice(2).trim();
    const cauHinh = Object.values(HUONG_DAN).find(c => c.nguon === f || c.tieuDe === tieuDe);
    try {
      if (cauHinh) soatRoRi(noiDung, cauHinh); else soatKhuonMatKhau(noiDung);
    } catch (e) {
      throw new Error(`${f} (bản đã git add): ${e.message}`);
    }
  }
  return tep.size;
}

function tenTepWord(cauHinh, phan) {
  return `${cauHinh.tenTep}-${phan.ngay.replace(/\//g, '-')}.docx`;
}

// ---- Dòng lệnh --------------------------------------------------------------
async function main(argv) {
  const lay = (ten) => { const i = argv.indexOf(ten); return i < 0 ? undefined : argv[i + 1]; };
  const chi = lay('--chi');
  if (chi !== undefined && !HUONG_DAN[chi]) {
    throw new Error(`"--chi ${chi}" không có. Chọn một trong: ${Object.keys(HUONG_DAN).join(', ')}.`);
  }
  const chiSoat = argv.includes('--kiem-tra');
  if (argv.includes('--ban-sap-commit')) {
    if (soatBanSapCommit()) console.log('✓ Hướng dẫn thử và các tệp .md trong commit này không có mật khẩu hay tên người.');
    return;
  }
  const thuMucRa = path.resolve(lay('--ra') || path.join(GOC, 'ban-word'));
  if (!chiSoat) fs.mkdirSync(thuMucRa, { recursive: true });

  for (const khoa of chi ? [chi] : Object.keys(HUONG_DAN)) {
    const cauHinh = HUONG_DAN[khoa];
    let phan;
    try {
      phan = docHuongDan(fs.readFileSync(path.join(GOC, cauHinh.nguon), 'utf8'), cauHinh);
    } catch (e) {
      throw new Error(`${cauHinh.nguon}: ${e.message}`);
    }
    if (chiSoat) {
      const mk = phan.soCotMatKhau ? 'bảng mật khẩu trống' : 'không có bảng mật khẩu';
      console.log(`✓ ${cauHinh.nguon}: bản ${phan.ngay}, ${phan.soDong} ${cauHinh.donVi}, ${mk}, không có tên người, không có chuỗi giống mật khẩu.`);
      continue;
    }
    const ra = path.join(thuMucRa, tenTepWord(cauHinh, phan));
    fs.writeFileSync(ra, await dungWord(phan));
    console.log(`Đã dựng ${ra} (bản ${phan.ngay}, ${phan.soDong} ${cauHinh.donVi}).`);
  }
}

module.exports = { HUONG_DAN, docHuongDan, soatRoRi, soatKhuonMatKhau, dungWord, tenTepWord, demDongThu, docNgay };

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    if (process.argv.includes('--ban-sap-commit')) {
      console.error(`\n✗ CHẶN COMMIT. ${e.message}\n  Sửa tệp, chạy lại "git add" tệp đó, rồi commit lại. `
        + 'Mật khẩu hay tên người đã lên kho thì xoá sau cũng không thu lại được.\n');
    } else {
      const viec = process.argv.includes('--kiem-tra') ? 'Hướng dẫn thử chưa đạt' : 'Không dựng được file Word';
      console.error(`${viec}: ${e.message}`);
    }
    process.exit(1);
  });
}
