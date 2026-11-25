// Bài canh KHO THỰC ĐƠN MẪU VÀ THỰC ĐƠN DỰ KIẾN (Đ260d).
//
// Chạy bằng:  node test/thuc-don-mau.test.mjs
//
// Góp ý 18/11: *"Thực đơn sẽ có 4 thực đơn mẫu lặp đi lặp lại… văn phòng setup
// từ thời gian này tới thời gian này dùng thực đơn 1, sau đó tự động tới 2, 3, 4
// rồi quay vòng về 1… cho quyền sửa lại thực đơn cụ thể theo từng tuần sau khi
// chọn từ thực đơn mẫu."*
//
// BA CHỖ ĐÁNG CANH NHẤT
//
//   1. Chưa có lịch nào thì MỌI THỨ Y NHƯ CŨ — bài [1] so bộ giải mới với chính
//      luật cũ "riêng cơ sở thắng chung" chép lại ở đây.
//   2. Quá khứ không bị viết lại: sửa mẫu xong, tuần đã ăn giữ đúng món đã ăn
//      (Nhật ký và thực đơn tháng trước đọc từ đó).
//   3. Gia đình được báo khi tuần sau lấy từ mẫu — không ai bấm Lưu nên đường
//      báo cũ không chạy; việc hẹn giờ thứ Sáu thay chỗ nó, và chỉ báo một lần.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo, HOM_NAY, GOC } from './_chung.mjs';
import path from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';

const { check, tongKet } = taoBoDem();
const require = createRequire(import.meta.url);

const congNgay = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const lech = (s) => (new Date(`${s}T00:00:00Z`).getUTCDay() + 6) % 7;
const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const HOM = HOM_NAY();
const T2 = congNgay(HOM, -lech(HOM));          // Thứ Hai tuần này
const tuan = (k) => congNgay(T2, 7 * k);       // Thứ Hai cách tuần này k tuần

// Năm ngày của một mẫu, món ghi rõ mẫu nào thứ mấy để đọc ra là biết ngay.
const buaMau = (nhan, i) => [
  { type: 'breakfast', label: 'Bữa sáng', time: '08:00', items: [`Sáng ${nhan} T${i + 2}`] },
  { type: 'lunch', label: 'Bữa trưa', time: '11:20', items: [`Trưa ${nhan} T${i + 2}`, 'Canh rau ngót'] },
];
const ngayMau = (nhan) => Object.fromEntries([0, 1, 2, 3, 4].map(i => [String(i), buaMau(nhan, i)]));
const trua = (m) => (((m && m.meals) || []).find(b => b.type === 'lunch') || { items: [] }).items[0] || '';

// =========================================================================
// PHẦN LÕI — gọi thẳng lib/thuc-don-mau.js trên một cơ sở dữ liệu riêng
// =========================================================================
const DIR_LIB = thuMucTam('thuc-don-mau-loi');
sinhDuLieu(DIR_LIB);
process.env.DATA_DIR = DIR_LIB;
const db = require(path.join(GOC, 'lib', 'db.js'));
const mau = require(path.join(GOC, 'lib', 'thuc-don-mau.js'));

// Luật cũ của `thucDonCua` (routes/menu.js trước Đ260d), chép nguyên để so.
function thucDonCuaCu(campusId, from, to) {
  const chung = new Map(db.all('menus', 'SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date', [from, to])
    .map(m => [m.date, { date: m.date, meals: m.meals, rieng: false }]));
  if (campusId) {
    for (const m of db.all('menu_campus', 'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ? ORDER BY date', [campusId, from, to])) {
      chung.set(m.date, { date: m.date, meals: m.meals, rieng: true, capNhatLuc: m.capNhatLuc });
    }
  }
  return [...chung.values()].sort((a, b) => a.date.localeCompare(b.date));
}
const boTuMau = (ds) => ds.map(({ tuMau, ...x }) => x);

