// Bài canh LỊCH SỬ CÁC THÁNG TRƯỚC của Kế hoạch của bé (góp ý 20/10, N3).
//
// Chạy bằng:  node test/phan-hoi-2010-ke-hoach-lich-su.test.mjs
//
//   [A] Mỗi bé trong `GET /api/kehoachbe` có thêm `lichSu`: tối đa 3 tháng gần
//       nhất TRƯỚC tháng đang xem, lùi tối đa 12 tháng, tháng mới nhất trước.
//       Có trạng thái duyệt, bài kèm nhãn và mục chữ tự do — KHÔNG có mức độ.
//   [B] Khoá cũ `goiY` / `goiYPhanTrong` giữ nguyên hình dạng.
//   [C] Quyền: cô nhóm khác 403, phụ huynh 403 — y như đường cũ.
//   [D] Quy mô: 60 bé × 3 tháng × 10 bài — số truy vấn không tăng theo số tháng
//       lịch sử (gom theo nhóm, không hỏi từng bé).
//   [E] Bảng lĩnh vực con hỏng giữa lúc chạy: màn chính vẫn đọc được.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, GOC,
} from './_chung.mjs';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const THANG = HOM_NAY().slice(0, 7);
function lui(thang, n) {
  const [y, m] = thang.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7);
}
const SCHEMA = fs.readFileSync(path.join(GOC, 'modules', 'kehoachbe', 'schema.sql'), 'utf8');
const LUC = '2026-09-10T00:00:00.000Z';

