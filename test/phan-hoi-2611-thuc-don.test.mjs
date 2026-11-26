// Bài canh MÁY CHỦ cho đợt sửa lỗi kiểm thử thay trường 26/11 (Đ261e) — phần
// Thực đơn.
//
// Chạy bằng:  node test/phan-hoi-2611-thuc-don.test.mjs
//
//   1. R3-5 — cơ sở bấm "Lưu cả tuần" / nạp Excel mà ngày lấy từ bản DÙNG
//      CHUNG không đổi món: KHÔNG ghi dòng riêng `menu_campus`. Nhờ vậy về sau
//      sửa bản dùng chung thì cơ sở vẫn thấy. Xem trước Excel gắn "không đổi"
//      cho những ngày ấy.
//   2. R3-4 / R1-B8 — tin "Thực đơn … đã có":
//      (a) mỗi gia đình MỘT tin, kể cả nhà có hai con ở hai nhóm;
//      (b) bấm vào mở đúng tuần của tin (#/menu/tuan/<Thứ Hai>);
//      (c) lưu lại mà không đổi món nào thì không báo;
//      (d) sửa tuần còn xa (≥ 2 tuần) thì không báo ngay — để việc báo thứ Sáu lo.
//   3. R3-11 — nạp Excel nhận "Bữa phụ 9h30", "Phụ sáng", "Bữa phụ 15h", "Xế".
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
const ngayCua = (k) => [0, 1, 2, 3, 4].map(i => congNgay(tuan(k), i));
const bua = (mon) => [
  { type: 'breakfast', label: 'Bữa sáng', time: '08:00', items: [`Sáng ${mon}`] },
  { type: 'lunch', label: 'Bữa trưa', time: '11:20', items: [`Trưa ${mon}`, 'Canh rau'] },
];

const DIR = thuMucTam('phan-hoi-2611-thuc-don');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Ban Giám Hiệu', 'td2611_qt');
const CSDL = path.join(DIR, 'school.db');
const doc = (sql, ...p) => { const c = new Database(CSDL, { readonly: true }); try { return c.prepare(sql).all(...p); } finally { c.close(); } };
const ghi = (sql, ...p) => { const c = new Database(CSDL); try { return c.prepare(sql).run(...p); } finally { c.close(); } };
const dongRieng = (cs, k) => doc(`SELECT date FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ? ORDER BY date`,
  cs, tuan(k), congNgay(tuan(k), 4)).map(r => r.date);
const tieuDeTuan = (k) => `Thực đơn tuần từ ${ddmm(tuan(k))} đã có`;
const soTinTieuDe = (t) => doc('SELECT COUNT(*) AS n FROM notifications WHERE title = ?', t)[0].n;
// Lùi mọi tin thực đơn về ba hôm trước: chống lặp theo tiêu đề trong ngày không
// còn che giùm, chỉ còn luật "không đổi món thì không báo".
const luiTin = () => ghi("UPDATE notifications SET createdAt = ? WHERE title LIKE 'Thực đơn%'",
  new Date(Date.now() - 3 * 86400000).toISOString());

const { BASE } = await dungMayChu({ port: Number(process.env.TEST_PORT || 7203), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

function baoTuanSau(homNay) {
  const ra = execFileSync(process.execPath, ['-e', `
    const kq = require('./lib/thuc-don-mau').baoTuanSau({ homNay: process.argv[1], gio: '09:00' });
    setTimeout(() => { require('fs').writeSync(1, '@@' + JSON.stringify(kq)); process.exit(0); }, 300);
  `, homNay], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR, HEN_GIO_PHUT: '0' } });
  return JSON.parse(ra.split('@@').pop());
}

async function tepTuan(QT, k, campusId, sua = () => {}) {
  const r = await fetch(`${BASE}/api/menu/mau-excel?tuan=${tuan(k)}&campusId=${campusId}`, { headers: { Cookie: QT } });
  const bang = xlsx.doc(Buffer.from(await r.arrayBuffer()));
  const trang = bang.find(b => b.ten === 'Thực đơn');
  sua(trang.hang);
  return `data:x;base64,${xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: trang.hang }]).toString('base64')}`;
}

