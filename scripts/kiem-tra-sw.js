#!/usr/bin/env node
// Canh quy định "đổi bất cứ tệp nào trong public/ thì phải tăng VERSION trong
// public/sw.js".
//
// VÌ SAO
//
// Service worker phục vụ vỏ ứng dụng TỪ CACHE. Cache mang tên gắn với hằng
// `VERSION`, và móc `activate` chỉ xoá kho cũ khi tên kho đổi. Nghĩa là:
//
//   sửa public/js/views/nhatky.js mà quên tăng VERSION
//     → máy chủ có bản mới
//     → điện thoại đã cài app vẫn chạy bản cũ, VĨNH VIỄN
//
// Và không ai biết vì sao. Cô báo "app này không có nút đó", người sửa mở máy
// mình ra thấy nút vẫn còn (máy chưa cài app nên không có service worker).
// Đây là loại lỗi đắt nhất: không ai tái hiện được, không ai đổ lỗi được cho ai.
//
// CLAUDE.md đã ghi quy định này thành chữ. Tệp này biến nó thành thứ máy kiểm
// được, giống hệt cách `kiem-tra-commit.js` làm với quy định commit riêng.
//
// CÁCH DÙNG
//
//   node scripts/kiem-tra-sw.js                  # kiểm tra vùng đã `git add`
//   node scripts/kiem-tra-sw.js --commit <mã>    # kiểm tra một commit đã có
//   node scripts/kiem-tra-sw.js --khoang A..B    # kiểm tra mọi commit trong khoảng
//
// ĐƯỜNG THOÁT
//
// Có những thay đổi trong `public/` thật sự không cần tăng VERSION — sửa một
// dòng chú thích, đổi tên biến nội bộ. Thêm một DÒNG RIÊNG vào lời commit:
//
//   Khong-can-sw: chỉ sửa chú thích, không đổi thứ nào chạy trên máy người dùng
//
// Phải kèm lý do, cố ý giống hệt `Tron-co-y:` — để lời commit nhắc tới quy định
// này trong văn xuôi không vô tình mở đường thoát.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
const DONG_THOAT = /^[ \t]*Khong-can-sw:[ \t]*(\S.*)$/mi;
const VI_DU_THOAT = 'Khong-can-sw: <lý do>';
const SW = 'public/sw.js';

// Tệp trong `public/` mà trình duyệt KHÔNG tải về: đổi chúng không làm máy đã
// cài kẹt bản cũ, nên không đòi tăng VERSION.
const KHONG_TINH = [
  /^public\/README/i,
];

function git(...args) {
  return execFileSync('git', args, { cwd: GOC, encoding: 'utf8' });
}

function xinThoat(loi) {
  const m = DONG_THOAT.exec(loi || '');
  return m ? m[1].trim() : null;
}

function laPublic(f) {
  return f.startsWith('public/') && !KHONG_TINH.some(re => re.test(f));
}

// Đọc hằng VERSION từ một nội dung sw.js. Trả null nếu không tìm thấy.
function docVersion(noiDung) {
  const m = /^const VERSION = ['"]([^'"]+)['"];/m.exec(noiDung || '');
  return m ? m[1] : null;
}

function bienBan(tep, nhan, cu, moi) {
  return `
✗ ${nhan} có đổi tệp trong public/ nhưng KHÔNG tăng VERSION của ${SW}.

  Đã đổi:  ${tep.slice(0, 8).join(', ')}${tep.length > 8 ? ` … và ${tep.length - 8} tệp nữa` : ''}
  VERSION: ${cu === moi ? `vẫn là ${moi}` : `${cu} → ${moi}`}

  Service worker phục vụ vỏ ứng dụng TỪ CACHE, và kho đệm mang tên gắn với
  VERSION. Không tăng số thì điện thoại đã cài app CHẠY MÃI BẢN CŨ — cô báo
  "app này không có nút đó", còn người sửa mở máy mình ra thấy nút vẫn còn.

  Sửa: tăng VERSION trong ${SW} rồi \`git add\` lại.

  Nếu lần này thật sự không cần (ví dụ chỉ sửa chú thích), thêm một dòng riêng
  vào cuối lời commit:

    ${VI_DU_THOAT}

  Lý do đó sẽ nằm lại trong lịch sử cho người sau đọc.
`;
}