try {
  console.log('\n[1] Chưa có lịch nào: bộ giải mới cho đúng kết quả của luật cũ');
  {
    db.upsert('menu_campus', { campusId: 'cs1', date: congNgay(T2, 1), meals: buaMau('riêng cs1', 1), nguoiDang: null, capNhatLuc: '2026-01-01T00:00:00.000Z' }, ['campusId', 'date']);
    for (const cs of [null, 'cs1', 'cs2']) {
      const moi = [...mau.giaiKhoang(cs, tuan(-1), congNgay(tuan(1), 6)).values()];
      const cu = thucDonCuaCu(cs, tuan(-1), congNgay(tuan(1), 6));
      check(`phạm vi ${cs || 'dùng chung'}: giống hệt luật cũ (${cu.length} ngày)`,
        cu.length >= 10 && JSON.stringify(boTuMau(moi)) === JSON.stringify(cu), { moi: moi.length, cu: cu.length });
      check(`phạm vi ${cs || 'dùng chung'}: mọi ngày tuMau = null`, moi.every(x => x.tuMau === null));
    }
  }

  console.log('\n[2] Xoay vòng 4 mẫu, hết vòng quay về mẫu 1; Thứ Bảy không có gì');
  const M = [];
  {
    for (let k = 1; k <= 4; k++) M.push(mau.themMau('', { ngay: ngayMau(`chung M${k}`) }).mau);
    check('bốn mẫu dùng chung đánh số 1 → 4', M.map(m => m.so).join() === '1,2,3,4', M.map(m => m.so));
    check('tên mặc định "Thực đơn N"', M[2].ten === 'Thực đơn 3', M[2].ten);
    // Đặt lịch ở xa, tránh các tuần dữ liệu mẫu đã có dòng thật.
    const kq = mau.themLich('', { tuNgay: congNgay(tuan(4), 2), denNgay: congNgay(tuan(9), 4), thuTu: M.map(m => m.id) });
    check('ngày bắt đầu giữa tuần được đưa về Thứ Hai', kq.lich && kq.lich.tuNgay === tuan(4), kq);
    const g = mau.giaiKhoang(null, tuan(4), congNgay(tuan(10), 6));
    const thu = [4, 5, 6, 7, 8].map(k => trua(g.get(congNgay(tuan(k), 2))));
    check('tuần 1→4 của đoạn lịch là M1, M2, M3, M4; tuần 5 quay về M1',
      thu.join('|') === ['chung M1', 'chung M2', 'chung M3', 'chung M4', 'chung M1'].map(x => `Trưa ${x} T4`).join('|'), thu);
    check('ngày lấy từ mẫu ghi rõ mẫu nào', JSON.stringify(g.get(tuan(5)).tuMau) === JSON.stringify({ id: M[1].id, so: 2, ten: 'Thực đơn 2' }), g.get(tuan(5)));
    check('Thứ Bảy, Chủ nhật không có thực đơn mẫu', !g.has(congNgay(tuan(4), 5)) && !g.has(congNgay(tuan(4), 6)));
    check('sau ngày kết thúc thì hết mẫu', !g.has(tuan(10)));
    check('mauTheoNgay trả đúng mẫu của một phạm vi', (mau.mauTheoNgay('', tuan(6)) || {}).mau?.so === 3);
    check('…và không lẫn sang phạm vi cơ sở', mau.mauTheoNgay('cs1', tuan(6)) === null);
  }

  console.log('\n[3] Thứ tự ưu tiên bốn lớp: riêng cơ sở → mẫu cơ sở → dùng chung → mẫu chung');
  {
    const D = congNgay(tuan(5), 1);
    const truaCua = (cs) => trua(mau.giaiKhoang(cs, D, D).get(D));
    check('lớp 4: cơ sở chưa có gì riêng thì lấy mẫu chung', truaCua('cs1') === 'Trưa chung M2 T3', truaCua('cs1'));
    db.insert('menus', { id: 'menu_thu_uu_tien', date: D, meals: buaMau('dòng chung', 1) });
    check('lớp 3: dòng dùng chung thắng mẫu chung', truaCua('cs1') === 'Trưa dòng chung T3', truaCua('cs1'));
    const mcs1 = mau.themMau('cs1', { ngay: ngayMau('cs1 A') }).mau;
    check('mẫu của cơ sở đánh số riêng, bắt đầu từ 1', mcs1.so === 1 && mcs1.campusId === 'cs1', mcs1);
    mau.themLich('cs1', { tuNgay: tuan(5), denNgay: congNgay(tuan(5), 4), thuTu: [mcs1.id] });
    check('lớp 2: mẫu theo lịch của cơ sở thắng dòng dùng chung', truaCua('cs1') === 'Trưa cs1 A T3', truaCua('cs1'));
    check('…ngày lấy từ mẫu cơ sở là "riêng"', mau.giaiKhoang('cs1', D, D).get(D).rieng === true);
    db.upsert('menu_campus', { campusId: 'cs1', date: D, meals: buaMau('sửa riêng cs1', 1), nguoiDang: null, capNhatLuc: 'x' }, ['campusId', 'date']);
    check('lớp 1: dòng riêng của cơ sở thắng tất cả', truaCua('cs1') === 'Trưa sửa riêng cs1 T3', truaCua('cs1'));
    check('cơ sở khác không bị lây: cs2 vẫn thấy dòng dùng chung', truaCua('cs2') === 'Trưa dòng chung T3', truaCua('cs2'));
    check('mẫu của phạm vi khác bị từ chối khi đặt lịch',
      !!mau.kiemLich('cs2', { tuNgay: tuan(20), denNgay: tuan(21), thuTu: [mcs1.id] }).loi);
    check('hai đoạn lịch cùng phạm vi không được chồng nhau',
      /Trùng thời gian/.test(mau.kiemLich('', { tuNgay: tuan(9), denNgay: tuan(12), thuTu: [M[0].id] }).loi || ''));
    check('ngày kết thúc trước ngày bắt đầu bị từ chối',
      !!mau.kiemLich('', { tuNgay: tuan(20), denNgay: tuan(19), thuTu: [M[0].id] }).loi);
  }

  console.log('\n[4] Đặt lịch phủ ngày đã qua: ngày chưa có thực đơn vẫn trống');
  let lichQuaKhu;
  {
    const P = mau.themMau('', { ngay: ngayMau('quá khứ') }).mau;
    lichQuaKhu = mau.themLich('', { tuNgay: tuan(-3), denNgay: congNgay(tuan(-1), 6), thuTu: [P.id] }).lich;
    const g = mau.giaiKhoang(null, tuan(-3), congNgay(tuan(-1), 6));
    check('ba tuần đã qua chưa có thực đơn: đặt lịch xong vẫn không hiện món mẫu', g.size === 0, [...g.keys()]);
    check('…và không ghi dòng thực đơn nào cho các ngày đó',
      db.count('SELECT COUNT(*) FROM menus WHERE date BETWEEN ? AND ?', [tuan(-3), congNgay(tuan(-1), 6)]) === 0);
  }

  console.log('\n[4b] chotQuaKhu: chép đúng các ngày tới mốc, không đè dòng thật');
  {
    // Giả như đoạn lịch trên đã đặt từ trước tuần (-3): các tuần đó ăn theo mẫu.
    db.update('menu_lich_xoay', lichQuaKhu.id, { capNhatLuc: `${congNgay(tuan(-3), -1)}T00:00:00.000Z` });
    check('lịch đặt từ trước: tuần (-3) lấy món mẫu', trua(mau.giaiKhoang(null, tuan(-3), tuan(-3)).get(tuan(-3))) === 'Trưa quá khứ T2');
    db.insert('menus', { id: 'menu_that_qua_khu', date: tuan(-2), meals: buaMau('đã ăn thật', 0) });
    const moc = congNgay(tuan(-2), 2);   // Thứ Tư hai tuần trước
    const soDong = mau.chotQuaKhu('', null, moc);
    const dong = (d) => db.first('menus', 'SELECT * FROM menus WHERE date = ?', [d]);
    check('ghi đúng 7 ngày: 5 ngày ba tuần trước + Thứ Ba, Thứ Tư hai tuần trước', soDong === 7, soDong);
    check('dòng thật sẵn có KHÔNG bị đè', trua(dong(tuan(-2))) === 'Trưa đã ăn thật T2', dong(tuan(-2)));
    check('ngày trong mốc nhận món của mẫu', trua(dong(congNgay(tuan(-3), 4))) === 'Trưa quá khứ T6');
    check('ngày sau mốc KHÔNG bị ghi', !dong(congNgay(tuan(-2), 3)));
    check('không ghi Thứ Bảy, Chủ nhật', !dong(congNgay(tuan(-3), 5)));
    check('chạy lại không ghi thêm gì', mau.chotQuaKhu('', null, moc) === 0);
  }
} finally {
  db.close && db.close();
}

