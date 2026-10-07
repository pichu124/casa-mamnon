// Kiểm tra đơn vị cho tinh.mjs (DAC-TA bản 3.1).   Chạy: node kiem-tra.mjs
// Bản 3.1 sửa 1.2 (dấu cách đầu/cuối): mã TỰ KHAI có U+0020 ở đầu/cuối không hợp lệ — kiểm ở cuối tệp;
// hai khẳng định cũ isValidCode(' a ') / isValidCode(' \u00A0 ') = true đổi thành false.
// Bản 3.1 sửa 1.2: ngày hợp lệ từ 01/01/2000 tới 31/12/2100 (trước là từ 1900) — các kiểm tra
// từng coi ngày 1900-xx là hợp lệ đã đổi sang 2000-01-01; biên mới kiểm ở mục "1.2 Ngày hợp lệ".
import assert from 'node:assert/strict';
import { tinh, excelRound, excelRoundDown, isValidCode, parseDate, parseApChoChuKy } from './tinh.mjs';

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.log(`FAIL ${name}\n   ${e.message.split('\n').slice(0, 6).join('\n   ')}`); }
}

// Kịch bản nền: Quý 4/2027, QĐ1 (12 tháng; mốc 1: 3 ưu đãi, trần 30%; mốc 2: 2 ưu đãi, trần 20%).
function base() {
  return {
    cau_hinh: { thang_ky: '2027-10-01' },
    quyet_dinh: [{ ma: 'QD1', so_thang_moc1: 12, so_luong_moc1: 3, tran_moc1: 0.3, so_luong_moc2: 2, tran_moc2: 0.2 }],
    bieu_phi: [{ ma: 'MAM', hoc_phi_thang: 6000000 }],
    danh_muc: [
      { ma: 'CU_DAN', loai: 'Chung', phan_tram: 0.05 },
      { ma: 'ACE', loai: 'Chung', phan_tram: 0.10 },
      { ma: 'NAM_DAU', loai: 'Chung', phan_tram: 0.20, ap_cho_moc: 'Mốc 1' },
      { ma: 'DONG_QUY', loai: 'Theo chu kỳ', phan_tram: 0.02, ap_cho_chu_ky: 'Quý' },
      { ma: 'BS', loai: 'Bổ sung', phan_tram: 0.10, tran_rieng: 0.25 },
      { ma: 'BS2', loai: 'Bổ sung', phan_tram: 0.05 },
    ],
    // Bản 3 (G22): da_dong_den trống = chưa đóng tháng nào → bé nền ghi rõ đã đóng hết 09/2027.
    be: [{ ma: 'B1', goi: 'MAM', con_gv: 'Không', chu_ky: 'Quý', ngay_nhap_hoc: '2025-09-05', ma_qd: 'QD1', da_dong_den: '2027-09-30' }],
    uu_dai: [],
  };
}
const run = (sc) => tinh(sc).ket_qua;
const one = (sc, k = 'B1') => run(sc)[k];
const months = (r) => r.thang.map((t) => t.phai_thu);
const ud = (ma_uu_dai, x = {}) => ({ ma_be: 'B1', ma_uu_dai, ...x });

// ── Làm tròn kiểu Excel ──
check('ROUND snap 15 chữ số', () => {
  assert.equal(1500000 * (1 - 0.32), 1019999.9999999999);
  assert.equal(excelRound(1500000 * (1 - 0.32), 2), 1020000);
  assert.equal(excelRoundDown(1500000 * (1 - 0.32), 2), 1020000);
  assert.equal(2500 * (1 - 0.8), 499.9999999999999);
  assert.equal(excelRound(excelRound(2500 * (1 - 0.8), 2) / 1000, 0), 1);
  assert.equal(excelRoundDown(4199999.999999999, 2), 4200000);
  assert.equal(excelRoundDown(4199.999999999999, 0), 4200);
  assert.equal(excelRound(1.005, 2), 1.01);
  assert.equal(excelRound(2.675, 2), 2.68);
  assert.equal(excelRound(0.125, 2), 0.13);
});
check('ROUND nửa ra xa số 0', () => {
  assert.equal(excelRound(2.5, 0), 3);
  assert.equal(excelRound(0.5, 0), 1);
  assert.equal(excelRound(-2.5, 0), -3);
  assert.equal(Math.round(-2.5), -2); // bẫy: Math.round không đúng
  assert.equal(excelRoundDown(-2.7, 0), -2);
  assert.equal(excelRoundDown(2.999, 0), 2);
  assert.equal(excelRound(1e21 + 0.5, 0), 1e21);
  assert.equal(excelRound(0, 2), 0);
});
check('bẫy 70% × 6.000.000 cả hai cách làm tròn', () => {
  for (const cach of ['Làm tròn thường', 'Làm tròn xuống']) {
    const sc = base();
    sc.cau_hinh.cach_lam_tron = cach;
    sc.uu_dai = [ud('ACE', { phan_tram: 0.3 })];
    sc.quyet_dinh[0].tran_moc2 = 0.3;
    assert.deepEqual(months(one(sc)).slice(0, 3), [4200000, 4200000, 4200000], cach);
  }
});
check('nhiễu nhị phân qua cả luồng: 1.500.000 × (1−.32) làm tròn xuống; 2.500 × (1−.8) thường', () => {
  const sc = base();
  sc.bieu_phi[0].hoc_phi_thang = 1500000;
  sc.uu_dai = [ud('ACE', { phan_tram: 0.32 })];
  sc.quyet_dinh[0].tran_moc2 = 1;
  sc.cau_hinh.cach_lam_tron = 'Làm tròn xuống';
  assert.equal(one(sc).phai_thu_ky, 3 * 1020000);
  sc.bieu_phi[0].hoc_phi_thang = 2500;
  sc.uu_dai = [ud('ACE', { phan_tram: 0.8 })];
  sc.cau_hinh.cach_lam_tron = 'Làm tròn thường';
  assert.equal(one(sc).phai_thu_ky, 3000);
});
check('nửa đơn vị: 2.500đ → 3.000 (thường), 2.000 (xuống)', () => {
  const sc = base();
  sc.bieu_phi[0].hoc_phi_thang = 2500;
  assert.equal(one(sc).phai_thu_ky, 9000);
  sc.cau_hinh.cach_lam_tron = 'làm tròn xuống';
  assert.equal(one(sc).phai_thu_ky, 6000);
});
check('trần 30% sau lũy tiến (float trap)', () => {
  const sc = base();
  sc.be[0].ngay_nhap_hoc = '2027-01-10'; // mốc 1 tới 2027-12
  sc.be[0].chu_ky = '6 tháng'; // bản 3: "thang" chỉ gồm tháng của kỳ → cần kỳ 10/2027–03/2028 để thấy 2028-01
  sc.uu_dai = [ud('NAM_DAU'), ud('ACE'), ud('ACE', { phan_tram: 0.1, tu_ngay: '2027-01-01' })];
  sc.danh_muc.push({ ma: 'X', phan_tram: 0.1 });
  sc.uu_dai.push(ud('X'));
  const r = one(sc);
  // NAM_DAU .2, ACE .1 (dedup → bản 3.1: cả hai hiệu lực ngày đầu tháng → tu lớn hơn; cùng .1), X .1 → 1-.8*.9*.9 = .352 → trần .3
  assert.equal(r.thang[0].phai_thu, 4200000);
  assert.ok(Math.abs(r.thang[0].pt_thuong - 0.352) < 1e-12);
  assert.equal(r.thang[0].pt_thuong_tran, 0.3);
  // 2028-01: mốc 2 → NAM_DAU hết; ACE .1, X .1 → .19 ≤ .2
  assert.equal(r.thang[3].moc, 2);
  assert.equal(r.thang[3].phai_thu, 4860000);
});

// ── Kỳ của bé: N, E, nợ, kỳ lẻ, nghỉ học ──
check('còn nợ: đã đóng đến 30/06/2027, đợt 09/2027 → thu T7–T9 (tháng thu nằm trong kỳ đầu, không gộp)', () => {
  const sc = base();
  sc.cau_hinh.thang_ky = '2027-09-01';
  sc.be[0].da_dong_den = '2027-06-30';
  const r = one(sc);
  assert.equal(r.den_ky, true);
  assert.equal(r.ky_tu, '2027-07');
  assert.equal(r.ky_den, '2027-09');
  assert.equal(r.phai_thu_ky, 18000000);
  assert.equal(r.thang[0].thang, '2027-07');
  assert.deepEqual(r.thang.map((t) => t.trong_ky).filter(Boolean).length, 3);
  assert.ok(r.luu_y.some((s) => s.includes('nợ')));
});
check('G21 còn nợ: đã đóng đến 30/06/2027, đợt 10/2027 → gộp T7–T12', () => {
  const sc = base();
  sc.be[0].da_dong_den = '2027-06-30';
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, true);
  assert.equal(r.ky_tu, '2027-07');
  assert.equal(r.ky_den, '2027-12');
  assert.deepEqual(r.thang.map((t) => t.trong_ky), [true, true, true, true, true, true]); // bản 3: đúng Lk phần tử
  assert.deepEqual(r.thang.map((t) => t.thang), ['2027-07', '2027-08', '2027-09', '2027-10', '2027-11', '2027-12']);
  assert.equal(r.phai_thu_ky, 36000000);
  assert.ok(r.luu_y.some((s) => s.includes('nợ') && s.includes('gộp')));
});
check('đã đóng tới hết quý → chưa đến kỳ', () => {
  const sc = base();
  sc.be[0].da_dong_den = '2027-12-31';
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, false);
  assert.equal(r.ky_tu, '2028-01');
  assert.equal(r.ky_den, '2028-03');
  assert.equal(r.phai_thu_ky, 0);
  assert.deepEqual(r.thang, []); // bản 3: không đến kỳ → thang = []
});
check('kỳ lẻ: nhập học 15/11, chọn 6 tháng → T11–T12', () => {
  const sc = base();
  sc.cau_hinh.thang_ky = '2027-11-01';
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-11-15', chu_ky: '6 tháng' });
  const r = one(sc);
  assert.equal(r.chu_ky, '6 tháng');
  assert.equal(r.ky_tu, '2027-11');
  assert.equal(r.ky_den, '2027-12');
  assert.equal(r.phai_thu_ky, 12000000);
  assert.equal(r.thang[0].moc, 1);
});
check('6 tháng từ đầu quý vắt qua năm; 12 tháng', () => {
  const sc = base();
  sc.be[0].chu_ky = '6 THÁNG';
  let r = one(sc);
  assert.equal(r.ky_den, '2028-03');
  assert.equal(r.phai_thu_ky, 36000000);
  sc.be[0].chu_ky = '12 tháng';
  r = one(sc);
  assert.equal(r.ky_den, '2028-09');
  assert.equal(r.phai_thu_ky, 72000000);
});
check('1 tháng: con GV → 1 tháng; không phải con GV → Quý', () => {
  const sc = base();
  sc.be[0].chu_ky = '1 tháng';
  let r = one(sc);
  assert.equal(r.chu_ky, 'Quý');
  assert.equal(r.phai_thu_ky, 18000000);
  sc.be[0].con_gv = 'có';
  r = one(sc);
  assert.equal(r.chu_ky, '1 tháng');
  assert.equal(r.ky_den, '2027-10');
  assert.equal(r.phai_thu_ky, 6000000);
});
check('chu kỳ trống → Quý (lưu ý); sai / có dấu cách / kiểu số → LỖI (bản 3)', () => {
  for (const ck of [null, '', undefined]) {
    const sc = base();
    sc.be[0].chu_ky = ck;
    const r = one(sc);
    assert.equal(r.tinh_duoc, true, String(ck));
    assert.equal(r.chu_ky, 'Quý');
    assert.equal(r.phai_thu_ky, 18000000);
    assert.ok(r.luu_y.some((s) => s.includes('mặc định Quý')));
  }
  for (const ck of ['Năm', 'Quý ', ' Quý', 3, 12, true, '6 T', '12', 'T6', 'Q', '3th', '1 thang', 'Quy', '6 tháng.']) {
    const sc = base();
    sc.be[0].chu_ky = ck;
    const r = one(sc);
    assert.equal(r.tinh_duoc, false, JSON.stringify(ck));
    assert.equal(r.phai_thu_ky, null);
    assert.ok(r.loi.some((s) => s.includes('Chu kỳ')), JSON.stringify(ck));
  }
});
check('nghỉ học giữa kỳ: 10/11 → thu T10–T11 trọn tháng', () => {
  const sc = base();
  sc.be[0].ngay_nghi = '2027-11-10';
  const r = one(sc);
  assert.equal(r.ky_den, '2027-11');
  assert.equal(r.phai_thu_ky, 12000000);
});
check('nghỉ trước kỳ → không thu, ky_den null', () => {
  const sc = base();
  sc.be[0].ngay_nghi = '2027-09-15';
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, false);
  assert.equal(r.ky_den, null);
  assert.equal(r.phai_thu_ky, 0);
});
check('nhập học tương lai → chưa đến kỳ', () => {
  const sc = base();
  sc.be[0].ngay_nhap_hoc = '2028-02-10';
  const r = one(sc);
  assert.equal(r.den_ky, false);
  assert.equal(r.ky_tu, '2028-02');
  assert.equal(r.ky_den, '2028-03');
});

