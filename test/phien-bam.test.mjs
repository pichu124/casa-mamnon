// Bài canh: BẢNG PHIÊN CHỈ LƯU MÃ BĂM CỦA TOKEN — TỆP SAO LƯU RÒ RA KHÔNG CHO ĐĂNG NHẬP (Đ261b, lỗi O4).
//
// Chạy bằng:  TEST_PORT=7056 node test/phien-bam.test.mjs   (dùng cả cổng TEST_PORT+1)
//
// Bản trước lưu token phiên DẠNG THÔ trong bảng `sessions`. Kiểm thử thay
// trường (báo cáo O) đã làm: sao lưu máy 1, khôi phục sang máy 2, dựng cookie
// từ token đọc trong tệp `.db.gz` → `/api/auth/me` trả 200. Ai cầm được tệp sao
// lưu (11 token thô, quyền tệp 644) là đăng nhập được như quản trị tới 30 ngày
// mà không cần phá mật khẩu.
//
// Nay bảng chỉ giữ `sha256$<hex>` của token; cookie vẫn mang token thô. Bài này
// canh:
//   [1] sau đăng nhập, bảng không chứa token thô nào;
//   [2] tệp sao lưu không chứa token thô; dựng cookie từ thứ đọc được trong
//       bản khôi phục ở máy 2 → 401; người thật cầm cookie của mình thì vẫn vào
//       (khôi phục sau sự cố không đăng xuất cả trường);
//   [3] phiên lưu thô từ trước bản vá được băm một lần lúc khởi động và VẪN
//       dùng được — nâng cấp không đăng xuất ai;
//   [4] đăng xuất, đổi mật khẩu (đăng xuất máy khác), hết hạn vẫn đúng như cũ.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, maPhienTrongBang } from './_chung.mjs';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));
const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 7056);
const DIR = thuMucTam('phien-bam');
const DIR2 = thuMucTam('phien-bam-may-2');

const bam = maPhienTrongBang;
const maCua = (cookie) => cookie.replace(/^session=/, '');
const docPhien = (dir) => {
  const raw = new Database(path.join(dir, 'school.db'), { readonly: true });
  const ds = raw.prepare('SELECT token, userId, createdAt FROM sessions').all();
  raw.close();
  return ds;
};

sinhDuLieu(DIR);

// Một phiên "đời trước": token thô, đúng như bản cũ lưu. Ghi thẳng vào bảng
// TRƯỚC khi máy chủ chạy bản mới — giả một trường vừa nâng cấp.
const TOKEN_CU = crypto.randomBytes(32).toString('hex');
{
  const raw = new Database(path.join(DIR, 'school.db'));
  raw.prepare('INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)')
    .run(TOKEN_CU, 'p2', Date.now() - 2 * 24 * 60 * 60 * 1000);
  raw.close();
}

let sv = await dungMayChu({ port: PORT, dir: DIR });
let req = taoReq(sv.BASE);
let login = taoLogin(req);

// ===========================================================================
console.log('\n[3] Phiên lưu thô từ trước bản vá: băm lúc khởi động, VẪN dùng được');
{
  const ds = docPhien(DIR);
  check('không còn dòng nào mang token thô cũ', !ds.some(d => d.token === TOKEN_CU), ds.map(d => d.token.slice(0, 12)));
  check('dòng cũ đã thành mã băm của chính token ấy', ds.some(d => d.token === bam(TOKEN_CU) && d.userId === 'p2'));
  const me = await req('GET', '/api/auth/me', { cookie: `session=${TOKEN_CU}` });
  check('cookie cũ của gia đình vẫn đăng nhập được (nâng cấp không đăng xuất ai)',
    me.status === 200 && me.data?.user?.username === 'phuhuynh2', me.status);
  check('mốc tạo phiên giữ nguyên (hạn 30 ngày không bị kéo dài)',
    docPhien(DIR).find(d => d.token === bam(TOKEN_CU))?.createdAt < Date.now() - 24 * 60 * 60 * 1000);
}

// ===========================================================================
console.log('\n[1] Đăng nhập: bảng phiên chỉ có mã băm');
const qt = await login('giaovien', '123456');
const ph = await login('phuhuynh', '123456');
{
  check('đăng nhập được', qt.status === 200 && ph.status === 200, [qt.status, ph.status]);
  const ds = docPhien(DIR);
  const tokens = ds.map(d => d.token);
  check('không dòng nào chứa token thô của cookie',
    !tokens.includes(maCua(qt.cookie)) && !tokens.includes(maCua(ph.cookie)));
  check('mọi dòng đều là mã băm sha256', tokens.length > 0 && tokens.every(t => /^sha256\$[0-9a-f]{64}$/.test(t)), tokens.map(t => t.slice(0, 12)));
  check('có đúng dòng băm của từng cookie', tokens.includes(bam(maCua(qt.cookie))) && tokens.includes(bam(maCua(ph.cookie))));
  check('cookie vẫn dùng được như cũ', (await req('GET', '/api/auth/me', { cookie: ph.cookie })).status === 200);
}