function tepDaThemVaoVungCho() {
  return git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function tepCuaCommit(ma) {
  return git('show', '--name-only', '--format=', '--diff-filter=ACMR', ma)
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function loiCommit(ma) {
  return git('show', '--format=%B', '--no-patch', ma);
}

// --- Lấy "VERSION trước" và "VERSION sau" ----------------------------------
//
// SO VỚI NHÁNH CHÍNH, KHÔNG SO VỚI COMMIT NGAY TRƯỚC.
//
// CLAUDE.md bắt sửa tệp dùng chung phải là COMMIT RIÊNG, nên một đợt việc
// thường tách làm hai ba commit và chỉ một trong số đó tăng VERSION. So với
// commit ngay trước sẽ báo đỏ oan ở những commit sau — và một bộ canh báo đỏ
// oan là một bộ canh sẽ bị tắt.
//
// Thứ thật sự đi tới máy của cô là NHÁNH, không phải từng commit. Nên mốc so
// sánh là nơi nhánh này tách khỏi nhánh chính: cả nhánh chỉ cần tăng VERSION
// một lần là đủ, và quên hẳn thì vẫn bị bắt.
function mocNhanhChinh() {
  for (const ref of ['origin/main', 'main', 'origin/master', 'master']) {
    try {
      const ma = git('merge-base', 'HEAD', ref).trim();
      if (ma) return ma;
    } catch (_) { /* không có ref đó thì thử ref sau */ }
  }
  return null;
}

function versionVungCho() {
  let moi = null;
  try { moi = docVersion(git('show', `:${SW}`)); } catch (_) { moi = null; }
  if (moi === null) {
    try { moi = docVersion(fs.readFileSync(path.join(GOC, SW), 'utf8')); } catch (_) { moi = null; }
  }
  const moc = mocNhanhChinh();
  let cu = null;
  try { cu = docVersion(git('show', `${moc || 'HEAD'}:${SW}`)); } catch (_) { cu = null; }
  return { cu, moi, moc };
}

// Tệp public/ đã đổi TÍNH TỪ MỐC, không chỉ trong commit sắp tạo.
function tepPublicTuMoc() {
  const moc = mocNhanhChinh();
  const ra = new Set(tepDaThemVaoVungCho());
  if (moc) {
    for (const f of git('diff', '--name-only', '--diff-filter=ACMR', `${moc}..HEAD`)
      .split('\n').map(s => s.trim()).filter(Boolean)) ra.add(f);
  }
  return [...ra];
}

function versionCuaCommit(ma) {
  let moi = null;
  let cu = null;
  try { moi = docVersion(git('show', `${ma}:${SW}`)); } catch (_) { moi = null; }
  try { cu = docVersion(git('show', `${ma}^:${SW}`)); } catch (_) { cu = null; }
  return { cu, moi };
}

// Trả về null nếu đạt, hoặc biên bản lỗi nếu vi phạm.
function xet(tepThayDoi, { cu, moi }, nhan) {
  const tep = tepThayDoi.filter(laPublic);
  if (!tep.length) return null;              // không đụng public/ thì không hỏi
  if (cu === null) return null;              // sw.js mới ra đời trong chính commit này
  if (moi !== null && moi !== cu) return null;
  return bienBan(tep, nhan, cu, moi);
}

// --- Chạy ------------------------------------------------------------------
function main(argv) {
  const cf = (ten) => { const i = argv.indexOf(ten); return i >= 0 ? argv[i + 1] : null; };
  const tepLoiNhan = cf('--tin-nhan');
  const maCommit = cf('--commit');
  const khoang = cf('--khoang');
  let hong = 0;

  if (khoang) {
    // XÉT CẢ KHOẢNG NHƯ MỘT ĐƠN VỊ, cùng lý do như trên: thứ đi tới máy của cô
    // là trạng thái cuối khoảng, không phải từng commit một.
    const [tu, den] = khoang.includes('..') ? khoang.split('..') : [`${khoang}^`, khoang];
    const dsMa = git('rev-list', khoang).split('\n').map(s => s.trim()).filter(Boolean);
    if (!dsMa.length) { console.log('✓ Không có commit nào trong khoảng để kiểm tra.'); return 0; }
    for (const ma of dsMa) {
      const lyDo = xinThoat(loiCommit(ma));
      if (lyDo) { console.log(`↷ ${ma.slice(0, 8)} — bỏ qua có chủ ý: ${lyDo}`); return 0; }
    }
    const tep = git('diff', '--name-only', '--diff-filter=ACMR', `${tu}..${den}`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    let cu = null;
    let moi = null;
    try { cu = docVersion(git('show', `${tu}:${SW}`)); } catch (_) { cu = null; }
    try { moi = docVersion(git('show', `${den}:${SW}`)); } catch (_) { moi = null; }
    const bb = xet(tep, { cu, moi }, `Khoảng ${khoang} (${dsMa.length} commit)`);
    if (bb) { console.error(bb); return 1; }
    console.log(`✓ Khoảng ${khoang}: ${dsMa.length} commit, VERSION ${cu} → ${moi}.`);
    return 0;
  }

  if (maCommit) {
    const loi = loiCommit(maCommit);
    const lyDo = xinThoat(loi);
    if (lyDo) { console.log(`↷ Bỏ qua có chủ ý: ${lyDo}`); return 0; }
    const bb = xet(tepCuaCommit(maCommit), versionCuaCommit(maCommit), `Commit ${maCommit.slice(0, 8)}`);
    if (bb) { console.error(bb); return 1; }
    console.log(`✓ Commit ${maCommit.slice(0, 8)} không kẹt máy đã cài ở bản cũ.`);
    return 0;
  }

  if (tepLoiNhan && fs.existsSync(tepLoiNhan)) {
    const lyDo = xinThoat(fs.readFileSync(tepLoiNhan, 'utf8'));
    if (lyDo) { console.log(`↷ Bỏ qua kiểm tra VERSION, lý do đã ghi: ${lyDo}`); return 0; }
  }
  const v = versionVungCho();
  const bb = xet(v.moc ? tepPublicTuMoc() : tepDaThemVaoVungCho(), v,
    v.moc ? 'Nhánh này (tính từ nhánh chính)' : 'Commit sắp tạo');
  if (bb) { console.error(bb); return 1; }
  console.log('✓ Nhánh này không làm máy đã cài app kẹt ở bản cũ.');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { docVersion, laPublic, xet, xinThoat };