// ── G21: bé còn nợ thu gộp tới hết kỳ chứa tháng thu ──
const trongKy = (r) => r.thang.filter((t) => t.trong_ky).map((t) => t.thang);
const range = (a, n) => { // n tháng liền từ 'YYYY-MM'
  let [y, m] = a.split('-').map(Number); const out = [];
  for (let i = 0; i < n; i++) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
};
check('G21 Quý: đã đóng hết 31/08/2027, đợt 10/2027 → thu 2027-09..2027-12 (kỳ lẻ T9 + quý T10–T12)', () => {
  const sc = base();
  sc.be[0].da_dong_den = '2027-08-31';
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, true);
  assert.equal(r.chu_ky, 'Quý');
  assert.equal(r.ky_tu, '2027-09');
  assert.equal(r.ky_den, '2027-12');
  assert.deepEqual(trongKy(r), range('2027-09', 4));
  assert.equal(r.thang.length, 4); // bản 3: đúng Lk phần tử
  assert.deepEqual(r.thang.map((t) => t.thang), range('2027-09', 4));
  assert.equal(r.phai_thu_ky, 24000000);
  assert.ok(r.luu_y.some((s) => s.includes('Kỳ lẻ')));
  assert.ok(r.luu_y.some((s) => s.includes('nợ') && s.includes('gộp')));
});
check('G21 1 tháng (con GV): đã đóng hết 31/07/2027, đợt 10/2027 → thu 2027-08..2027-10 (k = THANG_THU − E1 = 2)', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '1 tháng', con_gv: 'Có', da_dong_den: '2027-07-31' });
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.chu_ky, '1 tháng');
  assert.equal(r.ky_tu, '2027-08');
  assert.equal(r.ky_den, '2027-10');
  assert.deepEqual(trongKy(r), ['2027-08', '2027-09', '2027-10']);
  assert.equal(r.phai_thu_ky, 18000000);
  assert.ok(!r.luu_y.some((s) => s.includes('Kỳ lẻ')));
});
check('G21 1 tháng không phải con GV → Quý: đã đóng hết 31/07/2027, đợt 10/2027 → 2027-08..2027-12', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '1 tháng', con_gv: 'Không', da_dong_den: '2027-07-31' });
  const r = one(sc);
  assert.equal(r.chu_ky, 'Quý');
  // N = 08 (kỳ lẻ) → E1 = 09; k = 1 → E0 = 12
  assert.equal(r.ky_tu, '2027-08');
  assert.equal(r.ky_den, '2027-12');
  assert.equal(r.phai_thu_ky, 30000000);
});
check('G21 6 tháng vắt năm: đã đóng hết 31/03/2027, đợt 10/2027 → thu 2027-04..2028-03 (đúng 12 tháng, không chặn)', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '6 tháng', da_dong_den: '2027-03-31' });
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.chu_ky, '6 tháng');
  assert.equal(r.ky_tu, '2027-04');
  assert.equal(r.ky_den, '2028-03');
  assert.deepEqual(trongKy(r), range('2027-04', 12));
  assert.equal(r.phai_thu_ky, 72000000);
  assert.ok(r.luu_y.some((s) => s.includes('tháng 9')));
  // Cửa sổ ưu đãi theo N: 2027-04..2028-03 → ưu đãi hết hạn 31/10/2027 áp T4–T10/2027.
  sc.uu_dai = [ud('CU_DAN', { den_ngay: '2027-10-31' })];
  const r2 = one(sc);
  assert.deepEqual(r2.thang.map((t) => t.phai_thu), [...Array(7).fill(5700000), ...Array(5).fill(6000000)]);
  assert.equal(r2.phai_thu_ky, 7 * 5700000 + 5 * 6000000);
  // Ưu đãi hết hạn trước N (31/03/2027) nằm ngoài cửa sổ: không chiếm ô, không áp.
  sc.uu_dai = [ud('ACE', { den_ngay: '2027-03-31' }), ud('CU_DAN', { den_ngay: '2027-10-31' })];
  assert.equal(one(sc).phai_thu_ky, 7 * 5700000 + 5 * 6000000);
});
check('G21 6 tháng: tháng thu nằm trong kỳ đầu → không gộp (đã đóng hết 06/2027, đợt 10/2027 → T7–T12)', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '6 tháng', da_dong_den: '2027-06-30' });
  const r = one(sc);
  assert.equal(r.ky_tu, '2027-07');
  assert.equal(r.ky_den, '2027-12');
  assert.equal(r.phai_thu_ky, 36000000);
  assert.ok(!r.luu_y.some((s) => s.includes('gộp')));
});
check('G21 12 tháng: đã đóng hết 12/2026, đợt 10/2027 → T1–T12/2027 không gộp; hết 09/2026 → 24 tháng → chặn', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '12 tháng', da_dong_den: '2026-12-31' });
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.ky_tu, '2027-01');
  assert.equal(r.ky_den, '2027-12');
  assert.equal(r.phai_thu_ky, 72000000);
  sc.be[0].da_dong_den = '2026-09-30'; // N = 2026-10, E1 = 2027-09 < 2027-10 → E0 = 2028-09
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.equal(r.phai_thu_ky, null);
  assert.equal(r.ky_tu, '2026-10');
  assert.equal(r.ky_den, '2028-09');
  assert.ok(r.loi.some((s) => s.includes('24 tháng') && s.includes('15 tháng')));
});
check('G21 kỳ cần thu > 15 tháng → LỖI (biên 15 được, 16 chặn) — bản 3', () => {
  const cases = [
    // [chu_ky, con_gv, da_dong_den, ky_tu, ky_den, Lk, tinh_duoc]
    ['Quý', 'Không', '2026-12-31', '2027-01', '2027-12', 12, true],
    ['Quý', 'Không', '2026-11-30', '2026-12', '2027-12', 13, true],   // kỳ lẻ T12 + 4 quý (bản 2: chặn)
    ['Quý', 'Không', '2026-09-30', '2026-10', '2027-12', 15, true],   // biên 15
    ['Quý', 'Không', '2026-08-31', '2026-09', '2027-12', 16, false],  // kỳ lẻ T9 + 5 quý = 16
    ['Quý', 'Không', '2026-06-30', '2026-07', '2027-12', 18, false],
    ['1 tháng', 'Có', '2026-07-31', '2026-08', '2027-10', 15, true],  // biên 15
    ['1 tháng', 'Có', '2026-06-30', '2026-07', '2027-10', 16, false],
    ['6 tháng', 'Không', '2027-02-28', '2027-03', '2028-03', 13, true],  // kỳ lẻ T3 + 2×6 (bản 2: chặn)
    ['6 tháng', 'Không', '2026-12-31', '2027-01', '2027-12', 12, true],
    ['6 tháng', 'Không', '2026-09-30', '2026-10', '2028-03', 18, false],
    ['12 tháng', 'Không', '2027-06-30', '2027-07', '2028-06', 12, true],
    ['12 tháng', 'Không', '2026-09-30', '2026-10', '2028-09', 24, false],
  ];
  for (const [ck, gv, ddd, tu, den, lk, ok] of cases) {
    const sc = base();
    Object.assign(sc.be[0], { chu_ky: ck, con_gv: gv, da_dong_den: ddd });
    const r = one(sc);
    const tag = `${ck} ${ddd}`;
    assert.equal(r.tinh_duoc, ok, tag);
    assert.equal(r.den_ky, true, tag);
    assert.equal(r.ky_tu, tu, tag);
    assert.equal(r.ky_den, den, tag);
    if (ok) {
      assert.equal(r.thang.length, lk, tag);
      assert.deepEqual(r.thang.map((t) => t.thang), range(tu, lk), tag);
      assert.equal(r.phai_thu_ky, lk * 6000000, tag);
    } else {
      assert.equal(r.phai_thu_ky, null, tag);
      assert.deepEqual(r.thang, [], tag);
      assert.ok(r.loi.some((s) => s.includes(`${lk} tháng`) && s.includes('15 tháng')), tag);
    }
  }
  // Biên 15/16 do ngày nghỉ cắt: 12 tháng, N = 2026-10, E0 = 2028-09
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '12 tháng', da_dong_den: '2026-09-30', ngay_nghi: '2027-12-31' });
  let r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.ky_tu, r.ky_den, r.thang.length, r.phai_thu_ky], [true, '2026-10', '2027-12', 15, 15 * 6000000]);
  sc.be[0].ngay_nghi = '2028-01-01';
  r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.ky_den, r.phai_thu_ky], [false, '2028-01', null]);
  // Lỗi của một bé không chặn bé khác.
  const sc2 = base();
  sc2.be[0].da_dong_den = '2026-06-30';
  sc2.be.push({ ...sc2.be[0], ma: 'B2', da_dong_den: '2027-09-30' });
  const rr = run(sc2);
  assert.equal(rr.B1.tinh_duoc, false);
  assert.equal(rr.B2.tinh_duoc, true);
  assert.equal(rr.B2.phai_thu_ky, 18000000);
});
check('G21 + ngày nghỉ: cắt SAU khi gộp', () => {
  const sc = base();
  sc.be[0].da_dong_den = '2027-08-31';
  // nghỉ 10/11 → 09..11
  sc.be[0].ngay_nghi = '2027-11-10';
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, true);
  assert.equal(r.ky_tu, '2027-09');
  assert.equal(r.ky_den, '2027-11');
  assert.deepEqual(trongKy(r), ['2027-09', '2027-10', '2027-11']);
  assert.equal(r.phai_thu_ky, 18000000);
  // nghỉ 20/09 (trước tháng thu, sau N) → vẫn nợ T9: thu 09..09
  sc.be[0].ngay_nghi = '2027-09-20';
  r = one(sc);
  assert.equal(r.den_ky, true);
  assert.equal(r.ky_den, '2027-09');
  assert.equal(r.phai_thu_ky, 6000000);
  // nghỉ 15/08 (trước N) → không thu, ky_den null
  sc.be[0].ngay_nghi = '2027-08-15';
  r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, false);
  assert.equal(r.ky_den, null);
  assert.equal(r.phai_thu_ky, 0);
  // nghỉ sau hết kỳ gộp → không cắt
  sc.be[0].ngay_nghi = '2028-02-01';
  r = one(sc);
  assert.equal(r.ky_den, '2027-12');
  assert.equal(r.phai_thu_ky, 24000000);
  // Kỳ gộp 18 tháng nhưng nghỉ học cắt còn ≤ 15: Lk (sau khi cắt) ≤ 15 → không chặn (mục 10 xét Lk).
  sc.be[0].da_dong_den = '2026-06-30';
  sc.be[0].ngay_nghi = '2027-05-20';
  r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.ky_tu, '2026-07');
  assert.equal(r.ky_den, '2027-05');
  assert.equal(r.phai_thu_ky, 11 * 6000000);
  sc.be[0].ngay_nghi = '2027-07-01'; // 13 tháng — bản 2 chặn, bản 3 được
  r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.thang.length, 13);
  sc.be[0].ngay_nghi = '2027-09-30'; // 15 tháng → được
  r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.ky_den, r.thang.length], [true, '2027-09', 15]);
  // … nghỉ ở tháng thứ 16 → chặn
  sc.be[0].ngay_nghi = '2027-10-01';
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.equal(r.ky_den, '2027-10');
});
check('G21 không đụng bé chưa đến kỳ / bé đúng kỳ', () => {
  // đã đóng tới hết quý → chưa đến kỳ, E = E1
  let sc = base();
  sc.be[0].da_dong_den = '2027-12-31';
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, false);
  assert.deepEqual([r.ky_tu, r.ky_den, r.phai_thu_ky], ['2028-01', '2028-03', 0]);
  assert.ok(!r.luu_y.some((s) => s.includes('nợ')));
  // chưa đến kỳ, kỳ lẻ: nhập học 15/11/2027 → ky_den = E1 = 2027-12
  sc = base();
  sc.be[0].ngay_nhap_hoc = '2027-11-15';
  r = one(sc);
  assert.equal(r.den_ky, false);
  assert.deepEqual([r.ky_tu, r.ky_den, r.phai_thu_ky], ['2027-11', '2027-12', 0]);
  // chưa đến kỳ, 1 tháng: đã đóng hết 10/2027 → E = N = 2027-11
  sc = base();
  Object.assign(sc.be[0], { chu_ky: '1 tháng', con_gv: 'Có', da_dong_den: '2027-10-31' });
  r = one(sc);
  assert.equal(r.den_ky, false);
  assert.deepEqual([r.ky_tu, r.ky_den, r.phai_thu_ky], ['2027-11', '2027-11', 0]);
  // chưa đến kỳ + ngày nghỉ: E = E1 cắt theo ngày nghỉ
  sc = base();
  Object.assign(sc.be[0], { chu_ky: '12 tháng', da_dong_den: '2027-12-31', ngay_nghi: '2028-05-03' });
  r = one(sc);
  assert.equal(r.den_ky, false);
  assert.deepEqual([r.ky_tu, r.ky_den], ['2028-01', '2028-05']);
  // đúng kỳ (không nợ): đóng hết tháng trước tháng thu. (Ô trống: bản 3 = G22, xem các bài G22.)
  for (const ddd of ['2027-09-30']) {
    sc = base();
    sc.be[0].da_dong_den = ddd;
    r = one(sc);
    assert.deepEqual([r.den_ky, r.ky_tu, r.ky_den, r.phai_thu_ky], [true, '2027-10', '2027-12', 18000000], String(ddd));
    assert.ok(!r.luu_y.some((s) => s.includes('nợ')));
  }
  // còn nợ nhưng tháng thu nằm trong kỳ đầu: đợt 11/2027, đã đóng hết 09/2027 → T10–T12, không gộp
  sc = base();
  sc.cau_hinh.thang_ky = '2027-11-01';
  sc.be[0].da_dong_den = '2027-09-30';
  r = one(sc);
  assert.deepEqual([r.den_ky, r.ky_tu, r.ky_den, r.phai_thu_ky], [true, '2027-10', '2027-12', 18000000]);
  assert.ok(r.luu_y.some((s) => s.includes('nợ') && !s.includes('gộp')));
});

