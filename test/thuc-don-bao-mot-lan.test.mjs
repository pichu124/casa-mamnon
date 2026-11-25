// Bài canh THỰC ĐƠN TUẦN CHỈ BÁO GIA ĐÌNH MỘT LẦN (Đ260l, việc thêm).
//
// Chạy bằng:  node test/thuc-don-bao-mot-lan.test.mjs
//
// Hai đường báo "Thực đơn tuần từ dd/mm đã có" cho cùng một tuần:
//   • văn phòng bấm "Lưu cả tuần" (PUT /api/menu/tuan) hoặc nạp tệp Excel
//     (POST /api/menu/nap-excel) — báo ngay;
//   • việc hẹn giờ thứ Sáu (lib/thuc-don-mau.js `baoTuanSau`) — báo khi tuần
//     sau lấy từ thực đơn mẫu.
// Văn phòng sửa tuần sau từ thứ Ba, thứ Sáu đồng hồ báo thêm lần nữa: hai
// tiếng chuông cho một tin. Chống lặp theo tiêu đề chỉ bắt được trong cùng một
// ngày. Nay đường lưu ghi dấu ở `menu_mau_bao(campusId, thuHai)` — đúng dấu mà
// việc hẹn giờ đọc — cho mọi tuần nó vừa báo.
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const congNgay = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const lech = (s) => (new Date(`${s}T00:00:00Z`).getUTCDay() + 6) % 7;
const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const T2 = congNgay(HOM_NAY(), -lech(HOM_NAY()));
const tuan = (k) => congNgay(T2, 7 * k);
const thuSauCua = (k) => congNgay(tuan(k), 4);
const bua = (mon) => [{ type: 'lunch', label: 'Bữa trưa', time: '11:20', items: [mon] }];

const DIR = thuMucTam('thuc-don-bao-mot-lan');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Ban Giám Hiệu', 'tdb_qt');
const chay = (ma, ...thamSo) => execFileSync(process.execPath, ['-e', ma, ...thamSo],
  { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR, HEN_GIO_PHUT: '0' } });

// Mỗi cơ sở một thực đơn mẫu, lịch phủ tuần +1 → +3: tuần nào cũng "lấy từ mẫu".
chay(`
  const mau = require('./lib/thuc-don-mau');
  const ngay = Object.fromEntries([0, 1, 2, 3, 4].map(i => [String(i), [{ type: 'lunch', label: 'Bữa trưa', time: '11:20', items: ['Mẫu ' + i] }]]));
  for (const cs of ['cs1', 'cs2']) {
    const m = mau.themMau(cs, { ngay }).mau;
    const kq = mau.themLich(cs, { tuNgay: process.argv[1], denNgay: process.argv[2], thuTu: [m.id] });
    if (!kq.lich) throw new Error(JSON.stringify(kq));
  }
`, tuan(1), thuSauCua(3));

const CSDL = path.join(DIR, 'school.db');
const doc = (sql, ...p) => { const c = new Database(CSDL, { readonly: true }); try { return c.prepare(sql).all(...p); } finally { c.close(); } };
const ghi = (sql, ...p) => { const c = new Database(CSDL); try { return c.prepare(sql).run(...p); } finally { c.close(); } };
const daDanhDau = (cs, thuHai) => doc('SELECT 1 FROM menu_mau_bao WHERE campusId = ? AND thuHai = ?', cs, thuHai).length === 1;
const soTin = (thuHai, nhom) => doc('SELECT COUNT(*) AS n FROM notifications WHERE title = ? AND audience = ?',
  `Thực đơn tuần từ ${ddmm(thuHai)} đã có`, nhom)[0].n;
// Lùi tin vừa gửi về ba hôm trước, như văn phòng lưu từ thứ Ba: chống lặp theo
// tiêu đề trong ngày không còn che giùm nữa, chỉ còn dấu `menu_mau_bao`.
const lui = (tieuDe) => ghi('UPDATE notifications SET createdAt = ? WHERE title = ?',
  new Date(Date.now() - 3 * 86400000).toISOString(), tieuDe);