// ===========================================================================
console.log('\n[2] Sao lưu máy 1 → khôi phục máy 2: thứ đọc được trong tệp không cho đăng nhập');
{
  const sl = spawnSync('node', [path.join(GOC, 'scripts', 'backup.js')],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
  check('sao lưu chạy xong', sl.status === 0, (sl.stdout + sl.stderr).slice(-300));
  const tep = fs.readdirSync(path.join(DIR, 'backups')).find(f => /^school-.*\.db\.gz$/.test(f));
  const duongDan = path.join(DIR, 'backups', tep || 'khong-co');
  const goc = tep ? zlib.gunzipSync(fs.readFileSync(duongDan)).toString('latin1') : '';
  check('đọc được tệp sao lưu', goc.length > 0, tep);
  for (const [ten, c] of [['quản trị/cô', qt.cookie], ['gia đình', ph.cookie], ['phiên đời trước', `session=${TOKEN_CU}`]]) {
    check(`tệp sao lưu KHÔNG chứa token thô (${ten})`, !goc.includes(maCua(c)));
  }

  // Máy 2: khôi phục từ tệp ấy rồi dựng máy chủ.
  fs.mkdirSync(DIR2, { recursive: true });
  const kp = spawnSync('node', [path.join(GOC, 'scripts', 'restore.js'), duongDan],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR2 } });
  check('khôi phục sang máy 2 chạy xong', kp.status === 0, (kp.stdout + kp.stderr).slice(-300));
  const sv2 = await dungMayChu({ port: PORT + 1, dir: DIR2 });
  const req2 = taoReq(sv2.BASE);

  // Kẻ cầm tệp chỉ có những gì nằm trong bảng.
  const trongBang = docPhien(DIR2);
  check('máy 2 có đủ các phiên trong bản sao', trongBang.length >= 3, trongBang.length);
  const dung = [];
  for (const d of trongBang) {
    for (const thu of [d.token, d.token.replace(/^sha256\$/, '')]) {
      const r = await req2('GET', '/api/auth/me', { cookie: `session=${thu}` });
      if (r.status !== 401) dung.push([thu.slice(0, 14), r.status]);
    }
  }
  check('dựng cookie từ mọi giá trị đọc được trong bảng → đều 401', dung.length === 0, dung);
  const that = await req2('GET', '/api/auth/me', { cookie: ph.cookie });
  check('gia đình cầm đúng cookie của mình vẫn vào được máy 2 (khôi phục không đăng xuất ai)',
    that.status === 200 && that.data?.user?.username === 'phuhuynh', that.status);
  sv2.dung();
}

// ===========================================================================
console.log('\n[4] Đăng xuất, đổi mật khẩu, hết hạn vẫn đúng như cũ');
{
  const may1 = await login('ph.tuan', '123456');
  const may2 = await login('ph.tuan', '123456');
  const doi = await req('POST', '/api/auth/change-password', {
    cookie: may1.cookie, body: { currentPassword: '123456', newPassword: 'phtuan2026' },
  });
  check('đổi mật khẩu được, báo một máy khác bị đăng xuất', doi.status === 200 && /1 thiết bị/.test(doi.data?.message || ''), doi.data);
  check('máy khác bị đăng xuất', (await req('GET', '/api/auth/me', { cookie: may2.cookie })).status === 401);
  check('máy đang đổi vẫn còn phiên', (await req('GET', '/api/auth/me', { cookie: may1.cookie })).status === 200);

  const ra = await req('POST', '/api/auth/logout', { cookie: may1.cookie });
  check('đăng xuất được', ra.status === 200);
  check('sau đăng xuất cookie hết dùng được', (await req('GET', '/api/auth/me', { cookie: may1.cookie })).status === 401);
  check('dòng phiên đã xoá khỏi bảng', !docPhien(DIR).some(d => d.token === bam(maCua(may1.cookie))));

  const raw = new Database(path.join(DIR, 'school.db'));
  raw.prepare('UPDATE sessions SET createdAt = ? WHERE token = ?')
    .run(Date.now() - 31 * 24 * 60 * 60 * 1000, bam(maCua(ph.cookie)));
  raw.close();
  check('phiên quá 30 ngày bị từ chối', (await req('GET', '/api/auth/me', { cookie: ph.cookie })).status === 401);
  check('và bị xoá khỏi bảng', !docPhien(DIR).some(d => d.token === bam(maCua(ph.cookie))));
}

// ===========================================================================
console.log('\n[5] Khởi động lại không băm lại lần nữa');
{
  await sv.khoiDongLai();
  check('cookie quản trị/cô vẫn dùng được sau khởi động lại', (await req('GET', '/api/auth/me', { cookie: qt.cookie })).status === 200);
  check('cookie đời trước vẫn dùng được sau khởi động lại', (await req('GET', '/api/auth/me', { cookie: `session=${TOKEN_CU}` })).status === 200);
}

sv.dung();
donThuMucTam(DIR);
donThuMucTam(DIR2);
tongKet();