// ── Bản 2 làm rõ: tran_rieng ở mục không phải Bổ sung; dòng mã trống ──
check('tran_rieng hợp lệ ở mục/dòng gán không phải Bổ sung → bỏ qua, chỉ lưu ý; sai → LỖI bất kể loại', () => {
  let sc = base();
  sc.danh_muc.find((c) => c.ma === 'ACE').tran_rieng = 0.05;
  sc.uu_dai = [ud('ACE')];
  let t = tinh(sc);
  assert.equal(t.ket_qua.B1.tinh_duoc, true);
  assert.equal(t.ket_qua.B1.thang[0].phai_thu, 5400000); // trần riêng .05 KHÔNG áp cho mục Chung
  assert.ok(t.luu_y_toan_cuc.some((s) => s.includes('trần riêng')));
  for (const bad of ['5%', 1.5, -0.1, true]) {
    sc = base();
    sc.danh_muc.find((c) => c.ma === 'ACE').tran_rieng = bad;
    sc.uu_dai = [ud('ACE')];
    t = tinh(sc);
    assert.equal(t.ket_qua.B1.tinh_duoc, false, `mục ${JSON.stringify(bad)}`);
    sc.uu_dai = [ud('CU_DAN')]; // bé không gán ACE → không bị chặn
    assert.equal(one(sc).tinh_duoc, true);
  }
  sc = base();
  sc.uu_dai = [ud('ACE', { tran_rieng: 0.05 })];
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.thang[0].phai_thu, 5400000);
  assert.ok(r.luu_y.some((s) => s.includes('trần riêng')));
  for (const bad of ['5%', 2, true]) {
    sc.uu_dai = [ud('ACE', { tran_rieng: bad })];
    assert.equal(one(sc).tinh_duoc, false, `dòng gán ${JSON.stringify(bad)}`);
    sc.uu_dai = [ud('ACE', { tran_rieng: bad, den_ngay: '2020-01-31' })]; // ngoài cửa sổ vẫn chặn
    assert.equal(one(sc).tinh_duoc, false);
  }
});
check('dòng biểu phí / QĐ / danh mục có dữ liệu mà mã trống → bỏ qua', () => {
  const sc = base();
  sc.bieu_phi.push({ ma: '', hoc_phi_thang: 'abc', ap_dung_tu: 'xx' }, { ma: null, hoc_phi_thang: 1 });
  sc.quyet_dinh.push({ ma: '', so_thang_moc1: 'x', tran_moc1: 5 }, { so_thang_moc1: 12 });
  sc.danh_muc.push({ ma: '', loai: 'Sai', phan_tram: '9%' }, { ma: null, phan_tram: 0.5, tran_rieng: 7 });
  sc.uu_dai = [ud('ACE')];
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.phai_thu_ky, 3 * 5400000);
});

// ── Phiên bản biểu phí ──
check('tăng giá giữa kỳ: từ 15/11 → T11 giá mới', () => {
  const sc = base();
  sc.bieu_phi.push({ ma: 'mam', hoc_phi_thang: 6500000, ap_dung_tu: '2027-11-15' });
  const r = one(sc);
  assert.deepEqual(r.thang.slice(0, 3).map((t) => t.hoc_phi), [6000000, 6500000, 6500000]);
  assert.equal(r.phai_thu_ky, 19000000);
});
check('biểu phí: trùng tháng bắt đầu → chặn; thiếu giá tháng trong kỳ → chặn', () => {
  let sc = base();
  sc.bieu_phi.push({ ma: 'Mam', hoc_phi_thang: 1 });
  assert.equal(one(sc).tinh_duoc, false);
  sc = base();
  sc.bieu_phi = [{ ma: 'MAM', hoc_phi_thang: 6000000, ap_dung_tu: '2027-11-01' }];
  assert.equal(one(sc).tinh_duoc, false);
  sc.bieu_phi[0].ap_dung_tu = '2027-10-31'; // đầu_tháng → 2027-10 → đủ
  assert.equal(one(sc).phai_thu_ky, 18000000);
  sc.bieu_phi[0].ap_dung_tu = '2028-01-01'; // chỉ thiếu ngoài kỳ? không — thiếu T10–T12
  assert.equal(one(sc).tinh_duoc, false);
  sc = base();
  sc.bieu_phi[0].hoc_phi_thang = '6000000';
  assert.equal(one(sc).tinh_duoc, false);
});
check('giá chỉ thiếu ở tháng ngoài kỳ → vẫn tính, hoc_phi 0', () => {
  const sc = base();
  sc.be[0].ngay_nghi = '2027-10-20';
  sc.bieu_phi = [{ ma: 'MAM', hoc_phi_thang: 6000000, ap_dung_tu: '2027-10-01' }];
  sc.cau_hinh.thang_ky = '2027-10-01';
  const r = one(sc);
  assert.equal(r.phai_thu_ky, 6000000);
});

// ── 7.2 Cùng mã cùng tháng ──
check('G18 bản 3.1 — đổi mức giữa tháng: tháng 11 hưởng mức CŨ, từ tháng 12 mức mới; không lũy tiến 2 lần', () => {
  const sc = base();
  sc.uu_dai = [ud('CU_DAN', { den_ngay: '2027-11-15' }), ud('cu_dan', { phan_tram: 0.07, tu_ngay: '2027-11-16' })];
  let r = one(sc);
  assert.deepEqual(months(r), [5700000, 5700000, 5580000]);
  assert.deepEqual(r.thang.map((t) => t.ap), [['CU_DAN'], ['CU_DAN'], ['cu_dan']]);
  assert.ok(r.luu_y.some((s) => s.includes('2027-11') && s.includes('trùng mã')));
  assert.ok(!r.luu_y.some((s) => s.includes('2027-10') && s.includes('trùng mã')));
  // Thứ tự nhập đảo ngược: vẫn mức cũ (tu nhỏ nhất) thắng, không phụ thuộc thứ tự
  sc.uu_dai.reverse();
  r = one(sc);
  assert.deepEqual(months(r), [5700000, 5700000, 5580000]);
  // Mức mới lớn hơn hay nhỏ hơn cũng vậy: 7% tới 15/11, 5% từ 16/11 → T11 hưởng 7%
  sc.uu_dai = [ud('CU_DAN', { phan_tram: 0.07, den_ngay: '2027-11-15' }), ud('CU_DAN', { tu_ngay: '2027-11-16' })];
  assert.deepEqual(months(one(sc)), [5580000, 5580000, 5700000]);
  // Phủ trọn cả tháng: tháng 11 không dòng nào phủ trọn → không hưởng mức nào
  sc.uu_dai = [ud('CU_DAN', { den_ngay: '2027-11-15' }), ud('cu_dan', { phan_tram: 0.07, tu_ngay: '2027-11-16' })];
  sc.cau_hinh.che_do_hieu_luc = 'Phủ trọn cả tháng';
  r = one(sc);
  assert.deepEqual(months(r), [5700000, 6000000, 5580000]);
  assert.deepEqual(r.thang[1].ap, []);
  // Chồng lấn nhiều tháng (bản 3.1): T10 dòng 7% bắt đầu giữa tháng → dòng hiệu lực ngày 1/10
  // (tu trống = 1900) thắng; từ T11 cả hai hiệu lực ngày đầu tháng → dòng mới nhất (7%) thắng.
  // (Bản 3 giữ 5% suốt thời gian chồng lấn.)
  sc.cau_hinh.che_do_hieu_luc = null;
  sc.uu_dai = [ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-10-15' }), ud('CU_DAN')];
  r = one(sc);
  assert.deepEqual(months(r), [5700000, 5580000, 5580000]);
  assert.ok(['2027-10', '2027-11', '2027-12'].every((m) => r.luu_y.some((s) => s.includes(m) && s.includes('trùng mã'))));
  // tu trống ≡ 01/01/1900 (nội bộ, 6.3) — sớm hơn mọi ngày nhập được (từ 01/01/2000, 1.2):
  // dòng ghi tu = 01/01/2000 bắt đầu muộn hơn → thắng, bất kể thứ tự nhập.
  sc.uu_dai = [ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2000-01-01' })];
  assert.deepEqual(months(one(sc)), [5580000, 5580000, 5580000]);
  sc.uu_dai = [ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2000-01-01' }), ud('CU_DAN')];
  assert.deepEqual(months(one(sc)), [5580000, 5580000, 5580000]);
  // Gõ 01/01/1900 nay là ngày không hợp lệ → dòng gán lỗi → chặn bé
  sc.uu_dai = [ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '1900-01-01' })];
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('"từ ngày" không phải ngày hợp lệ')));
});
check('cùng tu → dòng nhập sau; dedup trước khi đếm số lượng', () => {
  const sc = base();
  sc.uu_dai = [ud('CU_DAN'), ud('ACE'), ud('CU_DAN', { phan_tram: 0.06 })];
  const r = one(sc);
  // CU_DAN .06 + ACE .10 → 1-.94*.9 = .154 → 5.076.000
  assert.equal(r.thang[0].phai_thu, 5076000);
  assert.equal(r.thang[0].ap.length, 2);
});

// ── 7.2 bản 3.1: diem = −tu nếu tu ≤ đầu(m), ngược lại +tu; giữ diem nhỏ nhất; bằng nhau → nhập sau ──
// Kỳ nền T10–T12/2027, mốc 2 (2 ưu đãi, trần 20%), 6.000.000/tháng:
//   3% → 5.820.000   5% → 5.700.000   7% → 5.580.000   9% → 5.460.000
const apOf = (r) => r.thang.map((t) => t.ap);
const bothOrders = (rows, fn) => { for (const rs of [rows, [...rows].reverse()]) fn(rs); };
check('7.2 (a) 5% không hạn + 7% từ 16/11 không hạn (quên ghi hạn dòng cũ) → T11 5%, T12 7%', () => {
  for (const tuCu of [null, '2026-09-01', '2000-01-01']) {
    bothOrders([ud('CU_DAN', { tu_ngay: tuCu }), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-16' })], (rows) => {
      const sc = base();
      sc.uu_dai = rows;
      const r = one(sc);
      assert.deepEqual(months(r), [5700000, 5700000, 5580000], `tu cũ ${tuCu}`);
      assert.ok(!r.luu_y.some((s) => s.includes('2027-10') && s.includes('trùng mã')));
      assert.ok(r.luu_y.some((s) => s.includes('2027-11') && s.includes('trùng mã')));
      assert.ok(r.luu_y.some((s) => s.includes('2027-12') && s.includes('trùng mã')));
    });
  }
  // Kéo sang kỳ sau: mức mới giữ nguyên các tháng tiếp theo (không bị dòng cũ giành lại)
  const sc = base();
  sc.be[0].chu_ky = '6 tháng';
  sc.uu_dai = [ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-16' })];
  assert.deepEqual(months(one(sc)), [5700000, 5700000, 5580000, 5580000, 5580000, 5580000]);
});
check('7.2 (b) 5% tới 15/11 + 7% từ 16/11 → T11 5%, T12 7% (cả hai thứ tự nhập)', () => {
  bothOrders([ud('CU_DAN', { den_ngay: '2027-11-15' }), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-16' })], (rows) => {
    const sc = base();
    sc.uu_dai = rows;
    const r = one(sc);
    assert.deepEqual(months(r), [5700000, 5700000, 5580000]);
    // T12 chỉ còn dòng 7% đủ điều kiện → không có lưu ý trùng mã ở T12
    assert.ok(!r.luu_y.some((s) => s.includes('2027-12') && s.includes('trùng mã')));
  });
});
check('7.2 (c) 5% không hạn + 7% tạm thời 01/11–30/11 → T11 7%, T10 và T12 5%', () => {
  bothOrders([ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-01', den_ngay: '2027-11-30' })], (rows) => {
    const sc = base();
    sc.uu_dai = rows;
    assert.deepEqual(months(one(sc)), [5700000, 5580000, 5700000]);
  });
  // Mức tạm thời bắt đầu giữa tháng (15/11–31/12): T11 vẫn 5% (dòng hiệu lực ngày 1/11), T12 7%
  bothOrders([ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-15', den_ngay: '2027-12-31' })], (rows) => {
    const sc = base();
    sc.uu_dai = rows;
    assert.deepEqual(months(one(sc)), [5700000, 5700000, 5580000]);
  });
});
check('7.2 (d) hai dòng cùng bắt đầu giữa T11 (10/11 3%, 20/11 9%) → T11 giữ dòng 10/11; T12 dòng 20/11', () => {
  bothOrders([ud('CU_DAN', { phan_tram: 0.03, tu_ngay: '2027-11-10' }), ud('CU_DAN', { phan_tram: 0.09, tu_ngay: '2027-11-20' })], (rows) => {
    const sc = base();
    sc.uu_dai = rows;
    const r = one(sc);
    assert.deepEqual(months(r), [6000000, 5820000, 5460000]);
    assert.deepEqual(apOf(r), [[], ['CU_DAN'], ['CU_DAN']]);
  });
});
check('7.2 (e) cùng tu → dòng nhập SAU (tu ở ngày đầu tháng, giữa tháng, trống)', () => {
  const cases = [
    ['2027-11-01', [6000000, 5580000, 5580000], [6000000, 5700000, 5700000]],
    ['2027-11-10', [6000000, 5580000, 5580000], [6000000, 5700000, 5700000]],
    [null, [5580000, 5580000, 5580000], [5700000, 5700000, 5700000]],
    ['2000-01-01', [5580000, 5580000, 5580000], [5700000, 5700000, 5700000]], // ngày nhập sớm nhất
  ];
  for (const [tu, sau7, sau5] of cases) {
    const sc = base();
    sc.uu_dai = [ud('CU_DAN', { tu_ngay: tu }), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: tu })];
    assert.deepEqual(months(one(sc)), sau7, `tu ${tu}: 7% nhập sau`);
    sc.uu_dai.reverse();
    assert.deepEqual(months(one(sc)), sau5, `tu ${tu}: 5% nhập sau`);
  }
  // tu trống (≡ 01/01/1900 nội bộ) KHÔNG "bằng nhau" với ngày nhập sớm nhất 01/01/2000 mà
  // sớm hơn → dòng tu = 01/01/2000 thắng dù nhập trước hay sau.
  const sc = base();
  sc.uu_dai = [ud('CU_DAN', { phan_tram: 0.07 }), ud('CU_DAN', { tu_ngay: '2000-01-01' })];
  assert.deepEqual(months(one(sc)), [5700000, 5700000, 5700000]);
  sc.uu_dai.reverse();
  assert.deepEqual(months(one(sc)), [5700000, 5700000, 5700000]);
});
check('7.2 (f) "Phủ trọn cả tháng": dòng chồng lấn → dòng mới nhất thắng', () => {
  const run3 = (rows) => {
    const sc = base();
    sc.cau_hinh.che_do_hieu_luc = 'Phủ trọn cả tháng';
    sc.uu_dai = rows;
    return months(one(sc));
  };
  bothOrders([ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-01' })], (rows) => {
    assert.deepEqual(run3(rows), [5700000, 5580000, 5580000]);
  });
  // Mức mới bắt đầu giữa tháng 10: T10 dòng mới không phủ trọn → 5%; từ T11 → 7%
  bothOrders([ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-10-15' })], (rows) => {
    assert.deepEqual(run3(rows), [5700000, 5580000, 5580000]);
  });
  // Mức tạm thời trọn T11 lồng trong dòng không hạn
  bothOrders([ud('CU_DAN'), ud('CU_DAN', { phan_tram: 0.07, tu_ngay: '2027-11-01', den_ngay: '2027-11-30' })], (rows) => {
    assert.deepEqual(run3(rows), [5700000, 5580000, 5700000]);
  });
  // Mức mới NHỎ hơn cũng thắng (không chọn theo %): 7% cũ + 3% mới từ 01/11
  bothOrders([ud('CU_DAN', { phan_tram: 0.07 }), ud('CU_DAN', { phan_tram: 0.03, tu_ngay: '2027-11-01' })], (rows) => {
    assert.deepEqual(run3(rows), [5580000, 5820000, 5820000]);
  });
});

