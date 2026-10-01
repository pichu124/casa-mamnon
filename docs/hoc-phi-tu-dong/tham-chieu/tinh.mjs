#!/usr/bin/env node
// Bản tham chiếu ĐỘC LẬP (JavaScript) của DAC-TA.md — BẢN 3.1.
// Viết theo đặc tả, từng mục một. Không phụ thuộc thư viện ngoài.
//
// Bản 3.1 (sửa 1.2, dấu cách đầu/cuối): mã TỰ KHAI (be.ma, bieu_phi.ma, quyet_dinh.ma,
//   danh_muc.ma) có dấu cách U+0020 ở đầu hoặc cuối là KHÔNG hợp lệ, hệt mã dạng số / toàn dấu
//   cách (bé đó bị chặn; dòng biểu phí/QĐ/danh mục đó là dòng lỗi). Dấu cách ở giữa vẫn hợp lệ;
//   tab, NBSP không phải "dấu cách". Chỗ THAM CHIẾU (goi, ma_qd, goi_moi, ma_uu_dai, ma_be) không
//   xét quy tắc này — chỉ là không khớp. Phát hiện trùng mã KHÔNG đổi ("BE01" ≠ "BE01 ").
//
// Bản 3.1 (sửa 1.2): ngày hợp lệ nay từ 01/01/2000 tới 31/12/2100 (trước là từ 1900) —
//   trước 01/03/1900 Excel và LibreOffice đánh số ngày khác nhau. Mọi ô ngày đều qua parseDate.
//   Mặc định nội bộ KHÔNG đổi: tu trống = 01/01/1900, den trống = 31/12/9999 (6.3).
//
// Bản 3.1 so với bản 3:
//   - 7.2 cùng mã cùng tháng: diem = −tu nếu tu ≤ đầu(m), ngược lại +tu; giữ diem NHỎ nhất,
//     bằng nhau giữ dòng nhập sau (dòng hiệu lực ngày đầu tháng mới nhất thắng; không dòng nào
//     hiệu lực ngày đầu tháng thì dòng bắt đầu sớm nhất thắng);
//   - 6.1 ap_cho_chu_ky nhận viết tắt của 3.1 (1T, 3T, "3 tháng", 6T, 12T), đổi về tên chuẩn;
//   - 10: bỏ lưu ý "6T/12T chưa ghi đã đóng đến"; định nghĩa lưu ý gia hạn mốc 1:
//     den < cuối(EDATE(THANG_MOC2, −1)).
//
// Bản 3 so với bản 2 (xem đầu DAC-TA.md):
//   - da_dong_den trống = bé chưa đóng tháng nào → N tính từ tháng nhập học (G22);
//   - cùng mã ưu đãi cùng tháng: giữ dòng có tu NHỎ nhất (mức cũ thắng trong tháng đổi mức, G18)
//     — bản 3.1 thay bằng quy tắc diem ở trên;
//   - chỉ tính các tháng của kỳ (Lk ≤ 15), "thang" có đúng Lk phần tử; cửa sổ ưu đãi = [N, E];
//   - đổi gói từ một tháng (goi_moi + doi_goi_tu);
//   - chu kỳ nhận viết tắt 1T/3T/"3 tháng"/6T/12T; chu kỳ gõ sai là LỖI;
//   - ngày hợp lệ 1900-01-01..2100-12-31; mã toàn dấu cách không hợp lệ;
//   - so_thang_moc1 từ 1 tới 120; dòng thiếu mã ở biểu phí/QĐ/danh mục có LƯU Ý TOÀN CỤC.
//
// Dùng:   node tinh.mjs kich-ban.json      → in JSON kết quả ra stdout,
//                                            lỗi/lưu ý toàn cục ra stderr.
// Dùng như thư viện:  import { tinh } from './tinh.mjs'

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────── 1.2 So chữ và kiểu dữ liệu ─────────────────────────

/** "Trống" = null, thiếu khoá, hoặc chuỗi rỗng "". */
export const isBlank = (v) => v === null || v === undefined || v === '';

/** Số = số thật (JSON number). Chữ trông như số là KHÔNG hợp lệ; true/false không phải số. */
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => isNum(v) && Number.isInteger(v);
const isFrac = (v) => isNum(v) && v >= 0 && v <= 1;

/** Khoá so mã không phân biệt hoa/thường; không bỏ khoảng trắng; * ? ~ là ký tự thường. */
export function codeKey(v) {
  if (typeof v === 'string') return v.toLowerCase();
  if (typeof v === 'number') return String(v).toLowerCase();
  return JSON.stringify(v).toLowerCase();
}

/** Bỏ dấu cách (CHỈ U+0020, như TRIM của Excel) ở hai đầu. */
const trimSpaces = (s) => s.replace(/^ +| +$/g, '');

/**
 * Phần "dạng số / toàn dấu cách" của quy tắc mã (mục 1.2): là chuỗi; bỏ dấu cách hai đầu thì
 * KHÔNG rỗng và KHÔNG chỉ gồm chữ số 0–9. JSON number → không hợp lệ; bool/object cũng vậy.
 * Dùng cho chỗ THAM CHIẾU `ma_uu_dai` của dòng gán (mục 10: "mã ưu đãi dạng số") — quy tắc
 * dấu cách đầu/cuối KHÔNG xét ở chỗ tham chiếu (mã thừa dấu cách đơn giản là không khớp).
 */