// =========================================================================
// PHẦN API — máy chủ thật
// =========================================================================
const DIR = thuMucTam('thuc-don-mau');
sinhDuLieu(DIR);
const mkCap1 = taoQuanTri(DIR, 'Ban Giám Hiệu', 'tdm_cap1');
const mkCs2 = taoQuanTri(DIR, 'Quản lý Cơ sở 2', 'tdm_cs2');
khoaVaoCoSo(DIR, 'tdm_cs2', 'cs2');
{
  // Một bé ở nhóm cơ sở 2 (dữ liệu mẫu chưa có bé nào ở đó), con của phuhuynh2.
  const c = new Database(path.join(DIR, 'school.db'));
  c.prepare("INSERT INTO students (id, name, classId, active, createdAt) VALUES ('s_cs2', 'Bé cơ sở hai', 'c3', 1, ?)").run(new Date().toISOString());
  c.prepare("INSERT INTO student_parents (studentId, parentId) VALUES ('s_cs2', 'p2')").run();
  c.close();
}
const docCsdl = (fn) => { const c = new Database(path.join(DIR, 'school.db'), { readonly: true }); try { return fn(c); } finally { c.close(); } };
const ghiCsdl = (fn) => { const c = new Database(path.join(DIR, 'school.db')); try { return fn(c); } finally { c.close(); } };
const demThongBao = () => docCsdl(c => c.prepare('SELECT COUNT(*) AS n FROM notifications').get().n);

const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 5260), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

// Một lượt của việc hẹn giờ, gọi thẳng hàm (không chờ đồng hồ), ở tiến trình riêng.
function baoTuanSau(homNay, gio = '09:00') {
  const ra = execFileSync('node', ['-e', `
    const mau = require('./lib/thuc-don-mau');
    const kq = mau.baoTuanSau({ homNay: process.argv[1], gio: process.argv[2] });
    setTimeout(() => { require('fs').writeSync(1, '@@' + JSON.stringify(kq)); process.exit(0); }, 300);
  `, homNay, gio], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR, HEN_GIO_PHUT: '0' } });
  return JSON.parse(ra.split('@@').pop());
}

