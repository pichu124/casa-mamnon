// Bài canh "QUÊN DATA_DIR" CỦA CÁC LỆNH QUẢN TRỊ (Đ234).
//
// Chạy bằng:  npm run test:thu-muc-du-lieu
//
// Ngày 08/10/2026, trên máy chủ thử, `npm run backup:list` và `npm run
// kiem-tra-may-chu` được gõ thiếu `DATA_DIR` (theo đúng một chỉ dẫn viết
// thiếu). Hai lệnh lặng lẽ xem thư mục `./data` trong kho mã và báo: chưa có
// bản sao lưu nào, không thấy cơ sở dữ liệu, máy chủ sẽ không bật lại được —
// kèm gợi ý `DATA_DIR=/opt/casa-mamnon/data npm run backup`, tức đặt bản sao
// lưu vào ngay trong kho mã. Máy chủ thật thì hoàn toàn khoẻ.
//
// Bài này giả lập một máy chủ đã cài (thư mục chuẩn có `school.db`, chỉ qua
// biến `CASA_THU_MUC_CHUAN`) rồi đòi:
//   1. thiếu DATA_DIR → bốn lệnh DỪNG trước khi đọc / ghi gì, và in sẵn lệnh gõ lại;
//   2. có DATA_DIR → chạy như cũ, kể cả trỏ sang một chỗ lạ (cài lần hai);
//   3. máy không có thư mục chuẩn (máy lập trình, CI) → không đổi gì;
//   4. lời gọi bộ canh đứng TRƯỚC mọi `require` đụng tới thư mục dữ liệu.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();

const CHUAN = thuMucTam('thu-muc-du-lieu-chuan');
sinhDuLieu(CHUAN);                                   // một "máy chủ đã cài" có dữ liệu thật
const LA = thuMucTam('thu-muc-du-lieu-cai-moi');     // một chỗ trống bên ngoài kho mã
const KHONG_CO = path.join(os.tmpdir(), 'schoolconnect-test-thu-muc-du-lieu-khong-co');
fs.rmSync(KHONG_CO, { recursive: true, force: true });

const envKhongDataDir = (them = {}) => {
  const e = { ...process.env, ...them };
  delete e.DATA_DIR;
  return e;
};
const chay = (tep, args, env) => {
  const r = spawnSync(process.execPath, [path.join('scripts', tep), ...args], { cwd: GOC, encoding: 'utf8', env, timeout: 60000 });
  return { ma: r.status, out: r.stdout || '', err: r.stderr || '' };
};
const soAdmin = (dir) => {
  const c = new Database(path.join(dir, 'school.db'), { readonly: true });
  try { return c.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n; } finally { c.close(); }
};
const DB_TRONG_KHO = path.join(GOC, 'data', 'school.db');
const dauVet = (f) => { try { const s = fs.statSync(f); return `${s.size}:${s.mtimeMs}`; } catch (_) { return 'khong-co'; } };
const dsSaoLuu = (d) => { try { return fs.readdirSync(d).sort().join(','); } catch (_) { return ''; } };
// Bộ canh hỏng thì `backup.js` sẽ thật sự sao lưu vào `data/backups` TRONG kho
// mã. Ghi nhận những gì có sẵn để cuối bài chỉ dọn đúng phần bài này đẻ ra.
const SAO_LUU_KHO = path.join(GOC, 'data', 'backups');
const coSanTrongKho = new Set(dsSaoLuu(SAO_LUU_KHO).split(',').filter(Boolean));
const khoSaoLuuCoSan = fs.existsSync(SAO_LUU_KHO);