// ── 6.1 bản 3.1: ap_cho_chu_ky nhận viết tắt của 3.1 ──
check('6.1 ap_cho_chu_ky: hàm đổi về tên chuẩn; không bỏ dấu cách', () => {
  const ok = [
    ['Mọi chu kỳ', 'Mọi chu kỳ'], ['MỌI CHU KỲ', 'Mọi chu kỳ'], ['mọi chu kỳ', 'Mọi chu kỳ'],
    ['1 tháng', '1 tháng'], ['1T', '1 tháng'], ['1t', '1 tháng'],
    ['Quý', 'Quý'], ['QUÝ', 'Quý'], ['3 tháng', 'Quý'], ['3 THÁNG', 'Quý'], ['3T', 'Quý'], ['3t', 'Quý'],
    ['6 tháng', '6 tháng'], ['6T', '6 tháng'], ['6t', '6 tháng'],
    ['12 tháng', '12 tháng'], ['12T', '12 tháng'], ['12t', '12 tháng'],
  ];
  for (const [v, want] of ok) assert.equal(parseApChoChuKy(v), want, v);
  for (const v of ['6 T', ' 6T', '6T ', 'Quý ', 'Mọi chu kỳ ', '6', '6 thang', 'T6', 'Năm', 6, true]) {
    assert.equal(parseApChoChuKy(v), null, JSON.stringify(v));
  }
});
check('7.1(c) (g) danh mục "6T" khớp bé chu kỳ "6 tháng" và "6T"; "6t" cũng vậy; "6 T" là lỗi danh mục', () => {
  const mk = (apck, chuKy, gv = 'Không') => {
    const sc = base();
    sc.danh_muc.push({ ma: 'DONG_6', loai: 'Theo chu kỳ', phan_tram: 0.03, ap_cho_chu_ky: apck });
    Object.assign(sc.be[0], { chu_ky: chuKy, con_gv: gv });
    sc.be.push({ ...sc.be[0], ma: 'B2' }); // bé không gán DONG_6
    sc.uu_dai = [ud('DONG_6')];
    return run(sc);
  };
  // 6 tháng T10/2027–T3/2028, 3% → 5.820.000 × 6
  for (const apck of ['6T', '6t', '6 tháng', '6 THÁNG']) {
    for (const ck of ['6 tháng', '6T', '6t']) {
      const rr = mk(apck, ck);
      assert.equal(rr.B1.tinh_duoc, true, `${apck}/${ck}`);
      assert.equal(rr.B1.phai_thu_ky, 6 * 5820000, `${apck}/${ck}`);
      assert.ok(rr.B1.thang.every((t) => t.ap.includes('DONG_6')), `${apck}/${ck}`);
      // G4: bé 6 tháng không gán mục "Theo chu kỳ" 6T → lưu ý
      assert.ok(rr.B2.luu_y.some((s) => s.includes('Chưa gán ưu đãi theo chu kỳ') && s.includes('DONG_6')), `G4 ${apck}/${ck}`);
    }
    // Bé chu kỳ Quý / 12 tháng: không khớp → không áp
    const q = mk(apck, 'Quý');
    assert.equal(q.B1.phai_thu_ky, 18000000, `${apck}/Quý`);
    assert.ok(!q.B2.luu_y.some((s) => s.includes('DONG_6')), `G4 ${apck}/Quý`);
    assert.equal(mk(apck, '12T').B1.phai_thu_ky, 72000000, `${apck}/12T`);
  }
  // Các viết tắt khác của danh mục
  assert.equal(mk('3T', 'Quý').B1.phai_thu_ky, 3 * 5820000);
  assert.equal(mk('3 tháng', '3T').B1.phai_thu_ky, 3 * 5820000);
  assert.equal(mk('12t', '12 tháng').B1.phai_thu_ky, 12 * 5820000);
  assert.equal(mk('1T', '1 tháng', 'Có').B1.phai_thu_ky, 5820000);
  // 1T của bé không phải con GV → chu kỳ áp dụng Quý → mục danh mục "1T" KHÔNG khớp
  assert.equal(mk('1T', '1T', 'Không').B1.phai_thu_ky, 18000000);
  assert.equal(mk('mọi chu kỳ', 'Quý').B1.phai_thu_ky, 3 * 5820000);
  // "6 T" (có dấu cách), dấu cách thừa, cách viết lạ → lỗi mục danh mục → chặn bé có dòng gán mã đó
  for (const bad of ['6 T', ' 6T', '6T ', '6', 'sáu tháng']) {
    const rr = mk(bad, '6 tháng');
    assert.equal(rr.B1.tinh_duoc, false, JSON.stringify(bad));
    assert.ok(rr.B1.loi.some((s) => s.includes('DONG_6') && s.includes('áp cho chu kỳ')), JSON.stringify(bad));
    assert.equal(rr.B2.tinh_duoc, true, `B2 không gán DONG_6 — ${bad}`);
  }
  // Mục lỗi chặn cả khi dòng gán ngoài cửa sổ (6.1)
  const sc = base();
  sc.danh_muc.push({ ma: 'DONG_6', loai: 'Theo chu kỳ', phan_tram: 0.03, ap_cho_chu_ky: '6 T' });
  sc.uu_dai = [ud('DONG_6', { den_ngay: '2020-01-31' })];
  assert.equal(one(sc).tinh_duoc, false);
});

// ── 8. Chọn khi vượt số lượng ──
check('% lớn nhất trước vs theo thứ tự nhập', () => {
  const sc = base();
  sc.danh_muc.push({ ma: 'Z', phan_tram: 0.15 });
  sc.uu_dai = [ud('CU_DAN'), ud('ACE'), ud('Z')];
  // mốc 2: giữ 2. Lớn nhất: Z .15 + ACE .10 → .235 → trần .2 → 4.800.000
  assert.equal(one(sc).thang[0].phai_thu, 4800000);
  sc.cau_hinh.che_do_chon = 'theo thứ tự nhập';
  // CU_DAN .05 + ACE .10 → .145 → 5.130.000
  assert.equal(one(sc).thang[0].phai_thu, 5130000);
});

// ── 9. Chính sách riêng ──
check('bổ sung: tầng hai, trần riêng', () => {
  const sc = base();
  sc.uu_dai = [ud('CU_DAN'), ud('ACE'), ud('BS')];
  // .145 → 1-.855*.9 = .2305 ≤ max(.25,.145) → 6.000.000*.7695 = 4.617.000
  assert.equal(one(sc).thang[0].phai_thu, 4617000);
  sc.uu_dai[2].tran_rieng = 0.2;
  assert.equal(one(sc).thang[0].phai_thu, 4800000);
  // riêng không làm giảm: trần riêng 0 → max(0,.145)
  sc.uu_dai[2].tran_rieng = 0;
  const r = one(sc);
  assert.equal(r.thang[0].phai_thu, 5130000);
  assert.ok(r.luu_y.some((s) => s.includes('không có tác dụng')));
});

// ── 6.4 Cửa sổ và sức chứa ──
check('dòng hết hạn không chiếm ô; 7 dòng thường trong cửa sổ → chặn', () => {
  const sc = base();
  sc.uu_dai = [];
  for (let i = 0; i < 6; i++) sc.uu_dai.push(ud('CU_DAN'));
  sc.uu_dai.push(ud('ACE', { den_ngay: '2027-09-30' })); // hết hạn trước cửa sổ
  sc.uu_dai.push(ud('ACE', { tu_ngay: '2028-01-01' })); // sau cửa sổ — bản 3: cửa sổ = [N, E] = T10–T12/2027
  assert.equal(one(sc).tinh_duoc, true);
  sc.be[0].chu_ky = '6 tháng'; // cửa sổ T10/2027–T3/2028 → dòng từ 01/01/2028 chiếm ô
  assert.equal(one(sc).tinh_duoc, false);
  sc.be[0].chu_ky = 'Quý';
  sc.uu_dai.push(ud('ACE', { tu_ngay: '2027-12-31' })); // ngày cuối cửa sổ → chiếm ô
  assert.equal(one(sc).tinh_duoc, false);
});
check('3 dòng riêng trong cửa sổ → chặn; 1 hết hạn → được', () => {
  const sc = base();
  sc.uu_dai = [ud('BS'), ud('BS2'), ud('BS', { den_ngay: '2027-09-30' })];
  assert.equal(one(sc).tinh_duoc, true);
  sc.uu_dai[2].den_ngay = '2027-10-01';
  assert.equal(one(sc).tinh_duoc, false);
});
check('dòng lỗi ngoài cửa sổ vẫn chặn', () => {
  const sc = base();
  sc.uu_dai = [ud('CU_DAN', { phan_tram: '5%', den_ngay: '2020-01-31' })];
  assert.equal(one(sc).tinh_duoc, false);
});

// ── Hiệu lực ──
check('trùng 1 ngày vs phủ trọn tháng', () => {
  const sc = base();
  sc.uu_dai = [ud('ACE', { tu_ngay: '2027-10-02', den_ngay: '2027-11-30' })];
  assert.deepEqual(months(one(sc)).slice(0, 3), [5400000, 5400000, 6000000]);
  sc.cau_hinh.che_do_hieu_luc = 'PHỦ TRỌN CẢ THÁNG';
  assert.deepEqual(months(one(sc)).slice(0, 3), [6000000, 5400000, 6000000]);
});

