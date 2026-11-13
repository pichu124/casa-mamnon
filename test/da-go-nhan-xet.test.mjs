// Bài canh: MÃ CỦA "NHẬN XÉT HẰNG NGÀY" ĐÃ GỠ HẲN, DỮ LIỆU CỦA NÓ CÒN NGUYÊN.
//
// Chạy bằng:  node test/da-go-nhan-xet.test.mjs
//
// VÌ SAO CÓ BÀI NÀY
//
// Đợt Đ252 đi BƯỚC 2 của "Bỏ một tính năng" trong CLAUDE.md cho phân hệ lõi
// `nhanxet` (di sản app tiểu học; nhà trường bảo bỏ ở docs/PHAN-HOI-TRUONG-0709.md
// mục BO-01, "Ghi nhanh" đã thay; tắt sẵn từ 27/08; chủ dự án duyệt gỡ 12/11):
// xoá `routes/remarks.js` và `public/js/views/remarks.js`, GIỮ NGUYÊN bảng
// `remarks`.
//
// Bước 2 có hai lời hứa, và bài này canh cả hai bằng máy:
//
//   1. MÃ HẾT THẬT. Không còn đường API, không còn ô trong Quản trị → Tính
//      năng, không còn tệp giao diện trong vỏ PWA, và không màn nào khác đọc
//      bảng `remarks` để bày ra — gỡ một tính năng mà dữ liệu của nó vẫn chảy
//      ra ở màn khác thì chưa gọi là gỡ.
//   2. DỮ LIỆU KHÔNG MẤT MỘT DÒNG. Máy đã có nhận xét từ trước — kể cả máy mà
//      nhà trường từng BẬT phân hệ này — phải khởi động được, đăng nhập được,
//      và từng dòng trong bảng `remarks` còn y nguyên qua khởi động lại, sao
//      lưu, khôi phục (Nguyên tắc số 1).
//
// Bài dựng đúng cái máy cũ ấy: chèn tay vài dòng vào `remarks`, một cờ thu hồi
// trong bảng phụ `record_edits`, và một dòng BẬT `nhanxet` trong
// `module_settings` — ghi thẳng bằng better-sqlite3, vì đó là thứ nằm sẵn
// trong tệp dữ liệu của máy cũ chứ không phải thứ máy chủ mới ghi ra.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DIR = thuMucTam('da-go-nhan-xet');
sinhDuLieu(DIR);
const DB_FILE = path.join(DIR, 'school.db');

// Bốn tính năng chủ dự án GIỮ. Gỡ Nhận xét không được kéo theo cái nào.
const GIU = [
  { key: 'nenep', api: '/api/conduct?studentId=s1' },
  { key: 'baocao', api: '/api/reports?studentId=s1' },
  { key: 'xebuyt', api: '/api/bus' },
  { key: 'hocsinhcu', api: '/api/hocsinh-cu' },
];

const docBang = (tep, sql) => {
  const conn = new Database(tep, { readonly: true });
  try { return conn.prepare(sql).all(); } finally { conn.close(); }
};
const dongNhanXet = (tep = DB_FILE) => JSON.stringify(docBang(tep, 'SELECT * FROM remarks ORDER BY id'));
const coThuHoi = (tep = DB_FILE) => JSON.stringify(docBang(tep,
  "SELECT * FROM record_edits WHERE bang = 'remarks' ORDER BY recordId"));