try {
  // =========================================================================
  console.log('\n[1] Máy chủ đã cài, gõ THIẾU DATA_DIR → bốn lệnh dừng trước khi đọc / ghi gì');
  {
    const env = envKhongDataDir({ CASA_THU_MUC_CHUAN: CHUAN });
    const trongKhoTruoc = dauVet(DB_TRONG_KHO);
    const saoLuuKhoTruoc = dsSaoLuu(SAO_LUU_KHO);
    const saoLuuChuanTruoc = dsSaoLuu(path.join(CHUAN, 'backups'));
    const adminTruoc = soAdmin(CHUAN);
    const LENH = [
      ['backup.js', ['--list']],
      ['backup.js', []],
      ['restore.js', ['--kiem-tra']],
      ['kiem-tra-may-chu.js', []],
      ['create-admin.js', ['Người Thử', 'nguoithu']],
    ];
    for (const [tep, args] of LENH) {
      const r = chay(tep, args, env);
      const ten = [tep, ...args].join(' ');
      check(`${ten}: dừng với mã 2`, r.ma === 2, { ma: r.ma, err: r.err.slice(0, 200), out: r.out.slice(0, 200) });
      check(`${ten}: nói rõ thiếu DATA_DIR và chỉ đúng thư mục dữ liệu thật`,
        /THIẾU DATA_DIR/.test(r.err) && r.err.includes(CHUAN), r.err.slice(0, 300));
      const goLai = `${path.join('scripts', tep)}${args.length ? ' ' : ''}${args.map(a => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
      check(`${ten}: in sẵn lệnh gõ lại, đúng lệnh vừa gõ`,
        r.err.includes(process.platform === 'win32'
          ? `$env:DATA_DIR="${CHUAN}"; node ${goLai}`
          : `DATA_DIR=${CHUAN} node ${goLai}`),
        r.err.slice(0, 600));
      check(`${ten}: KHÔNG in ra bản báo cáo hay gợi ý sửa nào`, r.out.trim() === '', r.out.slice(0, 200));
    }
    check('không tạo bản sao lưu nào — cả trong kho mã lẫn ở thư mục thật',
      dsSaoLuu(SAO_LUU_KHO) === saoLuuKhoTruoc &&dsSaoLuu(path.join(CHUAN, 'backups')) === saoLuuChuanTruoc);
    check('không tạo tài khoản quản trị nào ở dữ liệu thật', soAdmin(CHUAN) === adminTruoc);
    check('không đụng cơ sở dữ liệu trong kho mã (nếu máy có)', dauVet(DB_TRONG_KHO) === trongKhoTruoc);
  }

  // =========================================================================
  console.log('\n[2] Có DATA_DIR → chạy như cũ, kể cả trỏ sang một chỗ khác (cài lần hai)');
  {
    const envChuan = { ...process.env, CASA_THU_MUC_CHUAN: CHUAN, DATA_DIR: CHUAN };
    const ds = chay('backup.js', ['--list'], envChuan);
    check('backup --list với DATA_DIR đúng: chạy, xem đúng thư mục thật', ds.ma === 0 && ds.out.includes(CHUAN), ds);
    const kt = chay('kiem-tra-may-chu.js', [], envChuan);
    check('kiem-tra-may-chu với DATA_DIR đúng: chạy hết bản báo cáo của thư mục thật',
      kt.ma !== 2 && kt.out.includes(`Thư mục dữ liệu: ${CHUAN}`) && !/THIẾU DATA_DIR/.test(kt.err), kt.out.slice(0, 200));
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
    const canh = require(path.join(GOC, 'scripts', 'canh-thu-muc-du-lieu.js'));
    const trienKhai = fs.readFileSync(path.join(GOC, 'docs', 'TRIEN-KHAI.md'), 'utf8');
    check('thư mục chuẩn của Linux đúng là thư mục tài liệu triển khai dùng',
      process.platform === 'win32' || (canh.THU_MUC_CHUAN[0] === '/var/lib/casa-mamnon' && trienKhai.includes('/var/lib/casa-mamnon')));
    {
      // Đứng ngoài thư mục kho mã: dòng gõ lại phải mang đường tuyệt đối, không
      // thì chép ra chạy là "Cannot find module".
      const r = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'backup.js'), '--list'],
        { cwd: os.tmpdir(), encoding: 'utf8', env: envKhongDataDir({ CASA_THU_MUC_CHUAN: CHUAN }), timeout: 60000 });
      check('gõ từ thư mục khác: vẫn dừng, dòng gõ lại mang đường tuyệt đối tới tệp lệnh',
        r.status === 2 && (r.stderr || '').includes(`node ${path.join(GOC, 'scripts', 'backup.js')} --list`), (r.stderr || '').slice(0, 400));
    }
    for (const tep of ['backup.js', 'restore.js', 'kiem-tra-may-chu.js', 'create-admin.js']) {
      const ma = fs.readFileSync(path.join(GOC, 'scripts', tep), 'utf8')
        .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
      const iCanh = ma.indexOf("require('./canh-thu-muc-du-lieu')()");
      const iLib = ma.search(/require\('\.\.\/lib\//);
      const iDb = ma.search(/require\('better-sqlite3'\)/);
      check(`${tep}: gọi bộ canh trước mọi require của lib/ và better-sqlite3`,
        iCanh >= 0 && (iLib < 0 || iCanh < iLib) && (iDb < 0 || iCanh < iDb), { iCanh, iLib, iDb });
    }
  }
} finally {
  donThuMucTam(CHUAN);
  donThuMucTam(LA);
  fs.rmSync(KHONG_CO, { recursive: true, force: true });
  for (const t of dsSaoLuu(SAO_LUU_KHO).split(',').filter(Boolean)) {
    if (!coSanTrongKho.has(t)) fs.rmSync(path.join(SAO_LUU_KHO, t), { force: true });
  }
  if (!khoSaoLuuCoSan) { try { fs.rmdirSync(SAO_LUU_KHO); } catch (_) { /* còn tệp của người khác — để yên */ } }
}
tongKet();