// ── Mốc ──
check('mốc 2 theo QĐ và gia hạn bằng thang_moc2', () => {
  const sc = base();
  sc.be[0].ngay_nhap_hoc = '2027-01-10';
  sc.be[0].chu_ky = '12 tháng';
  sc.uu_dai = [ud('NAM_DAU')];
  let r = one(sc);
  assert.deepEqual(r.thang.map((t) => t.moc), [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  assert.equal(r.phai_thu_ky, 3 * 4800000 + 9 * 6000000);
  sc.be[0].thang_moc2 = '2028-06-20';
  r = one(sc);
  assert.deepEqual(r.thang.map((t) => t.moc), [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
  sc.be[0].tran_moc2 = '20%';
  assert.equal(one(sc).tinh_duoc, false);
});
check('ưu đãi chu kỳ: chỉ áp khi đúng chu kỳ', () => {
  const sc = base();
  sc.uu_dai = [ud('DONG_QUY')];
  assert.equal(one(sc).thang[0].phai_thu, 5880000);
  sc.be[0].chu_ky = '6 tháng';
  const r = one(sc);
  assert.equal(r.thang[0].phai_thu, 6000000);
  assert.deepEqual(r.thang[0].ap, []);
});

// ── 1.2 mã, hoa/thường, ký tự đại diện, kiểu dữ liệu ──
check('mã dạng số', () => {
  assert.equal(isValidCode('01'), false);
  assert.equal(isValidCode(' 123 '), false);
  assert.equal(isValidCode(123), false);
  assert.equal(isValidCode('1e3'), true);
  assert.equal(isValidCode('12%'), true);
  assert.equal(isValidCode('1.5'), true);
  assert.equal(parseDate('31/10/2027'), null);
  assert.equal(parseDate('2027-02-29'), null);
  assert.ok(parseDate('2028-02-29'));
});
check('mã bé trùng hoa/thường → hai khoá, cả hai chặn; mã số → chặn', () => {
  const sc = base();
  sc.be.push({ ...sc.be[0], ma: 'b1' }, { ...sc.be[0], ma: '007' }, { ...sc.be[0], ma: 5 }, { ...sc.be[0], ma: 'B2' });
  const r = run(sc);
  assert.deepEqual(Object.keys(r).sort(), ['007', '5', 'B1', 'B2', 'b1']);
  assert.equal(r.B1.tinh_duoc, false);
  assert.equal(r.b1.tinh_duoc, false);
  assert.equal(r['007'].tinh_duoc, false);
  assert.equal(r['5'].tinh_duoc, false);
  assert.equal(r.B2.tinh_duoc, true);
});
check('so mã không phân biệt hoa/thường; * không phải đại diện', () => {
  const sc = base();
  sc.uu_dai = [{ ma_be: 'b1', ma_uu_dai: 'ace' }];
  sc.be[0].goi = 'mam';
  sc.be[0].ma_qd = 'qd1';
  assert.equal(one(sc).thang[0].phai_thu, 5400000);
  sc.uu_dai = [{ ma_be: 'B1', ma_uu_dai: 'AC*' }];
  assert.equal(one(sc).tinh_duoc, false);
  sc.uu_dai = [{ ma_be: 'B*', ma_uu_dai: 'ACE' }]; // không khớp bé nào → lưu ý toàn cục
  const t = tinh(sc);
  assert.equal(t.ket_qua.B1.phai_thu_ky, 18000000);
  assert.equal(t.luu_y_toan_cuc.length, 1);
});
check('lỗi toàn cục chặn mọi bé', () => {
  for (const patch of [{ thang_ky: null }, { thang_ky: '10/2027' }, { che_do_chon: 'abc' },
    { don_vi_lam_tron: 0.5 }, { don_vi_lam_tron: '1000' }, { cach_lam_tron: 'Làm tròn lên' }]) {
    const sc = base();
    Object.assign(sc.cau_hinh, patch);
    assert.equal(one(sc).tinh_duoc, false, JSON.stringify(patch));
    assert.equal(one(sc).phai_thu_ky, null);
  }
});
check('QĐ và danh mục lỗi', () => {
  let sc = base();
  sc.quyet_dinh[0].so_thang_moc1 = 2.5;
  assert.equal(one(sc).tinh_duoc, false);
  sc = base();
  sc.quyet_dinh.push({ ...sc.quyet_dinh[0], ma: 'qd1' });
  assert.equal(one(sc).tinh_duoc, false);
  sc = base();
  sc.quyet_dinh[0].so_luong_moc1 = 3.0;
  assert.equal(one(sc).tinh_duoc, true);
  sc = base();
  sc.danh_muc.push({ ma: 'ace', phan_tram: 0.1 });
  sc.uu_dai = [ud('CU_DAN')];
  assert.equal(one(sc).tinh_duoc, true); // trùng mã ACE chỉ chặn bé gán ACE
  sc.uu_dai.push(ud('ACE', { den_ngay: '2020-01-01' }));
  assert.equal(one(sc).tinh_duoc, false);
  sc = base();
  sc.danh_muc.push({ ma: 'KHONG_PT' });
  sc.uu_dai = [ud('KHONG_PT')];
  assert.equal(one(sc).tinh_duoc, false);
  sc.uu_dai = [ud('KHONG_PT', { phan_tram: 0.03 })];
  assert.equal(one(sc).thang[0].phai_thu, 5820000);
  sc.uu_dai = [ud('ACE', { tu_ngay: '2027-12-01', den_ngay: '2027-11-01' })];
  assert.equal(one(sc).tinh_duoc, false);
  sc.uu_dai = [{ ma_be: 'B1', ma_uu_dai: '' }];
  assert.equal(one(sc).tinh_duoc, false);
});

// ═════════════════════════ BẢN 3 ═════════════════════════

// ── G22: da_dong_den trống = bé chưa đóng tháng nào → N từ tháng nhập học ──
check('G22 bé mới vào giữa quý (ô trống): nhập học 20/08/2027, Quý, đợt 10/2027 → thu gộp 08–12/2027', () => {
  const sc = base();
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-08-20', da_dong_den: null });
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.den_ky, true);
  // N = 08 (kỳ lẻ, E1 = 09), k = 10 − 09 = 1 → E0 = 12
  assert.deepEqual([r.ky_tu, r.ky_den, r.chu_ky], ['2027-08', '2027-12', 'Quý']);
  assert.deepEqual(r.thang.map((t) => t.thang), range('2027-08', 5));
  assert.ok(r.thang.every((t) => t.trong_ky));
  assert.equal(r.phai_thu_ky, 30000000);
  assert.ok(r.luu_y.some((s) => s.includes('Kỳ lẻ')));
  assert.ok(r.luu_y.some((s) => s.includes('nợ') && s.includes('gộp')));
  assert.ok(r.luu_y.some((s) => s.includes('Đã đóng hết tháng') && s.includes('chưa đóng tháng nào')));
  // '' và thiếu khoá = trống, cùng kết quả
  for (const v of ['', undefined]) {
    const sc2 = base();
    Object.assign(sc2.be[0], { ngay_nhap_hoc: '2027-08-20', da_dong_den: v });
    if (v === undefined) delete sc2.be[0].da_dong_den;
    assert.equal(one(sc2).phai_thu_ky, 30000000);
  }
});
check('G22 bé mới vào đúng tháng thu / giữa quý đợt 11: không lưu ý G22 khi N = THANG_THU', () => {
  let sc = base();
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-10-05', da_dong_den: null });
  let r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.den_ky, r.ky_tu, r.ky_den, r.phai_thu_ky], [true, true, '2027-10', '2027-12', 18000000]);
  assert.ok(!r.luu_y.some((s) => s.includes('chưa đóng tháng nào')));
  assert.ok(!r.luu_y.some((s) => s.includes('nợ')));
  // đợt 11/2027, bé vào 03/11 → kỳ lẻ 11–12, không nợ
  sc = base();
  sc.cau_hinh.thang_ky = '2027-11-01';
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-11-03', da_dong_den: null });
  r = one(sc);
  assert.deepEqual([r.ky_tu, r.ky_den, r.phai_thu_ky], ['2027-11', '2027-12', 12000000]);
  // đợt 11/2027, bé vào 10/10 → nợ T10, tháng thu nằm trong kỳ đầu (kỳ Q4) → 10–12
  sc.be[0].ngay_nhap_hoc = '2027-10-10';
  r = one(sc);
  assert.deepEqual([r.ky_tu, r.ky_den, r.phai_thu_ky], ['2027-10', '2027-12', 18000000]);
  assert.ok(r.luu_y.some((s) => s.includes('chưa đóng tháng nào')));
});
check('G22 bé chưa nhập học (ô trống, nhập học sau tháng thu) → không thu, thang = []', () => {
  const sc = base();
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-11-15', da_dong_den: null });
  const r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.den_ky, r.ky_tu, r.ky_den, r.phai_thu_ky], [true, false, '2027-11', '2027-12', 0]);
  assert.deepEqual(r.thang, []);
  assert.ok(r.luu_y.includes('Chưa nhập học'));
  // đã đóng trước (da_dong_den ≥ tháng thu, nhập học từ trước) → "Chưa đến kỳ"
  const sc2 = base();
  sc2.be[0].da_dong_den = '2027-12-31';
  assert.ok(one(sc2).luu_y.includes('Chưa đến kỳ'));
});
check('G22 bé cũ quên ghi ô (nhập học 09/2025) → nợ từ 09/2025, Lk = 28 > 15 → LỖI kèm lời nhắc ghi ô', () => {
  const sc = base();
  sc.be[0].da_dong_den = null;
  sc.be.push({ ...sc.be[0], ma: 'B2', da_dong_den: '2027-09-30' });
  const rr = run(sc);
  const r = rr.B1;
  assert.equal(r.tinh_duoc, false);
  assert.equal(r.den_ky, true);
  assert.equal(r.phai_thu_ky, null);
  assert.deepEqual(r.thang, []);
  // N = 2025-09 (kỳ lẻ E1 = 2025-09), k = 25 → E0 = 2025-09 + 27 = 2027-12
  assert.deepEqual([r.ky_tu, r.ky_den], ['2025-09', '2027-12']);
  assert.ok(r.loi.some((s) => s.includes('28 tháng') && s.includes('Đã đóng hết tháng')));
  assert.equal(rr.B2.tinh_duoc, true); // bé khác không bị chặn
  // Bé cũ ô trống nhưng nhập học gần: 12/2026 → Quý: kỳ lẻ T12 + 4 quý = 13 → tính được, có lưu ý
  sc.be = [{ ...sc.be[0], ma: 'B1', ngay_nhap_hoc: '2026-12-01', da_dong_den: null }];
  const r2 = one(sc);
  assert.deepEqual([r2.tinh_duoc, r2.ky_tu, r2.ky_den, r2.thang.length], [true, '2026-12', '2027-12', 13]);
  assert.ok(r2.luu_y.some((s) => s.includes('chưa đóng tháng nào')));
});
check('G21/G22 12T bé vào 08/2027, đợt 10/2027 → 08/2027..09/2028 (14 tháng, được)', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '12T', ngay_nhap_hoc: '2027-08-12', da_dong_den: null });
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.chu_ky, '12 tháng');
  assert.deepEqual([r.den_ky, r.ky_tu, r.ky_den], [true, '2027-08', '2028-09']);
  assert.equal(r.thang.length, 14);
  assert.deepEqual(r.thang.map((t) => t.thang), range('2027-08', 14));
  // mốc 1 = 12 tháng từ 08/2027 → 2028-08, 2028-09 là mốc 2
  assert.deepEqual(r.thang.map((t) => t.moc), [...Array(12).fill(1), 2, 2]);
  assert.equal(r.phai_thu_ky, 14 * 6000000);
  // cùng bé, đã ghi đã đóng hết 09/2027 → 10/2027–09/2028 (12 tháng, không gộp)
  sc.be[0].da_dong_den = '2027-09-30';
  const r2 = one(sc);
  assert.deepEqual([r2.ky_tu, r2.ky_den, r2.thang.length], ['2027-10', '2028-09', 12]);
  // 12T vào 09/2027 (kỳ lẻ chỉ 1 tháng) → 09/2027..09/2028 = 13
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-09-01', da_dong_den: null });
  const r3 = one(sc);
  assert.deepEqual([r3.tinh_duoc, r3.ky_tu, r3.ky_den, r3.thang.length], [true, '2027-09', '2028-09', 13]);
});
check('LƯU Ý "đã đóng hết tháng" xa hơn một kỳ (≥ EDATE(THANG_THU, L)); đã đóng dư khi nghỉ học', () => {
  const sc = base();
  sc.be[0].da_dong_den = '2027-12-31'; // < 2028-01 → không lưu ý
  assert.ok(!one(sc).luu_y.some((s) => s.includes('xa hơn một kỳ')));
  sc.be[0].da_dong_den = '2028-01-01'; // ≥ EDATE(2027-10, 3) = 2028-01-01
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.ok(r.luu_y.some((s) => s.includes('xa hơn một kỳ')));
  // 12 tháng: L = 12 → 2028-09-30 chưa xa, 2028-10-01 xa
  sc.be[0].chu_ky = '12 tháng';
  sc.be[0].da_dong_den = '2028-09-30';
  assert.ok(!one(sc).luu_y.some((s) => s.includes('xa hơn một kỳ')));
  sc.be[0].da_dong_den = '2028-10-01';
  assert.ok(one(sc).luu_y.some((s) => s.includes('xa hơn một kỳ')));
  // Nghỉ 10/11/2027, đã đóng hết 12/2027 → N = 2028-01 > E = 2027-11 → Đã nghỉ học, đóng dư
  const sc2 = base();
  Object.assign(sc2.be[0], { da_dong_den: '2027-12-31', ngay_nghi: '2027-11-10' });
  r = one(sc2);
  assert.deepEqual([r.tinh_duoc, r.den_ky, r.ky_tu, r.ky_den, r.phai_thu_ky], [true, false, '2028-01', null, 0]);
  assert.deepEqual(r.thang, []);
  assert.ok(r.luu_y.some((s) => s.includes('Đã nghỉ học')));
  assert.ok(r.luu_y.some((s) => s.includes('đóng dư')));
  // Đóng hết đúng tháng nghỉ (11/2027) → không dư
  sc2.be[0].da_dong_den = '2027-11-30';
  r = one(sc2);
  assert.equal(r.den_ky, false);
  assert.ok(!r.luu_y.some((s) => s.includes('đóng dư')));
});

// ── 3.4 Chỉ các tháng của kỳ; cửa sổ ưu đãi = [N, E] ──
check('output "thang" có đúng Lk phần tử, trong_ky luôn true; không đến kỳ → [] và 0', () => {
  for (const [ck, gv, n] of [['Quý', 'Không', 3], ['1 tháng', 'Có', 1], ['6 tháng', 'Không', 6], ['12 tháng', 'Không', 12]]) {
    const sc = base();
    Object.assign(sc.be[0], { chu_ky: ck, con_gv: gv });
    const r = one(sc);
    assert.equal(r.thang.length, n, ck);
    assert.ok(r.thang.every((t) => t.trong_ky === true), ck);
    assert.equal(r.phai_thu_ky, r.thang.reduce((a, t) => a + t.phai_thu, 0), ck);
  }
});
check('cửa sổ ưu đãi theo [N, E]: dòng chỉ hiệu lực sau E không chiếm ô, không cần hợp lệ về sức chứa', () => {
  const sc = base();
  sc.be[0].ngay_nghi = '2027-11-05'; // E = 2027-11
  sc.uu_dai = [ud('BS'), ud('BS2'), ud('BS', { tu_ngay: '2027-12-01' })]; // dòng riêng thứ 3 chỉ từ T12 → ngoài cửa sổ
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.equal(r.ky_den, '2027-11');
  sc.be[0].ngay_nghi = null; // E = 2027-12 → dòng thứ 3 vào cửa sổ → 3 dòng riêng → chặn
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('sức chứa')));
  // E < N: cửa sổ rỗng → không đếm ô (không chặn vì sức chứa)
  const sc2 = base();
  Object.assign(sc2.be[0], { da_dong_den: '2027-12-31', ngay_nghi: '2027-11-10' });
  sc2.uu_dai = Array.from({ length: 8 }, () => ud('CU_DAN'));
  assert.equal(one(sc2).tinh_duoc, true);
  // Chưa đến kỳ: cửa sổ = [N, E1] vẫn đếm ô
  const sc3 = base();
  sc3.be[0].da_dong_den = '2027-12-31';
  sc3.uu_dai = Array.from({ length: 7 }, () => ud('CU_DAN'));
  assert.equal(one(sc3).tinh_duoc, false);
});