try {
  const cap1 = (await login('tdm_cap1', mkCap1)).cookie;
  const cs2 = (await login('tdm_cs2', mkCs2)).cookie;
  const ph = (await login('phuhuynh', '123456')).cookie;
  const ph2 = (await login('phuhuynh2', '123456')).cookie;
  const co = (await login('giaovien', '123456')).cookie;

  const xem = async (cookie, q) => (await req('GET', `/api/menu?${q}`, { cookie })).data;
  const tuan0Truoc = await xem(ph, 'week=0');

  console.log('\n[5] Phân quyền: gia đình và cô không ghi được gì');
  {
    const cuaDuong = [
      ['GET', '/api/menu/mau'], ['POST', '/api/menu/mau'], ['PUT', '/api/menu/mau/x'],
      ['GET', '/api/menu/mau/x/excel'], ['POST', '/api/menu/mau/x/nap-excel'],
      ['GET', '/api/menu/lich-xoay'], ['POST', '/api/menu/lich-xoay'], ['PUT', '/api/menu/lich-xoay/x'], ['POST', '/api/menu/lich-xoay/x/huy'],
    ];
    for (const [ai, cookie] of [['gia đình', ph], ['cô', co]]) {
      const kq = [];
      for (const [m, u] of cuaDuong) kq.push((await req(m, u, { cookie, body: m === 'GET' ? undefined : { ten: 'x' } })).status);
      check(`${ai}: cả 9 đường kho mẫu / lịch đều 403`, kq.every(s => s === 403), kq);
    }
  }

  console.log('\n[6] Quản lý cơ sở 2: chỉ đụng được kho của bếp mình');
  let mauCs2;
  {
    const chung = await req('POST', '/api/menu/mau', { cookie: cap1, body: { ten: 'Mẫu chung', ngay: ngayMau('chung X') } });
    check('Cấp 1 tạo được mẫu dùng chung', chung.status === 201 && chung.data.mau.campusId === null, chung);
    const sua = await req('PUT', `/api/menu/mau/${chung.data.mau.id}`, { cookie: cs2, body: { ten: 'cs2 sửa lén' } });
    check('cs2 KHÔNG sửa được mẫu dùng chung', sua.status === 403, sua);
    const sang1 = await req('POST', '/api/menu/mau', { cookie: cs2, body: { campusId: 'cs1', ten: 'x' } });
    check('cs2 KHÔNG tạo được mẫu cho bếp cơ sở 1', sang1.status === 403, sang1.status);
    const rieng = await req('POST', '/api/menu/mau', { cookie: cs2, body: { ten: 'Mẫu cs2', ngay: ngayMau('cs2 M1') } });
    check('cs2 tạo được mẫu riêng, tự neo vào cơ sở 2', rieng.status === 201 && rieng.data.mau.campusId === 'cs2' && rieng.data.mau.so === 1, rieng.data);
    mauCs2 = rieng.data.mau;
    const ds = await req('GET', '/api/menu/mau', { cookie: cs2 });
    check('kho của cs2 chỉ có mẫu của cs2', ds.status === 200 && ds.data.mau.length === 1 && ds.data.mau[0].id === mauCs2.id, ds.data);
    const lich1 = await req('POST', '/api/menu/lich-xoay', { cookie: cs2, body: { campusId: 'cs1', tuNgay: tuan(1), denNgay: tuan(2), thuTu: [mauCs2.id] } });
    check('cs2 KHÔNG đặt được lịch cho cơ sở 1', lich1.status === 403, lich1.status);
    const sai = await req('POST', '/api/menu/mau', { cookie: cap1, body: { ngay: { 0: [{ items: ['Không có tên bữa'] }] } } });
    check('mẫu có bữa thiếu tên bị từ chối, nói rõ thứ mấy', sai.status === 400 && /Thứ Hai/.test(sai.data.error), sai.data);
  }

  console.log('\n[7] Bốn mẫu của cơ sở 1, lịch bắt đầu từ tuần trước');
  const M = [];
  let lichCs1;
  const soTb0 = demThongBao();
  {
    for (let k = 1; k <= 4; k++) {
      const r = await req('POST', '/api/menu/mau', { cookie: cap1, body: { campusId: 'cs1', ngay: ngayMau(`M${k}`) } });
      M.push(r.data.mau);
    }
    check('bốn mẫu cơ sở 1, số 1 → 4', M.map(m => m && m.so).join() === '1,2,3,4', M);

    // Cơ sở 1 tắt Bữa sữa chiều; Thứ Hai tuần này (đã qua) ăn thực đơn DÙNG
    // CHUNG có bữa sữa, cô đã gửi phần ăn uống của bé s1 cho gia đình.
    const tatSua = await req('PUT', '/api/nhatky/bua-co-so', { cookie: cap1, body: { campusId: 'cs1', bua: 'milk', tat: true } });
    const ghiAn = await req('PUT', '/api/nhatky/bua', { cookie: co, body: { classId: 'c1', ngay: T2, bua: 'lunch', danhSach: [{ studentId: 's1', muc: 'het' }] } });
    const guiAn = await req('POST', '/api/nhatky/gui', { cookie: co, body: { classId: 'c1', ngay: T2, phan: 'an', studentIds: ['s1'] } });
    const nkT2 = async () => {
      const x = await req('GET', `/api/nhatky?classId=c1&ngay=${T2}`, { cookie: co });
      const be = ((x.data || {}).danhSach || []).find(b => b.studentId === 's1') || {};
      return { bua: ((x.data || {}).buaAn || []).map(b => b.bua), chuaGui: ((be.gui || {}).an || {}).chuaGui };
    };
    const nkTruoc = await nkT2();
    check('trước khi đặt lịch: Thứ Hai không có bữa sữa, phần ăn uống đã gửi',
      tatSua.status === 200 && ghiAn.status === 200 && guiAn.status === 200 && !nkTruoc.bua.includes('milk') && nkTruoc.chuaGui === false,
      { tatSua: tatSua.status, ghiAn: ghiAn.status, guiAn: guiAn.status, nkTruoc });

    const r = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: {
      campusId: 'cs1', tuNgay: tuan(-1), denNgay: congNgay(tuan(8), 4), thuTu: M.map(m => m.id) } });
    const nkSau = await nkT2();
    check('đặt lịch phủ Thứ Hai: bữa sữa cơ sở đã tắt KHÔNG hiện lại', !nkSau.bua.includes('milk'), nkSau);
    check('…nhật ký đã gửi không bị coi là sửa sau khi gửi', nkSau.chuaGui === false, nkSau);
    const t2Cs1 = ((await xem(cap1, 'week=0&campusId=cs1')).menus || []).find(m => m.date === T2) || {};
    check('…Thứ Hai vẫn là thực đơn dùng chung, không thành "riêng cơ sở"', t2Cs1.rieng === false && t2Cs1.tuMau === null, t2Cs1);
    check('…và không chép thành dòng riêng của cơ sở 1',
      docCsdl(c => c.prepare("SELECT COUNT(*) AS n FROM menu_campus WHERE campusId = 'cs1' AND date = ?").get(T2).n) === 0);
    await req('PUT', '/api/nhatky/bua-co-so', { cookie: cap1, body: { campusId: 'cs1', bua: 'milk', tat: false } });
    check('đặt được lịch xoay vòng', r.status === 201 && r.data.lich.tuNgay === tuan(-1), r.data);
    lichCs1 = r.data.lich;
    check('lưu mẫu và lịch KHÔNG gửi thông báo nào', demThongBao() === soTb0, { truoc: soTb0, sau: demThongBao() });

    const w = async (q) => (await xem(ph, q)).menus || [];
    const truocKhiLui = await w('week=-1');
    check('tuần trước chưa có thực đơn: đặt lịch phủ lên vẫn trống, không hiện món mẫu', truocKhiLui.length === 0, truocKhiLui.map(m => [m.date, trua(m)]));
    const nay = await w('week=0');
    const daQua = nay.filter(m => m.date <= HOM);
    const chuaToi = nay.filter(m => m.date > HOM);
    check('tuần này: ngày đã qua (tới hôm nay) giữ đúng món đã đăng trước khi đặt lịch',
      daQua.every(m => m.tuMau === null && JSON.stringify(m.meals) === JSON.stringify((tuan0Truoc.menus.find(x => x.date === m.date) || {}).meals)),
      daQua.map(m => [m.date, trua(m)]));
    check('tuần này: ngày chưa tới lấy Thực đơn 2', chuaToi.every(m => m.tuMau && m.tuMau.so === 2), chuaToi.map(m => m.tuMau));
    // Từ đây giả như đoạn lịch đã đặt từ trước tuần trước, để có "tuần đã ăn theo mẫu".
    ghiCsdl(c => c.prepare('UPDATE menu_lich_xoay SET capNhatLuc = ? WHERE id = ?').run(`${congNgay(tuan(-1), -1)}T00:00:00.000Z`, lichCs1.id));
    const truoc = await w('week=-1');
    check('lịch đặt từ trước: tuần trước cả 5 ngày là Thực đơn 1', truoc.length === 5 && truoc.every(m => m.tuMau && m.tuMau.so === 1), truoc.map(m => m.tuMau));
    const sau = await w('week=1');
    check('tuần sau: Thực đơn 3, mẫu cơ sở thắng dòng dùng chung của dữ liệu mẫu',
      sau.length === 5 && sau.every(m => m.tuMau && m.tuMau.so === 3) && trua(sau[0]) === 'Trưa M3 T2', sau.map(m => trua(m)));
    const xa3 = await xem(cap1, `campusId=cs1&tuan=${congNgay(tuan(3), 2)}`);
    check('quản trị mở ?tuan= +3 tuần: quay vòng về Thực đơn 1',
      xa3.from === tuan(3) && xa3.week === 3 && (xa3.menus || []).every(m => m.tuMau && m.tuMau.so === 1), { from: xa3.from, week: xa3.week });
    const phTuan = await xem(ph, `tuan=${tuan(3)}`);
    check('gia đình gửi ?tuan= thì bị bỏ qua (vẫn tuần này)', phTuan.from === T2, phTuan.from);
    const dk = await req('GET', '/api/menu/lich-xoay?campusId=cs1', { cookie: cap1 });
    check('thực đơn dự kiến: 12 tuần tới, đúng vòng 2 → 3 → 4 → 1',
      dk.status === 200 && dk.data.duKien.length === 12 && dk.data.duKien.slice(0, 4).map(x => x.mau && x.mau.so).join() === '2,3,4,1', dk.data.duKien && dk.data.duKien.slice(0, 4));
    check('…và liệt kê đoạn lịch đang chạy', dk.data.doan.length === 1 && dk.data.doan[0].id === lichCs1.id);
    const chong = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: { campusId: 'cs1', tuNgay: tuan(5), denNgay: tuan(6), thuTu: [M[0].id] } });
    check('đoạn lịch chồng lên đoạn đang có → 400, nói rõ', chong.status === 400 && /Trùng thời gian/.test(chong.data.error), chong.data);
    const lac = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: { campusId: 'cs1', tuNgay: tuan(20), denNgay: tuan(21), thuTu: [mauCs2.id] } });
    check('mẫu của cơ sở khác → 400', lac.status === 400, lac.data);
    const nguoc = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: { campusId: 'cs1', tuNgay: tuan(21), denNgay: tuan(20), thuTu: [M[0].id] } });
    check('ngày kết thúc trước ngày bắt đầu → 400', nguoc.status === 400, nguoc.data);
  }

  console.log('\n[8] Sửa riêng một tuần sau khi lấy từ mẫu');
  {
    const tuanSau = (await xem(cap1, 'week=1&campusId=cs1')).menus;
    const gui = tuanSau.map((m, i) => ({ date: m.date, meals: i === 0
      ? [{ type: 'lunch', label: 'Bữa trưa', time: '11:20', items: ['Hết táo — đổi sang lê'] }] : m.meals }));
    const soTb = demThongBao();
    const r = await req('PUT', '/api/menu/tuan', { cookie: cap1, body: { campusId: 'cs1', ngay: gui } });
    check('lưu cả tuần: 1 ngày sửa riêng, 4 ngày giống mẫu không ghi', r.status === 200 && r.data.daLuu === 1 && r.data.giongMau === 4, r.data);
    const dong = docCsdl(c => c.prepare("SELECT COUNT(*) AS n FROM menu_campus WHERE campusId = 'cs1' AND date BETWEEN ? AND ?").get(tuan(1), congNgay(tuan(1), 4)).n);
    check('chỉ đúng 1 dòng riêng được ghi', dong === 1, dong);
    check('sửa riêng một tuần VẪN báo gia đình như cũ', demThongBao() > soTb, { truoc: soTb, sau: demThongBao() });

    const m3 = await req('PUT', `/api/menu/mau/${M[2].id}`, { cookie: cap1, body: { ngay: ngayMau('M3 mới') } });
    check('sửa được Thực đơn 3', m3.status === 200, m3.data);
    const sau = (await xem(ph, 'week=1')).menus;
    check('ngày đã sửa riêng giữ nguyên', trua(sau[0]) === 'Hết táo — đổi sang lê', trua(sau[0]));
    check('bốn ngày còn lại đổi theo mẫu vừa sửa', sau.slice(1).every((m, i) => trua(m) === `Trưa M3 mới T${i + 3}`), sau.map(trua));

    const trong = await req('PUT', '/api/menu/tuan', { cookie: cap1, body: { campusId: 'cs1', ngay: [{ date: congNgay(tuan(1), 4),
      meals: [{ type: 'lunch', label: 'Bữa trưa', time: '11:20', items: [] }] }] } });
    const t6 = (await xem(ph, 'week=1')).menus.find(m => m.date === congNgay(tuan(1), 4));
    check('để trống một ngày của mẫu rồi lưu = bỏ ngày đó khỏi mẫu (ghi dòng rỗng)',
      trong.data.daLuu === 1 && t6 && t6.tuMau === null && !trua(t6), { kq: trong.data, t6 });
  }

  console.log('\n[9] Sửa mẫu không viết lại quá khứ');
  {
    const truoc = (await xem(ph, 'week=-1')).menus;
    const r = await req('PUT', `/api/menu/mau/${M[0].id}`, { cookie: cap1, body: { ngay: ngayMau('M1 mới') } });
    check('sửa được Thực đơn 1', r.status === 200);
    const sau = (await xem(ph, 'week=-1')).menus;
    check('tuần trước giữ đúng món cũ của Thực đơn 1', JSON.stringify(sau.map(m => m.meals)) === JSON.stringify(truoc.map(m => m.meals)), sau.map(trua));
    const dong = docCsdl(c => c.prepare("SELECT COUNT(*) AS n FROM menu_campus WHERE campusId = 'cs1' AND date BETWEEN ? AND ?").get(tuan(-1), congNgay(tuan(-1), 4)).n);
    check('…vì tuần trước đã được chép thành dòng thật của cơ sở 1', dong === 5, dong);
    const xa = (await xem(cap1, `campusId=cs1&tuan=${tuan(3)}`)).menus;
    check('tuần sắp tới dùng Thực đơn 1 thì đổi theo', trua(xa[0]) === 'Trưa M1 mới T2', trua(xa[0]));
  }

  console.log('\n[10] Mỗi bếp một lịch: cơ sở 2 và lịch dùng chung');
  {
    const r = await req('POST', '/api/menu/lich-xoay', { cookie: cs2, body: { tuNgay: tuan(1), denNgay: congNgay(tuan(2), 4), thuTu: [mauCs2.id] } });
    check('cs2 đặt lịch riêng', r.status === 201 && r.data.lich.campusId === 'cs2', r.data);
    const g2 = (await xem(ph2, 'week=1&campusId=cs2')).menus;
    check('gia đình cơ sở 2 thấy mẫu của bếp cơ sở 2', g2.length === 5 && g2.every(m => m.tuMau && m.tuMau.id === mauCs2.id), g2.map(m => m.tuMau));
    const g1 = (await xem(ph2, 'week=1&campusId=cs1')).menus;
    check('cùng gia đình, bé ở cơ sở 1: thấy mẫu cơ sở 1, không lẫn cơ sở 2', g1.every(m => !m.tuMau || m.tuMau.id !== mauCs2.id) && trua(g1[1]) === 'Trưa M3 mới T3', g1.map(trua));
    const mc = await req('POST', '/api/menu/mau', { cookie: cap1, body: { ngay: ngayMau('chung C1') } });
    const lc = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: { tuNgay: tuan(7), denNgay: congNgay(tuan(12), 4), thuTu: [mc.data.mau.id] } });
    check('Cấp 1 đặt lịch dùng chung', lc.status === 201 && lc.data.lich.campusId === null, lc.data);
    const t7cs1 = (await xem(cap1, `campusId=cs1&tuan=${tuan(7)}`)).menus;
    const t7cs3 = (await xem(cap1, `campusId=cs3&tuan=${tuan(7)}`)).menus;
    check('tuần cơ sở 1 có lịch riêng: lịch riêng thắng lịch chung', t7cs1.every(m => m.tuMau && m.tuMau.id !== mc.data.mau.id), t7cs1.map(m => m.tuMau));
    check('cơ sở 3 không có lịch riêng: lấy lịch dùng chung', t7cs3.length === 5 && t7cs3.every(m => m.tuMau && m.tuMau.id === mc.data.mau.id), t7cs3.map(m => m.tuMau));
    const t10cs1 = (await xem(cap1, `campusId=cs1&tuan=${tuan(10)}`)).menus;
    check('hết lịch riêng cơ sở 1 thì về lịch dùng chung', t10cs1.length === 5 && t10cs1.every(m => m.tuMau && m.tuMau.id === mc.data.mau.id), t10cs1.map(m => m.tuMau));
    const dk = await req('GET', '/api/menu/lich-xoay?campusId=cs3', { cookie: cap1 });
    const tuan7 = dk.data.duKien.find(x => x.thuHai === tuan(7));
    check('dự kiến của cơ sở 3 nói rõ là lịch dùng chung', !!tuan7 && tuan7.tuLichChung === true && tuan7.mau.id === mc.data.mau.id, tuan7);
  }

  console.log('\n[11] Tệp Excel của một mẫu: tải về, nạp lại');
  {
    const tai = await fetch(`${BASE}/api/menu/mau/${M[3].id}/excel`, { headers: { Cookie: cap1 } });
    const buf = Buffer.from(await tai.arrayBuffer());
    check('tải được tệp Excel của mẫu', tai.status === 200 && /spreadsheetml/.test(tai.headers.get('content-type') || ''), tai.status);
    const xlsx = require(path.join(GOC, 'lib', 'xlsx.js'));
    const hang = xlsx.doc(buf)[0].hang;
    check('hàng Thứ KHÔNG ghi ngày (mẫu không thuộc tuần nào)', hang[1].slice(1).join('|') === 'Thứ Hai|Thứ Ba|Thứ Tư|Thứ Năm|Thứ Sáu', hang[1]);
    const tep = `data:application/octet-stream;base64,${buf.toString('base64')}`;
    const x = await req('POST', `/api/menu/mau/${M[3].id}/nap-excel`, { cookie: cap1, body: { tep } });
    check('nạp lại đúng tệp vừa tải: xem trước 5 ngày, ngày nào cũng "không đổi"',
      x.status === 200 && x.data.ngay.length === 5 && x.data.ngay.every(n => n.khongDoi), x.data);
    const l = await req('POST', `/api/menu/mau/${M[3].id}/nap-excel`, { cookie: cap1, body: { tep, luu: true } });
    check('…lưu thì không ghi ngày nào', l.status === 200 && l.data.daGhi === 0, l.data);

    // Tệp của trường có ghi ngày của một tuần nào đó — mẫu vẫn nhận.
    const tepTruong = xlsx.ghi([{ ten: 'TD', hang: [
      ['THỰC ĐƠN'], ['', 'Thứ Hai 19/10', 'Thứ Ba 20/10', 'Thứ Tư 21/10', 'Thứ Năm 22/10', 'Thứ Sáu 23/10'],
      ['Bữa trưa', 'Cơm cá thu', '', '', '', 'Bún bò'],
    ] }]);
    const t = await req('POST', `/api/menu/mau/${M[3].id}/nap-excel`, { cookie: cap1, body: { tep: `data:x;base64,${tepTruong.toString('base64')}`, luu: true } });
    check('tệp có ghi ngày của tuần khác vẫn nạp được vào mẫu', t.status === 200 && t.data.daGhi === 2, t.data);
    const m4 = t.data.mau || { ngay: {} };
    check('Thứ Hai và Thứ Sáu đổi bữa trưa, giữ bữa sáng; ba ngày trống không đụng',
      trua({ meals: m4.ngay['0'] }) === 'Cơm cá thu' && (m4.ngay['0'] || []).some(b => b.type === 'breakfast')
      && trua({ meals: m4.ngay['4'] }) === 'Bún bò' && trua({ meals: m4.ngay['2'] }) === 'Trưa M4 T4', m4.ngay);
    const thang = xlsx.ghi([{ ten: 'TD', hang: [['Ngày', 'Thứ', 'Bữa trưa'], ['05/10/2026', 'Thứ Hai', 'Cơm']] }]);
    const sai = await req('POST', `/api/menu/mau/${M[3].id}/nap-excel`, { cookie: cap1, body: { tep: `data:x;base64,${thang.toString('base64')}` } });
    check('tệp khuôn tháng → 400 "dùng khuôn tuần"', sai.status === 400 && /khuôn tuần/.test(sai.data.error), sai.data);

    // Tệp Excel của một TUẦN lấy từ mẫu: tải về rồi nạp lại không biến cả tuần thành "sửa riêng".
    const tw = await fetch(`${BASE}/api/menu/mau-excel?tuan=${tuan(4)}&campusId=cs1`, { headers: { Cookie: cap1 } });
    const bufTuan = Buffer.from(await tw.arrayBuffer());
    const soTb = demThongBao();
    const nap = await req('POST', '/api/menu/nap-excel', { cookie: cap1, body: { campusId: 'cs1', tuan: tuan(4), tep: `data:x;base64,${bufTuan.toString('base64')}`, luu: true } });
    const dongTuan = docCsdl(c => c.prepare("SELECT COUNT(*) AS n FROM menu_campus WHERE campusId = 'cs1' AND date BETWEEN ? AND ?").get(tuan(4), congNgay(tuan(4), 4)).n);
    check('nạp lại tệp tuần lấy từ mẫu: không ghi ngày nào, không báo gia đình',
      nap.status === 200 && nap.data.daGhi === 0 && dongTuan === 0 && demThongBao() === soTb, { kq: nap.data, dongTuan });
  }

  console.log('\n[12] Huỷ lịch: giữ dòng, quá khứ giữ món');
  {
    const r = await req('POST', `/api/menu/lich-xoay/${lichCs1.id}/huy`, { cookie: cap1 });
    check('huỷ được đoạn lịch', r.status === 200, r.data);
    const conDong = docCsdl(c => c.prepare('SELECT huy FROM menu_lich_xoay WHERE id = ?').get(lichCs1.id));
    check('dòng lịch còn nguyên, chỉ đặt cờ huỷ', conDong && conDong.huy === 1, conDong);
    const truoc = (await xem(ph, 'week=-1')).menus;
    check('tuần trước vẫn hiện món đã ăn', truoc.length === 5 && trua(truoc[0]) === 'Trưa M1 T2', truoc.map(trua));
    const sau = (await xem(ph, 'week=1')).menus;
    check('tuần sau: ngày sửa riêng còn, ngày lấy từ mẫu quay về bản dùng chung',
      trua(sau[0]) === 'Hết táo — đổi sang lê' && sau.slice(1, 4).every(m => m.tuMau === null && !/M3/.test(trua(m))), sau.map(trua));
    const lai = await req('POST', `/api/menu/lich-xoay/${lichCs1.id}/huy`, { cookie: cap1 });
    check('huỷ lần hai → 404', lai.status === 404);
    const lich = await req('POST', '/api/menu/lich-xoay', { cookie: cap1, body: {
      campusId: 'cs1', tuNgay: tuan(2), denNgay: congNgay(tuan(5), 4), thuTu: M.map(m => m.id) } });
    check('đặt lại lịch mới từ tuần +2', lich.status === 201, lich.data);
    const sua = await req('PUT', `/api/menu/lich-xoay/${lich.data.lich.id}`, { cookie: cap1, body: { denNgay: congNgay(tuan(3), 4) } });
    check('rút ngắn lịch được', sua.status === 200 && sua.data.lich.denNgay === congNgay(tuan(3), 4), sua.data);
    const ngoai = (await xem(cap1, `campusId=cs1&tuan=${tuan(4)}`)).menus;
    check('tuần sau ngày kết thúc mới không còn thực đơn mẫu', ngoai.length === 0, ngoai.map(m => m.tuMau));
  }

  console.log('\n[13] Nhật ký: bữa ăn của bé mang món từ mẫu; tắt Thực đơn thì thôi');
  {
    const ngayNk = congNgay(tuan(-1), 2);
    const r = await req('GET', `/api/nhatky?classId=c1&ngay=${ngayNk}`, { cookie: co });
    const bua = ((r.data || {}).buaAn || []).find(b => b.bua === 'lunch') || {};
    check('nhật ký ngày lấy từ mẫu: bữa trưa có món của Thực đơn 1', r.status === 200 && (bua.mon || [])[0] === 'Trưa M1 T4', { status: r.status, bua });
    // Xem theo khoảng ngày của một bé (đường đọc thứ hai của Nhật ký).
    const ghi = await req('PUT', '/api/nhatky/bua', { cookie: co, body: { classId: 'c1', ngay: ngayNk, bua: 'lunch', danhSach: [{ studentId: 's1', muc: 'het' }] } });
    const be = await req('GET', `/api/nhatky?studentId=s1&tu=${ngayNk}&den=${ngayNk}`, { cookie: co });
    const buaBe = ((((be.data || {}).ngayCo || [])[0] || {}).buaAn || []).find(b => b.bua === 'lunch') || {};
    check('nhật ký của bé theo khoảng ngày: bữa trưa mang món của mẫu kèm mức ăn',
      ghi.status === 200 && (buaBe.mon || [])[0] === 'Trưa M1 T4' && buaBe.muc === 'het', { ghi: ghi.status, buaBe });
    ghiCsdl(c => c.prepare("INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt) VALUES ('thucdon', 0, ?)").run(new Date().toISOString()));
    const tat = await req('GET', `/api/nhatky?classId=c1&ngay=${ngayNk}`, { cookie: co });
    const buaTat = ((tat.data || {}).buaAn || []).find(b => b.bua === 'lunch') || {};
    check('tắt Thực đơn: nhật ký không còn món', tat.status === 200 && !(buaTat.mon || []).length, buaTat);
    check('tắt Thực đơn: việc hẹn giờ thứ Sáu không gửi gì', baoTuanSau(congNgay(tuan(1), 4)).length === 0);
    ghiCsdl(c => c.prepare("INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt) VALUES ('thucdon', 1, ?)").run(new Date().toISOString()));
  }

  console.log('\n[14] Thứ Sáu báo gia đình "Thực đơn tuần sau đã có" — đúng một lần');
  {
    // Thứ Sáu của tuần +1 → báo cho tuần +2 (cơ sở 1: Thực đơn 1 theo lịch mới; cơ sở 2: mẫu cs2).
    const thuSau = congNgay(tuan(1), 4);
    const tieuDe = `Thực đơn tuần từ ${ddmm(tuan(2))} đã có`;
    const demTieuDe = () => docCsdl(c => c.prepare('SELECT audience FROM notifications WHERE title = ? ORDER BY audience').all(tieuDe).map(r => r.audience));
    check('thứ Năm: chưa gửi', baoTuanSau(congNgay(tuan(1), 3)).length === 0 && demTieuDe().length === 0);
    check('thứ Sáu trước 8 giờ sáng: chưa gửi', baoTuanSau(thuSau, '06:30').length === 0 && demTieuDe().length === 0);
    const kq = baoTuanSau(thuSau);
    check('thứ Sáu: báo cho cơ sở 1 và cơ sở 2 (cùng có tuần sau lấy từ mẫu)', kq.includes('cs1') && kq.includes('cs2'), kq);
    const nhan = demTieuDe();
    check('mọi nhóm của cơ sở 1 và nhóm cơ sở 2 nhận tin', ['c1', 'c2', 'c3', 'c4'].every(c => nhan.includes(c)), nhan);
    const hash = docCsdl(c => c.prepare('SELECT COUNT(*) AS n FROM menu_mau_bao WHERE thuHai = ?').get(tuan(2)).n);
    check('ghi dấu đã báo theo (cơ sở, tuần)', hash >= 2, hash);
    check('đồng hồ gọi lại (cùng hôm, hôm sau): KHÔNG gửi lần hai',
      baoTuanSau(thuSau, '15:00').length === 0 && baoTuanSau(congNgay(thuSau, 1)).length === 0 && demTieuDe().length === nhan.length, demTieuDe());
    const tuanKhong = congNgay(tuan(20), 4);
    check('tuần sau không lấy từ mẫu: không gửi', baoTuanSau(tuanKhong).length === 0);
    const viec = execFileSync('node', ['-e', `
      require('./routes/menu')(require('express')());
      require('fs').writeSync(1, '@@' + JSON.stringify(require('./lib/hen-gio').danhSach().map(v => v.ten)));
      process.exit(0);`], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
    check('việc "thucdon:bao-tuan-sau" có đăng ký với đồng hồ của máy chủ', JSON.parse(viec.split('@@').pop()).includes('thucdon:bao-tuan-sau'));
  }
} finally {
  dung();
  donThuMucTam(DIR);
  donThuMucTam(DIR_LIB);
}
tongKet();