function isValidRefCode(v) {
  if (typeof v !== 'string') return false;
  const t = trimSpaces(v);
  if (t === '') return false;
  return !/^[0-9]+$/.test(t);
}

/**
 * Mã TỰ KHAI hợp lệ (mục 1.2, bản 3.1 + dấu cách đầu/cuối) — áp cho be.ma, bieu_phi.ma,
 * quyet_dinh.ma, danh_muc.ma: phần dạng số / toàn dấu cách ở trên, VÀ không có dấu cách
 * U+0020 ở ĐẦU hay ở CUỐI ("MAM ", " BE01" không hợp lệ; "MAM 2" hợp lệ; tab, NBSP không
 * phải "dấu cách" → "MAM\t", "MAM " vẫn hợp lệ).
 * (Chuỗi rỗng "" là "trống" — nơi gọi xét trống TRƯỚC.)
 */
export function isValidCode(v) {
  if (!isValidRefCode(v)) return false;
  return trimSpaces(v) === v;
}
/** Lý do mã không hợp lệ, để ghi vào lỗi (thứ tự: toàn dấu cách → dạng số → dấu cách đầu/cuối). */
const whyCode = (v) => {
  if (typeof v !== 'string') return 'mã dạng số';
  const t = trimSpaces(v);
  if (t === '') return 'mã chỉ gồm dấu cách';
  if (/^[0-9]+$/.test(t)) return 'mã dạng số';
  return 'mã có dấu cách ở đầu/cuối';
};

/** Giá trị chọn: so không phân biệt hoa/thường, trả về cách viết chuẩn hoặc null. */
function matchEnum(v, opts) {
  if (typeof v !== 'string') return null;
  const l = v.toLowerCase();
  for (const o of opts) if (o.toLowerCase() === l) return o;
  return null;
}

// ───────────────────────── Ngày & tháng ─────────────────────────
// Tháng biểu diễn bằng chỉ số mi = năm*12 + (tháng-1). Ngày biểu diễn bằng số
// yyyymmdd (so sánh được bằng < >).