// ── Mục 4: đổi gói từ một tháng (goi_moi + doi_goi_tu) ──
function scDoiGoi() {
  const sc = base();
  sc.cau_hinh.thang_ky = '2027-07-01';
  sc.bieu_phi = [
    { ma: 'NHA', hoc_phi_thang: 5000000 },
    { ma: 'NHA', hoc_phi_thang: 5200000, ap_dung_tu: '2027-08-01' },
    { ma: 'MAM', hoc_phi_thang: 6000000 },
    { ma: 'MAM', hoc_phi_thang: 6500000, ap_dung_tu: '2027-11-15' },
  ];
  Object.assign(sc.be[0], { goi: 'NHA', chu_ky: '6 tháng', da_dong_den: '2027-06-30', goi_moi: 'mam', doi_goi_tu: '2027-09-01' });
  return sc;
}
check('đổi gói giữa kỳ + phiên bản giá của cả hai gói', () => {
  const sc = scDoiGoi();
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.deepEqual([r.ky_tu, r.ky_den], ['2027-07', '2027-12']);
  // 07 NHA 5.0; 08 NHA 5.2; 09–10 MAM 6.0; 11–12 MAM 6.5 (từ 15/11 → đầu_tháng 11)
  assert.deepEqual(r.thang.map((t) => t.hoc_phi), [5000000, 5200000, 6000000, 6000000, 6500000, 6500000]);
  assert.equal(r.phai_thu_ky, 35200000);
  assert.ok(!r.luu_y.some((s) => s.includes('tháng 9'))); // đã khai đổi gói → không nhắc
  // doi_goi_tu giữa tháng: đầu_tháng → vẫn từ T9
  sc.be[0].doi_goi_tu = '2027-09-30';
  assert.equal(one(sc).phai_thu_ky, 35200000);
  // đổi từ T8/2027
  sc.be[0].doi_goi_tu = '2027-08-31';
  assert.deepEqual(one(sc).thang.map((t) => t.hoc_phi), [5000000, 6000000, 6000000, 6000000, 6500000, 6500000]);
  // đổi trước kỳ → cả kỳ gói mới; đổi sau kỳ → cả kỳ gói cũ
  sc.be[0].doi_goi_tu = '2020-01-01';
  assert.deepEqual(one(sc).thang.map((t) => t.hoc_phi), [6000000, 6000000, 6000000, 6000000, 6500000, 6500000]);
  sc.be[0].doi_goi_tu = '2028-01-01';
  r = one(sc);
  assert.deepEqual(r.thang.map((t) => t.hoc_phi), [5000000, 5200000, 5200000, 5200000, 5200000, 5200000]);
  assert.ok(!r.luu_y.some((s) => s.includes('tháng 9'))); // đã khai (dù sau kỳ) → không nhắc
  // không khai đổi gói → giữ gói cũ + LƯU Ý kỳ vắt qua tháng 9
  delete sc.be[0].goi_moi; delete sc.be[0].doi_goi_tu;
  r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.ok(r.luu_y.some((s) => s.includes('tháng 9')));
  // ưu đãi % vẫn áp theo từng tháng trên giá của gói tháng đó
  const sc2 = scDoiGoi();
  sc2.uu_dai = [ud('ACE')];
  assert.deepEqual(one(sc2).thang.map((t) => t.phai_thu), [4500000, 4680000, 5400000, 5400000, 5850000, 5850000]);
});
check('đổi gói: thiếu một trong hai / ngày sai / gói mới không có hoặc lỗi / gói mới thiếu giá tháng trong kỳ → LỖI', () => {
  const bad = [
    { goi_moi: null },                     // chỉ có doi_goi_tu
    { doi_goi_tu: '' },                    // chỉ có goi_moi
    { doi_goi_tu: '01/09/2027' },          // không phải ngày
    { doi_goi_tu: '2027-09-31' },          // ngày không có thật
    { doi_goi_tu: '2101-01-01' },          // ngoài khoảng 2000–2100
    { doi_goi_tu: '1999-12-01' },          // trước 2000 (bản 3.1)
    { doi_goi_tu: 46631 },                 // số
    { goi_moi: 'LA' },                     // không có trong biểu phí
    { goi_moi: '  ' },                     // mã toàn dấu cách
  ];
  for (const patch of bad) {
    const sc = scDoiGoi();
    Object.assign(sc.be[0], patch);
    const r = one(sc);
    assert.equal(r.tinh_duoc, false, JSON.stringify(patch));
    assert.equal(r.phai_thu_ky, null);
  }
  // gói mới có dòng biểu phí lỗi → chặn (kể cả khi đổi sau kỳ)
  let sc = scDoiGoi();
  sc.bieu_phi.push({ ma: 'MAM', hoc_phi_thang: '6.000.000', ap_dung_tu: '2029-01-01' });
  sc.be[0].doi_goi_tu = '2028-06-01';
  assert.equal(one(sc).tinh_duoc, false);
  // lỗi của gói mới chặn mọi bé dùng gói đó làm goi hoặc goi_moi, không chặn bé khác
  sc.be.push({ ma: 'B2', goi: 'NHA', chu_ky: 'Quý', ngay_nhap_hoc: '2025-09-05', ma_qd: 'QD1', da_dong_den: '2027-06-30' });
  sc.be.push({ ma: 'B3', goi: 'MAM', chu_ky: 'Quý', ngay_nhap_hoc: '2025-09-05', ma_qd: 'QD1', da_dong_den: '2027-06-30' });
  const rr = run(sc);
  assert.deepEqual([rr.B1.tinh_duoc, rr.B2.tinh_duoc, rr.B3.tinh_duoc], [false, true, false]);
  assert.equal(rr.B2.phai_thu_ky, 5000000 + 2 * 5200000);
  // gói mới chỉ có giá từ 10/2027 mà đổi từ 09/2027 → tháng 09 thiếu giá → chặn
  sc = scDoiGoi();
  sc.bieu_phi = sc.bieu_phi.filter((r) => !(r.ma === 'MAM' && !r.ap_dung_tu));
  sc.bieu_phi.push({ ma: 'MAM', hoc_phi_thang: 6000000, ap_dung_tu: '2027-10-01' });
  let r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('2027-09')));
  sc.be[0].doi_goi_tu = '2027-10-01'; // đổi từ 10 → đủ giá
  r = one(sc);
  assert.equal(r.tinh_duoc, true);
  // 07 NHA 5.0; 08–09 NHA 5.2; 10 MAM 6.0; 11–12 MAM 6.5
  assert.deepEqual(r.thang.map((t) => t.hoc_phi), [5000000, 5200000, 5200000, 6000000, 6500000, 6500000]);
  assert.equal(r.phai_thu_ky, 5000000 + 2 * 5200000 + 6000000 + 2 * 6500000);
  // gói CŨ lỗi vẫn chặn dù cả kỳ dùng gói mới
  sc = scDoiGoi();
  sc.be[0].doi_goi_tu = '2020-01-01';
  sc.bieu_phi.push({ ma: 'NHA', hoc_phi_thang: -1, ap_dung_tu: '2030-01-01' });
  assert.equal(one(sc).tinh_duoc, false);
});
check('G19 lưu ý tháng 9: chỉ khi tháng 9 KHÔNG phải tháng đầu kỳ, kỳ ≥ 2 tháng, chưa khai đổi gói', () => {
  // Kỳ bắt đầu T9 (đợt 09/2027, đã đóng hết 08) → kỳ lẻ 09 → không nhắc
  let sc = base();
  sc.cau_hinh.thang_ky = '2027-09-01';
  sc.be[0].da_dong_den = '2027-08-31';
  assert.ok(!one(sc).luu_y.some((s) => s.includes('tháng 9')));
  // 12T bắt đầu 07/2027 → có 09/2027 ở giữa → nhắc
  sc = base();
  sc.cau_hinh.thang_ky = '2027-07-01';
  Object.assign(sc.be[0], { chu_ky: '12T', da_dong_den: '2027-06-30' });
  assert.ok(one(sc).luu_y.some((s) => s.includes('tháng 9')));
  // Kỳ 15 tháng bắt đầu T9/2026 (1 tháng, con GV, đợt 11/2027): 09/2027 không phải tháng đầu → nhắc
  sc = base();
  sc.cau_hinh.thang_ky = '2027-11-01';
  Object.assign(sc.be[0], { chu_ky: '1T', con_gv: 'Có', da_dong_den: '2026-08-31' });
  const r = one(sc);
  assert.deepEqual([r.tinh_duoc, r.ky_tu, r.ky_den, r.thang.length], [true, '2026-09', '2027-11', 15]);
  assert.ok(r.luu_y.some((s) => s.includes('tháng 9')));
  // 1 tháng chỉ 1 tháng → không nhắc
  sc.cau_hinh.thang_ky = '2027-09-01';
  sc.be[0].da_dong_den = '2027-08-31';
  assert.ok(!one(sc).luu_y.some((s) => s.includes('tháng 9')));
});

// ── 3.1 Chu kỳ viết tắt ──
check('chu kỳ viết tắt: 1T/3T/"3 tháng"/6T/12T, không phân biệt hoa/thường', () => {
  const cases = [
    ['1T', 'Có', '1 tháng', 6000000], ['1t', 'có', '1 tháng', 6000000], ['1 THÁNG', 'Có', '1 tháng', 6000000],
    ['1T', 'Không', 'Quý', 18000000], ['1t', null, 'Quý', 18000000],
    ['3T', 'Không', 'Quý', 18000000], ['3t', 'Không', 'Quý', 18000000], ['3 tháng', 'Không', 'Quý', 18000000],
    ['3 THÁNG', 'Không', 'Quý', 18000000], ['QUÝ', 'Không', 'Quý', 18000000], ['quý', 'Không', 'Quý', 18000000],
    ['6T', 'Không', '6 tháng', 36000000], ['6t', 'Có', '6 tháng', 36000000], ['6 Tháng', 'Không', '6 tháng', 36000000],
    ['12T', 'Không', '12 tháng', 72000000], ['12t', 'Không', '12 tháng', 72000000], ['12 THÁNG', 'Không', '12 tháng', 72000000],
  ];
  for (const [ck, gv, ap, tien] of cases) {
    const sc = base();
    Object.assign(sc.be[0], { chu_ky: ck, con_gv: gv });
    const r = one(sc);
    assert.equal(r.tinh_duoc, true, ck);
    assert.equal(r.chu_ky, ap, `${ck}/${gv}`);
    assert.equal(r.phai_thu_ky, tien, `${ck}/${gv}`);
  }
  // Ưu đãi theo chu kỳ khớp với chu kỳ đã chuẩn hoá
  const sc = base();
  sc.be[0].chu_ky = '3T';
  sc.uu_dai = [ud('DONG_QUY')];
  assert.equal(one(sc).thang[0].phai_thu, 5880000);
  // Chu kỳ sai chỉ chặn bé đó
  sc.be.push({ ...sc.be[0], ma: 'B2', chu_ky: '6 thang' });
  const rr = run(sc);
  assert.equal(rr.B1.tinh_duoc, true);
  assert.equal(rr.B2.tinh_duoc, false);
});

// ── 1.2 Ngày hợp lệ 2000–2100 (bản 3.1; trước là 1900–2100) ──
check('ngày: biên 2000-01-01 / 2100-12-31 hợp lệ; 1999-12-31 / 2101-01-01 / mọi ngày 1900 không', () => {
  assert.ok(parseDate('2000-01-01'));
  assert.ok(parseDate('2100-12-31'));
  assert.equal(parseDate('1999-12-31'), null);
  assert.equal(parseDate('2101-01-01'), null);
  for (const v of ['1900-01-01', '1900-02-28', '1900-02-29', '1900-03-01', '1899-12-31', '1950-06-15',
    '1999-01-01', '0000-01-01', '9999-12-31']) {
    assert.equal(parseDate(v), null, v);
  }
  assert.equal(parseDate('2100-02-29'), null); // 2100 không nhuận
  assert.ok(parseDate('2000-02-29'));          // 2000 nhuận
  assert.deepEqual(parseDate('2000-01-01'), { serial: 20000101, mi: 2000 * 12 });
  // biên trên: den_ngay / ngay_nghi = 31/12/2100 vẫn hợp lệ
  let sc = base();
  sc.uu_dai = [ud('ACE', { den_ngay: '2100-12-31' })];
  assert.equal(one(sc).phai_thu_ky, 3 * 5400000);
  sc = base();
  sc.be[0].ngay_nghi = '2100-12-31';
  assert.equal(one(sc).phai_thu_ky, 18000000);
});

