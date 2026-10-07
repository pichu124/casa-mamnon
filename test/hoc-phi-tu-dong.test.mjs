// Bài canh cho BỘ SỐ CHUẨN của phần tính học phí tự động (docs/hoc-phi-tu-dong/).
//
// Chạy bằng:  npm run test:hoc-phi-tu-dong
//
// VÌ SAO CẦN
//
// Trường gửi tài liệu "Xây dựng file tính biểu phí tự động"; đợt Đ221 dựng file Excel
// theo đó, kèm đặc tả DAC-TA.md và HAI bản tính tham chiếu viết độc lập (JS, Python).
// Mỗi kịch bản trong kich-ban/ đã được file Excel và cả hai bản tham chiếu tính ra Y HỆT
// nhau tới từng đồng — kết quả ấy ghi ở *.ket-qua.json.
//
// Bản JS (tham-chieu/tinh.mjs) là điểm xuất phát tự nhiên khi đưa vào app. Nếu ai sửa nó
// mà không sửa đặc tả và file Excel, nó lệch khỏi hai bản kia mà không ai hay — rồi app
// dựng trên nó thu sai tiền của một nhà. Bài này đứng đúng chỗ đó: bản JS phải ra đúng bộ
// số đã được ba bên đồng ý.
//
// Luật so khớp là luật ở cuối DAC-TA.md: luôn so `tinh_duoc`; bé tính được thì so tuyệt
// đối kỳ, chu kỳ, số tháng của kỳ, số tiền từng tháng và cả kỳ, tập ưu đãi được áp; % so trong
// sai số 1e-9.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const THU_MUC = path.join(GOC, 'docs', 'hoc-phi-tu-dong');
const KICH_BAN = path.join(THU_MUC, 'kich-ban');
const JS = path.join(THU_MUC, 'tham-chieu', 'tinh.mjs');

const chay = (tep) => {
  const r = spawnSync('node', [JS, tep], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) return { loi: (r.stderr || '').slice(-600) };
  try { return { kq: JSON.parse(r.stdout) }; } catch (e) { return { loi: String(e) }; }
};

const THANG_TUYET_DOI = ['thang', 'trong_ky', 'moc', 'hoc_phi', 'phai_thu'];
const THANG_GAN = ['pt_thuong', 'pt_thuong_tran', 'pt_tong'];
const BE_TUYET_DOI = ['den_ky', 'chu_ky', 'ky_tu', 'ky_den', 'phai_thu_ky'];
const tap = (a) => JSON.stringify((a || []).map((x) => String(x).toLowerCase()).sort());

function soMotBe(ma, chuan, v) {
  const lech = [];
  if (!!chuan.tinh_duoc !== !!v.tinh_duoc) return [`${ma}: tinh_duoc chuẩn=${chuan.tinh_duoc} js=${v.tinh_duoc}`];
  if (!chuan.tinh_duoc) return lech;
  for (const f of BE_TUYET_DOI) {
    const a = f === 'chu_ky' ? String(chuan[f]).toLowerCase() : chuan[f];
    const b = f === 'chu_ky' ? String(v[f]).toLowerCase() : v[f];
    if (a !== b) lech.push(`${ma}: ${f} chuẩn=${chuan[f]} js=${v[f]}`);
  }
  const tc = chuan.thang || [], tv = v.thang || [];
  if (tc.length !== tv.length) lech.push(`${ma}: số tháng của kỳ chuẩn=${tc.length} js=${tv.length}`);
  tc.forEach((t, i) => {
    const u = tv[i] || {};
    for (const f of THANG_TUYET_DOI) if (t[f] !== u[f]) lech.push(`${ma} ${t.thang}: ${f} chuẩn=${t[f]} js=${u[f]}`);
    for (const f of THANG_GAN) if (!(Math.abs(Number(t[f]) - Number(u[f])) <= 1e-9)) lech.push(`${ma} ${t.thang}: ${f} chuẩn=${t[f]} js=${u[f]}`);
    if (tap(t.ap) !== tap(u.ap)) lech.push(`${ma} ${t.thang}: ap chuẩn=${t.ap} js=${u.ap}`);
  });
  return lech;
}

