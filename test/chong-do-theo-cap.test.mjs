// Bài canh: CHỐNG DÒ MẬT KHẨU KHÔNG ĐƯỢC KHOÁ NHẦM NGƯỜI, VÀ KHÔNG ĐƯỢC CÓ LỐI TẮT (Đ261b, lỗi O3).
//
// Chạy bằng:  TEST_PORT=7052 node test/chong-do-theo-cap.test.mjs
//
// Bản trước đếm lần sai theo ĐỊA CHỈ: 8 lần sai là khoá cả địa chỉ ấy 15 phút,
// và một lần đăng nhập đúng (bất kỳ tài khoản nào) xoá bộ đếm về 0. Hai lỗ:
//   (a) Wi-Fi của trường, buổi họp phát tài khoản: cả trăm gia đình chung một
//       địa chỉ. Vài người gõ nhầm là người gõ ĐÚNG cũng bị chặn 15 phút.
//   (b) Kẻ dò có một tài khoản thật: sai 7 lần, đăng nhập tài khoản của mình,
//       bộ đếm về 0, dò tiếp — vô hạn.
//
// Thiết kế mới, bài này canh từng vế:
//   - theo CẶP (địa chỉ, tên đăng nhập): sai 5 lần là khoá đúng cặp đó;
//   - theo ĐỊA CHỈ: trần rộng hơn nhiều, và KHÔNG xoá khi ai đó đăng nhập đúng;
//   - theo TÊN ĐĂNG NHẬP trên mọi địa chỉ: trần chặn dò một số điện thoại từ
//     nhiều máy cùng lúc; nơi chủ tài khoản đã từng đăng nhập đúng thì vẫn vào.
//   - 30 gia đình đăng nhập liên tiếp từ cùng một địa chỉ không ai bị chặn.
import path from 'path';
import { execFileSync } from 'child_process';
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 7052);
const DIR = thuMucTam('chong-do-theo-cap');
const SO_GIA_DINH = 30;

sinhDuLieu(DIR);
// Thêm 30 tài khoản gia đình dùng CÙNG chuỗi băm của một gia đình mẫu
// (mật khẩu "123456"): đủ người để dựng buổi họp phát tài khoản.
execFileSync('node', ['-e', `
  const D = require('better-sqlite3');
  const db = new D(process.argv[1]);
  const mau = db.prepare("SELECT * FROM users WHERE username = 'phuhuynh'").get();
  const cot = Object.keys(mau);
  const them = db.prepare('INSERT INTO users (' + cot.join(', ') + ') VALUES (' + cot.map(() => '?').join(', ') + ')');
  db.transaction(() => {
    for (let i = 0; i < Number(process.argv[2]); i++) {
      const dong = { ...mau, id: 'cd' + i, username: 'giadinh' + i, name: 'Gia đình thử ' + i };
      them.run(cot.map(c => dong[c]));
    }
  })();
  db.close();
`, path.join(DIR, 'school.db'), String(SO_GIA_DINH)], { cwd: GOC });

const { BASE, dung } = await dungMayChu({ port: PORT, dir: DIR });

// Đăng nhập kèm địa chỉ tự khai: máy chủ thử chạy với 'trust proxy' mặc định
// (sau Caddy), nên X-Forwarded-For là địa chỉ máy chủ nhìn thấy.
async function dangNhap(ip, username, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ username, password }),
  });
  let data = null;
  try { data = await r.json(); } catch { /* không phải JSON */ }
  return { status: r.status, data };
}
const DUNG = '123456';
const sai = (i) => `sai-mat-khau-${i}`;

// ===========================================================================
console.log('\n[1] (a) Người khác gõ sai nhiều lần từ cùng Wi-Fi KHÔNG khoá được gia đình gõ đúng');
{
  const WIFI = '198.51.100.10';
  // 10 lần sai rải trên nhiều tên — bản cũ khoá cả địa chỉ ở lần thứ 8.
  const ketQua = [];
  for (let i = 0; i < 10; i++) ketQua.push((await dangNhap(WIFI, `giadinh${i % 3}`, sai(i))).status);
  check('10 lần sai đều chỉ là "sai mật khẩu" (401), chưa khoá ai', ketQua.every(s => s === 401), ketQua);
  const vao = await dangNhap(WIFI, 'giadinh5', DUNG);
  check('gia đình khác cùng Wi-Fi gõ ĐÚNG vẫn vào được', vao.status === 200, vao);

  // Một người gõ sai mãi tài khoản của MÌNH thì chỉ cặp (địa chỉ, tên) đó bị khoá.
  const lan = [];
  for (let i = 0; i < 7; i++) lan.push((await dangNhap(WIFI, 'giadinh6', sai(i))).status);
  check('sai 5 lần thì lần thứ 6 bị khoá (429)', lan.slice(0, 5).every(s => s === 401) && lan[5] === 429, lan);
  const khoaCap = await dangNhap(WIFI, 'giadinh6', DUNG);
  check('đang khoá thì cặp ấy gõ đúng cũng bị chặn', khoaCap.status === 429, khoaCap.status);
  check('câu báo tiếng Việt, có nói số phút', /phút/.test(khoaCap.data?.error || ''), khoaCap.data?.error);
  check('gia đình khác cùng Wi-Fi vẫn vào được', (await dangNhap(WIFI, 'giadinh7', DUNG)).status === 200);
  check('chính tài khoản ấy từ địa chỉ khác (4G) vẫn vào được',
    (await dangNhap('203.0.113.77', 'giadinh6', DUNG)).status === 200);
}

