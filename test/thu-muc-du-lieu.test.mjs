// Bài canh "QUÊN DATA_DIR" CỦA CÁC LỆNH QUẢN TRỊ (Đ234, Đ234b, Đ234c).
//
// Chạy bằng:  npm run test:thu-muc-du-lieu
//
// Ngày 08/10/2026, trên máy chủ thử, `npm run backup:list` và `npm run
// kiem-tra-may-chu` được gõ thiếu `DATA_DIR` (theo đúng một chỉ dẫn viết
// thiếu). Hai lệnh lặng lẽ xem thư mục `./data` trong kho mã và báo: chưa có
// bản sao lưu nào, không thấy cơ sở dữ liệu, máy chủ sẽ không bật lại được —
// kèm gợi ý đặt bản sao lưu vào ngay trong kho mã. Máy chủ thật thì hoàn toàn
// khoẻ.
//
// Bài này giả lập một máy chủ đã cài (thư mục chuẩn có `school.db`, chỉ qua
// biến `CASA_THU_MUC_CHUAN`) rồi đòi:
//   1. thiếu DATA_DIR → năm lệnh DỪNG trước khi đọc / ghi gì, và in sẵn lệnh gõ lại;
//   2. có DATA_DIR → chạy như cũ, kể cả trỏ sang một chỗ lạ (cài lần hai);
//   3. máy không có thư mục chuẩn (máy lập trình, CI) → không đổi gì;
//   4. lời gọi bộ canh đứng TRƯỚC mọi `require` đụng tới thư mục dữ liệu;
//   5. dòng gõ lại CHÉP RA CHẠY ĐƯỢC NGUYÊN VĂN — kể cả tên có dấu nháy, `&`,
//      `$`, và khi gõ `npm run` từ một thư mục con (Đ234b);
//   6. thư mục chuẩn KHÔNG ĐỌC ĐƯỢC (sai tài khoản trên máy chủ thật) cũng
//      dừng, và câu báo nói đúng là "không đọc được" (Đ234c).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const canh = require(path.join(GOC, 'scripts', 'canh-thu-muc-du-lieu.js'));
const WIN = process.platform === 'win32';

const CHUAN = thuMucTam('thu-muc-du-lieu-chuan');
sinhDuLieu(CHUAN);                                   // một "máy chủ đã cài" có dữ liệu thật
const LA = thuMucTam('thu-muc-du-lieu-cai-moi');     // một chỗ trống bên ngoài kho mã
const KHONG_CO = path.join(os.tmpdir(), 'schoolconnect-test-thu-muc-du-lieu-khong-co');
const KIN = path.join(os.tmpdir(), 'schoolconnect-test-thu-muc-du-lieu-kin');   // thư mục chuẩn bị khoá quyền
try { fs.chmodSync(KIN, 0o700); } catch (_) { /* chưa có — tốt */ }
fs.rmSync(KIN, { recursive: true, force: true });
fs.rmSync(KHONG_CO, { recursive: true, force: true });