// ===========================================================================
console.log('\n[0] Dựng một MÁY CŨ: có nhận xét từ trước và phân hệ đang BẬT');
const soDongMau = docBang(DB_FILE, 'SELECT COUNT(*) n FROM remarks')[0].n;
check('dữ liệu mẫu THÔI sinh nhận xét — bảng `remarks` của máy mới trống',
  soDongMau === 0, soDongMau);
{
  const conn = new Database(DB_FILE);
  const them = conn.prepare(
    `INSERT INTO remarks (id, studentId, teacherId, date, content, rating, skills, parentSeen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  // Bốn dòng, mỗi dòng một tình huống của máy cũ: chưa xem, đã xem, đã bị cô
  // thu hồi, và của một bé nhà khác.
  them.run('rm_cu_1', 's1', 't1', '2026-08-20', 'Con tự cất dép vào đúng ô của mình.', 'great', '["Tự phục vụ"]', 0);
  them.run('rm_cu_2', 's1', 't1', '2026-08-21', 'Con rủ bạn cùng xếp khối gỗ.', 'good', '[]', 1);
  them.run('rm_cu_3', 's1', 't1', '2026-08-22', 'Dòng cô đã thu hồi.', 'good', '[]', 0);
  them.run('rm_cu_4', 's4', 't2', '2026-08-22', 'Con ngủ trưa một mạch.', null, null, 0);
  conn.prepare(
    `INSERT INTO record_edits (bang, recordId, thuHoi, thuHoiLuc, thuHoiBoi)
     VALUES ('remarks', 'rm_cu_3', 1, '2026-08-22T09:00:00.000Z', 't1')`).run();
  conn.prepare(
    'INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt) VALUES (?, 1, ?)')
    .run('nhanxet', '2026-08-20T01:00:00.000Z');
  conn.close();
}
const DONG_BAN_DAU = dongNhanXet();
const CO_BAN_DAU = coThuHoi();
check('máy cũ có bốn dòng nhận xét và một cờ thu hồi',
  JSON.parse(DONG_BAN_DAU).length === soDongMau + 4 && JSON.parse(CO_BAN_DAU).length === 1,
  [JSON.parse(DONG_BAN_DAU).length, JSON.parse(CO_BAN_DAU).length]);

const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7341), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// ===========================================================================
console.log('\n[1] App vẫn khởi động và vẫn đăng nhập được');
const hz = await fetch(`${sv.BASE}/healthz`);
check('/healthz trả lời ổn', hz.ok, hz.status);
const d0 = await login('hieutruong', mkQT);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const dnQT = await login('hieutruong', 'quantri2026');
const dnGV = await login('giaovien', '123456');
const dnPH = await login('phuhuynh', '123456');
check('quản trị đăng nhập được', dnQT.status === 200 && !!dnQT.cookie, dnQT.status);
check('cô đăng nhập được', dnGV.status === 200 && !!dnGV.cookie, dnGV.status);
check('phụ huynh đăng nhập được', dnPH.status === 200 && !!dnPH.cookie, dnPH.status);
const VAI = [['quản trị', dnQT.cookie], ['cô', dnGV.cookie], ['phụ huynh', dnPH.cookie]];

// ===========================================================================
console.log('\n[2] Đường /api/remarks ĐÃ HẾT với mọi vai — kể cả trên máy từng bật');
{
  const LOI_GOI = [
    ['GET', '/api/remarks?studentId=s1'],
    ['GET', '/api/remarks/class'],
    ['POST', '/api/remarks', { studentId: 's1', content: 'thử ghi' }],
    ['PUT', '/api/remarks/rm_cu_1', { content: 'thử sửa' }],
    ['DELETE', '/api/remarks/rm_cu_1'],
  ];
  for (const [ten, cookie] of VAI) {
    for (const [cach, duong, body] of LOI_GOI) {
      const r = await req(cach, duong, { cookie, body });
      // Phải là 404 của "không có đường này", KHÔNG phải 404 của "phân hệ đang
      // tắt": câu sau nghĩa là mã vẫn nằm đó, chỉ chờ một công tắc.
      check(`${ten}: ${cach} ${duong} → 404, không còn mã nào trả lời`,
        r.status === 404 && r.data?.error === 'Không tìm thấy API', [r.status, r.data]);
    }
  }
}

// ===========================================================================
console.log('\n[3] Quản trị → Tính năng không còn dòng ma, bốn tính năng được giữ vẫn tắt sẵn');
{
  const adm = await req('GET', '/api/admin/modules', { cookie: dnQT.cookie });
  const ds = Array.isArray(adm.data) ? adm.data : [];
  check('danh sách tính năng của quản trị trả về bình thường',
    adm.status === 200 && ds.length > 10, [adm.status, ds.length]);
  check('KHÔNG còn `nhanxet` trong Quản trị → Tính năng',
    !ds.some(m => m.key === 'nhanxet'), ds.map(m => m.key));
  check('và không mục nào còn giữ vùng /api/remarks',
    !ds.some(m => (m.api || []).some(a => /remarks/.test(a))), ds.filter(m => (m.api || []).some(a => /remarks/.test(a))));
  check('không tính năng nào bị đánh dấu sự cố vì việc gỡ này',
    ds.every(m => !m.loi), ds.filter(m => m.loi).map(m => [m.key, m.loi]));

  for (const [ten, cookie] of VAI) {
    const r = await req('GET', '/api/modules', { cookie });
    check(`${ten}: lưới trang chủ không có ô Nhận xét`,
      r.status === 200 && r.data.length > 0 && !r.data.some(m => m.key === 'nhanxet' || m.view === 'remarks'),
      [r.status, (r.data || []).map?.(m => m.key)]);
  }
  const viSao = await req('GET', '/api/modules/vi-sao/remarks', { cookie: dnPH.cookie });
  check('hỏi vì sao không mở được màn cũ → "không có màn này", không phải "trường tắt"',
    viSao.status === 200 && viSao.data?.ly === 'khong-co', viSao.data);
  const batLai = await req('PUT', '/api/admin/modules/nhanxet', { cookie: dnQT.cookie, body: { enabled: true } });
  check('bật một khoá không còn tồn tại → từ chối tử tế, máy chủ không sập',
    batLai.status === 400 && (await fetch(`${sv.BASE}/healthz`)).ok, [batLai.status, batLai.data]);

  for (const g of GIU) {
    const m = ds.find(x => x.key === g.key);
    check(`${g.key} VẪN có trong danh sách và vẫn TẮT SẴN`,
      !!m && m.enabled === false && !m.loi, m);
    const tat = await req('GET', g.api, { cookie: dnPH.cookie });
    check(`${g.key}: đang tắt thì API vẫn là 404 "nhà trường tắt" — mã còn đó`,
      tat.status === 404 && /đang được nhà trường tắt/.test(tat.data?.error || ''), [tat.status, tat.data]);
    // Bật lại là chạy như cũ — gỡ Nhận xét không được làm hỏng đường quay lại
    // của bốn tính năng này.
    await req('PUT', `/api/admin/modules/${g.key}`, { cookie: dnQT.cookie, body: { enabled: true } });
    const bat = await req('GET', g.api, { cookie: dnPH.cookie });
    check(`${g.key}: bật lên là API chạy lại`, bat.status === 200, [bat.status, bat.data]);
    await req('PUT', `/api/admin/modules/${g.key}`, { cookie: dnQT.cookie, body: { enabled: false } });
  }
  const sau = (await req('GET', '/api/admin/modules', { cookie: dnQT.cookie })).data || [];
  check('trả cả bốn về trạng thái tắt như lúc đầu',
    GIU.every(g => sau.find(x => x.key === g.key)?.enabled === false),
    GIU.map(g => [g.key, sau.find(x => x.key === g.key)?.enabled]));
}

// ===========================================================================
console.log('\n[4] Trang chủ của ba vai vẫn mở được');
{
  const trang = await fetch(`${sv.BASE}/`);
  check('trang vỏ ứng dụng trả 200', trang.status === 200, trang.status);
  for (const [ten, cookie] of VAI) {
    const b = await req('GET', '/api/dashboard/badges', { cookie });
    check(`${ten}: huy hiệu trang chủ trả 200 và vẫn đếm thông báo`,
      b.status === 200 && typeof b.data?.thongbao === 'number', [b.status, b.data]);
    check(`${ten}: huy hiệu không còn con số của Nhận xét`,
      b.status === 200 && !('nhanxet' in (b.data || {})), b.data);
  }
  const bPH = (await req('GET', '/api/dashboard/badges', { cookie: dnPH.cookie })).data || {};
  check('phụ huynh: các huy hiệu khác của trang chủ còn đủ',
    typeof bPH.nhantin === 'number' && typeof bPH.diemdanh === 'number' && typeof bPH.khaosat === 'number', bPH);
  const homNay = await req('GET', '/api/dashboard/hom-nay', { cookie: dnGV.cookie });
  check('cô: phần "hôm nay" của trang chủ trả 200', homNay.status === 200, homNay.status);
  const tongQuan = await req('GET', '/api/dashboard/tong-quan', { cookie: dnQT.cookie });
  check('quản trị: phần tổng quan của trang chủ trả 200', tongQuan.status === 200, tongQuan.status);
}

// ===========================================================================
console.log('\n[5] DỮ LIỆU GIỮ NGUYÊN TỪNG DÒNG — chạy, khởi động lại, sao lưu, khôi phục');
{
  check('sau khi máy chủ chạy và được gọi đủ kiểu: bảng `remarks` y nguyên',
    dongNhanXet() === DONG_BAN_DAU, dongNhanXet());
  check('cờ thu hồi trong bảng phụ `record_edits` y nguyên', coThuHoi() === CO_BAN_DAU, coThuHoi());

  await sv.khoiDongLai();
  check('khởi động lại xong vẫn trả lời', (await fetch(`${sv.BASE}/healthz`)).ok);
  check('và vẫn đăng nhập được', (await login('phuhuynh', '123456')).status === 200);
  check('sau khởi động lại: bảng `remarks` y nguyên', dongNhanXet() === DONG_BAN_DAU, dongNhanXet());
  check('sau khởi động lại: cờ thu hồi y nguyên', coThuHoi() === CO_BAN_DAU, coThuHoi());

  const caiDat = docBang(DB_FILE, "SELECT * FROM module_settings WHERE moduleKey = 'nhanxet'");
  check('dòng cài đặt cũ của `nhanxet` không bị xoá — gỡ mã, không gỡ dữ liệu',
    caiDat.length === 1 && caiDat[0].enabled === 1, caiDat);
  const luocDo = docBang(DB_FILE,
    "SELECT name FROM sqlite_master WHERE name IN ('remarks', 'idx_remarks_student', 'idx_remarks_unseen')")
    .map(r => r.name).sort();
  check('bảng `remarks` và hai chỉ mục của nó vẫn nằm trong lược đồ',
    luocDo.join(',') === 'idx_remarks_student,idx_remarks_unseen,remarks', luocDo);

  // Sao lưu → mất dữ liệu → khôi phục. Khôi phục đòi máy chủ đã dừng hẳn.
  sv.dung();
  await new Promise(r => setTimeout(r, 1500));
  const O_NGOAI = path.join(DIR, 'o-ngoai');
  const chay = (script, ...a) => spawnSync('node', [path.join(GOC, 'scripts', script), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
  const sl = chay('backup.js', '--out', O_NGOAI);
  check('sao lưu chạy xong không lỗi', sl.status === 0, (sl.stdout + sl.stderr).slice(-300));
  const tepSao = fs.existsSync(O_NGOAI)
    ? fs.readdirSync(O_NGOAI).filter(f => f.endsWith('.db.gz')).sort().pop() : null;
  check('có tệp sao lưu', !!tepSao, fs.existsSync(O_NGOAI) ? fs.readdirSync(O_NGOAI) : null);
  if (tepSao) {
    const giaiNen = path.join(DIR, 'ban-sao-mo-ra.db');
    fs.writeFileSync(giaiNen, zlib.gunzipSync(fs.readFileSync(path.join(O_NGOAI, tepSao))));
    check('BẢN SAO LƯU mang đủ từng dòng nhận xét', dongNhanXet(giaiNen) === DONG_BAN_DAU, dongNhanXet(giaiNen));
    check('và mang đủ cờ thu hồi', coThuHoi(giaiNen) === CO_BAN_DAU, coThuHoi(giaiNen));

    const conn = new Database(DB_FILE);
    conn.exec("DELETE FROM remarks; DELETE FROM record_edits WHERE bang = 'remarks';");
    conn.close();
    check('(đối chứng) đã làm mất dữ liệu thật trước khi khôi phục', dongNhanXet() === '[]', dongNhanXet());
    const kp = chay('restore.js', path.join(O_NGOAI, tepSao));
    check('khôi phục chạy xong không lỗi', kp.status === 0, (kp.stdout + kp.stderr).slice(-400));
    check('SAU KHÔI PHỤC: bảng `remarks` về đủ từng dòng', dongNhanXet() === DONG_BAN_DAU, dongNhanXet());
    check('SAU KHÔI PHỤC: cờ thu hồi về đủ', coThuHoi() === CO_BAN_DAU, coThuHoi());
  }
}

// ===========================================================================
console.log('\n[6] Mã đã gỡ hẳn khỏi kho, và không màn nào khác bày bảng `remarks` ra');
{
  const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
  check('routes/remarks.js không còn', !fs.existsSync(path.join(GOC, 'routes', 'remarks.js')));
  check('public/js/views/remarks.js không còn', !fs.existsSync(path.join(GOC, 'public', 'js', 'views', 'remarks.js')));
  check('public/index.html không còn nạp remarks.js', !/remarks\.js/.test(doc('public/index.html')));
  check('public/sw.js không còn lưu sẵn remarks.js', !/remarks\.js/.test(doc('public/sw.js')));

  const mods = require(path.join(GOC, 'lib', 'modules.js'));
  check('bảng CORE của lib/modules.js không còn mục `nhanxet`',
    mods.CORE.length > 10 && !mods.CORE.some(m => m.key === 'nhanxet' || m.view === 'remarks'
      || (m.api || []).includes('/api/remarks')), mods.CORE.map(m => m.key));
  for (const g of GIU) {
    const m = mods.CORE.find(x => x.key === g.key);
    check(`CORE vẫn có \`${g.key}\`, vẫn khai tắt sẵn, và tệp route của nó còn`,
      !!m && m.defaultEnabled === false && fs.existsSync(path.join(GOC, 'routes', mods.tepRoute(m))), m);
  }

  // KHÔNG MÀN NÀO KHÁC ĐƯỢC ĐỌC BẢNG `remarks`.
  //
  // Phân hệ còn sống thì `test/phan-he-doc-cheo.test.mjs` đòi mọi chỗ đọc chéo
  // phải hỏi công tắc. Phân hệ đã gỡ thì không còn công tắc nào để hỏi — nên
  // luật thành tuyệt đối: không tệp route nào được đụng tới bảng này. Chỉ
  // `lib/importer.js` còn nhắc tên nó, ở đúng một chỗ: danh sách DỌN bảng của
  // `seed --force` (bỏ ra thì để lại dòng mồ côi của bé đã bị xoá).
  const DUNG_BANG = /\b(?:FROM|JOIN|INTO|UPDATE)\s+remarks\b|\bdb\.\w+\(\s*['"`]remarks['"`]|['"`]remarks['"`]\s*,/i;
  const boChuThich = (src) => src.split('\n').filter(d => !/^\s*(\/\/|\*|\/\*)/.test(d)).join('\n');
  const tepRoute = [
    ...fs.readdirSync(path.join(GOC, 'routes')).filter(f => f.endsWith('.js')).map(f => `routes/${f}`),
    ...fs.readdirSync(path.join(GOC, 'modules'), { withFileTypes: true }).filter(d => d.isDirectory())
      .map(d => `modules/${d.name}/routes.js`).filter(t => fs.existsSync(path.join(GOC, t))),
  ];
  check('có đủ tệp route để soi — không phải bài chạy trong khoảng không', tepRoute.length > 30, tepRoute.length);
  const conDoc = tepRoute.filter(t => DUNG_BANG.test(boChuThich(doc(t))));
  check('KHÔNG tệp route nào còn đọc hay ghi bảng `remarks`', conDoc.length === 0, conDoc);
  check('(phép thử ngược) bộ dò bắt được một câu đọc bảng viết theo cả ba kiểu',
    DUNG_BANG.test('db.all(`SELECT * FROM remarks WHERE studentId = ?`)')
      && DUNG_BANG.test("db.first('remarks', sql)")
      && DUNG_BANG.test("st.ganDauDaSua('remarks', rows)")
      && !DUNG_BANG.test('// lời cô nhận xét (remarks) đã gỡ')
      && !DUNG_BANG.test("nhanXet: m.nhanXet, ghiChu: 'x'"));
  check('lib/importer.js vẫn DỌN bảng `remarks` khi nạp lại dữ liệu mẫu',
    /'remarks'/.test(boChuThich(doc('lib/importer.js'))));
  check('nhưng thôi NẠP dòng nào vào bảng đó',
    !/db\.insert\(\s*'remarks'/.test(doc('lib/importer.js')) && !/\bremarks\s*[,}]/.test(boChuThich(doc('data/seed.js'))));
}

donThuMucTam(DIR);
tongKet();