try {
  const d0 = await login('td2611_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('td2611_qt', 'quantri2026')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;     // p1: s1 (Chồi 2) + s2 (Lá 1), cơ sở 1
  const PH6 = (await login('ph.huong', '123456')).cookie;    // p6: s7 (Lá 1)
  const tinCua = async (ck, tieuDe) => {
    const d = (await req('GET', '/api/notifications', { cookie: ck })).data;
    return (Array.isArray(d) ? d : (d.list || d.thongBao || [])).filter(n => n.title === tieuDe);
  };

  // =========================================================================
  console.log('\n[1] R3-5 — ngày lấy từ bản dùng chung mà không đổi món: KHÔNG thành dòng riêng');
  {
    const chung = await req('PUT', '/api/menu/tuan', { cookie: QT, body: {
      ngay: ngayCua(1).map((date, i) => ({ date, meals: bua(`chung ${i}`) })) } });
    check('đối chứng — lưu được thực đơn dùng chung tuần sau', chung.status === 200 && chung.data.daLuu === 5, chung.data);
    const xem = (await req('GET', '/api/menu?week=1&campusId=cs1', { cookie: QT })).data;
    check('đối chứng — cơ sở 1 đang ăn theo bản dùng chung', xem.menus.length === 5 && xem.menus.every(m => !m.rieng), xem.menus);
    const luu = await req('PUT', '/api/menu/tuan', { cookie: QT, body: {
      campusId: 'cs1', ngay: xem.menus.map(m => ({ date: m.date, meals: m.meals })) } });
    check('"Lưu cả tuần" y nguyên của cơ sở 1: không ngày nào được ghi', luu.status === 200 && luu.data.daLuu === 0, luu.data);
    check('…và báo rõ là 5 ngày giống bản đang có', luu.data.khongDoi === 5, luu.data);
    check('KHÔNG có dòng riêng nào của cơ sở 1 trong tuần đó', dongRieng('cs1', 1).length === 0, dongRieng('cs1', 1));

    const mot = xem.menus.map((m, i) => ({ date: m.date, meals: i === 0 ? bua('riêng cs1') : m.meals }));
    const luu1 = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { campusId: 'cs1', ngay: mot } });
    check('sửa đúng một ngày: chỉ ngày đó thành dòng riêng',
      luu1.data.daLuu === 1 && JSON.stringify(dongRieng('cs1', 1)) === JSON.stringify([ngayCua(1)[0]]), [luu1.data, dongRieng('cs1', 1)]);

    await req('PUT', '/api/menu/tuan', { cookie: QT, body: { ngay: [{ date: ngayCua(1)[2], meals: bua('chung đã sửa') }] } });
    const sau = (await req('GET', '/api/menu?week=1&campusId=cs1', { cookie: QT })).data.menus;
    const t4 = sau.find(m => m.date === ngayCua(1)[2]);
    check('sau đó sửa bản dùng chung: cơ sở 1 THẤY món mới',
      t4 && !t4.rieng && t4.meals.some(b => b.items.includes('Trưa chung đã sửa')), t4);

    // Excel: tải tệp của cơ sở 1, nạp lại không sửa gì.
    const tep = await tepTuan(QT, 1, 'cs1');
    const xt = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { campusId: 'cs1', tep, tuan: tuan(1) } });
    check('xem trước Excel: mọi ngày (kể cả ngày lấy từ bản dùng chung) là "không đổi"',
      xt.status === 200 && xt.data.ngay.length === 5 && xt.data.ngay.every(n => n.khongDoi), xt.data.ngay && xt.data.ngay.map(n => [n.date, n.khongDoi]));
    const xl = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { campusId: 'cs1', tep, tuan: tuan(1), luu: true } });
    check('lưu tệp y nguyên: không ghi ngày nào', xl.data.daGhi === 0, xl.data);
    check('vẫn chỉ một dòng riêng (ngày cơ sở tự sửa)', dongRieng('cs1', 1).length === 1, dongRieng('cs1', 1));
    const tep2 = await tepTuan(QT, 1, 'cs1', (hang) => {
      const iTrua = hang.findIndex(h => /^Bữa trưa/.test(String(h[0] || '')));
      hang[iTrua][3] = 'Bún riêng cơ sở 1';    // cột D = Thứ Tư
    });
    const xt2 = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { campusId: 'cs1', tep: tep2, tuan: tuan(1) } });
    check('sửa một ô trong tệp: chỉ ngày đó không còn "không đổi"',
      xt2.data.ngay.filter(n => !n.khongDoi).map(n => n.date).join() === ngayCua(1)[2], xt2.data.ngay.map(n => [n.date, n.khongDoi]));
  }

  // =========================================================================
  console.log('\n[2] R3-4 / R1-B8 — tin báo thực đơn: mỗi nhà một tin, đúng tuần, chỉ khi đổi');
  {
    luiTin();
    const r = await req('PUT', '/api/menu/tuan', { cookie: QT, body: {
      campusId: 'cs1', ngay: [{ date: ngayCua(1)[1], meals: bua('riêng cs1 T3') }] } });
    check('đối chứng — cơ sở 1 lưu một ngày tuần sau', r.data.daLuu === 1, r.data);
    const tin = await tinCua(PH, tieuDeTuan(1).replace(ddmm(tuan(1)), ddmm(ngayCua(1)[1])));
    check('(a) nhà có hai con ở Chồi 2 và Lá 1 chỉ thấy MỘT tin', tin.length === 1, tin.map(n => n.audience));
    check('(a) nhà chỉ có con ở Lá 1 vẫn thấy tin', (await tinCua(PH6, tieuDeTuan(1).replace(ddmm(tuan(1)), ddmm(ngayCua(1)[1])))).length === 1);
    check('(b) bấm vào mở đúng tuần của tin', tin[0] && tin[0].lienKet === `#/menu/tuan/${tuan(1)}`, tin[0] && tin[0].lienKet);

    // Dùng chung (gửi mọi nhóm) cũng một tin mỗi nhà.
    luiTin();
    const c = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { ngay: [{ date: ngayCua(0)[4], meals: bua('chung T6') }] } });
    const tieuDeC = `Thực đơn tuần từ ${ddmm(ngayCua(0)[4])} đã có`;
    check('đối chứng — lưu bản dùng chung tuần này', c.data.daLuu === 1, c.data);
    check('(a) bản dùng chung: nhà hai con cũng chỉ một tin', (await tinCua(PH, tieuDeC)).length === 1, (await tinCua(PH, tieuDeC)).length);

    // (c) Lưu lại y nguyên — kể cả ngày đã có dòng riêng — thì không báo.
    luiTin();
    const truoc = doc("SELECT COUNT(*) AS n FROM notifications WHERE title LIKE 'Thực đơn%'")[0].n;
    const capNhatTruoc = doc('SELECT capNhatLuc FROM menu_campus WHERE campusId = ? AND date = ?', 'cs1', ngayCua(1)[1])[0].capNhatLuc;
    const xem = (await req('GET', '/api/menu?week=1&campusId=cs1', { cookie: QT })).data;
    const y = await req('PUT', '/api/menu/tuan', { cookie: QT, body: {
      campusId: 'cs1', ngay: xem.menus.map(m => ({ date: m.date, meals: m.meals })) } });
    check('(c) "Lưu cả tuần" không đổi món nào: không ghi gì', y.data.daLuu === 0 && y.data.khongDoi === 5, y.data);
    check('(c) …và KHÔNG gửi tin nào', doc("SELECT COUNT(*) AS n FROM notifications WHERE title LIKE 'Thực đơn%'")[0].n === truoc);
    check('(c) dòng riêng đang có không bị ghi lại',
      doc('SELECT capNhatLuc FROM menu_campus WHERE campusId = ? AND date = ?', 'cs1', ngayCua(1)[1])[0].capNhatLuc === capNhatTruoc);

    // (d) Tuần còn xa: lưu được, không báo ngay, không ghi dấu; thứ Sáu tuần trước nó mới báo.
    const xa = await req('PUT', '/api/menu/tuan', { cookie: QT, body: {
      campusId: 'cs1', ngay: [{ date: ngayCua(2)[2], meals: bua('xa') }] } });
    check('(d) sửa riêng một ngày tuần +2: lưu được', xa.data.daLuu === 1, xa.data);
    check('(d) …nhưng KHÔNG báo gia đình ngay', soTinTieuDe(`Thực đơn tuần từ ${ddmm(ngayCua(2)[2])} đã có`) === 0
      && soTinTieuDe(tieuDeTuan(2)) === 0);
    check('(d) …và không ghi dấu "đã báo" cho tuần đó',
      doc('SELECT COUNT(*) AS n FROM menu_mau_bao WHERE thuHai = ?', tuan(2))[0].n === 0);
    const tepXa = await tepTuan(QT, 3, 'cs1', (hang) => {
      const iTrua = hang.findIndex(h => /^Bữa trưa/.test(String(h[0] || '')));
      hang[iTrua][1] = 'Cơm tuần +3';
    });
    const nx = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { campusId: 'cs1', tep: tepXa, tuan: tuan(3), luu: true } });
    check('(d) nạp Excel tuần +3: lưu được nhưng không báo ngay',
      nx.data.daGhi === 1 && soTinTieuDe(`Thực đơn từ ${ddmm(tuan(3))} đến ${ddmm(tuan(3))} đã có`) === 0, nx.data);
    const kq = baoTuanSau(congNgay(tuan(1), 4));
    check('(d) thứ Sáu tuần +1: việc hẹn giờ báo tuần +2 cho cơ sở 1', kq.includes('cs1'), kq);
    const tinXa = await tinCua(PH, tieuDeTuan(2));
    check('(d) nhà hai con nhận đúng MỘT tin, mở đúng tuần +2',
      tinXa.length === 1 && tinXa[0].lienKet === `#/menu/tuan/${tuan(2)}`, tinXa.map(n => [n.audience, n.lienKet]));
  }

  // =========================================================================
  console.log('\n[3] R3-11 — nạp Excel nhận tên bữa kiểu bếp trường');
  {
    const tuanNap = tuan(5);
    const tieuDeNgay = ngayCua(5).map((d, i) => `${['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'][i]}\n${ddmm(d)}`);
    const tep = (cotA) => `data:x;base64,${xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: [
      ['THỰC ĐƠN TUẦN'], ['', ...tieuDeNgay],
      ...cotA.map((ten, i) => [ten, `Món ${i}`, '', '', '', '']),
    ] }]).toString('base64')}`;
    const nap = async (cotA) => (await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: tep(cotA), tuan: tuanNap } })).data;
    const loaiCua = (d) => ((d.ngay || [])[0] || { bua: [] }).bua.map(b => b.type);

    const a = await nap(['Bữa sáng', 'Bữa phụ 9h30', 'Bữa trưa', 'Bữa phụ 15h', 'Bữa sữa chiều']);
    check('"Bữa phụ 9h30" → bữa phụ sáng; "Bữa phụ 15h" → bữa phụ chiều',
      JSON.stringify(loaiCua(a)) === JSON.stringify(['breakfast', 'snack_sang', 'lunch', 'snack', 'milk']), [loaiCua(a), a.canhBao]);
    check('…không còn lời nhắc "không phải tên bữa nào"', !(a.canhBao || []).some(c => /không phải tên bữa/.test(c)), a.canhBao);
    const gio = Object.fromEntries((a.ngay[0] || { bua: [] }).bua.map(b => [b.type, b.time]));
    check('…giờ ăn lấy theo ô tên bữa (09:30, 15:00)', gio.snack_sang === '09:30' && gio.snack === '15:00', gio);

    const b = await nap(['Ăn sáng', 'Phụ sáng', 'Ăn trưa', 'Xế', 'Sữa']);
    check('"Phụ sáng" → bữa phụ sáng; "Xế" → bữa phụ chiều',
      JSON.stringify(loaiCua(b)) === JSON.stringify(['breakfast', 'snack_sang', 'lunch', 'snack', 'milk']), [loaiCua(b), b.canhBao]);
    const c = await nap(['Bữa sáng', 'Bữa phụ\n9h30', 'Bữa trưa', 'Bữa phụ\n14h30', 'Bữa xế 16h']);
    check('"Bữa phụ" ghi giờ ở dòng dưới cũng nhận theo giờ; "Bữa xế 16h" → phụ chiều (trùng thì nhắc)',
      loaiCua(c).slice(0, 4).join() === 'breakfast,snack_sang,lunch,snack', [loaiCua(c), c.canhBao]);

    // Khuôn THÁNG (cột "Ngày" + cột bữa ở hàng tiêu đề).
    const thang = `data:x;base64,${xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang: [
      ['Ngày', 'Thứ', 'Bữa sáng', 'Bữa phụ 9h30', 'Bữa trưa', 'Bữa phụ 15h', 'Xế'],
      [`${tuanNap.slice(8, 10)}/${tuanNap.slice(5, 7)}/${tuanNap.slice(0, 4)}`, 'Thứ Hai', 'Phở', 'Sữa chua', 'Cơm', 'Bánh', ''],
    ] }]).toString('base64')}`;
    const m = (await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: thang } })).data;
    check('khuôn tháng: cột "Bữa phụ 9h30", "Bữa phụ 15h" nhận đúng bữa',
      loaiCua(m).join() === 'breakfast,snack_sang,lunch,snack', [loaiCua(m), m.canhBao]);
  }
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  donThuMucTam(DIR);
}
tongKet();