// ===========================================================================
console.log('\n[1] Đủ bộ: đặc tả, file Excel, bản tham chiếu, kịch bản có kết quả chuẩn');
const tepKB = fs.existsSync(KICH_BAN)
  ? fs.readdirSync(KICH_BAN).filter((f) => f.endsWith('.json') && !f.endsWith('.ket-qua.json')).sort()
  : [];
{
  for (const f of ['DAC-TA.md', 'Tinh-hoc-phi-tu-dong.xlsx', 'tham-chieu/tinh.mjs', 'tham-chieu/tinh.py', 'tao_file.py']) {
    check(`có ${f}`, fs.existsSync(path.join(THU_MUC, f)));
  }
  // Bài tự kiểm riêng của bản JS: từng quy tắc của đặc tả một phép kiểm (lũy tiến, trần, mốc, kỳ, nợ gộp,
  // đổi mức giữa tháng, mã dấu cách…). Bộ số chuẩn ở mục [3] bắt lệch tổng; bài này chỉ ra quy tắc nào.
  {
    const r = spawnSync('node', [path.join(THU_MUC, 'tham-chieu', 'kiem-tra.mjs')], { encoding: 'utf8' });
    check('bài tự kiểm của bản JS (tham-chieu/kiem-tra.mjs) đạt hết', r.status === 0, (r.stdout || '').slice(-400) + (r.stderr || '').slice(-400));
  }
  // Số kịch bản đếm lúc Đ221 chốt. Bộ chỉ được LỚN LÊN — mất kịch bản là mất ca đã canh.
  check(`có ít nhất 36 kịch bản (đang có ${tepKB.length})`, tepKB.length >= 36);
  const thieu = tepKB.filter((f) => !fs.existsSync(path.join(KICH_BAN, f.replace(/\.json$/, '.ket-qua.json'))));
  check(`kịch bản nào cũng có kết quả chuẩn${thieu.length ? ' — thiếu: ' + thieu.join(', ') : ''}`, thieu.length === 0);
}

// ===========================================================================
console.log('\n[2] Ví dụ trong chính tài liệu của trường ra đúng con số');
{
  // Tài liệu: ưu đãi hết hạn 31/10/2027 giữa Quý 4 → tháng 10 áp ưu đãi cũ, tháng 11–12 thôi.
  // Cư dân 5% + em bé thứ hai 10% lũy tiến = 14,5% trên 6.000.000 → 5.130.000; sau đó 5% → 5.700.000.
  const r = chay(path.join(KICH_BAN, 's00-vi-du-tai-lieu.json'));
  const b = r.kq && r.kq.B1;
  check('bản JS chạy được', !!r.kq, r.loi);
  check('tháng 10/2027 = 5.130.000 đ', b && b.thang[0].thang === '2027-10' && b.thang[0].phai_thu === 5130000);
  check('tháng 11 và 12/2027 = 5.700.000 đ', b && b.thang[1].phai_thu === 5700000 && b.thang[2].phai_thu === 5700000);
  check('cả quý = 16.530.000 đ', b && b.phai_thu_ky === 16530000);
}

// ===========================================================================
console.log('\n[3] Bản JS ra đúng bộ số chuẩn ở mọi kịch bản');
{
  let soBe = 0;
  for (const f of tepKB) {
    const chuan = JSON.parse(fs.readFileSync(path.join(KICH_BAN, f.replace(/\.json$/, '.ket-qua.json')), 'utf8'));
    const r = chay(path.join(KICH_BAN, f));
    if (!r.kq) { check(`${f}: bản JS chạy được`, false, r.loi); continue; }
    const lech = [];
    for (const [ma, c] of Object.entries(chuan)) {
      soBe += 1;
      if (!(ma in r.kq)) { lech.push(`${ma}: bản JS thiếu bé`); continue; }
      lech.push(...soMotBe(ma, c, r.kq[ma]));
    }
    check(`${f}: ${Object.keys(chuan).length} bé khớp${lech.length ? ' — ' + lech.slice(0, 3).join(' | ') : ''}`, lech.length === 0);
  }
  check(`tổng cộng đã so ${soBe} bé (phải ≥ 1380)`, soBe >= 1380);
}

// ===========================================================================
console.log('\n[4] Phép so không rỗng: làm lệch một đồng thì bài phải bắt được');
{
  // Một phép so viết sai (so nhầm trường, so mảng rỗng) cho xanh vĩnh viễn. Lấy một bé thật
  // trong bộ chuẩn, sửa từng chỗ một, và đòi soMotBe báo lệch ở cả bốn chỗ.
  const f = tepKB.find((t) => t.startsWith('s00'));
  const chuan = f && JSON.parse(fs.readFileSync(path.join(KICH_BAN, f.replace(/\.json$/, '.ket-qua.json')), 'utf8'));
  const goc = chuan && chuan.B1;
  check('có bé mẫu để thử (s00, B1)', !!(goc && goc.tinh_duoc && goc.thang.length === 3));
  if (goc) {
    const sao = () => JSON.parse(JSON.stringify(goc));
    const a = sao(); a.thang[1].phai_thu += 1000;
    const b = sao(); b.thang[0].ap = b.thang[0].ap.slice(1);
    const c = sao(); c.thang.pop();
    const d = sao(); d.tinh_duoc = false;
    check('lệch 1.000 đ một tháng → bắt được', soMotBe('B1', goc, a).length > 0);
    check('thiếu một ưu đãi được áp → bắt được', soMotBe('B1', goc, b).length > 0);
    check('thiếu một tháng của kỳ → bắt được', soMotBe('B1', goc, c).length > 0);
    check('tính được ↔ không tính được → bắt được', soMotBe('B1', goc, d).length > 0);
    check('y hệt → không báo lệch', soMotBe('B1', goc, sao()).length === 0);
  }
}

tongKet();