// `INIT_CWD` là chỗ người gõ `npm ...` đang đứng; `npm test` truyền nó xuống
// mọi lệnh con. Bỏ đi để mỗi mục tự nói nó đang giả lập đứng ở đâu.
const envKhongDataDir = (them = {}) => {
  const e = { ...process.env, ...them };
  delete e.DATA_DIR;
  delete e.INIT_CWD;
  return e;
};
const chay = (tep, args, env, cwd = GOC) => {
  const r = spawnSync(process.execPath, [path.join('scripts', tep), ...args].map((a, i) => (i === 0 && cwd !== GOC ? path.join(GOC, a) : a)),
    { cwd, encoding: 'utf8', env, timeout: 60000 });
  return { ma: r.status, out: r.stdout || '', err: r.stderr || '' };
};
const soAdmin = (dir) => {
  const c = new Database(path.join(dir, 'school.db'), { readonly: true });
  try { return c.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n; } finally { c.close(); }
};
const tenCuaTaiKhoan = (dir, tenDangNhap) => {
  const c = new Database(path.join(dir, 'school.db'), { readonly: true });
  try { return c.prepare('SELECT name FROM users WHERE username = ?').get(tenDangNhap)?.name ?? null; } finally { c.close(); }
};
// Dòng gõ lại mà bộ canh in ra: dòng thụt 5 dấu cách ngay dưới "Gõ lại".
const layDongGoLai = (err) => (err.match(/^ {5}((?:\$env:)?DATA_DIR=.*)$/m) || [])[1] || '';
// Chạy dòng gõ lại y như người vận hành dán vào cửa sổ lệnh.
const dan = (dong, cwd) => {
  const r = spawnSync('/bin/sh', ['-c', dong], { cwd, encoding: 'utf8', env: envKhongDataDir(), timeout: 60000 });
  return { ma: r.status, out: r.stdout || '', err: r.stderr || '' };
};
// Cách bọc nháy viết LẠI ở đây, không mượn hàm của bộ canh — mượn thì bài
// kiểm thử chỉ so bộ canh với chính nó. Đáp án thật là mục [5]: dán dòng ấy
// vào /bin/sh và xem nó chạy đúng.
//   Linux / Mac: chữ trần chỉ khi toàn ký tự an toàn VÀ không mở đầu bằng `=`
//   (zsh đọc `=ls` là đường dẫn lệnh ls); còn lại nháy đơn.
//   PowerShell: luôn nháy đơn.
const trich = (s) => (WIN
  ? `'${s.replace(/['\u2018\u2019\u201A\u201B]/g, '$&$&')}'`
  : (/^[\w@%+:,./-][\w@%+=:,./-]*$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`));
const lenhMongDoi = (tepTuyetDoiHayTuongDoi, args) =>
  `${WIN ? `$env:DATA_DIR=${trich(CHUAN)};` : `DATA_DIR=${trich(CHUAN)}`} node `
  + [tepTuyetDoiHayTuongDoi, ...args].map(trich).join(' ');

const DATA_KHO = path.join(GOC, 'data');
const DB_TRONG_KHO = path.join(DATA_KHO, 'school.db');
const dauVet = (f) => { try { const s = fs.statSync(f); return `${s.size}:${s.mtimeMs}`; } catch (_) { return 'khong-co'; } };
const ds = (d) => { try { return fs.readdirSync(d).sort(); } catch (_) { return []; } };

// Bộ canh hỏng thì các lệnh lẽ ra bị chặn sẽ THẬT SỰ chạy vào `data/` của kho
// mã: sao lưu vào `data/backups`, tạo `data/school.db`, thêm tài khoản. Dọn
// lại phần ấy — nhưng hẹp tới mức không bao giờ xoá nhầm thứ người lập trình
// đang làm cùng lúc (ví dụ `npm start` vừa tạo `data/school.db` trên một bản
// sao mới):
//   - CHỈ dọn khi trong đoạn được bọc có một lệnh lẽ ra bị chặn mà KHÔNG bị
//     chặn (`canChan` thấy mã khác 2). Bài xanh thì không xoá gì cả.
//   - CHỈ dọn những tên các lệnh ấy sinh ra được (`TEN_LENH_SINH`), và chỉ khi
//     tên đó chưa có lúc bắt đầu đoạn.
// Không dọn được: tệp mới nằm sâu trong một thư mục con đã có sẵn (ví dụ
// `data/backups/uploads/`), và cơ sở dữ liệu thử ĐÃ có sẵn bị ghi thêm. Hai
// ca đó bài chỉ báo đỏ — mà bài đã đỏ thì người chạy phải nhìn vào.
const TEN_LENH_SINH = /^(school\.db(-wal|-shm|-journal)?|backups|uploads)$/;
function donSauKhi(viec) {
  const coSanData = new Set(ds(DATA_KHO));
  const coSanSaoLuu = new Set(ds(path.join(DATA_KHO, 'backups')));
  let lot = false;
  const canChan = (r) => { if (r.ma !== 2) lot = true; return r; };
  try { return viec({ coSanData, coSanSaoLuu, canChan }); } finally {
    if (lot) {
      for (const t of ds(path.join(DATA_KHO, 'backups'))) {
        if (!coSanSaoLuu.has(t)) fs.rmSync(path.join(DATA_KHO, 'backups', t), { recursive: true, force: true });
      }
      for (const t of ds(DATA_KHO)) {
        if (!coSanData.has(t) && TEN_LENH_SINH.test(t)) fs.rmSync(path.join(DATA_KHO, t), { recursive: true, force: true });
      }
    }
  }
}

try {
  // =========================================================================
  console.log('\n[1] Máy chủ đã cài, gõ THIẾU DATA_DIR → năm lệnh dừng trước khi đọc / ghi gì');
  donSauKhi(({ coSanData, coSanSaoLuu, canChan }) => {
    const env = envKhongDataDir({ CASA_THU_MUC_CHUAN: CHUAN });
    const trongKhoTruoc = dauVet(DB_TRONG_KHO);
    const saoLuuChuanTruoc = ds(path.join(CHUAN, 'backups')).join(',');
    const adminTruoc = soAdmin(CHUAN);
    const LENH = [
      ['backup.js', ['--list']],
      ['backup.js', []],
      ['restore.js', ['--kiem-tra']],
      ['kiem-tra-may-chu.js', []],
      ['create-admin.js', ['Người Thử', 'nguoithu']],
      ['sua-quyen-chu-nhiem.js', []],
      ['sua-quyen-chu-nhiem.js', ['--sua']],
    ];
    for (const [tep, args] of LENH) {
      const r = canChan(chay(tep, args, env));
      const ten = [tep, ...args].join(' ');
      check(`${ten}: dừng với mã 2`, r.ma === 2, { ma: r.ma, err: r.err.slice(0, 200), out: r.out.slice(0, 200) });
      check(`${ten}: nói rõ thiếu DATA_DIR và chỉ đúng thư mục dữ liệu thật`,
        /THIẾU DATA_DIR/.test(r.err) && r.err.includes(CHUAN), r.err.slice(0, 300));
      check(`${ten}: in sẵn lệnh gõ lại, đúng lệnh vừa gõ`,
        layDongGoLai(r.err) === lenhMongDoi(path.join('scripts', tep), args), { co: layDongGoLai(r.err) });
      check(`${ten}: KHÔNG in ra bản báo cáo hay gợi ý sửa nào`, r.out.trim() === '', r.out.slice(0, 200));
    }
    check('không tạo bản sao lưu nào — cả trong kho mã lẫn ở thư mục thật',
      ds(path.join(DATA_KHO, 'backups')).length === coSanSaoLuu.size
      && ds(path.join(CHUAN, 'backups')).join(',') === saoLuuChuanTruoc);
    check('không tạo tài khoản quản trị nào ở dữ liệu thật', soAdmin(CHUAN) === adminTruoc);
    check('không đụng cơ sở dữ liệu trong kho mã (nếu máy có)', dauVet(DB_TRONG_KHO) === trongKhoTruoc);
    check('không sinh thêm tệp nào trong data/ của kho mã',
      ds(DATA_KHO).every(t => coSanData.has(t) || !TEN_LENH_SINH.test(t)), ds(DATA_KHO));
  });

  // =========================================================================
  console.log('\n[2] Có DATA_DIR → chạy như cũ, kể cả trỏ sang một chỗ khác (cài lần hai)');
  {
    const envChuan = { ...process.env, CASA_THU_MUC_CHUAN: CHUAN, DATA_DIR: CHUAN };
    const dsl = chay('backup.js', ['--list'], envChuan);
    check('backup --list với DATA_DIR đúng: chạy, xem đúng thư mục thật', dsl.ma === 0 && dsl.out.includes(CHUAN), dsl);
    const kt = chay('kiem-tra-may-chu.js', [], envChuan);
    check('kiem-tra-may-chu với DATA_DIR đúng: chạy hết bản báo cáo của thư mục thật',
      kt.ma !== 2 && kt.out.includes(`Thư mục dữ liệu: ${CHUAN}`) && !/THIẾU DATA_DIR/.test(kt.err), kt.out.slice(0, 200));
    const sq = chay('sua-quyen-chu-nhiem.js', [], envChuan);
    // Mã 1 là mã thường của lệnh này khi rà ra chỗ lệch (dữ liệu mẫu có nhóm
    // "Mầm 1" chưa có cô) — có trước bộ canh. Chỉ mã 2 mới là bộ canh chặn.
    check('sua-quyen-chu-nhiem với DATA_DIR đúng: chạy như cũ, rà đúng thư mục thật',
      sq.ma !== 2 && sq.out.includes(CHUAN) && !/THIẾU DATA_DIR/.test(sq.err), { ma: sq.ma, out: sq.out.slice(0, 200) });
    const truoc = soAdmin(CHUAN);
    const ad = chay('create-admin.js', ['Hiệu Trưởng Thử', 'htthu'], envChuan);
    check('create-admin với DATA_DIR đúng: tạo được tài khoản', ad.ma === 0 && soAdmin(CHUAN) === truoc + 1, ad.err.slice(0, 200));
    const moi = chay('create-admin.js', ['Hiệu Trưởng Mới', 'htmoi'], { ...process.env, CASA_THU_MUC_CHUAN: CHUAN, DATA_DIR: LA });
    check('ghi rõ DATA_DIR sang một chỗ TRỐNG khác (cài lần hai trên cùng máy): không bị chặn',
      moi.ma === 0 && fs.existsSync(path.join(LA, 'school.db')), moi.err.slice(0, 200));
  }

  // =========================================================================
  console.log('\n[3] Máy KHÔNG có thư mục chuẩn (máy lập trình, CI) → không đổi gì');
  {
    const r = chay('backup.js', ['--list'], envKhongDataDir({ CASA_THU_MUC_CHUAN: KHONG_CO }));
    check('thiếu DATA_DIR vẫn chạy như trước: không dừng, không nhắc', r.ma === 0 && !/THIẾU DATA_DIR/.test(r.err), r);
    fs.mkdirSync(KHONG_CO, { recursive: true });
    const r2 = chay('backup.js', ['--list'], envKhongDataDir({ CASA_THU_MUC_CHUAN: KHONG_CO }));
    check('thư mục chuẩn có mà KHÔNG có school.db (máy mới dựng, chưa chạy lần nào): không chặn', r2.ma === 0, r2);
  }

  // =========================================================================
  console.log('\n[4] Thư mục chuẩn khớp tài liệu triển khai; lời gọi đứng trước mọi thứ đụng tới dữ liệu');
  {
    const trienKhai = fs.readFileSync(path.join(GOC, 'docs', 'TRIEN-KHAI.md'), 'utf8');
    check('thư mục chuẩn của Linux đúng là thư mục tài liệu triển khai dùng',
      WIN || (canh.THU_MUC_CHUAN[0] === '/var/lib/casa-mamnon' && trienKhai.includes('/var/lib/casa-mamnon')));
    check('Windows không có thư mục chuẩn đoán bừa', !WIN || canh.THU_MUC_CHUAN.length === 0);
    for (const tep of ['backup.js', 'restore.js', 'kiem-tra-may-chu.js', 'create-admin.js', 'sua-quyen-chu-nhiem.js']) {
      const ma = fs.readFileSync(path.join(GOC, 'scripts', tep), 'utf8')
        .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
      const iCanh = ma.indexOf("require('./canh-thu-muc-du-lieu')()");
      const iLib = ma.search(/require\('\.\.\/lib\//);
      const iDb = ma.search(/require\('better-sqlite3'\)/);
      check(`${tep}: gọi bộ canh trước mọi require của lib/ và better-sqlite3`,
        iCanh >= 0 && (iLib < 0 || iCanh < iLib) && (iDb < 0 || iCanh < iDb), { iCanh, iLib, iDb });
    }
  }

  // =========================================================================
  console.log('\n[5] Dòng gõ lại chép ra chạy được NGUYÊN VĂN');
  donSauKhi(({ canChan }) => {
    const envCanh = envKhongDataDir({ CASA_THU_MUC_CHUAN: CHUAN });
    // Đứng ngoài kho mã: không có đường tuyệt đối thì chép ra chạy là
    // "Cannot find module".
    const ngoai = canChan(chay('backup.js', ['--list'], envCanh, os.tmpdir()));
    check('gõ từ thư mục khác: vẫn dừng, dòng gõ lại mang đường tuyệt đối tới tệp lệnh',
      ngoai.ma === 2 && layDongGoLai(ngoai.err) === lenhMongDoi(path.join(GOC, 'scripts', 'backup.js'), ['--list']),
      { co: layDongGoLai(ngoai.err) });
    // `npm run` từ thư mục con: npm chạy lệnh ở GỐC kho mã, nhưng người gõ vẫn
    // đứng ở thư mục con — chỗ đó nằm trong INIT_CWD.
    const CON = path.join(GOC, 'docs');
    const quaNpm = canChan(chay('backup.js', ['--list'], { ...envCanh, INIT_CWD: CON }));
    check('gõ `npm run` từ thư mục con: dòng gõ lại mang đường tuyệt đối',
      quaNpm.ma === 2 && layDongGoLai(quaNpm.err) === lenhMongDoi(path.join(GOC, 'scripts', 'backup.js'), ['--list']),
      { co: layDongGoLai(quaNpm.err) });
    // Cửa sổ lệnh mở ra từ npm còn sót INIT_CWD = gốc kho mã, trong khi người
    // gõ đã `cd` đi chỗ khác: tin riêng INIT_CWD là in đường tương đối, sai.
    const sot = canChan(chay('backup.js', ['--list'], { ...envCanh, INIT_CWD: GOC }, os.tmpdir()));
    check('INIT_CWD sót lại là gốc kho mã nhưng đang đứng chỗ khác: vẫn in đường tuyệt đối',
      sot.ma === 2 && layDongGoLai(sot.err) === lenhMongDoi(path.join(GOC, 'scripts', 'backup.js'), ['--list']),
      { co: layDongGoLai(sot.err) });
    // zsh đọc chữ trần `=x` là "đường dẫn của lệnh x" — phải bọc.
    const bang = canChan(chay('backup.js', ['--out', '=x'], envCanh));
    check('đối số mở đầu bằng = được bọc nháy (zsh hiểu =x là đường dẫn lệnh x)',
      bang.ma === 2 && layDongGoLai(bang.err).endsWith(WIN ? `'--out' '=x'` : `--out '=x'`), { co: layDongGoLai(bang.err) });
    const dauNhay = canChan(chay('create-admin.js', ['Cô "Lan" & $HOME \'Mai\'', 'lan.thu'], envCanh));
    check('tên có nháy kép, nháy đơn, & và $: vẫn dừng, không ghi gì',
      dauNhay.ma === 2 && tenCuaTaiKhoan(CHUAN, 'lan.thu') === null, dauNhay.err.slice(0, 300));

    if (WIN) {
      console.log('  (bỏ qua phần dán vào cửa sổ lệnh: máy Windows không có /bin/sh)');
    } else {
      const d1 = dan(layDongGoLai(quaNpm.err), CON);
      check('dán dòng ấy ngay tại thư mục con: chạy được, xem đúng thư mục dữ liệu thật',
        d1.ma === 0 && d1.out.includes(CHUAN), { ma: d1.ma, err: d1.err.slice(0, 200) });
      const d2 = dan(layDongGoLai(ngoai.err), os.tmpdir());
      check('dán dòng ấy ngay tại thư mục khác: chạy được', d2.ma === 0 && d2.out.includes(CHUAN), { ma: d2.ma, err: d2.err.slice(0, 200) });
      const d3 = dan(layDongGoLai(dauNhay.err), GOC);
      check('dán dòng gõ lại của create-admin: tạo tài khoản với ĐÚNG từng ký tự của tên — shell không nuốt & hay $',
        d3.ma === 0 && tenCuaTaiKhoan(CHUAN, 'lan.thu') === 'Cô "Lan" & $HOME \'Mai\'',
        { ma: d3.ma, ten: tenCuaTaiKhoan(CHUAN, 'lan.thu'), err: d3.err.slice(0, 200) });
    }
  });

  // =========================================================================
  console.log('\n[6] Thư mục chuẩn KHÔNG ĐỌC ĐƯỢC (sai tài khoản) → vẫn dừng, nói đúng lý do');
  if (WIN) {
    console.log('  (bỏ qua: Windows không có thư mục chuẩn và không có quyền kiểu chmod)');
  } else {
    // Tài khoản thường: tự khoá thư mục của mình (chmod 000) là đủ thiếu quyền.
    // Root thì đọc được mọi thứ, nên hạ xuống `nobody` bằng `setpriv`; máy
    // không có `setpriv` thì bỏ qua và nói rõ — không giả vờ đã kiểm.
    fs.mkdirSync(KIN, { recursive: true });
    fs.writeFileSync(path.join(KIN, 'school.db'), '');
    const laRoot = process.getuid && process.getuid() === 0;
    fs.chmodSync(KIN, laRoot ? 0o700 : 0o000);
    const lenhGoc = [path.join(GOC, 'scripts', 'backup.js'), '--list'];
    const envKin = envKhongDataDir({ CASA_THU_MUC_CHUAN: KIN });
    // Số 65534 thay cho tên: nhóm `nogroup` của Debian / Ubuntu không có trên
    // Fedora / RHEL (ở đó là `nobody`), còn số thì máy nào cũng là "không ai".
    const SETPRIV = ['--reuid=65534', '--regid=65534', '--clear-groups'];
    // Với root, hỏi TRƯỚC xem có hạ xuống nobody và đọc được tệp lệnh không —
    // tách khỏi lần chạy thật, để một bộ canh bị gỡ (mã 0, không câu báo) không
    // bao giờ bị coi nhầm là "máy này không dựng được ca thử".
    const thuDuoc = !laRoot || spawnSync('setpriv', [...SETPRIV, process.execPath, '-e',
      `require('fs').accessSync(${JSON.stringify(lenhGoc[0])}, require('fs').constants.R_OK)`],
    { cwd: GOC, encoding: 'utf8', env: { ...envKin, HOME: os.tmpdir() }, timeout: 60000 }).status === 0;
    if (!thuDuoc) {
      console.log('  (bỏ qua: máy chạy bằng root mà không hạ được xuống tài khoản nobody bằng setpriv, hoặc nobody không đọc được kho mã)');
    } else {
      const r = laRoot
        ? spawnSync('setpriv', [...SETPRIV, process.execPath, ...lenhGoc],
          { cwd: GOC, encoding: 'utf8', env: { ...envKin, HOME: os.tmpdir() }, timeout: 60000 })
        : spawnSync(process.execPath, lenhGoc, { cwd: GOC, encoding: 'utf8', env: envKin, timeout: 60000 });
      const err = r.stderr || '';
      check('thư mục chuẩn không đọc được: lệnh vẫn DỪNG với mã 2', r.status === 2, { ma: r.status, err: err.slice(0, 200) });
      check('câu báo nói đúng là KHÔNG đọc được, không nói "có dữ liệu thật"',
        /KHÔNG đọc được/.test(err) && !/có dữ liệu thật/.test(err), err.slice(0, 400));
      check('chỉ cách tìm đúng tài khoản đang chạy app, và vẫn in sẵn dòng gõ lại',
        err.includes('systemctl show casa-mamnon -p User') && layDongGoLai(err).startsWith(`DATA_DIR=${trich(KIN)} node `), err.slice(0, 600));
      // Gõ ở gốc kho mã, nhưng câu báo bảo đổi tài khoản — đăng nhập tài khoản
      // khác là về thư mục nhà, nên dòng gõ lại phải mang đường tuyệt đối.
      check('dòng gõ lại mang đường TUYỆT ĐỐI dù đang gõ ở gốc kho mã (đổi tài khoản là đổi chỗ đứng)',
        layDongGoLai(err) === `DATA_DIR=${trich(KIN)} node ${trich(lenhGoc[0])} --list`, { co: layDongGoLai(err) });
    }
  }
} finally {
  if (fs.existsSync(KIN)) { try { fs.chmodSync(KIN, 0o700); } catch (_) { /* để thuMucTam lần sau dọn */ } }
  donThuMucTam(KIN);
  donThuMucTam(CHUAN);
  donThuMucTam(LA);
  fs.rmSync(KHONG_CO, { recursive: true, force: true });
}
tongKet();