// Từng ô ngày, sát biên dưới: kịch bản "sớm" — đợt thu 01/2000, bé nhập học 01/01/2000, chưa
// đóng tháng nào → kỳ Quý 01–03/2000, 6.000.000/tháng, mốc 1, không ưu đãi (trừ khi ô đang xét thêm).
function scSom() {
  const sc = base();
  sc.cau_hinh.thang_ky = '2000-01-01';
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2000-01-01', da_dong_den: null });
  return sc;
}
// [ô, cách đặt giá trị, kiểm tra khi giá trị = 2000-01-01]
const O_NGAY = [
  ['thang_ky', (sc, v) => { sc.cau_hinh.thang_ky = v; },
    (r) => assert.equal(r.phai_thu_ky, 18000000)],
  ['ap_dung_tu', (sc, v) => { sc.bieu_phi[0].ap_dung_tu = v; },
    (r) => assert.equal(r.phai_thu_ky, 18000000)],
  ['ngay_nhap_hoc', (sc, v) => { sc.be[0].ngay_nhap_hoc = v; },
    (r) => assert.equal(r.phai_thu_ky, 18000000)],
  ['thang_moc2', (sc, v) => { sc.be[0].thang_moc2 = v; },
    (r) => assert.equal(r.phai_thu_ky, 18000000)],
  // đã đóng hết 01/2000 → N = 02/2000 > đợt thu 01/2000 → chưa đến kỳ
  ['da_dong_den', (sc, v) => { sc.be[0].da_dong_den = v; },
    (r) => { assert.equal(r.den_ky, false); assert.equal(r.ky_tu, '2000-02'); assert.equal(r.phai_thu_ky, 0); }],
  // nghỉ 01/01/2000 → E = 01/2000 → thu 1 tháng
  ['ngay_nghi', (sc, v) => { sc.be[0].ngay_nghi = v; },
    (r) => { assert.equal(r.ky_den, '2000-01'); assert.equal(r.phai_thu_ky, 6000000); }],
  ['doi_goi_tu', (sc, v) => { sc.be[0].goi_moi = 'MAM'; sc.be[0].doi_goi_tu = v; },
    (r) => assert.equal(r.phai_thu_ky, 18000000)],
  // ACE 10% từ 01/01/2000 → cả 3 tháng
  ['tu_ngay', (sc, v) => { sc.uu_dai = [ud('ACE', { tu_ngay: v })]; },
    (r) => assert.equal(r.phai_thu_ky, 3 * 5400000)],
  // ACE 10% tới 01/01/2000 → chỉ tháng 01/2000 (trùng ít nhất 1 ngày)
  ['den_ngay', (sc, v) => { sc.uu_dai = [ud('ACE', { den_ngay: v })]; },
    (r) => assert.deepEqual(months(r), [5400000, 6000000, 6000000])],
];
check('ngày 2000-01-01 hợp lệ ở MỌI ô ngày (thang_ky, ap_dung_tu, 5 ô của bé, tu_ngay, den_ngay)', () => {
  for (const [f, set, expect] of O_NGAY) {
    const sc = scSom();
    set(sc, '2000-01-01');
    const t = tinh(sc);
    const r = t.ket_qua.B1;
    assert.deepEqual(t.loi_toan_cuc, [], f);
    assert.equal(r.tinh_duoc, true, `${f}: ${r.loi.join('; ')}`);
    assert.ok(!r.loi.some((s) => s.includes('ngày hợp lệ')), f);
    try { expect(r); } catch (e) { e.message = `${f}: ${e.message}`; throw e; }
  }
});
check('ngày 1999-12-31 / 1900-01-01 / 2101-01-01 KHÔNG hợp lệ ở MỌI ô ngày → LỖI (thang_ky → LỖI toàn cục)', () => {
  for (const v of ['1999-12-31', '1900-01-01', '2101-01-01']) {
    for (const [f, set] of O_NGAY) {
      const sc = scSom();
      sc.be.push({ ...sc.be[0], ma: 'B2' }); // bé thứ hai: lỗi của bé chỉ chặn bé đó
      set(sc, v);
      const t = tinh(sc);
      const r = t.ket_qua.B1;
      assert.equal(r.tinh_duoc, false, `${f}=${v}`);
      assert.equal(r.phai_thu_ky, null, `${f}=${v}`);
      assert.ok(r.loi.some((s) => s.includes('không phải ngày hợp lệ')), `${f}=${v}: ${r.loi.join('; ')}`);
      if (f === 'thang_ky') {
        assert.equal(t.loi_toan_cuc.length, 1, `${f}=${v}`);
        assert.ok(t.loi_toan_cuc[0].includes('thang_ky'));
        assert.equal(t.ket_qua.B2.tinh_duoc, false, `${f}=${v}: lỗi toàn cục chặn mọi bé`);
      } else {
        assert.deepEqual(t.loi_toan_cuc, [], `${f}=${v}`);
        // ô của bé / dòng gán của B1 → chỉ chặn B1; dòng biểu phí dùng chung → chặn cả B2
        assert.equal(t.ket_qua.B2.tinh_duoc, f === 'ap_dung_tu' ? false : true, `${f}=${v} (B2)`);
      }
    }
  }
  // den_ngay / tu_ngay ngoài khoảng chặn cả khi dòng gán nằm ngoài cửa sổ (base: kỳ 10–12/2027)
  let sc = base();
  sc.uu_dai = [ud('ACE', { tu_ngay: '1999-12-31', den_ngay: '2000-06-30' })];
  assert.equal(one(sc).tinh_duoc, false);
  sc.uu_dai = [ud('ACE', { tu_ngay: '2000-01-01', den_ngay: '2000-06-30' })];
  assert.equal(one(sc).phai_thu_ky, 18000000);
});

// ── 1.2 Mã toàn dấu cách ──
check('mã toàn dấu cách (U+0020) không hợp lệ ở bé / biểu phí / QĐ / danh mục / dòng gán', () => {
  assert.equal(isValidCode(' '), false);
  assert.equal(isValidCode('   '), false);
  assert.equal(isValidCode(' a '), false); // bản 3.1 (dấu cách đầu/cuối): trước là true — nay có dấu cách hai đầu → không hợp lệ
  assert.equal(isValidCode(' '), true);  // không phải U+0020
  assert.equal(isValidCode('\t'), true);
  assert.equal(isValidCode('   '), false); // bản 3.1 (dấu cách đầu/cuối): trước là true (bỏ U+0020 còn NBSP) — nay U+0020 ở hai đầu → không hợp lệ
  assert.equal(isValidCode('  '), true); // chỉ NBSP: không phải U+0020 → hợp lệ (ý cũ của dòng trên)
  assert.equal(isValidCode(' 1 '), false);
  assert.equal(isValidCode(' 1'), true);
  // bé mã "  " → khoá "  ", bị chặn; bé khác không bị ảnh hưởng
  let sc = base();
  sc.be.push({ ...sc.be[0], ma: '  ' });
  let rr = run(sc);
  assert.deepEqual(Object.keys(rr).sort(), ['  ', 'B1']);
  assert.equal(rr['  '].tinh_duoc, false);
  assert.equal(rr.B1.tinh_duoc, true);
  // biểu phí mã "  " → lỗi dòng biểu phí → chặn bé dùng gói "  "
  sc = base();
  sc.bieu_phi.push({ ma: '  ', hoc_phi_thang: 1000000 });
  sc.be.push({ ...sc.be[0], ma: 'B2', goi: '  ' });
  rr = run(sc);
  assert.deepEqual([rr.B1.tinh_duoc, rr.B2.tinh_duoc], [true, false]);
  // QĐ mã " "
  sc = base();
  sc.quyet_dinh.push({ ...sc.quyet_dinh[0], ma: ' ' });
  sc.be.push({ ...sc.be[0], ma: 'B2', ma_qd: ' ' });
  rr = run(sc);
  assert.deepEqual([rr.B1.tinh_duoc, rr.B2.tinh_duoc], [true, false]);
  // danh mục mã "   " + dòng gán
  sc = base();
  sc.danh_muc.push({ ma: '   ', phan_tram: 0.1 });
  sc.uu_dai = [ud('   ')];
  assert.equal(one(sc).tinh_duoc, false);
  sc.uu_dai = [ud('CU_DAN')]; // bé không gán mã đó → không chặn
  assert.equal(one(sc).tinh_duoc, true);
  // dòng gán mã ưu đãi "  " mà danh mục không có → chặn
  sc = base();
  sc.uu_dai = [ud('  ')];
  assert.equal(one(sc).tinh_duoc, false);
});

// ── Mục 5: so_thang_moc1 1..120 ──
check('so_thang_moc1: 1 và 120 được; 0, 121, 12.5, "12" → lỗi dòng QĐ', () => {
  for (const [v, ok] of [[1, true], [120, true], [120.0, true], [0, false], [121, false], [12.5, false], ['12', false], [null, false], [true, false]]) {
    const sc = base();
    sc.quyet_dinh[0].so_thang_moc1 = v;
    assert.equal(one(sc).tinh_duoc, ok, JSON.stringify(v));
  }
  // 120 tháng: mốc 2 từ 09/2035 → toàn kỳ mốc 1
  const sc = base();
  sc.quyet_dinh[0].so_thang_moc1 = 120;
  assert.ok(one(sc).thang.every((t) => t.moc === 1));
});

// ── 6.1 LƯU Ý TOÀN CỤC cho dòng thiếu mã ──
check('dòng có số liệu mà thiếu mã ở biểu phí / QĐ / danh mục → bỏ qua + LƯU Ý TOÀN CỤC; dòng trống hẳn → im lặng', () => {
  const sc = base();
  sc.bieu_phi.push({ ma: '', hoc_phi_thang: 5 }, { ma: null, ten: null, hoc_phi_thang: '', ap_dung_tu: null });
  sc.quyet_dinh.push({ ma: null, so_thang_moc1: 12 }, {});
  sc.danh_muc.push({ ten: 'Không mã', phan_tram: 0.1 }, { ma: '' });
  const t = tinh(sc);
  assert.equal(t.ket_qua.B1.tinh_duoc, true);
  const notes = t.luu_y_toan_cuc.filter((s) => s.includes('thiếu mã'));
  assert.equal(notes.length, 3, notes.join(' | '));
  assert.ok(notes.some((s) => s.startsWith('Biểu phí')));
  assert.ok(notes.some((s) => s.startsWith('Quyết định')));
  assert.ok(notes.some((s) => s.startsWith('Danh mục')));
  assert.equal(t.loi_toan_cuc.length, 0);
});

// ── Gia hạn mốc 1 mà ưu đãi "Mốc 1" hết hạn trước ──
check('LƯU Ý gia hạn mốc 1 mà ưu đãi "Mốc 1" hết hạn trước', () => {
  const sc = base();
  Object.assign(sc.be[0], { ngay_nhap_hoc: '2027-01-10', thang_moc2: '2028-06-01' });
  sc.uu_dai = [ud('NAM_DAU', { den_ngay: '2027-12-31' })];
  let r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.ok(r.luu_y.some((s) => s.includes('gia hạn mốc 1')));
  sc.uu_dai = [ud('NAM_DAU')];
  r = one(sc);
  assert.ok(!r.luu_y.some((s) => s.includes('gia hạn mốc 1')));
  // Bản 3.1: điều kiện là den < cuối(tháng liền trước THANG_MOC2) = 31/05/2028
  const has = (den, extra = {}) => {
    const s = base();
    Object.assign(s.be[0], { ngay_nhap_hoc: '2027-01-10', thang_moc2: '2028-06-15', ...extra });
    s.uu_dai = [ud('NAM_DAU', { den_ngay: den })];
    return one(s).luu_y.some((x) => x.includes('gia hạn mốc 1'));
  };
  assert.equal(has('2028-05-31'), false); // hết hạn đúng ngày cuối mốc 1 → không nhắc (bản 3 có nhắc)
  assert.equal(has('2028-05-30'), true);
  assert.equal(has('2028-06-30'), false);
  // thang_moc2 không nhập tay (mốc theo QĐ) → không nhắc
  assert.equal(has('2027-12-31', { thang_moc2: null }), false);
  // dòng ngoài cửa sổ (hết hạn trước T10/2027) → không nhắc
  assert.equal(has('2027-09-30'), false);
  // dòng áp cho "Cả hai" hết hạn sớm → không phải ưu đãi "Mốc 1" → không nhắc
  const s = base();
  Object.assign(s.be[0], { ngay_nhap_hoc: '2027-01-10', thang_moc2: '2028-06-01' });
  s.uu_dai = [ud('ACE', { den_ngay: '2027-12-31' })];
  assert.ok(!one(s).luu_y.some((x) => x.includes('gia hạn mốc 1')));
});

// ── 10 bản 3.1: bỏ lưu ý "6T/12T chưa ghi đã đóng đến" (lưu ý G22 vẫn còn) ──
check('bản 3.1: 6T/12T da_dong_den trống → chỉ còn lưu ý G22, không còn lưu ý 6/12 riêng', () => {
  const sc = base();
  Object.assign(sc.be[0], { chu_ky: '6T', da_dong_den: null, ngay_nhap_hoc: '2027-08-10' });
  const r = one(sc);
  assert.ok(r.luu_y.some((s) => s.includes('Chưa ghi "Đã đóng hết tháng"')));
  assert.ok(!r.luu_y.some((s) => s.includes('6/12')));
});

// ═════════════ BẢN 3.1 — 1.2: mã TỰ KHAI có dấu cách U+0020 ở đầu/cuối là KHÔNG hợp lệ ═════════════
// Áp cho be.ma, bieu_phi.ma, quyet_dinh.ma, danh_muc.ma; hệ quả y như mã dạng số / toàn dấu cách.
// Chỗ THAM CHIẾU (goi, ma_qd, goi_moi, ma_uu_dai, ma_be) không xét — chỉ là không khớp.
const DC = 'dấu cách ở đầu/cuối';
const coDC = (r) => r.loi.some((s) => s.includes(DC));

check('dấu cách đầu/cuối: isValidCode (chỉ U+0020; giữa vẫn hợp lệ; tab/NBSP không phải dấu cách)', () => {
  for (const v of ['MAM ', ' MAM', ' MAM ', 'MAM   ', '  BE01', 'MAM 2 ', ' MAM 2', 'MAM\t ', ' \tMAM', 'MAM  ']) {
    assert.equal(isValidCode(v), false, JSON.stringify(v));
  }
  for (const v of ['MAM 2', 'M A M', 'MAM  2', 'MAM\t', '\tMAM', 'MAM ', ' MAM', ' MAM ', 'MAM\t ']) {
    assert.equal(isValidCode(v), true, JSON.stringify(v));
  }
  assert.equal(isValidCode(' 12 '), false); // vẫn là mã dạng số
  assert.equal(isValidCode('MAM'), true);
});