function baoTuanSau(homNay) {
  const ra = chay(`
    const kq = require('./lib/thuc-don-mau').baoTuanSau({ homNay: process.argv[1], gio: '09:00' });
    setTimeout(() => { require('fs').writeSync(1, '@@' + JSON.stringify(kq)); process.exit(0); }, 300);
  `, homNay);
  return JSON.parse(ra.split('@@').pop());
}

const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 5204), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

try {
  const d0 = await login('tdb_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('tdb_qt', 'quantri2026')).cookie;

  // =========================================================================
  console.log('\n[1] "Lưu cả tuần" của cơ sở 1 cho tuần sau → thứ Sáu không báo lại cơ sở 1');
  {
    const r = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { campusId: 'cs1', ngay: [{ date: tuan(1), meals: bua('Cơm gà') }] } });
    check('đối chứng — lưu được', r.status === 200 && r.data.daLuu === 1, r.data);
    check('đối chứng — gia đình cơ sở 1 được báo ngay', soTin(tuan(1), 'c1') === 1, soTin(tuan(1), 'c1'));
    check('ghi dấu "đã báo" cho (cơ sở 1, tuần sau)', daDanhDau('cs1', tuan(1)));
    check('…không ghi dấu cho cơ sở 2', !daDanhDau('cs2', tuan(1)));
    lui(`Thực đơn tuần từ ${ddmm(tuan(1))} đã có`);
    const kq = baoTuanSau(thuSauCua(0));
    check('thứ Sáu: KHÔNG báo lại cơ sở 1', !kq.includes('cs1'), kq);
    check('thứ Sáu: vẫn báo cơ sở 2 (chưa ai báo tuần đó)', kq.includes('cs2'), kq);
    check('gia đình cơ sở 1 chỉ có MỘT tin cho tuần đó', soTin(tuan(1), 'c1') === 1, soTin(tuan(1), 'c1'));
    check('gia đình cơ sở 2 có đúng một tin', soTin(tuan(1), 'c3') === 1, soTin(tuan(1), 'c3'));
  }

  // =========================================================================
  console.log('\n[2] Nạp tệp Excel cho cơ sở 1 → thứ Sáu không báo lại cơ sở 1');
  {
    const thang = tuan(2).slice(0, 7);
    const r0 = await fetch(`${BASE}/api/menu/mau-excel?thang=${thang}&campusId=cs1`, { headers: { Cookie: QT } });
    const bang = xlsx.doc(Buffer.from(await r0.arrayBuffer()));
    const hang = bang.find(b => b.ten === 'Thực đơn').hang;
    const dong = hang.find(h => h[0] === `${tuan(2).slice(8, 10)}/${tuan(2).slice(5, 7)}/${tuan(2).slice(0, 4)}`);
    check('đối chứng — tệp mẫu có hàng của Thứ Hai tuần +2', !!dong);
    dong[4] = 'Bún cá; Rau cải';
    const tep = `data:x;base64,${xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang }]).toString('base64')}`;
    const r = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { campusId: 'cs1', tep, luu: true } });
    check('đối chứng — nạp được, ghi đúng một ngày', r.status === 200 && r.data.daGhi === 1, r.data);
    check('ghi dấu "đã báo" cho (cơ sở 1, tuần +2)', daDanhDau('cs1', tuan(2)));
    const kq = baoTuanSau(thuSauCua(1));
    check('thứ Sáu: KHÔNG báo lại cơ sở 1', !kq.includes('cs1') && kq.includes('cs2'), kq);
  }

  // =========================================================================
  console.log('\n[3] Lưu thực đơn DÙNG CHUNG (gửi mọi nhóm) → không cơ sở nào bị báo lại');
  {
    const r = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { ngay: [{ date: tuan(3), meals: bua('Phở bò') }] } });
    check('đối chứng — lưu được', r.status === 200 && r.data.daLuu === 1, r.data);
    check('ghi dấu cho dùng chung và cả hai cơ sở', ['', 'cs1', 'cs2'].every(cs => daDanhDau(cs, tuan(3))));
    check('thứ Sáu: không báo thêm cơ sở nào', baoTuanSau(thuSauCua(2)).length === 0);
  }
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  donThuMucTam(DIR);
}
tongKet();