const daysIn = (y, m) =>
  [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

const YEAR_MIN = 2000; // bản 3.1: từ 01/01/2000 (trước là 1900)
const YEAR_MAX = 2100;

/** Ngày hợp lệ (mục 1.2): chuỗi "YYYY-MM-DD", ngày có thật, từ 01/01/2000 tới 31/12/2100. */
export function parseDate(v) {
  if (typeof v !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < YEAR_MIN || y > YEAR_MAX || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
  return { serial: y * 10000 + mo * 100 + d, mi: y * 12 + mo - 1 };
}
const yOf = (mi) => Math.floor(mi / 12);
const monthOf = (mi) => (mi % 12) + 1;
const firstOf = (mi) => yOf(mi) * 10000 + monthOf(mi) * 100 + 1; // đầu(m)
const lastOf = (mi) => yOf(mi) * 10000 + monthOf(mi) * 100 + daysIn(yOf(mi), monthOf(mi)); // cuối(m)
export const fmtMonth = (mi) => `${String(yOf(mi)).padStart(4, '0')}-${String(monthOf(mi)).padStart(2, '0')}`;
// Mặc định của dòng gán (mục 6.3) — hằng nội bộ, không phải ô nhập.
const DAY_MIN = 19000101; // tu trống  = 01/01/1900 (sớm hơn mọi ngày nhập được — ngày nhập từ 01/01/2000)
const DAY_MAX = 99991231; // den trống = 31/12/9999

// ───────────────────────── ROUND / ROUNDDOWN kiểu Excel ─────────────────────────
// Excel: lấy biểu diễn thập phân 15 chữ số có nghĩa của số double, rồi làm tròn
// nửa RA XA số 0 (ROUND) hoặc cắt về phía 0 (ROUNDDOWN). Làm bằng số học thập phân
// chính xác (BigInt) để không dính nhiễu nhị phân lần hai.

function decompose15(x) {
  const s = Math.abs(x).toPrecision(15);
  const [mant, e] = s.split('e');
  const [ip, fp = ''] = mant.split('.');
  return { M: BigInt(ip + fp), exp: (e ? parseInt(e, 10) : 0) - fp.length }; // |x| ≈ M × 10^exp
}

export function excelRound(x, d = 0, down = false) {
  if (!Number.isFinite(x) || x === 0) return x;
  const { M, exp } = decompose15(x);
  const shift = exp + d;
  let R;
  if (shift >= 0) R = M * 10n ** BigInt(shift);
  else {
    const div = 10n ** BigInt(-shift);
    R = M / div;
    if (!down && (M % div) * 2n >= div) R += 1n;
  }
  const v = Number(`${R}e${-d}`);
  return x < 0 ? (v === 0 ? 0 : -v) : v;
}
export const excelRoundDown = (x, d = 0) => excelRound(x, d, true);

// ───────────────────────── Hằng số giá trị chọn ─────────────────────────

// 3.1 Cách viết chu kỳ được nhận (không phân biệt hoa/thường) → chu kỳ chuẩn.
const CHU_KY_ALIAS = new Map([
  ['1 tháng', '1 tháng'], ['1t', '1 tháng'],
  ['quý', 'Quý'], ['3 tháng', 'Quý'], ['3t', 'Quý'],
  ['6 tháng', '6 tháng'], ['6t', '6 tháng'],
  ['12 tháng', '12 tháng'], ['12t', '12 tháng'],
]);
/** Chu kỳ nhập → chu kỳ chuẩn, hoặc null nếu không hợp lệ. */
export function parseChuKy(v) {
  if (typeof v !== 'string') return null;
  return CHU_KY_ALIAS.get(v.toLowerCase()) ?? null;
}
const L_OF = { '1 tháng': 1, 'Quý': 3, '6 tháng': 6, '12 tháng': 12 };
const HL_OPTS = ['Trùng ít nhất 1 ngày', 'Phủ trọn cả tháng'];
const CHON_OPTS = ['% lớn nhất trước', 'Theo thứ tự nhập'];
const CACH_OPTS = ['Làm tròn thường', 'Làm tròn xuống'];
const LOAI_OPTS = ['Chung', 'Theo chu kỳ', 'Bổ sung'];
const MOC_OPTS = ['Cả hai', 'Mốc 1', 'Mốc 2'];
// 6.1 (bản 3.1): ap_cho_chu_ky = "Mọi chu kỳ" hoặc một cách viết chu kỳ của 3.1 (tên chuẩn hay
// viết tắt, không phân biệt hoa/thường, không bỏ dấu cách) → đổi về tên chuẩn.
const MOI_CHU_KY = 'Mọi chu kỳ';
export function parseApChoChuKy(v) {
  if (typeof v !== 'string') return null;
  if (v.toLowerCase() === MOI_CHU_KY.toLowerCase()) return MOI_CHU_KY;
  return parseChuKy(v);
}
const SLOT_THUONG = 6;
const SLOT_RIENG = 2;
const LK_MAX = 15; // sức chứa của file (3.3, 3.4, mục 10)
const MOC1_MAX = 120; // so_thang_moc1 tối đa (mục 5)

// ───────────────────────── Tính ─────────────────────────

/**
 * @param {object} sc kịch bản JSON (định dạng cuối DAC-TA.md)
 * @returns {{ ket_qua: object, luu_y_toan_cuc: string[], loi_toan_cuc: string[] }}
 */
export function tinh(sc) {
  const asObj = (r) => (r && typeof r === 'object' && !Array.isArray(r) ? r : {});
  const S = asObj(sc);
  const list = (k) => (Array.isArray(S[k]) ? S[k].map(asObj) : []);
  const cfg = asObj(S.cau_hinh);
  const gErr = [];
  const gNote = [];
  // Dòng có số liệu (ô nào đó ngoài `ma` không trống) mà mã trống → bỏ qua + LƯU Ý TOÀN CỤC (6.1).
  const hasDataBesidesCode = (r) => Object.entries(r).some(([k, v]) => k !== 'ma' && !isBlank(v));
  const blankCodeRow = (r, sheet, i) => {
    if (hasDataBesidesCode(r)) gNote.push(`${sheet} dòng ${i + 1}: dòng có số liệu nhưng thiếu mã — đang bị bỏ qua`);
  };

  // ── Mục 2. Cấu hình ──
  let THANG_THU = null;
  if (isBlank(cfg.thang_ky)) gErr.push('Cấu hình: chưa nhập tháng thu (thang_ky)');
  else {
    const d = parseDate(cfg.thang_ky);
    if (d) THANG_THU = d.mi;
    else gErr.push('Cấu hình: tháng thu (thang_ky) không phải ngày hợp lệ');
  }
  const pick = (v, opts, name) => {
    if (isBlank(v)) return opts[0];
    const m = matchEnum(v, opts);
    if (m) return m;
    gErr.push(`Cấu hình: ${name} không hợp lệ`);
    return opts[0];
  };
  const HL = pick(cfg.che_do_hieu_luc, HL_OPTS, 'chế độ hiệu lực');
  const CHON = pick(cfg.che_do_chon, CHON_OPTS, 'chế độ chọn ưu đãi');
  const CACH = pick(cfg.cach_lam_tron, CACH_OPTS, 'cách làm tròn');
  let DV = 1000;
  if (!isBlank(cfg.don_vi_lam_tron)) {
    if (isNum(cfg.don_vi_lam_tron) && cfg.don_vi_lam_tron >= 1) DV = cfg.don_vi_lam_tron;
    else gErr.push('Cấu hình: đơn vị làm tròn phải là số ≥ 1');
  }

  // ── Mục 4. Biểu phí có phiên bản ──
  const fee = new Map(); // codeKey → { rows: [{i,start,fee}], bad: [] }
  list('bieu_phi').forEach((r, i) => {
    if (isBlank(r.ma)) { blankCodeRow(r, 'Biểu phí', i); return; }
    const k = codeKey(r.ma);
    if (!fee.has(k)) fee.set(k, { rows: [], bad: [] });
    const e = fee.get(k);
    const why = [];
    if (!isValidCode(r.ma)) why.push(whyCode(r.ma));
    if (isBlank(r.hoc_phi_thang)) why.push('thiếu học phí tháng');
    else if (!isNum(r.hoc_phi_thang) || r.hoc_phi_thang < 0) why.push('học phí tháng không phải số ≥ 0');
    let start = -Infinity; // trống = "từ trước tới nay"
    if (!isBlank(r.ap_dung_tu)) {
      const d = parseDate(r.ap_dung_tu);
      if (d) start = d.mi;
      else { why.push('"áp dụng từ" không phải ngày hợp lệ'); start = null; }
    }
    e.rows.push({ i, start, fee: r.hoc_phi_thang });
    if (why.length) e.bad.push(`dòng biểu phí ${i + 1}: ${why.join(', ')}`);
  });
  for (const e of fee.values()) {
    const cnt = new Map();
    for (const row of e.rows) if (row.start !== null) cnt.set(row.start, (cnt.get(row.start) || 0) + 1);
    for (const [s, c] of cnt) {
      if (c > 1) e.bad.push(`${c} dòng cùng gói cùng tháng bắt đầu ${s === -Infinity ? '(trống)' : fmtMonth(s)}`);
    }
  }

  // ── Mục 5. Quyết định tuyển sinh ──
  const qd = new Map(); // codeKey → [{ r, why }]
  list('quyet_dinh').forEach((r, i) => {
    if (isBlank(r.ma)) { blankCodeRow(r, 'Quyết định', i); return; }
    const why = [];
    if (!isValidCode(r.ma)) why.push(whyCode(r.ma));
    if (!(isInt(r.so_thang_moc1) && r.so_thang_moc1 >= 1 && r.so_thang_moc1 <= MOC1_MAX)) {
      why.push(`số tháng mốc 1 phải là số nguyên từ 1 tới ${MOC1_MAX}`);
    }
    for (const f of ['so_luong_moc1', 'so_luong_moc2']) {
      if (!(isInt(r[f]) && r[f] >= 0)) why.push(`${f} phải là số nguyên ≥ 0`);
    }
    for (const f of ['tran_moc1', 'tran_moc2']) if (!isFrac(r[f])) why.push(`${f} phải là số từ 0 tới 1`);
    const k = codeKey(r.ma);
    if (!qd.has(k)) qd.set(k, []);
    qd.get(k).push({ r, i, why });
  });

  // ── Mục 6.1. Danh mục ưu đãi ──
  const cat = new Map(); // codeKey → [{ loai, moc, apck, p, tran, why }]
  list('danh_muc').forEach((r, i) => {
    if (isBlank(r.ma)) { blankCodeRow(r, 'Danh mục ưu đãi', i); return; }
    const why = [];
    if (!isValidCode(r.ma)) why.push(whyCode(r.ma));
    const en = (v, parse, def, name) => {
      if (isBlank(v)) return def;
      const m = parse(v);
      if (!m) why.push(`${name} không hợp lệ`);
      return m;
    };
    const loai = en(r.loai, (v) => matchEnum(v, LOAI_OPTS), 'Chung', 'loại');
    const moc = en(r.ap_cho_moc, (v) => matchEnum(v, MOC_OPTS), 'Cả hai', 'áp cho mốc');
    const apck = en(r.ap_cho_chu_ky, parseApChoChuKy, MOI_CHU_KY, 'áp cho chu kỳ');
    if (!isBlank(r.phan_tram) && !isFrac(r.phan_tram)) why.push('% không phải số từ 0 tới 1');
    // tran_rieng sai (không phải số trong [0,1]) là LỖI bất kể loại; hợp lệ mà loại không
    // phải Bổ sung thì bị bỏ qua, chỉ LƯU Ý (mục 6.1).
    if (!isBlank(r.tran_rieng) && !isFrac(r.tran_rieng)) why.push('trần riêng không phải số từ 0 tới 1');
    else if (!isBlank(r.tran_rieng) && loai && loai !== 'Bổ sung') {
      gNote.push(`Danh mục dòng ${i + 1} (${r.ma}): trần riêng chỉ có nghĩa với loại Bổ sung — bị bỏ qua`);
    }
    const k = codeKey(r.ma);
    if (!cat.has(k)) cat.set(k, []);
    cat.get(k).push({
      ma: r.ma, loai, moc, apck,
      p: isBlank(r.phan_tram) ? null : r.phan_tram,
      tran: isBlank(r.tran_rieng) ? null : r.tran_rieng,
      why,
    });
  });

  // ── Mục 3. Bé ──
  const beList = list('be');
  const beCount = new Map();
  for (const b of beList) {
    if (isBlank(b.ma)) continue;
    const k = codeKey(b.ma);
    beCount.set(k, (beCount.get(k) || 0) + 1);
  }

  // ── Mục 6.2. Dòng gán → bé ──
  const udByChild = new Map(); // codeKey(bé) → [{ r, i }]
  list('uu_dai').forEach((r, i) => {
    if (isBlank(r.ma_be) && isBlank(r.ma_uu_dai)) return;
    if (isBlank(r.ma_be)) { gNote.push(`Dòng ưu đãi ${i + 1}: thiếu mã bé`); return; }
    const k = codeKey(r.ma_be);
    if (!beCount.has(k)) { gNote.push(`Dòng ưu đãi ${i + 1}: mã bé "${r.ma_be}" không khớp bé nào`); return; }
    if (!udByChild.has(k)) udByChild.set(k, []);
    udByChild.get(k).push({ r, i });
  });

  const ketQua = Object.create(null);
  beList.forEach((b, bi) => {
    if (isBlank(b.ma)) {
      if (Object.values(b).some((v) => !isBlank(v))) gNote.push(`Dòng bé ${bi + 1} có dữ liệu mà mã trống — không tính`);
      return;
    }
    const outKey = typeof b.ma === 'string' ? b.ma : typeof b.ma === 'number' ? String(b.ma) : JSON.stringify(b.ma);
    ketQua[outKey] = tinhMotBe(b);
  });

  function tinhMotBe(b) {
    const loi = [...gErr];
    const luu = [];
    const note = (s) => { if (!luu.includes(s)) luu.push(s); };
    const k = codeKey(b.ma);

    if (!isValidCode(b.ma)) {
      // Giữ nguyên câu cũ cho mã dạng số / toàn dấu cách (kết quả cũ không đổi một chữ).
      loi.push(isValidRefCode(b.ma)
        ? `Mã bé không hợp lệ (${whyCode(b.ma)} — hãy xoá dấu cách thừa)`
        : `Mã bé không hợp lệ (${whyCode(b.ma)} — mã không được là một con số hay chỉ gồm dấu cách)`);
    }
    if (beCount.get(k) > 1) loi.push('Mã bé bị trùng với bé khác (không phân biệt hoa/thường)');

    // 3.1 Chu kỳ áp dụng — gõ sai là LỖI (không đoán)
    let CK = null;
    if (isBlank(b.chu_ky)) { CK = 'Quý'; note('Chưa chọn chu kỳ — đang dùng mặc định Quý'); }
    else {
      const m = parseChuKy(b.chu_ky);
      if (!m) loi.push(`Chu kỳ "${b.chu_ky}" không hợp lệ (nhận: 1 tháng/1T, Quý/3 tháng/3T, 6 tháng/6T, 12 tháng/12T)`);
      else if (m === '1 tháng' && !matchEnum(b.con_gv, ['Có'])) {
        CK = 'Quý'; note('1 tháng chỉ dành cho con/em giáo viên — đang tính theo Quý');
      } else CK = m;
    }
    const L = CK ? L_OF[CK] : null;

    // Ngày của bé
    let NH = null;
    if (isBlank(b.ngay_nhap_hoc)) loi.push('Chưa nhập ngày nhập học');
    else { NH = parseDate(b.ngay_nhap_hoc); if (!NH) loi.push('Ngày nhập học không phải ngày hợp lệ'); }
    const optDate = (v, name) => { // undefined = trống; null = sai
      if (isBlank(v)) return undefined;
      const d = parseDate(v);
      if (!d) { loi.push(`${name} không phải ngày hợp lệ`); return null; }
      return d;
    };
    const TM2 = optDate(b.thang_moc2, 'Tháng mốc 2');
    const DDD = optDate(b.da_dong_den, 'Đã đóng hết tháng');
    const NGHI = optDate(b.ngay_nghi, 'Ngày nghỉ');

    // Mục 4. Gói học phí (+ đổi gói từ một tháng)
    const feeOf = (code, label) => {
      const e = fee.get(codeKey(code));
      if (!e) { loi.push(`${label} "${code}" không có trong biểu phí`); return null; }
      if (e.bad.length) { loi.push(`${label} "${code}" có dòng biểu phí lỗi: ${e.bad.join('; ')}`); return null; }
      return e;
    };
    let PK = null;
    if (isBlank(b.goi)) loi.push('Chưa chọn gói học phí');
    else PK = feeOf(b.goi, 'Gói');
    const hasMoi = !isBlank(b.goi_moi);
    const hasDoi = !isBlank(b.doi_goi_tu);
    if (hasMoi !== hasDoi) {
      loi.push(hasMoi ? 'Đổi gói: có gói mới nhưng chưa ghi đổi gói từ tháng nào'
        : 'Đổi gói: có tháng đổi gói nhưng chưa ghi gói mới');
    }
    let DOI = undefined; // tháng đổi gói (đã hợp lệ)
    if (hasDoi) {
      const d = parseDate(b.doi_goi_tu);
      if (d) DOI = d; else { DOI = null; loi.push('Tháng đổi gói (doi_goi_tu) không phải ngày hợp lệ'); }
    }
    let PK2 = null;
    if (hasMoi) PK2 = feeOf(b.goi_moi, 'Gói mới');
    const doiGoi = hasMoi && hasDoi; // bé đã khai đổi gói

    // Quyết định tuyển sinh
    let Q = null;
    if (isBlank(b.ma_qd)) loi.push('Chưa nhập mã QĐ');
    else {
      const qs = qd.get(codeKey(b.ma_qd));
      if (!qs) loi.push(`QĐ "${b.ma_qd}" không có`);
      else if (qs.length > 1) loi.push(`Mã QĐ "${b.ma_qd}" bị trùng`);
      else if (qs[0].why.length) loi.push(`Dòng QĐ "${b.ma_qd}" lỗi: ${qs[0].why.join(', ')}`);
      else Q = qs[0].r;
    }
    if (!isBlank(b.so_luong_moc2) && !(isInt(b.so_luong_moc2) && b.so_luong_moc2 >= 0)) {
      loi.push('Số lượng mốc 2 riêng của bé phải là số nguyên ≥ 0');
    }
    if (!isBlank(b.tran_moc2) && !isFrac(b.tran_moc2)) loi.push('Trần mốc 2 riêng của bé phải là số từ 0 tới 1');

    // 3.2 N — (G22: da_dong_den trống = bé chưa đóng tháng nào → goc = tháng nhập học)
    let N = null, E = null, E1 = null, denKy = null, Lk = 0;
    if (NH && DDD !== null) {
      const goc = DDD ? DDD.mi + 1 : NH.mi;
      N = Math.max(goc, NH.mi); // không bao giờ thu trước tháng nhập học
    }
    // 3.3 E1 (kỳ đầu) → E0 (gộp nợ, G21) → E (cắt theo ngày nghỉ)
    if (N !== null && CK) {
      const pos = (monthOf(N) - 1) % 3; // 0 = tháng đầu quý
      const kyLe = CK !== '1 tháng' && pos !== 0;
      if (CK === '1 tháng') E1 = N;
      else if (!kyLe) E1 = N + L - 1; // EDATE(N, L − 1)
      else E1 = N + (2 - pos); // tháng cuối của quý chứa N
      // [G21] N ≤ THANG_THU và THANG_THU > E1: gộp các kỳ nối tiếp (mỗi kỳ L tháng) tới hết kỳ
      // chứa THANG_THU. k = THANG_THU − E1 (hiệu số tháng).
      let E0 = E1;
      const gop = THANG_THU !== null && N <= THANG_THU && THANG_THU > E1;
      if (gop) {
        const kk = THANG_THU - E1;
        E0 = E1 + L * Math.ceil(kk / L); // EDATE(E1, L × ROUNDUP(k / L))
      }
      E = NGHI ? Math.min(E0, NGHI.mi) : E0;
      if (kyLe && E >= N) note(`Kỳ lẻ: bắt đầu giữa quý, kỳ đầu từ ${fmtMonth(N)} tới hết quý ${fmtMonth(E1)}`);
      if (THANG_THU !== null) {
        denKy = N <= THANG_THU && N <= E;
        if (E < N) {
          note('Đã nghỉ học (nghỉ trước khi kỳ bắt đầu) — không thu');
          if (DDD && NGHI && DDD.mi > NGHI.mi) note('Đã đóng dư sau tháng nghỉ học — kiểm tra hoàn tiền (file không tính)');
        } else if (N > THANG_THU) {
          note(NH.mi > THANG_THU ? 'Chưa nhập học' : 'Chưa đến kỳ');
        } else if (N < THANG_THU) {
          note(gop && E > E1 // ngày nghỉ cắt về trong kỳ đầu thì thực tế không gộp gì
            ? `Còn nợ từ tháng ${fmtMonth(N)} — đợt này thu gộp các tháng nợ với kỳ đang tới hạn, tới ${fmtMonth(E)}`
            : `Còn nợ từ tháng ${fmtMonth(N)}`);
        }
        // G22: ô trống và N < THANG_THU
        if (DDD === undefined && N < THANG_THU) {
          note('Chưa ghi "Đã đóng hết tháng" — đang tính như bé chưa đóng tháng nào từ tháng nhập học');
        }
        // da_dong_den ≥ EDATE(THANG_THU, L): xa hơn một kỳ — có thể gõ nhầm năm
        if (DDD && DDD.mi >= THANG_THU + L) {
          note('"Đã đóng hết tháng" xa hơn một kỳ so với tháng thu — kiểm tra có gõ nhầm năm không');
        }
      }
      Lk = denKy ? E - N + 1 : 0;
      // Mục 10 / G21: kỳ cần thu dài hơn 15 tháng (sức chứa của file) → LỖI. Xét Lk (sau khi cắt theo ngày nghỉ).
      if (denKy && Lk > LK_MAX) {
        loi.push(`Kỳ cần thu ${Lk} tháng (${fmtMonth(N)}–${fmtMonth(E)}), dài hơn ${LK_MAX} tháng (sức chứa của file) — lập phiếu tay`
          + (DDD === undefined ? '; ô "Đã đóng hết tháng" đang trống — nếu bé đã đóng, hãy ghi tháng đã đóng hết vào ô này' : ''));
      }
      // (Bản 3.1 bỏ lưu ý riêng "6T/12T chưa ghi đã đóng đến" — lưu ý G22 ở trên đã phủ.)
      // G19: kỳ ≥ 2 tháng, chứa một tháng 9 không phải tháng đầu kỳ, bé chưa khai đổi gói
      if (denKy && Lk >= 2 && !doiGoi) {
        for (let mi = N + 1; mi <= E; mi++) {
          if (monthOf(mi) === 9) { note('Kỳ vắt qua tháng 9 — bé có thể lên nhóm tuổi giữa kỳ; chưa khai đổi gói (goi_moi + doi_goi_tu)'); break; }
        }
      }
    }

    // 6.2–6.3 Dòng gán của bé (xét MỌI dòng, kể cả ngoài cửa sổ)
    const valid = [];
    for (const { r, i } of udByChild.get(k) || []) {
      const tag = `Dòng ưu đãi ${i + 1}`;
      if (isBlank(r.ma_uu_dai)) { loi.push(`${tag}: thiếu mã ưu đãi`); continue; }
      // Chỗ THAM CHIẾU: chỉ xét dạng số / toàn dấu cách; "ACE " mà danh mục chỉ có "ACE" → không khớp (dưới).
      if (!isValidRefCode(r.ma_uu_dai)) { loi.push(`${tag}: mã ưu đãi không hợp lệ (${whyCode(r.ma_uu_dai)})`); continue; }
      const cs = cat.get(codeKey(r.ma_uu_dai));
      if (!cs) { loi.push(`${tag}: mã "${r.ma_uu_dai}" không có trong danh mục`); continue; }
      if (cs.length > 1) { loi.push(`${tag}: mã "${r.ma_uu_dai}" bị trùng trong danh mục`); continue; }
      const c = cs[0];
      if (c.why.length) { loi.push(`${tag}: mục danh mục "${r.ma_uu_dai}" lỗi (${c.why.join(', ')})`); continue; }
      const why = [];
      let p = null;
      if (!isBlank(r.phan_tram)) { if (isFrac(r.phan_tram)) p = r.phan_tram; else why.push('% không phải số từ 0 tới 1'); }
      else if (c.p !== null) p = c.p;
      else why.push('không có % (dòng gán và danh mục đều trống)');
      let tu = DAY_MIN, den = DAY_MAX;
      if (!isBlank(r.tu_ngay)) { const d = parseDate(r.tu_ngay); if (d) tu = d.serial; else { why.push('"từ ngày" không phải ngày hợp lệ'); tu = null; } }
      if (!isBlank(r.den_ngay)) { const d = parseDate(r.den_ngay); if (d) den = d.serial; else { why.push('"đến ngày" không phải ngày hợp lệ'); den = null; } }
      if (tu !== null && den !== null && tu > den) why.push('"từ ngày" sau "đến ngày"');
      if (!isBlank(r.tran_rieng) && !isFrac(r.tran_rieng)) why.push('trần riêng không phải số từ 0 tới 1');
      if (why.length) { loi.push(`${tag}: ${why.join(', ')}`); continue; }
      const rieng = c.loai === 'Bổ sung';
      if (!rieng && !isBlank(r.tran_rieng)) {
        note(`${tag} (${r.ma_uu_dai}): trần riêng chỉ có nghĩa với loại Bổ sung — bị bỏ qua`);
      }
      valid.push({
        i, code: r.ma_uu_dai, ck: codeKey(r.ma_uu_dai), p, tu, den, rieng,
        tran: rieng ? (!isBlank(r.tran_rieng) ? r.tran_rieng : c.tran !== null ? c.tran : 1) : null,
        moc: c.moc, apck: c.apck,
      });
    }

    // 3.4 / 6.4 Cửa sổ ưu đãi = [đầu(N), cuối(E)] (rỗng nếu E < N) và sức chứa
    let inWin = [];
    if (N !== null && E !== null && E >= N) {
      const w0 = firstOf(N), w1 = lastOf(E);
      inWin = valid.filter((v) => v.tu <= w1 && v.den >= w0);
      const nT = inWin.filter((v) => !v.rieng).length;
      const nR = inWin.filter((v) => v.rieng).length;
      if (nT > SLOT_THUONG) loi.push(`Quá sức chứa của file: ${nT} dòng ưu đãi thường trong cửa sổ (tối đa ${SLOT_THUONG})`);
      if (nR > SLOT_RIENG) loi.push(`Quá sức chứa của file: ${nR} dòng ưu đãi riêng trong cửa sổ (tối đa ${SLOT_RIENG})`);
      // G4 — ưu đãi theo chu kỳ gán tay
      for (const [ck, cs] of cat) {
        if (cs.length !== 1 || cs[0].why.length) continue;
        const c = cs[0];
        if (c.loai === 'Theo chu kỳ' && c.apck === CK && !inWin.some((v) => v.ck === ck)) {
          note(`Chưa gán ưu đãi theo chu kỳ "${c.ma}" (áp cho ${CK})`);
        }
      }
    }

    // THANG_MOC2
    let TM2mi = null;
    if (TM2) TM2mi = TM2.mi;
    else if (TM2 === undefined && NH && Q) TM2mi = NH.mi + Q.so_thang_moc1;
    // Mục 10 (bản 3.1): có thang_moc2 nhập tay và một dòng gán trong cửa sổ, áp cho "Mốc 1",
    // có den < cuối(tháng liền trước THANG_MOC2) → LƯU Ý.
    if (TM2 && inWin.some((v) => v.moc === 'Mốc 1' && v.den < lastOf(TM2mi - 1))) {
      note('Đã gia hạn mốc 1 nhưng có ưu đãi "Mốc 1" hết hạn trước khi mốc 1 kết thúc');
    }

    const base = {
      den_ky: denKy,
      chu_ky: CK,
      ky_tu: N !== null ? fmtMonth(N) : null,
      ky_den: N !== null && E !== null && E >= N ? fmtMonth(E) : null,
    };
    const blocked = () => ({ tinh_duoc: false, ...base, thang: [], phai_thu_ky: null, loi, luu_y: luu });
    if (loi.length) return blocked();
    if (!denKy) return { tinh_duoc: true, ...base, thang: [], phai_thu_ky: 0, loi, luu_y: luu };

    // Mục 4 hp(m): dòng có mã = gói(m) và bắt_đầu ≤ đầu(m) LỚN NHẤT
    const hpRow = (pkg, mi) => {
      let best = null;
      for (const row of pkg.rows) if (row.start <= mi && (best === null || row.start > best.start)) best = row;
      return best;
    };
    // Mục 7–9: đúng Lk tháng của kỳ, m_t = EDATE(N, t−1)
    const thang = [];
    let tong = 0;
    for (let t = 1; t <= Lk; t++) {
      const mi = N + t - 1;
      const d0 = firstOf(mi), d1 = lastOf(mi);
      const moc = mi >= TM2mi ? 2 : 1;
      const dungGoiMoi = doiGoi && mi >= DOI.mi; // gói(m)
      const pkg = dungGoiMoi ? PK2 : PK;
      const hr = hpRow(pkg, mi);
      if (!hr) { loi.push(`Tháng ${fmtMonth(mi)} thuộc kỳ nhưng gói "${dungGoiMoi ? b.goi_moi : b.goi}" chưa có giá`); continue; }
      const hp = hr.fee;
      if (hp === 0) note(`Học phí tháng ${fmtMonth(mi)} bằng 0`);
      const sl = moc === 1 ? Q.so_luong_moc1 : isBlank(b.so_luong_moc2) ? Q.so_luong_moc2 : b.so_luong_moc2;
      const tr = moc === 1 ? Q.tran_moc1 : isBlank(b.tran_moc2) ? Q.tran_moc2 : b.tran_moc2;

      // 7.1 ba điều kiện
      const elig = inWin.filter((v) =>
        (HL === 'Trùng ít nhất 1 ngày' ? v.tu <= d1 && v.den >= d0 : v.tu <= d0 && v.den >= d1) &&
        (v.moc === 'Cả hai' || v.moc === `Mốc ${moc}`) &&
        (v.apck === 'Mọi chu kỳ' || v.apck === CK));
      // 7.2 cùng mã (bản 3.1): diem = −tu nếu tu ≤ đầu(m), ngược lại +tu; giữ diem NHỎ nhất;
      // bằng nhau → dòng nhập sau. (tu là yyyymmdd > 0, đơn điệu theo ngày → so như số ngày.)
      const diem = (v) => (v.tu <= d0 ? -v.tu : v.tu);
      const best = new Map();
      for (const v of elig) {
        const cur = best.get(v.ck);
        if (!cur) { best.set(v.ck, v); continue; }
        const a = diem(v), c = diem(cur);
        if (a < c || (a === c && v.i > cur.i)) best.set(v.ck, v);
      }
      const con = elig.filter((v) => best.get(v.ck) === v);
      if (con.length < elig.length) note(`Tháng ${fmtMonth(mi)}: có dòng ưu đãi trùng mã bị bỏ (giữ dòng hiệu lực ngày đầu tháng mới nhất)`);
      // 8. chọn nhóm thường
      let th = con.filter((v) => !v.rieng);
      const ri = con.filter((v) => v.rieng);
      if (CHON === '% lớn nhất trước') th = [...th].sort((a, c) => c.p - a.p || a.i - c.i);
      const giu = th.slice(0, sl);
      if (th.length > sl) note(`Tháng ${fmtMonth(mi)}: có ưu đãi đủ điều kiện bị bỏ vì vượt số lượng (${sl})`);

      // 9. % và tiền
      const pt_thuong = giu.length ? 1 - giu.reduce((a, v) => a * (1 - v.p), 1) : 0;
      if (pt_thuong > tr) note(`Tháng ${fmtMonth(mi)}: chạm trần ${tr}`);
      const pt_thuong_tran = Math.min(pt_thuong, tr);
      let pt_tong;
      if (!ri.length) pt_tong = pt_thuong_tran;
      else {
        const heSo = ri.reduce((a, v) => a * (1 - v.p), 1);
        const tranR = Math.max(...ri.map((v) => v.tran));
        pt_tong = Math.min(1 - (1 - pt_thuong_tran) * heSo, Math.max(tranR, pt_thuong_tran));
        if (!(pt_tong > pt_thuong_tran)) note(`Tháng ${fmtMonth(mi)}: chính sách riêng không có tác dụng`);
      }
      const truoc = excelRound(hp * (1 - pt_tong), 2);
      const q = CACH === 'Làm tròn thường' ? excelRound(truoc / DV, 0) : excelRoundDown(truoc / DV, 0);
      const phai_thu = q * DV;
      tong += phai_thu;
      thang.push({
        thang: fmtMonth(mi), trong_ky: true, moc, hoc_phi: hp,
        pt_thuong, pt_thuong_tran, pt_tong, phai_thu,
        ap: [...giu, ...ri].map((v) => v.code),
      });
    }
    if (loi.length) return blocked();
    return { tinh_duoc: true, ...base, thang, phai_thu_ky: tong, loi, luu_y: luu };
  }

  return { ket_qua: ketQua, luu_y_toan_cuc: gNote, loi_toan_cuc: gErr };
}

// ───────────────────────── CLI ─────────────────────────

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]));
  } catch { return false; }
}

if (isMain()) {
  const f = process.argv[2];
  if (!f) {
    process.stderr.write('Cách dùng: node tinh.mjs kich-ban.json\n');
    process.exit(2);
  }
  let sc;
  try {
    sc = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    process.stderr.write(`Không đọc được kịch bản ${f}: ${e.message}\n`);
    process.exit(2);
  }
  const { ket_qua, luu_y_toan_cuc, loi_toan_cuc } = tinh(sc);
  for (const s of loi_toan_cuc) process.stderr.write(`LỖI TOÀN CỤC: ${s}\n`);
  for (const s of luu_y_toan_cuc) process.stderr.write(`LƯU Ý TOÀN CỤC: ${s}\n`);
  process.stdout.write(JSON.stringify(ket_qua, null, 2) + '\n');
}