check('mã BÉ có dấu cách đầu/cuối → chặn bé đó (lý do ghi rõ); bé khác không ảnh hưởng', () => {
  for (const ma of ['B2 ', ' B2', ' B2 ', 'B2   ']) {
    const sc = base();
    sc.be.push({ ...sc.be[0], ma });
    const rr = run(sc);
    assert.deepEqual(Object.keys(rr).sort(), ['B1', ma].sort(), JSON.stringify(ma));
    assert.equal(rr[ma].tinh_duoc, false, JSON.stringify(ma));
    assert.equal(rr[ma].phai_thu_ky, null);
    assert.ok(coDC(rr[ma]), rr[ma].loi.join(' | '));
    assert.ok(!rr[ma].loi.some((s) => s.includes('trùng')));
    assert.equal(rr.B1.tinh_duoc, true);
    assert.equal(rr.B1.phai_thu_ky, 18000000);
  }
});

check('"BE01" + "BE01 " → hai mã khác nhau: chỉ "BE01 " bị chặn (quy tắc mới), "BE01" tính bình thường, không báo trùng', () => {
  for (const daoThuTu of [false, true]) {
    const sc = base();
    const a = { ...sc.be[0], ma: 'BE01' }, b = { ...sc.be[0], ma: 'BE01 ' };
    sc.be = daoThuTu ? [b, a] : [a, b];
    let rr = run(sc);
    assert.deepEqual(Object.keys(rr).sort(), ['BE01', 'BE01 ']);
    assert.equal(rr.BE01.tinh_duoc, true);
    assert.equal(rr.BE01.phai_thu_ky, 18000000);
    assert.deepEqual(rr.BE01.loi, []);
    assert.equal(rr['BE01 '].tinh_duoc, false);
    assert.equal(rr['BE01 '].phai_thu_ky, null);
    assert.ok(coDC(rr['BE01 ']));
    assert.ok(!rr['BE01 '].loi.some((s) => s.includes('trùng')));
    // dòng gán ma_be "BE01 " khớp đúng bé "BE01 " (đã bị chặn) — không lan sang "BE01"
    sc.danh_muc.push({ ma: 'NUA', loai: 'Chung', phan_tram: 0.5 });
    sc.quyet_dinh[0].tran_moc1 = 1;
    sc.uu_dai = [{ ma_be: 'BE01 ', ma_uu_dai: 'NUA' }];
    rr = run(sc);
    assert.equal(rr.BE01.phai_thu_ky, 18000000);
    assert.equal(rr['BE01 '].tinh_duoc, false);
  }
  // "BE01 " + "be01 ": trùng (hoa/thường) VÀ dấu cách cuối → cả hai chặn, có cả hai lý do; "BE01" vẫn tính
  const sc = base();
  sc.be = [{ ...sc.be[0], ma: 'BE01' }, { ...sc.be[0], ma: 'BE01 ' }, { ...sc.be[0], ma: 'be01 ' }];
  const rr = run(sc);
  assert.equal(rr.BE01.phai_thu_ky, 18000000);
  for (const k of ['BE01 ', 'be01 ']) {
    assert.equal(rr[k].tinh_duoc, false);
    assert.ok(coDC(rr[k]));
    assert.ok(rr[k].loi.some((s) => s.includes('trùng')));
  }
});

check('BIỂU PHÍ: dòng giá "MAM " (phiên bản) cạnh "MAM" → dòng lỗi; bé gói "MAM" không ảnh hưởng và KHÔNG nhận giá "MAM "', () => {
  for (const ma of ['MAM ', ' MAM', ' MAM ']) {
    const sc = base();
    sc.bieu_phi.push({ ma, hoc_phi_thang: 6500000, ap_dung_tu: '2027-11-01' }); // "tăng giá từ 11/2027" gõ thừa dấu cách
    sc.be.push({ ...sc.be[0], ma: 'B2', goi: ma });
    const rr = run(sc);
    // bé gói "MAM": tính bình thường, giữ giá 6.000.000 cả kỳ (không nhận 6.500.000 của "MAM ")
    assert.equal(rr.B1.tinh_duoc, true, JSON.stringify(ma));
    assert.deepEqual(rr.B1.loi, []);
    assert.deepEqual(rr.B1.thang.map((t) => t.hoc_phi), [6000000, 6000000, 6000000]);
    assert.equal(rr.B1.phai_thu_ky, 18000000);
    // bé gói "MAM ": gói có dòng biểu phí lỗi (lý do: dấu cách đầu/cuối) → chặn
    assert.equal(rr.B2.tinh_duoc, false);
    assert.ok(rr.B2.loi.some((s) => s.includes('có dòng biểu phí lỗi') && s.includes(DC)), rr.B2.loi.join(' | '));
  }
  // gói chỉ có dòng "NHA " (đủ giá mọi tháng) → bé gói "NHA " bị chặn; trước đây được tính 5.000.000/tháng
  const sc = base();
  sc.bieu_phi.push({ ma: 'NHA ', hoc_phi_thang: 5000000 });
  sc.be.push({ ...sc.be[0], ma: 'B2', goi: 'NHA ' });
  let rr = run(sc);
  assert.deepEqual([rr.B1.tinh_duoc, rr.B2.tinh_duoc], [true, false]);
  assert.ok(rr.B2.loi.some((s) => s.includes('có dòng biểu phí lỗi')));
  // gói mới (goi_moi) là "NHA " → chặn như gói mới có dòng lỗi
  sc.be[1] = { ...sc.be[0], ma: 'B2', goi: 'MAM', goi_moi: 'NHA ', doi_goi_tu: '2027-11-01' };
  rr = run(sc);
  assert.deepEqual([rr.B1.tinh_duoc, rr.B2.tinh_duoc], [true, false]);
  assert.ok(rr.B2.loi.some((s) => s.startsWith('Gói mới') && s.includes('có dòng biểu phí lỗi') && s.includes(DC)));
});

check('QĐ mã "QD1 " / " QD1" → dòng QĐ lỗi: chặn bé dùng mã đó; "QD1" không ảnh hưởng, không báo trùng', () => {
  for (const ma of ['QD1 ', ' QD1', 'QD2 ']) {
    const sc = base();
    sc.quyet_dinh.push({ ...sc.quyet_dinh[0], ma });
    sc.be.push({ ...sc.be[0], ma: 'B2', ma_qd: ma });
    const rr = run(sc);
    assert.equal(rr.B1.tinh_duoc, true, JSON.stringify(ma));
    assert.equal(rr.B1.phai_thu_ky, 18000000);
    assert.equal(rr.B2.tinh_duoc, false, JSON.stringify(ma));
    assert.equal(rr.B2.phai_thu_ky, null);
    assert.ok(rr.B2.loi.some((s) => s.startsWith('Dòng QĐ') && s.includes(DC)), rr.B2.loi.join(' | '));
    assert.ok(!rr.B2.loi.some((s) => s.includes('trùng')));
  }
});

check('DANH MỤC mã "ACE " / " ACE" → mục lỗi: chặn bé gán mã đó; "ACE" không ảnh hưởng; mục lỗi không gây lưu ý G4', () => {
  for (const ma of ['ACE ', ' ACE', 'MOI ']) {
    const sc = base();
    sc.danh_muc.push({ ma, loai: 'Chung', phan_tram: 0.5 });
    sc.uu_dai = [ud('ACE')];
    let r = one(sc);
    assert.equal(r.tinh_duoc, true, JSON.stringify(ma));
    assert.deepEqual(months(r), [5400000, 5400000, 5400000]); // ACE 10%, không phải 50% của "ACE "
    sc.uu_dai = [ud(ma)];
    r = one(sc);
    assert.equal(r.tinh_duoc, false, JSON.stringify(ma));
    assert.ok(r.loi.some((s) => s.includes('mục danh mục') && s.includes(DC)), r.loi.join(' | '));
    assert.ok(!r.loi.some((s) => s.includes('trùng')));
  }
  // mục "Theo chu kỳ" mã "DQ " là mục lỗi → không nhắc "Chưa gán ưu đãi theo chu kỳ" cho nó
  const sc = base();
  sc.danh_muc.push({ ma: 'DQ ', loai: 'Theo chu kỳ', ap_cho_chu_ky: 'Quý', phan_tram: 0.02 });
  const r = one(sc);
  assert.equal(r.tinh_duoc, true);
  assert.ok(r.luu_y.some((s) => s.includes('"DONG_QUY"'))); // mục hợp lệ vẫn được nhắc
  assert.ok(!r.luu_y.some((s) => s.includes('"DQ "')), r.luu_y.join(' | '));
});

check('dấu cách ở GIỮA vẫn hợp lệ ở cả bốn loại mã', () => {
  const sc = base();
  sc.bieu_phi.push({ ma: 'MAM 2', hoc_phi_thang: 5000000 });
  sc.quyet_dinh.push({ ...sc.quyet_dinh[0], ma: 'QD 2' });
  sc.danh_muc.push({ ma: 'UU DAI', loai: 'Chung', phan_tram: 0.1 });
  sc.be.push({ ...sc.be[0], ma: 'B 2', goi: 'MAM 2', ma_qd: 'QD 2' });
  sc.uu_dai = [{ ma_be: 'B 2', ma_uu_dai: 'UU DAI' }];
  const t = tinh(sc);
  const rr = t.ket_qua;
  assert.equal(rr['B 2'].tinh_duoc, true, rr['B 2'].loi.join(' | '));
  assert.deepEqual(months(rr['B 2']), [4500000, 4500000, 4500000]);
  assert.deepEqual(rr['B 2'].thang[0].ap, ['UU DAI']);
  assert.equal(rr.B1.phai_thu_ky, 18000000);
  assert.deepEqual(t.luu_y_toan_cuc, []);
});

check('tab / NBSP ở đầu hoặc cuối (không phải U+0020) → mã vẫn hợp lệ ở cả bốn loại', () => {
  for (const w of ['\t', ' ']) {
    for (const at of [(s) => s + w, (s) => w + s]) {
      const sc = base();
      sc.bieu_phi.push({ ma: at('NHA'), hoc_phi_thang: 5000000 });
      sc.quyet_dinh.push({ ...sc.quyet_dinh[0], ma: at('QD2') });
      sc.danh_muc.push({ ma: at('UD'), loai: 'Chung', phan_tram: 0.1 });
      sc.be.push({ ...sc.be[0], ma: at('B2'), goi: at('NHA'), ma_qd: at('QD2') });
      sc.uu_dai = [{ ma_be: at('B2'), ma_uu_dai: at('UD') }];
      const r = run(sc)[at('B2')];
      assert.equal(r.tinh_duoc, true, JSON.stringify(at('B2')) + ' ' + r.loi.join(' | '));
      assert.deepEqual(months(r), [4500000, 4500000, 4500000]);
    }
  }
  // "MAM" + NBSP cạnh "MAM": gói khác, hợp lệ — bé gói "MAM" không nhận giá của nó
  const sc = base();
  sc.bieu_phi.push({ ma: 'MAM ', hoc_phi_thang: 6500000, ap_dung_tu: '2027-11-01' });
  assert.deepEqual(one(sc).thang.map((t) => t.hoc_phi), [6000000, 6000000, 6000000]);
});

check('THAM CHIẾU thừa dấu cách không xét quy tắc mới — chỉ là không khớp (LỖI; ma_be: LƯU Ý TOÀN CỤC)', () => {
  const khongDC = (r) => assert.ok(!coDC(r), r.loi.join(' | '));
  // be.goi
  let sc = base(); sc.be[0].goi = 'MAM ';
  let r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('Gói "MAM " không có trong biểu phí')), r.loi.join(' | '));
  khongDC(r);
  // be.ma_qd
  sc = base(); sc.be[0].ma_qd = ' QD1';
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('QĐ " QD1" không có')), r.loi.join(' | '));
  khongDC(r);
  // be.goi_moi
  sc = base(); Object.assign(sc.be[0], { goi_moi: 'MAM ', doi_goi_tu: '2027-11-01' });
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('Gói mới "MAM " không có trong biểu phí')), r.loi.join(' | '));
  khongDC(r);
  // uu_dai.ma_uu_dai: "không có trong danh mục", KHÔNG phải "mã ưu đãi không hợp lệ"
  sc = base(); sc.uu_dai = [ud('ACE ')];
  r = one(sc);
  assert.equal(r.tinh_duoc, false);
  assert.ok(r.loi.some((s) => s.includes('mã "ACE " không có trong danh mục')), r.loi.join(' | '));
  assert.ok(!r.loi.some((s) => s.includes('không hợp lệ')));
  // ...còn mã ưu đãi dạng số ở dòng gán vẫn là "không hợp lệ" như cũ
  sc.uu_dai = [ud(' 12 ')];
  assert.ok(one(sc).loi.some((s) => s.includes('mã ưu đãi không hợp lệ (mã dạng số)')));
  // uu_dai.ma_be: không khớp bé nào → LƯU Ý TOÀN CỤC; bé "B1" tính bình thường, không nhận ưu đãi
  sc = base(); sc.uu_dai = [{ ma_be: 'B1 ', ma_uu_dai: 'ACE' }];
  const t = tinh(sc);
  assert.equal(t.ket_qua.B1.tinh_duoc, true);
  assert.equal(t.ket_qua.B1.phai_thu_ky, 18000000);
  assert.ok(t.luu_y_toan_cuc.some((s) => s.includes('mã bé "B1 " không khớp bé nào')), t.luu_y_toan_cuc.join(' | '));
  assert.deepEqual(t.loi_toan_cuc, []);
});

console.log(`${pass} đạt, ${fail} hỏng`);
process.exit(fail ? 1 : 0);