// Ghi thẳng một kế hoạch đã có từ trước: [studentId, classId, tháng, trạng thái,
// bài [id, nhãn], mục chữ [góc, nội dung]].
function ghiKe(c, keId, studentId, classId, thang, trangThai, bai = [], muc = []) {
  c.prepare(`INSERT INTO kehoachbe_ke (id, studentId, classId, thang, trangThai, coLap, lapLuc, yKienDuyet, capNhatLuc)
             VALUES (?, ?, ?, ?, ?, 't1', ?, '', ?)`).run(keId, studentId, classId, thang, trangThai, LUC, LUC);
  bai.forEach(([baiHocId, nhan, them = {}], i) => {
    c.prepare(`INSERT INTO kehoachbe_muc_bai (id, keId, baiHocId, nhan, ketQua, nhanXet, tiepTucThangSau, capNhatLuc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(`${keId}_b${i}`, keId, baiHocId, nhan, them.ketQua || '', them.nhanXet || '', them.tiepTuc ? 1 : 0, LUC);
    if (them.mucDo) {
      c.prepare('INSERT INTO kehoachbe_bai_muc_do (mucBaiId, mucDo, tiepTuc, nguoiGhi, capNhatLuc) VALUES (?, ?, \'\', \'t1\', ?)')
        .run(`${keId}_b${i}`, them.mucDo, LUC);
    }
  });
  muc.forEach(([goc, noiDung], i) => {
    c.prepare(`INSERT INTO kehoachbe_muc (id, keId, gocLinhVuc, noiDung, ketQua, nhanXet, tiepTucThangSau, capNhatLuc)
               VALUES (?, ?, ?, ?, '', '', 0, ?)`).run(`${keId}_m${i}`, keId, goc, noiDung, LUC);
  });
}

// ===========================================================================
// [A]–[C] QUA MÁY CHỦ THẬT
// ===========================================================================
{
  const DIR = thuMucTam('phan-hoi-2010-ke-hoach-lich-su');
  sinhDuLieu(DIR);
  batPhanHe(DIR, ['kehoachbe']);
  const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'khls_ht');

  const c = new Database(path.join(DIR, 'school.db'));
  try {
    c.exec(SCHEMA);
    const bai = c.prepare(`INSERT INTO kehoachbe_baihoc (id, gocLinhVuc, ten, moTa, thuTu, active, nguoiTao, taoLuc)
                           VALUES (?, ?, ?, '', ?, ?, NULL, ?)`);
    bai.run('khls_gay_so', 'toan', 'Gậy số', 0, 1, LUC);
    bai.run('khls_shapes', 'cambridge', 'Shapes', 0, 1, LUC);
    bai.run('khls_an', 'giac-quan', 'Tháp hồng', 0, 0, LUC);   // bài đã ẩn
    c.prepare("INSERT INTO kehoachbe_baihoc_con (baiHocId, linhVucCon, capNhatLuc) VALUES ('khls_shapes', 'cam-toan', ?)").run(LUC);

    ghiKe(c, 'khls_s1_m0', 's1', 'c1', THANG, 'nhap', [['khls_gay_so', 'hoc-moi']], [['toan', 'THÁNG ĐANG XEM']]);
    ghiKe(c, 'khls_s1_m1', 's1', 'c1', lui(THANG, 1), 'da-duyet', [
      ['khls_gay_so', 'hoc-moi', { ketQua: 'da-thay', mucDo: 'da-vung', nhanXet: 'Nhận xét riêng của cô' }],
      ['khls_shapes', 'on-tap'],
      ['khls_an', 'mo-rong'],
      ['khls_da_go', 'on-tap'],
    ], [['toan', 'Đếm đồ vật đến 10'], ['tieng-viet', 'Kể lại chuyện Thỏ con']]);
    ghiKe(c, 'khls_s1_m2', 's1', 'c1', lui(THANG, 2), 'cho-duyet', [['khls_shapes', 'hoc-moi']]);
    ghiKe(c, 'khls_s1_m3', 's1', 'c1', lui(THANG, 3), 'nhap', [], [['van-hoa', 'Bốn mùa']]);
    ghiKe(c, 'khls_s1_m4', 's1', 'c1', lui(THANG, 4), 'tra-lai', [['khls_gay_so', 'on-tap']]);
    ghiKe(c, 'khls_s1_m13', 's1', 'c1', lui(THANG, 13), 'da-duyet', [['khls_gay_so', 'hoc-moi']]);
    // s4: đúng 12 tháng trước (mép trong). s5: 13 tháng trước (ngoài tầm).
    ghiKe(c, 'khls_s4_m12', 's4', 'c1', lui(THANG, 12), 'da-duyet', [['khls_gay_so', 'hoc-moi']]);
    ghiKe(c, 'khls_s5_m13', 's5', 'c1', lui(THANG, 13), 'da-duyet', [['khls_gay_so', 'hoc-moi']]);
    // s6: tháng trước có bài "tiếp tục ở tháng sau" → có gợi ý.
    ghiKe(c, 'khls_s6_m1', 's6', 'c1', lui(THANG, 1), 'da-duyet', [['khls_gay_so', 'hoc-moi', { tiepTuc: true }]]);
  } finally { c.close(); }

  const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3881), dir: DIR });
  const req = taoReq(sv.BASE);
  const login = taoLogin(req);
  try {
    const d0 = await login('khls_ht', mk);
    await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
    const QL = (await login('khls_ht', 'quantri2026')).cookie;
    const GV = (await login('giaovien', '123456')).cookie;
    const GV2 = (await login('giaovien2', '123456')).cookie;
    const PH = (await login('phuhuynh', '123456')).cookie;

    const nhom = async (cookie) => req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie });
    const r = await nhom(GV);
    check('cô nhóm c1 mở được màn chính', r.status === 200, r.status);
    const be = id => (r.data.danhSach || []).find(x => x.studentId === id) || {};

    console.log('\n[A] Lịch sử ba tháng gần nhất');
    const ls = be('s1').lichSu;
    check('s1: đúng ba tháng M-1, M-2, M-3, mới nhất trước',
      Array.isArray(ls) && ls.map(x => x.thang).join(',') === [1, 2, 3].map(n => lui(THANG, n)).join(','), ls && ls.map(x => x.thang));
    check('không có tháng đang xem, không có tháng 13 tháng trước',
      Array.isArray(ls) && !ls.some(x => x.thang === THANG || x.thang === lui(THANG, 13)));
    check('mỗi tháng mang trạng thái duyệt (kể cả chưa duyệt)',
      Array.isArray(ls) && ls.map(x => x.trangThai).join(',') === 'da-duyet,cho-duyet,nhap', ls && ls.map(x => x.trangThai));
    const m1 = (ls || [])[0] || {};
    check('tháng M-1: bài đúng thứ tự, đúng tên / góc / lĩnh vực con / nhãn',
      JSON.stringify(m1.baiHoc) === JSON.stringify([
        { baiHocId: 'khls_gay_so', ten: 'Gậy số', gocLinhVuc: 'toan', linhVucCon: '', nhan: 'hoc-moi' },
        { baiHocId: 'khls_shapes', ten: 'Shapes', gocLinhVuc: 'cambridge', linhVucCon: 'cam-toan', nhan: 'on-tap' },
        { baiHocId: 'khls_an', ten: 'Tháp hồng', gocLinhVuc: 'giac-quan', linhVucCon: '', nhan: 'mo-rong' },
        { baiHocId: 'khls_da_go', ten: '(bài đã gỡ khỏi danh mục)', gocLinhVuc: '', linhVucCon: '', nhan: 'on-tap' },
      ]), m1.baiHoc);
    check('tháng M-1: mục chữ tự do có mặt',
      JSON.stringify(m1.muc) === JSON.stringify([
        { gocLinhVuc: 'toan', noiDung: 'Đếm đồ vật đến 10' },
        { gocLinhVuc: 'tieng-viet', noiDung: 'Kể lại chuyện Thỏ con' },
      ]), m1.muc);
    check('tháng M-3: không bài, một mục chữ',
      ls && ls[2] && ls[2].baiHoc.length === 0 && ls[2].muc.length === 1 && ls[2].muc[0].noiDung === 'Bốn mùa', ls && ls[2]);
    const chuoiLs = JSON.stringify(ls || []);
    check('KHÔNG lộ mức độ / kết luận / nhận xét trong lịch sử (chỉ nhãn)',
      (m1.baiHoc || []).length > 0 && !/mucDo|ketQua|nhanXet|da-vung|da-thay/.test(chuoiLs), chuoiLs.slice(0, 300));
    check('mỗi tháng chỉ có đúng bốn khoá', (ls || []).length === 3 && ls.every(x => Object.keys(x).sort().join(',') === 'baiHoc,muc,thang,trangThai'));
    check('bé chưa có kế hoạch nào: lichSu = []', Array.isArray(be('s3').lichSu) && be('s3').lichSu.length === 0, be('s3').lichSu);
    check('đúng 12 tháng trước vẫn tính', (be('s4').lichSu || []).map(x => x.thang).join(',') === lui(THANG, 12), be('s4').lichSu);
    check('13 tháng trước thì không', Array.isArray(be('s5').lichSu) && be('s5').lichSu.length === 0, be('s5').lichSu);
    const qlR = await nhom(QL);
    check('quản lý cũng thấy lịch sử', qlR.status === 200
      && ((qlR.data.danhSach || []).find(x => x.studentId === 's1') || {}).lichSu?.length === 3);

    console.log('\n[B] Khoá gợi ý giữ nguyên');
    const g6 = be('s6');
    check('s6: goiY vẫn đúng ba khoá cũ, có bài tiếp tục',
      g6.goiY && Object.keys(g6.goiY).sort().join(',') === 'baiHoc,muc,tuThang'
        && g6.goiY.tuThang === lui(THANG, 1) && g6.goiY.baiHoc.length === 1 && g6.goiY.baiHoc[0].baiHocId === 'khls_gay_so', g6.goiY);
    check('s6: goiYPhanTrong null (chưa có bản tháng này)', g6.goiYPhanTrong === null, g6.goiYPhanTrong);
    check('s1 đã có bản tháng này: goiY null như cũ', be('s1').goiY === null && be('s1').ke && be('s1').ke.thang === THANG);
    check('s6 có lịch sử một tháng', (g6.lichSu || []).length === 1);

    console.log('\n[C] Quyền — y như đường cũ');
    const r2 = await nhom(GV2);
    check('cô nhóm khác → 403', r2.status === 403, r2.status);
    const r3 = await nhom(PH);
    check('phụ huynh → 403', r3.status === 403, r3.status);

    console.log('\n[E] Bảng lĩnh vực con hỏng giữa lúc chạy');
    const doiTen = (a, b) => { const x = new Database(path.join(DIR, 'school.db')); try { x.exec(`ALTER TABLE ${a} RENAME TO ${b}`); } finally { x.close(); } };
    doiTen('kehoachbe_baihoc_con', 'kehoachbe_baihoc_con_tam');
    const hong = await nhom(GV);
    const lsHong = ((hong.data.danhSach || []).find(x => x.studentId === 's1') || {}).lichSu || [];
    check('màn chính vẫn 200, lịch sử vẫn đủ, bài đọc như chưa xếp mục',
      hong.status === 200 && lsHong.length === 3 && lsHong[0].baiHoc.every(b => b.linhVucCon === ''), hong.status);
    doiTen('kehoachbe_baihoc_con_tam', 'kehoachbe_baihoc_con');
  } finally {
    sv.dung();
    donThuMucTam(DIR);
  }
}

// ===========================================================================
// [D] QUY MÔ — chạy trong tiến trình để ĐẾM truy vấn (kiểu cambridge-hieu-nang)
// ===========================================================================
{
  const DIR = thuMucTam('phan-hoi-2010-ke-hoach-lich-su-quy-mo');
  sinhDuLieu(DIR);
  batPhanHe(DIR, ['kehoachbe']);

  let dem = 0;
  const goc = Database.prototype.prepare;
  Database.prototype.prepare = function bocDem(...a) {
    const st = goc.apply(this, a);
    for (const m of ['all', 'get', 'run']) {
      if (typeof st[m] !== 'function') continue;
      const f = st[m].bind(st);
      st[m] = (...b) => { dem += 1; return f(...b); };
    }
    return st;
  };
  process.env.DATA_DIR = DIR;
  const db = require2(path.join(GOC, 'lib', 'db.js'));
  const modules = require2(path.join(GOC, 'lib', 'modules.js'));
  db.sqlite.exec(SCHEMA);

  const tay = new Map();
  const appGia = {
    get(duong, ...fn) { tay.set(`GET ${duong}`, fn[fn.length - 1]); },
    post(duong, ...fn) { tay.set(`POST ${duong}`, fn[fn.length - 1]); },
    put(duong, ...fn) { tay.set(`PUT ${duong}`, fn[fn.length - 1]); },
    delete(duong, ...fn) { tay.set(`DELETE ${duong}`, fn[fn.length - 1]); },
  };
  require2(path.join(GOC, 'modules', 'kehoachbe', 'routes.js'))(appGia, { db, modules });
  function goi(req) {
    let ra = null;
    let ma = 200;
    const res = { status(n) { ma = n; return res; }, json(o) { ra = o; return res; } };
    tay.get('GET /api/kehoachbe')({ query: {}, params: {}, body: {}, ...req }, res);
    return { ma, data: ra };
  }

  const SO_BE = 60;
  const SO_BAI = 10;
  const beId = Array.from({ length: SO_BE }, (_, i) => `khhn_${String(i).padStart(3, '0')}`);
  const ghiThang = (n) => db.sqlite.transaction(() => {
    const t = lui(THANG, n);
    for (const id of beId) {
      ghiKe(db.sqlite, `${id}_m${n}`, id, 'c1', t, 'da-duyet',
        Array.from({ length: SO_BAI }, (_, j) => [`khhn_bai_${j}`, 'hoc-moi']), [['toan', `Mục tháng ${t}`]]);
    }
  })();
  db.sqlite.transaction(() => {
    const be = db.sqlite.prepare("INSERT INTO students (id, name, classId, active, dob, createdAt) VALUES (?, ?, 'c1', 1, '2021-05-01', ?)");
    beId.forEach((id, i) => be.run(id, `Bé thử ${i}`, LUC));
    const bai = db.sqlite.prepare(`INSERT INTO kehoachbe_baihoc (id, gocLinhVuc, ten, moTa, thuTu, active, nguoiTao, taoLuc)
                                   VALUES (?, 'toan', ?, '', ?, 1, NULL, ?)`);
    for (let j = 0; j < SO_BAI; j++) bai.run(`khhn_bai_${j}`, `Bài thử ${j}`, j, LUC);
  })();

  try {
    console.log('\n[D] Quy mô: 60 bé × 3 tháng × 10 bài');
    const co = db.findUser('t1');
    ghiThang(1);
    goi({ user: co, query: { classId: 'c1', thang: THANG } });   // làm nóng (nạp danh mục, bộ đệm câu lệnh)
    dem = 0;
    const motThang = goi({ user: co, query: { classId: 'c1', thang: THANG } });
    const q1 = dem;
    ghiThang(2);
    ghiThang(3);
    dem = 0;
    const t0 = Date.now();
    const baThang = goi({ user: co, query: { classId: 'c1', thang: THANG } });
    const ms = Date.now() - t0;
    const q3 = dem;
    const ds = (baThang.data && baThang.data.danhSach) || [];
    console.log(`  (đo được: lịch sử 1 tháng ${q1} truy vấn, 3 tháng ${q3} truy vấn, ${ms} ms cho ${ds.length} bé)`);
    check('đường trả 200 cho cả nhóm', motThang.ma === 200 && baThang.ma === 200, baThang.ma);
    const thu = ds.filter(x => x.studentId.startsWith('khhn_'));
    check('60 bé thử, mỗi bé đủ 3 tháng × 10 bài và mục chữ',
      thu.length === SO_BE && thu.every(x => (x.lichSu || []).length === 3
        && x.lichSu.every(t => t.baiHoc.length === SO_BAI && t.muc.length === 1)), thu.length);
    // Gom theo nhóm thì thêm tháng lịch sử KHÔNG thêm truy vấn; hỏi từng bé /
    // từng tháng thì chênh hàng trăm.
    check('thêm hai tháng lịch sử cho 60 bé: số truy vấn gần như không đổi (chênh < 10)', q3 - q1 < 10, { q1, q3 });
    check('dưới 8 truy vấn mỗi bé cho cả màn', q3 / ds.length < 8, (q3 / ds.length).toFixed(1));
    check('trả lời dưới 3 giây', ms < 3000, ms);
  } finally {
    Database.prototype.prepare = goc;
    try { db.sqlite.close(); } catch { /* đã đóng */ }
    donThuMucTam(DIR);
  }
}

tongKet();