// ===========================================================================
console.log('\n[2] (b) Đăng nhập đúng tài khoản của mình KHÔNG xoá bộ đếm của kẻ dò');
{
  const KE_DO = '198.51.100.20';
  const nanNhan = 'giadinh8';
  const r = [];
  for (let i = 0; i < 4; i++) r.push((await dangNhap(KE_DO, nanNhan, sai(i))).status);
  const cuaMinh = await dangNhap(KE_DO, 'giadinh9', DUNG);
  check('kẻ dò đăng nhập được tài khoản của chính mình', cuaMinh.status === 200, cuaMinh.status);
  r.push((await dangNhap(KE_DO, nanNhan, sai(4))).status);
  r.push((await dangNhap(KE_DO, nanNhan, sai(5))).status);
  check('lần dò thứ 6 vào nạn nhân bị khoá dù vừa đăng nhập đúng tài khoản khác',
    r.slice(0, 5).every(s => s === 401) && r[5] === 429, r);

  // Rải đều trên nhiều tên, xen giữa là đăng nhập đúng tài khoản của mình —
  // bản cũ cho dò mãi không khoá. Nay trần theo địa chỉ phải tới, dù xen bao
  // nhiêu lần đăng nhập đúng.
  let soSai = 5;
  let khoaO = 0;
  for (let i = 0; i < 400 && !khoaO; i++) {
    if (i % 5 === 4) await dangNhap(KE_DO, 'giadinh9', DUNG);
    const st = (await dangNhap(KE_DO, `khong-co-${i}`, sai(i))).status;
    if (st === 429) khoaO = soSai + 1; else soSai++;
  }
  check('địa chỉ bị khoá sau một số lần sai có trần (không dò vô hạn)', khoaO > 0 && khoaO <= 101, `khoá ở lần sai thứ ${khoaO}`);
  check('trần theo địa chỉ rộng hơn hẳn trần theo cặp (không khoá cả Wi-Fi vì vài người gõ nhầm)',
    khoaO > 30, khoaO);
  const moi = await dangNhap(KE_DO, 'giadinh10', DUNG);
  check('địa chỉ đang khoá: tài khoản CHƯA từng vào từ đây bị chặn', moi.status === 429, moi.status);
  const quen = await dangNhap(KE_DO, 'giadinh9', DUNG);
  check('địa chỉ đang khoá: tài khoản đã từng vào ĐÚNG từ đây vẫn vào được', quen.status === 200, quen.status);
}

// ===========================================================================
console.log('\n[3] Dò MỘT số điện thoại từ nhiều địa chỉ cùng lúc bị chặn theo tên đăng nhập');
{
  const chuNha = 'ph.nga';
  const NHA = '192.0.2.50';
  check('chủ tài khoản đăng nhập ở nhà trước đó', (await dangNhap(NHA, chuNha, DUNG)).status === 200);

  // 60 lần thử song song từ 60 địa chỉ khác nhau, mỗi địa chỉ một lần — trần
  // theo cặp và theo địa chỉ không bao giờ tới. Chậm dần theo tên một mình
  // không đủ: các lượt song song cùng chờ một lúc rồi cùng được thử.
  const dot = await Promise.all(Array.from({ length: 60 },
    (_, i) => dangNhap(`100.64.${Math.floor(i / 200)}.${i + 1}`, chuNha, sai(i))));
  const duocThu = dot.filter(r => r.status === 401).length;
  const biChan = dot.filter(r => r.status === 429).length;
  check('chỉ một phần lượt dò được thử thật, phần còn lại bị chặn', duocThu <= 30 && biChan >= 30, { duocThu, biChan });

  const laMat = await dangNhap('100.64.9.9', chuNha, DUNG);
  check('từ một địa chỉ lạ, gõ ĐÚNG cũng bị chặn (không thì dò trúng là vào)', laMat.status === 429, laMat.status);
  check('câu báo tiếng Việt, có nói số phút', /phút/.test(laMat.data?.error || ''), laMat.data?.error);
  const oNha = await dangNhap(NHA, chuNha, DUNG);
  check('ở nơi đã từng đăng nhập đúng, chủ tài khoản vẫn vào được', oNha.status === 200, oNha.status);
}

// ===========================================================================
console.log(`\n[4] Buổi họp: ${SO_GIA_DINH} gia đình đăng nhập liên tiếp từ cùng Wi-Fi`);
{
  const HOP = '198.51.100.99';
  const ra = [];
  for (let i = 0; i < SO_GIA_DINH; i++) {
    // Mỗi nhà gõ nhầm một lần rồi mới gõ đúng — vẫn không ai bị chặn.
    await dangNhap(HOP, `giadinh${i}`, sai(i));
    ra.push((await dangNhap(HOP, `giadinh${i}`, DUNG)).status);
  }
  const khongVao = ra.map((s, i) => [i, s]).filter(([, s]) => s !== 200);
  check(`cả ${SO_GIA_DINH} gia đình đều vào được`, khongVao.length === 0, khongVao);
}

dung();
donThuMucTam(DIR);
tongKet();
